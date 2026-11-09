import { CSS } from "./styles";
import type { InputDevice } from "./InputDevice";
import type { World } from "../sim/World";
import { LAWS } from "../data/laws";
import { RANK_BANDS, RANK_GLYPH, type RankId } from "../data/ranks";
import type { Bark } from "../data/barks";
import type { LawId } from "../sim/types";
import { lawArt } from "./cardArt";
import { opIcon, type OpIcon } from "./icons";
import { FOCUS } from "../data/resources";
import { STEP } from "../data/movement";

export interface MenuItem { label: string; value?: () => string; onSelect?: () => void; onLeft?: () => void; onRight?: () => void; disabled?: boolean }

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", html = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e;
}

/** Controller/keyboard/mouse navigable list (focus always visible, sensible default). */
export class Menu {
  index = 0;
  readonly root = el("div", "menu");
  private rows: HTMLDivElement[] = [];
  constructor(private items: MenuItem[], private readonly sfx: (k: string) => void, private readonly onBack?: () => void) {
    this.render();
    this.index = Math.max(0, items.findIndex((i) => !i.disabled));
    this.paint();
  }
  setItems(items: MenuItem[]): void { this.items = items; this.render(); this.index = Math.min(this.index, items.length - 1); this.paint(); }
  private render(): void {
    this.root.innerHTML = "";
    this.rows = this.items.map((it, i) => {
      const r = el("div", "item" + (it.disabled ? " disabled" : ""));
      r.innerHTML = `<span>${it.label}</span>${it.value ? `<span class="val">${it.value()}</span>` : ""}`;
      r.addEventListener("mouseenter", () => { this.index = i; this.paint(); });
      r.addEventListener("click", (e) => { this.index = i; if ((e as MouseEvent).offsetX > r.clientWidth * 0.6 && it.onRight) it.onRight(); else this.activate(); });
      this.root.appendChild(r);
      return r;
    });
  }
  private paint(): void {
    this.rows.forEach((r, i) => {
      r.classList.toggle("focus", i === this.index);
      const it = this.items[i]!;
      if (it.value) { const v = r.querySelector(".val"); if (v) v.textContent = it.value(); }
    });
  }
  private move(d: number): void {
    const n = this.items.length;
    for (let k = 0; k < n; k++) { this.index = (this.index + d + n) % n; if (!this.items[this.index]!.disabled) break; }
    this.sfx("ui.move"); this.paint();
  }
  activate(): void { const it = this.items[this.index]; if (!it || it.disabled) return; this.sfx("ui.confirm"); it.onSelect?.(); this.paint(); }
  handle(input: InputDevice): void {
    if (input.pressed("ui_up")) this.move(-1);
    if (input.pressed("ui_down")) this.move(1);
    const it = this.items[this.index];
    if (input.pressed("ui_left") && it?.onLeft) { it.onLeft(); this.sfx("ui.move"); this.paint(); }
    if (input.pressed("ui_right") && it?.onRight) { it.onRight(); this.sfx("ui.move"); this.paint(); }
    if (input.pressed("ui_accept")) this.activate();
    if (input.pressed("ui_back") && this.onBack) { this.sfx("ui.back"); this.onBack(); }
  }
}

