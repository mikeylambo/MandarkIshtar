import { BrowserInputSource, InputManager, applyRadialDeadzone, type InputBinding } from "@slu/web-shell";
import { DEFAULT_BINDINGS, type Binding, type GameAction } from "../data/input";
import { BTN, type InputFrame } from "../sim/types";

/**
 * One semantic input layer over the shell's InputManager + BrowserInputSource:
 * KBM and standard gamepad → gameplay InputFrame + UI navigation actions. Gameplay never sees devices.
 */
const UI_BINDINGS: InputBinding[] = [
  { action: "ui_up", keyboard: ["ArrowUp", "KeyW"], gamepadButtons: [12], gamepadAxes: [{ axis: 1, direction: -1, threshold: 0.6 }] },
  { action: "ui_down", keyboard: ["ArrowDown", "KeyS"], gamepadButtons: [13], gamepadAxes: [{ axis: 1, direction: 1, threshold: 0.6 }] },
  { action: "ui_left", keyboard: ["ArrowLeft", "KeyA"], gamepadButtons: [14], gamepadAxes: [{ axis: 0, direction: -1, threshold: 0.6 }] },
  { action: "ui_right", keyboard: ["ArrowRight", "KeyD"], gamepadButtons: [15], gamepadAxes: [{ axis: 0, direction: 1, threshold: 0.6 }] },
  { action: "ui_accept", keyboard: ["Enter", "Space"], gamepadButtons: [0] },
  { action: "ui_back", keyboard: ["Escape", "Backspace"], gamepadButtons: [1] },
  { action: "ui_tabL", keyboard: ["KeyQ"], gamepadButtons: [4] },
  { action: "ui_tabR", keyboard: ["KeyE"], gamepadButtons: [5] },
  { action: "ui_any", keyboard: ["Enter", "Space", "KeyF", "Escape"], mouseButtons: [0], gamepadButtons: [0, 1, 2, 3, 9] },
];
const STICKS: InputBinding[] = [
  { action: "lx+", gamepadAxes: [{ axis: 0, direction: 1, threshold: 0.001 }] }, { action: "lx-", gamepadAxes: [{ axis: 0, direction: -1, threshold: 0.001 }] },
  { action: "ly+", gamepadAxes: [{ axis: 1, direction: 1, threshold: 0.001 }] }, { action: "ly-", gamepadAxes: [{ axis: 1, direction: -1, threshold: 0.001 }] },
  { action: "rx+", gamepadAxes: [{ axis: 2, direction: 1, threshold: 0.001 }] }, { action: "rx-", gamepadAxes: [{ axis: 2, direction: -1, threshold: 0.001 }] },
  { action: "ry+", gamepadAxes: [{ axis: 3, direction: 1, threshold: 0.001 }] }, { action: "ry-", gamepadAxes: [{ axis: 3, direction: -1, threshold: 0.001 }] },
];
const ACTION_BTN: Partial<Record<GameAction, number>> = { vector: BTN.vector, phase: BTN.phase, order: BTN.order, null: BTN.null, step: BTN.step, strike: BTN.strike, hubris: BTN.hubris };

export class InputDevice {
  readonly input = new InputManager();
  private source: BrowserInputSource | null = null;
  private detach: (() => void) | null = null;
  bindings: Binding[] = structuredClone(DEFAULT_BINDINGS);
  deadzoneL = 0.18;
  deadzoneR = 0.22;
  holdToggle = false;
  private toggled = 0;
  private prevRaw = 0;
  /** Mouse ground point in world XZ (set by the renderer each frame). */
  mouseWorld: { x: number; z: number } | null = null;
  mouseMovedAt = -1;
  lastPad = false;
  private lastAim = { x: 0, z: 1 };
  private frame = 0;

  constructor(private readonly target: HTMLElement) {
    target.addEventListener("contextmenu", (e) => e.preventDefault());
    window.addEventListener("keydown", (e) => { if (["Tab", "Space", "ArrowUp", "ArrowDown"].includes(e.code)) e.preventDefault(); });
    this.rebuild();
  }

