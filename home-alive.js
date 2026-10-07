/* Futures Friends: the Home sections come alive (wave 6, owner 2026-10-06: "It needs to feel way more interactive, exciting ...
   we have fun characters ... they have to know that we did more"). Markup comes from home-calm.js; this file only wires it, on the
   motion kit (ff-motion.js), one scope per Home render:
   - pick a friend (.hc-pickstage): a real tab list (one tab stop; arrows, Home, End; Enter/Space or click selects). The chosen
     friend hops forward with their pillars and one activity to try tonight. Works the same with motion off, just without the hop.
   - the felt path (.hc-trail): as the section scrolls past, a stitched path draws itself, the friends walk it above the six steps
     and each step lights as the leader reaches it; the steps are a real
     ordered list underneath; on phones the path is the steps' own rail, drawn in each step's colour as it is reached. Reduced
     motion: a still, fully drawn path, every step lit.
   - what we have built (.hc-prooflist): each number counts up once when the band comes into view, and the pillar words of its
     kinetic line fill in with scroll. Reduced motion: the numbers and the line, still.
   - section headings rise into place with a gold stitch under the key word (never hidden); the gold buttons are magnetic.
   The doors' hover (rise, friend pops up, stitched border draws in) is CSS (home-alive.css).
   Wave 8 (owner 2026-10-06, LIVING FRIENDS AND HIDDEN SURPRISES): the friend tabs are felt cards (their felt face tilts toward
   the pointer in home-day.js, behind the friend), and the friend on each card turns to wave when it is pointed at,
   focused or tapped (the swap stays with motion off; only the wiggle goes); the counts are stitched felt badges that sparkle
   when their count lands; each step of the day path pops as Booker reaches it. Sound requests are `ff:sfx` events (card-flip,
   wave, badge, sparkle, tap); sound.js decides whether to play them.
   Character art only moves, rotates or scales uniformly. Nothing is sent or stored. */
