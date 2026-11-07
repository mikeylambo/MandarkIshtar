import { THEOREMS, THEOREM_TUNING } from "../../data/enemies";
const T = THEOREM_TUNING.corollary;
import type { Behavior } from "../Behavior";
import { aimPoint, beginTelegraph, eliteUpdate, fire, keepRange } from "../common";
import { add, dirTo, norm, rotate, scale } from "../../sim/math";

/** Octahedron. When broken it splits into 2 Axioms, spawned facing apart along Markov's aim. */
export const corollary: Behavior = {
  stats: () => ({ certainty: THEOREMS.corollary.certainty, radius: THEOREMS.corollary.radius }),
  init: () => {},
  update(w, a, dt) {
    eliteUpdate(w, a, dt);
    const m = w.markov;
    if (a.state === "telegraph") {
      a.stateT -= dt;
      if (a.stateT <= 0) { fire(w, a, dirTo(a.pos, aimPoint(w)), T.shotSpeed, "bolt", 0.38); a.state = "recover"; a.stateT = T.recover; if (a.token) w.tokens.release(a); }
      return;
    }
    if (a.state === "recover") { a.stateT -= dt; keepRange(w, a, m.pos, T.range, THEOREMS.corollary.speed, dt); if (a.stateT <= 0) a.state = "approach"; return; }
    keepRange(w, a, m.pos, T.range, THEOREMS.corollary.speed, dt);
    if (w.tokens.request(w, a)) beginTelegraph(w, a, T.telegraph, "bolt", dirTo(a.pos, m.pos));
  },
  onBroken(w, a) {
    const aim = norm(w.ops.aimNow());
    w.emit("Broken", { id: a.id, kind: "corollary", x: a.pos.x, z: a.pos.z });
    w.ledger.remove(w, a, "split");
    for (const s of [1, -1]) {
      const dir = scale(aim, s);
      const b = w.spawnActor("axiom", add(a.pos, scale(dir, 0.7)), { spawnFrames: T.splitTelegraph, waveIndex: a.waveIndex });
      b.aim = dir; b.facing = dir; b.d.splitCharge = 1; b.d.splitFrom = a.id;
      w.emit("Telegraph", { id: b.id, kind: "charge", x: b.pos.x, z: b.pos.z, dx: dir.x, dz: dir.z, value: T.splitTelegraph });
    }
    void rotate;
    return "handled";
  },
};
