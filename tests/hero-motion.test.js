'use strict';
// Home hero motion (hero-motion.js / hero-motion.css, owner request 2026-10-05): the friends' pop-up entrance, their in-character
// reactions and hello bubble, pointer depth and the ambient layer. Acceptance encoded here:
//  - reduced motion and the site's own motion switch render the hero static and complete (nothing animates, nothing is hidden);
//  - character art is never scaled non-uniformly (no scaleX/scaleY/skew/3D tilt, no width/height animation) in CSS or JS;
//  - every loop pauses when the stage is off screen or the tab is hidden;
//  - each friend is reachable by keyboard (one tab stop, arrow keys) and says hello the same way by click, tap or key.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { makeDocument, listen } = require('./mini-dom');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const ORDER = ['booker', 'bop', 'zuri', 'lumi']; // Learn, Move, Explore, Belong (the tagline's reading order)
// Wave 6 (owner 2026-10-06, "Booker should be in the middle"): the cast stands left to right Bop, Lumi, BOOKER, Zuri, Booker holds the
// one tab stop, and they arrive Bop (walks in), Lumi (hops down the hill), Zuri (springs up), Booker (walks down the path) last.
const STAGE = ['bop', 'lumi', 'booker', 'zuri'];
const ARRIVAL = ['bop', 'lumi', 'zuri', 'booker'];

function env({ reduce = false, motionOff = false, fine = true } = {}) {
  const document = makeDocument();
  if (motionOff) document.documentElement.dataset.motion = 'off';
  const ios = [], raf = [], timers = [];
  class IO { constructor(cb, opt) { this.cb = cb; this.opt = opt; this.els = []; ios.push(this); } observe(el) { this.els.push(el); } unobserve(el) { this.els = this.els.filter(x => x !== el); } disconnect() { this.off = true; } fire(v) { this.cb(this.els.map(target => ({ target, isIntersecting: v }))); } }
  const window = { FFhooks: [], innerHeight: 900, innerWidth: 1440 };
  listen(window);
  Object.assign(window, {
    window, document, console, AbortController, Promise, IntersectionObserver: IO,
    matchMedia: q => ({ matches: q.includes('reduced-motion') ? reduce : q.includes('pointer: fine') ? fine : false, addEventListener() {} }),
    requestAnimationFrame: f => raf.push(f), cancelAnimationFrame() {}, setTimeout: (f, t) => timers.push([f, t]), clearTimeout() {}
  });
  const ctx = vm.createContext(window);
  // The mottos come from the character bible in views.js (a page-level const in the browser).
  vm.runInContext(`const CH = ${JSON.stringify(Object.fromEntries(Object.entries(vm.runInNewContext('(' + read('views.js').match(/const CH = (\{[\s\S]*?\}\});/)[1] + ')')).map(([k, v]) => [k, { n: v.n, m: v.m }])))};`, ctx);
  for (const f of ['ff-motion.js', 'plush-cast.js', 'brand-art.js', 'hero-motion.js']) vm.runInContext(read(f), ctx, { filename: f });
  const root = document.createElement('main');
  document.body.appendChild(root);
  // The Home hero and one audience door, as premium.js and home-calm.js render them (stage and tagline are the real markup/text).
  // Wave 6: the meadow hero (plush logo h1, cream card, the cast row under it).
  root.innerHTML = `<section class="px-homehero mh-hero"><div class="wrap mh-grid"><div class="px-herocopy mh-copy"><h1 class="mh-logo"><img class="mh-logo-img" src="img/plush/hero/plush-logo-480.webp" alt="Futures Friends"></h1><div class="mh-card"><p>Learn. Move. Explore. Belong.</p></div></div></div><div class="mh-castrow">${window.FFArt.homeStage()}</div></section><section class="fj-doors"><ul><li class="fj-door"><div class="fj-doorart" aria-hidden="true"><img src="img/cut_booker.webp" alt=""></div></li></ul></section>`;
  // One frame at a time, letting promises settle in between (decode, then the start frame).
  const flush = async (frames = 4) => { for (let i = 0; i < frames; i++) { await new Promise(r => setImmediate(r)); raf.splice(0).forEach(f => f(16)); } };
  return { window, document, root, ctx, ios, raf, timers, flush, run: (view = 'home', ok = true) => window.FFhooks.forEach(fn => fn(view, root, ok)), stage: () => root.querySelector('.ffa-stage') };
}

