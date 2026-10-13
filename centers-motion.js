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
    'Welcome to Futures Friends! Here for a demo?': '¡Bienvenido a Futures Friends! ¿Viene por una demostración?',
    'Yes, we run a small program. Can we see the rooms?': 'Sí, tenemos un programa pequeño. ¿Podemos ver los salones?',
    'Of course! I\u2019ll show you the Futures Hub.': '¡Claro! Le muestro Futures Hub.',
    'Illustration: at the reception desk, Mara welcomes Rowan, who has come for a demo, while the friends play on the rug.': 'Ilustración: en la recepción, Mara recibe a Rowan, que viene por una demostración, mientras los amigos juegan en la alfombra.',
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
  // the same descriptions in Spanish (draft, pending teacher review); the alt is written in the page language at render time
  const ENV_ALT_ES = {
    'school-arrival-entrance': 'Entrada de la escuela en el mundo de peluche: un gran letrero de fieltro sobre puertas dobles de madera, jardineras con flores y un camino curvo.',
    'school-exterior-wide': 'La escuela del mundo de peluche vista desde la reja: un edificio largo con techos de fieltro rojo, una reja con corazón y jardineras con flores bajo un cielo azul.',
    'hall-reception': 'Recepción del mundo de peluche: un mostrador de bienvenida con hojas de fieltro, un sofá y una banca verdes, puertas en arco y una alfombra ovalada que lleva a la entrada.',
    'classroom-empty-master': 'Salón del mundo de peluche: alfombra redonda, banca de lectura, estantes de arte, mesitas y un rincón con techo de hojas junto a una ventana soleada.',
    'classroom-reverse-angle': 'Salón del mundo de peluche visto desde el otro lado: puerta verde con ventana redonda, sol y árbol de fieltro en la pared, estantes, mesitas y una alfombra redonda.',
    'activity-rug': 'Salón del mundo de peluche: una alfombra verde redonda con borde amarillo cosido, mesitas y sillas, casilleros con mochilas y un rincón de lectura con techo de hojas junto a la ventana.'
  };
  const es = () => !!(W.FFi18n && W.FFi18n.lang === 'es');
  const BUBBLES = [['mara', 'Welcome to Futures Friends! Here for a demo?'], ['rowan', 'Yes, we run a small program. Can we see the rooms?'], ['mara', 'Of course! I\u2019ll show you the Futures Hub.']];
  const REC_SR = 'Illustration: at the reception desk, Mara welcomes Rowan, who has come for a demo, while the friends play on the rug.';
  const FOUR = [['booker', 37], ['lumi', 53], ['zuri', 69], ['bop', 86]];
  const STAGES = {
    centers: { env: 'school-arrival-entrance', lead: ['principal-hazel', 16], cast: FOUR },
    'for-centers': { env: 'classroom-empty-master', lead: ['ms-june', 15], cast: [['booker', 36], ['zuri-pointing', 53], ['lumi', 69], ['bop-waving', 86]] },
    'for-home': { env: 'classroom-reverse-angle', lead: ['ms-fern', 16], cast: [['lumi', 37], ['bop-waving', 55], ['booker', 72], ['zuri', 88]], cozy: true },
    'for-faith': { env: 'activity-rug', lead: ['mr-moss', 16], cast: [['lumi-heart-hands', 38], ['booker', 55], ['zuri', 71], ['bop', 87]], sun: true },
    pricing: { env: 'school-exterior-wide', lead: ['principal-hazel', 15], cast: FOUR, sky: true },
    'book-demo': { env: 'hall-reception', lead: null, cast: [['booker', 0], ['zuri', 0]], reception: true }
  };
  const UNIT = 62;
  // Where people can stand in each backdrop (owner 2026-10-12: "the kid characters are floating on the gate"): the feet line `y` and the
  // open stretch of floor `x0..x1` along it, in % of the picture (1600 x 900), checked by eye on a 10% grid; `adult` is how tall a
  // grown-up of lineup scale 1.0 stands at that line, as a share of the picture's height (from the doors, chairs and desks around it).
  //   school-arrival-entrance  the paved path in front of the doors, between the two lawns
  //   school-exterior-wide     the path beyond the heart gate, between the lawns: the gate and fence are nearer, below their feet
  //   hall-reception           the floor in front of the oval rug, left of the welcome desk (the reception sits behind them)
  //   classroom-empty-master   the round rug, clear of the crayon basket (left) and the drum basket (right)
  //   classroom-reverse-angle  the round rug, clear of the small tables (left) and the potted plant (right)
  //   activity-rug             the big round rug
  const GROUND = {
    'school-arrival-entrance': { y: 85, x0: 20, x1: 78, adult: 0.36 },
    'school-exterior-wide': { y: 67, x0: 32, x1: 70, adult: 0.2 },
    'hall-reception': { y: 95, x0: 43, x1: 60, adult: 0.5 },
    'classroom-empty-master': { y: 75, x0: 26, x1: 78, adult: 0.4 },
    'classroom-reverse-angle': { y: 78, x0: 14, x1: 70, adult: 0.42 },
    'activity-rug': { y: 80, x0: 8, x1: 90, adult: 0.44 }
  };                         // a grown-up of lineup scale 1.0 stands this tall, % of the stage height

  function envImg(e, said) {
    const b = `img/plush/environments/${e}`;
    const base = (es() ? ENV_ALT_ES : ENV_ALT)[e] || '';
    return `<img class="cm-room" src="${b}-1600.webp" srcset="${b}-800.webp 800w, ${b}-1600.webp 1600w" sizes="100vw" alt="${E(base + (said ? ' ' + said : ''))}" data-i18n-skip width="1600" height="900" fetchpriority="high" decoding="async">`;
  }
  // the hero's world, full bleed behind the card: the room, a felt sun or cloud, a lamp glow (cozy), and the honesty chip
  function world(route) {
    const s = STAGES[route], P = PL();
    if (!s || !P) return null;
    const all = (s.lead ? [s.lead] : []).concat(s.cast).filter(c => P.has(c[0])).map(c => c.slice());
    const names = (s.reception ? ['Mara', 'Rowan'] : []).concat(all.map(c => P.name(c[0])));
    const said = names.length > 1 ? names.slice(0, -1).join(', ') + (es() ? ' y ' : ' and ') + names[names.length - 1] + (es() ? ' están al frente.' : ' are in front.') : '';
    const g = GROUND[s.env];
    const bg = `<div class="cm-world" style="--pos:${g ? `${(g.x0 + g.x1) / 2}% ${g.y}%` : 'center 62%'}" data-env="${E(s.env)}"><img class="cm-fill" alt="" aria-hidden="true" decoding="async" hidden>${envImg(s.env, said)}<span class="cm-veil" aria-hidden="true"></span>${s.sun ? '<img class="cm-sun" src="img/plush/hero/felt-sun-320.webp" alt="" aria-hidden="true" width="320" height="320" decoding="async">' : ''}${s.sky ? '<img class="cm-cloud" src="img/plush/hero/felt-cloud-2-480.webp" alt="" aria-hidden="true" width="480" height="300" decoding="async" loading="lazy">' : ''}${s.cozy ? '<span class="cm-lamp" aria-hidden="true"></span>' : ''}</div>`;
    const ch = ([k, x], i) => {
      const lead = !!s.lead && i === 0, h = UNIT * P.P[k].scale, hpx = Math.round(lead ? 280 : 170);
      return `<span class="cm-ch${lead ? ' cm-lead' : ''}" style="--x:${x}%;--h:${h.toFixed(1)}%;--ar:${P.ratio(k).toFixed(4)};--i:${i}" data-cm-ch="${E(k)}" data-scale="${P.P[k].scale}" data-ar="${P.ratio(k).toFixed(4)}"><i class="cm-bob">${P.img(k, { alt: '', h: hpx, eager: true })}</i></span>`;
    };
    const cast = `<div class="cm-cast">${all.map(ch).join('')}</div>`;
    // #book-demo (owner 2026-10-12, "let's get creative"): the reception. Mara (official cut-out) stands behind the welcome desk, the
    // desk itself drawn again over her (the same picture, clipped to the counter) so it hides her from the waist down; Rowan walks in
    // from the hall and stops at the desk, and a short felt conversation follows. The bubbles are decoration (aria-hidden); one hidden
    // line describes the scene.
    const rec = s.reception ? {
      back: `<span class="cm-actor cm-mara" data-actor="mara" data-ar="${P.ratio('mara').toFixed(4)}" aria-hidden="true">${P.img('mara', { alt: '', h: 300, eager: true })}</span>`
        + `<img class="cm-occluder" src="img/plush/environments/${s.env}-1600.webp" alt="" aria-hidden="true" width="1600" height="900" decoding="async">`,
      front: `<div class="cm-fx" aria-hidden="true"><span class="cm-actor cm-rowan" data-actor="rowan" data-ar="${P.ratio('rowan').toFixed(4)}"><i class="cm-stride">${P.img('rowan', { alt: '', h: 300, eager: true })}</i></span>`
        + BUBBLES.map(([who, line], i) => `<span class="cm-bubble cm-b-${who}" data-bubble="${i}" data-who="${who}"${i === BUBBLES.length - 1 ? ' data-on' : ''}><span>${E(es() ? ES[line] || line : line)}</span></span>`).join('') + '</div>'
        + `<span class="ffa-sr cm-sr">${E(es() ? ES[REC_SR] : REC_SR)}</span>`
    } : null;
    const chip = `<span class="cm-chip"><span>Storybook illustration</span> · <span>Story-world characters</span></span>`;
    return { bg: rec ? bg.replace(/<\/div>$/, rec.back + '</div>') + rec.front : bg, cast, chip, cozy: !!s.cozy, reception: !!rec };
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
      if (w.reception) hero.classList.add('cm-reception');
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
      if (c.classList.contains('cm-lead')) {   // the grown-up steps in from the side, then waves (a small uniform rotate of the whole cut-out)
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
    const rec = reception2(st, sc, anims, base);
    const last = anims[anims.length - 1];
    const landed = () => { if (!sc.aborted) st.classList.add('is-landed'); };
    if (last) last.addEventListener('finish', landed); else landed();
    // skippable: any key, tap, click or wheel finishes the entrance at once
    const skip = () => { if (rec) rec.skip(); anims.forEach(a => { try { if (a.playState !== 'finished') a.finish(); } catch (e) { /* cancelled */ } }); landed(); };
    ['keydown', 'pointerdown', 'wheel', 'touchstart'].forEach(t => sc.listen(W, t, skip, { passive: true, once: true }));
    // depth for a fine pointer; the idle breathing pauses off screen and on a hidden tab
    sc.layers(st, [{ el: st.querySelector('.cm-cloud'), x: -14, y: -6 }, { el: st.querySelector('.cm-sun'), x: -10, y: -6 }, { el: st.querySelector('.cm-lamp'), x: -6, y: -4 }]);
    sc.pauseOffscreen(st);
  }

  // the reception's motion: Rowan walks in from the far doors (feet on the floor, a gentle waddle, growing with the perspective), the
  // friends glance at him, then the three bubbles take turns (2.5 s each) and the last one stays. Once per visit (sessionStorage);
  // phones start with Rowan already at the desk. Any input skips to the final frame (Rowan at the desk, the last bubble).
  function reception2(st, sc, anims, base) {
    const row = st.querySelector('.cm-rowan');
    if (!row) return null;
    const bubbles = Array.from(st.querySelectorAll('.cm-bubble')), walker = row.querySelector('.cm-stride');
    const show = i => bubbles.forEach((b, j) => b.toggleAttribute('data-on', j === i));
    let over = false;
    const final = () => { over = true; walker.classList.remove('is-walking'); show(bubbles.length - 1); };
    sc.add(final);
    let seen = false;
    try { seen = W.sessionStorage.getItem('ff-cm-reception') === '1'; W.sessionStorage.setItem('ff-cm-reception', '1'); } catch (e) { /* once per load */ }
    if (seen) { final(); return { skip: final }; }
    const talk = t0 => bubbles.forEach((b, i) => sc.timer(() => { if (over) return; show(i); sfx('pop', 0.2); if (i === bubbles.length - 1) over = true; }, t0 + i * 2500));
    show(-1);
    const phone = st.getBoundingClientRect().width < 640;
    if (phone) { talk(base + 900); return { skip: final }; }
    const [dx, dy, s0] = (row.dataset.from || '0,0,1').split(',').map(Number);
    walker.classList.add('is-walking');
    const a = sc.anim(walker, [{ transform: `translate(${dx}px, ${dy}px) scale(${s0})`, opacity: 0, offset: 0 }, { transform: `translate(${dx * 0.94}px, ${dy * 0.94}px) scale(${s0 + (1 - s0) * 0.06})`, opacity: 1, offset: 0.06 }, { transform: 'none', opacity: 1 }],
      { duration: 3600, delay: base + 500, easing: 'cubic-bezier(.33,.1,.45,1)', fill: 'backwards' });
    if (a) {
      anims.push(a);
      a.addEventListener('finish', () => {
        walker.classList.remove('is-walking');
        if (over) return;
        st.querySelectorAll('.cm-ch img').forEach((im, i) => sc.anim(im, [{ rotate: '0deg' }, { rotate: '5deg', offset: .35 }, { rotate: '5deg', offset: .7 }, { rotate: '0deg' }], { duration: 1600, delay: i * 90, easing: M().ease.inout }));
        talk(350);
      });
    } else final();
    return { skip: final };
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

  // ---------------------------------------------------------------- grounding: the room and the cast share one ground line
  // The room is drawn at the size that covers the hero (like object-fit: cover) but placed by hand so its ground line meets the floor of
  // the free area beside or below the card (.cm-art, which already keeps clear of the card and the Nature / Sound dock). The cast then
  // stands on that line, inside the open stretch of floor, sized from the backdrop's own scale (smaller only when the stretch is too
  // narrow), each with a contact shadow. Runs on every render and resize, with motion on or off; writes sizes and offsets only.
  // the reception (#book-demo), in % of the picture: Mara behind the desk (feet hidden at y 51), Rowan from the open door in the right
  // archway, across the floor, to the desk's left corner (clear of its front); `desk` is the counter's outline (front, top and back edge), drawn over Mara
  const REC = {
    mara: { x: 90, y: 51, h: 0.33 },
    from: { x: 66.5, y: 48, adult: 0.17 }, to: { x: 62, y: 84, adult: 0.42 },
    desk: [[70.8, 100], [70.8, 41.6], [73.2, 39.6], [86, 38.6], [100, 37.4], [100, 100]],
    counter: 37.4
  };
  const adultAt = y => REC.from.adult + (y - REC.from.y) / (REC.to.y - REC.from.y) * (REC.to.adult - REC.from.adult);
  function ground(hero) {
    const world = hero.querySelector('.cm-world'), room = hero.querySelector('.cm-room'), art = hero.querySelector('.cm-art');
    const g = world && GROUND[world.dataset.env];
    if (!g || !room || !art) return null;
    const H = hero.getBoundingClientRect(), W = H.width, HH = H.height;
    if (!W || !HH) return null;
    const A = art.getBoundingClientRect(), F = { l: A.left - H.left, r: A.right - H.left, t: A.top - H.top, b: A.bottom - H.top };
    const phone = W < 640, rec = hero.classList.contains('cm-reception');
    const want = Math.min(F.b, HH) - 10;                                     // feet a little above the hero's bottom edge
    const cover = Math.max(HH, W * 9 / 16);
    let sh;
    if (rec && phone) {
      // phones: Mara at the desk and Rowan already there, both whole, below the card: the picture is sized to hold that stretch
      const wPct = (REC.mara.h * (+hero.querySelector('.cm-mara').dataset.ar) + REC.to.adult * (+hero.querySelector('.cm-rowan').dataset.ar)) * 56.25 / 2;
      const span = (REC.mara.x - REC.to.x) + wPct + 2;
      // ... and short enough that Mara's head (y 18) and a bubble fit between the card and the floor
      sh = Math.min((W - 92) / (span / 100) * 9 / 16, (want - F.t - 70) / ((REC.to.y - 18) / 100));   // 72 px kept for the dock
      sh = Math.max(sh, W * 9 / 16);
    } else {
      const target = (F.b - F.t) * 0.62;                                      // the grown-up stands about this tall
      sh = Math.min(cover * 1.35, Math.max(phone ? W * 9 / 16 : cover, target / g.adult));
    }
    const sw = sh * 16 / 9;
    const gy = rec && phone ? REC.to.y : g.y;
    let top = Math.min(want - gy / 100 * sh, phone ? HH : 0);
    top = Math.max(top, HH - sh);
    const gc = rec ? (phone ? (REC.to.x + REC.mara.x) / 2 : 62) / 100 : (g.x0 + g.x1) / 2 / 100;
    const fc = rec && phone ? (W - 72) / 2 : (F.l + F.r) / 2;
    // (phones, reception: the picture may stop up to 80 px short of the right edge, under the dock; the blurred fill shows there)
    const left = Math.max(W - sw - (rec && phone ? 80 : 0), Math.min(0, fc - gc * sw));
    const fy = top + g.y / 100 * sh;
    const box = { inset: 'auto', left: left + 'px', top: top + 'px', width: sw + 'px', height: sh + 'px', objectFit: 'fill', maxWidth: 'none' };
    Object.assign(room.style, box);
    // a gap above the picture (phones, where the card sits on top): the same room, softly blurred, fills it
    const fill = hero.querySelector('.cm-fill');
    if (fill) { if (top > 0.5 || left + sw < W - 0.5) { if (!fill.getAttribute('src')) fill.src = room.currentSrc || room.src; fill.hidden = false; } else fill.hidden = true; }
    hero.classList.toggle('cm-gap', top > 0.5);
    const out = { fy, top, left, sw, sh, W, HH, F };
    // the friends on the open floor
    const span = [Math.max(F.l, left + g.x0 / 100 * sw), Math.min(F.r, left + g.x1 / 100 * sw)];
    const L = Math.max(40, span[1] - span[0]);
    const chars = Array.from(hero.querySelectorAll('.cm-ch'));
    hero.classList.toggle('cm-solo', rec && phone);                           // phones: the reception only
    if (!(rec && phone) && chars.length) {
      const base = chars.map(c => ({ c, h: g.adult * sh * (+c.dataset.scale || 0.6), ar: +c.dataset.ar || 0.7 }));
      const GAP = 0.06, head = Math.max(...base.map(o => o.h));
      const sum0 = base.reduce((a, o) => a + o.h * o.ar, 0);
      const f = Math.min(1, L * 1.12 / (sum0 + GAP * head), (fy - Math.max(F.t, 8)) / head);
      base.forEach(o => { o.h *= f; o.w = o.h * o.ar; });
      const sum = base.reduce((a, o) => a + o.w, 0), gapLead = hero.querySelector('.cm-lead') ? GAP * head * f : 0;
      const n = base.length, room2 = L - sum - gapLead;
      const step = n > 2 ? Math.min(GAP * head * f * 0.4, room2 / (n - (gapLead ? 2 : 1))) : 0;
      const used = sum + gapLead + step * (n - (gapLead ? 2 : 1));
      let x = span[0] + Math.max(0, (L - used) / 2);
      const ox = A.left - H.left, oy = A.top - H.top;
      base.forEach((o, i) => {
        o.c.style.left = (x + o.w / 2 - ox) + 'px';
        o.c.style.bottom = (oy + A.height - fy) + 'px';
        o.c.style.height = o.h + 'px';
        x += o.w + (i === 0 && gapLead ? gapLead : step);
      });
      out.f = f;
    }
    if (rec) out.rec = reception(hero, out);
    hero.dataset.cmGround = `${Math.round(fy)}`;
    return out;
  }
  // places Mara, the desk, Rowan (at the desk; the walk-in starts from REC.from) and the bubbles, in hero pixels
  function reception(hero, o) {
    const pt = (x, y) => [o.left + x / 100 * o.sw, o.top + y / 100 * o.sh];
    const mara = hero.querySelector('.cm-mara'), occ = hero.querySelector('.cm-occluder'), row = hero.querySelector('.cm-rowan');
    const mh = REC.mara.h * o.sh, [mx, my] = pt(REC.mara.x, REC.mara.y);
    // her head never leaves the hero: when the room is lifted high, she stands a little lower behind the counter (her feet are hidden)
    const mTop = Math.max(my - mh, 8);
    Object.assign(mara.style, { left: mx + 'px', top: mTop + 'px', height: mh + 'px' });
    Object.assign(occ.style, { left: o.left + 'px', top: o.top + 'px', width: o.sw + 'px', height: o.sh + 'px', clipPath: `polygon(${REC.desk.map(([x, y]) => `${x}% ${y}%`).join(',')})` });
    if (!occ.getAttribute('data-src-set')) { occ.src = hero.querySelector('.cm-room').currentSrc || occ.src; occ.setAttribute('data-src-set', ''); }
    const rh = adultAt(REC.to.y) * o.sh * 0.98, [rx, ry] = pt(REC.to.x, REC.to.y);
    Object.assign(row.style, { left: rx + 'px', top: (ry - rh) + 'px', height: rh + 'px' });
    const [sx, sy] = pt(REC.from.x, REC.from.y), s0 = adultAt(REC.from.y) / adultAt(REC.to.y);
    row.dataset.from = `${(sx - rx).toFixed(1)},${(sy - ry).toFixed(1)},${s0.toFixed(4)}`;
    // bubbles: Mara's to the left of her head, Rowan's above his; always inside the hero and clear of the card
    const card = hero.querySelector('.cm-card').getBoundingClientRect(), H = hero.getBoundingClientRect();
    const C = { l: card.left - H.left, r: card.right - H.left, t: card.top - H.top, b: card.bottom - H.top };
    const phone = o.W < 640, minX = phone ? 8 : C.r + 10, minY = phone ? C.b + 8 : 8;
    hero.querySelectorAll('.cm-bubble').forEach(b => {
      b.style.maxWidth = (phone ? Math.min(220, o.W - 24) : 260) + 'px';
      const bw = b.offsetWidth, bh = b.offsetHeight;
      let x, y;
      if (b.dataset.who === 'mara') { x = mx - mh * 0.62 * (+mara.dataset.ar) / 2 - bw + 6; y = mTop - bh * 0.15; }
      else { x = rx - bw / 2; y = ry - rh - bh - 10; }
      x = Math.max(minX, Math.min(o.W - bw - 8, x)); y = Math.max(minY, Math.min(o.HH - bh - 8, y));
      b.style.left = x + 'px'; b.style.top = y + 'px';
    });
    return { mara: [mx, mTop + mh, mh], to: [rx, ry, rh], from: [sx, sy] };
  }
  let lo = null;
  function groundSetup(view, root) {
    if (lo) { lo.disconnect(); lo = null; }
    const hero = root && root.querySelector && root.querySelector('.cm-hero');
    if (!hero) return;
    ground(hero);
    if (typeof ResizeObserver === 'function') {
      let id = 0;
      lo = new ResizeObserver(() => { if (!id) id = requestAnimationFrame(() => { id = 0; if (hero.isConnected) ground(hero); }); });
      lo.observe(hero);
      const card = hero.querySelector('.cm-card'); if (card) lo.observe(card);
    }
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
  W.FFhooks.push(groundSetup);
  W.FFhooks.push(setup);
  W.FFCentersMotion = Object.freeze({ setup, ground, GROUND, REC, stage, showcase, decorate, routes: Array.from(ROUTES), STAGES });
})();
