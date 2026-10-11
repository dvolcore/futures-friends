/* One app (N2, platform repo hub/PORTAL_RETIREMENT.md): families and staff sign in to the Futures Hub, not to this website.
   Every sign-in route of the site (#sign-in, #signin-family, #signin-teacher) starts with the Futures Hub card:
     - window.FF_HUB_URL set (hub-config.js, at go-live): "Sign in to the Futures Hub" opens the Hub's own sign-in page;
     - empty (until go-live): "Your center's Hub opens soon".
   The portals below it are the marketing demo only, labelled "Interactive demo (sample data)": they run in this browser with made-up
   data and never connect to the Hub. Loaded after demo-portal.js and audiences.js (it wraps the views they define). */
(function () {
  'use strict';
  if (typeof V === 'undefined') return;
  const W = window;
  const E = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const hubUrl = () => { const u = String(W.FF_HUB_URL || '').trim().replace(/\/+$/, ''); return /^https:\/\/[^\s"'<>]+$/.test(u) ? u : ''; };
  function card(who) {
    const u = hubUrl();
    const whom = who === 'Family' ? 'Families' : who === 'Teacher' ? 'Teachers and directors' : 'Families, teachers and directors';
    return `<div class="card signin" id="hubLink" data-hub-open="${u ? 'yes' : 'soon'}" style="margin-bottom:18px"><h2 class="h3">${u ? 'Sign in to the Futures Hub' : 'Your center’s Hub opens soon'}</h2>
      <p class="small">${E(whom)} sign in to the Futures Hub: the one app for the classroom day, daily reports, messages, pick-up and billing.</p>
      ${u ? `<a class="btn gold" id="hubLinkGo" href="${E(u)}/" rel="noopener">Open the Futures Hub sign-in</a>
      <p class="note">Use the email your center invited you with. Forgot your password? The Hub sign-in page has “Forgot your password?”.</p>`
      : `<p class="small">When your center opens on the Futures Hub, your director sends you an invitation by email. Until then, look around the interactive demo below: it uses sample data only.</p>`}</div>`;
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
  W.FFHubLink = Object.freeze({ url: hubUrl, card });
})();
