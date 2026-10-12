/* How a Futures Friends day travels (owner 2026-10-12, from a reel of a scroll-driven isometric line-art "factory" made with Claude:
   "build this for Futures Friends"). One section on #home, between the day path (.hc-day) and "What we have built" (.hc-proof),
   tagged as the afternoon of home-day.js's day. The platform's real loop drawn as a little working machine:
     four classroom stations (the official cut-outs of Booker, Lumi, Zuri and Bop, drawn as images, never redrawn) send "moment"
     cards down a conveyor to the teacher's tablet, a stamp checks each one, the tablet bundles them into a daily-report envelope,
     an overhead rail carries it to a parent's phone, the notification badge pops and the tap opens straight into that report,
     and a last belt brings a "try this at home" card to a little home, closing the loop.
   - Canvas 2D, isometric line art in the site navy on the warm cream ground, friend-colour accents, a pre-rendered paper-grain tile
     over it (CSS, drawn once). Scroll-scrubbed: a sticky stage; the camera glides station to station as the section scrolls, with a
     monospace caption in the bottom-left corner (bilingual through FFi18n; Spanish in i18n-es-9.js, draft).
   - Built on the motion kit (ff-motion.js): FFMotion.allowed decides live or still; one FFMotion.scope per Home render owns every
     observer, listener and frame and tears it all down on the next render.
   - Lazy: nothing is measured, loaded or drawn until the section is within a screen; frames run only while it is on screen.
   - Reduced motion or the Decorative motion switch off: one still, complete illustration of the whole loop plus the steps as a
     readable list. The canvas and the caption are aria-hidden; the ordered list of steps is the text for screen readers (always in
     the page; visually hidden while the scene is live). Nothing here takes focus.
   Sends nothing, stores nothing, loads only the four cut-outs from this site. No curriculum content (generic moments only). */
