import { World, type WorldOptions } from "../src/sim/World";
import type { EncounterDef } from "../src/sim/encounter";
import { BTN, NO_INPUT, type InputFrame, type OpId, type Vec } from "../src/sim/types";

export function testArena(o: Partial<EncounterDef> = {}): EncounterDef {
  return { id: "test", kind: "lab", law: null, arena: { radius: 16, edge: "wall", theme: "laboratory", obstacles: [], yawDeg: 0 }, props: [], waves: [], par: { ops: 5, score: 5000 }, start: { x: 0, z: 0 }, ...o };
}
export function world(o: Partial<EncounterDef> = {}, opts: Partial<WorldOptions> = {}): World {
  return new World(testArena(o), { seed: 1, skipIntro: true, ...opts });
}
export const BTNS: Record<OpId, number> = { vector: BTN.vector, phase: BTN.phase, order: BTN.order, null: BTN.null };
export function input(aim: Vec | null, b = 0, move: Vec | null = null): InputFrame {
  return { mx: move?.x ?? 0, mz: move?.z ?? 0, ax: aim?.x ?? 0, az: aim?.z ?? 0, aiming: !!aim, b };
}
export function idle(w: World, n: number, aim: Vec | null = null): void { for (let i = 0; i < n; i++) w.step(aim ? input(aim) : NO_INPUT); }
/** Press 1 frame, release (tap fires on the release frame). Returns the release frame. */
export function tap(w: World, op: OpId, aim: Vec): number { w.step(input(aim, BTNS[op])); w.step(input(aim, 0)); return w.frame; }
export function hold(w: World, op: OpId, aim: Vec, frames = 21): void { for (let i = 0; i < frames; i++) w.step(input(aim, BTNS[op])); w.step(input(aim, 0)); }
export function events(w: World, n: number, type: string, aim: Vec | null = null): number {
  let c = 0; for (let i = 0; i < n; i++) { w.step(aim ? input(aim) : NO_INPUT); c += w.events.filter((e) => e.type === type).length; } return c;
}
