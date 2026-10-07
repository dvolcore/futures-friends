/* Futures Friends: Training Academy (V.academy), Watch (V.watch) and Enroll (V.enroll).
   Loaded after portal.js. Everything lives inside one IIFE; the only global added is window.FFX.
   Storage keys: ff-academy, ff-watch-log (all wrapped in try/catch). Tour, application, status and careers forms send to the intake gateway (intake.js): nothing is stored in the browser. */
(function(){
'use strict';
if (typeof V === 'undefined') return;

// ---------------------------------------------------------------- storage + small helpers
const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return (v && typeof v === typeof d && Array.isArray(v) === Array.isArray(d)) ? v : d; } catch(_) { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch(_) { return false; } };
const q = s => document.querySelector(s);
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const fromIso = s => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); };
const shortDate = d => d.toLocaleDateString('en-US', {weekday:'short', month:'short', day:'numeric'}).replace(',', '');
const longDate = d => d.toLocaleDateString('en-US', {month:'long', day:'numeric', year:'numeric'});
const fmtH = h => (Math.round(h*10)/10).toString().replace(/\.0$/, '');
const mmss = s => `${Math.floor(s/60)}:${pad(Math.floor(s%60))}`;
const demoNote = (extra='') => `<p class="ffx-demo"><span aria-hidden="true">\u25cf</span> Demo: requests stay on this device.${extra ? ' ' + extra : ''}</p>`;
const FI = () => window.FFIntake || {enabled: () => false, soon: w => `<p class="small">Online ${w} are not available on this page right now. Please call <b>${FLC.phone}</b> or email <b>${FLC.email}</b>.</p>`, warm() {}, honeypot: () => ''};
const colorOf = c => c === 'rainbow' ? 'linear-gradient(90deg,#D9483B,#E8761E,#C99A06,#2E9E57,#6A4FB8)' : (c === 'navy' ? 'var(--navy)' : (c === 'gold' ? 'var(--gold-deep)' : `var(--${c})`));
const solidOf = c => c === 'rainbow' ? 'var(--bop)' : (c === 'navy' ? 'var(--booker)' : (c === 'gold' ? 'var(--gold-deep)' : `var(--${c})`));
const MOD = (window.FF && window.FF.modules) || (typeof D !== 'undefined' ? D.modules : []) || [];
const LAD = (window.FF && window.FF.ladder) || (typeof D !== 'undefined' ? D.ladder : []) || [];
const EPS = (window.FF && window.FF.episodes) || (typeof D !== 'undefined' ? D.episodes : []) || [];

// A player that shows its poster and a calm notice if the file is not published yet (never throws).
// Gap fill (2026-10-07): the silent placeholder clip (episode-sample.mp4) is retired; the classroom player plays the friends' finished
// welcome video (with its .vtt) instead. Any future placeholder clip still gets the visible 'Placeholder video' flag through this test.
const PLACEHOLDER_VIDEO = /video\/placeholder-[a-z0-9-]+\.mp4$/;
// Captions (captions.js, D156): a <track> only when a real .vtt exists; otherwise capNote() shows the honest note under the player.
const capTrack = src => window.FFCaptions ? window.FFCaptions.tracks(src) : '';
const capNote = (src, title) => window.FFCaptions ? window.FFCaptions.extras(src, title) : '';
const player = (id, src, poster, label, title, alt) => `<div class="ffx-player${PLACEHOLDER_VIDEO.test(src) && window.FFArt ? ' ffa-flagged' : ''}" data-ffx-player>${PLACEHOLDER_VIDEO.test(src) && window.FFArt ? window.FFArt.flag('video', {cls: 'ffa-flag-tr'}) : ''}
  <video id="${id}" controls playsinline preload="none" poster="${poster}" src="${src}" aria-label="${esc(alt)}">${capTrack(src)}</video>
  <span class="ffx-vlabel">${label}</span>
  <div class="ffx-off" role="status"><b>${esc(title)}</b><span>This video is being finalized and will play here as soon as it is published.</span></div>
 </div>`;

