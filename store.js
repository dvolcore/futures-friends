/* Futures Store: the "Name your corners" guide (#corners) and the quote-request page (#store-request).
   The shop itself (home, collections, product pages, cart, checkout) lives in store-catalog.js, store-cart.js, store-checkout.js,
   store-shop.js, store-product.js and store-order.js (owner 2026-10-07). Loaded after views.js (uses V, D, esc, money, CH, img, phero, head).
   Honesty rules (docs/commerce/STORE_PLAN.md):
   - No payments are live. A request goes through window.FFIntake; with no intake url that request shows the site's honest
     "Online requests open soon" state. No URL is hardcoded here.
   - Corner names: the four character zones and the Eat the Rainbow wall are curriculum canon (Center Curriculum, training
     course FF-102). Areas named only in the series bible say so; anything new is marked "Proposed". */
(function () {
  'use strict';
  if (typeof V === 'undefined') return;
  const cat = name => (D.catalog || []).find(c => c.item === name) || null;
  // Corner system. src: canon = curriculum and training (FF-102); bible = series bible location; proposed = new, owner to approve.
  const CORNERS = [
    { key: 'reading', name: "Booker's Reading Area", chars: ['booker'], pillar: 'LEARN', src: 'canon',
      does: 'Read, listen, retell, write, play with letters and puppets.',
      kit: ['Zone sign', 'Booker poster', 'Book Helper chart', 'Name cards with photos'],
      ages: ['Twos: a basket of board books on a soft mat, a few face-out on a low shelf', 'Threes: books about feelings, friends and food', 'Pre-K: retelling props, a writing tray and letter play'] },
    { key: 'calm', name: "Lumi's Calm Corner", chars: ['lumi'], pillar: 'BELONG + RESET', src: 'canon',
      does: 'Calm down, name feelings, rest, hold a plush friend, look at family photos.',
      kit: ['Zone sign', 'Lumi poster', 'Feelings chart', 'My Calm Plan cards'],
      ages: ['Always a choice, never a time-out', 'Under 3: a grown-up stays close by', 'Keep it in clear sight of every adult'] },
    { key: 'discovery', name: "Zuri's Discovery Zone", chars: ['zuri'], pillar: 'EXPLORE', src: 'canon',
      does: 'Sensory bins, magnifiers, sorting, measuring and building with blocks.',
      kit: ['Zone sign', 'Zuri poster', 'Notice, Predict, Try, Compare card', 'Scientist Sheets'],
      ages: ['Rooms with 2s: no choking-size pieces', 'Threes: bigger builds, magnifiers and sorting', 'Pre-K: measuring, counting and simple tests'] },
    { key: 'movement', name: "Bop's Movement Zone", chars: ['bop'], pillar: 'MOVE + OUTSIDE', src: 'canon',
      does: 'Dance, balance, climb, music, dramatic play and gross-motor games.',
      kit: ['Zone sign', 'Bop poster', 'Ready? Bop & Go! floor spots', 'Daily 5 movement card'],
      ages: ['Twos: stomping, dancing and balance games', 'Every move has an adapted version', 'Movement is never taken away as a punishment'] },
    { key: 'rainbow', name: 'Eat the Rainbow wall', chars: ['zuri', 'bop'], pillar: 'NOURISH', src: 'canon',
      does: 'Family-style meals and food talk. The teacher adds a food picture to a band for each food the class meets. Nothing is earned or counted for eating.',
      kit: ['Six colour bands: Red Rockets, Orange Sunshine, Yellow Sunbeams, Green Sprouts, Purple Pals, Cozy Clouds', 'Eat the Rainbow poster 24 x 36', 'Removable food pictures'],
      ages: ['Food is never a reward or a punishment', 'Talk about colours and tastes, not "good" and "bad" food', 'Hang it in the dining area'] },
    { key: 'carpet', name: 'Friends Carpet', chars: ['booker', 'lumi', 'zuri', 'bop'], pillar: 'All four friends', src: 'bible',
      does: 'Circle time, the daily story and the hello song, with one spot for every child.',
      kit: ['Character carpet (made to order)', 'Spot markers'],
      ages: ['Low pile, flat edges and a non-skid back', 'Where your state requires it: a washable rug laundered daily, not carpet', 'Pre-K: children lead the hello song'] },
    { key: 'art', name: 'Art Station', chars: ['lumi', 'bop'], pillar: 'Friend to be chosen', src: 'bible',
      does: 'Drawing, painting, collage and making cards to take home.',
      kit: ['Zone sign', 'Art shelf labels'],
      ages: ['Twos: chunky crayons and large paper', 'Under 3: no small loose pieces', 'Pre-K: open materials and drying space'] },
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

  const lines = () => (window.FFCart ? window.FFCart.lines() : []);
  const listText = () => { const l = lines(); return l.length ? 'Order request (not an order yet):\n' + l.map(x => `${x.qty} x ${x.p.name}${x.label ? ' (' + x.label + ')' : ''}`).join('\n') : ''; };

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
      ? { id: 'store-list', heading: 'Tell me when the Kids\' Shop items open', interest: 'question', message: 'Please tell me when the Futures Friends Kids\' Shop items open.\n' + listText(), what: 'shop sign-ups' }
      : { id: 'store-order', heading: 'Request a quote', interest: 'quote', message: listText() || 'I would like a quote for the Futures Store.', what: 'order and quote requests' };
    const form = window.FFIntake ? window.FFIntake.contactHtml(list ? 'contact' : 'quote', preset)
      : `<div class="card"><h3>${esc(preset.heading)}</h3><p class="small">Online requests are not available on this page right now. Please call <b>${PHONE}</b> or email <b>${EMAIL}</b>.</p></div>`;
    return phero('Futures Store', list ? 'Tell me when it opens' : 'Request a quote', 'Nothing is charged and no order is placed from this page. A real person replies with a written price.', { chars: ['zuri', 'lumi'], crumb: ['store', 'Futures Store'] }) + `
<section class="band-paper"><div class="wrap"><div class="grid g2" style="align-items:start">${form}
 <div class="card"><h3>Your cart</h3>${lines().length ? `<ul class="fs-lines">${lines().map(l => `<li><span>${esc(l.p.name)}${l.label ? ' (' + esc(l.label) + ')' : ''}</span><b>\u00d7 ${l.qty}</b></li>`).join('')}</ul>` : '<p class="small muted">Your cart is empty. You can still send a request.</p>'}<p class="small muted">Prices, shipping and timing are confirmed by a real person before anything is ordered.</p><button class="btn soft" data-go="${lines().length ? 'cart' : 'store'}">${lines().length ? 'Back to the cart' : 'Back to the store'}</button></div>
</div></div></section>`;
  };

  document.addEventListener('click', e => {
    const r = e.target.closest && e.target.closest('[data-store-req]');
    if (r) st.storeReq = r.dataset.storeReq === 'list' ? 'list' : 'order';    // the data-go handler in views.js then renders the page
  }, true);

  window.FFStore = Object.freeze({ CORNERS, listText, cat });
})();
