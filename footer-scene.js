/* Futures Friends: the four friends wave goodbye from a felt meadow strip right above the footer, on every page (wave 6, research
   item 15; the footer itself and its site map belong to the navigation lane, so this is its own element, inserted once before
   <footer>). Each friend is a named link to their pillar. When the strip comes into view on a page, the friends pop up and wave once
   (FFMotion; with motion off they simply stand there). Pointing at a friend makes them hop (CSS). Sends nothing, stores nothing.
   Wave 8 (Home only, where the page ends at night; home-day.js draws the night sky): after the wave they say goodnight: Booker
   gives a big sleepy stretch and a few stitched z's drift up from him. Sound requests: `ff:sfx` wave, night-chime. */
(function () {
  'use strict';
  // left to right as on the Home stage: Bop, Lumi, BOOKER (center), Zuri
  const FRIENDS = [
    ['bop', 'bop-waving', 'Move with Bop', 'bop-at-home'],
    ['lumi', 'lumi-waving', 'Belong with Lumi', 'whole-child'],
    ['booker', 'booker-waving', 'Learn with Booker', 'curriculum'],
    ['zuri', 'zuri-pointing', 'Explore with Zuri', 'activities']
  ];
  let el = null, live = null;
  function markup() {
    const P = window.FFPlush;
    return `<div class="wrap ff-footscene-row">${FRIENDS.map(([k, pose, label, go]) => `<a class="ff-footfriend" href="#${go}" style="--c:var(--${k})" data-k="${k}"><span class="ff-footart">${P ? P.img(pose, { cls: 'ff-footcut', alt: '', h: 120 }) : ''}</span><span class="ff-footlabel">${label}</span></a>`).join('')}</div><span class="tx-ground ff-footground" aria-hidden="true"></span>`;
  }
  function mount() {
    if (el || typeof document === 'undefined') return el;
    const foot = document.querySelector('body > footer');
    if (!foot || !window.FFPlush) return null;
    el = document.createElement('section');
    el.className = 'ff-footscene';
    el.setAttribute('aria-label', 'The four friends');
    el.innerHTML = markup();
    foot.parentNode.insertBefore(el, foot);
    return el;
  }
  function setup(view, root, ok) {
    if (live) { live.abort(); live = null; }
    if (!mount() || !window.FFMotion) return;
    const M = window.FFMotion;
    if (!M.allowed(ok)) return;
    const sc = M.scope();
    live = sc;
    const figs = Array.from(el.querySelectorAll('.ff-footart'));
    // only wait for the wave if the strip is below the fold now (no flash for a short page)
    if (el.getBoundingClientRect().top < innerHeight) return;
    figs.forEach(f => f.classList.add('is-waiting'));
    sc.add(() => figs.forEach(f => f.classList.remove('is-waiting')));
    const home = !!(root && root.querySelector && root.querySelector('.hc-close'));
    const say = (name, gain) => { try { document.dispatchEvent(new CustomEvent('ff:sfx', { detail: { name, x: 0, gain } })); } catch (e) { /* fire and forget */ } };
    sc.enter([el], () => { if (home) { say('night-chime', 0.45); sc.timer(() => say('wave', 0.35), 500); sc.timer(() => yawn(sc), 1500); } }, { threshold: 0.5 });
    sc.enter([el], () => figs.forEach((f, i) => {
      f.classList.remove('is-waiting');
      sc.anim(f, [{ transform: 'translateY(60%)', opacity: 0 }, { transform: 'translateY(-8%)', opacity: 1, offset: .6 }, { transform: 'none', opacity: 1 }], { duration: 520, delay: i * 120, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'backwards' });
      sc.anim(f.querySelector('img'), [{ transform: 'none' }, { transform: 'rotate(-6deg)', offset: .25 }, { transform: 'rotate(5deg)', offset: .5 }, { transform: 'rotate(-3deg)', offset: .75 }, { transform: 'none' }], { duration: 700, delay: 520 + i * 120, easing: 'ease-in-out' });
    }), { threshold: 0.5 });
  }
  // Booker yawns: a slow lean back and up (rotate and move only, his proportions never change), three stitched z's float away.
  const Z = '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M4 5h11L5 15h11" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="3.2 2.4"/></svg>';
  function yawn(sc) {
    const b = el && el.querySelector('.ff-footfriend[data-k=booker]');
    if (!b) return;
    const img = b.querySelector('.ff-footcut'), art = b.querySelector('.ff-footart');
    sc.anim(img, [{ transform: 'none' }, { transform: 'translateY(-5%) rotate(-5deg)', offset: .35 }, { transform: 'translateY(-5%) rotate(-5deg)', offset: .6 }, { transform: 'none' }], { duration: 1500, easing: 'cubic-bezier(.45,0,.3,1)' });
    const host = el, hr = host.getBoundingClientRect(), ar = art.getBoundingClientRect();
    [0, 1, 2].forEach(i => {
      const z = document.createElement('span'); z.className = 'hd-zz'; z.setAttribute('aria-hidden', 'true'); z.innerHTML = Z;
      z.style.left = (ar.right - hr.left - 18 + i * 8) + 'px'; z.style.top = (ar.top - hr.top + 4) + 'px'; z.style.width = (14 + i * 4) + 'px';
      host.appendChild(z);
      const a = sc.anim(z, [{ opacity: 0, transform: 'translate(0,0) rotate(-8deg)' }, { opacity: 1, offset: .25 }, { opacity: 0, transform: `translate(${16 + i * 10}px,-${34 + i * 12}px) rotate(10deg)` }], { duration: 1800, delay: 500 + i * 380, easing: 'ease-out', fill: 'backwards' });
      if (a) a.onfinish = () => z.remove(); else z.remove();
      sc.add(() => z.remove());
    });
  }

  window.FFhooks = window.FFhooks || [];
  window.FFhooks.push(setup);
  window.FFFooterScene = { FRIENDS, markup, mount, setup, yawn };
})();
