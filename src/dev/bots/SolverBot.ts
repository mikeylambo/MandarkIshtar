import type { World } from "../../sim/World";
import type { Actor, Projectile } from "../../sim/entities";
import { add, angleBetween, dirTo, dist, fromAngle, len, norm, rotate, scale, sub } from "../../sim/math";
import { NO_INPUT, type InputFrame, type OpId, type Vec } from "../../sim/types";
import { FOCUS } from "../../data/resources";
import { BotKit, aimTo, currentDanger, enemies, hostileProjectiles, hp, nearest, prismsOf, safestMove, timeToImpact, type Bot } from "./BotKit";
import { shadowPos } from "../../actors/bosses/giant";

const CATCH = 3.4;

/**
 * Solver bot: plays every encounter through semantic input only, applying each enemy's principle
 * ("redirect Axiom toward nearest enemy", "push fireball through prisms", "stillness vs Prophet", "follow Child", …).
 */
export class SolverBot implements Bot {
  name = "solver";
  readonly kit = new BotKit();
  private stuck = 0;
  private stuckKey = "";
  private fallbackUntil = 0;
  private spot: Vec | null = null;
  private lastGiantDelay = -9999;
  private spotFrame = -999;
  stats = { dodges: 0, steps: 0, qedAttempts: 0 };

  next(w: World): InputFrame {
    const m = w.markov;
    if (w.status !== "playing") return NO_INPUT;
    if (w.def.boss === "ishtar" && w.flags.ishtarPhase === 3) { this.kit.clear(); return NO_INPUT; }
    if (w.def.boss === "ishtar" && (w.flags.ishtarPhase ?? 0) >= 4) return NO_INPUT;
    if (m.state === "frozen" || m.state === "locked") return NO_INPUT;

    // The Giant's principle beats dodging: Delay a stomp whose shadow lies on a glyph (it also buys 40f to step out).
    const boss = w.director.boss;
    if (boss?.type === "giant" && boss.state === "telegraph" && w.frame - this.lastGiantDelay > 90 && !this.kit.label.startsWith("tap") && this.can(w, "order") && dist(boss.pos, m.pos) < 13) {
      const sh = w.actor(boss.d.shadow);
      if (sh && w.props.some((q) => q.alive && q.type === "hazardGlyph" && dist(q.pos, sh.pos) < q.radius + sh.radius * 0.6)) {
        this.kit.clear(); this.kit.tap("order", aimTo(w, boss.pos), null, w); this.lastGiantDelay = w.frame;
        return this.kit.pop()!;
      }
    }
    const dangerNow = currentDanger(w);
    const holding = this.kit.label.startsWith("hold");
    // Short committed inputs (taps, strikes, steps) always finish so a tap is never turned into a hold.
    const committed = this.kit.busy && (this.kit.label.startsWith("tap") || this.kit.label === "strike" || this.kit.label === "step");
    if (committed) return this.kit.pop()!;
    if (dangerNow > 2.5 && !(holding && !this.immediate(w))) {
      const ev = this.evade(w);
      if (ev) return ev;
    }
    const q = this.kit.pop();
    if (q) return q;
    this.plan(w);
    return this.kit.pop() ?? BotKit.frame(null, null);
  }

