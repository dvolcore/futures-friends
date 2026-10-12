/* Futures Friends: the one button and control feedback system (motion audit 2026-10-12 SYS4 + Apple HIG audit 2026-10-12 #1, #16).
   The looks live in ff-ui.css; this file only adds what CSS cannot do alone:
   - Pressed on pointer-down: every control (link, button, tab, summary, label, card) gets .is-pressed the moment a finger or the mouse
     goes down (iOS Safari does not always apply :active to a touch), and loses it on release, cancel (a scroll) or leaving the page.
     Space/Enter on a focused button shows the same pressed look while the key is down.
   - Magnet (React Bits "Magnet"): the main call-to-action of each inner page only (data-ff-magnet, or the hero's gold button), on a
     desktop fine pointer, at most 6 px, and only the label moves (FFMotion.magnet). Home wires its own (home-alive.js).
   - Click Spark (React Bits "Click Spark"): real wins only, an item added to the bag and a form request that was really sent
     (ff:intake outcome "ok"), in the friends' colours (FFMotion.spark). Never on an ordinary click.
   Reduced motion and the Decorative motion switch turn off the squish, the lift, the magnet and the spark (FFMotion.allowed()); the
   pressed state stays as a plain colour change, which is not motion. Sends nothing, stores nothing. */
(function () {
  'use strict';
  if (typeof document === 'undefined') return;
  const M = () => window.FFMotion;
  const CONTROL = 'a[href], button, [role="button"], [role="tab"], [role="switch"], [role="menuitem"], [role="option"], summary, label[for], [data-go], input[type="checkbox"], input[type="radio"], select';
  let pressed = null, lastDown = null;

  const control = t => {
    const el = t && t.closest ? t.closest(CONTROL) : null;
    if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true' || el.closest('[inert]')) return null;
    return el;
  };
  const release = () => { if (pressed) { pressed.classList.remove('is-pressed'); pressed = null; } };
  document.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    release();
    const el = control(e.target);
    lastDown = { x: e.clientX, y: e.clientY, el, t: Date.now() };
    if (!el) return;
    pressed = el;
    el.classList.add('is-pressed');
  }, { capture: true, passive: true });
  ['pointerup', 'pointercancel', 'dragstart', 'blur'].forEach(t => (t === 'blur' ? window : document).addEventListener(t, release, { capture: true, passive: true }));
  document.addEventListener('visibilitychange', release);
  // a finger that slides more than a few px is scrolling, not pressing
  document.addEventListener('pointermove', e => { if (pressed && lastDown && e.pointerType !== 'mouse' && Math.hypot(e.clientX - lastDown.x, e.clientY - lastDown.y) > 10) release(); }, { capture: true, passive: true });
  document.addEventListener('keydown', e => {
    if ((e.key !== ' ' && e.key !== 'Enter') || e.repeat) return;
    const el = e.target && e.target.matches && e.target.matches('button, [role="button"], a[href].btn, a[href].px-btn, a[href].hc-btn') ? e.target : null;
    if (el) { release(); pressed = el; el.classList.add('is-pressed'); }
  }, true);
  document.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') release(); }, true);

  // ---- Click Spark on real wins
  const sparkAt = el => { const m = M(); if (!m || !m.spark) return; if (el && el.isConnected) m.spark(el); else if (lastDown && Date.now() - lastDown.t < 4000) m.spark({ x: lastDown.x, y: lastDown.y }); };
  function wrapCart() {
    const K = window.FFCart;
    if (!K || typeof K.addAnimated !== 'function' || K._ffSpark) return;
    const orig = K.addAnimated;
    K._ffSpark = true;
    K.addAnimated = function (pid, opts, qty, fromEl) {
      const k = orig.apply(this, arguments);
      if (k) sparkAt(fromEl && fromEl.closest ? (fromEl.closest('button, a') || fromEl) : null);
      return k;
    };
  }
  wrapCart();
  document.addEventListener('ff:intake', e => {
    if (!e.detail || e.detail.outcome !== 'ok') return;
    const a = document.activeElement;
    sparkAt(a && a !== document.body && a.closest ? (a.closest('form') ? a.closest('form').querySelector('[type="submit"], button:not([type="button"])') || a : a) : (lastDown && lastDown.el));
  });

  // ---- Magnet on the main call-to-action of an inner page
  let live = null;
  function setup(view, root, ok) {
    if (live) { live.abort(); live = null; }
    wrapCart();
    if (view === 'home' || !root || !M() || !M().magnet || !M().allowed(ok) || !M().fine()) return;
    const main = root.querySelector('[data-ff-magnet]') || root.querySelector('.phero .btn.gold, .h3 .btn.gold, .ffl .btn.gold') || null;
    if (!main) return;
    const r = main.getBoundingClientRect();
    if (!r.width || r.top > (innerHeight || 800)) return;       // the main call-to-action is the one on the first screen
    live = M().scope();
    M().magnet(main, live, { max: 6 });
  }
  window.FFhooks = window.FFhooks || [];
  window.FFhooks.push(setup);
  window.FFButtons = { setup, CONTROL, release };
})();
