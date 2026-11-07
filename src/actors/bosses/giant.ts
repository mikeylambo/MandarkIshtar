import { GIANT as G } from "../../data/bosses/giant";
import type { Behavior } from "../Behavior";
import type { World } from "../../sim/World";
import type { Actor } from "../../sim/entities";
import { moveToward } from "../common";
import { applyStartPhase, bossPhase, fileRemaining } from "./bossCommon";
import { dirTo, dist } from "../../sim/math";

/** Light that currently casts the Giant's shadow: the nearest live light (or the carried lantern). */
function castingLight(w: World, giant: Actor) {
  let best = null as null | { x: number; z: number }, bd = Infinity;
  for (const p of w.props) {
    if (!p.alive || p.type !== "light" || p.d.dropped) continue;
    const d = dist(p.pos, giant.pos);
    if (d < bd) { bd = d; best = p.pos; }
  }
  return best;
}

export function shadowPos(w: World, giant: Actor) {
  const light = castingLight(w, giant);
  if (!light) return { ...giant.pos };
  const dir = dirTo(light, giant.pos);
  return { x: giant.pos.x + dir.x * G.shadowLength, z: giant.pos.z + dir.z * G.shadowLength };
}

/** The Giant: body invulnerable. Stomps; P2 lights drift home + clap; P3 carries a lantern. */
export const giant: Behavior = {
  stats: () => ({ certainty: 1, radius: G.radius, boss: true, invulnerable: true, armored: true }),
  countsForClear: false,
  init(w, a) {
    a.d.stomp = 120; a.d.clap = G.clap.every;
    const s = w.spawnActor("shadow", shadowPos(w, a), { spawnFrames: 0, certainty: w.def.echo ? G.echoCertainty : G.shadowCertainty });
    s.d.giant = a.id; a.d.shadow = s.id;
    applyStartPhase(w, a, G.phases);
  },
  update(w, a, dt) {
    const s = w.actor(a.d.shadow);
    if (!s) { w.ledger.remove(w, a, "filed"); return; }
    const phase = bossPhase(w, s, G.phases);
    const m = w.markov;
    if (a.state !== "telegraph") moveToward(w, a, m.pos, G.speed, dt, 3.5);
    if (phase >= 2 && !a.d.drift) { a.d.drift = 1; for (const p of w.props) if (p.type === "light") p.d.drift = 1; }
    if (phase >= 3 && !a.d.lantern && !w.def.echo) {
      a.d.lantern = w.spawnProp("light", a.pos, { radius: 0.5, movable: false, tag: "lantern" }).id;
      w.emit("PhaseChange", { kind: "lantern", value: 3 });
    }
    const lantern = a.d.lantern ? w.prop(a.d.lantern) : undefined;
    if (lantern && !lantern.d.dropped) {
      // carried behind the Giant so the shadow falls toward Markov
      const away = dirTo(m.pos, a.pos);
      lantern.pos = { x: a.pos.x + away.x * 1.4, z: a.pos.z + away.z * 1.4 };
    } else if (lantern && lantern.d.dropped && !lantern.d.out) { lantern.d.out = 1; lantern.alive = false; w.emit("NullImplode", { x: lantern.pos.x, z: lantern.pos.z, kind: "lantern" }); }
    if (a.state === "telegraph") {
      a.stateT -= dt;
      if (a.stateT <= 0) { a.state = "idle"; w.emit("Stomp", { id: a.id, x: a.d.sx, z: a.d.sz }); }
    } else {
      a.d.stomp -= dt;
      if (a.d.stomp <= 0) {
        a.d.stomp = G.stomp.every;
        const dir = dirTo(a.pos, m.pos);
        const reach = Math.min(G.stomp.reach, dist(a.pos, m.pos));
        a.d.sx = a.pos.x + dir.x * reach; a.d.sz = a.pos.z + dir.z * reach;
        const h = w.spawnHazard({ kind: "stomp", pos: { x: a.d.sx, z: a.d.sz }, radius: G.stomp.radius, telegraph: G.stomp.telegraph, active: 8, ownerId: a.id });
        a.state = "telegraph"; a.stateT = h.telegraphT; a.d.stompHazard = h.id;
      }
    }
    if (phase >= 2 && !w.def.echo) {
      a.d.clap -= dt;
      if (a.d.clap <= 0) { a.d.clap = G.clap.every; w.spawnHazard({ kind: "clap", shape: "ring", pos: a.pos, radius: a.radius, width: 0.5, telegraph: G.clap.telegraph, active: G.clap.maxRadius / G.clap.grow, grow: G.clap.grow, ownerId: a.id }); }
    }
    s.pos = shadowPos(w, a);
  },
  onOp(w, a, op, mode) {
    const s = w.actor(a.d.shadow);
    if (!s) return "handled";
    if (op === "order" && mode === "tap" && a.state === "telegraph") {
      // Delay its stomp while its shadow falls on another hazard.
      const onGlyph = w.props.some((p) => p.alive && p.type === "hazardGlyph" && dist(p.pos, s.pos) < p.radius + s.radius * 0.6);
      const h = w.hazards.find((x) => x.id === a.d.stompHazard);
      if (h) h.telegraphT += 40;
      a.stateT += 40;
      if (onGlyph) w.ledger.exploit(w, s, G.exploit.delayStompOnHazard, { kind: "exploit", label: "giant-delay" });
      else w.ledger.damage(w, s, 6, { kind: "op", op: "order" });
      w.emit("DelayStamp", { id: a.id, x: a.pos.x, z: a.pos.z });
      return "handled";
    }
    w.ledger.damage(w, s, 6, { kind: "op", op });
    return "handled";
  },
  onSever(w, a) { const s = w.actor(a.d.shadow); if (s) w.ledger.exploit(w, s, G.exploit.severance, { kind: "exploit", label: "giant-tether" }); return "handled"; },
  onImmune(w, a) { w.emit("OpFizzle", { kind: "giantBody", x: a.pos.x, z: a.pos.z }); },
  onRemoved(w, a) { fileRemaining(w, a); },
};

/** The Giant's shadow plane: the only thing that is real. */
export const shadow: Behavior = {
  stats: () => ({ certainty: G.shadowCertainty, radius: G.shadowRadius, boss: true, armored: true }),
  passable: true,
  targetable: false,
  init() {},
  update() {},
  onRemoved(w, a) { const g = w.actor(a.d.giant); if (g) w.ledger.remove(w, g, a.defeatedBy || "qed"); },
};
