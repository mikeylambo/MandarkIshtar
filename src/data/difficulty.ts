export type DifficultyId = "scholar" | "savant" | "paragon";
export interface DifficultyDef { id: DifficultyId; name: string; seals: number; telegraphScale: number; attackTokens: number; baseLawTier: number; prophetMaxOrder: number }
export const DIFFICULTIES: Record<DifficultyId, DifficultyDef> = {
  scholar: { id: "scholar", name: "Scholar", seals: 8, telegraphScale: 1.25, attackTokens: 2, baseLawTier: 0, prophetMaxOrder: 2 },
  savant: { id: "savant", name: "Savant", seals: 6, telegraphScale: 1.0, attackTokens: 3, baseLawTier: 0, prophetMaxOrder: 3 },
  paragon: { id: "paragon", name: "Paragon", seals: 4, telegraphScale: 0.9, attackTokens: 4, baseLawTier: 1, prophetMaxOrder: 3 },
};
