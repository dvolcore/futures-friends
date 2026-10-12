'use strict';
// The Futures Hub TEST copy (portal-test/, built by the platform repo's hub/scripts/build-portal-test.mjs; hub/FAMILY_DASHBOARD.md
// "The test copy on the website"): the real family sign-in page and parent dashboard, answered from a recording of the fake TEST Family
// Demo Center, on GitHub Pages with no server and no database. Testers get a link and a TEST login from the owner.
//   static: hidden from search (noindex, robots, not in the sitemap or the navigation), no secrets or local addresses, no curriculum
//           beyond a small sample, no infant content, hashed logins only;
//   browser (390 and 1440): sign in with a TEST login, every tile's sheet, every page the dashboard links to, both children, Spanish,
//           a write shows "nothing is saved", deep links through 404.html, no console errors, no request leaves the site, axe clean.
// The browser part signs in with a login made by this test (the published logins.json is replaced in memory by the test server).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');
const PT = path.join(ROOT, 'portal-test');
const SLUG = 'test-family-demo-center';
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const FILES = walk(PT).map((f) => path.relative(ROOT, f).split(path.sep).join('/'));
const TEXT = FILES.filter((f) => /\.(js|css|html|json|txt)$/.test(f));
const COPIES = ['portal-test', 'portal-test/staff', 'portal-test/kids'].filter((d) => fs.existsSync(path.join(ROOT, d, 'fixtures.json')));
const FIXES = COPIES.map((d) => JSON.parse(read(`${d}/fixtures.json`)));
const FIX = FIXES[0];

