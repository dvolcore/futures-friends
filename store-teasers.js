/* Futures Friends: small Futures Store teasers placed on other pages (owner 2026-10-07: shop from anywhere).
   (a) #centers: "Shop the kit" band under the kit showcase; (b) #home: a four-plush Kids' Shop strip; (c) the demo Director dashboard: a "Classroom store" card.
   Pictures come from img/store (the plush photos from img/store/manifest.json through FFCatalog, the kit concept from img/branded-rooms). No price, rating, review or sold count appears
   here: prices live on the shop pages. Concept pictures stay labelled. Sends nothing, charges nothing. */
(function () {
'use strict';
const W = window;
if (typeof V === 'undefined') return;
const E = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const KIT_CAPTION = 'AI-generated proposed transformation — furnishings and products shown as concepts.';
const PLUSH = [['plush-booker', 'Booker', 'blue'], ['plush-lumi', 'Lumi', 'pink'], ['plush-zuri', 'Zuri', 'green'], ['plush-bop', 'Bop', 'purple']];

function plushPic(id, name) {
  const b = `img/store/${id}-1-`;
  return `<img src="${b}800.jpg" srcset="${b}400.webp 400w, ${b}800.webp 800w" sizes="(max-width:700px) 40vw, 220px" alt="${E(name + ' plush')}" loading="lazy" decoding="async">`;
}

function kitBand() {
  const b = 'img/branded-rooms/blue-table-room-kit-';
  return `<section class="st-band st-kit" aria-labelledby="stKitH"><div class="wrap st-kit-in">
    <figure class="st-kit-fig"><picture><source type="image/webp" srcset="${b}400.webp 400w, ${b}800.webp 800w, ${b}1200.webp 1200w" sizes="(max-width:820px) 92vw, 520px"><img src="${b}800.jpg" srcset="${b}400.jpg 400w, ${b}800.jpg 800w, ${b}1200.jpg 1200w" sizes="(max-width:820px) 92vw, 520px" alt="Concept picture of a classroom table zone with the Futures Friends kit" width="800" height="600" loading="lazy" decoding="async"></picture>
    <span class="st-chip">Concept</span><figcaption class="st-cap">${E(KIT_CAPTION)}</figcaption></figure>
    <div class="st-kit-copy"><p class="st-eyebrow">Futures Store</p><h2 id="stKitH">Shop the kit</h2>
    <p>Learning Zones kits, rugs and classroom signs for your rooms. Pick what fits, send a request, and we reply with a quote. Nothing is charged online.</p>
    <p class="st-row"><a class="btn gold" href="#shop/kits" data-go="shop/kits">Shop the kit</a><a class="btn soft" href="#store" data-go="store">See the whole store</a></p></div></div></section>`;
}

function kidsStrip() {
  const items = PLUSH.map(([id, name, tone]) => `<li class="st-item st-${tone}"><span class="st-img">${plushPic(id, name)}</span><span class="st-name">${E(name)}</span></li>`).join('');
  return `<section class="st-band st-kids" aria-labelledby="stKidsH"><div class="wrap">
    <div class="st-head"><div><p class="st-eyebrow">Kids’ Shop</p><h2 id="stKidsH">Meet the friends, for home</h2></div>
    <a class="btn soft" href="#kids-shop" data-go="kids-shop">Visit the Kids’ Shop</a></div>
    <a class="st-strip-link" href="#kids-shop" data-go="kids-shop" aria-label="Visit the Kids\u2019 Shop: Booker, Lumi, Zuri and Bop plush friends"><ul class="st-strip" role="list">${items}</ul></a>
    <p class="st-note">Plush friends are opening soon.</p></div></section>`;
}

function classroom() {
  return `<div class="card st-class" style="border-top:5px solid var(--gold)"><div class="st-class-in"><div><h3>Classroom store</h3>
    <p class="small">Kits, rugs, signs and plush for the room. Browse the Futures Store and send a request for a quote. This is a demo: nothing is charged.</p></div>
    <a class="btn gold" href="#store" data-go="store">Open the Futures Store</a></div></div>`;
}

function after(h, marker, add) { const at = h.indexOf(marker); return at < 0 ? h + add : h.slice(0, at + marker.length) + add + h.slice(at + marker.length); }
function wrap(route, fn) {
  const base = V[route]; if (typeof base !== 'function') return;
  V[route] = function () { const h = base.apply(this, arguments); try { return fn(String(h)); } catch (_) { return h; } };
}
// centers: right after the kit showcase band (kit-showcase.js puts it under the hero); otherwise after the first section
wrap('centers', h => { const k = h.indexOf('<section class="ks '); const from = k < 0 ? 0 : k; const end = h.indexOf('</section>', from); return end < 0 ? h + kitBand() : h.slice(0, end + 10) + kitBand() + h.slice(end + 10); });
wrap('home', h => after(h, '</section>', kidsStrip()));
W.FFStoreTeasers = { kitBand, kidsStrip, classroom };
})();
