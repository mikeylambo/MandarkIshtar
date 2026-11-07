import { COMPOUND_WINDOW, COMPOUND_WINDOW_ASSIST } from "../data/compounds";
import { INPUT } from "../data/input";
import { BTN, type InputFrame, type OpId } from "../sim/types";

export type IntentKind = "tap" | "hold" | "step" | "strike" | "hubris";
export interface Intent { kind: IntentKind; op?: OpId; frame: number; expires: number }

const OP_BUTTONS: [OpId, number][] = [["vector", BTN.vector], ["phase", BTN.phase], ["order", BTN.order], ["null", BTN.null]];

/**
 * Derives tap / hold / buffered actions from semantic button state.
 * Tap fires on release before the hold threshold; hold fires at the threshold.
 */
export class InputIntent {
  private prev = 0;
  private pressFrame: Record<OpId, number> = { vector: -1, phase: -1, order: -1, null: -1 };
  private holdFired: Record<OpId, boolean> = { vector: false, phase: false, order: false, null: false };
  readonly queue: Intent[] = [];
  /** Hold progress (frames) per op, for the glyph ring. */
  readonly holdFrames: Record<OpId, number> = { vector: 0, phase: 0, order: 0, null: 0 };
  /** Frames since the last gameplay input of any kind (Stillness). */
  idleFrames = 0;

  constructor(public assist: boolean) {}
  get compoundWindow(): number { return this.assist ? COMPOUND_WINDOW_ASSIST : COMPOUND_WINDOW; }

  reset(): void {
    this.queue.length = 0;
    this.prev = 0;
    for (const [op] of OP_BUTTONS) { this.pressFrame[op] = -1; this.holdFired[op] = false; this.holdFrames[op] = 0; }
  }

  isHeld(op: OpId): boolean { return this.pressFrame[op] >= 0; }

  update(input: InputFrame, frame: number): void {
    const b = input.b, pressed = b & ~this.prev, released = ~b & this.prev;
    const exp = frame + INPUT.bufferFrames;
    for (const [op, bit] of OP_BUTTONS) {
      if (pressed & bit) { this.pressFrame[op] = frame; this.holdFired[op] = false; }
      if (this.pressFrame[op] >= 0) {
        const held = frame - this.pressFrame[op];
        this.holdFrames[op] = held;
        if (!this.holdFired[op] && held >= INPUT.holdThreshold) {
          this.holdFired[op] = true;
          this.queue.push({ kind: "hold", op, frame, expires: exp });
        }
      }
      if (released & bit) {
        if (this.pressFrame[op] >= 0 && !this.holdFired[op]) this.queue.push({ kind: "tap", op, frame, expires: exp });
        this.pressFrame[op] = -1; this.holdFrames[op] = 0;
      }
    }
    if (pressed & BTN.step) this.queue.push({ kind: "step", frame, expires: exp });
    if (pressed & BTN.strike) this.queue.push({ kind: "strike", frame, expires: exp });
    if (pressed & BTN.hubris) this.queue.push({ kind: "hubris", frame, expires: exp });
    // drop expired
    for (let i = this.queue.length - 1; i >= 0; i--) if (this.queue[i]!.expires < frame) this.queue.splice(i, 1);
    const moving = Math.hypot(input.mx, input.mz) > 0.05;
    if (b !== 0 || moving) this.idleFrames = 0; else this.idleFrames++;
    this.prev = b;
  }

  /** Remove and return the first queued intent accepted by `pred`. */
  take(pred: (i: Intent) => boolean): Intent | null {
    const idx = this.queue.findIndex(pred);
    if (idx < 0) return null;
    return this.queue.splice(idx, 1)[0]!;
  }
  peek(pred: (i: Intent) => boolean): Intent | null { return this.queue.find(pred) ?? null; }
}
