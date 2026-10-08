// War Room, Exposure, Briefs and Cash (portal-ready.js, 2026-10-08, ported from the QEP CEO Operating Spine).
//   1. the readiness level is DERIVED from the open compliance items (never hard-coded), and moves when an item is logged;
//   2. the exposure register is built from the demo's own What's due list, staff files and care plans (no second copy of the truth);
//   3. the cash float math (payroll out weekly vs subsidy and meal money back in 30 / 45 / 60 days) is computed, and labelled modelled;
//   4. wiring: index.html loads the files with cache-busting, demo-portal.js registers the tabs, competitors are invented and say so,
//      money is directors and the owner only, nothing names an infant program.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const READY = read('portal-ready.js'), CORE = read('demo-core.js');

function load(){ const ctx = { console, Math, Date, JSON, Promise }; ctx.window = ctx; vm.createContext(ctx); vm.runInContext(READY, ctx, { filename: 'portal-ready.js' }); return ctx.FFReady; }
function demo(){
  const mem = {};
  const localStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
  const ctx = { console, Promise, JSON, Date, Math, localStorage }; ctx.window = ctx; vm.createContext(ctx); vm.runInContext(CORE, ctx, { filename: 'demo-core.js' });
  return ctx.FFDemo;
}
const due = (title, area, d, o) => Object.assign({ title, area, due: d, done: false }, o || {});
const T = '2026-10-08';

test('readiness level: calm, guarded, elevated, critical follow the open items', () => {
  const R = load();
  const lv = dues => { const ex = R.exposures({ today: T, dues, staff: {}, kids: {} }); return R.readiness(ex.items, T); };
  assert.equal(lv({}).level, 'calm');
  assert.equal(lv({ a: due('Fire drill', 'Safety', '2026-10-30') }).level, 'calm', 'due later than 7 days');
  assert.equal(lv({ a: due('Fire drill', 'Safety', '2026-10-12') }).level, 'guarded', 'due within 7 days');
  assert.equal(lv({ a: due('Fire drill', 'Safety', '2026-10-07') }).level, 'elevated', 'one item past due');
  assert.equal(lv({ a: due('A', 'Safety', '2026-10-07'), b: due('B', 'Safety', '2026-10-06') }).level, 'elevated');
  assert.equal(lv({ a: due('A', 'Safety', '2026-10-07'), b: due('B', 'Safety', '2026-10-06'), c: due('C', 'Meals', '2026-10-01') }).level, 'critical', 'three past due');
  assert.equal(lv({ a: due('A', 'Safety', '2026-09-20') }).level, 'critical', 'one item more than 10 days late');
  assert.equal(lv({ a: due('A', 'Safety', '2026-10-07', { done: true }) }).level, 'calm', 'done items never count');
  const e = lv({ a: due('Fire extinguisher monthly check', 'Safety', '2026-10-07'), b: due('Fire drill', 'Safety', '2026-10-11') });
  assert.match(e.why, /Fire extinguisher monthly check/); assert.match(e.drops, /^Guarded/); assert.match(e.rises, /^Fire extinguisher monthly check is still open on Oct 18/);
});

