import * as THREE from "three";
import type { World } from "../sim/World";
import type { Actor, Hazard, Prop } from "../sim/entities";
import type { ProjectileShape } from "../sim/types";
import { mesh, toon, toonUnique, uniqueCopy, Afterimages } from "../look/LookKit";
import { PALETTE } from "../look/palette";
import { buildArena, type ArenaView } from "../world/ArenaKit";
import { bossFigure, markovFigure, sigilShape } from "./figures";
import { FOCUS } from "../data/resources";
import { INPUT } from "../data/input";
import { holdRadius } from "../actors/child/child";
import { TheoremInstancer } from "./TheoremInstancer";

interface ActorView { g: THREE.Group; ring: THREE.Mesh; ringMat: THREE.MeshBasicMaterial; body: THREE.Object3D | undefined; type: string; flash: number; tint: THREE.MeshToonMaterial[] }
interface Interp { px: number; pz: number; x: number; z: number }

const SHAPES: ProjectileShape[] = ["fire", "bolt", "command", "prophecy", "radiant", "echo", "shock", "ember"];

function projectileGeo(s: ProjectileShape): THREE.BufferGeometry {
  switch (s) {
    case "fire": { const g = new THREE.ConeGeometry(0.32, 0.9, 8); g.rotateX(Math.PI / 2); g.translate(0, 0, -0.15); return g; } // teardrop
    case "command": { const sh = new THREE.Shape(); sh.moveTo(0, 0.45); sh.lineTo(0.4, -0.2); sh.lineTo(0.15, -0.2); sh.lineTo(0, 0.1); sh.lineTo(-0.15, -0.2); sh.lineTo(-0.4, -0.2); sh.closePath(); const g = new THREE.ExtrudeGeometry(sh, { depth: 0.12, bevelEnabled: false }); g.rotateX(-Math.PI / 2); return g; } // chevron
    case "prophecy": return new THREE.TorusGeometry(0.34, 0.08, 6, 18).rotateX(Math.PI / 2); // hollow ring
    case "radiant": return new THREE.OctahedronGeometry(0.42);
    case "echo": return new THREE.TetrahedronGeometry(0.4);
    default: return new THREE.OctahedronGeometry(0.3);
  }
}

/** Mirrors sim state into the Three scene. Interpolates between fixed steps; never writes sim state. */
export class WorldView {
  readonly root = new THREE.Group();
  arena: ArenaView | null = null;
  private actors = new Map<number, ActorView>();
  private props = new Map<number, THREE.Object3D>();
  private hazards = new Map<number, { g: THREE.Object3D; fill?: THREE.Mesh; kind: string }>();
  private interp = new Map<number, Interp>();
  private projInst = new Map<string, THREE.InstancedMesh>();
  markov!: THREE.Group;
  private focusRing!: THREE.Mesh;
  private focusMat!: THREE.MeshBasicMaterial;
  private holdRing!: THREE.Mesh;
  private opGlyphs: THREE.Mesh[] = [];
  private stepPips: THREE.Mesh[] = [];
  private links = new THREE.Group();
  private childHold: THREE.Mesh | null = null;
  readonly afterimages: Afterimages;
  private theorems!: TheoremInstancer;
  private m4 = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private lazar = false;
  markovPos = new THREE.Vector3();
  markovYaw = 0;
  highContrast = false;

  constructor(readonly scene: THREE.Scene) {
    scene.add(this.root);
    this.afterimages = new Afterimages(scene, 72);
    for (const s of SHAPES) for (const owner of ["enemy", "markov"]) {
      const color = owner === "markov" ? PALETTE.goldHot : s === "fire" ? 0xff8a3a : s === "radiant" ? 0xfff2cf : s === "echo" ? 0xc8d2ff : 0x9fc0ff;
      const mat = new THREE.MeshBasicMaterial({ color });
      const im = new THREE.InstancedMesh(projectileGeo(s), mat, 420);
      im.count = 0; im.frustumCulled = false;
      this.projInst.set(`${s}:${owner}`, im);
      scene.add(im);
    }
    this.root.add(this.links);
    this.theorems = new TheoremInstancer(scene);
  }

