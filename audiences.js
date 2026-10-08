/* Futures Friends: two audiences, kept apart (owner 2026-10-07: "Parents should NOT get the clutter — no sales, no big kit/pricing
   pitches ... The big sales stuff must be strictly for centers and clients — not in parents' faces at first — put away separately for
   people who select the proper portal at the top").
   - Families (the default for everyone): friends, videos, Story Time, Futures at Home, family printables, the pilot center, the Family
     Portal and a small Kids' Shop. No pricing, packages, kits, investor or business pages in their nav, Home or footer.
   - For Centers & Programs: every sales and business page, starting at the #centers landing (what used to be Home's "Start where you
     are" doors for centers and home daycares, the status line and the full "What we have built" proof).
   - Sign in: one chooser (#sign-in) for the Family Portal, the Teacher Portal, a center's own sign-in and the Academy.
   wayfinding.js owns the audience state (FFAudience), which page belongs to whom (FFWay.PAGES) and the header/menu/footer per audience.
   This file adds the new pages (#centers, #book-demo, #kids-shop, #sign-in) and the address aliases: #families/<route> and
   #centers/<route> open <route> in that audience, ?for=centers|families picks one on arrival, and the old #shop-families link opens
   the Kids' Shop. Loaded after not-found.js (so these routes are known) and before analytics.js. Sends nothing; stores nothing itself. */