export const SIGIL_SVG = `<svg class="sigil" viewBox="-60 -60 120 120" width="180" height="180"><path d="${(() => { let d = ""; for (let i = 0; i <= 14; i++) { const a = (i / 14) * Math.PI * 2 - Math.PI / 2; const r = i % 2 === 0 ? 50 : 21; d += `${i ? "L" : "M"}${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`; } return d; })()}Z"/><path d="M0,-50 L0,50 M-43,-25 L43,25 M-43,25 L43,-25"/></svg>`;

/** Root UI: layers for screens, HUD, overlays and subtitles. */
export class Ui {
  readonly root: HTMLElement;
  readonly screen = el("div", "layer");
  readonly hudLayer = el("div", "layer");
  readonly overlay = el("div", "layer");
  readonly subs = el("div", "subs");
  readonly flash = el("div", "flash");
  menu: Menu | null = null;
  private feedEl = el("div", "feed");
  private hudEls: Record<string, HTMLElement> = {};
  private subTimer = 0;

  constructor(root: HTMLElement, readonly sfx: (k: string) => void) {
    this.root = root;
    const style = document.createElement("style"); style.textContent = CSS; document.head.appendChild(style);
    root.append(this.hudLayer, this.screen, this.overlay, this.subs, this.flash);
  }

  setTextScale(s: number): void { document.documentElement.style.setProperty("--ts", String(s)); }
  setSubtitleStyle(size: "S" | "M" | "L", bg: number): void { const r = document.documentElement.style; r.setProperty("--subsize", size === "S" ? "16px" : size === "L" ? "28px" : "21px"); r.setProperty("--subbg", String(bg)); }

  show(content: HTMLElement, menu: Menu | null = null, clear = false): void {
    this.screen.innerHTML = "";
    const s = el("div", "screen" + (clear ? " clear" : ""));
    s.appendChild(content);
    this.screen.appendChild(s);
    this.menu = menu;
  }
  hideScreen(): void { this.screen.innerHTML = ""; this.menu = null; }
  get screenOpen(): boolean { return this.screen.childElementCount > 0; }

  panel(title: string, menu: Menu | null, body?: HTMLElement): HTMLElement {
    const p = el("div", "panel");
    if (title) p.appendChild(el("div", "ptitle", title));
    if (body) p.appendChild(body);
    if (menu) p.appendChild(menu.root);
    return p;
  }

  // ---------- HUD ----------
  buildHud(): void {
    this.hudLayer.innerHTML = "";
    const h = el("div", "hud");
    const sig = SIGIL_SVG.replace('width="180" height="180"', 'width="46" height="46"');
    h.innerHTML = `<div class="hubris"><i></i></div>
      <div class="dock"><div class="portrait">${sig}</div><div class="dockcol"><div class="sealrow"></div><div class="focusbar"><i></i></div>
        <div class="ops">${OPS.map((o) => `<div class="op" data-op="${o}">${opIcon(o, 26)}</div>`).join("")}<div class="steps"></div></div></div></div>
      <div class="score"><span class="rank"></span><b>0</b></div><div class="lawmini" style="display:none"></div>
      <div class="bossbar" style="display:none"><i></i></div><div class="meter" style="display:none"><i></i></div>`;
    h.appendChild(this.feedEl);
    this.hudLayer.appendChild(h);
    for (const k of ["hubris", "sealrow", "score", "rank", "lawmini", "bossbar", "meter", "dock", "focusbar", "ops", "steps"]) this.hudEls[k] = h.querySelector(`.${k}`) as HTMLElement;
    this.hudEls.scoreNum = h.querySelector(".score b") as HTMLElement;
    h.querySelectorAll("svg.sigil path").forEach((p) => ((p as SVGPathElement).style.animation = "none", (p as SVGPathElement).style.strokeDashoffset = "0"));
  }
  hideHud(): void { this.hudLayer.innerHTML = ""; this.hudEls = {}; }

  updateHud(w: World, rankLetter: string): void {
    const e = this.hudEls;
    if (!e.sealrow) return;
    const m = w.markov;
    if (e.sealrow.childElementCount !== m.maxSeals) { e.sealrow.innerHTML = ""; for (let i = 0; i < m.maxSeals; i++) e.sealrow.appendChild(el("div", "seal")); }
    [...e.sealrow.children].forEach((s, i) => s.classList.toggle("lost", i >= m.seals));
    e.sealrow.style.display = w.def.noSealLoss ? "none" : "flex";
    e.dock!.style.display = w.def.kind === "hub" ? "none" : "flex";
    (e.focusbar!.firstElementChild as HTMLElement).style.width = `${(m.focus / FOCUS.max) * 100}%`;
    for (const o of e.ops!.querySelectorAll<HTMLElement>(".op")) {
      const op = o.dataset.op as OpIcon;
      const lost = !m.regalia.has(op);
      o.classList.toggle("lost", lost);
      o.classList.toggle("low", !lost && m.focus < FOCUS.cost[op] && !w.opts.infiniteFocus);
    }
    const steps = e.steps!;
    steps.style.display = m.regalia.has("step") ? "flex" : "none";
    if (steps.childElementCount !== STEP.charges) { steps.innerHTML = ""; for (let i = 0; i < STEP.charges; i++) steps.appendChild(el("i")); }
    [...steps.children].forEach((s, i) => s.classList.toggle("off", i >= m.stepCharges));
    const hub = e.hubris!;
    hub.style.display = m.regalia.has("hubris") ? "block" : "none";
    (hub.firstElementChild as HTMLElement).style.width = `${m.hubris}%`;
    hub.classList.toggle("full", m.hubris >= 100);
    const showScore = w.def.kind !== "hub" && w.def.kind !== "ishtar" && w.def.boss !== "child";
    e.score!.style.display = showScore ? "block" : "none";
    e.scoreNum!.textContent = Math.round(w.scorer.score).toLocaleString("en-US");
    e.rank!.textContent = rankLetter;
    const law = w.def.law;
    e.lawmini!.style.display = law && w.status !== "intro" ? "block" : "none";
    if (law) e.lawmini!.textContent = LAWS[law].name + (w.law.tier ? ` ${"+".repeat(w.law.tier)}` : "") + (w.law.miniLaw ? `  ·  ${w.law.miniLaw}` : "");
    const boss = w.director.boss;
    const bar = e.bossbar!;
    if (boss && boss.type !== "door" && boss.type !== "child") {
      bar.style.display = "block";
      const cert = boss.type === "giant" ? w.actor(boss.d.shadow) : boss;
      if (boss.type === "ishtar") { bar.innerHTML = `<i style="width:100%;background:#fff1c8"></i><div class="inf">∞</div>`; }
      else if (cert) { if (bar.childElementCount !== 1) bar.innerHTML = "<i></i>"; (bar.firstElementChild as HTMLElement).style.width = `${(cert.certainty / cert.maxCertainty) * 100}%`; }
    } else bar.style.display = "none";
    const meter = e.meter!;
    if (boss?.type === "child") { meter.style.display = "block"; (meter.firstElementChild as HTMLElement).style.width = `${(boss.d.progress / boss.d.goal) * 100}%`; }
    else if (boss?.type === "ishtar" && (w.flags.ishtarPhase ?? 0) >= 3) { meter.style.display = "block"; (meter.firstElementChild as HTMLElement).style.width = `${((w.flags.dawn ?? 0) / 600) * 100}%`; }
    else meter.style.display = "none";
  }

  feed(text: string, cls = ""): void {
    const d = el("div", cls, text);
    this.feedEl.prepend(d);
    while (this.feedEl.childElementCount > 6) this.feedEl.lastElementChild!.remove();
    setTimeout(() => d.remove(), 1700);
  }

  lawCard(law: LawId, art: string | null): void {
    const L = LAWS[law];
    const c = el("div", "lawcard");
    c.innerHTML = `<div class="art" style="${art ? `background-image:url(${art})` : ""}">${art ? "" : lawArt(law)}</div><h2 class="serif">${L.name}</h2><p>${L.rule}</p>`;
    this.overlay.appendChild(c);
    requestAnimationFrame(() => c.classList.add("slam"));
    setTimeout(() => c.remove(), 2100);
  }

  /** Tab/Select: expanded current Law card (pauses). */
  lawPeek(law: LawId, art: string | null): HTMLElement {
    const L = LAWS[law];
    const c = el("div", "lawcard");
    c.style.animation = "none"; c.style.opacity = "1"; c.style.transform = "translate(-50%,-50%)";
    c.innerHTML = `<div class="art" style="${art ? `background-image:url(${art})` : ""}">${art ? "" : lawArt(law)}</div><h2 class="serif">${L.name}</h2><p>${L.rule}</p>`;
    return c;
  }

  hint(symbol: string, on: boolean): void {
    let h = this.overlay.querySelector(".hint") as HTMLElement | null;
    if (on && !h) { h = el("div", "hint", symbol); this.overlay.appendChild(h); }
    if (!on && h) h.remove();
  }

  subtitle(b: Bark, enabled: boolean): void {
    if (!enabled) return;
    const who = b.speaker === "markov" ? "" : b.speaker === "voice" ? "" : b.speaker;
    this.subs.innerHTML = `<span>${who ? `<span class="who">${who}</span>` : ""}${b.line}</span>`;
    clearTimeout(this.subTimer);
    this.subTimer = window.setTimeout(() => (this.subs.innerHTML = ""), 1200 + b.line.length * 55);
  }

  flashWhite(ms = 300, opacity = 1): void {
    this.flash.style.transition = "none"; this.flash.style.opacity = String(opacity);
    requestAnimationFrame(() => { this.flash.style.transition = `opacity ${ms}ms`; this.flash.style.opacity = "0"; });
  }

  results(r: { score: number; rank: RankId; ops: number; parOps: number; breakdown: Record<string, number>; frames: number }, menu: Menu, title: string): void {
    const p = el("div", "panel results");
    const band = RANK_BANDS.find((b) => b.id === r.rank)!;
    const rows = Object.entries(r.breakdown).filter(([, v]) => v > 0).map(([k, v]) => `<tr><td>${LABELS[k] ?? k}</td><td>${Math.round(v).toLocaleString("en-US")}</td></tr>`).join("");
    p.innerHTML = `<div class="stage">${title}</div><div class="rankbig">${RANK_GLYPH[r.rank]}</div><div class="rankname">${band.label}</div>
      <table>${rows}<tr><td>Operations</td><td>${r.ops} / ${r.parOps}</td></tr><tr><td>Time</td><td>${(r.frames / 60).toFixed(1)}s</td></tr><tr class="total"><td>Score</td><td>${r.score.toLocaleString("en-US")}</td></tr></table>`;
    p.appendChild(menu.root);
    this.show(p, menu);
  }
}

const OPS: OpIcon[] = ["vector", "phase", "order", "null"];

const LABELS: Record<string, string> = { contradiction: "Contradictions", qed: "Q.E.D.", bounce: "Redirect chain", enemyByEnemy: "By their own law", compound: "Compounds", parOps: "Par operations", noDamage: "Untouched", strike: "Strikes", clash: "Clashes", ringout: "Ring-outs" };