  // ---------------- evasion ----------------
  private evade(w: World): InputFrame | null {
    const m = w.markov;
    // explicit escape from the most urgent shot: sidestep off its line
    let prefer: Vec | null = null, urgent = Infinity;
    for (const p of hostileProjectiles(w)) {
      if (dist(p.pos, m.pos) > 7) continue;
      const t = timeToImpact(p, m.pos, m.radius + 0.5);
      if (t >= urgent || t > 28) continue;
      urgent = t;
      const v = norm(p.vel);
      const rel = sub(m.pos, p.pos);
      const sgn = rel.x * v.z - rel.z * v.x >= 0 ? 1 : -1;
      prefer = { x: v.z * sgn, z: -v.x * sgn };
    }
    const safe = safestMove(w, prefer, prefer ? 3 : 0.15);
    this.kit.clear();
    this.stats.dodges++;
    // redirect an imminent projectile instead of dodging when we can
    const p = this.incoming(w);
    const boss = w.director.boss;
    const mirrorP3 = boss?.type === "mirror" && w.director.bossPhase >= 3 && w.frame - (w.ops.useFrames.vector.at(-1) ?? -9999) < 640;
    if (p && !mirrorP3 && this.can(w, "vector") && timeToImpact(p, m.pos, m.radius + 0.4) > 3) {
      const t = this.redirectTarget(w, p);
      if (t) { this.kit.tap("vector", dirTo(p.pos, t), null, w); return this.kit.pop(); }
    }
    const imminent = safe.risk > 4 && this.immediate(w);
    // Large area hazards (stomps, claps, waves): Phase makes Markov untouchable.
    const bigHazard = w.hazards.some((h) => h.alive && !h.spent && h.telegraphT < 14 && (h.radius >= 2.5 || h.grow > 0) && w.hazardHits({ ...h, telegraphT: 0, radius: h.radius + h.grow * 14 }, m.pos, m.radius + 0.4));
    if (bigHazard && !m.spectral && m.regalia.has("phase") && m.focus >= FOCUS.cost.phase && (m.state === "idle" || m.state === "opRecovery")) {
      this.kit.tap("phase", m.facing, safe.dir, w);
      return this.kit.pop();
    }
    if (imminent && m.regalia.has("step") && m.stepCharges > 0 && safe.dir && m.state !== "step") {
      this.stats.steps++;
      this.kit.step(safe.dir);
      return this.kit.pop();
    }
    if (!m.regalia.has("step") && m.regalia.has("phase") && imminent && m.focus >= FOCUS.cost.phase && !m.spectral) {
      this.kit.tap("phase", m.facing, safe.dir, w);
      return this.kit.pop();
    }
    return BotKit.frame(safe.dir, null);
  }

  private immediate(w: World): boolean {
    const m = w.markov;
    for (const p of hostileProjectiles(w)) if (timeToImpact(p, m.pos, m.radius + 0.3) < 9) return true;
    for (const h of w.hazards) if (h.alive && !h.spent && h.telegraphT < 9 && w.hazardHits({ ...h, telegraphT: 0 }, m.pos, m.radius + 0.2)) return true;
    for (const a of w.actors) if (a.alive && a.type === "axiom" && a.state === "act" && dist(a.pos, m.pos) < 2.2) return true;
    return false;
  }

  private incoming(w: World): Projectile | undefined {
    const m = w.markov;
    let best: Projectile | undefined, bt = Infinity;
    for (const p of hostileProjectiles(w)) {
      if (dist(p.pos, m.pos) > CATCH) continue;
      const t = timeToImpact(p, m.pos, m.radius + 1.0);
      if (t < bt) { bt = t; best = p; }
    }
    return best;
  }

  // ---------------- utilities ----------------
  can(w: World, op: OpId, extra = 0): boolean {
    const m = w.markov;
    if (!m.regalia.has(op)) return false;
    if (m.focus < FOCUS.cost[op] + extra && !w.opts.infiniteFocus) return false;
    if (m.state !== "idle" && m.state !== "opRecovery") return false;
    if (w.law.has("judgment") && w.frame - (this.kit.lastOp[op] ?? -9999) < 310 && w.def.boss !== "judge") return false;
    return true;
  }

  private moveToward(w: World, target: Vec, stopAt = 0.3): InputFrame {
    const m = w.markov;
    const d = dist(m.pos, target);
    if (d <= stopAt) return BotKit.frame(null, null);
    const want = dirTo(m.pos, target);
    const mag = Math.min(1, d / 1.2);
    const safe = safestMove(w, want, 2.5);
    const dir = safe.risk > 1.5 && safe.dir ? safe.dir : want;
    return BotKit.frame(scale(dir, mag), null);
  }

  private moveFrames(w: World, target: Vec, n = 1, stopAt = 0.3): void {
    const f = this.moveToward(w, target, stopAt);
    this.kit.push({ label: "move", frames: Array.from({ length: n }, () => f) });
  }

