import { CERTAINTY } from "../data/certainty";
import { FOCUS } from "../data/resources";
import { SCORING } from "../data/scoring";
import type { World } from "../sim/World";
import type { Actor, Projectile } from "../sim/entities";
import { dist, len, norm, scale, segDist } from "../sim/math";
import type { DamageKind, OpId } from "../sim/types";
import { behaviorFor, hitPointOf } from "../actors/registry";

export interface DamageInfo {
  kind: DamageKind;
  /** Principle-exploit fraction of max Certainty (0.4–1.0) → Contradiction. */
  exploit?: number;
  compound?: boolean;
  op?: OpId | "strike";
  /** True when the damage was delivered by an enemy body or an enemy's own attack. */
  byEnemy?: boolean;
  /** Bypass shields (Ghost Lance). */
  pierce?: boolean;
  label?: string;
}

/**
 * The only writer of Certainty, Broken state, buffs/shields/links and defeat.
 * Every principle exploit becomes a Contradiction here.
 */
export class CertaintyLedger {
  /** Total Certainty dealt by source kind (telemetry: Strike share < 10%). */
  readonly dealt: Record<string, number> = {};
  contradictions = 0;
  qeds = 0;
  ringOuts = 0;
  enemyDefeats = 0;
  /** Breaks not caused by an enemy body or an enemy's own attack (Theorem "all kills by enemies"). */
  selfBreaks = 0;
  private lastContradictionFrame = -999;

  damage(w: World, a: Actor, amount: number, info: DamageInfo): number {
    if (!a.alive || a.neutral) return 0;
    const beh = behaviorFor(a.type);
    if (a.invulnerable) { beh.onImmune?.(w, a, info); return 0; }
    if (a.state === "spawn") return 0;
    if (a.state === "broken") {
      // A broken Theorem struck by a hostile-to-it object collapses ("breaks and expires").
      if (info.kind !== "strike" && info.kind !== "op") this.collapse(w, a, info.byEnemy ?? false);
      return 0;
    }
    let dmg = amount;
    const isExploit = info.exploit !== undefined;
    if (isExploit) dmg = info.exploit! * a.maxCertainty;
    if (beh.modifyDamage) dmg = beh.modifyDamage(w, a, dmg, info);
    if (dmg <= 0) return 0;
    if (info.kind !== "strike") dmg *= w.law.opDamageScale();
    if (!isExploit && !info.pierce) {
      if (a.commandedBy) { w.emit("OpFizzle", { kind: "shield", x: a.pos.x, z: a.pos.z }); return 0; }
      if (a.buffT > 0) dmg *= CERTAINTY.heraldShieldScale;
    }
    if (info.compound) dmg *= CERTAINTY.compoundBonus;
    const before = a.certainty;
    a.certainty = Math.max(0, Math.min(a.maxCertainty, a.certainty - dmg));
    const dealt = before - a.certainty;
    this.dealt[info.kind] = (this.dealt[info.kind] ?? 0) + dealt;
    a.lastHitFrame = w.frame;
    beh.onDamaged?.(w, a, dealt, info);
    if (isExploit) {
      this.contradictions++;
      w.scorer.contradiction();
      w.markov.gainFocus(FOCUS.contradictionGain);
      if (w.frame - this.lastContradictionFrame > 2) w.hitstop = Math.max(w.hitstop, 8);
      this.lastContradictionFrame = w.frame;
      w.emit("Contradiction", { id: a.id, kind: a.type, x: a.pos.x, z: a.pos.z, value: info.exploit, text: info.label ?? "" });
    }
    if (a.certainty <= 0 && a.alive) { if (!info.byEnemy) this.selfBreaks++; this.break(w, a); }
    return dealt;
  }

  exploit(w: World, a: Actor, fraction: number, info: Omit<DamageInfo, "exploit"> & { kind?: DamageKind } = { kind: "exploit" }): number {
    return this.damage(w, a, 0, { ...info, kind: info.kind ?? "exploit", exploit: fraction });
  }

  break(w: World, a: Actor): void {
    const beh = behaviorFor(a.type);
    if (a.token) w.tokens.release(a);
    a.thrownT = 0; a.orbitT = 0; a.rewindT = 0;
    if (beh.onBroken && beh.onBroken(w, a) === "handled") return;
    a.state = "broken"; a.brokenT = CERTAINTY.brokenFrames; a.vel = scale(a.vel, 0.3);
    w.emit("Broken", { id: a.id, kind: a.type, x: a.pos.x, z: a.pos.z });
  }

