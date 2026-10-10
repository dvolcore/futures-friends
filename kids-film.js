/* Futures Friends Kids' Shop: "The Wonder Store" film opening (owner's finished campaign film, mounted 2026-10-08).
   Source of record: the owner's premium-store prototype (README.md, MOTION-HANDOFF.md, layer-manifest.json). The film is his finished
   manual edit, re-encoded for the web only (video/kids-shop/wonder-store-film-{720,1080}.mp4 + poster webp/jpg); nothing in it is changed.
   Layers (all separate from the film): the blue glass billboard with the four chapter headlines (driven by the video's own clock:
   timeupdate/seeked, never a separate timer), previous/next chapter seek, play/pause, "Music off/on" opt-in, "Shop the moment"
   (three real catalog products per chapter) and a four-card spotlight that rotates every seven active seconds through the Kids' Shop.
   store-shop.js draws these in V['kids-shop'] when window.FFKidsFilm exists; the four-friend "Shop by friend" row sits directly under.
   Rules: the whole 16:9 frame is always shown (object-fit: contain over a blurred poster backing; the children are never cropped);
   product pictures are contained; the film starts muted and only plays sound after the visitor taps "Music on"; reduced motion or the
   site's motion switch = no autoplay (poster + play button); the film pauses while the tab is hidden, a dialog or the bag is open, or it
   is off screen. Sound kill switch (window.FF_SOUND_OFF, sound-switch.js, 2026-10-10): no Music button, always muted, no credit line
   (MUSIC stays defined so flipping the switch back restores both). The video is attached only when this route renders (none on any other page). Sends nothing, stores nothing. */
