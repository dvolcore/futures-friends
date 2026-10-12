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
      if (!a || /^portal-test\//.test(a.getAttribute('href') || '')) return;
      e.preventDefault(); e.stopImmediatePropagation();
      W.location.href = targetOf(a);
    }, true);
  }
  W.FFHubLink = Object.freeze({ url: hubUrl, card, preview: PREVIEW, wire });
})();
