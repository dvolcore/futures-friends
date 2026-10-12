'use strict';
// SYS5, the Home performance pass (motion audit 2026-10-12, owner approved). Real headless Chromium:
//  - the hero card is not live glass while the opening plays (no backdrop-filter, no lens, a solid pane of the glass's resting
//    colour) and turns to glass when the camera lands; the first visit from a deep link (#watch) still ends on #home;
//  - the fly-through's cloud bank leaves the compositor as each cloud finishes its pass; the camera's idle drift waits while the
//    camera cranes down and goes on when it lands;
//  - the fixed felt sky's JS path (browsers without scroll-driven CSS) writes a value only when it changes; the day still turns;
//  - Booker reads the page before he writes, re-reads the words and controls only when the scroll settles (not every 500 ms), and
//    still never stands on words or controls;
//  - reduced motion and the motion switch keep everything still, as before.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const H = () => import('./a11y-harness.mjs');
let h, site, gateBrowser, browser;
test.before(async () => { h = await H(); site = await h.startSite(); gateBrowser = await h.loadChromium({ gate: true }).launch(); browser = await h.loadChromium().launch(); });
test.after(async () => { await gateBrowser.close(); await browser.close(); await site.close(); });
const errorsOf = page => { const e = []; page.on('pageerror', x => e.push(x.message)); return e; };

