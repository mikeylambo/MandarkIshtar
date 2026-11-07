/**
 * Generates assets/manifest.json, ASSET_DELIVERY.md and AUDIO_DELIVERY.md from the typed game data.
 * Run: npx vite-node tools/gen-assets.ts
 */
import { writeFileSync } from "node:fs";
import { BARKS } from "../src/data/barks";
import { MUSIC_CUES, SFX_BANK } from "../src/data/audio";
import { CODEX } from "../src/data/codex";
import { LAWS } from "../src/data/laws";
import { LAW_ORDER } from "../src/sim/types";

type Entry = { file: string | null; kind: string; standIn: string };
const assets: Record<string, Entry> = {};
const add = (key: string, file: string, kind: string, standIn: string) => { assets[key] = { file, kind, standIn }; };

add("model.markov", "models/markov.glb", "model", "procedural figure (render/figures.ts markovFigure)");
add("model.markov.anims", "models/markov_anims.glb", "model", "procedural pose offsets");
const BOSSES = ["flame", "giant", "mirror", "king", "judge", "prophet", "child", "ishtar"];
for (const b of BOSSES) add(`model.boss.${b}`, `models/boss_${b}.glb`, "model", `procedural bossFigure("${b}")`);
for (const l of [...LAW_ORDER, "ishtar"]) add(`lawcard.${l}`, `cards/law_${l}.webp`, "image", "SVG sigil card");
for (const c of CODEX) add(`codex.${c.id}`, `codex/${c.id.replace(":", "_")}.webp`, "image", "text-only entry");
add("ui.glyphs", "ui/glyphs.svg", "image", "inline CSS/SVG glyphs");
for (const s of SFX_BANK) add(`sfx.${s.key}`, `sfx/${s.key}.ogg`, "audio", "WebAudio synth recipe (data/audio.ts)");
for (const m of MUSIC_CUES) for (const layer of m.layers) add(`music.${m.id}.${layer}`, `music/${m.id}_${layer}.ogg`, "audio", "ResolutionMusic synth layer");
for (const b of BARKS) add(`vo.${b.id}`, `vo/${b.id}.ogg`, "audio", "subtitle + voice blip");
writeFileSync("assets/manifest.json", JSON.stringify({ version: 1, note: "Drop a file at assets/<file> to override its stand-in; no code change.", assets }, null, 1));

// ---------------- ASSET_DELIVERY.md ----------------
const BOSS_PROMPTS: Record<string, string> = {
  flame: "A living pillar of layered flame shaped like stacked cones around a pale gold-white core; mathematical cathedral setting; cel-shaded, clean ink outlines; black void, white stone, deep blue space; no faces, no gore. Turnaround sheet, front/side/back.",
  giant: "A colossal figure of white stone blocks (stacked boxes, dodecahedral head), slow and heavy, casting a long crisp shadow; light-reveals-truth motif; cel-shaded, ink outlines, black/white/blue palette. Turnaround sheet. Non-humanoid proportions OK.",
  mirror: "An inverted Markov: same coat and silhouette with colours negated (white coat, black trim), standing behind a faint pane of glass; uncanny but elegant. Turnaround.",
  king: "A robed sovereign in deep blue with a floating five-point stone crown; posture of command; subjects implied by blue command-beam chevrons; cel-shaded, ink outlines.",
  judge: "A tall robed judge with a box-like stone head, holding a balance beam with two pans; a bell tower behind; austere, not cruel; cel-shaded, black/white/blue.",
  prophet: "A hooded figure in indigo with a hollow ring halo and a small octahedral core at the chest that opens when it stalls; star-chart motifs; cel-shaded, ink outlines.",
  child: "A small barefoot child in plain white, mid-skip, reaching to hold a hand; garden of white geometric flowers; soft, warm, joyful; cel-shaded.",
  ishtar: "The counterfeit morning star: a radiant octahedral core inside concentric tilted rings of gold and pale blue; beautiful and wrong; abstract, no human face; cel-shaded with bloom on gold/white.",
};
const MARKOV_BRIEF = `### Markov redesign brief (required before ship)
Keep: black/white/gold palette, long coat with white lapels and gold trim, gold drop earrings, lean build, composed menace, theatrical posture.
Change (to ship clear of the codename references):
- **Hair:** new swept-back geometric crest (planar, layered blades sweeping back), not spikes.
- **Eyes:** visible eyes behind thin **hexagonal half-rims** (lower-half frames), with a lens glint; no opaque white lenses.
- **Forehead mark:** the Engine's original **7-point sigil** (seven-pointed star, alternating long/short points) — see assets/icon.svg.
- **No ring motifs** anywhere in costume or effects (no Sonic-like gold rings).
- Ending variant "Lazar": white coat, gold trim.

**GPT concept prompt:** "Character turnaround sheet (front, 3/4, side, back) of Lazar Markov, a lean theatrical genius in a long black coat with crisp white lapels and thin gold trim, gold octahedral drop earrings, a swept-back geometric white hair crest made of planar blades, visible calm eyes behind thin hexagonal half-rim glasses, a small seven-pointed gold star sigil on the forehead; composed, slightly smug, regal posture; cel-shaded with 3-step toon ramp and clean ink outlines; neutral grey background; no rings, no spikes, no Egyptian iconography."`;

