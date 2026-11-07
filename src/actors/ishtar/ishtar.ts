import { ISHTAR as I } from "../../data/bosses/ishtar";
import type { Behavior } from "../Behavior";
import type { World } from "../../sim/World";
import type { Actor } from "../../sim/entities";
import { REGALIA_ORDER, type Regalia } from "../../sim/types";
import { dirTo, dist, fromAngle, scale } from "../../sim/math";

export type IshtarPhase = 1 | 2 | 3 | 4;

/** The counterfeit morning star. Cannot be solved: Siege → Temptation → Stillness → dawn. */
export const ishtar: Behavior = {
  stats: () => ({ certainty: 1, radius: 1.6, boss: true, invulnerable: true, armored: true }),
  countsForClear: false,
  passable: true,
  init(w, a) {
    w.director.scripted = true;
    a.pos = { x: 0, z: 0 };
    w.markov.setPos({ x: 0, z: 8 });
    const start = (w.opts.startPhase ?? 1) as IshtarPhase;
    enter(w, a, start);
  },
  update(w, a) {
    const ph = a.d.phase as IshtarPhase;
    a.d.t++;
    if (ph === 1) siege(w, a);
    else if (ph === 2) temptation(w, a);
    else if (ph === 3) stillness(w, a);
    else if (ph === 4) { if (a.d.t >= I.revealFrames && !a.d.done) { a.d.done = 1; w.director.complete(); } }
  },
  onOp() { return "handled"; },
  onStrike() { return "handled"; },
  onProjectile() { return "pass"; },
  onRingOut() { return "handled"; },
};

function enter(w: World, a: Actor, ph: IshtarPhase): void {
  a.d.phase = ph; a.d.t = 0;
  w.emit("PhaseChange", { kind: "ishtar", value: ph });
  w.flags.ishtarPhase = ph;
  const m = w.markov;
  if (ph === 1) {
    w.flags.noSealLoss = 0;
    for (const p of w.props) if (p.type === "pickup") p.alive = false;
  } else if (ph === 2) {
    m.setSeals(m.maxSeals);
    w.flags.noSealLoss = 1;
    w.emit("Bark", { kind: "temptation" });
    // offer back every regalia Markov no longer holds
    const offered = REGALIA_ORDER.filter((r) => !m.regalia.has(r));
    offered.forEach((r, i) => {
      const p = scale(fromAngle((i / Math.max(1, offered.length)) * Math.PI * 2), I.pickupOrbit);
      w.spawnProp("pickup", p, { radius: I.pickupRadius, tag: r });
    });
    for (const p of w.projectiles) p.alive = false;
    for (const h of w.hazards) h.alive = false;
  } else if (ph === 3) {
    for (const p of w.props) if (p.type === "pickup") p.alive = false;
    for (const r of [...m.regalia]) m.removeRegalia(r);
    m.freeze();
    w.flags.dawn = 0;
    w.emit("Bark", { kind: "stillness" });
  } else if (ph === 4) {
    w.emit("DawnProgress", { value: 1 });
    w.emit("NameReveal");
    for (const p of w.projectiles) p.alive = false;
    for (const h of w.hazards) h.alive = false;
  }
}

function siege(w: World, a: Actor): void {
  const m = w.markov;
  const t = a.d.t;
  if (t % I.barrage.every === 0) {
    const r = w.r("boss");
    const pattern = Math.floor(t / I.barrage.every) % 3;
    if (pattern === 0) {
      // radiant ring with gaps
      const off = r.range(0, Math.PI * 2);
      for (let i = 0; i < I.barrage.ringCount; i++) {
        if (i % I.barrage.gapEvery === 0) continue;
        const d = fromAngle(off + (i / I.barrage.ringCount) * Math.PI * 2);
        w.spawnProjectile({ pos: a.pos, vel: scale(d, I.barrage.ringSpeed), owner: "enemy", shooterId: a.id, shape: "radiant", radius: 0.42, life: 400 });
      }
    } else if (pattern === 1) {
      const d = dirTo(a.pos, m.pos);
      for (const k of [-1, 0, 1]) {
        const side = { x: -d.z * k * 3, z: d.x * k * 3 };
        w.spawnHazard({ kind: "radiantLine", shape: "line", pos: { x: a.pos.x + side.x, z: a.pos.z + side.z }, end: { x: a.pos.x + side.x + d.x * 18, z: a.pos.z + side.z + d.z * 18 }, width: I.barrage.lineWidth, telegraph: I.barrage.lineTelegraph, active: 12, ownerId: a.id });
      }
    } else {
      for (let i = 0; i < 4; i++) {
        const off = scale(fromAngle(r.range(0, Math.PI * 2)), r.range(1, 5));
        w.spawnHazard({ kind: "radiantOrb", pos: { x: m.pos.x + off.x, z: m.pos.z + off.z }, radius: 1.7, telegraph: I.barrage.orbTelegraph + i * 10, active: 10, ownerId: a.id });
      }
    }
  }
  if (t >= I.siegeFrames) enter(w, a, 2);
}

function temptation(w: World, a: Actor): void {
  const m = w.markov;
  for (const p of w.props) {
    if (!p.alive || p.type !== "pickup") continue;
    // drift toward Markov, tempting
    const d = dirTo(p.pos, m.pos);
    p.pos.x += (d.x * I.pickupDrift) / 60; p.pos.z += (d.z * I.pickupDrift) / 60;
    if (dist(p.pos, m.pos) < p.radius + m.radius) {
      // "Take it. You were made to be like me."
      m.grantRegalia(p.tag as Regalia);
      m.tookTemptation = true;
      w.emit("TemptationTaken", { kind: p.tag, x: p.pos.x, z: p.pos.z });
      enter(w, a, 1);
      return;
    }
  }
  if (a.d.t >= I.temptationFrames) enter(w, a, 3);
}

function stillness(w: World, a: Actor): void {
  const input = w.lastInput;
  const any = input.b !== 0 || Math.hypot(input.mx, input.mz) > 0.05;
  const before = w.flags.dawn ?? 0;
  w.flags.dawn = Math.max(0, Math.min(I.dawnFrames, before + (any ? -I.dawnDrain : 1)));
  if (a.d.t % 6 === 0) w.emit("DawnProgress", { value: w.flags.dawn / I.dawnFrames });
  // radiant motes still drift in, and dissolve on him
  if (a.d.t % 90 === 0) {
    const d = fromAngle(w.r("boss").range(0, Math.PI * 2));
    w.spawnProjectile({ pos: scale(d, 10), vel: scale(d, -3), owner: "enemy", shooterId: a.id, shape: "radiant", radius: 0.35, life: 300 });
  }
  if (w.flags.dawn >= I.dawnFrames) { w.flags.dawnFrame = w.frame; enter(w, a, 4); }
}
