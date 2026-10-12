// Motion system (motion audit 2026-10-12): one entrance reveal and one heading rise on the inner pages, one set of easing and
// duration tokens, one button feedback system (pressed on pointer-down), the tucked dock as a deliberate tab with a 44 px hit area,
// no Lenis, and the Watch/Academy GSAP plugins loaded only on those routes (deep links included).
// Static checks run in Node; behaviour runs in headless Chromium (tests/a11y-harness.mjs).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

// ------------------------------------------------------------------------------------------------ static
test('Lenis, Observer and Draggable are gone (files and every script tag); Flip, Inertia and MorphSVG are not loaded up front', () => {
  for (const f of ['vendor/lenis.min.js', 'vendor/Observer.min.js', 'vendor/Draggable.min.js']) assert.equal(fs.existsSync(path.join(ROOT, f)), false, f + ' still exists');
  const pages = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));
  assert.ok(pages.length > 50, 'prerendered pages found');
  for (const p of pages) {
    const h = read(p);
    assert.doesNotMatch(h, /vendor\/(lenis|Observer|Draggable)\.min\.js/, p + ' still loads a removed file');
    assert.doesNotMatch(h, /<script src="vendor\/(Flip|InertiaPlugin|MorphSVGPlugin)\.min\.js"/, p + ' loads a Watch/Academy-only plugin up front');
  }
  for (const f of ['vendor/Flip.min.js', 'vendor/InertiaPlugin.min.js', 'vendor/MorphSVGPlugin.min.js', 'vendor/SplitText.min.js']) assert.ok(fs.existsSync(path.join(ROOT, f)), f + ' kept (lazy or used)');
  assert.match(read('features.js'), /vendor\/Flip\.min\.js/);
  assert.doesNotMatch(read('views.js'), /Draggable|ffhMM|H, I, K choreography/, 'the orphaned Home choreography is removed');
});

