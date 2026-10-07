// Wave 8 lane PAGE (owner 2026-10-06): A DAY IN THE WORLD, BOOKER WALKS THE PATH, LIVING FRIENDS AND HIDDEN SURPRISES, and Apple-style
// liquid glass in three places below the hero. "Not changing anything else that we did": every word, link, section order and test
// intent stays; these tests encode what was ADDED. Real headless Chromium at 1280 and 390 px (harness as tests/a11y.test.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const H = () => import('./a11y-harness.mjs');
let h, site, browser;
test.before(async () => { h = await H(); site = await h.startSite(); browser = await h.loadChromium().launch(); });
test.after(async () => { await browser.close(); await site.close(); });

const PHONE = { isMobile: true, hasTouch: true };
const ctxFor = (width, motion, extra = {}) => browser.newContext({ viewport: h.SIZES[width], reducedMotion: motion ? 'no-preference' : 'reduce', ...(width === 390 ? PHONE : {}), ...extra });
const errorsOf = page => { const e = []; page.on('pageerror', x => e.push(x.message)); return e; };
// scroll the whole page in steps (lazy layers, the walker and the sky all follow scroll)
const sweep = async (page, step = 300, wait = 30) => { const H2 = await page.evaluate(() => document.documentElement.scrollHeight); for (let y = 0; y <= H2; y += step) { await page.evaluate(y => scrollTo(0, y), y); await page.waitForTimeout(wait); } };
const DAYS = [['.hc-doors', 'late-morning', 'morning'], ['.hc-status', 'late-morning', 'morning'], ['.hc-friends', 'midday', 'morning'], ['.hc-day', 'afternoon', 'afternoon'], ['.hc-proof', 'golden-afternoon', 'afternoon'], ['.hc-trust', 'sunset', 'sunset'], ['.hc-close', 'dusk', 'sunset']];

// ---------------------------------------------------------------- files and wiring (no browser)
test('wiring: the new files load after footer-scene and before the strip and wayfinding, cache-busted; the edited files are bumped', () => {
  const html = read('index.html');
  const at = s => html.indexOf(s);
  for (const f of ['home-day.css', 'glass.css', 'booker-walk.css']) assert.match(html, new RegExp(`href="${f.replace('.', '\\.')}\\?v=\\d+"`), f);
  for (const f of ['home-day.js', 'booker-walk.js']) assert.match(html, new RegExp(`src="${f.replace('.', '\\.')}\\?v=\\d+"`), f);
  assert.ok(at('src="footer-scene.js') < at('src="home-day.js') && at('src="home-day.js') < at('src="booker-walk.js') && at('src="booker-walk.js') < at('src="release-strip.js') && at('src="booker-walk.js') < at('src="wayfinding.js'), 'script order');
  assert.ok(at('href="home-calm.css') < at('href="home-day.css') && at('href="home-day.css') < at('href="glass.css'), 'the world and the glass come after the calm Home styles');
  const v = f => +((html.match(new RegExp(f.replace('.', '\\.') + '\\?v=(\\d+)')) || [])[1] || 0);
  assert.ok(v('home-alive.js') >= 2 && v('home-alive.css') >= 2 && v('footer-scene.js') >= 2, 'edited files carry a new ?v=');
});

