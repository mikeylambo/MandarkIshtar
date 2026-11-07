import * as THREE from "three";
import type { LookKit as ShellLook } from "@slu/web-shell/look/three";
import type { SimEvent } from "../sim/events";
import type { World } from "../sim/World";
import { FEEL } from "../data/feel";
import { PALETTE } from "../look/palette";
import type { Afterimages } from "../look/LookKit";

/**
 * The 15 VFX families (GDD §11). Bursts, rings and convergences play through the shell Look Kit's pooled
 * VFX runtime (one instanced particle draw); principle/vector/fracture lines are one LineSegments draw here.
 * Colors are hex so the identity rules hold: gold = Markov, blue = Laws/threat, red = break, white = grace.
 */
export const VFX_FAMILIES = ["glyph-spark", "vector-line", "orbit-ring", "phase-ripple", "clock-stamp", "rewind-trail", "null-implode", "property-peel", "contradiction-fracture", "qed-fold", "insight-lines", "law-card-slam", "afterimage-step", "hubris-shatter", "dawn-light"] as const;
export type VfxFamily = (typeof VFX_FAMILIES)[number];

interface Line { a: THREE.Vector3; b: THREE.Vector3; c: THREE.Color; life: number; t: number }
const MAX_LINES = 900;
const hex = (c: number) => `#${c.toString(16).padStart(6, "0")}`;

export class Vfx {
  private lines: Line[] = [];
  private readonly lineGeo = new THREE.BufferGeometry();
  private readonly linePos = new Float32Array(MAX_LINES * 6);
  private readonly lineCol = new Float32Array(MAX_LINES * 6);
  private readonly lineMesh: THREE.LineSegments;
  private readonly dawn: THREE.Group;
  private orbitT = 0;
  private seed = 4242;
  dawnLevel = 0;
  readonly counts: Record<string, number> = {};
  private readonly col = new THREE.Color();

