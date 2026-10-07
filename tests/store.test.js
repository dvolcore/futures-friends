// Futures Store v2 (store.js): two doors, Classroom Branding Kits, the corner guide, and honest ordering.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

function setup(intakeUrl = '') {
  const handlers = { click: [], change: [] };
  const doc = {
    addEventListener(type, fn) { (handlers[type] = handlers[type] || []).push(fn); },
    querySelector: () => null, querySelectorAll: () => [], getElementById: () => null,
    documentElement: { dataset: {} }, write() {},
    createElement: () => ({ style: {} }), head: { appendChild() {} }
  };
  const win = { FF_INTAKE: { url: intakeUrl, turnstileSiteKey: '' } };
  const context = vm.createContext({ window: win, document: doc, location: { hostname: 'example.org', hash: '' }, console, setTimeout, clearTimeout, navigator: {} });
  for (const f of ['data.js', 'views.js', 'intake.js', 'store.js']) vm.runInContext(read(f), context, { filename: f });
  context.render = () => {};   // the page renderer needs a DOM; the views themselves are pure strings
  vm.runInContext('render = () => {};', context);
  return { context, win, handlers, run: s => vm.runInContext(s, context) };
}
const pages = s => ['V.store()', "V['shop-families']()", "V['shop-programs']()", 'V.corners()', "V['store-request']()"].map(s.run).join('\n');
const dollars = html => [...html.matchAll(/\$([\d,]+\.\d\d)/g)].map(m => +m[1].replace(/,/g, ''));

test('the store opens on two clear doors and links the corner guide', () => {
  const s = setup();
  const html = s.run('V.store()');
  assert.match(html, /For families/);
  assert.match(html, /For programs/);
  assert.match(html, /data-go="shop-families"/);
  assert.match(html, /data-go="shop-programs"/);
  assert.match(html, /data-go="corners"/);
  assert.match(html, /Ordering opens soon/);
  for (const r of ['store', 'shop-families', 'shop-programs', 'corners', 'store-request']) assert.equal(typeof s.run(`V['${r}']`), 'function', r);
});

