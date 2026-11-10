import * as THREE from "three";
import {
  AudioMixer, BrowserHaptics, BrowserInputFamilyDetector, BrowserStorage, IndexedDBStorage, PWAController, SettingsStore, SLUWebShell, ThreeAdapter,
  bindAudioSettings, defaultCoreSettings, installBrowserLifecycle, mountRecoveryUI, type CoreSettings, type StorageAdapter,
} from "@slu/web-shell";
import { World, type WorldOptions } from "../sim/World";
import type { EncounterDef } from "../sim/encounter";
import type { SimEvent } from "../sim/events";
import { REGALIA_ORDER, type InputFrame, type LawId, type Regalia } from "../sim/types";
import { SceneRig } from "../render/Scene";
import { WorldView } from "../render/WorldView";
import { CameraRig } from "../render/CameraRig";
import { Vfx } from "../vfx/Vfx";
import { FeelKit } from "../feel/FeelKit";
import { FEEL } from "../data/feel";
import { HAPTICS } from "../data/haptics";
import { AudioEngine } from "../audio/AudioEngine";
import { ResolutionMusic } from "../audio/ResolutionMusic";
import { BarkSystem } from "../audio/Barks";
import { Ui, Menu, el, SIGIL_SVG, type MenuItem } from "../ui/Ui";
import { InputDevice } from "../ui/InputDevice";
import { Progress } from "../meta/Progress";
import { COLD_OPEN, LABORATORY, OBSERVATORY, TRIALS, encounterById } from "../data/trials";
import { DESCENT_GATES, ISHTAR_ARENA, ASCENT } from "../data/descent";
import { regaliaForTrial } from "../campaign/sequence";
import { DEFAULT_ACCESSIBILITY, type GameAccessibility } from "../data/accessibility";
import { DEFAULT_BINDINGS, REMAPPABLE, type Binding } from "../data/input";
import { CODEX } from "../data/codex";
import { RANK_BANDS, RANK_GLYPH, type RankId } from "../data/ranks";
import { LAWS } from "../data/laws";
import { THEOREM_CHALLENGES } from "../data/theorems";
import { DIFFICULTIES, type DifficultyId } from "../data/difficulty";
import { bossRush, dailyScoreAttack, laboratory, scoreAttack, theorem, timeAttack, type ModePlan } from "../modes/ModeRun";
import { SolverBot } from "../dev/bots/SolverBot";
import { PassiveBot } from "../dev/bots/PassiveBot";
import type { Bot } from "../dev/bots/BotKit";
import { AssetLoader } from "./AssetLoader";
import { codexArt } from "../ui/cardArt";
import { installDevHooks } from "../dev/devHooks";
import type { Bark } from "../data/barks";
import { PERF } from "../data/perf";
import { tunables } from "@slu/web-shell/tuning";

export interface GameSettings extends CoreSettings { a11y: GameAccessibility; bindings: Binding[]; difficulty: DifficultyId; slot: number }
const DEFAULT_SETTINGS: GameSettings = { ...defaultCoreSettings, a11y: DEFAULT_ACCESSIBILITY, bindings: DEFAULT_BINDINGS, difficulty: "savant", slot: 0 };

type Mode = "boot" | "title" | "menu" | "play" | "paused" | "results" | "cutscene";
interface Run { kind: "campaign" | "arcade"; stages: { def: EncounterDef; regalia: Regalia[]; opts: Partial<WorldOptions> }[]; index: number; seals?: number; trial?: number; plan?: ModePlan; retries: number; startPhase: number; segment: string; frames: number; total: number }

const STEP_MS = 1000 / 60;

export class App {
  shell!: SLUWebShell<GameSettings>;
  settings!: SettingsStore<GameSettings>;
  progress!: Progress;
  input!: InputDevice;
  ui!: Ui;
  rig!: SceneRig;
  view!: WorldView;
  vfx!: Vfx;
  feel!: FeelKit;
  camera!: CameraRig;
  audio = new AudioEngine();
  mixer!: AudioMixer;
  music!: ResolutionMusic;
  barks!: BarkSystem;
  haptics = new BrowserHaptics(HAPTICS);
  assets = new AssetLoader();
  world: World | null = null;
  mode: Mode = "boot";
  run: Run | null = null;
  bot: Bot | null = null;
  timeScale = 1;
  /** Dev capture: freeze the whole presentation the instant an event of this type fires. */
  freezeOn: string | null = null;
  frozen = false;
  seed = 1;
  private acc = 0;
  private last = 0;
  private lastDt = STEP_MS;
  private t = 0;
  private renderFrame = 0;
  private noOpFrames = 0;
  private hintShown = "";
  readonly perf = { frameMs: [] as number[], simMs: [] as number[], drawCalls: 0, triangles: 0, heapMB: 0 };
  readonly allEvents: string[] = [];
  private onArenaDone: ((status: "clear" | "lost") => void) | null = null;
  private recovery: ReturnType<typeof mountRecoveryUI> | null = null;
  private padConnected = false;

