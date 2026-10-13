// Investor portal (owner 2026-10-12: "turn the Investor section into a proper Investor login / portal at the site's and the Hub's motion level").
//  - the Sign in / Portals menu carries the Investor card (one tap, no credential) with the official composed cutout art;
//  - the documents drawer: opens from the nav and from "Everything behind the plan", lists every published attachment with size and
//    pages from publication-manifest.json, previews (PDF frame, CSV table, text), downloads, and ?doc=<id> deep-links;
//  - NUMBER INTEGRITY: every figure on the overview and the pilot plan ("cost explorer") equals the figures recorded before the portal
//    work (tests/fixtures/investor-numbers.json, release-platform 4de0101); figures the portal adds (tables) come from the model only;
//  - the Hub reveal: one KPI card at a time (1.4 s sweep, 700 ms gap), skippable, final values under Reduce Motion / ?reveal=off;
//  - English / Español with identical figures; axe (WCAG 2.2 AA); 390 px with no sideways scroll; logo and link home; Pending stays Pending.
// Investor studio (owner 2026-10-12, "more motion graphics, more space"): six full-screen views behind a rail (a tab bar on phones), each
// deep-linkable; every figure the v2262 overview showed is still on the page (tests/fixtures/investor-numbers-v2262.json). The ONE intended
// change: the scenario explorer's break-even now uses the model's method (fees move with tuition), so at the planning assumptions it shows
// the model's $1,036.37 instead of $1,035.30 (fees held constant).
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
const V2262 = JSON.parse(read('tests/fixtures/investor-numbers-v2262.json')).overview;
// the one figure the Investor studio retires on purpose: the explorer's old fees-held-constant break-even
const RETIRED = ['$1,035.30'];
const VIEWS = ['overview', 'funding', 'pilot', 'scenarios', 'inside', 'documents'];
const OVERVIEW = 'investor/Digital/index.html';

