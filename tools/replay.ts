// Replays the recordings inside an exported diagnostics file: npx vite-node tools/replay.ts <file.json>
import { readFileSync } from "node:fs";
import { replayRecording } from "../src/dev/replay";
import type { ArenaRecording, ArenaSummary } from "../src/meta/PlaytestLog";

const file = process.argv[2];
if (!file) { console.error("usage: npx vite-node tools/replay.ts <diagnostics.json>"); process.exit(1); }
const bundle = JSON.parse(readFileSync(file, "utf8")) as { game?: { playtest?: { rollup: unknown; summaries: ArenaSummary[] } }; replay?: { recordings: ArenaRecording[] } };
const pt = bundle.game?.playtest ? { ...bundle.game.playtest, recordings: bundle.replay?.recordings ?? [] } : null;
if (!pt) { console.error("no playtest data in this file"); process.exit(1); }
console.log(`${pt.summaries.length} arena summaries, ${pt.recordings.length} recordings\n`);
console.table(pt.rollup);
for (const rec of pt.recordings) {
  const r = replayRecording(rec);
  console.log(`${r.matches ? "✓" : "✗ DESYNC"} ${r.id} ${r.status} ${(r.frames / 60).toFixed(1)}s score ${r.score} lost ${JSON.stringify(r.sealsLost)}`);
}
