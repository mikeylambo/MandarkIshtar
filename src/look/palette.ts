/**
 * SLU identity: gold = Markov's ops only, blue = Laws/world/threat, purple = Null/erasure + night sky, red = break only,
 * pure white = grace (late game only). The Trials world is dark navy so ivory, gold and energy read as figure-on-ground.
 */
export const PALETTE = {
  void: 0x05060b,
  deep: 0x0b1530,
  cosmic: 0x16224a,
  stone: 0xeee6d6, // ivory architecture / armour panels
  stoneShade: 0x262c58, // navy structure (slabs, posts, terraces)
  navy: 0x1d2350,
  navyDeep: 0x121633,
  ink: 0x07080c,
  gold: 0xf2b94a,
  goldHot: 0xffd77a,
  blue: 0x4f8dff,
  blueDeep: 0x2a4fb8,
  purple: 0x8a5cff,
  red: 0xff3a3a,
  grace: 0xfff6e0,
  markovCoat: 0xf1ead9, // ivory long coat
  markovTrim: 0x14151d, // black inner suit
  markovHair: 0x0d0e16,
  markovHairTip: 0x7a4dff,
} as const;

export const THEME_ACCENT: Record<string, number> = {
  reflection: 0x7fc4ff, shadow: 0x5466b8, recurrence: 0x9bb2ff, dominion: 0x6f8cff, judgment: 0x8aa6d8,
  prophecy: 0x8a7cff, innocence: 0xe8f0ff, observatory: 0x4f8dff, descent: 0x5a62a8, dawn: 0xffe8b8,
  coldOpen: 0x4f8dff, laboratory: 0x4f8dff, ascent: 0xfff2d0, ishtar: 0xffe8b8,
};

/** Themes that keep the light stone floor: grace belongs to the end of the game. */
export const LIGHT_THEMES = new Set(["innocence", "ascent", "dawn"]);
