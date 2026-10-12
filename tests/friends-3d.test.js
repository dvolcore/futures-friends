'use strict';
// Meet the friends in 3D (friends-3d.js, ff-3d.js, owner 2026-10-12): the finished 3D friends on #friends. Files (no browser) and real
// headless Chromium (harness as tests/a11y.test.js; its WebGL is SwiftShader, so the engine picks the "low" tier: plain PBR, no fur).
// Encodes:
//  - three.js is vendored at an exact version (vendor/three-0.170.0, r170), imported only by ff-3d.js, and ff-3d.js only by a lazy
//    import() in friends-3d.js; no CDN; Home never fetches any of it (a full scroll of Home on a phone);
//  - the viewer loads on interaction / when near: a phone visit fetches nothing 3D until the stage is scrolled near; on data saver
//    only after the "Show in 3D" tap; then one friend's model only;
//  - motions play (Wave, Hop, Jump, Dance buttons and a tap on the friend), return to the idle loop; the paid Big_Wave_Hello is never
//    used; the frame holds every motion (measured fit is taller than the rest pose);
//  - reduced motion and the Decorative motion switch: a still friend, no frame loop, a motion button shows a still pose;
//  - frames stop off screen and on a hidden tab; leaving the route disposes the WebGL context;
//  - no WebGL: the official cut-out stays, a sentence says why, no model is fetched, no errors;
//  - AR: iPhone gets <a rel="ar"> to the USDZ with an image as its only child, clicked by a labelled button; Android gets the Scene
//    Viewer intent with the absolute GLB, ar_preferred and a fallback to this page; a desktop gets a note;
//  - accessibility: canvas aria-hidden and out of the tab order, real buttons, a polite live region, axe clean on the band;
//  - Spanish (i18n-es-10.js); no page errors; the GPU tier rules (pure tierOf).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const KEYS = ['booker', 'lumi', 'zuri', 'bop'];
const IS3D = u => /\/(ff-3d\.js|vendor\/three-|models\/friends\/)/.test(u);
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36';

