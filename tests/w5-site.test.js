'use strict';
// Wave 5 lane SITE (owner 2026-10-06: "redo them on the platform ... sprinkle them throughout the platform to make it feel more
// deliberate. New tiling signature textures"). Acceptance encoded here:
//  1. ONE source of character art: every character picture the site shows is a plush-library file (img/plush/characters,
//     480/960 with srcset), listed in img/plush/manifest.json and present on disk; the web pages no longer point at
//     img/cut_*.webp or img/community/* (those stay for the print kit only).
//  2. No retired cast (Bus Driver Ben, Nia, Kiki) anywhere in the story world.
//  3. Every supporting character appears somewhere on the site, and every appearance sits inside a component that says
//     "story-world character"; the town on #friends draws children no taller than 65% of the grown-ups beside them.
//  4. Signature textures come from one system (plush-textures.css tokens + .tx-* classes), are on screen, and are gone in print.
//  5. No "Daycare Center" anywhere on the site or in the library's names and alt text.
//  6. The generated lead poses are placed where they fit the pillar.
//  7. No broken images and no layout jumps (CLS <= 0.1) on the pages this lane changed, at 1280 and 390 px.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const man = JSON.parse(read('img/plush/manifest.json'));
const LIB = new Set(man.files.map(f => f.path));
const SITE_FILES = fs.readdirSync(ROOT).filter(f => /\.(js|css|html)$/.test(f) && f !== 'release-manifest.js');
const SUPPORT = ['ms-june', 'principal-hazel', 'mr-moss', 'ms-fern', 'pip', 'nico', 'tilly', 'poppy', 'finn', 'mimi', 'tad', 'bruno', 'rose', 'sage', 'ella', 'mara', 'rowan'];
const LEADS = ['booker', 'lumi', 'zuri', 'bop'];

function plush() {
  const c = vm.createContext({ window: {} });
  vm.runInContext(read('plush-cast.js'), c, { filename: 'plush-cast.js' });
  return c.window.FFPlush;
}

