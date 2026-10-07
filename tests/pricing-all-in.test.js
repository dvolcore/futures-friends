// #pricing (pricing-all-in.js): published package prices before tax, every dollar traced to an owner document or a cited competitor page.
const test = require('node:test');
const assert = require('node:assert/strict');
const { site, read, text } = require('./site-vm');

const P = require('../pricing-all-in.js');
const AMT = /<span class="pz-amt" data-src="([a-z0-9]+)"[^>]*>([^<]*)<\/span>/g;
const num = s => +String(s).replace(/[^0-9.]/g, '');

test('every package renders with its one-time and monthly price, what is included, and its owner-document source', () => {
  const html = site().render('pricing');
  const expect = { 'Home Daycare': [1495, 89, 2563], 'Center Starter': [2995, 229, 5743], 'Center Complete': [5995, 349, 10183] };   // Catalog v1.0 p.24
  assert.deepEqual(P.TIERS.map(t => t.name), Object.keys(expect));
  for (const t of P.TIERS) {
    const [startup, monthly, y1] = expect[t.name];
    assert.equal(t.startup, startup); assert.equal(t.monthly, monthly); assert.equal(P.yearOne(t), y1, `${t.name} year-one total matches the catalog`);
    const cardHtml = html.slice(html.indexOf(`>${t.name}</span>`), html.indexOf('</article>', html.indexOf(`>${t.name}</span>`)));
    assert.ok(cardHtml.length > 200, t.name);
    assert.match(cardHtml, new RegExp(`data-src="cat24"[^>]*>\\$${startup.toLocaleString('en-US')}<`));
    assert.match(cardHtml, new RegExp(`data-src="cat24"[^>]*>\\$${monthly} a month<`));
    // what is included comes from the release manifest, grouped by what a buyer can receive today (release-truth.js)
    assert.match(cardHtml, /What is included<\/h3><div class="rt-scope">/);
    assert.ok((cardHtml.match(/<li data-asset="[a-z0-9-]+">/g) || []).length >= 6, t.name + ' lists at least 6 items');
    assert.match(cardHtml, /Proposed, owner to confirm/);
    assert.match(cardHtml, /Source: Welcome Package &(amp;)? Catalog v1\.0, p\.24-25/);
  }
});

test('no dollar figure on the page lacks a source: owner document, a cited competitor page, or a sum worked out from those', () => {
  const html = site().render('pricing');
  const tagged = [...html.matchAll(AMT)];
  assert.ok(tagged.length > 40, `${tagged.length} tagged prices`);
  for (const [, src] of tagged) assert.ok(P.DOCS[src] || src === 'comp', `unknown source ${src}`);
  const rest = text(html.replace(AMT, ' '));
  assert.deepEqual(rest.match(/\$\s?\d/g) || [], [], 'a dollar figure outside a sourced price tag');
  // every owner price shown is one of the documented figures
  const owner = new Set([1495, 2995, 5995, 89, 229, 349, 890, 2290, 3490, 2563, 5743, 10183, 395, 795, 745, 42, 59, 5, 150, 750, 75, 3600, 5940, 480, 349, 495, 595, 199, 1250, 139, 119, 69, 49, 149, 249, 250]);
  for (const [, src, v] of tagged) if (src !== 'calc' && src !== 'comp') assert.ok(owner.has(num(v)), `${v} (${src}) is not a documented price`);
});

test('Futures Friends prices are marked "Proposed, owner to confirm" (G09, E9) and nothing is sold online', () => {
  const html = site().render('pricing'), t = text(html);
  assert.equal(P.LABEL, 'Proposed, owner to confirm');
  assert.ok((html.match(/Proposed, owner to confirm/g) || []).length >= P.TIERS.length + 2);
  assert.doesNotMatch(html, /Pending owner confirmation|pending final confirmation/, 'one label for every proposed price');
  assert.match(t, /Ordering opens soon/);
  assert.match(t, /nothing is for sale online yet/i);
  assert.doesNotMatch(t, /add to cart|buy now|check ?out now|order now|pay now/i);
  assert.match(html, /data-go="quote"/);
  assert.doesNotMatch(html, /<form[^>]*action=/, 'the calculator form posts nowhere');
});

