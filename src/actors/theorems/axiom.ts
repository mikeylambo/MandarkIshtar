import { THEOREMS, THEOREM_TUNING } from "../../data/enemies";
const T = THEOREM_TUNING.axiom;
import type { Behavior } from "../Behavior";
import { beginTelegraph, eliteUpdate, moveToward, steer, touchMarkov } from "../common";
import { add, dirTo, dist, scale } from "../../sim/math";

/** Tetrahedron. Telegraphs 30f, charges straight 12 u. Exploit: redirected into another enemy, or charging into a Constant. */
export const axiom: Behavior = {
  stats: () => ({ certainty: THEOREMS.axiom.certainty, radius: THEOREMS.axiom.radius }),
  init: (_w, a) => { a.d.charge = 0; },
  update(w, a, dt) {
    eliteUpdate(w, a, dt);
    const m = w.markov;
    switch (a.state) {
      case "idle": case "approach": case "recover":
        if (a.state === "recover") { a.stateT -= dt; if (a.stateT > 0) return; a.state = "approach"; }
        if (a.d.splitCharge) { a.state = "act"; a.d.charge = T.chargeDistance; return; }
        if (dist(a.pos, m.pos) > T.engageRange) moveToward(w, a, m.pos, T.approachSpeed, dt, T.engageRange - 1);
        else if (w.tokens.request(w, a)) beginTelegraph(w, a, T.telegraph, "charge", dirTo(a.pos, m.pos));
        else moveToward(w, a, m.pos, T.approachSpeed * 0.4, dt, T.engageRange);
        return;
      case "telegraph":
        a.stateT -= dt;
        if (a.stateT <= 0) { a.state = "act"; a.d.charge = T.chargeDistance; w.emit("EnemyAttack", { id: a.id, kind: "charge", x: a.pos.x, z: a.pos.z, dx: a.aim.x, dz: a.aim.z }); }
        return;
      case "act": {
        const step = Math.min(a.d.charge, (THEOREMS.axiom.speed * w.law.speedScale(a) * dt) / 60);
        a.pos = add(a.pos, scale(a.aim, step));
        a.d.charge -= step;
        a.facing = a.aim;
        // charging into a Constant: its own law ends it
        for (const b of w.actors) {
          if (b === a || !b.alive || b.state === "spawn") continue;
          if (dist(a.pos, b.pos) > a.radius + b.radius) continue;
          if (b.type === "constant") { w.ledger.exploit(w, a, 1, { kind: "exploit", byEnemy: true, label: "axiom-constant" }); w.ledger.damage(w, b, 25, { kind: "redirect", byEnemy: true }); break; }
          if (a.d.splitCharge && !b.neutral && b.d.splitFrom !== a.d.splitFrom) {
            w.ledger.exploit(w, a, 1, { kind: "exploit", byEnemy: true, label: "corollary-split" });
            w.ledger.damage(w, b, 25, { kind: "redirect", byEnemy: true });
            break;
          }
        }
        if (!a.alive || (a.state as string) === "broken") return;
        touchMarkov(w, a);
        const hitWall = w.boundActor(a);
        if (a.d.charge <= 0 || hitWall) {
          a.d.splitCharge = 0;
          if (a.token) w.tokens.release(a);
          a.state = "recover"; a.stateT = T.recover;
        }
        return;
      }
      default:
        a.state = "approach";
    }
    void steer;
  },
  onThrownImpact(w, a, hit) {
    if (!hit) return;
    // Redirected into another enemy: Contradiction (100%).
    w.ledger.exploit(w, a, THEOREMS.axiom.exploit, { kind: "exploit", byEnemy: true, label: "axiom-redirect" });
    return "handled";
  },
};
