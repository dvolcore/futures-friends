/* Futures Friends: the Learning Zones Kit showcase (owner 2026-10-07: "where is the learning zone kits on the main platform? It needs
   to be seen so they want to buy"). ONE component, window.FFKitShowcase.band(variant), placed right under the hero on #centers
   (full) and high on #for-centers, #for-home and #pricing (compact). Families Home is NOT touched here (owner: only the small Kids'
   Shop sells there).
   Sources, nothing copied: the concept rooms come from window.FFBrandedRooms (brand-art.js, the same list as img/branded-rooms/
   manifest.json), so new concept images show up here with no edit; the zones, the Zone Boundaries prices ($1,195 home, $1,995
   classroom) and the package copy come from window.FFRoomKit (room-kit.js), and the package prices from window.FFPricing via it.
   Every image keeps its "Concept" badge and its Real room / With the kit toggle (brand-art.js). Ordering is not open: the band says so.
   Carousel: native scroll-snap (swipe on phones), Previous / Next buttons, arrow keys on the track, a live "Room 2 of 5" count;
   images lazy-load; with reduced motion the buttons jump instead of gliding. Sends nothing. */
(function () {
'use strict';
const W = window;
if (typeof V === 'undefined') return;
const E = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const money = n => '$' + Number(n).toLocaleString('en-US');
const ORDER = ['turtle-rug', 'reading-corner', 'blue-table-room', 'dress-up-corner', 'alphabet-rug'];   // all five zones first, then Booker, Zuri, Bop, Circle

function rooms() {
  const list = Array.isArray(W.FFBrandedRooms) ? W.FFBrandedRooms.filter(r => r && r.key && r.kit) : [];
  const at = r => { const i = ORDER.indexOf(r.key); return i < 0 ? 99 : i; };
  const out = list.slice().sort((a, b) => at(a) - at(b));
  return out;
}
function pic(src, alt, w, h, cls) {   // our -800 jpg plus its 400/1200 and webp siblings
  const b = src.replace(/-800\.jpg$/, ''), set = ext => [400, 800, 1200].map(x => `${b}-${x}.${ext} ${x}w`).join(', '), sizes = '(max-width:820px) 92vw, 720px';
  return `<picture><source type="image/webp" srcset="${set('webp')}" sizes="${sizes}"><img src="${E(src)}" srcset="${set('jpg')}" sizes="${sizes}" alt="${E(alt)}" width="${w || 800}" height="${h || 600}" loading="lazy" decoding="async" data-kit-photo="${E(cls)}"></picture>`;
}
function slide(r, i, n) {
  const A = W.FFArt, sizes = '(max-width:820px) 92vw, 720px';
  const alt = !!r.room;
  const img = alt && A && A.photoImg && A.CENTER && A.CENTER[r.room]
    ? `<span class="ffa-kit-real">${A.photoImg(r.room, { sizes })}</span><span class="ffa-kit-concept">${pic(r.kit, r.alt, r.w, r.h, r.key)}</span>`
    : A && A.kitImg && A.CENTER && A.CENTER[r.key] && A.KIT && A.KIT[r.key]
    ? `<span class="ffa-kit-real">${A.photoImg(r.key, { sizes })}</span><span class="ffa-kit-concept">${A.kitImg(r.key, { sizes })}</span>`
    : `<span class="ffa-kit-real"><img src="${E(r.real)}" alt="" loading="lazy" decoding="async" width="${r.w || 800}" height="${r.h || 600}"></span><span class="ffa-kit-concept"><img src="${E(r.kit)}" alt="${E(r.alt)}" loading="lazy" decoding="async" width="${r.w || 800}" height="${r.h || 600}"></span>`;
  const toggle = A && A.kitToggle ? A.kitToggle(r.key) : '';
  return `<div class="ks-slide" role="group" aria-roledescription="slide" aria-label="Room ${i + 1} of ${n}: ${E(r.zone || '')}">
   <figure class="ffa-photo ffa-kit ks-fig" data-kit-view="kit"><div class="ffa-kit-stage">${img}<span class="ffa-kit-label" aria-hidden="true">Concept</span>${toggle}</div>
   <figcaption><b>${E(r.zone || '')}</b><span class="ffa-kit-caption">${E((A && A.KIT_CAPTION) || 'AI-generated proposed transformation — furnishings and products shown as concepts.')}</span><span>Not installed yet. The real room is one tap away.</span></figcaption></figure></div>`;
}
function chips(RK) {
  return `<ul class="ks-chips" aria-label="The five zones">${RK.ZONES.map(z => `<li style="--zf:${z.felt};--zi:${z.ink};--zt:${z.tint}"><span class="ks-dot" aria-hidden="true"></span>${E(z.name)}</li>`).join('')}</ul>`;
}
function band(variant) {
  const RK = W.FFRoomKit; if (!RK || !RK.ZONES) return '';
  const list = rooms(); if (!list.length) return '';
  const full = variant === 'centers';
  const id = 'ks-' + (variant || 'centers');
  const addons = RK.ADDONS.filter(a => a.price != null);
  const home = addons.find(a => /home/i.test(a.name)), room = addons.find(a => /classroom/i.test(a.name));
  const T = RK.TIERS(), ZS = RK.ZS || {};
  const prices = `<div class="ks-price" role="group" aria-label="Zone Boundaries add-on, mats, fences and floor paths"><b>Zone Boundaries add-on</b>
    <span><em>${money(home.price)}</em> home daycare</span><span><em>${money(room.price)}</em> classroom</span></div>`;
  const pkgs = full ? `<div class="wrap"><ul class="ks-pkgs" aria-label="What is in each package">${T.map(t => `<li style="--c:var(--${(ZS[t.id] || {}).c || 'booker'})"><b>${E(t.name)}</b><span class="ks-pk-price">${money(t.startup)} startup · ${money(t.monthly)} a month</span>
    <span class="ks-pk-in">${E((ZS[t.id] || {}).zs || '')}</span></li>`).join('')}</ul></div>` : '';
  return `<section class="ks ks-${full ? 'full' : 'compact'}" id="${id}" aria-labelledby="${id}-h" data-ks="${E(variant || 'centers')}">
  <div class="wrap ks-grid"><div class="ks-copy"><span class="ks-eyebrow">Learning Zones Kit</span>
   <h2 id="${id}-h">Five friend zones. One chime.</h2>
   <p class="ks-pitch">Carpets, low see-through fences, signs and a cue your three-year-olds learn in a week, set up in the room you already have.</p>
   ${chips(RK)}${prices}
   <p class="ks-soon"><b>Ordering opens soon.</b> Nothing is charged here. Prices are before tax and delivery; packages and the add-on are listed on the pricing page.</p>
   <div class="ks-cta"><a class="btn gold" href="#room-kit">See the kit</a><a class="btn soft" href="#room-planner">Plan your room</a><a class="btn soft" href="#quote">Get a quote</a></div></div>
   <div class="ks-gallery" role="region" aria-roledescription="carousel" aria-label="Concept rooms with the Learning Zones Kit" data-ks-gallery>
    <div class="ks-track" tabindex="0" aria-label="Swipe or use the arrow keys to see each room" data-ks-track>${list.map((r, i) => slide(r, i, list.length)).join('')}</div>
    <div class="ks-ctl"><button type="button" class="ks-nav" data-ks-step="-1" aria-label="Previous room">&#8249;</button><span class="ks-count" aria-live="polite" data-ks-count>Room 1 of ${list.length}</span><button type="button" class="ks-nav" data-ks-step="1" aria-label="Next room">&#8250;</button></div>
   </div></div>${pkgs}</section>`;
}

// ---- carousel behaviour (delegated once)
function reduced() { try { return W.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
function current(track) { const w = track.clientWidth || 1; return Math.max(0, Math.min(track.children.length - 1, Math.round(track.scrollLeft / (track.firstElementChild ? track.firstElementChild.offsetWidth || w : w)))); }
function sync(track) {
  const g = track.closest('[data-ks-gallery]'), c = g && g.querySelector('[data-ks-count]');
  if (c) c.textContent = `Room ${current(track) + 1} of ${track.children.length}`;
}
function step(track, d) {
  const i = Math.max(0, Math.min(track.children.length - 1, current(track) + d)), s = track.children[i]; if (!s) return;
  track.scrollTo({ left: s.offsetLeft - track.offsetLeft, behavior: reduced() ? 'auto' : 'smooth' });
}
if (typeof document !== 'undefined' && document.addEventListener) {
  document.addEventListener('click', e => {
    const b = e.target && e.target.closest && e.target.closest('[data-ks-step]'); if (!b) return;
    const t = b.closest('[data-ks-gallery]').querySelector('[data-ks-track]'); step(t, Number(b.dataset.ksStep));
  });
  document.addEventListener('keydown', e => {
    const t = e.target && e.target.matches && e.target.matches('[data-ks-track]') ? e.target : null; if (!t) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); step(t, 1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); step(t, -1); }
  });
  document.addEventListener('scroll', e => {
    const t = e.target; if (!t || !t.matches || !t.matches('[data-ks-track]')) return;
    if (t._ks) return; t._ks = 1; (W.requestAnimationFrame || setTimeout)(() => { t._ks = 0; sync(t); });
  }, true);
}

// ---- placement: under the hero (before the page's first section), replacing the old end-of-page room-kit band
const OLD_BAND = /<section class="rk-band"[\s\S]*?<\/section>/;
function place(route, variant) {
  const base = V[route]; if (typeof base !== 'function') return;
  V[route] = function () {
    let h = base.apply(this, arguments);
    const add = band(variant); if (!add) return h;
    h = h.replace(OLD_BAND, '');
    const at = h.indexOf('<section');
    return at < 0 ? h + add : h.slice(0, at) + add + h.slice(at);
  };
}
place('centers', 'centers');
place('for-centers', 'for-centers');
place('for-home', 'for-home');
place('pricing', 'pricing');
W.FFKitShowcase = { band, rooms };
})();