// ------------------------------------------------------------------------------------------------------------------- static
test('the test copy is hidden from search and from the site navigation', () => {
  assert.deepEqual(COPIES, ['portal-test', 'portal-test/staff', 'portal-test/kids'], 'the parents\', the staff and the Kids\' corner copies');
  for (const f of ['portal-test/index.html', `portal-test/c/${SLUG}/index.html`, 'portal-test/staff/index.html', `portal-test/staff/c/${SLUG}/index.html`, `portal-test/kids/c/${SLUG}/kids/index.html`]) {
    const h = read(f);
    assert.match(h, /<meta name="robots" content="noindex, nofollow">/, f);
    assert.match(h, /<base href="\/futures-friends\/portal-test\/((staff|kids)\/)?">/, f);
    assert.ok(h.indexOf('test-mode.js') < h.indexOf('app.js') && h.indexOf('clock.js') < h.indexOf('test-mode.js'), `${f}: the adapter loads before the app`);
  }
  assert.match(read('robots.txt'), /^Disallow: \/futures-friends\/portal-test\/$/m);
  assert.doesNotMatch(read('sitemap.xml'), /portal-test/);
  // Owner 2026-10-12: until go-live the site's "Sign in" / Family sign-in open the copy (hub-link.js, the one place that links to it);
  // no page, menu or sitemap lists it otherwise.
  const linking = fs.readdirSync(ROOT).filter((f) => /\.(html|js)$/.test(f) && !['404.html', 'hub-link.js'].includes(f)).filter((f) => /portal-test/.test(read(f).replace(/<a (?:data-hub-preview="[a-z]*" )?href="portal-test\/c\/test-family-demo-center\/(?:\?(?:role|enter)=[a-z]+)?"(?: data-hub-preview="[a-z]*")?>/g, '')));
  assert.deepEqual(linking, [], 'only hub-link.js (and the links it rewrote, data-hub-preview, in prerendered pages) points at the test copy');
  assert.match(read('404.html'), /portal-test.*location\.replace\(n>3\?m\[1\]\+'\/c\/test-family-demo-center\/':m\[1\]\+'\/\?p='/, '404.html sends the copy\'s deep links to its page, with a loop guard');
});

test('no secrets, keys, tokens or local addresses; logins are salted hashes only', () => {
  const logins = JSON.parse(read('portal-test/logins.json'));
  // Owner 2026-10-12: no credentials are needed (one tap per role); the TEST logins still work, with their role. Hashes only.
  const testers = logins;
  assert.deepEqual(testers.map((l) => `${l.role}:${l.email.split('@')[0]}`), ['tester1', 'tester2', 'tester3', 'tester4', 'tester5'].map((x) => `family:${x}`)
    .concat(['teacher1', 'teacher2', 'teacher3'].map((x) => `teacher:${x}`), ['director1', 'director2'].map((x) => `director:${x}`)));
  for (const l of testers) {
    assert.deepEqual(Object.keys(l).sort(), ['email', 'hash', 'role', 'salt']);
    assert.match(l.email, /^(tester[1-5]|teacher[1-3]|director[12])@futuresfriends-test\.app$/);
    assert.match(l.hash, /^[0-9a-f]{64}$/);
    assert.match(l.salt, /^[0-9a-f]{24}$/);
  }
  for (const f of TEXT.filter((x) => !/vendor\//.test(x))) {
    const s = read(f);
    assert.doesNotMatch(s, /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, `${f}: a JWT`);
    assert.doesNotMatch(s, /127\.0\.0\.1|localhost:\d|:54321|service_role|SUPABASE_|sk_(live|test)_/, `${f}: a local address or key`);
    assert.doesNotMatch(s, /"password"\s*:/, `${f}: a password`);
  }
  assert.ok(!FILES.some((f) => /\.local\.|\.env|\.md$/.test(f)), 'no local or private file');
});

test('curriculum: only a small sample of skill wording, no activity steps or lesson records, no curriculum data files', () => {
  const real = new Set();
  const visit = (v, k) => {
    if (Array.isArray(v)) return v.forEach((x) => visit(x, k));
    if (v && typeof v === 'object') return Object.entries(v).forEach(([kk, x]) => visit(x, kk));
    if (typeof v !== 'string') return;
    if (/^(text_en|family_en|text_es|family_es|skill|step_text)$/.test(k) && v && !/^(Skill|Habilidad) \d+$/.test(v)) real.add(v);
    if (/^(steps|steps_es|prompts|age_adaptations)$/.test(k)) assert.fail(`lesson record field ${k}`);
  };
  for (const F of FIXES) {
    real.clear();
    for (const e of F.entries) { try { visit(JSON.parse(e.b)); } catch (_) { /* not JSON */ } }
    assert.ok(real.size <= 12, `${real.size} skill lines with real wording in one copy (3 skills, each in up to 4 wordings)`);
  }
  for (const e of FIXES.flatMap((F) => F.entries)) {
    assert.doesNotMatch(e.b, /"steps(_es)?":\s*\[\s*"/, `${e.k}: activity steps`);
    assert.doesNotMatch(e.k, /menu180|curriculum|library\/catalog/, `${e.k}: curriculum or catalogue data`);
  }
  assert.ok(!FILES.some((f) => /curriculum-indicators|unit\d+-(data|prep|family)|menu-?180|library-catalog/.test(f)));
});

test('fake data only: the demo center, the felt-art "photos", no real addresses', () => {
  assert.equal(FIX.slug, SLUG);
  assert.match(FIX.note, /fake demo data/i);
  for (const F of FIXES) assert.equal(F.slug, SLUG);
  const emails = new Set(FIXES.flatMap((F) => F.entries).flatMap((e) => e.b.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}/g) || []));
  for (const m of emails) assert.match(m, /futuresfriends-test\.app$|\.local$|example\.(com|org)$|\.test$/, m);
  const photos = FILES.filter((f) => f.startsWith('portal-test/sb/'));
  for (const f of photos) assert.match(f, /\/demo-[\w-]+\.png$/, f);
});

// ------------------------------------------------------------------------------------------------------------------- browser
const PASSWORD = 'portal-test-' + crypto.randomBytes(6).toString('hex');
const mk = (email, role, pw = PASSWORD, extra = {}) => { const salt = crypto.randomBytes(12).toString('hex'); return { email, role, salt, hash: crypto.createHash('sha256').update(`${salt}:${pw}`).digest('hex'), ...extra }; };
const TEST_LOGINS = [mk('tester9@futuresfriends-test.app', 'family'), mk('teacher9@futuresfriends-test.app', 'teacher'), mk('director9@futuresfriends-test.app', 'director')];
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.webp': 'image/webp', '.woff2': 'font/woff2', '.txt': 'text/plain', '.svg': 'image/svg+xml' };
// Like GitHub Pages for a project site: /futures-friends/<path>, a folder serves its index.html, anything missing gets 404.html (404).
function startPages() {
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    if (u.pathname === '/futures-friends/portal-test/logins.json') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(TEST_LOGINS)); }
    const send = (file, status = 200) => { res.writeHead(status, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(file).pipe(res); };
    if (!u.pathname.startsWith('/futures-friends/')) { res.writeHead(404); return res.end(); }
    let f = path.join(ROOT, path.normalize(decodeURIComponent(u.pathname.slice('/futures-friends/'.length))).replace(/^(\.\.[/\\])+/, ''));
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f += '.html';
    if (!f.startsWith(ROOT) || !fs.existsSync(f)) return send(path.join(ROOT, '404.html'), 404);
    send(f);
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r(server)));
}

