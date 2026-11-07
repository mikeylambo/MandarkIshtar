import { describe, expect, it } from "vitest";
import { world, input, idle } from "./helpers";
import { MOVEMENT } from "../src/data/movement";

describe("Feel Gate (sim side)", () => {
  it("input-to-motion latency ≤ 2 frames", () => {
    const w = world();
    idle(w, 5);
    const x0 = w.markov.pos.x;
    let frames = 0;
    for (; frames < 5; frames++) { w.step(input(null, 0, { x: 1, z: 0 })); if (w.markov.pos.x !== x0) break; }
    expect(frames + 1).toBeLessThanOrEqual(2);
  });
  it("reaches top speed in 6f and stops in 4f", () => {
    const w = world();
    for (let i = 0; i < 6; i++) w.step(input(null, 0, { x: 1, z: 0 }));
    expect(Math.hypot(w.markov.vel.x, w.markov.vel.z)).toBeCloseTo(MOVEMENT.topSpeed, 5);
    for (let i = 0; i < 4; i++) w.step(input(null));
    expect(Math.hypot(w.markov.vel.x, w.markov.vel.z)).toBeCloseTo(0, 5);
  });
  it("the redirect path is deterministic (replay)", () => {
    const run = () => {
      const w = world();
      w.spawnActor("axiom", { x: 0, z: 2.5 }, { spawnFrames: 0 }); w.spawnActor("corollary", { x: 0, z: 8 }, { spawnFrames: 0 });
      const trace: string[] = [];
      for (let i = 0; i < 120; i++) { w.step(input({ x: 0, z: 1 }, i === 2 ? 1 : 0)); trace.push(w.actors.map((a) => `${a.pos.x.toFixed(4)},${a.pos.z.toFixed(4)},${a.certainty}`).join("|")); }
      return trace.join("\n") + w.hashState();
    };
    expect(run()).toBe(run());
  });
});
