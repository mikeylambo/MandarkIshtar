import { FRAMES, type OpFrames } from "../data/frames";
import { FOCUS, HUBRIS } from "../data/resources";
import { CERTAINTY } from "../data/certainty";
import { COMPOUND_TUNING, compoundFor, type CompoundId } from "../data/compounds";
import { SCORING } from "../data/scoring";
import type { World } from "../sim/World";
import type { Actor, Projectile, Prop, TargetRef } from "../sim/entities";
import { dirTo, dist, fromAngle, len, norm, scale, v } from "../sim/math";
import type { OpId, Vec } from "../sim/types";
import { behaviorFor } from "../actors/registry";
import type { Intent } from "./InputIntent";
import { selectTarget } from "./Targeting";
import { resolveCompound } from "./CompoundResolver";

export const PUSH_SPEED = 22;
export const PROP_PUSH_SPEED = 8;

interface CastRecord { op: OpId; mode: "tap" | "hold"; frame: number; target: TargetRef | null; aim: Vec; pos: Vec }
interface Pending extends CastRecord { compound: CompoundId | null }
interface EchoShot { at: number; op: OpId; mode: "tap" | "hold"; aim: Vec; pos: Vec }

export function framesFor(op: OpId, mode: "tap" | "hold"): OpFrames {
  switch (op) {
    case "vector": return mode === "tap" ? FRAMES.vectorTap : FRAMES.vectorHold;
    case "phase": return mode === "tap" ? FRAMES.phaseSelf : FRAMES.phaseTarget;
    case "order": return mode === "tap" ? FRAMES.orderDelay : FRAMES.orderReverse;
    case "null": return mode === "tap" ? FRAMES.nullCancel : FRAMES.nullStrip;
  }
}

/** Executes Vector / Phase / Order / Null, detects compounds, owns op-driven timers. */
export class OpSystem {
  pending: Pending | null = null;
  last: CastRecord | null = null;
  opsUsed = 0;
  compoundsUsed = 0;
  readonly opCounts: Record<OpId, number> = { vector: 0, phase: 0, order: 0, null: 0 };
  /** Recent cast frames per op / compound (Mirror P3, Judge). */
  readonly useFrames: Record<OpId, number[]> = { vector: [], phase: [], order: [], null: [] };
  readonly compoundFrames: number[] = [];
  holding = false;
  holdTarget: TargetRef | null = null;
  echoMarker: { pos: Vec; until: number } | null = null;
  readonly echoQueue: EchoShot[] = [];
  readonly erasures: { pos: Vec; at: number }[] = [];
  /** Listeners (Judge ledger, Judgment law, Child, Mirror, Prophet). */
  readonly listeners: ((op: OpId, mode: "tap" | "hold", compound: CompoundId | null, target: TargetRef | null) => void)[] = [];
  private recoveryT = 0;
  private startupT = 0;

  constructor(private readonly w: World) {}

  canAccept(i: Intent): boolean {
    const m = this.w.markov;
    if (m.state === "idle" || (m.state === "opRecovery" && !this.pending)) return true;
    if ((m.state === "opStartup" || m.state === "opRecovery") && this.compoundCandidate(i)) return true;
    return false;
  }

  private compoundCandidate(i: Intent): CompoundId | null {
    const l = this.last;
    if (!l || !i.op || i.op === l.op) return null;
    if (i.frame - l.frame > this.w.intent.compoundWindow) return null;
    return compoundFor(l.op, i.op)?.id ?? null;
  }