  /** Best enemy to send a projectile into (exploit-aware). */
  redirectTarget(w: World, p: Projectile): Vec | null {
    const boss = w.director.boss;
    const shooter = w.actor(p.shooterId);
    if (shooter && (shooter.type === "oracle") && shooter.alive) return hp(w, shooter);
    if (boss?.type === "giant") { return shadowPos(w, boss); }
    if (boss?.type === "mirror") return boss.pos;
    if (boss?.type === "flame") { const c = this.bestChainFrom(w, p.pos); return c && c.count >= this.flameNeed(w) ? c.first : null; }
    if (boss?.type === "door") return boss.pos;
    if (boss?.type === "child") return null;
    const es = enemies(w).filter((a) => !a.invulnerable && a.state !== "broken" && !(a.type === "variable" && a.spectral));
    if (!es.length) return null;
    // prefer the shooter for its own reflection, else the most-damaged target nearby
    const scored = es.map((a) => ({ a, s: dist(hp(w, a), p.pos) + (a.commandedBy ? 6 : 0) + (a.certainty / a.maxCertainty) * 3 - (a.type === "paradox" ? 0 : 0) }));
    scored.sort((x, y) => x.s - y.s);
    return hp(w, scored[0]!.a);
  }

  // ---------------- planning ----------------
  private plan(w: World): void {
    const boss = w.director.boss;
    switch (boss?.type ?? "") {
      case "door": return this.planDoor(w, boss!);
      case "flame": if (this.planFlame(w, boss!)) return; break;
      case "giant": if (this.planGiant(w, boss!)) return; break;
      case "mirror": if (this.planMirror(w, boss!)) return; break;
      case "king": if (this.planKing(w, boss!)) return; break;
      case "judge": if (this.planJudge(w, boss!)) return; break;
      case "prophet": if (this.planProphet(w, boss!)) return; break;
      case "child": return this.planChild(w, boss!);
      case "ishtar": return this.planIshtar(w);
    }
    if (w.def.kind === "hub") return;
    this.planGeneric(w);
  }

  private qed(w: World): boolean {
    const m = w.markov;
    const broken = w.actors.filter((a) => a.alive && a.state === "broken");
    const b = nearest(broken, m.pos);
    if (!b) return false;
    if (!m.regalia.has("strike")) return false;
    const d = dist(b.pos, m.pos) - b.radius;
    if (d <= 2.4) { this.stats.qedAttempts++; this.kit.strike(aimTo(w, b.pos)); return true; }
    if (b.brokenT > 8) { this.moveFrames(w, b.pos, 3, 1.2); return true; }
    return false;
  }

  private planGeneric(w: World): void {
    const m = w.markov;
    if (this.qed(w)) return;
    const es = enemies(w);
    if (!es.length) { this.kit.wait(4); return; }
    // incoming projectile → redirect
    const p = this.incoming(w);
    if (p && this.can(w, "vector")) {
      const t = this.redirectTarget(w, p);
      if (t) { this.kit.tap("vector", dirTo(p.pos, t), null, w); return; }
    }
    if (w.frame < this.fallbackUntil) return this.planStrike(w, es);

    // Herald declaring → Null Cancel
    const herald = es.find((a) => a.type === "herald" && a.d.declaring > 6 && dist(a.pos, m.pos) < 13);
    if (herald && this.can(w, "null")) { this.kit.tap("null", aimTo(w, herald.pos), null, w); return; }
    // commanded subjects → free them
    const commanded = nearest(es.filter((a) => a.commandedBy && dist(a.pos, m.pos) < 12), m.pos);
    if (commanded && this.can(w, "null")) { this.kit.tap("null", aimTo(w, commanded.pos), null, w); return; }
    // Iterator about to fire → Order Reverse its volley
    const iter = es.find((a) => a.type === "iterator" && a.state === "telegraph" && a.stateT <= 16 && dist(a.pos, m.pos) < 11);
    if (iter && this.can(w, "order")) { this.kit.hold("order", aimTo(w, iter.pos), 22, w); return; }
    // Variable spectral → Phase and pass through it
    const vr = nearest(es.filter((a) => a.type === "variable" && a.spectral && a.d.swap > 50 && dist(a.pos, m.pos) < 7), m.pos);
    if (vr && (m.spectral || this.can(w, "phase"))) {
      if (!m.spectral) this.kit.tap("phase", aimTo(w, vr.pos), aimTo(w, vr.pos), w);
      const f = BotKit.frame(aimTo(w, vr.pos), null);
      this.kit.push({ label: "phasePass", frames: Array.from({ length: 30 }, () => f) });
      return;
    }
    // Paradox pair → Severance (Null → Phase)
    const px = nearest(es.filter((a) => a.type === "paradox" && a.linkId && dist(a.pos, m.pos) < 11), m.pos);
    if (px && this.can(w, "null", 14) && m.regalia.has("phase")) { this.kit.compound("null", "phase", aimTo(w, px.pos), undefined, false, w); return; }
    // Constant → Unanchor (Null hold → Vector) toward another enemy
    const cn = nearest(es.filter((a) => a.type === "constant" && dist(a.pos, m.pos) < 9), m.pos);
    if (cn && this.can(w, "null", 10) && m.regalia.has("vector")) {
      const other = nearest(es.filter((a) => a !== cn && !a.invulnerable), cn.pos);
      const dest = other ? hp(w, other) : add(cn.pos, scale(dirTo(m.pos, cn.pos), 10));
      this.kit.compound("null", "vector", aimTo(w, cn.pos), dirTo(cn.pos, dest), true, w);
      return;
    }
    // Line-up push: send a body into another enemy (or off a void edge)
    if (this.can(w, "vector") && this.planPush(w, es)) return;
    this.planStrike(w, es);
  }

