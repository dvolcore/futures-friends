// Futures Store v3 (store-catalog.js, store-cart.js, store-checkout.js, store-shop.js, store-product.js, store-order.js; owner 2026-10-07).
// Catalog prices equal the approved pricing data; the plush is not orderable; cart math; the request-mode order payload; no fake "paid" state;
// the stripe and shopify modes stay off until their keys exist; mobile has no sideways scroll; the cart drawer is an accessible modal.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { site, read, text, ROOT } = require('./site-vm');

const STORE_FILES = ['store-config.js', 'store-merch-data.js', 'store-catalog.js', 'store-cart.js', 'store-checkout.js', 'store-shop.js', 'store-product.js', 'store-order.js'];
function world(extra = {}) {
  const c = site();
  const mem = {};
  c.localStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
  c.location = { hostname: 'example.org', hash: '', origin: 'https://example.org', pathname: '/' };
  Object.assign(c, extra);
  for (const f of ['room-kit-plans.js', 'room-kit.js']) vm.runInContext(read(f), c, { filename: f });
  for (const f of STORE_FILES) vm.runInContext(read(f), c, { filename: f });
  return { c, mem, W: c.window };
}
const plain = o => JSON.parse(JSON.stringify(o));
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/merch-products.json'), 'utf8'));
const dollars = html => [...text(html).matchAll(/\$([\d,]+(?:\.\d\d)?)/g)].map(m => +m[1].replace(/,/g, ''));

test('catalog prices match the approved pricing data, and nothing else has a price', () => {
  const { c, W } = world(), C = W.FFCatalog, P = W.FFPricing, RK = W.FFRoomKit;
  // packages and monthly fees come from #pricing
  for (const [id, tier] of [['home', 'kit-home'], ['starter', 'kit-center-starter'], ['complete', 'kit-center-complete']]) {
    const t = P.TIERS.find(x => x.id === id), p = C.product(tier);
    assert.equal(p.price, t.startup, tier + ' startup');
    assert.equal(p.membership.monthly, t.monthly, tier + ' monthly');
    assert.equal(C.APPROVED.packages[id], t.startup);
  }
  // Zone Boundaries, from the Learning Zones Kit page
  const zb = RK.ADDONS.filter(a => a.price != null).map(a => a.price).sort();
  assert.deepEqual(plain(zb), [1195, 1995]);
  const b = C.product('zone-boundaries');
  assert.deepEqual(plain(b.options[0].values.map(v => v.price)), [1195, 1995]);
  // poster $16 and plush $26 come from the catalog in data.js
  const cat = vm.runInContext('D.catalog', c), poster = cat.find(x => /^Character poster 18 x 24/.test(x.item)), plush = cat.find(x => /^Plush friend, each/.test(x.item));
  assert.equal(poster.retail, 16); assert.equal(plush.retail, 26);
  assert.equal(C.APPROVED.kids.poster, poster.retail); assert.equal(C.APPROVED.kids.plush, plush.retail);
  // every product price is one of the approved numbers; everything else is quote, soon or free
  const ok = new Set([1495, 2995, 5995, 1195, 1995, 16, 26]);
  for (const p of C.PRODUCTS) {
    const prices = [p.price].concat(p.options.flatMap(o => o.values.map(v => v.price))).filter(x => x != null);
    for (const n of prices) assert.ok(ok.has(n), `${p.id} has an unapproved price ${n}`);
    if (p.priceState !== 'fixed') assert.ok(prices.length === 0, `${p.id} is ${p.priceState} but carries a number`);
  }
  assert.equal(C.product('zone-boundaries').priceState, 'fixed');
  for (const id of ['rug-booker-reading-area', 'rug-square-lumi-calm-corner', 'zone-signs', 'friend-fence', 'booker-tshirt', 'kids-carpet']) assert.notEqual(C.product(id).priceState, 'fixed', id);
  assert.equal(C.product('kids-carpet').priceState, 'soon');
  // no dollar figure on any store page that is not approved
  const pages = [['store'], ['shop'], ['shop', 'carpets'], ['shop', 'kits'], ['kids-shop'], ['cart'], ['checkout']].concat(C.PRODUCTS.map(p => ['product', p.id]));
  const allowed = new Set([...ok, 89, 229, 349]);
  for (const [r, a] of pages) for (const d of dollars(c.render(r, a || null))) assert.ok(allowed.has(d), `$${d} on #${r}${a ? '/' + a : ''}`);
});

test('the owner\'s merchandise package: every stable id is in the catalog, every price field stays empty unless approved', () => {
  const { W } = world(), C = W.FFCatalog;
  const ids = pkg.store.products.map(p => p.id).concat(pkg.store.bundles.map(b => b.id), pkg.apparel.map(a => a.id));
  assert.equal(ids.length, 24 + 3 + 15);
  for (const id of ids) assert.ok(C.product(id), 'missing ' + id);
  for (const p of pkg.store.products.concat(pkg.store.bundles)) { assert.equal(p.price, null); assert.equal(p.stock, null); assert.equal(p.size, null); }
  for (const a of pkg.apparel) { assert.equal(a.price, null); assert.equal(a.sizes, null); }
  // posters are $16 (approved), plush $26 (approved, not orderable), rugs and apparel have no price
  for (const p of pkg.store.products) {
    const x = C.product(p.id);
    if (p.type === 'poster') assert.equal(x.price, 16, p.id);
    if (p.type === 'plush') assert.equal(x.price, 26, p.id);
    if (p.type === 'rug') assert.equal(x.price, null, p.id);
    assert.equal(x.sample, true, p.id + ' is a concept sample');
  }
  // large square carpets: proposed sizes only
  for (const p of pkg.store.products.filter(p => p.format === 'large-square')) {
    const x = C.product(p.id);
    assert.ok(x.options[0].values.some(v => /6 x 6/.test(v.label)) && x.options[0].values.some(v => /8 x 8/.test(v.label)));
    assert.match(x.dims.join(' '), /6 x 6 ft \(home\) or 8 x 8 ft \(center\)\. Final size is confirmed in your written quote/);
  }
  // apparel: slogans come from the package; no price, sizes "coming soon"
  for (const a of pkg.apparel) { const x = C.product(a.id); assert.equal(C.canOrder(x), true, 'apparel can be added to the cart as a request'); assert.equal(x.priceState, 'soon'); assert.equal(x.price, null); assert.match(x.badges.join(' '), /Sizes coming soon/); if (a.back_copy) assert.ok(x.description.includes(a.back_copy), a.id); }
  assert.ok(C.product('all-friends-tshirt').description.includes('Learn. Move. Explore. Belong.'));
  // the curriculum is never a store item
  for (const p of C.PRODUCTS) assert.doesNotMatch(p.name + ' ' + (p.short || ''), /curriculum|lesson plan|unit \d/i, p.id);
});

