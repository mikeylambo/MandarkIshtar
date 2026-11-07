/** Core simulation types. The sim is pure data + logic on the XZ plane. */
export interface Vec { x: number; z: number }

export type OpId = "vector" | "phase" | "order" | "null";
export const OPS: OpId[] = ["vector", "phase", "order", "null"];

/** The seven regalia, in LOCKED Descent order. */
export type Regalia = "hubris" | "vector" | "phase" | "order" | "null" | "step" | "strike";
export const REGALIA_ORDER: Regalia[] = ["hubris", "vector", "phase", "order", "null", "step", "strike"];

/** Button bitmask for a semantic input frame. */
export const BTN = {
  vector: 1, phase: 2, order: 4, null: 8, step: 16, strike: 32, hubris: 64,
} as const;
export type ButtonName = keyof typeof BTN;

/**
 * One frame of semantic gameplay input. Device-agnostic.
 * move: analog, magnitude ≤ 1 (deadzone already applied).
 * aim: world-space direction; `aiming` false means "no aim input" (auto-target).
 */
export interface InputFrame { mx: number; mz: number; ax: number; az: number; aiming: boolean; b: number }
export const NO_INPUT: InputFrame = Object.freeze({ mx: 0, mz: 0, ax: 0, az: 0, aiming: false, b: 0 });

export type TheoremType = "axiom" | "corollary" | "variable" | "constant" | "iterator" | "paradox" | "oracle" | "herald";
export type BossType = "flame" | "giant" | "mirror" | "king" | "judge" | "prophet" | "child" | "ishtar";
export type ActorType = TheoremType | BossType | "door" | "freed" | "kingSubject" | "shadow" | "echoBoss";

export type LawId = "reflection" | "shadow" | "recurrence" | "dominion" | "judgment" | "prophecy" | "innocence" | "ishtar";
export const LAW_ORDER: LawId[] = ["reflection", "shadow", "recurrence", "dominion", "judgment", "prophecy", "innocence"];

export type ProjectileShape = "fire" | "bolt" | "command" | "prophecy" | "radiant" | "echo" | "shock" | "ember";
export type Owner = "enemy" | "markov";

export type PropType = "sconce" | "prism" | "light" | "pedestal" | "pillar" | "hazardGlyph" | "station" | "trialDoor" | "pickup" | "bell" | "dawnShaft";

export type DamageKind = "strike" | "op" | "redirect" | "exploit" | "contact" | "wall" | "ringout" | "freed";
