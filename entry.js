/* Futures Friends: the entry gate (owner 2026-10-07: "Make it start with it ON — for demonstration purposes I need ALL the effects on").
   Browsers allow no sound before the visitor's first tap or key, so the first page load of a session opens on one felt-sky moment:
   the plush logo, "Welcome to the Futures Friends world" and one big "Tap to enter" button (Enter and Space work, it has focus), and a small "Enter for centers & programs" choice (the audience
   split, 2026-10-07: it opens #centers on the business side; families, the default, take the big button).
   That single tap is the gesture that wakes sound (sound.js listens for it): the title tune and the nature ambience start at once,
   and the gate lifts away into the hero's fly-in, which waits for it (hero-world.js and hero-motion.js call FFEntry.wait).
   On Home with motion the title's own letters play the tune as they land, so sound.js plays no second one (data-ffe-tune).
   - "Enter without sound": the same lift, with sound off for this session only (not stored; the pill can turn it back on).
   - Sound kill switch (owner 2026-10-10, window.FF_SOUND_OFF from sound-switch.js): no sound wording and no "Enter without sound";
     the one "Tap to enter" still lifts the gate into Home's cloud fly-through and letters, exactly as before.
   - Once per session (sessionStorage 'ff-entered', in try/catch; blocked storage: once per page load). ?nogate skips it.
   - The page renders underneath as always (crawlers and assistive tech get the content; the gate is an aria-modal dialog over it
     while it shows, the page behind is inert, focus stays in the gate, scroll is held).
   - Reduced motion or the motion switch off: a simple fade, nothing travels. Sends nothing, loads only the logo it shows.
   First visit = the cloud fly-through, always (owner 2026-10-07: "When someone gets the link for the first time ... make sure it goes to
   the page that flies them through the clouds"). Whatever address the visitor opened, passing the gate takes them to Home first
   (history.replaceState, so no extra Back step) and Home's opening plays in full: the camera through the clouds, the letters landing,
   the cast's entrance. The visitor STAYS on Home (owner, 2026-10-07: a link ending in #curriculum must start at the front page too).
   If they had opened a deep link, a small dismissible felt note "You were sent to: <page>  Open ->" (named from route-meta.js) shows
   at the bottom after the fly-in and hides itself after about 8 s (held while pointed at or focused); it never takes focus.
   Exception: an audience chosen at the gate (FFEntry.choose(route), e.g. 'centers') is opened once the fly-through is over.
   Reduced motion or the motion switch off: the gate fades, Home shows still, the note follows at once. Any input skips the opening as
   before. When the fly-through is over the document gets the event 'ff:first-visit-done' (detail {next: '#route' or null}).
   Public: window.FFEntry = {open() -> true while the gate shows, wait(fn) -> runs fn when the gate has been passed (now if it never
   showed), enter(withSound), choose(route|null) -> set or clear the route to open after the fly-through (the gate's audience choice),
   afterGate() -> that chosen route or null, next() -> the deep link offered in the note, or null}. */
