import type { World } from "../../sim/World";
import type { Actor, Projectile, Prop } from "../../sim/entities";
import { add, dirTo, dist, fromAngle, len, norm, scale, sub } from "../../sim/math";
import { BTN, type InputFrame, type OpId, type Vec } from "../../sim/types";
import { hitPointOf } from "../../actors/registry";

/**
 * Bots read the world (like a player reading the screen) and emit semantic InputFrames only.
 * They never write sim state.
 */
export interface Bot { name: string; next(w: World): InputFrame }

type Macro = { frames: InputFrame[]; label: string };

export const OP_BTN: Record<OpId, number> = { vector: BTN.vector, phase: BTN.phase, order: BTN.order, null: BTN.null };

export class BotKit {
  private queue: InputFrame[] = [];
  label = "";
  lastOp: Record<string, number> = {};

  get busy(): boolean { return this.queue.length > 0; }
  clear(): void { this.queue.length = 0; }

  pop(): InputFrame | null { return this.queue.shift() ?? null; }

  push(m: Macro): void { this.queue.push(...m.frames); this.label = m.label; }

  static frame(move: Vec | null, aim: Vec | null, b = 0): InputFrame {
    const mv = move ? (len(move) > 1 ? norm(move) : move) : { x: 0, z: 0 };
    return { mx: mv.x, mz: mv.z, ax: aim?.x ?? 0, az: aim?.z ?? 0, aiming: !!aim, b };
  }

  /** Tap: press for 2 frames, release (tap resolves on release). */
  tap(op: OpId, aim: Vec, move: Vec | null = null, w?: World): void {
    const b = OP_BTN[op];
    if (w) this.lastOp[op] = w.frame;
    this.push({ label: `tap:${op}`, frames: [BotKit.frame(move, aim, b), BotKit.frame(move, aim, b), BotKit.frame(move, aim, 0)] });
  }
  hold(op: OpId, aim: Vec, frames = 22, w?: World): void {
    const b = OP_BTN[op];
    if (w) this.lastOp[op] = w.frame;
    const f: InputFrame[] = [];
    for (let i = 0; i < frames; i++) f.push(BotKit.frame(null, aim, b));
    f.push(BotKit.frame(null, aim, 0));
    this.push({ label: `hold:${op}`, frames: f });
  }
  /** Compound: tap A then tap B within the window. */
  compound(a: OpId, b: OpId, aim: Vec, aimB?: Vec, holdA = false, w?: World): void {
    if (holdA) this.hold(a, aim, 21, w); else this.tap(a, aim, null, w);
    this.tap(b, aimB ?? aim, null, w);
  }
  step(dir: Vec): void { this.push({ label: "step", frames: [BotKit.frame(dir, null, BTN.step), BotKit.frame(dir, null, 0)] }); }
  strike(aim: Vec | null): void { this.push({ label: "strike", frames: [BotKit.frame(null, aim, BTN.strike), BotKit.frame(null, aim, 0)] }); }
  wait(n: number, move: Vec | null = null): void { const f: InputFrame[] = []; for (let i = 0; i < n; i++) f.push(BotKit.frame(move, null, 0)); this.push({ label: "wait", frames: f }); }
}

// ---------------- perception helpers ----------------

export function hostileProjectiles(w: World): Projectile[] { return w.projectiles.filter((p) => p.alive && p.owner === "enemy" && p.phasedT <= 0); }
export function enemies(w: World): Actor[] { return w.actors.filter((a) => a.alive && !a.neutral && a.state !== "spawn" && a.type !== "shadow"); }
export function nearest<T extends { pos: Vec }>(list: T[], p: Vec): T | undefined {
  let best: T | undefined, bd = Infinity;
  for (const x of list) { const d = dist(x.pos, p); if (d < bd) { bd = d; best = x; } }
  return best;
}

/** Frames until projectile p passes within r of point (assuming straight line), or Infinity. */
export function timeToImpact(p: Projectile, pt: Vec, r: number): number {
  const rel = sub(pt, p.pos);
  const sp = len(p.vel);
  if (sp < 0.1) return dist(p.pos, pt) < r ? 0 : Infinity;
  const v = scale(p.vel, 1 / sp);
  const along = rel.x * v.x + rel.z * v.z;
  if (along < -r) return Infinity;
  const perp = Math.abs(rel.x * v.z - rel.z * v.x);
  if (perp > r + p.radius) return Infinity;
  return Math.max(0, (along / sp) * 60);
}

