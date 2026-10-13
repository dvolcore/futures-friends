/* Futures Friends: the Room Planner page, jacked up (owner 2026-10-12: "I do like the build ... love it", now match it to the rest of the
   site with better motion graphics, a custom background and everything more custom). room-planner.js and room-planner-core.js are
   untouched: this file wraps the #room-planner view (like centers-motion.js wraps the Centers pages) and only adds polish.

   1. The hero becomes a felt "planning room": a blueprint graph-paper wall with pinned felt swatches of the kit carpets, a felt plank
      floor, and Ms. June with Booker, Lumi, Zuri and Bop standing on that floor (each friend on its own kit carpet), the official
      cut-outs only (FFPlush), whole, never stretched. The page's own words sit on a frosted card; one small "Storybook illustration ·
      Story-world characters" chip. The heading rises word by word with the gold stitch (ff-reveal.js); "Start planning" is the
      magnetic call to action (ff-buttons.js). Pointer and scroll parallax (FFMotion.layers).
   2. The example floor plan (the planner's own 12 x 14 ft home daycare template, C.template('home'), so every size is the real one)
      becomes a one-time demo of about 7.5 s: the walls draw, the dimension lines run out while 14 ft and 12 ft count up, the zones drop
      in one by one in their friends' colours with each friend's cut-out popping onto its zone, the door swing opens, the clear path to
      the EXIT traces itself and gets a green "Fit check ✓", and the adult sightline cone sweeps from A. Any tap, key, wheel or scroll
      shows the last frame at once; "Play the demo again" replays it. Reduced motion or the Decorative motion switch: the last frame.
      The example's caption sits under the plan, never on it.
   3. Inside the planner (no change to its logic, rules, messages or numbers): a zone squishes as it snaps into place, a dragged piece
      casts a soft shadow, fit-check results that change glow (pass) or pulse (warning), and the step-by-step section rises in with a
      stitched gold thread joining its five steps (filled up to the step you are on).
   4. Below the hero: a soft felt graph-paper background instead of plain white.
   Sends nothing, stores nothing. Loaded right after room-planner.js. Public: window.FFRoomPlannerMotion. */