(function () {
'use strict';
if (typeof V === 'undefined' || !window.FFCatalog || !window.FFCart) return;
const W = window, D = W.document, C = W.FFCatalog, K = W.FFCart, E = K.E, imgTag = K.imgTag;
const rooms = () => K.rooms();
const FILM = 'video/kids-shop/wonder-store-film';
// the sound kill switch (sound-switch.js, owner 2026-10-10): no Music button, the film always muted, no music credit line
const SOUND_OFF = () => !!(typeof window !== 'undefined' && window.FF_SOUND_OFF);
const MUSIC = { title: 'Who Likes to Party', by: 'Kevin MacLeod', src: 'https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1200075', lic: 'https://creativecommons.org/licenses/by/4.0/' };

/* The film clock (MOTION-HANDOFF.md): storytime 0-12.666667, adventure -16.333333, creative packs -20.625, rainbow mealtime -26.875 s.
   Products are the site's real catalog ids; jump = the Kids' Shop section the chapter's button scrolls to. */
const CH = [
  { start: 0, end: 12.666667, kind: 'Storytime', kicker: 'The storytime edit', lines: ['Small gear.', 'Big wonder.'], text: 'Favorite friends. A story to share. Their kind of everyday magic.',
    cta: 'Find their next outfit', jump: 'kids-tshirts', items: [['booker-tshirt', 'The story tee'], ['lumi-hoodie', 'The cozy hoodie'], ['bottle-booker', 'The story bottle']] },
  { start: 12.666667, end: 16.333333, kind: 'Adventure', kicker: 'The adventure edit', lines: ['Big days.', 'Small packs.'], text: 'A little curiosity. A friend beside them. Wonder around every corner.',
    cta: 'Explore the backpacks', jump: 'kids-backpacks', items: [['booker-replica-backpack', 'Booker’s own backpack'], ['zuri-replica-backpack', 'The shell backpack'], ['zuri-tshirt', 'The explorer tee']] },
  { start: 16.333333, end: 20.625, kind: 'Create', kicker: 'The creative edit', lines: ['A whole world.', 'Made to create.'], text: 'Color, collect and imagine with friends from across the Futures Friends universe.',
    cta: 'Explore creative packs', jump: 'kids-stickers', items: [['stickers-universe', 'The universe stickers'], ['coloring-book-universe', 'The coloring pack'], ['poster-friends-circle-v1', 'The friends poster']] },
  { start: 20.625, end: 26.875, kind: 'Eat & sip', kicker: 'The rainbow edit', lines: ['Eat color.', 'Live color.'], text: 'A colorful plate. Their favorite bottle. Little discoveries at the table.',
    cta: 'Explore bottles & plates', jump: 'kids-drinkware', items: [['eat-the-rainbow-plate', 'The rainbow plate'], ['bottle-zuri', 'The explorer bottle'], ['bottle-bop', 'The rhythm bottle']] }
];
const SVG = (d, cls) => `<svg class="kf-ico${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">${d}</svg>`;
const I = {
  prev: SVG('<path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'),
  next: SVG('<path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'),
  play: SVG('<path d="M8 5.5v13l11-6.5z" fill="currentColor"/>'),
  pause: SVG('<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/>'),
  note: SVG('<path d="M9 18V6l10-2v12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6.5" cy="18" r="2.5" fill="currentColor"/><circle cx="16.5" cy="16" r="2.5" fill="currentColor"/>'),
  arrow: SVG('<path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>')
};
const pad = n => String(n).padStart(2, '0');
const pic = (p, sizes) => { const g = p && C.gallery(p, rooms())[0]; return g ? imgTag(g, { sizes, alt: '', cls: 'kf-img' }) : ''; };

// ------------------------------------------------------------------ markup (pure: also used by the prerender and the tests)
function titleHtml(c) { return c.lines.map((l, i) => `<span class="kf-line${i ? ' kf-accent' : ''}">${E(l)}</span>`).join(''); }
function chipsHtml(c) {
  return c.items.map(([id, label]) => { const p = C.product(id); if (!p) return '';
    return `<li><a class="kf-chip" href="#product/${E(id)}" data-go="product/${E(id)}"><span class="kf-chip-i">${pic(p, '72px')}</span><span class="kf-chip-t"><b>${E(label)}</b><small>${E(p.name)}</small></span><span class="kf-chip-go">${I.arrow}</span></a></li>`; }).join('');
}
function opening() {
  const c = CH[0];
  return `<section class="kf" data-kf aria-labelledby="kfH1">
  <div class="kf-back" aria-hidden="true"></div>
  <div class="kf-stage">
    <div class="kf-film" data-kf-film>
      <video class="kf-video" data-kf-video muted loop playsinline preload="none" poster="${FILM}-poster.webp" width="1920" height="1080" aria-label="The Wonder Store film: children at storytime, on an outdoor adventure, coloring and sticking, and at a rainbow mealtime, in Futures Friends gear"></video>
      <button type="button" class="kf-bigplay" data-kf-big aria-label="Play the film">${I.play}</button>
      ${SOUND_OFF() ? '' : `<button type="button" class="kf-music" data-kf-music aria-pressed="false">${I.note}<span>Music off</span></button>`}
    </div>
    <div class="kf-board">
      <h1 id="kfH1" class="kf-eyebrow"><span class="kf-dots" aria-hidden="true"><i></i><i></i><i></i><i></i></span>The Kids’ Shop</h1>
      <div class="kf-content" data-kf-content>
        <p class="kf-kicker" data-kf-kicker>${E(c.kicker)}</p>
        <p class="kf-title" data-kf-title>${titleHtml(c)}</p>
        <p class="kf-text" data-kf-text>${E(c.text)}</p>
      </div>
      <div class="kf-acts"><a class="btn gold sp-btn-lg kf-shop" href="#spResults" data-sp-scroll="spResults">Shop now ${I.arrow}</a><a class="btn sp-btn-glass kf-cta" href="#${c.jump}" data-sp-jump="${c.jump}" data-kf-cta>${E(c.cta)}</a></div>
      <div class="kf-ctl">
        <div class="kf-meta"><span data-kf-pos>01 / 04</span><span data-kf-kind>${E(c.kind)}</span></div>
        <div class="kf-prog" aria-hidden="true"><span data-kf-bar></span></div>
        <div class="kf-nav"><button type="button" class="kf-round" data-kf-prev aria-label="Previous film chapter">${I.prev}</button><button type="button" class="kf-play" data-kf-play aria-pressed="true">${I.play}<span>Play film</span></button><button type="button" class="kf-round" data-kf-next aria-label="Next film chapter">${I.next}</button></div>
      </div>
      <p class="kf-sr" role="status" data-kf-status></p>
    </div>
  </div>
</section>
<section class="kf-dock" aria-labelledby="kfDockH"><div class="wrap">
  <div class="kf-dock-in"><div class="kf-dock-h"><p class="kf-dock-k" data-kf-dockk>${E(c.kicker)}</p><h2 id="kfDockH">Shop the moment.</h2><button type="button" class="kf-dock-next" data-kf-next>Next chapter ${I.arrow}</button></div>
  <ul class="kf-chips" data-kf-chips aria-label="Products in this part of the film">${chipsHtml(c)}</ul></div>
  ${SOUND_OFF() ? '' : `<p class="kf-credit">Music: <a href="${MUSIC.src}" target="_blank" rel="noopener">“${E(MUSIC.title)}”</a> by ${E(MUSIC.by)} (incompetech.com), licensed under <a href="${MUSIC.lic}" target="_blank" rel="noopener license">CC BY 4.0</a>. Excerpted, normalized and faded.</p>`}
</div></section>`;
}

// the spotlight runs through every Kids' Shop item once (in the shop's own section order), four at a time
function pool() {
  const seen = new Set(), out = [];
  C.kidsSections().forEach(s => s[2].forEach(p => { if (p && !seen.has(p.id)) { seen.add(p.id); out.push([p, s[0]]); } }));
  return out;
}
function spotCards(page) {
  const all = pool(); if (!all.length) return '';
  return Array.from({ length: Math.min(4, all.length) }, (_, i) => all[(page * 4 + i) % all.length]).map(([p, sec]) =>
    `<li><a class="kf-sc" href="#product/${E(p.id)}" data-go="product/${E(p.id)}"><span class="kf-sc-i">${pic(p, '(max-width:700px) 44vw, 280px')}</span><small>${E(sec)}</small><b>${E(p.name)}</b></a></li>`).join('');
}
const sets = () => Math.max(1, Math.ceil(pool().length / 4));
function spotlight() {
  return `<section class="kf-spot" data-kf-spot aria-labelledby="kfSpotH"><div class="wrap">
  <div class="sp-sec-h kf-spot-h"><div><h2 id="kfSpotH">Meet their next favorite.</h2><p>A fresh four every seven seconds, from every friend.</p></div>
    <div class="kf-spot-ctl"><button type="button" class="kf-round kf-round-ink" data-kf-sprev aria-label="Previous four products">${I.prev}</button><button type="button" class="kf-spot-pause" data-kf-spause aria-pressed="false">Pause</button><button type="button" class="kf-round kf-round-ink" data-kf-snext aria-label="Next four products">${I.next}</button></div></div>
  <ul class="kf-spot-grid" data-kf-sgrid>${spotCards(0)}</ul>
  <div class="kf-spot-foot"><span class="kf-spot-pos" data-kf-spos>Set 1 of ${sets()}</span><span class="kf-spot-prog" aria-hidden="true"><span data-kf-sbar></span></span></div>
  <p class="kf-sr" role="status" data-kf-sstatus></p>
</div></section>`;
}

// ------------------------------------------------------------------ behaviour (browser only)
const reduced = () => { try { return W.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return false; } };
const motionOff = () => D.documentElement && D.documentElement.dataset && D.documentElement.dataset.motion === 'off';
const autoOk = () => !reduced() && !motionOff();
const dialogOpen = () => !!D.querySelector('dialog[open]') || !!(K.isOpen && K.isOpen());
// state that survives a same-route repaint (the store repaints once when its picture manifest arrives)
let S = fresh(), lastView = '', el = null, tick = 0, mo = null;
function fresh() { return { t: 0, music: false, userPaused: false, userPlay: false, chapter: -1, page: 0, secs: 0, grace: 0, spPaused: false, hover: false, focus: false, seen: true }; }

function pickSrc() {
  const cn = W.navigator && W.navigator.connection, slow = !!(cn && (cn.saveData || /(^|-)2g|3g/.test(cn.effectiveType || '')));
  const small = Math.min(W.innerWidth || 9999, (W.screen && W.screen.width) || 9999) < 760;
  return small || slow ? 'video/kids-shop/wonder-store-film-720.mp4' : 'video/kids-shop/wonder-store-film-1080.mp4';
}
function q(sel) { return el && (el.root.querySelector(sel) || D.querySelector(sel)); }
function renderChapter(i, announce) {
  const c = CH[i]; if (!c || !el) return; S.chapter = i;
  const set = (s, v) => { const n = q(s); if (n) n.textContent = v; };
  set('[data-kf-kicker]', c.kicker); set('[data-kf-text]', c.text); set('[data-kf-pos]', pad(i + 1) + ' / ' + pad(CH.length)); set('[data-kf-kind]', c.kind); set('[data-kf-dockk]', c.kicker);
  const t = q('[data-kf-title]'); if (t) t.innerHTML = titleHtml(c);
  const cta = q('[data-kf-cta]'); if (cta) { cta.textContent = c.cta; cta.setAttribute('href', '#' + c.jump); cta.setAttribute('data-sp-jump', c.jump); }
  const chips = q('[data-kf-chips]'); if (chips) chips.innerHTML = chipsHtml(c);
  const box = q('[data-kf-content]');
  if (box) { box.classList.remove('is-enter'); if (autoOk()) { void box.offsetWidth; box.classList.add('is-enter'); } }
  if (announce) set('[data-kf-status]', c.lines.join(' ') + ' ' + c.text);
}
function chapterAt(t) { for (let i = CH.length - 1; i >= 0; i--) if (t >= CH[i].start - 0.001) return i; return 0; }
function sync() {
  if (!el) return; const v = el.v, t = Number(v.currentTime) || 0, i = chapterAt(t);
  if (i !== S.chapter) renderChapter(i);
  const c = CH[i], bar = q('[data-kf-bar]'); if (bar) bar.style.transform = `scaleX(${Math.min(1, Math.max(0, (t - c.start) / (c.end - c.start))).toFixed(3)})`;
  if (t > 0) S.t = t;
}
function seekChapter(d) {
  if (!el) return; const i = ((S.chapter < 0 ? 0 : S.chapter) + d + CH.length) % CH.length, at = CH[i].start + 0.05;
  if (el.v.readyState >= 1) el.v.currentTime = at; else el.pending = at;
  S.t = at; renderChapter(i, true); sync();
}
function want() { return !!el && !D.hidden && !dialogOpen() && S.seen && !S.userPaused && (autoOk() || S.userPlay); }
function update() {
  if (!el) return; const v = el.v;
  if (want()) { if (v.paused) { const pr = v.play(); if (pr && pr.catch) pr.catch(() => { S.userPlay = false; paint(); }); } }
  else if (!v.paused) v.pause();
  paint();
}
function paint() {
  if (!el) return; const stopped = el.v.paused || !want();
  el.root.classList.toggle('is-paused', stopped);
  const b = q('[data-kf-play]'); if (b) { b.setAttribute('aria-pressed', String(stopped)); b.innerHTML = (stopped ? I.play : I.pause) + `<span>${stopped ? 'Play film' : 'Pause film'}</span>`; }
  const m = q('[data-kf-music]'); if (m) { const on = !el.v.muted; m.setAttribute('aria-pressed', String(on)); m.innerHTML = I.note + `<span>${on ? 'Music on' : 'Music off'}</span>`; }
}
function togglePlay() {
  if (!el) return;
  if (el.v.paused || !want()) { S.userPaused = false; S.userPlay = true; } else { S.userPaused = true; S.userPlay = false; }
  update();
}
function toggleMusic() {
  if (!el || SOUND_OFF()) return; S.music = el.v.muted; el.v.muted = !S.music;
  try { D.dispatchEvent(new CustomEvent('ff:duck')); } catch (_) { /* old browser */ }   // sound.js fades its nature beds while the film speaks
  paint();
}

// spotlight
function spRender(announce) {
  const sp = D.querySelector('[data-kf-spot]'); if (!sp) return; const n = sets();
  S.page = ((S.page % n) + n) % n; S.secs = 0;
  const g = sp.querySelector('[data-kf-sgrid]'); if (g) g.innerHTML = spotCards(S.page);
  const pos = sp.querySelector('[data-kf-spos]'); if (pos) pos.textContent = `Set ${S.page + 1} of ${n}`;
  if (announce) { const st = sp.querySelector('[data-kf-sstatus]'); if (st) st.textContent = 'Showing ' + [...sp.querySelectorAll('.kf-sc b')].map(b => b.textContent).join(', ') + '.'; }
  spPaint();
}
function spHeld() { return S.spPaused || S.hover || S.focus || S.grace > 0 || D.hidden || dialogOpen() || !autoOk(); }
function spPaint() {
  const sp = D.querySelector('[data-kf-spot]'); if (!sp) return;
  sp.classList.toggle('is-held', spHeld());
  const bar = sp.querySelector('[data-kf-sbar]'); if (bar) bar.style.transform = `scaleX(${(S.secs / 7).toFixed(3)})`;
  const p = sp.querySelector('[data-kf-spause]'); if (p) { p.setAttribute('aria-pressed', String(S.spPaused)); p.textContent = S.spPaused ? 'Play' : 'Pause'; }
}
function onTick() {
  if (!D.querySelector('[data-kf]')) return;
  if (!D.hidden && !dialogOpen()) { if (S.grace > 0) S.grace--; if (!spHeld() && ++S.secs >= 7) { S.page++; spRender(false); } }
  spPaint(); update();
}

function init(root) {
  const sec = root && root.querySelector && root.querySelector('[data-kf]'); if (!sec) { el = null; return; }
  const v = sec.querySelector('[data-kf-video]'); if (!v) return;
  el = { root: sec, v, pending: S.t > 0 ? S.t : 0 };
  if (SOUND_OFF()) S.music = false;
  v.muted = !S.music; v.defaultMuted = true;
  v.setAttribute('preload', 'metadata');
  v.innerHTML = `<source src="${pickSrc()}" type="video/mp4">`;
  try { v.load(); } catch (_) { /* jsdom */ }
  const own = el;
  ['timeupdate', 'seeked'].forEach(n => v.addEventListener(n, () => { if (el === own) sync(); }));
  v.addEventListener('loadedmetadata', () => { if (el !== own) return; if (own.pending) { try { v.currentTime = own.pending; } catch (_) { /* not seekable yet */ } own.pending = 0; } sync(); update(); });
  ['play', 'pause', 'volumechange'].forEach(n => v.addEventListener(n, () => { if (el === own) paint(); }));
  v.addEventListener('error', () => { if (el !== own) return; S.userPaused = true; paint(); const s = q('[data-kf-status]'); if (s) s.textContent = 'The film could not load. Every product is still below.'; }, true);
  sec.addEventListener('click', e => {
    const t = e.target && e.target.closest ? e.target : null; if (!t) return;
    if (t.closest('[data-kf-prev]')) seekChapter(-1);
    else if (t.closest('[data-kf-next]')) seekChapter(1);
    else if (t.closest('[data-kf-play],[data-kf-big]')) togglePlay();
    else if (t.closest('[data-kf-music]')) toggleMusic();
  });
  const dock = sec.parentNode && sec.parentNode.querySelector('.kf-dock');
  if (dock) dock.addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-kf-next]')) seekChapter(1); });
  if (typeof IntersectionObserver === 'function') { const io = new IntersectionObserver(en => { if (el !== own) { io.disconnect(); return; } S.seen = en[en.length - 1].isIntersecting; update(); }, { threshold: 0.15 }); io.observe(sec); }
  S.chapter = -1; renderChapter(chapterAt(S.t)); sync();
  // the spotlight
  const sp = D.querySelector('[data-kf-spot]');
  if (sp) {
    sp.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { S.hover = true; spPaint(); } });
    sp.addEventListener('pointerleave', () => { S.hover = false; spPaint(); });
    sp.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') S.grace = 10; });
    sp.addEventListener('focusin', () => { S.focus = true; spPaint(); });
    sp.addEventListener('focusout', e => { S.focus = !!(e.relatedTarget && sp.contains(e.relatedTarget)); spPaint(); });
    sp.addEventListener('click', e => {
      const t = e.target && e.target.closest ? e.target : null; if (!t) return;
      if (t.closest('[data-kf-sprev]')) { S.grace = 10; S.page--; spRender(true); }
      else if (t.closest('[data-kf-snext]')) { S.grace = 10; S.page++; spRender(true); }
      else if (t.closest('[data-kf-spause]')) { S.spPaused = !S.spPaused; spPaint(); }
    });
    if (S.page) spRender(false); else spPaint();
  }
  update();
}

