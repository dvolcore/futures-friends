'use strict';
// The entry gate (entry.js, owner 2026-10-07: "Make it start with it ON — for demonstration purposes I need ALL the effects on").
// Real headless Chromium, the untouched browser (loadChromium({ gate: true }); every other suite starts past the gate).
//  - the first page load of a session opens on the gate: an aria-modal dialog with a label, focus on "Tap to enter", the page rendered
//    underneath (crawlers and the DOM keep the content), the page behind inert, Tab kept inside, axe clean;
//  - the hero's opening (hero-world.js) and the cast (hero-motion.js) wait for it: nothing plays behind it, and after the tap the
//    opening plays in view; the one tap (or Enter) wakes sound with Nature on;
//  - "Enter without sound": sound off for the session only (nothing stored); once per session; ?nogate skips; reduced motion fades.
//  - SOUND (owner 2026-10-10, later the same day): sound is back ON by default (sound-switch.js, SOUND_OFF = false) and the ambient
//    Nature beds start OFF. The kill switch is still proven flipped on (window.FF_SOUND_OFF = true before the page loads): the gate is
//    then ONE "Tap to enter" with no sound wording and no "Enter without sound", and nothing makes a sound.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const H = () => import('./a11y-harness.mjs');
let h, site, browser;
test.before(async () => { h = await H(); site = await h.startSite(); browser = await h.loadChromium({ gate: true }).launch(); });
test.after(async () => { await browser.close(); await site.close(); });

const ctxFor = async (width, motion = true, killed = false) => {
  const ctx = await browser.newContext({ viewport: h.SIZES[width], reducedMotion: motion ? 'no-preference' : 'reduce', ...(width === 390 ? { isMobile: true, hasTouch: true } : {}) });
  await ctx.addInitScript(() => { window.__acs = 0; const N = window.AudioContext; if (N) window.AudioContext = class extends N { constructor(...a) { super(...a); window.__acs++; } }; });
  if (killed) await ctx.addInitScript(() => { window.FF_SOUND_OFF = true; });   // the kill switch flipped on: the silent gate
  return ctx;
};
const errorsOf = page => { const e = []; page.on('pageerror', x => e.push(x.message)); return e; };
const gateFacts = page => page.evaluate(() => {
  const g = document.querySelector('.ffe');
  return g && { role: g.getAttribute('role'), modal: g.getAttribute('aria-modal'), label: document.getElementById(g.getAttribute('aria-labelledby')).textContent, focus: document.activeElement && document.activeElement.className,
    open: window.FFEntry.open(), view: document.querySelector('#view').textContent.trim().length > 500, inert: !!document.querySelector('#view').closest('[inert]'),
    opening: (document.querySelector('.mh-hero') || {}).dataset ? document.querySelector('.mh-hero').dataset.opening : null };
});

test('wiring: entry.js loads before the hero code and views (so the opening can wait), entry.css after sound.css; cache-busted', () => {
  const html = read('index.html'), at = s => html.indexOf(s);
  assert.match(html, /<script src="entry\.js\?v=\d+"><\/script>/);
  assert.match(html, /<link rel="stylesheet" href="entry\.css\?v=\d+">/);
  assert.ok(at('src="entry.js') < at('src="views.js') && at('src="entry.js') < at('src="hero-world.js') && at('src="entry.js') < at('src="hero-motion.js'));
  assert.ok(at('href="entry.css') > at('href="sound.css'));
  for (const f of ['hero-world.js', 'hero-motion.js']) assert.match(read(f), /window\.FFEntry[\s\S]{0,160}\.wait\(/, `${f} waits for the gate`);
  assert.doesNotMatch(read('entry.js'), /fetch\(|XMLHttpRequest|localStorage/, 'sends nothing; remembers only the session');
});

for (const width of [1280, 390]) {
  test(`first load (${width}px, kill switch flipped on): the gate shows, labelled and modal, focus on Tap to enter, the page rendered underneath; the opening waits`, async () => {
    const ctx = await ctxFor(width, true, true); const page = await ctx.newPage(); const errors = errorsOf(page);
    await page.goto(`${site.base}?fresh=${Date.now()}#home`); await page.waitForTimeout(1500);
    const f = await gateFacts(page);
    assert.deepEqual([f.role, f.modal, f.label, f.focus, f.open, f.view, f.inert], ['dialog', 'true', 'Welcome to the Futures Friends world', 'ffe-go', true, true, true]);
    assert.equal(f.opening, 'held', 'the hero opening has not started behind the gate');
    const box = await page.$eval('.ffe-go', b => { const r = b.getBoundingClientRect(); return [r.width, r.height, r.bottom <= innerHeight]; });
    assert.ok(box[0] >= 200 && box[1] >= 60 && box[2], `one big button in view: ${box}`);
    // axe on the gate (the page behind is inert)
    const v = (await h.axe(page, { include: '.ffe', openDetails: false })).filter(x => ['serious', 'critical'].includes(x.impact));
    assert.deepEqual(v, []);
    // the sound kill switch: one "Tap to enter", no sound wording, no "Enter without sound"
    const words = await page.$eval('.ffe', g => g.innerText);
    assert.equal(await page.$('.ffe-quiet'), null, 'no "Enter without sound"');
    assert.doesNotMatch(words, /sound|music|birdsong|voices/i, 'no sound wording on the gate');
    assert.match(words, /Booker, Lumi, Zuri and Bop are out in the meadow, and they would like to say hello\./);
    // Tab stays in the gate
    // (audience split 2026-10-07: the next stop is the quiet "Enter for centers & programs" door)
    await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement.className), 'ffe-centers');
    // bilingual 2026-10-07: the English · Español choice (i18n.js) closes the card
    await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement.textContent), 'English');
    await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Español');
    await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement.className), 'ffe-go');
    await page.keyboard.press('Shift+Tab'); assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Español');
    await page.keyboard.press('Shift+Tab'); assert.equal(await page.evaluate(() => document.activeElement.textContent), 'English');
    await page.keyboard.press('Shift+Tab'); assert.equal(await page.evaluate(() => document.activeElement.className), 'ffe-centers');
    await page.keyboard.press('Shift+Tab'); assert.equal(await page.evaluate(() => document.activeElement.className), 'ffe-go');
    // Enter: the gate lifts and the opening plays in view; with the kill switch on nothing wakes (no AudioContext, no pill)
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => !document.querySelector('.ffe'), null, { timeout: 3000 });
    const after = await page.evaluate(() => ({ open: window.FFEntry.open(), ss: sessionStorage.getItem('ff-entered'), snd: window.FFSound.enabled(), unl: window.FFSound.unlocked(), nat: window.FFSound.nature(), stored: localStorage.getItem('ff-sound-v2'),
      opening: document.querySelector('.mh-hero').dataset.opening, inert: !!document.querySelector('[inert]'), lock: document.documentElement.classList.contains('ffe-open'), acs: window.__acs, pill: !!document.querySelector('.ffs') }));
    assert.deepEqual(after, { open: false, ss: '1', snd: false, unl: false, nat: false, stored: null, opening: after.opening, inert: false, lock: false, acs: 0, pill: false });
    assert.ok(['playing', 'done'].includes(after.opening), `the opening played after the gate: ${after.opening}`);
    // once per session: a reload does not show it again
    await page.reload(); await page.waitForTimeout(600);
    assert.equal(await page.$('.ffe'), null);
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}

