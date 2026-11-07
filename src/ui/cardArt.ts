/**
 * Procedural vector art for the 8 Law cards and the Codex plates (stand-ins behind manifest keys
 * `lawcard.*` / `codex.*`; a delivered WebP overrides them). Palette: gold = Markov, blue = Law, white = grace, black void.
 */
const G = "#f2b94a", G2 = "#ffd77a", B = "#4f8dff", B2 = "#9fc0ff", W = "#fff6e0", K = "#05060b";

function frame(inner: string, seed: number, warm = false): string {
  let stars = "";
  let s = seed * 9301 + 49297;
  for (let i = 0; i < 46; i++) { s = (s * 9301 + 49297) % 233280; const x = (s / 233280) * 200 + 10; s = (s * 9301 + 49297) % 233280; const y = (s / 233280) * 200 + 10; stars += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.4 + (i % 3) * 0.35).toFixed(2)}" fill="${warm ? W : "#cfd9ff"}" opacity="${0.35 + (i % 4) * 0.15}"/>`; }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220" width="100%" height="100%">
  <defs><radialGradient id="bg${seed}" cx="50%" cy="42%" r="70%"><stop offset="0" stop-color="${warm ? "#2a2416" : "#16224a"}"/><stop offset="1" stop-color="${K}"/></radialGradient></defs>
  <rect width="220" height="220" fill="url(#bg${seed})"/>${stars}
  <circle cx="110" cy="110" r="100" fill="none" stroke="${G}" stroke-width="0.8" opacity="0.55"/>
  <circle cx="110" cy="110" r="94" fill="none" stroke="${G}" stroke-width="0.4" opacity="0.4" stroke-dasharray="1 5"/>
  ${inner}</svg>`;
}
const star7 = (cx: number, cy: number, r: number, stroke = G, sw = 1.6, fill = "none") => {
  let d = ""; for (let i = 0; i <= 14; i++) { const a = (i / 14) * Math.PI * 2 - Math.PI / 2; const rr = i % 2 ? r * 0.42 : r; d += `${i ? "L" : "M"}${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`; }
  return `<path d="${d}Z" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>`;
};

export const LAW_ART: Record<string, () => string> = {
  reflection: () => frame(`
    <polygon points="110,58 150,140 70,140" fill="#bfe0ff" fill-opacity="0.18" stroke="${B2}" stroke-width="2"/>
    <line x1="22" y1="150" x2="92" y2="112" stroke="${G}" stroke-width="2.5"/>
    <polyline points="92,112 132,104 196,64" fill="none" stroke="${G2}" stroke-width="2"/>
    <polyline points="196,64 150,170 22,150" fill="none" stroke="${G}" stroke-width="1.2" stroke-dasharray="4 4" opacity="0.8"/>
    <circle cx="22" cy="150" r="6" fill="none" stroke="${G}" stroke-width="2"/>${star7(196, 64, 7, G2, 1.2)}`, 1),
  shadow: () => frame(`
    <circle cx="62" cy="62" r="14" fill="${W}" opacity="0.95"/><circle cx="62" cy="62" r="24" fill="none" stroke="${W}" stroke-width="0.6" opacity="0.5"/>
    <rect x="98" y="88" width="26" height="62" fill="#e9e6dc" stroke="${K}" stroke-width="2"/>
    <polygon points="98,150 124,150 196,196 150,196" fill="${K}" opacity="0.85"/>
    <polygon points="98,150 124,150 196,196 150,196" fill="none" stroke="${B}" stroke-width="1.2"/>`, 2),
  recurrence: () => frame(`${[0, 1, 2, 3].map((i) => { const s = 1 - i * 0.2, w = 70 * s, h = 96 * s, x = 110 - w / 2 + i * 8, y = 70 + i * 10; return `<path d="M${x},${y + h} L${x},${y + w / 2} A${w / 2},${w / 2} 0 0 1 ${x + w},${y + w / 2} L${x + w},${y + h}" fill="none" stroke="${i ? B2 : B}" stroke-width="${2 - i * 0.35}" opacity="${1 - i * 0.2}"/>`; }).join("")}
    <path d="M60,176 C90,160 130,160 160,176" fill="none" stroke="${G}" stroke-width="1.6"/><path d="M152,170 L160,176 L150,180" fill="none" stroke="${G}" stroke-width="1.6"/>`, 3),
  dominion: () => frame(`
    <path d="M70,70 L80,46 L95,64 L110,40 L125,64 L140,46 L150,70 Z" fill="#e9e6dc" stroke="${B}" stroke-width="2"/>
    ${[40, 75, 110, 145, 180].map((x) => `<line x1="110" y1="74" x2="${x}" y2="160" stroke="${B}" stroke-width="1.3" stroke-dasharray="6 3"/><polygon points="${x - 9},170 ${x + 9},170 ${x},156" fill="#e9e6dc" stroke="${K}" stroke-width="1.5"/>`).join("")}
    <polygon points="171,170 189,170 180,156" fill="${G}" opacity="0.9"/>`, 4),
  judgment: () => frame(`
    <line x1="110" y1="50" x2="110" y2="170" stroke="#e9e6dc" stroke-width="3"/><line x1="56" y1="78" x2="164" y2="70" stroke="#e9e6dc" stroke-width="3"/>
    <path d="M40,118 Q56,134 72,118" fill="none" stroke="${B2}" stroke-width="2"/><line x1="56" y1="78" x2="44" y2="118" stroke="${B2}"/><line x1="56" y1="78" x2="68" y2="118" stroke="${B2}"/>
    <path d="M148,110 Q164,126 180,110" fill="none" stroke="${B2}" stroke-width="2"/><line x1="164" y1="70" x2="152" y2="110" stroke="${B2}"/><line x1="164" y1="70" x2="176" y2="110" stroke="${B2}"/>
    <path d="M96,40 Q110,22 124,40 L128,50 L92,50 Z" fill="#d8c79a" stroke="${K}" stroke-width="1.2"/><rect x="82" y="168" width="56" height="8" fill="#e9e6dc"/>`, 5),
  prophecy: () => frame(`
    <path d="M40,110 Q110,50 180,110 Q110,170 40,110 Z" fill="none" stroke="${B2}" stroke-width="2"/>
    <circle cx="110" cy="110" r="24" fill="none" stroke="${B}" stroke-width="3"/><circle cx="110" cy="110" r="9" fill="${B2}"/>
    ${[[50, 50], [80, 34], [150, 40], [182, 70], [176, 160], [60, 172]].map(([x, y], i, a) => `<circle cx="${x}" cy="${y}" r="2" fill="${W}"/>${i ? `<line x1="${a[i - 1]![0]}" y1="${a[i - 1]![1]}" x2="${x}" y2="${y}" stroke="${W}" stroke-width="0.6" opacity="0.6"/>` : ""}`).join("")}
    <circle cx="150" cy="150" r="12" fill="none" stroke="${B}" stroke-width="1.5" stroke-dasharray="3 3"/>`, 6),
  innocence: () => frame(`
    ${[[60, 176], [74, 160], [86, 146], [100, 134], [114, 124], [128, 116]].map(([x, y], i) => `<ellipse cx="${x + (i % 2) * 6}" cy="${y}" rx="3.2" ry="5" fill="${W}" opacity="${0.4 + i * 0.1}" transform="rotate(-35 ${x} ${y})"/>`).join("")}
    ${[0, 1, 2, 3, 4, 5].map((i) => { const a = (i / 6) * Math.PI * 2; return `<ellipse cx="${150 + Math.cos(a) * 14}" cy="${84 + Math.sin(a) * 14}" rx="9" ry="5" fill="#ffffff" stroke="${B2}" stroke-width="0.8" transform="rotate(${(a * 180) / Math.PI} ${150 + Math.cos(a) * 14} ${84 + Math.sin(a) * 14})"/>`; }).join("")}
    <circle cx="150" cy="84" r="7" fill="${G2}"/><line x1="150" y1="98" x2="146" y2="140" stroke="#e9e6dc" stroke-width="2"/>`, 7, true),
  ishtar: () => frame(`
    ${[30, 46, 62].map((r, i) => `<ellipse cx="110" cy="104" rx="${r + 30}" ry="${r * 0.45}" fill="none" stroke="${i % 2 ? G2 : B2}" stroke-width="1" opacity="0.8" transform="rotate(${i * 25 - 20} 110 104)"/>`).join("")}
    ${Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2, r = i % 2 ? 34 : 56; return `<polygon points="110,104 ${110 + Math.cos(a + 0.12) * 14},${104 + Math.sin(a + 0.12) * 14} ${110 + Math.cos(a) * r},${104 + Math.sin(a) * r} ${110 + Math.cos(a - 0.12) * 14},${104 + Math.sin(a - 0.12) * 14}" fill="${W}" opacity="0.92"/>`; }).join("")}
    <rect x="10" y="176" width="200" height="34" fill="#2a2416" opacity="0.7"/><line x1="10" y1="176" x2="210" y2="176" stroke="${G2}" stroke-width="1"/>`, 8, true),
};

function theoremPlate(type: string): string {
  const shapes: Record<string, string> = {
    axiom: `<polygon points="110,52 160,150 60,150" fill="none" stroke="${W}" stroke-width="2"/><line x1="110" y1="52" x2="118" y2="128" stroke="${W}" stroke-width="1.2"/><line x1="118" y1="128" x2="60" y2="150" stroke="${W}" stroke-width="1.2"/><line x1="118" y1="128" x2="160" y2="150" stroke="${W}" stroke-width="1.2"/>`,
    corollary: `<polygon points="110,46 158,110 110,174 62,110" fill="none" stroke="${W}" stroke-width="2"/><line x1="62" y1="110" x2="158" y2="110" stroke="${W}" stroke-width="1.2"/><line x1="110" y1="46" x2="124" y2="110" stroke="${W}"/><line x1="124" y1="110" x2="110" y2="174" stroke="${W}"/>`,
    variable: `<rect x="70" y="80" width="64" height="64" fill="none" stroke="${W}" stroke-width="2"/><polyline points="70,80 92,60 156,60 156,124 134,144" fill="none" stroke="${W}" stroke-width="1.6" stroke-dasharray="5 4"/><line x1="134" y1="80" x2="156" y2="60" stroke="${W}" stroke-dasharray="5 4"/>`,
    constant: Array.from({ length: 5 }, (_, i) => { const a = (i / 5) * Math.PI * 2 - Math.PI / 2; return `${110 + Math.cos(a) * 50},${110 + Math.sin(a) * 50}`; }).join(" ").replace(/^/, `<polygon points="`) + `" fill="none" stroke="${W}" stroke-width="2.4"/><circle cx="110" cy="110" r="22" fill="none" stroke="${W}" stroke-width="1"/>`,
    iterator: `<ellipse cx="110" cy="110" rx="56" ry="24" fill="none" stroke="${W}" stroke-width="2"/><ellipse cx="110" cy="110" rx="26" ry="9" fill="none" stroke="${W}" stroke-width="1.4"/>${[-1, 0, 1].map((k) => `<line x1="110" y1="110" x2="${110 + k * 40}" y2="40" stroke="${B}" stroke-width="1.2"/>`).join("")}`,
    paradox: `<circle cx="78" cy="110" r="26" fill="none" stroke="${W}" stroke-width="2"/><circle cx="142" cy="110" r="26" fill="none" stroke="${W}" stroke-width="2"/><line x1="104" y1="110" x2="116" y2="110" stroke="${B}" stroke-width="3"/>`,
    oracle: `<circle cx="110" cy="110" r="44" fill="none" stroke="${W}" stroke-width="2" stroke-dasharray="2 3"/><circle cx="110" cy="110" r="16" fill="none" stroke="${B}" stroke-width="3"/><circle cx="168" cy="72" r="8" fill="none" stroke="${B2}" stroke-width="1.5"/><line x1="122" y1="102" x2="162" y2="76" stroke="${B2}" stroke-dasharray="3 3"/>`,
    herald: `<polygon points="110,40 136,170 84,170" fill="none" stroke="${W}" stroke-width="2"/><polygon points="110,52 160,64 110,80" fill="${B}" opacity="0.8"/>`,
  };
  return frame(shapes[type] ?? star7(110, 110, 50), type.length + 20);
}

const STORY: Record<string, () => string> = {
  babel: () => frame(`${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${70 + i * 6}" y="${170 - i * 20}" width="${80 - i * 12}" height="20" fill="none" stroke="${W}" stroke-width="1.6"/>`).join("")}<line x1="110" y1="50" x2="110" y2="30" stroke="${G}" stroke-width="1.2"/>${star7(110, 28, 6, G, 1)}`, 31),
  engine: () => frame(`${star7(110, 110, 62, G, 2)}${star7(110, 110, 30, G2, 1.2)}<circle cx="110" cy="110" r="8" fill="${G2}"/>`, 32),
  name: () => frame(`<rect x="10" y="150" width="200" height="60" fill="#3a2f18" opacity="0.6"/><circle cx="110" cy="150" r="44" fill="${W}" opacity="0.9"/>${Array.from({ length: 11 }, (_, i) => { const a = Math.PI + (i / 10) * Math.PI; return `<line x1="${110 + Math.cos(a) * 52}" y1="${150 + Math.sin(a) * 52}" x2="${110 + Math.cos(a) * 92}" y2="${150 + Math.sin(a) * 92}" stroke="${W}" stroke-width="1.4" opacity="0.7"/>`; }).join("")}<line x1="10" y1="150" x2="210" y2="150" stroke="${G2}" stroke-width="1.2"/>`, 33, true),
  descent: () => frame(`${Array.from({ length: 7 }, (_, i) => { const s = 1 - i * 0.11, w = 90 * s, x = 110 - w / 2, y = 40 + i * 18; return `<path d="M${x},${y + w * 0.6} L${x},${y + w / 2} A${w / 2},${w / 2} 0 0 1 ${x + w},${y + w / 2} L${x + w},${y + w * 0.6}" fill="none" stroke="${i < 6 ? "#9a9890" : W}" stroke-width="${1.8 - i * 0.15}"/>`; }).join("")}`, 34),
  ishtar: () => LAW_ART.ishtar!(),
};

const BOSS_SILHOUETTE: Record<string, string> = {
  flame: `<path d="M110,40 C140,80 150,110 138,150 C130,170 90,170 82,150 C70,120 96,100 92,80 C104,96 108,70 110,40 Z" fill="#ff9a3a"/><circle cx="110" cy="138" r="12" fill="${W}"/>`,
  giant: `<rect x="80" y="120" width="60" height="58" fill="#e9e6dc"/><rect x="70" y="70" width="80" height="54" fill="#e9e6dc"/><polygon points="98,40 122,40 130,64 90,64" fill="#e9e6dc"/><rect x="96" y="52" width="28" height="3" fill="${B}"/><polygon points="80,178 140,178 200,206 120,206" fill="${K}" opacity="0.9"/>`,
  mirror: `<polygon points="110,40 164,72 164,148 110,180 56,148 56,72" fill="none" stroke="${B2}" stroke-width="2"/><path d="M110,70 C122,70 124,92 116,100 L132,160 L88,160 L104,100 C96,92 98,70 110,70 Z" fill="#f2f0ea"/>`,
  king: `<path d="M74,176 L94,96 L126,96 L146,176 Z" fill="#26357a"/><circle cx="110" cy="84" r="14" fill="#e9e6dc"/><path d="M92,64 L98,48 L104,60 L110,44 L116,60 L122,48 L128,64 Z" fill="#e9e6dc" stroke="${B}"/>`,
  judge: `<path d="M70,180 L94,92 L126,92 L150,180 Z" fill="#1b1e2c" stroke="#e9e6dc"/><rect x="98" y="62" width="24" height="30" fill="#e9e6dc"/><rect x="101" y="74" width="18" height="2" fill="${B}"/><line x1="56" y1="104" x2="164" y2="104" stroke="#e9e6dc" stroke-width="3"/>`,
  prophet: `<path d="M74,180 L96,96 L124,96 L146,180 Z" fill="#20275a"/><path d="M96,96 Q110,52 124,96 Z" fill="#20275a"/><circle cx="110" cy="72" r="30" fill="none" stroke="${B}" stroke-width="2.5"/><polygon points="110,120 118,132 110,144 102,132" fill="${B2}"/>`,
  child: `<path d="M98,176 L104,128 L116,128 L122,176 Z" fill="#ffffff"/><circle cx="110" cy="116" r="10" fill="#f6e2d2"/>${[0, 1, 2].map((i) => `<ellipse cx="${80 - i * 16}" cy="${186 - i * 4}" rx="3" ry="5" fill="${W}" opacity="${0.8 - i * 0.2}"/>`).join("")}`,
};

/** Art for a Codex entry id (`law:*`, `boss:*`, `theorem:*`, `story:*`). */
export function codexArt(id: string): string {
  const [cat, key] = id.split(":") as [string, string];
  if (cat === "law") return LAW_ART[key]?.() ?? frame(star7(110, 110, 50), 9);
  if (cat === "boss") return frame(BOSS_SILHOUETTE[key] ?? star7(110, 110, 50), key.length + 40, key === "child");
  if (cat === "theorem") return theoremPlate(key);
  return STORY[key]?.() ?? frame(star7(110, 110, 50), 50);
}

export function lawArt(law: string): string { return LAW_ART[law]?.() ?? frame(star7(110, 110, 50), 9); }
