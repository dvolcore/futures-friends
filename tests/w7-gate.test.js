// Wave 7 GATE (2026-10-06) and IP LOCKDOWN (owner decision 2026-10-07: "I don't want to give away our full curriculum to our
// competitors"). The full curriculum is no longer on the public site at all; licensed centers get it privately. These tests encode it:
//   1. index.html loads no curriculum data, no site file loads or names one, and robots.txt has nothing left to hide;
//   2. the public summary's facts equal the PRIVATE release data (tests/private-curriculum.js; skipped where it is not mounted) and
//      carry no lesson text;
//   3. #unit-1 is the summary plus ONE watermarked sample day and an honest request-access path (no fake login);
//   4. the Teacher Portal's Curriculum tab is an access card for EVERY session (preview, family, even a mocked staff session) and
//      requests nothing; This Week is the public week summary for everyone;
//   5. no menu, search entry, footer, context card or release strip reaches curriculum material.
// VM checks first, then headless Chromium at 1280 and 390 px (harness as tests/a11y.test.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { read, ROOT } = require('./site-vm');
const P = require('./private-curriculum');

const text = html => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ');
const loadPriv = (f, g) => { if (!P.has(f)) return null; const c = { window: {} }; vm.createContext(c); vm.runInContext(P.readPriv(f), c); return c.window[g]; };
const DATA = loadPriv('unit1-data.js', 'FFUnit1Data'), FAM = loadPriv('unit1-family.js', 'FFUnit1Family');
const PRIV_SKIP = P.skipUnless('unit1-data.js', 'unit1-family.js');
// Anything that reaches curriculum material: a unit printable, a curriculum data file, the full Learning Steps or a Unit 1 day address.
// The one watermarked sample (printables/sample/) is deliberately public.
const GATED = /printables\/unit-\d|unit\d-(data|prep|family)\.js|curriculum-indicators\.js|units\.js|#unit-1\/|^unit-1\/\d/;
const goals = () => (DATA ? DATA.days.flatMap(d => d.blocks.map(b => [b.id, b.goal])) : []);

// A VM with the views, the gate, the Unit 1 page and This Week; `session` is a mocked FFHub (hub-backend.js shape) or none.
function site({ session = null } = {}) {
  const appended = [];
  const ctx = vm.createContext({
    console, setTimeout: () => 0, clearTimeout() {}, innerHeight: 800, URLSearchParams,
    window: { FFhooks: [], FF_INTAKE: { url: '' }, localStorage: { getItem: () => null, setItem() {}, removeItem() {} } },
    document: { addEventListener() {}, getElementById: () => null, createElement: () => ({}), head: { appendChild: el => appended.push(el) }, querySelector: () => null, querySelectorAll: () => [] }
  });
  ctx.window.document = ctx.document;
  if (session) ctx.window.FFHub = Object.assign({ configured: true, connected: true }, session);
  for (const f of ['data.js', 'plush-cast.js', 'supporting-cast.js', 'views.js', 'whole-child.js', 'release-manifest.js']) vm.runInContext(read(f), ctx, { filename: f });
  vm.runInContext('window.FFRelease = { chip: id => `<span class="rt-chip">${window.FFReleaseData.assets[id].availability}</span>`, APPROVAL: { draft: "Draft", not_started: "Not started" }, data: window.FFReleaseData };', ctx);
  vm.runInContext("V.curriculum = () => '<div><section class=\"ex-activities\">a</section></div>';", ctx);
  for (const f of ['curriculum-gate.js', 'teach-day.js', 'unit-1.js', 'this-week.js']) vm.runInContext(read(f), ctx, { filename: f });
  ctx.render = (route, a) => vm.runInContext(`arg = ${JSON.stringify(a == null ? null : a)}; view = ${JSON.stringify(route)}; V[${JSON.stringify(route)}]()`, ctx);
  ctx.portal = n => vm.runInContext(`window.FFUnit1.portalView(${n == null ? '' : n})`, ctx);
  ctx.scripts = () => appended.filter(el => el.src).map(el => el.src);
  return ctx;
}

