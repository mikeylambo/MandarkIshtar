import { THEOREMS, THEOREM_TUNING } from "../../data/enemies";
const T = THEOREM_TUNING.constant;
import type { Behavior } from "../Behavior";
import { eliteUpdate } from "../common";

/** Heavy dodecahedron. Immovable wall-body; shockwave every 240f (telegraph 40f).
 *  Exploit: Null-Strip immovability → it becomes a missile. Being thrown = 100%. */
export const constant: Behavior = {
  stats: () => ({ certainty: THEOREMS.constant.certainty, radius: THEOREMS.constant.radius, armored: true, immovable: true }),
  init: (_w, a) => { a.d.pulse = T.pulseEvery * 0.6 + (a.id % 4) * 20; },
  update(w, a, dt) {
    eliteUpdate(w, a, dt);
    a.d.pulse -= dt;
    if (a.d.pulse <= 0) {
      a.d.pulse = T.pulseEvery;
      w.spawnHazard({ kind: "shockwave", shape: "ring", pos: a.pos, radius: a.radius, width: 0.45, telegraph: T.telegraph, active: T.growFrames, ownerId: a.id, grow: (T.radius - a.radius) / T.growFrames });
    }
  },
  onThrownImpact(w, a) {
    w.ledger.exploit(w, a, THEOREMS.constant.exploit, { kind: "exploit", byEnemy: true, label: "constant-thrown" });
    return "handled";
  },
};
