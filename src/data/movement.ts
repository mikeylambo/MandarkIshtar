/** GDD §7 Movement. 1 u = 1 m, frames @ 60 Hz. */
export const MOVEMENT = {
  topSpeed: 6.5,
  accelFrames: 6,
  decelFrames: 4,
  spectralSpeed: 8,
  radius: 0.4,
  height: 1.8,
  hitKnockback: 2,
  hitKnockbackFrames: 10,
  hitstunFrames: 20,
  mercyFrames: 20,
  pushThroughTheoremScale: 0.5,
  opStartupMoveScale: 0.5,
  opRecoveryMoveScale: 0.5,
  holdMoveScale: 0.3,
  strikeMoveScale: 0.2,
  phaseExitSnap: 0.6,
  voidEdgeMargin: 0.15,
} as const;

export const STEP = {
  distance: 4.5,
  frames: 9,
  iframeStart: 1,
  iframeEnd: 6,
  charges: 2,
  rechargeFrames: 45,
  stutterDistance: 1,
  afterimages: 3,
  afterimageSpacing: 3,
} as const;