  /** Probe for remapping: which standard-gamepad buttons went down this frame (via the shell source, no direct navigator access). */
  private probe: BrowserInputSource | null = null;
  private probeDetach: (() => void) | null = null;
  private probePrev = new Set<number>();
  padButtonsPressed(): number[] {
    if (!this.probe) { this.probe = new BrowserInputSource(Array.from({ length: 17 }, (_, i) => ({ action: `pad${i}`, gamepadButtons: [i] }))); this.probeDetach = this.probe.attach(window); }
    const vals = this.probe.poll();
    const now = new Set<number>(); for (const [a, v] of vals) if (v > 0.5) now.add(Number(a.slice(3)));
    const fresh = [...now].filter((b) => !this.probePrev.has(b));
    this.probePrev = now;
    return fresh;
  }
  endProbe(): void { this.probeDetach?.(); this.probe = null; this.probeDetach = null; this.probePrev.clear(); }

  setBindings(b: Binding[]): void { this.bindings = structuredClone(b); this.rebuild(); }

  rebuild(): void {
    this.detach?.();
    const game: InputBinding[] = this.bindings.map((b) => ({ action: b.action, keyboard: b.keyboard, mouseButtons: b.mouseButtons, gamepadButtons: b.gamepadButtons }));
    const all = [...game, ...UI_BINDINGS, ...STICKS];
    this.input.setBindings(all);
    this.source = new BrowserInputSource(all);
    this.detach = this.source.attach(window);
  }

  poll(): void {
    this.frame++;
    this.input.update(this.source!.poll());
    const v = (a: string) => this.input.value(a);
    if (Math.abs(v("lx+") - v("lx-")) > 0.2 || Math.abs(v("rx+") - v("rx-")) > 0.25 || this.input.isDown("ui_accept") && false) this.lastPad = true;
  }

  pressed(a: string): boolean { return this.input.wasPressed(a); }
  down(a: string): boolean { return this.input.isDown(a); }

  /** Gameplay frame. markov = Markov's render position (for mouse aim). */
  frameFor(markov: { x: number; z: number }, cameraYaw: number): InputFrame {
    const v = (a: string) => this.input.value(a);
    // move: keyboard digital or left stick with radial deadzone (camera-relative)
    let mx = (this.down("moveRight") ? 1 : 0) - (this.down("moveLeft") ? 1 : 0);
    let mz = (this.down("moveUp") ? 1 : 0) - (this.down("moveDown") ? 1 : 0);
    const ls = applyRadialDeadzone(v("lx+") - v("lx-"), v("ly+") - v("ly-"), this.deadzoneL);
    if (ls.magnitude > 0) { mx = ls.x; mz = -ls.y; this.lastPad = true; }
    const c = Math.cos(cameraYaw), s = Math.sin(cameraYaw);
    const wx = mx * c + mz * s, wz = -mx * s + mz * c;
    // aim: right stick, else mouse ground point
    let aiming = false, ax = 0, az = 0;
    const rs = applyRadialDeadzone(v("rx+") - v("rx-"), v("ry+") - v("ry-"), this.deadzoneR);
    if (rs.magnitude > 0) { const rx = rs.x, rz = -rs.y; ax = rx * c + rz * s; az = -rx * s + rz * c; aiming = true; this.lastPad = true; }
    else if (this.mouseWorld && !this.lastPad) {
      const dx = this.mouseWorld.x - markov.x, dz = this.mouseWorld.z - markov.z, l = Math.hypot(dx, dz);
      if (l > 0.3) { ax = dx / l; az = dz / l; aiming = true; }
    }
    if (aiming) this.lastAim = { x: ax, z: az };
    // buttons (hold → toggle option for every hold)
    let b = 0;
    for (const [act, bit] of Object.entries(ACTION_BTN) as [GameAction, number][]) if (this.down(act)) b |= bit;
    if (this.holdToggle) {
      const opBits = BTN.vector | BTN.phase | BTN.order | BTN.null;
      const pressed = b & ~this.prevRaw & opBits;
      this.prevRaw = b;
      this.toggled ^= pressed;
      b = (b & ~opBits) | this.toggled;
    }
    return { mx: wx, mz: wz, ax, az, aiming, b };
  }

  clearToggles(): void { this.toggled = 0; }
  get aimDir(): { x: number; z: number } { return this.lastAim; }
}
