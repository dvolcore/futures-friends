'use strict';
// Wave 8 lane SOUND (owner 2026-10-06): "also some sound effects that kind of go with everything that's going on."
// Encodes sound.js / sound.css against docs/reviews/WAVE8_CONTRACT.md, in source and in real headless Chromium (harness as
// tests/a11y.test.js):
//  - every sound is made in code (no audio files), small (< 15 KB gzipped for both files), and answers every contract name;
//  - sound is ON by default (owner 2026-10-06): one AudioContext at arrival plays as soon as the browser allows (phones: the first tap
//    anywhere, which also plays a hello); turning it off is remembered and then nothing is created;
//  - unknown names and junk events are ignored; per-sound rate limits (footsteps ~4 a second), letter-pops queue on a beat;
//  - a hidden tab suspends audio and it resumes only when visible and on; nature beds are a second switch, OFF by default (owner 2026-10-10: sound stays on, only the ambient beds start off; the nature key is -v3, so an old stored -v2 choice is ignored), and duck under any other voice;
//  - the site's own events sound: .btn / [data-go] / link clicks -> tap, ff:audience -> chime, hashchange -> page-turn;
//  - the felt pill: real toggle buttons with names and states, 44 px targets, a visible focus ring, axe clean, and clear of every
//    other fixed or sticky piece of UI at 1280, 390 and 1600 px; the one-time hint never covers content.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const CONTRACT = ['whoosh', 'cloud-puff', 'letter-pop', 'logo-land', 'hop', 'land', 'chime', 'sparkle', 'wink', 'squish', 'rain', 'tap',
  'page-turn', 'card-flip', 'badge', 'footstep', 'wave', 'firefly', 'night-chime'];