// ---------------------------------------------------------------- CSS (variables only, light + dark)
if (!document.getElementById('ff-features-css')) {
  const css = document.createElement('style'); css.id = 'ff-features-css';
  css.textContent = `
[data-ffx-group][hidden],[data-ffx-step][hidden],[data-ffx-appback][hidden],[data-ffx-appnext][hidden],[data-ffx-appsubmit][hidden]{display:none!important}
.ffx-log{max-height:340px;overflow:auto}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .ffx-dk.btn.navy{background:var(--navy2);border-color:rgba(255,255,255,.22)}}
:root[data-theme="dark"] .ffx-dk.btn.navy{background:var(--navy2);border-color:rgba(255,255,255,.22)}
.ffx-demo{font-size:12px;color:var(--muted);display:flex;gap:6px;align-items:center;margin:0}
.ffx-demo span{color:var(--gold-deep);font-size:9px}
.ffx-split{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(0,1fr);gap:22px;align-items:start}
.ffx-split.wide{grid-template-columns:minmax(0,1.5fr) minmax(0,1fr)}
@media (max-width:920px){.ffx-split,.ffx-split.wide{grid-template-columns:minmax(0,1fr)}}
.ffx-split>*{min-width:0}
.ffx-player{position:relative;border-radius:calc(var(--r) + 4px);overflow:hidden;background:var(--navy);aspect-ratio:16/9;box-shadow:0 18px 44px rgba(10,43,56,.18);border:1px solid var(--line)}
.ffx-player video{display:block;width:100%;height:100%;object-fit:cover;background:var(--navy)}
.ffx-vlabel{position:absolute;top:12px;left:12px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;font-weight:600;background:rgba(10,43,56,.82);color:#fff;border:1px solid var(--gold);padding:3px 10px;border-radius:999px;pointer-events:none}
.ffx-off{display:none;position:absolute;left:12px;right:12px;bottom:12px;background:rgba(10,43,56,.88);color:#fff;border-radius:12px;padding:10px 14px;gap:2px;font-size:13px}
.ffx-off b{font-family:var(--display);font-size:16px;font-weight:600}
.ffx-player.is-off .ffx-off{display:grid}
.ffx-chaps{display:grid;gap:8px;margin:0;padding:0;list-style:none}
.ffx-chaps button{all:unset;box-sizing:border-box;width:100%;cursor:pointer;display:grid;grid-template-columns:auto minmax(0,1fr);gap:12px;align-items:center;padding:12px 14px;border-radius:12px;border:1px solid var(--line);background:var(--paper)}
.band-paper .ffx-chaps button{background:var(--cream)}
.ffx-chaps button:hover{border-color:var(--gold)}
.ffx-chaps button[aria-current="true"]{border-color:var(--gold);box-shadow:inset 4px 0 0 var(--gold)}
.ffx-chaps .t{font-family:var(--display);font-weight:600;font-size:13px;background:var(--navy);color:#fff;border-radius:8px;padding:3px 8px;font-variant-numeric:tabular-nums}
.ffx-chaps b{display:block;font-size:14px}.ffx-chaps small{display:block;font-size:12.5px;color:var(--muted)}
.ffx-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,170px),1fr));gap:12px}
.ffx-kpi{border:1px solid var(--line);border-radius:14px;padding:14px 16px;display:grid;gap:2px;background:var(--paper)}
.band-paper .ffx-kpi{background:var(--cream)}
.ffx-kpi b{font-family:var(--display);font-size:30px;line-height:1.1;font-weight:600;font-variant-numeric:tabular-nums}
.ffx-kpi span{font-size:12.5px;color:var(--muted)}
.ffx-ladder{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,138px),1fr));gap:12px}
@media (max-width:520px){.ffx-ladder{grid-template-columns:repeat(2,minmax(0,1fr))}}
.ffx-rung{border:1px solid var(--line);border-radius:14px;padding:14px;display:grid;gap:8px;justify-items:center;text-align:center;background:var(--paper)}
.band-paper .ffx-rung{background:var(--cream)}
.ffx-rung.earned{border-color:var(--gold);box-shadow:0 0 0 1px var(--gold) inset}
.ffx-badge{width:68px;height:68px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(var(--c) calc(var(--p)*1%),var(--paper2) 0)}
.ffx-badge i{width:52px;height:52px;border-radius:50%;background:var(--paper);display:grid;place-items:center;font-style:normal;font-family:var(--display);font-weight:600;font-size:15px;color:var(--c);border:2px dashed var(--line)}
.ffx-rung.earned .ffx-badge i{background:var(--c);color:#fff;border-color:rgba(255,255,255,.6)}
.ffx-rung b{font-size:13.5px;line-height:1.3}
.ffx-cert{position:relative;background:var(--navy);color:#fff;border-radius:18px;padding:clamp(22px,4vw,40px);display:grid;gap:10px;text-align:center;justify-items:center;border:3px solid var(--gold);box-shadow:0 0 0 6px var(--navy),0 0 0 7px var(--gold),0 22px 50px rgba(10,43,56,.25);margin:8px}
.ffx-cert::after{content:"";position:absolute;inset:10px;border:1.5px dashed rgba(231,169,40,.55);border-radius:11px;pointer-events:none}
.ffx-cert img{width:56px}
.ffx-cert .k{font-size:11.5px;letter-spacing:.2em;text-transform:uppercase;color:var(--gold);font-weight:600}
.ffx-cert .nm{font-family:var(--display);font-size:clamp(26px,4vw,38px);font-weight:600;color:#fff;border-bottom:2px solid var(--gold);padding:0 18px 4px;max-width:100%;overflow-wrap:anywhere}
.ffx-cert .cr{font-family:var(--display);font-size:clamp(18px,2.4vw,24px);color:var(--gold)}
.ffx-cert .sig{display:flex;gap:28px;justify-content:center;flex-wrap:wrap;margin-top:8px;font-size:12px;color:#C6D7DD}
.ffx-cert .sig span{border-top:1px solid rgba(255,255,255,.4);padding-top:6px;min-width:150px}
.ffx-cert.locked{filter:saturate(.35);opacity:.78}
.ffx-lock{position:absolute;inset:auto 18px 18px auto;background:var(--gold);color:#0A2B38;font-size:12px;font-weight:600;padding:4px 12px;border-radius:999px;z-index:1}
.ffx-tabs{display:flex;gap:8px;flex-wrap:wrap}
.ffx-tabs button{all:unset;cursor:pointer;font-size:13.5px;font-weight:600;padding:7px 14px;border-radius:999px;border:1px solid var(--line);background:var(--paper);color:var(--ink);display:inline-flex;gap:6px;align-items:center}
.ffx-tabs button i{font-style:normal;width:9px;height:9px;border-radius:50%;background:var(--c,var(--gold))}
.ffx-tabs button[aria-pressed="true"]{background:var(--navy);color:#fff;border-color:var(--navy)}
.ffx-tabs button:focus-visible,.ffx-slot:focus-visible,.ffx-chaps button:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
.ffx-track{display:grid;gap:14px;margin-top:26px}
.ffx-track>header{display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding-bottom:10px;border-bottom:2px solid var(--line)}
.ffx-track>header h3{font-size:22px}
.ffx-track>header .bar{width:26px;height:8px;border-radius:999px;background:var(--c)}
.ffx-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,250px),1fr));gap:14px}
.ffx-course{border-top:5px solid var(--c);gap:10px}
.ffx-course .top{display:flex;justify-content:space-between;gap:8px;align-items:center}
.ffx-course h4{margin:0;font-family:var(--display);font-weight:600;font-size:17px;line-height:1.25}
.ffx-course .meter i{background:var(--c)}
.ffx-course .btn{justify-self:start;padding:8px 16px}
.ffx-course .btn.done{background:transparent;color:var(--ok);border-color:var(--ok)}
.ffx-q{border:1px solid var(--line);border-radius:14px;padding:16px;margin:0;display:grid;gap:8px;background:var(--paper)}
.band-paper .ffx-q{background:var(--cream)}
.ffx-q legend{font-weight:600;padding:0 6px;font-size:15px}
.ffx-q label{display:flex;gap:10px;align-items:flex-start;padding:9px 12px;border-radius:10px;border:1px solid var(--line);cursor:pointer;font-size:14px;background:var(--paper)}
.ffx-q label:hover{border-color:var(--gold)}
.ffx-q input{margin-top:4px;accent-color:var(--navy)}
.ffx-q label.right{border-color:var(--ok);box-shadow:inset 3px 0 0 var(--ok)}
.ffx-q label.wrong{border-color:var(--bad);box-shadow:inset 3px 0 0 var(--bad)}
.ffx-fb{font-size:13.5px;min-height:0}
.ffx-fb.ok{color:var(--ok)} .ffx-fb.bad{color:var(--bad)}
.ffx-obj{margin:0;padding:0;list-style:none;display:grid;gap:8px}
.ffx-obj li{display:grid;grid-template-columns:26px minmax(0,1fr);gap:8px;font-size:14px}
.ffx-obj li::before{content:attr(data-n);width:24px;height:24px;border-radius:50%;background:var(--gold);color:#0A2B38;font-family:var(--display);font-weight:600;font-size:12.5px;display:grid;place-items:center}
.ffx-meta{display:flex;gap:6px;flex-wrap:wrap}
.ffx-ep{border-left:5px solid var(--c);gap:10px}
.ffx-ep .top{display:grid;grid-template-columns:64px minmax(0,1fr);gap:12px;align-items:center}
.ffx-ep .top img{width:64px;height:64px;object-fit:contain;border-radius:12px;background:var(--s,var(--paper2))}
.ffx-ep h3{font-size:18px}
.ffx-talk{border-radius:12px;background:var(--paper2);padding:12px;display:grid;gap:6px;font-size:13.5px}
.ffx-talk b{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.ffx-ep .acts2{display:flex;gap:8px;flex-wrap:wrap}
.ffx-ep .btn{padding:8px 14px;font-size:13.5px}
.ffx-big{font-family:var(--display);font-size:44px;font-weight:600;line-height:1;font-variant-numeric:tabular-nums}
.ffx-big small{font-size:16px;color:var(--muted);font-family:var(--body);font-weight:500}
.ffx-meter{height:14px}
.ffx-meter i{background:var(--purple);transition:width .3s ease}
.ffx-meter.full i{background:var(--bad)}
.ffx-log{list-style:none;margin:0;padding:0 2px 0 0;display:grid;gap:6px}
.ffx-log li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;font-size:13.5px;padding:8px 10px;border-radius:10px;background:var(--paper2)}
.ffx-tl{list-style:none;margin:0;padding:0;display:grid;gap:0;position:relative}
.ffx-tl li{display:grid;grid-template-columns:76px 22px minmax(0,1fr);gap:12px;align-items:start;padding-bottom:16px;position:relative}
.ffx-tl li::before{content:"";position:absolute;left:calc(76px + 12px + 10px);top:14px;bottom:-2px;width:2px;background:var(--line)}
.ffx-tl li:last-child::before{display:none}
.ffx-tl time{font-family:var(--display);font-weight:600;font-size:15px;text-align:right;font-variant-numeric:tabular-nums;padding-top:1px}
.ffx-tl .dot{width:22px;height:22px;border-radius:50%;background:var(--c);border:4px solid var(--paper);box-shadow:0 0 0 1px var(--line);position:relative;z-index:1}
.band-paper .ffx-tl .dot{border-color:var(--paper)}
.ffx-tl b{display:block}
.ffx-tl span{font-size:13.5px;color:var(--muted)}
.ffx-slots{display:grid;grid-template-columns:repeat(auto-fill,minmax(60px,1fr));gap:8px}
.ffx-slot{all:unset;box-sizing:border-box;cursor:pointer;text-align:center;border:1px solid var(--line);border-radius:12px;padding:9px 6px;background:var(--paper);display:grid;gap:0;font-size:13px}
.band-paper .ffx-slot{background:var(--cream)}
.ffx-slot b{font-family:var(--display);font-size:18px;font-weight:600;line-height:1.2}
.ffx-slot small{font-size:11.5px;color:var(--muted)}
.ffx-slot:hover{border-color:var(--gold)}
.ffx-slot[aria-pressed="true"]{background:var(--navy);color:#fff;border-color:var(--navy)}
.ffx-slot[aria-pressed="true"] small{color:#C6D7DD}
.ffx-times{grid-template-columns:repeat(3,minmax(0,1fr))}
.ffx-form{display:grid;gap:14px}
.ffx-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr));gap:12px}
.ffx-err{font-size:12.5px;color:var(--bad);font-weight:500;min-height:0}
.ffx-err:empty{display:none}
input.i[aria-invalid="true"],select.i[aria-invalid="true"]{border-color:var(--bad)}
.ffx-lbl{font-size:13px;font-weight:600;color:var(--ink)}
.ffx-prog{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;counter-reset:fp}
.ffx-prog li{counter-increment:fp;display:grid;gap:6px;font-size:12.5px;font-weight:600;color:var(--muted)}
.ffx-prog li::before{content:"";height:6px;border-radius:999px;background:var(--line)}
.ffx-prog li span::before{content:counter(fp) ". "}
.ffx-prog li.done::before,.ffx-prog li[aria-current="step"]::before{background:var(--gold)}
.ffx-prog li[aria-current="step"]{color:var(--ink)}
.ffx-ok{border:2px solid var(--ok);border-radius:var(--r);padding:20px;display:grid;gap:8px;background:var(--paper)}
.ffx-ok h3{color:var(--ok)}
.ffx-check{display:flex;gap:10px;align-items:flex-start;font-size:13.5px}
.ffx-check input{margin-top:4px;accent-color:var(--navy)}
.ffx-facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr));gap:12px}
.ffx-fact{border-radius:14px;padding:16px;border:1px solid var(--line);background:var(--paper);display:grid;gap:2px;border-top:4px solid var(--c)}
.ffx-fact b{font-family:var(--display);font-size:22px;font-weight:600;line-height:1.2}
.ffx-fact span{font-size:13px;color:var(--muted)}
.ffx-pillar{border-top:5px solid var(--c)}
.ffx-pillar .ic{width:46px;height:46px;border-radius:14px;background:var(--s);display:grid;place-items:center;font-family:var(--display);font-weight:600;color:var(--c);font-size:20px}
.ffx-price{display:grid;gap:14px}
.ffx-price .amt{font-family:var(--display);font-size:52px;font-weight:600;line-height:1}
.ffx-price .amt small{font-size:16px;color:var(--muted);font-family:var(--body);font-weight:500}
.ffx-status{display:grid;gap:8px;border:1px solid var(--line);border-radius:14px;padding:14px;background:var(--paper2)}
.ffx-status .row{display:flex;justify-content:space-between;gap:10px;font-size:13.5px;flex-wrap:wrap}
.ffx-role{border-left:5px solid var(--c)}
.band-navy .ffx-dark{background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.14);color:#fff}
.band-navy .ffx-dark .small{color:#C6D7DD}
.ffx-report{background:var(--paper);color:var(--ink);border-radius:18px;overflow:hidden;border:1px solid var(--line)}
.ffx-report .top{background:var(--lumi);color:#fff;padding:10px 16px;display:flex;justify-content:space-between;gap:8px;font-weight:600;font-size:13.5px;flex-wrap:wrap}
.ffx-report .bd{padding:16px;display:grid;gap:10px}
@media (max-width:520px){.ffx-off span{display:none}.ffx-off{padding:8px 12px}.ffx-off b{font-size:14px}.ffx-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.ffx-kpi b{font-size:24px}.ffx-tl li{grid-template-columns:58px 22px minmax(0,1fr);gap:10px}.ffx-tl li::before{left:calc(58px + 10px + 10px)}.ffx-big{font-size:38px}}
/* ---- v6 motion upgrade: Academy (A-F) + Watch (O). Colors are site variables or color-mix() of them. ---- */
/* A. Booker, the Academy guide */
.phero .ffx-guide{--gh:clamp(300px,29vw,380px);justify-self:end;align-self:end;position:relative;width:min(300px,100%);height:var(--gh);margin-bottom:calc(-1 * clamp(36px,5vw,64px));z-index:1}
.ffx-guide-floor{position:absolute;left:8%;right:8%;bottom:-10px;height:40px;border-radius:50%;background:radial-gradient(closest-side,color-mix(in srgb,var(--gold) 45%,transparent),transparent);pointer-events:none}
.ffx-guide-tilt,.ffx-guide-bob{height:100%;display:grid;place-items:end center;transform-origin:50% 100%}
.ffx-guide-btn{all:unset;cursor:pointer;height:100%;display:grid;place-items:end center;transform-origin:50% 95%;border-radius:24px;-webkit-tap-highlight-color:transparent}
.ffx-guide-btn:focus-visible{outline:2px solid var(--gold);outline-offset:4px}
.ffx-guide img{height:var(--gh);width:auto;max-width:none;filter:drop-shadow(0 16px 22px color-mix(in srgb,var(--navy) 70%,transparent));user-select:none;-webkit-user-drag:none}
.ffx-say{position:absolute;top:4%;right:80%;background:var(--paper);color:var(--ink);font-family:var(--display);font-weight:600;font-size:15px;line-height:1.25;padding:10px 14px;border-radius:16px;width:max-content;max-width:200px;box-shadow:0 10px 24px color-mix(in srgb,var(--navy) 45%,transparent);opacity:0;transform:scale(.6);transform-origin:100% 100%;pointer-events:none;z-index:2}
.ffx-say::after{content:"";position:absolute;right:-7px;bottom:14px;border:8px solid transparent;border-left-color:var(--paper)}
.ffx-say.on{opacity:1;transform:none}
@media (max-width:820px){.phero .ffx-guide{--gh:200px;justify-self:end;width:140px;margin-top:-56px}.ffx-say{right:88%;max-width:160px;font-size:13px}}
@media (max-width:520px){.phero .ffx-guide{--gh:170px;width:116px;margin-top:-40px}}
/* B. Welcome video + chapter playhead */
.ffx-welcome{position:relative}
.ffx-welcome .ffx-wmain{position:relative;z-index:2}
.ffx-welcome .ffx-player{transform-origin:50% 50%}
.ffx-pinfit{min-height:calc(100vh - var(--ffx-hdr,100px));display:grid;align-content:center}
.ffx-chapwrap{position:relative;padding-left:22px}
.ffx-ph{position:absolute;left:5px;top:22px;bottom:22px;width:4px;border-radius:4px;background:var(--line)}
.ffx-ph b{position:absolute;left:0;top:0;width:100%;height:100%;border-radius:4px;background:var(--gold);transform-origin:50% 0;transform:scaleY(0)}
.ffx-ph i{position:absolute;left:50%;top:0;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;background:var(--gold);box-shadow:0 0 0 4px color-mix(in srgb,var(--gold) 30%,transparent)}
/* C. Credential climb */
.ffx-climb{position:relative;overflow:hidden;padding-block:36px}
.ffx-climb .wrap{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:clamp(24px,4vw,56px);align-items:center}
.ffx-climb-copy{display:grid;gap:16px;align-content:center}
.ffx-climb-copy .head{margin:0}
.ffx-climb-copy h2{color:var(--on-dark)}
.ffx-now{border:1px solid color-mix(in srgb,var(--on-dark) 16%,transparent);background:color-mix(in srgb,var(--on-dark) 5%,transparent);border-radius:var(--r);padding:18px;display:grid;gap:8px}
.ffx-now .lv{font-size:12px;letter-spacing:.12em;text-transform:uppercase;font-weight:600;color:var(--gold)}
.ffx-now b{font-family:var(--display);font-size:22px;font-weight:600;line-height:1.2;color:var(--on-dark)}
.ffx-now .small{color:#B8CCD3}
.ffx-now .meter{background:color-mix(in srgb,var(--on-dark) 10%,transparent);border-color:transparent}
.ffx-now .meter i{background:var(--gold)}
.ffx-now .btn{justify-self:start;padding:8px 16px}
.ffx-stage{position:relative;height:min(calc(100vh - var(--ffx-hdr,100px) - 72px),760px);min-height:520px;aspect-ratio:760/840}
.ffx-stage>svg.route{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.route .trail{fill:none;stroke:color-mix(in srgb,var(--on-dark) 26%,transparent);stroke-width:4;stroke-dasharray:2 12;stroke-linecap:round}
.route .drawn{fill:none;stroke:var(--gold);stroke-width:8;stroke-linecap:round}
.route .glow{fill:none;stroke:color-mix(in srgb,var(--gold) 25%,transparent);stroke-width:22;stroke-linecap:round}
.ffx-star{position:absolute;width:var(--s,14px);height:var(--s,14px);background:var(--gold);opacity:.75;clip-path:polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)}
.ffx-rungs{list-style:none;margin:0;padding:0}
.ffx-stage .ffx-cr{position:absolute;left:var(--x);top:var(--y);width:0;height:0;z-index:2}
.ffx-ring{display:block;width:76px;height:76px;overflow:visible;flex:none}
.ffx-ring .bg{fill:none;stroke:var(--line);stroke-width:7}
.ffx-ring .fil{fill:none;stroke:var(--c);stroke-width:7;stroke-linecap:round}
.ffx-ring .core{fill:var(--paper);stroke:var(--c);stroke-width:2}
.ffx-ring text{font-family:var(--display);font-weight:600;font-size:17px;fill:var(--c);text-anchor:middle}
.ffx-ring.earned .core{fill:var(--gold);stroke:var(--gold-deep)}
.ffx-ring.earned .fil{stroke:var(--gold)}
.ffx-ring.earned text{fill:var(--navy)}
.ffx-climb .ffx-ring .bg{stroke:color-mix(in srgb,var(--on-dark) 16%,transparent)}
.ffx-climb .ffx-ring .core{fill:var(--navy2)}
.ffx-climb .ffx-ring text{fill:var(--on-dark)}
.ffx-climb .ffx-ring.earned .core{fill:var(--gold)}
.ffx-climb .ffx-ring.earned text{fill:var(--navy)}
.ffx-stage .ffx-cr .ffx-ring{position:absolute;left:-38px;top:-38px}
.ffx-cr .lbl{position:absolute;top:-34px;width:200px;display:grid;gap:3px;line-height:1.25}
.ffx-cr.L .lbl{right:50px;text-align:right;justify-items:end}
.ffx-cr.R .lbl{left:50px}
.ffx-cr .lbl .lv{font-size:11.5px;letter-spacing:.12em;text-transform:uppercase;font-weight:600;color:var(--gold)}
.ffx-cr .lbl b{font-family:var(--display);font-size:16px;font-weight:600;color:var(--on-dark)}
.ffx-cr .lbl .st{font-size:12.5px;color:#B8CCD3}
.ffx-cr.earned .lbl .st{color:var(--gold);font-weight:600}
.ffx-climber{position:absolute;left:0;top:0;width:0;height:0;z-index:3;pointer-events:none}
.ffx-climber img{position:absolute;bottom:30px;left:-24px;height:76px;width:auto;max-width:none;filter:drop-shadow(0 6px 8px color-mix(in srgb,var(--navy) 80%,transparent))}
.ffx-mline,.ffx-here{display:none}
@media (max-width:819px){
 .ffx-climb{padding-block:clamp(44px,6vw,80px)}
 .ffx-climb .wrap{grid-template-columns:minmax(0,1fr)}
 .ffx-stage{height:auto;min-height:0;aspect-ratio:auto}
 .ffx-stage>svg.route,.ffx-climber,.ffx-star{display:none}
 .ffx-rungs{display:grid;gap:16px;position:relative}
 .ffx-stage .ffx-cr{position:relative;left:auto;top:auto;width:auto;height:auto;display:grid;grid-template-columns:76px minmax(0,1fr) auto;gap:14px;align-items:center}
 .ffx-stage .ffx-cr .ffx-ring{position:relative;left:auto;top:auto}
 .ffx-cr .lbl,.ffx-cr.L .lbl,.ffx-cr.R .lbl{position:static;width:auto;text-align:left;justify-items:start}
 .ffx-mline{display:block;position:absolute;left:36px;top:38px;bottom:38px;width:4px;border-radius:4px;background:color-mix(in srgb,var(--on-dark) 14%,transparent)}
 .ffx-mline i{display:block;height:100%;border-radius:4px;background:var(--gold);transform-origin:50% 0}
 .ffx-here{display:block;height:62px;width:auto;max-width:none}
}
/* D. Certificate: foil glare, tilt, stamp */
.ffx-certwrap{position:relative;transform-style:preserve-3d}
.ffx-cert{overflow:hidden}
.ffx-glare{position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:1;mix-blend-mode:screen;opacity:var(--go,.55);
 background:radial-gradient(circle at var(--gx,50%) var(--gy,20%),color-mix(in srgb,var(--on-dark) 30%,transparent),color-mix(in srgb,var(--gold) 16%,transparent) 22%,transparent 52%),
 linear-gradient(115deg,transparent 28%,color-mix(in srgb,var(--gold) 20%,transparent) 42%,color-mix(in srgb,var(--on-dark) 22%,transparent) 50%,color-mix(in srgb,var(--gold) 20%,transparent) 58%,transparent 72%) var(--gx,50%) 0/260% 100% no-repeat;transition:opacity .4s}
.ffx-cert .nm .ffx-l{display:inline-block;white-space:pre}
.ffx-cert .nm.ph{color:color-mix(in srgb,var(--on-dark) 55%,transparent)}
.ffx-stamp{position:absolute;right:20px;bottom:18px;width:88px;height:88px;border-radius:50%;z-index:2;display:grid;place-items:center;text-align:center;transform:rotate(-12deg);background:var(--gold);color:var(--navy);font-family:var(--display);font-weight:700;font-size:13px;line-height:1.1;box-shadow:0 0 0 4px var(--navy),0 0 0 6px var(--gold),0 8px 18px color-mix(in srgb,var(--navy) 60%,transparent)}
.ffx-stamp::before{content:"";position:absolute;inset:7px;border:1.5px dashed var(--navy);border-radius:50%}
.ffx-stamp small{display:block;font-size:10px;font-weight:600;font-family:var(--body)}
@media (max-width:520px){.ffx-stamp{width:70px;height:70px;font-size:11px;right:14px;bottom:14px}.ffx-stamp small{font-size:8.5px}}
/* E. Streaming rails (shared by Academy and Watch) */
.ffx-rails{display:grid}
.ffx-track{transition:opacity .35s}
.ffx-track.is-dim{opacity:.5}
.ffx-track.is-dim:hover,.ffx-track.is-dim:focus-within{opacity:1}
.ffx-track.is-pick>header{border-bottom-color:var(--gold)}
.ffx-track>header .who{order:5;flex-basis:100%;margin-top:-6px}
.ffx-track>header .ffx-rnav{margin-left:auto}
.ffx-rnav{display:flex;gap:6px}
.ffx-rnav button{all:unset;box-sizing:border-box;cursor:pointer;width:36px;height:36px;border-radius:50%;border:1px solid var(--line);background:var(--paper);color:var(--ink);display:grid;place-items:center;font-size:18px;line-height:1}
.band-paper .ffx-rnav button{background:var(--cream)}
.ffx-rnav button:hover{border-color:var(--gold)}
.ffx-rnav button:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
.ffx-rnav button:disabled{opacity:.35;cursor:default}
.ffx-rbar{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:14px}
.ffx-rbar .ffx-rnav{margin-left:auto}
.ffx-rail{position:relative;overflow-x:auto;overflow-y:hidden;overscroll-behavior-x:contain;scroll-snap-type:x mandatory;scroll-padding-inline:20px;scrollbar-width:none;margin-inline:-20px;padding:6px 20px 16px}
.ffx-rail::-webkit-scrollbar{display:none}
.ffx-rail:focus-visible{outline:2px solid var(--gold);outline-offset:-2px;border-radius:12px}
.ffx-rail.js-drag{scroll-snap-type:none;cursor:grab}
.ffx-rail.is-drag{cursor:grabbing;user-select:none}
.ffx-rail.is-drag *{pointer-events:none}
.ffx-rail-in{display:flex;gap:16px;width:max-content;min-width:100%;align-items:stretch}
.ffx-rail-in>*{scroll-snap-align:start;flex:0 0 auto}
.ffx-mcard{width:268px;background:var(--paper);border:1px solid var(--line);border-radius:var(--r);overflow:hidden;display:grid;grid-template-rows:auto 1fr;position:relative}
.band-paper .ffx-mcard{background:var(--cream)}
.ffx-mcard.ep{width:330px}
.ffx-mcard[hidden]{display:none}
.ffx-thumb{position:relative;aspect-ratio:16/10;overflow:hidden;cursor:pointer;border-bottom:4px solid var(--c);background:linear-gradient(140deg,color-mix(in srgb,var(--c) 28%,var(--paper)),color-mix(in srgb,var(--c) 8%,var(--paper)));-webkit-touch-callout:none;user-select:none}
.ffx-thumb .kb{position:absolute;inset:0;transform-origin:72% 85%}
.ffx-thumb .kb::before{content:"";position:absolute;inset:-10%;background:radial-gradient(color-mix(in srgb,var(--c) 24%,transparent) 1.6px,transparent 2.2px) 0 0/16px 16px}
.ffx-thumb .kb::after{content:"";position:absolute;right:-12%;bottom:-40%;width:75%;aspect-ratio:1;border-radius:50%;background:color-mix(in srgb,var(--c) 22%,transparent)}
.ffx-thumb .kb img{position:absolute;right:7%;bottom:-6%;height:98%;width:auto;max-width:none;z-index:1;filter:drop-shadow(0 8px 10px color-mix(in srgb,var(--navy) 30%,transparent));-webkit-user-drag:none}
.ffx-thumb .kb .grp{position:absolute;right:2%;bottom:-5%;height:78%;max-width:62%;display:flex;align-items:flex-end;z-index:1}
.ffx-thumb .kb .grp img{position:static;height:82%;margin-left:-16%}
.ffx-thumb .kb .grp img:nth-child(2){height:88%}.ffx-thumb .kb .grp img:nth-child(4){height:90%}
.ffx-thumb .num{position:absolute;left:14px;bottom:6px;z-index:2;font-family:var(--display);font-weight:700;font-size:50px;line-height:1;color:var(--c);letter-spacing:-.02em}
.ffx-thumb .cd{position:absolute;left:12px;top:10px;z-index:2;font-size:11.5px;font-weight:600;background:var(--paper);color:var(--ink);padding:2px 9px;border-radius:999px;border:1px solid var(--line)}
.ffx-thumb .dur{position:absolute;right:10px;top:10px;z-index:2;font-size:11.5px;font-weight:600;background:var(--navy);color:var(--on-dark);padding:2px 9px;border-radius:999px}
.ffx-thumb .ok{position:absolute;left:12px;top:36px;z-index:2;font-size:11.5px;font-weight:600;background:var(--ok);color:var(--on-dark);padding:2px 9px;border-radius:999px}
.ffx-thumb .play{position:absolute;left:50%;top:50%;width:48px;height:48px;margin:-24px 0 0 -24px;border-radius:50%;background:var(--gold);z-index:3;opacity:0;transform:scale(.7);transition:opacity .25s,transform .35s cubic-bezier(.34,1.56,.64,1);box-shadow:0 8px 18px color-mix(in srgb,var(--navy) 35%,transparent)}
.ffx-thumb .play::before{content:"";position:absolute;left:19px;top:15px;width:16px;height:18px;background:var(--navy);clip-path:polygon(0 0,100% 50%,0 100%)}
.ffx-thumb:hover .play,.ffx-thumb.is-prev .play{opacity:1;transform:none}
.ffx-thumb video.pv{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:2;opacity:0;transition:opacity .3s}
.ffx-mbody{padding:14px 16px 16px;display:flex;flex-direction:column;gap:8px}
.ffx-mbody>*{flex:none}
.ffx-mbody h4{margin:0;font-family:var(--display);font-weight:600;font-size:16.5px;line-height:1.25}
.ffx-mbody h3{font-size:18px}
.ffx-mbody .meter i{background:var(--c)}
.ffx-mbody .btn{align-self:flex-start;padding:8px 16px;margin-top:2px}
.ffx-mbody .btn.done{background:transparent;color:var(--ok);border-color:var(--ok)}
.ffx-mcard.ep .ffx-mbody{gap:10px}
.ffx-mcard.ep .btn{padding:8px 14px;font-size:13.5px}
.ffx-endcard{width:300px;flex:1 0 300px!important;border:2px dashed color-mix(in srgb,var(--c) 55%,var(--line));border-radius:var(--r);padding:20px;display:flex;flex-wrap:wrap;gap:16px 20px;align-items:center;align-content:center;background:color-mix(in srgb,var(--c) 7%,var(--paper))}
.ffx-endcard .tx{display:grid;gap:4px;flex:1 1 200px;min-width:0}
.ffx-endcard .tx b{font-family:var(--display);font-size:19px;font-weight:600;line-height:1.2}
.ffx-endcard .btn{padding:8px 16px}
@media (max-width:819px){.ffx-rnav{display:none}}
@media (max-width:819px){#ffx-library .ffx-tabs,#ffx-eps .ffx-tabs{flex-wrap:nowrap;overflow-x:auto;margin-inline:-20px;padding:2px 20px 10px;scrollbar-width:none}#ffx-library .ffx-tabs::-webkit-scrollbar,#ffx-eps .ffx-tabs::-webkit-scrollbar{display:none}#ffx-library .ffx-tabs button,#ffx-eps .ffx-tabs button{flex:none}}
.ffx-mbody>.meter,.ffx-mbody>.acts2{margin-top:auto}
.ffx-mbody{min-height:0}
@media (max-width:520px){.ffx-mcard{width:min(76vw,268px)}.ffx-mcard.ep{width:min(84vw,330px)}.ffx-endcard{width:min(84vw,300px);flex-basis:min(84vw,300px)!important}}
/* O. Classroom TV */
.ffx-tv{position:relative;display:grid;justify-items:center;padding:4px 0 14px}   /* room for the console feet and Bop's toes: the captions note below never sits under them */
.ffx-tv-set{position:relative;width:100%;background:var(--booker);border-radius:26px;padding:14px 14px 0;box-shadow:inset 0 -6px 0 color-mix(in srgb,var(--booker) 70%,var(--navy)),0 22px 40px color-mix(in srgb,var(--navy) 22%,transparent)}
.ffx-tv-set::after{content:"";position:absolute;inset:6px;border:2px dashed color-mix(in srgb,var(--on-dark) 45%,transparent);border-radius:20px;pointer-events:none}
.ffx-tv-screen{position:relative;border-radius:14px;overflow:hidden;background:var(--navy)}
.ffx-tv .ffx-player{border-radius:14px;border:3px solid var(--navy);box-shadow:inset 0 0 30px color-mix(in srgb,var(--navy) 60%,transparent)}
.ffx-tv-chin{display:flex;align-items:center;justify-content:flex-end;gap:14px;padding:10px 12px 14px;color:var(--on-dark);font-family:var(--display);font-weight:600;font-size:14px;letter-spacing:.02em}
.ffx-tv-chin .knobs{display:flex;gap:8px;align-items:center}
.ffx-tv-chin .led{width:8px;height:8px;border-radius:50%;background:var(--zuri);box-shadow:0 0 8px var(--zuri)}
.ffx-tv-chin .knob{width:14px;height:14px;border-radius:50%;background:var(--gold);box-shadow:inset 0 -2px 0 var(--gold-deep)}
.ffx-tv-neck{width:20%;height:14px;background:color-mix(in srgb,var(--booker) 55%,var(--navy))}
.ffx-tv-console{position:relative;width:94%;height:62px;border-radius:12px 12px 6px 6px;padding:10px 12px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;
 background:repeating-linear-gradient(90deg,transparent 0 46px,color-mix(in srgb,var(--navy) 9%,transparent) 46px 48px),linear-gradient(180deg,color-mix(in srgb,var(--bop) 66%,var(--navy)),color-mix(in srgb,var(--bop) 48%,var(--navy)));box-shadow:inset 0 4px 0 color-mix(in srgb,var(--bop) 80%,var(--navy))}
.ffx-tv-console span{position:relative;border-radius:6px;background:color-mix(in srgb,var(--bop) 58%,var(--navy));box-shadow:inset 0 0 0 2px color-mix(in srgb,var(--bop) 40%,var(--navy))}
.ffx-tv-console span::after{content:"";position:absolute;left:50%;top:50%;width:18px;height:5px;margin:-2.5px 0 0 -9px;border-radius:4px;background:var(--gold)}
.ffx-tv-console::before,.ffx-tv-console::after{content:"";position:absolute;bottom:-12px;width:12px;height:12px;border-radius:0 0 4px 4px;background:color-mix(in srgb,var(--bop) 40%,var(--navy))}
.ffx-tv-console::before{left:7%}.ffx-tv-console::after{right:7%}
.ffx-tv-bop{position:absolute;left:-2%;bottom:-6px;height:138px;width:auto;max-width:none;z-index:3;filter:drop-shadow(0 8px 10px color-mix(in srgb,var(--navy) 30%,transparent));pointer-events:none}
@media (max-width:520px){.ffx-tv-set{border-radius:18px;padding:9px 9px 0}.ffx-tv-set::after{inset:4px;border-radius:14px}.ffx-tv-bop{height:92px;left:-6px}.ffx-tv-chin{font-size:12px;padding:8px 8px 10px}.ffx-tv-console{height:46px;padding:7px 9px}}
`;
  document.head.appendChild(css);
}

