// "Online requests open soon" on phones, real-browser evidence (headless Chromium via the hub repo's playwright-core; no network).
// At 390 wide, with the intake gateway off, the notice on #founding-partners and #jobs shows BOTH the Call (tel:) and the Email (mailto:)
// button, each visible, inside the viewport and at least 44px tall. The header's "Request a Quote" button stays hidden at 390 (the old
// unscoped `.acts .gold{display:none}` rule used to hide the Call button too). No horizontal page scroll.
// Run:  node --test tests/browser/call-btn.browser.mjs        (HUB_DIR defaults to /Volumes/FFCRM/app; PORT to 8893)
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const { chromium } = createRequire(join(process.env.HUB_DIR ?? '/Volumes/FFCRM/app', 'hub/package.json'))('playwright-core');
const PORT = +(process.env.PORT ?? 8893);
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

for (const route of ['founding-partners', 'jobs']) {
  test(`#${route} at 390: the open-soon notice shows Call and Email, both tappable (>= 44px)`, async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.addInitScript(() => { try { sessionStorage.setItem('ff-entered', '1'); } catch (_) {} });
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/?nogate&nostamp#${route}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.ffi-soon .acts a[href^="tel:"]', { state: 'attached' });
    const r = await page.evaluate(() => {
      const box = a => { const s = a.getBoundingClientRect(), cs = getComputedStyle(a); return { shown: cs.display !== 'none' && cs.visibility !== 'hidden' && s.width > 0, h: s.height, l: s.left, r: s.right }; };
      const soon = document.querySelector('.ffi-soon');
      const q = document.querySelector('header .acts .gold');
      return { call: box(soon.querySelector('a[href^="tel:"]')), mail: box(soon.querySelector('a[href^="mailto:"]')),
        quoteHidden: !q || getComputedStyle(q).display === 'none', scrollW: document.documentElement.scrollWidth };
    });
    for (const [name, b] of [['Call', r.call], ['Email', r.mail]]) {
      assert.ok(b.shown, `${name} button is visible`);
      assert.ok(b.h >= 44, `${name} button is at least 44px tall (${b.h})`);
      assert.ok(b.l >= 0 && b.r <= 390, `${name} button is inside the viewport (${b.l}..${b.r})`);
    }
    assert.ok(r.quoteHidden, 'the header Request a Quote button stays hidden on phones');
    assert.ok(r.scrollW <= 390, `no horizontal scroll (${r.scrollW})`);
    await ctx.close();
  });
}