// ---------------------------------------------------------------- static: files, wiring, robots
test('index.html loads no curriculum data; the gate loads before the views that use it; robots.txt has nothing left to hide', () => {
  const html = read('index.html');
  assert.doesNotMatch(html, GATED, 'no curriculum data file or packet in the static page');
  const at = s => html.indexOf(s);
  assert.ok(at('<script src="curriculum-gate.js?v=') > at('<script src="hub-offline.js?v=') && at('<script src="curriculum-gate.js?v=') < at('<script src="portal.js?v='), 'after hub-offline.js, before portal.js');
  assert.ok(at('<script src="curriculum-gate.js?v=') < at('<script src="unit-1.js?v=') && at('<script src="curriculum-gate.js?v=') < at('<script src="prep-ahead.js?v='));
  for (const [f, min] of [['curriculum-gate.js', 3], ['unit-1.js', 9], ['this-week.js', 4], ['portal.js', 28], ['wayfinding.js', 6], ['prep-ahead.js', 4], ['release-truth.js', 6], ['home-calm.js', 4], ['unit-1.css', 3]]) {
    const m = new RegExp(`${f.replace('.', '\\.')}\\?v=(\\d+)`).exec(html);
    assert.ok(m && +m[1] >= min, `${f} cache-bust >= ${min}`);
  }
  const robots = read('robots.txt');
  assert.match(robots, /^User-agent: \*$/m);
  assert.doesNotMatch(robots, /^Disallow: \S/m, 'no Disallow line advertises where curriculum used to be');
});

