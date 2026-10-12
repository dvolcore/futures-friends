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
//  - tier 1 (2026-10-12): the machine draws itself in as the board arrives (scroll-linked, reversible); captions arrive letter by
//    letter with the exact text; a real button over each friend makes them react (a burst, an announcement, a sound request);
//    real buttons over the moment cards open a "Sample" card by click and by keyboard (Escape closes, focus stays put); machine
//    sounds are silent while the site is muted; the light follows the day (morning, afternoon, sunset); the director variant
//    runs on #centers from the same engine.
const test = require('node:test');
const assert = require('node:assert/strict');

const H = () => import('./a11y-harness.mjs');
let h, site, browser;
test.before(async () => { h = await H(); site = await h.startSite(); browser = await h.loadChromium().launch(); });
test.after(async () => { if (browser) await browser.close(); if (site) await site.close(); });

const CAPS_ES = ['4 amigos · 1 día', 'booker · rincón para leer juntos', 'lumi · rincón de bondad y calma', 'zuri · mesa de descubrimiento', 'bop · zona de movimiento',
  'momentos anotados por el equipo docente', 'informe listo 5:30 p. m.', 'un toque abre ese mismo informe', 'la actividad de 10 minutos de esta noche', 'Aprende. Muévete. Explora. Pertenece.'];

