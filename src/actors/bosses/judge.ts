import { JUDGE as J } from "../../data/bosses/judge";
import type { Behavior } from "../Behavior";
import type { World } from "../../sim/World";
import type { Actor } from "../../sim/entities";
import { applyStartPhase, bossPhase, fileRemaining } from "./bossCommon";
import { dirTo, scale } from "../../sim/math";

/** Keeps a ledger: the same op or compound twice within 300f → Sentence. Morning bell every 600f clears it.
 *  Exploit: 3 different ops in a row on it → 15%; 3 different compounds → 30%. P3 <20%: only defends; a dawn shaft appears. */
export const judge: Behavior = {
  stats: (w) => ({ certainty: w.def.echo ? J.echoCertainty : J.certainty, radius: J.radius, boss: true, armored: true, immovable: true }),
  init(w, a) {
    a.d.bell = J.bellEvery; a.d.gavel = 150; a.d.scales = J.scales.every;
    a.d.s0 = 0; a.d.s1 = 0; a.d.s2 = 0; a.d.c0 = 0; a.d.c1 = 0; a.d.c2 = 0;
    applyStartPhase(w, a, J.phases);
    w.ops.listeners.push((op, mode, compound, target) => onLedger(w, a, op, mode, compound, target?.kind === "actor" && target.id === a.id));
  },
  update(w, a, dt) {
    const phase = bossPhase(w, a, J.phases);
    const m = w.markov;
    a.d.bell -= dt;
    if (a.d.bell <= 0) { a.d.bell = J.bellEvery; a.d.lastStrikeKind = 0; w.law.clearLedger(); w.emit("MorningBell", { x: 0, z: 0 }); }
    if (phase >= 3 && !w.def.echo) {
      if (!a.d.dawn) { a.d.dawn = 1; w.law.suspend = true; w.spawnProp("dawnShaft", { x: 0, z: -6 }, { radius: 1.5, tag: "dawn" }); w.emit("PhaseChange", { kind: "dawnShaft", value: 3 }); }
      return;
    }
    a.d.gavel -= dt;
    if (a.d.gavel <= 0) { a.d.gavel = J.gavel.every / (phase >= 2 ? 1.3 : 1); w.spawnHazard({ kind: "gavel", pos: m.pos, radius: J.gavel.radius, telegraph: J.gavel.telegraph, active: 8, ownerId: a.id }); }
    if (!w.def.echo) {
      a.d.scales -= dt;
      if (a.d.scales <= 0) {
        a.d.scales = J.scales.every;
        const d = dirTo(a.pos, m.pos);
        w.spawnHazard({ kind: "scales", shape: "line", pos: a.pos, end: { x: a.pos.x + d.x * J.scales.length, z: a.pos.z + d.z * J.scales.length }, width: J.scales.width, telegraph: J.scales.telegraph, active: 10, ownerId: a.id });
        if (phase >= 2) { const e = { x: -d.z, z: d.x }; w.spawnHazard({ kind: "scales", shape: "line", pos: { x: a.pos.x - e.x * 7, z: a.pos.z - e.z * 7 }, end: { x: a.pos.x + e.x * 7, z: a.pos.z + e.z * 7 }, width: J.scales.width, telegraph: J.scales.telegraph, active: 10, ownerId: a.id }); }
      }
    }
    void scale;
  },
  onOp(w, a) { w.ledger.damage(w, a, 6, { kind: "op" }); return "handled"; },
  onStrike(w, a) {
    if (!w.def.echo) return;
    // Echo (no ops left): plain Strike vs Step-Strike are different acts; repeating one is punished.
    const kind = w.frame - w.markov.lastStepFrame < 30 ? 2 : 1;
    const prev = a.d.lastStrikeKind ?? 0;
    w.ledger.damage(w, a, 2, { kind: "strike" });
    if (prev && prev === kind && w.frame - (a.d.lastStrikeFrame ?? -999) < J.ledgerWindow) w.law.sentence("strike");
    else if (prev && prev !== kind) w.ledger.exploit(w, a, J.exploit.echoVaried, { kind: "exploit", label: "variety" });
    a.d.lastStrikeKind = kind; a.d.lastStrikeFrame = w.frame;
    return "handled";
  },
  onRemoved(w, a) { w.law.suspend = false; fileRemaining(w, a); },
};

const OP_CODE = { vector: 1, phase: 2, order: 3, null: 4 } as const;
const COMPOUND_CODES = ["ghostLance", "passingTurn", "recurrence", "slingshot", "cleanLine", "unanchor", "echo", "fold", "voidStep", "severance", "delayedErase", "unwind"];

function onLedger(w: World, a: Actor, op: keyof typeof OP_CODE, _mode: string, compound: string | null, onJudge: boolean): void {
  if (!a.alive) return;
  // Repeated compounds are judged too (the Law handles repeated single ops).
  if (compound && !w.law.suspend) {
    const k = `cmp_${compound}`;
    if (w.frame - (a.d[k] ?? -9999) <= J.ledgerWindow) w.law.sentence(compound);
    a.d[k] = w.frame;
  }
  if (!onJudge) return;
  if (compound) {
    const c = COMPOUND_CODES.indexOf(compound) + 1;
    a.d.c0 = a.d.c1; a.d.c1 = a.d.c2; a.d.c2 = c;
    if (a.d.c0 && a.d.c0 !== a.d.c1 && a.d.c1 !== a.d.c2 && a.d.c0 !== a.d.c2) { a.d.c0 = a.d.c1 = a.d.c2 = 0; w.ledger.exploit(w, a, J.exploit.threeCompounds, { kind: "exploit", label: "three-compounds" }); }
    return;
  }
  a.d.s0 = a.d.s1; a.d.s1 = a.d.s2; a.d.s2 = OP_CODE[op];
  if (a.d.s0 && a.d.s0 !== a.d.s1 && a.d.s1 !== a.d.s2 && a.d.s0 !== a.d.s2) { a.d.s0 = a.d.s1 = a.d.s2 = 0; w.ledger.exploit(w, a, J.exploit.threeOps, { kind: "exploit", label: "three-ops" }); }
}
