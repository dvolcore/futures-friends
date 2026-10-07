/* Wave 10 SWEEP: the same liquid glass as the learning-loop widget (loop-widget.css .ffg-pane, itself the glass.css material) on the
   five flattest high-traffic card grids, with light interactivity only. Owner 2026-10-07: grids should be "glassed out" and "more
   interactive"; the brief: no content or layout-grid changes, nothing busy.
     #whole-child       ol.wc-steps        "One day. One connected system."   + pointing at a step lights the day up to it
     #for-centers       ul.wc-six          "What a licensed center gets"
     #for-families      .grid.g3 (paper)   the six family cards
     #teacher-standard  ul.ts-ask          "What you can ask to see"
     #pricing           ul.pz-nofees       "What you will never see on your bill"
   How: after each render, the matching grid gets the class w10g (CSS in w10-glass.css). Only colours, the backdrop, shadows and a
   `translate` on hover change, never a box size, so nothing shifts (CLS). The specular highlight follows a fine pointer (--gx/--gy,
   one rAF per frame); touch and keyboard get the same calm glass with no motion. Reduced motion / motion switch: no lift.
   Sends nothing, stores nothing. */
(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const GRIDS = [
    { route: 'whole-child', sel: 'ol.wc-steps', tile: '.wc-step', day: true },
    { route: 'for-centers', sel: 'ul.wc-six', tile: ':scope > li' },
    { route: 'for-families', sel: 'section.band-paper .grid.g3', tile: ':scope > .card' },
    { route: 'teacher-standard', sel: 'ul.ts-ask', tile: ':scope > li' },
    { route: 'pricing', sel: 'ul.pz-nofees', tile: ':scope > li' }
  ];
  const mm = q => (typeof matchMedia === 'function' && matchMedia(q).matches);
  const route = () => String(location.hash || '').replace(/^#/, '').split(/[/?]/)[0];

  function tag() {
    const r = route(), view = document.getElementById('view'); if (!view) return;
    for (const g of GRIDS) {
      if (g.route !== r) continue;
      const el = view.querySelector(g.sel); if (!el || el.classList.contains('w10g')) continue;
      el.classList.add('w10g', 'w10g-' + g.route);
      el.querySelectorAll(g.tile).forEach(t => t.classList.add('w10g-tile'));
      if (g.day) el.dataset.w10Day = '';
    }
  }
  const queue = () => tag();   // a MutationObserver callback runs before the next paint, so the glass is there on the first frame
  function start() {
    const view = document.getElementById('view'); if (!view) return;
    tag();
    if (typeof MutationObserver === 'function') new MutationObserver(queue).observe(view, { childList: true });
  }

  // the day line: pointing at (or focusing into) a step lights every step up to it
  function light(ol, upTo) { Array.from(ol.querySelectorAll('.w10g-tile')).forEach((t, i) => t.classList.toggle('w10-lit', upTo >= 0 && i <= upTo)); }
  function onOver(e) {
    const t = e.target.closest && e.target.closest('[data-w10-day] .w10g-tile'); if (!t) return;
    const ol = t.parentNode; light(ol, Array.prototype.indexOf.call(ol.children, t));
  }
  function onOut(e) {
    const ol = e.target.closest && e.target.closest('[data-w10-day]'); if (!ol) return;
    if (!e.relatedTarget || !ol.contains(e.relatedTarget)) light(ol, -1);
  }
  // the specular highlight follows a fine pointer
  let raf = 0, pending = null;
  function onMove(e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    const t = e.target.closest && e.target.closest('.w10g-tile'); if (!t) return;
    pending = [t, e.clientX, e.clientY];
    if (!raf) raf = requestAnimationFrame(() => {
      raf = 0; const [g, x, y] = pending, r = g.getBoundingClientRect(); if (!r.width) return;
      g.style.setProperty('--gx', ((x - r.left) / r.width * 100).toFixed(1) + '%'); g.style.setProperty('--gy', ((y - r.top) / r.height * 100).toFixed(1) + '%');
    });
  }
  function onLeave(e) { const t = e.target; if (t && t.classList && t.classList.contains('w10g-tile')) { t.style.removeProperty('--gx'); t.style.removeProperty('--gy'); } }

  document.addEventListener('pointerover', onOver);
  document.addEventListener('pointerout', onOut);
  document.addEventListener('focusin', onOver);
  document.addEventListener('focusout', onOut);
  if (mm('(hover: hover) and (pointer: fine)')) { document.addEventListener('pointermove', onMove, { passive: true }); document.addEventListener('pointerleave', onLeave, true); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

  window.FFGlassSweep = Object.freeze({ GRIDS, tag });
})();