// ================================================================ 1. TRAINING ACADEMY
const TRACKS = [
  {p:'F', i:0, k:'booker', ch:'booker'}, {p:'C', i:1, k:'zuri', ch:'zuri'}, {p:'L', i:2, k:'bop', ch:'bop'},
  {p:'D', i:3, k:'navy', ch:'booker'}, {p:'K', i:4, k:'rainbow', ch:'bop'}, {p:'H', i:5, k:'lumi', ch:'lumi'}, {p:'T', i:6, k:'gold', ch:'zuri'}
].map(t => { const l = LAD[t.i] || ['', t.p, '', '', t.k, '']; return Object.assign(t, {level:l[0], name:l[1], who:l[2], ladderH:l[3], access:l[5], mods:MOD.filter(m => (m.code||'').startsWith(t.p + '-'))}); });
const trackOf = code => TRACKS.find(t => (code||'').startsWith(t.p + '-')) || TRACKS[0];
const TOTAL_H = MOD.reduce((a, m) => a + (+m.hours || 0), 0);

const ACAD = () => { const a = load('ff-academy', {}); a.done = a.done && typeof a.done === 'object' ? a.done : {}; a.open = a.open && typeof a.open === 'object' ? a.open : {}; a.q = a.q && typeof a.q === 'object' ? a.q : {}; a.earned = a.earned && typeof a.earned === 'object' ? a.earned : {}; a.name = typeof a.name === 'string' ? a.name : ''; return a; };
const modPct = (a, code) => a.done[code] ? 100 : Math.min(90, (a.open[code] ? 10 : 0) + Object.keys(a.q[code] || {}).length * 25);
const trackStat = (a, t) => { const n = t.mods.length, d = t.mods.filter(m => a.done[m.code]).length; return {n, d, pct: n ? Math.round(d / n * 100) : 0, earned: n > 0 && d === n}; };

// Chapter starts match the W10 sample lesson video (academy-welcome.mp4, 98.6 s; edit EDL in plush-generated/video-w10-academy/edit).
const CHAPTERS = [[0, 'Welcome', 'Ms. June on what the Academy is for'], [14.6, 'The four friends', 'Booker, Lumi, Zuri and Bop and their pillars'], [49.5, 'The daily learning loop', 'Watch, talk, do, move, explore, take home'], [72.1, 'Your proposed learning pathway', 'Explore the planned Academy levels']];

const OBJ = {
  F: t => [`Explain how "${t}" fits the Futures Friends learning loop`, 'Try a classroom practice in your own room this week', 'Identify a practical classroom next step and the resources you would need'],
  C: t => [`Plan and lead one activity from "${t}" with versions for twos and pre-K`, 'Use the friend, the value and the refrain to keep children engaged', 'Document what you observe in a short, factual note'],
  L: t => [`Use "${t}" to support another teacher, not evaluate them`, 'Model the move first, then coach with one specific next step', 'Record the conversation in the mentoring log'],
  D: t => [`Apply "${t}" to your own center's numbers and rooms`, 'Spot the compliance risk before a licensing visit does', 'Turn the lesson into one action on the director dashboard'],
  K: t => [`Prepare and serve to the standard in "${t}"`, 'Meet the CACFP meal pattern for ages 3 to 5 at every meal', 'Keep every plate choking-safe for children under five'],
  H: t => [`Adapt "${t}" to one room with mixed ages`, 'Keep zones, routines and safety right-sized for a home', 'Share the day with families in under two minutes'],
  T: t => [`Facilitate "${t}" so adults experience the loop themselves`, 'Co-teach a Level 1 cohort with an experienced Futures Friends trainer', 'Give feedback that is specific, kind and actionable']
};
const BANK = {
  F: [
    ['How long is a Futures Friends episode?', ['1 to 2 minutes', '3 to 6 minutes', '15 to 20 minutes'], 1, 'Episodes run 3 to 6 minutes. The episode is the spark; the teacher, the talk and the activity do the teaching.'],
    ['What is the weekly ceiling on Futures Friends episodes for children 3 to 5?', ['30 minutes a week', '30 minutes a day', 'One hour a day'], 0, 'Scheduled program minutes are at most 24 a week (one episode of up to 6 minutes, Monday to Thursday), under a ceiling of 30 minutes a week, watched with an adult. Children 2 and younger do not watch episodes in care.'],
    ['In the learning loop, what comes right after Watch?', ['Take home', 'Talk', 'Move'], 1, 'Watch, Talk, Do, Move, Explore, Take home. The teacher asks what happened and why right after the episode.'],
    ['Which friend leads the Calm Corner?', ['Bop', 'Zuri', 'Lumi'], 2, 'Lumi the bunny is the Kindness Keeper. Her pillar is BELONG and her zone is Lumi\'s Calm Corner.'],
    ['What is the Missouri ratio for a room of two-year-olds?', ['1 adult for every 8 children', '1 adult for every 10 children', '1 adult for every 12 children'], 0, 'Missouri sets 1:8 for two-year-olds with groups up to 16, and 1:10 for threes and fours.'],
    ['How should grapes be served to children under five?', ['Whole, if they are small', 'Cut in half across the middle', 'Quartered lengthwise'], 2, 'Round foods are a choking risk. Grapes and cherry tomatoes are always quartered lengthwise.']
  ],
  C: [
    ['What is Booker\'s pillar?', ['LEARN', 'MOVE', 'EXPLORE'], 0, 'Booker the brown bear stands for LEARN and SMILE, and the value of confidence.'],
    ['A child is upset in the block area. What is the best first step?', ['Move the child to time-out', 'Name the feeling and offer the Calm Corner', 'Ask the child to apologize right away'], 1, 'Positive guidance starts by naming the feeling. Lumi\'s Calm Corner gives the child a place to settle before problem-solving.'],
    ['Which routine does Zuri\'s Discovery Zone use?', ['Predict, test, then talk about what happened', 'Memorize facts, then repeat them', 'Watch a video, then color a page'], 0, 'Zuri models curiosity: ask a question, guess, try it and talk about the result.'],
    ['What makes a strong observation note?', ['A general impression written at the end of the month', 'A short, factual note written during play, with the date', 'A photo with no words'], 1, 'Notes should say what the child did and said, written close to the moment and dated.'],
    ['How long should a family take-home activity take?', ['About five minutes', 'About an hour', 'A full weekend project'], 0, 'Take-homes are one question for dinner and a five-minute activity that matches the week.'],
    ['What value does Bop the elephant stand for?', ['Kindness', 'Independence', 'Curiosity'], 1, 'Bop is the Mighty Mover: MOVE and independence, from Bop & Go! moments to clean-up and doing it myself.']
  ],
  L: [
    ['How should a mentor conversation start?', ['With what the teacher noticed in their own lesson', 'With a list of what went wrong', 'With the rubric score'], 0, 'Reflective coaching begins with the teacher\'s own observation, then one specific next step.'],
    ['What does peer observation with the Futures rubric focus on?', ['The teacher\'s personality', 'Observable teacher and child behaviors', 'How quiet the room is'], 1, 'The rubric describes what you can see and hear, so feedback stays fair and specific.'],
    ['Which family event is the early-childhood answer to a science fair?', ['Story Night', 'Rainbow Night', 'Zuri\'s Discovery Day'], 2, 'At Discovery Day each class shows one question it explored, how it tested it and what it found.'],
    ['How many next steps should one coaching conversation end with?', ['One clear next step', 'Five or more', 'None, just praise'], 0, 'One focused next step is far more likely to happen than a long list.']
  ],
  D: [
    ['What is the Missouri ratio for three- and four-year-olds?', ['1:8', '1:10', '1:14'], 1, 'Missouri sets 1 adult for every 10 three- and four-year-olds, with groups up to 20.'],
    ['In a mixed group of twos and threes, which ratio applies?', ['The ratio for the youngest child', 'The ratio for the oldest child', 'An average of the two'], 0, 'The youngest child in the group sets the rule.'],
    ['What must a for-profit center meet each month it claims CACFP?', ['A 10% rule', 'The 25% rule', 'No income rule'], 1, 'For-profit centers must meet the 25% rule each month, so collect an income form from every family.'],
    ['How should a strong center tour end?', ['With a clear next step: apply or join the waitlist', 'With a brochure and no follow-up', 'With the tuition contract signed on the spot'], 0, 'Families should leave knowing exactly what happens next and when the center will follow up.']
  ],
  K: [
    ['How should grapes be prepared for children under five?', ['Whole', 'Halved across', 'Quartered lengthwise'], 2, 'Quarter round foods lengthwise to remove the choking risk.'],
    ['Which milk meets CACFP for children ages 2 to 5?', ['Unflavored 1% or fat-free', 'Whole chocolate milk', 'Flavored 2%'], 0, 'CACFP requires unflavored low-fat (1%) or fat-free milk for ages 2 through 5.'],
    ['How often can juice be served?', ['At every meal', 'No more than once a day', 'Never'], 1, 'Juice counts as a fruit or vegetable no more than once a day under CACFP.'],
    ['How should apples be served to children under four?', ['Raw slices', 'Cooked soft', 'Whole'], 1, 'Hard raw fruits and vegetables are cooked soft for the youngest children.']
  ],
  H: [
    ['In a mixed-age home group, how is the episode used?', ['Watched together, then one activity with a twos version and a pre-K stretch', 'Each child watches alone on a tablet', 'Older children watch while younger ones nap'], 0, 'One shared episode, one shared activity, scaled up or down by age.'],
    ['What is the best way to fit four zones into a small space?', ['Skip the zones in a home', 'Rotating zone baskets and labeled bins', 'Only use the zones on Fridays'], 1, 'Zone baskets come out for their part of the day and pack away, so one room can hold all four friends.'],
    ['Which training path is designed for home providers?', ['Home Educator', 'Eat the Rainbow Cook', 'Futures Friends Trainer'], 0, 'The Home Educator path is planned as part of the Home membership.']
  ],
  T: [
    ['Where is the Trainer Academy held?', ['Online only', 'Two in-person days at the flagship center', 'At each trainee\'s own center'], 1, 'The Trainer Academy runs two in-person days at Futures Learning Center in Independence, Missouri.'],
    ['What should a Futures training session for adults model?', ['The learning loop itself', 'A lecture with slides only', 'A written test first'], 0, 'Adults learn the loop by doing it: watch, talk, do, move, explore and take something home.'],
    ['What comes after the Trainer Academy?', ['Nothing, you are done', 'Co-teaching a cohort with an experienced trainer', 'A year of observation'], 1, 'The Trainer path includes co-teaching before leading cohorts alone.']
  ]
};
const OVERRIDE = {
  'F-105': [['When a Missouri child care worker suspects abuse or neglect, when must they report?', ['Immediately, to the Missouri Child Abuse and Neglect Hotline', 'After talking with the child\'s family', 'Only after the director agrees'], 0, 'Mandated reporters report immediately and directly. Telling a supervisor does not replace your own report.']],
  'F-108': [['What should happen right after an episode ends?', ['Start the next episode', 'Turn the screen off and ask what happened and why', 'Let children choose another video'], 1, 'The screen goes off as soon as the story ends. The conversation is where the learning starts.']],
  'D-401': [['A room has 16 two-year-olds. How many adults are needed in Missouri?', ['1', '2', '3'], 1, 'At 1:8, sixteen two-year-olds need two adults, and 16 is also the maximum group size.']],
  'K-502': [['Which of these is never served to young children?', ['Cooked carrots', 'Whole nuts or popcorn', 'Quartered grapes'], 1, 'Whole nuts, popcorn and hard candy are never served to children under five.']]
};
const quizFor = code => { const t = trackOf(code), bank = BANK[t.p] || BANK.F, idx = Math.max(0, t.mods.findIndex(m => m.code === code));
  const qs = (OVERRIDE[code] || []).slice(); let j = 0; while (qs.length < 3 && j < bank.length) { const cand = bank[(idx + j) % bank.length]; if (!qs.some(x => x[0] === cand[0])) qs.push(cand); j++; } return qs.slice(0, 3); };

// Chapter list with a gold playhead track (B). The playhead is placed by placeHead() in JS; without JS it sits on chapter 1.
const chapterList = () => `<div class="ffx-chapwrap" data-ffx-chapwrap><span class="ffx-ph" aria-hidden="true"><b></b><i></i></span><ol class="ffx-chaps" aria-label="Chapters">${CHAPTERS.map((c, i) => `<li><button type="button" data-ffx-seek="${c[0]}" data-ffx-for="ffxAcadVid" aria-current="${i === 0}"><span class="t">${mmss(c[0])}</span><span><b>${c[1]}</b><small>${c[2]}</small></span></button></li>`).join('')}</ol></div>`;

const certCard = a => { const earned = TRACKS.filter(t => trackStat(a, t).earned); const t = earned[earned.length - 1]; const locked = !t; const tt = t || TRACKS[0];
  const dt = locked ? new Date() : (a.earned[tt.p] ? fromIso(a.earned[tt.p]) : new Date()); const hrs = tt.mods.reduce((s, m) => s + (+m.hours || 0), 0);
  return `<div style="display:grid;gap:12px">
   <label class="f" for="ffxName">Name on certificate<input class="i" id="ffxName" autocomplete="name" placeholder="Your name" value="${esc(a.name)}" maxlength="60"></label>
   <div class="ffx-certwrap" data-ffx-certwrap>${locked ? `<span class="ffx-lock">Preview · complete ${esc(tt.name)} to unlock</span>` : ''}
   <div class="ffx-cert${locked ? ' locked' : ''}" data-motion="reveal" aria-label="Certificate preview" ${locked ? '' : `data-ffx-earned="${tt.p}"`}>
    <span class="ffx-glare" aria-hidden="true"></span>
    <img class="ff-plush-wm" src="img/brand/ff-plush-wordmark-320.webp" srcset="img/brand/ff-plush-wordmark-320.webp 320w, img/brand/ff-plush-wordmark-640.webp 640w" sizes="150px" width="150" height="70" alt="Futures Friends" style="width:150px;height:auto">
    <span class="k">Futures Friends completion record</span>
    <span class="small" style="color:#C6D7DD">This records that</span>
    <span class="nm${a.name.trim() ? '' : ' ph'}" id="ffxCertName">${esc(a.name.trim()) || 'Your name'}</span>
    <span class="small" style="color:#C6D7DD">has completed</span>
    <span class="cr">${esc(tt.level)} · ${esc(tt.name)}</span>
    <span class="small" style="color:#C6D7DD">${tt.mods.length} modules · ${fmtH(hrs)} planned training hours · Futures Friends Training Academy</span>
    <div class="sig"><span>${longDate(dt)}<br>Date</span><span>Director of Training<br>Futures Friends</span></div>
    ${locked ? '' : `<span class="ffx-stamp" aria-hidden="true"><span>Earned<small>${shortDate(dt)}</small></span></span>`}
   </div></div>
   <p class="note">${locked ? 'The certificate fills in with your name and the completion date once every module in a credential is complete.' : 'Certificate preview only. This preview does not issue a professional credential or approved training hours.'}</p></div>`; };

// ---- shared ring badge (climb rungs + rail end cards). Morphs circle -> star when earned.
const CIRCLE_D = 'M40,13 C54.9,13 67,25.1 67,40 C67,54.9 54.9,67 40,67 C25.1,67 13,54.9 13,40 C13,25.1 25.1,13 40,13 Z';
const STAR_D = (() => { let d = ''; for (let i = 0; i < 10; i++) { const r = i % 2 ? 13.5 : 30, an = -Math.PI / 2 + i * Math.PI / 5; d += (i ? ' L' : 'M') + (40 + r * Math.cos(an)).toFixed(2) + ',' + (41 + r * Math.sin(an)).toFixed(2); } return d + ' Z'; })();
const ringSvg = (pct, earned, label) => `<svg class="ffx-ring${earned ? ' earned' : ''}" viewBox="0 0 80 80" aria-hidden="true"><circle class="bg" cx="40" cy="40" r="35"/><circle class="fil" cx="40" cy="40" r="35" pathLength="100" stroke-dasharray="100" stroke-dashoffset="${100 - pct}" transform="rotate(-90 40 40)"/><path class="core" d="${earned ? STAR_D : CIRCLE_D}"/><text x="40" y="${earned ? 47 : 46}">${earned ? '✓' : label}</text></svg>`;
const shortLabel = t => t.level.startsWith('Level') ? 'L' + t.level.replace(/\D/g, '') : t.level.slice(0, 1);

// ---- C. credential climb: geometry shared by the static render and the scroll timeline
const CLIMB_W = 760, CLIMB_H = 840;
const CLIMB_P = [[380, 832], [250, 745], [510, 640], [250, 535], [510, 430], [250, 325], [510, 222], [380, 128]];
const CLIMB_SEGS = CLIMB_P.slice(1).map((p2, i) => { const P = CLIMB_P, p0 = P[i - 1] || P[i], p1 = P[i], p3 = P[i + 2] || p2;
  return `C${(p1[0] + (p2[0] - p0[0]) / 5).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) / 5).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 5).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) / 5).toFixed(1)} ${p2[0]},${p2[1]}`; });
const CLIMB_D = `M${CLIMB_P[0][0]},${CLIMB_P[0][1]} ` + CLIMB_SEGS.join(' ');
const currentRung = a => { const i = TRACKS.findIndex(t => !trackStat(a, t).earned); return i < 0 ? TRACKS.length - 1 : i; };
const nowHtml = (a, i) => { const t = TRACKS[i], s = trackStat(a, t), nx = t.mods.find(m => !a.done[m.code]);
  return `<span class="lv">${esc(t.level)}${s.earned ? ' · earned' : ''}</span><b>${esc(t.name)}</b>
   <span class="small">For ${esc(t.who.toLowerCase())} · ${esc(t.access)}</span>
   <div class="meter" role="progressbar" aria-label="${esc(t.name)} progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${s.pct}"><i style="width:${s.pct}%"></i></div>
   <span class="small">${s.earned ? 'Every module complete. Your certificate is ready.' : `${s.d} of ${s.n} modules complete`}</span>
   ${nx ? `<button type="button" class="btn gold" data-ffx-lesson="${esc(nx.code)}">${modPct(a, nx.code) ? 'Continue' : 'Start'} ${esc(nx.code)}</button>` : `<button type="button" class="btn gold" data-anchor="ffx-certsec">See your certificate</button>`}`; };
const climbHtml = a => { const cur = currentRung(a), cp = CLIMB_P[cur + 1];
  const stars = [[8, 6, 16], [86, 4, 12], [30, 12, 10], [16, 30, 9], [92, 40, 11], [6, 66, 10], [90, 78, 9]];
  return `<div class="ffx-stage" data-ffx-stage>
   <svg class="route" viewBox="0 0 ${CLIMB_W} ${CLIMB_H}" aria-hidden="true"><path class="trail" d="${CLIMB_D}"/><path class="glow" d="${CLIMB_D}"/><path class="drawn" d="${CLIMB_D}"/></svg>
   ${stars.map(s => `<span class="ffx-star" aria-hidden="true" style="left:${s[0]}%;top:${s[1]}%;--s:${s[2]}px"></span>`).join('')}
   <span class="ffx-mline" aria-hidden="true"><i></i></span>
   <ol class="ffx-rungs" aria-label="Credential ladder, from Level 1 to Futures Friends Trainer">${TRACKS.map((t, i) => { const s = trackStat(a, t), p = CLIMB_P[i + 1], side = p[0] < CLIMB_P[i][0] ? 'L' : 'R';
     return `<li class="ffx-cr ${side}${s.earned ? ' earned' : ''}" style="--x:${(p[0] / CLIMB_W * 100).toFixed(3)}%;--y:${(p[1] / CLIMB_H * 100).toFixed(3)}%;--c:${solidOf(t.k)}" data-pct="${s.pct}" data-earned="${s.earned ? 1 : 0}">
      ${ringSvg(s.pct, s.earned, shortLabel(t))}
      <span class="lbl"><span class="lv">${esc(t.level)}</span><b>${esc(t.name)}</b><span class="st">${s.earned ? 'Earned ✓' : (s.d ? `${s.d} of ${s.n} modules · ${s.pct}%` : `${s.n} module${s.n === 1 ? '' : 's'}`)}</span></span>
      <span class="sr-only" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">${s.earned ? 'Earned' : s.pct + '% complete'}</span>
      ${i === cur ? '<img class="ffx-here" src="img/plush/characters/booker-480.webp" alt="You are here">' : ''}</li>`; }).join('')}</ol>
   <span class="ffx-climber" data-ffx-climber style="left:${(cp[0] / CLIMB_W * 100).toFixed(3)}%;top:${(cp[1] / CLIMB_H * 100).toFixed(3)}%"><img src="img/plush/characters/booker-480.webp" alt="" draggable="false"></span>
  </div>`; };

