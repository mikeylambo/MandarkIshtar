import { BARKS, type Bark } from "../data/barks";
import type { SimEvent } from "../sim/events";

/** Event → bark context, with cooldowns and the Markov softening arc. Emits subtitle lines; VO via manifest key. */
const CONTEXT: Partial<Record<string, string>> = {
  Flourish: "clear", QED: "qed", Contradiction: "contradiction", HubrisTaunt: "taunt", HubrisShatter: "shatter",
  InsightStart: "insight", RingOut: "ringOut", TemptationTaken: "temptationTaken", ChildGiggle: "child",
};

export class BarkSystem {
  private lastAt = -999;
  private ctxCooldown = new Map<string, number>();
  private cursor = new Map<string, number>();
  arc: "early" | "soft" | "joy" = "early";
  readonly said: Bark[] = [];

  constructor(private readonly onLine: (b: Bark) => void) {}

  pick(context: string, frame: number, force = false): Bark | null {
    const pool = BARKS.filter((b) => b.context === context && (this.arc === "joy" ? b.phase !== "soft" : true));
    if (!pool.length) return null;
    if (!force) {
      if (frame - this.lastAt < 150) return null;
      if ((this.ctxCooldown.get(context) ?? -1e9) > frame) return null;
    }
    const i = (this.cursor.get(context) ?? 0) % pool.length;
    this.cursor.set(context, i + 1);
    const b = pool[i]!;
    this.lastAt = frame; this.ctxCooldown.set(context, frame + 420);
    this.said.push(b);
    this.onLine(b);
    return b;
  }

  /** Cold open keeps its scripted door lines. */
  scriptedEncounter = false;
  onEvent(e: SimEvent, frame: number): void {
    if (e.type === "Bark" && e.kind) { this.pick(e.kind, frame, true); return; }
    if (e.type === "Flourish") {
      if (this.scriptedEncounter) return; this.pick(this.arc === "joy" ? "clearJoy" : this.arc === "soft" ? "clearSoft" : "clear", frame, true); return; }
    const c = CONTEXT[e.type];
    if (c && (e.type !== "Contradiction" || frame % 3 === 0)) this.pick(c, frame);
  }
}
