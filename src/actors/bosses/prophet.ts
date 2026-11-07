import { PROPHET as P } from "../../data/bosses/prophet";
import type { Behavior } from "../Behavior";
import type { World } from "../../sim/World";
import type { Actor } from "../../sim/entities";
import type { ActionState } from "../../sim/MarkovController";
import { fire, keepRange, moveToward } from "../common";
import { applyStartPhase, bossPhase, fileRemaining } from "./bossCommon";
import { dirTo, fromAngle, rotate } from "../../sim/math";

export const ACTION_STATES: ActionState[] = ["q0", "q1", "q2", "q3", "step", "strike", "vector", "phase", "order", "null", "idle"];

/**
 * A literal order-k Markov chain over the player's action states (k = 1/2/3 by phase).
 * Every 30f it records the window's state, then predicts the most likely next one and pre-blocks it.
 * Idle windows have no transition: 60f of Idle stalls it and opens its core.
 */
export class MarkovChain {
  readonly counts = new Map<string, Map<ActionState, number>>();
  readonly history: ActionState[] = [];
  predictions = 0;
  correct = 0;
  lastPrediction: ActionState | null = null;
  lastProb = 0;

  observe(s: ActionState, maxOrder: number): void {
    if (this.lastPrediction) { this.predictions++; if (this.lastPrediction === s) this.correct++; }
    for (let k = 1; k <= maxOrder; k++) {
      if (this.history.length < k) break;
      const ctx = this.history.slice(-k).join(",");
      let row = this.counts.get(ctx);
      if (!row) { row = new Map(); this.counts.set(ctx, row); }
      row.set(s, (row.get(s) ?? 0) + 1);
    }
    this.history.push(s);
    if (this.history.length > 64) this.history.shift();
  }

  /** Probability distribution of the next state, backing off from order k to 1. */
  distribution(order: number): Map<ActionState, number> | null {
    for (let k = Math.min(order, this.history.length); k >= 1; k--) {
      const row = this.counts.get(this.history.slice(-k).join(","));
      if (!row) continue;
      let total = 0;
      for (const c of row.values()) total += c;
      const out = new Map<ActionState, number>();
      for (const [s, c] of row) out.set(s, c / total);
      return out;
    }
    return null;
  }

  predict(order: number): { state: ActionState; p: number } | null {
    const d = this.distribution(order);
    if (!d) { this.lastPrediction = null; return null; }
    let best: ActionState | null = null, bp = -1;
    for (const [s, p] of d) if (p > bp) { bp = p; best = s; }
    this.lastPrediction = best;
    this.lastProb = bp;
    return best ? { state: best, p: bp } : null;
  }

  probabilityOf(s: ActionState, order: number): number { return this.distribution(order)?.get(s) ?? 0; }
  get accuracy(): number { return this.predictions ? this.correct / this.predictions : 0; }
}

const chains = new WeakMap<Actor, MarkovChain>();
export function chainOf(a: Actor): MarkovChain | undefined { return chains.get(a); }

function windowState(a: Actor): ActionState {
  // priority: op > step > strike > dominant move quadrant > idle
  for (const s of ["vector", "phase", "order", "null", "step", "strike"] as ActionState[]) if (a.d[`w_${s}`]) return s;
  let best: ActionState = "idle", bc = 0;
  for (const s of ["q0", "q1", "q2", "q3"] as ActionState[]) { const c = a.d[`w_${s}`] ?? 0; if (c > bc) { bc = c; best = s; } }
  return bc >= P.window * 0.4 ? best : "idle";
}

function order(w: World): number {
  const byPhase = w.def.echo ? 1 : w.director.bossPhase;
  return Math.min(byPhase, w.diff.prophetMaxOrder);
}

