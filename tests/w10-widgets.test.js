// Wave 10 WIDGETS (owner 2026-10-07, on the six-step learning-loop grid: "this is not very interactive, they're just flat — they
// should be glassed out, they should have widgets, they should be more interactive"). The #unit-1 grid becomes a liquid-glass tablist
// with a live stage per step (loop-widget.js/.css); five more flat grids get the same glass with light interactivity (w10-glass.*).
// No-browser checks first (wiring, words, data, honesty), then real headless Chromium at 1280 and 390 px.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const H = () => import('./a11y-harness.mjs');
const NAMES = ['whoosh', 'cloud-puff', 'letter-pop', 'logo-land', 'hop', 'land', 'chime', 'sparkle', 'wink', 'squish', 'rain', 'tap', 'page-turn', 'card-flip', 'badge', 'footstep', 'wave', 'firefly', 'night-chime'];
const LOOP = JSON.parse(read('views.js').match(/const FFH_LOOP = (\[[\s\S]*?\]\]);/)[1].replace(/'/g, '"'));
const SWEEP = [['whole-child', 'ol.wc-steps'], ['for-centers', 'ul.wc-six'], ['for-families', 'section.band-paper .grid.g3'], ['teacher-standard', 'ul.ts-ask'], ['pricing', 'ul.pz-nofees']];

// the widget's markup, rendered in a VM with the real data files
function vmWidget() {
  const ctx = vm.createContext({ window: {}, document: { addEventListener() {} }, location: { hash: '#unit-1' }, matchMedia: () => ({ matches: false }) });
  for (const f of ['plush-cast.js', 'captions.js', 'family-library-data.js']) vm.runInContext(read(f), ctx);
  vm.runInContext(`var V = {}; var FFH_LOOP = ${JSON.stringify(LOOP)}; var FFH_ZONES = ${read('views.js').match(/const FFH_ZONES = (\{[\s\S]*?\}\});/)[1]};`, ctx);
  vm.runInContext(read('talk-cards.js'), ctx);
  vm.runInContext(read('loop-widget.js'), ctx);
  return ctx;
}

// ---------------------------------------------------------------- no browser
test('wiring: the widget and sweep files load after unit-1.js and before not-found/analytics, cache-busted; unit-1.js bumped', () => {
  const html = read('index.html'), at = s => html.indexOf(s);
  for (const f of ['loop-widget.css', 'w10-glass.css']) assert.match(html, new RegExp(`href="${f.replace('.', '\\.')}\\?v=\\d+"`), f);
  for (const f of ['loop-widget.js', 'w10-glass.js']) assert.match(html, new RegExp(`src="${f.replace('.', '\\.')}\\?v=\\d+"`), f);
  assert.ok(+html.match(/unit-1\.js\?v=(\d+)/)[1] >= 6, 'unit-1.js cache-busted');
  assert.ok(at('src="unit-1.js') < at('src="loop-widget.js') && at('src="loop-widget.js') < at('src="w10-glass.js') && at('src="w10-glass.js') < at('src="not-found.js') && at('src="not-found.js') < at('src="analytics.js'), 'script order');
  assert.ok(at('src="brand-art.js') < at('src="views.js'), 'brand-art before views');
  assert.ok(at('href="unit-1.css') < at('href="loop-widget.css'), 'widget styles after the unit-1 styles');
  assert.match(read('unit-1.js'), /window\.FFLoopWidget \? window\.FFLoopWidget\.html\(loop\) : `<ol class="u1s-steps">/, 'the plain grid stays as the fallback');
});

test('every word of the six step titles and descriptions is kept, numbered 1 to 6, as tabs with a plush friend each', () => {
  const W = vmWidget().window.FFLoopWidget;
  const html = W.html(LOOP);
  assert.equal(LOOP.length, 6);
  LOOP.forEach(([n, d], i) => {
    assert.ok(html.includes(`<span class="lw-num" aria-hidden="true">${i + 1}</span>`), `number ${i + 1}`);
    assert.ok(html.includes(`<b>${n}</b><small>${d}</small>`), `words of step ${i + 1}: ${n}`);
    assert.match(html, new RegExp(`role="tab" class="lw-tile[^"]*" id="lw-tab-${i}" data-lw-step="${i}" aria-selected="${i ? 'false' : 'true'}" aria-controls="lw-panel" tabindex="${i ? -1 : 0}"`));
  });
  assert.match(html, /<ol class="u1s-steps lw-tiles" role="tablist" aria-label="The six steps of a day">/);
  assert.match(html, /id="lw-panel" role="tabpanel" aria-labelledby="lw-tab-0"/);
  assert.match(html, /<p class="lw-where" aria-live="polite" aria-atomic="true">Step <b data-lw-n>1<\/b> of 6/);
  const P = vmWidget().window.FFPlush;
  for (const k of W.PLUSH) assert.ok(P.has(k), `plush ${k} exists`);
  assert.equal((html.match(/data-plush=/g) || []).length, 7, 'six tile friends + the walker');
});

