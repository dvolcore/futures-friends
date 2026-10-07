/* Futures Friends: the entry gate (owner 2026-10-07: "Make it start with it ON — for demonstration purposes I need ALL the effects on").
   Browsers allow no sound before the visitor's first tap or key, so the first page load of a session opens on one felt-sky moment:
   the plush logo, "Welcome to the Futures Friends world" and one big "Tap to enter" button (Enter and Space work, it has focus).
   That single tap is the gesture that wakes sound (sound.js listens for it): the title tune and the nature ambience start at once,
   and the gate lifts away into the hero's fly-in, which waits for it (hero-world.js and hero-motion.js call FFEntry.wait).
   On Home with motion the title's own letters play the tune as they land, so sound.js plays no second one (data-ffe-tune).
   - "Enter without sound": the same lift, with sound off for this session only (not stored; the pill can turn it back on).
   - Once per session (sessionStorage 'ff-entered', in try/catch; blocked storage: once per page load). ?nogate skips it.
   - The page renders underneath as always (crawlers and assistive tech get the content; the gate is an aria-modal dialog over it
     while it shows, the page behind is inert, focus stays in the gate, scroll is held).
   - Reduced motion or the motion switch off: a simple fade, nothing travels. Sends nothing, loads only the logo it shows.
   Public: window.FFEntry = {open() -> true while the gate shows, wait(fn) -> runs fn when the gate has been passed (now if it never
   showed), enter(withSound)}. */
(function () {
  'use strict';
  if (typeof document === 'undefined') return;
  const W = window, D = document, KEY = 'ff-entered';
  const waiting = [];
  let shown = false, gate = null;
  const seen = () => { try { return W.sessionStorage.getItem(KEY) === '1'; } catch (_) { return false; } };
  const mark = () => { try { W.sessionStorage.setItem(KEY, '1'); } catch (_) { /* blocked storage: once per page load */ } };
  const still = () => D.documentElement.dataset.motion === 'off' || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const home = () => /^(#home(\/|$)|#?$)/.test(location.hash);
  const skip = /[?&]nogate\b/.test(location.search) || seen();

  function release() { shown = false; waiting.splice(0).forEach(f => { try { f(); } catch (e) { setTimeout(() => { throw e; }); } }); }
  function wait(fn) { if (typeof fn !== 'function') return; if (shown) waiting.push(fn); else fn(); }

  const inertSet = [];
  function hold(on) {
    D.documentElement.classList.toggle('ffe-open', on);
    if (on) { for (const el of D.body.children) if (el !== gate && !el.inert && el.tagName !== 'SCRIPT') { el.inert = true; inertSet.push(el); } }
    else inertSet.splice(0).forEach(el => { el.inert = false; });
  }

  function enter(withSound) {
    if (!shown || !gate || gate.dataset.leaving) return;
    gate.dataset.leaving = '1';
    mark();
    const S = W.FFSound;
    if (S) {
      if (!withSound) S.set(false, { session: true });
      else if (!S.enabled()) S.set(true);
    }
    hold(false);
    const g = gate;
    g.classList.add('ffe-out');
    const gone = () => { if (g.parentNode) g.parentNode.removeChild(g); delete D.documentElement.dataset.ffeTune; };
    setTimeout(gone, still() ? 260 : 900);
    // the hero's opening starts as the gate lifts (it waited for this), so the visitor sees the fly-in from its first frame
    release();
    const h1 = D.querySelector('#view h1');
    if (h1) { if (!h1.hasAttribute('tabindex')) h1.setAttribute('tabindex', '-1'); try { h1.focus({ preventScroll: true }); } catch (_) { /* gone */ } }
  }

  function build() {
    if (gate || skip) return;
    shown = true;
    if (home() && !still()) D.documentElement.dataset.ffeTune = 'opening';
    gate = D.createElement('div');
    gate.className = 'ffe';
    gate.setAttribute('role', 'dialog'); gate.setAttribute('aria-modal', 'true'); gate.setAttribute('aria-labelledby', 'ffe-h'); gate.setAttribute('aria-describedby', 'ffe-p');
    gate.innerHTML = `<div class="ffe-sky" aria-hidden="true"><span class="ffe-cloud ffe-c1"></span><span class="ffe-cloud ffe-c2"></span><span class="ffe-cloud ffe-c3"></span><span class="ffe-hills"></span></div>
  <div class="ffe-card">
   <img class="ffe-logo" src="img/plush/hero/plush-logo-480.webp" srcset="img/plush/hero/plush-logo-480.webp 480w, img/plush/hero/plush-logo-960.webp 960w" sizes="(max-width:600px) 78vw, 420px" width="480" height="227" alt="Futures Friends" decoding="async" fetchpriority="high">
   <h2 id="ffe-h" class="ffe-h">Welcome to the Futures Friends world</h2>
   <p id="ffe-p" class="ffe-p">Booker, Lumi, Zuri and Bop are waiting in the meadow. Turn your sound up: the friends have music, birdsong and voices to share.</p>
   <button type="button" class="ffe-go"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg><span>Tap to enter</span></button>
   <button type="button" class="ffe-quiet" data-ffs-ignore>Enter without sound</button>
  </div>`;
    D.body.appendChild(gate);
    hold(true);
    const go = gate.querySelector('.ffe-go'), quiet = gate.querySelector('.ffe-quiet');
    go.addEventListener('click', () => enter(true));
    quiet.addEventListener('click', () => enter(false));
    // focus stays in the gate: Tab and Shift+Tab cycle between its two buttons
    gate.addEventListener('keydown', e => {
      if (e.key !== 'Tab') return;
      const first = go, last = quiet;
      if (e.shiftKey && D.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && D.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    try { go.focus({ preventScroll: true }); } catch (_) { /* not focusable yet */ }
  }

  W.FFEntry = Object.freeze({ open: () => shown, wait, enter });
  if (!skip) { shown = true; if (D.body) build(); else D.addEventListener('DOMContentLoaded', build); }
})();