export const prophet: Behavior = {
  stats: (w) => ({ certainty: w.def.echo ? P.echoCertainty : P.certainty, radius: P.radius, boss: true, armored: true }),
  init(w, a) {
    chains.set(a, new MarkovChain());
    a.d.win = P.window; a.d.idleRun = 0; a.d.volley = P.volley.every; a.d.blocked = -1;
    applyStartPhase(w, a, P.phases);
    w.ops.listeners.push((op) => {
      // Surprise is judged against the model at cast time.
      const c = chains.get(a);
      if (!c) return;
      a.d.surpriseUntil = c.probabilityOf(op, order(w)) < P.exploit.surpriseBelow ? w.frame + 120 : 0;
    });
  },
  update(w, a, dt) {
    bossPhase(w, a, P.phases);
    const m = w.markov, chain = chains.get(a)!;
    const s = m.actionState;
    a.d[`w_${s}`] = (a.d[`w_${s}`] ?? 0) + 1;
    a.d.win -= 1;
    if (a.d.win <= 0) {
      a.d.win = P.window;
      const st = windowState(a);
      for (const k of ACTION_STATES) a.d[`w_${k}`] = 0;
      if (st === "idle") {
        // No transition for Idle: it stalls.
        a.d.idleRun++;
        if (a.d.idleRun >= P.stallWindows && !a.d.stalled) { a.d.stalled = 1; w.emit("ProphetStall", { id: a.id, x: a.pos.x, z: a.pos.z }); }
      } else {
        a.d.idleRun = 0;
        if (a.d.stalled) { a.d.stalled = 0; w.emit("ProphetStall", { id: a.id, value: 0 }); }
        chain.observe(st, order(w));
      }
      if (!a.d.stalled) {
        const pred = chain.predict(order(w));
        a.d.blocked = pred ? ACTION_STATES.indexOf(pred.state) : -1;
        if (pred) prophesy(w, a, pred.state, pred.p);
      }
    }
    if (a.d.stalled) {
      if (w.def.echo) moveToward(w, a, m.pos, 3, dt, 1.2);
      return;
    }
    keepRange(w, a, m.pos, w.def.echo ? 4 : 7, P.speed, dt);
    a.d.volley -= dt;
    if (a.d.volley <= 0 && !w.def.echo) {
      a.d.volley = P.volley.every;
      const base = dirTo(a.pos, m.pos);
      for (let i = 0; i < P.volley.count; i++) fire(w, a, rotate(base, ((i - (P.volley.count - 1) / 2) * P.volley.spreadDeg * Math.PI) / 180), P.volley.speed, "prophecy", 0.42);
    }
  },
  onProjectile(w, a, p) {
    if (!p.redirected && !p.reversed) return "pass";
    hitWith(w, a, p.reversed ? "order" : "vector");
    return "handled";
  },
  onOp(w, a, op) { hitWith(w, a, op); return "handled"; },
  onStrike(w, a) { hitWith(w, a, "strike"); return "handled"; },
  onHitByBody(w, a) { hitWith(w, a, "vector"); return "handled"; },
  onRemoved(w, a) { fileRemaining(w, a); },
};

function hitWith(w: World, a: Actor, s: ActionState): void {
  const blocked = a.d.blocked >= 0 ? ACTION_STATES[a.d.blocked] : null;
  if (a.d.stalled && (w.markov.insightT > 0 || (w.def.echo && s === "strike"))) { a.d.stalled = 0; a.d.idleRun = 0; w.emit("ProphetStall", { id: a.id, value: 0 }); w.ledger.exploit(w, a, P.exploit.stillness, { kind: "exploit", label: "stillness" }); return; }
  if (blocked === s) { w.emit("OpFizzle", { kind: "prophesied", x: a.pos.x, z: a.pos.z, op: s }); return; }
  if ((a.d.surpriseUntil ?? 0) > w.frame && s !== "strike") { a.d.surpriseUntil = 0; w.ledger.exploit(w, a, P.exploit.surprise, { kind: "exploit", label: "surprise" }); return; }
  w.ledger.damage(w, a, s === "strike" ? 2 : 6, { kind: s === "strike" ? "strike" : "op" });
}

/** Pre-block: a prophecy ring where Markov is predicted to be, or a glyph over the predicted op. */
function prophesy(w: World, a: Actor, s: ActionState, p: number): void {
  const m = w.markov;
  w.emit("Prophecy", { id: a.id, kind: s, value: p, x: m.pos.x, z: m.pos.z });
  if (s === "q0" || s === "q1" || s === "q2" || s === "q3") {
    const q = Number(s[1]);
    const dir = fromAngle((q * Math.PI) / 2);
    w.spawnHazard({ kind: "prophecy", shape: "circle", pos: { x: m.pos.x + dir.x * P.ringReach, z: m.pos.z + dir.z * P.ringReach }, radius: P.ringRadius, telegraph: P.ringTelegraph, active: 10, ownerId: a.id });
  } else if (s === "step") {
    const dir = m.facing;
    w.spawnHazard({ kind: "prophecy", pos: { x: m.pos.x + dir.x * 4.5, z: m.pos.z + dir.z * 4.5 }, radius: P.ringRadius, telegraph: P.ringTelegraph, active: 10, ownerId: a.id });
  }
}