// ---- E. rails (shared with Watch). A card can carry data-preview="video/xyz.mp4"; without it the thumbnail gets a Ken Burns stand-in.
const PREVIEWS = {}; // e.g. {'F-101': 'video/preview-f101.mp4', 'ep1': 'video/preview-ep1.mp4'} once preview loops are produced
const prevAttr = k => PREVIEWS[k] ? ` data-preview="${PREVIEWS[k]}"` : '';
const rnav = label => `<div class="ffx-rnav"><button type="button" data-ffx-rnav="-1" aria-label="Scroll ${esc(label)} back">‹</button><button type="button" data-ffx-rnav="1" aria-label="Scroll ${esc(label)} forward">›</button></div>`;
const rail = (label, inner) => `<div class="ffx-rail" data-ffx-rail tabindex="0" role="region" aria-label="${esc(label)}"><div class="ffx-rail-in">${inner}</div></div>`;

const courseCard = (a, m, idx) => { const t = trackOf(m.code), p = modPct(a, m.code), done = !!a.done[m.code], started = !done && p > 0, who = KEYS[(idx + t.i) % 4];
  return `<article class="ffx-mcard" style="--c:${solidOf(t.k)}">
   <div class="ffx-thumb" data-ffx-lesson="${esc(m.code)}"${prevAttr(m.code)}><div class="kb"><img src="${FFcut(who)}" alt="" draggable="false" loading="lazy"></div>
    <span class="cd">${esc(m.code)}</span><span class="dur">${fmtH(+m.hours)} h</span>${done ? '<span class="ok">Completed ✓</span>' : ''}<b class="num" aria-hidden="true">${esc(m.code.split('-')[1] || '')}</b><span class="play" aria-hidden="true"></span></div>
   <div class="ffx-mbody"><h4>${esc(m.title)}</h4>
    <span class="small muted">${esc(m.format)}</span>
    <div class="meter" role="progressbar" aria-label="Progress for ${esc(m.code)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p}"><i style="width:${p}%"></i></div>
    <button type="button" class="btn ${done ? 'soft done' : (started ? 'gold' : 'navy ffx-dk')}" data-ffx-lesson="${esc(m.code)}" aria-label="${done ? 'Completed' : (started ? 'Continue' : 'Watch')}: ${esc(m.title)}">${done ? 'Completed ✓' : (started ? 'Continue' : 'Watch')}</button></div>
  </article>`; };
const endCard = (a, t) => { const s = trackStat(a, t), hrs = t.mods.reduce((x, m) => x + (+m.hours || 0), 0), nx = t.mods.find(m => !a.done[m.code]);
  return `<div class="ffx-endcard" style="--c:${solidOf(t.k)}">${ringSvg(s.pct, s.earned, shortLabel(t))}
   <div class="tx"><span class="small muted">${s.earned ? 'Credential earned' : 'Finish this rail to earn'}</span><b>${esc(t.name)}</b><span class="small">${t.mods.length} module${t.mods.length === 1 ? '' : 's'} · ${fmtH(hrs)} planned training hours · ${s.pct}% complete</span><span class="small muted">${esc(t.who)} · ${esc(t.access)}</span></div>
   ${nx ? `<button type="button" class="btn gold" data-ffx-lesson="${esc(nx.code)}">${modPct(a, nx.code) ? 'Continue' : 'Start'} ${esc(nx.code)}</button>` : `<button type="button" class="btn soft" data-anchor="ffx-certsec">View certificate</button>`}</div>`; };
const trackRail = (a, t, filt) => { const s = trackStat(a, t), hrs = t.mods.reduce((x, m) => x + (+m.hours || 0), 0);
  return `<div class="ffx-track${filt !== 'all' ? (filt === t.p ? ' is-pick' : ' is-dim') : ''}" data-ffx-group="${t.p}" data-ffx-railbox style="--c:${solidOf(t.k)}">
   <header><span class="bar" style="background:${colorOf(t.k)}"></span><h3>${esc(t.level)} · ${esc(t.name)}</h3><span class="tag">${t.mods.length} module${t.mods.length === 1 ? '' : 's'} · ${fmtH(hrs)} h</span><span class="chip ${s.earned ? 'ok' : ''}">${s.earned ? 'Earned ✓' : s.d + ' of ' + s.n + ' complete'}</span><span class="small muted who">${esc(t.who)} · ${esc(t.access)}</span>${rnav(t.name)}</header>
   ${rail(t.name + ' modules', t.mods.map((m, i) => courseCard(a, m, i)).join('') + endCard(a, t))}</div>`; };
const trackOrder = f => { const base = TRACKS.filter(t => t.mods.length); return f === 'all' ? base : base.filter(t => t.p === f).concat(base.filter(t => t.p !== f)); };

// A. hero guide. The phero's flat thumbnails are swapped for one large cut-out layer.
const guideHtml = () => `<div class="ffx-guide" data-ffx-guide>
  <!-- 3D hook: when models/booker.glb is produced, load <script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"> on first tap only and
       swap .ffx-guide-btn for <model-viewer src="models/booker.glb" poster="img/plush/characters/booker-480.webp" camera-controls auto-rotate auto-rotate-delay="0" rotation-per-second="12deg" ar alt="Booker the bear in 3D">.
       Keep this cut-out as the reduced-motion and older-phone fallback. -->
  <span class="ffx-guide-floor" aria-hidden="true"></span>
  <span class="ffx-say" role="status" aria-live="polite"></span>
  <div class="ffx-guide-tilt"><div class="ffx-guide-bob"><button type="button" class="ffx-guide-btn" aria-label="Say hello to Booker, your Academy guide"><img src="img/plush/characters/booker-480.webp" alt="Booker the bear, the Academy guide" draggable="false"></button></div></div>
 </div>`;

V.academy = () => {
  const a = ACAD(); const code = (typeof arg === 'string' && MOD.some(m => m.code === arg)) ? arg : null;
  if (code) return lessonView(a, code);
  const doneH = MOD.filter(m => a.done[m.code]).reduce((s, m) => s + (+m.hours || 0), 0), doneN = MOD.filter(m => a.done[m.code]).length;
  const earnedN = TRACKS.filter(t => trackStat(a, t).earned).length;
  const next = MOD.find(m => !a.done[m.code] && modPct(a, m.code) > 0) || MOD.find(m => !a.done[m.code]);
  const filt = st.ffxTrack || 'all';
  const hero = phero('Training Academy', 'Futures Friends Training Academy', `A video library for teachers and directors: ${MOD.length} modules, ${fmtH(TOTAL_H)} planned training hours and a seven-credential ladder, from Level 1 Foundations to Futures Friends Trainer.`,
    {crumb:['training', 'Training'], chars:['booker'], cta:`<button class="btn gold" data-anchor="ffx-library">Browse the library</button>${next ? `<button class="btn ghost" style="color:#fff" data-ffx-lesson="${esc(next.code)}">${modPct(a, next.code) ? 'Continue' : 'Start'} ${esc(next.code)}</button>` : ''}`})
    .replace(/<div class="art">[\s\S]*$/, guideHtml() + '</div></div>');
  return hero + `
<section class="band-paper ffx-welcome" data-ffx-welcome data-signature><div class="wrap">
 <div class="ffx-split">
  <div class="ffx-wmain" style="display:grid;gap:12px">${player('ffxAcadVid', 'video/academy-welcome.mp4', 'video/academy-welcome-poster.jpg', 'Academy welcome', 'Welcome to the Training Academy', 'Welcome to the Futures Friends Training Academy: Ms. June, a story-world teacher, introduces the four friends')}
   <div class="ffx-wcap" style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:baseline"><h2 style="font-size:clamp(22px,2.6vw,28px)">Welcome to the Academy</h2><span class="small muted">Featured · 4 chapters</span></div>${capNote('video/academy-welcome.mp4', 'Welcome to the Academy')}</div>
  <div class="card ffx-wside"><h3>Jump to a chapter</h3>${chapterList()}<p class="note">Select a chapter to jump the player to that point.</p></div>
 </div></div></section>
<section><div class="wrap">${head('Your progress', 'Hours, modules and credentials', 'Progress saves on this device as you watch, answer the knowledge checks and mark lessons complete.')}
 <div class="ffx-kpis" data-motion="reveal">
  <div class="ffx-kpi"><b data-ffx-count>${fmtH(doneH)}<span style="font-size:16px;color:var(--muted)"> / ${fmtH(TOTAL_H)}</span></b><span>Planned training hours completed</span><div class="meter" style="margin-top:6px" role="progressbar" aria-label="Hours completed" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(doneH / TOTAL_H * 100) || 0}"><i data-ffx-hours style="width:${(doneH / TOTAL_H * 100) || 0}%;background:var(--gold)"></i></div></div>
  <div class="ffx-kpi"><b data-ffx-count>${doneN}<span style="font-size:16px;color:var(--muted)"> / ${MOD.length}</span></b><span>Modules completed</span></div>
  <div class="ffx-kpi"><b data-ffx-count>${earnedN}<span style="font-size:16px;color:var(--muted)"> / ${TRACKS.length}</span></b><span>Credentials earned</span></div>
  <div class="ffx-kpi"><b style="font-size:20px;line-height:1.3">${next ? esc(next.code) : 'All done'}</b><span>${next ? 'Up next: ' + esc(next.title) : 'Every module is complete'}</span></div>
 </div></div></section>
<section class="band-navy ffx-climb" id="ffx-ladder" data-ffx-climb data-signature><div class="wrap">
 <div class="ffx-climb-copy">${head('Credential ladder', 'Climb the credential ladder', 'Seven credentials, from Level 1 Foundations at the bottom to Futures Friends Trainer at the top. Each ring fills as you complete its modules and turns gold when the credential is earned.')}
  <div class="ffx-now" data-ffx-now aria-live="polite">${nowHtml(a, currentRung(a))}</div></div>
 ${climbHtml(a)}
</div></section>
<section id="ffx-certsec"><div class="wrap"><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:28px;align-items:center">
  <div style="display:grid;gap:12px"><h3>Certificate</h3>${certCard(a)}</div>
  <div class="card" style="border-top:5px solid var(--gold)" data-motion="reveal"><span class="tag c" style="--c:var(--gold-deep);justify-self:start">How credentials work</span><h3>Seven credentials, one ladder</h3>
   ${['Level 1 Foundations is included for every staff member of a program member', 'Complete every module in a credential to earn it; your certificate fills in with your name and the date', 'Live cohort, practicum and co-teaching hours are added by your coach in the Futures Hub', 'Course hours are being prepared for Kansas (Cape) and Missouri (MOPD) approval. Until a course is approved, it does not count toward required annual training hours', 'Directors see each staff member’s progress on the training report'].map(x => `<div class="chk"><span class="small">${x}</span></div>`).join('')}
   <button type="button" class="rl" data-go="training" style="justify-self:start">See the full training catalog</button></div>
 </div></div></section>
<section id="ffx-library" class="band-paper" data-signature><div class="wrap">${head('Course library', 'Every module, by credential', 'One row per credential. Drag or swipe along a row, hover a lesson for a preview, and choose a credential to bring its row to the top.')}
 <div class="ffx-tabs" role="group" aria-label="Bring a credential to the top"><button type="button" data-ffx-track="all" aria-pressed="${filt === 'all'}">All credentials</button>${TRACKS.filter(t => t.mods.length).map(t => `<button type="button" data-ffx-track="${t.p}" aria-pressed="${filt === t.p}" style="--c:${solidOf(t.k)}"><i></i>${esc(t.name)}</button>`).join('')}</div>
 <div class="ffx-rails" data-ffx-rails>${trackOrder(filt).map(t => trackRail(a, t, filt)).join('')}</div>
</div></section>
<section><div class="wrap"><div class="grid g2" style="align-items:start">
 <div class="card" style="border-top:5px solid var(--purple)" data-motion="reveal"><span class="tag c" style="--c:var(--purple);justify-self:start">Watch together</span><h3>Training is for adults. The 30-minute rule is for children.</h3>
  <p class="small">The Futures Friends 30-minute weekly screen limit is for children in the classroom. It does not apply to adult training, so staff can complete modules at their own pace: on a break, at a staff meeting or at home.</p>
  <p class="small">Never watch training videos while you are counted in ratio. Watch as a team at a staff meeting, pause at each chapter and talk about how the lesson looks in your rooms.</p></div>
 <div class="card" style="border-top:5px solid var(--zuri)" data-motion="reveal"><span class="tag c" style="--c:var(--zuri);justify-self:start">Captions and access</span><h3>Every lesson, every learner</h3>
  ${['Closed captions are planned for every lesson video', 'Printable transcripts and slide notes are planned for each module', 'Chapters so you can stop and come back', 'Knowledge checks you can retake as often as you like', 'Completion records are planned to sync to your director\'s training report in the Futures Hub'].map(x => `<div class="chk"><span class="small">${x}</span></div>`).join('')}</div>
</div></div></section>`;
};

function lessonView(a, code){
  a.open[code] = 1; save('ff-academy', a);
  const m = MOD.find(x => x.code === code), t = trackOf(code), qs = quizFor(code), ans = a.q[code] || {}, done = !!a.done[code];
  const i = MOD.indexOf(m), nextM = MOD[i + 1], prevM = MOD[i - 1];
  const obj = (OBJ[t.p] || OBJ.F)(m.title);
  return phero(`${esc(t.level)} \u00b7 ${esc(t.name)}`, esc(m.title), `${esc(m.code)} \u00b7 ${fmtH(+m.hours)} catalog hours \u00b7 ${esc(m.format)}`, {crumb:['academy', 'Training Academy'], chars:[t.ch]}) + `
<section class="band-paper"><div class="wrap"><div class="ffx-split">
 <div style="display:grid;gap:12px" data-motion="reveal">${player('ffxAcadVid', 'video/academy-welcome.mp4', 'video/academy-welcome-poster.jpg', 'Sample lesson video', 'Sample lesson video', 'Sample lesson video for ' + m.title)}
  ${capNote('video/academy-welcome.mp4', 'Sample lesson video')}<p class="note">Shared sample video, not the full module. Module-specific videos, captions and printable materials still need to be published.</p>${code === 'F-108' && window.FFTalk ? `<p class="note">Every episode comes with a <a href="#talk">Talk about it card</a>: three questions, a feeling word and one thing to try at home.</p>` : ''}
  ${chapterList()}</div>
 <div style="display:grid;gap:16px">
  <div class="card" data-motion="reveal"><div class="ffx-meta"><span class="tag c" style="--c:${solidOf(t.k)}">${esc(m.code)}</span><span class="tag">${fmtH(+m.hours)} h</span><span class="chip ${done ? 'ok' : ''}">${done ? 'Completed \u2713' : modPct(a, code) + '% complete'}</span></div>
   <h3>Lesson objectives</h3><ul class="ffx-obj">${obj.map((o, n) => `<li data-n="${n + 1}"><span>${esc(o)}</span></li>`).join('')}</ul>
   <p class="small muted">Part of <b>${esc(t.name)}</b> \u00b7 for ${esc(t.who.toLowerCase())}.</p></div>
  <div class="card" data-motion="reveal"><h3>Explore this lesson preview</h3>
   ${['Watch the shared sample video', 'Try the three-question sample knowledge check', 'Reflect on one idea to discuss with your teaching team', 'Mark complete to update your local preview record, not official training hours'].map(x => `<div class="chk"><span class="small">${x}</span></div>`).join('')}</div>
 </div></div></div></section>
<section><div class="wrap" style="max-width:860px">${head('Knowledge check', 'Three quick questions', 'Choose an answer to see feedback right away. You can change your answer as often as you like.')}
 <form id="ffxQuiz" data-code="${esc(code)}" class="ffx-form" novalidate>
 ${qs.map((qq, n) => { const pick = ans[n]; return `<fieldset class="ffx-q" data-motion="reveal"><legend>${n + 1}. ${esc(qq[0])}</legend>
   ${qq[1].map((o, k) => `<label class="${pick === k ? (k === qq[2] ? 'right' : 'wrong') : ''}"><input type="radio" name="ffxq${n}" value="${k}" data-ffx-q="${n}" ${pick === k ? 'checked' : ''}><span>${esc(o)}</span></label>`).join('')}
   <p class="ffx-fb ${pick == null ? '' : (pick === qq[2] ? 'ok' : 'bad')}" id="ffxfb${n}" aria-live="polite">${pick == null ? '' : (pick === qq[2] ? '<b>Correct.</b> ' : '<b>Not quite.</b> ') + esc(qq[3])}</p></fieldset>`; }).join('')}
 </form>
 <div class="card" style="margin-top:18px;display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between" data-motion="reveal">
  <div style="display:grid;gap:2px"><b id="ffxScore">${Object.keys(ans).filter(n => ans[n] === qs[n][2]).length} of 3 correct</b><span class="small muted">${done ? 'Preview marked complete on this browser. No training credit issued.' : 'Mark complete when you have explored the sample and finished the check.'}</span></div>
  <div style="display:flex;gap:8px;flex-wrap:wrap">${prevM ? `<button type="button" class="btn soft" data-ffx-lesson="${esc(prevM.code)}">Previous</button>` : ''}
   ${done ? `<button type="button" class="btn soft done" data-ffx-undo="${esc(code)}" style="color:var(--ok);border-color:var(--ok)">Completed \u2713 \u00b7 Undo</button>` : `<button type="button" class="btn gold" data-ffx-complete="${esc(code)}">Mark complete</button>`}
   ${nextM ? `<button type="button" class="btn navy ffx-dk" data-ffx-lesson="${esc(nextM.code)}">Next: ${esc(nextM.code)}</button>` : ''}</div></div>
 <p style="margin-top:14px"><button type="button" class="rl" data-go="academy">Back to the course library</button></p>
</div></section>`;
}

// ================================================================ 2. WATCH
const EPX = {
  'Hello, Futures Friends': [5, 'Which friend would you like to sit with today, and why?', 'Friend name tags: each child picks a friend sticker for their cubby and tells a partner why.'],
  'Booker Tries Again': [4, 'What did Booker do when his tower fell down?', 'Try-again towers in the block area: build, topple, rebuild and count the blocks each time.'],
  'Big Feelings, Brighter Days': [5, 'How did Lumi\'s face look when she felt sad? Can you show me?', 'Feeling Faces mirror: children make happy, sad, mad and scared faces and name each one.'],
  'Lumi\'s Calm Corner': [3, 'What can you do when your body feels too fast?', 'Bunny breaths: practice three slow breaths together, then visit the Calm Corner in pairs.'],
  'What Happens If We Try?': [5, 'What did Zuri guess would happen? Was she right?', 'Ramp races: predict which ball rolls farthest, test it and mark the results with stickers.'],
  'Sink or Float': [4, 'Which things floated? Which ones sank?', 'Water-table test: guess first, drop each object in and tally sink or float on a chart.'],
  'Clean Up, Team!': [3, 'Which job did Bop choose? Which job will you choose?', 'Clean-Up Relay: match toys to color bins and cheer each team when the zone is clear.'],
  'Bop\'s Rainbow Lunch': [6, 'What color food did Bop try first?', 'Rainbow plate collage: sort food pictures by color, then find one color on today\'s lunch.'],
  'Booker\'s Story About Me': [5, 'What letter does your name start with?', 'Name collage: find the letters of your name in magazines and glue them in order.'],
  'Lumi\'s Family Photo': [4, 'Who is in Lumi\'s family photo? Who is in yours?', 'Family frames: draw the people at home and share one thing you do together.'],
  'Zuri\'s Five Senses Hunt': [6, 'What did Zuri hear in the garden?', 'Five-senses walk: a picture checklist for something we see, hear, smell, touch and taste.'],
  'Bop\'s Head, Shoulders, Trunk and Toes': [3, 'Can you touch your toes like Bop?', 'Body-part cards: draw a card, move that body part, then make up a new verse together.']
};
// Season One follows the Series Bible v3.0 slate (13 episodes, FF101 to FF113; checklist X10) from talk-cards.js: about 6 minutes each
// (Bible s.1.2), the Friday recall prompt as the dinner question and the card's try-at-home as the activity. Without it, the older plan.
const SLATE = window.FFTalk ? window.FFTalk.SLATE : null;
const EPISODES = SLATE ? SLATE.map((e, i) => ({n:i + 1, code:e.code, title:e.title, k:e.k, wk:e.wk, min:6, q:e.after, act:e.home})) : EPS.map((e, i) => { const x = EPX[e[0]] || [4, `What did ${e[1] === 'all' ? 'the friends' : CH[e[1]].n} learn today?`, 'A connected zone activity from this week\'s lesson plan.']; return {n:i + 1, title:e[0], k:e[1], unit:e[2], min:x[0], q:x[1], act:x[2]}; });
const ROOMS = ['Twos Room', 'Threes Room', 'Pre-K Room'];
const weekRange = (d = new Date()) => { const s = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)); const e = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 6); return [s, e]; };
const WLOG = () => load('ff-watch-log', []).filter(x => x && typeof x.date === 'string' && typeof x.min === 'number');
const weekMin = (log, room) => { const [s, e] = weekRange(); const a = iso(s), b = iso(e); return log.filter(x => x.room === room && x.date >= a && x.date <= b).reduce((t, x) => t + x.min, 0); };

