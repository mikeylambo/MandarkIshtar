import type { EncounterDef } from "../sim/encounter";
import { REGALIA_ORDER, type BossType, type LawId, type Regalia } from "../sim/types";

/** The Descent: 7 gates; each takes one regalia (LOCKED order), then an echo arena solvable with what remains. */
export interface GateDef { gate: number; taken: Regalia; echo: BossType; law: LawId; solvableWith: string }
export const GATES: GateDef[] = [
  { gate: 1, taken: "hubris", echo: "flame", law: "reflection", solvableWith: "Vector, prisms" },
  { gate: 2, taken: "vector", echo: "giant", law: "shadow", solvableWith: "Phase into shadow, Strike the shadow" },
  { gate: 3, taken: "phase", echo: "mirror", law: "recurrence", solvableWith: "Order" },
  { gate: 4, taken: "order", echo: "king", law: "dominion", solvableWith: "Null frees subjects" },
  { gate: 5, taken: "null", echo: "judge", law: "judgment", solvableWith: "Step/Strike variety, morning bell" },
  { gate: 6, taken: "step", echo: "prophet", law: "prophecy", solvableWith: "Stillness + Strike" },
  { gate: 7, taken: "strike", echo: "child", law: "innocence", solvableWith: "Following" },
];

export function regaliaAfterGate(n: number): Regalia[] { return REGALIA_ORDER.slice(n); }

const sconce = (x: number, z: number, every = 140, offset = 0) => ({ type: "sconce" as const, x, z, d: { every, offset, speed: 6 } });

function gateProps(boss: BossType) {
  switch (boss) {
    case "flame": return [{ type: "prism" as const, x: -6, z: 2 }, { type: "prism" as const, x: 6, z: 2 }, { type: "prism" as const, x: 0, z: -6 }];
    case "giant": return [{ type: "light" as const, x: -5, z: 3 }, { type: "light" as const, x: 5, z: 3 }, { type: "light" as const, x: 0, z: -6 }];
    case "mirror": return [sconce(-8, 7, 110), sconce(8, 7, 110, 55)];
    case "judge": return [{ type: "bell" as const, x: 0, z: 10 }];
    default: return [];
  }
}

export const DESCENT_GATES: EncounterDef[] = GATES.map((g) => ({
  id: `gate-${g.gate}`, kind: "gate", gate: g.gate, law: g.law, boss: g.echo, echo: true,
  arena: { radius: g.echo === "child" ? 15 : 12, edge: g.echo === "child" ? "void" : "wall", theme: "descent", obstacles: [], yawDeg: 0 },
  props: gateProps(g.echo), waves: [], par: { ops: 12, score: 6000 }, start: { x: 0, z: g.echo === "child" ? -1 : -7 },
  regalia: regaliaAfterGate(g.gate),
}));

export const ISHTAR_ARENA: EncounterDef = {
  id: "ishtar", kind: "ishtar", law: "ishtar", boss: "ishtar",
  arena: { radius: 13, edge: "void", theme: "dawn", obstacles: [], yawDeg: 0 },
  props: [], waves: [], par: { ops: 0, score: 1 }, start: { x: 0, z: 8 }, regalia: [],
};

/** The Ascent: climb back through the 7 gates, each regalia returned in white. Joy-run, no Seals loss. */
export const ASCENT: EncounterDef[] = Array.from({ length: 7 }, (_, i) => {
  const gate = i + 1;
  const regalia = REGALIA_ORDER.slice(7 - gate);
  const types = (["axiom", "axiom", "corollary", "iterator", "constant", "oracle", "herald"] as const).slice(0, Math.min(7, 2 + i));
  return {
    id: `ascent-${gate}`, kind: "ascent" as const, gate, law: null,
    arena: { radius: 12, edge: "void" as const, theme: "ascent" as const, obstacles: [], yawDeg: 0 },
    props: [sconce(0, 11.5, 120)], noSealLoss: true, regalia,
    waves: [{ spawns: types.map((t, k) => ({ type: t, a: (k * 360) / types.length, r: 8 })) }],
    par: { ops: 6, score: 4000 }, start: { x: 0, z: -6 },
  };
});
