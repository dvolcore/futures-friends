// Centers & Programs heroes (owner 2026-10-13, v3 batch: "characters big, at true room scale ... sitting in the chairs and using the
// furniture"; layout "picture full-width, text below"; centers-motion.js / centers-motion.css). Every scene page opens on its integrated
// picture as a full-width movie still with the page's words on a card below it, plus the signature moments. Real headless Chromium
// (tests/a11y-harness.mjs): the picture loads whole (never cropped), no character sits under the card, the Nature / Sound dock or off
// the hero at 1024, 1280, 1440 and 390; reduced motion and the Decorative motion switch show the final state; no console errors;
// English and Spanish alt text; 390 px has no sideways scroll.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const T = { timeout: 300000 };
const ROUTES = ['centers', 'for-centers', 'pricing', 'book-demo', 'quote', 'options', 'for-prek', 'for-employers', 'hub', 'membership',
  'founding-partners', 'training', 'start-center', 'readiness', 'why', 'for-home', 'for-faith'];
let h, site, browser;
test.before(async () => { h = await import('./a11y-harness.mjs'); site = await h.startSite(); browser = await h.loadChromium().launch(); }, T);
test.after(async () => { if (browser) await browser.close(); if (site) await site.close(); });

const DESK = { width: 1440, height: 900 }, PHONE = { width: 390, height: 844 };
async function open(route, { motion = 'on', viewport = DESK, lang = '', touch = false, settle = 600 } = {}) {
  const ctx = await browser.newContext({ viewport, reducedMotion: motion === 'reduce' ? 'reduce' : 'no-preference', ...(touch ? { isMobile: true, hasTouch: true } : {}) });
  if (motion === 'switch') await ctx.addInitScript(() => { try { localStorage.setItem('ff-display-preferences', JSON.stringify({ motion2: false })); } catch (_) { /* blocked */ } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto(`${site.base}?for=centers&${lang ? 'lang=' + lang + '&' : ''}fresh=${Date.now()}#${route}`);
  await page.waitForSelector('#view .cm-hero', { timeout: 120000 });
  await page.waitForTimeout(settle);
  return { ctx, page, errors };
}
// every running Web Animation on the hero's card, cut-outs and room
const running = page => page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('.cm-hero') && !(a instanceof CSSAnimation)).length);