  private planPush(w: World, es: Actor[]): boolean {
    const m = w.markov;
    const pushable = es.filter((a) => !a.armored && !a.boss && !a.invulnerable && a.state !== "broken" && !(a.type === "variable" && a.spectral) && a.thrownT <= 0 && !a.commandedBy);
    const x = nearest(pushable, m.pos);
    if (!x) return false;
    let dest: Vec | null = null;
    const others = es.filter((a) => a !== x && !(a.type === "variable" && a.spectral));
    const y = nearest(others, x.pos);
    const R = w.def.arena.radius;
    if (w.def.arena.edge === "void" && (len(x.pos) > R - 5 || !y)) dest = scale(norm(x.pos), R + 6);
    else if (y) dest = hp(w, y);
    else dest = scale(norm(sub(x.pos, m.pos)), R + 4);
    const dir = dirTo(x.pos, dest);
    const P = sub(x.pos, scale(dir, 2.0));
    const key = `push${x.id}`;
    this.trackStuck(w, key);
    const toX = sub(x.pos, m.pos);
    const aligned = angleBetween(toX, dir) < 0.35 && len(toX) < 4.2;
    if (aligned) { this.kit.tap("vector", dir, null, w); return true; }
    this.moveFrames(w, P, 4, 0.4);
    return true;
  }

  private planStrike(w: World, es: Actor[]): void {
    const m = w.markov;
    const t = nearest(es.filter((a) => !a.invulnerable && !(a.type === "variable" && a.spectral) && !a.commandedBy), m.pos) ?? nearest(es, m.pos);
    if (!t) { this.kit.wait(3); return; }
    const tp = hp(w, t);
    if (dist(tp, m.pos) - t.radius < 1.5 && m.regalia.has("strike") && !m.spectral) { this.kit.strike(aimTo(w, tp)); return; }
    this.moveFrames(w, tp, 4, 1.0);
  }

  private trackStuck(w: World, key: string): void {
    if (key === this.stuckKey) { if (++this.stuck > 70) { this.stuck = 0; this.fallbackUntil = w.frame + 150; } }
    else { this.stuckKey = key; this.stuck = 0; }
  }

  // ---------------- cold open ----------------
  private planDoor(w: World, door: Actor): void {
    const m = w.markov;
    if (this.qed(w)) return;
    const p = this.incoming(w);
    if (p) { this.kit.tap("vector", dirTo(p.pos, door.pos), null, w); return; }
    if (!door.d.struck) {
      if (dist(m.pos, door.pos) - door.radius > 1.2) { this.moveFrames(w, door.pos, 3, door.radius + 1.0); return; }
      this.kit.strike(aimTo(w, door.pos));
      return;
    }
    // wait where the fireball will reach us with the door behind it
    const spot = { x: -1.5, z: 0.5 };
    if (dist(m.pos, spot) > 0.6) { this.moveFrames(w, spot, 2, 0.4); return; }
    this.kit.wait(2);
  }

  // ---------------- The Flame ----------------
  flameNeed(w: World): number { return w.def.echo ? 1 : w.director.bossPhase >= 3 ? 3 : 1; }