test('the plush is not orderable: no add to bag, a Notify me form instead, and the cart refuses it', () => {
  const { c, W } = world(), C = W.FFCatalog, K = W.FFCart;
  for (const id of ['plush-booker', 'plush-lumi', 'plush-zuri', 'plush-bop']) {
    const p = C.product(id);
    assert.equal(C.canOrder(p), false); assert.equal(p.cta, 'notify'); assert.equal(p.price, 26);
    const html = c.render('product', id);
    assert.doesNotMatch(html, /data-sp-padd/); assert.match(html, /data-sp-notify=/); assert.match(html, /Opening soon|opening soon/);
    assert.equal(K.add(id, {}, 1), null);
  }
  for (const id of ['kids-carpet', 'book-booker-tries-again']) assert.equal(K.add(id, {}, 1), null, id);
  assert.ok(K.add('booker-backpack', {}, 1), 'a backpack goes in the cart as a request'); K._reset();
  assert.equal(K.count(), 0);
  assert.match(text(c.render('product', 'plush-lumi')), /opening soon/i);
});

test('cart math: quantities merge, priced lines add up, quoted lines are counted and never priced', () => {
  const { W, mem } = world(), C = W.FFCatalog, K = W.FFCart;
  K._reset();
  K.add('zone-boundaries', { size: 'home' }, 2); K.add('zone-boundaries', { size: 'classroom' }, 1); K.add('zone-boundaries', { size: 'home' }, 1);
  K.add('poster-lumi-calm-corner-v1', {}, 3);
  K.add('rug-booker-reading-area', {}, 2);
  let ls = K.lines(), t = K.totals(ls);
  assert.equal(ls.length, 4);
  assert.equal(ls.find(l => l.pid === 'zone-boundaries' && l.opts.size === 'home').qty, 3);
  assert.equal(t.subtotal, 3 * 1195 + 1995 + 3 * 16);
  assert.equal(t.pricedCount, 3 + 1 + 3); assert.equal(t.quoteCount, 2);
  assert.equal(K.count(), 9);
  assert.ok(t.ships.freight && t.ships.parcel);
  const sh = K.shipping(t);
  assert.equal(sh.estimate, true); assert.match(sh.label, /Quoted on your invoice/); assert.doesNotMatch(sh.label + sh.note, /\$\d/);
  assert.match(K.TAX_NOTE, /Missouri and Kansas/);
  // quantity edits
  const key = ls.find(l => l.pid === 'poster-lumi-calm-corner-v1').key;
  K.setQty(key, 5); assert.equal(K.totals().subtotal, 3 * 1195 + 1995 + 5 * 16);
  K.setQty(key, 0); assert.equal(K.lines().length, 3);
  K.remove(K.lines()[0].key); assert.equal(K.lines().length, 2);
  K.add('poster-lumi-calm-corner-v1', {}, 500); assert.equal(K.lines().find(l => l.pid === 'poster-lumi-calm-corner-v1').qty, K.MAXQ);
  // invalid options fall back to the first value
  assert.equal(K.lines().length, 3);
  K.clear(); assert.equal(K.count(), 0); assert.equal(K.totals().subtotal, 0);
  // a kit's shipping is part of the package price, and the membership is listed apart
  K.add('kit-home', {}, 1); const kt = K.totals();
  assert.equal(kt.subtotal, 1495); assert.deepEqual(plain(kt.membership.map(m => m.monthly)), [89]); assert.match(K.shipping(kt).note, /package price/);
});

