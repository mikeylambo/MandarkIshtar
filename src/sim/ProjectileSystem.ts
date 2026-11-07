import { SCORING } from "../data/scoring";
import type { World } from "./World";
import type { Projectile } from "./entities";
import { angleBetween, dirTo, dist, len, norm, scale, sub } from "./math";
import { behaviorFor, hitPointOf } from "../actors/registry";

const scratch: number[] = [];

/** Owns projectiles: motion, walls, prisms, clashes and hits. */
export class ProjectileSystem {
  private orbitCd = new Map<string, number>();

  update(w: World): void {
    w.hash.clear();
    for (let i = 0; i < w.actors.length; i++) { const a = w.actors[i]!; if (a.alive) w.hash.insert(i, a.pos.x, a.pos.z, a.radius); }
    for (const p of w.projectiles) {
      if (!p.alive) continue;
      if (p.orbitT > 0) { w.ops.stepOrbitProjectile(p); this.hitActors(w, p, true); continue; }
      const dt = w.worldScale * p.localScale;
      if (p.delayT > 0) { p.delayT -= w.worldScale; if (p.delayT <= 0) p.localScale = 1; }
      if (p.phasedT > 0) p.phasedT -= dt;
      if (p.graceT > 0) p.graceT -= dt;
      if (p.reversed && p.homingTo) {
        const s = w.actor(p.homingTo);
        if (s) p.vel = scale(dirTo(p.pos, s.pos), Math.max(12, len(p.vel)));
      }
      p.pos.x += (p.vel.x * dt) / 60;
      p.pos.z += (p.vel.z * dt) / 60;
      p.history.push(p.pos);
      p.life -= dt;
      if (p.life <= 0) { this.kill(w, p, "expire"); continue; }
      if (!p.ghost && this.obstacles(w, p)) continue;
      if (this.edge(w, p)) continue;
      if (p.phasedT > 0) continue;
      if (p.owner === "markov") {
        this.prisms(w, p);
        if (p.cleanLine) w.ledger.cleanLine(w, p.pos, p.radius);
        this.clash(w, p);
        if (p.alive) this.hitActors(w, p, false);
      } else {
        const m = w.markov;
        if (dist(p.pos, m.pos) < p.radius + m.radius) {
          if (m.hit(p.shape, p.pos)) this.kill(w, p, "hitMarkov");
        }
      }
    }
  }

  private kill(w: World, p: Projectile, kind: string): void {
    p.alive = false;
    w.emit("ProjectileDie", { id: p.id, kind, x: p.pos.x, z: p.pos.z });
  }

  private obstacles(w: World, p: Projectile): boolean {
    for (const o of w.def.arena.obstacles) {
      if (Math.hypot(p.pos.x - o.x, p.pos.z - o.z) < o.r + p.radius) {
        if (w.law.reflect(p, norm(sub(p.pos, o)))) return false;
        this.kill(w, p, "wall"); return true;
      }
    }
    return false;
  }

  private edge(w: World, p: Projectile): boolean {
    const R = w.def.arena.radius;
    const d = len(p.pos);
    if (w.def.arena.edge === "void") { if (d > R + 3) { this.kill(w, p, "void"); return true; } return false; }
    if (d + p.radius < R) return false;
    if (p.ghost) { if (d > R + 4) { this.kill(w, p, "void"); return true; } return false; }
    const n = norm(p.pos);
    p.pos = scale(n, R - p.radius - 0.01);
    if (w.law.reflect(p, { x: -n.x, z: -n.z })) return false;
    w.emit("WallImpact", { id: p.id, x: p.pos.x, z: p.pos.z, kind: "projectile" });
    this.kill(w, p, "wall");
    return true;
  }

  /** Prisms refract Markov-owned projectiles: to the next prism ahead (≤50°, ≤12 u), else back to the shot's origin. */
  private prisms(w: World, p: Projectile): void {
    for (const pr of w.props) {
      if (!pr.alive || pr.type !== "prism" || p.prisms.includes(pr.id)) continue;
      if (dist(p.pos, pr.pos) > pr.radius + p.radius) continue;
      p.prisms.push(pr.id);
      p.chain++;
      w.scorer.add("bounce", SCORING.redirectBounce);
      const heading = norm(p.vel);
      let next = null as null | { x: number; z: number }, best = Infinity;
      for (const q of w.props) {
        if (!q.alive || q.type !== "prism" || p.prisms.includes(q.id)) continue;
        const d = dist(q.pos, pr.pos);
        if (d > 12) continue;
        const ang = angleBetween(sub(q.pos, pr.pos), heading);
        if (ang > (50 * Math.PI) / 180) continue;
        const s = d * (1 + ang);
        if (s < best) { best = s; next = q.pos; }
      }
      const shooter = w.actor(p.shooterId);
      const dest = next ?? (shooter ? hitPointOf(w, shooter) : p.origin);
      const speed = Math.max(len(p.vel), 18);
      p.pos = { ...pr.pos };
      p.vel = scale(dirTo(pr.pos, dest), speed);
      p.life = Math.max(p.life, 120);
      w.emit("PrismPass", { id: pr.id, x: pr.pos.x, z: pr.pos.z, value: p.prisms.length, dx: p.vel.x, dz: p.vel.z });
      return;
    }
  }

  private clash(w: World, p: Projectile): void {
    for (const q of w.projectiles) {
      if (!q.alive || q.owner !== "enemy" || q.phasedT > 0) continue;
      if (dist(p.pos, q.pos) < p.radius + q.radius) {
        q.alive = false;
        w.scorer.add("clash", SCORING.clash);
        w.emit("Clash", { x: q.pos.x, z: q.pos.z });
        if (!p.ghost && !p.cleanLine && p.shape !== "echo") { this.kill(w, p, "clash"); return; }
      }
    }
  }

  private hitActors(w: World, p: Projectile, orbit: boolean): void {
    if (p.owner !== "markov") return;
    w.hash.query(p.pos.x, p.pos.z, p.radius + 1.6, scratch);
    const cands = scratch.map((i) => w.actors[i]!);
    // Some bosses (Giant) take hits at a remote point; include them explicitly.
    for (const a of w.actors) if (a.alive && (behaviorFor(a.type).hitPoint || a.shadowed) && !cands.includes(a)) cands.push(a);
    for (const a of cands) {
      if (!a || !a.alive || a.neutral || a.phasedT > 0 || a.state === "spawn") continue;
      if (a.id === p.shooterId && p.graceT > 0) continue;
      const hp = hitPointOf(w, a);
      if (dist(hp, p.pos) > a.radius + p.radius) continue;
      if (orbit) {
        const key = `${p.id}:${a.id}`;
        if ((this.orbitCd.get(key) ?? -1) > w.frame) continue;
        this.orbitCd.set(key, w.frame + 24);
        w.emit("OrbitContact", { id: a.id, x: a.pos.x, z: a.pos.z });
        w.ledger.projectileHit(w, p, a);
        continue;
      }
      const consumed = w.ledger.projectileHit(w, p, a);
      if (consumed) { this.kill(w, p, "hit"); return; }
    }
    if (this.orbitCd.size > 512) this.orbitCd.clear();
  }
}
