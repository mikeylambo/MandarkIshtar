import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { blob, mesh, toon, toonUnique } from "../look/LookKit";
import { PALETTE } from "../look/palette";
import type { ActorType } from "../sim/types";

/**
 * Procedural figures (final procedural pass; delivered .glb files override them through assets/manifest.json).
 * Silhouettes are lathe-turned profiles and extruded planes so they read under the shell toon ramp + outline.
 */

/** Engine 7-point sigil as a flat shape (original glyph; no ring motifs). */
export function sigilShape(r = 1): THREE.Shape {
  const s = new THREE.Shape();
  for (let i = 0; i <= 14; i++) {
    const a = (i / 14) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.42;
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
    if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
  }
  return s;
}

/** Lathe from (radius, height) pairs, bottom → top. */
function lathe(profile: [number, number][], segments = 18): THREE.LatheGeometry {
  return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segments);
}
/** Extruded flat blade from 2D points (x, y), thickness d. */
function blade(points: [number, number][], d = 0.03): THREE.ExtrudeGeometry {
  const s = new THREE.Shape(); points.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2); return g;
}
/** Hexagonal half-rim (lower three edges of a hexagon) as a thin tube. */
function hexHalfRim(r: number): THREE.TubeGeometry {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 3; i++) { const a = Math.PI + (i / 3) * Math.PI; pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r * 0.82, 0)); }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0), 12, 0.008, 4, false);
}
const SKIN = 0xf1d8c4;

/**
 * Markov (stand-in for `model.markov`), built to the redesign brief: lean, long black coat with crisp white lapels and
 * thin gold trim, high collar, split coat tails, gloved hands, swept-back geometric crest of planar blades, visible eyes
 * behind hexagonal half-rims, gold octahedral drop earrings, the Engine's 7-point sigil on the forehead. No rings.
 */