(function () {
  'use strict';
  if (typeof V === 'undefined' || typeof go !== 'function') return;
  const W = window, doc = document;
  const E = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const icon = n => `<svg class="px-icon" aria-hidden="true"><use href="img/ui-icons.svg#${n}"></use></svg>`;
  const PHONE_ = typeof PHONE === 'string' ? PHONE : '(816) 988-5661';
  const EMAIL_ = typeof EMAIL === 'string' ? EMAIL : '';
  const has = r => typeof V[r] === 'function';
  const art = (k, h, cls) => (W.FFPlush ? W.FFPlush.img(k, { cls: cls || '', alt: '', h }) : '');
  const hero = (eyebrow, title, lede, o) => (typeof phero === 'function' ? phero(eyebrow, title, lede, o || {}) : `<div class="phero"><div class="wrap"><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p class="lede">${lede}</p></div></div>`);
  const card = (href, h, p, k, cls) => `<li class="aud-card${cls ? ' ' + cls : ''}" style="--c:var(--${k})"><a href="${href}"><span class="aud-cardart" aria-hidden="true">${art(k, 96, 'aud-cardcut')}</span><span class="aud-cardtxt"><b>${E(h)}</b><span>${E(p)}</span></span>${icon('ArrowRight')}</a></li>`;
  const tiles = list => `<ul class="aud-tiles">${list.filter(([r]) => has(r.split('/')[0])).map(([r, h, p]) => `<li><a href="#${r}"><b>${E(h)}</b><span>${E(p)}</span></a></li>`).join('')}</ul>`;
  const sect = (id, cls, inner) => `<section class="aud-sec ${cls || ''}" aria-labelledby="${id}"><div class="wrap">${inner}</div></section>`;
  const lead = (id, eyebrow, h, p) => `<div class="aud-head"><span class="eyebrow">${eyebrow}</span><h2 id="${id}">${h}</h2>${p ? `<p class="lede">${p}</p>` : ''}</div>`;

  // ---------------------------------------------------------------- #centers: the landing for centers, home daycares, churches and programs
  // Every program type gets the same size card (review 2026-10-07: churches as prominent as centers and home daycares).
  const PROGRAMS = [
    ['for-centers', 'Child care centers', 'Every classroom, with lessons, family connections and support for your teachers.', 'booker'],
    ['for-home', 'Home daycares', 'The same friends and stories, sized for one room and children of mixed ages.', 'zuri'],
    ['for-faith', 'Churches and faith-based programs', 'Kindness, courage and curiosity, with room for your own traditions and shared Sunday rooms.', 'lumi'],
    ['for-prek', 'Pre-K and Head Start partners', 'Readiness units being mapped to the Missouri standards and the Head Start framework.', 'bop'],
    ['for-employers', 'Employer child care', 'A branded program for on-site and partner care for working families.', 'booker']
  ];
  const ROOMS = [['room-kit', 'Learning Zones Kit', 'Carpets, low fences, signs and a transition cue for five friend zones.'],
    ['room-planner', 'Room planner', 'Lay out your own room to scale.'],
    ['shop-programs', 'Classroom Branding Kits', 'Zone signs, posters and carpets at member prices.'],
    ['corners', 'Name your corners', 'What goes in each learning zone.']];
  const TEAM = [['curriculum', 'Curriculum by age', 'Twelve monthly units for twos, threes and pre-K.'],
    ['unit-1', 'Unit 1 at a glance', 'The first month in summary, with one sample day.'],
    ['teacher-standard', 'Our Teacher Standard', 'Training, background checks and mastery.'],
    ['academy', 'Training Academy', 'Sample lessons from the staff training catalog.'],
    ['train-your-staff', 'Train your staff', 'Scenario mastery, time tracking and director checklists.']];
  // Routes other lanes are adding (#membership, #founding-partners, #brand-kit, #room-planner) show up here as soon as they exist.
  const RUN = [['pricing', 'Pricing', 'Startup packages and monthly membership.'],
    ['membership', 'Monthly Membership', 'What a membership includes, month by month.'],
    ['founding-partners', 'Founding Partners', 'The founding partner program for early programs.'],
    ['brand-kit', 'Partner brand kit', 'Logos, colours and signs for your program.'],
    ['options', 'Compare program options', 'Which program fits your site.'],
    ['hub', 'Futures Hub', 'Today checklist, ratios, meals and family updates.'],
    ['start-center', 'Start your center (demo)', 'Your own name, colour, sign-in page, staff and families.'],
    ['funding', 'Funding help', 'CACFP, subsidy, grants and tax credits.'],
    ['impact', 'Impact and research', 'Why the early years matter and what we will measure.'],
    ['why', 'Why Futures Friends', 'Teacher-led and hands-on, not video-first.']];
  V.centers = () => hero('For centers &amp; programs', 'Bring Futures Friends to your program',
    'For child care centers, home daycares, churches and pre-K partners: the four friends, a whole-child curriculum, learning-zone rooms, staff training and family tools in one membership.',
    { chars: ['booker', 'zuri', 'lumi', 'bop'], cta: `<a class="btn gold" href="#book-demo">Book a demo</a><a class="btn soft" href="#pricing">See pricing</a>` })
    + (W.FFHomeCalm && W.FFHomeCalm.status ? W.FFHomeCalm.status() : '')
    + sect('aud-prog-h', 'band-paper aud-programs', `${lead('aud-prog-h', 'Start where you are', 'Which program are you?', 'Pick your setting to see what you get, how it is sized and what it costs.')}<ul class="aud-cards">${PROGRAMS.filter(([r]) => has(r)).map(([r, h, p, k]) => card('#' + r, h, p, k)).join('')}</ul>`)
    + sect('aud-rooms-h', '', `${lead('aud-rooms-h', 'Your rooms', 'Set up the learning zones', '')}${tiles(ROOMS)}`)
    + sect('aud-team-h', 'band-paper', `${lead('aud-team-h', 'Your teachers', 'Curriculum and training', 'Full lesson plans are for member programs; the summaries are open to read.')}${tiles(TEAM)}`)
    + sect('aud-run-h', '', `${lead('aud-run-h', 'Your program', 'Run it, fund it, compare it', '')}${tiles(RUN)}`)
    + (W.FFHomeCalm && W.FFHomeCalm.proof ? W.FFHomeCalm.proof() : '')
    + sect('aud-fam-h', 'band-paper aud-famlink', `<div class="aud-famgrid"><div>${art('lumi-heart-hands', 150, 'aud-famcut')}</div><div><span class="eyebrow">What your families get</span><h2 id="aud-fam-h">See what families experience</h2><p>Your families get the friends, read-along books, short videos, activities from things at home and the Family Portal. No sales, nothing to buy.</p><a class="btn navy" href="#home" data-ffa-aud="families">See the family side ${icon('ArrowRight')}</a></div></div>`)
    + `<section class="hc-close aud-close" aria-labelledby="aud-close-h"><div class="wrap hc-closegrid"><div><h2 id="aud-close-h">Talk to a real person</h2><p>Book a demo or discuss your program: thirty minutes on your rooms, ages and enrollment, a walk through the Futures Hub and an honest answer on what is ready today.</p></div>
      <div class="hc-closeacts"><a class="hc-btn hc-btn-gold" href="#book-demo">Book a demo ${icon('ArrowRight')}</a><a class="hc-btn hc-btn-line" href="tel:+18169885661">Call ${E(PHONE_)}</a></div></div></section>`;

  // ---------------------------------------------------------------- #book-demo: the business next step (membership conversation)
  const DEMO = { id: 'book-demo', heading: 'Book a demo or discuss your program', interest: 'demo', what: 'demo requests',
    message: 'I would like a demo and to talk about a Futures Friends membership.\nProgram type (center, home daycare, church, pre-K, employer): \nRooms and ages: ' };
  V['book-demo'] = () => {
    const I = W.FFIntake;
    const form = I && I.contactHtml ? I.contactHtml('contact', DEMO)
      : `<div class="card"><h3>${DEMO.heading}</h3><p class="small">Online requests open soon. Please call <b>${E(PHONE_)}</b>${EMAIL_ ? ` or email <b>${E(EMAIL_)}</b>` : ''}.</p></div>`;
    return hero('For centers &amp; programs', 'Book a demo', 'See the Futures Hub, the rooms and the curriculum summaries, and talk through membership for your program. A real person replies; nothing is charged.', { chars: ['booker', 'zuri'] })
      + `<section class="band-paper"><div class="wrap"><div class="grid g2" style="align-items:start"><div class="aud-steps"><h2>What happens next</h2><ol><li><b>Call</b><span>Thirty minutes on your rooms, ages and enrollment.</span></li><li><b>Demo</b><span>The Futures Hub, the Learning Zones Kit and a sample day.</span></li><li><b>Your plan</b><span>A written membership quote that marks what is ready now and what comes later.</span></li></ol><p class="small">Or call <a class="rl" href="tel:+18169885661">${E(PHONE_)}</a>.</p></div>${form}</div></div></section>`;
  };

  // ---------------------------------------------------------------- #kids-shop: the families' only commerce (poster, plush, small carpet)
  const price = item => { const c = W.FFStore && W.FFStore.cat ? W.FFStore.cat(item) : null; return c && c.retail ? '$' + c.retail.toFixed(2) : ''; };
  const KIDS = [
    { id: 'poster', name: 'Friend poster, 18 x 24', k: 'zuri', pose: 'zuri-magnifier', item: 'Character poster 18 x 24, each', when: 'First to open', note: 'Booker, Lumi, Zuri or Bop for a bedroom or reading corner. Opens when the new poster art is approved.' },
    { id: 'plush', name: 'Plush friend', k: 'lumi', pose: 'lumi-heart-hands', item: 'Plush friend, each (Booker, Lumi, Zuri or Bop)', when: 'Later', note: 'Booker, Lumi, Zuri or Bop to hug. Opens only after third-party safety testing and a Children\'s Product Certificate.' },
    { id: 'carpet', name: 'Small friend carpet for home', k: 'bop', pose: 'bop-waving', item: '', when: 'Later', note: 'A small play carpet for a bedroom or reading nook. Made to order; size and price are still being set.' }
  ];
  V['kids-shop'] = () => hero('For families', 'The Kids\' Shop', 'A small corner for the friends at home: a poster, a plush friend and a small carpet. Ordering opens soon; nothing is charged here.', { chars: ['lumi', 'bop'] })
    + `<section class="band-paper"><div class="wrap"><ul class="aud-kids">${KIDS.map(x => { const p = x.item ? price(x.item) : ''; return `<li class="aud-kid" style="--c:var(--${x.k})"><div class="aud-kidart">${art(x.pose, 190, 'aud-kidcut')}<span class="aud-kidph">Product photo coming soon</span></div><div class="aud-kidbody"><p class="aud-kidtop"><span class="chip${x.when === 'Later' ? '' : ' ok'}">${E(x.when)}</span><span class="aud-kidprice">${p ? E(p) : 'Price coming soon'}</span></p><h2>${E(x.name)}</h2><p class="small">${E(x.note)}</p></div></li>`; }).join('')}</ul>
     <div class="fs-soon aud-kidsoon" role="note"><b>Ordering opens soon.</b><p class="small">Online payment is not set up yet, so nothing is charged and no order is placed here. Leave your name and we will tell you when the Kids' Shop opens.</p><button class="btn gold" data-go="store-request" data-store-req="list">Tell me when it opens</button></div>
     <p class="note fs-src">Prices shown come from the Futures Friends catalog (October 2026), before tax, are proposed and may change before the shop opens.</p></div></section>`;

  // ---------------------------------------------------------------- #sign-in: the portals, in one place
  const PORT = [['signin-family', 'Family Portal', 'Your child\'s day, meals, notes and messages from the classroom.', 'lumi'],
    ['signin-teacher', 'Teacher and director portal', 'The classroom day, check-in, plans, progress and reports.', 'zuri'],
    ['learn', 'Futures Friends Academy', 'Courses and training records for staff.', 'booker'],
    ['start-center', 'A center\'s own sign-in page', 'Create a demo center with its own name, colour and sign-in page.', 'bop']];
  V['sign-in'] = () => hero('Sign in', 'Sign in to Futures Friends', 'Choose your portal. These are previews with demo accounts and sample data.', { chars: ['lumi', 'zuri'] })
    + sect('aud-sign-h', 'band-paper', `<h2 id="aud-sign-h" class="sr-only">Portals</h2><ul class="aud-cards aud-cards-sign">${PORT.filter(([r]) => has(r)).map(([r, h, p, k]) => card('#' + r, h, p, k)).join('')}</ul><p class="small aud-signnote">Trouble signing in? <a class="rl" href="#reset-password">Reset your password</a> or call <a class="rl" href="tel:+18169885661">${E(PHONE_)}</a>.</p>`);

  // ---------------------------------------------------------------- address aliases
  // #families/<route>, #centers/<route>: open <route> as that audience (shareable "portal" links). #families alone is Home.
  // #shop-families (the old family shop) opens the Kids' Shop. Anything else passes straight through.
  const setAud = a => { if (W.FFAudience && W.FFAudience.get() !== a) W.FFAudience.set(a, { source: 'address', announce: false }); };
  const base = go;
  go = function (v, a) {
    if (v === 'families') { setAud('families'); const t = String(a || '').split('/'); return base.call(this, t[0] && has(t[0]) ? t[0] : 'home', t[1] || undefined); }
    if (v === 'centers' && a) { const t = String(a).split('/'); if (has(t[0]) && t[0] !== 'centers') { setAud('centers'); return base.call(this, t[0], t[1] || undefined); } }
    if (v === 'shop-families') v = 'kids-shop';
    return base.call(this, v, a);
  };
  W.go = go;
  // ?for=centers or ?for=families on arrival picks the audience (no reload; the address keeps its route)
  try { const m = /[?&]for=(families|centers)\b/.exec(location.search); if (m) setAud(m[1]); } catch (_) { /* no location */ }
  // "See the family side" and similar links: choose the audience on the way (the route then confirms it)
  doc.addEventListener('click', e => { const l = e.target.closest && e.target.closest('[data-ffa-aud]'); if (l) setAud(l.dataset.ffaAud); }, true);

  // wayfinding.js drew the header before these routes existed (it lists only routes that have a view): draw it again now.
  if (W.FFAudience && W.FFAudience.refresh) W.FFAudience.refresh();

  W.FFAudiences = Object.freeze({ PROGRAMS, ROOMS, TEAM, RUN, KIDS, PORT, DEMO });
})();