test('no public source file names or loads a curriculum file or a Unit 1 day address', () => {
  const pub = fs.readdirSync(ROOT).filter(f => /\.(js|html|css)$/.test(f));
  for (const f of pub) {
    const s = read(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');   // comments may describe the old addresses
    assert.doesNotMatch(s, /printables\/unit-\d/, `${f}: no packet, bundle, printable or card path`);
    assert.doesNotMatch(s, /unit\d-(data|prep|family)\.js|curriculum-indicators\.js|['"]units\.js/, `${f}: names no curriculum data file`);
    assert.doesNotMatch(s, /#unit-1\/(\d|\$\{|'\s*\+)/, `${f}: no link to a Unit 1 day`);
  }
  for (const f of ['unit-1.js', 'prep-ahead.js', 'this-week.js']) {
    assert.doesNotMatch(read(f), /load\(DATA_SRC|DATA_SRC =/, `${f} has no data file to load`);
    assert.doesNotMatch(read(f), /createElement\('script'\)/, `${f} has no loader of its own`);
  }
  const G = (() => { const c = { window: {} }; vm.createContext(c); vm.runInContext(read('curriculum-gate.js'), c); return c.window.FFGate; })();
  for (const who of ['staff', 'member']) assert.equal(G.load('anything.js', who), false, 'the gate never loads a file');
});

test('the summary facts equal the private release data (titles, weeks, counts); nothing beyond titles is copied', { skip: PRIV_SKIP }, () => {
  const G = (() => { const c = { window: {} }; vm.createContext(c); vm.runInContext(read('curriculum-gate.js'), c); return c.window.FFGate; })().U1;
  assert.equal(G.title, DATA.title.replace(/^Unit 1: /, ''));
  assert.equal(G.days, DATA.counts.days);
  assert.equal(G.activities, DATA.counts.activities);
  assert.deepEqual(JSON.parse(JSON.stringify(G.weeks)), JSON.parse(JSON.stringify(DATA.weeks.map(w => ({ week: w.week, lead: w.lead, theme: w.theme, value: w.value, pillars: w.pillars, celebration: w.celebration })))));
  for (const [n, t] of G.sample) assert.equal(DATA.days[n - 1].title, t, `Day ${n}`);
  assert.ok(G.sample.length >= 2 && G.sample.length <= 3, 'two or three titles only');
  const kinds = {}; for (const f of DATA.files) kinds[f.kind] = (kinds[f.kind] || 0) + 1;
  assert.deepEqual(JSON.parse(JSON.stringify(G.files)), kinds);
  assert.equal(G.pages, DATA.files.reduce((a, f) => a + f.pages, 0));
  assert.equal(G.fileCount, DATA.files.length);
  const gate = read('curriculum-gate.js');
  for (const d of DATA.days) for (const b of d.blocks) assert.ok(!gate.includes(b.goal), b.id);
  for (const w of FAM.weeks) for (const a of w.activities) assert.ok(!gate.includes(a.three), a.id);
  for (const n of G.written) assert.ok(P.has(`unit${n}-data.js`), `Unit ${n} is written (private data exists)`);
});

test('the one public sample is Day 9 of the private release, every page watermarked "Sample - licensed centers receive the full program"', t => {
  const G = (() => { const c = { window: {} }; vm.createContext(c); vm.runInContext(read('curriculum-gate.js'), c); return c.window.FFGate; })();
  const X = G.SAMPLE;
  assert.equal(X.path, 'printables/sample/ff-sample-u1-day-09-teacher-packet.pdf');
  assert.deepEqual(fs.readdirSync(path.join(ROOT, 'printables', 'sample')), ['ff-sample-u1-day-09-teacher-packet.pdf'], 'exactly one sample file');
  // PyMuPDF reads the pages (the generators already need it); tests/pdf-text.js only reads Chromium's PDFs
  const out = require('node:child_process').spawnSync('python3', ['-c', 'import fitz,json,sys; print(json.dumps([p.get_text() for p in fitz.open(sys.argv[1])]))', path.join(ROOT, X.path)], { encoding: 'utf8' });
  if (out.status !== 0) return t.skip('python3 with PyMuPDF is needed to read the sample');
  const pages = JSON.parse(out.stdout).map(p => p.replace(/\s+/g, ' '));
  assert.equal(pages.length, X.pages);
  pages.forEach((p, i) => assert.match(p, /Sample - licensed centers receive the full program/, `page ${i + 1} is watermarked`));
  assert.match(pages[0], /Kind Hands, Kind Words/);
  for (const t of X.thumbs) assert.ok(fs.existsSync(path.join(ROOT, t)), t);
  assert.match(G.ACCESS.note, /Futures Learning Center/);
});

// ---------------------------------------------------------------- the public summary and the access card (VM)
test('#unit-1 is a summary with one sample day: weeks, six steps, ages, three titles, counts, status, request access; no other file, no data request', () => {
  const c = site(), h = c.render('unit-1'), t = text(h);
  assert.equal((h.match(/<h1[ >]/g) || []).length, 1);
  for (const w of c.window.FFGate.U1.weeks) assert.ok(t.includes(w.theme), w.theme);
  for (const s of ['Watch', 'Talk', 'Do', 'Move', 'Explore', 'Take home']) assert.ok(t.includes(s), s);
  for (const s of ['Twos', 'Threes', 'Pre-K', 'Kind Hands, Kind Words', 'Sink or Float', 'How families stay connected', 'What a program receives']) assert.ok(t.includes(s), s);
  assert.match(t, /20 teaching days and 161 activities/);
  assert.match(t, /12 monthly units, 48 theme weeks/);
  assert.match(t, /Draft/);
  assert.match(t, /Unit 1 daily plans, for educators available_now/, 'status label from the release manifest');
  assert.match(h, /href="#contact"[^>]*>Request the full program/);
  assert.match(h, /<h2[^>]*>Licensed centers get the full program<\/h2>/);
  assert.match(t, /staff access is through Futures Learning Center for now/);
  assert.match(h, /href="#enroll">Ask about a tour/);
  assert.doesNotMatch(h, /signin-teacher|Educator sign-in/, 'no fake login to the curriculum');
  const pdfs = h.match(/href="[^"]*\.pdf"/g) || [];
  assert.deepEqual(pdfs, ['href="printables/sample/ff-sample-u1-day-09-teacher-packet.pdf"'], 'the only file is the watermarked sample');
  assert.match(t, /Sample: licensed centers receive the full program/);
  assert.doesNotMatch(h, GATED);
  assert.doesNotMatch(h, /data-u1-day/);
  for (const [id, g] of goals()) assert.ok(!t.includes(g), `no block goal: ${id}`);
  assert.doesNotMatch(t, /Full teacher wording|Picture-talk story:|Say or ask/);
  assert.equal(text(c.render('unit-1', '9')), t, 'an old #unit-1/9 link lands on the same summary');
  assert.deepEqual(c.scripts(), [], 'the summary requests no data');
});

test('Teacher Portal Curriculum tab, EVERY session (preview, family, teacher, director): an access card with counts, never lesson text or a file', () => {
  for (const session of [null, { configured: false, connected: false }, { role: 'family' }, { role: 'teacher', connected: false }, { role: 'teacher' }, { role: 'director' }, { role: 'hq' }]) {
    const c = site({ session }), h = c.portal(9), t = text(h);
    assert.match(t, /The full curriculum is for licensed centers/, JSON.stringify(session));
    assert.match(t, /Futures Learning Center/);
    assert.match(t, /20 teaching days/);
    assert.match(t, /161 Unit 1 activities/);
    assert.match(t, /51 Unit 1 files, 960 pages, all Draft/);
    assert.match(h, /href="#contact">Request access/);
    assert.match(h, /href="#unit-1"/);
    assert.doesNotMatch(h, /signin-teacher|data-u1-day|id="u1-days"|id="u1-downloads"|\.pdf|Full teacher wording|Loading/);
    for (const [id, g] of goals()) assert.ok(!t.includes(g), id);
    assert.deepEqual(c.scripts(), [], 'the tab requests nothing, whoever is signed in');
  }
});

test('This Week: the week in summary for everyone, signed in or not (no activity, no card, no request)', () => {
  for (const session of [null, { role: 'family' }, { role: 'teacher' }]) {
    const c = site({ session }), h = c.render('this-week', 'lumi'), t = text(h);
    assert.match(t, /This week with Lumi/);
    assert.match(t, /Meet Lumi: Big Feelings/);
    assert.match(t, /come home from your child's classroom at Futures Learning Center/);
    assert.match(h, /href="#at-home"/);
    assert.doesNotMatch(h, /\.pdf|download|data-tw-speak|tw-act|signin-family/);
    if (FAM) for (const w of FAM.weeks) for (const a of w.activities) { assert.ok(!t.includes(a.three), a.id); assert.ok(!t.includes(a.at_school), a.id); }
    assert.deepEqual(c.scripts(), [], 'nothing is requested');
  }
  const pub = site();
  vm.runInContext("V['family-portal'] = (b => () => b())(() => '<div class=\"wrap\" style=\"display:grid;gap:16px\"></div>');", pub);
  vm.runInContext(read('this-week.js'), pub);
  const fam = pub.render('family-portal');
  assert.match(text(fam), /family cards come home from your child's classroom at Futures Learning Center/);
  assert.doesNotMatch(fam, /\.pdf|signin-family/);
});

test('menus, search, footer site map, context card, proof band, journey and release strip point at the summary, never a day or a file', () => {
  const way = read('wayfinding.js');
  const block = name => { const i = way.indexOf(`const ${name} = `); return JSON.parse(JSON.stringify(vm.runInNewContext('(' + way.slice(i + `const ${name} = `.length, way.indexOf(';\n', i)) + ')', { PHONE: '(816) 988-5661' }))); };
  const all = JSON.stringify([block('MAIN'), block('GROUPS'), block('NEXT'), block('PAGES'), block('MORE')]);
  assert.doesNotMatch(all, /unit-1\/|printables\/unit-|\.pdf/);
  assert.deepEqual(block('GROUPS').staff.find(x => x[0] === 'unit-1'), ['unit-1', 'Unit 1 at a glance']);
  assert.deepEqual(block('NEXT').staff[1].slice(0, 2), ['unit-1', 'See the curriculum and a sample day'], 'the staff context card offers the summary and the sample (IP lockdown)');
  assert.match(block('SYN')['unit-1'], /packets/, 'someone searching for packets lands on the summary, its sample and the request path');
  assert.doesNotMatch(block('SYN')['signin-teacher'], /packets|full curriculum/, 'the Teacher Portal sign-in never promises the curriculum');
  const foot = read('index.html').match(/<nav class="ffw-sitemap"[\s\S]*?<\/nav>/)[0];
  assert.match(foot, /<a href="#unit-1">Unit 1 at a glance<\/a>/);
  assert.doesNotMatch(foot, GATED);
  assert.match(read('home-calm.js'), /id: 'unit1', [^\n]*href: '#unit-1',/, 'the proof band tile links to the summary, keeping its count');
  assert.match(read('journey.js'), /'unit-1': \{ label: 'Unit 1 at a glance'/);
  const ev = require('./site-vm').site().FFRelease.evidence('lesson');
  assert.match(ev, /href="#unit-1"/);
  assert.doesNotMatch(ev, /<img|\.pdf|#unit-1\//, 'the release strip evidence is the summary, not a packet page');
  const route = require('../route-meta.js').ROUTES;
  assert.match(route['unit-1'][1], /summary/i);
  assert.doesNotMatch(route['unit-1'].join(' ') + route['this-week'].join(' '), /PDF|download|free/i);
});

test('units status copy is current everywhere: Units 1 to 4 written (draft), 5 to 12 planned; nothing says Units 2 to 12 are only outlined', () => {
  for (const f of ['views.js', 'experience.js', 'pricing-all-in.js', 'unit-1.js', 'journey.js', 'home-calm.js']) {
    const s = read(f);
    assert.doesNotMatch(s, /Units 2 to 12 (are|is) (outlined|week-by-week)|Unit 1 is written day by day[^;]*\); Units 2 to 12|later units outlined|Units 2 to 12 are outlined/, f);
  }
  assert.match(read('experience.js'), /Units 1 to 4 written \(draft/);
  assert.match(read('views.js'), /Units 1 to 4 are written day by day \(draft/);
  assert.match(read('experience.css'), /\.ex-hero \.ex-heronote\{max-width:calc\(48vw - 56px\)\}/, 'the hero note stays clear of the cast at tablet widths');
});

test('copy tells the new truth: no public page promises Unit 1 free, public or downloadable', () => {
  const site = require('./site-vm').site();
  for (const r of ['curriculum', 'options', 'pricing', 'for-centers', 'for-home', 'for-families', 'support']) {
    const t = text(site.render(r));
    assert.doesNotMatch(t, /Unit 1[^.]{0,60}\bfree\b|free draft|free to read and print|Unit 1 files are public|downloaded and taught today|the owner made the Unit 1 packets public/i, r);
  }
  const M = require('../release-manifest.js');
  assert.match(M.assets['curriculum-unit1-days'].note, /for educators[^.]*Teacher Portal/);
  assert.doesNotMatch(JSON.stringify(M.commercial), /free on the website \(the owner made the Unit 1 packets public\)|can be downloaded and taught today|open, download or use it today/);
});

// ---------------------------------------------------------------- real browser
const H = () => import('./a11y-harness.mjs');
let h, srv, browser;
test.before(async () => { h = await H(); srv = await h.startSite(); browser = await h.loadChromium().launch(); });
test.after(async () => { await browser.close(); await srv.close(); });

test('every public route at 1280 px: no link, button, menu, footer or search entry reaches gated material, and nothing gated is requested', async () => {
  const { ctx, page, errors } = await h.open(browser, 1280);
  const asked = [];
  page.on('request', r => { if (GATED.test(new URL(r.url()).pathname.replace(/^\//, ''))) asked.push(r.url()); });
  await h.goto(page, srv.base, 'home');
  const routes = await h.routeList(page);
  const extra = ['this-week/lumi', 'portal', 'family-portal', 'unit-1/9'];   // the old day address last: the back chip then shows the visitor's own trail
  const bad = [];
  for (const r of routes.concat(extra)) {
    await page.evaluate(x => { location.hash = '#' + x; }, r);
    await page.waitForTimeout(140);
    const hits = await page.evaluate(re => [...document.querySelectorAll('a[href],[data-go],[data-href]')]
      .map(a => a.getAttribute('href') || a.getAttribute('data-go') || a.getAttribute('data-href')).filter(x => new RegExp(re).test(x)), GATED.source);
    if (hits.length) bad.push([r, hits]);
  }
  // the search palette's whole index and the full-screen menu as it is built
  const idx = await page.evaluate(() => window.FFWay.index().map(x => x.href));
  for (const x of idx) if (GATED.test(x)) bad.push(['search', x]);
  assert.deepEqual(bad, []);
  assert.deepEqual(asked, [], 'no gated file was requested while browsing the public site');
  assert.deepEqual(errors, []);
  await ctx.close();
});

for (const width of [1280, 390]) {
  test(`portal at ${width}px: the Curriculum tab is the access card, with no lesson data in the page, even for a mocked staff session`, async () => {
    const { ctx, page, errors } = await h.open(browser, width);
    const asked = [];
    page.on('request', r => { if (GATED.test(new URL(r.url()).pathname.replace(/^\//, ''))) asked.push(r.url()); });
    await h.goto(page, srv.base, 'portal');
    await page.click('[data-demo-signin="teacher"]'); await page.waitForTimeout(400);   // demo mode (2026-10-07): the portal opens after a demo sign-in
    await page.click('[data-ptab="curriculum"]');
    await page.waitForSelector('.u1-locked');
    const f = await page.evaluate(() => ({ body: document.body.innerText, viewer: !!document.querySelector('[data-u1-day],#u1-days,#u1-downloads'), data: !!(window.FFUnit1Data || window.FFUnitData || window.FFUnit1Family),
      overflow: document.documentElement.scrollWidth - innerWidth }));
    assert.match(f.body, /The full curriculum is for licensed centers/);
    assert.equal(f.viewer, false);
    assert.equal(f.data, false, 'no lesson data in the page');
    for (const [id, g] of goals()) assert.ok(!f.body.includes(g), id);
    assert.ok(f.overflow <= 0, 'no sideways scroll');
    await page.evaluate(() => { window.FFHub = { configured: true, connected: true, role: 'teacher', portalFor: () => 'portal' }; });
    await page.click('[data-ptab="curriculum"]');
    await page.waitForTimeout(300);
    assert.match(await page.textContent('.u1-locked'), /Request access/);
    assert.equal(await page.$('[data-u1-day]'), null, 'a staff session gets no day viewer from the public site');
    assert.deepEqual(asked, [], 'nothing gated was requested');
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}
