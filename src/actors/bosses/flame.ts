import { FLAME as F } from "../../data/bosses/flame";
import type { Behavior } from "../Behavior";
import { beginTelegraph, fire, moveToward } from "../common";
import { applyStartPhase, bossPhase, fileRemaining } from "./bossCommon";
import { dirTo, fromAngle, rotate } from "../../sim/math";

/** Grows per non-exploit hit. Exploit: a fireball redirected through ≥1 prism back into it (12% +6%/extra prism; P3 needs 3+). */
export const flame: Behavior = {
  stats: (w) => ({ certainty: w.def.echo ? F.echoCertainty : F.certainty, radius: F.radius, boss: true, armored: true }),
  init(w, a) { a.d.volley = 90; a.d.ember = F.embers.every; a.d.wave = F.wave.every; a.d.growth = 0; a.d.pillarAng = 0; applyStartPhase(w, a, F.phases); },
  update(w, a, dt) {
    const phase = bossPhase(w, a, F.phases);
    const m = w.markov;
    a.radius = F.radius * (1 + a.d.growth * 0.5);
    moveToward(w, a, { x: m.pos.x * 0.25, z: m.pos.z * 0.25 }, F.speed, dt, 0.5);
    if (a.state === "telegraph") {
      a.stateT -= dt;
      if (a.stateT <= 0) {
        const sp = (F.volley.spreadDeg * Math.PI) / 180;
        const n = F.volley.count + (a.d.growth >= 0.5 ? 2 : 0);
        for (let i = 0; i < n; i++) fire(w, a, rotate(a.aim, (i - (n - 1) / 2) * sp), F.volley.speed * (1 + a.d.growth * 0.3), "fire", 0.42 + a.d.growth * 0.15);
        a.state = "idle";
      }
    } else {
      a.d.volley -= dt;
      if (a.d.volley <= 0) { a.d.volley = F.volley.every; beginTelegraph(w, a, F.volley.telegraph, "volley", dirTo(a.pos, m.pos)); }
    }
    if (phase >= 2) {
      a.d.ember -= dt;
      if (a.d.ember <= 0) {
        a.d.ember = F.embers.every;
        const n = w.actors.filter((x) => x.alive && x.type === "axiom").length;
        for (let i = n; i < Math.min(F.embers.max, n + 2); i++) w.spawnActor("axiom", { x: a.pos.x + (i % 2 ? 2 : -2), z: a.pos.z + 1.5 }, { waveIndex: 99 });
      }
      a.d.wave -= dt;
      if (a.d.wave <= 0) { a.d.wave = F.wave.every; w.spawnHazard({ kind: "flameWave", shape: "ring", pos: a.pos, radius: a.radius, width: 0.5, telegraph: F.wave.telegraph, active: F.wave.radius / F.wave.grow, grow: F.wave.grow, ownerId: a.id }); }
    }
    if (phase >= 3) {
      a.d.pillarAng += (F.pillars.angularSpeed * dt) / 60;
      if (!a.d.pillarsUp) {
        a.d.pillarsUp = 1;
        for (let i = 0; i < F.pillars.count; i++) {
          const h = w.spawnHazard({ kind: "firePillar", pos: a.pos, radius: F.pillars.radius, telegraph: F.pillars.telegraph, active: 1e9, ownerId: a.id });
          h.spent = false; a.d[`pillar${i}`] = h.id;
        }
      }
      for (let i = 0; i < F.pillars.count; i++) {
        const h = w.hazards.find((x) => x.id === a.d[`pillar${i}`]);
        if (!h) continue;
        const p = fromAngle(a.d.pillarAng + (i * 2 * Math.PI) / F.pillars.count);
        h.pos = { x: a.pos.x + p.x * F.pillars.orbit, z: a.pos.z + p.z * F.pillars.orbit };
        if (h.spent && (w.frame % 60 === 0)) h.spent = false;
      }
    }
  },
  onProjectile(w, a, p) {
    const phase = w.director.bossPhase;
    const need = F.exploit.minPrisms[phase - 1] ?? 1;
    if (p.prisms.length >= need) {
      w.ledger.exploit(w, a, F.exploit.base + F.exploit.perPrism * (p.prisms.length - 1), { kind: "exploit", byEnemy: p.shooterId === a.id, label: `prism×${p.prisms.length}` });
    } else this.onStrike!(w, a);
    return "handled";
  },
  onStrike(w, a) {
    // Pride feeds on itself.
    if (!w.def.echo) a.d.growth = Math.min(F.growthMax, a.d.growth + F.growthPerHit);
    w.ledger.damage(w, a, 2, { kind: "strike" });
    w.emit("PhaseIn", { id: a.id, kind: "grow", value: a.d.growth, x: a.pos.x, z: a.pos.z });
    return "handled";
  },
  onHitByBody(w, a) { this.onStrike!(w, a); return "handled"; },
  onOp(w, a, op) { if (op === "vector" || op === "null") { this.onStrike!(w, a); return "handled"; } },
  onRemoved(w, a) { fileRemaining(w, a); for (const h of w.hazards) if (h.ownerId === a.id) h.alive = false; },
};