test('the cart is saved on this device only, in try/catch, and holds no personal data', () => {
  const { c, W, mem } = world(), K = W.FFCart;
  K._reset(); K.add('zone-boundaries', { size: 'classroom' }, 2); K.add('plush-lumi', {}, 1);
  const saved = JSON.parse(mem[K.KEY]);
  assert.deepEqual(plain(saved.items), [{ pid: 'zone-boundaries', opts: { size: 'classroom' }, qty: 2 }]);
  assert.doesNotMatch(mem[K.KEY], /@|name|email|phone|address/i);
  K._reset(); assert.equal(K.load(), 1); assert.equal(K.lines()[0].qty, 2);
  mem[K.KEY] = JSON.stringify({ v: 1, items: [{ pid: 'plush-lumi', opts: {}, qty: 1 }, { pid: 'nope', qty: 2 }, { pid: 'zone-boundaries', opts: { size: 'zzz' }, qty: 2 }] });
  K._reset(); assert.equal(K.load(), 1); assert.equal(K.lines()[0].opts.size, 'home', 'a bad option falls back');
  // storage that throws must not break anything
  const broken = world({ localStorage: { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } } });
  const K2 = broken.W.FFCart; K2._reset();
  assert.doesNotThrow(() => { K2.add('zone-boundaries', {}, 1); K2.clear(); K2.load(); });
  for (const f of ['store-cart.js', 'store-shop.js', 'store-order.js']) assert.doesNotMatch(read(f).replace(/\/\*[\s\S]*?\*\//g, ''), /document\.cookie|sessionStorage/, f);
  assert.match(read('store-cart.js'), /get\(\) \{ try \{ return JSON\.parse\(localStorage/);
  assert.match(read('store-cart.js'), /set\(v\) \{ try \{/);
});

const customer = { path: 'center', name: 'Pat Rivera', email: 'pat@example.org', phone: '816-555-0100', org: 'Maple Street Learning Center', orgType: 'church', po: 'PO-4471', taxExempt: true, taxCert: 'MO-123456', taxState: 'mo',
  ship: { line1: '12 Maple St', line2: '', city: 'Independence', state: 'mo', zip: '64050' }, pay: 'invoice', notes: 'Loading dock on the east side.' };

test('request mode builds a complete order request and sends it through the quote gateway', async () => {
  const { W } = world(), K = W.FFCart, X = W.FFCheckout;
  K._reset(); K.add('zone-boundaries', { size: 'home' }, 2); K.add('rug-booker-reading-area', {}, 1);
  assert.equal(X.activeMode().mode, 'request');
  const o = X.buildOrder(K.lines(), customer, 'FF-TEST01');
  assert.equal(o.ref, 'FF-TEST01'); assert.equal(o.path, 'center'); assert.equal(o.po, 'PO-4471'); assert.equal(o.payment, 'invoice');
  assert.deepEqual(plain(o.taxExempt), { claimed: true, certificate: 'MO-123456', state: 'MO' });
  assert.deepEqual(plain(o.shipTo), { line1: '12 Maple St', line2: '', city: 'Independence', state: 'MO', zip: '64050' });
  assert.equal(o.lines.length, 2); assert.equal(o.lines[0].total, 2390); assert.equal(o.lines[1].priced, false);
  assert.equal(o.totals.subtotal, 2390); assert.equal(o.totals.quotedItems, 1); assert.match(o.totals.shipping, /estimate/i);
  const text = X.summaryText(o);
  for (const bit of ['FF-TEST01', 'not an order yet', 'Pat Rivera', 'PO number: PO-4471', 'Tax-exempt: yes', '2 x Zone Boundaries pack (Home room)', 'to be quoted', '$2,390', 'Loading dock']) assert.ok(text.includes(bit), bit);
  assert.match(X.mailtoHref(o), /^mailto:info@futureslearningcenter\.com\?subject=Order%20request%20FF-TEST01&body=/);
  // gateway on: one 'quote' submission carrying the whole summary
  const sent = [];
  W.FFIntake = { enabled: () => true, submit: async (kind, data) => { sent.push([kind, data]); return { ok: true, ref: 'QT-9', days: 2, emailConfirmation: 'queued' }; } };
  const r = await X.submit(o);
  assert.equal(r.status, 'received'); assert.equal(r.ref, 'QT-9');
  assert.equal(sent.length, 1); assert.equal(sent[0][0], 'quote');
  assert.equal(sent[0][1].email, 'pat@example.org'); assert.equal(sent[0][1].orgType, 'church'); assert.equal(sent[0][1].zip, '64050');
  assert.ok(sent[0][1].message.includes('PO-4471') && sent[0][1].message.includes('Zone Boundaries pack'));
  // gateway off: nothing is sent and the status says so
  W.FFIntake = { enabled: () => false, submit: async () => { throw new Error('must not send'); } };
  assert.equal((await X.submit(o)).status, 'gateway_off');
  W.FFIntake = undefined; assert.equal((await X.submit(o)).status, 'gateway_off');
  // gateway error: an honest error, not a success
  W.FFIntake = { enabled: () => true, submit: async () => ({ ok: false, network: true, message: 'down' }) };
  const bad = await X.submit(o); assert.equal(bad.status, 'error'); assert.match(bad.message, /down/);
  // validation
  assert.deepEqual(Object.keys(X.validate({ path: 'center', name: '', email: 'x', org: '', ship: {} }, K.lines())).sort(), ['city', 'email', 'line1', 'name', 'org', 'state', 'zip']);
  assert.deepEqual(plain(X.validate(customer, K.lines())), {});
  assert.deepEqual(plain(X.validate({ path: 'family', name: 'Sam', email: 'sam@example.org' }, [{ p: W.FFCatalog.product('kids-printables'), qty: 1 }])), {}, 'digital-only orders need no address');
});

test('stripe and shopify modes stay off until their keys exist, then redirect and never claim payment', async () => {
  const { W } = world(), K = W.FFCart, X = W.FFCheckout;
  K._reset(); K.add('poster-bop-movement-zone-v1', {}, 2);
  const o = () => X.buildOrder(K.lines(), { path: 'family', name: 'Sam', email: 'sam@example.org', ship: { line1: '1 A St', city: 'Kansas City', state: 'MO', zip: '64111' } }, 'FF-STRIPE');
  W.FF_STORE.mode = 'stripe';
  assert.deepEqual(plain(X.activeMode()), { mode: 'request', asked: 'stripe', fellBack: true, why: 'no publishable key' });
  W.FFIntake = { enabled: () => false };
  assert.equal((await X.submit(o())).status, 'gateway_off', 'still request mode: no keys');
  W.FF_STORE.stripe.publishableKey = 'pk_test_abcdefghijkl';
  assert.equal(X.activeMode().fellBack, true, 'a key alone is not enough');
  W.FF_STORE.stripe.checkoutEndpoint = 'https://pay.example.org/session';
  assert.equal(X.activeMode().mode, 'stripe');
  const calls = [];
  W.fetch = async (url, init) => { calls.push([url, JSON.parse(init.body)]); return { ok: true, status: 200, json: async () => ({ url: 'https://checkout.stripe.com/c/pay/cs_test_1' }) }; };
  vm.runInContext('fetch = window.fetch', W);
  const r = await X.submit(o());
  assert.equal(r.status, 'redirect'); assert.match(r.url, /^https:\/\/checkout\.stripe\.com\//);
  assert.equal(calls[0][0], 'https://pay.example.org/session'); assert.equal(calls[0][1].lines[0].qty, 2); assert.equal(calls[0][1].mode, 'stripe');
  assert.doesNotMatch(JSON.stringify(calls[0][1]), /pk_test|sk_/, 'no key goes to the endpoint');
  // a cart with quoted items cannot go to a card checkout: it stays a request
  K.add('rug-booker-reading-area', {}, 1);
  W.FFIntake = { enabled: () => true, submit: async () => ({ ok: true, ref: 'QT-2', days: 2 }) };
  const mixed = await X.submit(o()); assert.equal(mixed.status, 'received'); assert.match(mixed.note, /without a public price/);
  // center invoice path goes to Stripe Invoicing
  W.FF_STORE.stripe.invoiceEndpoint = 'https://pay.example.org/invoice'; K._reset(); K.add('zone-boundaries', { size: 'home' }, 1);
  W.fetch = async (url) => ({ ok: true, status: 200, json: async () => ({ url: 'https://invoice.stripe.com/i/acct_1/test_1' }) });
  vm.runInContext('fetch = window.fetch', W);
  const inv = await X.submit(X.buildOrder(K.lines(), customer, 'FF-INV'));
  assert.equal(inv.status, 'redirect'); assert.equal(inv.kind, 'invoice');
  // shopify without a shop domain falls back too
  W.FF_STORE.mode = 'shopify'; assert.equal(X.activeMode().mode, 'request');
});

test('the final checkout step is config-driven: intake off says the order is not sent and offers email, copy, print and phone; intake on shows the real confirmation', async () => {
  const fill = (W, K) => { K._reset(); K.add('zone-boundaries', { size: 'home' }, 1); const S = W.FFStoreOrder.state(); W.FFStoreOrder.reset(); Object.assign(S, W.FFStoreOrder.state()); return W.FFStoreOrder.state(); };
  // ---- intake OFF (the shipped intake-config.js has an empty url)
  {
    const { c, W } = world(), K = W.FFCart, X = W.FFCheckout;
    assert.equal(X.activeMode().mode, 'request');
    W.FFIntake = { enabled: () => false, submit: async () => { throw new Error('nothing may be sent while intake is off'); } };
    assert.equal(X.canSendOnline(), false);
    K._reset(); K.add('zone-boundaries', { size: 'home' }, 1);
    const S = W.FFStoreOrder.state(); S.path = 'family'; S.step = 2; Object.assign(S, { name: 'Sam Lee', email: 'sam@example.org' }); Object.assign(S.ship, { line1: '1 Main St', city: 'Kansas City', state: 'MO', zip: '64111' });
    const t = text(c.render('checkout'));
    assert.match(t, /Online ordering is not open yet/); assert.match(t, /Nothing is sent from this page and nothing is charged/);
    assert.match(t, /Get my order summary/); assert.doesNotMatch(t, /Send order request/); assert.match(t, /Your summary/); assert.doesNotMatch(t, /Request sent/);
    const o = X.buildOrder(K.lines(), { path: 'family', name: 'Sam Lee', email: 'sam@example.org', ship: S.ship }, 'FF-OFF001');
    const r = await X.submit(o);
    assert.equal(r.status, 'gateway_off'); assert.equal(r.order.ref, 'FF-OFF001');
    W.FFStoreOrder.state().result = r;
    const html = c.render('order'), ot = text(html);
    assert.match(ot, /Ordering opens soon/); assert.match(ot, /nothing has been sent and nothing was charged/); assert.doesNotMatch(ot, /Request received/);
    for (const bit of ['Email this summary', 'Call (816) 988-5661', 'Print or save as PDF', 'Copy summary']) assert.ok(ot.includes(bit), bit);
    assert.match(html, /href="tel:\+18169885661"/);
    const mailto = decodeURIComponent(html.match(/href="(mailto:[^"]+)"/)[1].replace(/&amp;/g, '&'));
    assert.match(mailto, /^mailto:info@futureslearningcenter\.com\?subject=Order request FF-OFF001&body=/); assert.match(mailto, /Zone Boundaries pack \(Home room\)/); assert.match(mailto, /Sam Lee/);
  }
  // ---- intake ON: the request is sent and the real confirmation shows
  {
    const { c, W } = world(), K = W.FFCart, X = W.FFCheckout, sent = [];
    W.FFIntake = { enabled: () => true, submit: async (kind, data) => { sent.push([kind, data]); return { ok: true, ref: 'QT-42', days: 2, emailConfirmation: 'queued' }; } };
    assert.equal(X.canSendOnline(), true);
    K._reset(); K.add('zone-boundaries', { size: 'home' }, 1);
    const S = W.FFStoreOrder.state(); S.path = 'family'; S.step = 2; Object.assign(S, { name: 'Sam Lee', email: 'sam@example.org' }); Object.assign(S.ship, { line1: '1 Main St', city: 'Kansas City', state: 'MO', zip: '64111' });
    const t = text(c.render('checkout'));
    assert.match(t, /Send order request/); assert.match(t, /Request sent/); assert.doesNotMatch(t, /Get my order summary|Online ordering is not open yet/);
    const r = await X.submit(X.buildOrder(K.lines(), { path: 'family', name: 'Sam Lee', email: 'sam@example.org', ship: S.ship }, 'FF-ON0001'));
    assert.equal(r.status, 'received'); assert.equal(sent.length, 1); assert.equal(sent[0][0], 'quote'); assert.match(sent[0][1].message, /Zone Boundaries pack/);
    W.FFStoreOrder.state().result = r;
    const ot = text(c.render('order'));
    assert.match(ot, /Request received/); assert.match(ot, /QT-42/); assert.match(ot, /No payment was taken/); assert.doesNotMatch(ot, /Ordering opens soon|Not sent/);
    assert.doesNotMatch(c.render('order'), /Email this summary/);
  }
});

test('copy: no concept, proposed or sample wording on any store product page or card; rug sizes are the merch package footprints everywhere', () => {
  const { c, W } = world(), C = W.FFCatalog, RK = W.FFRoomKit;
  const pages = ['store', 'kids-shop', 'shop/carpets'].map(r => c.render(r.split('/')[0], r.split('/')[1])).concat(C.PRODUCTS.map(p => c.render('product', p.id)));
  for (const html of pages) assert.doesNotMatch(text(html).replace(/Proposed, owner to confirm:?/g, ''), /\bconcepts?\b|\bproposed\b|\bsamples?\b|\bprototype\b/i);
  const kit = id => C.product(id).box.concat(C.product(id).dims).join(' | ');
  assert.match(kit('kit-home'), /6 ft round Friends Circle rug/); assert.match(kit('kit-center-starter'), /8 ft round Friends Circle rug/); assert.match(kit('kit-center-complete'), /8 ft round Friends Circle rug/);
  for (const id of ['kit-home', 'kit-center-starter', 'kit-center-complete', 'rug-friends-circle', 'rug-square-friends-circle']) assert.doesNotMatch(kit(id) + C.product(id).description, /6 x 9/);
  const rk = JSON.stringify(RK); assert.doesNotMatch(rk, /6 x 9/);
  assert.deepEqual(plain(C.product('rug-friends-circle').options[0].values.map(v => v.label)), ['6 x 6 ft', '8 x 8 ft', 'Match my room']);
});

test('no fake success state: no screen says paid, payment successful or order confirmed', async () => {
  const { c, W } = world(), K = W.FFCart, X = W.FFCheckout;
  const FAKE = /payment (was )?(successful|received|complete|confirmed)|you(?:'ve| have) paid|order (placed|confirmed|complete)|thank you for your (order|payment|purchase)|\bpaid\b|purchase complete/i;
  for (const f of STORE_FILES.filter(f => f !== 'store-merch-data.js')) assert.doesNotMatch(read(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, ''), FAKE, f);
  K._reset(); K.add('zone-boundaries', { size: 'home' }, 1);
  const o = X.buildOrder(K.lines(), customer, 'FF-OK0001');
  W.FFStoreOrder.state().result = { status: 'received', ref: 'QT-7', days: 2, order: o };
  let t = text(c.render('order'));
  assert.match(t, /Request received/); assert.match(t, /We will confirm availability and send an invoice/); assert.match(t, /No payment was taken/); assert.doesNotMatch(t, FAKE);
  W.FFStoreOrder.state().result = { status: 'gateway_off', ref: 'FF-OK0001', order: o };
  t = text(c.render('order'));
  assert.match(t, /Ordering opens soon/); assert.match(t, /nothing has been sent and nothing was charged/); assert.match(t, /Email this summary/); assert.match(t, /Print or save as PDF/); assert.match(t, /Copy summary/);
  assert.doesNotMatch(t, /Request received/); assert.doesNotMatch(t, FAKE);
  assert.match(c.render('order'), /href="mailto:info@futureslearningcenter\.com\?subject=Order%20request/);
  t = text(c.render('order-return'));
  assert.match(t, /confirm payment from the payment provider/); assert.doesNotMatch(t, FAKE);
  W.FFStoreOrder.reset(); assert.match(text(c.render('order')), /No order request in this tab/);
});

test('every product renders a real page: price text, honest status, no leaks, one h1, labelled concept pictures', () => {
  const { c, W } = world(), C = W.FFCatalog;
  assert.equal(C.PRODUCTS.length, new Set(C.PRODUCTS.map(p => p.id)).size, 'ids are unique');
  for (const p of C.PRODUCTS) {
    for (const x of p.pairs) assert.ok(C.product(x), `${p.id} pairs with missing ${x}`);
    const html = c.render('product', p.id);
    assert.doesNotMatch(html, /undefined|\[object Object\]|NaN|\$null/, p.id);
    assert.equal((html.match(/<h1[ >]/g) || []).length, 1, p.id);
    assert.match(html, /Returns and refunds: Draft, owner and counsel to confirm/, p.id);
    assert.ok(p.faq.length >= 2 && p.box.length && p.safety !== undefined, p.id);
    const ids = [...html.matchAll(/ id="([^"]+)"/g)].map(m => m[1]); assert.equal(ids.length, new Set(ids).size, p.id + ' unique ids');
    if (p.priceState === 'quote') assert.match(text(html), /Request a quote|priced in your written quote|Add to cart for a quote/, p.id);
    if (p.priceState === 'soon') assert.match(text(html), /Price coming soon/, p.id);
    if (C.gallery(p, []).some(g => g.kind === 'concept')) assert.ok(text(html).includes(C.CONCEPT_CAPTION), p.id + ' carries the owner caption');
  }
  for (const id of ['plush-lumi', 'booker-tshirt', 'bottle-zuri']) assert.doesNotMatch(c.render('product', id), /Concept sample|safety test/i, id + ' reads as a regular product');
  assert.match(text(c.render('product', 'nope')), /could not find that product/);
  // collections, filters and sort
  const kits = C.query('kits', {}, 'featured'); assert.deepEqual(plain(kits.map(p => p.id)), ['kit-home', 'kit-center-starter', 'kit-center-complete']);
  assert.ok(C.query('all', { audience: 'family' }).every(p => p.audiences.includes('family')));
  assert.deepEqual(plain(C.query('posters', {}, 'price-asc').map(p => p.price)), Array(10).fill(16));
  assert.ok(C.query('carpets', { zone: 'bop' }).every(p => p.zones.includes('bop')));
  assert.equal(C.query('plush', { age: 'infant' }).length, 0, 'plush is not for infants');
  assert.match(text(c.render('shop', 'carpets')), /Carpets and corner rugs/);
  assert.match(c.render('shop', 'kits'), /href="#room-kit"/); assert.match(c.render('shop-programs'), /href="#room-planner"/);
  assert.equal(c.render('shop', 'nope').includes('All products'), true);
});

test('the kids\' shop stays small and uses the same cards, product pages and cart', () => {
  const { c, W } = world(), C = W.FFCatalog, html = c.render('kids-shop');
  assert.deepEqual(plain(C.kidsSections().map(s => s[0])), ['T-shirts', 'Hoodies', 'Backpacks', 'Plush friends', 'Stickers & coloring', 'Bottles & plates', 'Carpets', 'Posters', 'Free printables and a small carpet']);
  assert.equal((html.match(/class="sp-card"/g) || []).length, 5 + 5 + 8 + 4 + 11 + 5 + 10 + 10 + 2);
  for (const id of ['booker-tshirt', 'all-friends-hoodie', 'zuri-backpack', 'plush-bop', 'rug-lumi-calm-corner', 'rug-square-bop-movement-zone', 'poster-bop-movement-zone-v2', 'poster-friends-circle-v1', 'poster-lumi-calm-corner-v2']) assert.match(html, new RegExp('data-go="product/' + id + '"'), id);
  assert.match(html, /data-go="product\/plush-lumi"/); assert.match(html, /Notify me/);
  assert.doesNotMatch(html, /kit-center|zone-boundaries/);
  assert.equal(vm.runInContext("typeof V['shop-families'] + typeof V['kids-shop']", c), 'functionfunction');
});

test('copy has no AI tells, no emoji, no placeholder text, and the compliance labels are on the store', () => {
  const { c, W } = world(), C = W.FFCatalog;
  const files = ['store-catalog.js', 'store-shop.js', 'store-product.js', 'store-order.js', 'store-cart.js'];
  const TELL = /\b(delve|tapestry|testament|seamless(ly)?|robust|vibrant|foster|empower|elevate|unlock|journey|holistic|game-changer|cutting-edge|in today's|it's not just|more than just|let's dive|whether you're)\b/i;
  for (const f of files) assert.doesNotMatch(read(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''), TELL, f);
  const pages = ['store', 'kids-shop', 'cart', 'checkout'].map(r => c.render(r)).concat(C.PRODUCTS.map(p => c.render('product', p.id))).join('\n');
  assert.doesNotMatch(pages, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u, 'no emoji');
  assert.doesNotMatch(pages, /lorem|ipsum|placeholder text|\[insert|TODO|TBD/i);
  const home = text(c.render('store'));
  for (const label of ['Children’s Product Certificate', 'Small parts, under 3', 'Sales tax', 'Freight for rugs', 'Returns', 'Terms of sale', 'Order privacy']) assert.ok(home.includes(label), label);
  assert.equal((home.match(/Draft, owner and counsel to confirm/g) || []).length, 2);
  assert.doesNotMatch(read('index.html'), /fonts\.googleapis/);
});

test('files: index loads the store after audiences.js and kit-showcase.js, caches are bumped, routes are known, images are indexed', () => {
  const html = read('index.html'), at = s => html.indexOf(s);
  assert.ok(at('<script src="store-shop.js') > at('<script src="audiences.js') && at('<script src="store-shop.js') > at('<script src="kit-showcase.js'));
  const order = ['store-config.js', 'store-merch-data.js', 'store-catalog.js', 'store-cart.js', 'store-checkout.js', 'store-shop.js', 'store-product.js', 'store-order.js'].map(f => at(`<script src="${f}?v=`));
  assert.ok(order.every((n, i) => n > 0 && (i === 0 || n > order[i - 1])), 'script order');
  assert.match(html, /<link rel="stylesheet" href="store-shop\.css\?v=\d+">/);
  const R = require(path.join(ROOT, 'route-meta.js')).ROUTES;
  for (const r of ['store', 'shop', 'product', 'cart', 'checkout', 'order', 'order-return']) assert.ok(R[r], r);
  const way = read('wayfinding.js'); for (const r of ['shop', 'product', 'cart', 'checkout', 'order']) assert.match(way, new RegExp(`\\b${r}: \\[`), r);
  const man = JSON.parse(read('img/store/manifest.json'));
  const missing = [];
  for (const [id, p] of Object.entries(man.products)) for (const im of p.images) for (const f of (im.files || []).map(x => x[0]).concat(im.jpg)) if (!fs.existsSync(path.join(ROOT, f))) missing.push(f);
  assert.deepEqual(missing, []);
  const { c, W } = world(); for (const p of W.FFCatalog.PRODUCTS.filter(p => p.sample)) assert.ok(man.products[p.id], `no picture imported for ${p.id}`);
  for (const col of ['carpets', 'plush', 'posters', 'apparel']) assert.ok(man.products['collection-' + col], 'hero for ' + col);
  assert.ok(fs.existsSync(path.join(ROOT, 'tools/import-store-images.mjs')));
  assert.ok(fs.existsSync(path.join(ROOT, 'STORE_SETUP.md')) && fs.existsSync(path.join(ROOT, 'STORE_BLINDSPOTS.md')));
  assert.doesNotMatch(read('store-config.js'), /pk_(live|test)_\w{8}|sk_(live|test)|whsec_/, 'no key in the config');
});

// ---------------------------------------------------------------- browser: mobile overflow and the cart drawer
const H = () => import('./a11y-harness.mjs');
let h, srv, browser;
test.before(async () => { h = await H(); srv = await h.startSite(); browser = await h.loadChromium().launch(); });
test.after(async () => { await browser.close(); await srv.close(); });

test('mobile: no sideways scroll at 360, 390 and 430 px on the store, a collection, a product, the cart, checkout and the kids\' shop', async () => {
  const routes = ['store', 'shop/carpets', 'shop/apparel', 'product/zone-boundaries', 'product/plush-lumi', 'product/rug-square-booker-reading-area', 'cart', 'checkout', 'kids-shop'];
  const bad = [];
  for (const w of [360, 390, 430]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 800 }, reducedMotion: 'reduce' }), page = await ctx.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${srv.base}?fresh=${Date.now()}#shop`); await page.evaluate(() => { try { localStorage.setItem('ff-store-cart-v1', JSON.stringify({ v: 1, items: [{ pid: 'zone-boundaries', opts: { size: 'home' }, qty: 1 }, { pid: 'rug-booker-reading-area', opts: {}, qty: 2 }] })); } catch (_) { /* none */ } });
    for (const r of routes) {
      await h.goto(page, srv.base, r, 350);
      await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { scrollTo(0, y); await new Promise(x => setTimeout(x, 30)); } scrollTo(0, 0); });
      const over = await page.evaluate(() => [...document.querySelectorAll('#view *')].filter(e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.right > innerWidth + 1 && !e.closest('.sp-gal-track,.sp-pills,.sp-gal-thumbs,.tw,.sp-rail-list,.sp-row,.sp-bar-in,.sp-float,.sf-col-row,.sf-deco,.sf-ticker'); }).slice(0, 4).map(e => e.tagName + '.' + String(e.className).slice(0, 30)));
      if (over.length) bad.push(`${w}px #${r}: ${over.join(', ')}`);
    }
    assert.deepEqual(errors, [], 'no page errors at ' + w);
    await ctx.close();
  }
  assert.deepEqual(bad, []);
});

test('the cart drawer is an accessible modal: labelled dialog, focus moves in and is trapped, Escape returns focus, the page is inert, the count is announced', async () => {
  const { ctx, page, errors } = await h.open(browser, 390);
  await h.goto(page, srv.base, 'product/zone-boundaries');
  await page.evaluate(() => { try { localStorage.removeItem('ff-store-cart-v1'); } catch (_) { /* none */ } });
  const btn = page.locator('.sp-addbtn').first();
  assert.equal(await page.locator('#spViewCart').count(), 1);
  await btn.click(); await page.waitForSelector('#spDrawer.is-open'); await page.waitForTimeout(250);
  const d = page.locator('#spDrawer .sp-panel');
  assert.equal(await d.getAttribute('role'), 'dialog'); assert.equal(await d.getAttribute('aria-modal'), 'true'); assert.equal(await d.getAttribute('aria-labelledby'), 'spDrawerH');
  assert.equal(await page.locator('#spDrawerH').innerText(), 'Your bag');
  assert.ok(await page.evaluate(() => document.getElementById('spDrawer').contains(document.activeElement)), 'focus is inside');
  assert.ok(await page.evaluate(() => ['#view', 'header.bar', 'footer'].every(s => document.querySelector(s).hasAttribute('inert'))), 'the page behind is inert');
  assert.match(await page.locator('#spLive').innerText(), /Zone Boundaries pack added\. 1 item in your bag\./);
  assert.match(await page.locator('#spCartBtn .sp-sr').innerText(), /1 item in your bag/);
  // Tab never leaves the dialog
  for (let i = 0; i < 14; i++) { await page.keyboard.press('Tab'); assert.ok(await page.evaluate(() => document.getElementById('spDrawer').contains(document.activeElement)), 'Tab ' + i); }
  for (let i = 0; i < 6; i++) { await page.keyboard.press('Shift+Tab'); assert.ok(await page.evaluate(() => document.getElementById('spDrawer').contains(document.activeElement)), 'Shift+Tab ' + i); }
  // quantity stepper edits the line, keeps focus, and a fresh total shows
  await page.locator('[data-sp-qty][data-d="1"]').first().click();
  assert.match(await page.locator('#spDrawer .sp-totals').innerText(), /\$2,390/);
  assert.ok(await page.evaluate(() => document.getElementById('spDrawer').contains(document.activeElement)), 'focus survives a quantity change');
  const v = await h.axe(page, { include: '#spDrawer' }); assert.deepEqual(v, [], 'axe on the open drawer: ' + JSON.stringify(v));
  await page.keyboard.press('Escape'); await page.waitForFunction(() => document.getElementById('spDrawer').hidden);
  assert.ok(await page.evaluate(() => document.activeElement && document.activeElement.classList.contains('sp-addbtn')), 'focus returns to the Add to cart button');
  assert.ok(await page.evaluate(() => !document.querySelector('#view').hasAttribute('inert')), 'the page is live again');
  // the header button opens it, the scrim closes it
  await page.setViewportSize({ width: 1280, height: 800 });   // on a phone the panel covers the whole screen, so the scrim is only reachable on a wider one
  await page.locator('#spViewCart').click(); await page.waitForSelector('#spDrawer.is-open'); await page.locator('.sp-scrim').click({ position: { x: 4, y: 300 } }); await page.waitForFunction(() => document.getElementById('spDrawer').hidden);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'spViewCart');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('browse, product, add to cart, checkout and the request confirmation work end to end, at 390 and 1280, with no payment claim', async () => {
  for (const w of [390, 1280]) {
    const { ctx, page, errors } = await h.open(browser, w);
    await h.goto(page, srv.base, 'store'); assert.equal(await page.locator('h1').first().innerText(), 'Shop the room.');
    await page.locator('.sp-chip', { hasText: 'Posters' }).first().click(); await page.waitForSelector('.sp-grid');
    assert.equal(await page.locator('.sp-card').count(), 10);
    await page.selectOption('[data-sp-f="character"]', 'bop'); assert.equal(await page.locator('.sp-card').count(), 2);
    await page.locator('.sp-card-name a').first().click(); await page.waitForSelector('.sp-pdp');
    assert.match(await page.locator('.sp-info h1').innerText(), /Bop/);
    await page.locator('.sp-addbtn').first().click(); await page.waitForSelector('#spDrawer.is-open');
    await page.locator('#spDrawer [data-go="checkout"]').click(); await page.waitForSelector('#spCkForm');
    await page.fill('#ck-name', 'Sam Lee'); await page.fill('#ck-email', 'sam@example.org'); await page.fill('#ck-line1', '1 Main St'); await page.fill('#ck-city', 'Kansas City'); await page.fill('#ck-zip', '64111');
    await page.locator('[data-ck-path][value="family"]').check({ force: true }); await page.waitForSelector('#ck-name');
    await page.fill('#ck-name', 'Sam Lee'); await page.fill('#ck-email', 'sam@example.org'); await page.fill('#ck-line1', '1 Main St'); await page.fill('#ck-city', 'Kansas City'); await page.fill('#ck-zip', '64111');
    await page.click('[data-sp-ckform] button[type=submit]'); await page.waitForSelector('[data-ck-place]');
    assert.match(await page.locator('.sp-review').innerText(), /Sam Lee/);
    await page.click('[data-ck-place]'); await page.waitForSelector('.sp-order');
    const t = await page.locator('.sp-order').innerText();
    assert.match(t, /Ordering opens soon/); assert.match(t, /nothing has been sent and nothing was charged/); assert.match(t, /Poster/); assert.match(t, /\$16/);
    assert.doesNotMatch(t, /payment successful|you have paid|order confirmed|thank you for your (order|payment)/i);
    assert.equal(await page.locator('.sp-doc').count(), 1);
    assert.deepEqual(errors, [], 'no page errors at ' + w);
    await ctx.close();
  }
});

test('axe: no violations on the store pages at 1280 and 390', async () => {
  const bad = [];
  for (const w of [1280, 390]) {
    const { ctx, page } = await h.open(browser, w);
    for (const r of ['store', 'shop/carpets', 'shop/apparel', 'product/zone-boundaries', 'product/plush-lumi', 'cart', 'checkout', 'kids-shop']) {
      await h.goto(page, srv.base, r, 500); const v = await h.axe(page);
      if (v.length) bad.push(`${w}px #${r}: ` + v.map(x => `${x.id} (${x.impact}) ${x.nodes.map(n => n.target).join(' | ')}`).join('; '));
    }
    await ctx.close();
  }
  assert.deepEqual(bad, []);
});

test('shop from anywhere: the header Shop entry and live cart count, the menu, the footer and the View cart pill, on both audiences, desktop and phone', async () => {
  for (const w of [1280, 390]) for (const aud of ['families', 'centers']) {
    const { ctx, page, errors } = await h.open(browser, w);
    await h.goto(page, srv.base, aud === 'families' ? 'home' : 'centers');
    await page.evaluate(a => { try { localStorage.removeItem('ff-store-cart-v1'); localStorage.setItem('ff-audience', a); } catch (_) { /* none */ } }, aud);
    await h.goto(page, srv.base, aud === 'families' ? 'home' : 'centers');
    const btn = page.locator('#spCartBtn'); assert.equal(await btn.count(), 1, `${w} ${aud}: header Shop button`);
    assert.ok(await btn.isVisible(), `${w} ${aud}: visible`);
    assert.match(await btn.getAttribute('class'), /sp-cartbtn/);
    assert.equal(await page.locator('#spCartBtn .sp-cartlabel').isVisible(), w >= 1000, 'the word Shop shows on wide screens; the bag and count alone on phones');
    const box = await btn.boundingBox(); assert.ok(box.x + box.width <= w + 1 && box.x >= 0, 'inside the viewport');
    await btn.click(); await page.waitForFunction(r => location.hash.startsWith(r), aud === 'families' ? '#kids-shop' : '#store');
    // the live count and the sticky View cart pill follow the cart
    await page.evaluate(() => { try { localStorage.setItem('ff-store-cart-v1', JSON.stringify({ v: 1, items: [{ pid: 'booker-backpack', opts: {}, qty: 2 }] })); } catch (_) { /* none */ } });
    await h.goto(page, srv.base, aud === 'families' ? 'kids-shop' : 'store');
    assert.match(await page.locator('#spCartBtn .sp-sr').innerText(), /2 items in your bag/);
    assert.ok(await page.locator('#spViewCart').isVisible(), 'View cart pill');
    await page.locator('#spViewCart').click(); await page.waitForSelector('#spDrawer.is-open'); assert.match(await page.locator('#spDrawer').innerText(), /Booker backpack/);
    await page.keyboard.press('Escape'); await page.waitForFunction(() => document.getElementById('spDrawer').hidden);
    await h.goto(page, srv.base, 'cart'); assert.ok(!(await page.locator('#spViewCart').isVisible()), 'no pill on the cart page');
    assert.deepEqual(errors, []);
    await ctx.close();
  }
});

test('shop is in the menu (near the top, both audiences) and in the footer site map', async () => {
  const way = read('wayfinding.js');
  assert.match(way, /families: \[\['kids-shop', 'Shop: Kids\\' Shop'\]/); assert.match(way, /centers: \[\['store', 'Shop: Futures Store'\]/);
  const html = read('index.html');
  assert.match(html, /<a href="#kids-shop">Shop: Kids&rsquo; Shop<\/a>/); assert.match(html, /<a href="#store">Shop: Futures Store<\/a>/);
  const { ctx, page } = await h.open(browser, 390);
  for (const aud of ['families', 'centers']) {
    await h.goto(page, srv.base, 'pricing'); await page.evaluate(a => { try { localStorage.setItem('ff-audience', a); } catch (_) { /* none */ } }, aud);
    await h.goto(page, srv.base, aud === 'families' ? 'home' : 'centers'); await page.click('#menuT'); await page.waitForSelector('#ffw-menu[open]');
    const first = await page.evaluate(() => [...document.querySelectorAll('#ffw-menu a[href^="#"]')].filter(a => a.offsetParent !== null).slice(0, 4).map(a => a.getAttribute('href')));
    assert.ok(first.includes(aud === 'families' ? '#kids-shop' : '#store'), `${aud} menu top links ${first}`);
    await page.keyboard.press('Escape');
  }
  await ctx.close();
});

test('search finds the store: shop, buy, carpet, rug, backpack, shirt, hoodie, plush, doll, poster, apparel, kit, and friend names with them', async () => {
  const { ctx, page } = await h.open(browser, 1280);
  await h.goto(page, srv.base, 'home');
  const find = async q => { await page.evaluate(() => { const i = document.getElementById('px-globalquery'); if (i) i.value = ''; }); await page.keyboard.press('Control+k'); await page.waitForSelector('#px-globalquery', { state: 'visible' }); await page.fill('#px-globalquery', q); await page.waitForTimeout(250);
    const hrefs = await page.evaluate(() => [...document.querySelectorAll('#ffw-pal-list a[href^="#"]')].map(a => a.getAttribute('href'))); await page.keyboard.press('Escape'); return hrefs; };
  const SHOP = /^#(product\/|shop|store|kids-shop)/;
  for (const q of ['shop', 'store', 'buy', 'order', 'carpet', 'rug', 'backpack', 'shirt', 't-shirt', 'hoodie', 'plush', 'doll', 'poster', 'apparel', 'kit']) {
    const r = await find(q); assert.ok(r.length && (SHOP.test(r[0]) || (q === 'kit' && r[0] === '#room-kit')), `"${q}" first result is ${r[0]} (all: ${r.slice(0, 4)})`);
  }
  const want = { 'backpack': /^#product\/[a-z-]+-backpack$/, 'hoodie': /^#product\/[a-z-]+-hoodie$/, 'doll': /^#(shop\/plush|product\/plush-)/, 'booker backpack': /^#product\/booker-backpack$/, 'lumi plush': /^#product\/plush-lumi$/, 'zuri hoodie': /^#product\/zuri-hoodie$/, 'bop poster': /^#product\/poster-bop/, 'lumi t-shirt': /^#product\/lumi-tshirt$/, 'all friends shirt': /^#product\/all-friends-tshirt$/, 'booker carpet': /^#product\/rug-(square-)?booker/ };
  for (const [q, re] of Object.entries(want)) { const r = await find(q); assert.ok(r.slice(0, 3).some(x => re.test(x)), `"${q}" -> ${r.slice(0, 3)}`); }
  assert.ok((await find('carpet')).some(x => x === '#shop/carpets'), 'the carpets collection is found');
  // choosing a result lands on the product
  await page.keyboard.press('Control+k'); await page.fill('#px-globalquery', 'booker backpack'); await page.waitForTimeout(250); await page.locator('#ffw-pal-list a[href="#product/booker-backpack"]').first().click();
  await page.waitForSelector('.sp-pdp'); assert.match(await page.locator('.sp-info h1').innerText(), /Booker backpack/);
  await ctx.close();
});

test('the header never overflows on a phone: ES, search, preferences, Shop and the menu button all sit inside 360, 390 and 430 px, with no sideways scroll', async () => {
  const bad = [];
  for (const w of [360, 390, 430]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 800 }, reducedMotion: 'reduce' }), page = await ctx.newPage();
    for (const aud of ['families', 'centers']) for (const r of ['home', 'centers', 'pricing', 'kids-shop', 'store', 'product/booker-backpack']) {
      await page.goto(`${srv.base}?fresh=${Date.now()}#pricing`); await page.evaluate(a => { try { localStorage.setItem('ff-audience', a); localStorage.setItem('ff-store-cart-v1', JSON.stringify({ v: 1, items: [{ pid: 'booker-backpack', opts: {}, qty: 12 }] })); } catch (_) { /* none */ } }, aud);
      await h.goto(page, srv.base, r, 400);
      const m = await page.evaluate(() => { const bar = document.querySelector('header.bar'), btns = [...bar.querySelectorAll('button, a.px-btn')].filter(b => b.getClientRects().length); return { sw: document.documentElement.scrollWidth, iw: innerWidth, right: Math.max(...btns.map(b => b.getBoundingClientRect().right)), menu: !!document.getElementById('menuT') && document.getElementById('menuT').getBoundingClientRect().right, shop: !!document.getElementById('spCartBtn') && document.getElementById('spCartBtn').getClientRects().length > 0 }; });
      if (m.sw > m.iw || m.right > m.iw + 0.5 || !m.shop) bad.push(`${w}px ${aud} #${r}: scrollWidth ${m.sw}, rightmost header control ${Math.round(m.right)}, shop button ${m.shop}`);
    }
    await ctx.close();
  }
  assert.deepEqual(bad, []);
});

test('all 58 products in the owner\'s catalog are in the store, with no price and no concept labels (owner order 2026-10-07)', () => {
  const { c, W } = world(), C = W.FFCatalog;
  const all = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/merch-all-products.json'), 'utf8')).products;
  assert.equal(all.length, 58);
  for (const p of all) {
    const x = C.product(p.id); assert.ok(x, 'missing ' + p.id);
    assert.equal(p.price, null);
    if (!/^(poster|plush)-/.test(p.id)) assert.notEqual(x.priceState, 'fixed', p.id + ' has no invented price');
    const html = c.render('product', p.id);
    assert.doesNotMatch(html, /Concept sample|concept sample|CPSIA|FDA|safety test/, p.id + ' reads as a regular product');
    assert.doesNotMatch(html, /\b\d+ (sold|reviews?)\b|★|\b\d(\.\d)? stars?\b/i, p.id + ' has no fake social proof');
  }
  for (const col of ['stickers', 'drinkware']) assert.ok(C.collection(col) && C.inCollection(col).length, col);
  // searchable words
  const hit = w => C.PRODUCTS.filter(p => (C.keywords(p) + ' ' + p.name).toLowerCase().includes(w)).length;
  for (const w of ['sticker', 'coloring', 'crayon', 'bottle', 'water bottle', 'cup', 'plate', 'lunch']) assert.ok(hit(w) > 0 || C.collectionKeywords('drinkware').includes(w) || C.collectionKeywords('stickers').includes(w), 'search finds ' + w);
});

test('the fun layer: files are linked, motion respects reduced motion, product pictures are never cropped', () => {
  const idx = read('index.html'), css = read('store-fun.css') + read('store-pro.css'), js = read('store-fun.js');
  assert.match(idx, /store-fun\.css\?v=\d+/); assert.match(idx, /store-fun\.js\?v=\d+/);
  assert.match(css, /prefers-reduced-motion:reduce/); assert.match(js, /FFMotion\.allowed|prefers-reduced-motion/);
  const rules = css.replace(/\/\*[\s\S]*?\*\//g, '').split('}').filter(r => !/sp-cover|branded-rooms|sp-hero|sp-edit|sp-headfig|sp-vid/.test(r));
  assert.ok(!rules.some(r => /\.sp-media[^{]*\{[^}]*object-fit:\s*cover/.test(r)), 'cards never crop');
  assert.ok(!rules.some(r => /\.sp-gal-zoom[^{]*\{[^}]*object-fit:\s*cover/.test(r)), 'the product gallery never crops (room concept pictures excepted)');
});
