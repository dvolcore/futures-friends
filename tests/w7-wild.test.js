'use strict';
// Wave 7 lane WILD (owner 2026-10-06): "the animations need to go through as well on the phone ... the title ... needs to be able to come
// in the clouds. Need to be floating in and show a little bit more movement ... much more effective animation, feel way more
// three-dimensional and big world." Encodes, in VM and in real headless Chromium (harness as tests/a11y.test.js):
//  - the world is split into depth planes (sun, far clouds, hills, mid clouds, treehouse, cottage, near meadow, grass, and the near
//    overlay's flowers), each at its own translateZ, all decorative; the new layers are in the plush manifest with their source;
//  - the opening runs at 390 px on a touch phone with motion allowed: the camera starts in a cloud bank that parts, the logo goes
//    from far/small to full size, the camera comes down, then the cast arrives; it ends composed;
//  - reduced motion skips it (no cloud bank, no particles, no animation, the composed world at once);
//  - any input (key, tap) fast-forwards the opening and the cast's entrance to the composed scene;
//  - the planes move at distinct parallax rates with the pointer (far more, near less, the foreground the other way);
//  - phones animate by default (camera drift, clouds, petals), even when the friends are still below the fold;
//  - every idle loop pauses off screen and on a hidden tab, and the camera does no work while hidden.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
// Wave 8 HERO (owner 2026-10-06: "break the 3-D world up in more layers") adds the far mountains (z -1000) and the light-shaft plane
// (rays, z -560, in front of the hills) to the world's markup; every assertion below is kept, the expected list and plane count grow with it.
const ORDER = ['sun', 'far', 'mountains', 'hills', 'rays', 'mid', 'treehouse', 'cottage', 'near', 'front'];

function meadow() {
  const ctx = { console };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(read('meadow-hero.js'), ctx, { filename: 'meadow-hero.js' });
  return ctx.FFMeadow;
}

test('the world is split into depth planes, far to near, each at its own depth; every layer is decorative', () => {
  const M = meadow(), w = M.world(), f = M.front();
  const planes = [...w.matchAll(/class="mh-plane mh-p-([a-z]+)" data-depth="\1" style="--z:(-?\d+)"/g)].map(m => [m[1], +m[2]]);
  assert.deepEqual(planes.map(p => p[0]), ORDER, 'far to near in the markup');
  const z = planes.map(p => p[1]);
  assert.equal(new Set(z).size, z.length, 'every plane has its own depth');
  assert.deepEqual([...z].sort((a, b) => a - b), z, 'depths grow toward the camera');
  assert.ok(z.every(v => v < 0), 'the world is behind the cast (z 0)');
  assert.match(f, /data-depth="fore" style="--z:260"/, 'the near overlay sits in front of the cast');
  for (const html of [w, f]) {
    assert.match(html, /^<div class="mh-(world|nearworld)" aria-hidden="true">/);
    assert.ok(!/alt="[^"]/.test(html), 'every layer has alt=""');
  }
  // phones get the plate's centre crop (smaller and sharper than the whole plate for what a phone shows)
  assert.match(w, /<source media="\(max-width:640px\)" srcset="img\/plush\/hero\/world-hills-c836\.webp"/);
  assert.match(w, /<img class="mh-plate mh-hills"[^>]*fetchpriority="high"/, 'the hills are the LCP candidate (class mh-plate)');
  // the logo rides a cloud nest (one puff in front, two behind) without changing its accessible name
  const logo = M.logo();
  assert.match(logo, /^<img class="mh-logo-img" [^>]*alt="Futures Friends"/);
  assert.match(logo, /<span class="mh-nest" aria-hidden="true">(<img class="mh-puff mh-puff-[lrf]"[^>]*alt=""[^>]*>){3}<\/span>$/);
  // the opening's cloud bank and the particles are never in the markup: hero-world.js makes them only when motion is on
  assert.doesNotMatch(w + f + logo, /mh-veil|mh-pt/);
});

