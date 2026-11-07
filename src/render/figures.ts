import * as THREE from "three";
import { blob, mesh, toon, toonUnique } from "../look/LookKit";
import { PALETTE } from "../look/palette";
import type { ActorType } from "../sim/types";

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

/**
 * Markov stand-in (procedural, behind the manifest key `model.markov`): lean figure, long black coat with white
 * lapels and gold trim, swept geometric crest, visible eyes behind hexagonal half-rims, gold drop earrings,
 * 7-point forehead sigil. Matches the redesign notes, so the build already reads as him.
 */
export function markovFigure(lazar = false): THREE.Group {
  const g = new THREE.Group();
  g.name = "markov";
  g.add(blob(0.55));
  const coatC = lazar ? 0xf4f1ea : PALETTE.markovCoat;
  const trimC = lazar ? PALETTE.gold : PALETTE.markovTrim;
  const body = new THREE.Group(); body.name = "body"; g.add(body);
  const coat = mesh(new THREE.ConeGeometry(0.52, 1.35, 8, 1, true), toonUnique(coatC)); coat.position.y = 0.72; body.add(coat);
  const torso = mesh(new THREE.CylinderGeometry(0.24, 0.32, 0.62, 8), toonUnique(coatC)); torso.position.y = 1.25; body.add(torso);
  const lapel = mesh(new THREE.ConeGeometry(0.2, 0.5, 3), toon(trimC), false); lapel.position.set(0, 1.28, 0.2); lapel.rotation.x = Math.PI; body.add(lapel);
  const hem = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.025, 4, 16), toon(PALETTE.gold)); hem.rotation.x = Math.PI / 2; hem.position.y = 0.08; body.add(hem);
  for (const s of [-1, 1]) {
    const arm = mesh(new THREE.CapsuleGeometry(0.07, 0.55, 3, 6), toonUnique(coatC)); arm.position.set(s * 0.33, 1.15, 0.02); arm.rotation.z = s * 0.15; arm.name = s < 0 ? "armL" : "armR"; body.add(arm);
    const hand = mesh(new THREE.SphereGeometry(0.075, 8, 6), toon(0xf1d8c4)); hand.position.set(0, -0.36, 0); arm.add(hand);
  }
  const head = new THREE.Group(); head.position.y = 1.72; head.name = "head"; body.add(head);
  const skull = mesh(new THREE.SphereGeometry(0.2, 14, 10), toon(0xf1d8c4)); head.add(skull);
  // swept-back geometric crest (white, planes, not spikes)
  for (let i = 0; i < 4; i++) {
    const crest = mesh(new THREE.ConeGeometry(0.11, 0.5 - i * 0.06, 4), toon(lazar ? 0xffffff : 0xf4f4f4));
    crest.position.set((i - 1.5) * 0.06, 0.16, -0.08 - i * 0.03); crest.rotation.x = -1.15 - i * 0.08; head.add(crest);
  }
  // eyes + hex half-rims with a lens glint
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 4), new THREE.MeshBasicMaterial({ color: 0x1a2a58 })); eye.position.set(s * 0.075, 0.02, 0.18); head.add(eye);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.008, 3, 6, Math.PI), new THREE.MeshBasicMaterial({ color: PALETTE.gold })); rim.position.set(s * 0.075, 0.0, 0.195); rim.rotation.z = Math.PI; head.add(rim);
    const glint = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.012), new THREE.MeshBasicMaterial({ color: 0xffffff })); glint.position.set(s * 0.075 + 0.02, 0.035, 0.2); glint.name = "glint"; head.add(glint);
    const ear = new THREE.Mesh(new THREE.OctahedronGeometry(0.035), toon(PALETTE.gold, PALETTE.gold, 0.6)); ear.position.set(s * 0.2, -0.1, 0); ear.scale.y = 1.8; head.add(ear);
  }
  const sig = new THREE.Mesh(new THREE.ShapeGeometry(sigilShape(0.045)), new THREE.MeshBasicMaterial({ color: PALETTE.gold })); sig.position.set(0, 0.11, 0.185); head.add(sig);
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

