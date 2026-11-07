import type { LawId } from "../sim/types";

/** Laws (rules, tiers). Player-facing copy: Law name + one rule line only. */
export interface LawDef { id: LawId; name: string; rule: string; motif: number[]; tierNotes: string[] }
export const LAWS: Record<LawId, LawDef> = {
  reflection: { id: "reflection", name: "Law of Reflection", rule: "Every attack returns to its origin.", motif: [0, 4, 7, 11], tierNotes: ["walls return shots to their origin", "returned shots +25% speed", "returned shots +50% speed, two returns"] },
  shadow: { id: "shadow", name: "Law of Shadow", rule: "Only shadows are real.", motif: [0, 3, 7, 10], tierNotes: ["shadowed Theorems are hit only through their shadows", "shadows lengthen", "shadows lengthen further"] },
  recurrence: { id: "recurrence", name: "Law of Recurrence", rule: "Everything happens twice.", motif: [0, 5, 7, 2], tierNotes: ["enemy attacks repeat 60f later", "repeat after 45f", "repeat after 40f"] },
  dominion: { id: "dominion", name: "Law of Dominion", rule: "The strong command the weak.", motif: [0, 7, 3, 8], tierNotes: ["commanded Theorems are shielded", "commanders link more subjects", "commanders link more subjects"] },
  judgment: { id: "judgment", name: "Law of Judgment", rule: "Repetition is punished.", motif: [0, 2, 3, 6], tierNotes: ["same op twice within 300f → Sentence", "window 360f", "window 420f, wider Sentence"] },
  prophecy: { id: "prophecy", name: "Law of Prophecy", rule: "The future is fixed.", motif: [0, 7, 2, 9], tierNotes: ["shots lead you", "shots lead further", "shots lead further"] },
  innocence: { id: "innocence", name: "Law of Innocence", rule: "The measured cannot enter.", motif: [0, 4, 9, 7], tierNotes: ["ops ×0.5", "ops ×0.45", "ops ×0.4"] },
  ishtar: { id: "ishtar", name: "Law of the Morning Star", rule: "Be still.", motif: [0, 1, 5, 8], tierNotes: [] },
};

export const LAW_TUNING = {
  reflection: { speedPerTier: 0.25, returnsByTier: [1, 1, 2] },
  shadow: { length: 1.8, lengthPerTier: 0.6 },
  recurrence: { delayByTier: [60, 45, 40] },
  judgment: { windowByTier: [300, 360, 420], telegraph: 40, radius: 2.1, radiusPerTier: 0.3 },
  prophecy: { leadBase: 0.35, leadPerTier: 0.15 },
  innocence: { scaleByTier: [0.5, 0.45, 0.4] },
  miniLaws: ["haste", "ward", "echo"] as const,
  hasteScale: 1.3,
} as const;