test('the new layers are in the plush manifest, derived from the generated plate, clouds and grass strip (no new generation)', () => {
  const man = JSON.parse(read('img/plush/manifest.json'));
  const files = new Map(man.files.map(f => [f.path, f]));
  const want = ['world-hills-800', 'world-hills-1280', 'world-hills-1600', 'world-hills-c836', 'world-near-800', 'world-near-1600', 'world-near-c836',
    'world-treehouse-320', 'world-cottage-245', 'cloud-veil-1', 'cloud-veil-2', 'petal-daisy', 'petal-pink', 'petal-daisy-s', 'fore-clump'];
  for (const n of want) {
    const f = files.get(`img/plush/hero/${n}.webp`);
    assert.ok(f, n);
    assert.equal(f.kind, 'hero-layer');
    assert.match(f.source, /plush-generated\/hero\/(meadow-plate-clear-sky|felt-clouds|meadow-front-strip)\.png$/, n);
    assert.ok(f.caveats.some(c => /no new generation/.test(c)), `${n}: derived, not generated`);
    assert.ok(f.bytes < 210e3, `${n}: ${f.bytes} bytes`);
  }
  assert.ok(man.updates.some(u => u.lane === 'W7WILD'));
  // every file the world asks for exists
  const M = meadow(), html = M.world() + M.front() + M.logo() + read('hero-world.js') + read('hero-world.css');
  for (const m of html.matchAll(/img\/plush\/hero\/([a-z0-9-]+\.webp)/g)) assert.ok(fs.existsSync(path.join(ROOT, 'img/plush/hero', m[1])), m[1]);
});

test('particles: capped by the device (20 desktop, 12 phone, 6 low-power or data saver), deterministic, at three depths', () => {
  const ctx = { console, FFhooks: [], matchMedia: () => ({ matches: false }) };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(read('hero-world.js'), ctx, { filename: 'hero-world.js' });
  const W = ctx.FFHeroWorld;
  const run = (q, nav) => { ctx.matchMedia = s => ({ matches: q.some(x => s.includes(x)) }); ctx.navigator = nav; return W.budget(); };
  assert.equal(run([], { hardwareConcurrency: 8, deviceMemory: 8 }), 20);
  assert.equal(run(['max-width: 640px'], { hardwareConcurrency: 8, deviceMemory: 4 }), 12);
  assert.equal(run(['max-width: 640px'], { hardwareConcurrency: 4, deviceMemory: 2 }), 6);
  assert.equal(run([], { hardwareConcurrency: 8, connection: { saveData: true } }), 6);
  const a = W.particles(20), b = W.particles(20);
  assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)), 'the same every visit');
  assert.deepEqual([...new Set(a.map(p => p.where))].sort(), ['air', 'mid', 'near']);
  assert.ok(a.every(p => /^-?[\d.]+s$/.test(p.d) && /^-/.test(p.dl)), 'each starts somewhere along its drift');
});

test('motion files: no 3D tilt anywhere (planes only translate), loops behind both switches, index loads the world before the cast', () => {
  const css = read('hero-world.css').replace(/\/\*[\s\S]*?\*\//g, '');
  // the camera never tilts a plane out of shape: depth is translateZ plus a uniform scale, movement is translate only
  assert.doesNotMatch(css, /rotateX|rotateY|rotate3d|skew|matrix/);
  assert.match(css, /\.mh-plane\{[^}]*transform:translateZ\(calc\(var\(--z\) \* 1px\)\) scale\(calc\(1 - var\(--z\) \/ var\(--mh-p\)\)\)/);
  const loops = css.split('\n').filter(l => /infinite/.test(l));
  assert.ok(loops.length >= 6);
  for (const l of loops) assert.match(l, /^\s*:root:not\(\[data-motion=off\]\) \.mh-hero\.mh-alive /, l);
  const js = read('hero-world.js').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(js, /rotateY|rotate3d|skew/, 'the camera slides; it never turns a plane');
  const html = read('index.html');
  const at = f => html.indexOf(`<script src="${f}?v=`);
  assert.ok(at('hero-world.js') > at('ff-motion.js') && at('hero-world.js') < at('hero-motion.js'), 'the world decides its opening in the frame before the cast');
  assert.ok(html.indexOf('href="hero-world.css?v=') > html.indexOf('href="meadow-hero.css?v='));
  const v = f => +((html.match(new RegExp(f.replace('.', '\\.') + '\\?v=(\\d+)')) || [])[1] || 0);
  assert.ok(v('meadow-hero.js') >= 2 && v('meadow-hero.css') >= 2 && v('hero-motion.js') >= 3 && v('hero-motion.css') >= 3 && v('hero-world.js') >= 1);
  assert.match(html, /world-hills-c836\.webp[^\]]*"\(max-width:640px\)"/, 'phones preload their own crop');
});

