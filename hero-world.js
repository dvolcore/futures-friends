/* Futures Friends: the Home hero as a big 3D world (wave 7, owner 2026-10-06: "the animations need to go through as well on the phone
   ... the title ... needs to be able to come in the clouds ... much more effective animation, feel way more three-dimensional and big
   world"). Markup: meadow-hero.js (depth planes); 3D rules and loops: hero-world.css. Built on ff-motion.js (FFMotion).

   The opening (first Home render of a page load, motion allowed, hero at the top of the screen), about 4.5 s, skippable by any input
   (times from the camera's first move, which waits at most 600 ms for the cloud bank to decode, under a white haze):
       0 ms  the camera is up in the sky, inside a bank of felt clouds (white haze + out-of-focus clouds right in front of the lens);
             it pushes slowly through them for about 0.6 s
     600     the clouds part and rush out past the lens (they grow 2.7x, fly outward and fade by about 1.7 s); the haze is gone by 1.15 s
       0     the camera cranes down out of the sky (3 s, slow start under the clouds, long settle): the far hills rise slowly, the meadow
             and grass fast, the sun barely; every plane moves at its own depth's rate (one Web Animation on the rig, the browser's 3D
             does the parallax; the cast's row rides the same curve as its plane, z 0)
     450     the plush logo flies in from deep in the sky, small and soft-focus, out through the cloud bank (clouds in front of it,
             the sky's clouds behind it), grows past full size, lands on its cloud nest with a fluffy squash and a wobble (about
             2.2 s), then hangs there and floats; its nest puffs pop in under it as it lands
     900     the cream card rises into place as the clouds clear (1250 on phones, where the bigger bank takes longer to part)
    2000     the cast's entrance starts (hero-motion.js: Bop walks in, Lumi hops, Zuri springs up, Booker last to center stage), on
             the meadow that has just arrived; the whole hero is composed at about 4.5 s
   Any pointer press, key, wheel, touch or scroll during the opening or the entrance fast-forwards both to the composed scene in
   about a quarter of a second (FFHeroMotion.skip()).

   Afterwards, continuous life (every device, phones included; only reduced motion or the site's motion switch stop it):
     - the camera drifts by itself (a CSS loop on every plane, by its depth's share) and answers the pointer (desktop), the phone's
       tilt (Android at once; iOS after a tap on the open sky asks the system, never blocking), and scroll (the far planes lag behind
       as the hero leaves); a spring eases every change; one rAF at most, only while something is still moving, never off screen or
       on a hidden tab
     - clouds cross the sky at their depth's speed and wrap round; the sun rocks and its rays turn; the logo floats in its nest
     - felt petals, pollen and sparkles drift at three depths (count capped by the device: 20 desktop, 12 phone, 6 on low-power or
       data-saver devices)
     - a breeze: the pointer or a finger pushes nearby clouds and petals a little; they spring back
   Everything pauses off screen and on a hidden tab (.ffm-paused on the hero, watched on the hero itself).
   With reduced motion or the motion switch off: nothing here runs, no particle or cloud bank is made, the composed world is still.
   Transforms and opacity only (plus a short blur on the logo's flight). Nothing is sent or stored.

   Wave 8 (owner 2026-10-06: "break those letters up so that they can fly in and also be living, moving around a little bit; give it
   more dynamic layers"). The opening now (times from the camera's first move):
       0 ms  whoosh; the camera is in the cloud bank; 560 cloud-puff as it parts
     250     the badge (the logo without its letters) flies in from deep in the sky as before, lands on its nest (logo-land) at ~1.2 s
     750     FUTURES: each letter flies in on its own arc from far behind the sky (small, soft, spinning a little), one every 85 ms, and
             lands in its slot with a felt squash, a stitch-tight shiver and a puff of fluff (letter-pop, panned to where it lands)
    1400     FRIENDS: each letter swoops in from in front of the camera (big and soft) and settles the same way, one every 75 ms
    2500     the heart pops last, with a little felt sparkle burst (sparkle)
    2000     the cast's entrance starts (hero-motion.js) while FRIENDS lands (Bop walks in under the title); composed at about 4.5 s, as
             in wave 7 (the sound lane's one-time hint looks for a clear spot at 3.2 s); any input skips as before
   Afterwards every letter breathes on its own phase (1 to 3 px, about 1.5 degrees), a wave runs through the words every 8 s (CSS,
   hero-world.css), the letters lean toward the pointer or a finger and spring back, and a tap on a letter boings it (squish).
   More depth: light shafts from the sun, far felt mountains, haze between the far planes (meadow-hero.js), and, made here with motion
   on only, two felt birds crossing the sky (z -420), a butterfly over the meadow and out-of-focus bokeh in front of the cast.
   The card is liquid glass (meadow-hero.css): its specular light follows the camera (pointer, tilt) here.
   Sounds: fire-and-forget ff:sfx events (the SOUND lane plays them; nothing happens without a listener or before the visitor turns
   sound on). Reduced motion: the assembled logo and the still world; a tap on a letter only sends its squish sound. */