(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof V === 'undefined') return;
  const W = window, C = W.FFRoomPlannerCore;
  if (!C) return;
  const M = () => W.FFMotion, PL = () => W.FFPlush;
  const E = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const es = () => !!(W.FFi18n && W.FFi18n.lang === 'es');
  const ES = {
    'Storybook illustration': 'Ilustración de cuento',
    'Story-world characters': 'Personajes del mundo del cuento',
    'Example: a 12 x 14 ft home daycare room': 'Ejemplo: un salón de guardería en casa de 12 x 14 pies',
    'Play the demo again': 'Ver la demostración otra vez',
    'Fit check': 'Verificación de espacio',
    '36 in clear path': 'Paso libre de 36 pulg.',
    EXIT: 'SALIDA', table: 'mesa', cubbies: 'casilleros'
  };
  try { if (W.FFi18n && W.FFi18n.add) W.FFi18n.add('es', ES); } catch (e) { /* Spanish is optional */ }
  const T = en => (es() && ES[en]) || en;

  // ---------------------------------------------------------------- 2. the demo plan (drawn here so every part can move)
  const INK = '#0A2B38', PAPER = '#FFFDF8', GRID = 'rgba(10,43,56,.07)', GRID5 = 'rgba(10,43,56,.16)', OK = '#1F6E43';
  const r1 = n => Math.round(n * 10) / 10;
  // where each friend's cut-out stands (feet on its zone) and where the zone's name goes, in room inches
  const SPOT = { booker: { lab: [24, 30] }, lumi: { lab: [133, 29] }, zuri: { lab: [25, 116] }, circle: { lab: [84, 55] } };
  function demoSvg() {
    const S = C.template('home'), R = S.room, Wd = R.w, L = R.l, Mg = Math.max(30, Math.min(Wd, L) * 0.12), fs = Math.max(5.5, Math.min(Wd, L) / 26);
    const it = S.items, box = i => C.box(i, R), Z = C.ZONES, P = PL();
    const txt = (s, x, y, f, fill, w, cls) => `<text${cls ? ` class="${cls}"` : ''} x="${r1(x)}" y="${r1(y)}" font-size="${r1(f)}" fill="${fill}" font-weight="${w || 600}" text-anchor="middle" dominant-baseline="middle">${E(s)}</text>`;
    const o = [];
    o.push(`<svg xmlns="http://www.w3.org/2000/svg" class="rpm-svg" viewBox="${r1(-Mg)} ${r1(-Mg)} ${r1(Wd + 2 * Mg)} ${r1(L + 2 * Mg)}" aria-hidden="true" focusable="false" font-family="Poppins, Arial, sans-serif">`);
    o.push(`<rect x="${r1(-Mg)}" y="${r1(-Mg)}" width="${r1(Wd + 2 * Mg)}" height="${r1(L + 2 * Mg)}" fill="#FBF6EC"/>`);
    const g = [];
    for (let x = 12; x < Wd; x += 12) g.push(`<line x1="${x}" y1="0" x2="${x}" y2="${L}" stroke="${x % 60 ? GRID : GRID5}" stroke-width="${x % 60 ? 0.4 : 0.7}"/>`);
    for (let y = 12; y < L; y += 12) g.push(`<line x1="0" y1="${y}" x2="${Wd}" y2="${y}" stroke="${y % 60 ? GRID : GRID5}" stroke-width="${y % 60 ? 0.4 : 0.7}"/>`);
    o.push(`<g class="rpm-floor"><rect x="0" y="0" width="${Wd}" height="${L}" fill="${PAPER}"/>${g.join('')}</g>`);
    // the adult's sightline cone, under the pieces (a soft wedge from A)
    const A = it.find(i => i.t === 'teacher'), ab = box(A), ax = ab.x + ab.w / 2, ay = ab.y + ab.h / 2, rr = 150, a0 = 35 * Math.PI / 180, a1 = 145 * Math.PI / 180;
    o.push(`<defs><radialGradient id="rpm-cone-g" cx="${r1(ax)}" cy="${r1(ay)}" r="${rr}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#E7A928" stop-opacity=".42"/><stop offset="1" stop-color="#E7A928" stop-opacity="0"/></radialGradient><clipPath id="rpm-clip"><rect x="0" y="0" width="${Wd}" height="${L}"/></clipPath></defs>`);
    o.push(`<g clip-path="url(#rpm-clip)"><path class="rpm-cone" style="transform-origin:${r1(ax)}px ${r1(ay)}px" d="M${r1(ax)} ${r1(ay)} L${r1(ax + rr * Math.cos(a0))} ${r1(ay + rr * Math.sin(a0))} A${rr} ${rr} 0 0 1 ${r1(ax + rr * Math.cos(a1))} ${r1(ay + rr * Math.sin(a1))} Z" fill="url(#rpm-cone-g)"/></g>`);
    // door swing (the same geometry as the planner's: hinge, open leaf, arc to the closed edge)
    const d = it.find(i => i.t === 'door'), dw = +d.w || 36, da = +d.at || 0, hR = d.hinge === 'R';
    const hx = hR ? da : da + dw, hy = L, ox = hx, oy = L - dw, ex = hR ? da + dw : da, ey = L;
    const sweep = ((ox - hx) * (ey - hy) - (oy - hy) * (ex - hx)) > 0 ? 1 : 0;
    o.push(`<g class="rpm-swing"><path d="M${hx} ${hy} L${ox} ${oy} A${dw} ${dw} 0 0 ${sweep} ${ex} ${ey} Z" fill="rgba(179,38,30,.06)"/><path class="rpm-arc" pathLength="1" d="M${ox} ${oy} A${dw} ${dw} 0 0 ${sweep} ${ex} ${ey}" fill="none" stroke="#B3261E" stroke-width="0.8" stroke-dasharray="3 2"/><line class="rpm-leaf" style="transform-origin:${hx}px ${hy}px" x1="${hx}" y1="${hy}" x2="${ox}" y2="${oy}" stroke="#B3261E" stroke-width="1.6" stroke-linecap="round"/></g>`);
    // walls
    o.push(`<path class="rpm-wall" pathLength="1" d="M0 0H${Wd}V${L}H0Z" fill="none" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`);
    // the room's fixed features
    const fx = [];
    for (const i of it.filter(i => ['door', 'window', 'outlet', 'cubbies', 'table'].includes(i.t))) {
      const b = box(i);
      if (i.t === 'door') fx.push(`<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="#FBE3E1" stroke="#B3261E" stroke-width="0.8"/>${txt(T('EXIT'), b.x + b.w / 2, b.y - fs * 0.9, fs * 0.8, '#B3261E', 700)}`);
      else if (i.t === 'window') fx.push(`<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="#DCEFF7" stroke="#2F6FC0" stroke-width="0.8"/>`);
      else if (i.t === 'outlet') fx.push(`<rect x="${b.x - 1}" y="${b.y}" width="${b.w + 2}" height="${b.h}" rx="1" fill="#fff" stroke="${INK}" stroke-width="0.8"/>`);
      else {
        const own = i.t === 'table';
        fx.push(`<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="1.5" fill="${own ? '#EAD9B6' : '#D9D3C4'}" stroke="${own ? '#8A6D3B' : '#6E675B'}" stroke-width="0.9"/>`);
        fx.push(b.w >= b.h ? txt(T(i.t === 'table' ? 'table' : 'cubbies'), b.x + b.w / 2, b.y + b.h / 2, fs * 0.85, INK, 500) : `<g transform="translate(${r1(b.x + b.w / 2)} ${r1(b.y + b.h / 2)}) rotate(-90)">${txt(T('table'), 0, 0, fs * 0.85, INK, 500)}</g>`);
      }
    }
    o.push(`<g class="rpm-fixed">${fx.join('')}</g>`);
    // the zones, one group each (its carpet or mat, fence, sign, poster and basket), then the friend's cut-out on it
    const zoneOf = i => (i.t === 'circle' ? 'circle' : i.z);
    const order = ['circle', 'booker', 'lumi', 'zuri', 'bop'];
    const fr = { booker: 'booker', lumi: 'lumi', zuri: 'zuri', bop: 'bop' };
    for (const k of order) {
      const parts = [];
      for (const i of it.filter(x => zoneOf(x) === k && ['circle', 'mat', 'fence', 'sign', 'poster', 'basket'].includes(x.t))) {
        const b = box(i), z = Z[k];
        if (i.t === 'circle') { const sh = C.shapes(i, R)[0]; parts.push(`<circle cx="${r1(sh.cx)}" cy="${r1(sh.cy)}" r="${r1(sh.r)}" fill="${z.tint}" stroke="${z.felt}" stroke-width="2"/><circle cx="${r1(sh.cx)}" cy="${r1(sh.cy)}" r="${r1(sh.r - 3)}" fill="none" stroke="${z.felt}" stroke-width="0.6" stroke-dasharray="2 1.5"/>`); }
        else if (i.t === 'mat') parts.push(`<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="5" fill="${z.tint}" stroke="${z.felt}" stroke-width="2"/><rect x="${b.x + 3}" y="${b.y + 3}" width="${b.w - 6}" height="${b.h - 6}" rx="3" fill="none" stroke="${z.felt}" stroke-width="0.6" stroke-dasharray="2 1.5"/>`);
        else if (i.t === 'fence') parts.push(`<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="1.4" fill="${z.felt}" stroke="${z.ink}" stroke-width="0.6"/>`);
        else if (i.t === 'basket') parts.push(`<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="3" fill="#fff" stroke="${z.ink}" stroke-width="1"/><path d="M${b.x + 3} ${r1(b.y + b.h / 2)}h${b.w - 6}" stroke="${z.felt}" stroke-width="1.4"/>`);
        else parts.push(`<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="1.2" fill="${z.felt}" stroke="#fff" stroke-width="0.8"/>`);
      }
      if (SPOT[k]) { const z = Z[k], nm = k === 'circle' ? (es() ? 'Círculo de amigos' : 'Friends Circle') : z.short; parts.push(txt(nm, SPOT[k].lab[0], SPOT[k].lab[1], fs * (k === 'circle' ? 1.15 : 1.35), z.ink, 700, 'rpm-lab')); }
      o.push(`<g class="rpm-zone" data-z="${k}">${parts.join('')}</g>`);
    }
    // each friend stands on its zone (Bop, whose Movement Zone does not fit a 12 x 14 ft room, on the Friends Circle)
    const mat = z => it.find(i => i.t === 'mat' && i.z === z), circ = it.find(i => i.t === 'circle');
    const stand = { booker: [mat('booker'), 0.76], lumi: [mat('lumi'), 0.62], zuri: [mat('zuri'), 0.76], bop: [circ, 0.5] };
    if (P) for (const k of ['booker', 'lumi', 'zuri', 'bop']) {
      const [m, fxp] = stand[k]; if (!m) continue;
      const b = box(m), h = 26, w = h * P.ratio(fr[k]), cx = b.x + b.w * fxp, foot = k === 'bop' ? b.y + b.h - 8 : b.y + b.h - 4;
      o.push(`<g class="rpm-fr" data-z="${k}"><ellipse cx="${r1(cx)}" cy="${r1(foot)}" rx="${r1(w * 0.42)}" ry="2.2" fill="rgba(40,26,8,.28)"/><image href="${E(P.src(fr[k], 480))}" x="${r1(cx - w / 2)}" y="${r1(foot - h)}" width="${r1(w)}" height="${h}" preserveAspectRatio="xMidYMax meet"/></g>`);
    }
    // the clear path from the circle to the exit (traced), and the adult position A
    const db = box(d), px = db.x + db.w / 2;
    o.push(`<g class="rpm-route"><path class="rpm-path" pathLength="1" d="M${r1(84 + 30)} ${r1(72 + 22)} C 128 104, ${r1(px)} 100, ${r1(px)} ${r1(db.y - fs * 2)}" fill="none" stroke="${OK}" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="1 0"/><path class="rpm-arrow" d="M${r1(px - 3.5)} ${r1(db.y - fs * 2 - 4)} L${r1(px)} ${r1(db.y - fs * 2 + 1)} L${r1(px + 3.5)} ${r1(db.y - fs * 2 - 4)}" fill="none" stroke="${OK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>${txt(T('36 in clear path'), 108, 118, fs * 0.7, OK, 700, 'rpm-pathlbl')}</g>`);
    o.push(`<g class="rpm-a"><circle cx="${r1(ax)}" cy="${r1(ay)}" r="9" fill="${INK}" stroke="#fff" stroke-width="1.4"/>${txt('A', ax, ay + 0.4, 10, '#fff', 700)}</g>`);
    // dimension lines (the numbers count up in the demo)
    const dfs = fs * 1.05, top = -Mg * 0.45, right = Wd + Mg * 0.45;
    o.push(`<g class="rpm-dim rpm-dimw" fill="${INK}" font-size="${r1(dfs)}" font-weight="600" text-anchor="middle"><path class="rpm-dl" pathLength="1" d="M0 ${r1(top)}H${Wd}" stroke="${INK}" stroke-width="0.8"/><path d="M0 ${r1(-Mg * 0.6)}V${r1(-Mg * 0.3)}M${Wd} ${r1(-Mg * 0.6)}V${r1(-Mg * 0.3)}" stroke="${INK}" stroke-width="0.8"/>`
      + `<text x="${r1(Wd / 2)}" y="${r1(-Mg * 0.55)}" paint-order="stroke" stroke="#FBF6EC" stroke-width="${r1(dfs * 0.5)}" data-i18n-skip><tspan class="rpm-n" data-n="${Math.round(Wd / 12)}">${Math.round(Wd / 12)}</tspan>${E(es() ? ' pies de ancho · pared norte' : ' ft wide · north wall')}</text></g>`);
    o.push(`<g class="rpm-dim rpm-diml" fill="${INK}" font-size="${r1(dfs)}" font-weight="600" text-anchor="middle"><path class="rpm-dl" pathLength="1" d="M${r1(right)} 0V${L}" stroke="${INK}" stroke-width="0.8"/>`
      + `<text transform="translate(${r1(Wd + Mg * 0.75)} ${r1(L / 2)}) rotate(90)" paint-order="stroke" stroke="#FBF6EC" stroke-width="${r1(dfs * 0.5)}" data-i18n-skip><tspan class="rpm-n" data-n="${Math.round(L / 12)}">${Math.round(L / 12)}</tspan>${E(es() ? ' pies de largo' : ' ft long')}</text></g>`);
    o.push('</svg>');
    return o.join('');
  }

  // ---------------------------------------------------------------- 1. the planning room around the copy
  const CAST = [['ms-june', 0], ['booker', 1], ['lumi', 1], ['zuri-pointing', 1], ['bop-waving', 1]];
  const RUG = { booker: '#2F6FC0', lumi: '#D9488B', zuri: '#2E9E57', bop: '#8236AE' };
  const friendOf = k => (/^(booker|lumi|zuri|bop)/.exec(k) || [])[1];
  // small felt props drawn as vectors (not characters): pencils, a felt tape measure with its tape, kit-carpet swatches
  const PENCILS = '<svg class="rpm-pencils" viewBox="0 0 120 40" aria-hidden="true" focusable="false"><g stroke="#5B3A12" stroke-width="1.2" stroke-linejoin="round"><g transform="rotate(-8 60 20)"><rect x="12" y="14" width="76" height="9" rx="2" fill="#E7A928"/><path d="M88 14l14 4.5-14 4.5z" fill="#F4D9A8"/><path d="M98.5 17.4l3.5 1.1-3.5 1.1z" fill="#3A2A12"/><rect x="6" y="14" width="8" height="9" rx="2" fill="#E9879F"/></g><g transform="rotate(6 60 24)"><rect x="18" y="22" width="70" height="8" rx="2" fill="#2F6FC0"/><path d="M88 22l12 4-12 4z" fill="#F4D9A8"/><path d="M97 25l3 1-3 1z" fill="#3A2A12"/><rect x="12" y="22" width="7" height="8" rx="2" fill="#8236AE"/></g></g></svg>';
  const TAPE = '<svg class="rpm-tape" viewBox="0 0 300 60" preserveAspectRatio="xMinYMid meet" aria-hidden="true" focusable="false"><rect class="rpm-tapeband" x="40" y="34" width="256" height="12" rx="2" fill="#F5C553" stroke="#8A5A00" stroke-width="1.2"/><g stroke="#5B3A12" stroke-width="1.1">' + Array.from({ length: 21 }, (_, i) => `<path d="M${52 + i * 12} 34v${i % 4 ? 4 : 7}"/>`).join('') + '</g><circle cx="34" cy="32" r="26" fill="#E7A928" stroke="#7A5200" stroke-width="2"/><circle cx="34" cy="32" r="17" fill="none" stroke="#FFF3D6" stroke-width="2" stroke-dasharray="4 3"/><circle cx="34" cy="32" r="6" fill="#7A5200"/></svg>';
  // One integrated scene can replace the drawn room and the cut-outs later (owner 2026-10-12: characters in the scene, not pasted on):
  // set BACKDROP to { src, srcset, alt, altEs } of a single 16:9 webp and the hero shows it full bleed behind the card and the plan.
  const BACKDROP = null;
  function scene() {
    const P = PL();
    if (!P) return null;
    if (BACKDROP) {
      const alt = es() && BACKDROP.altEs ? BACKDROP.altEs : BACKDROP.alt;
      return { world: `<div class="rpm-world rpm-hasbackdrop"><img class="rpm-backdrop" src="${E(BACKDROP.src)}"${BACKDROP.srcset ? ` srcset="${E(BACKDROP.srcset)}" sizes="100vw"` : ''} alt="${E(alt || '')}" width="1600" height="900" fetchpriority="high" decoding="async"></div>`,
        castHtml: '', chip: `<span class="rpm-chip"><span>${E(T('Storybook illustration'))}</span> · <span>${E(T('Story-world characters'))}</span></span>` };
    }
    const cast = CAST.filter(([k]) => P.has(k));
    const names = cast.map(([k]) => P.name(k));
    const said = names.length > 1 ? names.slice(0, -1).join(', ') + (es() ? ' y ' : ' and ') + names[names.length - 1] : '';
    const sw = ['booker', 'lumi', 'zuri', 'bop', 'circle'].map((k, i) => `<span class="rpm-sw" style="--c:${k === 'circle' ? '#E7A928' : RUG[k]};--i:${i}"></span>`).join('');
    const world = `<div class="rpm-world" aria-hidden="true"><span class="rpm-wall"></span><span class="rpm-swatches">${sw}</span><span class="rpm-floorband"></span><span class="rpm-veil"></span></div>`;
    const ch = ([k, kid], i) => {
      const f = friendOf(k), s = P.P[k].scale;
      return `<span class="rpm-ch${kid ? '' : ' rpm-lead'}" style="--s:${s};--ar:${P.ratio(k).toFixed(4)};--i:${i}${f ? `;--rug:${RUG[f]}` : ''}" data-rpm-ch="${E(k)}"><i class="rpm-bob">${P.img(k, { alt: '', h: kid ? 160 : 280, eager: true })}</i></span>`;
    };
    const basket = '<img class="rpm-basket" src="img/plush/props/art-supplies-480.webp" srcset="img/plush/props/art-supplies-480.webp 480w, img/plush/props/art-supplies-960.webp 960w" sizes="120px" width="480" height="446" alt="" decoding="async" draggable="false">';
    const castHtml = `<div class="rpm-cast" role="img" aria-label="${E(es() ? `${said} están en la sala de planeación.` : `${said} stand in the planning room.`)}">${TAPE}${PENCILS}${cast.map(ch).join('')}${basket}</div>`;
    const chip = `<span class="rpm-chip"><span>${E(T('Storybook illustration'))}</span> · <span>${E(T('Story-world characters'))}</span></span>`;
    return { world, castHtml, chip };
  }
  function demoFigure() {
    return `<figure class="rpm-plan" data-rpm-plan><div class="rpm-sheet"><span class="rpm-tapebit rpm-tb1" aria-hidden="true"></span><span class="rpm-tapebit rpm-tb2" aria-hidden="true"></span>${demoSvg()}<span class="rpm-ok" aria-hidden="true"><b>✓</b> ${E(T('Fit check'))}</span></div>`
      + `<figcaption class="rpm-cap"><span class="rpm-captext">${E(T('Example: a 12 x 14 ft home daycare room'))}</span><button type="button" class="btn soft rpm-replay" data-rpm-replay>${E(T('Play the demo again'))}</button></figcaption></figure>`;
  }
  function decorate(html) {
    const a = html.indexOf('<header class="wc-hero rk-hero rp-hero">'), b = a < 0 ? -1 : html.indexOf('</header>', a);
    const sc = scene();
    if (a < 0 || b < 0 || !sc) return html;
    const head = html.slice(a, b), c0 = head.indexOf('<div class="wc-hero-copy">'), f0 = head.indexOf('<figure class="rp-heroplan"');
    if (c0 < 0 || f0 < 0) return html;
    const copy = head.slice(c0, f0).trim()
      .replace('<div class="wc-hero-copy">', '<div class="wc-hero-copy rpm-card">')
      .replace('rk-kick rk-kick-dark', 'rk-kick rpm-kick')
      .replace('<button type="button" class="btn gold" data-anchor="rp-app">', '<button type="button" class="btn gold" data-anchor="rp-app" data-ff-magnet>')
      .replace('<a class="btn ghost" href="#room-kit">', '<a class="btn soft" href="#room-kit">');
    const hero = `<header class="wc-hero rk-hero rp-hero rpm-hero" data-rpm-hero>${sc.world}<div class="wrap rpm-grid">${copy}`
      + `${demoFigure()}${sc.castHtml}</div>${sc.chip}`;
    let rest = html.slice(b);
    // the step-by-step section and the guide sit on the felt graph paper; the step section has its own entrance
    rest = rest.replace('<section class="rp-sec rp-app band-paper" id="rp-app"', '<section class="rp-sec rp-app rpm-paper" id="rp-app" data-ff-reveal="off"');
    return html.slice(0, a).replace('<div class="wc rk rp">', '<div class="wc rk rp rpm">') + hero + rest;
  }
  const orig = V['room-planner'];
  if (typeof orig === 'function' && !orig._rpm) {
    const f = function () { return decorate(orig.apply(this, arguments)); };
    f._rpm = true;
    V['room-planner'] = f;
  }

  // ---------------------------------------------------------------- motion (one scope per render)
  let live = null, demo = null;
  const sfx = (n, g) => { try { if (W.FFSound && W.FFSound.enabled && W.FFSound.enabled()) W.FFSound.play(n, { gain: g || 0.3 }); } catch (e) { /* sound is optional */ } };
  const DEMO_MS = 7600;

  // the demo: every step is a Web Animation (or a counted number) on the scope, so a skip finishes them all on the last frame
  function playDemo(fig, sc) {
    if (demo) demo.finish();
    const Es = M().ease, anims = [], counts = [];
    const q = s => fig.querySelector(s), qa = s => Array.from(fig.querySelectorAll(s));
    const A = (el, frames, o) => { const a = el ? sc.anim(el, frames, Object.assign({ fill: 'backwards', easing: Es.out }, o)) : null; if (a) anims.push(a); return a; };
    const draw = (el, delay, duration, easing) => A(el, [{ strokeDasharray: '1 1', strokeDashoffset: 1 }, { strokeDasharray: '1 1', strokeDashoffset: 0 }], { delay, duration, easing: easing || Es.inout });
    fig.classList.add('rpm-playing');
    fig.classList.remove('rpm-done');
    // 0.0 s  the room: paper, then the walls draw themselves
    A(q('.rpm-floor'), [{ opacity: 0 }, { opacity: 1 }], { duration: 500 });
    draw(q('.rpm-wall'), 150, 1000);
    // 0.6 s  the dimension lines run out while 14 ft and 12 ft count up
    qa('.rpm-dl').forEach((l, i) => draw(l, 650 + i * 150, 800));
    qa('.rpm-dim text').forEach((t, i) => A(t, [{ opacity: 0 }, { opacity: 1 }], { delay: 650 + i * 150, duration: 250 }));
    qa('.rpm-n').forEach((n, i) => counts.push(count(n, 700 + i * 150, 850, sc)));
    // 1.3 s  the door, window, cubbies and table settle in
    A(q('.rpm-fixed'), [{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }], { delay: 1350, duration: 450 });
    A(q('.rpm-a'), [{ opacity: 0 }, { opacity: 1 }], { delay: 1500, duration: 300 });
    // 1.8 s  the zones drop in one by one with a soft bounce, each friend popping onto its zone
    qa('.rpm-zone').forEach((z, i) => {
      const t = 1800 + i * 430;
      A(z, [{ opacity: 0, transform: 'translateY(-16px) scale(.86)' }, { opacity: 1, transform: 'translateY(2px) scale(1.04)', offset: 0.6 }, { transform: 'translateY(-1px) scale(.99)', offset: 0.82 }, { opacity: 1, transform: 'none' }], { delay: t, duration: 620, easing: 'cubic-bezier(.2,.8,.3,1)' });
      const fr = q(`.rpm-fr[data-z="${z.dataset.z === 'circle' ? '__' : z.dataset.z}"]`);
      if (fr) { const a = A(fr, [{ opacity: 0, transform: 'translateY(6px) scale(.2)' }, { opacity: 1, transform: 'translateY(-3px) scale(1.12)', offset: 0.6 }, { opacity: 1, transform: 'none' }], { delay: t + 280, duration: 480, easing: 'cubic-bezier(.3,1.4,.5,1)' }); if (a) a.addEventListener('finish', () => { if (!skipped) sfx('pop', 0.18); }); }
    });
    // 4.0 s  the door swings open
    A(q('.rpm-swing'), [{ opacity: 0 }, { opacity: 1 }], { delay: 4000, duration: 200 });
    A(q('.rpm-leaf'), [{ transform: 'rotate(-90deg)' }, { transform: 'rotate(8deg)', offset: 0.75 }, { transform: 'none' }], { delay: 4050, duration: 800, easing: Es.inout });
    draw(q('.rpm-arc'), 4100, 750);
    // 4.7 s  the clear path to the EXIT traces itself, then the fit check ticks green
    A(q('.rpm-route'), [{ opacity: 0 }, { opacity: 1 }], { delay: 4700, duration: 150 });
    draw(q('.rpm-path'), 4750, 1050);
    A(q('.rpm-arrow'), [{ opacity: 0 }, { opacity: 1 }], { delay: 5700, duration: 200 });
    A(q('.rpm-pathlbl'), [{ opacity: 0 }, { opacity: 1 }], { delay: 5500, duration: 300 });
    const ok = A(q('.rpm-ok'), [{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'scale(1.12)', offset: 0.6 }, { opacity: 1, transform: 'none' }], { delay: 5850, duration: 520, easing: 'cubic-bezier(.3,1.4,.5,1)' });
    if (ok) ok.addEventListener('finish', () => { if (!skipped) sfx('stamp', 0.2); });
    // 6.0 s  the adult at A looks round the room: the sightline cone sweeps, then rests
    A(q('.rpm-a'), [{ transform: 'scale(1)' }, { transform: 'scale(1.18)', offset: 0.5 }, { transform: 'none' }], { delay: 6000, duration: 500 });
    A(q('.rpm-cone'), [{ opacity: 0, transform: 'rotate(-62deg)' }, { opacity: 1, transform: 'rotate(-62deg)', offset: 0.12 }, { transform: 'rotate(48deg)', offset: 0.62 }, { opacity: 1, transform: 'none' }], { delay: 6000, duration: 1600, easing: Es.inout });
    let skipped = false;
    const done = () => { fig.classList.remove('rpm-playing'); fig.classList.add('rpm-done'); };
    const finish = () => { skipped = true; anims.forEach(a => { try { if (a.playState !== 'finished') a.finish(); } catch (e) { /* cancelled */ } }); counts.forEach(c => c && c()); done(); };
    const last = anims.reduce((m, a) => { const t = a.effect && a.effect.getComputedTiming ? a.effect.getComputedTiming().endTime : 0; return !m || t > m.t ? { a, t } : m; }, null);
    if (last) last.a.addEventListener('finish', done); else done();
    // skippable: a tap, a key, the wheel or a scroll shows the last frame (the replay button itself never counts)
    const me = { finish, fig }, mine = e => !!(e && e.target && e.target.closest && e.target.closest('[data-rpm-replay]') && (e.type === 'pointerdown' || (e.type === 'keydown' && (e.key === 'Enter' || e.key === ' '))));
    const skip = e => { if (demo !== me || mine(e) || !fig.classList.contains('rpm-playing')) return; finish(); };
    sc.timer(() => ['keydown', 'pointerdown', 'wheel', 'touchmove'].forEach(t => sc.listen(W, t, skip, { passive: true })), 0);
    // a scroll counts once the page has settled from the click that started the demo
    sc.timer(() => { const y0 = W.scrollY || 0; sc.listen(W, 'scroll', e => { if (Math.abs((W.scrollY || 0) - y0) > 40) skip(e); }, { passive: true }); }, 300);
    demo = me;
    return demo;
  }
  // counts a number up to its own text (which is always written last); returns the "finish now" function
  function count(el, delay, ms, sc) {
    const n = +el.dataset.n;
    if (!isFinite(n)) return null;
    let stop = false, t0 = 0;
    const end = () => { stop = true; el.textContent = String(n); };
    el.textContent = '0';
    const step = t => {
      if (stop || sc.aborted) { end(); return; }
      if (!t0) t0 = t;
      const p = Math.min(1, Math.max(0, (t - t0 - delay) / ms));
      if (p >= 1) { end(); return; }
      el.textContent = String(Math.round(n * (1 - Math.pow(1 - p, 3))));
      sc.frame(step);
    };
    sc.add(end);
    sc.frame(step);
    return end;
  }

  function hero(root, sc) {
    const st = root.querySelector('[data-rpm-hero]');
    if (!st) return;
    const Es = M().ease, D = M().dur;
    st.classList.add('rpm-live');
    sc.add(() => st.classList.remove('rpm-live', 'is-landed'));
    const card = st.querySelector('.rpm-card'), sheet = st.querySelector('.rpm-sheet'), chars = Array.from(st.querySelectorAll('.rpm-ch'));
    const anims = [];
    const push = a => { if (a) anims.push(a); return a; };
    push(sc.anim(card, [{ transform: 'translateY(22px) scale(.985)' }, { transform: 'none' }], { duration: D[3] + 150, easing: Es.out, fill: 'backwards' }));
    push(sc.anim(sheet, [{ transform: 'translateY(-26px) rotate(-4deg)', opacity: 0 }, { transform: 'translateY(3px) rotate(-.6deg)', opacity: 1, offset: 0.7 }, { transform: 'none', opacity: 1 }], { duration: 700, delay: 120, easing: Es.out, fill: 'backwards' }));
    st.querySelectorAll('.rpm-sw').forEach((s, i) => push(sc.anim(s, [{ transform: 'translateY(-40px) rotate(-20deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 600, delay: 200 + i * 90, easing: Es.out, fill: 'backwards' })));
    const tape = st.querySelector('.rpm-tapeband');
    if (tape) push(sc.anim(tape, [{ transform: 'scaleX(.06)' }, { transform: 'none' }], { duration: 900, delay: 300, easing: Es.out, fill: 'backwards' }));
    chars.forEach((c, i) => {
      const b = c.querySelector('.rpm-bob');
      if (!i) {
        push(sc.anim(b, [{ transform: 'translateX(-28px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: D[3] + 120, delay: 180, easing: Es.out, fill: 'backwards' }));
        push(sc.anim(b.querySelector('img'), [{ rotate: '0deg' }, { rotate: '-4deg', offset: 0.25 }, { rotate: '3deg', offset: 0.55 }, { rotate: '-2deg', offset: 0.8 }, { rotate: '0deg' }], { duration: 1100, delay: 180 + D[3] + 120, easing: Es.inout }));
        return;
      }
      push(sc.anim(b, [{ transform: 'translate(22px, 0) scale(.92)', opacity: 0 }, { transform: 'translate(10px, -30px) scale(1)', opacity: 1, offset: 0.45 }, { transform: 'none', offset: 0.8 }, { transform: 'translate(0, -5px)', offset: 0.9 }, { transform: 'none' }], { duration: 620, delay: 420 + i * 160, easing: Es.out, fill: 'backwards' }));
    });
    const landed = () => { if (!sc.aborted) st.classList.add('is-landed'); };
    const last = anims[anims.length - 1];
    if (last) last.addEventListener('finish', landed); else landed();
    ['keydown', 'pointerdown', 'wheel', 'touchstart'].forEach(t => sc.listen(W, t, e => { if (e && e.target && e.target.closest && e.target.closest('[data-rpm-replay]')) return; anims.forEach(a => { try { if (a.playState !== 'finished') a.finish(); } catch (x) { /* cancelled */ } }); landed(); }, { passive: true, once: true }));
    sc.layers(st, [{ el: st.querySelector('.rpm-world'), x: -8, y: -5, s: 60 }, { el: st.querySelector('.rpm-swatches'), x: -14, y: -8, s: 30 }, { el: st.querySelector('.rpm-plan'), x: 4, y: 3 }, { el: st.querySelector('.rpm-cast'), x: 8, y: 2 }]);
    sc.pauseOffscreen(st);
    // the demo plays once, when the plan is in view (at once on a desktop; on a phone when it scrolls up)
    const fig = st.querySelector('[data-rpm-plan]');
    if (fig) {
      fig.classList.add('rpm-motion');
      sc.add(() => fig.classList.remove('rpm-motion', 'rpm-playing', 'rpm-done'));
      const r = fig.getBoundingClientRect(), vh = W.innerHeight || 800;
      if (r.top < vh * 0.8 && r.bottom > 0) playDemo(fig, sc);
      else sc.enter([fig], () => playDemo(fig, sc), { threshold: 0.35 });
    }
  }

  // ---------------------------------------------------------------- 3. inside the planner: polish only, never its logic
  function steps(root, sc) {
    const sec = root.querySelector('#rp-app');
    if (!sec) return;
    const parts = Array.from(sec.querySelectorAll('.rp-head, .rp-toolbar, .rp-stage, .rp-side, .rp-files'));
    const r = sec.getBoundingClientRect();
    if (r.top < (W.innerHeight || 800) * 0.92) return;   // already on screen: nothing hides
    sec.classList.add('rpm-pre');
    sc.add(() => sec.classList.remove('rpm-pre', 'rpm-in'));
    sc.enter([sec], () => {
      sec.classList.remove('rpm-pre');
      sec.classList.add('rpm-in');
      parts.forEach((p, i) => sc.anim(p, [{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' }], { duration: 560, delay: i * 110, easing: M().ease.out, fill: 'backwards' }));
      Array.from(sec.querySelectorAll('.rp-tabn')).forEach((n, i) => sc.anim(n, [{ transform: 'scale(.3)', opacity: 0 }, { transform: 'scale(1.15)', opacity: 1, offset: 0.6 }, { transform: 'none', opacity: 1 }], { duration: 460, delay: 420 + i * 120, easing: M().ease.out, fill: 'backwards' }));
    }, { threshold: 0.12 });
  }
  // the stitched thread through the five steps: every step before the open one is stitched in gold (state, not motion)
  function thread(root) {
    const tabs = root.querySelector('.rp-tabs');
    if (!tabs) return null;
    tabs.classList.add('rpm-thread');
    const mark = () => {
      const bs = Array.from(tabs.querySelectorAll('[data-rp-tab]')), at = bs.findIndex(b => b.getAttribute('aria-selected') === 'true');
      bs.forEach((b, i) => b.toggleAttribute('data-rpm-done', i < at));
    };
    mark();
    if (typeof MutationObserver === 'undefined') return null;
    const mo = new MutationObserver(mark);
    mo.observe(tabs, { subtree: true, attributes: true, attributeFilter: ['aria-selected'] });
    return mo;
  }
  // fit-check results that change get a moment: a green glow when a check passes, a short pulse when one needs review or a fix
  function fits(root) {
    const st = root.querySelector('[data-rp-status]'), chk = root.querySelector('[data-rp-panel="check"]');
    if (!st || typeof MutationObserver === 'undefined') return [];
    const read = () => Array.from(st.querySelectorAll('.rp-chips li')).map(l => l.className);
    let prev = read(), prevHead = (st.querySelector('.rp-fithead b') || {}).className, prevOk = !!(chk && chk.querySelector('.rp-allok'));
    const on = () => !!(M() && M().allowed());
    const mo = new MutationObserver(() => {
      const now = read(), lis = Array.from(st.querySelectorAll('.rp-chips li'));
      if (on()) lis.forEach((l, i) => { if (prev[i] && prev[i] !== now[i]) l.classList.add(/is-ok/.test(now[i]) ? 'rpm-pass' : 'rpm-alert'); });
      const hb = st.querySelector('.rp-fithead b');
      if (on() && hb && prevHead && hb.className !== prevHead) hb.classList.add(/rp-good/.test(hb.className) ? 'rpm-pass' : 'rpm-alert');
      prev = now; prevHead = hb ? hb.className : prevHead;
    });
    mo.observe(st, { childList: true });
    const out = [mo];
    if (chk) {
      const mc = new MutationObserver(() => {
        const ok = !!chk.querySelector('.rp-allok');
        if (on() && ok && !prevOk) chk.querySelector('.rp-allok').classList.add('rpm-pass');
        if (on()) chk.querySelectorAll('.rp-is-stop').forEach(l => l.classList.add('rpm-alert'));
        prevOk = ok;
      });
      mc.observe(chk, { childList: true });
      out.push(mc);
    }
    return out;
  }

  // the squish as a piece snaps into place, and the soft shadow under a dragged piece (document listeners, once; they read the planner's
  // own state, after its handlers have run, and never change it)
  let grab = null;
  const planner = () => W.FFRoomPlanner;
  const posOf = id => { const p = planner(), i = p && p.state && p.state.items.find(x => x.id === id); return i ? [i.x, i.y, i.at, i.wall, i.w, i.l, i.rot].join(',') : ''; };
  function squish(id, soft) {
    if (!M() || !M().allowed()) return;
    const g = document.querySelector(`[data-rp-canvas] .rp-it[data-id="${CSS && CSS.escape ? CSS.escape(id) : id}"]`);
    if (!g || !g.animate) return;
    const k = soft ? 0.5 : 1;
    try { g.animate([{ transform: `scale(${1 + 0.08 * k}, ${1 - 0.08 * k})` }, { transform: `scale(${1 - 0.03 * k}, ${1 + 0.03 * k})`, offset: 0.55 }, { transform: 'none' }], { duration: soft ? 260 : 420, easing: 'cubic-bezier(.3,1.4,.5,1)' }); } catch (e) { /* older browsers */ }
  }
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('pointerdown', e => {
      const g = e.target && e.target.closest && e.target.closest('[data-rp-canvas] .rp-it');
      if (!g || e.button > 0) return;
      const id = g.getAttribute('data-id'), cv = g.closest('[data-rp-canvas]');
      grab = { id, before: posOf(id), cv };
      cv.classList.add('rpm-drag');
    }, true);   // capture: before the planner repaints the plan under the pointer
    const up = () => {
      if (!grab) return;
      const g0 = grab; grab = null;
      g0.cv.classList.remove('rpm-drag');
      if (posOf(g0.id) !== g0.before) squish(g0.id);
    };
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
    document.addEventListener('keydown', e => {
      const g = e.target && e.target.closest && e.target.closest('[data-rp-canvas] .rp-it');
      if (!g || !/^Arrow/.test(e.key)) return;
      const id = g.getAttribute('data-id');
      // read before the planner moves and repaints the piece; squish the new one once it has
      setTimeout(() => squish(id, true), 0);
    }, true);
    document.addEventListener('click', e => {
      const b = e.target && e.target.closest && e.target.closest('[data-rpm-replay]');
      if (!b || !live) return;
      const fig = b.closest('[data-rpm-plan]');
      if (fig && M() && M().allowed()) playDemo(fig, live);
    });
  }

  let observers = [];
  function setup(view, root, ok) {
    if (live) { live.abort(); live = null; }
    demo = null;
    observers.forEach(o => { try { o.disconnect(); } catch (e) { /* gone */ } });
    observers = [];
    if (view !== 'room-planner' || !root) return;
    const t = thread(root);
    if (t) observers.push(t);
    if (!M() || !M().allowed(ok)) return;
    observers = observers.concat(fits(root));
    const sc = M().scope();
    live = sc;
    hero(root, sc);
    steps(root, sc);
  }
  W.FFhooks = W.FFhooks || [];
  W.FFhooks.push(setup);
  W.FFRoomPlannerMotion = Object.freeze({ setup, decorate, demoSvg, play: () => { const f = document.querySelector('[data-rpm-plan]'); if (f && live) playDemo(f, live); }, skip: () => { if (demo) demo.finish(); }, DEMO_MS });
})();
