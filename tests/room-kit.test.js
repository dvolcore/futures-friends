// The Learning Zones Kit (#room-kit), owner 2026-10-07: the route renders, the site links into it, the three to-scale floor plans
// are inlined (and their files exist), every price on it is one the owner approved (the published packages plus the two Zone
// Boundaries prices; every other add-on says "Quote"), Bop is purple (no retired orange anywhere in the kit), kit pieces carry an
// honest status, story-world characters are labelled, and no curriculum lesson content appears (IP lockdown).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { site: baseSite, read, text, ROOT } = require('./site-vm');

function site() {
  const c = baseSite();
  for (const f of ['room-kit-plans.js', 'room-kit.js']) vm.runInContext(read(f), c, { filename: f });
  return c;
}
const RK = () => site().window.FFRoomKit;
// values from the VM are another realm's arrays: compare them as plain JSON
const same = (a, b, m) => assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)), m);

test('#room-kit renders one h1, its sections, unique ids and no template leaks', () => {
  const html = site().render('room-kit');
  assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
  assert.ok((html.match(/<h2[ >]/g) || []).length >= 8);
  assert.doesNotMatch(html, /undefined|\[object Object\]|NaN/);
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(ids).size, ids.length, 'ids are unique: ' + ids.filter((x, i) => ids.indexOf(x) !== i).join(','));
  for (const id of ['rk-zones', 'rk-cue', 'rk-room', 'rk-kit', 'rk-fence', 'rk-layouts', 'rk-packages', 'rk-safety', 'rk-ask'])
    assert.ok(html.includes(`id="${id}"`), id);
  for (const a of [...html.matchAll(/data-anchor="([^"]+)"/g)].map(m => m[1])) assert.ok(html.includes(`id="${a}"`), 'anchor target ' + a);
  for (const r of [...html.matchAll(/aria-(?:labelledby|controls|describedby)="([^"]+)"/g)].map(m => m[1])) for (const id of r.split(' ')) assert.ok(html.includes(`id="${id}"`), 'aria target ' + id);
});

test('the five zones: canon names, friend, colour and purpose; Bop purple', () => {
  const { ZONES } = RK();
  same(ZONES.map(z => z.name), ['Friends Circle', 'Booker’s Reading Area', 'Lumi’s Calm Corner', 'Zuri’s Discovery Zone', 'Bop’s Movement Zone']);
  for (const z of ZONES) { assert.ok(z.purpose.length > 40, z.name); assert.ok(z.colour && z.felt && z.ink && z.tint, z.name); }
  const bop = ZONES.find(z => z.k === 'bop');
  same([bop.colour, bop.felt, bop.ink, bop.tint], ['Purple', '#8236AE', '#6B2A8E', '#F3EAFB']);
  const t = text(site().render('room-kit'));
  assert.match(t, /Learn\. Move\. Explore\. Belong\./);
  assert.doesNotMatch(t, /Learn\. Play\./);
  assert.match(t, /never a time-out/);
});

test('no orange Bop anywhere in the kit page, its styles, its plans or the plan files', () => {
  const ORANGE = /#(E8761E|F5A566|A84908|9C4507|B5541A|FDEDE0|FCEEE2|FCE6D2)\b/i;
  for (const f of ['room-kit.js', 'room-kit.css', 'room-kit-plans.js', 'img/room-kit/home-12x14.svg', 'img/room-kit/classroom-20x25.svg', 'img/room-kit/church-packaway-22x28.svg'])
    assert.doesNotMatch(read(f), ORANGE, f);
  const html = site().render('room-kit');
  assert.doesNotMatch(html, ORANGE);
  assert.doesNotMatch(html, /var\(--bop\)|--wc-bop/, 'the page never uses the site-wide Bop token, which may still be orange');
  assert.match(read('room-kit.css'), /#8236AE/);
});

test('the three floor plans are inlined with unique ids and their files exist', () => {
  const html = site().render('room-kit'), P = site().window.FFRoomKitPlans;
  same(Object.keys(P), ['home', 'classroom', 'church']);
  assert.equal((html.match(/<svg class="rk-plan-svg"/g) || []).length, 3);
  for (const l of RK().LAYOUTS) {
    assert.ok(fs.existsSync(path.join(ROOT, l.file)), l.file);
    assert.ok(html.includes(`href="${l.file}"`), 'full-size link ' + l.file);
    assert.match(P[l.k], new RegExp(`<title id="rk-${l.k}-title">`));
    assert.match(P[l.k], /viewBox="0 0 \d+ \d+"/);
    assert.doesNotMatch(P[l.k], /\swidth="\d+" height="\d+" role/, 'no fixed size on the outer svg');
  }
  for (const s of ['12 x 14', '20 x 25', '28 x 22']) assert.ok(text(html).includes(s), s);
  // the generated file is current
  const before = read('room-kit-plans.js');
  require('node:child_process').execFileSync(process.execPath, [path.join(ROOT, 'tools/build-room-kit-plans.mjs')]);
  assert.equal(read('room-kit-plans.js'), before, 'room-kit-plans.js matches img/room-kit/*.svg (run node tools/build-room-kit-plans.mjs)');
});

test('prices: only the published packages and the two approved Zone Boundaries prices; everything else says Quote', () => {
  const c = site(), html = c.render('room-kit');
  const APPROVED = [1495, 89, 2995, 229, 5995, 349, 1195, 1995];
  const shown = [...html.matchAll(/data-price="(\d+)"/g)].map(m => +m[1]);
  same([...new Set(shown)].sort((a, b) => a - b), [...APPROVED].sort((a, b) => a - b));
  const dollars = [...text(html).matchAll(/\$([\d,]+)/g)].map(m => +m[1].replace(/,/g, ''));
  for (const d of dollars) assert.ok(APPROVED.includes(d), 'unapproved price on the page: $' + d);
  // same as #pricing
  const P = c.window.FFPricing.TIERS;
  same(RK().TIERS().map(t => [t.name, t.startup, t.monthly]), P.map(t => [t.name, t.startup, t.monthly]));
  const A = RK().ADDONS;
  same(A.filter(a => a.price).map(a => [a.name, a.price]), [['Zone Boundaries, home', 1195], ['Zone Boundaries, classroom', 1995]]);
  assert.equal((html.match(/class="rk-quote">Quote</g) || []).length, A.filter(a => !a.price).length);
  // the pricing band repeats only the two approved add-on prices
  const band = text(RK().band('pricing'));
  same([...band.matchAll(/\$([\d,]+)/g)].map(m => m[1]), ['1,195', '1,995']);
});

test('kit pieces carry an honest status: puppets now, plush later, fences and rugs in development', () => {
  const { KIT, STATUS } = RK(), st = name => (KIT.find(r => r[0].startsWith(name)) || [])[4];
  same(Object.values(STATUS), ['Available now', 'In development', 'Coming later']);
  for (const r of KIT) assert.ok(STATUS[r[4]], r[0]);
  assert.equal(st('Printed friend stick puppets'), 'now');
  assert.equal(st('Friend plush'), 'later');
  assert.equal(st('Friend Fence'), 'dev');
  assert.equal(st('Friends Circle rug'), 'dev');
  assert.equal(st('Zone mats'), 'dev');
  const t = text(site().render('room-kit'));
  assert.match(t, /toy-safety testing/);
  assert.match(t, /22 to 24 in/);
  assert.match(t, /see-through/i);
  assert.match(t, /tip test/);
});

test('safety strip: flammability, toy safety, sightlines, Missouri washable mats, square feet per child', () => {
  const t = text(site().render('room-kit'));
  for (const s of ['16 CFR 1630 or 1631', 'ASTM F963', 'Sightlines', '5 CSR 25-500.082', 'Missouri 35 sq ft per child', 'Kansas centers 28', '36 in clear'])
    assert.ok(t.includes(s), s);
});

test('the cue demo uses the friend voice lines already on the site and the site chime', () => {
  const src = read('room-kit.js');
  assert.match(src, /Vo\.play\(k\)/);
  assert.match(src, /S\.play\('chime'/);
  for (const k of ['booker', 'lumi', 'zuri', 'bop']) for (const ext of ['m4a', 'webm']) assert.ok(fs.existsSync(path.join(ROOT, `audio/friends/${k}-hello.${ext}`)), k + ext);
  const html = site().render('room-kit');
  for (const k of ['booker', 'lumi', 'zuri', 'bop']) assert.ok(html.includes(`data-rk-cue="${k}"`), 'hear button for ' + k);
  same(RK().CUE.map(c => c[0]), ['chime', 'card', 'voice', 'path', 'mat']);
  assert.doesNotMatch(src, /\sautoplay[\s=>]/, "no autoplay attribute");
});

test('story-world characters are labelled; room pictures are labelled real or concept', () => {
  const html = site().render('room-kit'), t = text(html);
  assert.match(t, /Story-world characters/);
  for (const n of ['Booker', 'Lumi', 'Zuri', 'Bop']) assert.ok(t.includes(`${n} is a story-world character`), n);
  assert.match(html, /data-rk-rooms/);
  assert.match(t, /Real photo/);
  assert.match(read('room-kit.js'), /img\/branded-rooms\/manifest\.json/);
  assert.match(read('room-kit.js'), /W\.FFBrandedRooms/);
  assert.match(read('room-kit.js'), /Planned-design view/);
  for (const m of html.matchAll(/src="(img\/center\/[^"]+)"/g)) assert.ok(fs.existsSync(path.join(ROOT, m[1])), m[1]);
});

test('no curriculum lesson content on the page (IP lockdown)', () => {
  const t = text(site().render('room-kit'));
  assert.doesNotMatch(t, /\bDay \d|\bWeek \d|lesson plan|objective|learning step|Unit \d/i);
});

test('links in: nav group, footer, route meta, home doors, zone map and the center, home, options, pricing and shop pages', () => {
  const c = site();
  for (const r of ['for-centers', 'for-home', 'options', 'pricing', 'shop-programs', 'corners']) assert.match(c.render(r), /href="#room-kit"/, r);
  assert.match(read('views.js'), /ffhm-cap">[^<]*<a class="rl" href="#room-kit">/, 'the zone map caption');
  // Home: no new link (the calm-Home link budget, tests/w4-home.test.js, is full); Home reaches the kit via For centers / For home
  assert.match(read('wayfinding.js'), /\['room-kit', 'Learning Zones Kit'\]/);
  assert.match(read('wayfinding.js'), /'room-kit': \['Learning Zones Kit', 'centers'/);
  assert.ok(require(path.join(ROOT, 'route-meta.js')).ROUTES['room-kit']);
  const html = read('index.html');
  assert.match(html, /<li><a href="#room-kit">Learning Zones Kit<\/a><\/li>/);
  const at = s => html.indexOf(s);
  assert.ok(at('<script src="room-kit-plans.js') > at('<script src="pricing-all-in.js') && at('<script src="room-kit.js') > at('<script src="room-kit-plans.js'));
  assert.ok(at('<script src="room-kit.js') < at('<script src="home-calm.js'));
  assert.match(html, /<link rel="stylesheet" href="room-kit\.css\?v=\d+">/);
});

test('the quote form goes through the existing intake with its own preset', () => {
  const html = site().render('room-kit');
  assert.match(html, /Request a quote or book a demo/);
  assert.match(html, /data-rk-demo-ask/);
});
