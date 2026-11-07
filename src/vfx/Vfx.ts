import * as THREE from "three";
import type { SimEvent } from "../sim/events";
import type { World } from "../sim/World";
import { FEEL } from "../data/feel";
import { PALETTE } from "../look/palette";
import { DeterministicRng } from "@slu/web-shell";
import type { Afterimages } from "../look/LookKit";

/** The 15 VFX families (GDD §11). All pooled; presentation-only randomness. */
export const VFX_FAMILIES = ["glyph-spark", "vector-line", "orbit-ring", "phase-ripple", "clock-stamp", "rewind-trail", "null-implode", "property-peel", "contradiction-fracture", "qed-fold", "insight-lines", "law-card-slam", "afterimage-step", "hubris-shatter", "dawn-light"] as const;
export type VfxFamily = (typeof VFX_FAMILIES)[number];

interface Spark { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; t: number; c: THREE.Color; s: number; implode?: { x: number; z: number } }
interface Line { a: THREE.Vector3; b: THREE.Vector3; c: THREE.Color; life: number; t: number }
interface Ring { m: THREE.Mesh; life: number; t: number; r0: number; r1: number; y: number; follow?: number }

const MAX_SPARKS = 900, MAX_LINES = 600;

export class Vfx {
  private sparks: Spark[] = [];
  private lines: Line[] = [];
  private rings: Ring[] = [];
  private ringPool: THREE.Mesh[] = [];
  private readonly sparkMesh: THREE.InstancedMesh;
  private readonly lineGeo = new THREE.BufferGeometry();
  private readonly linePos = new Float32Array(MAX_LINES * 6);
  private readonly lineCol = new Float32Array(MAX_LINES * 6);
  private readonly lineMesh: THREE.LineSegments;
  private readonly rng = new DeterministicRng(4242);
  private dawn: THREE.Group;
  dawnLevel = 0;
  readonly counts: Record<string, number> = {};
  private m4 = new THREE.Matrix4();
  private tmp = new THREE.Vector3();
  private col = new THREE.Color();

