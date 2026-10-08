/* Futures Friends: honest labels and placeholder slots, built only from approved assets (the plush library's character art via
   FFPlush in plush-cast.js, the white wordmark) plus CSS.
   - flag(kind): a visible badge on art that is not final. 'illustration' marks the room slots (zones.jpg, carpet.jpg, kitchen.jpg),
     now labelled placeholder art built from the official cut-outs (tools/build-brand-art.mjs), so they never pass for our real
     center; 'draft' marks old-brand posters; 'layout' marks cover layouts awaiting final illustration; 'video' marks the
     placeholder clips. The slots stay where they are on purpose: they show where real photos, art and video will go.
   - slot(o): a styled empty frame for a photo or video the page needs but does not have yet, saying what goes there.
   - photo(key, o) / photoImg(key, o): a REAL photo of Futures Learning Center (img/center/, listed in img/center/manifest.json with
     its source file and sha256; wave 10, owner 2026-10-07: "We already have that, so there's no reason that should have a
     placeholder"). It fills a slot only where the photo shows what the slot promised (a room, a learning zone, the front door).
     Every one carries the credit line, so it reads as our pilot center and nothing else. Never put a render or AI image here.
   - KIT / kitImg(key, o): "branded room" CONCEPT images (img/branded-rooms/, listed in img/branded-rooms/manifest.json; owner
     2026-10-07: "They need our hypothetical carpets and our posters added so they're branded with our stuff"). The same real photo
     with the proposed Learning Zones kit (zone mat, poster or sign, plush) composited in locally. Never presented as the real
     center: photo() shows them behind a "Real room / With the kit" toggle (default: with the kit) and labels them
     "Concept: the Futures Friends Learning Zones kit in our classroom"; the plain real photo is one tap away.
     window.FFBrandedRooms lists them ({key, real, kit, alt, w, h}) for other pages (the room-kit page).
   - homeStage(): the Home hero cast, the four friends on the plush meadow (Booker center stage; meadow-hero.js draws the world).
   Loaded before views.js. Callers guard with window.FFArt, so a missing file never breaks a page. */
