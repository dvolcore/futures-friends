/* Futures Friends Store: the product page (#product/<id>). Swipeable gallery with a real zoom, options, quantity, price, what's in the box,
   dimensions, materials, care, safety and compliance notes, lead time, "pairs well with", FAQ accordion, a room-concept view for kits and
   a sticky buy bar on phones. A product that cannot be ordered yet (plush, print books, the small carpet) says so and offers "Notify me"
   instead of a button that does nothing. Loaded after store-shop.js. Sends nothing except the notify-me form, through the site's request gateway. */
(function () {
'use strict';
if (typeof V === 'undefined' || !window.FFShopUI) return;
const W = window, C = W.FFCatalog, K = W.FFCart, U = W.FFShopUI, E = K.E, ico = K.ico, imgTag = K.imgTag, lnk = U.lnk;
const EMAIL = 'info@futureslearningcenter.com';
let PS = { pid: '', opts: {}, qty: 1 };
const reduced = () => { try { return W.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return false; } };

// ------------------------------------------------------------------ gallery
function slideHtml(g, i, p, eager) {
  const room = g.kind === 'concept';
  return `<li class="sp-gal-slide"><button type="button" class="sp-gal-zoom${g.tile ? ' is-tile' : ''}${g.kind === 'sample' ? ' is-sample' : ''}" data-sp-zoom="${i}" aria-label="Zoom picture ${i + 1}: ${E(g.alt)}">
    ${imgTag(g, { eager: eager && i === 0, sizes: '(max-width:900px) 100vw, 640px', alt: g.alt })}</button>
    ${room ? U.badgeHtml('Concept image', 'concept') : g.kind === 'sample' ? U.badgeHtml('Concept sample', 'concept') : (g.tile ? U.badgeHtml('Product photo coming', 'ph') : '')}<span class="sp-gal-zi" aria-hidden="true">${ico('zoom')}</span></li>`;
}
function gallery(p) {
  const g = C.gallery(p, U.rooms()), roomAt = g.findIndex(x => x.kind === 'concept');
  const hasReal = g.some(x => x.kind === 'photo');
  return `<div class="sp-gal" data-sp-gal="${E(p.id)}" style="--tone:var(--${U.tone(p)});--tone-s:var(--${U.tone(p) === 'gold' ? 'cream' : U.tone(p) + '-s'})">
    <div class="sp-gal-main"><ul class="sp-gal-track" tabindex="0" aria-label="Pictures of ${E(p.name)}. Swipe, or use the arrow keys." data-sp-track>${g.map((x, i) => slideHtml(x, i, p, true)).join('')}</ul>
      ${g.length > 1 ? `<button type="button" class="sp-gal-nav sp-gal-prev" data-sp-gstep="-1" aria-label="Previous picture">${ico('back')}</button><button type="button" class="sp-gal-nav sp-gal-next" data-sp-gstep="1" aria-label="Next picture">${ico('next')}</button>` : ''}
      <span class="sp-gal-count" aria-live="polite" data-sp-gcount>1 / ${g.length}</span></div>
    ${g.length > 1 ? `<ul class="sp-gal-thumbs" aria-label="Choose a picture">${g.map((x, i) => `<li><button type="button" data-sp-thumb="${i}" aria-label="Show picture ${i + 1}"${i === 0 ? ' aria-current="true"' : ''}>${imgTag(x, { sizes: '84px', alt: '' })}</button></li>`).join('')}</ul>` : ''}
    <p class="sp-gal-cap" data-sp-gcap>${g[0].caption ? E(g[0].caption) : ''}</p>
    ${roomAt >= 0 ? `<div class="sp-room"><button type="button" class="btn soft" data-sp-room="${roomAt}">${ico('grid')} ${hasReal ? 'See it in a room' : 'See it in a real room'}</button>${lnk('room-planner', 'Plan it for your room ' + ico('arrow'), 'sp-link')}</div>` : ''}
  </div>`;
}

// ------------------------------------------------------------------ buy box
function optsHtml(p) {
  return p.options.map(o => `<fieldset class="sp-opt"><legend>${E(o.label)}</legend><div class="sp-opt-row">${o.values.map(v => `<label class="sp-radio"><input type="radio" name="spo-${E(o.key)}" value="${E(v.id)}" data-sp-opt="${E(o.key)}"${PS.opts[o.key] === v.id ? ' checked' : ''}><span>${E(v.label)}${typeof v.price === 'number' ? `<small class="sp-num">${C.fmt(v.price)}</small>` : ''}</span></label>`).join('')}</div>
    ${o.values.some(v => v.note) ? `<p class="sp-opt-note" data-sp-optnote="${E(o.key)}">${E((o.values.find(v => v.id === PS.opts[o.key]) || {}).note || '')}</p>` : ''}</fieldset>`).join('');
}
function ctaHtml(p) {
  if (C.canOrder(p)) {
    const quoted = p.priceState !== 'fixed';
    return `<div class="sp-buyrow"><div class="sp-step sp-step-lg" role="group" aria-label="Quantity"><button type="button" data-sp-pq="-1" aria-label="Fewer"${PS.qty <= 1 ? ' disabled' : ''}>${ico('minus')}</button><output aria-live="polite" data-sp-q>${PS.qty}</output><button type="button" data-sp-pq="1" aria-label="More">${ico('plus')}</button></div>
      <button type="button" class="btn gold sp-addbtn" data-sp-padd>${quoted ? 'Add to cart for a quote' : 'Add to cart'}</button></div>
      ${quoted ? '<p class="sp-buyhint">No public price yet. We price it in your written quote, with shipping, before anything is charged.</p>' : '<p class="sp-buyhint">Nothing is charged when you add it. You approve a written invoice first.</p>'}`;
  }
  if (p.cta === 'link') return `<div class="sp-buyrow">${lnk('printables', 'Open the printables ' + ico('arrow'), 'btn gold sp-addbtn')}</div><p class="sp-buyhint">Free to print at home or at the library. No account.</p>`;
  const read = p.edition === 'digital' ? `<p class="sp-buyhint">${lnk('story-time', 'Read this book online in Story Time', 'sp-link')}, free.</p>` : '';
  return `<div class="sp-notify" id="spNotify"><h2>${p.collection === 'books' ? 'Tell me when the print edition is ready' : p.kind === 'apparel' ? 'Tell me when it is ready' : 'Tell me when it opens'}</h2>
    <p class="sp-buyhint">${E(p.collection === 'books' ? 'There is no print edition yet.' : p.kind === 'plush' ? 'Plush cannot be ordered until its safety tests are done.' : p.sizesNote || 'It cannot be ordered yet.')} Leave your email and we write once, the day it opens. That is interest, not an order.</p>
    <form class="sp-notify-form" data-sp-notify="${E(p.id)}" novalidate><label class="f" for="spNn">Your name<input class="i" id="spNn" name="name" autocomplete="name"></label>
      <label class="f" for="spNe">Email<input class="i" id="spNe" name="email" type="email" autocomplete="email" aria-describedby="spNe-e"><span class="ffx-err" id="spNe-e" aria-live="polite"></span></label>
      ${p.kind === 'apparel' ? '<label class="f" for="spNs">Size you would want <span class="sp-opt-t">optional</span><input class="i" id="spNs" name="size" placeholder="For example 4T, youth M, adult L"></label>' : ''}
      <button class="btn gold" type="submit">Notify me</button></form><div data-sp-notify-out aria-live="polite"></div></div>${read}`;
}
function facts(p) {
  const ship = p.ships === 'freight' ? 'Ships by freight. The carrier cost for your ZIP code is quoted before you pay.' : p.ships === 'digital' || p.ships === 'none' ? 'Nothing ships.' : p.kind === 'kit' ? 'Shipping for the startup box and carpets is part of the package price.' : 'Ships by parcel. The cost is quoted on your invoice.';
  const rows = [['clock', 'Lead time', p.lead || 'Timing is confirmed in your written quote.']];
  if (p.ships !== 'none') rows.push(['truck', 'Shipping', p.kind === 'kit' ? 'Shipping for the startup box and carpets is part of the package price. Freight is arranged with you.' : ship]);
  rows.push(['shield', 'Returns', 'Returns and refunds: ' + C.DRAFT + '. Made-to-order items are not returnable unless damaged or wrong.']);
  return `<ul class="sp-facts">${rows.map(r => `<li>${ico(r[0])}<div><b>${E(r[1])}</b><span>${E(r[2])}</span></div></li>`).join('')}</ul>`;
}
/* E1 (release-truth.js): every item says what is delivered today, when it starts and how it bills. Nothing here ships before it exists. */
const ASSET = { carpet: 'carpet', bundle: 'carpet', addon: 'carpet', kit: 'carpet', poster: 'posters', plush: 'plush', apparel: 'merch-pod', book: 'book-1', family: 'printables-family-en', material: 'zone-signs' };
function termsLine(p) {
  const R = W.FFRelease; if (!R || !R.terms) return '';
  return p.tier ? R.terms(p.tier, undefined, { compact: true }) : R.terms('store', [[p.name, p.kind === 'book' ? 'book-' + p.bookNo : (ASSET[p.kind] || 'merch-pod')]], { compact: true });
}
const ul = a => `<ul>${a.map(x => `<li>${E(x)}</li>`).join('')}</ul>`;
function accordion(p) {
  const S = [['In the box', p.box.length && ul(p.box)], ['Dimensions', p.dims.length && ul(p.dims)], ['Materials', p.materials.length && ul(p.materials)], ['Care', p.care.length && ul(p.care)],
    ['Safety and compliance', p.safety.length && ul(p.safety)]].filter(s => s[1]);
  return `<div class="sp-acc">${S.map((s, i) => `<details${i === 0 ? ' open' : ''}><summary>${E(s[0])}${ico('down')}</summary><div class="sp-acc-b">${s[1]}</div></details>`).join('')}</div>`;
}
function faq(p) {
  const f = p.faq.filter(Boolean); if (!f.length) return '';
  return `<section class="sp-faq" aria-labelledby="spFaqH"><div class="wrap sp-narrow"><h2 id="spFaqH">Questions</h2><div class="sp-acc">${f.map(q => `<details><summary>${E(q[0])}${ico('down')}</summary><div class="sp-acc-b"><p>${E(q[1])}</p></div></details>`).join('')}</div></div></section>`;
}
function membershipLine(p) {
  if (!p.membership) return '';
  return `<p class="sp-member">Monthly membership for this tier is <b class="sp-num">$${p.membership.monthly}</b> a month, set up separately. ${lnk('membership', 'About membership', 'sp-link')}</p>`;
}
const kitLinks = p => (p.kind === 'kit' || p.kind === 'addon') ? `<div class="sp-kitlinks">${lnk('room-kit', 'See the Learning Zones Kit ' + ico('arrow'), 'sp-link')}${lnk('room-planner', 'Open the Room Planner ' + ico('arrow'), 'sp-link')}</div>` : '';

V.product = () => {
  const p = C.product(typeof arg === 'string' ? arg : '');
  if (!p) return `<div class="sp"><header class="sp-pagehead"><div class="wrap"><h1>We could not find that product</h1><p class="sp-lede">It may have moved. Everything we sell is in the store.</p><div class="sp-hero-acts">${lnk('store', 'Back to the store', 'btn gold')}</div></div></header></div>`;
  if (PS.pid !== p.id) PS = { pid: p.id, opts: C.defaultOpts(p), qty: 1 };
  const col = C.collection(p.collection), back = p.collection === 'kids' ? ['kids-shop', 'Kids’ Shop'] : ['shop/' + col.id, col.name];
  const pairs = p.pairs.map(C.product).filter(Boolean).slice(0, 3);
  const t = U.tone(p);
  const buyable = C.canOrder(p) || p.cta === 'notify';
  return `<div class="sp sp-pdp" style="--tone:var(--${t});--tone-s:var(--${t === 'gold' ? 'cream' : t + '-s'})">
   <div class="wrap">${U.crumbs([['store', 'Futures Store'], back, ['', p.name]])}
   <div class="sp-pdp-grid">${gallery(p)}
    <div class="sp-info"><h1>${E(p.name)}</h1>
     <div class="sp-info-price" data-sp-pricewrap>${U.priceBlock(p, { big: true, opts: PS.opts })}</div>
     ${membershipLine(p)}
     <p class="sp-info-lede">${E(p.description || p.short)}</p>
     <div class="sp-info-badges">${p.badges.filter(b => !/^Concept/.test(b)).map(b => U.badgeHtml(b, /safety|Sizes/i.test(b) ? 'hold' : /Digital|Print/.test(b) ? 'soft' : '')).join('')}</div>
     <div class="sp-buy" id="spBuy">${optsHtml(p)}${ctaHtml(p)}</div>
     ${facts(p)}${termsLine(p)}${kitLinks(p)}
     ${accordion(p)}
    </div></div></div>
   ${faq(p)}
   ${pairs.length ? `<section class="sp-pairs" aria-labelledby="spPairH"><div class="wrap"><h2 id="spPairH">Pairs well with</h2><ul class="sp-grid sp-grid-3">${pairs.map(x => U.card(x)).join('')}</ul></div></section>` : ''}
   ${buyable ? `<div class="sp-buybar" data-sp-buybar aria-hidden="true" inert><div class="sp-buybar-in"><div class="sp-buybar-t"><b>${E(p.name)}</b><span data-sp-barprice>${E(C.priceText(p, PS.opts))}</span></div>
     ${C.canOrder(p) ? `<button type="button" class="btn gold" data-sp-padd tabindex="-1">Add to cart</button>` : `<a class="btn gold" href="#spNotify" data-sp-jump="spNotify" tabindex="-1">Notify me</a>`}</div></div>` : ''}
  </div>`;
};

// ------------------------------------------------------------------ behaviour (delegated)
function slides(track) { return [...track.children]; }
function currentIdx(track) { const w = track.clientWidth || 1; return Math.max(0, Math.min(track.children.length - 1, Math.round(track.scrollLeft / w))); }
function syncGal(gal) {
  const track = gal.querySelector('[data-sp-track]'); if (!track) return;
  const i = currentIdx(track), n = track.children.length, p = C.product(gal.dataset.spGal), g = C.gallery(p, U.rooms());
  const c = gal.querySelector('[data-sp-gcount]'); if (c) c.textContent = (i + 1) + ' / ' + n;
  gal.querySelectorAll('[data-sp-thumb]').forEach((b, k) => { if (k === i) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
  const cap = gal.querySelector('[data-sp-gcap]'); if (cap) cap.textContent = (g[i] && g[i].caption) || '';
}
function goSlide(gal, i, smooth) {
  const track = gal.querySelector('[data-sp-track]'); if (!track) return;
  const n = track.children.length; i = Math.max(0, Math.min(n - 1, i));
  track.scrollTo({ left: i * track.clientWidth, behavior: smooth && !reduced() ? 'smooth' : 'auto' }); syncGal(gal);
}
function paintBuy() {
  const p = C.product(PS.pid); if (!p) return;
  const pw = document.querySelector('[data-sp-pricewrap]'); if (pw) pw.innerHTML = U.priceBlock(p, { big: true, opts: PS.opts });
  const bp = document.querySelector('[data-sp-barprice]'); if (bp) bp.textContent = C.priceText(p, PS.opts);
  p.options.forEach(o => { const n = document.querySelector(`[data-sp-optnote="${o.key}"]`); if (n) n.textContent = (o.values.find(v => v.id === PS.opts[o.key]) || {}).note || ''; });
  const q = document.querySelector('[data-sp-q]'); if (q) q.textContent = PS.qty;
  const minus = document.querySelector('[data-sp-pq="-1"]'); if (minus) minus.disabled = PS.qty <= 1;
}
let zoomDlg = null, zoomState = { pid: '', i: 0 };
function zoomPaint() {
  const p = C.product(zoomState.pid), g = C.gallery(p, U.rooms()), x = g[zoomState.i]; if (!x) return;
  const best = x.srcset[x.srcset.length - 1];
  zoomDlg.querySelector('.sp-zoom-stage').innerHTML = `<img class="sp-zoom-img" src="${E(best[0])}" alt="${E(x.alt)}" width="${x.w}" height="${x.h}" draggable="false">`;
  zoomDlg.querySelector('[data-sp-zcount]').textContent = (zoomState.i + 1) + ' / ' + g.length;
  zoomDlg.querySelector('.sp-zoom-cap').textContent = x.caption || x.alt;
  zoomDlg.querySelectorAll('[data-sp-zstep]').forEach(b => { b.hidden = g.length < 2; });
  zoomDlg.classList.remove('is-zoom');
}
function openZoom(pid, i, from) {
  if (typeof HTMLDialogElement === 'undefined') return;
  if (!zoomDlg) {
    zoomDlg = document.createElement('dialog'); zoomDlg.className = 'sp-zoom'; zoomDlg.setAttribute('aria-label', 'Zoomed picture');
    zoomDlg.innerHTML = `<div class="sp-zoom-bar"><span class="sp-zoom-count" data-sp-zcount aria-live="polite"></span>
      <div><button type="button" class="sp-zoom-b" data-sp-zstep="-1" aria-label="Previous picture">${ico('back')}</button><button type="button" class="sp-zoom-b" data-sp-zstep="1" aria-label="Next picture">${ico('next')}</button>
      <button type="button" class="sp-zoom-b" data-sp-ztoggle aria-pressed="false" aria-label="Zoom in or out">${ico('zoom')}</button><button type="button" class="sp-zoom-b" data-sp-zclose aria-label="Close">${ico('x')}</button></div></div>
      <div class="sp-zoom-stage" data-sp-zstage></div><p class="sp-zoom-cap"></p>`;
    document.body.appendChild(zoomDlg);
    zoomDlg.addEventListener('close', () => { if (zoomDlg._from && document.contains(zoomDlg._from)) zoomDlg._from.focus({ preventScroll: true }); });
    zoomDlg.addEventListener('click', e => { if (e.target === zoomDlg) zoomDlg.close(); });
    zoomDlg.addEventListener('keydown', e => { if (e.key === 'ArrowRight') zoomStep(1); else if (e.key === 'ArrowLeft') zoomStep(-1); });
  }
  zoomState = { pid, i }; zoomDlg._from = from; zoomPaint(); zoomDlg.showModal();
}
function zoomStep(d) { const g = C.gallery(C.product(zoomState.pid), U.rooms()); zoomState.i = (zoomState.i + d + g.length) % g.length; zoomPaint(); }
function toggleZoom() { const on = zoomDlg.classList.toggle('is-zoom'); const b = zoomDlg.querySelector('[data-sp-ztoggle]'); b.setAttribute('aria-pressed', String(on)); const st = zoomDlg.querySelector('.sp-zoom-stage'); if (on) { st.scrollLeft = (st.scrollWidth - st.clientWidth) / 2; st.scrollTop = (st.scrollHeight - st.clientHeight) / 2; } }

document.addEventListener('click', e => {
  const t = e.target && e.target.closest ? e.target : null; if (!t) return;
  const th = t.closest('[data-sp-thumb]'); if (th) { goSlide(th.closest('[data-sp-gal]'), +th.dataset.spThumb, true); return; }
  const st = t.closest('[data-sp-gstep]'); if (st) { const gal = st.closest('[data-sp-gal]'); goSlide(gal, currentIdx(gal.querySelector('[data-sp-track]')) + (+st.dataset.spGstep), true); return; }
  const rm = t.closest('[data-sp-room]'); if (rm) { const gal = document.querySelector('[data-sp-gal]'); goSlide(gal, +rm.dataset.spRoom, true); gal.scrollIntoView({ block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' }); return; }
  const z = t.closest('[data-sp-zoom]'); if (z) { const gal = z.closest('[data-sp-gal]'); openZoom(gal.dataset.spGal, +z.dataset.spZoom, z); return; }
  const zs = t.closest('[data-sp-zstep]'); if (zs) { zoomStep(+zs.dataset.spZstep); return; }
  if (t.closest('[data-sp-ztoggle]')) { toggleZoom(); return; }
  if (t.closest('[data-sp-zclose]')) { zoomDlg.close(); return; }
  if (zoomDlg && t.closest('.sp-zoom-img') && zoomDlg.open) { toggleZoom(); return; }
  const pq = t.closest('[data-sp-pq]'); if (pq) { PS.qty = Math.max(1, Math.min(K.MAXQ, PS.qty + (+pq.dataset.spPq))); paintBuy(); return; }
  const pa = t.closest('[data-sp-padd]'); if (pa) { e.preventDefault(); const p = C.product(PS.pid); if (p) K.addAnimated(p.id, PS.opts, PS.qty, pa.closest('.sp-buybar') ? pa : (document.querySelector('.sp-addbtn') || pa)); return; }
  const j = t.closest('[data-sp-jump]'); if (j) { e.preventDefault(); const el = document.getElementById(j.dataset.spJump); if (el) { el.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'center' }); const f = el.querySelector('input'); if (f) f.focus({ preventScroll: true }); } }
}, true);
document.addEventListener('change', e => {
  const o = e.target && e.target.closest && e.target.closest('[data-sp-opt]'); if (!o) return;
  PS.opts[o.dataset.spOpt] = o.value; paintBuy();
});
document.addEventListener('scroll', e => {
  const t = e.target; if (!t || !t.matches || !t.matches('[data-sp-track]')) return;
  if (t._r) return; t._r = 1; (W.requestAnimationFrame || setTimeout)(() => { t._r = 0; syncGal(t.closest('[data-sp-gal]')); });
}, true);
document.addEventListener('keydown', e => {
  const t = e.target && e.target.matches && e.target.matches('[data-sp-track]') ? e.target : null; if (!t) return;
  const gal = t.closest('[data-sp-gal]');
  if (e.key === 'ArrowRight') { e.preventDefault(); goSlide(gal, currentIdx(t) + 1, true); } else if (e.key === 'ArrowLeft') { e.preventDefault(); goSlide(gal, currentIdx(t) - 1, true); }
});

// notify me: one small form through the request gateway; never pretends
document.addEventListener('submit', async e => {
  const f = e.target && e.target.closest && e.target.closest('[data-sp-notify]'); if (!f) return;
  e.preventDefault();
  const p = C.product(f.dataset.spNotify), out = f.parentNode.querySelector('[data-sp-notify-out]'), name = f.elements.name.value.trim(), email = f.elements.email.value.trim();
  const err = document.getElementById('spNe-e'), ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  if (err) err.textContent = ok ? '' : 'Enter a valid email address.'; f.elements.email.setAttribute('aria-invalid', ok ? 'false' : 'true');
  if (!ok) { f.elements.email.focus(); return; }
  const I = W.FFIntake, msg = 'Please notify me when this opens: ' + p.name + ' (' + p.id + ').' + (f.elements.size && f.elements.size.value.trim() ? ' Size I would want: ' + f.elements.size.value.trim() + '.' : '');
  const off = () => { out.innerHTML = `<div class="sp-note-box" role="status"><b>Notify-me opens soon.</b><p>We have not turned on online requests yet, so nothing was sent. Email <a class="rl" href="mailto:${EMAIL}?subject=${encodeURIComponent('Notify me: ' + p.name)}&body=${encodeURIComponent(msg)}">${EMAIL}</a> or call ${U.PHONE} and we will add you by hand.</p></div>`; };
  if (!I || !I.enabled || !I.enabled()) return off();
  const btn = f.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'Sending...';
  const r = await I.submit('contact', { name: name || 'Store visitor', email, message: msg, website: '', zip: '' });
  btn.disabled = false; btn.textContent = 'Notify me';
  if (r.ok) { f.hidden = true; out.innerHTML = `<div class="sp-note-box sp-ok" role="status" tabindex="-1"><b>Got it.</b><p>We will write to ${E(email)} the day ${E(p.name)} opens. Reference ${E(r.ref || '')}.</p></div>`; }
  else if (r.unavailable) off();
  else out.innerHTML = `<div class="sp-note-box sp-bad" role="alert"><b>Nothing was sent.</b><p>${E(r.message || 'Please try again, or call ' + U.PHONE + '.')}</p></div>`;
}, true);

// sticky buy bar on phones: shows once the main buy box has scrolled away
let io = null;
(W.FFhooks = W.FFhooks || []).push(v => {
  if (io) { io.disconnect(); io = null; }
  if (v !== 'product') return;
  const buy = document.getElementById('spBuy'), bar = document.querySelector('[data-sp-buybar]'); if (!buy || !bar || typeof IntersectionObserver !== 'function') return;
  io = new IntersectionObserver(en => {
    const off = !en[0].isIntersecting && en[0].boundingClientRect.top < 0 || (!en[0].isIntersecting && en[0].boundingClientRect.top > innerHeight);
    bar.classList.toggle('is-on', off); bar.setAttribute('aria-hidden', String(!off));
    if (off) bar.removeAttribute('inert'); else bar.setAttribute('inert', '');
    bar.querySelectorAll('a,button').forEach(b => b.tabIndex = off ? 0 : -1);
  }, { threshold: 0 });
  io.observe(buy);
});
})();
