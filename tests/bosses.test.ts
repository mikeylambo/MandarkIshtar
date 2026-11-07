import { describe, expect, it } from "vitest";
import { World } from "../src/sim/World";
import { encounterById } from "../src/data/trials";
import { BTN, NO_INPUT, type InputFrame } from "../src/sim/types";
import { chainOf } from "../src/actors/bosses/prophet";
import { input } from "./helpers";
import { SolverBot } from "../src/dev/bots/SolverBot";
import { runEncounter } from "../src/dev/bots/runner";
import { ISHTAR } from "../src/data/bosses/ishtar";
import type { Bot } from "../src/dev/bots/BotKit";

const def = (id: string) => encounterById(id)!;

describe("The Prophet is a literal Markov chain", () => {
  it("a bot repeating a fixed loop is predicted > 80% of the time", () => {
    const w = new World(def("6-B"), { seed: 5, skipIntro: true, infiniteFocus: true });
    const loop: InputFrame[][] = [
      Array(30).fill(input(null, 0, { x: 1, z: 0 })),
      [input({ x: 0, z: 1 }, BTN.vector), ...Array(29).fill(input({ x: 0, z: 1 }))],
      Array(30).fill(input(null, 0, { x: -1, z: 0 })),
      [input(null, BTN.step, { x: 0, z: -1 }), ...Array(29).fill(input(null, 0, { x: 0, z: -1 }))],
    ];
    w.markov.setSeals(6);
    for (let k = 0; k < 40; k++) for (const seg of loop) for (const f of seg) { w.step(f); w.markov.setSeals(6); }
    const prophet = w.director.boss!;
    const chain = chainOf(prophet)!;
    console.log(`prophet accuracy on fixed loop: ${(chain.accuracy * 100).toFixed(1)}% over ${chain.predictions} predictions`);
    expect(chain.accuracy).toBeGreaterThan(0.8);
  });
  it("a bot using Stillness stalls it and opens the core (30%)", () => {
    const w = new World(def("6-B"), { seed: 5, skipIntro: true });
    const prophet = w.director.boss!;
    let stalled = false;
    for (let i = 0; i < 120; i++) { w.step(NO_INPUT); if (prophet.d.stalled) stalled = true; }
    expect(stalled).toBe(true);
    expect(w.markov.insightT).toBeGreaterThan(0);
    const before = prophet.certainty;
    const aim = { x: prophet.pos.x - w.markov.pos.x, z: prophet.pos.z - w.markov.pos.z };
    w.step(input(aim, BTN.vector)); w.step(input(aim, 0));
    for (let i = 0; i < 10; i++) w.step(NO_INPUT);
    expect(before - prophet.certainty).toBeCloseTo(prophet.maxCertainty * 0.3, 0);
  });
});

class AttackBot implements Bot { name = "attacker"; private f = 0; next(w: World): InputFrame { this.f++; const c = w.director.boss!; const aim = { x: c.pos.x - w.markov.pos.x, z: c.pos.z - w.markov.pos.z }; const mv = Math.hypot(aim.x, aim.z) > 2 ? aim : null; return input(aim, this.f % 20 < 2 ? BTN.vector : this.f % 20 > 10 && this.f % 20 < 12 ? BTN.strike : 0, mv); } }

describe("The Child", () => {
  it("a bot that attacks never progresses", () => {
    const r = runEncounter(def("7-B"), { seed: 2, skipIntro: true }, new AttackBot(), 9000);
    expect(r.status).not.toBe("clear");
    expect(r.world.director.boss!.d.progress).toBeLessThan(r.world.director.boss!.d.goal * 0.25);
  });
  it("a bot that follows completes it, and the Child is never damaged", () => {
    const r = runEncounter(def("7-B"), { seed: 2, skipIntro: true }, new SolverBot(), 9000);
    expect(r.status).toBe("clear");
    expect(r.world.ledger.dealt).toEqual({});
  });
});

describe("Ishtar", () => {
  it("taking a temptation resets phase 1", () => {
    const w = new World(def("ishtar"), { seed: 3, startPhase: 2 });
    const ish = w.director.boss!;
    expect(ish.d.phase).toBe(2);
    const pick = w.props.find((p) => p.type === "pickup")!;
    let reset = false;
    for (let i = 0; i < 600 && !reset; i++) {
      const d = { x: pick.pos.x - w.markov.pos.x, z: pick.pos.z - w.markov.pos.z };
      w.step(input(null, 0, d));
      reset = w.events.some((e) => e.type === "TemptationTaken") && ish.d.phase === 1;
    }
    expect(reset).toBe(true);
    expect(w.markov.regalia.has(pick.tag as never)).toBe(true);
  });
  it("zero input in phase 3 completes the dawn in 10 s ± 1f", () => {
    const w = new World(def("ishtar"), { seed: 3, startPhase: 3, skipIntro: true });
    const start = w.frame;
    let done = -1;
    for (let i = 0; i < 700; i++) { w.step(NO_INPUT); if (w.events.some((e) => e.type === "NameReveal")) { done = w.frame - start; break; } }
    expect(Math.abs(done - ISHTAR.dawnFrames)).toBeLessThanOrEqual(1);
  });
  it("struggling only delays; it cannot be lost", () => {
    const w = new World(def("ishtar"), { seed: 3, startPhase: 3, skipIntro: true });
    for (let i = 0; i < 1200; i++) w.step(input(null, i % 3 === 0 ? BTN.strike : 0, { x: 1, z: 0 }));
    expect(w.status).not.toBe("lost");
    expect(w.markov.seals).toBe(w.markov.maxSeals);
  });
});
