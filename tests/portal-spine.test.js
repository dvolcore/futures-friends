// portal-spine.js (2026-10-08): the honest-numbers and motion layer the Director Portal shares, ported from the QEP CEO Operating Spine.
// Checks, in a VM: one feed list drives every chip and sentence; absent is never zero; the five-step band (ratios are safety: anything
// under 1 is "needs you now"); figures carry their true value in the HTML (the count-up is decoration); motion respects reduced motion;
// the dashboard wiring (load order, data-sp-root, sample dates in the future, labelled sample); the Spanish table parses and translates.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

function spine({ reduced = false } = {}) {
  const doc = { hidden: false, body: null, documentElement: { getAttribute: () => null }, addEventListener() {}, querySelectorAll: () => [] };
  const w = { document: doc, matchMedia: q => ({ matches: reduced && /reduce/.test(q) }), setTimeout, clearTimeout };
  w.window = w; const c = vm.createContext(w);
  vm.runInContext(read('portal-spine.js'), c, { filename: 'portal-spine.js' });
  return c.FFSpine;
}

test('provenance: chips and sentences come from the one feed list; unknown feeds are said out loud', () => {
  const S = spine();
  const p = S.provenance(['attendance', 'staff', 'dates', 'subsidy']);
  assert.deepEqual({ ...p.counts }, { live: 0, sample: 2, stale: 0, modelled: 1, off: 1 });
  assert.equal(p.tone, 'off', 'a feed that is not connected sets the tone');
  assert.match(p.sentences.join(' '), /2 sources come from the Hub \(sample data in this demo\)\. 1 is modelled or typed by hand\. 1 is not connected, so anything that depends on it shows as absent, not estimated\./);
  const strip = S.provStrip(['attendance', 'subsidy'], { note: 'n' });
  assert.match(strip, /Where these figures come from/); assert.match(strip, /Hub sample/); assert.match(strip, /Not connected/); assert.doesNotMatch(strip, /Modelled/);
  assert.match(S.provenance(['nope']).sentences.join(' '), /not in the feed list/);
  assert.ok(S.FEEDS.every(f => f.state !== 'live'), 'the demo never claims a live feed');
  S.addFeeds([{ key: 'subsidy', state: 'stale' }, { key: 'payroll', name: 'Payroll' }]);
  assert.equal(S.feed('subsidy').state, 'stale'); assert.equal(S.feed('payroll').state, 'off', 'a new feed starts as not connected');
  const src = S.sources(); assert.match(src, /Sources/); assert.match(src, /Payroll/);
});

test('bands, bars and sparklines: absent is not zero, ratios are safety', () => {
  const S = spine();
  assert.deepEqual([1, .95, .8, .6, .2].map(a => S.band(a)), ['ok', 'near', 'watch', 'off', 'severe']);
  assert.equal(S.band(.95, { safety: true }), 'severe', 'one room out of ratio is never "near target"');
  assert.equal(S.band(null), 'none');
  assert.match(S.bar(null), /psp-absent/); assert.match(S.bar(null), /Not measured/);
  assert.match(S.bar(140, 'ok'), /width:100%/); assert.match(S.bar(40, 'off'), /40% of target/);
  assert.match(S.spark(null), /no history/); assert.match(S.spark([1, 2]), /no history/, 'two points are not a trend');
  assert.match(S.spark([80, 85, 90, 94], 'ok'), /<svg[^>]+psp-spark psp-b-ok[^]*pathLength="1"/);
  assert.match(S.count(null), /—/);
});

test('figures: the true value is in the HTML, so no JS, print and reduced motion show it', () => {
  const S = spine({ reduced: true });
  assert.match(S.count(1234, { pre: '$' }), />\$1,234<\/span>$/);
  assert.match(S.count(35), /data-sp-count="35"[^>]*>35</);
  let last = null; S.ramp(1000, p => { last = p; }); assert.equal(last, 1, 'reduced motion settles at once');
  assert.equal(S.daysBetween('2026-10-08', '2026-11-12'), 35);
  assert.equal(S.avatar(''), '<span class="psp-av psp-av-none" aria-hidden="true">—</span>');
  assert.match(S.avatar('Ms. Dana W.'), />DW</);
  assert.match(S.chip('modelled'), /Modelled/); assert.match(S.chip('whatever'), /Not connected/, 'an unknown state is never shown as measured');
});

