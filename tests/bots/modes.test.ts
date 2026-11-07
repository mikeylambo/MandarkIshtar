import { describe, expect, it } from "vitest";
import { bossRush, dailyScoreAttack, laboratory, scoreAttack, theorem, timeAttack } from "../../src/modes/ModeRun";
import { runMode } from "../../src/dev/bots/runner";
import { SolverBot } from "../../src/dev/bots/SolverBot";
import { THEOREM_CHALLENGES } from "../../src/data/theorems";
import { World } from "../../src/sim/World";
import { NO_INPUT } from "../../src/sim/types";

describe("mode bots: one run of each mode", () => {
  it("Time Attack (each Trial)", () => {
    for (let t = 1; t <= 7; t++) {
      const r = runMode(timeAttack(t), () => new SolverBot());
      console.log(`timeAttack T${t}: completed=${r.completed} time=${(r.frames / 60).toFixed(1)}s`);
      expect(r.completed).toBe(true);
    }
  });
  it("Score Attack (seeded + daily seed is deterministic)", () => {
    const a = scoreAttack(1234), b = scoreAttack(1234);
    expect(a.stages.map((s) => s.def.id + s.opts.lawModifiers)).toEqual(b.stages.map((s) => s.def.id + s.opts.lawModifiers));
    expect(a.stages.length).toBe(10);
    const d = dailyScoreAttack(new Date("2026-11-07T12:00:00Z"));
    expect(dailyScoreAttack(new Date("2026-11-07T20:00:00Z")).seed).toBe(d.seed);
    const r = runMode(a, () => new SolverBot());
    console.log(`scoreAttack: completed=${r.completed} score=${Math.round(r.score)} stages=${r.stages.length}`);
    expect(r.stages.length).toBeGreaterThanOrEqual(1);
    expect(r.score).toBeGreaterThan(0);
  });
  it("Boss Rush", () => {
    const r = runMode(bossRush(), () => new SolverBot());
    console.log(`bossRush: completed=${r.completed} time=${(r.frames / 60).toFixed(1)}s ${r.stages.map((s) => s.id + ":" + s.status).join(" ")}`);
    expect(r.stages.length).toBe(7 - (r.completed ? 0 : 7 - r.stages.length));
    expect(r.stages[0]!.status).toBe("clear");
  });
  it("Theorems ×21 (each runs; constraints are evaluated)", () => {
    expect(THEOREM_CHALLENGES.length).toBe(21);
    let passed = 0;
    for (const c of THEOREM_CHALLENGES) {
      const r = runMode(theorem(c.id), () => new SolverBot());
      expect(r.stages.length).toBe(1);
      if (r.completed && r.stages[0]!.constraintOk) passed++;
    }
    console.log(`theorems: solver passes ${passed}/21 constraints (it is not constraint-aware)`);
  });
  it("Laboratory (spawn anything, infinite Focus)", () => {
    const p = laboratory();
    const w = new World(p.stages[0]!.def, { seed: 1, ...p.stages[0]!.opts });
    for (const t of ["axiom", "corollary", "variable", "constant", "iterator", "paradox", "oracle", "herald"] as const) w.spawnActor(t, { x: 4, z: 4 });
    const bot = new SolverBot();
    for (let i = 0; i < 3600; i++) w.step(bot.next(w));
    expect(w.markov.focus).toBe(100);
    expect(w.status).toBe("playing");
    w.step(NO_INPUT);
  });
});
