/* Futures Friends: English / Spanish (owner decision 2026-10-07: the program is bilingual; Zuri is the bilingual friend).
   Every Spanish string on the site is a DRAFT translation pending review by the center's Spanish teacher (a native speaker); the page
   says so while Spanish is on.

   How it works (built to sit beside many lanes that keep editing the page templates):
   - One language for the whole site: 'en' (default) or 'es'. Chosen with the language button (header, mobile menu, entry gate) or
     ?lang=es / ?lang=en; remembered in this browser (localStorage 'ff-lang', in try/catch; blocked storage = this page load only).
     <html lang> and data-lang follow it. Nothing is sent anywhere.
   - Phrase tables (i18n-es.js and friends) map an exact English string (whitespace collapsed) to its Spanish, plus a few patterns for
     strings with numbers in them. While Spanish is on, a pass over the page swaps every text node and the aria-label, title, alt and
     placeholder attributes that have an entry, and a MutationObserver repeats it for whatever a route renders later. A string with no
     entry simply stays English, so a new English sentence from another lane can never break the page.
   - Content that needs real Spanish structure (Story Time books with read-along word highlighting, activities, captions) is not
     phrase-swapped: those files read FFi18n.lang and use their own Spanish data (family-library-es*.js, captions-es.js).
     Mark any element data-i18n-skip (or translate="no") to keep the pass out of it; elements already marked lang="es" are left alone.
   - Every public page has Spanish (2026-10-10, owner: "so that somebody who is bilingual does not miss out"); tools/i18n-audit.mjs
     lists any English left per route and tests/i18n-site.test.js keeps it that way. A browser that prefers Spanish gets a one-line
     offer to switch until a language is chosen. The tab title and meta description follow the language (head()).
   Public: window.FFi18n = { lang, set(lang), toggle(), t(en), add(lang, table, patterns), apply(root), family(route), on(fn) }.
   Fires 'ff:lang' on document with {lang, previous}. */
