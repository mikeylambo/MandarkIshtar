import type { World } from "./World";
import type { Prop } from "./entities";
import { dirTo, dist, fromAngle } from "./math";

/**
 * Prop behavior. Sconces spit slow fireballs (the ammo of Reflection); lights drift home in
 * Giant P2; everything else is static or driven by its encounter.
 */
export function updateProp(w: World, p: Prop): void {
  if (w.status !== "playing") return;
  switch (p.type) {
    case "sconce": {
      if (p.d.off) return;
      const every = p.d.every ?? 150;
      const phase = (p.t + (p.d.offset ?? 0)) % every;
      if (phase === every - 30) w.emit("Telegraph", { id: p.id, kind: "sconce", x: p.pos.x, z: p.pos.z, value: 30 });
      if (phase === 0 && p.t > 0) {
        const m = w.markov;
        if ((p.d.range ?? 30) < dist(p.pos, m.pos)) return;
        const dir = p.d.angle !== undefined ? fromAngle((p.d.angle * Math.PI) / 180) : dirTo(p.pos, m.pos);
        const speed = p.d.speed ?? 6;
        const proj = w.spawnProjectile({ pos: { x: p.pos.x + dir.x * 0.8, z: p.pos.z + dir.z * 0.8 }, vel: { x: dir.x * speed, z: dir.z * speed }, owner: "enemy", shooterId: 0, shape: "fire", radius: 0.38, life: 600 });
        proj.origin = { ...p.pos };
        w.emit("EnemyAttack", { id: p.id, kind: "sconce", x: p.pos.x, z: p.pos.z, dx: dir.x, dz: dir.z });
      }
      return;
    }
    case "light": {
      if (p.d.drift && (p.d.slideT ?? 0) <= 0) {
        const d = dist(p.pos, p.home);
        if (d > 0.05) { const dir = dirTo(p.pos, p.home); const s = Math.min(d, 1.2 / 60); p.pos.x += dir.x * s; p.pos.z += dir.z * s; }
      }
      return;
    }
    default:
      return;
  }
}
