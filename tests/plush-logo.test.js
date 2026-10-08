'use strict';
// PLUSH LOGO (owner 2026-10-07: "All of the Futures Friends logos need to be that plush, including the one on the page in the top
// left corner"). The Futures Friends PROGRAM logo is the plush wordmark (the hero title's art) everywhere it renders:
//  - header (premium.js, every route, phone + desktop), the no-JS header fallback, footer, site menu, Academy sidebar, both
//    certificates, the sample app notifications (square plush "FF" mark), favicon / apple-touch icon, the share image;
//  - assets: trimmed transparent webp at 160/320/640 (header file under 30 KB), explicit width/height (no layout shift),
//    accessible name "Futures Friends home" on the header link;
//  - none of the old flat wordmark files (ff-sticker*, ff-white, ff-navy, ff-flat, ff-app-icon) are used by the site any more;
//  - brand rule: the FLC shield stays the school logo only (footer "A program of"), never merged with the plush wordmark.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const WM = /img\/brand\/ff-plush-wordmark-(160|320|640)\.webp/;
const pngSize = f => { const b = fs.readFileSync(path.join(ROOT, f)); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
const webpSize = f => { const b = fs.readFileSync(path.join(ROOT, f)); return b.toString('ascii', 12, 16) === 'VP8X' ? [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)] : null; };

test('assets: plush wordmark 160/320/640 webp (header < 30 KB), plush FF mark, icons at their sizes', () => {
  for (const w of [160, 320, 640]) {
    const f = `img/brand/ff-plush-wordmark-${w}.webp`;
    const s = webpSize(f);
    assert.ok(s, `${f} has alpha (VP8X)`);
    assert.equal(s[0], w);
    assert.ok(Math.abs(s[0] / s[1] - 2.15) < 0.03, `${f} keeps the wordmark's aspect`);
  }
  assert.ok(fs.statSync(path.join(ROOT, 'img/brand/ff-plush-wordmark-320.webp')).size < 30000, 'header 2x file under 30 KB');
  assert.deepEqual(pngSize('img/brand/ff-plush-mark-512.png'), [512, 512]);
  assert.deepEqual(pngSize('img/favicon.png'), [64, 64]);
  assert.deepEqual(pngSize('img/favicon-32.png'), [32, 32]);
  assert.deepEqual(pngSize('img/apple-touch-icon.png'), [180, 180]);
  assert.deepEqual(webpSize('img/brand/ff-plush-mark-96.webp') || [96, 96], [96, 96]);
});

