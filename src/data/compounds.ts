import type { OpId } from "../sim/types";

/** GDD §6 Compounds. LOCKED: 18f window (assist 30f). */
export const COMPOUND_WINDOW = 18;
export const COMPOUND_WINDOW_ASSIST = 30;

export type CompoundId =
  | "ghostLance" | "passingTurn" | "recurrence" | "slingshot" | "cleanLine" | "unanchor"
  | "echo" | "fold" | "voidStep" | "severance" | "delayedErase" | "unwind";

export interface CompoundDef { id: CompoundId; first: OpId; second: OpId; name: string }

export const COMPOUNDS: CompoundDef[] = [
  { id: "ghostLance", first: "vector", second: "phase", name: "Ghost Lance" },
  { id: "passingTurn", first: "phase", second: "vector", name: "Passing Turn" },
  { id: "recurrence", first: "vector", second: "order", name: "Recurrence" },
  { id: "slingshot", first: "order", second: "vector", name: "Slingshot" },
  { id: "cleanLine", first: "vector", second: "null", name: "Clean Line" },
  { id: "unanchor", first: "null", second: "vector", name: "Unanchor" },
  { id: "echo", first: "phase", second: "order", name: "Echo" },
  { id: "fold", first: "order", second: "phase", name: "Fold" },
  { id: "voidStep", first: "phase", second: "null", name: "Void Step" },
  { id: "severance", first: "null", second: "phase", name: "Severance" },
  { id: "delayedErase", first: "order", second: "null", name: "Delayed Erase" },
  { id: "unwind", first: "null", second: "order", name: "Unwind" },
];

export function compoundFor(first: OpId, second: OpId): CompoundDef | undefined {
  return COMPOUNDS.find((c) => c.first === first && c.second === second);
}

export const COMPOUND_TUNING = {
  recurrenceRepeats: 2,
  recurrenceSpacing: 20,
  slingshotScale: 3,
  echoDelay: 60,
  echoLifetime: 300,
  delayedEraseDelay: 90,
  delayedEraseRadius: 2.5,
  passThroughDistance: 2.2,
} as const;
