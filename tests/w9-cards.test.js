// Wave 9 CARDS (owner 2026-10-07: "These are missed opportunities — all these characters like this need to be animated and need
// to do something special"). The ONE story-world card component (FFSupporting.guide, plus cameo() and the town) comes alive:
// entrance hop + stitched border + the line writing on (text never below 60% opacity), a living idle, a signature action per
// character on tap with an ff:sfx, and an optional talking-clip slot (CLIPS map, empty now). Every word, the label, the layout,
// role="group" and the aria-label stay exactly as they were. VM checks first, then real headless Chromium at 1280 and 390 px.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const NAMES = ['whoosh', 'cloud-puff', 'letter-pop', 'logo-land', 'hop', 'land', 'chime', 'sparkle', 'wink', 'squish', 'rain', 'tap', 'page-turn', 'card-flip', 'badge', 'footstep', 'wave', 'firefly', 'night-chime'];

// empty = the CLIPS map emptied first: the component must look and work exactly as it did before any clip existed
function vmApi(hash = '#teacher-standard', empty = true) {
  const context = vm.createContext({ window: {}, document: { addEventListener() {} }, location: { hash } });
  vm.runInContext(read('plush-cast.js'), context);
  vm.runInContext(read('supporting-cast.js'), context);
  const S = context.window.FFSupporting;
  if (empty) for (const k of Object.keys(S.CLIPS)) delete S.CLIPS[k];
  return S;
}
// the cast clips the W9 video lane delivered (~/futures-friends-video/web-cast/INTEGRATION.md): card key -> file base
const CAST = {
  'teacher-standard:june:every-grown-up-in': 'ff-cast-june-welcome', 'teacher-standard:june:in-our-story': 'ff-cast-june-two-questions',
  'train-your-staff:june:small-steps-big': 'ff-cast-june-small-steps', 'train-your-staff:june:what-do-you': 'ff-cast-june-notice-wonder',
  'teacher-standard:hazel': 'ff-cast-hazel-law', 'teacher-standard:moss': 'ff-cast-moss-standard', 'teacher-standard:fern': 'ff-cast-fern-safety',
  'for-families:bruno': 'ff-cast-bruno-loop', 'for-families:rose': 'ff-cast-rose-loop', 'for-families:sage': 'ff-cast-sage-loop', 'for-families:ella': 'ff-cast-ella-loop'
};
const LINE = 'If a grown-up misses a safety question, they go back and learn it again. That is not a failure. That is the point.';

// ---------------------------------------------------------------- markup (no browser)
test('guide(): the same words, label, role and aria-label; the portrait is now a real button that says hello', () => {
  const S = vmApi();
  const html = S.guide('fern', LINE);
  assert.match(html, /^<div class="ff-guide tx-cream[^"]*" role="group" style="--cast-accent:#9a3f26" aria-label="Ms\. Fern, story-world character"/);
  assert.ok(html.includes(`<p id="ffg1-say">${LINE}</p>`), 'the line, word for word');
  assert.match(html, /<span class="ff-guide-who"><b>Ms\. Fern<\/b><small>Story-world character<\/small><\/span>/);
  assert.match(html, /<button type="button" class="ff-guide-art ff-guide-actor" aria-label="Ms\. Fern says hello" data-ff-actor="fern"/);
  assert.match(html, /<img class="ff-guide-img" src="img\/plush\/characters\/ms-fern-480\.webp"[^>]* alt=""/, 'the portrait inside the button is decorative (the button has the name)');
  assert.equal((html.match(/<img /g) || []).length, 1, 'one portrait in the markup; the head/wing layers are added in the browser');
  const q = S.guide('june', 'In our story world, I ask the children two questions.', { quote: 'What do you notice? What do you wonder?', kicker: 'The question behind the method' });
  assert.match(q, /<span class="ff-guide-kick">The question behind the method<\/span>/);
  assert.match(q, /<blockquote>What do you notice\? What do you wonder\?<\/blockquote>/);
  assert.match(q, /aria-label="Ms\. June says hello"/);
  // parents stand with their lead friend: one button for the pair
  const duo = S.guide('rose', 'In the story world, Rose and Lumi try this one at home, too.', { with: 'lumi-calm-breath' });
  assert.match(duo, /class="ff-guide tx-cream ff-guide-duo"/);
  assert.match(duo, /<button type="button" class="ff-guide-actor ff-guide-actor-duo" aria-label="Rose and Lumi say hello" data-ff-actor="rose"><span class="ff-duo ff-guide-pair"/);
  assert.match(duo, /aria-label="Rose, story-world character"/);
  // unknown keys still fall back to Ms. June, nothing injectable
  assert.match(S.guide('__proto__', 'x'), /aria-label="Ms\. June, story-world character"/);
});