const rows: string[] = [];
rows.push("| Key | Asset | Source | Prompt / reference | Export spec | Status |", "|---|---|---|---|---|---|");
rows.push(`| model.markov | Markov | GPT concept → Meshy image-to-3D → Meshy auto-rig (humanoid) | See Markov redesign brief | glb, 1 u = 1 m, Y-up, −Z fwd, ≤ 25k tris, 2048² albedo, humanoid rig, clips per GDD §11 list | Stand-in: procedural figure in build |`);
rows.push(`| model.markov.anims | Markov animations (22 clips) | Meshy animation library + Mixamo retarget for gaps | idle ×3, walk/run blend, step, strike ×3, op-cast, hold-cast, null, taunt ×2, glasses-adjust, indignant, Q.E.D. snap, hit, stagger, defeat, stillness, Lazar dawn pose | Same glb or markov_anims.glb, root motion stripped | Stand-in: procedural pose offsets |`);
for (const b of BOSSES) {
  const rig = ["flame", "giant", "prophet"].includes(b) ? "**non-humanoid → Blender rigging**" : b === "child" ? "humanoid small (Meshy auto-rig)" : b === "ishtar" ? "abstract: procedural rings + Meshy core" : b === "mirror" ? "reuses Markov model, inverted shader" : b === "judge" ? "Meshy, custom rig" : "Meshy humanoid";
  rows.push(`| model.boss.${b} | ${b} | GPT concept → Meshy image-to-3D; ${rig} | ${BOSS_PROMPTS[b]} | glb ≤ 40k tris, 2048², Y-up −Z fwd | Stand-in: procedural bossFigure |`);
}
for (const l of [...LAW_ORDER, "ishtar" as const]) {
  const L = LAWS[l];
  rows.push(`| lawcard.${l} | Law card: ${L.name} | GPT illustration (legend-card framing) | "Tarot-like vertical card illustration for '${L.name}' — '${L.rule}' — cathedral of perfect white solids, gold and blue glyph ornaments, black void, deep blue cosmic depth; no text; ornamental border." | 1024×1536 WebP, palette-clamped to gold/blue/black | Stand-in: SVG sigil card |`);
}
for (const c of CODEX) rows.push(`| codex.${c.id} | Codex: ${c.title} | GPT illustration | "Engraved-style illustration for the codex entry '${c.title}', white geometry on black, gold/blue accents, quiet and precise." | 1024² WebP, palette clamp | Stand-in: text entry |`);
rows.push(`| ui.glyphs | UI glyph sheet | AI 2D concept → hand-vectorized SVG | cuneiform-meets-math glyphs for ops (Vector arrow, Phase ghost, Order clock, Null slash), seals, ranks | SVG sprite sheet | Stand-in: inline glyphs |`);
rows.push(`| (procedural) | Arenas, Observatory, Theorems, VFX, Ishtar's rings | Procedural, final quality | world/ArenaKit.ts, render/figures.ts, vfx/Vfx.ts | runtime | **Final** |`);

