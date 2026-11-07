# Final Report — Mandark Ishtar (build 0.9.1)

**Branch:** `claude/nifty-volta-56xcau` (see `git log` for the commit). **Shell:** @slu/web-shell **1.3.0**, pinned to `main@7003ec7a46f0de4c86b8dbb28fea81c10d4f21fa` ("Release v1.3.0"). The remote has no `v1.3.0` tag, so the pin is by commit.
**Deployed URL:** **none — not deployed.** No Vercel token or Vercel CLI login exists in the build session (the token was declined in-session). A production build is produced by `npm run build` (part of `npm run check`) into `dist/`.
**To deploy:** a Vercel token for Michael's account, then `npx vercel login` (or `VERCEL_TOKEN=… npx vercel deploy --token $VERCEL_TOKEN`) and `npm run deploy:preview` (= build + `npx --yes vercel deploy`). `vercel.json` is ready (static, output `dist/`).

## What changed in 0.9.1 (all verified)
| Item | Result | Evidence |
|---|---|---|
| Shell 1.1.0 → 1.3.0 | ✅ Toon (`slu.lit`), outline material, PostStack (bloom/grade/vignette/FXAA/flash/pulses), palette tokens, pooled VFX and FeelDirector (trauma shake + impact bundles) now come from the shell; game-local versions deleted | UPSTREAM.md; `tuning/*.json` canon |
| Kept game-side (v1.4 candidates) | Welded-hull outline, inversion pass, stepped afterimages | UPSTREAM.md |
| Shell RecoveryUI bug | Still present in 1.3.0; CSS workaround kept | UPSTREAM.md; boot check shows no overlay |
| Draw calls at peak density (40 enemies + 400 projectiles + 60 afterimages) | **250 → 129** (target ≤ 200) | captures/perf.json |
| Giant glyph exploit | Dedicated test (20% on-glyph, 6 off-glyph control); solver bot lands it 3× when it has Order | tests/giant.test.ts, tests/bots/giant-bot.test.ts |
| Art | Procedural pass: Markov to the redesign brief, all bosses + Child + Ishtar rebuilt, per-Law card art, Codex plates | captures/09, 20–27, 40–44, 51 |
| Bug found + fixed | Per-actor tints leaked into the shared material cache (walls turned pink) | commit "Fix shared-material tint leak" |
| Boss TTK | Unchanged, as asked | no tuning values changed |

## Evidence (current build)
- `npm run check` (typecheck + lint + 67 tests + build + headless boot): **exit 0** → captures/check-output.txt. Boot: 0 console errors, 0 warnings.
- Campaign bot: all **51 stages** on Savant (cold open → Ascent), 1 retry (3-4).
- Captures: **47** scenes/set pieces, 0 page errors → `captures/` (index.json).
- `slu-certify web` and `slu-certify controller`: **CERTIFIED** on 0.9.1 → captures/certify-web.txt, certify-controller.txt.

## Perf vs targets
| Metric | Target | Measured | Note |
|---|---|---|---|
| Sim step p95, 40 enemies + 400 projectiles | ≤ 3 ms | **1.13 ms** (p50 0.25) | Node, tests/perf.test.ts |
| Draw calls at peak density | ≤ 250 (new goal ≤ 200) | **129** | captures/perf.json |
| Frame p95 | ≤ 16.6 ms | 41 ms | SwiftShader CPU rasterizer in a headless container; **not measured on the 2019 MBP target** |
| JS heap | ≤ 600 MB | ~14 MB | |

## Needs Michael
1. **Spec contradiction — the Giant's exploit vs the unlock order.** The exploit is "Order-Delay its stomp", but Order unlocks in Trial 3 and the Giant is Trial 2's boss, so the exploit can't be used in its own campaign fight. It works in Boss Rush, revisits and the Laboratory. Options:
   - (a) grant Order for the Giant fight
   - (b) move the exploit onto Phase
   - (c) keep it as a revisit-only mastery route

   Logged in DECISIONS.md and not changed.
2. **Vercel token** to deploy.

## Honest shortfalls
- **Not deployed.**
- **No Meshy/Blender assets:** those tools are not connected. Markov, the bosses, the Law cards and the Codex art are procedural or SVG stand-ins, now more detailed, behind the manifest. ASSET_DELIVERY.md has the prompts.
- **Frame-time target unverified** on real hardware.
- **Audio never listened to; no VO recorded.**
- **Boss TTKs are short** for the expert bot (left as-is pending human playtest).
- **Balance is bot-tuned;** human playtest is the next gate.
- No mobile/touch.
- The first-compound "auto-trigger" is approximated by a hint.