test('the new code sends nothing and stores only the surprises found (try/catch); sounds and day parts are plain document events', () => {
  for (const f of ['home-day.js', 'booker-walk.js']) {
    const src = read(f).replace(/\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(src, /fetch\(|XMLHttpRequest|sendBeacon|WebSocket|navigator\.share/, f + ' sends nothing');
    assert.doesNotMatch(src, /sessionStorage|indexedDB|document\.cookie/, f);
  }
  const day = read('home-day.js');
  assert.equal((day.match(/localStorage\.(get|set)Item/g) || []).length, 2, 'one read, one write');
  assert.match(day, /try \{ a = JSON\.parse\(localStorage\.getItem\(STORE\)/);
  assert.match(day, /try \{ localStorage\.setItem\(STORE/);
  assert.match(day, /new CustomEvent\('ff:daypart', \{ detail: \{ part \} \}\)/);
  for (const f of ['home-day.js', 'booker-walk.js', 'home-alive.js', 'footer-scene.js']) assert.match(read(f), /new CustomEvent\('ff:sfx', \{ detail: \{ name/, f + ' asks for sound with ff:sfx');
  // only names from the shared contract
  const NAMES = ['whoosh', 'cloud-puff', 'letter-pop', 'logo-land', 'hop', 'land', 'chime', 'sparkle', 'wink', 'squish', 'rain', 'tap', 'page-turn', 'card-flip', 'badge', 'footstep', 'wave', 'firefly', 'night-chime'];
  for (const f of ['home-day.js', 'booker-walk.js', 'home-alive.js', 'footer-scene.js']) {
    const used = [...read(f).matchAll(/(?:sfx|say)\('([a-z-]+)'/g)].map(m => m[1]);
    for (const n of used) assert.ok(NAMES.includes(n), `${f}: ff:sfx name "${n}" is in the contract`);
  }
});

test('character art is never tilted, mirrored or stretched: the 3D tilt is on the felt card face only, Booker only moves and rotates', () => {
  const day = read('home-day.js').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  // every rotateX/rotateY in the page lane is written to the felt face (an element with no image in it)
  const tilts = day.split('\n').filter(l => /rotateX|rotateY|perspective\(/.test(l));
  assert.ok(tilts.length >= 1);
  for (const l of tilts) assert.match(l, /face\.style\.transform = `perspective/, l.trim());
  const walk = read('booker-walk.js').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const f of [walk, read('booker-walk.css'), read('glass.css'), read('home-day.css')]) assert.doesNotMatch(f, /scaleX|scaleY|scale3d|skew|matrix|rotateY\(180|scale\(\s*-1/);
  assert.match(read('booker-walk.css'), /\.bw-pose\{[^}]*height:100%!important;width:auto!important[^}]*object-fit:contain/);
});

// ---------------------------------------------------------------- A DAY IN THE WORLD
for (const width of [1280, 390]) {
  test(`a day in the world (${width}px): each section has its time of day; ff:daypart follows the middle of the screen, morning to night`, async () => {
    const ctx = await ctxFor(width, true);
    const page = await ctx.newPage(); const errors = errorsOf(page);
    await page.addInitScript(() => { window.__parts = []; document.addEventListener('ff:daypart', e => window.__parts.push(e.detail.part)); });
    await h.goto(page, site.base, 'home', 700);
    const tags = await page.evaluate(d => d.map(([s]) => { const e = document.querySelector(s); return e && [e.dataset.day, e.dataset.daypart]; }), DAYS);
    assert.deepEqual(tags, DAYS.map(([, d, p]) => [d, p]));
    assert.equal(await page.evaluate(() => document.documentElement.dataset.daypart), 'morning');
    const seen = [];
    for (const [sel, , part] of DAYS.filter(([s]) => s !== '.hc-status')) {
      await page.evaluate(s => { const e = document.querySelector(s), r = e.getBoundingClientRect(); scrollTo(0, scrollY + r.top + Math.min(r.height / 2, innerHeight * 0.4) - innerHeight / 2 + 10); }, sel);
      await page.waitForTimeout(160);
      const now = await page.evaluate(() => document.documentElement.dataset.daypart);
      assert.equal(now, part, `${sel} -> ${part}`);
      seen.push(now);
    }
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => document.documentElement.dataset.daypart), 'night', 'the footer is night');
    const parts = await page.evaluate(() => window.__parts);
    const order = ['morning', 'afternoon', 'sunset', 'night'];
    assert.deepEqual([...new Set(parts)], order, 'the event fired for each part, in the order of the day');
    for (let i = 1; i < parts.length; i++) assert.notEqual(parts[i], parts[i - 1], 'only on a change');
    // the fixed sky: present with motion, behind everything, layered, its plates loaded only as their sections come near
    const sky = await page.evaluate(() => { const s = document.querySelector('body > .hd-stage'); return s && { z: getComputedStyle(s).zIndex, pos: getComputedStyle(s).position, layers: s.querySelectorAll('.hd-sky').length, hidden: s.getAttribute('aria-hidden'), engine: s.dataset.engine, live: document.documentElement.classList.contains('hd-live') }; });
    assert.deepEqual(sky && [sky.z, sky.pos, sky.layers, sky.hidden, sky.live], ['-1', 'fixed', 6, 'true', true]);
    assert.ok(['css', 'scrolltrigger'].includes(sky.engine), 'native scroll-driven CSS, or GSAP ScrollTrigger');
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}

test('the sky really changes with scroll: the stage layers cross-fade from morning to dusk and the sun travels', async () => {
  const ctx = await ctxFor(1280, true);
  const page = await ctx.newPage();
  await h.goto(page, site.base, 'home', 700);
  const at = async sel => {
    await page.evaluate(s => { const e = document.querySelector(s), r = e.getBoundingClientRect(); scrollTo(0, scrollY + r.top + r.height / 2 - innerHeight / 2); }, sel);
    await page.waitForTimeout(250);
    return page.evaluate(() => ({ o: [...document.querySelectorAll('.hd-stage .hd-sky')].map(x => +(+getComputedStyle(x).opacity).toFixed(2)), sun: new DOMMatrix(getComputedStyle(document.querySelector('.hd-sun')).transform).m41, sunO: +getComputedStyle(document.querySelector('.hd-sun')).opacity }));
  };
  const friends = await at('.hc-friends'), day = await at('.hc-day'), trust = await at('.hc-trust');
  assert.ok(friends.o[1] > 0.9 && friends.o[2] < 0.1, `midday sky at the friends: ${friends.o}`);
  assert.ok(day.o[2] > 0.9 && day.o[4] < 0.1, `afternoon plate at the day path: ${day.o}`);
  assert.ok(trust.o[4] > 0.9, `sunset plate at trust: ${trust.o}`);
  assert.ok(friends.sunO > 0.9 && trust.sunO < 0.1, 'the felt sun is out by day and hands over to the sunset plate');
  assert.notEqual(Math.round(friends.sun), Math.round(day.sun), 'the sun moved');
  await ctx.close();
});

for (const width of [1280, 390]) {
  test(`world layers (${width}px): every one is aria-hidden decoration with nothing focusable; built lazily as sections come near`, async () => {
    const ctx = await ctxFor(width, true);
    const page = await ctx.newPage(); const errors = errorsOf(page);
    const urls = []; page.on('request', r => urls.push(r.url()));
    await h.goto(page, site.base, 'home', 700);
    const before = await page.evaluate(() => ({ worlds: document.querySelectorAll('.hd-world').length, trust: !!document.querySelector('.hc-trust > .hd-world') }));
    // 2026-10-07: the big welcome video now sits between the hero and the doors, so at load no section may be near enough yet
    assert.ok(before.worlds < 7 && !before.trust, `only the near sections at first: ${JSON.stringify(before)}`);
    assert.deepEqual(urls.filter(u => /world8\/(sky-sunset|sky-night|meadow-front-night|moon|firefly|div-grass)/.test(u)), [], 'far-away art (sunset, night, the golden grass) is not fetched on load');
    await sweep(page);
    const f = await page.evaluate(() => {
      const layers = [...document.querySelectorAll('.hd-stage, .hd-world, .hd-edge, .hd-fx, .hd-night, #bw-layer')];
      return {
        n: layers.length,
        worlds: document.querySelectorAll('.hd-world').length,
        notHidden: layers.filter(l => l.getAttribute('aria-hidden') !== 'true' && !l.closest('[aria-hidden="true"]')).map(l => l.className || l.id),
        focusable: layers.flatMap(l => [...l.querySelectorAll('a[href],button,input,select,textarea,[tabindex]')]).length,
        imgsWithAlt: layers.flatMap(l => [...l.querySelectorAll('img')]).filter(i => i.getAttribute('alt') !== '').length,
        pointerOff: [...document.querySelectorAll('.hd-world, .hd-edge')].every(l => getComputedStyle(l).pointerEvents === 'none')
      };
    });
    assert.equal(f.worlds, 7, 'every section got its layer once near');
    assert.deepEqual(await page.evaluate(() => [innerWidth, document.documentElement.scrollWidth <= innerWidth]), [width, true], 'nothing widens the page');
    assert.deepEqual(f.notHidden, []);
    assert.equal(f.focusable, 0, 'focus order unchanged: no focusable decoration');
    assert.equal(f.imgsWithAlt, 0, 'every decorative image has alt=""');
    assert.ok(f.pointerOff, 'the backgrounds never take a click');
    assert.ok(urls.some(u => /world8\/sky-sunset/.test(u)) && urls.some(u => /world8\/sky-night/.test(u)), 'the far plates load once their sections come near');
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}

// ---------------------------------------------------------------- BOOKER WALKS THE PATH
test('Booker follows the scroll down the page on the stitched trail (1280): he moves down with the page, is seen, and the trail draws ahead of him', async () => {
  const ctx = await ctxFor(1280, true);
  const page = await ctx.newPage(); const errors = errorsOf(page);
  await h.goto(page, site.base, 'home', 700);
  await page.evaluate(() => scrollTo(0, 400)); await page.waitForTimeout(400);
  await page.waitForFunction(() => document.querySelector('#bw-layer .bw-walker'));
  const H2 = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  const ys = [], seen = [], drawn = [];
  for (let y = 600; y <= H2; y += 250) {
    await page.evaluate(y => scrollTo(0, y), y); await page.waitForTimeout(70);
    const s = await page.evaluate(() => { const w = document.querySelector('.bw-walker'), m = new DOMMatrix(getComputedStyle(w).transform); const segs = [...document.querySelectorAll('#bw-layer .bw-reveal')]; return { y: m.m42, on: w.classList.contains('is-on'), drawn: segs.length }; });
    ys.push(s.y); seen.push(s.on); drawn.push(s.drawn);
  }
  for (let i = 1; i < ys.length; i++) assert.ok(ys[i] >= ys[i - 1] - 1, 'he only walks down as the page scrolls down');
  assert.ok(ys[ys.length - 1] - ys[0] > 3000, 'he walks the whole page');
  assert.ok(seen.filter(Boolean).length >= seen.length * 0.4, `he is seen most of the way on a wide screen (${seen.filter(Boolean).length}/${seen.length})`);
  const st = await page.evaluate(() => window.FFBookerWalk.state());
  assert.ok(st.segments >= 12, 'start, a run and a crossing per section, the end');
  for (let i = 1; i < st.timeline.length; i++) assert.ok(st.timeline[i].s0 >= st.timeline[i - 1].s1 - 1, 'one segment after another');
  assert.deepEqual(errors, []);
  await ctx.close();
});

for (const width of [390, 1280]) {
  test(`Booker never overlaps a tap target (16 px) or text at ${width}px, at any scroll position; he is seen crossing the gaps`, async () => {
    const ctx = await ctxFor(width, true);
    const page = await ctx.newPage();
    await h.goto(page, site.base, 'home', 700);
    await page.evaluate(() => scrollTo(0, 300)); await page.waitForTimeout(400);
    await page.waitForFunction(() => document.querySelector('#bw-layer .bw-walker'));
    const H2 = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    const bad = []; let seen = 0;
    for (let y = 0; y <= H2; y += 90) {
      await page.evaluate(y => scrollTo(0, y), y); await page.waitForTimeout(40);
      const r = await page.evaluate(() => {
        const w = document.querySelector('.bw-walker');
        if (!w || !w.classList.contains('is-on')) return null;
        const b = w.getBoundingClientRect();
        const hits = [];
        document.querySelectorAll('#view a[href], #view button, #view [role=tab], .ff-footscene a, header a, header button, .totop.on, .ffs button').forEach(t => { const q = t.getBoundingClientRect(); if (q.width && !(b.right <= q.left - 16 || b.left >= q.right + 16 || b.bottom <= q.top - 16 || b.top >= q.bottom + 16)) hits.push('tap ' + (t.textContent || t.className).trim().slice(0, 30)); });
        document.querySelectorAll('#view h1, #view h2, #view h3, #view p, #view li').forEach(t => { const q = t.getBoundingClientRect(); if (q.width && !(b.right <= q.left || b.left >= q.right || b.bottom <= q.top || b.top >= q.bottom)) hits.push('text ' + t.textContent.trim().slice(0, 30)); });
        return hits;
      });
      if (r) { seen++; if (r.length) bad.push(`${y}: ${r.join(', ')}`); }
    }
    assert.deepEqual(bad, []);
    assert.ok(seen >= 3, `he is seen at ${width}px (${seen} positions)`);
    await ctx.close();
  });
}

test('phones: the trail runs in the side margins, clear of the content column', async () => {
  const ctx = await ctxFor(390, true);
  const page = await ctx.newPage();
  await h.goto(page, site.base, 'home', 700);
  await page.evaluate(() => scrollTo(0, 300)); await page.waitForTimeout(500);
  await page.waitForFunction(() => document.querySelector('#bw-layer .bw-seg'));
  const g = await page.evaluate(() => window.FFBookerWalk.state().geometry);
  const wrap = await page.evaluate(() => { const w = document.querySelector('.hc-doors > .wrap'), r = w.getBoundingClientRect(), cs = getComputedStyle(w); return [r.left + parseFloat(cs.paddingLeft), r.right - parseFloat(cs.paddingRight)]; });
  assert.ok(g.xL < wrap[0] && g.xR > wrap[1], `margin runs at ${g.xL} and ${g.xR}, the column is ${wrap}`);
  await ctx.close();
});

// ---------------------------------------------------------------- LIVING FRIENDS AND HIDDEN SURPRISES
test('hidden surprises: seven, each labelled, aria-hidden, reachable by pointer where nothing else is; a tap counts it (stored when allowed)', async () => {
  const ctx = await ctxFor(1280, true);
  const page = await ctx.newPage(); const errors = errorsOf(page);
  await page.addInitScript(() => { window.__sfx = []; document.addEventListener('ff:sfx', e => window.__sfx.push(e.detail.name)); try { localStorage.removeItem('ff-surprises-v1'); } catch (e) { /* */ } });
  await h.goto(page, site.base, 'home', 700);
  await sweep(page);
  await page.waitForTimeout(400);
  const all = await page.evaluate(() => [...document.querySelectorAll('[data-surprise]')].map(t => ({ id: t.dataset.surprise, label: t.dataset.label || '', hidden: !!t.closest('[aria-hidden="true"]'), blocked: !!t.dataset.blocked })));
  assert.deepEqual([...new Set(all.map(t => t.id))].sort(), ['bird', 'booker', 'cloud', 'firefly', 'flower', 'moon', 'star']);
  for (const t of all) { assert.ok(t.label.length > 8, `${t.id} is labelled`); assert.ok(t.hidden, `${t.id} is decoration (aria-hidden)`); }
  // every surprise except Booker (who walks) is reachable at 1280: nothing covers it and nothing is under it
  for (const id of ['cloud', 'bird', 'flower', 'moon', 'firefly', 'star']) {
    const r = await page.evaluate(id => {
      const t = document.querySelector(`[data-surprise="${id}"]`);
      t.scrollIntoView({ block: 'center' });
      const b = t.getBoundingClientRect(), hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
      const over = [...document.querySelectorAll('#view a[href], #view button, #view [role=tab], .ff-footscene a')].filter(q => { const x = q.getBoundingClientRect(); return !(b.right <= x.left - 16 || b.left >= x.right + 16 || b.bottom <= x.top - 16 || b.top >= x.bottom + 16); }).length;
      return { reach: !!hit && (hit === t || t.contains(hit)), blocked: !!t.dataset.blocked, over };
    }, id);
    assert.ok(!r.blocked && r.reach, `${id} reachable: ${JSON.stringify(r)}`);
    assert.equal(r.over, 0, `${id} keeps 16 px from every tap target`);
  }
  await page.click('[data-surprise="cloud"]');
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => ({ badge: (document.querySelector('.hd-found') || {}).textContent, stored: localStorage.getItem('ff-surprises-v1'), sfx: window.__sfx }));
  assert.equal(after.badge, '1 of 7 surprises found');
  assert.deepEqual(JSON.parse(after.stored), ['cloud']);
  assert.ok(after.sfx.includes('rain'));
  await page.click('[data-surprise="moon"]'); await page.waitForTimeout(200);
  assert.equal(await page.evaluate(() => (document.querySelector('.hd-nightfx .hd-found') || {}).textContent), '2 of 7 surprises found');
  assert.ok((await page.evaluate(() => window.__sfx)).includes('wink'));
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('surprises with storage blocked: they still play and count for the visit, no errors', async () => {
  const ctx = await ctxFor(1280, true);
  const page = await ctx.newPage(); const errors = errorsOf(page);
  await page.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); });
  await h.goto(page, site.base, 'home', 700);
  await sweep(page); await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelector('[data-surprise="bird"]').scrollIntoView({ block: 'center' }));
  await page.click('[data-surprise="bird"]'); await page.waitForTimeout(200);
  assert.equal(await page.evaluate(() => (document.querySelector('.hd-found') || {}).textContent), '1 of 7 surprises found');
  assert.deepEqual(errors.filter(e => !/blocked/.test(e)), []);
  await ctx.close();
});

test('living friends: the felt cards tilt behind the friend (never the art), the friend turns to wave on hover and focus; badges sparkle; steps pop', async () => {
  const ctx = await ctxFor(1280, true);
  const page = await ctx.newPage(); const errors = errorsOf(page);
  await page.addInitScript(() => { window.__sfx = []; document.addEventListener('ff:sfx', e => window.__sfx.push(e.detail.name)); });
  await h.goto(page, site.base, 'home', 700);
  await page.evaluate(() => document.querySelector('.hc-picktabs').scrollIntoView({ block: 'center' })); await page.waitForTimeout(300);
  const tab = page.locator('.hc-picktab[data-k=lumi]');
  const box = await tab.boundingBox();
  await page.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.2, { steps: 4 }); await page.waitForTimeout(450);
  const f = await page.evaluate(() => { const t = document.querySelector('.hc-picktab[data-k=lumi]'), face = t.querySelector('.hc-picktabface'); return { face: face && face.style.transform, faceImgs: face ? face.querySelectorAll('img').length : -1, tab: t.style.transform, waving: t.classList.contains('is-waving'), wave: !!t.querySelector('.hc-picktabwave'), artT: getComputedStyle(t.querySelector('img')).transform }; });
  assert.match(f.face, /perspective\(560px\) rotateX\(-?[\d.]+deg\) rotateY\(-?[\d.]+deg\)/, 'the felt face tilts toward the pointer');
  assert.equal(f.faceImgs, 0, 'the face holds no character art');
  assert.equal(f.tab, '', 'the card itself (and the friend on it) is not tilted');
  assert.ok(f.waving && f.wave, 'the friend turns to wave');
  // keyboard focus also turns the friend (the swap stays with motion off)
  await page.mouse.move(5, 300);
  await page.focus('.hc-picktab[aria-selected=true]');
  assert.equal(await page.evaluate(() => document.activeElement.classList.contains('is-waving')), true);
  // badges: the count lands, then a felt sparkle
  await page.evaluate(() => document.querySelector('.hc-prooflist').scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(1500);
  const sfx = await page.evaluate(() => window.__sfx);
  assert.ok(sfx.includes('badge') && sfx.includes('sparkle') && sfx.includes('wave'), sfx.join(','));
  const counts = await page.evaluate(() => [...document.querySelectorAll('.hc-proofn')].map(n => n.textContent === n.dataset.count));
  assert.ok(counts.every(Boolean), 'every count lands on its real number');
  // steps pop as Booker passes (the felt path)
  await page.evaluate(() => document.querySelector('.hc-day').scrollIntoView({ block: 'start' }));
  await page.evaluate(() => { window.__pops = 0; const o = Element.prototype.animate; Element.prototype.animate = function (k, t) { if (this.classList && this.classList.contains('hc-num')) window.__pops++; return o.call(this, k, t); }; });
  for (let i = 0; i < 12; i++) { await page.mouse.wheel(0, 70); await page.waitForTimeout(60); }
  assert.ok(await page.evaluate(() => window.__pops) >= 2, 'the steps pop as they are reached');
  assert.deepEqual(errors, []);
  await ctx.close();
});

// ---------------------------------------------------------------- LIQUID GLASS
test('liquid glass in three places: frosted with a rim and pointer specular; solid fallback; text on it stays AA', async () => {
  const ctx = await ctxFor(1280, true);
  const page = await ctx.newPage();
  await h.goto(page, site.base, 'home', 700);
  await sweep(page);
  const g = await page.evaluate(() => [...document.querySelectorAll('.hc-prooflist, .hc-close .hc-closegrid')].map(e => { const cs = getComputedStyle(e); return { bf: cs.backdropFilter || cs.webkitBackdropFilter, bg: cs.backgroundColor }; }));
  assert.equal(g.length, 2);
  for (const x of g) assert.match(x.bf, /blur\(18px\) saturate\(1\.7\)/);
  // wave 10: the doors are three floating glass cards (the frosted backing is each card's masked ::before), the shelf itself is clear
  const d = await page.evaluate(() => { const l = document.querySelector('.hc-doorlist'), lc = getComputedStyle(l); return { list: { bf: lc.backdropFilter, bg: lc.backgroundColor },
    cards: [...l.querySelectorAll('.hc-door')].map(e => { const b = getComputedStyle(e, '::before'); return { bf: b.backdropFilter, mask: b.maskImage || b.webkitMaskImage, bg: b.backgroundColor }; }) }; });
  assert.equal(d.list.bf, 'none'); assert.equal(d.list.bg, 'rgba(0, 0, 0, 0)');
  assert.equal(d.cards.length, 3);
  for (const x of d.cards) { assert.match(x.bf, /blur\(14px\) saturate\(1\.6\)/); assert.match(x.mask, /gradient/); }
  // specular follows the pointer, per card
  const b = await page.locator('.hc-doorlist').boundingBox();
  await page.evaluate(() => document.querySelector('.hc-doorlist').scrollIntoView({ block: 'center' }));
  const b2 = await page.locator('.hc-door').nth(1).boundingBox();
  await page.mouse.move(b2.x + b2.width * 0.7, b2.y + b2.height * 0.5, { steps: 3 }); await page.waitForTimeout(120);
  assert.match(await page.evaluate(() => document.querySelectorAll('.hc-door')[1].style.getPropertyValue('--gx')), /^\d+(\.\d)?%$/);
  // fallback: a solid pane of the same colour
  await page.evaluate(() => document.documentElement.classList.add('ffg-solid'));
  const solid = await page.evaluate(() => [...document.querySelectorAll('.hc-prooflist, .hc-close .hc-closegrid')].map(e => getComputedStyle(e)).concat([...document.querySelectorAll('.hc-door')].map(e => getComputedStyle(e, '::before')))
    .map(cs => { const a = (cs.backgroundColor.match(/[\d.]+/g) || [])[3]; return { bf: cs.backdropFilter, a: a == null ? 1 : +a, mask: cs.maskImage }; }));
  assert.equal(solid.length, 5);
  for (const x of solid) { assert.equal(x.bf, 'none'); assert.ok(x.a >= 0.95, `solid fallback alpha ${x.a}`); assert.ok(!x.mask || x.mask === 'none', 'no holes in the solid fallback'); }
  assert.ok(b);
  await ctx.close();
});

// Pixel contrast of the text that sits over the new backgrounds (the evidence report measures every text element on Home; this
// test keeps a representative set, at the top and the bottom of the screen, where the fixed sky differs most).
const KEY_TEXT = ['.hc-doorshead p', '.hc-door p', '.hc-door:nth-child(3) p', '.hc-door h3', '.hc-aside', '.hc-status-item', '.hc-friends .hc-head p', '.hc-day .hc-head p', '.hc-steps li > span:last-child', '.hc-proof .hc-head p', '.hc-kinetic [data-k=bop]', '.hc-trust-place > p', '.hc-realnote', '.hc-slots figcaption span', '.hc-close p', '.ff-footlabel'];
for (const width of [1280, 390]) {
  test(`AA contrast over the felt sky at ${width}px (motion on, top and bottom of the screen)`, async () => {
    const ctx = await ctxFor(width, true, { deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await h.goto(page, site.base, 'home', 700);
    await sweep(page, 400, 20); await page.waitForTimeout(400);
    // the two small drifting birds can pass behind a line for a moment; the measure is the sky and its mist, so they hold still
    await page.evaluate(() => document.querySelectorAll('.hd-bird').forEach(b => { b.style.visibility = 'hidden'; }));
    const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const fails = [];
    for (const sel of KEY_TEXT) for (const at of [0.25, 0.8]) {
      const m = await page.evaluate(([sel, at]) => {
        const el = document.querySelector(sel); if (!el) return { missing: true };
        const r0 = el.getBoundingClientRect(); scrollTo(0, scrollY + r0.top + r0.height / 2 - innerHeight * at);
        return null;
      }, [sel, at]);
      if (m && m.missing) { fails.push(`${sel} missing`); continue; }
      await page.waitForTimeout(120);
      const meta = await page.evaluate(sel => {
        const el = document.querySelector(sel), r = el.getBoundingClientRect(), cs = getComputedStyle(el), hb = document.querySelector('header.bar').getBoundingClientRect().bottom + 2;
        if (r.bottom < hb + 6 || r.top > innerHeight) return null;
        el.dataset.ctSave = el.style.cssText; el.style.setProperty('-webkit-text-fill-color', 'transparent', 'important'); el.style.setProperty('text-decoration-color', 'transparent', 'important');
        el.querySelectorAll('*').forEach(c => { c.dataset.ctSave = c.style.cssText; c.style.setProperty('-webkit-text-fill-color', 'transparent', 'important'); c.style.setProperty('opacity', '0', 'important'); });
        const size = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700;
        return { x: Math.max(0, r.left), y: Math.max(hb, r.top), w: Math.min(innerWidth, r.right) - Math.max(0, r.left), h: Math.min(innerHeight, r.bottom) - Math.max(hb, r.top), color: cs.color.match(/[\d.]+/g).slice(0, 3).map(Number), large: size >= 24 || (size >= 18.66 && bold) };
      }, sel);
      if (!meta || meta.w < 3 || meta.h < 3) continue;
      const buf = await page.screenshot({ clip: { x: meta.x, y: meta.y, width: meta.w, height: meta.h } });
      const px = await page.evaluate(async b64 => { const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data, o = []; const st = Math.max(1, Math.floor(d.length / 4 / 1200)); for (let k = 0; k < d.length / 4; k += st) o.push([d[k * 4], d[k * 4 + 1], d[k * 4 + 2]]); return o; }, buf.toString('base64'));
      await page.evaluate(sel => { const el = document.querySelector(sel); el.style.cssText = el.dataset.ctSave || ''; el.querySelectorAll('*').forEach(c => { c.style.cssText = c.dataset.ctSave || ''; }); }, sel);
      const rs = px.map(p => ratio(meta.color, p)).sort((a, b) => a - b), p10 = rs[Math.floor(rs.length * 0.1)];
      if (p10 < (meta.large ? 3 : 4.5)) fails.push(`${sel} @${at}: ${p10.toFixed(2)}`);
    }
    assert.deepEqual(fails, []);
    await ctx.close();
  });
}

// ---------------------------------------------------------------- reduced motion, the motion switch, pausing, budgets
for (const width of [1280, 390]) {
  test(`reduced motion (${width}px): the composed still day; no fixed sky, no walker, nothing moving; the trail drawn; same page height`, async () => {
    const still = await ctxFor(width, false);
    const page = await still.newPage(); const errors = errorsOf(page);
    await h.goto(page, site.base, 'home', 700);
    await sweep(page, 400, 30); await page.waitForTimeout(700);
    const s = await page.evaluate(() => ({
      stage: !!document.querySelector('.hd-stage'), live: document.documentElement.classList.contains('hd-live'), walker: !!document.querySelector('.bw-walker'),
      trail: [...document.querySelectorAll('#bw-layer .bw-reveal')].length,
      moving: document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('.hd-world, .hd-edge, .hd-fx, .hd-night, #bw-layer, .hc-picktab')).length,
      skies: [...document.querySelectorAll('[data-day]')].filter(e => e.matches('section')).map(e => { const cs = getComputedStyle(e); return cs.backgroundImage !== 'none' || !/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor); }),
      plates: [...document.querySelectorAll('.hd-plate.is-in')].length,
      night: !!document.querySelector('.ff-footscene .hd-night'),
      height: document.documentElement.scrollHeight
    }));
    assert.equal(s.stage, false); assert.equal(s.live, false); assert.equal(s.walker, false);
    assert.ok(s.trail >= 12, 'the trail is simply there');
    assert.equal(s.moving, 0, 'nothing moves');
    assert.ok(s.skies.every(Boolean), 'every section shows its own sky');
    assert.equal(s.plates, 3, 'the afternoon, golden and sunset plates are composed in their sections');
    assert.ok(s.night, 'the footer is night');
    const moving = await ctxFor(width, true); const p2 = await moving.newPage();
    await h.goto(p2, site.base, 'home', 700);
    const h2 = await p2.evaluate(() => document.documentElement.scrollHeight);
    assert.ok(Math.abs(h2 - s.height) <= 2, `same layout with and without motion (${s.height} vs ${h2})`);
    assert.deepEqual(errors, []);
    await still.close(); await moving.close();
  });
}

test('the motion switch turns the world still (and back) without a reload', async () => {
  const ctx = await ctxFor(1280, true);
  const page = await ctx.newPage(); const errors = errorsOf(page);
  await h.goto(page, site.base, 'home', 700);
  assert.equal(await page.evaluate(() => !!document.querySelector('.hd-stage')), true);
  await page.evaluate(() => { document.documentElement.dataset.motion = 'off'; window.render(); });
  await page.waitForTimeout(300);
  assert.deepEqual(await page.evaluate(() => [!!document.querySelector('.hd-stage'), document.documentElement.classList.contains('hd-live'), !!document.querySelector('.bw-walker')]), [false, false, false]);
  await page.evaluate(() => { document.documentElement.dataset.motion = 'on'; window.render(); });
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => !!document.querySelector('.hd-stage')), true);
  // leaving Home removes every layer
  await page.evaluate(() => { location.hash = '#pricing'; }); await page.waitForTimeout(600);
  assert.deepEqual(await page.evaluate(() => document.querySelectorAll('.hd-stage, .hd-world, #bw-layer, .hd-night').length), 0);
  assert.equal(await page.evaluate(() => document.documentElement.dataset.daypart), undefined);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('loops pause: the fixed sky while the hero fills the screen and on a hidden tab; sections off screen', async () => {
  const ctx = await ctxFor(1280, true);
  const page = await ctx.newPage();
  await h.goto(page, site.base, 'home', 700);
  assert.equal(await page.evaluate(() => document.querySelector('.hd-stage').classList.contains('ffm-paused')), true, 'paused behind the hero');
  await page.evaluate(() => document.querySelector('.hc-doors').scrollIntoView()); await page.waitForTimeout(300);   // the doors' layers get built (they are below the welcome video now)
  await page.evaluate(() => document.querySelector('.hc-day').scrollIntoView()); await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => document.querySelector('.hd-stage').classList.contains('ffm-paused')), false);
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  assert.equal(await page.evaluate(() => document.querySelector('.hd-stage').classList.contains('ffm-paused')), true, 'paused on a hidden tab');
  const off = await page.evaluate(() => { const w = document.querySelector('.hc-doors > .hd-world'); return w && w.classList.contains('ffm-paused'); });
  assert.equal(off, true, 'a section scrolled away pauses its layers');
  await ctx.close();
});

test('budgets: no layout shift on cold loads (CLS < 0.01) and the rest of Home on a phone stays within +600 KB', async () => {
  const out = [];
  for (const width of [1280, 390]) {
    let best = 1;
    for (let k = 0; k < 2 && best >= 0.01; k++) {
      const ctx = await ctxFor(width, true); const page = await ctx.newPage();
      await page.addInitScript(() => { window.__cls = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); });
      await h.goto(page, site.base, 'home', 1200);
      best = Math.min(best, await page.evaluate(() => window.__cls));
      await ctx.close();
    }
    if (best >= 0.01) out.push(`${width}: CLS ${best.toFixed(4)}`);
  }
  assert.deepEqual(out, []);
  // phone: everything fetched after the first screen settled, while scrolling the whole page
  const ctx = await ctxFor(390, true); const page = await ctx.newPage();
  await h.goto(page, site.base, 'home', 2500);
  const sizes = new Map(); let counting = true;
  page.on('response', async r => { if (!counting) return; try { const b = await r.body(); sizes.set(r.url(), b.length); } catch (e) { /* redirects */ } });
  // at a phone's speed (4G, 9 Mbit/s), not the test server's: on localhost a whole clip arrives before it can leave the screen
  // the clips are measured by the bytes that actually arrive (a stopped download counts what it got, a finished one all of it)
  const cdp = await ctx.newCDPSession(page), got = new Map(), urlOf = new Map();
  await cdp.send('Network.enable');
  cdp.on('Network.requestWillBeSent', e => urlOf.set(e.requestId, e.request.url));
  cdp.on('Network.dataReceived', e => { if (counting) got.set(e.requestId, (got.get(e.requestId) || 0) + e.dataLength); });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 70, downloadThroughput: 9e6 / 8, uploadThroughput: 1.5e6 / 8 });
  await sweep(page, 250, 60); await page.waitForTimeout(1200);
  counting = false;
  // The owner-approved story-world clips are content that streams only when scrolled to (and never with reduced motion); they
  // are measured on their own: what streams of the phone clip in the hello frame and one friend's loop on a full scroll. Wave 9:
  // that frame now holds the ~32 s talking intro (ff-intro-*, 3.4 MB AV1 on phones if watched to the end); a scroll past it
  // streams only what it buffers while on screen, and a silent intro scrolled past stops downloading (home-video.js unload): measured at 4G speed by the bytes that arrive, 573 KB on 2026-10-07 (919 KB before the unload), so the same 2,000 KB budget holds.
  const all = [...sizes.entries()], clip = u => /\/video\/ff-(intro|friend)-[\w.-]+\.(webm|mp4)(\?|$)/.test(u);
  const kb = all.filter(([u]) => !clip(u)).reduce((a, [, b]) => a + b, 0) / 1024;
  const vkb = [...got.entries()].filter(([id]) => clip(urlOf.get(id) || '')).reduce((a, [, b]) => a + b, 0) / 1024;
  assert.ok(kb <= 600, `below the fold on a phone (art, scripts, posters): ${kb.toFixed(0)} KB ${JSON.stringify(all.filter(([u]) => !clip(u)).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([u, b]) => [u.replace(/^.*?\/\/[^/]+\//, ''), Math.round(b / 1024)]))}`);
  assert.ok(vkb <= 2000, `story-world clips streamed on a full scroll of a phone: ${vkb.toFixed(0)} KB`);
  await ctx.close();
});

// ---------------------------------------------------------------- story-world animation (owner-approved clips, wave 8)
// Wave 9: the hello frame now holds the four friends' talking intro (ff-intro-*, captions ff-intro.en.vtt), which also counts as media.
const isMedia = u => /\/video\/ff-(intro|friend)-[\w.-]+\.(webm|mp4)(\?|$)|\/video\/ff-intro-titled\.en\.vtt(\?|$)/.test(u);
test('animation: the hello frame and every friend\'s pick panel carry their clip, labelled; the real-center frames show real photos of our center', async () => {
  const ctx = await ctxFor(1280, true);
  const page = await ctx.newPage(); const errors = errorsOf(page);
  await h.goto(page, site.base, 'home', 700);
  const f = await page.evaluate(() => ({
    hello: [...document.querySelectorAll('.hc-intro .hc-hello')].map(x => [x.querySelector('video').getAttribute('aria-label'), x.querySelector('figcaption b').textContent.trim()]),
    transcript: [...document.querySelectorAll('.hc-intro .hc-hello figcaption details.ffcap-tr')].map(d => d.querySelector('summary').textContent + ' | ' + d.querySelector('div').textContent),
    placeholders: [...document.querySelectorAll('.hc-slots [data-placeholder]')].map(x => [x.querySelector('.ffa-slot-tag').textContent, x.querySelector('figcaption b').textContent]),
    note: document.querySelector('.hc-real h3').textContent
  }));
  // wave 9: the talking intro replaces the hello loop (new label and caption, still "Story-world"); its transcript sits under the caption
  assert.deepEqual(f.hello, [['Story-world animation: Booker the bear, Lumi the bunny, Zuri the turtle and Bop the elephant each say hello and introduce themselves in a felt meadow.', 'Story-world animation: meet the four friends.']]);
  assert.equal(f.transcript.length, 1, 'one transcript toggle under the intro');
  assert.match(f.transcript[0], /^Read the transcript: the four friends introduce themselves \| \[Title\] The felt Futures Friends logo flies in: Meet the Futures Friends[\s\S]*Booker: Hi! I'm Booker\.[\s\S]*Lumi: I'm Lumi![\s\S]*Zuri: I'm Zuri![\s\S]*Bop: And I'm Bop![\s\S]*All four friends: We're the Futures Friends![\s\S]*\[End card\] Futures Friends\. Learn\. Move\. Explore\. Belong\. Futures Friends · a program of Futures Learning Center$/);
  // Gap fill (2026-10-07): the three real-center frames now show real photos of Futures Learning Center (FFArt.photo), not placeholders
  assert.deepEqual(f.placeholders, []);
  assert.equal(f.note, 'Our center, in real photos');
  assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('.hc-slots [data-real-photo]')].map(i => i.dataset.realPhoto)), ['reading-corner', 'blue-table-room', 'exterior']);
  const want = { booker: /Booker the bear .* picture book/, lumi: /Lumi the bunny .* calm breath/, zuri: /Zuri the turtle .* magnifying glass/, bop: /Bop the elephant .* bouncing dance/ };
  for (const k of ['lumi', 'zuri', 'bop', 'booker']) {
    await page.click(`#hc-pick-${k}`); await page.waitForTimeout(80);
    const p = await page.evaluate(() => { const a = document.querySelector('#hc-pickpanel .hc-pickart'), v = a.querySelector('video'); return { has: a.classList.contains('has-video'), label: v && v.getAttribute('aria-label'), cut: !!a.querySelector('.hc-pickcut'), ratio: (() => { const r = a.querySelector('.hc-vframe').getBoundingClientRect(); return +(r.width / r.height).toFixed(2); })() }; });
    assert.ok(p.has && want[k].test(p.label), `${k}: ${p.label}`);
    assert.ok(p.cut, `${k}: the cut-out stays as the no-video fallback`);
    assert.ok(Math.abs(p.ratio - 0.8) < 0.02, `${k}: a 4:5 window (${p.ratio})`);
  }
  assert.deepEqual(errors, []);
  await ctx.close();
});

for (const width of [1280, 390]) {
  test(`animation (${width}px): no clip is requested before the visitor scrolls near it; then it plays, and the felt button pauses and plays it`, async () => {
    // Wave 9: the hello frame plays the talking intro (ff-intro-*) instead of the hello loop (ff-hello-*); the same lazy / play / pause
    // rules hold, and it plays once, muted, with its captions showing (no tap on the page in this test).
    const ctx = await ctxFor(width, true);
    const page = await ctx.newPage(); const errors = errorsOf(page);
    const urls = []; page.on('request', r => urls.push(r.url()));
    await h.goto(page, site.base, 'home', 1500);
    assert.deepEqual(urls.filter(isMedia), [], 'nothing requested at load');
    await page.evaluate(() => document.querySelector('.hc-hello').scrollIntoView({ block: 'center' }));
    await page.waitForFunction(() => { const v = document.querySelector('.hc-hello video'); return v && !v.paused && v.readyState >= 2; }, null, { timeout: 8000 });
    const tall = width <= 600;
    assert.ok(urls.some(u => new RegExp(`ff-intro-titled-${tall ? '4x5' : '16x9'}\\.`).test(u)), `the ${tall ? '4:5' : '16:9'} intro is the one fetched`);
    assert.ok(!urls.some(u => new RegExp(`ff-intro-titled-${tall ? '16x9' : '4x5'}\\.(webm|mp4)`).test(u)), 'never both');
    assert.deepEqual(await page.evaluate(() => { const v = document.querySelector('.hc-hello video'), t = v.textTracks[0]; return [v.loop, v.muted, t && t.kind, t && t.mode]; }), [false, true, 'captions', 'showing'], 'plays once (no loop), muted, captions showing');
    const btn = '.hc-hello .hc-vbtn';
    assert.equal(await page.getAttribute(btn, 'aria-label'), 'Pause the animation');
    await page.click(btn); await page.waitForTimeout(150);
    assert.deepEqual(await page.evaluate(() => [document.querySelector('.hc-hello video').paused, document.querySelector('.hc-hello .hc-vbtn').getAttribute('aria-label')]), [true, 'Play the animation']);
    // paused by the visitor: it stays paused when it scrolls away and back
    await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(200);
    await page.evaluate(() => document.querySelector('.hc-hello').scrollIntoView({ block: 'center' })); await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => document.querySelector('.hc-hello video').paused), true, 'stays paused');
    await page.click(btn); await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => document.querySelector('.hc-hello video').paused), false, 'plays again on request');
    // off screen it pauses by itself
    await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => document.querySelector('.hc-hello video').paused), true, 'paused off screen');
    // the picked friend's loop plays while the panel is on screen
    await page.evaluate(() => document.querySelector('#hc-pickpanel').scrollIntoView({ block: 'center' }));
    await page.waitForFunction(() => { const v = document.querySelector('#hc-pickpanel video'); return v && !v.paused && v.readyState >= 2; }, null, { timeout: 8000 });
    assert.ok(urls.some(u => /ff-friend-booker-4x5\./.test(u)) && !urls.some(u => /ff-friend-(lumi|zuri|bop)-4x5\.(webm|mp4)/.test(u)), `only the picked friend's clip: ${urls.filter(u => /ff-friend/.test(u)).join(' ')}`);
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}

// Wave 9 (owner-approved 2026-10-07): the talking intro plays ONCE. Muted with captions unless sound is on and the visitor has already
// tapped the page (the AudioContext is awake), then with its voice; turning sound off mutes it; at the end the felt button becomes a
// replay button, and the intro never restarts by itself. (playbackRate 16 runs the ~32 s clip to its end in about 2 s.)
test('talking intro: with sound on and a tap first it plays with its voice, once; at the end the button replays it; sound off mutes it', async () => {
  const ctx = await ctxFor(1280, true);
  const page = await ctx.newPage(); const errors = errorsOf(page);
  await h.goto(page, site.base, 'home', 900);
  await page.mouse.click(5, 5); await page.waitForTimeout(300);   // a tap on the top bar's empty corner wakes sound (on by default)
  assert.deepEqual(await page.evaluate(() => [window.FFSound.enabled(), window.FFSound.unlocked()]), [true, true]);
  await page.evaluate(() => document.querySelector('.hc-hello').scrollIntoView({ block: 'center' }));
  await page.waitForFunction(() => { const v = document.querySelector('.hc-hello video'); return v && !v.paused && v.readyState >= 2; }, null, { timeout: 8000 });
  assert.deepEqual(await page.evaluate(() => { const v = document.querySelector('.hc-hello video'); return [v.loop, v.muted, v.textTracks[0].mode]; }), [false, false, 'showing'], 'voice on, captions still showing');
  const btn = '.hc-hello .hc-vbtn', st = () => page.evaluate(() => { const v = document.querySelector('.hc-hello video'), b = document.querySelector('.hc-hello .hc-vbtn'); return [v.paused, v.ended, b.getAttribute('aria-label'), b.dataset.state]; });
  await page.evaluate(() => { document.querySelector('.hc-hello video').playbackRate = 16; });
  await page.waitForFunction(() => document.querySelector('.hc-hello video').ended, null, { timeout: 15000 }); await page.waitForTimeout(150);
  assert.deepEqual(await st(), [true, true, 'Replay the animation', 'ended'], 'ended: the button is a replay button');
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.hc-hello .hc-vreplay')).display), 'block', 'the replay arrow shows');
  // it never restarts by itself, even when it scrolls away and back
  await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(250);
  await page.evaluate(() => document.querySelector('.hc-hello').scrollIntoView({ block: 'center' })); await page.waitForTimeout(600);
  assert.deepEqual(await st(), [true, true, 'Replay the animation', 'ended'], 'plays once');
  // replay: from the start, with its voice
  await page.click(btn);
  await page.waitForFunction(() => { const v = document.querySelector('.hc-hello video'); return !v.paused && v.currentTime > 0; }, null, { timeout: 8000 });
  assert.deepEqual(await page.evaluate(() => { const v = document.querySelector('.hc-hello video'); return [v.currentTime < 5, v.muted, document.querySelector('.hc-hello .hc-vbtn').getAttribute('aria-label')]; }), [true, false, 'Pause the animation']);
  // the visitor turns sound off: the intro goes quiet (captions keep it understandable)
  await page.evaluate(() => window.FFSound.set(false));
  await page.waitForFunction(() => document.querySelector('.hc-hello video').muted, null, { timeout: 4000 });
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('talking intro with reduced motion: the poster and the play button, nothing autoplays or loads; the button plays it with captions', async () => {
  const ctx = await ctxFor(390, false);
  const page = await ctx.newPage(); const errors = errorsOf(page);
  const urls = []; page.on('request', r => urls.push(r.url()));
  await h.goto(page, site.base, 'home', 700);
  await page.evaluate(() => document.querySelector('.hc-hello').scrollIntoView({ block: 'center' })); await page.waitForTimeout(800);
  assert.deepEqual(await page.evaluate(() => { const f = document.querySelector('.hc-hello'), v = f.querySelector('video'), i = f.querySelector('.hc-vposter img'); return [v.paused, v.querySelectorAll('source').length, i.complete && i.naturalWidth > 0, /ff-intro-titled-4x5-poster/.test(i.currentSrc), f.querySelector('.hc-vbtn').getAttribute('aria-label')]; }),
    [true, 0, true, true, 'Play the animation'], 'phone: the 4:5 poster and the play button');
  assert.deepEqual(urls.filter(isMedia), [], 'no clip, no captions file');
  await page.click('.hc-hello .hc-vbtn');
  await page.waitForFunction(() => { const v = document.querySelector('.hc-hello video'); return !v.paused && v.readyState >= 2; }, null, { timeout: 8000 });
  assert.deepEqual(await page.evaluate(() => { const v = document.querySelector('.hc-hello video'); return [/ff-intro-titled-4x5\./.test(v.currentSrc), v.textTracks[0].mode]; }), [true, 'showing']);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('animation with reduced motion: posters only, nothing autoplays and no clip is fetched even when scrolled to; the button still plays on request', async () => {
  const ctx = await ctxFor(1280, false);
  const page = await ctx.newPage();
  const urls = []; page.on('request', r => urls.push(r.url()));
  await h.goto(page, site.base, 'home', 700);
  await page.evaluate(() => document.querySelector('.hc-hello').scrollIntoView({ block: 'center' })); await page.waitForTimeout(600);
  await page.evaluate(() => document.querySelector('#hc-pickpanel').scrollIntoView({ block: 'center' })); await page.waitForTimeout(600);
  const s = await page.evaluate(() => [...document.querySelectorAll('.hc-vframe')].map(f => ({ paused: f.querySelector('video').paused, sources: f.querySelectorAll('video source').length, poster: f.querySelector('.hc-vposter img').complete && f.querySelector('.hc-vposter img').naturalWidth > 0 })));
  assert.ok(s.length === 2 && s.every(x => x.paused && x.sources === 0 && x.poster), JSON.stringify(s));
  assert.deepEqual(urls.filter(isMedia), []);
  await page.click('#hc-pickpanel .hc-vbtn');
  await page.waitForFunction(() => !document.querySelector('#hc-pickpanel video').paused, null, { timeout: 8000 });
  await ctx.close();
});

// Wave 10 (owner 2026-10-07: "enough holes in this big block so we can see all the things going on in the background"): the doors
// are three cards with open sky between them, and each card is see-through where there is no writing (the band the friend peeks
// from: the top band on wide screens, the right-hand column on phones). Proof by pixels: with the card hidden, that zone looks
// almost the same, so the moving sky shows through it; the text zone keeps its frosted backing.
for (const width of [1280, 390]) {
  test(`doors: real gaps and see-through windows at ${width}px; the words keep a frosted backing; dusk/night skies keep AA`, async () => {
    const ctx = await ctxFor(width, false, { deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await h.goto(page, site.base, 'home', 700);
    await page.evaluate(() => { document.querySelector('.hc-doorlist').scrollIntoView({ block: 'center' }); document.querySelectorAll('.hd-bird').forEach(b => { b.style.visibility = 'hidden'; }); });
    await page.waitForTimeout(500);
    const boxes = await page.evaluate(() => [...document.querySelectorAll('.hc-door')].map(e => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; }));
    for (let i = 1; i < 3; i++) {
      const gap = width >= 900 ? boxes[i][0] - boxes[i - 1][2] : boxes[i][1] - boxes[i - 1][3];
      assert.ok(gap >= 16, `gap ${i}: ${gap}px of open sky`);
    }
    const mean = async clip => { const buf = await page.screenshot({ clip }); return page.evaluate(async b64 => { const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data; let r = 0, gg = 0, bb = 0, n = 0; for (let k = 0; k < d.length; k += 16) { r += d[k]; gg += d[k + 1]; bb += d[k + 2]; n++; } return [r / n, gg / n, bb / n]; }, buf.toString('base64')); };
    const [x0, y0, x1, y1] = boxes[1];
    const win = width >= 900 ? { x: x0 + (x1 - x0) * 0.45, y: y0 + 8, width: (x1 - x0) * 0.45, height: 24 } : { x: x1 - 60, y: y0 + 110, width: 44, height: Math.min(60, y1 - y0 - 130) };
    const txt = await page.evaluate(() => { const r = document.querySelectorAll('.hc-door')[1].querySelector('p').getBoundingClientRect(); return { x: r.left + 2, y: r.top + 2, width: Math.min(160, r.width - 4), height: 16 }; });
    const hideCard = v => page.evaluate(v => { const e = document.querySelectorAll('.hc-door')[1]; e.style.visibility = v; }, v);
    const [wOn, tOn] = [await mean(win), await mean(txt)];
    await hideCard('hidden');
    const [wOff, tOff] = [await mean(win), await mean(txt)];
    await hideCard('');
    const dist = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));
    assert.ok(dist(wOn, wOff) < 18, `the window shows the sky: ${dist(wOn, wOff).toFixed(1)} off`);
    assert.ok(dist(tOn, tOff) > 25 || Math.min(...tOn) > 225, `the words keep their frosted backing: ${dist(tOn, tOff).toFixed(1)}`);
    // worst-case skies (day, dusk and night colours of the world behind Home): the frosted backing composited over each keeps AA
    const meta = await page.evaluate(() => { const e = document.querySelector('.hc-door'), b = getComputedStyle(e, '::before'), n = s => s.match(/[\d.]+/g).map(Number);
      return { bg: n(b.backgroundColor), ink: n(getComputedStyle(e.querySelector('h3')).color).slice(0, 3), muted: n(getComputedStyle(e.querySelector('p')).color).slice(0, 3) }; });
    const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const a = meta.bg[3] == null ? 1 : meta.bg[3];
    for (const sky of [[166, 214, 242], [242, 150, 90], [120, 70, 110], [14, 42, 62], [6, 14, 34]]) {
      const bg = meta.bg.slice(0, 3).map((c, i) => c * a + sky[i] * (1 - a));
      assert.ok(ratio(meta.muted, bg) >= 4.5, `body text over rgb(${sky}): ${ratio(meta.muted, bg).toFixed(2)}`);
      assert.ok(ratio(meta.ink, bg) >= 4.5, `heading over rgb(${sky}): ${ratio(meta.ink, bg).toFixed(2)}`);
    }
    await ctx.close();
  });
}
