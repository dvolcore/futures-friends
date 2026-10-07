// Link audit (owner 2026-10-07: "I'm clicking on Meet the friends and it doesn't even go straight to the videos ... the book from
// Booker is finished, so when I click Read the book it should go there"). Buttons land where their words promise:
//   Home hero "Meet the friends" (play icon) -> the talking intro on Home, scrolled to and started, focus on its play/pause button.
//   #friends "Read <friend>'s book" -> that friend's book in the Story Time reader; the Booker cover -> the reader, not a raw image.
//   data-go may carry an argument (data-go="story-time/booker-tries-again").
// Real headless Chromium at 390 and 1280, reduced motion on and off. The full crawl of every link is tests/site-map.test.js.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const H = () => import('./a11y-harness.mjs');
let h, site, browser;
test.before(async () => { h = await H(); site = await h.startSite(); browser = await h.loadChromium().launch(); });
test.after(async () => { await browser.close(); await site.close(); });

test('markup: the hero button carries its landing; deep-links.js loads after not-found.js and is cache-busted', () => {
  const html = read('index.html');
  assert.match(html, /<script src="not-found\.js\?v=\d+"><\/script>\n<script src="deep-links\.js\?v=\d+"><\/script>/);
  assert.match(read('premium.js'), /link\('home',icon\('Play'\)\+' Meet the friends','px-btn px-secondary','','data-reveal="\[data-video=intro\]" data-reveal-play'\)/);
  assert.doesNotMatch(read('views.js'), /data-go="friends">\$\{b\?`Read/, 'no "Read ... book" button loops back to #friends');
  assert.doesNotMatch(read('views.js'), /href="img\/booker-tries-again-preview\.png" target="_blank"/);
});

for (const width of [390, 1280]) for (const motion of [false, true]) {
  test(`${width}px, motion ${motion ? 'on' : 'reduced'}: Home "Meet the friends" lands on the talking intro and plays it`, async () => {
    const ctx = await browser.newContext({ viewport: h.SIZES[width], reducedMotion: motion ? 'no-preference' : 'reduce', ...(width === 390 ? { isMobile: true, hasTouch: true } : {}) });
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
    await h.goto(page, site.base, 'home', 900);
    await page.click('.px-heroactions a:has-text("Meet the friends")');
    await page.waitForFunction(() => { const v = document.querySelector('[data-video="intro"] video'); return v && !v.paused; }, null, { timeout: 8000 });
    await page.waitForTimeout(motion ? 1200 : 300);
    const st = await page.evaluate(() => { const f = document.querySelector('[data-video="intro"]'), r = f.getBoundingClientRect(); return { hash: location.hash, top: r.top, bottom: r.bottom, vh: innerHeight, focus: document.activeElement.classList.contains('hc-vbtn') }; });
    assert.equal(st.hash, '#home');
    assert.ok(st.top >= 0 && st.top < st.vh * 0.5, `the intro is on screen (top ${st.top})`);
    assert.ok(st.focus, 'focus is on the intro\'s play/pause button');
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}

test('#friends: every "Read <friend>\'s book" opens that book in Story Time, and the Booker cover opens the reader', async () => {
  const ctx = await browser.newContext({ viewport: h.SIZES[390], reducedMotion: 'reduce' });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await h.goto(page, site.base, 'friends', 600);
  const hrefs = await page.evaluate(() => [...document.querySelectorAll('.ffhr-more')].map(a => [a.textContent.trim(), a.getAttribute('href')]));
  const want = { "Read Booker's book": '#story-time/booker-tries-again', "Read Lumi's book": '#story-time/big-feelings-brighter-days', "Read Zuri's book": '#story-time/what-happens-if-we-try', "Read Bop's book": '#story-time/clean-up-team' };
  for (const [label, to] of Object.entries(want)) assert.ok(hrefs.some(([l, hr]) => l === label && hr === to), `${label} -> ${to} (got ${JSON.stringify(hrefs)})`);
  await page.locator('.ffhr-more:visible').first().click();
  await page.waitForFunction(() => location.hash === '#story-time/booker-tries-again' && /Booker Tries Again/.test((document.querySelector('#view h1') || {}).textContent || ''), null, { timeout: 6000 });
  await h.goto(page, site.base, 'friends', 600);
  assert.equal(await page.getAttribute('a.cover-art', 'href'), '#story-time/booker-tries-again');
  assert.equal(await page.getAttribute('a.cover-art', 'target'), null);
  // data-go with an argument
  await page.evaluate(() => { const b = document.createElement('button'); b.dataset.go = 'story-time/what-happens-if-we-try'; b.id = 'dl-probe'; b.textContent = 'x'; document.querySelector('#view').appendChild(b); });
  await page.click('#dl-probe');
  await page.waitForFunction(() => location.hash === '#story-time/what-happens-if-we-try', null, { timeout: 6000 });
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('#activities/<activity> lands on that activity, not the page top', async () => {
  const ctx = await browser.newContext({ viewport: h.SIZES[390], reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await h.goto(page, site.base, 'home', 600);
  await page.locator('a.hc-trylink').first().scrollIntoViewIfNeeded();
  await page.locator('a.hc-trylink').first().click();
  await page.waitForFunction(() => { const o = document.querySelector('#fl-one'); return o && Math.abs(o.getBoundingClientRect().top) < 200; }, null, { timeout: 6000 });
  await ctx.close();
});

test('#friends "Read all five stories free in Story Time" lands on the Story Time bookshelf', async () => {
  const ctx = await browser.newContext({ viewport: h.SIZES[390], reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await h.goto(page, site.base, 'friends', 600);
  const a = page.locator('a:has-text("Read all five stories free in Story Time")');
  await a.scrollIntoViewIfNeeded(); await a.click();
  await page.waitForFunction(() => { const s = document.querySelector('#fl-shelf'); return location.hash === '#story-time' && s && Math.abs(s.getBoundingClientRect().top) < 200 && s.contains(document.activeElement); }, null, { timeout: 6000 });
  await ctx.close();
});

test('the "Watch" door lands on a shelf with the finished videos; the characters tile lands on the town', async () => {
  const ctx = await browser.newContext({ viewport: h.SIZES[1280], reducedMotion: 'reduce' });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await h.goto(page, site.base, 'family-videos', 600);
  // gap fill 2026-10-07: the shelf is grouped by friend; the welcome video opens it and Bop's move-along leads his group
  const srcs = await page.evaluate(() => [...document.querySelectorAll('#fl-v-meet video source, #fl-v-move video source')].map(s => s.getAttribute('src')));
  assert.ok(srcs.includes('video/ff-intro-titled-16x9.mp4') && srcs.some(s => /bop-move-along/.test(s)), JSON.stringify(srcs));
  await h.goto(page, site.base, 'home', 600);
  const tile = page.locator('[data-proof-id="characters"] a');
  await tile.scrollIntoViewIfNeeded(); await tile.click();
  await page.waitForFunction(() => { const t = document.querySelector('#ff-town-h'); return location.hash === '#friends' && t && Math.abs(t.getBoundingClientRect().top) < 250; }, null, { timeout: 6000 });
  assert.deepEqual(errors, []);
  await ctx.close();
});