  async boot(): Promise<void> {
    const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
    const uiRoot = document.getElementById("ui")!;
    const storage = new BrowserStorage("mandark-ishtar");
    this.settings = new SettingsStore<GameSettings>(storage, "settings", structuredClone(DEFAULT_SETTINGS));
    await this.settings.load();
    this.rig = new SceneRig(canvas);
    this.shell = new SLUWebShell<GameSettings>({
      build: { gameId: "mandark-ishtar", gameName: "Mandark Ishtar", version: "0.9.1" },
      renderer: new ThreeAdapter({ onResize: () => this.rig.resize(), onSuspend: () => this.pause(), onScreenshot: async () => this.rig.renderer.domElement.toDataURL("image/png") }),
      settings: this.settings,
    });
    await this.shell.boot();
    let saveStore: StorageAdapter = storage;
    try { if (typeof indexedDB !== "undefined") { const idb = new IndexedDBStorage("mandark-ishtar-saves"); await idb.get("probe"); saveStore = idb; } } catch { saveStore = storage; }
    this.progress = new Progress(saveStore, this.settings.get("slot"));
    await this.progress.load();
    const ob = this.shell.production.onboarding;
    // GDD teach order. Lesson text is internal (never shown): hints are diegetic glyphs.
    ob.registerLessons(["strike", "vector", "redirect", "step", "hubris", "ringout", "phase", "order", "null", "compounds", "stillness", "following"].map((id) => ({ id, text: id, repeatable: id === "stillness" })));
    ob.registerFlows([{ id: "teach", lessons: ["strike", "vector", "redirect", "step", "hubris", "ringout", "phase", "order", "null", "compounds", "stillness", "following"], skippable: true }]);
    ob.hydrate(this.progress.data.onboarding);
    this.input = new InputDevice(canvas);
    this.input.setBindings(this.settings.get("bindings"));
    this.ui = new Ui(uiRoot, (k) => this.audio.sfx(k));
    this.view = new WorldView(this.rig.scene);
    this.vfx = new Vfx(this.rig.scene, this.view.afterimages, this.rig.look, this.rig.camera);
    const look = this.rig.look;
    this.feel = new FeelKit({
      vfx: (id, position, scale, tint) => { look.play(id, { ...(position ? { position } : {}), scale, ...(tint ? { tint } : {}) }); },
      post: (id, amount) => look.pulse(id, amount),
      flash: (token, amount) => look.post.flashColor(token, amount),
    }, tunables, () => ({ shake: this.a11y.screenShake, flash: this.a11y.flashIntensity, reducedMotion: this.a11y.reducedMotion, vibration: this.settings.get("vibration") }));
    this.camera = new CameraRig(this.rig.camera);
    this.mixer = new AudioMixer(this.audio);
    bindAudioSettings(this.settings as unknown as SettingsStore<CoreSettings>, this.mixer);
    this.music = new ResolutionMusic(this.audio);
    this.barks = new BarkSystem((b) => this.onBark(b));
    this.applySettings();
    this.settings.events.on("changed", () => this.applySettings());
    await this.assets.load("manifest.json", (key, url) => this.onAsset(key, url));
    this.installPlatform(canvas);
    installDevHooks(this);
    this.recovery = mountRecoveryUI({ root: uiRoot, message: "Something broke.", retryLabel: "Retry", menuLabel: "Return to title", onRetry: () => { this.recovery?.hide(); this.retryArena(); }, onMenu: () => { this.recovery?.hide(); this.toTitle(); } });
    this.recovery.hide();
    window.addEventListener("error", (e) => this.fail(e.error ?? e.message));
    window.addEventListener("unhandledrejection", (e) => this.fail(e.reason));
    new BrowserInputFamilyDetector({ onChange: (f) => { this.shell.production.glyphs.setFamily(f); this.ui.setFamily(f); } }).attach();
    this.ui.bindings = () => this.input.bindings;
    const pwa = new PWAController(); pwa.attach();
    if (import.meta.env.PROD) void pwa.register("./sw.js").catch(() => undefined);
    this.toTitle();
    requestAnimationFrame((t) => this.frame(t));
  }

  get a11y(): GameAccessibility { return this.settings.get("a11y"); }

  private applySettings(): void {
    const a = this.a11y;
    this.ui?.setTextScale(a.textScale);
    this.ui?.setSubtitleStyle(a.subtitleSize, a.subtitleBg);
    if (this.input) { this.input.deadzoneL = a.deadzoneLeft; this.input.deadzoneR = a.deadzoneRight; this.input.holdToggle = a.holdToToggle; }
    if (this.camera) this.camera.reducedMotion = a.reducedMotion || this.settings.get("reducedMotion");
    if (this.view) this.view.highContrast = a.highContrastTelegraphs;
    this.haptics.setEnabled(this.settings.get("vibration"));
  }

  private installPlatform(canvas: HTMLCanvasElement): void {
    installBrowserLifecycle({
      onBackground: () => this.pause(),
      onControllerConnected: () => { this.padConnected = true; },
      onControllerDisconnected: () => { if (this.padConnected && this.mode === "play") { this.pause(); this.ui.feed("◎", "gold"); } this.padConnected = false; },
      onContextLost: () => this.pause(),
    }, canvas);
    window.addEventListener("blur", () => this.pause());
    window.addEventListener("resize", () => this.rig.resize());
    const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3(), ndc = new THREE.Vector2();
    window.addEventListener("pointermove", (e) => {
      ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
      ray.setFromCamera(ndc, this.rig.camera);
      if (ray.ray.intersectPlane(plane, hit)) this.input.mouseWorld = { x: hit.x, z: hit.z };
      this.input.lastPad = false;
    });
    window.addEventListener("pointerdown", () => this.audio.unlock(), { once: false });
    window.addEventListener("keydown", () => this.audio.unlock());
  }

  fail(err: unknown): void {
    try { this.shell.studio.diagnostics.capture(err, { scope: "runtime" }); } catch { /* diagnostics must not throw */ }
    console.warn("[mandark] runtime failure captured", err);
    if (this.mode === "play") { this.mode = "paused"; this.recovery?.show(); }
  }

  private onAsset(key: string, url: string): void {
    if (key.startsWith("sfx.") || key.startsWith("vo.")) {
      void fetch(url).then((r) => r.arrayBuffer()).then((b) => this.audio.ctx?.decodeAudioData(b)).then((buf) => { if (buf) this.audio.registerFile(key.replace(/^sfx\./, ""), buf); }).catch(() => undefined);
    }
  }

  // ======================= main loop =======================
  private frame(now: number): void {
    requestAnimationFrame((t) => this.frame(t));
    const t0 = performance.now();
    const dt = Math.min(100, this.last ? now - this.last : STEP_MS);
    this.last = now;
    this.lastDt = dt;
    this.t += dt / 1000;
    this.renderFrame++;
    this.input.poll();
    if (this.ui.menu && this.mode !== "play") this.ui.menu.handle(this.input);
    if (this.mode === "title" && (this.input.pressed("ui_any") || this.input.pressed("ui_accept"))) this.onTitleAccept();
    let simMs = 0;
    if (this.mode === "play" && this.world) {
      if (this.input.pressed("pause") && !this.bot) { this.pause(); }
      else if (this.input.pressed("codex") && this.world.def.law && !this.bot) { this.peekLaw(); }
      else {
        if (this.camera.introActive && (this.input.pressed("ui_any"))) this.camera.skipIntro();
        const speed = this.a11y.gameSpeed * this.timeScale;
        this.acc += dt * speed;
        let steps = 0;
        const s0 = performance.now();
        while (this.acc >= STEP_MS && steps < 6 && this.world && !this.frozen) {
          this.acc -= STEP_MS; steps++;
          this.stepWorld();
          if (this.mode !== "play") break;
        }
        simMs = performance.now() - s0;
        if (steps === 6) this.acc = 0;
      }
    }
    this.renderScene();
    const ft = performance.now() - t0;
    this.perf.frameMs.push(ft); if (this.perf.frameMs.length > 600) this.perf.frameMs.shift();
    if (simMs) { this.perf.simMs.push(simMs); if (this.perf.simMs.length > 600) this.perf.simMs.shift(); }
  }

