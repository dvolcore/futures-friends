/* #pricing: published package prices before tax, up front (competitive research move #1; E1, E8, E9 of the 2026-10-05 reevaluation).
   Competitors mostly price by quote and add card or processing fees; this page publishes complete prices instead.
   Honesty rules:
   - Every dollar figure on the page is written by pz(), which tags it with the owner document it comes from (data-src).
     Calculator results are tagged data-src="calc" and are sums of tagged prices.
   - Every Futures Friends price is the brand's recommended launch price and carries the manifest's one label, "Proposed, owner to
     confirm" (launch checklist G09; each source document marks its prices CONFIRM).
   - Today's offer (the proposed launch package: Unit 1 plus a live session, priced from an existing catalog line) is shown apart from
     the future annual bundle, and the calculator estimates only that future bundle, with the same coverage rules as the written quote.
   - The comparison sets available scope against available scope: each competitor figure shows its source date, public vs state contract
     pricing, license length, classrooms covered, what is included and what is not.
   - Competitor figures are only the ones a researcher opened and read ([F]) in docs/research/COMPETITIVE_LANDSCAPE.md
     (CRM repo, 5 October 2026), each shown with its source link and that date. Quote-only vendors are shown as quote-only.
     Where the research file does not record a detail, the page says so instead of guessing.
   - Nothing is for sale online yet: the page says "Ordering opens soon" and the button opens the quote request form,
     which keeps its own honest "open soon" state.
   Loaded after views.js (uses V, phero, head, esc at call time). Exposes window.FFPricing for tests. */
