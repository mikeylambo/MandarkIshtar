import type { World } from "../../sim/World";
import type { Actor } from "../../sim/entities";

/** Phase from Certainty fraction; monotonic via the director (phase checkpoints refill Seals). */
export function bossPhase(w: World, a: Actor, thresholds: readonly number[]): number {
  if (w.def.echo) return 1;
  const f = a.certainty / a.maxCertainty;
  const p = f > thresholds[0]! ? 1 : f > thresholds[1]! ? 2 : 3;
  w.director.setBossPhase(p);
  return w.director.bossPhase;
}

/** Retry-from-checkpoint assist: start at a later phase. */
export function applyStartPhase(w: World, a: Actor, thresholds: readonly number[]): void {
  const sp = w.opts.startPhase ?? 1;
  if (sp <= 1 || w.def.echo) return;
  const f = sp === 2 ? thresholds[0]! : thresholds[1]!;
  w.ledger.setCheckpoint(w, a, f);
  w.director.setBossPhase(sp);
}

/** When the boss is filed, every remaining Theorem it brought is filed with it. */
export function fileRemaining(w: World, boss: Actor): void {
  for (const o of w.actors) if (o !== boss && o.alive && !o.neutral) w.ledger.remove(w, o, "filed");
}
