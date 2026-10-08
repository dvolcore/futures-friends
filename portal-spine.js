/* Futures Hub portal spine (2026-10-08): the honest-numbers and motion layer the Director Portal screens share. Ported from the
   QEP CEO Operating Spine (provenance, attainment bands, reveals, count-ups), re-made in Futures Friends' own felt look: site tokens,
   light and dark, Fredoka display, friend colours. Gold belongs to the director's own decisions.

   Integrity rules this file enforces (so no screen has to remember them):
     1. One feed list. Every provenance chip, sentence and source line is derived from FEEDS; no screen types "measured" by hand.
     2. Absent is not zero: a figure from a feed that is not connected renders "—" with a hatched track, never 0.
     3. Count-ups are decoration; the true value is in the HTML. No JS, reduced motion, a hidden tab or print = the real figure.
     4. Settle, never loop: motion runs once when the reader arrives. The only repeating animation is the pulse on an overdue dot.

   API (window.FFSpine), all functions return HTML strings unless noted:
     FEEDS                      the feed list: {key, name, detail, state:'live'|'sample'|'stale'|'modelled'|'off', sync}
     addFeeds(list)             add or replace feeds by key (another screen's own sources)
     feed(key)                  one feed or null
     chip(state)                a provenance chip: "Hub sample", "Modelled", "Not connected", "Hub live", "Hub, stale"
     provenance(keys)           {counts, sentences[], tone, feeds}: the data behind the strip
     provStrip(keys, {note})    "Where these figures come from" strip: chips + one sentence per state, all from FEEDS
     sources(keys?)             the sources footer (every feed, or the given keys)
     band(attainment, {safety}) 'ok'|'near'|'watch'|'off'|'severe' (QEP five-step band); safety:true = anything under 1 is severe
     bandLabel(band)            words for the band (colour is never the only code)
     bar(pct, band)             a % of target bar that grows on reveal; pct null = hatched "not measured" track
     spark(series, band)        a sparkline that draws in on reveal; null or < 3 points = "no history"
     count(value, {pre, suf})   a figure that counts up on reveal (and lands on the true value)
     avatar(name, colour)       an initials disc; name falsy = "—" (no owner)
     daysBetween(a, b)          whole days from ISO date a to ISO date b
     daypart(date?)             'morning' | 'afternoon' | 'evening'
     reduced()                  prefers-reduced-motion (the site's data-motion="off" switch also stops all motion)
     ramp(ms, onFrame)          ease-out cubic 0..1; settles at once when motion is off or the tab is hidden
     animate(root, {key})       (DOM) install reveals under root now; automatic for any element with data-sp-root
   Markup hooks: data-sp-root="<key>" on a screen root (motion plays once per key per page load, later redraws settle at once);
   data-sp-reveal on each block that rises in; data-sp-count on figures; .psp-bar / .psp-spark inside a revealed block grow and draw. */
