'use strict';
// The sound kill switch. History: owner 2026-10-10 first turned "All sound everywhere" OFF (SOUND_OFF = true); later the same day sound came
// back ON site-wide and only the ambient Nature beds now start off (sound.js, key ff-sound-nature-v3). The switch stays in the repo, inactive:
// sound-switch.js sets window.FF_SOUND_OFF from ONE value (var SOUND_OFF = false) and every sound path still reads it, so flipping it to
// true silences the whole site again. Static checks + real headless Chromium:
//  - the shipped default: sound-switch.js is the first script on every page with sound code, cache-busted, and its one value is false;
//  - Home (1280 and 390): the Sound pill is there, sound is on, Nature starts off for a fresh visitor, nothing is force-muted
//    (FF_SOUND_FORCED stays 0 / unset); a talking video with native controls is NOT force-muted on unmute; the Kids' Shop film has its Music button;
//  - the switch still works: with window.FF_SOUND_OFF = true (set before the page loads, as the old suites did) Home has no pill and no
//    AudioContext, a friend's tap plays no voice, the talking intro stays muted, a controls video plays muted with captions and an unmute
//    snaps back, the storybook has no "Read to me", the Kids' Shop has no Music button, and the room-kit cue offers no "Turn sound on".
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('one value: sound-switch.js (SOUND_OFF = false, owner 2026-10-10) loads first, before any other script, on every page with sound code; cache-busted', () => {
  const sw = read('sound-switch.js');
  assert.equal((sw.match(/^  var SOUND_OFF = (true|false);/gm) || []).length, 1, 'exactly one switch value');
  assert.match(sw, /^  var SOUND_OFF = false;/m, 'sound is on');
  const pages = fs.readdirSync(ROOT).filter(f => f.endsWith('.html') && read(f).includes('sound.js?v='));
  assert.ok(pages.length > 100, `prerendered pages: ${pages.length}`);
  for (const f of pages) {
    const html = read(f), at = html.indexOf('<script src="sound-switch.js?v=');
    assert.ok(at > 0, f + ' loads sound-switch.js');
    assert.equal(html.indexOf('<script src='), at, f + ': sound-switch.js is the first script file');
  }
  // every sound path still reads the flag, so flipping it back to true silences them
  for (const f of ['sound.js', 'entry.js', 'friend-voices.js', 'hero-motion.js', 'home-video.js', 'supporting-cast.js', 'kids-film.js', 'family-library.js', 'room-kit.js', 'loop-widget.js', 'whole-child.js'])
    assert.match(read(f), /FF_SOUND_OFF/, f);
  assert.match(read('README.md'), /Sound kill switch/);
  // the Nature beds default off, under the new key
  assert.match(read('sound.js'), /ff-sound-nature-v3/);
  assert.match(read('sound.js'), /nature = !OFF && get\(NKEY\) === 'on'/);
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
async function open(width, route, motion = true, off = null) {
  const ctx = await browser.newContext({ viewport: h.SIZES[width], reducedMotion: motion ? 'no-preference' : 'reduce', ...(width === 390 ? { isMobile: true, hasTouch: true } : {}) });
  await ctx.addInitScript(SPY);
  if (off !== null) await ctx.addInitScript(o => { window.FF_SOUND_OFF = o; }, off);   // off = true flips the kill switch on before any page script runs
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${site.base}?fresh=so-${Date.now()}#${route}`); await page.waitForTimeout(1500);
  return { ctx, page, errors };
}
const aud = page => page.evaluate(() => ({ ...window.__aud, forced: window.FF_SOUND_FORCED || 0, nature: window.FFSound.nature(), nat: (document.querySelector('.ffs-nat') || {}).getAttribute ? document.querySelector('.ffs-nat').getAttribute('aria-pressed') : null, flag: window.FF_SOUND_OFF, off: window.FFSound.off, on: window.FFSound.enabled(), pill: !!document.querySelector('.ffs') }));
const SILENT = { loud: 0, ac: 0, speak: 0, forced: 0, flag: true, off: true, on: false, pill: false, nature: false, nat: null };
const silent = (a, what) => { const { plays, ...rest } = a; assert.deepEqual(rest, SILENT, what); };

// ---- the shipped default: sound on, Nature off
for (const width of [1280, 390]) {
  test(`${width}px Home (sound on): the Sound pill is there, a fresh visitor has Sound on and Nature off, nothing is force-muted`, async () => {
    const { ctx, page, errors } = await open(width, 'home');
    const a = await aud(page);
    assert.deepEqual([a.flag, !!a.off, a.on, a.pill, a.nature, a.forced], [false, false, true, true, false, 0], JSON.stringify(a));
    assert.equal(await page.getAttribute('.ffs-main', 'aria-pressed'), 'true', 'Sound pill pressed (on)');
    assert.notEqual(await page.getAttribute('.ffs-nat', 'aria-pressed'), 'true', 'Nature starts off');
    assert.equal(await page.evaluate(() => localStorage.getItem('ff-sound-nature-v3')), null, 'nothing stored: off is the default, not a stored choice');
    assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-sound')), null, 'the kill-switch marker is absent');
    await page.click('.ffa-friend[data-k=bop]'); await page.waitForTimeout(600);
    assert.equal((await aud(page)).forced, 0, 'the safety net caught nothing');
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}

test('a talking video with native controls is NOT force-muted on unmute (FF_SOUND_FORCED stays 0)', async () => {
  const { ctx, page, errors } = await open(1280, 'activities/bop');
  const v = await page.$('video[controls]');
  await v.scrollIntoViewIfNeeded(); await v.evaluate(x => x.play()); await page.waitForTimeout(1200);
  await v.evaluate(x => { x.muted = false; }); await page.waitForTimeout(300);
  const st = await v.evaluate(x => ({ muted: x.muted, playing: !x.paused }));
  assert.deepEqual(st, { muted: false, playing: true });
  assert.equal((await aud(page)).forced, 0, 'the unmute was not caught');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test("Kids' Shop (sound on): the film has its Music button and music credit", async () => {
  const { ctx, page, errors } = await open(1280, 'kids-shop');
  await page.waitForTimeout(1500);
  const f = await page.evaluate(() => ({ music: !!document.querySelector('[data-kf-music]'), credit: !!document.querySelector('.kf-credit'), playing: !document.querySelector('[data-kf-video]').paused }));
  assert.deepEqual(f, { music: true, credit: true, playing: true });
  assert.equal((await aud(page)).forced, 0);
  assert.deepEqual(errors, []);
  await ctx.close();
});

// ---- the switch still works: flip it to true (window.FF_SOUND_OFF = true before the page loads) and the site is silent again
for (const width of [1280, 390]) {
  test(`${width}px Home with the switch flipped to true: no pill, no AudioContext, a friend says hello in words only, the talking intro stays muted`, async () => {
    const { ctx, page, errors } = await open(width, 'home', true, true);
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

test('switch flipped to true: a talking video with native controls plays muted, captions showing, an unmute snaps back; storybook has no Read to me', async () => {
  const { ctx, page, errors } = await open(1280, 'activities/bop', true, true);
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

test("switch flipped to true: the Kids' Shop film plays muted with no Music button and no music credit", async () => {
  const { ctx, page, errors } = await open(1280, 'kids-shop', true, true);
  await page.waitForTimeout(1500);
  const f = await page.evaluate(() => { const v = document.querySelector('[data-kf-video]'); return { music: !!document.querySelector('[data-kf-music]'), credit: !!document.querySelector('.kf-credit'), muted: v.muted, playing: !v.paused }; });
  assert.deepEqual(f, { music: false, credit: false, muted: true, playing: true });
  silent(await aud(page), "the Kids' Shop is silent");
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('habit videos: sound on after the Play tap by default; with the switch flipped to true they stay muted at volume 0', async () => {
  for (const off of [false, true]) {
    const ctx = await browser.newContext({ viewport: h.SIZES[390], reducedMotion: 'reduce' });
    await ctx.addInitScript(o => { window.FF_SOUND_OFF = o; }, off);
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${site.base}habit-calm-breathing`);
    await page.waitForSelector('.hb-play'); await page.click('.hb-play'); await page.waitForTimeout(500);
    assert.deepEqual(await page.$eval('.hb-vid', v => ({ muted: v.muted, volume: v.volume, controls: v.controls })), { muted: off, volume: off ? 0 : 1, controls: false }, `switch ${off}`);
    assert.deepEqual(errors, []);
    await ctx.close();
  }
});