test('one token set: CSS custom properties loaded first, mirrored in FFMotion for scripts and GSAP', () => {
  const t = read('ff-tokens.css');
  for (const k of ['--ff-ease-out', '--ff-ease-spring', '--ff-ease-inout', '--ff-ease-drawer', '--ff-dur-1', '--ff-dur-2', '--ff-dur-3', '--ff-dur-4']) assert.match(t, new RegExp(k + ':'), k);
  const idx = read('index.html');
  assert.ok(idx.indexOf('ff-tokens.css') < idx.indexOf('<style>') || idx.indexOf('ff-tokens.css') < idx.indexOf('premium.css'), 'tokens load before the site styles');
  const m = read('ff-motion.js');
  assert.match(m, /ease = Object\.freeze\(\{ out: 'cubic-bezier\(\.22,1,\.36,1\)', spring: 'cubic-bezier\(\.34,1\.56,\.64,1\)', inout: 'cubic-bezier\(\.65,0,\.35,1\)'/);
  assert.match(m, /gsap\.defaults\(/);
  assert.match(t, /--ff-ease-out:cubic-bezier\(\.22,1,\.36,1\)/);
});

test('form fields are at least 16px (no iPhone zoom on focus) and text sizes in the shell are relative', () => {
  const idx = read('index.html');
  assert.match(idx, /input\.i,select\.i,textarea\.i\{font:inherit;font-size:max\(1rem,1em\)/);
  assert.match(idx, /body\{[^}]*font-size:0?\.9375rem/);
});

// ------------------------------------------------------------------------------------------------ browser
let h, srv, browser;
test.before(async () => { h = await import('./a11y-harness.mjs'); srv = await h.startSite(); browser = await h.loadChromium().launch(); });
test.after(async () => { if (browser) await browser.close(); if (srv) await srv.close(); });

const CLS = () => { window.__cls = 0; try { new PerformanceObserver(l => l.getEntries().forEach(e => { if (!e.hadRecentInput) window.__cls += e.value; })).observe({ type: 'layout-shift', buffered: true }); } catch (_) { /* old */ } };
async function open(opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1440, height: 900 }, reducedMotion: opts.motion === false ? 'reduce' : 'no-preference', javaScriptEnabled: opts.js !== false, hasTouch: !!opts.touch, isMobile: !!opts.touch });
  await ctx.addInitScript(CLS);
  if (opts.lang) await ctx.addInitScript(l => { try { localStorage.setItem('ff-lang', l); } catch (_) {} }, opts.lang);
  if (opts.motionSwitchOff) await ctx.addInitScript(() => { try { localStorage.setItem('ff-display-preferences', JSON.stringify({ motion2: false })); } catch (_) {} });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  return { ctx, page, errors };
}
const scrollDown = async (page, to = 6000) => { for (let y = 0; y < to; y += 300) { await page.mouse.wheel(0, 300); await page.waitForTimeout(60); } await page.waitForTimeout(900); };

test('entrance reveal, motion on: below-the-fold blocks wait, then rise in once as they arrive; nothing on screen is hidden; CLS < 0.01', async () => {
  for (const route of ['for-families', 'centers', 'jobs', 'store']) {
    const { ctx, page, errors } = await open();
    await h.goto(page, srv.base, route, 1500);
    const s = await page.evaluate(() => {
      const vh = innerHeight, wait = [...document.querySelectorAll('[data-ffr=wait]')];
      return { on: document.documentElement.classList.contains('ffr-on'), wait: wait.length, onScreen: wait.filter(e => e.getBoundingClientRect().top < vh).length };
    });
    assert.equal(s.on, true, route + ': reveal is on');
    assert.ok(s.wait > 2, `${route}: blocks below the fold wait for their entrance (${s.wait})`);
    assert.equal(s.onScreen, 0, route + ': nothing on the first screen is hidden');
    await scrollDown(page, 7000);
    const after = await page.evaluate(() => ({ seenWaiting: [...document.querySelectorAll('[data-ffr=wait]')].filter(e => { const r = e.getBoundingClientRect(); return r.top < innerHeight * 0.8 && r.bottom > 0; }).length, cls: window.__cls }));
    assert.equal(after.seenWaiting, 0, route + ': every block on screen has arrived');
    assert.ok(after.cls < 0.01, `${route}: CLS ${after.cls.toFixed(4)} stays under 0.01`);
    assert.deepEqual(errors, []);
    await ctx.close();
  }
});

test('entrance reveal and heading rise, motion off (reduced motion, and the Decorative motion switch): nothing hidden, nothing split', async () => {
  for (const o of [{ motion: false }, { motionSwitchOff: true }]) {
    const { ctx, page } = await open(o);
    await h.goto(page, srv.base, 'for-families', 1200);
    const s = await page.evaluate(() => ({ on: document.documentElement.classList.contains('ffr-on'), ffr: document.querySelectorAll('[data-ffr]').length, split: document.querySelectorAll('.ffh-w,[data-ffh]').length,
      hidden: [...document.querySelectorAll('#view section *')].filter(e => getComputedStyle(e).opacity === '0' && e.getBoundingClientRect().height > 30 && e.textContent.trim().length > 20).length }));
    assert.equal(s.on, false, JSON.stringify(o));
    assert.equal(s.ffr, 0); assert.equal(s.split, 0); assert.equal(s.hidden, 0);
    await ctx.close();
  }
});

test('no JavaScript and print: every block shows', async () => {
  const { ctx, page } = await open({ js: false });
  await page.goto(srv.base + 'for-families.html');
  const n = await page.evaluate(() => ({ text: document.querySelector('#view').innerText.length, ffr: document.querySelectorAll('[data-ffr]').length }));
  assert.ok(n.text > 2000, 'the prerendered page text is there'); assert.equal(n.ffr, 0);
  await ctx.close();
  const b = await open();
  await h.goto(b.page, srv.base, 'for-families', 1200);
  await b.page.emulateMedia({ media: 'print' });
  const hidden = await b.page.evaluate(() => [...document.querySelectorAll('[data-ffr], .ffh-w')].filter(e => getComputedStyle(e).opacity !== '1').length);
  assert.equal(hidden, 0, 'print shows every waiting block and word');
  await b.ctx.close();
});

test('headings rise word by word (SplitText) and keep their accessible name, in English and in Spanish', async () => {
  for (const lang of ['en', 'es']) {
    const { ctx, page, errors } = await open({ lang });
    await h.goto(page, srv.base, 'for-families', 2200);
    await scrollDown(page, 4000);
    const r = await page.evaluate(() => [...document.querySelectorAll('h1[data-ffh], h2[data-ffh]')].map(h => ({ label: h.getAttribute('aria-label'), text: h.textContent.replace(/\s+/g, ' ').trim(), words: h.querySelectorAll('.ffh-w').length, hidden: [...h.querySelectorAll('.ffh-w')].every(w => w.getAttribute('aria-hidden') === 'true'), key: !!h.querySelector('.ffh-key') })));
    assert.ok(r.length >= 4, lang + ': headings are split');
    for (const x of r) {
      assert.equal(x.label, x.text, `${lang}: the heading is read as one phrase: "${x.text}"`);
      assert.ok(x.words >= 1 && x.hidden && x.key, lang + ': words are aria-hidden boxes with a stitched key word');
    }
    const name = await page.evaluate(() => document.querySelector('h1[data-ffh]') && document.querySelector('h1[data-ffh]').getAttribute('aria-label'));
    if (lang === 'es') assert.match(name, /casa/i, 'Spanish heading text'); else assert.match(name, /come home/i);
    assert.deepEqual(errors, []);
    await ctx.close();
  }
});

test('the language switch re-splits headings in the new language', async () => {
  const { ctx, page } = await open();
  await h.goto(page, srv.base, 'for-families', 1800);
  await page.evaluate(() => window.FFi18n.set('es'));
  await page.waitForTimeout(2500);
  const es = await page.evaluate(() => document.querySelector('h1[data-ffh]') && document.querySelector('h1[data-ffh]').getAttribute('aria-label'));
  assert.match(es || '', /casa/i);
  await page.evaluate(() => window.FFi18n.set('en'));
  await page.waitForTimeout(1500);
  const en = await page.evaluate(() => ({ label: document.querySelector('h1[data-ffh]') && document.querySelector('h1[data-ffh]').getAttribute('aria-label'), text: document.querySelector('#view h1').textContent.trim() }));
  assert.match(en.label || en.text, /come home/i);
  await ctx.close();
});

test('Home keeps its own motion: no reveal and no split there', async () => {
  const { ctx, page } = await open();
  await h.goto(page, srv.base, 'home', 2500);
  assert.deepEqual(await page.evaluate(() => [document.querySelectorAll('[data-ffr]').length, document.querySelectorAll('[data-ffh]').length, document.documentElement.classList.contains('ffr-on')]), [0, 0, false]);
  await ctx.close();
});

test('buttons: pressed the moment the pointer goes down (before release), on touch too; hover lifts only on a fine pointer', async () => {
  const { ctx, page } = await open({ viewport: { width: 390, height: 844 }, touch: true });
  await h.goto(page, srv.base, 'for-families', 1500);
  await page.evaluate(() => { const b = [...document.querySelectorAll('#view .btn, #view .px-btn')].find(e => e.getBoundingClientRect().width); if (b) { b.id = b.id || 'ffPressMe'; window.__pid = b.id; b.scrollIntoView({ block: 'center' }); } });
  await page.waitForTimeout(1200);
  const box = await page.evaluate(() => { const b = window.__pid && document.getElementById(window.__pid); if (!b) return null; const r = b.getBoundingClientRect(); return { id: b.id, x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  assert.ok(box, 'a button on screen');
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x, y: box.y }] });
  await page.waitForTimeout(60);
  const down = await page.evaluate(id => { const b = document.getElementById(id), cs = getComputedStyle(b); return { cls: b.classList.contains('is-pressed'), scale: cs.scale, filter: cs.filter }; }, box.id);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await page.waitForTimeout(120);
  const up = await page.evaluate(id => document.getElementById(id).classList.contains('is-pressed'), box.id);
  assert.equal(down.cls, true, 'pressed on touch-down');
  assert.ok(down.scale !== 'none' || down.filter !== 'none', 'the press is visible while the finger is down: ' + JSON.stringify(down));
  assert.equal(up, false, 'released when the touch ends');
  await ctx.close();

  const d = await open();
  await h.goto(d.page, srv.base, 'for-families', 1500);
  const sel = await d.page.evaluate(() => { const b = [...document.querySelectorAll('#view .btn.ghost, #view .btn.soft')].find(e => { const r = e.getBoundingClientRect(); return r.top > 120 && r.bottom < innerHeight && r.width; }); if (!b) return null; b.id = b.id || 'ffHoverMe'; return '#' + b.id; });
  if (sel) {
    const before = await d.page.evaluate(s => getComputedStyle(document.querySelector(s)).backgroundColor, sel);
    await d.page.hover(sel); await d.page.waitForTimeout(350);
    const after = await d.page.evaluate(s => ({ bg: getComputedStyle(document.querySelector(s)).backgroundColor, tr: getComputedStyle(document.querySelector(s)).translate }), sel);
    assert.notEqual(after.bg, before, 'outline buttons get a hover fill');
    assert.match(after.tr, /-2px/, 'and lift 2px');
  }
  await d.ctx.close();
});

