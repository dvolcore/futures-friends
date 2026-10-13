// Centers & Programs motion (owner 2026-10-12: the centers side "is not matching the rest ... needs motion graphics, animations, and
// just all the characters"; centers-motion.js / centers-motion.css). Every page of the Centers nav (#centers, #for-centers, #for-home,
// #for-faith, #pricing, #book-demo) opens on a full-bleed story-world hero with a grown-up of the cast and the friends, plus one signature
// moment per page. Real headless Chromium (tests/a11y-harness.mjs): the entrance plays and can be skipped; reduced motion and the
// Decorative motion switch show the final state; no console errors; every cut-out loads and stands whole inside the hero; Spanish; 390 px
// has no sideways scroll; the gate's "Enter for centers & programs" never shows the Families Home first (tests/first-visit.test.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const T = { timeout: 300000 };
const ROUTES = ['centers', 'for-centers', 'for-home', 'for-faith', 'pricing', 'book-demo'];
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
  // the one stored thing: the reception plays once per visit (sessionStorage 'ff-cm-reception', this tab only)
  assert.deepEqual([...js.matchAll(/sessionStorage\.\w+Item\('([\w-]+)'/g)].map(m => m[1]), ['ff-cm-reception', 'ff-cm-reception']);
  assert.doesNotMatch(js, /fetch\(|XMLHttpRequest|sendBeacon|localStorage|indexedDB|document\.cookie/);
  assert.doesNotMatch(js + css, /skew|scaleX|scaleY|hue-rotate|grayscale|invert\(|sepia/, 'no cut-out is skewed, stretched or recoloured');
  assert.match(css, /\.cm-ch img\{[^}]*object-fit:contain[^}]*filter:none/);
  assert.match(css, /prefers-reduced-motion:no-preference/);
  assert.match(css, /:root:not\(\[data-motion=off\]\)/);
  assert.match(css, /@media print/);
  // no invented prices: the count-up only rewrites the text already on the card, and always ends on it
  assert.match(js, /const done = \(\) => \{ el\.textContent = txt;/);
  // the official cut-outs only, from the plush library
  assert.match(js, /P\.img\(k, \{ alt: '', h: hpx, eager: true \}\)/);
  assert.doesNotMatch(js, /investor\//);
});

// ---------------------------------------------------------------- every page: the world, the cast, the chip
for (const viewport of [{ width: 1024, height: 768 }, { width: 1280, height: 720 }, DESK, PHONE]) {
  test(`all six Centers pages at ${viewport.width}: a full-bleed world, a grown-up and the friends, whole and loaded; one honesty chip; no sideways scroll; no errors`, T, async () => {
    const { ctx, page, errors } = await open('centers', { viewport, touch: viewport === PHONE });
    for (const r of ROUTES) {
      await page.evaluate(r => { location.hash = '#' + r; }, r);
      await page.waitForFunction(r => document.querySelector(`#view .cm-hero[data-cm-hero="${r}"]`), r, { timeout: 30000 });
      await page.evaluate(() => scrollTo(0, 0));
      await page.waitForTimeout(2600);
      await page.waitForFunction(() => Array.from(document.querySelectorAll('.cm-hero img')).filter(i => i.getAttribute('src') && i.loading !== 'lazy' && !i.hidden).every(i => i.complete && i.naturalWidth > 0), null, { timeout: 30000 });
      const s = await page.evaluate(() => {
        scrollTo(0, 0);
        const hero = document.querySelector('.cm-hero'), hb = hero.getBoundingClientRect(), art = hero.querySelector('.cm-art').getBoundingClientRect();
        const room = hero.querySelector('.cm-room').getBoundingClientRect();
        const dockEl = document.querySelector('.ffs'), dk = dockEl && dockEl.getBoundingClientRect().width ? dockEl.getBoundingClientRect() : null;
        const cardR = hero.querySelector('.cm-card').getBoundingClientRect();
        const chars = Array.from(hero.querySelectorAll('.cm-ch, .cm-actor')).filter(c => c.getBoundingClientRect().width > 0).map(c => { const i = c.querySelector('img'), b = i.getBoundingClientRect(), actor = c.classList.contains('cm-actor'); return { k: c.dataset.cmCh || c.dataset.actor, actor, card: !(b.right <= cardR.left || b.left >= cardR.right || b.bottom <= cardR.top || b.top >= cardR.bottom), dock: !!dk && !(b.right <= dk.left || b.left >= dk.right || b.bottom + scrollY <= dk.top + scrollY || b.top >= dk.bottom), feet: hb.bottom - b.bottom, ok: i.complete && i.naturalWidth > 0, inArt: actor || b.left >= art.left - 1 && b.right <= art.right + 1 && b.top >= art.top - 1 && b.bottom <= art.bottom + 1, inHero: b.left >= hb.left && b.right <= hb.right && b.top >= hb.top && b.bottom <= hb.bottom, fit: getComputedStyle(i).objectFit, ar: Math.abs(b.width / b.height - i.naturalWidth / i.naturalHeight) }; });
        return { full: room.width >= innerWidth - 2 && Math.abs(hb.left) < 1, chars, chip: (hero.querySelector('.cm-chip') || {}).textContent || '', flags: hero.querySelectorAll('.ffa-flag').length, over: document.documentElement.scrollWidth - innerWidth, card: !!hero.querySelector('.cm-card h1') };
      });
      assert.ok(s.full, `${r}: the world runs edge to edge`);
      assert.ok(s.card, `${r}: the heading sits on the frosted card`);
      assert.ok(s.chars.length >= 2, `${r}: a grown-up and friends`);
      if (r === 'book-demo') assert.deepEqual(s.chars.filter(c => c.actor).map(c => c.k).sort(), ['mara', 'rowan'], 'the reception: Mara and Rowan');
      else assert.match(s.chars[0].k, /principal-hazel|ms-june|ms-fern|mr-moss/, `${r}: a grown-up of the cast leads`);
      for (const c of s.chars) {
        assert.ok(c.ok, `${r}: ${c.k} loaded`);
        assert.ok(c.inArt && c.inHero, `${r}: ${c.k} stands whole inside the hero (never cropped)`);
        assert.ok(!c.card, `${r}: ${c.k} never overlaps the text card`);
        assert.equal(c.fit, 'contain', `${r}: ${c.k} is never stretched`);
        if (c.k !== 'mara') assert.ok(c.feet >= 8, `${r}: ${c.k} has its feet on the ground inside the hero, with a margin (${c.feet}px)`);
        assert.ok(!c.dock, `${r}: the Nature / Sound dock never covers ${c.k}`);
      }
      assert.match(s.chip, /Storybook illustration/);
      assert.match(s.chip, /Story-world characters/);
      assert.equal(s.flags, 0, `${r}: one small chip, no big overlay`);
      assert.ok(s.over <= 0, `${r}: no sideways scroll (${s.over}px)`);
    }
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}

// ---------------------------------------------------------------- the entrance plays, and any input finishes it
test('the hero entrance plays (the cast hops in after the first paint) and a key press skips it to the final frame', T, async () => {
  const { ctx, page, errors } = await open('centers', { settle: 150 });
  assert.ok(await running(page) > 0, 'the entrance is playing');
  const mid = await page.evaluate(() => getComputedStyle(document.querySelector('.cm-ch:last-child .cm-bob')).opacity);
  assert.ok(+mid < 1, `the last friend has not landed yet (${mid})`);
  await page.keyboard.press('Shift');
  await page.waitForTimeout(80);
  assert.equal(await running(page), 0, 'every entrance animation finished at once');
  assert.ok(await page.evaluate(() => document.querySelector('.cm-hero').classList.contains('is-landed')));
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.cm-ch:last-child .cm-bob')).opacity), '1');
  assert.deepEqual(errors, []);
  await ctx.close();
});

// ---------------------------------------------------------------- reduced motion and the Decorative motion switch: final at once
for (const motion of ['reduce', 'switch']) {
  test(`motion off (${motion}): the final frame at once on every page; zones lit, prices final, steps and cards shown`, T, async () => {
    const { ctx, page, errors } = await open('centers', { motion, settle: 100 });
    for (const r of ROUTES) {
      await page.evaluate(r => { location.hash = '#' + r; }, r);
      await page.waitForFunction(r => document.querySelector(`#view .cm-hero[data-cm-hero="${r}"]`), r, { timeout: 30000 });
      await page.waitForTimeout(120);
      const s = await page.evaluate(() => ({
        anims: document.getAnimations().filter(a => a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('.cm-hero, .cm-zones, .cm-tiers, .cm-steps, .cm-device, .ff-endorse')).length,
        live: !!document.querySelector('.cm-live, .cm-walk, .cm-pre, .cm-rise, .cm-chip-pre'),
        hidden: Array.from(document.querySelectorAll('.cm-ch .cm-bob, .cm-zone .cm-zonefr img, .pz-tier-card, .cm-steps li, .cm-device, .ffe-item')).filter(e => +getComputedStyle(e).opacity < 1).length
      }));
      assert.deepEqual(s, { anims: 0, live: false, hidden: 0 }, r);
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

test('#for-centers / #for-home / #for-faith: the four learning zones light up one by one, each with its friend and pillar', T, async () => {
  for (const r of ['for-centers', 'for-home', 'for-faith']) {
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
for (const viewport of [{ width: 1024, height: 768 }, { width: 1280, height: 720 }, DESK, PHONE]) {
  test(`grounded at ${viewport.width}: every cut-out's feet are on its backdrop's ground band (the open floor, never a gate, fence, basket or desk)`, T, async () => {
    const { ctx, page, errors } = await open('centers', { viewport, touch: viewport === PHONE, motion: 'reduce' });
    for (const r of ROUTES) {
      await page.evaluate(r => { location.hash = '#' + r; scrollTo(0, 0); }, r);
      await page.waitForFunction(r => document.querySelector(`#view .cm-hero[data-cm-hero="${r}"][data-cm-ground]`), r, { timeout: 30000 });
      await page.waitForTimeout(250);
      const bad = await page.evaluate(() => {
        const hero = document.querySelector('.cm-hero'), world = hero.querySelector('.cm-world'), g = window.FFCentersMotion.GROUND[world.dataset.env];
        const R = hero.querySelector('.cm-room').getBoundingClientRect(), out = [];
        hero.querySelectorAll('.cm-ch').forEach(c => {
          const b = c.getBoundingClientRect(); if (!b.width) return;
          const fy = (b.bottom - R.top) / R.height * 100, fx = ((b.left + b.right) / 2 - R.left) / R.width * 100;
          if (Math.abs(fy - g.y) > 2.5 || fx < g.x0 - 1 || fx > g.x1 + 1) out.push(`${c.dataset.cmCh} feet at ${fx.toFixed(1)}%, ${fy.toFixed(1)}% (ground ${g.x0}-${g.x1}%, ${g.y}%)`);
        });
        return out;
      });
      assert.deepEqual(bad, [], r);
    }
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}

test('#book-demo reception: Rowan walks the floor from the doorway to the desk; Mara stands behind the counter; the bubbles take turns inside the hero', T, async () => {
  for (const viewport of [{ width: 1024, height: 768 }, DESK, PHONE]) {
    const { ctx, page, errors } = await open('book-demo', { viewport, touch: viewport === PHONE, settle: 200 });
    const geo = () => page.evaluate(() => {
      const hero = document.querySelector('.cm-hero'), C = window.FFCentersMotion.REC, R = hero.querySelector('.cm-room').getBoundingClientRect();
      const row = hero.querySelector('.cm-rowan'), walk = row.querySelector('.cm-stride').getBoundingClientRect(), mara = hero.querySelector('.cm-mara').getBoundingClientRect();
      const p = (x, y) => [(x - R.left) / R.width * 100, (y - R.top) / R.height * 100];
      const [dx, dy] = (row.dataset.from || '0,0').split(',').map(Number), end = row.getBoundingClientRect();
      const occ = hero.querySelector('.cm-occluder');
      return { C, now: p((walk.left + walk.right) / 2, walk.bottom), end: p((end.left + end.right) / 2, end.bottom), start: p((end.left + end.right) / 2 + dx, end.bottom + dy),
        maraBottom: mara.bottom, counter: R.top + C.counter / 100 * R.height, occ: !!occ && /polygon/.test(getComputedStyle(occ).clipPath) && occ.compareDocumentPosition(hero.querySelector('.cm-mara')) === Node.DOCUMENT_POSITION_PRECEDING,
        hb: hero.getBoundingClientRect().toJSON(), bubbles: Array.from(hero.querySelectorAll('.cm-bubble')).map(b => b.getBoundingClientRect().toJSON()), on: Array.from(hero.querySelectorAll('.cm-bubble[data-on]')).map(b => b.dataset.bubble) };
    });
    const near = (a, b, d) => Math.abs(a - b) <= d;
    let g = await geo();
    if (viewport !== PHONE) {
      // at the start: in the doorway, on the floor; part way: still on the floor line between the door and the desk
      assert.ok(near(g.start[0], g.C.from.x, 1.5) && near(g.start[1], g.C.from.y, 1.5), `starts in the doorway on the floor: ${g.start}`);
      await page.waitForTimeout(1800);
      g = await geo();
      const t = (g.now[1] - g.C.from.y) / (g.C.to.y - g.C.from.y), onLine = g.C.from.x + t * (g.C.to.x - g.C.from.x);
      assert.ok(t > 0.02 && t < 0.98 && near(g.now[0], onLine, 2), `walking on the floor line: ${g.now} (t ${t.toFixed(2)})`);
    }
    await page.waitForTimeout(viewport === PHONE ? 8500 : 9500);
    g = await geo();
    assert.ok(near(g.now[0], g.C.to.x, 1) && near(g.now[1], g.C.to.y, 1), `ends at the desk, feet on the floor: ${g.now}`);
    assert.ok(g.maraBottom > g.counter + 20, 'Mara\'s lower body is below the counter top (hidden by the desk)');
    assert.ok(g.occ, 'the desk is drawn over Mara (a clipped copy of the room, after her in the page)');
    assert.deepEqual(g.on, ['2'], 'the last bubble stays');
    for (const b of g.bubbles) assert.ok(b.left >= g.hb.left && b.right <= g.hb.right && b.top >= g.hb.top && b.bottom <= g.hb.bottom, `bubble inside the hero ${JSON.stringify(b)}`);
    assert.deepEqual(errors, []);
    await ctx.close();
  }
  // reduced motion: the final frame at once (Rowan at the desk, one bubble); the scene is decoration with a hidden description
  const { ctx, page } = await open('book-demo', { motion: 'reduce', settle: 200 });
  assert.deepEqual(await page.evaluate(() => [document.querySelectorAll('.cm-bubble[data-on]').length, document.querySelector('.cm-fx').getAttribute('aria-hidden'), !!document.querySelector('.cm-sr').textContent.trim(), document.getAnimations().filter(a => a.effect && a.effect.target && a.effect.target.closest('.cm-fx')).length]), [1, 'true', true, 0]);
  await ctx.close();
});

// ---------------------------------------------------------------- Spanish
test('Spanish: the chip, the pillars and the dashboard peek are in Spanish; no sideways scroll at 390', T, async () => {
  const { ctx, page, errors } = await open('centers', { lang: 'es', viewport: PHONE, touch: true, settle: 1500 });
  await page.waitForFunction(() => /Ilustración de cuento/.test((document.querySelector('.cm-chip') || {}).textContent || ''), null, { timeout: 20000 });
  assert.match(await page.textContent('.cm-chip'), /Personajes del mundo del cuento/);
  assert.match(await page.textContent('.cm-dash a.btn'), /Prueba el portal de dirección/);
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
