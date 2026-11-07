/** GDD §5 scoring. */
export const SCORING = {
  contradiction: 500,
  qed: 1000,
  redirectBounce: 150,
  enemyByEnemy: 400,
  compound: 250,
  parOps: 2000,
  noDamage: 1500,
  strikeHit: 2,
  clash: 50,
  ringOut: 1000,
  comboWindow: 180,
  comboMax: 8,
} as const;