test('each step renders its real content from the site data (talk cards, family library, zones, captions)', () => {
  const C = vmWidget(), W = C.window.FFLoopWidget, T = C.window.FFTalk, F = C.window.FFFamily;
  W.html(LOOP);
  const b = i => W.body(i);
  // Watch: the four friends' talking intro, poster only, labelled story-world animation, transcript
  assert.match(b(0), /data-lw-play="watch"/); assert.match(b(0), /video\/ff-intro-titled-16x9-poster\.webp/); assert.ok(!/<video/.test(b(0)), 'no video element before play');
  assert.match(b(0), /Story-world animation, not an episode/); assert.match(b(0), /episodes are in development/); assert.match(b(0), /Read the transcript/);
  // Talk: the "after" question, the lesson and the feeling word of the first public talk card
  const t = T.SLATE[0];
  assert.ok(b(1).includes(t.after) && b(1).includes(t.lesson) && b(1).includes(t.feel[0]), 'talk card text');
  assert.match(b(1), /data-lw-flip aria-pressed="false"/); assert.match(b(1), /The episode is in development/); assert.match(b(1), new RegExp(`href="#talk/${t.code}"`));
  // Do: Ice Detectives from the free family library, every step tickable, a see-more link
  const a = F.ACTS.find(x => x.id === W.DO_ID);
  assert.ok(a && b(2).includes(a.t));
  a.steps.forEach((s, j) => assert.ok(b(2).includes(`data-lw-do="${j}" aria-pressed="false"`) && b(2).includes(s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')), `step ${j}`));
  assert.match(b(2), /href="#activities\/ice-detectives"/);
  // Move: Bop's activity clip (act-*.mp4) present on disk with captions, else the Move Along video; link to #bop-at-home
  const acts = fs.readdirSync(path.join(ROOT, 'video')).filter(f => /^act-.*\.mp4$/.test(f));
  if (acts.length) assert.ok(acts.map(f => `video/${f}`).includes(W.MOVES[0].mp4), `Move plays a Bop activity clip (${W.MOVES[0].mp4})`); else assert.equal(W.MOVES[0].mp4, 'video/bop-move-along.mp4');
  assert.equal(W.MOVES[W.MOVES.length - 1].mp4, 'video/bop-move-along.mp4', 'the Move Along video is the fallback');
  for (const m of W.MOVES) { assert.ok(fs.existsSync(path.join(ROOT, m.mp4)) && fs.existsSync(path.join(ROOT, m.poster)), m.mp4); assert.ok(C.window.FFCaptions.has(m.mp4), `${m.mp4} has captions`); }
  assert.ok(C.window.FFCaptions.has(W.WATCH.mp4));
  assert.match(b(3), /href="#bop-at-home"/); assert.match(b(3), /Story-world animation/);
  // Explore: the four zones as buttons, the zone's own words
  for (const [k, z] of [['booker', 'Reading Area'], ['lumi', 'Calm Corner'], ['zuri', 'Discovery Zone'], ['bop', 'Movement Zone']]) assert.match(b(4), new RegExp(`data-lw-zone="${k}" aria-pressed="(true|false)"[^>]*>[\\s\\S]*?<span>${z}</span>`));
  assert.match(b(4), /story-world map of the zones, not a floor plan/);
  // Take home: public material only (the talk card's question and home activity), link to #at-home
  assert.ok(b(5).includes(t.home), 'the public home activity'); assert.match(b(5), /href="#at-home"/);
  assert.match(b(5), /Enrolled families get each week’s take-home activities in the Family Portal/);
});

test('honesty and gating: no Unit 1 family weeks, no downloads, no autoplay, sound only through ff:sfx contract names', () => {
  const src = read('loop-widget.js'), code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.ok(!/FFUnit1Family|unit1-family|\.pdf|download/.test(code), 'gated family material and downloads stay out');
  assert.ok(!/autoplay|\.muted\s*=\s*false/.test(code), 'no autoplay anywhere');
  assert.match(code, /preload="metadata"/); assert.match(code, /controls playsinline/);
  const used = [...code.matchAll(/sfx\((?:all \? )?'([a-z-]+)'(?: : '([a-z-]+)')?/g)].flatMap(m => [m[1], m[2]]).filter(Boolean);
  const more = [...code.matchAll(/'(chime|tap|badge|card-flip|page-turn|sparkle)'/g)].map(m => m[1]);
  assert.ok(used.length + more.length > 0);
  for (const n of [...used, ...more]) assert.ok(NAMES.includes(n), `ff:sfx name "${n}" is in the contract`);
  assert.match(code, /new CustomEvent\('ff:sfx', \{ detail: \{ name, x \} \}\)/);
});

test('glass fallbacks and reduced motion are written in CSS for both the widget and the sweep', () => {
  for (const f of ['loop-widget.css', 'w10-glass.css']) {
    const css = read(f);
    assert.match(css, /@supports not \(\(backdrop-filter:blur\(1px\)\) or \(-webkit-backdrop-filter:blur\(1px\)\)\)/, f + ' no-blur fallback');
    assert.match(css, /@media \(prefers-reduced-transparency:reduce\)/, f + ' reduced transparency');
    assert.match(css, /:root\.ffg-solid/, f + ' solid switch');
    assert.match(css, /@media \(prefers-reduced-motion:reduce\)/, f + ' reduced motion');
    assert.match(css, /prefers-color-scheme:dark/, f + ' dark theme');
    assert.ok(!/transition:all|transition: all/.test(css), f + ': exact transition properties');
  }
});

// ---------------------------------------------------------------- real browser
let h, site, browser;
test.before(async () => { h = await H(); site = await h.startSite(); browser = await h.loadChromium().launch(); });
test.after(async () => { if (browser) await browser.close(); if (site) await site.close(); });
const PHONE = { isMobile: true, hasTouch: true };
const ctxFor = (width, motion, extra = {}) => browser.newContext({ viewport: h.SIZES[width], reducedMotion: motion ? 'no-preference' : 'reduce', ...(width === 390 ? PHONE : {}), ...extra });
async function openUnit(width, motion = true, extra = {}) {
  const ctx = await ctxFor(width, motion, extra), page = await ctx.newPage(), errors = [], media = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (/\.(mp4|webm)(\?|$)/.test(r.url())) media.push(r.url()); });
  await h.goto(page, site.base, 'unit-1');
  await page.waitForSelector('.lw [role="tablist"]');
  return { ctx, page, errors, media };
}
const state = page => page.evaluate(() => ({
  sel: [...document.querySelectorAll('.lw [role="tab"]')].map(t => t.getAttribute('aria-selected')),
  tabi: [...document.querySelectorAll('.lw [role="tab"]')].map(t => t.tabIndex),
  focus: document.activeElement && document.activeElement.id,
  label: document.querySelector('.lw [role="tabpanel"]').getAttribute('aria-labelledby'),
  where: document.querySelector('.lw-where').textContent.replace(/\s+/g, ' ').trim()
}));

test('keyboard and ARIA: arrows, Home and End move selection and focus; one tab stop; panel and live text follow', async () => {
  for (const width of [1280, 390]) {
    const { ctx, page, errors } = await openUnit(width);
    await page.focus('#lw-tab-0');
    await page.keyboard.press('ArrowRight');
    let s = await state(page);
    assert.deepEqual(s.sel, ['false', 'true', 'false', 'false', 'false', 'false'], `${width}: ArrowRight selects Talk`);
    assert.deepEqual(s.tabi, [-1, 0, -1, -1, -1, -1], `${width}: roving tabindex`);
    assert.equal(s.focus, 'lw-tab-1'); assert.equal(s.label, 'lw-tab-1'); assert.equal(s.where, 'Step 2 of 6: Talk');
    await page.keyboard.press('End'); s = await state(page); assert.equal(s.focus, 'lw-tab-5'); assert.equal(s.where, 'Step 6 of 6: Take home');
    await page.keyboard.press('ArrowDown'); s = await state(page); assert.equal(s.focus, 'lw-tab-5', 'no wrap past the end');
    await page.keyboard.press('Home'); s = await state(page); assert.equal(s.focus, 'lw-tab-0');
    await page.keyboard.press('ArrowLeft'); s = await state(page); assert.equal(s.focus, 'lw-tab-0', 'no wrap before the start');
    // Tab leaves the tablist into the panel's first control
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.closest('[role="tabpanel"]') !== null), true, `${width}: Tab goes into the panel`);
    // Next / Back walk the day, the path fills
    await page.click('[data-lw-nav="1"]'); await page.click('[data-lw-nav="1"]');
    s = await state(page); assert.equal(s.where, 'Step 3 of 6: Do');
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.lw')).getPropertyValue('--lw-p').trim()), '0.4');
    assert.equal(await page.locator('.lw-tile.is-done').count(), 2, 'earlier steps are marked done');
    assert.match(await page.textContent('[data-lw-nav="-1"]'), /Back: Talk/);
    await page.click('[data-lw-nav="-1"]'); s = await state(page); assert.equal(s.where, 'Step 2 of 6: Talk');
    for (let i = 0; i < 4; i++) await page.click('[data-lw-nav="1"]');
    assert.match(await page.textContent('[data-lw-nav="1"]'), /Tomorrow: Watch again/);
    await page.click('[data-lw-nav="1"]'); s = await state(page); assert.equal(s.where, 'Step 1 of 6: Watch', 'the day starts again');
    assert.equal(await page.isDisabled('[data-lw-nav="-1"]'), true);
    assert.deepEqual(errors, []);
    await ctx.close();
  }
});