test('one source of character art: every character path in the site code is a plush-library file that exists', () => {
  const code = SITE_FILES.map(read).join('\n');
  assert.doesNotMatch(code, /img\/cut_[a-z]+\.webp['"`)\s]/, 'web pages no longer load img/cut_*.webp (print kit only)');
  assert.doesNotMatch(code, /img\/community\//, 'web pages no longer load img/community/*');
  const P = plush();
  for (const k of P.KEYS) for (const size of [480, 960]) assert.ok(LIB.has(P.src(k, size)) && fs.existsSync(path.join(ROOT, P.src(k, size))), `${k} ${size}`);
  for (const k of P.KEYS) {
    const f = man.files.find(x => x.path === P.src(k, 480));
    assert.equal(P.P[k].w480, f.width, `${k}: registry width matches the manifest`);
    assert.equal(P.P[k].scale, f.lineup_scale, `${k}: registry height scale matches the manifest`);
  }
  for (const e of Object.keys(P.ENV)) for (const w of [800, 1600]) assert.ok(LIB.has(P.envSrc(e, w)), `${e} ${w}`);
  for (const m of code.matchAll(/img\/plush\/(characters|environments)\/[a-z-]+-(480|960|800|1600)\.webp/g)) assert.ok(LIB.has(m[0]), m[0]);
  const tag = P.img('zuri-magnifier', { h: 300 });
  assert.match(tag, /srcset="img\/plush\/characters\/zuri-magnifier-480\.webp 340w, img\/plush\/characters\/zuri-magnifier-960\.webp 681w" sizes="213px"/);
  assert.match(tag, /width="340" height="480"/, 'the intrinsic box is the file\'s own, so nothing is stretched or jumps');
  assert.match(read('brand-art.css'), /img\[src\*="img\/plush\/characters\/"\][^{]*\{object-fit:contain\}|img\[src\*="cut_"\],[^{]*img\[src\*="img\/plush\/characters\/"\]\{object-fit:contain\}/);
});

test('no retired cast in the story world', () => {
  const code = SITE_FILES.map(read).join('\n');
  assert.doesNotMatch(code, /Bus Driver|\bKiki\b|img\/community\/(ben|nia|kiki)/i);
  const sc = vm.createContext({ window: {}, document: { addEventListener() {} } });
  for (const f of ['plush-cast.js', 'supporting-cast.js']) vm.runInContext(read(f), sc, { filename: f });
  const keys = sc.window.FFSupporting.allKeys.join(' ');
  assert.doesNotMatch(keys, /\b(ben|nia|kiki)\b/);
  assert.equal(sc.window.FFSupporting.allKeys.length, 17, 'Ms. June and the 16 new supporting characters');
});

test('no "Daycare Center" on the site or in the plush library', () => {
  for (const f of SITE_FILES) assert.doesNotMatch(read(f), /daycare center/i, f);
  for (const f of man.files) for (const k of ['path', 'slug', 'name', 'alt']) assert.doesNotMatch(String(f[k] ?? ''), /daycare/i, `${f.path} ${k}`);
});

test('signature textures are one system: tokens, classes, print and reduced-data off, used by the story-world components', () => {
  const css = read('plush-textures.css');
  for (const t of ['felt', 'cloud', 'cream', 'meadow']) assert.match(css, new RegExp(`--tx-${t}:url\\("img/plush/textures/[a-z-]+-512\\.webp"\\)`), t);
  for (const c of ['tx-felt', 'tx-cloud', 'tx-cream', 'tx-meadow', 'tx-ground']) assert.match(css, new RegExp(`\\.${c}\\{`), c);
  assert.match(css, /@media print\{[\s\S]*\.tx-felt,\.tx-cloud,\.tx-cream,\.tx-meadow\{background:none !important\}[\s\S]*\.tx-ground\{display:none !important\}/);
  assert.match(css, /@media \(prefers-reduced-data: reduce\)\{[\s\S]*background-image:none/);
  for (const m of css.matchAll(/img\/plush\/textures\/[a-z-]+\.webp/g)) assert.ok(LIB.has(m[0]), m[0]);
  const used = SITE_FILES.filter(f => f.endsWith('.js')).map(read).join('\n');
  for (const c of ['tx-felt', 'tx-cloud', 'tx-cream', 'tx-ground']) assert.match(used, new RegExp(c), `${c} is applied by the components`);
  assert.doesNotMatch(SITE_FILES.filter(f => f.endsWith('.css') && f !== 'plush-textures.css').map(read).join('\n'), /img\/plush\/textures\//, 'no texture file referenced outside the system');
  const html = read('index.html');
  assert.ok(html.indexOf('plush-textures.css') > html.indexOf('supporting-cast.css') && html.indexOf('plush-textures.css') < html.indexOf('a11y-wave3.css'));
  assert.ok(html.indexOf('plush-cast.js') < html.indexOf('supporting-cast.js') && html.indexOf('supporting-cast.js') < html.indexOf('brand-art.js'));
});

test('the town on #friends: everyone once, children 55 to 65 percent of a grown-up, one height unit', () => {
  const sc = vm.createContext({ window: {}, document: { addEventListener() {} } });
  for (const f of ['plush-cast.js', 'supporting-cast.js']) vm.runInContext(read(f), sc, { filename: f });
  const town = sc.window.FFSupporting.town();
  const shown = [...town.matchAll(/data-plush="([a-z-]+)"/g)].map(m => m[1]);
  assert.deepEqual([...shown].sort(), [...LEADS, ...SUPPORT].sort(), 'all 21, each once');
  assert.match(town, /Everyone here is a story-world character/);
  const P = sc.window.FFPlush;
  for (const k of shown) {
    const s = P.P[k].scale;
    assert.match(town, new RegExp(`--s:${s};[^"]*"><span class="ff-townie-slot"><span class="ff-townie-art"><img[^>]*data-plush="${k}"`), `${k} drawn from its lineup scale`);
    if (P.P[k].age === 'child') assert.ok(s >= 0.55 && s <= 0.65, `${k} child at ${s}`);
  }
  const css = read('supporting-cast.css');
  assert.match(css, /\.ff-townie-art\{display:block;height:calc\(var\(--u\) \* var\(--s\)\);aspect-ratio:var\(--ar\)/, 'height = shared unit x scale; width from the art\'s own ratio');
});

test('the generated lead poses are placed where they fit the pillar', () => {
  const where = {
    'booker-reading': ['family-library.js'], 'booker-waving': ['not-found.js'], 'booker-thinking': ['wayfinding.js'],
    'lumi-calm-breath': ['whole-child.js', 'teacher-standard.js', 'journey.js'], 'lumi-heart-hands': ['whole-child.js'], 'lumi-waving': ['features.js', 'supporting-cast.js'],
    'zuri-magnifier': ['experience.js', 'whole-child.js'], 'zuri-apple': ['whole-child.js'], 'zuri-pointing': ['views.js'],
    'bop-dancing': ['whole-child.js', 'extras.js'], 'bop-running': ['whole-child.js'], 'bop-waving': ['views.js']
  };
  const pose = (src, slug) => { const [k, p] = [slug.split('-')[0], slug.slice(slug.indexOf('-') + 1)]; return src.includes(slug) || new RegExp(`pose\\('${k}', '${p}'\\)|${k}: '${p}'|pose: '${p}'`).test(src); };
  for (const [slug, files] of Object.entries(where)) for (const f of files) assert.ok(pose(read(f), slug), `${slug} in ${f}`);
  const P = plush();
  assert.equal(P.POSES.length, 12);
  for (const s of P.POSES) assert.ok(man.files.some(f => f.kind === 'pose' && f.slug === s), s);
  assert.equal(P.pose('zuri', 'magnifier'), 'zuri-magnifier');
  assert.equal(P.pose('zuri', 'unknown'), 'zuri', 'falls back to the standing art');
});

// ---------- in the browser: labels in context, textures on screen and gone in print, images and CLS ----------
const ROUTES = ['home', 'friends', 'curriculum', 'for-centers', 'for-home', 'for-families', 'at-home', 'teacher-standard', 'train-your-staff', 'academy', 'story-time', 'enroll', 'whole-child', 'bop-at-home', 'family-portal', 'no-such-page'];
let h, site, browser;
test.before(async () => { h = await import('./a11y-harness.mjs'); site = await h.startSite(); browser = await h.loadChromium().launch(); });
test.after(async () => { await browser?.close(); await site?.close(); });

async function visit(width, route, fn) {
  const ctx = await browser.newContext({ viewport: h.SIZES[width], reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.addInitScript(() => { window.__cls = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); });
  await h.goto(page, site.base, route, 600);
  try { return await fn(page); } finally { await ctx.close(); }
}

test('every supporting character appears on the site, always inside a component that says "story-world character"', async () => {
  const seen = new Set();
  for (const r of ROUTES) {
    const out = await visit(1280, r, page => page.evaluate(({ support }) => {
      const res = [];
      for (const img of document.querySelectorAll('#view img[data-plush], #view img[src*="img/plush/characters/"]')) {
        const slug = img.dataset.plush || img.getAttribute('src').match(/characters\/([a-z-]+)-480/)[1];
        if (!support.includes(slug)) continue;
        let el = img, ok = false;
        while (el && el.id !== 'view' && !ok) { ok = /story-world character/i.test(el.textContent || ''); if (/^(SECTION|HEADER|MAIN)$/.test(el.tagName)) break; el = el.parentElement; }
        res.push([slug, ok]);
      }
      return res;
    }, { support: SUPPORT }));
    for (const [slug, ok] of out) { seen.add(slug); assert.ok(ok, `${r}: ${slug} must carry a story-world label in its own component`); }
  }
  for (const s of SUPPORT) assert.ok(seen.has(s), `${s} appears somewhere`);
});

test('textures: on screen in the story-world components, gone in print (and the ground strips hidden)', async () => {
  await visit(1280, 'friends', async page => {
    const screen = await page.evaluate(() => ({
      town: getComputedStyle(document.querySelector('.ff-town')).backgroundImage,
      felt: getComputedStyle(document.querySelector('.ff-community')).backgroundImage,
      ground: getComputedStyle(document.querySelector('.ff-town .tx-ground')).backgroundImage
    }));
    assert.match(screen.town, /cloud-cotton-light-512\.webp/);
    assert.match(screen.felt, /fleece-gray-light-512\.webp/);
    assert.match(screen.ground, /meadow-grass-512\.webp/);
    await page.emulateMedia({ media: 'print' });
    const print = await page.evaluate(() => ({
      tx: [...document.querySelectorAll('.tx-felt,.tx-cloud,.tx-cream,.tx-meadow')].map(e => getComputedStyle(e).backgroundImage),
      ground: [...document.querySelectorAll('.tx-ground')].map(e => getComputedStyle(e).display)
    }));
    assert.ok(print.tx.length > 0 && print.tx.every(b => b === 'none'), 'no texture in print');
    assert.ok(print.ground.length > 0 && print.ground.every(d => d === 'none'), 'no ground strips in print');
  });
});

for (const width of [1280, 390]) {
  test(`no broken images and no layout jumps on the changed pages at ${width}px`, async () => {
    for (const r of ['friends', 'story-time', 'curriculum', 'for-centers', 'enroll', 'whole-child', 'no-such-page']) {
      const res = await visit(width, r, async page => {
        const H = await page.evaluate(() => document.documentElement.scrollHeight);
        for (let y = 0; y < H; y += 700) { await page.evaluate(yy => window.scrollTo(0, yy), y); await page.waitForTimeout(60); }
        await page.waitForTimeout(400);
        return page.evaluate(() => ({ cls: window.__cls, broken: [...document.images].filter(i => i.complete && i.naturalWidth === 0 && i.getAttribute('src')).map(i => i.getAttribute('src')),
          stretched: [...document.querySelectorAll('#view img[data-plush]')].filter(i => i.offsetWidth && i.offsetHeight && getComputedStyle(i).objectFit !== 'contain' && Math.abs(i.offsetWidth / i.offsetHeight - i.naturalWidth / i.naturalHeight) > 0.02).map(i => i.dataset.plush) }));
      });
      assert.deepEqual(res.broken, [], `${r}: broken images`);
      assert.deepEqual(res.stretched, [], `${r}: stretched character art`);
      assert.ok(res.cls <= 0.1, `${r}: CLS ${res.cls.toFixed(3)}`);
    }
  });
}
