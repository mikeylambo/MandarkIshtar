import { THEOREMS, THEOREM_TUNING } from "../../data/enemies";
const T = THEOREM_TUNING.herald;
import type { Behavior } from "../Behavior";
import { eliteUpdate, keepRange } from "../common";
import { dist } from "../../sim/math";

/** Banner prism. Buffs allies within 6 u; declares a mini-Law for 300f (45f declaration).
 *  Exploit: Null Cancel during the declaration (100% + the mini-Law fails). */
export const herald: Behavior = {
  stats: () => ({ certainty: THEOREMS.herald.certainty, radius: THEOREMS.herald.radius }),
  init: (_w, a) => { a.d.buff = 10; a.d.declare = T.declareFirst; a.d.declaring = 0; },
  update(w, a, dt) {
    eliteUpdate(w, a, dt);
    const m = w.markov;
    keepRange(w, a, m.pos, T.range, THEOREMS.herald.speed, dt);
    a.d.buff -= dt;
    if (a.d.buff <= 0) {
      a.d.buff = T.buffEvery;
      for (const b of w.actors) if (b !== a && b.alive && !b.neutral && !b.boss && b.type !== "herald" && dist(a.pos, b.pos) < T.buffRadius) w.ledger.applyBuff(w, b, a, T.buffEvery + 10);
    }
    if (a.d.declaring > 0) {
      a.d.declaring -= dt;
      a.state = "telegraph";
      if (a.d.declaring <= 0) { a.d.declaring = 0; a.state = "idle"; w.law.declareMiniLaw(a, T.miniLawFrames); }
      return;
    }
    a.d.declare -= dt;
    if (a.d.declare <= 0 && w.def.heraldMiniLaws !== false) {
      a.d.declare = T.declareEvery; a.d.declaring = w.tele(T.declareFrames);
      w.emit("Telegraph", { id: a.id, kind: "declare", x: a.pos.x, z: a.pos.z, value: a.d.declaring });
    }
  },
  onOp(w, a, op, mode) {
    if (op === "null" && mode === "tap" && a.d.declaring > 0) {
      a.d.declaring = 0; a.state = "idle";
      w.emit("MiniLawFailed", { id: a.id, x: a.pos.x, z: a.pos.z });
      w.ledger.exploit(w, a, THEOREMS.herald.exploit, { kind: "exploit", label: "herald" });
      return "handled";
    }
  },
  onRemoved(w, a) { for (const b of w.actors) if (b.buffedBy === a.id) w.ledger.removeBuff(w, b); },
};
