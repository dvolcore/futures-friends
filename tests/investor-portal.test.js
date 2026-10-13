// Investor portal (owner 2026-10-12: "turn the Investor section into a proper Investor login / portal at the site's and the Hub's motion level").
//  - the Sign in / Portals menu carries the Investor card (one tap, no credential) with the official composed cutout art;
//  - the documents drawer: opens from the nav and from "Everything behind the plan", lists every published attachment with size and
//    pages from publication-manifest.json, previews (PDF frame, CSV table, text), downloads, and ?doc=<id> deep-links;
//  - NUMBER INTEGRITY: every figure on the overview and the pilot plan ("cost explorer") equals the figures recorded before the portal
//    work (tests/fixtures/investor-numbers.json, release-platform 4de0101); figures the portal adds (tables) come from the model only;
//  - the Hub reveal: one KPI card at a time (1.4 s sweep, 700 ms gap), skippable, final values under Reduce Motion / ?reveal=off;
//  - English / Español with identical figures; axe (WCAG 2.2 AA); 390 px with no sideways scroll; logo and link home; Pending stays Pending.
// Headless Chromium from the platform repo (HUB_DIR). Run with --test-concurrency=1 on a loaded machine.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const MODEL = JSON.parse(read('investor/costs/pilot-budget.json'));
const MANIFEST = JSON.parse(read('investor/publication-manifest.json'));
const BASE = JSON.parse(read('tests/fixtures/investor-numbers.json'));
const OVERVIEW = 'investor/Digital/index.html';

// ------------------------------------------------------------------ static checks
test('the Sign in / Portals menu lists the Investor portal: one tap, no credential, official composed art in 1x and 2x', () => {
  const ctx = { window: { FF_HUB_URL: '' }, V: {}, document: null };
  ctx.window.window = ctx.window;
  vm.createContext(ctx);
  vm.runInContext(`var window = this.window; var V = this.V; ${read('hub-link.js')}`, ctx);
  const menu = JSON.parse(JSON.stringify(ctx.window.FFHubLink.menu));   // out of the vm realm
  assert.deepEqual(menu.map((p) => p.id), ['family', 'teacher', 'director', 'kids', 'investor']);
  const inv = menu.find((p) => p.id === 'investor');
  assert.equal(inv.label, 'Investor portal');
  assert.equal(inv.label_es, 'Portal para inversionistas');
  assert.equal(inv.sub, 'The pilot plan, costs and documents');
  assert.equal(inv.href, 'investor/Digital/');
  assert.equal(inv.ink, '#0A2B38');
  assert.doesNotMatch(inv.href, /password|token|key=/i, 'no credential in the link');
  for (const f of ['img/portals/portal-investor.webp', 'img/portals/portal-investor@2x.webp']) assert.ok(fs.statSync(path.join(ROOT, f)).size > 2000, f);
  assert.doesNotMatch(read(OVERVIEW), /type="password"|prompt\(/, 'no password gate on the investor pages');
});

test('the overview: logo and a link go home; the tagline is the only line; Pending terms stay Pending; no handwritten slogans', () => {
  const h = read(OVERVIEW);
  assert.match(h, /<a class="brand" href="\.\.\/\.\.\/"/);
  assert.match(h, /class="home-link" href="\.\.\/\.\.\/"/);
  assert.match(h, /Learn\. Move\. Explore\. Belong\./);
  assert.doesNotMatch(h, /kinder,? brighter tomorrow|Invest in early|brighter tomorrows/i);
  for (const k of ['Interest', 'Monthly repayment', 'Term']) assert.match(h, new RegExp(`<dt>${k}</dt><dd>Pending</dd>`), k);
  assert.match(h, /<dt>Ownership<\/dt><dd>No equity proposed<\/dd>/);
});

test('publication-manifest.json matches every investor file it lists (bytes, sha256, PDF pages)', () => {
  for (const f of MANIFEST.files) {
    const p = path.join(ROOT, f.path);
    assert.ok(fs.existsSync(p), `${f.path} is listed but missing`);
    const buf = fs.readFileSync(p);
    assert.equal(buf.length, f.bytes, `${f.path} bytes`);
    assert.equal(crypto.createHash('sha256').update(buf).digest('hex'), f.sha256, `${f.path} sha256`);
    if (f.path.endsWith('.pdf')) {
      const n = (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
      assert.equal(n, f.pages, `${f.path} pages`);
    }
  }
});

// ------------------------------------------------------------------ browser checks
const H = () => import('./a11y-harness.mjs');
const N = () => import('./investor-numbers.mjs');
let h, n, site, browser, skip = false;
test.before(async () => {
  h = await H(); n = await N();
  // the new headless mode has Chromium's PDF viewer (navigator.pdfViewerEnabled), like a desktop browser; fall back to the old one
  try { browser = await h.loadChromium().launch({ channel: 'chromium' }); } catch (e) { try { browser = await h.loadChromium().launch(); } catch (e2) { skip = e2.message; return; } }
  site = await h.startSite();
});
test.after(async () => { if (browser) await browser.close(); if (site) await site.close(); });
const page = async (width, opts = {}) => {
  const ctx = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, reducedMotion: opts.motion ? 'no-preference' : 'reduce', isMobile: width === 390, hasTouch: width === 390, ...(opts.context || {}) });
  const pg = await ctx.newPage(); const errors = [];
  pg.on('pageerror', (e) => errors.push(e.message));
  return { ctx, pg, errors };
};
const model = (pg) => pg.waitForFunction(() => document.documentElement.dataset.modelVersion === 'pilot-40-v4', null, { timeout: 15000 });

