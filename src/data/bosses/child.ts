/** The Child — Law of Innocence. No Certainty; the solve is following. */
export const CHILD = {
  duration: 7200, echoDuration: 2700,
  followRadius: 3, leaveLimit: 180,
  speed: 2.2, skipEvery: 140, skipPause: 30,
  opPause: 120,
  holdStart: 14, holdEnd: 5.5, holdShrinkFrames: 3600,
  aggroFrames: 300,
  path: [[0, 2], [5, 6], [9, 1], [6, -6], [0, -9], [-6, -6], [-9, 0], [-5, 6], [0, 9], [5, 5], [3, -2], [-3, -3], [-6, 3], [0, 4]] as [number, number][],
} as const;
