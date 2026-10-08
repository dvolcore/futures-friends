/* Futures Friends Store: campaign pictures (owner's lifestyle images, 2026-10-08).
   Places the owner's own pictures, exactly as he made them (resized and converted for the web only, never cropped, never edited), into the Kids' Shop,
   the collection pages, the centers' store, the Learning Zones Kit page, the product pages ("In real life") and the Home Kids' Shop teaser.
   Works by wrapping the existing views and inserting markup into their output, so store-shop.js, store-product.js and store-teasers.js stay as they are.
   Pictures: img/campaign/<name>-{800,1200,1536}.{webp,jpg}, long side 1536 px at most. Full-resolution files and print files are never on the site.
   Truth rules: no price, stock or size appears here; ordering is still "not open online yet" on the pages themselves. Sends nothing. */
(function () {
'use strict';
if (typeof V === 'undefined') return;
const W = window;
const E = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* name -> alt text. The two family pictures (family-swing-ad, youngest-booker-ad) do not name the children. */
const PIC = {
  'hero-friends': 'Four children share a picture book in a bright reading room, wearing Futures Friends gear: a blue Booker tee, a pink Lumi hoodie, a green Zuri tee, and a purple Bop hoodie and backpack, with Booker and Lumi water bottles beside them',
  'booker-story': 'Two children sit on a rug at story time: one in a blue Booker tee with a blue Booker backpack and bottle, reading; the other in a pink Lumi hoodie that says Take a breath. You belong.',
  'lumi-belong': 'Two friends smile at each other on a cozy sofa: one in a pink Lumi hoodie holding a Lumi bottle beside a pink backpack that says You belong here, the other in a blue Booker tee',
  'zuri-explore': 'Two children walk through a sunny garden: one in a purple Bop hoodie wearing Zuri’s Official Shell Backpack, the other in a green Zuri tee holding a Zuri bottle',
  'bop-move': 'Two children play outside a school: one in a purple Bop tee with Bop’s Official Backpack hops along a hopscotch grid, the other in a green hoodie holds a purple Bop bottle',
  'plush-friends': 'Four children sit close together on a soft rug, each hugging a Futures Friends plush: Booker the bear, Lumi the bunny, Zuri the turtle and Bop the elephant',
  'creative-universe': 'Four children at a table with Futures Friends coloring pages, sticker sheets and crayons, with a Booker backpack and bottle beside them',
  'classroom-zones': 'A bright classroom with Booker’s blue Reading Area carpet and Lumi’s pink Calm Corner carpet, each with its matching poster on the wall, and children reading and relaxing in each zone',
  'rainbow-mealtime': 'A smiling child at a kitchen table eats from the Eat the Rainbow plate, beside a pink Lumi water bottle',
  'family-swing-ad': 'Three children walk along a sunny park path, each in different Futures Friends gear: a purple Bop tee and backpack, a green Zuri tee, and a blue Booker tee with a Booker bottle',
  'youngest-booker-ad': 'A smiling young child on a sofa hugs a Booker plush and reads a picture book, with a blue Booker backpack and a Booker bottle close by'
};
const WID = [800, 1200, 1536];
function pic(name, o) {
  o = o || {};
  const b = 'img/campaign/' + name + '-', set = ext => WID.map(w => b + w + '.' + ext + ' ' + w + 'w').join(', ');
  const sizes = o.sizes || '(max-width:700px) 92vw, 640px';
  return `<picture><source type="image/webp" srcset="${set('webp')}" sizes="${E(sizes)}"><img class="cp-img" src="${b}1200.jpg" srcset="${set('jpg')}" sizes="${E(sizes)}" alt="${E(PIC[name])}" width="1536" height="1024" loading="${o.eager ? 'eager' : 'lazy'}" decoding="async"${o.eager ? ' fetchpriority="high"' : ''}></picture>`;
}
const fig = (name, o) => `<figure class="cp-fig">${pic(name, o)}</figure>`;
const lnk = (route, text) => `<a class="btn gold cp-btn" href="#${route}" data-go="${route}">${E(text)}</a>`;

/* ------------------------------------------------------------------ the full-width band under the Kids' Shop hero */
function heroBand() {
  return `<section class="cp-band" aria-labelledby="cpBandH"><div class="wrap cp-band-in">
    ${fig('hero-friends', { eager: true, sizes: '(max-width:820px) 92vw, 760px' })}
    <div class="cp-band-copy"><p class="cp-eyebrow">The Kids’ Shop</p><h2 id="cpBandH">Wear the wonder.</h2>
      <p>Booker, Lumi, Zuri and Bop gear for every kind of learner. Make room for wonder.</p>
      <p class="cp-act"><a class="btn gold cp-btn" href="#kids-tshirts" data-sp-jump="kids-tshirts">Shop now</a></p></div></div></section>`;
}

/* ------------------------------------------------------------------ small editorial strips (one or two pictures + a hook and a caption) */
const STRIP = {
  tshirts: { pics: ['lumi-belong'], hook: 'A little calm goes a long way.', cap: 'Soft, useful pieces for quiet connection.' },
  hoodies: { pics: ['booker-story'], hook: 'Stories go everywhere.', cap: 'A small reading ritual can carry a whole world.' },
  apparel: { pics: ['hero-friends'], hook: 'Wear the wonder.', cap: 'Booker, Lumi, Zuri and Bop gear for every kind of learner.' },
  plush: { pics: ['plush-friends'], hook: 'Friends to hold.', cap: 'Plush friends are opening soon. Leave your email on a plush page and we will tell you the day it opens.' },
  backpacks: { pics: ['zuri-explore', 'youngest-booker-ad'], hook: 'Pack a little belonging.', cap: 'Built for the questions children bring everywhere. Zuri’s Official Shell Backpack goes along on a garden walk.' },
  drinkware: { pics: ['rainbow-mealtime'], hook: 'Eat the rainbow. Move the story.', cap: 'A playful plate makes healthy portions easy to see and talk about.' },
  stickers: { pics: ['creative-universe'], hook: 'Color it. Stick it. Share it.', cap: 'Coloring pages and sticker sheets with the whole Futures Friends universe, around one table.' },
  carpets: { pics: ['classroom-zones'], hook: 'Designed for real corners.', cap: 'Turn an everyday room into a place to learn, move, explore and belong.' },
  posters: { pics: ['classroom-zones'], hook: 'Make room for every kind of learner.', cap: 'Each friend’s poster hangs over that friend’s corner.' },
  kits: { pics: ['classroom-zones'], hook: 'Make room for every kind of learner.', cap: 'A carpet, a poster and a calm corner for each friend: reading, calm, movement and discovery in one room.' },
  addons: { pics: ['classroom-zones'], hook: 'Designed for real corners.', cap: 'Turn an everyday room into a place to learn, move, explore and belong.' },
  store: { pics: ['classroom-zones'], hook: 'Make room for every kind of learner.', cap: 'Carpets and posters that give each corner of a classroom its own friend.' },
  'room-kit': { pics: ['classroom-zones'], hook: 'Designed for real corners.', cap: 'Booker’s reading corner and Lumi’s calm corner, each marked by its own carpet and poster.' }
};
function strip(key) {
  const s = STRIP[key]; if (!s) return '';
  const two = s.pics.length > 1;
  return `<section class="cp-strip${two ? ' cp-strip-2' : ''}" aria-label="${E(s.hook)}"><div class="wrap cp-strip-in">
    <div class="cp-strip-figs">${s.pics.map(n => fig(n, { sizes: two ? '(max-width:700px) 92vw, 260px' : '(max-width:700px) 92vw, 300px' })).join('')}</div>
    <div class="cp-strip-copy"><p class="cp-hook">${E(s.hook)}</p><p class="cp-cap">${E(s.cap)}</p></div></div></section>`;
}

/* ------------------------------------------------------------------ "In real life" on product pages: only where the product is clearly visible in the picture */
const REAL = {
  'booker-backpack': ['booker-story', 'The blue Booker backpack on a child at story time, with the Booker tee and bottle.'],
  'booker-tshirt': ['booker-story', 'The Booker tee at story time.'],
  'bottle-booker': ['booker-story', 'The Booker bottle in a child’s hand at story time.'],
  'lumi-hoodie': ['booker-story', 'The Lumi hoodie, back print Take a breath. You belong., seen from behind at story time.'],
  'bop-tshirt': ['bop-move', 'The Bop tee on a hopscotch grid.'],
  'bop-replica-backpack': ['bop-move', 'Bop’s Official Backpack on a child at play.'],
  'bottle-bop': ['bop-move', 'The Bop bottle at play.'],
  'eat-the-rainbow-plate': ['rainbow-mealtime', 'The Eat the Rainbow plate at lunch.'],
  'bottle-lumi': ['rainbow-mealtime', 'The Lumi bottle at the kitchen table.'],
  'zuri-replica-backpack': ['zuri-explore', 'Zuri’s Official Shell Backpack on a garden walk.'],
  'zuri-tshirt': ['zuri-explore', 'The Zuri tee on a garden walk.'],
  'bottle-zuri': ['zuri-explore', 'The Zuri bottle on a garden walk.'],
  'bop-hoodie': ['zuri-explore', 'The Bop hoodie on a garden walk.'],
  'plush-booker': ['plush-friends', 'The Booker plush, held close. Plush is opening soon.'],
  'plush-lumi': ['plush-friends', 'The Lumi plush, held close. Plush is opening soon.'],
  'plush-zuri': ['plush-friends', 'The Zuri plush, held close. Plush is opening soon.'],
  'plush-bop': ['plush-friends', 'The Bop plush, held close. Plush is opening soon.'],
  'rug-booker-reading-area': ['classroom-zones', 'Booker’s Reading Area carpet in a classroom reading corner.'],
  'rug-lumi-calm-corner': ['classroom-zones', 'Lumi’s Calm Corner carpet in a classroom calm corner.']
};
function realLife(id) {
  const r = REAL[id]; if (!r) return '';
  return `<section class="cp-real" aria-labelledby="cpRealH"><div class="wrap cp-real-in">${fig(r[0], { sizes: '(max-width:820px) 92vw, 640px' })}
    <div class="cp-real-copy"><p class="cp-eyebrow">In real life</p><h2 id="cpRealH">${E(r[1])}</h2></div></div></section>`;
}

/* ------------------------------------------------------------------ Home: the Kids' Shop teaser strip */
function homeTeaser() {
  return `<figure class="cp-home">${pic('family-swing-ad', { sizes: '(max-width:700px) 92vw, 420px' })}<figcaption><b>Bring the friends home.</b><span>Different favorite friends, one shared adventure.</span></figcaption></figure>`;
}

/* ------------------------------------------------------------------ string helpers: insert into a view's HTML at a known marker, or leave it untouched */
function insertAfterClose(h, marker, closer, add) {
  const a = h.indexOf(marker); if (a < 0) return h;
  const e = h.indexOf(closer, a); if (e < 0) return h;
  return h.slice(0, e + closer.length) + add + h.slice(e + closer.length);
}
function insertBefore(h, marker, add, from) {
  const a = h.indexOf(marker, from || 0); if (a < 0) return h;
  return h.slice(0, a) + add + h.slice(a);
}
const afterHero = (h, add) => insertAfterClose(h, 'class="h3-trust"', '</section>', add);
function wrap(route, fn) {
  const base = V[route]; if (typeof base !== 'function') return;
  V[route] = function () { const h = base.apply(this, arguments); try { return fn(String(h)); } catch (_) { return h; } };
}
const argNow = () => (typeof arg === 'string' ? arg : '');

// #kids-shop: the band right under the hero, then a strip at the top of each collection section (the section order is the owner's and is not changed)
wrap('kids-shop', h => {
  let out = afterHero(h, heroBand());
  ['tshirts', 'hoodies', 'plush', 'backpacks', 'drinkware', 'stickers', 'carpets', 'posters'].forEach(id => {
    const at = out.indexOf('id="kids-' + id + '"'); if (at < 0) return;
    out = insertBefore(out, '<ul class="sp-grid sp-grid-kids">', strip(id), at);
  });
  return out;
});
// #store (the centers' shop)
wrap('store', h => afterHero(h, strip('store')));
// #shop and #shop/<collection>, #shop-programs
function shopWrap(h, id) {
  if (id === 'all' || !STRIP[id]) return id === 'all' ? afterHero(h, strip('store')) : h;
  return insertAfterClose(h, '<header class="sp-pagehead', '</header>', strip(id));
}
wrap('shop', h => { const a = argNow(); return shopWrap(h, a === 'kids' ? '' : (a || 'all')); });
wrap('shop-programs', h => shopWrap(h, 'kits'));
// the Learning Zones Kit page
wrap('room-kit', h => insertAfterClose(h, '<header class="wc-hero rk-hero"', '</header>', strip('room-kit')));
// product pages
wrap('product', h => {
  const add = realLife(argNow()); if (!add) return h;
  for (const m of ['<section class="sp-story"', '<section class="sp-look"', '<section class="sp-faq"', '<section class="sp-pairs']) if (h.indexOf(m) >= 0) return insertBefore(h, m, add);
  return insertBefore(h, '<div class="sp-buybar"', add);
});
// Home: inside the Kids' Shop teaser, above the four plush
wrap('home', h => {
  const a = h.indexOf('<a class="st-strip-link"'); if (a < 0) return h;
  const e = h.indexOf('</a>', a); if (e < 0) return h;
  return h.slice(0, a) + '<div class="cp-home-row">' + homeTeaser() + h.slice(a, e + 4) + '</div>' + h.slice(e + 4);
});

W.FFCampaign = { PIC, STRIP, REAL, strip, heroBand, realLife, homeTeaser };
})();