test('motion doctrine in the CSS: settle, never loop (only the overdue pulse repeats); reduced motion and print land on the end frame', () => {
  const css = read('portal-spine.css');
  const infinite = css.match(/[^;{}]*infinite[^;}]*/g) || [];
  assert.equal(infinite.length, 1); assert.match(infinite[0], /psp-pulse/);
  assert.match(css, /@media \(prefers-reduced-motion:reduce\)\{[^}]*\.psp-dot\.is-overdue::after\{animation:none/);
  assert.match(css, /@media print\{\s*\[data-sp-reveal\]\{opacity:1 !important;transform:none !important\}/);
  const js = read('portal-spine.js');
  assert.match(js, /FAILSAFE = 2800/); assert.match(js, /RISE = 16/); assert.match(js, /cubic-bezier\(\.22,1,\.36,1\)/);
  assert.doesNotMatch(js, /setInterval/, 'no fake liveness');
});

test('the dashboard: loaded before demo-portal.js, every figure derived and labelled sample, sample dates ahead, no infant content', () => {
  const idx = read('index.html');
  assert.ok(idx.indexOf('portal-spine.js?v=') > 0 && idx.indexOf('portal-spine.js?v=') < idx.indexOf('demo-portal.js?v='));
  assert.match(idx, /portal-spine\.css\?v=\d+/); assert.match(idx, /i18n-es-7\.js\?v=\d+/);
  const s = read('demo-portal.js'), dash = s.slice(s.indexOf('function dashData'), s.indexOf('// ---------------------------------------------------------------- Director: staff'));
  assert.match(dash, /data-sp-root="dash"/); assert.match(dash, /Only you can make these/); assert.match(dash, /Measures off target/);
  assert.match(dash, /Children here now \/ enrolled/); assert.match(dash, /Rooms right now/); assert.match(dash, /What's due/);
  assert.match(dash, /img\/plush\/characters\/\$\{f\}-480\.webp/); assert.match(dash, /\['booker', 55, 92\]/, 'Booker center, in front, tallest');
  assert.doesNotMatch(dash, /infant|baby|babies|newborn/i);
  // demo-core: the sample dates are always ahead of today
  const mem = {}, ctx = { console, Promise, JSON, Date, Math, localStorage: { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } } };
  ctx.window = ctx; vm.createContext(ctx); vm.runInContext(read('demo-core.js'), ctx, { filename: 'demo-core.js' });
  const D = ctx.FFDemo; D.signIn('director'); const d = D.sampleDates(), t = D.todayIso();
  assert.ok(d.licensingVisit > t && d.nextUnit > t && d.sample === true);
});

test('Spanish: table 8 parses and translates the greeting, dates and sentences with numbers', () => {
  const ls = new Map(); const sb = { console, location: { search: '', hash: '' }, localStorage: { getItem: k => (ls.has(k) ? ls.get(k) : null), setItem: (k, v) => ls.set(k, String(v)) } };
  sb.window = sb; sb.globalThis = sb; const c = vm.createContext(sb);
  vm.runInContext(read('i18n.js'), c); vm.runInContext(read('i18n-es-8.js'), c);
  const I = c.FFi18n;
  assert.equal(I.lookup('Good morning,', 'es'), 'Buenos días,');
  assert.equal(I.lookup('Thursday, October 8', 'es'), 'jueves, 8 de octubre');
  assert.equal(I.lookup('Starts Mon, Oct 26, sample date', 'es'), 'Empieza lun., 26 de oct., fecha de ejemplo');
  assert.equal(I.lookup('Thu, Nov 12, sample date', 'es'), 'jue., 12 de nov., fecha de ejemplo');
  assert.match(I.lookup('6 sources come from the Hub (sample data in this demo).', 'es'), /^6 fuentes vienen del Hub/);
  assert.equal(I.lookup('7 of 10 measures need attention.', 'es'), '7 de 10 indicadores necesitan atención.');
});
