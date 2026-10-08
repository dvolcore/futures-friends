// The Learning Zones Kit showcase (kit-showcase.js), owner 2026-10-07: the kit must be seen. One component, first section under the
// hero on #centers and high on #for-centers, #for-home and #pricing; prices come from the data sources (FFRoomKit / FFPricing),
// never typed in; every image keeps its Concept badge; honest "Ordering opens soon"; Families Home carries no showcase.
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { site: baseSite, read, text } = require('./site-vm');

function site() {
  const c = baseSite();
  for (const f of ['room-kit-plans.js', 'room-kit.js']) vm.runInContext(read(f), c, { filename: f });
  // #centers lives in audiences.js, which needs the browser: stand in for the one view, with a hero then a status line then sections
  vm.runInContext(`V.centers = () => phero('For centers', 'Bring Futures Friends', 'x', {}) + '<div class="hc-status"></div><section class="aud-sec"></section>';`, c);
  vm.runInContext(read('kit-showcase.js'), c, { filename: 'kit-showcase.js' });
  return c;
}
const firstSection = html => (html.match(/<section[^>]*>/) || [''])[0];

test('the band is the first section under the hero on every page that carries it', () => {
  const c = site();
  for (const r of ['for-centers', 'for-home', 'pricing']) {
    const h = c.render(r);
    assert.match(firstSection(h), /class="ks ks-compact"/, r + ': first section is the kit band');
    assert.equal((h.match(/class="ks /g) || []).length, 1, r + ': one band');
    assert.doesNotMatch(h, /class="rk-band"/, r + ': the old end-of-page band is gone (one component, not two)');
  }
  const centers = c.render('centers');
  assert.match(firstSection(centers), /class="ks ks-full"/, 'centers: full band first');
  assert.ok(centers.indexOf('class="phero"') < centers.indexOf('class="ks '), 'under the hero');
});

test('families Home carries no showcase', () => {
  const h = site().render('home');
  assert.doesNotMatch(h, /class="ks /);
  assert.doesNotMatch(read('home-calm.js'), /kit-showcase|FFKitShowcase/);
});

test('prices come from the data sources: add-on from FFRoomKit.ADDONS, packages from FFPricing', () => {
  const c = site(), RK = c.window.FFRoomKit, P = c.window.FFPricing;
  const t = text(c.render('centers'));
  for (const a of RK.ADDONS.filter(a => a.price != null)) assert.ok(t.includes('$' + a.price.toLocaleString('en-US')), a.name);
  for (const x of P.TIERS) { assert.ok(t.includes('$' + x.startup.toLocaleString('en-US')), x.name + ' startup'); assert.ok(t.includes('$' + x.monthly), x.name + ' monthly'); }
  const allowed = new Set([1195, 1995, ...P.TIERS.flatMap(x => [x.startup, x.monthly])]);
  for (const m of t.matchAll(/\$\s?([\d,]+)/g)) assert.ok(allowed.has(Number(m[1].replace(/,/g, ''))), 'unapproved price ' + m[0]);
  const src = read('kit-showcase.js');
  assert.doesNotMatch(src.replace(/\/\*[\s\S]*?\*\//, ''), /\b(1195|1995|1495|2995|5995)\b/, 'no price typed into the component');
});

test('every concept image has its Concept badge, alt text, lazy loading and the Real room / With the kit toggle', () => {
  const c = site(), n = c.window.FFBrandedRooms.length, h = c.render('centers');
  assert.ok(n >= 5);
  assert.equal((h.match(/class="ks-slide"/g) || []).length, n, 'one slide per FFBrandedRooms room');
  assert.equal((h.match(/class="ffa-kit-label"[^>]*>Concept</g) || []).length, n, 'Concept badge on every slide');
  assert.equal((h.match(/<span class="ffa-kit-caption">AI-generated proposed transformation — furnishings and products shown as concepts\.<\/span>/g) || []).length, n, 'the required caption under every slide');
  const fc = c.render('for-centers'); assert.ok(fc.indexOf('class="ks ') < fc.indexOf('ffa-compare'), 'the showcase (main classroom first) leads; the today vs proposed pair is underneath');
  assert.match(fc, /ffa-compare[\s\S]*Today \(real photo\)[\s\S]*Proposed \(concept\)[\s\S]*AI-generated proposed transformation/);
  assert.equal((h.match(/data-kit-show="real"/g) || []).length, n);
  assert.equal((h.match(/data-kit-show="kit"/g) || []).length, n);
  const imgs = [...h.matchAll(/<img\b[^>]*>/g)].map(m => m[0]).filter(i => /data-(kit|real)-photo/.test(i));
  assert.ok(imgs.length >= 2 * n);
  for (const i of imgs) { assert.match(i, /alt="[^"]+"/, 'alt: ' + i.slice(0, 80)); assert.match(i, /loading="lazy"/); }
  for (const r of c.window.FFBrandedRooms) assert.match(h, new RegExp('data-kit-photo="' + r.key + '"'));
});

test('honest and accessible: Ordering opens soon, CTAs, five zones, keyboard carousel, reduced motion', () => {
  const c = site(), h = c.render('centers'), t = text(h);
  assert.match(t, /Ordering opens soon/);
  for (const [href, label] of [['#room-kit', 'See the kit'], ['#room-planner', 'Plan your room'], ['#quote', 'Get a quote']]) assert.match(h, new RegExp('href="' + href + '">' + label));
  for (const z of ['Friends Circle', 'Reading Area', 'Calm Corner', 'Discovery Zone', 'Movement Zone']) assert.ok(t.includes(z), z);
  assert.match(h, /role="region" aria-roledescription="carousel"/);
  assert.match(h, /aria-label="Previous room"/); assert.match(h, /aria-label="Next room"/);
  assert.match(h, /<div class="ks-track" tabindex="0"/);
  assert.match(read('kit-showcase.js'), /prefers-reduced-motion/);
  assert.match(read('kit-showcase.css'), /prefers-reduced-motion/);
  assert.doesNotMatch(t, /undefined|NaN|\[object/);
});
