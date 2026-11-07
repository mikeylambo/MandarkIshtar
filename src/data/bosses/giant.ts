/** The Giant — Law of Shadow. Body invulnerable; the shadow holds Certainty. */
export const GIANT = {
  shadowCertainty: 350, echoCertainty: 30, radius: 1.8, shadowRadius: 1.7, speed: 1.1,
  phases: [0.6, 0.25],
  shadowLength: 3.2,
  stomp: { every: 210, telegraph: 40, radius: 3, reach: 5 },
  clap: { every: 320, telegraph: 45, maxRadius: 12, grow: 0.13 },
  exploit: { delayStompOnHazard: 0.2, severance: 0.1 },
} as const;
