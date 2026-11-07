import { COMPOUND_TUNING, type CompoundId } from "../data/compounds";
import { CERTAINTY } from "../data/certainty";
import type { World } from "../sim/World";
import type { Actor, Projectile, Prop, TargetRef } from "../sim/entities";
import { add, dirTo, len, norm, scale } from "../sim/math";
import type { OpId, Vec } from "../sim/types";
import { behaviorFor } from "../actors/registry";
import { PUSH_SPEED } from "./OpSystem";

export interface FirstCast { op: OpId; mode: "tap" | "hold"; frame: number; target: TargetRef | null; aim: Vec; pos: Vec }
export interface SecondCast { op: OpId; mode: "tap" | "hold"; aim: Vec; frame: number }

/** Applies a compound ("Proof") after its first op has resolved. */
export function resolveCompound(w: World, id: CompoundId, first: FirstCast, second: SecondCast): void {
  const m = w.markov;
  const t = w.resolve(first.target);
  // Ops on a target that rejects measurement (Child) fizzle.
  if (t && first.target?.kind === "actor") {
    const a = t as Actor;
    const beh = behaviorFor(a.type);
    if (beh.onCompound && beh.onCompound(w, a, id) === "handled") return;
  }
  switch (id) {
    case "ghostLance": {
      // Pushed object passes through walls/shields, then re-solidifies on hit (×1.5).
      if (t && first.target!.kind === "projectile") { const p = t as Projectile; p.ghost = true; p.compound = id; p.damageScale = CERTAINTY.compoundBonus; }
      else if (t && first.target!.kind === "actor") { (t as Actor).d.ghost = 1; (t as Actor).d.compound = 1; }
      break;
    }
    case "passingTurn": {
      // Step through a target while spectral and fling it backward along your path.
      const target = t ?? nearestActor(w, m.pos, 6);
      if (!target) break;
      const dir = norm(dirTo(m.pos, target.pos, second.aim));
      m.setPos(add(target.pos, scale(dir, COMPOUND_TUNING.passThroughDistance)));
      m.bound();
      fling(w, target, { x: -dir.x, z: -dir.z }, id);
      break;
    }
    case "recurrence": {
      // Pushed object repeats its path 2 more times.
      if (!t) break;
      const vel = "vel" in t ? norm(t.vel, first.aim) : first.aim;
      for (let i = 1; i <= COMPOUND_TUNING.recurrenceRepeats; i++) {
        w.flags[`rec${w.frame}_${i}`] = 0;
        scheduleRepeat(w, { ...first.pos }, vel, i * COMPOUND_TUNING.recurrenceSpacing, t.id);
      }
      if (first.target!.kind === "projectile") { (t as Projectile).compound = id; (t as Projectile).damageScale = CERTAINTY.compoundBonus; }
      else if (first.target!.kind === "actor") (t as Actor).d.compound = 1;
      break;
    }
    case "slingshot": {
      // Delayed object stores momentum; release at 3× speed.
      if (!t || first.target!.kind === "prop") break;
      const e = t as Actor | Projectile;
      e.localScale = 1; e.delayT = 0;
      const speed = PUSH_SPEED * COMPOUND_TUNING.slingshotScale;
      if (first.target!.kind === "projectile") { const p = t as Projectile; w.ops.push(first.target!, p, second.aim, speed); p.compound = id; p.damageScale = CERTAINTY.compoundBonus; }
      else fling(w, t as Actor, second.aim, id, speed);
      break;
    }
    case "cleanLine": {
      if (t && first.target!.kind === "projectile") { const p = t as Projectile; p.cleanLine = true; p.compound = id; p.damageScale = CERTAINTY.compoundBonus; }
      else if (t && first.target!.kind === "actor") { (t as Actor).d.cleanLine = 1; (t as Actor).d.compound = 1; }
      break;
    }
    case "unanchor": {
      // Strip immovability, then fling (Constants become missiles).
      if (!t || first.target!.kind !== "actor") break;
      const a = t as Actor;
      if (a.boss) { w.ledger.damage(w, a, CERTAINTY.nonExploitOp, { kind: "op", compound: true, op: "vector" }); break; }
      if (a.stripT <= 0) w.ledger.strip(w, a);
      fling(w, a, second.aim, id);
      break;
    }
    case "echo": {
      // Leaves a spectral afterimage that repeats your next op 60f later from its position.
      w.ops.plantEcho(m.pos);
      break;
    }
    case "fold": {
      // Reversed target phases, rewinding through obstacles.
      if (!t || first.target!.kind === "prop") break;
      (t as Actor | Projectile).phasedT = 120;
      if (first.target!.kind === "projectile") { const p = t as Projectile; p.ghost = true; p.compound = id; p.damageScale = CERTAINTY.compoundBonus; }
      else (t as Actor).d.compound = 1;
      break;
    }
    case "voidStep": {
      // Spectral pass through a target strips its current buff/Law effect.
      const target = (t && first.target!.kind === "actor" ? t as Actor : null) ?? nearestActor(w, m.pos, 6);
      if (!target) break;
      const dir = norm(dirTo(m.pos, target.pos, second.aim));
      m.setPos(add(target.pos, scale(dir, COMPOUND_TUNING.passThroughDistance)));
      m.bound();
      w.ledger.strip(w, target, { compound: true });
      break;
    }
    case "severance": {
      // Cuts a target from its link (Paradox pairs, the Giant's shadow tether, command beams).
      if (!t || first.target!.kind !== "actor") break;
      w.ledger.sever(w, t as Actor);
      break;
    }
    case "delayedErase": {
      const pos = t ? t.pos : add(m.pos, scale(second.aim, 3));
      w.ops.plantErase(pos);
      break;
    }
    case "unwind": {
      // Strips a buff and reverses its last effect (undo a heal or a shield).
      if (!t || first.target!.kind !== "actor") break;
      w.ledger.unwind(w, t as Actor);
      break;
    }
  }
}