  request(i: Intent): void {
    const w = this.w, m = w.markov;
    const op = i.op!, mode = i.kind === "hold" ? "hold" : "tap";
    const compound = (m.state === "opStartup" || m.state === "opRecovery") ? this.compoundCandidate(i) : (m.state === "idle" ? this.compoundCandidate(i) : null);
    const cost = FOCUS.cost[op];
    if (compound && this.last) {
      const total = (FOCUS.cost[this.last.op] + cost) * FOCUS.compoundCostScale;
      const extra = Math.max(0, total - FOCUS.cost[this.last.op]);
      if (m.focus < extra && !w.opts.infiniteFocus) { this.fizzle(op); return; }
      m.spendFocus(extra);
      const first = this.last;
      this.last = null;
      this.compoundsUsed++;
      pushCap(this.compoundFrames, w.frame);
      w.scorer.add("compound", SCORING.compound);
      w.emit("CompoundCast", { kind: compound, x: m.pos.x, z: m.pos.z, op: `${first.op}>${op}` });
      m.record({ kind: "compound", op, compound, pos: { ...m.pos }, aim: { ...m.aim } });
      this.notify(op, mode, compound, first.target);
      if (this.pending) { this.pending.compound = compound; return; }
      resolveCompound(w, compound, first, { op, mode, aim: this.aimNow(), frame: i.frame });
      this.enterRecovery(framesFor(op, mode).recovery);
      return;
    }
    if (m.focus < cost && !w.opts.infiniteFocus) { this.fizzle(op); return; }
    const aiming = w.lastInput.aiming;
    const aim = this.aimNow();
    const target = selectTarget(w, op, mode, aiming, aim);
    m.spendFocus(cost);
    this.opsUsed++; this.opCounts[op]++;
    pushCap(this.useFrames[op], w.frame);
    w.scorer.onOp(op);
    const rec: CastRecord = { op, mode, frame: i.frame, target, aim, pos: { ...m.pos } };
    this.last = rec;
    m.actionState = op;
    m.record({ kind: "op", op, mode, pos: { ...m.pos }, aim: { ...aim }, targetPos: target ? posOf(w.resolve(target)) : undefined });
    if (this.echoMarker && w.frame <= this.echoMarker.until) {
      this.echoQueue.push({ at: w.frame + COMPOUND_TUNING.echoDelay, op, mode, aim: { ...aim }, pos: { ...this.echoMarker.pos } });
      this.echoMarker = null;
    }
    this.notify(op, mode, null, target);
    const fr = framesFor(op, mode);
    if (mode === "hold") {
      // The hold itself was the startup.
      this.execute(rec);
      this.enterRecovery(fr.recovery);
    } else {
      this.pending = { ...rec, compound: null };
      this.startupT = fr.startup;
      m.state = "opStartup"; m.stateT = fr.startup;
      if (op === "phase") this.w.emit("PhaseIn", { x: m.pos.x, z: m.pos.z, value: 0 });
    }
  }

  private notify(op: OpId, mode: "tap" | "hold", compound: CompoundId | null, target: TargetRef | null): void {
    for (const l of this.listeners) l(op, mode, compound, target);
  }

  aimNow(): Vec {
    const w = this.w;
    if (w.lastInput.aiming) return { ...w.markov.aim };
    return { ...w.markov.facing };
  }

  private fizzle(op: OpId): void {
    const m = this.w.markov;
    this.w.emit("OpFizzle", { op, x: m.pos.x, z: m.pos.z });
  }

  private enterRecovery(frames: number): void {
    const m = this.w.markov;
    this.recoveryT = frames;
    m.state = "opRecovery"; m.stateT = frames;
  }

  cancelStartup(): void { this.pending = null; this.startupT = 0; }
  interrupt(): void { this.pending = null; this.holding = false; this.holdTarget = null; }

  update(): void {
    const w = this.w, m = w.markov;
    if (m.state === "opStartup" && this.pending) {
      if (--this.startupT <= 0) {
        const p = this.pending;
        this.pending = null;
        this.execute(p);
        if (p.compound) {
          resolveCompound(w, p.compound, p, { op: compoundSecond(p.compound), mode: "tap", aim: this.aimNow(), frame: w.frame });
        }
        this.enterRecovery(framesFor(p.op, p.mode).recovery);
      }
    } else if (m.state === "opRecovery") {
      if (--this.recoveryT <= 0) { m.state = "idle"; m.stateT = 0; }
    } else if (m.state === "opStartup" && !this.pending) {
      m.state = "idle";
    }
    // Phase-target sustain cost.
    if (this.holdTarget) {
      if (w.intent.isHeld("phase") && m.focus > 0) m.spendFocus(FOCUS.phaseHeldPerSecond / 60);
      else this.holdTarget = null;
    }
    for (let i = this.echoQueue.length - 1; i >= 0; i--) {
      const e = this.echoQueue[i]!;
      if (w.frame >= e.at) { this.echoQueue.splice(i, 1); this.fireEcho(e); }
    }
    for (let i = this.erasures.length - 1; i >= 0; i--) {
      const e = this.erasures[i]!;
      if (w.frame >= e.at) { this.erasures.splice(i, 1); this.erase(e.pos); }
    }
  }

