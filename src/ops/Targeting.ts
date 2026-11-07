import { INPUT } from "../data/input";
import type { World } from "../sim/World";
import type { TargetRef } from "../sim/entities";
import { angleBetween, dist, sub } from "../sim/math";
import type { OpId, Vec } from "../sim/types";
import { behaviorFor } from "../actors/registry";

interface Cand { ref: TargetRef; pos: Vec; bias: number; hostileProjectile: boolean }

/** Candidate targets per op/mode. Bias < 1 makes a candidate preferred. */
function candidates(w: World, op: OpId, mode: "tap" | "hold"): Cand[] {
  const out: Cand[] = [];
  const projectilesOk = !(op === "phase" && mode === "tap") && !(op === "null" && mode === "hold");
  if (projectilesOk) {
    for (const p of w.projectiles) {
      if (!p.alive || p.orbitT > 0) continue;
      const hostile = p.owner === "enemy";
      out.push({ ref: { kind: "projectile", id: p.id }, pos: p.pos, bias: hostile ? 0.6 : 1.4, hostileProjectile: hostile });
    }
  }
  for (const a of w.actors) {
    if (!a.alive || a.neutral || a.state === "spawn") continue;
    const beh = behaviorFor(a.type);
    if (beh.targetable === false) continue;
    let bias = 1;
    if (op === "null" && mode === "tap" && (a.state === "telegraph" || a.d.declaring > 0 || a.commandedBy)) bias = 0.4;
    if (op === "order" && mode === "hold") bias = 1.3;
    if (a.type === "child") bias = 0.9;
    out.push({ ref: { kind: "actor", id: a.id }, pos: beh.targetPoint?.(w, a) ?? a.pos, bias, hostileProjectile: false });
  }
  for (const p of w.props) {
    if (!p.alive) continue;
    const vectorable = (op === "vector") && p.movable;
    const nullable = op === "null" && p.tag === "lantern";
    if (!vectorable && !nullable) continue;
    out.push({ ref: { kind: "prop", id: p.id }, pos: p.pos, bias: 1.2, hostileProjectile: false });
  }
  return out;
}

/**
 * Soft-lock selection: (1) hostile projectiles in the catch radius, (2) the aim cone (30°, 14 u),
 * (3) nearest within the proximity fallback (or within range when there is no aim input).
 */
export function selectTarget(w: World, op: OpId, mode: "tap" | "hold", aiming: boolean, aim: Vec): TargetRef | null {
  if (op === "phase" && mode === "tap") return null;
  const m = w.markov.pos;
  const cands = candidates(w, op, mode);
  if (!cands.length) return null;
  const catchable = op !== "phase";
  if (catchable) {
    let best: Cand | null = null, bd: number = INPUT.catchRadius;
    for (const c of cands) { if (!c.hostileProjectile) continue; const d = dist(c.pos, m); if (d < bd) { bd = d; best = c; } }
    if (best) return best.ref;
  }
  const autoAim = w.opts.autoAim ?? 0.5;
  const half = (INPUT.aimConeDeg / 2) * (1 + autoAim) * Math.PI / 180;
  if (aiming) {
    let best: Cand | null = null, bs = Infinity;
    for (const c of cands) {
      const d = dist(c.pos, m);
      if (d > INPUT.aimRange) continue;
      const ang = d < 0.5 ? 0 : angleBetween(sub(c.pos, m), aim);
      if (ang > half) continue;
      const s = d * (1 + (2 * ang) / half) * c.bias;
      if (s < bs) { bs = s; best = c; }
    }
    if (best) return best.ref;
  }
  const range = aiming ? INPUT.proximityFallback : INPUT.aimRange;
  let best: Cand | null = null, bs = Infinity;
  for (const c of cands) {
    const d = dist(c.pos, m);
    if (d > range) continue;
    if (d * c.bias < bs) { bs = d * c.bias; best = c; }
  }
  return best?.ref ?? null;
}
