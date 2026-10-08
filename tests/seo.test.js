// SEO and AI-search build (tools/prerender.mjs): every sitemap address has a real committed page with its own title, canonical, h1 and
// parseable JSON-LD; the pages carry no private curriculum; offers appear only where the catalog shows a real price.
// Regenerate with: node tools/prerender.mjs   (node tools/prerender.mjs --check fails when committed output is stale)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const CFG = JSON.parse(read('tools/seo-config.json'));
const ORIGIN = CFG.origin.replace(/\/+$/, '');
const sitemap = read('sitemap.xml');
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
const fileOf = u => (u === ORIGIN + '/' ? 'index.html' : u.slice(ORIGIN.length + 1) + '.html');
const decode = s => s.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const meta = (h, re) => { const m = h.match(re); return m ? decode(m[1]) : ''; };
const main = h => { const a = h.search(/<main id="view"/); return h.slice(a, h.indexOf('</main>', a)); };
const ld = h => [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1].replace(/\\u003c/g, '<')));

test('the sitemap lists every public page once, with absolute addresses on the configured origin', () => {
  assert.ok(locs.length >= 150, `${locs.length} sitemap addresses`);
  assert.equal(new Set(locs).size, locs.length, 'no duplicate addresses');
  for (const u of locs) assert.ok(u.startsWith(ORIGIN + '/'), u);
  for (const k of ['kids-shop', 'enroll', 'centers', 'friends', 'store', 'membership', 'product-plush-bop', 'shop-kits']) assert.ok(locs.includes(`${ORIGIN}/${k}`), k);
  assert.match(read('robots.txt'), new RegExp(`^Sitemap: ${ORIGIN.replace(/[./]/g, '\\$&')}/sitemap\\.xml$`, 'm'));
  assert.match(read('robots.txt'), /^User-agent: \*$/m);
  assert.doesNotMatch(read('robots.txt'), /^Disallow: \S/m);
});

test('every sitemap address has a committed page with a unique title, description and canonical, and a real h1', () => {
  const titles = new Set(), descs = new Set();
  for (const u of locs) {
    const f = fileOf(u);
    assert.ok(fs.existsSync(path.join(ROOT, f)), `${f} exists for ${u}`);
    const h = read(f);
    const title = meta(h, /<title>([^<]*)<\/title>/), desc = meta(h, /<meta name="description" content="([^"]*)">/);
    assert.ok(title && title.length <= 60, `${f}: title (${title.length}) ${title}`);
    assert.ok(desc.length >= 20 && desc.length <= 155, `${f}: description length ${desc.length}`);
    assert.ok(!titles.has(title), `${f}: duplicate title ${title}`); titles.add(title);
    assert.ok(!descs.has(desc), `${f}: duplicate description`); descs.add(desc);
    assert.equal(meta(h, /<link rel="canonical" href="([^"]*)">/), u, `${f}: canonical is its own address`);
    assert.equal(meta(h, /<meta property="og:url" content="([^"]*)">/), u, `${f}: og:url`);
    assert.match(h, /<meta property="og:image" content="https:\/\/[^"]+">/, `${f}: og:image`);
    assert.match(h, /<meta name="twitter:card" content="summary_large_image">/);
    assert.match(h, /<meta name="twitter:title" content="[^"]+">/);
    const m = main(h);
    const h1s = [...m.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)];
    assert.equal(h1s.length, 1, `${f}: exactly one h1`);
    assert.ok(h1s[0][1].replace(/<[^>]+>/g, '').trim() || /<img[^>]+alt="[^"]+"/.test(h1s[0][1]), `${f}: h1 has text or a logo with alt text`);
    assert.ok(m.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').length > 300, `${f}: real text is in the HTML, not only in scripts`);
    assert.match(m, /<a [^>]*href="[^#"]/, `${f}: crawlable links in the page body`);
    if (f !== 'index.html') assert.match(h, /window\.FF_PRERENDER="[^"]+"/, `${f}: boots the app on its own route`);
  }
});

