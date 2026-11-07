import { it } from "vitest";
import { encounterById } from "../src/data/trials";
import { World } from "../src/sim/World";
import { SolverBot } from "../src/dev/bots/SolverBot";
import { regaliaForTrial } from "../src/campaign/sequence";

it.skipIf(!process.env.TRACE)("trace", () => {
  const def = encounterById(process.env.TRACE!)!;
  const w = new World(def, { seed: 7, regalia: def.regalia ?? regaliaForTrial(def.trial ?? 7) });
  const bot = new SolverBot();
  const from = Number(process.env.FROM ?? 0), to = Number(process.env.TO ?? 900);
  while (w.frame < to && w.status !== "lost" && w.status !== "clear") {
    const inp = bot.next(w);
    w.step(inp);
    const ev = w.events.filter((e) => !["StillnessProgress", "ProjectileSpawn", "ChildProgress", "DawnProgress"].includes(e.type)).map((e) => e.type + (e.kind ? ":" + e.kind : "") + (e.op ? ":" + e.op : "")).join(",");
    if (w.frame >= from && (ev || w.frame % 10 === 0)) console.log(w.frame, bot.kit.label.padEnd(12), w.markov.state.padEnd(10), `m=${w.markov.pos.x.toFixed(1)},${w.markov.pos.z.toFixed(1)} f=${w.markov.focus.toFixed(0)} b=${inp.b} mv=${inp.mx.toFixed(1)},${inp.mz.toFixed(1)}`, ev);
  }
});
