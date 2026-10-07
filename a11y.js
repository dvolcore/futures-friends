/* Futures Friends, Wave 3 G: accessibility helpers shared by every route.
   1. FFA11y.announce(text): one polite live region that lives outside any re-rendered view, so a message is spoken even when the
      view that caused it was replaced (page turns in Story Time, day changes in the Unit 1 viewer).
   2. Heading levels: the site writes card headings as h3 under an h1. Where a heading jumps more than one level below the one before it,
      it gets the level that follows (aria-level), so the outline a screen reader announces has no gaps. Looks are not touched.
   3. Scrolling tables (.tw) that really overflow become one keyboard stop with a name, so a keyboard user can scroll them.
   Runs after every render (FFhooks) and after later partial re-renders (MutationObserver on #view). Sends nothing, stores nothing. */
(function () {
  'use strict';
  if (typeof document === 'undefined') return;

  // ---------------------------------------------------------------- 1. announcer
  let live = null, timer = 0;
  function region() {
    if (live && live.isConnected) return live;
    live = document.createElement('div');
    live.id = 'ff-announce'; live.className = 'sr-only';
    live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite'); live.setAttribute('aria-atomic', 'true');
    document.body.appendChild(live);
    return live;
  }
  function announce(text) {
    const r = region();
    clearTimeout(timer);
    r.textContent = '';                                                     // clear first so the same sentence twice is still spoken
    timer = setTimeout(() => { r.textContent = String(text == null ? '' : text); }, 60);
  }

  // ---------------------------------------------------------------- 2. heading outline
  const HEADINGS = 'h1,h2,h3,h4,h5,h6,[role="heading"]';
  const hiddenAncestor = el => el.closest('[hidden],dialog:not([open]),[aria-hidden="true"],template');
  function naturalLevel(h) {
    const stored = h.getAttribute('data-ff-level');
    if (stored) return +stored;
    const m = /^H([1-6])$/.exec(h.tagName);
    return m ? +m[1] : (+h.getAttribute('aria-level') || 2);
  }
  function fixHeadings(root) {
    const list = Array.from((root || document).querySelectorAll(HEADINGS)).filter(h => !hiddenAncestor(h));
    let prev = 0;
    list.forEach(h => {
      const natural = naturalLevel(h);
      if (prev && natural > prev + 1) {
        const eff = prev + 1;
        if (!h.hasAttribute('data-ff-level')) h.setAttribute('data-ff-level', String(natural));
        h.setAttribute('aria-level', String(eff));
        prev = eff;
      } else {
        if (h.hasAttribute('data-ff-level')) { h.removeAttribute('data-ff-level'); if (/^H[1-6]$/.test(h.tagName)) h.removeAttribute('aria-level'); }
        prev = natural;
      }
    });
  }

  // ---------------------------------------------------------------- 3. scrolling tables
  function nameFor(el) {
    const cap = el.querySelector('caption');
    const own = cap ? cap.textContent : '';
    const scope = el.closest('.card,section,article,details');
    const h = scope && scope.querySelector('h1,h2,h3,h4');
    const t = (own || (h ? h.textContent : '') || 'Table').replace(/\s+/g, ' ').trim().slice(0, 80);
    return t + ' (table, scrolls sideways)';
  }
  function fixScrollers(root) {
    (root || document).querySelectorAll('.tw').forEach(el => {
      const overflow = el.scrollWidth > el.clientWidth + 1;
      const mine = el.getAttribute('data-ff-scroll') === '1';
      if (overflow && !el.matches('a,button,input,select,textarea,[tabindex]') && !el.querySelector('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])')) {
        el.setAttribute('tabindex', '0'); el.setAttribute('role', 'group'); el.setAttribute('aria-label', nameFor(el)); el.setAttribute('data-ff-scroll', '1');
      } else if (!overflow && mine) {
        el.removeAttribute('tabindex'); el.removeAttribute('role'); el.removeAttribute('aria-label'); el.removeAttribute('data-ff-scroll');
      }
    });
  }

  // ---------------------------------------------------------------- 4. empty table headers (an actions column) get a name
  function fixTables(root) {
    (root || document).querySelectorAll('th').forEach(th => {
      if (th.textContent.trim() || th.hasAttribute('aria-label') || th.querySelector('img[alt]:not([alt=""]),svg[aria-label]')) return;
      th.setAttribute('aria-label', 'Actions');
    });
  }

  // ---------------------------------------------------------------- wiring
  let queued = false;
  const ROOTS = ['view', 'dlg'];                                         // the page, and the recipe dialog that is filled after it opens
  function run() {
    queued = false;
    try {
      fixHeadings(document.getElementById('view'));
      ROOTS.forEach(id => { const r = document.getElementById(id); if (r) { fixScrollers(r); fixTables(r); } });
    } catch (e) { console.warn('a11y', e); }
  }
  function schedule() { if (queued) return; queued = true; (window.requestAnimationFrame || setTimeout)(run); }

  window.FFA11y = { announce, fixHeadings, fixScrollers, fixTables, run };
  window.FFhooks = window.FFhooks || [];
  window.FFhooks.push(() => { region(); schedule(); });
  if (window.MutationObserver) ROOTS.forEach(id => { const r = document.getElementById(id); if (r) new MutationObserver(schedule).observe(r, { childList: true, subtree: true }); });
  window.addEventListener('resize', schedule);
})();