test('JSON-LD parses on every page; Organization and ChildCare use only facts from the site; offers only for real prices', () => {
  const C = require('../store-catalog.js');
  const home = ld(read('index.html'))[0]['@graph'];
  const org = home.find(n => n['@type'] === 'Organization'), flc = home.find(n => Array.isArray(n['@type']) && n['@type'].includes('ChildCare'));
  assert.ok(org && flc && home.find(n => n['@type'] === 'WebSite'));
  assert.equal(org.sameAs, undefined, 'no social profiles exist on the site, so none are claimed');
  assert.equal(flc.address.streetAddress, '3625 S Blue Ridge Blvd');
  assert.equal(flc.address.postalCode, '64052');
  assert.equal(flc.openingHours, undefined); assert.equal(flc.openingHoursSpecification, undefined);
  assert.equal(flc.aggregateRating, undefined); assert.equal(flc.review, undefined); assert.equal(flc.priceRange, undefined);
  let products = 0, offers = 0;
  for (const u of locs) {
    const f = fileOf(u), blocks = ld(read(f));
    assert.ok(blocks.length >= 1, `${f}: JSON-LD present`);
    for (const b of blocks) {
      assert.equal(b['@context'], 'https://schema.org');
      for (const n of b['@graph']) {
        assert.ok(n['@type']);
        if (n['@type'] === 'BreadcrumbList') n.itemListElement.forEach((x, i) => assert.equal(x.position, i + 1));
        if (n['@type'] === 'Product') {
          products++;
          const p = C.product(n.sku);
          assert.ok(p, `${f}: catalog product ${n.sku}`);
          assert.equal(n.availability, undefined);
          if (n.offers) {
            offers++;
            assert.equal(p.priceState, 'fixed', `${f}: an offer only for a fixed approved price`);
            assert.ok(C.canOrder(p), `${f}: an offer only for something that can be ordered`);
            assert.equal(n.offers.availability, undefined, 'availability is never claimed');
            assert.equal(n.offers.priceCurrency, 'USD');
            const price = n.offers.price !== undefined ? +n.offers.price : null;
            if (price !== null) assert.equal(price, p.price);
          }
        }
      }
    }
  }
  assert.equal(products, C.PRODUCTS.length, 'a Product for every catalog item');
  assert.ok(offers > 5 && offers < products, 'some products carry an offer, the quote-only and coming-soon ones do not');
  const plush = ld(read('product-plush-bop.html'))[0]['@graph'].find(n => n['@type'] === 'Product');
  assert.equal(plush.offers, undefined, 'the plush cannot be ordered yet: no offer');
  assert.ok(ld(read('support.html'))[0]['@graph'].some(n => n['@type'] === 'FAQPage'));
});

test('no private curriculum text or file names reach a public page, the sitemap, llms.txt or the manifest', () => {
  const vm = require('node:vm');
  const P = require('./private-curriculum');
  const files = [...locs.map(fileOf), 'sitemap.xml', 'llms.txt', 'llms-full.txt', 'robots.txt', '404.html', 'docs/seo-manifest.json'];
  const GATED = /printables\/unit-\d|unit\d+-(data|prep|family)\.js|curriculum-indicators\.js|units\.js|#unit-1\/|unit-1\/\d|u\d+-day-\d+/;
  const body = f => read(f).replace(/<script src="[^"]*"><\/script>/g, '').replace(/printables\/sample\/ff-sample-u1-day-09-teacher-packet\.pdf/g, '');   // the one watermarked sample is public on purpose          // script tags are code, not page content
  for (const f of files) assert.doesNotMatch(body(f), GATED, `${f}: no curriculum file or day address`);
  // when the private curriculum is mounted, no lesson goal from it may appear in any page text
  if (P.has('unit1-data.js')) {
    const c = { window: {} }; vm.createContext(c); vm.runInContext(P.readPriv('unit1-data.js'), c);
    const goals = (c.window.FFUnit1Data ? c.window.FFUnit1Data.days : []).flatMap(d => d.blocks.map(b => String(b.goal || '').trim())).filter(g => g.length > 45);
    assert.ok(goals.length > 20, 'private goals loaded');
    const all = files.map(read).join('\n');
    for (const g of goals) assert.ok(!all.includes(g), `private lesson goal leaked: ${g.slice(0, 60)}`);
  }
});

test('llms.txt follows the proposal (H1, quote summary, H2 link lists) and every address in it is a real page', () => {
  const t = read('llms.txt');
  assert.match(t, /^# Futures Friends\n\n> /);
  assert.ok((t.match(/^## /gm) || []).length >= 5);
  const urls = [...t.matchAll(/\]\((https:[^)]+)\)/g)].map(m => m[1]);
  assert.ok(urls.length >= 25);
  for (const u of urls) assert.ok(locs.includes(u) || /\/(sitemap\.xml|llms-full\.txt)$/.test(u), `llms.txt links a real page: ${u}`);
  assert.match(t, /Learn\. Move\. Explore\. Belong\./);
  assert.doesNotMatch(t, /\binfant|\bconcept\b|\$\s?\d[\d,]*\s*(?:a|per) (?:hour|week|month)/i);
  assert.ok(fs.statSync(path.join(ROOT, 'llms-full.txt')).size > 20000);
});

test('404.html is a noindex page that works at any depth; the shell wires the prerender hand-off', () => {
  const h = read('404.html');
  assert.match(h, /<meta name="robots" content="noindex">/);
  assert.match(h, /<base href="\/[^"]*">/);
  const idx = read('index.html');
  assert.match(idx, /<main id="view" tabindex="-1" data-prerender>/);
  assert.match(idx, /#view\[data-prerender\]\{visibility:hidden\}/);
  assert.match(read('views.js'), /removeAttribute\('data-prerender'\)/);
  assert.match(idx, /<script src="entry\.js\?v=\d+"/);
});
