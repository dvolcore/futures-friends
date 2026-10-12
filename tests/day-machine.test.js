'use strict';
// How a Futures Friends day travels (day-machine.js / day-machine.css, owner 2026-10-12, from the isometric "factory" reel): the
// platform's loop drawn as a scroll-scrubbed machine on #home. Real headless Chromium (harness as tests/a11y.test.js). Encodes:
//  - the section renders on Home, between the day path (.hc-day) and "What we have built" (.hc-proof), tagged as the afternoon;
//  - motion allowed: the canvas really draws (non-blank pixels), scrolling the section moves the camera and the caption, the stage
//    stays put (sticky) while it does, and frames stop when the section leaves the screen or the route changes (torn down);
//  - reduced motion or the Decorative motion switch: a still, complete illustration and the steps as a readable list, no loop;
//  - the canvas and the caption are aria-hidden, the steps are a real ordered list, nothing in the section takes focus;
//  - Spanish captions and heading (FFi18n, i18n-es-9.js); a phone viewport frames the scene and keeps the caption clear of the
//    floating Sound controls and the back-to-top button; no page errors anywhere.
const test = require('node:test');
const assert = require('node:assert/strict');

const H = () => import('./a11y-harness.mjs');
let h, site, browser;
test.before(async () => { h = await H(); site = await h.startSite(); browser = await h.loadChromium().launch(); });
test.after(async () => { if (browser) await browser.close(); if (site) await site.close(); });

const CAPS_ES = ['4 amigos · 1 día', 'booker · rincón para leer juntos', 'lumi · rincón de bondad y calma', 'zuri · mesa de descubrimiento', 'bop · zona de movimiento',
  'momentos anotados por el equipo docente', 'informe listo 5:30 p. m.', 'un toque abre ese mismo informe', 'la actividad de 10 minutos de esta noche', 'Aprende. Muévete. Explora. Pertenece.'];

async function open(width, { motion = true, lang, prefs } = {}) {
  const ctx = await browser.newContext({ viewport: h.SIZES[width], reducedMotion: motion ? 'no-preference' : 'reduce', deviceScaleFactor: width < 700 ? 3 : 2, isMobile: width < 700, hasTouch: width < 700 });
  if (prefs) await ctx.addInitScript(p => { try { localStorage.setItem('ff-display-preferences', JSON.stringify(p)); } catch (_) { /* blocked */ } }, prefs);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  page.on('response', r => { if (r.status() >= 400 && !/\.local\.js(\?|$)/.test(r.url())) errors.push(`HTTP ${r.status()} ${r.url()}`); });
  await page.goto(`${site.base}?nostamp${lang ? '&lang=' + lang : ''}&fresh=${Date.now()}#home`, { waitUntil: 'load' });
  await page.waitForSelector('#view .dm');
  await page.waitForTimeout(400);
  return { ctx, page, errors };
}
// scroll so the live track is at progress f (0..1), or the still board into view
const scrollTo = (page, f) => page.evaluate(f => {
  const sec = document.querySelector('.dm'), live = sec.dataset.dm === 'live';
  const t = live ? sec.querySelector('.dm-track') : sec.querySelector('.dm-board'), st = sec.querySelector('.dm-stage');
  const r = t.getBoundingClientRect(), y = scrollY + r.top;
  if (!live) { window.scrollTo(0, y - 140); return; }
  const top = parseFloat(getComputedStyle(st).top) || 0, span = r.height - st.offsetHeight;
  window.scrollTo(0, y - top + span * f);
}, f);
// canvas facts: how many sampled pixels differ from the ground, and a coarse fingerprint of the picture
const pixels = page => page.evaluate(() => {
  const c = document.querySelector('.dm-canvas'), g = c.getContext('2d'), w = c.width, hh = c.height;
  if (!w || !hh) return { w, h: hh, ink: 0, sig: '' };
  const d = g.getImageData(0, 0, w, hh).data, bg = [d[0], d[1], d[2]];
  let ink = 0, n = 0; const sig = [];
  for (let y = 0; y < hh; y += 7) for (let x = 0; x < w; x += 7) { const i = (y * w + x) * 4; n++; if (Math.abs(d[i] - bg[0]) + Math.abs(d[i + 1] - bg[1]) + Math.abs(d[i + 2] - bg[2]) > 40) ink++; }
  for (let k = 0; k < 64; k++) { const i = ((Math.floor(hh * ((k >> 3) + 0.5) / 8) * w) + Math.floor(w * ((k & 7) + 0.5) / 8)) * 4; sig.push(d[i] >> 4, d[i + 1] >> 4, d[i + 2] >> 4); }
  return { w, h: hh, ink: ink / n, sig: sig.join('') };
});
const state = page => page.evaluate(() => window.FFDayMachine.state());
const caption = page => page.evaluate(() => document.querySelector('.dm-capt').textContent);