// ---------------------------------------------------------------- files (no browser)
test('wiring: linked once, after the motion system; gated on FFMotion.allowed; sends and stores nothing; art never distorted', () => {
  const html = read('index.html');
  assert.equal((html.match(/href="centers-motion\.css\?v=\d+"/g) || []).length, 1);
  assert.equal((html.match(/src="centers-motion\.js\?v=\d+"/g) || []).length, 1);
  assert.ok(html.indexOf('centers-motion.js') > html.indexOf('ff-signatures.js') && html.indexOf('centers-motion.js') < html.indexOf('window.FFstart'), 'loaded after the views and before the first render');
  const js = read('centers-motion.js').replace(/\/\*[\s\S]*?\*\//g, ''), css = read('centers-motion.css').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(js, /M\(\)\.allowed\(ok\)/);
  assert.match(js, /FFhooks\.push\(setup\)/);
  assert.match(js, /live\.abort\(\)/);
  assert.doesNotMatch(js, /fetch\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|indexedDB|document\.cookie/);
  // every scene ships at 800 and 1600; the picture is drawn whole (contain), never cropped; the drift is at most 1.5%
  for (const r of ROUTES) for (const w of [800, 1600]) assert.ok(fs.existsSync(path.join(ROOT, `img/scenes/${r}-${w}.webp`)), `img/scenes/${r}-${w}.webp`);
  for (const w of [800, 1600]) assert.ok(fs.existsSync(path.join(ROOT, `img/room-planner/hero-planning-${w}.webp`)));
  assert.match(css, /figure\.cm-still>img\.cm-scene\{[^}]*object-fit:contain/);
  assert.match(css, /@keyframes cm-kb\{from\{scale:1;translate:0 0\}to\{scale:1\.015;/);
  assert.doesNotMatch(js + css, /skew|scaleX|scaleY|hue-rotate|grayscale|invert\(|sepia/, 'no cut-out is skewed, stretched or recoloured');
  assert.match(css, /prefers-reduced-motion:no-preference/);
  assert.match(css, /:root:not\(\[data-motion=off\]\)/);
  assert.match(css, /@media print/);
  // no invented prices: the count-up only rewrites the text already on the card, and always ends on it
  assert.match(js, /const done = \(\) => \{ el\.textContent = txt;/);
  // no pasted cut-outs or speech bubbles in a scene hero any more
  assert.doesNotMatch(js, /cm-bubble|cm-cast|data-cm-ch/);
  assert.doesNotMatch(js, /investor\//);
});

// ---------------------------------------------------------------- every scene page: the still, the card, nobody covered
for (const viewport of [{ width: 1024, height: 768 }, { width: 1280, height: 720 }, DESK, PHONE]) {
  test(`scene heroes at ${viewport.width}: the picture loads whole with English alt text; no character under the card, the dock or off the hero; the chip; no sideways scroll`, T, async () => {
    const { ctx, page, errors } = await open('hub', { viewport, touch: viewport === PHONE, motion: 'reduce' });
    for (const r of ROUTES) {
      await page.evaluate(r => { location.hash = '#' + r; scrollTo(0, 0); }, r);
      await page.waitForFunction(r => document.querySelector(`#view .cm-scenehero[data-cm-hero="${r}"][data-cm-align]`), r, { timeout: 30000 });
      await page.waitForFunction(() => { const i = document.querySelector('.cm-scene'); return i && i.complete && i.naturalWidth > 0; }, null, { timeout: 30000 });
      await page.waitForTimeout(150);
      const s = await page.evaluate(r => {
        const CM = window.FFCentersMotion, hero = document.querySelector('.cm-scenehero'), img = hero.querySelector('.cm-scene');
        const H = hero.getBoundingClientRect(), P = CM.drawn(null, hero.querySelector('.cm-still').getBoundingClientRect()), C = hero.querySelector('.cm-card').getBoundingClientRect();
        const dk = document.querySelector('.ffs'), D = dk && dk.getBoundingClientRect();
        const hit = (q, z) => !!z && z.width > 0 && q.r > z.left + 1 && q.l < z.right - 1 && q.b > z.top + 1 && q.t < z.bottom - 1;
        const bad = [];
        CM.SCENES[r].who.forEach(([x0, x1, y0, y1], i) => {
          const q = { l: P.left + x0 / 100 * P.width, r: P.left + x1 / 100 * P.width, t: P.top + y0 / 100 * P.height, b: P.top + y1 / 100 * P.height };
          if (hit(q, C)) bad.push(`#${i} under the card`);
          if (hit(q, D)) bad.push(`#${i} under the dock`);
          if (q.l < H.left - 1 || q.r > H.right + 1 || q.t < H.top - 1) bad.push(`#${i} off the hero`);
        });
        return { bad, alt: img.alt, fit: getComputedStyle(img).objectFit, wide: P.width <= innerWidth + 1, chip: (hero.querySelector('.cm-chip') || {}).textContent || '',
          cast: hero.querySelectorAll('.cm-ch, .cm-actor, .cm-bubble, .art').length, over: document.documentElement.scrollWidth - innerWidth, first: hero.firstElementChild.classList.contains('cm-still') };
      }, r);
      assert.deepEqual(s.bad, [], r);
      assert.match(s.alt, /^Storybook illustration: /, r);
      assert.equal(s.fit, 'contain', `${r}: the whole picture, never cropped`);
      assert.ok(s.wide && s.first, `${r}: the picture comes first, inside the window`);
      assert.match(s.chip, /Storybook illustration/);
      assert.equal(s.cast, 0, `${r}: no pasted cut-outs or bubbles`);
      assert.ok(s.over <= 0, `${r}: no sideways scroll (${s.over}px)`);
    }
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}

test('the card rises in under the still after the first paint, and a key press finishes it at once', T, async () => {
  const { ctx, page, errors } = await open('centers', { settle: 120 });
  assert.ok(await running(page) > 0, 'the entrance is playing');
  await page.keyboard.press('Shift');
  await page.waitForTimeout(80);
  assert.equal(await running(page), 0, 'every entrance animation finished at once');
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.cm-card')).opacity), '1');
  assert.deepEqual(errors, []);
  await ctx.close();
});

for (const motion of ['reduce', 'switch']) {
  test(`motion off (${motion}): the final frame at once on every page; zones lit, prices final, steps and cards shown`, T, async () => {
    const { ctx, page, errors } = await open('centers', { motion, settle: 100 });
    for (const r of ROUTES) {
      await page.evaluate(r => { location.hash = '#' + r; }, r);
      await page.waitForFunction(r => document.querySelector(`#view .cm-hero[data-cm-hero="${r}"]`), r, { timeout: 30000 });
      await page.waitForTimeout(120);
      const s = await page.evaluate(() => ({
        anims: document.getAnimations().filter(a => a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('.cm-hero, .cm-zones, .cm-tiers, .cm-steps, .cm-device, .ff-endorse')).length,
        drift: getComputedStyle(document.querySelector('.cm-scene')).animationName,
        live: !!document.querySelector('.cm-live, .cm-walk, .cm-pre, .cm-rise, .cm-chip-pre'),
        hidden: Array.from(document.querySelectorAll('.cm-scene, .cm-card, .cm-zone .cm-zonefr img, .pz-tier-card, .cm-steps li, .cm-device, .ffe-item')).filter(e => +getComputedStyle(e).opacity < 1).length
      }));
      assert.deepEqual(s, { anims: 0, drift: 'none', live: false, hidden: 0 }, r);
    }
    // the published prices are exactly as written
    await page.evaluate(() => { location.hash = '#pricing'; });
    await page.waitForSelector('.cm-tiers .pz-big .pz-amt');
    assert.deepEqual(await page.$$eval('.cm-tiers .pz-big .pz-amt', a => a.map(x => x.textContent)).then(v => v.slice(0, 2)), ['$1,495', '$89 a month']);
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}

// ---------------------------------------------------------------- signature moments
test('#pricing: the package cards turn in and their prices count up to exactly the published figures', T, async () => {
  const { ctx, page, errors } = await open('pricing');
  const before = await page.evaluate(() => Array.from(document.querySelectorAll('.cm-tiers .pz-big .pz-amt')).map(a => a.getAttribute('title') + '|' + a.textContent));
  await page.$eval('.cm-tiers', e => e.scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(450);
  const mid = await page.$$eval('.cm-tiers .pz-big .pz-amt', a => a.map(x => x.textContent));
  await page.waitForTimeout(2400);
  const after = await page.evaluate(() => Array.from(document.querySelectorAll('.cm-tiers .pz-big .pz-amt')).map(a => a.getAttribute('title') + '|' + a.textContent));
  assert.deepEqual(after, before, 'every price ends exactly as published');
  assert.notDeepEqual(mid, before.map(x => x.split('|')[1]), 'the prices were counting');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('#for-centers / #for-home / #for-faith / #for-prek: the four learning zones light up one by one, each with its friend and pillar', T, async () => {
  for (const r of ['for-centers', 'for-home', 'for-faith', 'for-prek']) {
    const { ctx, page, errors } = await open(r);
    assert.deepEqual(await page.$$eval('.cm-zones .cm-pillar', a => a.map(x => x.textContent)), ['LEARN', 'BELONG', 'EXPLORE', 'MOVE']);
    assert.equal(await page.$$eval('.cm-zones .cm-zone.is-lit', a => a.length), 0, 'not lit before it arrives');
    await page.$eval('.cm-zones', e => e.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(500);
    const some = await page.$$eval('.cm-zones .cm-zone.is-lit', a => a.length);
    await page.waitForTimeout(1600);
    assert.ok(some < 4, `one by one (${some} lit after 0.5 s)`);
    assert.equal(await page.$$eval('.cm-zones .cm-zone.is-lit', a => a.length), 4);
    assert.ok(await page.$$eval('.cm-zones .cm-zonefr img', a => a.every(i => i.complete && i.naturalWidth > 0 && getComputedStyle(i).objectFit === 'contain')));
    assert.deepEqual(errors, []);
    await ctx.close();
  }
});

test('#centers: the director day machine and the dashboard peek come early; the peek links to the director portal; the proof numbers count to their own values', T, async () => {
  const { ctx, page, errors } = await open('centers');
  const order = await page.evaluate(() => { const v = document.getElementById('view'), all = Array.from(v.querySelectorAll('section, .phero')); const at = sel => all.findIndex(e => e.matches(sel)); return { dash: at('.cm-dash'), progs: at('.aud-programs'), dm: all.findIndex(e => /dm|day-machine/.test(e.className)) }; });
  assert.ok(order.dash > 0 && order.dash < order.progs, 'the dashboard peek comes before the program cards');
  assert.ok(order.dm >= 0 && order.dm < order.dash, 'the director day machine leads into it');
  assert.match(await page.getAttribute('.cm-dash a.btn', 'href'), /portal-test\/c\/test-family-demo-center\/\?enter=director$/);
  await page.$eval('.cm-device', e => e.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(1200);
  assert.ok(await page.evaluate(() => document.querySelector('.cm-device').classList.contains('is-in') && !!document.querySelector('.cm-spot.is-on')), 'the highlight tours the panels');
  const want = await page.$$eval('[data-proof] [data-count]', a => a.map(x => x.dataset.count));
  await page.$eval('[data-proof]', e => e.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(2200);
  assert.deepEqual(await page.$$eval('[data-proof] [data-count]', a => a.map(x => x.textContent)), want);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('#book-demo steps are stitched in, and "Trusted by professionals" cards rise and get the gold stitch (words untouched)', T, async () => {
  const { ctx, page, errors } = await open('for-centers');
  const words = await page.$$eval('.ff-endorse .ffe-item blockquote', a => a.map(x => x.textContent));
  await page.$eval('.ff-endorse', e => e.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(1800);
  assert.ok(await page.$$eval('.ff-endorse .ffe-item', a => a.length && a.every(x => x.classList.contains('is-stitched') && getComputedStyle(x).opacity === '1')));
  assert.deepEqual(await page.$$eval('.ff-endorse .ffe-item blockquote', a => a.map(x => x.textContent)), words);
  await page.evaluate(() => { location.hash = '#book-demo'; });
  await page.waitForSelector('.cm-steps');
  await page.$eval('.cm-steps', e => e.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(1500);
  assert.equal(await page.$$eval('.cm-steps > li.is-in', a => a.length), 3);
  assert.deepEqual(errors, []);
  await ctx.close();
});

// ---------------------------------------------------------------- grounding: feet on the floor of each backdrop (owner: "floating on the gate")
// ---------------------------------------------------------------- Spanish
test('Spanish: the chip, the pillars and the dashboard peek are in Spanish; no sideways scroll at 390', T, async () => {
  const { ctx, page, errors } = await open('centers', { lang: 'es', viewport: PHONE, touch: true, settle: 1500 });
  await page.waitForFunction(() => /Ilustración de cuento/.test((document.querySelector('.cm-chip') || {}).textContent || ''), null, { timeout: 20000 });
  assert.match(await page.textContent('.cm-chip'), /Personajes del mundo del cuento/);
  assert.match(await page.textContent('.cm-dash a.btn'), /Prueba el portal de dirección/);
  assert.match(await page.getAttribute('.cm-scene', 'alt'), /^Ilustración de cuento: /);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 0);
  await page.evaluate(() => { location.hash = '#for-centers'; });
  await page.waitForSelector('.cm-zones .cm-pillar');
  await page.waitForTimeout(800);
  assert.deepEqual(await page.$$eval('.cm-zones .cm-pillar', a => a.map(x => x.textContent)), ['APRENDE', 'PERTENECE', 'EXPLORA', 'MUÉVETE']);
  assert.deepEqual(errors, []);
  await ctx.close();
});

// ---------------------------------------------------------------- layout shift and axe
for (const r of ['centers', 'pricing']) {
  test(`no layout shift on #${r} with motion on (CLS < 0.01) and axe clean (serious/critical) on the hero`, T, async () => {
    const ctx = await browser.newContext({ viewport: DESK });
    await ctx.addInitScript(() => { window.__cls = 0; try { new PerformanceObserver(l => l.getEntries().forEach(e => { if (!e.hadRecentInput) window.__cls += e.value; })).observe({ type: 'layout-shift', buffered: true }); } catch (_) { /* old */ } });
    const page = await ctx.newPage();
    await page.goto(`${site.base}?for=centers&fresh=${Date.now()}#${r}`);
    await page.waitForSelector('.cm-hero');
    await page.waitForTimeout(2800);
    const cls = await page.evaluate(() => window.__cls);
    assert.ok(cls < 0.01, `CLS ${cls}`);
    const v = await h.axe(page, { include: '.cm-hero' });
    const bad = v.filter(x => h.BLOCKING.includes(x.impact));
    assert.deepEqual(bad.map(x => x.id + ': ' + x.nodes.slice(0, 2).map(n => n.target).join(' ')), []);
    await ctx.close();
  });
}