test('the tucked dock is a deliberate tab with an invisible 44 px hit area; a tap on it brings the dock back', async () => {
  const { ctx, page } = await open({ viewport: { width: 390, height: 844 }, touch: true, motion: false });
  await ctx.addInitScript(() => { window.FF_SOUND_OFF = false; });
  await h.goto(page, srv.base, 'jobs', 1500);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await page.waitForTimeout(900);
  const s = await page.evaluate(() => {
    const tuck = document.documentElement.classList.contains('ff-dock-tuck');
    const btns = [...document.querySelectorAll('.ffs .ffs-btn:not([hidden]),.totop.on')];
    return { tuck, tabs: btns.map(b => { const r = b.getBoundingClientRect(), cs = getComputedStyle(b), hit = getComputedStyle(b, '::before');
      return { vis: Math.round(innerWidth - r.left), radius: cs.borderTopLeftRadius, rr: cs.borderTopRightRadius, hitW: parseFloat(hit.width), hitL: parseFloat(hit.left), hitAt: (() => { const e = document.elementFromPoint(innerWidth - 40, r.top + r.height / 2); return !!(e && e.closest('.ffs-btn,.totop')); })() }; }) };
  });
  assert.equal(s.tuck, true);
  for (const t of s.tabs) {
    assert.ok(t.vis >= 10 && t.vis <= 18, 'a small tab shows: ' + t.vis);
    assert.equal(t.rr, '0px', 'square on the screen edge'); assert.notEqual(t.radius, '0px', 'rounded on the inside edge');
    assert.ok(t.hitW >= 44, 'a 44 px hit area'); assert.equal(t.hitAt, true, 'a tap 40 px in from the edge still lands on the tab');
  }
  await page.mouse.click(386, (await page.evaluate(() => document.querySelector('.ffs .ffs-btn:not([hidden])').getBoundingClientRect().top + 20)));
  await page.waitForTimeout(400);
  assert.equal(await page.evaluate(() => document.documentElement.classList.contains('ff-dock-tuck')), false, 'the tap brings the dock back');
  const totop = await page.evaluate(() => { const r = document.querySelector('.totop').getBoundingClientRect(); return [r.width, r.height]; });
  assert.ok(totop[0] >= 44 && totop[1] >= 44, 'back to top is at least 44 px: ' + totop);
  await ctx.close();
});