  stepBroken(w: World, a: Actor, dt: number): void {
    a.brokenT -= dt;
    if (a.brokenT <= 0) {
      a.certainty = a.maxCertainty * CERTAINTY.recoverFraction;
      a.state = "recover"; a.stateT = 30;
      w.emit("QEDMissed", { id: a.id, x: a.pos.x, z: a.pos.z });
      w.emit("Recovered", { id: a.id, x: a.pos.x, z: a.pos.z });
      behaviorFor(a.type).onRecovered?.(w, a);
    }
  }

  qed(w: World, a: Actor): void {
    this.qeds++;
    w.scorer.add("qed", SCORING.qed);
    w.hitstop = Math.max(w.hitstop, 10);
    w.emit("QED", { id: a.id, kind: a.type, x: a.pos.x, z: a.pos.z });
    this.remove(w, a, "qed");
  }

  ringOut(w: World, a: Actor): void {
    if (!a.alive) return;
    if (behaviorFor(a.type).onRingOut?.(w, a) === "handled") return;
    this.ringOuts++;
    w.scorer.add("ringout", SCORING.ringOut);
    w.emit("RingOut", { id: a.id, kind: a.type, x: a.pos.x, z: a.pos.z });
    this.remove(w, a, "ringout");
  }

  collapse(w: World, a: Actor, byEnemy: boolean): void {
    if (byEnemy) { this.enemyDefeats++; w.scorer.add("enemyByEnemy", SCORING.enemyByEnemy); }
    w.emit("Defeated", { id: a.id, kind: "collapse", x: a.pos.x, z: a.pos.z });
    this.remove(w, a, "collapse");
  }

  remove(w: World, a: Actor, how: string): void {
    a.alive = false; a.state = "dead"; a.defeatedBy = how;
    if (a.token) w.tokens.release(a);
    // freed subjects of a removed commander go home
    for (const o of w.actors) { if (o.commandedBy === a.id) o.commandedBy = 0; if (o.buffedBy === a.id) this.removeBuff(w, o); }
    if (how !== "qed") w.emit("Defeated", { id: a.id, kind: how, x: a.pos.x, z: a.pos.z });
    behaviorFor(a.type).onRemoved?.(w, a);
  }

  /** Boss phase-checkpoint retry: start at a fraction of max Certainty. */
  setCheckpoint(_w: World, a: Actor, fraction: number): void { a.certainty = a.maxCertainty * fraction; }

  hitByStrike(w: World, a: Actor): void {
    w.emit("StrikeHit", { id: a.id, x: a.pos.x, z: a.pos.z });
    const beh = behaviorFor(a.type);
    if (beh.onStrike && beh.onStrike(w, a) === "handled") return;
    this.damage(w, a, CERTAINTY.strike, { kind: "strike", op: "strike" });
  }

  wallImpact(w: World, a: Actor, speed = len(a.vel)): void {
    const beh = behaviorFor(a.type);
    const thrown = a.thrownT > 0 && a.thrownBy === "markov";
    w.emit("WallImpact", { id: a.id, x: a.pos.x, z: a.pos.z, value: speed });
    if (thrown && beh.onThrownImpact && beh.onThrownImpact(w, a, null) === "handled") { endThrow(a); return; }
    if (thrown && speed > CERTAINTY.wallImpactSpeed) {
      this.damage(w, a, CERTAINTY.wallImpactDamage, { kind: "wall", compound: !!a.d.compound });
      if (a.alive && a.state !== "broken") { a.state = "stun"; a.stateT = CERTAINTY.wallImpactStun; }
    }
    endThrow(a);
  }

  /** A Markov-thrown body vs other bodies: target takes 25; Axioms/Constants break themselves (exploit). */
  checkThrownCollisions(w: World, a: Actor): void {
    if (a.thrownBy !== "markov") return;
    if (a.d.cleanLine) this.cleanLine(w, a.pos, a.radius);
    for (const b of w.actors) {
      if (b === a || !b.alive || b.neutral || b.state === "spawn") continue;
      if (b.phasedT > 0 || (a.contactCd.get(b.id) ?? -999) > w.frame) continue;
      const bp = hitPointOf(w, b);
      if (dist(a.pos, bp) > a.radius + b.radius) continue;
      a.contactCd.set(b.id, w.frame + 30);
      this.bodyHit(w, a, b);
      if (!a.alive) return;
      if (!a.d.ghost) { endThrow(a); a.vel = scale(a.vel, 0.2); return; }
    }
  }

