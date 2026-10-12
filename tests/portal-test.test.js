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
const FIX = JSON.parse(read('portal-test/fixtures.json'));

// ------------------------------------------------------------------------------------------------------------------- static
test('the test copy is hidden from search and from the site navigation', () => {
  for (const f of ['portal-test/index.html', `portal-test/c/${SLUG}/index.html`]) {
    const h = read(f);
    assert.match(h, /<meta name="robots" content="noindex, nofollow">/, f);
    assert.match(h, /<base href="\/futures-friends\/portal-test\/">/, f);
    assert.ok(h.indexOf('test-mode.js') < h.indexOf('app.js') && h.indexOf('clock.js') < h.indexOf('test-mode.js'), `${f}: the adapter loads before the app`);
  }
  assert.match(read('robots.txt'), /^Disallow: \/futures-friends\/portal-test\/$/m);
  assert.doesNotMatch(read('sitemap.xml'), /portal-test/);
  // Owner 2026-10-12: until go-live the site's "Sign in" / Family sign-in open the copy (hub-link.js, the one place that links to it);
  // no page, menu or sitemap lists it otherwise.
  const linking = fs.readdirSync(ROOT).filter((f) => /\.(html|js)$/.test(f) && !['404.html', 'hub-link.js'].includes(f)).filter((f) => /portal-test/.test(read(f).replace(/<a href="portal-test\/c\/test-family-demo-center\/" data-hub-preview="">/g, '')));
  assert.deepEqual(linking, [], 'only hub-link.js (and the links it rewrote, data-hub-preview, in prerendered pages) points at the test copy');
  assert.match(read('404.html'), /portal-test.*location\.replace\(m\[1\]\+'\/\?p='/, '404.html sends the copy\'s deep links to its page');
});

test('no secrets, keys, tokens or local addresses; logins are salted hashes only', () => {
  const logins = JSON.parse(read('portal-test/logins.json'));
  assert.equal(logins.length, 5);
  for (const l of logins) {
    assert.deepEqual(Object.keys(l).sort(), ['email', 'hash', 'salt']);
    assert.match(l.email, /^tester[1-5]@futuresfriends-test\.app$/);
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
  for (const e of FIX.entries) { try { visit(JSON.parse(e.b)); } catch (_) { /* not JSON */ } }
  assert.ok(real.size <= 9, `${real.size} skill lines with real wording (3 skills, each in up to 3 wordings)`);
  for (const e of FIX.entries) {
    assert.doesNotMatch(e.b, /"steps(_es)?":\s*\[\s*"/, `${e.k}: activity steps`);
    assert.doesNotMatch(e.k, /menu180|curriculum|library\/catalog/, `${e.k}: curriculum or catalogue data`);
  }
  assert.ok(!FILES.some((f) => /curriculum-indicators|unit\d+-(data|prep|family)|menu-?180|library-catalog/.test(f)));
});

test('fake data only: the demo center, the felt-art "photos", no real addresses', () => {
  assert.equal(FIX.slug, SLUG);
  assert.match(FIX.note, /fake demo data/i);
  const emails = new Set(FIX.entries.flatMap((e) => e.b.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}/g) || []));
  for (const m of emails) assert.match(m, /futuresfriends-test\.app$|\.local$|example\.(com|org)$|\.test$/, m);
  const photos = FILES.filter((f) => f.startsWith('portal-test/sb/'));
  for (const f of photos) assert.match(f, /\/demo-[\w-]+\.png$/, f);
});

// ------------------------------------------------------------------------------------------------------------------- browser
const PASSWORD = 'portal-test-' + crypto.randomBytes(6).toString('hex');
const SALT = crypto.randomBytes(12).toString('hex');
const LOGIN = { email: 'tester9@futuresfriends-test.app', salt: SALT, hash: crypto.createHash('sha256').update(`${SALT}:${PASSWORD}`).digest('hex') };
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.webp': 'image/webp', '.woff2': 'font/woff2', '.txt': 'text/plain', '.svg': 'image/svg+xml' };
// Like GitHub Pages for a project site: /futures-friends/<path>, a folder serves its index.html, anything missing gets 404.html (404).
function startPages() {
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    if (u.pathname === '/futures-friends/portal-test/logins.json') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify([LOGIN])); }
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

test('in the browser: sign in, every sheet and page, both children, Spanish, writes, deep links, no errors, nothing leaves the site, axe', { skip: !harness && 'playwright-core not found (HUB_DIR)', timeout: 600000 }, async (t) => {
  const server = await startPages();
  const port = server.address().port;
  assert.ok(![8765, 8791, 8811].includes(port));
  const ORIGIN = `http://127.0.0.1:${port}`, BASE = `${ORIGIN}/futures-friends/portal-test`;
  const browser = await harness.chromium.launch();
  t.after(async () => { await browser.close(); server.close(); });

  for (const width of [390, 1440]) {
    const ctx = await browser.newContext({ viewport: { width, height: width < 500 ? 844 : 900 }, ...(width < 500 ? { isMobile: true, hasTouch: true } : {}) });
    const page = await ctx.newPage();
    const errors = [], outside = new Set(), warnings = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`${page.url()}: ${m.text()}`); if (m.type() === 'warning' && /test copy/.test(m.text())) warnings.push(m.text()); });
    page.on('pageerror', (e) => errors.push(`${page.url()}: ${e.message}`));
    page.on('request', (r) => { const o = new URL(r.url()).origin; if (o !== ORIGIN) outside.add(o); });
    page.on('response', (r) => { if (r.status() >= 400 && !/\/404\.html$|\/futures-friends\/portal-test\/c\/[^?]+\/[a-z]/.test(r.url())) errors.push(`${r.status()} ${r.url()}`); });
    const axeRun = async () => {
      // the arrival animations (fades, count-ups) end first: contrast is checked on the settled page (as hub/tests/family-dashboard-browser does)
      await page.waitForFunction(() => !document.querySelector('#familyDash.fd-anim') && !document.getAnimations().some((a) => a.playState === 'running' && a.effect?.getComputedTiming?.().iterations !== Infinity), null, { timeout: 10000 }).catch(() => {});
      if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ content: AXE });
      return page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }))
        .violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`));
    };

    // sign-in page: the banner, wrong password, sign-in links off, axe
    await page.goto(`${BASE}/c/${SLUG}/`);
    await page.waitForSelector('#signinForm');
    assert.match(await page.textContent('#ftBanner'), /Test version · fake demo family · nothing is saved/);
    await page.click('#ftBanner button');
    assert.match(await page.textContent('#ftNote'), /person who sent you this link/);
    await page.click('#ftNote button');
    await page.waitForTimeout(700);
    assert.deepEqual(await axeRun(), [], `axe on the sign-in page at ${width}`);
    await page.fill('#email', LOGIN.email);
    await page.click('#magic');
    assert.match(await page.textContent('#signinMsg'), /Sign-in links are off in the test version/);
    await page.fill('#password', 'not-the-password');
    await page.click('#signinForm button[type=submit]');
    await page.waitForFunction(() => /do not match/.test(document.querySelector('#signinMsg')?.textContent || ''));
    await page.fill('#password', PASSWORD);
    await page.click('#signinForm button[type=submit]');
    await page.waitForSelector('#fdToday', { timeout: 30000 }).catch(async (e) => { throw new Error(`no dashboard: ${await page.textContent('#main').catch(() => '')} | ${errors.join(' | ')} | ${page.url()}`); });
    assert.match(await page.textContent('#main'), /Pat/, 'the greeting uses the demo parent');

    // both children: every tile opens its sheet; every page they link to opens without an error card
    const links = new Set();
    for (const kid of ['demo-mia', 'demo-noah']) {
      await page.goto(`${BASE}/c/${SLUG}/home?kid=${kid}`);
      await page.waitForSelector('#fdToday');
      await page.waitForTimeout(500);
      if (kid === 'demo-mia' && width === 1440) {
        // Two findings that the REAL hub front-end has with the rich demo data too (checked against hub/web on 2026-10-12; reported to the
        // platform: the pickup avatars' initials contrast, and the photo strip / portfolio carousel need tabindex="0"). The copy must not add any.
        const KNOWN = /^(color-contrast: (li:nth-child\(\d\) > \.fd-pk-a\.fd-person-av\[aria-hidden="true"\]( \| )?)+|scrollable-region-focusable: \.fd-photo-strip \| \.fd-work)$/;
        assert.deepEqual((await axeRun()).filter((v) => !KNOWN.test(v)), [], 'axe on the dashboard');
      }
      for (const a of await page.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href')))) if (a.includes(`/portal-test/c/${SLUG}/`) && !/\/home(\?|$)/.test(a)) links.add(a);
      const tiles = await page.$$eval('a.fd-kpi[data-sheet]', (as) => as.map((a) => a.id));
      assert.ok(tiles.length >= 10, `${kid}: ${tiles.length} tiles`);
      for (const id of tiles) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.click(`#${id}`);
        await page.waitForTimeout(450);
        const open = await page.$('#fdSheet[open]');
        if (open) {
          for (const a of await page.$$eval('#fdSheet a[href]', (as) => as.map((a) => a.getAttribute('href')))) if (a.includes('/portal-test/c/')) links.add(a);
          await page.goBack();
          await page.waitForFunction(() => !document.querySelector('#fdSheet[open]'));
        } else {
          await page.goto(`${BASE}/c/${SLUG}/home?kid=${kid}`); await page.waitForSelector('#fdToday');
        }
      }
    }
    assert.ok(links.size >= 15, `${links.size} pages linked`);
    for (const href of links) {
      await page.goto(ORIGIN + href);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(250);
      const bad = await page.evaluate(() => {
        const alert = document.querySelector('#main .msg.bad[role=alert]');
        const miss = document.querySelector('#deepMiss');
        return alert ? `error: ${alert.textContent}` : (document.title.startsWith('Page not found') ? 'not found' : (miss && /not available|no longer/.test(miss.textContent) ? `miss: ${miss.textContent}` : null));
      });
      assert.equal(bad, null, href);
    }

    // a write: acknowledging the incident says "nothing is saved"
    const inc = [...links].find((h) => /\/incident\?id=/.test(h));
    assert.ok(inc, 'the incident is linked');
    await page.goto(ORIGIN + inc);
    await page.waitForSelector('#incAckForm');
    await page.fill('#incName', 'Test Tester');
    await page.click('#incAckForm button[type=submit]');
    await page.waitForSelector('#ftToast:not([hidden])');
    assert.equal(await page.textContent('#ftToast'), 'This is a test version: nothing is saved.');

    // a deep link opened from outside goes through the site's 404.html to the same page
    await page.goto(`${BASE}/c/${SLUG}/grades?kid=demo-mia`);
    await page.waitForURL(/\/portal-test\/c\/test-family-demo-center\/grades\?kid=demo-mia$/);
    await page.waitForLoadState('networkidle');
    assert.equal(await page.$('#main .msg.bad[role=alert]'), null);

    // Spanish: the switch, the dashboard and the banner
    await page.goto(`${BASE}/c/${SLUG}/home?kid=demo-mia`);
    await page.waitForSelector('#fdToday');
    await page.click('#langSwitch');
    await page.waitForFunction(() => document.documentElement.lang === 'es');
    await page.waitForSelector('#fdToday');
    await page.waitForTimeout(600);
    assert.match(await page.textContent('#ftBanner'), /Versión de prueba/);
    assert.match(await page.textContent('#main'), /Buenas tardes|Hola/);
    await page.reload(); await page.waitForSelector('#fdToday');
    assert.equal(await page.evaluate(() => document.documentElement.lang), 'es', 'Spanish stays after a reload');
    await page.click('#langSwitch'); await page.waitForFunction(() => document.documentElement.lang === 'en');

    // sign out lands on the sign-in page of the demo center
    await page.click('#signOut');
    await page.waitForSelector('#signinForm');
    assert.match(page.url(), /\/portal-test\/c\/test-family-demo-center$/);

    assert.deepEqual([...outside], [], `requests outside the site at ${width}`);
    assert.deepEqual(errors, [], `console errors at ${width}`);
    t.diagnostic(`${width}px: ${links.size} pages, ${warnings.length} requests answered empty`);
    await ctx.close();
  }
});

