/* A day in the world (wave 8; owner 2026-10-06: "do some motion, graphic stuff in the background ... Apple glass in a few places
   ... a lot more polished, high-end"; he chose A DAY IN THE WORLD and LIVING FRIENDS AND HIDDEN SURPRISES).
   Scrolling Home moves through one day: hero = morning (the HERO lane's world), doors late morning, friends midday, the day path
   afternoon, the counts golden afternoon, trust and the pilot center sunset, "Talk to a real person" dusk, the footer night.
   What this file does on #home, one scope per render (ff-motion.js), and nothing anywhere else:
   - tags each section with data-day (its time) and data-daypart (morning | afternoon | sunset | night: the shared vocabulary)
     and dispatches `ff:daypart` {part} on document when the part at the middle of the screen changes (also html[data-daypart]).
   - builds each section's world layer lazily (when it comes within a screen): the mist that keeps the copy AA, the composed still
     sky (motion off) and the felt divider that joins it to the next section; story-world art from img/plush/world8 (ART lane).
   - motion on: one fixed felt sky behind the page whose layers cross-fade with scroll, a felt sun that arcs across it and hands
     over to the sunset plate's own sun, felt clouds, birds and golden pollen that drift, stars at dusk. Scroll-linked values run
     on native scroll-driven CSS (animation-timeline: scroll(root)) where the browser has it, else on GSAP ScrollTrigger.
   - the night strip above the footer: felt night sky, felt moon, twinkling felt stars, fireflies.
   - seven hidden surprises (tap a cloud: felt petals rain and a rainbow shows; tap a bird: it flaps away; tap a flower: it
     bursts; tap Booker on his path (booker-walk.js): he hops; tap the moon: it winks; catch a firefly; tap the bright star: a
     shooting star). They are pointer toys: aria-hidden decoration that carries no information, placed only where no link,
     button or text is (checked against the page, 16 px clear of every tap target), so focus order and landmarks are unchanged.
     A small felt badge counts them ("3 of 7 surprises found"); the count is kept in localStorage when the browser allows it.
   - liquid glass (glass.css): pointer-tracked specular highlight; the refracting rim on Chromium.
   - living felt cards: the friend tabs get a felt face that tilts toward the pointer behind the friend (the art never tilts).
   Every loop pauses off screen and on a hidden tab. Reduced motion or the motion switch: the composed still day, no movement;
   the surprises still answer a tap, without travel. Sounds are requests only (`ff:sfx`); sound.js decides whether to play.
   Sends nothing. Stores only the surprises found. */
