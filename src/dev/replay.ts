import { World } from "../sim/World";
import { unpack, type ArenaRecording } from "../meta/PlaytestLog";

export interface ReplayResult { id: string; status: string; frames: number; score: number; rank?: string; sealsLost: Record<string, number>; matches: boolean }

/** Re-runs a recorded arena headless and checks it ends where the recording says it did. */
export function replayRecording(rec: ArenaRecording, onFrame?: (w: World) => void): ReplayResult {
  const w = new World(rec.def, rec.opts);
  const sealsLost: Record<string, number> = {};
  for (const f of unpack(rec.inputs)) {
    if (w.status === "clear" || w.status === "lost") break;
    w.step(f);
    for (const e of w.events) if (e.type === "SealLost") sealsLost[e.kind ?? "unknown"] = (sealsLost[e.kind ?? "unknown"] ?? 0) + 1;
    onFrame?.(w);
  }
  const r = w.scorer.finalized;
  const status = w.status === "clear" || w.status === "lost" ? w.status : "quit";
  const score = r?.score ?? Math.round(w.scorer.score);
  return { id: rec.def.id, status, frames: w.frame, score, rank: r?.rank, sealsLost, matches: status === rec.summary.status && w.frame === rec.summary.frames && (status === "quit" || score === rec.summary.score) };
}
