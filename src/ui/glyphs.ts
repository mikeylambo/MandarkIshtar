import type { InputDeviceFamily } from "@slu/web-shell";
import type { Binding } from "../data/input";

/**
 * Button prompt glyphs (inline HTML/CSS, no image assets) for the active input family, resolved from the live bindings so
 * remaps show correctly. Face buttons read by symbol/letter + shape, shoulders and triggers by shape, keys as keycaps.
 * Standard Gamepad indices: 0 bottom, 1 right, 2 left, 3 top, 4 LB, 5 RB, 6 LT, 7 RT, 8 select, 9 start, 10 L3, 11 R3, 12-15 d-pad.
 */
export type PadFamily = Exclude<InputDeviceFamily, "keyboard-mouse" | "touch">;

const FACE: Record<PadFamily, string[]> = {
  xbox: ["A", "B", "X", "Y"],
  "generic-gamepad": ["A", "B", "X", "Y"],
  playstation: ["✕", "○", "□", "△"],
  nintendo: ["B", "A", "Y", "X"],
};
const SHOULDER: Record<PadFamily, string[]> = {
  xbox: ["LB", "RB", "LT", "RT"], "generic-gamepad": ["LB", "RB", "LT", "RT"], playstation: ["L1", "R1", "L2", "R2"], nintendo: ["L", "R", "ZL", "ZR"],
};
const META: Record<PadFamily, string[]> = {
  xbox: ["⧉", "≡"], "generic-gamepad": ["◁", "▷"], playstation: ["◫", "≡"], nintendo: ["−", "+"],
};
const KEY_NAMES: Record<string, string> = { Space: "Space", ShiftLeft: "Shift", ShiftRight: "Shift", Escape: "Esc", Enter: "Enter", Tab: "Tab", Backspace: "⌫", ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→" };
const MOUSE = ["L", "M", "R"];

export function isPad(f: InputDeviceFamily): f is PadFamily { return f !== "keyboard-mouse" && f !== "touch"; }

export function padGlyph(index: number, f: PadFamily): string {
  if (index <= 3) return `<b class="gl gl-face gl-${f === "playstation" ? "ps" : "abxy"}" data-face="${index}">${FACE[f][index]}</b>`;
  if (index <= 7) return `<b class="gl ${index <= 5 ? "gl-bumper" : "gl-trigger"}">${SHOULDER[f][index - 4]}</b>`;
  if (index <= 9) return `<b class="gl gl-face gl-meta">${META[f][index - 8]}</b>`;
  if (index <= 11) return `<b class="gl gl-face gl-stick">${index === 10 ? "L" : "R"}<i>●</i></b>`;
  return `<b class="gl gl-dpad" data-dir="${index - 12}"><i></i></b>`;
}

export function keyGlyph(code: string): string {
  const name = KEY_NAMES[code] ?? code.replace(/^Key|^Digit/, "");
  return `<b class="gl gl-key${name.length > 2 ? " wide" : ""}">${name}</b>`;
}
export function mouseGlyph(button: number): string { return `<b class="gl gl-mouse" data-b="${button}"><i></i>${MOUSE[button] ?? button}</b>`; }

/** Glyph for a game action in the given family; null if that family has no binding for it. */
export function actionGlyph(b: Binding | undefined, f: InputDeviceFamily): string | null {
  if (!b) return null;
  if (isPad(f)) { const p = b.gamepadButtons?.[0]; return p === undefined ? null : padGlyph(p, f); }
  if (b.mouseButtons?.length) return mouseGlyph(b.mouseButtons[0]!);
  if (b.keyboard.length) return keyGlyph(b.keyboard[0]!);
  return null;
}

/** Fixed UI navigation prompts (not remappable). */
export type UiAct = "accept" | "back" | "tabL" | "tabR" | "cancel";
const UI_PAD: Record<UiAct, number> = { accept: 0, back: 1, tabL: 4, tabR: 5, cancel: 9 };
const UI_KEY: Record<UiAct, string> = { accept: "Enter", back: "Escape", tabL: "KeyQ", tabR: "KeyE", cancel: "Escape" };
export function uiGlyph(act: UiAct, f: InputDeviceFamily): string {
  return isPad(f) ? padGlyph(UI_PAD[act], f) : keyGlyph(UI_KEY[act]);
}

/** Pad glyphs only (for the remap screen's controller column). */
export function padBindingGlyph(b: Binding | undefined, f: PadFamily): string { const p = b?.gamepadButtons?.[0]; return p === undefined ? "<i class='gl-none'>—</i>" : padGlyph(p, f); }
/** Keyboard + mouse glyphs for a binding (all of them, e.g. Space and Shift for Step). */
export function kbmBindingGlyphs(b: Binding | undefined): string {
  if (!b) return "";
  const g = [...(b.mouseButtons ?? []).map(mouseGlyph), ...b.keyboard.map(keyGlyph)];
  return g.length ? g.join("") : "<i class='gl-none'>—</i>";
}

export const GLYPH_CSS = `
.gl{display:inline-flex;align-items:center;justify-content:center;flex:none;font-family:var(--display);font-style:normal;font-weight:800;line-height:1;color:#0a0d1f;background:#ece8dc;letter-spacing:0;font-size:13px;height:22px;min-width:22px;box-shadow:0 2px 0 rgba(0,0,0,.45)}
.gl-face{border-radius:50%;width:22px}
.gl-ps{font-size:15px;font-family:system-ui,sans-serif;font-weight:700}
.gl-meta{font-size:14px;background:#b9bdd6}
.gl-stick{font-size:11px;flex-direction:column;gap:0;background:#b9bdd6}.gl-stick i{font-size:6px;font-style:normal}
.gl-bumper{border-radius:9px 9px 4px 4px;padding:0 6px;font-size:12px}
.gl-trigger{border-radius:11px 11px 3px 3px;padding:0 6px;height:24px;font-size:12px;background:linear-gradient(#fff,#cfcabd)}
.gl-key{border-radius:3px;padding:0 6px;font-size:12px;border:1px solid #fff;box-shadow:0 3px 0 #6b6f8a}
.gl-key.wide{padding:0 8px;letter-spacing:.04em}
.gl-mouse{width:18px;height:24px;border-radius:9px;font-size:9px;position:relative;align-items:flex-end;padding-bottom:3px;background:#b9bdd6}
.gl-mouse i{position:absolute;top:2px;width:7px;height:9px;background:#0a0d1f;border-radius:3px}
.gl-mouse[data-b="0"] i{left:2px;border-radius:7px 1px 1px 3px}.gl-mouse[data-b="2"] i{right:2px;border-radius:1px 7px 3px 1px}.gl-mouse[data-b="1"] i{left:5.5px;width:6px;border-radius:3px}
.gl-dpad{width:22px;height:22px;background:none;box-shadow:none;position:relative}
.gl-dpad:before,.gl-dpad:after{content:"";position:absolute;background:#6b6f8a;border-radius:2px}
.gl-dpad:before{left:7px;top:0;width:8px;height:22px}.gl-dpad:after{top:7px;left:0;width:22px;height:8px}
.gl-dpad i{position:absolute;z-index:1;width:8px;height:8px;background:#ece8dc;border-radius:1px}
.gl-dpad[data-dir="0"] i{left:7px;top:0}.gl-dpad[data-dir="1"] i{left:7px;bottom:0}.gl-dpad[data-dir="2"] i{left:0;top:7px}.gl-dpad[data-dir="3"] i{right:0;top:7px}
/* prompt bar (bottom-right, navigation only) */
.prompts{position:absolute;right:0;bottom:22px;display:flex;gap:22px;align-items:center;padding:8px 34px 8px 40px;background:linear-gradient(90deg,transparent,rgba(5,6,16,.85) 22%);clip-path:polygon(18px 0,100% 0,100% 100%,0 100%);font-family:var(--display);font-style:italic;font-weight:700;letter-spacing:.12em;text-transform:uppercase;font-size:calc(16px*var(--ts));color:#dfe3f5;pointer-events:none}
.prompts span{display:inline-flex;align-items:center;gap:9px;pointer-events:auto;cursor:pointer}
.prompts span:hover{color:#fff}
/* tabs (settings) */
.tabs{display:flex;align-items:center;gap:4px;margin:2px -6px 12px;border-bottom:1px solid rgba(242,185,74,.25);padding-bottom:8px}
.tabs .t{font-family:var(--display);font-style:italic;font-weight:700;letter-spacing:.1em;text-transform:uppercase;font-size:calc(16px*var(--ts));color:#7f86ab;padding:4px 12px;cursor:pointer;position:relative}
.tabs .t.on{color:#fff}
.tabs .t.on:after{content:"";position:absolute;left:10px;right:10px;bottom:-9px;height:3px;background:var(--gold);box-shadow:0 0 10px rgba(242,185,74,.7)}
.tabs .tg{display:inline-flex;margin:0 6px;cursor:pointer}
.tabs .sp{flex:1}
/* adjustable values */
.item .adj{display:inline-flex;align-items:center;gap:10px}
.item .adj i{font-style:normal;color:var(--gold);opacity:0;font-weight:800;transition:opacity .12s}
.item.focus .adj i{opacity:1}
.binds{display:inline-flex;gap:6px;align-items:center;min-width:150px;justify-content:flex-end}
.binds .sep{width:1px;height:20px;background:rgba(242,185,74,.35);margin:0 6px}
.binds .kbm,.binds .pad{display:inline-flex;gap:4px;align-items:center;min-width:56px;justify-content:center}
.gl-none{font-style:normal;color:#5d6280}
.title-gl{margin-top:20px;height:24px;display:flex;justify-content:center;opacity:.9}
.verb{position:relative;display:flex;align-items:center;height:44px;padding:0 6px}
.verb .gl{position:absolute;right:-8px;bottom:-4px;transform:scale(.78);transform-origin:100% 100%}
.hubris-gl{position:absolute;left:252px;bottom:114px;transform:scale(.78);transform-origin:0 100%}
.capture{display:flex;flex-direction:column;align-items:center;gap:22px;padding:18px 40px}
.capture .act{font-family:var(--display);font-style:italic;font-weight:800;font-size:calc(30px*var(--ts));text-transform:uppercase;letter-spacing:.06em;color:#fff}
/* op slot binding badge */
.op{position:relative}
.op .gl{position:absolute;right:-12px;bottom:-12px;transform:scale(.78);transform-origin:100% 100%}
`;
