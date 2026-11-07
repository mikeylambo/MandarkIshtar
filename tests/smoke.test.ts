import { describe, expect, it } from "vitest";
import { World } from "../src/sim/World";
import { allEncounters } from "../src/data/trials";
import { NO_INPUT } from "../src/sim/types";

describe("smoke", () => {
  it("every encounter boots and steps 900 frames with no input", () => {
    for (const def of allEncounters()) {
      const w = new World(def, { seed: 1 });
      for (let i = 0; i < 900; i++) w.step(NO_INPUT);
      expect(w.frame).toBe(900);
    }
  });
});
