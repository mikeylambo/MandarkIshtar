import type { ArenaGeom, EncounterDef, Obstacle, PropDef, SpawnDef, WaveDef } from "../sim/encounter";
import type { BossType, LawId, TheoremType } from "../sim/types";

/** Trials / arenas / formations. Every arena states one question. */
export interface TrialDef { index: number; law: LawId; name: string; newOp: string; boss: BossType; arenas: EncounterDef[]; bossArena: EncounterDef }

const S = (type: TheoremType, a: number, r: number, o: Partial<SpawnDef> = {}): SpawnDef => ({ type, a, r, ...o });
const ring = (type: TheoremType, n: number, r: number, offset = 0, o: Partial<SpawnDef> = {}): SpawnDef[] =>
  Array.from({ length: n }, (_, i) => S(type, offset + (i * 360) / n, r, o));
const W = (spawns: SpawnDef[], delay = 50): WaveDef => ({ spawns, delay });

function count(waves: WaveDef[]): number { return waves.reduce((n, w) => n + w.spawns.length + w.spawns.filter((s) => s.type === "corollary").length, 0); }
/** Par score ≈ every Theorem exploited + finished, plus the par-ops and no-damage bonuses. */
export function parFor(waves: WaveDef[], opsPer = 1.1): { ops: number; score: number } {
  const n = count(waves);
  return { ops: Math.max(3, Math.round(n * opsPer)), score: n * 1500 + 2500 };
}

function arena(id: string, trial: number, law: LawId, geom: Partial<ArenaGeom>, props: PropDef[], waves: WaveDef[], extra: Partial<EncounterDef> = {}): EncounterDef {
  return {
    id, kind: "arena", trial, law,
    arena: { radius: 12, edge: "wall", theme: law, obstacles: [], yawDeg: 0, ...geom },
    props, waves, par: parFor(waves), start: { x: 0, z: -6 }, ...extra,
  };
}

function bossArena(id: string, trial: number, law: LawId, boss: BossType, geom: Partial<ArenaGeom>, props: PropDef[], extra: Partial<EncounterDef> = {}): EncounterDef {
  return {
    id, kind: "boss", trial, law, boss,
    arena: { radius: 14, edge: "wall", theme: law, obstacles: [], yawDeg: 0, ...geom },
    props, waves: [], par: { ops: 30, score: 12000 }, start: { x: 0, z: -8 }, ...extra,
  };
}

const sconce = (x: number, z: number, every = 150, offset = 0, speed = 6): PropDef => ({ type: "sconce", x, z, d: { every, offset, speed } });
const prism = (x: number, z: number): PropDef => ({ type: "prism", x, z });
const light = (x: number, z: number): PropDef => ({ type: "light", x, z });
const pillars = (n: number, r: number, size = 0.8, offset = 0): Obstacle[] => Array.from({ length: n }, (_, i) => { const a = ((offset + (i * 360) / n) * Math.PI) / 180; return { x: Math.sin(a) * r, z: Math.cos(a) * r, r: size }; });

