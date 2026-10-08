// Resource Library, demo side (owner 2026-10-07: admin and teachers see everything that was made and can send it out).
// Rules: library-core.js decides who sees and sends (generated from the Hub repo); the IP rule keeps every private curriculum file out of the
// public page: a private item shows the label "Opens in your hosted Futures Hub" and nothing that points at a file.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const H = () => import('./a11y-harness.mjs');
const BANNED = /printables\/unit-|teacher-packet|start-monday|files\/|private|curriculum-assets/i;

const ctx = { console, window: {} }; ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(read('library-catalog.js'), ctx); vm.runInContext(read('library-core.js'), ctx);
const CAT = ctx.FF_LIBRARY, CORE = ctx.FFLibraryCore;

test('the catalog loads: 11 groups, items, and the shared rules', () => {
  assert.equal(CAT.groups.length, 11);
  assert.ok(CAT.items.length > 500);
  assert.equal(typeof CORE.canSend, 'function');
});
test('teachers cannot see money or director-only items; directors can', () => {
  const fin = CAT.items.filter(i => i.financial), dir = CAT.items.filter(i => i.vis === 'director');
  assert.ok(fin.length && dir.length);
  for (const i of [...fin, ...dir]) { assert.equal(CORE.canView(i, 'teacher'), false, i.id); assert.equal(CORE.canView(i, 'director'), true, i.id); }
});
test('teachers send only family-facing items; directors send anything sendable', () => {
  for (const i of CAT.items) { if (CORE.canSend(i, 'teacher')) assert.ok(i.family_facing && !i.financial, i.id); }
  assert.ok(CAT.items.some(i => i.sendable && !i.family_facing && CORE.canSend(i, 'director') && !CORE.canSend(i, 'teacher')));
});
test('files are wired in: scripts load in order, and the demo core carries the library permission and the saved languages', () => {
  const html = read('index.html');
  const order = ['library-catalog.js', 'library-core.js', 'library-demo.js', 'demo-portal.js'].map(f => html.indexOf(`<script src="${f}?v=`));
  assert.ok(order.every(n => n > 0) && order.every((n, i) => !i || n > order[i - 1]), 'load order');
  assert.match(html, /library-demo\.css\?v=\d+/);
  const core = read('demo-core.js');
  assert.match(core, /\['library', 'Resource Library'/);
  assert.match(core, /teacher:\['hours', 'classroom', 'library'\]/);
  assert.match(core, /lang:\[.*\]\.includes\(id\) \? 'es' : 'en'/);
  assert.match(core, /'libsends','liblog'/);
});

// ---------------------------------------------------------------- in a browser
let h, site, browser;
test.before(async () => { h = await H(); site = await h.startSite(); browser = await h.loadChromium().launch(); });
test.after(async () => { await browser.close(); await site.close(); });
async function signIn(width, who) {
  const o = await h.open(browser, width); const p = o.page;
  await p.goto(`${site.base}?nogate#signin-teacher`); await p.waitForSelector(`[data-demo-signin="${who}"]`, { state: 'attached' });
  await p.evaluate(w => document.querySelector(`[data-demo-signin="${w}"]`).click(), who);
  await p.waitForFunction(() => document.querySelector('[data-ptab]')); await p.waitForTimeout(400);
  return o;
}
const openLib = async p => { await p.evaluate(() => document.querySelector('button[data-ptab="library"]').click()); await p.waitForSelector('#ffLib'); };

for (const who of ['director', 'teacher']) for (const width of [390, 1280]) {
  test(`${who} at ${width}px: tile on the home page, Library tab, 11 groups, no sideways scroll, axe clean`, async () => {
    const { ctx: c, page: p, errors } = await signIn(width, who);
    assert.ok(await p.$('.rl-hero'), 'home tile');
    await openLib(p);
    assert.equal(await p.$$eval('.rl-g', n => n.length), 11);
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0, 'no horizontal overflow');
    assert.ok(await p.$('.rl-new'), 'New this week'); assert.ok(await p.$('.rl-today'), 'Today');
    await p.evaluate(() => document.querySelector('.rl-g[data-g="family"]').click());
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
    const v = await p.evaluate(async src => { if (!window.axe) { const s = document.createElement('script'); s.textContent = src; document.head.appendChild(s); }
      const r = await window.axe.run({ include: [['#ffLib']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } });
      return r.violations.filter(x => ['serious', 'critical'].includes(x.impact)).map(x => `${x.id}: ${x.nodes.slice(0, 2).map(n => n.target.join(' ')).join(' | ')}`); },
      fs.readFileSync(path.join(ROOT, 'tests/fixtures/axe-core/axe.min.js'), 'utf8'));
    assert.deepEqual(v, []);
    assert.deepEqual(errors, []);
    await c.close();
  });
}