test('the no-hidden-fees list and every extra cite the page of the owner document they come from', () => {
  const html = site().render('pricing');
  for (const [title, , src] of P.NO_FEES) { assert.ok(P.DOCS[src], src); assert.ok(html.includes(title), title); }
  assert.match(html, /No card or processing fee/);
  for (const [group, rows] of P.EXTRAS) { assert.ok(html.includes(group.replace(/&/g, '&amp;')) || html.includes(group), group); for (const [, prices] of rows) for (const p of prices) assert.ok(P.DOCS[p[1]], p[1]); }
  for (const term of P.TERMS) assert.ok(term[2] === null || P.DOCS[term[2]], term[0]);
});

test('competitor prices are only cited public figures, each with a link and the date it was seen', () => {
  const html = site().render('pricing');
  assert.equal(P.SEEN, '5 Oct 2026');
  for (const c of P.COMP) {
    assert.match(c.url, /^https:\/\//, c.name);
    assert.ok(html.includes(`href="${c.url}"`), c.name);
    assert.ok(/^Quote only$|\$/.test(c.price), c.name);
  }
  assert.ok((html.match(/Seen 5 Oct 2026/g) || []).length >= P.COMP.length);
  assert.ok(P.COMP.filter(c => c.price === 'Quote only').length >= 2, 'quote-only vendors are shown as quote-only');
});

test('the calculator turns rooms and children into a future-bundle estimate before tax using only the published prices', () => {
  const q = P.quote;
  const home = q({ type: 'home', rooms: 4, children: 8 });
  assert.equal(home.tier.id, 'home'); assert.equal(home.rooms, 1); assert.equal(home.oneTime, 1495); assert.equal(home.y1, 2563); assert.equal(home.y2, 1495 + 24 * 89);
  const two = q({ rooms: 2, children: 30 });
  assert.equal(two.tier.id, 'starter'); assert.equal(two.y1, 5743); assert.equal(two.prepayYear1, 2995 + 2290);
  assert.equal(two.cc2, undefined, 'E8: no head-to-head against full-year curricula inside the future-bundle estimate');
  const five = q({ rooms: 5, children: 64, everyRoom: true, kits: true });
  assert.equal(five.tier.id, 'complete');
  assert.equal(five.extraSets, 3, 'Center Complete includes 2 classroom sets');
  assert.equal(five.kitCount, 50, '64 children less the 20 included kits, rounded up to tens');
  assert.equal(five.oneTime, 5995 + 3 * 395 + 50 * 42);
  assert.equal(five.y1, five.oneTime + 12 * 349);
  assert.equal(q({ rooms: 3 }).tier.id, 'starter'); assert.equal(q({ rooms: 4 }).tier.id, 'complete');
  assert.equal(q({ rooms: -2, children: 'x' }).rooms, 1, 'bad input is clamped, never NaN');
  // the rendered default matches quote()
  const html = site().render('pricing'), d = q({});
  const calc = new Set([...html.matchAll(AMT)].filter(m => m[1] === 'calc').map(m => num(m[2])));
  for (const v of [d.oneTime, d.y1, d.y2, d.prepayYear1]) assert.ok(calc.has(v), `calculator shows ${v}`);
  assert.doesNotMatch(html, /NaN|undefined/);
});

test('pricing files load after views.js and store.js, with cache-busting versions', () => {
  const html = read('index.html');
  assert.match(html, /<script src="store\.js\?v=\d+"><\/script>\s*<script src="pricing-all-in\.js\?v=\d+"><\/script>/);
  assert.match(html, /<link rel="stylesheet" href="pricing-all-in\.css\?v=\d+">/);
});
