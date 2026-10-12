/* Futures Friends: one entrance reveal and one heading rise for the inner pages (motion audit 2026-10-12, SYS1 + SYS2).
   Built on the motion kit (ff-motion.js): one FFMotion.scope() per render, torn down by the next one. Home has its own motion
   (home-alive.js, hero-world.js ...), so nothing here runs on Home; app-like routes (sign-in, portals, the Academy, the cart) are left
   alone too.

   1. Entrance reveal (a port of React Bits "Animated Content" / "Fade Content"): sections and cards rise 16 px and fade in, once, as
      they come into view; siblings that arrive together are staggered 60 ms. Pages opt in by markup:
        data-ff-reveal          on a block: reveal this block
        data-ff-reveal="group"  on a container: reveal each child, staggered
        data-ff-reveal="off"    on anything: never reveal it or anything inside it
      and every inner route gets the default set: the blocks of each section's .wrap (a grid's cards one by one).
      Only blocks still below the fold when the page renders wait for their entrance, so nothing on screen ever blinks. Content is
      never hidden unless JavaScript AND motion are both on (the attribute is added here, the hidden look is CSS keyed to
      html.ffr-on): no-JS visitors, crawlers and print see everything; reduced motion or the Decorative motion switch mean no hiding
      and no movement. Opacity and `translate` only, so there is no layout shift.
   2. Heading rise (the felt version of React Bits "Split Text"): page headings (h1, h2) rise into place word by word with GSAP
      SplitText (words, not letters: calmer), and a gold stitch draws under the last word, like Home's headings. SplitText's aria
      handling keeps each heading read as one phrase (aria-label on the heading, the word boxes aria-hidden). Spanish: headings are
      split only after the Spanish text is in (FFi18n.ready()), and the language switch re-renders the page, which splits again.
   Sends nothing, stores nothing. */