(function () {
  'use strict';
  const LEAD = 2000;     // ms the cast waits for the camera and the title (hero-motion.js reads FFHeroWorld.opening().lead)
  const CRANE = 3000;    // the camera's descent
  const LOGO_AT = 250, LOGO_MS = 1300;   // the badge's flight (it lands at 72%: ~1.2 s)
  // the letters: FUTURES from far behind the sky, FRIENDS from in front of the camera, then the heart
  const ROW = [{ at: 750, step: 85, ms: 920 }, { at: 1400, step: 75, ms: 860 }, { at: 2500, step: 0, ms: 760 }];
  const LAND = .7;       // share of a letter's flight at which it touches down
  // Where each letter starts, in badge widths from its slot: [dx, dy, scale, spin deg]
  const FROM = {
    F1: [-1.25, -.75, .22, -38], U1: [-.55, -1.15, .2, 26], T: [-.05, -1.45, .18, -18], U2: [.25, -1.3, .2, 30], R1: [.6, -1.2, .22, -24],
    E1: [1.05, -.95, .2, 34], S1: [1.4, -.6, .22, -30],
    F2: [-.95, .95, 2.3, 22], R2: [-.6, 1.15, 2.5, -16], I: [-.25, 1.25, 2.2, 12], E2: [.05, 1.3, 2.6, -10], N: [.35, 1.2, 2.3, 14],
    D: [.7, 1.1, 2.5, -18], S2: [1.0, .9, 2.3, 20], heart: [0, 0, .2, 0]
  };
  const sfx = (name, x, gain) => {
    try {
      const detail = { name };
      if (typeof x === 'number' && isFinite(x)) detail.x = Math.max(-1, Math.min(1, Math.round(x * 100) / 100));
      if (typeof gain === 'number') detail.gain = gain;
      document.dispatchEvent(new CustomEvent('ff:sfx', { detail }));
    } catch (e) { /* sound is a bonus */ }
  };
  const pan = el => { const r = el.getBoundingClientRect(); return ((r.left + r.width / 2) / (innerWidth || 1)) * 2 - 1; };
  const SPEED_MS = 260;  // a skip finishes everything in about this long
  const WAIT = 600;      // the longest the opening waits for its cloud bank to decode
  let played = false, live = null, state = null;
  const M = () => window.FFMotion;
  const mm = q => (typeof matchMedia === 'function' ? matchMedia(q).matches : false);

  // ---- particles: how many this device gets, and where (deterministic, so every visit looks composed)
  function budget() {
    const nav = typeof navigator !== 'undefined' ? navigator : {};
    const saver = !!(nav.connection && nav.connection.saveData) || mm('(prefers-reduced-data: reduce)');
    const low = saver || ((nav.hardwareConcurrency || 8) <= 4 && (nav.deviceMemory || 8) <= 2);
    return low ? 6 : mm('(max-width: 640px)') ? 12 : 20;
  }
  function particles(n) {
    let seed = 7;
    const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const out = [];
    for (let i = 0; i < n; i++) {
      const k = i % 5; // 0,1 petals near; 2 pollen mid; 3 spark mid; 4 petal in the air in front of everything (only every other one)
      const kind = k === 2 ? 'pollen' : k === 3 ? 'spark' : ['daisy', 'pink', 'daisy-s'][Math.floor(r() * 3)];
      const where = k === 2 || k === 3 ? 'mid' : k === 4 && i % 10 === 4 ? 'air' : 'near';
      const s = kind === 'pollen' ? 7 + r() * 7 : kind === 'spark' ? 9 + r() * 6 : where === 'air' ? 24 + r() * 10 : 13 + r() * 9;
      const d = kind === 'spark' ? 14 + r() * 8 : kind === 'pollen' ? 22 + r() * 14 : 16 + r() * 12;
      out.push({
        kind, where, s: Math.round(s),
        x: (r() * 100).toFixed(1) + '%', y: (kind === 'pollen' || kind === 'spark' ? 18 + r() * 52 : 40 + r() * 46).toFixed(1) + '%',
        d: d.toFixed(1) + 's', dl: (-r() * d).toFixed(1) + 's', sw: (2.6 + r() * 2.4).toFixed(1) + 's',
        dx: (kind === 'spark' ? (r() - .5) * 6 : kind === 'pollen' ? (r() - .5) * 18 : 22 + r() * 30).toFixed(1) + 'vw',
        dy: (kind === 'spark' ? -4 - r() * 6 : kind === 'pollen' ? -18 - r() * 16 : -14 + r() * 26).toFixed(1) + 'vh',
        o: (kind === 'pollen' ? .75 : kind === 'spark' ? .95 : .92).toFixed(2)
      });
    }
    return out;
  }
  function addParticles(hero, sc) {
    const doc = hero.ownerDocument, made = [];
    const host = {
      mid: hero.querySelector('.mh-world .mh-p-mid'),
      near: hero.querySelector('.mh-world .mh-p-near'),
      air: (() => { const d = hero.querySelector('.mh-nearworld .mh-dolly'); if (!d) return null; const p = doc.createElement('span'); p.className = 'mh-plane mh-p-air'; p.dataset.depth = 'air'; p.style.setProperty('--z', '120'); d.appendChild(p); made.push(p); return p; })()
    };
    particles(budget()).forEach(p => {
      const el = host[p.where];
      if (!el) return;
      const s = doc.createElement('span');
      s.className = 'mh-pt';
      s.dataset.kind = p.kind;
      s.setAttribute('aria-hidden', 'true');
      for (const [k, v] of Object.entries({ x: p.x, y: p.y, s: p.s + 'px', d: p.d, dl: p.dl, sw: p.sw, dx: p.dx, dy: p.dy, o: p.o })) s.style.setProperty('--' + k, v);
      s.innerHTML = '<i><b></b></i>';
      el.appendChild(s);
      made.push(s);
    });
    sc.add(() => made.forEach(x => x.remove()));
    return made.filter(x => x.classList.contains('mh-pt'));
  }

  // ---- wave 8: felt birds crossing the sky (behind the treehouse, in front of the hills), a butterfly over the meadow and soft bokeh
  // in front of everything. Motion only; deterministic places; counts by device (phones: one bird fewer, fewer bokeh).
  const W8 = 'img/plush/world8/';
  function fauna(hero, sc) {
    const doc = hero.ownerDocument, made = [], small = mm('(max-width: 640px)'), low = budget() <= 6;
    const dolly = hero.querySelector('.mh-world .mh-dolly'), near = hero.querySelector('.mh-nearworld .mh-dolly');
    const plane = (host, k, z) => { const p = doc.createElement('span'); p.className = 'mh-plane mh-p-' + k; p.dataset.depth = k; p.style.setProperty('--z', String(z)); host.appendChild(p); made.push(p); return p; };
    const img = (src, w, h) => `<img src="${src}" width="${w}" height="${h}" alt="" decoding="async" draggable="false">`;
    if (dolly) {
      // the birds' plane sits between the hills (-650) and the mid clouds (-380), before the treehouse in the markup's order
      const p = plane(dolly, 'birds', -420);
      const mid = dolly.querySelector('.mh-p-mid'); if (mid) dolly.insertBefore(p, mid);
      // [top %, size px, seconds to cross, start offset s, arc s, flap s]
      const BIRDS = small ? [[16, 34, 26, -4, 3.2, .5]] : [[14, 44, 30, -6, 3.4, .52], [24, 30, 38, -24, 2.9, .44]];
      BIRDS.forEach(([y, w, d, dl, a, f]) => {
        const b = doc.createElement('span');
        b.className = 'mh-bird';
        b.setAttribute('aria-hidden', 'true');
        [['by', y + '%'], ['bs', w + 'px'], ['bd', d + 's'], ['bdl', dl + 's'], ['ba', a + 's'], ['bf', f + 's']].forEach(([k, v]) => b.style.setProperty('--' + k, v));
        const s2 = 128, h2 = 126; // 128 px frames: sharp at 2x for the 44 px bird, 3x for the 34 px one
        b.innerHTML = '<i>' + ['up', 'mid', 'down'].map(n => img(`${W8}bird-${n}-${s2}.webp`, s2, h2)).join('') + '</i>';
        p.appendChild(b);
      });
    }
    if (near) {
      if (!low) {
        const p = plane(near, 'flutter', 90);
        const f = doc.createElement('span');
        f.className = 'mh-fly';
        f.setAttribute('aria-hidden', 'true');
        [['fy', small ? '58%' : '64%'], ['fs', small ? '26px' : '34px'], ['fd', small ? '30s' : '40s'], ['fdl', '-9s']].forEach(([k, v]) => f.style.setProperty('--' + k, v));
        f.innerHTML = '<i>' + img(`${W8}butterfly-open-96.webp`, 96, 77) + img(`${W8}butterfly-closed-96.webp`, 96, 77) + '</i>';
        p.appendChild(f);
        const k = plane(near, 'bokeh', 420);
        // [x %, y %, size px, kind, seconds, delay]: at the sides (phones: only these, above the cast's names), one small warm glint under the
        // sun, and on desktop low in the corners (the closest things to the lens); never over the card's text or a friend's name
        const BOKEH = [[2, 44, 86, 'cool', 16, -9], [96, 66, 110, 'cool', 14, -8], [72, 15, 44, 'warm', 13, -2], [3, 82, 170, 'warm', 17, -3], [5, 100, 110, 'cool', 19, -11], [93, 97, 190, 'warm', 15, -5]];
        BOKEH.slice(0, small ? 3 : 6).forEach(([x, y, z, kind, d, dl]) => {
          const b = doc.createElement('span');
          b.className = 'mh-bokeh';
          b.dataset.k = kind;
          b.setAttribute('aria-hidden', 'true');
          [['kx', x + '%'], ['ky', y + '%'], ['ks', Math.round(z * (small ? .7 : 1)) + 'px'], ['kd', d + 's'], ['kdl', dl + 's']].forEach(([kk, v]) => b.style.setProperty('--' + kk, v));
          k.appendChild(b);
        });
      }
    }
    sc.add(() => made.forEach(x => x.remove()));
    return made;
  }

  // ---- wave 8: light shafts from the sun, drawn once on a small canvas (480 x 300, scaled up: they are soft anyway). Each shaft is
  // three nested wedges that fade with distance from the sun, so the edges are soft without a blur filter. A canvas, not an image:
  // nothing to download and never a Largest Contentful Paint candidate.
  // [angle deg (90 = straight down, 180 = left), half width deg, strength]
  const SHAFTS = [[100, 3.5, .8], [108, 2.2, .55], [116, 5, .9], [127, 2.8, .6], [134, 4.2, .75], [146, 2.5, .5], [153, 6, .85], [165, 3, .55], [172, 4.5, .7], [182, 2.6, .45], [122, 1.4, .5], [160, 1.6, .45]];
  function shafts(hero, sc) {
    const host = hero.querySelector('.mh-world .mh-p-rays');
    if (!host) return null;
    const c = hero.ownerDocument.createElement('canvas');
    const g = c.getContext && c.getContext('2d');
    if (!g) return null;
    const W = 480, H = 300, ox = W * .84, oy = H * .07, R = W * 1.05;
    c.width = W; c.height = H;
    c.className = 'mh-shafts';
    c.setAttribute('aria-hidden', 'true');
    // drawn on a scratch canvas, then copied through a small blur where the browser has canvas filters (soft beams, like light in air)
    const s = hero.ownerDocument.createElement('canvas');
    s.width = W; s.height = H;
    const d = s.getContext('2d');
    d.globalCompositeOperation = 'lighter';
    SHAFTS.forEach(([a, w, k]) => {
      [[1, .13], [.55, .2], [.25, .26]].forEach(([f, al]) => {
        const grd = d.createRadialGradient(ox, oy, 6, ox, oy, R);
        grd.addColorStop(0, `rgba(255,246,212,${(al * k).toFixed(3)})`);
        grd.addColorStop(.5, `rgba(255,246,212,${(al * k * .6).toFixed(3)})`);
        grd.addColorStop(1, 'rgba(255,246,212,0)');
        const a1 = (a - w * f * 2) * Math.PI / 180, a2 = (a + w * f * 2) * Math.PI / 180;
        d.fillStyle = grd;
        d.beginPath(); d.moveTo(ox, oy);
        d.lineTo(ox + Math.cos(a1) * R, oy + Math.sin(a1) * R); d.lineTo(ox + Math.cos(a2) * R, oy + Math.sin(a2) * R);
        d.closePath(); d.fill();
      });
    });
    if ('filter' in g) g.filter = 'blur(2.5px)';
    g.drawImage(s, 0, 0);
    host.appendChild(c);
    sc.add(() => c.remove());
    return c;
  }

  // ---- wave 8: the glass card's specular light (follows the camera) and, where the browser can bend a backdrop with an SVG filter
  // (Chromium), a lens at the card's edges. Safari and Firefox keep the plain frosted glass.
  function glass(hero, sc) {
    const card = hero.querySelector('.mh-card');
    if (!card || typeof CSS === 'undefined' || !CSS.supports || !(CSS.supports('backdrop-filter', 'blur(1px)') || CSS.supports('-webkit-backdrop-filter', 'blur(1px)'))) return null;
    const doc = hero.ownerDocument;
    const spec = doc.createElement('span');
    spec.className = 'mh-spec';
    spec.setAttribute('aria-hidden', 'true');
    card.insertBefore(spec, card.firstChild);
    let svg = null;
    const chromium = !!(navigator.userAgentData && navigator.userAgentData.brands && navigator.userAgentData.brands.some(b => /Chromium/.test(b.brand)));
    if (chromium && !hero.classList.contains('mh-lite') && CSS.supports('backdrop-filter', 'url(#mh-lens) blur(1px)') && !mm('(prefers-reduced-transparency: reduce)')) {
      // the lens: a displacement map that is flat in the middle and ramps at the edges (red: left/right, green: top/bottom), so the
      // backdrop is pulled in at the rim like light through the edge of a thick pane
      const ramp = (dir, c) => `<linearGradient id="g${dir}" x1="0" y1="0" x2="${dir === 'x' ? 1 : 0}" y2="${dir === 'y' ? 1 : 0}"><stop offset="0" stop-color="${c[0]}"/><stop offset=".14" stop-color="${c[1]}"/><stop offset=".86" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[2]}"/></linearGradient>`;
      const map = enc => 'data:image/svg+xml,' + encodeURIComponent(enc);
      const mx = map(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" preserveAspectRatio="none"><defs>${ramp('x', ['#000', '#800000', '#f00'])}</defs><rect width="100" height="100" fill="url(#gx)"/></svg>`);
      const my = map(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" preserveAspectRatio="none"><defs>${ramp('y', ['#000', '#008000', '#0f0'])}</defs><rect width="100" height="100" fill="url(#gy)"/></svg>`);
      svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
      svg.style.position = 'absolute';
      svg.innerHTML = `<filter id="mh-lens" x="0" y="0" width="1" height="1" primitiveUnits="objectBoundingBox" color-interpolation-filters="sRGB">
        <feImage href="${mx}" x="0" y="0" width="1" height="1" preserveAspectRatio="none" result="mx"/>
        <feImage href="${my}" x="0" y="0" width="1" height="1" preserveAspectRatio="none" result="my"/>
        <feComposite in="mx" in2="my" operator="arithmetic" k2="1" k3="1" result="m"/>
        <feDisplacementMap in="SourceGraphic" in2="m" scale=".05" xChannelSelector="R" yChannelSelector="G"/></filter>`;
      hero.appendChild(svg);
      hero.classList.add('mh-refract');
    }
    sc.add(() => { spec.remove(); if (svg) svg.remove(); hero.classList.remove('mh-refract'); });
    // the light sits up and to the left at rest and slides the other way from the camera (pointer right: the light moves left)
    return (x, y) => { spec.style.translate = `${(-18 - x * 20).toFixed(1)}% ${(-y * 12).toFixed(1)}%`; };
  }

  // ---- wave 8: the living letters after the opening: they lean toward the pointer or a finger (a spring per letter, one rAF while
  // anything moves) and boing when tapped (squish). Locked while the opening plays.
  function living(hero, sc, vis) {
    const ls = Array.from(hero.querySelectorAll('.mh-l'));
    if (!ls.length) return null;
    const st = ls.map(el => ({ el, f: el.querySelector('.mh-lf'), a: el.querySelector('.mh-la'), cx: 0, cy: 0, x: 0, y: 0, r: 0, vx: 0, vy: 0, vr: 0, tx: 0, ty: 0, tr: 0 }));
    let id = 0, last = 0, at = 0, locked = true;
    const R = M().fine() ? 280 : 190;
    const cl = (v, m) => Math.max(-m, Math.min(m, v));
    const measure = () => { st.forEach(s => { const r = s.el.getBoundingClientRect(); s.cx = r.left + r.width / 2; s.cy = r.top + r.height / 2; }); at = Date.now(); };
    const step = now => {
      id = 0;
      if (!vis.seen || document.visibilityState === 'hidden') { last = 0; return; }
      const dt = Math.min(.05, last ? (now - last) / 1000 : 1 / 60);
      last = now;
      let moving = false;
      st.forEach(s => {
        for (const k of ['x', 'y', 'r']) {
          const v = 'v' + k, t = 't' + k;
          // a lively spring (stiffness 170, damping 13): a felt letter that wobbles once and settles
          s[v] += ((s[t] - s[k]) * 170 - s[v] * 13) * dt;
          s[k] += s[v] * dt;
          if (Math.abs(s[t] - s[k]) > .02 || Math.abs(s[v]) > .02) moving = true;
        }
        const rest = Math.abs(s.x) < .02 && Math.abs(s.y) < .02 && Math.abs(s.r) < .02;
        s.f.style.transform = rest ? '' : `translate(${s.x.toFixed(2)}px, ${s.y.toFixed(2)}px) rotate(${s.r.toFixed(2)}deg)`;
      });
      if (moving && vis.seen && document.visibilityState !== 'hidden') id = requestAnimationFrame(step); else last = 0;
    };
    const kick = () => { if (!id && vis.seen && document.visibilityState !== 'hidden') id = requestAnimationFrame(step); };
    const aim = (x, y) => {
      if (locked || !vis.seen) return;
      if (Date.now() - at > 600) measure();
      st.forEach(s => {
        const dx = x - s.cx, dy = y - s.cy, d = Math.hypot(dx, dy) || 1, f = d > R ? 0 : (1 - d / R) ** 2;
        s.tx = cl(dx / d * 4 * f, 4); s.ty = cl(dy / d * 3 * f, 3); s.tr = cl(dx / R * 7 * f, 4.5);
      });
      kick();
    };
    const release = () => { st.forEach(s => { s.tx = s.ty = s.tr = 0; }); kick(); };
    const on = e => { const t = e.touches ? e.touches[0] : e; if (t) aim(t.clientX, t.clientY); };
    sc.listen(hero, 'pointermove', on, { passive: true });
    sc.listen(hero, 'touchmove', on, { passive: true });
    sc.listen(hero, 'pointerleave', release);
    sc.listen(hero, 'touchend', release, { passive: true });
    sc.listen(window, 'scroll', () => { at = 0; }, { passive: true });
    sc.listen(window, 'resize', () => { at = 0; });
    sc.add(() => { if (id) cancelAnimationFrame(id); st.forEach(s => { s.f.style.transform = ''; }); });
    // a tap or click on a letter: it boings (squash and stretch on the felt, from its base) and squishes
    const BOING = [{ scale: '1 1' }, { scale: '1.22 .8', offset: .16 }, { scale: '.86 1.16', offset: .4 }, { scale: '1.07 .95', offset: .62 }, { scale: '.98 1.02', offset: .82 }, { scale: '1 1' }];
    const host = hero.querySelector('.mh-letters');
    if (host) sc.listen(host, 'pointerdown', e => {
      const l = e.target.closest && e.target.closest('.mh-l');
      if (!l || locked) return;
      const s = st.find(x => x.el === l);
      sc.anim(s.a, BOING, { duration: 560, easing: 'cubic-bezier(.3,.7,.4,1)', composite: 'replace' });
      sfx('squish', pan(l));
    });
    return { unlock() { locked = false; at = 0; }, get locked() { return locked; }, measure };
  }

  // ---- the camera: pointer, tilt and scroll, eased by one spring. The camera slides around the cast's plane (z 0): each plane moves by
  // its depth's share k = -z / (P - z) of the camera's move (written into the plane's own transform, inside its depth and scale so
  // the perspective gives back exactly k on screen), so nothing
  // is ever tilted out of shape and the friends never slide.
  function camera(hero, sc, vis, light) {
    const planes = Array.from(hero.querySelectorAll('.mh-plane')).filter(p => p.dataset.depth !== 'veil');
    if (!planes.length) return null;
    const fine = M().fine();
    const T = { x: 0, y: 0 }, P = { x: 0, y: 0 }, V = { x: 0, y: 0 };
    let tilt = { x: 0, y: 0 }, scroll = 0, id = 0, last = 0, box = null, persp = 0, list = [];
    const depth = () => {
      persp = parseFloat(getComputedStyle(hero).getPropertyValue('--mh-p')) || 1000;
      list = planes.filter(p => p.isConnected).map(p => { const z = parseFloat(p.style.getPropertyValue('--z')) || 0; return { p, z, k: -z / (persp - z), s: 1 - z / persp }; });
    };
    depth();
    const write = () => {
      const cx = P.x, cy = P.y + scroll * 150;
      const rest = Math.abs(cx) < .05 && Math.abs(cy) < .05;
      list.forEach(({ p, z, k, s }) => { p.style.transform = rest ? '' : `translateZ(${z}px) scale(${s.toFixed(4)}) translate3d(${(k * cx).toFixed(2)}px, ${(k * cy).toFixed(2)}px, 0)`; });
      if (light) light(P.x / 72, P.y / 38);
    };
    const step = now => {
      id = 0;
      // a frame that was already queued when the tab went hidden or the hero left the screen does nothing (wave 8)
      if (!vis.seen || document.visibilityState === 'hidden') { last = 0; return; }
      const dt = Math.min(.05, last ? (now - last) / 1000 : 1 / 60);
      last = now;
      // the hero's scroll position (read once per frame; only transforms are written, so nothing is laid out again)
      const r = hero.getBoundingClientRect();
      scroll = Math.max(0, Math.min(1, -r.top / (r.height || 1)));
      let moving = false;
      for (const k of ['x', 'y']) {
        const goal = T[k] + tilt[k];
        // a soft spring (stiffness 38, damping 11): glides and settles with the smallest overshoot
        V[k] += ((goal - P[k]) * 38 - V[k] * 11) * dt;
        P[k] += V[k] * dt;
        if (Math.abs(goal - P[k]) > .05 || Math.abs(V[k]) > .05) moving = true;
      }
      write();
      if (moving && vis.seen && document.visibilityState !== 'hidden') id = raf(step); else last = 0;
    };
    const raf = f => requestAnimationFrame(f);
    const kick = () => { if (!id && vis.seen && document.visibilityState !== 'hidden') id = raf(step); };
    sc.add(() => { if (id) cancelAnimationFrame(id); planes.forEach(p => { p.style.transform = ''; }); });
    sc.listen(window, 'resize', () => { depth(); kick(); });
    if (fine) {
      // the camera follows the pointer the other way (look right: the far hills slide left behind the friends)
      sc.listen(hero, 'pointerenter', () => { box = hero.getBoundingClientRect(); });
      sc.listen(hero, 'pointermove', e => {
        if (e.pointerType !== 'mouse' || !vis.seen) return;
        if (!box) box = hero.getBoundingClientRect();
        const px = Math.max(-1, Math.min(1, (e.clientX - box.left) / box.width * 2 - 1)), py = Math.max(-1, Math.min(1, (e.clientY - box.top) / box.height * 2 - 1));
        T.x = -px * 72; T.y = -py * 38;
        kick();
      });
      sc.listen(hero, 'pointerleave', () => { T.x = 0; T.y = 0; box = null; kick(); });
    } else {
      // phones and tablets: the device's tilt moves the camera (a slowly re-centring baseline, so any way of holding it is "level")
      let base = null;
      const onTilt = e => {
        if (e.gamma == null || e.beta == null || !vis.seen) return;
        if (!base) base = { g: e.gamma, b: e.beta };
        base.g += (e.gamma - base.g) * .01; base.b += (e.beta - base.b) * .01;
        tilt = { x: Math.max(-1, Math.min(1, (e.gamma - base.g) / 20)) * -80, y: Math.max(-1, Math.min(1, (e.beta - base.b) / 20)) * -44 };
        kick();
      };
      const DOE = typeof DeviceOrientationEvent !== 'undefined' ? DeviceOrientationEvent : null;
      if (DOE && typeof DOE.requestPermission === 'function') {
        // iOS asks once, on a tap on the open sky or meadow (never on a button or link), and only if the visitor taps there
        let asked = false;
        sc.listen(hero, 'click', e => {
          if (asked || (e.target.closest && e.target.closest('a,button,[role=button],input,select,textarea'))) return;
          asked = true;
          DOE.requestPermission().then(s => { if (s === 'granted') sc.listen(window, 'deviceorientation', onTilt); }).catch(() => {});
        });
      } else if (DOE) sc.listen(window, 'deviceorientation', onTilt);
    }
    sc.listen(window, 'scroll', kick, { passive: true });
    sc.listen(document, 'visibilitychange', kick);
    return { kick, get pose() { return { x: P.x, y: P.y, scroll }; }, get running() { return !!id; } };
  }

  // ---- the breeze: the pointer or a finger pushes nearby clouds and petals away a little; CSS springs them back
  function breeze(hero, sc, vis, extra) {
    const els = Array.from(hero.querySelectorAll('.mh-bz')).concat(extra || []);
    if (!els.length) return;
    let pts = null, at = 0, id = 0, ev = null, lx = null, ly = null, rest = 0;
    const pushed = new Set();
    const R = M().fine() ? 210 : 150;
    const measure = () => { pts = els.map(e => { const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }); at = Date.now(); };
    const frame = () => {
      id = 0;
      if (!ev || !vis.seen) return;
      const { x, y } = ev;
      if (!pts || Date.now() - at > 700) measure();
      const vx = lx == null ? 0 : x - lx, vy = ly == null ? 0 : y - ly;
      lx = x; ly = y;
      els.forEach((e, i) => {
        const dx = pts[i][0] - x, dy = pts[i][1] - y, d = Math.hypot(dx, dy);
        if (d > R) return;
        const f = (1 - d / R) ** 2, n = d || 1;
        const ox = Math.max(-60, Math.min(60, dx / n * 44 * f + vx * .5 * f)), oy = Math.max(-40, Math.min(40, dy / n * 30 * f + vy * .3 * f));
        e.style.transform = `translate(${ox.toFixed(1)}px, ${oy.toFixed(1)}px)`;
        pushed.add(e);
      });
      clearTimeout(rest);
      rest = setTimeout(() => { pushed.forEach(e => { e.style.transform = ''; }); pushed.clear(); lx = ly = null; }, 140);
    };
    const on = e => { const t = e.touches ? e.touches[0] : e; if (!t) return; ev = { x: t.clientX, y: t.clientY }; if (!id) id = requestAnimationFrame(frame); };
    sc.listen(hero, 'pointermove', on, { passive: true });
    sc.listen(hero, 'touchmove', on, { passive: true });
    sc.listen(hero, 'pointerleave', () => { pts = null; });
    sc.add(() => { if (id) cancelAnimationFrame(id); clearTimeout(rest); pushed.forEach(e => { e.style.transform = ''; }); });
  }

  // ---- the opening: built paused before the first paint, decided in the first frame
  function buildOpening(hero, sc) {
    const doc = hero.ownerDocument;
    const rigs = Array.from(hero.querySelectorAll('.mh-dolly'));
    const row = hero.querySelector('.mh-castrow'), logo = hero.querySelector('.mh-logo-img'), card = hero.querySelector('.mh-card');
    const puffs = Array.from(hero.querySelectorAll('.mh-puff'));
    const nearCam = hero.querySelector('.mh-nearworld .mh-cam');
    if (!rigs.length || !logo || !nearCam) return null;
    const H = hero.offsetHeight || 700, small = mm('(max-width: 640px)');
    // the camera starts this far up (less on phones, where the hills must stay the largest thing painted first: the LCP)
    const dy = Math.round(H * (small ? .62 : .8));
    const anims = [];
    const held = (el, frames, o) => { const a = sc.anim(el, frames, Object.assign({ fill: 'backwards' }, o)); if (a) { a.pause(); anims.push(a); } return a; };
    const CRANE_EASE = 'cubic-bezier(.5,0,.16,1)';
    // the rig: the camera comes down out of the sky (and pitches level as it lands)
    rigs.forEach(r => held(r, [{ transform: `translate3d(0, ${dy}px, 0) rotateX(4deg)` }, { transform: 'translate3d(0, 0, 0) rotateX(0deg)' }], { duration: CRANE, easing: CRANE_EASE }));
    // the cast's ground (the plane the camera turns around, z 0) comes up with the meadow, on the same curve
    if (row) held(row, [{ transform: `translateY(${dy}px)` }, { transform: 'translateY(0px)' }], { duration: CRANE, easing: CRANE_EASE });
    // the cloud bank right in front of the lens: a white haze and big out-of-focus clouds that part and rush past
    const veil = doc.createElement('span');
    veil.className = 'mh-plane mh-p-veil';
    veil.dataset.depth = 'veil';
    veil.style.setProperty('--z', '300');
    const haze = doc.createElement('span');
    haze.className = 'mh-veilsky';
    veil.appendChild(haze);
    // [file, x %, y %, width vw (phones: x1.55), outward direction x, y]
    const BANK = [[1, 22, 30, 62, -1, -.5], [2, 78, 26, 58, 1, -.6], [2, 30, 72, 66, -1, .7], [1, 74, 74, 70, 1, .6], [1, 50, 44, 74, .1, -1], [2, 50, 86, 64, -.1, 1], [1, 6, 58, 50, -1, .1], [2, 96, 52, 50, 1, -.1]];
    const clouds = BANK.map(([n, x, y, w, ox, oy], i) => {
      const im = doc.createElement('img');
      im.className = 'mh-veil';
      im.src = `img/plush/hero/cloud-veil-${n}.webp`;
      im.alt = '';
      im.decoding = 'async';
      im.setAttribute('draggable', 'false');
      im.style.setProperty('--vx', x + '%'); im.style.setProperty('--vy', y + '%'); im.style.setProperty('--vw', (small ? w * 1.55 : w) + 'vw');
      veil.appendChild(im);
      const far = 70 + (i % 3) * 18;
      // a slow push through the bank first (the camera is inside the cloud), then the clouds rush out past the lens
      held(im, [
        { transform: 'translate(0, 0) scale(1)', opacity: 1, easing: 'cubic-bezier(.45,0,.55,1)' },
        { transform: `translate(${ox * far * .06}vw, ${oy * far * .05}vh) scale(1.14)`, opacity: 1, offset: .38, easing: 'cubic-bezier(.4,0,.8,.5)' },
        { transform: `translate(${ox * far}vw, ${oy * far * .7}vh) scale(2.7)`, opacity: 0 }
      ], { duration: 1600 + (i % 4) * 110, delay: (i % 4) * 50, easing: 'linear', fill: 'both' });
      return im;
    });
    held(haze, [{ opacity: 1 }, { opacity: .82, offset: .45 }, { opacity: 0 }], { duration: 1150, easing: 'cubic-bezier(.3,0,.4,1)', fill: 'both' });
    nearCam.appendChild(veil); // in front of the lens: it does not come down with the world
    // the plush logo: from deep in the sky, small and out of focus, out through the clouds; grows past full size, lands on its nest
    // with a fluffy squash, wobbles, and settles (the logo is the brand mark, not character art: it may squash like a cushion)
    logo.style.transformOrigin = '50% 92%';
    held(logo, [
      { transform: 'translateY(64px) scale(.14) rotate(-9deg)', filter: 'blur(6px)', opacity: 0 },
      { transform: 'translateY(52px) scale(.2) rotate(-7deg)', filter: 'blur(5px)', opacity: 1, offset: .1 },
      { transform: 'translateY(6px) scale(.72) rotate(4deg)', filter: 'blur(1.4px)', opacity: 1, offset: .5 },
      { transform: 'translateY(-16px) scale(1.08) rotate(-2deg)', filter: 'blur(0px)', opacity: 1, offset: .72 },
      { transform: 'translateY(5px) scale(1.09, .88) rotate(0deg)', filter: 'blur(0px)', opacity: 1, offset: .81 },
      { transform: 'translateY(-6px) scale(.96, 1.05) rotate(1.6deg)', filter: 'blur(0px)', opacity: 1, offset: .89 },
      { transform: 'translateY(1px) scale(1.01, .99) rotate(-.8deg)', filter: 'blur(0px)', opacity: 1, offset: .95 },
      { transform: 'translateY(0px) scale(1) rotate(0deg)', filter: 'blur(0px)', opacity: 1 }
    ], { duration: LOGO_MS, delay: LOGO_AT, easing: 'cubic-bezier(.3,.1,.3,1)' });
    // its nest pops in under it as it lands
    puffs.forEach((p, i) => held(p, [{ transform: 'translateY(18px) scale(.4)', opacity: 0 }, { transform: 'translateY(-4px) scale(1.08)', opacity: 1, offset: .6 }, { transform: 'translateY(0px) scale(1)', opacity: 1 }],
      { duration: 620, delay: LOGO_AT + LOGO_MS * .7 + i * 90, easing: 'cubic-bezier(.16,1,.3,1)' }));
    // the card rises into place as the clouds clear
    if (card) held(card, [{ transform: 'translateY(28px)', opacity: 0 }, { transform: 'translateY(0px)', opacity: 1 }], { duration: 900, delay: small ? 1250 : 900, easing: 'cubic-bezier(.16,1,.3,1)' });
    // ---- wave 8: the letters, one by one, each on its own arc; FUTURES from far behind the sky, FRIENDS from in front of the lens,
    // the heart last. Each lands with a felt squash and a stitch-tight shiver (a tiny turn either way, then still).
    const L = logo.offsetWidth || 300;
    const cues = [];   // [ms from the camera's first move, what happens then] (sounds, fluff puffs)
    let n = [0, 0, 0];
    Array.from(hero.querySelectorAll('.mh-l')).forEach(l => {
      const id = l.dataset.l, row = +l.dataset.row || 0, f = l.querySelector('.mh-lf'), R = ROW[row], [fx, fy, s0, r0] = FROM[id] || [0, -1, .3, 0];
      if (!f) return;
      const at = R.at + R.step * n[row]++, ms = R.ms, dx = fx * L, dy = fy * L;
      let frames;
      if (row === 2) {
        // the heart: a pop (no flight), with a sparkle burst behind it
        frames = [{ transform: 'scale(.2)', opacity: 0 }, { transform: 'scale(1.32)', opacity: 1, offset: .38, easing: 'cubic-bezier(.3,.6,.4,1)' }, { transform: 'scale(.9)', offset: .6 }, { transform: 'scale(1.06)', offset: .8 }, { transform: 'scale(1)', opacity: 1 }];
      } else {
        // an arc: out wide first (the start), then curving in over the slot, faster as it comes; it touches down at LAND
        const bend = row === 0 ? -.3 : .22;
        frames = [
          { transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) rotate(${r0}deg) scale(${s0})`, filter: `blur(${row === 0 ? 3 : 7}px)`, opacity: 0, easing: 'cubic-bezier(.35,.1,.6,.6)' },
          { transform: `translate(${(dx * .82).toFixed(1)}px, ${(dy * .8).toFixed(1)}px) rotate(${r0 * .85}deg) scale(${(s0 + (1 - s0) * .12).toFixed(3)})`, filter: `blur(${row === 0 ? 2.4 : 5}px)`, opacity: 1, offset: .12, easing: 'cubic-bezier(.3,.2,.5,1)' },
          { transform: `translate(${(dx * .32).toFixed(1)}px, ${(dy * .3 + bend * L * .3).toFixed(1)}px) rotate(${(r0 * .35).toFixed(1)}deg) scale(${(s0 + (1 - s0) * .72).toFixed(3)})`, filter: 'blur(.6px)', opacity: 1, offset: .45, easing: 'cubic-bezier(.4,0,.7,.5)' },
          { transform: 'translate(0px, 3px) rotate(0deg) scale(1.17, .82)', filter: 'blur(0px)', opacity: 1, offset: LAND, easing: 'cubic-bezier(.2,.6,.4,1)' },
          { transform: 'translate(0px, -4px) rotate(1.6deg) scale(.93, 1.08)', filter: 'blur(0px)', opacity: 1, offset: .82 },
          { transform: 'translate(0px, 0px) rotate(-1.1deg) scale(1.03, .98)', filter: 'blur(0px)', opacity: 1, offset: .91 },
          { transform: 'translate(0px, 0px) rotate(.4deg) scale(1, 1)', filter: 'blur(0px)', opacity: 1, offset: .96 },
          { transform: 'none', filter: 'blur(0px)', opacity: 1 }];
      }
      held(f, frames, { duration: ms, delay: at, easing: 'linear' });
      cues.push([at + (row === 2 ? ms * .3 : ms * LAND), () => {
        if (row === 2) { sfx('sparkle', pan(l)); burst(l); } else { sfx('letter-pop', pan(l), row === 0 ? 1 : .85); dust(l); }
      }]);
    });
    cues.push([0, () => sfx('whoosh', 0, .7)], [560, () => sfx('cloud-puff', 0)], [LOGO_AT + 80, () => sfx('whoosh', 0, .5)], [LOGO_AT + LOGO_MS * .72, () => sfx('logo-land', 0)]);
    // a puff of fluff where a letter lands (four tiny felt crumbs that spring out and fade), and a sparkle burst behind the heart
    function dust(l) {
      const host = l.parentNode;
      if (!host) return;
      for (let i = 0; i < 4; i++) {
        const d = doc.createElement('i');
        d.className = 'mh-dust';
        const side = i < 2 ? -1 : 1, size = 5 + (i % 2) * 3;
        d.style.setProperty('--d', size + 'px');
        d.style.left = `calc(${l.style.left} + ${l.style.width} * ${(.5 + side * .26).toFixed(2)})`;
        d.style.top = `calc(${l.style.top} + ${l.style.height} * .84)`;
        host.appendChild(d);
        const a = sc.anim(d, [{ transform: 'translate(0,0) scale(.4)', opacity: .95 }, { transform: `translate(${side * (10 + i * 4)}px, ${-6 - (i % 2) * 7}px) scale(1.1)`, opacity: 0 }], { duration: 520 + i * 40, easing: 'cubic-bezier(.2,.7,.3,1)' });
        if (a) a.onfinish = () => d.remove(); else d.remove();
      }
    }
    function burst(l) {
      const b = doc.createElement('img');
      b.className = 'mh-burst'; b.alt = ''; b.setAttribute('aria-hidden', 'true'); b.decoding = 'async';
      b.src = W8 + 'sparkle-burst-160.webp';
      l.insertBefore(b, l.firstChild);
      const a = sc.anim(b, [{ transform: 'scale(.4) rotate(-20deg)', opacity: 0 }, { transform: 'scale(1) rotate(0deg)', opacity: .95, offset: .35 }, { transform: 'scale(1.25) rotate(14deg)', opacity: 0 }], { duration: 900, easing: 'cubic-bezier(.2,.7,.3,1)' });
      if (a) a.onfinish = () => b.remove(); else b.remove();
    }
    const cleanup = () => { veil.remove(); logo.style.transformOrigin = ''; };
    sc.add(cleanup);
    const lettersEnd = ROW[2].at + ROW[2].ms;
    return { anims, veil, clouds, cues, cleanup, wait: WAIT, end: Math.max(CRANE, LOGO_AT + LOGO_MS, LOGO_AT + LOGO_MS * .7 + puffs.length * 90 + 620, lettersEnd) };
  }

  function setup(view, root, ok) {
    if (live) { live.abort(); live = null; }
    state = null;
    if (view !== 'home' || !root || !M()) return;
    const hero = root.querySelector('.mh-hero');
    if (!hero || !hero.querySelector('.mh-world')) return;
    const motion = M().allowed(ok);
    if (!motion) {
      // still, composed world: nothing made, nothing moves; a tap on a letter still says its squish (sound only, on an explicit tap)
      const sc = M().scope();
      live = sc;
      const host = hero.querySelector('.mh-letters');
      if (host) sc.listen(host, 'pointerdown', e => { const l = e.target.closest && e.target.closest('.mh-l'); if (l) sfx('squish', pan(l)); });
      return;
    }
    const sc = M().scope();
    live = sc;
    hero.classList.add('mh-alive');
    sc.add(() => { hero.classList.remove('mh-alive'); delete hero.dataset.opening; });
    // pause everything when the hero is off screen or the tab is hidden (watched on the hero itself, so a short phone that shows
    // the logo but not yet the friends still moves)
    const vis = sc.pauseOffscreen(hero);
    const pts = addParticles(hero, sc);
    // low-power or data-saver devices (the particle budget's own test): no light shafts, no bokeh, no butterfly and a plain frosted
    // card without the backdrop blur, so the world itself keeps its frame rate
    const lite = budget() <= 6;
    if (lite) { hero.classList.add('mh-lite'); sc.add(() => hero.classList.remove('mh-lite')); } else shafts(hero, sc);
    fauna(hero, sc);
    const cam = camera(hero, sc, vis, glass(hero, sc));
    breeze(hero, sc, vis, pts);
    const alive = living(hero, sc, vis);
    sc.listen(document, 'visibilitychange', () => { if (cam) cam.kick(); });

    hero.dataset.opening = 'off';
    if (played) { if (cam) cam.kick(); if (alive) alive.unlock(); return; }
    const op = buildOpening(hero, sc);
    if (!op) { if (alive) alive.unlock(); return; }
    hero.dataset.opening = 'held';
    let done = false, quiet = false;
    const finish = how => {
      if (done) return;
      done = true;
      hero.dataset.opening = how;
      op.cleanup();
      if (alive) alive.unlock();
    };
    const skip = () => {
      if (done || hero.dataset.opening !== 'playing') return;
      quiet = true; // a skipped opening makes no more sounds or puffs
      op.anims.forEach(a => {
        if (a.playState === 'finished') return;
        const left = Math.max(0, (a.effect.getComputedTiming().endTime || 0) - (a.currentTime || 0));
        if (a.playState === 'paused') a.play();
        if (a.updatePlaybackRate) a.updatePlaybackRate(Math.max(1, left / SPEED_MS)); else a.finish();
      });
      if (window.FFHeroMotion && typeof window.FFHeroMotion.skip === 'function') window.FFHeroMotion.skip();
      sc.timer(() => finish('skipped'), SPEED_MS + 60);
    };
    sc.frame(() => {
      if (sc.aborted) return;
      const r = hero.getBoundingClientRect();
      const onTop = r.top < (innerHeight || 800) * .5 && r.bottom > 0 && (window.scrollY || 0) < 40;
      if (!onTop) { op.anims.forEach(a => a.cancel()); quiet = true; finish('off'); if (cam) cam.kick(); return; }
      played = true;
      hero.dataset.opening = 'playing';
      // the camera starts once the cloud bank is decoded (the white haze covers the wait, which is never more than WAIT ms);
      // `started` tells hero-motion.js when, so the cast's lead counts from the camera's first move
      let begin;
      state = { lead: LEAD, end: op.end, started: new Promise(r => { begin = r; }) };
      const go = () => {
        if (sc.aborted || done) return;
        op.anims.forEach(a => { if (a.playState === 'paused') a.play(); });
        op.cues.forEach(([t, f]) => sc.timer(() => { if (!quiet) f(); }, t));
        begin();
      };
      // waits (at most WAIT ms) for the cloud bank and the logo kit (badge + letters) to decode
      const kit = hero.querySelector('.mh-logo-img');
      Promise.race([Promise.all(op.clouds.concat(kit ? [kit] : []).map(im => (im.decode ? im.decode().catch(() => {}) : null))), new Promise(r => setTimeout(r, op.wait))]).then(() => sc.frame(go));
      sc.timer(() => finish('done'), op.end + op.wait + 40);
      // any input skips (the opening, and the cast's entrance after it); a plain pointer move does not
      const y0 = window.scrollY || 0;
      const stop = Date.now() + LEAD + ((window.FFHeroMotion && window.FFHeroMotion.END) || 2500) + 200;
      const any = () => { if (Date.now() < stop) { skip(); if (window.FFHeroMotion && window.FFHeroMotion.skip) window.FFHeroMotion.skip(); } };
      ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(t => sc.listen(window, t, any, { passive: true, capture: true }));
      sc.listen(window, 'scroll', () => { if (Math.abs((window.scrollY || 0) - y0) > 8) any(); }, { passive: true });
    });
  }

  window.FFhooks = window.FFhooks || [];
  window.FFhooks.push(setup);
  // opening(): {lead, end} while this render's opening plays (hero-motion.js holds the cast for `lead`), else null.
  window.FFHeroWorld = { setup, opening: () => state, particles, budget, LEAD, CRANE, ROW, FROM, LAND, reset() { played = false; state = null; if (live) { live.abort(); live = null; } } };
})();
