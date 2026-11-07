import type { ActorType, LawId, PropType, Regalia, TheoremType } from "./types";

export type ArenaTheme = LawId | "observatory" | "descent" | "dawn" | "coldOpen" | "laboratory" | "ascent";
export type EncounterKind = "coldOpen" | "arena" | "boss" | "gate" | "ishtar" | "ascent" | "hub" | "lab" | "credits";

export interface Obstacle { x: number; z: number; r: number }
export interface ArenaGeom {
  radius: number;
  edge: "wall" | "void";
  theme: ArenaTheme;
  obstacles: Obstacle[];
  yawDeg: number;
}

export interface SpawnDef {
  type: TheoremType;
  /** Polar placement: angle (deg, 0 = +Z) and distance from arena center. */
  a: number;
  r: number;
  elite?: boolean;
  shadowed?: boolean;
  /** Index into this wave's spawns of the commander (Dominion). */
  commander?: number;
}
export interface WaveDef { spawns: SpawnDef[]; /** frames after the previous wave was cleared */ delay?: number }
export interface PropDef { type: PropType; x: number; z: number; tag?: string; d?: Record<string, number> }

export interface EncounterDef {
  id: string;
  kind: EncounterKind;
  trial?: number;
  law: LawId | null;
  arena: ArenaGeom;
  props: PropDef[];
  waves: WaveDef[];
  boss?: ActorType;
  echo?: boolean;
  par: { ops: number; score: number };
  start?: { x: number; z: number };
  /** Overrides the available regalia (Descent / Ascent / cold open). */
  regalia?: Regalia[];
  noSealLoss?: boolean;
  /** Gate number for Descent/Ascent encounters. */
  gate?: number;
  heraldMiniLaws?: boolean;
  label?: string;
}
