// The Kids' Shop film opening (kids-film.js, owner 2026-10-08): the owner's finished "Wonder Store" film with its chapter billboard,
// "Shop the moment" chips and the rotating spotlight, mapped onto the real catalog. Static checks + a VM render (no browser).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { site, read, text, ROOT } = require('./site-vm');

const STORE_FILES = ['store-config.js', 'store-merch-data.js', 'store-catalog.js', 'store-cart.js', 'store-checkout.js', 'store-shop.js', 'store-product.js', 'store-order.js', 'kids-film.js', 'store-campaign.js'];
function world(soundOff = false) {   // soundOff: the site's kill switch (sound-switch.js), inactive by default (sound back on, owner 2026-10-10)
  const c = site();
  c.FF_SOUND_OFF = soundOff; if (c.window) c.window.FF_SOUND_OFF = soundOff;
  c.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  c.location = { hostname: 'example.org', hash: '', origin: 'https://example.org', pathname: '/' };
  for (const f of ['room-kit-plans.js', 'room-kit.js']) vm.runInContext(read(f), c, { filename: f });
  for (const f of STORE_FILES) vm.runInContext(read(f), c, { filename: f });
  return { c, W: c.window };
}

test('the film opens the Kids\' Shop, with Shop now, and "Shop by friend" (Booker first) directly under it', () => {
  const { c, W } = world(), html = c.render('kids-shop');
  assert.ok(W.FFKidsFilm, 'kids-film.js loaded');
  const at = (s, from) => html.indexOf(s, from);
  assert.ok(at('data-kf') > 0 && at('data-kf') < at('class="sp-friends"'), 'film before the friends');
  assert.doesNotMatch(html, /class="h3 h3-families"/, 'the product-tile hero is replaced');
  assert.doesNotMatch(html, /class="cp-band"/, 'no second big band stacked under the film');
  // nothing but the "Shop the moment" dock sits between the film and the friends
  const between = html.slice(at('</section>', at('data-kf')), at('<section class="sp-friends"'));
  assert.equal((between.match(/<section /g) || []).length, 1); assert.match(between, /class="kf-dock"/);
  const friends = html.slice(at('class="sp-friends"'), at('</section>', at('class="sp-friends"')));
  assert.deepEqual(JSON.parse(JSON.stringify([...friends.matchAll(/data-go="shop\/friend-(\w+)"/g)].map(m => m[1]))), ['booker', 'lumi', 'zuri', 'bop']);
  assert.match(html, /class="btn gold sp-btn-lg kf-shop" href="#spResults" data-sp-scroll="spResults">Shop now/);
  assert.equal((html.match(/class="sp-card"/g) || []).length, 60, 'the shop below is unchanged');
  // the sections below keep the owner's order
  const ids = [...html.matchAll(/class="sp-kidsec" id="kids-(\w+)"/g)].map(m => m[1]);
  assert.deepEqual(ids, ['tshirts', 'hoodies', 'plush', 'backpacks', 'drinkware', 'stickers', 'carpets', 'posters', 'more']);
  assert.ok(at('class="sp-edit"') > at('id="kids-stickers"') && at('class="sp-edit"') < at('id="kids-carpets"'), 'big carpet banner before Carpets');
});

test('the four chapters follow the film clock and every chip is a real product page', () => {
  const { c, W } = world(), F = W.FFKidsFilm, C = W.FFCatalog;
  assert.deepEqual(JSON.parse(JSON.stringify(F.CH.map(x => [x.start, x.end]))), [[0, 12.666667], [12.666667, 16.333333], [16.333333, 20.625], [20.625, 26.875]]);
  assert.deepEqual([0, 12.7, 13, 17, 21, 26.8].map(t => F.chapterAt(t)), [0, 1, 1, 2, 3, 3]);
  for (const ch of F.CH) {
    assert.equal(ch.items.length, 3);
    for (const [id] of ch.items) { assert.ok(C.product(id), id); assert.ok(fs.existsSync(path.join(ROOT, 'product-' + id + '.html')), 'product page ' + id); }
    assert.ok(/^kids-(tshirts|backpacks|stickers|drinkware)$/.test(ch.jump), ch.jump);
  }
  const html = c.render('kids-shop');
  assert.equal((html.match(/class="kf-chip" href="#product\/[\w-]+" data-go="product\//g) || []).length, 3);
  assert.equal((html.match(/class="kf-sc" href="#product\//g) || []).length, 4);
});

test('the video: web encodes only, muted loop playsinline, no source until the route opens; Music and its credit show with sound on; the kill switch hides them', () => {
  const { c } = world(), html = c.render('kids-shop'), src = read('kids-film.js');
  const v = html.match(/<video[^>]*>/)[0];
  for (const a of ['muted', 'loop', 'playsinline', 'preload="none"', 'poster="video/kids-shop/wonder-store-film-poster.webp"']) assert.ok(v.includes(a), a);
  const film = html.slice(html.indexOf('data-kf'), html.indexOf('</section>', html.indexOf('data-kf')));
  assert.doesNotMatch(film, /<source|autoplay/, 'the source is attached by the hook, after the route renders');
  for (const f of ['wonder-store-film-1080.mp4', 'wonder-store-film-720.mp4', 'wonder-store-film-poster.webp', 'wonder-store-film-poster.jpg']) {
    const s = fs.statSync(path.join(ROOT, 'video/kids-shop', f)).size;
    assert.ok(s < (f.includes('1080') ? 8 : f.includes('720') ? 4 : 0.3) * 1024 * 1024, f + ' ' + s);
  }
  // sound on (the shipped default since the owner's later 2026-10-10 decision): the Music button and the credit are back
  assert.match(read('sound-switch.js'), /^  var SOUND_OFF = false;/m);
  assert.match(html, /data-kf-music/);
  assert.match(text(html), /Music: “Who Likes to Party” by Kevin MacLeod \(incompetech\.com\), licensed under CC BY 4\.0/);
  // kill switch flipped on (kept, inactive): no Music button, no music credit, the film stays muted
  const off = world(true).c.render('kids-shop');
  assert.doesNotMatch(off, /data-kf-music|kf-credit|incompetech/);
  assert.doesNotMatch(text(off), /Music/);
  assert.match(src, /toggleMusic\(\) \{\n  if \(!el \|\| SOUND_OFF\(\)\) return;/, 'the music toggle does nothing while the switch is on');
  const back = html;
  assert.match(back, /href="https:\/\/creativecommons\.org\/licenses\/by\/4\.0\/"/);
  assert.match(src, /'timeupdate', 'seeked'/, 'headlines follow the video clock');
  assert.match(src, /prefers-reduced-motion/); assert.match(src, /visibilitychange/); assert.match(src, /dialog\[open\]/);
  assert.doesNotMatch(text(html), /custom|concept/i);
});

test('Spanish draft strings cover the film opening', () => {
  const es = read('i18n-es-8.js'), F = (() => { const { W } = world(); return W.FFKidsFilm; })();
  const keys = ['Shop now', 'Shop the moment.', 'Meet their next favorite.', 'Music off', 'Music on', 'Play film', 'Pause film', 'Next chapter', 'The Kids’ Shop'];
  for (const ch of F.CH) keys.push(ch.kicker, ch.kind, ch.text, ch.cta, ...ch.lines, ...ch.items.map(i => i[1]));
  for (const k of keys) assert.ok(es.includes(`'${k}':`), k);
});
