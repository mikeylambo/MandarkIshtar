/** The Judge — Law of Judgment. */
export const JUDGE = {
  certainty: 400, echoCertainty: 60, radius: 1.1,
  phases: [0.6, 0.2],
  bellEvery: 600,
  gavel: { every: 210, telegraph: 40, radius: 2.2 },
  scales: { every: 330, telegraph: 45, width: 0.6, length: 14 },
  exploit: { threeOps: 0.15, threeCompounds: 0.3, echoVaried: 0.12 },
  ledgerWindow: 300,
} as const;