  private fireEcho(e: EchoShot): void {
    const w = this.w;
    w.emit("Echo", { x: e.pos.x, z: e.pos.z, op: e.op });
    const saved = w.markov.pos;
    w.markov.pos = { ...e.pos };
    const target = selectTarget(w, e.op, e.mode, true, e.aim);
    w.markov.pos = saved;
    this.execute({ op: e.op, mode: e.mode, frame: w.frame, target, aim: e.aim, pos: e.pos }, true);
  }

  private erase(pos: Vec): void {
    const w = this.w;
    w.emit("Erase", { x: pos.x, z: pos.z, value: COMPOUND_TUNING.delayedEraseRadius });
    for (const p of w.projectiles) if (p.alive && p.owner === "enemy" && dist(p.pos, pos) < COMPOUND_TUNING.delayedEraseRadius) { p.alive = false; w.emit("NullImplode", { x: p.pos.x, z: p.pos.z }); }
    for (const a of w.actors) if (a.alive && !a.neutral && dist(a.pos, pos) < COMPOUND_TUNING.delayedEraseRadius + a.radius) w.ledger.damage(w, a, CERTAINTY.redirected, { kind: "op", compound: true, op: "null" });
  }

  plantErase(pos: Vec): void { this.erasures.push({ pos: { ...pos }, at: this.w.frame + COMPOUND_TUNING.delayedEraseDelay }); }
  plantEcho(pos: Vec): void { this.echoMarker = { pos: { ...pos }, until: this.w.frame + COMPOUND_TUNING.echoLifetime }; }

  // ---------- single-op effects ----------
  execute(c: CastRecord, fromEcho = false): void {
    const w = this.w, m = w.markov;
    const target = w.resolve(c.target);
    const origin = fromEcho ? c.pos : m.pos;
    w.emit("OpCast", { op: c.op, kind: c.mode, x: origin.x, z: origin.z, dx: c.aim.x, dz: c.aim.z, target: c.target?.id ?? 0, text: c.target?.kind ?? "" });
    if (c.op === "phase" && c.mode === "tap") { if (!fromEcho) m.enterPhase(); return; }
    if (!target || !c.target) { w.emit("OpFizzle", { op: c.op, x: origin.x, z: origin.z }); return; }
    if (c.target.kind === "actor") {
      const a = target as Actor;
      const beh = behaviorFor(a.type);
      if (beh.onOp && beh.onOp(w, a, c.op, c.mode, c.aim) === "handled") return;
    }
    switch (c.op) {
      case "vector": return c.mode === "tap" ? this.push(c.target, target, c.aim) : this.orbit(c.target, target);
      case "phase": return this.phaseTarget(c.target, target);
      case "order": return c.mode === "tap" ? this.delay(c.target, target) : this.reverse(c.target, target);
      case "null": return c.mode === "tap" ? this.cancel(c.target, target) : this.strip(c.target, target);
    }
  }

