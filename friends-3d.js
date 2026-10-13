/* Meet the friends in 3D (owner 2026-10-12): the finished 3D friends of the 2026-10-12 batch on #friends (Friends & Books), right under
   the four friend cards. One stage, a friend picker (Booker, Lumi, Zuri, Bop), drag to spin, tap the friend for a motion, real buttons
   for Wave / Hop / Jump / Dance and Turn left / right, a "Fur" switch, and "See it in your room" (AR) on phones and tablets.
   - Lazy: nothing 3D is fetched until the stage comes within a screen of the viewport (on data saver: until the visitor taps "Show in
     3D"). Then ff-3d.js (the engine) and three.js r170 from vendor/three-0.170.0/ (vendored, exact version, no CDN) and ONE friend's
     model (~1 MB). Other friends load only when picked. Never on Home: Home keeps its 2D cut-outs (TECH_NOTES.md, 3D friends).
   - The engine pauses off screen and on a hidden tab, caps the pixel ratio and picks fur by GPU tier and frame-time sampling.
   - Reduced motion or the Decorative motion switch off: a still friend, nothing moves by itself; the buttons show the motion's key
     pose as a still (no movement); spinning by drag or the Turn buttons still works (the visitor's own action).
   - No WebGL (or the model fails to load): the friend's official cut-out stays, with a line saying 3D is not available here; the
     AR button still works where AR exists (it does not need WebGL).
   - Accessibility: the canvas is aria-hidden; the friend is described in words (the visible caption); every action is a real button
     in reading order; a polite live region says what happened. Bilingual through FFi18n (Spanish in i18n-es-10.js, draft).
   - AR: iPhone / iPad: AR Quick Look with the friend's USDZ (gentle wave; an <a rel="ar"> whose only child is an image, as Apple
     requires, clicked by the button); Android: Scene Viewer with the GLB (intent URL, falls back to this page). Elsewhere a note.
   Official art only (the shipped cut-outs and the batch's models); nothing cropped (object-fit: contain; the 3D frame holds every
   motion's reach). Sends nothing, stores nothing. */
