'use strict';
// Wave 6 lane HERO (owner 2026-10-06): "Booker should be in the middle cause he's our main character ... maybe they hop in from the
// background, the elephant walks in from the side ... can we get a little bit of motion in the background ... the [titling] for the
// Futures Friends, I want to use that plush fluffy logo style ... they have to know that we did more." Plus his screenshot: the four
// hero friends did not share a ground line (Zuri floated higher, her name and pills sat higher than the others).
// Encodes, in VM and in real headless Chromium (harness as tests/a11y.test.js):
//  - Booker is the center and front character (his center = the stage center; his art is the tallest; he holds the tab stop);
//  - every hero friend stands on ONE ground line and the names/pills sit in one row (measured at 1280, 1024 and 390 px);
//  - reduced motion shows the final composed state with zero animations and fetches no action stills;
//  - the h1 is the plush logo with the accessible name "Futures Friends";
//  - every number in "What we have built" equals a value computed here from the repo's own files, and links to the thing itself;
//  - the pick-a-friend stage is a real tab list (keyboard and screen reader), and its activity is a real family-library entry;
//  - Home keeps <= 25 links and no downloads; axe finds nothing serious or critical at 1280 and 390; no layout shift while the
//    entrance plays (CLS <= 0.1) and the LCP is the meadow plate or the logo;
//  - every new hero file is in the plush manifest with its generated source's SHA-256.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const man = JSON.parse(read('img/plush/manifest.json'));

// The page-level scripts Home's markup needs, in a VM (as the browser loads them).
function site() {
  const ctx = { console };
  ctx.window = ctx;
  vm.createContext(ctx);
  const CH = read('views.js').match(/const CH = (\{[\s\S]*?\}\});/)[1];
  vm.runInContext(`var CH = ${CH}; var V = {}; var FFH_LOOP = ${read('views.js').match(/const FFH_LOOP = (\[[\s\S]*?\]\]);/)[1]};`, ctx);
  for (const f of ['data.js', 'release-manifest.js', 'family-library-data.js', 'ff-motion.js', 'plush-cast.js', 'meadow-hero.js', 'brand-art.js', 'home-calm.js'])
    vm.runInContext(read(f), ctx, { filename: f });
  return ctx;
}

