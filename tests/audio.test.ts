import { describe, expect, it } from "vitest";
import { SIM_EVENT_TYPES } from "../src/sim/events";
import { FEEL } from "../src/data/feel";
import { SFX } from "../src/data/audio";
import { VFX_FAMILIES } from "../src/vfx/Vfx";
import { BARKS } from "../src/data/barks";

/** Events that are bookkeeping, not gameplay moments (no sound by design). */
const SILENT = new Set(["ProjectileSpawn", "ProjectileDie", "StillnessProgress", "ChildProgress", "DawnProgress", "EncounterStart", "EncounterLost", "Hitstop", "GlyphHint", "SlowMoTeach", "Bark", "Credits", "HubrisChanged", "LawTierChanged", "Recovered", "Defeated", "TrialClear", "OpHoldStart", "Interact", "Kneel"]);

describe("audio event coverage", () => {
  it("every gameplay event maps to a sound key that exists in the SFX bank", () => {
    const missing: string[] = [];
    for (const t of SIM_EVENT_TYPES) {
      if (SILENT.has(t)) continue;
      const key = FEEL[t]?.sfx;
      if (!key || !SFX[key]) missing.push(`${t} → ${key ?? "∅"}`);
    }
    expect(missing).toEqual([]);
  });
  it("every VFX family is referenced by the Game Feel Bible", () => {
    const used = new Set(Object.values(FEEL).map((r) => r?.vfx).filter(Boolean));
    used.add("insight-lines");
    expect(VFX_FAMILIES.filter((f) => !used.has(f))).toEqual([]);
    expect(VFX_FAMILIES.length).toBe(15);
  });
  it("bark sheet ≈120 lines, all with subtitles and VO keys", () => {
    expect(BARKS.length).toBeGreaterThanOrEqual(110);
    for (const b of BARKS) { expect(b.line.length).toBeGreaterThan(0); expect(b.id).toMatch(/^[a-z]+\.[A-Za-z0-9]+\.\d{3}$/); }
    expect(BARKS.filter((b) => b.context === "taunt").length).toBe(12);
  });
});
