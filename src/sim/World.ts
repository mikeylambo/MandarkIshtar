import { DeterministicRngRegistry, type DeterministicRng } from "@slu/web-shell";
import { DIFFICULTIES, type DifficultyDef, type DifficultyId } from "../data/difficulty";
import { STILLNESS } from "../data/resources";
import { AI } from "../data/ai";
import { CertaintyLedger } from "../combat/CertaintyLedger";
import { EleganceScorer } from "../combat/EleganceScorer";
import { LawDirector } from "../laws/LawDirector";
import { InputIntent } from "../ops/InputIntent";
import { OpSystem } from "../ops/OpSystem";
import { AttackTokens } from "../actors/AttackTokens";
import { behaviorFor } from "../actors/registry";
import { freedUpdate } from "../actors/common";
import { EncounterDirector } from "../campaign/EncounterDirector";
import { MarkovController } from "./MarkovController";
import { ProjectileSystem } from "./ProjectileSystem";
import { SpatialHash } from "./SpatialHash";
import { PosHistory, type Actor, type Hazard, type HazardShape, type Projectile, type Prop, type TargetRef } from "./entities";
import type { EncounterDef } from "./encounter";
import type { SimEvent, SimEventType } from "./events";
import { clamp, dist, hashMix, len, norm, v } from "./math";
import type { ActorType, InputFrame, Owner, ProjectileShape, PropType, Regalia, Vec } from "./types";
import { REGALIA_ORDER } from "./types";

export type RngStream = "ai" | "spawn" | "law" | "boss" | "mode";
export type WorldStatus = "intro" | "playing" | "flourish" | "clear" | "lost";

export interface WorldOptions {
  seed: number | string;
  difficulty?: DifficultyId;
  regalia?: Regalia[];
  seals?: number;
  maxSeals?: number;
  hubris?: number;
  compoundAssist?: boolean;
  autoAim?: number;
  lawModifiers?: string[];
  infiniteFocus?: boolean;
  /** Skip the Law-card intro (tests, Laboratory). */
  skipIntro?: boolean;
  flourishFrames?: number;
  /** Feature flags for onboarding (cold open slow-mo on first Vector). */
  teach?: boolean;
  /** Theorem-challenge / mode constraints, evaluated by the scorer. */
  constraint?: string;
  /** Boss retry assist: start from this phase checkpoint. */
  startPhase?: number;
}

export class World {
  frame = 0;
  readonly rng = new DeterministicRngRegistry<RngStream>(["ai", "spawn", "law", "boss", "mode"]);
  readonly diff: DifficultyDef;
  events: SimEvent[] = [];
  readonly actors: Actor[] = [];
  readonly projectiles: Projectile[] = [];
  readonly props: Prop[] = [];
  readonly hazards: Hazard[] = [];
  private nextId = 1;

  readonly markov: MarkovController;
  readonly intent: InputIntent;
  readonly ops: OpSystem;
  readonly ledger = new CertaintyLedger();
  readonly scorer: EleganceScorer;
  readonly law: LawDirector;
  readonly director: EncounterDirector;
  readonly tokens: AttackTokens;
  readonly projectileSystem = new ProjectileSystem();
  readonly hash = new SpatialHash(4);

  status: WorldStatus = "intro";
  statusT = 0;
  hitstop = 0;
  /** Extra global time scale from scripted moments (cold-open teach slow-mo). */
  scriptScale = 1;
  scriptScaleT = 0;
  lastInput: InputFrame = { mx: 0, mz: 0, ax: 0, az: 0, aiming: false, b: 0 };
  /** Generic scratch for encounter scripts (numbers only). */
  readonly flags: Record<string, number> = {};

  constructor(readonly def: EncounterDef, readonly opts: WorldOptions) {
    this.rng.init(opts.seed);
    this.diff = DIFFICULTIES[opts.difficulty ?? "savant"];
    this.tokens = new AttackTokens(this.diff.attackTokens);
    const regalia = def.regalia ?? opts.regalia ?? [...REGALIA_ORDER];
    this.markov = new MarkovController(this, regalia, opts.seals ?? this.diff.seals, opts.maxSeals ?? this.diff.seals, opts.hubris ?? 0);
    this.intent = new InputIntent(opts.compoundAssist ?? false);
    this.ops = new OpSystem(this);
    this.scorer = new EleganceScorer(this);
    this.law = new LawDirector(this);
    this.director = new EncounterDirector(this);
    if (opts.skipIntro || !def.law) { this.status = "playing"; } else { this.statusT = 120; }
    this.director.init();
    this.law.init();
    this.emit("EncounterStart", { kind: def.kind, text: def.id });
  }

