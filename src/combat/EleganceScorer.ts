import { RankingSystem } from "@slu/web-shell";
import { HUBRIS } from "../data/resources";
import { RANK_BANDS, type RankId } from "../data/ranks";
import { SCORING } from "../data/scoring";
import type { World } from "../sim/World";
import type { OpId } from "../sim/types";

export interface ScoreEvent { frame: number; kind: string; points: number; mult: number }
export interface ArenaResult { score: number; rank: RankId; pct: number; ops: number; parOps: number; parScore: number; noDamage: boolean; frames: number; breakdown: Record<string, number>; constraintOk: boolean }

const ranking = new RankingSystem(RANK_BANDS);

/** Owns score, combo, ops count and rank. Score always reconciles with its event log. */
export class EleganceScorer {
  score = 0;
  combo = 0;
  private comboUntil = -1;
  readonly log: ScoreEvent[] = [];
  ops = 0;
  tookDamage = false;
  readonly opsByType: Record<OpId, number> = { vector: 0, phase: 0, order: 0, null: 0 };
  steps = 0;
  strikeDamageHits = 0;
  constraintViolations: string[] = [];
  finalized: ArenaResult | null = null;

  constructor(private readonly w: World) {}

  get multiplier(): number { return Math.min(HUBRIS.multiplierMax, 1 + this.w.markov.hubris / 100); }

  add(kind: string, points: number): void {
    const mult = this.multiplier;
    this.score += points * mult;
    this.log.push({ frame: this.w.frame, kind, points, mult });
    if (kind === "strike") this.strikeDamageHits++;
  }

  contradiction(): void {
    const f = this.w.frame;
    this.combo = f <= this.comboUntil ? Math.min(SCORING.comboMax, this.combo + 1) : 1;
    this.comboUntil = f + SCORING.comboWindow;
    this.add("contradiction", SCORING.contradiction * this.combo);
  }

  onOp(op: OpId): void { this.ops++; this.opsByType[op]++; }
  onDamageTaken(): void { this.tookDamage = true; }

  reconcile(): boolean {
    let s = 0;
    for (const e of this.log) s += e.points * e.mult;
    return Math.abs(s - this.score) < 1e-6;
  }

  finalize(): ArenaResult {
    if (this.finalized) return this.finalized;
    const par = this.w.def.par;
    if (this.ops <= par.ops) this.add("parOps", SCORING.parOps);
    if (!this.tookDamage) this.add("noDamage", SCORING.noDamage);
    const pct = par.score > 0 ? (this.score / par.score) * 100 : 100;
    let rank = ranking.evaluate(pct).rank.id as RankId;
    if (rank === "qed" && this.ops > par.ops) rank = "proof";
    const breakdown: Record<string, number> = {};
    for (const e of this.log) breakdown[e.kind] = (breakdown[e.kind] ?? 0) + e.points * e.mult;
    const c = this.w.opts.constraint;
    if (c) {
      const ok = c.kind === "maxOps" ? this.ops <= c.n : c.kind === "noStep" ? this.w.markov.steps === 0 : c.kind === "finishersOnly" ? this.strikeDamageHits === 0 : this.w.ledger.selfBreaks === 0;
      if (!ok) this.constraintViolations.push(c.kind);
    }
    this.finalized = { score: Math.round(this.score), rank, pct, ops: this.ops, parOps: par.ops, parScore: par.score, noDamage: !this.tookDamage, frames: this.w.frame, breakdown, constraintOk: this.constraintViolations.length === 0 };
    return this.finalized;
  }
}