function wire() {
  if (tick) return;
  tick = W.setInterval(onTick, 1000);
  D.addEventListener('visibilitychange', () => { update(); spPaint(); });
  try { W.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => { S.userPlay = false; update(); spPaint(); }); } catch (_) { /* old Safari */ }
  if (typeof MutationObserver === 'function') {
    // the site's motion switch ([data-motion=off] on <html>) and any dialog opening or closing (quick view, menus, the gate)
    new MutationObserver(() => { if (motionOff()) S.userPlay = false; update(); spPaint(); }).observe(D.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
    mo = new MutationObserver(() => { if (el) { update(); spPaint(); } });
    mo.observe(D.body, { attributes: true, subtree: true, attributeFilter: ['open'] });
  }
}

(W.FFhooks = W.FFhooks || []).push(v => {
  if (v !== 'kids-shop') { if (el) { try { el.v.pause(); } catch (_) { /* gone */ } } el = null; lastView = v; return; }
  if (lastView !== 'kids-shop') S = fresh();      // a new visit starts muted at the beginning; a repaint keeps the place
  lastView = v;
  try { wire(); init(D.getElementById('view')); } catch (e) { if (W.console) console.warn(e); }
});

W.FFKidsFilm = { opening, spotlight, CH, MUSIC, FILM, chapterAt };
})();
