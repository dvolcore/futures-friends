/* Futures Friends wave 10 WIDGETS: the six-step learning loop on #unit-1 ("What a day looks like: six steps") becomes a live widget.
   Owner 2026-10-07: "this is not very interactive, they're just flat — they should be glassed out, they should have widgets, they
   should be more interactive."
   - The six tiles keep every word of FFH_LOOP (views.js) and its numbering; each is a liquid-glass tile owned by its friend colour
     with a small plush friend. They are an ARIA tablist (automatic activation; Left/Right/Up/Down, Home, End) controlling one glass
     stage (role="tabpanel") that shows the step for real:
       1 Watch      the four friends' talking intro (story-world animation, captions), click to play, never autoplays
       2 Talk       flip cards with the "what happened / why" questions of the public talk-about-it cards (talk-cards.js)
       3 Do         one family activity from the free library (family-library-data.js), steps you can tick, "see more" link
       4 Move       Bop's activity video (Trunk Reach, else the full Elephant Stomp & Sway, video/act-elephant-stomp.mp4), link to #bop-at-home
       5 Explore    the four learning zones as a tiny story-world map (tap a zone: what children do there; FFH_ZONES, views.js)
       6 Take home  a family take-home card built from the same public talk card as step 2 (no Unit 1 family weeks: those stay
                    behind the Family Portal, curriculum-gate.js), link to #at-home
   - A "day path" (1 -> 6) above the stage fills and walks the step's friend along as you step through with Back / Next.
   - Lazy: no <video> and no poster exist until their step is open; a video element is made only when the visitor presses play,
     with captions on (FFCaptions). Sound effects are fire-and-forget ff:sfx events (sound.js decides whether they sound).
   - Reduced motion or the site's motion switch: no tilt, no walking, no 3D flip (a crossfade instead); everything still works.
   Honest copy: episodes are in development; clips are labelled story-world animation. Sends nothing, stores nothing. */
