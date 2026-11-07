import { CHILD as C } from "../../data/bosses/child";
import type { Behavior } from "../Behavior";
import type { World } from "../../sim/World";
import type { Actor } from "../../sim/entities";
import { dirTo, dist, lerp } from "../../sim/math";

/** Radius of ground that still holds, centered on the Child. */
export function holdRadius(w: World, a: Actor): number {
  const t = Math.min(1, (a.age ?? 0) / C.holdShrinkFrames);
  return lerp(C.holdStart, C.holdEnd, t);
}

/**
 * Can't be harmed, Vectored, Ordered or Nulled ("it won't hold still to be measured").
 * Solve: stop attacking and follow it (≤ 3 u). Any op or Strike pauses the progress meter.
 */
export const child: Behavior = {
  stats: () => ({ certainty: 1, radius: 0.35, boss: true, invulnerable: true }),
  countsForClear: false,
  passable: true,
  init(w, a) {
    a.d.wp = 1; a.d.progress = 0; a.d.pause = 0; a.d.away = 0; a.d.skip = C.skipEvery;
    a.d.goal = w.def.echo ? C.echoDuration : C.duration;
    w.ops.listeners.push(() => { a.d.pause = C.opPause; w.flags.aggroUntil = w.frame + C.aggroFrames; });
    w.director.scripted = true;
  },
  update(w, a, dt) {
    const m = w.markov;
    // walk the path, skipping
    a.d.skip -= dt;
    if (a.d.skip <= -C.skipPause) a.d.skip = C.skipEvery;
    if (a.d.skip > 0) {
      const path = C.path;
      const wp = path[a.d.wp % path.length]!;
      const target = { x: wp[0], z: wp[1] };
      const d = dist(a.pos, target);
      const step = (C.speed * dt) / 60;
      if (d <= step) a.d.wp++;
      else { const dir = dirTo(a.pos, target); a.pos.x += dir.x * step; a.pos.z += dir.z * step; a.facing = dir; }
    }
    w.emit("ChildProgress", { value: a.d.progress / a.d.goal });
    // Strike also counts as attacking.
    if (m.state === "strike" && m.stateT === 1) { a.d.pause = C.opPause; w.flags.aggroUntil = w.frame + C.aggroFrames; }
    const near = dist(a.pos, m.pos) <= C.followRadius;
    if (a.d.pause > 0) a.d.pause -= 1;
    else if (near) a.d.progress += 1;
    if (near) a.d.away = 0; else a.d.away += 1;
    // ground that doesn't hold
    const fell = dist(a.pos, m.pos) > holdRadius(w, a);
    if (a.d.away >= C.leaveLimit || fell) {
      a.d.away = 0;
      w.emit("Collapse", { x: m.pos.x, z: m.pos.z });
      const back = dirTo(a.pos, m.pos);
      m.hit("collapse", { x: m.pos.x + back.x, z: m.pos.z + back.z });
      m.setPos({ x: a.pos.x + back.x * 1.5, z: a.pos.z + back.z * 1.5 });
    }
    if (a.d.progress >= a.d.goal && !a.d.done) {
      a.d.done = 1;
      w.emit("Bark", { kind: "childHand" });
      for (const o of w.actors) if (o !== a && o.alive) w.ledger.remove(w, o, "filed");
      w.director.complete();
    }
  },
  onOp(w, a) { w.emit("ChildGiggle", { x: a.pos.x, z: a.pos.z }); return "handled"; },
  onCompound(w, a) { w.emit("ChildGiggle", { x: a.pos.x, z: a.pos.z }); return "handled"; },
  onStrike(w, a) { w.emit("ChildGiggle", { x: a.pos.x, z: a.pos.z }); return "handled"; },
  onProjectile(w, a) { w.emit("ChildGiggle", { x: a.pos.x, z: a.pos.z }); return "pass"; },
  onHitByBody() { return "handled"; },
  onImmune(w, a) { w.emit("ChildGiggle", { x: a.pos.x, z: a.pos.z }); },
  onRingOut() { return "handled"; },
};
