/** Combat Model damage table (Certainty). LOCKED: Strike = 2. */
export const CERTAINTY = {
  strike: 2,
  nonExploitOp: 6,
  redirected: 25,
  /** Redirected shot into the Giant's shadow (bosses otherwise take the non-exploit 6). */
  bossShadowRedirect: 12,
  compoundBonus: 1.5,
  brokenFrames: 120,
  recoverFraction: 0.4,
  wallImpactSpeed: 12,
  wallImpactDamage: 6,
  wallImpactStun: 6,
  heraldBuffScale: 1.5,
  heraldShieldScale: 0.5,
  eliteScale: 2,
  clashScore: 50,
  orbitContactCooldown: 24,
} as const;
