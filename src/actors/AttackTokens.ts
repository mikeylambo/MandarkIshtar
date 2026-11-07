import { AI } from "../data/ai";
import type { World } from "../sim/World";
import type { Actor } from "../sim/entities";
import { dist } from "../sim/math";

/** Max N simultaneous attackers; ≥10f stagger between attacks within 4 u. */
export class AttackTokens {
  private holders = new Set<number>();
  private lastAttack: { frame: number; x: number; z: number }[] = [];
  constructor(public max: number) {}

  request(w: World, a: Actor): boolean {
    if (a.token) return true;
    if (a.boss) { a.token = true; return true; }
    if (this.holders.size >= this.max) return false;
    for (const l of this.lastAttack) if (w.frame - l.frame < AI.staggerFrames && dist(l, a.pos) < AI.staggerRadius) return false;
    this.holders.add(a.id); a.token = true;
    this.lastAttack.push({ frame: w.frame, x: a.pos.x, z: a.pos.z });
    if (this.lastAttack.length > 16) this.lastAttack.shift();
    return true;
  }
  release(a: Actor): void { this.holders.delete(a.id); a.token = false; }
  update(w: World): void {
    for (const id of this.holders) { const a = w.actors.find((x) => x.id === id); if (!a || !a.alive) this.holders.delete(id); }
  }
  get count(): number { return this.holders.size; }
}