test('procedural only: no audio files, no network, small; index loads the pill after wayfinding and before analytics', () => {
  const js = read('sound.js'), css = read('sound.css');
  assert.doesNotMatch(js + css, /\.(mp3|wav|ogg|m4a|aac|flac|webm)\b|fetch\(|XMLHttpRequest|decodeAudioData|<audio/i, 'everything is synthesized');
  // the only <audio> element is the in-memory silent clip that moves older iPhones into media playback (ring/silent switch); no file, no network
  assert.match(js, /new Audio\(URL\.createObjectURL\(new Blob\(/, 'the silent clip is generated in memory');
  assert.equal((js.match(/new Audio\(/g) || []).length, 1);
  const gz = zlib.gzipSync(js).length + zlib.gzipSync(css).length;
  assert.ok(gz < 15 * 1024, `${gz} bytes gzipped`);
  for (const n of CONTRACT) assert.match(js, new RegExp(`(^|[\\s{,])'?${n}'?: \\(G, t, x, g`, 'm'), `${n} is synthesized`);
  // the title tune: FUTURES climbs, FRIENDS climbs, all on the C major pentatonic
  const mel = JSON.parse(js.match(/const MEL = (\[[^\]]+\])/)[1]);
  assert.equal(mel.length, 14);
  for (const w of [mel.slice(0, 7), mel.slice(7)]) for (let i = 1; i < 7; i++) assert.ok(w[i] > w[i - 1], 'each word rises');
  assert.ok(mel.every(m => [0, 2, 4, 7, 9].includes(m % 12)), 'pentatonic');
  const html = read('index.html');
  const at = s => html.indexOf(s);
  assert.ok(at('href="sound.css?v=') > at('href="wayfinding.css?v='));
  assert.ok(at('<script src="sound.js?v=') > at('<script src="wayfinding.js?v=') && at('<script src="sound.js?v=') < at('<script src="analytics.js?v='));
  assert.ok(+html.match(/sound\.js\?v=(\d+)/)[1] >= 1 && +html.match(/sound\.css\?v=(\d+)/)[1] >= 1);
  assert.match(css, /@media print\{\.ffs\{display:none!important\}\}/);
  // motion in the pill only with motion allowed (device setting AND the site's switch)
  const anim = css.split('\n').filter(l => /animation:/.test(l));
  assert.ok(anim.length >= 1 && anim.every(l => /^\s*:root:not\(\[data-motion=off\]\)/.test(l)));
  assert.match(css, /@media \(prefers-reduced-motion:no-preference\)\{\n(\s*:root:not\(\[data-motion=off\]\)[^\n]+\n)+\}/);
});

// ---------------------------------------------------------------- real browser
const H = () => import('./a11y-harness.mjs');
let h, srv, browser;
// SOUND KILL SWITCH (owner 2026-10-10, later the same day: sound is back ON; sound-switch.js ships SOUND_OFF = false; see sound-off.test.js).
// flipBack is now harmless: it pins FF_SOUND_OFF = false in every context, which is the shipped default, so this suite stays independent of the switch.
const flipBack = b => { const nc = b.newContext.bind(b); b.newContext = async (...a) => { const c = await nc(...a); await c.addInitScript(() => { window.FF_SOUND_OFF = false; }); return c; }; return b; };
test.before(async () => { h = await H(); srv = await h.startSite(); browser = flipBack(await h.loadChromium().launch()); });
test.after(async () => { await browser.close(); await srv.close(); });
const url = (r = 'home') => `${srv.base}?fresh=w8s-${Date.now()}#${r}`;

// Counts AudioContexts, sound sources and their start times on the live page (OfflineAudioContext is not counted).
const SPY = () => {
  const N = window.AudioContext; window.__ac = []; window.__src = 0; window.__starts = [];
  window.AudioContext = class extends N { constructor(...a) { super(...a); window.__ac.push(this); } };
  for (const m of ['createOscillator', 'createBufferSource']) {
    const f = BaseAudioContext.prototype[m];
    BaseAudioContext.prototype[m] = function () { const n = f.apply(this, arguments); if (!(this instanceof OfflineAudioContext)) { window.__src++; if (m === 'createOscillator') { const s = n.start; n.start = function (w) { window.__starts.push(w); return s.apply(this, arguments); }; } } return n; };
  }
};
async function page(width = 1280, opts = {}) {
  const ctx = await browser.newContext({ viewport: h.SIZES[width] || { width, height: 900 }, reducedMotion: opts.motion ? 'no-preference' : 'reduce' });
  const p = await ctx.newPage(); const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.addInitScript(SPY);
  // Most tests below were written for an off-by-default pill and start from 'off' (as a visitor who turned it off would);
  // opts.fresh gives the true first-visit default (on). The guard keeps choices made during the test across reloads.
  if (!opts.stored && !opts.fresh) await p.addInitScript(() => { if (localStorage.getItem('ff-sound-v2') === null) localStorage.setItem('ff-sound-v2', 'off'); });
  if (opts.stored) await p.addInitScript(s => { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, opts.stored);
  await p.goto(url(opts.route)); await p.waitForFunction(() => document.querySelector('.ffs'));
  return { ctx, p, errors };
}
const state = p => p.evaluate(() => ({ ac: window.__ac.length, st: window.__ac[0] ? window.__ac[0].state : null, src: window.__src, on: window.FFSound.enabled(),
  pressed: document.querySelector('.ffs-main').getAttribute('aria-pressed'), nat: document.querySelector('.ffs-nat').hidden ? null : document.querySelector('.ffs-nat').getAttribute('aria-pressed'),
  stored: localStorage.getItem('ff-sound-v2'), storedNature: localStorage.getItem('ff-sound-nature-v3'), label: document.querySelector('.ffs-main').innerText.replace(/\s+/g, ' ').trim() }));
const tapEmpty = async p => { const at = await p.evaluate(() => { const hb = document.querySelector('header.bar').getBoundingClientRect(); return [Math.round(innerWidth * 0.62), Math.round(hb.bottom - 8)]; }); await p.mouse.click(at[0], at[1]); };
const fire = (p, detail) => p.evaluate(d => document.dispatchEvent(new CustomEvent('ff:sfx', { detail: d })), detail);

test('first visit: sound is ON by default, yet nothing exists or plays until the first tap, which unlocks it (owner 2026-10-06)', async () => {
  const f = await page(1280, { fresh: true });
  let s0 = await state(f.p);
  // sound is on and the engine is ready at arrival, but the browser keeps it asleep until a gesture (where a browser allows
  // autoplay, it would already be running and the opening would play with sound)
  // Headless Chromium allows autoplay, so the context may already run here; on a phone it stays 'suspended' until the first tap.
  // Either way: one context at arrival, and sound plays exactly when the browser lets it.
  assert.deepEqual([s0.ac, s0.src, s0.on, s0.pressed, s0.stored, s0.label], [1, 0, true, 'true', null, 'Sound on']);
  assert.ok(['running', 'suspended'].includes(s0.st));
  assert.equal(await f.p.evaluate(() => window.FFSound.play('chime')), s0.st === 'running', 'sound plays only when the browser allows it');
  await tapEmpty(f.p); await f.p.waitForTimeout(250);
  s0 = await state(f.p);
  assert.deepEqual([s0.ac, s0.st], [1, 'running'], 'the first tap anywhere unlocks sound');

  assert.equal(await f.p.evaluate(() => window.FFSound.play('chime')), true);
  await f.p.click('.ffs-main');
  s0 = await state(f.p);
  assert.deepEqual([s0.on, s0.pressed, s0.stored, s0.label], [false, 'false', 'off', 'Sound off'], 'one tap turns it off, remembered');
  assert.deepEqual(f.errors, []);
  await f.ctx.close();
});

test('turned off: never autoplays: no AudioContext while off; events make no sound', async () => {
  const { ctx, p, errors } = await page(1280);
  assert.deepEqual(await state(p), { ac: 0, st: null, src: 0, on: false, pressed: 'false', nat: null, stored: 'off', storedNature: null, label: 'Sound off' });
  for (const name of CONTRACT) await fire(p, { name, x: 0.3 });
  assert.equal(await p.evaluate(() => window.FFSound.play('chime')), false);
  await tapEmpty(p);                                     // a gesture on the page with sound off: still nothing
  await p.keyboard.press('Shift');
  await p.evaluate(() => { location.hash = '#friends'; }); await p.waitForTimeout(200);
  const s = await state(p);
  assert.equal(s.ac, 0, 'no AudioContext while sound is off, even after taps and keys');
  assert.equal(s.src, 0);
  // FFSound is frozen and small (wave 9 adds unlocked(), read by the talking intro on Home; false here: sound is off, no context)
  assert.deepEqual(await p.evaluate(() => [Object.isFrozen(window.FFSound), Object.keys(window.FFSound).sort().join(), window.FFSound.names.join(), window.FFSound.unlocked()]),
    [true, 'ducked,enabled,names,nature,play,render,set,unlocked', CONTRACT.join(), false]);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('the toggle turns sound on (one AudioContext, made inside the tap), remembers it, and a return visit waits for a tap before any sound', async () => {
  const { ctx, p, errors } = await page(1280);
  await p.click('.ffs-main'); await p.waitForTimeout(250);
  let s = await state(p);
  assert.deepEqual([s.ac, s.st, s.on, s.pressed, s.nat, s.stored, s.label], [1, 'running', true, 'true', 'false', 'on', 'Sound on'], 'Sound comes on; Nature stays off until the visitor turns it on (owner 2026-10-10)');
  assert.ok(s.src > 0, 'turning on gives a small confirmation sound');
  assert.equal(await p.evaluate(() => window.FFSound.play('chime')), true);
  // return visit: remembered as on, but the browser has no gesture yet, so nothing is created and nothing plays
  await p.goto(url()); await p.waitForFunction(() => document.querySelector('.ffs'));
  s = await state(p);
  assert.deepEqual([s.ac, s.on, s.pressed, s.label], [1, true, 'true', 'Sound on']);
  assert.equal(await p.evaluate(() => window.FFSound.play('chime')), s.st === 'running', 'remembered on: sound as soon as the browser allows');
  await tapEmpty(p); await p.waitForTimeout(200);           // the first tap on the page unlocks it
  s = await state(p);
  assert.deepEqual([s.ac, s.st], [1, 'running']);
  assert.equal(await p.evaluate(() => window.FFSound.play('chime')), true);
  // off again: remembered, silent
  await p.click('.ffs-main');
  s = await state(p);
  assert.deepEqual([s.on, s.pressed, s.nat, s.stored, s.label], [false, 'false', null, 'off', 'Sound off']);
  assert.equal(await p.evaluate(() => window.FFSound.play('chime')), false);
  await p.waitForTimeout(900);
  assert.equal((await state(p)).st, 'suspended', 'off: after the fade the audio graph sleeps (no idle work)');
  // set() from code with no gesture behind it (here: at page load) records the choice but creates nothing
  const ctx2 = await browser.newContext({ viewport: h.SIZES[1280], reducedMotion: 'reduce' });
  const p2 = await ctx2.newPage();
  await p2.addInitScript(SPY);
  await p2.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { window.__set = window.FFSound.set(true); }));
  await p2.goto(url()); await p2.waitForFunction(() => window.__set === true);
  await p2.waitForTimeout(300);
  const s2 = await state(p2);
  assert.deepEqual([s2.ac, s2.on, s2.stored], [1, true, 'on']);   // on by default: one context made at arrival (asleep on phones until a tap)
  assert.deepEqual(errors, []);
  await ctx.close(); await ctx2.close();
});

test('blocked storage: the pill still works for the visit and nothing throws', async () => {
  const ctx = await browser.newContext({ viewport: h.SIZES[390], reducedMotion: 'reduce' });
  const p = await ctx.newPage(); const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); });
  await p.goto(url()); await p.waitForFunction(() => document.querySelector('.ffs'));
  assert.equal(await p.evaluate(() => window.FFSound.enabled()), true, 'on by default even with storage blocked');
  await p.click('.ffs-main');
  assert.equal(await p.evaluate(() => window.FFSound.enabled()), false);
  assert.equal(await p.getAttribute('.ffs-main', 'aria-pressed'), 'false');
  await p.click('.ffs-main');
  assert.equal(await p.evaluate(() => window.FFSound.enabled()), true);
  assert.equal(await p.getAttribute('.ffs-main', 'aria-pressed'), 'true');
  assert.deepEqual(errors.filter(e => /ffs|FFSound|sound/i.test(e)), []);
  await ctx.close();
});

test('unknown names and junk events are ignored; known contract events sound; x and gain are clamped', async () => {
  const { ctx, p, errors } = await page(1280, { stored: { 'ff-sound-v2': 'on' } });
  await tapEmpty(p); await p.waitForTimeout(150);
  const before = (await state(p)).src;
  for (const d of [{ name: 'nope' }, { name: 'constructor' }, { name: '__proto__' }, { name: 'toString' }, { name: 42 }, {}, null, 'tap', { name: 'TAP' }]) await fire(p, d);
  await p.evaluate(() => { document.dispatchEvent(new CustomEvent('ff:sfx')); document.dispatchEvent(new CustomEvent('ff:daypart', { detail: { part: 'midnight' } })); document.dispatchEvent(new CustomEvent('ff:daypart', { detail: null })); });
  assert.equal((await state(p)).src, before, 'nothing sounded');
  assert.deepEqual(await p.evaluate(() => ['nope', 'constructor', 'hasOwnProperty'].map(n => window.FFSound.play(n))), [false, false, false]);
  const played = [];
  for (const name of CONTRACT) { const a = (await state(p)).src; await fire(p, { name, x: 9, gain: 7 }); await p.waitForTimeout(70); played.push([name, (await state(p)).src > a]); }
  assert.deepEqual(played.filter(x => !x[1]), [], 'every contract name sounds');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('rate limits: footsteps at most ~4 a second, repeats of one sound are spaced, letter-pops queue on a beat and the queue is capped', async () => {
  const { ctx, p } = await page(1280, { stored: { 'ff-sound-v2': 'on' } });
  await tapEmpty(p); await p.waitForTimeout(150);
  // 40 footsteps over one second
  const steps = await p.evaluate(async () => { let n = 0; for (let i = 0; i < 40; i++) { if (window.FFSound.play('footstep')) n++; await new Promise(r => setTimeout(r, 25)); } return n; });
  assert.ok(steps >= 3 && steps <= 5, `footsteps accepted in ~1 s: ${steps}`);
  assert.deepEqual(await p.evaluate(() => [window.FFSound.play('tap'), window.FFSound.play('tap')]), [true, false], 'a second tap in the same instant is dropped');
  // the 14 title letters landing at once: all queued, each on its own beat, 0.11 s apart
  await p.waitForTimeout(1200);
  const pops = await p.evaluate(() => {
    window.__starts = [];
    const ok = []; for (let i = 0; i < 14; i++) ok.push(window.FFSound.play('letter-pop'));
    return { ok, starts: [...new Set(window.__starts.map(t => t.toFixed(3)))].map(Number) };
  });
  assert.deepEqual(pops.ok, Array(14).fill(true));
  assert.equal(pops.starts.length, 14, 'fourteen beats');
  for (let i = 1; i < 14; i++) assert.ok(Math.abs(pops.starts[i] - pops.starts[i - 1] - 0.11) < 0.002, `beat ${i}: ${pops.starts[i] - pops.starts[i - 1]}`);
  await p.waitForTimeout(2000);
  const flood = await p.evaluate(() => { let n = 0; for (let i = 0; i < 60; i++) if (window.FFSound.play('letter-pop')) n++; return n; });
  assert.ok(flood <= 16, `a flood of letter-pops is capped (${flood} of 60 queued)`);
  await ctx.close();
});

test('a hidden tab suspends sound (and nature); it resumes only when visible and still on', async () => {
  const { ctx, p, errors } = await page(1280, { stored: { 'ff-sound-v2': 'on', 'ff-sound-nature-v3': 'on' } });
  await tapEmpty(p); await p.waitForTimeout(400);
  const vis = v => p.evaluate(v => { Object.defineProperty(document, 'visibilityState', { value: v, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }, v);
  await vis('hidden'); await p.waitForTimeout(150);
  assert.equal((await state(p)).st, 'suspended');
  const a = (await state(p)).src;
  assert.equal(await p.evaluate(() => window.FFSound.play('chime')), false);
  await fire(p, { name: 'sparkle' }); await p.waitForTimeout(1200);
  assert.equal((await state(p)).src, a, 'nothing is made while hidden, not even the nature bed');
  await vis('visible'); await p.waitForTimeout(150);
  assert.equal((await state(p)).st, 'running');
  assert.equal(await p.evaluate(() => window.FFSound.play('chime')), true);
  // off, hidden, visible: stays suspended
  await p.click('.ffs-main'); await vis('hidden'); await p.waitForTimeout(100); await vis('visible'); await p.waitForTimeout(150);
  assert.equal((await state(p)).st, 'suspended', 'sound off: a visible tab does not wake it');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('nature beds: a second switch, off once the visitor turns it off (remembered); follow ff:daypart', async () => {
  // owner 2026-10-10: nature is OFF by default (key -v3); a visitor who turns it on can turn it off again and that is remembered
  const { ctx, p, errors } = await page(1280, { stored: { 'ff-sound-v2': 'off', 'ff-sound-nature-v3': 'off' } });
  await p.click('.ffs-main'); await p.waitForTimeout(1500);
  const quiet = (await state(p)).src;
  await p.waitForTimeout(1500);
  assert.equal((await state(p)).src, quiet, 'sound on, nature off: no bed running');
  await p.click('.ffs-nat');
  let s = await state(p);
  assert.deepEqual([s.nat, s.storedNature], ['true', 'on']);
  for (const part of ['morning', 'afternoon', 'sunset', 'night']) {
    const a = (await state(p)).src;
    await p.evaluate(part => document.dispatchEvent(new CustomEvent('ff:daypart', { detail: { part } })), part);
    await p.waitForTimeout(part === 'morning' ? 4000 : 1600);
    assert.ok((await state(p)).src > a, `${part}: the bed makes sound`);
  }
  await p.click('.ffs-nat'); await p.waitForTimeout(4600);
  const b = (await state(p)).src; await p.waitForTimeout(2500);
  assert.equal((await state(p)).src, b, 'nature off: the bed stops after its fade');
  assert.equal((await state(p)).storedNature, 'off');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('defaults (owner 2026-10-10): a fresh visitor has Sound on and Nature off; old stored keys (pre -v2 sound, -v2 nature) are ignored', async () => {
  // an old nature "on" under the retired -v2 key must not switch the beds on either
  const { ctx, p, errors } = await page(1280, { stored: { 'ff-sound': 'off', 'ff-sound-nature': 'off', 'ff-sound-nature-v2': 'on' } });
  const s = await state(p);
  assert.deepEqual([s.on, s.pressed, s.nat, s.stored, s.storedNature], [true, 'true', 'false', null, null]);
  assert.equal(await p.evaluate(() => window.FFSound.nature()), false);
  // "Enter without sound" (the entry gate) turns sound off for the session only: nothing is stored
  await p.evaluate(() => window.FFSound.set(false, { session: true }));
  assert.deepEqual([(await state(p)).on, (await state(p)).stored], [false, null]);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('ducking: the nature beds fade out while a video plays with its sound (or a friend speaks) and come back after', async () => {
  const { ctx, p, errors } = await page(1280, { stored: { 'ff-sound-v2': 'on', 'ff-sound-nature-v3': 'on' } });   // beds are off by default now: this visitor turned them on
  await tapEmpty(p); await p.waitForTimeout(400);
  const duck = () => p.evaluate(() => { const c = window.__ac[0]; return { ducked: window.FFSound.ducked(), nature: window.FFSound.nature(), st: c && c.state }; });
  assert.deepEqual(await duck(), { ducked: false, nature: true, st: 'running' });
  // a video with a sound track, playing unmuted (the tap above is the gesture that allows it)
  await p.evaluate(() => { const v = document.createElement('video'); v.id = 'duck-test'; v.src = 'video/ff-intro-titled-16x9.mp4'; v.playsInline = true; v.style.cssText = 'position:fixed;width:2px;height:2px;left:0;top:0'; document.body.appendChild(v); return v.play(); });
  await p.waitForFunction(() => window.FFSound.ducked(), null, { timeout: 4000 });
  // muted, it no longer speaks over the beds
  await p.evaluate(() => { document.getElementById('duck-test').muted = true; });
  await p.waitForFunction(() => !window.FFSound.ducked(), null, { timeout: 2000 });
  await p.evaluate(() => { document.getElementById('duck-test').muted = false; });
  await p.waitForFunction(() => window.FFSound.ducked(), null, { timeout: 2000 });
  await p.evaluate(() => document.getElementById('duck-test').pause());
  await p.waitForFunction(() => !window.FFSound.ducked(), null, { timeout: 2000 });
  // a friend's voice line (FFVoices, a detached Audio) ducks too, through its ff:duck ping and the scheduler's re-check
  const voiced = await p.evaluate(() => (window.FFVoices ? window.FFVoices.play('booker') : 'none'));
  if (voiced === 'playing') {
    await p.waitForFunction(() => window.FFSound.ducked(), null, { timeout: 4000 });
    await p.evaluate(() => window.FFVoices.stop());
    await p.waitForFunction(() => !window.FFSound.ducked(), null, { timeout: 2000 });
  }
  assert.deepEqual(errors, []);
  await ctx.close();
});

test("the site's own events sound: a button or link click taps, choosing an audience chimes, a route change turns a page", async () => {
  const { ctx, p, errors } = await page(1280, { stored: { 'ff-sound-v2': 'on' } });
  await tapEmpty(p); await p.waitForTimeout(200);
  const grow = async (act) => { const a = (await state(p)).src; await act(); await p.waitForTimeout(120); return (await state(p)).src - a; };
  assert.ok(await grow(() => p.evaluate(() => window.FFAudience.set('centers'))) >= 4, 'ff:audience -> chime (two bells)');
  await p.waitForTimeout(300);
  assert.ok(await grow(() => p.evaluate(() => { location.hash = '#pricing'; })) >= 2, 'hashchange -> page-turn');
  await p.waitForTimeout(300);
  await p.evaluate(() => { const b = document.createElement('button'); b.className = 'btn'; b.id = 'w8b'; b.textContent = 'x'; document.querySelector('#view').prepend(b); });
  assert.ok(await grow(() => p.click('#w8b')) >= 2, '.btn click -> tap');
  assert.deepEqual(errors, []);
  await ctx.close();
});

for (const width of [1280, 390, 1600]) {
  test(`the pill (Sound and Nature) is clear of every other fixed or sticky piece of UI and of the screen edges (${width}px)`, async () => {
    const { ctx, p, errors } = await page(width);
    await p.click('.ffs-main'); await p.waitForTimeout(200);
    for (const r of ['home', 'friends', 'pricing', 'for-centers', 'enroll']) {
      await h.goto(p, srv.base, r, 300);
      for (const y of [0, 900, 99999]) {
        await p.evaluate(y => window.scrollTo(0, y), y); await p.waitForTimeout(300);
        const res = await p.evaluate(() => {
          const pill = [...document.querySelectorAll('.ffs-btn')].filter(b => !b.hidden).map(b => b.getBoundingClientRect());
          // every fixed or sticky thing on screen, except the pill itself
          // (the back-to-top button counts even while it is faded out: its slot is always kept clear)
          const others = [...document.querySelectorAll('body *')].filter(e => !e.closest('.ffs')).filter(e => { const s = getComputedStyle(e); return /fixed|sticky/.test(s.position) && s.display !== 'none' && s.visibility !== 'hidden' && (+s.opacity > 0 || e.classList.contains('totop')); })
            .map(e => { const r = e.getBoundingClientRect(); return { id: e.id || String(e.className).slice(0, 40) || e.tagName, l: r.left, r: r.right, t: r.top, b: r.bottom }; }).filter(o => o.r > o.l && o.b > o.t);
          const hits = others.filter(o => pill.some(q => q.left < o.r && q.right > o.l && q.top < o.b && q.bottom > o.t)).map(o => o.id);
          return { hits, n: pill.length, sizes: pill.map(q => [Math.round(q.width), Math.round(q.height)]), edge: document.documentElement.classList.contains('ff-dock-tuck')   // visual audit 2026-10-07: over words or controls the dock tucks to a 14 px edge tab (motion.js FFdock)
              ? pill.every(q => innerWidth - q.left >= 10 && innerWidth - q.left <= 18 && q.bottom <= innerHeight - 8)
              : pill.every(q => q.left >= 8 && q.right <= innerWidth - 8 && q.bottom <= innerHeight - 8),
            pos: getComputedStyle(document.querySelector('.ffs')).position, right: innerWidth - document.querySelector('.ffs').getBoundingClientRect().right,
            aboveTop: (() => { const t = document.querySelector('.totop').getBoundingClientRect(); return pill.every(q => q.bottom <= t.top - 6); })() };
        });
        assert.deepEqual(res.hits, [], `#${r} at ${y}: overlaps ${res.hits}`);
        assert.equal(res.n, 2, 'Sound and Nature both showing');
        assert.ok(res.sizes.every(([w, hh]) => w >= 44 && hh >= 44), `44 px targets ${JSON.stringify(res.sizes)}`);
        assert.ok(res.edge, 'inside the screen');
        assert.equal(res.pos, 'fixed'); assert.ok(res.right < 20, 'bottom-right'); assert.ok(res.aboveTop, 'above the back-to-top button');
      }
    }
    if (width === 1600) {                                               // the wayfinding context card owns the bottom-left margin here
      await h.goto(p, srv.base, 'for-centers', 300);
      const both = await p.evaluate(() => { const c = document.getElementById('ffw-next').getBoundingClientRect(), s = document.querySelector('.ffs').getBoundingClientRect(); return { card: getComputedStyle(document.getElementById('ffw-next')).position, gap: s.left - c.right, inMargin: s.left >= (innerWidth + 1180) / 2 }; });
      assert.equal(both.card, 'fixed'); assert.ok(both.gap > 400, 'far from the context card'); assert.ok(both.inMargin, 'in the empty right margin');
    }
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}

for (const width of [1280, 390]) {
  test(`a11y (${width}px): real toggle buttons with names and states, a visible focus ring, axe clean off and on`, async () => {
    const { ctx, p, errors } = await page(width);
    // the computed accessible tree, as a screen reader gets it: a named landmark holding toggle buttons; the visible "on/off" chip is not
    // part of the name (the pressed state carries it), and Nature only exists once sound is on
    const tree = () => p.locator('.ffs').ariaSnapshot();
    assert.equal(await tree(), '- region "Sound settings":\n  - button "Sound"');
    assert.equal(await p.getByRole('button', { name: 'Sound', exact: true, pressed: false }).count(), 1);
    assert.equal(await p.$eval('.ffs-main', b => b.type), 'button');
    const mine = async () => (await h.axe(p, { openDetails: false })).filter(v => v.nodes.some(n => /\.ffs|ffs-/.test(n.target)));   // the whole page, every impact
    assert.deepEqual(await mine(), []);
    await p.keyboard.press('Tab'); await p.focus('.ffs-main'); await p.keyboard.press('Enter'); await p.waitForTimeout(150);
    assert.equal(await tree(), '- region "Sound settings":\n  - button "Nature sounds"\n  - button "Sound" [pressed]', 'Enter toggles Sound on; Nature (off by default) appears before Sound in reading order, as on screen, and is not pressed');
    assert.equal(await p.getByRole('button', { name: 'Nature sounds', exact: true, pressed: false }).count(), 1);
    const ring = await p.evaluate(() => {
      const el = document.activeElement, cs = getComputedStyle(el);
      const rgb = c => (c.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);
      const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      const cr = (a, b) => { const x = lum(a) + 0.05, y = lum(b) + 0.05; return Math.max(x, y) / Math.min(x, y); };
      return { cls: el.className, fv: el.matches(':focus-visible'), style: cs.outlineStyle, w: parseFloat(cs.outlineWidth), vsButton: +cr(rgb(cs.outlineColor), rgb(cs.backgroundColor)).toFixed(2), vsWhite: +cr(rgb(cs.outlineColor), [255, 255, 255]).toFixed(2), halo: cs.boxShadow.includes('rgb(255, 255, 255)') };
    });
    assert.equal(ring.cls, 'ffs-btn ffs-main');
    assert.ok(ring.fv && ring.style !== 'none' && ring.w >= 2, JSON.stringify(ring));
    assert.ok(ring.vsButton >= 3 && ring.vsWhite >= 3 && ring.halo, `ring contrast ${JSON.stringify(ring)}`);
    await p.click('.ffs-nat'); await p.waitForTimeout(150);   // the visitor turns the beds on: the pressed state follows
    assert.equal(await tree(), '- region "Sound settings":\n  - button "Nature sounds" [pressed]\n  - button "Sound" [pressed]');
    assert.deepEqual(await mine(), []);
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}

// what the hint may never cover: words, links, buttons, fields and pictures that mean something (decorative alt="" art is fine)
const COVERS = () => { const r = document.querySelector('.ffs-hint').getBoundingClientRect();
  return [...document.querySelectorAll('#view a, #view button, #view input, #view label, #view h1, #view h2, #view h3, #view p, #view li, #view img:not([alt=""]), footer a, footer p')]
    .filter(el => { const b = el.getBoundingClientRect(); return b.width && b.height && b.left < r.right && b.right > r.left && b.top < r.bottom && b.bottom > r.top; }).map(el => el.tagName + ' ' + (el.textContent || el.alt || '').trim().slice(0, 30)); };
test('the one-time hint on Home: covers nothing that means something (1280, 390), never takes a tap, gone at the first touch, once per browser; with no clear spot it stays hidden', async () => {
  for (const width of [1280, 390]) {
    const { ctx, p, errors } = await page(width, { motion: true });
    await p.waitForTimeout(3600);
    const shown = await p.evaluate(() => { const t = document.querySelector('.ffs-hint'); return { hidden: t.hidden, events: getComputedStyle(t).pointerEvents, aria: t.getAttribute('aria-hidden'), text: t.textContent }; });
    assert.deepEqual(shown, { hidden: false, events: 'none', aria: 'true', text: 'Tap for sound' }, `${width}px`);
    assert.deepEqual(await p.evaluate(COVERS), [], `${width}px: the hint covers nothing`);
    await tapEmpty(p); await p.waitForTimeout(100);
    assert.equal(await p.evaluate(() => document.querySelector('.ffs-hint').hidden), true, 'gone at the first touch');
    await p.goto(url()); await p.waitForTimeout(3600);
    assert.equal(await p.evaluate(() => document.querySelector('.ffs-hint').hidden), true, 'once per browser');
    assert.deepEqual(errors, []);
    await ctx.close();
  }
  // every spot taken by words: no hint at all
  const busy = await page(390, { motion: true });
  await busy.p.evaluate(() => { const q = document.createElement('p'); q.textContent = 'Words everywhere near the bottom of the screen.'; q.style.cssText = 'position:fixed;left:0;right:0;bottom:0;height:260px;margin:0;opacity:.01'; document.querySelector('#view').appendChild(q); });
  await busy.p.waitForTimeout(3600);
  assert.equal(await busy.p.evaluate(() => document.querySelector('.ffs-hint').hidden), true, 'no clear spot: no hint');
  // other pages: no hint; reduced motion: no animation in the pill, ever
  const other = await page(1280, { motion: true, route: 'pricing' });
  await other.p.waitForTimeout(3600);
  assert.equal(await other.p.evaluate(() => document.querySelector('.ffs-hint').hidden), true, 'Home only');
  const rm = await page(1280);
  await rm.p.waitForTimeout(3600); await rm.p.click('.ffs-main');
  assert.equal(await rm.p.evaluate(() => document.querySelector('.ffs').getAnimations({ subtree: true }).length), 0);
  await busy.ctx.close(); await other.ctx.close(); await rm.ctx.close();
});