// ---------------------------------------------------------------- proof band: every number from the repo's own files
test('"What we have built": every number equals a value computed from the repo files, with an honest stage and a real page', () => {
  const S = site(), d = S.FFHomeCalm.proofData();
  const by = Object.fromEntries(d.map(x => [x.id, x]));
  assert.ok(d.length >= 4 && d.length <= 6, `one band, at most six tiles (${d.length})`);
  // 1. Unit 1 teaching days: the generated Unit 1 release data (unit1-data.js, from the CRM's canonical day records). Since the IP
  //    lockdown (2026-10-07) that file is private (tests/private-curriculum.js); the public gate's summary count must equal it.
  const PC = require('./private-curriculum');
  const gate = (() => { const c = { window: {} }; vm.createContext(c); vm.runInContext(read('curriculum-gate.js'), c); return c.window.FFGate.U1; })();
  assert.equal(by.unit1.n, gate.days, 'Unit 1 days (public summary)');
  if (PC.has('unit1-data.js')) assert.equal(by.unit1.n, JSON.parse(PC.readPriv('unit1-data.js').match(/window\.FFUnit1Data = (\{[\s\S]*\});?\s*$/)[1]).counts.days, 'Unit 1 days (private release data)');
  assert.equal(by.unit1.n, 20);
  // 2. family activities: the family library's own list
  const fam = (() => { const c = {}; c.window = c; vm.createContext(c); vm.runInContext(read('family-library-data.js'), c); return c.FFFamily; })();
  assert.equal(by.activities.n, fam.ACTS.length, 'family activities');
  // 3. family printables: the PDFs on disk (English printables/*.pdf + Spanish printables/es/*.pdf)
  const pdfs = dir => fs.readdirSync(path.join(ROOT, dir)).filter(f => f.endsWith('.pdf')).length;
  assert.equal(by.printables.n, pdfs('printables') + pdfs('printables/es'), 'family printables on disk');
  assert.equal(by.printables.line, `${pdfs('printables')} in English and ${pdfs('printables/es')} in Spanish`);
  // 4. storybooks: the family library's books, and those free to read along now
  assert.equal(by.books.n, fam.BOOKS.length, 'storybooks');
  assert.equal(by.books.line, `${fam.BOOKS.filter(b => b.status === 'full').length} free to read along today`);
  assert.equal(by.books.stage, 'In development', 'books are labelled in development (release manifest: in_development)');
  // 5. story-world characters: the plush manifest's characters (one per slug; poses are not extra characters)
  assert.equal(by.characters.n, new Set(man.files.filter(f => f.kind === 'character').map(f => f.slug)).size, 'characters in the plush library');
  assert.match(by.characters.line, /proposals/, 'proposed names are said to be proposals');
  // 6. training modules: the Academy catalog the site itself carries (data.js FF.modules)
  assert.equal(by.training.n, S.FF.modules.length, 'Academy modules');
  assert.match(by.training.stage, /^Draft, not yet state approved$/);
  // the release manifest the site ships agrees with its source in the platform repo when that repo is mounted
  const src = '/Volumes/FFCRM/app/docs/release/ASSET_MANIFEST.json';
  if (fs.existsSync(src)) {
    const A = Object.fromEntries(JSON.parse(fs.readFileSync(src, 'utf8')).assets.map(a => [a.id, a.count]));
    assert.equal(by.unit1.n, A['curriculum-unit1-days']); assert.ok(by.activities.n <= A['family-library'], 'activities: the platform manifest predates the ages 2 to 5 sweep (27 now), so it may only be higher');
    assert.equal(by.printables.n, A['printables-family-en'] + A['printables-family-es']); assert.equal(by.training.n, A['training-catalog']);
  }
  // every tile links to the thing itself: a page on this site, never a download or a portal (Home rules). Wave 7 GATE (owner
  // 2026-10-06): #unit-1 is now the public curriculum summary, so the Unit 1 tile links there (was #curriculum); never a day.
  assert.equal(by.unit1.href, '#unit-1');
  assert.match(by.unit1.stage, /^Draft, summary free to read$/);
  for (const x of d) {
    assert.match(x.href, /^#[a-z0-9-]+$/, x.id);
    assert.doesNotMatch(x.href, /unit-1\/|signin|portal|hub|learn|\.pdf/, x.id);
    if (x.id !== 'unit1') assert.doesNotMatch(x.href, /unit-1/, x.id);
    assert.ok(x.stage, `${x.id} carries its stage`);
  }
  const html = S.FFHomeCalm.proof();
  for (const x of d) assert.match(html, new RegExp(`data-proof-id="${x.id}"[^]*?data-count="${x.n}">${x.n}</span><span class="ffa-sr">${x.n} </span>`), `${x.id} renders its number (and reads it out once)`);
  assert.doesNotMatch(html, /download|\.pdf/i);
});

test('pick a friend: a real tab list, one tab stop, each friend with a real family-library activity and its real minutes', () => {
  const S = site(), html = S.FFHomeCalm.friends();
  assert.match(html, /role="tablist" aria-label="Pick a friend"/);
  const tabs = html.match(/<button type="button" role="tab"[^>]*>/g);
  assert.equal(tabs.length, 4);
  assert.deepEqual(tabs.map(t => /tabindex="(-?\d)"/.exec(t)[1]), ['0', '-1', '-1', '-1'], 'one tab stop');
  assert.ok(tabs.every(t => /aria-controls="hc-pickpanel"/.test(t)));
  assert.match(html, /role="tabpanel" aria-labelledby="hc-pick-booker" tabindex="0"/);
  const fam = S.FFFamily;
  for (const [k, [pose, id]] of Object.entries(S.FFHomeCalm.PICKS)) {
    const a = fam.ACTS.find(x => x.id === id);
    assert.ok(a, `${k}: ${id} is in the family library`);
    assert.equal(a.c, k, `${id} is ${k}'s activity`);
    assert.ok(S.FFPlush.has(pose), `${pose} is a plush library pose`);
    const p = S.FFHomeCalm.pickPanel(k);
    const t = Math.round(a.min * 60), len = t % 60 ? (t < 60 ? t + ' seconds' : Math.floor(t / 60) + ' min ' + (t % 60) + ' sec') : t / 60 + ' minutes';
    assert.ok(p.includes(len), `${k}: the length comes from the activity (${len})`);
    assert.match(p, new RegExp(`href="#activities/${id}"`));
    assert.doesNotMatch(p, /3-minute|three-minute/i, 'no made-up length');
  }
});

test('hero markup: the plush logo is the h1 (accessible name "Futures Friends"); Booker stands center, in front, holding the tab stop', () => {
  const S = site();
  assert.match(S.FFMeadow.logo(), /^<img class="mh-logo-img" [^>]*alt="Futures Friends"/);
  const premium = read('premium.js');
  const hero = premium.slice(premium.indexOf('V.home=()=>'), premium.indexOf('${window.FFHomeCalm'));
  assert.match(hero, /<h1\$\{MH\(\)\?' class="mh-logo"':''\}>\$\{MH\(\)\?window\.FFMeadow\.logo\(\):'Futures Friends'\}<\/h1>/, 'h1 = the plush logo (text fallback without the meadow)');
  const C = S.FFArt.CAST;
  assert.deepEqual(Array.from(C, c => c.k), ['bop', 'lumi', 'booker', 'zuri']);
  const bk = C.find(c => c.k === 'booker');
  assert.deepEqual(Array.from(bk.x), [50, 51], 'Booker at the center of the stage');
  assert.ok(C.every(c => c === bk || c.kh < bk.kh), 'Booker is the largest (front)');
  assert.ok(C.every(c => c === bk || c.z < bk.z), 'Booker is in front');
  const stage = S.FFArt.homeStage();
  assert.match(stage, /data-k="booker" data-motto="[^"]*" aria-pressed="false" tabindex="0"/);
  assert.equal((stage.match(/tabindex="0"/g) || []).length, 1);
  // the world is decorative and has no text of its own
  const w = S.FFMeadow.world() + S.FFMeadow.front();
  assert.match(w, /^<div class="mh-world" aria-hidden="true">/);
  assert.ok((w.match(/<img /g) || []).every(() => true) && !/alt="[^"]/.test(w), 'every world layer has alt=""');
});

