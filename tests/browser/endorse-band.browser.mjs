// Real-browser evidence for the endorsement band: it renders on #home, #centers, #enroll and #membership (and the store strip on #kids-shop),
// at 1440 and 390, with no horizontal scroll, the "Read the full statement" button opens the existing profile dialog, and the page has the
// headline, two blockquotes and two cites. Run:  node --test tests/browser/endorse-band.browser.mjs   (HUB_DIR defaults to /Volumes/FFCRM/app; PORT to 8894)
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const { chromium } = createRequire(join(process.env.HUB_DIR ?? '/Volumes/FFCRM/app', 'hub/package.json'))('playwright-core');
const PORT = +(process.env.PORT ?? 8894);
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

for (const width of [1440, 390]) for (const route of ['home', 'centers', 'enroll', 'membership']) {
  test(`#${route} at ${width}: the Trusted by professionals band renders, reads and opens the profile`, async () => {
    const ctx = await browser.newContext({ viewport: { width, height: width > 800 ? 900 : 844 } });
    await ctx.addInitScript(() => { try { sessionStorage.setItem('ff-entered', '1'); } catch (_) {} });
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/?nogate&nostamp#${route}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.ff-endorse[data-endorse="full"]', { state: 'attached' });
    const r = await page.evaluate(() => {
      const b = document.querySelector('.ff-endorse'), cs = getComputedStyle(b), box = b.getBoundingClientRect();
      return { h2: b.querySelector('h2')?.textContent, quotes: b.querySelectorAll('blockquote').length, cites: b.querySelectorAll('cite').length, imgs: [...b.querySelectorAll('img')].map(i => i.alt),
        visible: cs.display !== 'none' && box.height > 200, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, count: document.querySelectorAll('.ff-endorse').length };
    });
    assert.equal(r.h2, 'Trusted by professionals'); assert.equal(r.quotes, 2); assert.equal(r.cites, 2); assert.equal(r.count, 1);
    assert.ok(r.visible); assert.ok(r.sw <= r.cw, 'no horizontal scroll');
    assert.ok(r.imgs.every(a => a.length > 10), 'alt text names the person and role');
    await page.click('.ff-endorse [data-advisor-profile="melissa"]');
    assert.equal(await page.evaluate(() => document.querySelector('dialog.ff-advisor-dialog')?.open), true);
    await ctx.close();
  });
}
test('#kids-shop at 390 and 1440: a slim credibility strip, below the first collection, no horizontal scroll', async () => {
  for (const width of [1440, 390]) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    await ctx.addInitScript(() => { try { sessionStorage.setItem('ff-entered', '1'); } catch (_) {} });
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/?nogate&nostamp#kids-shop`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.ff-endorse[data-endorse="strip"]', { state: 'attached' });
    const r = await page.evaluate(() => { const s = document.querySelector('.ff-endorse').getBoundingClientRect(), c = document.querySelector('.sf-cols').getBoundingClientRect();
      return { below: s.top >= c.bottom - 1, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }; });
    assert.ok(r.below); assert.ok(r.sw <= r.cw);
    await ctx.close();
  }
});