  // ---------- ids, rng, events ----------
  id(): number { return this.nextId++; }
  r(stream: RngStream): DeterministicRng { return this.rng.stream(stream); }
  emit(type: SimEventType, payload: Omit<SimEvent, "type" | "frame"> = {}): void {
    this.events.push({ type, frame: this.frame, ...payload });
  }

  /** Global world time scale (Insight, flourish, scripted). Markov is unaffected by Insight. */
  get worldScale(): number {
    let s = this.scriptScale;
    if (this.markov.insightT > 0) s *= STILLNESS.insightTimeScale;
    if (this.status === "flourish") s *= 0.3;
    return s;
  }
  dtFor(a: { localScale: number; hitstop?: number }): number {
    if (a.hitstop && a.hitstop > 0) return 0;
    return this.worldScale * a.localScale;
  }

  // ---------- main step ----------
  step(input: InputFrame): void {
    this.frame++;
    this.events = [];
    this.lastInput = input;
    if (this.status === "clear" || this.status === "lost") return;

    if (this.status === "intro") {
      // Law card / boss intro eats gameplay input; buffered inputs are dropped.
      this.intent.reset();
      if (--this.statusT <= 0) { this.status = "playing"; this.director.onIntroDone(); }
      return;
    }

    if (this.status === "flourish") {
      this.statusT--;
      // Skippable after 15f by any input.
      const any = input.b !== 0 || Math.hypot(input.mx, input.mz) > 0.5;
      const elapsed = (this.opts.flourishFrames ?? 45) - this.statusT;
      if (this.statusT <= 0 || (any && elapsed >= 15)) { this.status = "clear"; this.director.onClear(); }
      return;
    }

    this.intent.update(input, this.frame);
    if (this.scriptScaleT > 0 && --this.scriptScaleT <= 0) this.scriptScale = 1;

    if (this.hitstop > 0) { this.hitstop--; return; }

    this.markov.update(input);
    this.ops.update();
    this.director.update();
    this.law.update();
    this.updateActors();
    this.projectileSystem.update(this);
    this.updateProps();
    this.updateHazards();
    this.ledger.update(this);
    this.markov.postUpdate(input);
    this.cleanup();
    this.director.checkEnd();
  }

  private updateActors(): void {
    this.tokens.update(this);
    for (const a of this.actors) {
      if (!a.alive) continue;
      if (a.hitstop > 0) { a.hitstop--; continue; }
      const dt = this.dtFor(a);
      a.age += dt;
      if (a.delayT > 0) { a.delayT -= this.worldScale; if (a.delayT <= 0) a.localScale = 1; }
      if (a.stripT > 0) { a.stripT -= dt; if (a.stripT <= 0) this.ledger.restoreStrip(this, a); }
      if (a.phasedT > 0) a.phasedT -= dt;
      if (a.buffT > 0) { a.buffT -= dt; if (a.buffT <= 0) this.ledger.removeBuff(this, a); }
      if (a.rewindT > 0) { this.ops.stepRewindActor(a); continue; }
      if (a.orbitT > 0) { this.ops.stepOrbitActor(a); continue; }
      if (a.thrownT > 0) { this.stepThrown(a, dt); continue; }
      if (a.state === "broken") { this.ledger.stepBroken(this, a, dt); this.applyVelocity(a, dt); continue; }
      if (a.state === "spawn") {
        a.stateT -= dt;
        if (a.stateT <= 0) { a.state = "idle"; a.stateT = 0; }
        continue;
      }
      if (a.state === "stun") { a.stateT -= dt; this.applyVelocity(a, dt); if (a.stateT <= 0) a.state = "recover"; continue; }
      if (a.neutral) freedUpdate(this, a, dt);
      else if (a.d.passive && (this.flags.aggroUntil ?? -1) < this.frame) { a.history.push(a.pos); continue; }
      else behaviorFor(a.type).update(this, a, dt);
      this.applyVelocity(a, dt);
      a.history.push(a.pos);
    }
    this.separateActors();
  }