  private stepWorld(): void {
    const w = this.world!;
    let f: InputFrame;
    if (this.bot) f = this.bot.next(w);
    else f = this.input.frameFor({ x: this.view.markovPos.x, z: this.view.markovPos.z }, 0);
    w.step(f);
    this.view.snap(w);
    for (const e of w.events) this.onEvent(e, w);
    this.onboardingTick(w, f);
    if (w.markov.insightT > 0 && w.frame % 2 === 0) this.vfx.insightLines(w);
    if (w.status === "clear" || w.status === "lost") { const done = this.onArenaDone; this.onArenaDone = null; done?.(w.status); }
  }

  private renderScene(): void {
    const w = this.world;
    if (!this.frozen) { this.feel.tick(this.lastDt / 1000); this.rig.update(this.lastDt / 1000); }
    if (w) {
      const alpha = this.mode === "play" ? this.acc / STEP_MS : 1;
      this.view.update(w, Math.min(1, alpha), this.t, this.renderFrame);
      this.camera.update(w, this.view.markovPos.x, this.view.markovPos.z, this.feel.punch, this.feel.shakeOffset);
      this.ui.updateHud(w, this.liveRank(w));
    }
    if (!this.frozen) this.vfx.update(w);
    const u = this.rig.inversion.uniforms;
    const inv = this.feel.inversion > 0 ? 1 : 0;
    u.amount!.value = this.a11y.inversionAsRim ? 0 : inv * this.a11y.flashIntensity;
    u.rim!.value = this.a11y.inversionAsRim ? inv : 0;
    u.desat!.value = w?.markov.spectral ? 0.2 : w && w.markov.insightT > 0 ? 0.35 : 0;
    u.white!.value = this.vfx.dawnLevel * 0.6;
    this.rig.render();
    const info = this.rig.renderer.info;
    this.perf.drawCalls = info.render.calls; this.perf.triangles = info.render.triangles;
    const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
    if (mem) this.perf.heapMB = mem.usedJSHeapSize / 1048576;
  }

  private liveRank(w: World): string {
    const pct = (w.scorer.score / Math.max(1, w.def.par.score)) * 100;
    let r: RankId = "conjecture";
    for (const b of RANK_BANDS) if (pct >= b.minimum) r = b.id as RankId;
    return RANK_GLYPH[r];
  }

  // ======================= events → presentation =======================
  private onEvent(e: SimEvent, w: World): void {
    this.allEvents.push(e.type); if (this.allEvents.length > 2000) this.allEvents.shift();
    if (this.freezeOn && (this.freezeOn === e.type || this.freezeOn === `${e.type}:${e.kind ?? ""}` || this.freezeOn === `${e.type}:${e.value ?? ""}`)) { this.frozen = true; this.timeScale = 0; this.freezeOn = null; }
    this.vfx.onEvent(e, w);
    this.feel.onEvent(e, (id) => this.haptics.pulse(id), w.markov.pos.x, w.markov.pos.z);
    const sfx = FEEL[e.type]?.sfx;
    if (sfx) this.audio.sfx(sfx, e.type === "Telegraph" ? 0.6 : 1);
    this.barks.onEvent(e, w.frame);
    switch (e.type) {
      case "NullImplode": this.audio.duckSfx(); break;
      case "Contradiction": this.music.advance(); this.ui.feed("CONTRADICTION", "red"); this.progress.data.stats.contradictions++; break;
      case "QED": this.music.cadence(); this.ui.feed("Q.E.D.", "gold"); this.progress.data.stats.qeds++; break;
      case "RingOut": this.ui.feed("RING-OUT", "gold"); break;
      case "Redirect": if ((e.value ?? 0) > 1) this.ui.feed(`REDIRECT ×${e.value}`, "gold"); break;
      case "PrismPass": this.ui.feed(`REDIRECT ×${(e.value ?? 0) + 1}`, "gold"); break;
      case "CompoundCast": this.ui.feed(compoundName(e.kind ?? ""), "gold"); break;
      case "Flourish": this.camera.flourish(); this.music.cadence(); break;
      case "WaveStart": this.music.setLayers(3 + (e.value ?? 0) * 2); break;
      case "LawDeclared": if (e.kind && e.kind !== "ishtar") this.ui.lawCard(e.kind as LawId, this.assets.url(`lawcard.${e.kind}`)); break;
      case "EnemySpawn": if (e.kind) this.progress.markSeen(e.kind); break;
      case "RegaliaLost": this.music.instrumentCap = Math.max(0, 7 - (e.value ?? REGALIA_ORDER.indexOf(e.kind as Regalia) + 1)); this.ui.feed("—", ""); this.barks.pick(`gate${e.value ?? 1}`, w.frame, true); this.barks.arc = "soft"; break;
      case "RegaliaReturned": this.music.instrumentCap = 7; this.ui.flashWhite(500, 0.35); this.barks.arc = "joy"; this.barks.pick("ascent", w.frame, true); break;
      case "RegaliaClick": if (w.frame % 4 === 0) this.barks.pick("gateClick", w.frame); break;
      case "TemptationTaken": this.progress.data.stats.temptationsTaken++; this.shell.studio.telemetry.record("ishtar.temptation", { regalia: e.kind ?? "" }); break;
      case "PhaseChange": if (e.kind === "ishtar") this.onIshtarPhase(e.value ?? 1, w); break;
      case "DawnProgress": this.vfx.dawnLevel = Math.max(this.vfx.dawnLevel, e.value ?? 0); break;
      case "NameReveal": this.nameReveal(); break;
      case "HubrisShatter": this.music.stop(); setTimeout(() => this.music.play(this.cueFor(w.def), w.def.law), 2000); break;
      case "BossIntro": this.barks.pick(`boss${(e.kind ?? "").charAt(0).toUpperCase()}${(e.kind ?? "").slice(1)}`, w.frame, true); break;
      case "Interact": this.onInteract(e.text ?? ""); break;
      case "SealLost": if ((e.value ?? 6) <= 2) this.barks.pick("lowSeals", w.frame); break;
      case "InsightStart": this.shell.production.onboarding.show("stillness"); break;
      default: break;
    }
  }

  private onBark(b: Bark): void {
    this.ui.subtitle(b, this.a11y.subtitles);
    const vo = this.assets.url(`vo.${b.id}`);
    if (!vo && b.speaker !== "child") this.audio.sfx("voice.blip", 0.6, b.speaker === "markov" ? 1 : 0.7);
    // VO ducks music by −6 dB
    const off = this.mixer.duck("vo", ["music"], 0.5);
    setTimeout(off, 900 + b.line.length * 40);
  }

