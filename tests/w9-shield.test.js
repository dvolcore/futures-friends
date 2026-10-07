'use strict';
// Wave 9 SHIELD (owner 2026-10-07: "animate this locally, this is the main logo"): the Futures Learning Center shield in the footer
// ("A program of Futures Learning Center") becomes a layered inline SVG traced from img/brand/flc-mark-rev.png (flc-mark.js,
// tools/trace-flc-mark.py) that draws itself on first view, idles (star twinkle, shine) and replays on hover/focus/tap.
// Encoded here, in source and in real headless Chromium (harness as tests/a11y.test.js):
//  - the PNG stays in the HTML as the no-JS fallback (same alt); with JS every FLC mark the page had is an SVG with role="img" and
//    the accessible name "Futures Learning Center", in exactly the PNG's box (44 x 54.66 px), with no layout shift;
//  - at rest the SVG matches the PNG: overlay pixel diff under a threshold at the PNG's own grid, at 4x and at footer size;
//  - reduced motion and the site's motion switch: static (no animations, no masks), identical to the PNG;
//  - with motion: the intro plays once in view and settles to the rest state (masks removed); idle loops pause off screen and on
//    hidden tabs; hover replays and asks for ff:sfx 'sparkle'; a tap asks for the sound even when motion is off;
//  - brand rule: the FLC shield is the school logo only — never in the header, never merged with the Futures Friends wordmark.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
// Rest-state thresholds (0-255 scale). Measured 2026-10-07: rev 1x mean 3.66 / >64 2.3 %, footer mean 3.9 / >64 1.1 %, 4x mean 4.6
// / >64 3.2 %; light similar. Most of the residue is the PNG's own softness and compression halo on every edge (the vector is crisp).
const LIMIT = { '1x': { mean: 5, over64: 3.5 }, footer: { mean: 5.5, over64: 2 }, '4x': { mean: 6.5, over64: 4.5 } };

test('source: PNG fallback kept in the footer, new files wired after the motion kit and before analytics, versions >= 1', () => {
  const html = read('index.html');
  const imgs = html.match(/<img[^>]+img\/brand\/flc-[a-z-]+\.png[^>]*>/g) || [];
  assert.equal(imgs.length, 1, 'one FLC mark in the page markup: the footer');
  assert.match(imgs[0], /^<img src="img\/brand\/flc-mark-rev\.png" width="44" height="55" [^>]*alt="Futures Learning Center">$/);
  assert.match(html, /<div class="fprog"><img src="img\/brand\/flc-mark-rev\.png"/, 'inside "A program of" only');
  const at = s => html.indexOf(s);
  assert.ok(at('<script src="flc-mark.js?v=') > at('<script src="ff-motion.js?v='));
  assert.ok(at('<script src="flc-mark.js?v=') < at('<script src="analytics.js?v='));
  assert.ok(at('href="flc-mark.css?v=') > at('href="premium.css?v='));
  assert.ok(+html.match(/flc-mark\.js\?v=(\d+)/)[1] >= 1 && +html.match(/flc-mark\.css\?v=(\d+)/)[1] >= 1);
  // brand: the shield never shows in the header and the script never touches the Futures Friends wordmark files
  const header = html.slice(at('<header'), at('</header>'));
  assert.doesNotMatch(header, /flc-/);
  assert.doesNotMatch(read('flc-mark.js'), /ff-(white|navy|flat|sticker)|logo-mark\.png|shield\.png/);
});

