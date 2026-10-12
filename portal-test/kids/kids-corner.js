// The Kids' corner (owner request 2026-10-12, hub/KIDS_CORNER.md): the child's own learning space, opened from the PARENT's login.
//
//   /c/<slug>/kids?kid=<id>   family: a grown-up screen ("Ready for Mia's corner?"), then the child's space on the same device:
//                             pick your friend (first time; "Change my friend" any time), then five big picture doors:
//                               Watch      the library's friend videos, Today's video (kid-videos.js), "Coming soon" cards
//                               Read       the friends' storybooks, read together (the library's PDFs)
//                               Play       this week's move-along and skill checks (skill-checks-kid.js), the do-it-together cards
//                               My stickers   what the child finished this week (no count, no streak, no points, no leaderboard)
//                               Messages   parent-approved messages from the friend (charmsg-player.js)
//                             Leaving is the grown-up gate (hold 3 s + a sum), the browser's back button stays in the corner.
//   /c/<slug>/kids            staff: the engagement views (kids-insights.js): teachers their room, directors the center.
//
// REUSED, not rebuilt: the Kid Mode session (kid_mode_start / beat / end: the parent's own session for ONE child, consent re-checked on
// every call, minutes recorded as "time learning", no cap), the guide pick (kid_mode_pick_avatar, art and names from kid-mode.js),
// the week's activities and "I did it" (kid_mode_done), skill checks, Today's video, character messages, the felt sky (family-scene.js).
// NEW: kid_corner_home (one call for the whole space) and the engagement tracker (kids-corner-core.js -> kid_engagement_log), which
// records only while the parent's learning_insights consent is on.
// Rules kept: sound only inside the owner's videos (no speech synthesis, no sound effects); no autoplay, no loop, nothing plays after
// something else ends; no free text from the child; no ads, no third-party anything; calm motion only when the device allows it.
// Plain ES module, no build step; the strict CSP forbids inline styles, so sizes come from classes.

import { FRIENDS, KIDS, avatarHtml, guideFace, friendImg } from './kid-mode.js';
import { createTracker, deviceKind, kw, stickerDays, videoFinished } from './kids-corner-core.js';
import { sceneHtml, dayPart } from './family-scene.js';

const NAME = { booker: 'Booker', lumi: 'Lumi', zuri: 'Zuri', bop: 'Bop', nico: 'Nico', tilly: 'Tilly', poppy: 'Poppy', mimi: 'Mimi', tad: 'Tad',
  rory: 'Rory', nova: 'Nova', teo: 'Teo' };
// The corner's picker shows only characters with official approved art. Rory, Nova and Teo have none yet (no art in the repo, on the
// site or in the brand folder, 2026-10-12): they are left out here until the owner supplies it; nothing is drawn or generated.
// A child who picked one of them in Kid Mode keeps it (shown as Kid Mode shows it).
export const PICK_KIDS = KIDS.filter((k) => ['nico', 'tilly', 'poppy', 'mimi', 'tad'].includes(k));
const CUT = (f) => (FRIENDS.includes(f) ? `img/scene/cut-${f}-440.webp` : friendImg(f));
const DOORS = [['watch', 'booker'], ['read', 'lumi'], ['play', 'zuri'], ['stickers', 'bop'], ['messages', 'lumi']];
const ICON = {
  watch: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5" width="19" height="13" rx="3"/><path d="M10 9l5 2.5-5 2.5z" class="kc-ico-fill"/><path d="M8 21h8"/></svg>',
  read: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6.5C10 5 7 4.5 3 5v13c4-.5 7 0 9 1.5 2-1.5 5-2 9-1.5V5c-4-.5-7 0-9 1.5z"/><path d="M12 6.5v13"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="12" width="8" height="8" rx="2"/><rect x="13" y="12" width="8" height="8" rx="2"/><rect x="8" y="3.5" width="8" height="8" rx="2"/></svg>',
  stickers: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.7 5.6 6.1.8-4.5 4.2 1.2 6-5.5-3-5.5 3 1.2-6-4.5-4.2 6.1-.8z"/></svg>',
  messages: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/></svg>',
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.2 4.3 2.6.7-1.4 2.2-2.6 4.3-2.6 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z"/></svg>',
  sad: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><circle cx="9" cy="10" r="1.2" class="kc-ico-fill"/><circle cx="15" cy="10" r="1.2" class="kc-ico-fill"/><path d="M8.5 16.5c2-1.8 5-1.8 7 0"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  soon: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>',
};

export async function viewKidsCorner(ctx) {
  if (ctx.c.role !== 'family') return (await import('./kids-insights.js')).viewStaffInsights(ctx);
  return viewFamilyCorner(ctx);
}