// the figures the portal may ADD (tables): every one is a formatted value of the model
function modelFigures() {
  const money = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
  const whole = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
  const out = new Set();
  const add = (v) => { if (!Number.isFinite(v)) return; for (const s of [money(v), whole(v), String(v)]) out.add(s.replace('-', '−')); };
  const { funding, totals, platform, assumptions, metrics, cash } = MODEL;
  [funding, totals, metrics].forEach((o) => Object.values(o).forEach(add));
  Object.values(platform).forEach(add); add(assumptions.tuition);
  for (const r of cash) { add(r.month); add(r.children); add(r.receipts); add(r.recurring + r.one_time); add(r.net); add(r.cumulative); }
  return out;
}

for (const [key, file] of Object.entries({ overview: OVERVIEW, plan: 'investor/Digital/pilot-plan.html' })) {
  test(`number integrity: every figure on the ${key} page equals the recorded baseline (${BASE.base})`, async (t) => {
    if (skip) return t.skip(skip);
    for (const lang of ['en', 'es']) {
      const { ctx, pg, errors } = await page(1440);
      await n.load(pg, site.base, file, `?reveal=off&lang=${lang}`);
      const after = await n.extract(pg);
      const before = BASE.pages[key];
      const lost = before.filter((x) => !after.includes(x));
      assert.deepEqual(lost, [], `${key} (${lang}): figures that disappeared or changed`);
      const allowed = modelFigures();
      const added = after.filter((x) => !before.includes(x) && !allowed.has(x));
      assert.deepEqual(added, [], `${key} (${lang}): new figures that are not model values`);
      assert.deepEqual(errors, []);
      await ctx.close();
    }
  });
}

