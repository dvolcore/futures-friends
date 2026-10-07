#!/usr/bin/env node
// Builds the flagship print kit (launch checklist E04-E09) from HTML to US Letter PDFs with headless Chromium.
//
//   node tools/build-print-kit.mjs
//
// Sources: printables/marketing/src/*.html + kit.css (site fonts and art only: fonts/, img/brand/, img/cut_*.webp).
// Output:  printables/marketing/futures-kit-*.pdf, one per entry of PRINT_KIT in family-library-data.js.
// Chromium comes from playwright-core in the platform repo (HUB_DIR, default /Volumes/FFCRM/app), as in the a11y tests.
// The build fails if any page overflows its 8.5 x 11 in box, an image is missing or stretched, a brand font did not load,
// or a draft PDF is missing its draft label on any page. The QR code (tour booking page) is regenerated with reportlab
// when python3 + reportlab are present; otherwise the committed qr-tour.svg is used. Fredoka (a variable font) is pinned to a
// static SemiBold instance with fontTools when available, so PDFs embed TrueType instead of Type 3 glyphs.
import { execFileSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { SITE, loadChromium, startSite } from '../tests/a11y-harness.mjs';

const require = createRequire(import.meta.url);
const { PRINT_KIT } = require(join(SITE, 'family-library-data.js'));
const SRC = 'printables/marketing/src';
const SOURCE = {
  'flyer': 'flyer.html', 'enrollment-checklist': 'enrollment-checklist.html', 'business-cards': 'director-business-cards.html',
  'photo-consent': 'photo-consent.html', 'media-release': 'media-release-form.html', 'library-card-sheet': 'library-card-sheet.html'
};
export const TOUR_URL = 'https://dvolcore.github.io/futures-friends/#enroll';

function buildQr() {
  const out = join(SITE, SRC, 'qr-tour.svg');
  const py = `
import sys
from reportlab.graphics.barcode.qr import QrCodeWidget
w = QrCodeWidget(sys.argv[1], barLevel='M'); q = w.qr; q.make(); n = q.getModuleCount(); m = 4
cells = ''.join(f'M{c+m} {r+m}h1v1h-1z' for r in range(n) for c in range(n) if q.isDark(r, c))
print(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {n+2*m} {n+2*m}" shape-rendering="crispEdges" role="img" aria-label="QR code: {sys.argv[1]}"><rect width="100%" height="100%" fill="#fff"/><path fill="#0A2B38" d="{cells}"/></svg>')
`;
  try { writeFileSync(out, execFileSync('python3', ['-c', py, TOUR_URL], { encoding: 'utf8' })); }
  catch (e) { if (!existsSync(out)) throw new Error(`no QR code: python3 + reportlab needed the first time (${e.message})`); console.warn('QR: kept the committed qr-tour.svg'); }
}

function buildFont() {
  const out = join(SITE, SRC, 'fredoka-600-static.woff2');
  const py = `
import sys
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
f = instancer.instantiateVariableFont(TTFont(sys.argv[1]), {'wght': 600}, updateFontNames=True); f.flavor = 'woff2'; f.save(sys.argv[2])
`;
  try { execFileSync('python3', ['-c', py, join(SITE, 'fonts/fredoka-latin.woff2'), out]); }
  catch (e) { if (!existsSync(out)) throw new Error(`no static Fredoka: python3 + fontTools (brotli) needed the first time (${e.message})`); console.warn('font: kept the committed fredoka-600-static.woff2'); }
}

// Runs in the page: every problem a printer would show us.
function inspect(label) {
  const bad = [];
  const pages = [...document.querySelectorAll('.page')];
  pages.forEach((pg, i) => {
    const box = pg.getBoundingClientRect();
    if (pg.scrollHeight > pg.clientHeight + 1 || pg.scrollWidth > pg.clientWidth + 1) bad.push(`page ${i + 1}: content scrolls (${pg.scrollWidth}x${pg.scrollHeight} in ${pg.clientWidth}x${pg.clientHeight})`);
    for (const el of pg.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (!r.width && !r.height) continue;
      if (r.left < box.left - 1 || r.top < box.top - 1 || r.right > box.right + 1 || r.bottom > box.bottom + 1)
        bad.push(`page ${i + 1}: <${el.tagName.toLowerCase()} class="${el.className}"> sticks out of the page`);
      if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflow === 'hidden' && !el.classList.contains('page') && !el.classList.contains('card'))
        bad.push(`page ${i + 1}: <${el.tagName.toLowerCase()} class="${el.className}"> clips its text`);
    }
    if (label && !pg.querySelector('.draft')?.textContent.includes(label)) bad.push(`page ${i + 1}: draft label "${label}" missing`);
  });
  for (const img of document.images) {
    if (!img.complete || !img.naturalWidth) { bad.push(`image did not load: ${img.getAttribute('src')}`); continue; }
    const r = img.getBoundingClientRect(), want = img.naturalWidth / img.naturalHeight, got = r.width / r.height;
    if (Math.abs(got / want - 1) > 0.01) bad.push(`image stretched: ${img.getAttribute('src')} (${got.toFixed(3)} vs ${want.toFixed(3)})`);
  }
  for (const f of ['600 12px "Fredoka Print"', '400 12px Poppins', '600 12px Poppins']) if (!document.fonts.check(f)) bad.push(`font not loaded: ${f}`);
  return { pages: pages.length, bad };
}

async function main() {
  buildQr();
  buildFont();
  const site = await startSite();
  const browser = await loadChromium().launch();
  let failed = 0;
  try {
    const ctx = await browser.newContext({ viewport: { width: 816, height: 1056 } });
    const page = await ctx.newPage();
    await page.emulateMedia({ media: 'print' });
    for (const k of PRINT_KIT) {
      const src = SOURCE[k.id];
      if (!src) throw new Error(`no source mapped for print kit entry ${k.id}`);
      await page.goto(`${site.base}${SRC}/${src}`, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      const r = await page.evaluate(inspect, k.draft);
      if (r.pages !== k.pages) r.bad.push(`${r.pages} pages, data says ${k.pages}`);
      if (r.bad.length) { failed++; console.error(`FAIL ${k.f}\n  ${r.bad.join('\n  ')}`); continue; }
      await page.pdf({ path: join(SITE, k.f), width: '8.5in', height: '11in', printBackground: true, preferCSSPageSize: true, tagged: true });
      console.log(`ok   ${k.f} (${r.pages} ${r.pages === 1 ? 'page' : 'pages'}${k.draft ? ', draft' : ''})`);
    }
    await ctx.close();
  } finally {
    await browser.close();
    await site.close();
  }
  if (failed) { console.error(`${failed} print kit file(s) failed`); process.exit(1); }
}

main().catch((e) => { console.error(e); process.exit(1); });
