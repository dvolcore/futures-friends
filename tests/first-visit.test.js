'use strict';
// First visit = the cloud fly-through (owner 2026-10-07: "When someone gets the link for the first time, when they go through the
// entering page (Tap to enter), make sure it goes to the page that flies them through the clouds"). Real headless Chromium, the
// untouched browser (loadChromium({ gate: true })):
//  - a first visit to a deep link: gate -> Home (replaceState, no extra history entry) -> the hero opening plays (letters present) ->
//    STAYS on Home (owner: "it must start at the front page with the clouds"); a small note "You were sent to: <page>  Open" that
//    never takes focus and hides itself after ~8 s; Open goes there (replaceState); Back leaves to where the visitor was before;
//  - a first visit to Home: the fly-through plays and the visitor stays on Home (no note);
//  - the centers path: the audience chosen at the gate opens after 'ff:first-visit-done';
//  - a second load in the same session: no gate, the deep link renders directly; ?nogate renders directly;
//  - reduced motion: the gate fades, Home shows still (no opening), and the chip still continues to the requested route.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const H = () => import('./a11y-harness.mjs');
let h, site, browser;
test.before(async () => { h = await H(); site = await h.startSite(); browser = await h.loadChromium({ gate: true }).launch(); });
test.after(async () => { await browser.close(); await site.close(); });