// ------------------------------------------------------------------ static checks
test('the Sign in / Portals menu lists the Investor portal: one tap, no credential, official composed art in 1x and 2x', () => {
  const ctx = { window: { FF_HUB_URL: '' }, V: {}, document: null };
  ctx.window.window = ctx.window;
  vm.createContext(ctx);
  vm.runInContext(`var window = this.window; var V = this.V; ${read('hub-link.js')}`, ctx);
  const menu = JSON.parse(JSON.stringify(ctx.window.FFHubLink.menu));   // out of the vm realm
  assert.deepEqual(menu.map((p) => p.id), ['family', 'teacher', 'director', 'hq', 'kids', 'investor']);   // HQ joined in v2263
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
  assert.doesNotMatch(h, /kinder,? brighter tomorrow|Invest in early|brighter tomorrows|Children today|Kind hearts\. Kind words|stronger tomorrow|Small lessons\. Big hearts/i);
  // the old hero eyebrow was a slogan (owner: the tagline is the only line): gone in both languages
  assert.doesNotMatch(h, /world of possibility/i);
  assert.doesNotMatch(read('investor/Digital/portal-i18n.js'), /world of possibility|mundo de posibilidades/i);
  // the mockup's new claims and its search box are not taken
  assert.doesNotMatch(h, /Social-emotional learning|Safe (&amp;|&|and) supportive/i);
  assert.doesNotMatch(h, /type="search"|placeholder="Search|role="search"/i);
  for (const v of VIEWS) assert.match(h, new RegExp(`data-studio-view="${v}"`), v);
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
  for (const r of cash) { add(r.month); add(r.children); add(r.receipts); add(r.recurring + r.one_time); add(r.net); add(r.cumulative); out.add(String(r.month).padStart(2, '0')); }
  // the donut's shares of the funding estimate (each allocation / request_before_financing, one decimal)
  for (const v of [funding.peak_deficit, totals.refinance, funding.cash_floor, totals.contingency]) out.add((v / funding.request_before_financing * 100).toFixed(1) + '%');
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
      assert.deepEqual(lost, key === 'overview' ? RETIRED : [], `${key} (${lang}): figures that disappeared or changed`);
      if (key === 'overview') {
        assert.deepEqual(V2262.filter((x) => !after.includes(x)), RETIRED, `overview (${lang}): every v2262 figure is still on the page`);
        assert.ok(after.includes('$1,036.37'), 'the model break-even');
      }
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
  // visit every view through the rail and let each entrance play out (cards: 250 + (n - 1) x 700 + 1400 ms)
  for (const v of VIEWS) {
    await pg.click(`.studio-rail [data-view-link="${v}"]`);
    await pg.waitForFunction((v) => document.documentElement.dataset.view === v && [...document.querySelectorAll(`[data-studio-view="${v}"] [data-reveal-unit]`)].every((u) => u.classList.contains('inv-landed')) && !window.FFInvReveal.running(), v, { timeout: 15000 });
  }
  const after = await n.extract(pg);
  assert.deepEqual(V2262.filter((x) => !after.includes(x)), RETIRED);
  assert.deepEqual(BASE.pages.overview.filter((x) => !after.includes(x)), RETIRED);
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
  await pg.waitForFunction(() => [...document.querySelectorAll('#kpis [data-reveal-unit]')].every((u) => u.classList.contains('inv-landed')), null, { timeout: 2000 });
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
  await pg.click('.studio-top [data-docs-open]');
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
  assert.equal(await pg.evaluate(() => document.activeElement.matches('.studio-top [data-docs-open]')), true, 'focus returns to the opener');
  // from the Documents view's deck, straight to that document
  await pg.click('.studio-rail [data-view-link="documents"]');
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
  await phone.pg.click('.docs-quick');
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
  const ids = await pg.$$eval('.as-table', (b) => b.map((x) => x.getAttribute('aria-controls')));
  assert.deepEqual(ids.sort(), ['capitalTable', 'cashCompareTable', 'cashTable', 'kpiTable', 'platformTable', 'scenarioTable']);
  await pg.click('.studio-rail [data-view-link="pilot"]');
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
    for (const view of VIEWS) {
      await pg.click(`.studio-rail [data-view-link="${view}"]`);
      await pg.waitForFunction((v) => document.documentElement.dataset.view === v, view);
      await pg.waitForTimeout(150);
      const v = await h.axe(pg, { openDetails: false });
      assert.deepEqual(v.filter((x) => h.BLOCKING.includes(x.impact)), [], `${view}: ${JSON.stringify(v, null, 1)}`);
      const sw = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(sw <= 0, `${view}: no sideways scroll (${sw}px)`);
      const small = await pg.$$eval(`[data-studio-view="${view}"] :is(a, button, input, summary), .studio-rail a`, (els) => els.filter((e) => e.offsetParent && !e.closest('.sr, .cost-detail, .inv-table-wrap')).map((e) => ({ t: (e.textContent || e.id).trim().slice(0, 24), h: Math.round(e.getBoundingClientRect().height) })).filter((x) => x.h < 44));
      assert.deepEqual(small, [], `${view}: 44 px targets`);
    }
    await pg.click('.studio-rail [data-view-link="overview"]');
    const small = await pg.$$eval('header a, header button, .hero-actions button, .hero-actions a, .as-table, .all-docs, .lang-switch button', (els) => els.filter((e) => e.offsetParent).map((e) => ({ t: e.textContent.trim().slice(0, 20), h: Math.round(e.getBoundingClientRect().height) })).filter((x) => x.h < 36));
    assert.deepEqual(small, [], 'tap targets');
    await pg.click('.docs-quick');
    await pg.waitForSelector('#invDocs[open] .inv-doc');
    const vd = await h.axe(pg, { include: '#invDocs', openDetails: false });
    assert.deepEqual(vd.filter((x) => h.BLOCKING.includes(x.impact)), [], JSON.stringify(vd, null, 1));
    const btn = await pg.$$eval('#invDocs .inv-btn, #invDocs .inv-docs-close', (els) => els.filter((e) => e.offsetParent).map((e) => Math.round(e.getBoundingClientRect().height)).filter((x) => x < 44));
    assert.deepEqual(btn, [], 'drawer buttons are 44 px');
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}

// ------------------------------------------------------------------ Investor studio
const CSV = read('investor/costs/Pilot_40_Children_Monthly_Cash.csv').trim().split('\n').slice(1).map((l) => l.split(',').map(Number));
const money2 = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v).replace('-', '−');

test('studio: the published monthly cash file is the model\'s cash forecast, month by month, to the cent', () => {
  assert.equal(CSV.length, 12);
  CSV.forEach(([month, children, receipts, recurring, oneTime, net, cumulative], i) => {
    const m = MODEL.cash[i];
    assert.deepEqual([month, children], [m.month, m.children]);
    for (const [a, b] of [[receipts, m.receipts], [recurring, m.recurring], [oneTime, m.one_time], [net, m.net], [cumulative, m.cumulative]]) assert.ok(Math.abs(a - b) < 0.005, `month ${month}`);
  });
  const { funding, totals } = MODEL;
  assert.ok(Math.abs(funding.peak_deficit + totals.refinance + funding.cash_floor + totals.contingency - funding.request_before_financing) < 0.005, 'the four slices sum to the request');
});

test('studio: six full-screen views, one at a time; ?view= and #hash deep links; the rail pushes history and Back returns', async (t) => {
  if (skip) return t.skip(skip);
  const { ctx, pg, errors } = await page(1440);
  await pg.goto(`${site.base}${OVERVIEW}?reveal=off`);
  await model(pg);
  assert.deepEqual(await pg.$$eval('.studio-rail [data-view-link]', (a) => a.map((x) => x.dataset.viewLink)), VIEWS);
  for (const v of VIEWS) {
    await pg.click(`.studio-rail [data-view-link="${v}"]`);
    await pg.waitForFunction((v) => document.documentElement.dataset.view === v, v);
    const shown = await pg.$$eval('[data-studio-view]', (s) => s.filter((x) => getComputedStyle(x).display !== 'none').map((x) => x.dataset.studioView));
    assert.deepEqual(shown, [v], `only ${v} is on screen`);
    assert.equal(await pg.getAttribute(`.studio-rail [data-view-link="${v}"]`, 'aria-current'), 'page');
    assert.equal(new URL(pg.url()).searchParams.get('view'), v === 'overview' ? null : v);
  }
  await pg.goBack(); await pg.waitForFunction(() => document.documentElement.dataset.view === 'inside');
  await pg.goBack(); await pg.waitForFunction(() => document.documentElement.dataset.view === 'scenarios');
  await pg.goForward(); await pg.waitForFunction(() => document.documentElement.dataset.view === 'inside');
  await pg.goto(`${site.base}${OVERVIEW}?reveal=off#pilot`); await model(pg);
  assert.equal(await pg.evaluate(() => document.documentElement.dataset.view), 'pilot', '#pilot deep link');
  // the four KPI cards open their views; refinance lifts its slice
  for (const [card, view] of [['metric-blue', 'funding'], ['metric-green', 'inside'], ['metric-pink', 'pilot'], ['metric-gold', 'funding']]) {
    await pg.goto(`${site.base}${OVERVIEW}?reveal=off`); await model(pg);
    await pg.click(`.${card} .metric-go`);
    await pg.waitForFunction((v) => document.documentElement.dataset.view === v, view);
  }
  assert.equal(await pg.getAttribute('button[data-slice="refinance"]', 'aria-pressed'), 'true', 'refinance card: the refinance slice is lifted');
  assert.match(pg.url(), /view=funding&slice=refinance/);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('studio: the funding donut is the four model allocations; legend values and shares; select by tap and keyboard; a tooltip inside the card', async (t) => {
  if (skip) return t.skip(skip);
  const { ctx, pg, errors } = await page(1440);
  await pg.goto(`${site.base}${OVERVIEW}?reveal=off&view=funding`);
  await model(pg);
  const { funding, totals } = MODEL, total = funding.request_before_financing;
  const rows = await pg.$$eval('#allocationControls button', (b) => b.map((x) => [x.dataset.slice, x.querySelector('.lg-val').textContent, x.querySelector('.lg-share').textContent]));
  assert.deepEqual(rows, [['deficit', money2(funding.peak_deficit), '52.4%'], ['refinance', '$140,000', '33.0%'], ['floor', money2(funding.cash_floor), '9.4%'], ['contingency', money2(totals.contingency), '5.2%']]);
  assert.equal(await pg.textContent('#donutTotal'), money2(total));
  const arcs = await pg.$$eval('.donut .arc', (a) => a.map((x) => Number(x.getAttribute('stroke-dasharray').split(' ')[0])));
  const C = 2 * Math.PI * 118;
  [funding.peak_deficit, totals.refinance, funding.cash_floor, totals.contingency].forEach((v, i) => assert.ok(Math.abs(arcs[i] - (v / total * C - 3)) < 0.02, `slice ${i} is its share of the ring`));
  await pg.click('button[data-slice="floor"]');
  assert.equal(await pg.getAttribute('button[data-slice="floor"]', 'aria-pressed'), 'true');
  assert.equal(await pg.isVisible('#donutTip'), true);
  assert.match(await pg.textContent('#donutTip'), /Cash floor\$39,755\.50 · 9\.4%/);
  const inside = await pg.evaluate(() => { const c = document.querySelector('.donut-panel').getBoundingClientRect(), t = document.getElementById('donutTip').getBoundingClientRect(); return t.left >= c.left && t.right <= c.right && t.top >= c.top && t.bottom <= c.bottom; });
  assert.equal(inside, true, 'the tooltip stays inside the card');
  await pg.focus('button[data-slice="floor"]'); await pg.keyboard.press('ArrowDown');
  assert.equal(await pg.evaluate(() => document.activeElement.dataset.slice), 'contingency', 'arrow keys walk the legend');
  await pg.keyboard.press('Enter');
  assert.equal(await pg.getAttribute('button[data-slice="contingency"]', 'aria-pressed'), 'true');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('studio: the funding entrance draws the ring slice by slice while the centre counts; any key lands it on the exact total', async (t) => {
  if (skip) return t.skip(skip);
  const { ctx, pg } = await page(1440, { motion: true });
  await pg.goto(`${site.base}${OVERVIEW}?view=funding`);
  await model(pg);
  await pg.waitForFunction(() => document.querySelector('.donut-panel').classList.contains('inv-play'), null, { timeout: 3000 });
  const mid = await pg.evaluate(() => ({ anims: [...document.querySelectorAll('.donut .arc')].filter((a) => a.getAnimations().length).length, total: document.getElementById('donutTotal').textContent }));
  assert.ok(mid.anims >= 2, `slices are drawing (${mid.anims})`);
  assert.notEqual(mid.total, '$423,849.52', 'the centre is counting');
  await pg.keyboard.press('Shift');
  await pg.waitForFunction(() => document.querySelector('.donut-panel').classList.contains('inv-landed'));
  assert.equal(await pg.textContent('#donutTotal'), '$423,849.52');
  assert.equal(await pg.evaluate(() => [...document.querySelectorAll('.donut .arc')].every((a) => !a.getAnimations().length || a.getAnimations().every((x) => x.playState === 'finished'))), true);
  // ambient loops: no more than the four allowed (the friends' float and two orbit rings)
  await pg.click('.studio-rail [data-view-link="overview"]');
  await pg.waitForTimeout(700);
  const loops = await pg.evaluate(() => document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations === Infinity).length);
  assert.ok(loops <= 4, `ambient loops: ${loops}`);
  await ctx.close();
});

test('studio: the pilot year is drawn from the published CSV; scrub, chart and month card agree; "Play timeline" walks M01 to M12 once, never on load', async (t) => {
  if (skip) return t.skip(skip);
  const { ctx, pg, errors } = await page(1440, { motion: true });
  await pg.goto(`${site.base}${OVERVIEW}?view=pilot`);
  await model(pg);
  await pg.waitForFunction(() => document.getElementById('cashChart').dataset.source);
  assert.equal(await pg.getAttribute('#cashChart', 'data-source'), 'csv');
  await pg.waitForTimeout(2500);
  assert.equal(await pg.inputValue('#monthScrubber'), '1', 'no autoplay');
  assert.equal(await pg.$$eval('#gapBars .gap-bar', (b) => b.length), 12);
  await pg.fill('#monthScrubber', '5'); await pg.dispatchEvent('#monthScrubber', 'input');
  const [, children, receipts, recurring, oneTime, net, cumulative] = CSV[4];
  assert.deepEqual(await pg.evaluate(() => ['cashMonth', 'cashChildren', 'cashReceipts', 'cashSpending', 'cashNet', 'cashDeficit'].map((id) => document.getElementById(id).textContent)),
    ['05', String(children), money2(receipts), money2(recurring + oneTime), money2(net), money2(-cumulative)]);
  const fontPx = await pg.$$eval('#cashChart text', (ts) => Math.min(...ts.filter((x) => getComputedStyle(x).display !== 'none').map((x) => parseFloat(getComputedStyle(x).fontSize) * x.ownerSVGElement.getBoundingClientRect().width / x.ownerSVGElement.viewBox.baseVal.width)));
  assert.ok(fontPx >= 12, `chart labels are at least 12 px (${fontPx})`);
  // the toggles: at least one series stays on
  for (const k of ['revenue', 'expenses']) await pg.click(`[data-series="${k}"]`);
  await pg.click('[data-series="gap"]');
  assert.equal(await pg.getAttribute('[data-series="gap"]', 'aria-pressed'), 'true', 'the last series stays on');
  await pg.click('#playTimeline');
  assert.equal(await pg.getAttribute('#playTimeline', 'aria-pressed'), 'true');
  await pg.waitForFunction(() => document.getElementById('monthScrubber').value === '12' && document.getElementById('playTimeline').getAttribute('aria-pressed') === 'false', null, { timeout: 10000 });
  assert.equal(await pg.textContent('#cashDeficit'), money2(-CSV[11][6]));
  await pg.click('#playTimeline'); await pg.waitForTimeout(900); await pg.click('#playTimeline');
  const paused = await pg.inputValue('#monthScrubber'); await pg.waitForTimeout(1200);
  assert.equal(await pg.inputValue('#monthScrubber'), paused, 'pause holds the month');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('studio: scenarios use the model\'s method (the break-even fix): $1,036.37 and -$57,738.02 at the planning assumptions; live and reset', async (t) => {
  if (skip) return t.skip(skip);
  const { ctx, pg, errors } = await page(1440);
  await pg.goto(`${site.base}${OVERVIEW}?reveal=off&view=scenarios`);
  await model(pg);
  assert.match(await pg.textContent('.tag-illustrative'), /Illustrative — not a forecast/);
  const get = () => pg.evaluate(() => ({ be: document.getElementById('scenarioBreakEven').textContent, margin: document.getElementById('scenarioMarginSr').textContent, shown: document.getElementById('scenarioMargin').textContent, rev: document.getElementById('scenarioRevenue').textContent }));
  let s = await get();
  assert.equal(s.be, money2(MODEL.metrics.breakeven_tuition), 'the explorer and the overview agree on break-even');
  assert.equal(s.be, '$1,036.37');
  assert.equal(s.shown, money2(MODEL.metrics.year2_margin));
  assert.equal(s.rev, money2(MODEL.metrics.full_enrollment_receipts));
  // an independent restatement of the model (investor/tools/build_pilot_budget.py): fees per collected payment, food per child-day
  const rc = MODEL.recurring_components, a = MODEL.assumptions;
  const fees = (n, tt, c) => { const tr = n * 12 * c; return tr * (0.95 * Math.min(tt * 0.008, 5) + 0.05 * (tt * 0.029 + 0.30)) + tr * tt * 0.007; };
  const base = MODEL.totals.recurring - 40 * rc.service_days * rc.variable_per_child_day - fees(40, a.tuition, a.collection);
  assert.ok(Math.abs(base - rc.fixed_annual) < 0.05, 'the anchor is the model\'s fixed cost base');
  const margin = (n, tt, c) => n * tt * 12 * c - base - n * rc.service_days * rc.variable_per_child_day - fees(n, tt, c);
  const setRange = (id, v) => pg.$eval(id, (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, String(v));
  await setRange('#scenarioTuition', 1100); await setRange('#scenarioChildren', 30); await setRange('#scenarioCollection', 90);
  await pg.waitForTimeout(500);
  s = await get();
  assert.equal(s.shown, money2(margin(30, 1100, 0.9)), 'margin follows the model method');
  let lo = 0, hi = 5000; for (let k = 0; k < 60; k++) { const mid = (lo + hi) / 2; if (margin(30, mid, 0.9) < 0) lo = mid; else hi = mid; }
  assert.equal(s.be, money2(Math.round(hi * 100) / 100));
  assert.equal(s.margin, s.shown, 'the screen-reader value is the final value');
  await pg.click('#scenarioReset'); await pg.waitForTimeout(500);
  s = await get();
  assert.deepEqual([s.be, s.shown], ['$1,036.37', '−$57,738.02']);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('studio: inside the pilot keeps the four included items and the published curriculum concept only; documents view = deck + every file', async (t) => {
  if (skip) return t.skip(skip);
  const { ctx, pg, errors } = await page(1440);
  await pg.goto(`${site.base}${OVERVIEW}?reveal=off&view=inside`);
  await model(pg);
  assert.deepEqual(await pg.$$eval('.feature-list li', (l) => l.map((x) => x.innerText.replace(/\s+/g, ' ').trim())), ['Parent & child sign-in', 'Curriculum & learning records', 'Family communication', 'Secure hosting & support']);
  await pg.click('#curriculumOpen');
  assert.equal(await pg.evaluate(() => document.getElementById('curriculumPreview').open), true);
  assert.equal(await pg.getAttribute('#curriculumPreview img', 'src'), 'assets/curriculum-concept.webp');
  await pg.keyboard.press('Escape');
  assert.equal(await pg.evaluate(() => document.activeElement.id), 'curriculumOpen', 'focus returns');
  await pg.click('.studio-rail [data-view-link="documents"]');
  await pg.waitForFunction(() => document.querySelectorAll('#docsMore .docs-row').length > 0);
  const deck = await pg.$$eval('.routes .route', (r) => r.map((x) => ({ pv: !!x.querySelector('a[data-doc]'), dl: x.querySelector('a[download]').getAttribute('href'), meta: x.querySelector('[data-doc-meta]').textContent })));
  assert.equal(deck.length, 6);
  const listed = new Set([...deck.map((d) => d.dl), ...(await pg.$$eval('#docsMore a[download]', (a) => a.map((x) => x.getAttribute('href'))))].map((h) => h.replace(/^\.\.\//, 'investor/')));
  const wanted = MANIFEST.files.map((f) => f.path).filter((p) => /\.(pdf|csv)$/.test(p) || /^investor\/(documents|costs)\/.*\.md$/.test(p));
  assert.deepEqual(wanted.filter((p) => !listed.has(p)), [], 'every attachment is in the Documents view');
  for (const d of deck) {
    assert.ok(d.pv, 'Preview');
    const f = MANIFEST.files.find((x) => x.path === d.dl.replace(/^\.\.\//, 'investor/'));
    const mb = f.bytes >= 1e6 ? `${(f.bytes / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(f.bytes / 1e3))} KB`;
    assert.ok(d.meta.includes(mb), `${d.dl}: ${mb} in "${d.meta}"`);
  }
  await pg.click('.routes a[data-doc="plan-pdf"]');
  await pg.waitForSelector('#invDocs[open] .inv-preview[data-doc="plan-pdf"]');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('studio on a phone: the rail is a bottom tab bar of six 44 px tabs; views stack; the chart and donut answer to touch', async (t) => {
  if (skip) return t.skip(skip);
  const { ctx, pg, errors } = await page(390);
  await pg.goto(`${site.base}${OVERVIEW}?reveal=off`);
  await model(pg);
  const bar = await pg.$eval('.studio-rail', (r) => { const b = r.getBoundingClientRect(); return { bottom: Math.round(b.bottom), w: Math.round(b.width), pos: getComputedStyle(r).position }; });
  assert.deepEqual(bar, { bottom: 844, w: 390, pos: 'fixed' });
  const tabs = await pg.$$eval('.studio-rail a', (a) => a.map((x) => ({ h: x.getBoundingClientRect().height, w: x.getBoundingClientRect().width, name: x.textContent.trim() })));
  assert.equal(tabs.length, 6);
  for (const tb of tabs) assert.ok(tb.h >= 44 && tb.w >= 44, `${tb.name} is 44 px`);
  await pg.tap('.studio-rail [data-view-link="funding"]');
  await pg.waitForFunction(() => document.documentElement.dataset.view === 'funding');
  await pg.tap('button[data-slice="refinance"]');
  assert.equal(await pg.getAttribute('button[data-slice="refinance"]', 'aria-pressed'), 'true');
  await pg.tap('.studio-rail [data-view-link="pilot"]');
  await pg.waitForFunction(() => document.getElementById('cashChart').dataset.source);
  const box = await pg.$eval('#cashChart', (c) => { const b = c.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; });
  await pg.evaluate(() => document.getElementById('cashChart').scrollIntoView({ block: 'center' }));
  const b2 = await pg.$eval('#cashChart', (c) => { const b = c.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; });
  await pg.tap('#cashChart', { position: { x: b2.w * 0.62, y: b2.h * 0.4 } });
  assert.notEqual(await pg.inputValue('#monthScrubber'), '1', `a tap on the chart picks a month (${box.w}px wide)`);
  const sw = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(sw <= 0, `no sideways scroll (${sw})`);
  assert.deepEqual(errors, []);
  await ctx.close();
});
