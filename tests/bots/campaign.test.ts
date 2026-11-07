import { describe, expect, it } from "vitest";
import { runCampaign } from "../../src/dev/bots/runner";
import { SolverBot } from "../../src/dev/bots/SolverBot";
import { PassiveBot } from "../../src/dev/bots/PassiveBot";
import { campaignStages } from "../../src/campaign/sequence";
import { runEncounter } from "../../src/dev/bots/runner";
import { writeFileSync, mkdirSync } from "node:fs";

describe("campaign bots", () => {
  it("solver bot completes the entire campaign on Savant (cold open → credits)", () => {
    const errors: string[] = [];
    const report = runCampaign(() => new SolverBot(), { difficulty: "savant" }, 6);
    mkdirSync("captures", { recursive: true });
    writeFileSync("captures/campaign-report.json", JSON.stringify(report, null, 2));
    const retries = report.stages.filter((s) => s.tries > 1).map((s) => `${s.id}×${s.tries}`);
    console.log(`campaign: completed=${report.completed} stages=${report.stages.length} sim-time=${(report.totalFrames / 3600).toFixed(1)} min retries=[${retries.join(" ")}] failedAt=${report.failedAt ?? "-"}`);
    expect(errors).toEqual([]);
    expect(report.completed).toBe(true);
    expect(report.stages.length).toBe(campaignStages().length);
  });

  it("passive bot loses (loss → retry flow)", () => {
    const st = campaignStages()[1]!;
    const r = runEncounter(st.def, { seed: 3, regalia: st.regalia }, new PassiveBot());
    expect(r.status).toBe("lost");
    const retry = runEncounter(st.def, { seed: 4, regalia: st.regalia }, new SolverBot());
    expect(retry.status).toBe("clear");
  });
});
