/* Futures Friends: the Centers & Programs pages (and their neighbours) open on one big storybook scene (owner 2026-10-13, v3 batch:
   "characters big, at true room scale, actually sitting in the chairs and using the furniture"; layout "picture full-width, text below").

   1. The hero (markup, decorated inside render() before first paint, so nothing jumps): the page's scene runs across the top like a
      movie still (img/scenes/<route>-800/-1600.webp; the whole picture, never cropped, over a soft blur of itself on wide screens), with
      one small "Storybook illustration · Story-world characters" chip. The page's own words sit on a frosted card below it; on desktop
      the card overlaps the still's bottom edge by 48 px only where no character stands (place()); on phones the picture comes first,
      then the card. With motion the still settles in with a very slow drift and the card rises in; reduced motion or the Decorative
      motion switch: still and complete. Any key, tap or wheel finishes the entrance at once.
   2. One signature moment per page (unchanged):
      #centers      the director's "How a day travels" and a peek at the real director dashboard of the Futures Hub preview (sample
                    data) whose highlight tours its panels once; the "What we have built so far" numbers count up.
      #for-centers, #for-home, #for-faith, #for-prek  "Four zones, open all day": the rooms light up one by one, each friend with its
                    pillar (Booker LEARN, Lumi BELONG, Zuri EXPLORE, Bop MOVE).
      #pricing      the three package cards turn in and their published prices count up to the exact catalog figure.
      #book-demo    "What happens next": the three steps are stitched together by a gold thread.
      everywhere    "Trusted by professionals": the reviewer cards rise and get a gold stitch (their words and photos untouched); the
                    Learning Zones Kit chips pop in and its Real room / With the kit switch wipes.
   Sends nothing; stores nothing. Loaded after audiences.js, pricing-all-in.js and ff-signatures.js, before FFstart(). */
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

  // ---------------------------------------------------------------- the scenes (owner-approved v3 batch, 2026-10-13)
  // One integrated picture per page (GPT Image 2 with the official references attached; Book a demo uses the owner's fox visitor and otter
  // receptionist). `who` = where the characters are in the picture, in % (x0, x1, y0, y1), measured by eye on the delivered images: the
  // card that overlaps the picture's bottom edge is placed (left, centre or right of the content column) where it covers none of them.
  const SCENES = {
    centers: { who: [[0, 25, 21, 80], [22, 42, 25, 87], [41, 72, 3, 90], [55, 73, 30, 89], [79, 98, 46, 87]],
      alt: 'Storybook illustration: at the school entrance, Principal Hazel kneels to welcome the children; Lumi hugs her, Booker waves, Zuri looks at the flowers and Bop hops up the path.',
      es: 'Ilustración de cuento: en la entrada de la escuela, la directora Hazel se arrodilla para recibir a los niños; Lumi la abraza, Booker saluda, Zuri mira las flores y Bop llega saltando por el camino.' },
    'for-centers': { who: [[5, 29, 30, 90], [26, 46, 5, 62], [45, 59, 25, 60], [57, 74, 34, 70], [71, 98, 36, 94]],
      alt: 'Storybook illustration: Ms. June sits at a round table with Booker, Lumi, Zuri and Bop, sorting colourful felt shapes together.',
      es: 'Ilustración de cuento: la Sra. June está sentada en una mesa redonda con Booker, Lumi, Zuri y Bop, ordenando juntos figuras de fieltro de colores.' },
    pricing: { who: [[8, 26, 29, 73], [25, 41, 10, 83], [37, 52, 22, 77], [47, 61, 52, 91], [61, 75, 56, 91], [69, 94, 26, 80]],
      alt: 'Storybook illustration: on a garden bench outside the school, Principal Hazel and Mara look through a folder with Booker beside them, while Lumi, Zuri and Bop play with a ball.',
      es: 'Ilustración de cuento: en una banca del jardín de la escuela, la directora Hazel y Mara revisan una carpeta con Booker a su lado, mientras Lumi, Zuri y Bop juegan con una pelota.' },
    'book-demo': { who: [[5, 26, 41, 93], [27, 45, 40, 87], [47, 72, 7, 78], [71, 88, 12, 43]],
      alt: 'Storybook illustration: at the reception desk, a fox visitor with a shoulder bag talks with the otter receptionist, while Booker and Zuri build with blocks on the rug.',
      es: 'Ilustración de cuento: en la recepción, un zorro visitante con un bolso conversa con la nutria recepcionista, mientras Booker y Zuri construyen con bloques en la alfombra.' },
    quote: { who: [[3, 26, 24, 94], [33, 48, 29, 88], [48, 66, 37, 85], [67, 92, 4, 88]],
      alt: 'Storybook illustration: at the cubbies, Booker hangs his backpack, Lumi ties her shoe on the bench, Zuri points at an empty cubby and Principal Hazel kneels with a clipboard.',
      es: 'Ilustración de cuento: en los casilleros, Booker cuelga su mochila, Lumi se ata el zapato en la banca, Zuri señala un casillero vacío y la directora Hazel se arrodilla con un portapapeles.' },
    options: { who: [[6, 18, 15, 90], [15, 30, 35, 91], [26, 46, 11, 88], [44, 66, 31, 93], [66, 93, 13, 92]],
      alt: 'Storybook illustration: at the school gate, Principal Hazel kneels to shake Booker’s hand while Rowan, Rose and Lumi arrive.',
      es: 'Ilustración de cuento: en la entrada de la escuela, la directora Hazel se arrodilla para darle la mano a Booker mientras llegan Rowan, Rose y Lumi.' },
    'for-prek': { who: [[2, 26, 44, 96], [21, 38, 2, 82], [46, 62, 38, 79], [63, 79, 41, 87], [76, 99, 42, 92]],
      alt: 'Storybook illustration: Ms. June sits by an easel with a circle, a square and a triangle; Zuri points at the triangle, Booker raises his paw, and Lumi and Bop watch from the rug.',
      es: 'Ilustración de cuento: la Sra. June está sentada junto a un caballete con un círculo, un cuadrado y un triángulo; Zuri señala el triángulo, Booker levanta la mano y Lumi y Bop miran desde la alfombra.' },
    'for-employers': { who: [[2, 34, 21, 86], [26, 42, 26, 85], [43, 61, 8, 71], [52, 74, 35, 84], [68, 94, 14, 85]],
      alt: 'Storybook illustration: at morning drop-off, Rowan hugs Booker goodbye, Bruno straightens Bop’s overall strap and Principal Hazel holds the school door open.',
      es: 'Ilustración de cuento: al dejar a los niños por la mañana, Rowan abraza a Booker para despedirse, Bruno le acomoda el tirante a Bop y la directora Hazel sostiene la puerta.' },
    hub: { who: [[4, 33, 19, 90], [29, 50, 34, 89], [60, 76, 2, 53], [74, 96, 13, 60]],
      alt: 'Storybook illustration: Bop and Zuri walk past the welcome desk waving, where Ms. June checks a clipboard and Mara looks at a tablet.',
      es: 'Ilustración de cuento: Bop y Zuri pasan saludando junto a la recepción, donde la Sra. June revisa un portapapeles y Mara mira una tableta.' },
    membership: { who: [[6, 26, 31, 83], [23, 47, 8, 66], [52, 70, 41, 89], [66, 80, 15, 59], [81, 99, 26, 75]],
      alt: 'Storybook illustration: Mr. Moss pours water at the snack table for Booker and Zuri, while Lumi washes her hands at the sink and Bop dries his.',
      es: 'Ilustración de cuento: el Sr. Moss sirve agua en la mesa de la merienda para Booker y Zuri, mientras Lumi se lava las manos y Bop se las seca.' },
    'founding-partners': { who: [[1, 20, 39, 84], [14, 34, 11, 79], [31, 52, 23, 75], [48, 66, 32, 78], [60, 78, 34, 85], [73, 98, 25, 85]],
      alt: 'Storybook illustration: Principal Hazel, Mara and the four friends kneel around a young tree they are planting together.',
      es: 'Ilustración de cuento: la directora Hazel, Mara y los cuatro amigos se arrodillan alrededor de un árbol joven que plantan juntos.' },
    training: { who: [[8, 34, 30, 90], [33, 51, 33, 85], [50, 76, 1, 88], [69, 93, 36, 97]],
      alt: 'Storybook illustration: in the reading corner, Ms. June reads a picture book aloud while Ms. Fern and Mr. Moss take notes and Booker reads on the bench.',
      es: 'Ilustración de cuento: en el rincón de lectura, la Sra. June lee un libro en voz alta mientras la Sra. Fern y el Sr. Moss toman notas y Booker lee en la banca.' },
    'start-center': { who: [[15, 33, 38, 92], [34, 61, 26, 92], [62, 84, 6, 89]],
      alt: 'Storybook illustration: Principal Hazel opens the school door as Booker waves and Zuri walks in for the first morning.',
      es: 'Ilustración de cuento: la directora Hazel abre la puerta de la escuela mientras Booker saluda y Zuri entra en la primera mañana.' },
    readiness: { who: [[6, 26, 44, 91], [20, 40, 4, 84], [36, 57, 34, 84], [57, 74, 31, 75], [80, 99, 29, 80]],
      alt: 'Storybook illustration: Ms. June kneels to help Bop with his zipper while Lumi ties her shoe, Booker zips his backpack and Zuri sorts blocks.',
      es: 'Ilustración de cuento: la Sra. June se arrodilla para ayudar a Bop con el cierre mientras Lumi se ata el zapato, Booker cierra su mochila y Zuri ordena bloques.' },
    why: { who: [[0, 30, 21, 89], [27, 43, 27, 72], [42, 66, 26, 73], [60, 74, 7, 59], [71, 99, 29, 85]],
      alt: 'Storybook illustration: at the garden beds, Mr. Moss shows Zuri a seedling while Bop pats the soil, Booker digs and Lumi waters the plants.',
      es: 'Ilustración de cuento: en los huertos, el Sr. Moss le muestra un brote a Zuri mientras Bop aplana la tierra, Booker cava y Lumi riega las plantas.' },
    'for-home': { who: [[2, 22, 30, 85], [16, 35, 28, 72], [38, 56, 37, 80], [53, 79, 7, 84], [72, 94, 20, 77]],
      alt: 'Storybook illustration: in a cozy home daycare, Ms. Fern reads a picture book on the sofa with Booker beside her and Zuri on the rug, while Lumi and Bop build with blocks at a small table.',
      es: 'Ilustración de cuento: en una guardería acogedora, la Sra. Fern lee un libro en el sofá con Booker a su lado y Zuri en la alfombra, mientras Lumi y Bop construyen con bloques en una mesita.' },
    'for-faith': { who: [[2, 28, 30, 96], [22, 40, 26, 70], [34, 61, 10, 64], [57, 77, 26, 72], [71, 96, 40, 98]],
      alt: 'Storybook illustration: at a round table, Mr. Moss hands out felt hearts to Bop, Lumi, Booker and Zuri.',
      es: 'Ilustración de cuento: en una mesa redonda, el Sr. Moss reparte corazones de fieltro a Bop, Lumi, Booker y Zuri.' }
  };
  const es = () => !!(W.FFi18n && W.FFi18n.lang === 'es');
  // the full-width still: the picture whole (contain) over a soft blur of itself, so wide screens never crop a character
  function still(route, o = {}) {
    const c = SCENES[route], b = `img/scenes/${route}`;
    if (!c) return '';
    const set = `${b}-800.webp 800w, ${b}-1600.webp 1600w`;
    return `<figure class="cm-still${o.cls ? ' ' + o.cls : ''}" data-cm-still="${E(route)}">`
      + `<img class="cm-stillfill" src="${b}-800.webp" alt="" aria-hidden="true" width="800" height="452" decoding="async">`
      + `<img class="cm-scene" src="${b}-1600.webp" srcset="${set}" sizes="(max-width:1422px) 100vw, 1422px" width="1600" height="905" alt="${E(es() ? c.es : c.alt)}" data-i18n-skip fetchpriority="high" decoding="async">`
      + `<span class="cm-chip"><span>${E(T('Storybook illustration'))}</span> · <span>${E(T('Story-world characters'))}</span></span></figure>`;
  }

  // ---------------------------------------------------------------- markup decoration (inside render(), before first paint)
  const ZONE = { booker: 'LEARN', lumi: 'BELONG', zuri: 'EXPLORE', bop: 'MOVE' };
  function decorate(route, html) {
    if (typeof doc.createElement !== 'function') return html;
    const t = doc.createElement('template');
    t.innerHTML = html;
    const R = t.content;
    // 1. the hero: the scene full width like a movie still, the page's words on a card below it (overlapping its bottom edge where free)
    const hero = R.querySelector('.phero');
    if (hero && SCENES[route]) {
      hero.classList.add('cm-hero', 'cm-scenehero');
      hero.setAttribute('data-cm-hero', route);
      const wrap = hero.querySelector('.wrap');
      const art = hero.querySelector('.art');
      if (art) art.remove();
      const txt = wrap && wrap.firstElementChild;
      if (txt) txt.classList.add('cm-card');
      hero.insertAdjacentHTML('afterbegin', still(route));
      const gold = hero.querySelector('.btn.gold');
      if (gold) gold.setAttribute('data-ff-magnet', '');
    }
    // 2. the learning zones (#for-centers, #for-home, #for-faith, #for-prek): each card gets its friend and its pillar
    if (/^for-(centers|home|faith|prek)$/.test(route) && PL()) {
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

  // wrap the scene pages' views (audiences.js, views.js, pricing-all-in.js, offer-clarity.js, founding-partners.js, demo-portal.js and
  // release-truth.js have defined them by now)
  Object.keys(SCENES).forEach(r => {
    const orig = V[r];
    if (typeof orig !== 'function' || orig._cm) return;
    const f = function () { return decorate(r, orig.apply(this, arguments)); };
    f._cm = true;
    V[r] = f;
  });

  // ---------------------------------------------------------------- the card below the still: where it may overlap the picture
  // The picture is drawn whole (contain) in the still; the card overlaps its bottom edge by up to 48 px (desktop) only where that strip
  // holds no character: left of the content column, centred or right, whichever is free first; if none is, it sits just below. Phones:
  // picture first, then the card, no overlap. Runs on render and resize; the result is data-cm-align / --cm-overlap on the hero.
  const OVERLAP = 48;
  function drawn(img, box) {   // the picture's drawn rectangle inside its box (object-fit: contain)
    const r = 1600 / 905, bw = box.width, bh = box.height;
    const w = Math.min(bw, bh * r), h = w / r;
    return { left: box.left + (bw - w) / 2, top: box.top + (bh - h) / 2, width: w, height: h };
  }
  // the fixed Nature / Sound dock never covers a character: if it would, the still gets a little shorter (the picture narrower and
  // centred, the blur either side) until it does not, down to half the window height. who: character boxes in % of the picture.
  function fitDock(fig, who) {
    fig.style.removeProperty('height');
    const dk = doc.querySelector('.ffs'), Dk = dk && dk.getBoundingClientRect();
    const boxes = Pp => who.map(([x0, x1, y0, y1]) => ({ l: Pp.left + x0 / 100 * Pp.width, r: Pp.left + x1 / 100 * Pp.width, t: Pp.top + y0 / 100 * Pp.height, b: Pp.top + y1 / 100 * Pp.height }));
    const under = Pp => !!(Dk && Dk.width) && boxes(Pp).some(q => q.r > Dk.left && q.l < Dk.right && q.b > Dk.top && q.t < Dk.bottom);
    let F = fig.getBoundingClientRect(), P = drawn(null, F);
    const minH = (W.innerHeight || 800) * 0.5;
    if (fig.clientWidth >= 640) {
      while (under(P) && F.height > minH) {
        fig.style.height = Math.round(F.height * 0.96) + 'px';
        F = fig.getBoundingClientRect(); P = drawn(null, F);
      }
    }
    return { F, P };
  }
  function place(hero) {
    const c = SCENES[hero.dataset.cmHero], fig = hero.querySelector('.cm-still'), card = hero.querySelector('.cm-card'), wrap = hero.querySelector('.wrap');
    if (!c || !fig || !card || !wrap) return null;
    const W0 = hero.clientWidth, phone = W0 < 640;
    if (phone) { fig.style.removeProperty('height'); hero.dataset.cmAlign = 'below'; hero.style.setProperty('--cm-overlap', '0px'); return { align: 'below' }; }
    const { F, P } = fitDock(fig, c.who);
    const Wr = wrap.getBoundingClientRect();
    const cs = getComputedStyle(wrap), padL = parseFloat(cs.paddingLeft) || 0, padR = parseFloat(cs.paddingRight) || 0;
    const colL = Wr.left + padL, colR = Wr.right - padR, cw = Math.min(card.getBoundingClientRect().width || 640, colR - colL);
    const stripTop = P.top + P.height - OVERLAP;
    const hits = (l, r) => c.who.some(([x0, x1, , y1]) => {
      const bl = P.left + x0 / 100 * P.width, br = P.left + x1 / 100 * P.width, bb = P.top + y1 / 100 * P.height;
      return bb > stripTop + 1 && br > l + 1 && bl < r - 1;
    });
    const opts = [['left', colL], ['center', colL + (colR - colL - cw) / 2], ['right', colR - cw]];
    const pick = opts.find(([, l]) => !hits(l, l + cw));
    hero.dataset.cmAlign = pick ? pick[0] : 'left';
    hero.style.setProperty('--cm-overlap', (pick ? OVERLAP : 0) + 'px');
    return { align: hero.dataset.cmAlign, overlap: pick ? OVERLAP : 0 };
  }
  let lo = null;
  function placeSetup(view, root) {
    if (lo) { lo.disconnect(); lo = null; }
    const hero = root && root.querySelector && root.querySelector('.cm-scenehero');
    if (!hero) return;
    place(hero);
    // the Nature / Sound dock is drawn after the first render (and resizes with the language): place again once it is there
    [400, 1200].forEach(ms => setTimeout(() => { if (hero.isConnected) place(hero); }, ms));
    if (typeof ResizeObserver === 'function') {
      let id = 0, w = hero.clientWidth;
      lo = new ResizeObserver(() => { if (!id) id = requestAnimationFrame(() => { id = 0; if (!hero.isConnected || hero.clientWidth === w) return; w = hero.clientWidth; place(hero); }); });
      lo.observe(hero);
    }
  }

  // ---------------------------------------------------------------- motion (one scope per render)
  let live = null;
  const sfx = (n, g) => { try { if (W.FFSound && W.FFSound.enabled && W.FFSound.enabled()) W.FFSound.play(n, { gain: g || 0.4 }); } catch (e) { /* sound is optional */ } };

  // the still settles in and drifts very slowly (ken burns, at most 1.5% so the edge characters stay whole); the card rises in under it
  function heroMotion(root, sc) {
    const st = root.querySelector('.cm-scenehero');
    if (!st) return;
    const D = M().dur, Es = M().ease, anims = [];
    const push = a => { if (a) anims.push(a); return a; };
    st.classList.add('cm-live');
    sc.add(() => st.classList.remove('cm-live'));
    push(sc.anim(st.querySelector('.cm-scene'), [{ opacity: 0.001, scale: '1.015' }, { opacity: 1, scale: '1' }], { duration: D[4], easing: Es.out, fill: 'backwards' }));
    push(sc.anim(st.querySelector('.cm-card'), [{ transform: 'translateY(26px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: D[3] + 150, delay: 220, easing: Es.out, fill: 'backwards' }));
    const skip = () => anims.forEach(a => { try { if (a.playState !== 'finished') a.finish(); } catch (e) { /* cancelled */ } });
    ['keydown', 'pointerdown', 'wheel', 'touchstart'].forEach(t => sc.listen(W, t, skip, { passive: true, once: true }));
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


  const ROUTES = new Set(Object.keys(SCENES));
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
  W.FFhooks.push(placeSetup);
  W.FFhooks.push(setup);
  W.FFCentersMotion = Object.freeze({ setup, place, fitDock, drawn, still, SCENES, showcase, decorate, routes: Array.from(ROUTES) });
})();
