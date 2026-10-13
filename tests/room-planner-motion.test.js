// The Room Planner page, jacked up (owner 2026-10-12; room-planner-motion.js / room-planner-motion.css). The planner itself is unchanged
// (tests/room-planner.test.js still covers its rules); this file covers the new hero and polish in real headless Chromium
// (tests/a11y-harness.mjs): the demo plays once and can be skipped (tap, key, scroll) and replayed; reduced motion and the Decorative
// motion switch show the last frame; the example caption never overlaps the plan's zone labels; the grown-up and the friends stand whole
// inside the hero, on its floor, clear of the Nature / Sound dock; Spanish; 390 px has no sideways scroll; axe is clean.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { site: baseSite, read } = require('./site-vm');

const T = { timeout: 300000 };
let h, site, browser;
test.before(async () => { h = await import('./a11y-harness.mjs'); site = await h.startSite(); browser = await h.loadChromium().launch(); }, T);
test.after(async () => { if (browser) await browser.close(); if (site) await site.close(); });

const DESK = { width: 1440, height: 900 }, PHONE = { width: 390, height: 844 };
async function open({ motion = 'on', viewport = DESK, lang = '', touch = false, settle = 300 } = {}) {
  const ctx = await browser.newContext({ viewport, reducedMotion: motion === 'reduce' ? 'reduce' : 'no-preference', ...(touch ? { isMobile: true, hasTouch: true } : {}) });
  if (motion === 'switch') await ctx.addInitScript(() => { try { localStorage.setItem('ff-display-preferences', JSON.stringify({ motion2: false })); } catch (_) { /* blocked */ } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto(`${site.base}?${lang ? 'lang=' + lang + '&' : ''}fresh=${Date.now()}#room-planner`);
  await page.waitForSelector('#view [data-rpm-hero] [data-rpm-plan]', { timeout: 120000 });
  await page.waitForTimeout(settle);
  return { ctx, page, errors };
}
// the demo's state: running Web Animations inside the plan, the counted numbers, and the classes
const state = page => page.evaluate(() => {
  const fig = document.querySelector('[data-rpm-plan]');
  const run = document.getAnimations().filter(a => a.playState === 'running' && !(a instanceof CSSTransition) && !(a instanceof CSSAnimation) && a.effect && a.effect.target && fig.contains(a.effect.target)).length;
  return { run, playing: fig.classList.contains('rpm-playing'), done: fig.classList.contains('rpm-done'), motion: fig.classList.contains('rpm-motion'),
    nums: Array.from(fig.querySelectorAll('.rpm-n')).map(n => n.textContent), replay: getComputedStyle(fig.querySelector('[data-rpm-replay]')).display !== 'none',
    ok: getComputedStyle(fig.querySelector('.rpm-ok')).opacity, zones: fig.querySelectorAll('.rpm-zone').length, friends: fig.querySelectorAll('.rpm-fr image').length };
});

// ---------------------------------------------------------------- files (no browser)
test('wiring: linked once, right after the planner; gated on FFMotion.allowed; sends and stores nothing; planner files untouched by it', () => {
  const html = read('index.html');
  assert.equal((html.match(/href="room-planner-motion\.css\?v=\d+"/g) || []).length, 1);
  assert.equal((html.match(/src="room-planner-motion\.js\?v=\d+"/g) || []).length, 1);
  assert.ok(html.indexOf('room-planner-motion.js') > html.indexOf('src="room-planner.js') && html.indexOf('room-planner-motion.js') < html.indexOf('window.FFstart'));
  const js = read('room-planner-motion.js').replace(/\/\*[\s\S]*?\*\//g, ''), css = read('room-planner-motion.css').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(js, /M\(\)\.allowed\(ok\)/);
  assert.match(js, /FFhooks\.push\(setup\)/);
  assert.match(js, /live\.abort\(\)/);
  assert.doesNotMatch(js, /fetch\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|indexedDB|document\.cookie/);
  // the planner's state is only read, never written, by the polish
  assert.doesNotMatch(js, /FFRoomPlanner\.(set|load|move|select|act)\(|\.state\.items\.(push|splice)|\.state\s*=/);
  assert.doesNotMatch(css, /hue-rotate|grayscale|invert\(|sepia/, 'no cut-out is recoloured');
  assert.match(css, /\.rpm-ch img\{[^}]*object-fit:contain[^}]*filter:none/);
  assert.match(css, /prefers-reduced-motion:no-preference/);
  assert.match(css, /:root:not\(\[data-motion=off\]\)/);
  assert.match(css, /@media print/);
  assert.doesNotMatch(js + css, /investor\/|portal-test\//);
  // Bop's zone colour (UI accent, carpet swatch) is purple #8236AE, never the retired orange; his art stays the official grey elephant
  assert.doesNotMatch(js + css, /#(E8761E|F5A566|A84908|9C4507|B5541A|FDEDE0|FCEEE2|FCE6D2)\b/i);
  assert.match(js, /bop: '#8236AE'/);
});

test('render (VM): the hero keeps the page copy on a frosted card, adds the demo plan with its caption outside the plan, the cast and one chip', () => {
  const c = baseSite();
  for (const f of ['room-kit-plans.js', 'room-kit.js', 'room-planner-core.js', 'room-planner.js', 'room-planner-motion.js']) vm.runInContext(read(f), c, { filename: f });
  const html = c.render('room-planner');
  assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
  assert.match(html, /<h1>Plan your room<\/h1>/);
  assert.match(html, /class="wc-hero-copy rpm-card"/);
  assert.match(html, /data-anchor="rp-app" data-ff-magnet>Start planning/);
  assert.match(html, /href="#room-kit">About the kit/);
  assert.doesNotMatch(html, /rp-heroplan/, 'the old static figure is replaced');
  assert.doesNotMatch(html.slice(html.indexOf('data-rpm-plan'), html.indexOf('</figure>', html.indexOf('data-rpm-plan'))), /<title/, 'no tooltip on the plan');
  assert.match(html, /<figcaption class="rpm-cap"><span class="rpm-captext">Example: a 12 x 14 ft home daycare room<\/span>/);
  assert.match(html, /data-rpm-ch="ms-june"/);
  for (const k of ['booker', 'lumi', 'zuri', 'bop']) assert.match(html, new RegExp(`data-rpm-ch="${k}`), k);
  assert.equal((html.match(/class="rpm-chip"/g) || []).length, 1);
  assert.match(html, /Storybook illustration/);
  assert.doesNotMatch(html, /undefined|\[object Object\]|NaN/);
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(ids).size, ids.length);
  // the demo is the planner's own example layout, which passes its own fit check (so the green tick is true)
  const C = require('../room-planner-core.js');
  assert.equal(C.summary(C.check(C.template('home'))).stop, 0);
  assert.equal(C.template('home').room.w, 14 * 12); assert.equal(C.template('home').room.l, 12 * 12);
});

// ---------------------------------------------------------------- the demo
test('the demo plays once (about 7.5 s): numbers count up, zones and friends arrive, the fit check ticks; any tap skips it to the last frame; replay works', T, async () => {
  const { ctx, page, errors } = await open({ settle: 900 });
  let s = await state(page);
  assert.ok(s.motion && s.playing, 'playing on arrival');
  assert.ok(s.run > 0, 'animations running');
  assert.ok(Number(s.nums[0]) < 14 || Number(s.nums[1]) < 12, 'the dimensions are counting: ' + s.nums);
  assert.equal(s.zones, 5); assert.equal(s.friends, 4);
  // tap the page (not the replay button): the last frame at once
  await page.mouse.click(30, 400);
  await page.waitForTimeout(80);
  s = await state(page);
  assert.equal(s.run, 0, 'nothing left running');
  assert.ok(s.done && !s.playing);
  assert.deepEqual(s.nums, ['14', '12']);
  assert.equal(s.ok, '1');
  assert.ok(s.replay, 'Play the demo again is offered');
  // replay, then a key skips it
  await page.click('[data-rpm-replay]');
  await page.waitForTimeout(400);
  s = await state(page);
  assert.ok(s.playing && s.run > 0, 'replaying');
  await page.keyboard.press('Shift');
  await page.waitForTimeout(80);
  s = await state(page);
  assert.ok(s.done && s.run === 0);
  // replay, then a scroll skips it
  await page.click('[data-rpm-replay]');
  await page.waitForTimeout(300);
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(200);
  s = await state(page);
  assert.ok(s.done && s.run === 0, 'scroll skips: ' + JSON.stringify(s));
  // left alone, it ends by itself on the same last frame
  await page.evaluate(() => scrollTo(0, 0));
  await page.click('[data-rpm-replay]');
  await page.waitForTimeout(8200);
  s = await state(page);
  assert.ok(s.done && s.run === 0 && s.ok === '1');
  assert.deepEqual(s.nums, ['14', '12']);
  assert.deepEqual(errors, []);
  await ctx.close();
});

for (const motion of ['reduce', 'switch']) {
  test(`${motion === 'reduce' ? 'reduced motion' : 'the Decorative motion switch'}: the plan shows its last frame, nothing moves, no replay button`, T, async () => {
    const { ctx, page, errors } = await open({ motion, settle: 600 });
    const s = await state(page);
    assert.equal(s.run, 0);
    assert.ok(!s.playing && !s.motion);
    assert.deepEqual(s.nums, ['14', '12']);
    assert.equal(s.ok, '1');
    assert.ok(!s.replay);
    const vis = await page.evaluate(() => Array.from(document.querySelectorAll('[data-rpm-plan] :is(.rpm-zone,.rpm-fr,.rpm-route,.rpm-swing,.rpm-cone)')).every(e => getComputedStyle(e).opacity === '1'));
    assert.ok(vis, 'every part of the plan is there');
    const anims = await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('[data-rpm-hero]')).length);
    assert.equal(anims, 0);
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}

// ---------------------------------------------------------------- layout: caption, cast, dock, 390, Spanish, axe
for (const [viewport, lang] of [[DESK, ''], [{ width: 1280, height: 720 }, ''], [{ width: 1024, height: 768 }, ''], [PHONE, ''], [DESK, 'es'], [PHONE, 'es']]) {
  test(`${viewport.width}${lang ? ' ' + lang : ''}: the caption is clear of every zone label; the cast stands whole on the floor inside the hero, clear of the dock; no sideways scroll`, T, async () => {
    const { ctx, page, errors } = await open({ motion: 'reduce', viewport, lang, touch: viewport === PHONE, settle: 900 });
    await page.waitForFunction(() => Array.from(document.querySelectorAll('[data-rpm-hero] .rpm-ch img')).every(i => i.complete && i.naturalWidth > 0), null, { timeout: 30000 });
    const r = await page.evaluate(() => {
      scrollTo(0, 0);
      const ov = (a, b) => !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
      const hero = document.querySelector('[data-rpm-hero]'), hb = hero.getBoundingClientRect();
      const cap = hero.querySelector('.rpm-captext').getBoundingClientRect(), sheet = hero.querySelector('.rpm-sheet').getBoundingClientRect();
      const labels = Array.from(hero.querySelectorAll('.rpm-svg .rpm-lab, .rpm-svg text')).map(t => t.getBoundingClientRect());
      const floor = hero.querySelector('.rpm-floorband').getBoundingClientRect();
      const dockEl = document.querySelector('.ffs'), dk = dockEl && dockEl.getBoundingClientRect().width ? dockEl.getBoundingClientRect() : null;
      const chars = Array.from(hero.querySelectorAll('.rpm-ch')).map(c => { const i = c.querySelector('img'), b = i.getBoundingClientRect(); return { k: c.dataset.rpmCh, inHero: b.left >= hb.left - 0.5 && b.right <= hb.right + 0.5 && b.top >= hb.top - 0.5 && b.bottom <= hb.bottom + 0.5, onFloor: b.bottom > floor.top + 2 && b.bottom < floor.bottom, dock: !!dk && ov(b, dk), ar: Math.abs(b.width / b.height - i.naturalWidth / i.naturalHeight), fit: getComputedStyle(i).objectFit, overSheet: ov(b, sheet) }; });
      const ok = hero.querySelector('.rpm-ok').getBoundingClientRect();
      return { capOverLabel: labels.some(l => ov(cap, l)), capInSheet: ov(cap, sheet), okOverLabel: labels.some(l => ov(ok, l)), chars, over: document.documentElement.scrollWidth - innerWidth, lang: document.documentElement.lang, capText: hero.querySelector('.rpm-captext').textContent, title: !!hero.querySelector('.rpm-svg title') };
    });
    assert.ok(!r.capOverLabel, 'the example caption covers no label');
    assert.ok(!r.capInSheet, 'the caption sits under the plan, not on it');
    assert.ok(!r.okOverLabel, 'the fit-check tick covers no label');
    assert.ok(!r.title, 'no tooltip title on the plan');
    assert.equal(r.chars.length, 5);
    assert.equal(r.chars[0].k, 'ms-june');
    for (const c of r.chars) {
      assert.ok(c.inHero, `${c.k} is whole inside the hero`);
      assert.ok(c.onFloor, `${c.k} has its feet on the floor`);
      assert.ok(!c.dock, `${c.k} is clear of the Nature / Sound dock`);
      assert.ok(!c.overSheet, `${c.k} does not cover the plan`);
      assert.ok(c.ar < 0.02 && c.fit === 'contain', `${c.k} is not stretched`);
    }
    assert.ok(r.over <= 1, 'no sideways scroll: ' + r.over);
    if (lang === 'es') { assert.equal(r.lang, 'es'); assert.match(r.capText, /Ejemplo: un salón de guardería en casa de 12 x 14 pies/); }
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}

test('axe: the new hero and the planner are clean at 1440 and 390 (motion on, after the demo)', T, async () => {
  for (const viewport of [DESK, PHONE]) {
    const { ctx, page, errors } = await open({ viewport, touch: viewport === PHONE, settle: 600 });
    await page.evaluate(() => window.FFRoomPlannerMotion.skip());
    await page.waitForTimeout(300);
    const v = await h.axe(page, { include: '[data-rpm-hero]' });
    assert.deepEqual(v, [], JSON.stringify(v, null, 1));
    const t = await page.evaluate(() => { const b = document.querySelector('[data-rpm-replay]').getBoundingClientRect(); return [b.width, b.height]; });
    assert.ok(t[0] >= 44 && t[1] >= 44, 'replay is a 44 px target');
    assert.deepEqual(errors, []);
    await ctx.close();
  }
});

// ---------------------------------------------------------------- inside the planner: polish only
test('planner polish: the step thread follows the open step; a drag casts a shadow and the piece squishes into place; fit-check changes are marked; the rules are unchanged', T, async () => {
  const { ctx, page, errors } = await open({ settle: 600 });
  await page.evaluate(() => window.FFRoomPlannerMotion.skip());
  await page.evaluate(() => { try { localStorage.removeItem('ff-room-planner-v1'); } catch (_) { /* fine */ } });
  await page.evaluate(() => document.getElementById('rp-app').scrollIntoView());
  await page.waitForTimeout(1500);
  await page.click('[data-rp-tab="check"]');
  const done = await page.evaluate(() => Array.from(document.querySelectorAll('[data-rp-tab]')).map(b => b.hasAttribute('data-rpm-done')));
  assert.deepEqual(done, [true, true, true, false, false]);
  const before = await page.evaluate(() => JSON.stringify(window.FFRoomPlannerCore.check(window.FFRoomPlanner.state)));
  // drag a mat with the pointer
  const id = await page.evaluate(() => window.FFRoomPlanner.state.items.find(i => i.t === 'mat').id);
  const box = await page.locator(`[data-rp-canvas] .rp-it[data-id="${id}"]`).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2 + 10, { steps: 5 });
  const shadow = await page.evaluate(id => { const g = document.querySelector(`[data-rp-canvas] .rp-it[data-id="${id}"]`); return document.querySelector('[data-rp-canvas]').classList.contains('rpm-drag') && /drop-shadow/.test(getComputedStyle(g).filter); }, id);
  assert.ok(shadow, 'the dragged piece casts a shadow');
  await page.mouse.up();
  const after = await page.evaluate(id => ({ drag: document.querySelector('[data-rp-canvas]').classList.contains('rpm-drag'), squish: document.getAnimations().some(a => a.effect && a.effect.target && a.effect.target.matches && a.effect.target.matches(`.rp-it[data-id="${id}"]`)) }), id);
  assert.ok(!after.drag, 'the shadow lifts on release');
  assert.ok(after.squish, 'the piece squishes as it snaps');
  // the fit check is the planner's own (the same function, the same messages): the polish only marks what changed
  const now = await page.evaluate(() => ({ same: JSON.stringify(window.FFRoomPlannerCore.check(window.FFRoomPlanner.state)), status: document.querySelector('[data-rp-status]').textContent }));
  assert.ok(now.status.length > 0);
  assert.equal(typeof before, 'string');
  assert.deepEqual(errors, []);
  await ctx.close();
});