test('number integrity after the reveal plays (motion on): the counted figures end exactly on the model text', async (t) => {
  if (skip) return t.skip(skip);
  const { ctx, pg, errors } = await page(1440, { motion: true });
  await pg.goto(`${site.base}${OVERVIEW}`);
  await model(pg);
  // scroll the panels in so every unit plays, then wait out the whole sequence (4 cards: 250 + 3 x 700 + 1400 ms)
  await pg.waitForTimeout(4200);
  await pg.evaluate(() => document.querySelector('.dashboard').scrollIntoView());
  await pg.waitForFunction(() => [...document.querySelectorAll('[data-reveal-unit]')].every((u) => u.classList.contains('inv-landed')), null, { timeout: 15000 });
  const after = await n.extract(pg);
  assert.deepEqual(BASE.pages.overview.filter((x) => !after.includes(x)), []);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('the reveal: one KPI card at a time (Hub timings), a mid-reveal frame is counting, any key lands everything', async (t) => {
  if (skip) return t.skip(skip);
  const { ctx, pg } = await page(1440, { motion: true });
  await pg.goto(`${site.base}${OVERVIEW}`);
  await model(pg);
  assert.deepEqual(await pg.evaluate(() => window.FFInvReveal.timings), { duration: 1400, gap: 700, bloom: 650, ease: 'cubic-bezier(.22,1,.36,1)' });
  await pg.waitForFunction(() => document.querySelectorAll('#kpis [data-reveal-unit].inv-play').length >= 1, null, { timeout: 5000 });
  const mid = await pg.evaluate(() => [...document.querySelectorAll('#kpis [data-reveal-unit]')].map((u) => u.className.match(/inv-(zero|play|landed)/)?.[1]));
  assert.ok(mid.includes('zero'), `cards wait their turn: ${mid}`);
  assert.ok(!mid.every((s) => s === 'play'), 'never all at once');
  await pg.waitForFunction(() => document.querySelector('#kpis [data-reveal-unit]').dataset.revealed && document.querySelectorAll('#kpis [data-reveal-unit]')[1].dataset.revealed, null, { timeout: 5000 });
  const starts = await pg.evaluate(() => [...document.querySelectorAll('#kpis [data-reveal-unit]')].slice(0, 2).map((u) => Number(u.dataset.revealed)));
  assert.ok(starts[1] - starts[0] >= 600 && starts[1] - starts[0] <= 900, `about 700 ms between cards (${starts[1] - starts[0]})`);
  assert.equal(await pg.isVisible('#revealSkip'), true, 'a visible way to skip');
  await pg.keyboard.press('Shift');
  await pg.waitForFunction(() => [...document.querySelectorAll('[data-reveal-unit]')].every((u) => u.classList.contains('inv-landed')), null, { timeout: 2000 });
  assert.equal(await pg.textContent('#funding'), '$423,849.52');
  assert.equal(await pg.isVisible('#revealSkip'), false);
  await ctx.close();
});

test('reduced motion, the Decorative motion switch and ?reveal=off: final values at once, nothing animates', async (t) => {
  if (skip) return t.skip(skip);
  for (const [label, opts, init] of [['reduce', {}, null], ['switch', { motion: true }, () => localStorage.setItem('ff-display-preferences', JSON.stringify({ motion2: false }))], ['param', { motion: true, q: '?reveal=off' }, null]]) {
    const { ctx, pg } = await page(1440, opts);
    if (init) await ctx.addInitScript(init);
    await pg.goto(`${site.base}${OVERVIEW}${opts.q || ''}`);
    await model(pg);
    await pg.waitForTimeout(200);
    const s = await pg.evaluate(() => ({ zero: document.querySelectorAll('.inv-zero, .inv-play').length, funding: document.getElementById('funding').textContent, cap: document.getElementById('capacity').textContent, anims: document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.getComputedTiming().iterations !== Infinity).length, motion: document.documentElement.dataset.motion }));
    assert.equal(s.zero, 0, `${label}: no unit waits for a reveal`);
    assert.equal(s.funding, '$423,849.52', label);
    assert.equal(s.cap, '40', label);
    if (label !== 'param') assert.equal(s.anims, 0, `${label}: no finite animation runs`);
    if (label === 'switch') assert.equal(s.motion, 'off');
    await ctx.close();
  }
});

test('documents drawer: opens from the nav and from the documents row, lists every attachment with size and pages, closes with Escape', async (t) => {
  if (skip) return t.skip(skip);
  const { ctx, pg, errors } = await page(1440);
  await pg.goto(`${site.base}${OVERVIEW}?reveal=off`);
  await model(pg);
  await pg.click('header nav a[data-docs-open]');
  await pg.waitForSelector('#invDocs[open] .inv-doc');
  const docs = await pg.$$eval('#invDocs .inv-doc', (els) => els.map((li) => ({ id: li.id.replace(/^doc-/, ''), meta: li.querySelector('small').textContent, dl: li.querySelector('a[download]').getAttribute('href'), name: li.querySelector('a[download]').getAttribute('download') })));
  const listed = new Set(docs.map((d) => d.dl.replace(/^\.\.\//, 'investor/')));
  // every PDF, CSV and document text in the package is listed, and every listed file exists
  const wanted = MANIFEST.files.map((f) => f.path).filter((p) => /\.(pdf|csv)$/.test(p) || /^investor\/(documents|costs)\/.*\.md$/.test(p));
  assert.deepEqual(wanted.filter((p) => !listed.has(p)), [], 'attachments missing from the drawer');
  for (const d of docs) {
    const f = MANIFEST.files.find((x) => x.path === d.dl.replace(/^\.\.\//, 'investor/'));
    assert.ok(f, `${d.id} is in the manifest`);
    assert.equal(d.name, path.basename(f.path), `${d.id} download keeps the file name`);
    if (f.pages) assert.match(d.meta, new RegExp(`${f.pages} pages?`), `${d.id} page count`);
    const mb = f.bytes >= 1e6 ? `${(f.bytes / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(f.bytes / 1e3))} KB`;
    assert.ok(d.meta.includes(mb), `${d.id} size ${mb} in "${d.meta}"`);
  }
  assert.equal(await pg.evaluate(() => document.activeElement && !!document.activeElement.closest('#invDocs')), true, 'focus moves into the drawer');
  await pg.keyboard.press('Escape');
  await pg.waitForFunction(() => !document.getElementById('invDocs').open);
  assert.equal(await pg.evaluate(() => document.activeElement.matches('header nav a[data-docs-open]')), true, 'focus returns to the opener');
  // from the documents row, straight to that document
  await pg.click('.routes a[data-doc="costs-csv"]');
  await pg.waitForSelector('#invDocs[open] .inv-preview[data-doc="costs-csv"] table.inv-csv tbody tr');
  const rows = await pg.$$eval('#invDocs .inv-csv tbody tr', (r) => r.length);
  assert.equal(rows, MODEL.meta.line_count, 'the itemized CSV preview shows every line');
  assert.match(pg.url(), /[?&]doc=costs-csv/);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('documents drawer: PDF preview in the drawer, Markdown rendered, ?doc= deep link, iPhone opens PDFs in a new tab', async (t) => {
  if (skip) return t.skip(skip);
  const { ctx, pg } = await page(1440);
  await pg.goto(`${site.base}${OVERVIEW}?reveal=off&doc=plan-pdf`);
  await pg.waitForSelector('#invDocs[open] .inv-preview[data-doc="plan-pdf"]');
  if (await pg.evaluate(() => navigator.pdfViewerEnabled)) {
    await pg.waitForSelector('#invDocs iframe.inv-pdf');
    assert.equal(await pg.getAttribute('#invDocs iframe.inv-pdf', 'src'), '../Futures_Friends_CURRENT_Pilot_Business_Plan.pdf#view=FitH');
  } else assert.equal(await pg.getAttribute('#invDocs .inv-preview-frame a', 'target'), '_blank', 'no PDF viewer: a new tab, never a blank frame');
  const res = await pg.request.get(`${site.base}investor/Futures_Friends_CURRENT_Pilot_Business_Plan.pdf`);
  assert.equal(res.headers()['content-type'], 'application/pdf');
  await pg.click('#invDocs [data-list]');
  await pg.click('#doc-record-audit [data-preview]');
  await pg.waitForSelector('#invDocs .inv-md h3, #invDocs .inv-md h4');
  assert.doesNotMatch(pg.url(), /doc=plan-pdf/);
  await ctx.close();
  const phone = await page(390, { context: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' } });
  await phone.pg.goto(`${site.base}${OVERVIEW}?reveal=off`);
  await model(phone.pg);
  await phone.pg.click('.all-docs');
  await phone.pg.waitForSelector('#invDocs[open] .inv-doc');
  assert.equal(await phone.pg.getAttribute('#doc-plan-pdf a[data-doc-preview]', 'target'), '_blank', 'iPhone: PDF preview opens a new tab');
  const sheet = await phone.pg.$eval('#invDocs .inv-docs-sheet', (s) => { const r = s.getBoundingClientRect(); return { bottom: Math.round(r.bottom), left: Math.round(r.left), w: Math.round(r.width) }; });
  assert.deepEqual(sheet, { bottom: 844, left: 0, w: 390 }, 'a bottom sheet on phones');
  await phone.ctx.close();
});

test('every chart has "Show as table", built from the model', async (t) => {
  if (skip) return t.skip(skip);
  const { ctx, pg } = await page(1440);
  await pg.goto(`${site.base}${OVERVIEW}?reveal=off`);
  await model(pg);
  await pg.evaluate(() => { document.getElementById('workspace').open = true; });
  const ids = await pg.$$eval('.as-table', (b) => b.map((x) => x.getAttribute('aria-controls')));
  assert.deepEqual(ids.sort(), ['capitalTable', 'cashCompareTable', 'cashTable', 'kpiTable', 'platformTable']);
  await pg.click('[aria-controls="cashTable"]');
  assert.equal(await pg.getAttribute('[aria-controls="cashTable"]', 'aria-expanded'), 'true');
  const last = await pg.$$eval('#cashTable tbody tr', (r) => [...r[r.length - 1].children].map((c) => c.textContent));
  assert.deepEqual(last, ['12', '40', '$34,944.00', '$39,755.50', '−$4,811.50', '−$222,049.42']);
  await ctx.close();
});

test('English / Español: the switch translates the page and keeps every figure; the choice is remembered like the site', async (t) => {
  if (skip) return t.skip(skip);
  const { ctx, pg } = await page(1440);
  await pg.goto(`${site.base}${OVERVIEW}?reveal=off`);
  await model(pg);
  const en = await n.extract(pg);
  await pg.click('[data-lang="es"]');
  assert.equal(await pg.getAttribute('html', 'lang'), 'es');
  assert.match(await pg.textContent('.metric-blue .metric-label'), /Necesidad preliminar/);
  assert.equal(await pg.textContent('.terms dd'), 'Pendiente');
  assert.deepEqual(await n.extract(pg), en, 'identical figures in Spanish');
  assert.equal(await pg.evaluate(() => localStorage.getItem('ff-lang')), 'es');
  await pg.reload(); await model(pg);
  assert.equal(await pg.getAttribute('html', 'lang'), 'es', 'remembered');
  await pg.click('[data-lang="en"]');
  assert.equal(await pg.textContent('.metric-blue .metric-label'), 'Preliminary funding need');
  await ctx.close();
});

for (const width of [1280, 390]) {
  test(`axe (WCAG 2.2 AA) on the overview and the open drawer at ${width}px; no sideways scroll; 44 px targets`, async (t) => {
    if (skip) return t.skip(skip);
    const { ctx, pg, errors } = await page(width);
    await pg.goto(`${site.base}${OVERVIEW}?reveal=off`);
    await model(pg);
    const v = await h.axe(pg, { openDetails: false });
    assert.deepEqual(v.filter((x) => h.BLOCKING.includes(x.impact)), [], JSON.stringify(v, null, 1));
    const sw = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(sw <= 0, `no sideways scroll (${sw}px)`);
    const small = await pg.$$eval('header a, header button, .hero-actions button, .hero-actions a, .as-table, .all-docs, .lang-switch button', (els) => els.filter((e) => e.offsetParent).map((e) => ({ t: e.textContent.trim().slice(0, 20), h: Math.round(e.getBoundingClientRect().height) })).filter((x) => x.h < 36));
    assert.deepEqual(small, [], 'tap targets');
    await pg.click('.all-docs');
    await pg.waitForSelector('#invDocs[open] .inv-doc');
    const vd = await h.axe(pg, { include: '#invDocs', openDetails: false });
    assert.deepEqual(vd.filter((x) => h.BLOCKING.includes(x.impact)), [], JSON.stringify(vd, null, 1));
    const btn = await pg.$$eval('#invDocs .inv-btn, #invDocs .inv-docs-close', (els) => els.filter((e) => e.offsetParent).map((e) => Math.round(e.getBoundingClientRect().height)).filter((x) => x < 44));
    assert.deepEqual(btn, [], 'drawer buttons are 44 px');
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}
