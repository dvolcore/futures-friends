/* Futures Friends signature moments (motion audit 2026-10-12, SIG1 to SIG4): four React Bits components ported to vanilla JS on the
   motion kit (ff-motion.js), one FFMotion.scope() per route render, aborted on the next render. Styles: ff-signatures.css.
   - SIG1 #for-families "Try one tonight" (port of "Bounce Cards"): once per render, as the grid comes into view, its cards drop in
     from 20 px above with a soft tilt (3 deg, none on a one-column phone layout) and settle flat on the spring curve, 60 ms apart.
     Once settled, a fine pointer's hover lifts a card 4 px (CSS).
   - SIG2 #friends book covers (ports of "Tilted Card" + "Glare Hover"): on a desktop fine pointer each cover link tilts up to 6 deg
     toward the pointer (perspective) and a soft shine sweeps across it; flat again when the pointer leaves its card. On touch, a light press (.98).
     The cover image is never touched: the link holding it tilts, the shine is an aria-hidden overlay span.
   - SIG3 #watch episode cards (port of "Spotlight Card"): a soft radial glow in the card's friend colour (--c: Booker blue, Lumi
     pink, Zuri green, Bop PURPLE) follows a fine pointer; keyboard focus inside a card shows the same glow, centred. The glow is the
     card's ::before at z-index -1 in an isolated card, so it sits behind the thumbnail art and the text (features.js animates the
     cards themselves with GSAP, so nothing here writes a transform on them).
   - SIG4 #store hero (port of "Card Swap"): the hero product tiles become a diagonal stack of equal cards, enhanced inside render()
     (before first paint; the tiles are absolutely placed in a fixed-ratio stage, so nothing around them moves). Every 5 s the front
     card drops and goes to the back while the others step forward (translate/rotate/scale only, under 8 deg). It pauses on hover,
     focus inside, off screen or on a hidden tab, and with the visible Pause button (WCAG 2.2.2, English and Spanish). The tiles stay
     real links in DOM order; a focused tile comes to the front. Every product picture stays whole (object-fit: contain).
   Reduced motion or the Decorative motion switch (FFMotion.allowed()): none of this runs and every page is exactly as before.
   Containers animated here carry data-ff-reveal="off" so the generic entrance reveal (ff-reveal.js) leaves them alone.
   Character art only ever moves, rotates or scales uniformly. Nothing is sent or stored. */