test('with the CLIPS map empty: no clip slot, no <video>, the card is exactly a card without clips; keys are route:character[:line]', () => {
  const S = vmApi();
  assert.deepEqual(Object.keys(S.CLIPS), []);
  for (const k of ['june', 'hazel', 'moss', 'fern', 'bruno']) {
    const html = S.guide(k, 'A line.');
    assert.doesNotMatch(html, /ff-guide-video|<video|<source|ff-vid-btn|has-video/);
  }
  assert.deepEqual([...S.clipIds('fern', LINE)], ['teacher-standard:fern:if-a-grown-up', 'teacher-standard:fern']);
  assert.deepEqual([...S.clipIds('june', 'Small steps. Big stories.', { page: 'train-your-staff' })], ['train-your-staff:june:small-steps-big', 'train-your-staff:june']);
  assert.deepEqual([...S.clipIds('june', 'x', { clip: 'Notice' })], ['teacher-standard:june:notice', 'teacher-standard:june']);
  assert.deepEqual([...vmApi('').clipIds('moss', 'Knowing the rule')], ['home:moss:knowing-the-rule', 'home:moss']);
  assert.match(S.guide('fern', LINE), /data-ff-clip-id="teacher-standard:fern:if-a-grown-up"/, 'each card prints its one-card key');
});

test('the delivered cast clips are registered: every file exists, talking clips are voiced with a registered .vtt that says the card line, loops are silent', () => {
  const S = vmApi('#teacher-standard', false);
  assert.deepEqual(Object.keys(S.CLIPS).sort(), Object.keys(CAST).sort());
  const C = require('../captions.js');
  for (const [key, base] of Object.entries(CAST)) {
    const e = S.CLIPS[key], loop = /-loop$/.test(base);
    assert.equal(e.mp4, `video/cast/${base}.mp4`); assert.equal(e.webm, `video/cast/${base}.av1.webm`); assert.equal(e.poster, `video/cast/${base}-poster.webp`);
    for (const f of [e.mp4, e.webm, e.poster]) assert.ok(fs.statSync(path.join(ROOT, f)).size > 10000, f);
    assert.equal(!!e.loop, loop, key); assert.equal(!!e.voiced, !loop, key);
    assert.match(e.label, /^Story-world animation: /, key + ' is labelled story-world animation');
    if (loop) { assert.equal(C.CAPS[e.mp4].silent, true); continue; }
    const vtt = C.CAPS[e.mp4] && C.CAPS[e.mp4].vtt;
    assert.equal(vtt, `video/cast/${base}.en.vtt`);
    const said = read(vtt).split('\n').filter(l => l.trim() && !/^WEBVTT|-->|^\d+$/.test(l.trim())).join(' ');
    assert.equal(said, C.CAPS[e.mp4].transcript, key + ': transcript = captions');
    assert.ok(e.label.endsWith(said), key + ': the accessible name carries the line');
  }
  const man = JSON.parse(read('video/cast/manifest.json'));
  assert.equal(man.receipts, '~/Downloads/FUTURES_FRIENDS_PROJECT/05_Brand_and_Art/plush-generated/video-w9-cast/RECEIPTS.json');
  assert.equal(man.files.length, 40);
  for (const f of man.files) assert.equal(fs.statSync(path.join(ROOT, f.file)).size, f.bytes, f.file);
  // the right clip lands on the right card: render the real call sites' lines
  const T = vmApi('#teacher-standard', false);
  assert.match(T.guide('fern', LINE), /ff-cast-fern-safety\.mp4/);
  assert.match(T.guide('june', "Every grown-up in the room starts as a learner. Let's look closely at what that learning asks of them.", { quote: 'What do you notice? What do you wonder?' }), /ff-cast-june-welcome\.mp4/);
  const R = vmApi('#for-families', false);
  const duo = R.guide('rose', 'In the story world, Rose and Lumi try this one at home, too.', { with: 'lumi-calm-breath' });
  assert.match(duo, /class="ff-guide tx-cream ff-guide-has-video ff-guide-vduo"/);
  assert.match(duo, /ff-cast-rose-loop\.mp4/);
  assert.match(duo, /<img class="ff-guide-vkid" src="img\/plush\/characters\/lumi-calm-breath-480\.webp"/, 'the loop replaces only the parent; Lumi still stands beside her');
  assert.match(duo, /<small class="ff-guide-vtag">Story-world animation<\/small>/);
});

test('a registered clip (or opts.video) fills the portrait slot with the poster and a labelled play button; sources stay lazy', () => {
  const S = vmApi();
  const entry = { mp4: 'video/ff-friend-booker-4x5.mp4', webm: 'video/ff-friend-booker-4x5.av1.webm', poster: 'video/ff-friend-booker-4x5-poster.webp', voiced: true };
  S.CLIPS['teacher-standard:fern'] = entry;
  const html = S.guide('fern', LINE);
  assert.match(html, /class="ff-guide tx-cream ff-guide-has-video"/);
  assert.match(html, /<div class="ff-guide-art ff-guide-video" style="--vr:4\/5" data-ff-clip="[^"]*ff-friend-booker-4x5\.mp4[^"]*" data-ff-describe="ffg\d+-say"><span class="ff-vframe">/);
  assert.match(html, /<img class="ff-guide-poster" src="video\/ff-friend-booker-4x5-poster\.webp" alt="" loading="lazy"/);
  assert.match(html, /<button type="button" class="ff-vid-btn" data-ff-vid="play" aria-label="Play Ms\. Fern's story-world animation">/);
  assert.doesNotMatch(html, /<video|<source/, 'nothing to download until the card is near the screen');
  const id = html.match(/data-ff-describe="(ffg\d+-say)"/)[1];
  assert.ok(html.includes(`<p id="${id}">${LINE}</p>`), 'captions = the line already on the card');
  assert.match(html, /aria-label="Ms\. Fern, story-world character"/);
  // the one-card key wins over the character key; opts.video wins over both
  S.CLIPS['teacher-standard:fern:if-a-grown-up'] = Object.assign({}, entry, { mp4: 'video/one.mp4' });
  assert.match(S.guide('fern', LINE), /video\/one\.mp4/);
  assert.match(S.guide('fern', LINE, { video: Object.assign({}, entry, { mp4: 'video/two.mp4', ratio: '9/16' }) }), /video\/two\.mp4[\s\S]*|--vr:9\/16/);
  // unsafe or malformed entries are ignored (plain card)
  for (const bad of [{ mp4: 'javascript:alert(1).mp4' }, { mp4: '../secret.mp4' }, { mp4: 'https://x.test/a.mp4' }, { mp4: 'video/a.mov' }, { poster: 'video/p.webp' }, 'video/a.mp4', null]) {
    assert.doesNotMatch(S.guide('moss', 'x', { video: bad }), /ff-guide-video/, JSON.stringify(bad));
  }
  assert.doesNotMatch(S.guide('moss', 'x', { video: { mp4: 'video/a.mp4', poster: '"><script>' } }), /<script>/);
});

