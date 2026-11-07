import { FRAMES } from "../data/frames";
import { MOVEMENT, STEP } from "../data/movement";
import { FOCUS, HUBRIS, STILLNESS } from "../data/resources";
import { SCORING } from "../data/scoring";
import type { World } from "./World";
import type { Actor } from "./entities";
import { add, clamp, dist, dirTo, len, norm, scale, v } from "./math";
import { BTN, type InputFrame, type OpId, type Regalia, type Vec } from "./types";
import { behaviorFor, hitPointOf } from "../actors/registry";

export type MarkovState = "idle" | "opStartup" | "opRecovery" | "holding" | "step" | "strike" | "taunt" | "hitstun" | "shatter" | "qed" | "locked" | "frozen";
/** Prophet action states. */
export type ActionState = "q0" | "q1" | "q2" | "q3" | "step" | "strike" | OpId | "idle";

export interface ActionRecord { frame: number; kind: "op" | "compound" | "step" | "strike"; op?: OpId; mode?: "tap" | "hold"; compound?: string; pos: Vec; aim: Vec; targetPos?: Vec }

/** Owns all Markov state: position, Seals, Focus, Hubris, regalia, Stillness/Insight. */
export class MarkovController {
  pos: Vec = v();
  vel: Vec = v();
  facing: Vec = { x: 0, z: 1 };
  aim: Vec = { x: 0, z: 1 };
  readonly radius = MOVEMENT.radius;
  seals: number;
  maxSeals: number;
  focus: number = FOCUS.max;
  hubris: number;
  regalia: Set<Regalia>;
  stepCharges: number = STEP.charges;
  stepRecharge: number[] = [];
  state: MarkovState = "idle";
  stateT = 0;
  spectralT = 0;
  mercyT = 0;
  knockT = 0;
  knockDir: Vec = v();
  lastOpFrame = -999;
  lastTauntFrame = -9999;
  insightT = 0;
  insightCd = 0;
  stillness = 0;
  strikeIndex = 0;
  strikeHitDone = false;
  strikeChainUntil = -1;
  stepT = 0;
  stepDir: Vec = v();
  stepStutter = false;
  tauntGranted = false;
  qedTarget = 0;
  hitsTaken = 0;
  pushSlow = false;
  actionState: ActionState = "idle";
  readonly actionLog: ActionRecord[] = [];
  lastStepFrame = -999;
  /** Ishtar Temptation: regalia taken back this phase. */
  tookTemptation = false;

  constructor(private readonly w: World, regalia: Regalia[], seals: number, maxSeals: number, hubris: number) {
    this.regalia = new Set(regalia);
    this.seals = seals;
    this.maxSeals = maxSeals;
    this.hubris = hubris;
    const s = w.def.start;
    if (s) this.pos = { x: s.x, z: s.z };
  }

  get spectral(): boolean { return this.spectralT > 0; }
  get stepping(): boolean { return this.state === "step"; }
  get iframes(): boolean {
    if (this.state === "step" && !this.stepStutter) { const f = STEP.frames - this.stepT + 1; return f >= STEP.iframeStart && f <= STEP.iframeEnd + 1; }
    return this.mercyT > 0 || this.state === "qed";
  }
  get canAct(): boolean { return this.state === "idle" || this.state === "opRecovery"; }

  record(r: Omit<ActionRecord, "frame">): void {
    this.actionLog.push({ frame: this.w.frame, ...r });
    if (this.actionLog.length > 200) this.actionLog.shift();
  }

  // ---------- resources (single writer) ----------
  spendFocus(n: number): void { if (!this.w.opts.infiniteFocus) this.focus = clamp(this.focus - n, 0, FOCUS.max); this.lastOpFrame = this.w.frame; }
  gainFocus(n: number): void { this.focus = clamp(this.focus + n, 0, FOCUS.max); }
  addHubris(n: number): void {
    if (!this.regalia.has("hubris") && n > 0) return;
    const before = this.hubris;
    this.hubris = clamp(this.hubris + n, 0, HUBRIS.max);
    if (this.hubris !== before) { this.w.emit("HubrisChanged", { value: this.hubris }); this.w.law.onHubrisChanged(); }
  }
  restoreSeals(n: number): void { this.seals = Math.min(this.maxSeals, this.seals + n); }
  setSeals(n: number): void { this.seals = clamp(n, 0, this.maxSeals); }
  setFocus(n: number): void { this.focus = clamp(n, 0, FOCUS.max); }
  setHubris(n: number): void { this.hubris = clamp(n, 0, HUBRIS.max); this.w.law.onHubrisChanged(); }
  grantRegalia(r: Regalia): void { if (!this.regalia.has(r)) { this.regalia.add(r); this.w.emit("RegaliaReturned", { kind: r }); } }
  removeRegalia(r: Regalia): void { if (this.regalia.delete(r)) this.w.emit("RegaliaLost", { kind: r }); }
  setPos(p: Vec): void { this.pos = { ...p }; }
  lock(on: boolean): void { this.state = on ? "locked" : "idle"; this.stateT = 0; }
  freeze(): void { this.state = "frozen"; this.vel = v(); }

