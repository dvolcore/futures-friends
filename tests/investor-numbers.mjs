// Number integrity for the investor portal (owner 2026-10-12: "every figure on the page must be identical before and after").
// extract(page) reads every currency, percentage and number token a reader can find on an investor page once the model has loaded:
// the text of <main> (closed <details> included, since a tap opens them) plus aria-label / aria-valuetext, which screen readers speak.
// The documents drawer is left out (it lists file sizes and page counts, checked against publication-manifest.json on their own).
// Run as a tool to (re)record the baseline from the CURRENT tree:  node tests/investor-numbers.mjs --record <label>
// The committed baseline (tests/fixtures/investor-numbers.json) was recorded on release-platform 4de0101, before the portal work.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { startSite, SITE } from './a11y-harness.mjs';

export const PAGES = { overview: 'investor/Digital/index.html', plan: 'investor/Digital/pilot-plan.html' };
export const TOKEN = /[−-]?\$\d{1,3}(?:,\d{3})+(?:\.\d+)?|[−-]?\$\d+(?:\.\d+)?|\d{1,3}(?:,\d{3})+(?:\.\d+)?%?|\d+(?:\.\d+)?%?/g;

export async function extract(page) {
  return page.evaluate((src) => {
    const re = new RegExp(src, 'g');
    const root = document.querySelector('main') || document.body;
    // aria-hidden text is decoration (a number split into per-digit boxes carries its value in aria-label instead)
    const skip = (n) => n.closest && n.closest('[data-inv-docs], script, style, template, [aria-hidden="true"]');
    const parts = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) if (!skip(n.parentElement)) parts.push(n.nodeValue);
    for (const el of root.querySelectorAll('[aria-label], [aria-valuetext]')) if (!skip(el)) parts.push(el.getAttribute('aria-label') || '', el.getAttribute('aria-valuetext') || '');
    const all = parts.join('   ').match(re) || [];
    return [...new Set(all.map((t) => t.replace(/^-/, '−')))].sort();
  }, TOKEN.source);
}

// Loads a page with the reveal off (final values at once) and waits for the model.
export async function load(page, base, path, query = '') {
  await page.goto(`${base}${path}${query}`);
  await page.waitForFunction(() => document.documentElement.dataset.modelVersion || document.querySelector('#lines tr:nth-child(2)') || document.getElementById('dataError')?.hidden === false, null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(400);
}

if (process.argv[2] === '--record') {
  const { chromium } = createRequire('/Volumes/FFCRM/app/hub/package.json')('playwright-core');
  const srv = await startSite();
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const pg = await ctx.newPage();
  const out = { recorded: new Date().toISOString().slice(0, 10), base: process.argv[3] || 'unknown', pages: {} };
  for (const [k, p] of Object.entries(PAGES)) { await load(pg, srv.base, p, '?reveal=off'); out.pages[k] = await extract(pg); }
  writeFileSync(join(SITE, 'tests/fixtures/investor-numbers.json'), JSON.stringify(out, null, 1) + '\n');
  console.log(Object.fromEntries(Object.entries(out.pages).map(([k, v]) => [k, v.length])));
  await b.close(); await srv.close();
}