test('the widgets work for real: flip, cycle, tick, map; sound ticks go out as ff:sfx', async () => {
  const { ctx, page, errors } = await openUnit(1280);
  await page.evaluate(() => { window.__sfx = []; document.addEventListener('ff:sfx', e => window.__sfx.push(e.detail.name)); });
  await page.click('#lw-tab-1');
  const front = await page.textContent('.lw-front .lw-q');
  await page.click('[data-lw-flip]');
  assert.equal(await page.getAttribute('[data-lw-flip]', 'aria-pressed'), 'true');
  assert.equal(await page.getAttribute('.lw-front', 'aria-hidden'), 'true'); assert.equal(await page.getAttribute('.lw-back', 'aria-hidden'), null);
  await page.click('[data-lw-talknext]');
  assert.notEqual(await page.textContent('.lw-front .lw-q'), front, 'the next question');
  assert.match(await page.textContent('[data-lw-talknext]'), /2 of 4/);
  await page.click('#lw-tab-2');
  const n = await page.locator('[data-lw-do]').count();
  for (let j = 0; j < n; j++) await page.click(`[data-lw-do="${j}"]`);
  assert.equal(await page.locator('[data-lw-do][aria-pressed="true"]').count(), n);
  assert.match(await page.textContent('[data-lw-donenote]'), /All done/);
  await page.click('#lw-tab-4');
  await page.click('[data-lw-zone="bop"]');
  assert.equal(await page.getAttribute('[data-lw-zone="bop"]', 'aria-pressed'), 'true');
  assert.match(await page.textContent('.lw-w-explore h3'), /Bop’s Movement Zone/);
  await page.click('#lw-tab-5');
  assert.match(await page.textContent('.lw-card'), /Ask at dinner/);
  const sfx = await page.evaluate(() => window.__sfx);
  for (const x of ['tap', 'card-flip', 'page-turn', 'badge', 'sparkle', 'chime']) assert.ok(sfx.includes(x), `ff:sfx ${x}`);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('videos are lazy and never autoplay: nothing requested until play; then native controls and captions, no autoplay', async () => {
  for (const width of [1280, 390]) {
    const { ctx, page, errors, media } = await openUnit(width);
    await page.click('#lw-tab-3'); await page.click('#lw-tab-0');
    await page.waitForTimeout(400);
    assert.equal(await page.locator('.lw video').count(), 0, 'no <video> until the visitor presses play');
    assert.deepEqual(media, [], `${width}: no video bytes requested before play`);
    await page.click('[data-lw-play="watch"]');
    const v = await page.evaluate(() => { const x = document.querySelector('.lw video'); const t = x.querySelector('track');
      return { autoplay: x.hasAttribute('autoplay'), controls: x.controls, preload: x.getAttribute('preload'), track: t && t.default && t.kind, src: t && t.getAttribute('src') }; });
    assert.deepEqual(v, { autoplay: false, controls: true, preload: 'metadata', track: 'captions', src: 'video/ff-intro-titled.en.vtt' });
    // leaving the step removes the player
    await page.click('#lw-tab-3');
    assert.equal(await page.locator('.lw video').count(), 0);
    await page.click('[data-lw-play="move"]');
    assert.match(await page.evaluate(() => document.querySelector('.lw video source[type="video/mp4"]').getAttribute('src')), /^video\/(act-.*|bop-move-along)\.mp4$/);
    assert.equal(await page.evaluate(() => document.querySelector('.lw video').hasAttribute('autoplay')), false);
    assert.deepEqual(errors, []);
    await ctx.close();
  }
  // and the page never autoplays any video with sound on #unit-1 (cold load, scrolled through)
  const { ctx, page } = await openUnit(1280);
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); } });
  assert.equal(await page.evaluate(() => [...document.querySelectorAll('video')].some(v => !v.paused && !v.muted)), false);
  await ctx.close();
});

