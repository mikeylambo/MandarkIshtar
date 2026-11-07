import type { TheoremType } from "../sim/types";

/** Theorems table (GDD Enemies & Bosses). Speeds u/s, frames @60. */
export interface TheoremDef { type: TheoremType; name: string; shape: string; certainty: number; speed: number; radius: number; exploit: number; teaches: string }
export const THEOREMS: Record<TheoremType, TheoremDef> = {
  axiom: { type: "axiom", name: "Axiom", shape: "tetrahedron", certainty: 30, speed: 7, radius: 0.55, exploit: 1, teaches: "vector" },
  corollary: { type: "corollary", name: "Corollary", shape: "octahedron", certainty: 40, speed: 3, radius: 0.6, exploit: 1, teaches: "positioning" },
  variable: { type: "variable", name: "Variable", shape: "cube", certainty: 35, speed: 4, radius: 0.55, exploit: 1, teaches: "phase" },
  constant: { type: "constant", name: "Constant", shape: "dodecahedron", certainty: 80, speed: 0, radius: 0.95, exploit: 1, teaches: "null" },
  iterator: { type: "iterator", name: "Iterator", shape: "torus", certainty: 45, speed: 2.5, radius: 0.65, exploit: 1, teaches: "order" },
  paradox: { type: "paradox", name: "Paradox", shape: "icosahedron", certainty: 50, speed: 3, radius: 0.5, exploit: 1, teaches: "compounds" },
  oracle: { type: "oracle", name: "Oracle", shape: "sphere", certainty: 40, speed: 3, radius: 0.6, exploit: 1, teaches: "stillness" },
  herald: { type: "herald", name: "Herald", shape: "banner", certainty: 60, speed: 2, radius: 0.6, exploit: 1, teaches: "priority" },
};

export const THEOREM_TUNING = {
  axiom: { approachSpeed: 2.6, engageRange: 9, telegraph: 30, chargeDistance: 12, recover: 50 },
  corollary: { range: 6.5, telegraph: 30, shotSpeed: 6.5, recover: 100, splitTelegraph: 14 },
  variable: { swap: 180, shotEvery: 60, shotSpeed: 6.5, range: 6 },
  constant: { pulseEvery: 240, telegraph: 40, radius: 5, growFrames: 20 },
  iterator: { range: 8, every: 150, telegraph: 30, spreadDeg: 20, shotSpeed: 7, shotGap: 0 },
  paradox: { range: 6, linkEvery: 220, linkTelegraph: 40, linkActive: 30, shotEvery: 160, shotSpeed: 6, healWindow: 30 },
  oracle: { range: 8, every: 130, telegraph: 30, lead: 0.6, shotSpeed: 8.5 },
  herald: { range: 7, buffRadius: 6, buffEvery: 60, declareEvery: 600, declareFirst: 240, declareFrames: 45, miniLawFrames: 300 },
} as const;
