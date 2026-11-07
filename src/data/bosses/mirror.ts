/** The Mirror — Law of Recurrence. Performs your previous action 45f later, mirrored. */
export const MIRROR = {
  certainty: 300, echoCertainty: 100, radius: 0.55,
  phases: [0.6, 0.25],
  delay: 45,
  copySpeed: 11,
  strikeRadius: 1.9,
  exploit: { copyRedirected: 0.15, copyReversed: 0.2, compound: 0.15 },
  p3NeglectFrames: 600,
} as const;