let harness = null;
try { harness = require('node:module').createRequire(path.join(process.env.HUB_DIR || '/Volumes/FFCRM/app', 'hub/package.json'))('playwright-core'); } catch (_) { harness = null; }
const AXE = fs.readFileSync(path.join(ROOT, 'tests/fixtures/axe-core/axe.min.js'), 'utf8');
// axe findings the REAL front-ends have with the rich demo data too (checked against hub/web; reported to the platform). The copy adds none.
const KNOWN_AXE = [/^scrollable-region-focusable: /, /^color-contrast: (li:nth-child\(\d\) > \.fd-pk-a\.fd-person-av\[aria-hidden="true"\]( \| )?)+$/,
  /^color-contrast: \.sv2-hc-today$/];   // staff-v2.css: the attendance heatmap's "today" cell (white on #5cc183), reported to the staff dashboards
const ROLES = {
  family: { dash: '#fdKpis', tiles: '#fdKpis a[data-drawer], #fdKpis .fd-kpi', copy: '' },
  teacher: { dash: '#sv2Kpis', tiles: '#sv2Kpis .ffs-kpi', copy: 'staff/' },
  director: { dash: '#sv2Kpis', tiles: '#sv2Kpis .ffs-kpi', copy: 'staff/' },
};
// Owner 2026-10-12: no credentials and no "test" labels in the pages (they stay unindexed); the center reads "Futures Friends Learning Center".
const LABELS = /\bTEST\b|Demo Center|Demo preview|Test version|fake demo|nothing is saved/;