test('family shop: every item has a labelled photo placeholder and only catalog-traced prices', () => {
  const s = setup();
  const html = s.run("V['shop-families']()"), fam = s.win.FFStore.FAMILY;
  assert.equal((html.match(/Product photo coming soon/g) || []).length, fam.length);
  assert.equal((html.match(/data-sq="FF-FAM-/g) || []).length, fam.length);
  const retail = new Set(s.run('D.catalog').map(c => c.retail).filter(Boolean));
  for (const d of dollars(html)) assert.ok(retail.has(d), `$${d} is not a catalog retail price`);
  for (const f of fam.filter(f => !f.cat)) assert.ok(html.includes(f.name), f.name);
  assert.ok((html.match(/Price coming soon/g) || []).length >= fam.filter(f => !f.cat).length);
  for (const f of fam.filter(f => f.cat)) assert.ok(s.run('D.catalog').some(c => c.item === f.cat), `catalog line for ${f.name}`);
});

test('program door: three branding-kit tiers whose sums come from catalog member prices', () => {
  const s = setup();
  const html = s.run("V['shop-programs']()"), api = s.win.FFStore;
  assert.deepEqual(JSON.parse(JSON.stringify(api.KITS.map(k => k.name))), ['Home kit', 'Classroom kit', 'Center kit']);
  assert.deepEqual(JSON.parse(JSON.stringify(api.KITS.map(api.kitSum))), [105, 153, 948]);
  assert.match(html, /Full kit price coming soon/);
  const cat = s.run('D.catalog');
  for (const c of cat) assert.ok(html.includes(c.item.replace(/&/g, '&amp;')), c.item);
  const allowed = new Set(cat.flatMap(c => [c.wholesale, c.retail]).filter(Boolean).concat(api.KITS.map(api.kitSum)));
  for (const d of dollars(html)) assert.ok(allowed.has(d), `$${d} has no catalog source`);
  for (const k of api.KITS) for (const p of k.parts) assert.ok(api.cat(p), `kit part ${p} is a catalog line`);
});

test('corner guide uses the curriculum zone names and labels anything not yet canon', () => {
  const s = setup();
  const html = s.run('V.corners()'), corners = s.win.FFStore.CORNERS;
  const canon = corners.filter(c => c.src === 'canon').map(c => c.name);
  assert.deepEqual(JSON.parse(JSON.stringify(canon)), ["Booker's Reading Area", "Lumi's Calm Corner", "Zuri's Discovery Zone", "Bop's Movement Zone", 'Eat the Rainbow wall']);
  const training = read('views.js');   // the same four names the rest of the site and course FF-102 use
  for (const n of canon.slice(0, 4)) assert.ok(training.includes(n), n);
  assert.equal((html.match(/class="fs-corner"/g) || []).length, corners.length);
  assert.equal((html.match(/>Proposed</g) || []).length, corners.filter(c => c.src === 'proposed').length + 1, 'one legend chip plus one per proposed corner');
  assert.ok(corners.filter(c => c.src === 'proposed').every(c => c.kit.length && c.ages.length));
  for (const band of ['Red Rockets', 'Orange Sunshine', 'Yellow Sunbeams', 'Green Sprouts', 'Purple Pals', 'Cozy Clouds']) assert.ok(html.includes(band), band);
  assert.doesNotMatch(html, /Green Giants|Heart helpers|Brain boost|Strong bones/);
  assert.match(html, /never a time-out/);
  for (const k of ['booker', 'lumi', 'zuri', 'bop']) assert.ok(html.includes(`img/plush/characters/${k}-480.webp`));
});

test('no checkout or payment claims: ordering is honest and requests go through the intake form', () => {
  const s = setup('');
  const html = pages(s);
  assert.doesNotMatch(html, /checkout|add to cart|buy now|pay now|in stock|ships (today|tomorrow|in \d)|secure payment|we accept|(?<!no )order (is )?(placed|confirmed)|free shipping/i);
  assert.match(html, /Ordering opens soon/);
  assert.match(html, /nothing is charged and no order is placed/i);
  assert.match(s.run("V['store-request']()"), /Online requests open soon/, 'empty intake url shows the honest state');
  const src = read('store.js');
  assert.doesNotMatch(src, /https?:\/\//, 'no hardcoded URLs');
  assert.doesNotMatch(src, /\bfetch\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|indexedDB|document\.cookie/);
  assert.match(src, /FFIntake\.contactHtml\(/);
});

test('no health, safety-test or material claims in the store copy', () => {
  const s = setup();
  const html = pages(s) + read('store.js');
  assert.doesNotMatch(html, /healthy|nutritious|boost|immun|non-?toxic|BPA|lead-free|chemical-free|organic|prevents|cures|safe for (babies|kids|children)|tested (for|to)|certified safe|CPSC[- ]approved|made and tested/i);
  assert.doesNotMatch(html, /Learn\. Play\. Explore\. Belong\.|Happy Doer/);
});

test('the request list counts quantities, stays separate from the legacy cart and pre-fills the quote', () => {
  const s = setup();
  const change = s.handlers.change.find(fn => String(fn).includes('dataset.sq'));
  change({ target: { dataset: { sq: 'FF-KIT-CLASSROOM' }, value: '2', id: 'x' } });
  change({ target: { dataset: { sq: 'FF-CAT-0' }, value: '3.7', id: 'y' } });
  change({ target: { dataset: { sq: 'FF-FAM-TOTE' }, value: '-4', id: 'z' } });
  assert.deepEqual(JSON.parse(JSON.stringify(s.run('st.shop'))), { 'FF-KIT-CLASSROOM': 2, 'FF-CAT-0': 3 });
  assert.deepEqual(JSON.parse(JSON.stringify(s.run('st.cart'))), {});
  const text = s.win.FFStore.listText();
  assert.match(text, /not an order yet/);
  assert.match(text, /2 x Classroom kit/);
  assert.match(text, /3 x Plush friend, each/);
  const live = setup('https://gateway.example');
  live.run("st.shop = {'FF-KIT-HOME': 1}; st.storeReq = 'order';");
  assert.match(live.run("V['store-request']()"), /1 x Home kit/, 'the list pre-fills the quote message when requests are on');
});

test('index.html loads the store after views.js and intake.js with cache-busting, and the old view is gone from views.js', () => {
  const html = read('index.html'), at = f => html.indexOf(`<script src="${f}`);
  assert.match(html, /<link rel="stylesheet" href="store\.css\?v=\d+">/);
  assert.match(html, /<script src="store\.js\?v=\d+"><\/script>/);
  assert.ok(at('store.js') > at('views.js') && at('store.js') > at('intake.js'));
  assert.ok(+html.match(/views\.js\?v=(\d+)/)[1] >= 22);
  assert.ok(+html.match(/route-meta\.js\?v=(\d+)/)[1] >= 2);
  assert.doesNotMatch(read('views.js'), /V\.store = \(\) =>/);
  const meta = require(path.join(ROOT, 'route-meta.js')).ROUTES;
  for (const r of ['store', 'shop-families', 'shop-programs', 'corners', 'store-request']) assert.ok(meta[r], r);
  assert.match(meta.store[1], /Ordering opens soon/);
});
