import { COLD_OPEN, TRIALS } from "../data/trials";
import { ASCENT, DESCENT_GATES, ISHTAR_ARENA } from "../data/descent";
import type { EncounterDef } from "../sim/encounter";
import { REGALIA_ORDER, type Regalia } from "../sim/types";

/** Regalia available during Trial n (ops unlock per Trial; Hubris, Step, Strike from the start). */
export function regaliaForTrial(n: number): Regalia[] {
  const ops: Regalia[] = ["vector", "phase", "order", "null"];
  return ["hubris", "step", "strike", ...ops.slice(0, Math.min(4, n))];
}

export interface Stage { def: EncounterDef; regalia: Regalia[]; trial: number; segment: "coldOpen" | "trial" | "descent" | "ishtar" | "ascent" }

/** Campaign order: cold open → 7 Trials (4 arenas + boss) → Descent (7 gates) → Ishtar → Ascent. */
export function campaignStages(): Stage[] {
  const out: Stage[] = [{ def: COLD_OPEN, regalia: COLD_OPEN.regalia!, trial: 0, segment: "coldOpen" }];
  for (const t of TRIALS) for (const d of [...t.arenas, t.bossArena]) out.push({ def: d, regalia: regaliaForTrial(t.index), trial: t.index, segment: "trial" });
  for (const g of DESCENT_GATES) out.push({ def: g, regalia: g.regalia!, trial: 8, segment: "descent" });
  out.push({ def: ISHTAR_ARENA, regalia: [], trial: 8, segment: "ishtar" });
  for (const a of ASCENT) out.push({ def: a, regalia: a.regalia ?? [...REGALIA_ORDER], trial: 9, segment: "ascent" });
  return out;
}