(function () {
  'use strict';
  // Owner documents (private PDFs in the Futures Friends Program Library, October 2026).
  const DOCS = {
    cat5: 'Welcome Package & Catalog v1.0, p.5', cat24: 'Welcome Package & Catalog v1.0, p.24', cat25: 'Welcome Package & Catalog v1.0, p.25',
    cat26: 'Welcome Package & Catalog v1.0, p.26', cat27: 'Welcome Package & Catalog v1.0, p.27-28', cat29: 'Welcome Package & Catalog v1.0, p.29-30',
    cat37: 'Welcome Package & Catalog v1.0, p.37', tt60: 'Teacher Training & Certification v1.0, p.60', tt61: 'Teacher Training & Certification v1.0, p.61',
    hub5: 'Futures Hub Platform Plan v1.0, p.5', camp5: 'Summer Camp & Holiday Units v1.0, p.5 (recommended for the 2027 catalog)',
    calc: 'Worked out on this page from the prices above'
  };
  const fmt = n => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
  const pz = (n, src, suffix = '') => `<span class="pz-amt" data-src="${src}" title="Source: ${DOCS[src] || src}">${fmt(n)}${suffix}</span>`;
  const E = s => (typeof esc === 'function' ? esc(s) : String(s));
  // Package scope comes from the release manifest (release-manifest.js, generated from docs/release/ASSET_MANIFEST.json):
  // each item is [label, assetId], and release-truth.js shows it under Available now / In development / Coming later.
  const REL = (typeof window !== 'undefined' && window.FFReleaseData) || (typeof require === 'function' ? require('./release-manifest.js') : null);
  const LABEL = (REL && REL.commercial && REL.commercial.price_label) || 'Proposed, owner to confirm';   // one label for every proposed price
  const PENDING = `<span class="chip warn pz-pending">${LABEL}</span>`;
  const items = id => (REL && REL.packages[id] ? REL.packages[id].items : []);

  // The three program tiers (Catalog p.24-25; tier table p.5).
  const TIERS = [
    { id: 'home', name: 'Home Daycare', who: 'Licensed family or group child care homes', c: 'lumi', startup: 1495, monthly: 89, prepay: 890, sets: 1, maxRooms: 1,
      inc: items('home') },
    { id: 'starter', name: 'Center Starter', who: 'Centers with 1 to 3 classrooms', c: 'booker', startup: 2995, monthly: 229, prepay: 2290, sets: 1, maxRooms: 3,
      inc: items('starter') },
    { id: 'complete', name: 'Center Complete', who: 'Centers with 4 or more classrooms', c: 'zuri', startup: 5995, monthly: 349, prepay: 3490, sets: 2, maxRooms: Infinity,
      inc: items('complete') }
  ];
  const yearOne = t => t.startup + 12 * t.monthly;   // matches the catalog's "Year-one total (monthly billing)" row

  // Fees we do not charge (each line traces to the catalog's own price math or terms).
  const NO_FEES = [
    ['No card or processing fee', 'Card processing is already counted in our own costs for every startup package and monthly fee, so you never see it as a line.', 'cat27'],
    ['No shipping charge on your startup box or carpets', 'Box shipping and carpet freight are counted in the startup package price.', 'cat27'],
    ['No setup or onboarding fee', 'Live virtual onboarding hours are part of every package.', 'cat25'],
    ['No fee to spread the startup cost', 'Pay at signing, or in three equal monthly payments with no added fee.', 'cat24'],
    ['No charge for the app or Level 1 training', 'The Futures Hub and Level 1 Foundations for every staff member are part of the monthly fee.', 'cat24'],
    ['No per-child or family app fee', 'Families get unlimited access in every tier. Centers have no staff user limit.', 'cat25']
  ];

  // What the packages do not include, and what it costs. Each row: [item, prices, release-manifest asset id].
  const EXTRAS = [
    ['Program add-ons', [
      ['Additional classroom set (5 storybooks, 4 plush, 4 character posters, Eat the Rainbow poster, 5 zone signs)', [[395, 'cat26']], 'classroom-set'],
      ['Additional carpet, 8 ft round / 6 x 9 ft (freight included)', [[795, 'cat26'], [745, 'cat26']], 'carpet'],
      ['Family Welcome Kit, center price / suggested retail (10-kit minimum)', [[42, 'cat26'], [59, 'cat26']], 'family-welcome-kit'],
      ['Extra Hub users for Home Daycare, beyond the provider and 3 assistants', [[5, 'cat26', ' per user a month']], 'hub-portals'],
      ['Extra live virtual training session (90 minutes, up to 15 staff)', [[150, 'cat26']], 'service-onboarding'],
      ['On-site launch day, Kansas City metro (travel outside the metro at cost)', [[750, 'cat26']], 'service-launch-day'],
      ['Replacement curriculum binder', [[75, 'cat26']], 'curriculum-binder']]],
    ['Training beyond Level 1', [
      ['Standard Center membership, up to 15 staff', [[3600, 'tt60', ' a year']], 'training-catalog'],
      ['Large Center membership, 16 to 30 staff', [[5940, 'tt60', ' a year']], 'training-catalog'],
      ['Home Daycare membership, provider plus 1 assistant', [[480, 'tt60', ' a year']], 'training-catalog'],
      ['Single seats: Level 2 / Level 3 / Director / Cook', [[349, 'tt61'], [495, 'tt61'], [595, 'tt61'], [199, 'tt61']], ['cred-l2', 'cred-l3', 'cred-director', 'cred-cook']],
      ['Trainer Academy, per person', [[1250, 'tt61']], 'cred-trainer']]],
    ['Seasonal units', [
      ['Summer week materials kit, center / home', [[229, 'camp5'], [139, 'camp5']], 'seasonal-units'],
      ['Holiday unit materials kit, center / home', [[119, 'camp5'], [69, 'camp5']], 'seasonal-units']]],
    ['Futures Hub only (for programs not in Futures Friends)', [
      ['Home / Center / Center Plus, a month', [[49, 'hub5'], [149, 'hub5'], [249, 'hub5', ' per site']], 'hub-portals']]]
  ];
  const TERMS = [
    ['Agreement', '12 months, then month to month with 60 days’ notice to cancel.', 'cat24'],
    ['Monthly fee', 'Billed on the 1st. The first month is prorated from the day you start.', 'cat29'],
    ['Reorders', 'Wholesale prices are held for 12 months from your signing date. Free shipping to the center on orders over $250; under that, the actual ground rate. Minimum order $75.', 'cat37'],
    ['Damaged or missing items', 'Report within 7 days of delivery for a free replacement.', 'cat29'],
    ['Sales tax', 'Not included in these prices. If any applies to your order, it will be shown on your written quote before you sign.', null]
  ];

  // Competitor prices: only [F] (page opened and read) figures from the research file, each with its link and date (E8: with the basis).
  // basis: public list price vs a state contract or price list; docDate: the date the price document carries; license, rooms, includes,
  // excludes: as the research file records them. "Not recorded in our research" is said plainly instead of guessed.
  const SEEN = '5 Oct 2026';
  const NR = 'Not recorded in our research';
  const COMP = [
    { kind: 'Curriculum', name: 'Creative Curriculum for Preschool (Teaching Strategies)', price: '$3,780 per classroom', basis: 'State contract ceiling: Indiana not-to-exceed price list', docDate: 'Not dated in our research file',
      license: '2 years, with digital access; digital renewal $2,680', rooms: '1 classroom', includes: 'A full year of daily curriculum: teaching guides, Intentional Teaching Cards, Mighty Minutes and books',
      excludes: '$275 shipping per kit; the GOLD assessment is a separate subscription', url: 'https://www.in.gov/doe/files/Teaching-Strategy-Cost-Sheet.pdf' },
    { kind: 'Curriculum', name: 'Frog Street Pre-K', price: '$3,999', basis: 'Public list price (publisher store)', docDate: 'Current store page',
      license: '2 years (English edition)', rooms: NR, includes: 'A full year of daily lessons with Conscious Discipline built in, music and movement', excludes: NR, url: 'https://store.frogstreet.com/product/frog-street-pre-k-2020-eng/' },
    { kind: 'Curriculum', name: 'Experience Early Learning, Preschool', price: '$279.99 a month', basis: 'State price list: Indiana', docDate: 'Not dated in our research file',
      license: 'Monthly subscription', rooms: 'Up to 25 children per subscription', includes: 'A monthly box of teacher guides and materials, every month of the year', excludes: NR, url: 'https://www.in.gov/doe/files/Early-Learning-Cost-Sheet.pdf' },
    { kind: 'Curriculum', name: 'Scholastic PreK On My Way', price: '$2,950 per kit', basis: 'State price list: Indiana', docDate: 'February 2024',
      license: NR, rooms: 'Per kit; classrooms per kit not recorded', includes: 'A full-year program with daily read-alouds and books', excludes: 'Professional development, $2,999 per half-day; the bilingual edition is $4,620', url: 'https://www.in.gov/doe/files/earlylearning_scholastic_february2024.pdf' },
    { kind: 'Training', name: 'CCEI online training', price: '$499 a year for 20 users; $999 for 50', basis: 'Public list price', docDate: 'Current product page',
      license: '1 year', rooms: 'Not per classroom: 20 or 50 staff users', includes: 'Online staff training courses', excludes: 'No curriculum', url: 'https://landing.cceionline.com/our-products' },
    { kind: 'App', name: 'Brightwheel', price: 'Quote only', basis: 'Quote only: no published price', docDate: 'Current help page',
      license: NR, rooms: 'Priced by enrollment capacity', includes: 'A child care management app', excludes: 'Curriculum, assessments, professional development, payroll and tuition insurance are add-ons', url: 'https://intercom.help/brightwheel/articles/1443633-premium-overview' },
    { kind: 'App', name: 'Procare', price: 'Quote only', basis: 'Quote only: no published price', docDate: 'Current vendor blog post',
      license: 'Month to month', rooms: 'No per-child billing (vendor statement)', includes: 'Child care management software; setup and training included (vendor statement)', excludes: 'Some integrations (Checkr, Gusto, QuickBooks) cost extra', url: 'https://www.procaresoftware.com/blog/5-common-myths-about-procare-pricing-the-truth-behind-the-numbers/' },
    { kind: 'App', name: 'Famly (US)', price: 'From $49 a month', basis: 'Public list price', docDate: 'Current pricing page',
      license: 'Monthly', rooms: NR, includes: 'A child care management app (Starter plan)', excludes: 'Translation is a $19 per site a month add-on on Starter', url: 'https://www.famly.co/us/pricing' }
  ];
  const BASIS = [['basis', 'Price basis'], ['docDate', 'Price document date'], ['license', 'License length'], ['rooms', 'Classrooms covered'], ['includes', 'Included'], ['excludes', 'Not included']];
  const compAmt = s => E(s).replace(/\$[\d,.]+/g, m => `<span class="pz-amt" data-src="comp">${m}</span>`);

  // Calculator: rooms and children in, an estimate of the FUTURE annual bundle out (before tax). Pure, so tests can check it.
  function quote({ type = 'center', rooms = 2, children = 20, everyRoom = false, kits = false } = {}) {
    rooms = Math.max(1, Math.min(30, Math.round(+rooms) || 1)); children = Math.max(0, Math.min(500, Math.round(+children) || 0));
    const tier = type === 'home' ? TIERS[0] : rooms <= 3 ? TIERS[1] : TIERS[2];
    if (type === 'home') rooms = 1;
    const extraSets = everyRoom ? Math.max(0, rooms - tier.sets) : 0;
    const kitsIncluded = tier.id === 'complete' ? 20 : 0;                                    // Center Complete includes 20 kits
    const kitNeed = kits ? Math.max(0, children - kitsIncluded) : 0;
    const kitCount = kitNeed ? Math.ceil(kitNeed / 10) * 10 : 0;                             // kits are ordered in multiples of 10
    const oneTime = tier.startup + extraSets * 395 + kitCount * 42;
    const y1 = oneTime + 12 * tier.monthly, y2 = oneTime + 24 * tier.monthly;
    return { tier, rooms, children, extraSets, kitCount, kitsIncluded, oneTime, monthly: tier.monthly, y1, y2, prepayYear1: oneTime + tier.prepay };
  }

  const calcOut = r => `<div class="pz-out" aria-live="polite">
   <p class="pz-tier">Future bundle: <b>${E(r.tier.name)}</b> <span class="small muted">(${E(r.tier.who.toLowerCase())})</span></p>
   <dl class="pz-dl">
    <div><dt>One time</dt><dd>${pz(r.oneTime, 'calc')}<small>${pz(r.tier.startup, 'cat24')} startup${r.extraSets ? ` + ${r.extraSets} extra classroom set${r.extraSets > 1 ? 's' : ''} at ${pz(395, 'cat26')}` : ''}${r.kitCount ? ` + ${r.kitCount} Family Welcome Kits at ${pz(42, 'cat26')}` : ''}</small></dd></div>
    <div><dt>Every month</dt><dd>${pz(r.monthly, 'cat24')}<small>for the Hub, new lessons and Level 1 training, once they exist</small></dd></div>
    <div><dt>First year, paying monthly</dt><dd>${pz(r.y1, 'calc')}<small>or ${pz(r.prepayYear1, 'calc')} if you prepay the year (12 months for the price of 10)</small></dd></div>
    <div><dt>Two years</dt><dd>${pz(r.y2, 'calc')}<small>one-time costs plus 24 monthly fees, before tax</small></dd></div>
   </dl>
   <div class="pz-cover"><b>What this estimate covers: the same rules as your written quote</b>${window.FFRelease ? window.FFRelease.coverage() : ''}</div>
   <p class="small muted">${PENDING} Ordering opens soon: this is an estimate of a future bundle, not an order or a bill. To start now, see the launch package above.</p></div>`;

  if (typeof V !== 'undefined') {
    V.pricing = () => {
      const r = quote({});
      return phero('Pricing', 'Published package prices before tax', 'Start now with Unit 1 and a live session for your staff, or look ahead to the annual bundle. Each price says where it comes from, and every one is a proposed launch price until it is final. Ordering opens soon: nothing is for sale online yet.') + `
<section class="tight pz-status"><div class="wrap"><div class="pz-banner" role="note"><span class="chip warn">Ordering opens soon</span><p>These are the brand’s recommended launch prices, before tax. They are not final yet, so each one is marked <b>${LABEL}</b> until then. No payment is taken on this site.</p></div></div></section>
${window.FFRelease ? window.FFRelease.launch() : ''}
<section class="band-paper" id="annual"><div class="wrap">${head('Annual bundle (future)', 'One startup package, one monthly fee', 'The full program, once it is made. The startup package is paid once; the monthly fee pays for the app, training, new lessons and support. Each package says what it delivers today, when it starts and when billing begins: most items are still being made.')}
 <div class="pz-tiers">${TIERS.map(t => `<article class="pz-tier-card" style="--c:var(--${t.c})">
  <span class="tag c" style="--c:var(--${t.c});justify-self:start">${E(t.name)}</span><p class="small muted">${E(t.who)}</p>
  <div class="pz-big"><span class="pz-lbl">One time</span>${pz(t.startup, 'cat24')}<span class="pz-lbl">startup package</span></div>
  <div class="pz-big"><span class="pz-lbl">Monthly</span>${pz(t.monthly, 'cat24', ' a month')}</div>
  <p class="small">First year, before tax: <b>${pz(yearOne(t), 'cat24')}</b>. Or prepay 12 months for ${pz(t.prepay, 'cat24')} (the price of 10).</p>
  <h3 class="pz-h">What is included</h3>${window.FFRelease ? window.FFRelease.scope(t.inc) + window.FFRelease.terms(t.id) : `<ul class="pz-list">${t.inc.map(i => `<li>${E(i[0])}</li>`).join('')}</ul>`}
  <p class="pz-src">Source: ${DOCS.cat24}-25. ${PENDING}</p></article>`).join('')}</div>${window.FFRelease ? window.FFRelease.legend() : ''}</div></section>
<section><div class="wrap">${head('No hidden fees', 'What you will never see on your bill', '')}
 <ul class="pz-nofees">${NO_FEES.map(f => `<li><b>${E(f[0])}</b><span>${E(f[1])}</span><small>Source: ${DOCS[f[2]]}</small></li>`).join('')}</ul></div></section>
<section class="band-paper"><div class="wrap">${head('Not included', 'What costs extra, and exactly how much', 'Only if you want it. Every package works without these.')}
 <div class="pz-extras">${EXTRAS.map(([g, rows]) => `<div class="tw"><table class="pz-table"><caption>${E(g)}</caption><thead><tr><th scope="col">Item</th><th scope="col" class="n">Price</th></tr></thead><tbody>${rows.map(([item, prices, id]) => `<tr><td>${E(item)}${window.FFRelease ? ' ' + window.FFRelease.chip(id) : ''}<small class="pz-src">${DOCS[prices[0][1]]}</small></td><td class="n">${prices.map(p => pz(p[0], p[1], p[2] || '')).join(' / ')}</td></tr>`).join('')}</tbody></table></div>`).join('')}</div>
 <p class="small muted" style="margin-top:12px">${PENDING} Program members get 10% off single seasonal kits (Summer Camp &amp; Holiday Units v1.0, p.5).</p></div></section>
<section id="pz-calc"><div class="wrap">${head('Cost calculator', 'Your future annual bundle, before tax', 'Tell us your program, rooms and children. The estimate uses only the prices on this page and the same coverage rules as your written quote.')}
 <div class="pz-calc"><form class="pz-form" data-pz-calc novalidate>
  <fieldset><legend>Program</legend><label><input type="radio" name="type" value="center" checked> Child care center</label><label><input type="radio" name="type" value="home"> Home daycare</label></fieldset>
  <label class="f" for="pz-rooms">Classrooms<input class="i" id="pz-rooms" name="rooms" type="number" inputmode="numeric" min="1" max="30" value="${r.rooms}"></label>
  <label class="f" for="pz-kids">Children enrolled<input class="i" id="pz-kids" name="children" type="number" inputmode="numeric" min="0" max="500" value="${r.children}"></label>
  <label class="pz-check"><input type="checkbox" name="everyRoom"> Add a classroom set for every classroom (your package includes ${'<span data-pz-sets>' + r.tier.sets + '</span>'})</label>
  <label class="pz-check"><input type="checkbox" name="kits"> Add a Family Welcome Kit for every child (Center Complete already includes 20)</label>
 </form><div id="pzOut">${calcOut(r)}</div></div></div></section>
<section class="band-paper" id="pz-compare"><div class="wrap">${head('Compare', 'What you can get today, next to what others sell', 'Each figure shows where it comes from, the date on the price document, whether it is a public price or a state contract price, how long the license runs, how many classrooms it covers, and what is and is not included. Our research found these on ' + SEEN + '; prices change, so check each source.')}
 <article class="pz-cmp pz-us" data-scope="available"><h3>Futures Friends, available today</h3><dl>
  <div><dt>Price</dt><dd>Unit 1's summary and one sample day are public; licensed centers receive the full plans. Proposed launch package: ${pz(150, 'cat26')} for a live session with your staff ${PENDING}</dd></div>
  <div><dt>License length</dt><dd>No license term: Unit 1 is for your program's educators</dd></div><div><dt>Classrooms covered</dt><dd>Any number</dd></div>
  <div><dt>Included</dt><dd>One month of curriculum (Unit 1 of 12 planned): 20 teaching days for your educators, delivered privately (through Futures Learning Center until the Futures Hub is hosted), all draft</dd></div>
  <div><dt>Not included</dt><dd>Units 2 to 4 (written, draft) and Units 5 to 12 (planned); the Futures Hub, Level 1 training, printed books, plush, carpet and episodes, none of which is made yet</dd></div></dl>
  <p class="small muted">The curricula below are full-year products. One draft month is not the same scope, so compare what each one delivers, not only the price.</p></article>
 <div class="pz-cmps">${COMP.map(c => `<article class="pz-cmp"><h3>${E(c.name)}</h3><p class="small muted">${E(c.kind)}</p><p class="pz-cmpprice">${compAmt(c.price)}</p><dl>${BASIS.map(([k, l]) => `<div><dt>${l}</dt><dd>${compAmt(c[k])}</dd></div>`).join('')}</dl><p class="small"><a href="${c.url}" target="_blank" rel="noopener">Source</a> <small class="pz-src">Seen ${SEEN}</small></p></article>`).join('')}</div>
 <article class="pz-cmp pz-future" data-scope="future"><h3>Futures Friends annual bundle: a future estimate, kept apart</h3>
  <p class="small">Center Starter: ${pz(2995, 'cat24')} once, then ${pz(229, 'cat24', ' a month')} before tax. ${PENDING} Most of what it pays for is not made yet (see the annual bundle above), so it is not set against the products above.</p></article>
 <p class="small muted" style="margin-top:10px">Competitor prices come from our competitive research file, where a researcher opened each page on ${SEEN}. Indiana price lists are what that state allows vendors to charge its schools; your price may differ.</p></div></section>
<section><div class="wrap">${head('Terms', 'The rest, in plain words', '')}
 <dl class="pz-terms">${TERMS.map(t => `<div><dt>${E(t[0])}</dt><dd>${E(t[1]).replace(/\$(250|75)\b/g, m => pz(+m.slice(1), 'cat37'))}${t[2] ? `<small class="pz-src">Source: ${DOCS[t[2]]}</small>` : '<small class="pz-src">Owner to confirm how sales tax is handled</small>'}</dd></div>`).join('')}</dl></div></section>
<section class="tight"><div class="wrap"><div class="cta"><div style="display:grid;gap:8px"><h2>Ordering opens soon</h2><p class="lede">Nothing is for sale online yet. Ask for a written quote and a real person will confirm every price with you first.</p></div><button class="btn gold" data-go="quote">Ask for a written quote</button></div></div></section>`;
    };
  }

  // Live calculator.
  if (typeof document !== 'undefined' && document.addEventListener) {
    const read = f => ({ type: (f.querySelector('input[name="type"]:checked') || {}).value || 'center', rooms: f.rooms.value, children: f.children.value, everyRoom: f.everyRoom.checked, kits: f.kits.checked });
    const update = e => { const f = e.target && e.target.closest && e.target.closest('[data-pz-calc]'); if (!f) return;
      const r = quote(read(f)); const out = document.getElementById('pzOut'); if (out) out.innerHTML = calcOut(r);
      f.rooms.disabled = r.tier.id === 'home'; const s = f.querySelector('[data-pz-sets]'); if (s) s.textContent = r.tier.sets; };
    document.addEventListener('input', update); document.addEventListener('change', update);
  }

  const API = { DOCS, TIERS, NO_FEES, EXTRAS, TERMS, COMP, BASIS, SEEN, LABEL, quote, yearOne, fmt, pz };
  if (typeof window !== 'undefined') window.FFPricing = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
