/** GDD §6 input philosophy + default bindings (KBM + standard gamepad). */
export const INPUT = {
  bufferFrames: 8,
  holdThreshold: 20,
  holdRingFrom: 8,
  deadzoneLeft: 0.18,
  deadzoneRight: 0.22,
  aimConeDeg: 30,
  aimRange: 14,
  catchRadius: 3.5,
  proximityFallback: 6,
} as const;

export type GameAction =
  | "moveUp" | "moveDown" | "moveLeft" | "moveRight"
  | "vector" | "phase" | "order" | "null" | "step" | "strike" | "hubris"
  | "pause" | "codex";

export interface Binding { action: GameAction; keyboard: string[]; mouseButtons?: number[]; gamepadButtons?: number[] }

/** Standard Gamepad mapping: 0 A,1 B,2 X,3 Y,4 LB,5 RB,6 LT,7 RT,8 Select,9 Start,10 L3,11 R3,12 Up,13 Down,14 Left,15 Right */
export const DEFAULT_BINDINGS: Binding[] = [
  { action: "moveUp", keyboard: ["KeyW"] },
  { action: "moveDown", keyboard: ["KeyS"] },
  { action: "moveLeft", keyboard: ["KeyA"] },
  { action: "moveRight", keyboard: ["KeyD"] },
  { action: "vector", keyboard: [], mouseButtons: [0], gamepadButtons: [5] },
  { action: "phase", keyboard: [], mouseButtons: [2], gamepadButtons: [4] },
  { action: "order", keyboard: ["KeyQ"], gamepadButtons: [7] },
  { action: "null", keyboard: ["KeyE"], gamepadButtons: [6] },
  { action: "step", keyboard: ["Space", "ShiftLeft"], gamepadButtons: [0] },
  { action: "strike", keyboard: ["KeyF"], mouseButtons: [1], gamepadButtons: [2] },
  { action: "hubris", keyboard: ["KeyT"], gamepadButtons: [12, 10] },
  { action: "pause", keyboard: ["Escape"], gamepadButtons: [9] },
  { action: "codex", keyboard: ["Tab"], gamepadButtons: [8] },
];

export const REMAPPABLE: GameAction[] = ["vector", "phase", "order", "null", "step", "strike", "hubris", "pause", "codex"];
