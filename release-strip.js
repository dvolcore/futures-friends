/* Release status strip (reevaluation 2026-10-05, E2): one strip at the top of every commercial route, "Available now" / "Included at
   launch" / "Planned", read from the release manifest (release-manifest.js, generated from the CRM repo's docs/release/ASSET_MANIFEST.json)
   through FFRelease.strip(route), with one practical evidence item next to the claim it supports (a lesson page, a teacher workflow
   screenshot labelled sample data, or a family activity).
   Loaded late, after journey.js and unit-1.js, so it wraps the final version of each route and the strip sits directly under the
   page hero, above blocks other files insert there. Sends nothing, stores nothing. */
(function () {
  'use strict';
  if (typeof V === 'undefined' || !window.FFRelease || !window.FFRelease.strip) return;
  // End of the leading page hero: a <div class="phero"> or Home's <div class="hero"> (nested divs counted), Home's premium hero
  // <section>, the Unit 1 page's <header>, or the first <section> of experience.js's wrapped #curriculum. Leading whitespace is skipped. Anything else: 0 (the strip goes first).
  function heroEnd(html) {
    const at = html.length - html.trimStart().length, rest = html.slice(at);
    if (/^<div class="(phero|hero)"/.test(rest)) {
      const re = /<div\b|<\/div>/g; re.lastIndex = at; let depth = 0, m;
      while ((m = re.exec(html))) { depth += m[0] === '</div>' ? -1 : 1; if (depth === 0) return m.index + 6; }
      return 0;
    }
    if (/^<section\b/.test(rest)) { const i = html.indexOf('</section>', at); return i < 0 ? 0 : i + 10; }
    if (/^<div class="wc u1[" ]/.test(rest)) { const i = html.indexOf('</header>', at); return i < 0 ? 0 : i + 9; }
    if (/^<div class="ex-[a-z]+">\s*<section\b/.test(rest)) { const i = html.indexOf('</section>', at); return i < 0 ? 0 : i + 10; }   // experience.js #curriculum
    if (/^<div class="sp[ "]/.test(rest)) { const m = /<\/(section|header)>/.exec(rest); return m ? at + m.index + m[0].length : 0; }   // the store pages (store-shop.js): after the hero or page head
    return 0;
  }
  const wrap = route => {
    const base = V[route]; if (typeof base !== 'function' || base.ffStrip) return;
    const fn = function () { const html = base.apply(this, arguments); if (html.indexOf('id="rt-strip"') >= 0) return html; const i = heroEnd(html); return html.slice(0, i) + window.FFRelease.strip(route) + html.slice(i); };
    fn.ffStrip = true; V[route] = fn;
  };
  window.FFRelease.STRIP_ROUTES.forEach(wrap);
  window.FFReleaseStrip = { heroEnd, wrap };
})();