  /** Simulate the prism rule for a shot leaving `from` toward each prism; return the best. */
  bestChainFrom(w: World, from: Vec): { count: number; first: Vec } | null {
    let best: { count: number; first: Vec } | null = null;
    for (const pr of prismsOf(w)) {
      const c = this.chainCount(w, from, pr.id);
      if (c > 0 && (!best || c > best.count)) best = { count: c, first: pr.pos };
    }
    return best;
  }

  chainCount(w: World, from: Vec, firstId: number): number {
    const prisms = prismsOf(w);
    const visited: number[] = [];
    let cur = prisms.find((p) => p.id === firstId)!;
    // the first leg must not be intercepted by a nearer prism
    for (const q of prisms) {
      if (q === cur) continue;
      const d1 = dist(from, q.pos);
      if (d1 < dist(from, cur.pos) && angleBetween(sub(q.pos, from), sub(cur.pos, from)) < 0.08) return 0;
    }
    let heading = dirTo(from, cur.pos);
    for (let i = 0; i < 6; i++) {
      visited.push(cur.id);
      let next = null as null | typeof cur, bs = Infinity;
      for (const q of prisms) {
        if (visited.includes(q.id)) continue;
        const d = dist(q.pos, cur.pos);
        if (d > 12) continue;
        const ang = angleBetween(sub(q.pos, cur.pos), heading);
        if (ang > (50 * Math.PI) / 180) continue;
        const s = d * (1 + ang);
        if (s < bs) { bs = s; next = q; }
      }
      if (!next) break;
      heading = dirTo(cur.pos, next.pos);
      cur = next;
    }
    return visited.length;
  }

  private planFlame(w: World, flame: Actor): boolean {
    const m = w.markov;
    if (this.qed(w)) return true;
    const need = this.flameNeed(w);
    const p = this.incoming(w);
    if (p && this.can(w, "vector")) {
      const c = this.bestChainFrom(w, p.pos);
      if (c && c.count >= need) { this.kit.tap("vector", dirTo(p.pos, c.first), null, w); return true; }
    }
    // ember axioms: push into each other / walls (never into the Flame: pride feeds on itself)
    const embers = enemies(w).filter((a) => a.type === "axiom");
    if (embers.length && this.can(w, "vector")) {
      const x = nearest(embers, m.pos)!;
      if (dist(x.pos, m.pos) < 5) {
        const away = norm(sub(x.pos, flame.pos));
        const dir = embers.length > 1 ? dirTo(x.pos, nearest(embers.filter((e) => e !== x), x.pos)!.pos) : away;
        const toX = sub(x.pos, m.pos);
        if (angleBetween(toX, dir) < 0.4 && len(toX) < 4) { this.kit.tap("vector", dir, null, w); return true; }
      }
    }
    // stand where a fireball arriving from the Flame can be sent through a good chain
    if (w.frame - this.spotFrame > 90 || !this.spot) {
      this.spotFrame = w.frame;
      let best: Vec | null = null, bc = -1;
      for (let i = 0; i < 16; i++) {
        const s = scale(fromAngle((i * Math.PI) / 8), 8.5);
        const c = this.bestChainFrom(w, s)?.count ?? 0;
        const sc = c * 10 - dist(s, m.pos) * 0.2;
        if (sc > bc) { bc = sc; best = s; }
      }
      this.spot = best;
      // P3: if no spot yields 3, reposition a prism to extend the best chain
      if (need >= 3 && bc < 30 && this.can(w, "vector")) this.spot = this.prismFix(w) ?? best;
    }
    if (this.spot && dist(this.spot, m.pos) > 0.6) { this.moveFrames(w, this.spot, 4, 0.5); return true; }
    if (this.spot && this.pendingPrism) {
      const pr = w.prop(this.pendingPrism.id);
      if (pr && this.can(w, "vector")) {
        const dir = dirTo(pr.pos, this.pendingPrism.dest);
        if (dist(pr.pos, this.pendingPrism.dest) < 1.2) { this.pendingPrism = null; this.spotFrame = -999; return true; }
        this.kit.tap("vector", dir, null, w);
        this.spotFrame = -999;
        return true;
      }
      this.pendingPrism = null;
    }
    this.kit.wait(3);
    return true;
  }

