import { SaveManager, type StorageAdapter, type MigrationTable } from "@slu/web-shell";
import type { RankId } from "../data/ranks";
import { RANK_ORDER } from "../data/ranks";
import type { ArenaResult } from "../combat/EleganceScorer";
import type { DifficultyId } from "../data/difficulty";
import { CODEX } from "../data/codex";
import { THEOREM_CHALLENGES } from "../data/theorems";

export const SAVE_VERSION = 1;

export interface SaveV1 {
  slot: number;
  seenColdOpen: boolean;
  difficulty: DifficultyId;
  encounters: Record<string, { best: number; rank: RankId; clears: number; bestFrames: number }>;
  trialsCleared: number[];
  descentDone: boolean;
  campaignComplete: boolean;
  /** Next campaign stage index (resume point; quitting mid-arena resets the arena). */
  stageIndex: number;
  codex: string[];
  marginalia: string[];
  unlocks: string[];
  bestTimes: Record<string, number>;
  bestScores: Record<string, number>;
  theorems: Record<string, boolean>;
  seen: string[];
  palette: string;
  onboarding: { completedLessons: string[]; completedFlows: string[]; skippedFlows: string[] };
  stats: { playFrames: number; contradictions: number; qeds: number; retries: number; temptationsTaken: number };
}

/** v0 (pre-release prototype) shape, kept so old fixtures migrate. */
export interface SaveV0 { cleared?: string[]; codex?: string[]; best?: Record<string, number> }

export function freshSave(slot = 0): SaveV1 {
  return {
    slot, seenColdOpen: false, difficulty: "savant", encounters: {}, trialsCleared: [], descentDone: false, campaignComplete: false, stageIndex: 0,
    codex: [], marginalia: [], unlocks: [], bestTimes: {}, bestScores: {}, theorems: {}, seen: [], palette: "default",
    onboarding: { completedLessons: [], completedFlows: [], skippedFlows: [] },
    stats: { playFrames: 0, contradictions: 0, qeds: 0, retries: 0, temptationsTaken: 0 },
  };
}

export const MIGRATIONS: MigrationTable = {
  0: (raw) => {
    const v0 = (raw ?? {}) as SaveV0;
    const s = freshSave();
    for (const id of v0.cleared ?? []) s.encounters[id] = { best: v0.best?.[id] ?? 0, rank: "conjecture", clears: 1, bestFrames: 0 };
    s.codex = [...(v0.codex ?? [])];
    s.seenColdOpen = (v0.cleared ?? []).length > 0;
    return s;
  },
};

/** Campaign progress, unlocks and Codex — persisted through the shell SaveManager (3 slots + rolling backup). */
export class Progress {
  data: SaveV1;
  private readonly mgr: SaveManager<SaveV1>;
  constructor(storage: StorageAdapter, readonly slot = 0) {
    this.mgr = new SaveManager<SaveV1>(storage, `mandark-ishtar:slot${slot}`, SAVE_VERSION, MIGRATIONS);
    this.data = freshSave(slot);
  }

  async load(): Promise<"primary" | "staging" | "backup" | "empty"> {
    const r = await this.mgr.loadWithRecovery();
    this.data = r.data ? { ...freshSave(this.slot), ...r.data } : freshSave(this.slot);
    return r.source;
  }
  async save(): Promise<void> { await this.mgr.save(this.data); }
  async wipe(): Promise<void> { await this.mgr.delete(); this.data = freshSave(this.slot); }

  recordArena(id: string, r: ArenaResult): void {
    const prev = this.data.encounters[id];
    const better = !prev || RANK_ORDER.indexOf(r.rank) > RANK_ORDER.indexOf(prev.rank) ? r.rank : prev.rank;
    this.data.encounters[id] = { best: Math.max(prev?.best ?? 0, r.score), rank: better, clears: (prev?.clears ?? 0) + 1, bestFrames: prev?.bestFrames ? Math.min(prev.bestFrames, r.frames) : r.frames };
  }

  unlockCodex(key: string): string[] {
    const got: string[] = [];
    for (const e of CODEX) if (e.unlock === key && !this.data.codex.includes(e.id)) { this.data.codex.push(e.id); got.push(e.id); }
    return got;
  }
  unlockMarginalia(entryIds: string[]): void { for (const id of entryIds) if (!this.data.marginalia.includes(id)) this.data.marginalia.push(id); }

  /** Trial clear: Codex law + boss, Marginalia, Theorems and Time Attack for that Trial. */
  clearTrial(n: number, bossId: string, bossRank: RankId): void {
    if (!this.data.trialsCleared.includes(n)) this.data.trialsCleared.push(n);
    const law = this.unlockCodex(`trial:${n}`), boss = this.unlockCodex(`boss:${bossId}`);
    this.unlockMarginalia(law);
    if (RANK_ORDER.indexOf(bossRank) >= RANK_ORDER.indexOf("proof")) this.unlockMarginalia(boss);
    this.unlock(`timeAttack:${n}`);
    for (const t of THEOREM_CHALLENGES.filter((c) => c.trial === n)) this.unlock(`theorem:${t.id}`);
    if (n === 1) this.unlockCodex("story:babel");
  }
  completeCampaign(): void {
    this.data.campaignComplete = true;
    for (const u of ["scoreAttack", "bossRush", "laboratory", "palette:lazar", "difficulty:paragon"]) this.unlock(u);
  }
  unlock(id: string): void { if (!this.data.unlocks.includes(id)) this.data.unlocks.push(id); }
  has(id: string): boolean { return this.data.unlocks.includes(id); }
  markSeen(type: string): void { if (!this.data.seen.includes(type)) { this.data.seen.push(type); this.unlockCodex(`seen:${type}`); } }
}
