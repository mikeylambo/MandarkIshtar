/** Resources module: Focus, Hubris, Seals, Step, Insight. */
export const FOCUS = {
  max: 100,
  cost: { vector: 20, phase: 25, order: 30, null: 35 } as Record<"vector" | "phase" | "order" | "null", number>,
  phaseHeldPerSecond: 15,
  regenPerSecond: 30,
  regenDelayFrames: 30,
  strikeHitGain: 6,
  contradictionGain: 20,
  compoundCostScale: 0.8,
} as const;

export const HUBRIS = {
  max: 100,
  taunt: 25,
  qed: 5,
  redirectChain: 5,
  redirectChainMin: 3,
  hitLoss: 30,
  decayPerSecond: 2,
  decayDelayFrames: 600,
  tierThresholds: [50, 100],
  multiplierMax: 2,
} as const;

export const SEALS = { arenaClearRestore: 1 } as const;

export const STILLNESS = {
  idleFrames: 60,
  insightFrames: 180,
  insightTimeScale: 0.7,
  cooldownFrames: 300,
} as const;
