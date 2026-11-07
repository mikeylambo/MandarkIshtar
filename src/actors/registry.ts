import type { World } from "../sim/World";
import type { Actor } from "../sim/entities";
import type { ActorType, Vec } from "../sim/types";
import type { Behavior } from "./Behavior";
import { axiom } from "./theorems/axiom";
import { corollary } from "./theorems/corollary";
import { variable } from "./theorems/variable";
import { constant } from "./theorems/constant";
import { iterator } from "./theorems/iterator";
import { paradox } from "./theorems/paradox";
import { oracle } from "./theorems/oracle";
import { herald } from "./theorems/herald";
import { BOSS_BEHAVIORS } from "./bosses/index";

const REGISTRY: Partial<Record<ActorType, Behavior>> = {
  axiom, corollary, variable, constant, iterator, paradox, oracle, herald,
  ...BOSS_BEHAVIORS,
};

export function behaviorFor(type: ActorType): Behavior {
  const b = REGISTRY[type];
  if (!b) throw new Error(`No behavior for actor type ${type}`);
  return b;
}

/** Where bodies/projectiles strike this actor (Shadow law, Giant shadow). */
export function hitPointOf(w: World, a: Actor): Vec {
  const b = behaviorFor(a.type);
  if (b.hitPoint) return b.hitPoint(w, a);
  if (a.shadowed) return w.law.shadowPoint(a);
  return a.pos;
}
