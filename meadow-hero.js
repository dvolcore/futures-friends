/* Futures Friends: the plush meadow world behind the Home hero. Wave 6 built it; wave 7 (owner 2026-10-06: "this needs to be much more
   effective animation, feel way more three-dimensional and big world ... the fuzz needs to be able to come in the clouds") splits it
   into depth planes that hero-world.js moves as one camera (hero-world.css holds the 3D rules).
   The world, far to near. Every plane is a full-size card at a depth (--z, px; negative = further away) and is scaled so it looks
   exactly as authored when the camera is at rest; the camera's movement then gives each plane its own parallax for free.
     sky       .mh-sky                 the plate's own sky colours as a gradient: infinitely far, it never moves
     sun       plane z -1500           the smiling felt sun and its slow light rays
     far       plane z -1100           two small felt clouds, drifting slowly across the sky and wrapping round
     hills     plane z  -650           the meadow plate with its sky keyed out and the treehouse and cottage taken out (mirrored hills fill
                                        the gap behind them); a centre crop on phones
     mid       plane z  -380           two bigger clouds, drifting faster
     treehouse plane z  -240           the treehouse, cut out of the plate (left wing of the stage)
     cottage   plane z  -200           the cottage, cut out of the plate (right wing)
     near      plane z  -110           the meadow in front of the hills (the plate's lower band, feathered top)
     front     plane z   -30           the foreground grass and daisy strip the friends stand on
   Then, in the page: the plush logo (h1, riding a little nest of clouds, one in front of it and two behind) and the cream card, the
   cast on one ground line (z 0: the camera turns around this plane, so the friends never slide), and front(): the near overlay above
   everything (z +120 .. +600: drifting petals, out-of-focus flower clumps at the desktop corners, and the opening's cloud bank, which
   hero-world.js adds only when the opening plays).
   Wave 8 (owner 2026-10-06: "break those letters up so that they can fly in and also be living ... give it more dynamic layers and
   break the 3-D world up in more layers"): more planes, far to near, among the ones above:
     rays      plane z  -560           soft light shafts falling from the sun through the air in front of the hills (hero-world.js
                                        draws them once on a small canvas, motion on only: no file, no mask, never the LCP)
     mountains plane z -1000           the far felt mountain band (ART lane, img/plush/world8), behind the hills' ridge, with atmospheric
                                        haze at its foot (depth fog, a CSS gradient in the same plane); a thinner mist rides the hills
                                        plane at their foot
   hero-world.js adds the felt birds (z -420), the butterfly and the out-of-focus bokeh in front of the cast, only with motion on.
   The plush logo is now a kit: one file (plush-logo-kit-800.webp) holds the badge without its letters (top 379 rows, what the <img>
   shows) and below it the 14 letters and the heart, each with its own contact shadow; the letters sit in their slots as CSS sprites
   of the same file (so they paint with the badge), aria-hidden: the h1's name is still the <img>'s alt "Futures Friends". Put
   back together they are the original logo (reassembly diff in the wave 8 evidence); hero-world.js flies them in and keeps them alive.
   Every layer is decorative (aria-hidden, alt=""), the storybook world, never a photo of a real place. Sizes come from
   img/plush/manifest.json, and every box is sized by CSS before a file arrives (no layout shift).
   Pure at load: returns markup strings only. Loaded before views.js; callers guard with window.FFMeadow. */