  // ---------- per-frame ----------
  update(input: InputFrame): void {
    const w = this.w;
    if (input.aiming && (input.ax !== 0 || input.az !== 0)) this.aim = norm({ x: input.ax, z: input.az });
    // timers
    if (this.mercyT > 0) this.mercyT--;
    if (this.spectralT > 0) { this.spectralT--; if (this.spectralT === 0) this.exitPhase(); }
    for (let i = this.stepRecharge.length - 1; i >= 0; i--) {
      if (--this.stepRecharge[i]! <= 0) { this.stepRecharge.splice(i, 1); this.stepCharges = Math.min(STEP.charges, this.stepCharges + 1); }
    }
    if (w.frame - this.lastOpFrame > FOCUS.regenDelayFrames) this.gainFocus(FOCUS.regenPerSecond / 60);
    if (w.frame - this.lastTauntFrame > HUBRIS.decayDelayFrames && this.hubris > 0) {
      const before = this.hubris;
      this.hubris = Math.max(0, this.hubris - HUBRIS.decayPerSecond / 60);
      if (Math.floor(before / 50) !== Math.floor(this.hubris / 50)) w.law.onHubrisChanged();
    }
    if (this.insightT > 0) { this.insightT--; if (this.insightT === 0) w.emit("InsightEnd"); }
    if (this.insightCd > 0) this.insightCd--;

    this.actionState = "idle";
    this.updateState(input);
    this.consumeIntents();
    this.move(input);
  }

  private updateState(_input: InputFrame): void {
    const w = this.w;
    switch (this.state) {
      case "hitstun":
        if (this.knockT > 0) {
          this.knockT--;
          this.pos = add(this.pos, scale(this.knockDir, MOVEMENT.hitKnockback / MOVEMENT.hitKnockbackFrames));
          this.bound();
        }
        if (--this.stateT <= 0) { this.state = "idle"; this.mercyT = MOVEMENT.mercyFrames; }
        break;
      case "shatter":
        if (--this.stateT <= 0) { this.state = "idle"; this.mercyT = MOVEMENT.mercyFrames; }
        break;
      case "step": {
        const f = STEP.frames - this.stepT;
        if (f < 3) {
          const d = (this.stepStutter ? STEP.stutterDistance : STEP.distance) / 3;
          this.stepMove(scale(this.stepDir, d));
        }
        if (--this.stepT <= 0) { this.state = "idle"; }
        break;
      }
      case "strike": {
        const fd = FRAMES.strike[this.strikeIndex]!;
        this.stateT++;
        if (!this.strikeHitDone && this.stateT >= fd.startup) { this.strikeHitDone = true; this.doStrikeHit(); }
        if (this.stateT >= fd.startup + fd.active + fd.recovery) {
          this.state = "idle";
          this.strikeChainUntil = w.frame + FRAMES.strikeChainWindow;
          this.strikeIndex = (this.strikeIndex + 1) % 3;
        }
        break;
      }
      case "taunt":
        this.stateT++;
        if (!this.tauntGranted && this.stateT >= 20) { this.tauntGranted = true; this.addHubris(HUBRIS.taunt); }
        if (this.stateT >= FRAMES.taunt.frames) this.state = "idle";
        break;
      case "qed":
        this.stateT++;
        if (this.stateT >= FRAMES.qed.active + FRAMES.qed.recovery) this.state = "idle";
        break;
      default:
        break;
    }
    if (this.state === "idle" && w.frame > this.strikeChainUntil) this.strikeIndex = 0;
  }

