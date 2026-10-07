'use strict';
// Wave 8 lane HERO (owner 2026-10-06: "That title sequence where you see the actual felt Futures Friends — keep it the same, break
// those letters up so that they can fly in and also be living, moving around a little bit; give it more dynamic layers and break the
// 3-D world up in more layers ... like Apple glass in a few places ... a lot more polished, high-end"). Encodes, in VM and in real
// headless Chromium (harness as tests/a11y.test.js):
//  - the logo kit: one file holds the letterless badge and the 14 letters + heart; put back together they ARE the original logo
//    (decoded in the browser and compared with the shipped plush-logo-960.webp pixel by pixel);
//  - the h1 keeps one accessible name, "Futures Friends" (the <img> alt); the letters are aria-hidden sprites in their slots;
//  - the fly-in at 390 (iPhone) and 1280: badge first, then FUTURES one by one from far behind the sky, then FRIENDS from in front of
//    the camera, the heart last; every letter lands with a squash and ends exactly in its slot; ff:sfx events fire with a pan;
//  - alive afterwards: each letter breathes on its own phase and the wave runs every 8 s; it all pauses off screen / hidden tab;
//    a tap boings a letter (squish sound); the letters lean toward the pointer;
//  - reduced motion: the assembled logo, nothing moves, a tap only sends its sound;
//  - more depth: light shafts + far mountains planes; birds, butterfly and bokeh only with motion on;
//  - liquid glass card with a fallback, text contrast kept; budgets (phone hero bytes, CLS, LCP element).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const SFX = ['whoosh', 'cloud-puff', 'letter-pop', 'logo-land', 'hop', 'land', 'chime', 'sparkle', 'wink', 'squish', 'rain', 'tap', 'page-turn',
  'card-flip', 'badge', 'footstep', 'wave', 'firefly', 'night-chime']; // WAVE8_CONTRACT.md

function meadow() {
  const ctx = { console };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(read('meadow-hero.js'), ctx, { filename: 'meadow-hero.js' });
  return ctx.FFMeadow;
}
// WebP size from the header (VP8X)
const webpSize = f => { const b = fs.readFileSync(path.join(ROOT, f)); return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)]; };

test('logo markup: the kit <img> keeps the accessible name; 14 letters + the heart are aria-hidden sprites, FUTURES then FRIENDS', () => {
  const M = meadow(), html = M.logo();
  assert.match(html, /^<img class="mh-logo-img" src="img\/plush\/hero\/plush-logo-kit-800\.webp" width="800" height="379" alt="Futures Friends"/);
  assert.equal((html.match(/alt="Futures Friends"/g) || []).length, 1, 'one name');
  assert.match(html, /<span class="mh-letters" aria-hidden="true">/);
  const ls = [...html.matchAll(/<span class="mh-l" data-l="([A-Za-z0-9]+)" data-row="(\d)" style="--i:(\d+);left:([\d.]+)%;top:([\d.]+)%;width:([\d.]+)%;height:([\d.]+)%"><i class="mh-lf"><b class="mh-la" style="background-size:[\d.]+% [\d.]+%;background-position:[\d.]+% [\d.]+%"><\/b><\/i><\/span>/g)];
  assert.equal(ls.length, 15);
  assert.equal(M.LETTERS.filter(l => l[2] === 0).map(l => l[1]).join(''), 'FUTURES');
  assert.equal(M.LETTERS.filter(l => l[2] === 1).map(l => l[1]).join(''), 'FRIENDS');
  assert.deepEqual(ls.map(m => +m[3]), [...Array(15).keys()], 'phase index in reading order');
  assert.equal(ls[14][1], 'heart'); assert.equal(ls[14][2], '2');
  // every slot inside the badge, every sprite inside the kit and below the badge rows
  const [kw, kh] = webpSize('img/plush/hero/plush-logo-kit-800.webp');
  assert.deepEqual([kw, kh], [M.KIT.w, M.KIT.th]);
  for (const [id, , , x, y, w, h, ax, ay] of M.LETTERS) {
    assert.ok(x >= 0 && y >= 0 && x + w <= M.KIT.w && y + h <= M.KIT.h, `${id} slot in the badge`);
    assert.ok(ax >= 0 && ay >= M.KIT.h && ax + w <= M.KIT.w && ay + h <= M.KIT.th, `${id} sprite in the kit, below the badge`);
  }
  // sprites never overlap each other in the kit
  for (const a of M.LETTERS) for (const b of M.LETTERS) if (a !== b) {
    const ov = a[7] < b[7] + b[5] && b[7] < a[7] + a[5] && a[8] < b[8] + b[6] && b[8] < a[8] + a[6];
    assert.ok(!ov, `${a[0]} / ${b[0]} overlap in the kit`);
  }
  assert.match(html, /<span class="mh-nest" aria-hidden="true">(<img class="mh-puff mh-puff-[lrf]"[^>]*alt=""[^>]*>){3}<\/span>$/, 'the cloud nest stays');
});