async function open(width, { motion = true, lang, prefs, init = [], route = 'home' } = {}) {
  const ctx = await browser.newContext({ viewport: h.SIZES[width], reducedMotion: motion ? 'no-preference' : 'reduce', deviceScaleFactor: width < 700 ? 3 : 2, isMobile: width < 700, hasTouch: width < 700 });
  for (const f of init) await ctx.addInitScript(f);
  if (prefs) await ctx.addInitScript(p => { try { localStorage.setItem('ff-display-preferences', JSON.stringify(p)); } catch (_) { /* blocked */ } }, prefs);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  page.on('response', r => { if (r.status() >= 400 && !/\.local\.js(\?|$)/.test(r.url())) errors.push(`HTTP ${r.status()} ${r.url()}`); });
  await page.goto(`${site.base}?nostamp${lang ? '&lang=' + lang : ''}&fresh=${Date.now()}#${route}`, { waitUntil: 'load' });
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
// the scroll fraction that puts the story clock at u (the pinned span runs U0 .. U_END)
const fAt = (page, u) => page.evaluate(u => { const D = window.FFDayMachine; return (u - D.U0) / (D.U_END - D.U0); }, u);
const scrollU = async (page, u) => scrollTo(page, await fAt(page, u));
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
      focusable: [...s.querySelectorAll('a[href],button,input,select,textarea,[tabindex]')].map(e => ({ tag: e.tagName, label: e.getAttribute('aria-label') || '', ti: e.getAttribute('tabindex') }))
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
  // the only focusable things are real buttons (friends, sample cards), each named, none with a positive tabindex (no trap)
  assert.ok(f.focusable.length >= 4, 'a button per friend');
  for (const b of f.focusable) { assert.equal(b.tag, 'BUTTON'); assert.ok(b.label.length > 3, 'named'); assert.ok(b.ti == null || +b.ti <= 0); }
  assert.ok(f.focusable.some(b => /^Booker: say hello$/.test(b.label)));
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('motion allowed (1280): the canvas draws, scrolling moves the camera and the caption while the stage stays put', async () => {
  const { ctx, page, errors } = await open(1280);
  assert.equal(await page.evaluate(() => document.querySelector('.dm').dataset.dm), 'live');
  await scrollU(page, 0); await page.waitForTimeout(900);
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
  const stops = await page.evaluate(() => window.FFDayMachine.STOP_U);
  const seen = [];
  for (const u of stops) {
    await scrollU(page, u); await page.waitForTimeout(1100);
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
  const stops = await page.evaluate(() => window.FFDayMachine.STOP_U);
  for (const [i, k] of [[1, 'booker'], [2, 'lumi'], [3, 'zuri'], [4, 'bop']]) {
    await scrollU(page, stops[i]); await page.waitForTimeout(1200);
    const s = await state(page), r = s.friends[k];
    assert.ok(r, `${k} drawn`);
    assert.ok(r.l >= 0 && r.t >= 0 && r.r <= s.W && r.b <= s.H, `${k} not cropped at its stop: ${JSON.stringify(r)} in ${s.W}x${s.H}`);
    const cx = (r.l + r.r) / 2;
    assert.ok(cx > s.W * 0.2 && cx < s.W * 0.8, `${k} framed near the centre (${cx.toFixed(0)} of ${s.W})`);
  }
  assert.deepEqual(errors, []);
  await ctx.close();
});

// ---------------------------------------------------------------- tier 1
test('draw-on: the machine sketches itself in as the board arrives, then fills; scrolling back undraws it', async () => {
  const { ctx, page, errors } = await open(1280);
  const at = async u => { await scrollU(page, u); await page.waitForTimeout(1300); return state(page); };
  const early = await at(-1.6), done = await at(0), back = await at(-1.6);
  const G = await page.evaluate(() => window.FFDayMachine.GROUPS);
  assert.ok(early.rev.st0.l > 0.9, `the first station is drawn first (${early.rev.st0.l})`);
  assert.ok(early.rev.home.l < 0.1, `the home is still to come (${early.rev.home.l})`);
  assert.ok(early.rev.st0.f > early.rev.home.f, 'fills follow the lines');
  for (const g of G) { assert.ok(done.rev[g].l >= 0.999 && done.rev[g].f >= 0.999, `${g} complete when the camera starts to move`); }
  assert.ok(Math.abs(back.rev.home.l - early.rev.home.l) < 0.05, 'reversing undraws it');
  // pure function: monotonic in u
  const mono = await page.evaluate(() => { const D = window.FFDayMachine; let ok = true, prev = -1; for (let u = -3; u <= 0; u += 0.05) { const l = D.reveal(u).phone.l; if (l < prev - 1e-9) ok = false; prev = l; } return ok; });
  assert.ok(mono);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('kinetic captions: letters arrive one by one and the caption text stays exact; the light follows the day', async () => {
  const { ctx, page, errors } = await open(1280);
  await scrollU(page, 0); await page.waitForTimeout(1300);
  await scrollU(page, 1); await page.waitForTimeout(250);
  const k = await page.evaluate(() => { const c = document.querySelector('.dm-capt'); return { text: c.textContent, chars: c.querySelectorAll('.dm-ch').length, anims: c.getAnimations({ subtree: true }).length, skip: c.closest('[data-i18n-skip]') != null }; });
  assert.equal(k.text, 'booker · read-together nook');
  assert.ok(k.chars >= 20, 'split into letters');
  assert.ok(k.anims > 5, `letters animate in (${k.anims})`);
  await page.waitForTimeout(1200);
  const light = [];
  for (const u of [2, 6.2, 9.6]) { await scrollU(page, u); await page.waitForTimeout(1200); light.push(await page.evaluate(() => document.querySelector('.dm').dataset.light)); }
  assert.deepEqual(light, ['morning', 'afternoon', 'sunset'], 'morning at the friends, afternoon at the tablet, dusk at home');
  assert.deepEqual(errors, []);
  await ctx.close();
});

// count oscillators started by any AudioContext (the sound engine's only way to make a sound)
const COUNT_AUDIO = () => { window.__osc = 0; const A = window.AudioContext || window.webkitAudioContext; if (!A) return; const o = A.prototype.createOscillator; A.prototype.createOscillator = function () { window.__osc++; return o.apply(this, arguments); }; };

test('the friends react to a tap: a hop or a wave with a colour burst, announced politely, a sound request', async () => {
  const { ctx, page, errors } = await open(1280);
  await scrollU(page, 1); await page.waitForTimeout(1300);
  const before = await state(page);
  const r0 = before.friends.booker;
  await page.evaluate(() => document.querySelector('.dm-fr[data-k=booker]').click());
  await page.waitForTimeout(260);
  const mid = await state(page), r1 = mid.friends.booker;
  assert.ok(r1.b < r0.b - 4 || Math.abs((r1.r - r1.l) - (r0.r - r0.l)) > 2, `Booker moved: ${JSON.stringify([r0, r1])}`);
  assert.ok(mid.sounds.includes('hop'), 'asked sound.js for a hop');
  await page.waitForTimeout(900);
  const after = await state(page), r2 = after.friends.booker;
  assert.ok(Math.abs(r2.b - r0.b) < 4, 'back on the rug');
  assert.match(await page.evaluate(() => document.querySelector('.dm-say').textContent), /^Booker (hops|waves) hello$/);
  // the button sits over the friend
  const g = await page.evaluate(() => { const b = document.querySelector('.dm-fr[data-k=booker]').getBoundingClientRect(), o = document.querySelector('.dm-board').getBoundingClientRect(); return { x: b.left - o.left + b.width / 2, y: b.top - o.top + b.height / 2, w: b.width, h: b.height }; });
  assert.ok(g.x > r2.l && g.x < r2.r && g.y > r2.t && g.y < r2.b, 'the button covers Booker');
  assert.ok(g.w >= 44 && g.h >= 44);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('a moment card opens by click and by keyboard as a "Sample" card; Escape closes it and focus stays on its button', async () => {
  const { ctx, page, errors } = await open(1280);
  await scrollU(page, 2.2); await page.waitForTimeout(1400);
  const vis = await page.evaluate(() => [...document.querySelectorAll('.dm-cd')].filter(b => !b.hidden).map(b => +b.dataset.i));
  assert.ok(vis.includes(0), `Booker's card is on the belt (${vis})`);
  await page.click('.dm-cd[data-i="0"]');
  await page.waitForTimeout(600);
  let p = await page.evaluate(() => { const b = document.querySelector('.dm-cd[data-i="0"]'), pop = document.getElementById(b.getAttribute('aria-controls')); return { exp: b.getAttribute('aria-expanded'), hidden: pop.hidden, text: pop.textContent, say: document.querySelector('.dm-say').textContent }; });
  assert.equal(p.exp, 'true'); assert.equal(p.hidden, false);
  assert.match(p.text, /^Sample/); assert.match(p.text, /story with Booker/);
  assert.match(p.say, /Sample: story with Booker/);
  await page.click('.dm-cd[data-i="0"]'); await page.waitForTimeout(200);
  assert.equal(await page.evaluate(() => document.querySelector('.dm-pop').hidden), true, 'a second tap closes it');
  // keyboard: focus the card's button, Enter opens, Escape closes, focus stays; Tab moves on (no trap)
  await page.focus('.dm-cd[data-i="0"]');
  await page.keyboard.press('Enter'); await page.waitForTimeout(500);
  assert.equal(await page.evaluate(() => document.querySelector('.dm-cd[data-i="0"]').getAttribute('aria-expanded')), 'true');
  const ring = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
  assert.notEqual(ring, 'none', 'focus is visible');
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  const k = await page.evaluate(() => ({ exp: document.querySelector('.dm-cd[data-i="0"]').getAttribute('aria-expanded'), focus: document.activeElement.className, hidden: document.querySelector('.dm-pop').hidden }));
  assert.deepEqual(k, { exp: 'false', focus: 'dm-cd', hidden: true });
  for (let i = 0; i < 8; i++) await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => !!document.activeElement.closest('.dm-board')), false, 'Tab leaves the stage');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('machine sounds: requested while scrolling after a tap, but nothing sounds while the site is muted or the kill switch is on', async () => {
  for (const [name, init] of [['muted', () => { try { localStorage.setItem('ff-sound-v2', 'off'); } catch (_) { /* blocked */ } }], ['kill switch', () => { window.FF_SOUND_OFF = true; }]]) {
    const { ctx, page, errors } = await open(1280, { init: [COUNT_AUDIO, init] });
    assert.equal(await page.evaluate(() => window.FFSound.enabled()), false, `${name}: sound off`);
    await scrollU(page, 0.6); await page.waitForTimeout(1200);
    await page.mouse.click(5, 300);   // the visitor's first tap (outside the stage)
    for (let u = 0.6; u <= 2.4; u += 0.12) { await scrollU(page, u); await page.waitForTimeout(90); }
    await page.waitForTimeout(600);
    await page.evaluate(() => document.querySelector('.dm-fr:not([hidden])').click()); await page.waitForTimeout(300);
    const s = await state(page);
    assert.ok(s.sounds.includes('clunk'), `${name}: the belt asked for its clunk (${s.sounds})`);
    assert.equal(await page.evaluate(() => window.__osc), 0, `${name}: not one oscillator started`);
    assert.deepEqual(errors, []);
    await ctx.close();
  }
  // control: with sound on, the same scroll does make sound after the first tap
  const { ctx, page } = await open(1280, { init: [COUNT_AUDIO] });
  await scrollU(page, 0.6); await page.waitForTimeout(1200);
  await page.mouse.click(5, 300); await page.waitForTimeout(300);
  const o0 = await page.evaluate(() => window.__osc);
  for (let u = 0.6; u <= 2.4; u += 0.12) { await scrollU(page, u); await page.waitForTimeout(90); }
  await page.waitForTimeout(600);
  assert.ok(await page.evaluate(() => window.__osc) > o0, 'sound on: the clunks play');
  await ctx.close();
});

test('still mode: taps still open cards and greet friends, without animation', async () => {
  const { ctx, page, errors } = await open(1280, { motion: false });
  await scrollTo(page, 0); await page.waitForTimeout(900);
  const vis = await page.evaluate(() => [...document.querySelectorAll('.dm-cd')].filter(b => !b.hidden).map(b => +b.dataset.i));
  assert.ok(vis.length >= 2, `cards on the still belt are buttons (${vis})`);
  await page.evaluate(i => document.querySelector(`.dm-cd[data-i="${i}"]`).click(), vis[0]);
  await page.waitForTimeout(100);
  const f = await page.evaluate(() => ({ hidden: document.querySelector('.dm-pop').hidden, anims: document.querySelector('.dm-pop').getAnimations().length, tag: document.querySelector('.dm-pop-tag').textContent }));
  assert.deepEqual(f, { hidden: false, anims: 0, tag: 'Sample' });
  // targets never overlap
  const boxes = await page.evaluate(() => [...document.querySelectorAll('.dm-cd:not([hidden])')].map(b => b.getBoundingClientRect()).map(r => [r.left, r.top, r.right, r.bottom]));
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) { const a = boxes[i], b = boxes[j]; assert.ok(a[2] <= b[0] + 0.5 || b[2] <= a[0] + 0.5 || a[3] <= b[1] + 0.5 || b[3] <= a[1] + 0.5, 'card targets do not overlap'); }
  await page.evaluate(() => document.querySelector('.dm-fr[data-k=zuri]').click()); await page.waitForTimeout(150);
  assert.match(await page.evaluate(() => document.querySelector('.dm-say').textContent), /^Zuri (hops|waves) hello$/);
  const s0 = await state(page); await page.waitForTimeout(600);
  assert.ok((await state(page)).frames - s0.frames <= 1, 'no animation loop');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('Spanish: buttons, sample cards and announcements', async () => {
  const { ctx, page, errors } = await open(1280, { lang: 'es' });
  await scrollU(page, 2.2); await page.waitForTimeout(1400);
  const f = await page.evaluate(() => ({ fr: document.querySelector('.dm-fr[data-k=lumi]').getAttribute('aria-label'), cd: document.querySelector('.dm-cd[data-i="0"]').getAttribute('aria-label') }));
  assert.equal(f.fr, 'Lumi: saludar'); assert.equal(f.cd, 'Tarjeta de ejemplo: Booker');
  await page.evaluate(() => document.querySelector('.dm-cd[data-i="0"]').click()); await page.waitForTimeout(500);
  assert.match(await page.evaluate(() => document.querySelector('.dm-pop').textContent), /^Ejemplocuento con Booker/);
  assert.match(await page.evaluate(() => document.querySelector('.dm-pop-s').textContent), /anotado por el equipo docente/);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('the director variant: the same engine on #centers, its own captions, steps and cards (Spanish too)', async () => {
  for (const lang of [undefined, 'es']) {
    const { ctx, page, errors } = await open(1280, { route: 'centers', lang });
    const f = await page.evaluate(() => { const s = document.querySelector('#view .dm'); return { v: s.dataset.dmV, h: s.querySelector('h2').id, steps: s.querySelectorAll('.dm-steps li').length, count: document.querySelectorAll('#view .dm').length, proofAfter: !!s.nextElementSibling }; });
    assert.equal(f.v, 'director'); assert.equal(f.h, 'dm-h-dir'); assert.equal(f.steps, 5); assert.equal(f.count, 1);
    await scrollU(page, 0); await page.waitForTimeout(1300);
    const s = await state(page), px = await pixels(page);
    assert.equal(s.variant, 'director'); assert.equal(s.mode, 'live');
    assert.ok(px.ink > 0.03, `drawn (${(px.ink * 100).toFixed(1)}%)`);
    assert.equal(await caption(page), lang ? '4 salones · 1 centro' : '4 rooms · 1 center');
    await scrollU(page, 7.6); await page.waitForTimeout(1300);
    assert.equal(await caption(page), lang ? 'registro listo para licencias' : 'record ready for licensing');
    if (lang) await page.waitForFunction(() => document.querySelector('#dm-h-dir').textContent === 'Cómo queda registrado el día de un centro', null, { timeout: 8000 });
    else assert.equal(await page.evaluate(() => document.querySelector('#dm-h-dir').textContent), 'How a center’s day gets recorded');
    assert.deepEqual(errors, []);
    await ctx.close();
  }
});

test('phone (390 px): the friend and card buttons fit the stage and the draw-on runs; no sideways scroll', async () => {
  const { ctx, page, errors } = await open(390);
  await scrollU(page, -1.4); await page.waitForTimeout(1300);
  const s0 = await state(page);
  assert.ok(s0.rev.st0.l > 0.5 && s0.rev.home.l < 1, 'sketching in');
  await scrollU(page, 3); await page.waitForTimeout(1300);
  const g = await page.evaluate(() => { const o = document.querySelector('.dm-board').getBoundingClientRect(); return { wide: document.documentElement.scrollWidth, vw: innerWidth, out: [...document.querySelectorAll('.dm-fr:not([hidden]),.dm-cd:not([hidden])')].map(b => b.getBoundingClientRect()).filter(r => r.left < o.left - 1 || r.right > o.right + 1 || r.top < o.top - 1 || r.bottom > o.bottom + 1).length, n: document.querySelectorAll('.dm-fr:not([hidden])').length }; });
  assert.equal(g.out, 0, 'every button inside the stage'); assert.ok(g.n >= 1); assert.ok(g.wide <= g.vw);
  await page.tap('.dm-fr[data-k=zuri]'); await page.waitForTimeout(250);
  assert.ok((await state(page)).sounds.includes('hop') || (await state(page)).sounds.includes('wave'));
  assert.deepEqual(errors, []);
  await ctx.close();
});

// coordinator review 2026-10-12 ("cropped character ears are sloppy"): at every camera stop, on desktop and on a phone, each friend's
// drawn cut-out is either wholly inside the stage (ears, tufts and hat) or wholly outside it; never half-cut. Mid-glide crops are fine.
for (const width of [1280, 390]) {
  test(`every camera stop (${width}px): each friend is fully in the frame or fully out of it`, async () => {
    const { ctx, page, errors } = await open(width);
    const stops = await page.evaluate(() => window.FFDayMachine.STOP_U);
    const bad = [];
    for (const [n, u] of stops.entries()) {
      await scrollU(page, u); await page.waitForTimeout(1500);
      const s = await state(page);
      for (const [k, r] of Object.entries(s.friends)) {
        const inside = r.l >= 0 && r.t >= 0 && r.r <= s.W && r.b <= s.H, outside = r.r <= 0 || r.l >= s.W || r.b <= 0 || r.t >= s.H;
        if (!inside && !outside) bad.push(`stop ${n + 1} (u ${u}): ${k} ${JSON.stringify(Object.fromEntries(Object.entries(r).map(([a, b]) => [a, Math.round(b)])))} in ${s.W}x${s.H}`);
      }
    }
    assert.deepEqual(bad, [], 'half-cut friends at a camera stop');
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}
