// Wave 9 VOICES (owner 2026-10-07: "when I click on any of these characters they should definitely speak, and it should take
// them into his video section"). Each friend on the Home hero says their own hello from the talking welcome video when tapped,
// one at a time, respecting the site's sound switch; the dialogue card is the transcript and links to the friend's own videos,
// stories or activities. File checks and VM checks first, then real headless Chromium at 1280 and 390 px.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const KEYS = ['booker', 'lumi', 'zuri', 'bop'];
const NAME = { booker: 'Booker', lumi: 'Lumi', zuri: 'Zuri', bop: 'Bop' };
const LINES = {
  booker: "Hi! I'm Booker. I love to learn, even when it's tricky!",
  lumi: "I'm Lumi! I help everyone feel like they belong.",
  zuri: "I'm Zuri! Let's explore and find out together!",
  bop: "I'm Bop! Move your body, grow your mind!"
};
const GO = { booker: '#activities/booker', lumi: '#activities/lumi', zuri: '#activities/zuri', bop: '#bop-at-home' };

function voices() {
  const c = vm.createContext({ window: {}, document: { addEventListener() {}, documentElement: { dataset: {} } } });
  vm.runInContext(read('friend-voices.js'), c, { filename: 'friend-voices.js' });
  return c.window.FFVoices;
}

// ---------------------------------------------------------------- files (no browser)
test('the four hello files exist as Opus WebM and AAC M4A, each 60 KB or less', () => {
  for (const k of KEYS) {
    const webm = fs.readFileSync(path.join(ROOT, `audio/friends/${k}-hello.webm`));
    const m4a = fs.readFileSync(path.join(ROOT, `audio/friends/${k}-hello.m4a`));
    assert.equal(webm.subarray(0, 4).toString('hex'), '1a45dfa3', `${k}: WebM (EBML) header`);
    assert.ok(webm.includes(Buffer.from('OpusHead')), `${k}: the WebM carries Opus`);
    assert.equal(m4a.subarray(4, 8).toString(), 'ftyp', `${k}: MP4 container`);
    assert.ok(m4a.includes(Buffer.from('mp4a')), `${k}: the M4A carries AAC`);
    for (const [f, b] of [['webm', webm], ['m4a', m4a]]) assert.ok(b.length > 8000 && b.length <= 60 * 1024, `${k}.${f}: ${b.length} bytes`);
  }
  assert.deepEqual(fs.readdirSync(path.join(ROOT, 'audio/friends')).sort(), KEYS.flatMap(k => [`${k}-hello.m4a`, `${k}-hello.webm`]).sort(), 'nothing else in audio/friends');
});