const NO_SCREENS = room => room === 'Twos Room';   // no screens in care for children 2 and younger (CFOC 4th ed. 2.2.0.3)
const meterHtml = () => { const room = st.ffxRoom || 'Threes Room', log = WLOG(), used = weekMin(log, room), [s, e] = weekRange(), today = iso(new Date());
  const todays = log.filter(x => x.date === today);
  if (NO_SCREENS(room)) return `<div style="display:grid;gap:10px"><div class="ffx-big">0<small> min</small></div><span class="chip">No episodes in this room</span><p class="small">Children 2 and younger do not use screens in care. Songs, puppets and picture cards tell the week's story instead.</p></div>`;
  return `<div style="display:grid;gap:10px">
   <div style="display:flex;justify-content:space-between;align-items:end;gap:10px;flex-wrap:wrap"><div class="ffx-big">${used}<small> of 30 min ceiling</small></div><span class="chip ${used >= 30 ? 'bad' : (used >= 24 ? 'warn' : 'ok')}">${used >= 30 ? 'Weekly ceiling reached' : (used >= 24 ? 'Past the 24 scheduled minutes' : (30 - used) + ' min under the ceiling')}</span></div>
   <div class="meter ffx-meter ${used >= 30 ? 'full' : ''}" role="progressbar" aria-label="Screen time this week for the ${room}" aria-valuemin="0" aria-valuemax="30" aria-valuenow="${used}"><i style="width:${Math.min(100, used / 30 * 100)}%"></i></div>
   <span class="small muted">${room} \u00b7 week of ${shortDate(s)} to ${shortDate(e)} (Monday to Sunday)</span>
   <h4 style="margin:6px 0 0;font-family:var(--display);font-weight:600;font-size:17px">Today's log</h4>
   ${todays.length ? `<ul class="ffx-log">${todays.map(x => `<li><span><b>${esc(x.ep)}</b><br><span class="small muted">${esc(x.room)}</span></span><span class="small" style="font-weight:600">${x.min} min</span></li>`).join('')}</ul>` : '<p class="small muted">Nothing logged today. Use "Log as watched" on an episode after the class watches it together.</p>'}
  </div>`; };
const refreshMeter = () => { const el = q('#ffxMeter'); if (el) el.innerHTML = meterHtml(); const r = q('#ffxReport'); if (r) r.innerHTML = reportHtml(); };
const reportHtml = () => { const log = WLOG(), room = st.ffxRoom || 'Threes Room'; const last = log.filter(x => x.room === room).slice(-1)[0]; const ep = (last && EPISODES.find(e => e.title === last.ep)) || EPISODES[9]; const used = weekMin(log, room);
  return `<div class="top"><span>Family App \u00b7 ${esc(room)}</span><span>${last ? shortDate(fromIso(last.date)) : 'Sample'}</span></div>
   <div class="bd"><span class="small muted">What we watched together</span><b style="font-family:var(--display);font-size:19px">${esc(ep.title)} \u00b7 ${ep.min} min</b>
   <span class="small"><b>Ask at dinner:</b> "${esc(ep.q)}"</span><span class="small"><b>We also did:</b> ${esc(ep.act)}</span>
   <div class="meter" aria-hidden="true"><i style="width:${Math.min(100, used / 30 * 100)}%;background:var(--purple)"></i></div><span class="small muted">${used} of 30 screen minutes used this week</span></div>`; };

const tvHtml = inner => `<div class="ffx-tv" data-ffx-tv><div class="ffx-tv-set"><div class="ffx-tv-screen">${inner}</div>
  <div class="ffx-tv-chin"><span>Futures Friends TV</span><span class="knobs" aria-hidden="true"><i class="led"></i><i class="knob"></i><i class="knob"></i></span></div></div>
  <div class="ffx-tv-neck" aria-hidden="true"></div><div class="ffx-tv-console" aria-hidden="true"><span></span><span></span><span></span></div>
  <img class="ffx-tv-bop" src="img/plush/characters/bop-480.webp" alt="" draggable="false"></div>`;
const epCard = (e, f) => { const c = e.k === 'all' ? 'var(--gold-deep)' : `var(--${e.k})`;
  return `<article class="ffx-mcard ep" style="--c:${c}" data-ffx-ep="${e.k}" ${f !== 'all' && f !== e.k ? 'hidden' : ''}>
   <div class="ffx-thumb" data-ffx-play="${esc(e.title)}"${prevAttr('ep' + e.n)}><div class="kb">${e.k === 'all' ? `<span class="grp">${KEYS.map(k => `<img src="${FFcut(k)}" alt="" draggable="false" loading="lazy">`).join('')}</span>` : `<img src="${FFcut(e.k)}" alt="" draggable="false" loading="lazy">`}</div>
    <span class="cd">${e.code ? 'Week ' + e.wk : 'Unit ' + e.unit}</span><span class="dur">${e.min} min</span><b class="num" aria-hidden="true">${pad(e.n)}</b><span class="play" aria-hidden="true"></span></div>
   <div class="ffx-mbody"><span class="small muted">${e.code ? `FF${e.code} \u00b7 Week ${e.wk} \u00b7 in development` : `Episode ${e.n} \u00b7 Unit ${e.unit}`}</span><h3>${esc(e.title)}</h3>
    <div class="ffx-meta"><span class="tag c" style="--c:${c}">${e.k === 'all' ? 'All four friends' : CH[e.k].p + ' \u00b7 ' + CH[e.k].v}</span><span class="tag">${e.min} min</span></div>
    <div class="ffx-talk"><b>Talk about it</b><span>"${esc(e.q)}"</span></div>
    <div class="ffx-talk"><b>${e.code ? 'Try at home' : 'Connected activity'}</b><span>${esc(e.act)}</span></div>${e.code ? `<a class="tk-link" href="#talk/${e.code}">Full talk card: before, during, after and a feeling word</a>` : ''}
    <div class="acts2"><button type="button" class="btn navy ffx-dk" data-ffx-play="${esc(e.title)}">Play the welcome video</button><button type="button" class="btn soft" data-ffx-log="${e.n}">Log as watched \u00b7 ${e.min} min</button></div></div>
  </article>`; };

V.watch = () => { const f = st.ffxFriend || 'all', room = st.ffxRoom || 'Threes Room';
  return phero('Watch', 'Futures Friends episodes', 'The planned Season 1 micro-series: 3 to 6 minute episodes made to be watched together, followed by a question and a hands-on activity. No episode is finished yet: the classroom player below has the friends\u2019 welcome video, and the Watch together shelf has more short videos and Bop\u2019s movement breaks. Scheduled program minutes are at most 24 a week, under a 30-minute weekly ceiling; children 2 and younger do not watch.', {chars:KEYS, anchors:[['ffx-player', 'Classroom player'], ['ffx-eps', 'Episode library'], ['ffx-family', 'Family report']]}) + `
<section id="ffx-player" class="band-paper" data-signature><div class="wrap"><div class="ffx-split">
 <div style="display:grid;gap:12px">${tvHtml(player('ffxEpVid', 'video/ff-intro-titled-16x9.mp4', 'video/ff-intro-titled-16x9-poster.webp', 'Welcome video', 'Futures Friends \u00b7 Meet the Futures Friends', 'Story-world animation: Booker, Lumi, Zuri and Bop each say hello and introduce themselves in a felt meadow'))}${capNote('video/ff-intro-titled-16x9.mp4', 'Meet the Futures Friends')}
  <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:baseline;margin-top:8px"><h2 style="font-size:clamp(22px,2.6vw,28px)">Classroom player</h2><span class="small muted" id="ffxNow">Meet the Futures Friends \u00b7 45 seconds</span></div>
  <p class="small muted">Watch on the classroom screen with the children seated together and a teacher beside them. Pause once to ask a question, and turn the screen off as soon as the story ends.${window.FFTalk ? ' <a href="#talk/w0">Talk about it card for this video</a>.' : ''} More to watch today: <a href="#family-videos">Watch together</a>, with Bop's movement breaks.</p></div>
 <div class="card" data-motion="reveal"><div class="eyebrow">Screen time this week</div>
  <div class="seg" role="group" aria-label="Classroom">${ROOMS.map(r => `<button type="button" data-ffx-room="${r}" aria-pressed="${r === room}">${r.replace(' Room', '')}</button>`).join('')}</div>
  <div id="ffxMeter" aria-live="polite">${meterHtml()}</div>
  ${demoNote('The log saves in this browser.')}
  <button type="button" class="rl small" data-ffx-clearlog style="justify-self:start">Reset the demo log</button></div>
</div></div></section>
<section id="ffx-artwork" class="band-paper" data-signature><div class="wrap">${head('Artwork previews','Meet the story worlds','A preview of the visual language behind the Futures Friends episodes.')}
 <div class="grid g3" style="align-items:start">
  <figure class="card ffa-flagged" style="margin:0;overflow:hidden">${draft()}${pic('img/booker-a-new-friend-at-futures-poster.png', 1672, 941, 'Artwork preview: Booker, A New Friend at Futures', '(max-width:700px) 92vw, 400px', 'width:100%;height:auto;display:block')}<figcaption style="padding:12px;display:grid;gap:4px"><b>Booker: A New Friend at Futures</b><span class="small muted">Artwork preview</span></figcaption></figure>
  <figure class="card ffa-flagged" style="margin:0;overflow:hidden">${draft()}${pic('img/bop-teamwork-makes-it-brighter-poster.png', 1672, 941, 'Artwork preview: Bop, Teamwork Makes It Brighter', '(max-width:700px) 92vw, 400px', 'width:100%;height:auto;display:block')}<figcaption style="padding:12px;display:grid;gap:4px"><b>Bop: Teamwork Makes It Brighter</b><span class="small muted">Artwork preview</span></figcaption></figure>
  <figure class="card ffa-flagged" style="margin:0;overflow:hidden">${draft()}${pic('img/lumi-kindness-goes-a-long-way-poster.png', 1672, 941, 'Artwork preview: Lumi, Kindness Goes a Long Way', '(max-width:700px) 92vw, 400px', 'width:100%;height:auto;display:block')}<figcaption style="padding:12px;display:grid;gap:4px"><b>Lumi: Kindness Goes a Long Way</b><span class="small muted">Artwork preview</span></figcaption></figure>
 </div>
 <p class="note" style="margin-top:12px">Artwork previews only. Full episodes have not yet been supplied.</p>${window.FFTalk ? window.FFTalk.posterCards() : ''}
</div></section>
<section id="ffx-eps" data-signature><div class="wrap">${head('Episode library', SLATE ? 'Season One plan: 13 episodes' : 'Season 1 plan, episodes 1 to 12', 'Filter by friend, hover an episode for a preview, then log the minutes after the class watches and use the Talk about it card. No episode has been made yet; the welcome video plays in the classroom player.')}
 <div data-ffx-railbox>
  <div class="ffx-rbar"><div class="ffx-tabs" role="group" aria-label="Filter by friend"><button type="button" data-ffx-friend="all" aria-pressed="${f === 'all'}">All friends</button>${KEYS.map(k => `<button type="button" data-ffx-friend="${k}" aria-pressed="${f === k}" style="--c:var(--${k})"><i></i>${CH[k].n}</button>`).join('')}</div>${rnav('episodes')}</div>
  ${rail('Season 1 episodes', EPISODES.map(e => epCard(e, f)).join('') + `<div class="ffx-endcard" style="--c:var(--gold-deep)"><div class="tx"><span class="small muted">For grown-ups</span><b>A talk card for every episode</b><span class="small">Three questions, one feeling word and one thing to try at home.</span><span class="small muted">New episodes appear in this row and in the Family App as they are published.</span></div><a class="btn soft" href="#talk">See the talk cards</a></div>`)}
 </div></div></section>${window.FFTalk ? window.FFTalk.watchBand() : ''}
<section id="ffx-family" class="band-navy"><div class="wrap"><div class="grid g2" style="align-items:center">
 <div style="display:grid;gap:14px">${head('<span style="color:var(--gold)">The family report</span>', 'Families see exactly what was watched', 'No episode is made yet. Once episodes exist and the Futures Hub is live, every logged episode will appear in the Family App that evening: the title, the minutes, the question to ask at dinner and the activity children did afterward. Families will also see the class total for the week, so the 30-minute promise is visible to everyone.')}
  <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr));gap:10px">
   <div class="card ffx-dark"><b>No more than 4 a week</b><span class="small">Episodes run 3 to 6 minutes. Fridays are screen-free.</span></div>
   <div class="card ffx-dark"><b>Always together</b><span class="small">A teacher watches with the class and leads the talk.</span></div></div></div>
 <div class="ffx-report" id="ffxReport" data-motion="reveal">${reportHtml()}</div>
</div></div></section>`; };

// ================================================================ 3. ENROLL
const FLC = {addr:'3625 S Blue Ridge Blvd, Independence, MO 64052', phone:'(816) 988-5661', tel:'+18169885661', email:'info@futureslearningcenter.com'};
const TIMES = [['9:30', '9:30 AM'], ['10:30', '10:30 AM'], ['3:30', '3:30 PM']];
const nextWeekdays = (n = 10) => { const out = []; const d = new Date(); d.setHours(12, 0, 0, 0); while (out.length < n) { d.setDate(d.getDate() + 1); if (d.getDay() % 6) out.push(new Date(d)); } return out; };
const DAY = [['7:00', 'Arrival and free choice', 'Families sign in on the tablet; children choose a learning zone while friends arrive.', 'booker'],
  ['8:00', 'Breakfast', 'Family-style breakfast from the Eat the Rainbow menu, served at child-sized tables.', 'bop'],
  ['8:45', 'Circle time and episode', 'Songs, the friend of the week and, on episode days, one 3 to 6 minute episode watched together.', 'lumi'],
  ['9:15', 'Learning zones', 'Reading, Calm Corner, Discovery and Movement zones, with a teacher-led small group.', 'zuri'],
  ['10:30', 'Outdoor play', 'Climbing, running, gardening and nature detective walks, weather permitting.', 'zuri'],
  ['11:30', 'Lunch', 'A hot lunch planned around the CACFP meal pattern. Children serve themselves with help and are invited to look at, smell or taste one new color. Saying no thanks is fine.', 'bop'],
  ['12:30', 'Rest time', 'Lights low, soft music and a blanket from home. Quiet books for early risers.', 'lumi'],
  ['2:30', 'Snack', 'A rainbow snack and water, then a story with Booker.', 'booker'],
  ['3:00', 'Afternoon zones and outdoor time', 'Art, building, music and a second outdoor block.', 'zuri'],
  ['4:30', 'Pickup', 'Families see the day in the app and take home one question to ask at dinner. ', 'bop']];
const EFAQ = [['What are your hours?', 'The center is open Monday to Friday. Call (816) 988-5661 for current drop-off and pickup times.'],
  ['What ages do you serve?', 'Futures Friends is piloting here, so call (816) 988-5661 for the ages and rooms open right now. The program is written for ages 2 to 5 in a twos room, a threes room and a pre-K room. Rooms follow Missouri ratios: 1 adult for every 8 two-year-olds and 1 for every 10 three- and four-year-olds.'],
  ['What does tuition include?', 'Tuition is $210 a week and includes breakfast, lunch and an afternoon snack planned around the USDA CACFP meal pattern and the Futures Friends curriculum for your child\'s age (Unit 1 is written; later units are added as they are written). The family welcome kit and the Family App are planned and come to families when they are ready.'],
  ['How much screen time will my child have?', 'Futures Friends schedules at most 24 minutes of episodes a week for children 3 to 5: one episode of up to 6 minutes, Monday to Thursday, watched together with a teacher, and never more than 30 minutes a week. Friday has no episode. All screens together in care stay at or under 30 minutes a week (the CDC early care and education standard), and children 2 and younger do not use screens in care. No episode is made yet; once they are, you will see every episode in the Family App.'],
  ['How does the waitlist work?', 'Submit the online application and the center will contact you within two business days to talk about next steps. Submitting is a request, not a guaranteed spot. When a spot opens, the center calls families in order of application date. You can check that we received your request with your reference number under Request status.']];

const fieldErr = id => `<span class="ffx-err" id="${id}-e" aria-live="polite"></span>`;
const inp = (id, label, type = 'text', extra = '') => `<label class="f" for="${id}">${label}<input class="i" id="${id}" name="${id}" type="${type}" ${extra} aria-describedby="${id}-e">${fieldErr(id)}</label>`;
const sel = (id, label, opts, extra = '') => `<label class="f" for="${id}">${label}<select class="i" id="${id}" name="${id}" ${extra} aria-describedby="${id}-e"><option value="">Choose one</option>${opts.map(o => `<option>${esc(o)}</option>`).join('')}</select>${fieldErr(id)}</label>`;

const tourHtml = () => { if (!FI().enabled()) return FI().soon('tour requests'); const days = nextWeekdays(10), t = st.ffxTour || {}; setTimeout(FI().warm, 0);
  return `<form id="ffxTourForm" class="ffx-form" novalidate>
   <div style="display:grid;gap:8px"><span class="ffx-lbl" id="ffxDateL">1. Pick a date</span><div class="ffx-slots" role="group" aria-labelledby="ffxDateL">${days.map(d => { const k = iso(d); return `<button type="button" class="ffx-slot" data-ffx-date="${k}" aria-pressed="${t.date === k}"><small>${d.toLocaleDateString('en-US', {weekday:'short'})}</small><b>${d.getDate()}</b><small>${d.toLocaleDateString('en-US', {month:'short'})}</small></button>`; }).join('')}</div><span class="ffx-err" id="ffxDate-e" aria-live="polite"></span></div>
   <div style="display:grid;gap:8px"><span class="ffx-lbl" id="ffxTimeL">2. Pick a time</span><div class="ffx-slots ffx-times" role="group" aria-labelledby="ffxTimeL">${TIMES.map(x => `<button type="button" class="ffx-slot" data-ffx-time="${x[0]}" aria-pressed="${t.time === x[0]}"><b style="font-size:16px">${x[1]}</b><small>${x[0] === '3:30' ? 'Afternoon' : 'Morning'} \u00b7 30 min</small></button>`).join('')}</div><span class="ffx-err" id="ffxTime-e" aria-live="polite"></span></div>
   <span class="ffx-lbl">3. Your details</span>
   <div class="ffx-row">${inp('tName', 'Parent or guardian name', 'text', 'autocomplete="name"')}${inp('tPhone', 'Phone', 'tel', 'autocomplete="tel" inputmode="tel" placeholder="(816) 555-0123"')}</div>
   <div class="ffx-row">${inp('tEmail', 'Email (optional, for a confirmation)', 'email', 'autocomplete="email"')}${sel('tAge', 'Child\'s age', ['2 years', '3 years', '4 years', '5 years', 'Under 2 (joining later)'])}</div>
   ${FI().honeypot('ffiHpT')}
   <button class="btn gold" type="submit" style="justify-self:start">Request this tour</button>
   <p class="ffx-demo" style="font-size:12.5px">This is a request, not a booked tour. The center will call you to agree on a time.</p>
  </form>`; };

