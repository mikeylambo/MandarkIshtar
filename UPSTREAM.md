# UPSTREAM — candidates for @slu/web-shell v1.4

Shell in use: **@slu/web-shell 1.3.0** (`main@7003ec7`, "Release v1.3.0"). The repo has no `v1.3.0` git tag; the dependency is pinned to the commit.

## Adopted from 1.3 (game-local code deleted)
| Game had | Now uses |
|---|---|
| 3-step toon ramp + `MeshToonMaterial` cache | `look.material("slu.lit")` (banded toon, shadow-tint token, spec blob), tuned by `tuning/look.mat.lit.json` |
| Hand-written outline `ShaderMaterial` | `look.materials.createOutlineMaterial()` / `createOutline()` (`look.mat.outline`) |
| Own `EffectComposer` (RenderPass + Unreal bloom + Output) | `look.post` PostStack (bloom, grade, vignette, FXAA, flash, chromatic/bloom/vignette pulses), `tuning/look.post.json` |
| Hard-coded palette constants for post/VFX | `look.palette` tokens via `tuning/look.palette.json` (ember = Markov gold, edge/soul = Law blue, danger = break red, highlight = grace white) |
| Own spark/ring pools (≈900 sparks + 48 ring meshes) | `look.vfx` runtime: `fx.impact.burst`, `fx.shockwave.ring`, `fx.charge.up` |
| Own screen-shake (random jitter) | `FeelDirector.shake` (trauma², Perlin, accessibility-scaled) |
| Own flash/pulse envelopes | `FeelDirector` impact bundles `mi.*` → `look.pulse` / `look.post.flashColor` |
| Haptic rumble | still shell `BrowserHaptics` (the catalog has mobile patterns the FeelDirector `Rumble` lacks) |

Hitstop is **not** moved to `FeelDirector.time`: the game's hitstop is part of the deterministic sim (`World.hitstop`), and bundles carry `hitstopMs: 0`.

## Kept in the game — proposed for v1.4
1. **Smoothed-hull outline** (`src/look/LookKit.ts` `hullGeometry`/`withOutline`). `createOutline` reuses the mesh's flat-shaded geometry, so faceted solids (tetra/octa/dodeca/box) split at every edge and the hull shows gaps. Fix: build the hull from `mergeVertices(position-only clone)` + `computeVertexNormals()`, cached per geometry. Proposed API: `look.outline(mesh, { weld: true })`.
2. **Full-screen inversion pass** (`InversionShader`): colour inversion as the "event" (Q.E.D., Phase, room clear) with an accessibility alternative (gold rim pulse), plus desaturation and a white grace mix. Inserted after the grade in `look.post.composer`. Proposed: `look.post.pulse("invert", frames)` honouring `accessibility.flashes` and a `rim` mode.
3. **Stepped afterimages** (`Afterimages`): discrete, never motion-blurred ghosts that step gold → blue → gone, all in one `InstancedMesh`. Proposed: `look.vfx.play("fx.afterimage.step", { target, tint, steps: 3 })`.

## Shell bugs
- **`mountRecoveryUI` is visible at mount (still present in 1.3.0).** It sets `wrap.hidden = true`, but its inline `display:grid` overrides the `hidden` attribute, so the dark overlay and dialog show immediately and block the game. Game workaround: `[role=alertdialog][hidden]{display:none!important}` in `src/ui/styles.ts` (plus an explicit `hide()` after mount). Fix upstream: toggle `style.display` instead of (or as well as) `hidden`.
- `npm audit` reports critical advisories in `vitest`'s transitive `tinypool` (dev-only); not shell code.
