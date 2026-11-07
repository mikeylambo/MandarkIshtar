/** Modes module. */
export type ModeId = "campaign" | "timeAttack" | "scoreAttack" | "bossRush" | "theorems" | "laboratory";
export interface ModeDef { id: ModeId; name: string; unlock: "start" | "trialClear" | "campaign" }
export const MODES: Record<ModeId, ModeDef> = {
  campaign: { id: "campaign", name: "Campaign", unlock: "start" },
  timeAttack: { id: "timeAttack", name: "Time Attack", unlock: "trialClear" },
  scoreAttack: { id: "scoreAttack", name: "Score Attack", unlock: "campaign" },
  bossRush: { id: "bossRush", name: "Boss Rush", unlock: "campaign" },
  theorems: { id: "theorems", name: "Theorems", unlock: "trialClear" },
  laboratory: { id: "laboratory", name: "Laboratory", unlock: "campaign" },
};
export const MODE_TUNING = {
  timeAttackFlourish: 15,
  scoreAttackArenas: 10,
  scoreAttackModifiers: ["reflection", "recurrence", "judgment", "prophecy", "innocence"],
  bossRushSealBonus: 2,
} as const;
