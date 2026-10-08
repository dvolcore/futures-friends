/* Booker walks the path (wave 8; owner 2026-10-06 chose BOOKER WALKS THE PATH). The meadow's dirt path leaves the hero and winds
   down the whole Home page as a stitched felt trail: down one side margin through a section, across the gap to the other side
   where two sections meet, down again, and at the bottom into the friends' night strip above the footer. It draws itself ahead of
   Booker as the page scrolls (GSAP DrawSVG when present), and a small Booker walks it with the scroll (GSAP MotionPath when
   present): footstep bob, a lean toward where he is going, a stop and a wave where each section begins, and at the end he joins
   his friends for goodnight.
   Rules kept: Booker is the existing plush art (img/plush/characters, the standing and the waving pose), scaled uniformly, never
   mirrored (his hoodie's book and backpack read one way; he leans instead of turning). He never covers text or a control: every
   frame his box is checked against the page's links, buttons and text, 16 px clear of tap targets, and on wide screens he steps
   out of sight (behind the felt) wherever words come under him. On phones the margin is only about 20 px, so with the wide-screen
   16 px clearance he was hidden almost everywhere (he popped in only at the gaps between sections). There he is small and tucks
   against the screen edge (about two thirds of him on screen, the trail beside him), so he fits the margin, stays clear of every
   word and tap target with no extra clearance, and is seen the whole way down. While
   the friends' own parade walks the day path (desktop), he is part of it, so this Booker waits out of sight.
   Reduced motion / motion switch: the trail is simply there, fully drawn; no walker. The layer is aria-hidden decoration with no
   information. Sends nothing (sound requests are `ff:sfx` events: footstep, wave, hop, land). */