const friends = e => e.stage().querySelectorAll('.ffa-friend');
const tagline = e => e.root.querySelector('.px-herocopy p');
const friendOf = (e, k) => friends(e).find(b => b.dataset.k === k);

// A transform made only of translate, 2D rotate and ONE uniform scale value.
const UNIFORM = /^(none|((translate[XY]?\([^)]*\)|rotate\(-?[\d.]+deg\)|scale\(-?[\d.]+\))\s*)+)$/;
function assertUniform(keyframes, where) {
  for (const k of keyframes) {
    for (const prop of ['width', 'height', 'scale', 'inlineSize', 'blockSize']) assert.ok(!(prop in k), `${where}: no ${prop} keyframe`);
    if (k.transform !== undefined) assert.match(k.transform, UNIFORM, `${where}: ${k.transform}`);
  }
}

for (const [name, opts, ok] of [['the device asks for reduced motion', { reduce: true }, true], ["the site's Decorative motion switch is off", { motionOff: true }, true], ['motion.js reports motion not allowed', {}, false]]) {
  test(`static and complete when ${name}: nothing animates, nothing waits, the hello still works`, async () => {
    const e = env(opts);
    e.run('home', ok);
    await e.flush();
    assert.equal(e.document.animations.length, 0, 'no animation was created');
    assert.ok(!e.stage().classList.contains('ffm-live'), 'ambient loops stay off (they need .ffm-live)');
    assert.equal(e.ios.length, 0, 'no observers');
    assert.equal(e.raf.length, 0, 'no frames requested');
    assert.equal(e.stage().querySelector('.ffa-cast').getAttribute('role'), 'toolbar', 'arrow-key group is announced as a toolbar');
    // the tagline is whole and in its friends' colors from the first frame
    assert.equal(tagline(e).textContent, 'Learn. Move. Explore. Belong.');
    assert.deepEqual(tagline(e).querySelectorAll('.ffm-w').map(w => w.dataset.k), ORDER);
    // keyboard: one tab stop for the four friends (wave 6: on Booker, center stage; was the first figure when Booker stood first)
    assert.deepEqual(friends(e).map(b => b.dataset.k), STAGE, 'Booker stands in the middle: Bop, Lumi, Booker, Zuri');
    assert.deepEqual(friends(e).map(b => b.tabIndex), [-1, -1, 0, -1]);
    // Wave 6 (research item 3): the hello is a felt dialogue card with a name tab; Booker talks in three lines (the ▶ button moves
    // on, never by itself) and asks who you are. Was a one-line bubble "Booker Brave learners ...", hidden from screen readers; the
    // card now holds real controls, so it is not aria-hidden, and the permanent status line still reads every line out.
    friendOf(e, 'booker').click();
    const say = e.stage().querySelector('.ffa-say');
    assert.equal(say.querySelector('.mh-saytab').textContent, 'Booker');
    assert.equal(say.querySelector('.mh-sayline').textContent, "Hi! I'm Booker.");
    assert.equal(e.stage().querySelector('[role=status]').textContent, "Booker: Hi! I'm Booker.", 'a permanent status line reads it out');
    say.dispatch('click', { target: say.querySelector('.mh-saynext') });
    assert.equal(e.stage().querySelector('[role=status]').textContent, 'Booker: Big breath, brave heart. I can show you around.', 'the motto is the second line');
    say.dispatch('click', { target: say.querySelector('.mh-saynext') });
    assert.equal(say.querySelector('.mh-sayline').textContent, 'Are you a family, a center, or a teacher?');
    assert.deepEqual(say.querySelectorAll('.mh-sayaskbtn').map(a => [a.getAttribute('href'), a.dataset.aud]), [['#for-families', 'families'], ['#for-centers', 'centers'], ['#teacher-standard', 'staff']], 'three ways in');
    assert.equal(say.querySelectorAll('.mh-saynext').length, 0, 'the last line has no next button');
    assert.deepEqual(friends(e).map(b => b.getAttribute('aria-pressed')), ['false', 'false', 'true', 'false']);
    assert.equal(e.document.animations.length, 0, 'the hello appears without motion');
    assert.equal(e.root.querySelectorAll('.ffm-pose').length, 0, 'no action still is created (or downloaded) with motion off');
    e.document.dispatch('keydown', { key: 'Escape' });
    assert.equal(e.stage().querySelector('.ffa-say').textContent, '');
    assert.equal(e.stage().querySelector('[role=status]').textContent, '');
    // the expression swap works with motion off too: a plain cross-fade, made on first use, no hop
    friendOf(e, 'lumi').dispatch('pointerenter', { pointerType: 'mouse' });
    const still = e.stage().querySelector('.ffa-fig[data-k=lumi] .ffm-pose[data-still=lumi-hop]');
    assert.ok(still && still.classList.contains('is-shown'), 'Lumi switches to her hop still');
    assert.equal(e.document.animations.length, 0, 'no hop with motion off');
    friendOf(e, 'lumi').dispatch('pointerleave', {});
    assert.ok(!still.classList.contains('is-shown'), 'and back');
  });
}