(function () {
  'use strict';
  const K = ['booker', 'lumi', 'zuri', 'bop'];
  const PL = () => window.FFPlush;   // plush-cast.js: the one source of character art (img/plush/characters, 480 + 960)
  const NAME = { booker: 'Booker', lumi: 'Lumi', zuri: 'Zuri', bop: 'Bop' };
  const ANIMAL = { booker: 'brown bear', lumi: 'bunny', zuri: 'turtle', bop: 'elephant' };
  const PILLS = { booker: ['LEARN', 'SMILE'], lumi: ['BELONG', 'RESET'], zuri: ['EXPLORE', 'NOURISH'], bop: ['MOVE', 'OUTSIDE'] };
  const FLAGS = {
    illustration: ['Illustration', 'Not a photo of our center'],
    layout: ['Layout preview', 'Final cover illustration still to come'],
    draft: ['Draft art', 'Being updated to the current brand'],
    video: ['Placeholder video', 'The final video is still to be made']
  };

  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // o.h = tallest display height in CSS px (picks the 480 or 960 file); the intrinsic box comes from the manifest.
  const cut = (k, o = {}) => PL().img(k, { cls: o.cls || 'ffa-cut', alt: o.alt === undefined ? NAME[k] + ' the ' + ANIMAL[k] : o.alt, eager: o.eager, h: o.h || 240 });
  const star = cls => `<svg class="ffa-star ${cls || ''}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.8-6.3 3.8 1.7-7L2 9.2l7.1-.6z"/></svg>`;
  const ICON = {
    photo: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M4 8h3l1.6-2.4h6.8L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.6" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
    video: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3" y="6" width="13" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" d="M16 10.5l5-3v9l-5-3z"/></svg>'
  };

  function flag(kind, o = {}) {
    const f = FLAGS[kind] || FLAGS.illustration;
    return `<span class="ffa-flag ffa-flag-${kind}${o.cls ? ' ' + o.cls : ''}"><b>${esc(o.title || f[0])}</b><span>${esc(o.line || f[1])}</span></span>`;
  }

  // A labelled frame for a missing photo or video. kind 'photo' | 'video'; ratio 'wide' (16:9) | 'land' (3:2) | 'tall' (4:5).
  function slot(o = {}) {
    const kind = o.kind === 'video' ? 'video' : 'photo', k = K.includes(o.k) ? o.k : null;
    const lead = o.lead || (kind === 'video' ? 'Video coming' : 'Photo coming');
    return `<figure class="ffa-slot ffa-slot-${kind} ffa-r-${o.ratio || 'land'}" style="--c:var(--${k || 'gold'})" data-placeholder="${kind}">
   <div class="ffa-slot-frame">${k ? cut(k, { alt: '', cls: 'ffa-slot-cut', h: 150 }) : ''}<span class="ffa-slot-ic">${ICON[kind]}</span>
    <span class="ffa-slot-tag">Placeholder</span></div>
   <figcaption><b>${esc(lead)}: ${esc(o.title || '')}</b>${o.line ? `<span>${esc(o.line)}</span>` : ''}</figcaption></figure>`;
  }

  // Home hero cast (wave 6, owner 2026-10-06: "Booker should be in the middle cause he's our main character"): the four friends on
  // the plush meadow, Booker center stage and in front, Lumi and Zuri beside him, Bop at the left edge. One shared ground line:
  // every figure's art box is the same height (Booker's) and every image stands on its bottom edge, so the names and pillar pills
  // sit in one row. DOM order = left to right (reading and arrow-key order); Booker holds the one tab stop.
  //   x: the figure's center, % of the stage width (desktop | phone); k: the figure's height as a share of Booker's (front = larger);
  //   rest: the art it stands in; pose: the action still used only in motion (hero-motion.js), pk its height share of the rest art;
  //   swap: the expression still the friend switches to while pointed at, focused or tapped (hero-motion.js).
  const CAST = [
    { k: 'bop', x: [17, 15], z: 1, kh: 0.86, pose: 'bop-walk-in', pk: 1, swap: 'bop-dancing' },
    { k: 'lumi', x: [34, 32.5], z: 2, kh: 0.86, pose: 'lumi-hop', pk: 0.97, swap: 'lumi-hop' },
    { k: 'booker', x: [50, 51], z: 4, kh: 1, rest: 'booker-hero', lead: true, swap: 'booker-waving' },
    { k: 'zuri', x: [66, 71], z: 2, kh: 0.86, pose: 'zuri-peek', pk: 1.0, swap: 'zuri-peek' }
  ];
  // The cast's `sizes` hint (wave 7 phone budget): the figures show at most 240 CSS px tall on desktop and 138 on phones, so the
  // 480-high file is pixel for pixel on a 2x desktop and on a 3x phone; a 300 px hint made 3x phones fetch every 960 file (~0.8 MB).
  const HERO_H = 160;
  function homeStage() {
    const motto = k => (typeof CH !== 'undefined' && CH[k] && CH[k].m) || '';
    const P = PL();
    return `<div class="ffa-stage mh-stage" role="group" aria-label="Booker, Lumi, Zuri and Bop, and the pillars each friend owns">
   <div class="ffa-cast mh-cast" role="toolbar" aria-label="Say hi to a friend">${CAST.map(c => {
     const art = c.rest || c.k;
     return `<figure class="ffa-fig${c.lead ? ' is-lead' : ''}" data-k="${c.k}" style="--c:var(--${c.k});--ar:${P.ratio(art).toFixed(5)};--x:${c.x[0]}%;--xs:${c.x[1]}%;--kh:${c.kh};--z:${c.z}"${c.pose ? ` data-pose="${c.pose}" data-pose-ar="${P.ratio(c.pose).toFixed(5)}" data-pk="${c.pk}"` : ''}${c.swap ? ` data-swap="${c.swap}" data-swap-ar="${P.ratio(c.swap).toFixed(5)}"` : ''}><button type="button" class="ffa-friend" data-k="${c.k}" data-motto="${esc(motto(c.k))}" aria-pressed="false" tabindex="${c.lead ? 0 : -1}"><span class="ffa-hop">${cut(art, { eager: true, h: HERO_H, alt: NAME[c.k] + ' the ' + ANIMAL[c.k] })}</span><span class="ffa-sr">, say hi</span></button><figcaption><b>${NAME[c.k]}</b><span class="ffa-pills">${PILLS[c.k].map(p => `<span class="ffa-pill">${p}</span>`).join('')}</span></figcaption></figure>`;
   }).join('')}</div>
   <div class="ffa-say mh-say" hidden></div><span class="ffa-sr" role="status" aria-live="polite"></span></div>`;
  }

  // A story-world scene (wave 5): a plush room behind, friends standing in front as cut-out layers, a visible label that it is an
  // illustration of the storybook world (never a photo of our center). chars: [[slug, left %], ...]; every character's height is
  // its manifest lineup scale times the same share of the scene's height (--u), so grown-ups and children keep true proportions.
  // o.u (default 56) = the height of a 1.0-scale grown-up as a % of the scene; o.y = feet above the bottom edge, %.
  function scene(e, o = {}) {
    const P = PL(), chars = (o.chars || []).filter(c => P.has(c[0]));
    const who = chars.map(c => P.name(c[0]));
    const said = who.length > 1 ? who.slice(0, -1).join(', ') + ' and ' + who[who.length - 1] : who[0];
    const alt = (P.ENV[e] || '') + (who.length ? ` ${said} ${who.length > 1 ? 'are' : 'is'} in front.` : '');
    return `<figure class="ffa-scene${o.cls ? ' ' + esc(o.cls) : ''}" style="--u:${o.u || 56}%;--y:${o.y == null ? 3 : o.y}%" data-scene="${esc(e)}">
   ${P.env(e, { cls: 'ffa-scene-room', alt, sizes: o.sizes, eager: o.eager })}
   ${chars.map(([k, x]) => `<span class="ffa-scene-char" style="--s:${P.P[k].scale};--x:${x}%;--ar:${P.ratio(k).toFixed(4)}">${P.img(k, { alt: '', h: o.h || 260, eager: o.eager })}</span>`).join('')}
   ${flag('illustration', { title: 'Illustration', line: o.line || 'The storybook world, not a photo of our center', cls: 'ffa-scene-flag' }).replace(/<\/span>$/, who.length ? `<span class="ffa-scene-who">${who.length > 1 ? 'Story-world characters' : 'Story-world character'}</span></span>` : '</span>')}</figure>`;
  }

  // ---- real photos of the pilot center (img/center/<key>-<400|800|1200>.<webp|jpg>; w,h = the 800 px copy) ----
  const CENTER_CREDIT = 'Futures Learning Center, Independence, Missouri';
  const CENTER = {
    exterior: { w: 800, h: 600, alt: 'Futures Learning Center from the street corner: a light stone building, the blue front door under the Futures sign at the left, and two child-care flag banners on the lawn' },
    'turtle-rug': { w: 800, h: 600, alt: 'A wide view of our main classroom: a grass mat with five colored turtle stepping stones, a child-size table and chairs, an alphabet rug and low cubby shelves' },
    'alphabet-rug': { w: 800, h: 600, alt: 'Our carpet area: a large alphabet rug with animals for each letter, small armchairs, a bookshelf and low toy shelves' },
    'reading-corner': { w: 800, h: 600, alt: 'Our reading corner: a wooden bookshelf of picture books, an Open your mind, open a book poster, a reading wall and a cushioned bench' },
    'dress-up-corner': { w: 800, h: 600, alt: 'Our dress-up and toy corner: green shelves of toys, a rail of dress-up costumes, a small rug and a child-size balance bike' },
    'blue-table-room': { w: 800, h: 1000, alt: 'A classroom at our center: a blue table set with learning trays, a chalkboard easel, cubby shelves and days-of-the-week posters on the wall' }
  };
  function photoImg(key, o = {}) {
    const p = CENTER[key]; if (!p) return '';
    const b = 'img/center/' + key, set = ext => [400, 800, 1200].map(w => `${b}-${w}.${ext} ${w}w`).join(', ');
    const sizes = esc(o.sizes || '(max-width:820px) 92vw, 560px');
    return `<picture><source type="image/webp" srcset="${set('webp')}" sizes="${sizes}"><img${o.cls ? ` class="${esc(o.cls)}"` : ''} src="${b}-800.jpg" srcset="${set('jpg')}" sizes="${sizes}" alt="${esc(o.alt || p.alt)}" width="${p.w}" height="${p.h}"${o.eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async" data-real-photo="${esc(key)}"></picture>`;
  }
  // ---- branded-room CONCEPTS: the owner's AI-generated concept of the proposed kit in the same room (img/branded-rooms/<key>-kit-<w>.<ext>) ----
  const KIT_LABEL = 'Concept: the Futures Friends Learning Zones kit in our classroom';
  const KIT_CAPTION = 'AI-generated proposed transformation — furnishings and products shown as concepts.';   // owner 2026-10-07: shown adjacent to every one of these images, always visible, never called an installed facility
  const KIT = {
    'turtle-rug': { zone: 'All five zones', alt: "Concept image, not installed yet: our main classroom as a proposal, with Bop's purple Movement Zone rug in front, Friends Circle, Zuri's and Lumi's rugs behind, and a poster for each friend on the walls" },
    'alphabet-rug': { zone: 'Friends Circle', alt: "Concept image, not installed yet: our carpet area with a large Friends Circle rug showing all four friends, a wall of five zone posters above the picture-book shelf, and friend plush on the bench" },
    'reading-corner': { zone: "Booker's Reading Area", alt: "Concept image, not installed yet: our reading corner with a blue Booker's Reading Area rug, a Booker poster on the wall, a picture-book shelf and a Booker plush on the bench" },
    'dress-up-corner': { zone: "Bop's Movement Zone", alt: "Concept image, not installed yet: our dress-up corner with a purple Bop's Movement Zone rug, a Bop poster above a shelf of balls, scarves and blocks, and a Bop plush" },
    'blue-table-room': { zone: "Zuri's Discovery Zone", alt: "Concept image, not installed yet: our blue-table classroom with a green Zuri's Discovery Zone rug, a Zuri poster, a nature-tray table, an easel and cubby shelves" }
  };
  function kitImg(key, o = {}) {
    const k = KIT[key], p = CENTER[key]; if (!k || !p) return '';
    const b = 'img/branded-rooms/' + key + '-kit', set = ext => [400, 800, 1200].map(w => `${b}-${w}.${ext} ${w}w`).join(', ');
    const sizes = esc(o.sizes || '(max-width:820px) 92vw, 560px');
    return `<picture><source type="image/webp" srcset="${set('webp')}" sizes="${sizes}"><img${o.cls ? ` class="${esc(o.cls)}"` : ''} src="${b}-800.jpg" srcset="${set('jpg')}" sizes="${sizes}" alt="${esc(k.alt)}" width="${p.w}" height="${p.h}"${o.eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async" data-kit-photo="${esc(key)}"></picture>`;
  }
  // The toggle: any [data-kit-show] button sets data-kit-view on its nearest [data-kit-view] holder (CSS shows that picture).
  function kitToggle(key) {
    return `<span class="ffa-kit-toggle" role="group" aria-label="Show the room"><button type="button" data-kit-show="real" aria-pressed="false">Real room</button><button type="button" data-kit-show="kit" aria-pressed="true">With the kit</button></span>`;
  }
  if (typeof document !== 'undefined' && document.addEventListener) document.addEventListener('click', e => {
    const b = e.target && e.target.closest && e.target.closest('[data-kit-show]'); if (!b) return;
    const h = b.closest('[data-kit-view]'); if (!h) return;
    const v = b.dataset.kitShow; h.dataset.kitView = v;
    h.querySelectorAll('[data-kit-show]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.kitShow === v)));
  });
  // A figure with the photo, an optional caption and the credit line. o.ratio 'wide' | 'land' crops to the slot's frame shape.
  // Rooms with a branded concept show it first, labelled, with the real photo one tap away (o.kit === false: real photo only;
  // o.kitNote === false drops the caption note where the section text already says it, e.g. Home's real-photos block).
  function photo(key, o = {}) {
    if (!CENTER[key]) return '';
    const kit = KIT[key] && o.kit !== false;
    const ratio = kit && CENTER[key] && CENTER[key].h > CENTER[key].w ? '' : o.ratio; // a portrait concept keeps its own shape: nothing is cropped away
    const cls = `ffa-photo${ratio ? ' ffa-photo-' + esc(ratio) : ''}${kit ? ' ffa-kit' : ''}${o.cls ? ' ' + esc(o.cls) : ''}`;
    const media = kit ? `<div class="ffa-kit-stage"><span class="ffa-kit-real">${photoImg(key, o)}</span><span class="ffa-kit-concept">${kitImg(key, o)}</span><span class="ffa-kit-label" aria-hidden="true">Concept</span>${kitToggle(key)}</div>` : photoImg(key, o);
    return `<figure class="${cls}"${kit ? ' data-kit-view="kit"' : ''}>${media}
   <figcaption>${o.title ? `<b>${esc(o.title)}</b>` : ''}${o.line ? `<span>${esc(o.line)}</span>` : ''}${kit ? `<span class="ffa-kit-caption">${KIT_CAPTION}</span>` : ''}${kit && o.kitNote !== false ? `<span class="ffa-kit-note">${KIT_LABEL} (${esc(KIT[key].zone)} added; not installed yet).</span>` : ''}<span class="ffa-credit">Photo: ${CENTER_CREDIT}</span></figcaption></figure>`;
  }
  const FFBrandedRooms = Object.keys(KIT).map(key => ({ key, real: `img/center/${key}-800.jpg`, kit: `img/branded-rooms/${key}-kit-800.jpg`, alt: KIT[key].alt, w: CENTER[key].w, h: CENTER[key].h, zone: KIT[key].zone, label: KIT_LABEL }));
  window.FFBrandedRooms = FFBrandedRooms;

  window.FFArt = { flag, slot, homeStage, cut, scene, photo, photoImg, kitImg, kitToggle, FLAGS, CAST, HERO_H, CENTER, CENTER_CREDIT, KIT, KIT_LABEL, KIT_CAPTION };
})();
