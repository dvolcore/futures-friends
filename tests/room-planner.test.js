// The Room Planner (#room-planner and the "Plan your own room" section on #room-kit), owner 2026-10-07: customers enter their own
// room, move the kit around, and see whether it fits. Pure checks of the model (fit math, square feet per child, the 36 in exit
// path, overlaps, sightlines, approved prices only, save/load) and browser checks (it renders on a phone and a desktop with no
// axe violations, keyboard moves, pointer drags, the layout survives a reload and a share link, and "Send my layout" only fills the
// existing intake form).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { site: baseSite, read, text, ROOT } = require('./site-vm');
const C = require('../room-planner-core.js');

const IN = 12;
const room = (w, l, items, setup) => ({ v: 1, room: { w: w * IN, l: l * IN }, setup: Object.assign({}, C.DEFAULT_SETUP, setup || {}), items: items || [] });
const kinds = (iss, level) => iss.filter(i => !level || i.level === level).map(i => i.kind);
const exitDoor = (o) => C.make('door', Object.assign({ wall: 'S', at: 12, w: 36, exit: true, swing: 'in' }, o));
function site() {
  const c = baseSite();
  for (const f of ['room-kit-plans.js', 'room-kit.js', 'room-planner-core.js', 'room-planner.js']) vm.runInContext(read(f), c, { filename: f });
  return c;
}

// ---------------------------------------------------------------- square feet per child
test('space per child: Missouri 35, Kansas centers 28, Kansas homes 25, Missouri infants and toddlers 45 (the stricter number)', () => {
  const m = s => C.minPerChild(Object.assign({}, C.DEFAULT_SETUP, s)).sqft;
  assert.equal(m({ state: 'MO', type: 'center', ages: ['threes'] }), 35);
  assert.equal(m({ state: 'MO', type: 'home', ages: ['twos'] }), 35);
  assert.equal(m({ state: 'MO', type: 'church', ages: ['prek'] }), 35);
  assert.equal(m({ state: 'MO', type: 'center', ages: ['toddler', 'threes'] }), 45);
  assert.equal(m({ state: 'KS', type: 'center', ages: ['threes'] }), 28);
  assert.equal(m({ state: 'KS', type: 'home', ages: ['threes'] }), 25);
  assert.equal(m({ state: 'KS', type: 'church', ages: ['threes'] }), 28, 'Kansas has no religious exemption');
  // the direction doc and the regulation research carry the same numbers and citations
  const doc = fs.readFileSync(path.join(process.env.HOME, 'Downloads/FUTURES_FRIENDS_PROJECT/14_Client_Package/LEARNING_ZONES_KIT_DIRECTION.md'), 'utf8');
  for (const s of ['Missouri 35', 'Kansas centers 28', 'Kansas homes 25']) assert.ok(doc.includes(s), s);
  const src = read('room-planner-core.js');
  for (const c of ['5 CSR 25-500.082', '5 CSR 25-400.085', '5 CSR 25-300.090', 'K.S.A. 65-539(b)', 'K.A.R. 28-4-115(c)']) assert.ok(src.includes(c), c);
});

test('usable floor takes off fixed equipment; capacity and the space check follow it', () => {
  const s = room(20, 25, [exitDoor(), C.make('bath', { x: 0, y: 0, w: 60, l: 60 })], { state: 'MO', type: 'center', ages: ['threes'], children: 14 });
  const sp = C.space(s);
  assert.equal(Math.round(sp.totalSqft), 500);
  assert.equal(Math.round(sp.usableSqft), 475, 'a 5 x 5 ft bathroom comes off');
  assert.equal(sp.capacity, 13);
  assert.ok(!sp.ok);
  assert.ok(C.check(s).some(i => i.kind === 'space' && i.level === 'stop' && /under the Missouri minimum of 35/.test(i.msg)));
  s.setup.children = 13; assert.ok(!kinds(C.check(s), 'stop').includes('space'));
  s.setup.state = 'KS'; s.setup.children = 16; assert.ok(!kinds(C.check(s), 'stop').includes('space'), '475 / 16 = 29.7 >= Kansas 28');
});

