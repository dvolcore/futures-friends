/* Futures Friends Store: the shop pages. #store (home), #shop and #shop/<collection> (collection pages with filters and sort), #shop-programs (the centers'
   door, same pages) and #kids-shop (the families' small shop, same product cards, product pages and cart).
   Loaded after audiences.js and room-kit.js so it replaces the old store views; store.js keeps the corner guide and #store-request.
   Shared helpers go out on window.FFShopUI for store-product.js and store-order.js. Sends nothing by itself.
   Design: pop-up storybook. Product pictures sit on warm felt, all in the same frame; a second picture shows on hover. Room pictures are the owner's
   branded-room concepts and always carry the "Concept image" badge and the owner's caption. Nothing here invents a price, a date or a stock count. */
(function () {
'use strict';
if (typeof V === 'undefined' || !window.FFCatalog || !window.FFCart) return;
const W = window, C = W.FFCatalog, K = W.FFCart, E = K.E, ico = K.ico, imgTag = K.imgTag;
const PHONE = '(816) 988-5661';
const TONES = ['booker', 'lumi', 'zuri', 'bop'];
const tone = p => (TONES.includes(p.tone) ? p.tone : 'gold');
const rooms = () => K.rooms();
const lnk = (route, html, cls) => `<a class="${cls || ''}" href="#${route}" data-go="${route}">${html}</a>`;
const aud = () => { try { return W.FFAudience && W.FFAudience.get ? W.FFAudience.get() : ''; } catch (_) { return ''; } };

// ------------------------------------------------------------------ pieces shared with the other store files
// Breadcrumbs and the "Back to" chip come from wayfinding.js (it replaces any trail a page draws), so pages here draw none.
const crumbs = () => '';
const badgeHtml = (t, kind) => `<span class="sp-badge${kind ? ' sp-badge-' + kind : ''}">${E(t)}</span>`;
const chipsFor = (p, max) => p.badges.filter(b => b !== 'Concept image').slice(0, max || 3).map(b => badgeHtml(b, /safety/i.test(b) ? 'hold' : /Digital|Print/.test(b) ? 'soft' : '')).join('');
function priceBlock(p, opts) {
  const big = opts && opts.big;
  let main, sub = '';
  if (p.priceState === 'fixed') {
    main = `<span class="sp-price sp-num">${E(C.priceText(p, opts && opts.opts))}</span>`;
    if (p.membership) sub = 'startup package';
    else if (!C.canOrder(p)) sub = 'planned price';
  } else main = `<span class="sp-price sp-price-text">${E(C.priceText(p))}</span>`;
  return `<p class="sp-pricewrap${big ? ' is-big' : ''}">${main}${sub ? ` <span class="sp-pricesub">${sub}</span>` : ''}</p>`;
}
/* One product card. Same frame for every picture; a second picture on hover when there is one. */
function card(p, o) {
  o = o || {};
  const g = C.gallery(p, rooms()), a = g[0], b = g[1];
  const concept = a && a.kind === 'concept', sample = a && a.kind === 'sample';
  const href = 'product/' + p.id, t = tone(p);
  const cta = C.canOrder(p) ? '' : p.cta === 'notify' ? 'Notify me' : p.cta === 'link' ? 'Free to print' : '';
  return `<li class="sp-cardwrap"><article class="sp-card" style="--tone:var(--${t});--tone-s:var(--${t === 'gold' ? 'cream' : t + '-s'})" data-pid="${E(p.id)}">
    <a class="sp-media${a && a.tile ? ' is-tile' : ''}${sample ? ' is-sample' : ''}" href="#${href}" data-go="${href}" tabindex="-1" aria-hidden="true">
      ${a ? imgTag(a, { sizes: o.sizes || '(max-width:700px) 46vw, (max-width:1100px) 31vw, 280px', alt: '' }) : ''}
      ${b ? imgTag(b, { sizes: o.sizes || '(max-width:700px) 46vw, 280px', alt: '', cls: 'sp-img2' }) : ''}
      ${concept ? badgeHtml('Concept image', 'concept') : sample ? badgeHtml('Concept sample', 'concept') : (a && a.tile ? badgeHtml('Product photo coming', 'ph') : '')}
    </a>
    <div class="sp-card-body">
      <h3 class="sp-card-name">${lnk(href, E(p.name))}</h3>
      <p class="sp-card-short">${E(p.short)}</p>
      <div class="sp-card-chips">${chipsFor(p, 2)}</div>
      <div class="sp-card-foot">${priceBlock(p)}${cta ? `<span class="sp-card-cta">${E(cta)} ${ico('arrow')}</span>` : `<span class="sp-card-cta">View ${ico('arrow')}</span>`}</div>
    </div></article></li>`;
}
const caption = `<p class="sp-caption">Room pictures marked Concept image: ${E(C.CONCEPT_CAPTION)}</p>`;
const sampleCap = `<p class="sp-caption">Pictures marked Concept sample are AI-generated development images. ${E(C.SAMPLE_CAPTION)}</p>`;
const captionFor = list => { const k = new Set(list.map(p => (C.gallery(p, rooms())[0] || {}).kind)); return (k.has('concept') ? caption : '') + (k.has('sample') ? sampleCap : ''); };
const tradePills = `<ul class="sp-pills" aria-label="Collections">${C.COLLECTIONS.filter(c => c.id !== 'kids').map(c => `<li>${lnk('shop/' + c.id, E(c.name), 'sp-pill')}</li>`).join('')}<li>${lnk('kids-shop', 'Kids’ Shop', 'sp-pill')}</li></ul>`;

// ------------------------------------------------------------------ #store: the home of the shop
function collTile(c, i) {
  const n = C.inCollection(c.id).length + (c.id === 'plush' ? 4 : 0), href = c.id === 'kids' ? 'kids-shop' : 'shop/' + c.id;
  const sizes = i === 0 ? '(max-width:900px) 92vw, 560px' : '(max-width:900px) 46vw, 300px';
  let g = C.heroImage(c.id), badge = g ? badgeHtml('Concept sample', 'concept') : '', cls = '';
  if (!g) { g = c.room ? C.roomShot({ id: c.id, name: c.name, kind: 'kit', room: c.room }, rooms()) : null; badge = g ? badgeHtml('Concept image', 'concept') : ''; }
  if (!g && c.id === 'books') { g = C.fallbacks(C.product('book-booker-tries-again'), rooms())[0]; g = Object.assign({}, g, { fit: 'contain' }); cls = ' is-tile'; }
  if (!g) { g = C.gallery(C.product('plush-lumi'), rooms())[0]; badge = badgeHtml('Concept sample', 'concept'); cls = ' is-sample'; }
  const count = c.id === 'kids' ? C.kidsSections().reduce((t, x) => t + x[2].length, 0) : n;
  return `<li class="sp-tilewrap sp-tw-${c.id}"><a class="sp-tile" href="#${href}" data-go="${href}" style="--tone:var(--${c.tone});--tone-s:var(--${c.tone}-s)">
    <span class="sp-tile-media${cls}">${imgTag(g, { sizes, alt: '' })}${badge}</span>
    <span class="sp-tile-body"><span class="sp-tile-name">${E(c.name)}</span><span class="sp-tile-blurb">${E(c.blurb)}</span><span class="sp-tile-go">${count} ${count === 1 ? 'item' : 'items'} ${ico('arrow')}</span></span></a></li>`;
}
function trustStrip() {
  const ic = { ships: 'truck', time: 'clock', licence: 'shield', support: 'phone' };
  return `<section class="sp-trust" aria-label="How ordering works"><div class="wrap"><ul>${C.TRUST.map(t => `<li>${ico(ic[t[0]])}<div><h3>${E(t[1])}</h3><p>${E(t[2])}</p></div></li>`).join('')}</ul></div></section>`;
}
function featured() {
  const p = C.product('kit-center-starter'), g = C.gallery(p, rooms())[0];
  return `<section class="sp-feature" aria-labelledby="spFeatH"><div class="wrap sp-feature-grid">
    <figure class="sp-feature-fig">${imgTag(g, { sizes: '(max-width:820px) 92vw, 600px', alt: g.alt })}${badgeHtml('Concept image', 'concept')}<figcaption>${E(C.CONCEPT_CAPTION)}</figcaption></figure>
    <div class="sp-feature-copy"><h2 id="spFeatH">Start with the Center Starter Kit</h2>
      <p class="sp-feature-lede">A model room with an 8 ft Friends Circle rug, five zone signs, four posters and printed puppets, plus lighter starter sets for your next two classrooms.</p>
      ${priceBlock(p, { big: true })}<p class="sp-feature-sub">${E(C.MEMBER)}</p>
      <div class="sp-feature-acts"><button type="button" class="btn gold" data-sp-add="${p.id}">Add to cart</button>${lnk('product/' + p.id, 'See what is in the box ' + ico('arrow'), 'btn soft')}</div></div></div></section>`;
}
function bridge() {
  return `<section class="sp-bridge" aria-labelledby="spBridgeH"><div class="wrap sp-bridge-grid">
    <div class="sp-bridge-copy"><h2 id="spBridgeH">Measure the room, then order.</h2>
      <p>The Room Planner checks square feet per child, exits and sight lines for your space, then builds a parts list you can send us. It takes about ten minutes.</p>
      <div class="sp-feature-acts">${lnk('room-planner', 'Open the Room Planner ' + ico('arrow'), 'btn gold')}${lnk('room-kit', 'See the Learning Zones Kit', 'btn ghost sp-ghost')}</div></div>
    <figure class="sp-bridge-fig"><img src="img/room-kit/classroom-20x25.svg" alt="Floor plan of a 20 by 25 foot classroom with the five zones marked" width="640" height="500" loading="lazy" decoding="async"><figcaption>A 20 x 25 ft classroom, to scale.</figcaption></figure></div></section>`;
}
function know() {
  return `<section class="sp-know" aria-labelledby="spKnowH"><div class="wrap"><h2 id="spKnowH">Before you order</h2>
    <dl class="sp-knowlist">${C.LABELS.map(l => { const draft = /Draft/.test(l[2]); return `<div><dt>${E(l[1])}${draft ? ' <span class="sp-badge sp-badge-hold">Draft</span>' : ''}</dt><dd>${E(l[2])}</dd></div>`; }).join('')}</dl></div></section>`;
}
V.store = () => {
  const hero = C.roomShot({ id: 'hero', name: 'Learning Zones Kit', room: 'turtle-rug', kind: 'kit' }, rooms());
  return `<div class="sp sp-home">
  <section class="sp-hero"><div class="wrap sp-hero-grid">
    <div class="sp-hero-copy"><h1>The Futures Store</h1>
      <p class="sp-lede">Rugs, mats, fences, signs and posters for a room that runs on Booker, Lumi, Zuri and Bop. Made for centers, home daycares and churches.</p>
      <div class="sp-hero-acts">${lnk('shop/kits', 'Shop the kits ' + ico('arrow'), 'btn gold')}${lnk('room-planner', 'Plan your room', 'btn soft')}</div>
      <p class="sp-hero-note">Orders go in as requests while safety testing finishes and online payment opens. You see a written price and shipping cost, and approve it, before anything is charged.</p></div>
    <figure class="sp-hero-fig"><span class="sp-hero-stage"><span class="sp-hero-frame">${imgTag(hero, { eager: true, sizes: '(max-width:900px) 92vw, 620px', alt: hero.alt })}${badgeHtml('Concept image', 'concept')}</span>
      <img class="sp-hero-bop" src="img/plush/characters/bop-waving-480.webp" srcset="img/plush/characters/bop-waving-480.webp 480w, img/plush/characters/bop-waving-960.webp 960w" sizes="150px" alt="" width="480" height="480" loading="eager" decoding="async"></span>
      <figcaption>${E(C.CONCEPT_CAPTION)}</figcaption></figure>
  </div></section>
  ${trustStrip()}
  <section class="sp-collections" aria-labelledby="spCollH"><div class="wrap"><h2 id="spCollH">Shop by collection</h2>
    <ul class="sp-mosaic">${C.COLLECTIONS.map(collTile).join('')}</ul>${caption}${sampleCap}</div></section>
  ${featured()}
  ${bridge()}
  ${know()}
  <section class="sp-fam"><div class="wrap"><img src="img/plush/characters/lumi-waving-480.webp" alt="" width="480" height="480" loading="lazy" decoding="async"><p><b>Shopping for home?</b> The Kids’ Shop has a friend poster, a plush friend that opens after safety testing, and free printables.</p>${lnk('kids-shop', 'Visit the Kids’ Shop ' + ico('arrow'), 'btn soft')}</div></section>
  </div>`;
};

// ------------------------------------------------------------------ #shop / #shop/<collection>
const FS = { audience: '', age: '', zone: '', sort: 'featured' };
const opt = (list, cur, any) => `<option value="">${any}</option>` + list.map(o => `<option value="${o[0]}"${cur === o[0] ? ' selected' : ''}>${E(o[1])}</option>`).join('');
const SORTS = [['featured', 'Featured'], ['name', 'Name, A to Z'], ['price-asc', 'Price, low to high'], ['price-desc', 'Price, high to low']];
function results(colId) {
  const list = C.query(colId, FS, FS.sort), n = list.length, filtered = !!(FS.audience || FS.age || FS.zone);
  const grid = n ? `<ul class="sp-grid">${list.map(p => card(p)).join('')}</ul>${captionFor(list)}` : `<div class="sp-empty sp-empty-results">
    <img src="img/plush/characters/zuri-480.webp" alt="" width="480" height="480" loading="lazy" decoding="async"><h3>Nothing matches those filters</h3>
    <p>Try a different age band or zone, or clear the filters to see everything in this collection.</p><button type="button" class="btn gold" data-sp-clear>Clear filters</button></div>`;
  return `<p class="sp-count-line" role="status" aria-live="polite">${n} ${n === 1 ? 'item' : 'items'}${filtered ? ' match' : ''}</p>${grid}`;
}
function collectionPage(colId) {
  const c = colId === 'all' ? { id: 'all', name: 'All products', blurb: 'Everything in the Futures Store, from kits to books.', tone: 'booker' } : C.collection(colId);
  const parents = [['store', 'Futures Store']], hero = colId === 'all' ? null : C.heroImage(colId);
  return `<div class="sp sp-coll" data-col="${E(c.id)}">
   <header class="sp-pagehead"><div class="wrap${hero ? ' sp-headgrid' : ''}"><div>${crumbs(parents.concat([['', c.name]]))}<h1>${E(c.name)}</h1><p class="sp-lede">${E(c.blurb)}</p>${tradePills}</div>
     ${hero ? `<figure class="sp-headfig">${imgTag(hero, { eager: true, sizes: '(max-width:900px) 92vw, 520px', alt: c.name + ', concept samples' })}${badgeHtml('Concept sample', 'concept')}<figcaption>${E(C.SAMPLE_CAPTION)}</figcaption></figure>` : ''}</div></header>
   <div class="wrap sp-shell"><form class="sp-tools" role="search" aria-label="Filter and sort ${E(c.name)}" onsubmit="return false">
     <label class="sp-sel"><span>Who it is for</span><select data-sp-f="audience">${opt(C.AUDIENCES, FS.audience, 'Everyone')}</select></label>
     <label class="sp-sel"><span>Age band</span><select data-sp-f="age">${opt(C.AGES, FS.age, 'All ages')}</select></label>
     <label class="sp-sel"><span>Zone</span><select data-sp-f="zone">${opt(C.ZONES, FS.zone, 'All zones')}</select></label>
     <label class="sp-sel"><span>Sort</span><select data-sp-f="sort">${SORTS.map(s => `<option value="${s[0]}"${FS.sort === s[0] ? ' selected' : ''}>${s[1]}</option>`).join('')}</select></label>
     <button type="button" class="sp-link sp-clear" data-sp-clear${FS.audience || FS.age || FS.zone ? '' : ' hidden'}>Clear filters</button></form>
   <div id="spResults" data-col-id="${E(c.id)}">${results(c.id)}</div>${W.FFRelease && W.FFRelease.terms ? W.FFRelease.terms('store', [[c.name, 'merch-pod']], { compact: true }) : ''}</div>
   ${['kits', 'carpets', 'addons'].includes(c.id) ? `<section class="sp-help sp-help-kit"><div class="wrap"><p><b>Not sure what goes in a room?</b> See how the five zones fit together, or lay out your own room to scale.</p><div class="sp-help-acts">${lnk('room-kit', 'See the Learning Zones Kit', 'btn soft')}${lnk('room-planner', 'Plan your room', 'btn soft')}</div></div></section>` : ''}
   <section class="sp-help"><div class="wrap"><p><b>Need something that is not here?</b> Send us the list and we will price it.</p>${lnk('store-request', 'Request a quote', 'btn soft')}</div></section></div>`;
}
V.shop = () => { const id = typeof arg === 'string' && arg && (arg === 'all' || C.collection(arg)) ? arg : 'all'; if (id === 'kids') return V['kids-shop'](); return collectionPage(id); };
V['shop-programs'] = () => collectionPage('kits');

// ------------------------------------------------------------------ #kids-shop: the families' small shop (same cards, same product pages, same cart)
V['kids-shop'] = () => {
  const secs = C.kidsSections(), jump = [['tshirts', 'T-shirts'], ['hoodies', 'Hoodies'], ['backpacks', 'Backpacks'], ['plush', 'Plush'], ['posters', 'Posters'], ['carpets', 'Carpets'], ['squares', 'Corner carpets'], ['more', 'Free printables']];
  return `<div class="sp sp-kids">
   <header class="sp-pagehead sp-kidshead"><div class="wrap sp-kidsgrid"><div><h1>The Kids\u2019 Shop</h1>
     <p class="sp-lede">Shirts, hoodies and backpacks for every friend, plush friends, posters, carpets and printables that cost nothing. Add what you like to your cart and send a request; nothing is charged here.</p>
     <ul class="sp-pills sp-jump" aria-label="Jump to a section">${jump.map(j => `<li><a class="sp-pill" href="#kids-${j[0]}" data-sp-jump="kids-${j[0]}">${E(j[1])}</a></li>`).join('')}</ul></div>
     <img class="sp-kidsart" src="img/plush/characters/lumi-heart-hands-480.webp" srcset="img/plush/characters/lumi-heart-hands-480.webp 480w, img/plush/characters/lumi-heart-hands-960.webp 960w" sizes="220px" alt="Lumi the bunny, a story-world character, holding a heart" width="480" height="480" loading="eager" decoding="async"></div></header>
   <div class="wrap sp-shell" id="spResults">${secs.map(([name, col, list, id]) => `<section class="sp-kidsec" id="kids-${id}" tabindex="-1" aria-labelledby="spk-${id}"><div class="sp-kidsec-h"><h2 id="spk-${id}">${E(name)}</h2>${col ? lnk('shop/' + col, 'See the whole collection ' + ico('arrow'), 'sp-link') : ''}</div><ul class="sp-grid sp-grid-kids">${list.map(p => card(p)).join('')}</ul></section>`).join('')}
   ${W.FFRelease && W.FFRelease.terms ? W.FFRelease.terms('store', [['Kids\u2019 Shop items', 'merch-pod']], { compact: true }) : ''}${sampleCap}<p class="sp-note-line">Lumi is a story-world character. Plush cannot be ordered until its safety tests are done. Apparel, carpets and anything without a price go in as requests: we write back with price, sizes and timing.</p></div>
   <section class="sp-fam sp-fam-b"><div class="wrap"><p><b>Running a classroom?</b> Kits, rugs and signs for centers, home daycares and churches are in the Futures Store.</p>${lnk('store', 'Visit the store ' + ico('arrow'), 'btn soft')}</div></section></div>`;
};

// ------------------------------------------------------------------ events: filters, add to cart, notify
document.addEventListener('change', e => {
  const s = e.target && e.target.closest && e.target.closest('[data-sp-f]'); if (!s) return;
  FS[s.dataset.spF] = s.value; repaintResults();
});
function repaintResults() {
  const box = document.getElementById('spResults'); if (!box || !box.dataset.colId) return;
  box.innerHTML = results(box.dataset.colId);
  const clr = document.querySelector('.sp-clear'); if (clr) clr.hidden = !(FS.audience || FS.age || FS.zone);
}
document.addEventListener('click', e => {
  const t = e.target && e.target.closest ? e.target : null; if (!t) return;
  if (t.closest('[data-sp-clear]')) { e.preventDefault(); FS.audience = FS.age = FS.zone = ''; FS.sort = 'featured'; document.querySelectorAll('[data-sp-f]').forEach(s => { s.value = s.dataset.spF === 'sort' ? 'featured' : ''; }); repaintResults(); return; }
  const jp = t.closest('a[data-sp-jump^="kids-"]');
  if (jp) { e.preventDefault(); const el = document.getElementById(jp.dataset.spJump); if (el) { const rm = matchMedia('(prefers-reduced-motion: reduce)').matches; el.scrollIntoView({ behavior: rm ? 'auto' : 'smooth', block: 'start' }); el.focus({ preventScroll: true }); } return; }
  const add = t.closest('[data-sp-add]');
  if (add) { e.preventDefault(); const p = C.product(add.dataset.spAdd); if (p) K.addAnimated(p.id, p.options.length ? C.defaultOpts(p) : {}, 1, add); }
}, true);

// stop the loading shimmer once a picture has painted
const loaded = img => { const m = img.closest && img.closest('.sp-media,.sp-gal-zoom,.sp-tile-media'); if (m) m.classList.add('is-loaded'); };
document.addEventListener('load', e => { if (e.target && e.target.tagName === 'IMG' && e.target.classList.contains('sp-img')) loaded(e.target); }, true);
(W.FFhooks = W.FFhooks || []).push(() => document.querySelectorAll('.sp-img').forEach(i => { if (i.complete) loaded(i); }));

// images that arrive late (img/store/manifest.json) repaint the store pages once, if the visitor is not typing
const STORE_VIEWS = ['store', 'shop', 'shop-programs', 'kids-shop', 'product', 'cart'];
let manifestTried = false;
function loadManifest() {
  if (manifestTried || typeof fetch !== 'function') return; manifestTried = true;
  fetch('img/store/manifest.json', { cache: 'no-cache' }).then(r => (r.ok ? r.json() : null)).then(m => {
    if (!m || !m.products || !Object.keys(m.products).length) return;
    C.setManifest(m);
    const a = document.activeElement;
    if (STORE_VIEWS.includes(typeof view === 'string' ? view : '') && !(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) && !K.isOpen()) render();
  }).catch(() => { /* no real pictures yet: the concept images stay */ });
}
(W.FFhooks = W.FFhooks || []).push(v => { if (STORE_VIEWS.includes(v)) loadManifest(); });

W.FFShopUI = { card, crumbs, badgeHtml, chipsFor, priceBlock, caption, lnk, tone, rooms, aud, PHONE, repaintResults };
})();