  private consumeIntents(): void {
    const w = this.w, q = w.intent;
    // Lost regalia: dull click, no effect.
    q.take((i) => {
      const r: Regalia | null = i.kind === "tap" || i.kind === "hold" ? i.op! : i.kind === "step" ? "step" : i.kind === "strike" ? "strike" : i.kind === "hubris" ? "hubris" : null;
      if (r && !this.regalia.has(r)) { w.emit("RegaliaClick", { kind: r, x: this.pos.x, z: this.pos.z }); return true; }
      return false;
    });
    if (this.state === "locked" || this.state === "frozen" || this.state === "hitstun" || this.state === "shatter") return;

    // Step cancels op startup, holds, strike recovery (after hit), taunt (after 20f), Q.E.D. (after 6f).
    const canStep = this.state === "idle" || this.state === "opStartup" || this.state === "opRecovery" || this.state === "holding"
      || (this.state === "strike" && this.strikeHitDone) || (this.state === "taunt" && this.stateT >= FRAMES.taunt.stepCancelAfter)
      || (this.state === "qed" && this.stateT >= FRAMES.qed.stepCancelAfter);
    if (canStep && q.take((i) => i.kind === "step")) { this.doStep(); return; }

    // Ops (compounds may fuse during startup/recovery; OpSystem decides).
    const opIntent = q.peek((i) => i.kind === "tap" || i.kind === "hold");
    if (opIntent && w.ops.canAccept(opIntent)) { q.take((i) => i === opIntent); w.ops.request(opIntent); return; }

    if (this.state === "idle" || (this.state === "opRecovery")) {
      if (q.peek((i) => i.kind === "strike")) {
        if (this.spectral) return; // can't Strike while spectral; keep buffered
        q.take((i) => i.kind === "strike");
        this.doStrikeOrQed();
        return;
      }
      if (this.state === "idle" && q.take((i) => i.kind === "hubris")) {
        this.state = "taunt"; this.stateT = 0; this.tauntGranted = false; this.lastTauntFrame = w.frame;
        w.emit("HubrisTaunt", { x: this.pos.x, z: this.pos.z });
      }
    }
  }

  private move(input: InputFrame): void {
    if (this.state === "locked" || this.state === "frozen" || this.state === "hitstun" || this.state === "shatter" || this.state === "step" || this.state === "taunt") {
      this.decel(); return;
    }
    let mx = input.mx, mz = input.mz;
    const m = Math.hypot(mx, mz);
    if (m > 1) { mx /= m; mz /= m; }
    let top: number = this.spectral ? MOVEMENT.spectralSpeed : MOVEMENT.topSpeed;
    const st = this.state;
    if (st === "opStartup") top *= MOVEMENT.opStartupMoveScale;
    else if (st === "opRecovery") top *= MOVEMENT.opRecoveryMoveScale;
    else if (st === "holding" || this.w.ops.holding) top *= MOVEMENT.holdMoveScale;
    else if (st === "strike") top *= MOVEMENT.strikeMoveScale;
    else if (st === "qed") top = 0;
    if (this.pushSlow) top *= MOVEMENT.pushThroughTheoremScale;
    const target = { x: mx * top, z: mz * top };
    const accel = MOVEMENT.topSpeed / MOVEMENT.accelFrames;
    const decel = MOVEMENT.topSpeed / MOVEMENT.decelFrames;
    const dvx = target.x - this.vel.x, dvz = target.z - this.vel.z;
    const dl = Math.hypot(dvx, dvz);
    const rate = Math.hypot(target.x, target.z) > Math.hypot(this.vel.x, this.vel.z) ? accel : decel;
    if (dl <= rate) this.vel = target; else { this.vel.x += (dvx / dl) * rate; this.vel.z += (dvz / dl) * rate; }
    if (m > 0.05) {
      this.facing = norm({ x: mx, z: mz });
      const ang = Math.atan2(mx, mz);
      const q = (((Math.round(ang / (Math.PI / 2)) % 4) + 4) % 4) as 0 | 1 | 2 | 3;
      if (this.actionState === "idle") this.actionState = (["q0", "q1", "q2", "q3"] as const)[q];
    }
    this.pos.x += this.vel.x / 60;
    this.pos.z += this.vel.z / 60;
    this.bound();
  }

  private decel(): void {
    const d = MOVEMENT.topSpeed / MOVEMENT.decelFrames;
    const s = len(this.vel);
    if (s <= d) this.vel = v(); else this.vel = scale(this.vel, (s - d) / s);
    if (this.state !== "frozen" && this.state !== "locked") { this.pos.x += this.vel.x / 60; this.pos.z += this.vel.z / 60; this.bound(); }
  }

