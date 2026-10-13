// Investor portal (owner 2026-10-12: "turn the Investor section into a proper Investor login / portal at the site's and the Hub's motion level").
//  - the Sign in / Portals menu carries the Investor card (one tap, no credential) with the official composed cutout art;
//  - the documents drawer: opens from the nav and from "Everything behind the plan", lists every published attachment with size and
//    pages from publication-manifest.json, previews (PDF frame, CSV table, text), downloads, and ?doc=<id> deep-links;
//  - NUMBER INTEGRITY: every figure on the overview and the pilot plan ("cost explorer") equals the figures recorded before the portal
//    work (tests/fixtures/investor-numbers.json, release-platform 4de0101); figures the portal adds (tables) come from the model only;
//  - the Hub reveal: one KPI card at a time (1.4 s sweep, 700 ms gap), skippable, final values under Reduce Motion / ?reveal=off;
//  - English / Español with identical figures; axe (WCAG 2.2 AA); 390 px with no sideways scroll; logo and link home; Pending stays Pending.
// Investor studio (owner 2026-10-12, "more motion graphics, more space"): six full-screen views behind a rail (a tab bar on phones), each
// deep-linkable; every figure the overview shows comes from the model (tests/fixtures/investor-numbers.json). The ONE intended
// change: the scenario explorer's break-even now uses the model's method (fees move with tuition), so at the planning assumptions it shows
// the model's own break-even instead of a fees-held-constant one.
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
// the one figure the Investor studio retires on purpose: the explorer's old fees-held-constant break-even
const RETIRED = [];   // v2274 (model v5): the baseline was re-recorded on the new model; nothing on the page is retired against it
const SHARE = (v) => (v / MODEL.funding.request_before_financing * 100).toFixed(1) + '%';
const [SH_DEF, SH_REF, SH_FLOOR, SH_CONT] = [MODEL.funding.peak_deficit, MODEL.totals.refinance, MODEL.funding.cash_floor, MODEL.totals.contingency].map((v) => (v / MODEL.funding.request_before_financing * 100).toFixed(1) + '%');
// the v4 model is archived OUTSIDE the published repo (owner: nothing old on Pages); the reproduction test runs only where it exists
const ARCHIVE_DIR = process.env.FF_V4_ARCHIVE || path.join(require('node:os').homedir(), 'Downloads/FUTURES_FRIENDS_PROJECT/99_OUTDATED_TO_REMOVE/investor_model_v4_2026-10-11');
const CAP = MODEL.assumptions.capacity;
const VIEWS = ['overview', 'funding', 'pilot', 'scenarios', 'inside', 'documents'];
const OVERVIEW = 'investor/Digital/index.html';
// v2271: the rail reads Overview · The ask · Cash flow · Payback · All costs (the cost explorer page) · Evidence; Inside the pilot is a
// view without a rail item, reached from the Evidence view (and the Platform tile)
const RAIL = ['overview', 'funding', 'pilot', 'scenarios', 'documents'];
const goView = async (pg, v) => {
  if (v === 'inside') { if (await pg.evaluate(() => document.documentElement.dataset.view) !== 'documents') await pg.click('.studio-rail [data-view-link="documents"]'); await pg.click('.view-documents .inside-link'); }
  else await pg.click(`.studio-rail [data-view-link="${v}"]`);
};
// words the owner excluded from the investor studio (mockup slogans and labels; "Pending" stays Pending)
const EXCLUDED = /repayment case|Unpriced|Illustrative|Design concept|Figures supplied|A brighter tomorrow together|Children today|Brighter tomorrows|A kinder,? brighter,? bolder world|Ideas,? People,? Places,? Potential|\bdemo\b|not audited data/i;

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
  // v2271: the loan rate and the repayment are Pending (never "Unpriced"); no equity is proposed; loan terms are not agreed
  // v2272: the loan terms stay Pending in the basis strip (the owner moved them out of the KPI row); the price test is disclosed
  assert.match(h, /<li><span>Loan terms:<\/span> <b class="strip-pending">Pending<\/b><\/li>/);
    assert.match(h, /Ages 2–5 · 38 children all day · 4 caregivers on the floor in two groups of ≤20 \(Missouri 1:10, ≤4 two-year-olds per group\)/);
  assert.match(h, /<span>Operating margin at \$210\/week<\/span>/);
  assert.match(h, /director unpaid/);
  assert.doesNotMatch(h, /Prepared on the October 11 model|40-child/);
  assert.match(h, /<li><span>No equity proposed<\/span><\/li>/);
  assert.match(h, /Loan terms not yet agreed/);
  // the excluded words, in the page and in its Spanish
  assert.doesNotMatch(h.replace(/<script[\s\S]*?<\/script>/g, ''), EXCLUDED);
  assert.doesNotMatch(read('investor/Digital/portal-i18n.js'), /Unpriced|Sin precio|Design concept|Figures supplied|A brighter tomorrow|Children today|repayment case|caso de pago aún/i);
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
const money2 = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v).replace('-', '−');
const model = (pg) => pg.waitForFunction((v) => document.documentElement.dataset.modelVersion === v, MODEL.meta.version, { timeout: 15000 });

// the itemized budget (quoted fields may hold commas), and what the Profit lab derives from it: the three cost levers and the cost groups
function itemized() {
  const text = read('investor/costs/Pilot_38_Children_Itemized.csv'), out = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) { const c = text[i]; if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; continue; } if (c === '"') q = true; else if (c === ',') { row.push(cell); cell = ''; } else if (c === '\n') { row.push(cell); out.push(row); row = []; cell = ''; } else if (c !== '\r') cell += c; }
  if (cell || row.length) { row.push(cell); out.push(row); }
  const [head, ...rows] = out; return rows.filter((r) => r.length === head.length).map((r) => Object.fromEntries(head.map((k, i) => [k, r[i]])));
}
const LAB = (() => {
  const rec = itemized().filter((r) => r.bucket === 'recurring'), c2 = (v) => Math.round(v * 100) / 100, sum = (f) => c2(rec.filter(f).reduce((a, r) => a + Number(r.annual), 0));
  const FF = ['Pilot content support', 'Curriculum and clinical review', 'Platform support', 'Platform assurance', 'Hosting and software', 'Pilot content production', 'Pilot devices'];
  const groups = [['Staff wages', 'Employer taxes', 'Staff benefits', 'Staff insurance'], ['Food and nutrition'], ['Building operations', 'Cleaning and consumables'], FF];
  const used = new Set(groups.flat()), total = rec.reduce((a, r) => a + Number(r.annual), 0);
  const parts = [...groups.map((g) => sum((r) => g.includes(r.category))), sum((r) => !used.has(r.category))];
  return { ff: sum((r) => FF.includes(r.category)), ads: c2(Number(rec.find((r) => r.item === 'Paid local advertising').annual) - 1500), parts, shares: parts.map((v) => (v / total * 100).toFixed(1) + '%') };
})();
// v2272 KPI row, computed from the model: funding ask, revenue at full enrollment, the month the ramp is full, the $1,250 price test,
// how much the monthly gap shrinks from month 1 to month 12, platform year one
function KPI_TEXT() {
  const money = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
  const whole = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
  const { funding, metrics, cash, platform, sensitivity } = MODEL, full = Math.max(...cash.map((r) => r.children));
  void sensitivity;
  const m = metrics.year2_margin;
  return [money(funding.request_before_financing), `${whole(metrics.full_enrollment_receipts)} /yr`, `Month ${cash.findIndex((r) => r.children === full) + 1}`, `${m >= 0 ? '+' : '−'}${whole(Math.round(Math.abs(m)))} /yr`, `From Month ${cash.find((r) => r.net > 0).month}`, money(platform.first_year)];
}
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
  // v2272: the price-test rows (the "Path to profit" tile) and the share by which the monthly gap shrinks
  for (const r of MODEL.sensitivity || []) { add(r.tuition); add(Math.round(r.annual_operating_margin)); }
  out.add(String(Math.round((Math.abs(cash[0].net) - Math.abs(cash[11].net)) / Math.abs(cash[0].net) * 100)));
  // v2273 Profit lab: the lever amounts and the cost groups (summed from the itemized budget) and their shares
  for (const v of [LAB.ff, LAB.ads, ...LAB.parts]) add(v);
  LAB.shares.forEach((s) => out.add(s));
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
      if (key === 'overview') assert.ok(after.includes(money2(MODEL.metrics.breakeven_tuition)), 'the model break-even');
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
    await goView(pg, v);
    await pg.waitForFunction((v) => document.documentElement.dataset.view === v && [...document.querySelectorAll(`[data-studio-view="${v}"] [data-reveal-unit]`)].every((u) => u.classList.contains('inv-landed')) && !window.FFInvReveal.running(), v, { timeout: 20000 });
  }
  const after = await n.extract(pg);
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
  assert.equal(await pg.textContent('#funding'), money2(MODEL.funding.request_before_financing));
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
    assert.equal(s.funding, money2(MODEL.funding.request_before_financing), label);
    assert.equal(s.cap, String(CAP), label);
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
  const wanted = MANIFEST.files.map((f) => f.path).filter((p) => !p.includes('/archive/') && (/\.(pdf|csv)$/.test(p) || /^investor\/(documents|costs)\/.*\.md$/.test(p)));
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
  { const r = MODEL.cash[11]; assert.deepEqual(last, [String(r.month), String(r.children), money2(r.receipts), money2(r.recurring + r.one_time), money2(r.net), money2(r.cumulative)]); }
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
  assert.match(await pg.textContent('.kpi-blue .kpi-label'), /Financiamiento total solicitado/);
  assert.equal(await pg.textContent('.strip-pending'), 'Pendiente');
  assert.deepEqual(await n.extract(pg), en, 'identical figures in Spanish');
  assert.equal(await pg.evaluate(() => localStorage.getItem('ff-lang')), 'es');
  await pg.reload(); await model(pg);
  assert.equal(await pg.getAttribute('html', 'lang'), 'es', 'remembered');
  await pg.click('[data-lang="en"]');
  assert.equal(await pg.textContent('.kpi-blue .kpi-label'), '01 / Total funding ask');
  await ctx.close();
});

