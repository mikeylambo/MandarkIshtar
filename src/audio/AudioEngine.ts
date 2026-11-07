import type { AudioSystem } from "@slu/web-shell";
import { MIX, SFX, type SfxDef } from "../data/audio";

/**
 * WebAudio implementation of the shell AudioSystem contract. Buses: master/music/sfx/ui/voice/ambience.
 * SFX are synthesized placeholders keyed by semantic ids; a delivered file in the manifest overrides a key.
 * Voice limit 24 with category priority.
 */
export class AudioEngine implements AudioSystem {
  ctx: AudioContext | null = null;
  readonly buses = new Map<string, GainNode>();
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private voices: { end: number; pri: number; stop: () => void }[] = [];
  private files = new Map<string, AudioBuffer>();
  private volumes = new Map<string, number>([["master", 1], ["music", 0.8], ["sfx", 0.9], ["ui", 0.9], ["voice", 1], ["ambience", 0.8]]);
  private muted = false;
  private sfxDuckUntil = 0;
  /** Test/telemetry: keys played this session. */
  readonly played = new Set<string>();

  /** Must be called from a user gesture (browser autoplay policy). */
  unlock(): void {
    if (this.ctx) { void this.ctx.resume(); return; }
    const Ctor = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 3;
    this.master.connect(comp).connect(this.ctx.destination);
    for (const b of ["music", "sfx", "ui", "voice", "ambience"]) { const g = this.ctx.createGain(); g.connect(this.master); this.buses.set(b, g); }
    const len = this.ctx.sampleRate;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    let s = 1234567;
    for (let i = 0; i < len; i++) { s = (s * 1103515245 + 12345) >>> 0; d[i] = (s / 4294967296) * 2 - 1; }
    this.applyVolumes();
  }

  setBusVolume(bus: string, value: number): void { this.volumes.set(bus, value); this.applyVolumes(); }
  setMuted(m: boolean): void { this.muted = m; this.applyVolumes(); }
  pauseAll(): void { void this.ctx?.suspend(); }
  resumeAll(): void { void this.ctx?.resume(); }
  playSfx(id: string, o: { volume?: number; pitch?: number } = {}): void { this.sfx(id, o.volume ?? 1, o.pitch ?? 1); }

  private applyVolumes(): void {
    if (!this.ctx || !this.master) return;
    this.master.gain.value = this.muted ? 0 : (this.volumes.get("master") ?? 1);
    for (const [b, g] of this.buses) g.gain.value = this.volumes.get(b) ?? 1;
  }

  /** Null: "silence used as a sound" — duck all SFX −18 dB for 6f. */
  duckSfx(frames = MIX.nullDuckFrames, db: number = MIX.nullDuckDb): void {
    if (!this.ctx) return;
    const g = this.buses.get("sfx")!.gain, t = this.ctx.currentTime, base = this.volumes.get("sfx") ?? 1;
    g.cancelScheduledValues(t); g.setValueAtTime(base * Math.pow(10, db / 20), t); g.setValueAtTime(base, t + frames / 60);
    this.sfxDuckUntil = t + frames / 60;
  }

  registerFile(key: string, buf: AudioBuffer): void { this.files.set(key, buf); }

  sfx(key: string, volume = 1, pitch = 1, bus?: string): void {
    this.played.add(key);
    const def = SFX[key];
    if (!this.ctx || !def) return;
    const ctx = this.ctx, t = ctx.currentTime;
    // voice budget with priority (threat telegraphs > Markov ops > enemy SFX > ambience)
    this.voices = this.voices.filter((v) => v.end > t);
    const pri = MIX.priority[def.cat];
    if (this.voices.length >= MIX.maxVoices) {
      const low = this.voices.reduce((a, b) => (a.pri <= b.pri ? a : b));
      if (low.pri > pri) return;
      low.stop(); this.voices.splice(this.voices.indexOf(low), 1);
    }
    const out = this.buses.get(bus ?? (def.cat === "ui" ? "ui" : def.cat === "ambience" ? "ambience" : "sfx"))!;
    const file = this.files.get(key);
    const nodes: AudioScheduledSourceNode[] = [];
    let end = t;
    if (file) {
      const src = ctx.createBufferSource(); src.buffer = file; src.playbackRate.value = pitch;
      const g = ctx.createGain(); g.gain.value = volume; src.connect(g).connect(out); src.start(t); nodes.push(src); end = t + file.duration;
    } else end = this.synth(def, t, volume, pitch, out, nodes);
    // Contradiction and Q.E.D. always cut through the Null duck
    if ((def.cat === "break") && t < this.sfxDuckUntil) { this.buses.get("sfx")!.gain.setValueAtTime(this.volumes.get("sfx") ?? 1, t); }
    this.voices.push({ end, pri, stop: () => nodes.forEach((n) => { try { n.stop(); } catch { /* already stopped */ } }) });
  }

  private synth(def: SfxDef, t0: number, vol: number, pitch: number, out: AudioNode, nodes: AudioScheduledSourceNode[]): number {
    const ctx = this.ctx!;
    let end = t0;
    for (const l of def.layers) {
      const t = t0 + (l.delay ?? 0);
      const g = ctx.createGain();
      const atk = l.attack ?? 0.004;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(l.gain * vol, t + atk);
      g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(atk + 0.01, l.dur));
      let src: AudioScheduledSourceNode;
      if (l.wave === "noise") {
        const b = ctx.createBufferSource(); b.buffer = this.noise; b.loop = true; src = b;
        const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.setValueAtTime(l.f0 * pitch, t); if (l.f1) f.frequency.exponentialRampToValueAtTime(l.f1 * pitch, t + l.dur); f.Q.value = l.q ?? 0.8;
        src.connect(f).connect(g);
      } else {
        const o = ctx.createOscillator(); o.type = l.wave; o.frequency.setValueAtTime(l.f0 * pitch, t); if (l.f1) o.frequency.exponentialRampToValueAtTime(l.f1 * pitch, t + l.dur); src = o;
        if (l.filter) { const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = l.filter; o.connect(f).connect(g); } else o.connect(g);
      }
      g.connect(out);
      src.start(t); src.stop(t + l.dur + 0.05);
      nodes.push(src);
      end = Math.max(end, t + l.dur);
    }
    return end;
  }
}