test('hours-only Demo Staff and Demo Family get no Library', async () => {
  for (const who of ['staff', 'family']) {
    const { ctx: c, page: p } = await h.open(browser, 1280);
    await p.goto(`${site.base}?nogate#signin-${who === 'family' ? 'family' : 'teacher'}`); await p.waitForSelector(`[data-demo-signin="${who}"]`, { state: 'attached' });
    await p.evaluate(w => document.querySelector(`[data-demo-signin="${w}"]`).click(), who); await p.waitForTimeout(1500);
    assert.equal(await p.$('[data-ptab="library"]'), null, who); assert.equal(await p.$('.rl-hero'), null, who);
    assert.equal(await p.evaluate(() => window.FFLibraryDemo.allowed()), false, who);
    await c.close();
  }
});

test('teacher: no money or director-only cards, Send only on family items; director sees them', async () => {
  const t = await signIn(1280, 'teacher'); await openLib(t.page);
  const tv = await t.page.evaluate(() => window.FFLibraryDemo.who().role); assert.equal(tv, 'teacher');
  const tCount = await t.page.$eval('.rl-stat b', e => Number(e.textContent));
  const d = await signIn(1280, 'director'); await openLib(d.page);
  const dCount = await d.page.$eval('.rl-stat b', e => Number(e.textContent));
  assert.equal(tCount, CAT.items.filter(i => CORE.canView(i, 'teacher')).length);
  assert.equal(dCount, CAT.items.length);
  assert.ok(dCount > tCount);
  // every Send button a teacher sees is on an item a teacher may send
  for (const g of CAT.groups) {
    await t.page.evaluate(k => document.querySelector(`.rl-g[data-g="${k}"]`).click(), g.key);
    const bad = await t.page.$$eval('[data-lib="send"]', (b, items) => b.filter(x => { const it = items[Number(x.dataset.i)]; return !(it.family_facing && !it.financial && it.vis !== 'director'); }).length, CAT.items.map(i => ({ family_facing: i.family_facing, financial: i.financial, vis: i.vis })));
    assert.equal(bad, 0, g.key);
  }
  await t.ctx.close(); await d.ctx.close();
});

test('IP rule: no private file URL anywhere in the rendered page, and private items carry the Hub label', async () => {
  const { ctx: c, page: p } = await signIn(1280, 'director'); await openLib(p);
  let sawLabel = 0;
  for (const g of CAT.groups) {
    await p.evaluate(k => document.querySelector(`.rl-g[data-g="${k}"]`).click(), g.key);
    await p.evaluate(() => document.querySelectorAll('[data-lib="more"]').forEach(b => b.click()));
    const hits = await p.evaluate(re => { const R = new RegExp(re, 'i'); const out = [];
      document.querySelectorAll('#ffLib *').forEach(e => { for (const a of e.attributes) { if (a.value === 'printables/sample/ff-sample-u1-day-09-teacher-packet.pdf') continue; /* the one public watermarked sample */ if ((a.name === 'href' || a.name === 'src' || a.name === 'data' || a.name.startsWith('data-') || a.name === 'poster') && R.test(a.value)) out.push(`${a.name}=${a.value}`); } });
      return out; }, BANNED.source);
    assert.deepEqual(hits.slice(0, 5), [], g.key);
    sawLabel += await p.$$eval('.rl-hub', n => n.filter(x => /Opens in your hosted Futures Hub/.test(x.textContent)).length);
  }
  assert.ok(sawLabel > 100);
  // a private card has no Preview, Download or Print
  const priv = await p.evaluate(() => [...document.querySelectorAll('.rl-card')].filter(c => c.querySelector('.rl-hub')).every(c => !c.querySelector('[data-lib="preview"],[data-lib="dl"],[data-lib="print"]')));
  assert.ok(priv);
  await c.close();
});