test('plush manifest: the hero layers and hero poses are listed with their generated source\'s SHA-256; standing poses stand on the baseline', () => {
  const hero = man.files.filter(f => f.kind === 'hero-layer' || f.kind === 'hero-pose');
  const slugs = new Set(hero.map(f => f.slug));
  for (const s of ['plush-logo', 'meadow-plate', 'felt-sun', 'felt-cloud-1', 'felt-cloud-2', 'felt-cloud-3', 'felt-cloud-4', 'meadow-front', 'booker-hero', 'lumi-hop', 'zuri-peek', 'bop-walk-in'])
    assert.ok(slugs.has(s), s);
  const receipts = path.join(process.env.HOME || '', 'Downloads/FUTURES_FRIENDS_PROJECT/05_Brand_and_Art/plush-generated/RECEIPTS.json');
  const R = fs.existsSync(receipts) ? Object.fromEntries(JSON.parse(fs.readFileSync(receipts, 'utf8')).map(r => [r.output.replace(process.env.HOME, '~'), r.output_sha256])) : null;
  for (const f of hero) {
    assert.match(f.source_sha256, /^[0-9a-f]{64}$/, f.path);
    assert.match(f.source, /plush-generated\/hero\//, f.path);
    if (R) assert.equal(f.source_sha256, R[f.source], `${f.path}: the receipt's SHA-256`);
    assert.ok(f.bytes < 300e3, `${f.path} ${f.bytes} bytes`);
  }
  // the code reads the same sizes the manifest declares
  const P = site().FFPlush;
  for (const s of P.HERO_POSES) {
    const f = man.files.find(x => x.path === `img/plush/characters/${s}-480.webp`);
    assert.equal(P.P[s].w480, f.width, s);
    assert.equal(f.kind, 'hero-pose');
  }
  assert.ok(man.files.filter(f => f.kind === 'hero-pose' && f.slug === 'lumi-hop').every(f => f.stance === 'airborne'));
  assert.ok(man.files.filter(f => f.kind === 'hero-pose' && f.slug === 'booker-hero').every(f => f.stance === 'standing'));
});

// ---------------------------------------------------------------- real browser
const H = () => import('./a11y-harness.mjs');
let h, srv, browser;
test.before(async () => { h = await H(); srv = await h.startSite(); browser = await h.loadChromium().launch(); });
test.after(async () => { await browser.close(); await srv.close(); });

const measure = page => page.evaluate(() => {
  const st = document.querySelector('.mh-stage').getBoundingClientRect();
  const figs = [...document.querySelectorAll('.mh-stage .ffa-fig')].map(f => {
    const img = f.querySelector('.ffa-cut').getBoundingClientRect(), cap = f.querySelector('figcaption').getBoundingClientRect(), b = f.querySelector('figcaption b').getBoundingClientRect();
    return { k: f.dataset.k, bottom: img.bottom, top: img.top, h: img.height, cx: img.left + img.width / 2, cap: cap.top, name: b.top, nameMid: b.top + b.height / 2 };
  });
  return { stage: { cx: st.left + st.width / 2, w: st.width }, figs, vw: innerWidth };
});

for (const [w, ht] of [[1280, 800], [1024, 768], [390, 844]]) {
  test(`hero at ${w}px: Booker center and front, every friend on one ground line, names and pills in one row`, async () => {
    const ctx = await browser.newContext({ viewport: { width: w, height: ht }, reducedMotion: 'reduce' });
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
    await h.goto(page, srv.base, 'home', 500);
    await page.waitForFunction(() => [...document.querySelectorAll('.mh-stage .ffa-cut')].every(i => i.complete && i.naturalWidth));
    const m = await measure(page);
    assert.deepEqual(m.figs.map(f => f.k), ['bop', 'lumi', 'booker', 'zuri']);
    const bk = m.figs.find(f => f.k === 'booker');
    assert.ok(Math.abs(bk.cx - m.vw / 2) <= m.vw * 0.015, `Booker's center ${bk.cx.toFixed(1)} is the middle of the screen (${m.vw / 2})`);
    for (const f of m.figs) if (f !== bk) assert.ok(bk.h > f.h, `Booker (${bk.h.toFixed(0)}px) is taller than ${f.k} (${f.h.toFixed(0)}px): front`);
    const bottoms = m.figs.map(f => f.bottom), caps = m.figs.map(f => f.cap), names = m.figs.map(f => f.nameMid);
    assert.ok(Math.max(...bottoms) - Math.min(...bottoms) <= 1, `one ground line: ${bottoms.map(b => b.toFixed(1)).join(', ')}`);
    assert.ok(Math.max(...caps) - Math.min(...caps) <= 1, `caption row: ${caps.map(b => b.toFixed(1)).join(', ')}`);
    assert.ok(Math.max(...names) - Math.min(...names) <= 1, `names in one row: ${names.map(b => b.toFixed(1)).join(', ')}`);
    // the friends stand on the meadow, inside the hero, and the whole cast fits the width
    const box = await page.$eval('.mh-hero', e => { const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; });
    assert.ok(Math.max(...bottoms) < box.bottom, 'feet inside the hero');
    assert.ok(m.figs.every(f => f.cx > 0 && f.cx < m.vw), 'every friend on screen');
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}

test('reduced motion: the final composed hero at once, zero animations, no action stills fetched, nothing hidden', async () => {
  for (const w of [1280, 390]) {
    const ctx = await browser.newContext({ viewport: h.SIZES[w], reducedMotion: 'reduce' });
    const page = await ctx.newPage(); const fetched = []; page.on('request', r => fetched.push(r.url()));
    await h.goto(page, srv.base, 'home', 900);
    const s = await page.evaluate(() => ({
      anims: document.getAnimations().length,
      live: document.querySelectorAll('.ffm-live').length,
      poses: document.querySelectorAll('.ffm-pose').length,
      hidden: [...document.querySelectorAll('.mh-hero img, .mh-stage figcaption, .mh-card p')].filter(e => { const c = getComputedStyle(e); return c.opacity !== '1' || c.visibility !== 'visible'; }).length,
      transforms: [...document.querySelectorAll('.mh-stage .ffa-friend, .mh-stage .ffa-hop')].map(e => getComputedStyle(e).transform).filter(t => t !== 'none').length
    }));
    assert.deepEqual(s, { anims: 0, live: 0, poses: 0, hidden: 0, transforms: 0 }, `${w}px`);
    assert.ok(!fetched.some(u => /(lumi-hop|zuri-peek|bop-walk-in)-\d+\.webp/.test(u)), 'the action stills are never downloaded with motion off');
    await ctx.close();
  }
});

test('the h1 is the plush logo with the accessible name "Futures Friends"', async () => {
  const ctx = await browser.newContext({ viewport: h.SIZES[1280], reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await h.goto(page, srv.base, 'home', 400);
  assert.equal(await page.getByRole('heading', { level: 1, name: 'Futures Friends', exact: true }).count(), 1);
  assert.equal(await page.locator('#view h1').count(), 1);
  assert.equal(await page.locator('#view h1 img[alt="Futures Friends"]').count(), 1);
  assert.ok(await page.$eval('#view h1 img', i => i.complete && i.naturalWidth > 0), 'the logo loads');
  await ctx.close();
});

test('motion: the entrance plays once, ends composed on the ground line, never shifts the layout, and the LCP is the plate or the logo', async () => {
  for (const [w, vp] of [[1280, { width: 1280, height: 800 }], [390, { width: 390, height: 844 }]]) {
    const ctx = await browser.newContext({ viewport: vp, reducedMotion: 'no-preference' });
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => {
      window.__cls = 0; window.__lcp = null;
      new PerformanceObserver(l => l.getEntries().forEach(e => { if (!e.hadRecentInput) window.__cls += e.value; })).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver(l => { const e = l.getEntries().pop(); window.__lcp = e && e.element ? e.element.className : null; }).observe({ type: 'largest-contentful-paint', buffered: true });
    });
    await page.goto(`${srv.base}?fresh=w6-${Date.now()}#home`);
    await page.waitForFunction(() => document.getAnimations().some(a => a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('.ffa-friend')), null, { timeout: 5000 });
    const started = await page.evaluate(() => [...new Set(document.getAnimations().filter(a => a.effect.target.classList && a.effect.target.classList.contains('ffa-friend')).map(a => a.effect.target.dataset.k))]);
    assert.deepEqual(started, ['bop', 'lumi', 'zuri', 'booker'], 'Bop walks in, Lumi hops, Zuri springs up, Booker last');
    // Wave 7: the world's fly-through opening (hero-world.js) plays first and the cast waits for the camera (FFHeroWorld lead), so
    // the entrance ends that much later (was a flat 3300 ms wait).
    await page.waitForTimeout(3300 + await page.evaluate(() => (window.FFHeroWorld ? window.FFHeroWorld.LEAD + 700 : 0)));
    const end = await page.evaluate(() => ({
      cls: window.__cls, lcp: window.__lcp,
      running: document.getAnimations().filter(a => a.effect.target.closest && a.effect.target.closest('.ffa-friend') && !(a instanceof CSSAnimation)).length,
      friends: [...document.querySelectorAll('.mh-stage .ffa-friend')].map(e => getComputedStyle(e).transform),
      poses: [...document.querySelectorAll('.mh-stage .ffm-pose')].map(e => getComputedStyle(e).opacity)
    }));
    assert.ok(end.cls <= 0.1, `${w}px CLS ${end.cls}`);
    assert.match(String(end.lcp), /mh-plate|mh-logo-img/, `${w}px LCP element ${end.lcp}`);
    assert.equal(end.running, 0, 'the entrance is over');
    assert.ok(end.friends.every(t => t === 'none'), 'every friend back on its mark');
    assert.ok(end.poses.every(o => o === '0'), 'the action stills handed over to the standing art');
    // a second render of Home in the same visit does not replay it
    await page.evaluate(() => { location.hash = '#friends'; });
    await page.waitForTimeout(300);
    await page.evaluate(() => { location.hash = '#home'; });
    await page.waitForTimeout(400);
    assert.equal(await page.evaluate(() => document.getAnimations().filter(a => a.effect.target.classList && a.effect.target.classList.contains('ffa-friend')).length), 0, 'once per visit');
    assert.deepEqual(errors, []);
    await ctx.close();
  }
});

test('pick a friend works by keyboard and by tap; the proof numbers on the page are the repo numbers; Home keeps <= 25 links and no downloads', async () => {
  const ctx = await browser.newContext({ viewport: h.SIZES[390], reducedMotion: 'reduce' });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await h.goto(page, srv.base, 'home', 500);
  await page.focus('#hc-pick-booker');
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'hc-pick-lumi');
  assert.equal(await page.getAttribute('#hc-pick-lumi', 'aria-selected'), 'true');
  assert.equal(await page.getAttribute('#hc-pickpanel', 'aria-labelledby'), 'hc-pick-lumi');
  assert.match(await page.textContent('#hc-pickpanel'), /Lumi[\s\S]*Try one tonight: Smell the Flower, Blow the Candle[\s\S]*3 minutes/);
  await page.keyboard.press('End');
  assert.equal(await page.getAttribute('#hc-pick-bop', 'aria-selected'), 'true');
  await page.click('#hc-pick-zuri');
  assert.match(await page.textContent('#hc-pickpanel'), /Zuri[\s\S]*Ice Detectives/);
  assert.deepEqual(await page.$$eval('[role=tab]', t => t.map(x => x.tabIndex)), [-1, -1, 0, -1], 'roving tab stop follows the choice');
  // proof numbers: the page shows exactly what the repo files say
  const S = site(), want = Object.fromEntries(S.FFHomeCalm.proofData().filter(x => S.FFHomeCalm.FAMILY_PROOF.includes(x.id)).map(x => [x.id, x.n]));   // Home (families) shows the family tiles; #centers the full set
  const got = await page.$$eval('[data-proof-id]', t => Object.fromEntries(t.map(x => [x.dataset.proofId, +x.querySelector('.ffa-sr').textContent.trim()])));
  assert.deepEqual(got, want);
  const f = await page.evaluate(() => { const v = document.querySelector('#view'), a = [...v.querySelectorAll('a[href]')]; return { links: a.length, dl: a.filter(x => x.hasAttribute('download') || /\.(pdf|zip|docx?|csv)(\?|#|$)/i.test(x.getAttribute('href'))).length }; });
  assert.ok(f.links <= 25, `${f.links} links`);
  assert.equal(f.dl, 0);
  assert.deepEqual(errors, []);
  await ctx.close();
});

for (const w of [1280, 390]) {
  test(`axe on the new Home at ${w}px: nothing serious or critical`, async () => {
    const ctx = await browser.newContext({ viewport: h.SIZES[w], reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await h.goto(page, srv.base, 'home', 600);
    const v = (await h.axe(page)).filter(x => h.BLOCKING.includes(x.impact));
    assert.deepEqual(v, []);
    await ctx.close();
  });
}

// ---------------------------------------------------------------- research items folded in (coordinator, 2026-10-06)
test('Booker\'s dialogue card: three lines by the next button only, three ways in (FFAudience when present), never over a button, Esc closes', async () => {
  for (const w of [1280, 390]) {
    const ctx = await browser.newContext({ viewport: h.SIZES[w], reducedMotion: 'reduce' });
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
    // the NAV lane's real FFAudience (frozen) replaces any stub, so record the hand-off through its documented ff:audience event
    await page.addInitScript(() => { window.__aud = []; document.addEventListener('ff:audience', e => window.__aud.push(e.detail && e.detail.audience)); });
    await h.goto(page, srv.base, 'home', 500);
    await page.click('.ffa-friend[data-k=booker]');
    const status = () => page.textContent('.mh-stage [role=status]');
    assert.equal(await status(), "Booker: Hi! I'm Booker. I love to learn, even when it's tricky!");
    await page.waitForTimeout(1200);
    assert.equal(await status(), "Booker: Hi! I'm Booker. I love to learn, even when it's tricky!", 'never auto-advances');
    await page.click('.mh-saynext');
    await page.click('.mh-saynext');
    assert.equal(await status(), 'Booker: Are you a family, a center, or a teacher?');
    assert.deepEqual(await page.$$eval('.mh-sayaskbtn', a => a.map(x => [x.textContent.trim(), x.getAttribute('href')])), [['A family', '#for-families'], ['A center', '#for-centers'], ['A teacher', '#teacher-standard']]);
    const covered = await page.evaluate(() => {
      const say = document.querySelector('.mh-say').getBoundingClientRect();
      return [...document.querySelectorAll('.mh-hero a, .mh-hero button')].filter(x => !x.closest('.mh-say')).map(x => [x.textContent.trim().slice(0, 20), x.getBoundingClientRect()]).filter(([, q]) => !(q.right <= say.left || q.left >= say.right || q.bottom <= say.top || q.top >= say.bottom)).map(([t]) => t);
    });
    assert.deepEqual(covered, [], `${w}px: the card covers no button or link`);
    await page.keyboard.press('Escape');
    assert.equal(await page.$eval('.mh-say', e => e.hidden), true, 'Escape closes it');
    // routing: the audience is handed to the navigation lane, then the link navigates
    await page.click('.ffa-friend[data-k=booker]'); await page.click('.mh-saynext'); await page.click('.mh-saynext');
    await page.click('.mh-sayaskbtn[href="#for-centers"]');
    await page.waitForTimeout(300);
    assert.deepEqual(await page.evaluate(() => window.__aud), ['centers']);
    assert.match(await page.evaluate(() => location.hash), /^#for-centers/);
    assert.deepEqual(errors, []);
    await ctx.close();
  }
});

test('motion off: doors keep their stitch drawn, headings are never held back, the footer friends stand still and are named links', async () => {
  const ctx = await browser.newContext({ viewport: h.SIZES[1280], reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await h.goto(page, srv.base, 'home', 500);
  const s = await page.evaluate(() => ({
    stitch: [...document.querySelectorAll('.hc-stitch-mask')].map(m => getComputedStyle(m).strokeDashoffset),
    doorLinks: [...document.querySelectorAll('.hc-door')].map(d => d.querySelectorAll('a[href]').length),
    wait: document.querySelectorAll('.hc-stitch-wait, .is-waiting').length,
    foot: [...document.querySelectorAll('body > .ff-footscene + footer')].length,
    friends: [...document.querySelectorAll('.ff-footscene a.ff-footfriend')].map(a => [a.textContent.trim(), a.getAttribute('href')]),
    kinetic: [...document.querySelectorAll('[data-kinetic] [data-k]')].map(w => getComputedStyle(w).opacity)
  }));
  assert.deepEqual(s.stitch, ['0px', '0px', '0px'], 'the stitched borders are simply there');
  assert.deepEqual(s.doorLinks, [1, 1, 1], 'each door stays one labelled link');
  assert.equal(s.wait, 0, 'nothing waits for an animation');
  assert.equal(s.foot, 1, 'the friends\' strip sits directly above the footer, in its own element');
  assert.deepEqual(s.friends, [['Move with Bop', '#bop-at-home'], ['Belong with Lumi', '#whole-child'], ['Learn with Booker', '#story-time'], ['Explore with Zuri', '#activities']]);
  assert.ok(s.kinetic.every(o => o === '1'), 'the kinetic line is fully there');
  await ctx.close();
});