export function markovFigure(lazar = false): THREE.Group {
  const g = new THREE.Group();
  g.name = "markov";
  g.add(blob(0.55));
  const coatC = lazar ? 0xfffdf6 : PALETTE.markovCoat;
  const lapelC = lazar ? 0xfff6e0 : PALETTE.markovTrim;
  const body = new THREE.Group(); body.name = "body"; g.add(body);
  // trousers / boots under the coat
  for (const s of [-1, 1]) { const leg = mesh(lathe([[0.075, 0], [0.09, 0.05], [0.085, 0.45], [0.1, 0.62]], 8), toonUnique(lazar ? 0xe8e4da : 0x16181f)); leg.position.set(s * 0.11, 0, 0); body.add(leg); }
  // long coat: flared lathe, open at the front-bottom implied by the split tails
  const coat = mesh(lathe([[0.5, 0.12], [0.44, 0.35], [0.33, 0.8], [0.27, 1.12], [0.3, 1.38], [0.27, 1.5], [0.12, 1.56]], 20), toonUnique(coatC));
  body.add(coat);
  for (const s of [-1, 1]) { // split coat tails
    const tail = mesh(blade([[0, 0], [0.16 * s, 0], [0.22 * s, -0.42], [0.04 * s, -0.36]], 0.04), toonUnique(coatC));
    tail.position.set(s * 0.06, 0.55, -0.36); tail.rotation.x = 0.28; body.add(tail);
  }
  // gold trim: hem + front placket lines
  const hem = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.018, 4, 28), toon(PALETTE.gold, PALETTE.gold, 0.25)); hem.rotation.x = Math.PI / 2; hem.position.y = 0.13; body.add(hem);
  for (const s of [-1, 1]) { // gold front edges of the open coat
    const placket = new THREE.Mesh(new THREE.BoxGeometry(0.022, 1.2, 0.022), toon(PALETTE.gold, PALETTE.gold, 0.25)); placket.position.set(s * 0.09, 0.74, 0.42); placket.rotation.set(-0.18, 0, -s * 0.12); body.add(placket);
  }
  // black inner suit showing down the open front
  const inner = mesh(blade([[-0.08, 0], [0.08, 0], [0.11, 1.0], [-0.11, 1.0]], 0.02), toonUnique(lazar ? 0xf4f1ea : PALETTE.markovTrim), false); inner.position.set(0, 0.42, 0.405); inner.rotation.x = -0.16; body.add(inner);
  // the Engine sigil in gold on the coat back
  const backSig = new THREE.Mesh(new THREE.ShapeGeometry(sigilShape(0.16)), toon(PALETTE.gold, PALETTE.gold, 0.3)); backSig.position.set(0, 1.05, -0.33); backSig.rotation.set(0.1, Math.PI, 0); body.add(backSig);
  // white lapels (two folded planes) + high collar
  for (const s of [-1, 1]) { const lp = mesh(blade([[0, 0], [0.14 * s, 0.08], [0.1 * s, 0.34], [0.01 * s, 0.4]], 0.02), toon(lapelC)); lp.position.set(0, 1.12, 0.27); lp.rotation.x = -0.25; body.add(lp); }
  const collar = mesh(lathe([[0.15, 0], [0.19, 0.08], [0.2, 0.2]], 14), toonUnique(coatC)); collar.position.y = 1.5; body.add(collar);
  // shoulders + arms (sleeve + glove)
  for (const s of [-1, 1]) {
    const pad = mesh(new THREE.SphereGeometry(0.13, 10, 8), toonUnique(coatC)); pad.position.set(s * 0.3, 1.43, 0); pad.scale.set(1.15, 0.8, 1); body.add(pad);
    const arm = new THREE.Group(); arm.position.set(s * 0.33, 1.42, 0.02); arm.rotation.z = s * 0.12; arm.name = s < 0 ? "armL" : "armR"; body.add(arm);
    const sleeve = mesh(lathe([[0.075, -0.62], [0.085, -0.5], [0.08, -0.15], [0.09, 0]], 8), toonUnique(coatC)); arm.add(sleeve);
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.087, 0.087, 0.05, 8), toon(lapelC)); cuff.position.y = -0.58; arm.add(cuff);
    const glove = mesh(new THREE.SphereGeometry(0.07, 8, 6), toon(lazar ? 0xffffff : 0x0c0d12)); glove.position.y = -0.68; glove.scale.set(0.9, 1.25, 0.8); arm.add(glove);
  }
  // head
  const head = new THREE.Group(); head.position.y = 1.82; head.scale.setScalar(1.18); head.name = "head"; body.add(head);
  const neck = mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.14, 8), toon(SKIN), false); neck.position.y = -0.14; head.add(neck);
  const skull = mesh(lathe([[0, -0.2], [0.11, -0.17], [0.15, -0.06], [0.17, 0.05], [0.15, 0.15], [0.08, 0.21], [0, 0.22]], 14), toon(SKIN)); head.add(skull);
  // spiky crest: black planar blades fanning up and back, each tipped with a violet blade (reads as a silhouette from above)
  const hairC = lazar ? 0xffffff : PALETTE.markovHair, tipC = lazar ? 0xfff6e0 : PALETTE.markovHairTip;
  const hairM = toon(hairC), tipM = toon(tipC, tipC, lazar ? 0.2 : 0.35);
  const spikes: [number, number, number, number][] = [ // yaw, pitch(back), length, roll
    [0, -0.35, 0.42, 0], [-0.5, -0.5, 0.38, -0.5], [0.5, -0.5, 0.38, 0.5], [-0.95, -0.85, 0.34, -0.9], [0.95, -0.85, 0.34, 0.9],
    [-0.3, -1.1, 0.4, -0.2], [0.3, -1.1, 0.4, 0.2], [0, -1.45, 0.36, 0], [-1.3, -1.25, 0.26, -1.2], [1.3, -1.25, 0.26, 1.2],
  ];
  // merged into two meshes (blades + tips) to keep Markov's draw calls flat
  const bladeGeos: THREE.BufferGeometry[] = [], tipGeos: THREE.BufferGeometry[] = [];
  const m4 = new THREE.Matrix4(), e = new THREE.Euler();
  for (const [yaw, pitch, len, roll] of spikes) {
    m4.makeRotationFromEuler(e.set(pitch, yaw, roll, "YXZ")).setPosition(0, 0.1, -0.01);
    bladeGeos.push(blade([[-0.07, 0], [0.07, 0], [0.012, len * 0.72], [-0.02, len * 0.7]], 0.03).applyMatrix4(m4));
    tipGeos.push(blade([[-0.03, len * 0.66], [0.022, len * 0.68], [0.004, len]], 0.032).applyMatrix4(m4));
  }
  head.add(mesh(mergeGeometries(bladeGeos), hairM), mesh(mergeGeometries(tipGeos), tipM, false));
  const fringe = mesh(blade([[-0.15, 0], [0.15, 0], [0.09, 0.1], [0.02, 0.03], [-0.04, 0.11], [-0.1, 0.06]], 0.05), hairM); fringe.position.set(0, 0.12, 0.11); fringe.rotation.x = -0.75; head.add(fringe);
  // eyes behind hexagonal half-rims, lens glint
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.024, 6, 4), new THREE.MeshBasicMaterial({ color: 0x1a2a58 })); eye.position.set(s * 0.062, 0.02, 0.145); head.add(eye);
    const rim = new THREE.Mesh(hexHalfRim(0.05), new THREE.MeshBasicMaterial({ color: PALETTE.gold })); rim.position.set(s * 0.062, 0.02, 0.165); head.add(rim);
    const glint = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.01), new THREE.MeshBasicMaterial({ color: 0xffffff })); glint.position.set(s * 0.062 + 0.018, 0.04, 0.168); glint.name = "glint"; head.add(glint);
    const ear = new THREE.Mesh(new THREE.OctahedronGeometry(0.03), toon(PALETTE.gold, PALETTE.gold, 0.6)); ear.position.set(s * 0.16, -0.1, 0); ear.scale.y = 1.9; head.add(ear);
  }
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.006, 0.006), new THREE.MeshBasicMaterial({ color: PALETTE.gold })); bridge.position.set(0, 0.035, 0.168); head.add(bridge);
  const sig = new THREE.Mesh(new THREE.ShapeGeometry(sigilShape(0.035)), new THREE.MeshBasicMaterial({ color: PALETTE.gold })); sig.position.set(0, 0.11, 0.157); sig.rotation.x = -0.25; head.add(sig);
  return g;
}