// ---------------------------------------------------------------- fit math and overlaps
test('fit: a piece past a wall does not fit; turning a mat swaps its footprint', () => {
  const mat = C.make('mat', { z: 'booker', sz: '46', w: 48, l: 72, x: 200, y: 10 });
  const s = room(20, 20, [exitDoor(), mat]);
  assert.ok(C.check(s).some(i => i.kind === 'fit' && i.level === 'stop' && i.ids.includes(mat.id)), '200 + 48 > 240');
  mat.x = 180; assert.ok(!C.check(s).some(i => i.kind === 'fit' && i.ids.includes(mat.id)));
  assert.deepEqual(C.box(mat, s.room), { x: 180, y: 10, w: 48, h: 72 });
  mat.rot = 90; assert.deepEqual(C.box(mat, s.room), { x: 180, y: 10, w: 72, h: 48 });
  assert.ok(C.check(s).some(i => i.kind === 'fit' && i.level === 'stop' && i.ids.includes(mat.id)), 'turned, it runs past the east wall');
  const door = C.make('door', { wall: 'N', at: 220, w: 36 });
  assert.ok(C.check(room(20, 20, [exitDoor(), door])).some(i => i.ids.includes(door.id) && /runs past the end/.test(i.msg)));
});

test('overlaps: furniture on furniture must be fixed; mat on mat is a trip edge; a fence on a mat stands wrong; circles are round', () => {
  const a = C.make('table', { x: 50, y: 50 }), b = C.make('lowshelf', { x: 80, y: 60 });
  const m1 = C.make('mat', { z: 'lumi', sz: '35', w: 36, l: 60, x: 150, y: 100 }), m2 = C.make('mat', { z: 'zuri', sz: '35', w: 36, l: 60, x: 170, y: 120 });
  const f = C.make('fence', { sz: '36', w: 36, l: 3, x: 150, y: 120, z: 'lumi' });
  const iss = C.check(room(25, 20, [exitDoor({ at: 250 }), a, b, m1, m2, f]));
  const has = (lvl, re, ids) => iss.some(i => i.level === lvl && re.test(i.msg) && ids.every(id => i.ids.includes(id)));
  assert.ok(has('stop', /overlap/, [a.id, b.id]));
  assert.ok(has('warn', /trip edge/, [m1.id, m2.id]));
  assert.ok(has('warn', /stands on/, [f.id]));
  // a 6 ft round rug and a box at its corner do not touch (the corner of the bounding square is empty)
  const rug = C.sized('circle', 'r6', { x: 0, y: 0 }), corner = C.make('column', { x: 62, y: 62, w: 8, l: 8 });
  assert.equal(C.overlapItems(rug, corner, { w: 240, l: 240 }), false);
  corner.x = 50; corner.y = 50; assert.equal(C.overlapItems(rug, corner, { w: 240, l: 240 }), true);
});

// ---------------------------------------------------------------- the 36 in clear exit path
test('exit path: a zone behind a 30 in gap has no 36 in route to the exit; a 36 in gap does; nothing solid in a door swing', () => {
  // a wall of shelves across the room with one gap; the mat is on the far side from the exit
  const build = gap => {
    const left = C.make('builtin', { x: 0, y: 120, w: 120, l: 14, hgt: 72 }), right = C.make('builtin', { x: 120 + gap, y: 120, w: 240 - 120 - gap, l: 14, hgt: 72 });
    const mat = C.make('mat', { z: 'booker', sz: '46', w: 48, l: 72, x: 96, y: 10, rot: 90 });
    return { s: room(20, 20, [exitDoor({ at: 100 }), left, right, mat, C.make('teacher', { x: 140, y: 170 })]), mat };
  };
  const narrow = build(30), wide = build(36);
  assert.ok(C.check(narrow.s).some(i => i.kind === 'exit' && i.level === 'stop' && i.ids.includes(narrow.mat.id)), '30 in gap blocks');
  assert.ok(!C.check(wide.s).some(i => i.kind === 'exit' && i.level === 'stop'), '36 in gap is clear');
  assert.ok(C.check(narrow.s).some(i => i.kind === 'walk' || i.kind === 'exit'));
  // no exit door at all
  assert.ok(C.check(room(12, 12, [C.sized('circle', 'r6', { x: 30, y: 30 })])).some(i => i.kind === 'exit' && /at least one door/.test(i.msg)));
  // a fence in the door swing must move; a rug there is a warning
  const door = exitDoor({ at: 60 }), fence = C.make('fence', { sz: '36', w: 36, l: 3, x: 60, y: 220 });
  const iss = C.check(room(20, 20, [door, fence]));
  assert.ok(iss.some(i => i.kind === 'exit' && i.level === 'stop' && i.ids.includes(fence.id) && /swing/.test(i.msg)));
  fence.t = 'mat'; fence.z = 'bop'; fence.l = 20;
  assert.ok(C.check(room(20, 20, [door, fence])).some(i => i.kind === 'exit' && i.level === 'warn' && /swing/.test(i.msg)));
});