const appHtml = () => { if (!FI().enabled()) return FI().soon('applications'); setTimeout(FI().warm, 0);
 return `<ol class="ffx-prog" id="ffxProg" aria-label="Application progress"><li aria-current="step"><span>Child</span></li><li><span>Family</span></li><li><span>Schedule and start</span></li></ol>
 <form id="ffxAppForm" class="ffx-form" novalidate style="margin-top:16px">
  <fieldset data-ffx-step="1" style="border:0;padding:0;margin:0;display:grid;gap:12px"><legend class="ffx-lbl" style="margin-bottom:10px">Step 1 of 3 \u00b7 About your child</legend>
   <div class="ffx-row">${inp('aFirst', 'Child\'s first name', 'text', 'autocomplete="off"')}${sel('aAge', 'Child\'s age', ['2 years', '3 years', '4 years', '5 years'])}</div>
   ${sel('aRoom', 'Room', ['Twos Room (ages 2 to 3)', 'Threes Room (ages 3 to 4)', 'Pre-K Room (ages 4 to 5)'])}
   <label class="f" for="aNotes">Anything you would like us to know? (optional)<textarea class="i" id="aNotes" maxlength="500" style="min-height:80px" placeholder="Favorite things, comfort items, how your child likes to be greeted"></textarea></label>
   <p class="ffx-demo" style="font-size:12.5px">Please do not put health, allergy, medical or custody information here. The center will talk with you about those in person.</p></fieldset>
  <fieldset data-ffx-step="2" hidden style="border:0;padding:0;margin:0;display:grid;gap:12px"><legend class="ffx-lbl" style="margin-bottom:10px">Step 2 of 3 \u00b7 Your family</legend>
   <div class="ffx-row">${inp('aParent', 'Parent or guardian name', 'text', 'autocomplete="name"')}${sel('aRel', 'Relationship to child', ['Parent', 'Guardian', 'Grandparent', 'Other family member'])}</div>
   <div class="ffx-row">${inp('aEmail', 'Email', 'email', 'autocomplete="email"')}${inp('aPhone', 'Phone', 'tel', 'autocomplete="tel"')}</div>
   ${sel('aHeard', 'How did you hear about us?', ['A friend or family member', 'Drove by the center', 'Search or map listing', 'Social media', 'Other'])}</fieldset>
  <fieldset data-ffx-step="3" hidden style="border:0;padding:0;margin:0;display:grid;gap:12px"><legend class="ffx-lbl" style="margin-bottom:10px">Step 3 of 3 \u00b7 Schedule and start date</legend>
   <div class="ffx-row">${sel('aSched', 'Schedule', ['Full time, Monday to Friday ($210 a week)'])}${inp('aStart', 'Preferred start date', 'date')}</div>
   ${sel('aPay', 'How do you expect to pay?', ['Private pay', 'Missouri child care subsidy', 'Employer benefit', 'Not sure yet'])}
   <label class="ffx-check" for="aAgree"><input type="checkbox" id="aAgree" aria-describedby="aAgree-e"><span>I understand this is a request. It does not guarantee a spot or place my child on a waitlist. The center will contact me about next steps.</span></label>${fieldErr('aAgree')}</fieldset>
  ${FI().honeypot('ffiHpA')}
  <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><button type="button" class="btn soft" data-ffx-appback hidden>Back</button><button type="button" class="btn navy ffx-dk" data-ffx-appnext>Continue</button><button type="submit" class="btn gold" hidden data-ffx-appsubmit>Submit application</button></div>
 </form>`; };

const jobsHtml = () => `<p class="small" style="margin:0">Open positions are listed on our Careers page, each with a short application and a place to attach your resume.</p><button type="button" class="btn gold" data-go="jobs" style="justify-self:start">See open positions</button>`;

V.enroll = () => phero('Futures Learning Center \u00b7 Independence, Missouri', 'A Place to Learn, Play &amp; Grow', 'Futures Friends is piloting here first, at our flagship center in Independence, Missouri. Call for the ages we serve right now and current hours, or book a tour.',
  {chars:['booker', 'lumi', 'zuri', 'bop'], scene: window.FFArt && window.FFArt.scene ? window.FFArt.scene('cubby-entrance', {chars:[['booker', 30], ['lumi-waving', 62]], u:96, y:2, cls:'phero-scene', sizes:'(max-width:820px) 92vw, 520px', eager:true, line:'The storybook cubbies, not a photo of our center'}) : '', cta:`<button class="btn gold" data-anchor="ffx-tour">Schedule a Tour</button><button class="btn ghost" style="color:#fff" data-anchor="ffx-apply">Apply online</button><a class="btn ghost" style="color:#fff" href="tel:${FLC.tel}">Call ${FLC.phone}</a>`,
   anchors:[['ffx-why', 'Why families choose us'], ['ffx-day', 'Daily life'], ['ffx-tuition', 'Tuition'], ['ffx-status', 'Check a request'], ['ffx-jobs', 'Employment']]}) + `
<section class="tight band-paper"><div class="wrap"><div class="ffx-facts" data-motion="reveal">
 <div class="ffx-fact" style="--c:var(--booker)"><span>Ages</span><b>Call us</b><span>Ask which ages and rooms are open now</span></div>
 <div class="ffx-fact" style="--c:var(--gold)"><span>Tuition</span><b>$210 / week</b><span>Meals and curriculum included</span></div>
 <div class="ffx-fact" style="--c:var(--zuri)"><span>Open</span><b>Mon to Fri</b><span>Call for current hours</span></div>
 <div class="ffx-fact" style="--c:var(--lumi)"><span>Visit</span><b style="font-size:17px">3625 S Blue Ridge Blvd</b><span>Independence, MO 64052</span></div>
 <div class="ffx-fact" style="--c:var(--bop)"><span>Call or email</span><b style="font-size:19px"><a href="tel:${FLC.tel}" style="text-decoration:none">${FLC.phone}</a></b><span style="font-size:12px"><a href="mailto:${FLC.email}">info@<wbr>futureslearningcenter.com</a></span></div>
</div></div></section>
<section id="ffx-why"><div class="wrap">${head('Why families choose us', 'Three promises, every day', 'Futures Learning Center is where the Futures Friends program runs first. Everything we teach is meant to be tested here first, with real children and real families.')}
 <div class="grid g3">
  ${[['booker', '1', 'Curriculum-based care', 'Lessons for twos, threes and pre-K, planned as twelve monthly units with a readiness checklist before kindergarten. The first month is written day by day (draft); later months are outlined.'],
     ['bop', '2', 'Purposeful play', 'Four learning zones, outdoor time twice a day, music, cooking and art. Every activity is play with a reason behind it.'],
     ['lumi', '3', 'Teacher connection', 'Small groups in Missouri ratios, Futures Friends Academy training as its courses are ready, and a daily update in the Family App once the Futures Hub is live.']].map(p => `<div class="card ffx-pillar" style="--c:var(--${p[0]});--s:var(--${p[0]}-s)" data-motion="reveal"><span class="ic">${p[1]}</span><h3>${p[2]}</h3><p class="small">${p[3]}</p></div>`).join('')}
 </div></div></section>
${window.FFArt ? `<section id="ffx-meet" class="ffa-slotband" aria-labelledby="ffx-meet-h"><div class="wrap">${head('Meet us', '<span id="ffx-meet-h">The building and the rooms</span>', 'Real photos of Futures Learning Center: the front door and the rooms your child will use. To meet the director and the teaching team, book a tour.')}
 <div class="ffa-slots">${window.FFArt.photo('exterior', {title: 'Our front door and sign', line: 'So you know the building when you pull in: the blue door under the Futures sign', ratio: 'wide'})}${window.FFArt.photo('turtle-rug', {title: 'Our main classroom', line: 'Turtle stepping stones, the alphabet rug and child-size tables', ratio: 'land'})}${window.FFArt.photo('dress-up-corner', {title: 'The dress-up and toy corner', line: 'Costumes, toy shelves and a child-size balance bike', ratio: 'land'})}</div></div></section>` : ''}
<section id="ffx-day" class="band-paper"><div class="wrap"><div class="grid g2" style="align-items:start;gap:32px">
 <div style="display:grid;gap:14px">${head('Daily life', 'A day at Futures', 'A sample day in the Threes Room. Every room follows the same rhythm, adjusted for age.')}
  ${window.FFArt ? window.FFArt.photo('blue-table-room', {line: 'A classroom at Futures Learning Center: a table with learning trays, a chalkboard easel and the days of the week on the wall.', sizes: '(max-width:820px) 92vw, 520px'}) : ''}</div>
 <ol class="ffx-tl" aria-label="Sample daily schedule" data-motion="reveal">${DAY.map(d => `<li style="--c:var(--${d[3]})"><time>${d[0]}</time><span class="dot" aria-hidden="true"></span><div><b>${d[1]}</b><span>${d[2]}</span></div></li>`).join('')}</ol>
</div></div></section>
<section id="ffx-tuition"><div class="wrap"><div class="grid g2" style="align-items:center;gap:28px">
 <div class="price feat ffx-price" data-motion="reveal"><span class="tag c" style="--c:var(--navy);justify-self:start">Full time \u00b7 Monday to Friday</span><div class="amt">$210<small> / week</small></div><span class="small muted">About $910 a month \u00b7 billed weekly</span>
  <ul class="small"><li>Breakfast, lunch and afternoon snack planned around the USDA CACFP meal pattern</li><li>The Futures Friends curriculum for your child's age: Unit 1 now, later units as they are written</li><li>Planned: a Futures Friends welcome kit to take home</li><li>Planned: the Family App for lessons, meals, milestones and messages, once the Futures Hub is live</li><li>Futures Friends episodes for ages 3 to 5: at most 24 scheduled minutes a week, never more than 30</li></ul>
  <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn gold" data-anchor="ffx-apply">Apply online</button><button class="btn soft" data-anchor="ffx-tour">Schedule a Tour</button></div></div>
 <div style="display:grid;gap:14px">${head('Tuition', 'One simple weekly rate', 'No meal fees and no curriculum fees. The welcome kit is ours to give. Ask the center about sibling and subsidy options when you tour.')}
  <figure class="ffa-flagged" data-motion="reveal">${window.FFArt ? window.FFArt.flag('illustration') : ''}<img src="img/kitchen.jpg" alt="Illustration of an Eat the Rainbow dining room, with the rainbow colours on the wall" width="1200" height="675" loading="lazy" decoding="async"><figcaption>The Eat the Rainbow dining room, illustrated: breakfast, lunch and snack served family-style.</figcaption></figure></div>
</div></div></section>
<section id="ffx-tour" class="band-paper"><div class="wrap"><div class="ffx-split wide">
 <div class="card" data-motion="reveal" id="ffxTourCard"><div class="eyebrow">Schedule a tour</div><h2 style="font-size:clamp(24px,3vw,32px)">See the classrooms for yourself</h2><p class="small muted">Tours take about 30 minutes. Bring your child if you like: Booker will be waiting on the carpet.</p>${tourHtml()}</div>
 <div style="display:grid;gap:14px">
  <div class="card" data-motion="reveal"><h3>On your tour</h3>${['Walk through each room and the four learning zones', 'See the Eat the Rainbow dining room and this week\'s menu', 'Meet the director and your child\'s future teachers', 'Get a Family App preview and the application link'].map(x => `<div class="chk"><span class="small">${x}</span></div>`).join('')}</div>
  <div class="card" data-motion="reveal" style="border-top:5px solid var(--gold)"><h3>Prefer to call?</h3><span><a href="tel:${FLC.tel}"><b>${FLC.phone}</b></a></span><span class="small" style="overflow-wrap:anywhere"><a href="mailto:${FLC.email}">${FLC.email}</a></span><span class="small muted">${FLC.addr}</span></div>
 </div></div></div></section>
<section id="ffx-apply"><div class="wrap"><div class="ffx-split wide">
 <div class="card" data-motion="reveal" id="ffxAppCard"><div class="eyebrow">Online application</div><h2 style="font-size:clamp(24px,3vw,32px)">Apply in three short steps</h2><p class="small muted">About five minutes. When you submit you get a reference number, and a real person contacts you within two business days. Submitting does not guarantee a spot.</p>${appHtml()}</div>
 <div id="ffx-status" style="display:grid;gap:14px">
  <div class="card" data-motion="reveal"><div class="eyebrow">Request status</div><h3>Check that we received your request</h3>
   ${FI().enabled() ? `<form id="ffxStatusForm" class="ffx-form" novalidate style="gap:10px">${inp('wRef', 'Reference number from your confirmation', 'text', 'autocomplete="off" placeholder="FF-ABCD-2345"')}${inp('wEmail', 'Email you used', 'email', 'autocomplete="email"')}<button class="btn navy ffx-dk" type="submit" style="justify-self:start">Check request</button></form>
   <div id="ffxStatusOut" aria-live="polite"></div><p class="ffx-demo" style="font-size:12.5px">This shows that your request arrived. It does not show decisions or waitlist places; the center tells you those directly.</p>` : FI().soon('request lookups')}</div>
  <div class="card" data-motion="reveal"><h3>What happens next</h3>${['A real person contacts you within two business days', 'You tour, if you have not already', 'When a spot opens, we call in order of application date', 'Enrollment forms, immunization record and your welcome kit'].map(x => `<div class="chk"><span class="small">${x}</span></div>`).join('')}</div>
 </div></div></div></section>
<section class="band-paper"><div class="wrap" style="max-width:900px">${head('Questions families ask', 'Frequently asked questions', '')}
 <div class="faq" data-motion="reveal">${EFAQ.map(f => `<details><summary>${esc(f[0])}</summary><p>${esc(f[1])}</p></details>`).join('')}</div></div></section>
<section id="ffx-jobs"><div class="wrap">${head('Employment', 'We\'re hiring teachers', 'Join the team that runs Futures Friends first. Every role includes paid Futures Friends Academy training and a clear path through the credential ladder.')}
 <div class="grid g4">${[['booker', 'Lead Teacher', 'Plan and lead the learning loop for the Threes or Pre-K Room.'], ['zuri', 'Assistant Teacher', 'Partner with the lead teacher, run zones and support small groups.'], ['bop', 'Eat the Rainbow Cook', 'Prepare breakfast, lunch and snack designed around the CACFP meal pattern for the whole center, following each child\'s director-approved meal instruction.'], ['lumi', 'Floater and Substitute', 'Cover breaks and absences across rooms so every room stays in ratio.']].map(r => `<div class="card ffx-role" style="--c:var(--${r[0]})" data-motion="reveal"><h3>${r[1]}</h3><p class="small">${r[2]}</p><button type="button" class="rl" data-go="jobs">See open positions</button></div>`).join('')}</div>
 <div class="grid g2" style="margin-top:22px;align-items:start">
  <div class="card" data-motion="reveal"><h3>Why teach at Futures</h3>${['Full time, Monday to Friday, no weekends', 'Paid time for Level 1 Foundations training once its courses are ready (in development)', 'A planned path to Level 2, Level 3 and Director levels (Futures Friends levels, not state credentials)', 'Training courses being prepared for Missouri and Kansas review; their hours count toward required annual hours only once approved', 'Small groups in Missouri ratios, with a floater for breaks', 'Background screening through the Missouri Family Care Safety Registry is required for all staff'].map(x => `<div class="chk"><span class="small">${x}</span></div>`).join('')}</div>
  <div class="card" id="ffx-jobform" data-motion="reveal"><div class="eyebrow">Careers</div><h3>Apply for an open position</h3><div id="ffxJobWrap">${jobsHtml()}</div></div>
 </div></div></section>`;

// ---------------------------------------------------------------- validation helpers
const setErr = (id, msg) => { const el = document.getElementById(id), e = document.getElementById(id + '-e'); if (el) el.setAttribute('aria-invalid', msg ? 'true' : 'false'); if (e) e.textContent = msg || ''; return !msg; };
const val = id => ((document.getElementById(id) || {}).value || '').trim();
const okEmail = s => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
const okPhone = s => s.replace(/\D/g, '').length >= 10;
const need = (id, label) => setErr(id, val(id) ? '' : `Add ${label}.`);
const firstBad = scope => { const b = (scope || document).querySelector('[aria-invalid="true"]'); if (b) b.focus(); };

const APP_STEPS = {1:() => [need('aFirst', 'your child\'s first name'), need('aAge', 'your child\'s age'), need('aRoom', 'a room')],
  2:() => [need('aParent', 'a parent or guardian name'), need('aRel', 'your relationship'), setErr('aEmail', okEmail(val('aEmail')) ? '' : 'Enter a valid email address.'), setErr('aPhone', okPhone(val('aPhone')) ? '' : 'Enter a 10-digit phone number.'), need('aHeard', 'how you heard about us')],
  3:() => [need('aSched', 'a schedule'), (() => { const v = val('aStart'); if (!v) return setErr('aStart', 'Choose a preferred start date.'); return setErr('aStart', v < iso(new Date()) ? 'Choose a date from today forward.' : ''); })(), need('aPay', 'how you will pay'), setErr('aAgree', (document.getElementById('aAgree') || {}).checked ? '' : 'Please check the box to continue.')]};