  push(ref: TargetRef, t: Actor | Projectile | Prop, aim: Vec, speed = PUSH_SPEED): void {
    const w = this.w;
    const d = norm(aim);
    if (ref.kind === "projectile") {
      const p = t as Projectile;
      const wasMarkov = p.owner === "markov";
      p.vel = scale(d, Math.max(speed, wasMarkov ? len(p.vel) : speed));
      p.owner = "markov"; p.redirected = true; p.reversed = false; p.homingTo = 0; p.graceT = 0; p.life = Math.max(p.life, 180);
      p.chain = wasMarkov ? p.chain + 1 : 1;
      if (p.chain > 1) w.scorer.add("bounce", SCORING.redirectBounce);
      if (p.chain >= 3) w.markov.addHubris(HUBRIS.redirectChain);
      w.emit("Redirect", { id: p.id, kind: "projectile", x: p.pos.x, z: p.pos.z, dx: d.x, dz: d.z, value: p.chain });
      if (w.opts.teach && !w.flags.teachSlowmoDone) { w.flags.teachSlowmoDone = 1; w.scriptScale = 0.5; w.scriptScaleT = 20; w.emit("SlowMoTeach"); }
    } else if (ref.kind === "actor") {
      const a = t as Actor;
      if ((a.armored && a.stripT <= 0) || a.boss) { w.ledger.damage(w, a, CERTAINTY.nonExploitOp, { kind: "op", op: "vector" }); w.emit("OpFizzle", { op: "vector", x: a.pos.x, z: a.pos.z, kind: "armored" }); return; }
      this.throwActor(a, d, speed);
    } else {
      const p = t as Prop;
      p.vel = scale(d, PROP_PUSH_SPEED); p.d.slideT = 36;
      w.emit("Redirect", { id: p.id, kind: "prop", x: p.pos.x, z: p.pos.z, dx: d.x, dz: d.z });
    }
  }

  throwActor(a: Actor, d: Vec, speed: number): void {
    const w = this.w;
    a.vel = scale(d, speed); a.thrownT = Math.ceil((14 / speed) * 60); a.thrownBy = "markov"; a.thrownSpeed = speed;
    a.contactCd.clear();
    if (a.state !== "broken") { if (a.token) w.tokens.release(a); a.state = "recover"; a.stateT = 20; }
    w.emit("Redirect", { id: a.id, kind: "actor", x: a.pos.x, z: a.pos.z, dx: d.x, dz: d.z });
  }

  private orbit(ref: TargetRef, t: Actor | Projectile | Prop): void {
    const w = this.w, m = w.markov;
    if (ref.kind === "prop") return this.push(ref, t, this.aimNow());
    const ang = Math.atan2(t.pos.x - m.pos.x, t.pos.z - m.pos.z);
    if (ref.kind === "projectile") {
      const p = t as Projectile;
      p.orbitT = FRAMES.vectorHold.active; p.orbitAngle = ang; p.owner = "markov"; p.redirected = true; p.graceT = 0; p.life = Math.max(p.life, 240);
    } else {
      const a = t as Actor;
      if ((a.armored && a.stripT <= 0) || a.boss) { w.ledger.damage(w, a, CERTAINTY.nonExploitOp, { kind: "op", op: "vector" }); return; }
      a.orbitT = FRAMES.vectorHold.active; a.orbitAngle = ang; a.contactCd.clear();
      if (a.token) w.tokens.release(a);
    }
    w.emit("OrbitStart", { id: t.id, x: t.pos.x, z: t.pos.z });
  }

  /** Orbit position update for projectiles (called by ProjectileSystem). */
  stepOrbitProjectile(p: Projectile): void {
    const m = this.w.markov;
    p.orbitT--;
    p.orbitAngle += 4 / 60;
    const pos = { x: m.pos.x + Math.sin(p.orbitAngle) * 3, z: m.pos.z + Math.cos(p.orbitAngle) * 3 };
    p.vel = { x: (pos.x - p.pos.x) * 60, z: (pos.z - p.pos.z) * 60 };
    p.pos = pos;
    if (p.orbitT <= 0) { p.vel = scale(this.aimNow(), PUSH_SPEED); }
  }

  stepOrbitActor(a: Actor): void {
    const w = this.w, m = w.markov;
    a.orbitT--;
    a.orbitAngle += 4 / 60;
    a.pos = { x: m.pos.x + Math.sin(a.orbitAngle) * 3, z: m.pos.z + Math.cos(a.orbitAngle) * 3 };
    w.ledger.checkOrbitContacts(w, a);
    if (a.orbitT <= 0 && a.alive) this.throwActor(a, this.aimNow(), PUSH_SPEED);
  }

