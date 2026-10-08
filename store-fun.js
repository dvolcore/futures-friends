/* Futures Friends Store: the fun layer (owner, 2026-10-07: "very high energy and fun ... the fidgets, widgets, motion graphics ... a place where people want to spend money").
   Built on the site's own motion kit (ff-motion.js) and plush art (img/plush/characters, felt textures). It decorates the pages store-shop.js and store-product.js render:
   - the hero: felt clouds, waving friends and sparkles that drift with the scroll; a felt ticker band under it
   - a bouncy "Shop by category" carousel with big picture tiles
   - "Shop by friend": each friend hops and says hello when you point at them
   - product cards that tilt toward the pointer, lift and sparkle; plush cards turn once around on hover
   - the 3D-style plush turn-around (drag, swipe, arrow keys or the dots: front, side, back, other side) on product pages and in the quick view
   - add to bag: a confetti burst in the friend's colours and a friend sticker that flies to the bag
   Every bit of motion asks FFMotion.allowed() first and stops under prefers-reduced-motion or the site's Decorative motion switch. Nothing here stores or sends anything.
   Product pictures are always object-fit: contain and are never cropped; mascots only move, rotate and scale uniformly. */
(function () {
'use strict';
const W = window, D = document;
if (!W.FFCatalog || !W.FFCart || !W.FFShopUI) return;
const C = W.FFCatalog, K = W.FFCart, U = W.FFShopUI, E = K.E, imgTag = K.imgTag;
const FRIENDS = ['booker', 'lumi', 'zuri', 'bop'];
const COLORS = { booker: ['#2F6FC0', '#7FB2EE', '#FFD34E'], lumi: ['#D9488B', '#F59DC4', '#FFD34E'], zuri: ['#2E9E57', '#8EDBA4', '#FFD34E'], bop: ['#8236AE', '#C48AE6', '#FFD34E'], gold: ['#E7A928', '#2F6FC0', '#D9488B', '#2E9E57', '#8236AE'] };
const allowed = () => !!(W.FFMotion ? W.FFMotion.allowed() : !(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches));
const fine = () => !!(W.matchMedia && W.matchMedia('(hover: hover) and (pointer: fine)').matches);
const mascot = (k, pose) => 'img/plush/characters/' + k + (pose ? '-' + pose : '') + '-480.webp';
const STORE_VIEWS = ['store', 'shop', 'shop-programs', 'kids-shop', 'product'];
const NAME = { booker: 'Booker', lumi: 'Lumi', zuri: 'Zuri', bop: 'Bop' };
const HELLO = { booker: 'I love to learn!', lumi: 'You belong here!', zuri: 'Let’s explore!', bop: 'Let’s move!' };

// ------------------------------------------------------------------ the 3D-style plush turn-around
/* Markup for a product's turn-around, or '' when it has no angle slices. Four frames: front, side, back, the other side (the side mirrored). */
function spin(p, where) {
  if (!p || !C.rotation) return '';
  const r = C.rotation(p); if (!r.length) return '';
  const imgs = r.map((g, i) => imgTag(g, { sizes: where === 'qv' ? '(max-width:760px) 70vw, 300px' : '(max-width:900px) 80vw, 360px', alt: i === 0 ? g.alt : '', cls: 'sf-spin-img' + (g.mirror ? ' is-mirror' : '') + (i === 0 ? ' is-on' : '') })).join('');
  const bg = r[0].bg && /^#[0-9a-f]{6}$/i.test(r[0].bg) ? ` style="--sfbg:${r[0].bg}"` : '';
  return `<div class="sf-spin sf-spin-${where}" data-sf-spin="${E(p.id)}" role="group" aria-label="Turn ${E(p.name)} around"${bg}>
    <div class="sf-spin-head"><b>Turn ${E(p.name.replace(/ plush$/i, ''))} around</b><span class="sf-spin-hint">Drag, swipe or use the arrow keys</span></div>
    <div class="sf-spin-stage" tabindex="0" role="img" aria-label="${E(p.name)}, front view. Drag left or right to turn it." data-sf-stage>${imgs}<span class="sf-spin-shadow" aria-hidden="true"></span></div>
    <div class="sf-spin-dots" role="group" aria-label="Choose a view">${r.map((g, i) => `<button type="button" class="sf-dot${i === 0 ? ' is-on' : ''}" data-sf-dot="${i}" aria-label="${E(g.label)} view" aria-pressed="${i === 0}"></button>`).join('')}</div></div>`;
}
const SPIN = new WeakMap();
function setFrame(root, i) {
  const st = SPIN.get(root); if (!st) return;
  const n = st.n; i = ((i % n) + n) % n; st.i = i;
  root.querySelectorAll('.sf-spin-img').forEach((im, k) => im.classList.toggle('is-on', k === i));
  root.querySelectorAll('.sf-dot').forEach((d, k) => { d.classList.toggle('is-on', k === i); d.setAttribute('aria-pressed', String(k === i)); });
  const stg = root.querySelector('[data-sf-stage]'), lab = ['front', 'side', 'back', 'other side'][i];
  if (stg) stg.setAttribute('aria-label', root.getAttribute('aria-label').replace('Turn ', '').replace(' around', '') + ', ' + lab + ' view. Drag left or right to turn it.');
}
function wireSpin(root) {
  if (SPIN.has(root)) return;
  const n = root.querySelectorAll('.sf-spin-img').length, stage = root.querySelector('[data-sf-stage]'); if (!stage || n < 2) return;
  const st = { n, i: 0, x: 0, acc: 0, drag: false, timer: 0 }; SPIN.set(root, st);
  const STEP = 64;   // pixels of drag per frame
  stage.addEventListener('pointerdown', e => { st.drag = true; st.x = e.clientX; st.acc = 0; root.classList.add('is-drag'); clearInterval(st.timer); try { stage.setPointerCapture(e.pointerId); } catch (_) { /* fine */ } });
  stage.addEventListener('pointermove', e => { if (!st.drag) return; st.acc += e.clientX - st.x; st.x = e.clientX; while (st.acc > STEP) { st.acc -= STEP; setFrame(root, st.i - 1); } while (st.acc < -STEP) { st.acc += STEP; setFrame(root, st.i + 1); } });
  const end = () => { st.drag = false; root.classList.remove('is-drag'); };
  stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end); stage.addEventListener('lostpointercapture', end);
  stage.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') { e.preventDefault(); setFrame(root, st.i - 1); } else if (e.key === 'ArrowRight') { e.preventDefault(); setFrame(root, st.i + 1); } });
  root.querySelectorAll('[data-sf-dot]').forEach(b => b.addEventListener('click', () => { clearInterval(st.timer); setFrame(root, +b.dataset.sfDot); }));
  // one slow turn the first time it scrolls into view, so people see that it moves
  if (allowed() && typeof IntersectionObserver === 'function') {
    const io = new IntersectionObserver(en => { if (!en[0].isIntersecting) return; io.disconnect(); let k = 0; st.timer = setInterval(() => { if (st.drag || ++k > 4) { clearInterval(st.timer); if (k > 4) setFrame(root, 0); return; } setFrame(root, k); }, 520); }, { threshold: 0.6 });
    io.observe(root);
  }
}
// plush cards turn once around when pointed at
function cardTurn(card) {
  const p = C.product(card.dataset.pid); if (!p || !allowed() || card._turning) return;
  const r = C.rotation(p); if (!r.length) return;
  const media = card.querySelector('.sp-media'); if (!media) return;
  let ov = media.querySelector('.sf-turn');
  if (!ov) { ov = D.createElement('span'); ov.className = 'sf-turn'; ov.setAttribute('aria-hidden', 'true'); ov.innerHTML = r.map((g, i) => imgTag(g, { sizes: '300px', alt: '', cls: 'sf-turn-img' + (g.mirror ? ' is-mirror' : '') })).join(''); media.appendChild(ov); }
  const fr = ov.children; card._turning = true; media.classList.add('is-turning');
  let k = 0; const step = () => { [...fr].forEach((f, i) => f.classList.toggle('is-on', i === k)); if (++k < fr.length && card.matches(':hover')) setTimeout(step, 260); else { setTimeout(() => { media.classList.remove('is-turning'); [...fr].forEach(f => f.classList.remove('is-on')); card._turning = false; }, 260); } };
  step();
}

// ------------------------------------------------------------------ add to bag: confetti and a friend sticker
function burst(from, tone) {
  if (!allowed() || !from || !from.getBoundingClientRect || !D.body.animate) return;
  const r = from.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, cols = COLORS[tone] || COLORS.gold;
  const layer = D.createElement('div'); layer.className = 'sf-confetti'; layer.setAttribute('aria-hidden', 'true'); D.body.appendChild(layer);
  let left = 0;
  for (let i = 0; i < 22; i++) {
    const s = D.createElement('i'); s.className = 'sf-bit sf-bit-' + (i % 4); s.style.cssText = `left:${cx}px;top:${cy}px;--c:${cols[i % cols.length]}`; layer.appendChild(s); left++;
    const a = (Math.PI * 2 * i) / 22 + Math.random() * 0.5, d = 70 + Math.random() * 110, dx = Math.cos(a) * d, dy = Math.sin(a) * d - 60;
    const an = s.animate([{ transform: 'translate(-50%,-50%) scale(.2) rotate(0)', opacity: 1 }, { transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(1) rotate(${Math.random() * 360}deg)`, opacity: 1, offset: 0.55 }, { transform: `translate(calc(-50% + ${dx * 1.15}px),calc(-50% + ${dy + 110}px)) scale(.7) rotate(${Math.random() * 540}deg)`, opacity: 0 }], { duration: 900 + Math.random() * 300, easing: 'cubic-bezier(.2,.7,.3,1)' });
    an.onfinish = () => { if (--left <= 0) layer.remove(); };
  }
  setTimeout(() => layer.remove(), 1700);
  // the friend's face flies to the bag button
  const bag = D.getElementById('spCartBtn'); if (!bag) return;
  const b = bag.getBoundingClientRect(), face = FRIENDS.includes(tone) ? tone : FRIENDS[Math.floor(Math.random() * 4)];
  const st = D.createElement('img'); st.className = 'sf-sticker'; st.alt = ''; st.src = mascot(face); st.width = 56; st.height = 56; st.setAttribute('aria-hidden', 'true');
  st.style.cssText = `left:${cx - 28}px;top:${cy - 28}px`; D.body.appendChild(st);
  const x1 = b.left + b.width / 2 - cx, y1 = b.top + b.height / 2 - cy;
  const an = st.animate([{ transform: 'translate(0,0) scale(.3) rotate(-14deg)', opacity: 0 }, { transform: 'translate(0,-46px) scale(1.15) rotate(8deg)', opacity: 1, offset: 0.22 }, { transform: `translate(${x1 * 0.6}px,${y1 * 0.5 - 60}px) scale(1) rotate(-6deg)`, opacity: 1, offset: 0.6 }, { transform: `translate(${x1}px,${y1}px) scale(.35) rotate(10deg)`, opacity: 0.9 }], { duration: 820, easing: 'cubic-bezier(.3,.8,.3,1)' });
  an.onfinish = an.oncancel = () => { st.remove(); if (b && bag.animate) bag.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.14) rotate(-4deg)' }, { transform: 'scale(1)' }], { duration: 360, easing: 'cubic-bezier(.34,1.56,.64,1)' }); };
}
if (K.addAnimated && !K._sfWrapped) {
  const orig = K.addAnimated; K._sfWrapped = true;
  K.addAnimated = function (pid, opts, qty, fromEl) {
    const r = orig.apply(this, arguments);
    if (r) { const p = C.product(pid); burst(fromEl && fromEl.getClientRects && fromEl.getClientRects().length ? fromEl : D.getElementById('spCartBtn'), p ? p.tone : 'gold'); }
    return r;
  };
}

// ------------------------------------------------------------------ decorations injected after each store render
function heroDeco() {
  const hero = D.querySelector('[data-sp-hero]'); if (!hero || hero.querySelector('.sf-deco')) return;
  const fam = hero.classList.contains('sp-hero2-families');
  const m = fam ? [['bop', 'waving', 'a'], ['lumi', 'hop', 'b'], ['zuri', '', 'c']] : [['booker', 'waving', 'a'], ['zuri', '', 'b'], ['lumi', 'waving', 'c']];
  const deco = D.createElement('div'); deco.className = 'sf-deco'; deco.setAttribute('aria-hidden', 'true');
  deco.innerHTML = '<span class="sf-cloud sf-cloud-1"></span><span class="sf-cloud sf-cloud-2"></span><span class="sf-cloud sf-cloud-3"></span>'
    + m.map(x => `<img class="sf-mascot sf-mascot-${x[2]}" src="${mascot(x[0], x[1])}" alt="" width="240" height="240" loading="eager" decoding="async" draggable="false">`).join('')
    + [1, 2, 3, 4, 5, 6, 7].map(i => `<i class="sf-star sf-star-${i}"></i>`).join('') + '<span class="sf-grass tx-ground"></span>';
  hero.appendChild(deco);
  hero.classList.add('has-fun');
}
function ticker() {
  const hero = D.querySelector('[data-sp-hero]'); if (!hero || D.querySelector('.sf-ticker')) return;
  const words = ['Learn', 'Move', 'Explore', 'Belong'], cls = ['booker', 'lumi', 'zuri', 'bop'];
  const run = () => words.map((w, i) => `<span class="sf-tk sf-tk-${cls[i]}">${w}.</span><i class="sf-tk-dot" aria-hidden="true"></i>`).join('');
  const t = D.createElement('div'); t.className = 'sf-ticker tx-felt'; t.setAttribute('role', 'presentation');
  t.innerHTML = `<div class="sf-tk-track" aria-hidden="true">${run().repeat(6)}</div><p class="sf-sr">Learn. Move. Explore. Belong.</p>`;
  hero.insertAdjacentElement('afterend', t);
}
function collectionsCarousel() {
  const rail = D.querySelector('.sp-rail'); if (!rail || D.querySelector('.sf-cols') || !D.querySelector('[data-sp-hero]')) return;
  const fam = !!D.querySelector('.sp-hero2-families');
  const ids = fam ? ['apparel', 'plush', 'stickers', 'drinkware', 'carpets', 'posters'] : ['kits', 'carpets', 'posters', 'plush', 'apparel', 'stickers', 'drinkware'];
  const tiles = ids.map(id => {
    const col = C.collection(id); if (!col) return '';
    const h = C.heroImage(id), n = C.inCollection(id).length, tone = FRIENDS.includes(col.tone) ? col.tone : 'booker';
    const room = !h && C.roomShot({ id: 'c', name: col.name, kind: 'kit', room: col.room || 'turtle-rug' }, U.rooms());
    const g = h || room;
    return `<li class="sf-col" style="--tone:var(--${tone});--tone-s:var(--${tone}-s)"><a href="#shop/${id}" data-go="shop/${id}"><span class="sf-col-i">${g ? imgTag(g, { sizes: '(max-width:700px) 70vw, 320px', alt: '', cls: 'sf-col-img' }) : ''}</span><span class="sf-col-t"><b>${E(col.name)}</b><small>${n} ${n === 1 ? 'thing' : 'things'}</small></span><span class="sf-col-go" aria-hidden="true">${K.ico('arrow')}</span></a></li>`;
  }).join('');
  const sec = D.createElement('section'); sec.className = 'sf-cols'; sec.setAttribute('aria-labelledby', 'sfColsH');
  sec.innerHTML = `<div class="wrap"><div class="sp-sec-h"><div><h2 id="sfColsH">Shop by category</h2><p>Swipe, drag or scroll sideways.</p></div></div></div><ul class="sf-col-row" tabindex="0" aria-label="Collections, scroll sideways for more">${tiles}</ul>`;
  rail.insertAdjacentElement('afterend', sec);
  // drag to scroll with the mouse
  const row = sec.querySelector('.sf-col-row'); let down = false, sx = 0, sl = 0, moved = false;
  row.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; moved = false; sx = e.clientX; sl = row.scrollLeft; });
  W.addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - sx; if (Math.abs(dx) > 5) { moved = true; row.classList.add('is-drag'); } row.scrollLeft = sl - dx; });
  W.addEventListener('pointerup', () => { down = false; row.classList.remove('is-drag'); });
  row.addEventListener('click', e => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
}
function friendBubbles() {
  D.querySelectorAll('.sp-friend:not(.sf-wired)').forEach(a => {
    a.classList.add('sf-wired');
    const k = (a.getAttribute('data-go') || '').replace('shop/friend-', ''); if (!HELLO[k]) return;
    const b = D.createElement('span'); b.className = 'sf-bubble'; b.setAttribute('aria-hidden', 'true'); b.textContent = 'Hi, I’m ' + NAME[k] + '! ' + HELLO[k];
    a.appendChild(b);
  });
  const fr = D.querySelector('.sp-friends'); if (fr) fr.classList.add('tx-cream');
}
// pointer tilt and sparkle for cards and friend tiles
let tiltEl = null, tiltRaf = 0;
function tiltMove(e) {
  if (!fine() || !allowed()) return;
  const el = e.target.closest && e.target.closest('.sp-card,.sp-friend,.sf-col a'); if (!el) return;
  const target = el.closest('.sp-cardwrap,.sf-col') ? el : el;
  tiltEl = target; if (tiltRaf) return;
  tiltRaf = requestAnimationFrame(() => {
    tiltRaf = 0; if (!tiltEl) return;
    const r = tiltEl.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    tiltEl.style.setProperty('--rx', ((0.5 - y) * 9).toFixed(2) + 'deg'); tiltEl.style.setProperty('--ry', ((x - 0.5) * 11).toFixed(2) + 'deg');
    tiltEl.style.setProperty('--gx', (x * 100).toFixed(1) + '%'); tiltEl.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
  });
}
function tiltLeave(e) {
  const el = e.target.closest && e.target.closest('.sp-card,.sp-friend,.sf-col a'); if (!el || (e.relatedTarget && el.contains(e.relatedTarget))) return;
  el.style.removeProperty('--rx'); el.style.removeProperty('--ry');
}
D.addEventListener('pointermove', tiltMove, { passive: true });
D.addEventListener('pointerout', tiltLeave, { passive: true });
D.addEventListener('mouseover', e => { const c = e.target.closest && e.target.closest('.sp-card[data-pid]'); if (c && !c.contains(e.relatedTarget)) cardTurn(c); });

// scroll-driven hero: the clouds, friends and the video card drift at different speeds
let scope = null;
function heroScroll() {
  if (scope) { scope.abort(); scope = null; }
  const hero = D.querySelector('[data-sp-hero]'); if (!hero || !W.FFMotion || !allowed()) return;
  scope = W.FFMotion.scope();
  scope.progress(hero, p => { hero.style.setProperty('--sy', p.toFixed(3)); });
}
function wireAll() { D.querySelectorAll('[data-sf-spin]').forEach(wireSpin); }
(W.FFhooks = W.FFhooks || []).push(v => {
  if (!STORE_VIEWS.includes(v)) return;
  if (v !== 'product') { heroDeco(); ticker(); collectionsCarousel(); friendBubbles(); heroScroll(); }
  wireAll();
});
// the quick view builds its body on demand
D.addEventListener('click', () => setTimeout(wireAll, 30), true);
// pictures that arrive after the page rendered (quick view, turn-around, drawer) blend into their frame as soon as they have painted
const ready = im => { if (im.classList) im.classList.add('is-ready'); };
function markImgs(root) {
  (root.matches && root.matches('img.sp-img') ? [root] : []).concat([...(root.querySelectorAll ? root.querySelectorAll('img.sp-img:not(.is-ready)') : [])]).forEach(im => { if (im.complete && im.naturalWidth) ready(im); else im.addEventListener('load', () => ready(im), { once: true }); });
}
if (typeof MutationObserver === 'function') new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) markImgs(n); }))).observe(D.body, { childList: true, subtree: true });
W.FFFun = { spin, burst, wireAll };
})();
