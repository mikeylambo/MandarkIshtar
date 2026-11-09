import { frameSvg } from "./icons";

/**
 * UI style (First Principle reference): navy glass in chamfered gold frames, bold italic condensed caps for headings and
 * numbers, a gold slash as the section mark, energy blue for the world/Law, violet for Null. Fonts are self-hosted.
 */
const FRAME_GOLD = frameSvg("#f2b94a", "rgba(9,12,30,0.9)");
const FRAME_BLUE = frameSvg("#4f8dff", "rgba(8,14,36,0.88)", "#9fc0ff");
const FRAME_FOCUS = frameSvg("#ffd77a", "rgba(242,185,74,0.16)");
const FRAME_CARD = frameSvg("#4f8dff", "rgba(10,18,44,0.97)", "#f2b94a");

export const CSS = `
[role=alertdialog][hidden]{display:none!important}
:root{--gold:#f2b94a;--gold2:#ffd77a;--blue:#4f8dff;--blue2:#9fc0ff;--violet:#9a6bff;--red:#ff3a3a;--ink:#05060b;--navy:#0b1233;--text:#ece8dc;--mute:#9ea6cc;--ts:1;
  --display:"Barlow Condensed","Barlow Semi Condensed","Arial Narrow",system-ui,sans-serif;--body:"Barlow Semi Condensed","Barlow Condensed",system-ui,sans-serif}
#ui{position:fixed;inset:0;pointer-events:none;font-family:var(--body);font-weight:500;color:var(--text);font-size:calc(17px*var(--ts));user-select:none;-webkit-font-smoothing:antialiased}
#ui *{box-sizing:border-box}
.layer{position:absolute;inset:0;pointer-events:none}
.screen{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:auto;background:radial-gradient(ellipse at 50% 42%,rgba(38,30,92,.45),rgba(5,6,11,.9) 75%);animation:fadein .25s ease-out}
.screen.clear{background:none}
@keyframes fadein{from{opacity:0}to{opacity:1}}
.serif{font-family:var(--display);font-style:italic;font-weight:700;letter-spacing:.04em}
.panel{border:22px solid transparent;border-image:${FRAME_GOLD} 22 fill / 22px stretch;padding:8px 18px;min-width:340px;max-width:min(92vw,780px);position:relative;filter:drop-shadow(0 24px 50px rgba(0,0,0,.6));animation:panelin .32s cubic-bezier(.2,.9,.25,1.1)}
@keyframes panelin{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}
.ptitle{font-family:var(--display);font-style:italic;font-weight:800;font-size:calc(28px*var(--ts));letter-spacing:.06em;text-transform:uppercase;color:#fff;margin:4px 0 6px}
.ptitle:before{content:"/";color:var(--gold);margin-right:.35em;font-weight:600}
/* title wordmark */
.wordmark{display:flex;flex-direction:column;align-items:center;line-height:.86;margin-top:18px;animation:wordin 1.1s cubic-bezier(.2,.9,.2,1) both .5s}
.wordmark b{font-family:var(--display);font-style:italic;font-weight:900;font-size:calc(108px*var(--ts));letter-spacing:-.01em;color:#fff;text-shadow:0 0 1px #fff,0 6px 0 rgba(5,6,11,.8),0 0 42px rgba(122,96,255,.45)}
.wordmark span{font-family:var(--display);font-weight:600;font-size:calc(30px*var(--ts));letter-spacing:.9em;margin-right:-.9em;color:var(--gold2);margin-top:14px}
.wordmark i{display:block;width:min(520px,70vw);height:2px;margin-top:18px;background:linear-gradient(90deg,transparent,var(--gold),transparent)}
@keyframes wordin{from{opacity:0;transform:translateY(10px) skewX(-6deg);filter:blur(6px)}to{opacity:1;transform:none;filter:none}}
/* menus */
.menu{display:flex;flex-direction:column;gap:2px;margin-top:10px;min-width:300px}
.item{position:relative;padding:9px 18px 9px 34px;border:12px solid transparent;border-image:none;margin:-6px -12px;font-family:var(--display);font-style:italic;font-weight:700;letter-spacing:.09em;text-transform:uppercase;font-size:calc(21px*var(--ts));color:#c3c8e4;cursor:pointer;display:flex;justify-content:space-between;gap:24px;align-items:center;transition:color .12s,transform .14s}
.item:before{content:"";position:absolute;left:10px;top:50%;width:12px;height:14px;margin-top:-7px;background:var(--gold);clip-path:polygon(0 0,45% 0,100% 50%,45% 100%,0 100%,55% 50%);opacity:0;transform:translateX(-8px);transition:opacity .12s,transform .14s}
.item.focus{border-image:${FRAME_FOCUS} 22 fill / 12px stretch;color:#fff;transform:translateX(6px);text-shadow:0 0 18px rgba(255,215,122,.35)}
.item.focus:before{opacity:1;transform:none}
.item.disabled{opacity:.32}
.item .val{color:var(--gold2);font-variant-numeric:tabular-nums;font-weight:600;letter-spacing:.04em}
.glyph-prompt{margin-top:46px;width:54px;height:54px;border:2px solid var(--gold);transform:rotate(45deg);display:flex;align-items:center;justify-content:center;animation:pulse 1.6s infinite;box-shadow:0 0 22px rgba(242,185,74,.3)}
.glyph-prompt i{width:14px;height:14px;background:var(--gold)}
@keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}
svg.sigil{filter:drop-shadow(0 0 14px rgba(242,185,74,.45))}
svg.sigil path{fill:none;stroke:var(--gold);stroke-width:2;stroke-dasharray:900;stroke-dashoffset:900;animation:draw 2.4s ease forwards}
@keyframes draw{to{stroke-dashoffset:0}}
/* HUD */
.hud{position:absolute;inset:0;pointer-events:none}
.dock{position:absolute;left:26px;bottom:24px;display:flex;align-items:flex-end;gap:12px}
.portrait{width:76px;height:76px;border:14px solid transparent;border-image:${FRAME_GOLD} 22 fill / 14px stretch;display:flex;align-items:center;justify-content:center;padding:0}
.portrait svg{width:46px;height:46px;flex:none}
.dockcol{display:flex;flex-direction:column;gap:7px;padding-bottom:2px}
.sealrow{display:flex;gap:8px}
.seal{width:18px;height:18px;transform:rotate(45deg);border:2px solid var(--gold);background:linear-gradient(135deg,var(--gold2),#b98a2e);box-shadow:0 0 10px rgba(242,185,74,.45);transition:all .2s}
.seal.lost{border-color:#4a4f6a;background:none;box-shadow:none;transform:rotate(45deg) scale(.7);opacity:.5}
.focusbar{position:relative;width:224px;height:9px;transform:skewX(-24deg);background:rgba(5,8,22,.75);border:1px solid rgba(79,141,255,.55);overflow:hidden}
.focusbar i{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,#2a4fb8,#4f8dff 70%,#bfe0ff);box-shadow:0 0 12px #4f8dff;transition:width .08s linear}
.focusbar:after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 21px,rgba(5,6,11,.85) 21px 23.4px)}
.ops{display:flex;gap:6px;align-items:center}
.op{width:44px;height:44px;border:10px solid transparent;border-image:${FRAME_BLUE} 22 fill / 10px stretch;display:flex;align-items:center;justify-content:center;transition:opacity .15s,filter .15s}
.op svg{flex:none;filter:drop-shadow(0 0 6px currentColor)}
.op.low{opacity:.38;filter:saturate(.3)}
.op.lost{opacity:.16;filter:grayscale(1)}
.op.lost svg{filter:none}
.steps{display:flex;gap:3px;margin-left:6px}
.steps i{width:10px;height:16px;background:var(--gold);clip-path:polygon(0 0,45% 0,100% 50%,45% 100%,0 100%,55% 50%);transition:opacity .15s}
.steps i.off{opacity:.18}
.hubris{position:absolute;left:30px;bottom:122px;width:214px;height:8px;transform:skewX(-24deg);border:1px solid rgba(242,185,74,.6);background:rgba(0,0,0,.45)}
.hubris i{display:block;height:100%;background:linear-gradient(90deg,#b58a2e,var(--gold2));box-shadow:0 0 10px rgba(242,185,74,.6);width:0}
.hubris.full{border-color:var(--red);animation:crack .3s infinite}.hubris.full i{background:linear-gradient(90deg,#a02020,var(--red))}
@keyframes crack{50%{transform:skewX(-24deg) translateX(1px)}}
.score{position:absolute;right:30px;top:20px;text-align:right;font-family:var(--display);font-style:italic}
.score b{display:block;font-size:calc(38px*var(--ts));font-weight:800;font-variant-numeric:tabular-nums;letter-spacing:.02em;color:#fff;text-shadow:0 2px 0 rgba(5,6,11,.7)}
.score .rank{font-size:calc(46px*var(--ts));font-weight:900;color:var(--gold2);line-height:1;text-shadow:0 0 22px rgba(242,185,74,.5)}
.lawmini{position:absolute;left:50%;top:14px;transform:translateX(-50%);padding:0 14px;border:12px solid transparent;border-image:${FRAME_BLUE} 22 fill / 12px stretch;font-family:var(--display);font-style:italic;font-weight:700;font-size:calc(16px*var(--ts));letter-spacing:.16em;text-transform:uppercase;white-space:nowrap;color:#dfe8ff}
.feed{position:absolute;right:30px;top:150px;display:flex;flex-direction:column;align-items:flex-end;gap:4px}
.feed div{font-family:var(--display);font-style:italic;font-weight:800;font-size:calc(19px*var(--ts));letter-spacing:.14em;text-transform:uppercase;animation:feed 1.6s forwards;text-shadow:0 2px 0 rgba(5,6,11,.8)}
.feed .red{color:var(--red)}.feed .gold{color:var(--gold2)}
@keyframes feed{0%{opacity:0;transform:translateX(24px) skewX(-10deg)}10%{opacity:1;transform:none}80%{opacity:1}100%{opacity:0}}
.bossbar{position:absolute;left:50%;top:70px;transform:translateX(-50%) skewX(-24deg);width:min(600px,70vw);height:12px;border:1px solid rgba(159,192,255,.8);background:rgba(5,8,22,.75);box-shadow:0 0 0 3px rgba(5,6,11,.5)}
.bossbar i{display:block;height:100%;background:linear-gradient(90deg,#2a4fb8,#4f8dff 60%,#cfe4ff);box-shadow:0 0 14px #4f8dff;transition:width .15s}
.bossbar:before,.bossbar:after{content:"";position:absolute;top:-5px;bottom:-5px;width:4px;background:var(--gold)}
.bossbar:before{left:-9px}.bossbar:after{right:-9px}
.bossbar .inf{position:absolute;inset:-22px 0 auto 0;text-align:center;color:#fff1c8;font-size:20px;transform:skewX(24deg)}
.meter{position:absolute;left:50%;bottom:40px;transform:translateX(-50%) skewX(-24deg);width:min(420px,60vw);height:6px;background:rgba(255,255,255,.12)}
.meter i{display:block;height:100%;background:#fff6e0;box-shadow:0 0 18px #fff6e0}
/* Law card */
.lawcard{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%) scale(1.6) rotate(-4deg);opacity:0;width:360px;height:520px;border:26px solid transparent;border-image:${FRAME_CARD} 22 fill / 26px stretch;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8px 10px;text-align:center;filter:drop-shadow(0 0 50px rgba(79,141,255,.4))}
.lawcard.slam{animation:slam 2s forwards}
@keyframes slam{0%{opacity:0;transform:translate(-50%,-50%) scale(1.8) rotate(-6deg)}12%{opacity:1;transform:translate(-50%,-50%) scale(1) rotate(0)}85%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-120%) scale(.4)}}
.lawcard .art{width:236px;height:236px;margin-bottom:22px;border:1px solid rgba(242,185,74,.6);box-shadow:0 0 0 4px rgba(5,6,11,.6),0 0 30px rgba(79,141,255,.3);background-size:cover;background-position:center;overflow:hidden}
.lawcard h2{font-size:calc(34px*var(--ts));margin:0 0 12px;color:#fff;font-weight:800;text-transform:uppercase;letter-spacing:.04em}
.lawcard p{margin:0;color:#c9d6ff;font-style:italic;font-size:calc(18px*var(--ts))}
/* subtitles */
.subs{position:absolute;left:50%;bottom:150px;transform:translateX(-50%);max-width:70vw;text-align:center}
.subs span{display:inline-block;padding:7px 16px;background:rgba(5,6,16,var(--subbg,.62));font-size:calc(var(--subsize,21px)*var(--ts))}
.subs .who{color:var(--gold2);margin-right:10px;font-family:var(--display);font-style:italic;font-weight:800;letter-spacing:.14em;font-size:.82em;text-transform:uppercase}
/* results */
.results{min-width:420px}
.results .rankbig{font-family:var(--display);font-style:italic;font-weight:900;font-size:calc(120px*var(--ts));color:var(--gold2);text-align:center;line-height:1;text-shadow:0 0 40px rgba(242,185,74,.55),0 6px 0 rgba(5,6,11,.7);animation:rankin .5s cubic-bezier(.2,1.4,.3,1) both .15s}
@keyframes rankin{from{opacity:0;transform:scale(1.8)}to{opacity:1;transform:none}}
.results .rankname{text-align:center;font-family:var(--display);font-style:italic;font-weight:700;letter-spacing:.42em;margin-right:-.42em;text-transform:uppercase;margin-bottom:16px;color:#fff}
.results .stage{text-align:center;font-family:var(--display);font-style:italic;font-weight:700;letter-spacing:.3em;color:var(--mute);margin-bottom:6px}
.results table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}
.results td{padding:5px 2px;border-bottom:1px solid rgba(242,185,74,.14);color:#cfd3ea}
.results td:last-child{text-align:right;font-family:var(--display);font-style:italic;font-weight:700;font-size:1.08em;color:#fff}
.results tr.total td{border-bottom:none;border-top:1px solid rgba(242,185,74,.6);padding-top:9px;font-family:var(--display);font-style:italic;font-weight:800;font-size:1.25em;color:var(--gold2);text-transform:uppercase;letter-spacing:.06em}
.codex{display:flex;gap:26px;max-height:70vh}
.codex .list{overflow:auto;min-width:250px}
.codex .entry{max-width:440px;overflow:auto}
.codex .plate{width:230px;height:230px;border:1px solid rgba(242,185,74,.55);box-shadow:0 0 0 4px rgba(5,6,11,.6);margin-bottom:14px;background-size:cover;background-position:center}
.codex .entry h3{margin:0 0 10px;font-weight:800;font-size:30px;text-transform:uppercase;color:#fff}
.marg{margin-top:18px;font-family:"Snell Roundhand","Segoe Script","Brush Script MT",cursive;color:#d8c7a0;font-size:18px}
.marg small{display:block;font-family:inherit;opacity:.7;font-size:13px}
.reveal{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#fff8ec;color:#2a2418;font-size:calc(72px*var(--ts));letter-spacing:.4em;opacity:0;transition:opacity 1.5s}
.reveal.on{opacity:1}
.toast{position:absolute;left:50%;top:40%;transform:translate(-50%,-50%);padding:14px 26px;font-family:var(--display);font-style:italic;font-weight:800;font-size:24px;letter-spacing:.16em;text-transform:uppercase}
.hint{position:absolute;left:50%;bottom:230px;transform:translateX(-50%);width:56px;height:56px;border:2px solid var(--gold);border-radius:50%;animation:pulse 1s infinite;display:flex;align-items:center;justify-content:center;color:var(--gold);font-size:22px}
.credits{overflow:hidden;height:70vh;width:min(600px,90vw);text-align:center;mask-image:linear-gradient(transparent,#000 15%,#000 85%,transparent)}
.credits .roll{animation:roll 40s linear forwards}
@keyframes roll{from{transform:translateY(70vh)}to{transform:translateY(-100%)}}
.flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none}
@media (prefers-reduced-motion:reduce){.screen,.panel,.wordmark,.results .rankbig{animation:none}.item{transition:none}}
@media (max-width:700px){.wordmark b{font-size:56px}.wordmark span{font-size:18px}.lawcard{transform:translate(-50%,-50%) scale(.8)}.dock{left:12px;bottom:12px}.focusbar{width:160px}}
`;