// Wave 6: was "the pop-up moment: each tagline word calls its friend in reading order". The friends now ARRIVE (Bop walks in, Lumi
// hops, Zuri springs up, Booker walks down the path last) and each tagline word hops when its friend lands. Every original check is
// kept against the new truth: order, one after another, rest state, words never invisible, friends never transparent, paused before
// paint, running after it, doors after the stage, under 3 s, once per visit.
test('the entrance: Bop, Lumi, Zuri, then Booker last to center stage; each word hops as its friend lands; created before paint and started after it', async () => {
  const e = env();
  e.window.FFHeroMotion.reset();
  e.run();
  const pops = e.document.animations.filter(a => a.target.classList.contains('ffa-friend'));
  assert.deepEqual(pops.map(a => a.target.dataset.k), ARRIVAL, 'Bop, Lumi, Zuri, then Booker');
  assert.ok(pops.every((a, i) => !i || a.options.delay > pops[i - 1].options.delay), 'one after another');
  assert.equal(pops[pops.length - 1].target.dataset.k, 'booker', 'Booker arrives last, the lead');
  assert.ok(pops.every(a => a.options.fill === 'backwards'), 'rest state after the entrance (no lingering fill)');
  for (const p of pops) assert.equal(p.keyframes[p.keyframes.length - 1].transform, 'none', 'every friend ends at its standing mark');
  const walk = pops[0].keyframes;
  assert.match(walk[0].transform, /^translateX\(-\d+(\.\d+)?px\)/, 'Bop starts off the left edge and walks in');
  const words = e.document.animations.filter(a => a.target.classList.contains('ffm-w'));
  assert.deepEqual(words.map(a => a.target.dataset.k), ARRIVAL);
  const M = e.window.FFHeroMotion;
  words.forEach(w => { const s = M.ARRIVE.find(x => x.k === w.target.dataset.k); assert.equal(w.options.delay, s.at + s.ms * (s.swap || 1), 'the word hops when its friend lands'); });
  for (const w of words) for (const k of w.keyframes) assert.ok(!('opacity' in k) || k.opacity > 0, 'words are never invisible (reading is never blocked)');
  for (const p of pops) assert.ok(p.keyframes.every(k => !('opacity' in k)), 'the friends are never transparent: they are drawn from the first frame (no LCP delay)');
  assert.ok(e.document.animations.every(a => a.playState === 'paused'), 'nothing runs before first paint and decode');
  await e.flush();
  assert.ok(e.document.animations.every(a => a.playState === 'running'), 'started after the first paint');
  const door = e.document.animations.find(a => a.target.classList.contains('fj-doorart'));
  assert.ok(door.options.delay >= Math.max(...pops.map(a => a.options.delay)), 'the door friends pop in after the stage');
  const last = Math.max(...e.document.animations.map(a => (a.options.delay || 0) + a.options.duration));
  assert.ok(last <= 3000, `whole entrance under 3 s (${last} ms)`);
  // The action stills hand over to the standing art on the same clock (opacity only), and Zuri is clipped at the ground line.
  const stills = e.document.animations.filter(a => a.target.classList.contains('ffm-pose'));
  assert.deepEqual(stills.map(a => a.target.closest('.ffa-fig').dataset.k).sort(), ['bop', 'lumi', 'zuri']);
  for (const a of stills) assert.ok(a.keyframes.every(k => Object.keys(k).every(x => ['opacity', 'offset'].includes(x))), 'hand-over is opacity only');
  assert.ok(e.document.animations.some(a => a.target.dataset && a.target.dataset.k === 'zuri' && a.target.classList.contains('ffa-fig') && a.keyframes.some(k => /polygon/.test(k.clipPath || ''))), 'Zuri comes up out of the grass');
  // The second visit to Home in this page load: no replay.
  e.run('friends');
  const before = e.document.animations.length;
  e.run('home');
  assert.equal(e.document.animations.filter((a, i) => i >= before && a.target.classList.contains('ffa-friend')).length, 0, 'the entrance plays once per visit');
});

