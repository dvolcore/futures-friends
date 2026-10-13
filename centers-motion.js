/* Futures Friends: the Centers & Programs pages come alive (owner 2026-10-12: the centers side "is not matching the rest ... needs motion
   graphics, animations, and just all the characters"). Brings #centers, #for-centers, #for-home, #for-faith, #pricing and #book-demo up
   to the level of Home and the Families side, using only what the site already has: the plush cast (FFPlush, the official cut-outs, never
   redrawn), the story-world rooms, the motion kit (ff-motion.js scope, tokens, magnet), the reveal and heading rise (ff-reveal.js) and the
   felt sounds (sound.js, only when the visitor has sound on).

   1. A living hero on every page (markup, decorated inside render() before first paint, so nothing jumps): a story-world room in a
      fixed-ratio stage with a grown-up of the cast (Principal Hazel, Ms. June, Ms. Fern, Mr. Moss) and the friends standing in it,
      labelled "Illustration · Story-world characters" (FFArt.flag) like every other story-world scene. With motion: the room settles,
      the grown-up steps in and waves, the friends hop in one by one (spring token), then everyone breathes gently; a fine pointer gives
      the room and the cast a little depth. Any key, tap or wheel finishes the entrance at once (skippable).
   2. One signature moment per page:
      #centers      the director's "How a day travels" moves up under the program cards, followed by a peek at the real director
                    dashboard of the Futures Hub preview (a framed screenshot, sample data) whose highlight tours its own panels once;
                    the "What we have built so far" numbers count up when they arrive (numbers already on the page).
      #for-centers  "Four zones, open all day": the rooms light up one by one, each friend popping up in its zone with its pillar
      #for-home     (Booker LEARN, Lumi BELONG, Zuri EXPLORE, Bop MOVE). On #for-home the hero builds like a cozy room: the room
      #for-faith    warms, a lamp glow comes on, then the cast arrives. On #for-faith a felt sun rises behind the hall.
      #pricing      the three package cards turn in one by one and their published prices count up to the exact catalog figure.
      #book-demo    "What happens next": the three steps are stitched together by a gold thread as they arrive.
      everywhere    "Trusted by professionals": the reviewer cards get a gold stitch drawn around them as they arrive (their words
                    and photos untouched).
   Reduced motion or the Decorative motion switch (FFMotion.allowed()): the same pages, still and complete (every friend in place, every
   room lit, every price final). Character art only ever moves, rotates or scales uniformly, and is always whole inside its stage.
   Sends nothing, stores nothing. Loaded after audiences.js, pricing-all-in.js and ff-signatures.js, before FFstart(). */
