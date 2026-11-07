import { describe, expect, it } from "vitest";
import { encounterById } from "../../src/data/trials";
import { runEncounter } from "../../src/dev/bots/runner";
import { SolverBot } from "../../src/dev/bots/SolverBot";
import { REGALIA_ORDER } from "../../src/sim/types";

describe("solver bot uses the Giant's glyph exploit when it has Order", () => {
  it("Boss Rush loadout (all regalia): ≥ 1 'giant-delay' Contradiction and a clear", () => {
    let uses = 0;
    const r = runEncounter(encounterById("2-B")!, { seed: 7, regalia: [...REGALIA_ORDER] }, new SolverBot(), undefined, (w) => { for (const e of w.events) if (e.type === "Contradiction" && e.text === "giant-delay") uses++; });
    console.log(`giant glyph exploit uses: ${uses}, status ${r.status}, ${(r.frames / 60).toFixed(0)}s`);
    expect(r.status).toBe("clear");
    expect(uses).toBeGreaterThanOrEqual(1);
  });
});