test('source: layered paths are generated (shield, child, arrow, star, both colourways); motion only when allowed; idle CSS gated and pausable', () => {
  const js = read('flc-mark.js'), css = read('flc-mark.css');
  const P = JSON.parse(js.match(/\/\* PATHS \*\/const P = (\{.*?\});\/\* \/PATHS \*\//s)[1]);
  assert.deepEqual([P.w, P.h], [256, 318]);
  for (const k of ['shield', 'child', 'arrow', 'star', 'childSolid', 'armFill', 'lines', 'face']) assert.match(P.paths[k], /^M[\d.]+[ -]?[\d.]+[cl]/, k);
  assert.ok(Object.values(P.paths).join('').length < 45000, 'path data stays small');
  for (const k of ['shieldL', 'shieldR']) assert.ok(P.guides[k].length >= 6, `${k} centre line`);
  assert.match(js, /role: 'img', 'aria-label': NAME/);
  assert.match(js, /const NAME = 'Futures Learning Center'/);
  assert.match(js, /new CustomEvent\('ff:sfx', \{ detail: \{ name, x: [^}]+, src: 'flc-mark' \} \}\)/);
  assert.match(js, /sfx\('sparkle', svg\)/);
  assert.match(js, /pauseOffscreen\(svg\)/);
  assert.doesNotMatch(js, /fetch\(|XMLHttpRequest|localStorage|sendBeacon/, 'sends and stores nothing');
  const anim = css.split('\n').filter(l => /animation:/.test(l) && !/animation:none/.test(l));
  assert.ok(anim.length >= 3 && anim.every(l => /^\s*:root:not\(\[data-motion=off\]\) \.flcm\.is-live/.test(l)), 'every loop needs the motion switch');
  assert.match(css, /@media \(prefers-reduced-motion:no-preference\)\{/);
  assert.match(css, /\.flcm\.ffm-paused,\.flcm\.ffm-paused \*\{animation-play-state:paused!important\}/);
  assert.match(css, /footer \.fprog \.flcm\{width:44px;height:auto;flex:0 0 44px;margin-top:2px\}/, 'the img box, exactly');
});

// ---------------------------------------------------------------- real browser
const H = () => import('./a11y-harness.mjs');
const D = () => import('../tools/flc-mark-diff.mjs');
let h, d, srv, browser;
test.before(async () => { h = await H(); d = await D(); srv = await h.startSite(); browser = await h.loadChromium().launch(); });
test.after(async () => { await browser.close(); await srv.close(); });

async function open(width, opts = {}) {
  const ctx = await browser.newContext({ viewport: h.SIZES[width], reducedMotion: opts.motion ? 'no-preference' : 'reduce', javaScriptEnabled: opts.js !== false, deviceScaleFactor: opts.dpr || 1 });
  const p = await ctx.newPage(); const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.addInitScript(() => {
    localStorage.setItem('ff-sound-v2', 'off');
    window.__sfx = []; document.addEventListener('ff:sfx', e => { if (e.detail.src === 'flc-mark') window.__sfx.push(e.detail.name); });
    window.__cls = []; try { new PerformanceObserver(l => l.getEntries().forEach(e => { if (!e.hadRecentInput) window.__cls.push({ v: e.value, src: (e.sources || []).map(s => s.node && s.node.closest && s.node.closest('footer') ? 'footer' : (s.node && s.node.nodeName) || '') }); })).observe({ type: 'layout-shift', buffered: true }); } catch (e) { /* no API */ }
  });
  if (opts.motionOff) await p.addInitScript(() => { localStorage.setItem('ff-display-preferences', JSON.stringify({ motion2: false })); });   // the site's Decorative motion switch, off
  await p.goto(`${srv.base}?fresh=w9s-${Date.now()}#${opts.route || 'home'}`);
  if (opts.js !== false) await p.waitForFunction(() => document.querySelector('footer .fprog .flcm'));
  return { ctx, p, errors };
}
const toFooter = p => p.evaluate(() => document.querySelector('footer .fprog').scrollIntoView({ block: 'center' }));
const markState = p => p.evaluate(() => {
  const s = document.querySelector('footer .flcm');
  const anims = s.getAnimations({ subtree: true });
  return { live: s.classList.contains('is-live'), paused: s.classList.contains('ffm-paused'), masks: s.querySelectorAll('[mask]').length,
    waapi: anims.filter(a => !a.animationName).length, css: anims.filter(a => a.animationName).map(a => a.animationName + ':' + a.playState),
    star: getComputedStyle(s.querySelector('.flcm-star')).animationName, sparkOpacity: [...s.querySelectorAll('.flcm-spark')].map(n => getComputedStyle(n).opacity) };
});

test('the mark is present wherever the PNG was, with its accessible name, on several routes at 1280 and 390', async () => {
  for (const width of [1280, 390]) for (const route of ['home', 'enroll', 'about', 'at-home']) {
    const { ctx, p, errors } = await open(width, { route });
    const r = await p.evaluate(() => ({
      svgs: document.querySelectorAll('footer .fprog svg.flcm[role="img"][aria-label="Futures Learning Center"]').length,
      pngs: document.querySelectorAll('img[src*="img/brand/flc-"]').length,
      title: document.querySelector('footer .flcm title').textContent,
      focusable: document.querySelector('footer .flcm').getAttribute('tabindex'),
      inHeader: !!document.querySelector('header .flcm')
    }));
    assert.deepEqual(r, { svgs: 1, pngs: 0, title: 'Futures Learning Center', focusable: null, inHeader: false }, `${route} @ ${width}`);
    assert.equal(await p.getByRole('img', { name: 'Futures Learning Center', exact: true }).count(), 1, `${route} @ ${width}: one image by that name`);
    assert.deepEqual(errors, []);
    await ctx.close();
  }
});

test('no-JS: the PNG fallback renders in the same box; with JS the SVG takes exactly that box and nothing shifts', async () => {
  for (const width of [1280, 390]) {
    const box = p => p.evaluate(() => { const m = document.querySelector('footer .fprog > :first-child'), t = document.querySelector('footer .fprog > p');
      const a = m.getBoundingClientRect(), b = t.getBoundingClientRect(); return { tag: m.tagName.toLowerCase(), w: +a.width.toFixed(2), h: +a.height.toFixed(2), dx: +(b.left - a.left).toFixed(2), dy: +(b.top - a.top).toFixed(2), th: +b.height.toFixed(2) }; });
    const nojs = await open(width, { js: false });
    await toFooter(nojs.p);
    await nojs.p.waitForFunction(() => document.querySelector('footer .fprog img').complete);
    const a = await box(nojs.p);
    assert.equal(a.tag, 'img');
    assert.equal(await nojs.p.evaluate(() => document.querySelector('footer .fprog img').naturalWidth), 256, 'the fallback PNG loads');
    await nojs.ctx.close();
    const js = await open(width, { motion: true });
    await toFooter(js.p);
    await js.p.waitForTimeout(2300);                       // the whole intro
    const b = await box(js.p);
    assert.equal(b.tag, 'svg');
    assert.deepEqual({ w: b.w, h: b.h, dx: b.dx, dy: b.dy, th: b.th }, { w: a.w, h: a.h, dx: a.dx, dy: a.dy, th: a.th }, `same box @ ${width}`);
    assert.ok(Math.abs(b.w - 44) < 0.01 && Math.abs(b.h - 54.66) < 0.05, JSON.stringify(b));
    const cls = await js.p.evaluate(() => window.__cls);
    assert.equal(cls.filter(e => e.src.includes('footer')).length, 0, 'no layout shift in the footer: ' + JSON.stringify(cls));
    await js.ctx.close();
  }
});

test('rest state = the PNG: overlay diff under threshold for both colourways at 1x, 4x and footer size', async () => {
  const { ctx, page } = await d.openMark(browser, srv.base);
  for (const kind of ['rev', 'light']) for (const scale of ['1x', '4x', 'footer']) {
    const r = await d.measure(page, srv.base, kind, scale);
    assert.ok(r.mean < LIMIT[scale].mean && r.over64 < LIMIT[scale].over64, `${kind} ${scale}: ${JSON.stringify(r)}`);
  }
  await ctx.close();
});

test('reduced motion and the site motion switch: static mark, no animation, no masks; the live footer mark matches the PNG', async () => {
  for (const opts of [{}, { motion: true, motionOff: true }]) {
    const { ctx, p, errors } = await open(1280, Object.assign({ dpr: 2 }, opts));
    if (opts.motionOff) assert.equal(await p.evaluate(() => document.documentElement.dataset.motion), 'off');
    await toFooter(p);
    await p.waitForTimeout(1800);
    const s = await markState(p);
    assert.equal(s.waapi, 0, JSON.stringify(s));
    assert.equal(s.masks, 0);
    assert.equal(s.star, 'none');
    assert.ok(s.css.length === 0, JSON.stringify(s.css));
    assert.ok(s.sparkOpacity.every(o => o === '0'), 'sparkles hidden');
    // hover does nothing without motion; an explicit tap may still ask for the sparkle sound (wave 8 contract)
    const m = await p.evaluate(() => { const r = document.querySelector('footer .flcm').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
    await p.mouse.move(m[0], m[1]);
    await p.waitForTimeout(150);
    assert.equal((await markState(p)).waapi, 0);
    assert.deepEqual(await p.evaluate(() => window.__sfx), [], 'hover is silent without motion');
    await p.mouse.click(m[0], m[1]);
    assert.deepEqual(await p.evaluate(() => window.__sfx), ['sparkle'], 'a tap asks for the sparkle');
    assert.equal((await markState(p)).waapi, 0, 'still static');
    // the mounted footer mark against the PNG at the same size (device pixel ratio 2), on the footer's own ground
    const diff = await p.evaluate(async () => {
      const svg = document.querySelector('footer .flcm').cloneNode(true); svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }));
      const load = s => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = s; });
      const [a, b] = await Promise.all([load('img/brand/flc-mark-rev.png'), load(url)]);
      const px = img => { const c = document.createElement('canvas'); c.width = 88; c.height = 110; const x = c.getContext('2d'); x.fillStyle = getComputedStyle(document.querySelector('footer')).backgroundColor; x.fillRect(0, 0, 88, 110); x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, 88, 110); return x.getImageData(0, 0, 88, 110).data; };
      const A = px(a), B = px(b); let s = 0, o = 0;
      for (let i = 0; i < A.length; i += 4) { const m = Math.max(Math.abs(A[i] - B[i]), Math.abs(A[i + 1] - B[i + 1]), Math.abs(A[i + 2] - B[i + 2])); s += m; if (m > 64) o++; }
      return { mean: s / (A.length / 4), over64: o / (A.length / 4) * 100 };
    });
    assert.ok(diff.mean < 6 && diff.over64 < 2, JSON.stringify(diff));
    assert.deepEqual(errors, []);
    await ctx.close();
  }
});

