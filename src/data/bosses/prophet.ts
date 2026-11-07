/** The Prophet — Law of Prophecy. Literally a Markov chain over the player's action states. */
export const PROPHET = {
  certainty: 400, echoCertainty: 90, radius: 1.0, speed: 1.2,
  phases: [0.6, 0.25],
  window: 30,
  stallWindows: 2,
  ringTelegraph: 30, ringRadius: 1.5, ringReach: 3.2,
  volley: { every: 130, count: 5, spreadDeg: 14, speed: 6 },
  exploit: { surprise: 0.15, surpriseBelow: 0.15, stillness: 0.3 },
} as const;
