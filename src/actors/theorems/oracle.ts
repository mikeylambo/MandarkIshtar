import { THEOREMS, THEOREM_TUNING } from "../../data/enemies";
const T = THEOREM_TUNING.oracle;
import type { Behavior } from "../Behavior";
import { aimPoint, beginTelegraph, eliteUpdate, fire, keepRange } from "../common";
import { dirTo } from "../../sim/math";

/** Hollow sphere. Fires at where you WILL be (0.6 s lead). Exploit: its own lead shot, Vectored back into it (100%). */
export const oracle: Behavior = {
  stats: () => ({ certainty: THEOREMS.oracle.certainty, radius: THEOREMS.oracle.radius }),
  init: (_w, a) => { a.d.cycle = 70 + (a.id % 3) * 20; },
  update(w, a, dt) {
    eliteUpdate(w, a, dt);
    const m = w.markov;
    if (a.state === "telegraph") {
      a.stateT -= dt;
      const target = aimPoint(w, T.lead);
      a.aim = dirTo(a.pos, target);
      a.d.px = target.x; a.d.pz = target.z;
      if (a.stateT <= 0) { fire(w, a, a.aim, T.shotSpeed, "prophecy", 0.4); a.state = "recover"; a.stateT = 20; if (a.token) w.tokens.release(a); }
      return;
    }
    if (a.state === "recover") { a.stateT -= dt; if (a.stateT <= 0) a.state = "approach"; }
    keepRange(w, a, m.pos, T.range, THEOREMS.oracle.speed, dt);
    a.d.cycle -= dt;
    if (a.d.cycle <= 0 && w.tokens.request(w, a)) { a.d.cycle = T.every; beginTelegraph(w, a, T.telegraph, "prophecy", dirTo(a.pos, m.pos)); }
  },
  onProjectile(w, a, p) {
    if (p.shooterId === a.id && p.redirected) { w.ledger.exploit(w, a, THEOREMS.oracle.exploit, { kind: "exploit", byEnemy: true, label: "oracle" }); return "handled"; }
  },
};