(function () {
  'use strict';
  const M = () => window.FFMotion;
  const T = s => (window.FFi18n && typeof window.FFi18n.t === 'function' ? window.FFi18n.t(s) : s);
  const E = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // the four stations, left to right along the belt (world x of each platform); icon = the moment card each one sends
  const FRIENDS = [
    { k: 'booker', src: 'img/cut_booker.webp', icon: 'star' },   // skill check
    { k: 'lumi', src: 'img/cut_lumi.webp', icon: 'moon' },       // nap
    { k: 'zuri', src: 'img/cut_zuri.webp', icon: 'plate' },      // lunch eaten
    { k: 'bop', src: 'img/cut_bop.webp', icon: 'ball' }          // activity done
  ];
  // one caption per camera stop (u = 0 .. 9)
  const CAPS = ['4 friends · 1 day', 'booker · read-together nook', 'lumi · kindness and calm corner', 'zuri · discovery table', 'bop · move zone',
    'moments logged by the teacher', 'report ready 5:30 pm', 'tap opens the exact report', 'tonight’s 10-minute activity', 'Learn. Move. Explore. Belong.'];
  const STEPS = [
    'Four friends, four classroom stations: a read-together nook, a kindness and calm corner, a discovery table and a move zone.',
    'Through the day, the teacher logs moments on a tablet: an activity done, lunch eaten, a nap, a skill check.',
    'At the end of the day the moments are bundled into one daily report.',
    'The report arrives on the family’s phone, and tapping the notification opens that exact report.',
    'It ends with one 10-minute activity to try together at home tonight.'
  ];
  const STEP_K = ['booker', 'lumi', 'zuri', 'bop', 'gold'];
  const TAGLINE = 'Learn. Move. Explore. Belong.';
  const N = CAPS.length;

  function section() {
    const live = !!(M() && M().allowed());
    return `<section class="dm" data-dm="${live ? 'live' : 'still'}" data-day="afternoon" data-daypart="afternoon" aria-labelledby="dm-h"><div class="wrap">
   <div class="hc-head dm-head"><h2 id="dm-h">How a Futures Friends day travels</h2><p>Every moment the teacher notes travels one way: into a single daily report on your phone, and back home as one small thing to try together tonight.</p></div>
   <div class="dm-track" style="--dm-n:${N}"><div class="dm-stage"><div class="dm-board">
    <canvas class="dm-canvas" aria-hidden="true"></canvas><div class="dm-grain" aria-hidden="true"></div>
    <p class="dm-cap" aria-hidden="true"><span class="dm-capn">01</span><span class="dm-capt">${E(CAPS[0])}</span></p>
    <span class="dm-dots" aria-hidden="true">${CAPS.map((_, i) => `<i${i ? '' : ' class="on"'}></i>`).join('')}</span>
   </div></div></div>
   <ol class="dm-steps">${STEPS.map((s, i) => `<li style="--c:var(--${STEP_K[i]})"><span class="dm-stepn" aria-hidden="true">${i + 1}</span><span>${E(s)}</span></li>`).join('')}</ol>
  </div></section>`;
  }

  // ---------------------------------------------------------------- isometric world
  const C = Math.cos(Math.PI / 6);
  const P = (x, y, z) => [(x - y) * C, (x + y) * 0.5 - (z || 0)];
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const ease = t => t * t * (3 - 2 * t);
  const seg = (u, a, b) => clamp((u - a) / (b - a));
  const back = t => { const s = 1.70158; t -= 1; return t * t * ((s + 1) * t + s) + 1; };
  const lerp = (a, b, t) => a + (b - a) * t;

  // layout (world units): stations, belt, stamp, desk + tablet, rail, phone, return belt, home
  const SX = i => i * 150;                         // station platform x (124 wide, y 0..112)
  const BELT = { x0: -14, x1: 670, y0: 136, y1: 166, z: 24 };
  const STAMP_X = 630;
  const DESK = { x: 678, y: 108, w: 124, d: 84, h: 30 };
  const TAB = { x: 700, y: 124, w: 72, d: 50 };    // tablet on the desk
  const RAIL = { x: 736, z: 124, y0: 150, y1: -262, post: 812 };
  const PHONE = { x: 704, y: -306, w: 64, z0: 26, z1: 154 };
  const RET = { x0: 132, x1: 682, y0: -326, y1: -296, z: 20 };
  const HOUSE = { x: 18, y: -362, w: 94, d: 92, h: 60, roof: 104 };

  // camera stops: screen focus (scene units) + the view box to fit (w, h)
  const at = (x, y, z, w, h) => { const [a, b] = P(x, y, z); return { x: a, y: b, w, h }; };
  const WIDE = { x: 440, y: 112, w: 1210, h: 880 };
  const STOPS = [WIDE, at(64, 58, 60, 300, 270), at(214, 58, 60, 300, 270), at(364, 58, 60, 300, 270), at(514, 58, 60, 300, 270),
    at(668, 150, 34, 340, 280), at(742, 60, 80, 440, 360), at(736, -296, 92, 300, 290), at(170, -300, 50, 470, 330), WIDE];
  // where each stop sits on the story clock u (0 .. U_END): longer dwell where the envelope travels and the report opens
  const STOP_U = [0, 1, 2, 3, 4, 5, 6.2, 7.6, 8.75, 9.6];
  const U_END = STOP_U[STOP_U.length - 1];
  const nearest = u => STOP_U.reduce((b, v, i) => (Math.abs(v - u) < Math.abs(STOP_U[b] - u) ? i : b), 0);

  // ---------------------------------------------------------------- the story as a function of u (0..9, the camera stop clock)
  const CARD_ON = i => 0.95 + i;                   // a card is logged at its station as the camera arrives
  const BELT_V = 122;                              // belt speed, world units per stop
  function story(u) {
    const cards = FRIENDS.map((f, i) => {
      const t0 = CARD_ON(i), x0 = SX(i) + 100;
      const pop = seg(u, t0 - 0.35, t0 - 0.05), hop = seg(u, t0, t0 + 0.3);
      if (pop <= 0) return null;
      if (hop < 1) {
        const h = ease(hop);
        return { i, x: x0, y: lerp(98, 151, h), z: lerp(6, BELT.z, h) + Math.sin(Math.PI * h) * 26, s: back(pop), a: 1, stamped: 0 };
      }
      const x = x0 + BELT_V * (u - t0 - 0.3);
      const stamped = clamp((x - STAMP_X + 2) / 6);
      if (x < DESK.x - 8) return { i, x, y: 151, z: BELT.z, s: 1, a: 1, stamped };
      // onto the desk and into the tablet
      const k = clamp((x - (DESK.x - 8)) / 30);
      return { i, x: lerp(DESK.x - 8, TAB.x + 30, k), y: lerp(151, TAB.y + 26, k), z: lerp(BELT.z, DESK.h + 4, Math.min(1, k * 2)), s: 1 - k * 0.5, a: 1 - seg(k, 0.6, 1), stamped: 1, inTab: k };
    });
    const done = cards.filter(c => c && c.inTab >= 1).length;
    const tablet = cards.reduce((n, c) => n + (c && c.inTab > 0.6 ? 1 : 0), 0);
    // the envelope: bundled on the tablet, hooked, lifted, carried along the rail, lowered to the phone, opened into the report
    const E0 = 6.2;
    const env = { show: 0, y: TAB.y + 26, z: DESK.h + 18, gy: TAB.y + 26, open: 0, letter: 0 };
    const b = seg(u, E0, E0 + 0.18), lift = ease(seg(u, E0 + 0.2, E0 + 0.35)), go = ease(seg(u, E0 + 0.38, E0 + 1.05)), down = ease(seg(u, E0 + 1.07, E0 + 1.16));
    env.show = done >= 4 ? b : 0;
    env.z = DESK.h + 20 + lift * 52 - down * 10;
    env.dock = down;                               // at the phone it leaves the hook and settles over the screen
    env.y = env.gy = lerp(TAB.y + 26, RAIL.y1, go);
    const badge = seg(u, 7.38, 7.52), tap = seg(u, 7.52, 7.6);
    env.open = ease(seg(u, 7.6, 7.7));
    env.letter = ease(seg(u, 7.68, 7.8));
    const report = seg(u, 7.76, 7.86);
    if (report >= 1) env.show = 0;
    else if (env.letter > 0) env.show = 1 - seg(u, 7.8, 7.86);
    // the home card rides the return belt; the home's windows light up when it arrives
    const hc = seg(u, 7.92, 8.66);
    const home = u < 7.86 ? null : { x: lerp(RET.x1 - 24, RET.x0 + 4, ease(hc)), a: 1 - seg(u, 8.66, 8.76), s: back(seg(u, 7.86, 7.98)) };
    const glow = seg(u, 8.66, 8.86);
    return { cards, tablet, env, badge, tap, report, home, glow, stamp: cards.reduce((m, c) => (c && c.y > 140 && Math.abs(c.x - STAMP_X) < 12 ? Math.max(m, 1 - Math.abs(c.x - STAMP_X) / 12) : m), 0) };
  }
  // the still picture: every part of the loop visible at once
  function stillStory() {
    const s = story(4.88);
    s.cards = s.cards.map(c => c && Object.assign({}, c));
    s.tablet = 1;
    s.env = { show: 1, y: -60, gy: -60, z: RAIL.z - 46, open: 0, letter: 0 };
    s.badge = 1; s.tap = 0; s.report = 1;
    s.home = { x: RET.x0 + 120, a: 1, s: 1 };
    s.glow = 1; s.stamp = 0.6;
    return s;
  }

  // ---------------------------------------------------------------- palette (read from the page tokens: light and dark both work)
  function hex(c) {
    c = String(c || '').trim();
    if (/^#([0-9a-f]{3})$/i.test(c)) c = '#' + c.slice(1).split('').map(x => x + x).join('');
    const m = /^#([0-9a-f]{6})/i.exec(c); if (!m) return null;
    const n = parseInt(m[1], 16); return [n >> 16 & 255, n >> 8 & 255, n & 255];
  }
  const rgb = (a, al) => al == null ? `rgb(${a.map(Math.round).join(',')})` : `rgba(${a.map(Math.round).join(',')},${al})`;
  const mixc = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  function palette(el) {
    const cs = getComputedStyle(el), v = (n, d) => hex(cs.getPropertyValue(n)) || hex(d);
    const ground = v('--cream', '#FBF6EC'), paper = v('--paper', '#FFFFFF');
    const dark = (ground[0] * 0.3 + ground[1] * 0.59 + ground[2] * 0.11) < 128;
    const line = dark ? v('--ink', '#EAF1F3') : v('--navy', '#0A2B38');
    const c = {
      dark, ground, paper, line, L: rgb(line), soft: rgb(line, dark ? 0.18 : 0.08), faint: rgb(line, dark ? 0.1 : 0.05),
      gold: v('--gold', '#E7A928'), ok: v('--ok', '#1F6E43')
    };
    ['booker', 'lumi', 'zuri', 'bop'].forEach(k => { c[k] = v('--' + k, '#888888'); c[k + 'S'] = v('--' + k + '-s', '#EEEEEE'); });
    c.goldS = mixc(c.gold, paper, 0.78);
    // box faces: light from the upper left, so the top is lightest and the right face the deepest
    c.face = (base, k = 0) => ({ top: rgb(mixc(base, paper, 0.55 - k)), left: rgb(mixc(base, paper, 0.25 - k)), right: rgb(mixc(base, line, 0.1 + k)) });
    c.neutral = mixc(ground, line, dark ? 0.12 : 0.06);
    return c;
  }

  // ---------------------------------------------------------------- the paper grain (one small tile, made once per page load)
  let grainURL = null;
  function grain() {
    if (grainURL !== null) return grainURL;
    grainURL = '';
    try {
      const n = 160, c = document.createElement('canvas'); c.width = c.height = n;
      const g = c.getContext('2d'); if (!g) return grainURL;
      const im = g.createImageData(n, n), d = im.data;
      let seed = 20261012; const r = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
      for (let i = 0; i < d.length; i += 4) { const v = 120 + r() * 120; d[i] = v; d[i + 1] = v * 0.97; d[i + 2] = v * 0.9; d[i + 3] = r() < 0.5 ? 18 + r() * 26 : 0; }
      g.putImageData(im, 0, 0);
      g.strokeStyle = 'rgba(90,70,40,.10)'; g.lineWidth = 0.6;
      for (let i = 0; i < 26; i++) { const x = r() * n, y = r() * n, a = r() * Math.PI, l = 4 + r() * 10; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + r() * 2, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
      grainURL = c.toDataURL('image/png');
    } catch (e) { grainURL = ''; }
    return grainURL;
  }

  // the cut-outs, shared across renders (each loads once)
  // phones get the same art resampled to 440 px tall (img/cut_<friend>-440.webp, ~35 KB each): enough for the stage at DPR 2.5
  const IMGS = {};
  function art(k, src, onload) {
    let im = IMGS[k];
    if (!im || im.dataset.src !== src) { im = IMGS[k] = new Image(); im.decoding = 'async'; im.dataset.src = src; im.src = src; }
    if (!im.complete && onload) im.addEventListener('load', onload, { once: true });
    return im;
  }
  const ready = im => im && im.complete && im.naturalWidth > 0;

  // ---------------------------------------------------------------- the renderer
  function renderer(cv, pal) {
    const ctx = cv.getContext('2d');
    let S = 1, LW = 1, DPR = 1;
    const rects = {};                               // where each friend was drawn last frame (CSS px), for the tests' crop check
    const tr = (pts) => { ctx.beginPath(); for (let i = 0; i < pts.length; i++) { const p = P(pts[i][0], pts[i][1], pts[i][2]); if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); } };
    const stroke = (w = 1, col = pal.L) => { ctx.strokeStyle = col; ctx.lineWidth = LW * w; ctx.stroke(); };
    const shape = (pts, fill, w = 1, col) => { tr(pts); ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (w) stroke(w, col); };
    const line = (a, b, w = 1, col) => { tr([a, b]); stroke(w, col); };
    function box(x, y, z, w, d, h, f, lw = 1) {
      const X = x + w, Y = y + d, Z = z + h;
      shape([[x, Y, z], [X, Y, z], [X, Y, Z], [x, Y, Z]], f.left, lw);
      shape([[X, y, z], [X, Y, z], [X, Y, Z], [X, y, Z]], f.right, lw);
      shape([[x, y, Z], [X, y, Z], [X, Y, Z], [x, Y, Z]], f.top, lw);
    }
    // flat circle on a horizontal plane
    const disc = (x, y, z, r, fill, w = 1, col) => { const p = P(x, y, z); ctx.beginPath(); ctx.ellipse(p[0], p[1], r * 1.2247, r * 0.7071, 0, 0, Math.PI * 2); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (w) stroke(w, col); };
    // drawing on a plane: y = const (u -> +x, v -> down), x = const (u -> -y, v -> down), or the floor (u -> +x, v -> +y)
    const onY = (x, y, z, fn) => { const p = P(x, y, z); ctx.save(); ctx.transform(C, 0.5, 0, 1, p[0], p[1]); fn(); ctx.restore(); };
    const onX = (x, y, z, fn) => { const p = P(x, y, z); ctx.save(); ctx.transform(C, -0.5, 0, 1, p[0], p[1]); fn(); ctx.restore(); };
    const onTop = (x, y, z, fn) => { const p = P(x, y, z); ctx.save(); ctx.transform(C, 0.5, -C, 0.5, p[0], p[1]); fn(); ctx.restore(); };
    const font = (px, w = 600, fam = 'Fredoka, Poppins, system-ui, sans-serif') => `${w} ${px}px ${fam}`;
    const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

    // small icons in a local 2D frame centred on 0,0 (size ~ r)
    function icon(kind, r, col) {
      ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = LW * 1.1; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath();
      if (kind === 'star') { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.45 : r; ctx.lineTo(Math.cos(a) * q, Math.sin(a) * q); } ctx.closePath(); ctx.fill(); }
      else if (kind === 'moon') { ctx.arc(0, 0, r, Math.PI * 0.35, Math.PI * 1.65); ctx.arc(r * 0.45, -r * 0.1, r * 0.78, Math.PI * 1.45, Math.PI * 0.55, true); ctx.closePath(); ctx.fill(); }
      else if (kind === 'plate') { ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2); ctx.fill(); }
      else if (kind === 'ball') { ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-r, 0); ctx.quadraticCurveTo(0, -r * 0.9, r, 0); ctx.moveTo(-r * 0.7, r * 0.7); ctx.quadraticCurveTo(0, 0, r * 0.7, r * 0.7); ctx.stroke(); }
      else if (kind === 'heart') { ctx.moveTo(0, r * 0.9); ctx.bezierCurveTo(-r * 1.4, -r * 0.1, -r * 0.6, -r * 1.1, 0, -r * 0.35); ctx.bezierCurveTo(r * 0.6, -r * 1.1, r * 1.4, -r * 0.1, 0, r * 0.9); ctx.fill(); }
      else if (kind === 'check') { ctx.moveTo(-r * 0.6, 0); ctx.lineTo(-r * 0.15, r * 0.45); ctx.lineTo(r * 0.65, -r * 0.45); ctx.lineWidth = LW * 1.6; ctx.stroke(); }
      else if (kind === 'book') { ctx.moveTo(0, -r * 0.6); ctx.quadraticCurveTo(-r * 0.5, -r * 0.9, -r, -r * 0.6); ctx.lineTo(-r, r * 0.6); ctx.quadraticCurveTo(-r * 0.5, r * 0.3, 0, r * 0.6); ctx.quadraticCurveTo(r * 0.5, r * 0.3, r, r * 0.6); ctx.lineTo(r, -r * 0.6); ctx.quadraticCurveTo(r * 0.5, -r * 0.9, 0, -r * 0.6); ctx.lineTo(0, r * 0.6); ctx.stroke(); }
      ctx.restore();
    }

    // ---- floor: a faint isometric grid and the "next morning" path that closes the loop
    function floor() {
      ctx.save();
      for (let x = -120; x <= 880; x += 40) line([x, -420, 0], [x, 260, 0], 0.8, pal.faint);
      for (let y = -420; y <= 260; y += 40) line([-120, y, 0], [880, y, 0], 0.8, pal.faint);
      ctx.setLineDash([LW * 5, LW * 5]);
      tr([[64, -262, 0], [64, -40, 0], [40, -14, 0]]); stroke(1.2, rgb(pal.line, pal.dark ? 0.4 : 0.3));
      ctx.setLineDash([]);
      const a = P(40, -14, 0), b = P(52, -27, 0);
      ctx.save(); ctx.translate(a[0], a[1]); ctx.rotate(Math.atan2(a[1] - b[1], a[0] - b[0])); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-7, -4); ctx.moveTo(0, 0); ctx.lineTo(-7, 4); stroke(1.2); ctx.restore();
      ctx.restore();
    }

    // ---- the little home with the tagline on its sign
    function house(s, t) {
      const H = HOUSE, X = H.x + H.w, Y = H.y + H.d, f = pal.face(pal.goldS || pal.paper, 0);
      disc(H.x + H.w / 2, H.y + H.d / 2, 0, 74, rgb(pal.neutral), 0);
      // walls (+y face carries the door and windows, +x face the gable)
      shape([[H.x, Y, 0], [X, Y, 0], [X, Y, H.h], [H.x, Y, H.h]], f.left);
      shape([[X, H.y, 0], [X, Y, 0], [X, Y, H.h], [X, H.y + H.d / 2, H.roof], [X, H.y, H.h]], f.right);
      // roof: the visible front slope
      shape([[H.x - 4, H.y + H.d / 2, H.roof], [X + 4, H.y + H.d / 2, H.roof], [X + 4, Y + 8, H.h - 6], [H.x - 4, Y + 8, H.h - 6]], rgb(mixc(pal.bop, pal.paper, 0.35)));
      for (let k = 1; k < 5; k++) { const q = k / 5; line([H.x - 4, lerp(H.y + H.d / 2, Y + 8, q), lerp(H.roof, H.h - 6, q)], [X + 4, lerp(H.y + H.d / 2, Y + 8, q), lerp(H.roof, H.h - 6, q)], 0.7, pal.soft); }
      box(H.x + 18, H.y + 26, H.roof - 18, 12, 12, 30, pal.face(pal.paper, 0.1));
      // door + two windows on the front wall; the windows glow when the card arrives
      const glow = rgb(mixc(pal.gold, pal.paper, 0.35 - 0.25 * s.glow), 0.25 + 0.75 * s.glow);
      onY(H.x, Y, H.h, () => {
        ctx.fillStyle = rgb(mixc(pal.booker, pal.paper, 0.2)); ctx.fillRect(40, 26, 15, 34); ctx.strokeStyle = pal.L; ctx.lineWidth = LW; ctx.strokeRect(40, 26, 15, 34);
        ctx.beginPath(); ctx.arc(51, 44, 1.2, 0, 7); ctx.fillStyle = pal.L; ctx.fill();
        [[12, 16], [68, 16]].forEach(([wx, wy]) => { ctx.fillStyle = glow; ctx.fillRect(wx, wy, 16, 16); ctx.strokeRect(wx, wy, 16, 16); ctx.beginPath(); ctx.moveTo(wx + 8, wy); ctx.lineTo(wx + 8, wy + 16); ctx.moveTo(wx, wy + 8); ctx.lineTo(wx + 16, wy + 8); ctx.stroke(); });
      });
      if (s.glow > 0) { const p = P(H.x + 60, Y, 48), r = 28 + 6 * Math.sin(t * 2); const g = ctx.createRadialGradient(p[0], p[1], 2, p[0], p[1], r * 2); g.addColorStop(0, rgb(pal.gold, 0.28 * s.glow)); g.addColorStop(1, rgb(pal.gold, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p[0], p[1], r * 2, 0, 7); ctx.fill(); }
      // a heart rises from the chimney when the activity is home
      if (s.glow > 0) { const p = P(H.x + 24, H.y + 32, H.roof + 20 + 10 * s.glow); ctx.save(); ctx.globalAlpha = s.glow; ctx.translate(p[0], p[1] - 4 * Math.sin(t * 2.2)); icon('heart', 6, rgb(pal.lumi)); ctx.restore(); }
      // the sign: Learn. Move. Explore. Belong. (each word in its friend's colour)
      const sx = H.x - 26, sy = Y + 30;
      line([sx + 8, sy, 0], [sx + 8, sy, 30]); line([sx + 132, sy, 0], [sx + 132, sy, 30]);
      shape([[sx, sy, 16], [sx + 140, sy, 16], [sx + 140, sy, 34], [sx, sy, 34]], rgb(pal.paper));
      const words = T(TAGLINE).split(/(?<=\.)\s+/), cols = [pal.booker, pal.bop, pal.zuri, pal.lumi];
      onY(sx, sy, 34, () => {
        ctx.font = font(9.2, 600); ctx.textBaseline = 'middle';
        let w = 0; const gap = 3.2; words.forEach(wd => { w += ctx.measureText(wd).width + gap; }); w -= gap;
        const k = Math.min(1, 130 / w); let xx = 70 - (w * k) / 2;
        ctx.save(); ctx.translate(xx, 9.5); ctx.scale(k, k); xx = 0;
        words.forEach((wd, i) => { ctx.fillStyle = rgb(cols[i % 4]); ctx.fillText(wd, xx, 0); xx += ctx.measureText(wd).width + gap; });
        ctx.restore();
      });
    }

    // ---- belts (a slab with moving slats, legs and end rollers)
    function belt(b, off) {
      const f = pal.face(pal.neutral, 0.05);
      const legs = 6;
      for (let i = 0; i <= legs; i++) { const x = lerp(b.x0 + 10, b.x1 - 10, i / legs); line([x, b.y1 - 4, 0], [x, b.y1 - 4, b.z - 6]); line([x, b.y0 + 4, 0], [x, b.y0 + 4, b.z - 6], 0.8, pal.soft); }
      box(b.x0, b.y0, b.z - 6, b.x1 - b.x0, b.y1 - b.y0, 6, f);
      // slats move with the belt
      ctx.save(); tr([[b.x0, b.y0, b.z], [b.x1, b.y0, b.z], [b.x1, b.y1, b.z], [b.x0, b.y1, b.z]]); ctx.closePath(); ctx.clip();
      const step = 14, o = ((off % step) + step) % step;
      for (let x = b.x0 - step + o; x < b.x1 + step; x += step) line([x, b.y0, b.z], [x, b.y1, b.z], 0.7, pal.soft);
      ctx.restore();
      // the rollers at the ends
      [b.x0, b.x1].forEach(x => { const p = P(x, b.y1, b.z - 3); ctx.beginPath(); ctx.ellipse(p[0], p[1], 3.2, 4.6, -0.5, 0, 7); ctx.fillStyle = rgb(pal.paper); ctx.fill(); stroke(0.9); });
    }

    // ---- a moment card (flat), with its icon and, once stamped, a check
    function card(c, kind, colr) {
      if (!c || c.a <= 0) return;
      const w = 22 * c.s, d = 16 * c.s, x = c.x - w / 2, y = c.y - d / 2;
      ctx.save(); ctx.globalAlpha = c.a;
      if (c.z > BELT.z + 1 || c.z > 8) disc(c.x, c.y, c.z > BELT.z ? BELT.z : 6, 8 * c.s, rgb(pal.line, 0.1), 0);
      box(x, y, c.z, w, d, 3, { top: rgb(pal.paper), left: rgb(mixc(colr, pal.paper, 0.45)), right: rgb(mixc(colr, pal.paper, 0.2)) }, 0.9);
      onTop(x, y, c.z + 3, () => { ctx.translate(w * 0.36, d * 0.5); icon(kind, 4.4 * c.s, rgb(colr)); });
      if (c.stamped > 0) {
        onTop(x, y, c.z + 3, () => {
          ctx.translate(w * 0.76, d * 0.5); const k = back(c.stamped);
          ctx.scale(k, k); ctx.beginPath(); ctx.arc(0, 0, 4.2, 0, 7); ctx.fillStyle = rgb(pal.ok); ctx.fill(); icon('check', 3, '#fff');
        });
      }
      ctx.restore();
    }

    // ---- one classroom station
    function station(i, t, still) {
      const f = FRIENDS[i], X0 = SX(i), col = pal[f.k], tint = pal[f.k + 'S'];
      const F = pal.face(mixc(tint, col, 0.12), 0);
      // back partition (y = 0 plane) and a short side wall (x = X0 plane)
      shape([[X0, 0, 6], [X0 + 124, 0, 6], [X0 + 124, 0, 84], [X0, 0, 84]], rgb(mixc(pal.paper, tint, 0.55)));
      shape([[X0, 0, 6], [X0, 52, 6], [X0, 52, 46], [X0, 0, 84]], rgb(mixc(pal.paper, tint, 0.25)));
      // the platform (a felt rug, stitched)
      box(X0, 0, 0, 124, 112, 6, F);
      ctx.save(); ctx.setLineDash([LW * 3, LW * 3]); tr([[X0 + 7, 7, 6], [X0 + 117, 7, 6], [X0 + 117, 105, 6], [X0 + 7, 105, 6]]); ctx.closePath(); stroke(0.9, rgb(col, 0.7)); ctx.restore();
      // a framed sign on the back wall with the friend's motif
      const motif = ['book', 'heart', 'star', 'ball'][i];
      onY(X0 + 64, 0, 76, () => { ctx.fillStyle = rgb(pal.paper); ctx.fillRect(0, 0, 40, 26); ctx.strokeStyle = pal.L; ctx.lineWidth = LW; ctx.strokeRect(0, 0, 40, 26); ctx.translate(20, 13); icon(motif, 7, rgb(col)); });
      // a small hanging lamp over each station
      const lp = [X0 + 96, 30];
      line([lp[0], lp[1], 84], [lp[0], lp[1], 112], 0.8);
      const lh = P(lp[0], lp[1], 84); ctx.beginPath(); ctx.moveTo(lh[0] - 8, lh[1] + 6); ctx.quadraticCurveTo(lh[0], lh[1] - 6, lh[0] + 8, lh[1] + 6); ctx.closePath(); ctx.fillStyle = rgb(mixc(pal.gold, pal.paper, 0.4)); ctx.fill(); stroke(0.9);
      const gl = ctx.createRadialGradient(lh[0], lh[1] + 8, 1, lh[0], lh[1] + 40, 44); gl.addColorStop(0, rgb(pal.gold, 0.22 + 0.05 * Math.sin(t * 1.7 + i))); gl.addColorStop(1, rgb(pal.gold, 0)); ctx.fillStyle = gl; ctx.beginPath(); ctx.moveTo(lh[0] - 7, lh[1] + 6); ctx.lineTo(lh[0] - 40, lh[1] + 70); ctx.lineTo(lh[0] + 40, lh[1] + 70); ctx.lineTo(lh[0] + 7, lh[1] + 6); ctx.fill();
      props(i, X0, col, tint, t, still);
      // the friend (the official cut-out, uniform scale, a gentle idle bob)
      const im = IMGS[f.k];
      const cx = X0 + 40, cy = 46, H = 112;
      disc(cx, cy, 6, 22, rgb(pal.line, 0.09), 0);
      if (ready(im)) {
        const w = H * im.naturalWidth / im.naturalHeight, p = P(cx, cy, 6), bob = still ? 0 : Math.abs(Math.sin(t * 1.9 + i * 1.3)) * 2.6;
        ctx.save(); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(im, p[0] - w / 2, p[1] - H - bob + 4, w, H); ctx.restore();
        if (ctx.getTransform) { const m = ctx.getTransform(), X = v => (m.a * v + m.e) / DPR, Y = v => (m.d * v + m.f) / DPR; rects[f.k] = { l: X(p[0] - w / 2), t: Y(p[1] - H - bob + 4), r: X(p[0] + w / 2), b: Y(p[1] - bob + 4) }; }
      }
      // the out-tray where the moment card appears
      box(X0 + 88, 90, 6, 24, 18, 2, pal.face(pal.paper, 0.1), 0.9);
    }
    function props(i, X0, col, tint, t, still) {
      const F = pal.face(mixc(tint, pal.paper, 0.2), 0);
      if (i === 0) {        // read-together nook: a shelf of books, a floor cushion, an open book on a little stand
        box(X0 + 84, 6, 6, 34, 20, 58, F);
        [24, 42].forEach(z => line([X0 + 84, 26, 6 + z], [X0 + 118, 26, 6 + z], 0.8));
        const spines = [pal.booker, pal.lumi, pal.zuri, pal.bop, pal.gold, pal.booker];
        for (let b = 0; b < 6; b++) { const bx = X0 + 87 + b * 5; shape([[bx, 26, 6 + 43], [bx + 4, 26, 6 + 43], [bx + 4, 26, 6 + 43 + 11 + (b % 3)], [bx, 26, 6 + 43 + 11 + (b % 3)]], rgb(mixc(spines[b], pal.paper, 0.25)), 0.7); }
        for (let b = 0; b < 4; b++) { const bx = X0 + 88 + b * 7; shape([[bx, 26, 6 + 25], [bx + 5, 26, 6 + 25], [bx + 5, 26, 6 + 25 + 13], [bx, 26, 6 + 25 + 13]], rgb(mixc(spines[b + 2], pal.paper, 0.35)), 0.7); }
        disc(X0 + 70, 72, 6, 14, rgb(mixc(pal.gold, pal.paper, 0.45)), 1);
        disc(X0 + 70, 72, 9, 10, rgb(mixc(pal.gold, pal.paper, 0.6)), 0.8);
        line([X0 + 92, 64, 6], [X0 + 92, 64, 22], 0.9);
        onTop(X0 + 82, 56, 24, () => { ctx.fillStyle = rgb(pal.paper); ctx.beginPath(); ctx.moveTo(0, 2); ctx.quadraticCurveTo(5, -1, 10, 2); ctx.quadraticCurveTo(15, -1, 20, 2); ctx.lineTo(20, 15); ctx.quadraticCurveTo(15, 12, 10, 15); ctx.quadraticCurveTo(5, 12, 0, 15); ctx.closePath(); ctx.fill(); ctx.strokeStyle = pal.L; ctx.lineWidth = LW; ctx.stroke(); ctx.beginPath(); ctx.moveTo(10, 2); ctx.lineTo(10, 15); ctx.stroke(); });
      } else if (i === 1) { // kindness and calm corner: a soft canopy, a beanbag, a heart pillow, a breathing lamp
        [[X0 + 74, 6, 6], [X0 + 120, 6, 6], [X0 + 120, 44, 6]].forEach(q => line([X0 + 98, 22, 74], q, 0.9));
        shape([[X0 + 98, 22, 74], [X0 + 74, 44, 6], [X0 + 120, 44, 6]], rgb(mixc(col, pal.paper, 0.72)), 1);
        shape([[X0 + 98, 22, 74], [X0 + 120, 44, 6], [X0 + 120, 6, 6]], rgb(mixc(col, pal.paper, 0.55)), 1);
        disc(X0 + 86, 72, 6, 16, rgb(mixc(col, pal.paper, 0.5)), 1);
        const bb = P(X0 + 86, 72, 14); ctx.beginPath(); ctx.ellipse(bb[0], bb[1], 15, 10, 0, Math.PI, 0); ctx.fillStyle = rgb(mixc(col, pal.paper, 0.4)); ctx.fill(); stroke(1);
        const hp = P(X0 + 66, 88, 14); ctx.save(); ctx.translate(hp[0], hp[1]); icon('heart', 6.5, rgb(col)); ctx.restore();
        const breathe = still ? 0.6 : 0.5 + 0.5 * Math.sin(t * 1.1);
        const lp = P(X0 + 112, 92, 30); line([X0 + 112, 92, 6], [X0 + 112, 92, 24], 0.9);
        const g = ctx.createRadialGradient(lp[0], lp[1], 1, lp[0], lp[1], 18 + 8 * breathe); g.addColorStop(0, rgb(col, 0.35)); g.addColorStop(1, rgb(col, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lp[0], lp[1], 26 + 8 * breathe, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.arc(lp[0], lp[1], 5.5, 0, 7); ctx.fillStyle = rgb(mixc(col, pal.paper, 0.6)); ctx.fill(); stroke(0.9);
      } else if (i === 2) { // discovery table: a table with a magnifier, a jar and a leaf; a tall plant
        const tx = X0 + 70, ty = 30, tz = 34;
        [[tx + 3, ty + 3], [tx + 45, ty + 3], [tx + 45, ty + 41], [tx + 3, ty + 41]].forEach(([a, b]) => line([a, b, 6], [a, b, tz], 1));
        box(tx, ty, tz, 48, 44, 4, F);
        const jar = P(tx + 34, ty + 12, tz + 4); ctx.beginPath(); ctx.rect(jar[0] - 5, jar[1] - 13, 10, 13); ctx.fillStyle = rgb(mixc(col, pal.paper, 0.75), 0.9); ctx.fill(); stroke(0.9); ctx.beginPath(); ctx.ellipse(jar[0], jar[1] - 13, 5, 2, 0, 0, 7); ctx.fillStyle = rgb(pal.paper); ctx.fill(); stroke(0.9);
        onTop(tx + 8, ty + 18, tz + 4, () => { ctx.strokeStyle = pal.L; ctx.lineWidth = LW * 1.1; ctx.beginPath(); ctx.arc(8, 8, 6, 0, 7); ctx.fillStyle = rgb(pal.paper, 0.7); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(12.5, 12.5); ctx.lineTo(20, 20); ctx.lineWidth = LW * 2.4; ctx.strokeStyle = rgb(col); ctx.stroke(); });
        onTop(tx + 26, ty + 26, tz + 4, () => { ctx.beginPath(); ctx.moveTo(0, 8); ctx.quadraticCurveTo(6, -2, 16, 2); ctx.quadraticCurveTo(10, 12, 0, 8); ctx.fillStyle = rgb(mixc(col, pal.paper, 0.2)); ctx.fill(); ctx.strokeStyle = pal.L; ctx.lineWidth = LW * 0.9; ctx.stroke(); });
        box(X0 + 10, 84, 6, 14, 14, 14, pal.face(mixc(pal.gold, pal.paper, 0.2), 0), 0.9);
        const pp = P(X0 + 17, 91, 20), sway = still ? 0 : Math.sin(t * 1.3) * 2;
        [[-10, -26], [0, -34], [9, -24], [-4, -18]].forEach(([dx, dy], k) => { ctx.beginPath(); ctx.moveTo(pp[0], pp[1]); ctx.quadraticCurveTo(pp[0] + dx * 0.4, pp[1] + dy * 0.6, pp[0] + dx + sway, pp[1] + dy); ctx.quadraticCurveTo(pp[0] + dx * 0.9 + 4, pp[1] + dy * 0.5, pp[0], pp[1]); ctx.fillStyle = rgb(mixc(col, pal.paper, 0.15 + k * 0.1)); ctx.fill(); stroke(0.8); });
      } else {              // move zone: a striped mat, a hoop on the floor, a ball that bounces, stepping dots
        box(X0 + 66, 14, 6, 50, 34, 2, pal.face(mixc(col, pal.paper, 0.5), 0), 0.9);
        for (let k = 1; k < 5; k++) line([X0 + 66 + k * 10, 14, 8], [X0 + 66 + k * 10, 48, 8], 0.7, rgb(col, 0.6));
        disc(X0 + 76, 78, 6, 14, null, 2.2, rgb(pal.gold));
        disc(X0 + 76, 78, 6, 14, null, 0.8);
        [[X0 + 98, 64], [X0 + 108, 52]].forEach(([a, b], k) => disc(a, b, 6, 4.5, rgb(mixc(k ? pal.zuri : pal.booker, pal.paper, 0.3)), 0.8));
        const hop = still ? 0.55 : Math.abs(Math.sin(t * 2.6));
        disc(X0 + 104, 82, 6, 6 - hop * 2.5, rgb(pal.line, 0.12), 0);
        const bp = P(X0 + 104, 82, 13 + hop * 22); ctx.save(); ctx.translate(bp[0], bp[1]); ctx.beginPath(); ctx.arc(0, 0, 7, 0, 7); ctx.fillStyle = rgb(mixc(col, pal.paper, 0.25)); ctx.fill(); ctx.restore(); ctx.save(); ctx.translate(bp[0], bp[1]); icon('ball', 7, pal.L); ctx.restore();
      }
    }

    // ---- the stamp gantry over the end of the belt
    function stampBack() { line([STAMP_X, BELT.y0 - 10, 0], [STAMP_X, BELT.y0 - 10, 70], 1.1); }
    function stampFront(press) {
      line([STAMP_X, BELT.y1 + 10, 0], [STAMP_X, BELT.y1 + 10, 70], 1.1);
      shape([[STAMP_X - 3, BELT.y0 - 12, 70], [STAMP_X + 3, BELT.y0 - 12, 70], [STAMP_X + 3, BELT.y1 + 12, 70], [STAMP_X - 3, BELT.y1 + 12, 70]], rgb(pal.paper));
      const zb = BELT.z + 4 + (1 - press) * 22;
      line([STAMP_X, 151, 70], [STAMP_X, 151, zb + 10], 1.4);
      box(STAMP_X - 7, 144, zb, 14, 14, 10, pal.face(pal.gold, 0.02));
    }

    // ---- the teacher's desk: file drawers, a lamp, the tablet that logs each moment
    function desk(s) {
      const D = DESK, f = pal.face(mixc(pal.booker, pal.paper, 0.7), 0);
      box(D.x, D.y, 0, D.w, D.d, D.h, f);
      // drawers on the front (+y) face
      onY(D.x, D.y + D.d, D.h, () => { ctx.strokeStyle = pal.L; ctx.lineWidth = LW * 0.9; for (let k = 0; k < 3; k++) { const dx = 8 + k * 39; ctx.strokeRect(dx, 6, 32, 18); ctx.beginPath(); ctx.moveTo(dx + 12, 15); ctx.lineTo(dx + 20, 15); ctx.lineWidth = LW * 1.6; ctx.stroke(); ctx.lineWidth = LW * 0.9; } });
      // lamp
      const lb = [D.x + D.w - 14, D.y + 12];
      disc(lb[0], lb[1], D.h, 6, rgb(pal.paper), 1);
      tr([[lb[0], lb[1], D.h], [lb[0], lb[1], D.h + 44], [lb[0] - 26, lb[1] + 8, D.h + 56]]); stroke(1.3);
      const hd = P(lb[0] - 26, lb[1] + 8, D.h + 56);
      ctx.beginPath(); ctx.moveTo(hd[0] - 9, hd[1] + 3); ctx.quadraticCurveTo(hd[0] - 2, hd[1] - 9, hd[0] + 8, hd[1] - 2); ctx.closePath(); ctx.fillStyle = rgb(pal.gold); ctx.fill(); stroke(0.9);
      const tc = P(TAB.x + TAB.w / 2, TAB.y + TAB.d / 2, D.h);
      const g = ctx.createRadialGradient(tc[0], tc[1], 2, tc[0], tc[1], 60); g.addColorStop(0, rgb(pal.gold, 0.2)); g.addColorStop(1, rgb(pal.gold, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(tc[0], tc[1], 60, 0, 7); ctx.fill();
      // the tablet: one row per moment logged today, each in its friend's colour, then the time the report is ready
      box(TAB.x, TAB.y, D.h, TAB.w, TAB.d, 3, { top: rgb(pal.line), left: rgb(mixc(pal.line, pal.paper, 0.3)), right: rgb(mixc(pal.line, pal.paper, 0.15)) }, 0.9);
      onTop(TAB.x + 4, TAB.y + 4, D.h + 3, () => {
        ctx.fillStyle = rgb(pal.dark ? pal.paper : [255, 255, 255]); ctx.fillRect(0, 0, TAB.w - 8, TAB.d - 8);
        for (let r = 0; r < 4; r++) {
          const on = r < s.tablet, y = 5 + r * 9, k = FRIENDS[r].k;
          ctx.fillStyle = on ? rgb(mixc(pal[k], pal.paper, 0.55)) : rgb(pal.line, 0.07); ctx.fillRect(4, y, TAB.w - 16, 6);
          if (on) { ctx.fillStyle = rgb(pal[k]); ctx.beginPath(); ctx.arc(8, y + 3, 2, 0, 7); ctx.fill(); ctx.save(); ctx.translate(TAB.w - 17, y + 3); icon('check', 2.4, rgb(pal.ok)); ctx.restore(); }
        }
        ctx.fillStyle = pal.L; ctx.font = font(4.4, 600, MONO); ctx.textBaseline = 'middle'; ctx.fillText(T('5:30 pm'), 4, TAB.d - 13);
      });
    }

    // ---- the overhead rail, its trolley and the envelope it carries
    function railBack() {
      const f = pal.face(pal.neutral, 0.04);
      [96, -96].forEach(y => { disc(RAIL.post + 3, y + 3, 0, 8, rgb(pal.line, 0.08), 0); box(RAIL.post, y, 0, 6, 6, RAIL.z + 4, f, 0.9); box(RAIL.x - 6, y, RAIL.z + 4, RAIL.post - RAIL.x + 12, 6, 4, f, 0.9); });
    }
    function railTop() {
      box(RAIL.x - 4, RAIL.y1 - 10, RAIL.z, 8, RAIL.y0 - RAIL.y1 + 26, 4, pal.face(pal.paper, 0.05), 1);
    }
    function trolley(gy) {
      box(RAIL.x - 9, gy - 11, RAIL.z - 10, 18, 22, 10, pal.face(pal.gold, 0.02));
      [-7, 7].forEach(dy => { const p = P(RAIL.x + 9, gy + dy, RAIL.z - 2); ctx.beginPath(); ctx.arc(p[0], p[1], 2.6, 0, 7); ctx.fillStyle = rgb(pal.paper); ctx.fill(); stroke(0.9); });
    }
    function envelope(e) {
      if (!e.show || e.show <= 0) return;
      const top = P(RAIL.x, e.gy, RAIL.z - 10), hang = P(RAIL.x, e.y, e.z), scr = P(PHONE.x + PHONE.w / 2, PHONE.y - 2, 86), dk = e.dock || 0;
      const p = [lerp(hang[0], scr[0], dk), lerp(hang[1], scr[1], dk)];
      ctx.save(); ctx.globalAlpha = Math.min(1, e.show * 1.5);
      if (dk < 1) { ctx.save(); ctx.globalAlpha *= 1 - dk; ctx.beginPath(); ctx.moveTo(top[0], top[1]); ctx.lineTo(hang[0], hang[1] - 14); stroke(1); ctx.restore(); }
      ctx.translate(p[0], p[1]); const k = 0.4 + 0.6 * back(Math.min(1, e.show)); ctx.scale(k, k);
      const w = 38, h = 26;
      // the report sheet rises out as it opens
      if (e.letter > 0) { ctx.fillStyle = rgb(pal.paper); const ly = -h / 2 - e.letter * 22; ctx.fillRect(-w / 2 + 4, ly, w - 8, h); ctx.strokeStyle = pal.L; ctx.lineWidth = LW; ctx.strokeRect(-w / 2 + 4, ly, w - 8, h); for (let r = 0; r < 3; r++) { ctx.fillStyle = rgb(pal[FRIENDS[r].k], 0.7); ctx.fillRect(-w / 2 + 8, ly + 5 + r * 6, w - 22, 3); } }
      ctx.fillStyle = rgb(pal.paper); ctx.fillRect(-w / 2, -h / 2, w, h); ctx.strokeStyle = pal.L; ctx.lineWidth = LW * 1.1; ctx.strokeRect(-w / 2, -h / 2, w, h);
      ctx.beginPath(); ctx.moveTo(-w / 2, h / 2); ctx.lineTo(0, 2); ctx.lineTo(w / 2, h / 2); ctx.stroke();
      const fy = -h / 2 + (h * 0.62) * (1 - 2 * e.open);
      ctx.beginPath(); ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(0, fy); ctx.lineTo(w / 2, -h / 2); ctx.closePath(); ctx.fillStyle = rgb(mixc(pal.gold, pal.paper, 0.55)); ctx.fill(); ctx.stroke();
      if (e.open < 0.5) { ctx.translate(0, fy - 2); ctx.beginPath(); ctx.arc(0, 0, 5, 0, 7); ctx.fillStyle = rgb(pal.lumi); ctx.fill(); icon('heart', 2.6, '#fff'); }
      ctx.restore();
    }

    // ---- the parent's phone: lock screen, the notification, then the exact report it opens
    function phone(s) {
      const Ph = PHONE, X1 = Ph.x + Ph.w;
      box(Ph.x - 18, Ph.y - 44, 0, Ph.w + 36, 70, 22, pal.face(mixc(pal.zuri, pal.paper, 0.6), 0));
      box(Ph.x, Ph.y - 8, Ph.z0 - 4, Ph.w, 8, Ph.z1 - Ph.z0 + 4, { top: rgb(pal.line), left: rgb(pal.line), right: rgb(mixc(pal.line, pal.paper, 0.25)) });
      onY(Ph.x, Ph.y, Ph.z1, () => {
        const W = Ph.w, Hh = Ph.z1 - Ph.z0 + 4, m = 4;
        ctx.fillStyle = rgb(pal.dark ? pal.paper : [255, 255, 255]); ctx.fillRect(m, m, W - m * 2, Hh - m * 2 - 2);
        ctx.fillStyle = rgb(pal.line, 0.7); ctx.fillRect(W / 2 - 8, m + 2, 16, 2.4);
        const rep = s.report;
        // lock screen (fades as the report opens)
        ctx.save(); ctx.globalAlpha = 1 - rep;
        ctx.fillStyle = pal.L; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = font(15, 600); ctx.fillText('5:30', W / 2, 26);
        ctx.font = font(4.4, 500, MONO); ctx.fillText(T('Futures Friends'), W / 2, 37);
        // the notification banner slides down
        if (s.badge > 0) {
          const y = 44 + (1 - ease(s.badge)) * -8;
          ctx.globalAlpha = (1 - rep) * Math.min(1, s.badge * 2);
          ctx.fillStyle = rgb(mixc(pal.gold, pal.paper, 0.78)); rr(m + 3, y, W - m * 2 - 6, 18, 4); ctx.fill(); ctx.strokeStyle = pal.L; ctx.lineWidth = LW * 0.9; ctx.stroke();
          ctx.save(); ctx.translate(m + 11, y + 9); ctx.fillStyle = rgb(pal.paper); ctx.fillRect(-5, -3.5, 10, 7); ctx.strokeRect(-5, -3.5, 10, 7); ctx.beginPath(); ctx.moveTo(-5, -3.5); ctx.lineTo(0, 0.5); ctx.lineTo(5, -3.5); ctx.stroke(); ctx.restore();
          ctx.textAlign = 'left'; ctx.fillStyle = pal.L; ctx.font = font(4.6, 600); ctx.fillText(T('Daily report'), m + 19, y + 7);
          ctx.font = font(3.6, 500, MONO); ctx.fillText(T('tap to open'), m + 19, y + 12.5);
          if (s.tap > 0 && s.tap < 1) { ctx.globalAlpha = 1 - s.tap; ctx.beginPath(); ctx.arc(W / 2, y + 9, 4 + s.tap * 16, 0, 7); ctx.strokeStyle = rgb(pal.booker); ctx.lineWidth = LW * 1.4; ctx.stroke(); }
        }
        ctx.restore();
        // the report itself
        if (rep > 0) {
          ctx.save(); ctx.globalAlpha = rep;
          ctx.fillStyle = pal.L; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          ctx.font = font(7, 600); ctx.fillText(T('Daily report'), m + 4, 16);
          ctx.font = font(3.6, 500, MONO); ctx.fillStyle = rgb(pal.line, 0.7); ctx.fillText(T('today · 5:30 pm'), m + 4, 23);
          const icons = ['star', 'moon', 'plate', 'ball'];
          for (let r = 0; r < 4; r++) {
            const y = 30 + r * 15 + (1 - ease(clamp(rep * 1.6 - r * 0.15))) * 6, k = FRIENDS[r].k;
            ctx.fillStyle = rgb(mixc(pal[k], pal.paper, 0.82)); rr(m + 2, y, W - m * 2 - 4, 12, 3); ctx.fill();
            ctx.save(); ctx.translate(m + 9, y + 6); icon(icons[r], 3.3, rgb(pal[k])); ctx.restore();
            ctx.fillStyle = rgb(pal[k], 0.55); ctx.fillRect(m + 16, y + 4, 22 - r * 2, 2); ctx.fillStyle = rgb(pal.line, 0.25); ctx.fillRect(m + 16, y + 7.5, 14, 1.5);
            ctx.save(); ctx.translate(W - m - 9, y + 6); icon('check', 2.6, rgb(pal.ok)); ctx.restore();
          }
          const y = 92; ctx.fillStyle = rgb(pal.gold); rr(m + 2, y, W - m * 2 - 4, 13, 6.5); ctx.fill();
          ctx.fillStyle = rgb(pal.line); ctx.font = font(4.2, 600); ctx.textAlign = 'center'; ctx.fillText(T('Try at home · 10 min'), W / 2, y + 6.8);
          ctx.restore();
        }
      });
      // the app badge pops on the phone's corner
      if (s.badge > 0 && s.report < 1) {
        const p = P(X1 - 2, Ph.y, Ph.z1 + 2), k = back(s.badge);
        ctx.save(); ctx.translate(p[0], p[1]); ctx.scale(k, k); ctx.beginPath(); ctx.arc(0, 0, 7, 0, 7); ctx.fillStyle = rgb(pal.lumi); ctx.fill(); ctx.strokeStyle = rgb(pal.paper); ctx.lineWidth = LW * 1.6; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = font(8, 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('1', 0, 0.5); ctx.restore();
      }
    }
    function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

    // the "try this at home" card on the return belt
    function homeCard(h) {
      if (!h || h.a <= 0) return;
      const w = 24 * h.s, d = 18 * h.s, x = h.x - w / 2, y = -311 - d / 2, z = RET.z;
      ctx.save(); ctx.globalAlpha = h.a;
      box(x, y, z, w, d, 3, { top: rgb(mixc(pal.gold, pal.paper, 0.35)), left: rgb(pal.gold), right: rgb(mixc(pal.gold, pal.line, 0.15)) }, 0.9);
      onTop(x, y, z + 3, () => { ctx.translate(w * 0.32, d * 0.5); icon('star', 4.4 * h.s, rgb(pal.paper)); ctx.translate(w * 0.36, 0); ctx.fillStyle = pal.L; ctx.font = font(5.4 * h.s, 700, MONO); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('10′', 0, 0.4); });
      ctx.restore();
    }

    // ---------------------------------------------------------------- one frame
    function frame(cam, W, H, dpr, u, t, still) {
      const s = still ? stillStory() : story(u);
      S = Math.min(W / cam.w, H / cam.h); DPR = dpr;
      LW = 1.15 / S * (W < 560 ? 1.05 : 1);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = rgb(pal.ground); ctx.fillRect(0, 0, W, H);
      ctx.setTransform(dpr * S, 0, 0, dpr * S, dpr * (W / 2 - cam.x * S), dpr * (H / 2 - cam.y * S));
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      const off = still ? 0 : u * BELT_V + t * 4;
      floor();
      house(s, t);
      belt(RET, -off);
      homeCard(s.home);
      phone(s);
      railBack();
      for (let i = 0; i < 4; i++) station(i, t, still);
      stampBack();
      belt(BELT, off);
      s.cards.forEach((c, i) => { if (c && c.x < DESK.x - 8) card(c, FRIENDS[i].icon, pal[FRIENDS[i].k]); });
      stampFront(s.stamp);
      desk(s);
      s.cards.forEach((c, i) => { if (c && c.x >= DESK.x - 8) card(c, FRIENDS[i].icon, pal[FRIENDS[i].k]); });
      railTop();
      trolley(s.env.gy);
      envelope(s.env);
      return s;
    }
    return { frame, rects };
  }

  // ---------------------------------------------------------------- camera: the stop for u, eased with a hold at each stop
  function camAt(u, W, H) {
    let i = 0; while (i < STOP_U.length - 2 && u > STOP_U[i + 1]) i++;
    const a0 = STOP_U[i], b0 = STOP_U[i + 1], h = 0.18, e = ease(clamp((u - a0 - h) / (b0 - a0 - 2 * h)));
    const a = fitStop(STOPS[i], W, H), b = fitStop(STOPS[i + 1], W, H);
    // zoom moves in log space so a push-in reads as a steady glide
    const zw = Math.exp(lerp(Math.log(a.w), Math.log(b.w), e)), zh = Math.exp(lerp(Math.log(a.h), Math.log(b.h), e));
    return { x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e), w: zw, h: zh };
  }
  // portrait stages frame each station tighter (re-centred on it), never cropping the friend
  function fitStop(st, W, H) {
    const portrait = W / H < 0.8;
    if (!portrait) return st;
    if (st === WIDE) return { x: st.x + 12, y: st.y, w: st.w * 0.9, h: st.h };   // the wide shot keeps every station, tighter at the edges
    return { x: st.x, y: st.y, w: st.w * 0.76, h: st.h * 0.76 };
  }

  // ---------------------------------------------------------------- wiring, one scope per Home render
  let live = null;
  const state = { mode: 'none', ready: false, u: 0, cap: -1, frames: 0 };
  function setup(view, root, ok) {
    if (live) { live.abort(); live = null; }
    state.mode = 'none'; state.ready = false; state.frames = 0; state.cap = -1;
    if (view !== 'home' || !root || !M()) return;
    const sec = root.querySelector('.dm');
    if (!sec) return;
    const sc = M().scope();
    live = sc;
    const motion = M().allowed(ok);
    sec.dataset.dm = motion ? 'live' : 'still';
    state.mode = sec.dataset.dm;
    const board = sec.querySelector('.dm-board'), cv = sec.querySelector('.dm-canvas'), track = sec.querySelector('.dm-track'), stage = sec.querySelector('.dm-stage');
    const capN = sec.querySelector('.dm-capn'), capT = sec.querySelector('.dm-capt'), dots = Array.from(sec.querySelectorAll('.dm-dots i'));
    if (!board || !cv || !cv.getContext) return;
    let R = null, pal = null, W = 0, H = 0, dpr = 1, raf = 0, seen = false, u = 0, first = true, last = 0, topOff = 0, stageH = 0;
    const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());

    const caption = (i, force) => {
      if (i === state.cap && !force) return;
      state.cap = i;
      capN.textContent = String(i + 1).padStart(2, '0');
      capT.textContent = T(CAPS[i]);
      dots.forEach((d, k) => d.classList.toggle('on', k === i));
      if (motion && !force && typeof capT.animate === 'function') sc.anim(capT, [{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.16,1,.3,1)' });
    };
    const size = () => {
      const r = board.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      while (dpr > 1 && W * H * dpr * dpr > 5.2e6) dpr -= 0.25;   // pixel budget on very large screens
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      if (motion) { const cs = getComputedStyle(stage); topOff = parseFloat(cs.top) || 0; stageH = stage.offsetHeight || H; }
    };
    const progress = () => {
      const r = track.getBoundingClientRect(), span = r.height - stageH;
      return span > 0 ? clamp((topOff - r.top) / span) : 0;
    };
    const draw = now => {
      if (!R) return;
      const t = ((now || t0) - t0) / 1000;
      if (motion) R.frame(camAt(u, W, H), W, H, dpr, u, t, false);
      else R.frame(fitStop(WIDE, W, H), W, H, dpr, 0, 0, true);
      state.frames++; state.u = u; state.W = W; state.H = H; state.friends = R.rects;
    };
    const tick = now => {
      raf = 0;
      if (sc.aborted || !seen) return;
      const target = progress() * U_END, dt = Math.min(0.1, Math.max(0, ((now - last) || 16) / 1000));
      last = now;
      u = first ? target : u + (target - u) * (1 - Math.exp(-dt / 0.16));
      if (Math.abs(target - u) < 1e-4) u = target;
      first = false;
      draw(now);
      caption(nearest(u));
      raf = requestAnimationFrame(tick);
    };
    const start = () => { if (!raf && motion && R) { last = performance.now(); raf = requestAnimationFrame(tick); } };
    sc.add(() => { if (raf) cancelAnimationFrame(raf); raf = 0; });

    const init = () => {
      if (R || sc.aborted) return;
      pal = palette(sec);
      const g = grain(); const gEl = sec.querySelector('.dm-grain'); if (g && gEl) gEl.style.backgroundImage = `url(${g})`;
      R = renderer(cv, pal);
      const redraw = () => { if (!sc.aborted && !motion) draw(); };
      size();
      const small = Math.min(W, H) < 560 && W < 700;
      FRIENDS.forEach(f => art(f.k, small ? f.src.replace('.webp', '-440.webp') : f.src, redraw));
      state.ready = true;
      if (motion) { u = progress() * U_END; caption(nearest(u), true); start(); } else { caption(0, true); draw(); }
    };

    // lazy: set up when the section is within a screen; frames only while the scene is on screen
    const near = sc.observe(es => es.forEach(e => { if (e.isIntersecting) { near.disconnect(); init(); } }), { rootMargin: '100% 0px 100% 0px', threshold: 0 });
    if (near) near.observe(sec); else init();
    const vis = sc.observe(es => es.forEach(e => { seen = e.isIntersecting; if (seen) { init(); first = true; start(); } }), { threshold: 0 });
    if (vis) vis.observe(motion ? track : board); else seen = true;
    let rid = 0;
    const refit = () => { clearTimeout(rid); rid = setTimeout(() => { if (sc.aborted || !R) return; size(); draw(); }, 80); };
    if (typeof ResizeObserver === 'function') { const ro = new ResizeObserver(refit); ro.observe(board); sc.add(() => ro.disconnect()); } else sc.listen(window, 'resize', refit);
    sc.add(() => clearTimeout(rid));
    sc.listen(document, 'ff:lang', () => { if (!R) return; caption(state.cap < 0 ? 0 : state.cap, true); draw(); });
  }

  window.FFhooks = window.FFhooks || [];
  window.FFhooks.push(setup);
  window.FFDayMachine = { section, setup, CAPS, STEPS, FRIENDS, STOPS, STOP_U, story, state: () => Object.assign({}, state, { friends: Object.assign({}, state.friends) }) };
})();
