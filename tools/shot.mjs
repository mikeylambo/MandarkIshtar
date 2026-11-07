// Ad-hoc capture: node tools/shot.mjs <encounterId> <frames> <out.png> [bot]
import { createRequire } from "node:module";
import { serve } from "./serve.mjs";
const { chromium } = createRequire(import.meta.url)("playwright");
const [id = "1-1", frames = "240", out = "captures/shot.png", bot = "solver"] = process.argv.slice(2);
const { url, close } = await serve(4181);
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
page.on("pageerror", (e) => console.error("pageerror", e.message));
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.error(m.type(), m.text()); });
await page.goto(url);
await page.waitForFunction(() => window.__dev && window.__dev.app.mode === "title", null, { timeout: 30000 });
await page.evaluate(([id, bot]) => { window.__dev.jump(id); if (bot !== "none") window.__dev.runBot(bot); window.__dev.timeScale(4); }, [id, bot]);
await page.waitForFunction((f) => window.__dev.app.world && window.__dev.app.world.frame >= f, Number(frames), { timeout: 120000 });
await page.evaluate(() => window.__dev.timeScale(0));
await page.waitForTimeout(300);
await page.screenshot({ path: out });
console.log(JSON.stringify(await page.evaluate(() => window.__dev.perf())));
await browser.close(); await close();
