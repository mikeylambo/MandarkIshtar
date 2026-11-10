import { frameSvg } from "./icons";

/**
 * Menu patterns taken from the BB:EEX reference set (adapted to the First Principle palette):
 *  · slanted choice bars that slide in from the right, focused bar filled gold with ink text;
 *  · a top-centre hint line flanked by a signal waveform (one line, only when it says something);
 *  · a description panel beside settings for options that need a sentence;
 *  · cards with a hexagonal emblem whose frame colour marks the category.
 */
const WAVE = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="24" viewBox="0 0 160 24"><path d="M0 12H52l4-6 4 12 5-18 5 22 5-14 4 8 3-4H160" fill="none" stroke="#9fc0ff" stroke-width="1.6"/></svg>`)}")`;
const FRAME_DESC = frameSvg("#4f8dff", "rgba(8,14,36,0.9)", "#9fc0ff");

/** Category tiers (frame + emblem colour), like BB's white/blue/purple/gold rarities. */
export const TIER = { law: "#4f8dff", boss: "#f2b94a", theorem: "#e8e4da", story: "#9a6bff" } as const;
export type Tier = keyof typeof TIER;
export const tierFrame = (t: Tier) => frameSvg(TIER[t], "rgba(9,12,30,0.94)");

export const BB_CSS = `
/* slanted choice bars */
.screen.bars-screen{align-items:flex-end;justify-content:center;padding-right:0;background:linear-gradient(90deg,rgba(5,6,11,.05) 25%,rgba(5,6,11,.45) 60%,rgba(5,6,11,.8))}
.screen.title-screen{background:radial-gradient(ellipse 60% 45% at 50% 52%,rgba(5,6,11,.45),rgba(5,6,11,0) 70%),linear-gradient(rgba(5,6,11,0) 60%,rgba(5,6,11,.55))}
.menu.bars{gap:12px;min-width:min(620px,62vw);margin:0}
.menu.bars .item{border:none;border-image:none;margin:0;height:64px;padding:0 64px 0 40px;justify-content:flex-end;gap:18px;font-size:calc(32px*var(--ts));font-weight:800;letter-spacing:.04em;color:#aab0d0;
  clip-path:polygon(26px 0,100% 0,100% 100%,0 100%);background:linear-gradient(90deg,rgba(14,18,44,0) 0%,rgba(14,18,44,.88) 28%,rgba(22,28,64,.95));
  animation:barin .42s cubic-bezier(.16,.9,.24,1) both;animation-delay:calc(var(--i,0)*55ms);transition:transform .16s cubic-bezier(.2,.9,.3,1),color .12s,background .12s}
.menu.bars .item:before{display:none}
.menu.bars .item:after{content:"";position:absolute;right:0;top:0;bottom:0;width:6px;background:rgba(159,192,255,.35)}
.menu.bars .item.focus{transform:translateX(-30px);color:#0a0d1f;text-shadow:none;background:linear-gradient(90deg,rgba(242,185,74,0) 0%,rgba(242,185,74,.9) 30%,#ffd77a)}
.menu.bars .item.focus:after{background:#fff6e0;box-shadow:0 0 18px #ffd77a}
.menu.bars .item.disabled{opacity:.3}
.menu.bars .item .val{color:inherit}
@keyframes barin{from{opacity:0;transform:translateX(120px)}to{opacity:1;transform:none}}
/* top-centre hint */
.tophint{position:absolute;left:50%;top:34px;transform:translateX(-50%);display:flex;align-items:center;gap:16px;white-space:nowrap;font-size:calc(17px*var(--ts));color:#dfe3f5;pointer-events:none;transition:opacity .15s}
.tophint i{width:160px;height:24px;background:${WAVE} center/contain no-repeat;opacity:.8}
.tophint i.r{transform:scaleX(-1)}
.tophint.empty{opacity:0}
/* settings description panel */
.withdesc{display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:22px;align-items:start}
.desc{border:14px solid transparent;border-image:${FRAME_DESC} 22 fill / 14px stretch;padding:4px 6px;min-height:120px;transition:opacity .15s}
.desc h4{margin:0 0 8px;font-family:var(--display);font-style:italic;font-weight:800;text-transform:uppercase;letter-spacing:.06em;font-size:calc(19px*var(--ts));color:#fff}
.desc p{margin:0;color:#c3c8e4;font-size:calc(15px*var(--ts));line-height:1.35}
.desc.empty{opacity:0}
/* hex emblem cards */
.hex{--c:#4f8dff;width:200px;height:230px;clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%);background:var(--c);display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 0 20px var(--c))}
.hex>div{width:calc(100% - 8px);height:calc(100% - 8px);clip-path:inherit;background:#05060b center/cover no-repeat;display:flex;align-items:center;justify-content:center;overflow:hidden}
.hex>div>svg{width:100%;height:100%}
.lawcard .hex{margin-bottom:20px}
.lawcard .cat,.card .cat{font-family:var(--display);font-style:italic;font-weight:700;letter-spacing:.24em;text-transform:uppercase;font-size:calc(13px*var(--ts));margin-bottom:14px;color:var(--c)}
.codex .entry.card{border:22px solid transparent;padding:4px 10px 10px;display:flex;flex-direction:column;align-items:center;text-align:center;min-width:340px}
.codex .entry.card .hex{width:170px;height:196px;margin-bottom:16px}
.codex .entry.card .note{text-align:left;align-self:stretch}
.codex .entry.card .marg{text-align:left;align-self:stretch}
/* press-start beat */
.glyph-prompt{position:relative}
.glyph-prompt .burst{position:absolute;inset:-2px;border:2px solid var(--gold);opacity:0;pointer-events:none}
.title-out .glyph-prompt{animation:none;opacity:1}
.title-out .glyph-prompt .burst{animation:burst .55s cubic-bezier(.15,.8,.3,1) forwards}
.title-out .glyph-prompt .burst.b2{animation-delay:.08s;border-color:#fff6e0}
.title-out .glyph-prompt>i{background:#fff6e0;box-shadow:0 0 18px #ffd77a}
@keyframes burst{0%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(9);border-width:1px}}
.title-out .wordmark{animation:wordout .5s cubic-bezier(.5,0,.8,.4) forwards}
.title-out svg.sigil,.title-out .title-gl{transition:opacity .35s;opacity:0}
@keyframes wordout{to{opacity:0;transform:translateY(-26px) skewX(-8deg);filter:blur(3px)}}
.rm .title-out .wordmark{animation:none;opacity:0;transition:opacity .12s}
.rm .title-out .burst{animation:none!important}
.rm .screen,.rm .panel,.rm .wordmark,.rm .results .rankbig,.rm .menu.bars .item{animation:none!important}
.rm .item{transition:none!important}
`;