  // ======================= onboarding (diegetic glyph hints) =======================
  private onboardingTick(w: World, f: InputFrame): void {
    const ob = this.shell.production.onboarding;
    if (f.b & 15) this.noOpFrames = 0; else this.noOpFrames++;
    let want = "";
    if (w.def.kind === "coldOpen") {
      const door = w.director.boss;
      if (door && !door.d.struck) want = "✦";
      else if (w.projectiles.some((p) => p.alive && p.owner === "enemy" && Math.hypot(p.pos.x - w.markov.pos.x, p.pos.z - w.markov.pos.z) < 5)) want = "➚";
      else if (w.actors.some((a) => a.state === "broken")) want = "✦";
    } else if (w.def.id === "1-1" && this.noOpFrames > 300 && w.hostiles().length > 1) want = "➚";
    else if (w.def.trial === 5 && !ob.hasCompletedLesson("compounds") && w.ops.compoundsUsed === 0 && this.noOpFrames > 300) want = "➚✧";
    if (w.ops.compoundsUsed > 0 && !ob.hasCompletedLesson("compounds")) { ob.show("compounds"); ob.completeCurrent(); }
    if (want !== this.hintShown) { this.ui.hint(want, !!want); if (want) this.ui.hint(want, true); this.hintShown = want; }
  }

  // ======================= flow =======================
  toTitle(): void {
    this.mode = "title"; this.run = null; this.world = null;
    this.ui.hideHud();
    const c = el("div", "");
    c.style.cssText = "display:flex;flex-direction:column;align-items:center";
    c.innerHTML = `${SIGIL_SVG.replace('width="180" height="180"', 'width="120" height="120"')}<div class="wordmark"><b>MANDARK</b><span>ISHTAR</span><i></i></div><div class="glyph-prompt"><i></i></div>`;
    this.ui.show(c);
    this.loadBackdrop(OBSERVATORY);
  }

  private loadBackdrop(def: EncounterDef): void {
    this.world = new World(def, { seed: 1, skipIntro: true });
    this.view.load(this.world, this.progress.data.campaignComplete);
    this.camera.reset(this.world);
  }

  private onTitleAccept(): void {
    this.audio.unlock();
    this.music.play("title");
    if (!this.progress.data.seenColdOpen) { this.startCampaignFrom("coldOpen"); return; }
    this.mainMenu();
  }

  mainMenu(): void {
    this.mode = "menu"; this.ui.hideHud();
    const p = this.progress.data;
    const items: MenuItem[] = [
      { label: p.campaignComplete || p.trialsCleared.length || p.encounters["1-1"] ? "Observatory" : "Continue", onSelect: () => this.toHub() },
      { label: "Arcade", disabled: !this.arcadeUnlocked(), onSelect: () => this.arcadeMenu(() => this.mainMenu()) },
      { label: "Settings", onSelect: () => this.settingsMenu(() => this.mainMenu()) },
      { label: "Quit", onSelect: () => this.toTitle() },
    ];
    const m = new Menu(items, (k) => this.audio.sfx(k), () => this.toTitle());
    this.ui.show(this.ui.panel("", m), m);
  }

  private arcadeUnlocked(): boolean { return this.progress.data.trialsCleared.length > 0 || this.progress.data.campaignComplete; }

  toHub(): void {
    this.ui.hideScreen();
    const def = OBSERVATORY;
    this.startWorld(def, { regalia: ["strike", "step"], seals: undefined }, () => undefined);
    this.music.play("observatory");
    this.barks.arc = this.progress.data.campaignComplete ? "joy" : this.barks.arc;
    this.barks.pick(this.progress.data.campaignComplete ? "hubSoft" : "hub", 0, true);
    this.progress.unlockCodex("story:babel");
  }

  private onInteract(tag: string): void {
    if (tag.startsWith("trial-")) {
      const n = Number(tag.slice(6));
      const cleared = this.progress.data.trialsCleared;
      const max = cleared.length ? Math.max(...cleared) + 1 : 1;
      if (n > max && !this.progress.data.campaignComplete) { this.audio.sfx("ui.click.dull"); return; }
      this.startTrial(n);
    } else if (tag === "codex") this.codexMenu(() => this.resumeHub());
    else if (tag === "orrery") { if (this.arcadeUnlocked()) this.arcadeMenu(() => this.resumeHub()); else this.audio.sfx("ui.click.dull"); }
    else if (tag === "mirror") this.settingsMenu(() => this.resumeHub());
    else if (tag === "archive") this.archive(() => this.resumeHub());
  }
  private resumeHub(): void { this.ui.hideScreen(); this.mode = "play"; }

  /** Campaign entry points. */
  startCampaignFrom(segment: "coldOpen" | "descent"): void {
    if (segment === "coldOpen") {
      const stages = [{ def: COLD_OPEN, regalia: COLD_OPEN.regalia!, opts: { teach: true } }, ...TRIALS[0]!.arenas.concat(TRIALS[0]!.bossArena).map((def) => ({ def, regalia: regaliaForTrial(1), opts: {} }))];
      this.run = { kind: "campaign", stages, index: 0, trial: 1, retries: 0, startPhase: 1, segment: "trial", frames: 0, total: 0 };
    } else {
      const stages = [...DESCENT_GATES.map((def) => ({ def, regalia: def.regalia!, opts: {} })), { def: ISHTAR_ARENA, regalia: [] as Regalia[], opts: {} }, ...ASCENT.map((def) => ({ def, regalia: def.regalia!, opts: {} }))];
      this.run = { kind: "campaign", stages, index: 0, trial: 8, retries: 0, startPhase: 1, segment: "descent", frames: 0, total: 0 };
      this.progress.unlockCodex("story:engine");
      this.progress.unlockCodex("story:descent");
    }
    this.playStage();
  }

  startTrial(n: number): void {
    if (n === 8) { this.startCampaignFrom("descent"); return; }
    const t = TRIALS[n - 1]!;
    const stages = [...t.arenas, t.bossArena].map((def) => ({ def, regalia: regaliaForTrial(n), opts: {} }));
    this.run = { kind: "campaign", stages, index: 0, trial: n, retries: 0, startPhase: 1, segment: "trial", frames: 0, total: 0 };
    this.playStage();
  }

  startPlan(plan: ModePlan): void {
    this.run = { kind: "arcade", plan, stages: plan.stages.map((s) => ({ def: s.def, regalia: s.regalia, opts: s.opts })), index: 0, retries: 0, startPhase: 1, segment: plan.mode, frames: 0, total: 0 };
    this.playStage();
  }