export function theoremFigure(type: ActorType): THREE.Group {
  const g = new THREE.Group();
  const mat = toonUnique(0xfbfaf6, PALETTE.blue, 0.12);
  g.add(blob(0.7));
  const body = mesh(theoremGeometry(type), mat);
  body.name = "body";
  body.position.y = type === "herald" ? 1.0 : 0.85;
  if (type === "oracle") {
    (body.material as THREE.MeshToonMaterial).transparent = true; (body.material as THREE.MeshToonMaterial).opacity = 0.55;
    const iris = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 6, 24), new THREE.MeshBasicMaterial({ color: PALETTE.blue })); body.add(iris);
  }
  if (type === "herald") {
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.55), new THREE.MeshBasicMaterial({ color: PALETTE.blueDeep, side: THREE.DoubleSide })); flag.position.set(0.45, 0.45, 0); flag.name = "flag"; body.add(flag);
  }
  if (type === "iterator") body.rotation.x = Math.PI / 2;
  g.add(body);
  return g;
}

function robe(color: number, h: number, r: number): THREE.Mesh { const m = mesh(new THREE.ConeGeometry(r, h, 10, 1, true), toonUnique(color)); m.position.y = h / 2; return m; }

/** Boss stand-ins (procedural, behind manifest keys `model.boss.*`). */
export function bossFigure(type: ActorType): THREE.Group {
  const g = new THREE.Group();
  g.name = `boss:${type}`;
  if (type !== "shadow" && type !== "ishtar") g.add(blob(type === "giant" ? 2.4 : type === "child" ? 0.35 : 1.2));
  const body = new THREE.Group(); body.name = "body"; g.add(body);
  switch (type) {
    case "flame": {
      for (let i = 0; i < 4; i++) {
        const f = mesh(new THREE.ConeGeometry(1.1 - i * 0.22, 1.6, 7), toonUnique(i % 2 ? 0xffb347 : 0xff8a2a, 0xff8a2a, 0.9 - i * 0.1), i === 0);
        f.position.y = 0.8 + i * 0.75; f.name = `flame${i}`; body.add(f);
      }
      const core = mesh(new THREE.IcosahedronGeometry(0.5, 0), toon(0xfff1c0, 0xffd77a, 1.0), false); core.position.y = 1.6; body.add(core);
      break;
    }
    case "giant": {
      const legs = mesh(new THREE.BoxGeometry(2.6, 3.4, 1.6), toonUnique(PALETTE.stoneShade)); legs.position.y = 1.7; body.add(legs);
      const chest = mesh(new THREE.BoxGeometry(3.6, 2.8, 2.2), toonUnique(PALETTE.stone)); chest.position.y = 4.8; body.add(chest);
      const head = mesh(new THREE.DodecahedronGeometry(0.9), toonUnique(PALETTE.stone)); head.position.y = 6.9; body.add(head);
      for (const s of [-1, 1]) { const arm = mesh(new THREE.BoxGeometry(0.9, 3.6, 0.9), toonUnique(PALETTE.stoneShade)); arm.position.set(s * 2.3, 4.2, 0); body.add(arm); }
      break;
    }
    case "mirror": {
      const m = markovFigure(); m.traverse((o) => { if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshToonMaterial) { const mm = o.material.clone(); mm.color.setHex(0xffffff - mm.color.getHex()); o.material = mm; } });
      body.add(m);
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.4), new THREE.MeshBasicMaterial({ color: 0xbfd0ff, transparent: true, opacity: 0.12, side: THREE.DoubleSide })); pane.position.y = 1.1; body.add(pane);
      break;
    }
    case "king": {
      body.add(robe(0x2a3a7a, 2.3, 0.9));
      const head = mesh(new THREE.SphereGeometry(0.32, 12, 8), toon(PALETTE.stone)); head.position.y = 2.55; body.add(head);
      const crown = new THREE.Group(); crown.name = "crown";
      for (let i = 0; i < 5; i++) { const p = mesh(new THREE.ConeGeometry(0.08, 0.35, 4), toon(PALETTE.stone, PALETTE.blue, 0.3)); const a = (i / 5) * Math.PI * 2; p.position.set(Math.sin(a) * 0.26, 0, Math.cos(a) * 0.26); crown.add(p); }
      crown.position.y = 2.95; body.add(crown);
      break;
    }
    case "judge": {
      body.add(robe(0x1b1e2c, 2.6, 1.05));
      const head = mesh(new THREE.BoxGeometry(0.5, 0.6, 0.5), toon(PALETTE.stone)); head.position.y = 2.9; body.add(head);
      const beam = mesh(new THREE.BoxGeometry(2.4, 0.08, 0.08), toon(PALETTE.stone)); beam.position.y = 2.2; beam.name = "scales"; body.add(beam);
      for (const s of [-1, 1]) { const pan = mesh(new THREE.CylinderGeometry(0.3, 0.22, 0.06, 12), toon(PALETTE.stone)); pan.position.set(s * 1.15, -0.45, 0); beam.add(pan); }
      break;
    }
    case "prophet": {
      body.add(robe(0x22285a, 2.4, 0.8));
      const hood = mesh(new THREE.ConeGeometry(0.4, 0.8, 8), toon(0x22285a)); hood.position.y = 2.7; body.add(hood);
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.05, 6, 32), new THREE.MeshBasicMaterial({ color: PALETTE.blue })); halo.position.y = 3.0; halo.name = "halo"; body.add(halo);
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.28), new THREE.MeshBasicMaterial({ color: 0x9fb8ff })); core.position.y = 1.6; core.name = "core"; body.add(core);
      break;
    }
    case "child": {
      const r = robe(0xffffff, 0.75, 0.22); body.add(r);
      const head = mesh(new THREE.SphereGeometry(0.14, 12, 8), toon(0xf6e2d2)); head.position.y = 0.88; body.add(head);
      break;
    }
    case "ishtar": {
      const core = mesh(new THREE.OctahedronGeometry(1.2), toonUnique(0xfff0c8, 0xffd77a, 0.8), false); core.position.y = 4; core.name = "core"; body.add(core);
      for (let i = 0; i < 5; i++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(2 + i * 0.9, 0.06, 6, 64), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffd77a : 0xbfd0ff, transparent: true, opacity: 0.8 }));
        ring.position.y = 4; ring.rotation.x = Math.PI / 2 + i * 0.4; ring.name = `ring${i}`; body.add(ring);
      }
      break;
    }
    case "door": {
      const slab = mesh(new THREE.BoxGeometry(3.2, 6, 0.6), toonUnique(0xf7f5ef)); slab.position.y = 3; body.add(slab);
      const sig = new THREE.Mesh(new THREE.ShapeGeometry(sigilShape(0.8)), new THREE.MeshBasicMaterial({ color: PALETTE.gold })); sig.position.set(0, 3.4, -0.32); sig.rotation.y = Math.PI; sig.name = "sigil"; body.add(sig);
      break;
    }
    case "shadow": {
      const disc = new THREE.Mesh(new THREE.CircleGeometry(1.7, 32), new THREE.MeshBasicMaterial({ color: 0x05060b, transparent: true, opacity: 0.75, depthWrite: false }));
      disc.rotation.x = -Math.PI / 2; disc.position.y = 0.03; disc.scale.set(1.2, 2.2, 1); body.add(disc);
      break;
    }
    default: body.add(mesh(new THREE.IcosahedronGeometry(1), toonUnique(PALETTE.stone)));
  }
  return g;
}