test('shipped default (sound on): the sound wording and "Enter without sound" show; Tap to enter wakes sound, Nature stays off (owner 2026-10-10)', async () => {
  const ctx = await ctxFor(1280); const page = await ctx.newPage(); const errors = errorsOf(page);
  await page.goto(`${site.base}?fresh=${Date.now()}#home`); await page.waitForTimeout(1200);
  assert.match(await page.$eval('.ffe-p', p => p.textContent), /Sound on, if you can: there is music, birdsong and four voices\./);
  assert.ok(await page.$('.ffe-quiet'));
  await page.click('.ffe-go');
  await page.waitForFunction(() => !document.querySelector('.ffe'), null, { timeout: 3000 });
  assert.deepEqual(await page.evaluate(() => [window.FFSound.enabled(), window.FFSound.unlocked(), window.FFSound.nature(), !!document.querySelector('.ffs')]), [true, true, false, true]);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('shipped default: Enter without sound: sound off for this session only (nothing stored), the pill can turn it back on; ?nogate skips the gate', async () => {
  const ctx = await ctxFor(1280); const page = await ctx.newPage(); const errors = errorsOf(page);
  await page.goto(`${site.base}?fresh=${Date.now()}#pricing`); await page.waitForTimeout(800);
  assert.ok(await page.$('.ffe'), 'shown on any first page load of the session, inner pages too');
  await page.click('.ffe-quiet');
  await page.waitForFunction(() => !document.querySelector('.ffe'), null, { timeout: 3000 });
  assert.deepEqual(await page.evaluate(() => [window.FFSound.enabled(), window.FFSound.unlocked(), localStorage.getItem('ff-sound-v2'), sessionStorage.getItem('ff-entered')]), [false, false, null, '1']);
  const p2 = await ctx.newPage();
  await p2.goto(`${site.base}?nogate&fresh=${Date.now()}#home`); await p2.waitForTimeout(600);
  assert.equal(await p2.$('.ffe'), null);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('reduced motion: a simple fade (no travel); the kill switch (flipped on) keeps sound asleep', async () => {
  const ctx = await ctxFor(1280, false, true); const page = await ctx.newPage(); const errors = errorsOf(page);
  await page.goto(`${site.base}?fresh=${Date.now()}#home`); await page.waitForTimeout(800);
  await page.click('.ffe-go');
  const t = await page.evaluate(() => { const g = document.querySelector('.ffe'); return g ? getComputedStyle(g).transform : 'gone'; });
  assert.ok(t === 'none' || t === 'gone', `no travel: ${t}`);
  await page.waitForFunction(() => !document.querySelector('.ffe'), null, { timeout: 2000 });
  assert.deepEqual(await page.evaluate(() => [window.FFSound.unlocked(), window.__acs]), [false, 0]);
  assert.deepEqual(errors, []);
  await ctx.close();
});