(function () {
  'use strict';
  const W8 = 'img/plush/world8/';
  const HERO = 'img/plush/hero/';
  // section -> time of day -> shared day part -> stage layer it belongs to
  const SCENES = [
    { sel: '.hc-doors', day: 'late-morning', part: 'morning', k: 0, edge: 'clouds', edgeAt: 'top' },
    { sel: '.hc-status', day: 'late-morning', part: 'morning', k: 0 },
    { sel: '.hc-friends', day: 'midday', part: 'morning', k: 1, edge: 'hills' },
    { sel: '.hc-day', day: 'afternoon', part: 'afternoon', k: 2, edge: 'flowers', plate: 'sky-afternoon' },
    { sel: '.hc-proof', day: 'golden-afternoon', part: 'afternoon', k: 3, edge: 'grass', plate: 'sky-afternoon' },
    { sel: '.hc-trust', day: 'sunset', part: 'sunset', k: 4, edge: 'dusk', plate: 'sky-sunset' },
    { sel: '.hc-close', day: 'dusk', part: 'sunset', k: 5 }
  ];
  const TOTAL = 7;
  // the seven hidden surprises (documentation labels; the toys are aria-hidden decoration and hold no information)
  const LABELS = { cloud: 'Tap the cloud: felt petals rain and a rainbow shows', bird: 'Tap the bird: it flaps away', flower: 'Tap the flower: it bursts into sparkles', booker: 'Tap Booker on his path: he hops', moon: 'Tap the moon: it winks', firefly: 'Catch a firefly', star: 'Tap the bright star: a shooting star' };
  const STORE = 'ff-surprises-v1';
  let live = null;
  const M = () => window.FFMotion;
  const sfx = (name, x, gain) => { try { document.dispatchEvent(new CustomEvent('ff:sfx', { detail: { name, x: x == null ? 0 : Math.max(-1, Math.min(1, x)), gain } })); } catch (e) { /* events are fire-and-forget */ } };
  const panX = el => { const r = el.getBoundingClientRect(); return ((r.left + r.width / 2) / (innerWidth || 1)) * 2 - 1; };
  const phone = () => (document.documentElement.clientWidth || innerWidth) < 700;
  const plateURL = name => W8 + name + (phone() ? '-800.webp' : '-1600.webp');
  const mk = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; };
  const img = (src, cls, extra) => `<img src="${src}" alt="" decoding="async" loading="lazy" draggable="false"${cls ? ` class="${cls}"` : ''}${extra || ''}>`;
  const rnd = (seed => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; })(20261006);

  // ---------------------------------------------------------------- surprises found (stored only if the browser allows it)
  const found = {
    set: null,
    load() { if (this.set) return this.set; let a = []; try { a = JSON.parse(localStorage.getItem(STORE) || '[]'); } catch (e) { a = []; } this.set = new Set(Array.isArray(a) ? a.filter(x => typeof x === 'string').slice(0, TOTAL) : []); return this.set; },
    add(id) { const s = this.load(), fresh = !s.has(id); s.add(id); try { localStorage.setItem(STORE, JSON.stringify([...s])); } catch (e) { /* private mode: count for this visit only */ } return fresh; }
  };
  function badge(near, id) {
    const fresh = found.add(id), n = found.load().size;
    const host = near.closest('.hd-fx, .hd-night, #bw-layer') || near.parentNode;
    if (!host) return;
    host.querySelectorAll('.hd-found').forEach(b => b.remove());
    const b = mk('span', 'hd-found', `${img(W8 + 'star-s-40.webp')}${n === TOTAL ? 'All 7 surprises found!' : `${n} of ${TOTAL} surprises found`}`);
    b.setAttribute('aria-hidden', 'true');
    b.dataset.fresh = fresh ? '1' : '0';
    const r = near.getBoundingClientRect(), hr = host.getBoundingClientRect();
    host.appendChild(b);
    // the badge goes where it covers nothing: above the toy, below it, to its left or right (else over the toy itself)
    const bw = b.offsetWidth || 150, bh = b.offsetHeight || 28, obs = obstacles();
    const cx = r.left - hr.left + r.width / 2 - bw / 2, spots = [[cx, r.top - hr.top - bh - 8], [cx, r.bottom - hr.top + 8], [r.left - hr.left - bw - 10, r.top - hr.top + r.height / 2 - bh / 2], [r.right - hr.left + 10, r.top - hr.top + r.height / 2 - bh / 2]];
    let pick = [cx, r.top - hr.top + r.height / 2 - bh / 2];
    for (const [x0, y0] of spots) {
      const x = Math.max(8, Math.min(hr.width - bw - 8, x0)), y = Math.max(2, y0);
      const box = { l: hr.left + scrollX + x, t: hr.top + scrollY + y, r: hr.left + scrollX + x + bw, b: hr.top + scrollY + y + bh };
      if (!hits(box, obs)) { pick = [x, y]; break; }
    }
    b.style.left = Math.max(8, Math.min(hr.width - bw - 8, pick[0])) + 'px'; b.style.top = pick[1] + 'px';
    if (M() && M().allowed()) b.animate([{ opacity: 0, transform: 'translateY(6px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'cubic-bezier(.16,1,.3,1)' });
    setTimeout(() => { if (!b.isConnected) return; const a = b.animate ? b.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: 'forwards' }) : null; if (a) a.onfinish = () => b.remove(); else b.remove(); }, 2400);
    if (n === TOTAL && fresh) sfx('chime', panX(near), 0.8);
  }

  // ---------------------------------------------------------------- tap targets the decoration must stay clear of (16 px)
  // k scales the clearance: 1 = 16 px around controls and 4 px around words (default); 0 = their exact boxes (the phone walker)
  function obstacles(k = 1) {
    const out = [];
    const add = (el, pad0) => { const pad = pad0 * k; const shut = el.closest('details:not([open])'); if (shut && !el.closest('summary')) return;   // a closed transcript's words are not on screen
      const r = el.getBoundingClientRect(); if (r.width && r.height) out.push({ l: r.left + scrollX - pad, t: r.top + scrollY - pad, r: r.right + scrollX + pad, b: r.bottom + scrollY + pad }); };
    document.querySelectorAll('#view a[href], #view button, #view [role=tab], #view input, #view select, #view textarea, #view [tabindex="0"], .ff-footscene a').forEach(e => add(e, 16));
    document.querySelectorAll('#view h1, #view h2, #view h3, #view p, #view li, #view figure, #view .hc-pickstage, #view .hc-doorlist, #view .hc-prooflist, #view .hc-closegrid, .ff-footscene .ff-footfriend').forEach(e => add(e, 4));
    return out;
  }
  const hits = (box, obs) => obs.some(o => !(box.r <= o.l || box.l >= o.r || box.b <= o.t || box.t >= o.b));
  function placeClear(el, obs) {
    const r = el.getBoundingClientRect();
    const box = { l: r.left + scrollX, t: r.top + scrollY, r: r.right + scrollX, b: r.bottom + scrollY };
    const blocked = !r.width || hits(box, obs);
    if (blocked) el.dataset.blocked = '1'; else delete el.dataset.blocked;
    return !blocked;
  }
  // try each candidate spot (x, y in the host's own px) until one is clear of every tap target and all text
  function placeFirst(el, spots, obs) {
    delete el.dataset.blocked;
    const host = el.offsetParent || el.parentNode, hw = host ? host.clientWidth : innerWidth, ew = el.offsetWidth || 48;
    for (const [x, y] of spots) { el.style.left = Math.round(Math.max(4, Math.min(hw - ew - 4, x))) + 'px'; el.style.top = Math.round(y) + 'px'; if (placeClear(el, obs)) return true; }
    el.dataset.blocked = '1';
    return false;
  }

  // ---------------------------------------------------------------- the fixed sky
  function stage(sc) {
    let st = document.querySelector('body > .hd-stage');
    if (st) st.remove();
    st = mk('div', 'hd-stage');
    st.setAttribute('aria-hidden', 'true');
    const p = phone();
    const cloud = (i, top, w, d, dl) => `<img class="hd-cloud" src="${HERO}felt-cloud-${i}-480.webp" alt="" decoding="async" draggable="false" style="top:${top}vh;width:${w}px;--d:${d}s;--dl:${dl}s">`;
    const birds = [[18, 14, 34, 0], [26, 11, 47, -19]].slice(0, p ? 1 : 2).map(([top, w, d, dl]) => `<span class="hd-bird" style="top:${top}vh;--bw:${w * (p ? 2.4 : 3)}px;--d:${d}s;--dl:${dl}s">${img(W8 + 'bird-up-128.webp')}${img(W8 + 'bird-mid-128.webp')}${img(W8 + 'bird-down-128.webp')}</span>`).join('');
    const motes = Array.from({ length: p ? 6 : 12 }, (_, i) => `<i class="hd-mote" style="left:${(8 + rnd() * 84).toFixed(1)}vw;top:${(55 + rnd() * 40).toFixed(1)}vh;--d:${(12 + rnd() * 10).toFixed(1)}s;--dl:-${(rnd() * 20).toFixed(1)}s"></i>`).join('');
    const stars = Array.from({ length: p ? 9 : 16 }, (_, i) => { const s = ['s-40', 'm-64', 's-40', 'l-96'][i % 4], w = { 's-40': 10, 'm-64': 15, 'l-96': 20 }[s]; return `<img class="hd-star" src="${W8}star-${s}.webp" alt="" decoding="async" draggable="false" style="left:${(4 + rnd() * 92).toFixed(1)}vw;top:${(3 + rnd() * 48).toFixed(1)}vh;width:${w}px;--d:${(2.4 + rnd() * 2.6).toFixed(1)}s;--dl:-${(rnd() * 3).toFixed(1)}s">`; }).join('');
    st.innerHTML = `${[0, 1, 2, 3, 4, 5].map(k => `<div class="hd-sky" data-k="${k}"></div>`).join('')}
      <img class="hd-sun" src="${HERO}felt-sun-320.webp" alt="" decoding="async" draggable="false">
      <div class="hd-stars">${stars}</div>
      <div class="hd-clouds">${cloud(1, 8, p ? 150 : 260, p ? 120 : 190, -40)}${cloud(3, 26, p ? 120 : 210, p ? 150 : 240, -150)}${p ? '' : cloud(2, 15, 180, 210, -95)}</div>
      <div class="hd-birds">${birds}</div>
      <div class="hd-pollen">${motes}</div>`;
    document.body.insertBefore(st, document.body.firstChild);
    sc.add(() => st.remove());
    return st;
  }

  // Scroll-linked values. Anchors: the scroll position at which each section's middle sits at the middle of the screen.
  function anchors(view) {
    const maxS = Math.max(1, document.documentElement.scrollHeight - innerHeight), vh = innerHeight;
    const at = sel => { const e = view.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return Math.max(0, Math.min(1, (r.top + scrollY + r.height / 2 - vh / 2) / maxS)); };
    const hero = view.querySelector('.px-homehero'), hb = hero ? hero.getBoundingClientRect().bottom + scrollY : vh;
    const a = { hero: Math.max(0, Math.min(1, (hb - vh * 0.9) / maxS)), doors: at('.hc-doors'), friends: at('.hc-friends'), day: at('.hc-day'), proof: at('.hc-proof'), trust: at('.hc-trust'), close: at('.hc-close') };
    // keep them in order and apart, so every keyframe list is strictly increasing
    let prev = -1;
    ['hero', 'doors', 'friends', 'day', 'proof', 'trust', 'close'].forEach(k => { let v = a[k] == null ? prev + 0.01 : a[k]; if (v <= prev) v = Math.min(1, prev + 0.004); a[k] = v; prev = v; });
    return a;
  }
  // the felt sun's arc (vw, vh): high in the morning, highest at midday, low and gold, then it hands over to the sunset plate's sun
  function sunTarget() {
    // sky-sunset plate: sun centre at 62% x, 76% y of the 16:9 plate; the stage layer is background-size:cover, position 66% 50%
    const W = innerWidth, H = innerHeight, s = Math.max(W / 1600, H / 900), pw = 1600 * s, ph = 900 * s;
    const x = (0.62 * pw - (pw - W) * 0.66) / W * 100, y = (0.76 * ph - (ph - H) * 0.5) / H * 100;
    return [Math.max(0, Math.min(100, x)), Math.max(0, Math.min(100, y))];
  }
  // the sun's drawn size (CSS: clamp(64px, 8.5vw, 118px)); positions are its centre
  const sunSize = () => Math.max(64, Math.min(118, (document.documentElement.clientWidth || innerWidth) * 0.085));
  function tracks(a) {
    const [tx, ty] = sunTarget();
    const sun = [[a.hero, 90, 34], [a.doors, 87, 20], [a.friends, 78, 9], [a.day, 70, 13], [a.proof, Math.max(tx + 4, 66), 40], [a.trust, tx, ty]];
    const T = {
      sky1: [[0, 0], [a.doors, 0], [a.friends, 1]],
      sky2: [[0, 0], [a.friends, 0], [a.day, 1]],
      sky3: [[0, 0], [a.day, 0], [a.proof, 1], [a.trust, 1]],
      sky4: [[0, 0], [a.proof, 0], [a.trust, 1]],
      sky5: [[0, 0], [a.trust, 0], [a.close, 1]],
      sunO: [[0, 0], [a.hero, 0], [a.doors, 1], [a.proof, 1], [a.trust, 0]],
      sunT: sun.map(([q, x, y]) => [q, [+x.toFixed(2), +y.toFixed(2)]]),
      clouds: [[0, 1], [a.day, 1], [a.proof, 0.75], [a.trust, 0.25], [a.close, 0]],
      birds: [[0, 1], [a.proof, 1], [a.trust, 0]],
      pollen: [[0, 0], [a.friends, 0], [a.day, 0.7], [a.proof, 1], [a.trust, 0]],
      stars: [[0, 0], [a.trust, 0], [a.close, 1]]
    };
    return T;
  }
  const PROPS = { sky1: ['.hd-sky[data-k="1"]', 'opacity'], sky2: ['.hd-sky[data-k="2"]', 'opacity'], sky3: ['.hd-sky[data-k="3"]', 'opacity'], sky4: ['.hd-sky[data-k="4"]', 'opacity'], sky5: ['.hd-sky[data-k="5"]', 'opacity'], sunO: ['.hd-sun', 'opacity'], sunT: ['.hd-sun', 'transform'], clouds: ['.hd-clouds', 'opacity'], birds: ['.hd-birds', 'opacity'], pollen: ['.hd-pollen', 'opacity'], stars: ['.hd-stars', 'opacity'] };
  const pct = q => (q * 100).toFixed(3) + '%';
  function cssScroll(st, T, sc) {
    let el = document.getElementById('hd-kf');
    if (!el) { el = mk('style'); el.id = 'hd-kf'; document.head.appendChild(el); sc.add(() => el.remove()); }
    const byEl = {};
    Object.keys(T).forEach(name => { const [sel, prop] = PROPS[name]; (byEl[sel] = byEl[sel] || []).push(name); });
    let css = '';
    const half = sunSize() / 2;
    const fmt = v => (Array.isArray(v) ? `translate3d(calc(${v[0]}vw - ${half}px), calc(${v[1]}vh - ${half}px), 0)` : v);
    Object.keys(T).forEach(name => {
      const [, prop] = PROPS[name], stops = T[name].slice().map(([q, v]) => [q, fmt(v)]);
      if (stops[stops.length - 1][0] < 1) stops.push([1, stops[stops.length - 1][1]]);
      css += `@keyframes hd-${name}{${stops.map(([q, v]) => `${pct(q)}{${prop}:${v}}`).join('')}}`;
    });
    Object.keys(byEl).forEach(sel => {
      const names = byEl[sel];
      css += `.hd-stage ${sel}{animation-name:${names.map(n => 'hd-' + n).join(',')};animation-duration:auto;animation-timing-function:linear;animation-fill-mode:both;animation-timeline:${names.map(() => 'scroll(root block)').join(',')}}`;
    });
    el.textContent = css;
  }
  // GSAP ScrollTrigger fallback (and a plain scroll listener if GSAP is missing): the same tracks, interpolated here.
  function lerpTrack(stops, q) {
    if (q <= stops[0][0]) return stops[0][1];
    for (let i = 1; i < stops.length; i++) {
      const [q1, v1] = stops[i], [q0, v0] = stops[i - 1];
      if (q <= q1) { const t = q1 > q0 ? (q - q0) / (q1 - q0) : 1; return Array.isArray(v0) ? [v0[0] + (v1[0] - v0[0]) * t, v0[1] + (v1[1] - v0[1]) * t] : v0 + (v1 - v0) * t; }
    }
    return stops[stops.length - 1][1];
  }
  function jsScroll(st, getT, sc) {
    const els = {}; Object.keys(PROPS).forEach(n => { els[n] = st.querySelector(PROPS[n][0]); });
    const apply = q => {
      const T = getT();
      Object.keys(T).forEach(n => {
        const e = els[n]; if (!e) return;
        const v = lerpTrack(T[n], q);
        if (n === 'sunT') {
          const half = sunSize() / 2;
          e.style.transform = `translate3d(${(v[0] * innerWidth / 100 - half).toFixed(1)}px, ${(v[1] * innerHeight / 100 - half).toFixed(1)}px, 0)`;
        } else e.style.opacity = (+v).toFixed(3);
      });
    };
    const q = () => { const m = document.documentElement.scrollHeight - innerHeight; return m > 0 ? Math.max(0, Math.min(1, scrollY / m)) : 0; };
    if (window.gsap && window.ScrollTrigger) {
      try { window.gsap.registerPlugin(window.ScrollTrigger); } catch (e) { /* registered already */ }
      const t = window.ScrollTrigger.create({ start: 0, end: 'max', onUpdate: self => apply(self.progress) });
      sc.add(() => t.kill());
      apply(q());
      return 'scrolltrigger';
    }
    let id = 0;
    sc.listen(window, 'scroll', () => { if (!id) id = requestAnimationFrame(() => { id = 0; apply(q()); }); }, { passive: true });
    sc.add(() => { if (id) cancelAnimationFrame(id); });
    apply(q());
    return 'scroll';
  }

  // ---------------------------------------------------------------- per-section world layers (lazy)
  function world(sec, scene, motion) {
    if (sec.querySelector(':scope > .hd-world')) return;
    const w = mk('div', 'hd-world');
    w.setAttribute('aria-hidden', 'true');
    w.innerHTML = `${scene.plate ? '<div class="hd-plate"></div>' : ''}<div class="hd-mist"></div>`;
    sec.insertBefore(w, sec.firstChild);
    if (scene.edge) {
      const e = mk('div', `hd-edge hd-edge-${scene.edge}`);
      e.setAttribute('aria-hidden', 'true');
      sec.insertBefore(e, w.nextSibling);
    }
    if (scene.plate && !motion) {
      const p = w.querySelector('.hd-plate'), u = plateURL(scene.plate), im = new Image();
      im.decoding = 'async';
      im.onload = () => { p.style.backgroundImage = `url("${u}")`; p.classList.add('is-in'); };
      im.src = u;
    }
  }
  function loadPlate(st, k, name) {
    const el = st.querySelector(`.hd-sky[data-k="${k}"]`);
    if (!el || el.dataset.src) return;
    const u = plateURL(name); el.dataset.src = u;
    el.style.backgroundImage = `url("${u}")`;
  }

  // ---------------------------------------------------------------- hidden surprises
  function burst(host, x, y, w) {
    const b = mk('img', 'hd-burst'); b.alt = ''; b.src = W8 + 'sparkle-burst-160.webp'; b.setAttribute('aria-hidden', 'true');
    b.style.width = (w || 90) + 'px'; b.style.left = (x - (w || 90) / 2) + 'px'; b.style.top = (y - (w || 90) / 2) + 'px';
    host.appendChild(b);
    const a = b.animate([{ opacity: 0, transform: 'scale(.6) rotate(-20deg)' }, { opacity: 1, transform: 'scale(1) rotate(0deg)', offset: .35 }, { opacity: 0, transform: 'scale(1.15) rotate(12deg)' }], { duration: M().allowed() ? 760 : 420, easing: 'cubic-bezier(.16,1,.3,1)' });
    a.onfinish = () => b.remove();
  }
  function rain(fx, toy) {
    // the petals and the rainbow fall behind the words (the section's world layer), never over them
    const sec = fx.parentNode, host = (sec && sec.querySelector(':scope > .hd-world')) || fx;
    const motion = M().allowed(), hr = host.getBoundingClientRect(), r = toy.getBoundingClientRect();
    const sprites = ['sprite-petal-pink-48', 'sprite-petal-daisy-48', 'sprite-raindrop-48'];
    const n = motion ? 16 : 0;
    for (let i = 0; i < n; i++) {
      const d = mk('img', 'hd-drop'); d.alt = ''; d.src = W8 + sprites[i % 3] + '.webp';
      const x0 = r.left - hr.left + 10 + rnd() * (r.width - 20), y0 = r.top - hr.top + r.height * 0.55;
      d.style.left = x0 + 'px'; d.style.top = y0 + 'px'; d.style.width = (i % 3 === 2 ? 10 : 14) + 'px';
      host.appendChild(d);
      const fall = 120 + rnd() * 120, drift = (rnd() - 0.5) * 60, rot = (rnd() - 0.5) * 300;
      const a = d.animate([{ transform: 'translate3d(0,0,0) rotate(0deg)', opacity: 0 }, { opacity: 1, offset: .12 }, { transform: `translate3d(${drift}px, ${fall}px, 0) rotate(${rot}deg)`, opacity: 0 }], { duration: 1100 + rnd() * 700, delay: i * 55, easing: 'cubic-bezier(.3,.1,.6,1)', fill: 'backwards' });
      a.onfinish = () => d.remove();
    }
    // a felt rainbow shows for a moment beside the cloud
    let rb = host.querySelector('.hd-rainbow');
    if (!rb) { rb = mk('img', 'hd-rainbow'); rb.alt = ''; rb.src = W8 + 'rainbow-480.webp'; host.appendChild(rb); }
    const rw = Math.min(240, hr.width * 0.4);
    rb.style.width = rw + 'px';
    rb.style.left = Math.max(8, r.left - hr.left - rw * 0.55) + 'px'; rb.style.top = Math.max(0, r.top - hr.top - rw * 0.12) + 'px';
    rb.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: .95, transform: 'none', offset: .2 }, { opacity: .95, offset: .8 }, { opacity: 0 }], { duration: motion ? 3200 : 2200, delay: motion ? 500 : 0, fill: 'backwards', easing: 'ease-in-out' });
  }
  function toys(view, sc, motion) {
    const made = [];
    let lazy = null;
    const toy = (sec, cls, id, html, place) => {
      if (!sec) return null;
      let fx = sec.querySelector(':scope > .hd-fx');
      if (!fx) { fx = mk('div', 'hd-fx'); fx.setAttribute('aria-hidden', 'true'); sec.appendChild(fx); }
      // the toy's art is fetched only when its section comes within a screen (its box is sized by CSS, so placement needs no image)
      const t = mk('span', `hd-toy ${cls}`, html.replace(/ src="/g, ' data-src="'));
      t.dataset.surprise = id; t.dataset.label = LABELS[id];
      t.setAttribute('aria-hidden', 'true');
      fx.appendChild(t);
      made.push({ t, place, sec });
      if (lazy) lazy.observe(sec); else wake(sec);
      return t;
    };
    const wake = sec => sec.querySelectorAll(':scope > .hd-fx img[data-src]').forEach(i => { i.src = i.dataset.src; i.removeAttribute('data-src'); });
    lazy = sc.observe(es => es.forEach(e => { if (e.isIntersecting) { lazy.unobserve(e.target); wake(e.target); } }), { rootMargin: '100% 0px 100% 0px' });
    // Each toy lists the spots it may use (in its section's own px), first choice first; the first spot clear of every tap target
    // and all text wins, and if none is clear at this width the toy simply is not shown.
    // 1. a cloud in the friends' midday sky: above the heading on the right, else low on the right above the hills
    const cloud = toy(view.querySelector('.hc-friends'), 'hd-toy-cloud', 'cloud', img(HERO + 'felt-cloud-4-480.webp'), (t, s) => { const w = s.offsetWidth, cw = t.offsetWidth || 120, ch = t.offsetHeight || 70, H2 = s.offsetHeight; return [[w * 0.82 - cw / 2, 2], [w * 0.7 - cw / 2, 2], [w - cw - 24, H2 - ch - 8], [w * 0.62, H2 - ch - 8], [w * 0.5, H2 - ch - 6]]; });
    // 2. a felt bird resting in the golden afternoon: top right, else beside the kinetic line, else low right
    const bird = toy(view.querySelector('.hc-proof'), 'hd-toy-bird', 'bird', img(W8 + 'bird-mid-128.webp') + img(W8 + 'bird-up-128.webp', '', ' style="opacity:0"'), (t, s) => { const w = s.offsetWidth, bw = t.offsetWidth || 46, H2 = s.offsetHeight; return [[w * 0.86, 12], [w * 0.74, 8], [w - bw - 18, 6], [w - bw - 26, H2 - bw - 40], [w * 0.6, H2 - bw - 34]]; });
    // 3. a flower in the afternoon's flower border
    const flower = toy(view.querySelector('.hc-day'), 'hd-toy-flower', 'flower', img(W8 + 'sprite-petal-daisy-48.webp'), (t, s) => { const w = s.offsetWidth, H2 = s.offsetHeight; return [[w * 0.9, H2 - 58], [w * 0.8, H2 - 54], [w * 0.66, H2 - 50], [w - 64, H2 - 50]]; });
    const place = () => {
      const obs = obstacles();
      made.forEach(({ t, place: p, sec }) => placeFirst(t, p(t, sec), obs));
    };
    sc.add(() => made.forEach(({ t }) => { const fx = t.parentNode; t.remove(); if (fx && !fx.children.length) fx.remove(); }));
    if (cloud) sc.listen(cloud, 'click', () => { sfx('rain', panX(cloud), 0.7); if (M().allowed()) cloud.animate([{ transform: 'none' }, { transform: 'translateY(4px) scale(1.04)' }, { transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.3,.7,.4,1)' }); rain(cloud.parentNode, cloud); badge(cloud, 'cloud'); });
    if (bird) sc.listen(bird, 'click', () => {
      sfx('whoosh', panX(bird), 0.6); badge(bird, 'bird');
      const [a, b] = bird.querySelectorAll('img');
      if (!M().allowed()) { bird.animate([{ opacity: 1 }, { opacity: 0, offset: .4 }, { opacity: 0, offset: .8 }, { opacity: 1 }], { duration: 2400 }); return; }
      let f = 0; const flap = setInterval(() => { f ^= 1; a.style.opacity = f ? 0 : 1; b.style.opacity = f ? 1 : 0; }, 90);
      const fly = bird.animate([{ transform: 'none', opacity: 1 }, { transform: 'translate3d(60px,-80px,0) rotate(-8deg)', offset: .3 }, { transform: 'translate3d(260px,-260px,0) rotate(-14deg)', opacity: 0 }], { duration: 1500, easing: 'cubic-bezier(.4,0,.6,1)', fill: 'forwards' });
      fly.onfinish = () => { clearInterval(flap); a.style.opacity = 1; b.style.opacity = 0; setTimeout(() => { if (bird.isConnected) bird.animate([{ opacity: 0, transform: 'translate3d(-30px,-40px,0)' }, { opacity: 1, transform: 'none' }], { duration: 900, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' }); }, 6000); };
      sc.add(() => clearInterval(flap));
    });
    if (flower) sc.listen(flower, 'click', () => {
      sfx('sparkle', panX(flower), 0.6); badge(flower, 'flower');
      if (M().allowed()) flower.animate([{ transform: 'none' }, { transform: 'scale(1.35) rotate(140deg)', offset: .45 }, { transform: 'rotate(360deg)' }], { duration: 700, easing: 'cubic-bezier(.3,.7,.4,1)' });
      const fx = flower.parentNode, r = flower.getBoundingClientRect(), hr = fx.getBoundingClientRect();
      burst(fx, r.left - hr.left + r.width / 2, r.top - hr.top + r.height / 2, 96);
    });
    return { place };
  }

  // ---------------------------------------------------------------- night above the footer
  function night(sc, motion) {
    const fs = document.querySelector('.ff-footscene');
    if (!fs) return null;
    let n = fs.querySelector(':scope > .hd-night');
    if (n) n.remove();
    n = mk('div', 'hd-night');
    n.setAttribute('aria-hidden', 'true');
    const p = phone();
    const stars = Array.from({ length: p ? 8 : 14 }, (_, i) => { const s = ['s-40', 'm-64', 's-40'][i % 3], w = { 's-40': 9, 'm-64': 14 }[s]; return `<img class="hd-star" src="${W8}star-${s}.webp" alt="" loading="lazy" decoding="async" style="left:${(3 + rnd() * 94).toFixed(1)}%;top:${(4 + rnd() * 34).toFixed(1)}%;width:${w}px;--d:${(2.2 + rnd() * 2.8).toFixed(1)}s;--dl:-${(rnd() * 3).toFixed(1)}s">`; }).join('');
    const flies = Array.from({ length: p ? 5 : 9 }, () => `<i class="hd-ffly" style="left:${(4 + rnd() * 92).toFixed(1)}%;top:${(40 + rnd() * 44).toFixed(1)}%;--d:${(8 + rnd() * 8).toFixed(1)}s;--dl:-${(rnd() * 10).toFixed(1)}s"></i>`).join('');
    n.innerHTML = `<div class="hd-nightsky"></div>${stars}${flies}<div class="hd-nightmeadow"></div><div class="hd-fx hd-nightfx"></div>`;
    fs.insertBefore(n, fs.firstChild);
    const sky = n.querySelector('.hd-nightsky'), u = plateURL('sky-night');
    sky.style.backgroundImage = `url("${u}")`;
    sc.add(() => n.remove());
    const fx = n.querySelector('.hd-nightfx');
    const toy = (cls, id, html, css) => { const t = mk('span', `hd-toy ${cls}`, html); t.dataset.surprise = id; t.dataset.label = LABELS[id]; t.setAttribute('aria-hidden', 'true'); Object.assign(t.style, css); fx.appendChild(t); return t; };
    // 5. the moon (top right), 6. a firefly to catch (top left third), 7. the bright star (left)
    const moon = toy('hd-toy-moon', 'moon', img(W8 + 'moon-160.webp'), { right: p ? '14px' : '7%', top: p ? '8px' : '12px' });
    const fly = toy('hd-toy-firefly', 'firefly', `${img(W8 + 'firefly-glow-64.webp', 'hd-glow')}${img(W8 + 'firefly-64.webp')}`, { left: p ? '34%' : '30%', top: p ? '12px' : '16px' });
    const star = toy('hd-toy-star', 'star', img(W8 + 'star-l-96.webp'), { left: p ? '12px' : '8%', top: p ? '10px' : '14px' });
    sc.listen(moon, 'click', () => {
      sfx('wink', panX(moon), 0.7); badge(moon, 'moon');
      const r = moon.getBoundingClientRect(), hr = fx.getBoundingClientRect();
      if (M().allowed()) moon.animate([{ transform: 'none', filter: 'brightness(1)' }, { transform: 'rotate(-10deg) scale(1.04)', filter: 'brightness(1.25)', offset: .3 }, { transform: 'rotate(4deg)', filter: 'brightness(.85)', offset: .55 }, { transform: 'none', filter: 'brightness(1)' }], { duration: 760, easing: 'ease-in-out' });
      // the wink: a felt star glints at the moon's edge
      const g = mk('img', 'hd-burst'); g.alt = ''; g.src = W8 + 'star-m-64.webp'; g.style.width = '22px'; g.style.left = (r.left - hr.left + r.width * 0.72) + 'px'; g.style.top = (r.top - hr.top + r.height * 0.18) + 'px'; fx.appendChild(g);
      const a = g.animate([{ opacity: 0, transform: 'scale(.3) rotate(0deg)' }, { opacity: 1, transform: 'scale(1.2) rotate(45deg)', offset: .4 }, { opacity: 0, transform: 'scale(.4) rotate(90deg)' }], { duration: 700, easing: 'ease-out' }); a.onfinish = () => g.remove();
    });
    sc.listen(fly, 'click', () => {
      sfx('firefly', panX(fly), 0.6); badge(fly, 'firefly');
      const r = fly.getBoundingClientRect(), hr = fx.getBoundingClientRect();
      burst(fx, r.left - hr.left + r.width / 2, r.top - hr.top + r.height / 2, 70);
      fly.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.4)', offset: .25 }, { opacity: 0, offset: .85 }, { opacity: 1, transform: 'scale(1)' }], { duration: 5000 });
    });
    sc.listen(star, 'click', () => {
      sfx('night-chime', panX(star), 0.6); badge(star, 'star');
      if (!M().allowed()) { star.animate([{ filter: 'brightness(1)' }, { filter: 'brightness(1.6)' }, { filter: 'brightness(1)' }], { duration: 600 }); return; }
      const s = mk('img', 'hd-burst'); s.alt = ''; s.src = W8 + 'star-s-40.webp'; s.style.width = '16px';
      const r = star.getBoundingClientRect(), hr = fx.getBoundingClientRect();
      s.style.left = (r.left - hr.left + 10) + 'px'; s.style.top = (r.top - hr.top + 10) + 'px'; fx.appendChild(s);
      const dx = Math.min(hr.width * 0.5, 420);
      const a = s.animate([{ transform: 'translate3d(0,0,0) rotate(0deg)', opacity: 1, filter: 'drop-shadow(0 0 0 #fff)' }, { transform: `translate3d(${dx}px, 60px, 0) rotate(240deg)`, opacity: 0, filter: 'drop-shadow(-24px -4px 6px rgba(255,240,190,.8))' }], { duration: 1100, easing: 'cubic-bezier(.3,.1,.3,1)' });
      a.onfinish = () => s.remove();
    });
    if (motion) sc.pauseOffscreen(fs, [n]);
    return { n, place: () => { const obs = obstacles(); [moon, fly, star].forEach(t => placeClear(t, obs)); } };
  }

  // ---------------------------------------------------------------- liquid glass: specular highlight and refraction rim
  function glass(view, sc, motion) {
    const de = document.documentElement;
    if (!document.getElementById('ffg-defs')) {
      const s = mk('div', '', '<svg width="0" height="0" focusable="false" aria-hidden="true" style="position:absolute"><filter id="ffg-refract" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.011 0.017" numOctaves="2" seed="11" result="n"/><feGaussianBlur in="n" stdDeviation="1.6" result="nb"/><feDisplacementMap in="SourceGraphic" in2="nb" scale="26" xChannelSelector="R" yChannelSelector="G"/></filter></svg>');
      s.id = 'ffg-defs'; s.setAttribute('aria-hidden', 'true'); s.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
      document.body.appendChild(s);
    }
    // Chromium renders SVG filters inside backdrop-filter; Safari and Firefox keep the plain frost.
    const refract = !!window.chrome && typeof CSS !== 'undefined' && CSS.supports && CSS.supports('backdrop-filter', 'url(#ffg-refract)') && !(navigator.connection && navigator.connection.saveData);
    de.classList.toggle('ffg-refract', refract);
    sc.add(() => de.classList.remove('ffg-refract'));
    if (!motion || !M().fine()) return;
    view.querySelectorAll('.hc-door, .hc-prooflist, .hc-close .hc-closegrid').forEach(g => {
      let id = 0, x = 0, y = 0;
      const put = () => { id = 0; g.style.setProperty('--gx', x.toFixed(1) + '%'); g.style.setProperty('--gy', y.toFixed(1) + '%'); };
      sc.listen(g, 'pointermove', e => { if (e.pointerType !== 'mouse') return; const r = g.getBoundingClientRect(); x = (e.clientX - r.left) / r.width * 100; y = (e.clientY - r.top) / r.height * 100; if (!id) id = requestAnimationFrame(put); });
      sc.listen(g, 'pointerleave', () => { if (id) cancelAnimationFrame(id); id = 0; g.style.removeProperty('--gx'); g.style.removeProperty('--gy'); });
      sc.add(() => { if (id) cancelAnimationFrame(id); g.style.removeProperty('--gx'); g.style.removeProperty('--gy'); });
    });
  }

  // ---------------------------------------------------------------- living felt cards (the friend tabs)
  // Each tab gets a felt face layer behind its friend and name. On a fine pointer the face tilts toward the pointer in 3D on a
  // spring (at most 8 degrees) with a sheen where the pointer is, and the friend drifts a few pixels the other way (a uniform
  // translate), so the card has depth. Only the face tilts: it holds no character art (the art is never tilted or stretched).
  function feltCards(root, sc, motion) {
    const tabs = Array.from(root.querySelectorAll('.hc-picktab'));
    tabs.forEach(t => {
      let face = t.querySelector(':scope > .hc-picktabface');
      if (!face) { face = mk('span', 'hc-picktabface'); face.setAttribute('aria-hidden', 'true'); t.insertBefore(face, t.firstChild); }
      t.classList.add('has-face');
      sc.add(() => { face.remove(); t.classList.remove('has-face'); });
      if (!motion || !M().fine()) return;
      let rx = 0, ry = 0, vx = 0, vy = 0, tx = 0, ty = 0, id = 0;
      const art = () => t.querySelector(':scope > img:not(.hc-picktabwave)');
      const step = () => {
        id = 0;
        vx += (tx - rx) * 0.16 - vx * 0.32; vy += (ty - ry) * 0.16 - vy * 0.32; rx += vx; ry += vy;
        face.style.transform = `perspective(560px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
        const a = art(); if (a) a.style.translate = `${(-ry * 0.35).toFixed(2)}px ${(rx * 0.3).toFixed(2)}px`;
        if (Math.abs(tx - rx) + Math.abs(ty - ry) + Math.abs(vx) + Math.abs(vy) > 0.02) id = requestAnimationFrame(step);
        else if (!tx && !ty) { face.style.removeProperty('transform'); const a2 = art(); if (a2) a2.style.removeProperty('translate'); }
      };
      const go = () => { if (!id) id = requestAnimationFrame(step); };
      sc.listen(t, 'pointermove', e => {
        if (e.pointerType !== 'mouse') return;
        const r = t.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        ty = (px - 0.5) * 16; tx = (0.5 - py) * 12;
        face.style.setProperty('--sx', (px * 100).toFixed(1) + '%'); face.style.setProperty('--sy', (py * 100).toFixed(1) + '%');
        go();
      });
      sc.listen(t, 'pointerleave', () => { tx = 0; ty = 0; go(); });
      sc.add(() => { if (id) cancelAnimationFrame(id); const a = art(); if (a) a.style.removeProperty('translate'); });
    });
  }

  // ---------------------------------------------------------------- the day part at the middle of the screen
  function dayparts(view, sc) {
    const de = document.documentElement;
    let current = '';
    const set = part => {
      if (!part || part === current) return;
      current = part; de.dataset.daypart = part;
      try { document.dispatchEvent(new CustomEvent('ff:daypart', { detail: { part } })); } catch (e) { /* fire and forget */ }
    };
    set('morning');
    sc.add(() => { delete de.dataset.daypart; });
    const targets = [];
    const hero = view.querySelector('.px-homehero');
    if (hero) { hero.dataset.daypart = 'morning'; hero.dataset.day = 'morning'; targets.push(hero); }
    SCENES.forEach(s => { const e = view.querySelector(s.sel); if (e) targets.push(e); });
    const fs = document.querySelector('.ff-footscene'), foot = document.querySelector('body > footer');
    [fs, foot].forEach(e => { if (e) { e.dataset.daypart = 'night'; targets.push(e); } });
    sc.add(() => [fs, foot].forEach(e => { if (e) delete e.dataset.daypart; }));
    const io = sc.observe(es => es.forEach(e => { if (e.isIntersecting) set(e.target.dataset.daypart); }), { rootMargin: '-50% 0px -50% 0px', threshold: 0 });
    if (io) targets.forEach(t => io.observe(t));
    return { get: () => current, set };
  }

  // ---------------------------------------------------------------- setup per render
  function setup(view, root, ok) {
    if (live) { live.abort(); live = null; }
    const de = document.documentElement;
    de.classList.remove('hd-live');
    if (view !== 'home' || !root || !M()) return;
    const sc = M().scope();
    live = sc;
    const motion = M().allowed(ok);
    sc.add(() => de.classList.remove('hd-live'));
    // tag every section with its time of day (present from the first paint of this render)
    SCENES.forEach(s => { const e = root.querySelector(s.sel); if (e) { e.dataset.day = s.day; e.dataset.daypart = s.part; } });
    const dp = dayparts(root, sc);
    glass(root, sc, motion);
    feltCards(root, sc, motion);

    // lazy world layers: built when each section comes within a screen
    const pending = SCENES.map(s => [root.querySelector(s.sel), s]).filter(([e]) => e);
    const io = sc.observe(es => es.forEach(e => { if (!e.isIntersecting) return; const s = pending.find(([el]) => el === e.target); if (!s) return; io.unobserve(e.target); world(e.target, s[1], motion); }), { rootMargin: '100% 0px 100% 0px', threshold: 0 });
    if (io) pending.forEach(([e]) => io.observe(e)); else pending.forEach(([e, s]) => world(e, s, motion));
    sc.add(() => root.querySelectorAll('.hd-world, .hd-edge, .hd-fx').forEach(x => x.remove()));

    let st = null;
    if (motion) {
      de.classList.add('hd-live');
      st = stage(sc);
      // pause the fixed sky's loops while the hero fills the screen and on a hidden tab
      const hero = root.querySelector('.px-homehero');
      let heroBig = true;
      const pause = () => st.classList.toggle('ffm-paused', heroBig || document.visibilityState === 'hidden');
      const hio = sc.observe(es => es.forEach(e => { heroBig = e.intersectionRatio > 0.6; pause(); }), { threshold: [0, 0.6, 1] });
      if (hio && hero) hio.observe(hero); else heroBig = false;
      sc.listen(document, 'visibilitychange', pause);
      pause();
      // the sky plates load when their sections come near (afternoon, then sunset)
      const near = sc.observe(es => es.forEach(e => { if (!e.isIntersecting) return; near.unobserve(e.target); if (e.target.matches('.hc-friends, .hc-day')) loadPlate(st, 2, 'sky-afternoon'); if (e.target.matches('.hc-proof, .hc-trust')) loadPlate(st, 4, 'sky-sunset'); }), { rootMargin: '150% 0px 150% 0px' });
      if (near) ['.hc-friends', '.hc-day', '.hc-proof', '.hc-trust'].forEach(s => { const e = root.querySelector(s); if (e) near.observe(e); });
      else { loadPlate(st, 2, 'sky-afternoon'); loadPlate(st, 4, 'sky-sunset'); }
      // the scroll-linked tracks: computed from where the sections really are, recomputed when the page changes size
      let T = tracks(anchors(root));
      const native = typeof CSS !== 'undefined' && CSS.supports && CSS.supports('animation-timeline: scroll()');
      let engine = native ? 'css' : null;
      if (native) cssScroll(st, T, sc); else engine = jsScroll(st, () => T, sc);
      st.dataset.engine = engine;
      let tid = 0;
      const refit = () => { clearTimeout(tid); tid = setTimeout(() => { if (sc.aborted) return; T = tracks(anchors(root)); if (native) cssScroll(st, T, sc); }, 120); };
      sc.listen(window, 'resize', refit);
      if (typeof ResizeObserver === 'function') { const ro = new ResizeObserver(refit); ro.observe(root); sc.add(() => ro.disconnect()); }
      sc.add(() => clearTimeout(tid));
      window.FFHomeDay.tracks = () => T;
    }

    // per-section loops pause off screen
    if (motion) SCENES.forEach(s => { const e = root.querySelector(s.sel); if (e) { const fx = () => Array.from(e.querySelectorAll(':scope > .hd-world, :scope > .hd-edge, :scope > .hd-fx')); sc.timer(() => sc.pauseOffscreen(e, fx), 50); } });   // fx, not fx(): a section's layers are built lazily, when it comes near

    // surprises and the night strip (both lazy; placed clear of every tap target)
    let ny = null;
    const fsEl = document.querySelector('.ff-footscene');
    const nio = sc.observe(es => es.forEach(e => { if (!e.isIntersecting || ny) return; nio.unobserve(e.target); ny = night(sc, motion); placeAll(); }), { rootMargin: '150% 0px 150% 0px' });
    if (nio && fsEl) nio.observe(fsEl); else ny = night(sc, motion);
    const T2 = toys(root, sc, motion);
    let pid = 0;
    const placeAll = () => { clearTimeout(pid); pid = setTimeout(() => { if (sc.aborted) return; T2.place(); if (ny) ny.place(); }, 160); };
    // first placement at an idle moment (it reads the layout of every link and paragraph), never in the hero's first frames
    if ('requestIdleCallback' in window) { const rid = requestIdleCallback(() => placeAll(), { timeout: 2500 }); sc.add(() => cancelIdleCallback(rid)); } else sc.timer(placeAll, 800);
    sc.listen(window, 'resize', placeAll);
    sc.listen(window, 'load', placeAll);
    if (typeof ResizeObserver === 'function') { const ro2 = new ResizeObserver(placeAll); ro2.observe(root); sc.add(() => ro2.disconnect()); }
    sc.add(() => clearTimeout(pid));
    window.FFHomeDay.daypart = () => dp.get();
  }

  window.FFhooks = window.FFhooks || [];
  window.FFhooks.push(setup);
  window.FFHomeDay = { setup, SCENES, TOTAL, STORE, LABELS, tracks: null, daypart: null, found: () => [...found.load()], obstacles, sunTarget, badge };
})();