  constructor(private readonly scene: THREE.Scene, private readonly after: Afterimages) {
    this.sparkMesh = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.08), new THREE.MeshBasicMaterial({ color: 0xffffff }), MAX_SPARKS);
    this.sparkMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_SPARKS * 3), 3);
    this.sparkMesh.count = 0; this.sparkMesh.frustumCulled = false;
    scene.add(this.sparkMesh);
    this.lineGeo.setAttribute("position", new THREE.BufferAttribute(this.linePos, 3));
    this.lineGeo.setAttribute("color", new THREE.BufferAttribute(this.lineCol, 3));
    this.lineMesh = new THREE.LineSegments(this.lineGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95 }));
    this.lineMesh.frustumCulled = false;
    scene.add(this.lineMesh);
    for (let i = 0; i < 48; i++) {
      const m = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.visible = false; scene.add(m); this.ringPool.push(m);
    }
    this.dawn = new THREE.Group();
    for (let i = 0; i < 9; i++) {
      const ray = new THREE.Mesh(new THREE.PlaneGeometry(2.5 + i * 0.4, 60), new THREE.MeshBasicMaterial({ color: PALETTE.grace, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
      ray.position.set((i - 4) * 4, 28, 26); ray.rotation.z = (i - 4) * 0.08; this.dawn.add(ray);
    }
    scene.add(this.dawn);
  }

  get sparkCount(): number { return this.sparks.length; }
  private r(a: number, b: number): number { return this.rng.range(a, b); }

  spark(x: number, y: number, z: number, color: number, n: number, speed = 4, life = 24, size = 1): void {
    for (let i = 0; i < n && this.sparks.length < MAX_SPARKS; i++) {
      const a = this.r(0, Math.PI * 2), e = this.r(-0.3, 1);
      this.sparks.push({ x, y, z, vx: Math.cos(a) * speed * this.r(0.4, 1), vy: e * speed * 0.6, vz: Math.sin(a) * speed * this.r(0.4, 1), life: life * this.r(0.6, 1.2), t: 0, c: new THREE.Color(color), s: size });
    }
  }
  line(ax: number, ay: number, az: number, bx: number, by: number, bz: number, color: number, life = 12): void {
    if (this.lines.length >= MAX_LINES) this.lines.shift();
    this.lines.push({ a: new THREE.Vector3(ax, ay, az), b: new THREE.Vector3(bx, by, bz), c: new THREE.Color(color), life, t: 0 });
  }
  ring(x: number, z: number, color: number, r0: number, r1: number, life: number, y = 0.06, opacity = 0.9): void {
    const m = this.ringPool.pop() ?? this.rings.shift()?.m;
    if (!m) return;
    m.visible = true; m.position.set(x, y, z); (m.material as THREE.MeshBasicMaterial).color.setHex(color); (m.material as THREE.MeshBasicMaterial).opacity = opacity;
    this.rings.push({ m, life, t: 0, r0, r1, y });
  }

  /** Map one sim event to its VFX family (data/feel.ts). */
  onEvent(e: SimEvent, w: World): void {
    const fam = FEEL[e.type]?.vfx as VfxFamily | undefined;
    const x = e.x ?? w.markov.pos.x, z = e.z ?? w.markov.pos.z;
    if (fam) this.counts[fam] = (this.counts[fam] ?? 0) + 1;
    switch (fam) {
      case "glyph-spark": this.spark(x, 1.2, z, e.type === "StrikeHit" ? PALETTE.gold : PALETTE.goldHot, e.type === "CompoundCast" ? 26 : 8, 3, 18); if (e.type === "CompoundCast") this.ring(x, z, PALETTE.gold, 0.4, 2.4, 20); break;
      case "vector-line": {
        const dx = e.dx ?? 0, dz = e.dz ?? 1, l = Math.hypot(dx, dz) || 1;
        this.line(x, 0.9, z, x + (dx / l) * 14, 0.9, z + (dz / l) * 14, PALETTE.gold, 12);
        this.spark(x, 0.9, z, PALETTE.goldHot, 6, 2, 12); break;
      }
      case "orbit-ring": this.ring(w.markov.pos.x, w.markov.pos.z, PALETTE.gold, 3, 3.05, 180, 0.9, 0.5); this.rings[this.rings.length - 1]!.follow = 1; break;
      case "phase-ripple": this.ring(x, z, e.value === 2 || e.value === 3 ? PALETTE.blue : 0xffffff, 0.2, 2.2, 18, 0.9); break;
      case "clock-stamp": this.ring(x, z, PALETTE.gold, 1.8, 0.6, 14, 1.0); for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; this.line(x + Math.sin(a) * 0.7, 1, z + Math.cos(a) * 0.7, x + Math.sin(a) * 0.9, 1, z + Math.cos(a) * 0.9, PALETTE.gold, 30); } break;
      case "rewind-trail": {
        const a = e.id ? w.actor(e.id) : undefined;
        const p = e.id ? w.projectile(e.id) : undefined;
        const h = a?.history ?? p?.history;
        if (h) for (let i = 0; i + 6 < h.count; i += 6) { const p0 = h.get(i), p1 = h.get(i + 6); this.line(p0.x, 0.9, p0.z, p1.x, 0.9, p1.z, PALETTE.gold, 40); if (i % 18 === 0) this.after.spawn(new THREE.Vector3(p0.x, 0.9, p0.z), 0, PALETTE.gold, PALETTE.blue, 24, 0.7); }
        break;
      }
      case "null-implode": this.ring(x, z, PALETTE.gold, 1.6, 0.05, 12, 0.9); this.ring(x, z, 0x000000, 1.2, 0.05, 10, 0.92); for (let i = 0; i < 14; i++) { const a = this.r(0, 6.28); this.sparks.push({ x: x + Math.cos(a) * 1.4, y: 0.9, z: z + Math.sin(a) * 1.4, vx: 0, vy: 0, vz: 0, life: 12, t: 0, c: new THREE.Color(PALETTE.gold), s: 1, implode: { x, z } }); } break;
      case "property-peel": this.spark(x, 1.6, z, PALETTE.gold, 18, 5, 26, 1.4); this.ring(x, z, PALETTE.gold, 0.6, 1.6, 16, 1.6); break;
      case "contradiction-fracture": {
        for (let i = 0; i < 10; i++) {
          let a = this.r(0, Math.PI * 2), px = x, pz = z, py = 1;
          for (let k = 0; k < 3; k++) { const nx = px + Math.cos(a) * this.r(0.5, 1.1), nz = pz + Math.sin(a) * this.r(0.5, 1.1), ny = py + this.r(-0.4, 0.5); this.line(px, py, pz, nx, ny, nz, PALETTE.red, 26); px = nx; pz = nz; py = ny; a += this.r(-0.7, 0.7); }
        }
        this.spark(x, 1, z, PALETTE.red, 22, 6, 22); this.ring(x, z, PALETTE.red, 0.3, 3, 14, 0.9); break;
      }
      case "qed-fold": { for (let i = 0; i < 30; i++) { const a = this.r(0, 6.28), r = this.r(0.8, 2); this.sparks.push({ x: x + Math.cos(a) * r, y: this.r(0.3, 2), z: z + Math.sin(a) * r, vx: 0, vy: 0, vz: 0, life: 20, t: 0, c: new THREE.Color(PALETTE.gold), s: 1.6, implode: { x, z } }); } this.spark(x, 1.2, z, PALETTE.goldHot, 16, 2, 40); this.line(x, 0, z, x, 9, z, PALETTE.gold, 20); break; }
      case "law-card-slam": this.ring(w.markov.pos.x, w.markov.pos.z, PALETTE.blue, 0.5, 18, 30, 0.08); break;
      case "afterimage-step": { const dx = e.dx ?? 0, dz = e.dz ?? 1; for (let i = 0; i < 3; i++) this.after.spawn(new THREE.Vector3(x + dx * i * 1.5, 0.9, z + dz * i * 1.5), Math.atan2(dx, dz), PALETTE.gold, PALETTE.blue, 9 + i * 3); break; }
      case "hubris-shatter": this.spark(x, 1.8, z, PALETTE.gold, 60, 7, 40, 1.8); this.ring(x, z, PALETTE.red, 0.2, 4, 20, 1); break;
      case "dawn-light": this.ring(x, z, PALETTE.grace, 0.2, 9, 60, 0.1); this.spark(x, 2, z, PALETTE.grace, 40, 3, 60, 1.4); break;
      default: break;
    }
    if (e.type === "Telegraph" && e.dx !== undefined && e.id) { const a = w.actor(e.id); if (a) this.line(a.pos.x, 0.08, a.pos.z, a.pos.x + (e.dx ?? 0) * 8, 0.08, a.pos.z + (e.dz ?? 0) * 8, PALETTE.blue, Math.min(40, e.value ?? 30)); }
    if (e.type === "Prophecy" && e.kind) this.ring(x, z, PALETTE.blue, 0.4, 1.4, 30, 2.2, 0.7);
  }

  /** Insight: principle lines in white (reflector paths, shadow planes, command beams, prediction cones). */
  insightLines(w: World): void {
    this.counts["insight-lines"] = (this.counts["insight-lines"] ?? 0) + 1;
    for (const p of w.projectiles) if (p.alive && p.owner === "enemy") { this.line(p.pos.x, 0.9, p.pos.z, p.pos.x + p.vel.x * 1.2, 0.9, p.pos.z + p.vel.z * 1.2, 0xffffff, 2); }
    for (const a of w.actors) {
      if (!a.alive) continue;
      if (a.type === "oracle" && a.state === "telegraph") this.line(a.pos.x, 0.9, a.pos.z, a.d.px ?? a.pos.x, 0.9, a.d.pz ?? a.pos.z, 0xffffff, 2);
      if (a.shadowed || a.type === "giant") { const s = w.law.shadowPoint(a); this.line(a.pos.x, 0.1, a.pos.z, s.x, 0.1, s.z, 0xffffff, 2); }
      if (a.type === "axiom" && a.state === "telegraph") this.line(a.pos.x, 0.2, a.pos.z, a.pos.x + a.aim.x * 12, 0.2, a.pos.z + a.aim.z * 12, 0xffffff, 2);
    }
    for (const pr of w.props) if (pr.alive && pr.type === "prism") this.ring(pr.pos.x, pr.pos.z, 0xffffff, 0.8, 0.85, 2, 0.08, 0.6);
  }

  update(w: World | null): void {
    // sparks
    let n = 0;
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i]!;
      s.t++;
      if (s.implode) { const k = 0.18; s.x += (s.implode.x - s.x) * k; s.z += (s.implode.z - s.z) * k; s.y += (1.2 - s.y) * k; }
      else { s.x += s.vx / 60; s.y += s.vy / 60; s.z += s.vz / 60; s.vy -= 0.08; s.vx *= 0.95; s.vz *= 0.95; }
      if (s.t >= s.life) { this.sparks.splice(i, 1); continue; }
    }
    for (const s of this.sparks) {
      if (n >= MAX_SPARKS) break;
      const k = 1 - s.t / s.life;
      this.m4.makeScale(s.s * k + 0.2, s.s * k + 0.2, s.s * k + 0.2); this.m4.setPosition(s.x, s.y, s.z);
      this.sparkMesh.setMatrixAt(n, this.m4); this.sparkMesh.setColorAt(n, s.c);
      n++;
    }
    this.sparkMesh.count = n; this.sparkMesh.instanceMatrix.needsUpdate = true; if (this.sparkMesh.instanceColor) this.sparkMesh.instanceColor.needsUpdate = true;
    // lines
    let li = 0;
    for (let i = this.lines.length - 1; i >= 0; i--) { const l = this.lines[i]!; l.t++; if (l.t >= l.life) this.lines.splice(i, 1); }
    for (const l of this.lines) {
      const k = 1 - l.t / l.life;
      this.col.copy(l.c).multiplyScalar(Math.max(0.15, k));
      this.linePos.set([l.a.x, l.a.y, l.a.z, l.b.x, l.b.y, l.b.z], li * 6);
      this.lineCol.set([this.col.r, this.col.g, this.col.b, this.col.r, this.col.g, this.col.b], li * 6);
      li++;
    }
    this.lineGeo.setDrawRange(0, li * 2);
    (this.lineGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.lineGeo.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    // rings
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i]!;
      r.t++;
      const k = r.t / r.life;
      const rad = r.r0 + (r.r1 - r.r0) * k;
      r.m.scale.setScalar(Math.max(0.01, rad));
      if (r.follow && w) r.m.position.set(w.markov.pos.x, r.y, w.markov.pos.z);
      (r.m.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - k);
      if (r.t >= r.life) { r.m.visible = false; this.ringPool.push(r.m); this.rings.splice(i, 1); }
    }
    // dawn
    this.dawn.children.forEach((ray, i) => { ((ray as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = this.dawnLevel * (0.12 + (i % 3) * 0.05); });
    void this.tmp;
  }

  clear(): void {
    this.sparks.length = 0; this.lines.length = 0;
    for (const r of this.rings) { r.m.visible = false; this.ringPool.push(r.m); }
    this.rings.length = 0; this.dawnLevel = 0;
  }
}