test('character art only ever moves, rotates or scales uniformly (JS keyframes, live)', async () => {
  const e = env();
  e.window.FFHeroMotion.reset();
  e.run();
  await e.flush();
  e.timers.splice(0).forEach(([f]) => f()); // the entrance (and its sparkles) has finished
  friends(e).forEach(b => b.dispatch('pointerenter', { pointerType: 'mouse' }));
  friends(e).forEach(b => b.click());
  const M = e.window.FFHeroMotion;
  for (const [k, frames] of Object.entries(M.REACT)) assertUniform(frames, 'reaction ' + k);
  assertUniform(M.POP, 'entrance');
  for (const a of M.ARRIVE) assertUniform(a.frames({ dx: -321.5 }), 'arrival ' + a.k);
  assertUniform(M.WAVE, 'wave');
  const reacts = e.document.animations.filter(a => a.target.classList.contains('ffa-hop'));
  assert.deepEqual([...new Set(reacts.map(a => a.target.closest('.ffa-friend').dataset.k))].sort(), ['booker', 'bop', 'lumi', 'zuri'], 'every friend reacted (hover, then the hello)');
  for (const a of e.document.animations) assertUniform(a.keyframes, a.target.className);
});

test('no non-uniform scale on character art anywhere in the hero CSS/JS', () => {
  const files = ['hero-motion.js', 'hero-motion.css', 'brand-art.js', 'brand-art.css', 'journey.css', 'ff-motion.js', 'meadow-hero.js', 'meadow-hero.css', 'home-alive.js', 'home-alive.css'];
  for (const f of files) {
    const src = read(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    assert.doesNotMatch(src, /scaleX|scaleY|scale3d|skew|matrix|rotateX|rotateY|rotate3d|perspective\(/, f);
    assert.doesNotMatch(src, /scale\(\s*-?[\d.]+\s*,/, f + ': two-value scale()');
    if (f.endsWith('.js')) assert.doesNotMatch(src, /\bscale\s*:\s*['"`]/, f + ': no scale keyframe property in JS (only one uniform scale() inside transform)');
    assert.doesNotMatch(src, /(^|[;{\s])scale:\s*-?[\d.]+\s+-?[\d.]+/, f + ': two-value scale property');
    for (const kf of src.match(/@keyframes[^{]+\{(?:[^{}]*\{[^}]*\})*[^}]*\}/g) || [])
      assert.doesNotMatch(kf, /(^|[;{\s])(width|height|inline-size|block-size)\s*:/, f + ': no size animation in ' + kf.slice(0, 30));
  }
  // The box itself keeps the art's own ratio at every width: sized from one dimension with the cut-out's aspect ratio.
  const rule = read('brand-art.css').match(/\.ffa-fig img\{[^}]*\}/)[0];
  assert.match(rule, /width:min\(calc\(var\(--ffa-h\) \* var\(--ar,\.7\)\),118%\)/);
  assert.match(rule, /height:auto/);
  assert.match(rule, /aspect-ratio:var\(--ar,auto\)/);
  assert.match(rule, /object-fit:contain/);
  const stage = env().window.FFArt.homeStage();
  // Wave 5: the ratio is the plush library file's own (img/plush/manifest.json, 480-high files), never a guessed box.
  const man = JSON.parse(read('img/plush/manifest.json')).files;
  // Wave 6: Booker stands in his hero pose (booker-hero, a generated lead still); the others in their standing art.
  for (const [k, art] of [['booker', 'booker-hero'], ['lumi', 'lumi'], ['zuri', 'zuri'], ['bop', 'bop']]) {
    const f = man.find(x => x.path === `img/plush/characters/${art}-480.webp`);
    // Wave 6: the figure's style continues with its stage position (--x, --kh ...), so the ratio may be followed by ';' (was '"').
    assert.match(stage, new RegExp(`data-k="${k}" style="--c:var\\(--${k}\\);--ar:${(f.width / f.height).toFixed(5)}[;"]`));
  }
  assert.doesNotMatch(read('journey.css'), /\.ffa-fig img\{height/, 'no fixed height left that could fight the ratio');
});

test('every loop pauses when the stage is off screen or the tab is hidden', async () => {
  const e = env();
  e.window.FFHeroMotion.reset();
  e.run();
  // Wave 6: the motion kit watches the stage twice (loop pause, layer depth); both are told it left the screen.
  const ioAll = e.ios.filter(o => o.els.includes(e.stage()));
  const io = { fire: v => ioAll.forEach(o => o.fire(v)), get off() { return ioAll.every(o => o.off); } };
  assert.ok(ioAll.length, 'the stage is observed');
  io.fire(false);
  assert.ok(e.stage().classList.contains('ffm-paused'), 'off screen: paused');
  assert.ok(e.stage().closest('.px-homehero').classList.contains('ffm-paused'), 'the meadow world pauses with it');
  io.fire(true);
  assert.ok(!e.stage().classList.contains('ffm-paused'), 'back on screen: running');
  e.document.visibilityState = 'hidden';
  e.document.dispatch('visibilitychange');
  assert.ok(e.stage().classList.contains('ffm-paused'), 'hidden tab: paused');
  e.document.visibilityState = 'visible';
  e.document.dispatch('visibilitychange');
  assert.ok(!e.stage().classList.contains('ffm-paused'));
  // Pointer depth ignores movement while off screen.
  io.fire(false);
  const queued = e.raf.length;
  e.stage().closest('.px-homehero').dispatch('pointermove', { pointerType: 'mouse', clientX: 10, clientY: 10 });
  assert.equal(e.raf.length, queued, 'no frame work while off screen');
  // CSS: the pause rule, and every looping animation is behind both switches and only on a wired stage.
  const css = read('hero-motion.css');
  assert.match(css, /\.ffa-stage\.ffm-paused,\.ffa-stage\.ffm-paused \*\{animation-play-state:paused!important\}/);
  // Wave 7: the world's loops (clouds, sun, camera drift, petals, the logo's float) moved to hero-world.css, wired by hero-world.js
  // (.mh-alive) instead of hero-motion.js (.ffm-live); the cast's sway stays here. Same rules for both files: every loop behind both
  // switches, inside the no-preference block, only on a wired hero (was: >= 3 loops in hero-motion.css alone).
  for (const [file, wired, min] of [['hero-motion.css', /^\s*:root:not\(\[data-motion=off\]\) \.ffm-live /, 1], ['hero-world.css', /^\s*:root:not\(\[data-motion=off\]\) \.mh-hero\.mh-alive /, 6]]) {
    const src = read(file);
    const loops = src.split('\n').filter(l => /infinite/.test(l));
    assert.ok(loops.length >= min, `${file}: ${loops.length} loops`);
    for (const l of loops) assert.match(l, wired, l);
    const block = src.slice(src.indexOf('@media (prefers-reduced-motion:no-preference){'));
    for (const l of loops) assert.ok(block.includes(l.trim()), 'inside the no-preference block: ' + l.trim());
  }
  assert.match(read('hero-world.css'), /\.mh-hero\.ffm-paused \.mh-world \*,\.mh-hero\.ffm-paused \.mh-nearworld \*/, 'the world stops off screen and on a hidden tab');
  // Leaving Home tears everything down.
  e.run('friends');
  assert.equal(friends(e)[0].listenerCount('click'), 0, 'listeners removed');
  assert.ok(io.off, 'observer disconnected');
  assert.ok(!e.stage().classList.contains('ffm-live'));
});

test('keyboard parity: arrows, Home and End move between friends; focus reacts like hover; Escape closes the hello', async () => {
  const e = env();
  e.window.FFHeroMotion.reset();
  e.run();
  await e.flush();
  const b = friends(e);
  b[0].focus();
  b[0].dispatch('keydown', { key: 'ArrowRight' });
  assert.equal(e.document.activeElement, b[1]);
  assert.deepEqual(b.map(x => x.tabIndex), [-1, 0, -1, -1], 'roving tab stop follows focus');
  b[1].dispatch('keydown', { key: 'End' });
  assert.equal(e.document.activeElement, b[3]);
  b[3].dispatch('keydown', { key: 'ArrowRight' });
  assert.equal(e.document.activeElement, b[0], 'wraps around');
  b[0].dispatch('keydown', { key: 'ArrowLeft' });
  assert.equal(e.document.activeElement, b[3]);
  // Wave 6: the fourth figure is Zuri (Bop, Lumi, Booker, Zuri); was Bop when the cast stood Booker, Lumi, Zuri, Bop.
  assert.equal(b[3].dataset.k, 'zuri');
  assert.ok(tagline(e).querySelector('.ffm-w[data-k=zuri]').classList.contains('is-on'), 'the focused friend lights its word');
  assert.deepEqual(tagline(e).querySelectorAll('.ffm-w.is-on').map(w => w.dataset.k), ['zuri'], 'only the focused friend\'s word');
  b[3].click();
  // Wave 6: the card reads "Hi! I'm Zuri. <motto>" (was "<name> <motto>")
  assert.equal(e.stage().querySelector('.ffa-say .mh-sayline').textContent, "Hi! I'm Zuri. I wonder what happens if we try!");
  assert.equal(e.stage().querySelector('[role=status]').textContent, "Zuri: Hi! I'm Zuri. I wonder what happens if we try!");
  b[3].dispatch('keydown', { key: 'Escape' });
  assert.equal(e.stage().querySelector('.ffa-say').textContent, '');
  assert.deepEqual(b.map(x => x.getAttribute('aria-pressed')), ['false', 'false', 'false', 'false']);
});

test('arriving at Home from a scrolled page: the decision waits for the first frame (after go() scrolls to the top)', async () => {
  const e = env();
  e.window.FFHeroMotion.reset();
  const st = e.stage();
  st.rect = { left: 0, right: 100, width: 100, height: 140, top: -2400, bottom: -2260 }; // stale: the previous page was scrolled
  e.run();
  st.rect = { left: 0, right: 100, width: 100, height: 140, top: 200, bottom: 340 };   // go() has scrolled to the top
  await e.flush();
  const pops = e.document.animations.filter(a => a.target.classList.contains('ffa-friend'));
  assert.equal(pops.length, 4);
  assert.ok(pops.every(a => a.playState === 'running'), 'the entrance still plays');
});

test('stage still off screen at the first frame: nothing is held back, and the pop-up waits for a later Home render', async () => {
  const e = env();
  e.window.FFHeroMotion.reset();
  e.stage().rect = { left: 0, right: 100, width: 100, height: 140, top: 2400, bottom: 2540 };
  e.run();
  await e.flush();
  const pops = e.document.animations.filter(a => a.target.classList.contains('ffa-friend'));
  assert.ok(pops.length && pops.every(a => a.playState === 'idle'), 'cancelled before paint: the friends stand at rest');
  e.stage().rect = { left: 0, right: 100, width: 100, height: 140, top: 200, bottom: 340 };
  e.run('home');
  await e.flush();
  assert.ok(e.document.animations.filter(a => a.target.classList.contains('ffa-friend')).some(a => a.playState === 'running'), 'played on the next Home render');
});

test('a door further down the page keeps its friend lowered until that door arrives, then it pops in; on later visits on-screen doors stay put', async () => {
  const e = env();
  e.window.FFHeroMotion.reset();
  const art = e.root.querySelector('.fj-doorart');
  art.rect = { left: 0, right: 62, width: 62, height: 88, top: 1600, bottom: 1688 };
  e.run();
  await e.flush();
  const a = e.document.animations.find(x => x.target === art);
  assert.equal(a.playState, 'paused', 'waiting below the fold');
  const io = e.ios.find(o => o.els.includes(art));
  io.fire(true);
  assert.equal(a.playState, 'running', 'pops in on arrival');
  // A later Home render (pop-up already played) with the door on screen: no pop, the friend just stands there.
  art.rect = { left: 0, right: 62, width: 62, height: 88, top: 600, bottom: 688 };
  e.run('friends');
  const n = e.document.animations.length;
  e.run('home');
  await e.flush();
  const fresh = e.document.animations.slice(n);
  assert.equal(fresh.find(x => x.target === art).playState, 'idle', 'the door friend stands still');
  assert.equal(fresh.filter(x => x.target.classList.contains('ffa-friend')).length, 0, 'no second pop-up');
});

test('index.html loads the hero motion after the home sections, with fresh cache-busting versions', () => {
  const html = read('index.html');
  const at = f => html.indexOf(`<script src="${f}?v=`);
  const v = f => +((html.match(new RegExp(f.replace('.', '\\.') + '\\?v=(\\d+)')) || [])[1] || 0);
  assert.ok(at('hero-motion.js') > at('home-signatures.js') && at('home-signatures.js') > at('views.js'));
  assert.ok(at('brand-art.js') < at('views.js'));
  assert.ok(html.indexOf('href="hero-motion.css?v=') > html.indexOf('href="journey.css?v='));
  assert.ok(v('hero-motion.js') >= 1 && v('hero-motion.css') >= 1 && v('brand-art.js') >= 2 && v('brand-art.css') >= 3 && v('journey.css') >= 2);
  // Wave 6: the motion kit loads before every module that builds on it; the meadow world before the views.
  assert.ok(at('ff-motion.js') > 0 && at('ff-motion.js') < at('hero-motion.js') && at('ff-motion.js') < at('home-alive.js'));
  assert.ok(at('meadow-hero.js') > 0 && at('meadow-hero.js') < at('views.js'));
  assert.ok(v('hero-motion.js') >= 2 && v('hero-motion.css') >= 2 && v('brand-art.js') >= 5 && v('plush-cast.js') >= 2);
});