(function () {
  'use strict';
  if (typeof window === 'undefined') return;
  const W = window;
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LOOP = () => (typeof FFH_LOOP !== 'undefined' ? FFH_LOOP : []);
  const ZONES = () => (typeof FFH_ZONES !== 'undefined' ? FFH_ZONES : {});
  const mm = q => (typeof matchMedia === 'function' && matchMedia(q).matches);
  const moving = () => (W.FFMotion && typeof W.FFMotion.allowed === 'function' ? W.FFMotion.allowed() : !mm('(prefers-reduced-motion: reduce)') && document.documentElement.dataset.motion !== 'off');
  const sfx = (name, x) => { try { document.dispatchEvent(new CustomEvent('ff:sfx', { detail: { name, x } })); } catch (_) { /* no listener needed */ } };

  // the plush friend on each tile (FFPlush keys), and the AA-dark ink of each step's colour for text on light glass
  const PLUSH = ['zuri-peek', 'booker-thinking', 'zuri-magnifier', 'bop-dancing', 'lumi-waving', 'bop-waving'];
  const FRIEND = ['zuri', 'booker', 'zuri', 'bop', 'lumi', 'bop'];
  const NAMES = { booker: 'Booker', lumi: 'Lumi', zuri: 'Zuri', bop: 'Bop' };

  // the clips (all story-world animation from approved art; receipts in video/manifest.json)
  const WATCH = { mp4: 'video/ff-intro-titled-16x9.mp4', av1: 'video/ff-intro-titled-16x9.av1.webm', codecs: 'av01.0.05M.08, opus', poster: 'video/ff-intro-titled-16x9-poster.webp',
    title: 'Meet the four friends', label: 'Story-world animation: Booker, Lumi, Zuri and Bop each say hello and introduce themselves in a felt meadow.' };
  // Move: the short Trunk Reach clip first, the full Move Along video (Elephant Stomp & Sway) as the fallback if it cannot play
  const MOVES = [
    { mp4: 'video/act-trunk-reach.mp4', poster: 'video/act-trunk-reach-poster.jpg', title: 'Trunk Reach with Bop', len: '39 seconds',
      label: 'Story-world animation: Bop the elephant reaches his trunk up high to pick an apple.' },
    { mp4: 'video/act-elephant-stomp.mp4', poster: 'video/act-elephant-stomp-poster.jpg', title: 'Move along with Bop: Elephant Stomp & Sway', len: '2 min 38 sec',
      label: 'Story-world animation: Bop the elephant leads Elephant Stomp and Sway.' }
  ];
  const DO_ID = 'ice-detectives';
  const BANDS = { twos: 'twos', threes: 'threes', prek: 'pre-K' };

  // per-render state (a new render of #unit-1 makes a new widget and resets it)
  let S = { step: 0, talk: 0, flip: false, done: [], zone: 'booker', move: 0 };

  const talkCards = () => { const T = W.FFTalk; return T && Array.isArray(T.SLATE) ? T.SLATE.filter(c => NAMES[c.k]).slice(0, 4) : []; };
  const activity = () => { const F = W.FFFamily; return F && Array.isArray(F.ACTS) ? F.ACTS.find(a => a.id === DO_ID) || F.ACTS[0] : null; };
  const plush = (k, h, cls) => (W.FFPlush && W.FFPlush.has && W.FFPlush.has(k) ? W.FFPlush.img(k, { cls, alt: '', h }) : '');
  const tracks = src => (W.FFCaptions ? W.FFCaptions.tracks(src) : '');
  const transcript = (src, t) => (W.FFCaptions ? W.FFCaptions.transcript(src, t) : '');

  // ---------------------------------------------------------------- markup
  function tiles(loop) {
    return `<ol class="u1s-steps lw-tiles" role="tablist" aria-label="The six steps of a day">${loop.map(([n, d, c], i) => `<li role="presentation" style="--c:var(--${c})">
     <button type="button" role="tab" class="lw-tile ffg-pane${i ? '' : ' is-on'}" id="lw-tab-${i}" data-lw-step="${i}" aria-selected="${i ? 'false' : 'true'}" aria-controls="lw-panel" tabindex="${i ? -1 : 0}">
      <span class="lw-num" aria-hidden="true">${i + 1}</span>${plush(PLUSH[i], 64, 'lw-plush')}<b>${E(n)}</b><small>${E(d)}</small></button></li>`).join('')}</ol>`;
  }
  function path(loop) {
    return `<div class="lw-path" aria-hidden="true"><span class="lw-pathbase"></span><span class="lw-pathfill"></span>
     ${loop.map(([, , c], i) => `<i class="lw-dot${i ? '' : ' is-on'}" style="--c:var(--${c});--i:${i}"></i>`).join('')}
     <span class="lw-walker">${plush(PLUSH[0], 44, 'lw-walkcut')}</span></div>`;
  }
  function html(loop = LOOP()) {
    if (!loop.length) return '';
    S = { step: 0, talk: 0, flip: false, done: [], zone: 'booker', move: 0 };
    const [n0] = loop[0];
    return `<div class="lw" data-lw style="--lw-p:0">
   ${tiles(loop)}
   <div class="lw-stage ffg-pane" id="lw-panel" role="tabpanel" aria-labelledby="lw-tab-0" style="--c:var(--${loop[0][2]})">
    <div class="lw-top">${path(loop)}<p class="lw-where" aria-live="polite" aria-atomic="true">Step <b data-lw-n>1</b> of ${loop.length}: <span data-lw-name>${E(n0)}</span></p></div>
    <div class="lw-body" data-lw-body>${body(0)}</div>
    <div class="lw-nav"><button type="button" class="lw-navbtn" data-lw-nav="-1" disabled>Back</button><button type="button" class="lw-navbtn lw-next" data-lw-nav="1">Next: ${E(loop[1] ? loop[1][0] : '')}</button></div>
   </div></div>`;
  }

  // a poster that becomes the player only when pressed (nothing is downloaded but the poster until then)
  const poster = (v, key) => `<button type="button" class="lw-poster" data-lw-play="${key}" aria-label="Play: ${E(v.title)} (story-world animation, with captions)">
    <img src="${E(v.poster)}" alt="" width="1280" height="720" loading="lazy" decoding="async"><span class="lw-playbtn" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg></span>
    <span class="lw-tag">Story-world animation</span></button>`;
  function player(key) {
    const v = key === 'watch' ? WATCH : MOVES[S.move] || MOVES[0];
    return `<video class="lw-video" controls playsinline preload="metadata" width="1280" height="720" poster="${E(v.poster)}" aria-label="${E(v.label)}" data-lw-video="${key}">`
      + (v.av1 ? `<source src="${E(v.av1)}" type='video/webm; codecs="${E(v.codecs)}"'>` : '') + `<source src="${E(v.mp4)}" type="video/mp4">${tracks(v.mp4)}</video>`;
  }

  function body(i) {
    const k = ['watch', 'talk', 'do', 'move', 'explore', 'home'][i];
    return `<div class="lw-w lw-w-${k}">${(BODY[k] || (() => ''))()}</div>`;
  }
  const BODY = {
    watch: () => `<div class="lw-media">${poster(WATCH, 'watch')}</div>
     <div class="lw-copy"><span class="lw-kick">Watch together</span><h3>${E(WATCH.title)}</h3>
      <p>Each day starts with a short story, watched with a teacher. Our episodes are in development, so here is a sample of the story world: the four friends saying hello.</p>
      <p class="lw-note">Story-world animation, not an episode. Captions on; press play for sound.</p>
      ${transcript(WATCH.mp4, 'the four friends introduce themselves')}<a class="lw-link" href="#watch">More about episodes</a></div>`,
    talk: () => {
      const cards = talkCards(); if (!cards.length) return '';
      const c = cards[S.talk % cards.length], k = c.k;
      return `<div class="lw-media"><div class="lw-flip${S.flip ? ' is-flipped' : ''}" data-lw-flipcard style="--c:var(--${k})">
        <div class="lw-face lw-front tx-cream" ${S.flip ? 'aria-hidden="true"' : ''}><span class="lw-face-k">Ask</span><p class="lw-q">${E(c.after)}</p><span class="lw-face-s">FF${E(c.code)} · ${E(c.title)}</span>${plush(k, 70, 'lw-facecut')}</div>
        <div class="lw-face lw-back tx-cream" ${S.flip ? '' : 'aria-hidden="true"'}><span class="lw-face-k">What happened</span><p>${E(c.lesson)}</p><p class="lw-feel"><b>Feeling word: ${E(c.feel[0])}.</b> ${E(c.feel[1])}</p></div></div></div>
       <div class="lw-copy"><span class="lw-kick">Talk about it</span><h3>What happened, and why?</h3>
        <p>After the story, the teacher asks children to remember and explain. Flip the card to see what happened in the story.</p>
        <div class="lw-row"><button type="button" class="lw-chip" data-lw-flip aria-pressed="${S.flip}">Flip the card</button><button type="button" class="lw-chip" data-lw-talknext>Next question <span class="lw-count">${(S.talk % cards.length) + 1} of ${cards.length}</span></button></div>
        <p class="lw-note">From the talk-about-it card for FF${E(c.code)}, ${E(c.title)}. The episode is in development.</p><a class="lw-link" href="#talk/${E(c.code)}">See the whole talk card</a></div>`;
    },
    do: () => {
      const a = activity(); if (!a) return '';
      const n = a.steps.length, done = S.done.filter(Boolean).length;
      return `<div class="lw-media lw-felt" style="--c:var(--${E(a.c)})">${plush('zuri-magnifier', 150, 'lw-bigcut')}<p class="lw-bubble">${E(a.say || '')}</p></div>
       <div class="lw-copy"><span class="lw-kick">Hands-on</span><h3>${E(a.t)}</h3>
        <p class="lw-meta">${(t => t % 60 ? (t < 60 ? t + ' seconds' : Math.floor(t / 60) + ' min ' + (t % 60) + ' sec') : t / 60 + ' minutes')(Math.round(a.min * 60))} · ${E(String(a.where || '').toLowerCase())} · for ${(a.bands || []).map(b => E(BANDS[b] || b)).join(' and ')}</p>
        <p class="lw-need"><b>You need:</b> ${(a.mat || []).map(E).join(', ')}</p>
        <ol class="lw-todo" aria-label="Steps: tick each one as you go">${a.steps.map((s, j) => `<li><button type="button" class="lw-tick" data-lw-do="${j}" aria-pressed="${!!S.done[j]}"><span class="lw-box" aria-hidden="true"></span><span>${E(s)}</span></button></li>`).join('')}</ol>
        <p class="lw-note" data-lw-donenote>${done === n ? 'All done. That is the whole activity!' : (a.safety ? E(a.safety) : '')}</p>
        <a class="lw-link" href="#activities/${E(a.id)}">See more: ${E(a.t)} in the family library</a></div>`;
    },
    move: () => { const v = MOVES[S.move] || MOVES[0];
      return `<div class="lw-media">${poster(v, 'move')}</div>
       <div class="lw-copy"><span class="lw-kick">Move with Bop</span><h3>${E(v.title)}</h3>
        <p>After the activity, bodies move: a song, a stretch or a role play. Bop leads a short one here. Clear a little space and join in.</p>
        <p class="lw-note">Story-world animation · ${E(v.len)} · captions on; press play for sound.</p>
        ${transcript(v.mp4, v.title)}<a class="lw-link" href="#bop-at-home">More moves at home with Bop</a></div>`; },
    explore: () => {
      const Z = ZONES(), keys = ['booker', 'lumi', 'zuri', 'bop'].filter(k => Z[k]), z = Z[S.zone] || Z[keys[0]];
      if (!z) return '';
      return `<div class="lw-media"><div class="lw-map tx-felt" role="group" aria-label="The four learning zones (story-world map, not a floor plan)">${keys.map(k => `<button type="button" class="lw-zone${k === S.zone ? ' is-on' : ''}" data-lw-zone="${k}" aria-pressed="${k === S.zone}" style="--c:var(--${k})">${plush(k, 64, 'lw-zonecut')}<span>${E(Z[k].short)}</span></button>`).join('')}</div></div>
       <div class="lw-copy"><span class="lw-kick">Four learning zones, all day</span><h3>${E(NAMES[S.zone] || '')}’s ${E(z.short)}</h3>
        <p class="lw-say" style="--c:var(--${E(S.zone)})">“${E(z.say)}”</p>
        <p>Between the steps, children choose where to play. Tap a zone to see what they do there.</p>
        <p class="lw-note">A story-world map of the zones, not a floor plan of a real classroom.</p></div>`;
    },
    home: () => {
      const cards = talkCards(); if (!cards.length) return '';
      const c = cards[S.talk % cards.length];
      return `<div class="lw-media"><div class="lw-card tx-cream" style="--c:var(--${c.k})"><span class="lw-tape" aria-hidden="true"></span>
        <span class="lw-face-k">Take home · ${E(NAMES[c.k])}</span><p class="lw-q"><b>Ask at dinner:</b> ${E(c.after)}</p><p><b>Try together:</b> ${E(c.home)}</p>${plush(c.k, 64, 'lw-facecut')}</div></div>
       <div class="lw-copy"><span class="lw-kick">Family connection</span><h3>One question, one thing to try</h3>
        <p>The day goes home with a question to ask and a small activity to try together, so school and home talk about the same story.</p>
        <p class="lw-note">A sample from the public talk-about-it card for FF${E(c.code)}. Enrolled families get each week’s take-home activities in the Family Portal.</p>
        <a class="lw-link" href="#at-home">Free family activities: Futures at Home</a></div>`;
    }
  };

  // ---------------------------------------------------------------- behaviour (one delegated set of listeners for every render)
  const rootOf = el => el && el.closest && el.closest('[data-lw]');
  function paint(root, i, opts = {}) {
    const loop = LOOP(), n = loop.length; if (!root || !n) return;
    const prev = S.step; S.step = (i + n) % n;
    const tabs = root.querySelectorAll('[role="tab"]');
    tabs.forEach((t, j) => { const on = j === S.step; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; t.classList.toggle('is-on', on); t.classList.toggle('is-done', j < S.step); });
    root.querySelectorAll('.lw-dot').forEach((d, j) => { d.classList.toggle('is-on', j <= S.step); });
    root.style.setProperty('--lw-p', String(S.step / (n - 1)));
    const panel = root.querySelector('[role="tabpanel"]');
    panel.setAttribute('aria-labelledby', 'lw-tab-' + S.step); panel.style.setProperty('--c', `var(--${loop[S.step][2]})`);
    root.querySelector('[data-lw-n]').textContent = String(S.step + 1);
    root.querySelector('[data-lw-name]').textContent = loop[S.step][0];
    const walker = root.querySelector('.lw-walker');
    if (walker && W.FFPlush && prev !== S.step) walker.innerHTML = plush(PLUSH[S.step], 44, 'lw-walkcut');
    const back = root.querySelector('[data-lw-nav="-1"]'), next = root.querySelector('[data-lw-nav="1"]');
    back.disabled = S.step === 0; back.textContent = S.step ? `Back: ${loop[S.step - 1][0]}` : 'Back';
    next.textContent = S.step === n - 1 ? `Tomorrow: ${loop[0][0]} again` : `Next: ${loop[S.step + 1][0]}`;
    swap(root, body(S.step));
    if (opts.focus) tabs[S.step].focus();
    if (opts.reveal) { const r = panel.getBoundingClientRect(), vh = window.innerHeight || 800; if (r.top > vh * 0.72) panel.scrollIntoView({ block: 'nearest', behavior: moving() ? 'smooth' : 'auto' }); }
    if (prev !== S.step) { sfx(S.step === n - 1 ? 'chime' : 'tap', (S.step / (n - 1)) * 2 - 1); }
  }
  function swap(root, markup) {
    const b = root.querySelector('[data-lw-body]'); if (!b) return;
    b.innerHTML = markup;
    if (moving() && typeof b.animate === 'function') b.animate([{ opacity: 0, transform: 'translateY(6px)', filter: 'blur(3px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 240, easing: 'cubic-bezier(.23,1,.32,1)' });
  }
  const rerender = root => swap(root, body(S.step));

  function onClick(e) {
    const t = e.target, root = rootOf(t); if (!root) return;
    const tab = t.closest('[data-lw-step]'); if (tab) { paint(root, +tab.dataset.lwStep, { reveal: true }); return; }
    const nav = t.closest('[data-lw-nav]'); if (nav) { paint(root, S.step + +nav.dataset.lwNav); return; }
    const play = t.closest('[data-lw-play]');
    if (play) {
      const key = play.dataset.lwPlay, media = play.parentNode;
      media.innerHTML = player(key);
      const v = media.querySelector('video');
      v.addEventListener('error', fallback, true);
      if (window.FF_SOUND_OFF) { v.muted = true; v.defaultMuted = true; }   // the sound kill switch (sound-switch.js): always muted
      const p = v.play(); if (p && p.catch) p.catch(() => {});   // started by the visitor's press: sound is theirs to choose
      v.focus({ preventScroll: true });
      return;
    }
    if (t.closest('[data-lw-flip]') || t.closest('[data-lw-flipcard]')) { S.flip = !S.flip; flip(root); sfx('card-flip'); return; }
    if (t.closest('[data-lw-talknext]')) { S.talk = (S.talk + 1) % Math.max(1, talkCards().length); S.flip = false; rerender(root); sfx('page-turn'); const b = root.querySelector('[data-lw-talknext]'); if (b) b.focus(); return; }
    const tick = t.closest('[data-lw-do]');
    if (tick) {
      const j = +tick.dataset.lwDo; S.done[j] = !S.done[j]; tick.setAttribute('aria-pressed', String(!!S.done[j]));
      const a = activity(), all = a && a.steps.every((_, k) => S.done[k]);
      const note = root.querySelector('[data-lw-donenote]'); if (note && a) note.textContent = all ? 'All done. That is the whole activity!' : (a.safety || '');
      sfx(all ? 'badge' : 'tap'); return;
    }
    const zone = t.closest('[data-lw-zone]');
    if (zone && zone.dataset.lwZone !== S.zone) { S.zone = zone.dataset.lwZone; rerender(root); const b = root.querySelector(`[data-lw-zone="${S.zone}"]`); if (b) b.focus(); sfx('sparkle'); }
  }
  // the Move clip falls back to the full Move Along video (Elephant Stomp & Sway) if Trunk Reach cannot play
  function fallback(e) {
    const v = e.currentTarget; if (!v || v.dataset.lwVideo !== 'move' || S.move >= MOVES.length - 1) return;
    S.move += 1; const media = v.parentNode; media.innerHTML = player('move'); const n = media.querySelector('video'); n.addEventListener('error', fallback, true);
    if (window.FF_SOUND_OFF) { n.muted = true; n.defaultMuted = true; }
    const p = n.play(); if (p && p.catch) p.catch(() => {});
  }
  function flip(root) {
    const card = root.querySelector('[data-lw-flipcard]'), btn = root.querySelector('[data-lw-flip]'); if (!card) return;
    card.classList.toggle('is-flipped', S.flip);
    const [f, b] = card.querySelectorAll('.lw-face');
    if (S.flip) { f.setAttribute('aria-hidden', 'true'); b.removeAttribute('aria-hidden'); } else { b.setAttribute('aria-hidden', 'true'); f.removeAttribute('aria-hidden'); }
    if (btn) btn.setAttribute('aria-pressed', String(S.flip));
  }
  function onKey(e) {
    const tab = e.target.closest && e.target.closest('[role="tab"][data-lw-step]'); if (!tab) return;
    const root = rootOf(tab), n = LOOP().length, i = +tab.dataset.lwStep;
    const to = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: n - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault(); paint(root, Math.max(0, Math.min(n - 1, to)), { focus: true });
  }
  // the specular highlight (and, with motion, a slight tilt) follows a fine pointer over a tile or the stage
  let raf = 0, pending = null;
  function onMove(e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    const el = e.target.closest && e.target.closest('.lw .ffg-pane'); if (!el) return;
    pending = [el, e.clientX, e.clientY];
    if (!raf) raf = requestAnimationFrame(() => {
      raf = 0; const [g, x, y] = pending, r = g.getBoundingClientRect(); if (!r.width) return;
      const px = (x - r.left) / r.width, py = (y - r.top) / r.height;
      g.style.setProperty('--gx', (px * 100).toFixed(1) + '%'); g.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
      if (g.classList.contains('lw-tile') && moving()) g.style.transform = `perspective(700px) rotateX(${((0.5 - py) * 7).toFixed(2)}deg) rotateY(${((px - 0.5) * 9).toFixed(2)}deg) translateY(-3px)`;
    });
  }
  function onLeave(e) {
    const el = e.target; if (!el || !el.classList || !el.classList.contains('ffg-pane') || !rootOf(el)) return;
    el.style.removeProperty('--gx'); el.style.removeProperty('--gy'); el.style.transform = '';
  }
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    if (mm('(hover: hover) and (pointer: fine)')) { document.addEventListener('pointermove', onMove, { passive: true }); document.addEventListener('pointerleave', onLeave, true); }
  }

  W.FFLoopWidget = Object.freeze({ html, body, PLUSH, FRIEND, WATCH, MOVES, DO_ID, state: () => Object.assign({}, S), paint });
})();
