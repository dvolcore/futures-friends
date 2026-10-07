/* Futures Friends plush world: the ONE source of character art for the site (wave 5).
   Every character picture on the site comes from img/plush/characters/<slug>-480.webp and -960.webp (img/plush/manifest.json),
   served with srcset so a phone or a 2x screen gets the sharp file and a small figure gets the light one. The intrinsic
   width/height come from the manifest, so the browser reserves the right box before the file arrives (no layout jump) and
   object-fit:contain (brand-art.css) means a character is never stretched.

   Heights: `scale` is the manifest's lineup_scale (grown-ups about 1.0, children 0.55 to 0.64). Anything that shows grown-ups
   and children together sizes them from one shared unit, so a child is never scaled up beside an adult (town()).

   Names and roles beyond Booker, Lumi, Zuri, Bop and Ms. June are proposals (manifest `proposed: true`); the site presents
   them only as story-world characters (supporting-cast.js labels them), never as people at a real center.
   Loaded before supporting-cast.js, brand-art.js and views.js; pure (no DOM at load), so tests can run it in a VM. */
(function () {
  'use strict';
  // slug: [name, species, child|adult, lineup scale, width at 480 high, width at 960 high, proposed]
  const P = {
    booker: ['Booker', 'bear cub', 'child', 0.6, 313, 626, false],
    lumi: ['Lumi', 'bunny', 'child', 0.64, 305, 610, false],
    zuri: ['Zuri', 'turtle', 'child', 0.58, 350, 700, false],
    bop: ['Bop', 'elephant calf', 'child', 0.62, 407, 813, false],
    'ms-june': ['Ms. June', 'giraffe', 'adult', 1.22, 238, 475, false],
    'principal-hazel': ['Principal Hazel', 'deer', 'adult', 1.06, 171, 341, true],
    'mr-moss': ['Mr. Moss', 'badger', 'adult', 0.97, 291, 582, true],
    'ms-fern': ['Ms. Fern', 'owl', 'adult', 0.9, 288, 575, true],
    pip: ['Pip', 'hedgehog', 'child', 0.58, 329, 658, true],
    nico: ['Nico', 'otter', 'child', 0.6, 369, 739, true],
    tilly: ['Tilly', 'lamb', 'child', 0.58, 363, 726, true],
    poppy: ['Poppy', 'piglet', 'child', 0.57, 377, 753, true],
    finn: ['Finn', 'fox cub', 'child', 0.6, 319, 637, true],
    mimi: ['Mimi', 'mouse', 'child', 0.56, 406, 812, true],
    tad: ['Tad', 'froglet', 'child', 0.55, 305, 611, true],
    bruno: ['Bruno', 'bear', 'adult', 1.02, 279, 558, true],
    rose: ['Rose', 'rabbit', 'adult', 1.04, 199, 398, true],
    sage: ['Sage', 'turtle', 'adult', 0.95, 245, 489, true],
    ella: ['Ella', 'elephant', 'adult', 1.03, 296, 592, true],
    mara: ['Mara', 'hedgehog', 'adult', 0.96, 279, 558, true],
    rowan: ['Rowan', 'raccoon', 'adult', 0.98, 342, 684, true],
    // Lead pose variants (owner-authorised generated stills, 2026-10-06; manifest kind "pose"). Same canon design, a different action.
    'booker-reading': ['Booker', 'bear cub', 'child', 0.54, 334, 667, false],
    'booker-thinking': ['Booker', 'bear cub', 'child', 0.6, 280, 560, false],
    'booker-waving': ['Booker', 'bear cub', 'child', 0.6, 332, 664, false],
    'lumi-calm-breath': ['Lumi', 'bunny', 'child', 0.64, 298, 596, false],
    'lumi-heart-hands': ['Lumi', 'bunny', 'child', 0.64, 291, 583, false],
    'lumi-waving': ['Lumi', 'bunny', 'child', 0.64, 306, 612, false],
    'zuri-apple': ['Zuri', 'turtle', 'child', 0.58, 294, 587, false],
    'zuri-magnifier': ['Zuri', 'turtle', 'child', 0.58, 340, 681, false],
    'zuri-pointing': ['Zuri', 'turtle', 'child', 0.58, 356, 713, false],
    'bop-dancing': ['Bop', 'elephant calf', 'child', 0.62, 390, 779, false],
    'bop-running': ['Bop', 'elephant calf', 'child', 0.62, 390, 781, false],
    'bop-waving': ['Bop', 'elephant calf', 'child', 0.62, 391, 781, false],
    // Home hero action poses (wave 6, owner-authorised generated stills; manifest kind "hero-pose"). lumi-hop and zuri-peek are
    // airborne: they are only ever shown in motion (the entrance, a hop), never as a standing figure on a ground line.
    'booker-hero': ['Booker', 'bear cub', 'child', 0.6, 346, 692, false],
    'lumi-hop': ['Lumi', 'bunny', 'child', 0.64, 357, 713, false],
    'zuri-peek': ['Zuri', 'turtle', 'child', 0.58, 369, 738, false],
    'bop-walk-in': ['Bop', 'elephant calf', 'child', 0.62, 373, 746, false]
  };
  const DOING = {
    'booker-reading': 'reading a picture book', 'booker-thinking': 'thinking it over', 'booker-waving': 'waving hello',
    'lumi-calm-breath': 'taking a calm breath', 'lumi-heart-hands': 'making heart hands', 'lumi-waving': 'waving hello',
    'zuri-apple': 'holding a red apple', 'zuri-magnifier': 'looking through a magnifying glass', 'zuri-pointing': 'pointing at something to explore',
    'bop-dancing': 'dancing', 'bop-running': 'running', 'bop-waving': 'waving hello'
  };
  const POSES = Object.freeze(Object.keys(DOING));
  const HERO_DOING = { 'booker-hero': 'waving a big hello', 'lumi-hop': 'hopping', 'zuri-peek': 'springing up with both arms raised', 'bop-walk-in': 'walking in' };
  const HERO_POSES = Object.freeze(Object.keys(HERO_DOING));
  const doing = k => DOING[k] || HERO_DOING[k];
  // Story-world rooms (img/plush/environments, 800 and 1600 wide, 16:9). Illustrations of the storybook world: never a photo of a
  // real place, so every use carries a visible label (FFArt.scene). Signs in these rooms read "Futures Learning Center".
  const ENV = {
    'reading-corner': 'Plush-world reading corner: a felt book display with flower and tree covers above a green cushioned bench with flower pillows.',
    'activity-rug': 'Plush-world classroom: a round green rug with a stitched yellow border, small tables and chairs, cubbies with backpacks and a leaf-canopy reading nook by the window.',
    'cubby-entrance': 'Plush-world entry hall with a long row of wooden cubbies marked with felt symbols, woven baskets, and an open doorway into the classroom.',
    'classroom-empty-master': 'Plush-world classroom: round rug, reading bench, art shelves, small tables and a leaf-canopy nook by a sunny window.',
    'classroom-reverse-angle': 'Plush-world classroom seen from the other side: green door with a round window, felt sun and tree wall art, shelves, small tables and a round rug.',
    playground: 'Plush-world school playground: swings, a slide and climbing frame, a sandbox, garden beds and a felt fence.',
    'snack-and-wash-area': 'Plush-world snack and handwashing area: a round table with small chairs on a rug, child-height sinks with step stools, towels and mirrors.',
    'hall-reception': 'Plush-world reception hall: a welcome desk with felt leaves, a green sofa and bench, arched doorways and an oval rug leading to the front doors.'
  };
  const LEADS = Object.freeze(['booker', 'lumi', 'zuri', 'bop']);
  const KEYS = Object.freeze(Object.keys(P));
  const has = k => Object.prototype.hasOwnProperty.call(P, k);
  const key = k => (has(k) ? k : 'booker');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const src = (k, size) => `img/plush/characters/${key(k)}-${size === 960 ? 960 : 480}.webp`;
  const dims = k => [P[key(k)][4], 480];
  const ratio = k => P[key(k)][4] / 480;
  const name = k => P[key(k)][0];
  const alt = k => `${P[key(k)][0]} the ${P[key(k)][1]}${doing(key(k)) ? ', ' + doing(key(k)) : ''}`;
  // A lead's pose when it exists, else the lead's standing art: pose('zuri', 'magnifier') -> 'zuri-magnifier'.
  const pose = (k, p) => (has(`${k}-${p}`) ? `${k}-${p}` : key(k));

  // <img> for one character. o.h = the tallest it is shown, in CSS px (sets `sizes`, so the browser picks 480 or 960);
  // o.alt (default "<Name> the <species>"; '' for decorative), o.cls, o.eager, o.style, o.attrs.
  // o.fixed: width/height attributes are the display size (w x h) instead of the 480 file's size, for markup with no CSS size.
  function img(k, o = {}) {
    const s = key(k), h = Math.max(24, Math.round(o.h || 240)), w = Math.round(P[s][4] * h / 480);
    const a = o.alt === undefined ? alt(s) : o.alt;
    return `<img${o.cls ? ` class="${esc(o.cls)}"` : ''} src="${src(s, 480)}" srcset="${src(s, 480)} ${P[s][4]}w, ${src(s, 960)} ${P[s][5]}w" sizes="${w}px" `
      + `alt="${esc(a)}" width="${o.fixed ? w : P[s][4]}" height="${o.fixed ? h : 480}"${o.style ? ` style="${esc(o.style)}"` : ''} `
      + `${o.eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" draggable="false" data-plush="${s}"${o.attrs ? ' ' + o.attrs : ''}>`;
  }
  // CSS background (pseudo-elements): the 480 file, the 960 file on 2x screens.
  const bg = k => `image-set(url("${src(k, 480)}") 1x, url("${src(k, 960)}") 2x)`;

  const envSrc = (e, size) => `img/plush/environments/${Object.prototype.hasOwnProperty.call(ENV, e) ? e : 'classroom-empty-master'}-${size === 1600 ? 1600 : 800}.webp`;
  // <img> for a room: 800 and 1600 files, 16:9 box reserved. o.sizes (default 50vw), o.alt (default the room description), o.cls, o.eager.
  function env(e, o = {}) {
    const a = o.alt === undefined ? (ENV[e] || '') : o.alt;
    return `<img${o.cls ? ` class="${esc(o.cls)}"` : ''} src="${envSrc(e, 800)}" srcset="${envSrc(e, 800)} 800w, ${envSrc(e, 1600)} 1600w" sizes="${esc(o.sizes || '(max-width:760px) 92vw, 50vw')}" alt="${esc(a)}" width="1600" height="900" ${o.eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" data-plush-env="${esc(e)}">`;
  }

  window.FFPlush = Object.freeze({
    ENV: Object.freeze(Object.assign({}, ENV)), env, envSrc,
    P: Object.freeze(Object.fromEntries(KEYS.map(k => [k, Object.freeze({ name: P[k][0], species: P[k][1], age: P[k][2], scale: P[k][3], w480: P[k][4], w960: P[k][5], proposed: P[k][6] })]))),
    KEYS, LEADS, POSES, HERO_POSES, has, src, dims, ratio, name, alt, pose, img, bg
  });
})();