(function () {
  'use strict';
  const POSE_WALK = 'booker', POSE_WAVE = 'booker-waving';
  let live = null;
  const M = () => window.FFMotion;
  const sfx = (name, x, gain) => { try { document.dispatchEvent(new CustomEvent('ff:sfx', { detail: { name, x: x == null ? 0 : Math.max(-1, Math.min(1, x)), gain } })); } catch (e) { /* fire and forget */ } };
  const NS = 'http://www.w3.org/2000/svg';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function geometry(root) {
    const de = document.documentElement, vw = de.clientWidth || innerWidth, vh = innerHeight, sy = scrollY;
    const phone = vw < 700;
    const H = phone ? 38 : 64, W = Math.round(H * 0.7);   // (phone: small, and tucked against the screen edge so he fits the 20 px page margin)
    const wrap = root.querySelector('.hc-doors > .wrap');
    if (!wrap) return null;
    const wr = wrap.getBoundingClientRect(), cs = getComputedStyle(wrap);
    const cl = wr.left + parseFloat(cs.paddingLeft), cr = wr.right - parseFloat(cs.paddingRight);
    const gx = g => (g >= W + 22 ? Math.min(g - 16 - W / 2, Math.max(W / 2 + 6, g / 2)) : g / 2);
    const xL = gx(cl), xR = vw - gx(vw - cr);
    const box = el => { const r = el.getBoundingClientRect(); return { top: r.top + sy, bottom: r.bottom + sy, left: r.left, right: r.right }; };
    const hero = root.querySelector('.px-homehero');
    const hb = hero ? box(hero).bottom : 0;
    // the first words under the hero (the doors' heading): the trail's turn out of the hero must be finished above them
    const head = root.querySelector('.hc-doors > .wrap > *');
    const firstTop = head ? box(head).top : Infinity;
    const secs = ['.hc-doors', '.hc-friends', '.hc-day', '.hc-proof', '.ff-endorse', '.hc-trust', '.hc-close'].map(s => root.querySelector(s)).filter(Boolean);
    const inner = s => { const w = s.querySelector(':scope > .wrap') || s; return box(w); };
    // the doors' band runs on through the status line
    const status = root.querySelector('.hc-status');
    const fs = document.querySelector('.ff-footscene');
    const row = fs && fs.querySelector('.ff-footscene-row');
    const crossings = [];
    for (let i = 0; i < secs.length - 1; i++) {
      const a = (i === 0 && status) ? inner(status) : inner(secs[i]), b = inner(secs[i + 1]);
      const gapTop = a.bottom, gapBot = b.top;
      const yc = clamp((gapTop + gapBot) / 2 + H * 0.42, gapTop + 8, gapBot - 4);
      crossings.push(yc);
    }
    // the end: beside the friends in the night strip, on the side the trail arrives from (the trail alternates margins, starting
    // on the left, so after the last crossing it is on the left when the number of crossings is even), feet on their ground
    let end = null;
    if (fs && row) {
      const friends = Array.from(fs.querySelectorAll('.ff-footfriend')), art = fs.querySelector('.ff-footart');
      const ar = art ? art.getBoundingClientRect() : row.getBoundingClientRect(), fy = ar.bottom + sy - 2;
      const left = friends.length ? friends[0].getBoundingClientRect().left : vw / 2, right = friends.length ? friends[friends.length - 1].getBoundingClientRect().right : vw / 2;
      const arriveRight = crossings.length % 2 === 1;
      if (arriveRight && vw - right > W + 40) end = { x: right + W / 2 + 22, y: fy };
      else if (!arriveRight && left > W + 40) end = { x: left - W / 2 - 22, y: fy };
      else end = { x: arriveRight ? Math.min(vw - W / 2 - 4, right + W / 2) : Math.max(W / 2 + 4, left - W / 2), y: fy };
      end.top = box(fs).top; end.closeBottom = inner(secs[secs.length - 1]).bottom;
    }
    return { vw, vh, phone, H, W, xL, xR, hb, firstTop, crossings, secs: secs.map(box), end, layerH: fs ? box(fs).bottom : (secs.length ? box(secs[secs.length - 1]).bottom : 0) };
  }

  // Build the trail as segments: a start curve out of the hero, then for each section a run down one margin and a crossing to the
  // other margin where it meets the next section, then the last run into the night strip.
  function segments(g) {
    const S = [];
    const R = g.phone ? 26 : 40;
    let side = 0; // 0 = left margin, 1 = right
    const X = s => (s ? g.xR : g.xL);
    const mid = g.vw / 2;
    // start: from the hero's meadow path (bottom centre) out to the left margin
    // (visual audit follow-up: at 768 the turn swept over the first letters of "Start where you are"; it now ends 10 px above the
    // heading, tightening the turn when the gap under the hero is short. Down the margin the trail stays left of the words.)
    const y0 = g.hb - 2, clear = (g.firstTop || Infinity) - 10;
    let ys = g.hb + (g.phone ? 26 : 34), R0 = R;
    if (ys + R0 > clear) { ys = Math.max(g.hb + 4, clear - R0); R0 = Math.max(10, Math.min(R0, clear - ys)); }
    S.push({ kind: 'start', d: `M ${mid} ${y0} C ${mid} ${ys}, ${mid - (mid - X(0)) * 0.25} ${ys}, ${(mid + X(0)) / 2} ${ys} S ${X(0)} ${ys}, ${X(0)} ${ys + R0}`, yc: ys });
    let y = ys + R0;
    g.crossings.forEach((yc, i) => {
      const x = X(side), nx = X(1 - side), dir = nx > x ? 1 : -1;
      // run down the margin, with a gentle felt wiggle that stays inside the margin
      const amp = Math.max(0, Math.min(8, (side ? g.vw - g.xR : g.xL) - 8));
      const yEnd = yc - R;
      if (yEnd > y + 4) {
        const n = Math.max(1, Math.round((yEnd - y) / 260)), step = (yEnd - y) / n;
        let d = `M ${x} ${y}`;
        for (let k = 0; k < n; k++) { const a = y + step * k, b = a + step, w = (k % 2 ? -1 : 1) * amp; d += ` C ${x + w} ${a + step / 3}, ${x + w} ${a + step * 2 / 3}, ${x} ${b}`; }
        S.push({ kind: 'run', d, y0: y, y1: yEnd, x });
      }
      // the crossing: a rounded turn, a softly waving line across the gap, a rounded turn down
      const x1 = x + dir * R, x2 = nx - dir * R, L = x2 - x1;
      S.push({ kind: 'cross', i, yc, d: `M ${x} ${yc - R} Q ${x} ${yc}, ${x1} ${yc} C ${x1 + L / 3} ${yc - 9}, ${x1 + L * 2 / 3} ${yc + 9}, ${x2} ${yc} Q ${nx} ${yc}, ${nx} ${yc + R}` });
      y = yc + R; side = 1 - side;
    });
    // last run down the dusk band's margin, then into the night strip beside the friends
    if (g.end) {
      const x = X(side), yTurn = Math.max(y + 8, g.end.closeBottom + 10);
      if (yTurn > y + 4) S.push({ kind: 'run', d: `M ${x} ${y} L ${x} ${yTurn}`, y0: y, y1: yTurn, x });
      S.push({ kind: 'end', yc: g.end.y, d: `M ${x} ${yTurn} C ${x} ${(yTurn + g.end.y * 2) / 3}, ${x} ${g.end.y}, ${g.end.x} ${g.end.y}` });
    }
    return S;
  }

  // scroll interval for each segment: Booker reaches each gap while it is low on the screen, crosses while it rises, then waits a
  // moment there and waves; down the margins he walks a little faster than the page scrolls.
  function timeline(S, g) {
    const maxS = Math.max(1, document.documentElement.scrollHeight - g.vh);
    let prev = 0;
    const out = S.map(seg => {
      let s0, s1, dwell = 0;
      if (seg.kind === 'start') { s0 = seg.yc - g.vh * 0.95; s1 = seg.yc - g.vh * 0.62; }
      else if (seg.kind === 'cross') { s0 = seg.yc - g.vh * 0.8; s1 = seg.yc - g.vh * 0.44; dwell = g.vh * 0.08; }
      else if (seg.kind === 'end') { s0 = seg.yc - g.vh * 0.9; s1 = seg.yc - g.vh * 0.55; }
      else { s0 = null; s1 = null; }
      return { seg, s0, s1, dwell };
    });
    // runs fill the time between their neighbours
    out.forEach((e, i) => {
      if (e.s0 !== null) return;
      const p = out[i - 1], n = out[i + 1];
      e.s0 = p ? p.s1 + p.dwell : 0; e.s1 = n ? n.s0 : e.s0 + 200;
    });
    out.forEach(e => {
      e.s0 = clamp(e.s0, 0, maxS); e.s1 = clamp(e.s1, 0, maxS);
      if (e.s0 < prev) e.s0 = prev;
      if (e.s1 < e.s0 + 24) e.s1 = Math.min(maxS, e.s0 + 24);
      if (e.s1 <= e.s0) e.s1 = e.s0 + 1;
      prev = e.s1 + e.dwell;
    });
    return out;
  }

  function svgSeg(layer, seg, g) {
    const p = document.createElementNS(NS, 'path'); p.setAttribute('d', seg.d);
    // measure in a scratch svg to get the bounding box
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'bw-seg'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
    layer.appendChild(svg); svg.appendChild(p);
    const bb = p.getBBox(), pad = 14;
    const x = bb.x - pad, y = bb.y - pad, w = bb.width + pad * 2, h = bb.height + pad * 2;
    Object.assign(svg.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
    svg.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
    p.remove();
    const id = 'bw-m-' + Math.random().toString(36).slice(2, 8);
    const bw = g.phone ? 7 : 11;
    svg.innerHTML = `<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="${x}" y="${y}" width="${w}" height="${h}"><path class="bw-reveal" d="${seg.d}" stroke="#fff" stroke-width="${bw + 8}" fill="none" stroke-linecap="round"/></mask></defs>
      <g mask="url(#${id})"><path class="bw-edge" d="${seg.d}" stroke-width="${bw + 3}"/><path class="bw-band" d="${seg.d}" stroke-width="${bw}"/><path class="bw-stitch" d="${seg.d}" stroke-width="${g.phone ? 1.4 : 1.8}"/></g>`;
    const reveal = svg.querySelector('.bw-reveal'), band = svg.querySelector('.bw-band');
    const len = band.getTotalLength();
    return { svg, reveal, band, len };
  }

  function setup(view, root, ok) {
    if (live) { live.abort(); live = null; }
    const old = document.getElementById('bw-layer'); if (old) old.remove();
    if (view !== 'home' || !root || !M()) return;
    const sc = M().scope();
    live = sc;
    const motion = M().allowed(ok);
    const gsap = window.gsap, MP = window.MotionPathPlugin, DS = window.DrawSVGPlugin;
    try { if (gsap && MP) gsap.registerPlugin(MP); if (gsap && DS) gsap.registerPlugin(DS); } catch (e) { /* registered already */ }

    let layer = null, segs = [], T = [], g = null, walker = null, state = { dist: 0, steps: 0, lastX: null, lean: 0, waved: {}, home: false, pose: 'walk' };
    // phones: the exact boxes of words and controls (no extra clearance: the margin is too narrow for it); wide screens: 16 px / 4 px
    const obstacles = () => (window.FFHomeDay && window.FFHomeDay.obstacles ? window.FFHomeDay.obstacles(g && g.phone ? 0 : 1) : []);
    let obs = [], obsAt = 0, Sx = [], lastScroll = -1, lastMove = 0;
    const draw = (s, f) => {
      f = clamp(f, 0, 1);
      if (s.f === f) return; s.f = f;
      if (gsap && DS) gsap.set(s.reveal, { drawSVG: `0% ${(f * 100).toFixed(2)}%` });
      else { s.reveal.style.strokeDasharray = `${s.len} ${s.len}`; s.reveal.style.strokeDashoffset = String(s.len * (1 - f)); }
    };
    const at = (s, t) => {
      if (s.raw && MP && MP.getPositionOnPath) { const p = MP.getPositionOnPath(s.raw, clamp(t, 0, 1), false); return { x: p.x, y: p.y }; }
      const p = s.band.getPointAtLength(s.len * clamp(t, 0, 1)); return { x: p.x, y: p.y };
    };

    function build() {
      if (sc.aborted) return;
      if (layer) layer.remove();
      g = geometry(root);
      if (!g) return;
      state.lastPos = null;
      layer = document.createElement('div');
      layer.id = 'bw-layer';
      layer.setAttribute('aria-hidden', 'true');
      layer.style.height = Math.ceil(g.layerH) + 'px';
      document.body.appendChild(layer);
      const S = segments(g); Sx = S;
      segs = S.map(seg => Object.assign(svgSeg(layer, seg, g), { seg }));
      segs.forEach(s => { if (MP && MP.getRawPath) { try { s.raw = MP.getRawPath(s.band); MP.cacheRawPathMeasurements(s.raw); } catch (e) { s.raw = null; } } });
      T = timeline(S, g);
      obs = obstacles(); obsAt = performance.now();
      layer.dataset.segments = String(segs.length);
      if (!motion) { segs.forEach(s => draw(s, 1)); return; }
      segs.forEach(s => draw(s, 0));
      // a rebuild (resize, late pictures) keeps the same walker element, so he never blinks out and back in
      const fresh = !walker;
      if (fresh) walker = document.createElement('span');
      walker.className = 'bw-walker' + (state.pose === 'wave' ? ' is-waving' : '') + (walker.classList.contains('is-on') ? ' is-on' : '');
      walker.dataset.surprise = 'booker'; walker.dataset.label = 'Tap Booker on his path: he hops';
      walker.style.setProperty('--bw-h', g.H + 'px');
      walker.style.setProperty('--bw-w', g.W + 'px');
      const P = window.FFPlush;
      walker.innerHTML = `<span class="bw-shadow"></span><span class="bw-body">${P ? P.img(POSE_WALK, { cls: 'bw-pose bw-walk', alt: '', h: g.H }) + P.img(POSE_WAVE, { cls: 'bw-pose bw-wave', alt: '', h: g.H }) : ''}</span>`;
      layer.appendChild(walker);
      if (fresh) sc.listen(walker, 'click', () => {
        sfx('hop', state.lastX == null ? 0 : state.lastX / g.vw * 2 - 1, 0.7);
        const body = walker.querySelector('.bw-body');
        body.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-34%)', offset: .4, easing: 'cubic-bezier(.2,.8,.4,1)' }, { transform: 'translateY(0)', offset: .8 }, { transform: 'translateY(-6%)', offset: .9 }, { transform: 'translateY(0)' }], { duration: 560 });
        if (window.FFHomeDay && window.FFHomeDay.badge) window.FFHomeDay.badge(walker, 'booker');
      });
      tick();
    }

    const setPose = p => { if (state.pose === p || !walker) return; state.pose = p; walker.classList.toggle('is-waving', p === 'wave'); };
    function tick() {
      if (!walker || sc.aborted || !T.length) return;
      const s = scrollY, vh = g.vh;
      // draw: everything up to a quarter screen ahead of Booker
      const lead = s + vh * 0.25;
      T.forEach((e, i) => draw(segs[i], (lead - e.s0) / (e.s1 - e.s0)));
      // where is Booker?
      let i = T.findIndex(e => s < e.s1 + e.dwell);
      if (i < 0) i = T.length - 1;
      const e = T[i], t = clamp((s - e.s0) / (e.s1 - e.s0), 0, 1);
      const pos = at(segs[i], s < T[0].s0 ? 0 : t);
      const inDwell = e.seg.kind === 'cross' && s >= e.s1 && s < e.s1 + e.dwell;
      const atEnd = i === T.length - 1 && s >= e.s1 - 2;
      // walking: bob with each step, lean toward where he is going (never mirrored)
      const moved = state.lastPos ? Math.hypot(pos.x - state.lastPos.x, pos.y - state.lastPos.y) : 0;
      if (moved > 0.2 && moved < 400) state.dist += moved;
      const dx = state.lastPos ? pos.x - state.lastPos.x : 0;
      state.lean += ((Math.abs(dx) > 0.3 ? Math.sign(dx) * 3 : 0) - state.lean) * 0.25;
      state.lastPos = pos; state.lastX = pos.x;
      // phone: down the margins he tucks against the screen edge (box from -11 px to W-11 px, clear of the words); in the gaps he walks free
      let wx = pos.x;
      if (g.phone) { const edge = Math.min(pos.x, g.vw - pos.x), tuck = clamp(1 - (edge - 14) / 26, 0, 1), home = pos.x < g.vw / 2 ? g.W / 2 - 11 : g.vw - g.W / 2 + 11; wx = pos.x + (home - pos.x) * tuck; }
      const ph = state.dist / 22 * Math.PI, bob = -Math.abs(Math.sin(ph)) * (g.phone ? 2.5 : 3.5), rock = Math.sin(ph) * 2.2;
      walker.style.transform = `translate3d(${(wx - g.W / 2).toFixed(1)}px, ${(pos.y - g.H + 3).toFixed(1)}px, 0)`;
      walker.style.setProperty('--bob', `${bob.toFixed(2)}px`);
      walker.style.setProperty('--rock', `${(rock + state.lean).toFixed(2)}deg`);
      // visible only where nothing is under him (16 px clear of tap targets), never over the hero, never beside the parade
      const box = { l: wx - g.W / 2, r: wx + g.W / 2, t: pos.y - g.H, b: pos.y + 4 };
      if (performance.now() - obsAt > 500) { obs = obstacles(); obsAt = performance.now(); }   // the page moves under him (photos, fonts, opened transcripts): never trust an old map
      const blocked = obs.some(o => !(box.r <= o.l || box.l >= o.r || box.b <= o.t || box.t >= o.b));
      const parade = !g.phone && (() => { const p = root.querySelector('.hc-trail-live .hc-parade'); if (!p || !p.offsetParent) return false; const r = p.getBoundingClientRect(); return r.bottom > vh * 0.08 && r.top < vh * 0.92; })();
      // fixed controls stay clear too: back-to-top and the sound toggle (sound.js, bottom right)
      const yv = pos.y - s, fp = g.phone ? 0 : 16;
      const fixedHit = [...document.querySelectorAll('.totop.on, .ffs')].some(b => { const r = b.getBoundingClientRect(); return r.width && !(box.r <= r.left - fp || box.l >= r.right + fp || yv <= r.top - fp || yv - g.H >= r.bottom + fp); });
      const hdr = document.querySelector('header.bar'), hb = hdr ? hdr.getBoundingClientRect().bottom : 0, under = g.phone ? pos.y - s < hb + 2 : pos.y - s - g.H < hb + 16;
      const before = s < T[0].s0 + 4;
      const on = !blocked && !parade && !fixedHit && !under && !before && !state.home;
      walker.classList.toggle('is-on', on);
      walker.dataset.seg = String(i);
      // footsteps (only while seen and walking)
      const steps = Math.floor(state.dist / 44);
      if (steps !== state.steps) { if (on && moved > 0.5) sfx('footstep', pos.x / g.vw * 2 - 1, 0.18); state.steps = steps; }
      // a stop where each section begins: he waves
      if (inDwell && !state.waved[i]) { state.waved[i] = true; setPose('wave'); if (on) sfx('wave', pos.x / g.vw * 2 - 1, 0.5); sc.timer(() => setPose('walk'), 1100); }
      if (e.seg.kind === 'cross' && s < e.s0 - vh * 0.2) state.waved[i] = false;
      T.forEach((x, j) => { if (x.seg.kind === 'cross' && s < x.s0 - vh * 0.2) state.waved[j] = false; });
      // the end: he joins the friends for goodnight (the strip's Booker hops to welcome him)
      if (atEnd && !state.joined) {
        state.joined = true;
        sc.timer(() => {
          state.home = true; walker.classList.remove('is-on');
          const fb = document.querySelector('.ff-footfriend[data-k=booker] .ff-footcut');
          if (fb && M().allowed()) fb.animate([{ transform: 'none' }, { transform: 'translateY(-12%)', offset: .35 }, { transform: 'none', offset: .7 }, { transform: 'translateY(-3%)', offset: .85 }, { transform: 'none' }], { duration: 640, easing: 'cubic-bezier(.3,.7,.4,1)' });
          sfx('land', 0, 0.5);
        }, 500);
      }
      if (!atEnd && state.joined && s < e.s0) { state.joined = false; state.home = false; }
    }

    // one rAF loop that runs while the page is moving (and a moment after), so he is placed every frame of a scroll or a momentum
    // fling, on the same frame the page paints, not only on the frames a scroll event happens to arrive (iOS delivers few of them)
    let id = 0;
    const frame = () => {
      id = 0; tick();
      const now = performance.now();
      if (scrollY !== lastScroll) { lastScroll = scrollY; lastMove = now; }
      if (now - lastMove < 160 && !sc.aborted) id = requestAnimationFrame(frame);
    };
    function queue() { lastMove = performance.now(); if (!id) id = requestAnimationFrame(frame); }
    sc.add(() => { if (id) cancelAnimationFrame(id); if (layer) layer.remove(); });
    if (motion) sc.listen(window, 'scroll', queue, { passive: true });
    let bid = 0;
    const rebuild = () => { clearTimeout(bid); bid = setTimeout(() => { state = Object.assign(state, { lastPos: null }); build(); }, 180); };
    // iPhone Safari: the toolbar sliding in and out resizes the window (height only) many times during one scroll. That must not
    // rebuild the trail (the old behaviour: the walker vanished and faded back in); only the screen height used by the timeline changes.
    let lastW = document.documentElement.clientWidth || innerWidth;
    const viewportChanged = () => {
      const w = document.documentElement.clientWidth || innerWidth;
      if (Math.abs(w - lastW) > 1) { lastW = w; rebuild(); return; }
      const vh = (window.visualViewport && window.visualViewport.height) || innerHeight;
      if (g && walker && Math.abs(vh - g.vh) > 1) { g.vh = Math.max(vh, innerHeight); T = timeline(Sx, g); }
      queue();
    };
    sc.listen(window, 'resize', viewportChanged);
    if (window.visualViewport) { sc.listen(window.visualViewport, 'resize', viewportChanged); sc.listen(window.visualViewport, 'scroll', () => queue(), { passive: true }); }
    if (typeof ResizeObserver === 'function') { const ro = new ResizeObserver(rebuild); ro.observe(root); sc.add(() => ro.disconnect()); }
    sc.add(() => clearTimeout(bid));
    // lazy: the trail is built once the page has settled (idle), never in the first frame
    const start = () => { if (!sc.aborted && !layer) build(); };
    // (never during the hero's opening: wait for it to finish, then for an idle moment)
    const idle = () => { if ('requestIdleCallback' in window) { const rid = requestIdleCallback(start, { timeout: 1500 }); sc.add(() => cancelIdleCallback(rid)); } else sc.timer(start, 600); };
    const heroOpening = () => { const hh = root.querySelector('.mh-hero'); return hh && hh.dataset.opening === 'playing'; };
    const waitHero = (n = 0) => { if (sc.aborted || layer) return; if (heroOpening() && n < 40) sc.timer(() => waitHero(n + 1), 250); else idle(); };
    waitHero();
    sc.listen(window, 'scroll', () => { if (!layer) start(); }, { passive: true, once: true });
    window.FFBookerWalk.state = () => ({ segments: segs.length, timeline: T.map(e => ({ kind: e.seg.kind, s0: Math.round(e.s0), s1: Math.round(e.s1) })), on: !!(walker && walker.classList.contains('is-on')), seg: walker ? +walker.dataset.seg : -1, geometry: g && { xL: g.xL, xR: g.xR, H: g.H, W: g.W } });
  }

  window.FFhooks = window.FFhooks || [];
  window.FFhooks.push(setup);
  window.FFBookerWalk = { setup, geometry, segments, timeline, state: null };
})();
