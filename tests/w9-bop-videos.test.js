// Wave 9 (owner 2026-10-07): the six titled Bop at Home activity videos (~/futures-friends-video/web-activities) on their #bop-at-home
// cards, and the same player (captions.js actPlayer, ONE helper) on the matching Futures at Home activity cards and the "Ready? Bop &
// Go!" picture guide. The friend chip on an open activity card is a real link (Bop -> that activity's video card on #bop-at-home).
// Durations agree across both lists. Talking videos never autoplay: native controls, captions by default, preload none.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const SLUGS = ['elephant-stomp', 'trunk-reach', 'freeze-try-again', 'animal-walks', 'flamingo-balance', 'clap-back'];
const C = require(path.join(ROOT, 'captions.js'));
const F = require(path.join(ROOT, 'family-library-data.js'));
const wholeChild = () => {
  const window = { FFhooks: [], FF_INTAKE: { url: '' }, FFCaptions: C };
  const context = vm.createContext({ console, window, setTimeout: () => 0, clearTimeout() {}, innerHeight: 800, FormData, URLSearchParams,
    document: { addEventListener() {}, getElementById: () => null, createElement: () => ({}), head: { appendChild() {} }, querySelector: () => null, querySelectorAll: () => [] } });
  for (const f of ['data.js', 'plush-cast.js', 'supporting-cast.js', 'views.js', 'whole-child.js']) vm.runInContext(read(f), context, { filename: f });
  return context.window.FFWholeChild;
};

test('every titled video, poster and caption file is in video/, registered with captions and a transcript', () => {
  assert.deepEqual(Object.keys(C.BOP_ACTS), SLUGS);
  for (const s of SLUGS) {
    const v = C.BOP_ACTS[s];
    assert.equal(v.src, `video/act-${s}.mp4?v=2`); assert.equal(v.poster, `video/act-${s}-poster.jpg?v=2`);
    for (const f of [`video/act-${s}.mp4`, `video/act-${s}-poster.jpg`, `video/act-${s}.en.vtt`]) assert.ok(fs.statSync(path.join(ROOT, f)).size > 500, f);
    assert.match(read(`video/act-${s}.en.vtt`), /^WEBVTT/);
    assert.ok(C.has(v.src), s + ' has captions');
    assert.match(C.CAPS[`video/act-${s}.mp4`].transcript, /^\[Title card\] Futures Friends\. Movement break: [\s\S]+\[End card\] /, s + ' transcript, title card to end card');
  }
});