for (const [role, R] of Object.entries(ROLES)) {
  test(`in the browser, ${role}: one tap in, every view / tab / drawer and linked page, the role switcher, Spanish, no labels, no errors, nothing leaves the site, axe`, { skip: !harness && 'playwright-core not found (HUB_DIR)', timeout: 1200000 }, async (t) => {
    const server = await startPages();
    const port = server.address().port;
    assert.ok(![8765, 8791, 8811].includes(port));
    const ORIGIN = `http://127.0.0.1:${port}`, BASE = `${ORIGIN}/futures-friends/portal-test`;
    const browser = await harness.chromium.launch();
    t.after(async () => { await browser.close(); server.close(); });
    for (const width of [390, 1440]) {
      const ctx = await browser.newContext({ viewport: { width, height: width < 500 ? 844 : 900 }, ...(width < 500 ? { isMobile: true, hasTouch: true } : {}) });
      const page = await ctx.newPage();
      const errors = [], outside = new Set(), empty = [];
      page.on('console', (m) => { if (m.type() === 'error') errors.push(`${page.url()}: ${m.text()}`); if (m.type() === 'warning' && /test copy/.test(m.text())) empty.push(m.text()); });
      page.on('pageerror', (e) => errors.push(`${page.url()}: ${e.message}`));
      page.on('request', (r) => { const o = new URL(r.url()).origin; if (o !== ORIGIN) outside.add(o); });
      const axeRun = async () => {
        await page.waitForTimeout(400);
        await page.waitForFunction(() => !document.getAnimations().some((a) => a.playState === 'running' && a.effect?.getComputedTiming?.().iterations !== Infinity), null, { timeout: 10000 }).catch(() => {});
        if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ content: AXE });
        return (await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }))
          .violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)))
          .filter((v) => !KNOWN_AXE.some((k) => k.test(v)));
      };
      const okPage = async (where) => {
        const bad = await page.evaluate(() => {
          const alert = document.querySelector('#main .msg.bad[role=alert]');
          const miss = document.querySelector('#deepMiss');
          const h1 = document.querySelector('#main h1');
          // the full curriculum and library are for licensed centers: the preview shows that panel on those pages (never an error)
        return alert ? `error: ${alert.textContent}` : (h1 && /^(Page not found|No se encontró la página)$/.test(h1.textContent.trim()) ? 'not found'
            : (miss && /not available|no longer/.test(miss.textContent) ? `miss: ${miss.textContent}` : null));
        });
        assert.equal(bad, null, where);
        assert.doesNotMatch(await page.evaluate(() => document.body.innerText), LABELS, `${where}: no test labels`);
      };

      // the sign-in page: three one-tap entries; no banner, no credentials needed
      await page.goto(`${BASE}/c/${SLUG}/`);
      await page.waitForSelector('#ftRoles');
      assert.equal(await page.$('#ftBanner'), null, 'no banner');
      assert.match(await page.textContent('#ftRoles'), /Choose your view[\s\S]*Family[\s\S]*Teacher[\s\S]*Director/);
      assert.match(await page.textContent('#main'), /Futures Friends Learning Center/);
      await okPage('sign-in');
      if (width === 1440) assert.deepEqual(await axeRun(), [], `axe on the sign-in page (${role})`);
      if (role === 'family' && width === 390) {
        // "Sign in" with nothing typed enters (as Family)
        await page.click('#signinForm button[type=submit]');
      } else await page.click(`#ftRoles [data-ft-role="${role}"]`);
      await page.waitForSelector(R.dash, { timeout: 30000 });
      assert.match(page.url(), new RegExp(`/portal-test/${R.copy}c/${SLUG}/home`), `${role} lands on the ${R.copy || 'parents\''} copy`);
      await okPage(`${role} dashboard`);
      if (width === 1440) assert.deepEqual(await axeRun(), [], `axe on the ${role} dashboard`);
      const home = page.url();

      // every tile opens its drawer
      const tiles = await page.$$eval(R.tiles, (as) => as.map((a, i) => i));
      assert.ok(tiles.length >= 4, `${role}: ${tiles.length} tiles`);
      for (const i of tiles) {
        await page.goto(home); await page.waitForSelector(R.dash);
        const el = (await page.$$(R.tiles))[i]; if (!el || !(await el.isVisible())) continue;
        await el.click();
        await page.waitForTimeout(450);
        await okPage(`${role} tile ${i}`);
      }
      // every view and tab (?view= / ?tab=), then every page they link to: no dead end
      const links = new Set(), visited = new Set();
      const collect = async () => { for (const a of await page.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href')))) if (a.includes(`/portal-test/${R.copy}c/${SLUG}/`)) links.add(a); };
      await page.goto(home); await page.waitForSelector(R.dash); await collect();
      for (let round = 0; round < 2; round++) {
        for (const href of [...links]) {
          if (visited.has(href)) continue;
          visited.add(href);
          await page.goto(ORIGIN + href);
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(200);
          await okPage(`${role} ${href}`);
          if (/\/home\?/.test(href)) await collect();
        }
      }
      assert.ok(visited.size >= 10, `${role}: ${visited.size} views, tabs and pages`);

      if (role === 'family') {
        // a write does nothing, silently (no error, no note)
        const inc = [...visited].find((h) => /\/incident\?id=/.test(h));
        assert.ok(inc, 'the incident is linked');
        await page.goto(ORIGIN + inc); await page.waitForSelector('#incAckForm');
        await page.fill('#incName', 'Pat'); await page.click('#incAckForm button[type=submit]');
        await page.waitForTimeout(800);
        await okPage('a write');
        // a deep link opened from outside goes through the site's 404.html to the same page
        await page.goto(`${BASE}/c/${SLUG}/grades?kid=demo-mia`);
        await page.waitForURL(/\/portal-test\/c\/test-family-demo-center\/grades\/?\?kid=demo-mia$/);
        await page.waitForLoadState('networkidle');
        await okPage('deep link');
        // the Kids' corner (its own copy, portal-test/kids/): the handoff, every door, a video from the website's files, the exit gate
        await page.goto(home); await page.waitForSelector(R.dash);
        await page.evaluate(() => { document.querySelector('a[href*="/kids"]').click(); });
        await page.waitForSelector('#kcStart', { timeout: 30000 });
        assert.match(page.url(), /\/portal-test\/kids\/c\/test-family-demo-center\/kids\?kid=/);
        await page.click('#kcStart'); await page.waitForSelector('#kcDoors');
        for (const door of await page.$$eval('[data-door]', (e) => e.map((x) => x.getAttribute('data-door')))) {
          await page.click(`[data-door="${door}"]`); await page.waitForSelector('#kcBack'); await page.waitForTimeout(300);
          await okPage(`kids' corner ${door}`);
          if (door === 'read') assert.match(await page.textContent('#main'), /Booker Tries Again/);
          if (door === 'watch') {
            await page.click('#kcVideos [data-video]'); await page.waitForSelector('video');
            assert.match(await page.$eval('video', (v) => v.currentSrc || v.src), /\/futures-friends\/video\/[\w.-]+\.mp4$/);
            await page.click('#kcBack');
          }
          await page.click('#kcBack'); await page.waitForSelector('#kcDoors');
        }
        assert.ok(await page.$('#kmGate'), 'the grown-ups exit gate');
      }

      // the way back to the website: the logo and a link in the rail or the More sheet (every role)
      await page.goto(home); await page.waitForSelector(R.dash);
      assert.match(await page.getAttribute('header .brand', 'href'), /^https?:\/\/[^/]+\/futures-friends\/$/, 'the logo opens the website');
      if (width >= 1024) await page.waitForSelector('.ft-site', { state: 'attached', timeout: 5000 }).catch(async (e) => {
        throw new Error(`no website link in the rail: ${page.url()} | ${await page.evaluate(() => [...document.querySelectorAll('nav')].map((n) => n.className).join(',') + ' mounted:' + !!document.getElementById('ftSwitch') + ' lang:' + document.documentElement.lang)}`);
      });   // the rail (phones: the More sheet)
      // the role switcher ("View as") and the way back to the website
      await page.goto(home); await page.waitForSelector(R.dash);
      await page.click('#ftSwitch summary');
      assert.match(await page.textContent('#ftSwitch .ft-menu'), /Family[\s\S]*Teacher[\s\S]*Director[\s\S]*Back to the website/);
      assert.match(await page.getAttribute('#ftWebsite', 'href'), /^https?:\/\/[^/]+\/futures-friends\/$/);
      const other = role === 'family' ? 'teacher' : 'family';
      await page.click(`#ftSwitch [data-ft-role="${other}"]`);
      await page.waitForSelector(ROLES[other].dash, { timeout: 30000 });
      assert.match(page.url(), new RegExp(`/portal-test/${ROLES[other].copy}c/${SLUG}/home`));
      // ?enter=<role> (the website's links) brings this role back
      await page.goto(`${BASE}/c/${SLUG}/?enter=${role}`); await page.waitForSelector(R.dash, { timeout: 30000 });

      // Spanish: the switch and the dashboard
      await page.click('#langSwitch');
      await page.waitForFunction(() => document.documentElement.lang === 'es');
      await page.waitForSelector(R.dash);
      await okPage(`${role} Spanish`);
      await page.click('#langSwitch'); await page.waitForFunction(() => document.documentElement.lang === 'en');

      // sign out: the sign-in page again
      await page.click('#signOut');
      await page.waitForSelector('#signinForm');

      assert.deepEqual([...outside], [], `requests outside the site (${role} ${width})`);
      assert.deepEqual(errors, [], `console errors (${role} ${width})`);
      t.diagnostic(`${role} ${width}px: ${visited.size} views, tabs and pages; ${empty.length} requests answered empty`);
      await ctx.close();
    }
  });
}

