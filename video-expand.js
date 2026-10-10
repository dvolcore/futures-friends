/* Futures Friends: an Expand button on every video (owner 2026-10-10: "none of the expand buttons work on the video").
   Some videos have no native controls (the Home hello, the Kids' Shop film) and phones hide the native full-screen button, so every
   visible video gets one clear button. It asks for real full screen on the video (requestFullscreen, webkitRequestFullscreen, or
   iOS Safari's webkitEnterFullscreen); where none of those exists it opens the same video large in an in-page viewer instead.
   Videos without native controls also expand when tapped (a video that has controls keeps the browser's own tap behaviour).
   Skips tiny or hidden videos and videos marked data-no-expand. Added after each route renders (MutationObserver), idempotent. */
(function () {
  'use strict';
  if (typeof window === 'undefined' || !window.document) return;
  const W = window, D = W.document;
  const ICON = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
  const label = () => ((W.FFi18n && W.FFi18n.lang) === 'es' ? 'Pantalla completa' : 'Full screen');

  function viewer(v) {   // fallback: a large in-page viewer that plays the same source from the same moment
    const dlg = D.createElement('dialog');
    dlg.className = 'fx-dialog';
    const big = v.cloneNode(true);
    big.removeAttribute('data-fx'); big.removeAttribute('width'); big.removeAttribute('height');
    big.setAttribute('controls', ''); big.setAttribute('playsinline', ''); big.className = 'fx-big';
    big.muted = v.muted;
    const close = D.createElement('button');
    close.type = 'button'; close.className = 'fx-close'; close.textContent = (W.FFi18n && W.FFi18n.lang) === 'es' ? 'Cerrar' : 'Close';
    dlg.append(big, close);
    D.body.appendChild(dlg);
    const t = v.currentTime || 0;
    try { v.pause(); } catch (_) { /* fine */ }
    const done = () => { try { v.currentTime = big.currentTime || t; } catch (_) { /* fine */ } dlg.remove(); };
    close.addEventListener('click', () => dlg.close());
    dlg.addEventListener('close', done);
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
    try { dlg.showModal(); } catch (_) { dlg.setAttribute('open', ''); }
    big.addEventListener('loadedmetadata', () => { try { big.currentTime = t; } catch (_) { /* fine */ } }, { once: true });
    const p = big.play(); if (p && p.catch) p.catch(() => { /* the visitor presses play */ });
  }

  function expand(v) {
    if (v.preload === 'none' && v.readyState === 0) { try { v.load(); } catch (_) { /* fine */ } }
    const req = v.requestFullscreen || v.webkitRequestFullscreen;
    if (req && (D.fullscreenEnabled || D.webkitFullscreenEnabled)) {
      try {
        const r = req.call(v);
        const p = v.play(); if (p && p.catch) p.catch(() => {});
        if (r && r.catch) r.catch(() => viewer(v));
        return;
      } catch (_) { /* fall through */ }
    }
    if (typeof v.webkitEnterFullscreen === 'function') {   // iPhone Safari: only the video element can go full screen
      try { const p = v.play(); if (p && p.catch) p.catch(() => {}); v.webkitEnterFullscreen(); return; } catch (_) { /* fall through */ }
    }
    viewer(v);
  }

  // A frame may already have its own control in that corner (the Home intro's Pause button): try the other corners, never cover it.
  const CORNERS = [['10px', '10px', '', ''], ['10px', '', '', '10px'], ['', '', '10px', '10px'], ['', '10px', '10px', '']];   // top right, top left, bottom left, bottom right
  function place(b, host) {
    const others = [...host.querySelectorAll('button, a, [role="button"]')].filter(o => o !== b && !b.contains(o) && o.offsetParent);
    const hits = r => others.some(o => { const q = o.getBoundingClientRect(); return q.width && r.left < q.right + 4 && r.right > q.left - 4 && r.top < q.bottom + 4 && r.bottom > q.top - 4; });
    // a frame with its own control (which may move, e.g. a big centre Play that shrinks to a corner) starts at top left, where none of them go
    const order = others.length ? [CORNERS[1], CORNERS[0], CORNERS[2], CORNERS[3]] : CORNERS;
    for (const [top, right, bottom, left] of order) {
      Object.assign(b.style, { top: top || 'auto', right: right || 'auto', bottom: bottom || 'auto', left: left || 'auto' });
      if (!hits(b.getBoundingClientRect())) return;
    }
    Object.assign(b.style, { top: '10px', right: 'auto', bottom: 'auto', left: '50%', transform: 'translateX(-50%)' });   // every corner taken: top centre
  }

  function fit(v) {
    if (v.dataset.fx || v.hasAttribute('data-no-expand') || v.closest('.fx-dialog, dialog')) return;
    const r = v.getBoundingClientRect();
    if (r.width < 160 || r.height < 90) return;   // tiny or hidden for now: a later pass picks it up
    const host = v.parentElement; if (!host) return;
    v.dataset.fx = '1';
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    const b = D.createElement('button');
    b.type = 'button'; b.className = 'fx-btn'; b.innerHTML = ICON; b.setAttribute('aria-label', label()); b.title = label();
    b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); expand(v); });
    host.appendChild(b);
    place(b, host);
    if (!v.controls) {
      v.style.cursor = 'zoom-in';
      v.addEventListener('click', () => expand(v));
    }
  }

  let queued = false;
  const scan = () => { queued = false; D.querySelectorAll('video:not([data-fx])').forEach(fit); };
  const later = () => { if (!queued) { queued = true; W.requestAnimationFrame ? W.requestAnimationFrame(() => setTimeout(scan, 60)) : setTimeout(scan, 60); } };

  const css = '.fx-btn{position:absolute;top:10px;right:10px;z-index:5;width:44px;height:44px;border-radius:50%;border:0;display:grid;place-items:center;'
    + 'background:rgba(10,43,56,.72);color:#fff;cursor:pointer;box-shadow:0 6px 16px rgba(10,43,56,.35);transition:transform .15s,background .15s}'
    + '.fx-btn:hover{background:rgba(10,43,56,.92);transform:scale(1.06)}.fx-btn:focus-visible{outline:3px solid #E7A928;outline-offset:2px}'
    + '.fx-dialog{width:min(96vw,1400px);max-height:94vh;padding:0;border:0;border-radius:16px;background:#000;overflow:hidden}'
    + '.fx-dialog::backdrop{background:rgba(5,15,20,.86)}.fx-big{display:block;width:100%;max-height:calc(94vh - 56px);background:#000;object-fit:contain}'
    + '.fx-close{display:block;margin:0 auto;min-height:44px;padding:0 22px;border:0;background:#E7A928;color:#0A2B38;font:700 16px/1 inherit;border-radius:0 0 12px 12px;cursor:pointer}'
    + '@media print{.fx-btn{display:none}}';
  const s = D.createElement('style'); s.setAttribute('data-video-expand', ''); s.textContent = css;
  (D.head || D.documentElement).appendChild(s);

  const start = () => {
    scan();
    new MutationObserver(later).observe(D.body, { childList: true, subtree: true });
    W.addEventListener('resize', later, { passive: true });
    W.addEventListener('hashchange', () => setTimeout(scan, 400));
    D.addEventListener('scroll', later, { passive: true, capture: true });
    D.addEventListener('play', later, true);   // a clip that was hidden until Play (the habit cards) gets its button once it shows
  };
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start); else start();
  W.FFVideoExpand = { expand, scan };
})();