/** Danger score of standing at point q after `t` frames (projectiles + resolving hazards + charging bodies). */
export function danger(w: World, q: Vec, t: number): number {
  let s = 0;
  const m = w.markov;
  for (const p of w.projectiles) {
    if (!p.alive || p.owner !== "enemy" || p.phasedT > 0) continue;
    const scaleT = w.worldScale * p.localScale;
    const fut = { x: p.pos.x + (p.vel.x * t * scaleT) / 60, z: p.pos.z + (p.vel.z * t * scaleT) / 60 };
    const d = dist(fut, q) - p.radius - m.radius;
    if (d < 1.2) s += (1.2 - d) * 6;
  }
  for (const h of w.hazards) {
    if (!h.alive || h.spent) continue;
    const resolvesIn = h.telegraphT;
    if (resolvesIn > t + 30) continue;
    const grow = h.grow ? h.grow * Math.max(0, t - resolvesIn) : 0;
    const hh = { ...h, telegraphT: 0, radius: h.radius + grow };
    if (w.hazardHits(hh, q, m.radius + 0.6)) {
      // depth-weighted so that moving outward always reads as progress
      const depth = h.shape === "circle" ? (hh.radius + m.radius + 0.6 - dist(h.pos, q)) / (hh.radius + 1) : 0.5;
      s += 5 + 6 * Math.max(0, depth);
    }
  }
  for (const a of w.actors) {
    if (!a.alive || a.neutral || a.type === "shadow" || a.type === "child" || a.type === "ishtar") continue;
    if (a.type === "axiom" && (a.state === "telegraph" || a.state === "act")) {
      // charge lane
      const end = add(a.pos, scale(a.aim, 12));
      const ab = sub(end, a.pos), l2 = ab.x * ab.x + ab.z * ab.z;
      const tt = Math.max(0, Math.min(1, ((q.x - a.pos.x) * ab.x + (q.z - a.pos.z) * ab.z) / l2));
      const dd = Math.hypot(q.x - (a.pos.x + ab.x * tt), q.z - (a.pos.z + ab.z * tt));
      if (dd < a.radius + 0.9) s += 5;
    }
    if (w.def.boss !== "child" && dist(a.pos, q) < a.radius + m.radius + 0.25 && (a.boss || a.immovable)) s += 2;
  }
  // Temptation pickups are danger to a bot that means to refuse them.
  if (w.flags.ishtarPhase === 2) for (const p of w.props) if (p.alive && p.type === "pickup" && dist(p.pos, q) < 2.2) s += 6;
  // arena edge (void edges are soft walls for Markov but stay away anyway)
  const R = w.def.arena.radius;
  const e = len(q) - (R - 1.2);
  if (e > 0) s += e * 3;
  return s;
}

/** Best of 16 directions (+ standing still) by sampled danger over the next ~24 frames. */
export function safestMove(w: World, prefer: Vec | null = null, preferWeight = 0.15): { dir: Vec | null; risk: number } {
  const m = w.markov;
  const speed = m.spectral ? 8 : 6.5;
  let best: Vec | null = null, bestScore = Infinity, bestRisk = Infinity;
  const options: (Vec | null)[] = [null];
  for (let i = 0; i < 16; i++) options.push(fromAngle((i * Math.PI) / 8));
  for (const d of options) {
    let risk = 0;
    for (const t of [6, 12, 18, 24, 32]) {
      const q = d ? add(m.pos, scale(d, (speed * t) / 60)) : m.pos;
      risk += danger(w, q, t);
    }
    let score = risk;
    if (prefer && d) score -= (d.x * prefer.x + d.z * prefer.z) * preferWeight;
    if (prefer && !d) score += preferWeight * 0.5;
    if (score < bestScore) { bestScore = score; best = d; bestRisk = risk; }
  }
  return { dir: best, risk: bestRisk };
}

export function currentDanger(w: World): number { return danger(w, w.markov.pos, 6) + danger(w, w.markov.pos, 12); }

export function aimTo(w: World, p: Vec): Vec { return dirTo(w.markov.pos, p); }
export function hp(w: World, a: Actor): Vec { return hitPointOf(w, a); }
export function prismsOf(w: World): Prop[] { return w.props.filter((p) => p.alive && p.type === "prism"); }
