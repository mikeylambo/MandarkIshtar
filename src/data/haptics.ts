import type { HapticCatalog } from "@slu/web-shell";

/** Haptics module. weak/strong are 0..1 magnitudes; mobile is a vibrate() pattern. */
export const HAPTICS: HapticCatalog = {
  vector: { mobile: 60, duration: 60, weak: 0.4, strong: 0.2 },
  contradiction: { mobile: 120, duration: 120, weak: 0.6, strong: 1 },
  qed: { mobile: [80, 20, 100], duration: 200, weak: 0.7, strong: 1 },
  step: { mobile: 30, duration: 30, weak: 0.25, strong: 0 },
  sealLost: { mobile: [70, 40, 70], duration: 150, weak: 0.8, strong: 0.8 },
  hubrisShatter: { mobile: [80, 30, 80, 30, 80], duration: 300, weak: 1, strong: 1 },
  gate: { mobile: [300, 50, 150], duration: 500, weak: 0.6, strong: 0.3 },
  dawn: { mobile: [200, 100, 100], duration: 2000, weak: 0.3, strong: 0 },
};
