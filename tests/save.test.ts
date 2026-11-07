import { describe, expect, it } from "vitest";
import { MemoryStorage } from "@slu/web-shell";
import { Progress, freshSave } from "../src/meta/Progress";
import { CODEX } from "../src/data/codex";

describe("save / load", () => {
  it("round-trips a full save", async () => {
    const st = new MemoryStorage();
    const a = new Progress(st, 1);
    a.recordArena("1-1", { score: 9000, rank: "proof", pct: 90, ops: 4, parOps: 7, parScore: 10000, noDamage: true, frames: 2000, breakdown: {}, constraintOk: true });
    a.clearTrial(1, "flame", "qed"); a.markSeen("axiom"); a.data.stageIndex = 6;
    await a.save();
    const b = new Progress(st, 1);
    expect(await b.load()).toBe("primary");
    expect(b.data).toEqual(a.data);
    expect(b.data.codex).toContain("law:reflection"); expect(b.data.marginalia).toContain("boss:flame");
  });
  it("migrates v0 fixtures", async () => {
    const st = new MemoryStorage();
    await st.set("mandark-ishtar:slot0", { schemaVersion: 0, savedAt: new Date().toISOString(), data: { cleared: ["1-1", "1-2"], codex: ["law:reflection"], best: { "1-1": 4200 } } });
    const p = new Progress(st, 0);
    await p.load();
    expect(p.data.encounters["1-1"]!.best).toBe(4200);
    expect(p.data.codex).toEqual(["law:reflection"]);
    expect(p.data.seenColdOpen).toBe(true);
  });
  it("falls back to the last good backup when the primary is corrupt", async () => {
    const st = new MemoryStorage();
    const p = new Progress(st, 2); p.data.stageIndex = 3; await p.save(); p.data.stageIndex = 4; await p.save();
    const raw = await st.get<{ integrity: string }>("mandark-ishtar:slot2"); await st.set("mandark-ishtar:slot2", { ...raw!, integrity: "deadbeef" });
    const q = new Progress(st, 2);
    expect(await q.load()).toBe("backup");
    expect(q.data.stageIndex).toBe(3);
  });
  // GDD §14 itemizes 7 Laws + 7 bosses + 8 Theorems + Ishtar + Engine + Name + Babel + Descent = 27 (its stated total of 26 is an arithmetic slip; see DECISIONS.md).
  it("has every itemized Codex entry (27)", () => { expect(CODEX.length).toBe(27); expect(freshSave().codex).toEqual([]); });
});