  private playStage(): void {
    const run = this.run!;
    const st = run.stages[run.index]!;
    const opts: Partial<WorldOptions> = { ...st.opts, regalia: st.regalia, seals: run.seals, startPhase: run.startPhase, difficulty: this.settings.get("difficulty"), compoundAssist: this.a11y.compoundAssist, autoAim: this.a11y.autoAim };
    this.ui.hideScreen();
    this.startWorld(st.def, opts, (status) => this.onStageEnd(status));
    this.music.play(this.cueFor(st.def), st.def.law === "ishtar" ? null : st.def.law);
    this.music.instrumentCap = st.def.kind === "gate" ? 7 - (st.def.gate ?? 0) : 7;
    if (st.def.kind === "coldOpen") this.barks.pick("coldOpenIntro", 0, true);
    if (st.def.boss === "ishtar") this.barks.pick("ishtarIntro", 0, true);
  }

  private cueFor(def: EncounterDef): string {
    if (def.kind === "hub") return "observatory";
    if (def.kind === "gate") return "descent";
    if (def.kind === "ishtar") return "ishtar";
    if (def.kind === "ascent") return "ascent";
    if (def.law && def.law !== "ishtar") return `law.${def.law}`;
    return "title";
  }

  startWorld(def: EncounterDef, opts: Partial<WorldOptions>, done: (s: "clear" | "lost") => void): World {
    this.seed++;
    const w = new World(def, { seed: this.seed, ...opts });
    this.world = w;
    this.view.load(w, this.progress.data.campaignComplete);
    this.vfx.clear();
    this.camera.reset(w);
    this.ui.buildHud();
    this.mode = "play";
    this.acc = 0;
    this.input.clearToggles();
    this.onArenaDone = done;
    this.barks.scriptedEncounter = def.kind === "coldOpen";
    for (const e of w.events) this.onEvent(e, w);
    return w;
  }

  private onStageEnd(status: "clear" | "lost"): void {
    const run = this.run!, w = this.world!;
    const st = run.stages[run.index]!;
    run.frames += w.frame;
    if (status === "lost") {
      this.progress.data.stats.retries++;
      if (run.kind === "arcade" && run.plan?.endOnLoss) { this.arcadeOver(false); return; }
      run.retries++;
      if (st.def.kind === "boss" || st.def.boss === "ishtar") run.startPhase = Math.max(run.startPhase, run.retries >= 1 ? w.director.bossPhase : 1);
      if (st.def.boss === "ishtar") run.startPhase = 1;
      run.seals = undefined;
      const m = new Menu([{ label: "Retry", onSelect: () => this.playStage() }, { label: run.kind === "campaign" ? "Observatory" : "Quit", onSelect: () => this.toHub() }], (k) => this.audio.sfx(k), () => this.playStage());
      this.mode = "results";
      this.ui.show(this.ui.panel("", m), m);
      return;
    }
    const r = w.scorer.finalized!;
    run.total += r.score;
    this.progress.recordArena(st.def.id, r);
    if (st.def.kind === "coldOpen") this.progress.data.seenColdOpen = true;
    run.seals = w.markov.seals;
    run.retries = 0; run.startPhase = 1;
    if (run.plan?.carrySeals && run.plan.sealBonus) run.seals = Math.min(w.markov.maxSeals, w.markov.seals + run.plan.sealBonus);
    void this.saveProgress();
    const next = () => {
      run.index++;
      if (run.index < run.stages.length) { this.playStage(); return; }
      this.onRunComplete();
    };
    if (st.def.kind === "coldOpen" || st.def.kind === "gate" || st.def.kind === "ascent" || st.def.kind === "ishtar" || st.def.boss === "child") { next(); return; }
    this.mode = "results";
    const m = new Menu([{ label: "Continue", onSelect: next }, { label: "Retry Arena", onSelect: () => { run.seals = undefined; this.playStage(); } }], (k) => this.audio.sfx(k), next);
    this.ui.results(r, m, st.def.label ?? st.def.id.toUpperCase());
  }

  private onRunComplete(): void {
    const run = this.run!;
    if (run.kind === "arcade") { this.arcadeOver(true); return; }
    if (run.segment === "trial" && run.trial) {
      const t = TRIALS[run.trial - 1]!;
      const bossRank = this.progress.data.encounters[t.bossArena.id]?.rank ?? "conjecture";
      this.progress.clearTrial(run.trial, t.boss, bossRank);
      this.world?.emit("TrialClear", { value: run.trial });
      void this.saveProgress();
      if (run.trial === 7) { this.startCampaignFrom("descent"); return; }
      this.toHub();
      return;
    }
    if (run.segment === "descent") {
      this.progress.completeCampaign();
      this.progress.unlockCodex("story:name");
      this.progress.unlockMarginalia(["story:ishtar", "story:name", "story:descent", "story:engine"]);
      void this.saveProgress();
      this.credits();
    }
  }

  private arcadeOver(complete: boolean): void {
    const run = this.run!, plan = run.plan!;
    const key = `${plan.mode}:${plan.label}`;
    if (plan.mode === "timeAttack" && complete) { const best = this.progress.data.bestTimes[key]; if (!best || run.frames < best) this.progress.data.bestTimes[key] = run.frames; }
    if (plan.mode === "scoreAttack" || plan.mode === "bossRush") { const best = this.progress.data.bestScores[key] ?? 0; if (run.total > best) this.progress.data.bestScores[key] = Math.round(run.total); }
    if (plan.mode === "theorems") { const ok = complete && (this.world?.scorer.finalized?.constraintOk ?? false); if (ok) this.progress.data.theorems[plan.label.split(" ")[0]!] = true; }
    void this.saveProgress();
    const body = el("div", "", `<div style="font-size:30px;text-align:center;font-variant-numeric:tabular-nums">${plan.mode === "timeAttack" ? (run.frames / 60).toFixed(2) + "s" : Math.round(run.total).toLocaleString("en-US")}</div>`);
    const m = new Menu([{ label: "Retry", onSelect: () => this.startPlan(plan) }, { label: "Observatory", onSelect: () => this.toHub() }], (k) => this.audio.sfx(k), () => this.toHub());
    this.mode = "results";
    this.ui.show(this.ui.panel(plan.label, m, body), m);
  }

  async saveProgress(): Promise<void> {
    this.progress.data.onboarding = this.shell.production.onboarding.snapshot();
    try { await this.progress.save(); } catch (e) { this.shell.studio.diagnostics.capture(e, { scope: "save" }); }
  }

