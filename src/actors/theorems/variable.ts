import { THEOREMS, THEOREM_TUNING } from "../../data/enemies";
const T = THEOREM_TUNING.variable;
import type { Behavior } from "../Behavior";
import { aimPoint, eliteUpdate, fire, keepRange, moveToward } from "../common";
import { dirTo, dist } from "../../sim/math";

/** Flickering cube: solid ↔ spectral every 180f. Hittable only when solid; shoots when spectral.
 *  Exploit: Markov, himself spectral, touches it or ops it while it is spectral (100%). */
export const variable: Behavior = {
  stats: () => ({ certainty: THEOREMS.variable.certainty, radius: THEOREMS.variable.radius }),
  init: (w, a) => { a.d.swap = T.swap - (a.id % 3) * 30; a.d.shot = T.shotEvery; void w; },
  update(w, a, dt) {
    eliteUpdate(w, a, dt);
    a.d.swap -= dt;
    if (a.d.swap <= 0) { a.d.swap = T.swap; a.spectral = !a.spectral; w.emit("PhaseIn", { id: a.id, x: a.pos.x, z: a.pos.z, value: a.spectral ? 2 : 3 }); }
    const m = w.markov;
    if (a.spectral) {
      keepRange(w, a, m.pos, T.range, THEOREMS.variable.speed, dt);
      a.d.shot -= dt;
      if (a.d.shot <= 0 && w.tokens.request(w, a)) {
        a.d.shot = T.shotEvery;
        fire(w, a, dirTo(a.pos, aimPoint(w)), T.shotSpeed, "bolt");
        w.tokens.release(a);
      }
      if (m.spectral && dist(a.pos, m.pos) < a.radius + m.radius + 0.1) this.onSpectralContact!(w, a);
    } else {
      moveToward(w, a, m.pos, THEOREMS.variable.speed * 0.6, dt, 3);
    }
  },
  modifyDamage(_w, a, dmg, info) { return a.spectral && info.exploit === undefined ? 0 : dmg; },
  onProjectile(_w, a) { return a.spectral ? "pass" : undefined; },
  onHitByBody(_w, a) { return a.spectral ? "handled" : undefined; },
  onOp(w, a, op) {
    if (a.spectral && w.markov.spectral && op !== "phase") { w.ledger.exploit(w, a, THEOREMS.variable.exploit, { kind: "exploit", label: "variable" }); return "handled"; }
  },
  onSpectralContact(w, a) {
    if ((a.d.contactCd ?? 0) > w.frame) return;
    a.d.contactCd = w.frame + 30;
    w.ledger.exploit(w, a, THEOREMS.variable.exploit, { kind: "exploit", label: "variable" });
  },
};
