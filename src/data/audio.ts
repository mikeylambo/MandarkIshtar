/**
 * Audio data: SFX recipes (synthesized WebAudio placeholders behind manifest keys) and music cues.
 * Identity: Markov's ops = crisp/glassy/clockwork; enemies = low/choral/stone; breaks = glass + choir; Null = silence.
 */
export type Wave = "sine" | "square" | "sawtooth" | "triangle" | "noise";
export type SfxCategory = "threat" | "markov" | "enemy" | "ambience" | "ui" | "break";
export interface SfxLayer { wave: Wave; f0: number; f1?: number; dur: number; gain: number; attack?: number; q?: number; filter?: number; delay?: number }
export interface SfxDef { key: string; cat: SfxCategory; layers: SfxLayer[]; description: string }

const S = (key: string, cat: SfxCategory, description: string, ...layers: SfxLayer[]): SfxDef => ({ key, cat, layers, description });

export const SFX_BANK: SfxDef[] = [
  S("op.cast", "markov", "Fingertip glyph spark: glassy tick", { wave: "triangle", f0: 2400, f1: 1800, dur: 0.05, gain: 0.25 }),
  S("op.vector", "markov", "Click + rising tone", { wave: "square", f0: 1800, dur: 0.02, gain: 0.25, filter: 4000 }, { wave: "sine", f0: 600, f1: 1400, dur: 0.18, gain: 0.3 }),
  S("op.orbit", "markov", "Tether set: clockwork ratchet", { wave: "square", f0: 900, dur: 0.03, gain: 0.2, filter: 3000 }, { wave: "square", f0: 900, dur: 0.03, gain: 0.18, filter: 3000, delay: 0.05 }),
  S("op.orbitChime", "markov", "Metallic chime per orbit contact", { wave: "sine", f0: 2093, dur: 0.4, gain: 0.25 }, { wave: "sine", f0: 3140, dur: 0.25, gain: 0.12 }),
  S("op.phaseIn", "markov", "Reversed cymbal whoosh-in", { wave: "noise", f0: 3000, f1: 9000, dur: 0.28, gain: 0.25, attack: 0.25, filter: 8000 }),
  S("op.phaseOut", "markov", "Re-solidify chime", { wave: "sine", f0: 1568, dur: 0.25, gain: 0.25 }),
  S("op.delay", "markov", "Clock-stamp: wood block + pitch drop", { wave: "triangle", f0: 900, f1: 300, dur: 0.22, gain: 0.3 }),
  S("op.reverse", "markov", "Tape-rewind whirr", { wave: "sawtooth", f0: 200, f1: 1600, dur: 0.6, gain: 0.18, filter: 2500 }),
  S("op.null", "markov", "Silence used as a sound: soft 'tk' after a 6f hole", { wave: "triangle", f0: 1200, dur: 0.03, gain: 0.2, delay: 0.1 }),
  S("op.strip", "markov", "Property peel: glass flake shatter", { wave: "noise", f0: 6000, dur: 0.18, gain: 0.25, filter: 9000 }, { wave: "sine", f0: 2600, f1: 1900, dur: 0.15, gain: 0.15 }),
  S("op.compound", "markov", "Two-note glass fusion", { wave: "sine", f0: 1318, dur: 0.25, gain: 0.25 }, { wave: "sine", f0: 1976, dur: 0.3, gain: 0.2, delay: 0.06 }),
  S("op.echo", "markov", "Afterimage echo: delayed tick", { wave: "triangle", f0: 1700, dur: 0.06, gain: 0.15 }),
  S("op.clash", "markov", "Clash: two glass taps", { wave: "sine", f0: 2400, dur: 0.08, gain: 0.2 }, { wave: "sine", f0: 2800, dur: 0.08, gain: 0.15, delay: 0.03 }),
  S("op.fizzle", "markov", "Dry tick; the glyph fizzles grey", { wave: "noise", f0: 1200, dur: 0.05, gain: 0.15, filter: 1500 }),
  S("step.fsst", "markov", "Air-cut 'fsst'", { wave: "noise", f0: 5000, f1: 2000, dur: 0.12, gain: 0.25, filter: 7000 }),
  S("step.thud", "markov", "Out of charges: dull thud", { wave: "sine", f0: 120, f1: 70, dur: 0.12, gain: 0.35 }),
  S("strike.swing", "markov", "Contemptuous hand-pulse", { wave: "noise", f0: 2500, dur: 0.05, gain: 0.08, filter: 3000 }),
  S("strike.tik", "markov", "Small gold pulse 'tik'", { wave: "triangle", f0: 3000, dur: 0.03, gain: 0.18 }),
  S("hubris.choir", "markov", "Cackle choir swell", { wave: "sawtooth", f0: 220, f1: 330, dur: 0.7, gain: 0.12, filter: 1600, attack: 0.2 }, { wave: "sawtooth", f0: 277, f1: 415, dur: 0.7, gain: 0.1, filter: 1600, attack: 0.2 }),
  S("hubris.shatter", "break", "Meter shatters like glass", { wave: "noise", f0: 7000, dur: 0.6, gain: 0.4, filter: 10000 }, { wave: "sine", f0: 300, f1: 60, dur: 0.6, gain: 0.3 }),
  S("markov.hit", "threat", "Seal cracks out", { wave: "noise", f0: 1500, dur: 0.2, gain: 0.35, filter: 2500 }, { wave: "sine", f0: 180, f1: 90, dur: 0.25, gain: 0.35 }),
  S("break.contradiction", "break", "Low choir stab + glass crack", { wave: "sawtooth", f0: 110, dur: 0.8, gain: 0.25, filter: 900, attack: 0.01 }, { wave: "sawtooth", f0: 165, dur: 0.8, gain: 0.2, filter: 900 }, { wave: "noise", f0: 8000, dur: 0.35, gain: 0.35, filter: 12000 }),
  S("break.broken", "break", "Certainty gives: hollow knock", { wave: "triangle", f0: 220, f1: 110, dur: 0.3, gain: 0.25 }),
  S("break.qed", "break", "Finger snap + resolving gold fold", { wave: "noise", f0: 4000, dur: 0.04, gain: 0.4, filter: 6000 }, { wave: "sine", f0: 784, dur: 0.6, gain: 0.25, delay: 0.05 }, { wave: "sine", f0: 1046, dur: 0.7, gain: 0.2, delay: 0.1 }),
  S("break.plink", "break", "Missed finisher: mocking plink", { wave: "sine", f0: 1760, f1: 1400, dur: 0.12, gain: 0.2 }),
  S("ui.flourish", "ui", "Room clear inversion pulse", { wave: "sine", f0: 523, dur: 0.5, gain: 0.2 }, { wave: "sine", f0: 784, dur: 0.6, gain: 0.15, delay: 0.08 }),
  S("ui.click.dull", "ui", "Lost regalia: dull click, no effect", { wave: "triangle", f0: 180, dur: 0.05, gain: 0.25 }),
  S("ui.move", "ui", "Menu move", { wave: "triangle", f0: 1400, dur: 0.03, gain: 0.12 }),
  S("ui.confirm", "ui", "Menu confirm", { wave: "sine", f0: 880, dur: 0.12, gain: 0.18 }, { wave: "sine", f0: 1320, dur: 0.12, gain: 0.12, delay: 0.05 }),
  S("ui.back", "ui", "Menu back", { wave: "sine", f0: 660, f1: 440, dur: 0.12, gain: 0.15 }),
  S("insight.start", "markov", "Ah. I see. Glass bloom", { wave: "sine", f0: 1046, dur: 1.2, gain: 0.18, attack: 0.4 }, { wave: "sine", f0: 1568, dur: 1.2, gain: 0.12, attack: 0.5 }),
  S("law.slam", "threat", "Law card slam: stone + choir", { wave: "sine", f0: 70, f1: 40, dur: 0.6, gain: 0.5 }, { wave: "sawtooth", f0: 147, dur: 1.0, gain: 0.15, filter: 700, attack: 0.05 }),
  S("law.mini", "threat", "Herald mini-Law declared", { wave: "sawtooth", f0: 196, dur: 0.6, gain: 0.15, filter: 800 }),
  S("gate.take", "threat", "A regalia is taken: slow low fade", { wave: "sine", f0: 98, f1: 49, dur: 1.6, gain: 0.35, attack: 0.1 }),
  S("gate.give", "markov", "A regalia returned in white", { wave: "sine", f0: 1046, dur: 1.2, gain: 0.2 }, { wave: "sine", f0: 1318, dur: 1.2, gain: 0.15, delay: 0.1 }, { wave: "sine", f0: 1568, dur: 1.2, gain: 0.12, delay: 0.2 }),
  S("dawn.chord", "break", "Dawn chord", { wave: "sine", f0: 261.6, dur: 4, gain: 0.2, attack: 1 }, { wave: "sine", f0: 329.6, dur: 4, gain: 0.18, attack: 1.2 }, { wave: "sine", f0: 392, dur: 4, gain: 0.16, attack: 1.4 }, { wave: "sine", f0: 523.2, dur: 4, gain: 0.14, attack: 1.6 }),
  S("enemy.shock", "threat", "Shockwave: stone thump", { wave: "sine", f0: 90, f1: 45, dur: 0.4, gain: 0.4 }),
  S("enemy.telegraph", "threat", "Telegraph: low choral swell", { wave: "triangle", f0: 220, f1: 247, dur: 0.35, gain: 0.12, attack: 0.15 }),
  S("enemy.attack", "enemy", "Stone release", { wave: "noise", f0: 600, dur: 0.1, gain: 0.15, filter: 900 }),
  S("enemy.spawn", "enemy", "Theorem resolves into being", { wave: "sine", f0: 330, f1: 220, dur: 0.4, gain: 0.12, attack: 0.1 }),
  S("judge.sentence", "threat", "Sentence: gavel crack", { wave: "noise", f0: 1800, dur: 0.12, gain: 0.4, filter: 2500 }, { wave: "sine", f0: 140, dur: 0.3, gain: 0.3 }),
  S("judge.bell", "ambience", "Morning bell", { wave: "sine", f0: 392, dur: 3, gain: 0.25 }, { wave: "sine", f0: 784.5, dur: 2.5, gain: 0.12 }, { wave: "sine", f0: 1176, dur: 2, gain: 0.06 }),
  S("prophet.ring", "threat", "Prophecy ring hum", { wave: "sine", f0: 466, dur: 0.4, gain: 0.12 }),
  S("prophet.stall", "enemy", "The model stalls: '…'", { wave: "sine", f0: 233, f1: 220, dur: 0.8, gain: 0.15 }),
  S("child.giggle", "enemy", "Soft giggle: music-box triplet", { wave: "sine", f0: 1568, dur: 0.1, gain: 0.15 }, { wave: "sine", f0: 1760, dur: 0.1, gain: 0.12, delay: 0.08 }, { wave: "sine", f0: 2093, dur: 0.12, gain: 0.1, delay: 0.16 }),
  S("child.collapse", "threat", "Ground gives way", { wave: "noise", f0: 400, dur: 0.6, gain: 0.3, filter: 700 }),
  S("ishtar.take", "threat", "Temptation taken: counterfeit shimmer", { wave: "sawtooth", f0: 880, f1: 440, dur: 0.6, gain: 0.15, filter: 3000 }),
  S("world.impact", "ambience", "Wall impact: stone tock", { wave: "triangle", f0: 300, f1: 180, dur: 0.08, gain: 0.15 }),
  S("world.prism", "markov", "Prism pass: crystalline chime", { wave: "sine", f0: 2637, dur: 0.3, gain: 0.18 }),
  S("king.freed", "markov", "A subject freed: gold unlock", { wave: "sine", f0: 659, f1: 988, dur: 0.25, gain: 0.2 }),
  S("king.kneel", "threat", "Kneel zone", { wave: "sawtooth", f0: 110, dur: 0.5, gain: 0.15, filter: 600 }),
  S("giant.stomp", "threat", "Giant stomp", { wave: "sine", f0: 60, f1: 30, dur: 0.6, gain: 0.6 }, { wave: "noise", f0: 300, dur: 0.3, gain: 0.25, filter: 500 }),
  S("mirror.copy", "enemy", "Mirror copy: inverted tick", { wave: "triangle", f0: 1800, f1: 2400, dur: 0.05, gain: 0.15 }),
  S("door.hum", "ambience", "The door hums and does nothing", { wave: "sine", f0: 110, dur: 0.8, gain: 0.25, attack: 0.1 }, { wave: "sine", f0: 111.5, dur: 0.8, gain: 0.2, attack: 0.1 }),
  S("boss.phase", "threat", "Boss phase checkpoint", { wave: "sawtooth", f0: 98, dur: 1.2, gain: 0.2, filter: 800, attack: 0.05 }),
  S("boss.intro", "threat", "Boss intro swell", { wave: "sawtooth", f0: 73, f1: 110, dur: 2.5, gain: 0.2, filter: 900, attack: 1 }),
  S("music.cadence", "break", "Key-matched resolution sting (rendered by ResolutionMusic)", { wave: "sine", f0: 523, dur: 0.05, gain: 0.0 }),
  S("voice.blip", "ui", "Placeholder VO contour under subtitles", { wave: "triangle", f0: 180, f1: 140, dur: 0.12, gain: 0.08, filter: 1200 }),
];

