// Signature moments (motion audit 2026-10-12, SIG1 to SIG4; ff-signatures.js / ff-signatures.css): Bounce Cards on #for-families,
// Tilted Card + Glare Hover on the #friends book covers, Spotlight Card on the #watch episode cards, Card Swap on the #store hero.
// Each effect is present with motion on and completely absent with reduced motion or the site's Decorative motion switch off.
// Real headless Chromium (tests/a11y-harness.mjs). The machine running these can be slow: generous timeouts.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const T = { timeout: 300000 };
let h, site, browser;
test.before(async () => { h = await import('./a11y-harness.mjs'); site = await h.startSite(); browser = await h.loadChromium().launch(); }, T);
test.after(async () => { if (browser) await browser.close(); if (site) await site.close(); });

const DESK = { width: 1440, height: 900 }, PHONE = { width: 390, height: 844 };
// motion: 'on' | 'reduce' | 'switch' (the Decorative motion switch off, device motion allowed)
async function open(route, { motion = 'on', viewport = DESK, lang = '', touch = false, settle = 900 } = {}) {
  const ctx = await browser.newContext({ viewport, reducedMotion: motion === 'reduce' ? 'reduce' : 'no-preference', ...(touch ? { isMobile: true, hasTouch: true } : {}) });
  if (motion === 'switch') await ctx.addInitScript(() => { try { localStorage.setItem('ff-display-preferences', JSON.stringify({ motion2: false })); } catch (_) { /* blocked */ } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${site.base}?${lang ? 'lang=' + lang + '&' : ''}fresh=${Date.now()}#${route}`);
  await page.waitForFunction(() => document.querySelector('#view') && document.querySelector('#view').children.length > 0, null, { timeout: 120000 });
  await page.waitForTimeout(settle);
  return { ctx, page, errors };
}
const center = async (page, sel) => { await page.$eval(sel, e => e.scrollIntoView({ block: 'center' })); await page.waitForTimeout(400); };

// ---------------------------------------------------------------- files (no browser)
test('wiring: the two files are linked once; the code is gated on FFMotion.allowed, sends and stores nothing, never filters art', () => {
  const html = read('index.html');
  assert.equal((html.match(/href="ff-signatures\.css\?v=\d+"/g) || []).length, 1);
  assert.equal((html.match(/src="ff-signatures\.js\?v=\d+"/g) || []).length, 1);
  const js = read('ff-signatures.js').replace(/\/\*[\s\S]*?\*\//g, ''), css = read('ff-signatures.css').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(js, /M\(\)\.allowed\(ok\)/, 'one gate for every effect');
  assert.match(js, /FFhooks\.push\(setup\)/);
  assert.match(js, /live\.abort\(\)/, 'the last render\'s scope is aborted');
  assert.doesNotMatch(js, /fetch\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|indexedDB|document\.cookie/);
  assert.doesNotMatch(css + js, /skew|scaleX|scaleY|hue-rotate|saturate\(|grayscale|invert\(|sepia/, 'art is never skewed, stretched or recoloured');
  assert.match(css, /@media print/);
  assert.match(css, /prefers-reduced-motion:no-preference/);
  assert.match(css, /:root:not\(\[data-motion=off\]\)/);
  assert.match(css, /object-fit:contain/);
  for (const m of js.matchAll(/\[(-?[\d.]+), (-?[\d.]+), (-?[\d.]+), ([\d.]+)\]/g)) assert.ok(Math.abs(+m[3]) < 8, 'stack rotation under 8 deg');
});

// ---------------------------------------------------------------- present with motion on
test('SIG1 Bounce Cards (#for-families): the Try one tonight cards drop in and settle once, then lift 4 px on hover', T, async () => {
  const { ctx, page, errors } = await open('for-families');
  const grid = '.fj-provider.fj-family .fj-famgrid';
  assert.equal(await page.$eval(grid, g => g.classList.contains('ffsig-bounce') && g.getAttribute('data-ff-reveal')), 'off');
  await center(page, grid);
  await page.waitForFunction(g => document.querySelector(g).classList.contains('is-settled'), grid, { timeout: 60000 });
  const s = await page.$eval(grid, g => [...g.children].map(c => { const cs = getComputedStyle(c); return { op: cs.opacity, tr: cs.transform, pre: c.classList.contains('ffsig-pre') }; }));
  assert.ok(s.length >= 1);
  for (const c of s) { assert.equal(c.op, '1'); assert.equal(c.tr, 'none'); assert.equal(c.pre, false); }
  const card = await page.$(grid + ' > article.fj-act');
  const b = await card.boundingBox();
  await page.mouse.move(b.x + 30, b.y + 30);
  await page.waitForTimeout(500);
  assert.equal(await card.evaluate(c => getComputedStyle(c).translate), '0px -4px');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('SIG2 Tilted Card + Glare (#friends): covers tilt up to 6 deg toward a fine pointer, with an aria-hidden glare; flat on leave', T, async () => {
  const { ctx, page, errors } = await open('friends');
  const sel = 'figure.card a.cover-art';
  assert.ok(await page.$$eval(sel, as => as.length >= 4 && as.every(a => a.classList.contains('ffsig-tilt') && a.querySelector(':scope > .ffsig-glare[aria-hidden="true"]'))));
  await center(page, sel);
  const a = await page.$(sel), b = await a.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.move(b.x + b.width - 2, b.y + 2, { steps: 5 });
  await page.waitForTimeout(300);
  const tr = await a.evaluate(e => e.style.transform);
  const m = /rotateX\((-?[\d.]+)deg\) rotateY\((-?[\d.]+)deg\)/.exec(tr);
  assert.ok(m, tr);
  assert.ok(+m[1] > 3 && +m[1] <= 6 && +m[2] > 3 && +m[2] <= 6, tr);
  assert.ok(+(await a.evaluate(e => getComputedStyle(e.querySelector('.ffsig-glare')).opacity)) > 0, 'glare shows on hover');
  assert.equal(await a.evaluate(e => e.querySelector('img').style.transform + getComputedStyle(e.querySelector('img')).filter), 'none', 'the cover image itself is untouched');
  await page.mouse.move(2, 2);
  await page.waitForTimeout(500);
  assert.equal(await a.evaluate(e => e.style.transform), '');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('SIG3 Spotlight Card (#watch): a glow in the friend\'s colour follows the pointer; Bop\'s is purple; keyboard focus lights it centred', T, async () => {
  const { ctx, page, errors } = await open('watch');
  const bop = '#ffx-eps [data-ffx-ep="bop"]';
  assert.ok(await page.$$eval('#ffx-eps .ffx-mcard[data-ffx-ep]', cs => cs.length >= 4 && cs.every(c => c.classList.contains('ffsig-spot'))));
  await center(page, bop);
  const card = await page.$(bop), b = await card.boundingBox();
  await page.mouse.move(b.x + 40, b.y + b.height - 60, { steps: 4 });
  await page.waitForTimeout(600);
  const g = await card.evaluate(c => ({ mx: c.style.getPropertyValue('--mx'), op: getComputedStyle(c, '::before').opacity, bg: getComputedStyle(c, '::before').backgroundImage, c: getComputedStyle(c).getPropertyValue('--c').trim() }));
  assert.ok(Math.abs(parseFloat(g.mx) - 40) <= 12, 'the glow sits under the pointer: ' + g.mx);   // GSAP may scale the card a little
  assert.equal(g.op, '1');
  assert.match(g.c, /^#8236ae$/i, 'Bop resolves to PURPLE #8236AE');
  // the glow's colour: Bop's purple (rgb 130 54 174 = srgb .51 .21 .68) mixed toward transparent
  assert.match(g.bg, /radial-gradient/);
  assert.match(g.bg, /rgba?\(130, 54, 174|0\.50?9\d* 0\.21\d* 0\.68\d*|#8236ae/i, g.bg);
  // keyboard: the glow is not mouse-only
  await page.mouse.move(2, 2);
  await page.waitForTimeout(500);
  assert.equal(await card.evaluate(c => getComputedStyle(c, '::before').opacity), '0');
  await page.keyboard.press('Shift');
  await card.evaluate(c => c.querySelector('button').focus());
  await page.waitForTimeout(500);
  const k = await card.evaluate(c => ({ fv: !!c.querySelector(':focus-visible'), op: getComputedStyle(c, '::before').opacity, mx: getComputedStyle(c, '::before').getPropertyValue('--mx').trim() }));
  assert.ok(k.fv);
  assert.equal(k.op, '1');
  assert.equal(k.mx, '50%');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('SIG4 Card Swap (#store): a stack of equal cards with a Pause control; the front card goes to the back every ~5 s', T, async () => {
  const { ctx, page, errors } = await open('store');
  const st = await page.$eval('.h3-stage', s => ({ stack: s.classList.contains('ffsig-stack'), rv: s.getAttribute('data-ff-reveal'), btn: !!s.querySelector(':scope > button.ffsig-pause'),
    sizes: [...s.querySelectorAll('.h3-tile')].map(t => t.offsetWidth + 'x' + t.offsetHeight), front: [...s.querySelectorAll('.h3-tile')].findIndex(t => t.hasAttribute('data-ffsig-front')),
    caps: [...s.querySelectorAll('.h3-tile')].map(t => getComputedStyle(t.querySelector('.h3-cap')).visibility) }));
  assert.ok(st.stack && st.btn);
  assert.equal(st.rv, 'off');
  assert.equal(new Set(st.sizes).size, 1, 'equal-size cards: ' + st.sizes);
  assert.equal(st.front, 0);
  assert.deepEqual(st.caps.map(v => v === 'visible'), st.caps.map((_, i) => i === 0), 'only the front card\'s caption shows');
  await page.mouse.move(2, 2);
  await page.waitForFunction(() => { const f = document.querySelector('.h3-tile[data-ffsig-front]'); return f && !f.matches('.h3-tile:first-of-type'); }, null, { timeout: 30000 });
  // hovering pauses it
  const front = await page.$eval('.h3-tile[data-ffsig-front]', t => t.className);
  const b = await (await page.$('.h3-tile[data-ffsig-front]')).boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.waitForTimeout(7000);
  assert.equal(await page.$eval('.h3-tile[data-ffsig-front]', t => t.className), front, 'paused on hover');
  assert.deepEqual(errors, []);
  await ctx.close();
});

// ---------------------------------------------------------------- absent with motion off (reduced motion, and the Decorative motion switch)
for (const motion of ['reduce', 'switch']) {
  test(`motion off (${motion}): no bounce, tilt, glow or stack: every page is exactly as before`, T, async () => {
    for (const route of ['for-families', 'friends', 'watch', 'store']) {
      const { ctx, page, errors } = await open(route, { motion });
      const r = await page.evaluate(() => ({
        cls: document.querySelectorAll('.ffsig-bounce,.ffsig-pre,.ffsig-tilt,.ffsig-glare,.ffsig-spot,.ffsig-stack,.ffsig-pause').length,
        vars: [...document.querySelectorAll('.h3-tile')].filter(t => t.style.getPropertyValue('--ffsig-x')).length,
        tr: [...document.querySelectorAll('a.cover-art')].filter(a => a.style.transform).length,
        motion: document.documentElement.dataset.motion }));
      assert.deepEqual({ cls: r.cls, vars: r.vars, tr: r.tr }, { cls: 0, vars: 0, tr: 0 }, route);
      if (motion === 'switch') assert.equal(r.motion, 'off');
      assert.deepEqual(errors, [], route);
      await ctx.close();
    }
  });
}

// ---------------------------------------------------------------- Card Swap: keyboard, labels, uncropped products
for (const viewport of [DESK, PHONE]) {
  test(`Card Swap keyboard (${viewport.width}px): Tab reaches every tile in DOM order, the focused tile comes to the front, the Pause control works by keyboard`, T, async () => {
    const { ctx, page, errors } = await open('store', { viewport, touch: viewport === PHONE });
    const n = await page.$$eval('.h3-stage > a.h3-tile', ts => ts.length);
    assert.ok(n >= 2);
    await page.$eval('.h3 .h3-second', a => a.focus());
    for (let i = 0; i < n; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(900);
      const f = await page.evaluate(i => {
        const a = document.activeElement, ts = [...document.querySelectorAll('.h3-stage > a.h3-tile')];
        const r = a.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        const zs = ts.map(t => +getComputedStyle(t).zIndex);
        return { idx: ts.indexOf(a), front: a.hasAttribute('data-ffsig-front'), top: Math.max(...zs) === +getComputedStyle(a).zIndex, hit: !!(hit && a.contains(hit)), name: a.getAttribute('aria-label') };
      }, i);
      assert.equal(f.idx, i, 'DOM order');
      assert.ok(f.front && f.top && f.hit, `tile ${i} is at the front and not covered: ${JSON.stringify(f)}`);
      assert.ok(f.name);
    }
    await page.keyboard.press('Tab');
    const btn = await page.evaluate(() => ({ cls: document.activeElement.className, name: document.activeElement.textContent.trim() }));
    assert.equal(btn.cls, 'ffsig-pause');
    assert.equal(btn.name, 'Pause the shuffle');
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), 'Play the shuffle');
    assert.ok(await page.$eval('.h3-stage', s => s.classList.contains('is-paused')));
    await page.keyboard.press('Space');
    assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), 'Pause the shuffle');
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}

test('Card Swap in Spanish: the Pause control has a Spanish accessible name', T, async () => {
  const { ctx, page } = await open('store', { lang: 'es' });
  assert.equal(await page.$eval('.ffsig-pause', b => b.textContent.trim()), 'Pausar el cambio');
  await page.$eval('.ffsig-pause', b => b.click());
  assert.equal(await page.$eval('.ffsig-pause', b => b.textContent.trim()), 'Reanudar el cambio');
  await ctx.close();
});

for (const viewport of [DESK, PHONE]) {
  test(`Card Swap never crops a product (${viewport.width}px): object-fit contain and the whole picture inside the card, in every stack position`, T, async () => {
    const { ctx, page } = await open('store', { viewport, touch: viewport === PHONE });
    await page.click('.ffsig-pause');   // hold still while measuring
    const n = await page.$$eval('.h3-stage > a.h3-tile', ts => ts.length);
    for (let k = 0; k < n; k++) {
      await page.$eval(`.h3-stage > a.h3-tile:nth-of-type(${k + 1})`, t => t.focus());
      await page.waitForTimeout(900);
      const bad = await page.evaluate(() => {
        const out = [], hero = document.querySelector('.h3').getBoundingClientRect();
        document.querySelectorAll('.h3-stage > a.h3-tile').forEach((t, i) => {
          const img = t.querySelector('.h3-pic .sp-img'), pic = t.querySelector('.h3-pic');
          if (!img || !img.complete || !img.naturalWidth) { out.push(i + ': image not loaded'); return; }
          const cs = getComputedStyle(img);
          if (cs.objectFit !== 'contain') out.push(i + ': object-fit ' + cs.objectFit);
          // the drawn picture (contain, inside the padding) must fit the image's content box, which must fit the clipping pic box
          const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight), padv = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
          const cw = img.clientWidth - pad, ch = img.clientHeight - padv, s = Math.min(cw / img.naturalWidth, ch / img.naturalHeight);
          if (img.naturalWidth * s > cw + .5 || img.naturalHeight * s > ch + .5 || s <= 0) out.push(i + ': drawn picture larger than its box');
          if (img.offsetWidth > pic.clientWidth + 1 || img.offsetHeight > pic.clientHeight + 1) out.push(i + ': image box larger than the card');
          const r = t.getBoundingClientRect();
          if (r.left < hero.left - 1 || r.right > hero.right + 1 || r.top < hero.top - 1 || r.bottom > hero.bottom + 1) out.push(i + ': card leaves the hero');
        });
        return out;
      });
      assert.deepEqual(bad, [], `front = tile ${k}`);
    }
    await ctx.close();
  });
}

// ---------------------------------------------------------------- no layout shift, print, axe
for (const route of ['for-families', 'friends', 'watch', 'store']) {
  test(`no layout shift on #${route} with motion on (CLS < 0.01)`, T, async () => {
    const ctx = await browser.newContext({ viewport: DESK, reducedMotion: 'no-preference' });
    await ctx.addInitScript(() => { window.__cls = 0; try { new PerformanceObserver(l => l.getEntries().forEach(e => { if (!e.hadRecentInput) window.__cls += e.value; })).observe({ type: 'layout-shift', buffered: true }); } catch (_) { /* no API */ } });
    const page = await ctx.newPage();
    await page.goto(`${site.base}?fresh=${Date.now()}#${route}`);
    await page.waitForFunction(() => document.querySelector('#view') && document.querySelector('#view').children.length > 0, null, { timeout: 120000 });
    await page.waitForTimeout(1500);
    const sel = { 'for-families': '.fj-famgrid', friends: 'a.cover-art', watch: '#ffx-eps', store: '.h3-stage' }[route];
    await page.$eval(sel, e => e.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(2500);
    const cls = await page.evaluate(() => window.__cls);
    assert.ok(cls < 0.01, `CLS ${cls}`);
    await ctx.close();
  });
}

test('print: the bounce never hides the cards and no control or overlay prints', T, async () => {
  const { ctx, page } = await open('for-families');
  await page.emulateMedia({ media: 'print' });
  assert.ok(await page.$$eval('.fj-famgrid > *', cs => cs.every(c => getComputedStyle(c).opacity === '1')));
  await ctx.close();
  const s = await open('store');
  await s.page.emulateMedia({ media: 'print' });
  assert.equal(await s.page.$eval('.ffsig-pause', b => getComputedStyle(b).display), 'none');
  await s.ctx.close();
});

test('axe stays clean (serious/critical) on the store hero and the episode library with motion on', T, async () => {
  for (const [route, inc] of [['store', '.h3'], ['watch', '#ffx-eps'], ['friends', '#view'], ['for-families', '.fj-family']]) {
    const { ctx, page } = await open(route);
    const v = (await h.axe(page, { include: inc })).filter(x => h.BLOCKING.includes(x.impact));
    assert.deepEqual(v, [], route + ' ' + JSON.stringify(v));
    await ctx.close();
  }
});
