import { World, type WorldOptions } from "../../sim/World";
import type { EncounterDef } from "../../sim/encounter";
import type { ArenaResult } from "../../combat/EleganceScorer";
import { campaignStages } from "../../campaign/sequence";
import type { Bot } from "./BotKit";
import type { Regalia } from "../../sim/types";

export interface RunResult { id: string; status: "clear" | "lost" | "timeout"; frames: number; result: ArenaResult | null; world: World }

export const TEN_MINUTES = 60 * 60 * 10;

export function runEncounter(def: EncounterDef, opts: WorldOptions, bot: Bot, maxFrames = TEN_MINUTES, onFrame?: (w: World) => void): RunResult {
  const w = new World(def, opts);
  while (w.frame < maxFrames && w.status !== "clear" && w.status !== "lost") {
    w.step(bot.next(w));
    onFrame?.(w);
  }
  const status = w.status === "clear" ? "clear" : w.status === "lost" ? "lost" : "timeout";
  return { id: def.id, status, frames: w.frame, result: w.scorer.finalized, world: w };
}

export interface CampaignReport { completed: boolean; stages: { id: string; tries: number; frames: number; rank?: string; score?: number; status: string }[]; totalFrames: number; failedAt?: string }

/** Plays the whole campaign with retries (Seals carry within a Trial; a loss retries the encounter; bosses resume from their phase checkpoint). */
export function runCampaign(makeBot: () => Bot, opts: Partial<WorldOptions> = {}, maxTries = 6, onFrame?: (w: World) => void): CampaignReport {
  const report: CampaignReport = { completed: false, stages: [], totalFrames: 0 };
  let seals: number | undefined;
  let lastTrial = -1;
  let seed = 1;
  for (const st of campaignStages()) {
    if (st.trial !== lastTrial) { seals = undefined; lastTrial = st.trial; }
    let tries = 0, frames = 0, startPhase = 1;
    let res: RunResult | null = null;
    while (tries < maxTries) {
      tries++;
      res = runEncounter(st.def, { seed: seed++, difficulty: "savant", regalia: st.regalia as Regalia[], seals, startPhase, ...opts }, makeBot(), TEN_MINUTES, onFrame);
      frames += res.frames;
      if (res.status === "clear") break;
      seals = undefined;
      if (tries >= 1) startPhase = Math.max(startPhase, res.world.director.bossPhase);
    }
    report.totalFrames += frames;
    report.stages.push({ id: st.def.id, tries, frames, status: res!.status, rank: res!.result?.rank, score: res!.result?.score });
    if (res!.status !== "clear") { report.failedAt = st.def.id; return report; }
    seals = res!.world.markov.seals;
  }
  report.completed = true;
  return report;
}