(function () {
  'use strict';
  if (typeof document === 'undefined') return;
  const W = window, D = document, KEY = 'ff-entered';
  const waiting = [];
  let shown = false, gate = null, afterGate = null, pending = null, chip = null;
  const asked = location.hash;   // the address the visitor opened (kept while the fly-through plays on Home)
  const seen = () => { try { return W.sessionStorage.getItem(KEY) === '1'; } catch (_) { return false; } };
  const mark = () => { try { W.sessionStorage.setItem(KEY, '1'); } catch (_) { /* blocked storage: once per page load */ } };
  const still = () => D.documentElement.dataset.motion === 'off' || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const home = () => /^(#home(\/|$)|#?$)/.test(location.hash);
  // a habit card's QR player (#habit/<id>, habits.js) opens straight on the friend: a child holding a phone at the sink gets no gate and
  // no fly-through, and the visit is not marked as "entered" (the family's first visit to the site itself still opens on the gate)
  const habitCard = /^#habit\//.test(location.hash);
  const skip = /[?&]nogate\b/.test(location.search) || seen() || habitCard;

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
    const hop = hopHome();
    const g = gate;
    g.classList.add('ffe-out');
    const gone = () => { if (g.parentNode) g.parentNode.removeChild(g); delete D.documentElement.dataset.ffeTune; };
    setTimeout(gone, still() ? 260 : 900);
    // the hero's opening starts as the gate lifts (it waited for this), so the visitor sees the fly-in from its first frame
    release();
    focusH1();
    if (hop) watchFlight();
  }

  // ---- the first visit: Home's fly-through first, then on to the page the visitor asked for
  const parts = h => { const p = String(h || '').replace(/^#/, '').split('/'); let a = p[1]; try { a = a == null ? a : decodeURIComponent(a); } catch (_) { /* raw */ } return [p[0] || 'home', a]; };
  const known = v => { try { return typeof V === 'undefined' || !!V[v]; } catch (_) { return true; } };   // views.js's route table
  const target = () => (asked && !/^(#home(\/|$)|#?$)/.test(asked) && known(parts(asked)[0]) ? asked : null);
  const here = h => (W.FF_ROOT_PATH || location.pathname) + location.search + h;   // a clean-path page (kids-shop, product-...) hops to the app address
  function focusH1() {
    const h1 = D.querySelector('#view h1');
    if (h1) {
      if (!h1.hasAttribute('tabindex')) h1.setAttribute('tabindex', '-1');
      // programmatic focus for screen readers: no visible ring (it drew a dashed box round the Home logo after a tap); the ring
      // comes back as soon as the visitor tabs, because the class goes on blur
      h1.classList.add('ff-quiet-focus'); h1.addEventListener('blur', () => h1.classList.remove('ff-quiet-focus'), { once: true });
      try { h1.focus({ preventScroll: true }); } catch (_) { /* gone */ }
    }
  }
  // Home now, without a history entry; the hero's opening (waiting on FFEntry.wait) plays from the top of the page
  function hopHome() {
    if (typeof W.go !== 'function') return false;
    if (!home()) {
      try { history.replaceState(history.state, '', here('#home')); } catch (_) { return false; }
      try { W.scrollTo(0, 0); } catch (_) { /* fine */ }
      try { W.go('home'); } catch (e) { setTimeout(() => { throw e; }); return false; }
    }
    try { W.scrollTo(0, 0); } catch (_) { /* fine */ }
    return true;
  }
  function label(h) {
    const [v, a] = parts(h), M = W.FFRouteMeta;
    let t = '';
    try { t = M && typeof M.lookup === 'function' ? M.lookup(v, a).title : ''; } catch (_) { t = ''; }
    t = String(t || v.replace(/-/g, ' ')).split(' | ')[0].split(':')[0].trim();
    return t || 'the page you opened';
  }
  // when the fly-through is over: the world's opening finished (done / skipped / off) and the cast has arrived
  function watchFlight() {
    const t0 = Date.now(), calm = still();
    let castAt = 0, seenPlay = false;
    const tick = () => {
      if (!home()) { done(null); return; }                      // the visitor went somewhere else meanwhile: leave them there
      const hero = D.querySelector('#view .mh-hero'), op = hero && hero.dataset.opening, HW = W.FFHeroWorld, HM = W.FFHeroMotion;
      let ready = false;
      if (calm || !hero) ready = Date.now() - t0 > 600;
      else if (op === 'playing' && !seenPlay) {
        seenPlay = true;
        const st = HW && HW.opening && HW.opening();
        const lead = (st && st.lead) || (HW && HW.LEAD) || 2000, end = (HM && HM.END) || 2500;
        if (st && st.started) st.started.then(() => { castAt = Date.now() + lead + end + 150; });
        else castAt = Date.now() + 600 + lead + end;
      } else if (op === 'skipped') ready = true;
      else if (op === 'done') ready = !castAt || Date.now() >= castAt;
      else if (op === 'off' || !op) ready = Date.now() - t0 > 900;
      if (Date.now() - t0 > 12000) ready = true;                  // never stuck on Home
      if (ready) done(target()); else setTimeout(tick, 120);
    };
    setTimeout(tick, 120);
  }
  function done(next) {
    try { D.dispatchEvent(new CustomEvent('ff:first-visit-done', { detail: { next } })); } catch (_) { /* old browser */ }
    if (!home()) return;
    if (afterGate && known(afterGate.split('/')[0])) { const r = afterGate; afterGate = null; route('#' + r); return; }   // the audience chosen at the gate
    if (next) offer(next);
  }
  function route(h) {
    const [v, a] = parts(h);
    try { history.replaceState(history.state, '', here(h)); } catch (_) { /* go() still routes */ }
    try { W.go(v, a); } catch (e) { setTimeout(() => { throw e; }); }
    focusH1();
  }
  // the page the visitor was sent to: a small felt note under the hero, never over it; opens on a tap, hides itself after ~8 s
  function offer(next) {
    pending = next;
    const name = label(next);
    chip = D.createElement('div');
    chip.className = 'ffe-next';
    chip.setAttribute('role', 'region');
    chip.setAttribute('aria-label', 'The page you were sent to');
    chip.innerHTML = '<span class="ffe-next-t">You were sent to: <b></b></span><button type="button" class="ffe-next-go">Open <span aria-hidden="true">\u2192</span></button><button type="button" class="ffe-next-x" aria-label="Dismiss">\u00d7</button>';
    chip.querySelector('b').textContent = name;
    chip.querySelector('.ffe-next-go').setAttribute('aria-label', 'Open ' + name);
    D.body.appendChild(chip);
    // never over the hero: bottom-centre when the hero ends above it (phones); on a wide screen the hero fills the window, so the
    // note sits top-right, just under the header, over the open sky
    const hero = D.querySelector('#view .mh-hero'), bar = D.querySelector('header.bar');
    if (hero && hero.getBoundingClientRect().bottom > innerHeight - chip.offsetHeight - 24 && innerWidth >= 900) {
      chip.classList.add('ffe-next-top');
      chip.style.top = Math.round(Math.max(0, bar ? bar.getBoundingClientRect().bottom : 0) + 14) + 'px';
    }
    let timer = 0, holdOn = false;
    const arm = () => { clearTimeout(timer); timer = setTimeout(() => { if (!holdOn) close(); }, 8000); };
    const close = () => { clearTimeout(timer); W.removeEventListener('hashchange', close); W.removeEventListener('popstate', close); const had = chip && chip.contains(D.activeElement); pending = null; drop(); if (had) focusH1(); };
    W.addEventListener('hashchange', close); W.addEventListener('popstate', close);
    chip.addEventListener('focusin', () => { holdOn = true; }); chip.addEventListener('focusout', () => { holdOn = false; arm(); });
    chip.addEventListener('pointerenter', () => { holdOn = true; }); chip.addEventListener('pointerleave', () => { holdOn = false; arm(); });
    chip.querySelector('.ffe-next-go').addEventListener('click', () => { const h = pending; close(); if (h && home()) route(h); });
    chip.querySelector('.ffe-next-x').addEventListener('click', close);
    chip.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    arm();
  }
  function drop() {
    const c = chip; chip = null;
    if (!c) return;
    c.classList.add('ffe-next-out');
    setTimeout(() => { if (c.parentNode) c.parentNode.removeChild(c); }, still() ? 0 : 260);
  }

  function build() {
    if (gate || skip) return;
    // the sound kill switch (sound-switch.js): a silent site has one "Tap to enter" and no sound wording; the cloud fly-through is unchanged
    const quietSite = !!W.FF_SOUND_OFF;
    shown = true;
    if (!still()) D.documentElement.dataset.ffeTune = 'opening';   // every first visit lands on Home's opening
    gate = D.createElement('div');
    gate.className = 'ffe';
    gate.setAttribute('role', 'dialog'); gate.setAttribute('aria-modal', 'true'); gate.setAttribute('aria-labelledby', 'ffe-h'); gate.setAttribute('aria-describedby', 'ffe-p');
    gate.innerHTML = `<div class="ffe-sky" aria-hidden="true"><span class="ffe-cloud ffe-c1"></span><span class="ffe-cloud ffe-c2"></span><span class="ffe-cloud ffe-c3"></span><span class="ffe-hills"></span></div>
  <div class="ffe-card">
   <img class="ffe-logo" src="img/plush/hero/plush-logo-480.webp" srcset="img/plush/hero/plush-logo-480.webp 480w, img/plush/hero/plush-logo-960.webp 960w" sizes="(max-width:600px) 78vw, 420px" width="480" height="227" alt="Futures Friends" decoding="async" fetchpriority="high">
   <h2 id="ffe-h" class="ffe-h">Welcome to the Futures Friends world</h2>
   <p id="ffe-p" class="ffe-p">${quietSite ? 'Booker, Lumi, Zuri and Bop are out in the meadow, and they would like to say hello.' : 'Booker, Lumi, Zuri and Bop are out in the meadow, and they would like to say hello. Sound on, if you can: there is music, birdsong and four voices.'}</p>
   <button type="button" class="ffe-go"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg><span>Tap to enter</span></button>
   ${quietSite ? '' : '<button type="button" class="ffe-quiet" data-ffs-ignore>Enter without sound</button>'}
   <p class="ffe-who"><span>Run a center, home daycare, church or program?</span> <button type="button" class="ffe-centers">Enter for centers &amp; programs</button></p>
  </div>`;
    D.body.appendChild(gate);
    hold(true);
    const go = gate.querySelector('.ffe-go'), quiet = gate.querySelector('.ffe-quiet'), centers = gate.querySelector('.ffe-centers');
    go.addEventListener('click', () => enter(true));
    if (quiet) quiet.addEventListener('click', () => enter(false));
    // owner 2026-10-07: the gate is also the audience choice. Families is the default (the big button); programs go to #centers.
    // The first visit always plays Home's opening first (owner hard requirement): the choice is held as W.FFEntry.afterGate and
    // opened by done() right after the opening's 'ff:first-visit-done' (one navigation, no timer of our own).
    centers.addEventListener('click', () => {
      afterGate = 'centers';
      enter(true);
    });
    // focus stays in the gate: Tab and Shift+Tab cycle through its buttons (the last ones can be the English · Español choice that
    // i18n.js adds at the end of the card, so the list is read on each key press)
    gate.addEventListener('keydown', e => {
      if (e.key !== 'Tab') return;
      const all = [...gate.querySelectorAll('button')].filter(b => !b.disabled && b.offsetParent !== null);
      const first = all[0] || go, last = all[all.length - 1] || centers;
      if (e.shiftKey && D.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && D.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    try { go.focus({ preventScroll: true }); } catch (_) { /* not focusable yet */ }
  }

  const choose = r => { afterGate = r ? String(r).replace(/^#/, '') : null; };
  W.FFEntry = Object.freeze({ open: () => shown, wait, enter, choose, afterGate: () => afterGate, next: () => pending });
  if (!skip) { shown = true; if (D.body) build(); else D.addEventListener('DOMContentLoaded', build); }
})();
