/* One app (N2, platform repo hub/PORTAL_RETIREMENT.md): families and staff sign in to the Futures Hub, not to this website.
   Every sign-in route of the site (#sign-in, #signin-family, #signin-teacher) starts with the Futures Hub card:
     - window.FF_HUB_URL set (hub-config.js, at go-live): "Sign in to the Futures Hub" opens the Hub's own sign-in page, and every sign-in
       link of the site stays as it is (the routes above show that card);
     - empty (until go-live; owner 2026-10-12 "when you click on parent login it will go straight into it"): the header "Sign in" and
       every Family sign-in link (#signin-family) go STRAIGHT to the Family portal preview, the Futures Hub TEST copy in portal-test/
       (fake demo family, nothing saved; its own banner says so on its sign-in page), in the same tab. #sign-in and #signin-teacher
       still show the card: "Family portal preview" for families, "opens soon" for staff. Opening #signin-family directly still shows
       the page with the card (the demo below it is unchanged).
   The portals below it are the marketing demo only, labelled "Interactive demo (sample data)": they run in this browser with made-up
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
    return `<div class="card signin" id="hubLink" data-hub-open="${u ? 'yes' : 'soon'}" style="margin-bottom:18px"><h2 class="h3">${u ? 'Sign in to the Futures Hub' : 'Your center’s Hub opens soon'}</h2>
      <p class="small">${E(whom)} sign in to the Futures Hub: the one app for the classroom day, daily reports, messages, pick-up and billing.</p>
      ${u ? `<a class="btn gold" id="hubLinkGo" href="${E(u)}/" rel="noopener">Open the Futures Hub sign-in</a>
      <p class="note">Use the email your center invited you with. Forgot your password? The Hub sign-in page has “Forgot your password?”.</p>`
      : `<a class="btn gold" id="hubPreviewGo" href="${PREVIEW}">Family portal preview</a>
      <p class="note">A test version of the family portal with a fake demo family: nothing you do there is saved.</p>
      <p class="small">${who === 'Family' ? '' : '<b>Teachers and directors:</b> '}When your center opens on the Futures Hub, your director sends you an invitation by email. Until then, look around the interactive demo below: it uses sample data only.</p>`}</div>`;
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
  const STRAIGHT = 'a.ffw-signin, a[href="#signin-family"]';
  function wire(root) {
    if (hubUrl() || !root || !root.querySelectorAll) return;
    const list = root.matches && root.matches(STRAIGHT) ? [root] : [];
    root.querySelectorAll(STRAIGHT).forEach((a) => list.push(a));
    list.forEach((a) => { if (a.getAttribute('href') !== PREVIEW) { a.setAttribute('href', PREVIEW); a.setAttribute('data-hub-preview', ''); } });
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
      if (!a) return;
      e.preventDefault(); e.stopImmediatePropagation();
      W.location.href = PREVIEW;
    }, true);
  }
  W.FFHubLink = Object.freeze({ url: hubUrl, card, preview: PREVIEW, wire });
})();
