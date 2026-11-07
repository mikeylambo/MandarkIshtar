# TUNING_LOG — Mandark Ishtar
Format: value · old → new · why · evidence. LOCKED values are not touched.

## Feel Gate self-review (Step 2) — "Must never feel" cells
| Action | Must never feel | Self-review | Evidence |
|---|---|---|---|
| Vector Push | Like throwing a ball | Push is instant on the active frame (no arc), 22 u/s straight line, gold vector line along the new path, 3f target-local hitstop, 0.1 u camera nudge | tests/feel.test.ts; captures/06-coldopen-redirect.png |
| Vector Orbit | Clunky tether | Orbit is a rigid 3 u circle at 4 rad/s, chime per contact, auto-fling along aim at the end | tests/compounds (orbit path), Vfx orbit-ring |
| Phase | Cheap invincibility spam | Gated by 25 Focus; 60f only; no Strike while spectral; exit snaps 0.6 u to safe ground | MarkovController.exitPhase |
| Order Delay | A generic slow-mo bubble | Per-target local time ×0.25 (not a field), clock-stamp ring on the target | OpSystem.delay |
| Order Reverse | Visual confusion | Path drawn as stepped gold history + afterimages; projectiles home to origin | vfx rewind-trail |
| Null Cancel | Like a shield block | Target implodes to a point; SFX bus ducked −18 dB for 6f then "tk" | AudioEngine.duckSfx |
| Contradiction | Ordinary damage | Global 8f hitstop, red fracture lines, choir+glass, 0.3 u punch, 100% haptic | captures/07, 11 |
| Q.E.D. | Gory or brutal | Inversion 8f, gold fold-in (sparks implode), cadence; no blood, no dismemberment | captures/08, 28 |
| Room clear | Long or unskippable | 45f, skippable after 15f by any input; rotation disabled by Reduce Motion | World.step flourish |
| Step | A roll or a stumble | 4.5 u blink over 3 frames with 3 discrete afterimages; stutter (1 u, thud) when empty | captures/12 |
| Strike | Satisfying as a main attack | 2 Certainty, "tik", 20% move speed; bots show Strike share of damage ≪ 10% except the Giant shadow | ledger.dealt in diag |
| Hubris taunt | Without risk | Hit during taunt −30 Hubris + embarrassed bark; at 100 the next hit Shatters | MarkovController.hit |
| Hubris Shatter | Unfair | Telegraphed: meter turns red and shakes at 100 | ui/styles .hubris.full |
| Insight | Like a pause or a cheat | World ×0.7 only, Markov unaffected, lines drawn in white; interrupted by a hit; 300f cooldown | tests/compounds (Insight) |

Input-to-motion latency: **1 frame** in sim (move applied on the input's own step; accel 0→top in 6f, decel 4f, exact). tests/feel.test.ts.

## Changes
| Value | Old → New | Why | Evidence |
|---|---|---|---|
| Markov hitstun vulnerability | vulnerable → invulnerable | Spec state table; a 3-bolt Iterator fan removed 3 Seals in one frame | trace of 3-1 (frame 445: 3× SealLost) |
| Boss damage from raw redirects | 25 → 6 (Giant shadow 12) | Bosses were dying to generic sconce redirects, bypassing their principle (Judge 22 s) | diag ledger.dealt {"redirect":250} on 5-B |
| Freed subject blows | every 45f → one blow then filed | King died in ~10 s to a freed swarm | diag 4-B 10 s |
| King crown strip | no cooldown → 240f | Repeated 40% strips trivialized P3 | diag 4-B |
| Prophet stall | until any non-idle window → closes after one Stillness exploit; times out at 300f | Prophet died in 6 s; passive player stalemated gate 6 | diag 6-B 6 s; invariants passive gate-6 timeout |
| Flame wave growth | 0.22 → 0.12 u/f | 13 u/s ring could not be crossed with Step i-frames (6f) | 1-B losses to flameWave ×5 |
| Giant clap growth | 0.30 → 0.13 u/f | Same as above | 2-B losses to clap |
| Ishtar radiant line spacing / width | 3 u / 0.8 → 4.5 u / 0.7 | Safe slot between lines was 0.6 u; unreadable | ishtar losses to radiantLine ×6 |
| Mirror echo Certainty (gate 3) | 100 → 60 | Gate ran 290–560 s vs the 60–90 s spec | diag gate-3 |
| Prophet echo volley | none → every 260f | Gate 6 had no pressure; passive play never ended | invariants test |

## Known tuning debts (need human playtest)
- Boss TTKs for the expert solver bot are 15–80 s (Mirror ~4 min); GDD targets 3–5 min for a *competent first-timer*. Not tuned upward without human data.
- Score Attack and Boss Rush bot runs end on a loss partway (arcade rules); campaign has retries.

## Performance
| Value | Old → New | Why | Evidence |
|---|---|---|---|
| Theorem contact-shadow mesh | on → off (Markov/bosses keep it) | Peak density measured 281 draw calls vs ≤ 250 | captures/perf.json: 281 → 250 |
| Theorem rendering | per-actor Group (body + outline + ring ≈ 3 draws each) → per-type InstancedMesh (solid/ghost/outline) + one instanced Certainty-ring draw | Draw-call headroom for new art | captures/perf.json: 188 → 103 at 40 enemies + 400 projectiles + 60 afterimages |
| Shell 1.3 VFX + instanced afterimages | own spark/ring pools + 60 afterimage meshes → shell pooled VFX + one InstancedMesh | Same | 250 → 188 |