// ===========================================================================================================================
// The grown-up's screen, then the child's space
// ===========================================================================================================================
async function viewFamilyCorner(ctx) {
  const { c, shell, page, rpc, esc, friendly, go, lang } = ctx;
  const A = kw(lang);
  page(shell(`<p class="loading">${esc(A.loading)}</p>`), A.cornerGeneric);
  let kids;
  try { kids = await rpc('kid_mode_kids', { p_center: c.center_id, p_room: null }); } catch (e) {
    return page(shell(`<div class="card"><p class="msg bad" role="alert">${esc(friendly(e))}</p></div>`), A.cornerGeneric);
  }
  if (!kids.length) return page(shell(`<div class="card"><h2>${esc(A.cornerGeneric)}</h2><p>—</p></div>`), A.cornerGeneric);
  const want = new URLSearchParams(location.search).get('kid');
  const cur = kids.find((k) => k.kid === want) || kids[0];
  let rec = null;
  if (cur.screen_ok) { try { rec = (await rpc('kid_engagement_child_summary', { p_center: c.center_id, p_kid: cur.kid, p_days: 7 }))?.recording; } catch (_) { rec = null; } }
  const reason = cur.screen_ok ? '' : cur.reason === 'no_consent' ? A.noConsent : cur.reason === 'under_age' ? A.underAge(lang === 'es' ? '3 años o más' : '3 and older') : A.noAge;
  const part = dayPart(new Date());
  page(shell(`<section class="kc-hand" id="kcHand" aria-labelledby="kcHandH">
      ${sceneHtml({ part })}
      <div class="kc-hand-card">
        ${kids.length > 1 ? `<nav class="kc-sibs" aria-label="${esc(A.otherKid)}">${kids.map((k) => `<a class="kc-sib" href="/c/${esc(c.slug)}/kids?kid=${encodeURIComponent(k.kid)}" data-nav${k.kid === cur.kid ? ' aria-current="page"' : ''}>
          ${avatarHtml(esc, k.avatar || { friend: 'bop', color: 'sky' }, 'km-av-s')}<span>${esc(k.label)}</span></a>`).join('')}</nav>` : ''}
        <div class="kc-hand-main">${avatarHtml(esc, cur.avatar || { friend: 'bop', color: 'sky' }, 'km-av-l')}
          <div><h2 id="kcHandH">${esc(A.handTitle(cur.label))}</h2><p>${esc(cur.screen_ok ? A.handSay(cur.label) : reason)}</p></div></div>
        ${cur.screen_ok ? `<p class="kc-rec ${rec ? 'kc-rec-on' : 'kc-rec-off'}" id="kcRec"><span class="kc-dot" aria-hidden="true"></span>${esc(rec ? A.recOn : A.recOff)}
          ${rec ? '' : ` <a href="/c/${esc(c.slug)}/privacy" data-nav>${esc(A.recTurnOn)}</a>`}</p>` : `<p class="kc-links"><a href="/c/${esc(c.slug)}/privacy" data-nav>${esc(A.privacy)}</a> · <a href="/c/${esc(c.slug)}/learn?kid=${encodeURIComponent(cur.kid)}" data-nav>${esc(A.learnAtHome)}</a></p>`}
        <div class="kc-hand-row">${cur.screen_ok ? `<button class="btn gold kc-start" type="button" id="kcStart">${esc(A.start(cur.label))}</button>` : ''}
          <a class="btn soft" href="/c/${esc(c.slug)}/home?kid=${encodeURIComponent(cur.kid)}" data-nav>${esc(A.back)}</a></div>
        <p class="kc-err" id="kcErr" role="alert" hidden></p>
      </div></section>`), A.corner(cur.label));
  document.getElementById('kcStart')?.addEventListener('click', async () => {
    let r;
    try { r = await rpc('kid_mode_start', { p_center: c.center_id, p_kid: cur.kid, p_place: 'home' }); } catch (e) {
      const n = document.getElementById('kcErr'); n.hidden = false; n.textContent = friendly(e); return;
    }
    runCorner(ctx, { kid: cur.kid, session: r.session, label: cur.label, avatar: cur.avatar });
  });
}