(function () {
  'use strict';
  if (typeof document === 'undefined') return;
  const M = () => window.FFMotion;
  const R = document.documentElement;
  // app-like screens: forms, dashboards, readers and checkout keep their own (or no) motion
  const SKIP = new Set(['home', 'academy', 'signin-family', 'signin-teacher', 'sign-in', 'account', 'reset-password', 'portal', 'family-portal',
    'learn', 'learn-course', 'learn-cert', 'learn-team', 'learn-author', 'learn-approve', 'verify', 'start-center', 'c', 'enroll-link',
    'timeclock', 'cart', 'checkout', 'order', 'order-return', 'room-planner', 'app', 'unit-1', 'this-week', 'my-week', 'not-found']);
  const routeArg = () => { try { return (location.hash || '').replace(/^#/, '').split('/')[1] || ''; } catch (e) { return ''; } };
  const wants = view => !SKIP.has(view) && !(view === 'story-time' && routeArg()) && !(view === 'habit' && routeArg());
  const OFF = '[data-ff-reveal="off"], [data-signature], [data-h3], .phero, dialog, [hidden]';
  const GRID = /(^|\s)(grid|g2|g3|g4|g5|[\w-]*-grid|grid-[\w-]*|[\w-]*grid)(\s|$)/;
  const MAX = 90;
  let live = null;

  // ------------------------------------------------------------------------------------------------ 1. entrance reveal
  function blocks(root) {
    const out = [];
    const push = el => { if (el && el.nodeType === 1 && !out.includes(el) && !el.closest(OFF)) out.push(el); };
    root.querySelectorAll('[data-ff-reveal]:not([data-ff-reveal="off"]):not([data-ff-reveal="group"])').forEach(push);
    root.querySelectorAll('[data-ff-reveal="group"]').forEach(g => Array.from(g.children).forEach(push));
    root.querySelectorAll('section > .wrap').forEach(w => {
      if (w.closest(OFF)) return;
      Array.from(w.children).forEach(b => {
        if (b.closest(OFF) || b.hasAttribute('data-ff-reveal')) return;
        const kids = Array.from(b.children);
        if (GRID.test(b.className && b.className.baseVal === undefined ? b.className : '') && kids.length > 1) kids.forEach(push);
        else push(b);
      });
    });
    return out.slice(0, MAX);
  }
  function reveal(root, sc) {
    const vh = innerHeight || 800;
    const list = blocks(root).filter(el => {
      if (el.matches('h1, h2') || el.querySelector('h1[data-ffh], h2[data-ffh]')) return false;   // headings rise word by word instead
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || r.top < vh) return false;                                      // on screen (or not drawn): never hidden
      const cs = getComputedStyle(el);
      return cs.position !== 'sticky' && cs.position !== 'fixed' && cs.display !== 'contents';
    });
    if (!list.length) return;
    list.forEach(el => el.setAttribute('data-ffr', 'wait'));
    const done = el => { if (el.getAttribute('data-ffr') !== 'wait' && el.getAttribute('data-ffr') !== 'in') return; el.removeAttribute('data-ffr'); el.style.removeProperty('--ffr-d'); };
    const show = (el, i, instant) => {
      if (el.getAttribute('data-ffr') !== 'wait') return;
      if (instant) { done(el); return; }
      el.style.setProperty('--ffr-d', Math.min(i, 5) * M().dur.stagger + 'ms');
      el.setAttribute('data-ffr', 'in');
      sc.timer(() => done(el), M().dur.enter + Math.min(i, 5) * M().dur.stagger + 80);
    };
    const io = sc.observe(es => {
      let i = 0;
      es.forEach(e => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        // arriving from above (a jump down the page, Back to a saved place): just there, no rise
        show(e.target, i++, e.boundingClientRect.top < 0);
      });
    }, { threshold: 0, rootMargin: '0px 0px -6% 0px' });
    if (!io) { list.forEach(done); return; }
    list.forEach(el => io.observe(el));
    // a keyboard user who tabs into a block that has not arrived yet sees it at once
    sc.listen(document, 'focusin', e => { const w = e.target && e.target.closest && e.target.closest('[data-ffr="wait"]'); if (w) done(w); });
    sc.listen(window, 'beforeprint', () => list.forEach(done));
    sc.add(() => list.forEach(el => { if (el.isConnected) done(el); }));
  }

  // ------------------------------------------------------------------------------------------------ 2. heading rise
  const INTERACTIVE = 'a, button, input, select, textarea, img, svg, video, picture, iframe, [tabindex]';
  function splittable(h) {
    if (h.closest('[data-ff-split="off"], dialog, [hidden], [aria-hidden="true"]') || h.hasAttribute('data-ffh')) return false;
    if (h.querySelector(INTERACTIVE) || h.hasAttribute('aria-label') || h.hasAttribute('aria-labelledby')) return false;
    const t = (h.textContent || '').replace(/\s+/g, ' ').trim();
    if (t.length < 2 || t.length > 140) return false;
    return !!(h.offsetParent || h.getClientRects().length);
  }
  function headings(root, sc, view, t0) {
    const G = window.gsap, ST = window.SplitText;
    if (!G || !ST) return;
    try { G.registerPlugin(ST); } catch (e) { /* registered already */ }
    const vh = innerHeight || 800, late = performance.now() - t0 > 400;
    const hs = Array.from(root.querySelectorAll('h1, h2')).filter(splittable).filter(h => {
      // a late split (Spanish text arriving after the first paint) leaves headings already on screen untouched: no shift, no blink
      if (!late) return true;
      return h.getBoundingClientRect().top > vh;
    }).slice(0, 40);
    if (!hs.length) return;
    const splits = [], tweens = [];
    const rise = (h, words) => {
      const tw = G.to(words, { y: 0, opacity: 1, duration: M().dur.enter / 1000, ease: M().gsapEase.out, stagger: 0.045, overwrite: true,
        onComplete: () => { G.set(words, { clearProps: 'transform,opacity' }); h.classList.add('is-stitched'); } });
      tweens.push(tw);
    };
    const below = [];
    hs.forEach(h => {
      h.setAttribute('data-i18n-skip', '');      // the words are already in the page language; the phrase pass must not re-translate a single word
      h.setAttribute('data-ffh', '');
      let st;
      try { st = new ST(h, { type: 'words', wordsClass: 'ffh-w', aria: 'auto' }); } catch (e) { h.removeAttribute('data-i18n-skip'); h.removeAttribute('data-ffh'); return; }
      splits.push([h, st]);
      const words = st.words || [];
      if (!words.length) return;
      words[words.length - 1].classList.add('ffh-key');
      G.set(words, { y: '0.45em', opacity: 0 });
      if (h.getBoundingClientRect().top < vh) rise(h, words); else { below.push(h); h._ffhWords = words; }
    });
    sc.enter(below, h => rise(h, h._ffhWords || []), { threshold: 0.4 });
    const undo = () => {
      tweens.forEach(t => t.kill());
      splits.forEach(([h, st]) => { try { if (h.isConnected) st.revert(); } catch (e) { /* gone */ } h.removeAttribute('data-i18n-skip'); h.removeAttribute('data-ffh'); h.classList.remove('is-stitched'); delete h._ffhWords; });
      splits.length = 0;
    };
    // language switch: back to the plain heading at once (the route then re-renders and splits the new language)
    sc.listen(document, 'ff:lang', undo);
    sc.listen(window, 'beforeprint', () => splits.forEach(([h, st]) => { G.set(st.words || [], { clearProps: 'transform,opacity' }); h.classList.add('is-stitched'); }));
    sc.add(undo);
  }

  function setup(view, root, ok) {
    if (live) { live.abort(); live = null; }
    const on = !!(M() && root && wants(view) && M().allowed(ok) && typeof IntersectionObserver === 'function');
    R.classList.toggle('ffr-on', on);
    if (!on) return;
    const sc = M().scope();
    live = sc;
    sc.add(() => R.classList.remove('ffr-on'));
    const t0 = performance.now();
    // after the phrase pass (i18n.js translates new nodes in a microtask) and before the first paint of the new page
    const I = window.FFi18n, lang = I ? I.lang : 'en';
    const ready = lang === 'es' && I ? (typeof I.ready === 'function' ? I.ready() : typeof I.loadPack === 'function' ? I.loadPack() : null) : null;
    const go = () => sc.frame(() => { if (sc.aborted) return; headings(root, sc, view, t0); reveal(root, sc); });
    if (ready && ready.then) ready.then(go, go); else go();
  }

  window.FFhooks = window.FFhooks || [];
  window.FFhooks.push(setup);
  window.FFReveal = { setup, blocks, SKIP };
})();
