import { describe, expect, it } from "vitest";
import { World } from "../src/sim/World";
import { encounterById } from "../src/data/trials";
import { BTN, NO_INPUT } from "../src/sim/types";
import { shadowPos } from "../src/actors/bosses/giant";
import { GIANT } from "../src/data/bosses/giant";
import { dist } from "../src/sim/math";
import { input } from "./helpers";

/** Arrange: the Giant stands 3.2 u from a glyph with a light on the far side, so its shadow lies on the glyph. */
function setup(onGlyph: boolean) {
  const w = new World(encounterById("2-B")!, { seed: 5, skipIntro: true, regalia: ["vector", "phase", "order", "step", "strike", "hubris"] });
  const giant = w.director.boss!;
  const glyph = w.props.find((p) => p.type === "hazardGlyph")!;
  const lights = w.props.filter((p) => p.type === "light");
  // place the Giant 3.2 u from the glyph (toward the arena centre) and the nearest light 2 u beyond it
  const ux = -glyph.pos.x, uz = -glyph.pos.z, ul = Math.hypot(ux, uz);
  const u = { x: ux / ul, z: uz / ul };
  giant.pos = { x: glyph.pos.x + u.x * GIANT.shadowLength, z: glyph.pos.z + u.z * GIANT.shadowLength };
  const side = onGlyph ? 1 : 0;
  lights[0]!.pos = side ? { x: giant.pos.x + u.x * 2, z: giant.pos.z + u.z * 2 } : { x: giant.pos.x - u.z * 2, z: giant.pos.z + u.x * 2 };
  for (const l of lights.slice(1)) l.pos = { x: l.pos.x * 3, z: l.pos.z * 3 }; // far away
  w.markov.setPos({ x: giant.pos.x + u.x * 5, z: giant.pos.z + u.z * 5 });
  return { w, giant, glyph };
}

describe("The Giant: Delay the stomp while the shadow lies on another hazard (20%)", () => {
  it("Order-Delay during the stomp telegraph with the shadow on a glyph → Contradiction 20% on the shadow", () => {
    const { w, giant, glyph } = setup(true);
    const shadow = w.actor(giant.d.shadow)!;
    let tele = false;
    for (let i = 0; i < 400 && !tele; i++) { w.step(NO_INPUT); w.markov.setSeals(6); tele = giant.state === "telegraph"; }
    expect(tele).toBe(true);
    expect(dist(shadowPos(w, giant), glyph.pos)).toBeLessThan(glyph.radius + shadow.radius * 0.6);
    const aim = { x: giant.pos.x - w.markov.pos.x, z: giant.pos.z - w.markov.pos.z };
    const before = shadow.certainty;
    w.step(input(aim, BTN.order)); w.step(input(aim, 0));
    let contradiction: number | undefined;
    for (let i = 0; i < 20 && contradiction === undefined; i++) { w.step(NO_INPUT); contradiction = w.events.find((e) => e.type === "Contradiction" && e.id === shadow.id)?.value; }
    expect(contradiction).toBe(GIANT.exploit.delayStompOnHazard);
    expect(before - shadow.certainty).toBeCloseTo(shadow.maxCertainty * GIANT.exploit.delayStompOnHazard, 5);
  });
  it("the same Delay with the shadow off the glyph is only a non-exploit op (6)", () => {
    const { w, giant } = setup(false);
    const shadow = w.actor(giant.d.shadow)!;
    for (let i = 0; i < 400 && giant.state !== "telegraph"; i++) { w.step(NO_INPUT); w.markov.setSeals(6); }
    const aim = { x: giant.pos.x - w.markov.pos.x, z: giant.pos.z - w.markov.pos.z };
    const before = shadow.certainty;
    w.step(input(aim, BTN.order)); w.step(input(aim, 0));
    let contradiction = false;
    for (let i = 0; i < 20; i++) { w.step(NO_INPUT); if (w.events.some((e) => e.type === "Contradiction")) contradiction = true; }
    expect(contradiction).toBe(false);
    expect(before - shadow.certainty).toBeCloseTo(6, 5);
  });
});