  private pendingPrism: { id: number; dest: Vec } | null = null;
  /** Choose a prism to push so that a 3-chain exists; returns the line-up spot. */
  private prismFix(w: World): Vec | null {
    const prisms = prismsOf(w);
    if (prisms.length < 3) return null;
    // Arrange: A at (0,-8)-ish route. Pick the two prisms nearest the line and place the third 7 u beyond B along A→B.
    const flame = w.director.boss!;
    let bestPlan: { id: number; dest: Vec } | null = null, bd = Infinity;
    for (const a of prisms) for (const b of prisms) {
      if (a === b || dist(a.pos, b.pos) > 11) continue;
      const h = dirTo(a.pos, b.pos);
      for (const sgn of [0.35, -0.35]) {
        const dest = add(b.pos, scale(rotate(h, sgn), 6.5));
        if (len(dest) > w.def.arena.radius - 2 || dist(dest, flame.pos) < 3) continue;
        for (const c of prisms) {
          if (c === a || c === b) continue;
          const d = dist(c.pos, dest);
          if (d < bd) { bd = d; bestPlan = { id: c.id, dest }; }
        }
      }
    }
    if (!bestPlan) return null;
    this.pendingPrism = bestPlan;
    const pr = w.prop(bestPlan.id)!;
    return sub(pr.pos, scale(dirTo(pr.pos, bestPlan.dest), 1.6));
  }

  // ---------------- The Giant ----------------
  private planGiant(w: World, giant: Actor): boolean {
    const m = w.markov;
    if (this.qed(w)) return true;
    const s = w.actor(giant.d.shadow);
    if (!s) return false;
    const lantern = giant.d.lantern ? w.prop(giant.d.lantern) : undefined;
    if (lantern && !lantern.d.dropped && this.can(w, "null") && dist(lantern.pos, m.pos) < 12) { this.kit.tap("null", aimTo(w, lantern.pos), null, w); return true; }
    const p = this.incoming(w);
    if (p && this.can(w, "vector")) { this.kit.tap("vector", dirTo(p.pos, s.pos), null, w); return true; }
    if (giant.state === "telegraph" && this.can(w, "order") && dist(giant.pos, m.pos) < 12) {
      const onGlyph = w.props.some((q) => q.alive && q.type === "hazardGlyph" && dist(q.pos, s.pos) < q.radius + s.radius * 0.6);
      if (onGlyph) { this.kit.tap("order", aimTo(w, giant.pos), null, w); return true; }
    }
    // Set up the principle: Giant 3.2 u from a glyph, a light between it and us, so its shadow lies on the glyph.
    if (!w.def.echo && !(lantern && !lantern.d.dropped) && m.regalia.has("vector") && m.regalia.has("order") && this.planGiantGlyph(w, giant, s)) return true;
    // stand in the shadow and strike it (Phase if a stomp is coming)
    if (dist(s.pos, m.pos) > 1.6) { this.moveFrames(w, s.pos, 3, 1.0); return true; }
    if (m.regalia.has("strike") && !m.spectral) { this.kit.strike(aimTo(w, s.pos)); return true; }
    this.kit.wait(2);
    return true;
  }

  /**
   * Choreograph the Giant's glyph exploit. The shadow always lies 3.2 u from the Giant, away from the nearest light,
   * so: find a glyph 1.4–5 u from the Giant, put a light on the Giant's far side from it, wait for the stomp, Delay it.
   */
  private planGiantGlyph(w: World, giant: Actor, shadow: Actor): boolean {
    const m = w.markov;
    if (m.focus < 45 || giant.state === "telegraph") return false;
    const glyphs = w.props.filter((q) => q.alive && q.type === "hazardGlyph");
    const G = nearest(glyphs, giant.pos);
    if (!G) return false;
    const away = norm(sub(giant.pos, G.pos), { x: 0, z: 1 });
    const keepOff = add(giant.pos, scale(away, 5.2));
    if (dist(shadow.pos, G.pos) < G.radius + shadow.radius * 0.6) {
      // armed: hold position on the light side, out of stomp reach, until the telegraph
      if (dist(keepOff, m.pos) > 1.0) { this.moveFrames(w, keepOff, 2, 0.6); return true; }
      this.kit.wait(2); return true;
    }
    const dG = dist(giant.pos, G.pos);
    if (dG < 1.4 || dG > 5.0) {
      // lure the Giant toward the glyph: stand beyond it
      const lure = add(G.pos, scale(norm(sub(G.pos, giant.pos), { x: 0, z: 1 }), dG < 1.4 ? -4 : 3.2));
      if (len(lure) > w.def.arena.radius - 1.5) return false;
      this.moveFrames(w, lure, 3, 0.6);
      return true;
    }
    const lightDest = add(giant.pos, scale(away, 2.2));
    const lights = w.props.filter((q) => q.alive && q.type === "light" && !q.d.dropped && q.tag !== "lantern");
    const L = nearest(lights, lightDest);
    if (!L || (L.d.slideT ?? 0) > 0) { this.kit.wait(2); return true; }
    if (dist(L.pos, lightDest) > 1.0) {
      const dir = dirTo(L.pos, lightDest);
      const behind = sub(L.pos, scale(dir, 1.8));
      if (dist(behind, m.pos) < 0.7 && angleBetween(sub(L.pos, m.pos), dir) < 0.35 && this.can(w, "vector")) { this.kit.tap("vector", dir, null, w); return true; }
      this.moveFrames(w, behind, 3, 0.4);
      return true;
    }
    this.kit.wait(2);
    return true;
  }