  // ======================= pause =======================
  pause(): void {
    if (this.mode !== "play" || !this.world || this.bot) return;
    if (this.world.def.kind === "hub") { this.mainMenu(); return; }
    this.mode = "paused";
    this.shell.pause?.();
    this.audio.pauseAll();
    const run = this.run;
    const items: MenuItem[] = [
      { label: "Resume", onSelect: () => this.resume() },
      { label: "Retry Arena", onSelect: () => { this.audio.resumeAll(); if (run) { run.seals = undefined; this.playStage(); } } },
      { label: "Retry Trial", disabled: !run || run.kind !== "campaign" || run.segment !== "trial", onSelect: () => { this.audio.resumeAll(); if (run?.trial) this.startTrial(run.trial); } },
      { label: "Settings", onSelect: () => this.settingsMenu(() => this.pauseMenuAgain()) },
      { label: "Observatory", disabled: run?.segment === "descent" && false, onSelect: () => { this.audio.resumeAll(); this.toHub(); } },
    ];
    const m = new Menu(items, (k) => this.audio.sfx(k), () => this.resume());
    this.ui.show(this.ui.panel("", m), m);
  }
  private pauseMenuAgain(): void { this.mode = "play"; this.pause(); }
  resume(): void { this.ui.hideScreen(); this.audio.resumeAll(); this.shell.resume?.(); this.mode = "play"; this.acc = 0; this.last = 0; }
  retryArena(): void { if (this.run) this.playStage(); else this.toTitle(); }

  private peekLaw(): void {
    const w = this.world!;
    this.mode = "paused";
    const card = this.ui.lawPeek(w.def.law as LawId, this.assets.url(`lawcard.${w.def.law}`));
    const m = new Menu([{ label: "", onSelect: () => this.resume() }], (k) => this.audio.sfx(k), () => this.resume());
    m.root.style.display = "none";
    const wrap = el("div", ""); wrap.style.cssText = "position:relative;width:100%;height:100%"; wrap.appendChild(card);
    wrap.addEventListener("click", () => this.resume());
    this.ui.show(wrap, m, true);
    const close = () => { if (this.input.pressed("codex")) this.resume(); else if (this.mode === "paused") requestAnimationFrame(close); };
    requestAnimationFrame(close);
  }

  // ======================= Ishtar / ending =======================
  private onIshtarPhase(phase: number, w: World): void {
    if (phase === 2) this.barks.pick("temptation", w.frame, true);
    if (phase === 3) { this.barks.pick("stillness", w.frame, true); this.music.stop(); }
    if (phase === 4) { this.barks.pick("dawnBreaks", w.frame, true); }
  }

  private nameReveal(): void {
    this.audio.sfx("dawn.chord");
    this.vfx.dawnLevel = 1;
    setTimeout(() => this.barks.pick("nameVoice", 0, true), 1200);
    setTimeout(() => this.barks.pick("nameReply", 0, true), 3200);
    setTimeout(() => {
      const r = el("div", "reveal serif", "LAZAR");
      this.ui.overlay.appendChild(r);
      requestAnimationFrame(() => r.classList.add("on"));
      setTimeout(() => { r.classList.remove("on"); setTimeout(() => r.remove(), 1600); }, 2600);
      this.progress.unlockCodex("story:name");
      this.progress.unlockCodex("story:ishtar");
    }, 4400);
  }

  credits(): void {
    this.mode = "cutscene";
    this.loadBackdrop(OBSERVATORY);
    this.music.play("ascent");
    const c = el("div", "credits");
    c.innerHTML = `<div class="roll serif" style="line-height:2.2;font-size:20px">${SIGIL_SVG}<br><br>MANDARK ISHTAR<br><br>Design &amp; direction<br>Michael<br><br>Markov<br>Michael<br><br>Built on the SLU Web Shell<br><br><br>∎</div>`;
    const m = new Menu([{ label: "Observatory", onSelect: () => this.toHub() }], (k) => this.audio.sfx(k), () => this.toHub());
    this.ui.show(c, m);
    setTimeout(() => { if (this.mode === "cutscene") this.toHub(); }, 42000);
  }

  // ======================= menus =======================
  arcadeMenu(back: () => void): void {
    this.mode = "menu";
    const p = this.progress;
    const items: MenuItem[] = [
      { label: "Time Attack", disabled: !p.data.trialsCleared.length, onSelect: () => this.trialPicker((n) => this.startPlan(timeAttack(n)), () => this.arcadeMenu(back)) },
      { label: "Score Attack", disabled: !p.has("scoreAttack"), onSelect: () => this.startPlan(scoreAttack(Math.floor(this.t * 1000) % 100000)) },
      { label: "Daily", disabled: !p.has("scoreAttack"), onSelect: () => this.startPlan(dailyScoreAttack()) },
      { label: "Boss Rush", disabled: !p.has("bossRush"), onSelect: () => this.startPlan(bossRush()) },
      { label: "Theorems", disabled: !THEOREM_CHALLENGES.some((c) => p.has(`theorem:${c.id}`)), onSelect: () => this.theoremMenu(() => this.arcadeMenu(back)) },
      { label: "Laboratory", disabled: !p.has("laboratory"), onSelect: () => this.startPlan(laboratory()) },
    ];
    const m = new Menu(items, (k) => this.audio.sfx(k), back);
    this.ui.show(this.ui.panel("", m), m);
  }

  private trialPicker(go: (n: number) => void, back: () => void): void {
    const items: MenuItem[] = TRIALS.map((t) => ({ label: LAWS[t.law].name, disabled: !this.progress.data.trialsCleared.includes(t.index), value: () => { const b = this.progress.data.bestTimes[`timeAttack:Trial ${t.index}`]; return b ? `${(b / 60).toFixed(1)}s` : ""; }, onSelect: () => go(t.index) }));
    const m = new Menu(items, (k) => this.audio.sfx(k), back);
    this.ui.show(this.ui.panel("", m), m);
  }

  private theoremMenu(back: () => void): void {
    const items: MenuItem[] = THEOREM_CHALLENGES.map((c) => ({ label: `${c.id}  ${c.label}`, disabled: !this.progress.has(`theorem:${c.id}`), value: () => (this.progress.data.theorems[c.id] ? "∎" : ""), onSelect: () => this.startPlan(theorem(c.id)) }));
    const m = new Menu(items, (k) => this.audio.sfx(k), back);
    const p = this.ui.panel("", m); p.style.maxHeight = "80vh"; p.style.overflow = "auto";
    this.ui.show(p, m);
  }

