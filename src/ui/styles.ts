/** UI style: black glass panels, thin gold rules, high-contrast serif for Law names, geometric sans for numbers. */
export const CSS = `
[role=alertdialog][hidden]{display:none!important}
:root{--gold:#f2b94a;--gold2:#ffd77a;--blue:#4f8dff;--red:#ff3a3a;--ink:#05060b;--glass:rgba(6,8,16,.78);--text:#ece8dc;--ts:1}
#ui{position:fixed;inset:0;pointer-events:none;font-family:"Futura","Century Gothic","Avenir Next",system-ui,sans-serif;color:var(--text);font-size:calc(16px*var(--ts));user-select:none}
#ui *{box-sizing:border-box}
.layer{position:absolute;inset:0;pointer-events:none}
.screen{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:auto;background:radial-gradient(ellipse at 50% 40%,rgba(22,34,74,.55),rgba(5,6,11,.92))}
.screen.clear{background:none}
.panel{background:var(--glass);border:1px solid rgba(242,185,74,.55);box-shadow:0 0 0 1px rgba(242,185,74,.12) inset,0 20px 60px rgba(0,0,0,.6);padding:28px 36px;min-width:320px;max-width:min(92vw,760px);position:relative}
.panel:before,.panel:after{content:"";position:absolute;width:14px;height:14px;border:1px solid var(--gold)}
.panel:before{left:-6px;top:-6px;border-right:none;border-bottom:none}.panel:after{right:-6px;bottom:-6px;border-left:none;border-top:none}
.serif{font-family:"Didot","Bodoni 72","Playfair Display",Georgia,"Times New Roman",serif;letter-spacing:.04em}
.title{font-size:calc(52px*var(--ts));letter-spacing:.32em;color:#fff7e6;text-shadow:0 0 30px rgba(242,185,74,.35)}
.menu{display:flex;flex-direction:column;gap:6px;margin-top:18px;min-width:280px}
.item{padding:10px 18px;border:1px solid transparent;letter-spacing:.14em;text-transform:uppercase;font-size:calc(15px*var(--ts));cursor:pointer;display:flex;justify-content:space-between;gap:20px;align-items:center}
.item.focus{border-color:var(--gold);background:linear-gradient(90deg,rgba(242,185,74,.18),rgba(242,185,74,0));color:#fff}
.item.disabled{opacity:.35}
.item .val{color:var(--gold2);font-variant-numeric:tabular-nums}
.glyph-prompt{margin-top:40px;width:54px;height:54px;border:2px solid var(--gold);border-radius:50%;display:flex;align-items:center;justify-content:center;animation:pulse 1.6s infinite}
.glyph-prompt i{width:14px;height:14px;background:var(--gold);transform:rotate(45deg)}
@keyframes pulse{0%,100%{opacity:.35;transform:scale(.92)}50%{opacity:1;transform:scale(1.04)}}
svg.sigil path{fill:none;stroke:var(--gold);stroke-width:2;stroke-dasharray:900;stroke-dashoffset:900;animation:draw 2.4s ease forwards}
@keyframes draw{to{stroke-dashoffset:0}}
/* HUD */
.hud{position:absolute;inset:0;pointer-events:none}
.seals{position:absolute;left:28px;bottom:26px;display:flex;align-items:center;gap:10px}
.portrait{width:64px;height:64px;border:1px solid var(--gold);background:radial-gradient(circle at 50% 40%,#2a3460,#0a0c16);display:flex;align-items:center;justify-content:center}
.portrait svg{width:44px}
.seal{width:22px;height:22px;transform:rotate(45deg);border:2px solid var(--gold);background:rgba(242,185,74,.25);transition:all .2s}
.seal.lost{border-color:#3a3a3a;background:none;transform:rotate(45deg) scale(.7);opacity:.4}
.hubris{position:absolute;left:28px;bottom:104px;width:210px;height:8px;border:1px solid rgba(242,185,74,.6);background:rgba(0,0,0,.4)}
.hubris i{display:block;height:100%;background:linear-gradient(90deg,#b58a2e,var(--gold2));width:0}
.hubris.full{border-color:var(--red);animation:crack .3s infinite}.hubris.full i{background:linear-gradient(90deg,#a02020,var(--red))}
@keyframes crack{50%{transform:translateX(1px)}}
.score{position:absolute;right:30px;top:24px;text-align:right}
.score b{display:block;font-size:calc(30px*var(--ts));font-variant-numeric:tabular-nums;letter-spacing:.06em}
.score .rank{font-size:calc(40px*var(--ts));color:var(--gold2);font-family:Georgia,serif}
.lawmini{position:absolute;left:50%;top:18px;transform:translateX(-50%);padding:6px 16px;border:1px solid rgba(79,141,255,.6);background:var(--glass);font-size:calc(13px*var(--ts));letter-spacing:.2em;text-transform:uppercase}
.feed{position:absolute;right:30px;top:150px;display:flex;flex-direction:column;align-items:flex-end;gap:4px}
.feed div{font-size:calc(14px*var(--ts));letter-spacing:.22em;animation:feed 1.6s forwards}
.feed .red{color:var(--red)}.feed .gold{color:var(--gold2)}
@keyframes feed{0%{opacity:0;transform:translateX(20px)}10%{opacity:1;transform:none}80%{opacity:1}100%{opacity:0}}
.bossbar{position:absolute;left:50%;top:58px;transform:translateX(-50%);width:min(560px,70vw);height:6px;border:1px solid rgba(79,141,255,.7);background:rgba(0,0,0,.5)}
.bossbar i{display:block;height:100%;background:var(--blue)}
.bossbar .inf{position:absolute;inset:-14px 0 auto 0;text-align:center;color:var(--blue);font-size:18px}
.meter{position:absolute;left:50%;bottom:40px;transform:translateX(-50%);width:min(420px,60vw);height:4px;background:rgba(255,255,255,.12)}
.meter i{display:block;height:100%;background:#fff6e0;box-shadow:0 0 18px #fff6e0}
/* Law card */
.lawcard{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%) scale(1.6) rotate(-4deg);opacity:0;width:340px;height:500px;border:2px solid var(--blue);background:linear-gradient(160deg,#0b1530,#05060b);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:26px;text-align:center;box-shadow:0 0 80px rgba(79,141,255,.35)}
.lawcard.slam{animation:slam 2s forwards}
@keyframes slam{0%{opacity:0;transform:translate(-50%,-50%) scale(1.8) rotate(-6deg)}12%{opacity:1;transform:translate(-50%,-50%) scale(1) rotate(0)}85%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-120%) scale(.4)}}
.lawcard .art{width:220px;height:220px;margin-bottom:22px;border:1px solid rgba(79,141,255,.5);background-size:cover;background-position:center;overflow:hidden}
.lawcard h2{font-size:calc(28px*var(--ts));margin:0 0 14px;color:#fff;font-weight:400}
.lawcard p{margin:0;color:#c9d6ff;font-style:italic}
/* subtitles */
.subs{position:absolute;left:50%;bottom:140px;transform:translateX(-50%);max-width:70vw;text-align:center}
.subs span{display:inline-block;padding:6px 14px;background:rgba(0,0,0,var(--subbg,.6));font-size:calc(var(--subsize,20px)*var(--ts))}
.subs .who{color:var(--gold2);margin-right:10px;letter-spacing:.14em;font-size:.8em;text-transform:uppercase}
/* results */
.results .rankbig{font-size:calc(84px*var(--ts));color:var(--gold2);font-family:Georgia,serif;text-align:center;line-height:1}
.results .rankname{text-align:center;letter-spacing:.3em;text-transform:uppercase;margin-bottom:16px}
.results table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}
.results td{padding:4px 0;border-bottom:1px solid rgba(242,185,74,.12)}.results td:last-child{text-align:right}
.codex{display:flex;gap:24px;max-height:70vh}
.codex .list{overflow:auto;min-width:240px}
.codex .entry{max-width:420px;overflow:auto}
.codex .plate{width:220px;height:220px;border:1px solid rgba(242,185,74,.5);margin-bottom:14px;background-size:cover;background-position:center}
.codex .entry h3{margin:0 0 10px;font-weight:400;font-size:26px}
.marg{margin-top:18px;font-family:"Snell Roundhand","Segoe Script","Brush Script MT",cursive;color:#d8c7a0;font-size:18px}
.marg small{display:block;font-family:inherit;opacity:.7;font-size:13px}
.reveal{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#fff8ec;color:#2a2418;font-size:calc(64px*var(--ts));letter-spacing:.4em;opacity:0;transition:opacity 1.5s}
.reveal.on{opacity:1}
.toast{position:absolute;left:50%;top:40%;transform:translate(-50%,-50%);padding:14px 26px;font-size:20px;letter-spacing:.2em}
.hint{position:absolute;left:50%;bottom:220px;transform:translateX(-50%);width:56px;height:56px;border:2px solid var(--gold);border-radius:50%;animation:pulse 1s infinite;display:flex;align-items:center;justify-content:center;color:var(--gold);font-size:22px}
.credits{overflow:hidden;height:70vh;width:min(600px,90vw);text-align:center;mask-image:linear-gradient(transparent,#000 15%,#000 85%,transparent)}
.credits .roll{animation:roll 40s linear forwards}
@keyframes roll{from{transform:translateY(70vh)}to{transform:translateY(-100%)}}
.flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none}
@media (max-width:700px){.title{font-size:30px;letter-spacing:.2em}.lawcard{transform:translate(-50%,-50%) scale(.8)}}
`;
