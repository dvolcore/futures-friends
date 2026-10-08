/* Futures Friends Store: the catalog. ONE source for every product, collection, price, image fallback and compliance label.
   Loaded before store-cart.js, store-checkout.js and store-shop.js; also required by the Node tests (tests/store.test.js).

   Price rules (owner, 2026-10-07). A dollar figure appears here only if the owner approved it:
   - the three startup packages ($1,495 / $2,995 / $5,995; the monthly fees are memberships, see #membership, not cart lines);
   - Zone Boundaries, $1,195 home / $1,995 classroom;
   - Kids' Shop: the friend poster $16 and the plush $26 (the plush stays NOT orderable until safety testing: "Notify me").
   Every other item is "Request a quote" or "Price coming soon". Never invent a price, a lead time or a stock count.
   The curriculum itself is a membership or licence, never a store item, and no curriculum content appears in the store.
   Tests check these numbers against pricing-all-in.js (FFPricing), room-kit.js (FFRoomKit) and data.js (D.catalog).
   Images: img/store/manifest.json (written by tools/import-store-images.mjs) wins; until a real product picture exists the
   product falls back to a branded-room concept image (labelled Concept image) or the plush art. */
(function (root, factory) {
  const api = factory(typeof require === 'function' && typeof module === 'object' ? require('./store-merch-data.js') : root.FFMerchData);
  if (typeof module === 'object' && module.exports) module.exports = api; else root.FFCatalog = api;
})(typeof window !== 'undefined' ? window : globalThis, function (MERCH) {
  'use strict';

  // ------------------------------------------------------------------ approved numbers
  const APPROVED = Object.freeze({
    packages: { home: 1495, starter: 2995, complete: 5995 },
    monthly: { home: 89, starter: 229, complete: 349 },
    boundaries: { home: 1195, classroom: 1995 },
    kids: { poster: 16, plush: 26 }
  });
  const CONCEPT_CAPTION = 'Room pictures are design renderings of how the zones can look.';
  const DRAFT = 'Draft, owner and counsel to confirm';
  const STATUS_LABEL = { quote: 'Request a quote', soon: 'Price coming soon', free: 'Free', membership: 'Membership' };

  // ------------------------------------------------------------------ vocab for the filters
  const AUDIENCES = [['center', 'Child care center'], ['home', 'Home daycare'], ['church', 'Church or faith program'], ['family', 'Family']];
  const AGES = [['infant', 'Infants'], ['toddler', 'Toddlers'], ['twos', 'Twos'], ['threes', 'Threes'], ['prek', 'Pre-K']];
  const ZONES = [['circle', 'Friends Circle'], ['booker', 'Booker’s Reading Area'], ['lumi', 'Lumi’s Calm Corner'], ['zuri', 'Zuri’s Discovery Zone'], ['bop', 'Bop’s Movement Zone']];
  const COLLECTIONS = [
    { id: 'kits', name: 'Learning Zones Kits', blurb: 'The room, set up. Three sizes, from one home room to a four-room center.', side: 'centers', tone: 'booker', room: 'turtle-rug' },
    { id: 'carpets', name: 'Carpets and corner rugs', blurb: 'A rug for each friend\u2019s zone, and large square corner rugs that hold a furnished reading, calm, discovery or movement corner.', side: 'centers', tone: 'bop', room: 'dress-up-corner' },
    { id: 'posters', name: 'Posters', blurb: 'Booker, Lumi, Zuri, Bop and the Friends Circle, each in two designs, $16 a poster.', side: 'both', tone: 'zuri', room: null },
    { id: 'plush', name: 'Plush friends', blurb: 'Soft Booker, Lumi, Zuri and Bop. Opening soon: leave your email on a plush page and we will tell you the day it opens.', side: 'both', tone: 'lumi', room: null },
    { id: 'apparel', name: 'Apparel', blurb: 'T-shirts, hoodies and backpacks for each friend and for all four together. Sizes and prices are still being set.', side: 'both', tone: 'bop', room: null },
    { id: 'stickers', name: 'Stickers & Coloring', blurb: 'Sticker sheets and coloring books for each friend, and universe packs with all 22 friends: classmates, school friends and families.', side: 'both', tone: 'zuri', room: null },
    { id: 'drinkware', name: 'Drinkware & Mealtime', blurb: 'Insulated character bottles and the Eat the Rainbow divided plate. Made to order.', side: 'both', tone: 'bop', room: null },
    { id: 'addons', name: 'Room add-ons', blurb: 'Zone Boundaries, Friend Fences, shelf bands and pack-away gear that mark each friend\u2019s corner.', side: 'centers', tone: 'booker', room: 'reading-corner' },
    { id: 'materials', name: 'Classroom materials', blurb: 'Zone signs, puppets, cue cards and labels. Replace one, or stock a new room.', side: 'centers', tone: 'zuri', room: 'blue-table-room' },
    { id: 'books', name: 'Books', blurb: 'The five Futures Friends storybooks. Read them online now; print editions are coming.', side: 'both', tone: 'lumi', room: 'alphabet-rug' },
    { id: 'kids', name: 'Kids\u2019 Shop', blurb: 'A small shop for families: apparel, backpacks, plush friends, stickers and coloring, bottles and plates, a play carpet and free printables.', side: 'families', tone: 'lumi', room: null }
  ];


  // ------------------------------------------------------------------ shared copy
  const FAQ = {
    freight: ['How does it ship?', 'Rugs, mats and fence panels travel by freight. We quote the carrier cost for your ZIP code on your invoice, so you see it before you pay. Tell us if you have no loading dock.'],
    lead: ['How long will it take?', 'Made-to-order items have a lead time that depends on the maker’s schedule. We state it in your written quote and never promise a ship date before it is confirmed.'],
    returns: ['Can I return it?', 'Our returns policy is a draft that the owner and counsel are still confirming. Made-to-order and custom items will not be returnable unless damaged or wrong. We will send the final policy with your invoice.'],
    tax: ['Is my center or church tax-exempt?', 'Send your exemption certificate with the order and we apply it to the invoice. We collect sales tax in Missouri and Kansas on taxable orders.'],
    po: ['Can we pay by purchase order?', 'Yes. Centers and programs can order on a PO and pay by invoice. Add the PO number at checkout.'],
    cert: ['Is it tested for children?', 'Children’s products carry a Children’s Product Certificate from a CPSC-accepted lab before they ship. Ask for the certificate with your order.'],
    quote: ['What does “Request a quote” mean?', 'It means we have not set a public price yet. Add it to your list, send the request, and a real person sends back a price, shipping and timing before anything is charged.']
  };
  const SAFETY = {
    rug: 'Rugs and mats need a federal flammability report (16 CFR 1630 or 1631) and a Children’s Product Certificate before they ship. Missouri does not allow carpet in new infant and toddler space, so those rooms use washable mats laundered daily.',
    fence: 'Friend Fence panels stand 22 to 24 in high with see-through tops, rounded corners, self-stable feet and no head-entrapment gaps. Adults must keep every child in sight and hearing. A tip test and lab review come before the first panel ships.',
    print: 'Posters and signs are not toys. Hang nothing from ceilings or across doors, keep exits clear, and plan wall art within your fire code cap (20 percent of a wall unless your fire marshal allows more).',
    puppets: 'Printed stick puppets are for use with an adult. They are not for children under 3 who still put things in their mouths. Plush friends follow later.',
    plush: 'Plush friends will have embroidered faces and no small parts, and will ship only after third-party testing to ASTM F963 with a Children’s Product Certificate and a tracking label.',
    book: 'Print books will carry a tracking label. Board-book formats for under-3s are not planned yet.',
    foodcontact: 'Anything that touches food or drink (bottles, plates) needs FDA food-contact material testing and CPSIA children’s product testing, and a Children’s Product Certificate, before it is sold. We take order requests only, and nothing is charged.',
    paper: 'Children’s stickers and coloring books need CPSIA testing and a Children’s Product Certificate (including the inks, paper and adhesive) before they are sold.',
    small: 'Small-parts warning: not for children under 3 unless the listing says it has been tested for that age.'
  };
  const MEMBER = 'The monthly membership (curriculum, Futures Hub, training) is set up separately on the Membership page. It is not a store item and is not charged here.';

  // ------------------------------------------------------------------ the products
  const P = [];
  const add = p => { P.push(Object.assign({ audiences: ['center', 'home', 'church'], ages: ['infant', 'toddler', 'twos', 'threes', 'prek'], zones: ['circle', 'booker', 'lumi', 'zuri', 'bop'],
    priceState: 'quote', price: null, orderable: true, cta: 'cart', badges: [], ships: 'parcel', options: [], box: [], dims: [], materials: [], care: [], safety: [], faq: [FAQ.quote, FAQ.lead, FAQ.returns], pairs: [], images: [], tone: 'booker' }, p)); };

  // Kits: the startup packages. Shipping for the box and carpets is part of the package price (Pricing page).
  const kitCommon = {
    collection: 'kits', kind: 'kit', priceState: 'fixed', ships: 'freight', badges: ['Made to order'],
    lead: 'Confirmed in your written quote. The kit is built after you sign.',
    care: ['Spot-clean mats and rugs with a damp cloth and mild soap; air dry flat.', 'Wipe signs and posters with a dry or lightly damp cloth.', 'Printed puppets are paper-based: keep them dry.'],
    materials: ['Zone mats and rugs, specification targets, confirmed with the maker: felt-look printed face, low pile (1/2 in or less), bound low-profile edges, non-slip backing.', 'Signs and posters: printed on durable board and paper.', 'Final materials are confirmed with the maker before yours is made.'],
    safety: [SAFETY.rug, SAFETY.puppets, SAFETY.print],
    faq: [FAQ.po, FAQ.tax, FAQ.freight, FAQ.lead, FAQ.returns, ['Does the price include the curriculum?', 'The startup package is the first order: the physical kit, the welcome materials and onboarding. ' + MEMBER]],
    room: 'turtle-rug', tone: 'booker'
  };
  add(Object.assign({}, kitCommon, {
    id: 'kit-home', name: 'Home Daycare Learning Zones Kit', short: 'One room, five zones. Sized for a licensed home provider.', price: APPROVED.packages.home, tier: 'home',
    audiences: ['home', 'church'], ages: ['toddler', 'twos', 'threes', 'prek'], tone: 'lumi',
    membership: { monthly: APPROVED.monthly.home },
    box: ['6 ft round Friends Circle rug', 'Zone signs, 9 x 12 in (five)', 'Four character posters, 18 x 24 in', 'Printed stick puppets for all four friends', 'Picture and word bin labels, 12 per zone', '30 sit spots', 'Six friend cue cards', 'Hand chime', 'Home welcome box and onboarding'],
    dims: ['Friends Circle rug: 6 ft round (a 6 x 6 ft footprint)', 'Zone signs: 9 x 12 in', 'Posters: 18 x 24 in', 'Cue cards: 8.5 x 11 in'],
    pairs: ['zone-boundaries', 'stick-puppets', 'friend-fence'], faqExtra: true,
    description: 'Everything one home daycare room needs to feel like Futures Friends. The Friends Circle rug anchors circle time, and four friends mark the learning zones on the wall.'
  }));
  add(Object.assign({}, kitCommon, {
    id: 'kit-center-starter', name: 'Center Starter Learning Zones Kit', short: 'A model room plus starter sets for up to three classrooms.', price: APPROVED.packages.starter, tier: 'starter',
    audiences: ['center', 'church'], membership: { monthly: APPROVED.monthly.starter }, tone: 'booker',
    box: ['8 ft round Friends Circle rug for the model room', 'Zone signs, 12 x 18 in (five)', 'Four character posters, 18 x 24 in', 'Printed stick puppets for all four friends', 'Bin labels, 12 per zone', '30 sit spots', 'Six friend cue cards', 'Hand chime', 'Two more room starter sets (no rug)', 'Center welcome box and onboarding'],
    dims: ['Friends Circle rug: 8 ft round (an 8 x 8 ft footprint)', 'Zone signs: 12 x 18 in', 'Posters: 18 x 24 in', 'Cue cards: 8.5 x 11 in'],
    pairs: ['zone-boundaries', 'extra-room-starter', 'rug-friends-circle'],
    description: 'A full model room, then lighter sets for your next two classrooms so every room reads as one program.'
  }));
  add(Object.assign({}, kitCommon, {
    id: 'kit-center-complete', name: 'Center Complete Learning Zones Kit', short: 'A full set for each of four classrooms.', price: APPROVED.packages.complete, tier: 'complete',
    audiences: ['center', 'church'], membership: { monthly: APPROVED.monthly.complete }, tone: 'zuri',
    box: ['Four room kits, each with an 8 ft round Friends Circle rug', 'Zone signs, 12 x 18 in (five per room)', 'Four character posters per room', 'Printed stick puppets', 'Bin labels, 30 sit spots, cue cards and a chime for each room', 'Center welcome box, setup visit and onboarding'],
    dims: ['Friends Circle rug: 8 ft round (an 8 x 8 ft footprint), four of them', 'Zone signs: 12 x 18 in', 'Posters: 18 x 24 in'],
    pairs: ['zone-boundaries', 'friend-fence', 'rainbow-poster'],
    description: 'Four rooms done at once, with one rug for every circle time and a setup visit so the whole building opens together.'
  }));

  // Add-ons
  const rugSafety = [SAFETY.rug];
  add({ id: 'zone-boundaries', name: 'Zone Boundaries pack', short: 'Four zone mats, Friend Fence panels, shelf bands and floor paths.', collection: 'addons', kind: 'addon', priceState: 'fixed', ships: 'freight',
    badges: ['Made to order'], tone: 'bop', room: 'dress-up-corner', audiences: ['center', 'home', 'church'],
    options: [{ key: 'size', label: 'Room size', values: [
      { id: 'home', label: 'Home room', price: APPROVED.boundaries.home, note: '4 mats 3 x 5 ft, 4 Friend Fence panels, 2 shelf bands' },
      { id: 'classroom', label: 'Classroom', price: APPROVED.boundaries.classroom, note: '4 mats 4 x 6 ft, 8 Friend Fence panels, 4 shelf bands' }] }],
    box: ['Four zone mats in Booker blue, Lumi pink, Zuri green and Bop purple', 'Friend Fence panels (4 for a home room, 8 for a classroom)', 'Friend Shelf Bands in each friend’s colour', 'Floor paths: removable anti-slip prints from the Friends Circle to each zone'],
    dims: ['Home mats: 3 x 5 ft each', 'Classroom mats: 4 x 6 ft each', 'Fence panels: 22 to 24 in high'],
    materials: ['Mats, specification targets, confirmed with the maker: felt-look printed face with a stitched-edge line, a friend in one corner, low pile, rounded corners, non-slip backing.', 'Fence: see-through upper half, washable sleeve.', 'Floor paths: removable anti-slip vinyl (R10 or better).', 'Final materials are confirmed with the maker before yours is made.'],
    care: ['Machine or hand wash the fence sleeves cold; air dry.', 'Spot-clean mats; do not bleach.', 'Peel floor paths up before mopping a wet floor.'],
    safety: [SAFETY.rug, SAFETY.fence], lead: 'Made to order. Timing is confirmed in your quote.',
    faq: [FAQ.freight, FAQ.lead, FAQ.po, FAQ.tax, FAQ.returns, ['Do I need this to use the kit?', 'No. The kit works on its own. Zone Boundaries is the add-on that gives every friend a carpet and a low fence so children know they are going somewhere different.']],
    pairs: ['kit-center-starter', 'shelf-bands', 'zone-signs'], description: 'Children move from carpet to carpet and know where they are going. Each friend gets a mat in their colour, and a low fence keeps every corner in sight.' });
  add({ id: 'zone-mats-only', name: 'Zone mats only', short: 'Four classroom mats, shelf bands and floor paths. Your own low shelves are the zone edges.', collection: 'addons', kind: 'addon', ships: 'freight', badges: ['Made to order'],
    tone: 'zuri', room: 'blue-table-room', box: ['Four zone mats, 4 x 6 ft', 'Friend Shelf Bands', 'Floor paths'], dims: ['Mats: 4 x 6 ft each'], safety: rugSafety, materials: ['Felt-look printed face, low pile, bound edges, non-slip backing (specification targets, confirmed with the maker).'],
    care: ['Spot-clean; air dry.'], faq: [FAQ.freight, FAQ.quote, FAQ.lead, FAQ.returns], pairs: ['zone-boundaries', 'shelf-bands'], description: 'The lighter way to mark zones if your room already has low shelves.' });
  add({ id: 'friend-fence', name: 'Friend Fence panel', short: 'A low, see-through divider for one zone edge.', collection: 'addons', kind: 'addon', ships: 'freight', badges: ['Made to order'],
    tone: 'bop', room: 'dress-up-corner', options: [{ key: 'colour', label: 'Zone colour', values: [{ id: 'booker', label: 'Booker blue' }, { id: 'lumi', label: 'Lumi pink' }, { id: 'zuri', label: 'Zuri green' }, { id: 'bop', label: 'Bop purple' }] }],
    dims: ['22 to 24 in high; never above 30 in'], safety: [SAFETY.fence], materials: ['Felt-look panel with a see-through upper half and a washable sleeve. A tip test comes first.'], care: ['Wash the sleeve cold; air dry.'],
    box: ['One panel with self-stable feet'], faq: [FAQ.freight, FAQ.quote, FAQ.lead, FAQ.returns], pairs: ['zone-boundaries', 'shelf-bands'], description: 'Low enough for a seated adult to see over. This is the riskiest new product we make, so it ships only after it passes a tip test and a lab review.' });
  add({ id: 'shelf-bands', name: 'Friend Shelf Band', short: 'A felt band in a friend’s colour that wraps a low shelf you already own.', collection: 'addons', kind: 'addon', badges: ['Made to order'], tone: 'lumi',
    options: [{ key: 'colour', label: 'Zone colour', values: [{ id: 'booker', label: 'Booker blue' }, { id: 'lumi', label: 'Lumi pink' }, { id: 'zuri', label: 'Zuri green' }, { id: 'bop', label: 'Bop purple' }] }],
    box: ['One shelf band'], dims: ['Sized to a low shelf; send the shelf measurements with your request'], materials: ['Felt-look fabric band with hook-and-loop closure. Confirmed with the maker before yours is made.'], care: ['Spot-clean; air dry.'],
    safety: [SAFETY.print], faq: [FAQ.quote, FAQ.lead, FAQ.returns], pairs: ['zone-boundaries', 'zone-mats-only'], description: 'The cheapest way to turn shelves you already own into zone edges.' });
  add({ id: 'church-pack-away', name: 'Church Pack-Away pack', short: 'Banner stands, a rolling cart, rug bags and a Sunday reset card.', collection: 'addons', kind: 'addon', ships: 'freight', audiences: ['church', 'center'], badges: ['Made to order'],
    tone: 'lumi', box: ['Five banner stands', 'A rolling cart', 'Rug bags', 'Lidded bins', 'A Sunday reset card'], dims: ['Sized for a 22 x 28 ft multipurpose room'], materials: ['Confirmed with the maker before yours is made.'], care: ['Wipe stands and bins; launder rug bags cold.'],
    safety: [SAFETY.print], faq: [FAQ.freight, FAQ.quote, FAQ.lead, FAQ.po, FAQ.tax, FAQ.returns], pairs: ['kit-home', 'zone-mats-only'], description: 'For rooms that become something else on Sunday. Everything packs onto one cart and comes back out on Monday.' });
  add({ id: 'extra-room-starter', name: 'Extra room Zones Starter', short: 'Signs, posters, puppets, labels, sit spots and cue cards for one more room (no rug).', collection: 'addons', kind: 'addon', badges: ['Made to order'],
    tone: 'booker', box: ['Zone signs', 'Four posters', 'Printed stick puppets', 'Bin labels', 'Sit spots', 'Friend cue cards'], dims: ['Signs 12 x 18 in; posters 18 x 24 in'], materials: ['Printed board and paper.'], care: ['Wipe clean.'],
    safety: [SAFETY.print, SAFETY.puppets], faq: [FAQ.quote, FAQ.lead, FAQ.po, FAQ.tax, FAQ.returns], pairs: ['rug-friends-circle', 'zone-boundaries'], description: 'Opening one more classroom? This is the kit without the rug.' });
  // Classroom materials
  const sizeOpt = { key: 'size', label: 'Size', values: [{ id: 'home', label: 'Home, 9 x 12 in' }, { id: 'center', label: 'Center, 12 x 18 in' }] };
  add({ id: 'zone-signs', name: 'Zone sign set', short: 'Five signs with each friend, the zone name and two words, in English and Spanish.', collection: 'materials', kind: 'material', badges: ['Made to order'], tone: 'zuri', room: 'reading-corner',
    options: [sizeOpt], box: ['Five zone signs'], dims: ['Home 9 x 12 in; center 12 x 18 in'], materials: ['Friend pop-out on felt-look print, mounted on durable board.'], care: ['Wipe with a dry cloth.'], safety: [SAFETY.print],
    faq: [FAQ.quote, FAQ.lead, FAQ.po, FAQ.tax, FAQ.returns], pairs: ['poster-booker-reading-area-v1', 'bin-labels'], description: 'The signs that tell a child which friend lives in which corner.' });
  add({ id: 'rainbow-poster', name: 'Eat the Rainbow poster', short: 'The six colour bands for the dining wall, 24 x 36 in.', collection: 'materials', kind: 'material', badges: ['Made to order'], tone: 'zuri',
    box: ['One poster'], dims: ['24 x 36 in'], materials: ['Matte print on heavy paper.'], care: ['Wipe with a dry cloth.'], safety: [SAFETY.print],
    faq: [FAQ.quote, FAQ.lead, FAQ.po, FAQ.tax, FAQ.returns], pairs: ['zone-signs', 'poster-booker-reading-area-v1'], description: 'Red Rockets, Orange Sunshine, Yellow Sunbeams, Green Sprouts, Purple Pals and Cozy Clouds, ready for the dining wall.' });
  add({ id: 'stick-puppets', name: 'Stick puppet set', short: 'Printed stick puppets of the four friends. Every kit ships with these now.', collection: 'materials', kind: 'material', badges: ['Made to order'], tone: 'bop',
    options: [{ key: 'qty', label: 'Set', values: [{ id: 'one', label: 'One set of four' }, { id: 'class', label: 'Classroom set (quote)' }] }],
    box: ['Booker, Lumi, Zuri and Bop on sticks'], dims: ['About 6 in tall on a flat stick'], materials: ['Printed card on a flat wooden stick. Confirmed with the maker before yours is made.'], care: ['Keep dry; wipe with a dry cloth.'], safety: [SAFETY.puppets, SAFETY.small],
    faq: [['Where is the plush?', 'Plush friends come later. Until then every kit ships with printed puppets.'], FAQ.quote, FAQ.lead, FAQ.returns], pairs: ['kit-home', 'poster-booker-reading-area-v1'], description: 'Four friends for circle time. The plush comes after testing.' });
  add({ id: 'cue-cards', name: 'Friend cue cards', short: 'Six laminated cards a teacher holds up at transitions.', collection: 'materials', kind: 'material', badges: ['Made to order'], tone: 'lumi',
    box: ['Six cards: one per zone, Circle and Clean-Up'], dims: ['8.5 x 11 in'], materials: ['Laminated card stock.'], care: ['Wipe clean.'], safety: [], faq: [FAQ.quote, FAQ.lead, FAQ.returns], pairs: ['zone-signs', 'rug-friends-circle'], description: 'Hold one up and the room knows where to go next.' });
  add({ id: 'bin-labels', name: 'Picture and word bin labels', short: 'Twelve labels per zone, each with a word, a picture and the friend’s icon.', collection: 'materials', kind: 'material', badges: ['Made to order'], tone: 'zuri',
    box: ['12 labels per zone'], dims: ['Sized for standard classroom bins'], materials: ['Printed weatherproof label stock.'], care: ['Wipe clean.'], safety: [], faq: [FAQ.quote, FAQ.lead, FAQ.returns], pairs: ['zone-signs', 'cue-cards'], description: 'Colour is never the only code: every label also has the friend’s icon and a word.' });

  // ------------------------------------------------------------------ the merchandise campaign (owner, 2026-10-07)
  // Ids are the package's STABLE ids (store-merch-data.js, generated from the campaign package). Every product is a draft: price, stock and size
  // stay empty unless an approved price exists above (poster $16, plush $26). Pictures are our own artwork, never stock photos.
  const SAMPLE_CAPTION = '';
  const ZKEY = { 'Reading Area': 'booker', 'Calm Corner': 'lumi', 'Discovery Zone': 'zuri', 'Movement Zone': 'bop', 'Friends Circle': 'circle' };
  const ROOM_FOR = { booker: 'reading-corner', lumi: 'turtle-rug', zuri: 'blue-table-room', bop: 'dress-up-corner', circle: 'alphabet-rug' };
  const TONE = { booker: 'booker', lumi: 'lumi', zuri: 'zuri', bop: 'bop', circle: 'gold', 'all-friends': 'gold' };
  const sampleBase = { sample: true, audiences: ['center', 'home', 'church', 'family'], ages: ['infant', 'toddler', 'twos', 'threes', 'prek'] };
  const FOUR = ['booker', 'lumi', 'zuri', 'bop'];
  MERCH.rugs.forEach(r => {
    const z = ZKEY[r.zone], square = r.format === 'large-square', t = TONE[z];
    add(Object.assign({}, sampleBase, { id: r.id, name: r.name, short: r.description, description: r.description, collection: 'carpets', kind: 'carpet', ships: 'freight', tone: t, zones: [z], room: ROOM_FOR[z],
      audiences: ['center', 'home', 'church'], badges: ['Made to order'], format: square ? 'large-square' : 'zone',
      options: [{ key: 'size', label: 'Size', values: [{ id: 's6', label: '6 x 6 ft', note: 'A suggested footprint. Final size is confirmed in your written quote.' }, { id: 's8', label: '8 x 8 ft', note: 'A suggested footprint. Final size is confirmed in your written quote.' }, { id: 'ask', label: 'Match my room', note: 'Send your room measurements with the quote request.' }] }],
      box: [square ? 'One large square corner carpet that holds a furnished ' + r.zone.toLowerCase() + ' corner' : 'One ' + r.zone + ' carpet'],
      dims: ['Footprints: 6 x 6 ft (home) or 8 x 8 ft (center). Final size is confirmed in your written quote, matched to your room measurements.'],
      materials: [square ? 'Specification targets, confirmed with the maker: flat, low pile, felt-look printed face, bound edges, non-slip backing.' : 'Felt-look printed face with a stitched-edge line, low pile, bound edges, non-slip backing (specification targets, confirmed with the maker).'],
      care: ['Spot-clean with a damp cloth and mild soap; air dry flat.'], safety: [SAFETY.rug], lead: 'Made to order. Timing is confirmed in your written quote.',
      faq: [FAQ.freight, FAQ.quote, FAQ.lead, FAQ.po, FAQ.tax, FAQ.returns, ['Will mine look exactly like the picture?', 'Made-to-order items can differ a little in size, color and finish. We confirm the details in your written quote before we make yours.']],
      pairs: square ? ['zone-boundaries', 'rug-friends-circle'] : ['zone-boundaries', 'kit-center-starter', 'poster-' + (z === 'circle' ? 'friends-circle' : ({ booker: 'booker-reading-area', lumi: 'lumi-calm-corner', zuri: 'zuri-discovery-zone', bop: 'bop-movement-zone' })[z]) + '-v1'] }));
  });
  const NAMES = Object.fromEntries([].concat(MERCH.rugs, MERCH.plush, MERCH.posters).map(x => [x.id, x.name.replace(' Sample', '').replace(' \u2014 ', ', ')]));
  MERCH.bundles.forEach(b => {
    const rugSet = b.includes.every(i => i.startsWith('rug-')), t = rugSet ? 'bop' : 'lumi';
    add(Object.assign({}, sampleBase, { id: b.id, name: b.name, short: b.description, description: b.description, collection: rugSet ? 'carpets' : 'plush', kind: 'bundle', ships: rugSet ? 'freight' : 'parcel', tone: t, ages: rugSet ? ['infant', 'toddler', 'twos', 'threes', 'prek'] : ['toddler', 'twos', 'threes', 'prek'],
      zones: rugSet ? ['circle', 'booker', 'lumi', 'zuri', 'bop'].slice(b.includes.length === 4 ? 1 : 0) : ['circle', 'booker', 'lumi', 'zuri', 'bop'], room: rugSet ? 'turtle-rug' : null,
      badges: ['Made to order'], includes: b.includes,
      box: b.includes.map(i => (NAMES[i] || i)), dims: ['Sizes are confirmed with the maker.'], materials: ['Confirmed with the maker before yours is made.'], care: ['Care follows each item.'],
      safety: rugSet ? [SAFETY.rug] : [SAFETY.plush, SAFETY.print], lead: 'Made to order. Timing is confirmed in your written quote.', faq: [FAQ.quote, FAQ.lead, FAQ.freight, FAQ.returns], pairs: rugSet ? ['zone-boundaries', 'kit-center-starter'] : ['plush-booker', 'poster-booker-reading-area-v1'] }));
  });
  MERCH.posters.forEach(po => {
    const z = ZKEY[po.zone], t = TONE[z], v2 = /-v2$/.test(po.id), kidsPick = !v2 && z !== 'circle';
    add(Object.assign({}, sampleBase, { id: po.id, name: po.name.replace(' — ', ', '), short: po.description, description: po.description + (v2 ? ' A calmer, type-led layout.' : ' The character leads.'), collection: 'posters', kind: 'poster', priceState: 'fixed', price: APPROVED.kids.poster,
      tone: t, zones: [z], kidsShop: kidsPick, badges: ['Made to order'], variantName: po.variant, options: [],
      box: ['One poster, rolled in a tube'], dims: ['18 x 24 in, the size the $16 price is for. Final print proofs come before printing.'], materials: ['Matte print on heavy paper.'], care: ['Wipe with a dry cloth. Keep out of direct sun.'], safety: [SAFETY.print],
      lead: 'Printed to order. Timing is confirmed when we confirm your order.', faq: [['When does it ship?', 'Posters are printed after you order, so nothing sits in a warehouse. We confirm timing with you before charging.'], ['Which design should I choose?', 'V1 puts the character in front. V2 is mostly type and a small character, calmer on a busy wall.'], FAQ.returns],
      pairs: [po.id.replace(/-v[12]$/, v2 ? '-v1' : '-v2'), 'plush-' + (FOUR.includes(z) ? z : 'booker'), 'zone-signs'] }));
  });
  MERCH.plush.forEach(pl => {
    const z = pl.character.toLowerCase();
    add(Object.assign({}, sampleBase, { id: pl.id, name: pl.name.replace(' Sample', ''), short: 'Soft ' + pl.character + ' to hug. Opening soon.', description: 'A soft plush ' + pl.character + ', one of the four story-world friends. Made to order.',
      collection: 'plush', kind: 'plush', priceState: 'fixed', price: APPROVED.kids.plush, orderable: false, cta: 'notify', tone: z, zones: [z], kidsShop: true, ships: 'parcel',
      badges: ['Made to order'], ages: ['toddler', 'twos', 'threes', 'prek'], box: ['One plush ' + pl.character + ' (about 12 in)'], dims: ['About 12 in tall'],
      materials: ['Embroidered face, no hard parts, washable. Illustrated cords, buckles and buttons become sewn details. Confirmed with the maker before yours is made.'], care: ['Surface-wash by hand until the production care label is final.'],
      safety: [SAFETY.plush, SAFETY.small], lead: 'Opening soon. Leave your email and we will tell you the day it opens.',
      faq: [['Why can’t I order it yet?', 'The plush is opening soon. Leave your email and we will tell you the day it opens.'], ['Will mine look exactly like the picture?', 'Made-to-order items can differ a little in color and finish. We confirm the details by email before we make yours.'], FAQ.returns],
      pairs: ['poster-' + ({ booker: 'booker-reading-area', lumi: 'lumi-calm-corner', zuri: 'zuri-discovery-zone', bop: 'bop-movement-zone' })[z] + '-v1', z + '-tshirt', 'book-booker-tries-again'] }));
  });
  const TYPE = { 'short-sleeve T-shirt': ['T-shirt', 'tshirt'], 'pullover hoodie': ['hoodie', 'hoodie'], backpack: ['backpack', 'backpack'] };
  const APP_SAFETY = { tshirt: 'Children’s clothing carries permanent tracking labels and meets the federal flammability rule. Care and fiber labels follow the final fabric.', hoodie: 'Children’s hoodies are made with no hood or neck drawstrings, as CPSC guidance requires for sizes 2T to 12, and carry permanent tracking labels.', backpack: 'Children’s backpacks carry tracking labels, and any zipper pulls or buckles are checked for small parts and strength before yours is made.' };
  MERCH.apparel.forEach(a => {
    const isAll = a.id.indexOf('all-friends') === 0, ty = (TYPE[a.type] || [a.type, 'tshirt']), key = isAll ? 'all-friends' : a.character.toLowerCase(), isPack = ty[1] === 'backpack';
    const nm = (isAll ? 'All Friends' : a.character) + ' ' + ty[0];
    const SIZES = isPack ? [] : [{ key: 'size', label: 'Size you would want (not final)', values: [{ id: 'unsure', label: 'Not sure yet', cart: 'Size to be confirmed' }].concat(['2T', '3T', '4T', '5T', 'Youth S', 'Youth M', 'Youth L', 'Adult S', 'Adult M', 'Adult L', 'Adult XL'].map(z => ({ id: z.toLowerCase().replace(' ', '-'), label: z, cart: 'Size wanted: ' + z }))) }];
    add(Object.assign({}, sampleBase, { options: SIZES, id: a.id, name: nm, collection: 'apparel', kind: 'apparel', priceState: 'soon', tone: TONE[key], zones: FOUR.includes(key) ? [key] : ['circle'], kidsShop: ty[1] === 'tshirt', apparelType: ty[1], who: key,
      short: (isPack ? 'Front print: “' + a.front_copy + '.”' : 'Back print: “' + a.back_copy + '”') + ' Sizes coming soon.',
      description: isAll ? 'All four friends together on a golden-yellow ' + ty[0] + '.' + (isPack ? ' The front reads “' + a.front_copy + '.”' : ' The back carries our tagline, “' + a.back_copy + '”') : a.character + ' on a ' + a.color + ' ' + ty[0] + ', with the Futures Friends wordmark.' + (isPack ? ' The front reads “' + a.front_copy + '.”' : ' The back reads “' + a.back_copy + '”'),
      badges: ['Sizes coming soon'], ships: 'parcel', sizesNote: 'Sizes are coming soon. Add it to your cart, say which size you would want in the notes at checkout, and we will write back.',
      box: ['One ' + ty[0] + ' in ' + a.color], dims: ['Sizes, fit and measurements are confirmed before yours is made.'], materials: ['Fabric, weight and print method are confirmed with the maker before yours is made.'], care: ['Care instructions follow the final fabric and print method.'],
      safety: [APP_SAFETY[ty[1]]], lead: 'Made to order. We confirm sizing and ship date by email.',
      faq: [['Can I order it?', 'Not yet, but you can ask. Add it to your cart and send the request. We write back with the price, sizes and timing. A request is interest, not an order, and nothing is charged.'], ['Will mine look exactly like the picture?', 'Made-to-order items can differ a little in color and fit. We confirm the details by email before we make yours.'], FAQ.returns],
      pairs: ['plush-' + (FOUR.includes(key) ? key : 'booker'), 'poster-' + (FOUR.includes(key) ? ({ booker: 'booker-reading-area', lumi: 'lumi-calm-corner', zuri: 'zuri-discovery-zone', bop: 'bop-movement-zone' })[key] : 'friends-circle') + '-v1'] }));
  });

  // Replica backpacks (owner package 2026-10-07): Booker, Zuri (the turtle shell, also drawn by the owner as a second picture) and Bop. Concept samples, no price, request lines.
  const ONE = { booker: 'Booker', lumi: 'Lumi', zuri: 'Zuri', bop: 'Bop' };
  const PAIR_POSTER = { booker: 'booker-reading-area', lumi: 'lumi-calm-corner', zuri: 'zuri-discovery-zone', bop: 'bop-movement-zone' };
  const requestFaq = [['Can I order it?', 'Not yet, but you can ask. Add it to your bag and send the request. We write back with the price, sizes and timing. A request is interest, not an order, and nothing is charged.'], ['Will mine look exactly like the picture?', 'Made-to-order items can differ a little in color and finish. We confirm the details by email before we make yours.'], FAQ.returns];
  MERCH.replicas.forEach(r => {
    const key = r.character.toLowerCase(), shell = key === 'zuri';
    add(Object.assign({}, sampleBase, { id: r.id, name: r.name, collection: 'apparel', kind: 'apparel', priceState: 'soon', tone: key, zones: [key], apparelType: 'backpack', who: key, kidsShop: false, heroPick: shell, options: [],
      short: r.description + ' Sizes coming soon.', description: r.description + '',
      badges: ['Sizes coming soon'], ships: 'parcel', sizesNote: 'Sizes are coming soon. Add it to your bag, say which size you would want in the notes at checkout, and we will write back.',
      box: ['One ' + r.name.toLowerCase()], dims: ['Sizes, fit and measurements are confirmed before yours is made.'], materials: [shell ? 'Felt-look hexagon plates, embroidered compass badge, padded straps.' : 'Canvas body, trim, buckles and the embroidered badge follow the character art; any detail the reference sheet does not show is confirmed with the maker.', 'Fabric and construction are confirmed with the maker before yours is made.'], care: ['Care instructions follow the final fabric.'],
      safety: [APP_SAFETY.backpack], lead: 'Made to order. We confirm sizing and ship date by email.', faq: requestFaq,
      pairs: [key + '-backpack', 'plush-' + key, key + '-tshirt'] }));
  });

  // Stickers and coloring (owner package 2026-10-07): sheets and books for each friend, and universe packs with all 22 friends. Children's paper goods: CPSIA.
  const zoneOf = c => (c && c.zone ? ZKEY[c.zone] : 'circle');
  const toneOf = c => { const k = (c.character || '').toLowerCase(); return ONE[k] ? k : 'gold'; };
  const paperBase = Object.assign({}, sampleBase, { priceState: 'soon', ships: 'parcel', badges: ['Made to order'], ages: ['twos', 'threes', 'prek'], lead: 'Made to order. We confirm the price and ship date by email.', faq: requestFaq, safety: [SAFETY.paper] });
  MERCH.stickers.forEach(x => {
    const uni = /universe/.test(x.id), key = toneOf(x), allf = key === 'gold';
    add(Object.assign({}, paperBase, { id: x.id, name: x.name, collection: 'stickers', kind: 'sticker', tone: key, zones: allf ? ['circle'] : [zoneOf(x)], who: allf ? 'all-friends' : key, kidsShop: true, options: [],
      short: uni ? 'Four sticker sheets with all 22 friends: leads, classmates, school team and families.' : x.description.replace('Draft sticker sheet with ', 'Sticker sheet with ').replace(/\.$/, '') + '.',
      description: x.description.replace('Draft sticker sheet', 'A sticker sheet') + (uni ? '' : ''),
      box: [uni ? 'Four sticker sheets (lead friends, classmates, school team, families)' : 'One sticker sheet'], dims: ['Sheet size and cut are confirmed with the printer.'], materials: ['Printed adhesive sticker paper. Paper, ink and adhesive are confirmed with the printer and tested before sale.'], care: ['Keep dry. Peel slowly from the sheet.'],
      pairs: uni ? ['coloring-book-universe', 'stickers-all-friends', 'plush-booker'] : [x.id === 'stickers-all-friends' ? 'coloring-book-universe' : x.id.replace('stickers-', 'coloring-book-'), 'plush-' + (ONE[key] ? key : 'booker'), 'poster-' + (PAIR_POSTER[key] || 'friends-circle') + '-v1'] }));
  });
  MERCH.coloring.forEach(x => {
    const uni = /universe/.test(x.id), key = toneOf(x), allf = key === 'gold';
    add(Object.assign({}, paperBase, { id: x.id, name: x.name, collection: 'stickers', kind: 'coloring', tone: key, zones: allf ? ['circle'] : [zoneOf(x)], who: allf ? 'all-friends' : key, kidsShop: true, options: [],
      short: uni ? 'A four-page coloring pack with all 22 friends: leads, classmates, school team and families.' : 'A coloring book with ' + x.character + ' on the cover and a black-and-white page to color.',
      description: uni ? x.description + '' : 'A coloring book with a colored ' + x.character + ' cover and a black-and-white page to color.',
      box: [uni ? 'Four printable coloring pages (lead friends, classmates, school team, families)' : 'One coloring book'], dims: ['Page count and trim size are confirmed with the printer.'], materials: ['Uncoated paper that takes crayons and pencils. Confirmed with the printer and tested before sale.'], care: ['Keep dry.'],
      pairs: uni ? ['stickers-universe', 'coloring-book-booker', 'kids-printables'] : [x.id.replace('coloring-book-', 'stickers-'), 'plush-' + (ONE[key] ? key : 'booker'), 'kids-printables'] }));
  });

  // Drinkware and mealtime: insulated character bottles and the Eat the Rainbow divided plate. Food-contact items: FDA food-contact and CPSIA testing come first.
  const foodBase = Object.assign({}, sampleBase, { collection: 'drinkware', priceState: 'soon', ships: 'parcel', ages: ['toddler', 'twos', 'threes', 'prek'], badges: ['Made to order'], safety: [SAFETY.foodcontact], lead: 'Made to order. We confirm the price and ship date by email.', faq: requestFaq, options: [] });
  const NEXT = { booker: 'lumi', lumi: 'zuri', zuri: 'bop', bop: 'booker' };
  MERCH.bottles.forEach(x => {
    const key = x.character.toLowerCase();
    add(Object.assign({}, foodBase, { id: x.id, name: x.name, kind: 'bottle', tone: key, zones: [key], who: key, kidsShop: true,
      short: x.character + ' on a insulated bottle.', description: x.description + ' Size, lid and finish are confirmed by email before we make yours.',
      box: ['One insulated bottle'], dims: ['Capacity and size are confirmed before yours is made.'], materials: ['Insulated stainless-steel body and food-contact lid parts follow the maker’s specification. Every food-contact material is confirmed and tested before sale.'], care: ['Care follows the final materials. Hand-wash until the care label is final.'],
      pairs: ['bottle-' + NEXT[key], 'eat-the-rainbow-plate', key + '-backpack'] }));
  });
  MERCH.plates.forEach(x => {
    add(Object.assign({}, foodBase, { id: x.id, name: x.name, kind: 'plate', tone: 'gold', zones: ['circle'], who: 'all-friends', kidsShop: true,
      short: 'A silicone divided plate: a color space for each part of the rainbow and a section for protein.', description: 'A silicone divided plate with raised red, orange, yellow, green and blue and purple compartments, a separate protein section and the four friends around the rim.',
      box: ['One divided plate'], dims: ['Diameter and compartment sizes are confirmed before yours is made.'], materials: ['Food-grade silicone. Materials and colorants are confirmed and tested for food contact before sale.'], care: ['Care follows the final material. Wash before first use.'],
      pairs: ['bottle-booker', 'bottle-zuri', 'plush-bop'] }));
  });

  // Books: print only if a print edition exists. None does yet, so the print edition is "Print coming".
  const book = (n, id, title, tone, readable, cover) => add({ id, name: title, short: readable ? 'Book ' + n + ' of 5. Read it online in Story Time. Print edition coming.' : 'Book ' + n + ' of 5. Print and online editions are coming.',
    collection: 'books', kind: 'book', audiences: ['center', 'home', 'church', 'family'], ships: 'none', cta: 'notify', orderable: false, priceState: 'soon', tone, bookNo: n,
    badges: [readable ? 'Digital edition' : 'Planned', 'Print coming'], edition: readable ? 'digital' : 'planned', cover,
    ages: ['twos', 'threes', 'prek'], zones: [tone === 'bop' ? 'bop' : tone === 'all' ? 'circle' : tone],
    box: ['Print edition: 32 pages, to be confirmed with the printer'], dims: ['Trim size confirmed with the printer'], materials: ['Print specification confirmed with the printer.'], care: ['Wipe covers with a dry cloth.'],
    safety: [SAFETY.book], faq: [['Can I buy a copy?', 'Not yet. There is no print edition. ' + (readable ? 'You can read this book online now in Story Time, free.' : 'The online edition comes with the print edition.') + ' Tell us you want a copy and we will let you know the day it prints.'], FAQ.returns],
    pairs: ['kids-printables', 'poster-booker-reading-area-v1'], description: readable ? 'Read the story together online now. The printed book is on the way.' : 'One of the five storybooks. Print and online editions are being prepared.' });
  book(1, 'book-booker-tries-again', 'Booker Tries Again', 'booker', true, ['img/books/booker-tries-again/cover-640.webp', 'img/books/booker-tries-again/cover-1200.webp']);
  book(2, 'book-big-feelings', 'Big Feelings, Brighter Days', 'lumi', true, ['img/big-feelings-brighter-days-cover-400.webp', 'img/big-feelings-brighter-days-cover-800.webp']);
  book(3, 'book-what-happens', 'What Happens If We Try?', 'zuri', true, null);
  book(4, 'book-clean-up-team', 'Clean Up, Team!', 'bop', false, ['img/clean-up-team-cover-400.webp', 'img/clean-up-team-cover-800.webp']);
  book(5, 'book-rainbow-picnic', 'The Rainbow Picnic', 'all', false, null);

  // Kids' Shop
  add({ id: 'kids-carpet', name: 'Small friend carpet', short: 'A small play carpet for a bedroom or reading nook.', collection: 'kids', kind: 'family', audiences: ['family'], priceState: 'soon', orderable: false, cta: 'notify', ships: 'freight',
    badges: ['Made to order'], tone: 'bop', ages: ['toddler', 'twos', 'threes', 'prek'], box: ['One carpet'], dims: ['Size still being set'], materials: ['Low pile, non-slip backing (specification targets, confirmed with the maker).'], care: ['Spot-clean; air dry.'],
    safety: [SAFETY.rug], lead: 'Price and size are still being set.', faq: [['When can I buy it?', 'Size and price are still being set, and the rug needs its flammability report first. Leave your email and we will write when it is ready.'], FAQ.freight],
    pairs: ['poster-bop-movement-zone-v1', 'book-booker-tries-again'], description: 'Made to order. We will post the size and price when they are final.' });
  add({ id: 'kids-printables', name: 'Futures at Home printable packs', short: 'Picture schedule, calm-down cards, move cards, reading log and more. Free to print.', collection: 'kids', kind: 'family', audiences: ['family'], priceState: 'free', cta: 'link', link: 'printables',
    ships: 'digital', badges: ['Digital edition'], tone: 'lumi', ages: ['twos', 'threes', 'prek'], box: ['US Letter PDFs: daily rhythm, rainbow tracker, calm cards, move cards, reading log, sticker chart, story cards, certificates'], dims: ['US Letter, color or black and white'],
    materials: ['Printed at home or at the library.'], care: [], safety: [], faq: [['Is this really free?', 'Yes. Print them at home or at the library. There is no account to make.'], ['What size are they?', 'US Letter, made to print in color or black and white. Spanish versions are included for most pages.']],
    pairs: ['poster-bop-movement-zone-v1', 'book-booker-tries-again'], description: 'Fridge-ready pages to print yourself. No checkout, no account.' });

  // Store products are shown as regular products (owner, 2026-10-07). Compliance work lives in the launch checklist, not on the page: one plain line stays.
  const MADE = 'Made to order. We confirm sizing and ship date by email.';
  P.forEach(p => { if (p.sample) { p.safety = [MADE]; p.badges = p.badges.filter(b => !/safety|Concept/i.test(b)); if (!p.badges.length || (p.badges.length === 1 && /Sizes/.test(p.badges[0]))) p.badges = ['Made to order'].concat(p.badges); } });

  // ------------------------------------------------------------------ helpers
  const byId = Object.fromEntries(P.map(p => [p.id, p]));
  const product = id => byId[id] || null;
  const collection = id => COLLECTIONS.find(c => c.id === id) || null;
  const optionById = (p, key, val) => { const o = p.options.find(x => x.key === key); return o ? o.values.find(v => v.id === val) || null : null; };
  const defaultOpts = p => Object.fromEntries(p.options.map(o => [o.key, o.values[0].id]));
  const cleanOpts = (p, opts) => { const out = {}; for (const o of p.options) { const v = opts && opts[o.key]; out[o.key] = o.values.some(x => x.id === v) ? v : o.values[0].id; } return out; };
  /* Unit price for a product with chosen options: a number, or null when there is no public price. */
  function unitPrice(p, opts) {
    if (p.priceState !== 'fixed') return null;
    for (const o of p.options) { const v = optionById(p, o.key, (opts || {})[o.key] || o.values[0].id); if (v && typeof v.price === 'number') return v.price; }
    return typeof p.price === 'number' ? p.price : null;
  }
  const optLabel = (p, opts) => p.options.map(o => { const v = optionById(p, o.key, (opts || {})[o.key] || o.values[0].id); return v ? (v.cart || v.label) : ''; }).filter(Boolean).join(', ');
  const priceFrom = p => { if (p.priceState !== 'fixed') return null; const all = p.options.flatMap(o => o.values.map(v => v.price)).filter(n => typeof n === 'number'); return all.length ? Math.min(...all) : p.price; };
  const fmt = n => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
  /* Price text exactly as shown on cards and pages. */
  function priceText(p, opts) {
    if (p.priceState === 'fixed') {
      const u = opts ? unitPrice(p, opts) : null, from = priceFrom(p);
      if (opts && u != null) return fmt(u);
      const multi = p.options.some(o => o.values.some(v => typeof v.price === 'number')) && new Set(p.options.flatMap(o => o.values.map(v => v.price))).size > 1;
      return (multi ? 'From ' : '') + fmt(from);
    }
    return STATUS_LABEL[p.priceState] || 'Price coming soon';
  }
  const canOrder = p => !!p.orderable && p.cta === 'cart';
  const inCollection = id => P.filter(p => p.collection === id);
  /* The friend a product belongs to: booker, lumi, zuri, bop, or 'all' for the four together. '' for things that are not about one friend (kits, signs, books). */
  const charOf = p => (['carpet', 'plush', 'poster', 'apparel', 'sticker', 'coloring', 'bottle', 'plate'].includes(p.kind) ? (p.tone === 'gold' ? 'all' : p.tone) : '');
  const CHARS = [['booker', 'Booker'], ['lumi', 'Lumi'], ['zuri', 'Zuri'], ['bop', 'Bop'], ['all', 'All four friends']];
  // Virtual collections: a slice of a real one, or everything for one friend. They get a page, a rail chip and a search entry like any other.
  const VIRTUAL = [
    { id: 'tshirts', name: 'T-shirts', blurb: 'A T-shirt for each friend and one for all four. The back carries a line in their voice.', of: 'apparel', test: p => p.apparelType === 'tshirt', tone: 'booker' },
    { id: 'hoodies', name: 'Hoodies', blurb: 'Pullover hoodies for Booker, Lumi, Zuri, Bop and all four together.', of: 'apparel', test: p => p.apparelType === 'hoodie', tone: 'lumi' },
    { id: 'backpacks', name: 'Backpacks', blurb: 'A backpack for every friend, and Zuri\u2019s felt turtle shell.', of: 'apparel', test: p => p.apparelType === 'backpack', tone: 'zuri' }
  ].concat(CHARS.filter(c => c[0] !== 'all').map(c => ({ id: 'friend-' + c[0], name: 'Everything ' + c[1], blurb: 'Plush, apparel, stickers, bottles, posters and carpets with ' + c[1] + ' on them.', test: p => charOf(p) === c[0], tone: c[0], friend: c[0] })));
  const virtual = id => VIRTUAL.find(v => v.id === id) || null;
  const anyCollection = id => collection(id) || virtual(id);
  /* Filter + sort for the collection pages. f: { audience, age, zone, character, category, price }, sort: featured | name | price-asc | price-desc */
  function query(collectionId, f, sort) {
    f = f || {};
    const v = virtual(collectionId);
    let list = v ? P.filter(p => (!v.of || p.collection === v.of) && v.test(p)) : (collectionId && collectionId !== 'all' ? inCollection(collectionId) : P.slice());
    if (f.audience) list = list.filter(p => p.audiences.includes(f.audience));
    if (f.age) list = list.filter(p => p.ages.includes(f.age));
    if (f.zone) list = list.filter(p => p.zones.includes(f.zone));
    if (f.character) list = list.filter(p => charOf(p) === f.character);
    if (f.category) list = list.filter(p => p.collection === f.category);
    if (f.price === 'priced') list = list.filter(p => p.priceState === 'fixed');
    else if (f.price === 'ask') list = list.filter(p => p.priceState !== 'fixed');
    const price = p => (p.priceState === 'fixed' ? priceFrom(p) : Infinity);
    if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'price-asc') list.sort((a, b) => price(a) - price(b));
    else if (sort === 'price-desc') list.sort((a, b) => (price(b) === Infinity ? -1 : price(b)) - (price(a) === Infinity ? -1 : price(a)));
    return list;
  }
  /* "Complete the set": the same friend in other things (one of each kind), else the product's own pairs. */
  function completeSet(p, max) {
    max = max || 4; const ch = charOf(p), out = [], seen = new Set([p.id, p.apparelType ? 'a:' + p.apparelType : 'k:' + p.kind]);
    if (ch) for (const q of P) { const key = q.apparelType ? 'a:' + q.apparelType : 'k:' + q.kind; if (q.id !== p.id && charOf(q) === ch && !seen.has(key) && !(q.kind === 'carpet' && q.format === 'large-square')) { seen.add(key); out.push(q); } }
    for (const id of p.pairs) { const q = byId[id]; if (q && !out.includes(q) && q.id !== p.id) out.push(q); }
    return out.slice(0, max);
  }

  // ------------------------------------------------------------------ images
  let manifest = { products: {} };
  const setManifest = m => { manifest = m && typeof m === 'object' && m.products ? m : { products: {} }; };
  /* Real pictures from img/store/manifest.json. Each: { n, w400, w800, w1200, jpg, alt }. */
  const photos = id => ((manifest.products || {})[id] || {}).images || [];
  const sets = (base, widths, ext) => widths.map(w => [base + '-' + w + '.' + ext, w]);
  /* Fallback images for a product that has no real picture yet. kind: 'concept' (branded room) or 'art' (plush art). */
  function fallbacks(p, rooms) {
    const out = [], rs = roomShot(p, rooms);
    if (rs) out.push(rs);
    if (p.kind === 'book' && p.cover) out.push({ kind: 'art', srcset: [[p.cover[0], 400], [p.cover[1], 800]], src: p.cover[1], w: 3, h: 4, alt: 'Cover of ' + p.name });
    if (p.id === 'poster-lumi-calm-corner-v1' && p.posterArt) out.push({ kind: 'art', srcset: sets(p.posterArt.booker, [400, 800], 'webp'), src: p.posterArt.booker + '-800.webp', w: 3, h: 4, alt: 'Friend poster art' });
    const ch = ['booker', 'lumi', 'zuri', 'bop'].includes(p.tone) ? p.tone : 'booker';
    const plushKey = p.kind === 'book' ? ch : ch;
    out.push({ kind: 'art', srcset: [['img/plush/characters/' + plushKey + '-480.webp', 480], ['img/plush/characters/' + plushKey + '-960.webp', 960]], src: 'img/plush/characters/' + plushKey + '-960.webp', w: 1, h: 1, alt: 'Plush art of ' + plushKey[0].toUpperCase() + plushKey.slice(1), tile: true });
    return out;
  }
  /* The branded-room concept image for a product (labelled Concept image, with the owner's required caption), or null. */
  function roomShot(p, rooms) {
    if (!p.room || p.kind === 'book' || p.kind === 'family') return null;
    const list = Array.isArray(rooms) ? rooms : [], hit = list.find(r => r.key === p.room) || { key: p.room };
    const base = 'img/branded-rooms/' + hit.key + '-kit';
    return { kind: 'concept', room: true, srcset: sets(base, [400, 800, 1200], 'webp'), src: base + '-800.jpg', w: hit.w || 800, h: hit.h || 600, alt: 'Design rendering: the ' + p.name + ' in a classroom', caption: CONCEPT_CAPTION };
  }
  /* Gallery for a product: real pictures first (a product marked sample gets the "Concept sample" label), then the room concept; with no
     pictures yet, the best fallback art. */
  function gallery(p, rooms) {
    const real = photos(p.id).filter(im => !im.angle).map((im, i) => ({ kind: 'photo', fit: 'contain',
      srcset: (im.files || [[im.w400, 400], [im.w800, 800], [im.w1200, 1200]]).filter(x => x[0]), src: im.jpg || im.w800, w: im.w || 4, h: im.h || 3,
      alt: im.alt || p.name + (photos(p.id).filter(x => !x.angle).length > 1 ? ', picture ' + (i + 1) : ''), caption: '', bg: im.bg || '', bgt: im.bgt || '', bgb: im.bgb || '', bgl: im.bgl || '', bgr: im.bgr || '', ratio: im.ratio }));
    const room = roomShot(p, rooms);
    if (real.length) return room ? real.concat([room]) : real;
    return fallbacks(p, rooms);
  }
  /* The turn-around: front, side, back and the side again (mirrored) from the angle slices in the manifest (angle: front|side|back). [] when a product has none. */
  function rotation(p) {
    const by = {}; photos(p.id).forEach(im => { if (im.angle) by[im.angle] = im; });
    if (!by.front || !by.side || !by.back) return [];
    const mk = (im, label, mirror) => ({ kind: 'photo', fit: 'contain', srcset: (im.files || []).filter(x => x[0]), src: im.jpg || im.w800, w: im.w || 3, h: im.h || 4, ratio: im.ratio, bg: im.bg || '', alt: p.name + ', ' + label + ' view', label, mirror: !!mirror });
    return [mk(by.front, 'front'), mk(by.side, 'side'), mk(by.back, 'back'), mk(by.side, 'other side', true)];
  }
  /* A collection's hero picture (the owner's group shots), from the manifest: collection-<id>-<n>. */
  function heroImage(id, n) {
    const im = photos('collection-' + id)[(n || 1) - 1]; if (!im) return null;
    return { kind: 'photo', fit: 'cover', srcset: im.files || [[im.w400, 400], [im.w800, 800], [im.w1200, 1200]], src: im.jpg || im.w800, w: im.w, h: im.h, ratio: im.ratio, alt: '', caption: '' };
  }
  /* The Kids' Shop, in sections: [heading, collection id, products, id]. Everything a family can browse lives here. */
  function kidsSections() {
    const apparel = t => P.filter(p => p.kind === 'apparel' && p.apparelType === t).sort((a, b) => (b.heroPick ? 1 : 0) - (a.heroPick ? 1 : 0));
    return [
      ['T-shirts', 'apparel', apparel('tshirt'), 'tshirts'], ['Hoodies', 'apparel', apparel('hoodie'), 'hoodies'], ['Backpacks', 'apparel', apparel('backpack'), 'backpacks'],
      ['Plush friends', 'plush', P.filter(p => p.kind === 'plush'), 'plush'],
      ['Stickers & coloring', 'stickers', inCollection('stickers'), 'stickers'], ['Bottles & plates', 'drinkware', inCollection('drinkware'), 'drinkware'],
      ['Carpets', 'carpets', P.filter(p => p.kind === 'carpet' && p.format === 'zone').concat(P.filter(p => p.kind === 'carpet' && p.format === 'large-square')), 'carpets'],
      ['Posters', 'posters', P.filter(p => p.kind === 'poster'), 'posters'],
      ['Free printables and a small carpet', '', inCollection('kids'), 'more']
    ];
  }
  const KW = { carpet: 'carpet carpets rug rugs mat floor', bundle: 'bundle set kit', plush: 'plush doll dolls stuffed toy soft', poster: 'poster posters wall art print', kit: 'kit kits package room startup', addon: 'add-on mats fence boundaries', material: 'sign signs labels cards puppets classroom materials', book: 'book books storybook story read', family: 'printable free pdf', sticker: 'sticker stickers sticker sheet decal', coloring: 'coloring color crayon crayons coloring book activity', bottle: 'bottle water bottle insulated drink cup tumbler drinkware', plate: 'plate dish divided plate lunch meal mealtime eat food drinkware' };
  const AKW = { tshirt: 'shirt t-shirt tshirt tee shirts apparel clothing clothes', hoodie: 'hoodie hoodies sweatshirt apparel clothing clothes', backpack: 'backpack backpacks bag school bag apparel' };
  const CKW = { stickers: 'sticker stickers coloring color crayon crayons coloring book activity', drinkware: 'bottle water bottle cup plate lunch meal drinkware insulated divided plate', kits: 'kit kits room package startup', carpets: 'carpet carpets rug rugs mat floor', posters: 'poster posters wall art print', plush: 'plush doll dolls stuffed toy soft', apparel: 'apparel clothes clothing shirt t-shirt tee hoodie backpack bag', addons: 'add-on fence mats boundaries', materials: 'signs labels cards puppets classroom materials', books: 'book books storybook story read', kids: 'kids family children' };
  const collectionKeywords = id => CKW[id] || '';
  /* Search words for a product (the site search, wayfinding.js). */
  const keywords = p => ['shop store buy order purchase', KW[p.kind] || '', p.apparelType ? AKW[p.apparelType] : '', p.kind === 'apparel' ? 'apparel' : '', (p.zones || []).join(' '), p.who || '', p.collection].join(' ');

  // ------------------------------------------------------------------ compliance labels (short; the long form is STORE_BLINDSPOTS.md)
  const LABELS = [
    ['cpsia', 'Children’s Product Certificate', 'Children’s items ship only with a CPSIA Children’s Product Certificate and a tracking label.'],
    ['parts', 'Small parts, under 3', 'Items that are not tested for children under 3 carry a small-parts warning.'],
    ['tax', 'Sales tax', 'We collect Missouri and Kansas sales tax on taxable orders. Tax-exempt orders need a certificate.'],
    ['freight', 'Freight for rugs', 'Rugs, mats and fence panels ship by freight. The carrier cost is quoted by ZIP code before you pay.'],
    ['returns', 'Returns', 'Returns and refunds policy: ' + DRAFT + '.'],
    ['terms', 'Terms of sale', 'Terms of sale: ' + DRAFT + '.'],
    ['privacy', 'Order privacy', 'Order details are used to fill your order and are never sold. Children’s data is not collected.']
  ];

  const TRUST = [
    ['ships', 'What ships', 'Print items by parcel. Rugs, mats and fences by freight, quoted by ZIP code before you pay. Plush when it opens.'],
    ['time', 'Lead times', 'Made-to-order items are timed by the maker. You get the date in writing before any charge.'],
    ['licence', 'Made for licensing', 'Our friends and designs are made for licensed programs. The kits match what is on your walls in training.'],
    ['support', 'A real person', 'Call (816) 988-5661 or send a request. We answer within two business days.']
  ];

  return Object.freeze({ APPROVED, CONCEPT_CAPTION, DRAFT, AUDIENCES, AGES, ZONES, COLLECTIONS, PRODUCTS: P, LABELS, TRUST, FAQ, SAFETY, MEMBER,
    product, collection, anyCollection, virtual, VIRTUAL, charOf, CHARS, completeSet, optionById, defaultOpts, cleanOpts, unitPrice, optLabel, priceFrom, priceText, fmt, canOrder, inCollection, query,
    setManifest, photos, rotation, gallery, heroImage, kidsSections, keywords, collectionKeywords, SAMPLE_CAPTION, fallbacks, roomShot, manifest: () => manifest });
});
