/* One app (N2, platform repo hub/PORTAL_RETIREMENT.md): families and staff sign in to the Futures Hub, not to this website.
   Every sign-in route of the site (#sign-in, #signin-family, #signin-teacher) starts with the Futures Hub card:
     - window.FF_HUB_URL set (hub-config.js, at go-live): "Sign in to the Futures Hub" opens the Hub's own sign-in page, and every sign-in
       link of the site stays as it is (the routes above show that card; "Director login" opens the Hub too);
     - empty (until go-live; owner 2026-10-12: "when you click on parent login it will go straight into it", then the parent, teacher and
       administrator portals and dashboards, no credentials): the Futures Hub preview in portal-test/ (fake demo data; unindexed). The
       header "Sign in" and every Family sign-in link (#signin-family) open the FAMILY dashboard straight away (?enter=family), every
       Teacher sign-in link (#signin-teacher) the TEACHER dashboard, every "Director login" link (#signin-director) the DIRECTOR
       dashboard, in the same tab. The cards offer all three. Home and the first-visit gate are unchanged.
   The portals below the card are the marketing demo only, labelled "Interactive demo (sample data)": they run in this browser with made-up
   data and never connect to the Hub. Loaded after demo-portal.js and audiences.js (it wraps the views they define). */
(function () {
  'use strict';
  if (typeof V === 'undefined') return;
  const W = window;
  const E = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const hubUrl = () => { const u = String(W.FF_HUB_URL || '').trim().replace(/\/+$/, ''); return /^https:\/\/[^\s"'<>]+$/.test(u) ? u : ''; };
  // the Futures Hub TEST copy (tests/portal-test.test.js): relative, so it works under /futures-friends/ and on the local previews
  const PREVIEW = 'portal-test/c/test-family-demo-center/';
  function card(who) {
    const u = hubUrl();
    const whom = who === 'Family' ? 'Families' : who === 'Teacher' ? 'Teachers and directors' : 'Families, teachers and directors';
    return `<div class="card signin" id="hubLink" data-hub-open="${u ? 'yes' : 'preview'}" style="margin-bottom:18px"><h2 class="h3">Sign in to the Futures Hub</h2>
      <p class="small">${E(whom)} sign in to the Futures Hub: the one app for the classroom day, daily reports, messages, pick-up and billing.</p>
      ${u ? `<a class="btn gold" id="hubLinkGo" href="${E(u)}/" rel="noopener">Open the Futures Hub sign-in</a>
      <p class="note">Use the email your center invited you with. Forgot your password? The Hub sign-in page has “Forgot your password?”.</p>`
      : `<div class="hub-previews"><a class="btn gold" id="hubPreviewGo" href="${PREVIEW}?enter=family">Family login</a>
      <a class="btn soft" id="hubPreviewTeacher" href="${PREVIEW}?enter=teacher">Teacher login</a>
      <a class="btn soft" id="hubPreviewDirector" href="${PREVIEW}?enter=director">Director login</a></div>`}</div>`;
  }
  const inject = (html, who) => {
    const at = html.indexOf('<section class="band-paper"><div class="wrap">');
    if (at < 0) return card(who) + html;
    const cut = at + '<section class="band-paper"><div class="wrap">'.length;
    return html.slice(0, cut) + card(who) + html.slice(cut);
  };
  [['signin-family', 'Family'], ['signin-teacher', 'Teacher'], ['sign-in', 'All']].forEach(([key, who]) => {
    const base = V[key];
    if (typeof base === 'function') V[key] = function () { return inject(base.apply(this, arguments), who); };
  });
  // Until go-live: the header "Sign in" and every Family sign-in link go straight to the preview (same tab). The rest of the page, the
  // first-visit gate and Home are untouched: only these links' targets change, and only while FF_HUB_URL is empty.
  // (a.ffw-signin, the header "Sign in", gets its family href here and opens the portals menu below)
  const STRAIGHT = 'a.ffw-signin, a[href="#signin-family"], a[href="#signin-teacher"], a[href="#signin-director"]';
  const roleOf = (a) => { const h = a.getAttribute('href') || '', r = a.getAttribute('data-hub-preview'); return r || (h === '#signin-teacher' ? 'teacher' : h === '#signin-director' ? 'director' : 'family'); };
  const targetOf = (a) => `${PREVIEW}?enter=${roleOf(a)}`;
  function wire(root) {
    if (!root || !root.querySelectorAll) return;
    const list = root.matches && root.matches(STRAIGHT) ? [root] : [];
    root.querySelectorAll(STRAIGHT).forEach((a) => list.push(a));
    const u = hubUrl();
    // at go-live "Director login" opens the Hub's own sign-in (directors sign in there with two steps); the other routes stay
    if (u) { list.forEach((a) => { if (a.getAttribute('href') === '#signin-director') a.setAttribute('href', `${u}/`); }); return; }
    list.forEach((a) => { const r = roleOf(a), to = targetOf(a); if (a.getAttribute('href') !== to) { a.setAttribute('data-hub-preview', r); a.setAttribute('href', to); } });
  }
  const D = W.document;
  if (D && typeof MutationObserver === 'function') {
    const start = () => {
      wire(D.body);
      new MutationObserver((rs) => rs.forEach((r) => r.addedNodes.forEach((n) => { if (n.nodeType === 1) wire(n); }))).observe(D.body, { childList: true, subtree: true });
    };
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start); else start();
    // a link the observer has not reached yet still goes straight (capture: before the hash router sees it)
    D.addEventListener('click', (e) => {
      if (hubUrl() || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target && e.target.closest && e.target.closest(STRAIGHT);
      if (!a || a.matches('a.ffw-signin') || /^portal-test\//.test(a.getAttribute('href') || '')) return;
      e.preventDefault(); e.stopImmediatePropagation();
      W.location.href = targetOf(a);
    }, true);
  }
  // ---- the "Sign in / Portals" menu (owner 2026-10-12: every portal one tap from the website) -------------------------------------
  // Until go-live the header "Sign in" opens this menu (its href stays the family dashboard for no-JS); a dropdown on desktop, a sheet
  // on phones. TO ADD A PORTAL (e.g. the Investor portal, built in another thread): add ONE entry to PORTAL_MENU below; nothing else.
  const PORTAL_MENU = [
    { id: 'family', label: 'Family portal', label_es: 'Portal para familias', sub: 'The parent dashboard', sub_es: 'El panel para familias', href: `${PREVIEW}?enter=family`, ink: 'var(--zuri-ink, #1B7541)', art: 'family', alt: 'Rose and Lumi' },
    { id: 'teacher', label: 'Teacher portal', label_es: 'Portal para maestros', sub: 'The classroom dashboard', sub_es: 'El panel del salón', href: `${PREVIEW}?enter=teacher`, ink: 'var(--booker-ink, #23589F)', art: 'teacher', alt: 'Ms. June' },
    { id: 'director', label: 'Director portal', label_es: 'Portal de dirección', sub: 'The center dashboard', sub_es: 'El panel del centro', href: `${PREVIEW}?enter=director`, ink: 'var(--bop-ink, #6B2A8E)', art: 'director', alt: 'Principal Hazel' },
    { id: 'kids', label: 'Kids\u2019 corner', label_es: 'Rincón de los niños', sub: 'The child space, after a grown-up hands over', sub_es: 'El espacio del niño, después de que un adulto lo entrega', href: `${PREVIEW}?enter=kids`, ink: 'var(--lumi-ink, #B02F6C)', art: 'kids', alt: 'Booker, Lumi, Zuri and Bop' },
    // the investor package (investor/Digital/): one tap, no credential, like the test portals; it is shared for review, not signed in to
    { id: 'investor', label: 'Investor portal', label_es: 'Portal para inversionistas', sub: 'The pilot plan, costs and documents', sub_es: 'El plan piloto, los costos y los documentos', href: 'investor/Digital/', ink: '#0A2B38', art: 'investor', alt: 'Bop, Lumi, Booker and Zuri in suits' },
    //   (art: img/portals/portal-<art>.webp and @2x, the official character cutouts composed, never redrawn)
  ];
  const MENU_CSS = '#ffPortals{position:fixed;z-index:2147482000;width:min(340px,calc(100vw - 24px));padding:8px;border-radius:16px;background:#fff;color:#0A2B38;box-shadow:0 14px 40px rgba(10,43,56,.28)}'
    + '#ffPortals[hidden]{display:none}#ffPortals h2{margin:6px 10px 8px;font:600 15px/1.3 Fredoka,Poppins,system-ui,sans-serif}'
    + '#ffPortals a{display:grid;grid-template-columns:1fr auto;grid-template-rows:auto auto;column-gap:10px;align-items:center;min-height:64px;padding:6px 10px 6px 14px;margin:2px 0;border-radius:12px;border-left:5px solid var(--ink);color:#0A2B38;text-decoration:none;font:600 15px/1.25 Poppins,system-ui,sans-serif}'
    + '#ffPortals a small{grid-column:1;font:400 12.5px/1.3 Poppins,system-ui,sans-serif;color:#33505C}#ffPortals a img{grid-column:2;grid-row:1/3;height:56px;width:auto;max-width:120px;object-fit:contain}#ffPortals a:hover,#ffPortals a:focus-visible{background:#F6F0E2;outline:none;box-shadow:inset 0 0 0 2px var(--ink)}'
    + '#ffPortalsShade{position:fixed;inset:0;z-index:2147481999;background:rgba(10,43,56,.35)}#ffPortalsShade[hidden]{display:none}'
    + '@media (max-width:640px){#ffPortals{left:0!important;right:0!important;top:auto!important;bottom:0;width:auto;border-radius:20px 20px 0 0;padding:10px 12px calc(14px + env(safe-area-inset-bottom))}}'
    + '@media (prefers-reduced-motion:no-preference){#ffPortals{transition:opacity .16s ease}}';
  let menuEl = null, shade = null, opener = null;
  function closeMenu(focus) {
    if (!menuEl || menuEl.hidden) return;
    menuEl.hidden = true; shade.hidden = true;
    if (opener) { opener.setAttribute('aria-expanded', 'false'); if (focus) opener.focus(); }
  }
  function openMenu(a) {
    const doc = W.document;
    if (!menuEl) {
      const st = doc.createElement('style'); st.textContent = MENU_CSS; doc.head.appendChild(st);
      shade = doc.createElement('div'); shade.id = 'ffPortalsShade'; shade.hidden = true; shade.addEventListener('click', () => closeMenu(true));
      menuEl = doc.createElement('nav'); menuEl.id = 'ffPortals'; menuEl.hidden = true; menuEl.setAttribute('aria-labelledby', 'ffPortalsH');
      menuEl.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(true); });
      doc.body.appendChild(shade); doc.body.appendChild(menuEl);
      doc.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(true); });
    }
    const es = /^es/.test(doc.documentElement.lang || '');
    menuEl.lang = es ? 'es' : 'en'; menuEl.setAttribute('data-i18n-skip', '');
    menuEl.innerHTML = `<h2 id="ffPortalsH">${es ? 'Entra a un portal' : 'Sign in to a portal'}</h2>${PORTAL_MENU.map((p) => `<a href="${E(p.href)}" data-portal="${E(p.id)}" style="--ink:${E(p.ink)}"><span>${E(es && p.label_es || p.label)}</span><small>${E(es && p.sub_es || p.sub)}</small>${p.art ? `<img src="img/portals/portal-${E(p.art)}.webp" srcset="img/portals/portal-${E(p.art)}.webp 1x, img/portals/portal-${E(p.art)}@2x.webp 2x" alt="${E(p.alt || '')}" height="56" loading="lazy">` : ''}</a>`).join('')}`;
    opener = a; a.setAttribute('aria-expanded', 'true'); a.setAttribute('aria-controls', 'ffPortals');
    const r = a.getBoundingClientRect();
    menuEl.style.top = `${Math.round(r.bottom + 8)}px`;
    menuEl.style.left = `${Math.max(12, Math.min(Math.round(r.right - 340), W.innerWidth - 352))}px`;
    menuEl.hidden = false; shade.hidden = W.innerWidth > 640;
    const first = menuEl.querySelector('a'); if (first) first.focus();
  }
  if (D && typeof D.addEventListener === 'function') {
    D.addEventListener('click', (e) => {
      if (hubUrl() || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target && e.target.closest && e.target.closest('a.ffw-signin');
      if (!a) { if (menuEl && !menuEl.hidden && !(e.target.closest && e.target.closest('#ffPortals'))) closeMenu(false); return; }
      e.preventDefault(); e.stopImmediatePropagation();
      if (menuEl && !menuEl.hidden) closeMenu(true); else openMenu(a);
    }, true);
  }
  W.FFHubLink = Object.freeze({ url: hubUrl, card, preview: PREVIEW, wire, menu: PORTAL_MENU });
})();
