/* Deep links (link audit, owner 2026-10-07: "I'm clicking on Meet the friends and it doesn't even go straight to the videos").
   A link or button can say WHERE on its page it lands, not just which page:
     <a href="#home" data-reveal="[data-video=intro]" data-reveal-play>      lands on that element (and presses its play button)
     <button data-go="story-time/booker-tries-again">                          data-go may carry an argument (views.js)
   - Same page: no re-render, no jump to the top; it scrolls straight to the target.
   - Another page: the normal route change runs (page turn, title, history, the h1 focus), then, once the page turn has finished,
     it scrolls to the target and moves focus there (the target's heading, or its play button for a video frame).
   - Respects reduced motion and the site's motion switch (no smooth scroll). Opens a closed <details> that holds the target.
   - data-reveal-play presses the frame's own felt play button (.hc-vbtn) while the visitor's tap still counts as a gesture, so the
     talking intro can start with its voice when sound is on (home-video.js decides; muted with captions otherwise).
   Sends nothing, stores nothing. Loaded after wayfinding.js. */
(function () {
  'use strict';
  const doc = document;
  let pending = null, token = 0;
  const moving = () => doc.documentElement.dataset.motion !== 'off' && !(typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const currentKey = () => (location.hash || '#home').slice(1).split('/').slice(0, 2).map(s => { try { return decodeURIComponent(s || ''); } catch (e) { return s || ''; } }).join('/').replace(/\/$/, '') || 'home';
  const keyOfHref = h => { const p = String(h || '').replace(/^#/, '').split('/'); let a = ''; try { a = decodeURIComponent(p[1] || ''); } catch (e) { a = p[1] || ''; } return ((p[0] || 'home') + (a ? '/' + a : '')); };
  const headerH = () => { const b = doc.querySelector('.bar'); const r = b ? b.getBoundingClientRect() : null; return r && r.bottom > 0 ? r.bottom : 0; };

  function focusTarget(el) {
    const vb = el.querySelector('.hc-vbtn'); if (vb) return vb;   // a video: its own play/pause button
    if (/^H[1-6]$/.test(el.tagName)) return el;
    return el.querySelector('h1, h2, h3') || el;
  }
  function land(el, play) {
    const d = el.closest('details'); if (d && !d.open) d.open = true;
    const r = el.getBoundingClientRect(), hh = headerH();
    // a video sits in the middle of the screen; a section starts just under the sticky header
    const top = el.querySelector('.hc-vbtn') && r.height < innerHeight - hh
      ? r.top + scrollY - hh - Math.max(8, (innerHeight - hh - r.height) / 2)
      : r.top + scrollY - hh - 12;
    scrollTo({ top: Math.max(0, top), behavior: moving() ? 'smooth' : 'auto' });
    const f = focusTarget(el);
    if (!f.matches('a[href],button,input,select,textarea,[tabindex]')) f.setAttribute('tabindex', '-1');
    f.focus({ preventScroll: true });
    el.classList.add('ffw-found'); setTimeout(() => el.classList.remove('ffw-found'), 2600);
    if (!play) return;
    // press play once the scroll has landed (so the clip's own on-screen check has run), still inside the tap's gesture window
    const press = () => { const b = el.querySelector('.hc-vbtn'); if (b && b.dataset.state !== 'playing') b.click(); };
    let done = false; const once = () => { if (!done) { done = true; requestAnimationFrame(() => requestAnimationFrame(press)); } };
    if (moving()) { addEventListener('scrollend', once, { once: true }); setTimeout(once, 700); } else once();
  }
  // waits for the new page (and its page turn) before landing; gives up quietly after ~3 s
  function settle(spec) {
    const my = ++token, t0 = Date.now();
    const tick = () => {
      if (my !== token) return;
      const v = doc.getElementById('view');
      const el = v && v.querySelector(spec.sel);
      const turning = doc.documentElement.classList.contains('ffw-vt');
      if (el && !turning && currentKey() === spec.key) return land(el, spec.play);
      if (Date.now() - t0 < 3000) requestAnimationFrame(tick);
    };
    requestAnimationFrame(() => requestAnimationFrame(tick));
  }

  doc.addEventListener('click', e => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const t = e.target.closest && e.target.closest('[data-reveal]');
    if (!t) return;
    const key = t.hasAttribute('data-go') ? keyOfHref(t.dataset.go) : keyOfHref(t.getAttribute('href'));
    const spec = { key, sel: t.dataset.reveal, play: t.hasAttribute('data-reveal-play'), at: Date.now() };
    if (key === currentKey()) {
      const el = doc.querySelector('#view ' + spec.sel);
      if (el) { e.preventDefault(); e.stopImmediatePropagation(); land(el, spec.play); return; }
    }
    pending = spec;
  }, true);

  // Detail addresses that render their detail below the page's hero: land on the detail, not the page top.
  //   #activities/<activity> -> that activity (#fl-one); #activities/<age band> -> the filtered library (#fl-lib)
  const ARG_LAND = { activities: '#fl-one, #fl-lib' };
  function install() {
    const inner = window.go;
    if (typeof inner !== 'function' || inner.__ffdl) return;
    const wrapped = function (v, a) {
      const res = inner.apply(this, arguments);
      if (pending) { const s = pending; pending = null; if (Date.now() - s.at < 2000) { settle(s); return res; } }
      if (a && ARG_LAND[v]) settle({ key: v + '/' + a, sel: ARG_LAND[v], play: false });
      return res;
    };
    wrapped.__ffdl = true;
    window.go = wrapped;
  }
  install();
  window.FFDeep = Object.freeze({ land, settle, currentKey });
})();