// ---------------- Trial 1: Reflection ----------------
const T1: TrialDef = {
  index: 1, law: "reflection", name: "Reflection", newOp: "vector", boss: "flame",
  arenas: [
    arena("1-1", 1, "reflection", { radius: 11 }, [sconce(0, 10.4, 170), prism(-4, 3), prism(4, 3)],
      [W(ring("axiom", 3, 8, 150)), W(ring("axiom", 3, 8, 30), 60)]),
    arena("1-2", 1, "reflection", { radius: 12 }, [sconce(-8, 8, 160), sconce(8, 8, 160, 80), prism(0, 4), prism(-5, -1), prism(5, -1)],
      [W([...ring("axiom", 3, 8, 180)]), W([S("corollary", 0, 8), S("corollary", 120, 8), S("axiom", 240, 8)])]),
    arena("1-3", 1, "reflection", { radius: 12, edge: "void", obstacles: pillars(3, 5.5, 0.7, 60) }, [sconce(0, 11.5, 150), prism(-3, 0), prism(3, 0), prism(0, 6)],
      [W([...ring("axiom", 4, 8, 45)]), W([S("corollary", 0, 8), S("corollary", 180, 8), S("axiom", 90, 8, { elite: true })])]),
    arena("1-4", 1, "reflection", { radius: 13 }, [sconce(-9, 9, 150), sconce(9, 9, 150, 75), prism(-4, 4), prism(4, 4), prism(0, -2)],
      [W(ring("axiom", 3, 9, 0)), W([S("herald", 0, 9), S("axiom", 60, 8), S("axiom", 300, 8), S("corollary", 180, 8)]), W([S("corollary", 90, 8), S("corollary", 270, 8), S("axiom", 0, 9, { elite: true })])], { heraldMiniLaws: true }),
  ],
  bossArena: bossArena("1-B", 1, "reflection", "flame", { radius: 14 }, [prism(-7, 2), prism(7, 2), prism(-4, -6), prism(4, -6)]),
};

// ---------------- Trial 2: Shadow ----------------
const T2: TrialDef = {
  index: 2, law: "shadow", name: "Shadow", newOp: "phase", boss: "giant",
  arenas: [
    arena("2-1", 2, "shadow", { radius: 11 }, [light(0, 0), sconce(0, 10.4, 160)],
      [W(ring("variable", 3, 8, 0)), W([...ring("variable", 2, 8, 90), S("axiom", 0, 8)])]),
    arena("2-2", 2, "shadow", { radius: 12 }, [light(-4, 0), light(4, 0), sconce(-8, 8, 170), sconce(8, 8, 170, 85)],
      [W([S("axiom", 0, 8, { shadowed: true }), S("axiom", 120, 8, { shadowed: true }), S("variable", 240, 8)]), W([S("variable", 60, 8), S("corollary", 180, 8, { shadowed: true }), S("axiom", 300, 8)])]),
    arena("2-3", 2, "shadow", { radius: 12, obstacles: pillars(4, 6, 0.7, 45) }, [light(0, 3), light(0, -4), sconce(0, 11.5, 150)],
      [W([...ring("variable", 3, 8, 30), S("axiom", 180, 8)]), W([S("corollary", 0, 8, { shadowed: true }), S("variable", 120, 8, { elite: true }), S("axiom", 240, 8, { shadowed: true })])]),
    arena("2-4", 2, "shadow", { radius: 13 }, [light(-5, 2), light(5, 2), light(0, -5), sconce(-9, 9, 160), sconce(9, 9, 160, 80)],
      [W(ring("variable", 3, 9, 0)), W([S("herald", 0, 9), S("variable", 90, 8), S("axiom", 270, 8, { shadowed: true }), S("corollary", 180, 8)]), W([S("variable", 45, 8, { elite: true }), S("axiom", 225, 8)])], { heraldMiniLaws: true }),
  ],
  bossArena: bossArena("2-B", 2, "shadow", "giant", { radius: 15 }, [light(-6, 3), light(6, 3), light(0, -7), { type: "hazardGlyph", x: -6, z: -4, d: { r: 1.8 } }, { type: "hazardGlyph", x: 6, z: -4, d: { r: 1.8 } }, { type: "hazardGlyph", x: 0, z: 7, d: { r: 1.8 } }, sconce(-10, 10, 150), sconce(10, 10, 150, 75)]),
};