test('the runtime only asks for contract sounds, sends nothing, stores nothing, and moves the art only uniformly (a subtle landing squash)', () => {
  const src = read('supporting-cast.js');
  const used = [...src.matchAll(/sfx\('([a-z-]+)'/g)].map(m => m[1]).concat([...src.matchAll(/sfx:'([a-z-]+)'/g)].map(m => m[1]));
  assert.ok(used.length >= 8);
  for (const n of used) assert.ok(NAMES.includes(n), `ff:sfx "${n}" is in the wave 8 contract`);
  assert.match(src, /new CustomEvent\('ff:sfx',\{detail:\{name,x:/);
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(code, /fetch\(|XMLHttpRequest|sendBeacon|WebSocket|localStorage|sessionStorage|indexedDB|document\.cookie/);
  assert.doesNotMatch(code + read('supporting-cast.css'), /skew|matrix|scaleX|scaleY|scale3d|rotateY|rotateX|scale\(\s*-1/);
  for (const m of code.matchAll(/scale\(([\d.]+),([\d.]+)\)/g)) {
    const [a, b] = [+m[1], +m[2]];
    assert.ok(a >= 1 && a <= 1.06 && b <= 1 && b >= 0.94, `only a subtle squash: scale(${a},${b})`);
  }
  // reduced motion and the motion switch are both honoured, in the script and in CSS
  assert.match(code, /prefers-reduced-motion: reduce\)'\)\|\|D\.documentElement\.dataset\.motion==='off'/);
  const css = read('supporting-cast.css');
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)\{[^}]*\.ff-guide\.ff-on \.ff-rig/);
  assert.match(css, /html\[data-motion=off\] \.ff-guide \.ff-rig/);
  assert.match(css, /@keyframes ff-ink\{from\{opacity:\.6\}to\{opacity:1\}\}/, 'the write-on never starts below 60%');
  assert.match(css, /\.ff-guide\.wc-pre\{opacity:1;transform:none\}/, 'the scroll reveal never fades the card out');
});

test('index.html loads the upgraded component with a new ?v= (>=)', () => {
  const html = read('index.html');
  const v = f => +((html.match(new RegExp(f.replace('.', '\\.') + '\\?v=(\\d+)')) || [])[1] || 0);
  assert.ok(v('supporting-cast.js') >= 7 && v('supporting-cast.css') >= 5 && v('captions.js') >= 4);
  assert.ok(html.indexOf('src="plush-cast.js') < html.indexOf('src="supporting-cast.js') && html.indexOf('src="supporting-cast.js') < html.indexOf('src="views.js'));
});

// ---------------------------------------------------------------- real browser
const H = () => import('./a11y-harness.mjs');
let h, site, browser;
test.before(async () => { h = await H(); site = await h.startSite(); browser = await h.loadChromium().launch(); });
test.after(async () => { if (browser) await browser.close(); if (site) await site.close(); });
const PHONE = { isMobile: true, hasTouch: true };
const ctxFor = (width, motion) => browser.newContext({ viewport: h.SIZES[width], reducedMotion: motion ? 'no-preference' : 'reduce', ...(width === 390 ? PHONE : {}) });
const SFX = () => { window.__sfx = []; document.addEventListener('ff:sfx', e => window.__sfx.push(e.detail.name)); };
const errorsOf = page => { const e = []; page.on('pageerror', x => e.push(x.message)); return e; };
// the site with the CLIPS map emptied (as before any clip existed): clear the map, then render the route again
async function emptyClips(page, route) {
  await page.evaluate(() => { for (const k of Object.keys(window.FFSupporting.CLIPS)) delete window.FFSupporting.CLIPS[k]; location.hash = '#home'; });
  await page.waitForTimeout(400);
  await page.evaluate(r => { location.hash = '#' + r; }, route);
  await page.waitForFunction(r => location.hash === '#' + r && document.querySelector('.ff-guide, .ff-town'), route);
  await page.waitForTimeout(700);
}
// what the cards say and how they are labelled, read from the live DOM (stitch/accents/bubbles are aria-hidden and excluded)
const cardFacts = page => page.evaluate(() => [...document.querySelectorAll('.ff-guide')].map(c => ({
  role: c.getAttribute('role'), label: c.getAttribute('aria-label'), key: c.dataset.ffGuide,
  who: c.querySelector('.ff-guide-who').textContent, text: c.querySelector('.ff-guide-copy').textContent,
  button: (c.querySelector('.ff-guide-actor') || {}).tagName + ':' + ((c.querySelector('.ff-guide-actor') || { getAttribute() { return ''; } }).getAttribute('aria-label')) })));

for (const width of [1280, 390]) {
  test(`entrance (${width}px): the character hops in (hop, land), the stitch draws, the line writes on and is never below 60% opacity`, async () => {
    const ctx = await ctxFor(width, true); const page = await ctx.newPage(); const errors = errorsOf(page);
    await page.addInitScript(SFX);
    await h.goto(page, site.base, 'teacher-standard', 900);
    const facts = await cardFacts(page);
    assert.deepEqual(facts.map(f => f.key), ['june', 'hazel', 'moss', 'june', 'fern']);
    const n = facts.length;
    for (let i = 1; i < n; i++) {   // every card that starts below the fold, each on a fresh load so no neighbour has entered yet
      if (i > 1) await h.goto(page, site.base, 'teacher-standard', 700);
      const before = await page.evaluate(i => { const c = document.querySelectorAll('.ff-guide')[i]; return { live: c.hasAttribute('data-ff-live'), entered: c.classList.contains('ff-on'), text: c.querySelector('.ff-guide-copy').textContent }; }, i);
      assert.ok(before.live, `card ${i} is wired`);
      // sample every frame while it enters: the card and each word, including every ancestor's opacity
      await page.evaluate(i => {
        const c = document.querySelectorAll('.ff-guide')[i]; window.__min = 1; window.__words = 0; window.__sfx.length = 0;
        const eff = el => { let o = 1; for (let e = el; e && e !== document.documentElement; e = e.parentElement) o *= +getComputedStyle(e).opacity; return o; };
        const t0 = performance.now();
        const f = () => { const ws = c.querySelectorAll('.ff-guide-copy p, .ff-guide-copy blockquote, .ff-w'); window.__words = Math.max(window.__words, c.querySelectorAll('.ff-w').length); ws.forEach(w => { window.__min = Math.min(window.__min, eff(w)); }); if (performance.now() - t0 < 2600) requestAnimationFrame(f); };
        requestAnimationFrame(f);
        c.scrollIntoView({ block: 'center' });
      }, i);
      await page.waitForTimeout(2800);
      const r = await page.evaluate(i => { const c = document.querySelectorAll('.ff-guide')[i]; return { min: window.__min, words: window.__words, sfx: window.__sfx.slice(), on: c.classList.contains('ff-on'), stitch: !!c.querySelector(':scope > svg.ff-stitch[aria-hidden="true"]'), left: c.querySelectorAll('.ff-w').length, text: c.querySelector('.ff-guide-copy').textContent }; }, i);
      assert.ok(r.min >= 0.6, `card ${i}: text opacity never below 60% (min ${r.min.toFixed(3)})`);
      assert.ok(r.words > 3, `card ${i}: the line wrote on word by word (${r.words} words)`);
      assert.deepEqual(r.sfx.slice(0, 2), ['hop', 'land'], `card ${i}: ff:sfx hop then land`);
      assert.ok(r.on && r.stitch, `card ${i}: on screen with its stitched border`);
      assert.equal(r.left, 0, 'the word spans are folded back into plain text after the entrance');
      assert.equal(r.text, before.text, 'the same words after the entrance');
    }
    assert.deepEqual(await cardFacts(page), facts, 'labels, roles and words unchanged after everything ran');
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}

test('reduced motion: the composed final state (no entrance, no idle, no write-on), yet a tap still answers with its sound', async () => {
  const ctx = await ctxFor(1280, false); const page = await ctx.newPage(); const errors = errorsOf(page);
  await page.addInitScript(SFX);
  await h.goto(page, site.base, 'teacher-standard', 900);
  await emptyClips(page, 'teacher-standard');
  for (let i = 0; i < 5; i++) { await page.evaluate(i => document.querySelectorAll('.ff-guide')[i].scrollIntoView({ block: 'center' }), i); await page.waitForTimeout(250); }
  await page.waitForTimeout(600);
  const r = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.ff-guide')];
    const anims = document.getAnimations().filter(a => a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('.ff-guide'));
    const rig = document.querySelector('.ff-guide .ff-rig');
    return { still: cards.every(c => c.classList.contains('ff-still')), anims: anims.length, words: document.querySelectorAll('.ff-w').length, sfx: window.__sfx.slice(), rigAnim: getComputedStyle(rig).animationName, stitchDash: getComputedStyle(document.querySelector('.ff-stitch-draw')).strokeDasharray };
  });
  assert.ok(r.still, 'every card settles straight into its final state');
  assert.equal(r.anims, 0, 'nothing moves');
  assert.equal(r.words, 0, 'no write-on');
  assert.deepEqual(r.sfx, [], 'no hop/land sounds without the entrance');
  assert.equal(r.rigAnim, 'none', 'no breathing');
  assert.match(r.stitchDash, /^1(px)?,? 0(px)?$/, 'the stitch is simply drawn');
  await page.click('[data-ff-guide="moss"] .ff-guide-actor');
  await page.waitForTimeout(200);
  assert.deepEqual(await page.evaluate(() => window.__sfx), ['badge'], 'an explicit tap still sounds');
  assert.equal(await page.evaluate(() => document.getAnimations().filter(a => a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('.ff-guide') && /transform/.test(JSON.stringify(a.effect.getKeyframes()))).length), 0, 'and nothing moves');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('signature actions: a tap (or Enter) plays each character\'s own action on its own layers and the fitting ff:sfx', async () => {
  const ctx = await ctxFor(1280, true); const page = await ctx.newPage(); const errors = errorsOf(page);
  await page.addInitScript(SFX);
  const EXPECT = { june: ['chime', 'present', ['ff-arm', 'ff-head']], hazel: ['chime', 'bow', ['ff-head']], moss: ['badge', 'nod', ['ff-head']], fern: ['wave', 'flutter', ['ff-wing-l', 'ff-wing-r', 'ff-head']] };
  await h.goto(page, site.base, 'teacher-standard', 900);
  await emptyClips(page, 'teacher-standard');
  for (const key of ['hazel', 'moss', 'fern', 'june']) {
    const sel = `[data-ff-guide="${key}"]`;
    await page.evaluate(s => document.querySelector(s).scrollIntoView({ block: 'center' }), sel);
    await page.waitForTimeout(3600);   // entrance + its silent signature finish
    const parts = await page.evaluate(s => [...document.querySelectorAll(s + ' .ff-part')].map(p => p.className.replace('ff-part ', '').replace('ff-limb ', '')), sel);
    for (const p of EXPECT[key][2]) assert.ok(parts.includes(p), `${key}: has its ${p} layer (clip of the same approved art)`);
    await page.evaluate(() => { window.__sfx.length = 0; });
    if (key === 'moss') { await page.focus(`${sel} .ff-guide-actor`); await page.keyboard.press('Enter'); } else await page.click(`${sel} .ff-guide-actor`);
    await page.waitForTimeout(160);
    const r = await page.evaluate(s => {
      const c = document.querySelector(s);
      const moving = new Set(document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.target && c.contains(a.effect.target) && /transform/.test(JSON.stringify(a.effect.getKeyframes()))).map(a => a.effect.target.className.baseVal === undefined ? a.effect.target.className : 'svg'));
      return { sfx: window.__sfx.slice(), moving: [...moving].join(' ') };
    }, sel);
    assert.equal(r.sfx[0], EXPECT[key][0], `${key}: ff:sfx ${EXPECT[key][0]}`);
    for (const p of EXPECT[key][2]) assert.match(r.moving, new RegExp(p), `${key} (${EXPECT[key][1]}): ${p} moves`);
    await page.waitForTimeout(900);
    assert.ok(await page.evaluate(s => document.querySelectorAll(s + ' .ff-fx .ff-fx-bit').length > 0, sel), `${key}: felt accents`);
  }
  // the "notice / wonder" card: the two questions pop up as felt speech bubbles, one after another (aria-hidden copies)
  const notice = '[data-ff-clip-id="teacher-standard:june:in-our-story"]';
  await page.evaluate(s => document.querySelector(s).scrollIntoView({ block: 'center' }), notice);
  await page.waitForTimeout(5200);
  await page.evaluate(() => { window.__sfx.length = 0; });
  await page.click(`${notice} .ff-guide-actor`);
  await page.waitForTimeout(420);
  const b1 = await page.evaluate(s => [...document.querySelectorAll(s + ' .ff-bubble')].map(b => [b.textContent, +getComputedStyle(b).opacity, b.closest('[aria-hidden="true"]') !== null]), notice);
  await page.waitForTimeout(700);
  const b2 = await page.evaluate(s => [...document.querySelectorAll(s + ' .ff-bubble')].map(b => +getComputedStyle(b).opacity), notice);
  assert.deepEqual(b1.map(b => b[0]), ['What do you notice?', 'What do you wonder?']);
  assert.ok(b1.every(b => b[2]), 'decorative copies, hidden from screen readers');
  assert.ok(b1[0][1] > 0.5 && b1[1][1] < 0.2, `one after another (at 0.4 s: ${b1.map(b => b[1].toFixed(2))})`);
  assert.ok(b2[0] > 0.9 && b2[1] > 0.5, `then both (at 1.1 s: ${b2.map(b => b.toFixed(2))})`);
  assert.deepEqual((await page.evaluate(() => window.__sfx)).slice(0, 3), ['chime', 'letter-pop', 'letter-pop']);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('parents hug-bounce with their friend (squish); the town and cameo figures answer a tap; labels, roles and axe unchanged', async () => {
  const ctx = await ctxFor(390, true); const page = await ctx.newPage(); const errors = errorsOf(page);
  await page.addInitScript(SFX);
  await h.goto(page, site.base, 'for-families', 900);
  await emptyClips(page, 'for-families');
  const duo = '.ff-guide-duo';
  assert.ok(await page.$(duo), 'a parent card on For Families');
  const facts = await cardFacts(page);
  assert.match(facts[0].button, /^BUTTON:(Bruno|Rose|Sage|Ella) and (Booker|Lumi|Zuri|Bop) say hello$/);
  await page.evaluate(s => document.querySelector(s).scrollIntoView({ block: 'center' }), duo);
  await page.waitForTimeout(3400);
  await page.evaluate(() => { window.__sfx.length = 0; });
  await page.tap(`${duo} .ff-guide-actor`);
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => window.__sfx[0]), 'squish');
  assert.equal(await page.evaluate(s => document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.target && a.effect.target.tagName === 'IMG' && a.effect.target.closest(s) && /transform/.test(JSON.stringify(a.effect.getKeyframes()))).length, duo), 2, 'both lean in and bounce');
  const v = await h.axe(page, { include: '.ff-guide' });
  assert.deepEqual(v.filter(x => h.BLOCKING.includes(x.impact)).map(x => x.id), []);
  // the town on #friends
  await h.goto(page, site.base, 'friends', 900);
  assert.equal(await page.evaluate(() => document.querySelectorAll('.ff-shelf[data-ff-live]').length), 3, 'each shelf comes alive on its own');
  const shelfIn = async (sel) => { await page.evaluate(s => document.querySelector(s).scrollIntoView({ block: 'center' }), sel); await page.waitForTimeout(1200); await page.evaluate(() => { window.__sfx.length = 0; }); };
  await shelfIn('.ff-shelf-school');
  await page.tap('.ff-shelf-school .ff-townie:nth-child(4)');   // Ms. Fern, a grown-up: a sway
  await page.waitForTimeout(120);
  assert.deepEqual(await page.evaluate(() => window.__sfx), ['wave']);
  await shelfIn('.ff-shelf-class');
  await page.tap('.ff-shelf-class .ff-townie:nth-child(5)');    // Pip, a child: a hop
  await page.waitForTimeout(120);
  assert.deepEqual(await page.evaluate(() => window.__sfx), ['hop']);
  assert.equal(await page.evaluate(() => document.querySelectorAll('.ff-town button').length), 0, 'the town gains no tab stops (pointer-only decoration; every name stays text)');
  assert.deepEqual(errors, []);
  await ctx.close();
});

// The public site ships silent (sound-switch.js kill switch, owner 2026-10-10; see sound-off.test.js): this test flips the switch back
// (window.FF_SOUND_OFF = false) so the voiced replay stays checked for the day sound returns; the silent default is checked after it.
test('talking clips (switch flipped back): poster first, nothing loads far away, plays once in view (muted with sound off, voiced with it on), pause/replay labelled, captions drive the words on the card', async () => {
  const ctx = await ctxFor(1280, true); await ctx.addInitScript(() => { window.FF_SOUND_OFF = false; }); const page = await ctx.newPage(); const errors = errorsOf(page);
  const asked = []; page.on('request', r => { if (/video\/cast\/.*\.(mp4|webm|vtt)/.test(r.url())) asked.push(r.url().split('/').pop()); });
  await h.goto(page, site.base, 'teacher-standard', 600);
  await page.evaluate(() => window.FFSound.set(false));
  const card = '[data-ff-guide="fern"]';
  const top = await page.evaluate(s => { const c = document.querySelector(s); return { video: !!c.querySelector('video'), poster: c.querySelector('.ff-guide-poster').getAttribute('src'), label: c.querySelector('.ff-vid-btn').getAttribute('aria-label'), group: c.getAttribute('aria-label'), tag: c.querySelector('.ff-guide-vtag').textContent }; }, card);
  assert.deepEqual(top, { video: false, poster: 'video/cast/ff-cast-fern-safety-poster.webp', label: "Play Ms. Fern's story-world animation", group: 'Ms. Fern, story-world character', tag: 'Story-world animation' });
  assert.ok(!asked.some(u => /fern/.test(u)), 'no Ms. Fern clip requested while her card is far below');
  await page.evaluate(s => document.querySelector(s).scrollIntoView({ block: 'center' }), card);
  await page.waitForFunction(s => { const c = document.querySelector(s), v = c.querySelector('video'); return v && v.currentTime > 1.2 && v.currentTime < 5 && !c.classList.contains('ff-writing'); }, card, { timeout: 9000 });
  await page.waitForTimeout(100);
  const playing = await page.evaluate(s => { const c = document.querySelector(s), v = c.querySelector('video'), t = v.querySelector('track'); const d = document.getElementById(v.getAttribute('aria-describedby'));
    const hl = CSS.highlights.get('ff-say'); const words = hl ? [...hl].map(r => r.toString()) : [];
    return { paused: v.paused, muted: v.muted, label: v.getAttribute('aria-label'), cap: d && d.textContent, inCard: c.contains(d), btn: c.querySelector('.ff-vid-btn').getAttribute('aria-label'), track: t && [t.kind, t.getAttribute('src'), v.textTracks[0].mode], words }; }, card);
  assert.equal(playing.paused, false, 'plays when it scrolls into view');
  assert.equal(playing.muted, true, "muted: the visitor's sound is off");
  assert.match(playing.label, /^Story-world animation: Ms\. Fern the owl says: If a grown-up misses a safety question/);
  assert.ok(playing.inCard && /^If a grown-up misses a safety question/.test(playing.cap), 'the line on the card describes the clip');
  assert.deepEqual(playing.track, ['captions', 'video/cast/ff-cast-fern-safety.en.vtt', 'hidden']);
  assert.deepEqual(playing.words, ['If a grown-up misses a safety question, they go back and learn it again.'], 'the spoken sentence lights up on the card');
  assert.equal(playing.btn, "Pause Ms. Fern's story-world animation");
  await page.click(`${card} .ff-vid-btn`);
  await page.waitForTimeout(150);
  assert.deepEqual(await page.evaluate(s => { const c = document.querySelector(s); return [c.querySelector('video').paused, c.querySelector('.ff-vid-btn').getAttribute('aria-label'), CSS.highlights.get('ff-say').size]; }, card), [true, "Play Ms. Fern's story-world animation", 0], 'WCAG 2.2.2: it can be paused (and the highlight clears)');
  await page.click(`${card} .ff-vid-btn`);
  await page.waitForFunction(s => document.querySelector(s + ' video').ended, card, { timeout: 15000 });
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(s => document.querySelector(s + ' .ff-vid-btn').getAttribute('aria-label'), card), "Replay Ms. Fern's story-world animation");
  assert.ok(await page.evaluate(s => document.querySelectorAll(s + ' .ff-fx-leaf').length > 0, card), 'a felt leaf flourish when she finishes');
  // with the visitor's sound on (and the browser allowing it) the replay has her voice
  await page.evaluate(() => window.FFSound.set(true));
  await page.click(`${card} .ff-vid-btn`);
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(s => document.querySelector(s + ' video').muted, card), false, 'voiced with sound on');
  // the notice / wonder card: each question's bubble pops when she says it
  await h.goto(page, site.base, 'train-your-staff', 600);
  const nw = '[data-ff-clip-id="train-your-staff:june:what-do-you"]';
  await page.evaluate(s => document.querySelector(s).scrollIntoView({ block: 'center' }), nw);
  await page.waitForFunction(s => { const v = document.querySelector(s + ' video'); return v && v.currentTime > 1.6 && v.currentTime < 3; }, nw, { timeout: 9000 });
  const b1 = await page.evaluate(s => [...document.querySelectorAll(s + ' .ff-bubble')].map(b => +getComputedStyle(b).opacity), nw);
  await page.waitForFunction(s => document.querySelector(s + ' video').currentTime > 4.9, nw, { timeout: 9000 });
  const b2 = await page.evaluate(s => [...document.querySelectorAll(s + ' .ff-bubble')].map(b => [b.textContent, +getComputedStyle(b).opacity]), nw);
  assert.ok(b1[0] > 0.9 && b1[1] < 0.1, `"What do you notice about your team?" pops with her first question (${b1})`);
  assert.deepEqual(b2.map(b => b[0]), ['What do you notice about your team?', 'What do you wonder?']);
  assert.ok(b2[1][1] > 0.9, 'then "What do you wonder?"');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no sideways scroll');
  assert.deepEqual(errors, []);
  await ctx.close();
  // reduced motion: poster + play button only; nothing plays or loads until asked
  const rctx = await ctxFor(390, false); const rp = await rctx.newPage(); const rasked = []; rp.on('request', r => { if (/video\/cast\/.*\.(mp4|webm)/.test(r.url())) rasked.push(r.url()); });
  await h.goto(rp, site.base, 'teacher-standard', 600);
  await rp.evaluate(s => document.querySelector(s).scrollIntoView({ block: 'center' }), card);
  await rp.waitForTimeout(1500);
  assert.deepEqual(await rp.evaluate(s => [!!document.querySelector(s + ' video'), !!document.querySelector(s + ' .ff-guide-poster'), !!document.querySelector(s + ' .ff-vid-btn')], card), [false, true, true]);
  assert.deepEqual(rasked, []);
  await rp.click(`${card} .ff-vid-btn`);
  await rp.waitForTimeout(600);
  assert.equal(await rp.evaluate(s => !document.querySelector(s + ' video').paused, card), true, 'plays when the visitor asks');
  await rctx.close();
});

test('talking clips with the kill switch flipped on (sound ships ON since 2026-10-10): Ms. Fern plays muted even after "sound on" is asked for', async () => {
  const ctx = await ctxFor(1280, true); await ctx.addInitScript(() => { window.FF_SOUND_OFF = true; }); const page = await ctx.newPage(); const errors = errorsOf(page);
  await h.goto(page, site.base, 'teacher-standard', 600);
  const card = '[data-ff-guide="fern"]';
  await page.evaluate(s => document.querySelector(s).scrollIntoView({ block: 'center' }), card);
  await page.waitForFunction(s => { const v = document.querySelector(s + ' video'); return v && v.currentTime > 1.2; }, card, { timeout: 9000 });
  assert.equal(await page.evaluate(() => window.FFSound.set(true)), false, 'set() does nothing while the switch is on');
  await page.click(`${card} .ff-vid-btn`); await page.click(`${card} .ff-vid-btn`); await page.waitForTimeout(300);
  assert.deepEqual(await page.evaluate(s => { const v = document.querySelector(s + ' video'); return [v.paused, v.muted, window.FFSound.enabled(), window.FF_SOUND_FORCED]; }, card), [false, true, false, 0]);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test("parents' silent loops: play muted while the card is on screen, pause off screen, a pause button holds them; the lead friend's cut-out stays; reduced motion = poster", async () => {
  const ctx = await ctxFor(390, true); const page = await ctx.newPage(); const errors = errorsOf(page);
  await h.goto(page, site.base, 'for-families', 600);
  const card = '.ff-guide-vduo';
  const who = await page.evaluate(s => document.querySelector(s).dataset.ffGuide, card);
  assert.ok(['bruno', 'rose', 'sage', 'ella'].includes(who));
  await page.evaluate(s => document.querySelector(s).scrollIntoView({ block: 'center' }), card);
  await page.waitForFunction(s => { const v = document.querySelector(s + ' video'); return v && !v.paused && v.currentTime > 0.5; }, card, { timeout: 9000 });
  const r = await page.evaluate(s => { const c = document.querySelector(s), v = c.querySelector('video'); return { loop: v.loop, muted: v.muted, track: !!v.querySelector('track'), kid: !!c.querySelector('.ff-guide-vkid'), label: v.getAttribute('aria-label'), btn: c.querySelector('.ff-vid-btn').getAttribute('aria-label') }; }, card);
  assert.deepEqual([r.loop, r.muted, r.track, r.kid], [true, true, false, true]);
  assert.match(r.label, /^Story-world animation: (Bruno|Rose|Sage|Ella) the /);
  assert.match(r.btn, /^Pause (Bruno|Rose|Sage|Ella)'s story-world animation$/);
  await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(500);
  assert.equal(await page.evaluate(s => document.querySelector(s + ' video').paused, card), true, 'paused off screen');
  await page.evaluate(s => document.querySelector(s).scrollIntoView({ block: 'center' }), card); await page.waitForTimeout(800);
  assert.equal(await page.evaluate(s => document.querySelector(s + ' video').paused, card), false, 'plays again on screen');
  await page.tap(`${card} .ff-vid-btn`); await page.waitForTimeout(200);
  await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(300);
  await page.evaluate(s => document.querySelector(s).scrollIntoView({ block: 'center' }), card); await page.waitForTimeout(800);
  assert.equal(await page.evaluate(s => document.querySelector(s + ' video').paused, card), true, 'a pause holds until the visitor plays it again');
  assert.deepEqual(errors, []);
  await ctx.close();
  const rctx = await ctxFor(1280, false); const rp = await rctx.newPage();
  await h.goto(rp, site.base, 'for-families', 600);
  await rp.evaluate(s => document.querySelector(s).scrollIntoView({ block: 'center' }), card); await rp.waitForTimeout(1200);
  assert.deepEqual(await rp.evaluate(s => [!!document.querySelector(s + ' video'), !!document.querySelector(s + ' .ff-guide-poster')], card), [false, true], 'reduced motion: the poster');
  await rctx.close();
});

test('with the CLIPS map emptied in the browser, no page shows a clip slot and every card is the living cut-out again', async () => {
  const ctx = await ctxFor(1280, true); const page = await ctx.newPage(); const errors = errorsOf(page);
  const asked = []; page.on('request', r => { if (/video\/cast\//.test(r.url())) asked.push(r.url()); });
  await h.goto(page, site.base, 'teacher-standard', 300);
  for (const r of ['teacher-standard', 'train-your-staff', 'for-families']) {
    await emptyClips(page, r);
    const st = await page.evaluate(() => ({ slots: document.querySelectorAll('.ff-guide-video, .ff-guide video, .ff-vid-btn').length, actors: document.querySelectorAll('.ff-guide .ff-guide-actor').length, cards: document.querySelectorAll('.ff-guide').length }));
    assert.equal(st.slots, 0, `${r}: no clip slot`);
    assert.equal(st.actors, st.cards, `${r}: every card has its character button`);
  }
  assert.ok(asked.every(u => /poster\.webp$/.test(u)), 'at most the first card\'s poster was fetched before the map was emptied');
  assert.deepEqual(errors, []);
  await ctx.close();
});

for (const width of [1280, 390]) {
  test(`no layout shift (${width}px): #teacher-standard and #friends stay under CLS 0.01 through load, every entrance and a tap`, async () => {
    const out = [];
    for (const route of ['teacher-standard', 'friends']) {
      let best = 1;
      for (let run = 0; run < 2 && best >= 0.01; run++) {
        const ctx = await ctxFor(width, true); const page = await ctx.newPage();
        await page.addInitScript(() => { window.__cls = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); });
        await h.goto(page, site.base, route, 1200);
        const Ht = await page.evaluate(() => document.documentElement.scrollHeight);
        for (let y = 0; y <= Ht; y += 320) { await page.evaluate(y => scrollTo(0, y), y); await page.waitForTimeout(110); }
        await page.evaluate(() => { const a = document.querySelector('.ff-guide-actor, .ff-townie'); if (a) { a.scrollIntoView({ block: 'center' }); a.click(); } });
        await page.waitForTimeout(1600);
        best = Math.min(best, await page.evaluate(() => window.__cls));
        await ctx.close();
      }
      if (best >= 0.01) out.push(`${route}: CLS ${best.toFixed(4)}`);
    }
    assert.deepEqual(out, []);
  });
}
