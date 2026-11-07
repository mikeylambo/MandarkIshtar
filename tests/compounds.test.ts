import { describe, expect, it } from "vitest";
import { BTNS, events, hold, idle, input, tap, world } from "./helpers";
import { dist, len } from "../src/sim/math";
import { COMPOUNDS } from "../src/data/compounds";

const UP = { x: 0, z: 1 };
function shot(w: ReturnType<typeof world>, z = 3, vz = -1) {
  return w.spawnProjectile({ pos: { x: 0, z }, vel: { x: 0, z: vz }, owner: "enemy", shooterId: 0, shape: "bolt" });
}

describe("compounds — each produces its specified effect", () => {
  it("covers all 12 ordered pairs", () => { expect(COMPOUNDS.length).toBe(12); });

  it("Vector → Phase: Ghost Lance (passes shields, ×1.5)", () => {
    const w = world(); const p = shot(w);
    tap(w, "vector", UP); tap(w, "phase", UP); idle(w, 10);
    expect(p.ghost).toBe(true); expect(p.damageScale).toBe(1.5); expect(p.owner).toBe("markov");
  });
  it("Phase → Vector: Passing Turn (step through, fling it back)", () => {
    const w = world(); const a = w.spawnActor("corollary", { x: 0, z: 3 }, { spawnFrames: 0 });
    tap(w, "phase", UP); tap(w, "vector", UP); idle(w, 6);
    expect(w.markov.pos.z).toBeGreaterThan(a.pos.z);
    expect(a.thrownT > 0 || a.vel.z < 0 || a.pos.z < 3).toBe(true);
  });
  it("Vector → Order: Recurrence (path repeats twice)", () => {
    const w = world(); shot(w);
    tap(w, "vector", UP); tap(w, "order", UP);
    const echoes = events(w, 60, "ProjectileSpawn");
    expect(echoes).toBe(2);
  });
  it("Order → Vector: Slingshot (release at 3× speed)", () => {
    const w = world(); const p = shot(w, 3, -0.5);
    tap(w, "order", UP); tap(w, "vector", UP); idle(w, 12);
    expect(len(p.vel)).toBeCloseTo(66, 0);
  });
  it("Vector → Null: Clean Line (erases enemy shots it crosses)", () => {
    const w = world(); const p = shot(w, 2, -0.1);
    tap(w, "vector", UP); tap(w, "null", UP);
    const victim = w.spawnProjectile({ pos: { x: 0, z: 9 }, vel: { x: 0, z: 0 }, owner: "enemy", shooterId: 0, shape: "bolt" });
    idle(w, 40);
    expect(p.cleanLine).toBe(true); expect(victim.alive).toBe(false);
  });
  it("Null → Vector: Unanchor (Constant becomes a missile)", () => {
    const w = world(); const c = w.spawnActor("constant", { x: 0, z: 3 }, { spawnFrames: 0 });
    hold(w, "null", UP); tap(w, "vector", { x: 1, z: 0 }); idle(w, 4);
    expect(c.immovable).toBe(false);
    expect(c.thrownT > 0 || c.state === "broken" || !c.alive).toBe(true);
  });
  it("Phase → Order: Echo (repeats your next op 60f later from its position)", () => {
    const w = world(); shot(w, 10, 0);
    tap(w, "phase", UP); tap(w, "order", UP); idle(w, 30);
    tap(w, "vector", UP);
    expect(events(w, 70, "Echo")).toBeGreaterThanOrEqual(1);
  });
  it("Order → Phase: Fold (reversed target phases through obstacles)", () => {
    const w = world(); const shooter = w.spawnActor("iterator", { x: 0, z: 10 }, { spawnFrames: 0 });
    const p = w.spawnProjectile({ pos: { x: 0, z: 2.5 }, vel: { x: 0, z: -0.2 }, owner: "enemy", shooterId: shooter.id, shape: "bolt" });
    for (let i = 0; i < 21; i++) w.step(input(UP, BTNS.order));
    w.step(input(UP, 0)); tap(w, "phase", UP); idle(w, 4);
    expect(p.reversed).toBe(true); expect(p.phasedT).toBeGreaterThan(0); expect(p.ghost).toBe(true);
  });
  it("Phase → Null: Void Step (pass through strips its buff)", () => {
    const w = world(); const h = w.spawnActor("herald", { x: 0, z: 9 }, { spawnFrames: 0 });
    const a = w.spawnActor("axiom", { x: 0, z: 3 }, { spawnFrames: 0 });
    w.ledger.applyBuff(w, a, h, 600);
    tap(w, "phase", UP); tap(w, "null", UP); idle(w, 6);
    expect(a.buffT).toBe(0); expect(w.markov.pos.z).toBeGreaterThan(3);
  });
  it("Null → Phase: Severance (cuts the Paradox link: both Contradict)", () => {
    const w = world(); const a = w.spawnActor("paradox", { x: -1, z: 4 }, { spawnFrames: 0 }); const b = w.spawnActor("paradox", { x: 2, z: 7 }, { spawnFrames: 0 });
    a.linkId = b.id; b.linkId = a.id;
    tap(w, "null", { x: -0.24, z: 0.97 }); tap(w, "phase", UP); idle(w, 20);
    expect(a.state).toBe("broken"); expect(b.state).toBe("broken");
  });
  it("Order → Null: Delayed Erase (everything in 2.5 u erased 90f later)", () => {
    const w = world(); const p = shot(w, 4, 0);
    tap(w, "order", UP); tap(w, "null", UP);
    const near = w.spawnProjectile({ pos: { x: 1, z: 4.5 }, vel: { x: 0, z: 0 }, owner: "enemy", shooterId: 0, shape: "bolt" });
    idle(w, 60); expect(near.alive).toBe(true);
    idle(w, 40); expect(near.alive).toBe(false); void p;
  });
  it("Null → Order: Unwind (strips a buff and reverses its last effect)", () => {
    const w = world(); const h = w.spawnActor("herald", { x: 6, z: 9 }, { spawnFrames: 0 }); const a = w.spawnActor("corollary", { x: 0, z: 3 }, { spawnFrames: 0 });
    w.ledger.applyBuff(w, a, h, 600); const max = a.maxCertainty;
    tap(w, "null", UP); tap(w, "order", UP); idle(w, 20);
    expect(a.buffT).toBe(0); expect(a.maxCertainty).toBeLessThan(max);
  });
});

