import { DeterministicRng, scheduledSeed } from "@slu/web-shell";
import { MODE_TUNING, type ModeId } from "../data/modes";
import { THEOREM_CHALLENGES, type TheoremChallenge } from "../data/theorems";
import { LABORATORY, TRIALS, allArenas, encounterById } from "../data/trials";
import type { EncounterDef } from "../sim/encounter";
import type { WorldOptions } from "../sim/World";
import { REGALIA_ORDER, type LawId, type Regalia } from "../sim/types";
import { regaliaForTrial } from "../campaign/sequence";

/** One stage of an arcade run: an encounter plus the options it is played with. */
export interface ModeStage { def: EncounterDef; opts: Partial<WorldOptions>; regalia: Regalia[] }
export interface ModePlan { mode: ModeId; label: string; stages: ModeStage[]; carrySeals: boolean; sealBonus: number; endOnLoss: boolean; seed: number }

const ALL: Regalia[] = [...REGALIA_ORDER];

/** Time Attack: clear one Trial fastest (flourish shortened to 15f). */
export function timeAttack(trial: number): ModePlan {
  const t = TRIALS[trial - 1]!;
  return { mode: "timeAttack", label: `Trial ${trial}`, carrySeals: true, sealBonus: 0, endOnLoss: true, seed: 1000 + trial,
    stages: [...t.arenas, t.bossArena].map((def) => ({ def, regalia: regaliaForTrial(trial), opts: { flourishFrames: 15, skipIntro: true } })) };
}

/** Score Attack: 10 seeded arenas, 1–2 random Law modifiers each; Seals carry; ends at 0 Seals. */
export function scoreAttack(seed: number): ModePlan {
  const rng = new DeterministicRng(seed);
  const pool = allArenas().filter((d) => d.kind === "arena");
  const stages: ModeStage[] = [];
  for (let i = 0; i < MODE_TUNING.scoreAttackArenas; i++) {
    const def = rng.pick(pool);
    const mods = new Set<LawId>();
    const n = rng.int(1, 2);
    while (mods.size < n) mods.add(rng.pick(MODE_TUNING.scoreAttackModifiers) as LawId);
    stages.push({ def, regalia: ALL, opts: { lawModifiers: [...mods] } });
  }
  return { mode: "scoreAttack", label: `Seed ${seed}`, stages, carrySeals: true, sealBonus: 0, endOnLoss: true, seed };
}

export function dailyScoreAttack(date = new Date()): ModePlan {
  const s = scheduledSeed("mandark-ishtar", "daily", date);
  const plan = scoreAttack(s.seed);
  plan.label = `Daily ${s.key}`;
  return plan;
}

/** Boss Rush: all 7 bosses; Seals carry (+2 between bosses). */
export function bossRush(): ModePlan {
  return { mode: "bossRush", label: "Boss Rush", carrySeals: true, sealBonus: MODE_TUNING.bossRushSealBonus, endOnLoss: true, seed: 77,
    stages: TRIALS.map((t) => ({ def: t.bossArena, regalia: ALL, opts: {} })) };
}

/** Theorems: solve a room under a constraint. */
export function theorem(id: string): ModePlan {
  const c = THEOREM_CHALLENGES.find((x) => x.id === id) as TheoremChallenge;
  const def = encounterById(c.arena)!;
  return { mode: "theorems", label: `${c.id} ${c.label}`, carrySeals: false, sealBonus: 0, endOnLoss: true, seed: 500,
    stages: [{ def, regalia: regaliaForTrial(c.trial), opts: { constraint: c.constraint } }] };
}

/** Laboratory: practice room; infinite Focus toggle, spawn anything through the dev hooks. */
export function laboratory(infiniteFocus = true): ModePlan {
  return { mode: "laboratory", label: "Laboratory", carrySeals: false, sealBonus: 0, endOnLoss: false, seed: 9, stages: [{ def: LABORATORY, regalia: ALL, opts: { infiniteFocus, skipIntro: true } }] };
}