test('the one player: native controls, no autoplay, preload none, captions on by default, transcript, honest label', () => {
  const html = C.actPlayer('freeze-try-again', 'Freeze & Try Again');
  assert.match(html, /<video controls playsinline preload="none" width="1280" height="720" poster="video\/act-freeze-try-again-poster\.jpg\?v=2"/);
  assert.doesNotMatch(html, /autoplay|muted|loop/);
  assert.match(html, /<track kind="captions" srclang="en" label="English" src="video\/act-freeze-try-again\.en\.vtt" default>/);
  assert.match(html, /Watch Bop do it with you &middot; story-world animation/);
  assert.match(html, /<details class="ffcap-tr">/);
  assert.equal(C.actPlayer('nope'), '');
  // one helper: neither page writes its own <video> markup for these clips
  for (const f of ['whole-child.js', 'family-library.js']) { assert.match(read(f), /FFCaptions\.actPlayer\(/, f); assert.doesNotMatch(read(f), /video\/act-/, f + ' has no clip paths of its own'); }
});

test('#bop-at-home: each of the six activity cards carries its own video; durations stay as the owner set them', () => {
  const W = wholeChild();
  const want = { 'Elephant Stomp & Sway': ['elephant-stomp', 3], 'Trunk Reach': ['trunk-reach', 0.5], 'Freeze & Try Again': ['freeze-try-again', 2], 'Animal Walks': ['animal-walks', 3], 'Flamingo Balance': ['flamingo-balance', 2.5], 'Clap-Back Rhythm': ['clap-back', 3] };
  for (const [t, [vid, min]] of Object.entries(want)) { const a = W.ACTS.find(x => x.t === t); assert.ok(a, t); assert.equal(a.vid, vid, t); assert.equal(a.min, min, t); }
  assert.ok(read('whole-child.js').includes("const BOP_VIDEO = 'video/bop-move-along.mp4?v=2'"), 'the standalone Move along with Bop player stays as it is');
});

test('Futures at Home: the same activities carry the same video and the same minutes as Bop at Home; Bop & Go! gets Elephant Stomp', () => {
  const W = wholeChild();
  const pairs = [['freeze-and-try-again', 'Freeze & Try Again', 'freeze-try-again'], ['animal-walks', 'Animal Walks', 'animal-walks'], ['flamingo-balance', 'Flamingo Balance', 'flamingo-balance']];
  for (const [id, t, vid] of pairs) {
    const a = F.ACTS.find(x => x.id === id), b = W.ACTS.find(x => x.t === t);
    assert.equal(a.vid, vid, id); assert.equal(a.min, b.min, `${id}: ${a.min} min here, ${b.min} on Bop at Home`);
  }
  assert.equal(F.GUIDES.find(g => g.id === 'bop-and-go').vid, 'elephant-stomp');
});

// ---------------------------------------------------------------- real browser
const H = () => import('./a11y-harness.mjs');
let h, site, browser;
test.before(async () => { h = await H(); site = await h.startSite(); browser = await h.loadChromium().launch(); });
test.after(async () => { if (browser) await browser.close(); if (site) await site.close(); });

for (const width of [390, 1280]) {
  test(`${width}px: the videos are on their cards and detail views, nothing plays or loads by itself; the Bop chip goes to the video`, async () => {
    const { ctx, page, errors } = await h.open(browser, width, { motion: true });
    const urls = []; page.on('request', r => urls.push(r.url()));
    await h.goto(page, site.base, 'bop-at-home', 600);
    const cards = await page.evaluate(() => [...document.querySelectorAll('.wc-act')].filter(a => a.querySelector('video')).map(a => { const v = a.querySelector('video'), t = v.textTracks[0]; return [a.id, v.paused, v.preload, v.autoplay, v.controls, t && t.kind, t && t.mode]; }));
    assert.deepEqual(cards.map(c => c[0]), ['bop-act-elephant-stomp', 'bop-act-trunk-reach', 'bop-act-freeze-try-again', 'bop-act-animal-walks', 'bop-act-flamingo-balance', 'bop-act-clap-back']);
    for (const c of cards) assert.deepEqual(c.slice(1), [true, 'none', false, true, 'captions', 'showing'], c[0]);
    assert.deepEqual(urls.filter(u => /video\/act-[\w-]+\.mp4/.test(u)), [], 'no clip is fetched before play');
    // Futures at Home detail views
    for (const [id, vid] of [['freeze-and-try-again', 'freeze-try-again'], ['animal-walks', 'animal-walks'], ['flamingo-balance', 'flamingo-balance']]) {
      await h.goto(page, site.base, 'activities/' + id, 400);
      const d = await page.evaluate(id => { const el = document.querySelector('#fl-one #act-' + id), f = el && el.querySelector('.fl-act-bd > .wc-actvid'), a = el && el.querySelector('.fl-act-bd a.fl-chiplink'); return { open: el && el.open, vid: f && f.dataset.bopAct, first: f && f === el.querySelector('.fl-act-bd').firstElementChild, src: f && f.querySelector('source').getAttribute('src'), href: a && a.getAttribute('href'), name: a && a.textContent.replace(/\s+/g, ' ').trim(), visible: a && a.getBoundingClientRect().height > 0 }; }, id);
      assert.deepEqual(d, { open: true, vid, first: true, src: `video/act-${vid}.mp4?v=2`, href: `#bop-at-home/bop-act-${vid}`, name: 'Bop · MOVE: watch Bop do it at Bop at Home →', visible: true }, id);
    }
    // the chip is a working link: it opens Bop at Home at that activity's video card
    await page.click('#fl-one a.fl-chiplink'); await page.waitForTimeout(500);
    const land = await page.evaluate(() => { const el = document.getElementById('bop-act-flamingo-balance'), r = el && el.getBoundingClientRect(); return [location.hash, !!el && r.top < innerHeight && r.bottom > 0, document.activeElement === el]; });
    assert.deepEqual(land, ['#bop-at-home/bop-act-flamingo-balance', true, true]);
    // another friend's chip goes to the library filtered to that friend
    await h.goto(page, site.base, 'activities/ice-detectives', 400);
    const z = await page.evaluate(() => { const a = document.querySelector('#fl-one a.fl-chiplink'); return [a.getAttribute('href'), a.textContent.replace(/\s+/g, ' ').trim()]; });
    assert.equal(z[0], '#activities/zuri'); assert.match(z[1], /^Zuri · .+: all Zuri's activities →$/);
    await page.click('#fl-one a.fl-chiplink'); await page.waitForTimeout(400);
    assert.match(await page.textContent('#flActList .fl-meta[role=status]'), /with Zuri$/);
    // the Bop & Go! picture guide
    await h.goto(page, site.base, 'see-how', 400);
    assert.equal(await page.evaluate(() => { const f = document.querySelector('#guide-bop-and-go .wc-actvid'); return f && f.querySelector('source').getAttribute('src'); }), 'video/act-elephant-stomp.mp4?v=2');
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}

test('a Bop activity video plays on request with its captions', async () => {
  const { ctx, page, errors } = await h.open(browser, 390, { motion: true });
  await h.goto(page, site.base, 'activities/freeze-and-try-again', 400);
  await page.click('#fl-one .wc-actvid video');
  await page.evaluate(() => document.querySelector('#fl-one .wc-actvid video').play());
  await page.waitForFunction(() => { const v = document.querySelector('#fl-one .wc-actvid video'); return !v.paused && v.readyState >= 2; }, null, { timeout: 8000 });
  assert.equal(await page.evaluate(() => document.querySelector('#fl-one .wc-actvid video').textTracks[0].mode), 'showing');
  assert.deepEqual(errors, []);
  await ctx.close();
});
