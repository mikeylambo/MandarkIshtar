/** Theorem challenges: 21 (3 per Trial), unlocked on Trial clear. Constraint labels are player-facing rules. */
export type Constraint = { kind: "maxOps"; n: number } | { kind: "noStep" } | { kind: "finishersOnly" } | { kind: "enemyKills" };
export interface TheoremChallenge { id: string; trial: number; arena: string; constraint: Constraint; label: string }

const C = (trial: number, i: number, arena: string, constraint: Constraint): TheoremChallenge => ({
  id: `T${trial}.${i}`, trial, arena, constraint,
  label: constraint.kind === "maxOps" ? `≤ ${constraint.n} operations` : constraint.kind === "noStep" ? "No Step" : constraint.kind === "finishersOnly" ? "Strike only finishers" : "All kills by enemies",
});

export const THEOREM_CHALLENGES: TheoremChallenge[] = [
  C(1, 1, "1-1", { kind: "maxOps", n: 6 }), C(1, 2, "1-2", { kind: "finishersOnly" }), C(1, 3, "1-3", { kind: "noStep" }),
  C(2, 1, "2-1", { kind: "maxOps", n: 8 }), C(2, 2, "2-2", { kind: "finishersOnly" }), C(2, 3, "2-3", { kind: "enemyKills" }),
  C(3, 1, "3-1", { kind: "finishersOnly" }), C(3, 2, "3-2", { kind: "maxOps", n: 10 }), C(3, 3, "3-3", { kind: "noStep" }),
  C(4, 1, "4-1", { kind: "maxOps", n: 8 }), C(4, 2, "4-2", { kind: "finishersOnly" }), C(4, 3, "4-3", { kind: "enemyKills" }),
  C(5, 1, "5-1", { kind: "finishersOnly" }), C(5, 2, "5-2", { kind: "noStep" }), C(5, 3, "5-3", { kind: "maxOps", n: 12 }),
  C(6, 1, "6-1", { kind: "finishersOnly" }), C(6, 2, "6-2", { kind: "maxOps", n: 12 }), C(6, 3, "6-3", { kind: "noStep" }),
  C(7, 1, "7-1", { kind: "finishersOnly" }), C(7, 2, "7-2", { kind: "enemyKills" }), C(7, 3, "7-3", { kind: "maxOps", n: 10 }),
];
