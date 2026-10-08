/* Futures Store v2: two doors (families / programs), Classroom Branding Kits and the "Name your corners" explainer.
   Loaded after views.js (uses its globals V, D, st, esc, money, CH, img, phero, head, render).
   Honesty rules (docs/commerce/STORE_PLAN.md):
   - No payments are live. Every list ends in "Ordering opens soon" and a request that goes through window.FFIntake;
     with no intake url that request shows the site's honest "Online requests open soon" state. No URL is hardcoded here.
   - A price is shown only when it traces to the catalog in data.js (D.catalog, from the Welcome Package & Catalog v1.0
     reorder price list, p.35-36, pending owner confirmation G09). Anything else says "Price coming soon".
   - No product photos exist yet: tiles are designed placeholders labelled "Product photo coming soon".
   - Corner names: the four character zones and the Eat the Rainbow wall are curriculum canon (Center Curriculum, training
     course FF-102). Areas named only in the series bible say so; anything new is marked "Proposed". */
(function () {
  'use strict';
  if (typeof V === 'undefined') return;
  const cat = name => (D.catalog || []).find(c => c.item === name) || null;
  const STATUS = { launch: ['First to open', 'ok'], phase2: ['Next', 'warn'], later: ['Later', ''] };
  const chip = s => `<span class="chip ${STATUS[s][1]}">${STATUS[s][0]}</span>`;

  // Family door. cat: the D.catalog item whose retail price applies (only when the product matches that catalog line).
  const FAMILY = [
    { sku: 'FF-FAM-TEE-KID', name: 'Friends tee, kids', ch: 'booker', status: 'launch', note: 'Toddler and youth sizes, printed to order. No drawstrings, no hard trims.' },
    { sku: 'FF-FAM-TEE-ADULT', name: 'Grown-up tee', ch: 'bop', status: 'launch', note: 'Adult sizes for parents, grandparents and teachers, printed to order.' },
    { sku: 'FF-FAM-TOTE', name: 'Library book tote', ch: 'booker', status: 'launch', note: 'Carries the week\'s library books home. Printed to order.' },
    { sku: 'FF-FAM-POSTER', name: 'Character poster 18 x 24', cat: 'Character poster 18 x 24, each', ch: 'zuri', status: 'launch', note: 'Opens when the new poster art is approved.' },
    { sku: 'FF-FAM-STICKERS', name: 'Sticker set (4 die-cut)', cat: 'Sticker set (4 die-cut)', ch: 'lumi', status: 'phase2', note: 'For use with a grown-up. Not for children who still put things in their mouths.' },
    { sku: 'FF-FAM-BOOK', name: 'Storybook', cat: 'Storybook, each', ch: 'booker', status: 'phase2', note: 'Opens when the first books are printed.' },
    { sku: 'FF-FAM-PLUSH', name: 'Plush friend (Booker, Lumi, Zuri or Bop)', cat: 'Plush friend, each (Booker, Lumi, Zuri or Bop)', ch: 'lumi', status: 'later', note: 'Opens only after third-party safety testing and a Children\'s Product Certificate.' },
    { sku: 'FF-FAM-KIT', name: 'Family Welcome Kit', cat: 'Family Welcome Kit', ch: 'bop', status: 'later', note: 'Plush, storybook, activity book, stickers and a parent guide. Opens with the plush.' },
    { sku: 'FF-FAM-BOTTLE', name: 'Kids water bottle', ch: 'zuri', status: 'later', note: 'Only through a supplier that provides children\'s product and food-contact paperwork.' },
    { sku: 'FF-FAM-BACKPACK', name: 'Backpack and lunch bag', ch: 'bop', status: 'later', note: 'Later, once the first family items have sold.' }
  ];

  // Program door: Classroom Branding Kits. parts: priced catalog lines; extras: kit pieces not yet priced.
  const KITS = [
    { id: 'home', name: 'Home kit', who: 'Licensed home daycares and small church rooms', ch: 'lumi',
      parts: ['Zone sign set of 5, home (9 x 12)', 'Character poster set of 4'],
      extras: ['Eat the Rainbow wall kit (6 colour bands)', 'Family photo wall header', 'Welcome door sign (proposed)'],
      note: 'Sized for portable zones that pack away at the end of the day.' },
    { id: 'classroom', name: 'Classroom kit', who: 'One classroom in a center, preschool or church program', ch: 'booker',
      parts: ['Zone sign set of 5, center', 'Character poster set of 4', 'Eat the Rainbow poster 24 x 36'],
      extras: ['Eat the Rainbow wall kit (6 colour bands)', 'Family photo wall header', 'Welcome door sign (proposed)'],
      note: 'Everything a teacher needs to label the five learning zones.' },
    { id: 'center', name: 'Center kit', who: 'Whole buildings with several rooms', ch: 'zuri',
      parts: ['Zone sign set of 5, center', 'Character poster set of 4', 'Eat the Rainbow poster 24 x 36', 'Carpet 8 ft round'],
      extras: ['A Classroom kit for each extra room', 'Hallway welcome banner', 'Family photo wall for the entry'],
      note: 'Priced per building. The character carpet is made to order and is meant for preschool rooms.' }
  ];
  const kitParts = k => k.parts.map(cat).filter(Boolean);
  // Release-manifest asset each product is made from (E1: every priced item says what is delivered today, when it starts, how it bills).
  const assetOf = name => /carpet/i.test(name) ? 'carpet' : /zone sign/i.test(name) ? 'zone-signs' : /poster/i.test(name) ? 'posters' : /sticker/i.test(name) ? 'activity-book-stickers'
    : /storybook/i.test(name) ? 'book-1' : /welcome kit/i.test(name) ? 'family-welcome-kit' : /plush/i.test(name) ? 'plush' : 'merch-pod';
  const skuTerms = names => window.FFRelease ? window.FFRelease.terms('store', names.map(n => [n, assetOf(n)]), { compact: true }) : '';
  const kitSum = k => kitParts(k).reduce((a, c) => a + c.wholesale, 0);

  // Program supplies: every priced catalog line, with when it can be ordered.
  const SUPPLY_STATUS = {
    'Character poster 18 x 24, each': 'launch', 'Character poster set of 4': 'launch', 'Eat the Rainbow poster 24 x 36': 'launch',
    'Zone sign 12 x 18, each': 'launch', 'Zone sign set of 5, center': 'launch', 'Zone sign set of 5, home (9 x 12)': 'launch',
    'Staff tee, screen printed': 'launch', 'Kids tee, screen printed': 'launch', 'Badge and breakaway lanyard': 'launch',
    'Achievement cards, pack of 25': 'phase2', 'Rainbow at Home fridge pages, pack of 25': 'phase2', 'Curriculum binder, replacement': 'phase2',
    'Storybook, each': 'phase2', 'Storybook set of 5': 'phase2', 'Eat the Rainbow cookbook': 'phase2', 'Activity and coloring book': 'phase2',
    'Sticker set (4 die-cut)': 'phase2', 'Carpet 8 ft round': 'phase2', 'Carpet 6 x 9 ft': 'phase2'
  };
  const supplyStatus = item => SUPPLY_STATUS[item] || 'later';

  // Corner system. src: canon = curriculum and training (FF-102); bible = series bible location; proposed = new, owner to approve.
  const CORNERS = [
    { key: 'reading', name: "Booker's Reading Area", chars: ['booker'], pillar: 'LEARN', src: 'canon',
      does: 'Read, listen, retell, write, play with letters and puppets.',
      kit: ['Zone sign', 'Booker poster', 'Book Helper chart', 'Name cards with photos'],
      ages: ['Infants: a basket of board and cloth books on a soft mat', 'Toddlers: a few books face-out on a low shelf', 'Pre-K: retelling props, a writing tray and letter play'] },
    { key: 'calm', name: "Lumi's Calm Corner", chars: ['lumi'], pillar: 'BELONG + RESET', src: 'canon',
      does: 'Calm down, name feelings, rest, hold a plush friend, look at family photos.',
      kit: ['Zone sign', 'Lumi poster', 'Feelings chart', 'My Calm Plan cards'],
      ages: ['Always a choice, never a time-out', 'Under 3: a grown-up stays close by', 'Keep it in clear sight of every adult'] },
    { key: 'discovery', name: "Zuri's Discovery Zone", chars: ['zuri'], pillar: 'EXPLORE', src: 'canon',
      does: 'Sensory bins, magnifiers, sorting, measuring and building with blocks.',
      kit: ['Zone sign', 'Zuri poster', 'Notice, Predict, Try, Compare card', 'Scientist Sheets'],
      ages: ['Rooms with 2s: no choking-size pieces', 'Toddlers: big pieces, water and sand play', 'Pre-K: measuring, counting and simple tests'] },
    { key: 'movement', name: "Bop's Movement Zone", chars: ['bop'], pillar: 'MOVE + OUTSIDE', src: 'canon',
      does: 'Dance, balance, climb, music, dramatic play and gross-motor games.',
      kit: ['Zone sign', 'Bop poster', 'Ready? Bop & Go! floor spots', 'Daily 5 movement card'],
      ages: ['Infants: floor time and tummy time', 'Every move has an adapted version', 'Movement is never taken away as a punishment'] },
    { key: 'rainbow', name: 'Eat the Rainbow wall', chars: ['zuri', 'bop'], pillar: 'NOURISH', src: 'canon',
      does: 'Family-style meals and food talk. The teacher adds a food picture to a band for each food the class meets. Nothing is earned or counted for eating.',
      kit: ['Six colour bands: Red Rockets, Orange Sunshine, Yellow Sunbeams, Green Sprouts, Purple Pals, Cozy Clouds', 'Eat the Rainbow poster 24 x 36', 'Removable food pictures'],
      ages: ['Food is never a reward or a punishment', 'Talk about colours and tastes, not "good" and "bad" food', 'Hang it in the dining area'] },
    { key: 'carpet', name: 'Friends Carpet', chars: ['booker', 'lumi', 'zuri', 'bop'], pillar: 'All four friends', src: 'bible',
      does: 'Circle time, the daily story and the hello song, with one spot for every child.',
      kit: ['Character carpet (made to order)', 'Spot markers'],
      ages: ['Low pile, flat edges and a non-skid back', 'Missouri infant and toddler rooms: a washable rug laundered daily, not carpet', 'Pre-K: children lead the hello song'] },
    { key: 'art', name: 'Art Station', chars: ['lumi', 'bop'], pillar: 'Friend to be chosen', src: 'bible',
      does: 'Drawing, painting, collage and making cards to take home.',
      kit: ['Zone sign', 'Art shelf labels'],
      ages: ['Toddlers: chunky crayons and large paper', 'Under 3: no small loose pieces', 'Pre-K: open materials and drying space'] },
    { key: 'family', name: 'Family Photo Wall', chars: ['lumi'], pillar: 'BELONG', src: 'bible',
      does: 'Every family visible: photos, home languages and a hello in each child\'s language.',
      kit: ['Family photo wall header', 'Hello in Our Languages poster'],
      ages: ['Photos only with written family consent', 'Hang photos at child eye level', 'Works in a hallway or by the cubbies'] },
    { key: 'door', name: 'Welcome door', chars: ['booker', 'lumi', 'zuri', 'bop'], pillar: 'All four friends', src: 'proposed',
      does: 'A door sign that tells families which room and which friends they are walking into.',
      kit: ['Welcome door sign', 'Room name card'],
      ages: ['Keep exits and required postings clear', 'Removable vinyl for shared church rooms', 'One per room'] }
  ];
  const SRC = { canon: ['Curriculum zone', 'ok'], bible: ['From the series world', 'warn'], proposed: ['Proposed', 'bad'] };

  // ------------------------------------------------------------ request list (separate from the legacy st.cart)
  if (!st.shop) st.shop = {};
  const ALL = () => FAMILY.map(f => [f.sku, f.name]).concat(KITS.map(k => ['FF-KIT-' + k.id.toUpperCase(), k.name]),
    (D.catalog || []).map((c, i) => ['FF-CAT-' + i, c.item]));
  const nameOf = sku => (ALL().find(a => a[0] === sku) || [, sku])[1];
  const lines = () => Object.entries(st.shop).filter(([, q]) => q > 0);
  const listText = () => { const l = lines(); return l.length ? 'Order request (not an order yet):\n' + l.map(([s, q]) => `${q} x ${nameOf(s)}`).join('\n') : ''; };
  const qty = (sku, label) => `<label class="fs-qty"><span>Qty</span><input class="i" type="number" min="0" max="999" inputmode="numeric" id="sq-${esc(sku)}" data-sq="${esc(sku)}" value="${st.shop[sku] || ''}" aria-label="Quantity of ${esc(label)}"></label>`;
  const priceLine = (c, who) => !c ? '<span class="fs-price muted">Price coming soon</span>'
    : who === 'family' ? (c.retail ? `<span class="fs-price">${money(c.retail)}</span>` : '<span class="fs-price muted">Price coming soon</span>')
    : `<span class="fs-price">${money(c.wholesale)} <small>member</small></span>${c.retail ? `<span class="small muted">${money(c.retail)} retail</span>` : ''}`;

  const openSoon = who => `<div class="fs-soon" role="note"><b>Ordering opens soon.</b><p class="small">Online payment is not set up yet, so nothing is charged and no order is placed here. ${who === 'family' ? 'Build a wish list and ask us to tell you when the family shop opens.' : 'Build a list and send it as a quote request. A real person will confirm prices, shipping and timing.'}</p></div>`;
  function panel(who) {
    const l = lines();
    const rows = l.map(([s, q]) => `<li><span>${esc(nameOf(s))}</span><b>× ${q}</b></li>`).join('');
    return `<aside class="card fs-panel" aria-labelledby="fsListH"><h3 id="fsListH">${who === 'family' ? 'Your wish list' : 'Your request list'}</h3>
      ${l.length ? `<ul class="fs-lines">${rows}</ul>` : '<p class="small muted">Add quantities to build a list.</p>'}
      ${openSoon(who)}
      <div class="fs-acts">${who === 'family'
        ? `<button class="btn gold" data-go="store-request" data-store-req="list">Tell me when it opens</button>`
        : `<button class="btn gold" data-go="store-request" data-store-req="order">Request a quote for this list</button>`}
      ${l.length ? '<button class="btn soft" type="button" data-store-clear>Clear list</button>' : ''}</div></aside>`;
  }

  const tile = (ch, label) => `<div class="fs-tile" style="--c:var(--${ch});--s:var(--${ch}-s)"><img src="${img(ch)}" alt="" loading="lazy" decoding="async" width="120" height="150"><span>${esc(label || 'Product photo coming soon')}</span></div>`;

  // ------------------------------------------------------------ views
  V.store = () => phero('Futures Store', 'Shop for families. Kits for classrooms.', 'Character goods for families, and Classroom Branding Kits that help centers, home daycares and church programs name their learning corners. Ordering opens soon.', { chars: ['bop', 'lumi'] }) + `
<section class="band-paper"><div class="wrap">
 <div class="fs-doors">
  <article class="fs-door" style="--c:var(--lumi);--s:var(--lumi-s)"><img src="${img('lumi')}" alt="" width="150" height="190" loading="lazy" decoding="async"><div><span class="eyebrow">For families</span><h2>The family shop</h2><p>Tees, a library book tote and character posters first. Storybooks, plush and the Family Welcome Kit follow.</p><button class="btn gold" data-go="shop-families">Shop for families</button></div></article>
  <article class="fs-door" style="--c:var(--booker);--s:var(--booker-s)"><img src="${img('booker')}" alt="" width="150" height="190" loading="lazy" decoding="async"><div><span class="eyebrow">For programs</span><h2>Classroom Branding Kits</h2><p>Zone signs, posters, the Eat the Rainbow wall and the character carpet, at member prices for centers, home daycares and churches.</p><button class="btn gold" data-go="shop-programs">Shop for programs</button></div></article>
 </div>
 <div class="fs-cornerband"><div><span class="eyebrow">Name your corners</span><h2>Five learning zones, one friend in each</h2><p class="small">${CORNERS.filter(c => c.src === 'canon').map(c => esc(c.name)).join(', ')}. See what goes in each corner and which signs to hang.</p></div><button class="btn navy" data-go="corners">See the corner guide</button></div>
 ${openSoon('program')}
</div></section>`;

  V['shop-families'] = () => phero('For families', 'The family shop', 'Everyday things with Booker, Lumi, Zuri and Bop. Printed-to-order items open first, so nothing sits in a warehouse.', { chars: ['lumi', 'zuri'], crumb: ['store', 'Futures Store'] }) + `
<section class="band-paper"><div class="wrap"><div class="fs-layout"><div class="fs-grid">${FAMILY.map(f => { const c = f.cat ? cat(f.cat) : null; return `<article class="fs-item">${tile(f.ch)}<div class="fs-body"><div class="fs-top">${chip(f.status)}${priceLine(c, 'family')}</div><h3>${esc(f.name)}</h3><p class="small">${esc(f.note)}</p>${skuTerms([f.name])}${qty(f.sku, f.name)}</div></article>`; }).join('')}</div>
 ${panel('family')}</div>
 <p class="note fs-src">Prices shown come from the Futures Friends catalog (October 2026), before tax, are ${window.FFRelease ? esc(window.FFRelease.LABEL.toLowerCase()) : 'proposed, owner to confirm'} and may change before the shop opens. Items marked "Price coming soon" are not priced yet.</p>
</div></section>`;

  V['shop-programs'] = () => {
    const groups = [...new Set((D.catalog || []).map(c => c.group))];
    return phero('For programs', 'Classroom Branding Kits and program supplies', 'Member prices for Futures Friends centers, home daycares and church programs. Build a list and send it as a quote request.', { chars: ['booker', 'zuri'], crumb: ['store', 'Futures Store'], anchors: [['kits', 'Branding kits'], ['supplies', 'Program supplies'], ['who', 'Centers, homes and churches']] }) + `
<section class="band-paper" id="kits"><div class="wrap">${head('Classroom Branding Kits', 'Name your corners in three sizes', 'Each kit labels the five learning zones that the curriculum and staff training set up. <button class="rl" data-go="corners">See the corner guide</button>.')}
 <div class="fs-layout"><div class="fs-tiers">${KITS.map(k => { const sku = 'FF-KIT-' + k.id.toUpperCase(), parts = kitParts(k); return `<article class="fs-tier" style="--c:var(--${k.ch})"><div class="fs-tierhead"><h3>${esc(k.name)}</h3><span class="small muted">${esc(k.who)}</span></div>
   <ul class="small">${parts.map(c => `<li>${esc(c.item)} <span class="muted">${money(c.wholesale)}</span></li>`).join('')}${k.extras.map(x => `<li>${esc(x)} <span class="muted">price coming soon</span></li>`).join('')}</ul>
   <p class="small"><b>Priced catalog items in this kit: ${money(kitSum(k))} at member prices.</b> Full kit price coming soon.</p><p class="small muted">${esc(k.note)}</p>${skuTerms(k.parts)}${qty(sku, k.name)}</article>`; }).join('')}</div>
 ${panel('program')}</div></div></section>
<section id="supplies"><div class="wrap">${head('Program supplies', 'Everything in the catalog', 'Member prices for programs; retail is what a family pays. Items marked Next or Later cannot be ordered yet.')}
 <div class="fs-supplies">${groups.map(g => `<div><h3>${esc(g)}</h3><div class="tw"><table><tr><th>Item</th><th>When</th><th class="n">Member</th><th class="n">Retail</th><th class="n">Qty</th></tr>${(D.catalog || []).map((c, i) => c.group !== g ? '' : `<tr><td>${esc(c.item)}</td><td>${chip(supplyStatus(c.item))}</td><td class="n">${money(c.wholesale)}</td><td class="n">${c.retail ? money(c.retail) : '<span class="small muted">Programs only</span>'}</td><td class="n"><input class="i fs-qin" type="number" min="0" max="999" inputmode="numeric" id="sq-FF-CAT-${i}" data-sq="FF-CAT-${i}" value="${st.shop['FF-CAT-' + i] || ''}" aria-label="Quantity of ${esc(c.item)}"></td></tr>`).join('')}</table></div></div>`).join('')}</div>
 <p class="note fs-src">Prices come from the Futures Friends catalog reorder price list (October 2026), before tax, and are ${window.FFRelease ? esc(window.FFRelease.LABEL.toLowerCase()) : 'proposed, owner to confirm'}. Every line is a one-time order with no recurring billing; nothing ships or is charged before the item is made. Carpets are made to order; lead time is set in the rug maker's quote.</p></div></section>
<section class="band-paper" id="who"><div class="wrap"><div class="grid g3">
 <div class="card"><h3>Child care centers</h3><p class="small">A Classroom kit for each room, the Center kit for the building, and staff tees in batches.</p></div>
 <div class="card"><h3>Home daycares</h3><p class="small">The Home kit uses smaller 9 x 12 signs for portable zones that pack away when the living room is home again.</p></div>
 <div class="card"><h3>Churches</h3><p class="small">Shared Sunday rooms can use removable signs and a banner that come down after the program day.</p></div>
</div></div></section>`;
  };

  V.corners = () => phero('Name your corners', 'One friend in every learning corner', 'The same zone names children hear in the stories, the curriculum and staff training. Hang the sign, stock the corner, and children know where they are and what they do there.', { chars: ['booker', 'lumi', 'zuri', 'bop'], crumb: ['store', 'Futures Store'] }) + `
<section class="band-paper"><div class="wrap">${head('The corner guide', 'Five learning zones, plus a few places from the series', 'Curriculum zones are set up in every Futures Friends room. Places from the series world and proposed areas are optional and still being confirmed.')}
 <div class="fs-legend">${Object.values(SRC).map(s => `<span class="chip ${s[1]}">${s[0]}</span>`).join('')}</div>
 <div class="fs-corners">${CORNERS.map(c => `<article class="fs-corner" id="corner-${c.key}" style="--c:var(--${c.chars[0]});--s:var(--${c.chars[0]}-s)"><div class="fs-cornerart">${c.chars.map(k => `<img src="${img(k)}" alt="${CH[k].n}" width="96" height="120" loading="lazy" decoding="async">`).join('')}</div>
   <div class="fs-body"><div class="fs-top"><span class="chip ${SRC[c.src][1]}">${SRC[c.src][0]}</span><span class="tag">${esc(c.pillar)}</span></div><h3>${esc(c.name)}</h3><p class="small">${esc(c.does)}</p>
   <b class="small">In the kit</b><ul class="small">${c.kit.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
   <b class="small">Ages and safety</b><ul class="small">${c.ages.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div></article>`).join('')}</div>
 <p class="note fs-src">Signs and posters are not toys. Keep exits, sight lines and required postings clear, hang nothing from ceilings or doorways, and plan for wall art on no more than 20 percent of each wall unless your fire marshal allows more.</p>
 <div class="fs-acts"><button class="btn gold" data-go="shop-programs">See the Classroom Branding Kits</button><button class="btn soft" data-go="curriculum">How the curriculum uses the zones</button></div>
</div></section>`;

  V['store-request'] = () => {
    const list = st.storeReq === 'list';
    const preset = list
      ? { id: 'store-list', heading: 'Tell me when the family shop opens', interest: 'question', message: 'Please tell me when the Futures Friends family shop opens.\n' + listText(), what: 'shop sign-ups' }
      : { id: 'store-order', heading: 'Request a quote for this list', interest: 'quote', message: listText() || 'I would like a quote for a Classroom Branding Kit.', what: 'order and quote requests' };
    const form = window.FFIntake ? window.FFIntake.contactHtml(list ? 'contact' : 'quote', preset)
      : `<div class="card"><h3>${esc(preset.heading)}</h3><p class="small">Online requests are not available on this page right now. Please call <b>${PHONE}</b> or email <b>${EMAIL}</b>.</p></div>`;
    return phero('Futures Store', list ? 'Join the family shop list' : 'Request a quote', 'Ordering opens soon. Nothing is charged and no order is placed from this page.', { chars: ['zuri', 'lumi'], crumb: ['store', 'Futures Store'] }) + `
<section class="band-paper"><div class="wrap"><div class="grid g2" style="align-items:start">${form}
 <div class="card"><h3>Your list</h3>${lines().length ? `<ul class="fs-lines">${lines().map(([s, q]) => `<li><span>${esc(nameOf(s))}</span><b>× ${q}</b></li>`).join('')}</ul>` : '<p class="small muted">Your list is empty. You can still send a request.</p>'}<p class="small muted">Prices, shipping and timing are confirmed by a real person before anything is ordered.</p><button class="btn soft" data-go="${list ? 'shop-families' : 'shop-programs'}">Back to the list</button></div>
</div></div></section>`;
  };

  // ------------------------------------------------------------ events (the list lives in memory only; nothing is stored or sent here)
  document.addEventListener('click', e => {
    const r = e.target.closest && e.target.closest('[data-store-req]');
    if (r) st.storeReq = r.dataset.storeReq === 'list' ? 'list' : 'order';    // the data-go handler in views.js then renders the page
    if (e.target.closest && e.target.closest('[data-store-clear]')) { st.shop = {}; render(); }
  }, true);
  document.addEventListener('change', e => {
    const t = e.target;
    if (!t || !t.dataset || t.dataset.sq === undefined) return;
    const q = Math.min(999, Math.max(0, Math.floor(+t.value || 0)));
    if (q) st.shop[t.dataset.sq] = q; else delete st.shop[t.dataset.sq];
    render();
    const el = document.getElementById(t.id); if (el) el.focus();
  });

  window.FFStore = Object.freeze({ FAMILY, KITS, CORNERS, kitSum, listText, cat });
})();
