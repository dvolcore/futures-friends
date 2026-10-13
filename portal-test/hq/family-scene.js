// The felt sky the family pages stand in (the sign-in page and the parent dashboard's hero). Official art only, copied from the public
// website (img/scene: the friends' cut-outs, felt clouds, the felt sun, grass and hills; img/brand: the plush wordmark and mark). No
// character art is ever drawn, traced or generated here: the friends only move, rotate or scale uniformly (the website's DESIGN.md).
//
//   dayPart(date, tz)         'morning' | 'afternoon' | 'evening' | 'night' in the center's time zone: the light of the sky and the
//                             greeting ("Good afternoon") follow it, like the website's day theme
//   motionOn()                the device setting (prefers-reduced-motion) AND the family's own "Still scene" switch (localStorage)
//   setMotion(on)             remembers the switch and sets <html data-motion="off"> (CSS stops every loop on it)
//   sceneHtml(o)              the sky, sun, clouds, hills and grass (+ the four friends when o.friends), aria-hidden decoration
//   installScene(root)        gentle pointer depth on desktop (fine pointer only), the clouds pause off screen; returns an undo
// Pure strings + a few listeners; no network, nothing stored except the motion switch.

const MOTION_KEY = 'ff-hub-motion';
const FRIENDS = ['booker', 'lumi', 'zuri', 'bop'];

export function dayPart(date = new Date(), tz = undefined) {
  let h;
  try { h = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', ...(tz ? { timeZone: tz } : {}) }).format(date)); }
  catch (_) { h = date.getHours(); }
  return h >= 5 && h < 12 ? 'morning' : h >= 12 && h < 17 ? 'afternoon' : h >= 17 && h < 21 ? 'evening' : 'night';
}

const mm = (q) => (typeof matchMedia === 'function' ? matchMedia(q).matches : false);
export function storedMotion() { try { return localStorage.getItem(MOTION_KEY) !== 'off'; } catch (_) { return true; } }
export function motionOn() { return storedMotion() && !mm('(prefers-reduced-motion: reduce)'); }
export function applyMotion() { document.documentElement.dataset.motion = storedMotion() ? 'on' : 'off'; }
export function setMotion(on) {
  try { localStorage.setItem(MOTION_KEY, on ? 'on' : 'off'); } catch (_) { /* private mode: this page only */ }
  document.documentElement.dataset.motion = on ? 'on' : 'off';
}

export function sceneHtml({ friends = false, part = 'afternoon', lead = 'booker' } = {}) {
  const order = [...FRIENDS].sort((a, b) => (a === lead ? -1 : b === lead ? 1 : 0));
  return `<div class="fs-scene fs-${part}" aria-hidden="true">
    <div class="fs-sky"></div>
    <img class="fs-sun" src="img/scene/felt-sun-320.webp" alt="" width="320" height="305" decoding="async">
    <div class="fs-cloudlayer fs-depth" data-depth="10">
      <img class="fs-cloud fs-c1" src="img/scene/felt-cloud-1-480.webp" alt="" width="480" height="333" decoding="async">
      <img class="fs-cloud fs-c2" src="img/scene/felt-cloud-3-480.webp" alt="" width="480" height="333" decoding="async">
      <img class="fs-cloud fs-c3" src="img/scene/felt-cloud-2-480.webp" alt="" width="480" height="333" decoding="async">
    </div>
    <img class="fs-hills fs-depth" data-depth="6" src="img/scene/div-hills-1305.webp" srcset="img/scene/div-hills-652.webp 652w, img/scene/div-hills-1305.webp 1305w" sizes="100vw" alt="" decoding="async">
    ${friends ? `<div class="fs-cast">${order.map((f, i) => `<img class="fs-friend fs-f-${f}" src="img/scene/cut-${f}-440.webp" alt="" decoding="async" data-i="${i}">`).join('')}</div>` : ''}
    <img class="fs-grass" src="img/scene/div-grass-1400.webp" srcset="img/scene/div-grass-700.webp 700w, img/scene/div-grass-1400.webp 1400w" sizes="100vw" alt="" decoding="async">
  </div>`;
}

// Desktop only (a fine pointer): the clouds and hills lean a few pixels away from the pointer; touch devices keep the slow CSS drift.
export function installScene(root) {
  const scene = root?.querySelector('.fs-scene');
  if (!scene) return () => {};
  const ctl = new AbortController();
  const io = typeof IntersectionObserver === 'function' ? new IntersectionObserver((es) => es.forEach((e) => scene.classList.toggle('fs-paused', !e.isIntersecting))) : null;
  io?.observe(scene);
  const vis = () => scene.classList.toggle('fs-paused', document.visibilityState === 'hidden');
  document.addEventListener('visibilitychange', vis, { signal: ctl.signal });
  if (mm('(hover: hover) and (pointer: fine)')) {
    let raf = 0, px = 0, py = 0;
    const layers = [...scene.querySelectorAll('.fs-depth')];
    const paint = () => { raf = 0; if (!motionOn()) { layers.forEach((l) => l.style.removeProperty('transform')); return; }
      layers.forEach((l) => { const d = Number(l.dataset.depth) || 0; l.style.transform = `translate3d(${(-px * d).toFixed(1)}px, ${(-py * d * 0.5).toFixed(1)}px, 0)`; }); };
    window.addEventListener('pointermove', (e) => { px = e.clientX / innerWidth - 0.5; py = e.clientY / innerHeight - 0.5; if (!raf) raf = requestAnimationFrame(paint); }, { signal: ctl.signal, passive: true });
  }
  return () => { ctl.abort(); io?.disconnect(); };
}