  /** Arena soft wall (walls and void edges both stop Markov) + obstacles. */
  bound(): void {
    const R = this.w.def.arena.radius - this.radius - MOVEMENT.voidEdgeMargin;
    const d = len(this.pos);
    if (d > R) { const n = norm(this.pos); this.pos = { x: n.x * R, z: n.z * R }; }
    if (this.spectral) return;
    for (const o of this.w.def.arena.obstacles) {
      const dd = Math.hypot(this.pos.x - o.x, this.pos.z - o.z), min = o.r + this.radius;
      if (dd < min && dd > 1e-6) { this.pos.x = o.x + ((this.pos.x - o.x) / dd) * min; this.pos.z = o.z + ((this.pos.z - o.z) / dd) * min; }
    }
  }

  private stepMove(delta: Vec): void {
    const next = add(this.pos, delta);
    // Can't pass Constants or bosses.
    for (const a of this.w.actors) {
      if (!a.alive || !(a.immovable || a.boss) || a.spectral || a.invulnerable && a.type === "child") continue;
      if (dist(next, a.pos) < a.radius + this.radius) return;
    }
    this.pos = next;
    this.bound();
  }

  private doStep(): void {
    const w = this.w;
    const input = w.lastInput;
    const m = Math.hypot(input.mx, input.mz);
    this.stepDir = m > 0.1 ? norm({ x: input.mx, z: input.mz }) : { ...this.facing };
    this.state = "step"; this.stepT = STEP.frames;
    this.actionState = "step";
    this.lastStepFrame = w.frame;
    w.ops.cancelStartup();
    if (this.stepCharges > 0) {
      this.stepCharges--; this.stepRecharge.push(STEP.rechargeFrames); this.stepStutter = false;
      w.emit("StepCast", { x: this.pos.x, z: this.pos.z, dx: this.stepDir.x, dz: this.stepDir.z });
    } else {
      this.stepStutter = true;
      w.emit("StepStutter", { x: this.pos.x, z: this.pos.z });
    }
    this.record({ kind: "step", pos: { ...this.pos }, aim: { ...this.stepDir } });
  }

  private doStrikeOrQed(): void {
    const w = this.w;
    // Q.E.D.: Strike within 120f of a break, ≤ 3 u.
    let best: Actor | null = null, bd = FRAMES.qed.range + 1e-6;
    for (const a of w.actors) {
      if (!a.alive || a.state !== "broken") continue;
      const d = dist(a.pos, this.pos) - a.radius;
      if (d <= bd) { bd = d; best = a; }
    }
    if (best) {
      this.state = "qed"; this.stateT = 0; this.qedTarget = best.id;
      this.facing = dirTo(this.pos, best.pos, this.facing);
      w.ledger.qed(w, best);
      this.addHubris(HUBRIS.qed);
      this.actionState = "strike";
      return;
    }
    this.state = "strike"; this.stateT = 0; this.strikeHitDone = false;
    if (w.frame > this.strikeChainUntil) this.strikeIndex = 0;
    this.actionState = "strike";
    w.emit("StrikeSwing", { x: this.pos.x, z: this.pos.z, value: this.strikeIndex, dx: this.aim.x, dz: this.aim.z });
    this.record({ kind: "strike", pos: { ...this.pos }, aim: { ...this.strikeDir() } });
  }

  strikeDir(): Vec { return this.w.lastInput.aiming ? this.aim : this.facing; }

  private doStrikeHit(): void {
    const w = this.w;
    const dir = this.strikeDir();
    let hits = 0;
    for (const a of w.actors) {
      if (!a.alive || a.neutral) continue;
      const tp = behaviorFor(a.type).strikePoint?.(w, a) ?? hitPointOf(w, a);
      const d = dist(tp, this.pos) - a.radius;
      if (d > FRAMES.strikeRange) continue;
      const to = dirTo(this.pos, tp);
      if (d > 0.3 && Math.acos(clamp(to.x * dir.x + to.z * dir.z, -1, 1)) > (FRAMES.strikeArcDeg / 2) * Math.PI / 180) continue;
      w.ledger.hitByStrike(w, a);
      hits++;
    }
    if (hits > 0) { this.gainFocus(FOCUS.strikeHitGain * hits); w.scorer.add("strike", SCORING.strikeHit * hits); }
  }

