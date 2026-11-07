// Screenshots of every scene and set piece into /captures (deviceScaleFactor 1 for checks).
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { serve } from "./serve.mjs";
const { chromium } = createRequire(import.meta.url)("playwright");
const only = process.argv[2]?.split(",");
const { url, close } = await serve(4182);
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
mkdirSync("captures", { recursive: true });
await page.goto(url);
await page.waitForFunction(() => window.__dev && window.__dev.app.mode === "title", null, { timeout: 30000 });
const dev = (fn, arg) => page.evaluate(fn, arg);
const shot = async (name) => { await page.waitForTimeout(250); await page.screenshot({ path: `captures/${name}.png` }); console.log("captured", name); done.push(name); };
const done = [];
/** jump to an encounter, run the solver at speed, freeze on an event (or frame), capture. */
async function scene(name, id, { freeze = null, frames = 300, bot = "solver", speed = 4, timeout = 150000, setup = null } = {}) {
  if (only && !only.includes(name)) return;
  await dev(([id, bot, freeze, speed]) => { window.__dev.unfreeze(); window.__dev.jump(id); window.__dev.runBot(bot); if (freeze) window.__dev.freezeOn(freeze); window.__dev.timeScale(speed); }, [id, bot, freeze, speed]);
  if (setup) await dev(setup);
  try {
    if (freeze) await page.waitForFunction(() => window.__dev.app.frozen, null, { timeout });
    else await page.waitForFunction((f) => window.__dev.app.world && window.__dev.app.world.frame >= f, frames, { timeout });
  } catch { console.log("timeout", name); }
  await dev(() => window.__dev.timeScale(0));
  await shot(name);
  await dev(() => { window.__dev.unfreeze(); window.__dev.runBot("none"); });
}
// --- menus / flow ---
if (!only || only.includes("01-title")) { await page.waitForTimeout(2500); await shot("01-title"); }
if (!only || only.includes("02-main-menu")) { await dev(() => { window.__dev.app.progress.data.seenColdOpen = true; window.__dev.menu(); }); await shot("02-main-menu"); }
// --- First 60 seconds (GDD §9 beats 2–8) ---
await scene("03-coldopen-door", "cold-open", { frames: 30, bot: "none", speed: 1 });
await scene("04-coldopen-strike-hum", "cold-open", { freeze: "DoorHum", speed: 1 });
await scene("05-coldopen-sconce-teach", "cold-open", { freeze: "EnemyAttack:sconce", speed: 1 });
await scene("06-coldopen-redirect", "cold-open", { freeze: "Redirect", speed: 1 });
await scene("07-coldopen-contradiction", "cold-open", { freeze: "Contradiction", speed: 1 });
await scene("08-coldopen-qed-inversion", "cold-open", { freeze: "QED", speed: 1 });
await scene("09-law-card-slam", "1-1", { frames: 40, bot: "none", speed: 1 });
await scene("10-arena-1-1", "1-1", { frames: 500 });
await scene("11-enemy-on-enemy", "1-1", { freeze: "Contradiction:axiom", timeout: 200000 });
await scene("12-room-clear-rotation", "1-1", { freeze: "Flourish", timeout: 300000 });
// --- Trial arenas (each theme) ---
for (const [n, id] of [["13-trial2-shadow", "2-2"], ["14-trial3-recurrence", "3-2"], ["15-trial4-dominion", "4-4"], ["16-trial5-judgment", "5-2"], ["17-trial6-prophecy", "6-2"], ["18-trial7-innocence", "7-1"]]) await scene(n, id, { frames: 700 });
// --- Bosses and set pieces ---
await scene("20-boss-flame", "1-B", { frames: 900 });
await scene("21-boss-giant-shadow-plane", "2-B", { frames: 700, setup: () => { window.__dev.app.camera.zoom = 1; } });
await scene("22-boss-mirror", "3-B", { freeze: "Copy", timeout: 200000 });
await scene("23-boss-king-command-beams", "4-B", { frames: 300 });
await scene("24-boss-judge-sentence", "5-B", { freeze: "MorningBell", timeout: 200000 });
await scene("25-boss-prophet-cones", "6-B", { freeze: "Prophecy", timeout: 200000 });
await scene("26-prophet-stall-insight", "6-B", { freeze: "ProphetStall", timeout: 200000 });
await scene("27-boss-child-garden", "7-B", { frames: 1500 });
await scene("28-qed-inversion", "1-2", { freeze: "QED", timeout: 200000 });
// --- Descent ---
for (let g = 1; g <= 7; g++) await scene(`3${g}-descent-gate-${g}`, `gate-${g}`, { frames: 400 });
await scene("40-ishtar-siege", "ishtar", { frames: 900 });
await scene("41-ishtar-temptation", "ishtar", { frames: 30, setup: () => { window.__dev.app.run.startPhase = 2; window.__dev.app.run.stages[0].opts.startPhase = 2; window.__dev.app.run.startPhase = 2; window.__dev.app.retryArena(); window.__dev.runBot("solver"); window.__dev.timeScale(1); } });
await scene("42-ishtar-p3-stillness", "ishtar", { frames: 20, bot: "passive", setup: () => { window.__dev.app.run.stages[0].opts.startPhase = 3; window.__dev.app.run.startPhase = 3; window.__dev.app.retryArena(); window.__dev.runBot("passive"); window.__dev.timeScale(1); } });
await scene("43-the-dawn", "ishtar", { freeze: "NameReveal", bot: "passive", timeout: 60000, setup: () => { window.__dev.app.run.stages[0].opts.startPhase = 3; window.__dev.app.run.startPhase = 3; window.__dev.app.retryArena(); window.__dev.runBot("passive"); window.__dev.timeScale(2); } });
await scene("44-ascent", "ascent-4", { frames: 400 });
// --- Hub / UI screens ---
if (!only || only.includes("50-observatory")) { await dev(() => { window.__dev.unfreeze(); window.__dev.hub(); }); await page.waitForTimeout(1500); await shot("50-observatory"); }
if (!only || only.includes("51-codex")) { await dev(() => { const a = window.__dev.app; a.progress.clearTrial(1, "flame", "qed"); a.progress.markSeen("axiom"); a.codexMenu(() => a.toHub()); }); await shot("51-codex"); }
if (!only || only.includes("52-settings")) { await dev(() => { const a = window.__dev.app; a.settingsMenu(() => a.toHub()); }); await shot("52-settings"); }
if (!only || only.includes("53-results")) {
  await dev(() => { window.__dev.jump("1-1"); window.__dev.runBot("solver"); window.__dev.timeScale(6); });
  await page.waitForFunction(() => window.__dev.app.mode === "results", null, { timeout: 200000 }).catch(() => console.log("timeout results"));
  await dev(() => window.__dev.runBot("none")); await shot("53-results");
}
if (!only || only.includes("54-pause")) { await dev(() => { window.__dev.jump("2-1"); window.__dev.timeScale(1); }); await page.waitForTimeout(2600); await dev(() => window.__dev.app.pause()); await shot("54-pause"); }
if (!only || only.includes("55-arcade")) { await dev(() => { const a = window.__dev.app; a.progress.completeCampaign(); a.arcadeMenu(() => a.toHub()); }); await shot("55-arcade"); }
if (!only || only.includes("56-laboratory")) { await dev(() => { window.__dev.jump("laboratory"); for (const t of ["axiom","constant","iterator","paradox","oracle","herald","variable","corollary"]) window.__dev.spawn(t, (Math.random()*16)-8, (Math.random()*10)); window.__dev.timeScale(1); }); await page.waitForTimeout(1200); await shot("56-laboratory-all-theorems"); }
writeFileSync("captures/index.json", JSON.stringify({ captured: done, errors }, null, 2));
console.log(`done: ${done.length} captures, ${errors.length} page errors`); if (errors.length) console.log(errors.slice(0, 10).join("\n"));
await browser.close(); await close();
