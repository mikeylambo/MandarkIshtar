import type { RankBand } from "@slu/web-shell";

/** Elegance rank ladder (score ÷ par score, %). Q.E.D. additionally requires ≤ par ops. */
export const RANK_BANDS: RankBand[] = [
  { id: "conjecture", label: "Conjecture", minimum: 0 },
  { id: "hypothesis", label: "Hypothesis", minimum: 40 },
  { id: "theorem", label: "Theorem", minimum: 65 },
  { id: "proof", label: "Proof", minimum: 85 },
  { id: "qed", label: "Q.E.D.", minimum: 100 },
];
export type RankId = "conjecture" | "hypothesis" | "theorem" | "proof" | "qed";
export const RANK_ORDER: RankId[] = ["conjecture", "hypothesis", "theorem", "proof", "qed"];
export const RANK_GLYPH: Record<RankId, string> = { conjecture: "C", hypothesis: "H", theorem: "T", proof: "P", qed: "∎" };