// WCAG relative luminance contrast
const lum = ([r, g, b]) => { const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const over = (fg, a, bg) => fg.map((c, i) => c * a + bg[i] * (1 - a));
test('AA contrast on the glass: every text colour on the pane, composited over the darkest backdrop, in all three glass states', async () => {
  // the darkest colour that can sit behind the panes: the sky's deepest blue (#1565C0, darker than any pixel of sky-afternoon-800) or a friend-colour glow
  const BACKS = [[21, 101, 192], [217, 72, 139], [46, 158, 87], [123, 87, 200]];
  for (const scheme of ['light', 'dark']) {
    const ctx = await ctxFor(1280, true, { colorScheme: scheme }), page = await ctx.newPage();
    await h.goto(page, site.base, 'unit-1'); await page.waitForSelector('.lw');
    for (const solid of [false, true]) {
      if (solid) await page.evaluate(() => document.documentElement.classList.add('ffg-solid'));
      const rows = await page.evaluate(() => {
        const rgb = s => { const n = (s.match(/[\d.]+/g) || []).map(Number); return /^color\(srgb/.test(s) ? n.map((v, i) => (i < 3 ? v * 255 : v)) : n; };
        const pane = el => { const cs = getComputedStyle(el); const c = rgb(cs.backgroundColor); return { c: c.slice(0, 3), a: c.length > 3 ? c[3] : 1, blur: cs.backdropFilter !== 'none' }; };
        const out = [];
        for (const el of document.querySelectorAll('.lw-tile, .lw-stage')) {
          const p = pane(el);
          for (const t of el.querySelectorAll('b, small, .lw-where, .lw-kick, .lw-note, .lw-meta, .lw-copy p, .lw-copy h3, .lw-link')) {
            if (t.closest('.lw-media') || !t.offsetWidth) continue;
            out.push({ who: (t.className || t.tagName) + ' in ' + el.className.split(' ')[0], fg: rgb(getComputedStyle(t).color).slice(0, 3), pane: p });
          }
        }
        return out;
      });
      // gap fill 2026-10-07: a closed transcript's paragraphs no longer have a layout box (home-calm.css), so they are not counted here
      assert.ok(rows.length > 15, 'text measured');
      for (const r of rows) for (const back of BACKS) {
        const bg = over(r.pane.c, r.pane.a, back), cr = ratio(r.fg, bg);
        assert.ok(cr >= 4.5, `${scheme}${solid ? ' solid' : ''}: ${r.who} ${cr.toFixed(2)}:1 over rgb(${back})`);
      }
      if (solid) assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.lw-tile')).backdropFilter), 'none', 'solid fallback drops the blur');
    }
    await ctx.close();
  }
  // the sweep grids keep AA on their glass too
  const ctx = await ctxFor(1280, true), page = await ctx.newPage();
  for (const [route, sel] of SWEEP) {
    await h.goto(page, site.base, route); await page.waitForSelector(`${sel}.w10g`);
    const rows = await page.evaluate(sel => { const rgb = s => { const n = (s.match(/[\d.]+/g) || []).map(Number); return /^color\(srgb/.test(s) ? n.map((v, i) => (i < 3 ? v * 255 : v)) : n; }, out = [];
      for (const el of document.querySelectorAll(`${sel} .w10g-tile`)) { const c = rgb(getComputedStyle(el).backgroundColor);
        for (const t of el.querySelectorAll('p, span, small, h3, b')) { if (!t.offsetWidth || t.closest('.wc-node, .wc-owner, .badge, .tag, b[style], .wc-six b')) continue; const tb = rgb(getComputedStyle(t).backgroundColor); if (tb.length > 3 ? tb[3] > 0 : true) continue;
          out.push({ who: t.tagName + '.' + t.className, fg: rgb(getComputedStyle(t).color).slice(0, 3), c: c.slice(0, 3), a: c.length > 3 ? c[3] : 1 }); } }
      return out; }, sel);
    assert.ok(rows.length > 3, `${route}: text measured`);
    for (const r of rows) for (const back of [[21, 101, 192], [217, 72, 139]]) { const cr = ratio(r.fg, over(r.c, r.a, back)); assert.ok(cr >= 4.5, `${route} ${r.who} ${cr.toFixed(2)}:1`); }
  }
  await ctx.close();
});

test('reduced motion: a composed still state that still works (no transitions on the path, walker, tiles; flip is a crossfade)', async () => {
  const { ctx, page, errors } = await openUnit(390, false);
  const d = await page.evaluate(() => ['.lw-walker', '.lw-pathfill', '.lw-tile'].map(s => getComputedStyle(document.querySelector(s)).transitionDuration));
  for (const x of d) assert.match(x, /^0s(, 0s)*$/);
  await page.click('[data-lw-nav="1"]');
  assert.equal((await state(page)).where, 'Step 2 of 6: Talk');
  await page.click('[data-lw-flip]');
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.lw-back')).transform), 'none', 'no 3D flip');
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.lw-back')).opacity), '1');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('budgets: no layout shift on cold loads of #unit-1 and the sweep routes (CLS < 0.01), and the sweep never resizes a tile', async () => {
  const out = [];
  for (const width of [1280, 390]) for (const route of ['unit-1', ...SWEEP.map(s => s[0])]) {
    let best = 1;
    for (let attempt = 0; attempt < 2 && best >= 0.01; attempt++) {
      const ctx = await ctxFor(width, true), page = await ctx.newPage();
      await page.addInitScript(() => { window.__cls = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); });
      await h.goto(page, site.base, route, 1500);
      best = Math.min(best, await page.evaluate(() => window.__cls));
      await ctx.close();
    }
    if (best >= 0.01) out.push(`${route} @${width}: CLS ${best.toFixed(4)}`);
  }
  assert.deepEqual(out, []);
  // the glass changes no box: the same rects with and without the class
  const ctx = await ctxFor(1280, false), page = await ctx.newPage();
  for (const [route, sel] of SWEEP) {
    await h.goto(page, site.base, route); await page.waitForSelector(`${sel}.w10g`);
    const diff = await page.evaluate(sel => { const g = document.querySelector(sel), tiles = [...g.querySelectorAll('.w10g-tile')];
      const rects = () => tiles.map(t => { const r = t.getBoundingClientRect(); return [r.width, r.height].map(Math.round).join('x'); });
      const a = rects(); g.classList.remove('w10g'); tiles.forEach(t => t.classList.remove('w10g-tile')); const b = rects(); return { a, b, n: tiles.length }; }, sel);
    assert.ok(diff.n >= 3, `${route}: ${diff.n} tiles`);
    assert.deepEqual(diff.a, diff.b, `${route}: tile sizes unchanged`);
  }
  await ctx.close();
});

test('axe clean: #unit-1 with every step open (1280 and 390), and the five glassed grids', async () => {
  for (const width of [1280, 390]) {
    const { ctx, page } = await openUnit(width);
    for (let i = 0; i < 6; i++) {
      await page.click(`#lw-tab-${i}`); await page.waitForTimeout(300);
      if (i === 1) await page.click('[data-lw-flip]');
      const v = (await h.axe(page, { include: '.u1s-day' })).filter(x => h.BLOCKING.includes(x.impact) || ['color-contrast', 'aria-required-children', 'aria-required-parent', 'nested-interactive', 'button-name'].includes(x.id));
      assert.deepEqual(v, [], `${width} step ${i + 1}: ${JSON.stringify(v)}`);
    }
    await ctx.close();
  }
  const ctx = await ctxFor(1280, true), page = await ctx.newPage();
  for (const [route, sel] of SWEEP) {
    await h.goto(page, site.base, route); await page.waitForSelector(`${sel}.w10g`);
    const v = (await h.axe(page, { include: sel })).filter(x => h.BLOCKING.includes(x.impact) || x.id === 'color-contrast');
    assert.deepEqual(v, [], `${route}: ${JSON.stringify(v)}`);
  }
  await ctx.close();
});

test('the sweep: exactly the five grids get the glass, on their own routes; the specular follows a fine pointer; the day lights up', async () => {
  const ctx = await ctxFor(1280, true), page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  for (const [route, sel] of SWEEP) {
    await h.goto(page, site.base, route); await page.waitForSelector(`${sel}.w10g`);
    assert.equal(await page.locator('.w10g').count(), 1, `${route}: one glassed grid`);
    assert.ok(await page.locator(`${sel} .w10g-tile`).count() >= 3);
  }
  await h.goto(page, site.base, 'whole-child'); await page.waitForSelector('ol.wc-steps.w10g');
  const third = page.locator('ol.wc-steps .w10g-tile').nth(2);
  await third.scrollIntoViewIfNeeded(); await third.hover(); await page.mouse.move(...await third.boundingBox().then(b => [b.x + b.width * 0.8, b.y + 30]));
  await page.waitForTimeout(150);
  assert.equal(await page.locator('ol.wc-steps .w10-lit').count(), 3, 'pointing at step 3 lights steps 1 to 3');
  assert.match(await third.evaluate(el => el.style.getPropertyValue('--gx')), /%$/, 'the specular follows the pointer');
  await h.goto(page, site.base, 'curriculum');
  assert.equal(await page.locator('.w10g').count(), 0, 'other routes untouched');
  assert.deepEqual(errors, []);
  await ctx.close();
});