// ---------------- Trial 3: Recurrence ----------------
const T3: TrialDef = {
  index: 3, law: "recurrence", name: "Recurrence", newOp: "order", boss: "mirror",
  arenas: [
    arena("3-1", 3, "recurrence", { radius: 11 }, [],
      [W(ring("iterator", 2, 8, 0)), W([S("iterator", 90, 8), S("axiom", 270, 8), S("axiom", 0, 8)])]),
    arena("3-2", 3, "recurrence", { radius: 12, obstacles: pillars(4, 7, 0.7, 0) }, [sconce(0, 11.5, 170)],
      [W([S("iterator", 0, 8), S("variable", 120, 8), S("axiom", 240, 8)]), W([S("iterator", 60, 8), S("iterator", 300, 8), S("corollary", 180, 8)])]),
    arena("3-3", 3, "recurrence", { radius: 12, edge: "void" }, [prism(-4, 2), prism(4, 2)],
      [W([...ring("iterator", 2, 8, 90), S("axiom", 0, 8), S("axiom", 180, 8)]), W([S("iterator", 0, 8, { elite: true }), S("variable", 120, 8), S("corollary", 240, 8)])]),
    arena("3-4", 3, "recurrence", { radius: 13, obstacles: pillars(6, 8, 0.6, 30) }, [sconce(-9, 9, 160), sconce(9, 9, 160, 80)],
      [W(ring("iterator", 3, 9, 0)), W([S("herald", 0, 9), S("iterator", 120, 8), S("axiom", 240, 8), S("variable", 300, 8)]), W([S("iterator", 60, 8, { elite: true }), S("corollary", 180, 8)])], { heraldMiniLaws: true }),
  ],
  bossArena: bossArena("3-B", 3, "recurrence", "mirror", { radius: 13 }, [sconce(-9, 8, 120), sconce(9, 8, 120, 60), sconce(-9, -8, 120, 30), sconce(9, -8, 120, 90)]),
};

// ---------------- Trial 4: Dominion ----------------
const T4: TrialDef = {
  index: 4, law: "dominion", name: "Dominion", newOp: "null", boss: "king",
  arenas: [
    arena("4-1", 4, "dominion", { radius: 11 }, [sconce(0, 10.4, 170)],
      [W([S("constant", 0, 5), S("axiom", 120, 8), S("axiom", 240, 8)]), W([S("constant", 180, 5), S("axiom", 60, 8), S("axiom", 300, 8)])]),
    arena("4-2", 4, "dominion", { radius: 12 }, [sconce(-8, 8, 170), sconce(8, 8, 170, 85)],
      [W([S("herald", 0, 9), S("axiom", 90, 8, { commander: 0 }), S("axiom", 270, 8, { commander: 0 })]), W([S("constant", 180, 5), S("iterator", 0, 8), S("corollary", 120, 8)])], { heraldMiniLaws: false }),
    arena("4-3", 4, "dominion", { radius: 12, edge: "void" }, [],
      [W([S("constant", 0, 4), S("constant", 180, 4), S("axiom", 90, 8), S("axiom", 270, 8)]), W([S("herald", 0, 9), S("variable", 120, 8, { commander: 0 }), S("axiom", 240, 8, { commander: 0, elite: true })])], { heraldMiniLaws: false }),
    arena("4-4", 4, "dominion", { radius: 13 }, [sconce(-9, 9, 160), sconce(9, 9, 160, 80)],
      [W([S("constant", 0, 5), ...ring("axiom", 2, 8, 90)]), W([S("herald", 0, 9), S("iterator", 120, 8, { commander: 0 }), S("axiom", 240, 8, { commander: 0 }), S("corollary", 180, 8)]), W([S("herald", 180, 9), S("constant", 0, 5), S("axiom", 60, 8, { commander: 0, elite: true })])], { heraldMiniLaws: true }),
  ],
  bossArena: bossArena("4-B", 4, "dominion", "king", { radius: 14 }, [sconce(-10, 9, 180), sconce(10, 9, 180, 90)]),
};

