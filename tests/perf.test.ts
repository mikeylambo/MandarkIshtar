import { describe, expect, it } from "vitest";
import { performance } from "node:perf_hooks";
import { World } from "../src/sim/World";
import { LABORATORY } from "../src/data/trials";
import { SolverBot } from "../src/dev/bots/SolverBot";
import { PERF } from "../src/data/perf";
import type { ActorType } from "../src/sim/types";
import { writeFileSync, mkdirSync } from "node:fs";

describe("perf: sim at peak density (40 enemies + 400 projectiles)", () => {
  it(`p95 sim step ≤ ${PERF.simMs} ms`, () => {
    const w = new World({ ...LABORATORY, noSealLoss: true }, { seed: 3, skipIntro: true, infiniteFocus: true });
    const types: ActorType[] = ["axiom", "corollary", "variable", "constant", "iterator", "paradox", "oracle", "herald"];
    for (let i = 0; i < PERF.stress.enemies; i++) { const a = (i / 40) * Math.PI * 2; w.spawnActor(types[i % 8]!, { x: Math.sin(a) * 9, z: Math.cos(a) * 9 }, { spawnFrames: 0 }); }
    const keep = () => { while (w.projectiles.filter((p) => p.alive).length < PERF.stress.projectiles) { const k = w.projectiles.length; const a = k * 0.37; w.spawnProjectile({ pos: { x: Math.sin(a) * (2 + (k % 10)), z: Math.cos(a) * (2 + (k % 10)) }, vel: { x: Math.cos(a), z: -Math.sin(a) }, owner: "enemy", shooterId: 0, shape: "bolt", life: 1e9 }); } };
    const bot = new SolverBot();
    const times: number[] = [];
    for (let f = 0; f < 900; f++) {
      keep();
      const inp = bot.next(w);
      const t0 = performance.now(); w.step(inp); times.push(performance.now() - t0);
    }
    times.sort((a, b) => a - b);
    const p50 = times[Math.floor(times.length * 0.5)]!, p95 = times[Math.floor(times.length * 0.95)]!;
    const alive = { enemies: w.actors.filter((a) => a.alive).length, projectiles: w.projectiles.filter((p) => p.alive).length };
    mkdirSync("captures", { recursive: true });
    writeFileSync("captures/perf-sim.json", JSON.stringify({ p50, p95, ...alive, targetMs: PERF.simMs }, null, 2));
    console.log(`sim step p50 ${p50.toFixed(3)} ms, p95 ${p95.toFixed(3)} ms with ${alive.enemies} actors / ${alive.projectiles} projectiles`);
    expect(p95).toBeLessThanOrEqual(PERF.simMs);
  });
});