// Owner 2026-10-12 ("when you click on parent login it will go straight into it"): until go-live the header "Sign in" and the Family
// sign-in links of the website open this copy's sign-in page in the same tab (hub-link.js); at go-live (FF_HUB_URL set) they go back to
// the site's sign-in routes and the Hub. Home itself and the first-visit gate are unchanged (tests/first-visit, tests/entry-gate).
test('the website: header "Sign in" and Family sign-in go straight to the test portal until go-live; back to the Hub routes at go-live', { skip: !harness && 'playwright-core not found (HUB_DIR)', timeout: 180000 }, async (t) => {
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
    assert.equal(await page.getAttribute('a.ffw-signin', 'href'), live ? '#sign-in' : 'portal-test/c/test-family-demo-center/', `header link (live=${live})`);
    const fam = await page.$$eval('a[href="#signin-family"], a[data-hub-preview]', (as) => as.map((a) => a.getAttribute('href')));
    if (!live) assert.ok(fam.length >= 1 && fam.every((h) => h === 'portal-test/c/test-family-demo-center/'), fam.join(' '));
    assert.ok(!/portal-test/.test(page.url()), 'Home stays Home');
    await page.evaluate(() => document.querySelector('a.ffw-signin').click());
    if (live) {
      await page.waitForFunction(() => location.hash === '#sign-in');
      assert.match(await page.textContent('#hubLink'), /Sign in to the Futures Hub/);
      assert.equal(await page.$('#hubPreviewGo'), null);
    } else {
      await page.waitForURL(/\/futures-friends\/portal-test\/c\/test-family-demo-center\/$/);
      await page.waitForSelector('#signinForm');
      assert.match(await page.textContent('#ftBanner'), /Test version · fake demo family · nothing is saved/, 'the banner is on the sign-in page');
    }
    await ctx.close();
  }
});