describe("compound window (LOCKED 18f)", () => {
  function gap(n: number, assist = false): boolean {
    const w = world({}, { compoundAssist: assist }); shot(w, 3, -0.3);
    w.step(input(UP, BTNS.vector)); w.step(input(UP, 0));
    const f0 = w.frame;
    let fired = 0;
    while (w.frame < f0 + n - 2) w.step(input(UP, 0));
    w.step(input(UP, BTNS.phase));
    w.step(input(UP, 0));
    expect(w.frame - f0).toBe(n);
    for (const e of w.events) if (e.type === "CompoundCast") fired++;
    idle(w, 3);
    return fired > 0;
  }
  it("17f fuses", () => expect(gap(17)).toBe(true));
  it("18f fuses", () => expect(gap(18)).toBe(true));
  it("19f does not", () => expect(gap(19)).toBe(false));
  it("assist widens to 30f", () => { expect(gap(29, true)).toBe(true); expect(gap(31, true)).toBe(false); });
});

describe("Stillness → Insight", () => {
  it("triggers at exactly 60f of zero input", () => {
    const w = world();
    let at = -1;
    const start = w.frame;
    for (let i = 0; i < 90; i++) { w.step(input(null)); if (w.events.some((e) => e.type === "InsightStart")) { at = w.frame - start; break; } }
    expect(at).toBe(60);
  });
  it("any input resets the count", () => {
    const w = world(); idle(w, 50); w.step(input(null, 0, { x: 1, z: 0 })); idle(w, 50);
    expect(w.markov.insightT).toBe(0); idle(w, 10); expect(w.markov.insightT).toBeGreaterThan(0);
  });
  it("is interrupted by a hit", () => {
    const w = world(); idle(w, 61); expect(w.markov.insightT).toBeGreaterThan(0);
    w.spawnProjectile({ pos: { x: 0, z: 1 }, vel: { x: 0, z: -6 }, owner: "enemy", shooterId: 0, shape: "bolt" });
    idle(w, 12);
    expect(w.markov.insightT).toBe(0); expect(w.markov.seals).toBe(5);
  });
  it("slows the world to ×0.7", () => { const w = world(); idle(w, 61); expect(w.worldScale).toBeCloseTo(0.7); void dist; });
});