function nearestActor(w: World, p: Vec, range: number): Actor | null {
  let best: Actor | null = null, bd = range;
  for (const a of w.actors) {
    if (!a.alive || a.neutral) continue;
    const d = len({ x: a.pos.x - p.x, z: a.pos.z - p.z });
    if (d < bd) { bd = d; best = a; }
  }
  return best;
}

function fling(w: World, t: Actor | Projectile | Prop, dir: Vec, compound: CompoundId, speed = PUSH_SPEED): void {
  if ("certainty" in t) {
    const a = t as Actor;
    if (a.boss || (a.armored && a.stripT <= 0)) { w.ledger.damage(w, a, CERTAINTY.nonExploitOp, { kind: "op", compound: true, op: "vector" }); return; }
    w.ops.throwActor(a, norm(dir), speed);
    a.d.compound = 1;
    return;
  }
  if ("owner" in t) { const p = t as Projectile; w.ops.push({ kind: "projectile", id: p.id }, p, dir, speed); p.compound = compound; p.damageScale = CERTAINTY.compoundBonus; }
}

/** Recurrence: phantom copies retrace the pushed path as Markov-owned echo bolts. */
function scheduleRepeat(w: World, from: Vec, dir: Vec, delay: number, sourceId: number): void {
  const key = `recq`;
  const q = (w.flags as Record<string, number>);
  q[key] = (q[key] ?? 0) + 1;
  w.director.schedule(delay, () => {
    const p = w.spawnProjectile({ pos: from, vel: scale(dir, PUSH_SPEED), owner: "markov", shooterId: 0, shape: "echo", radius: 0.45, life: 60 });
    p.redirected = true; p.compound = "recurrence"; p.damageScale = CERTAINTY.compoundBonus; p.graceT = 0; p.echo = true;
    w.emit("Echo", { id: sourceId, x: from.x, z: from.z, op: "recurrence" });
  });
}