test('the section renders on Home, between the day path and "What we have built", as the afternoon', async () => {
  const { ctx, page, errors } = await open(1280, { motion: false });
  const f = await page.evaluate(() => {
    const v = document.querySelector('#view');
    const s = v.querySelector('.dm');
    return {
      order: [...v.querySelectorAll('.hc-day, .dm, .hc-proof')].map(e => e.className.split(' ')[0]), count: v.querySelectorAll('.dm').length,
      h2: s.querySelector('h2').textContent, labelled: s.getAttribute('aria-labelledby'), day: s.dataset.day, part: s.dataset.daypart,
      canvasHidden: s.querySelector('canvas').getAttribute('aria-hidden'), capHidden: s.querySelector('.dm-cap').getAttribute('aria-hidden'),
      steps: [...s.querySelectorAll('ol.dm-steps > li')].map(li => li.textContent.trim()),
      focusable: s.querySelectorAll('a[href],button,input,select,textarea,[tabindex]').length
    };
  });
  assert.equal(f.count, 1);
  assert.deepEqual(f.order, ['hc-day', 'dm', 'hc-proof'], 'after the day path, before "What we have built"');
  assert.equal(f.h2, 'How a Futures Friends day travels');
  assert.equal(f.labelled, 'dm-h');
  assert.equal(f.day, 'afternoon'); assert.equal(f.part, 'afternoon');
  assert.equal(f.canvasHidden, 'true'); assert.equal(f.capHidden, 'true');
  assert.equal(f.steps.length, 5, 'five steps for screen readers');
  assert.match(f.steps.join(' '), /daily report/); assert.match(f.steps.join(' '), /10-minute activity/);
  assert.equal(f.focusable, 0, 'nothing in the scene takes focus (no keyboard trap)');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('motion allowed (1280): the canvas draws, scrolling moves the camera and the caption while the stage stays put', async () => {
  const { ctx, page, errors } = await open(1280);
  assert.equal(await page.evaluate(() => document.querySelector('.dm').dataset.dm), 'live');
  await scrollTo(page, 0.02); await page.waitForTimeout(900);
  const a = await pixels(page), sa = await state(page), ca = await caption(page);
  const topA = await page.evaluate(() => document.querySelector('.dm-board').getBoundingClientRect().top);
  assert.equal(sa.mode, 'live'); assert.ok(sa.ready, 'initialised when near');
  assert.ok(a.w > 1000 && a.h > 500, `canvas sized to the stage at DPR 2 (${a.w}x${a.h})`);
  assert.ok(a.ink > 0.03, `the scene is drawn (${(a.ink * 100).toFixed(1)}% inked samples)`);
  assert.equal(ca, '4 friends · 1 day');
  await scrollTo(page, 0.45); await page.waitForTimeout(1200);
  const b = await pixels(page), sb = await state(page), cb = await caption(page);
  const topB = await page.evaluate(() => document.querySelector('.dm-board').getBoundingClientRect().top);
  assert.ok(sb.u > sa.u + 3, `the story clock moved with the scroll (${sa.u.toFixed(2)} -> ${sb.u.toFixed(2)})`);
  assert.notEqual(cb, ca, 'the caption follows the camera');
  assert.notEqual(b.sig, a.sig, 'the picture changed');
  assert.ok(Math.abs(topB - topA) < 2, `the stage is sticky (${topA} vs ${topB})`);
  await scrollTo(page, 1); await page.waitForTimeout(1200);
  assert.equal(await caption(page), 'Learn. Move. Explore. Belong.', 'the last stop carries the tagline');
  // off screen: frames stop; leaving Home tears the scene down
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(400);
  const f0 = (await state(page)).frames; await page.waitForTimeout(500);
  assert.ok((await state(page)).frames - f0 <= 1, 'no frames while the section is off screen');
  await page.evaluate(() => { location.hash = '#friends'; }); await page.waitForTimeout(600);
  assert.equal((await state(page)).mode, 'none', 'torn down on another route');
  assert.deepEqual(errors, []);
  await ctx.close();
});

for (const [name, opts] of [['reduced motion', { motion: false }], ['the Decorative motion switch off', { motion: true, prefs: { motion2: false } }]]) {
  test(`${name}: a still, complete illustration and the steps as a readable list; no loop`, async () => {
    const { ctx, page, errors } = await open(1280, opts);
    await scrollTo(page, 0); await page.waitForTimeout(900);
    const f = await page.evaluate(() => {
      const s = document.querySelector('.dm'), ol = s.querySelector('.dm-steps'), r = ol.getBoundingClientRect(), b = s.querySelector('.dm-board').getBoundingClientRect();
      return { mode: s.dataset.dm, olH: r.height, olW: r.width, clip: getComputedStyle(ol).clipPath, board: [b.width, b.height], cap: getComputedStyle(s.querySelector('.dm-cap')).display, track: s.querySelector('.dm-track').getBoundingClientRect().height };
    });
    assert.equal(f.mode, 'still');
    assert.ok(f.olH > 40 && f.olW > 300, `the steps are visible (${f.olW}x${f.olH})`);
    assert.ok(!/inset/.test(f.clip), 'not visually hidden');
    assert.ok(Math.abs(f.board[0] / f.board[1] - 1.6) < 0.05, `a composed 16:10 picture (${f.board})`);
    assert.equal(f.cap, 'none', 'no moving caption');
    assert.ok(f.track < f.board[1] + 4, 'no scroll track');
    const px = await pixels(page);
    assert.ok(px.ink > 0.05, `the illustration is drawn (${(px.ink * 100).toFixed(1)}%)`);
    const all = await state(page);
    for (const k of ['booker', 'lumi', 'zuri', 'bop']) { const r = all.friends[k]; assert.ok(r && r.l >= 0 && r.t >= 0 && r.r <= all.W && r.b <= all.H, `${k} whole in the still picture`); }
    const s0 = await state(page); await page.waitForTimeout(700);
    const s1 = await state(page);
    assert.equal(s1.mode, 'still');
    assert.ok(s1.frames - s0.frames <= 1, 'drawn once, not animated');
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}

test('Spanish: heading, steps and every caption (FFi18n)', async () => {
  const { ctx, page, errors } = await open(1280, { lang: 'es' });
  assert.equal(await page.evaluate(() => document.documentElement.lang), 'es');
  await page.waitForFunction(() => document.querySelector('#dm-h').textContent === 'Cómo viaja un día en Futures Friends', null, { timeout: 8000 });
  const steps = await page.evaluate(() => [...document.querySelectorAll('.dm-steps li')].map(l => l.textContent.trim()).join(' '));
  assert.match(steps, /informe diario/); assert.doesNotMatch(steps, /\bthe\b|\band\b/);
  const stops = await page.evaluate(() => window.FFDayMachine.STOP_U), end = stops[stops.length - 1];
  const seen = [];
  for (const u of stops) {
    await scrollTo(page, u / end); await page.waitForTimeout(1100);
    seen.push(await caption(page));
  }
  assert.deepEqual(seen, CAPS_ES);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('phone (390 px): live scene, crisp canvas, framed stations, caption clear of the floating controls', async () => {
  const { ctx, page, errors } = await open(390);
  assert.equal(await page.evaluate(() => document.querySelector('.dm').dataset.dm), 'live');
  for (const f of [0.02, 0.12, 0.5, 0.82]) {
    await scrollTo(page, f); await page.waitForTimeout(1100);
    const px = await pixels(page);
    assert.ok(px.ink > 0.02, `drawn at ${f} (${(px.ink * 100).toFixed(1)}%)`);
    const g = await page.evaluate(() => {
      const r = el => { const e = typeof el === 'string' ? document.querySelector(el) : el; if (!e) return null; const b = e.getBoundingClientRect(); return b.width ? b : null; };
      const cap = r('.dm-cap'), board = r('.dm-board'), c = document.querySelector('.dm-canvas');
      const fixed = [...document.querySelectorAll('.ffs button, .totop.on, .totop')].map(r).filter(Boolean);
      const hit = fixed.filter(b => !(cap.right <= b.left || cap.left >= b.right || cap.bottom <= b.top || cap.top >= b.bottom)).length;
      return { hit, capIn: cap.left >= board.left && cap.right <= board.right && cap.bottom <= board.bottom, wide: document.documentElement.scrollWidth, vw: innerWidth, dpr: c.width / board.width, boardTop: board.top, head: document.querySelector('header.bar').getBoundingClientRect().bottom };
    });
    assert.equal(g.hit, 0, 'the caption never sits under Sound, Nature or back-to-top');
    assert.ok(g.capIn, 'the caption stays inside the stage');
    assert.ok(g.wide <= g.vw, `no sideways scroll (${g.wide} > ${g.vw})`);
    assert.ok(g.dpr >= 2 && g.dpr <= 2.51, `DPR capped sensibly (${g.dpr.toFixed(2)})`);
    assert.ok(g.boardTop >= g.head - 1, 'the stage sits below the sticky header');
  }
  // the camera re-centres on each station in portrait and the whole friend (ears, arms, feet) stays inside the stage
  const stops = await page.evaluate(() => window.FFDayMachine.STOP_U), end = stops[stops.length - 1];
  for (const [i, k] of [[1, 'booker'], [2, 'lumi'], [3, 'zuri'], [4, 'bop']]) {
    await scrollTo(page, stops[i] / end); await page.waitForTimeout(1200);
    const s = await state(page), r = s.friends[k];
    assert.ok(r, `${k} drawn`);
    assert.ok(r.l >= 0 && r.t >= 0 && r.r <= s.W && r.b <= s.H, `${k} not cropped at its stop: ${JSON.stringify(r)} in ${s.W}x${s.H}`);
    const cx = (r.l + r.r) / 2;
    assert.ok(cx > s.W * 0.2 && cx < s.W * 0.8, `${k} framed near the centre (${cx.toFixed(0)} of ${s.W})`);
  }
  assert.deepEqual(errors, []);
  await ctx.close();
});