  codexMenu(back: () => void): void {
    this.mode = "menu";
    const unlocked = CODEX.filter((c) => this.progress.data.codex.includes(c.id));
    const entry = el("div", "entry");
    const show = (i: number) => {
      const c = unlocked[i]; if (!c) { entry.innerHTML = ""; return; }
      const marg = this.progress.data.marginalia.includes(c.id) ? c.marginalia.map((m) => `<div class="marg">${m.text}<small>${m.ref}</small></div>`).join("") : "";
      const plate = this.assets.url(`codex.${c.id}`);
      entry.innerHTML = `<div class="plate" style="${plate ? `background-image:url(${plate})` : ""}">${plate ? "" : codexArt(c.id)}</div><h3 class="serif">${c.title}</h3><div>${c.note}</div>${marg}`;
    };
    const items: MenuItem[] = unlocked.map((c, i) => ({ label: c.title, onSelect: () => show(i) }));
    const m = new Menu(items.length ? items : [{ label: "—", disabled: true }], (k) => this.audio.sfx(k), back);
    const wrap = el("div", "codex"); const list = el("div", "list"); list.appendChild(m.root); wrap.append(list, entry);
    const origHandle = m.handle.bind(m);
    m.handle = (inp) => { origHandle(inp); show(m.index); };
    show(0);
    this.ui.show(this.ui.panel("", null, wrap), m);
  }

  private archive(back: () => void): void {
    this.mode = "menu";
    const d = this.progress.data;
    const ranks = Object.entries(d.encounters).map(([k, v]) => `<tr><td>${k}</td><td>${RANK_GLYPH[v.rank]}</td><td>${v.best.toLocaleString("en-US")}</td></tr>`).join("");
    const body = el("div", "results", `<table>${ranks}<tr><td>Contradictions</td><td></td><td>${d.stats.contradictions}</td></tr><tr><td>Q.E.D.</td><td></td><td>${d.stats.qeds}</td></tr></table>`);
    body.style.maxHeight = "60vh"; body.style.overflow = "auto";
    const m = new Menu([{ label: "Back", onSelect: back }], (k) => this.audio.sfx(k), back);
    this.ui.show(this.ui.panel("", m, body), m);
  }

  settingsMenu(back: () => void): void {
    this.mode = this.mode === "play" ? "paused" : this.mode === "paused" ? "paused" : "menu";
    const S = this.settings;
    const pct = (v: number) => `${Math.round(v * 100)}%`;
    const step = (k: keyof GameSettings, d: number, lo = 0, hi = 1) => () => void S.patch({ [k]: Math.max(lo, Math.min(hi, Math.round(((S.get(k) as number) + d) * 100) / 100)) } as Partial<GameSettings>);
    const a = (k: keyof GameAccessibility, v: GameAccessibility[keyof GameAccessibility]) => void S.patch({ a11y: { ...S.get("a11y"), [k]: v } });
    const A = () => S.get("a11y");
    const diffs: DifficultyId[] = ["scholar", "savant", ...(this.progress.has("difficulty:paragon") ? ["paragon" as DifficultyId] : [])];
    const items: MenuItem[] = [
      { label: "Master", value: () => pct(S.get("masterVolume")), onLeft: step("masterVolume", -0.1), onRight: step("masterVolume", 0.1), onSelect: step("masterVolume", 0.1) },
      { label: "Music", value: () => pct(S.get("musicVolume")), onLeft: step("musicVolume", -0.1), onRight: step("musicVolume", 0.1), onSelect: step("musicVolume", 0.1) },
      { label: "Effects", value: () => pct(S.get("sfxVolume")), onLeft: step("sfxVolume", -0.1), onRight: step("sfxVolume", 0.1), onSelect: step("sfxVolume", 0.1) },
      { label: "Difficulty", value: () => DIFFICULTIES[S.get("difficulty")].name, onSelect: () => void S.patch({ difficulty: diffs[(diffs.indexOf(S.get("difficulty")) + 1) % diffs.length]! }) },
      { label: "Subtitles", value: () => (A().subtitles ? A().subtitleSize : "Off"), onSelect: () => { const o = ["S", "M", "L"] as const; if (!A().subtitles) { a("subtitles", true); a("subtitleSize", "S"); } else if (A().subtitleSize === "L") a("subtitles", false); else a("subtitleSize", o[o.indexOf(A().subtitleSize) + 1]!); } },
      { label: "Text size", value: () => pct(A().textScale), onLeft: () => a("textScale", Math.max(0.8, A().textScale - 0.1)), onRight: () => a("textScale", Math.min(1.6, A().textScale + 0.1)), onSelect: () => a("textScale", A().textScale >= 1.6 ? 0.8 : A().textScale + 0.1) },
      { label: "Screen shake", value: () => pct(A().screenShake), onLeft: () => a("screenShake", Math.max(0, A().screenShake - 0.25)), onRight: () => a("screenShake", Math.min(1, A().screenShake + 0.25)), onSelect: () => a("screenShake", A().screenShake <= 0 ? 1 : A().screenShake - 0.25) },
      { label: "Flash intensity", value: () => pct(A().flashIntensity), onLeft: () => a("flashIntensity", Math.max(0, A().flashIntensity - 0.25)), onRight: () => a("flashIntensity", Math.min(1, A().flashIntensity + 0.25)), onSelect: () => a("flashIntensity", A().flashIntensity <= 0 ? 1 : A().flashIntensity - 0.25) },
      { label: "Inversion → rim pulse", value: () => (A().inversionAsRim ? "On" : "Off"), onSelect: () => a("inversionAsRim", !A().inversionAsRim) },
      { label: "Reduce motion", value: () => (A().reducedMotion ? "On" : "Off"), onSelect: () => a("reducedMotion", !A().reducedMotion) },
      { label: "High-contrast telegraphs", value: () => (A().highContrastTelegraphs ? "On" : "Off"), onSelect: () => a("highContrastTelegraphs", !A().highContrastTelegraphs) },
      { label: "Game speed", value: () => pct(A().gameSpeed), onSelect: () => a("gameSpeed", A().gameSpeed <= 0.7 ? 1 : Math.round((A().gameSpeed - 0.1) * 10) / 10) },
      { label: "Compound window", value: () => (A().compoundAssist ? "30f" : "18f"), onSelect: () => a("compoundAssist", !A().compoundAssist) },
      { label: "Auto-aim", value: () => pct(A().autoAim), onSelect: () => a("autoAim", A().autoAim >= 1 ? 0 : Math.round((A().autoAim + 0.25) * 100) / 100) },
      { label: "Hold → toggle", value: () => (A().holdToToggle ? "On" : "Off"), onSelect: () => a("holdToToggle", !A().holdToToggle) },
      { label: "Deadzone L", value: () => A().deadzoneLeft.toFixed(2), onSelect: () => a("deadzoneLeft", A().deadzoneLeft >= 0.35 ? 0.08 : Math.round((A().deadzoneLeft + 0.03) * 100) / 100) },
      { label: "Deadzone R", value: () => A().deadzoneRight.toFixed(2), onSelect: () => a("deadzoneRight", A().deadzoneRight >= 0.4 ? 0.1 : Math.round((A().deadzoneRight + 0.03) * 100) / 100) },
      { label: "Vibration", value: () => (S.get("vibration") ? "On" : "Off"), onSelect: () => void S.patch({ vibration: !S.get("vibration") }) },
      { label: "Controls", onSelect: () => this.remapMenu(() => this.settingsMenu(back)) },
      { label: "Export diagnostics", onSelect: () => this.exportDiagnostics() },
      { label: "Back", onSelect: back },
    ];
    const m = new Menu(items, (k) => this.audio.sfx(k), back);
    const p = this.ui.panel("", m); p.style.maxHeight = "86vh"; p.style.overflow = "auto";
    this.ui.show(p, m);
  }