  load(w: World, lazar = false): void {
    this.clear();
    this.lazar = lazar;
    this.arena = buildArena(w.def);
    this.root.add(this.arena.group);
    this.markov = markovFigure(lazar);
    this.markov.traverse((o) => { if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshToonMaterial) o.material = uniqueCopy(o.material); });
    this.root.add(this.markov);
    this.focusMat = new THREE.MeshBasicMaterial({ color: PALETTE.gold, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false });
    this.focusRing = new THREE.Mesh(new THREE.RingGeometry(0.78, 0.86, 64, 1, 0, Math.PI * 2), this.focusMat);
    this.focusRing.rotation.x = -Math.PI / 2; this.focusRing.position.y = 0.04; this.root.add(this.focusRing);
    this.holdRing = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.05, 48), new THREE.MeshBasicMaterial({ color: PALETTE.gold, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
    this.holdRing.rotation.x = -Math.PI / 2; this.holdRing.position.y = 0.05; this.root.add(this.holdRing);
    const glyphShapes = [this.arrowShape(), this.ghostShape(), this.clockShape(), this.nullShape()];
    this.opGlyphs = glyphShapes.map((sh, i) => {
      const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color: PALETTE.gold, transparent: true, side: THREE.DoubleSide }));
      m.rotation.x = -Math.PI / 2; m.position.y = 0.05; m.userData.slot = i; this.root.add(m); return m;
    });
    this.stepPips = [0, 1].map(() => { const p = new THREE.Mesh(new THREE.CircleGeometry(0.07, 12), new THREE.MeshBasicMaterial({ color: PALETTE.gold, transparent: true })); p.rotation.x = -Math.PI / 2; p.position.y = 0.05; this.root.add(p); return p; });
    if (w.def.boss === "child") {
      this.childHold = new THREE.Mesh(new THREE.RingGeometry(0.985, 1, 96), new THREE.MeshBasicMaterial({ color: 0xcfd9ff, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
      this.childHold.rotation.x = -Math.PI / 2; this.childHold.position.y = 0.06; this.root.add(this.childHold);
    }
    this.snap(w);
    this.snap(w);
  }

  private clear(): void {
    if (this.arena) { this.arena.dispose(); this.root.remove(this.arena.group); }
    for (const v of this.actors.values()) this.root.remove(v.g);
    for (const p of this.props.values()) this.root.remove(p);
    for (const h of this.hazards.values()) this.root.remove(h.g);
    this.actors.clear(); this.props.clear(); this.hazards.clear(); this.interp.clear();
    if (this.markov) this.root.remove(this.markov, this.focusRing, this.holdRing, ...this.opGlyphs, ...this.stepPips);
    if (this.childHold) { this.root.remove(this.childHold); this.childHold = null; }
  }

  /** Called after every sim step: shift current → previous for interpolation. */
  snap(w: World): void {
    const put = (id: number, x: number, z: number) => {
      const i = this.interp.get(id);
      if (i) { i.px = i.x; i.pz = i.z; i.x = x; i.z = z; } else this.interp.set(id, { px: x, pz: z, x, z });
    };
    put(0, w.markov.pos.x, w.markov.pos.z);
    for (const a of w.actors) if (a.alive) put(a.id, a.pos.x, a.pos.z);
    for (const p of w.projectiles) if (p.alive) put(p.id, p.pos.x, p.pos.z);
    for (const p of w.props) if (p.alive) put(p.id, p.pos.x, p.pos.z);
    if (w.frame % 60 === 0) for (const id of [...this.interp.keys()]) if (id !== 0 && !w.actor(id) && !w.projectile(id) && !w.prop(id)) this.interp.delete(id);
  }

  private at(id: number, alpha: number, fx: number, fz: number): [number, number] {
    const i = this.interp.get(id);
    if (!i) return [fx, fz];
    return [i.px + (i.x - i.px) * alpha, i.pz + (i.z - i.pz) * alpha];
  }

  update(w: World, alpha: number, t: number, frame: number): void {
    this.arena?.animate(t);
    this.updateMarkov(w, alpha, t, frame);
    this.updateActors(w, alpha, t);
    this.updateProjectiles(w, alpha);
    this.updateProps(w, alpha, t);
    this.updateHazards(w);
    this.updateLinks(w, alpha);
    if (this.childHold && w.director.boss) {
      const c = w.director.boss; const r = holdRadius(w, c);
      const [x, z] = this.at(c.id, alpha, c.pos.x, c.pos.z);
      this.childHold.position.set(x, 0.06, z); this.childHold.scale.setScalar(r);
    }
    this.afterimages.update();
  }

  private updateMarkov(w: World, alpha: number, t: number, frame: number): void {
    const m = w.markov;
    const [x, z] = this.at(0, alpha, m.pos.x, m.pos.z);
    const yaw = Math.atan2(w.lastInput.aiming ? m.aim.x : m.facing.x, w.lastInput.aiming ? m.aim.z : m.facing.z);
    this.markovPos.set(x, 0, z); this.markovYaw = yaw;
    const g = this.markov;
    g.position.set(x, 0.05 + Math.sin(t * 2) * 0.02, z);
    g.rotation.y = yaw;
    const body = g.getObjectByName("body")!;
    body.rotation.z = m.state === "hitstun" ? 0.25 : m.state === "shatter" ? Math.sin(frame * 0.5) * 0.2 : 0;
    body.scale.y = m.state === "qed" ? 1.05 : 1;
    const armR = g.getObjectByName("armR");
    if (armR) armR.rotation.x = m.state === "opStartup" || m.state === "opRecovery" ? -1.3 : m.state === "strike" ? -1.5 : m.state === "taunt" ? -2.6 : 0;
    const armL = g.getObjectByName("armL");
    if (armL) armL.rotation.x = m.state === "taunt" ? -2.4 + Math.sin(frame * 0.6) * 0.3 : m.state === "frozen" ? -0.2 : 0;
    // Phase: colour-inverted silhouette + stepped afterimages
    const spectral = m.spectral;
    g.traverse((o) => { if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshToonMaterial) { o.material.transparent = spectral; o.material.opacity = spectral ? 0.45 : 1; } });
    if ((spectral || m.state === "step") && frame % 3 === 0) this.afterimages.spawn(new THREE.Vector3(x, 0.9, z), yaw, spectral ? (0xffffff - PALETTE.markovCoat) as number : (PALETTE.gold as number), PALETTE.blue, 15);
    g.visible = !(m.mercyT > 0 && frame % 6 < 2);
    // focus ring (draining arcs), op glyphs (dim when unaffordable), step pips
    const f = m.focus / FOCUS.max;
    this.focusRing.position.set(x, 0.04, z);
    const geo = this.focusRing.geometry as THREE.RingGeometry;
    if (Math.abs((geo.parameters.thetaLength ?? 0) - f * Math.PI * 2) > 0.02) { geo.dispose(); this.focusRing.geometry = new THREE.RingGeometry(0.78, 0.86, 64, 1, Math.PI / 2, Math.max(0.001, f * Math.PI * 2)); }
    this.focusMat.color.setHex(f < 0.2 ? 0x8a6a2a : PALETTE.gold);
    const ops = ["vector", "phase", "order", "null"] as const;
    this.opGlyphs.forEach((gl, i) => {
      const a = Math.PI + (i - 1.5) * 0.42;
      gl.position.set(x + Math.sin(a) * 1.15, 0.05, z + Math.cos(a) * 1.15);
      const has = m.regalia.has(ops[i]!);
      const mat = gl.material as THREE.MeshBasicMaterial;
      mat.opacity = !has ? 0 : m.focus >= FOCUS.cost[ops[i]!] ? 0.95 : 0.25;
      gl.scale.setScalar(0.22);
    });
    this.stepPips.forEach((p, i) => { const a = Math.PI * 0.5 + (i - 0.5) * 0.3; p.position.set(x + Math.sin(a) * 0.82, 0.05, z + Math.cos(a) * 0.82); (p.material as THREE.MeshBasicMaterial).opacity = m.regalia.has("step") ? (i < m.stepCharges ? 1 : 0.15) : 0; });
    // hold glyph ring grows from frame 8
    let hold = 0;
    for (const o of ops) hold = Math.max(hold, w.intent.holdFrames[o]);
    const hv = hold >= INPUT.holdRingFrom ? Math.min(1, (hold - INPUT.holdRingFrom) / (INPUT.holdThreshold - INPUT.holdRingFrom)) : 0;
    this.holdRing.visible = hv > 0; this.holdRing.position.set(x, 0.05, z); this.holdRing.scale.setScalar(0.6 + hv * 0.6);
  }

  private makeActorView(a: Actor): ActorView {
    const isTheorem = ["axiom", "corollary", "variable", "constant", "iterator", "paradox", "oracle", "herald"].includes(a.type);
    const g = bossFigure(a.type); void isTheorem;
    const ringMat = new THREE.MeshBasicMaterial({ color: PALETTE.blue, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false });
    const ring = new THREE.Mesh(new THREE.RingGeometry(a.radius + 0.12, a.radius + 0.22, 48), ringMat);
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04;
    if (a.type !== "child" && a.type !== "ishtar" && a.type !== "door" && a.type !== "shadow" && a.type !== "giant") g.add(ring);
    if (a.elite) { const halo = new THREE.Mesh(new THREE.TorusGeometry(a.radius + 0.25, 0.05, 6, 32), new THREE.MeshBasicMaterial({ color: 0xc7b46a })); halo.rotation.x = Math.PI / 2; halo.position.y = 1.9; g.add(halo); }
    const tint: THREE.MeshToonMaterial[] = [];
    // Per-actor materials: tinting (broken/telegraph/commanded) must never write into the shared slu.lit cache.
    g.traverse((o) => { if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshToonMaterial) { o.material = uniqueCopy(o.material); tint.push(o.material); } });
    this.root.add(g);
    return { g, ring, ringMat, body: g.getObjectByName("body"), type: a.type, flash: 0, tint };
  }

  private updateActors(w: World, alpha: number, t: number): void {
    this.theorems.highContrast = this.highContrast;
    this.theorems.update(w, (a) => this.at(a.id, alpha, a.pos.x, a.pos.z), t);
    const seen = new Set<number>();
    for (const a of w.actors) {
      if (!a.alive || TheoremInstancer.isTheorem(a)) continue;
      seen.add(a.id);
      let v = this.actors.get(a.id);
      if (!v) { v = this.makeActorView(a); this.actors.set(a.id, v); }
      const [x, z] = this.at(a.id, alpha, a.pos.x, a.pos.z);
      v.g.position.set(x, 0, z);
      if (a.type !== "shadow") v.g.rotation.y = Math.atan2(a.facing.x, a.facing.z);
      const b = v.body;
      if (b && ["axiom", "corollary", "variable", "constant", "paradox", "oracle"].includes(a.type)) { b.rotation.y = t * (a.state === "telegraph" ? 6 : 1.2) + a.id; b.position.y = 0.85 + Math.sin(t * 2 + a.id) * 0.08; }
      if (a.type === "iterator" && b) b.rotation.z = t * 2;
      // telegraph pulse (shape + motion first), broken = red fracture, spawn = scale-in
      const tele = a.state === "telegraph" || a.d.declaring > 0;
      const scale = a.state === "spawn" ? Math.max(0.05, 1 - a.stateT / 30) : tele ? 1 + Math.sin(t * 30) * 0.06 : 1;
      if (a.type === "flame") v.g.scale.setScalar(1 + (a.d.growth ?? 0) * 0.5);
      else v.g.scale.setScalar(scale);
      const broken = a.state === "broken";
      const keepsOwnColor = a.type === "flame" || a.type === "ishtar" || a.type === "door" || a.type === "child";
      for (const m of v.tint) {
        if (keepsOwnColor && !broken) continue;
        if (broken) { m.emissive.setHex(PALETTE.red); m.emissiveIntensity = 0.5 + Math.sin(t * 20) * 0.3; }
        else if (a.commandedBy) { m.emissive.setHex(PALETTE.blue); m.emissiveIntensity = 0.5; }
        else if (tele) { m.emissive.setHex(this.highContrast ? 0xffffff : PALETTE.blue); m.emissiveIntensity = 0.45; }
        else if (a.neutral) { m.emissive.setHex(PALETTE.gold); m.emissiveIntensity = 0.5; }
        else if (a.type !== "flame" && a.type !== "ishtar") { m.emissive.setHex(PALETTE.blue); m.emissiveIntensity = a.buffT > 0 ? 0.35 : 0.1; }
        m.transparent = a.spectral || a.phasedT > 0 || a.type === "oracle"; m.opacity = a.spectral ? 0.25 : a.phasedT > 0 ? 0.5 : a.type === "oracle" ? 0.55 : 1;
      }
      // Certainty ring: thin arc; red fracture marks at break thresholds
      const f = a.maxCertainty > 0 ? a.certainty / a.maxCertainty : 0;
      v.ring.scale.set(1, 1, 1);
      const geo = v.ring.geometry as THREE.RingGeometry;
      const want = Math.max(0.001, f * Math.PI * 2);
      if (Math.abs((geo.parameters.thetaLength ?? 0) - want) > 0.03) { geo.dispose(); v.ring.geometry = new THREE.RingGeometry(a.radius + 0.12, a.radius + 0.22, 48, 1, Math.PI / 2, want); }
      v.ringMat.color.setHex(broken ? PALETTE.red : PALETTE.blue);
      if (a.type === "ishtar" && b) { b.children.forEach((c, i) => { if (c.name.startsWith("ring")) { c.rotation.z = t * (0.3 + i * 0.07); c.rotation.x = Math.PI / 2 + Math.sin(t * 0.2 + i) * 0.6; } }); }
      if (a.type === "flame" && b) b.children.forEach((c, i) => { c.scale.x = c.scale.z = 1 + Math.sin(t * 9 + i * 1.7) * 0.08; });
      if (a.type === "prophet" && b) { const core = b.getObjectByName("core"); if (core) core.scale.setScalar(a.d.stalled ? 1.8 + Math.sin(t * 6) * 0.2 : 1); }
      if (a.type === "king" && b) { const crown = b.getObjectByName("crown"); if (crown) crown.position.y = a.d.crown ? 3.6 + Math.sin(t * 2) * 0.2 : 2.95; }
      if (a.type === "judge" && b) { const s = b.getObjectByName("scales"); if (s) s.rotation.z = Math.sin(t) * 0.12; }
      if (a.type === "giant" && b) b.position.y = a.state === "telegraph" ? 0.3 : 0;
    }
    for (const [id, v] of this.actors) if (!seen.has(id)) { this.root.remove(v.g); this.actors.delete(id); }
  }

  private updateProjectiles(w: World, alpha: number): void {
    const counts = new Map<string, number>();
    for (const im of this.projInst.values()) im.count = 0;
    const up = new THREE.Vector3(0, 1, 0);
    for (const p of w.projectiles) {
      if (!p.alive) continue;
      const key = `${SHAPES.includes(p.shape) ? p.shape : "bolt"}:${p.owner}`;
      const im = this.projInst.get(key)!;
      const n = counts.get(key) ?? 0;
      if (n >= 420) continue;
      const [x, z] = this.at(p.id, alpha, p.pos.x, p.pos.z);
      this.q.setFromAxisAngle(up, Math.atan2(p.vel.x, p.vel.z));
      const s = p.radius / 0.35 * (p.phasedT > 0 ? 0.7 : 1);
      this.m4.compose(new THREE.Vector3(x, 0.9, z), this.q, new THREE.Vector3(s, s, s));
      im.setMatrixAt(n, this.m4);
      counts.set(key, n + 1);
    }
    for (const [key, im] of this.projInst) { im.count = counts.get(key) ?? 0; im.visible = im.count > 0; im.instanceMatrix.needsUpdate = true; }
  }

  private makeProp(p: Prop): THREE.Object3D {
    const g = new THREE.Group();
    switch (p.type) {
      case "prism": { const c = mesh(new THREE.OctahedronGeometry(0.6), toonUnique(0xdff0ff, 0x7fc4ff, 0.35, { transparent: true, opacity: 0.85 })); c.scale.y = 1.9; c.position.y = 1.2; c.name = "spin"; g.add(c); break; }
      case "sconce": { const b = mesh(new THREE.BoxGeometry(0.6, 1.2, 0.4), toon(PALETTE.stone)); b.position.y = 1.6; g.add(b); const fl = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 8), new THREE.MeshBasicMaterial({ color: 0xff9a3a })); fl.position.y = 2.5; fl.name = "flame"; g.add(fl); break; }
      case "light": case "pedestal": { if (p.tag !== "lantern") { const ped = mesh(new THREE.CylinderGeometry(0.45, 0.55, 0.9, 10), toon(PALETTE.stone)); ped.position.y = 0.45; g.add(ped); } const orb = new THREE.Mesh(new THREE.SphereGeometry(p.tag === "lantern" ? 0.35 : 0.5, 16, 10), new THREE.MeshBasicMaterial({ color: 0xf6f8ff })); orb.position.y = p.tag === "lantern" ? 2.6 : 1.4; orb.name = "orb"; g.add(orb); break; }
      case "hazardGlyph": { const d = new THREE.Mesh(new THREE.ShapeGeometry(sigilShape(p.radius)), new THREE.MeshBasicMaterial({ color: PALETTE.blueDeep, transparent: true, opacity: 0.55, depthWrite: false })); d.rotation.x = -Math.PI / 2; d.position.y = 0.03; g.add(d); break; }
      case "bell": { const b = mesh(new THREE.CylinderGeometry(0.4, 0.9, 1.2, 12, 1, true), toon(0xd8c79a)); b.position.y = 3; b.name = "spin"; g.add(b); const post = mesh(new THREE.BoxGeometry(0.2, 3.6, 0.2), toon(PALETTE.stone)); post.position.y = 1.8; g.add(post); break; }
      case "dawnShaft": { const s = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 30, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff6e0, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide })); s.position.y = 15; g.add(s); break; }
      case "trialDoor": { const d = mesh(new THREE.BoxGeometry(2, 4, 0.4), toonUnique(0xf7f5ef)); d.position.y = 2; d.lookAt(0, 2, 0); g.add(d); const s = new THREE.Mesh(new THREE.ShapeGeometry(sigilShape(0.5)), new THREE.MeshBasicMaterial({ color: PALETTE.blue })); s.position.set(0, 2.6, 0); s.name = "sigil"; g.add(s); g.userData.door = d; break; }
      case "station": { const lect = mesh(new THREE.CylinderGeometry(0.35, 0.6, 1.2, 6), toon(PALETTE.stone)); lect.position.y = 0.6; g.add(lect); const top = mesh(new THREE.BoxGeometry(1.1, 0.12, 0.8), toon(PALETTE.stone)); top.position.y = 1.25; top.rotation.x = -0.3; g.add(top); const ico = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), new THREE.MeshBasicMaterial({ color: PALETTE.blue })); ico.position.y = 1.9; ico.name = "spin"; g.add(ico); break; }
      case "pickup": { const ico = new THREE.Mesh(new THREE.ShapeGeometry(sigilShape(0.5)), new THREE.MeshBasicMaterial({ color: PALETTE.gold, side: THREE.DoubleSide })); ico.position.y = 1.2; ico.name = "spin"; g.add(ico); break; }
      default: { g.add(mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), toon(PALETTE.stone))); }
    }
    this.root.add(g);
    return g;
  }

  private updateProps(w: World, alpha: number, t: number): void {
    const seen = new Set<number>();
    for (const p of w.props) {
      if (!p.alive) continue;
      seen.add(p.id);
      let g = this.props.get(p.id);
      if (!g) { g = this.makeProp(p); this.props.set(p.id, g); }
      const [x, z] = this.at(p.id, alpha, p.pos.x, p.pos.z);
      g.position.set(x, 0, z);
      const spin = g.getObjectByName("spin"); if (spin) spin.rotation.y = t * 0.8 + p.id;
      if (p.type === "trialDoor") { const d = g.userData.door as THREE.Object3D; d.lookAt(0, 2, 0); }
      const fl = g.getObjectByName("flame"); if (fl) fl.scale.y = 1 + Math.sin(t * 12 + p.id) * 0.2;
    }
    for (const [id, g] of this.props) if (!seen.has(id)) { this.root.remove(g); this.props.delete(id); }
  }

  private updateHazards(w: World): void {
    const seen = new Set<number>();
    for (const h of w.hazards) {
      if (!h.alive) continue;
      seen.add(h.id);
      let v = this.hazards.get(h.id);
      if (!v) { v = this.makeHazard(h); this.hazards.set(h.id, v); }
      const tele = h.telegraphT > 0;
      const prog = tele ? 1 - h.telegraphT / h.telegraphTotal : 1;
      v.g.position.set(h.pos.x, 0.05, h.pos.z);
      if (h.shape === "circle") { v.g.scale.setScalar(h.radius); if (v.fill) v.fill.scale.setScalar(Math.max(0.01, prog)); }
      else if (h.shape === "ring") { v.g.scale.setScalar(Math.max(0.01, h.radius)); }
      const mat = (v.g.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial;
      mat.opacity = tele ? 0.45 + prog * 0.4 : 0.95;
      mat.color.setHex(tele ? (this.highContrast ? 0xffffff : PALETTE.blue) : 0xdfe8ff);
    }
    for (const [id, v] of this.hazards) if (!seen.has(id)) { this.root.remove(v.g); this.hazards.delete(id); }
  }

  private makeHazard(h: Hazard): { g: THREE.Object3D; fill?: THREE.Mesh; kind: string } {
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: PALETTE.blue, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false });
    let fill: THREE.Mesh | undefined;
    if (h.shape === "circle") {
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.93, 1, 48), mat); ring.rotation.x = -Math.PI / 2; g.add(ring);
      fill = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ color: PALETTE.blue, transparent: true, opacity: 0.22, depthWrite: false })); fill.rotation.x = -Math.PI / 2; g.add(fill);
      // glyph ticks: telegraph shape differs per family (kneel = square, sentence = triangle)
      if (h.kind === "kneel" || h.kind.startsWith("sentence")) { const sides = h.kind === "kneel" ? 4 : 3; const poly = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.66, sides), mat); poly.rotation.x = -Math.PI / 2; g.add(poly); }
    } else if (h.shape === "ring") {
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.97, 1.0, 64), mat); ring.rotation.x = -Math.PI / 2; g.add(ring);
    } else {
      const len = Math.hypot(h.end.x - h.pos.x, h.end.z - h.pos.z);
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(h.width * 2, len), mat); strip.rotation.x = -Math.PI / 2; strip.position.z = len / 2; g.add(strip);
      g.rotation.y = Math.atan2(h.end.x - h.pos.x, h.end.z - h.pos.z);
    }
    this.root.add(g);
    return { g, fill, kind: h.kind };
  }

  /** Command beams, Paradox links, Giant shadow tether — drawn as lines. */
  private updateLinks(w: World, alpha: number): void {
    this.links.clear();
    const pts: number[] = [];
    for (const a of w.actors) {
      if (!a.alive) continue;
      const [ax, az] = this.at(a.id, alpha, a.pos.x, a.pos.z);
      const other = a.commandedBy ? w.actor(a.commandedBy) : a.linkId && a.linkId > a.id ? w.actor(a.linkId) : undefined;
      if (other) { const [bx, bz] = this.at(other.id, alpha, other.pos.x, other.pos.z); pts.push(ax, 1, az, bx, 1.2, bz); }
    }
    if (pts.length) {
      const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
      this.links.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: PALETTE.blue, transparent: true, opacity: 0.8 })));
    }
  }

  get afterimageCount(): number { return this.afterimages.count; }
  get isLazar(): boolean { return this.lazar; }

  private arrowShape(): THREE.Shape { const s = new THREE.Shape(); s.moveTo(0, 1); s.lineTo(0.7, -0.2); s.lineTo(0.2, -0.2); s.lineTo(0.2, -1); s.lineTo(-0.2, -1); s.lineTo(-0.2, -0.2); s.lineTo(-0.7, -0.2); s.closePath(); return s; }
  private ghostShape(): THREE.Shape { const s = new THREE.Shape(); s.absarc(0, 0.2, 0.7, 0, Math.PI, false); s.lineTo(-0.7, -0.9); s.lineTo(-0.35, -0.6); s.lineTo(0, -0.9); s.lineTo(0.35, -0.6); s.lineTo(0.7, -0.9); s.closePath(); return s; }
  private clockShape(): THREE.Shape { const s = new THREE.Shape(); s.absarc(0, 0, 0.9, 0, Math.PI * 2, false); const h = new THREE.Path(); h.absarc(0, 0, 0.7, 0, Math.PI * 2, true); s.holes.push(h); return s; }
  private nullShape(): THREE.Shape { const s = new THREE.Shape(); s.moveTo(-0.9, -0.7); s.lineTo(-0.7, -0.9); s.lineTo(0.9, 0.7); s.lineTo(0.7, 0.9); s.closePath(); return s; }
}
