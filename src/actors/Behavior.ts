import type { World } from "../sim/World";
import type { Actor, Projectile } from "../sim/entities";
import type { DamageInfo } from "../combat/CertaintyLedger";
import type { CompoundId } from "../data/compounds";
import type { OpId, Vec } from "../sim/types";

export type HookResult = "handled" | "pass" | void;
export interface Stats { certainty: number; radius: number; boss?: boolean; invulnerable?: boolean; armored?: boolean; immovable?: boolean }

/** Per-type actor behavior. Hooks return "handled" to override the generic rule. */
export interface Behavior {
  stats(w: World): Stats;
  init(w: World, a: Actor): void;
  update(w: World, a: Actor, dt: number): void;
  countsForClear?: boolean;
  targetable?: boolean;
  passable?: boolean;
  targetPoint?(w: World, a: Actor): Vec;
  hitPoint?(w: World, a: Actor): Vec;
  strikePoint?(w: World, a: Actor): Vec;
  modifyDamage?(w: World, a: Actor, dmg: number, info: DamageInfo): number;
  onDamaged?(w: World, a: Actor, amount: number, info: DamageInfo): void;
  onBroken?(w: World, a: Actor): HookResult;
  onRecovered?(w: World, a: Actor): void;
  onRemoved?(w: World, a: Actor): void;
  onRingOut?(w: World, a: Actor): HookResult;
  onStrike?(w: World, a: Actor): HookResult;
  onOp?(w: World, a: Actor, op: OpId, mode: "tap" | "hold", aim: Vec): HookResult;
  onCompound?(w: World, a: Actor, id: CompoundId): HookResult;
  onProjectile?(w: World, a: Actor, p: Projectile): HookResult;
  onHitByBody?(w: World, a: Actor, thrown: Actor): HookResult;
  onThrownImpact?(w: World, a: Actor, hit: Actor | null): HookResult;
  onStrip?(w: World, a: Actor): HookResult;
  onSever?(w: World, a: Actor): HookResult;
  onUnwind?(w: World, a: Actor): HookResult;
  onImmune?(w: World, a: Actor, info: DamageInfo): void;
  /** Markov (spectral) overlapping this actor. */
  onSpectralContact?(w: World, a: Actor): void;
}