const showStep = n => { const f = q('#ffxAppForm'); if (!f) return; f.dataset.step = n;
  f.querySelectorAll('[data-ffx-step]').forEach(s => s.hidden = +s.dataset.ffxStep !== n);
  q('#ffxProg').querySelectorAll('li').forEach((li, i) => { li.classList.toggle('done', i + 1 < n); if (i + 1 === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current'); });
  f.querySelector('[data-ffx-appback]').hidden = n === 1; f.querySelector('[data-ffx-appnext]').hidden = n === 3; f.querySelector('[data-ffx-appsubmit]').hidden = n !== 3;
  const first = f.querySelector(`[data-ffx-step="${n}"] input, [data-ffx-step="${n}"] select`); if (first) first.focus({preventScroll:true}); };

// ---------------------------------------------------------------- events (own delegated listeners)
const vidOf = id => document.getElementById(id);
const markOff = v => { const w = v && v.closest('[data-ffx-player]'); if (w) w.classList.add('is-off'); };
document.addEventListener('error', e => { const v = e.target; if (v && v.tagName === 'VIDEO' && v.closest('[data-ffx-player]')) markOff(v); }, true);
document.addEventListener('timeupdate', e => { const v = e.target; if (!v || v.id !== 'ffxAcadVid') return; const t = v.currentTime || 0; let cur = 0; CHAPTERS.forEach((c, i) => { if (t >= c[0]) cur = i; });
  document.querySelectorAll('[data-ffx-for="ffxAcadVid"]').forEach((b, i) => b.setAttribute('aria-current', String(i === cur)));
  const nx = CHAPTERS[cur + 1] ? CHAPTERS[cur + 1][0] : (v.duration || CHAPTERS[cur][0] + 8); placeHead(document.querySelector('[data-ffx-chapwrap]'), cur + Math.min(1, Math.max(0, (t - CHAPTERS[cur][0]) / Math.max(1, nx - CHAPTERS[cur][0]))), 2); }, true);

document.addEventListener('click', e => { const t = e.target; if (!t || !t.closest) return;
  const seek = t.closest('[data-ffx-seek]'); if (seek) { const v = vidOf(seek.dataset.ffxFor), s = +seek.dataset.ffxSeek;
    document.querySelectorAll(`[data-ffx-for="${seek.dataset.ffxFor}"]`).forEach(b => b.setAttribute('aria-current', String(b === seek)));
    placeHead(seek.closest('[data-ffx-chapwrap]'), Math.max(0, CHAPTERS.findIndex(c => c[0] === s)), 1);
    if (v) { try { v.currentTime = s; } catch(_) {} if (v.error || v.closest('.is-off')) toast(`Chapter ${mmss(s)} \u00b7 ${seek.querySelector('b').textContent}. The video plays here once it is published.`); else { const p = v.play(); if (p && p.catch) p.catch(() => {}); } } return; }
  const les = t.closest('[data-ffx-lesson]'); if (les) { e.preventDefault(); return go('academy', les.dataset.ffxLesson); }
  const rn = t.closest('[data-ffx-rnav]'); if (rn) { const box = rn.closest('[data-ffx-railbox]'), r = box && box.querySelector('[data-ffx-rail]'); if (r) railBy(r, +rn.dataset.ffxRnav); return; }
  const tr = t.closest('[data-ffx-track]'); if (tr) { st.ffxTrack = tr.dataset.ffxTrack; document.querySelectorAll('[data-ffx-track]').forEach(b => b.setAttribute('aria-pressed', String(b === tr))); applyTrack(true); return; }
  const cm = t.closest('[data-ffx-complete]'); if (cm) { const a = ACAD(), code = cm.dataset.ffxComplete, tk = trackOf(code); const before = trackStat(a, tk).earned; a.done[code] = 1;
    if (!before && trackStat(a, tk).earned) { a.earned[tk.p] = iso(new Date()); save('ff-academy', a); render(); toast(`${tk.name} preview explored. No professional credential issued.`); return; }
    save('ff-academy', a); render(); toast(`${code} preview marked complete on this browser`); if(window.FFconfetti)window.FFconfetti(60); return; }
  const un = t.closest('[data-ffx-undo]'); if (un) { const a = ACAD(); delete a.done[un.dataset.ffxUndo]; save('ff-academy', a); render(); toast('Marked as not complete'); return; }
  // watch
  const fr = t.closest('[data-ffx-friend]'); if (fr) { st.ffxFriend = fr.dataset.ffxFriend; document.querySelectorAll('[data-ffx-friend]').forEach(b => b.setAttribute('aria-pressed', String(b === fr))); applyFriend(true); return; }
  const rm = t.closest('[data-ffx-room]'); if (rm) { st.ffxRoom = rm.dataset.ffxRoom; document.querySelectorAll('[data-ffx-room]').forEach(b => b.setAttribute('aria-pressed', String(b === rm))); refreshMeter(); return; }
  const lg = t.closest('[data-ffx-log]'); if (lg) { const ep = EPISODES[+lg.dataset.ffxLog - 1]; if (!ep) return; const room = st.ffxRoom || 'Threes Room', log = WLOG(), used = weekMin(log, room);
    if (NO_SCREENS(room)) { toast('Not logged: children 2 and younger do not watch episodes in care.'); return; }
    if (used + ep.min > 30) { toast(`Not logged: ${ep.title} (${ep.min} min) would put the ${room} at ${used + ep.min} of 30 minutes this week.`); return; }
    log.push({date:iso(new Date()), ep:ep.title, min:ep.min, room}); save('ff-watch-log', log); refreshMeter(); toast(`Logged ${ep.title} \u00b7 ${used + ep.min} of 30 minutes this week`); return; }
  if (t.closest('[data-ffx-clearlog]')) { save('ff-watch-log', []); refreshMeter(); toast('Demo log cleared'); return; }
  const pl = t.closest('[data-ffx-play]'); if (pl) { const v = vidOf('ffxEpVid'), now = q('#ffxNow'); if (now) now.textContent = `Welcome video \u00b7 "${pl.dataset.ffxPlay}" is not made yet`;
    const box = q('#ffx-player'); if (box) box.scrollIntoView({behavior:'smooth', block:'start'});
    if (v && !v.error && !v.closest('.is-off')) { try { v.currentTime = 0; } catch(_) {} const p = v.play(); if (p && p.catch) p.catch(() => {}); } else toast('The welcome video could not load. Try again in a moment.'); return; }
  // enroll
  const dt = t.closest('[data-ffx-date]'); if (dt) { st.ffxTour = Object.assign({}, st.ffxTour, {date:dt.dataset.ffxDate}); document.querySelectorAll('[data-ffx-date]').forEach(b => b.setAttribute('aria-pressed', String(b === dt))); setErr('ffxDate', ''); return; }
  const tm = t.closest('[data-ffx-time]'); if (tm) { st.ffxTour = Object.assign({}, st.ffxTour, {time:tm.dataset.ffxTime}); document.querySelectorAll('[data-ffx-time]').forEach(b => b.setAttribute('aria-pressed', String(b === tm))); setErr('ffxTime', ''); return; }
  if (t.closest('[data-ffx-appnext]')) { const f = q('#ffxAppForm'), n = +(f.dataset.step || 1); if (APP_STEPS[n]().every(Boolean)) showStep(n + 1); else firstBad(f); return; }
  if (t.closest('[data-ffx-appback]')) { const f = q('#ffxAppForm'), n = +(f.dataset.step || 1); showStep(Math.max(1, n - 1)); return; }
  if (t.closest('[data-ffx-newtour]')) { st.ffxTour = {}; const c = q('#ffxTourCard'); if (c) { c.querySelector('.ffx-ok').outerHTML = tourHtml(); } return; }
});

document.addEventListener('input', e => { const t = e.target; if (t && t.id === 'ffxName') { const a = ACAD(); a.name = t.value.slice(0, 60); save('ff-academy', a); const n = q('#ffxCertName'); if (n) writeName(n, a.name, true); }
  if (t && t.getAttribute && t.getAttribute('aria-invalid') === 'true') setErr(t.id, ''); });
document.addEventListener('change', e => { const t = e.target; if (!t || t.dataset == null || t.dataset.ffxQ == null) return; const f = t.closest('#ffxQuiz'); if (!f) return;
  const code = f.dataset.code, n = +t.dataset.ffxQ, k = +t.value, qq = quizFor(code)[n], a = ACAD(); a.q[code] = a.q[code] || {}; a.q[code][n] = k; save('ff-academy', a);
  const fs = t.closest('fieldset'); fs.querySelectorAll('label').forEach(l => { l.classList.remove('right', 'wrong'); }); t.closest('label').classList.add(k === qq[2] ? 'right' : 'wrong');
  const fb = document.getElementById('ffxfb' + n); fb.className = 'ffx-fb ' + (k === qq[2] ? 'ok' : 'bad'); fb.innerHTML = (k === qq[2] ? '<b>Correct.</b> ' : '<b>Not quite.</b> ') + esc(qq[3]);
  const qs = quizFor(code), sc = Object.keys(a.q[code]).filter(i => a.q[code][i] === qs[i][2]).length; const s = q('#ffxScore'); if (s) s.textContent = `${sc} of 3 correct`; });

const TIME24 = {'9:30': '09:30', '10:30': '10:30', '3:30': '15:30'};
const REL = {'Parent': 'parent', 'Guardian': 'guardian', 'Grandparent': 'grandparent', 'Other family member': 'other'};
const PAY = {'Private pay': 'private', 'Missouri child care subsidy': 'subsidy', 'Employer benefit': 'employer', 'Not sure yet': 'unsure'};
const PROG = {'Twos Room (ages 2 to 3)': 'twos', 'Threes Room (ages 3 to 4)': 'threes', 'Pre-K Room (ages 4 to 5)': 'preK'};
const TOUR_FIELDS = {name: 'tName', phone: 'tPhone', email: 'tEmail', childAge: 'tAge', date: 'ffxDate', time: 'ffxTime', location: 'ffxDate'};
const APP_FIELDS = {name: 'aParent', email: 'aEmail', phone: 'aPhone', childFirst: 'aFirst', childAge: 'aAge', preferredStart: 'aStart', agree: 'aAgree', relationship: 'aRel', program: 'aRoom', location: 'aFirst'};

document.addEventListener('submit', e => { const f = e.target; if (!f || !f.id || !/^ffx/.test(f.id)) return; e.preventDefault();
  if (f.id === 'ffxTourForm') { const tt = st.ffxTour || {}; const r = [setErr('ffxDate', tt.date ? '' : 'Pick a date.'), setErr('ffxTime', tt.time ? '' : 'Pick a time.'), need('tName', 'your name'), setErr('tPhone', okPhone(val('tPhone')) ? '' : 'Enter a 10-digit phone number.'), setErr('tEmail', !val('tEmail') || okEmail(val('tEmail')) ? '' : 'Check the email address.'), need('tAge', 'your child\'s age')];
    if (!r.every(Boolean)) { const b = f.querySelector('[aria-invalid="true"]'); if (b) b.focus(); else toast(tt.date ? 'Pick a time for your tour.' : 'Pick a date for your tour.'); return; }
    const when = shortDate(fromIso(tt.date)), tl = (TIMES.find(x => x[0] === tt.time) || [, tt.time])[1];
    const data = {location: 'flc', date: tt.date, time: TIME24[tt.time], name: val('tName'), phone: val('tPhone'), childAge: val('tAge'), website: val('ffiHpT')}; if (val('tEmail')) data.email = val('tEmail');
    FI().clearMsg(f); FI().busy(f, true);
    FI().submit('tour', data).then(res => {
      if (!res.ok) return FI().showFailure(f, res, TOUR_FIELDS);
      f.outerHTML = FI().receipt({title: `Tour request received for ${when}, around ${tl}.`, ref: res.ref, days: res.days, email: data.email, emailConfirmation: res.emailConfirmation,
        lines: ['This is a request, not a booked tour. The center will call you to agree on a time.', `${FLC.addr} · plan for about 30 minutes. Questions before then? Call <b>${FLC.phone}</b>.`],
        after: '<button type="button" class="btn soft" data-ffx-newtour style="justify-self:start">Request another time</button>'});
      const ok = q('#ffiOk'); if (ok) ok.focus({preventScroll:true}); });
    return; }
  if (f.id === 'ffxAppForm') { const n = +(f.dataset.step || 1); if (n !== 3) { if (APP_STEPS[n]().every(Boolean)) showStep(n + 1); else firstBad(f); return; }
    if (!APP_STEPS[3]().every(Boolean)) { firstBad(f); return; }
    const first = val('aFirst'), notes = [val('aSched') && 'Schedule requested: ' + val('aSched'), val('aNotes')].filter(Boolean).join('\n');
    const data = {location: 'flc', name: val('aParent'), relationship: REL[val('aRel')], email: val('aEmail'), phone: val('aPhone'), childFirst: first, childAge: parseInt(val('aAge'), 10), program: PROG[val('aRoom')],
      preferredStart: val('aStart'), payment: PAY[val('aPay')], heard: val('aHeard'), agree: true, website: val('ffiHpA')}; if (notes) data.message = notes;
    FI().clearMsg(f); FI().busy(f, true);
    FI().submit('enrollment', data).then(res => {
      if (!res.ok) return FI().showFailure(f, res, APP_FIELDS);
      const card = q('#ffxAppCard');
      if (card) { card.innerHTML = '<div class="eyebrow">Online application</div>' + FI().receipt({title: `We received ${esc(first)}'s application.`, ref: res.ref, days: res.days, email: data.email, emailConfirmation: res.emailConfirmation,
        lines: [`Room: <b>${esc(val('aRoom').replace(/ \(.*$/, '') || 'to be confirmed')}</b> · preferred start <b>${longDate(fromIso(data.preferredStart))}</b>.`,
          'This does not place your child on a waitlist and does not guarantee a spot. The center will contact you to talk about next steps and, if you have not toured yet, to set a time.']});
        const ok = q('#ffiOk'); if (ok) ok.focus({preventScroll:true}); }
      const w = document.getElementById('wEmail'); if (w) w.value = data.email; const wr = document.getElementById('wRef'); if (wr) wr.value = res.ref; });
    return; }
  if (f.id === 'ffxStatusForm') { const ref = val('wRef').toUpperCase(), em = val('wEmail').toLowerCase(); const r = [setErr('wRef', /^FF-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(ref) ? '' : 'Enter the reference number, like FF-ABCD-2345.'), setErr('wEmail', okEmail(em) ? '' : 'Enter the email you used.')];
    if (!r.every(Boolean)) { firstBad(f); return; }
    const out = q('#ffxStatusOut'); out.textContent = 'Checking...';
    FI().status(ref, em).then(res => {
      if (res.ok) { const s = res.status; out.innerHTML = `<div class="ffx-status" style="margin-top:10px"><div class="row"><span>Reference</span><b>${esc(s.ref)}</b></div><div class="row"><span>Received</span><b>${esc(FI().fmtDate(s.receivedAt))}</b></div><div class="row"><span>Passed to our team</span><span class="chip ${s.filed ? 'ok' : 'warn'}">${s.filed ? 'Yes' : 'In progress'}</span></div></div><p class="small">${esc(s.message)}</p>`; }
      else out.innerHTML = `<p class="ffi-msg" role="alert">${esc(res.message || 'We could not check right now.')}</p>`; });
    return; }
}, true);

// ================================================================ 4. MOTION (Academy A-F, Watch O)
// Every function here leaves the page complete when motion is off: the HTML is rendered in its finished state and JS only sets "from" states when motion is allowed.
const RMQ = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : {matches:false};
const FINE = window.matchMedia ? matchMedia('(pointer: fine)').matches : false;
let MOK = !!window.gsap && !RMQ.matches;
let CLEAN = [];
const hdr = () => { const h = document.querySelector('header.bar'); return h ? h.offsetHeight : 0; };

// B. chapter playhead. mode 0 = set, 1 = bouncy glide (chapter click), 2 = soft follow (playback)
function placeHead(wrap, pos, mode){ if (!wrap) return; const ph = wrap.querySelector('.ffx-ph'), bs = [...wrap.querySelectorAll('.ffx-chaps button')]; if (!ph || !bs.length) return;
  const h = ph.offsetHeight || 1, top = ph.offsetTop, i = Math.max(0, Math.min(bs.length - 1, Math.floor(pos))), f = pos - i;
  const cy = b => b.parentNode.offsetTop + b.offsetHeight / 2, y0 = cy(bs[i]), y1 = bs[i + 1] ? cy(bs[i + 1]) : y0;
  const y = Math.max(0, Math.min(h, y0 + (y1 - y0) * f - top)), dot = ph.querySelector('i'), bar = ph.querySelector('b'), G = window.gsap;
  if (G && MOK && mode) { G.to(dot, {y, duration:mode === 1 ? .7 : .3, ease:mode === 1 ? 'back.out(1.7)' : 'none', overwrite:true}); G.to(bar, {scaleY:y / h, duration:mode === 1 ? .7 : .3, ease:mode === 1 ? 'power3.out' : 'none', overwrite:true}); }
  else { dot.style.transform = `translateY(${y}px)`; bar.style.transform = `scaleY(${y / h})`; } }

// D. certificate name: new letters drop in one by one as they are typed; edits rebuild without motion
function writeName(el, raw, anim){ const nm = String(raw || '').replace(/^\s+/, ''), old = el.dataset.v || '';
  const letters = s => [...s].map(ch => `<span class="ffx-l">${esc(ch)}</span>`).join('');
  if (!nm.trim()) { el.dataset.v = ''; el.classList.add('ph'); el.textContent = 'Your name'; return; }
  if (anim && MOK && window.gsap && nm.startsWith(old) && nm.length > old.length) {
    if (!old) el.textContent = ''; el.classList.remove('ph');
    const tmp = document.createElement('span'); tmp.innerHTML = letters(nm.slice(old.length)); const add = [...tmp.children]; add.forEach(n => el.appendChild(n));
    gsap.from(add, {y:-30, opacity:0, rotation:-14, scale:1.5, duration:.5, ease:'back.out(2.4)', stagger:.045});
  } else { el.classList.remove('ph'); el.innerHTML = letters(nm); }
  el.dataset.v = nm; }

// E. rails: nav buttons, snap targets, desktop drag with inertia
const snapX = (r, v) => { const pad = parseFloat(getComputedStyle(r).paddingLeft) || 0, max = r.scrollWidth - r.clientWidth; let best = v, bd = Infinity;
  r.querySelectorAll('.ffx-rail-in > *').forEach(c => { if (c.hidden) return; const p = Math.max(0, Math.min(max, c.offsetLeft - pad)), d = Math.abs(p - v); if (d < bd) { bd = d; best = p; } }); return best; };
function railBy(r, dir){ const max = r.scrollWidth - r.clientWidth, target = Math.max(0, Math.min(max, snapX(r, r.scrollLeft + dir * r.clientWidth * .8)));
  if (MOK && window.gsap && r.classList.contains('js-drag')) gsap.to(r, {scrollLeft:target, duration:.8, ease:'power3.out', overwrite:true});
  else r.scrollTo({left:target, behavior:MOK ? 'smooth' : 'auto'}); }
function dragRail(r, off){ const G = window.gsap, IP = window.InertiaPlugin; if (!G || !IP) return;
  r.classList.add('js-drag'); let down = false, moved = false, x0 = 0, s0 = 0;
  const max = () => r.scrollWidth - r.clientWidth;
  const dn = e => { if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('button,a,input,select,textarea')) return; down = true; moved = false; x0 = e.clientX; s0 = r.scrollLeft; G.killTweensOf(r); IP.track(r, 'scrollLeft'); e.preventDefault(); };
  const mv = e => { if (!down) return; const dx = e.clientX - x0; if (!moved && Math.abs(dx) > 6) { moved = true; r.classList.add('is-drag'); } if (moved) r.scrollLeft = s0 - dx; };
  const up = () => { if (!down) return; down = false; r.classList.remove('is-drag');
    if (moved) G.to(r, {inertia:{scrollLeft:{velocity:'auto', min:0, max:max(), end:v => snapX(r, v)}, duration:{min:.35, max:1.3}}, onComplete:() => IP.untrack(r)}); else IP.untrack(r); };
  const ck = e => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } };
  const ds = e => e.preventDefault();
  r.addEventListener('pointerdown', dn); addEventListener('pointermove', mv); addEventListener('pointerup', up); r.addEventListener('click', ck, true); r.addEventListener('dragstart', ds);
  off.push(() => { r.classList.remove('js-drag', 'is-drag'); r.removeEventListener('pointerdown', dn); removeEventListener('pointermove', mv); removeEventListener('pointerup', up); r.removeEventListener('click', ck, true); r.removeEventListener('dragstart', ds); try { IP.untrack(r); } catch(_) {} }); }