(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof V === 'undefined') return;
  const W = window, doc = document;
  const M = () => W.FFMotion, PL = () => W.FFPlush;
  const E = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const T = en => (W.FFi18n && typeof W.FFi18n.t === 'function' ? W.FFi18n.t(en) : en);
  const ES = {
    'Director portal': 'Portal de dirección',
    'The center dashboard': 'El panel del centro',
    'Try the director portal': 'Prueba el portal de dirección',
    'Interactive demo (sample data)': 'Demo interactiva (datos de ejemplo)',
    'The director dashboard of the Futures Hub preview, with sample data: ratio coverage for every room, enrollment, attendance today, staff on the clock, the ratio board and what needs attention.':
      'El panel de dirección de la vista previa de Futures Hub, con datos de ejemplo: proporciones cubiertas en cada salón, inscripción, asistencia de hoy, personal en turno, el tablero de proporciones y lo que necesita atención.',
    'Storybook illustration': 'Ilustración de cuento',
    'Story-world characters': 'Personajes del mundo del cuento',
    LEARN: 'APRENDE', BELONG: 'PERTENECE', EXPLORE: 'EXPLORA', MOVE: 'MUÉVETE'
  };
  try { if (W.FFi18n && W.FFi18n.add) W.FFi18n.add('es', ES); } catch (e) { /* Spanish is optional */ }

  // ---------------------------------------------------------------- the stages: room, grown-up, friends (x = centre, % of the stage)
  const ENV_ALT = {
    'school-arrival-entrance': 'Plush-world school entrance: a big felt sign over wooden double doors, flower beds and a curved path.',
    'school-exterior-wide': 'Plush-world school seen from the gate: a long building with red felt roofs, a heart gate and flower beds under a blue sky.',
    'hall-reception': 'Plush-world reception hall: a welcome desk with felt leaves, a green sofa and bench, arched doorways and an oval rug leading to the front doors.',
    'classroom-empty-master': 'Plush-world classroom: round rug, reading bench, art shelves, small tables and a leaf-canopy nook by a sunny window.',
    'classroom-reverse-angle': 'Plush-world classroom seen from the other side: green door with a round window, felt sun and tree wall art, shelves, small tables and a round rug.',
    'activity-rug': 'Plush-world classroom: a round green rug with a stitched yellow border, small tables and chairs, cubbies with backpacks and a leaf-canopy reading nook by the window.'
  };
  const FOUR = [['booker', 37], ['lumi', 53], ['zuri', 69], ['bop', 86]];
  const STAGES = {
    centers: { env: 'school-arrival-entrance', lead: ['principal-hazel', 16], cast: FOUR },
    'for-centers': { env: 'classroom-empty-master', lead: ['ms-june', 15], cast: [['booker', 36], ['zuri-pointing', 53], ['lumi', 69], ['bop-waving', 86]] },
    'for-home': { env: 'classroom-reverse-angle', lead: ['ms-fern', 16], cast: [['lumi', 37], ['bop-waving', 55], ['booker', 72], ['zuri', 88]], cozy: true },
    'for-faith': { env: 'activity-rug', lead: ['mr-moss', 16], cast: [['lumi-heart-hands', 38], ['booker', 55], ['zuri', 71], ['bop', 87]], sun: true },
    pricing: { env: 'school-exterior-wide', lead: ['principal-hazel', 15], cast: FOUR, sky: true },
    'book-demo': { env: 'hall-reception', lead: ['principal-hazel', 22], cast: [['booker', 50], ['zuri', 74]] }
  };
  const UNIT = 62;                         // a grown-up of lineup scale 1.0 stands this tall, % of the stage height

  function envImg(e, said) {
    const b = `img/plush/environments/${e}`;
    return `<img class="cm-room" src="${b}-1600.webp" srcset="${b}-800.webp 800w, ${b}-1600.webp 1600w" sizes="100vw" alt="${E((ENV_ALT[e] || '') + (said ? ' ' + said : ''))}" width="1600" height="900" fetchpriority="high" decoding="async">`;
  }
  // the hero's world, full bleed behind the card: the room, a felt sun or cloud, a lamp glow (cozy), and the honesty chip
  function world(route) {
    const s = STAGES[route], P = PL();
    if (!s || !P) return null;
    const all = [s.lead].concat(s.cast).filter(c => P.has(c[0])).map(c => c.slice());
    const names = all.map(c => P.name(c[0]));
    const said = names.length > 1 ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] + ' are in front.' : '';
    const bg = `<div class="cm-world" style="--pos:${s.pos || 'center 62%'}">${envImg(s.env, said)}<span class="cm-veil" aria-hidden="true"></span>${s.sun ? '<img class="cm-sun" src="img/plush/hero/felt-sun-320.webp" alt="" aria-hidden="true" width="320" height="320" decoding="async">' : ''}${s.sky ? '<img class="cm-cloud" src="img/plush/hero/felt-cloud-2-480.webp" alt="" aria-hidden="true" width="480" height="300" decoding="async" loading="lazy">' : ''}${s.cozy ? '<span class="cm-lamp" aria-hidden="true"></span>' : ''}</div>`;
    // positions from the cut-outs' own widths (% of the cast box, whose shape is fixed at 1.1:1 in CSS): everyone fits inside the box,
    // the grown-up a step apart, the friends close together (overlapping a little only when the box is crowded)
    const ASPECT = 1.1, M0 = 2, GAP = 3;
    const wid = all.map(([k]) => UNIT * P.P[k].scale * P.ratio(k) / ASPECT);
    const room = 100 - 2 * M0 - GAP, sum = wid.reduce((a, b) => a + b, 0);
    const step = sum <= room ? (room - sum) / Math.max(1, all.length - 1) : -(sum - room) / Math.max(1, all.length - 2);
    let at = M0;
    const xs = wid.map((w, i) => { const c = at + w / 2; at += w + (i === 0 ? GAP + Math.max(0, step) : step); return c; });
    all.forEach((c, i) => { c[1] = +xs[i].toFixed(2); });
    const ch = ([k, x], i) => {
      const h = UNIT * P.P[k].scale, hpx = Math.round(i ? 170 : 280);
      return `<span class="cm-ch${i ? '' : ' cm-lead'}" style="--x:${x}%;--h:${h.toFixed(1)}%;--ar:${P.ratio(k).toFixed(4)};--i:${i}" data-cm-ch="${E(k)}"><i class="cm-bob">${P.img(k, { alt: '', h: hpx, eager: true })}</i></span>`;
    };
    const cast = `<div class="cm-cast">${all.map(ch).join('')}</div>`;
    const chip = `<span class="cm-chip"><span>Storybook illustration</span> · <span>Story-world characters</span></span>`;
    return { bg, cast, chip, cozy: !!s.cozy };
  }
  const stage = route => { const w = world(route); return w ? w.bg + w.cast + w.chip : ''; };

  // ---------------------------------------------------------------- markup decoration (inside render(), before first paint)
  const ZONE = { booker: 'LEARN', lumi: 'BELONG', zuri: 'EXPLORE', bop: 'MOVE' };
  function decorate(route, html) {
    if (typeof doc.createElement !== 'function') return html;
    const t = doc.createElement('template');
    t.innerHTML = html;
    const R = t.content;
    // 1. the living hero: the world full bleed, the words on a frosted card, the cast standing in the scene
    const hero = R.querySelector('.phero');
    const w = world(route);
    if (hero && w) {
      hero.classList.add('cm-hero');
      if (w.cozy) hero.classList.add('cm-cozy');
      hero.setAttribute('data-cm-hero', route);
      const wrap = hero.querySelector('.wrap');
      let art = hero.querySelector('.art');
      if (!art) { art = doc.createElement('div'); wrap.appendChild(art); }
      art.className = 'art cm-art';
      art.innerHTML = w.cast;
      const txt = wrap.firstElementChild;
      if (txt && txt !== art) txt.classList.add('cm-card');
      hero.insertAdjacentHTML('afterbegin', w.bg);
      hero.insertAdjacentHTML('beforeend', w.chip);
      const gold = hero.querySelector('.btn.gold');
      if (gold) gold.setAttribute('data-ff-magnet', '');
    }
    // 2. the learning zones (#for-centers, #for-home, #for-faith): each card gets its friend and its pillar
    if (/^for-(centers|home|faith)$/.test(route) && PL()) {
      const g = Array.from(R.querySelectorAll('.grid.g4')).find(x => x.children.length === 4 && x.querySelector('b[style*="var(--booker)"]'));
      if (g) {
        g.classList.add('cm-zones');
        g.setAttribute('data-ff-reveal', 'off');
        Array.from(g.children).forEach(c => {
          const k = (/var\(--(booker|lumi|zuri|bop)\)/.exec(c.getAttribute('style') || '') || [])[1];
          if (!k) return;
          c.classList.add('cm-zone');
          c.style.setProperty('--c', `var(--${k})`);
          c.insertAdjacentHTML('afterbegin', `<span class="cm-zonetop"><span class="cm-pillar">${ZONE[k]}</span><span class="cm-zonefr" aria-hidden="true">${PL().img(k, { alt: '', h: 88 })}</span></span>`);
        });
      }
    }
    // 3. #book-demo: the three steps become a stitched path
    if (route === 'book-demo') { const ol = R.querySelector('.aud-steps ol'); if (ol) { ol.classList.add('cm-steps'); ol.setAttribute('data-ff-reveal', 'off'); } }
    // 4. #pricing: the package cards turn in (their own entrance, so the generic reveal leaves them alone)
    if (route === 'pricing') { const p = R.querySelector('.pz-tiers'); if (p) { p.classList.add('cm-tiers'); p.setAttribute('data-ff-reveal', 'off'); } }
    const out = doc.createElement('div');
    out.appendChild(R.cloneNode(true));
    return out.innerHTML;
  }

  // #centers: the peek at the director dashboard (the real Futures Hub preview, sample data)
  function showcase() {
    const H = W.FFHubLink, href = (H && H.preview ? H.preview : 'portal-test/c/test-family-demo-center/') + '?enter=director';
    const alt = 'The director dashboard of the Futures Hub preview, with sample data: ratio coverage for every room, enrollment, attendance today, staff on the clock, the ratio board and what needs attention.';
    const spots = [['ratio', 21, 9, 40, 12], ['kpi', 18, 33, 81, 13], ['board', 18, 47, 27, 20], ['funnel', 45.5, 47, 26, 20]];
    return `<section class="cm-dash band-paper" aria-labelledby="cm-dash-h"><div class="wrap cm-dashgrid">
  <div class="cm-dashtxt"><span class="eyebrow">Futures Hub</span><h2 id="cm-dash-h">Director portal</h2><p class="lede">The center dashboard</p><p>Today checklist, ratios, meals and family updates.</p>
   <p><a class="btn gold" href="${E(href)}">Try the director portal <svg class="px-icon" aria-hidden="true"><use href="img/ui-icons.svg#ArrowRight"></use></svg></a></p><p class="small"><span class="chip">Interactive demo (sample data)</span></p></div>
  <figure class="cm-device" data-ff-reveal="off"><div class="cm-devbar" aria-hidden="true"><i></i><i></i><i></i></div><div class="cm-screen">
   <img src="img/centers/director-demo-1200.webp" srcset="img/centers/director-demo-720.webp 720w, img/centers/director-demo-1200.webp 1200w" sizes="(max-width:900px) 92vw, 640px" width="1200" height="750" loading="lazy" decoding="async" alt="${E(alt)}">
   ${spots.map(([k, x, y, w, h]) => `<span class="cm-spot" data-spot="${k}" aria-hidden="true" style="left:${x}%;top:${y}%;width:${w}%;height:${h}%"></span>`).join('')}</div></figure>
 </div></section>`;
  }

  // wrap the six routes' views (audiences.js, views.js, pricing-all-in.js have defined them by now)
  Object.keys(STAGES).forEach(r => {
    const orig = V[r];
    if (typeof orig !== 'function' || orig._cm) return;
    const f = function () { return decorate(r, orig.apply(this, arguments)); };
    f._cm = true;
    V[r] = f;
  });

  // ---------------------------------------------------------------- motion (one scope per render)
  let live = null;
  const sfx = (n, g) => { try { if (W.FFSound && W.FFSound.enabled && W.FFSound.enabled()) W.FFSound.play(n, { gain: g || 0.4 }); } catch (e) { /* sound is optional */ } };

  function heroMotion(root, sc) {
    const st = root.querySelector('.cm-hero');
    if (!st) return;
    const D = M().dur, Es = M().ease, anims = [];
    const room = st.querySelector('.cm-room'), chars = Array.from(st.querySelectorAll('.cm-ch'));
    const push = a => { if (a) anims.push(a); return a; };
    st.classList.add('cm-live');
    sc.add(() => st.classList.remove('cm-live', 'is-landed'));
    const cozy = st.classList.contains('cm-cozy');
    const card = st.querySelector('.cm-card');
    push(sc.anim(card, [{ transform: 'translateY(22px) scale(.985)' }, { transform: 'none' }], { duration: D[3] + 150, easing: Es.out, fill: 'backwards' }));
    // the room settles (scale only: the LCP picture is never hidden)
    push(sc.anim(room, [{ scale: cozy ? '1.08' : '1.05' }, { scale: '1' }], { duration: cozy ? 1100 : D[4], easing: Es.out, fill: 'backwards' }));
    if (cozy) { const lamp = st.querySelector('.cm-lamp'); push(sc.anim(lamp, [{ opacity: 0 }, { opacity: 1 }], { duration: 700, delay: 500, easing: Es.out, fill: 'backwards' })); }
    const sun = st.querySelector('.cm-sun');
    if (sun) push(sc.anim(sun, [{ transform: 'translate(0, 70%) rotate(-30deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 1400, delay: 150, easing: Es.out, fill: 'backwards' }));
    const base = cozy ? 900 : 260;
    chars.forEach((c, i) => {
      const b = c.querySelector('.cm-bob');
      if (!i) {   // the grown-up steps in from the side, then waves (a small uniform rotate of the whole cut-out)
        push(sc.anim(b, [{ transform: 'translateX(-28px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: D[3] + 120, delay: base, easing: Es.out, fill: 'backwards' }));
        const img = b.querySelector('img');
        push(sc.anim(img, [{ rotate: '0deg' }, { rotate: '-4deg', offset: .25 }, { rotate: '3deg', offset: .55 }, { rotate: '-2deg', offset: .8 }, { rotate: '0deg' }], { duration: 1100, delay: base + D[3] + 120, easing: Es.inout }));
        return;
      }
      const a = push(sc.anim(b, [
        { transform: 'translate(26px, 0) scale(.92)', opacity: 0 },
        { transform: 'translate(12px, -34px) scale(1)', opacity: 1, offset: .45 },
        { transform: 'translate(0, 0) scale(1)', offset: .8 },
        { transform: 'translate(0, -6px) scale(1)', offset: .9 },
        { transform: 'none' }], { duration: 620, delay: base + 380 + i * 170, easing: Es.out, fill: 'backwards' }));
      if (a) a.addEventListener('finish', () => sfx('pop', 0.25));
    });
    const last = anims[anims.length - 1];
    const landed = () => { if (!sc.aborted) st.classList.add('is-landed'); };
    if (last) last.addEventListener('finish', landed); else landed();
    // skippable: any key, tap, click or wheel finishes the entrance at once
    const skip = () => { anims.forEach(a => { try { if (a.playState !== 'finished') a.finish(); } catch (e) { /* cancelled */ } }); landed(); };
    ['keydown', 'pointerdown', 'wheel', 'touchstart'].forEach(t => sc.listen(W, t, skip, { passive: true, once: true }));
    // depth for a fine pointer; the idle breathing pauses off screen and on a hidden tab
    sc.layers(st, [{ el: st.querySelector('.cm-world'), x: -8, y: -5, s: 60 }, { el: st.querySelector('.cm-cast'), x: 7, y: 3 }]);
    sc.pauseOffscreen(st);
  }

  function zones(root, sc) {
    const g = root.querySelector('.cm-zones');
    if (!g) return;
    const cards = Array.from(g.querySelectorAll('.cm-zone'));
    const r = g.getBoundingClientRect(), vh = innerHeight || 800;
    g.classList.add('cm-walk');
    sc.add(() => { g.classList.remove('cm-walk'); cards.forEach(c => c.classList.remove('is-lit')); });
    const play = () => cards.forEach((c, i) => sc.timer(() => {
      c.classList.add('is-lit');
      const f = c.querySelector('.cm-zonefr img');
      sc.anim(f, [{ transform: 'translateY(60%) scale(.8)', opacity: 0 }, { transform: 'translateY(-8%) scale(1)', opacity: 1, offset: .6 }, { transform: 'none', opacity: 1 }], { duration: 560, easing: M().ease.out, fill: 'backwards' });
      sfx('pop', 0.2);
    }, i * 320));
    if (r.top < vh * 0.85 && r.bottom > 0) { play(); return; }
    sc.enter([g], play, { threshold: 0.3 });
  }

  // counts the digits of a price or number up to its exact text (commas and symbols kept); the original text is always written last
  function countText(el, ms, sc) {
    const txt = el.textContent, m = /[\d,]+(\.\d+)?/.exec(txt);
    if (!m) return;
    const n = +m[0].replace(/,/g, ''), dec = (m[1] || '').length - 1;
    if (!isFinite(n) || n <= 0) return;
    el.style.setProperty('min-width', el.getBoundingClientRect().width + 'px');   // the box keeps its final width: nothing moves
    const t0 = performance.now(), fmt = v => v.toLocaleString('en-US', { minimumFractionDigits: Math.max(0, dec), maximumFractionDigits: Math.max(0, dec) });
    const done = () => { el.textContent = txt; el.style.removeProperty('min-width'); };
    const step = t => {
      if (sc.aborted) { done(); return; }
      const p = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - p, 4);
      if (p >= 1) { done(); return; }
      el.textContent = txt.slice(0, m.index) + fmt(n * e) + txt.slice(m.index + m[0].length);
      sc.frame(step);
    };
    sc.add(done);
    sc.frame(step);
  }

  function tiers(root, sc) {
    const box = root.querySelector('.cm-tiers');
    if (!box) return;
    const cards = Array.from(box.children);
    cards.forEach(c => c.classList.add('cm-pre'));
    sc.add(() => cards.forEach(c => c.classList.remove('cm-pre')));
    const play = () => {
      const flat = matchMedia('(max-width: 900px)').matches;
      cards.forEach((c, i) => {
        c.classList.remove('cm-pre');
        sc.anim(c, [{ transform: flat ? 'translateY(24px) scale(.97)' : 'perspective(900px) rotateY(-24deg) translateY(18px)', opacity: 0 }, { transform: 'none', opacity: 1 }],
          { duration: 640, delay: i * 140, easing: M().ease.out, fill: 'backwards' });
        sc.timer(() => { c.querySelectorAll('.pz-big .pz-amt').forEach(a => countText(a, 1000, sc)); sfx('stamp', 0.25); }, i * 140 + 200);
      });
    };
    sc.enter([box], play, { threshold: 0.15 });
  }

  function steps(root, sc) {
    const ol = root.querySelector('.cm-steps');
    if (!ol) return;
    const lis = Array.from(ol.children);
    ol.classList.add('cm-pre');
    sc.add(() => { ol.classList.remove('cm-pre', 'is-in'); lis.forEach(l => l.classList.remove('is-in')); });
    const play = () => { ol.classList.remove('cm-pre'); ol.classList.add('is-in'); lis.forEach((l, i) => sc.timer(() => { l.classList.add('is-in'); sfx('pop', 0.2); }, 200 + i * 300)); };
    const r = ol.getBoundingClientRect();
    if (r.top < (innerHeight || 800) * 0.9) { play(); return; }
    sc.enter([ol], play, { threshold: 0.3 });
  }

  // "Trusted by professionals": the cards rise in one after the other (their own entrance, so the generic reveal steps aside) and a
  // gold stitch is drawn round each; the reviewers' words and photos are never touched
  function endorse(root, sc) {
    const items = Array.from(root.querySelectorAll('.ff-endorse .ffe-item'));
    if (!items.length) return;
    items.forEach(i => { i.removeAttribute('data-ffr'); i.style.removeProperty('--ffr-d'); i.classList.add('cm-stitch', 'cm-rise'); });
    sc.add(() => items.forEach(i => i.classList.remove('cm-stitch', 'is-stitched', 'cm-rise')));
    let n = 0;
    sc.enter(items, it => {
      const d = 120 + (n++ % 3) * 160;
      sc.anim(it, [{ transform: 'translateY(28px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: D3(), delay: d, easing: M().ease.out, fill: 'backwards' });
      it.classList.remove('cm-rise');
      sc.timer(() => it.classList.add('is-stitched'), d + 200);
    }, { threshold: 0.2 });
  }
  const D3 = () => M().dur[3] + 150;

  // the Learning Zones Kit band: the five zone chips pop in one by one; the Real room / With the kit switch wipes (CSS, .ks)
  function kit(root, sc) {
    const lists = Array.from(root.querySelectorAll('.ks .ks-chips'));
    lists.forEach(ul => {
      const lis = Array.from(ul.children);
      lis.forEach(l => l.classList.add('cm-chip-pre'));
      sc.add(() => lis.forEach(l => l.classList.remove('cm-chip-pre')));
      sc.enter([ul], () => lis.forEach((l, i) => {
        l.classList.remove('cm-chip-pre');
        sc.anim(l, [{ transform: 'scale(.6)', opacity: 0 }, { transform: 'scale(1.06)', opacity: 1, offset: .65 }, { transform: 'none', opacity: 1 }], { duration: 480, delay: 120 + i * 110, easing: M().ease.out, fill: 'backwards' });
      }), { threshold: 0.4 });
    });
  }

  function dash(root, sc) {
    const dev = root.querySelector('.cm-device');
    if (!dev) return;
    const spots = Array.from(dev.querySelectorAll('.cm-spot'));
    dev.classList.add('cm-pre');
    sc.add(() => { dev.classList.remove('cm-pre', 'is-in'); spots.forEach(s => s.classList.remove('is-on')); });
    sc.enter([dev], () => {
      dev.classList.remove('cm-pre'); dev.classList.add('is-in');
      // the highlight visits each panel once, then rests (no loop, so nothing keeps moving: WCAG 2.2.2)
      spots.forEach((s, i) => { sc.timer(() => s.classList.add('is-on'), 700 + i * 1100); sc.timer(() => s.classList.remove('is-on'), 700 + i * 1100 + 1000); });
    }, { threshold: 0.3 });
  }

  function proof(root, sc) {
    const list = root.querySelector('[data-proof]');
    if (!list) return;
    const nums = Array.from(list.querySelectorAll('[data-count]'));
    if (list.getBoundingClientRect().top <= (innerHeight || 800)) return;
    nums.forEach(n => { n.textContent = '0'; });
    sc.add(() => nums.forEach(n => { n.textContent = n.dataset.count; }));
    sc.enter(Array.from(list.querySelectorAll('.hc-prooftile')), t => { const n = t.querySelector('[data-count]'); if (n) M().count(n, +n.dataset.count, 1100, sc); }, { threshold: 0.35 });
  }

  const ROUTES = new Set(Object.keys(STAGES));
  function setup(view, root, ok) {
    if (live) { live.abort(); live = null; }
    if (!ROUTES.has(view) || !root || !M() || !M().allowed(ok)) return;
    const sc = M().scope();
    live = sc;
    heroMotion(root, sc);
    zones(root, sc);
    tiers(root, sc);
    steps(root, sc);
    endorse(root, sc);
    kit(root, sc);
    dash(root, sc);
    proof(root, sc);
  }
  W.FFhooks = W.FFhooks || [];
  W.FFhooks.push(setup);
  W.FFCentersMotion = Object.freeze({ setup, stage, showcase, decorate, routes: Array.from(ROUTES), STAGES });
})();