  /** Knockback velocity integration with friction, arena bounds and ring-out. */
  applyVelocity(a: Actor, dt: number): void {
    if (a.vel.x === 0 && a.vel.z === 0) return;
    a.pos.x += a.vel.x * dt / 60;
    a.pos.z += a.vel.z * dt / 60;
    const f = Math.pow(0.86, dt);
    a.vel.x *= f; a.vel.z *= f;
    if (Math.hypot(a.vel.x, a.vel.z) < 0.05) { a.vel.x = 0; a.vel.z = 0; }
    this.boundActor(a);
  }

  private stepThrown(a: Actor, dt: number): void {
    a.thrownT -= dt;
    a.pos.x += a.vel.x * dt / 60;
    a.pos.z += a.vel.z * dt / 60;
    a.history.push(a.pos);
    this.ledger.checkThrownCollisions(this, a);
    if (!a.alive) return;
    if (this.boundActor(a)) return;
    if (a.thrownT <= 0) { a.thrownBy = null; a.vel = v(); if (a.state !== "broken") { a.state = "recover"; a.stateT = 20; } }
  }

  /** Returns true if the actor left the arena (ring-out) or hit a wall this frame. */
  boundActor(a: Actor): boolean {
    const R = this.def.arena.radius;
    const d = len(a.pos);
    // obstacles
    for (const o of this.def.arena.obstacles) {
      const dd = Math.hypot(a.pos.x - o.x, a.pos.z - o.z);
      const min = o.r + a.radius;
      if (dd < min && dd > 1e-6) {
        const nx = (a.pos.x - o.x) / dd, nz = (a.pos.z - o.z) / dd;
        a.pos.x = o.x + nx * min; a.pos.z = o.z + nz * min;
        if (a.thrownT > 0 || Math.hypot(a.vel.x, a.vel.z) > 1) { this.ledger.wallImpact(this, a); return true; }
      }
    }
    if (d + a.radius <= R) return false;
    if (this.def.arena.edge === "void" && !a.boss && a.type !== "child" && a.type !== "ishtar") {
      if (d > R + 0.3) { this.ledger.ringOut(this, a); return true; }
      return false;
    }
    const n = norm(a.pos);
    const speed = Math.hypot(a.vel.x, a.vel.z);
    a.pos.x = n.x * (R - a.radius); a.pos.z = n.z * (R - a.radius);
    if (speed > 0.5 || a.thrownT > 0) { this.ledger.wallImpact(this, a, speed); return true; }
    return false;
  }

