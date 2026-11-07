import { MIRROR as M } from "../../data/bosses/mirror";
import type { Behavior } from "../Behavior";
import type { World } from "../../sim/World";
import type { Actor, Projectile } from "../../sim/entities";
import { applyStartPhase, bossPhase, fileRemaining } from "./bossCommon";
import { mirrorX, norm, rotate, scale } from "../../sim/math";
import type { OpId } from "../../sim/types";

function deliveringOp(p: Projectile): OpId | "compound" | null {
  if (p.compound) return "compound";
  if (p.reversed) return "order";
  if (p.redirected) return "vector";
  return null;
}

/** An inverted Markov. Performs your previous action 45f later, mirrored across the center line.
 *  Exploit: its copy Vectored into it (15%) or Order-Reversed into it (20%). P3: immune to ops used in the last 10 s. */
export const mirror: Behavior = {
  stats: (w) => ({ certainty: w.def.echo ? M.echoCertainty : M.certainty, radius: M.radius, boss: true, armored: true }),
  init(w, a) { a.d.cursor = 0; a.d.lastV = -9999; a.d.lastO = -9999; a.d.lastC = -9999; applyStartPhase(w, a, M.phases); },
  update(w, a, _dt) {
    const phase = bossPhase(w, a, M.phases);
    const m = w.markov;
    // position: mirror of where Markov stood 45f ago
    const hist = w.flags;
    void hist;
    const past = a.d.px !== undefined ? { x: a.d.px, z: a.d.pz } : mirrorX(m.pos);
    a.pos = { x: past.x, z: past.z };
    a.d.trail = (a.d.trail ?? 0) + 1;
    pushPast(a, m.pos);
    const cutoff = w.frame - M.delay;
    for (const r of m.actionLog) {
      if (r.frame <= (a.d.lastCopied ?? -1) || r.frame > cutoff) continue;
      a.d.lastCopied = r.frame;
      copy(w, a, r.kind, r.op, mirrorX(r.pos), mirrorX(r.aim), phase);
    }
    if (a.spectral && (a.d.specT ?? 0) <= w.frame) a.spectral = false;
  },
  onProjectile(w, a, p) {
    if (p.shooterId !== a.id) { w.emit("OpFizzle", { kind: "absorbed", x: a.pos.x, z: a.pos.z }); return "handled"; }
    const via = deliveringOp(p);
    if (!via) return "pass";
    if (w.director.bossPhase >= 3 && !w.def.echo && neglected(w, a, via) === false) { w.emit("OpFizzle", { kind: "absorbed", x: a.pos.x, z: a.pos.z }); return "handled"; }
    const frac = via === "order" ? M.exploit.copyReversed : via === "compound" ? M.exploit.compound : M.exploit.copyRedirected;
    w.ledger.exploit(w, a, frac, { kind: "exploit", byEnemy: true, label: `mirror-${via}` });
    return "handled";
  },
  onStrike(w, a) { w.emit("OpFizzle", { kind: "absorbed", x: a.pos.x, z: a.pos.z }); return "handled"; },
  onOp(w, a) { w.emit("OpFizzle", { kind: "absorbed", x: a.pos.x, z: a.pos.z }); return "handled"; },
  onHitByBody() { return "handled"; },
  onRemoved(w, a) { fileRemaining(w, a); },
};

/** Track Markov's position history inside the actor scratch (45f ring). */
function pushPast(a: Actor, p: { x: number; z: number }): void {
  const n = M.delay;
  const i = (a.d.ring ?? 0) % n;
  a.d[`hx${i}`] = p.x; a.d[`hz${i}`] = p.z;
  a.d.ring = (a.d.ring ?? 0) + 1;
  if (a.d.ring >= n) { const j = a.d.ring % n; a.d.px = -(a.d[`hx${j}`] ?? 0); a.d.pz = a.d[`hz${j}`] ?? 0; }
}

/** P3: the delivering op must not have been used within the previous 10 s (before its latest use). */
function neglected(w: World, _a: Actor, via: OpId | "compound"): boolean {
  const uses = via === "compound" ? w.ops.compoundFrames : w.ops.useFrames[via];
  if (uses.length < 2) return true;
  return uses[uses.length - 1]! - uses[uses.length - 2]! > M.p3NeglectFrames;
}

function copy(w: World, a: Actor, kind: string, op: OpId | undefined, pos: { x: number; z: number }, aim: { x: number; z: number }, phase: number): void {
  w.emit("Copy", { id: a.id, kind, op: op ?? kind, x: pos.x, z: pos.z, dx: aim.x, dz: aim.z });
  if (kind === "op" || kind === "compound") {
    if (op === "phase" && kind === "op") { a.spectral = true; a.d.specT = w.frame + 60; return; }
    const dirs = phase >= 2 && !w.def.echo ? [-0.18, 0.18] : [0];
    for (const r of dirs) {
      const d = norm(rotate(aim, r));
      w.spawnProjectile({ pos: { x: a.pos.x + d.x * 0.8, z: a.pos.z + d.z * 0.8 }, vel: scale(d, M.copySpeed), owner: "enemy", shooterId: a.id, shape: "echo", radius: 0.4, life: 240 });
    }
  } else if (kind === "strike") {
    w.spawnHazard({ kind: "mirrorStrike", pos: { x: pos.x + aim.x * 1, z: pos.z + aim.z * 1 }, radius: M.strikeRadius, telegraph: 30, active: 6, ownerId: a.id });
  }
}
