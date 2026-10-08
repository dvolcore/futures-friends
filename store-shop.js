/* Futures Friends Store: the shop pages. #store (home), #shop and #shop/<collection> (collection pages with a sticky rail and filter bar), #shop-programs (the centers'
   door, same pages) and #kids-shop (the families' shop: same cards, quick view, product pages and bag).
   Loaded after audiences.js and room-kit.js so it replaces the old store views; store.js keeps the corner guide and #store-request.
   Shared helpers go out on window.FFShopUI for store-product.js and store-order.js. Sends nothing by itself.

   Design (owner, 2026-10-07: "a high-tech store, not a landing page"): a full-bleed hero with a looping muted product video and a parallax collage; a sticky collection
   rail with picture chips; studio-tone product cards that swap to the back view on hover and open a quick view; a "Shop by friend" section built from the four single-shot
   dolls; an editorial band from the branded-room pictures. Motion is transform and opacity only and every bit of it stops under prefers-reduced-motion.
   Truth rules: no ratings, no reviews, no "sold" counts, no invented price, size, date or stock. One plain line says room pictures are design renderings; product pictures carry no label. */
(function () {
'use strict';
if (typeof V === 'undefined' || !window.FFCatalog || !window.FFCart) return;
const W = window, C = W.FFCatalog, K = W.FFCart, E = K.E, ico = K.ico, imgTag = K.imgTag;
const PHONE = '(816) 988-5661';
const TONES = ['booker', 'lumi', 'zuri', 'bop'];
const tone = p => (TONES.includes(p.tone) ? p.tone : 'gold');
const tint = t => (t === 'gold' ? 'cream' : t + '-s');
const rooms = () => K.rooms();
const lnk = (route, html, cls) => `<a class="${cls || ''}" href="#${route}" data-go="${route}">${html}</a>`;
const aud = () => { try { return W.FFAudience && W.FFAudience.get ? W.FFAudience.get() : ''; } catch (_) { return ''; } };
const reduced = () => { try { return W.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return false; } };
const NAME = { booker: 'Booker', lumi: 'Lumi', zuri: 'Zuri', bop: 'Bop', all: 'All four friends' };

// ------------------------------------------------------------------ pieces shared with the other store files
// Breadcrumbs and the "Back to" chip come from wayfinding.js (it replaces any trail a page draws), so pages here draw none. trail() tells it which side the visitor is on.
const crumbs = () => '';
const SECTION = { tshirt: ['tshirts', 'T-shirts'], hoodie: ['hoodies', 'Hoodies'], backpack: ['backpacks', 'Backpacks'] };
function trail(id, audience) {
  const p = C.product(id); if (!p) return [['home', 'Home']];
  const fam = C.isFamily(p) || (audience === 'families' && p.kind !== 'kit');
  const sec = p.apparelType && SECTION[p.apparelType] ? ['shop/' + SECTION[p.apparelType][0], SECTION[p.apparelType][1]] : ['shop/' + p.collection, (C.collection(p.collection) || {}).name || 'Shop'];
  if (fam && p.collection !== 'kids') return [['home', 'Home'], ['kids-shop', 'Kids’ Shop'], sec];
  if (fam) return [['home', 'Home'], ['kids-shop', 'Kids’ Shop']];
  return [['home', 'Home'], ['centers', 'For centers & programs'], ['store', 'Futures Store'], sec];
}
/* Which side of the site a product page belongs to: 'families' for every family product (apparel, backpacks, plush, stickers, drinkware, Kids' posters), '' for the rest (the visitor keeps their side). */
const audienceOf = id => { const p = C.product(id); return p && C.isFamily(p) ? 'families' : ''; };
const badgeHtml = (t, kind) => `<span class="sp-badge${kind ? ' sp-badge-' + kind : ''}">${E(t)}</span>`;
const badgeKind = b => (/^Official/.test(b) ? 'official' : /safety|Sizes/i.test(b) ? 'hold' : /Digital|Print/.test(b) ? 'soft' : '');
const chipsFor = (p, max) => p.badges.filter(b => !/^Concept/.test(b)).slice(0, max || 3).map(b => badgeHtml(b, badgeKind(b))).join('');
function priceBlock(p, opts) {
  const big = opts && opts.big;
  let main, sub = '';
  if (p.priceState === 'fixed') {
    main = `<span class="sp-price sp-num">${E(C.priceText(p, opts && opts.opts))}</span>`;
    if (p.membership) sub = 'startup package';
    else if (!C.canOrder(p)) sub = 'when it opens';
  } else main = `<span class="sp-price sp-price-text">${E(C.priceText(p))}</span>`;
  return `<p class="sp-pricewrap${big ? ' is-big' : ''}">${main}${sub ? ` <span class="sp-pricesub">${sub}</span>` : ''}</p>`;
}
/* One product card: a studio-tone frame, the back view on hover, a quick view button, the friend's color. */
function card(p, o) {
  o = o || {};
  const g = C.gallery(p, rooms()), a = g[0], b = g[1];
  const concept = a && a.kind === 'concept', sample = a && a.kind === 'sample';
  const href = 'product/' + p.id, t = tone(p), ch = C.charOf(p);
  const cta = C.canOrder(p) ? (p.priceState === 'fixed' ? 'Add to bag' : 'Request') : p.cta === 'notify' ? 'Notify me' : p.cta === 'link' ? 'Free to print' : 'View';
  return `<li class="sp-cardwrap" data-rv><article class="sp-card" style="--tone:var(--${t});--tone-s:var(--${tint(t)})" data-pid="${E(p.id)}">
    <div class="sp-mwrap"><a class="sp-media${a && a.tile ? ' is-tile' : ''}${sample ? ' is-sample' : ''}" href="#${href}" data-go="${href}" tabindex="-1" aria-hidden="true">
      ${a ? imgTag(a, { sizes: o.sizes || '(max-width:700px) 46vw, (max-width:1100px) 31vw, 300px', alt: a.alt || p.name }) : ''}
      ${b ? imgTag(b, { sizes: o.sizes || '(max-width:700px) 46vw, 300px', alt: '', cls: 'sp-img2' }) : ''}
      ${(!concept && !sample && a && a.tile) ? badgeHtml('Product photo coming', 'ph') : ''}
    </a>
    <button type="button" class="sp-qv" data-sp-qv="${E(p.id)}" aria-label="Quick view: ${E(p.name)}">${ico('eye')}<span>Quick view</span></button></div>
    <div class="sp-card-body">
      ${ch ? `<p class="sp-who"><i aria-hidden="true"></i>${E(NAME[ch])}</p>` : ''}
      <h3 class="sp-card-name">${lnk(href, E(p.name))}</h3>
      <p class="sp-card-short">${E(p.short)}</p>
      <div class="sp-card-chips">${chipsFor(p, 2)}</div>
      <div class="sp-card-foot">${priceBlock(p)}<span class="sp-card-cta">${E(cta)} ${ico('arrow')}</span></div>
    </div></article></li>`;
}
const caption = `<p class="sp-caption">Room pictures are design renderings of how the zones can look.</p>`;
const sampleCap = '';
const captionFor = list => { const k = new Set(list.map(p => (C.gallery(p, rooms())[0] || {}).kind)); return (k.has('concept') ? caption : '') + (k.has('sample') ? sampleCap : ''); };
const termsLine = (name) => (W.FFRelease && W.FFRelease.terms ? W.FFRelease.terms('store', [[name, 'merch-pod']], { compact: true }) : '');

// ------------------------------------------------------------------ the sticky collection rail (picture chips) and the search pill
const RAIL = {
  kits: ['Kits', null], carpets: ['Carpets', 'rug-friends-circle'], posters: ['Posters', 'poster-friends-circle-v1'], plush: ['Plush', 'plush-lumi'],
  tshirts: ['T-shirts', 'booker-tshirt'], hoodies: ['Hoodies', 'booker-hoodie'], apparel: ['Apparel', 'all-friends-hoodie'], backpacks: ['Backpacks', 'booker-replica-backpack'], stickers: ['Stickers', 'stickers-all-friends'], drinkware: ['Drinkware', 'bottle-zuri']
};
const RAIL_ORDER = { families: ['tshirts', 'hoodies', 'plush', 'backpacks', 'drinkware', 'stickers', 'carpets', 'posters'], centers: ['kits', 'carpets', 'posters', 'plush', 'apparel', 'backpacks', 'stickers', 'drinkware'] };
function railChip(id, active) {
  const [label, pid] = RAIL[id];
  let g = pid ? C.gallery(C.product(pid), rooms())[0] : C.roomShot({ id: 'rail', name: 'Kits', kind: 'kit', room: 'turtle-rug' }, rooms());
  return `<li><button type="button" class="sp-chip${active === id ? ' is-on' : ''}" data-go="shop/${id}"${active === id ? ' aria-current="page"' : ''}><span class="sp-chip-i${g && g.kind === 'sample' ? ' is-sample' : ''}">${g ? imgTag(g, { sizes: '44px', alt: '' }) : ''}</span><span>${label}</span></button></li>`;
}
function rail(active) {
  const side = aud() === 'families' ? 'families' : 'centers', ids = RAIL_ORDER[side];
  return `<nav class="sp-rail" aria-label="Shop collections" data-sp-rail><div class="wrap sp-rail-in"><ul class="sp-rail-list">${lnkAll(active)}${ids.map(i => railChip(i, active)).join('')}</ul>
    <button type="button" class="sp-rail-search" data-sp-search aria-label="Search the store">${ico('search')}<span>Search</span></button></div></nav>`;
}
const lnkAll = active => `<li><button type="button" class="sp-chip sp-chip-all${active === 'all' ? ' is-on' : ''}" data-go="shop/all"${active === 'all' ? ' aria-current="page"' : ''}><span class="sp-chip-i sp-chip-grid">${ico('grid')}</span><span>All</span></button></li>`;

// ------------------------------------------------------------------ hero: full-bleed, a muted looping product video, a parallax collage
const VIDEO = { centers: ['video/store/centers-preview.mp4', 'video/store/centers-preview-poster.webp', 'Product motion preview: the Friends Circle carpet and zone posters in a classroom'],
  families: ['video/store/families-preview.mp4', 'video/store/families-preview-poster.webp', 'Product motion preview: a reading corner with the friends’ carpet'] };
/* The shop hero (owner, 2026-10-08: "this doesn't say shop now for a store to me ... way more slick, way more polished, and I don't think pink is a shop color").
   Deep navy with the brand's gold CTA, product-first: big product pictures on studio tiles, a short headline, one line, "Shop now" and a quiet second link, then a slim honest trust strip.
   Research: scratchpad/store-hero-research.md. Motion is a soft float and a little parallax on the pictures, transform only, and none of it runs under reduced motion. */
const HERO = {
  families: { eyebrow: 'The Kids’ Shop', h1: 'Gear up like <em>Booker.</em>', lede: 'Booker’s own backpack, hoodies and tees for every friend, and plush on the way.',
    tiles: [['plush-booker', 't1', 'Booker · opening soon'], ['plush-lumi', 't2', 'Lumi · opening soon'], ['plush-zuri', 't3', 'Zuri · opening soon'], ['plush-bop', 't4', 'Bop · opening soon'], ['booker-replica-backpack', 't5', 'Official · Worn by Booker']],
    shop: ['scroll', 'spResults'], second: ['scroll', 'spFriends', 'Shop by friend'],
    trust: [['clock', 'Made to order. Nothing is charged until you say yes.'], ['shield', 'Prices and sizes are confirmed in writing first.'], ['phone', 'A real person writes back: ' + PHONE]] },
  centers: { eyebrow: 'The Futures Store', h1: 'Shop the <em>room.</em>', lede: 'Learning Zones kits, friend carpets, posters and plush, made to order for centers, home daycares and churches.',
    tiles: [['rug-friends-circle', 't1', 'The Friends Circle carpet'], ['poster-booker-reading-area-v1', 't2', ''], ['collection-carpets', 't3', 'Carpets for every zone']],
    shop: ['go', 'shop/kits'], second: ['go', 'room-planner', 'Plan your room'],
    trust: [['clock', 'Made to order. Nothing is charged until you say yes.'], ['shield', 'Purchase orders and tax-exempt certificates welcome.'], ['phone', 'A real person writes back: ' + PHONE]] }
};
function heroTile(id, cls, note) {
  let p = C.product(id), g, href, name;
  if (p) { g = C.gallery(p, rooms())[0]; href = 'product/' + id; name = p.name; }
  else { g = C.heroImage(id.replace('collection-', '')); href = 'shop/' + id.replace('collection-', ''); name = (C.collection(id.replace('collection-', '')) || {}).name || ''; }
  if (!g) return '';
  const d = { t1: [-16, 34, '-2deg'], t2: [-30, 18, '-6deg'], t3: [22, 26, '4deg'], t4: [28, 50, '-3deg'], t5: [34, 58, '5deg'] }[cls] || [0, 0, '0deg'];
  return `<a class="h3-tile h3-${cls}" href="#${href}" data-go="${href}" aria-label="${E(name)}${note ? ', ' + E(note) : ''}" style="--d:${d[0]};--s:${d[1]};--r:${d[2]}"><span class="h3-float"><span class="h3-pic">${imgTag(g, { sizes: cls === 't1' ? '(max-width:760px) 46vw, 340px' : '(max-width:760px) 30vw, 220px', alt: '', eager: true })}</span></span>
    <span class="h3-cap"><b>${E(name)}</b>${note ? `<small>${E(note)}</small>` : ''}</span></a>`;
}
function heroHtml(side, opt) {
  opt = opt || {};
  const h = HERO[side === 'families' ? 'families' : 'centers'], fam = side === 'families';
  const act = (spec, label, cls) => spec[0] === 'scroll' ? `<a class="${cls}" href="#${spec[1]}" data-sp-scroll="${spec[1]}">${label}</a>` : lnk(spec[1], label, cls);
  return `<section class="h3 h3-${fam ? 'families' : 'centers'}${opt.compact ? ' is-compact' : ''}" data-h3 aria-labelledby="spH1"><div class="h3-bg" aria-hidden="true"></div>
    <div class="wrap h3-grid"><div class="h3-copy">
      <p class="h3-eyebrow"><span class="h3-dots" aria-hidden="true"><i></i><i></i><i></i><i></i></span>${E(h.eyebrow)}</p>
      <h1 id="spH1">${opt.title ? E(opt.title) : h.h1}</h1>
      <p class="h3-lede">${E(opt.lede || h.lede)}</p>
      <div class="h3-acts">${act(h.shop, 'Shop now ' + ico('arrow'), 'btn gold sp-btn-lg h3-shop')}${act(h.second, E(h.second[2]), 'btn sp-btn-lg sp-btn-glass h3-second')}</div></div>
    <div class="h3-stage">${h.tiles.map(t => heroTile(t[0], t[1], t[2])).join('')}</div></div></section>
  <section class="h3-trust" aria-label="Our ordering promise"><div class="wrap"><ul>${h.trust.map(t => `<li>${ico(t[0])}<span>${E(t[1])}</span></li>`).join('')}</ul></div></section>`;
}
function trustStrip() {
  const ic = { ships: 'truck', time: 'clock', licence: 'shield', support: 'phone' };
  return `<section class="sp-trust" aria-label="How ordering works"><div class="wrap"><ul>${C.TRUST.map(t => `<li data-rv>${ico(ic[t[0]])}<div><h3>${E(t[1])}</h3><p>${E(t[2])}</p></div></li>`).join('')}</ul></div></section>`;
}

// ------------------------------------------------------------------ shop by friend: the four single-shot dolls
function friends() {
  return `<section class="sp-friends" id="spFriends" tabindex="-1" aria-labelledby="spFriendsH"><div class="wrap"><div class="sp-sec-h"><h2 id="spFriendsH">Shop by friend</h2><p>Pick a friend and see everything they are on.</p></div>
    <ul class="sp-friend-grid">${['booker', 'lumi', 'zuri', 'bop'].map(k => { const g = C.gallery(C.product('plush-' + k), rooms())[0], n = C.query('friend-' + k).length;
      return `<li data-rv><a class="sp-friend" href="#shop/friend-${k}" data-go="shop/friend-${k}" style="--tone:var(--${k});--tone-s:var(--${k}-s)"><span class="sp-friend-img">${g ? imgTag(g, { sizes: '(max-width:700px) 46vw, 260px', alt: '' }) : ''}</span>
        <span class="sp-friend-t"><b>${NAME[k]}</b><span>${n} things</span></span><span class="sp-friend-go">${ico('arrow')}</span></a></li>`; }).join('')}</ul>${sampleCap}</div></section>`;
}
// ------------------------------------------------------------------ a horizontal product row ("See all")
function row(title, sub, href, list, id) {
  return `<section class="sp-rowsec" aria-labelledby="${id}"><div class="wrap"><div class="sp-sec-h"><div><h2 id="${id}">${E(title)}</h2>${sub ? `<p>${E(sub)}</p>` : ''}</div>${lnk(href, 'See all ' + ico('arrow'), 'sp-link sp-seeall')}</div></div>
    <ul class="sp-row" tabindex="0" aria-label="${E(title)}, swipe for more">${list.map(p => card(p, { sizes: '(max-width:700px) 62vw, 300px' })).join('')}</ul></section>`;
}
function editorial(side) {
  const g = C.roomShot({ id: 'band', name: 'Learning Zones Kit', kind: 'kit', room: side === 'families' ? 'alphabet-rug' : 'turtle-rug' }, rooms());
  return `<section class="sp-edit" aria-labelledby="spEditH"><div class="sp-edit-img">${imgTag(g, { sizes: '100vw', alt: g.alt })}</div><div class="sp-edit-shade" aria-hidden="true"></div>
    <div class="wrap sp-edit-in"><div class="sp-edit-copy" data-rv><h2 id="spEditH">${side === 'families' ? 'Make a corner of home theirs.' : 'Five zones. One room that explains itself.'}</h2>
      <p>${side === 'families' ? 'A carpet for the reading nook, a poster above it, and a plush friend waiting in the middle.' : 'A rug marks each friend’s corner, a low fence keeps every child in sight, and the signs say where to go.'}</p>
      <div class="sp-hero2-acts">${side === 'families' ? lnk('shop/carpets', 'Shop carpets ' + ico('arrow'), 'btn gold') : lnk('shop/kits', 'Shop the kits ' + ico('arrow'), 'btn gold')}${side === 'families' ? '' : lnk('room-kit', 'See the Learning Zones Kit', 'btn sp-btn-glass')}</div></div>
    <p class="sp-edit-cap">${E(C.CONCEPT_CAPTION)}</p></div></section>`;
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
const wrapPage = (side, inner) => `<div class="sp sp-pro sp-side-${side}">${inner}</div>`;

// ------------------------------------------------------------------ #store: the centers' shop
V.store = () => wrapPage('centers', `${heroHtml('centers')}${rail('')}
  ${friends()}
  ${row('Learning Zones Kits', 'The room, set up. Three sizes, from one home room to a four-room center.', 'shop/kits', C.query('kits'), 'spRowKits')}
  ${row('Carpets and corner rugs', 'A rug for each friend’s zone, and large square corner rugs for a furnished corner.', 'shop/carpets', C.query('carpets').filter(p => p.kind === 'carpet').slice(0, 10), 'spRowRugs')}
  ${editorial('centers')}
  ${row('Plush friends', 'Opening soon. Leave your email on a plush page and we will tell you the day it opens.', 'shop/plush', C.query('plush'), 'spRowPlush')}
  ${row('Apparel and backpacks', 'For the people in the room. Sizes and prices are still being set.', 'shop/apparel', C.query('apparel').filter(p => p.apparelType !== 'tshirt' || p.who === 'all-friends').slice(0, 10), 'spRowApp')}
  ${row('Stickers and coloring', 'Sticker sheets and coloring books for each friend, plus universe packs with all 22 friends. Price coming soon.', 'shop/stickers', C.query('stickers'), 'spRowStickers')}
  ${row('Drinkware and mealtime', 'Insulated character bottles and the Eat the Rainbow plate.', 'shop/drinkware', C.query('drinkware'), 'spRowDrink')}
  ${row('Posters', 'Each friend and the Friends Circle, in two designs. $16 a poster.', 'shop/posters', C.query('posters').filter(p => /-v1$/.test(p.id)), 'spRowPosters')}
  <div class="wrap">${caption}${sampleCap}${termsLine('Futures Store items')}</div>
  ${trustStrip()}${bridge()}${know()}
  <section class="sp-fam"><div class="wrap"><img src="img/plush/characters/lumi-waving-480.webp" alt="" width="480" height="480" loading="lazy" decoding="async"><p><b>Shopping for home?</b> The Kids’ Shop has shirts, hoodies and backpacks, plush friends, carpets, posters and free activity pages.</p>${lnk('kids-shop', 'Visit the Kids’ Shop ' + ico('arrow'), 'btn soft')}</div></section>`);

// ------------------------------------------------------------------ collection pages: sticky rail, then the filter bar, then the grid
const FS = { character: '', category: '', price: '', age: '', sort: 'featured' };
let lastCol = '';
const opt = (list, cur, any) => `<option value="">${any}</option>` + list.map(o => `<option value="${o[0]}"${cur === o[0] ? ' selected' : ''}>${E(o[1])}</option>`).join('');
const SORTS = [['featured', 'Featured'], ['name', 'Name, A to Z'], ['price-asc', 'Price, low to high'], ['price-desc', 'Price, high to low']];
const filtered = () => !!(FS.character || FS.category || FS.price || FS.age);
function results(colId) {
  const list = C.query(colId, FS, FS.sort), n = list.length;
  const grid = n ? `<ul class="sp-grid">${list.map(p => card(p)).join('')}</ul>${captionFor(list)}` : `<div class="sp-empty sp-empty-results">
    <img src="img/plush/characters/zuri-480.webp" alt="" width="480" height="480" loading="lazy" decoding="async"><h3>Nothing matches those filters</h3>
    <p>Try another friend or age band, or clear the filters to see everything here.</p><button type="button" class="btn gold" data-sp-clear>Clear filters</button></div>`;
  return `<p class="sp-count-line" role="status" aria-live="polite">${n} ${n === 1 ? 'item' : 'items'}${filtered() ? ' match' : ''}</p>${grid}`;
}
function filterBar(c) {
  const real = !!C.collection(c.id) && c.id !== 'all';
  return `<form class="sp-bar" role="search" aria-label="Filter and sort ${E(c.name)}" onsubmit="return false"><div class="wrap sp-bar-in">
    <label class="sp-sel"><span>Friend</span><select data-sp-f="character">${opt(C.CHARS, FS.character, 'Any friend')}</select></label>
    ${real || c.friend ? '' : `<label class="sp-sel"><span>Category</span><select data-sp-f="category">${opt(C.COLLECTIONS.map(x => [x.id, x.name]), FS.category, 'Everything')}</select></label>`}
    <label class="sp-sel"><span>Price</span><select data-sp-f="price">${opt([['priced', 'Has a price'], ['ask', 'Request a quote or coming soon']], FS.price, 'Any')}</select></label>
    <label class="sp-sel"><span>Age</span><select data-sp-f="age">${opt(C.AGES, FS.age, 'All ages')}</select></label>
    <label class="sp-sel"><span>Sort</span><select data-sp-f="sort">${SORTS.map(s => `<option value="${s[0]}"${FS.sort === s[0] ? ' selected' : ''}>${s[1]}</option>`).join('')}</select></label>
    <button type="button" class="sp-link sp-clear" data-sp-clear${filtered() ? '' : ' hidden'}>Clear filters</button></div></form>`;
}
function collectionPage(colId) {
  if (lastCol !== colId) { FS.character = FS.category = FS.price = FS.age = ''; FS.sort = 'featured'; lastCol = colId; }
  const c = colId === 'all' ? { id: 'all', name: 'All products', blurb: 'Everything in the Futures Store, from kits to books.', tone: 'booker' } : C.anyCollection(colId);
  const hero = colId === 'all' ? null : C.heroImage(c.of || colId), side = aud() === 'families' ? 'families' : 'centers', t = TONES.includes(c.tone) ? c.tone : 'booker';
  const head = colId === 'all' ? heroHtml(side, { compact: true, title: c.name, lede: c.blurb }) : `<header class="sp-pagehead sp-collhead"><div class="wrap${hero ? ' sp-headgrid' : ''}"><div><h1>${E(c.name)}</h1><p class="sp-lede">${E(c.blurb)}</p></div>
     ${hero ? `<figure class="sp-headfig">${imgTag(hero, { eager: true, sizes: '(max-width:900px) 92vw, 520px', alt: c.name })}</figure>` : ''}</div></header>`;
  const railOn = RAIL[colId] ? colId : (c.of && RAIL[c.of] ? (RAIL[c.id] ? c.id : c.of) : '');
  const sub = C.virtual(colId) && !c.friend ? null : null;
  return `<div class="sp sp-pro sp-coll sp-side-${side}" data-col="${E(c.id)}" style="--tone:var(--${t});--tone-s:var(--${t}-s)">
   ${head}
   ${rail(railOn)}${filterBar(c)}
   <div class="wrap sp-shell"><div id="spResults" data-col-id="${E(c.id)}">${results(c.id)}</div>${termsLine(c.name)}</div>
   ${['kits', 'carpets', 'addons'].includes(c.id) ? `<section class="sp-help sp-help-kit"><div class="wrap"><p><b>Not sure what goes in a room?</b> See how the five zones fit together, or lay out your own room to scale.</p><div class="sp-help-acts">${lnk('room-kit', 'See the Learning Zones Kit', 'btn soft')}${lnk('room-planner', 'Plan your room', 'btn soft')}</div></div></section>` : ''}
   <section class="sp-help"><div class="wrap"><p><b>Need something that is not here?</b> Send us the list and we will price it.</p>${lnk('store-request', 'Request a quote', 'btn soft')}</div></section></div>`;
}
V.shop = () => { const id = typeof arg === 'string' && arg && (arg === 'all' || C.anyCollection(arg)) ? arg : 'all'; if (id === 'kids') return V['kids-shop'](); return collectionPage(id); };
V['shop-programs'] = () => collectionPage('kits');

// ------------------------------------------------------------------ #kids-shop: the families' shop
V['kids-shop'] = () => {
  const secs = C.kidsSections(), jump = [['tshirts', 'T-shirts'], ['hoodies', 'Hoodies'], ['plush', 'Plush dolls'], ['backpacks', 'Backpacks'], ['drinkware', 'Bottles & plates'], ['stickers', 'Stickers & coloring'], ['carpets', 'Carpets'], ['posters', 'Posters'], ['more', 'Free activity pages']];
  return wrapPage('families', `${heroHtml('families')}${rail('')}${friends()}
   <div class="wrap sp-shell sp-kidsbody" id="spResults"><ul class="sp-pills sp-jump" aria-label="Jump to a section">${jump.map(j => `<li><a class="sp-pill" href="#kids-${j[0]}" data-anchor="kids-${j[0]}" data-sp-jump="kids-${j[0]}">${E(j[1])}</a></li>`).join('')}</ul>
   ${secs.map(([name, col, list, id]) => `<section class="sp-kidsec" id="kids-${id}" tabindex="-1" aria-labelledby="spk-${id}"><div class="sp-kidsec-h"><h2 id="spk-${id}">${E(name)}</h2>${col ? lnk('shop/' + (id === 'tshirts' || id === 'hoodies' || id === 'backpacks' ? id : col), 'See all ' + ico('arrow'), 'sp-link') : ''}</div><ul class="sp-grid sp-grid-kids">${list.map(p => card(p)).join('')}</ul></section>`).join('')}
   ${termsLine('Kids’ Shop items')}${sampleCap}<p class="sp-note-line">Lumi is a story-world character. Plush is opening soon: leave your email on a plush page. Apparel, carpets and anything without a price go in as requests: we write back with price, sizes and timing.</p></div>
   ${editorial('families')}
   <section class="sp-fam sp-fam-b"><div class="wrap"><p><b>Running a classroom?</b> Kits, rugs and signs for centers, home daycares and churches are in the Futures Store.</p>${lnk('store', 'Visit the store ' + ico('arrow'), 'btn soft')}</div></section>`);
};

// ------------------------------------------------------------------ quick view: gallery, size picker, quantity, add to bag, without leaving the grid
let QV = { pid: '', opts: {}, qty: 1, i: 0 }, qvDlg = null;
function qvOpts(p) {
  return p.options.map(o => `<fieldset class="sp-opt"><legend>${E(o.label)}</legend><div class="sp-opt-row${o.values.length > 6 ? ' is-sizes' : ''}">${o.values.map(v => `<label class="sp-radio"><input type="radio" name="qv-${E(o.key)}" value="${E(v.id)}" data-sp-qvopt="${E(o.key)}"${QV.opts[o.key] === v.id ? ' checked' : ''}><span>${E(v.label)}${typeof v.price === 'number' ? `<small class="sp-num">${C.fmt(v.price)}</small>` : ''}</span></label>`).join('')}</div></fieldset>`).join('');
}
function qvBody(p) {
  const g = C.gallery(p, rooms()), x = g[QV.i] || g[0], t = tone(p);
  const buy = C.canOrder(p) ? `<div class="sp-buyrow"><div class="sp-step sp-step-lg" role="group" aria-label="Quantity"><button type="button" data-sp-qvq="-1" aria-label="Fewer"${QV.qty <= 1 ? ' disabled' : ''}>${ico('minus')}</button><output aria-live="polite">${QV.qty}</output><button type="button" data-sp-qvq="1" aria-label="More">${ico('plus')}</button></div>
      <button type="button" class="btn gold sp-addbtn" data-sp-qvadd>${p.priceState === 'fixed' ? 'Add to bag' : p.priceState === 'soon' ? 'Add to bag as a request' : 'Add to bag for a quote'}</button></div>`
    : `<div class="sp-buyrow">${lnk('product/' + p.id, (p.cta === 'link' ? 'Open the activity pages' : 'Tell me when it opens') + ' ' + ico('arrow'), 'btn gold sp-addbtn')}</div><p class="sp-buyhint">${p.kind === 'plush' ? 'Plush cannot be ordered until its safety tests are done.' : 'It cannot be ordered yet.'}</p>`;
  return `<div class="sp-qv-grid" style="--tone:var(--${t});--tone-s:var(--${tint(t)})"><div class="sp-qv-media"><div class="sp-qv-main${x && x.kind === 'sample' ? ' is-sample' : ''}">${x ? imgTag(x, { sizes: '(max-width:760px) 90vw, 460px', alt: x.alt, eager: true }) : ''}</div>
      ${g.length > 1 ? `<ul class="sp-gal-thumbs" aria-label="Choose a picture">${g.map((y, i) => `<li><button type="button" data-sp-qvth="${i}" aria-label="Show picture ${i + 1}"${i === QV.i ? ' aria-current="true"' : ''}>${imgTag(y, { sizes: '64px', alt: '' })}</button></li>`).join('')}</ul>` : ''}${W.FFFun ? W.FFFun.spin(p, 'qv') : ''}</div>
    <div class="sp-qv-info"><h2 id="spQvH">${E(p.name)}</h2><div data-sp-qvprice>${priceBlock(p, { big: true, opts: QV.opts })}</div><p class="sp-info-lede">${E(p.short)}</p>
      <div class="sp-info-badges">${p.badges.filter(b => !/^Concept/.test(b)).map(b => badgeHtml(b, badgeKind(b))).join('')}</div>
      <div class="sp-buy">${qvOpts(p)}${buy}</div>${p.kind === 'plush' || p.id.indexOf('rug') === 0 ? `<p class="sp-buyhint">${p.kind === 'plush' ? 'Opening soon: leave your email and we will tell you the day it opens.' : 'Made to order. We confirm size and ship date by email.'}</p>` : ''}
      <p class="sp-qv-more">${lnk('product/' + p.id, 'See full details ' + ico('arrow'), 'sp-link')}</p></div></div>`;
}
function openQV(pid, from) {
  const p = C.product(pid); if (!p || typeof HTMLDialogElement === 'undefined') { if (p && typeof go === 'function') go('product', pid); return; }
  QV = { pid, opts: C.defaultOpts(p), qty: 1, i: 0 };
  if (!qvDlg) {
    qvDlg = document.createElement('dialog'); qvDlg.className = 'sp-qvdlg'; qvDlg.setAttribute('aria-labelledby', 'spQvH');
    qvDlg.innerHTML = `<button type="button" class="sp-x sp-qv-x" data-sp-qvclose aria-label="Close quick view">${ico('x')}</button><div data-sp-qvbody></div>`;
    document.body.appendChild(qvDlg);
    qvDlg.addEventListener('click', e => { if (e.target === qvDlg) qvDlg.close(); });
    qvDlg.addEventListener('close', () => { document.documentElement.classList.remove('sp-lock'); const f = qvDlg._from; if (f && document.contains(f) && f.getClientRects().length) f.focus({ preventScroll: true }); });
  }
  qvDlg._from = from; qvDlg.querySelector('[data-sp-qvbody]').innerHTML = qvBody(p);
  document.documentElement.classList.add('sp-lock'); qvDlg.showModal();
}
const qvRepaint = () => { const p = C.product(QV.pid); if (!p || !qvDlg) return; const ae = document.activeElement, key = ae && ae.getAttribute && (ae.getAttribute('data-sp-qvth') !== null ? '[data-sp-qvth="' + ae.getAttribute('data-sp-qvth') + '"]' : ae.getAttribute('data-sp-qvq') !== null ? '[data-sp-qvq="' + ae.getAttribute('data-sp-qvq') + '"]' : ''); qvDlg.querySelector('[data-sp-qvbody]').innerHTML = qvBody(p); if (key) { const n = qvDlg.querySelector(key + ':not([disabled])'); if (n) n.focus({ preventScroll: true }); } };

// ------------------------------------------------------------------ events: filters, quick view, add to bag, hero video, search
document.addEventListener('change', e => {
  const s = e.target && e.target.closest && e.target.closest('[data-sp-f]');
  if (s) { FS[s.dataset.spF] = s.value; repaintResults(); return; }
  const o = e.target && e.target.closest && e.target.closest('[data-sp-qvopt]');
  if (o) { QV.opts[o.dataset.spQvopt] = o.value; const p = C.product(QV.pid), pw = qvDlg.querySelector('[data-sp-qvprice]'); if (pw) pw.innerHTML = priceBlock(p, { big: true, opts: QV.opts }); }
});
function repaintResults() {
  const box = document.getElementById('spResults'); if (!box || !box.dataset.colId) return;
  box.innerHTML = results(box.dataset.colId); markReveal(box);
  const clr = document.querySelector('.sp-clear'); if (clr) clr.hidden = !filtered();
}
document.addEventListener('click', e => {
  const t = e.target && e.target.closest ? e.target : null; if (!t) return;
  if (t.closest('[data-sp-clear]')) { e.preventDefault(); FS.character = FS.category = FS.price = FS.age = ''; FS.sort = 'featured'; document.querySelectorAll('[data-sp-f]').forEach(s => { s.value = s.dataset.spF === 'sort' ? 'featured' : ''; }); repaintResults(); return; }
  const qv = t.closest('[data-sp-qv]'); if (qv) { e.preventDefault(); e.stopPropagation(); openQV(qv.dataset.spQv, qv); return; }
  if (qvDlg && qvDlg.open) {
    if (t.closest('[data-sp-qvclose]')) { qvDlg.close(); return; }
    const th = t.closest('[data-sp-qvth]'); if (th) { QV.i = +th.dataset.spQvth; qvRepaint(); return; }
    const q = t.closest('[data-sp-qvq]'); if (q) { QV.qty = Math.max(1, Math.min(K.MAXQ, QV.qty + (+q.dataset.spQvq))); qvRepaint(); return; }
    const ad = t.closest('[data-sp-qvadd]');
    if (ad) { e.preventDefault(); const p = C.product(QV.pid), from = qvDlg._from && qvDlg._from.closest('.sp-card') || qvDlg._from; qvDlg._from = null; const o = { pid: QV.pid, opts: Object.assign({}, QV.opts), qty: QV.qty }; qvDlg.close(); K.addAnimated(o.pid, o.opts, o.qty, from && from.getClientRects().length ? from : document.getElementById('spCartBtn')); return; }
    if (t.closest('a[data-go]')) { qvDlg._from = null; qvDlg.close(); return; }
  }
  const sc = t.closest('a[data-sp-scroll]');
  if (sc) { e.preventDefault(); const el = document.getElementById(sc.dataset.spScroll); if (el) { el.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' }); el.focus({ preventScroll: true }); } return; }
  const jp = t.closest('a[data-sp-jump^="kids-"]');
  if (jp) { e.preventDefault(); const el = document.getElementById(jp.dataset.spJump); if (el) { el.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' }); el.focus({ preventScroll: true }); } return; }
  const add = t.closest('[data-sp-add]');
  if (add) { e.preventDefault(); const p = C.product(add.dataset.spAdd); if (p) K.addAnimated(p.id, p.options.length ? C.defaultOpts(p) : {}, 1, add); return; }
  if (t.closest('[data-sp-search]')) { e.preventDefault(); try { W.FFWay.palette.open(t.closest('[data-sp-search]')); } catch (_) { /* no palette */ } return; }
  const vb = t.closest('[data-sp-vidbtn]');
  if (vb) { const v = vb.closest('[data-sp-vidwrap]').querySelector('video'); if (v.paused) { v.play().catch(() => {}); vb.setAttribute('aria-pressed', 'false'); vb.setAttribute('aria-label', 'Pause the preview video'); vb.innerHTML = ico('pause'); } else { v.pause(); vb.setAttribute('aria-pressed', 'true'); vb.setAttribute('aria-label', 'Play the preview video'); vb.innerHTML = ico('play'); } }
}, true);
if (W.addEventListener) W.addEventListener('hashchange', () => { if (qvDlg && qvDlg.open) { qvDlg._from = null; qvDlg.close(); } });

// stop the loading shimmer once a picture has painted
const loaded = img => { img.classList.add('is-ready'); const m = img.closest && img.closest('.sp-media,.sp-gal-zoom,.sp-tile-media,.sp-friend-img,.sp-chip-i'); if (m) m.classList.add('is-loaded'); };
document.addEventListener('load', e => { if (e.target && e.target.tagName === 'IMG' && e.target.classList.contains('sp-img')) loaded(e.target); }, true);

// scroll-reveal: only for things below the fold, and never under reduced motion
let io = null;
function markReveal(root) {
  if (reduced() || typeof IntersectionObserver !== 'function') return;
  const els = [...(root || document).querySelectorAll('[data-rv]:not(.is-in)')]; if (!els.length) return;
  if (!io) io = new IntersectionObserver(en => en.forEach(x => { if (x.isIntersecting) { x.target.classList.add('is-in'); io.unobserve(x.target); } }), { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
  setTimeout(() => els.forEach(el => el.classList.add('is-in')), 5000);   // safety: nothing stays hidden
  els.forEach(el => { const r = el.getBoundingClientRect(); if (r.top < innerHeight * 0.96) el.classList.add('is-in'); else { el.classList.add('is-pre'); io.observe(el); } });
}
// hero: a little parallax on the product tiles (pointer and scroll), the soft float is CSS. Nothing runs under reduced motion or with the site's decorative motion switched off.
let hscroll = null, rafId = 0, srafId = 0;
const motionOk = () => !reduced() && !(W.FFMotion && W.FFMotion.allowed && !W.FFMotion.allowed());
function heroInit() {
  if (hscroll) { removeEventListener('scroll', hscroll); hscroll = null; }
  const hero = document.querySelector('[data-h3]'); if (!hero) return;
  hero.classList.toggle('is-live', motionOk()); if (!motionOk()) return;
  if (matchMedia('(hover:hover) and (pointer:fine)').matches) hero.onpointermove = e => { if (rafId) return; rafId = requestAnimationFrame(() => { rafId = 0; const r = hero.getBoundingClientRect(); hero.style.setProperty('--px', ((e.clientX - r.left) / r.width - 0.5).toFixed(3)); hero.style.setProperty('--py', ((e.clientY - r.top) / r.height - 0.5).toFixed(3)); }); };
  hscroll = () => { if (srafId) return; srafId = requestAnimationFrame(() => { srafId = 0; const r = hero.getBoundingClientRect(); hero.style.setProperty('--sy', Math.max(0, Math.min(1, (innerHeight - r.top) / (innerHeight + r.height))).toFixed(3)); }); };
  addEventListener('scroll', hscroll, { passive: true }); hscroll();
}
// the sticky rail keeps the active chip in view
function railInit() { const on = document.querySelector('.sp-rail .is-on'); if (on && on.scrollIntoView) { const list = on.closest('.sp-rail-list'); if (list) list.scrollLeft = Math.max(0, on.offsetLeft - 24); } }

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
(W.FFhooks = W.FFhooks || []).push(v => {
  document.querySelectorAll('.sp-qvdlg[open]').forEach(d => d.close());
  if (STORE_VIEWS.includes(v)) { loadManifest(); markReveal(); heroInit(); railInit(); }
  document.querySelectorAll('.sp-img').forEach(i => { if (i.complete) loaded(i); });
});

W.FFShopUI = { card, crumbs, trail, audienceOf, badgeKind, badgeHtml, chipsFor, priceBlock, caption, lnk, tone, tint, rooms, aud, PHONE, repaintResults, openQV, markReveal };
})();