// ---------------- Trial 5: Judgment ----------------
const T5: TrialDef = {
  index: 5, law: "judgment", name: "Judgment", newOp: "compounds", boss: "judge",
  arenas: [
    arena("5-1", 5, "judgment", { radius: 11 }, [sconce(0, 10.4, 170)],
      [W([S("paradox", 60, 8), S("paradox", 120, 8), S("axiom", 270, 8)]), W([S("paradox", 200, 8), S("paradox", 260, 8), S("axiom", 30, 8)])]),
    arena("5-2", 5, "judgment", { radius: 12 }, [sconce(-8, 8, 170), sconce(8, 8, 170, 85), prism(0, 3)],
      [W([S("paradox", 0, 8), S("paradox", 60, 8), S("iterator", 200, 8)]), W([S("constant", 180, 5), S("paradox", 90, 8), S("paradox", 150, 8), S("axiom", 300, 8)])]),
    arena("5-3", 5, "judgment", { radius: 12, edge: "void" }, [sconce(0, 11.5, 160)],
      [W([S("paradox", 0, 8), S("paradox", 60, 8), S("variable", 200, 8)]), W([S("paradox", 120, 8, { elite: true }), S("paradox", 180, 8), S("corollary", 300, 8)])]),
    arena("5-4", 5, "judgment", { radius: 13 }, [sconce(-9, 9, 160), sconce(9, 9, 160, 80)],
      [W([S("paradox", 0, 8), S("paradox", 60, 8), S("axiom", 200, 8)]), W([S("herald", 0, 9), S("paradox", 120, 8), S("paradox", 180, 8), S("iterator", 280, 8)]), W([S("constant", 90, 5), S("paradox", 200, 8, { elite: true }), S("paradox", 260, 8)])], { heraldMiniLaws: true }),
  ],
  bossArena: bossArena("5-B", 5, "judgment", "judge", { radius: 13 }, [{ type: "bell", x: 0, z: 11 }, sconce(-9, 8, 160), sconce(9, 8, 160, 80)]),
};

// ---------------- Trial 6: Prophecy ----------------
const T6: TrialDef = {
  index: 6, law: "prophecy", name: "Prophecy", newOp: "stillness", boss: "prophet",
  arenas: [
    arena("6-1", 6, "prophecy", { radius: 11 }, [],
      [W(ring("oracle", 2, 8, 0)), W([S("oracle", 90, 8), S("oracle", 270, 8), S("axiom", 0, 8)])]),
    arena("6-2", 6, "prophecy", { radius: 12 }, [sconce(0, 11.5, 170)],
      [W([S("oracle", 0, 8), S("iterator", 120, 8), S("axiom", 240, 8)]), W([S("oracle", 60, 8), S("variable", 180, 8), S("paradox", 280, 8), S("paradox", 320, 8)])]),
    arena("6-3", 6, "prophecy", { radius: 12, edge: "void", obstacles: pillars(3, 6, 0.7, 0) }, [prism(0, 0)],
      [W([...ring("oracle", 2, 8, 90), S("constant", 0, 4)]), W([S("oracle", 0, 8, { elite: true }), S("corollary", 120, 8), S("axiom", 240, 8)])]),
    arena("6-4", 6, "prophecy", { radius: 13 }, [sconce(-9, 9, 160), sconce(9, 9, 160, 80)],
      [W(ring("oracle", 3, 9, 0)), W([S("herald", 0, 9), S("oracle", 120, 8), S("iterator", 240, 8)]), W([S("oracle", 60, 8, { elite: true }), S("variable", 180, 8), S("axiom", 300, 8)])], { heraldMiniLaws: true }),
  ],
  bossArena: bossArena("6-B", 6, "prophecy", "prophet", { radius: 14 }, [sconce(-10, 9, 150), sconce(10, 9, 150, 75)]),
};