test('Watch and Academy load Flip/Inertia(/MorphSVG) on demand; a deep link straight to Watch Episodes works; other routes never load them', async () => {
  const { ctx, page, errors } = await open();
  const loaded = [];
  page.on('request', r => { const m = /vendor\/(Flip|InertiaPlugin|MorphSVGPlugin)\.min\.js/.exec(r.url()); if (m) loaded.push(m[1]); });
  await h.goto(page, srv.base, 'for-families', 1200);
  assert.deepEqual(loaded, [], 'nothing on an inner page');
  await page.goto(srv.base + 'watch.html?fresh=' + Date.now());
  await page.waitForFunction(() => window.Flip && window.InertiaPlugin, null, { timeout: 15000 });
  await page.waitForTimeout(800);
  const w = await page.evaluate(() => ({ route: location.hash || location.pathname, eps: document.querySelectorAll('[data-ffx-ep]').length, morph: !!window.MorphSVGPlugin, lenis: typeof window.Lenis }));
  assert.ok(w.eps >= 10, 'the episode rail renders');
  assert.equal(w.morph, false, 'MorphSVG is Academy-only'); assert.equal(w.lenis, 'undefined');
  await page.click('[data-ffx-friend="bop"]'); await page.waitForTimeout(900);
  const shown = await page.evaluate(() => [...document.querySelectorAll('[data-ffx-ep]')].filter(c => getComputedStyle(c).display !== 'none' && c.getBoundingClientRect().width).map(c => c.dataset.ffxEp));
  assert.ok(shown.length > 0 && shown.every(k => k === 'bop'), 'the friend filter (Flip) still works: ' + shown.join(','));
  assert.deepEqual(errors, []);
  await ctx.close();
});
