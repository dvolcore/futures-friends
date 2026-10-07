// Wave 9 (owner 2026-10-07: "the sound on the mobile should come right on from the beginning"). Phones allow no sound before a tap,
// so while the welcome video (home-calm.js VIDEOS.intro, once: true) plays silently with sound on, a "Tap for sound" button shows over
// it, and the first tap (on that button, on the video or anywhere on the page, but not the sound pill or the felt pause button)
// restarts it from 0 with its voice. Real headless Chromium with the phone autoplay rule (--autoplay-policy=user-gesture-required).
const test = require('node:test');
const assert = require('node:assert/strict');

const H = () => import('./a11y-harness.mjs');
let h, site, browser;
test.before(async () => { h = await H(); site = await h.startSite(); browser = await h.loadChromium().launch({ args: ['--autoplay-policy=user-gesture-required'] }); });
test.after(async () => { await browser.close(); await site.close(); });

const PHONE = { isMobile: true, hasTouch: true };
// Playwright's Chromium starts every page with sticky user activation (and runs page.evaluate as a user gesture), so the
// autoplay flag alone cannot reproduce "nothing tapped yet". A phone's rule is emulated where the site reads it: the page's
// AudioContext reports 'suspended' (FFSound.unlocked() false) until a real, trusted tap or click.
const PHONE_RULE = () => {
  let tapped = false;
  for (const t of ['click', 'touchend', 'keydown']) window.addEventListener(t, e => { if (e.isTrusted) tapped = true; }, true);
  const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
  const d = Object.getOwnPropertyDescriptor(BaseAudioContext.prototype, 'state');
  Object.defineProperty(C.prototype, 'state', { configurable: true, get() { return tapped ? d.get.call(this) : 'suspended'; } });
};
const ctxFor = async (width, motion, extra = {}) => { const c = await browser.newContext({ viewport: h.SIZES[width], reducedMotion: motion ? 'no-preference' : 'reduce', ...(width === 390 ? PHONE : {}), ...extra }); await c.addInitScript(PHONE_RULE); return c; };
const errorsOf = page => { const e = []; page.on('pageerror', x => e.push(x.message)); return e; };
const F = '[data-video="intro"]';
// the intro frame is drawn lazily: scroll down until it exists, then bring it to the middle of the screen
async function toIntro(page) {
  for (let y = 0; y < 30000 && !(await page.$(F)); y += 500) { await page.evaluate(y => scrollTo(0, y), y); await page.waitForTimeout(60); }
  await page.waitForSelector(F, { state: 'attached', timeout: 6000 });   // drawn by the time the page has been scrolled through
  await page.evaluate(f => document.querySelector(f).scrollIntoView({ block: 'center' }), F);
}
const state = page => page.evaluate(f => { const v = document.querySelector(f + ' video'), c = document.querySelector(f + ' .hc-vsound'); return { paused: v.paused, muted: v.muted, t: v.currentTime, chip: !!c && !c.hidden && getComputedStyle(c).display !== 'none' }; }, F);
const playing = page => page.waitForFunction(f => { const v = document.querySelector(f + ' video'); return v && !v.paused && v.readyState >= 2; }, F, { timeout: 8000 });