// ---------------------------------------------------------------- real browser
const H = () => import('./a11y-harness.mjs');
let h, srv, browser, devices;
test.before(async () => {
  h = await H(); srv = await h.startSite(); browser = await h.loadChromium().launch();
  devices = createRequire(path.join(process.env.HUB_DIR ?? '/Volumes/FFCRM/app', 'hub/package.json'))('playwright-core').devices;
});
test.after(async () => { await browser.close(); await srv.close(); });
const fresh = () => `${srv.base}?fresh=w7-${Date.now()}#home`;

// Records, every frame for `ms`, what the opening is doing.
const RECORD = ms => {
  window.__w = [];
  const t0 = performance.now();
  const tick = () => {
    const hero = document.querySelector('.mh-hero'), logo = document.querySelector('.mh-logo-img');
    if (hero && logo) {
      const r = logo.getBoundingClientRect(), veil = [...document.querySelectorAll('.mh-veil')], haze = document.querySelector('.mh-veilsky');
      const dolly = document.querySelector('.mh-world .mh-dolly');
      window.__w.push({ t: performance.now() - t0, op: hero.dataset.opening, logoW: r.width, logoO: +getComputedStyle(logo).opacity,
        veil: veil.length, veilScale: Math.max(0, ...veil.map(v => new DOMMatrix(getComputedStyle(v).transform).a)), veilO: Math.max(0, ...veil.map(v => +getComputedStyle(v).opacity)),
        haze: haze ? +getComputedStyle(haze).opacity : 0, dollyY: new DOMMatrix(getComputedStyle(dolly).transform).m42 });
    }
    if (performance.now() - t0 < ms) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

test('the opening at 390 px on a touch phone: inside a cloud bank that parts, the logo flies in from far and small to full size, the camera comes down, the cast arrives', async () => {
  const ctx = await browser.newContext({ ...devices['iPhone 13'], reducedMotion: 'no-preference' });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(RECORD, 6500);
  await page.goto(fresh());
  await page.waitForTimeout(6800);
  const r = await page.evaluate(() => {
    const s = window.__w.filter(x => x.op === 'playing'), hero = document.querySelector('.mh-hero');
    return { s, vw: innerWidth, H: hero.offsetHeight, op: hero.dataset.opening, finalW: document.querySelector('.mh-logo-img').getBoundingClientRect().width,
      veil: document.querySelectorAll('.mh-veil, .mh-veilsky').length, pts: document.querySelectorAll('.mh-pt').length,
      friends: [...document.querySelectorAll('.ffa-friend')].map(f => getComputedStyle(f).transform), touch: matchMedia('(pointer: coarse)').matches };
  });
  assert.equal(r.vw, 390); assert.ok(r.touch, 'a touch phone');
  assert.ok(r.s.length > 60, `sampled the opening (${r.s.length} frames)`);
  const first = r.s[0];
  assert.ok(first.veil >= 6 && first.haze > .5, 'it starts inside the cloud bank');
  assert.ok(first.dollyY > r.H * .5, `the camera starts up in the sky (${first.dollyY.toFixed(0)} px)`);
  const seen = r.s.filter(x => x.logoO > .05);
  assert.ok(seen.length, 'the logo appears');
  assert.ok(seen[0].logoW < r.finalW * .35, `far and small when it first shows (${seen[0].logoW.toFixed(0)} of ${r.finalW.toFixed(0)} px)`);
  assert.ok(Math.max(...r.s.map(x => x.logoW)) > r.finalW * 1.02, 'it grows past full size before it settles (the squash)');
  assert.ok(Math.max(...r.s.map(x => x.veilScale)) > 1.8, 'the clouds rush past the camera');
  assert.ok(r.s.some(x => x.veil && x.veilO < .05), 'and fade as they pass');
  assert.equal(r.op, 'done');
  assert.equal(r.veil, 0, 'the cloud bank is gone afterwards');
  assert.ok(r.finalW > 250, 'the logo at full size');
  assert.ok(r.pts > 0 && r.pts <= 12, `petals on a phone, capped (${r.pts})`);
  assert.deepEqual(r.friends, ['none', 'none', 'none', 'none'], 'the cast arrived and stands on its marks');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('reduced motion skips the opening: no cloud bank, no particles, no animation; the composed world at once (1280 and 390)', async () => {
  for (const w of [1280, 390]) {
    const ctx = await browser.newContext({ viewport: h.SIZES[w], reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto(fresh()); await page.waitForTimeout(400);
    const s = await page.evaluate(() => {
      const hero = document.querySelector('.mh-hero');
      return { alive: hero.classList.contains('mh-alive'), op: hero.dataset.opening || null, veil: document.querySelectorAll('.mh-veil').length, pts: document.querySelectorAll('.mh-pt').length,
        anims: document.getAnimations().filter(a => hero.contains(a.effect.target)).length, planes: document.querySelectorAll('.mh-plane').length,
        inline: [...document.querySelectorAll('.mh-plane, .mh-dolly, .mh-castrow')].filter(e => e.style.transform).length,
        logo: getComputedStyle(document.querySelector('.mh-logo-img')).transform, card: getComputedStyle(document.querySelector('.mh-card')).opacity };
    });
    assert.deepEqual(s, { alive: false, op: null, veil: 0, pts: 0, anims: 0, planes: 11, inline: 0, logo: 'none', card: '1' }, `${w}px`); // wave 8: 10 world planes + the near overlay (was 8 + 1)
    await ctx.close();
  }
});

test('any input fast-forwards the opening and the entrance: a key on desktop, a tap on a phone', async () => {
  for (const [name, opts, act] of [
    ['key', { viewport: h.SIZES[1280] }, p => p.keyboard.press('Shift')],
    ['tap', { ...devices['iPhone 13'] }, p => p.touchscreen.tap(200, 200)]
  ]) {
    const ctx = await browser.newContext({ ...opts, reducedMotion: 'no-preference' });
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(fresh());
    await page.waitForFunction(() => document.querySelector('.mh-hero') && document.querySelector('.mh-hero').dataset.opening === 'playing');
    await page.waitForTimeout(450);
    await act(page);
    await page.waitForTimeout(650);
    const s = await page.evaluate(() => {
      const hero = document.querySelector('.mh-hero');
      return { op: hero.dataset.opening, running: document.getAnimations().filter(a => !(a instanceof CSSAnimation) && hero.contains(a.effect.target) && a.playState === 'running').length,
        veil: document.querySelectorAll('.mh-veil').length, logo: getComputedStyle(document.querySelector('.mh-logo-img')).transform,
        dolly: getComputedStyle(document.querySelector('.mh-world .mh-dolly')).transform, row: getComputedStyle(document.querySelector('.mh-castrow')).transform,
        friends: [...document.querySelectorAll('.ffa-friend')].map(f => getComputedStyle(f).transform), arriving: document.querySelectorAll('.ffm-arriving').length };
    });
    assert.deepEqual(s, { op: 'skipped', running: 0, veil: 0, logo: 'none', dolly: 'none', row: 'none', friends: ['none', 'none', 'none', 'none'], arriving: 0 }, name);
    assert.deepEqual(errors, []);
    await ctx.close();
  }
});

test('depth: each plane sits at its own translateZ and moves at its own rate with the pointer (far more, near less, the foreground the other way)', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  await page.goto(fresh());
  await page.waitForFunction(() => document.querySelector('.mh-hero').dataset.opening === 'playing');
  await page.keyboard.press('Shift'); await page.waitForTimeout(700);
  const z = await page.evaluate(() => [...document.querySelectorAll('.mh-plane')].map(p => { const m = new DOMMatrix(getComputedStyle(p).transform); return [p.dataset.depth, +p.style.getPropertyValue('--z'), +m.m43.toFixed(1), +m.m11.toFixed(4)]; }));
  const P = 1000;
  for (const [k, want, m43, m11] of z) {
    assert.equal(m43, want, `${k}: translateZ`);
    assert.ok(Math.abs(m11 - (1 - want / P)) < 1e-3, `${k}: scaled back to its authored size (${m11})`);
  }
  assert.equal(new Set(z.map(x => x[1])).size, z.length, 'distinct depths');
  await page.addStyleTag({ content: '.mh-plane{animation:none!important}' }); // hold the automatic drift still to isolate the pointer
  const at = () => page.evaluate(() => Object.fromEntries(['sun:.mh-sun', 'hills:.mh-hills', 'treehouse:.mh-treehouse', 'near:.mh-near', 'front:.mh-front', 'fore:.mh-fore-l'].map(x => { const [k, s] = x.split(':'); const r = document.querySelector(s).getBoundingClientRect(); return [k, r.left + r.width / 2]; })));
  await page.mouse.move(64, 400); await page.waitForTimeout(1600); const L = await at();
  await page.mouse.move(1216, 400); await page.waitForTimeout(1600); const R = await at();
  const d = Object.fromEntries(Object.keys(L).map(k => [k, R[k] - L[k]]));
  const back = ['sun', 'hills', 'treehouse', 'near', 'front'].map(k => Math.abs(d[k]));
  for (let i = 1; i < back.length; i++) assert.ok(back[i - 1] > back[i] + 1, `deeper moves more: ${JSON.stringify(d)}`);
  assert.ok(back[0] > 50, `the sun travels (${d.sun.toFixed(1)} px)`);
  assert.ok(Math.sign(d.fore) === -Math.sign(d.hills) && Math.abs(d.fore) > 20, 'the foreground flowers go the other way');
  await ctx.close();
});

test('phones animate by default, even when the friends are still below the fold; every idle loop pauses off screen and on a hidden tab', async () => {
  // a short phone screen (iPhone SE-like with the browser bars): the logo and card show, the friends are below the fold
  const ctx = await browser.newContext({ ...devices['iPhone SE'], viewport: { width: 375, height: 560 }, reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  await page.goto(fresh());
  await page.waitForTimeout(1000);
  const below = await page.evaluate(() => document.querySelector('.mh-stage').getBoundingClientRect().top > innerHeight - 40);
  await page.waitForTimeout(5200);
  const sun = () => page.evaluate(() => { const r = document.querySelector('.mh-sun').getBoundingClientRect(); return [r.left, r.top]; });
  const loops = () => page.evaluate(() => [...new Set([...document.querySelectorAll('.mh-world, .mh-nearworld')].flatMap(w => w.getAnimations({ subtree: true })).filter(a => a instanceof CSSAnimation).map(a => a.playState))]);
  const s = await page.evaluate(() => ({ alive: document.querySelector('.mh-hero').classList.contains('mh-alive'), paused: document.querySelector('.mh-hero').classList.contains('ffm-paused'), pts: document.querySelectorAll('.mh-pt').length }));
  assert.ok(below, 'the friends start below the fold on this screen');
  assert.deepEqual(s.alive && !s.paused, true, 'the world is alive and not paused');
  assert.ok(s.pts > 0);
  assert.deepEqual(await loops(), ['running']);
  const a = await sun(); await page.waitForTimeout(1500); const b = await sun();
  assert.ok(Math.hypot(b[0] - a[0], b[1] - a[1]) > .5, `the camera drifts on its own (${JSON.stringify([a, b])})`);
  // off screen
  await page.evaluate(() => scrollTo(0, 3000)); await page.waitForTimeout(400);
  assert.deepEqual(await loops(), ['paused'], 'off screen: every world loop paused');
  await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(400);
  assert.deepEqual(await loops(), ['running']);
  // hidden tab
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  assert.deepEqual(await loops(), ['paused'], 'hidden tab: every world loop paused');
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  assert.deepEqual(await loops(), ['running']);
  await ctx.close();
});

test('desktop: the camera does no frame work while the tab is hidden', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  await page.goto(fresh());
  await page.waitForFunction(() => document.querySelector('.mh-hero').dataset.opening === 'playing');
  await page.keyboard.press('Shift'); await page.waitForTimeout(700);
  await page.mouse.move(640, 400); await page.waitForTimeout(1200);
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  const before = await page.evaluate(() => document.querySelector('.mh-p-hills').style.transform);
  await page.mouse.move(40, 60); await page.waitForTimeout(600);
  assert.equal(await page.evaluate(() => document.querySelector('.mh-p-hills').style.transform), before, 'nothing moves while hidden');
  assert.ok(await page.evaluate(() => document.querySelector('.mh-hero').classList.contains('ffm-paused')));
  await ctx.close();
});
