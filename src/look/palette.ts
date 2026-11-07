/** SLU identity: gold = Markov's ops only, blue = Laws/world/threat, red = break only, white = grace (late game only). */
export const PALETTE = {
  void: 0x05060b,
  deep: 0x0b1530,
  cosmic: 0x16224a,
  stone: 0xe9e6dc,
  stoneShade: 0xb9b6ae,
  ink: 0x07080c,
  gold: 0xf2b94a,
  goldHot: 0xffd77a,
  blue: 0x4f8dff,
  blueDeep: 0x2a4fb8,
  red: 0xff3a3a,
  grace: 0xfff6e0,
  markovCoat: 0x101218,
  markovTrim: 0xf2f0ea,
} as const;

export const THEME_ACCENT: Record<string, number> = {
  reflection: 0x7fc4ff, shadow: 0x384a8a, recurrence: 0x9bb2ff, dominion: 0x5f7fe0, judgment: 0x8aa6d8,
  prophecy: 0x6b74ff, innocence: 0xe8f0ff, observatory: 0x4f8dff, descent: 0x26346a, dawn: 0xffe8b8,
  coldOpen: 0x4f8dff, laboratory: 0x4f8dff, ascent: 0xfff2d0, ishtar: 0xffe8b8,
};