  private phaseTarget(ref: TargetRef, t: Actor | Projectile | Prop): void {
    if (ref.kind === "prop") return;
    (t as Actor | Projectile).phasedT = FRAMES.phaseTarget.active;
    this.holdTarget = ref;
    this.w.emit("PhaseIn", { id: t.id, x: t.pos.x, z: t.pos.z, value: 1 });
  }

  private delay(ref: TargetRef, t: Actor | Projectile | Prop): void {
    const w = this.w;
    if (ref.kind === "prop") return;
    const e = t as Actor | Projectile;
    e.localScale = 0.25; e.delayT = FRAMES.orderDelay.active;
    w.emit("DelayStamp", { id: t.id, x: t.pos.x, z: t.pos.z });
    if (ref.kind === "actor") w.ledger.damage(w, t as Actor, CERTAINTY.nonExploitOp, { kind: "op", op: "order" });
  }

  private reverse(ref: TargetRef, t: Actor | Projectile | Prop): void {
    const w = this.w;
    if (ref.kind === "prop") return;
    if (ref.kind === "projectile") {
      const p = t as Projectile;
      p.reversed = true; p.owner = "markov"; p.redirected = true; p.graceT = 0; p.homingTo = p.shooterId; p.life = Math.max(p.life, 240);
      const shooter = w.actor(p.shooterId);
      const dest = shooter ? shooter.pos : p.origin;
      p.vel = scale(dirTo(p.pos, dest), Math.max(12, len(p.vel)));
      w.emit("ReverseStart", { id: p.id, x: p.pos.x, z: p.pos.z });
    } else {
      const a = t as Actor;
      if (a.boss) { w.ledger.damage(w, a, CERTAINTY.nonExploitOp, { kind: "op", op: "order" }); return; }
      a.rewindT = Math.min(FRAMES.orderReverse.active, a.history.count);
      if (a.token) w.tokens.release(a);
      a.state = "recover"; a.stateT = 10;
      w.emit("ReverseStart", { id: a.id, x: a.pos.x, z: a.pos.z });
      w.ledger.damage(w, a, CERTAINTY.nonExploitOp, { kind: "op", op: "order" });
    }
  }

  stepRewindActor(a: Actor): void {
    a.rewindT--;
    const p = a.history.pop();
    if (p) { a.pos = p; this.w.boundActor(a); }
    if (!p) a.rewindT = 0;
  }

  private cancel(ref: TargetRef, t: Actor | Projectile | Prop): void {
    const w = this.w;
    w.emit("NullImplode", { id: t.id, x: t.pos.x, z: t.pos.z });
    if (ref.kind === "projectile") { (t as Projectile).alive = false; w.emit("ProjectileDie", { id: t.id, kind: "null" }); return; }
    if (ref.kind === "prop") { const p = t as Prop; p.d.dropped = 1; return; }
    const a = t as Actor;
    if (a.commandedBy) { w.ledger.free(w, a); return; }
    if (a.state === "telegraph" || a.state === "act") {
      if (a.token) w.tokens.release(a);
      a.state = "recover"; a.stateT = 30;
    }
    w.ledger.damage(w, a, CERTAINTY.nonExploitOp, { kind: "op", op: "null" });
  }

  private strip(ref: TargetRef, t: Actor | Projectile | Prop): void {
    const w = this.w;
    if (ref.kind !== "actor") { if (ref.kind === "projectile") (t as Projectile).alive = false; return; }
    const a = t as Actor;
    w.ledger.strip(w, a);
  }
}

function compoundSecond(id: CompoundId): OpId {
  const map: Record<CompoundId, OpId> = { ghostLance: "phase", passingTurn: "vector", recurrence: "order", slingshot: "vector", cleanLine: "null", unanchor: "vector", echo: "order", fold: "phase", voidStep: "null", severance: "phase", delayedErase: "null", unwind: "order" };
  return map[id];
}

function pushCap(arr: number[], v: number): void { arr.push(v); if (arr.length > 8) arr.shift(); }

function posOf(t: { pos: Vec } | undefined): Vec | undefined { return t ? { ...t.pos } : undefined; }
export { posOf, fromAngle, v };