writeFileSync("ASSET_DELIVERY.md", `# ASSET_DELIVERY — Mandark Ishtar

Michael's production checklist. Every asset resolves through \`assets/manifest.json\` (key → file). Drop a delivered file at \`assets/<file>\` and it overrides the stand-in with **no code change**; missing files fall back silently and are listed by \`__dev.assetsMissing()\`.

Meshy/Blender MCP tools were **not** connected in the build session, so nothing below was generated; every row is a stand-in.
Cleanup: \`tools/blender/cleanup.py\` (apply transforms, decimate to budget, merge materials, toon-ready vertex colours, export glb Y-up −Z forward).
Non-humanoid rigs flagged for Blender rigging: **Flame, Giant, Prophet**.

${MARKOV_BRIEF}

## Assets

${rows.join("\n")}

## Audio, VO
See AUDIO_DELIVERY.md (${SFX_BANK.length} SFX, ${MUSIC_CUES.length} music cues, ${BARKS.length} barks).
`);

// ---------------- AUDIO_DELIVERY.md ----------------
const NOTE = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const key = (root: number, mode: string) => `${NOTE[root % 12]} ${mode}`;
const cueRows = MUSIC_CUES.map((m) => `| ${m.id} | ${m.bpm} | ${key(m.root, m.mode)} | ${m.loopBars} bars (loop 0 → end of bar ${m.loopBars}) | ${m.layers.join(", ")} | ${m.id.startsWith("law.") ? "4 harmonic-step layers (step 1–4 pull the progression to the tonic) + V→I cadence sting" : m.id === "descent" ? "Stems removed one per gate (7 → 0)" : m.id === "ishtar" ? "Phase 3 near-silence → dawn chord stem" : "—"} | ${m.description} |`).join("\n");
const sfxRows = SFX_BANK.map((s) => `| ${s.key} | ${s.cat} | ${s.description} | sfx/${s.key}.ogg | synth stand-in |`).join("\n");
const barkRows = BARKS.map((b) => `| ${b.id} | ${b.speaker} | ${b.context}${b.phase ? ` (${b.phase})` : ""} | ${b.line.replace(/\|/g, "\\|")} | vo/${b.id}.ogg |`).join("\n");
writeFileSync("AUDIO_DELIVERY.md", `# AUDIO_DELIVERY — Mandark Ishtar

Engine: shell \`AudioMixer\` (buses master/music/sfx/ui/voice/ambience) over a game WebAudio \`AudioEngine\` + adaptive \`ResolutionMusic\` (src/audio). All sounds are synthesized placeholders behind manifest keys; a delivered OGG at the listed path overrides its key.
Specs: 48 kHz OGG/Opus, VO normalized −16 LUFS, trimmed. Music: per-layer stems with loop-point markers and BPM/key metadata.
Mix rules: VO ducks music −6 dB; Null ducks all SFX −18 dB for 6f; Contradiction and Q.E.D. always cut through; max 24 voices, priority threat telegraphs > Markov ops > enemy SFX > ambience.
**Voice of Markov: Michael.** ElevenLabs placeholders for Ishtar/bosses are optional (none generated in this build).

## Music cues (audio as proof: motifs unresolved → harmonic steps per Contradiction → cadence on Q.E.D.)
| Cue | BPM | Key | Loop | Stems | Harmonic layers | Notes |
|---|---|---|---|---|---|---|
${cueRows}

## SFX (${SFX_BANK.length})
| Key | Category | Description | File | Status |
|---|---|---|---|---|
${sfxRows}

## Bark sheet (${BARKS.length} lines; ${BARKS.filter((b) => b.speaker === "markov").length} Markov)
| File key | Speaker | Context | Line | File |
|---|---|---|---|---|
${barkRows}
`);
console.log(`manifest: ${Object.keys(assets).length} keys; barks ${BARKS.length}; sfx ${SFX_BANK.length}`);
