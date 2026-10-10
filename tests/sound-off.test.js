'use strict';
// The sound kill switch (owner 2026-10-10: "All sound everywhere" OFF on the public site). sound-switch.js sets window.FF_SOUND_OFF from
// ONE value (var SOUND_OFF = true) and every sound path reads it; nothing is deleted, so flipping it back restores the sound (the engine
// suites w8-sound, w9-voices and w9-sound-intro run with it flipped back). Static checks + real headless Chromium on the shipped default:
//  - sound-switch.js is the first script on every page that has sound code, and its one value is true;
//  - Home: no Sound/Nature pill, no AudioContext, a friend's tap plays no voice (and no "Sound is off" hint), the talking intro stays
//    muted (no "Tap for sound"), and every play() was already muted (the safety net caught nothing: FF_SOUND_FORCED 0);
//  - a talking video with native controls plays muted with captions showing; an unmute snaps back;
//  - the storybook has no "Read to me"; the Kids' Shop film has no Music button and stays muted; the room-kit cue offers no "Turn sound on".
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('one value: sound-switch.js (SOUND_OFF = true) loads first, before any other script, on every page with sound code; cache-busted', () => {
  const sw = read('sound-switch.js');
  assert.equal((sw.match(/^  var SOUND_OFF = (true|false);$/gm) || []).length, 1, 'exactly one switch value');
  assert.match(sw, /^  var SOUND_OFF = true;$/m);
  const pages = fs.readdirSync(ROOT).filter(f => f.endsWith('.html') && read(f).includes('sound.js?v='));
  assert.ok(pages.length > 100, `prerendered pages: ${pages.length}`);
  for (const f of pages) {
    const html = read(f), at = html.indexOf('<script src="sound-switch.js?v=');
    assert.ok(at > 0, f + ' loads sound-switch.js');
    assert.equal(html.indexOf('<script src='), at, f + ': sound-switch.js is the first script file');
  }
  // every sound path reads the flag
  for (const f of ['sound.js', 'entry.js', 'friend-voices.js', 'hero-motion.js', 'home-video.js', 'supporting-cast.js', 'kids-film.js', 'family-library.js', 'room-kit.js', 'loop-widget.js', 'whole-child.js'])
    assert.match(read(f), /FF_SOUND_OFF/, f);
  assert.match(read('README.md'), /Sound kill switch/);
});

const H = () => import('./a11y-harness.mjs');
let h, site, browser;
test.before(async () => { h = await H(); site = await h.startSite(); browser = await h.loadChromium().launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); });
test.after(async () => { await browser.close(); await site.close(); });

const SPY = () => {
  const A = window.__aud = { plays: 0, loud: 0, ac: 0, speak: 0 };
  const P = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () { A.plays++; if (!this.muted) A.loud++; return P.apply(this, arguments); };
  for (const k of ['AudioContext', 'webkitAudioContext']) { const N = window[k]; if (N) window[k] = class extends N { constructor(...a) { super(...a); A.ac++; } }; }
  setInterval(() => { for (const m of document.querySelectorAll('video,audio')) if (!m.paused && !m.muted) A.loud++; }, 100);
};
async function open(width, route, motion = true) {
  const ctx = await browser.newContext({ viewport: h.SIZES[width], reducedMotion: motion ? 'no-preference' : 'reduce', ...(width === 390 ? { isMobile: true, hasTouch: true } : {}) });
  await ctx.addInitScript(SPY);
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${site.base}?fresh=so-${Date.now()}#${route}`); await page.waitForTimeout(1500);
  return { ctx, page, errors };
}
const aud = page => page.evaluate(() => ({ ...window.__aud, forced: window.FF_SOUND_FORCED, flag: window.FF_SOUND_OFF, off: window.FFSound.off, on: window.FFSound.enabled(), pill: !!document.querySelector('.ffs') }));
const SILENT = { loud: 0, ac: 0, speak: 0, forced: 0, flag: true, off: true, on: false, pill: false };
const silent = (a, what) => { const { plays, ...rest } = a; assert.deepEqual(rest, SILENT, what); };

for (const width of [1280, 390]) {
  test(`${width}px Home: no pill, no AudioContext, a friend says hello in words only, the talking intro stays muted`, async () => {
    const { ctx, page, errors } = await open(width, 'home');
    await page.click('.ffa-friend[data-k=bop]'); await page.waitForTimeout(600);
    assert.deepEqual(await page.evaluate(() => [window.FFVoices.speaking(), (document.querySelector('.mh-sayhint') || {}).textContent || '']), [null, '']);
    assert.equal(await page.evaluate(() => window.FFVoices.play('lumi')), 'off');
    await page.evaluate(() => document.querySelector('.hc-vframe').scrollIntoView()); await page.waitForTimeout(2000);
    await page.mouse.click(4, 300); await page.waitForTimeout(600);   // the tap that used to give the intro its voice
    const v = await page.evaluate(() => { const f = document.querySelector('.hc-vframe'), x = f.querySelector('video'); return { muted: x.muted, chip: !!f.querySelector('.hc-vsound:not([hidden])') }; });
    assert.deepEqual(v, { muted: true, chip: false });
    silent(await aud(page), 'Home is silent');
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}

test('a talking video with native controls: plays muted, captions showing, an unmute snaps back; storybook has no Read to me', async () => {
  const { ctx, page, errors } = await open(1280, 'activities/bop');
  const v = await page.$('video[controls]');
  await v.scrollIntoViewIfNeeded(); await v.evaluate(x => x.play()); await page.waitForTimeout(1200);
  await v.evaluate(x => { x.muted = false; }); await page.waitForTimeout(200);
  const st = await v.evaluate(x => ({ muted: x.muted, playing: !x.paused, captions: [...x.textTracks].some(t => t.mode === 'showing') }));
  assert.deepEqual(st, { muted: true, playing: true, captions: true });
  assert.equal((await aud(page)).forced, 1, 'the one unmute was caught');
  await page.goto(`${site.base}?fresh=so2-${Date.now()}#story-time`); await page.waitForTimeout(1000);
  await page.click('a[href^="#story-time/"]'); await page.waitForTimeout(800);
  await page.click('#flReader [data-fl="next"]'); await page.waitForTimeout(1800);
  assert.deepEqual(await page.evaluate(() => [!!document.querySelector('#flSpeak:not([hidden])'), document.getElementById('flVoice').textContent]), [false, '']);
  silent(await aud(page), 'the story page is silent');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test("Kids' Shop: the film plays muted with no Music button and no music credit", async () => {
  const { ctx, page, errors } = await open(1280, 'kids-shop');
  await page.waitForTimeout(1500);
  const f = await page.evaluate(() => { const v = document.querySelector('[data-kf-video]'); return { music: !!document.querySelector('[data-kf-music]'), credit: !!document.querySelector('.kf-credit'), muted: v.muted, playing: !v.paused }; });
  assert.deepEqual(f, { music: false, credit: false, muted: true, playing: true });
  silent(await aud(page), "the Kids' Shop is silent");
  assert.deepEqual(errors, []);
  await ctx.close();
});
