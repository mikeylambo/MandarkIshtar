/**
 * Operation icons (inline SVG, 48×48 viewBox). Each reads by silhouette alone — chevrons, glass shards, hourglass-clock,
 * broken ring — and also carries the reference colour: Vector blue, Phase pale blue glass, Order gold, Null violet.
 */
export type OpIcon = "vector" | "phase" | "order" | "null";

export const OP_COLOR: Record<OpIcon, string> = { vector: "#4f8dff", phase: "#9fd0ff", order: "#f2b94a", null: "#9a6bff" };

const PATHS: Record<OpIcon, string> = {
  vector: `<path d="M6 12h9l10 12-10 12H6l10-12z"/><path d="M22 12h9l10 12-10 12h-9l10-12z" opacity=".7"/>`,
  phase: `<path d="M10 8l14 4-6 26-12-4z"/><path d="M26 12l13-2-3 26-14 4z" opacity=".65"/><path d="M8 20l30-4" stroke="#fff" stroke-width="1.5" fill="none" opacity=".8"/>`,
  order: `<circle cx="24" cy="24" r="17" fill="none" stroke-width="3.5" stroke="currentColor"/><path d="M17 13h14l-6 11 6 11H17l6-11z"/><path d="M24 4v4M24 40v4M4 24h4M40 24h4" stroke="currentColor" stroke-width="3"/>`,
  null: `<path d="M24 6a18 18 0 0 1 17.3 13l-5.8 1.6A12 12 0 0 0 24 12z"/><path d="M41.6 27A18 18 0 0 1 27 41.8l-.9-6A12 12 0 0 0 35.7 26z"/><path d="M21 41.8A18 18 0 0 1 6.4 28.5l5.8-1.5A12 12 0 0 0 21.9 35.8z"/><path d="M6.6 19A18 18 0 0 1 17.5 7.2l2 5.6A12 12 0 0 0 12.4 20.6z"/>`,
};

export function opIcon(op: OpIcon, size = 30): string {
  return `<svg viewBox="0 0 48 48" width="${size}" height="${size}" fill="currentColor" style="color:${OP_COLOR[op]}" aria-hidden="true">${PATHS[op]}</svg>`;
}

/** 9-slice chamfered frame (top-left + bottom-right cut) for CSS border-image. */
export function frameSvg(stroke: string, fill: string, tick = stroke): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><path d="M16.5 .5H63.5V47.5L47.5 63.5H.5V16.5Z" fill="${fill}" stroke="${stroke}" stroke-width="1"/><path d="M3 12.5L12.5 3M51.5 61L61 51.5" stroke="${tick}" stroke-width="2.5"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