for (const width of [390, 1280]) {
  test(`${width}px: muted autoplay shows "Tap for sound"; the first tap restarts it from the start with its voice`, async () => {
    const ctx = await ctxFor(width, true);
    const page = await ctx.newPage(); const errors = errorsOf(page);
    await h.goto(page, site.base, 'home', 900);
    await toIntro(page);
    await playing(page);
    await page.waitForFunction(f => document.querySelector(f + ' video').currentTime > 1, F, { timeout: 8000 });
    let s = await state(page);
    assert.equal(s.muted, true, 'no tap yet: the browser only lets it play muted');
    assert.equal(s.chip, true, 'the "Tap for sound" button shows');
    assert.equal(await page.textContent(F + ' .hc-vsound'), 'Tap for sound');
    if (width === 390) await page.tap(F + ' .hc-vsound');           // a finger on the button
    else await page.click(F + ' figcaption b');                       // a click anywhere on the page (plain caption text)
    await page.waitForTimeout(250);
    s = await state(page);
    assert.equal(s.muted, false, 'with its voice');
    assert.equal(s.paused, false, 'still playing (the browser accepted the voice)');
    assert.ok(s.t < 1.5, `restarted from the beginning (t = ${s.t})`);
    assert.equal(s.chip, false, 'the button goes away');
    // later taps do nothing more: it does not restart again
    await page.waitForTimeout(800);
    if (width === 390) await page.tap(F + ' video'); else await page.click(F + ' video');
    await page.waitForTimeout(150);
    s = await state(page);
    assert.ok(!s.paused && !s.muted && s.t > 0.6, `no second restart (t = ${s.t})`);
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}

test('390px: a tap on the video itself also brings the voice, from the start', async () => {
  const ctx = await ctxFor(390, true);
  const page = await ctx.newPage(); const errors = errorsOf(page);
  await h.goto(page, site.base, 'home', 900);
  await toIntro(page); await playing(page);
  await page.waitForFunction(f => document.querySelector(f + ' video').currentTime > 1, F, { timeout: 8000 });
  await page.tap(F + ' video'); await page.waitForTimeout(250);
  const s = await state(page);
  assert.ok(!s.paused && !s.muted && s.t < 1.5 && !s.chip, JSON.stringify(s));
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('the felt pause button still pauses (no restart, no voice); the sound pill is left to its own job', async () => {
  const ctx = await ctxFor(1280, true);
  const page = await ctx.newPage(); const errors = errorsOf(page);
  await h.goto(page, site.base, 'home', 900);
  await toIntro(page); await playing(page);
  await page.waitForFunction(f => document.querySelector(f + ' video').currentTime > 1, F, { timeout: 8000 });
  await page.click(F + ' .hc-vbtn'); await page.waitForTimeout(200);
  let s = await state(page);
  assert.ok(s.paused && s.muted && s.t > 1 && !s.chip, `paused where it was, still muted: ${JSON.stringify(s)}`);
  assert.equal(await page.getAttribute(F + ' .hc-vbtn', 'aria-label'), 'Play the animation');
  // the sound pill turns sound off: no restart, and no chip
  await page.click(F + ' .hc-vbtn'); await playing(page);
  await page.click('.ffs .ffs-main'); await page.waitForTimeout(600);
  s = await state(page);
  assert.equal(await page.evaluate(() => window.FFSound.enabled()), false);
  assert.ok(!s.paused && s.muted && s.t > 1 && !s.chip, `sound off: plays on silently, no chip: ${JSON.stringify(s)}`);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('sound turned off on an earlier visit: the intro plays muted with captions, no chip, and a tap does not unmute it', async () => {
  const ctx = await ctxFor(390, true);
  await ctx.addInitScript(() => { try { localStorage.setItem('ff-sound', 'off'); } catch (e) { /* blocked */ } });
  const page = await ctx.newPage(); const errors = errorsOf(page);
  await h.goto(page, site.base, 'home', 900);
  await toIntro(page); await playing(page);
  await page.waitForTimeout(400);
  let s = await state(page);
  assert.ok(s.muted && !s.chip, JSON.stringify(s));
  await page.tap(F + ' video'); await page.waitForTimeout(250);
  s = await state(page);
  assert.ok(s.muted && !s.chip && !s.paused, JSON.stringify(s));
  assert.equal(await page.evaluate(f => document.querySelector(f + ' video').textTracks[0].mode, F), 'showing');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('reduced motion: the poster only, no chip; the felt button plays it (with its voice, as that press is the tap)', async () => {
  const ctx = await ctxFor(390, false);
  const page = await ctx.newPage(); const errors = errorsOf(page);
  await h.goto(page, site.base, 'home', 700);
  await toIntro(page); await page.waitForTimeout(700);
  let s = await state(page);
  assert.ok(s.paused && !s.chip, JSON.stringify(s));
  await page.tap(F + ' .hc-vbtn'); await playing(page); await page.waitForTimeout(200);
  s = await state(page);
  assert.ok(!s.paused && !s.muted && !s.chip, JSON.stringify(s));
  assert.deepEqual(errors, []);
  await ctx.close();
});
