// Floating Sound and Nature controls never sit on the cart, add-to-bag, checkout, contact or sticky purchase actions (audit A6).
// At 1440, 1280, 768, 390 and 360 wide, on #enroll, #book-demo, #room-planner, a product page, #cart and #contact, scrolled top to bottom.
// Run:  node --test tests/browser/float-clear.browser.mjs        (HUB_DIR defaults to /Volumes/FFCRM/app; PORT to 8894)
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


const SIZES = [[1440, 900], [1280, 800], [768, 1024], [390, 844], [360, 740]];
const ROUTES = ['enroll', 'book-demo', 'room-planner', 'product/kit-home', 'cart', 'contact'];
const ACTION = /add to (bag|cart)|check ?out|view (full )?(bag|cart)|place (my )?order|send (my )?(request|layout)|request (a )?(quote|tour)|contact|email|call\b|book a (demo|tour)|apply|submit/i;

for (const [w, h] of SIZES) {
  test(`controls stay clear of purchase and contact actions at ${w}`, async () => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    await ctx.addInitScript(() => { try { sessionStorage.setItem('ff-entered', '1'); } catch (_) {} });
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/?nogate&nostamp`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    const hits = []; let seen = 0;
    for (const r of ROUTES) {
      await page.evaluate(x => { location.hash = x; }, r); await page.waitForTimeout(1500);
      const H = await page.evaluate(() => document.body.scrollHeight);
      for (let y = 0; y <= H; y += Math.round(h * 0.4)) {
        await page.evaluate(v => window.scrollTo(0, v), y); await page.waitForTimeout(300);
        const out = await page.evaluate(re => {
          const rx = new RegExp(re, 'i'), vis = e => { const s = getComputedStyle(e), q = e.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > .05 && q.width > 8 && q.height > 8; };
          const out = []; out.seen = [...document.querySelectorAll('.ffs-btn')].filter(vis).length;
          for (const c of [...document.querySelectorAll('.ffs-btn')].filter(vis)) { const a = c.getBoundingClientRect();
            for (const o of document.querySelectorAll('button,a,input[type=submit],.sp-buybar.is-on,.sp-viewcart,.cart-fab')) {
              if (o.closest('.ffs,.sp-drawer,dialog') || !vis(o)) continue;
              const t = (o.getAttribute('aria-label') || o.textContent || o.value || '').trim();
              if (!(o.matches('.sp-buybar.is-on,.sp-viewcart,.cart-fab') || (t.length < 40 && rx.test(t)))) continue;
              const q = o.getBoundingClientRect(); if (a.left < q.right && a.right > q.left && a.top < q.bottom && a.bottom > q.top && q.right > 0 && q.left < innerWidth) out.push(t.slice(0, 30) || o.className); } }
          return { out, seen: out.seen }; }, ACTION.source);
        seen = Math.max(seen, out.seen);
        for (const o of out.out) hits.push(`${r}@${y}: ${o}`);
      }
    }
    await ctx.close();
    assert.ok(seen > 0, 'the floating controls are on the page');
    assert.deepEqual(hits, []);
  });
}