  private exitPhase(): void {
    const w = this.w;
    w.emit("PhaseOut", { x: this.pos.x, z: this.pos.z });
    // Re-solidifying inside a hazard/obstacle is impossible: snap to safe ground.
    for (let i = 0; i < 8; i++) {
      let bad = false;
      for (const h of w.hazards) if (h.alive && w.hazardHits({ ...h, telegraphT: 0 }, this.pos, this.radius)) bad = true;
      for (const o of w.def.arena.obstacles) if (Math.hypot(this.pos.x - o.x, this.pos.z - o.z) < o.r + this.radius) bad = true;
      for (const a of w.actors) if (a.alive && (a.immovable || a.boss) && !a.invulnerable && dist(a.pos, this.pos) < a.radius + this.radius) bad = true;
      if (!bad) break;
      const away = norm(this.pos, { x: 0, z: 1 });
      this.pos = add(this.pos, scale(away.x === 0 && away.z === 0 ? { x: 0, z: 1 } : { x: -away.x, z: -away.z }, MOVEMENT.phaseExitSnap));
    }
    this.bound();
  }

  enterPhase(): void { this.spectralT = 60; this.w.emit("PhaseIn", { x: this.pos.x, z: this.pos.z }); }

  /** Apply a hit to Markov. Returns true if it landed. */
  hit(kind: string, from: Vec, opts: { pure?: boolean } = {}): boolean {
    const w = this.w;
    if (this.state === "frozen") { w.emit("Bark", { kind: "dissolve" }); return false; }
    if (this.iframes || (this.spectral && !opts.pure)) return false;
    if (w.def.noSealLoss || w.flags.noSealLoss) return false;
    if (w.status !== "playing") return false;
    this.hitsTaken++;
    const wasTaunt = this.state === "taunt";
    this.seals = Math.max(0, this.seals - 1);
    w.emit("SealLost", { value: this.seals, kind, x: this.pos.x, z: this.pos.z });
    w.scorer.onDamageTaken();
    if (this.insightT > 0) { this.insightT = 0; w.emit("InsightEnd"); }
    this.stillness = 0;
    w.ops.interrupt();
    this.knockDir = dirTo(from, this.pos, { x: -this.facing.x, z: -this.facing.z });
    if (this.regalia.has("hubris") && this.hubris >= HUBRIS.max) {
      this.hubris = 0; w.law.onHubrisChanged();
      this.state = "shatter"; this.stateT = FRAMES.shatterStagger;
      w.emit("HubrisShatter", { x: this.pos.x, z: this.pos.z });
    } else {
      if (this.hubris > 0) this.addHubris(-HUBRIS.hitLoss);
      this.state = "hitstun"; this.stateT = MOVEMENT.hitstunFrames; this.knockT = MOVEMENT.hitKnockbackFrames;
      if (wasTaunt) w.emit("Bark", { kind: "embarrassed" });
    }
    if (this.seals <= 0) w.director.onMarkovDefeated();
    return true;
  }

  /** Collisions with bodies + Stillness, after everything moved. */
  postUpdate(input: InputFrame): void {
    const w = this.w;
    this.pushSlow = false;
    if (!this.spectral) {
      for (const a of w.actors) {
        if (!a.alive || a.thrownT > 0 || a.orbitT > 0 || a.spectral || a.neutral) continue;
        const beh = behaviorFor(a.type);
        if (beh.passable) continue;
        const d = dist(a.pos, this.pos), min = a.radius + this.radius;
        if (d >= min || d < 1e-6) continue;
        if (a.immovable || a.boss) {
          const n = dirTo(a.pos, this.pos);
          this.pos = add(a.pos, scale(n, min));
          this.bound();
        } else this.pushSlow = true;
      }
    }
    // Stillness → Insight (any gameplay input resets Stillness; hits reset it too).
    const moving = Math.hypot(input.mx, input.mz) > 0.05;
    const busy = this.state === "hitstun" || this.state === "shatter";
    if (input.b !== 0 || moving || busy) this.stillness = 0;
    else this.stillness++;
    if (this.stillness > 0 && this.stillness % 10 === 0 && this.stillness <= STILLNESS.idleFrames) w.emit("StillnessProgress", { value: this.stillness / STILLNESS.idleFrames });
    if (this.stillness === STILLNESS.idleFrames && this.insightCd <= 0 && this.state !== "frozen") {
      this.insightT = STILLNESS.insightFrames; this.insightCd = STILLNESS.cooldownFrames;
      w.emit("InsightStart", { x: this.pos.x, z: this.pos.z });
    }
    if (input.b & BTN.strike) { /* actionState already set by strike */ }
  }
}
