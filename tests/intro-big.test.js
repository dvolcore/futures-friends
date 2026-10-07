'use strict';
// The welcome video, big (owner 2026-10-07: "This intro video is too small for people to even see ... It needs to be in a prime
// location ... blown up way bigger, almost edge to edge on the screen, because this needs to be a big introduction").
// Real headless Chromium (harness as tests/a11y.test.js). Encodes:
//  - "Meet the Futures Friends" is its own section right after the hero, reached within about one scroll;
//  - the intro is at least 85% of the screen's width on a 390 px phone (the 4:5 cut) and at least 900 px wide at 1280 (16:9);
//  - exactly ONE copy of the intro on Home; the photo row holds only the three real photos, in an equal grid;
//  - the "Starring" links go to each friend's own page; a big play button while it is not playing; axe clean; no sideways scroll.
const test = require('node:test');
const assert = require('node:assert/strict');

const H = () => import('./a11y-harness.mjs');
let h, site, browser;
test.before(async () => { h = await H(); site = await h.startSite(); browser = await h.loadChromium().launch(); });
test.after(async () => { await browser.close(); await site.close(); });

const PHONE = { isMobile: true, hasTouch: true };
const facts = page => page.evaluate(() => {
  const view = document.querySelector('#view'), hero = view.querySelector('.px-homehero'), sec = view.querySelector('.hc-intro');
  const frame = sec && sec.querySelector('.hc-vframe[data-video="intro"]'), r = frame ? frame.getBoundingClientRect() : null;
  const photos = [...view.querySelectorAll('.hc-slots > *')].map(x => { const b = x.getBoundingClientRect(); return { w: Math.round(b.width), top: Math.round(b.top + scrollY), real: !!x.querySelector('[data-real-photo]'), video: !!x.querySelector('video') }; });
  return {
    afterHero: !!(hero && sec && hero.nextElementSibling === sec),
    top: sec ? Math.round(sec.getBoundingClientRect().top + scrollY) : null,
    frameTop: r ? Math.round(r.top + scrollY) : null,
    w: r ? r.width : 0, h: r ? r.height : 0, vw: innerWidth, vh: innerHeight,
    intros: view.querySelectorAll('[data-video="intro"]').length, videos: view.querySelectorAll('.hc-intro video').length,
    heading: sec ? sec.querySelector('h2').textContent.trim() : '',
    stars: sec ? [...sec.querySelectorAll('.hc-stars a')].map(a => [a.textContent.trim(), a.getAttribute('href')]) : [],
    transcript: !!(sec && sec.querySelector('figcaption details.ffcap-tr')),
    photos, sideways: document.documentElement.scrollWidth > innerWidth
  };
});

for (const [width, height] of [[390, 844], [1280, 720], [1280, 800]]) {
  test(`${width}x${height}: "Meet the Futures Friends" sits right under the hero, big, the only copy on Home; the photos have their own row`, async () => {
    const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce', ...(width < 600 ? PHONE : {}) });
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
    await h.goto(page, site.base, 'home', 700);
    const f = await facts(page);
    assert.equal(f.afterHero, true, 'the section comes right after the hero');
    assert.ok(f.frameTop < f.vh * 2, `the video is on screen after about one scroll (starts at ${f.frameTop} for a ${f.vh} px screen)`);
    if (width < 600) {
      assert.ok(f.w >= 0.85 * f.vw, `phone: ${f.w} px of ${f.vw} (>= 85%)`);
      assert.ok(Math.abs(f.w / f.h - 0.8) < 0.02, `phone: the 4:5 cut (${(f.w / f.h).toFixed(2)})`);
    } else {
      assert.ok(f.w >= 900, `desktop: ${f.w} px wide (>= 900)`);
      assert.ok(Math.abs(f.w / f.h - 16 / 9) < 0.02, `desktop: 16:9 (${(f.w / f.h).toFixed(2)})`);
      assert.ok(f.h <= f.vh - 60, `the whole picture fits on the screen under the header (${Math.round(f.h)} of ${f.vh})`);
    }
    assert.equal(f.intros, 1, 'exactly one copy of the intro on Home');
    assert.equal(f.videos, 1);
    assert.equal(f.heading, 'Meet the Futures Friends');
    assert.deepEqual(f.stars, [['Booker', '#activities/booker'], ['Lumi', '#activities/lumi'], ['Zuri', '#activities/zuri'], ['Bop', '#bop-at-home']]);
    assert.ok(f.transcript, 'its transcript sits under it');
    assert.deepEqual(f.photos.map(p => [p.real, p.video]), [[true, false], [true, false], [true, false]], 'the photo row: three real photos, no video');
    if (width >= 600) {
      assert.ok(new Set(f.photos.map(p => p.top)).size === 1 && Math.max(...f.photos.map(p => p.w)) - Math.min(...f.photos.map(p => p.w)) <= 1, `one row of three equal photos: ${JSON.stringify(f.photos)}`);
    }
    assert.equal(f.sideways, false, 'no sideways scroll');
    // reduced motion: it does not autoplay; a big felt play button sits in the middle of the picture
    const b = await page.$eval('.hc-intro .hc-vbtn', el => { const r = el.getBoundingClientRect(), fr = el.closest('.hc-vframe').getBoundingClientRect(); return { w: r.width, cx: Math.round(r.left + r.width / 2 - (fr.left + fr.width / 2)), state: el.dataset.state, label: el.getAttribute('aria-label') }; });
    assert.ok(b.w >= 76 && Math.abs(b.cx) <= 2 && b.state === 'paused' && b.label === 'Play the animation', JSON.stringify(b));
    assert.equal(await page.evaluate(() => document.querySelector('.hc-intro video').paused), true, 'no autoplay with reduced motion');
    const v = (await h.axe(page, { include: '.hc-intro', openDetails: false })).filter(x => ['serious', 'critical'].includes(x.impact));
    assert.deepEqual(v, []);
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}

test('the hero\'s "Meet the friends" lands on the big intro and plays it (keyboard focus on its play/pause button)', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await h.goto(page, site.base, 'home', 700);
  await page.click('.px-heroactions a:has-text("Meet the friends")');
  await page.waitForFunction(() => { const v = document.querySelector('.hc-intro video'); return v && !v.paused; }, null, { timeout: 8000 });
  const st = await page.evaluate(() => { const r = document.querySelector('.hc-intro .hc-vframe').getBoundingClientRect(); return { top: r.top, bottom: r.bottom, vh: innerHeight, focus: document.activeElement.matches('.hc-intro .hc-vbtn') }; });
  assert.ok(st.top >= 0 && st.bottom <= st.vh && st.focus, JSON.stringify(st));
  await ctx.close();
});
