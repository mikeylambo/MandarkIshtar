import { describe, expect, it } from "vitest";
import { encounterById } from "../src/data/trials";
import { SolverBot } from "../src/dev/bots/SolverBot";
import { World } from "../src/sim/World";
import { PlaytestLog, quantize, type ArenaRecording } from "../src/meta/PlaytestLog";
import { replayRecording } from "../src/dev/replay";
import { regaliaForTrial } from "../src/campaign/sequence";

describe("playtest recording", () => {
  it("a recorded arena replays to the same outcome after a JSON round trip", () => {
    const def = encounterById("1-1")!;
    const opts = { seed: 42, difficulty: "savant" as const, regalia: regaliaForTrial(1) };
    const log = new PlaytestLog();
    log.begin(def, opts);
    const w = new World(def, opts), bot = new SolverBot();
    while (w.frame < 60 * 60 * 5 && w.status !== "clear" && w.status !== "lost") {
      const f = quantize(bot.next(w));
      log.input(f);
      w.step(f);
      for (const e of w.events) if (e.type === "SealLost") log.sealLost(e.kind ?? "unknown");
    }
    log.end(w.status === "clear" ? "clear" : "lost", { frames: w.frame, score: w.scorer.finalized?.score ?? Math.round(w.scorer.score), compounds: w.ops.compoundsUsed });
    expect(w.status).toBe("clear");
    const rec = JSON.parse(JSON.stringify(log.recordings[0])) as ArenaRecording;
    expect(rec.inputs.length).toBeLessThan(w.frame); // run-length encoding helps
    const r = replayRecording(rec);
    expect(r.status).toBe(rec.summary.status);
    expect(r.frames).toBe(rec.summary.frames);
    expect(r.score).toBe(rec.summary.score);
    expect(r.matches).toBe(true);
    expect(log.rollup()["1-1"]!.attempts).toBe(1);
  });

  it("survives missing or corrupt storage", () => {
    const bad = { getItem: () => "{nope", setItem: () => { throw new Error("quota"); } };
    const log = new PlaytestLog(bad);
    log.begin(encounterById("1-1")!, { seed: 1 });
    log.end("quit", { frames: 0, score: 0, compounds: 0 });
    expect(log.summaries.length).toBe(1);
  });
});