test('with motion: the intro plays once in view (~1.6 s) and settles to the plain rest state; then the idle loops run', async () => {
  const { ctx, p, errors } = await open(1280, { motion: true });
  await p.waitForTimeout(400);
  assert.equal((await markState(p)).live, false, 'nothing plays while the footer is far below');
  await toFooter(p);
  await p.waitForTimeout(250);
  const mid = await markState(p);
  assert.ok(mid.waapi >= 8 && mid.masks >= 1, 'drawing: ' + JSON.stringify(mid));
  const total = await p.evaluate(() => Math.max(...document.querySelector('footer .flcm').__flc.running.map(a => { const t = a.effect.getComputedTiming(); return t.endTime; })));
  assert.ok(total >= 1500 && total <= 1900, `intro ends at ${total} ms`);
  await p.waitForTimeout(2000);
  const end = await markState(p);
  assert.equal(end.live, true);
  assert.equal(end.waapi, 0, 'intro animations are gone');
  assert.equal(end.masks, 0, 'no masks at rest');
  assert.equal(end.star, 'flcm-twinkle');
  assert.ok(end.css.some(c => c.startsWith('flcm-shine:running')), JSON.stringify(end.css));
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('idle loops pause off screen and on a hidden tab, and resume', async () => {
  const { ctx, p } = await open(390, { motion: true });
  await toFooter(p);
  await p.waitForTimeout(2300);
  let s = await markState(p);
  assert.equal(s.paused, false);
  assert.ok(s.css.length >= 3 && s.css.every(c => c.endsWith(':running')), JSON.stringify(s.css));
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(300);
  s = await markState(p);
  assert.equal(s.paused, true, 'off screen');
  assert.ok(s.css.every(c => c.endsWith(':paused')), JSON.stringify(s.css));
  await toFooter(p);
  await p.waitForTimeout(300);
  assert.equal((await markState(p)).paused, false);
  await p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
  s = await markState(p);
  assert.equal(s.paused, true, 'hidden tab');
  assert.ok(s.css.every(c => c.endsWith(':paused')), JSON.stringify(s.css));
  await p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange')); });
  assert.equal((await markState(p)).paused, false, 'visible again');
  await ctx.close();
});

test('the intro waits for a visible tab: a mark scrolled into view on a hidden tab plays only when the tab shows', async () => {
  const { ctx, p } = await open(1280, { motion: true });
  await p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
  await toFooter(p);
  await p.waitForTimeout(400);
  let st = await p.evaluate(() => { const s = document.querySelector('footer .flcm').__flc; return { played: s.played, playing: (s.running || []).filter(a => a.playState === 'running').length }; });
  assert.deepEqual(st, { played: false, playing: 0 }, 'held on its first frame');
  await p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange')); });
  await p.waitForTimeout(100);
  st = await p.evaluate(() => { const s = document.querySelector('footer .flcm').__flc; return { played: s.played, playing: (s.running || []).filter(a => a.playState === 'running').length }; });
  assert.ok(st.played && st.playing > 0, JSON.stringify(st));
  await ctx.close();
});

test('hover, keyboard focus in the block and tap replay the arrow and star with the sparkle sound; cool-down stops spam', async () => {
  const { ctx, p, errors } = await open(1280, { motion: true });
  await toFooter(p);
  await p.waitForTimeout(2300);
  const m = await p.evaluate(() => { const r = document.querySelector('footer .flcm').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
  await p.mouse.move(m[0], m[1]);
  await p.waitForTimeout(60);
  let s = await markState(p);
  assert.ok(s.waapi >= 6 && s.masks === 1, 'arrow re-shoots and the star sparkles: ' + JSON.stringify(s));
  assert.deepEqual(await p.evaluate(() => window.__sfx), ['sparkle']);
  await p.mouse.move(0, 0); await p.mouse.move(m[0], m[1]);
  assert.deepEqual(await p.evaluate(() => window.__sfx), ['sparkle'], 'cool-down: a second hover right away is quiet');
  await p.waitForTimeout(1200);
  s = await markState(p);
  assert.equal(s.waapi, 0); assert.equal(s.masks, 0, 'back to the rest state');
  // keyboard: focusing the phone link in the same "A program of" block plays it (no extra tab stop on the picture)
  await p.evaluate(() => document.querySelector('footer .fprog a').focus());
  await p.waitForTimeout(60);
  assert.ok((await markState(p)).waapi >= 6, 'focus replays');
  assert.equal((await p.evaluate(() => window.__sfx)).length, 2);
  await p.waitForTimeout(1200);
  await ctx.close();
  // tap on a phone
  const t = await browser.newContext({ viewport: h.SIZES[390], reducedMotion: 'no-preference', hasTouch: true, isMobile: true });
  const q = await t.newPage();
  await q.addInitScript(() => { localStorage.setItem('ff-sound-v2', 'off'); window.__sfx = []; document.addEventListener('ff:sfx', e => { if (e.detail.src === 'flc-mark') window.__sfx.push(e.detail.name); }); });
  await q.goto(`${srv.base}?fresh=w9t-${Date.now()}#home`);
  await q.waitForFunction(() => document.querySelector('footer .fprog .flcm'));
  await toFooter(q);
  await q.waitForTimeout(2300);
  await q.tap('footer .flcm');
  await q.waitForTimeout(60);
  assert.ok((await markState(q)).waapi >= 6, 'tap replays');
  assert.ok((await q.evaluate(() => window.__sfx)).includes('sparkle'));
  assert.deepEqual(errors, []);
  await t.close();
});