test('exposures: severity, evidence, owners inferred from the area, staff checks folded into the item that names them', () => {
  const R = load();
  const staff = { 's-dana': { name: 'Ms. Dana W.', role: 'Director', owner: true, bg: 'Cleared' }, 's-carmen': { name: 'Ms. Carmen L.', role: 'Cook', bg: 'Cleared' },
    's-omar': { name: 'Mr. Omar F.', role: 'Assistant teacher', bg: 'Renewal due', bgDue: '2026-10-19' }, 's-x': { name: 'Mx. New', role: 'Floater', bg: 'Pending', bgDue: '2026-10-10' } };
  const dues = { q1: due('Fire extinguisher monthly check', 'Safety', '2026-10-07'), q3: due('Submit CACFP meal counts', 'Meals', '2026-10-21'),
    q4: due('Background check renewal: Mr. Omar F.', 'Staff', '2026-10-20'), q6: due('Playground walk', 'Safety', '2026-10-05', { done: true }) };
  const ex = R.exposures({ today: T, dues, staff, kids: { k1: { alert: 'Tree nut allergy' }, k2: {} } });
  assert.deepEqual([...ex.items.map(x => x.ref)], ['EX-01', 'EX-02', 'EX-03', 'EX-04']);
  assert.equal(ex.items[0].title, 'Fire extinguisher monthly check'); assert.equal(ex.items[0].sev, 'critical'); assert.equal(ex.items[0].evidence, 'none');
  assert.equal(ex.items[1].title, 'Background check: Mx. New', 'a pending check with no due item becomes its own item'); assert.equal(ex.items[1].sev, 'high');
  const meals = ex.items.find(x => x.area === 'Meals'); assert.equal(meals.owner.name, 'Ms. Carmen L.', 'meal claims go to the cook'); assert.equal(meals.sev, 'watch');
  const omar = ex.items.find(x => x.subject === 'Mr. Omar F.'); assert.ok(omar.dueId === 'q4', 'folded into the due item, not duplicated'); assert.match(omar.detail, /cannot be counted in the ratio/);
  assert.equal(ex.items.filter(x => /Omar/.test(x.title)).length, 1);
  assert.ok(ex.items.every(x => x.status === 'Not started' && x.ownerOnFile === false), 'owners are inferred, never claimed to be on file');
  assert.deepEqual({ ...ex.documented }, { n: 4, doneDues: 1, cleared: 2, plans: 1 });
});

test('the demo seed is elevated (one item past due) and drops to guarded when it is logged on the Dashboard', () => {
  const R = load(), D = demo();
  D.signIn('director');
  const today = D.todayIso(), args = () => ({ today, dues: D.all('dues'), staff: D.all('staff'), kids: D.all('kids') });
  const a = R.readiness(R.exposures(args()).items, today);
  assert.equal(a.level, 'elevated'); assert.equal(a.crit, 1);
  const q1 = D.get('dues', 'q1'); q1.done = true; D.db.collection('dues').doc('q1').set(q1);
  const b = R.readiness(R.exposures(args()).items, today);
  assert.equal(b.level, 'guarded', 'logging the overdue item lowers the level');
});

test('cash float: computed from rates, subsidy accounts and staff; scenarios scale with days to pay', () => {
  const R = load();
  assert.equal(R.floatFor(700, 7), 700); assert.equal(R.floatFor(700, 30), 3000); assert.equal(R.floatFor(350, 45), 2250);
  const kids = { a: { room: 'prek' }, b: { room: 'prek' }, c: { room: 'twos' } };
  const accounts = { a: { subsidy: { weekly: 150 } }, b: {}, c: {} };
  const staff = { o: { role: 'Director', owner: true }, l: { role: 'Lead teacher' }, s: { role: 'Assistant teacher' }, k: { role: 'Cook' } };
  const f = R.floatModel({ kids, accounts, rates: { prek: 210, twos: 245 }, staff });
  assert.equal(f.subsidy, 150); assert.equal(f.tuition, 60 + 210 + 245); assert.equal(f.cacfp, 3 * R.MODEL.cacfpWeek); assert.equal(f.subKids, 1);
  assert.equal(f.payroll, Math.round((16 + 13.5 + 13) * 40 * 1.1), 'the owner is not on the modelled payroll');
  assert.equal(f.fixed, Math.round((2400 + 60 * 3) * 12 / 52)); assert.equal(f.weeklyOut, f.payroll + f.fixed);
  assert.deepEqual([...f.scenarios.map(s => s.days)], [30, 45, 60]);
  assert.deepEqual([...f.scenarios.map(s => s.float)], [30, 45, 60].map(d => Math.round(f.lagged * d / 7)));
  assert.ok(f.scenarios.every(s => s.plus > s.float), 'more subsidy families widen the float');
  assert.equal(f.streams.reduce((t, s) => t + s.share, 0) >= 99, true);
});

