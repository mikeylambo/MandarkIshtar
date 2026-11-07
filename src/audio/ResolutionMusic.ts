import type { AudioEngine } from "./AudioEngine";
import { LAWS } from "../data/laws";
import { MUSIC_CUES, type MusicCue } from "../data/audio";
import type { LawId } from "../sim/types";

const MODES: Record<MusicCue["mode"], number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], phrygian: [0, 1, 3, 5, 7, 8, 10], lydian: [0, 2, 4, 6, 7, 9, 11],
};
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

/**
 * Audio as proof. Each Law motif is left unresolved; each Contradiction adds a harmonic step toward the tonic
 * (4 max per arena); Q.E.D./room clear plays the key-matched cadence. Wave count adds layers.
 * Descent: each gate removes one instrument (7 → 0). Ishtar P3: near-silence → dawn chord.
 * Owns music layer state (GDD §15 ownership table).
 */
export class ResolutionMusic {
  cue: MusicCue = MUSIC_CUES[0]!;
  motif: number[] = [0, 4, 7, 11];
  step = 0;
  layers = 2;
  instrumentCap = 7;
  silence = false;
  private nextBeat = 0;
  private beat = 0;
  private timer: number | null = null;
  readonly stepsHeard: number[] = [];
  cadences = 0;

  constructor(private readonly audio: AudioEngine) {}

  play(cueId: string, law: LawId | null = null): void {
    this.cue = MUSIC_CUES.find((c) => c.id === cueId) ?? MUSIC_CUES[0]!;
    this.motif = law ? LAWS[law].motif : [0, 4, 7, 9];
    this.step = 0; this.beat = 0; this.silence = false;
    if (this.audio.ctx) this.nextBeat = this.audio.ctx.currentTime + 0.1;
    if (this.timer === null && typeof window !== "undefined") this.timer = window.setInterval(() => this.schedule(), 50);
  }
  stop(): void { this.silence = true; }
  setLayers(n: number): void { this.layers = Math.max(1, Math.min(7, n)); }
  /** Harmonic step toward resolution (Contradiction). */
  advance(): void { if (this.step < 4) { this.step++; this.stepsHeard.push(this.step); } }
  /** Resolving cadence (Q.E.D. / room clear), key-matched to the current cue. */
  cadence(): void {
    this.cadences++;
    const ctx = this.audio.ctx; if (!ctx) return;
    const scale = MODES[this.cue.mode], root = this.cue.root;
    const t = ctx.currentTime;
    const chords = [[4, 6, 8], [0, 2, 4, 7]]; // V → I
    chords.forEach((ch, k) => ch.forEach((deg) => this.note(midi(root + 12 + scale[deg % 7]! + 12 * Math.floor(deg / 7)), t + k * 0.28, 0.9 - k * 0.2, "triangle", 0.12)));
  }

  private note(f: number, t: number, dur: number, type: OscillatorType, gain: number, bus = "music"): void {
    const ctx = this.audio.ctx!;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.audio.buses.get(bus)!);
    o.start(t); o.stop(t + dur + 0.05);
  }

  private schedule(): void {
    const ctx = this.audio.ctx;
    if (!ctx || this.silence) return;
    const spb = 60 / this.cue.bpm;
    while (this.nextBeat < ctx.currentTime + 0.2) { this.playBeat(this.nextBeat, spb); this.nextBeat += spb; this.beat++; }
  }

  private playBeat(t: number, spb: number): void {
    const scale = MODES[this.cue.mode], root = this.cue.root;
    const deg = (d: number) => root + scale[((d % 7) + 7) % 7]! + 12 * Math.floor(d / 7);
    const bar = Math.floor(this.beat / 4), b = this.beat % 4;
    // unresolved progression; each step pulls the bass toward the tonic
    const prog = [[5, 3, 6, 4], [5, 3, 4, 4], [5, 4, 4, 0], [4, 4, 0, 0], [0, 0, 0, 0]][this.step]!;
    const chordRoot = prog[bar % 4]!;
    const active = this.cue.layers.slice(0, Math.min(this.layers, this.instrumentCap));
    if (b === 0 && active.includes("pad")) for (const k of [0, 2, 4]) this.note(midi(deg(chordRoot + k) + 12), t, spb * 4, "sine", 0.035);
    if (active.includes("bass") && b % 2 === 0) this.note(midi(deg(chordRoot) - 12), t, spb * 1.6, "triangle", 0.09);
    if (active.includes("harpsichord") && (b === 0 || b === 2)) this.note(midi(deg(chordRoot + (b ? 4 : 2)) + 24), t, 0.4, "square", 0.02);
    if (active.includes("musicbox")) this.note(midi(deg(this.motif[(this.beat) % 4]! % 7 + chordRoot) + 24), t, 0.6, "sine", 0.05);
    if (active.includes("arp")) for (let i = 0; i < 2; i++) this.note(midi(deg(chordRoot + [0, 2, 4, 7][(this.beat * 2 + i) % 4]!) + 12), t + i * spb / 2, spb / 2, "triangle", 0.025);
    if (active.includes("motif") && bar % 2 === 0) { const m = this.motif[b]!; this.note(midi(root + 12 + m), t, spb * 0.9, "sawtooth", 0.018); }
    if (active.includes("perc")) { this.audio.sfx(b === 0 ? "world.impact" : "op.cast", b === 0 ? 0.5 : 0.15, 1); }
    if (active.includes("choir") && b === 0 && bar % 2 === 1) for (const k of [0, 4]) this.note(midi(deg(chordRoot + k)), t, spb * 3, "sawtooth", 0.012);
    if (active.includes("bells") && b === 0 && bar % 4 === 0) this.note(midi(deg(0) + 24), t, 1.5, "sine", 0.04);
  }
}
