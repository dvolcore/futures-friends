/* Build stamp (owner 2026-10-07): the owner shares one link forever and phones keep stale copies (GitHub Pages caches pages for 10
   minutes; iOS keeps tabs alive for days). index.html carries its build inline (window.FF_BUILD); this asks version.json, with no
   cache, on load and whenever the tab comes back into view. If the published build is newer, the page reloads ONCE for that build
   (a sessionStorage guard, so a stale cache can never cause a loop; no storage, no reload). It never reloads while a video is playing
   or a form field has focus: it tries again the next time the tab comes back. ?nostamp turns it off (tests).
   The only request it makes is version.json. Bump version.json and FF_BUILD together on every publish (README). */
(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof fetch !== 'function' || /[?&]nostamp\b/.test(location.search)) return;
  const have = window.FF_BUILD, KEY = 'ff-build-reload';
  if (typeof have !== 'string' || !have) return;
  const busy = () => {
    const a = document.activeElement;
    if (a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable)) return true;
    return [...document.querySelectorAll('video')].some(v => !v.paused && !v.ended);
  };
  const check = () => fetch('version.json?t=' + Date.now(), { cache: 'no-store' })
    .then(r => (r && r.ok ? r.json() : null))
    .then(j => {
      const live = j && typeof j.build === 'string' ? j.build : '';
      if (!live || live === have) return;
      let done = null;
      try { done = sessionStorage.getItem(KEY); } catch (e) { return; }   // no guard possible: never risk a loop
      if (done === live || busy()) return;
      try { sessionStorage.setItem(KEY, live); } catch (e) { return; }
      location.reload();
    })
    .catch(() => { /* offline or blocked: keep the page as it is */ });
  check();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
  window.FFBuildStamp = { check, busy };
})();
