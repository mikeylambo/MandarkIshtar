import { KING as K } from "../../data/bosses/king";
import type { Behavior } from "../Behavior";
import type { World } from "../../sim/World";
import type { Actor } from "../../sim/entities";
import type { TheoremType } from "../../sim/types";
import { beginTelegraph, fire, keepRange } from "../common";
import { applyStartPhase, bossPhase, fileRemaining } from "./bossCommon";
import { dirTo, fromAngle, scale } from "../../sim/math";

function summon(w: World, king: Actor, types: readonly string[]): void {
  const n = Math.min(types.length, K.subjects.max - subjects(w, king).length);
  for (let i = 0; i < n; i++) {
    const p = scale(fromAngle(((i * 360) / n + 20) * Math.PI / 180), 7.5);
    const s = w.spawnActor(types[i] as TheoremType, p, { waveIndex: 50 });
    w.ledger.command(w, s, king);
  }
}
function subjects(w: World, king: Actor): Actor[] { return w.actors.filter((a) => a.alive && a.commandedBy === king.id); }

/** Commands Theorems via beams; commanded are shielded. Null Cancel / Severance frees a subject, which attacks the King.
 *  P3: alone; the crown declares kneel zones. Strip the crown → 40%. */
export const king: Behavior = {
  stats: (w) => ({ certainty: w.def.echo ? K.echoCertainty : K.certainty, radius: K.radius, boss: true, armored: true }),
  init(w, a) { a.d.cmd = 160; a.d.refill = K.subjects.refillEvery; a.d.kneel = K.kneel.every; applyStartPhase(w, a, K.phases); summon(w, a, w.def.echo ? K.subjects.echo : K.subjects.p1); },
  update(w, a, dt) {
    const phase = bossPhase(w, a, K.phases);
    const m = w.markov;
    keepRange(w, a, m.pos, 9, K.speed, dt);
    if (phase === 2 && !a.d.p2) { a.d.p2 = 1; summon(w, a, K.subjects.p2); }
    if (phase === 3 && !a.d.p3) {
      a.d.p3 = 1; a.d.crown = 1;
      for (const s of subjects(w, a)) w.ledger.remove(w, s, "dismissed");
      w.emit("PhaseChange", { kind: "crown", value: 3 });
    }
    if (phase < 3) {
      a.d.refill -= dt;
      if (a.d.refill <= 0) { a.d.refill = K.subjects.refillEvery; if (subjects(w, a).length < 3) summon(w, a, w.def.echo ? K.subjects.echo.slice(0, 2) : ["axiom", "corollary", "axiom"]); }
      if (a.state === "telegraph") { a.stateT -= dt; if (a.stateT <= 0) { for (const k of [-0.2, 0, 0.2]) fire(w, a, { x: a.aim.x + k * a.aim.z, z: a.aim.z - k * a.aim.x }, K.command.speed, "command", 0.4); a.state = "idle"; } }
      else { a.d.cmd -= dt; if (a.d.cmd <= 0) { a.d.cmd = K.command.every; beginTelegraph(w, a, K.command.telegraph, "command", dirTo(a.pos, m.pos)); } }
    } else {
      a.d.kneel -= dt;
      if (a.d.kneel <= 0) {
        a.d.kneel = K.kneel.every;
        const r = w.r("boss");
        for (let i = 0; i < K.kneel.count; i++) {
          const off = i === 0 ? { x: 0, z: 0 } : scale(fromAngle(r.range(0, Math.PI * 2)), r.range(3, 6));
          w.spawnHazard({ kind: "kneel", pos: { x: m.pos.x + off.x, z: m.pos.z + off.z }, radius: K.kneel.radius, telegraph: K.kneel.telegraph, active: 12, ownerId: a.id });
        }
      }
    }
  },
  onStrip(w, a) {
    if ((w.director.bossPhase >= 3 || (w.def.echo && subjects(w, a).length === 0)) && w.frame >= (a.d.crownBack ?? 0)) {
      a.d.crownBack = w.frame + 240;
      w.emit("PropertyPeel", { id: a.id, kind: "crown", x: a.pos.x, z: a.pos.z });
      w.ledger.exploit(w, a, K.exploit.crownStrip, { kind: "exploit", label: "crown" });
      return "handled";
    }
    w.ledger.damage(w, a, 6, { kind: "op", op: "null" });
    return "handled";
  },
  onRemoved(w, a) { fileRemaining(w, a); },
};