test('source: every Futures Friends logo in the markup is the plush wordmark; no flat wordmark file is used by the site', () => {
  const html = read('index.html');
  assert.match(html, /<button class="logo" data-go="home" aria-label="Futures Friends home"><img class="ff-plush-wm" src="img\/brand\/ff-plush-wordmark-160\.webp" srcset="[^"]+" sizes="[^"]+" width="142" height="66" alt="Futures Friends"><\/button>/, 'no-JS header');
  assert.match(html, /<img class="flogo ff-plush-wm" src="img\/brand\/ff-plush-wordmark-320\.webp"[^>]* width="170" height="79"/, 'footer');
  assert.match(html, /<link rel="icon" type="image\/png" sizes="32x32" href="img\/favicon-32\.png\?v=\d+">/);
  assert.match(html, /<link rel="apple-touch-icon" href="img\/apple-touch-icon\.png\?v=\d+">/);
  assert.match(html, /og:image" content="https:\/\/dvolcore\.github\.io\/futures-friends\/img\/og\/ff-share-default\.png"/);
  assert.match(read('premium.js'), /link\('home','<img class="ff-plush-wm" src="img\/brand\/ff-plush-wordmark-160\.webp" [^']*width="142" height="66" alt="Futures Friends home">','px-logo'\)/, 'header');
  assert.match(read('premium.js'), /class="px-academybrand"><img class="ff-plush-wm" src="img\/brand\/ff-plush-wordmark-320\.webp"/, 'Academy sidebar');
  assert.match(read('wayfinding.js'), /class="ffw-m-home" href="#home"><img class="ff-plush-wm" src="img\/brand\/ff-plush-wordmark-320\.webp"[^>]*alt="Futures Friends home">/, 'menu');
  assert.match(read('family-library.js'), /<img class="fl-cert-logo ff-plush-wm" src="img\/brand\/ff-plush-wordmark-320\.webp"/, 'family certificate');
  assert.match(read('features.js'), /<img class="ff-plush-wm" src="img\/brand\/ff-plush-wordmark-320\.webp"[^>]*alt="Futures Friends"/, 'Academy certificate');
  assert.match(read('views.js'), /<img src="img\/brand\/ff-plush-mark-96\.webp" width="96" height="96" alt="">/, 'sample notifications');
  const site = fs.readdirSync(ROOT).filter(f => /\.(js|css|html)$/.test(f) && f !== 'library-catalog.js');   // the catalog lists brand-kit files by name
  for (const f of site) assert.doesNotMatch(read(f), /img\/brand\/ff-(sticker|sticker-sm|white|navy|flat|app-icon)\.png/, `${f} uses an old flat wordmark`);
  for (const f of site) for (const m of read(f).match(/<img[^>]*ff-plush-wm[^>]*>/g) || []) assert.doesNotMatch(m, /flc-/, `${f}: shield never merged into the plush wordmark`);
});

// ---------------------------------------------------------------- real browser
const H = () => import('./a11y-harness.mjs');
let h, srv, browser;
test.before(async () => { h = await H(); srv = await h.startSite(); browser = await h.loadChromium().launch(); });
test.after(async () => { await browser.close(); await srv.close(); });

async function headerOn(page) {
  return page.evaluate(() => {
    const a = document.querySelector('header.bar .px-logo'), i = a && a.querySelector('img');
    if (!i) return null;
    const r = i.getBoundingClientRect(), row = document.querySelector('.px-navrow').getBoundingClientRect();
    return { src: i.currentSrc || i.src, alt: i.alt, w: r.width, h: r.height, ok: i.complete && i.naturalWidth > 0, mid: r.top + r.height / 2 - (row.top + row.height / 2), name: a.getAttribute('aria-label') || i.alt };
  });
}

for (const width of [1280, 390]) {
  test(`header logo is the plush wordmark on every route at ${width} (loaded, sized, centred on the nav row)`, async () => {
    const { ctx, page, errors } = await h.open(browser, width);
    await h.goto(page, srv.base, 'home', 300);
    const routes = await page.evaluate(() => Object.keys(window.FFRouteMeta.ROUTES));
    assert.ok(routes.length > 20, 'route list');
    const list = width === 390 ? routes.filter((_, n) => n % 3 === 0).concat('no-such-page') : routes.concat('no-such-page');
    for (const r of list) {
      await page.evaluate(x => { location.hash = x; window.scrollTo(0, 0); }, r);
      await page.waitForTimeout(120);
      const L = await headerOn(page);
      assert.ok(L, `#${r}: header logo present`);
      assert.match(L.src, WM, `#${r}: plush wordmark`);
      assert.equal(L.name, 'Futures Friends home', `#${r}: accessible name`);
      assert.deepEqual([Math.round(L.w), Math.round(L.h)], width === 390 ? [116, 54] : [142, 66], `#${r}: size`);
      assert.ok(Math.abs(L.mid) <= 1.5, `#${r}: vertically centred on the nav row (${L.mid})`);
    }
    const L = await headerOn(page);
    assert.ok(L.ok, 'decoded');
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}

test('footer, menu and favicon are plush in the browser; the FLC shield stays in the footer only', async () => {
  const { ctx, page } = await h.open(browser, 1280);
  await h.goto(page, srv.base, 'home', 300);
  const r = await page.evaluate(() => ({
    footer: document.querySelector('footer .flogo').getAttribute('src'),
    icon: document.querySelector('link[rel=icon]').getAttribute('href'),
    flcInHeader: !!document.querySelector('header.bar [data-flc-mark], header.bar img[src*="flc-"]'),
  }));
  assert.match(r.footer, WM);
  assert.match(r.icon, /img\/favicon(-32)?\.png/);
  assert.equal(r.flcInHeader, false);
  await page.click('#menuT');
  await page.waitForTimeout(400);
  assert.match(await page.evaluate(() => document.querySelector('.ffw-m-home img').currentSrc), WM);
  await ctx.close();
});