// ===========================================================================================================================
// The child's space
// ===========================================================================================================================
async function runCorner(ctx, { kid, session, label }) {
  const { c, rpc, esc, friendly, go, lang } = ctx;
  const main = document.getElementById('main');
  let cap = lang === 'es' ? 'es' : 'en';
  try {
    const kl = ((await rpc('kid_languages_list', { p_center: c.center_id })) || []).find((x) => x.kid === kid);
    if (kl?.captions && (kl.home_set || kl.captions !== 'en' || lang !== 'es')) cap = kl.captions;
  } catch (_) { /* the grown-up's language */ }
  let L = kw(cap === 'en' ? 'en' : 'es');
  const st = { home: null, guide: null, beat: null, idle: null, retry: null, lastTouch: Date.now(), ended: false, paused: false, trap: null,
    current: null, shelfArt: null, view: 'home' };
  let messages = null;   // the child's approved messages (loaded once)
  const device = deviceKind({ ua: navigator.userAgent, width: innerWidth, touch: navigator.maxTouchPoints || 0 });
  const tracker = createTracker({
    send: (events) => rpc('kid_engagement_log', { p_session: session, p_events: events, p_device: device }),
    captions: () => cap,
  });
  const exitTo = `/c/${c.slug}/home?kid=${encodeURIComponent(kid)}`;
  const tt = (o) => (cap !== 'en' && o?.title_es) || o?.title_en || o?.title || '';
  const nameOf = (f) => NAME[f] || 'Bop';

  // ---- the frame: the felt sky behind, the child's colour, the grown-up gate always reachable -------------------------------
  const show = (html, { sky = false } = {}) => {
    const g = st.guide || { friend: 'bop', color: 'sky' };
    main.innerHTML = `<div class="km kc kc-g-${esc(g.friend)} kc-c-${esc(g.color || 'sky')}${sky ? ' kc-sky' : ''}" id="kidMode" lang="${cap === 'en' ? 'en' : 'es'}" translate="no">
      ${sky ? sceneHtml({ part: dayPart(new Date()) }) : ''}<div class="kc-in">${html}</div></div>`;
    document.body.classList.add('kidmode', 'kc-body');
    document.title = `${L.corner(label)} · Futures Hub`;
    main.querySelector('#kmGate')?.addEventListener('click', gate);
    main.focus({ preventScroll: true }); window.scrollTo(0, 0);
  };
  const topBar = (title, { back = true, avatar = true } = {}) => `<header class="km-top kc-top">
      ${back ? `<button class="kc-home" type="button" id="kcBack" aria-label="${esc(L.home)}">${ICON.back}<span>${esc(L.home)}</span></button>` : ''}
      ${avatar ? `<button class="kc-me" type="button" id="kcMe" aria-label="${esc(L.change)}">${avatarHtml(esc, st.guide, 'km-av-s')}</button>` : ''}
      <h1 class="km-title kc-title">${title}</h1>
      <button class="km-grown" type="button" id="kmGate">${esc(L.grownUps)}</button></header>`;
  const bindTop = () => {
    main.querySelector('#kcBack')?.addEventListener('click', () => { closeCurrent(); home(); });
    main.querySelector('#kcMe')?.addEventListener('click', () => { closeCurrent(); pick(); });
  };
  function closeCurrent(opts) { if (st.current) { st.current.close(opts); st.current = null; } }

  // the browser's back button stays in the corner: leaving is the grown-up gate's job
  history.pushState({ kidmode: true }, '', location.href);
  window.FFKidModeLock = true;
  st.trap = () => { history.pushState({ kidmode: true }, '', location.href); gate(); };
  window.addEventListener('popstate', st.trap, true);
  const touch = () => { st.lastTouch = Date.now(); st.current?.pulse(); };
  main.addEventListener('pointerdown', touch, { passive: true });
  main.addEventListener('keydown', touch, { passive: true });
  const vis = () => tracker.setHidden(document.hidden);
  document.addEventListener('visibilitychange', vis);
  const flushOnHide = () => { tracker.closeAll(); tracker.flush(); };
  window.addEventListener('pagehide', flushOnHide);

  // minutes: the server records them (kid_mode_beat; information for the grown-ups, never a limit); the tracker sends its batch with the beat
  st.beat = setInterval(async () => {
    if (document.hidden || st.ended || st.paused) return;
    tracker.flush();
    try { const r = await rpc('kid_mode_beat', { p_session: session }); if (r.ended) ended('idle'); }
    catch (err) { if (isOffline(err)) pause(); else ended('end'); }
  }, 30000);
  st.idle = setInterval(() => {   // rests after 5 minutes without a touch (a playing video keeps it awake)
    if (!st.ended && !st.paused && Date.now() - st.lastTouch > 5 * 60000) { closeCurrent(); tracker.flush(); rpc('kid_mode_end', { p_session: session, p_reason: 'idle' }).catch(() => {}); ended('idle'); }
  }, 15000);
  window.addEventListener('offline', goneOffline);

  function isOffline(err) {
    const code = String(err?.code || '');
    return !navigator.onLine || !/^[0-9A-Z]{5}$/.test(code) || /^(57|08|53|40)/.test(code) || code === '55P03';
  }
  function goneOffline() { if (!st.ended) pause(); }
  function pause() {
    if (st.paused || st.ended) return;
    st.paused = true; closeCurrent();
    show(`<div class="km-panel km-bye km-pause kc-panel" role="status">${avatarHtml(esc, st.guide, 'km-av-xl')}<h1 class="km-title">${esc(L.pauseT)}</h1>
      <p class="km-say">${esc(L.pauseSay(nameOf(st.guide?.friend)))}</p><button class="km-grown km-grown-big" type="button" id="kmGate">${esc(L.grownUps)}</button></div>`);
    clearInterval(st.retry);
    st.retry = setInterval(async () => {
      if (!navigator.onLine) return;
      let r;
      try { r = await rpc('kid_mode_beat', { p_session: session }); } catch (err) { if (!isOffline(err)) { clearInterval(st.retry); st.paused = false; ended('end'); } return; }
      clearInterval(st.retry);
      if (r.ended) { st.paused = false; return ended('idle'); }
      show(`<div class="km-panel km-bye kc-panel" role="status">${avatarHtml(esc, st.guide, 'km-av-xl')}<h1 class="km-title">${esc(L.backT)}</h1>
        <div class="km-row"><button class="km-btn km-btn-go" type="button" id="kcGoOn">${esc(L.backGo)}</button></div></div>`);
      main.querySelector('#kcGoOn').addEventListener('click', () => { st.paused = false; st.lastTouch = Date.now(); home(); });
    }, 10000);
  }
  function ended(reason) {
    if (st.ended) return;
    st.ended = true; closeCurrent(); tracker.flush();
    clearInterval(st.beat); clearInterval(st.idle); clearInterval(st.retry);
    show(`<div class="km-panel km-bye kc-panel">${avatarHtml(esc, st.guide, 'km-av-xl')}<p class="km-say">${esc(reason === 'end' ? L.bye : L.idle)}</p>
      <button class="km-grown km-grown-big" type="button" id="kmGate">${esc(L.grownUps)}</button></div>`);
  }
  function leave() {
    clearInterval(st.beat); clearInterval(st.idle); clearInterval(st.retry);
    window.removeEventListener('popstate', st.trap, true); window.removeEventListener('offline', goneOffline);
    window.removeEventListener('pagehide', flushOnHide); document.removeEventListener('visibilitychange', vis);
    window.FFKidModeLock = false;
    document.body.classList.remove('kidmode', 'kc-body');
    go(exitTo);
  }

  // ---- load the space ---------------------------------------------------------------------------------------------------------
  show(`<p class="km-loading">${esc(L.loading)}</p>`);
  async function load() {
    st.home = await rpc('kid_corner_home', { p_session: session });
    st.guide = st.home.guide || st.guide || { friend: 'bop', color: 'sky', outfit: 'classic', badge: 'none' };
    if (st.home.ended) ended('end');
    return st.home;
  }
  try { await load(); } catch (e) { return show(`<div class="km-panel kc-panel"><p class="km-note" role="alert">${esc(friendly(e))}</p><button class="km-grown km-grown-big" type="button" id="kmGate">${esc(L.grownUps)}</button></div>`); }
  // titles and covers of the library items (the library server; only what this guardian may open here)
  async function shelfArt() {
    if (st.shelfArt) return st.shelfArt;
    try {
      const s = await ctx.session();
      const r = await fetch('/api/library/kids-shelf', { headers: { Authorization: `Bearer ${s?.access_token || ''}`, 'X-Center': c.center_id }, cache: 'no-store' });
      st.shelfArt = new Map(r.ok ? ((await r.json()).items || []).map((x) => [x.id, x]) : []);
    } catch (_) { st.shelfArt = new Map(); }
    return st.shelfArt;
  }
  async function openLibrary(item) {
    const s = await ctx.session();
    const r = await fetch('/api/library/kids-open', { method: 'POST', headers: { Authorization: `Bearer ${s?.access_token || ''}`, 'X-Center': c.center_id, 'Content-Type': 'application/json' },
      body: JSON.stringify({ item }), cache: 'no-store' });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'not available');
    return r.json();
  }
  if (st.home.picked) home(true); else pick();

  // ---- pick your friend (the first time; "Change my friend" any time). Official art only: kid-mode.js friendImg / guideFace ---------
  function pick() {
    st.view = 'pick';
    const g = { ...st.guide };
    tracker.section('pick');
    show(`${topBar(esc(L.pickTitle), { back: !!st.home.picked, avatar: false })}<p class="km-sub kc-say">${esc(L.pickSay)}</p>
      <div class="km-pick kc-pick" id="kcPick" role="radiogroup" aria-label="${esc(L.pickTitle)}">${[['friends', FRIENDS, L.friends], ['kids', PICK_KIDS, L.kids]].map(([k, list, lab]) => `
        <section class="km-group" role="group" aria-labelledby="kcG-${k}"><h2 class="km-group-h" id="kcG-${k}">${esc(lab)}</h2>
        <div class="km-friends km-friends-${k}">${list.map((f) => `<button type="button" role="radio" aria-checked="${f === g.friend}" class="km-friend kc-friend${f === g.friend ? ' on' : ''}" data-friend="${f}">${guideFace(esc, f)}<span>${NAME[f]}</span></button>`).join('')}</div></section>`).join('')}</div>
      <div class="km-go kc-go"><div class="kc-preview" id="kcPrev">${avatarHtml(esc, g, 'km-av-l')}</div><button class="km-btn km-btn-go" type="button" id="kcGo">${esc(L.go)}</button></div>`);
    bindTop();
    main.querySelector('#kcPick').addEventListener('click', (e) => {
      const b = e.target.closest('.kc-friend'); if (!b) return;
      g.friend = b.dataset.friend; if (!FRIENDS.includes(g.friend)) g.outfit = 'classic';
      main.querySelectorAll('.kc-friend').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', String(x === b)); });
      main.querySelector('#kcPrev').innerHTML = avatarHtml(esc, g, 'km-av-l');
    });
    main.querySelector('#kcGo').addEventListener('click', async () => {
      try { st.guide = await rpc('kid_mode_pick_avatar', { p_session: session, p_friend: g.friend, p_color: g.color || 'sky', p_outfit: FRIENDS.includes(g.friend) ? (g.outfit || 'classic') : 'classic', p_badge: g.badge || 'none' }); }
      catch (err) { if (/ended|consent|not yours/.test(String(err.message))) return ended('end'); }
      tracker.picked(g.friend);
      st.home.picked = true;
      home(true);
    });
  }

  // ---- the home: the guide on the grass, five big doors ---------------------------------------------------------------------
  async function loadMessages() {
    if (messages) return messages;
    try { messages = ((await rpc('charmsg_for_child', { p_center: c.center_id, p_kid: kid }))?.messages) || []; } catch (_) { messages = []; }
    return messages;
  }
  async function home(greet = false) {
    st.view = 'home'; closeCurrent();
    const g = st.guide, f = nameOf(g.friend);
    await loadMessages();
    const hi = st.home.first_name ? L.hi(st.home.first_name, f) : L.hiNoName(f);
    const doors = DOORS;   // all five, always: Messages says "No messages right now" until a parent approves one
    show(`${topBar('', { back: false })}
      <section class="kc-stage" aria-labelledby="kcHi">
        <div class="kc-guide${greet ? ' kc-wave' : ''}"><img src="${esc(CUT(g.friend))}" alt="" decoding="async"></div>
        <div class="kc-bubble"><p id="kcHi" class="kc-hi">${esc(hi)}</p><p class="kc-ask">${esc(L.ask)}</p></div>
      </section>
      <div class="km-caps kc-caps" role="radiogroup" aria-label="${esc(L.captions)}">${[['en', L.capEn], ['es', L.capEs], ['both', L.capBoth]].map(([v, l]) => `<button type="button" role="radio" class="km-cap${cap === v ? ' on' : ''}" data-cap="${v}" aria-checked="${cap === v}">${esc(l)}</button>`).join('')}</div>
      <nav class="kc-doors" id="kcDoors" aria-label="${esc(L.ask)}">${doors.map(([k, fr]) => `<button type="button" class="kc-door kc-d-${k}" data-door="${k}">
          <span class="kc-door-ico">${ICON[k]}</span><img class="kc-door-art" src="${esc(CUT(k === 'messages' ? (FRIENDS.includes(g.friend) ? g.friend : fr) : fr))}" alt="" decoding="async">
          <span class="kc-door-t">${esc(L[k])}</span><span class="kc-door-s">${esc(L[`${k}Say`])}</span></button>`).join('')}</nav>`, { sky: true });
    main.querySelector('#kcMe').addEventListener('click', () => pick());
    main.querySelector('#kcDoors').addEventListener('click', (e) => { const b = e.target.closest('[data-door]'); if (b) section(b.dataset.door); });
    main.querySelector('.kc-caps').addEventListener('click', (e) => {
      const b = e.target.closest('[data-cap]'); if (!b || b.dataset.cap === cap) return;
      cap = b.dataset.cap; L = kw(cap === 'en' ? 'en' : 'es');
      rpc('kid_language_set', { p_center: c.center_id, p_kid: kid, p_captions: cap }).catch(() => null);
      home();
    });
  }

  function section(name) {
    tracker.section(name);
    if (name === 'watch') return watch();
    if (name === 'read') return read();
    if (name === 'play') return play();
    if (name === 'stickers') return stickers();
    if (name === 'messages') return messagesView();
    return home();
  }
  const card = (attrs, art, title, extra = '', cls = '') => `<li><button type="button" class="kc-card ${cls}" ${attrs}>
      <span class="kc-card-art">${art}</span><span class="kc-card-t">${title}</span>${extra}</button></li>`;
  const marks = (it) => `${it.finished ? `<span class="kc-mark kc-mark-done" aria-label="${esc(L.doneMark)}">${ICON.check}</span>` : ''}${it.liked === 'heart' ? `<span class="kc-mark kc-mark-heart" aria-hidden="true">${ICON.heart}</span>` : ''}`;

  // ---- Watch ------------------------------------------------------------------------------------------------------------------
  async function watch() {
    st.view = 'watch';
    const art = await shelfArt();
    const vids = st.home.shelf.filter((s) => s.kind === 'video' && art.has(s.library_item));
    const soon = st.home.shelf.filter((s) => s.kind === 'placeholder');
    let today = [];
    try { today = ((await rpc('kid_video_kid_mode', { p_session: session }))?.videos) || []; } catch (_) { today = []; }
    const tv = today.find((x) => x.state === 'ready') || today[0];
    show(`${topBar(esc(L.watch))}
      ${tv ? `<ul class="kc-grid kc-grid-today">${card(`data-today="${esc(tv.delivery_id)}" ${tv.state === 'ready' ? '' : 'data-soon="1"'}`, `<span class="kc-face">${guideFace(esc, tv.friend)}</span>`,
        esc(L.todayVideo(nameOf(tv.friend))), tv.state === 'ready' ? '' : `<span class="kc-soon">${ICON.soon}${esc(L.comingSoon)}</span>`, 'kc-card-today')}</ul>` : ''}
      <ul class="kc-grid" id="kcVideos">${vids.map((v) => card(`data-video="${esc(v.id)}"`,
        art.get(v.library_item)?.thumb_url ? `<img src="${esc(art.get(v.library_item).thumb_url)}" alt="" loading="lazy">` : `<span class="kc-face">${guideFace(esc, v.friend)}</span>`,
        esc(tt(v)), marks(v), `kc-f-${esc(v.friend)}`)).join('') || `<li><p class="km-note">${esc(L.noVideos)}</p></li>`}
        ${soon.map((p) => card(`data-placeholder="${esc(p.id)}"`, `<span class="kc-face">${guideFace(esc, p.friend)}</span>`, esc(tt(p)),
          `<span class="kc-soon">${ICON.soon}${esc(L.comingSoon)}</span>`, 'kc-card-soon')).join('')}</ul>`);
    bindTop();
    main.querySelector('.kc-in').addEventListener('click', (e) => {
      const b = e.target.closest('.kc-card'); if (!b) return;
      if (b.dataset.video) playVideo(st.home.shelf.find((s) => s.id === b.dataset.video));
      else if (b.dataset.placeholder) comingSoon(st.home.shelf.find((s) => s.id === b.dataset.placeholder));
      else if (b.dataset.today && !b.dataset.soon) playToday(tv);
      else if (b.dataset.today) comingSoon({ id: null, friend: tv.friend, title_en: tv.title_en, title_es: tv.title_es });
    });
  }
  function comingSoon(p) {
    if (p.id) { const h = tracker.item({ section: 'watch', item_type: 'placeholder', item_id: p.id }); h.close(); }
    show(`${topBar(esc(L.comingSoon))}<div class="km-panel kc-panel kc-soonview">${avatarHtml(esc, { ...st.guide, friend: p.friend, badge: 'none' }, 'km-av-xl')}
      <h2 class="km-h">${esc(tt(p))}</h2><p class="km-say">${esc(L.comingSoonSay(nameOf(p.friend)))}</p>
      <div class="km-row"><button class="km-btn km-btn-go" type="button" id="kcOk">${esc(L.watch)}</button></div></div>`);
    bindTop(); main.querySelector('#kcOk').addEventListener('click', () => watch());
  }
  // one player for library videos and Today's video: no autoplay, no loop, no "next"; the end shows the heart / sad question
  function playerView({ h, title, videoHtml, back, item }) {
    st.current = h;
    show(`${topBar(esc(title))}<div class="kc-player">${videoHtml}</div>
      <div class="kc-after" id="kcAfter" hidden>${likeHtml(item)}</div>`);
    bindTop();
    main.querySelector('#kcBack').replaceWith(main.querySelector('#kcBack').cloneNode(true));
    main.querySelector('#kcBack').addEventListener('click', () => { closeCurrent(); back(); });
    const v = main.querySelector('video');
    if (!v) return;
    try { for (const t of v.textTracks || []) t.mode = t.language === (cap === 'es' ? 'es' : 'en') || (v.textTracks.length === 1) ? 'showing' : 'disabled'; } catch (_) { /* no tracks */ }
    let lastFeed = 0;
    v.addEventListener('play', () => { h.start(); });
    v.addEventListener('timeupdate', () => {
      h.pulse();
      if (Date.now() - lastFeed > 20000) { lastFeed = Date.now(); st.lastTouch = Date.now(); }   // a playing clip is not idle
      if (!h.done && videoFinished(v.currentTime, v.duration)) h.complete();
    });
    v.addEventListener('ended', () => { h.complete(); main.querySelector('#kcAfter').hidden = false; });
    bindLike(h, item);
  }
  function likeHtml() {
    return `<p class="kc-like-q">${esc(L.like)}</p><div class="kc-like">
      <button type="button" class="kc-react kc-react-heart" data-react="heart">${ICON.heart}<span>${esc(L.yes)}</span></button>
      <button type="button" class="kc-react kc-react-sad" data-react="sad">${ICON.sad}<span>${esc(L.no)}</span></button></div>
      <p class="kc-thanks" id="kcThanks" role="status" hidden>${esc(L.thanks)}</p>`;
  }
  function bindLike(h, item) {
    main.querySelector('.kc-like')?.addEventListener('click', (e) => {
      const b = e.target.closest('[data-react]'); if (!b) return;
      h.react(b.dataset.react);
      if (item) item.liked = b.dataset.react;
      main.querySelectorAll('.kc-react').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      main.querySelector('#kcThanks').hidden = false;
    });
  }
  async function playVideo(v) {
    if (!v) return;
    const h = tracker.item({ section: 'watch', item_type: 'video', item_id: v.id });
    let o;
    try { o = await openLibrary(v.library_item); } catch (e) { h.close(); return watch(); }
    const tracks = Object.entries(o.captions || {}).map(([l, u]) => `<track kind="captions" srclang="${l}" label="${l === 'es' ? 'Español' : 'English'}" src="${esc(u)}"${l === (cap === 'es' ? 'es' : 'en') ? ' default' : ''}>`).join('');
    playerView({ h, title: tt(v), item: v, back: () => watch(),
      videoHtml: `<video class="kc-video" controls playsinline preload="metadata" src="${esc(o.url)}" aria-label="${esc(tt(v))}">${tracks}</video>` });
    v.finished = v.finished || false;
    main.querySelector('video')?.addEventListener('ended', () => { v.finished = true; });
  }
  async function playToday(tv) {
    const h = tracker.item({ section: 'watch', item_type: 'kid_video', item_id: tv.delivery_id });
    let play;
    try { play = await rpc('kid_video_play', { p_delivery: tv.delivery_id, p_context: 'kid_mode', p_session: session }); } catch (e) { h.close(); return watch(); }
    const kv = await import('./kid-videos.js');
    const urls = await kv.signFiles(ctx.client(), [play.video_path, play.captions_path, play.poster_path]);
    playerView({ h, title: L.todayVideo(nameOf(tv.friend)), item: null, back: () => watch(), videoHtml: kv.playerHtml(play, urls, { lang: cap === 'en' ? 'en' : 'es', esc }) });
  }

  // ---- Read: the Story Time books page by page (the website's pictures and words, English and Spanish DRAFT: kids-books.json from
  //      scripts/build-kids-books.mjs); a book without page data opens the library's PDF instead ------------------------------
  let booksData = null;
  async function kidsBooks() {
    if (booksData) return booksData;
    try { const r = await fetch('/kids-books.json', { cache: 'no-cache' }); booksData = r.ok ? ((await r.json()).books || {}) : {}; } catch (_) { booksData = {}; }
    return booksData;
  }
  const bookTitle = (b, kb) => (kb ? (cap !== 'en' && kb.title_es) || kb.title_en : tt(b));
  async function read() {
    st.view = 'read';
    const [art, kb] = await Promise.all([shelfArt(), kidsBooks()]);
    const books = st.home.shelf.filter((s) => s.kind === 'book' && (kb[s.id] || art.has(s.library_item)));
    const cover = (b) => (kb[b.id] ? `<img src="${esc(kb[b.id].cover)}" alt="" loading="lazy">` : art.get(b.library_item)?.thumb_url
      ? `<img src="${esc(art.get(b.library_item).thumb_url)}" alt="" loading="lazy">` : `<span class="kc-face">${guideFace(esc, b.friend)}</span>`);
    show(`${topBar(esc(L.read))}<p class="km-sub kc-say">${esc(L.readWith)}</p>
      <ul class="kc-grid kc-grid-books">${books.map((b) => card(`data-book="${esc(b.id)}"`, cover(b), esc(bookTitle(b, kb[b.id])), marks(b), `kc-book kc-f-${esc(b.friend)}`)).join('')
        || `<li><p class="km-note">${esc(L.noBooks)}</p></li>`}</ul>`);
    bindTop();
    main.querySelector('.kc-grid').addEventListener('click', (e) => { const b = e.target.closest('[data-book]'); if (b) openBook(st.home.shelf.find((s) => s.id === b.dataset.book)); });
  }
  async function openBook(b) {
    const kb = (await kidsBooks())[b.id];
    const h = tracker.item({ section: 'read', item_type: 'book', item_id: b.id });
    const after = () => `<div class="kc-after" id="kcAfter" hidden>${likeHtml()}</div>`;
    const backTo = () => { main.querySelector('#kcBack').replaceWith(main.querySelector('#kcBack').cloneNode(true)); main.querySelector('#kcBack').addEventListener('click', () => { closeCurrent(); read(); }); };
    if (kb) {
      st.current = h; h.start();
      let i = 0;
      const words = (pg) => (cap === 'es' && pg.es ? `<span lang="es">${esc(pg.es)}</span>`
        : cap === 'both' && pg.es ? `<span lang="es" class="km-cap1">${esc(pg.es)}</span><span lang="en" class="km-cap2">${esc(pg.en)}</span>` : `<span lang="en">${esc(pg.en)}</span>`);
      const page = () => {
        const pg = kb.pages[i], last = i === kb.pages.length - 1;
        main.querySelector('#kcPage').innerHTML = `<img class="kc-page-img" src="${esc(pg.img)}" alt="" decoding="async"><p class="kc-page-words">${words(pg)}</p>
          <p class="kc-page-n" aria-live="polite">${i + 1} / ${kb.pages.length}</p>`;
        main.querySelector('#kcPrev').disabled = i === 0;
        main.querySelector('#kcNext').hidden = last; main.querySelector('#kcEnd').hidden = !last || h.done;
      };
      show(`${topBar(esc(bookTitle(b, kb)))}<div class="kc-reader kc-pages"><div class="kc-page" id="kcPage"></div>
          <div class="kc-turn"><button class="km-btn soft kc-prev" type="button" id="kcPrev" aria-label="${esc(L.prevPage)}">${ICON.back}</button>
          <button class="km-btn km-btn-go kc-next" type="button" id="kcNext" aria-label="${esc(L.nextPage)}">${ICON.back}</button>
          <button class="km-btn km-btn-go" type="button" id="kcEnd" hidden>${esc(L.theEnd)}</button></div>
          ${cap !== 'en' ? `<p class="kc-draft">${esc(L.draftEs)}</p>` : ''}</div>${after()}`);
      bindTop(); backTo();
      main.querySelector('#kcPrev').addEventListener('click', () => { if (i > 0) { i -= 1; h.pulse(); page(); } });
      main.querySelector('#kcNext').addEventListener('click', () => { if (i < kb.pages.length - 1) { i += 1; h.pulse(); page(); } });
      main.querySelector('#kcEnd').addEventListener('click', () => { h.complete(); b.finished = true; main.querySelector('#kcAfter').hidden = false; main.querySelector('#kcEnd').hidden = true; });
      bindLike(h, b);
      page();
      return;
    }
    let o;
    try { o = await openLibrary(b.library_item); } catch (e) { h.close(); return read(); }
    st.current = h; h.start();
    show(`${topBar(esc(tt(b)))}<div class="kc-reader"><iframe src="${esc(o.url)}#view=FitH" title="${esc(tt(b))}"></iframe></div>
      <div class="kc-book-row"><button class="km-btn km-btn-go" type="button" id="kcEnd">${esc(L.theEnd)}</button></div>${after()}`);
    bindTop(); backTo();
    main.querySelector('#kcEnd').addEventListener('click', () => { h.complete(); b.finished = true; main.querySelector('#kcAfter').hidden = false; main.querySelector('#kcEnd').hidden = true; });
    bindLike(h, b);
  }

  // ---- Play & learn -----------------------------------------------------------------------------------------------------------
  async function play() {
    st.view = 'play';
    try { await load(); } catch (_) { /* keep the last copy */ }
    const acts = st.home.week?.activities || [];
    const moves = acts.filter((a) => a.mode === 'on_screen');
    const next = moves.find((a) => !a.done);
    const cards = acts.filter((a) => a.mode === 'off_screen');
    const actTitle = (a) => (cap !== 'en' && a.title_es) || a.title;
    show(`${topBar(esc(L.play))}
      <section class="sc-home kc-checks" id="kmChecks" hidden></section>
      <ul class="kc-grid kc-grid-play" id="kcPlay">
        ${next ? card(`data-move="${esc(next.id)}"`, `<img src="${esc(friendImg(next.friend, 'playful'))}" alt="">`, esc(actTitle(next)), `<span class="kc-kind">${esc(L.move)}</span>`, 'kc-card-move') : ''}
        ${cards.map((a) => card(`data-card="${esc(a.id)}"`, `<img src="${esc(CUT(a.friend))}" alt="">`, esc(actTitle(a)),
          `<span class="kc-kind">${esc(L.together)}</span>${a.done ? `<span class="kc-mark kc-mark-done" aria-label="${esc(L.doneMark)}">${ICON.check}</span>` : ''}`, 'kc-card-together')).join('')}
        ${!next && !cards.length ? `<li><p class="km-note">${esc(L.noPlay)}</p></li>` : ''}</ul>`);
    bindTop();
    main.querySelector('#kcPlay').addEventListener('click', (e) => {
      const m = e.target.closest('[data-move]'); if (m) return moveAlong(acts.find((a) => a.id === m.dataset.move));
      const k = e.target.closest('[data-card]'); if (k) return togetherCard(acts.find((a) => a.id === k.dataset.card));
    });
    // skill checks (skill-checks-kid.js): graded by the database; the corner records only that a check was opened / finished
    const box = main.querySelector('#kmChecks');
    box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-check]'); if (!b) return;
      const h = tracker.item({ section: 'play', item_type: 'check', item_id: b.dataset.check }); h.start(); st.current = h;
    }, true);
    import('./skill-checks-kid.js').then((m) => m.mountKidChecks({ box, rpc, esc, lang: cap === 'en' ? 'en' : 'es', session, guide: st.guide,
      show: (html) => show(html), home: afterCheck, gate, gateLabel: L.grownUps })).catch(() => {});
  }
  async function afterCheck() {
    const h = st.current; st.current = null;
    if (h) {
      let open = true;
      try { const r = await rpc('kid_mode_checks', { p_session: session }); open = (r?.checks || []).some((x) => x.items.some((i) => !i.done) && String(x.id) === String(h.item_id)); } catch (_) { open = true; }
      if (open) h.close(); else { h.complete(); h.close(); }
    }
    play();
  }
  function moveAlong(a) {
    if (!a) return;
    const h = tracker.item({ section: 'play', item_type: 'move', item_id: a.id }); h.start(); st.current = h;
    show(`${topBar(esc((cap !== 'en' && a.title_es) || a.title))}<div class="km-panel km-moveview kc-panel"><img class="km-friend-big km-bounce" src="${esc(friendImg(a.friend, 'playful'))}" alt="">
      <p class="km-say">${esc((cap !== 'en' && a.prompt_es) || a.prompt)}</p><div class="km-row">
      <button class="km-btn km-btn-go" type="button" id="kmDid">${esc(L.did)}</button></div></div>`);
    bindTop();
    main.querySelector('#kmDid').addEventListener('click', async () => {
      let r;
      try { r = await rpc('kid_mode_done', { p_session: session, p_activity: a.id }); } catch (err) { if (/ended/.test(String(err.message))) return ended('end'); return; }
      h.complete(); st.current = null; h.close();
      const words = r.sticker ? L.sticker(nameOf(r.sticker)) : L.youDid;
      show(`<div class="km-panel km-yay kc-panel kc-yay">${r.sticker ? `<img class="km-sticker-big kc-pop" src="${esc(friendImg(r.sticker, 'waving'))}" alt="">` : avatarHtml(esc, st.guide, 'km-av-xl')}
        <p class="km-say km-cheer" role="status">${esc(words)}</p>${likeHtml()}<button class="km-btn km-btn-go" type="button" id="kcMore">${esc(L.play)}</button></div>`);
      bindLike(h, null);
      main.querySelector('#kcMore').addEventListener('click', () => play());
    });
  }
  function togetherCard(a) {
    if (!a) return;
    const h = tracker.item({ section: 'play', item_type: 'together', item_id: a.id }); st.current = h;
    show(`${topBar(esc(L.together))}<div class="km-panel km-cardview kc-panel"><img class="km-friend-big" src="${esc(friendImg(a.friend, 'waving'))}" alt="">
      <h2 class="km-h">${esc((cap !== 'en' && a.title_es) || a.title)}</h2><p class="km-say">${esc(L.showGrownUp)}</p>
      <ol class="km-steps">${(a.steps || []).map((s) => `<li>${esc(s)}</li>`).join('')}</ol></div>`);
    bindTop();
    main.querySelector('#kcBack').replaceWith(main.querySelector('#kcBack').cloneNode(true));
    main.querySelector('#kcBack').addEventListener('click', () => { closeCurrent({ seen: true }); play(); });
  }

  // ---- My stickers: this week, by day; no count, no streak, no empty slots ---------------------------------------------------
  async function stickers() {
    st.view = 'stickers';
    try { await load(); } catch (_) { /* last copy */ }
    const days = stickerDays(st.home.stickers || [], cap === 'en' ? 'en' : 'es');
    show(`${topBar(esc(L.stickers))}
      ${days.length ? `<div class="kc-book-of-stickers" id="kcStickers">${days.map((d) => `<section class="kc-sday"><h2>${esc(d.label)}</h2>
        <ul class="kc-stickers">${d.list.map((s) => `<li class="kc-sticker kc-f-${esc(s.friend)}"><img src="${esc(friendImg(s.friend, 'waving'))}" alt="">
          <span>${esc((cap !== 'en' && s.title_es) || s.title_en || '')}</span></li>`).join('')}</ul></section>`).join('')}</div>`
        : `<div class="km-panel kc-panel">${avatarHtml(esc, st.guide, 'km-av-xl')}<p class="km-say">${esc(L.stickersEmpty)}</p></div>`}`);
    bindTop();
  }

  // ---- Messages from my friend (parent-approved; the play is recorded and refused unless a guardian approved it) ---------------
  async function messagesView() {
    st.view = 'messages';
    const list = await loadMessages();
    const cm = await import('./charmsg-player.js');
    show(`${topBar(esc(L.messages))}<div class="km-msg-cards kc-msgs" id="kcMsgs">${list.map((m) => cm.renderMessageCard(m, { lang: cap === 'en' ? 'en' : 'es' })).join('') || `<div class="km-panel kc-panel">${avatarHtml(esc, st.guide, 'km-av-xl')}<p class="km-say">${esc(L.noMessages)}</p></div>`}</div>`);
    bindTop();
    main.querySelector('#kcMsgs').addEventListener('click', async (e) => {
      const b = e.target.closest('[data-request]'); if (!b) return;
      const m = list.find((x) => x.request_id === b.dataset.request); if (!m) return;
      const h = tracker.item({ section: 'messages', item_type: 'message', item_id: m.request_id });
      const stage = document.createElement('div'); stage.className = 'km-panel km-msgstage kc-panel';
      try {
        await cm.playMessage(stage, m, { lang: cap === 'en' ? 'en' : 'es', rpc, context: 'kid_mode', onBack: () => { closeCurrent({ seen: true }); messagesView(); } });
        h.start(); st.current = h;
        show(`${topBar(esc(L.messages))}`); bindTop();
        main.querySelector('#kcBack').replaceWith(main.querySelector('#kcBack').cloneNode(true));
        main.querySelector('#kcBack').addEventListener('click', () => { closeCurrent({ seen: true }); messagesView(); });
        main.querySelector('.kc-in').append(stage);
        const like = document.createElement('div'); like.className = 'kc-after'; like.innerHTML = likeHtml(); main.querySelector('.kc-in').append(like); bindLike(h, null);
      } catch (_) { h.close(); b.remove(); }
    });
  }

  // ---- the grown-up gate: hold 3 s, then a sum (a convenience: the server never lets the corner write outside the session's child) --
  function gate() {
    if (document.getElementById('kmGateBox')) return;
    const box = document.createElement('div');
    box.className = 'km-gate'; box.id = 'kmGateBox'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', L.grownUps);
    box.innerHTML = `<div class="km-gate-card"><p class="km-gate-t">${esc(L.gateHold)}</p><button class="km-hold" type="button" id="kmHold"><span class="km-hold-fill"></span><span class="km-hold-t">${esc(L.grownUps)}</span></button>
      <div id="kmSum" hidden></div><button class="btn link" type="button" id="kmGateX">${esc(L.gateCancel)}</button></div>`;
    (document.getElementById('kidMode') || main).append(box);
    let t = null, started = 0, raf = 0;
    const close = () => { clearTimeout(t); box.remove(); };
    box.querySelector('#kmGateX').addEventListener('click', close);
    const hold = box.querySelector('#kmHold'), fill = hold.querySelector('.km-hold-fill');
    const tick = () => { const p = Math.min(1, (Date.now() - started) / 3000); fill.style.width = `${Math.round(p * 100)}%`; if (p < 1 && started) raf = requestAnimationFrame(tick); };
    hold.addEventListener('pointerdown', (e) => { e.preventDefault(); started = Date.now(); tick(); t = setTimeout(askSum, 3000); });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) hold.addEventListener(ev, () => { if (Date.now() - started < 3000) { clearTimeout(t); started = 0; cancelAnimationFrame(raf); fill.style.width = '0%'; } });
    function askSum() {
      const a = 3 + Math.floor(Math.random() * 6), b = 4 + Math.floor(Math.random() * 5), right = a + b;
      const opts = [...new Set([right, right + 1, right - 2, right + 3])].sort(() => Math.random() - 0.5);
      const s = box.querySelector('#kmSum');
      hold.hidden = true; box.querySelector('.km-gate-t').hidden = true; s.hidden = false;
      s.innerHTML = `<p class="km-gate-t">${esc(L.gateAsk(a, b))}</p><div class="km-sum">${opts.map((o) => `<button class="btn soft" type="button" data-n="${o}">${o}</button>`).join('')}</div>`;
      s.querySelector('.km-sum').addEventListener('click', async (e) => {
        const btn = e.target.closest('button[data-n]'); if (!btn) return;
        if (Number(btn.dataset.n) !== right) { s.innerHTML = `<p class="km-gate-t" role="alert">${esc(L.gateWrong)}</p>`; setTimeout(close, 1400); return; }
        st.ended = true; closeCurrent();
        await tracker.flush();
        await rpc('kid_mode_end', { p_session: session, p_reason: 'adult' }).catch(() => {});
        leave();
      });
    }
  }
}
