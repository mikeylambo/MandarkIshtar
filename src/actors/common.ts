import type { World } from "../sim/World";
import type { Actor } from "../sim/entities";
import { add, dirTo, dist, fromAngle, len, norm, rotate, scale } from "../sim/math";
import type { ProjectileShape, Vec } from "../sim/types";
import { CERTAINTY } from "../data/certainty";

/** Speed in u/s, dt in local frames. */
export function moveToward(w: World, a: Actor, target: Vec, speed: number, dt: number, stopAt = 0): void {
  const d = dist(a.pos, target);
  if (d <= stopAt) return;
  const dir = steer(w, a, dirTo(a.pos, target));
  const step = Math.min(d - stopAt, (speed * w.law.speedScale(a) * dt) / 60);
  a.pos = add(a.pos, scale(dir, step));
  a.facing = dir;
  w.boundActor(a);
}

/** Simple obstacle avoidance: deflect around Constants and pillars. */
export function steer(w: World, a: Actor, dir: Vec): Vec {
  let out = { ...dir };
  const probe = add(a.pos, scale(dir, 1.6));
  for (const o of w.def.arena.obstacles) {
    if (Math.hypot(probe.x - o.x, probe.z - o.z) < o.r + a.radius + 0.3) out = add(out, scale(rotate(dir, Math.PI / 2), 1.2));
  }
  for (const b of w.actors) {
    if (b === a || !b.alive || !b.immovable) continue;
    if (dist(probe, b.pos) < b.radius + a.radius + 0.3) out = add(out, scale(rotate(dir, Math.PI / 2), 1.2));
  }
  return norm(out, dir);
}

export function keepRange(w: World, a: Actor, target: Vec, range: number, speed: number, dt: number): void {
  const d = dist(a.pos, target);
  if (d > range + 1) moveToward(w, a, target, speed, dt, range);
  else if (d < range - 1.5) {
    const away = dirTo(target, a.pos);
    a.pos = add(a.pos, scale(away, (speed * 0.7 * dt) / 60));
    w.boundActor(a);
  }
  // gentle orbit so ranged enemies don't stand still
  const side = rotate(dirTo(target, a.pos), Math.PI / 2);
  a.pos = add(a.pos, scale(side, ((a.id % 2 ? 1 : -1) * speed * 0.25 * dt) / 60));
  w.boundActor(a);
}

export function fire(w: World, a: Actor, dir: Vec, speed: number, shape: ProjectileShape = "bolt", radius = 0.32): void {
  const d = norm(dir);
  w.spawnProjectile({ pos: add(a.pos, scale(d, a.radius + 0.3)), vel: scale(d, speed * w.law.projectileSpeedScale()), owner: "enemy", shooterId: a.id, shape, radius });
  w.emit("EnemyAttack", { id: a.id, kind: shape, x: a.pos.x, z: a.pos.z, dx: d.x, dz: d.z });
}

/** Aim point honoring the Law of Prophecy (lead targeting). */
export function aimPoint(w: World, lead = 0): Vec {
  const m = w.markov;
  const l = lead + w.law.leadSeconds();
  return { x: m.pos.x + m.vel.x * l, z: m.pos.z + m.vel.z * l };
}

/** Telegraph helper: state "telegraph" for N frames (difficulty-scaled), emitting the threat. */
export function beginTelegraph(w: World, a: Actor, frames: number, kind: string, dir?: Vec): void {
  a.state = "telegraph"; a.stateT = w.tele(frames);
  if (dir) a.aim = norm(dir);
  w.emit("Telegraph", { id: a.id, kind, x: a.pos.x, z: a.pos.z, value: a.stateT, dx: a.aim.x, dz: a.aim.z });
}

/** Contact damage on Markov (bodies). */
export function touchMarkov(w: World, a: Actor, extra = 0): boolean {
  const m = w.markov;
  if (dist(a.pos, m.pos) < a.radius + m.radius + extra) return m.hit(a.type, a.pos);
  return false;
}

/** Elite second behavior: a Law-flavored 6-way burst every 300f (telegraph 40f). */
export function eliteUpdate(w: World, a: Actor, dt: number): void {
  if (!a.elite || a.d.eliteStripped) return;
  a.d.eliteT = (a.d.eliteT ?? 200) - dt;
  if (a.d.eliteT <= 0 && !a.d.eliteTele) { a.d.eliteTele = w.tele(40); w.emit("Telegraph", { id: a.id, kind: "eliteBurst", x: a.pos.x, z: a.pos.z, value: a.d.eliteTele }); }
  if (a.d.eliteTele) {
    a.d.eliteTele -= dt;
    if (a.d.eliteTele <= 0) {
      a.d.eliteTele = 0; a.d.eliteT = 300;
      const base = Math.atan2(w.markov.pos.x - a.pos.x, w.markov.pos.z - a.pos.z);
      for (let i = 0; i < 6; i++) fire(w, a, fromAngle(base + (i * Math.PI) / 3), 6, "bolt");
    }
  }
}

/** Shared freed-subject AI: gold-neutral, attacks its former commander (25 per hit). */
export function freedUpdate(w: World, a: Actor, dt: number): void {
  let target = w.actor(a.d.freedTarget ?? 0);
  if (!target || target.neutral) {
    const hs = w.hostiles().filter((h) => h !== a);
    target = hs.sort((p, q) => dist(p.pos, a.pos) - dist(q.pos, a.pos))[0];
    if (target) a.d.freedTarget = target.id;
  }
  if (!target) { w.ledger.remove(w, a, "filed"); return; }
  moveToward(w, a, target.pos, 4.5, dt, 0);
  a.d.freedCd = (a.d.freedCd ?? 0) - dt;
  const hp = target.pos;
  if (a.d.freedCd <= 0 && dist(a.pos, hp) < a.radius + target.radius + 0.4) {
    a.d.freedCd = 45;
    w.emit("OrbitContact", { id: target.id, x: hp.x, z: hp.z, kind: "freed" });
    w.ledger.damage(w, target, CERTAINTY.redirected, { kind: "freed", byEnemy: true });
  }
}

export function speedOf(a: Actor): number { return len(a.vel); }