(function () {
  'use strict';
  const H = 'img/plush/hero/';
  const W8 = 'img/plush/world8/';
  // [file stem, width, height] of each served size (manifest kind "hero-layer")
  const LOGO = { w480: [480, 227], w960: [960, 455] };
  // The logo kit (800 x 689): the letterless badge in the top 800 x 379, the sprites packed below it (800 is sharp at 2x on desktop
  // and 2.6x on a phone; one file for every screen, so the <img> and the CSS sprites always share it).
  // [id, letter, row (0 FUTURES, 1 FRIENDS, 2 the heart), x, y, w, h in the badge, ax, ay in the kit]
  const KIT = { w: 800, h: 379, th: 689, src: H + 'plush-logo-kit-800.webp' };
  const LETTERS = [['F1', 'F', 0, 63, 40, 123, 178, 0, 383], ['U1', 'U', 0, 165, 57, 122, 128, 659, 383], ['T', 'T', 0, 258, 28, 102, 154, 368, 383],
    ['U2', 'U', 0, 335, 53, 107, 124, 0, 565], ['R1', 'R', 0, 433, 25, 110, 157, 254, 383], ['E1', 'E', 0, 529, 54, 90, 137, 474, 383],
    ['S1', 'S', 0, 610, 36, 123, 177, 127, 383], ['F2', 'F', 1, 160, 181, 87, 135, 568, 383], ['R2', 'R', 1, 241, 170, 86, 123, 111, 565],
    ['I', 'I', 1, 317, 175, 45, 108, 472, 565], ['E2', 'E', 1, 358, 174, 69, 106, 521, 565], ['N', 'N', 1, 422, 171, 87, 114, 381, 565],
    ['D', 'D', 1, 499, 175, 83, 115, 294, 565], ['S2', 'S', 1, 563, 183, 89, 120, 201, 565], ['heart', '', 2, 363, 280, 68, 57, 594, 565]];
  const pc = v => +(v * 100).toFixed(4) + '%';
  // one letter: placed in % of the badge, its sprite cut from the kit by background size and position (all in %, so it scales)
  const letter = ([id, , row, x, y, w, h, ax, ay], i) => `<span class="mh-l" data-l="${id}" data-row="${row}" style="--i:${i};left:${pc(x / KIT.w)};top:${pc(y / KIT.h)};width:${pc(w / KIT.w)};height:${pc(h / KIT.h)}">`
    + `<i class="mh-lf"><b class="mh-la" style="background-size:${pc(KIT.w / w)} ${pc(KIT.th / h)};background-position:${pc(ax / (KIT.w - w))} ${pc(ay / (KIT.th - h))}"></b></i></span>`;
  const letters = () => `<span class="mh-letters" aria-hidden="true">${LETTERS.map(letter).join('')}</span>`;
  const PLATE = [[800, 450], [1280, 720], [1600, 900]];
  // Depth of each plane, px (perspective 1000 px on desktop, 800 px on phones: hero-world.css).
  const DEPTH = { sun: -1500, far: -1100, mountains: -1000, hills: -650, rays: -560, mid: -380, treehouse: -240, cottage: -200, near: -110, front: -30 };
  // Clouds: [file, width, height at 480, plane, left vw, top %, display width (vw at desktop), seconds to cross the sky]
  const CLOUDS = [
    [1, 480, 333, 'far', 19, 6, 6.5, 170],
    [3, 480, 378, 'far', 70, 15, 5.5, 210],
    [4, 480, 282, 'mid', 26, 17, 10.5, 96],
    [2, 480, 280, 'mid', 63, 5, 9, 120]
  ];
  // Clouds drift from just off the left edge to just off the right edge and wrap; a negative delay starts each one at its place.
  const FROM = -32, TO = 112;
  const delay = (x, s) => -((x - FROM) / (TO - FROM)) * s;
  const SKY = '#33A0FC'; // the plate's top rows (manifest updates[W6HERO].sky_rgb 51,158,252)
  // The plate's sky down to the horizon, sampled from the master's centre column (wave 7), so the keyed hills sit in their own sky.
  const SKY_STOPS = 'linear-gradient(180deg,#33A0FC 0%,#3DA4FC 10%,#44AAFD 20%,#59B5FD 30%,#7AC8FD 40%,#9AD6FC 52%,#B4E0FB 64%,#C8E8F8 100%)';

  // The h1's picture is the kit, cropped by object-fit to its top 379 rows (the badge); the letters are laid over it.
  const logo = (cls = 'mh-logo-img') => `<img class="${cls}" src="${KIT.src}" width="${KIT.w}" height="${KIT.h}" alt="Futures Friends" fetchpriority="high" decoding="async" draggable="false">${letters()}`
    // the logo's cloud nest: two puffs behind it and one in front, so it sits IN the clouds (decorative, no name of their own)
    + `<span class="mh-nest" aria-hidden="true"><img class="mh-puff mh-puff-l" src="${H}felt-cloud-4-480.webp" width="480" height="282" alt="" decoding="async" draggable="false"><img class="mh-puff mh-puff-r" src="${H}felt-cloud-2-480.webp" width="480" height="280" alt="" decoding="async" draggable="false"><img class="mh-puff mh-puff-f" src="${H}felt-cloud-1-480.webp" width="480" height="333" alt="" decoding="async" draggable="false"></span>`;

  const plane = (k, inner) => `<span class="mh-plane mh-p-${k}" data-depth="${k}" style="--z:${DEPTH[k]}">${inner}</span>`;
  const cloud = ([n, w, h, , x, y, vw, s], i) => `<span class="mh-cloudwrap mh-cloudwrap${i}" style="--cx:${x}vw;--cy:${y}%;--cw:${vw}vw;--cs:${s}s;--cdl:${delay(x, s).toFixed(1)}s"><span class="mh-bz"><span class="mh-drift"><img class="mh-cloud" src="${H}felt-cloud-${n}-480.webp" width="${w}" height="${h}" alt="" decoding="async" draggable="false"></span></span></span>`;
  const clouds = k => CLOUDS.map((c, i) => (c[3] === k ? cloud(c, i) : '')).join('');

  function world() {
    return `<div class="mh-world" aria-hidden="true">
   <span class="mh-layer mh-sky"></span>
   <div class="mh-cam"><div class="mh-dolly">
    ${plane('sun', `<span class="mh-sunwrap"><span class="mh-bloom"></span><span class="mh-rays"></span><img class="mh-sun" src="${H}felt-sun-320.webp" width="320" height="305" alt="" decoding="async" draggable="false"></span>`)}
    ${plane('far', clouds('far'))}
    ${plane('mountains', `<span class="mh-frame"><picture><source media="(max-width:640px)" srcset="${H}world-mountains-c600.webp" width="600" height="289"><img class="mh-mountains" src="${W8}far-mountains-1600.webp" srcset="${W8}far-mountains-800.webp 800w, ${W8}far-mountains-1600.webp 1600w" sizes="108vw" width="1600" height="385" alt="" decoding="async" draggable="false"></picture><span class="mh-fog mh-fog-far"></span></span>`)}
    ${plane('hills', `<span class="mh-frame"><picture><source media="(max-width:640px)" srcset="${H}world-hills-c836.webp" width="836" height="941"><img class="mh-plate mh-hills" src="${H}world-hills-1280.webp" srcset="${PLATE.map(([w]) => `${H}world-hills-${w}.webp ${w}w`).join(', ')}" sizes="108vw" width="1280" height="720" alt="" fetchpriority="high" decoding="async" draggable="false"></picture><span class="mh-fog mh-fog-near"></span></span>`)}
    ${plane('rays', '')}
    ${plane('mid', clouds('mid'))}
    ${plane('treehouse', `<span class="mh-frame"><img class="mh-treehouse" src="${H}world-treehouse-320.webp" width="320" height="576" alt="" decoding="async" draggable="false"></span>`)}
    ${plane('cottage', `<span class="mh-frame"><img class="mh-cottage" src="${H}world-cottage-245.webp" width="245" height="417" alt="" decoding="async" draggable="false"></span>`)}
    ${plane('near', `<span class="mh-frame"><picture><source media="(max-width:640px)" srcset="${H}world-near-c836.webp" width="836" height="396"><img class="mh-near" src="${H}world-near-1600.webp" srcset="${H}world-near-800.webp 800w, ${H}world-near-1600.webp 1600w" sizes="108vw" width="1600" height="379" alt="" decoding="async" draggable="false"></picture></span>`)}
    ${plane('front', `<span class="mh-frontwrap"><img class="mh-front" src="${H}meadow-front-960.webp" srcset="${H}meadow-front-960.webp 960w, ${H}meadow-front-1280.webp 1280w, ${H}meadow-front-1916.webp 1916w" sizes="104vw" width="960" height="109" alt="" decoding="async" draggable="false"></span>`)}
   </div></div>
  </div>`;
  }
  // The near overlay, above the copy and the cast: out-of-focus flower clumps at the desktop corners (the closest thing to the camera).
  // hero-world.js adds the drifting petals and the opening's cloud bank here; with motion off it is just the two clumps.
  const front = () => `<div class="mh-nearworld" aria-hidden="true"><div class="mh-cam"><div class="mh-dolly">
   <span class="mh-plane mh-p-fore" data-depth="fore" style="--z:260"><img class="mh-fore mh-fore-l" src="${H}fore-clump.webp" width="300" height="197" alt="" decoding="async" draggable="false"><img class="mh-fore mh-fore-r" src="${H}fore-clump.webp" width="300" height="197" alt="" decoding="async" draggable="false"></span>
  </div></div></div>`;

  window.FFMeadow = Object.freeze({ world, front, logo, SKY, SKY_STOPS, CLOUDS, PLATE, LOGO, DEPTH, FROM, TO, KIT, LETTERS });
})();