  checkOrbitContacts(w: World, a: Actor): void {
    for (const b of w.actors) {
      if (b === a || !b.alive || b.neutral || b.state === "spawn") continue;
      if ((a.contactCd.get(b.id) ?? -999) > w.frame) continue;
      const bp = hitPointOf(w, b);
      if (dist(a.pos, bp) > a.radius + b.radius) continue;
      a.contactCd.set(b.id, w.frame + CERTAINTY.orbitContactCooldown);
      w.emit("OrbitContact", { id: b.id, x: b.pos.x, z: b.pos.z });
      this.bodyHit(w, a, b);
      if (!a.alive) return;
    }
  }

  private bodyHit(w: World, thrown: Actor, b: Actor): void {
    const tb = behaviorFor(thrown.type), bb = behaviorFor(b.type);
    const compound = !!thrown.d.compound;
    if (!(bb.onHitByBody && bb.onHitByBody(w, b, thrown) === "handled")) {
      if (b.type === "paradox" && compound) this.exploit(w, b, 1, { kind: "exploit", compound: false, byEnemy: true, label: "paradox" });
      else this.damage(w, b, redirectDamage(b), { kind: "redirect", byEnemy: true, compound, pierce: !!thrown.d.ghost });
    }
    if (tb.onThrownImpact && tb.onThrownImpact(w, thrown, b) === "handled") return;
    this.damage(w, thrown, CERTAINTY.nonExploitOp, { kind: "contact", byEnemy: true });
  }

  /** Markov-owned projectile hits an actor. Returns true if the projectile is consumed. */
  projectileHit(w: World, p: Projectile, a: Actor): boolean {
    const beh = behaviorFor(a.type);
    if (beh.onProjectile) {
      const r = beh.onProjectile(w, a, p);
      if (r === "pass") return false;
      if (r === "handled") return !p.ghost || a.boss;
    }
    const compound = p.compound !== "";
    const byEnemy = p.shooterId !== 0 && p.shooterId !== a.id;
    if (a.type === "paradox" && compound) this.exploit(w, a, 1, { kind: "exploit", byEnemy, label: "paradox" });
    else this.damage(w, a, redirectDamage(a) * p.damageScale, { kind: "redirect", byEnemy: byEnemy || p.shooterId === a.id, pierce: p.ghost });
    return true;
  }

  cleanLine(w: World, pos: { x: number; z: number }, r: number): void {
    for (const q of w.projectiles) {
      if (!q.alive || q.owner !== "enemy") continue;
      if (dist(q.pos, pos) < r + q.radius + 0.3) { q.alive = false; w.emit("NullImplode", { x: q.pos.x, z: q.pos.z, kind: "cleanLine" }); w.scorer.add("clash", SCORING.clash); }
    }
  }

  // ---------- properties ----------
  strip(w: World, a: Actor, opts: { compound?: boolean } = {}): void {
    const beh = behaviorFor(a.type);
    if (beh.onStrip && beh.onStrip(w, a) === "handled") return;
    let kind = "";
    if (a.immovable || a.armored) { a.immovable = false; a.armored = false; a.stripT = 180; kind = "immovable"; }
    else if (a.buffT > 0) { this.removeBuff(w, a); kind = "buff"; }
    else if (a.commandedBy) { this.free(w, a); kind = "command"; }
    else if (a.linkId) { a.d.link = a.linkId; a.linkId = 0; a.stripT = 180; kind = "link"; }
    else if (a.elite && !a.d.eliteStripped) { a.d.eliteStripped = 1; a.stripT = 180; kind = "crown"; }
    if (kind) w.emit("PropertyPeel", { id: a.id, kind, x: a.pos.x, z: a.pos.z });
    this.damage(w, a, CERTAINTY.nonExploitOp, { kind: "op", op: "null", compound: opts.compound });
  }

