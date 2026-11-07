/** The Flame — Law of Reflection. */
export const FLAME = {
  certainty: 300, echoCertainty: 120, radius: 1.3, speed: 0.8,
  phases: [0.6, 0.25],
  volley: { every: 150, telegraph: 30, count: 3, spreadDeg: 16, speed: 6.2 },
  embers: { every: 600, max: 3 },
  wave: { every: 380, telegraph: 45, radius: 11, grow: 0.22 },
  pillars: { count: 2, orbit: 6.5, radius: 1.1, angularSpeed: 0.55, telegraph: 45 },
  exploit: { base: 0.12, perPrism: 0.06, minPrisms: [1, 1, 3] },
  growthPerHit: 0.1, growthMax: 1,
} as const;
