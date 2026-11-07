/** Combat Model frame data (Markov). */
export interface OpFrames { startup: number; active: number; recovery: number }
export const FRAMES = {
  strike: [
    { startup: 5, active: 3, recovery: 10 },
    { startup: 5, active: 3, recovery: 10 },
    { startup: 7, active: 4, recovery: 16 },
  ] as OpFrames[],
  strikeChainWindow: 14,
  strikeRange: 1.7,
  strikeArcDeg: 110,
  vectorTap: { startup: 6, active: 1, recovery: 10 },
  vectorHold: { startup: 20, active: 180, recovery: 8 },
  phaseSelf: { startup: 4, active: 60, recovery: 6 },
  phaseTarget: { startup: 20, active: 120, recovery: 10 },
  orderDelay: { startup: 8, active: 120, recovery: 10 },
  orderReverse: { startup: 20, active: 90, recovery: 12 },
  nullCancel: { startup: 10, active: 1, recovery: 12 },
  nullStrip: { startup: 20, active: 180, recovery: 14 },
  qed: { startup: 0, active: 12, recovery: 14, stepCancelAfter: 6, range: 3 },
  taunt: { frames: 40, stepCancelAfter: 20 },
  shatterStagger: 45,
} as const;
