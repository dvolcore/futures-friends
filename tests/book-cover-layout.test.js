'use strict';
// Book cards (owner 2026-10-07, caught on an iPhone): on #curriculum "Meet their next favorite friend." a tap on a book cover
// used to open a 3D flip-book (extras.js section M) whose spread scaled over the card's own description, with the blurb repeated
// in big type, and in WebKit the rotated leaf's front title bled through backface-visibility and garbled the title.
// The covers are static now. This guards it: at phone width each cover sits ABOVE its text (no overlap, before or after a tap),
// the cover title is flat text (no filter, no transform, no 3D ancestor), and the flip-book is gone.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const SITE = path.join(__dirname, '..');

test('the flip-book that covered the card text is gone (no .ffb markup or styles)', () => {
  const js = fs.readFileSync(path.join(SITE, 'extras.js'), 'utf8');
  assert.doesNotMatch(js, /ffb-leaf|ffb-back|function wrapBook/);
});

const H = () => import('./a11y-harness.mjs');
let h, srv, browser;
test.before(async () => { h = await H(); srv = await h.startSite(); browser = await h.loadChromium().launch(); });
test.after(async () => { if (browser) await browser.close(); if (srv) await srv.close(); });

// every .card.book: cover box vs the text column, plus what the cover title looks like
const MEASURE = sel => [...document.querySelectorAll(sel)].map(card => {
  const cover = card.querySelector(':scope > .cover'), text = [...card.children].filter(k => k !== cover && k.offsetHeight > 0).pop();
  const r = cover.getBoundingClientRect(), q = text.getBoundingClientRect();
  const overlap = r.left < q.right - 1 && q.left < r.right - 1 && r.top < q.bottom - 1 && q.top < r.bottom - 1;
  const em = cover.querySelector('em'), s = em && getComputedStyle(em);
  let threeD = false;
  for (let n = em || cover; n && n !== card; n = n.parentElement) {
    const c = getComputedStyle(n);
    if (c.transformStyle === 'preserve-3d' || c.backfaceVisibility === 'hidden' || c.transform !== 'none' || c.filter !== 'none') threeD = true;
  }
  return { title: card.querySelector('h3').textContent, overlap, coverAbove: r.bottom <= q.top + 1, coverW: r.width,
    em: em ? { filter: s.filter, transform: s.transform, size: parseFloat(s.fontSize), stroke: parseFloat(s.webkitTextStrokeWidth || '0'), fits: em.scrollWidth <= em.clientWidth + 1, text: em.textContent } : null, threeD,
    blurbTwice: card.textContent.split(card.querySelector('p').textContent.slice(0, 40)).length - 1 };
});

for (const route of ['curriculum', 'friends']) {
  test(`#${route} books at 390px: cover on top, text below, nothing overlaps, title crisp (also after a tap)`, async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await h.goto(page, srv.base, route, 900);
    const sel = route === 'curriculum' ? '#books .card.book' : '.card.book';
    assert.equal(await page.locator('.ffb').count(), 0, 'no flip-book wrapper');
    const before = await page.evaluate(MEASURE, sel);
    assert.ok(before.length >= 4, `found ${before.length} book cards`);
    for (const b of before) {
      assert.ok(!b.overlap, `${b.title}: cover overlaps the text`);
      assert.ok(b.coverAbove, `${b.title}: cover should sit above the text on a phone`);
      assert.ok(b.coverW >= 150, `${b.title}: cover only ${b.coverW}px wide`);
      assert.ok(!b.threeD, `${b.title}: cover title sits in a filtered/transformed/3D layer`);
      assert.equal(b.blurbTwice, 1, `${b.title}: blurb shown more than once`);
      if (b.em) {
        assert.equal(b.em.filter, 'none'); assert.equal(b.em.transform, 'none'); assert.equal(b.em.stroke, 0);
        assert.ok(b.em.size >= 14, `${b.title}: cover title ${b.em.size}px`);
        assert.ok(b.em.fits, `${b.title}: cover title overflows`);
        assert.equal(b.em.text, b.title, 'the cover shows the real title');
      }
    }
    // a tap on each cover must not move anything over the text
    for (let i = 0; i < before.length; i++) {
      const cover = page.locator(`${sel} > .cover`).nth(i);
      if (await cover.evaluate(c => c.tagName === 'A')) continue;  // Booker's finished cover is a link to Story Time
      await cover.scrollIntoViewIfNeeded(); await cover.tap(); await page.waitForTimeout(250);
    }
    const after = await page.evaluate(MEASURE, sel);
    after.forEach((b, i) => assert.deepEqual([b.overlap, b.coverAbove], [false, true], `${b.title} after a tap`));
    await ctx.close();
  });
}

test('#curriculum books at 1280px: tidy two columns, cover beside text without overlap', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await h.goto(page, srv.base, 'curriculum', 900);
  const cols = await page.evaluate(() => getComputedStyle(document.querySelector('#books .grid.g2')).gridTemplateColumns.split(' ').length);
  assert.equal(cols, 2);
  for (const b of await page.evaluate(MEASURE, '#books .card.book')) assert.ok(!b.overlap, `${b.title}: overlap at 1280`);
  await ctx.close();
});
