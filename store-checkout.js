/* Futures Friends Store: the provider-agnostic checkout adapter. window.FFCheckout (and require() in Node tests).
   One interface, three modes, chosen in store-config.js (window.FF_STORE):
     request  DEFAULT, live now. Builds a complete order REQUEST (cart, totals, customer, ship-to, PO, tax-exempt details) and sends it through
              the existing intake/quote gateway (window.FFIntake.submit('quote', ...), the same path as #store-request and the other quote forms).
              Where the gateway is off it returns status 'gateway_off' and the page shows the order summary to copy, email, call in or print.
     stripe   Stripe Checkout Sessions (needs checkoutEndpoint) or Payment Links (needs links for the cart's lines); center PO / net-30 orders
              go to invoiceEndpoint (Stripe Invoicing). Needs a publishable key. Stays in request mode until the keys exist.
     shopify  Shopify Storefront API cartCreate -> checkoutUrl. Needs domain, token and variant ids. Same fallback.
   HONESTY: submit() never returns a "paid" or "success" state. 'received' means the REQUEST was received; 'redirect' means we are sending the
   visitor to the provider, which confirms payment itself. Money never moves in request mode. No keys, accounts or secrets live in this file. */
(function (root, factory) {
  const inNode = typeof require === 'function' && typeof module === 'object';
  const api = factory(inNode ? require('./store-catalog.js') : root.FFCatalog, inNode ? require('./store-cart.js') : root.FFCart);
  if (inNode) module.exports = api; else root.FFCheckout = api;
})(typeof window !== 'undefined' ? window : globalThis, function (C, Cart) {
  'use strict';
  const W = typeof window !== 'undefined' ? window : globalThis;
  const PHONE = '(816) 988-5661', EMAIL = 'info@futureslearningcenter.com';
  const MODES = ['request', 'stripe', 'shopify'];
  const cfg = () => W.FF_STORE || { mode: 'request' };
  const https = u => /^https:\/\/[^\s/]+/.test(String(u || ''));
  const fmt = C.fmt;

  // ------------------------------------------------------------------ which mode is really on
  function ready(mode) {
    const c = cfg();
    if (mode === 'request') return { ok: true };
    if (mode === 'stripe') {
      const s = c.stripe || {};
      if (!/^pk_(live|test)_\S{8,}/.test(String(s.publishableKey || ''))) return { ok: false, why: 'no publishable key' };
      if (!https(s.checkoutEndpoint) && !Object.keys(s.paymentLinks || {}).length) return { ok: false, why: 'no checkout endpoint or payment links' };
      return { ok: true };
    }
    if (mode === 'shopify') {
      const s = c.shopify || {};
      if (!/^[a-z0-9-]+\.myshopify\.com$/i.test(String(s.domain || '')) || !String(s.storefrontToken || '').trim()) return { ok: false, why: 'no shop domain or token' };
      return { ok: true };
    }
    return { ok: false, why: 'unknown mode' };
  }
  function activeMode() {
    const asked = MODES.includes(cfg().mode) ? cfg().mode : 'request', r = ready(asked);
    return r.ok ? { mode: asked, asked, fellBack: false } : { mode: 'request', asked, fellBack: true, why: r.why };
  }

  // ------------------------------------------------------------------ the order
  const newRef = () => { const a = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 6; i++) s += a[Math.floor(Math.random() * a.length)]; return 'FF-' + s; };
  const needsShipping = lines => lines.some(l => l.p.ships !== 'digital' && l.p.ships !== 'none');
  const clean = s => String(s == null ? '' : s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim();
  /* c: { path:'center'|'family', name,email,phone,org,orgType,po,notes, ship:{line1,line2,city,state,zip}, pay:'invoice'|'quote'|'request',
          taxExempt:boolean, taxCert, taxState } */
  function buildOrder(lines, c, ref) {
    lines = lines || Cart.lines(); c = c || {};
    const t = Cart.totals(lines), sh = Cart.shipping(t), center = c.path === 'center';
    return {
      v: 1, ref: ref || newRef(), createdAt: new Date().toISOString(), mode: 'request', path: center ? 'center' : 'family',
      customer: { name: clean(c.name), email: clean(c.email), phone: clean(c.phone), org: center ? clean(c.org) : '', orgType: center ? (clean(c.orgType) || 'center') : 'family' },
      shipTo: needsShipping(lines) ? { line1: clean((c.ship || {}).line1), line2: clean((c.ship || {}).line2), city: clean((c.ship || {}).city), state: clean((c.ship || {}).state).toUpperCase(), zip: clean((c.ship || {}).zip) } : null,
      po: center ? clean(c.po) : '', payment: center ? (c.pay === 'invoice' ? 'invoice' : 'quote') : 'request',
      taxExempt: center && c.taxExempt ? { claimed: true, certificate: clean(c.taxCert), state: clean(c.taxState).toUpperCase() } : { claimed: false },
      notes: clean(c.notes).slice(0, 1000),
      lines: lines.map(l => ({ id: l.pid, name: l.p.name, options: l.label, optionIds: l.opts, qty: l.qty, unit: l.unit, total: l.total, priced: !l.quote })),
      totals: { subtotal: t.subtotal, pricedItems: t.pricedCount, quotedItems: t.quoteCount, shipping: sh.label + ' (estimate)', tax: 'On invoice (MO and KS)' }
    };
  }
  /* Field checks for the checkout form. Returns { field: message }. */
  function validate(c, lines) {
    const e = {}, center = c.path === 'center';
    if (clean(c.name).length < 2) e.name = 'Add your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean(c.email))) e.email = 'Enter a valid email address.';
    const ph = clean(c.phone).replace(/\D/g, ''); if (clean(c.phone) && !(ph.length === 10 || (ph.length === 11 && ph[0] === '1'))) e.phone = 'Enter a 10-digit phone number.';
    if (center && clean(c.org).length < 2) e.org = 'Add your center, home daycare or church name.';
    if (needsShipping(lines)) {
      const s = c.ship || {};
      if (clean(s.line1).length < 3) e.line1 = 'Add a street address.';
      if (clean(s.city).length < 2) e.city = 'Add a city.';
      if (!/^[A-Za-z]{2}$/.test(clean(s.state))) e.state = 'Use the 2-letter state.';
      if (!/^\d{5}(-\d{4})?$/.test(clean(s.zip))) e.zip = 'Enter a 5-digit ZIP code.';
    }
    if (center && c.taxExempt && clean(c.taxCert).length < 3) e.taxCert = 'Add the exemption certificate number, or untick tax-exempt and we will ask later.';
    return e;
  }

  // ------------------------------------------------------------------ the summary people can email, call in or print
  function summaryText(o) {
    const L = [];
    L.push('Futures Friends order request ' + o.ref + ' (not an order yet: no payment taken)');
    L.push('Date: ' + o.createdAt.slice(0, 10));
    L.push('');
    L.push('Who: ' + o.customer.name + (o.customer.org ? ', ' + o.customer.org : '') + ' (' + (o.path === 'center' ? 'center or program' : 'family') + ')');
    L.push('Email: ' + o.customer.email + (o.customer.phone ? '   Phone: ' + o.customer.phone : ''));
    if (o.shipTo) L.push('Ship to: ' + [o.shipTo.line1, o.shipTo.line2, o.shipTo.city + ', ' + o.shipTo.state + ' ' + o.shipTo.zip].filter(Boolean).join(', '));
    if (o.po) L.push('PO number: ' + o.po);
    L.push('Payment: ' + (o.payment === 'invoice' ? 'invoice (net terms to be confirmed)' : o.payment === 'quote' ? 'quote first' : 'request'));
    if (o.taxExempt.claimed) L.push('Tax-exempt: yes' + (o.taxExempt.certificate ? ', certificate ' + o.taxExempt.certificate : '') + (o.taxExempt.state ? ' (' + o.taxExempt.state + ')' : '') + '. Certificate to follow by email.');
    L.push('');
    L.push('Items:');
    for (const l of o.lines) L.push('  ' + l.qty + ' x ' + l.name + (l.options ? ' (' + l.options + ')' : '') + ' ... ' + (l.priced ? fmt(l.unit) + ' each, ' + fmt(l.total) : 'to be quoted'));
    L.push('');
    L.push('Subtotal (priced items): ' + (o.totals.pricedItems ? fmt(o.totals.subtotal) : 'none priced yet') + (o.totals.quotedItems ? '   plus ' + o.totals.quotedItems + ' item' + (o.totals.quotedItems === 1 ? '' : 's') + ' to be quoted' : ''));
    L.push('Shipping: ' + o.totals.shipping + '. Tax: ' + o.totals.tax + '.');
    if (o.notes) { L.push(''); L.push('Notes: ' + o.notes); }
    L.push(''); L.push('We confirm availability, shipping and timing, then send an invoice. Prices before tax and shipping.');
    return L.join('\n');
  }
  const mailtoHref = o => 'mailto:' + EMAIL + '?subject=' + encodeURIComponent('Order request ' + o.ref) + '&body=' + encodeURIComponent(summaryText(o));

  // ------------------------------------------------------------------ network
  async function postJson(url, body, ms) {
    const ctl = typeof AbortController === 'function' ? new AbortController() : null, t = ctl ? setTimeout(() => ctl.abort(), ms || 20000) : 0;
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'omit', signal: ctl ? ctl.signal : undefined });
      let j = null; try { j = await r.json(); } catch (_) { /* no body */ }
      return { status: r.status, ok: r.ok, body: j };
    } catch (_) { return { status: 0, ok: false, network: true, body: null }; } finally { if (t) clearTimeout(t); }
  }
  const ORG = { center: 'center', home: 'homeDaycare', church: 'church', family: 'family' };

  // ------------------------------------------------------------------ mode: request
  async function submitRequest(o) {
    const I = W.FFIntake;
    if (!I || !I.enabled || !I.enabled()) return { status: 'gateway_off', ref: o.ref, order: o };
    const data = { name: o.customer.name, email: o.customer.email, phone: o.customer.phone || undefined, org: o.customer.org || undefined,
      orgType: ORG[o.customer.orgType] || (o.path === 'family' ? 'family' : 'center'), zip: o.shipTo ? o.shipTo.zip : undefined,
      message: ('ORDER REQUEST ' + o.ref + '\n' + summaryText(o)).slice(0, 4000), website: '' };
    for (const k of Object.keys(data)) if (data[k] === undefined || data[k] === '') delete data[k];
    if (!data.zip) data.zip = '00000';   // digital-only requests have no ship-to; the gateway wants a ZIP for quote requests
    const r = await I.submit('quote', data);
    if (r && r.ok) return { status: 'received', ref: r.ref || o.ref, orderRef: o.ref, days: r.days || 2, emailConfirmation: r.emailConfirmation, order: o };
    if (r && r.unavailable) return { status: 'gateway_off', ref: o.ref, order: o };
    return { status: 'error', message: (r && r.message) || 'We could not send the request. Nothing was sent.', errors: r && r.errors, network: !!(r && r.network), order: o };
  }

  // ------------------------------------------------------------------ mode: stripe
  const linkKey = l => (l.pid + (Object.keys(l.optionIds || {}).length ? ':' + Object.values(l.optionIds)[0] : ''));
  async function submitStripe(o) {
    const s = cfg().stripe || {};
    const payload = Object.assign({}, o, { mode: 'stripe', successUrl: s.successUrl || (location.origin + location.pathname + '#order-return/stripe'), cancelUrl: s.cancelUrl || (location.origin + location.pathname + '#checkout') });
    // Centers on a PO / net-30 invoice: Stripe Invoicing, created by the server from the order.
    if (o.path === 'center' && o.payment === 'invoice' && https(s.invoiceEndpoint)) {
      const r = await postJson(s.invoiceEndpoint, payload);
      if (r.ok && r.body && https(r.body.url)) return { status: 'redirect', url: r.body.url, ref: o.ref, kind: 'invoice', order: o };
      if (r.ok && r.body && r.body.ref) return { status: 'received', ref: r.body.ref, orderRef: o.ref, days: 2, order: o, kind: 'invoice' };
      return { status: 'error', message: 'We could not create the invoice. Nothing was charged.', network: !!r.network, order: o };
    }
    if (https(s.checkoutEndpoint) && o.lines.every(l => l.priced)) {
      const r = await postJson(s.checkoutEndpoint, payload);
      if (r.ok && r.body && https(r.body.url)) return { status: 'redirect', url: r.body.url, ref: o.ref, kind: 'checkout', order: o };
      if (r.ok && r.body && r.body.sessionId && /^pk_/.test(s.publishableKey || '') && typeof Stripe === 'function') {
        try { const st = Stripe(s.publishableKey); const res = await st.redirectToCheckout({ sessionId: r.body.sessionId }); if (res && res.error) return { status: 'error', message: res.error.message, order: o }; return { status: 'redirect', ref: o.ref, kind: 'checkout', order: o }; } catch (e) { return { status: 'error', message: 'Stripe did not open. Nothing was charged.', order: o }; }
      }
      return { status: 'error', message: 'We could not open secure checkout. Nothing was charged.', network: !!r.network, order: o };
    }
    // Payment Links: one product line with a link (quantity set on Stripe's page).
    const links = s.paymentLinks || {};
    if (o.lines.length === 1 && o.lines[0].priced && https(links[linkKey({ pid: o.lines[0].id, optionIds: o.lines[0].optionIds })] || links[o.lines[0].id])) {
      const u = links[linkKey({ pid: o.lines[0].id, optionIds: o.lines[0].optionIds })] || links[o.lines[0].id];
      return { status: 'redirect', url: u + (u.includes('?') ? '&' : '?') + 'client_reference_id=' + encodeURIComponent(o.ref) + '&prefilled_email=' + encodeURIComponent(o.customer.email), ref: o.ref, kind: 'payment-link', order: o };
    }
    // Mixed or quoted carts cannot go to a card checkout: they stay a request.
    const r = await submitRequest(o); r.note = 'This cart has items without a public price, so it was sent as a request instead of a card payment.'; return r;
  }

  // ------------------------------------------------------------------ mode: shopify
  async function submitShopify(o) {
    const s = cfg().shopify || {};
    if (!o.lines.every(l => l.priced)) { const r = await submitRequest(o); r.note = 'This cart has items without a public price, so it was sent as a request instead.'; return r; }
    const lines = o.lines.map(l => ({ merchandiseId: (s.variantIds || {})[linkKey({ pid: l.id, optionIds: l.optionIds })] || (s.variantIds || {})[l.id], quantity: l.qty }));
    if (lines.some(l => !l.merchandiseId)) { const r = await submitRequest(o); r.note = 'A product is not connected to the shop yet, so this was sent as a request.'; return r; }
    const q = 'mutation($input: CartInput!){ cartCreate(input: $input){ cart{ checkoutUrl } userErrors{ message } } }';
    const input = { lines, buyerIdentity: { email: o.customer.email }, attributes: [{ key: 'ff_ref', value: o.ref }] };
    const r = await (async () => { try { const x = await fetch('https://' + s.domain + '/api/' + (s.apiVersion || '2025-07') + '/graphql.json', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': s.storefrontToken }, body: JSON.stringify({ query: q, variables: { input } }), credentials: 'omit' }); return { ok: x.ok, body: await x.json() }; } catch (_) { return { ok: false, network: true }; } })();
    const u = r.body && r.body.data && r.body.data.cartCreate && r.body.data.cartCreate.cart && r.body.data.cartCreate.cart.checkoutUrl;
    if (r.ok && https(u)) return { status: 'redirect', url: u, ref: o.ref, kind: 'shopify', order: o };
    return { status: 'error', message: 'We could not open the shop checkout. Nothing was charged.', network: !!r.network, order: o };
  }

  /* Send the order. Always resolves to { status: 'received' | 'gateway_off' | 'redirect' | 'error', ... }. Never a paid state. */
  async function submit(o) {
    const m = activeMode().mode; o.mode = m;
    if (m === 'stripe') return submitStripe(o);
    if (m === 'shopify') return submitShopify(o);
    return submitRequest(o);
  }

  return Object.freeze({ MODES, PHONE, EMAIL, cfg, ready, activeMode, newRef, needsShipping, buildOrder, validate, summaryText, mailtoHref, submit, _t: { submitRequest, submitStripe, submitShopify, linkKey } });
});