test('wiring: the card is solid while the opening plays and glass after; the drift waits; the sky writes on change; Booker has no 500 ms sweep', () => {
  const css = read('meadow-hero.css'), hd = read('home-day.js'), bw = read('booker-walk.js'), hw = read('hero-world.js'), hwc = read('hero-world.css');
  assert.match(css, /\.mh-hero\[data-opening=held\] \.mh-card,\.mh-hero\[data-opening=playing\] \.mh-card\{-webkit-backdrop-filter:none;backdrop-filter:none;background-color:#F4F6E6\}/);
  assert.match(css, /\.mh-hero\[data-opening=done\] \.mh-card\{transition:background-color \.6s/);
  assert.match(hwc, /\.mh-hero\.mh-alive\[data-opening=playing\] \.mh-plane\{animation-play-state:paused\}/);
  assert.match(hd, /const put = \(n, e, prop, val\) => \{ if \(last\[n\] === val\) return;/);
  assert.doesNotMatch(bw, /obsAt > 500/, 'no obstacle sweep every 500 ms during a scroll');
  assert.match(bw, /const settled = \(\) =>/);
  assert.match(hw, /addEventListener\('finish', \(\) => \{ el\.style\.display = 'none'/);
  assert.doesNotMatch(hw, /filter: 'blur\(0px\)'/, 'the identity filter is written as none');
});

test('first visit from #watch (1280): the card has no backdrop-filter while the opening plays, glass once landed; ends on #home; the bank leaves', async () => {
  const ctx = await gateBrowser.newContext({ viewport: h.SIZES[1280], reducedMotion: 'no-preference' });
  await ctx.addInitScript(() => {
    window.__card = [];
    const look = () => {
      const hero = document.querySelector('#view .mh-hero'), c = hero && hero.querySelector('.mh-card');
      if (c) { const cs = getComputedStyle(c), op = hero.dataset.opening || ''; const last = window.__card[window.__card.length - 1];
        const pl = hero.querySelector('.mh-world .mh-plane');
        const row = { op, bf: cs.backdropFilter, bg: cs.backgroundColor, clouds: hero.querySelectorAll('.mh-veil').length, shown: [...hero.querySelectorAll('.mh-veil')].filter(v => v.style.display !== 'none').length, drift: pl ? getComputedStyle(pl).animationPlayState : '' };
        if (!last || last.op !== row.op || last.bf !== row.bf || last.shown !== row.shown) window.__card.push(row); }
      requestAnimationFrame(look);
    };
    requestAnimationFrame(look);
  });
  const page = await ctx.newPage(); const errors = errorsOf(page);
  await page.goto(`${site.base}?fresh=${Date.now()}#watch`);
  await page.getByRole('button', { name: /tap to enter/i }).first().click();
  await page.waitForFunction(() => document.querySelector('#view .mh-hero') && document.querySelector('#view .mh-hero').dataset.opening === 'done', null, { timeout: 60000 });
  await page.waitForTimeout(1200);
  const r = await page.evaluate(() => ({ rows: window.__card, hash: location.hash, bf: getComputedStyle(document.querySelector('.mh-card')).backdropFilter, bg: getComputedStyle(document.querySelector('.mh-card')).backgroundColor,
    drift: getComputedStyle(document.querySelector('.mh-world .mh-plane')).animationPlayState }));
  const playing = r.rows.filter(x => x.op === 'playing' || x.op === 'held');
  assert.ok(playing.length, 'the opening was seen');
  for (const x of playing) { assert.equal(x.bf, 'none', `no live blur while ${x.op}`); assert.equal(x.bg, 'rgb(244, 246, 230)', 'the solid pane'); assert.equal(x.drift, 'paused', 'the idle drift waits'); }
  assert.ok(playing.some(x => x.op === 'playing' && x.clouds >= 6 && x.shown >= 6), 'it starts inside the cloud bank');
  assert.ok(playing.some(x => x.op === 'playing' && x.clouds >= 6 && x.shown === 0), 'each cloud leaves once it has passed, before the opening ends');
  assert.match(r.bf, /blur\(/, 'glass once the camera has landed'); assert.match(r.bf, /saturate/);
  assert.equal(r.bg, 'rgba(255, 251, 244, 0.8)');
  assert.equal(r.drift, 'running', 'the drift goes on once the camera has landed');
  assert.equal(r.hash, '#home', 'the first visit ends on Home');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('the fixed sky, JS path (1280, a browser without scroll-driven CSS): nothing written while nothing changes, and the day still turns', async () => {
  const ctx = await browser.newContext({ viewport: h.SIZES[1280], reducedMotion: 'no-preference' });
  await ctx.addInitScript(() => { const o = CSS.supports.bind(CSS); CSS.supports = (...a) => (/animation-timeline/.test(a.join(' ')) ? false : o(...a)); });
  const page = await ctx.newPage(); const errors = errorsOf(page);
  await h.goto(page, site.base, 'home', 900);
  assert.notEqual(await page.evaluate(() => document.querySelector('.hd-stage').dataset.engine), 'css');
  // in the hero's stretch every track is flat: a scroll there writes nothing to the sky
  await page.evaluate(() => { window.__w = 0; new MutationObserver(m => { window.__w += m.length; }).observe(document.querySelector('.hd-stage'), { subtree: true, attributes: true, attributeFilter: ['style'] }); });
  for (const y of [4, 12, 24, 40, 12, 0]) { await page.evaluate(v => scrollTo(0, v), y); await page.waitForTimeout(80); }
  assert.equal(await page.evaluate(() => window.__w), 0, 'no style writes while no value changes');
  const at = async sel => {
    await page.evaluate(s => { const e = document.querySelector(s), r = e.getBoundingClientRect(); scrollTo(0, scrollY + r.top + r.height / 2 - innerHeight / 2); }, sel);
    await page.waitForTimeout(300);
    return page.evaluate(() => ({ o: [...document.querySelectorAll('.hd-stage .hd-sky')].map(x => +(+getComputedStyle(x).opacity).toFixed(2)), sunO: +getComputedStyle(document.querySelector('.hd-sun')).opacity }));
  };
  const friends = await at('.hc-friends'), day = await at('.hc-day'), trust = await at('.hc-trust');
  assert.ok(friends.o[1] > 0.9 && friends.o[2] < 0.1, `midday sky at the friends: ${friends.o}`);
  assert.ok(day.o[2] > 0.9 && day.o[4] < 0.1, `afternoon plate at the day path: ${day.o}`);
  assert.ok(trust.o[4] > 0.9, `sunset plate at trust: ${trust.o}`);
  assert.ok(friends.sunO > 0.9 && trust.sunO < 0.1);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('Booker (1280): no forced reads of every word during a scroll; a few cached boxes per frame; still never on words or controls', async () => {
  const ctx = await browser.newContext({ viewport: h.SIZES[1280], reducedMotion: 'no-preference' });
  await ctx.addInitScript(() => {
    window.__gb = { on: false, booker: 0, sweep: 0 };
    const g = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function () {
      if (window.__gb.on) { const s = new Error().stack || ''; if (/\bobstacles\b/.test(s) && /booker-walk\.js/.test(s)) window.__gb.sweep++; else if (/booker-walk\.js/.test(s)) window.__gb.booker++; }
      return g.call(this);
    };
  });
  const page = await ctx.newPage(); const errors = errorsOf(page);
  await h.goto(page, site.base, 'home', 900);
  await page.evaluate(() => scrollTo(0, 1200)); await page.waitForTimeout(400);
  await page.waitForFunction(() => document.querySelector('#bw-layer .bw-walker'), null, { timeout: 30000 });
  await page.waitForTimeout(600);
  // a scroll burst: 80 wheel steps (sweeps of every word happened every 500 ms before SYS5)
  await page.mouse.move(640, 400);
  await page.evaluate(() => { const o = window.FFHomeDay.obstacles; window.FFHomeDay.obstacles = function (...a) { if (window.__gb.on && /booker-walk\.js/.test(new Error().stack || '')) window.__gb.sweeps++; return o.apply(this, a); }; });
  await page.evaluate(() => { window.__frames = 0; window.__gb.sweeps = 0; window.__gb.on = true; const f = () => { if (!window.__gb.on) return; window.__frames++; requestAnimationFrame(f); }; requestAnimationFrame(f); });
  const t0 = Date.now();
  for (let i = 0; i < 80; i++) { await page.mouse.wheel(0, 90); await page.waitForTimeout(25); }
  const r = await page.evaluate(() => { window.__gb.on = false; return { ...window.__gb, frames: window.__frames }; });
  const ms = Date.now() - t0;
  assert.ok(r.frames > 20, `frames sampled (${r.frames})`);
  assert.ok(r.sweeps <= Math.max(2, Math.floor(ms / 1500)), `word-and-control sweeps during a ${ms} ms scroll: ${r.sweeps} (${r.sweep} box reads; only when the scroll settles (a pause in the wheel), was every 500 ms = ${Math.floor(ms / 500)})`);
  assert.ok(r.booker / r.frames <= 2.5, `Booker's own box reads per frame: ${(r.booker / r.frames).toFixed(2)} (${r.booker} in ${r.frames})`);
  // and he still never stands on words or controls: settle at steps down the page and compare his box with the exact boxes
  const H2 = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  let seen = 0;
  for (let y = 600; y < H2; y += 380) {
    await page.evaluate(v => scrollTo(0, v), y);
    await page.waitForTimeout(420);
    const hit = await page.evaluate(() => {
      const w = document.querySelector('.bw-walker'); if (!w || !w.classList.contains('is-on')) return null;
      const r = w.getBoundingClientRect(), b = { l: r.left, r: r.right, t: r.top + scrollY, b: r.bottom + scrollY };
      const o = window.FFHomeDay.obstacles(0).find(x => !(b.r <= x.l || b.l >= x.r || b.b <= x.t || b.t >= x.b));
      return { on: true, o: o || null };
    });
    if (hit) { seen++; assert.equal(hit.o, null, `Booker over words or a control at ${y}: ${JSON.stringify(hit.o)}`); }
  }
  assert.ok(seen > 0, 'Booker was seen walking');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('reduced motion and the motion switch: still as before (glass card, no stage, no walker, no cloud bank)', async () => {
  const ctx = await browser.newContext({ viewport: h.SIZES[1280], reducedMotion: 'reduce' });
  const page = await ctx.newPage(); const errors = errorsOf(page);
  await h.goto(page, site.base, 'home', 900);
  const still = () => page.evaluate(() => ({ op: document.querySelector('.mh-hero').dataset.opening || null, bf: /blur\(/.test(getComputedStyle(document.querySelector('.mh-card')).backdropFilter),
    stage: !!document.querySelector('.hd-stage'), walker: !!document.querySelector('.bw-walker'), veil: document.querySelectorAll('.mh-veil').length }));
  assert.deepEqual(await still(), { op: null, bf: true, stage: false, walker: false, veil: 0 });
  await ctx.close();
  const ctx2 = await browser.newContext({ viewport: h.SIZES[1280], reducedMotion: 'no-preference' });
  const p2 = await ctx2.newPage(); const errors2 = errorsOf(p2);
  await h.goto(p2, site.base, 'home', 900);
  await p2.evaluate(() => { document.documentElement.dataset.motion = 'off'; window.render(); });
  await p2.waitForTimeout(400);
  const s2 = await p2.evaluate(() => ({ alive: document.querySelector('.mh-hero').classList.contains('mh-alive'), bf: /blur\(/.test(getComputedStyle(document.querySelector('.mh-card')).backdropFilter),
    stage: !!document.querySelector('.hd-stage'), walker: !!document.querySelector('.bw-walker') }));
  assert.deepEqual(s2, { alive: false, bf: true, stage: false, walker: false });
  assert.deepEqual(errors, []); assert.deepEqual(errors2, []);
  await ctx2.close();
});