  // ---------------- The Mirror ----------------
  private planMirror(w: World, mirror: Actor): boolean {
    const m = w.markov;
    if (this.qed(w)) return true;
    const p3 = w.director.bossPhase >= 3 && !w.def.echo;
    const fresh = (op: OpId) => !p3 || w.frame - (w.ops.useFrames[op].at(-1) ?? -9999) > 640;
    // copies coming at us: deliver them home
    const copies = hostileProjectiles(w).filter((q) => q.shooterId === mirror.id);
    for (const c of copies) {
      const t = timeToImpact(c, m.pos, m.radius + 1.2);
      const d = dist(c.pos, m.pos);
      if (d < 9 && t > 24 && t < 60 && this.can(w, "order") && fresh("order")) { this.kit.hold("order", aimTo(w, c.pos), 21, w); return true; }
      if (d < CATCH && this.can(w, "vector") && fresh("vector")) { this.kit.tap("vector", dirTo(c.pos, mirror.pos), null, w); return true; }
    }
    // generate copies from sconce fireballs
    const p = hostileProjectiles(w).find((q) => q.shooterId !== mirror.id && dist(q.pos, m.pos) < CATCH);
    const reserve = FOCUS.cost.order + 30;
    if (p && copies.length === 0 && m.focus >= reserve) {
      const gen: OpId | null = p3 ? (this.can(w, "null") ? "null" : null) : this.can(w, "vector") ? "vector" : this.can(w, "order") ? "order" : this.can(w, "null") ? "null" : null;
      if (gen) { this.kit.tap(gen, gen === "vector" ? dirTo(p.pos, mirror.pos) : aimTo(w, p.pos), null, w); return true; }
    }
    // keep across from the Mirror, off the center line
    const spot = { x: 5.5 * (m.pos.x >= 0 ? 1 : -1), z: m.pos.z > 3 ? 2 : m.pos.z < -3 ? -2 : m.pos.z };
    if (dist(spot, m.pos) > 1) { this.moveFrames(w, spot, 3, 0.8); return true; }
    this.kit.wait(3);
    return true;
  }

  // ---------------- The King ----------------
  private planKing(w: World, king: Actor): boolean {
    const m = w.markov;
    if (this.qed(w)) return true;
    const phase3 = w.director.bossPhase >= 3;
    const subjects = enemies(w).filter((a) => a.commandedBy === king.id);
    if ((phase3 || (w.def.echo && !subjects.length)) && this.can(w, "null")) {
      if (dist(king.pos, m.pos) > 11) { this.moveFrames(w, king.pos, 4, 9); return true; }
      this.kit.hold("null", aimTo(w, king.pos), 22, w); return true;
    }
    const s = nearest(subjects.filter((a) => dist(a.pos, m.pos) < 12), m.pos);
    if (s && this.can(w, "null")) { this.kit.tap("null", aimTo(w, s.pos), null, w); return true; }
    const p = this.incoming(w);
    if (p && this.can(w, "vector")) { this.kit.tap("vector", dirTo(p.pos, king.pos), null, w); return true; }
    if (s) { this.moveFrames(w, s.pos, 3, 6); return true; }
    return false;
  }

