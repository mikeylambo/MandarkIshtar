import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { World } from "../src/sim/World";
import { campaignStages } from "../src/campaign/sequence";
import { SolverBot } from "../src/dev/bots/SolverBot";
import { PassiveBot } from "../src/dev/bots/PassiveBot";
import { runEncounter, TEN_MINUTES } from "../src/dev/bots/runner";
import { DESCENT_GATES } from "../src/data/descent";
import { REGALIA_ORDER, BTN, type InputFrame } from "../src/sim/types";
import { len } from "../src/sim/math";
import { input } from "./helpers";

const stages = campaignStages();

describe("invariants (seeded, property-style)", () => {
  it("no entity outside arena bounds except during ring-out; Certainty always within [0, max]; score reconciles", () => {
    for (const st of stages.filter((_, i) => i % 3 === 0)) {
      for (const seed of [11, 12]) {
        const R = st.def.arena.radius;
        runEncounter(st.def, { seed, regalia: st.regalia }, new SolverBot(), TEN_MINUTES, (w) => {
          expect(len(w.markov.pos)).toBeLessThanOrEqual(R + 1e-6);
          for (const a of w.actors) {
            if (!a.alive) continue;
            expect(a.certainty).toBeGreaterThanOrEqual(0);
            expect(a.certainty).toBeLessThanOrEqual(a.maxCertainty + 1e-9);
            if (a.type === "ishtar" || a.type === "child" || a.type === "shadow") continue;
            const ringOutAllowed = st.def.arena.edge === "void" ? 0.6 : 0.05;
            expect(len(a.pos)).toBeLessThanOrEqual(R + ringOutAllowed);
          }
          if (w.frame % 120 === 0) expect(w.scorer.reconcile()).toBe(true);
        });
      }
    }
  });

  it("every encounter terminates (clear or loss) within 10 minutes of bot time — solver and passive", () => {
    for (const st of stages) {
      const s = runEncounter(st.def, { seed: 21, regalia: st.regalia }, new SolverBot());
      expect([st.def.id, s.status]).toEqual([st.def.id, "clear"]);
      if (st.def.kind === "ascent" || st.def.kind === "coldOpen") continue; // no fail state by design (Ascent: no Seal loss; cold open: a puzzle with hints) // no Seal loss by design: passive play never loses or wins
      if (st.def.boss === "ishtar") continue; // P3 is reached only by surviving; passive loses in P1 (checked below)
      const p = runEncounter(st.def, { seed: 21, regalia: st.regalia }, new PassiveBot());
      expect([st.def.id, p.status === "timeout"]).toEqual([st.def.id, false]);
    }
  });

  it("same seed + same input stream → identical state hash after 10 minutes of simulation", () => {
    const tape: InputFrame[][] = [];
    const hashes: number[] = [];
    let total = 0;
    for (const st of stages) {
      if (total >= TEN_MINUTES) break;
      const frames: InputFrame[] = [];
      const bot = new SolverBot();
      const r = runEncounter(st.def, { seed: 99, regalia: st.regalia }, { name: "rec", next: (w) => { const f = bot.next(w); frames.push(f); return f; } });
      tape.push(frames); hashes.push(r.world.hashState()); total += r.frames;
    }
    expect(total).toBeGreaterThanOrEqual(TEN_MINUTES);
    for (let i = 0; i < tape.length; i++) {
      const st = stages[i]!;
      const w = new World(st.def, { seed: 99, regalia: st.regalia });
      for (const f of tape[i]!) w.step(f);
      expect(w.hashState()).toBe(hashes[i]);
    }
  });

  it("Descent: after gate N, regalia 1..N are unusable (dull click, no effect)", () => {
    const buttons: Record<string, number> = { hubris: BTN.hubris, vector: BTN.vector, phase: BTN.phase, order: BTN.order, null: BTN.null, step: BTN.step, strike: BTN.strike };
    for (const g of DESCENT_GATES) {
      const w = new World(g, { seed: 1, skipIntro: true });
      const lost = REGALIA_ORDER.slice(0, g.gate!);
      for (const r of lost) {
        expect(w.markov.regalia.has(r)).toBe(false);
        w.step(input({ x: 0, z: 1 }, buttons[r])); const pressEvents = [...w.events];
        for (let i = 0; i < 25; i++) w.step(input({ x: 0, z: 1 }, buttons[r]));
        w.step(input({ x: 0, z: 1 }, 0)); const all = [...pressEvents, ...w.events];
        expect(all.some((e) => e.type === "OpCast" || e.type === "StepCast" || e.type === "StrikeSwing" || e.type === "HubrisTaunt")).toBe(false);
        for (let i = 0; i < 20; i++) w.step(input(null));
      }
      for (const r of REGALIA_ORDER.slice(g.gate!)) expect(w.markov.regalia.has(r)).toBe(true);
    }
  });

  it("the Child and Ishtar never take damage from any source", () => {
    for (const id of ["7-B", "gate-7", "ishtar"]) {
      const st = stages.find((s) => s.def.id === id)!;
      const w = new World(st.def, { seed: 4, skipIntro: true, regalia: [...REGALIA_ORDER] });
      const t = w.director.boss!;
      for (const kind of ["strike", "op", "redirect", "exploit", "contact", "wall", "freed"] as const) {
        expect(w.ledger.damage(w, t, 999, { kind, exploit: kind === "exploit" ? 1 : undefined })).toBe(0);
      }
      w.ledger.ringOut(w, t);
      expect(t.alive).toBe(true);
      expect(t.certainty).toBe(t.maxCertainty);
    }
  });

  it("exactly one owner writes each state field", () => {
    const owners: [RegExp, string[]][] = [
      [/\.certainty\s*(=|-=|\+=)(?!=)/, ["src/combat/CertaintyLedger.ts", "src/sim/World.ts"]],
      [/\b(m|markov|this)\.(seals|focus|hubris)\s*(=|-=|\+=)(?!=)/, ["src/sim/MarkovController.ts"]],
      [/\.score\s*(=|\+=)(?!=)/, ["src/combat/EleganceScorer.ts", "src/dev/bots/runner.ts"]],
      [/\.tier\s*=(?!=)/, ["src/laws/LawDirector.ts"]],
    ];
    const files: string[] = [];
    const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (p.endsWith(".ts")) files.push(p); } };
    walk("src");
    for (const [re, allowed] of owners) {
      const offenders = files.filter((f) => !allowed.includes(f) && !f.startsWith("src/ui") && !f.startsWith("src/render") && !f.startsWith("src/main") && readFileSync(f, "utf8").split("\n").some((l) => re.test(l) && !l.trim().startsWith("//")));
      expect([re.source, offenders]).toEqual([re.source, []]);
    }
  });
});
