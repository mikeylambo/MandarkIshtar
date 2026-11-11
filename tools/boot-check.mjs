// Headless boot: zero console errors and zero warnings; screenshot of the title.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { mkdirSync } from "node:fs";
import { serve } from "./serve.mjs";

const { url, close } = await serve(4180);
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const problems = [];
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") problems.push(`${m.type()}: ${m.text()}`); });
page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
// Static hosts answer missing files 404; vite preview answers them with index.html. Treat both as a missing request.
page.on("response", (r) => {
  const req = r.request(), html = (r.headers()["content-type"] ?? "").includes("text/html");
  if (r.status() === 404 || (html && req.resourceType() !== "document")) problems.push(`missing: ${r.url()}`);
});
await page.goto(url, { waitUntil: "load" });
await page.waitForFunction(() => window.__dev && window.__dev.app.mode === "title", null, { timeout: 30000 });
await page.waitForTimeout(2600);
mkdirSync("captures", { recursive: true });
await page.screenshot({ path: "captures/00-title.png" });
await browser.close();
await close();
if (problems.length) { console.error("BOOT FAILED: console problems:\n" + problems.join("\n")); process.exit(1); }
console.log("boot OK: title reached, 0 console errors, 0 warnings → captures/00-title.png");
