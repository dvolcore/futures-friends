/* Futures Friends: the Learning Zones Kit (#room-kit), owner 2026-10-07 ("put it on the website now").
   Source of truth: ~/Downloads/FUTURES_FRIENDS_PROJECT/14_Client_Package/LEARNING_ZONES_KIT_DIRECTION.md and its "Owner decisions
   2026-10-07" (binding), LEARNING_ZONES_BOM_COST.csv and floor_plans/*.svg (copied to img/room-kit/, inlined from room-kit-plans.js).
   Rules this page keeps:
   - Bop's brand accent is PURPLE (#8236AE felt / #6B2A8E ink / #F3EAFB tint). The Bop plush art itself is never recoloured.
   - Tagline: "Learn. Move. Explore. Belong."
   - Prices: the three packages are the ones already published on #pricing (read from window.FFPricing when it is loaded, the same
     numbers otherwise). The only add-on prices shown are the two the owner set on 2026-10-07: Zone Boundaries $1,195 home /
     $1,995 classroom. Every other add-on says "Quote".
   - Kits are planned with printed stick puppets; plush follow only after toy-safety testing. Every kit piece carries an honest status:
     Available now / In development / Coming later.
   - Names, friends, colours and room structure only: no curriculum lesson content (IP lockdown 2026-10-07).
   - Booker, Lumi, Zuri and Bop are labelled story-world characters; room pictures are labelled (real photo or concept).
   - The cue demo plays each friend's hello line already on the site (friend-voices.js, audio/friends/<k>-hello) after the site's
     own chime (sound.js). Nothing autoplays; the site's sound switch is respected.
   - Branded-room concept images (the owner's AI-generated images, 2026-10-07) are picked up when they exist: window.FFBrandedRooms, or
     img/branded-rooms/manifest.json {rooms:[{key, real, kit, alt, w, h}]} (coordinator, 2026-10-07). Until then the real classroom photos show alone.
   Also adds entry bands to #for-centers, #for-home, #options, #pricing, #shop-programs and #corners, and a link under the zone map.
   Public: window.FFRoomKit = { ZONES, CUE, KIT, FENCE, LAYOUTS, TIERS, ADDONS, SAFETY, STATUS, band, rooms }. Sends nothing. */
