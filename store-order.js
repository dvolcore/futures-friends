/* Futures Friends Store: the cart page (#cart), checkout (#checkout), the order confirmation (#order) and the Stripe/Shopify return page (#order-return).
   Loaded after store-product.js. Checkout talks only to window.FFCheckout (store-checkout.js), which is provider-agnostic:
   request mode (default) sends an order REQUEST through the site's request gateway; stripe and shopify modes redirect to the provider.
   Honesty rules: no screen here ever says "payment successful". Request mode says "Request received, we'll confirm availability and send an invoice."
   Where the request gateway is off it says so and gives the visitor the order summary to copy, email, call in or print.
   Privacy: the form is kept in memory only. Only the cart (product ids, options, quantities) is saved on this device. */
(function () {
'use strict';
if (typeof V === 'undefined' || !window.FFShopUI || !window.FFCheckout) return;
const W = window, C = W.FFCatalog, K = W.FFCart, U = W.FFShopUI, X = W.FFCheckout, E = K.E, ico = K.ico, lnk = U.lnk, fmt = C.fmt;
const PHONE = U.PHONE, EMAIL = X.EMAIL;
const STATES = ['MO', 'KS', 'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'];

// ------------------------------------------------------------------ cart page
V.cart = () => {
  const n = K.count();
  return `<div class="sp sp-cartpage"><header class="sp-pagehead"><div class="wrap">${U.crumbs([['store', 'Futures Store'], ['', 'Bag']])}<h1>Your bag</h1>
    <p class="sp-lede">${n ? n + (n === 1 ? ' item' : ' items') + ', saved on this device. Nothing is charged until you approve a written invoice.' : 'Nothing here yet.'}</p></div></header>
    <div class="wrap sp-shell"><div class="sp-cartwrap" data-sp-cartpage>${K.bodyHtml('page')}</div></div></div>`;
};
K.subscribe(() => { const box = document.querySelector('[data-sp-cartpage]'); if (box && typeof view !== 'undefined' && view === 'cart') { K.swap(box, K.bodyHtml('page')); const l = document.querySelector('.sp-cartpage .sp-lede'); const n = K.count(); if (l) l.textContent = n ? n + (n === 1 ? ' item' : ' items') + ', saved on this device. Nothing is charged until you approve a written invoice.' : 'Nothing here yet.'; } });

// ------------------------------------------------------------------ checkout
const blank = () => ({ step: 1, path: '', name: '', email: '', phone: '', org: '', orgType: 'center', po: '', taxExempt: false, taxCert: '', taxState: 'MO',
  ship: { line1: '', line2: '', city: '', state: 'MO', zip: '' }, pay: 'invoice', notes: '', errors: {}, busy: false, error: '', result: null });
let CK = blank();
const defPath = () => (U.aud() === 'families' ? 'family' : 'center');
const err = f => `<span class="ffx-err" id="ck-${f}-e" aria-live="polite">${E(CK.errors[f] || '')}</span>`;
const inv = f => (CK.errors[f] ? ' aria-invalid="true"' : '');
function field(id, label, val, o) {
  o = o || {};
  return `<label class="f${o.wide ? ' sp-wide-f' : ''}" for="ck-${id}">${E(label)}${o.opt ? ' <span class="sp-opt-t">optional</span>' : ''}<input class="i" id="ck-${id}" name="${id}" ${o.ship ? 'data-ck-ship' : 'data-ck'}="${o.key || id}" value="${E(val)}" type="${o.type || 'text'}"${o.auto ? ` autocomplete="${o.auto}"` : ''}${o.mode ? ` inputmode="${o.mode}"` : ''}${o.max ? ` maxlength="${o.max}"` : ''} aria-describedby="ck-${id}-e"${inv(id)}>${err(id)}</label>`;
}
const needsShip = () => X.needsShipping(K.lines());
function payInfo() {
  const am = X.activeMode();
  if (am.mode === 'stripe') return { send: CK.path === 'center' && CK.pay === 'invoice' ? 'Request invoice' : 'Continue to secure payment', note: 'Card payments are handled on Stripe’s own page. We never see or store your card number.' };
  if (am.mode === 'shopify') return { send: 'Continue to secure checkout', note: 'Payment is handled on the shop’s own secure page.' };
  if (!X.canSendOnline()) return { send: 'Get my order summary', note: 'Online ordering is not switched on yet, so nothing is sent from this page and nothing is charged. You get an order summary to email, copy, print or call in.' };
  return { send: 'Send order request', note: 'This sends a request, not a payment. Nothing is charged. We confirm availability and shipping, then send an invoice.' };
}
function details() {
  const center = CK.path === 'center', ls = K.lines();
  return `<form class="sp-ck" id="spCkForm" novalidate data-sp-ckform>
    ${Object.keys(CK.errors).length ? `<div class="sp-ck-sum" role="alert" tabindex="-1" id="ckSum"><b>A few things need a look.</b><ul>${Object.entries(CK.errors).map(([k, m]) => `<li><a href="#ck-${k}" data-ck-jump="ck-${k}">${E(m)}</a></li>`).join('')}</ul></div>` : ''}
    <fieldset class="sp-fs"><legend>Who is ordering?</legend><div class="sp-seg" role="radiogroup">
      <label class="sp-radio"><input type="radio" name="ckpath" value="center" data-ck-path${center ? ' checked' : ''}><span>Center or program<small>Child care center, home daycare, church</small></span></label>
      <label class="sp-radio"><input type="radio" name="ckpath" value="family" data-ck-path${!center ? ' checked' : ''}><span>Family<small>Ordering for home</small></span></label></div></fieldset>
    <fieldset class="sp-fs"><legend>Contact</legend><div class="sp-fgrid">
      ${field('name', 'Your name', CK.name, { auto: 'name', wide: true })}${field('email', 'Email', CK.email, { type: 'email', auto: 'email' })}${field('phone', 'Phone', CK.phone, { type: 'tel', auto: 'tel', opt: true })}</div></fieldset>
    ${center ? `<fieldset class="sp-fs"><legend>Your program</legend><div class="sp-fgrid">
      ${field('org', 'Center, home daycare or church name', CK.org, { auto: 'organization', wide: true })}
      <label class="f" for="ck-orgType">Program type<select class="i" id="ck-orgType" data-ck="orgType">${[['center', 'Child care center'], ['home', 'Licensed home daycare'], ['church', 'Church or faith program']].map(o => `<option value="${o[0]}"${CK.orgType === o[0] ? ' selected' : ''}>${o[1]}</option>`).join('')}</select></label>
      ${field('po', 'PO number', CK.po, { opt: true, key: 'po' })}</div>
      <div class="sp-tax"><label class="sp-check"><input type="checkbox" data-ck-tax${CK.taxExempt ? ' checked' : ''}> <span>We are tax-exempt (center, school or church)</span></label>
        <div class="sp-tax-b"${CK.taxExempt ? '' : ' hidden'}><div class="sp-fgrid">${field('taxCert', 'Exemption certificate number', CK.taxCert, { key: 'taxCert' })}
          <label class="f" for="ck-taxState">State<select class="i" id="ck-taxState" data-ck="taxState">${['MO', 'KS'].concat(STATES.slice(2)).map(s => `<option${CK.taxState === s ? ' selected' : ''}>${s}</option>`).join('')}</select></label></div>
          <label class="f sp-file" for="ck-file">Certificate file <span class="sp-opt-t">upload opens with online ordering</span><input class="i" id="ck-file" type="file" disabled aria-describedby="ck-file-n"></label>
          <p class="sp-fnote" id="ck-file-n">Until then, email the certificate to <a class="rl" href="mailto:${EMAIL}">${EMAIL}</a> and quote your order reference. Tax is not removed until we have it on file.</p></div></div></fieldset>` : ''}
    ${needsShip() ? `<fieldset class="sp-fs"><legend>Ship to</legend><div class="sp-fgrid">
      ${field('line1', 'Street address', CK.ship.line1, { ship: true, auto: 'address-line1', wide: true })}${field('line2', 'Suite or room', CK.ship.line2, { ship: true, auto: 'address-line2', opt: true, wide: true })}
      ${field('city', 'City', CK.ship.city, { ship: true, auto: 'address-level2' })}
      <label class="f" for="ck-state">State<select class="i" id="ck-state" data-ck-ship="state" autocomplete="address-level1">${STATES.map(s => `<option${CK.ship.state === s ? ' selected' : ''}>${s}</option>`).join('')}</select>${err('state')}</label>
      ${field('zip', 'ZIP code', CK.ship.zip, { ship: true, auto: 'postal-code', mode: 'numeric', max: 10 })}</div>
      <p class="sp-fnote">${ls.some(l => l.p.ships === 'freight') ? 'Rugs, mats and fences ship by freight. Tell us in the notes if there is no loading dock, a long carry or a stairs-only entrance, so the quote is right.' : 'The shipping cost is quoted on your invoice.'}</p></fieldset>` : ''}
    <fieldset class="sp-fs"><legend>How would you like to proceed?</legend>${center
      ? `<div class="sp-seg sp-seg-v" role="radiogroup"><label class="sp-radio"><input type="radio" name="ckpay" value="invoice" data-ck-pay${CK.pay === 'invoice' ? ' checked' : ''}><span>Pay by invoice<small>We send an invoice. Net terms are confirmed in your quote, and your PO number goes on it.</small></span></label>
        <label class="sp-radio"><input type="radio" name="ckpay" value="quote" data-ck-pay${CK.pay === 'quote' ? ' checked' : ''}><span>Request a quote first<small>Get written prices and shipping, then decide.</small></span></label></div>`
      : `<p class="sp-fnote sp-fnote-lg">We confirm availability, then send an invoice or a secure payment link. You decide after you see the final price.</p>`}</fieldset>
    <label class="f" for="ck-notes">Notes <span class="sp-opt-t">optional</span><textarea class="i" id="ck-notes" data-ck="notes" rows="3" maxlength="1000" placeholder="Room size, delivery dock, when you open, anything we should know">${E(CK.notes)}</textarea></label>
    <div class="sp-ck-acts"><button class="btn gold sp-wide" type="submit">Review your order ${ico('arrow')}</button>${lnk('cart', 'Back to bag', 'btn soft')}</div>
    <p class="sp-fnote">${E(payInfo().note)}</p></form>`;
}
function reviewLines() {
  return `<ul class="sp-rv-lines">${K.lines().map(l => `<li><span class="sp-rv-t">${E(l.p.name)}${l.label ? `<small>${E(l.label)}</small>` : ''}</span><span class="sp-rv-q sp-num">x ${l.qty}</span><span class="sp-rv-p sp-num">${l.quote ? 'To be quoted' : fmt(l.total)}</span></li>`).join('')}</ul>`;
}
function review() {
  const o = X.buildOrder(K.lines(), toCustomer(), 'preview'), pay = payInfo();
  return `<div class="sp-ck sp-review">
    ${CK.error ? `<div class="sp-ck-sum sp-bad" role="alert" tabindex="-1" id="ckSum"><b>Nothing was sent.</b><p>${E(CK.error)}</p></div>` : ''}
    <section class="sp-rv"><h2>Review your order</h2>
      <dl class="sp-rv-dl"><div><dt>Who</dt><dd>${E(o.customer.name)}${o.customer.org ? ', ' + E(o.customer.org) : ''}<br>${E(o.customer.email)}${o.customer.phone ? ' · ' + E(o.customer.phone) : ''}</dd></div>
      ${o.shipTo ? `<div><dt>Ship to</dt><dd>${E(o.shipTo.line1)}${o.shipTo.line2 ? ', ' + E(o.shipTo.line2) : ''}<br>${E(o.shipTo.city)}, ${E(o.shipTo.state)} ${E(o.shipTo.zip)}</dd></div>` : ''}
      ${o.po ? `<div><dt>PO number</dt><dd>${E(o.po)}</dd></div>` : ''}
      ${o.taxExempt.claimed ? `<div><dt>Tax-exempt</dt><dd>Certificate ${E(o.taxExempt.certificate)} (${E(o.taxExempt.state)}). Email the certificate to ${EMAIL}.</dd></div>` : ''}
      <div><dt>Proceed</dt><dd>${o.path === 'center' ? (o.payment === 'invoice' ? 'Pay by invoice' : 'Request a quote first') : (X.canSendOnline() ? 'Send an order request' : 'Order summary to email or call in')}</dd></div>
      ${o.notes ? `<div><dt>Notes</dt><dd>${E(o.notes)}</dd></div>` : ''}</dl>
      <button type="button" class="sp-link" data-ck-edit>Edit details</button></section>
    <section class="sp-rv"><h2>Items</h2>${reviewLines()}</section>
    <div class="sp-ck-acts"><button type="button" class="btn gold sp-wide" data-ck-place${CK.busy ? ' disabled aria-busy="true"' : ''}>${CK.busy ? (X.canSendOnline() ? 'Sending...' : 'Preparing...') : E(pay.send)}</button><button type="button" class="btn soft" data-ck-edit>Back</button></div>
    <p class="sp-fnote">${E(pay.note)} ${E(C.DRAFT)}: <button type="button" class="rl" data-go="terms">terms of sale</button> and returns.</p></div>`;
}
function aside() {
  const ls = K.lines(), t = K.totals(ls), sh = K.shipping(t);
  return `<aside class="sp-ck-aside" aria-label="Order summary"><h2>Order summary</h2>
    <ul class="sp-aside-lines">${ls.map(l => `<li><span class="sp-aside-img" aria-hidden="true">${K.thumb(l.p)}<b class="sp-num">${l.qty}</b></span><span class="sp-aside-t">${E(l.p.name)}${l.label ? `<small>${E(l.label)}</small>` : ''}</span><span class="sp-num">${l.quote ? 'Quote' : fmt(l.total)}</span></li>`).join('')}</ul>
    <dl class="sp-totals"><div><dt>Subtotal${t.quoteCount ? ' (priced)' : ''}</dt><dd class="sp-num">${t.pricedCount ? fmt(t.subtotal) : 'None priced yet'}</dd></div><div><dt>Shipping <span class="sp-est">Estimate</span></dt><dd>${E(sh.label)}</dd></div><div><dt>Sales tax</dt><dd>On your invoice</dd></div></dl>
    ${t.quoteCount ? `<p class="sp-note">${t.quoteCount} item${t.quoteCount === 1 ? '' : 's'} priced in your written quote.</p>` : ''}
    <p class="sp-note">${E(K.TAX_NOTE)}</p></aside>`;
}
const stepper = () => `<ol class="sp-steps" aria-label="Checkout steps"><li${CK.step === 1 ? ' aria-current="step"' : ''} class="${CK.step > 1 ? 'is-done' : ''}"><span>1</span> Details</li><li${CK.step === 2 ? ' aria-current="step"' : ''}><span>2</span> Review</li><li><span>3</span> ${X.canSendOnline() ? 'Request sent' : 'Your summary'}</li></ol>`;
V.checkout = () => {
  if (!CK.path) CK.path = defPath();
  if (!K.lines().length) return `<div class="sp sp-checkout"><header class="sp-pagehead"><div class="wrap"><h1>Checkout</h1></div></header><div class="wrap sp-shell">${K.bodyHtml('page')}</div></div>`;
  const am = X.activeMode();
  return `<div class="sp sp-checkout"><header class="sp-pagehead"><div class="wrap">${U.crumbs([['store', 'Futures Store'], ['cart', 'Bag'], ['', 'Checkout']])}<h1>Checkout</h1>${stepper()}
    ${am.mode === 'request' ? `<p class="sp-lede sp-lede-s">${X.canSendOnline() ? 'Online payment is not open yet, so this sends an order request. We reply with availability, shipping and an invoice.' : 'Online ordering is not open yet. You will get your order summary to email, copy, print or call in. Nothing is sent from this page and nothing is charged.'}</p>` : ''}</div></header>
    <div class="wrap sp-shell sp-ckgrid"><div id="spCk" data-sp-ck>${CK.step === 1 ? details() : review()}</div>${aside()}</div></div>`;
};
function toCustomer() { return { path: CK.path, name: CK.name, email: CK.email, phone: CK.phone, org: CK.org, orgType: CK.orgType, po: CK.po, taxExempt: CK.taxExempt, taxCert: CK.taxCert, taxState: CK.taxState, ship: CK.ship, pay: CK.pay, notes: CK.notes }; }
function repaintCk(focusId) {
  const box = document.getElementById('spCk'); if (!box) return;
  box.innerHTML = CK.step === 1 ? details() : review();
  const st = document.querySelector('.sp-steps'); if (st) st.outerHTML = stepper();
  const f = (focusId && document.getElementById(focusId)) || document.getElementById('ckSum');
  if (f) f.focus({ preventScroll: !document.getElementById('ckSum') || focusId });
  if (!focusId && CK.step === 2) box.scrollIntoView({ block: 'start', behavior: 'auto' });
}
document.addEventListener('input', e => {
  const t = e.target; if (!t || !t.dataset) return;
  if (t.dataset.ck !== undefined && t.dataset.ck !== '') { CK[t.dataset.ck] = t.value; if (CK.errors[t.id.replace('ck-', '')]) { delete CK.errors[t.id.replace('ck-', '')]; const o = document.getElementById(t.id + '-e'); if (o) o.textContent = ''; t.removeAttribute('aria-invalid'); } }
  else if (t.dataset.ckShip !== undefined) { CK.ship[t.dataset.ckShip] = t.value; const id = t.id.replace('ck-', ''); if (CK.errors[id]) { delete CK.errors[id]; const o = document.getElementById(t.id + '-e'); if (o) o.textContent = ''; t.removeAttribute('aria-invalid'); } }
});
document.addEventListener('change', e => {
  const t = e.target; if (!t || !t.dataset) return;
  if (t.dataset.ck !== undefined && t.tagName === 'SELECT') CK[t.dataset.ck] = t.value;
  else if (t.dataset.ckShip !== undefined && t.tagName === 'SELECT') CK.ship[t.dataset.ckShip] = t.value;
  else if (t.hasAttribute('data-ck-path')) { CK.path = t.value; CK.errors = {}; repaintCk('ck-path-' + t.value); const r = document.querySelector(`[data-ck-path][value="${t.value}"]`); if (r) r.focus({ preventScroll: true }); }
  else if (t.hasAttribute('data-ck-pay')) CK.pay = t.value;
  else if (t.hasAttribute('data-ck-tax')) { CK.taxExempt = t.checked; const b = document.querySelector('.sp-tax-b'); if (b) b.hidden = !t.checked; }
});
document.addEventListener('submit', e => {
  const f = e.target && e.target.closest && e.target.closest('[data-sp-ckform]'); if (!f) return;
  e.preventDefault();
  CK.errors = X.validate(toCustomer(), K.lines());
  if (Object.keys(CK.errors).length) { repaintCk(); return; }
  CK.step = 2; CK.error = ''; repaintCk();
}, true);
async function place() {
  if (CK.busy) return;
  CK.busy = true; CK.error = ''; repaintCk();
  const order = X.buildOrder(K.lines(), toCustomer());
  let r; try { r = await X.submit(order); } catch (_) { r = { status: 'error', message: 'Something went wrong on our side. Nothing was sent or charged.', order }; }
  CK.busy = false;
  if (r.status === 'redirect' && r.url) { CK.result = r; K.say('Taking you to secure checkout.'); location.href = r.url; return; }
  if (r.status === 'received' || r.status === 'gateway_off') { CK.result = r; if (r.status === 'received') K.clear(); go('order'); return; }
  CK.error = r.message || 'We could not send the request. Nothing was sent.'; if (r.errors) CK.error += ' ' + Object.values(r.errors).join(' ');
  repaintCk();
}
document.addEventListener('click', e => {
  const t = e.target && e.target.closest ? e.target : null; if (!t) return;
  if (t.closest('[data-ck-place]')) { e.preventDefault(); place(); return; }
  if (t.closest('[data-ck-edit]')) { e.preventDefault(); CK.step = 1; CK.error = ''; repaintCk(); return; }
  const j = t.closest('[data-ck-jump]'); if (j) { e.preventDefault(); const el = document.getElementById(j.dataset.ckJump); if (el) el.focus(); return; }
  const cp = t.closest('[data-ck-copy]');
  if (cp) { const txt = CK.result ? X.summaryText(CK.result.order) : ''; const done = ok => { cp.querySelector('span').textContent = ok ? 'Copied' : 'Select and copy below'; K.say(ok ? 'Order summary copied.' : 'Copy did not work. Select the text below.'); if (!ok) { const pre = document.querySelector('.sp-doc-text'); if (pre) { const r = document.createRange(); r.selectNodeContents(pre); const s = getSelection(); s.removeAllRanges(); s.addRange(r); } } };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(() => done(true), () => done(false)); else done(false); return; }
  if (t.closest('[data-ck-print]')) { e.preventDefault(); W.print(); return; }
  if (t.closest('[data-sp-print]')) { e.preventDefault(); W.print(); return; }
  if (t.closest('[data-sp-emailcart]')) { e.preventDefault(); const o = X.buildOrder(K.lines(), { path: 'center' }); location.href = X.mailtoHref(Object.assign(o, { customer: { name: '(your name)', email: '(your email)', phone: '', org: '', orgType: 'center' } })); }
}, true);

// ------------------------------------------------------------------ the order document (on screen and printed)
function doc(o) {
  const rows = o.lines.map(l => `<tr><td>${E(l.name)}${l.options ? `<small>${E(l.options)}</small>` : ''}</td><td class="n sp-num">${l.qty}</td><td class="n sp-num">${l.priced ? fmt(l.unit) : 'Quote'}</td><td class="n sp-num">${l.priced ? fmt(l.total) : 'To be quoted'}</td></tr>`).join('');
  return `<article class="sp-doc" aria-label="Order request ${E(o.ref)}">
    <header class="sp-doc-h"><img src="img/brand/ff-plush-wordmark-320.webp" alt="Futures Friends" width="170" height="79"><div><b>Order request ${E(o.ref)}</b><span>${E(o.createdAt.slice(0, 10))}</span><span>Not an invoice. No payment taken.</span></div></header>
    <div class="sp-doc-cols"><div><h3>From</h3><p>${E(o.customer.name)}${o.customer.org ? '<br>' + E(o.customer.org) : ''}<br>${E(o.customer.email)}${o.customer.phone ? '<br>' + E(o.customer.phone) : ''}</p></div>
      ${o.shipTo ? `<div><h3>Ship to</h3><p>${E(o.shipTo.line1)}${o.shipTo.line2 ? '<br>' + E(o.shipTo.line2) : ''}<br>${E(o.shipTo.city)}, ${E(o.shipTo.state)} ${E(o.shipTo.zip)}</p></div>` : ''}
      <div><h3>Details</h3><p>${o.po ? 'PO ' + E(o.po) + '<br>' : ''}${o.taxExempt.claimed ? 'Tax-exempt, certificate ' + E(o.taxExempt.certificate) + '<br>' : ''}${o.payment === 'invoice' ? 'Invoice requested' : o.payment === 'quote' ? 'Quote requested' : 'Order request'}</p></div></div>
    <table class="sp-doc-t"><thead><tr><th scope="col">Item</th><th scope="col" class="n">Qty</th><th scope="col" class="n">Unit</th><th scope="col" class="n">Total</th></tr></thead><tbody>${rows}</tbody>
      <tfoot><tr><th scope="row" colspan="3">Subtotal${o.totals.quotedItems ? ' (priced items)' : ''}</th><td class="n sp-num">${o.totals.pricedItems ? fmt(o.totals.subtotal) : 'None priced yet'}</td></tr>
      <tr><th scope="row" colspan="3">Shipping (estimate)</th><td class="n">Quoted on invoice</td></tr><tr><th scope="row" colspan="3">Sales tax</th><td class="n">On invoice</td></tr></tfoot></table>
    ${o.notes ? `<p class="sp-doc-notes"><b>Notes</b> ${E(o.notes)}</p>` : ''}
    <p class="sp-doc-foot">We confirm availability, shipping and timing, then send an invoice. Prices are before tax and shipping. Returns and terms of sale: ${E(C.DRAFT)}. Futures Friends, ${E(PHONE)}, ${E(EMAIL)}.</p></article>`;
}
V.order = () => {
  const r = CK.result;
  if (!r || !r.order) return `<div class="sp"><header class="sp-pagehead"><div class="wrap"><h1>No order request in this tab</h1><p class="sp-lede">Order requests are not kept on this device. If you sent one, your confirmation email has the reference. Questions: ${E(PHONE)}.</p><div class="sp-hero-acts">${lnk('store', 'Back to the store', 'btn gold')}${lnk('cart', 'Open your bag', 'btn soft')}</div></div></header></div>`;
  const o = r.order, sent = r.status === 'received';
  const head = sent
    ? `<span class="sp-badge sp-badge-ok">Request received</span><h1>Request received</h1><p class="sp-lede">We will confirm availability and send an invoice. A real person replies within ${r.days || 2} business days. No payment was taken, and nothing ships until you approve the invoice.</p>
       <div class="sp-ref"><span>Your reference</span><b>${E(r.ref)}</b></div>${r.emailConfirmation === 'queued' ? `<p class="sp-fnote">A confirmation email is on its way to ${E(o.customer.email)}. Check spam if it is not there in a few minutes.</p>` : ''}${r.note ? `<p class="sp-fnote">${E(r.note)}</p>` : ''}`
    : `<span class="sp-badge sp-badge-hold">Not sent</span><h1>Ordering opens soon</h1><p class="sp-lede">Online requests are not switched on yet, so nothing has been sent and nothing was charged. Here is your order summary. Email it, call it in or print it, and we will pick it up from there.</p>
       <div class="sp-ref"><span>Your reference</span><b>${E(o.ref)}</b></div>`;
  return `<div class="sp sp-order"><header class="sp-pagehead sp-noprint"><div class="wrap">${head}
    <div class="sp-order-acts">${sent ? '' : `<a class="btn gold" href="${E(X.mailtoHref(o))}">${ico('mail')} Email this summary</a><a class="btn soft" href="tel:+18169885661">${ico('phone')} Call ${E(PHONE)}</a>`}
      <button type="button" class="btn ${sent ? 'gold' : 'soft'}" data-ck-print>${ico('print')} Print or save as PDF</button><button type="button" class="btn soft" data-ck-copy>${ico('copy')} <span>Copy summary</span></button></div></div></header>
    <div class="wrap sp-shell">${doc(o)}<details class="sp-plain sp-noprint"><summary>Plain-text version to paste into an email${ico('down')}</summary><pre class="sp-doc-text">${E(X.summaryText(o))}</pre></details>
      <p class="sp-order-more sp-noprint">${lnk('store', 'Keep shopping ' + ico('arrow'), 'btn soft')}</p></div></div>`;
};
V['order-return'] = () => `<div class="sp"><header class="sp-pagehead"><div class="wrap"><h1>You are back from secure checkout</h1>
  <p class="sp-lede">We confirm payment from the payment provider’s own record, not from this page. You will get a receipt by email from the provider and a confirmation from us. If neither arrives within a day, call ${E(PHONE)} and give us your name and the date.</p>
  <div class="sp-hero-acts">${lnk('store', 'Back to the store', 'btn gold')}${lnk('contact', 'Contact us', 'btn soft')}</div></div></header></div>`;

// The release status strip (release-strip.js, E2) goes on the commercial store pages, after their hero. #shop-families is the old address of the Kids' Shop.
V['shop-families'] = V['kids-shop'];
if (W.FFReleaseStrip && W.FFReleaseStrip.wrap) ['store', 'shop-programs', 'shop-families'].forEach(W.FFReleaseStrip.wrap);

W.FFStoreOrder = { state: () => CK, reset: () => { CK = blank(); }, blank };
})();