(function () {
  'use strict';
  const W = typeof window !== 'undefined' ? window : globalThis;
  const D = W.document;
  const LANGS = ['en', 'es'];
  const KEY = 'ff-lang';
  const tables = { es: new Map() };
  const patterns = { es: [] };
  const listeners = [];
  const norm = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();

  // Family-facing routes that have Spanish (wayfinding.js audience 'families', plus Home and the Futures at Home pages).
  const FAMILY = new Set(['home', 'enroll', 'at-home', 'story-time', 'activities', 'printables', 'see-how', 'family-videos', 'my-week',
    'bop-at-home', 'this-week', 'whole-child', 'friends', 'for-families', 'rainbow', 'watch', 'contact', 'not-found', 'habit', 'habits']);
  // Later (business / centers / staff pages, listed in BILINGUAL_PROGRAM_2026-10-07.md): everything else stays English for now.

  const store = {
    get() { try { return W.localStorage ? W.localStorage.getItem(KEY) : null; } catch (_) { return null; } },
    set(v) { try { if (W.localStorage) W.localStorage.setItem(KEY, v); } catch (_) { /* blocked storage: this page load only */ } }
  };
  function fromUrl() {
    try { const m = /[?&]lang=(en|es)\b/.exec((W.location && W.location.search) || ''); return m ? m[1] : null; } catch (_) { return null; }
  }
  let lang = 'en';
  { const u = fromUrl(), s = store.get(); lang = LANGS.includes(u) ? u : (LANGS.includes(s) ? s : 'en'); if (u) store.set(u); }

  // ---------------------------------------------------------------- lookup
  function add(l, table, pats) {
    if (!tables[l]) { tables[l] = new Map(); patterns[l] = []; }
    if (table) for (const k of Object.keys(table)) tables[l].set(norm(k), table[k]);
    if (pats) for (const p of pats) if (p && p[0] && typeof p[0].test === 'function') patterns[l].push(p);
  }
  function lookup(s, l) {
    const n = norm(s); if (!n || l === 'en') return null;
    const tb = tables[l]; if (!tb) return null;
    if (tb.has(n)) return tb.get(n);
    for (const [re, to] of patterns[l]) { if (re.test(n)) return n.replace(re, to); }
    return null;
  }
  // t(en): the Spanish for an English string while Spanish is on, else the English (for code that builds its own strings).
  const t = (en, l = lang) => { const r = lookup(en, l); return r == null ? en : r; };
  // The same string with its leading/trailing whitespace kept (text nodes).
  const keepEdges = (raw, to) => { const m = /^(\s*)[\s\S]*?(\s*)$/.exec(raw); return m[1] + to + m[2]; };

  // ---------------------------------------------------------------- the DOM pass
  const ATTRS = ['aria-label', 'title', 'alt', 'placeholder'];
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE', 'PRE', 'NOSCRIPT', 'svg', 'SVG']);
  const origText = new WeakMap(), origAttr = new WeakMap();
  const touched = new Set();
  function skipped(el) {
    for (let e = el; e && e.nodeType === 1; e = e.parentNode) {
      if (SKIP_TAGS.has(e.tagName) || e.hasAttribute('data-i18n-skip') || e.getAttribute('translate') === 'no') return true;
      const l = e.getAttribute('lang'); if (l && e !== D.documentElement) return !/^en\b/i.test(l);   // already in another language
    }
    return false;
  }
  function doText(node) {
    const raw = origText.has(node) ? origText.get(node) : node.data;
    const to = lookup(raw, lang);
    if (to == null) return;
    if (!origText.has(node)) origText.set(node, raw);
    const want = keepEdges(raw, to);
    if (node.data !== want) node.data = want;
    touched.add(node);
  }
  function doAttrs(el) {
    for (const a of ATTRS) {
      if (!el.hasAttribute(a)) continue;
      let o = origAttr.get(el); const raw = o && a in o ? o[a] : el.getAttribute(a);
      const to = lookup(raw, lang); if (to == null) continue;
      if (!o) { o = {}; origAttr.set(el, o); }
      if (!(a in o)) o[a] = raw;
      if (el.getAttribute(a) !== to) el.setAttribute(a, to);
      touched.add(el);
    }
  }
  function apply(root) {
    if (lang === 'en' || !root || !D) return;
    const start = root.nodeType === 3 ? root.parentNode : root;
    if (!start || (start.nodeType === 1 && skipped(start))) return;
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType === 1) doAttrs(root);
    const tw = D.createTreeWalker(root, 5 /* SHOW_ELEMENT | SHOW_TEXT */, {
      acceptNode: n => n.nodeType === 1 ? (SKIP_TAGS.has(n.tagName) || n.hasAttribute('data-i18n-skip') || n.getAttribute('translate') === 'no' || (n.hasAttribute('lang') && !/^en\b/i.test(n.getAttribute('lang'))) ? 2 /* REJECT */ : 1) : 1
    });
    for (let n = tw.nextNode(); n; n = tw.nextNode()) { if (n.nodeType === 3) { if (n.data.trim()) doText(n); } else doAttrs(n); }
  }
  function restore() {
    for (const n of touched) {
      if (n.nodeType === 3) { if (origText.has(n)) n.data = origText.get(n); }
      else { const o = origAttr.get(n); if (o) for (const a of Object.keys(o)) n.setAttribute(a, o[a]); }
    }
    touched.clear();
  }

  // ---------------------------------------------------------------- language button, notes, gate choice
  const route = () => { try { return ((W.location && W.location.hash) || '').replace(/^#/, '').split('/')[0] || 'home'; } catch (_) { return 'home'; } };
  const family = r => FAMILY.has(r || route());
  const LABEL = { en: 'English', es: 'Español' };
  const other = () => (lang === 'es' ? 'en' : 'es');
  function syncButtons() {
    if (!D) return;
    D.querySelectorAll('[data-ff-lang]').forEach(b => {
      const want = b.getAttribute('data-ff-lang-to') || other();
      if (b.hasAttribute('data-ff-lang-to')) { b.setAttribute('aria-pressed', String(want === lang)); return; }
      b.textContent = b.hasAttribute('data-ff-lang-short') ? want.toUpperCase() : LABEL[want]; b.setAttribute('lang', want);
      b.setAttribute('aria-label', want === 'es' ? 'Ver el sitio en español' : 'View the site in English');
    });
  }
  function button(cls) {
    const b = D.createElement('button'); b.type = 'button'; b.className = cls; b.setAttribute('data-ff-lang', ''); b.setAttribute('data-i18n-skip', '');
    return b;
  }
  function mountButtons() {
    if (!D || !D.querySelector) return;
    // The header's utility row: premium.js redraws it as .px-utility (links in .px-utilinks); the plain .util row is the fallback.
    const host = D.querySelector('header.bar .px-utilinks') || D.querySelector('header.bar .px-utility .wrap') || D.querySelector('header.bar .util .wrap');
    if (host && !host.querySelector('[data-ff-lang]')) host.appendChild(button('ff-lang px-link'));
    // Phones: the utility links are hidden (wayfinding.css), so a short "ES" / "EN" button sits beside the search and menu buttons.
    const acts = D.querySelector('header.bar .px-navactions');
    if (acts && !acts.querySelector('[data-ff-lang]')) { const b = button('ff-lang-mini'); b.setAttribute('data-ff-lang-short', ''); acts.insertBefore(b, acts.firstChild); }
    syncButtons();
  }
  // The entry gate (entry.js): a quiet "English · Español" choice under its buttons.
  function mountGate(root) {
    // after the gate's last line (the centers door) so its own Tab order stays: Tap to enter, without sound, centers, then language
    const card = root && root.querySelector && (root.querySelector('.ffe-card') || (root.matches && root.matches('.ffe-card') ? root : null));
    const go = card && (card.querySelector('.ffe-who') || card.querySelector('.ffe-quiet'));
    if (!go || card.querySelector('.ff-lang-gate')) return;
    const row = D.createElement('div'); row.className = 'ff-lang-gate'; row.setAttribute('role', 'group'); row.setAttribute('aria-label', 'Language / Idioma'); row.setAttribute('data-i18n-skip', '');
    row.innerHTML = '<button type="button" data-ff-lang data-ff-lang-to="en" lang="en" data-ffs-ignore>English</button><span aria-hidden="true">·</span><button type="button" data-ff-lang data-ff-lang-to="es" lang="es" data-ffs-ignore>Español</button>';
    go.insertAdjacentElement('afterend', row);
    syncButtons();
  }
  // While Spanish is on: a draft note at the top of every page (every public page has Spanish since 2026-10-10). While English is on
  // and this browser prefers Spanish (navigator.languages) and no language was ever chosen here: a one-line offer to switch.
  const OFFER = 'ff-lang-offer';
  const offered = () => { try { return !!(W.localStorage && (W.localStorage.getItem(KEY) || W.localStorage.getItem(OFFER))); } catch (_) { return true; } };
  const prefersEs = () => { try { const n = W.navigator || {}; const l = (n.languages && n.languages.length ? n.languages : [n.language || '']).find(x => x); return /^es\b/i.test(l || ''); } catch (_) { return false; } };
  function note() {
    if (!D || !D.getElementById) return;
    const view = D.getElementById('view'); if (!view) return;
    let n = D.getElementById('ff-lang-note');
    const offer = lang === 'en' && prefersEs() && !offered();
    if (lang === 'en' && !offer) { if (n) n.remove(); return; }
    if (!n) { n = D.createElement('p'); n.id = 'ff-lang-note'; n.className = 'ff-lang-note'; n.setAttribute('lang', 'es'); n.setAttribute('role', 'note'); }
    const html = offer
      ? '<b>¿Prefieres español?</b> Todo el sitio está en español (borrador). <button type="button" data-ff-lang data-ff-lang-to="es" lang="es">Ver en español</button> <button type="button" data-ff-lang-offer-no lang="es">No, gracias</button>'
      : '<b>Español (borrador).</b> La traducción está pendiente de revisión por nuestra maestra de español. <button type="button" data-ff-lang data-ff-lang-to="en" lang="en">English</button>';
    if (n._ffv !== html) { n._ffv = html; n.innerHTML = html; }   // unchanged: no DOM write, so the observer cannot loop
    if (n.parentNode !== view.parentNode || n.nextSibling !== view) view.parentNode.insertBefore(n, view);
  }

  // The tab title and the meta description (route-meta.js sets them on every navigation) follow the language too, from the same
  // phrase tables: "Page | Futures Friends" is looked up whole, then by its first part. The English is kept to switch back.
  let headOrig = null, headSet = null;
  function metaText(s) {
    const whole = lookup(s, lang); if (whole != null) return whole;
    const i = s.lastIndexOf(' | '); if (i < 0) return null;
    const a = lookup(s.slice(0, i), lang); if (a == null) return null;
    const b = lookup(s.slice(i + 3), lang); return a + ' | ' + (b == null ? s.slice(i + 3) : b);
  }
  function head() {
    if (!D || !D.querySelector) return;
    const md = D.querySelector('meta[name="description"]');
    const cur = { title: D.title, desc: md ? md.getAttribute('content') || '' : '' };
    // the app wrote a new English title or description since our last write: that is the new original (each one on its own: a
    // render hook may rewrite only the description)
    if (!headOrig) headOrig = Object.assign({}, cur);
    if (!headSet || cur.title !== headSet.title) headOrig.title = cur.title;
    if (!headSet || cur.desc !== headSet.desc) headOrig.desc = cur.desc;
    const want = lang === 'en' ? headOrig : { title: metaText(headOrig.title) || headOrig.title, desc: (headOrig.desc && metaText(headOrig.desc)) || headOrig.desc };
    headSet = Object.assign({}, want);
    if (D.title !== want.title) D.title = want.title;
    if (md && md.getAttribute('content') !== want.desc) md.setAttribute('content', want.desc);
    // Search engines: a Spanish address (?lang=es) names itself as its canonical, so the hreflang pair in the page head is consistent.
    const can = D.querySelector('link[rel="canonical"]');
    if (can && fromUrl() === 'es') { const h = can.getAttribute('href') || ''; if (!/[?&]lang=es\b/.test(h)) can.setAttribute('href', h + (h.indexOf('?') > -1 ? '&' : '?') + 'lang=es'); }
  }

  // ---------------------------------------------------------------- the site-wide Spanish pack
  // i18n-es-site.js (every public page beyond the family pages, ~4,000 strings) is downloaded only while Spanish is on, so English
  // visitors never pay for it. It sits next to this file; ?v= is the build (window.FF_BUILD), so each build fetches it fresh.
  const SELF = (D && D.currentScript && D.currentScript.src) || '';
  let pack = null;
  function loadPack() {
    if (pack || !D || !D.createElement || !D.head) return pack;
    pack = new Promise(res => {
      const s = D.createElement('script');
      const base = SELF ? SELF.replace(/[^/]*$/, '') : '';
      s.src = base + 'i18n-es-site.js?v=' + encodeURIComponent(W.FF_BUILD || '1');
      s.async = true; s.onload = () => res(true); s.onerror = () => res(false);
      D.head.appendChild(s);
    }).then(ok => { if (ok && lang === 'es' && D.body) { apply(D.body); note(); head(); } return ok; });
    return pack;
  }

  // ---------------------------------------------------------------- switching
  let observer = null, queued = [], scheduled = false;
  function flush() {
    scheduled = false; const list = queued; queued = [];
    for (const n of list) { if (n.isConnected) { apply(n); mountGate(n.nodeType === 1 ? n : null); } }
    if (!D.querySelector('header.bar .ff-lang') || !D.querySelector('header.bar .ff-lang-mini')) mountButtons();   // the header was redrawn
  }
  function watch() {
    if (observer || !D || typeof W.MutationObserver !== 'function' || !D.body) return;
    observer = new W.MutationObserver(recs => {
      for (const r of recs) for (const n of r.addedNodes) { if (n.nodeType === 1 || n.nodeType === 3) queued.push(n); }
      if (queued.length && !scheduled) { scheduled = true; Promise.resolve().then(flush); }
      note();
    });
    observer.observe(D.body, { childList: true, subtree: true });
    if (D.head) new W.MutationObserver(() => { if (headSet && (D.title !== headSet.title)) head(); else if (headSet) { const md = D.querySelector('meta[name="description"]'); if (md && md.getAttribute('content') !== headSet.desc) head(); } })
      .observe(D.head, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['content'] });
  }
  function reflect() {
    if (!D || !D.documentElement) return;
    D.documentElement.setAttribute('lang', lang);
    D.documentElement.dataset.lang = lang;
  }
  function set(l, o = {}) {
    l = LANGS.includes(l) ? l : 'en';
    if (l === lang && !o.force) { syncButtons(); return lang; }
    const previous = lang;
    lang = l; store.set(l); reflect();
    if (l === 'es') loadPack();
    if (l === 'en') restore();
    // Listeners first (they swap their data to the new language), then the route is rebuilt from that data; the static header,
    // footer and gate are swapped in place.
    listeners.slice().forEach(fn => { try { fn(lang, previous); } catch (e) { console.warn(e); } });
    try { D.dispatchEvent(new CustomEvent('ff:lang', { detail: { lang, previous } })); } catch (_) { /* old browsers */ }
    try { if (typeof W.render === 'function' && D && D.getElementById('view')) W.render(); } catch (e) { console.warn(e); }
    if (D && D.body) { apply(D.body); note(); syncButtons(); head(); }
    if (W.FFA11y && W.FFA11y.announce) W.FFA11y.announce(lang === 'es' ? 'Sitio en español (traducción en borrador).' : 'Site in English.');
    return lang;
  }
  if (D && D.addEventListener) {
    D.addEventListener('click', e => {
      const b = e.target && e.target.closest && e.target.closest('[data-ff-lang]'); if (!b) return;
      e.preventDefault(); const to = b.getAttribute('data-ff-lang-to') || other(); store.set(to); set(to, { source: 'button' }); note();
    });
    D.addEventListener('click', e => {
      const b = e.target && e.target.closest && e.target.closest('[data-ff-lang-offer-no]'); if (!b) return;
      try { if (W.localStorage) W.localStorage.setItem(OFFER, 'no'); } catch (_) { /* blocked storage: the offer shows again next page */ }
      note();
    });
    if (lang === 'es') loadPack();
    const boot = () => { reflect(); mountButtons(); watch(); if (lang === 'es') apply(D.body); note(); head(); mountGate(D.body); };
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();
    if (W.addEventListener) W.addEventListener('hashchange', () => setTimeout(() => { note(); head(); }, 0));
  }

  W.FFi18n = Object.freeze({
    get lang() { return lang; },
    LANGS: LANGS.slice(),
    set, toggle: () => set(other()), t, add, apply, family, lookup, loadPack,
    on: fn => { if (typeof fn === 'function') listeners.push(fn); return () => { const i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); }; },
    _norm: norm, _tables: tables, _patterns: patterns, FAMILY
  });
})();