(function () {
'use strict';
if (typeof V === 'undefined') return;
const W = window;
const E = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PHONE = '(816) 988-5661', EMAIL = 'info@futureslearningcenter.com';
const TAGLINE = 'Learn. Move. Explore. Belong.';
const money = n => '$' + Number(n).toLocaleString('en-US');

// ---------------------------------------------------------------- the five zones (canon names, Center Curriculum p.6 / FF-102)
// felt = surface colour (mats, fences, signs), ink = text-safe colour, tint = mat fill. Bop purple per the owner, 2026-10-07.
const ZONES = [
  { k: 'circle', name: 'Friends Circle', who: 'All four friends', pillars: 'Shared by everyone', colour: 'Gold rim, all four friends', felt: '#E7A928', ink: '#7A5200', tint: '#FFF3D6',
    purpose: 'Where the day starts and ends: hello, talking together, watching the week’s short episode together, and goodbye. Every floor path in the room starts here.',
    path: 'Gold sit spots', card: 'Circle', items: ['8 ft round rug (6 ft at home)', '30 sit spots', 'Hand chime', 'Six friend cue cards'] },
  { k: 'booker', name: 'Booker’s Reading Area', who: 'Booker', pillars: 'Learn + Smile', colour: 'Blue', felt: '#2F6FC0', ink: '#23589F', tint: '#DCE7F6',
    purpose: 'A calm space for books, letters and telling stories back. Quiet zones sit away from the door and from active play.',
    path: 'Book prints', card: 'Booker Book Time', items: ['Blue zone mat', 'Zone sign and poster', 'Booker stick puppet', 'Picture + word bin labels'] },
  { k: 'lumi', name: 'Lumi’s Calm Corner', who: 'Lumi', pillars: 'Belong + Reset', colour: 'Pink', felt: '#D9488B', ink: '#A82A65', tint: '#F8DDE9',
    purpose: 'A soft place a child chooses when feelings get big, with family photos close by. Always a choice, never a time-out, and always in an adult’s line of sight.',
    path: 'Heart-shaped petals', card: 'Lumi Quiet Time', items: ['Pink zone mat', 'Zone sign and poster', 'Lumi stick puppet', 'Calm-down picture cards'] },
  { k: 'zuri', name: 'Zuri’s Discovery Zone', who: 'Zuri', pillars: 'Explore + Nourish', colour: 'Green', felt: '#2E9E57', ink: '#1B6E3E', tint: '#DDF0E3',
    purpose: 'Sorting, measuring, sensory bins, nature finds and food exploring. It sits next to the sink, the tables and the Eat the Rainbow wall.',
    path: 'Turtle tracks', card: 'Zuri Wonder Time', items: ['Green zone mat', 'Zone sign and poster', 'Zuri stick puppet', 'Small-parts card for rooms with 2s'] },
  { k: 'bop', name: 'Bop’s Movement Zone', who: 'Bop', pillars: 'Move + Outside', colour: 'Purple', felt: '#8236AE', ink: '#6B2A8E', tint: '#F3EAFB',
    purpose: 'Open floor for dancing, balancing, music and pretend play, and the door to outside. In a small home room, Bop’s zone shares the Friends Circle.',
    path: 'Elephant footprints', card: 'Bop & Go', items: ['Purple zone mat', 'Zone sign and poster', 'Bop stick puppet', 'Bop & Go spot line'] }
];
const FRIENDS = ZONES.filter(z => z.k !== 'circle');

// ---------------------------------------------------------------- how children move: one cue, every transition
const CUE = [
  ['chime', 'The chime', 'One soft tone from the teacher’s hand chime means “listen.”'],
  ['card', 'The friend card', 'The teacher holds up a friend’s cue card: who is calling.'],
  ['voice', 'The friend’s voice', 'That friend’s own voice line plays, the same voice children hear in the videos.'],
  ['path', 'The paw-print path', 'Children follow that friend’s prints on the floor, from the circle to the zone’s doorway.'],
  ['mat', 'The mat', 'Arriving means sitting on the friend’s mat. The chime brings everyone back to the circle.']
];

// ---------------------------------------------------------------- what is in the kit (status is honest, per the direction doc)
const STATUS = { now: 'Available now', dev: 'In development', later: 'Coming later' };
// [piece, center classroom, home daycare, church pack-away, status, note]
const KIT = [
  ['Zone signs, English and Spanish', '12 x 18 in', '9 x 12 in', 'On banner stands', 'now', 'Print-ready, friend pop-out on felt'],
  ['Character posters', '18 x 24 in', '18 x 24 in', 'On banner stands', 'now', 'Hung at child eye level'],
  ['Printed friend stick puppets', '1 per zone', '1 per zone', '1 per zone', 'now', 'Printed and packed with every kit once kit production starts'],
  ['Picture + word bin labels', '12 per zone', '12 per zone', '12 per zone, with lidded bins', 'now', 'An icon and a word on every label, never colour alone'],
  ['Cue kit: hand chime, 6 friend cue cards, set-up card', '1 per room', '1', '1, plus a Sunday reset card', 'now', 'The same cue in every room'],
  ['Friends Circle rug', '8 ft round', '6 ft round', '6 ft round, rolls up', 'dev', 'Made to order; each design ships only with its flammability report'],
  ['Zone mats (Zone Boundaries add-on)', '4 x 6 ft, one per zone', '3 x 5 ft, one per zone', '3 x 5 ft in a carry bag', 'dev', 'Felt-look print, low pile, beveled edges, non-slip back'],
  ['Friend Fence panels (Zone Boundaries add-on)', '2 per zone', '1 per zone', '6, fold flat', 'dev', 'Prototype and tip test before any sale'],
  ['Friend Shelf Bands', '4', '2', 'None', 'dev', 'Turn your own low shelves into zone edges'],
  ['Floor paths: paw and foot prints', '8 per zone', '8 per zone', 'Sit spots on carpet only', 'dev', 'Removable anti-slip vinyl, never across an exit'],
  ['Friend plush, about 12 in', '1 per zone', '1 per zone', '1 per zone', 'later', 'Only after toy-safety testing; embroidered faces, no small parts']
];

// ---------------------------------------------------------------- the Friend Fence (proposed spec, to be proven on a prototype)
const FENCE = [
  ['Height', '22 to 24 in, never above 30 in. A seated adult sees a sitting child.'],
  ['See-through top', 'The upper half of every panel is mesh or clear, so no zone is hidden.'],
  ['Anti-tip', 'Wide weighted feet or a self-standing fold; it must stay upright under a sideways push at the top edge.'],
  ['Nothing to climb', 'No footholds, no openings a head could slip through, soft fabric hinges with no pinch points.'],
  ['Soft edges', 'Rounded corners and top edge, no exposed hardware.'],
  ['Doorways', 'Two panels per zone leave a 30 to 36 in opening, wide enough for a wheelchair or walker.'],
  ['Washable', 'A removable, machine-washable printed sleeve; the core wipes clean.']
];

// ---------------------------------------------------------------- three room layouts (to-scale plans, img/room-kit/*.svg)
const LAYOUTS = [
  { k: 'home', tab: 'Home daycare', title: 'Home daycare, 12 x 14 ft', file: 'img/room-kit/home-12x14.svg',
    fit: '168 sq ft: about 4 children at Missouri’s 35 sq ft each, about 6 at the Kansas home rule of 25 sq ft.',
    how: 'Small-room rule: Bop’s Movement Zone shares the Friends Circle, and the circle rug becomes the move space at Bop & Go time. Booker and Lumi take the far corners and Zuri sits by the table. One adult position sees all four zones.' },
  { k: 'classroom', tab: 'Center classroom', title: 'Center classroom, 20 x 25 ft', file: 'img/room-kit/classroom-20x25.svg',
    fit: '500 sq ft: about 14 children at Missouri’s 35 sq ft each; Kansas centers use 28 sq ft.',
    how: 'Quiet zones sit on the window wall, away from the door. Bop has the open side of the room and Zuri is near the sink and the tables. Two fence panels per zone leave a doorway, and two adult positions cover every zone.' },
  { k: 'church', tab: 'Church, packs away', title: 'Church hall section, 28 x 22 ft, packs away', file: 'img/room-kit/church-packaway-22x28.svg',
    fit: 'Missouri faith-based programs that are license-exempt still need 35 sq ft indoors per child; Kansas has no religious exemption.',
    how: 'Everything rolls, folds or lifts, and banner stands replace wall posters, so nothing is taped or hung. The room resets for Sunday in about 15 minutes with a photo card of the correct set-up.' }
];

// ---------------------------------------------------------------- packages: the published prices on #pricing, never new ones
const FALLBACK_TIERS = [
  { id: 'home', name: 'Home Daycare', startup: 1495, monthly: 89 },
  { id: 'starter', name: 'Center Starter', startup: 2995, monthly: 229 },
  { id: 'complete', name: 'Center Complete', startup: 5995, monthly: 349 }
];
const ZONES_STARTER = {
  home: { who: 'Licensed home daycares and small church rooms', c: 'lumi', zs: 'One home set: 6 ft Friends Circle rug, 5 zone signs, 4 posters, 4 printed friend puppets, bin labels, sit spots and the cue kit', more: ['Futures Hub for you and 3 assistants', 'Level 1 training for everyone', 'A room-map call fitted to your space'] },
  starter: { who: 'Centers with 1 to 3 classrooms', c: 'booker', zs: 'A model room with the 8 ft Friends Circle and the full Zones Starter, plus Zones Starter sets for 2 more rooms', more: ['Futures Hub with unlimited staff', 'Level 1 training for all staff', 'Onboarding with a video room walk'] },
  complete: { who: 'Centers with 4 or more classrooms', c: 'zuri', zs: 'Four full room sets, each with an 8 ft Friends Circle and the full Zones Starter', more: ['Futures Hub with unlimited staff', 'Level 1 training for all staff and priority coaching', 'A setup visit in the Kansas City area, or a live video walk'] }
};
function tiers() {
  const P = W.FFPricing && Array.isArray(W.FFPricing.TIERS) ? W.FFPricing.TIERS : null;
  return FALLBACK_TIERS.map(f => { const t = P && P.find(x => x.id === f.id); return Object.assign({}, f, t ? { name: t.name, startup: t.startup, monthly: t.monthly } : {}); });
}
// Add-ons. price = a number only where the owner set it (2026-10-07); null = "Quote".
const ADDONS = [
  { name: 'Zone Boundaries, home', what: '4 zone mats (3 x 5 ft), 4 Friend Fence panels, 2 Friend Shelf Bands, floor paths', price: 1195 },
  { name: 'Zone Boundaries, classroom', what: '4 zone mats (4 x 6 ft), 8 Friend Fence panels, 4 Friend Shelf Bands, floor paths', price: 1995 },
  { name: 'Zone mats only, classroom', what: '4 zone mats, Shelf Bands and floor paths; your own low shelves become the zone edges', price: null },
  { name: 'Church Pack-Away', what: '5 banner stands, a rolling cart, rug bags, lidded bins and a Sunday reset card', price: null },
  { name: 'Extra room Zones Starter', what: 'Signs, posters, printed friend puppets, labels, sit spots and the cue kit for one more room', price: null },
  { name: 'Extra Friends Circle rug, 8 ft', what: 'Made to order', price: null }
];

// ---------------------------------------------------------------- safety and compliance
const SAFETY = [
  ['rug', 'Flammability-tested rugs', 'Every rug and mat design needs a federal flammability report (16 CFR 1630 or 1631) and a Children’s Product Certificate before it ships.'],
  ['plush', 'Toy-safety-tested plush', 'Plush ship only after testing to the U.S. toy standard (ASTM F963): embroidered faces, no small parts. Until then, printed puppets.'],
  ['eye', 'Sightlines first', 'Fences stay 22 to 24 in with see-through tops, every plan marks the adult positions, and Lumi’s Calm Corner is always in view.'],
  ['wash', 'Washable mats where your state requires them', 'Some states bar carpet in rooms for the youngest children (Missouri does, 5 CSR 25-500.082). Those rooms get washable mats laundered daily.'],
  ['ruler', 'Square feet per child', 'Each layout is checked against your licensed space: Missouri 35 sq ft per child, Kansas centers 28, Kansas homes 25.'],
  ['door', 'Clear exits', 'Exit paths stay 36 in clear, nothing sits in a door swing, and wall art is planned under the 20 percent fire-code cap.']
];

// ---------------------------------------------------------------- helpers
const art = (k, o = {}) => (W.FFPlush ? W.FFPlush.img(o.pose ? W.FFPlush.pose(k, o.pose) : k, { cls: o.cls, alt: o.alt === undefined ? '' : o.alt, eager: o.eager, h: o.h || 240 })
  : `<img src="img/cut_${k}.webp" alt="${E(o.alt || '')}" width="240" height="240" loading="lazy" decoding="async">`);
const lead = (kick, title, sub, id) => `<div class="rk-head"><span class="rk-kick">${kick}</span><h2 id="${id}">${title}</h2>${sub ? `<p class="lede">${sub}</p>` : ''}</div>`;
const sect = (id, cls, inner) => `<section class="rk-sec ${cls || ''}" id="${id}" aria-labelledby="${id}-h"><div class="wrap">${inner}</div></section>`;
const chip = s => `<span class="rk-status rk-status-${s}">${STATUS[s]}</span>`;
const zoneVars = z => `--zf:${z.felt};--zi:${z.ink};--zt:${z.tint}`;
const ICONS = {
  rug: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5" stroke-dasharray="2 2"/>',
  plush: '<circle cx="12" cy="13" r="6"/><circle cx="7.5" cy="7" r="2.4"/><circle cx="16.5" cy="7" r="2.4"/><path d="M10 14h4"/>',
  eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.6"/>',
  wash: '<rect x="4" y="3" width="16" height="18" rx="3"/><circle cx="12" cy="13" r="4.5"/><path d="M8 6.5h2"/>',
  ruler: '<rect x="3" y="8" width="18" height="8" rx="1.5"/><path d="M7 8v3M11 8v4M15 8v3M19 8v4"/>',
  door: '<path d="M6 21V4h10v17M4 21h16"/><circle cx="13.5" cy="12.5" r=".9"/><path d="M19 9l2 2-2 2"/>'
};
const icon = k => `<svg class="rk-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[k] || ''}</svg>`;
// a little row of prints, in the friend's colour (decorative)
const PRINT = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><ellipse cx="12" cy="15" rx="5" ry="4.2"/><circle cx="6.2" cy="9" r="2"/><circle cx="10" cy="6.2" r="2"/><circle cx="14" cy="6.2" r="2"/><circle cx="17.8" cy="9" r="2"/></svg>';

// ---------------------------------------------------------------- sections
function hero() {
  return `<header class="wc-hero rk-hero"><div class="wrap wc-hero-grid">
  <div class="wc-hero-copy"><span class="rk-kick rk-kick-dark">For centers, home daycares and church programs</span>
   <h1>The Learning Zones Kit</h1>
   <p class="rk-tagline">${TAGLINE}</p>
   <p class="lede">Each friend gets a space in your room: a carpet, a low fence, a sign, a poster and a friend puppet. A chime and a friend’s voice tell children where to go next, and a paw-print path on the floor takes them there. It works in a 12 x 14 ft home daycare, a center classroom, or a church hall that is cleared by Sunday.</p>
   <ul class="rk-facts"><li>Ages 2 to 5</li><li>Home, center and church layouts</li><li>Fences 22 to 24 in: adults see every zone</li><li>English and Spanish signs</li></ul>
   <div class="wc-acts"><button type="button" class="btn gold" data-anchor="rk-ask">Request a quote</button><button type="button" class="btn ghost" data-anchor="rk-layouts">See the room layouts</button></div></div>
  <div class="wc-stage rk-stage" role="group" aria-label="Booker, Lumi, Zuri and Bop, story-world characters">
   ${FRIENDS.map((z, i) => `<figure class="wc-fig" style="${zoneVars(z)}">${art(z.k, { eager: i < 2, h: 300, alt: W.FFPlush ? undefined : z.who })}<figcaption><b>${E(z.who)}</b><span class="rk-zonetag">${E(z.name)}</span></figcaption></figure>`).join('')}
   <p class="rk-storytag">Story-world characters</p>
  </div></div></header>`;
}

function rooms() {
  return sect('rk-room', 'band-paper rk-roomband', `${lead('In a real room', 'Our pilot classroom, today', 'Real photos of Futures Learning Center in Independence, Missouri, shown first as a labelled concept image of the Learning Zones kit in the room. Tap “Real room” to see the room as it is today.', 'rk-room-h')}
   <div class="rk-rooms" data-rk-rooms>${['turtle-rug', 'alphabet-rug', 'reading-corner'].map(k => roomFig({ key: k })).join('')}</div>`);
}
const REAL_ALT = {
  'turtle-rug': 'The main classroom at Futures Learning Center: a grass mat with turtle stepping stones, a child-size table, an alphabet rug and cubby shelves',
  'alphabet-rug': 'The carpet area at Futures Learning Center: a large alphabet rug, small armchairs, the reading shelf and toy shelves',
  'reading-corner': 'The reading corner at Futures Learning Center: a bookshelf of picture books, a reading wall and a cushioned bench',
  'dress-up-corner': 'The dress-up and toy corner at Futures Learning Center: a shelf of toys, a rail of costumes, a small rug and a balance bike',
  'blue-table-room': 'A classroom at Futures Learning Center: a blue table set with learning trays, a chalkboard easel and cubby shelves'
};
const realSrc = (k, w) => `img/center/${k}-${w}.webp`;
function roomFig(r) {
  const k = String(r.key || ''), has = !!(r.kit && /^img\//.test(r.kit) && !/["<>]/.test(r.kit));
  const real = `<img class="rk-room-real" src="${realSrc(k, 800)}" srcset="${realSrc(k, 400)} 400w, ${realSrc(k, 800)} 800w, ${realSrc(k, 1200)} 1200w" sizes="(max-width:760px) 92vw, 33vw" alt="${E(REAL_ALT[k] || 'A classroom at Futures Learning Center')}" width="1200" height="800" loading="lazy" decoding="async">`;
  const kit = has ? `<img class="rk-room-kit" src="${E(r.kit)}" alt="${E(r.alt || 'Planned design: the same room with the Learning Zones Kit added')}" width="${+r.w || 1200}" height="${+r.h || 800}" loading="lazy" decoding="async" hidden>` : '';
  return `<figure class="rk-roomfig${has ? ' rk-has-kit' : ''}" data-room="${E(k)}"><div class="rk-roomframe">${real}${kit}
    <span class="rk-roomlabel" data-rk-label>Real photo</span></div>
    ${has ? `<div class="rk-toggle" role="group" aria-label="Show the room"><button type="button" aria-pressed="true" data-rk-view="real">Real room</button><button type="button" aria-pressed="false" data-rk-view="kit">With the kit</button></div>` : ''}
    <figcaption>${has ? `<b class="rk-roomcap">${(W.FFArt && W.FFArt.KIT_CAPTION) || 'Planned design.'}</b> Planned view of a room like ours; it is not a photo of a finished room.` : 'Real photo, no people. Concept views with the kit are on the way.'}</figcaption></figure>`;
}

function zones() {
  return sect('rk-zones', '', `${lead('The five zones', 'One space per friend, plus the circle they share', 'The zone names match the curriculum, the staff training and the Futures Hub, so children, teachers and families use the same words. Each friend’s colour runs through the mat, the fence, the sign and the path.', 'rk-zones-h')}
   <ul class="rk-zonelist">${ZONES.map(z => `<li class="rk-zone rk-zone-${z.k}" style="${zoneVars(z)}">
    <div class="rk-zoneart" aria-hidden="true">${z.k === 'circle' ? `<span class="rk-heads">${FRIENDS.map(f => art(f.k, { h: 120 })).join('')}</span>` : art(z.k, { h: 200 })}</div>
    <div class="rk-zonebody"><h3>${E(z.name)}</h3>
     <p class="rk-zonemeta"><span class="rk-swatch" aria-hidden="true"></span><span><b>${E(z.colour)}</b> · ${E(z.pillars)}</span></p>
     <p>${E(z.purpose)}</p>
     <ul class="rk-zoneitems">${z.items.map(i => `<li>${E(i)}</li>`).join('')}<li>Path: ${E(z.path)}</li></ul>
     ${z.k === 'circle' ? '' : `<button type="button" class="rk-hear" data-rk-cue="${z.k}" aria-describedby="rk-cue-note"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/></svg>Hear ${E(z.who)}’s cue</button>`}
     <p class="rk-who">${z.k === 'circle' ? 'Booker, Lumi, Zuri and Bop are story-world characters.' : `${E(z.who)} is a story-world character.`}</p></div></li>`).join('')}</ul>`);
}

function cue() {
  const V0 = W.FFVoices;
  return sect('rk-cue', 'tx-cream rk-cueband', `${lead('How children move', 'The same cue, every transition', 'Young children follow routines they can see and hear. Every Futures Friends room uses one sequence, so children learn it in the first week and start moving on their own.', 'rk-cue-h')}
   <div class="rk-cuegrid">
    <ol class="rk-cuesteps" data-rk-steps>${CUE.map((c, i) => `<li data-step="${c[0]}"><span class="rk-n" aria-hidden="true">${i + 1}</span><div><b>${c[1]}</b><span>${c[2]}</span></div></li>`).join('')}</ol>
    <div class="rk-cuedemo" data-rk-demo data-k="bop" style="${zoneVars(ZONES[4])}">
     <h3>Try it: hear a friend call</h3>
     <div class="rk-pick" role="group" aria-label="Choose a friend">${FRIENDS.map(z => `<button type="button" class="rk-pickb" data-rk-pick="${z.k}" aria-pressed="${z.k === 'bop'}" style="${zoneVars(z)}">${art(z.k, { h: 64 })}<span>${E(z.who)}</span></button>`).join('')}</div>
     <div class="rk-cuecard" aria-live="polite"><span class="rk-cuecard-k" data-rk-cardname>${E(ZONES[4].card)}</span><p class="rk-line" data-rk-line>${V0 && V0.LINES ? '“' + E(V0.LINES.bop) + '”' : ''}</p></div>
     <div class="rk-pathrow" aria-hidden="true"><span class="rk-from">Circle</span><span class="rk-prints">${PRINT.repeat(6)}</span><span class="rk-to">Mat</span></div>
     <div class="wc-acts"><button type="button" class="btn gold" data-rk-cue="">Hear the cue</button><a class="btn soft" data-rk-videos href="#bop-at-home">Watch Bop’s videos</a></div>
     <p class="rk-note" id="rk-cue-note">Plays the site’s chime, then the friend’s own hello line from the Futures Friends videos. In the classroom the teacher plays it from the Futures Hub. <span data-rk-cuemsg></span></p>
    </div></div>`);
}

function kit() {
  return sect('rk-kit', 'band-paper', `${lead('What arrives', 'What is in the kit', 'Sizes change with the room. Each piece says where it stands today, and your written quote does the same.', 'rk-kit-h')}
   <p class="rk-legend">${Object.keys(STATUS).map(chip).join(' ')}</p>
   <div class="tw rk-kittable"><table><caption class="wc-vh">Learning Zones Kit pieces by room type, with status</caption>
    <thead><tr><th scope="col">Piece</th><th scope="col">Center classroom</th><th scope="col">Home daycare</th><th scope="col">Church pack-away</th><th scope="col">Status</th></tr></thead>
    <tbody>${KIT.map(r => `<tr><th scope="row">${E(r[0])}<span class="rk-kitnote">${E(r[5])}</span></th><td data-l="Center">${E(r[1])}</td><td data-l="Home">${E(r[2])}</td><td data-l="Church">${E(r[3])}</td><td>${chip(r[4])}</td></tr>`).join('')}</tbody></table></div>
   <p class="rk-note">Plush friends are in development and must pass toy-safety testing first. Kits are planned to include printed friend stick puppets, and the plush follow once they pass.</p>`);
}

function fence() {
  return sect('rk-fence', '', `<div class="rk-fencegrid"><div>${lead('The Friend Fence', 'Low enough to see over, steady enough to stay put', 'Licensing asks that children are supervised by sight and sound at all times. So the fence marks a space for children without hiding them from adults. This is our proposed spec; a prototype must pass a tip test before any panel is sold.', 'rk-fence-h')}
    <dl class="rk-spec">${FENCE.map(f => `<div><dt>${f[0]}</dt><dd>${f[1]}</dd></div>`).join('')}</dl></div>
   <figure class="rk-fencefig"><svg viewBox="0 0 360 250" role="img" aria-labelledby="rk-fence-svg-t"><title id="rk-fence-svg-t">Friend Fence panel diagram: 36 in wide, 22 to 24 in high, see-through upper half, weighted feet, compared with a seated adult's eye line</title>
     <line x1="20" y1="214" x2="340" y2="214" class="rk-fl-floor"/>
     <rect x="70" y="84" width="200" height="124" rx="16" class="rk-fl-panel"/>
     <rect x="84" y="96" width="172" height="52" rx="10" class="rk-fl-window"/>
     <path d="M96 122h148M96 110h148M96 134h148M110 98v48M140 98v48M170 98v48M200 98v48M230 98v48" class="rk-fl-mesh"/>
     <rect x="60" y="204" width="54" height="12" rx="6" class="rk-fl-foot"/><rect x="226" y="204" width="54" height="12" rx="6" class="rk-fl-foot"/>
     <line x1="300" y1="84" x2="300" y2="208" class="rk-fl-dim"/><path d="M294 84h12M294 208h12" class="rk-fl-dim"/>
     <text x="308" y="140" class="rk-fl-t">22–24 in</text>
     <line x1="70" y1="232" x2="270" y2="232" class="rk-fl-dim"/><text x="170" y="247" text-anchor="middle" class="rk-fl-t">36 in panel</text>
     <line x1="20" y1="58" x2="340" y2="58" class="rk-fl-eye"/><text x="22" y="50" class="rk-fl-t">seated adult’s eye line</text>
     <text x="170" y="180" text-anchor="middle" class="rk-fl-t rk-fl-in">see-through top</text>
    </svg><figcaption>Proposed panel. Never above 30 in.</figcaption></figure></div>`);
}

function layouts() {
  const P = W.FFRoomKitPlans || {};
  return sect('rk-layouts', 'band-paper', `${lead('Room layouts', 'Three floor plans to start from', 'Each plan is drawn to scale on a one-foot grid, with zone mats, fences, paw-print paths, adult positions with sight lines and a 36 in clear exit path. During onboarding we fit the closest one to your real room.', 'rk-layouts-h')}
   <div class="rk-tabs" role="tablist" aria-label="Room layouts">${LAYOUTS.map((l, i) => `<button type="button" role="tab" id="rk-tab-${l.k}" aria-controls="rk-plan-${l.k}" aria-selected="${i === 1}" tabindex="${i === 1 ? 0 : -1}" data-rk-tab="${l.k}">${l.tab}</button>`).join('')}</div>
   ${LAYOUTS.map((l, i) => `<div class="rk-plan" role="tabpanel" id="rk-plan-${l.k}" aria-labelledby="rk-tab-${l.k}" data-plan="${l.k}"${i === 1 ? '' : ' hidden'}>
    <div class="rk-plansheet">${P[l.k] || `<img src="${l.file}" alt="${E(l.title)}: to-scale floor plan" loading="lazy" decoding="async" width="1080" height="836">`}</div>
    <div class="rk-plantext"><h3>${E(l.title)}</h3><p>${E(l.how)}</p><p class="rk-fit"><b>Capacity check:</b> ${E(l.fit)}</p>
     <a class="rl" href="${l.file}" target="_blank" rel="noopener">Open the full-size plan<span class="wc-vh"> (opens in a new tab)</span></a></div></div>`).join('')}`);
}

function packages() {
  const T = tiers();
  return sect('rk-packages', '', `${lead('Packages', 'The kit is part of every startup package', 'Every package already includes a Zones Starter: the Friends Circle, signs, posters, printed friend puppets, labels and the cue kit. Zone carpets and fences are a separate add-on.', 'rk-packages-h')}
   <ul class="rk-tiers">${T.map(t => { const z = ZONES_STARTER[t.id]; return `<li class="rk-tier" style="--c:var(--wc-${z.c})"><h3>${E(t.name)}</h3><p class="rk-tierwho">${E(z.who)}</p>
    <p class="rk-amt"><b data-price="${t.startup}">${money(t.startup)}</b> startup <span>+ <b data-price="${t.monthly}">${money(t.monthly)}</b> / month</span></p>
    <p class="rk-zs"><b>Zones Starter:</b> ${E(z.zs)}</p><ul>${z.more.map(m => `<li>${E(m)}</li>`).join('')}</ul></li>`; }).join('')}</ul>
   <p class="rk-note">These are the published launch prices on our <a class="rl" href="#pricing">pricing page</a>, before tax. Ordering opens soon; your written quote confirms every line.</p>
   <h3 class="rk-subh" id="rk-addons-h">Add the boundaries: zone carpets and fences</h3>
   <div class="tw rk-addons"><table aria-labelledby="rk-addons-h"><thead><tr><th scope="col">Add-on</th><th scope="col">What is in it</th><th scope="col" class="n">Price</th></tr></thead>
    <tbody>${ADDONS.map(a => `<tr${a.price ? ' class="rk-set"' : ''}><th scope="row">${E(a.name)}</th><td>${E(a.what)}</td><td class="n">${a.price ? `<b data-price="${a.price}">${money(a.price)}</b>` : '<span class="rk-quote">Quote</span>'}</td></tr>`).join('')}</tbody></table></div>
   <p class="rk-note">Zone Boundaries are priced per room. Other add-ons are quoted for your room once vendor prices are confirmed.</p>`);
}

function safety() {
  return `<section class="rk-sec rk-safety band-navy" id="rk-safety" aria-labelledby="rk-safety-h"><div class="wrap">${lead('Built safe', 'What we check before anything ships', '', 'rk-safety-h')}
   <ul class="rk-safelist">${SAFETY.map(s => `<li>${icon(s[0])}<div><b>${s[1]}</b><span>${s[2]}</span></div></li>`).join('')}</ul>
   <p class="rk-safenote">Every zone also has an icon and a word, not only a colour, and 36 in routes between zones for wheelchairs and walkers. Family updates describe the class’s day, never a child’s location.</p></div></section>`;
}

const PRESET = { id: 'room-kit', heading: 'Request a quote or book a demo', interest: 'quote', what: 'quote and demo requests',
  message: 'I would like a quote for the Learning Zones Kit. Rooms: \nAges: \nRoom type (home, center or church): ' };
function ask() {
  const I = W.FFIntake;
  const form = I && I.contactHtml ? I.contactHtml('quote', PRESET)
    : `<div class="card"><h3>${PRESET.heading}</h3><p class="small">Online requests open soon. Please call <b>${PHONE}</b> or email <b>${EMAIL}</b>.</p></div>`;
  return sect('rk-ask', 'band-paper', `<div class="rk-askgrid"><div>${lead('Talk to us', 'Plan your room with us', 'Tell us your rooms, ages and enrollment. We will send a written quote that marks each piece as available now, in development or coming later, and fit a floor plan to your space.', 'rk-ask-h')}
    <ol class="rk-start"><li><b>Call</b><span>30 minutes on your rooms, ages and enrollment.</span></li><li><b>Room map</b><span>Send a photo and measurements; we fit a layout.</span></li><li><b>Your kit</b><span>Print pieces first; rugs and fences are made to order.</span></li><li><b>First circle</b><span>Your team learns the cue, and the room opens.</span></li></ol>
    <div class="wc-acts"><button type="button" class="btn navy" data-rk-demo-ask>Book a demo instead</button><a class="btn soft" href="#pricing">See all prices</a></div>
    <p class="rk-note">Or call <a class="rl" href="tel:+18169885661">${PHONE}</a> or email <a class="rl" href="mailto:${EMAIL}">${EMAIL}</a>.</p></div>
   <div class="wc-partner-form">${form}</div></div>`);
}

V['room-kit'] = () => `<div class="wc rk">${hero()}${zones()}${cue()}${rooms()}${kit()}${fence()}${layouts()}${packages()}${safety()}${ask()}
 <p class="wrap rk-foot">${TAGLINE} Booker, Lumi, Zuri and Bop are story-world characters. Room photos are real unless marked as a concept. Prices as of October 2026.</p></div>`;

// ---------------------------------------------------------------- behaviour (delegated; nothing runs until a visitor acts)
let pick = 'bop', timers = [];
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
function clearRun() { timers.forEach(clearTimeout); timers = []; $$('[data-rk-steps] li').forEach(li => li.classList.remove('is-on')); const d = document.querySelector('[data-rk-demo]'); if (d) d.classList.remove('is-walking'); }
function setPick(k) {
  const z = ZONES.find(x => x.k === k); if (!z) return;
  pick = k;
  const d = document.querySelector('[data-rk-demo]'); if (!d) return;
  d.setAttribute('style', zoneVars(z)); d.dataset.k = k;
  $$('[data-rk-pick]', d).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.rkPick === k)));
  const n = d.querySelector('[data-rk-cardname]'); if (n) n.textContent = z.card;
  const L = W.FFVoices && W.FFVoices.LINES, l = d.querySelector('[data-rk-line]'); if (l) l.textContent = L && L[k] ? '“' + L[k] + '”' : '';
  const v = d.querySelector('[data-rk-videos]'), G = W.FFVoices && W.FFVoices.GO && W.FFVoices.GO[k];
  if (v && G) { v.setAttribute('href', '#' + G[0]); v.textContent = 'Watch ' + z.who + '’s videos'; }
}
function runCue(k) {
  clearRun(); setPick(k);
  const msg = document.querySelector('[data-rk-cuemsg]'); if (msg) msg.textContent = '';
  const steps = $$('[data-rk-steps] li'), on = i => { if (steps[i]) steps[i].classList.add('is-on'); };
  const reduced = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const S = W.FFSound, Vo = W.FFVoices;
  on(0); try { if (S && S.play) S.play('chime', { gain: 0.8 }); } catch (_) { /* sound is optional */ }
  timers.push(setTimeout(() => on(1), reduced ? 0 : 500));
  timers.push(setTimeout(() => {
    on(2);
    const r = Vo && Vo.play ? Vo.play(k) : 'none';
    if (msg && r === 'off') msg.innerHTML = 'Sound is off on this site. <button type="button" class="rl" data-rk-soundon>Turn sound on</button> to hear it.';
    if (msg && r === 'none') msg.textContent = 'This browser could not play the voice line.';
  }, reduced ? 0 : 1000));
  timers.push(setTimeout(() => { on(3); const d = document.querySelector('[data-rk-demo]'); if (d) d.classList.add('is-walking'); }, reduced ? 0 : 2400));
  timers.push(setTimeout(() => on(4), reduced ? 0 : 4200));
}
function showRoom(fig, which) {
  const kitImg = fig.querySelector('.rk-room-kit'), realImg = fig.querySelector('.rk-room-real'); if (!kitImg) return;
  const kitOn = which === 'kit';
  kitImg.hidden = !kitOn; realImg.hidden = kitOn;
  $$('[data-rk-view]', fig).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.rkView === which)));
  const lab = fig.querySelector('[data-rk-label]'); if (lab) { lab.textContent = kitOn ? 'Planned design' : 'Real photo'; lab.classList.toggle('is-concept', kitOn); }
}
if (typeof document !== 'undefined' && document.addEventListener) {
  document.addEventListener('click', e => {
    const t = e.target; if (!t || !t.closest) return;
    const p = t.closest('[data-rk-pick]'); if (p) { clearRun(); setPick(p.dataset.rkPick); return; }
    const c = t.closest('[data-rk-cue]');
    if (c) {
      const k = c.dataset.rkCue || pick;
      if (c.dataset.rkCue) { const demo = document.getElementById('rk-cue'); if (demo && demo.scrollIntoView) demo.scrollIntoView({ behavior: W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); }
      runCue(k); return;
    }
    if (t.closest('[data-rk-soundon]')) { try { W.FFSound && W.FFSound.set && W.FFSound.set(true); } catch (_) { /* ignore */ } runCue(pick); return; }
    const v = t.closest('[data-rk-view]'); if (v) { showRoom(v.closest('.rk-roomfig'), v.dataset.rkView); return; }
    const tab = t.closest('[data-rk-tab]'); if (tab) { selectTab(tab.dataset.rkTab, true); return; }
    if (t.closest('[data-rk-demo-ask]')) {
      const s = document.getElementById('cInterest'), m = document.getElementById('cMsg');
      if (s) { s.value = 'demo'; s.dispatchEvent(new Event('change', { bubbles: true })); }
      if (m && /Learning Zones Kit/.test(m.value)) m.value = 'I would like a demo of the Learning Zones Kit and the Futures Hub.';
      const card = document.getElementById('ffiContactCard'); if (card && card.scrollIntoView) card.scrollIntoView({ block: 'start' });
      if (s) s.focus();
    }
  });
  document.addEventListener('keydown', e => {
    const tab = e.target && e.target.closest && e.target.closest('[data-rk-tab]'); if (!tab) return;
    const keys = LAYOUTS.map(l => l.k), i = keys.indexOf(tab.dataset.rkTab);
    const n = e.key === 'ArrowRight' ? (i + 1) % keys.length : e.key === 'ArrowLeft' ? (i + keys.length - 1) % keys.length : e.key === 'Home' ? 0 : e.key === 'End' ? keys.length - 1 : -1;
    if (n < 0) return; e.preventDefault(); selectTab(keys[n], true);
  });
}
function selectTab(k, focus) {
  $$('[data-rk-tab]').forEach(b => { const on = b.dataset.rkTab === k; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus(); });
  $$('.rk-plan').forEach(p => { p.hidden = p.dataset.plan !== k; });
}

// Branded-room concept images: picked up when another release ships them; the real photos stay the "Real room" half.
let brandedCache = null;
function brandedRooms() {
  if (Array.isArray(W.FFBrandedRooms)) return Promise.resolve(W.FFBrandedRooms);
  if (brandedCache) return brandedCache;
  brandedCache = (typeof fetch === 'function' ? fetch('img/branded-rooms/manifest.json', { cache: 'no-cache' }).then(r => (r.ok ? r.json() : null)).catch(() => null) : Promise.resolve(null))
    .then(j => (j && Array.isArray(j.rooms) ? j.rooms : []));
  return brandedCache;
}
function mountRooms() {
  const box = document.querySelector('[data-rk-rooms]'); if (!box || box.dataset.mounted) return;
  box.dataset.mounted = '1';
  brandedRooms().then(list => {
    const ok = (list || []).filter(r => r && r.key && r.kit && REAL_ALT[r.key]);
    if (!ok.length || !document.body.contains(box)) return;
    const by = Object.fromEntries(ok.map(r => [r.key, r]));
    box.innerHTML = Object.keys(REAL_ALT).filter(k => by[k]).slice(0, 5).map(k => roomFig(by[k])).join('');
    box.querySelectorAll('.rk-has-kit').forEach(f => showRoom(f, 'kit'));
  });
}
W.FFhooks = W.FFhooks || [];
W.FFhooks.push(() => { try { if (typeof view !== 'undefined' && view === 'room-kit') { mountRooms(); setPick(pick); } } catch (e) { console.warn(e); } });

// ---------------------------------------------------------------- entry bands on other pages (wrap, never edit their source)
function band(where) {
  const copy = {
    home: ['Set up your home room', 'Five friend zones sized for a 12 x 14 ft room, with a floor plan, a cue children usually pick up quickly and an optional carpet-and-fence add-on.'],
    pricing: ['What the Zones Starter includes', 'Every package includes the Friends Circle, signs, posters and printed friend puppets. Zone carpets and fences are an add-on: $1,195 home, $1,995 classroom.'],
    shop: ['Want the whole room, not just the signs?', 'The Learning Zones Kit adds friend carpets, low fences, paw-print paths and a transition cue to your learning zones.']
  }[where] || ['Turn one room into five friend zones', 'Carpets, low see-through fences, signs, friend puppets, paw-print paths and one transition cue, with to-scale layouts for centers, homes and church halls.'];
  return `<section class="rk-band" aria-labelledby="rk-band-${where}-h"><div class="wrap rk-bandin"><span class="rk-bandheads" aria-hidden="true">${FRIENDS.map(z => art(z.k, { h: 72 })).join('')}</span>
   <div><h2 id="rk-band-${where}-h">${copy[0]}</h2><p>${copy[1]}</p></div><a class="btn gold" href="#room-kit">See the Learning Zones Kit</a></div></section>`;
}
function wrap(route, fn) {
  const base = V[route];
  if (typeof base !== 'function') return;
  V[route] = function () { return fn(base.apply(this, arguments)); };
}
// before the page's last "tight" CTA section when it has one, else at the end
const beforeLast = (html, marker, add) => { const at = html.lastIndexOf(marker); return at < 0 ? html + add : html.slice(0, at) + add + html.slice(at); };
wrap('for-centers', h => beforeLast(h, '<section class="tight">', band('centers')));   // the zone map's own caption also links here (views.js ffhMap)
wrap('for-home', h => beforeLast(h, '<section class="tight">', band('home')));
wrap('options', h => beforeLast(h, '<section class="tight">', band('options')));
wrap('pricing', h => beforeLast(h, '<section class="tight">', band('pricing')));
wrap('shop-programs', h => beforeLast(h, '<section class="tight">', band('shop')));
wrap('corners', h => beforeLast(h, '<section class="tight">', band('corners')));

try {
  const cols = document.querySelectorAll ? document.querySelectorAll('footer .cols > div') : [];
  if (cols[1] && !cols[1].querySelector('[data-go="room-kit"]')) cols[1].insertAdjacentHTML('beforeend', '<button data-go="room-kit">Learning Zones Kit</button>');
} catch (e) { /* the footer is optional */ }

W.FFRoomKit = { ZONES, CUE, KIT, FENCE, LAYOUTS, TIERS: tiers, ZS: ZONES_STARTER, ADDONS, SAFETY, STATUS, TAGLINE, band, rooms: brandedRooms };
})();
