/* Futures Friends wave 8: the sticky header turns to frosted glass once the page scrolls (owner 2026-10-06: "if it turns into glass
   whenever you scroll, that might be a good effect"). Adds/removes .is-glass on header.bar; glass.css does the look and keeps the
   solid white header where backdrop-filter is missing or the visitor asks for reduced transparency. Passive, one rAF per scroll burst. */
(function () {
  'use strict';
  if (typeof document === 'undefined') return;
  const bar = document.querySelector('header.bar');
  if (!bar) return;
  let queued = false;
  const paint = () => { queued = false; bar.classList.toggle('is-glass', (window.scrollY || 0) > 24); };
  window.addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(paint); } }, { passive: true });
  window.addEventListener('hashchange', () => requestAnimationFrame(paint));
  paint();
})();