for (const width of [1280, 390]) {
  test(`axe (WCAG 2.2 AA) on the overview and the open drawer at ${width}px; no sideways scroll; 44 px targets`, async (t) => {
    if (skip) return t.skip(skip);
    const { ctx, pg, errors } = await page(width);
    await pg.goto(`${site.base}${OVERVIEW}?reveal=off`);
    await model(pg);
    for (const view of VIEWS) {
      await goView(pg, view);
      await pg.waitForFunction((v) => document.documentElement.dataset.view === v, view);
      await pg.waitForTimeout(150);
      const v = await h.axe(pg, { openDetails: false });
      assert.deepEqual(v.filter((x) => h.BLOCKING.includes(x.impact)), [], `${view}: ${JSON.stringify(v, null, 1)}`);
      const sw = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(sw <= 0, `${view}: no sideways scroll (${sw}px)`);
      // 44 px everywhere, except the Overview on wider screens, which follows the owner's mockup 1:1 at WCAG 2.2 AA's 24 px minimum
      const min = view === 'overview' && width >= 768 ? 24 : 44;
      const small = await pg.$$eval(`[data-studio-view="${view}"] :is(a, button, input, summary), .studio-rail a`, (els, min) => els.filter((e) => e.offsetParent && !e.closest('.sr, .cost-detail, .inv-table-wrap, .cc-kpi-tools') && !e.matches('.lever input')).map((e) => ({ t: (e.textContent || e.id).trim().slice(0, 24), h: Math.round(e.getBoundingClientRect().height) })).filter((x) => x.h < min), min);
      assert.deepEqual(small, [], `${view}: ${min} px targets`);
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
const CSV = read('investor/costs/Pilot_38_Children_Monthly_Cash.csv').trim().split('\n').slice(1).map((l) => l.split(',').map(Number));

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
  assert.deepEqual(await pg.$$eval('.studio-rail [data-view-link]', (a) => a.map((x) => x.dataset.viewLink)), RAIL);
  assert.deepEqual(await pg.$$eval('.studio-rail a', (a) => a.map((x) => x.textContent.trim())), ['Overview', 'The ask', 'Cash flow', 'Payback', 'All costs', 'Evidence']);
  assert.equal(await pg.getAttribute('.studio-rail a.rail-out', 'href'), 'pilot-plan.html#budget', 'All costs opens the cost explorer');
  for (const v of [...RAIL, 'inside']) {
    await goView(pg, v);
    await pg.waitForFunction((v) => document.documentElement.dataset.view === v, v);
    const shown = await pg.$$eval('[data-studio-view]', (s) => s.filter((x) => getComputedStyle(x).display !== 'none').map((x) => x.dataset.studioView));
    assert.deepEqual(shown, [v], `only ${v} is on screen`);
    if (v !== 'inside') assert.equal(await pg.getAttribute(`.studio-rail [data-view-link="${v}"]`, 'aria-current'), 'page');
    else assert.equal(await pg.$$eval('.studio-rail [aria-current]', (a) => a.length), 0, 'no rail item is current on Inside the pilot');
    assert.equal(new URL(pg.url()).searchParams.get('view'), v === 'overview' ? null : v);
  }
  await pg.goBack(); await pg.waitForFunction(() => document.documentElement.dataset.view === 'documents');
  await pg.goBack(); await pg.waitForFunction(() => document.documentElement.dataset.view === 'scenarios');
  await pg.goForward(); await pg.waitForFunction(() => document.documentElement.dataset.view === 'documents');
  await pg.goto(`${site.base}${OVERVIEW}?reveal=off#pilot`); await model(pg);
  assert.equal(await pg.evaluate(() => document.documentElement.dataset.view), 'pilot', '#pilot deep link');
  // the five KPI tiles open their deep dives (the arrow, and a tap on the tile itself)
  for (const [card, view] of [['kpi-blue', 'funding'], ['kpi-gold', 'scenarios'], ['kpi-teal', 'pilot'], ['kpi-green', 'scenarios'], ['kpi-red', 'pilot'], ['kpi-purple', 'inside']]) {
    for (const target of ['.kpi-go', '.kpi-sub']) {
      await pg.goto(`${site.base}${OVERVIEW}?reveal=off`); await model(pg);
      await pg.click(`.${card} ${target}`);
      await pg.waitForFunction((v) => document.documentElement.dataset.view === v, view);
    }
  }
  // a slice deep link lifts its part of the funding ring
  await pg.goto(`${site.base}${OVERVIEW}?reveal=off&view=funding&slice=refinance`); await model(pg);
  assert.equal(await pg.getAttribute('button[data-slice="refinance"]', 'aria-pressed'), 'true', 'the refinance slice is lifted');
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
  assert.deepEqual(rows, [['deficit', money2(funding.peak_deficit), SH_DEF], ['refinance', '$140,000', SH_REF], ['floor', money2(funding.cash_floor), SH_FLOOR], ['contingency', money2(totals.contingency), SH_CONT]]);
  assert.equal(await pg.textContent('#donutTotal'), money2(total));
  const arcs = await pg.$$eval('.donut .arc', (a) => a.map((x) => Number(x.getAttribute('stroke-dasharray').split(' ')[0])));
  const C = 2 * Math.PI * 118;
  [funding.peak_deficit, totals.refinance, funding.cash_floor, totals.contingency].forEach((v, i) => assert.ok(Math.abs(arcs[i] - (v / total * C - 3)) < 0.02, `slice ${i} is its share of the ring`));
  await pg.click('button[data-slice="floor"]');
  assert.equal(await pg.getAttribute('button[data-slice="floor"]', 'aria-pressed'), 'true');
  assert.equal(await pg.isVisible('#donutTip'), true);
  assert.equal(await pg.textContent('#donutTip'), `Cash floor${money2(MODEL.funding.cash_floor)} · ${SH_FLOOR}`);
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
  assert.notEqual(mid.total, money2(MODEL.funding.request_before_financing), 'the centre is counting');
  await pg.keyboard.press('Shift');
  await pg.waitForFunction(() => document.querySelector('.donut-panel').classList.contains('inv-landed'));
  assert.equal(await pg.textContent('#donutTotal'), money2(MODEL.funding.request_before_financing));
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

test('studio: scenarios use the model\'s method: the model\'s break-even and margin at the planning assumptions; live and reset', async (t) => {
  if (skip) return t.skip(skip);
  const { ctx, pg, errors } = await page(1440);
  await pg.goto(`${site.base}${OVERVIEW}?reveal=off&view=scenarios`);
  await model(pg);
  assert.match(await pg.textContent('.tag-scenario'), /Scenario — not a forecast/);
  const get = () => pg.evaluate(() => ({ be: document.getElementById('scenarioBreakEven').textContent, margin: document.getElementById('scenarioMarginSr').textContent, shown: document.getElementById('scenarioMargin').textContent, rev: document.getElementById('scenarioRevenue').textContent }));
  let s = await get();
  assert.equal(s.be, money2(MODEL.metrics.breakeven_tuition), 'the explorer and the overview agree on break-even');
  assert.equal(s.shown, money2(MODEL.metrics.year2_margin));
  assert.equal(s.rev, money2(MODEL.metrics.full_enrollment_receipts));
  // an independent restatement of the model (investor/tools/build_pilot_budget.py): fees per collected payment, food per child-day
  const rc = MODEL.recurring_components, a = MODEL.assumptions;
  const fees = (n, tt, c) => { const tr = n * 12 * c; return tr * (0.95 * Math.min(tt * 0.008, 5) + 0.05 * (tt * 0.029 + 0.30)) + tr * tt * 0.007; };
  // v5.1: food follows the per-child-day model up to the owner's cap (recurring_components.food_cap_annual, $2,000/month)
  const food = (n) => Math.min(rc.food_fixed_annual + n * rc.service_days * rc.variable_per_child_day, rc.food_cap_annual);
  assert.equal(rc.food_cap_annual, 24000);
  const base = MODEL.totals.recurring - food(CAP) - fees(CAP, a.tuition, a.collection);
  assert.ok(Math.abs(base - rc.fixed_annual) < 0.05, 'the anchor is the model\'s fixed cost base');
  const margin = (n, tt, c) => n * tt * 12 * c - base - food(n) - fees(n, tt, c);
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
  assert.deepEqual([s.be, s.shown], [money2(MODEL.metrics.breakeven_tuition), money2(MODEL.metrics.year2_margin)]);
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
  const wanted = MANIFEST.files.map((f) => f.path).filter((p) => !p.includes('/archive/') && (/\.(pdf|csv)$/.test(p) || /^investor\/(documents|costs)\/.*\.md$/.test(p)));
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


// ------------------------------------------------------------------ Overview: the Capital command center (v2271, owner 2026-10-13: his own
// mockup, "use the exact layout that I gave you"): title row, the gold-framed meeting banner, five KPI tiles, the basis strip, "Where your
// capital goes" beside the "Cash flow & scenario lab", the documents dock and the footer line. Every figure from the model or the published
// monthly cash file; every tile and panel opens its deep dive; counts / draws / walks with motion on, never with motion off.
const OV_SLOGANS = /kinder,? brighter|A kinder|Invest in early|brighter tomorrow|Children today|Kind hearts\. Kind words|stronger tomorrow|Small lessons|Big hearts|world of possibility|Ideas,? People,? Places/i;
const overviewSection = () => { const h = read(OVERVIEW); const a = h.indexOf('data-studio-view="overview"'); return h.slice(a, h.indexOf('<section class="studio-view', a + 10)); };

test('overview: the mockup\'s modules in its order; no slogans, no demo / concept / illustrative labels; EN + ES for its text', () => {
  const sec = overviewSection();
  const order = ['class="cap-hero"', 'id="ccScene"', 'class="cap-head"', 'id="kpis"', 'class="cap-strip"', 'ovd-funding', 'ovd-year', 'ovd-docs', 'class="cap-foot"'].map((k) => sec.indexOf(k));
  assert.ok(order.every((i) => i > 0), `all modules are on the Overview: ${order}`);
  assert.deepEqual([...order].sort((a, b) => a - b), order, 'the hero (picture + title over it), KPIs, strip, capital, cash-flow lab, documents, footer');
  assert.match(sec, /<div class="cap-hero">\n<figure class="cap-banner" id="ccScene"[\s\S]*?<\/figure>\n<header class="cap-head">[\s\S]*?<\/header>\n<\/div>/, 'the title sits inside the hero, over the picture');
  assert.match(sec, /<h1 id="hero-title" tabindex="-1">Capital command center<\/h1><p class="cap-tag">Small beginnings\. Big futures\.<\/p>/);
  assert.match(sec, /One location\. 38 children\. One year\./);
  // the KPI tiles: five, numbered, in the mockup's order
  assert.deepEqual([...sec.matchAll(/<p class="kpi-label"><span class="kpi-n">(\d+)<\/span> \/ <span>([^<]+)<\/span>/g)].map((m) => `${m[1]} ${m[2]}`),
    ['01 Total funding ask', '02 Revenue at full enrollment', '03 Full enrollment', '04 Operating margin at $210/week', '05 Cash-positive months', '06 Platform · year one']);
  // v2273 (owner: "I don't see any graphics, widgets, charts, sliders"): the sliders live in the Profit lab, nowhere else on the Overview
  assert.equal((sec.match(/type="range"/g) || []).length, 3);
  assert.ok(sec.indexOf('type="range"') > sec.indexOf('id="profitLab"'), 'the sliders are in the Profit lab');
  assert.doesNotMatch(sec, /repayment case|strip-warn/);
  for (const src of [read(OVERVIEW), read('investor/Digital/portal-i18n.js'), read('investor/Digital/studio.js'), read('investor/Digital/studio-overview.css')]) assert.doesNotMatch(src, OV_SLOGANS);
  const words = sec.replace(/\s(src|href|class|id|data-[\w-]+|style|width|height|viewBox|d|fill|stroke[\w-]*|loading)="[^"]*"/g, '').replace(/<[^>]+>/g, ' ');
  assert.doesNotMatch(words, /\b(demo|concept|illustrative|test|unpriced)\b/i);
  assert.doesNotMatch(words, EXCLUDED);
  // every English line of the Overview and the rail has its Spanish
  const ctx = { window: {}, document: { documentElement: { lang: 'es', dataset: {} }, readyState: 'complete', querySelectorAll: () => [], title: '' }, localStorage: { getItem: () => 'es', setItem() {} }, location: { search: '' }, NodeFilter: { SHOW_TEXT: 4 } };
  ctx.document.createTreeWalker = () => ({ nextNode: () => null }); ctx.document.body = { querySelectorAll: () => [] }; ctx.window.window = ctx.window;
  vm.createContext(ctx); vm.runInContext(`var window = this.window, document = this.document, localStorage = this.localStorage, location = this.location, NodeFilter = this.NodeFilter; ${read('investor/Digital/portal-i18n.js')}`, ctx);
  const I = ctx.window.FFInvI18n;
  const h = read(OVERVIEW), rail = h.slice(h.indexOf('<header class="header studio-top"'), h.indexOf('<main'));
  for (const src of [sec, rail]) {
    const texts = [...src.matchAll(/>([^<>]*[A-Za-z][^<>]*)</g)].map((m) => m[1].replace(/&amp;/g, '&').trim()).filter((x) => x && !/^[−$\d.,%\s/·]+$/.test(x) && !/^(Futures Friends|English|Español)$/.test(x));
    const attrs = [...src.matchAll(/\s(?:aria-label|alt)="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&')).filter((x) => x !== 'Futures Friends');
    assert.deepEqual([...new Set([...texts, ...attrs])].filter((x) => I.t(x) === x), [], 'Spanish for every Overview line');
  }
  assert.equal(I.t('Month 07 snapshot'), 'Resumen del mes 07');
});

test('overview: every figure is the model\'s (KPI tiles, basis strip, capital donut, cash-flow lab); Pending twice', async (t) => {
  if (skip) return t.skip(skip);
  const { ctx, pg, errors } = await page(1440);
  await pg.goto(`${site.base}${OVERVIEW}?reveal=off`);
  await model(pg);
  const { funding, totals, platform, assumptions, metrics } = MODEL, total = funding.request_before_financing;
  const whole = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
  const txt = (ids) => pg.evaluate((ids) => ids.map((id) => document.getElementById(id).textContent), ids);
  // the KPI tiles
  // v2272 (owner: "key information at a first glance"): six tiles, each computed here from pilot-budget.json
  assert.deepEqual(await pg.$$eval('#kpis .kpi-v', (e) => e.map((x) => x.textContent.replace(/\s+/g, ' ').trim())), KPI_TEXT());
  assert.deepEqual(KPI_TEXT(), ['$295,254.96', '$398,362 /yr', 'Month 4', '+$112,354 /yr', `From Month ${MODEL.cash.find((r) => r.net > 0).month}`, '$95,852.20']);
  assert.deepEqual(await txt(['kpiGapFirst']), [money2(MODEL.cash[0].net)]);
  assert.deepEqual(await txt(['kpiGapLast']), ['+' + money2(MODEL.cash[11].net)]);
  assert.deepEqual(await txt([ 'kpiRampFrom', 'kpiRampTo', 'kpiRevTuition', 'kpiRevColl']), [String(MODEL.cash[0].children), String(CAP), whole(assumptions.tuition), '96%']);
  assert.ok(await pg.$eval('#kpiRamp path', (p) => p.getAttribute('d').split('V').length - 1 === 11), 'the ramp is a twelve-month step line');
  assert.equal(await pg.textContent('#kpiRefi'), whole(totals.refinance));
  assert.equal(await pg.textContent('#kpiRefi'), '$140,000');
  // the basis strip
  assert.deepEqual(await txt(['capacity', 'pilotDuration', 'collections']), [String(Math.max(...MODEL.cash.map((r) => r.children))), String(MODEL.cash.length), Math.round(assumptions.collection * 100) + '%']);
  assert.deepEqual(await txt(['capacity', 'pilotDuration', 'collections']), ['38', '12', '96%']);
  assert.equal(await pg.$('.strip-warn'), null, 'the warning pill is gone (owner: "useless information")');
  assert.equal(await pg.textContent('.strip-pending'), 'Pending');
  // the capital donut: the four model allocations (values and shares for readers), the ring geometry, the selected part in the centre
  assert.deepEqual(await pg.$$eval('#ovLegend button', (b) => b.map((x) => [x.dataset.ovSlice, x.querySelector('.lg-name').textContent, x.querySelector('.lg-val').textContent, x.querySelector('.lg-share').textContent])),
    [['deficit', 'Pilot deficit', money2(funding.peak_deficit), SH_DEF], ['refinance', 'Refinance', whole(totals.refinance), SH_REF], ['floor', 'Cash floor', money2(funding.cash_floor), SH_FLOOR], ['contingency', 'Contingency', money2(totals.contingency), SH_CONT]]);
  const arcs = await pg.$$eval('#ovArcs .arc', (a) => a.map((x) => Number(x.getAttribute('stroke-dasharray').split(' ')[0])));
  const C = 2 * Math.PI * 118;
  [funding.peak_deficit, totals.refinance, funding.cash_floor, totals.contingency].forEach((v, i) => assert.ok(Math.abs(arcs[i] - (v / total * C - 3)) < 0.02, `slice ${i}`));
  assert.deepEqual(await txt(['ovDonutPct', 'ovHlLabel', 'ovHlValue']), [SH_DEF, 'Peak pilot cash deficit', money2(funding.peak_deficit)]);
  // a part picked from the list: the centre, the headline and the ring follow
  await pg.click('#ovLegend [data-ov-slice="refinance"]');
  assert.equal(await pg.getAttribute('#ovLegend [data-ov-slice="refinance"]', 'aria-pressed'), 'true');
  assert.deepEqual(await txt(['ovDonutPct', 'ovHlLabel', 'ovHlValue']), [SH_REF, 'Refinance-enabling allocation', '$140,000']);
  assert.equal(await pg.evaluate(() => document.querySelector('#ovArcs .slice[data-slice="refinance"]').classList.contains('on')), true);
  await pg.click('#ovLegend [data-ov-slice="floor"]');
  assert.deepEqual(await txt(['ovDonutPct', 'ovHlValue']), [SH_FLOOR, money2(funding.cash_floor)]);
  await pg.click('#ovLegend [data-ov-slice="floor"]');
  assert.deepEqual(await txt(['ovDonutPct', 'ovHlValue']), [SH_DEF, money2(MODEL.funding.peak_deficit)], 'unpicked: back to the pilot deficit');
  // the cash-flow lab: the published monthly cash file; the snapshot follows the chart (arrow keys, as hover and taps do)
  await pg.waitForFunction(() => document.getElementById('ovChart').dataset.source);
  assert.equal(await pg.getAttribute('#ovChart', 'data-source'), 'csv');
  const snap = () => txt(['ovMonthLabel', 'ovChildrenM', 'ovReceipts', 'ovSpending', 'ovNet']);
  const row = (m) => { const [, children, receipts, recurring, oneTime, net] = CSV[m - 1]; return [`Month ${String(m).padStart(2, '0')} snapshot`, String(children), money2(receipts), money2(recurring + oneTime), money2(net)]; };
  assert.deepEqual(await snap(), row(1));
  assert.deepEqual(await snap(), ['Month 01 snapshot', '30', '$26,208.00', '$87,887.60', '−$61,679.60']);
  await pg.focus('#ovChart'); await pg.keyboard.press('End');
  assert.deepEqual(await snap(), row(12));
  for (let i = 0; i < 5; i++) await pg.keyboard.press('ArrowLeft');
  assert.deepEqual(await snap(), row(7));
  const box = await pg.$eval('#ovChart', (c) => { const b = c.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; });
  await pg.mouse.move(box.x + box.w * 0.97, box.y + box.h * 0.5);
  assert.deepEqual(await snap(), row(12), 'hover picks the month');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('overview: every panel and tile opens its deep dive; the documents dock opens each document in the drawer', async (t) => {
  if (skip) return t.skip(skip);
  const { ctx, pg, errors } = await page(1440);
  for (const [card, view] of [['ovd-funding', 'funding'], ['ovd-year', 'pilot']]) {
    await pg.goto(`${site.base}${OVERVIEW}?reveal=off`); await model(pg);
    await pg.click(`.${card} .panel-title p`);   // the panel itself, not one of its controls
    await pg.waitForFunction((v) => document.documentElement.dataset.view === v, view, { timeout: 4000 });
    await pg.goBack(); await pg.waitForFunction(() => document.documentElement.dataset.view === 'overview');
    await pg.click(`.${card} .ovd-go[data-view-link]`); await pg.waitForFunction((v) => document.documentElement.dataset.view === v, view);
  }
  await pg.goto(`${site.base}${OVERVIEW}?reveal=off`); await model(pg);
  assert.deepEqual(await pg.$$eval('.cap-doc', (a) => a.map((x) => [x.dataset.doc, x.querySelector('strong').textContent])),
    [['plan-pdf', 'Business plan'], ['one-sheet-pdf', 'One-sheet'], ['costs-csv', 'Every cost'], ['cash-csv', 'Cash forecast'], ['bible-pdf', 'Production Bible'], ['operations-pdf', 'Evidence & merchandise']]);
  await pg.click('.cap-doc[data-doc="cash-csv"]');
  await pg.waitForSelector('#invDocs[open] .inv-preview[data-doc="cash-csv"] table.inv-csv tbody tr');
  assert.equal(await pg.$$eval('#invDocs .inv-csv tbody tr', (r) => r.length), 12);
  await pg.keyboard.press('Escape'); await pg.waitForFunction(() => !document.getElementById('invDocs').open);
  await pg.click('.cap-docs-head p'); await pg.waitForSelector('#invDocs[open] .inv-doc');
  await pg.keyboard.press('Escape'); await pg.waitForFunction(() => !document.getElementById('invDocs').open);
  // the Platform tile and the Evidence view lead to Inside the pilot
  await pg.click('.kpi-purple .kpi-go'); await pg.waitForFunction(() => document.documentElement.dataset.view === 'inside');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('overview motion: tiles count one at a time, panels rise, the donut draws, the chart draws then walks the year once; reduced motion = all final', async (t) => {
  if (skip) return t.skip(skip);
  const { ctx, pg, errors } = await page(1440, { motion: true });
  await pg.goto(`${site.base}${OVERVIEW}`);
  await model(pg);
  await pg.waitForFunction(() => [...document.querySelectorAll('#ovArcs .arc')].some((a) => a.getAnimations().length) || document.getElementById('ovHlValue').classList.contains('inv-counting'), null, { timeout: 8000 });
  const delays = await pg.evaluate(() => ['.ovd-funding', '.ovd-year'].map((s) => document.querySelector(s).style.getPropertyValue('--ovd-delay')));
  assert.equal(new Set(delays).size, 2, `the panels rise one after another (${delays})`);
  await pg.waitForFunction(() => document.getElementById('ovChart').dataset.playing === 'true', null, { timeout: 8000 });
  await pg.waitForFunction(() => document.getElementById('ovMonthLabel').textContent === 'Month 12 snapshot' && document.getElementById('ovChart').dataset.playing === 'false', null, { timeout: 15000 });
  assert.equal(await pg.textContent('#ovNet'), money2(CSV[11][5]), 'the walk ends on month 12');
  await pg.waitForFunction(() => !document.querySelector('.inv-counting') && !window.FFInvReveal.running(), null, { timeout: 10000 });
  assert.deepEqual(await pg.$$eval('#kpis .kpi-v', (e) => e.map((x) => x.textContent.replace(/\s+/g, ' ').trim())), KPI_TEXT(), 'the counts land on the model text');
  assert.equal(await pg.textContent('#ovHlValue'), money2(MODEL.funding.peak_deficit));
  const loops = await pg.evaluate(() => document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations === Infinity).length);
  assert.ok(loops >= 1 && loops <= 4, `ambient loops: ${loops}`);
  // Pause motion: everything stops and stays final
  await pg.click('#motionToggle'); await pg.waitForTimeout(200);
  assert.equal(await pg.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length), 0, 'paused: nothing runs');
  assert.deepEqual(errors, []);
  await ctx.close();
  // reduced motion: nothing waits, counts or runs; the chart does not walk
  const r = await page(1440);
  await r.pg.goto(`${site.base}${OVERVIEW}`); await model(r.pg); await r.pg.waitForTimeout(1500);
  const s = await r.pg.evaluate(() => ({ armed: document.documentElement.classList.contains('ovd-armed'), hidden: [...document.querySelectorAll('.ovd-card')].filter((c) => getComputedStyle(c).opacity !== '1').length, counting: document.querySelectorAll('.inv-counting').length, anims: document.getAnimations().filter((a) => a.playState === 'running').length, total: document.getElementById('funding').textContent, month: document.getElementById('ovMonthLabel').textContent }));
  assert.deepEqual(s, { armed: false, hidden: 0, counting: 0, anims: 0, total: money2(MODEL.funding.request_before_financing), month: 'Month 01 snapshot' });
  await r.ctx.close();
});

test('overview in Spanish: translated, the figures identical, no English left on the panels', async (t) => {
  if (skip) return t.skip(skip);
  const { ctx, pg } = await page(1440);
  await pg.goto(`${site.base}${OVERVIEW}?reveal=off`); await model(pg);
  const grab = () => pg.evaluate(() => {
    const out = [];
    for (const root of [document.getElementById('cc')]) { const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); for (let n = w.nextNode(); n; n = w.nextNode()) if (!n.parentElement.closest('[data-inv-docs], svg, .cc-kpi-tools') && /[A-Za-z]{3,}/.test(n.nodeValue)) out.push(n.nodeValue.trim()); }
    return out;
  });
  const en = await grab(), figs = await n.extract(pg);
  await pg.click('[data-lang="es"]');
  const es = await grab();
  const same = en.filter((x, i) => x === es[i] && !/^(Futures Friends|PDF|CSV|Contingency)$/.test(x));
  assert.deepEqual(same, [], 'no English left on the Overview');
  assert.deepEqual(await n.extract(pg), figs, 'identical figures');
  assert.equal(await pg.textContent('.ovd-funding h2'), 'A dónde va su capital');
  assert.equal(await pg.textContent('#hero-title'), 'Centro de mando del capital');
  assert.equal(await pg.textContent('#ovMonthLabel'), 'Resumen del mes 01');
  assert.doesNotMatch(await pg.evaluate(() => document.body.innerText), EXCLUDED);
  await ctx.close();
});

test('capital command center at 1280 x 853 and 1440 x 900: the hero across the top; tiles, strip, two panels, the Profit lab, dock, footer, with room to breathe', async (t) => {
  if (skip) return t.skip(skip);
  for (const [W, H] of [[1280, 853], [1440, 900]]) {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, reducedMotion: 'reduce' }); const pg = await ctx.newPage(); const errors = []; pg.on('pageerror', (x) => errors.push(x.message));
    await pg.goto(`${site.base}${OVERVIEW}?reveal=off`); await model(pg); await pg.waitForTimeout(500);
    const r = await pg.evaluate(() => Object.fromEntries(['.studio-top', '.studio-rail', '.cap-hero', '.cap-head', '#kpis', '.cap-strip', '.ovd-funding', '.ovd-year', '#profitLab', '.ovd-docs', '.cap-foot', '.studio-top .brand', '.studio-top .lang-switch', '.rail-tag'].map((s) => { const b = document.querySelector(s).getBoundingClientRect(); return [s, { t: Math.round(b.top + scrollY), b: Math.round(b.bottom + scrollY), l: Math.round(b.left), r: Math.round(b.right), w: Math.round(b.width), h: Math.round(b.height) }]; })));
    // the rail: a green column on the left, logo on top, the views, then English | Español and the tagline at the bottom
    assert.ok(r['.studio-top'].l === 0 && r['.studio-top'].w >= 120 && r['.studio-top'].w <= 160 && r['.studio-top'].h === H, JSON.stringify(r['.studio-top']));
    assert.ok(r['.studio-top .brand'].t < r['.studio-rail'].t && r['.studio-rail'].b < r['.studio-top .lang-switch'].t && r['.studio-top .lang-switch'].b <= r['.rail-tag'].t, 'logo, views, language, tagline');
    // the hero: from the rail's edge to the window's edge, from the very top; the title over it
    const hero = r['.cap-hero'];
    assert.ok(hero.t === 0 && Math.abs(hero.l - r['.studio-top'].r) <= 1 && hero.r === W, `full bleed: ${JSON.stringify(hero)}`);
    assert.ok(r['.cap-head'].t >= hero.t && r['.cap-head'].b <= hero.b && r['.cap-head'].l > hero.l, 'the title over the picture');
    for (const s of ['#kpis', '.cap-strip', '.ovd-docs']) assert.ok(Math.abs(r[s].l - r['#kpis'].l) <= 2 && Math.abs(r[s].r - r['#kpis'].r) <= 2, `${s} spans the content width`);
    assert.ok(r['#kpis'].t >= hero.b - 30, 'the tiles start below the picture (at most a touch of the floor under the fade)');
    // v2273 (owner: "we have plenty of room at the bottom ... let's get the spacing right"): the page scrolls; the blocks breathe
    const gaps = [['#kpis', '.cap-strip'], ['.cap-strip', '.ovd-funding'], ['.ovd-funding', '#profitLab'], ['#profitLab', '.ovd-docs']].map(([a, b]) => r[b].t - r[a].b);
    assert.ok(gaps.every((g) => g >= 12), `at least 12 px between the blocks: ${gaps}`);
    assert.ok(r['.ovd-year'].b <= r['#profitLab'].t && r['#profitLab'].b <= r['.ovd-docs'].t && r['#profitLab'].w === r['#kpis'].w, 'the Profit lab spans the width under the two panels');
    // nothing in a tile spills out of it
    const spill = await pg.$$eval('#kpis .kpi', (ks) => ks.flatMap((k) => { const b = k.getBoundingClientRect(); return [...k.querySelectorAll('*')].filter((e) => { const x = e.getBoundingClientRect(); return x.height && (x.bottom > b.bottom + 0.5 || x.right > b.right + 0.5); }).map((e) => `${k.className}: ${e.className.baseVal ?? e.className}`); }));
    assert.deepEqual(spill, [], 'every tile holds its text and charts');
    assert.equal(new Set(await pg.$$eval('#kpis .kpi', (k) => k.map((x) => Math.round(x.getBoundingClientRect().top)))).size, 1, 'six tiles in one row');
    assert.equal(await pg.$$eval('#kpis .kpi', (k) => k.length), 6);
    assert.equal(r['.ovd-funding'].t, r['.ovd-year'].t, 'the two panels side by side');
    assert.ok(r['.ovd-funding'].w < r['.ovd-year'].w && r['.ovd-funding'].r < r['.ovd-year'].l, 'capital on the left (narrower), the lab on the right');
    assert.ok(Math.max(r['.ovd-funding'].b, r['.ovd-year'].b) <= r['.ovd-docs'].t && r['.ovd-docs'].b <= r['.cap-foot'].t, 'the dock under both, then the footer');
    assert.equal(await pg.$$eval('.cap-doc', (d) => new Set(d.map((x) => Math.round(x.getBoundingClientRect().top))).size), 1, 'six document tiles in one row');
    // nothing in a panel is cut off by its fixed height
    const clipped = await pg.$$eval('.ovd-funding .cap-legend button, .ovd-year .cap-snap dl', (els) => els.filter((e) => { const p = e.closest('.ovd-card').getBoundingClientRect(), b = e.getBoundingClientRect(); return b.bottom > p.bottom + 0.5; }).length);
    assert.equal(clipped, 0, 'every legend row and the month snapshot sit inside their panels');
    // the picture's palette (data-theme="scene": moss from the flowers' leaves), a different colour per tile
    assert.equal(await pg.getAttribute('html', 'data-theme'), 'scene');
    assert.match(await pg.evaluate(() => getComputedStyle(document.body).backgroundColor), /rgb\(78, 94, 47\)/);
    assert.equal(new Set(await pg.$$eval('#kpis .kpi', (k) => k.map((x) => getComputedStyle(x).borderTopColor))).size, 6, 'a colour per tile');
    assert.ok(await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) <= 0, 'no sideways scroll');
    assert.deepEqual(errors, []);
    await ctx.close();
  }
});

test('the hero never crops a character and no title covers a face: full width, no side blur, one constant picks the art; phones show the whole picture', async (t) => {
  const h = read(OVERVIEW), js = read('investor/Digital/studio.js'), css = read('investor/Digital/studio-overview.css');
  assert.equal((h.match(/data-scene="/g) || []).length, 1, 'one constant: data-scene on the picture');
  assert.match(h, /<figure class="cap-banner" id="ccScene" data-scene="cast-2" aria-hidden="true"><div class="cap-banner-art"><img id="ccSceneImg" alt="" width="2400" height="1029" fetchpriority="high"><\/div><\/figure>/);
  assert.doesNotMatch(h, /investor-meeting/, 'the file is named once, in the scene table');
  assert.match(js, /'cast-2': \{ file: 'investor-meeting-cast-2', band: \[0\.19, 0\.72\], show: 0\.84 \}/);
  assert.match(css, /\.cap-hero \.cap-banner-art::before\{display:none\}/, 'no blurred side copy');
  for (const f of ['investor-meeting-cast-2', 'investor-meeting-cast-1', 'investor-meeting-glam-1', 'investor-meeting-glam-2', 'investor-meeting-wide-1', 'investor-meeting-wide-2']) for (const v of ['', '-1200']) { const st = fs.statSync(path.join(ROOT, `investor/Digital/assets/${f}${v}.webp`)); assert.ok(st.size > 20000 && st.size < 480000, `${f}${v}.webp is ${st.size} bytes`); }
  if (skip) return t.skip(skip);
  // the band every character occupies, in fractions of the picture's height (top of the highest ear .. the lowest chin): measured on the files
  const BAND = { 'cast-2': [0.19, 0.72], 'cast-1': [0.155, 0.72], 'glam-1': [0.165, 0.585] };
  const seen = (pg) => pg.evaluate(() => {
    const hero = document.querySelector('.cap-hero').getBoundingClientRect(), art = document.querySelector('.cap-banner-art'), a = art.getBoundingClientRect(), i = document.getElementById('ccSceneImg'), b = i.getBoundingClientRect(), head = document.querySelector('.cap-head').getBoundingClientRect();
    return { hero: [hero.left, hero.right, hero.top, hero.bottom], art: [a.left, a.right, a.top, a.bottom], img: [b.left, b.right, b.top, b.bottom, b.height], head: [head.left, head.right, head.top, head.bottom], blur: getComputedStyle(art, '::before').display, nat: i.naturalWidth / i.naturalHeight, src: i.currentSrc, fit: getComputedStyle(i).objectFit, vw: innerWidth };
  });
  for (const [W, H] of [[1280, 853], [1440, 900]]) for (const scene of Object.keys(BAND)) {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, reducedMotion: 'reduce' }); const pg = await ctx.newPage(); const errors = []; pg.on('pageerror', (x) => errors.push(x.message));
    if (scene !== 'cast-2') await pg.route('**/investor/Digital/index.html*', (route) => route.fetch().then(async (res) => route.fulfill({ response: res, body: (await res.text()).replace('data-scene="cast-2"', `data-scene="${scene}"`) })));
    await pg.goto(`${site.base}${OVERVIEW}?reveal=off`); await model(pg);
    await pg.waitForFunction(() => document.getElementById('ccScene').classList.contains('ready'), null, { timeout: 8000 });
    await pg.waitForTimeout(300);
    const v = await seen(pg), tag = `${scene} @ ${W}`;
    assert.match(v.src, new RegExp(`investor-meeting-${scene}`), `${tag}: the art follows the constant`);
    assert.equal(v.blur, 'none', `${tag}: no blurred copy`);
    assert.ok(Math.abs(v.img[0] - v.hero[0]) <= 1 && Math.abs(v.img[1] - v.vw) <= 1, `${tag}: the picture spans the hero edge to edge (${v.img[0]}..${v.img[1]})`);
    assert.ok(Math.abs((v.img[1] - v.img[0]) / v.img[4] - v.nat) < 0.02, `${tag}: drawn at its own shape (nothing squeezed or cut at the sides)`);
    // the part of the picture the hero shows, in fractions of its height
    const top = (v.art[2] - v.img[2]) / v.img[4], bottom = (v.art[3] - v.img[2]) / v.img[4];
    assert.ok(top <= BAND[scene][0] && bottom >= BAND[scene][1], `${tag}: every head and ear inside (${top.toFixed(3)}..${bottom.toFixed(3)} covers ${BAND[scene]})`);
    if (scene === 'cast-2') assert.ok(bottom >= 0.84, `${tag}: the front row down to the table's front edge (${bottom.toFixed(3)})`);
    // the KPI tiles overlap at most the floor below the table's edge
    const kTop = await pg.evaluate(() => document.getElementById('kpis').getBoundingClientRect().top);
    if (scene === 'cast-2') assert.ok((kTop - v.img[2]) / v.img[4] >= 0.84, `${tag}: the tiles start below the table's edge`);
    // the title over the ceiling: it ends above the highest head
    const faceTop = v.img[2] + BAND[scene][0] * v.img[4];
    assert.ok(v.head[3] <= faceTop, `${tag}: the title (bottom ${Math.round(v.head[3])}) ends above every face (top ${Math.round(faceTop)})`);
    assert.deepEqual(errors, []);
    await ctx.close();
  }
  const ph = await page(390);
  await ph.pg.goto(`${site.base}${OVERVIEW}?reveal=off`); await model(ph.pg);
  await ph.pg.waitForFunction(() => document.getElementById('ccScene').classList.contains('ready'), null, { timeout: 8000 });
  const v = await seen(ph.pg);
  const box = (v.art[1] - v.art[0]) / (v.art[3] - v.art[2]);
  assert.ok(Math.abs(box - v.nat) < 0.03 && v.img[2] >= v.art[2] - 1 && v.img[3] <= v.art[3] + 1, `phone: the whole picture (${box.toFixed(2)} / ${v.nat.toFixed(2)})`);
  assert.ok(v.head[3] <= v.art[2] + 1, 'phone: the title above the picture, over no face');
  await ph.ctx.close();
});

test('capital command center on a phone: the same order, tiles and documents as swipe rows, the strip as chips, no sideways page scroll', async (t) => {
  if (skip) return t.skip(skip);
  const { ctx, pg, errors } = await page(390);
  await pg.goto(`${site.base}${OVERVIEW}?reveal=off`); await model(pg);
  await pg.waitForTimeout(300);
  const tops = await pg.evaluate(() => ['.cap-head', '#ccScene', '#kpis', '.cap-strip', '.ovd-funding', '.ovd-year', '.ovd-docs', '.cap-foot'].map((s) => Math.round(document.querySelector(s).getBoundingClientRect().top + scrollY)));
  assert.deepEqual([...tops].sort((a, b) => a - b), tops, `the mockup's order, stacked: ${tops}`);
  const row = (sel, item) => pg.evaluate(([sel, item]) => { const c = document.querySelector(sel); return { tops: new Set([...c.querySelectorAll(item)].map((x) => Math.round(x.getBoundingClientRect().top))).size, swipes: c.scrollWidth > c.clientWidth + 50, snap: getComputedStyle(c).scrollSnapType }; }, [sel, item]);
  for (const [sel, item] of [['#kpis', '.kpi'], ['.cap-docs', '.cap-doc']]) {
    const r = await row(sel, item);
    assert.equal(r.tops, 1, `${sel}: one row`); assert.ok(r.swipes, `${sel}: swipes`); assert.match(r.snap, /x mandatory/, `${sel}: snaps`);
  }
  assert.ok(await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) <= 0, 'no sideways page scroll');
  // 44 px targets on the Overview's controls
  const small = await pg.$$eval('[data-studio-view="overview"] :is(a, button)', (els) => els.filter((e) => e.offsetParent && !e.closest('.sr, .cc-kpi-tools')).map((e) => ({ t: e.textContent.trim().slice(0, 20), h: Math.round(e.getBoundingClientRect().height) })).filter((x) => x.h < 44));
  assert.deepEqual(small, []);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('Profit lab: sliders, levers and charts from the model; the margin reproduces the model at the plan and at the $1,250 price row; levers from the itemized budget', async (t) => {
  if (skip) return t.skip(skip);
  const { ctx, pg, errors } = await page(1440);
  await pg.goto(`${site.base}${OVERVIEW}?reveal=off`); await model(pg);
  await pg.waitForFunction(() => !document.getElementById('labTuition').disabled && document.getElementById('labLeverFF').textContent);
  const txt = (ids) => pg.evaluate((ids) => ids.map((id) => document.getElementById(id).textContent), ids);
  const { funding, metrics, sensitivity, assumptions } = MODEL;
  // the plan: the model's margin, break-even and peak deficit; no payback (the margin is negative)
  assert.deepEqual(await txt(['labMargin', 'labBreakEven', 'labDeficit', 'labPayback']), [money2(metrics.year2_margin), money2(metrics.breakeven_tuition), money2(funding.peak_deficit), metrics.year2_margin > 0 ? `${(funding.peak_deficit / metrics.year2_margin).toFixed(1)} years` : 'Not reached']);
  assert.deepEqual(await txt(['labTuitionOut', 'labChildrenOut', 'labCollectionOut']), ['$910', '38', '96%']);
  // the levers' amounts are the itemized budget's lines
  const whole = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
  assert.deepEqual(await txt(['labLeverFF', 'labLeverAds']), [money2(LAB.ff), whole(LAB.ads)]);
  assert.deepEqual([LAB.ff, LAB.ads], [22312.2, 4500]);
  // v5: no afternoon-teacher lever; the owner is the unpaid director, and a lever adds a market director's all-in cost
  assert.equal(await pg.$$eval('[data-lever]', (l) => l.map((x) => x.dataset.lever).join()), 'ff,director,ads');
  assert.equal(MODEL.reference.market_director_all_in, 60240.72);
  assert.equal(await pg.textContent('#labLeverDirector'), '−$60,240.72');
  await pg.click('.lever:has([data-lever="director"])'); await pg.waitForTimeout(450);
  assert.equal(await pg.textContent('#labMargin'), money2(Math.round((metrics.year2_margin - 60240.72) * 100) / 100), 'a paid director comes off the margin');
  await pg.click('.lever:has([data-lever="director"])'); await pg.waitForTimeout(450);
  // the model's price row: full enrollment at $1,250 and 96% collections -> its annual operating margin, to the cent (±1¢)
  const setRange = (id, v) => pg.$eval(id, (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, String(v));
  await setRange('#labTuition', 1250); await pg.waitForTimeout(500);
  const row = sensitivity.find((r) => r.children === CAP && r.tuition === 1250);
  const shown = Number((await pg.textContent('#labMargin')).replace(/[^\d.]/g, ''));
  assert.ok(Math.abs(shown - row.annual_operating_margin) <= 0.011, `$1,250: ${shown} vs the model's ${row.annual_operating_margin}`);
  // v2274: every sensitivity row of the model, to the cent (±1¢)
  for (const r of sensitivity) {
    await setRange('#labTuition', r.tuition); await setRange('#labChildren', r.children); await pg.waitForTimeout(450);
    const txtM = await pg.textContent('#labMargin'), v = Number(txtM.replace(/[^\d.]/g, '')) * (txtM.startsWith('−') ? -1 : 1);
    assert.ok(Math.abs(v - r.annual_operating_margin) <= 0.011, `${r.children} children at $${r.tuition}: ${v} vs ${r.annual_operating_margin}`);
  }
  await setRange('#labChildren', CAP);
  assert.match(await pg.textContent('#labPayback'), /^\d+\.\d years$/, 'a positive margin pays the deficit back');
  // the levers: each adds its amount to the margin; the waterfall lists each step and the result
  await setRange('#labTuition', assumptions.tuition); await pg.waitForTimeout(400);
  for (const k of ['ff', 'ads']) await pg.click(`.lever:has([data-lever="${k}"])`);
  await pg.waitForTimeout(500);
  const expect = Math.round((metrics.year2_margin + LAB.ff + LAB.ads) * 100) / 100;
  assert.equal(await pg.textContent('#labMargin'), money2(expect));
  assert.deepEqual(await pg.$$eval('#labFall .wf-name', (n) => n.map((x) => x.textContent)), ['Today’s plan', 'Program costs carried by Futures Friends', 'Paid ads cut back', 'Your scenario']);
  assert.equal(await pg.textContent('#labFall .wf-row:last-child .wf-val'), money2(expect));
  // the gauge: needle on the tuition, tick on the break-even
  assert.match(await pg.$eval('#labGauge .g-needle', (g) => g.style.transform), /rotate\(/);
  // Reset returns to the plan
  await pg.click('#labReset'); await pg.waitForTimeout(500);
  assert.deepEqual(await txt(['labMargin', 'labBreakEven']), [money2(metrics.year2_margin), money2(metrics.breakeven_tuition)]);
  assert.equal(await pg.$$eval('[data-lever]:checked', (c) => c.length), 0);
  // the ramp: twelve months from assumptions.cash_ramp; the dollar bar: the recurring budget by group (shares sum to 100%)
  assert.deepEqual(await pg.$$eval('#labRamp .rp-val', (v) => v.map((x) => Number(x.textContent))), assumptions.cash_ramp);
  await pg.hover('#labRamp .rp-col[data-i="2"]');
  assert.equal(await pg.textContent('#labRampTip'), `Month 3: ${assumptions.cash_ramp[2]} children`);
  assert.deepEqual(await pg.$$eval('#labDollarKey small', (s) => s.map((x) => x.textContent)), LAB.shares);
  assert.deepEqual(await pg.$$eval('#labDollarKey b', (s) => s.map((x) => x.textContent)), LAB.parts.map(money2));
  assert.deepEqual(errors, []);
  await ctx.close();
});

// ------------------------------------------------------------------ model v5 (v2274, owner-confirmed 2026-10-13): all-day care for 38 children ages
// 2–5, four full-time caregivers and a part-time floater at $16/hour, the owner as unpaid director, no food worker, no substitutes, $210/week
test('model v5: the generator reproduces the archived v4 (where the archive exists) and the published v5; 38 children, four caregivers meet Missouri 1:10', (t) => {
  const os = require('node:os'), { execFileSync } = require('node:child_process');
  const run = (script) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-model-'));
    for (const d of ['tools', 'costs', 'documents', 'Digital/model']) fs.mkdirSync(path.join(dir, d), { recursive: true });
    fs.copyFileSync(script, path.join(dir, 'tools/build.py'));
    execFileSync('python3', [path.join(dir, 'tools/build.py')], { stdio: 'pipe' });
    const out = (f) => fs.readFileSync(path.join(dir, 'costs', f), 'utf8'), csv = (k) => out(fs.readdirSync(path.join(dir, 'costs')).find((f) => f.endsWith(`_${k}.csv`)));
    return { json: out('pilot-budget.json'), items: csv('Itemized'), cash: csv('Monthly_Cash') };
  };
  const v5 = run(path.join(ROOT, 'investor/tools/build_pilot_budget.py'));
  assert.equal(v5.json, read('investor/costs/pilot-budget.json'), 'the published v5 model is the generator\'s output');
  assert.equal(v5.items, read('investor/costs/Pilot_38_Children_Itemized.csv'));
  assert.equal(v5.cash, read('investor/costs/Pilot_38_Children_Monthly_Cash.csv'));
  assert.equal(read('investor/Digital/model/pilot-budget.json'), read('investor/costs/pilot-budget.json'));
  assert.ok(!fs.existsSync(path.join(ROOT, 'investor/costs/archive')), 'no archived model in the published repo');
  const A = (f) => path.join(ARCHIVE_DIR, f);
  if (fs.existsSync(A('build_pilot_budget_v4_2026-10-11.py'))) {
    const v4 = run(A('build_pilot_budget_v4_2026-10-11.py'));
    assert.equal(v4.json, fs.readFileSync(A('pilot-budget_v4_2026-10-11.json'), 'utf8'), 'the method reproduces the archived v4 model');
    assert.equal(v4.items, fs.readFileSync(A('Pilot_40_Children_Itemized_v4_2026-10-11.csv'), 'utf8'));
    assert.equal(v4.cash, fs.readFileSync(A('Pilot_40_Children_Monthly_Cash_v4_2026-10-11.csv'), 'utf8'));
    assert.equal(JSON.parse(fs.readFileSync(A('pilot-budget_v4_2026-10-11.json'), 'utf8')).funding.request_before_financing, 423849.52);
  } else t.diagnostic('v4 archive not present here: the reproduction check is skipped');
  const { funding: f, totals: tt, staffing: s, assumptions: a, cash } = MODEL;
  assert.equal(MODEL.meta.version, 'pilot-38-v5.1');
  assert.ok(Math.abs(f.peak_deficit + tt.refinance + f.cash_floor + tt.contingency - f.request_before_financing) < 0.005);
  assert.ok(Math.abs(tt.recurring / 12 - f.cash_floor) < 0.006 && Math.abs(tt.one_time * 0.15 - tt.contingency) < 0.006);
  // 38 children all day, ages 2–5; Missouri 1:10, max group 20 (≤4 two-year-olds per group) -> ceil(38 / 10) = 4 caregivers on the floor
  assert.equal(CAP, 38); assert.equal(a.ages, '2–5'); assert.equal(Math.max(...a.cash_ramp), CAP);
  assert.deepEqual(a.cash_ramp, [30, 34, 36, 38, 38, 38, 38, 38, 38, 38, 38, 38]);
  assert.equal(cash.findIndex((r) => r.children === CAP) + 1, 4, 'full enrollment from month 4');
  assert.ok(Math.ceil(CAP / 10) <= s.floor_caregivers && s.floor_caregivers === 4 && s.full_time === 4);
  assert.ok(s.max_group <= 20 && s.groups * s.max_group >= CAP, 'two groups of at most 20 hold the 38 children');
  assert.equal(a.tuition, 910); assert.equal(a.tuition_weekly, 210); assert.match(a.tuition_basis, /locked-in rate of \$210\/week/);
  const rows = itemized(), wages = rows.filter((r) => r.category === 'Staff wages');
  assert.deepEqual(wages.map((r) => [r.item, r.quantity, r.rate]), [['Owner-director (unpaid)', '2080.0', '0.0'], ['Full-time caregiver 1', '2080.0', '16.0'], ['Full-time caregiver 2', '2080.0', '16.0'], ['Full-time caregiver 3', '2080.0', '16.0'], ['Full-time caregiver 4', '2080.0', '16.0'], ['Part-time break/admin floater', '1040.0', '16.0']]);
  assert.match(wages[0].notes, /Owner serves as director \(unpaid\); a market director salary \(~\$60k all-in\) is excluded\. Missouri requires a qualified director on duty 40 h\/wk \(5 CSR 25-500\.102\(2\)\)\./);
  assert.ok(wages.slice(1).every((r) => /All staff \$16\/hr \(owner-confirmed 2026-10-13\); above Missouri 2026 minimum wage \$15\.00\./.test(r.notes)));
  assert.ok(!rows.some((r) => /^(Staff|Employer|Staff insurance|Staff readiness)/.test(r.category) && /food worker|Substitute|teacher/i.test(r.item)), 'no food worker, substitute or v4 teacher lines');
  assert.ok(!rows.some((r) => r.category === 'Staff benefits'), 'no employer health or retirement benefit');
  assert.equal(s.wages, 149760);
});