  private separateActors(): void {
    const list = this.actors;
    for (let i = 0; i < list.length; i++) {
      const a = list[i]!;
      if (!a.alive || a.thrownT > 0 || a.orbitT > 0 || a.spectral) continue;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j]!;
        if (!b.alive || b.thrownT > 0 || b.orbitT > 0 || b.spectral) continue;
        if (a.type === "child" || b.type === "child" || a.type === "ishtar" || b.type === "ishtar") continue;
        const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z;
        const min = (a.radius + b.radius) * 0.9;
        const d2 = dx * dx + dz * dz;
        if (d2 >= min * min || d2 < 1e-8) continue;
        const d = Math.sqrt(d2), push = (min - d) * 0.5;
        const nx = dx / d, nz = dz / d;
        const aw = a.immovable || a.boss ? 0 : 1, bw = b.immovable || b.boss ? 0 : 1;
        const tot = aw + bw || 1;
        a.pos.x -= nx * push * 2 * aw / tot; a.pos.z -= nz * push * 2 * aw / tot;
        b.pos.x += nx * push * 2 * bw / tot; b.pos.z += nz * push * 2 * bw / tot;
      }
    }
  }

  private updateProps(): void {
    for (const p of this.props) {
      if (!p.alive) continue;
      p.t++;
      behaviorProp(this, p);
      if ((p.d.slideT ?? 0) > 0) {
        p.d.slideT -= this.worldScale;
        p.pos.x += (p.vel.x * this.worldScale) / 60; p.pos.z += (p.vel.z * this.worldScale) / 60;
        if (p.d.slideT <= 0) p.vel = v();
        for (const o of this.def.arena.obstacles) {
          const dd = Math.hypot(p.pos.x - o.x, p.pos.z - o.z);
          if (dd < o.r + p.radius && dd > 1e-6) { p.pos.x = o.x + ((p.pos.x - o.x) / dd) * (o.r + p.radius); p.pos.z = o.z + ((p.pos.z - o.z) / dd) * (o.r + p.radius); p.vel = v(); p.d.slideT = 0; }
        }
        const R = this.def.arena.radius - p.radius - 0.5;
        const d = len(p.pos);
        if (d > R) { const n = norm(p.pos); p.pos = { x: n.x * R, z: n.z * R }; p.vel = v(); }
      }
    }
  }

  private updateHazards(): void {
    for (const h of this.hazards) {
      if (!h.alive) continue;
      if (h.telegraphT > 0) { h.telegraphT -= this.worldScale; if (h.telegraphT <= 0) this.emit("Shockwave", { x: h.pos.x, z: h.pos.z, kind: h.kind, value: h.radius }); continue; }
      h.activeT -= this.worldScale;
      if (h.grow) h.radius += h.grow * this.worldScale;
      if (!h.spent && this.hazardHits(h, this.markov.pos, this.markov.radius)) {
        if (this.markov.hit(h.kind, h.pos)) h.spent = true;
      }
      if (h.activeT <= 0) h.alive = false;
    }
  }

  hazardHits(h: Hazard, p: Vec, r: number): boolean {
    if (h.telegraphT > 0) return false;
    if (h.shape === "circle") return dist(h.pos, p) < h.radius + r;
    if (h.shape === "ring") { const d = dist(h.pos, p); return Math.abs(d - h.radius) < h.width + r; }
    // line
    const ax = h.pos.x, az = h.pos.z, bx = h.end.x, bz = h.end.z;
    const abx = bx - ax, abz = bz - az, l2 = abx * abx + abz * abz;
    const t = l2 > 0 ? clamp(((p.x - ax) * abx + (p.z - az) * abz) / l2, 0, 1) : 0;
    return Math.hypot(p.x - (ax + abx * t), p.z - (az + abz * t)) < h.width + r;
  }

  private cleanup(): void {
    if (this.frame % 30 !== 0) return;
    compact(this.actors);
    compact(this.projectiles);
    compact(this.hazards);
  }

  // ---------- spawning ----------
  spawnActor(type: ActorType, pos: Vec, o: Partial<Pick<Actor, "elite" | "shadowed" | "commandedBy" | "waveIndex">> & { spawnFrames?: number; certainty?: number } = {}): Actor {
    const beh = behaviorFor(type);
    const base = beh.stats(this);
    const elite = o.elite ?? false;
    const maxC = (o.certainty ?? base.certainty) * (elite ? 2 : 1);
    const a: Actor = {
      id: this.id(), type, pos: { ...pos }, vel: v(), facing: norm({ x: -pos.x, z: -pos.z }), radius: base.radius,
      certainty: maxC, maxCertainty: maxC, alive: true,
      state: o.spawnFrames === 0 ? "idle" : "spawn", stateT: o.spawnFrames ?? AI.spawnFrames, age: 0, localScale: 1, delayT: 0, hitstop: 0,
      elite, boss: base.boss ?? false, invulnerable: base.invulnerable ?? false, armored: base.armored ?? false, immovable: base.immovable ?? false,
      stripT: 0, buffT: 0, buffedBy: 0, commandedBy: o.commandedBy ?? 0, linkId: 0, shadowed: o.shadowed ?? false, spectral: false, phasedT: 0,
      thrownT: 0, thrownBy: null, thrownSpeed: 0, brokenT: 0, brokenBy: "", rewindT: 0, orbitT: 0, orbitAngle: 0, neutral: false, token: false,
      history: new PosHistory(), aim: { x: 0, z: 1 }, d: {}, contactCd: new Map(), lastHitFrame: -999, defeatedBy: "", waveIndex: o.waveIndex ?? 0,
    };
    this.actors.push(a);
    beh.init(this, a);
    this.emit("EnemySpawn", { id: a.id, kind: type, x: a.pos.x, z: a.pos.z, value: elite ? 1 : 0 });
    return a;
  }

  spawnProjectile(o: { pos: Vec; vel: Vec; owner: Owner; shooterId: number; shape: ProjectileShape; radius?: number; life?: number; certDmg?: number; echo?: boolean }): Projectile {
    const p: Projectile = {
      id: this.id(), pos: { ...o.pos }, vel: { ...o.vel }, radius: o.radius ?? 0.35, owner: o.owner, shooterId: o.shooterId, shape: o.shape,
      life: o.life ?? 360, alive: true, bounces: 0, chain: 0, redirected: false, reversed: false, localScale: 1, delayT: 0, phasedT: 0,
      ghost: false, cleanLine: false, compound: "", prisms: [], origin: { ...o.pos }, history: new PosHistory(), orbitT: 0, orbitAngle: 0,
      spawnFrame: this.frame, homingTo: 0, certDmg: o.certDmg ?? 0, graceT: 12, echo: o.echo ?? false, damageScale: 1,
    };
    this.projectiles.push(p);
    this.law.onProjectileSpawned(p);
    this.emit("ProjectileSpawn", { id: p.id, kind: p.shape, x: p.pos.x, z: p.pos.z, op: p.owner });
    return p;
  }

  spawnProp(type: PropType, pos: Vec, o: { radius?: number; movable?: boolean; tag?: string; d?: Record<string, number> } = {}): Prop {
    const p: Prop = { id: this.id(), type, pos: { ...pos }, vel: v(), radius: o.radius ?? 0.6, movable: o.movable ?? false, alive: true, home: { ...pos }, t: 0, d: { ...(o.d ?? {}) }, tag: o.tag ?? "" };
    this.props.push(p);
    return p;
  }

  spawnHazard(o: { kind: string; shape?: HazardShape; pos: Vec; end?: Vec; radius?: number; width?: number; telegraph: number; active?: number; ownerId?: number; grow?: number }): Hazard {
    const tele = Math.max(AI.minTelegraph, o.telegraph * this.diff.telegraphScale);
    const h: Hazard = { id: this.id(), kind: o.kind, shape: o.shape ?? "circle", pos: { ...o.pos }, end: o.end ? { ...o.end } : { ...o.pos }, radius: o.radius ?? 2, width: o.width ?? 0.5, telegraphT: tele, telegraphTotal: tele, activeT: o.active ?? 8, ownerId: o.ownerId ?? 0, alive: true, spent: false, grow: o.grow ?? 0 };
    this.hazards.push(h);
    this.emit("Telegraph", { id: h.id, kind: o.kind, x: h.pos.x, z: h.pos.z, value: tele });
    return h;
  }

  /** Telegraph frames scaled by difficulty, never below the 30f floor. */
  tele(frames: number): number { return Math.max(AI.minTelegraph, Math.round(frames * this.diff.telegraphScale)); }

  // ---------- lookup ----------
  actor(id: number): Actor | undefined { return this.actors.find((a) => a.id === id && a.alive); }
  projectile(id: number): Projectile | undefined { return this.projectiles.find((p) => p.id === id && p.alive); }
  prop(id: number): Prop | undefined { return this.props.find((p) => p.id === id && p.alive); }
  resolve(t: TargetRef | null): Actor | Projectile | Prop | undefined {
    if (!t) return undefined;
    return t.kind === "actor" ? this.actor(t.id) : t.kind === "projectile" ? this.projectile(t.id) : this.prop(t.id);
  }
  /** Hostile actors that must be defeated for the arena to clear. */
  hostiles(): Actor[] { return this.actors.filter((a) => a.alive && !a.neutral && behaviorFor(a.type).countsForClear !== false); }
  isRegaliaUsable(r: Regalia): boolean { return this.markov.regalia.has(r); }

  // ---------- determinism ----------
  hashState(): number {
    let h = 0x811c9dc5;
    h = hashMix(h, this.frame);
    const m = this.markov;
    h = hashMix(h, m.pos.x); h = hashMix(h, m.pos.z); h = hashMix(h, m.focus); h = hashMix(h, m.seals); h = hashMix(h, m.hubris);
    for (const a of this.actors) { if (!a.alive) continue; h = hashMix(h, a.id); h = hashMix(h, a.pos.x); h = hashMix(h, a.pos.z); h = hashMix(h, a.certainty); }
    for (const p of this.projectiles) { if (!p.alive) continue; h = hashMix(h, p.id); h = hashMix(h, p.pos.x); h = hashMix(h, p.pos.z); }
    h = hashMix(h, this.scorer.score);
    return h >>> 0;
  }
}

function compact<T extends { alive: boolean }>(arr: T[]): void {
  let w = 0;
  for (let i = 0; i < arr.length; i++) if (arr[i]!.alive) arr[w++] = arr[i]!;
  arr.length = w;
}

// Props are simple enough to live in one function; sconces fire, lights drift home, etc.
import { updateProp as behaviorProp } from "./props";