  // ---------------- The Judge ----------------
  private planJudge(w: World, judge: Actor): boolean {
    const m = w.markov;
    if (this.qed(w)) return true;
    if (w.def.echo) return this.planJudgeEcho(w, judge);
    const d = dist(judge.pos, m.pos);
    if (d > 10) { this.moveFrames(w, judge.pos, 4, 7); return true; }
    const ops: OpId[] = ["vector", "order", "null", "phase"];
    const last = (o: OpId) => w.ops.useFrames[o].at(-1) ?? -9999;
    const ready = ops.filter((o) => m.regalia.has(o) && w.frame - last(o) > 320 && m.focus >= FOCUS.cost[o] && (m.state === "idle" || m.state === "opRecovery"));
    // never repeat the op the Judge saw last
    const seq = [judge.d.s1, judge.d.s2];
    const code = (o: OpId) => ({ vector: 1, phase: 2, order: 3, null: 4 })[o];
    const pick = ready.filter((o) => !seq.includes(code(o))).sort((a, b) => last(a) - last(b))[0];
    if (pick) {
      if (pick === "phase") this.kit.hold("phase", aimTo(w, judge.pos), 21, w);
      else this.kit.tap(pick, aimTo(w, judge.pos), null, w);
      return true;
    }
    const spot = add(judge.pos, scale(dirTo(judge.pos, m.pos), 7));
    if (dist(spot, m.pos) > 1) { this.moveFrames(w, spot, 3, 0.8); return true; }
    this.kit.wait(4);
    return true;
  }

  private planJudgeEcho(w: World, judge: Actor): boolean {
    const m = w.markov;
    const d = dist(judge.pos, m.pos) - judge.radius;
    const lastKind = judge.d.lastStrikeKind ?? 0;
    if (d > 1.4) { this.moveFrames(w, judge.pos, 3, judge.radius + 1.1); return true; }
    if (lastKind === 1 && m.regalia.has("step") && m.stepCharges > 0) {
      // Step-Strike: step past the Judge's flank then strike within 30f
      // Stepping into the Judge is blocked by its body, so the Step leaves us in reach.
      const into = dirTo(m.pos, judge.pos);
      this.kit.step(into);
      this.kit.wait(9);
      this.kit.strike(into);
      return true;
    }
    if (w.frame - m.lastStepFrame > 40) { this.kit.strike(aimTo(w, judge.pos)); return true; }
    this.kit.wait(4);
    return true;
  }

  // ---------------- The Prophet ----------------
  private planProphet(w: World, prophet: Actor): boolean {
    const m = w.markov;
    if (this.qed(w)) return true;
    const echo = w.def.echo;
    if (prophet.d.stalled && (m.insightT > 0 || echo)) {
      if (echo) {
        if (dist(prophet.pos, m.pos) - prophet.radius < 1.6) { this.kit.strike(aimTo(w, prophet.pos)); return true; }
        this.kit.wait(1); return true;
      }
      if (this.can(w, "vector") && dist(prophet.pos, m.pos) < 13) { this.kit.tap("vector", aimTo(w, prophet.pos), null, w); return true; }
      if (this.can(w, "null") && dist(prophet.pos, m.pos) < 13) { this.kit.tap("null", aimTo(w, prophet.pos), null, w); return true; }
    }
    const d = dist(prophet.pos, m.pos);
    if (!echo && d > 11 && !prophet.d.stalled) { this.moveFrames(w, prophet.pos, 3, 9); return true; }
    // Be still.
    this.kit.wait(1);
    return true;
  }

  // ---------------- The Child ----------------
  private planChild(w: World, child: Actor): void {
    const m = w.markov;
    const d = dist(child.pos, m.pos);
    const ahead = add(child.pos, scale(child.facing, 0.6));
    if (d > 1.3) {
      const want = dirTo(m.pos, ahead);
      this.kit.push({ label: "follow", frames: [BotKit.frame(scale(want, Math.min(1, d / 2)), null)] });
      return;
    }
    this.kit.wait(1);
  }

  // ---------------- Ishtar ----------------
  private planIshtar(w: World): void {
    const m = w.markov;
    const ring = scale(norm(m.pos, { x: 0, z: 1 }), 7);
    const prefer = dist(ring, m.pos) > 1 ? dirTo(m.pos, ring) : null;
    const safe = safestMove(w, prefer, 0.4);
    this.kit.push({ label: "siege", frames: [BotKit.frame(safe.dir, null)] });
  }
}