export const SFX = Object.fromEntries(SFX_BANK.map((s) => [s.key, s])) as Record<string, SfxDef>;

export const MIX = {
  maxVoices: 24,
  priority: { threat: 4, break: 4, markov: 3, enemy: 2, ui: 2, ambience: 1 } as Record<SfxCategory, number>,
  voDuckDb: -6,
  nullDuckDb: -18,
  nullDuckFrames: 6,
} as const;

/** Music cues (GDD §11). BPM/key metadata doubles as AUDIO_DELIVERY.md source. */
export interface MusicCue { id: string; bpm: number; root: number; mode: "major" | "minor" | "phrygian" | "lydian"; layers: string[]; loopBars: number; description: string }
export const MUSIC_CUES: MusicCue[] = [
  { id: "observatory", bpm: 72, root: 57, mode: "lydian", layers: ["harpsichord", "pad"], loopBars: 16, description: "Sparse harpsichord + pad, Markov's theme fragment" },
  { id: "law.reflection", bpm: 104, root: 50, mode: "minor", layers: ["pad", "bass", "arp", "motif", "perc", "choir", "bells"], loopBars: 8, description: "Motif A, unresolved (ends on the 7th)" },
  { id: "law.shadow", bpm: 92, root: 48, mode: "minor", layers: ["pad", "bass", "arp", "motif", "perc", "choir", "bells"], loopBars: 8, description: "Motif B" },
  { id: "law.recurrence", bpm: 112, root: 52, mode: "minor", layers: ["pad", "bass", "arp", "motif", "perc", "choir", "bells"], loopBars: 8, description: "Motif C; canon at one bar" },
  { id: "law.dominion", bpm: 96, root: 45, mode: "phrygian", layers: ["pad", "bass", "arp", "motif", "perc", "choir", "bells"], loopBars: 8, description: "Motif D" },
  { id: "law.judgment", bpm: 100, root: 47, mode: "minor", layers: ["pad", "bass", "arp", "motif", "perc", "choir", "bells"], loopBars: 8, description: "Motif E; bell on beat 1" },
  { id: "law.prophecy", bpm: 108, root: 53, mode: "lydian", layers: ["pad", "bass", "arp", "motif", "perc", "choir", "bells"], loopBars: 8, description: "Motif F" },
  { id: "law.innocence", bpm: 84, root: 60, mode: "major", layers: ["musicbox", "pad", "motif"], loopBars: 8, description: "Motif G (music box)" },
  { id: "descent", bpm: 76, root: 45, mode: "minor", layers: ["pad", "bass", "arp", "motif", "perc", "choir", "bells"], loopBars: 8, description: "Each gate removes one instrument (7 → 0)" },
  { id: "ishtar", bpm: 66, root: 49, mode: "phrygian", layers: ["choir", "pad"], loopBars: 8, description: "Choir; phase 3 = near-silence → dawn chord" },
  { id: "ascent", bpm: 120, root: 60, mode: "major", layers: ["pad", "bass", "arp", "motif", "perc", "choir", "bells"], loopBars: 8, description: "Markov's theme, fully resolved, major" },
  { id: "title", bpm: 60, root: 57, mode: "lydian", layers: ["pad"], loopBars: 8, description: "Title drone" },
];
