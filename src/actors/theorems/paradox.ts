import { THEOREMS, THEOREM_TUNING } from "../../data/enemies";
const T = THEOREM_TUNING.paradox;
import type { Behavior } from "../Behavior";
import { aimPoint, eliteUpdate, fire, keepRange } from "../common";
import { dirTo, dist, segDist } from "../../sim/math";

/** Twin linked icosahedra. Breaking one heals the other to full unless both break within 30f.
 *  Exploit: compounds that hit both (Recurrence, Clean Line, Severance): 100% both. */
export const paradox: Behavior = {
  stats: () => ({ certainty: THEOREMS.paradox.certainty, radius: THEOREMS.paradox.radius }),
  init: (_w, a) => { a.d.link = 0; a.d.linkT = T.linkEvery; a.d.shot = T.shotEvery + (a.id % 2) * 60; },
  update(w, a, dt) {
    eliteUpdate(w, a, dt);
    const m = w.markov;
    const partner = a.linkId ? w.actor(a.linkId) : undefined;
    // keep a few units from partner while ranging Markov
    keepRange(w, a, m.pos, T.range, THEOREMS.paradox.speed, dt);
    if (partner && dist(a.pos, partner.pos) < 3) {
      const away = dirTo(partner.pos, a.pos);
      a.pos.x += (away.x * dt) / 60 * 2; a.pos.z += (away.z * dt) / 60 * 2;
    }
    if (a.d.healAt && w.frame >= a.d.healAt) { a.d.healAt = 0; w.ledger.heal(w, a); }
    // link pulse (owned by the lower id of the pair)
    if (partner && a.id < partner.id) {
      a.d.linkT -= dt;
      if (a.d.linkT <= 0 && !a.d.linkTele) { a.d.linkTele = w.tele(T.linkTelegraph); w.emit("Telegraph", { id: a.id, kind: "link", x: a.pos.x, z: a.pos.z, target: partner.id, value: a.d.linkTele }); }
      if (a.d.linkTele) {
        a.d.linkTele -= dt;
        if (a.d.linkTele <= 0) { a.d.linkTele = 0; a.d.linkActive = T.linkActive; a.d.linkT = T.linkEvery; }
      }
      if (a.d.linkActive > 0) {
        a.d.linkActive -= dt;
        if (segDist(m.pos, a.pos, partner.pos) < m.radius + 0.25) m.hit("paradoxLink", a.pos);
      }
    }
    a.d.shot -= dt;
    if (a.d.shot <= 0 && w.tokens.request(w, a)) { a.d.shot = T.shotEvery; fire(w, a, dirTo(a.pos, aimPoint(w)), T.shotSpeed, "bolt"); w.tokens.release(a); }
  },
  onBroken(w, a) {
    const partner = a.linkId ? w.actor(a.linkId) : undefined;
    if (partner && partner.state !== "broken") partner.d.healAt = w.frame + T.healWindow;
    if (partner && partner.state === "broken") partner.d.healAt = 0;
  },
  onSever(w, a) {
    const partner = a.linkId ? w.actor(a.linkId) : undefined;
    a.linkId = 0;
    w.emit("PropertyPeel", { id: a.id, kind: "link", x: a.pos.x, z: a.pos.z });
    w.ledger.exploit(w, a, THEOREMS.paradox.exploit, { kind: "exploit", label: "paradox" });
    if (partner) { partner.linkId = 0; w.ledger.exploit(w, partner, THEOREMS.paradox.exploit, { kind: "exploit", label: "paradox" }); }
    return "handled";
  },
};
