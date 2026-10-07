/* Futures Friends: a real "page not found" view (EMPTY-04). Before this, an unknown #route silently rendered Home under the
   wrong address. Now it shows Booker (with classmates Mimi and Tad), says what happened, keeps the address the visitor typed and offers the main ways in.
   The page is marked noindex while it is showing. Loaded last, after premium.js has wrapped go(). Sends nothing, stores nothing. */
(function () {
  'use strict';
  if (typeof V === 'undefined' || typeof go !== 'function') return;
  const e = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // Character art from the plush library (FFPlush). The art beside the copy is Booker with two story-world classmates, Mimi and
  // Tad, at their true relative heights on felt grass (FFSupporting.cameo); the list tiles show the four friends small.
  const mini = k => window.FFPlush.img(k, { cls: 'ffa-404-mini', alt: '', h: 52 });
  const art = () => (window.FFSupporting && window.FFSupporting.cameo
    ? window.FFSupporting.cameo(['mimi', 'booker-waving', 'tad'], { cls: 'ffa-404-cast' })
    : window.FFPlush.img('booker', { cls: 'ffa-404-booker', alt: '', h: 340 }));
  const TRY = [
    ['home', 'Home', 'Start at the beginning', 'booker'],
    ['enroll', 'Visit our center', 'Tours, tuition and applications', 'lumi'],
    ['whole-child', 'The whole-child day', 'Learning, meals, movement and rest', 'zuri'],
    ['bop-at-home', 'Bop at Home', 'Free family movement', 'bop'],
    ['friends', 'Friends and books', 'Meet Booker, Lumi, Zuri and Bop', 'booker'],
    ['contact', 'Contact us', 'A real person will help', 'lumi']
  ];
  let asked = '';

  V['not-found'] = () => `<section class="ffa-404" aria-labelledby="ffa-404-h"><div class="wrap ffa-404-grid">
   <div class="ffa-404-art"><span class="ffa-404-num" aria-hidden="true">404</span>${art()}<p class="ffa-404-say" aria-hidden="true"><b>Hmm.</b> This page is not on my map.</p></div>
   <div class="ffa-404-copy"><span class="ffa-kick">Page not found</span><h1 id="ffa-404-h">We can&rsquo;t find that page</h1>
    <p class="lede">${asked ? `There is no page at <code>#${e(asked)}</code>. It may have moved, or the link has a typo.` : 'The link may have moved, or it has a typo.'} Here are some good places to go instead.</p>
    <ul class="ffa-404-try">${TRY.map(t => `<li style="--c:var(--${t[3]})"><a href="#${t[0]}">${mini(t[3])}<span><b>${t[1]}</b><small>${t[2]}</small></span></a></li>`).join('')}</ul>
    <p class="small muted">Still stuck? Call <a href="tel:+18169885661">(816) 988-5661</a> and a real person will help.</p></div></div></section>`;

  function robots(on) {
    let m = document.querySelector('meta[name="robots"][data-ff-404]');
    if (on && !m) { m = document.createElement('meta'); m.name = 'robots'; m.content = 'noindex'; m.setAttribute('data-ff-404', ''); document.head.appendChild(m); }
    if (!on && m) m.remove();
  }

  // The unknown route is served by the not-found view under its own name, so the address bar keeps what the visitor typed and a
  // re-render (settings, theme) stays on this page. Only one such alias exists at a time.
  let alias = null;
  const base = go;
  go = function (v, a) {
    if (alias && alias !== v) { delete V[alias]; alias = null; }
    const unknown = !!v && !V[v];
    if (unknown) { alias = String(v); asked = alias + (a ? '/' + a : ''); V[alias] = V['not-found']; }
    else if (v === 'not-found') asked = a ? String(a) : '';
    const r = base(v, a);
    const lost = unknown || v === 'not-found';
    robots(lost);
    if (lost) document.title = 'Page not found | Futures Friends';
    return r;
  };
  window.go = go;
  window.FFstart = () => { const h0 = (location.hash || '').replace('#', '').split('/'); go(h0[0] || 'home', h0[1]); };
  window.FFNotFound = { TRY };
})();
