// Home hero motion, real-browser evidence (headless Chromium via the hub repo's playwright-core; no Hub, no network).
// At 1440, 1280, 1024, 768 and 390: during the entrance every hero cut-out's rendered box keeps the art's natural ratio (within 0.5%)
// and every transform on the way up to the root is uniform (no stretch, no shear); no horizontal overflow; no console errors
// (the optional *.local.js configs are absent on purpose). Then: reduced motion and the site's motion switch are static and
// complete; the stage loops pause off screen and on a hidden tab; one tab stop and arrow keys for the friends.
// Run:  node --test tests/browser/hero-motion.browser.mjs        (HUB_DIR defaults to /Volumes/FFCRM/app; PORT to 8883)
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const SITE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const { chromium } = createRequire(join(process.env.HUB_DIR ?? '/Volumes/FFCRM/app', 'hub/package.json'))('playwright-core');
const PORT = +(process.env.PORT ?? 8883);
const COMMIT = execSync('git rev-parse --short HEAD', { cwd: SITE }).toString().trim();
const URL0 = `http://127.0.0.1:${PORT}/?fresh=${COMMIT}-${Date.now()}#home`;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json' };
let server, browser;

before(async () => {
  server = createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    const f = normalize(join(SITE, p));
    if (!f.startsWith(SITE) || !existsSync(f) || statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }); createReadStream(f).pipe(res);
  });
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); server?.close(); });

// Samples every animation frame for 3.5 s: hero box ratio vs natural, and the linear part of all transforms up the tree.
const SAMPLER = () => {
  window.__s = [];
  const lin = el => {
    let a = 1, b = 0, c = 0, d = 1;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n), ms = [];
      if (cs.scale && cs.scale !== 'none') { const [sx, sy = sx] = cs.scale.split(' ').map(parseFloat); ms.push(new DOMMatrix().scale(sx, sy)); }
      if (cs.rotate && cs.rotate !== 'none') ms.push(new DOMMatrix().rotate(parseFloat(cs.rotate)));
      if (cs.transform && cs.transform !== 'none') ms.push(new DOMMatrix(cs.transform));
      let m = new DOMMatrix(); ms.reverse().forEach(x => { m = x.multiply(m); });
      [a, b, c, d] = [m.a * a + m.c * b, m.b * a + m.d * b, m.a * c + m.c * d, m.b * c + m.d * d];
    }
    const sx = Math.hypot(a, b), sy = Math.hypot(c, d);
    return { aniso: Math.abs(sx / sy - 1), shear: Math.abs(a * c + b * d) / (sx * sy) };
  };
  const tick = () => {
    document.querySelectorAll('.ffa-fig img,.fj-doorart img').forEach(img => {
      const r = img.getBoundingClientRect(); if (!img.naturalWidth || !r.width) return;
      const hero = !!img.closest('.ffa-fig'), u = lin(img);
      window.__s.push({ hero, ratioErr: hero ? Math.abs((r.width / r.height) / (img.naturalWidth / img.naturalHeight) - 1) : 0, ...u });
    });
    if (performance.now() < (window.FFHeroWorld ? 3500 + window.FFHeroWorld.LEAD + 700 : 3500)) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

for (const [w, h] of [[1440, 900], [1280, 800], [1024, 768], [768, 1024], [390, 844]]) {
  test(`${w}px: friends keep their exact proportions through the entrance; no overflow; no console errors`, async () => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage(), errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error' && !/\.local\.js$/.test(m.location().url || '')) errors.push(m.text()); });
    await page.addInitScript(SAMPLER);
    await page.goto(URL0);
    await page.waitForTimeout(3800);
    // Wave 7: the cast's entrance follows the world's opening; sample it to the end (was 3.5 s from load)
    await page.waitForTimeout(await page.evaluate(() => (window.FFHeroWorld ? window.FFHeroWorld.LEAD + 700 : 0)));
    const r = await page.evaluate(() => {
      const s = window.__s, hero = s.filter(x => x.hero);
      return { n: hero.length, ratio: Math.max(...hero.map(x => x.ratioErr)), aniso: Math.max(...s.map(x => x.aniso)), shear: Math.max(...s.map(x => x.shear)),
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, live: document.querySelector('.ffa-stage').classList.contains('ffm-live') };
    });
    assert.ok(r.n > 200, `sampled every frame (${r.n})`);
    assert.ok(r.ratio < 0.005, `hero box vs natural ratio ${r.ratio}`);
    assert.ok(r.aniso < 1e-6 && r.shear < 1e-6, `uniform transforms only (aniso ${r.aniso}, shear ${r.shear})`);
    assert.equal(r.overflow, 0, 'no horizontal overflow');
    assert.ok(r.live, 'motion is on by default');
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}

for (const [name, opts, init] of [['device reduced motion', { reducedMotion: 'reduce' }, null], ['site motion switch off', {}, () => { try { localStorage.setItem('ff-display-preferences', '{"motion":false}'); } catch (e) {} }]]) {
  test(`${name}: the hero is static and complete from the first frame`, async () => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, ...opts });
    const page = await ctx.newPage(); if (init) await page.addInitScript(init);
    await page.goto(URL0); await page.waitForTimeout(120);
    const s = await page.evaluate(() => ({
      live: document.querySelector('.ffa-stage').classList.contains('ffm-live'),
      running: document.getAnimations().filter(a => a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('.px-homehero, .fj-doors')).length,
      friends: [...document.querySelectorAll('.ffa-friend')].map(f => getComputedStyle(f).transform),
      words: [...document.querySelectorAll('.ffm-w')].map(x => getComputedStyle(x).opacity), tagline: document.querySelector('.px-herocopy > p').textContent }));
    assert.equal(s.live, false);
    assert.equal(s.running, 0, 'no animation anywhere in the hero or doors');
    assert.deepEqual(s.friends, ['none', 'none', 'none', 'none']);
    assert.deepEqual(s.words, ['1', '1', '1', '1']);
    assert.equal(s.tagline, 'Learn. Move. Explore. Belong.');
    await page.locator('.ffa-friend').nth(2).click({ force: true });
    assert.equal(await page.locator('.ffa-say').textContent(), 'Zuri Curious minds go further.');
    assert.equal(await page.locator('.ffa-stage [role=status]').textContent(), 'Zuri: Curious minds go further.');
    await ctx.close();
  });
}

