import type { App } from "../app/App";
import { REGALIA_ORDER, type ActorType, type LawId, type Regalia } from "../sim/types";
import { VFX_FAMILIES } from "../vfx/Vfx";

/**
 * window.__dev: state snapshot, spawn, Law/tier, regalia, Focus/Seals/Hubris, jump, time scale, seed,
 * run bot, capture screenshot, dump perf. Bots drive semantic input only; the setters here are debug tools.
 */
export function installDevHooks(app: App): void {
  const w = () => { if (!app.world) throw new Error("no world"); return app.world; };
  const dev = {
    snapshot: () => {
      const x = w();
      return {
        id: x.def.id, frame: x.frame, status: x.status, mode: app.mode, hash: x.hashState(),
        markov: { pos: x.markov.pos, seals: x.markov.seals, focus: x.markov.focus, hubris: x.markov.hubris, state: x.markov.state, regalia: [...x.markov.regalia], insight: x.markov.insightT },
        law: { id: x.def.law, tier: x.law.tier, mini: x.law.miniLaw },
        actors: x.actors.filter((a) => a.alive).map((a) => ({ id: a.id, type: a.type, pos: a.pos, certainty: a.certainty, max: a.maxCertainty, state: a.state })),
        projectiles: x.projectiles.filter((p) => p.alive).length, score: x.scorer.score, bossPhase: x.director.bossPhase, flags: { ...x.flags },
      };
    },
    spawn: (type: ActorType, x = 4, z = 4, elite = false) => w().spawnActor(type, { x, z }, { elite }).id,
    setLaw: (law: LawId, tier = 0) => { const x = w(); x.law.active.add(law); x.law.tier = tier; x.emit("LawTierChanged", { value: tier }); },
    grantRegalia: (r: Regalia | "all") => { for (const k of r === "all" ? REGALIA_ORDER : [r]) w().markov.grantRegalia(k); },
    removeRegalia: (r: Regalia) => w().markov.removeRegalia(r),
    setFocus: (n: number) => w().markov.setFocus(n),
    setSeals: (n: number) => w().markov.setSeals(n),
    setHubris: (n: number) => w().markov.setHubris(n),
    jump: (id: string) => app.jump(id),
    startTrial: (n: number) => app.startTrial(n),
    hub: () => app.toHub(),
    title: () => app.toTitle(),
    menu: () => app.mainMenu(),
    timeScale: (s: number) => { app.timeScale = s; },
    seed: (s?: number) => { if (s !== undefined) app.seed = s; return app.seed; },
    runBot: (name: "solver" | "passive" | "none" = "solver") => app.runBot(name),
    screenshot: () => app.rig.renderer.domElement.toDataURL("image/png"),
    perf: () => app.perfSummary(),
    bundle: () => app.exportDiagnostics(),
    vfxCounts: () => ({ families: VFX_FAMILIES, counts: (app.vfx as unknown as { counts: Record<string, number> }).counts }),
    audioPlayed: () => [...app.audio.played],
    assetsMissing: () => app.assets.missing,
    /** Stress arena for perf sampling: 40 enemies + 400 projectiles + afterimages. */
    stress: () => {
      app.jump("laboratory");
      const x = w();
      x.opts.infiniteFocus = true;
      const types: ActorType[] = ["axiom", "corollary", "variable", "constant", "iterator", "paradox", "oracle", "herald"];
      for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2; x.spawnActor(types[i % types.length]!, { x: Math.sin(a) * 9, z: Math.cos(a) * 9 }, { spawnFrames: 0 }); }
      for (let i = 0; i < 400; i++) { const a = (i / 400) * Math.PI * 2; x.spawnProjectile({ pos: { x: Math.sin(a) * (3 + (i % 9)), z: Math.cos(a) * (3 + (i % 9)) }, vel: { x: Math.cos(a) * 0.5, z: -Math.sin(a) * 0.5 }, owner: "enemy", shooterId: 0, shape: (["fire", "bolt", "command", "prophecy", "radiant"] as const)[i % 5], life: 1e9 }); }
      x.markov.setSeals(6);
      x.opts.seals = 999;
      (x.def as { noSealLoss?: boolean }).noSealLoss = true;
      for (let i = 0; i < 60; i++) app.view.afterimages.spawn(app.view.markovPos.clone().setY(0.9).add({ x: (i % 10) - 5, y: 0, z: Math.floor(i / 10) - 3 } as never), 0, 0xf2b94a, 0x4f8dff, 100000);
      return { actors: x.actors.length, projectiles: x.projectiles.length };
    },
    app,
  };
  (window as unknown as { __dev: typeof dev }).__dev = dev;
  app.shell.studio.dev.register("mandark.snapshot", { description: "Game state snapshot", run: () => JSON.stringify(dev.snapshot(), null, 2) });
  app.shell.studio.dev.register("mandark.jump", { description: "Jump to encounter id", run: ({ args }) => { dev.jump(args[0]!); return `jumped ${args[0]}`; } });
  app.shell.studio.dev.register("mandark.bot", { description: "Run solver bot", run: () => { dev.runBot("solver"); return "bot on"; } });
}
