// Regression: Booker must follow the stitched felt trail down the Home page the whole way, not pop in and out.
// Owner report 2026-10-08 (iPhone Safari, 390 px): "periodically pops in and out but doesn't do the full follow".
// Before the fix, at 390 px the text/tap-target hiding rule (made for wide screens) hid him on ~85% of scroll positions, and the
// toolbar-driven window resize rebuilt the trail and replaced him. This test scrolls Home in steps (phone 390x844 touch + desktop
// 1440) and records his box: he must be visible, on screen and moving monotonically down the page for almost all of the trail,
// and a height-only resize (iOS toolbar) must keep the same walker element on.
// Run:  node --test tests/browser/booker-follow.browser.mjs        (SITE_DIR=/path/to/older/checkout to test another tree)
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = process.env.SITE_DIR ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const HUB_DIR = process.env.HUB_DIR ?? '/Volumes/FFCRM/app';
const { chromium } = createRequire(join(HUB_DIR, 'hub/package.json'))('playwright-core');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp4': 'video/mp4' };
let server, base, browser;

before(async () => {
  server = createServer((req, res) => {
    const p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
    const file = join(SITE, p === '/' ? 'index.html' : p);
    if (!file.startsWith(SITE) || !existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));   // OS-chosen port, never a shared one
  base = `http://127.0.0.1:${server.address().port}/`;
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); server?.close(); });

async function openHome(opts) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  await page.goto(base, { waitUntil: 'load' });
  try { await page.getByText('Enter without sound').first().click({ timeout: 8000 }); } catch { /* no gate */ }
  await page.waitForTimeout(6000);
  assert.match(await page.evaluate(() => location.hash), /home/);
  return { ctx, page };
}
// inView: at least half of him is on screen (on phones he tucks against the screen edge)
const box = () => { const w = document.querySelector('.bw-walker'); if (!w) return { none: true };
  const r = w.getBoundingClientRect();
  return { on: w.classList.contains('is-on') && +getComputedStyle(w).opacity > 0.5, inView: r.bottom > 0 && r.top < innerHeight && Math.min(r.right, innerWidth) - Math.max(r.left, 0) >= r.width * 0.5, docY: r.top + scrollY }; };

async function walk(page, steps) {
  const H = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  const rows = [];
  for (let k = 0; k <= steps; k++) {
    await page.evaluate((y) => scrollTo(0, y), Math.round((H * k) / steps));
    await page.waitForTimeout(250);
    rows.push(await page.evaluate(box));
  }
  return rows;
}
function check(rows, minShare, maxGap) {
  assert.ok(rows.every((r) => !r.none), 'the walker exists');
  // the first stretch (hero) and the last (he has joined the friends in the night strip) are allowed to be empty
  const body = rows.slice(2, rows.length - 4);
  const seen = body.filter((r) => r.on && r.inView).length;
  assert.ok(seen / body.length >= minShare, `visible on ${seen}/${body.length} scroll steps (need ${Math.round(minShare * 100)}%)`);
  let last = -1e9;
  for (const r of rows.filter((x) => x.on)) { assert.ok(r.docY >= last - 2, `moves monotonically down the page (${r.docY} after ${last})`); last = r.docY; }
  // no long gap: never more than maxGap steps in a row without him
  let gap = 0, worst = 0; for (const r of body) { gap = r.on && r.inView ? 0 : gap + 1; worst = Math.max(worst, gap); }
  assert.ok(worst <= maxGap, `longest run of steps without him is ${worst}`);
}

describe('Booker follows the trail', () => {
  test('phone 390x844 (touch): visible for the whole trail, monotonic', async () => {
    const { ctx, page } = await openHome({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    check(await walk(page, 40), 0.85, 3);
    await ctx.close();
  });
  test('phone: a height-only resize (iOS toolbar) keeps the same walker on, no rebuild', async () => {
    const { ctx, page } = await openHome({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    await page.evaluate(() => scrollTo(0, 4300));
    await page.waitForTimeout(500);
    await page.evaluate(() => { const w = document.querySelector('.bw-walker'); window.__w = w; window.__layer = document.getElementById('bw-layer'); });
    for (const h of [764, 844, 780, 844]) { await page.setViewportSize({ width: 390, height: h }); await page.waitForTimeout(120); }
    await page.waitForTimeout(500);
    const r = await page.evaluate(() => ({ same: window.__w === document.querySelector('.bw-walker') && window.__layer === document.getElementById('bw-layer'), on: document.querySelector('.bw-walker').classList.contains('is-on') }));
    assert.ok(r.same, 'toolbar resize must not rebuild the trail or replace the walker');
    assert.ok(r.on, 'still visible after the toolbar resize');
    await ctx.close();
  });
  test('desktop 1440: visible for most of the trail, monotonic', async () => {
    const { ctx, page } = await openHome({ viewport: { width: 1440, height: 900 } });
    check(await walk(page, 40), 0.7, 5);   // wide screens still step aside for words (unchanged)
    await ctx.close();
  });
});