// Owner 2026-10-12 ("when you click on parent login it will go straight into it"): until go-live the header "Sign in" and the Family
// sign-in links of the website open this copy's sign-in page in the same tab (hub-link.js); at go-live (FF_HUB_URL set) they go back to
// the site's sign-in routes and the Hub. Home itself and the first-visit gate are unchanged (tests/first-visit, tests/entry-gate).
test('the website: the Sign in / Portals menu opens every portal (and each logo returns home) until go-live; back to the Hub routes at go-live', { skip: !harness && 'playwright-core not found (HUB_DIR)', timeout: 180000 }, async (t) => {
  const server = await startPages();
  const ORIGIN = `http://127.0.0.1:${server.address().port}`;
  const browser = await harness.chromium.launch();
  t.after(async () => { await browser.close(); server.close(); });
  for (const live of [false, true]) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await ctx.addInitScript(() => { try { sessionStorage.setItem('ff-entered', '1'); } catch (_) { /* blocked */ } });
    if (live) await ctx.route('**/hub-config.js*', async (r) => { const res = await r.fetch(); r.fulfill({ response: res, body: (await res.text()).replace("window.FF_HUB_URL = '';", "window.FF_HUB_URL = 'https://hub.example.test';") }); });
    const page = await ctx.newPage();
    await page.goto(`${ORIGIN}/futures-friends/`);
    await page.waitForSelector('a.ffw-signin', { state: 'attached' });
    await page.waitForTimeout(400);
    assert.equal(await page.getAttribute('a.ffw-signin', 'href'), live ? '#sign-in' : 'portal-test/c/test-family-demo-center/?enter=family', `header link (live=${live})`);
    const links = await page.$$eval('a[href^="#signin-"], a[data-hub-preview]', (as) => as.map((a) => [a.getAttribute('data-hub-preview'), a.getAttribute('href')]));
    if (!live) {
      for (const r of ['family', 'teacher', 'director']) assert.ok(links.some(([k, h]) => k === r && h === `portal-test/c/test-family-demo-center/?enter=${r}`), `${r} login on the site: ${JSON.stringify(links)}`);
      assert.ok(links.every(([k]) => k), 'every sign-in link is wired');
    }
    assert.ok(!/portal-test/.test(page.url()), 'Home stays Home');
    if (!live) {
      // the "Sign in / Portals" menu: every portal, one tap (FFHubLink.menu is the one list to extend, e.g. an Investor portal)
      for (const [id, dash, copy] of [['family', '#fdKpis', ''], ['teacher', '#sv2Kpis', 'staff/'], ['director', '#sv2Kpis', 'staff/'], ['kids', '#kcStart', 'kids/']]) {
        await page.goto(`${ORIGIN}/futures-friends/`); await page.waitForSelector('a.ffw-signin', { state: 'attached' }); await page.waitForTimeout(300);
        await page.evaluate(() => document.querySelector('a.ffw-signin').click());
        await page.waitForSelector('#ffPortals:not([hidden])');
        assert.deepEqual(await page.$$eval('#ffPortals a', (as) => as.map((a) => a.dataset.portal)), ['family', 'teacher', 'director', 'kids']);
        await page.click(`#ffPortals a[data-portal="${id}"]`);
        await page.waitForSelector(dash, { timeout: 30000 });
        assert.match(page.url(), new RegExp(`/portal-test/${copy}c/test-family-demo-center/${id === 'kids' ? 'kids' : 'home'}`), id);
        // and back: the logo opens the website home
        if (id !== 'kids') { await page.click('header .brand'); await page.waitForURL(/\/futures-friends\/(\?.*)?$/); }
      }
      await page.goto(`${ORIGIN}/futures-friends/`); await page.waitForSelector('a.ffw-signin', { state: 'attached' }); await page.waitForTimeout(300);
    }
    await page.evaluate(() => document.querySelector('a.ffw-signin').click());
    if (live) {
      await page.waitForFunction(() => location.hash === '#sign-in');
      assert.match(await page.textContent('#hubLink'), /Sign in to the Futures Hub/);
      assert.equal(await page.$('#hubPreviewGo'), null);
    } else {
      await page.waitForSelector('#ffPortals:not([hidden])');   // the menu again; Escape closes it
      await page.keyboard.press('Escape'); assert.equal(await page.$('#ffPortals:not([hidden])'), null);
    }
    await ctx.close();
  }
});