(function () {
  'use strict';
  let live = null;
  const M = () => window.FFMotion;
  const ES = { 'Pause the shuffle': 'Pausar el cambio', 'Play the shuffle': 'Reanudar el cambio' };
  const T = en => (window.FFi18n && typeof window.FFi18n.t === 'function' ? window.FFi18n.t(en) : en);
  try { if (window.FFi18n && window.FFi18n.add) window.FFi18n.add('es', ES); } catch (e) { /* Spanish is optional */ }
  const narrow = () => typeof matchMedia === 'function' && matchMedia('(max-width: 900px)').matches;

  // ---------------------------------------------------------------- SIG1 Bounce Cards (#for-families)
  function bounce(root, sc) {
    const grid = root.querySelector('.fj-provider.fj-family .fj-famgrid');
    if (!grid) return;
    const cards = Array.from(grid.children).filter(c => c.matches('article.fj-act, .fj-center'));
    if (!cards.length) return;
    grid.setAttribute('data-ff-reveal', 'off');
    grid.classList.add('ffsig-bounce');
    sc.add(() => { grid.classList.remove('ffsig-bounce', 'is-settled'); cards.forEach(c => c.classList.remove('ffsig-pre')); });
    const E = M().ease, D = M().dur;
    const play = () => {
      const tilt = narrow() ? 0 : 3;
      let left = cards.length;
      cards.forEach((c, i) => {
        c.classList.remove('ffsig-pre');
        const r = tilt ? (i % 2 ? tilt : -tilt) : 0;
        const a = sc.anim(c, [{ transform: `translateY(-20px) rotate(${r}deg)`, opacity: 0 }, { transform: 'none', opacity: 1 }],
          { duration: 540, delay: i * D.stagger, easing: E.spring, fill: 'backwards' });
        const done = () => { if (--left === 0 && !sc.aborted) grid.classList.add('is-settled'); };
        if (a) a.addEventListener('finish', done); else done();
      });
    };
    const r = grid.getBoundingClientRect(), vh = window.innerHeight || 800;
    if (r.top < vh * 0.85 && r.bottom > 0) { play(); return; }
    // below the fold: held invisible (opacity/transform only, so nothing moves) until the grid comes into view; print resets it
    cards.forEach(c => c.classList.add('ffsig-pre'));
    sc.enter([grid], play, { threshold: 0.2 });
  }

  // ---------------------------------------------------------------- SIG2 Tilted Card + Glare Hover (#friends)
  function tilt(root, sc) {
    const covers = Array.from(root.querySelectorAll('a.cover-art'));
    if (!covers.length) return;
    const fine = M().fine(), MAX = 6;
    covers.forEach(a => {
      a.classList.add('ffsig-tilt');
      const glare = document.createElement('span');
      glare.className = 'ffsig-glare';
      glare.setAttribute('aria-hidden', 'true');
      a.appendChild(glare);
      sc.add(() => { glare.remove(); a.classList.remove('ffsig-tilt', 'is-tilting'); a.style.removeProperty('transform'); });
      if (!fine) return;
      let id = 0, rx = 0, ry = 0;
      const put = () => { id = 0; if (!a.classList.contains('is-tilting')) return; a.style.transform = `perspective(700px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`; };
      // the pointer is read on the card that holds the cover, which never tilts: a tilted edge slipping out from under the pointer
      // cannot flicker the effect off and on
      const host = a.closest('figure, .card') || a.parentElement || a;
      sc.listen(host, 'pointermove', e => {
        if (e.pointerType !== 'mouse') return;
        const b = host.getBoundingClientRect();
        if (!b.width || !b.height) return;
        const x = Math.max(0, Math.min(1, (e.clientX - b.left) / b.width)), y = Math.max(0, Math.min(1, (e.clientY - b.top) / b.height));
        ry = (x - 0.5) * 2 * MAX; rx = (0.5 - y) * 2 * MAX;
        a.classList.add('is-tilting');
        if (!id) id = sc.frame(put);
      });
      sc.listen(host, 'pointerleave', () => { rx = 0; ry = 0; a.classList.remove('is-tilting'); a.style.removeProperty('transform'); });
    });
  }

  // ---------------------------------------------------------------- SIG3 Spotlight Card (#watch)
  function spotlight(root, sc) {
    const box = root.querySelector('#ffx-eps');
    if (!box) return;
    const cards = () => Array.from(box.querySelectorAll('.ffx-mcard[data-ffx-ep]'));
    if (!cards().length) return;
    cards().forEach(c => c.classList.add('ffsig-spot'));
    sc.add(() => cards().forEach(c => { c.classList.remove('ffsig-spot'); c.style.removeProperty('--mx'); c.style.removeProperty('--my'); }));
    if (!M().fine()) return;
    let id = 0, card = null, mx = 0, my = 0;
    const put = () => { id = 0; if (card) { card.style.setProperty('--mx', mx.toFixed(0) + 'px'); card.style.setProperty('--my', my.toFixed(0) + 'px'); } };
    sc.listen(box, 'pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      const c = e.target.closest && e.target.closest('.ffsig-spot');
      if (!c) return;
      const b = c.getBoundingClientRect();
      card = c; mx = e.clientX - b.left; my = e.clientY - b.top;
      if (!id) id = sc.frame(put);
    });
  }

  // ---------------------------------------------------------------- SIG4 Card Swap (#store hero)
  const SLOT = [[0, 0, -1.5, 1], [16, -12, 3, 0.92], [32, -24, 6, 0.84]];   // translate x %, y % (of the card), rotate deg, scale
  function swap(root, sc) {
    const stage = root.querySelector('.h3:not(.is-compact) .h3-stage');
    if (!stage) return;
    const tiles = Array.from(stage.querySelectorAll(':scope > a.h3-tile'));
    if (tiles.length < 2) return;
    let order = tiles.slice(), user = false, clock = 0, busy = false;
    const place = () => order.forEach((t, i) => {
      const s = SLOT[Math.min(i, SLOT.length - 1)];
      t.style.setProperty('--ffsig-x', s[0] + '%'); t.style.setProperty('--ffsig-y', s[1] + '%');
      t.style.setProperty('--ffsig-r', s[2] + 'deg'); t.style.setProperty('--ffsig-s', String(s[3]));
      t.style.setProperty('--ffsig-z', String(20 - i));
      t.toggleAttribute('data-ffsig-front', i === 0);
    });
    stage.setAttribute('data-ff-reveal', 'off');
    stage.classList.add('ffsig-stack');
    place();
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ffsig-pause';
    const label = () => {
      const en = user ? 'Play the shuffle' : 'Pause the shuffle';
      btn.innerHTML = `<span class="ffsig-pi" aria-hidden="true">${user ? '<svg viewBox="0 0 16 16" width="14" height="14"><path d="M4 2.5v11l9-5.5z" fill="currentColor"/></svg>' : '<svg viewBox="0 0 16 16" width="14" height="14"><path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" fill="currentColor"/></svg>'}</span><span class="ffsig-pl"></span>`;
      btn.querySelector('.ffsig-pl').textContent = T(en);
    };
    label();
    stage.appendChild(btn);
    sc.add(() => {
      btn.remove();
      stage.classList.remove('ffsig-stack', 'is-paused');
      tiles.forEach(t => { ['--ffsig-x', '--ffsig-y', '--ffsig-r', '--ffsig-s', '--ffsig-z'].forEach(p => t.style.removeProperty(p)); t.removeAttribute('data-ffsig-front'); t.classList.remove('is-dropping'); });
    });
    sc.listen(btn, 'click', () => { user = !user; clock = 0; stage.classList.toggle('is-paused', user); label(); });
    sc.listen(document, 'ff:lang', label);
    // a focused tile comes to the front, so focus is never behind another card (DOM and Tab order never change)
    sc.listen(stage, 'focusin', e => {
      const t = e.target.closest && e.target.closest('a.h3-tile');
      if (!t || order[0] === t) return;
      t.classList.remove('is-dropping');
      order = [t].concat(order.filter(x => x !== t));
      place();
    });
    const paused = () => user || busy || !M().allowed() || stage.classList.contains('ffm-paused') || stage.matches(':hover') || stage.matches(':focus-within');
    sc.pauseOffscreen(stage);
    const STEP = 250, EVERY = 5000, DROP = 300;
    const tick = () => {
      if (!paused()) clock += STEP;
      if (clock >= EVERY) {
        clock = 0; busy = true;
        const front = order[0];
        front.classList.add('is-dropping');
        sc.timer(() => {
          front.classList.remove('is-dropping');
          if (order[0] === front) { order = order.slice(1).concat(front); place(); }
          sc.timer(() => { busy = false; }, 700);
        }, DROP);
      }
      sc.timer(tick, STEP);
    };
    sc.timer(tick, STEP);
  }

  const ROUTES = { 'for-families': bounce, friends: tilt, watch: spotlight, store: swap, 'kids-shop': swap, shop: swap };
  function setup(view, root, ok) {
    if (live) { live.abort(); live = null; }
    const fn = ROUTES[view];
    if (!fn || !root || !M() || !M().allowed(ok)) return;
    const sc = M().scope();
    live = sc;
    fn(root, sc);
  }

  window.FFhooks = window.FFhooks || [];
  window.FFhooks.push(setup);
  window.FFSignatures = Object.freeze({ setup, routes: Object.keys(ROUTES) });
})();