test('walkways: two shelves 24 in apart warn; 36 in apart or pushed together do not', () => {
  const w = gap => C.check(room(20, 20, [exitDoor(), C.make('lowshelf', { x: 40, y: 60 }), C.make('tallshelf', { x: 40, y: 73 + gap })])).filter(i => i.kind === 'walk');
  assert.equal(w(24).length, 1); assert.match(w(24)[0].msg, /Only 24 in/);
  assert.equal(w(36).length, 0); assert.equal(w(0).length, 0);
});

test('sightlines: a tall shelf hides Lumi from the teacher (a stop); a 24 in fence does not', () => {
  const lumi = C.make('mat', { z: 'lumi', sz: '35', w: 36, l: 60, x: 180, y: 20 });
  const t = C.make('teacher', { x: 20, y: 40 });
  const tall = C.make('tallshelf', { x: 120, y: 20, w: 15, l: 80 });
  const fence = C.make('fence', { sz: '36', w: 36, l: 3, rot: 90, x: 120, y: 30, z: 'lumi' });
  const sight = items => C.check(room(20, 20, [exitDoor(), lumi, t, ...items])).filter(i => i.kind === 'sight');
  assert.ok(sight([tall]).some(i => i.level === 'stop' && /Lumi’s Calm Corner must stay in full view/.test(i.msg)));
  assert.deepEqual(sight([fence]), []);
  assert.ok(C.check(room(20, 20, [exitDoor(), lumi])).some(i => i.kind === 'sight' && /Add a teacher position/.test(i.msg)));
});

test('safety and comfort: heaters keep 36 in clear; calm corner away from doors and from Bop; Missouri infant and toddler rooms get washable mats', () => {
  const heater = C.make('heater', { x: 0, y: 100 }), mat = C.make('mat', { z: 'booker', sz: '35', w: 36, l: 60, x: 20, y: 120 });
  assert.ok(C.check(room(20, 20, [exitDoor({ at: 150 }), heater, mat])).some(i => i.kind === 'safety' && i.level === 'stop' && /36 in away/.test(i.msg)));
  const lumi = C.make('mat', { z: 'lumi', sz: '35', w: 36, l: 60, x: 20, y: 160 }), bop = C.make('mat', { z: 'bop', sz: '35', w: 36, l: 60, x: 80, y: 160 });
  const iss = C.check(room(20, 20, [exitDoor({ at: 20 }), lumi, bop]));
  assert.ok(iss.some(i => i.kind === 'calm' && /door/.test(i.msg)));
  assert.ok(iss.some(i => i.kind === 'calm' && /Bop’s Movement Zone/.test(i.msg)));
  const it = room(20, 20, [exitDoor(), C.make('mat', { z: 'zuri', sz: '35', w: 36, l: 60, x: 100, y: 40 })], { state: 'MO', ages: ['toddler'] });
  assert.ok(C.check(it).some(i => i.kind === 'age' && /washable mats/.test(i.msg)));
  assert.ok(C.bom(it).lines.some(l => /Washable/.test(l.name) && l.note === 'Quote'));
  it.setup.state = 'KS'; assert.ok(!C.check(it).some(i => /washable mats laundered/.test(i.msg)));
});

