import { it } from "vitest";
import { campaignStages } from "../src/campaign/sequence";
import { runEncounter } from "../src/dev/bots/runner";
import { SolverBot } from "../src/dev/bots/SolverBot";

it.skipIf(!process.env.DIAG)("diag each stage", () => {
  const only = process.env.DIAG_ONLY?.split(",");
  for (const st of campaignStages()) {
    if (only && !only.includes(st.def.id)) continue;
    const t0 = Date.now();
    const hits: Record<string, number> = {}; const labels: Record<string, number> = {};
    const r = runEncounter(st.def, { seed: 7, regalia: st.regalia }, new SolverBot(), undefined, (w) => { for (const e of w.events) { if (e.type === "SealLost") hits[e.kind!] = (hits[e.kind!] ?? 0) + 1; if (e.type === "Contradiction") labels[e.text ?? "?"] = (labels[e.text ?? "?"] ?? 0) + 1; } });
    const w = r.world;
    const hs = w.hostiles().map((a) => `${a.type}:${a.certainty.toFixed(0)}/${a.state}`).join(" ");
    console.log(JSON.stringify(w.ledger.dealt), JSON.stringify(labels), `${st.def.id.padEnd(12)} ${r.status.padEnd(7)} ${(r.frames / 60).toFixed(0).padStart(4)}s seals=${w.markov.seals} hits=${w.markov.hitsTaken} rank=${r.result?.rank ?? "-"} phase=${w.director.bossPhase} contra=${w.ledger.contradictions} qed=${w.ledger.qeds} ${Date.now() - t0}ms ${r.status !== "clear" ? hs : ""} ${JSON.stringify(hits)}`);
  }
});
