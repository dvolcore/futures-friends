/* Futures Friends Store: the cart. Pure cart math and saving (testable in Node), plus the slide-in cart drawer and the cart count in the header.
   Loaded after store-catalog.js. window.FFCart = { add, setQty, remove, clear, lines, totals, count, open, close, h, ... }.

   Rules:
   - The cart is saved on this device only (localStorage, every access in try/catch). Nothing about a person is stored: no name, address or email.
   - Shipping is an ESTIMATE METHOD, not a number: the carrier cost is quoted by ZIP code on the invoice. We never invent a shipping or tax figure.
   - The promo-code field is inert until online ordering is enabled.
   - The drawer is a modal dialog: focus moves in, Tab stays inside, Escape and the scrim close it, focus returns to what opened it, and
     the rest of the page is inert while it is open. The count in the header is announced politely (aria-live).
   - Motion: the drawer slides on transform only, 260ms; the add-to-cart dot flies to the count; reduced motion turns both into fades or nothing. */
(function (root, factory) {
  const api = factory(typeof require === 'function' && typeof module === 'object' ? require('./store-catalog.js') : root.FFCatalog);
  if (typeof module === 'object' && module.exports) module.exports = api; else root.FFCart = api;
})(typeof window !== 'undefined' ? window : globalThis, function (C) {
  'use strict';
  const KEY = 'ff-store-cart-v1', MAXQ = 99;
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const hasDoc = typeof document !== 'undefined' && !!document.addEventListener;
  const W = typeof window !== 'undefined' ? window : {};

  // ------------------------------------------------------------------ state + saving
  let items = [];        // [{ pid, opts, qty }]
  const subs = [];
  const keyOf = (pid, opts) => pid + '|' + Object.keys(opts || {}).sort().map(k => k + '=' + opts[k]).join(',');
  const store = {
    get() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (_) { return null; } },
    set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); return true; } catch (_) { return false; } },
    del() { try { localStorage.removeItem(KEY); } catch (_) { /* private mode */ } }
  };
  function load() {
    const saved = store.get(), out = [];
    for (const it of (saved && Array.isArray(saved.items) ? saved.items : [])) {
      const p = it && C.product(it.pid); if (!p || !C.canOrder(p)) continue;
      const q = Math.max(1, Math.min(MAXQ, Math.floor(+it.qty || 0))); if (!q) continue;
      out.push({ pid: p.id, opts: C.cleanOpts(p, it.opts), qty: q });
    }
    items = merge(out);
    return items.length;
  }
  function merge(list) {
    const m = new Map();
    for (const it of list) { const k = keyOf(it.pid, it.opts); if (m.has(k)) m.get(k).qty = Math.min(MAXQ, m.get(k).qty + it.qty); else m.set(k, { pid: it.pid, opts: it.opts, qty: it.qty }); }
    return [...m.values()];
  }
  function commit(why, detail) {
    store.set({ v: 1, items });
    for (const f of subs.slice()) { try { f(why, detail); } catch (e) { if (typeof console !== 'undefined') console.warn(e); } }
  }
  const subscribe = f => { subs.push(f); return () => { const i = subs.indexOf(f); if (i >= 0) subs.splice(i, 1); }; };

  // ------------------------------------------------------------------ operations
  function add(pid, opts, qty) {
    const p = C.product(pid); if (!p || !C.canOrder(p)) return null;
    const o = C.cleanOpts(p, opts), q = Math.max(1, Math.min(MAXQ, Math.floor(+qty || 1)));
    const k = keyOf(pid, o), ex = items.find(i => keyOf(i.pid, i.opts) === k);
    if (ex) ex.qty = Math.min(MAXQ, ex.qty + q); else items.push({ pid, opts: o, qty: q });
    commit('add', { key: k, pid, qty: q });
    return k;
  }
  function setQty(key, qty) {
    const it = items.find(i => keyOf(i.pid, i.opts) === key); if (!it) return;
    const q = Math.floor(+qty || 0);
    if (q <= 0) return remove(key);
    it.qty = Math.min(MAXQ, q); commit('qty', { key });
  }
  function remove(key) { const n = items.length; items = items.filter(i => keyOf(i.pid, i.opts) !== key); if (items.length !== n) commit('remove', { key }); }
  function clear() { items = []; store.del(); commit('clear', {}); }
  /* Resolved lines, with the unit price (null when quoted), line total and labels. */
  function lines() {
    return items.map(it => {
      const p = C.product(it.pid), unit = C.unitPrice(p, it.opts);
      return { key: keyOf(it.pid, it.opts), pid: it.pid, p, opts: it.opts, label: C.optLabel(p, it.opts), qty: it.qty, unit, total: unit == null ? null : unit * it.qty, quote: unit == null };
    });
  }
  const count = () => items.reduce((n, i) => n + i.qty, 0);
  /* Cart math. subtotal covers priced lines only; quoted lines are counted and listed, never priced. */
  function totals(ls) {
    ls = ls || lines();
    const priced = ls.filter(l => !l.quote), quoted = ls.filter(l => l.quote);
    const subtotal = priced.reduce((s, l) => s + l.total, 0);
    const ships = { freight: false, parcel: false, digital: false, included: false };
    for (const l of ls) { if (l.p.kind === 'kit') ships.included = true; else if (l.p.ships === 'freight') ships.freight = true; else if (l.p.ships === 'digital' || l.p.ships === 'none') ships.digital = true; else ships.parcel = true; }
    const membership = ls.filter(l => l.p.membership).map(l => ({ pid: l.pid, name: l.p.name, monthly: l.p.membership.monthly, qty: l.qty }));
    return { subtotal, pricedCount: priced.reduce((n, l) => n + l.qty, 0), quoteCount: quoted.reduce((n, l) => n + l.qty, 0), lineCount: ls.length, ships, membership, quoted: quoted.map(l => l.p.name) };
  }
  /* The shipping line: a method and an honest "quoted" label, never an invented number. */
  function shipping(t) {
    const parts = [];
    if (t.ships.included) parts.push('Startup kit shipping and carpet freight are part of the package price.');
    if (t.ships.freight) parts.push('Freight for rugs, mats and fences: the carrier cost for your ZIP code is quoted on your invoice.');
    if (t.ships.parcel) parts.push('Parcel for print items: quoted on your invoice.');
    return { label: t.lineCount ? 'Quoted on your invoice' : '', estimate: true, note: parts.join(' ') };
  }
  const TAX_NOTE = 'Sales tax for Missouri and Kansas is added on your invoice. Tax-exempt centers and churches: add your certificate at checkout.';
  const fmt = C.fmt;

  // ------------------------------------------------------------------ shared markup helpers (used by store-shop.js too)
  const ICONS = {
    bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    truck: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>', minus: '<path d="M5 12h14"/>', x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>', back: '<path d="m15 18-6-6 6-6"/>', next: '<path d="m9 18 6-6-6-6"/>', down: '<path d="m6 9 6 6 6-6"/>',
    ruler: '<path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2"/><path d="m11.5 9.5 2-2"/><path d="m8.5 6.5 2-2"/><path d="m17.5 15.5 2-2"/>',
    zoom: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6"/><path d="M8 11h6"/>',
    print: '<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/>',
    mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    check: '<path d="M20 6 9 17l-5-5"/>', filter: '<path d="M3 6h18"/><path d="M7 12h10"/><path d="M10 18h4"/>', grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>', book: '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>'
  };
  const ico = (n, cls) => `<svg class="sp-i${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[n] || ''}</svg>`;
  const spriteHtml = () => `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">${Object.keys(ICONS).map(k => `<symbol id="sp-${k}" viewBox="0 0 24 24">${ICONS[k]}</symbol>`).join('')}</svg>`;
  const rooms = () => (Array.isArray(W.FFBrandedRooms) ? W.FFBrandedRooms : []);
  /* An <img> for a gallery entry (srcset from the entry), with intrinsic size so nothing jumps. */
  function imgTag(g, o) {
    o = o || {};
    const set = g.srcset.map(([u, w]) => E(u) + ' ' + w + 'w').join(', ');
    const fit = g.tile || g.fit === 'contain' ? ' sp-contain' : '';
    return `<img class="sp-img${fit}${o.cls ? ' ' + o.cls : ''}" src="${E(g.src)}" srcset="${set}" sizes="${E(o.sizes || '(max-width:700px) 50vw, 320px')}" alt="${E(o.alt != null ? o.alt : g.alt)}" width="${g.w}" height="${g.h}" loading="${o.eager ? 'eager' : 'lazy'}" decoding="async"${o.eager ? ' fetchpriority="high"' : ''} draggable="false">`;
  }
  const thumb = p => { const g = C.gallery(p, rooms())[0]; return g ? imgTag(g, { sizes: '96px', alt: '' }) : ''; };
  const optsText = l => l.label ? `<span class="sp-ln-opt">${E(l.label)}</span>` : '';
  const priceCell = l => l.quote ? `<span class="sp-quote">${l.p.priceState === 'quote' ? 'To be quoted' : 'Price coming soon'}</span>` : `<span class="sp-num">${fmt(l.total)}</span>`;

  /* The cart lines + totals block. variant: 'drawer' | 'page'. */
  function bodyHtml(variant) {
    const ls = lines(), t = totals(ls), sh = shipping(t), page = variant === 'page';
    if (!ls.length) return `<div class="sp-empty">
      <div class="sp-empty-art" aria-hidden="true"><img src="img/plush/props/circle-rug-480.webp" alt="" width="480" height="480" loading="lazy" decoding="async"></div>
      <h3>Your cart is empty</h3>
      <p>Start with a kit, or add one sign or one rug. Kits and add-ons you save here stay on this device.</p>
      <div class="sp-empty-acts"><button class="btn gold" type="button" data-go="shop/kits" data-sp-close>Shop the kits ${ico('arrow')}</button><button class="btn soft" type="button" data-go="room-planner" data-sp-close>Plan your room</button></div></div>`;
    const rows = ls.map(l => `<li class="sp-ln" data-key="${E(l.key)}">
      <button type="button" class="sp-ln-img" data-go="product/${E(l.pid)}" data-sp-close aria-label="View ${E(l.p.name)}">${thumb(l.p)}</button>
      <div class="sp-ln-main"><a class="sp-ln-name" href="#product/${E(l.pid)}" data-go="product/${E(l.pid)}" data-sp-close>${E(l.p.name)}</a>${optsText(l)}
        <span class="sp-ln-unit">${l.unit == null ? (l.p.priceState === 'quote' ? 'Request a quote' : 'Price coming soon') : fmt(l.unit) + ' each'}</span>
        <div class="sp-ln-ctl"><div class="sp-step" role="group" aria-label="Quantity of ${E(l.p.name)}">
          <button type="button" data-sp-qty="${E(l.key)}" data-d="-1" aria-label="Fewer ${E(l.p.name)}"${l.qty <= 1 ? ' disabled' : ''}>${ico('minus')}</button>
          <output aria-live="polite">${l.qty}</output>
          <button type="button" data-sp-qty="${E(l.key)}" data-d="1" aria-label="More ${E(l.p.name)}"${l.qty >= MAXQ ? ' disabled' : ''}>${ico('plus')}</button></div>
          <button type="button" class="sp-link" data-sp-rm="${E(l.key)}">Remove</button></div></div>
      <div class="sp-ln-total">${priceCell(l)}</div></li>`).join('');
    const quoteNote = t.quoteCount ? `<p class="sp-note">${t.quoteCount} item${t.quoteCount === 1 ? '' : 's'} will be priced in your written quote, so they are not in the subtotal.</p>` : '';
    const member = t.membership.length ? `<p class="sp-note">${E(C.MEMBER)}</p>` : '';
    return `<ul class="sp-lines">${rows}</ul>
    <div class="sp-sum">
      <dl class="sp-totals"><div><dt>Subtotal${t.quoteCount ? ' (priced items)' : ''}</dt><dd class="sp-num">${t.pricedCount ? fmt(t.subtotal) : 'None priced yet'}</dd></div>
      <div><dt>Shipping <span class="sp-est">Estimate</span></dt><dd>${E(sh.label)}</dd></div>
      <div><dt>Sales tax</dt><dd>On your invoice</dd></div></dl>
      <p class="sp-note">${E(sh.note)}</p><p class="sp-note">${E(TAX_NOTE)}</p>${quoteNote}${member}
      <form class="sp-promo" data-sp-promo novalidate><label for="spPromo-${page ? 'p' : 'd'}">Promo code</label>
        <div><input class="i" id="spPromo-${page ? 'p' : 'd'}" type="text" autocomplete="off" disabled aria-describedby="spPromoN-${page ? 'p' : 'd'}"><button class="btn soft" type="button" disabled>Apply</button></div>
        <span class="sp-note" id="spPromoN-${page ? 'p' : 'd'}">Promo codes switch on when online payment does.</span></form>
      ${page ? `<div class="sp-foot-acts"><button type="button" class="btn gold sp-wide" data-go="checkout">Check out ${ico('arrow')}</button><button type="button" class="btn soft sp-wide" data-go="store">Keep shopping</button></div>
      <p class="sp-saved">${store.get() ? 'Saved on this device.' : 'Not saved: your browser blocks storage.'} <button type="button" class="sp-link" data-sp-print>Print this list</button> <button type="button" class="sp-link" data-sp-emailcart>Email it</button> <button type="button" class="sp-link" data-sp-clearcart>Empty cart</button></p>` : ''}
    </div>`;
  }
  const footHtml = () => {
    const n = lines().length;
    if (!n) return '';
    return `<div class="sp-foot-acts"><button type="button" class="btn gold sp-wide" data-go="checkout" data-sp-close>Check out ${ico('arrow')}</button><button type="button" class="btn soft sp-wide" data-go="cart" data-sp-close>View full cart</button></div>
    <p class="sp-saved">${store.get() ? 'Saved on this device.' : 'Not saved: your browser blocks storage. Finish this order in one visit.'}</p>`;
  };

  // ------------------------------------------------------------------ DOM: header button, drawer, live region
  let drawer = null, scrim = null, panel = null, opener = null, liveEl = null, btn = null, closing = 0;
  const reduced = () => { try { return W.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return false; } };
  const $ = (s, r) => (r || document).querySelector(s);
  function ensureDom() {
    if (!hasDoc || drawer || !document.body) return;
    const host = document.createElement('div'); host.id = 'spRoot';
    host.innerHTML = spriteHtml() + `<div class="sp-live" id="spLive" role="status" aria-live="polite" aria-atomic="true"></div>
      <button type="button" class="sp-viewcart" id="spViewCart" data-sp-open aria-haspopup="dialog" aria-controls="spDrawer" hidden>${ico('bag')}<span class="sp-vc-t">View cart</span><span class="sp-count" data-sp-vccount>0</span><span class="sp-vc-sub sp-num" data-sp-vcsub></span></button>
      <div class="sp-drawer" id="spDrawer" hidden><div class="sp-scrim" data-sp-close></div>
      <div class="sp-panel" role="dialog" aria-modal="true" aria-labelledby="spDrawerH" tabindex="-1">
        <header class="sp-panel-h"><h2 id="spDrawerH">Your cart</h2><button type="button" class="sp-x" data-sp-close aria-label="Close cart">${ico('x')}</button></header>
        <div class="sp-panel-b" data-sp-body></div><div class="sp-panel-f" data-sp-foot></div></div></div>`;
    document.body.appendChild(host);
    drawer = $('#spDrawer'); scrim = $('.sp-scrim', drawer); panel = $('.sp-panel', drawer); liveEl = $('#spLive');
  }
  function ensureButton() {
    if (!hasDoc) return;
    if (btn && document.contains(btn)) return;
    const menu = document.getElementById('menuT'), bar = $('header.bar .wrap:last-of-type') || $('header.bar .wrap');
    if (!bar) return;
    btn = document.createElement('button'); btn.type = 'button'; btn.className = 'sp-cartbtn'; btn.id = 'spCartBtn'; btn.setAttribute('data-sp-shop', '');
    btn.innerHTML = `${ico('bag')}<span class="sp-cartlabel">Shop</span><span class="sp-count" data-sp-count>0</span><span class="sp-sr" data-sp-cartsr>, 0 items in your cart</span>`;
    if (menu && menu.parentNode) menu.parentNode.insertBefore(btn, menu); else bar.appendChild(btn);
    paintCount();
  }
  function paintCount(bump) {
    if (!hasDoc || !btn) return;
    const vc = document.getElementById('spViewCart');
    if (vc) { const n0 = count(), t0 = totals(); vc.hidden = n0 === 0 || document.documentElement.classList.contains('sp-nopill'); $('[data-sp-vccount]', vc).textContent = n0 > 99 ? '99+' : String(n0); $('[data-sp-vcsub]', vc).textContent = t0.pricedCount ? fmt(t0.subtotal) : ''; }
    const n = count(), c = $('[data-sp-count]', btn), s = $('[data-sp-cartsr]', btn);
    c.textContent = n > 99 ? '99+' : String(n); c.classList.toggle('is-zero', n === 0);
    s.textContent = ', ' + n + ' item' + (n === 1 ? '' : 's') + ' in your cart';
    if (bump && !reduced() && c.animate) c.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.35)' }, { transform: 'scale(1)' }], { duration: 320, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
  }
  const say = msg => { if (liveEl) { liveEl.textContent = ''; setTimeout(() => { if (liveEl) liveEl.textContent = msg; }, 30); } };
  /* Replace a container's HTML and keep keyboard focus on the same control (a quantity button, a remove link). */
  function swap(box, html) {
    const ae = document.activeElement, inside = ae && box.contains(ae);
    const sel = inside && ae.getAttribute ? (ae.hasAttribute('data-sp-qty') ? `[data-sp-qty="${CSS.escape(ae.getAttribute('data-sp-qty'))}"][data-d="${ae.dataset.d}"]` : ae.hasAttribute('data-sp-rm') ? `[data-sp-rm="${CSS.escape(ae.getAttribute('data-sp-rm'))}"]` : '') : '';
    const fallback = inside && ae.getAttribute && ae.hasAttribute('data-sp-qty') ? `[data-sp-qty="${CSS.escape(ae.getAttribute('data-sp-qty'))}"]:not([disabled])` : '';
    box.innerHTML = html;
    if (inside) { const again = (sel && box.querySelector(sel + ':not([disabled])')) || (fallback && box.querySelector(fallback)) || box.querySelector('.sp-step button:not([disabled]), .sp-empty a, .sp-empty button'); if (again) again.focus({ preventScroll: true }); else if (box.closest('.sp-panel')) box.closest('.sp-panel').focus({ preventScroll: true }); }
  }
  function paintDrawer() {
    if (!drawer) return;
    swap($('[data-sp-body]', drawer), bodyHtml('drawer')); $('[data-sp-foot]', drawer).innerHTML = footHtml();
  }
  const focusables = () => [...panel.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])')].filter(e => e.offsetParent !== null || e === document.activeElement);
  const outside = () => ['#view', 'header.bar', 'footer', '#ffw-close', '#ff-prefooter', '.ff-skip'].map(s => document.querySelector(s)).filter(Boolean);
  function open(from) {
    if (!hasDoc) return; ensureDom(); if (!drawer) return;
    if (!drawer.hidden && drawer.classList.contains('is-open')) return;
    clearTimeout(closing); opener = from || document.activeElement;
    paintDrawer(); const vc0 = document.getElementById('spViewCart'); if (vc0) vc0.hidden = true; drawer.hidden = false; void drawer.offsetWidth; drawer.classList.add('is-open');
    outside().forEach(e => e.setAttribute('inert', ''));
    document.documentElement.classList.add('sp-lock');
    if (btn) btn.setAttribute('aria-expanded', 'true');
    panel.focus({ preventScroll: true });
    const h = $('.sp-panel-h h2', panel); if (h) { /* heading is announced via aria-labelledby */ }
  }
  function close(restore) {
    if (!hasDoc || !drawer || drawer.hidden) return;
    drawer.classList.remove('is-open');
    outside().forEach(e => e.removeAttribute('inert'));
    document.documentElement.classList.remove('sp-lock');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    closing = setTimeout(() => {
      drawer.hidden = true; paintCount();
      if (restore === false) return;
      const vis = el => el && el.focus && document.contains(el) && !el.hidden && el.getClientRects().length > 0;
      const vc = document.getElementById('spViewCart'), target = vis(opener) ? opener : vis(vc) ? vc : btn;
      if (target) target.focus({ preventScroll: true });
    }, reduced() ? 0 : 260);
  }
  const isOpen = () => !!drawer && !drawer.hidden && drawer.classList.contains('is-open');
  /* A felt dot flies from the Add to cart button to the count, then the count bumps and the drawer opens. */
  function fly(fromEl, tone, then) {
    if (!hasDoc || !fromEl || !btn || reduced() || !fromEl.animate) return then();
    const a = fromEl.getBoundingClientRect(), b = btn.getBoundingClientRect();
    const dot = document.createElement('span'); dot.className = 'sp-fly'; dot.setAttribute('aria-hidden', 'true'); dot.style.setProperty('--fly', 'var(--' + (tone || 'gold') + ')');
    const x0 = a.left + a.width / 2 - 11, y0 = a.top + a.height / 2 - 11, x1 = b.left + b.width / 2 - 11, y1 = b.top + b.height / 2 - 11;
    dot.style.cssText += `left:${x0}px;top:${y0}px`; document.body.appendChild(dot);
    const an = dot.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${(x1 - x0) * 0.55}px,${(y1 - y0) * 0.35 - 40}px) scale(1.15)`, opacity: 1, offset: 0.5 }, { transform: `translate(${x1 - x0}px,${y1 - y0}px) scale(.45)`, opacity: .85 }], { duration: 480, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
    an.onfinish = an.oncancel = () => { dot.remove(); then(); };
  }
  function addAnimated(pid, opts, qty, fromEl) {
    const p = C.product(pid), k = add(pid, opts, qty); if (!k) return null;
    say((p ? p.name : 'Item') + ' added. ' + count() + ' item' + (count() === 1 ? '' : 's') + ' in your cart.');
    fly(fromEl, p && ['booker', 'lumi', 'zuri', 'bop'].includes(p.tone) ? p.tone : 'gold', () => { paintCount(true); open(fromEl); });
    return k;
  }

  if (hasDoc) {
    subs.push((why) => { paintCount(); if (drawer && !drawer.hidden) paintDrawer(); if (why !== 'add') { /* announce */ } });
    document.addEventListener('click', e => {
      const t = e.target && e.target.closest ? e.target : null; if (!t) return;
      const sh = t.closest('[data-sp-shop]'); if (sh) { e.preventDefault(); let a = ''; try { a = W.FFAudience && W.FFAudience.get ? W.FFAudience.get() : ''; } catch (_) { /* none */ } if (typeof W.go === 'function') W.go(a === 'families' ? 'kids-shop' : 'store'); return; }
      const op = t.closest('[data-sp-open]'); if (op) { e.preventDefault(); open(op); return; }
      const q = t.closest('[data-sp-qty]');
      if (q) { e.preventDefault(); const key = q.getAttribute('data-sp-qty'), it = items.find(i => keyOf(i.pid, i.opts) === key); if (it) { setQty(key, it.qty + (+q.dataset.d)); say('Quantity ' + (items.find(i => keyOf(i.pid, i.opts) === key) || { qty: 0 }).qty); } return; }
      const rm = t.closest('[data-sp-rm]'); if (rm) { e.preventDefault(); const p = C.product(rm.getAttribute('data-sp-rm').split('|')[0]); remove(rm.getAttribute('data-sp-rm')); say((p ? p.name : 'Item') + ' removed.'); return; }
      const cc = t.closest('[data-sp-clearcart]'); if (cc) { e.preventDefault(); clear(); say('Cart emptied.'); return; }
      const cl = t.closest('[data-sp-close]'); if (cl) { if (cl.hasAttribute('data-go')) close(false); else { e.preventDefault(); close(); } }
    }, true);
    document.addEventListener('keydown', e => {
      if (!isOpen()) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;
      const f = focusables(); if (!f.length) { e.preventDefault(); panel.focus(); return; }
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    document.addEventListener('submit', e => { if (e.target && e.target.closest && e.target.closest('[data-sp-promo]')) e.preventDefault(); }, true);
    const boot = () => { load(); ensureDom(); ensureButton(); paintCount(); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
    // wayfinding.js may redraw the header: put the button back
    (W.FFhooks = W.FFhooks || []).push(v => { const r = document.documentElement.classList; r.toggle('sp-onpdp', v === 'product'); r.toggle('sp-nopill', v === 'cart' || v === 'checkout' || v === 'order'); ensureButton(); paintCount(); });
  }

  const api = { swap, KEY, MAXQ, keyOf, add, addAnimated, setQty, remove, clear, load, lines, totals, shipping, count, subscribe, open, close, isOpen, bodyHtml, footHtml, paintCount, say,
    fmt, ico, imgTag, thumb, rooms, E, TAX_NOTE, saved: () => !!store.get(), _store: store, _items: () => items, _reset: () => { items = []; } };
  return api;
});
