import { THEOREMS, THEOREM_TUNING } from "../../data/enemies";
const T = THEOREM_TUNING.iterator;
import type { Behavior } from "../Behavior";
import { beginTelegraph, eliteUpdate, fire, keepRange } from "../common";
import { dirTo, rotate } from "../../sim/math";

/** Torus. Loops one fixed 3-shot pattern every 150f. Exploit: Order-Reverse its volley back into it (100%). */
export const iterator: Behavior = {
  stats: () => ({ certainty: THEOREMS.iterator.certainty, radius: THEOREMS.iterator.radius }),
  init: (_w, a) => { a.d.cycle = 60 + (a.id % 3) * 25; },
  update(w, a, dt) {
    eliteUpdate(w, a, dt);
    const m = w.markov;
    if (a.state === "telegraph") {
      a.stateT -= dt;
      if (a.stateT <= 0) {
        const sp = (T.spreadDeg * Math.PI) / 180;
        for (const k of [-1, 0, 1]) fire(w, a, rotate(a.aim, k * sp), T.shotSpeed, "bolt", 0.34);
        a.state = "recover"; a.stateT = 20; if (a.token) w.tokens.release(a);
      }
      return;
    }
    if (a.state === "recover") { a.stateT -= dt; if (a.stateT <= 0) a.state = "approach"; }
    keepRange(w, a, m.pos, T.range, THEOREMS.iterator.speed, dt);
    a.d.cycle -= dt;
    if (a.d.cycle <= 0 && w.tokens.request(w, a)) { a.d.cycle = T.every; beginTelegraph(w, a, T.telegraph, "volley", dirTo(a.pos, m.pos)); }
  },
  onProjectile(w, a, p) {
    if (p.shooterId === a.id && p.reversed) { w.ledger.exploit(w, a, THEOREMS.iterator.exploit, { kind: "exploit", byEnemy: true, label: "iterator" }); return "handled"; }
  },
};
