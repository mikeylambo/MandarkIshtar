import { LAW_TUNING as T } from "../data/laws";
import { HUBRIS } from "../data/resources";
import type { World } from "../sim/World";
import type { Actor, Projectile } from "../sim/entities";
import { dirTo, len, norm, scale } from "../sim/math";
import type { LawId, OpId, Vec } from "../sim/types";
import { SCORING } from "../data/scoring";

export type MiniLaw = (typeof T.miniLaws)[number];

/** Owns the active Law, its escalation tier, Herald mini-Laws and every Law rule hook. */
export class LawDirector {
  tier = 0;
  readonly active = new Set<string>();
  miniLaw: MiniLaw | null = null;
  miniLawT = 0;
  /** Judge P3: the ledger stops. */
  suspend = false;
  private lastOpFrame: Record<OpId, number> = { vector: -9999, phase: -9999, order: -9999, null: -9999 };
  private repeats: { at: number; pos: Vec; vel: Vec; shape: Projectile["shape"]; shooterId: number; radius: number }[] = [];

  constructor(private readonly w: World) {}

  get primary(): LawId | null { return this.w.def.law; }
  has(id: string): boolean { return this.active.has(id) || (id === "echo" && this.miniLaw === "echo") || (id === "recurrence" && this.miniLaw === "echo"); }

  init(): void {
    const w = this.w;
    if (w.def.law) this.active.add(w.def.law);
    for (const m of w.opts.lawModifiers ?? []) this.active.add(m);
    this.tier = this.computeTier();
    if (w.def.law) w.emit("LawDeclared", { kind: w.def.law, value: this.tier });
    w.ops.listeners.push((op, _mode, compound) => this.onOp(op, compound));
  }

  computeTier(): number {
    const h = this.w.markov.hubris;
    let t = this.w.diff.baseLawTier;
    if (h >= HUBRIS.tierThresholds[0]!) t++;
    if (h >= HUBRIS.tierThresholds[1]!) t++;
    return Math.min(2, t);
  }

  /** Dev/Laboratory: force a Law and tier. */
  force(law: string, tier: number): void { this.active.add(law); this.tier = tier; this.w.emit("LawTierChanged", { value: tier, kind: law }); }

  onHubrisChanged(): void {
    const t = this.computeTier();
    if (t !== this.tier) { this.tier = t; this.w.emit("LawTierChanged", { value: t, kind: this.w.def.law ?? "" }); }
  }

  update(): void {
    const w = this.w;
    if (this.miniLawT > 0) {
      this.miniLawT -= w.worldScale;
      if (this.miniLawT <= 0) { this.miniLaw = null; w.emit("MiniLaw", { kind: "end" }); }
    }
    for (let i = this.repeats.length - 1; i >= 0; i--) {
      const r = this.repeats[i]!;
      if (w.frame >= r.at) {
        this.repeats.splice(i, 1);
        const shooter = r.shooterId ? w.actor(r.shooterId) : undefined;
        if (r.shooterId && !shooter) continue;
        const p = w.spawnProjectile({ pos: shooter ? shooter.pos : r.pos, vel: r.vel, owner: "enemy", shooterId: r.shooterId, shape: r.shape, radius: r.radius, echo: true });
        w.emit("Echo", { id: p.id, x: p.pos.x, z: p.pos.z, op: "recurrence" });
      }
    }
  }

  // ---------- rule hooks ----------
  onProjectileSpawned(p: Projectile): void {
    if (p.owner !== "enemy" || p.echo) return;
    if (this.has("recurrence")) {
      const delay = T.recurrence.delayByTier[this.tier] ?? 60;
      this.repeats.push({ at: this.w.frame + delay, pos: { ...p.pos }, vel: { ...p.vel }, shape: p.shape, shooterId: p.shooterId, radius: p.radius });
    }
  }

  /** Law of Reflection: projectiles bounce off walls back toward their shooter. */
  reflect(p: Projectile, normal: Vec): boolean {
    if (!this.has("reflection")) return false;
    const max = T.reflection.returnsByTier[this.tier] ?? 1;
    if (p.bounces >= max) return false;
    p.bounces++;
    const shooter = p.shooterId ? this.w.actor(p.shooterId) : undefined;
    const dest = shooter ? shooter.pos : p.origin;
    let dir = dirTo(p.pos, dest, normal);
    if (dir.x * normal.x + dir.z * normal.z < 0.1) dir = norm({ x: normal.x + dir.x * 0.5, z: normal.z + dir.z * 0.5 });
    const speed = len(p.vel) * (1 + T.reflection.speedPerTier * this.tier);
    p.vel = scale(dir, speed);
    p.graceT = 0;
    if (p.owner === "markov") { p.chain++; this.w.scorer.add("bounce", SCORING.redirectBounce); }
    this.w.emit("WallImpact", { id: p.id, x: p.pos.x, z: p.pos.z, kind: "reflect" });
    return true;
  }

  opDamageScale(): number { return this.has("innocence") ? (T.innocence.scaleByTier[this.tier] ?? 0.5) : 1; }
  speedScale(_a: Actor): number { return this.miniLaw === "haste" ? T.hasteScale : 1; }
  projectileSpeedScale(): number { return this.has("reflection") ? 1 : 1; }
  leadSeconds(): number { return this.has("prophecy") ? T.prophecy.leadBase + T.prophecy.leadPerTier * this.tier : 0; }

  /** Law of Shadow: a shadowed Theorem's hit point is its shadow, cast away from the nearest light. */
  shadowPoint(a: Actor): Vec {
    let best: Vec | null = null, bd = Infinity;
    for (const p of this.w.props) {
      if (!p.alive || p.type !== "light") continue;
      const d = Math.hypot(p.pos.x - a.pos.x, p.pos.z - a.pos.z);
      if (d < bd) { bd = d; best = p.pos; }
    }
    if (!best) return a.pos;
    const dir = dirTo(best, a.pos);
    const l = T.shadow.length + T.shadow.lengthPerTier * this.tier;
    return { x: a.pos.x + dir.x * l, z: a.pos.z + dir.z * l };
  }

  declareMiniLaw(herald: Actor, frames: number): void {
    const w = this.w;
    const pick = w.r("law").pick(T.miniLaws);
    this.miniLaw = pick; this.miniLawT = frames;
    w.emit("MiniLaw", { id: herald.id, kind: pick, value: frames });
    if (pick === "ward") for (const a of w.hostiles()) if (!a.boss && a.id !== herald.id) w.ledger.applyBuff(w, a, herald, frames);
  }

  /** Law of Judgment: the same op twice within the window → a Sentence. */
  private onOp(op: OpId, compound: string | null): void {
    const w = this.w;
    if (!this.has("judgment") || compound || this.suspend) { this.lastOpFrame[op] = w.frame; return; }
    const win = T.judgment.windowByTier[this.tier] ?? 300;
    if (w.frame - this.lastOpFrame[op] <= win) this.sentence(op);
    this.lastOpFrame[op] = w.frame;
  }

  clearLedger(): void { for (const k of Object.keys(this.lastOpFrame) as OpId[]) this.lastOpFrame[k] = -9999; }

  sentence(op: string): void {
    const w = this.w;
    if (this.suspend) return;
    const m = w.markov;
    w.spawnHazard({ kind: `sentence-${op}`, pos: m.pos, radius: T.judgment.radius + T.judgment.radiusPerTier * this.tier, telegraph: T.judgment.telegraph, active: 10 });
    w.emit("Sentence", { op, x: m.pos.x, z: m.pos.z });
  }
}