// ---------------------------------------------------------------- files (no browser)
test('wiring: cache-busted files, three.js vendored at one exact version, imported lazily and only by the engine, no CDN', () => {
  const html = read('index.html');
  assert.match(html, /href="friends-3d\.css\?v=\d+"/);
  assert.match(html, /src="friends-3d\.js\?v=\d+"/);
  assert.match(html, /src="i18n-es-10\.js\?v=\d+"/);
  assert.ok(html.indexOf('src="family-library.js') < html.indexOf('src="friends-3d.js'), 'after family-library.js (the band sits above its videos band)');
  assert.doesNotMatch(html, /ff-3d\.js|vendor\/three-/, 'the engine and three.js are never in a page\'s script list');
  const three = read('vendor/three-0.170.0/three.module.min.js');
  assert.match(three, /REVISION\s*=\s*"170"|REVISION="170"|"170"/);
  assert.ok(fs.existsSync(path.join(ROOT, 'vendor/three-0.170.0/LICENSE')), 'MIT licence alongside');
  for (const f of ['GLTFLoader.js', 'BufferGeometryUtils.js', 'RoomEnvironment.js']) assert.doesNotMatch(read('vendor/three-0.170.0/' + f), /from 'three'|from "three"/, f + ': no bare specifier');
  const eng = read('ff-3d.js'), ui = read('friends-3d.js');
  assert.match(eng, /from '\.\/vendor\/three-0\.170\.0\/three\.module\.min\.js'/);
  assert.match(ui, /import\(ENGINE\)/);
  assert.match(ui, /const ENGINE = '\.\/ff-3d\.js\?v=\d+'/);
  for (const f of [eng, ui]) {
    const code = f.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    assert.doesNotMatch(code, /https?:\/\/(?!arvr\.google)/, 'no remote URL');
    assert.doesNotMatch(code, /fetch\(|XMLHttpRequest|sendBeacon|WebSocket|localStorage|sessionStorage|indexedDB|document\.cookie/);
    assert.doesNotMatch(code, /Big_Wave_Hello/, 'the big wave stretches the sleeve: never played');
  }
  assert.match(eng, /wave: 'Wave_Gentle'/);
  for (const f of SITE_JS_LOADING_3D()) assert.fail(`${f} loads the 3D engine`);
});
function SITE_JS_LOADING_3D() {
  return fs.readdirSync(ROOT).filter(f => /\.js$/.test(f) && f !== 'friends-3d.js' && f !== 'ff-3d.js').filter(f => /ff-3d\.js|vendor\/three-/.test(read(f)));
}

test('assets: one web model (meshopt GLB under 1.1 MB, all motions), one AR file and one fur map per friend', () => {
  for (const k of KEYS) {
    const b = fs.readFileSync(path.join(ROOT, `models/friends/${k}.glb`));
    assert.equal(b.toString('ascii', 0, 4), 'glTF', k);
    assert.ok(b.length < 1.1e6, `${k}.glb ${b.length}`);
    const j = JSON.parse(b.slice(20, 20 + b.readUInt32LE(12)).toString('utf8'));
    const clips = j.animations.map(a => a.name);
    for (const c of ['Idle_Breathe', 'Wave_Gentle', 'Hop', 'Happy_Jump', 'Joyful_Dance']) assert.ok(clips.includes(c), `${k}: ${c}`);
    assert.ok(j.extensionsUsed.includes('EXT_meshopt_compression'));
    const u = fs.readFileSync(path.join(ROOT, `models/friends/${k}.usdz`));
    assert.equal(u.toString('ascii', 0, 2), 'PK', `${k}.usdz is a USDZ (zip)`);
    assert.ok(fs.statSync(path.join(ROOT, `models/friends/${k}-fur.png`)).size > 50e3);
  }
});

test('GPU tiers: no WebGL = none; software, data saver, small memory, old GPUs = low (no fur); phones = mid; desktops = high', async () => {
  const { tierOf, SHELLS, DPR_CAP } = await import('../ff-3d.js');
  const t = e => tierOf(e).tier;
  assert.equal(t({ webgl: false }), 'none');
  assert.equal(t({ webgl: true, renderer: 'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (LLVM 10.0.0)), SwiftShader driver)' }), 'low');
  assert.equal(t({ webgl: true, renderer: 'Apple GPU', mobile: true, saveData: true }), 'low');
  assert.equal(t({ webgl: true, renderer: 'Adreno (TM) 506', mobile: true }), 'low');
  assert.equal(t({ webgl: true, renderer: 'Mali-T830', mobile: true }), 'low');
  assert.equal(t({ webgl: true, renderer: 'Adreno (TM) 740', mobile: true, memory: 8 }), 'mid');
  assert.equal(t({ webgl: true, renderer: 'Apple GPU', mobile: true, ios: true, cores: 2 }), 'mid', 'iOS reports few cores; not a reason');
  assert.equal(t({ webgl: true, renderer: 'Adreno (TM) 740', mobile: true, memory: 2 }), 'low');
  assert.equal(t({ webgl: true, renderer: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M4 Max, Unspecified Version)' }), 'high');
  assert.deepEqual([SHELLS.high, SHELLS.mid, SHELLS.low, DPR_CAP.high, DPR_CAP.mid, DPR_CAP.low], [16, 8, 0, 2, 1.5, 1]);
});

// ---------------------------------------------------------------- browser
const H = () => import('./a11y-harness.mjs');
let h, site, browser;
test.before(async () => { h = await H(); site = await h.startSite(); browser = await h.loadChromium().launch(); });
test.after(async () => { if (browser) await browser.close(); if (site) await site.close(); });

async function open(width, { motion = true, lang, init = [], route = 'friends', ua } = {}) {
  const ctx = await browser.newContext({ viewport: h.SIZES[width], reducedMotion: motion ? 'no-preference' : 'reduce', isMobile: width < 700, hasTouch: width < 700, ...(ua ? { userAgent: ua } : {}) });
  for (const f of init) await ctx.addInitScript(f);
  const page = await ctx.newPage();
  const errors = [], got = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  page.on('response', r => { if (r.status() >= 400 && !/\.local\.js(\?|$)/.test(r.url())) errors.push(`HTTP ${r.status()} ${r.url()}`); });
  page.on('request', r => { if (IS3D(r.url())) got.push(r.url().replace(/^.*?\/\/[^/]+\//, '')); });
  await page.goto(`${site.base}?nostamp${lang ? '&lang=' + lang : ''}&fresh=${Date.now()}#${route}`, { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('#view') && document.querySelector('#view').children.length > 0);
  await page.waitForTimeout(400);
  return { ctx, page, errors, got };
}
const toStage = page => page.evaluate(() => document.querySelector('#friends-3d .f3d-stage').scrollIntoView({ block: 'center' }));
const ready = page => page.waitForFunction(() => { const s = window.FFFriends3D.state(); return s.loaded || s.error; }, null, { timeout: 45000 });
const vstate = page => page.evaluate(() => window.FFFriends3D.viewer() && window.FFFriends3D.viewer().state());

test('Home never loads 3D: a full scroll of Home on a phone fetches no engine, no three.js and no model', async () => {
  const { ctx, page, errors, got } = await open(390, { route: 'home' });
  const H2 = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= H2; y += 400) { await page.evaluate(y => scrollTo(0, y), y); await page.waitForTimeout(40); }
  await page.waitForTimeout(800);
  assert.deepEqual(got, []);
  assert.equal(await page.evaluate(() => document.querySelectorAll('#view canvas.ff3d-canvas').length), 0);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('the band sits right under the four friend cards and above the friends\' videos; nothing 3D is fetched until it comes near (phone)', async () => {
  const { ctx, page, errors, got } = await open(390);
  const order = await page.evaluate(() => { const s = [...document.querySelectorAll('#view section')]; const i = s.findIndex(x => x.id === 'friends-3d'); return [s[i - 1] && !!s[i - 1].querySelector('.friend'), s[i + 1] && s[i + 1].id]; });
  assert.deepEqual(order, [true, 'friends-videos']);
  assert.deepEqual(got, [], 'nothing before the stage is near');
  assert.equal(await page.evaluate(() => document.querySelector('.f3d-stage').dataset.state), 'poster');
  await toStage(page); await ready(page);
  assert.equal(await page.evaluate(() => window.FFFriends3D.state().error), '');
  const models = got.filter(u => /models\/friends\//.test(u)).map(u => u.split('?')[0]);
  assert.deepEqual(models, ['models/friends/booker.glb'], 'one friend only (low tier: no fur map)');
  assert.ok(got.some(u => /vendor\/three-0\.170\.0\/three\.module\.min\.js/.test(u)));
  // picking Zuri loads Zuri, and only then
  await page.click('[data-f3d-friend="zuri"]');
  await page.waitForFunction(() => window.FFFriends3D.viewer().state().key === 'zuri' && document.querySelector('.f3d-stage').dataset.state === 'ready', null, { timeout: 30000 });
  assert.ok(got.some(u => /models\/friends\/zuri\.glb/.test(u)));
  assert.ok(!got.some(u => /lumi\.glb|bop\.glb/.test(u)));
  assert.equal(await page.evaluate(() => document.querySelector('.f3d-cap').textContent), 'Zuri the turtle in 3D: glasses, a felt hat, a compass patch and a shell.');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('data saver: nothing loads until the visitor taps "Show Booker in 3D"', async () => {
  const { ctx, page, errors, got } = await open(1280, { init: [() => { Object.defineProperty(navigator, 'connection', { value: { saveData: true }, configurable: true }); }] });
  await toStage(page); await page.waitForTimeout(800);
  assert.deepEqual(got, []);
  const btn = page.locator('[data-f3d="load"]');
  assert.equal(await btn.isVisible(), true);
  assert.equal((await btn.textContent()).trim(), 'Show Booker in 3D');
  await btn.click(); await ready(page);
  assert.ok(got.some(u => /models\/friends\/booker\.glb/.test(u)));
  assert.equal(await btn.isVisible(), false);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('motions play from the buttons and from a tap on the friend, then return to the idle loop; the frame holds every motion', async () => {
  const { ctx, page, errors } = await open(1280);
  await toStage(page); await ready(page);
  let s = await vstate(page);
  assert.equal(s.tier, 'low', 'SwiftShader: the low tier');
  assert.equal(s.fur, false, 'plain PBR on the low tier');
  await page.waitForFunction(() => window.FFFriends3D.viewer().state().running, null, { timeout: 10000 });   // IntersectionObserver reports on a later frame
  s = await vstate(page);
  assert.equal(s.running, true, 'the idle loop runs on screen');
  const fit = await page.evaluate(() => window.FFFriends3D.viewer().stats().fit);
  assert.ok(fit.h > fit.restH * 1.1, `the frame holds the jumps (${fit.h} vs ${fit.restH})`);
  for (const m of ['wave', 'hop', 'jump', 'dance']) {
    await page.click(`[data-f3d-move="${m}"]`);
    s = await vstate(page);
    assert.equal(s.motion, m);
    await page.waitForFunction(() => document.querySelector('[data-f3d-live]').textContent.length > 0);
  }
  assert.equal(await page.evaluate(() => document.querySelector('[data-f3d-live]').textContent), 'Dancing.');
  await page.waitForFunction(() => window.FFFriends3D.viewer().state().motion === 'idle', null, { timeout: 20000 });
  // a tap on the friend (not a drag) plays the next motion
  const box = await page.locator('.f3d-gl').boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  assert.notEqual((await vstate(page)).motion, 'idle');
  // a drag spins and is not a tap
  const before = await page.evaluate(() => window.FFFriends3D.viewer().state().motion);
  await page.mouse.move(box.x + 100, box.y + 200); await page.mouse.down(); await page.mouse.move(box.x + 260, box.y + 205, { steps: 8 }); await page.mouse.up();
  assert.equal((await vstate(page)).motion, before);
  // keyboard: the motion buttons are real buttons
  await page.focus('[data-f3d-move="hop"]'); await page.keyboard.press('Enter');
  assert.equal((await vstate(page)).motion, 'hop');
  // the canvas really draws something
  const shot = (await page.locator('.f3d-stage').screenshot()).toString('base64');
  const drawn = await page.evaluate(async b64 => { const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode(); const t = document.createElement('canvas'); t.width = 120; t.height = 150; const g = t.getContext('2d'); g.drawImage(im, 0, 0, 120, 150); const d = g.getImageData(0, 0, 120, 150).data; const [r0, g0, b0] = [d[4 * 125], d[4 * 125 + 1], d[4 * 125 + 2]]; let n = 0; for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - r0) + Math.abs(d[i + 1] - g0) + Math.abs(d[i + 2] - b0) > 60) n++; return n; }, shot);
  assert.ok(drawn > 300, `the friend is drawn (${drawn} px)`);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('the Fur switch: aria-pressed follows, the engine switches shells on and off (manual wins over the tier)', async () => {
  const { ctx, page, errors } = await open(1280);
  await toStage(page); await ready(page);
  const fur = page.locator('[data-f3d="fur"]');
  assert.equal(await fur.getAttribute('aria-pressed'), 'false');
  await fur.click(); await page.waitForFunction(() => document.querySelector('[data-f3d="fur"]').getAttribute('aria-pressed') === 'true', null, { timeout: 20000 });
  let s = await vstate(page);
  assert.equal(s.fur, true); assert.equal(s.furMode, 'on'); assert.equal(s.shells, 8, 'a low-tier device switched on gets the lighter fur');
  assert.equal(await page.evaluate(() => document.querySelector('.f3d-stage').dataset.fur), 'on');
  await fur.click(); await page.waitForFunction(() => document.querySelector('[data-f3d="fur"]').getAttribute('aria-pressed') === 'false');
  s = await vstate(page);
  assert.equal(s.fur, false); assert.equal(s.furMode, 'off');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('frames stop off screen and on a hidden tab; leaving the route disposes the viewer', async () => {
  const { ctx, page, errors } = await open(1280);
  await toStage(page); await ready(page);
  const running = v => page.waitForFunction(v => window.FFFriends3D.viewer().state().running === v, v, { timeout: 10000 });
  await running(true);
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await running(false);   // off screen
  await toStage(page);
  await running(true);
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  assert.equal((await vstate(page)).running, false, 'hidden tab');
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.evaluate(() => { location.hash = '#pricing'; }); await page.waitForTimeout(600);
  assert.equal(await page.evaluate(() => document.querySelectorAll('canvas.ff3d-canvas').length), 0);
  assert.equal(await page.evaluate(() => window.FFFriends3D.viewer()), null);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('reduced motion and the Decorative motion switch: a still friend, no frame loop; a motion button shows a still pose', async () => {
  const { ctx, page, errors } = await open(1280, { motion: false });
  await toStage(page); await ready(page);
  assert.equal(await page.evaluate(() => document.querySelector('#friends-3d').dataset.f3d), 'still');
  let s = await vstate(page);
  assert.deepEqual([s.still, s.running], [true, false]);
  await page.click('[data-f3d-move="jump"]'); await page.waitForTimeout(300);
  s = await vstate(page);
  assert.deepEqual([s.motion, s.running], ['jump', false]);
  assert.equal(await page.evaluate(() => document.querySelector('[data-f3d-live]').textContent), 'A happy jump, as a still picture.');
  assert.equal(await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('#friends-3d')).length), 0);
  await ctx.close();
  // the site's switch, with the device allowing motion
  const b = await open(1280);
  await b.page.evaluate(() => { document.documentElement.dataset.motion = 'off'; window.render(); });
  await toStage(b.page); await ready(b.page);
  s = await vstate(b.page);
  assert.deepEqual([s.still, s.running], [true, false]);
  assert.deepEqual(errors.concat(b.errors), []);
  await b.ctx.close();
});

test('no WebGL: the official cut-out stays with a sentence, no model is fetched, no motion buttons, no errors', async () => {
  const noGL = () => { const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, ...a) { return /webgl/i.test(t) ? null : g.call(this, t, ...a); }; };
  const { ctx, page, errors, got } = await open(390, { init: [noGL] });
  await toStage(page); await ready(page);
  assert.equal(await page.evaluate(() => document.querySelector('.f3d-stage').dataset.state), 'flat');
  assert.ok(await page.locator('.f3d-poster').isVisible());
  assert.equal(await page.evaluate(() => document.querySelector('.f3d-poster').getAttribute('src')), 'img/cut_booker-440.webp');
  assert.ok(await page.locator('.f3d-flat').isVisible());
  assert.equal(await page.locator('.f3d-moves').isVisible(), false);
  assert.ok(!got.some(u => /models\/friends\//.test(u)), 'no model');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('AR: iPhone gets AR Quick Look (USDZ, an image as the only child), Android gets Scene Viewer (GLB), a desktop gets a note', async () => {
  const ios = await open(390, { ua: IPHONE });
  const a = await ios.page.evaluate(() => { const l = document.querySelector('#friends-3d a[rel="ar"]'); return l && { href: l.getAttribute('href'), kids: [...l.children].map(c => c.tagName), hidden: l.getAttribute('aria-hidden'), btn: document.querySelector('[data-f3d="ar"]').getAttribute('aria-label'), text: document.querySelector('[data-f3d="ar"]').textContent.trim() }; });
  assert.deepEqual(a, { href: 'models/friends/booker.usdz', kids: ['IMG'], hidden: 'true', btn: 'See Booker in your room (augmented reality)', text: 'See it in your room' });
  // the button clicks the AR link
  await ios.page.evaluate(() => { window.__ar = 0; document.querySelector('#friends-3d a[rel="ar"]').addEventListener('click', e => { e.preventDefault(); window.__ar++; }); });
  await ios.page.click('[data-f3d="ar"]');
  assert.equal(await ios.page.evaluate(() => window.__ar), 1);
  await ios.page.click('[data-f3d-friend="lumi"]');
  assert.equal(await ios.page.evaluate(() => document.querySelector('#friends-3d a[rel="ar"]').getAttribute('href')), 'models/friends/lumi.usdz');
  assert.deepEqual(ios.errors, []);
  await ios.ctx.close();
  const and = await open(390, { ua: ANDROID });
  const href = await and.page.evaluate(() => document.querySelector('#friends-3d [data-f3d-ar="android"]').getAttribute('href'));
  assert.match(href, /^intent:\/\/arvr\.google\.com\/scene-viewer\/1\.0\?file=/);
  assert.ok(href.includes(encodeURIComponent(site.base + 'models/friends/booker.glb')), href);
  assert.match(href, /mode=ar_preferred/);
  assert.match(href, /#Intent;scheme=https;package=com\.google\.ar\.core;action=android\.intent\.action\.VIEW;S\.browser_fallback_url=[^;]+;end;$/);
  assert.equal(await and.page.evaluate(() => document.querySelector('#friends-3d [data-f3d-ar="android"]').getAttribute('aria-label')), 'See Booker in your room (augmented reality)');
  await and.ctx.close();
  const desk = await open(1280);
  assert.equal(await desk.page.evaluate(() => document.querySelectorAll('#friends-3d a[rel="ar"], #friends-3d [data-f3d-ar]').length), 0);
  assert.match(await desk.page.evaluate(() => document.querySelector('.f3d-arnote').textContent), /iPhone, iPad or Android/);
  await desk.ctx.close();
});

test('accessibility: the canvas is hidden from assistive tech and the tab order; buttons are labelled; axe finds nothing serious', async () => {
  const { ctx, page, errors } = await open(1280);
  await toStage(page); await ready(page);
  const c = await page.evaluate(() => { const cv = document.querySelector('.ff3d-canvas'); return [cv.getAttribute('aria-hidden'), cv.getAttribute('tabindex'), document.querySelector('[data-f3d-live]').getAttribute('aria-live'), document.querySelector('.f3d-cap').textContent.length > 20]; });
  assert.deepEqual(c, ['true', '-1', 'polite', true]);
  const v = (await h.axe(page, { include: '#friends-3d' })).filter(x => h.BLOCKING.includes(x.impact));
  assert.deepEqual(v, []);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('Spanish: the band, the buttons and the caption are in Spanish (draft)', async () => {
  const { ctx, page, errors } = await open(1280, { lang: 'es' });
  await page.waitForTimeout(400);
  const t = await page.evaluate(() => ({ h: document.querySelector('#f3d-h').textContent, moves: [...document.querySelectorAll('.f3d-move')].map(b => b.textContent), cap: document.querySelector('.f3d-cap').textContent, fur: document.querySelector('[data-f3d="fur"]').textContent }));
  assert.deepEqual(t, { h: 'Conoce a los amigos en 3D', moves: ['Saludar', 'Brincar', 'Saltar', 'Bailar'], cap: 'Booker, el oso, en 3D: pelo café y rizado, una sudadera con un libro y una mochila.', fur: 'Pelito suave' });
  assert.deepEqual(errors, []);
  await ctx.close();
});