test('loops pause off screen and on a hidden tab; keyboard reaches every friend from one tab stop', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  // Wave 7: the cast's sway starts once they have arrived, after the world's opening (FFHeroWorld lead); was a flat 2600 ms wait
  await page.goto(URL0); await page.waitForTimeout(2600); await page.waitForTimeout(await page.evaluate(() => (window.FFHeroWorld ? window.FFHeroWorld.LEAD + 1200 : 0)));
  const loops = () => page.evaluate(() => [...new Set(document.querySelector('.ffa-stage').getAnimations({ subtree: true }).filter(a => a instanceof CSSAnimation).map(a => a.playState))]);
  assert.deepEqual(await loops(), ['running']);
  await page.evaluate(() => scrollTo(0, 2600)); await page.waitForTimeout(300);
  assert.deepEqual(await loops(), ['paused'], 'off screen: every loop paused');
  await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(300);
  assert.deepEqual(await loops(), ['running']);
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  assert.deepEqual(await loops(), ['paused'], 'hidden tab: every loop paused');
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.locator('.px-heroactions a').last().focus();
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.k), 'booker');
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.k), 'lumi');
  await page.keyboard.press('Enter'); await page.waitForTimeout(300);
  assert.equal(await page.locator('.ffa-say').textContent(), 'Lumi Kindness brightens every day.');
  await page.keyboard.press('Tab');
  assert.ok(await page.evaluate(() => !document.activeElement.classList.contains('ffa-friend')), 'one tab stop for the four friends');
  await ctx.close();
});