(function () {
  'use strict';
  let live = null;
  const M = () => window.FFMotion;
  const sfx = (name, el, gain) => { let x = 0; if (el && el.getBoundingClientRect) { const r = el.getBoundingClientRect(); x = ((r.left + r.width / 2) / (innerWidth || 1)) * 2 - 1; } try { document.dispatchEvent(new CustomEvent('ff:sfx', { detail: { name, x: Math.max(-1, Math.min(1, x)), gain } })); } catch (e) { /* fire and forget */ } };
  // the pose each friend turns to on their card (all already used elsewhere on Home, so usually cached)
  const WAVE = { booker: 'booker-waving', lumi: 'lumi-waving', zuri: 'zuri-pointing', bop: 'bop-waving' };

  function picker(root, sc, motion) {
    const stage = root.querySelector('[data-pick]');
    if (!stage || !window.FFHomeCalm) return;
    const tabs = Array.from(stage.querySelectorAll('[role=tab]'));
    const panel = stage.querySelector('[role=tabpanel]');
    const select = (i, focus) => {
      const t = tabs[i], k = t.dataset.k;
      if (focus) t.focus();
      if (panel.dataset.k === k) return;
      tabs.forEach((x, j) => { x.setAttribute('aria-selected', j === i ? 'true' : 'false'); x.tabIndex = j === i ? 0 : -1; });
      panel.setAttribute('aria-labelledby', t.id);
      panel.dataset.k = k;
      panel.innerHTML = window.FFHomeCalm.pickPanel(k);
      if (!motion) return;
      const art = panel.querySelector('.hc-pickcut'), copy = panel.querySelector('.hc-pickcopy');
      sc.anim(art, [{ transform: 'translateY(16%) scale(.9)', opacity: 0 }, { transform: 'translateY(-7%) scale(1.03)', opacity: 1, offset: .55 }, { transform: 'translateY(1%) scale(.99)', offset: .8 }, { transform: 'none', opacity: 1 }], { duration: 560, easing: 'cubic-bezier(.3,.7,.4,1)' });
      sc.anim(copy, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 320, delay: 90, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
      sc.anim(t.querySelector('img'), [{ transform: 'none' }, { transform: 'translateY(-14%) rotate(-6deg)', offset: .4 }, { transform: 'none' }], { duration: 420, easing: 'ease-in-out' });
    };
    tabs.forEach((t, i) => {
      sc.listen(t, 'click', () => { if (panel.dataset.k !== t.dataset.k) sfx('card-flip', t, 0.6); select(i, false); });
      sc.listen(t, 'keydown', e => {
        const to = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
        if (to === undefined) return;
        e.preventDefault();
        select((to + tabs.length) % tabs.length, true);
      });
    });
    cards(tabs, sc, motion);
  }

  // Living felt cards: the friend turns to wave (pointer, focus or tap). The wave pose sits exactly over the standing one (same
  // height, bottom-centre), so nothing shifts. The felt card face that tilts in 3D behind the friend is home-day.js (feltCards):
  // the character art itself is never tilted, only moved, rotated or scaled uniformly.
  function cards(tabs, sc, motion) {
    const P = window.FFPlush;
    tabs.forEach(t => {
      const k = t.dataset.k, base = t.querySelector('img');
      if (!base || !P || !WAVE[k]) return;
      let wave = null, lastSfx = 0;
      const turn = on => {
        if (on && !wave) {
          const h = base.offsetHeight || 72;
          const tmp = document.createElement('span'); tmp.innerHTML = P.img(WAVE[k], { cls: 'hc-picktabwave', alt: '', h });
          wave = tmp.firstElementChild; wave.setAttribute('aria-hidden', 'true');
          t.appendChild(wave);
        }
        if (wave) { const b = base.getBoundingClientRect(), r = t.getBoundingClientRect(); wave.style.left = (b.left - r.left + b.width / 2) + 'px'; wave.style.top = (b.top - r.top) + 'px'; wave.style.height = (base.offsetHeight || 72) + 'px'; }
        t.classList.toggle('is-waving', on);
        if (on && motion && wave) sc.anim(wave, [{ transform: 'translateX(-50%) rotate(0deg)' }, { transform: 'translateX(-50%) rotate(-7deg)', offset: .3 }, { transform: 'translateX(-50%) rotate(5deg)', offset: .6 }, { transform: 'translateX(-50%) rotate(0deg)' }], { duration: 620, easing: 'ease-in-out' });
        if (on && performance.now() - lastSfx > 1600) { lastSfx = performance.now(); sfx('wave', t, 0.4); }
      };
      sc.listen(t, 'pointerenter', () => turn(true));
      sc.listen(t, 'pointerleave', () => turn(false));
      sc.listen(t, 'focus', () => turn(true));
      sc.listen(t, 'blur', () => turn(false));
      sc.listen(t, 'touchstart', () => { turn(true); sc.timer(() => { if (document.activeElement !== t) turn(false); }, 1400); }, { passive: true });
      sc.add(() => { t.classList.remove('is-waving'); if (wave) wave.remove(); });
    });
  }

  function trail(root, sc, motion) {
    const el = root.querySelector('[data-trail]');
    if (!el) return;
    const steps = Array.from(el.querySelectorAll('.hc-steps > li'));
    const walkers = Array.from(el.querySelectorAll('.hc-walker'));
    const parade = el.querySelector('.hc-parade'), draw = el.querySelector('.hc-pathdraw');
    const H = window.FFHomeCalm, Y = H && H.pathY ? H.pathY : () => 34;
    if (!motion || !parade) { el.classList.add('hc-trail-still'); steps.forEach(s => s.classList.add('is-here')); sc.add(() => { el.classList.remove('hc-trail-still'); steps.forEach(s => s.classList.remove('is-here')); }); return; }
    el.classList.add('hc-trail-live');
    sc.add(() => { el.classList.remove('hc-trail-live'); steps.forEach(s => s.classList.remove('is-here')); walkers.forEach(w => w.style.removeProperty('transform')); if (draw) draw.style.removeProperty('stroke-dashoffset'); });
    let width = 0;
    const measure = () => { width = parade.getBoundingClientRect().width || 0; };
    measure();
    sc.listen(window, 'resize', measure);
    let last = -1;
    sc.progress(el, p => {
      // the walk happens while the section crosses the middle of the screen: 0.18 .. 0.72 of its pass
      const t = Math.max(0, Math.min(1, (p - 0.18) / 0.54));
      if (Math.abs(t - last) < 0.002) return;
      last = t;
      // the stitched path draws itself ahead of the leader (desktop and tablet)
      if (draw) draw.style.setProperty('stroke-dashoffset', String((100 - Math.min(100, t * 100 + 6)).toFixed(2)));
      const lag = 0.055, n = walkers.length - 1, ph = parade.offsetHeight || 64;
      walkers.forEach((w, i) => {
        // walking in formation along the curve: the leader (i = 0) in front, each friend a step behind
        const ti = lag * (n - i) + t * (1 - lag * n), x = ti * Math.max(0, width - (w.offsetWidth || 48));
        const fx = width ? (x + (w.offsetWidth || 48) / 2) / width : ti, y = (Y(fx) - 34) * ph / 60;
        const bob = Math.abs(Math.sin(t * Math.PI * 16 + i)) * -5;
        w.style.setProperty('transform', `translate3d(${x.toFixed(1)}px, ${(y + bob).toFixed(1)}px, 0) rotate(${(Math.sin(t * Math.PI * 16 + i) * 3).toFixed(1)}deg)`);
      });
      const reached = Math.floor(t * (steps.length - 1) + 0.25);
      steps.forEach((s, i) => {
        const now = t > 0 && i <= reached, was = s.classList.contains('is-here');
        s.classList.toggle('is-here', now);
        // wave 8: the step pops as Booker reaches it (going forward only)
        if (now && !was) { const n = s.querySelector('.hc-num'); if (n) sc.anim(n, [{ transform: 'scale(1)' }, { transform: 'scale(1.24)', offset: .35 }, { transform: 'scale(.95)', offset: .7 }, { transform: 'scale(1)' }], { duration: 440, easing: 'cubic-bezier(.3,.7,.4,1)' }); sfx('tap', s, 0.25); }
      });
    });
  }

  // Section headings rise into place (0.4em, from 60% to full opacity: text is never invisible) and a gold stitch draws under
  // the key word; only headings still below the fold wait for it.
  function stitches(root, sc, motion) {
    const hs = Array.from(root.querySelectorAll('h2[data-stitch]'));
    if (!motion) return;
    const below = hs.filter(h => h.getBoundingClientRect().top > innerHeight * 0.9);
    below.forEach(h => h.classList.add('hc-stitch-wait'));
    sc.add(() => hs.forEach(h => h.classList.remove('hc-stitch-wait', 'is-stitched')));
    sc.enter(below, h => {
      h.classList.add('is-stitched');
      sc.anim(h, [{ transform: 'translateY(.4em)', opacity: .6 }, { transform: 'none', opacity: 1 }], { duration: 560, easing: 'cubic-bezier(.16,1,.3,1)' });
    }, { threshold: 0.6 });
  }

  // The kinetic line in "What we have built": the pillar words fill from 35% to full in their friend's colour as the band scrolls in.
  function kinetic(root, sc, motion) {
    const el = root.querySelector('[data-kinetic]');
    if (!el || !motion) return;
    const ws = Array.from(el.querySelectorAll('[data-k]'));
    el.classList.add('is-kinetic');
    sc.add(() => { el.classList.remove('is-kinetic'); ws.forEach(w => w.style.removeProperty('opacity')); });
    sc.progress(el, p => {
      const t = Math.max(0, Math.min(1, (p - 0.15) / 0.4));
      ws.forEach((w, i) => { const f = Math.max(0, Math.min(1, t * ws.length - i)); w.style.setProperty('opacity', (0.35 + 0.65 * f).toFixed(3)); });
    });
  }

  // Magnetic, squishy primary buttons (desktop fine pointer): only the label drifts (up to 6 px) toward the pointer; the button
  // and its hit area never move. A press gives a small squish (CSS).
  function magnets(root, sc, motion) {
    if (!motion || !M().fine()) return;
    const btns = Array.from(root.querySelectorAll('.mh-hero .px-primary, .hc-btn-gold'));
    btns.forEach(b => {
      let lab = b.querySelector(':scope > .ffm-label');
      if (!lab) { lab = b.ownerDocument.createElement('span'); lab.className = 'ffm-label'; while (b.firstChild) lab.appendChild(b.firstChild); b.appendChild(lab); }
      let id = 0, dx = 0, dy = 0;
      const put = () => { id = 0; lab.style.setProperty('transform', `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`); };
      sc.listen(b, 'pointermove', e => { if (e.pointerType !== 'mouse') return; const r = b.getBoundingClientRect(); dx = Math.max(-6, Math.min(6, (e.clientX - r.left - r.width / 2) / r.width * 12)); dy = Math.max(-4, Math.min(4, (e.clientY - r.top - r.height / 2) / r.height * 8)); if (!id) id = requestAnimationFrame(put); });
      sc.listen(b, 'pointerleave', () => { dx = 0; dy = 0; if (!id) id = requestAnimationFrame(put); });
      sc.add(() => { if (id) cancelAnimationFrame(id); lab.style.removeProperty('transform'); });
    });
  }

  function proof(root, sc, motion) {
    const list = root.querySelector('[data-proof]');
    if (!list || !motion) return;
    const nums = Array.from(list.querySelectorAll('[data-count]'));
    // Below the fold now: start them at 0 so the count-up is what the visitor sees arrive (screen readers always get the number).
    if (list.getBoundingClientRect().top > innerHeight) { nums.forEach(n => { n.textContent = '0'; }); sc.add(() => nums.forEach(n => { n.textContent = n.dataset.count; })); }
    // each tile counts when it arrives (on phones the tiles stack, so they arrive one by one)
    sc.enter(Array.from(list.querySelectorAll('.hc-prooftile')), t => {
      const n = t.querySelector('[data-count]');
      if (!n) return;
      M().count(n, +n.dataset.count, 1100, sc);
      sfx('badge', t, 0.35);
      // wave 8: when the count lands, the felt badge sparkles (a felt sparkle burst over the number, the number pops)
      sc.timer(() => {
        sc.anim(n, [{ transform: 'scale(1)' }, { transform: 'scale(1.14)', offset: .4 }, { transform: 'scale(1)' }], { duration: 420, easing: 'cubic-bezier(.3,.7,.4,1)' });
        const a = t.querySelector('a'), b = document.createElement('img');
        b.src = 'img/plush/world8/sparkle-burst-160.webp'; b.alt = ''; b.className = 'hc-proofspark'; b.setAttribute('aria-hidden', 'true'); b.decoding = 'async';
        b.style.left = (n.offsetLeft + n.offsetWidth / 2) + 'px'; b.style.top = (n.offsetTop + n.offsetHeight / 2) + 'px';
        a.appendChild(b);
        const an = sc.anim(b, [{ opacity: 0, transform: 'translate(-50%,-50%) scale(.5) rotate(-25deg)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1) rotate(0deg)', offset: .35 }, { opacity: 0, transform: 'translate(-50%,-50%) scale(1.2) rotate(10deg)' }], { duration: 820, easing: 'cubic-bezier(.16,1,.3,1)' });
        if (an) an.onfinish = () => b.remove(); else b.remove();
        sc.add(() => b.remove());
        sfx('sparkle', t, 0.4);
      }, 1120);
    }, { threshold: 0.6 });
  }

  function setup(view, root, ok) {
    if (live) { live.abort(); live = null; }
    if (view !== 'home' || !root || !M()) return;
    const sc = M().scope();
    live = sc;
    const motion = M().allowed(ok);
    picker(root, sc, motion);
    trail(root, sc, motion);
    proof(root, sc, motion);
    stitches(root, sc, motion);
    kinetic(root, sc, motion);
    magnets(root, sc, motion);
  }

  window.FFhooks = window.FFhooks || [];
  window.FFhooks.push(setup);
  window.FFHomeAlive = { setup };
})();