  /** Full remapping per device: select an action, then press the new key / mouse button / pad button. */
  remapMenu(back: () => void): void {
    const S = this.settings;
    const label = (b: Binding) => [...b.keyboard.map((k) => k.replace(/^Key|^Digit/, "")), ...(b.mouseButtons ?? []).map((m) => ["LMB", "MMB", "RMB"][m] ?? `M${m}`), ...(b.gamepadButtons ?? []).map((g) => `◉${g}`)].join(" / ");
    const items: MenuItem[] = REMAPPABLE.map((act) => ({
      label: act, value: () => label(S.get("bindings").find((b) => b.action === act)!),
      onSelect: () => this.captureBinding(act, () => this.remapMenu(back)),
    }));
    items.push({ label: "Reset", onSelect: () => { void S.patch({ bindings: structuredClone(DEFAULT_BINDINGS) }).then(() => { this.input.setBindings(S.get("bindings")); this.remapMenu(back); }); } });
    items.push({ label: "Back", onSelect: back });
    const m = new Menu(items, (k) => this.audio.sfx(k), back);
    this.ui.show(this.ui.panel("", m), m);
  }

  private captureBinding(action: string, done: () => void): void {
    const S = this.settings;
    const p = el("div", "panel", `<div class="glyph-prompt"><i></i></div>`);
    this.ui.show(p, null);
    const finish = (patch: (b: Binding) => void) => {
      window.removeEventListener("keydown", onKey, true); window.removeEventListener("mousedown", onMouse, true); cancelAnimationFrame(raf); this.input.endProbe();
      const bindings = structuredClone(S.get("bindings"));
      const b = bindings.find((x) => x.action === action)!;
      patch(b);
      void S.patch({ bindings }).then(() => { this.input.setBindings(bindings); done(); });
    };
    const onKey = (e: KeyboardEvent) => { e.preventDefault(); e.stopPropagation(); if (e.code === "Escape") { finish(() => undefined); return; } finish((b) => { b.keyboard = [e.code]; }); };
    const onMouse = (e: MouseEvent) => { e.preventDefault(); finish((b) => { b.mouseButtons = [e.button]; }); };
    let raf = 0;
    this.input.padButtonsPressed();
    const pads = () => {
      const b = this.input.padButtonsPressed().filter((x) => x !== 9);
      if (b.length) { this.input.endProbe(); finish((x) => { x.gamepadButtons = [b[0]!]; }); return; }
      raf = requestAnimationFrame(pads);
    };
    setTimeout(() => { window.addEventListener("keydown", onKey, true); window.addEventListener("mousedown", onMouse, true); raf = requestAnimationFrame(pads); }, 150);
  }

  exportDiagnostics(): string {
    const bundle = this.shell.exportPlaytestBundle({ extras: { perf: this.perfSummary(), progress: this.progress.data, events: this.allEvents.slice(-200) } } as never);
    try {
      const blob = new Blob([bundle], { type: "application/json" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "mandark-ishtar-diagnostics.json"; a.click();
    } catch { /* headless */ }
    return bundle;
  }

  perfSummary(): Record<string, number> {
    const q = (arr: number[], p: number) => { if (!arr.length) return 0; const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(s.length * p))]!; };
    return {
      frameP50: q(this.perf.frameMs, 0.5), frameP95: q(this.perf.frameMs, 0.95), simP50: q(this.perf.simMs, 0.5), simP95: q(this.perf.simMs, 0.95),
      drawCalls: this.perf.drawCalls, triangles: this.perf.triangles, heapMB: this.perf.heapMB, afterimages: this.view.afterimageCount,
      projectiles: this.world?.projectiles.filter((p) => p.alive).length ?? 0, enemies: this.world?.actors.filter((a) => a.alive).length ?? 0,
      targetFrameMs: PERF.frameMsP95, targetSimMs: PERF.simMs, targetDrawCalls: PERF.drawCalls,
    };
  }

  /** Dev: run a bot on the current or a named encounter. */
  runBot(name: "solver" | "passive" | "none"): void { this.bot = name === "solver" ? new SolverBot() : name === "passive" ? new PassiveBot() : null; }
  jump(id: string): void {
    const def = id === "laboratory" ? LABORATORY : id === "observatory" ? OBSERVATORY : encounterById(id);
    if (!def) throw new Error(`unknown encounter ${id}`);
    if (def.kind === "hub") { this.toHub(); return; }
    const trial = def.trial ?? 7;
    const regalia = def.regalia ?? (def.kind === "lab" ? [...REGALIA_ORDER] : regaliaForTrial(trial));
    this.run = { kind: "campaign", stages: [{ def, regalia, opts: {} }], index: 0, trial, retries: 0, startPhase: 1, segment: def.kind === "gate" || def.kind === "ishtar" || def.kind === "ascent" ? "jump" : "jump", frames: 0, total: 0 };
    this.playStage();
  }
}

function compoundName(id: string): string {
  const names: Record<string, string> = { ghostLance: "GHOST LANCE", passingTurn: "PASSING TURN", recurrence: "RECURRENCE", slingshot: "SLINGSHOT", cleanLine: "CLEAN LINE", unanchor: "UNANCHOR", echo: "ECHO", fold: "FOLD", voidStep: "VOID STEP", severance: "SEVERANCE", delayedErase: "DELAYED ERASE", unwind: "UNWIND" };
  return names[id] ?? id;
}