// ---------------- Trial 7: Innocence ----------------
const T7: TrialDef = {
  index: 7, law: "innocence", name: "Innocence", newOp: "following", boss: "child",
  arenas: [
    arena("7-1", 7, "innocence", { radius: 12, edge: "void" }, [sconce(0, 11.5, 170)],
      [W([S("axiom", 0, 8), S("axiom", 120, 8), S("axiom", 240, 8)]), W([S("corollary", 60, 8), S("variable", 180, 8), S("axiom", 300, 8)])]),
    arena("7-2", 7, "innocence", { radius: 12, edge: "void" }, [prism(-3, 2), prism(3, 2)],
      [W([S("iterator", 0, 8), S("oracle", 120, 8), S("axiom", 240, 8)]), W([S("constant", 180, 4), S("axiom", 60, 8), S("axiom", 300, 8)])]),
    arena("7-3", 7, "innocence", { radius: 12, edge: "void" }, [sconce(-8, 8, 170), sconce(8, 8, 170, 85)],
      [W([S("paradox", 0, 8), S("paradox", 60, 8), S("variable", 200, 8)]), W([S("oracle", 120, 8, { elite: true }), S("axiom", 240, 8)])]),
    arena("7-4", 7, "innocence", { radius: 13, edge: "void" }, [sconce(-9, 9, 160), sconce(9, 9, 160, 80)],
      [W([S("axiom", 0, 8), S("iterator", 120, 8), S("oracle", 240, 8)]), W([S("herald", 0, 9), S("corollary", 120, 8), S("variable", 240, 8)]), W([S("constant", 90, 4), S("axiom", 270, 8, { elite: true })])], { heraldMiniLaws: true }),
  ],
  bossArena: bossArena("7-B", 7, "innocence", "child", { radius: 16, edge: "void" }, [], { par: { ops: 0, score: 6000 }, start: { x: 0, z: -1 } }),
};

export const TRIALS: TrialDef[] = [T1, T2, T3, T4, T5, T6, T7];

export function allArenas(): EncounterDef[] { return TRIALS.flatMap((t) => [...t.arenas, t.bossArena]); }
export function encounterById(id: string): EncounterDef | undefined { return allEncounters().find((e) => e.id === id); }

// ---------------- Cold open, hub, laboratory ----------------
export const COLD_OPEN: EncounterDef = {
  id: "cold-open", kind: "coldOpen", law: null,
  arena: { radius: 9, edge: "void", theme: "coldOpen", obstacles: [], yawDeg: 0 },
  props: [{ type: "sconce", x: -6.5, z: 4.5, d: { every: 200, offset: 60, speed: 6, off: 1 } }],
  waves: [], boss: "door", par: { ops: 1, score: 2000 }, start: { x: 0, z: -2 }, regalia: ["strike", "vector", "step"],
};

export const OBSERVATORY: EncounterDef = {
  id: "observatory", kind: "hub", law: null,
  arena: { radius: 15, edge: "wall", theme: "observatory", obstacles: [{ x: 0, z: 0, r: 1.4 }], yawDeg: 0 },
  props: [
    ...Array.from({ length: 7 }, (_, i) => { const a = ((-90 + (i * 180) / 6) * Math.PI) / 180; return { type: "trialDoor" as const, x: Math.sin(a) * 13, z: Math.cos(a) * 13, tag: `trial-${i + 1}` }; }),
    { type: "station", x: -6, z: -9, tag: "codex" },
    { type: "station", x: 6, z: -9, tag: "orrery" },
    { type: "station", x: -10, z: -4, tag: "mirror" },
    { type: "station", x: 10, z: -4, tag: "archive" },
  ],
  waves: [], par: { ops: 0, score: 1 }, start: { x: 0, z: -5 },
};

export const LABORATORY: EncounterDef = {
  id: "laboratory", kind: "lab", law: null,
  arena: { radius: 13, edge: "wall", theme: "laboratory", obstacles: [], yawDeg: 0 },
  props: [sconce(0, 12.5, 180), prism(-4, 3), prism(4, 3), light(0, -4)],
  waves: [], par: { ops: 10, score: 5000 }, start: { x: 0, z: -6 },
};

import { DESCENT_GATES, ISHTAR_ARENA, ASCENT } from "./descent";
export function allEncounters(): EncounterDef[] { return [COLD_OPEN, OBSERVATORY, LABORATORY, ...allArenas(), ...DESCENT_GATES, ISHTAR_ARENA, ...ASCENT]; }
