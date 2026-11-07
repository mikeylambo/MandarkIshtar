/** The King — Law of Dominion. */
export const KING = {
  certainty: 400, echoCertainty: 120, radius: 1.0, speed: 1.0,
  phases: [0.6, 0.25],
  subjects: { max: 8, p1: ["axiom", "axiom", "corollary", "axiom", "corollary", "axiom"], p2: ["axiom", "corollary", "iterator", "axiom", "herald", "herald"], echo: ["axiom", "corollary", "axiom", "axiom"], refillEvery: 420 },
  command: { every: 200, telegraph: 30, speed: 7 },
  kneel: { every: 150, telegraph: 45, radius: 2.4, count: 3 },
  exploit: { crownStrip: 0.4 },
} as const;