/** Theorem silhouettes: distinct polyhedra so every family reads by shape alone. */
export function theoremGeometry(type: ActorType): THREE.BufferGeometry {
  switch (type) {
    case "axiom": return new THREE.TetrahedronGeometry(0.62);
    case "corollary": return new THREE.OctahedronGeometry(0.62);
    case "variable": return new THREE.BoxGeometry(0.8, 0.8, 0.8);
    case "constant": return new THREE.DodecahedronGeometry(0.98);
    case "iterator": return new THREE.TorusGeometry(0.48, 0.18, 8, 18);
    case "paradox": return new THREE.IcosahedronGeometry(0.5);
    case "oracle": return new THREE.SphereGeometry(0.55, 16, 10);
    case "herald": return new THREE.CylinderGeometry(0.0, 0.5, 1.6, 3);
    default: return new THREE.IcosahedronGeometry(0.6);
  }
}

function robe(color: number, h: number, r: number, flare = 1.15): THREE.Mesh {
  return mesh(lathe([[r * flare, 0], [r, h * 0.12], [r * 0.72, h * 0.55], [r * 0.5, h * 0.88], [r * 0.32, h]], 18), toonUnique(color));
}

/** Boss stand-ins (procedural, behind manifest keys `model.boss.*`). */
export function bossFigure(type: ActorType): THREE.Group {
  const g = new THREE.Group();
  g.name = `boss:${type}`;
  if (type !== "shadow" && type !== "ishtar") g.add(blob(type === "giant" ? 2.4 : type === "child" ? 0.35 : 1.2));
  const body = new THREE.Group(); body.name = "body"; g.add(body);
  switch (type) {
    case "flame": {
      // twisting tongues of flame around a white-gold core; pride swells it (WorldView scales it with growth)
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2, r = i === 0 ? 0 : 0.55;
        const h = i === 0 ? 3.2 : 1.6 + (i % 3) * 0.45;
        const tongue = mesh(lathe([[0.42, 0], [0.5, h * 0.18], [0.36, h * 0.5], [0.14, h * 0.82], [0, h]], 10), toonUnique(i === 0 ? 0xff9a3a : i % 2 ? 0xffb347 : 0xff7a2f, 0xff7a2f, i === 0 ? 0.9 : 0.65), i === 0);
        tongue.position.set(Math.cos(a) * r, 0.1, Math.sin(a) * r); tongue.rotation.set(Math.sin(a) * 0.25, a, Math.cos(a) * 0.25);
        tongue.name = `flame${i}`; body.add(tongue);
      }
      const core = mesh(new THREE.IcosahedronGeometry(0.42, 0), toon(0xfff3cf, 0xffd77a, 1.1), false); core.position.y = 1.5; core.name = "core"; body.add(core);
      for (let i = 0; i < 5; i++) { const e = new THREE.Mesh(new THREE.TetrahedronGeometry(0.12), toon(0xffd08a, 0xff9a3a, 0.9)); const a = (i / 5) * Math.PI * 2; e.position.set(Math.cos(a) * 1.4, 2.4 + (i % 2) * 0.5, Math.sin(a) * 1.4); body.add(e); }
      break;
    }
    case "giant": {
      const stone = toonUnique(PALETTE.stone), shade = toonUnique(PALETTE.stoneShade);
      for (const s of [-1, 1]) {
        const leg = mesh(new THREE.BoxGeometry(1.0, 2.6, 1.2), shade); leg.position.set(s * 0.75, 1.3, 0); body.add(leg);
        const foot = mesh(new THREE.BoxGeometry(1.2, 0.5, 1.7), stone); foot.position.set(s * 0.75, 0.25, 0.2); body.add(foot);
      }
      const hips = mesh(new THREE.BoxGeometry(2.4, 0.8, 1.5), stone); hips.position.y = 2.9; body.add(hips);
      const chest = mesh(lathe([[1.0, 0], [1.55, 0.9], [1.7, 1.8], [1.2, 2.6]], 6), stone); chest.position.y = 3.2; chest.rotation.y = Math.PI / 6; body.add(chest);
      for (const s of [-1, 1]) {
        const pauldron = mesh(new THREE.DodecahedronGeometry(0.75), stone); pauldron.position.set(s * 2.0, 5.5, 0); body.add(pauldron);
        const arm = mesh(new THREE.BoxGeometry(0.85, 2.8, 0.85), shade); arm.position.set(s * 2.25, 3.9, 0.1); arm.rotation.z = s * 0.12; body.add(arm);
        const fist = mesh(new THREE.BoxGeometry(1.0, 0.9, 1.0), stone); fist.position.set(s * 2.45, 2.3, 0.15); body.add(fist);
      }
      const head = mesh(new THREE.DodecahedronGeometry(0.75), stone); head.position.y = 6.4; body.add(head);
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.05), new THREE.MeshBasicMaterial({ color: PALETTE.blue })); eye.position.set(0, 6.45, 0.68); body.add(eye);
      break;
    }
    case "mirror": {
      const m = markovFigure(); m.traverse((o) => { if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshToonMaterial) { const src = o.material; o.material = toonUnique(0xffffff - src.color.getHex(), src.emissive.getHex(), src.emissiveIntensity); } });
      body.add(m);
      // a hexagonal pane frame behind him
      const frame = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.035, 4, 6), new THREE.MeshBasicMaterial({ color: 0xbfd0ff })); frame.position.set(0, 1.1, -0.4); frame.rotation.z = Math.PI / 6; body.add(frame);
      const pane = new THREE.Mesh(new THREE.CircleGeometry(1.28, 6), new THREE.MeshBasicMaterial({ color: 0xbfd0ff, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false })); pane.position.set(0, 1.1, -0.41); pane.rotation.z = Math.PI / 6; body.add(pane);
      break;
    }
    case "king": {
      body.add(robe(0x26357a, 2.4, 0.95));
      const mantle = mesh(lathe([[0.85, 0], [0.75, 0.25], [0.4, 0.45]], 16), toonUnique(0xe9e6dc)); mantle.position.y = 1.85; body.add(mantle);
      const head = mesh(new THREE.SphereGeometry(0.3, 12, 8), toon(PALETTE.stone)); head.position.y = 2.65; body.add(head);
      const beard = mesh(new THREE.ConeGeometry(0.2, 0.45, 6), toon(PALETTE.stone)); beard.position.set(0, 2.35, 0.15); beard.rotation.x = Math.PI; body.add(beard);
      const scepter = mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.1, 6), toon(PALETTE.stoneShade)); scepter.position.set(0.75, 1.6, 0.3); scepter.rotation.z = -0.15; body.add(scepter);
      const orb = mesh(new THREE.OctahedronGeometry(0.16), toon(PALETTE.stone, PALETTE.blue, 0.4)); orb.position.set(0.9, 2.65, 0.3); body.add(orb);
      const crown = new THREE.Group(); crown.name = "crown";
      const band = mesh(lathe([[0.27, 0], [0.29, 0.12]], 10), toon(PALETTE.stone, PALETTE.blue, 0.25)); crown.add(band);
      for (let i = 0; i < 7; i++) { const p = mesh(new THREE.ConeGeometry(0.07, 0.34, 4), toon(PALETTE.stone, PALETTE.blue, 0.35)); const a = (i / 7) * Math.PI * 2; p.position.set(Math.sin(a) * 0.27, 0.27, Math.cos(a) * 0.27); crown.add(p); }
      crown.position.y = 2.95; body.add(crown);
      break;
    }
    case "judge": {
      body.add(robe(0x1b1e2c, 2.8, 1.1, 1.05));
      const stole = mesh(blade([[-0.18, 0], [0.18, 0], [0.12, 1.6], [-0.12, 1.6]], 0.03), toon(PALETTE.stone)); stole.position.set(0, 0.9, 0.52); stole.rotation.x = -0.18; body.add(stole);
      const head = mesh(new THREE.BoxGeometry(0.55, 0.7, 0.55), toon(PALETTE.stone)); head.position.y = 3.15; body.add(head);
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.02), new THREE.MeshBasicMaterial({ color: PALETTE.blue })); visor.position.set(0, 3.2, 0.29); body.add(visor);
      const beam = mesh(new THREE.BoxGeometry(2.6, 0.08, 0.08), toon(PALETTE.stone)); beam.position.y = 2.35; beam.name = "scales"; body.add(beam);
      for (const s of [-1, 1]) {
        const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.5, 4), new THREE.MeshBasicMaterial({ color: 0x8c8a84 })); chain.position.set(s * 1.25, -0.25, 0); beam.add(chain);
        const pan = mesh(lathe([[0.02, -0.05], [0.32, -0.02], [0.34, 0.03]], 14), toon(PALETTE.stone)); pan.position.set(s * 1.25, -0.52, 0); beam.add(pan);
      }
      break;
    }
    case "prophet": {
      body.add(robe(0x20275a, 2.5, 0.85));
      const hood = mesh(lathe([[0.42, 0], [0.4, 0.3], [0.28, 0.6], [0.05, 0.85]], 12), toonUnique(0x20275a)); hood.position.y = 2.35; body.add(hood);
      const face = new THREE.Mesh(new THREE.CircleGeometry(0.2, 12), new THREE.MeshBasicMaterial({ color: 0x05060b })); face.position.set(0, 2.62, 0.3); body.add(face);
      const halo = new THREE.Group(); halo.name = "halo";
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.035, 6, 48), new THREE.MeshBasicMaterial({ color: PALETTE.blue })); halo.add(ring);
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; const tick = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.16, 0.03), new THREE.MeshBasicMaterial({ color: 0x9fb8ff })); tick.position.set(Math.cos(a) * 0.75, Math.sin(a) * 0.75, 0); tick.rotation.z = a - Math.PI / 2; halo.add(tick); }
      halo.position.set(0, 2.75, -0.25); body.add(halo);
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.26), new THREE.MeshBasicMaterial({ color: 0xbfd0ff })); core.position.set(0, 1.6, 0.55); core.name = "core"; body.add(core);
      for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.06), new THREE.MeshBasicMaterial({ color: 0xdfe8ff })); star.position.set(Math.cos(a) * 1.25, 2.0 + Math.sin(a * 2) * 0.35, Math.sin(a) * 1.25); body.add(star); }
      break;
    }
    case "child": {
      body.add(robe(0xffffff, 0.62, 0.22, 1.3));
      const head = mesh(new THREE.SphereGeometry(0.13, 12, 8), toon(0xf6e2d2)); head.position.y = 0.78; body.add(head);
      const hair = mesh(lathe([[0.135, 0], [0.14, 0.06], [0.1, 0.12], [0, 0.15]], 12), toon(0x9b7b5a)); hair.position.y = 0.79; body.add(hair);
      for (const s of [-1, 1]) { const arm = mesh(new THREE.CapsuleGeometry(0.035, 0.22, 2, 6), toon(0xf6e2d2)); arm.position.set(s * 0.15, 0.48, 0.02); arm.rotation.z = s * 0.5; body.add(arm); }
      for (const s of [-1, 1]) { const foot = mesh(new THREE.CapsuleGeometry(0.035, 0.08, 2, 6), toon(0xf6e2d2)); foot.position.set(s * 0.06, 0.03, 0.02); foot.rotation.x = Math.PI / 2; body.add(foot); }
      break;
    }
    case "ishtar": {
      const core = mesh(new THREE.OctahedronGeometry(1.1), toonUnique(0xfff0c8, 0xffd77a, 0.85), false); core.position.y = 4; core.name = "core"; body.add(core);
      // the counterfeit star: eight long points
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const spike = mesh(new THREE.ConeGeometry(0.22, i % 2 ? 1.6 : 2.6, 4), toonUnique(0xfff6dc, 0xffd77a, 0.6), false); spike.position.set(Math.cos(a) * (i % 2 ? 1.6 : 2.1), 4 + Math.sin(a) * (i % 2 ? 1.6 : 2.1), 0); spike.rotation.z = a - Math.PI / 2; body.add(spike); }
      for (let i = 0; i < 5; i++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(2.4 + i * 0.9, 0.05, 6, 72), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffd77a : 0xbfd0ff, transparent: true, opacity: 0.8 }));
        ring.position.y = 4; ring.rotation.x = Math.PI / 2 + i * 0.4; ring.name = `ring${i}`; body.add(ring);
      }
      break;
    }
    case "door": {
      const slab = mesh(new THREE.BoxGeometry(3.2, 6, 0.6), toonUnique(0xf7f5ef)); slab.position.y = 3; body.add(slab);
      const arch = mesh(lathe([[1.9, 0], [1.9, 0.4]], 32), toon(PALETTE.stone)); arch.scale.set(1, 1, 0.25); arch.position.y = 6; body.add(arch);
      for (const s of [-1, 1]) { const col = mesh(new THREE.CylinderGeometry(0.3, 0.34, 6.4, 10), toon(PALETTE.stone)); col.position.set(s * 2.0, 3.2, 0); body.add(col); }
      const sig = new THREE.Mesh(new THREE.ShapeGeometry(sigilShape(0.8)), new THREE.MeshBasicMaterial({ color: PALETTE.gold })); sig.position.set(0, 3.4, -0.32); sig.rotation.y = Math.PI; sig.name = "sigil"; body.add(sig);
      const sig2 = sig.clone(); sig2.position.z = 0.32; sig2.rotation.y = 0; body.add(sig2);
      break;
    }
    case "shadow": {
      const disc = new THREE.Mesh(new THREE.CircleGeometry(1.7, 32), new THREE.MeshBasicMaterial({ color: 0x05060b, transparent: true, opacity: 0.75, depthWrite: false }));
      disc.rotation.x = -Math.PI / 2; disc.position.y = 0.03; disc.scale.set(1.2, 2.2, 1); body.add(disc);
      // pale rim: on the dark Observatory floor the shadow must read by its edge, not by darkness alone
      const rim = new THREE.Mesh(new THREE.RingGeometry(1.62, 1.78, 48), new THREE.MeshBasicMaterial({ color: 0xb8a6ff, transparent: true, opacity: 0.7, depthWrite: false }));
      rim.rotation.x = -Math.PI / 2; rim.position.y = 0.035; rim.scale.set(1.2, 2.2, 1); body.add(rim);
      break;
    }
    default: body.add(mesh(new THREE.IcosahedronGeometry(1), toonUnique(PALETTE.stone)));
  }
  return g;
}
