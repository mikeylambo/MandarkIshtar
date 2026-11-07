import { describe, expect, it } from "vitest";
import { runEncounter } from "../src/dev/bots/runner";
import { SolverBot } from "../src/dev/bots/SolverBot";
import { COLD_OPEN, TRIALS } from "../src/data/trials";
import { regaliaForTrial } from "../src/campaign/sequence";

describe("First 60 seconds (GDD §9)", () => {
  it("a bot reaches Arena 1-1 clear in ≤ 60 s (cold open → door → Law card → 1-1)", () => {
    const beats: string[] = [];
    const a = runEncounter(COLD_OPEN, { seed: 1, regalia: COLD_OPEN.regalia, teach: true }, new SolverBot(), 3600, (w) => { for (const e of w.events) if (["DoorHum", "SlowMoTeach", "Redirect", "Contradiction", "QED"].includes(e.type)) beats.push(`${(w.frame / 60).toFixed(1)}s ${e.type}`); });
    expect(a.status).toBe("clear");
    const b = runEncounter(TRIALS[0]!.arenas[0]!, { seed: 1, regalia: regaliaForTrial(1) }, new SolverBot(), 3600, (w) => { for (const e of w.events) if (["LawDeclared", "Contradiction", "Flourish"].includes(e.type)) beats.push(`${((a.frames + w.frame) / 60).toFixed(1)}s ${e.type}`); });
    expect(b.status).toBe("clear");
    const total = (a.frames + b.frames) / 60;
    console.log(`first 60s: cold open ${(a.frames / 60).toFixed(1)}s + Arena 1-1 ${(b.frames / 60).toFixed(1)}s = ${total.toFixed(1)}s\n  ${beats.join("\n  ")}`);
    expect(total).toBeLessThanOrEqual(60);
    expect(beats.some((x) => x.includes("SlowMoTeach"))).toBe(true);
  });
  it("the door is not solvable by Strike (P1: raw force is never the answer)", () => {
    const r = runEncounter(COLD_OPEN, { seed: 1, regalia: ["strike"] }, { name: "masher", next: (w) => ({ mx: w.markov.pos.z < 1.5 ? 0 : 0, mz: w.markov.pos.z < 1.6 ? 1 : 0, ax: 0, az: 1, aiming: true, b: w.frame % 12 < 2 ? 32 : 0 }) }, 1800);
    expect(r.status).not.toBe("clear");
  });
});