test('wiring, honesty labels and gating', () => {
  const INDEX = read('index.html'), PORTAL = read('demo-portal.js');
  assert.match(INDEX, /<link rel="stylesheet" href="portal-ready\.css\?v=\d+">/);
  assert.ok(INDEX.indexOf('portal-ready.js?v=') > INDEX.indexOf('demo-core.js') && INDEX.indexOf('portal-ready.js?v=') < INDEX.indexOf('demo-portal.js?v='));
  assert.match(PORTAL, /FFReady\.addTabs\(out, role, may\)/); assert.match(PORTAL, /FFReady\.view\(tab, c\)/); assert.match(PORTAL, /FFReady\.briefLink\(id, x\)/);
  assert.match(READY, /Invented for the demo/); assert.match(READY, /is not confirmed/); assert.match(READY, /Never answered/);
  assert.match(READY, /function cashAllowed\(c\)\{ if \(c\.role !== 'director'\) return false;.*DM\.isDirector/);
  assert.doesNotMatch(READY, /\b(infant|infants|baby|babies|newborn)\b/i);
  // invented competitors only: none of the big real brands
  assert.doesNotMatch(READY, /KinderCare|Bright Horizons|Primrose|Goddard|Learning Care|Kiddie Academy|La Petite|Childtime|Tutor Time|Head Start/i);
});

// ---------------------------------------------------------------- the real browser: every new tab at 390 and 1280, axe, no sideways scroll
const H = () => import('./a11y-harness.mjs');
for (const width of [390, 1280]) {
  test(`War Room, Exposure, Briefs and Cash at ${width}: render, axe clean, no sideways scroll, Log it lowers the level, brief ticks count`, async () => {
    const h = await H(), srv = await h.startSite(), browser = await h.loadChromium().launch();
    try {
      const { page, errors } = await h.open(browser, width);
      await h.goto(page, srv.base, 'portal', 600);
      await page.click('[data-demo-signin="director"]'); await page.waitForTimeout(600);
      for (const t of ['war', 'exposure', 'briefs', 'cash']) {
        await page.click(`[data-ptab="${t}"]`); await page.waitForTimeout(400);
        assert.ok(await page.$('#frRoot'), `${t} renders`);
        const v = (await h.axe(page, { include: '#view' })).filter(x => h.BLOCKING.includes(x.impact));
        assert.deepEqual(v, [], `${t}: axe ${JSON.stringify(v, null, 1)}`);
        const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: innerWidth }));
        assert.ok(r.sw <= r.w + 1, `${t} scrolls sideways at ${width}`);
      }
      await page.click('[data-ptab="war"]'); await page.waitForTimeout(300);
      assert.equal((await page.textContent('.fr-level-word')).trim(), 'Elevated');
      assert.match(await page.textContent('#frRoot'), /Invented for the demo/);
      await page.click('[data-ptab="exposure"]'); await page.waitForTimeout(300);
      await page.click('.fr-od [data-dm="duedone"]'); await page.waitForTimeout(500);
      await page.click('[data-ptab="war"]'); await page.waitForTimeout(300);
      assert.equal((await page.textContent('.fr-level-word')).trim(), 'Guarded', 'logging the overdue item on the register lowers the level');
      await page.click('[data-ptab="enroll"]'); await page.waitForTimeout(300);
      await page.click('.fr-brief-link'); await page.waitForTimeout(400);
      await page.click('label[for="frRun0"]'); await page.waitForTimeout(100);
      assert.match(await page.textContent('#frRunCt'), /^1 of \d+ covered/);
      await page.click('[data-ptab="cash"]'); await page.waitForTimeout(300);
      assert.match(await page.textContent('#frRoot'), /Pay goes out every Friday\.\s*The state pays you in six weeks\./);
      assert.match(await page.textContent('#frRoot'), /is not confirmed/);
      assert.deepEqual(errors, []);
    } finally { await browser.close(); await srv.close(); }
  });
}