test('a public sample opens in the in-page dialog, Esc closes it and focus returns', async () => {
  const { ctx: c, page: p } = await signIn(1280, 'director'); await openLib(p);
  await p.evaluate(() => document.querySelector('.rl-g[data-g="family"]').click());
  const btn = p.locator('[data-lib="preview"]').first(); await btn.focus(); await p.keyboard.press('Enter');
  await p.waitForSelector('dialog.rl-dlg[open]');
  assert.ok(await p.$('dialog.rl-dlg .rl-obj, dialog.rl-dlg .rl-pimg, dialog.rl-dlg .rl-vid, dialog.rl-dlg .rl-pre'));
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  assert.equal(await p.$('dialog.rl-dlg'), null);
  assert.equal(await p.evaluate(() => document.activeElement && document.activeElement.dataset.lib), 'preview');
  await c.close();
});

test('a send queues, shows in Sent items, is logged for the director, and the email-off line is there', async () => {
  const { ctx: c, page: p } = await signIn(1280, 'director'); await openLib(p);
  await p.evaluate(() => document.querySelector('.rl-g[data-g="family"]').click());
  await p.evaluate(() => document.querySelector('[data-lib="send"]').click()); await p.waitForSelector('dialog.rl-dlg[open]');
  assert.match(await p.$eval('dialog.rl-dlg', e => e.textContent), /Sending turns on when email is connected/);
  // a Spanish-saved family gets Spanish when the item has a Spanish version, English otherwise; the choice per family is a select
  assert.ok(await p.$('dialog.rl-dlg [data-lib-lang]'));
  await p.selectOption('#rlScope', 'demo'); await p.waitForTimeout(100);
  const n = await p.$$eval('dialog.rl-dlg [data-lib-fam]:checked', x => x.length); assert.equal(n, 8);
  await p.evaluate(() => document.querySelector('[data-lib="queue"]').click()); await p.waitForTimeout(400);
  assert.equal(await p.$('dialog.rl-dlg'), null);
  assert.match(await p.$eval('.rl-q', e => e.textContent), /Queued/); assert.match(await p.$eval('.rl-q', e => e.textContent), /8 families/);
  assert.match(await p.$eval('.rl-sent', e => e.textContent), /Sending turns on when email is connected/);
  const store = await p.evaluate(() => ({ s: Object.keys(FFDemo.all('libsends')).length, l: Object.values(FFDemo.all('liblog')).map(x => x.what) }));
  assert.equal(store.s, 1); assert.ok(store.l.includes('queued a send'));
  await p.evaluate(() => document.querySelector('.rl-log summary').click());
  assert.match(await p.$eval('.rl-log', e => e.textContent), /queued a send/);
  // Demo reset clears it
  await p.evaluate(() => FFDemo.reset()); assert.equal(await p.evaluate(() => Object.keys(FFDemo.all('libsends')).length), 0);
  await c.close();
});
test('a teacher cannot queue a director-only item even if the dialog is forced open', async () => {
  const { ctx: c, page: p } = await signIn(1280, 'teacher'); await openLib(p);
  const i = CAT.items.findIndex(x => x.sendable && !CORE.canSend(x, 'teacher') && CORE.canView(x, 'teacher'));
  assert.ok(i >= 0);
  assert.equal(await p.evaluate(n => { const el = document.createElement('button'); el.dataset.lib = 'send'; el.dataset.i = n; document.querySelector('#ffLib').appendChild(el); el.click(); return !!document.querySelector('dialog.rl-dlg'); }, i), true, 'dialog may open');
  await p.evaluate(() => document.querySelector('[data-lib="queue"]') && document.querySelector('[data-lib="queue"]').click()); await p.waitForTimeout(300);
  assert.equal(await p.evaluate(() => Object.keys(FFDemo.all('libsends')).length), 0);
  await c.close();
});