(function () {
  'use strict';
  const T = s => (window.FFi18n && typeof window.FFi18n.t === 'function' ? window.FFi18n.t(s) : s);
  const KEYS = ['booker', 'lumi', 'zuri', 'bop'];
  const BASE = 'models/friends/';
  const ENGINE = './ff-3d.js?v=1';
  const F = {
    booker: { n: 'Booker', a: 'Booker the bear', d: 'Booker the bear in 3D: curly brown fur, a hoodie with a book on it, and a backpack.' },
    lumi: { n: 'Lumi', a: 'Lumi the bunny', d: 'Lumi the bunny in 3D: one floppy ear, a bow, a heart patch and a scalloped shirt.' },
    zuri: { n: 'Zuri', a: 'Zuri the turtle', d: 'Zuri the turtle in 3D: glasses, a felt hat, a compass patch and a shell.' },
    bop: { n: 'Bop', a: 'Bop the elephant', d: 'Bop the elephant in 3D: big ears, a trunk, green overalls with a yellow star, and a backpack.' }
  };
  const MOVES = [['wave', 'Wave', 'Waving.'], ['hop', 'Hop', 'Hopping.'], ['jump', 'Jump', 'Jumping for joy.'], ['dance', 'Dance', 'Dancing.']];
  const STILL_SAY = { wave: 'A wave, as a still picture.', hop: 'A hop, as a still picture.', jump: 'A happy jump, as a still picture.', dance: 'A dance, as a still picture.' };
  const E = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const cut = k => `img/cut_${k}-440.webp`;

  const nav = typeof navigator !== 'undefined' ? navigator : {};
  const UA = nav.userAgent || '';
  const IOS = () => /iPhone|iPad|iPod/.test(UA) || (/Macintosh/.test(UA) && (nav.maxTouchPoints || 0) > 1);
  const ANDROID = () => /Android/.test(UA);
  const abs = u => new URL(u, location.href).href;
  // Scene Viewer (ARCore) intent; S.browser_fallback_url brings the visitor back here when Scene Viewer is not installed
  const intent = k => `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(abs(BASE + k + '.glb'))}&mode=ar_preferred&title=${encodeURIComponent(F[k].n)}#Intent;scheme=https;package=com.google.ar.core;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(location.href.split('#')[0] + '#friends')};end;`;

  function arHtml(k) {
    if (IOS()) return `<a class="f3d-arlink" rel="ar" href="${BASE}${k}.usdz" data-f3d-ar="ios" tabindex="-1" aria-hidden="true"><img src="${cut(k)}" alt="" width="1" height="1"></a>
      <button type="button" class="btn f3d-arbtn" data-f3d="ar" aria-label="${E(T('See ' + F[k].n + ' in your room (augmented reality)'))}">${E(T('See it in your room'))}</button>`;
    if (ANDROID()) return `<a class="btn f3d-arbtn" data-f3d-ar="android" href="${E(intent(k))}" aria-label="${E(T('See ' + F[k].n + ' in your room (augmented reality)'))}">${E(T('See it in your room'))}</a>`;
    return `<p class="f3d-arnote">${E(T('On an iPhone, iPad or Android phone, "See it in your room" puts the friend on your table.'))}</p>`;
  }

  function band() {
    const k = 'booker';
    return `<section class="band-paper f3d" id="friends-3d" aria-labelledby="f3d-h" data-f3d-root data-friend="${k}">
<div class="wrap">
 <div class="head"><div class="eyebrow">${E(T('New: 3D friends'))}</div><h2 id="f3d-h">${E(T('Meet the friends in 3D'))}</h2><p class="lede">${E(T('Spin a friend around, ask for a wave, a hop or a dance, and on a phone or tablet put one on your table.'))}</p></div>
 <div class="seg f3d-pick" role="group" aria-label="${E(T('Choose a friend'))}">${KEYS.map(f => `<button type="button" data-f3d-friend="${f}" aria-pressed="${f === k}">${F[f].n}</button>`).join('')}</div>
 <div class="f3d-grid">
  <figure class="f3d-stage" data-state="poster">
   <img class="f3d-poster" src="${cut(k)}" alt="" width="272" height="440" loading="lazy" decoding="async">
   <div class="f3d-gl" data-f3d-gl></div>
   <button type="button" class="btn soft f3d-load" data-f3d="load" hidden>${E(T('Show ' + F[k].n + ' in 3D'))}</button>
   <span class="f3d-busy" aria-hidden="true"></span>
  </figure>
  <div class="f3d-panel">
   <h3 class="f3d-name">${E(F[k].n)}</h3>
   <p class="f3d-cap" id="f3d-cap">${E(T(F[k].d))}</p>
   <p class="f3d-how small">${E(T('Drag to spin. Tap the friend for a surprise, or pick a motion.'))}</p>
   <div class="f3d-moves" role="group" aria-label="${E(T('Motions'))}">${MOVES.map(([id, l]) => `<button type="button" class="f3d-move" data-f3d-move="${id}" disabled>${E(T(l))}</button>`).join('')}</div>
   <div class="f3d-tools" role="group" aria-label="${E(T('View'))}">
    <button type="button" class="f3d-tool" data-f3d="left" disabled>${E(T('Turn left'))}</button>
    <button type="button" class="f3d-tool" data-f3d="right" disabled>${E(T('Turn right'))}</button>
    <button type="button" class="f3d-tool f3d-fur" data-f3d="fur" aria-pressed="false" disabled>${E(T('Soft fur'))}</button>
   </div>
   <div class="f3d-ar" data-f3d-arbox>${arHtml(k)}</div>
   <p class="f3d-flat small" hidden>${E(T('3D is not available in this browser, so here is the official picture.'))}</p>
   <p class="sr-only" role="status" aria-live="polite" data-f3d-live></p>
  </div>
 </div>
</div></section>`;
  }

  // ---- the band goes right under the four friend cards (before "Every friend has videos to watch together") ----------------------
  const VV = typeof V !== 'undefined' ? V : null;   // views.js: a top-level const, shared by name like family-library.js uses it
  if (VV && VV.friends) {
    const w = VV.friends;
    VV.friends = (...a) => {
      const h = w(...a), at = h.indexOf('<div class="grid g4">'), end = at > -1 ? h.indexOf('</section>', at) : -1;
      return end > -1 ? h.slice(0, end + 10) + band() + h.slice(end + 10) : h + band();
    };
  }

  // ---- live part ------------------------------------------------------------------------------------------------------------------
  const state = { mode: 'none', loaded: false, requested: false, friend: 'booker', error: '', viewer: null };
  let live = null;

  function setup(view, root, ok) {
    if (live) { live.abort(); live = null; }
    Object.assign(state, { mode: 'none', loaded: false, requested: false, error: '', viewer: null });
    if (view !== 'friends' || !root || !window.FFMotion) return;
    const sec = root.querySelector('[data-f3d-root]');
    if (!sec) return;
    const sc = window.FFMotion.scope();
    live = sc;
    const motion = window.FFMotion.allowed(ok);
    state.mode = motion ? 'live' : 'still';
    sec.dataset.f3d = state.mode;
    const stage = sec.querySelector('.f3d-stage'), gl = sec.querySelector('[data-f3d-gl]'), liveEl = sec.querySelector('[data-f3d-live]');
    const loadBtn = sec.querySelector('[data-f3d="load"]'), furBtn = sec.querySelector('[data-f3d="fur"]');
    const say = s => { if (liveEl) { liveEl.textContent = ''; setTimeout(() => { if (!sc.aborted) liveEl.textContent = T(s); }, 30); } };
    let viewer = null, k = 'booker', cycle = 0, busy = false;

    const enable = on => sec.querySelectorAll('.f3d-move, .f3d-tool').forEach(b => { b.disabled = !on; });
    const furUi = () => { if (!viewer) return; const s = viewer.state(); furBtn.setAttribute('aria-pressed', String(!!s.fur)); stage.dataset.fur = s.fur ? 'on' : 'off'; };
    const flat = why => {
      state.error = String(why || 'unavailable');
      stage.dataset.state = 'flat'; sec.querySelector('.f3d-flat').hidden = false;
      sec.querySelectorAll('.f3d-moves, .f3d-tools, .f3d-how').forEach(x => { x.hidden = true; });
      loadBtn.hidden = true;
    };
    const show = f => {   // texts, poster and AR for friend f (the model follows)
      k = f; state.friend = f; sec.dataset.friend = f;
      sec.querySelectorAll('[data-f3d-friend]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.f3dFriend === f)));
      const p = sec.querySelector('.f3d-poster'); p.src = cut(f);
      sec.querySelector('.f3d-name').textContent = F[f].n;
      sec.querySelector('.f3d-cap').textContent = T(F[f].d);
      loadBtn.textContent = T('Show ' + F[f].n + ' in 3D');
      sec.querySelector('[data-f3d-arbox]').innerHTML = arHtml(f);
    };

    const start = () => {
      if (state.requested || sc.aborted) return;
      state.requested = true; loadBtn.hidden = true; stage.dataset.state = 'loading';
      import(ENGINE).then(m => {
        if (sc.aborted) return null;
        const env = m.probe();
        if (m.tierOf(env).tier === 'none') { flat('no WebGL'); return null; }
        return m.mount(gl, { key: k, base: BASE, still: !motion, onTap: () => { const id = MOVES[cycle++ % MOVES.length][0]; act(id); }, onChange: furUi });
      }).then(v => {
        if (!v) return;
        if (sc.aborted) { v.dispose(); return; }
        viewer = v; state.viewer = v; state.loaded = true;
        stage.dataset.state = 'ready'; stage.dataset.tier = v.tier;
        enable(true); furUi();
        if (motion) { v.play('wave'); }   // a hello, once, on arrival (live only)
      }).catch(e => { if (!sc.aborted) flat(e && e.message); });
    };
    const act = id => {
      if (!viewer) return;
      viewer.play(id);
      const m = MOVES.find(x => x[0] === id);
      say(motion ? m[2] : STILL_SAY[id]);
    };

    sc.listen(sec, 'click', e => {
      const b = e.target.closest('button, a');
      if (!b || !sec.contains(b)) return;
      if (b.dataset.f3dFriend) {
        const f = b.dataset.f3dFriend; if (f === k || busy) return;
        show(f);
        if (viewer) {
          busy = true; stage.dataset.state = 'loading';
          viewer.setFriend(f).then(() => { if (sc.aborted) return; stage.dataset.state = 'ready'; furUi(); say('Showing ' + F[f].n + '.'); if (motion) viewer.play('wave'); })
            .catch(err => { if (!sc.aborted) flat(err && err.message); }).finally(() => { busy = false; });
        }
        return;
      }
      if (b.dataset.f3dMove) return act(b.dataset.f3dMove);
      const what = b.dataset.f3d;
      if (what === 'load') start();
      else if (what === 'left' && viewer) viewer.turn(-Math.PI / 4);
      else if (what === 'right' && viewer) viewer.turn(Math.PI / 4);
      else if (what === 'fur' && viewer) { const on = b.getAttribute('aria-pressed') !== 'true'; viewer.setFur(on).then(() => { furUi(); say(on ? 'Soft fur on.' : 'Soft fur off.'); }); }
      else if (what === 'ar') { const a = sec.querySelector('a[rel="ar"]'); if (a) a.click(); }
    });
    sc.listen(document, 'ff:lang', () => { sec.querySelector('.f3d-cap').textContent = T(F[k].d); sec.querySelector('[data-f3d-arbox]').innerHTML = arHtml(k); });
    sc.add(() => { if (viewer) viewer.dispose(); viewer = null; });

    // lazy: within a screen of the viewport (data saver: only on the visitor's tap)
    const saver = !!(nav.connection && nav.connection.saveData);
    if (saver) { loadBtn.hidden = false; return; }
    const near = sc.observe(es => es.forEach(e => { if (e.isIntersecting) { near.disconnect(); start(); } }), { rootMargin: '100% 0px 100% 0px', threshold: 0 });
    if (near) near.observe(stage); else loadBtn.hidden = false;
  }

  window.FFhooks = window.FFhooks || [];
  window.FFhooks.push(setup);
  window.FFFriends3D = { band, setup, KEYS, MOVES, F, BASE, intent, state: () => Object.assign({}, state, { viewer: !!state.viewer }), viewer: () => state.viewer };
})();