  constructor(scene: THREE.Scene, private readonly after: Afterimages, private readonly look: ShellLook) {
    this.lineGeo.setAttribute("position", new THREE.BufferAttribute(this.linePos, 3));
    this.lineGeo.setAttribute("color", new THREE.BufferAttribute(this.lineCol, 3));
    this.lineMesh = new THREE.LineSegments(this.lineGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95 }));
    this.lineMesh.frustumCulled = false;
    scene.add(this.lineMesh);
    // Dawn god-rays: one merged geometry, one draw.
    const rays: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 9; i++) { const g = new THREE.PlaneGeometry(2.5 + i * 0.4, 60); g.rotateZ((i - 4) * 0.08); g.translate((i - 4) * 4, 28, 26); rays.push(g); }
    const merged = mergeGeos(rays);
    this.dawn = new THREE.Group();
    this.dawn.add(new THREE.Mesh(merged, new THREE.MeshBasicMaterial({ color: PALETTE.grace, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })));
    scene.add(this.dawn);
  }

  private r(a: number, b: number): number { this.seed = (this.seed * 16807) % 2147483647; return a + (this.seed / 2147483647) * (b - a); }

  /** Shell burst (sparks + core flash), tinted. */
  burst(x: number, y: number, z: number, color: number, scale = 1): void { this.look.play("fx.impact.burst", { position: { x, y, z }, scale, tint: hex(color) }); }
  /** Shell shockwave ring (radius ≈ 5 u × scale). */
  ring(x: number, z: number, color: number, radius: number, y = 0.1): void { this.look.play("fx.shockwave.ring", { position: { x, y, z }, scale: Math.max(0.05, radius / 5), tint: hex(color), direction: { x: 0, y: 1, z: 0 } }); }
  /** Shell charge-up converging on a point, released after `ms` (implode / fold). */
  converge(x: number, y: number, z: number, color: number, scale = 1, ms = 140): void {
    const h = this.look.play("fx.charge.up", { position: { x, y, z }, scale, tint: hex(color) });
    setTimeout(() => (h as unknown as { release?: () => void; stop?: () => void }).release?.() ?? (h as unknown as { stop?: () => void }).stop?.(), ms);
  }
  line(ax: number, ay: number, az: number, bx: number, by: number, bz: number, color: number, life = 12): void {
    if (this.lines.length >= MAX_LINES) this.lines.shift();
    this.lines.push({ a: new THREE.Vector3(ax, ay, az), b: new THREE.Vector3(bx, by, bz), c: new THREE.Color(color), life, t: 0 });
  }
  private circle(x: number, z: number, r: number, color: number, life = 2, y = 0.9, seg = 32): void {
    for (let i = 0; i < seg; i++) { const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2; this.line(x + Math.sin(a0) * r, y, z + Math.cos(a0) * r, x + Math.sin(a1) * r, y, z + Math.cos(a1) * r, color, life); }
  }

  /** Map one sim event to its VFX family (data/feel.ts). */
  onEvent(e: SimEvent, w: World): void {
    const fam = FEEL[e.type]?.vfx as VfxFamily | undefined;
    const x = e.x ?? w.markov.pos.x, z = e.z ?? w.markov.pos.z;
    if (fam) this.counts[fam] = (this.counts[fam] ?? 0) + 1;
    switch (fam) {
      case "glyph-spark": this.burst(x, 1.2, z, e.type === "StrikeHit" ? PALETTE.gold : PALETTE.goldHot, e.type === "CompoundCast" ? 0.8 : 0.3); if (e.type === "CompoundCast") this.ring(x, z, PALETTE.gold, 2.4); break;
      case "vector-line": {
        const dx = e.dx ?? 0, dz = e.dz ?? 1, l = Math.hypot(dx, dz) || 1;
        this.line(x, 0.9, z, x + (dx / l) * 14, 0.9, z + (dz / l) * 14, PALETTE.gold, 12);
        break;
      }
      case "orbit-ring": this.orbitT = 180; break;
      case "phase-ripple": this.ring(x, z, e.value === 2 || e.value === 3 ? PALETTE.blue : 0xffffff, 2.2, 0.9); break;
      case "clock-stamp": this.circle(x, z, 0.8, PALETTE.gold, 30, 1, 12); for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; this.line(x + Math.sin(a) * 0.7, 1, z + Math.cos(a) * 0.7, x + Math.sin(a) * 0.95, 1, z + Math.cos(a) * 0.95, PALETTE.gold, 30); } break;
      case "rewind-trail": {
        const a = e.id ? w.actor(e.id) : undefined;
        const p = e.id ? w.projectile(e.id) : undefined;
        const h = a?.history ?? p?.history;
        if (h) for (let i = 0; i + 6 < h.count; i += 6) { const p0 = h.get(i), p1 = h.get(i + 6); this.line(p0.x, 0.9, p0.z, p1.x, 0.9, p1.z, PALETTE.gold, 40); if (i % 18 === 0) this.after.spawn(new THREE.Vector3(p0.x, 0.9, p0.z), 0, PALETTE.gold, PALETTE.blue, 24, 0.7); }
        break;
      }
      case "null-implode": this.converge(x, 0.9, z, PALETTE.gold, 0.4, 100); break;
      case "property-peel": this.burst(x, 1.6, z, PALETTE.gold, 0.6); break;
      case "contradiction-fracture": {
        for (let i = 0; i < 10; i++) {
          let a = this.r(0, Math.PI * 2), px = x, pz = z, py = 1;
          for (let k = 0; k < 3; k++) { const nx = px + Math.cos(a) * this.r(0.5, 1.1), nz = pz + Math.sin(a) * this.r(0.5, 1.1), ny = py + this.r(-0.4, 0.5); this.line(px, py, pz, nx, ny, nz, PALETTE.red, 26); px = nx; pz = nz; py = ny; a += this.r(-0.7, 0.7); }
        }
        this.burst(x, 1, z, PALETTE.red, 0.7); break;
      }
      case "qed-fold": this.converge(x, 1.2, z, PALETTE.gold, 1, 160); this.line(x, 0, z, x, 9, z, PALETTE.gold, 20); break;
      case "law-card-slam": this.ring(w.markov.pos.x, w.markov.pos.z, PALETTE.blue, 18, 0.08); break;
      case "afterimage-step": { const dx = e.dx ?? 0, dz = e.dz ?? 1; for (let i = 0; i < 3; i++) this.after.spawn(new THREE.Vector3(x + dx * i * 1.5, 0.9, z + dz * i * 1.5), Math.atan2(dx, dz), PALETTE.gold, PALETTE.blue, 9 + i * 3); break; }
      case "hubris-shatter": this.burst(x, 1.8, z, PALETTE.gold, 1.6); this.ring(x, z, PALETTE.red, 4, 1); break;
      case "dawn-light": this.ring(x, z, PALETTE.grace, 9, 0.1); this.burst(x, 2, z, PALETTE.grace, 1.2); break;
      default: break;
    }
    if (e.type === "Telegraph" && e.dx !== undefined && e.id) { const a = w.actor(e.id); if (a) this.line(a.pos.x, 0.08, a.pos.z, a.pos.x + (e.dx ?? 0) * 8, 0.08, a.pos.z + (e.dz ?? 0) * 8, PALETTE.blue, Math.min(40, e.value ?? 30)); }
    if (e.type === "Prophecy" && e.kind) this.circle(x, z, 1.4, PALETTE.blue, 30, 2.2, 24);
  }

  /** Insight: principle lines in white (reflector paths, shadow planes, command beams, prediction cones). */
  insightLines(w: World): void {
    this.counts["insight-lines"] = (this.counts["insight-lines"] ?? 0) + 1;
    for (const p of w.projectiles) if (p.alive && p.owner === "enemy") this.line(p.pos.x, 0.9, p.pos.z, p.pos.x + p.vel.x * 1.2, 0.9, p.pos.z + p.vel.z * 1.2, 0xffffff, 2);
    for (const a of w.actors) {
      if (!a.alive) continue;
      if (a.type === "oracle" && a.state === "telegraph") this.line(a.pos.x, 0.9, a.pos.z, a.d.px ?? a.pos.x, 0.9, a.d.pz ?? a.pos.z, 0xffffff, 2);
      if (a.shadowed || a.type === "giant") { const s = w.law.shadowPoint(a); this.line(a.pos.x, 0.1, a.pos.z, s.x, 0.1, s.z, 0xffffff, 2); }
      if (a.type === "axiom" && a.state === "telegraph") this.line(a.pos.x, 0.2, a.pos.z, a.pos.x + a.aim.x * 12, 0.2, a.pos.z + a.aim.z * 12, 0xffffff, 2);
    }
    for (const pr of w.props) if (pr.alive && pr.type === "prism") this.circle(pr.pos.x, pr.pos.z, 0.85, 0xffffff, 2, 0.08, 12);
  }

  update(w: World | null): void {
    if (this.orbitT > 0 && w) { this.orbitT--; this.circle(w.markov.pos.x, w.markov.pos.z, 3, PALETTE.gold, 1, 0.9, 40); }
    let li = 0;
    for (let i = this.lines.length - 1; i >= 0; i--) { const l = this.lines[i]!; l.t++; if (l.t > l.life) this.lines.splice(i, 1); }
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
    const rays = this.dawn.children[0] as THREE.Mesh;
    (rays.material as THREE.MeshBasicMaterial).opacity = this.dawnLevel * 0.16;
    rays.visible = this.dawnLevel > 0.01;
    this.lineMesh.visible = li > 0;
  }

  clear(): void { this.lines.length = 0; this.dawnLevel = 0; this.orbitT = 0; }
}

function mergeGeos(gs: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const pos: number[] = []; const idx: number[] = []; let base = 0;
  for (const g of gs) { const p = g.attributes.position!; for (let i = 0; i < p.count; i++) pos.push(p.getX(i), p.getY(i), p.getZ(i)); const ix = g.index!; for (let i = 0; i < ix.count; i++) idx.push(ix.getX(i) + base); base += p.count; }
  const out = new THREE.BufferGeometry(); out.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); out.setIndex(idx); return out;
}