// ---------------------------------------------------------------- templates and auto-arrange
test('the three starting layouts and auto-arrange for other sizes: nothing blocking, every zone placed', () => {
  for (const k of ['home', 'classroom', 'church']) {
    const s = C.template(k), iss = C.check(s);
    assert.deepEqual(iss.filter(i => i.level === 'stop').map(i => i.msg), [], k);
    assert.ok(s.items.some(i => i.t === 'circle'), k + ' has the Friends Circle');
    const mats = s.items.filter(i => i.t === 'mat').map(i => i.z).sort();
    assert.deepEqual(mats, k === 'home' ? ['booker', 'lumi', 'zuri'] : ['booker', 'bop', 'lumi', 'zuri'], k + ' mats (in a small home room Bop shares the circle)');
    assert.ok(s.items.some(i => i.t === 'teacher'), k + ' teacher position');
    assert.ok(s.items.filter(i => i.t === 'door' && i.exit).length >= 1);
  }
  assert.equal(C.template('home').room.w, 168); assert.equal(C.template('classroom').room.l, 240); assert.equal(C.template('church').room.w, 336);
  for (const [w, l, type] of [[16, 18, 'center'], [30, 22, 'center'], [11, 13, 'home'], [24, 40, 'church']]) {
    const s = C.autoArrange(room(w, l, [exitDoor({ at: 24 }), C.make('window', { wall: 'N', at: 48, w: 48 })], { type, children: 1 }));
    const stops = C.check(s).filter(i => i.level === 'stop');
    assert.deepEqual(stops.map(i => i.msg), [], `${w} x ${l}`);
    assert.ok(s.items.some(i => i.t === 'circle'), `${w} x ${l} circle`);
  }
});

test('floor paths route from the circle to each mat and never through a door swing', () => {
  const s = C.template('church'), P = C.paths(s);
  assert.equal(P.length, 4);
  for (const p of P) assert.ok(p.ok, p.z);
  const sw = s.items.filter(i => i.t === 'door').map(d => C.swing(d, s.room)).filter(Boolean);
  for (const p of P) for (const q of p.at) for (const r of sw) assert.ok(!(q.x > r.x && q.x < r.x + r.w && q.y > r.y && q.y < r.y + r.h), 'print in a door swing');
});

// ---------------------------------------------------------------- prices: approved only
test('bill of materials: only approved prices; everything else Quote, Included or Coming later; totals are sums of approved lines', () => {
  assert.deepEqual([...C.APPROVED].sort((a, b) => a - b), [89, 229, 349, 1195, 1495, 1995, 2995, 5995]);
  const c = site(), K = c.window.FFRoomKit;
  // the planner's tiers are the published ones
  assert.deepEqual(JSON.parse(JSON.stringify(C.TIERS.map(t => [t.id, t.name, t.startup, t.monthly]))), JSON.parse(JSON.stringify(K.TIERS().map(t => [t.id, t.name, t.startup, t.monthly]))));
  assert.deepEqual([C.BOUNDARIES.home.price, C.BOUNDARIES.classroom.price], JSON.parse(JSON.stringify(K.ADDONS.filter(a => a.price).map(a => a.price))));
  const cases = [C.template('home'), C.template('classroom'), C.template('church'), Object.assign(C.template('classroom'), {})];
  cases[3].setup.rooms = 6; cases[3].setup.install = true; cases[3].items.push(C.make('corner', { z: 'bop', x: 10, y: 10 }));
  for (const s of cases) {
    const b = C.bom(s);
    for (const l of b.lines) {
      if (l.price != null) assert.ok(C.APPROVED.includes(l.price), `${l.name}: $${l.price}`);
      else assert.ok(['Quote', 'Included', 'Coming later'].includes(l.note), `${l.name}: ${l.note}`);
      if (l.monthly) assert.ok(C.APPROVED.includes(l.monthly));
    }
    assert.equal(b.startup, b.lines.filter(l => l.price != null).reduce((a, l) => a + l.price * (l.qty || 1), 0));
    assert.ok(C.APPROVED.includes(b.monthly));
  }
  assert.equal(C.bom(C.template('home')).startup, 1495 + 1195);
  assert.equal(C.bom(C.template('classroom')).startup, 2995 + 1995);
  const big = C.bom(cases[3]);
  assert.equal(big.tier.id, 'complete');
  assert.ok(big.lines.some(l => l.name === 'Extra room Zone Starter' || (/Extra room/.test(l.name) && l.qty === 2 && l.note === 'Quote')));
  assert.ok(big.lines.some(l => /corner/.test(l.name) && l.note === 'Quote'));
  assert.ok(big.lines.some(l => /White-glove/.test(l.name) && l.note === 'Quote'));
  // the rendered page: every dollar figure is an approved price or this layout's estimate total
  c.window.FFRoomPlanner.set(C.template('classroom'));
  const t = text(c.render('room-planner')), total = C.bom(C.template('classroom')).startup;
  for (const m of t.matchAll(/\$([\d,]+)/g)) { const d = +m[1].replace(/,/g, ''); assert.ok(C.APPROVED.includes(d) || d === total, 'unapproved dollar figure on #room-planner: $' + m[1]); }
  // the band on #room-kit shows no price at all, so room-kit's own price test still holds
  assert.doesNotMatch(text(c.window.FFRoomPlanner.band()), /\$/);
});