  restoreStrip(w: World, a: Actor): void {
    const base = behaviorFor(a.type).stats(w);
    if (base.immovable && a.thrownT <= 0) { a.immovable = true; a.armored = !!base.armored; }
    if (a.d.link) { const partner = w.actor(a.d.link); if (partner) a.linkId = a.d.link; a.d.link = 0; }
    a.d.eliteStripped = 0;
  }

  applyBuff(w: World, a: Actor, by: Actor, frames: number): void {
    if (a.buffT <= 0) {
      a.maxCertainty *= CERTAINTY.heraldBuffScale; a.certainty *= CERTAINTY.heraldBuffScale;
    }
    a.buffT = frames; a.buffedBy = by.id;
  }
  removeBuff(_w: World, a: Actor): void {
    if (a.buffT > 0 || a.buffedBy) {
      a.maxCertainty /= CERTAINTY.heraldBuffScale;
      a.certainty = Math.min(a.certainty / CERTAINTY.heraldBuffScale, a.maxCertainty);
    }
    a.buffT = 0; a.buffedBy = 0;
  }

  command(_w: World, a: Actor, by: Actor): void { a.commandedBy = by.id; }

  /** Freed subjects turn gold-neutral and attack their former commander. */
  free(w: World, a: Actor): void {
    const by = a.commandedBy;
    a.commandedBy = 0; a.neutral = true; a.d.freedTarget = by; a.d.freedCd = 0;
    if (a.token) w.tokens.release(a);
    a.state = "idle";
    w.emit("Freed", { id: a.id, target: by, x: a.pos.x, z: a.pos.z });
  }

  sever(w: World, a: Actor): void {
    const beh = behaviorFor(a.type);
    if (beh.onSever && beh.onSever(w, a) === "handled") return;
    if (a.commandedBy) { this.free(w, a); return; }
    if (a.linkId) {
      const partner = w.actor(a.linkId);
      a.linkId = 0;
      w.emit("PropertyPeel", { id: a.id, kind: "link", x: a.pos.x, z: a.pos.z });
      if (a.type === "paradox") {
        this.exploit(w, a, 1, { kind: "exploit", label: "paradox" });
        if (partner) { partner.linkId = 0; this.exploit(w, partner, 1, { kind: "exploit", label: "paradox" }); }
      }
      return;
    }
    this.strip(w, a, { compound: true });
  }

  unwind(w: World, a: Actor): void {
    const beh = behaviorFor(a.type);
    if (beh.onUnwind && beh.onUnwind(w, a) === "handled") return;
    if (a.buffT > 0) { this.removeBuff(w, a); this.damage(w, a, CERTAINTY.redirected, { kind: "op", op: "null", pierce: true }); w.emit("PropertyPeel", { id: a.id, kind: "unwind", x: a.pos.x, z: a.pos.z }); return; }
    if (a.d.healedFrom !== undefined && a.d.healedFrom > 0) {
      a.certainty = Math.min(a.certainty, a.d.healedFrom); a.d.healedFrom = 0;
      w.emit("PropertyPeel", { id: a.id, kind: "unwind", x: a.pos.x, z: a.pos.z });
      this.damage(w, a, CERTAINTY.redirected, { kind: "op", op: "null", pierce: true });
      return;
    }
    this.strip(w, a, { compound: true });
  }

  /** Paradox heal: when one breaks, the partner heals to full unless it also breaks within 30f. */
  heal(w: World, a: Actor): void {
    if (!a.alive || a.state === "broken") return;
    a.d.healedFrom = a.certainty;
    a.certainty = a.maxCertainty;
    w.emit("PropertyPeel", { id: a.id, kind: "heal", x: a.pos.x, z: a.pos.z });
  }

  update(w: World): void {
    // Hostile body contact damage for neutral freed subjects is handled in their behavior.
    void w;
  }
}

/** Bosses are only truly hurt through their principle; raw redirects count as a non-exploit op (Giant's shadow: 12). */
function redirectDamage(a: Actor): number {
  if (!a.boss) return CERTAINTY.redirected;
  return a.type === "shadow" ? CERTAINTY.bossShadowRedirect : CERTAINTY.nonExploitOp;
}

function endThrow(a: Actor): void { a.thrownT = 0; a.thrownBy = null; a.d.ghost = 0; a.d.cleanLine = 0; a.d.compound = 0; a.vel = scale(norm(a.vel), 0); }
export { segDist };