(function(){
'use strict';
const W = window, D = document;
const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// ---------------------------------------------------------------- the one feed list
// In this demo every Hub figure is SAMPLE data (A7). In a live center 'sample' becomes 'live' (or 'stale' when a feed stops).
const FEEDS = [
  {key:'attendance', name:'Check-in and attendance', detail:'Teacher check-in in the Hub', state:'sample', sync:'sample data'},
  {key:'staff', name:'Staff files and time clock', detail:'Hub staff records', state:'sample', sync:'sample data'},
  {key:'dues', name:'Due list and approvals', detail:'Hub due list, plans and requests', state:'sample', sync:'sample data'},
  {key:'enroll', name:'Enrollment desk', detail:'Hub inquiries, tours and waitlist', state:'sample', sync:'sample data'},
  {key:'reports', name:'Family reports and messages', detail:'Hub reports sent to families', state:'sample', sync:'sample data'},
  {key:'billing', name:'Tuition billing', detail:'Hub invoices (demo, no money moves)', state:'sample', sync:'sample data'},
  {key:'dates', name:'Key dates', detail:'Typed in by the director (sample dates)', state:'modelled', sync:'typed by hand'},
  {key:'forecast', name:'Tuition from open seats', detail:'Worked out: open seats times the weekly rate', state:'modelled', sync:'worked out'},
  {key:'subsidy', name:'State subsidy portal', detail:'Not connected yet', state:'off', sync:'never'},
  {key:'cacfp', name:'CACFP meal claims', detail:'Not connected yet', state:'off', sync:'never'}
];
const STATE = {
  live:{cls:'live', label:'Hub live', bucket:'hub'}, sample:{cls:'sample', label:'Hub sample', bucket:'hub'},
  stale:{cls:'stale', label:'Hub, stale', bucket:'stale'}, modelled:{cls:'modelled', label:'Modelled', bucket:'modelled'},
  off:{cls:'off', label:'Not connected', bucket:'off'}
};
function addFeeds(list){ (list || []).forEach(f => { if (!f || !f.key) return; const i = FEEDS.findIndex(x => x.key === f.key); if (i >= 0) FEEDS[i] = Object.assign({}, FEEDS[i], f); else FEEDS.push(Object.assign({state:'off', sync:'never'}, f)); }); }
const feed = k => FEEDS.find(f => f.key === k) || null;
const chip = st => { const s = STATE[st] || STATE.off; return `<span class="psp-chip psp-${s.cls}">${E(s.label)}</span>`; };

function provenance(keys){
  const fs = (keys && keys.length ? keys.map(feed) : FEEDS.slice());
  const unknown = (keys || []).filter(k => !feed(k));
  const list = fs.filter(Boolean), c = {live:0, sample:0, stale:0, modelled:0, off:0};
  list.forEach(f => { c[f.state in c ? f.state : 'off']++; });
  const n = (x, one, many) => `${x} ${x === 1 ? one : many}`;
  const sentences = [];
  if (c.live) sentences.push(`${n(c.live, 'source comes', 'sources come')} live from the Hub.`);
  if (c.sample) sentences.push(`${n(c.sample, 'source comes', 'sources come')} from the Hub (sample data in this demo).`);
  if (c.stale) sentences.push(`${n(c.stale, 'source has', 'sources have')} stopped updating, so ${c.stale === 1 ? 'its' : 'their'} figures are old.`);
  if (c.modelled) sentences.push(`${n(c.modelled, 'is', 'are')} modelled or typed by hand.`);
  if (c.off) sentences.push(`${n(c.off, 'is', 'are')} not connected, so anything that depends on ${c.off === 1 ? 'it' : 'them'} shows as absent, not estimated.`);
  if (unknown.length) sentences.push(`${n(unknown.length, 'source named here is', 'sources named here are')} not in the feed list.`);
  const tone = c.off || unknown.length ? 'off' : c.stale || c.modelled ? 'watch' : 'ok';
  return {counts:c, sentences, tone, feeds:list, unknown};
}
function provStrip(keys, opts){
  const p = provenance(keys), c = p.counts, o = opts || {};
  const chips = [['live', c.live], ['sample', c.sample], ['stale', c.stale], ['modelled', c.modelled], ['off', c.off]]
    .filter(x => x[1]).map(([st, k]) => `<span class="psp-chipn">${chip(st)}<b>${k}</b></span>`).join('');
  return `<section class="psp-prov psp-tone-${p.tone}" data-sp-reveal aria-label="Where these figures come from">
    <div class="psp-prov-top"><h2 class="psp-prov-h">Where these figures come from</h2><div class="psp-prov-chips">${chips}</div></div>
    <p class="psp-prov-line">${p.sentences.map(s => `<span>${E(s)}</span>`).join(' ')}</p>
    ${o.note ? `<p class="psp-prov-note">${E(o.note)}</p>` : ''}</section>`;
}
function sources(keys){
  const list = keys && keys.length ? keys.map(feed).filter(Boolean) : FEEDS;
  return `<div class="psp-sources" data-sp-reveal role="group" aria-labelledby="pspSrcH"><h2 class="psp-src-h" id="pspSrcH">Sources</h2><ul>${list.map(f =>
    `<li class="psp-src psp-${E((STATE[f.state] || STATE.off).cls)}"><i class="psp-sdot" aria-hidden="true"></i><span><b>${E(f.name)}</b> <small>${E(f.detail || '')}</small></span>${chip(f.state)}</li>`).join('')}</ul></div>`;
}

// ---------------------------------------------------------------- bands, bars, sparklines, figures
function band(a, o){
  if (a == null || Number.isNaN(a)) return 'none';
  if (o && o.safety) return a >= 1 ? 'ok' : 'severe';   // ratios are safety, not performance: no "near target"
  return a >= 1 ? 'ok' : a >= .9 ? 'near' : a >= .75 ? 'watch' : a >= .5 ? 'off' : 'severe';
}
const BAND_LABEL = {ok:'On target', near:'Near target', watch:'Watch', off:'Off target', severe:'Needs you now', none:'Not measured'};
const bandLabel = b => BAND_LABEL[b] || BAND_LABEL.none;
function bar(pct, b){
  if (pct == null) return `<span class="psp-bar psp-absent" role="img" aria-label="Not measured"><i></i></span>`;
  const w = Math.max(2, Math.min(100, Math.round(pct)));
  return `<span class="psp-bar psp-b-${E(b || 'ok')}" role="img" aria-label="${Math.round(pct)}% of target"><i style="width:${w}%"></i><em aria-hidden="true"></em></span>`;
}
function spark(a, b){
  const xs = (a || []).filter(v => v != null && !Number.isNaN(v));
  if (xs.length < 3) return `<span class="psp-spark psp-nospark">no history</span>`;
  const mn = Math.min(...xs), mx = Math.max(...xs), r = mx - mn || 1, w = 64, h = 22, step = (w - 4) / (xs.length - 1);
  const pts = xs.map((v, i) => [2 + i * step, h - 3 - (v - mn) / r * (h - 6)]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const last = pts[pts.length - 1];
  return `<svg class="psp-spark psp-b-${E(b || 'ok')}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true" focusable="false"><path d="${d}" pathLength="1"/><circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="2.4"/></svg>`;
}
const fmtNum = (v, dec) => Number(v).toLocaleString('en-US', {minimumFractionDigits:dec || 0, maximumFractionDigits:dec || 0});
function count(v, o){
  o = o || {};
  if (v == null || Number.isNaN(+v)) return `<span class="psp-absentv" title="Not measured">—</span>`;
  const pre = o.pre || '', suf = o.suf || '', dec = o.dec || 0;
  return `<span data-sp-count="${+v}" data-sp-pre="${E(pre)}" data-sp-suf="${E(suf)}" data-sp-dec="${dec}">${E(pre + fmtNum(v, dec) + suf)}</span>`;
}
const AV = ['#2F6FC0','#2E9E57','#D9488B','#8236AE','#0A7A8A','#8A6108'];
function avatar(name, col){
  if (!name) return `<span class="psp-av psp-av-none" aria-hidden="true">—</span>`;
  const ini = String(name).replace(/^(Ms\.|Mr\.|Mrs\.|Dr\.)\s*/i, '').split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase();
  let h = 0; for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `<span class="psp-av" style="--av:${E(col || AV[h % AV.length])}" aria-hidden="true">${E(ini)}</span>`;
}
function daysBetween(a, b){
  const p = s => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s)); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : NaN; };
  return Math.round((p(b) - p(a)) / 864e5);
}
function daypart(d){ const h = (d || new Date()).getHours(); return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'; }

// ---------------------------------------------------------------- motion (settle, never loop)
const mm = q => { try { return W.matchMedia && W.matchMedia(q).matches; } catch (_) { return false; } };
const reduced = () => mm('(prefers-reduced-motion: reduce)');
const motionOff = () => reduced() || D.documentElement.getAttribute('data-motion') === 'off';   // the site's own motion switch too
const noMotion = () => motionOff() || D.hidden || typeof W.requestAnimationFrame !== 'function' || mm('print');
const live = new Set();   // running ramps: settled at once if the tab hides
function ramp(ms, onFrame){
  if (noMotion()) { onFrame(1); return () => {}; }
  let done = false, t0 = null;
  const settle = () => { if (done) return; done = true; live.delete(settle); clearTimeout(fs); onFrame(1); };
  const fs = setTimeout(settle, ms + 400);   // frames stopped mid-ramp: show the real figure anyway
  live.add(settle);
  W.requestAnimationFrame(function tick(now){ if (done) return; if (t0 == null) t0 = now; const p = Math.min(1, (now - t0) / ms);
    if (p >= 1) return settle(); onFrame(1 - Math.pow(1 - p, 3)); W.requestAnimationFrame(tick); });
  return settle;
}
D.addEventListener('visibilitychange', () => { if (D.hidden) [...live].forEach(f => f()); });
function countUp(el){
  if (el.dataset.spDone) return; el.dataset.spDone = '1';
  const to = +el.dataset.spCount, pre = el.dataset.spPre || '', suf = el.dataset.spSuf || '', dec = +el.dataset.spDec || 0;
  ramp(1000, p => { el.textContent = pre + fmtNum(p >= 1 ? to : to * p, p >= 1 ? dec : (dec ? dec : 0)) + suf; });
}
const played = new Set();
const RISE = 16, DUR = .6, STAGGER = 65, FAILSAFE = 2800, EASE = 'cubic-bezier(.22,1,.36,1)';
function show(el){
  if (el.dataset.spShown) return; el.dataset.spShown = '1';
  el.style.opacity = '1'; el.style.transform = 'none'; el.classList.remove('psp-wait');
  el.querySelectorAll('[data-sp-count]').forEach(countUp);
  setTimeout(() => { el.style.transition = ''; el.style.opacity = ''; el.style.transform = ''; }, DUR * 1000 + 80);
}
function animate(root, o){
  if (!root || root.dataset.spOn) return; root.dataset.spOn = '1';
  const key = (o && o.key) || root.getAttribute('data-sp-root') || '';
  const els = [...root.querySelectorAll('[data-sp-reveal]')];
  if (played.has(key) || noMotion() || !('IntersectionObserver' in W)) return;   // later redraws and reduced motion: already settled
  if (key) played.add(key);
  els.forEach(el => {   // the hidden state is set from JS, so without JS everything is visible
    el.classList.add('psp-wait'); el.style.opacity = '0'; el.style.transform = `translateY(${RISE}px)`;
    el.style.transition = `opacity ${DUR}s ${EASE},transform ${DUR}s ${EASE}`;
    el.querySelectorAll('[data-sp-count]').forEach(c => { const pre = c.dataset.spPre || '', suf = c.dataset.spSuf || ''; c.textContent = pre + '0' + suf; });
  });
  const io = new IntersectionObserver(es => {
    es.filter(e => e.isIntersecting).map(e => e.target).forEach((el, i) => { io.unobserve(el); setTimeout(() => show(el), i * STAGGER); });
  }, {rootMargin:'0px 0px -8% 0px', threshold:.04});
  els.forEach(el => io.observe(el));
  setTimeout(() => { io.disconnect(); els.forEach(show); }, FAILSAFE);   // nothing is ever stuck invisible
}
// Any screen that renders data-sp-root gets motion with no extra call (microtask, so the hidden state lands before paint).
function scan(){ D.querySelectorAll('[data-sp-root]:not([data-sp-on])').forEach(r => animate(r)); }
if (typeof W.MutationObserver === 'function') {
  const start = () => { scan(); new W.MutationObserver(scan).observe(D.body, {childList:true, subtree:true}); };
  if (D.body) start(); else D.addEventListener('DOMContentLoaded', start);
}

W.FFSpine = {FEEDS, addFeeds, feed, chip, provenance, provStrip, sources, band, bandLabel, bar, spark, count, avatar, daysBetween, daypart,
  reduced, ramp, animate, E};
})();