// E/O. hover (desktop) or long-press (touch) preview: a real muted loop when data-preview is set, otherwise a Ken Burns stand-in
function preview(th, on){ if (!th) return; th.classList.toggle('is-prev', on); const src = th.dataset.preview; if (!MOK) return;
  if (src) { let v = th.querySelector('video.pv');
    if (on) { if (!v) { v = document.createElement('video'); v.className = 'pv'; v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto'; v.setAttribute('aria-hidden', 'true'); v.src = src; v.addEventListener('error', () => v.remove()); th.appendChild(v); } v.style.opacity = 1; const p = v.play(); if (p && p.catch) p.catch(() => {}); }
    else if (v) { v.pause(); v.style.opacity = 0; } return; }
  const G = window.gsap, kb = th.querySelector('.kb'); if (!G || !kb) return; const im = kb.querySelectorAll('img');
  if (on) { G.to(kb, {scale:1.14, xPercent:-4, yPercent:-3, duration:3.4, ease:'sine.inOut', overwrite:true}); G.to(im, {y:-6, rotation:-3, duration:.6, ease:'back.out(2)', stagger:.05, overwrite:true}); }
  else { G.to(kb, {scale:1, xPercent:0, yPercent:0, duration:.7, ease:'power2.out', overwrite:true}); G.to(im, {y:0, rotation:0, duration:.5, ease:'power2.out', overwrite:true}); } }
const thumbOf = e => e.target && e.target.closest ? e.target.closest('.ffx-thumb') : null;
document.addEventListener('pointerover', e => { if (e.pointerType !== 'mouse') return; const th = thumbOf(e); if (th && !th.contains(e.relatedTarget)) preview(th, true); });
document.addEventListener('pointerout', e => { if (e.pointerType !== 'mouse') return; const th = thumbOf(e); if (th && !th.contains(e.relatedTarget)) preview(th, false); });
let lpT = 0, lpTh = null, lpFired = false;
document.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') return; const th = thumbOf(e); if (!th) return; lpFired = false; clearTimeout(lpT); lpTh = th; lpT = setTimeout(() => { lpFired = true; preview(th, true); }, 420); }, {passive:true});
['pointerup', 'pointercancel'].forEach(ev => document.addEventListener(ev, () => { clearTimeout(lpT); if (lpTh && lpFired) preview(lpTh, false); lpTh = null; }, {passive:true}));
document.addEventListener('click', e => { if (lpFired && thumbOf(e)) { e.preventDefault(); e.stopPropagation(); lpFired = false; } }, true);
document.addEventListener('contextmenu', e => { if (thumbOf(e)) e.preventDefault(); });

// E. filter chips: bring the chosen credential's rail to the top (Flip) and soften the others
function applyTrack(anim){ const box = q('[data-ffx-rails]'); if (!box) return; const f = st.ffxTrack || 'all', groups = [...box.querySelectorAll('[data-ffx-group]')];
  const order = trackOrder(f).map(t => t.p), Fl = window.Flip, state = anim && MOK && Fl ? Fl.getState(groups) : null;
  order.forEach(p => { const g = groups.find(x => x.dataset.ffxGroup === p); if (g) box.appendChild(g); });
  groups.forEach(g => { g.hidden = false; g.classList.toggle('is-pick', f !== 'all' && g.dataset.ffxGroup === f); g.classList.toggle('is-dim', f !== 'all' && g.dataset.ffxGroup !== f); });
  if (state) Fl.from(state, {duration:.8, ease:'power3.inOut', stagger:.03, onComplete:() => window.ScrollTrigger && ScrollTrigger.refresh()});
  else if (window.ScrollTrigger && MOK) ScrollTrigger.refresh(); }
// O. friend chips: filter episode cards inside the rail (Flip)
function applyFriend(anim){ const cards = [...document.querySelectorAll('[data-ffx-ep]')]; if (!cards.length) return; const f = st.ffxFriend || 'all', r = cards[0].closest('[data-ffx-rail]'), G = window.gsap, Fl = window.Flip;
  if (r) { if (G) G.killTweensOf(r); r.scrollLeft = 0; }
  const state = anim && MOK && Fl ? Fl.getState(cards) : null;
  cards.forEach(c => c.hidden = !(f === 'all' || c.dataset.ffxEp === f)); if (r) r.scrollLeft = 0;
  if (state) Fl.from(state, {duration:.6, ease:'power2.inOut', absolute:true, scale:true,
    onEnter:els => G.fromTo(els, {opacity:0, scale:.85}, {opacity:1, scale:1, duration:.5, ease:'back.out(1.7)'}),
    onLeave:els => G.to(els, {opacity:0, scale:.85, duration:.3}), onComplete:() => r && r._upd && r._upd()});
  else if (r && r._upd) r._upd(); }

function initRails(root, ok, mm){ const G = window.gsap;
  root.querySelectorAll('[data-ffx-rail]').forEach(r => { const box = r.closest('[data-ffx-railbox]'), navs = box ? [...box.querySelectorAll('[data-ffx-rnav]')] : [];
    const upd = () => { const mx = r.scrollWidth - r.clientWidth - 2; navs.forEach(b => { b.disabled = +b.dataset.ffxRnav < 0 ? r.scrollLeft <= 2 : r.scrollLeft >= mx; }); };
    r._upd = upd; r.addEventListener('scroll', upd, {passive:true}); upd();
    if (ok) { r.style.scrollSnapType = 'none'; G.from([...r.querySelectorAll('.ffx-rail-in > *')].filter(c => !c.hidden).slice(0, 6), {x:80, opacity:0, duration:.8, ease:'back.out(1.3)', stagger:.07,
      scrollTrigger:{trigger:r, start:'top 88%', once:true}, onComplete:() => { r.style.scrollSnapType = ''; r.scrollLeft = 0; upd(); }}); } });
  const ro = () => root.querySelectorAll('[data-ffx-rail]').forEach(r => r._upd && r._upd()); addEventListener('resize', ro); CLEAN.push(() => removeEventListener('resize', ro));
  if (ok) mm.add('(pointer: fine)', () => { const off = []; root.querySelectorAll('[data-ffx-rail]').forEach(r => dragRail(r, off)); return () => off.forEach(f => f()); }); }

// ---------------------------------------------------------------- Academy
function academyMotion(root, ok, mm){ const G = window.gsap, STg = window.ScrollTrigger;
  // A. Booker guide: pop-up entrance, idle bob, lean toward the cursor, wave on tap
  const gd = root.querySelector('[data-ffx-guide]');
  if (gd) { const tilt = gd.querySelector('.ffx-guide-tilt'), bob = gd.querySelector('.ffx-guide-bob'), btn = gd.querySelector('.ffx-guide-btn'), say = gd.querySelector('.ffx-say');
    const LINES = ['Hi! I’m Booker, your Academy guide.', 'Every module brings you one rung higher.', 'Pause at each chapter and talk it through.', 'Let’s learn together!']; let n = 0, sayT = 0;
    const speak = () => { say.textContent = LINES[n++ % LINES.length]; clearTimeout(sayT);
      if (ok) { G.fromTo(say, {opacity:0, scale:.6}, {opacity:1, scale:1, duration:.45, ease:'back.out(2.2)', overwrite:true}); sayT = setTimeout(() => G.to(say, {opacity:0, scale:.85, duration:.3}), 2800); }
      else { say.classList.add('on'); sayT = setTimeout(() => say.classList.remove('on'), 4000); } };
    btn.addEventListener('click', () => { speak(); if (!ok) return;
      G.timeline().to(btn, {rotation:-9, y:-18, duration:.18, ease:'power2.out'}).to(btn, {rotation:8, duration:.2, ease:'sine.inOut', yoyo:true, repeat:3}).to(btn, {rotation:0, y:0, duration:.5, ease:'back.out(3)'}); });
    CLEAN.push(() => clearTimeout(sayT));
    if (ok) { G.from(gd, {y:90, scale:.85, opacity:0, transformOrigin:'50% 100%', duration:1, ease:'back.out(1.6)', delay:.35});
      G.to(bob, {y:-10, rotation:1.2, duration:2.4, ease:'sine.inOut', yoyo:true, repeat:-1, delay:1.3});
      if (FINE) { G.set(tilt, {transformPerspective:900}); const ry = G.quickTo(tilt, 'rotationY', {duration:.9, ease:'power3'}), rz = G.quickTo(tilt, 'rotation', {duration:.9, ease:'power3'}), rx = G.quickTo(tilt, 'rotationX', {duration:.9, ease:'power3'});
        const mv = e => { const r = gd.getBoundingClientRect(); if (r.bottom < 0) return; const dx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (innerWidth / 2))), dy = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height * .25)) / (innerHeight / 2))); ry(dx * 18); rz(dx * 3.5); rx(-dy * 7); };
        addEventListener('pointermove', mv, {passive:true}); CLEAN.push(() => removeEventListener('pointermove', mv)); } } }

  // B. welcome video: scroll-to-expand on desktop (pinned), gentle grow on mobile
  const wel = root.querySelector('[data-ffx-welcome]');
  if (wel && ok) {
    mm.add('(min-width: 820px)', () => { const pl = wel.querySelector('.ffx-player'), side = wel.querySelector('.ffx-wside'), cap = wel.querySelector('.ffx-wcap');
      const geo = () => { const w = pl.offsetWidth, h = pl.offsetHeight; let x = 0, y = 0, el = pl; while (el && el !== wel) { x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; } const H = hdr();
        return {S:Math.min((innerWidth - 40) / w, (innerHeight - H - 28) / h), dx:innerWidth / 2 - (x + w / 2), dy:(innerHeight - H) / 2 - (y + h / 2)}; };
      G.timeline({scrollTrigger:{trigger:wel, start:() => 'top ' + hdr() + 'px', end:() => '+=' + Math.round(innerHeight * 1.1), pin:true, scrub:.6, invalidateOnRefresh:true}})
        .to(pl, {scale:() => geo().S, x:() => geo().dx, y:() => geo().dy, borderRadius:0, duration:1, ease:'power2.inOut'})
        .to([side, cap], {opacity:0, duration:.45}, 0).to(side, {x:60, duration:.45}, 0)
        .to({}, {duration:.6})
        .to(pl, {scale:1, x:0, y:0, borderRadius:20, duration:1, ease:'power2.inOut'})
        .to([side, cap], {opacity:1, x:0, duration:.5}, '-=.45');
    });
    mm.add('(max-width: 819px)', () => { G.fromTo(wel.querySelector('.ffx-player'), {scale:.9, borderRadius:34}, {scale:1, borderRadius:20, ease:'none', scrollTrigger:{trigger:wel, start:'top 85%', end:'top 25%', scrub:true}}); });
  }

  // F. KPI row: count-ups and the hours meter fills on enter
  if (ok) { root.querySelectorAll('[data-ffx-count]').forEach(b => { const tn = b.firstChild; if (!tn || tn.nodeType !== 3) return; const end = parseFloat(tn.textContent); if (!(end > 0)) return;
      const dec = (tn.textContent.split('.')[1] || '').length, o = {v:0}; tn.textContent = (0).toFixed(dec);
      G.to(o, {v:end, duration:1.4, ease:'power2.out', scrollTrigger:{trigger:b, start:'top 92%', once:true}, onUpdate:() => { tn.textContent = o.v.toFixed(dec); }}); });
    const hm = root.querySelector('[data-ffx-hours]'); if (hm) G.fromTo(hm, {width:'0%'}, {width:hm.style.width || '0%', duration:1.5, ease:'power3.out', delay:.15, scrollTrigger:{trigger:hm, start:'top 92%', once:true}}); }

  // C. SIGNATURE: the credential climb
  const cl = root.querySelector('[data-ffx-climb]');
  if (cl) { const a = ACAD(), stage = cl.querySelector('[data-ffx-stage]'), lis = [...cl.querySelectorAll('.ffx-cr')], now = cl.querySelector('[data-ffx-now]'), cur = currentRung(a);
    const fired = {}, boom = i => { if (fired[i]) return; fired[i] = 1; if (window.FFconfetti) window.FFconfetti(60); };
    const setNow = (i, anim) => { if (!now || +now.dataset.i === i) return; now.dataset.i = i; now.innerHTML = nowHtml(a, i); if (anim && G) G.fromTo(now.children, {y:10, opacity:0}, {y:0, opacity:1, duration:.35, stagger:.03, ease:'power2.out', overwrite:true}); };
    const markRung = (li, i, on) => { const er = li.dataset.earned === '1' && on, tx = li.querySelector('text'), want = er ? '✓' : shortLabel(TRACKS[i]);
      li.classList.toggle('earned', er); li.querySelector('.ffx-ring').classList.toggle('earned', er); if (tx.textContent !== want) { tx.textContent = want; tx.setAttribute('y', er ? 47 : 46); } };
    const restore = () => { lis.forEach((li, i) => markRung(li, i, true)); now.dataset.i = ''; setNow(cur, false); };
    if (ok && window.MotionPathPlugin && window.DrawSVGPlugin) {
      mm.add('(min-width: 820px)', () => { cl.classList.add('ffx-pinfit');
        const svg = stage.querySelector('svg.route'), drawn = svg.querySelector('.drawn'), glow = svg.querySelector('.glow'), climber = stage.querySelector('[data-ffx-climber]'), cimg = climber.querySelector('img');
        const tmp = document.createElementNS('http://www.w3.org/2000/svg', 'path'); tmp.setAttribute('visibility', 'hidden'); svg.appendChild(tmp);
        const full = drawn.getTotalLength(), fr = CLIMB_SEGS.map((_, k) => { tmp.setAttribute('d', `M${CLIMB_P[0]} ` + CLIMB_SEGS.slice(0, k + 1).join(' ')); return Math.min(1, tmp.getTotalLength() / full); }); tmp.remove();
        G.set(climber, {left:0, top:0}); G.set([drawn, glow], {drawSVG:'0% 0%'});
        lis.forEach((li, i) => { G.set(li.querySelector('.fil'), {attr:{'stroke-dashoffset':100}}); G.set(li.querySelector('.lbl'), {opacity:.4}); if (li.dataset.earned === '1') G.set(li.querySelector('.core'), {attr:{d:CIRCLE_D}}); markRung(li, i, false); });
        const arrive = []; let prev = 0, lastT = 0;
        const tl = G.timeline({defaults:{ease:'none'}, scrollTrigger:{trigger:cl, start:() => 'top ' + hdr() + 'px', end:() => '+=' + Math.round(innerHeight * 2.6), pin:true, scrub:.8, invalidateOnRefresh:true}});
        fr.forEach((f, i) => { const li = lis[i], d = Math.max(.3, (f - prev) * 7), ring = li.querySelector('.ffx-ring');
          tl.to(climber, {motionPath:{path:drawn, align:drawn, alignOrigin:[.5, .5], start:prev, end:f}, duration:d}, '>')
            .to([drawn, glow], {drawSVG:`0% ${(f * 100).toFixed(2)}%`, duration:d}, '<')
            .fromTo(cimg, {rotation:-6}, {rotation:6, duration:d / 4, repeat:3, yoyo:true, ease:'sine.inOut'}, '<')
            .set(cimg, {rotation:0});
          arrive.push(tl.duration());
          tl.to(li.querySelector('.fil'), {attr:{'stroke-dashoffset':100 - +li.dataset.pct}, duration:.6, ease:'power1.out'})
            .to(li.querySelector('.lbl'), {opacity:1, duration:.3}, '<')
            .to(ring, {scale:1.14, transformOrigin:'50% 50%', duration:.22, ease:'power2.out', yoyo:true, repeat:1}, '<')
            .to(cimg, {y:-12, duration:.2, ease:'power2.out', yoyo:true, repeat:1}, '<');
          if (li.dataset.earned === '1' && window.MorphSVGPlugin) tl.to(li.querySelector('.core'), {morphSVG:STAR_D, duration:.45, ease:'back.out(1.6)'}, '<.15');
          tl.to({}, {duration:.4}); prev = f; });
        const sync = () => { const t = tl.time(), fwd = t >= lastT; lastT = t; let r = -1; arrive.forEach((at, i) => { if (t >= at - .001) r = i; });
          lis.forEach((li, i) => { markRung(li, i, i <= r); if (i <= r && li.dataset.earned === '1' && fwd && t > 0) boom(i); }); setNow(Math.max(0, r), true); };
        tl.eventCallback('onUpdate', sync); now.dataset.i = ''; setNow(0, false);
        return () => { cl.classList.remove('ffx-pinfit'); restore(); }; });
      mm.add('(max-width: 819px)', () => { const ml = cl.querySelector('.ffx-mline i');
        if (ml) G.fromTo(ml, {scaleY:0}, {scaleY:1, ease:'none', scrollTrigger:{trigger:cl.querySelector('.ffx-rungs'), start:'top 75%', end:'bottom 70%', scrub:true}});
        lis.forEach((li, i) => { const ring = li.querySelector('.ffx-ring'), fil = li.querySelector('.fil'), lbl = li.querySelector('.lbl'), here = li.querySelector('.ffx-here'), er = li.dataset.earned === '1';
          G.set(fil, {attr:{'stroke-dashoffset':100}}); G.set(ring, {scale:.6, opacity:0}); G.set(lbl, {x:24, opacity:0}); if (er && window.MorphSVGPlugin) G.set(li.querySelector('.core'), {attr:{d:CIRCLE_D}});
          const t = G.timeline({scrollTrigger:{trigger:li, start:'top 84%', once:true}});
          t.to(ring, {scale:1, opacity:1, duration:.55, ease:'back.out(2)'}).to(lbl, {x:0, opacity:1, duration:.5, ease:'power3.out'}, '<.1').to(fil, {attr:{'stroke-dashoffset':100 - +li.dataset.pct}, duration:.8, ease:'power2.out'}, '<');
          if (er && window.MorphSVGPlugin) t.to(li.querySelector('.core'), {morphSVG:STAR_D, duration:.5, ease:'back.out(1.6)'}, '-=.3').call(() => boom(i));
          if (here) t.from(here, {y:20, opacity:0, duration:.5, ease:'back.out(2)'}, '-=.3'); }); });
    } }

  // D. certificate: foil glare + tilt (cursor or device tilt), name cascade, stamp press on a newly earned credential
  const cw = root.querySelector('[data-ffx-certwrap]');
  if (cw) { const cert = cw.querySelector('.ffx-cert'), nm = cert.querySelector('#ffxCertName');
    if (nm) nm.dataset.v = nm.classList.contains('ph') ? '' : nm.textContent;
    if (ok) { const setG = (px, py) => { cert.style.setProperty('--gx', (px * 100).toFixed(1) + '%'); cert.style.setProperty('--gy', (py * 100).toFixed(1) + '%'); };
      G.set(cw, {transformPerspective:1100}); const rx = G.quickTo(cw, 'rotationX', {duration:.6, ease:'power3'}), ry = G.quickTo(cw, 'rotationY', {duration:.6, ease:'power3'});
      if (FINE) { cw.addEventListener('pointermove', e => { const r = cw.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height; setG(px, py); cert.style.setProperty('--go', 1); ry((px - .5) * 10); rx(-(py - .5) * 8); });
        cw.addEventListener('pointerleave', () => { cert.style.setProperty('--go', .55); setG(.5, .2); rx(0); ry(0); }); }
      else if ('DeviceOrientationEvent' in window) { const or = e => { if (e.gamma == null) return; const r = cw.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
          const px = Math.max(0, Math.min(1, .5 + e.gamma / 60)), py = Math.max(0, Math.min(1, .5 + (e.beta - 45) / 60)); setG(px, py); ry((px - .5) * 8); rx(-(py - .5) * 6); };
        addEventListener('deviceorientation', or); CLEAN.push(() => removeEventListener('deviceorientation', or)); }
      if (nm && nm.dataset.v) STg.create({trigger:cert, start:'top 78%', once:true, onEnter:() => { const v = nm.dataset.v; nm.dataset.v = ''; writeName(nm, v, true); }}); }
    const sp = cert.querySelector('.ffx-stamp'), p = cert.dataset.ffxEarned;
    if (sp && p) { const a = ACAD(), seen = a.stamped && typeof a.stamped === 'object' ? a.stamped : {};
      const mark = () => { const b = ACAD(); b.stamped = Object.assign({}, b.stamped && typeof b.stamped === 'object' ? b.stamped : {}, {[p]:1}); save('ff-academy', b); };
      if (!seen[p]) { if (ok) { G.set(sp, {opacity:0, scale:2.6, rotation:-40});
          STg.create({trigger:cert, start:'top 62%', once:true, onEnter:() => { mark(); G.timeline().to(sp, {opacity:1, scale:1, rotation:-12, duration:.38, ease:'power4.in'})
            .to(cw, {y:4, duration:.06, yoyo:true, repeat:1, ease:'power1.out'}).add(() => { if (window.FFconfetti) window.FFconfetti(80); }); }}); }
        else mark(); } } }
}

// ---------------------------------------------------------------- Watch
function watchMotion(root, ok){ const G = window.gsap; const tv = root.querySelector('[data-ffx-tv]'); if (!tv || !ok) return;
  const scr = tv.querySelector('.ffx-tv-screen'), bop = tv.querySelector('.ffx-tv-bop');
  G.timeline({delay:.45, scrollTrigger:{trigger:tv, start:'top 85%', once:true}})
    .fromTo(scr, {scaleY:.02, scaleX:.6, filter:'brightness(1.6)'}, {scaleY:1, scaleX:1, filter:'brightness(1)', duration:.8, ease:'back.out(1.3)', clearProps:'filter'})
    .from(bop, {scale:.55, rotation:-12, opacity:0, transformOrigin:'50% 100%', duration:.7, ease:'back.out(2)'}, '-=.35')   // grows up from its feet: never slides down over the captions note while it fades in
    .to(bop, {y:-6, rotation:2, duration:2.2, ease:'sine.inOut', yoyo:true, repeat:-1}); }

window.FFhooks = window.FFhooks || [];
window.FFhooks.push((view, root, ok) => {
  CLEAN.forEach(f => { try { f(); } catch(_) {} }); CLEAN = [];
  if (view !== 'academy' && view !== 'watch') return;
  const G = window.gsap; ok = !!(ok && G && window.ScrollTrigger); MOK = ok;
  document.documentElement.style.setProperty('--ffx-hdr', hdr() + 'px');
  if (ok) G.registerPlugin(...[window.ScrollTrigger, window.DrawSVGPlugin, window.MotionPathPlugin, window.MorphSVGPlugin, window.Flip, window.InertiaPlugin].filter(Boolean));
  const heads = () => root.querySelectorAll('[data-ffx-chapwrap]').forEach(w => { const bs = [...w.querySelectorAll('.ffx-chaps button')]; placeHead(w, Math.max(0, bs.findIndex(b => b.getAttribute('aria-current') === 'true')), 0); });
  heads(); addEventListener('resize', heads); CLEAN.push(() => removeEventListener('resize', heads));
  const mm = ok ? G.matchMedia() : {add(){}};
  if (ok) CLEAN.push(() => mm.revert());
  const run = () => { initRails(root, ok, mm); if (view === 'academy') academyMotion(root, ok, mm); else watchMotion(root, ok); };
  if (ok) { const ctx = G.context(run); CLEAN.push(() => ctx.revert()); } else run();
});

window.FFX = {load, save, episodes:EPISODES, tracks:TRACKS, academy:{state:ACAD, percent:modPct, stats:trackStat, totalHours:TOTAL_H}, weekMinutes:room => weekMin(WLOG(), room || 'Threes Room')};
})();