test('the kit is in the plush manifest (derived locally, no generation) and preloaded on Home; versions bumped', () => {
  const man = JSON.parse(read('img/plush/manifest.json'));
  const f = man.files.find(x => x.path === 'img/plush/hero/plush-logo-kit-800.webp');
  assert.ok(f && f.kind === 'hero-layer' && f.bytes < 160e3, 'kit listed, under 160 KB');
  assert.ok(f.caveats.some(c => /no new generation/.test(c)) && f.caveats.some(c => /re-assemble to the original logo/.test(c)));
  assert.ok(man.updates.some(u => u.lane === 'W8HERO'));
  const html = read('index.html');
  assert.match(html, /\["img\/plush\/hero\/plush-logo-kit-800\.webp","","",""\]/, 'preloaded with the hills');
  assert.doesNotMatch(html, /plush-logo-480\.webp/, 'the old logo is no longer preloaded');
  const v = f2 => +((html.match(new RegExp(f2.replace('.', '\\.') + '\\?v=(\\d+)')) || [])[1] || 0);
  assert.ok(v('meadow-hero.js') >= 3 && v('meadow-hero.css') >= 3 && v('hero-world.js') >= 3 && v('hero-world.css') >= 2 && v('hero-motion.js') >= 4);
});

test('code: every ff:sfx name is in the contract; the glass, the letter loops and the scroll exit sit behind their switches', () => {
  const js = read('hero-world.js');
  const names = [...new Set([...js.matchAll(/sfx\('([a-z-]+)'/g)].map(m => m[1]))].sort();
  assert.deepEqual(names, ['cloud-puff', 'letter-pop', 'logo-land', 'sparkle', 'squish', 'whoosh']);
  for (const n of names) assert.ok(SFX.includes(n), n);
  assert.match(js, /new CustomEvent\('ff:sfx', \{ detail \}\)/);
  const css = read('hero-world.css').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(css, /@supports \(animation-timeline:view\(\)\)\{\s*@media \(prefers-reduced-motion:no-preference\)\{\s*:root:not\(\[data-motion=off\]\) \.mh-hero\.mh-alive \.mh-l\{animation:mh-lexit/);
  assert.match(css, /:root:not\(\[data-motion=off\]\) \.mh-hero\.mh-alive \.mh-la\{animation:mh-lbob [^}]*mh-lwave 8s/);
  const mcss = read('meadow-hero.css').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(mcss, /@supports \(\(-webkit-backdrop-filter:blur\(1px\)\) or \(backdrop-filter:blur\(1px\)\)\)\{\s*@media not \(prefers-reduced-transparency:reduce\)\{\s*\.mh-hero \.mh-card\{/);
  // the world's new planes are in the markup far to near; the moving extras are not (motion only)
  const w = meadow().world();
  assert.match(w, /data-depth="mountains" style="--z:-1000"[\s\S]*data-depth="hills" style="--z:-650"[\s\S]*data-depth="rays" style="--z:-560"/);
  assert.match(w, /<source media="\(max-width:640px\)" srcset="img\/plush\/hero\/world-mountains-c600\.webp"/);
  assert.doesNotMatch(w + meadow().front(), /mh-bird|mh-fly|mh-bokeh|mh-shafts|canvas/);
});

// ---------------------------------------------------------------- real browser
const H = () => import('./a11y-harness.mjs');
let h, srv, browser, devices;
test.before(async () => {
  h = await H(); srv = await h.startSite(); browser = await h.loadChromium().launch();
  devices = createRequire(path.join(process.env.HUB_DIR ?? '/Volumes/FFCRM/app', 'hub/package.json'))('playwright-core').devices;
});
test.after(async () => { await browser.close(); await srv.close(); });
const fresh = () => `${srv.base}?fresh=w8-${Date.now()}#home`;
const SFXLOG = () => { try { localStorage.setItem('ff-sound-v2', 'off'); } catch (_) {} /* sound on by default (owner): keep the audio engine out of frame-timing tests; ff:sfx events fire regardless */ window.__sfx = []; const t0 = performance.now(); document.addEventListener('ff:sfx', e => window.__sfx.push(Object.assign({ t: performance.now() - t0 }, e.detail))); };

test('the letters re-assemble to the original logo (decoded in Chromium, pixel by pixel) and sit exactly in their slots', async () => {
  const ctx = await browser.newContext({ viewport: h.SIZES[1280], reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(fresh()); await page.waitForTimeout(500);
  const r = await page.evaluate(async () => {
    const load = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
    const M = window.FFMeadow, kit = await load(M.KIT.src), ref = await load('img/plush/hero/plush-logo-960.webp');
    const W = M.KIT.w, Hh = M.KIT.h;
    const cv = (w, hh) => { const c = document.createElement('canvas'); c.width = w; c.height = hh; return c.getContext('2d'); };
    const a = cv(W, Hh); a.drawImage(kit, 0, 0, W, Hh, 0, 0, W, Hh);
    M.LETTERS.forEach(([, , , x, y, w, hh, ax, ay]) => a.drawImage(kit, ax, ay, w, hh, x, y, w, hh));
    const b = cv(W, Hh); b.imageSmoothingQuality = 'high'; b.drawImage(ref, 0, 0, W, Hh);
    const A = a.getImageData(0, 0, W, Hh).data, B = b.getImageData(0, 0, W, Hh).data;
    const d = []; let alpha = 0, n = 0;
    for (let i = 0; i < A.length; i += 4) { alpha += Math.abs(A[i + 3] - B[i + 3]); n++; if (B[i + 3] > 200) d.push((Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2])) / 3); }
    alpha /= n; // mean alpha difference (edges differ only by the browser's resampling of the 960 reference to 800)
    d.sort((x, y) => x - y);
    // the DOM slots: each letter box at its % of the badge
    const img = document.querySelector('.mh-logo-img').getBoundingClientRect();
    const slot = [...document.querySelectorAll('.mh-l')].map(l => { const q = l.getBoundingClientRect(), L = M.LETTERS.find(x => x[0] === l.dataset.l); return Math.max(Math.abs(q.left - img.left - L[3] / W * img.width), Math.abs(q.top - img.top - L[4] / Hh * img.height), Math.abs(q.width - L[5] / W * img.width)); });
    return { mean: d.reduce((s, x) => s + x, 0) / d.length, p99: d[Math.floor(d.length * .99)], alpha, slot: Math.max(...slot), badgeOnly: getComputedStyle(document.querySelector('.mh-logo-img')).objectFit };
  });
  assert.ok(r.mean < 9, `mean RGB difference ${r.mean.toFixed(2)} / 255`);
  assert.ok(r.p99 < 45, `p99 ${r.p99}`);
  assert.ok(r.alpha < 1, `mean alpha difference ${r.alpha.toFixed(3)}`);
  assert.ok(r.slot < 1, `letters within 1 px of their slots (${r.slot.toFixed(2)})`);
  assert.equal(r.badgeOnly, 'cover', 'the <img> shows only the badge rows of the kit');
  // one h1, one name
  assert.equal(await page.getByRole('heading', { level: 1, name: 'Futures Friends', exact: true }).count(), 1);
  assert.equal(await page.locator('h1').count(), 1);
  assert.equal(await page.locator('h1 .mh-letters[aria-hidden="true"] .mh-l').count(), 15);
  await ctx.close();
});

for (const [name, opts] of [['390 iPhone', () => ({ ...devices['iPhone 13'] })], ['1280', () => ({ viewport: { width: 1280, height: 800 } })]]) {
  test(`the fly-in at ${name}: badge first, FUTURES from far behind, FRIENDS from in front, heart last; each lands with a squash in its slot; sounds fire`, async () => {
    const ctx = await browser.newContext({ ...opts(), reducedMotion: 'no-preference' });
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(SFXLOG);
    await page.addInitScript(() => {
      window.__f = []; const t0 = performance.now();
      const tick = () => {
        const ls = [...document.querySelectorAll('.mh-lf')];
        if (ls.length) window.__f.push({ t: performance.now() - t0, op: document.querySelector('.mh-hero').dataset.opening, badge: +getComputedStyle(document.querySelector('.mh-logo-img')).opacity,
          l: ls.map(f => { const cs = getComputedStyle(f), m = new DOMMatrix(cs.transform); return [+cs.opacity, Math.hypot(m.a, m.b), Math.hypot(m.c, m.d), m.e, m.f]; }) });
        if (performance.now() - t0 < 6500) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.goto(fresh());
    await page.waitForTimeout(6800);
    const r = await page.evaluate(() => ({ f: window.__f.filter(x => x.op === 'playing'), sfx: window.__sfx, op: document.querySelector('.mh-hero').dataset.opening,
      end: [...document.querySelectorAll('.mh-lf')].map(f => [getComputedStyle(f).transform, getComputedStyle(f).opacity]), L: document.querySelector('.mh-logo-img').offsetWidth, ids: [...document.querySelectorAll('.mh-l')].map(l => l.dataset.l) }));
    assert.ok(r.f.length > 60, `sampled the opening (${r.f.length})`);
    // when each letter first shows, and where it is then
    const first = r.ids.map((id, i) => { const k = r.f.findIndex(x => x.l[i][0] > .05); return k < 0 ? null : { id, t: r.f[k].t, sx: r.f[k].l[i][1], dx: r.f[k].l[i][3], dy: r.f[k].l[i][4], badge: r.f[k].badge }; });
    assert.ok(first.every(Boolean), 'every letter appears');
    const shown = id => first[r.ids.indexOf(id)];
    assert.ok(first.every(x => x.badge > .5), 'the badge is there before any letter');
    // while visible in flight (frame times vary with load, so the extremes over every visible frame, not just the first one)
    const seen = id => { const i = r.ids.indexOf(id); return r.f.filter(x => x.l[i][0] > .05).map(x => x.l[i]); };
    for (const id of ['F1', 'U1', 'T', 'U2', 'R1', 'E1', 'S1']) { const v = seen(id); assert.ok(Math.min(...v.map(x => x[1])) < .6 && Math.min(...v.map(x => x[4])) < -r.L * .3, `${id} comes from far away and above`); }
    for (const id of ['F2', 'R2', 'I', 'E2', 'N', 'D', 'S2']) { const v = seen(id); assert.ok(Math.max(...v.map(x => x[1])) > 1.4 && Math.max(...v.map(x => x[4])) > r.L * .3, `${id} comes big, from in front, from below`); }
    const t = id => shown(id).t;
    assert.ok(t('S1') < t('F2') && t('F1') < t('U1') && t('F2') < t('S2') && t('S2') < t('heart'), 'FUTURES in order, then FRIENDS, then the heart');
    // a squash: wider than tall at touchdown, for every flying letter
    r.ids.slice(0, 14).forEach((id, i) => assert.ok(r.f.some(x => x.l[i][1] / x.l[i][2] > 1.15 && x.l[i][1] > .95), `${id} squashes as it lands (wider than tall at full size)`));
    assert.equal(r.op, 'done');
    assert.deepEqual(r.end.map(e => e.join(' ')), Array(15).fill('none 1'), 'every letter exactly in its slot at the end');
    // sounds: the contract's names, one pop per letter panned left to right through each word, the heart's sparkle, the badge's landing
    const n = k => r.sfx.filter(e => e.name === k);
    assert.ok(n('whoosh').length >= 1 && n('cloud-puff').length === 1 && n('logo-land').length === 1 && n('sparkle').length === 1);
    const pops = n('letter-pop');
    assert.equal(pops.length, 14);
    assert.ok(pops.every(p => p.x >= -1 && p.x <= 1));
    for (const word of [pops.slice(0, 7), pops.slice(7)]) for (let i = 1; i < 7; i++) assert.ok(word[i].x > word[i - 1].x, 'pans left to right through the word');
    assert.ok(r.sfx.every(e => SFX.includes(e.name)));
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}

test('alive afterwards: each letter breathes on its own phase, the wave runs every 8 s; everything pauses off screen and on a hidden tab', async () => {
  const ctx = await browser.newContext({ ...devices['iPhone 13'], reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  await page.goto(fresh());
  await page.waitForFunction(() => document.querySelector('.mh-hero').dataset.opening === 'playing');
  await page.touchscreen.tap(200, 700); await page.waitForTimeout(900);
  const loops = () => page.evaluate(() => [...document.querySelectorAll('.mh-la')].map(a => a.getAnimations().filter(x => x instanceof CSSAnimation).map(x => `${x.animationName}:${x.playState}`).join(',')));
  const L = await loops();
  assert.ok(L.every(x => x === 'mh-lbob:running,mh-lwave:running'), JSON.stringify(L));
  const ph = await page.evaluate(() => [...document.querySelectorAll('.mh-la')].map(a => { const t = a.getAnimations().find(x => x.animationName === 'mh-lbob').effect.getComputedTiming(); return +((t.currentIteration % 2) + t.progress).toFixed(2) + '/' + t.duration; }));
  assert.ok(new Set(ph).size >= 12, `own phases (${ph})`);
  const wave = await page.evaluate(() => [...document.querySelectorAll('.mh-la')].map(a => a.getAnimations().find(x => x.animationName === 'mh-lwave').effect.getComputedTiming()));
  assert.ok(wave.every(w => w.duration === 8000 && w.iterations === Infinity));
  // the letters really move (1 to 3 px)
  const pos = () => page.evaluate(() => [...document.querySelectorAll('.mh-la')].map(a => a.getBoundingClientRect().top));
  const a = await pos(); await page.waitForTimeout(700); const b = await pos();
  assert.ok(a.some((v, i) => Math.abs(v - b[i]) > .3), 'they breathe');
  await page.evaluate(() => scrollTo(0, 3000)); await page.waitForTimeout(400);
  assert.ok((await loops()).every(x => /^mh-lbob:paused,mh-lwave:paused/.test(x)), 'off screen: paused');
  await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(400);
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  assert.ok((await loops()).every(x => x === 'mh-lbob:paused,mh-lwave:paused'), 'hidden tab: paused');
  // birds, the butterfly, bokeh and the light shafts exist with motion on, and pause with the world
  const extra = await page.evaluate(() => ({ birds: document.querySelectorAll('.mh-bird').length, fly: document.querySelectorAll('.mh-fly').length, bokeh: document.querySelectorAll('.mh-bokeh').length,
    shafts: document.querySelectorAll('canvas.mh-shafts').length, states: [...new Set([...document.querySelectorAll('.mh-bird, .mh-fly, .mh-bokeh, .mh-shafts')].flatMap(e => e.getAnimations()).map(x => x.playState))] }));
  assert.deepEqual(extra, { birds: 1, fly: 1, bokeh: 3, shafts: 1, states: ['paused'] });
  await ctx.close();
});

test('a tap boings a letter (squash on its felt, squish sound panned to it); the letters lean toward the pointer and spring back', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  await page.addInitScript(SFXLOG);
  await page.goto(fresh());
  await page.waitForFunction(() => document.querySelector('.mh-hero').dataset.opening === 'playing');
  await page.keyboard.press('Shift'); await page.waitForTimeout(900);
  const box = await page.locator('.mh-l[data-l="R1"]').boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height * .6);
  await page.waitForTimeout(120);
  const r = await page.evaluate(() => {
    const a = document.querySelector('.mh-l[data-l="R1"] .mh-la'), w = a.getAnimations().filter(x => !(x instanceof CSSAnimation));
    return { anims: w.length, kf: w.length ? w[0].effect.getKeyframes().map(k => k.scale) : [], sfx: window.__sfx.filter(e => e.name === 'squish') };
  });
  assert.equal(r.anims, 1, 'one boing');
  assert.ok(r.kf.includes('1.22 0.8') || r.kf.includes('1.22 .8'), `squash keyframes ${r.kf}`);
  assert.equal(r.sfx.length, 1); assert.ok(r.sfx[0].x > -1 && r.sfx[0].x < 1);
  await page.waitForTimeout(700);
  // lean: the pointer just right of the T: nearby letters rotate toward it; far ones do not move
  const t = await page.locator('.mh-l[data-l="T"]').boundingBox();
  await page.mouse.move(t.x + t.width + 30, t.y + t.height / 2, { steps: 6 }); await page.waitForTimeout(450);
  const lean = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.mh-l')].map(l => { const m = new DOMMatrix(getComputedStyle(l.querySelector('.mh-lf')).transform); return [l.dataset.l, +(Math.atan2(m.b, m.a) * 180 / Math.PI).toFixed(2)]; })));
  assert.ok(lean.T > .3, `T leans toward the pointer (${lean.T})`);
  assert.ok(Math.abs(lean.heart) < Math.abs(lean.T), 'farther letters lean less');
  await page.mouse.move(5, 790); await page.mouse.move(-10, 900).catch(() => {}); await page.evaluate(() => document.querySelector('.mh-hero').dispatchEvent(new PointerEvent('pointerleave')));
  await page.waitForTimeout(1200);
  const back = await page.evaluate(() => [...document.querySelectorAll('.mh-lf')].filter(f => f.style.transform).length);
  assert.equal(back, 0, 'they spring back');
  await ctx.close();
});

test('reduced motion: the assembled logo, nothing moves, no birds/bokeh/shafts; a tap on a letter only sends its sound', async () => {
  for (const w of [1280, 390]) {
    const ctx = await browser.newContext({ viewport: h.SIZES[w], reducedMotion: 'reduce' });
    const page = await ctx.newPage(); const fetched = []; page.on('request', q => fetched.push(q.url()));
    await page.addInitScript(SFXLOG);
    await page.goto(fresh()); await page.waitForTimeout(600);
    const box = await page.locator('.mh-l[data-l="E1"]').boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(200);
    const s = await page.evaluate(() => ({ anims: document.getAnimations().length, moved: [...document.querySelectorAll('.mh-lf, .mh-la, .mh-l')].filter(e => getComputedStyle(e).transform !== 'none').length,
      extras: document.querySelectorAll('.mh-bird, .mh-fly, .mh-bokeh, canvas.mh-shafts, .mh-spec').length, sfx: window.__sfx.map(e => e.name), letters: document.querySelectorAll('.mh-l').length,
      visible: [...document.querySelectorAll('.mh-la')].every(a => getComputedStyle(a).opacity === '1' && getComputedStyle(a).backgroundImage.includes('plush-logo-kit-800')) }));
    assert.deepEqual(s, { anims: 0, moved: 0, extras: 0, sfx: ['squish'], letters: 15, visible: true }, `${w}px`);
    assert.ok(!fetched.some(u => /world8\/(bird|butterfly|sparkle)/.test(u)), 'no moving extras downloaded');
    await ctx.close();
  }
});

test('low-power or data-saver devices get the lite world: no light shafts, butterfly or bokeh, a plain frosted card; the letters still live', async () => {
  const ctx = await browser.newContext({ viewport: h.SIZES[390], reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  await page.addInitScript(() => { Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 2 }); Object.defineProperty(navigator, 'deviceMemory', { get: () => 1 }); });
  await page.goto(fresh());
  await page.waitForFunction(() => document.querySelector('.mh-hero').dataset.opening === 'playing');
  await page.keyboard.press('Shift'); await page.waitForTimeout(800);
  const s = await page.evaluate(() => ({ lite: document.querySelector('.mh-hero').classList.contains('mh-lite'), shafts: document.querySelectorAll('canvas.mh-shafts').length, fly: document.querySelectorAll('.mh-fly').length,
    bokeh: document.querySelectorAll('.mh-bokeh').length, birds: document.querySelectorAll('.mh-bird').length, pts: document.querySelectorAll('.mh-pt').length, bf: getComputedStyle(document.querySelector('.mh-card')).backdropFilter,
    alive: [...document.querySelectorAll('.mh-la')].every(a => a.getAnimations().length === 2) }));
  assert.deepEqual(s, { lite: true, shafts: 0, fly: 0, bokeh: 0, birds: 1, pts: 6, bf: 'none', alive: true });
  await ctx.close();
});

test('liquid glass card: frosted backdrop + specular light in Chromium; opaque felt card with reduced transparency; text stays AA over the sky', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  await page.goto(fresh());
  await page.waitForFunction(() => document.querySelector('.mh-hero').dataset.opening === 'playing');
  await page.keyboard.press('Shift'); await page.waitForTimeout(900);
  const g = await page.evaluate(() => { const c = document.querySelector('.mh-card'), cs = getComputedStyle(c); return { bf: cs.backdropFilter, bg: cs.backgroundColor, spec: !!c.querySelector('.mh-spec[aria-hidden="true"]'), lens: document.querySelector('.mh-hero').classList.contains('mh-refract') && !!document.getElementById('mh-lens') }; });
  assert.match(g.bf, /blur\(/); assert.match(g.bf, /saturate/);
  assert.match(g.bg, /rgba\(255, 251, 244, 0\.8/);
  assert.ok(g.spec && g.lens, JSON.stringify(g));
  // the specular light moves with the camera (pointer)
  const sp = () => page.evaluate(() => document.querySelector('.mh-spec').style.translate);
  await page.mouse.move(80, 300, { steps: 4 }); await page.waitForTimeout(900); const s1 = await sp();
  await page.mouse.move(1200, 300, { steps: 4 }); await page.waitForTimeout(900); const s2 = await sp();
  assert.notEqual(s1, s2);
  // contrast: hide the card's text, read the card's darkest background pixels behind where text sits, compare with every text colour
  const card = await page.locator('.mh-card').boundingBox();
  const colors = await page.evaluate(() => { const out = new Set(); document.querySelectorAll('.mh-card p, .mh-card .px-herosupport, .mh-card .ffm-w').forEach(e => out.add(getComputedStyle(e).color)); document.querySelector('.mh-card').classList.add('w8-hidetext'); return [...out]; });
  await page.addStyleTag({ content: '.w8-hidetext p,.w8-hidetext .px-herosupport{color:transparent!important}.w8-hidetext .ffm-w{color:transparent!important}' });
  await page.waitForTimeout(100);
  const shot = await page.screenshot({ clip: { x: card.x + 20, y: card.y + 10, width: card.width - 40, height: card.height * .55 } });
  const lum = await page.evaluate(async b64 => {
    const i = new Image(); i.src = 'data:image/png;base64,' + b64; await i.decode();
    const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const x = c.getContext('2d'); x.drawImage(i, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data, L = [];
    const lin = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; };
    for (let k = 0; k < d.length; k += 16) L.push(.2126 * lin(d[k]) + .7152 * lin(d[k + 1]) + .0722 * lin(d[k + 2]));
    L.sort((a, b) => a - b); return L[Math.floor(L.length * .02)];
  }, shot.toString('base64'));
  const ratio = rgb => { const [r, g2, b] = rgb.match(/\d+/g).map(Number); const lin = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; const l = .2126 * lin(r) + .7152 * lin(g2) + .0722 * lin(b); return (lum + .05) / (l + .05); };
  for (const c of colors) assert.ok(ratio(c) >= 4.5, `${c} on the glass: ${ratio(c).toFixed(2)}:1`);
  await ctx.close();
  // reduced transparency: the cream felt card, no backdrop filter, no lens
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'no-preference' });
  const p2 = await ctx2.newPage();
  const cdp = await ctx2.newCDPSession(p2);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] });
  await p2.goto(fresh()); await p2.waitForTimeout(800);
  const f = await p2.evaluate(() => { const cs = getComputedStyle(document.querySelector('.mh-card')); return { bf: cs.backdropFilter, bg: cs.backgroundColor, lens: document.querySelector('.mh-hero').classList.contains('mh-refract') }; });
  assert.deepEqual(f, { bf: 'none', bg: 'rgb(255, 248, 236)', lens: false });
  await ctx2.close();
});

test('budgets: phone hero images under 1.2 MB, no layout shift on cold loads, the LCP is the plate (never the shafts or the bokeh)', async () => {
  for (const [w, o] of [[390, () => ({ ...devices['iPhone 13'] })], [1280, () => ({ viewport: { width: 1280, height: 800 } })]]) {
    const ctx = await browser.newContext({ ...o(), reducedMotion: 'no-preference' });
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      window.__cls = 0; window.__lcp = null;
      new PerformanceObserver(l => l.getEntries().forEach(e => { if (!e.hadRecentInput) window.__cls += e.value; })).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver(l => { const e = l.getEntries().pop(); window.__lcp = e && e.element ? e.element.className : String(e && e.url); }).observe({ type: 'largest-contentful-paint', buffered: true });
    });
    await page.goto(fresh()); await page.waitForTimeout(6500);
    const r = await page.evaluate(() => {
      const res = performance.getEntriesByType('resource'), urls = new Set([...document.querySelectorAll('.mh-hero img')].map(i => i.currentSrc).filter(Boolean));
      document.querySelectorAll('.mh-pt').forEach(p => { const m = /url\("?([^")]+)/.exec(getComputedStyle(p.querySelector('b')).backgroundImage); if (m) urls.add(m[1]); });
      const seen = new Map(); res.filter(e => urls.has(e.name)).forEach(e => seen.set(e.name, Math.max(seen.get(e.name) || 0, e.encodedBodySize || 0)));
      return { bytes: [...seen.values()].reduce((s, x) => s + x, 0), cls: window.__cls, lcp: window.__lcp };
    });
    if (w === 390) assert.ok(r.bytes <= 1.2e6, `phone hero ${(r.bytes / 1e6).toFixed(3)} MB`);
    assert.ok(r.cls < .01, `${w}px CLS ${r.cls}`);
    assert.match(String(r.lcp), /mh-plate|mh-logo-img/, `${w}px LCP ${r.lcp}`);
    await ctx.close();
  }
});
