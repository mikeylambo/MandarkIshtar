import type { EncounterDef } from "../sim/encounter";
import type { InputFrame } from "../sim/types";
import type { WorldOptions } from "../sim/World";

/**
 * Playtest recording. The sim is deterministic, so an arena's def + options + input frames reproduce the run exactly
 * (`tools/replay.ts`). Each arena also gets a small summary (outcome, time, Seals lost by cause, compounds) for
 * reading many sessions at a glance. Inputs stay in memory for the last few arenas; summaries persist per browser.
 */
export interface ArenaSummary {
  id: string;
  kind: string;
  status: "clear" | "lost" | "quit";
  frames: number;
  seed: number | string;
  difficulty?: string;
  sealsLost: Record<string, number>;
  compounds: number;
  firstCompoundFrame: number | null;
  score: number;
  rank?: string;
  bossPhase?: number;
  at: number;
}

/** Input frames, run-length encoded: [repeat, mx, mz, ax, az, aiming(0|1), buttons]. */
export type PackedInput = [number, number, number, number, number, number, number];

export interface ArenaRecording { summary: ArenaSummary; def: EncounterDef; opts: WorldOptions; inputs: PackedInput[] }

const KEEP_RECORDINGS = 12;
const KEEP_SUMMARIES = 400;
const STORE_KEY = "mandark-ishtar.playtest.v1";

/** Analog input is snapped to 1/4096 before it reaches the sim, so recordings are compact and replay bit-exact. */
export function quantize(f: InputFrame): InputFrame {
  const q = (v: number) => Math.round(v * 4096) / 4096;
  return { mx: q(f.mx), mz: q(f.mz), ax: q(f.ax), az: q(f.az), aiming: f.aiming, b: f.b };
}

export function unpack(inputs: PackedInput[]): InputFrame[] {
  const out: InputFrame[] = [];
  for (const [n, mx, mz, ax, az, aiming, b] of inputs) for (let i = 0; i < n; i++) out.push({ mx, mz, ax, az, aiming: aiming === 1, b });
  return out;
}

export class PlaytestLog {
  readonly recordings: ArenaRecording[] = [];
  summaries: ArenaSummary[] = [];
  private cur: ArenaRecording | null = null;

  constructor(private readonly storage: Pick<Storage, "getItem" | "setItem"> | null = null) {
    try {
      const raw = storage?.getItem(STORE_KEY);
      const parsed = raw ? (JSON.parse(raw) as { summaries?: ArenaSummary[] }) : null;
      if (parsed && Array.isArray(parsed.summaries)) this.summaries = parsed.summaries;
    } catch { /* unavailable or corrupt: start empty */ }
  }

  begin(def: EncounterDef, opts: WorldOptions): void {
    if (this.cur) this.end("quit", { frames: this.frameCount(), score: 0, compounds: this.cur.summary.compounds });
    this.cur = {
      def: JSON.parse(JSON.stringify(def)) as EncounterDef,
      opts: JSON.parse(JSON.stringify(opts)) as WorldOptions,
      inputs: [],
      summary: { id: def.id, kind: def.kind, status: "quit", frames: 0, seed: opts.seed, difficulty: opts.difficulty, sealsLost: {}, compounds: 0, firstCompoundFrame: null, score: 0, at: Date.now() },
    };
  }

  /** Call once per sim step with the exact frame given to `World.step`. */
  input(f: InputFrame): void {
    const c = this.cur; if (!c) return;
    const last = c.inputs[c.inputs.length - 1];
    const a = f.aiming ? 1 : 0;
    if (last && last[1] === f.mx && last[2] === f.mz && last[3] === f.ax && last[4] === f.az && last[5] === a && last[6] === f.b) last[0]++;
    else c.inputs.push([1, f.mx, f.mz, f.ax, f.az, a, f.b]);
  }

  sealLost(cause: string): void { const s = this.cur?.summary; if (s) s.sealsLost[cause] = (s.sealsLost[cause] ?? 0) + 1; }
  compound(frame: number): void { const s = this.cur?.summary; if (s && s.firstCompoundFrame === null) s.firstCompoundFrame = frame; }

  end(status: ArenaSummary["status"], r: { frames: number; score: number; compounds: number; rank?: string; bossPhase?: number }): void {
    const c = this.cur; if (!c) return;
    this.cur = null;
    Object.assign(c.summary, { status, frames: r.frames, score: r.score, compounds: r.compounds, rank: r.rank, bossPhase: r.bossPhase });
    this.recordings.push(c); if (this.recordings.length > KEEP_RECORDINGS) this.recordings.shift();
    this.summaries.push(c.summary); if (this.summaries.length > KEEP_SUMMARIES) this.summaries.shift();
    try { this.storage?.setItem(STORE_KEY, JSON.stringify({ summaries: this.summaries })); } catch { /* quota/private mode */ }
  }

  /** The arena being played right now (status "quit"), so an export taken mid-fight still replays. */
  inProgress(): ArenaRecording | null {
    const c = this.cur; if (!c) return null;
    return { ...c, inputs: c.inputs.map((p) => [...p] as PackedInput), summary: { ...c.summary, sealsLost: { ...c.summary.sealsLost }, status: "quit", frames: this.frameCount() } };
  }

  private frameCount(): number { return (this.cur?.inputs ?? []).reduce((s, p) => s + p[0], 0); }

  /** Per-stage rollup across every stored summary: attempts, clears, median clear time, top loss causes. */
  rollup(): Record<string, { attempts: number; clears: number; medianClearS: number; sealsLost: Record<string, number> }> {
    const out: Record<string, { attempts: number; clears: number; times: number[]; sealsLost: Record<string, number> }> = {};
    for (const s of this.summaries) {
      const o = (out[s.id] ??= { attempts: 0, clears: 0, times: [], sealsLost: {} });
      o.attempts++;
      if (s.status === "clear") { o.clears++; o.times.push(s.frames / 60); }
      for (const [k, v] of Object.entries(s.sealsLost)) o.sealsLost[k] = (o.sealsLost[k] ?? 0) + v;
    }
    const res: ReturnType<PlaytestLog["rollup"]> = {};
    for (const [id, o] of Object.entries(out)) {
      const t = [...o.times].sort((a, b) => a - b);
      res[id] = { attempts: o.attempts, clears: o.clears, medianClearS: t.length ? Math.round(t[Math.floor(t.length / 2)]!) : 0, sealsLost: o.sealsLost };
    }
    return res;
  }
}
