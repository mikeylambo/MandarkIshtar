import { SEALS } from "../data/resources";
import type { World } from "../sim/World";
import type { Actor } from "../sim/entities";
import { dist, fromAngle, scale } from "../sim/math";
import { REGALIA_ORDER, type Regalia } from "../sim/types";

interface Scheduled { at: number; fn: () => void }

/** Runs one encounter: props, waves, boss, clear/loss. */
export class EncounterDirector {
  waveIndex = -1;
  private waveDelay = 0;
  private started = false;
  private readonly scheduled: Scheduled[] = [];
  boss: Actor | null = null;
  /** Set by scripted encounters (Child, Ishtar, cold open) when their own goal is met. */
  scriptedDone = false;
  /** Encounters whose end is decided by a script instead of "no hostiles left". */
  scripted = false;
  lost = false;
  bossPhase = 1;

  constructor(private readonly w: World) {}

  init(): void {
    const w = this.w, def = w.def;
    for (const p of def.props) {
      const movable = p.type === "prism" || p.type === "light";
      const radius = p.type === "prism" || p.type === "light" || p.type === "pedestal" ? 0.6 : p.type === "hazardGlyph" ? (p.d?.r ?? 1.6) : p.type === "trialDoor" || p.type === "station" ? 1.2 : 0.5;
      w.spawnProp(p.type, { x: p.x, z: p.z }, { movable, radius, tag: p.tag, d: p.d });
    }
    if (def.kind === "gate" && def.gate) {
      const taken = REGALIA_ORDER[def.gate - 1] as Regalia;
      w.emit("RegaliaLost", { kind: taken, value: def.gate });
    }
    if (def.kind === "ascent" && def.gate) {
      const given = REGALIA_ORDER[7 - def.gate] as Regalia;
      w.emit("RegaliaReturned", { kind: given, value: def.gate });
    }
    if (def.boss) {
      this.boss = w.spawnActor(def.boss, { x: 0, z: def.boss === "child" ? 2 : 4 }, { spawnFrames: 0 });
      w.emit("BossIntro", { kind: def.boss, id: this.boss.id });
    }
    if (def.kind === "hub" || def.kind === "lab" || def.kind === "credits" || def.kind === "coldOpen" || def.boss === "child" || def.boss === "ishtar") this.scripted = true;
    if (w.status === "playing") this.onIntroDone();
  }

  onIntroDone(): void {
    if (this.started) return;
    this.started = true;
    if (this.w.def.waves.length) this.spawnWave(0);
  }

  schedule(delay: number, fn: () => void): void { this.scheduled.push({ at: this.w.frame + Math.max(1, Math.round(delay)), fn }); }

  update(): void {
    const w = this.w;
    for (let i = 0; i < this.scheduled.length; i++) {
      const s = this.scheduled[i]!;
      if (w.frame >= s.at) { this.scheduled.splice(i, 1); i--; s.fn(); }
    }
    if (!this.started) return;
    const waves = w.def.waves;
    if (this.waveIndex >= 0 && this.waveIndex < waves.length - 1) {
      const remaining = w.actors.some((a) => a.alive && !a.neutral && !a.boss && a.waveIndex === this.waveIndex && a.type !== "shadow");
      if (!remaining) {
        if (this.waveDelay <= 0) this.waveDelay = waves[this.waveIndex + 1]!.delay ?? 45;
        if (--this.waveDelay <= 0) this.spawnWave(this.waveIndex + 1);
      }
    }
  }

  spawnWave(i: number): void {
    const w = this.w;
    const wave = w.def.waves[i];
    if (!wave) return;
    this.waveIndex = i;
    this.waveDelay = 0;
    const spawned: Actor[] = [];
    const R = w.def.arena.radius;
    for (const s of wave.spawns) {
      let pos = scale(fromAngle((s.a * Math.PI) / 180), Math.min(s.r, R - 1.5));
      // Spawn ring ≥ 8 u from Markov.
      if (dist(pos, w.markov.pos) < 8) { const alt = { x: -pos.x, z: -pos.z }; if (dist(alt, w.markov.pos) > dist(pos, w.markov.pos)) pos = alt; }
      const a = w.spawnActor(s.type, pos, { elite: s.elite, shadowed: s.shadowed, waveIndex: i });
      spawned.push(a);
    }
    // Paradox pairs link in order of appearance.
    const px = spawned.filter((a) => a.type === "paradox");
    for (let k = 0; k + 1 < px.length; k += 2) { px[k]!.linkId = px[k + 1]!.id; px[k + 1]!.linkId = px[k]!.id; }
    wave.spawns.forEach((s, k) => { if (s.commander !== undefined && spawned[s.commander]) w.ledger.command(w, spawned[k]!, spawned[s.commander]!); });
    w.emit("WaveStart", { value: i, kind: `${spawned.length}` });
  }

  /** Bosses advance phases monotonically; each phase checkpoint refills Seals. */
  setBossPhase(phase: number): void {
    if (phase <= this.bossPhase) return;
    this.bossPhase = phase;
    this.w.markov.setSeals(this.w.markov.maxSeals);
    this.w.emit("PhaseChange", { value: phase, kind: this.w.def.boss ?? "" });
  }

  complete(): void { this.scriptedDone = true; }

  checkEnd(): void {
    const w = this.w;
    if (w.status !== "playing") return;
    if (this.lost) { w.status = "lost"; w.emit("EncounterLost"); return; }
    if (this.scripted) { if (this.scriptedDone) this.beginFlourish(); return; }
    if (!this.started || this.waveIndex < w.def.waves.length - 1) return;
    if (w.hostiles().length > 0) return;
    this.beginFlourish();
  }

  private beginFlourish(): void {
    const w = this.w;
    // Remaining neutral subjects are filed with the room.
    for (const a of w.actors) if (a.alive) { a.alive = false; a.state = "dead"; }
    w.status = "flourish";
    w.statusT = w.opts.flourishFrames ?? 45;
    w.emit("Flourish", { x: w.markov.pos.x, z: w.markov.pos.z });
  }

  onClear(): void {
    const w = this.w;
    w.scorer.finalize();
    w.markov.restoreSeals(SEALS.arenaClearRestore);
    w.emit("ArenaClear", { kind: w.def.id, value: w.scorer.finalized!.score, text: w.scorer.finalized!.rank });
  }

  onMarkovDefeated(): void { this.lost = true; }
}