// ---------------------------------------------------------------- save, share and load
test('save and load: the share code and the layout file round-trip; anything from a link is cleaned', () => {
  for (const k of ['home', 'classroom', 'church']) {
    const s = C.template(k), code = C.encode(s), back = C.decode(code);
    assert.match(code, /^[A-Za-z0-9_-]+$/, 'url-safe');
    assert.ok(code.length < 4000, `${k} link is ${code.length} chars`);
    assert.deepEqual(C.pack(back), C.pack(s));
    assert.deepEqual(C.pack(C.fromJSON(JSON.stringify(C.pack(s)))), C.pack(s), 'downloaded file');
  }
  assert.equal(C.decode('not a layout!'), null);
  assert.equal(C.decode('e30'), null, '{} is not a layout');
  const evil = C.sanitize({ name: '<img src=x onerror=alert(1)>Room', room: { w: 1e9, l: -5 }, setup: { state: 'XX', type: 'castle', ages: ['threes', 'teens'], children: 'lots' },
    items: [{ t: 'script' }, { t: 'mat', z: 'villain', sz: 'huge', x: 'NaN', y: 1e12, w: 48, l: 72, rot: 45 }, ...Array.from({ length: 400 }, () => ({ t: 'column' }))] });
  assert.doesNotMatch(evil.name, /[<>]/);
  assert.equal(evil.room.w, 1200); assert.equal(evil.room.l, 48);
  assert.equal(evil.setup.state, 'MO'); assert.equal(evil.setup.type, 'center'); assert.deepEqual(evil.setup.ages, ['threes']);
  assert.ok(evil.items.length <= 160);
  const m = evil.items.find(i => i.t === 'mat');
  assert.equal(m.z, undefined); assert.equal(m.sz, 'custom'); assert.equal(m.rot, 0); assert.equal(m.y, 1200); assert.equal(m.x, 0);
  // the planner reads storage only inside try/catch
  const src = read('room-planner.js');
  assert.match(src, /get\(k\) \{ try \{ return W\.localStorage/);
  assert.match(src, /set\(k, v\) \{ try \{/);
  assert.doesNotMatch(src.replace(/try \{[^}]*localStorage[^}]*\}/g, ''), /localStorage\.(get|set)Item/);
});

// ---------------------------------------------------------------- the page
test('#room-planner renders: one h1, unique ids, labelled story-world characters, no template leaks, no curriculum content', () => {
  const c = site(), html = c.render('room-planner'), t = text(html);
  assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
  assert.doesNotMatch(html, /undefined|\[object Object\]|NaN/);
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(ids).size, ids.length, 'ids are unique: ' + ids.filter((x, i) => ids.indexOf(x) !== i).join(','));
  for (const r of [...html.matchAll(/aria-(?:labelledby|controls|describedby)="([^"]+)"/g)].map(m => m[1])) for (const id of r.split(' ')) assert.ok(html.includes(`id="${id}"`), 'aria target ' + id);
  for (const a of [...html.matchAll(/data-anchor="([^"]+)"/g)].map(m => m[1])) assert.ok(html.includes(`id="${a}"`), 'anchor target ' + a);
  assert.match(t, /story-world characters/);
  for (const s of ['How to measure your room', 'Hard floors and carpet', 'Cleaning and sanitizing', 'Churches: pack-away and storage', 'Delivery, lead times', 'Installation', 'Replacement parts, reorders and warranty', 'For your licensing inspector', 'Accessibility and comfort', 'More than one room or site'])
    assert.ok(t.includes(s), s);
  for (const s of ['60 in', '36 in', '16 CFR 1630 or 1631', 'tamper-resistant', 'Lumi’s Calm Corner', 'Bop’s Movement Zone', 'natural light', 'Warranty (proposed)'])
    assert.ok(t.toLowerCase().includes(s.toLowerCase()), s);
  assert.doesNotMatch(t, /\bDay \d|\bWeek \d|lesson plan|objective|learning step|Unit \d/i);
  assert.match(html, /role="meter"/);
  assert.match(html, /data-rp-words/, 'the layout in words');
  // the intake form is the existing one (FFIntake.contactHtml), with its own preset
  assert.match(read('room-planner.js'), /I\.contactHtml\('quote', PRESET\)/);
  assert.match(read('room-planner.js'), /const PRESET = \{ id: 'room-planner'/);
});

test('Bop is purple, never the retired orange; the route is wired (route meta, wayfinding, index) without a new Home link', () => {
  const ORANGE = /#(E8761E|F5A566|A84908|9C4507|B5541A|FDEDE0|FCEEE2|FCE6D2)\b/i;
  for (const f of ['room-planner.js', 'room-planner.css', 'room-planner-core.js']) assert.doesNotMatch(read(f), ORANGE, f);
  assert.equal(C.ZONES.bop.felt, '#8236AE'); assert.equal(C.ZONES.bop.ink, '#6B2A8E');
  const c = site(), K = c.window.FFRoomKit;
  for (const z of K.ZONES) assert.deepEqual([C.ZONES[z.k].felt, C.ZONES[z.k].ink, C.ZONES[z.k].tint], [z.felt, z.ink, z.tint], z.k);
  assert.ok(require(path.join(ROOT, 'route-meta.js')).ROUTES['room-planner']);
  assert.match(read('wayfinding.js'), /'room-planner': \['Room Planner', 'centers', 'room-kit'/);
  const html = read('index.html'), at = s => html.indexOf(s);
  assert.ok(at('<script src="room-planner-core.js') > at('<script src="room-kit.js') && at('<script src="room-planner.js') > at('<script src="room-planner-core.js'));
  assert.ok(at('<script src="room-planner.js') < at('<script src="home-calm.js'));
  assert.match(html, /<link rel="stylesheet" href="room-planner\.css\?v=\d+">/);
  assert.doesNotMatch(c.render('home'), /#room-planner/, 'Home keeps its link budget');
  const kit = c.render('room-kit');
  assert.match(kit, /id="rk-planner"/); assert.match(kit, /href="#room-planner"/);
  assert.ok(kit.indexOf('id="rk-planner"') < kit.indexOf('id="rk-packages"'), 'the planner section sits before the packages');
});

// ---------------------------------------------------------------- in the browser
const H = () => import('./a11y-harness.mjs');
let h, srv, browser;
test.before(async () => { h = await H(); srv = await h.startSite(); browser = await h.loadChromium().launch(); });
test.after(async () => { if (browser) await browser.close(); if (srv) await srv.close(); });

for (const width of [1280, 390]) {
  test(`#room-planner at ${width}px: no page errors, no sideways scroll, no axe violations (also with a fit-check panel open)`, async () => {
    const { ctx, page, errors } = await h.open(browser, width);
    await h.goto(page, srv.base, 'room-planner', 700);
    const f = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, svg: !!document.querySelector('[data-rp-canvas] svg .rp-it') }));
    assert.ok(f.svg, 'the plan is drawn');
    assert.ok(f.sw <= f.iw + 1, `no horizontal scroll: ${f.sw} > ${f.iw}`);
    let v = await h.axe(page);
    assert.deepEqual(v, [], JSON.stringify(v, null, 1));
    for (const tab of ['add', 'item', 'check', 'quote']) {
      await page.click(`[data-rp-tab="${tab}"]`);
      v = await h.axe(page, { include: '.rp-side' });
      assert.deepEqual(v, [], tab + ': ' + JSON.stringify(v, null, 1));
    }
    await h.goto(page, srv.base, 'room-kit', 500);
    v = await h.axe(page, { include: '#rk-planner' });
    assert.deepEqual(v, [], JSON.stringify(v, null, 1));
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}

test('keyboard: Tab reaches the items; arrow keys move by the snap step, Shift by a foot; R turns; Ctrl+Z undoes; the change is announced', async () => {
  const { ctx, page, errors } = await h.open(browser, 1280);
  await page.addInitScript(() => { try { localStorage.clear(); } catch (_) { /* fine */ } });
  await h.goto(page, srv.base, 'room-planner', 600);
  const mat = await page.evaluate(() => window.FFRoomPlanner.state.items.find(i => i.t === 'mat' && i.z === 'zuri').id);
  await page.focus(`.rp-it[data-id="${mat}"]`);
  const pos = () => page.evaluate(id => { const i = window.FFRoomPlanner.state.items.find(x => x.id === id); return { x: i.x, y: i.y, rot: i.rot }; }, mat);
  const p0 = await pos();
  await page.keyboard.press('ArrowLeft');
  assert.equal((await pos()).x, p0.x - 6);
  await page.keyboard.press('Shift+ArrowUp');
  assert.equal((await pos()).y, p0.y - 12);
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-id')), mat, 'focus stays on the item');
  await page.waitForTimeout(80);
  assert.match(await page.textContent('[data-rp-live]'), /Zuri’s mat: .* from the west wall/);
  await page.keyboard.press('r');
  assert.equal((await pos()).rot, (p0.rot + 90) % 360);
  await page.keyboard.press('Control+z'); await page.keyboard.press('Control+z'); await page.keyboard.press('Control+z');
  assert.deepEqual(await pos(), p0, 'three undos restore it');
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-id')), mat, 'focus stays on the item after undo');
  // the selected panel follows the focus
  assert.match(await page.textContent('#rp-panel-item'), /Zuri’s mat/);
  // Tab moves between items in the plan
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.classList.contains('rp-it')), true);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('pointer: dragging a mat moves it by the dragged distance (snapped); the fit check updates', async () => {
  const { ctx, page, errors } = await h.open(browser, 1280);
  await page.addInitScript(() => { try { localStorage.clear(); } catch (_) { /* fine */ } });
  await h.goto(page, srv.base, 'room-planner', 600);
  const id = await page.evaluate(() => window.FFRoomPlanner.state.items.find(i => i.t === 'mat' && i.z === 'zuri').id);
  const before = await page.evaluate(i => ({ ...window.FFRoomPlanner.state.items.find(x => x.id === i) }), id);
  await page.locator('[data-rp-canvas]').scrollIntoViewIfNeeded();
  const box = await page.locator(`.rp-it[data-id="${id}"]`).boundingBox();
  const scale = await page.evaluate(() => { const s = document.querySelector('[data-rp-canvas] svg'); return s.getBoundingClientRect().width / s.viewBox.baseVal.width; });
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 24 * scale, box.y + box.height / 2 + 12 * scale, { steps: 6 });
  await page.mouse.up();
  const after = await page.evaluate(i => ({ ...window.FFRoomPlanner.state.items.find(x => x.id === i) }), id);
  assert.ok(Math.abs(after.x - before.x - 24) <= 6 && Math.abs(after.y - before.y - 12) <= 6, `moved ${after.x - before.x}, ${after.y - before.y}`);
  assert.equal(after.x % 6, 0, 'snapped to the 6 in grid'); assert.equal(after.y % 6, 0);
  // drag Zuri's mat on top of the table: the fit check says so
  await page.evaluate(i => { const s = window.FFRoomPlanner.state; const m = s.items.find(x => x.id === i), t = s.items.find(x => x.t === 'sink'); m.x = t.x; m.y = t.y - 10; window.FFRoomPlanner.refresh(); }, id);
  assert.match(await page.textContent('[data-rp-status]'), /to fix|to review/);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('the layout survives a reload (this device) and a share link; blocked storage still works; a bad link is ignored', async () => {
  const { ctx, page, errors } = await h.open(browser, 1280);
  await h.goto(page, srv.base, 'room-planner', 500);
  await page.evaluate(() => { const s = window.FFRoomPlanner.state; s.room.w = 222; window.FFRoomPlanner.act('arrange'); });
  const code = await page.evaluate(() => window.FFRoomPlannerCore.encode(window.FFRoomPlanner.state));
  await page.goto(`${srv.base}?fresh=${Date.now()}#room-planner`); await page.waitForTimeout(500);
  assert.equal(await page.evaluate(() => window.FFRoomPlanner.state.room.w), 222, 'kept on this device');
  await ctx.close();
  // a fresh browser with the link
  const b = await h.open(browser, 390);
  await b.page.goto(`${srv.base}?fresh=${Date.now()}#room-planner/${code}`); await b.page.waitForTimeout(600);
  assert.equal(await b.page.evaluate(() => window.FFRoomPlanner.state.room.w), 222, 'opened from the link');
  assert.match(await b.page.textContent('[data-rp-canvas]'), /Friends Circle/);
  await b.ctx.close();
  // storage that throws, and a junk link
  const c = await h.open(browser, 1280);
  await c.page.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); });
  await c.page.goto(`${srv.base}?fresh=${Date.now()}#room-planner/%3Cscript%3E`); await c.page.waitForTimeout(600);
  assert.ok(await c.page.evaluate(() => window.FFRoomPlanner.state.items.length > 10), 'falls back to the classroom layout');
  await c.page.evaluate(() => window.FFRoomPlanner.act('save'));
  assert.match(await c.page.textContent('[data-rp-linkout]'), /not keeping layouts/);
  assert.deepEqual([...errors, ...b.errors, ...c.errors], []);
  await c.ctx.close();
});

test('"Send my layout for a quote" only fills the existing intake form (or, while online requests are closed, a summary to copy or email)', async () => {
  // closed (the live default): the summary block opens; nothing is sent
  const a = await h.open(browser, 390);
  const sent = [];
  a.page.on('request', r => { if (r.method() !== 'GET') sent.push(r.url()); });
  await h.goto(a.page, srv.base, 'room-planner', 500);
  await a.page.click('[data-rp-tab="quote"]');
  await a.page.click('#rp-panel-quote [data-rp-act="send"]');
  await a.page.waitForTimeout(500);
  const sum = await a.page.inputValue('[data-rp-summary]');
  assert.match(sum, /Room: 25 ft wide by 20 ft long/);
  assert.match(sum, /Reopen the layout: http.*#room-planner\/[A-Za-z0-9_-]+/);
  assert.match(await a.page.getAttribute('[data-rp-mailto]', 'href'), /^mailto:info@futureslearningcenter\.com\?subject=/);
  assert.deepEqual(sent, [], 'nothing is sent');
  await a.ctx.close();
  // open: the existing form gets the message; nothing is submitted by the planner
  const b = await h.open(browser, 1280);
  await b.page.route('**/intake-config.js*', r => r.fulfill({ contentType: 'text/javascript', body: "window.FF_INTAKE = { url: 'https://intake.example.invalid', turnstileSiteKey: '' };" }));
  await b.page.route('https://intake.example.invalid/**', r => r.abort());
  await h.goto(b.page, srv.base, 'room-planner', 500);
  const fieldsBefore = await b.page.$$eval('#ffiContact [name]', xs => xs.map(x => x.name).sort());
  await b.page.evaluate(() => window.FFRoomPlanner.act('send'));
  await b.page.waitForTimeout(300);
  assert.match(await b.page.inputValue('#cMsg'), /Learning Zones Kit[\s\S]*Room: 25 ft wide[\s\S]*Fit check:/);
  assert.equal(await b.page.inputValue('#cInterest'), 'quote');
  assert.deepEqual(await b.page.$$eval('#ffiContact [name]', xs => xs.map(x => x.name).sort()), fieldsBefore, 'no new fields');
  await b.ctx.close();
});
