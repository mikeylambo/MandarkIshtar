# Mandark Ishtar (codename)

A 3D arena action-puzzle game for the web: a theatrical genius **solves** enemies instead of fighting them — then gives every power away.
Built on **@slu/web-shell 1.3.0** (pinned to `main@7003ec7`; Look Kit + Game-Feel Kit, see [UPSTREAM.md](UPSTREAM.md)) + Three.js r180. Design: `GDD.md` (source of truth, not in repo) · decisions: [DECISIONS.md](DECISIONS.md) · tuning: [TUNING_LOG.md](TUNING_LOG.md) · production checklists: [ASSET_DELIVERY.md](ASSET_DELIVERY.md), [AUDIO_DELIVERY.md](AUDIO_DELIVERY.md).

## Run
```bash
npm install
npm run dev          # http://localhost:5173  (add ?dev=1 for the shell dev console)
npm run check        # typecheck + lint + unit/invariant/bot tests + build + headless boot (zero console errors/warnings)
npm run captures     # screenshots of every scene/set piece → captures/
npm run perf         # browser perf sample at peak density → captures/perf.json
npx vite-node tools/gen-assets.ts   # regenerate assets/manifest.json + delivery docs from data
```

## Controls
| | KBM | Pad |
|---|---|---|
| Move / Aim | WASD / mouse | L-stick / R-stick |
| Vector · Phase · Order · Null | LMB · RMB · Q · E (tap or hold 20f) | RB · LB · RT · LT |
| Step · Strike · Hubris | Space/Shift · F/MMB · T | A · X · D-pad Up/L3 |
| Pause · Law card | Esc · Tab | Start · Select |
Stillness: do nothing for one second. Everything is remappable (Settings → Controls).

## Layout
`src/sim` fixed 60 Hz deterministic world (no Three, no wall clock, seeded RNG) · `src/ops` input intent, targeting, ops, 12 compounds · `src/combat` Certainty ledger, elegance scorer · `src/laws` · `src/actors` 8 Theorems, 7 bosses, Child, Ishtar · `src/campaign` · `src/modes` · `src/render` `src/look` `src/feel` `src/vfx` `src/world` presentation · `src/audio` · `src/ui` · `src/meta` saves · `src/dev` `window.__dev` + bots · `src/data` every tuning/content table.

## Dev hooks (`window.__dev`)
`snapshot() spawn(type,x,z) setLaw(law,tier) grantRegalia(r) removeRegalia(r) setFocus/setSeals/setHubris(n) jump(id) startTrial(n) timeScale(s) seed(n) runBot("solver"|"passive"|"none") screenshot() perf() stress() bundle() freezeOn(eventType)`.

## Deploy
Static Vite build → Vercel (`vercel.json`, `npm run deploy:preview`). PWA: `assets/manifest.webmanifest` + `assets/sw.js`.
