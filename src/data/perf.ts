/** §15 performance targets. */
export const PERF = {
  frameMsP95: 16.6,
  simMs: 3,
  drawCalls: 250,
  stress: { enemies: 40, projectiles: 400, afterimages: 60 },
  heapMB: 600,
  initialLoadMs: 5000,
} as const;