const ctxFor = (width, motion = true) => browser.newContext({ viewport: h.SIZES[width], reducedMotion: motion ? 'no-preference' : 'reduce', ...(width === 390 ? { isMobile: true, hasTouch: true } : {}) });
const errorsOf = page => { const e = []; page.on('pageerror', x => e.push(x.message)); return e; };
// watches the hero's opening states and the chip from the first script on
const SPY = () => {
  window.__fv = { opening: [], letters: 0, chip: null, hashes: [] };
  const seen = new Set();
  new MutationObserver(() => {
    const hero = document.querySelector('#view .mh-hero');
    const op = hero && hero.dataset.opening;
    if (op && !seen.has(op)) { seen.add(op); window.__fv.opening.push(op); }
    if (hero) window.__fv.letters = Math.max(window.__fv.letters, hero.querySelectorAll('.mh-l').length);
    const c = document.querySelector('.ffe-next-go');
    if (c && !window.__fv.chip) window.__fv.chip = { text: c.textContent.trim(), focus: document.activeElement === c, hash: location.hash };
    if (window.__fv.hashes[window.__fv.hashes.length - 1] !== location.hash) window.__fv.hashes.push(location.hash);
  }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-opening', 'class'] });
};

test('wiring: entry.js hops to Home, names the chip from route-meta, uses replaceState; the hero kit preloads on a first deep visit; cache-busted', () => {
  const js = fs.readFileSync(path.join(__dirname, '..', 'entry.js'), 'utf8'), html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(js, /history\.replaceState\([^)]*'#home'/);
  assert.doesNotMatch(js, /pushState/);
  assert.match(js, /FFRouteMeta/);
  assert.match(js, /ff:first-visit-done/);
  assert.match(html, /sessionStorage\.getItem\("ff-entered"\)/);
  assert.match(html, /entry\.js\?v=\d+/);
});

for (const width of [1280, 390]) {
  test(`first visit to a deep link (${width}px): gate -> Home fly-through -> stays on Home, the note offers the page; Back leaves`, async () => {
    const ctx = await ctxFor(width); const page = await ctx.newPage(); const errors = errorsOf(page);
    await page.addInitScript(SPY);
    await page.goto(`${site.base}?fresh=${Date.now()}#about`);            // a page before the link, to check Back
    await page.evaluate(() => sessionStorage.removeItem('ff-entered'));
    await page.goto(`${site.base}?fresh=${Date.now()}#curriculum`);
    await page.waitForSelector('.ffe-go');
    assert.match(await page.evaluate(() => document.querySelector('#view').textContent), /discovery|curriculum/i, 'the deep page renders under the gate (crawlers)');
    const len0 = await page.evaluate(() => history.length);
    await page.click('.ffe-go');
    await page.waitForFunction(() => location.hash === '#home' && document.querySelector('#view .mh-hero'), null, { timeout: 3000 });
    await page.waitForFunction(() => window.__fv.opening.includes('playing'), null, { timeout: 4000 });
    assert.equal(await page.evaluate(() => scrollY), 0);
    await page.waitForSelector('.ffe-next-go', { timeout: 12000 });
    const fv = await page.evaluate(() => window.__fv);
    assert.ok(fv.opening.includes('playing'), `the hero opening played: ${fv.opening}`);
    assert.ok(fv.letters >= 14, `the flying letters were there: ${fv.letters}`);
    assert.match(await page.textContent('.ffe-next'), /You were sent to: Curriculum by age/);
    assert.equal(fv.chip.focus, false, 'the note never takes focus');
    const box = await page.evaluate(() => { const c = document.querySelector('.ffe-next').getBoundingClientRect(); const H = document.querySelector('#view .mh-hero'), hero = H.getBoundingClientRect();
      const card = [...H.querySelectorAll('*')].filter(e => /Learn\. Move/.test(e.textContent) && e.querySelector('a,button')).pop().getBoundingClientRect();
      const over = (a, b) => b.width > 0 && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
      const friends = [...H.querySelectorAll('img')].filter(i => /(booker|lumi|zuri|bop)/i.test(i.currentSrc || i.src) && getComputedStyle(i).opacity !== '0').some(f => over(c, f.getBoundingClientRect()));
      return [c.left >= 0, c.right <= innerWidth, c.bottom <= innerHeight, c.height <= 60, !over(c, card), !friends, c.top >= hero.bottom || c.top < hero.top + 80]; });
    assert.deepEqual(box, [true, true, true, true, true, true, true], `small, inside the screen, off the hero's card and friends: ${box}`);
    await page.waitForTimeout(2500);
    assert.equal(await page.evaluate(() => location.hash), '#home', 'stays on Home: no auto-continue');
    assert.equal(await page.evaluate(() => history.length), len0, 'no extra history entry for the hop');
    // Open -> the page the visitor was sent to (replaceState, focus on its title)
    await page.click('.ffe-next-go');
    await page.waitForFunction(() => location.hash === '#curriculum' && !document.querySelector('.ffe-next'), null, { timeout: 3000 });
    assert.deepEqual(await page.evaluate(() => [history.length, document.activeElement === document.querySelector('#view h1')]), [len0, true]);
    await page.goBack(); await page.waitForTimeout(500);
    assert.match(await page.evaluate(() => location.hash), /^#about/, 'Back returns to where the visitor was before the link');
    // second load in the same session: no gate, the deep link renders directly, no hop, no note
    await page.goto(`${site.base}?again=${Date.now()}#for-centers`); await page.waitForTimeout(800);
    assert.deepEqual(await page.evaluate(() => [!!document.querySelector('.ffe'), location.hash, !!document.querySelector('.ffe-next')]), [false, '#for-centers', false]);
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}

test('the note hides itself after about 8 s and can be dismissed', async () => {
  const ctx = await ctxFor(1280, false); const page = await ctx.newPage(); const errors = errorsOf(page);
  await page.goto(`${site.base}?fresh=${Date.now()}#story-time/booker-tries-again`);
  await page.click('.ffe-go');
  await page.waitForSelector('.ffe-next', { timeout: 4000 });
  assert.match(await page.textContent('.ffe-next'), /You were sent to: Story Time/);
  await page.waitForFunction(() => !document.querySelector('.ffe-next'), null, { timeout: 10000 });
  assert.equal(await page.evaluate(() => location.hash), '#home');
  const p2 = await ctx.newPage();
  await p2.goto(`${site.base}?fresh=${Date.now()}#room-kit`);
  await p2.evaluate(() => sessionStorage.removeItem('ff-entered')); await p2.reload();
  await p2.click('.ffe-go');
  await p2.waitForSelector('.ffe-next-x', { timeout: 4000 });
  await p2.click('.ffe-next-x');
  await p2.waitForFunction(() => !document.querySelector('.ffe-next'), null, { timeout: 1000 });
  assert.equal(await p2.evaluate(() => location.hash), '#home');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('first visit to Home: the fly-through plays and the visitor stays on Home (no chip); the done event fires', async () => {
  const ctx = await ctxFor(1280); const page = await ctx.newPage(); const errors = errorsOf(page);
  await page.addInitScript(SPY);
  await page.addInitScript(() => document.addEventListener('ff:first-visit-done', e => { window.__done = e.detail; }));
  await page.goto(`${site.base}?fresh=${Date.now()}`);
  await page.waitForSelector('.ffe-go');
  await page.click('.ffe-go');
  await page.waitForFunction(() => window.__fv.opening.includes('playing'), null, { timeout: 4000 });
  await page.waitForFunction(() => window.__done !== undefined, null, { timeout: 12000 });
  await page.waitForTimeout(400);
  assert.deepEqual(await page.evaluate(() => [window.__done.next, !!document.querySelector('.ffe-next'), /^#home|^$/.test(location.hash), window.__fv.letters >= 14]), [null, false, true, true]);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('the centers path: an audience chosen at the gate opens after the fly-through (ff:first-visit-done), even from a deep link', async () => {
  const ctx = await ctxFor(390); const page = await ctx.newPage(); const errors = errorsOf(page);
  await page.addInitScript(SPY);
  await page.addInitScript(() => document.addEventListener('ff:first-visit-done', () => { window.__doneAt = location.hash; }));
  await page.goto(`${site.base}?fresh=${Date.now()}#curriculum`);
  await page.waitForSelector('.ffe-go');
  const dest = await page.evaluate(() => (typeof V !== 'undefined' && V.centers ? 'centers' : 'for-centers'));   // #centers once the audience split lands
  const btn = await page.$('.ffe-centers');
  if (btn) await btn.click(); else { await page.evaluate(d => window.FFEntry.choose(d), dest); await page.click('.ffe-quiet'); }
  await page.waitForFunction(() => window.__fv.opening.includes('playing'), null, { timeout: 4000 });
  await page.waitForFunction(d => location.hash === '#' + d, dest, { timeout: 12000 });
  assert.equal(await page.evaluate(() => window.__doneAt), '#home', 'the fly-through finished on Home first');
  assert.equal(await page.$('.ffe-next'), null, 'no note when the audience was chosen');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('reduced motion: the gate fades, Home shows still (no opening), the visitor stays on Home with the note; ?nogate renders the link directly', async () => {
  const ctx = await ctxFor(1280, false); const page = await ctx.newPage(); const errors = errorsOf(page);
  await page.addInitScript(SPY);
  await page.goto(`${site.base}?fresh=${Date.now()}#room-kit`);
  await page.waitForSelector('.ffe-go');
  await page.click('.ffe-go');
  const t = await page.evaluate(() => { const g = document.querySelector('.ffe'); return g ? getComputedStyle(g).transform : 'gone'; });
  assert.ok(t === 'none' || t === 'gone', `no travel: ${t}`);
  await page.waitForFunction(() => location.hash === '#home', null, { timeout: 2000 });
  await page.waitForSelector('.ffe-next-go', { timeout: 4000 });
  assert.match(await page.textContent('.ffe-next'), /Learning Zones Kit/);
  const fv = await page.evaluate(() => window.__fv);
  assert.ok(!fv.opening.includes('playing'), `nothing travels with reduced motion: ${fv.opening}`);
  assert.equal(await page.evaluate(() => location.hash), '#home');
  const p2 = await ctx.newPage();
  await p2.goto(`${site.base}?nogate&fresh=${Date.now()}#activities/booker`); await p2.waitForTimeout(800);
  assert.deepEqual(await p2.evaluate(() => [!!document.querySelector('.ffe'), location.hash]), [false, '#activities/booker']);
  assert.deepEqual(errors, []);
  await ctx.close();
});