test('the lines are the words each friend says in the talking intro (video/ff-intro-titled.en.vtt); Bop starts at "I\'m Bop!"', () => {
  const V = voices();
  const vtt = read('video/ff-intro-titled.en.vtt');
  for (const k of KEYS) {
    const m = vtt.match(new RegExp(`<v ${NAME[k]}>${NAME[k]}: (.+)`));
    assert.ok(m, k);
    assert.equal(m[1].trim().replace(/^And I'm Bop!/, "I'm Bop!"), LINES[k], k);
    assert.equal(V.LINES[k], LINES[k], k);
    assert.equal(V.GO[k][0], GO[k].slice(1), `${k}: link route`);
    assert.match(V.src(k, 'webm'), new RegExp(`^audio/friends/${k}-hello\\.webm\\?v=\\d+$`));
  }
  assert.ok(Object.isFrozen(V));
  assert.equal(V.play('nobody'), 'none');
});

test('index.html loads friend-voices.css and friend-voices.js (after hero-motion.js), cache-busted', () => {
  const html = read('index.html');
  assert.match(html, /<link rel="stylesheet" href="friend-voices\.css\?v=\d+">/);
  const hm = html.indexOf('<script src="hero-motion.js?v='), fv = html.indexOf('<script src="friend-voices.js?v=');
  assert.ok(hm > 0 && fv > hm, 'friend-voices.js after hero-motion.js');
  assert.ok(+html.match(/hero-motion\.js\?v=(\d+)/)[1] >= 5);
});

// ---------------------------------------------------------------- real browser
const H = () => import('./a11y-harness.mjs');
let h, srv, browser;
// SOUND KILL SWITCH (owner 2026-10-10): the public site ships silent (sound-switch.js, window.FF_SOUND_OFF = true; see sound-off.test.js).
// This suite checks the sound engine is intact for the day the owner flips it back: every context starts with FF_SOUND_OFF = false.
const flipBack = b => { const nc = b.newContext.bind(b); b.newContext = async (...a) => { const c = await nc(...a); await c.addInitScript(() => { window.FF_SOUND_OFF = false; }); return c; }; return b; };
test.before(async () => { h = await H(); srv = await h.startSite(); browser = flipBack(await h.loadChromium().launch()); });
test.after(async () => { await browser.close(); await srv.close(); });

// HTMLMediaElement.play/pause are spied: every call is logged with the element's file, and the set of elements "playing" is kept.
async function open(w, { sound = 'on', motion = false } = {}) {
  const ctx = await browser.newContext({ viewport: h.SIZES[w], reducedMotion: motion ? 'no-preference' : 'reduce' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(s => {
    try { localStorage.setItem('ff-sound-v2', s); localStorage.setItem('ff-sound-hint', '1'); } catch (_) { /* blocked */ }
    window.__plays = []; window.__pauses = []; window.__on = new Set();
    const file = a => (a.currentSrc || a.src || '').replace(/^.*\/(audio\/)/, '$1');
    // only the friends' voices are counted (the page's own videos keep their real play/pause)
    const play = HTMLMediaElement.prototype.play, pause = HTMLMediaElement.prototype.pause, ours = a => /^audio\/friends\//.test(file(a));
    HTMLMediaElement.prototype.play = function () { if (!ours(this)) return play.call(this); window.__plays.push(file(this)); window.__on.add(this); window.__last = this; return Promise.resolve(); };
    HTMLMediaElement.prototype.pause = function () { if (!ours(this)) return pause.call(this); window.__pauses.push(file(this)); window.__on.delete(this); };
  }, sound);
  await h.goto(page, srv.base, 'home', 500);
  return { ctx, page, errors };
}
const card = page => page.evaluate(() => {
  const s = document.querySelector('.mh-say'), go = s.querySelector('.mh-saygo');
  return { hidden: s.hidden, k: s.dataset.k || '', line: (s.querySelector('.mh-sayline') || {}).textContent || '', status: document.querySelector('.mh-stage [role=status]').textContent,
    live: document.querySelector('.mh-stage [role=status]').getAttribute('aria-live'), speaking: s.classList.contains('is-speaking'),
    hint: (s.querySelector('.mh-sayhint') || {}).textContent || '', go: go ? [go.textContent.trim(), go.getAttribute('href')] : null,
    talking: [...document.querySelectorAll('.mh-stage .ffa-fig.ffm-talking')].map(f => f.dataset.k), playing: [...window.__on].map(a => a.src.replace(/^.*\/(audio\/)/, '$1')) };
});

for (const w of [1280, 390]) {
  test(`${w}px: each friend says their own line; the card is the transcript and links to their own page; one voice at a time`, async () => {
    const { ctx, page, errors } = await open(w);
    const labels = {};
    for (const k of KEYS) {
      await page.click(`.ffa-friend[data-k=${k}]`);
      const c = await card(page);
      const plays = await page.evaluate(() => window.__plays.slice());
      assert.match(plays[plays.length - 1], new RegExp(`^audio/friends/${k}-hello\\.(webm|m4a)\\?v=\\d+$`), `${k}: its own file`);
      assert.equal(c.hidden, false);
      assert.equal(c.k, k);
      assert.equal(c.line, LINES[k], `${k}: the card says exactly what ${k} says`);
      assert.equal(c.status, `${NAME[k]}: ${LINES[k]}`, `${k}: the polite live region reads the transcript`);
      assert.equal(c.live, 'polite');
      assert.equal(c.go[1], GO[k], `${k}: link`);
      labels[k] = c.go[0];
      assert.equal(c.speaking, true, `${k}: speaking indicator`);
      assert.deepEqual(c.talking, [k], `${k}: only this friend does the talking bob`);
      assert.deepEqual(c.playing, [plays[plays.length - 1]], `${k}: one voice at a time`);
    }
    assert.deepEqual(labels, { booker: 'Booker’s videos and book', lumi: 'Lumi’s videos and book', zuri: 'Zuri’s videos and book', bop: 'Watch Bop’s movement videos' });
    assert.equal(await page.evaluate(() => window.__plays.length), 4, 'one play per tap, no extra sounds from audio elements');
    // the voice ends by itself: the indicator and the bob stop, the card stays open
    await page.evaluate(() => window.__last.dispatchEvent(new Event('ended')));
    let c = await card(page);
    assert.equal(c.speaking, false); assert.deepEqual(c.talking, []); assert.equal(c.hidden, false);
    // closing stops the voice
    await page.click('.ffa-friend[data-k=lumi]');
    assert.equal((await card(page)).speaking, true);
    await page.click('.mh-sayclose');
    c = await card(page);
    assert.equal(c.hidden, true); assert.equal(c.speaking, false); assert.deepEqual(c.playing, []);
    // tapping the same friend again closes the card and stops the voice
    await page.click('.ffa-friend[data-k=zuri]'); await page.click('.ffa-friend[data-k=zuri]');
    c = await card(page);
    assert.equal(c.hidden, true); assert.deepEqual(c.playing, []);
    // the same audio element is reused (made on the first tap, preload none)
    const els = await page.evaluate(() => [...document.querySelectorAll('audio')].length);
    assert.equal(els, 0, 'no <audio> element is added to the page');
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}

test('sound off (the site switch): no voice plays, the card says "Sound is off", the words are still there', async () => {
  for (const w of [1280, 390]) {
    const { ctx, page, errors } = await open(w, { sound: 'off' });
    assert.equal(await page.evaluate(() => window.FFSound.enabled()), false);
    await page.click('.ffa-friend[data-k=bop]');
    const c = await card(page);
    assert.deepEqual(await page.evaluate(() => window.__plays), [], 'nothing plays');
    assert.equal(c.line, LINES.bop);
    assert.equal(c.hint, 'Sound is off. Turn it on to hear Bop.');
    assert.equal(c.speaking, false);
    assert.equal(c.go[1], '#bop-at-home');
    // turning sound on makes the next tap speak
    await page.evaluate(() => window.FFSound.set(true));
    await page.click('.mh-sayclose');
    await page.click('.ffa-friend[data-k=bop]');
    assert.equal((await page.evaluate(() => window.__plays)).length, 1);
    assert.equal((await card(page)).hint, '');
    assert.deepEqual(errors, []);
    await ctx.close();
  }
});

test('keyboard: Enter on a friend speaks and moves focus into the card; Escape closes, stops the voice and returns focus', async () => {
  const { ctx, page, errors } = await open(1280);
  await page.focus('.ffa-friend[data-k=booker]');
  await page.keyboard.press('ArrowRight');
  const k = await page.evaluate(() => document.activeElement.dataset.k);
  await page.keyboard.press('Enter');
  let c = await card(page);
  assert.equal(c.k, k);
  assert.match((await page.evaluate(() => window.__plays))[0], new RegExp(`audio/friends/${k}-hello`));
  assert.equal(await page.evaluate(() => document.activeElement.className), 'mh-saygo', 'focus is in the card, on the link');
  await page.keyboard.press('Escape');
  c = await card(page);
  assert.equal(c.hidden, true); assert.deepEqual(c.playing, []);
  assert.equal(await page.evaluate(() => document.activeElement.dataset.k), k, 'focus back on the friend');
  // Booker by keyboard: his first line is his spoken line; the next button still moves on, the voice keeps going
  await page.focus('.ffa-friend[data-k=booker]'); await page.keyboard.press('Space');
  c = await card(page);
  assert.equal(c.line, LINES.booker);
  await page.click('.mh-saynext');
  assert.equal((await card(page)).line, 'Big breath, brave heart. I can show you around.');
  assert.deepEqual(errors, []);
  await ctx.close();
});

for (const w of [1280, 390]) {
  test(`${w}px: the card's link opens the friend's own video section: Bop's Move along video, the others' play-along videos`, async () => {
    const { ctx, page, errors } = await open(w);
    await page.click('.ffa-friend[data-k=bop]');
    await page.click('.mh-saygo');
    await page.waitForFunction(() => location.hash.startsWith('#bop-at-home') && document.activeElement && document.activeElement.matches('.wc-bopvid'), null, { timeout: 4000 });
    const r = await page.evaluate(() => { const b = document.querySelector('.wc-bopvid').getBoundingClientRect(); return [b.top, b.bottom, innerHeight, !!document.querySelector('.wc-bopvid video')]; });
    assert.ok(r[0] < r[2] && r[1] > 0 && r[3], `the video is on screen: ${r}`);
    assert.equal(await page.evaluate(() => window.__on.size), 0, 'leaving Home stops the voice');
    // Booker, Lumi and Zuri: their own video section on #activities/<friend>, on screen and focused, with real videos in it
    for (const k of ['booker', 'lumi', 'zuri']) {
      await h.goto(page, srv.base, 'home', 500);
      await page.click(`.ffa-friend[data-k=${k}]`);
      await page.click('.mh-saygo');
      await page.waitForFunction(k => location.hash === `#activities/${k}` && document.activeElement && document.activeElement.closest('#fl-friendvids') && document.getElementById('fl-friendvids').contains(document.getElementById(`watch-${k}`)), k, { timeout: 4000 });
      const s = await page.evaluate(k => { const sec = document.activeElement.closest('section'), b = document.getElementById(`watch-${k}`).getBoundingClientRect(); return [b.top < innerHeight && b.bottom > 0, sec.querySelectorAll('video').length, sec.textContent.includes('Play along with')]; }, k);
      assert.ok(s[0] && s[1] >= 1 && s[2], `${k}: ${s}`);
    }
    assert.deepEqual(errors, []);
    await ctx.close();
  });

  test(`${w}px: axe on Home with a friend speaking: nothing serious or critical; the speaking card never shifts the layout`, async () => {
    const { ctx, page, errors } = await open(w);
    await page.click('.ffa-friend[data-k=zuri]');
    await page.waitForTimeout(400);
    const v = (await h.axe(page)).filter(x => h.BLOCKING.includes(x.impact));
    assert.deepEqual(v, []);
    // the voice ending (no input) must not move anything: the indicator lives in the absolutely placed name tab
    const before = await page.evaluate(() => { const b = document.querySelector('.mh-say').getBoundingClientRect(); return [b.x, b.y, b.width, b.height]; });
    await page.evaluate(() => { window.__cls = 0; new PerformanceObserver(l => l.getEntries().forEach(e => { window.__cls += e.value; })).observe({ type: 'layout-shift' }); });
    await page.waitForTimeout(700);   // past the 500 ms "recent input" window
    await page.evaluate(() => window.__last.dispatchEvent(new Event('ended')));
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => { const b = document.querySelector('.mh-say').getBoundingClientRect(); return [b.x, b.y, b.width, b.height]; });
    assert.deepEqual(after, before);
    assert.equal(await page.evaluate(() => window.__cls), 0);
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}

test('the talking bob runs only with motion allowed; reduced motion still speaks, without the bob', async () => {
  for (const motion of [true, false]) {
    const { ctx, page, errors } = await open(1280, { motion });
    await page.waitForTimeout(motion ? 3200 : 0);   // past the entrance
    await page.click('.ffa-friend[data-k=bop]');
    const anim = await page.evaluate(() => getComputedStyle(document.querySelector('.ffa-fig.ffm-talking .ffa-hop>img')).animationName);
    assert.equal(anim, motion ? 'ffv-talk' : 'none');
    assert.equal((await page.evaluate(() => window.__plays)).length, 1, 'the voice plays either way');
    assert.deepEqual(errors, []);
    await ctx.close();
  }
});

test('the files really decode in the browser (Opus WebM) and run as long as the lines', async () => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${srv.base}?fresh=${Date.now()}#home`);
  const d = await page.evaluate(ks => Promise.all(ks.map(k => new Promise(r => { const a = new Audio(); a.preload = 'metadata'; a.onloadedmetadata = () => r(a.duration); a.onerror = () => r(-1); a.src = `audio/friends/${k}-hello.webm`; }))), KEYS);
  for (const [i, k] of KEYS.entries()) assert.ok(d[i] > 3 && d[i] < 6.5, `${k}: ${d[i]} s`);
  await ctx.close();
});
