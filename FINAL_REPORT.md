# Final Report — Mandark Ishtar (build 0.9.0)

**Branch:** `claude/nifty-volta-56xcau` · **Commit:** see `git log` (report written at 12327ef) · **Shell:** @slu/web-shell `main@6f08d17` (v1.1.0), pinned git dependency · **v1.3 Look Kit / game-feel kit:** **not present** → game-local with `// UPSTREAM:` markers.
**Deployed URL:** **none — not deployed.** The Vercel token was declined in-session; `vercel.json` and `npm run deploy:preview` are ready.

## Evidence
- `npm run check` (typecheck + lint + 64 tests + build + headless boot): **exit 0** → captures/check-output.txt. Boot: 0 console errors, 0 warnings.
- `slu-certify web` / `slu-certify controller`: **CERTIFIED** → captures/certify-web.txt, certify-controller.txt.
- Captures: 46 scenes/set pieces in `captures/` (index.json: 0 page errors).
- Campaign bot: **all 51 stages, cold open → Ascent, on Savant**, 1 retry (3-4), 42.8 sim-minutes → captures/campaign-report.json.

## Perf vs targets
| Metric | Target | Measured | Note |
|---|---|---|---|
| Sim step p95 at 40 enemies + 400 projectiles | ≤ 3 ms | **0.76 ms** (p50 0.20) | Node, tests/perf.test.ts |
| Draw calls at peak density | ≤ 250 | **250** | met, zero headroom |
| Frame p95 | ≤ 16.6 ms | 51 ms | **SwiftShader CPU rasterizer**; not the 2019 MBP GPU — unmeasured on target hardware |
| JS heap | ≤ 600 MB | ~10 MB | |

## Definition of Done
| Item | | Evidence |
|---|---|---|
| Every op and compound per spec | ✅ | tests/compounds.test.ts (12 compounds, 17/18/19f window, 30f assist) |
| Every enemy has a working exploit | ✅ | tests/exploits.test.ts (8 Theorems at 100%) |
| 7 bosses, Descent, Ishtar completable | ✅ | campaign bot; tests/bosses.test.ts |
| All modes functional | ✅ | tests/bots/modes.test.ts (Time Attack all 7 complete; Score Attack/Boss Rush runs end on a loss mid-run — valid arcade outcome) |
| No soft-locks | ✅ (bot-level) | invariants: every encounter terminates for solver and passive bots |
| 28 arenas + 7 boss arenas + 7 gates + Ishtar + hub + Ascent + Laboratory | ✅ exist · ⚠️ "tuned" only by bot | data/trials.ts, data/descent.ts |
| 21 Theorems / Codex / 8 Law cards | ✅ / ✅ 27 (GDD lists 27; states 26) / ✅ SVG stand-in art | |
| Toon/outline/inversion/afterimages, 15 VFX families | ✅ | captures, tests/audio.test.ts |
| Adaptive music resolver (placeholder stems) | ✅ code · ❌ never heard | headless; no audio verification |
| All barks subtitled; stand-ins behind manifest | ✅ | 122 lines; assets/manifest.json (290 keys) |
| KBM + pad full flow, remapping, settings persist | ✅ code · ❌ no physical gamepad tested | |
| Zero console errors in a full playthrough | ✅ sim bots · ⚠️ browser: boot + capture runs clean, not a full browser campaign | |
| 60 fps on target hardware | ❌ unmeasured | no target device |
| Saves round-trip and migrate | ✅ | tests/save.test.ts (v0 fixture, corrupt-primary → backup) |
| Deployed to Vercel, PWA installable | ❌ not deployed · ⚠️ PWA files present, install untested | |
| Crash/diagnostic bundle | ✅ | Settings → Export diagnostics; `__dev.bundle()` |

## Definition of Great — approximations
1. **Solve-first:** bots win only via principle exploits (Strike share small); needs human playtest.
2. **Elegance pull:** ranks + par ops shipped; replay intent needs playtest.
3. **Prophet moment:** fixed loop predicted 86.8%; Stillness opens the core (30%); the laugh needs humans.
4. **Child lands:** attacking bot never progresses, following bot completes; the 70%-in-30s metric needs telemetry from people.
5. **Descent hits:** regalia removal + music instrument loss + bark arc implemented; emotional response needs humans.

## UPSTREAM candidates for @slu/web-shell
`src/look/LookKit.ts` (toon ramp, smoothed-hull outline, inversion pass, stepped afterimages) · `src/feel/FeelKit.ts` + `data/feel.ts` recipe table · bug: `mountRecoveryUI` is visible at mount (inline `display:grid` beats `hidden`).

## Honest shortfalls
- **Not deployed** (no Vercel credentials).
- **Frame-time target unverified** on real hardware; headless numbers are software-rendered.
- **Audio never listened to**; synthesized placeholders only. No VO recorded (Michael is the intended voice).
- **No Meshy/Blender assets** (tools not connected): Markov, bosses, Law cards and Codex art are procedural/SVG stand-ins.
- **Boss TTKs are short** for the expert bot (15–80 s; Mirror ~4 min) vs GDD's 3–5 min for first-timers; not inflated without human data.
- **Bot-verified ≠ fun-verified**: balance was tuned against bots; human playtest is the next gate.
- Mobile/touch controls not implemented (GDD scope is KBM + pad).
- First-compound "auto-trigger" is approximated by a hint (see DECISIONS.md).
- Giant's glyph exploit never fired in bot runs (bots win via shadow hits); it is unit-reachable but not bot-proven.
