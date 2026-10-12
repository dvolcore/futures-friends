// Kid Mode and the child's work (hub/KID_MODE.md, migration 20261025100000_kid_mode_work.sql).
//
//   /c/<slug>/kid    Kid Mode. An ADULT who is already signed in opens it (a guardian on their own device, or staff on a classroom
//                    tablet: ?room=<room>). The child picks their own picture, then their guide (one of the four friends, Booker,
//                    Lumi, Zuri or Bop, or one of the story world's kid characters: KIDS below) and,
//                    if they like, a colour, a pose and a badge from fixed lists. Children never have a login, an email or a password.
//                    Leaving needs a grown-up: hold the button for 3 seconds, then answer a sum. Minutes are recorded by the server
//                    (kid_mode_beat) as "time learning this week" for the grown-ups: there is NO cap (owner decision 2026-10-10,
//                    hub/HOME_LEARNING.md). Kid Mode still rests after 5 minutes without a touch.
//   /c/<slug>/work   Staff: the room grid (who did which activity this week), the program week Kid Mode shows, evidence.
//                    Family: this week's do-it-together cards to mark done, time learning this week, the child's portfolio
//                    (the fuller home-learning hub with uploads is /c/<slug>/learn, home-learning.js).
//
// Guardrails kept here as in the database: words not numbers about a child (no scores, counts, totals or streaks; the only numbers
// shown to grown-ups are minutes of time learning, and the grown-up gate's sum), no comparison (the grid shows marks, never totals),
// friend stickers are a completion mark on one activity and never for food, no screens under the center's minimum age (default 3).
// Plain ES module, no build step; the strict CSP forbids inline styles and inline code, so widths are set through the CSSOM.

import { centerToday } from './center-time.js';   // the center's day (hub/TIME_ZONES.md)
import { accBannerHtml, accClasses, accOneStep, accStartBreaks } from './accommodations-kid.js';   // the child's classroom accommodations (ACCOMMODATIONS.md)
import { dayPlan, endingHtml } from './kid-mode-endings.js';   // N35: the day's ending (goodbye + an off-screen prompt, no more content)

export const FRIENDS = ['booker', 'lumi', 'zuri', 'bop'];
// The story world's canon kid characters (KID_MODE.md rule 2 says where each comes from). They can be the child's guide; stickers and
// character messages stay with the four friends (migration 20261025500000_kid_mode_all_characters.sql).
export const KIDS = ['nico', 'tilly', 'poppy', 'mimi', 'tad', 'rory', 'nova', 'teo'];
export const GUIDES = [...FRIENDS, ...KIDS];
// approved plush art (one pose, copied from the public site's img/plush/characters); Rory, Nova and Teo have none yet: a styled initial
const KID_ART = ['nico', 'tilly', 'poppy', 'mimi', 'tad'];
export const COLORS = ['sky', 'sun', 'leaf', 'berry', 'coral', 'purple'];
export const OUTFITS = ['classic', 'waving', 'playful'];
export const BADGES = ['none', 'star', 'heart', 'flower', 'rocket'];
const NAME = { booker: 'Booker', lumi: 'Lumi', zuri: 'Zuri', bop: 'Bop', nico: 'Nico', tilly: 'Tilly', poppy: 'Poppy', mimi: 'Mimi',
  tad: 'Tad', rory: 'Rory', nova: 'Nova', teo: 'Teo' };
const POSE = {
  classic: (f) => f,
  waving: (f) => ({ booker: 'booker-waving', lumi: 'lumi-waving', zuri: 'zuri-pointing', bop: 'bop-waving' })[f],
  playful: (f) => ({ booker: 'booker-reading', lumi: 'lumi-hop', zuri: 'zuri-magnifier', bop: 'bop-dancing' })[f],
};
export const friendImg = (friend = 'bop', outfit = 'classic') => (KID_ART.includes(friend) ? `img/friends/${friend}-480.webp`
  : `img/friends/${(POSE[outfit] || POSE.classic)(FRIENDS.includes(friend) ? friend : 'bop')}-480.webp`);
// The guide's face: the art, or for a kid character with no approved art a styled initial (never stand-in art).
export function guideFace(esc, friend, outfit = 'classic') {
  if (GUIDES.includes(friend) && !FRIENDS.includes(friend) && !KID_ART.includes(friend)) {
    return `<span class="km-initial km-i-${esc(friend)}" aria-hidden="true">${esc(NAME[friend].charAt(0))}</span>`;
  }
  return `<img src="${esc(friendImg(friend, outfit))}" alt="" decoding="async">`;
}

export const BADGE_SVG = {
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17l-6.1 3.4 1.5-6.8L2.2 9l6.9-.7z"/></svg>',
  heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.2 4.3 2.6.7-1.4 2.2-2.6 4.3-2.6 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z"/></svg>',
  flower: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="6" r="4"/><circle cx="18" cy="12" r="4"/><circle cx="12" cy="18" r="4"/><circle cx="6" cy="12" r="4"/><circle cx="12" cy="12" r="3.2" class="km-flower-mid"/></svg>',
  rocket: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c3.5 2.5 5 6.2 5 10.5L14.5 15h-5L7 12.5C7 8.2 8.5 4.5 12 2zm0 6.2a1.8 1.8 0 100 3.6 1.8 1.8 0 000-3.6zM9.5 16h5l-1 4h-3zM7 13l-3 4 3.5-.5zM17 13l3 4-3.5-.5z"/></svg>',
};

// ---- words (family and child facing: English + Spanish DRAFT; the child is addressed with "tú", grown-ups with "usted") -------
const W = {
  en: {
    who: "Who's playing?", whoAdult: 'Hand the device to your child. They tap their own picture.', whoStaff: 'Children tap their own picture.',
    pickFriend: 'Pick your friend!', groupFriends: 'Friends', groupKids: 'Kids', makeYours: 'Make it yours', color: 'Colour', pose: 'Pose', badge: 'Badge', go: "Let's go!",
    hi: (f) => `Hi! It's me, ${f}! Let's play and learn together.`, moveAlong: 'Move along', together: 'With your grown-up',
    did: 'I did it!', back: 'Back', showGrownUp: 'Show this to your grown-up. You do it together, away from the screen!',
    sticker: (f) => `${f}'s sticker: you did it!`, stickerFood: 'You did it!', doneMark: 'Done', grownUps: 'Grown-ups',
    gateHold: 'Grown-ups: press and hold for 3 seconds', gateAsk: (a, b) => `What is ${a} + ${b}?`, gateWrong: 'Not quite. Kid Mode stays on.',
    gateCancel: 'Keep playing',
    idleEnd: 'Kid Mode is resting. Ask your grown-up.',
    noScreen2: 'Kid Mode opens at the age your center sets (3 and older unless the center chose otherwise). This week\'s do-it-together cards are on the Learning at home page.',
    noAge: 'Kid Mode needs your child\'s date of birth on file (the center sets the age Kid Mode opens at). Ask the center to add it.',
    loading: 'Getting ready…', none: 'No children to show.',
    messages: 'A message for you',
    noConsent: 'Kid Mode needs a parent\'s consent first (Privacy & consent). Saying no never affects enrollment.',
    captions: 'Words on the screen', capEn: 'English', capEs: 'Español', capBoth: 'English + Español',
    whoDevice: 'Tap your picture!', pauseT: 'Come back soon!', pauseSay: (f) => `${f} is taking a little rest. Kid Mode needs the internet, and it is not here right now.`,
    pauseWait: 'Waiting for the internet…', backT: 'Welcome back!', backGo: 'Keep playing', bye: 'Goodbye for now! Ask your grown-up.',
  },
  es: {
    who: '¿Quién va a jugar?', whoAdult: 'Dele el aparato a su niño o niña. Toca su propio dibujo.', whoStaff: 'Cada niño toca su propio dibujo.',
    pickFriend: '¡Elige a tu amigo!', groupFriends: 'Amigos', groupKids: 'Niños y niñas', makeYours: 'Hazlo tuyo', color: 'Color', pose: 'Pose', badge: 'Insignia', go: '¡Vamos!',
    hi: (f) => `¡Hola! ¡Soy ${f}! Vamos a jugar y aprender juntos.`, moveAlong: 'A moverse', together: 'Con tu adulto',
    did: '¡Lo hice!', back: 'Atrás', showGrownUp: 'Muéstrale esto a tu adulto. ¡Lo hacen juntos, sin pantalla!',
    sticker: (f) => `La calcomanía de ${f}: ¡lo hiciste!`, stickerFood: '¡Lo hiciste!', doneMark: 'Hecho', grownUps: 'Adultos',
    gateHold: 'Adultos: mantenga presionado 3 segundos', gateAsk: (a, b) => `¿Cuánto es ${a} + ${b}?`, gateWrong: 'No es correcto. El Modo Niños sigue abierto.',
    gateCancel: 'Seguir jugando',
    idleEnd: 'El Modo Niños está descansando. Pregúntale a tu adulto.',
    noScreen2: 'El Modo Niños se abre a la edad que fija su centro (3 años o más, salvo que el centro elija otra). Las tarjetas para hacer juntos están en la página Aprender en casa.',
    noAge: 'El Modo Niños necesita la fecha de nacimiento de su hijo en el expediente (el centro fija la edad para el Modo Niños). Pídale al centro que la agregue.',
    loading: 'Preparando…', none: 'No hay niños para mostrar.',
    messages: 'Un mensaje para ti',
    noConsent: 'El Modo Niños necesita primero el consentimiento de un padre o madre (Privacidad y consentimiento). Decir que no nunca afecta la inscripción.',
    captions: 'Palabras en la pantalla', capEn: 'English', capEs: 'Español', capBoth: 'English + Español',
    whoDevice: '¡Toca tu dibujo!', pauseT: '¡Vuelve pronto!', pauseSay: (f) => `${f} está descansando un poquito. El Modo Niños necesita internet, y ahora no hay.`,
    pauseWait: 'Esperando el internet…', backT: '¡Bienvenido de nuevo!', backGo: 'Seguir jugando', bye: '¡Adiós por ahora! Pregúntale a tu adulto.',
  },
};

// ---- Learning Step wording for the evidence form ----------------------------------------------------------------------------
// The evidence form offers the activity's Learning Steps by their teacher wording (English, or the DRAFT Spanish when the person's UI
// language is Spanish), never by code. The wording comes from GET /api/curriculum/steps (staff only, curriculum-server.mjs); if it
// cannot be loaded the code is shown so the form still works. Pure, so tests/kid-mode-unit.test.mjs can check it without a browser.
export function stepLabel(id, labels, lang = 'en') {
  const t = labels?.[id];
  return (lang === 'es' && t?.es) || t?.en || id;
}
export function stepOptionsHtml(esc, ids, { labels = null, lang = 'en', selected = null, band = '' } = {}) {
  const pre = { twos: 'two-', threes: 'thr-', prek: 'pk-' }[band] || '';
  return (ids || []).filter((s) => !pre || s.startsWith(pre))
    .map((s) => `<option value="${esc(s)}"${s === selected ? ' selected' : ''}>${esc(stepLabel(s, labels, lang))}</option>`).join('');
}
let stepLabelsCache = null;
async function loadStepLabels(ctx) {
  if (stepLabelsCache) return stepLabelsCache;
  try {
    const s = await ctx.session();
    const r = await fetch('/api/curriculum/steps', { headers: { Authorization: `Bearer ${s?.access_token || ''}`, 'X-Center': ctx.c.center_id }, cache: 'no-store' });
    if (r.ok) stepLabelsCache = (await r.json()).steps || null;
  } catch { /* the codes show instead */ }
  return stepLabelsCache;
}

// ---- the avatar (the child's pick) -----------------------------------------------------------------------------------------
export function avatarHtml(esc, g, size = '') {
  const a = g || {};
  const friend = GUIDES.includes(a.friend) ? a.friend : 'bop';
  const color = COLORS.includes(a.color) ? a.color : 'sky';
  const badge = BADGES.includes(a.badge) ? a.badge : 'none';
  return `<span class="km-av km-c-${color} ${size}" data-friend="${esc(friend)}">${guideFace(esc, friend, a.outfit)}${badge !== 'none' ? `<span class="km-badge km-b-${badge}">${BADGE_SVG[badge]}</span>` : ''}</span>`;
}

// Sound is OFF everywhere (owner decision 2026-10-10): no audio prompts, music or sound effects. Pictures, big icons, captions
// and simple motion only. There is no audio playback code path in this file (tests/kid-mode-unit.test.mjs checks).

// The character-msgs workstream renders parent-approved messages with the child's guide character through this.
const messageSources = [];
export function registerKidModeMessages(fn) { if (typeof fn === 'function') messageSources.push(fn); }
// Other Kid Mode home tiles (kid-videos.js "Today's video"): fn(el, api) renders into its own box at the top of the home screen.
const homeTiles = [];
export function registerKidModeHomeTile(fn) { if (typeof fn === 'function') homeTiles.push(fn); }
export function renderGuideMessage(el, esc, guide, text) {
  el.innerHTML = `<div class="km-msg">${avatarHtml(esc, guide, 'km-av-s')}<p class="km-bubble">${esc(text)}</p>
</div>`;
}

// ===========================================================================================================================
// Kid Mode
// ===========================================================================================================================
// Captions (owner request 2026-10-10, bilingual): what the child reads on screen, per child: 'en', 'es' or 'both' (Spanish first, then
// English, as in Zuri's lines). Saved with kid_language_set by the child (the buttons on the Kid Mode home), the parent or the teacher;
// without a saved choice it follows the child's home language (kid_languages_list), else the grown-up's own language.
// The week's activities with their Spanish (DRAFT) in place of the English when the reader reads Spanish (the English stays as en_*).
export async function withSpanish(rpc, acts, lang) {
  if (lang !== 'es' || !acts?.length) return acts || [];
  let rows = [];
  try { rows = (await rpc('kid_activities_es', { p_ids: [...new Set(acts.map((a) => a.id))] })) || []; } catch (_) { return acts; }
  const by = new Map(rows.map((x) => [x.id, x]));
  return acts.map((a) => {
    const x = by.get(a.id);
    if (!x) return a;
    return { ...a, en_title: a.title, title: x.title_es || a.title, prompt: x.prompt_es || a.prompt,
      steps: (a.steps || []).map((st, i) => x.steps_es?.[i] || st) };
  });
}
export function captionHtml(esc, en, es, mode) {
  if (mode === 'es' && es) return esc(es);
  if (mode === 'both' && es && es !== en) return `<span lang="es" class="km-cap1">${esc(es)}</span><span lang="en" class="km-cap2">${esc(en)}</span>`;
  return esc(en);
}
export async function viewKidMode(ctx) {
  const { c, page, rpc, esc, friendly, go, lang } = ctx;
  let L = W[lang === 'es' ? 'es' : 'en'];
  let cap = lang === 'es' ? 'es' : 'en';      // this child's captions, set once the child is known
  const esText = new Map();                    // activity id -> {title_es, prompt_es, steps_es}
  const T = (a, k) => captionHtml(esc, k === 'steps' ? null : a[k], k === 'steps' ? null : esText.get(a.id)?.[`${k}_es`], cap);
  const stepsOf = (a) => { const es = esText.get(a.id)?.steps_es || []; return (a.steps || []).map((s, i) => captionHtml(esc, s, es[i], cap)); };
  // ctx.device (kid-device.js): a PAIRED device (N14, hub/KID_MODE.md "Paired devices"). No grown-up is signed in: ctx.rpc goes through the
  // device token (kid_device_call), the children come from kid_device_hello, and leaving (the grown-up gate) goes to ctx.device.exit().
  const device = ctx.device || null;
  const staff = device ? device.kind === 'room' : c.role !== 'family';
  const room = device ? (device.room || '') : (new URLSearchParams(location.search).get('room') || '');
  const main = document.getElementById('main');
  const st = { session: null, kid: null, home: null, guide: null, beat: null, idle: null, lastTouch: Date.now(), trap: null, ended: false, acc: null, breaks: null, paused: false, retry: null };

  const show = (html, title = 'Kid Mode') => {
    page(`<div class="km ${accClasses(st.acc)}" id="kidMode" lang="${cap === 'en' ? 'en' : 'es'}" translate="no">${html}</div>`, title, { english: staff && lang !== 'es' });
    document.body.classList.add('kidmode');
  };
  const leave = (path) => {
    clearInterval(st.beat); clearInterval(st.idle); clearInterval(st.breaks); clearInterval(st.retry);
    window.removeEventListener('offline', goneOffline);
    if (st.trap) window.removeEventListener('popstate', st.trap, true);
    window.FFKidModeLock = false;
    document.body.classList.remove('kidmode');
    if (device) device.exit(); else go(path);
  };
  const exitTo = `/c/${c.slug}/work${staff && room ? `?room=${encodeURIComponent(room)}` : ''}`;

  // While Kid Mode is on, the browser's back button stays in Kid Mode: leaving is the grown-up gate's job.
  function trapBack() {
    history.pushState({ kidmode: true }, '', location.href);
    window.FFKidModeLock = true;            // app.js does not re-render on back while this is set
    st.trap = () => { history.pushState({ kidmode: true }, '', location.href); gate(); };
    window.addEventListener('popstate', st.trap, true);
  }

  // ---- who's playing (the adult's screen, the child taps) ----
  if (staff && !room && !device) {
    // staff choose the room first (their own screen, before handing the tablet over)
    const rooms = await ctx.client().from('rooms').select('id, data').eq('center_id', c.center_id).order('id');
    page(ctx.shell(`<div class="card"><h2>Kid Mode on a classroom tablet</h2><p>Pick the room. Children then tap their own picture; no child signs in. Leaving Kid Mode needs a grown-up.</p>
      <div class="cta-row">${(rooms.data || []).map((r) => `<a class="btn navy" data-nav href="/c/${esc(c.slug)}/kid?room=${encodeURIComponent(r.id)}">${esc(r.data?.name || r.id)}</a>`).join('') || '<p class="muted">No rooms yet.</p>'}</div></div>
      <section class="card" id="roomTablets"></section>`), 'Kid Mode', { english: true });
    // room tablets that open Kid Mode without a grown-up signed in: QR login cards (N14, kid-devices-ui.js)
    import('./kid-devices-ui.js').then((m) => m.mountRoomTablets(document.getElementById('roomTablets'),
      { c, rpc, esc, lang, live: ctx.live, friendly, rooms: (rooms.data || []).map((r) => ({ id: r.id, name: r.data?.name || r.id })) }))
      .catch(() => { document.getElementById('roomTablets')?.remove(); });
    return;
  }
  show(`<p class="km-loading">${esc(L.loading)}</p>`);
  let kids;
  try { kids = device ? device.kids.map((k) => ({ kid: k.kid, label: k.first, avatar: k.avatar, screen_ok: k.screen_ok, reason: k.reason }))
    : await rpc('kid_mode_kids', { p_center: c.center_id, p_room: staff ? room : null }); } catch (e) {
    return show(`<div class="km-panel"><p class="km-note" role="alert">${esc(friendly(e))}</p><button class="km-btn" id="kmOut" type="button">${esc(L.back)}</button></div>`), document.getElementById('kmOut').addEventListener('click', () => leave(exitTo));
  }
  show(`<header class="km-top"><h1 class="km-title">${esc(device ? L.whoDevice : L.who)}</h1>${device ? `<button class="km-grown" type="button" id="kmGate">${esc(L.grownUps)}</button>` : `<a class="km-grown" href="${esc(exitTo)}" data-nav>${esc(L.back)}</a>`}</header>
    ${device ? '' : `<p class="km-sub">${esc(staff ? L.whoStaff : L.whoAdult)}</p>`}
    <ul class="km-who" id="kmWho">${kids.length ? kids.map((k) => `<li><button type="button" class="km-kid" data-kid="${esc(k.kid)}" ${k.screen_ok ? '' : 'aria-disabled="true"'}>
      ${avatarHtml(esc, k.avatar || { friend: 'bop', color: 'sky' })}<span class="km-kid-label">${esc(k.label)}</span></button>
      ${k.screen_ok ? '' : `<p class="km-note small">${esc(k.reason === 'under_age' ? L.noScreen2 : k.reason === 'no_consent' ? L.noConsent : L.noAge)}</p>`}</li>`).join('') : `<li><p class="km-note">${esc(L.none)}</p></li>`}</ul>`);
  if (device) { trapBack(); document.getElementById('kmGate').addEventListener('click', gate); }
  document.getElementById('kmWho').addEventListener('click', async (e) => {
    const b = e.target.closest('.km-kid');
    if (!b || b.getAttribute('aria-disabled') === 'true') return;
    try {
      const r = await rpc('kid_mode_start', { p_center: c.center_id, p_kid: b.dataset.kid, p_place: staff ? 'center' : 'home' });
      st.session = r.session; st.kid = b.dataset.kid;
      try { st.acc = await rpc('kid_mode_accommodations', { p_session: st.session }); } catch (_) { st.acc = null; }   // presentation only; Kid Mode works without
      try {
        const kl = ((await rpc('kid_languages_list', { p_center: c.center_id })) || []).find((x) => x.kid === st.kid);
        if (kl?.captions && (kl.home_set || kl.captions !== 'en' || lang !== 'es')) cap = kl.captions;
      } catch (_) { /* the grown-up's language */ }
      L = W[cap === 'en' ? 'en' : 'es'];
      const k = kids.find((x) => x.kid === st.kid);
      st.guide = k && k.avatar ? { ...k.avatar } : { friend: 'bop', color: 'sky', outfit: 'classic', badge: 'none' };
      if (!device) trapBack();
      startClock();
      pickFriend();
    } catch (err) {
      const n = document.createElement('p'); n.className = 'km-note'; n.setAttribute('role', 'alert'); n.textContent = friendly(err);
      b.parentElement.querySelector('.km-note')?.remove(); b.parentElement.append(n);
    }
  });

  // ---- minutes: the server records them (information for grown-ups, never a limit); the client only reports that the screen is on ----
  function startClock() {
    const touch = () => { st.lastTouch = Date.now(); };
    ['pointerdown', 'keydown'].forEach((ev) => main.addEventListener(ev, touch, { passive: true }));
    st.beat = setInterval(async () => {
      if (document.hidden || st.ended || st.paused) return;
      try { const r = await rpc('kid_mode_beat', { p_session: st.session }); if (r.ended) ended(r.reason || 'idle'); }
      catch (err) { if (isOffline(err)) pause(); else ended('end'); }   // N7: Kid Mode needs the connection; a refusal (consent, removed) ends it
    }, 30000);
    window.addEventListener('offline', goneOffline);
    st.breaks = accStartBreaks(st.acc, { getCap: () => cap, friendName: () => NAME[st.guide?.friend] || 'Bop' });
    st.idle = setInterval(() => { if (!st.ended && !st.paused && Date.now() - st.lastTouch > 5 * 60000) { rpc('kid_mode_end', { p_session: st.session, p_reason: 'idle' }).catch(() => {}); ended('idle'); } }, 15000);
  }
  // N7 (hub/KID_MODE.md "No connection, no Kid Mode"): child sessions need the connection. When the heartbeat cannot reach the server (or
  // the browser says it is offline) Kid Mode pauses on a calm "come back soon" screen: nothing can be done offline and nothing is stored on
  // the device. It checks again every 10 s; when the server answers, the child taps to keep playing. If the server refuses instead
  // (consent withdrawn, the device removed), Kid Mode ends.
  // A refusal is a database answer (a SQLSTATE code: consent withdrawn, not allowed...). Anything else (no network, a gateway 5xx) or a
  // busy database (57xxx timeout, 08xxx connection, 53xxx resources, 40xxx retry, 55P03 lock) is the connection: pause and try again,
  // never end the child's session for it.
  function isOffline(err) {
    const code = String(err?.code || '');
    return !navigator.onLine || !/^[0-9A-Z]{5}$/.test(code) || /^(57|08|53|40)/.test(code) || code === '55P03';
  }
  function goneOffline() { if (st.session && !st.ended) pause(); }
  function pause() {
    if (st.paused || st.ended) return;
    st.paused = true;
    document.getElementById('kmGateBox')?.remove();
    show(`<div class="km-panel km-bye km-pause" role="status">${avatarHtml(esc, st.guide, 'km-av-xl')}<h1 class="km-title">${esc(L.pauseT)}</h1>
      <p class="km-say">${esc(L.pauseSay(NAME[st.guide?.friend] || 'Bop'))}</p><p class="km-sub">${esc(L.pauseWait)}</p>
      <button class="km-grown km-grown-big" type="button" id="kmGate">${esc(L.grownUps)}</button></div>`);
    document.getElementById('kmGate').addEventListener('click', gate);
    clearInterval(st.retry);
    st.retry = setInterval(async () => {
      if (!navigator.onLine) return;
      let r;
      try { r = await rpc('kid_mode_beat', { p_session: st.session }); } catch (err) { if (!isOffline(err)) { clearInterval(st.retry); st.paused = false; ended('end'); } return; }
      clearInterval(st.retry);
      if (r.ended) { st.paused = false; return ended(r.reason || 'idle'); }
      show(`<div class="km-panel km-bye" role="status">${avatarHtml(esc, st.guide, 'km-av-xl')}<h1 class="km-title">${esc(L.backT)}</h1>
        <div class="km-row"><button class="km-btn km-btn-go" type="button" id="kmBack">${esc(L.backGo)}</button></div></div>`);
      document.getElementById('kmBack').addEventListener('click', () => { st.paused = false; st.lastTouch = Date.now(); home(false); });
    }, 10000);
  }
  function ended(reason) {
    if (st.ended) return;
    st.ended = true; clearInterval(st.beat); clearInterval(st.idle); clearInterval(st.breaks); clearInterval(st.retry);
    show(`<div class="km-panel km-bye">${avatarHtml(esc, st.guide, 'km-av-xl')}<p class="km-say">${esc(reason === 'end' ? L.bye : L.idleEnd)}</p>
      <button class="km-grown km-grown-big" type="button" id="kmGate">${esc(L.grownUps)}</button></div>`);
    document.getElementById('kmGate').addEventListener('click', gate);
  }

  // ---- pick your friend (every time) + make it yours ----
  function pickFriend() {
    const g = st.guide;
    const posed = (f) => (FRIENDS.includes(f) ? f : 'bop');   // only the four friends have pose art; the pose list hides for a kid
    const opt = (name, list, cur, label) => `<fieldset class="km-opts km-opts-${name}"${name === 'outfit' && !FRIENDS.includes(g.friend) ? ' hidden' : ''}><legend>${esc(label)}</legend>${list.map((v) => `<label class="km-opt km-opt-${name}"><input type="radio" name="${name}" value="${v}"${v === cur ? ' checked' : ''}><span${name === 'color' ? ` class="km-swatch km-c-${v}"` : ''}>${name === 'badge' ? (v === 'none' ? '—' : BADGE_SVG[v]) : name === 'outfit' ? `<img src="${esc(friendImg(posed(g.friend), v))}" alt="${esc(v)}">` : ''}</span><span class="sr-only">${esc(v)}</span></label>`).join('')}</fieldset>`;
    show(`<header class="km-top"><h1 class="km-title">${esc(L.pickFriend)}</h1><button class="km-grown" type="button" id="kmGate">${esc(L.grownUps)}</button></header>
      <div class="km-pick" id="kmPick" role="radiogroup" aria-label="${esc(L.pickFriend)}">${[['friends', FRIENDS, L.groupFriends], ['kids', KIDS, L.groupKids]].map(([k, list, label]) => `
        <section class="km-group" role="group" aria-labelledby="kmG-${k}"><h2 class="km-group-h" id="kmG-${k}">${esc(label)}</h2>
        <div class="km-friends km-friends-${k}">${list.map((f) => `<button type="button" role="radio" aria-checked="${f === g.friend}" class="km-friend${f === g.friend ? ' on' : ''}" data-friend="${f}">${guideFace(esc, f)}<span>${NAME[f]}</span></button>`).join('')}</div></section>`).join('')}</div>
      <details class="km-build"><summary>${esc(L.makeYours)}</summary><div class="km-build-body" id="kmBuild">
        <div class="km-preview" id="kmPrev">${avatarHtml(esc, g, 'km-av-l')}</div>
        ${opt('color', COLORS, g.color, L.color)}${opt('outfit', OUTFITS, g.outfit, L.pose)}${opt('badge', BADGES, g.badge, L.badge)}</div></details>
      <div class="km-go"><button class="km-btn km-btn-go" type="button" id="kmGo">${esc(L.go)}</button></div>`);
    document.getElementById('kmGate').addEventListener('click', gate);
    const prev = () => { document.getElementById('kmPrev').innerHTML = avatarHtml(esc, g, 'km-av-l'); };
    document.getElementById('kmPick').addEventListener('click', (e) => {
      const b = e.target.closest('.km-friend'); if (!b) return;
      g.friend = b.dataset.friend;
      document.querySelectorAll('.km-friend').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', String(x === b)); });
      document.querySelectorAll('.km-opt-outfit img').forEach((im, i) => { im.src = friendImg(posed(g.friend), OUTFITS[i]); });
      document.querySelector('.km-opts-outfit').hidden = !FRIENDS.includes(g.friend);
      prev();
    });
    document.getElementById('kmBuild').addEventListener('change', (e) => { if (e.target.name) { g[e.target.name] = e.target.value; prev(); } });
    document.getElementById('kmGo').addEventListener('click', async () => {
      try { st.guide = await rpc('kid_mode_pick_avatar', { p_session: st.session, p_friend: g.friend, p_color: g.color, p_outfit: FRIENDS.includes(g.friend) ? g.outfit : 'classic', p_badge: g.badge }); } catch (err) { if (/ended/.test(String(err.message))) return ended('end'); }
      home(true);
    });
  }

  // ---- Kid Mode home: the guide, the week's activities ----
  async function home(greet) {
    try { st.home = await rpc('kid_mode_home', { p_session: st.session }); } catch (err) { return show(`<p class="km-note" role="alert">${esc(friendly(err))}</p>`); }
    if (st.home.ended) return ended('end');
    const g = st.guide = st.home.guide || st.guide;
    const f = NAME[g.friend];
    const acts = st.home.activities || [];
    if (cap !== 'en' && acts.some((a) => !esText.has(a.id))) {
      try { for (const x of (await rpc('kid_activities_es', { p_ids: acts.map((a) => a.id) })) || []) esText.set(x.id, x); } catch (_) { /* English words */ }
    }
    // N35: everything assigned for today is done -> the guide says goodbye with an off-screen prompt; no more content today
    let checksNow = [];
    try { const r = await rpc('kid_mode_checks', { p_session: st.session }); checksNow = r?.enabled ? (r.checks || []) : []; } catch (_) { /* checks are optional */ }
    const plan = dayPlan(acts, checksNow, new Date(`${centerToday()}T12:00:00Z`).getUTCDay() || 7);
    if (plan.complete) {
      const c0 = plan.together, x = c0 && esText.get(c0.id);
      const card = c0 && { title: (cap !== 'en' && x?.title_es) || c0.title, steps: (c0.steps || []).map((s0, i) => (cap !== 'en' && x?.steps_es?.[i]) || s0) };
      show(endingHtml(esc, { avatar: avatarHtml(esc, g, 'km-av-xl'), friendName: f, card, cap }));
      document.getElementById('kmGate').addEventListener('click', gate);
      return;
    }
    // one move-along at a time (the next one not done yet this week): fewer choices, less screen
    const allMoves = acts.filter((a) => a.mode === 'on_screen');
    const nextMove = allMoves.find((a) => !a.done) || allMoves[allMoves.length - 1];
    const moves = nextMove ? [nextMove] : [];
    const tile = (a) => `<li><button type="button" class="km-tile km-${a.mode === 'on_screen' ? 'move' : 'card'}${a.done ? ' done' : ''}" data-id="${esc(a.id)}">
        <img src="${esc(friendImg(a.friend, a.mode === 'on_screen' ? 'playful' : 'classic'))}" alt="">
        <span class="km-tile-kind">${esc(a.mode === 'on_screen' ? L.moveAlong : L.together)}</span><span class="km-tile-title">${T(a, 'title')}</span>
        ${a.done ? `<span class="km-done">${a.sticker ? `<img class="km-sticker" src="${esc(friendImg(a.sticker))}" alt="">` : ''}<span>${esc(L.doneMark)}</span></span>` : ''}</button></li>`;
    // Zuri speaks both languages (canon): Spanish first, then English, whatever the captions
    const hello = g.friend === 'zuri' && cap !== 'both' ? `<span lang="es" class="km-cap1">${esc(W.es.hi(f))}</span><span lang="en" class="km-cap2">${esc(W.en.hi(f))}</span>`
      : captionHtml(esc, W.en.hi(f), W.es.hi(f), cap);
    show(`<header class="km-top">${avatarHtml(esc, g, 'km-av-s')}<p class="km-hello">${hello}</p><button class="km-grown" type="button" id="kmGate">${esc(L.grownUps)}</button></header>
      <div class="km-caps" role="radiogroup" aria-label="${esc(L.captions)}">${[['en', W.en.capEn], ['es', W.es.capEs], ['both', W.en.capBoth]].map(([v, l]) => `<button type="button" role="radio" class="km-cap${cap === v ? ' on' : ''}" data-cap="${v}" aria-checked="${cap === v}" translate="no">${esc(l)}</button>`).join('')}</div>
      ${accBannerHtml(esc, st.acc, cap)}<section class="km-extra" id="kmExtra"></section>
      <section class="km-msgs" id="kmMessages" hidden aria-label="${esc(L.messages)}"></section>
      <section class="sc-home" id="kmChecks" hidden></section>
      <ul class="km-tiles" id="kmTiles">${moves.map(tile).join('')}${acts.filter((a) => a.mode === 'off_screen').map(tile).join('')}</ul>`);
    document.getElementById('kmGate').addEventListener('click', gate);
    document.getElementById('kmTiles').addEventListener('click', (e) => { const b = e.target.closest('.km-tile'); if (b) activity(acts.find((a) => a.id === b.dataset.id)); });
    document.querySelector('.km-caps').addEventListener('click', async (e) => {
      const b = e.target.closest('[data-cap]'); if (!b || b.dataset.cap === cap) return;
      cap = b.dataset.cap; L = W[cap === 'en' ? 'en' : 'es'];
      rpc('kid_language_set', { p_center: c.center_id, p_kid: st.kid, p_captions: cap }).catch(() => null);   // remembered for next time; the screen changes now either way
      home(false);
    });
    // skill checks the teacher assigned (skill-checks-kid.js, SKILL_CHECKS.md): graded by the database, never block Kid Mode
    import('./skill-checks-kid.js').then((m) => m.mountKidChecks({ box: document.getElementById('kmChecks'), rpc, esc, lang, session: st.session, guide: g,
      show, home, gate, gateLabel: L.grownUps })).catch(() => {});
    // parent-approved messages (character messages, charmsg-player.js): in the child's favourite friend, no sound; the play is recorded
    // and refused by the database unless a guardian approved it
    const box = document.getElementById('kmMessages');
    try {
      const cm = await import('./charmsg-player.js');
      const data = await rpc('charmsg_for_child', { p_center: c.center_id, p_kid: st.kid });
      const list = (data && data.messages) || [];
      if (list.length) {
        box.hidden = false;
        box.insertAdjacentHTML('beforeend', `<h2 class="km-msgs-h">${esc(L.messages)}</h2><div class="km-msg-cards">${list.slice(0, 4).map((m) => cm.renderMessageCard(m, { lang })).join('')}</div>`);
        box.addEventListener('click', async (e) => {
          const b = e.target.closest('[data-request]'); if (!b) return;
          const m = list.find((x) => x.request_id === b.dataset.request); if (!m) return;
          const stage = document.createElement('div'); stage.className = 'km-panel km-msgstage';
          try { await cm.playMessage(stage, m, { lang, rpc, context: 'kid_mode', onBack: () => home(false) }); show(`<header class="km-top">${avatarHtml(esc, g, 'km-av-s')}<h1 class="km-title">${esc(L.messages)}</h1><button class="km-grown" type="button" id="kmGate">${esc(L.grownUps)}</button></header>`);
            document.getElementById('kidMode').append(stage); document.getElementById('kmGate').addEventListener('click', gate); }
          catch (_) { b.remove(); }
        });
      }
    } catch (_) { /* character messages not installed or not reachable: Kid Mode works without them */ }
    for (const src of messageSources) {
      try {
        const list = await src({ center: c.center_id, kid: st.kid, session: st.session, guide: g, lang, rpc });
        if (Array.isArray(list) && list.length) { box.hidden = false; for (const m of list.slice(0, 3)) { const d = document.createElement('div'); box.append(d); renderGuideMessage(d, esc, g, m.text); } }
      } catch (_) { /* a message source that fails never blocks Kid Mode */ }
    }
    for (const fn of homeTiles) {
      const el = document.createElement('div'); document.getElementById('kmExtra')?.append(el);
      try { await fn(el, { ctx, session: st.session, kid: st.kid, guide: g, lang, back: () => home(false), touch: () => { st.lastTouch = Date.now(); }, ended }); } catch (_) { /* a tile that fails never blocks Kid Mode */ }
    }
  }

  // ---- one activity ----
  function activity(a) {
    if (!a) return;
    const g = st.guide, f = NAME[g.friend];
    if (a.mode === 'off_screen') {
      show(`<header class="km-top">${avatarHtml(esc, g, 'km-av-s')}<h1 class="km-title">${esc(L.together)}</h1><button class="km-grown" type="button" id="kmGate">${esc(L.grownUps)}</button></header>
        <div class="km-panel km-cardview"><img class="km-friend-big" src="${esc(friendImg(a.friend, 'waving'))}" alt=""><h2 class="km-h">${T(a, 'title')}</h2>
        <p class="km-say">${captionHtml(esc, W.en.showGrownUp, W.es.showGrownUp, cap)}</p><ol class="km-steps">${stepsOf(a).map((s) => `<li>${s}</li>`).join('')}</ol>
        <div class="km-row"><button class="km-btn soft" type="button" id="kmBack">${esc(L.back)}</button></div></div>`);
      document.getElementById('kmBack').addEventListener('click', () => home(false));
      document.getElementById('kmGate').addEventListener('click', gate);
      accOneStep(document.querySelector('.km-steps'), st.acc, cap);
      return;
    }
    show(`<header class="km-top">${avatarHtml(esc, g, 'km-av-s')}<h1 class="km-title">${T(a, 'title')}</h1><button class="km-grown" type="button" id="kmGate">${esc(L.grownUps)}</button></header>
      <div class="km-panel km-moveview"><img class="km-friend-big km-bounce" src="${esc(friendImg(a.friend, 'playful'))}" alt="">
      <p class="km-say">${T(a, 'prompt')}</p><div class="km-row">
      <button class="km-btn km-btn-go" type="button" id="kmDid">${esc(L.did)}</button><button class="km-btn soft" type="button" id="kmBack">${esc(L.back)}</button></div></div>`);
    document.getElementById('kmBack').addEventListener('click', () => home(false));
    document.getElementById('kmGate').addEventListener('click', gate);
    document.getElementById('kmDid').addEventListener('click', async () => {
      let r;
      try { r = await rpc('kid_mode_done', { p_session: st.session, p_activity: a.id }); } catch (err) { if (/ended/.test(String(err.message))) return ended('end'); return; }
      const words = r.sticker ? L.sticker(NAME[r.sticker] || f) : L.stickerFood;
      show(`<div class="km-panel km-yay">${r.sticker ? `<img class="km-sticker-big" src="${esc(friendImg(r.sticker, 'waving'))}" alt="">` : avatarHtml(esc, g, 'km-av-xl')}
        <p class="km-say km-cheer" role="status">${esc(words)}</p><button class="km-btn km-btn-go" type="button" id="kmMore">${esc(L.back)}</button></div>`);
      document.getElementById('kmMore').addEventListener('click', () => home(false));
    });
  }

  // ---- the grown-up gate: hold 3 s, then a sum (client side; the server never lets Kid Mode write outside the session's child) ----
  function gate() {
    if (document.getElementById('kmGateBox')) return;
    const box = document.createElement('div');
    box.className = 'km-gate'; box.id = 'kmGateBox'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', L.grownUps);
    box.innerHTML = `<div class="km-gate-card"><p class="km-gate-t">${esc(L.gateHold)}</p><button class="km-hold" type="button" id="kmHold"><span class="km-hold-fill"></span><span class="km-hold-t">${esc(L.grownUps)}</span></button>
      <div id="kmSum" hidden></div><button class="btn link" type="button" id="kmGateX">${esc(L.gateCancel)}</button></div>`;
    document.getElementById('kidMode').append(box);
    const close = () => { clearTimeout(t); box.remove(); };
    document.getElementById('kmGateX').addEventListener('click', close);
    const hold = document.getElementById('kmHold'), fill = hold.querySelector('.km-hold-fill');
    let t = null, started = 0, raf = 0;
    const tick = () => { const p = Math.min(1, (Date.now() - started) / 3000); fill.style.width = `${Math.round(p * 100)}%`; if (p < 1 && started) raf = requestAnimationFrame(tick); };
    const down = (e) => { e.preventDefault(); started = Date.now(); tick(); t = setTimeout(askSum, 3000); };
    const up = () => { if (Date.now() - started < 3000) { clearTimeout(t); started = 0; cancelAnimationFrame(raf); fill.style.width = '0%'; } };
    hold.addEventListener('pointerdown', down); ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => hold.addEventListener(ev, up));
    function askSum() {
      const a = 3 + Math.floor(Math.random() * 6), b = 4 + Math.floor(Math.random() * 5), right = a + b;
      const opts = [...new Set([right, right + 1, right - 2, right + 3])].sort(() => Math.random() - 0.5);
      const s = document.getElementById('kmSum');
      hold.hidden = true; box.querySelector('.km-gate-t').hidden = true; s.hidden = false;
      s.innerHTML = `<p class="km-gate-t">${esc(L.gateAsk(a, b))}</p><div class="km-sum">${opts.map((o) => `<button class="btn soft" type="button" data-n="${o}">${o}</button>`).join('')}</div>`;
      s.querySelector('.km-sum').addEventListener('click', async (e) => {
        const btn = e.target.closest('button[data-n]'); if (!btn) return;
        if (Number(btn.dataset.n) !== right) { s.innerHTML = `<p class="km-gate-t" role="alert">${esc(L.gateWrong)}</p>`; setTimeout(close, 1400); return; }
        st.ended = true;
        if (st.session) await rpc('kid_mode_end', { p_session: st.session, p_reason: 'adult' }).catch(() => {});
        leave(exitTo);
      });
    }
  }
}

// ===========================================================================================================================
// /c/<slug>/work: the teacher grid (staff) or Learning at home + portfolio (family)
// ===========================================================================================================================
const PLACE = { home: 'Home', center: 'Center' };
const LEVEL = { emerging: 'Emerging', developing: 'Developing', secure: 'Secure' };
const FW = {
  en: { title: 'Learning at home', intro: "This week's activities from your child's classroom. Most are done together, away from screens: tap \"We did it\" when you have.", kid: 'Open Kid Mode',
    weDid: 'We did it', undo: 'Undo', note: 'What did your child do or say? (optional)', save: 'Save', thisWeek: 'This week', portfolio: 'Portfolio', empty: 'Nothing recorded yet.',
    minutes: (h, c) => `Time learning in Kid Mode this week: ${h} min at home, ${c} min at the center.`, hub: 'Home learning hub: share photos and videos',
    byKid: 'in Kid Mode', byYou: 'marked by family', byStaff: 'at the center', teacher: 'Teacher note', done: 'Done', moveAlong: 'Move-along (on screen)', together: 'Do it together (off screen)',
    noScreen2: 'Kid Mode opens at the age your center sets (3 unless the center chose otherwise). The do-it-together cards are for every age.', noAge: "Kid Mode needs your child's date of birth on file: ask the center.", noConsent: 'Kid Mode needs your consent first. Saying no never affects enrollment.', privacy: 'Privacy & consent', draft: 'Draft activities: not yet reviewed' },
  es: { title: 'Aprender en casa', intro: 'Las actividades de esta semana del salón de su hijo. Casi todas se hacen juntos, sin pantallas: toque "Lo hicimos" cuando las hagan.', kid: 'Abrir Modo Niños',
    weDid: 'Lo hicimos', undo: 'Deshacer', note: '¿Qué hizo o dijo su hijo? (opcional)', save: 'Guardar', thisWeek: 'Esta semana', portfolio: 'Portafolio', empty: 'Todavía no hay nada.',
    minutes: (h, c) => `Tiempo aprendiendo en el Modo Niños esta semana: ${h} min en casa, ${c} min en el centro.`, hub: 'Aprender en casa: comparta fotos y videos',
    byKid: 'en Modo Niños', byYou: 'marcado por la familia', byStaff: 'en el centro', teacher: 'Nota de la maestra', done: 'Hecho', moveAlong: 'A moverse (en pantalla)', together: 'Hacer juntos (sin pantalla)',
    noScreen2: 'El Modo Niños se abre a la edad que fija su centro (3 años, salvo que el centro elija otra). Las tarjetas para hacer juntos son para todas las edades.', noAge: 'El Modo Niños necesita la fecha de nacimiento de su hijo: pídasela al centro.', noConsent: 'El Modo Niños necesita primero su consentimiento. Decir que no nunca afecta la inscripción.', privacy: 'Privacidad y consentimiento', draft: 'Actividades en borrador: aún sin revisar' },
};

export async function viewWork(ctx) {
  return ctx.c.role === 'family' ? viewFamilyWork(ctx) : viewTeacherGrid(ctx);
}

async function viewFamilyWork(ctx) {
  const { c, shell, page, rpc, esc, friendly, client, lang, live } = ctx;
  const L = FW[lang === 'es' ? 'es' : 'en'];
  page(shell(`<p class="loading">…</p>`), L.title);
  const kids = await rpc('kid_mode_kids', { p_center: c.center_id, p_room: null });
  if (!kids.length) return page(shell(`<div class="card"><h2>${esc(L.title)}</h2><p>${esc(L.empty)}</p></div>`), L.title);
  const want = new URLSearchParams(location.search).get('kid');
  const cur = kids.find((k) => k.kid === want) || kids[0];
  let pf;
  try { pf = await rpc('kid_work_portfolio', { p_center: c.center_id, p_kid: cur.kid }); } catch (e) { return page(shell(`<div class="card"><p class="msg bad" role="alert">${esc(friendly(e))}</p></div>`), L.title); }
  if (pf?.this_week?.activities) pf.this_week.activities = await withSpanish(rpc, pf.this_week.activities, lang);
  const wk = pf.this_week || { activities: [] };
  const tl = pf.time_learning || {};
  const byLabel = (it) => (it.by === 'kid_mode' ? L.byKid : it.by === 'family' ? L.byYou : L.byStaff);
  const weeks = {};
  for (const it of pf.items) (weeks[it.week_start] ||= []).push(it);
  page(shell(`<div class="km-work" id="familyWork">
    ${kids.length > 1 ? `<nav class="tabs" aria-label="Children">${kids.map((k) => `<a href="/c/${esc(c.slug)}/work?kid=${encodeURIComponent(k.kid)}" data-nav${k.kid === cur.kid ? ' aria-current="page"' : ''}>${esc(k.label)}</a>`).join('')}</nav>` : ''}
    <div class="card km-fam-head">${avatarHtml(esc, pf.guide, 'km-av-m')}<div><h2>${esc(L.title)}: ${esc(cur.label)}</h2><p class="muted">${esc(L.intro)}</p>
      <div class="cta-row">${cur.screen_ok ? `<a class="btn gold" href="/c/${esc(c.slug)}/kid" data-nav id="openKid">${esc(L.kid)}</a>` : `<span class="btn gold" aria-disabled="true">${esc(L.kid)}</span>`}</div>
      ${cur.screen_ok ? '' : cur.reason === 'no_consent' ? `<p class="small muted">${esc(L.noConsent)} <a href="/c/${esc(c.slug)}/privacy" data-nav>${esc(L.privacy)}</a></p>` : `<p class="small muted">${esc(cur.reason === 'under_age' ? L.noScreen2 : L.noAge)}</p>`}</div></div>
    <div class="grid two">
      <section class="card" id="weekCard"><h3>${esc(L.thisWeek)}: ${esc(wk.week_theme || '')}</h3>${(wk.activities || []).some((a) => a.content_state === 'draft') ? `<p class="small"><span class="chip warn">${esc(L.draft)}</span></p>` : ''}
        <ul class="km-list">${(wk.activities || []).filter((a) => a.mode === 'off_screen').map((a) => `<li class="km-item${a.done ? ' done' : ''}" data-id="${esc(a.id)}">
          <img src="${esc(friendImg(a.friend))}" alt="" class="km-item-img"><div class="km-item-body"><b>${esc(a.title)}</b>
          <span class="small muted">${esc(a.mode === 'on_screen' ? L.moveAlong : L.together)}</span>
          ${a.mode === 'off_screen' && a.steps?.length ? `<details class="small"><summary>${esc(a.prompt.split(':')[0])}</summary><ol>${a.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></details>` : ''}
          ${a.done ? `<span class="chip ok">${esc(L.done)}${a.sticker ? ` · ${esc(NAME[a.sticker])}` : ''}</span>` : ''}</div>
          ${a.mode === 'off_screen' ? (a.done ? '' : `<button class="btn soft small" type="button" data-mark="${esc(a.id)}">${esc(L.weDid)}</button>`) : ''}</li>`).join('')}</ul>
        <form class="km-noteform" id="markForm" hidden novalidate><label class="f"><span>${esc(L.note)}</span><textarea class="i" id="markNote" rows="2" maxlength="500"></textarea></label>
          <p class="small msg" id="markMsg" role="status"></p><div class="cta-row"><button class="btn navy small" type="submit">${esc(L.save)}</button></div></form></section>
      <section class="card" id="timeCard"><h3>Kid Mode</h3><p id="timeLearning">${esc(L.minutes(Math.round((tl.home_sec || 0) / 60), Math.round((tl.center_sec || 0) / 60)))}</p>
        ${cur.screen_ok ? '' : `<p class="small muted">${esc(cur.reason === 'under_age' ? L.noScreen2 : cur.reason === 'no_consent' ? L.noConsent : L.noAge)}</p>`}
        <a class="btn soft small" href="/c/${esc(c.slug)}/learn?kid=${encodeURIComponent(cur.kid)}" data-nav id="openHub">${esc(L.hub)}</a></section>
    </div>
    <section class="card" id="portfolio"><h3>${esc(L.portfolio)}</h3>${pf.items.length ? Object.entries(weeks).map(([w, list]) => `<h4 class="km-wk">${esc(list[0].week_theme || w)} <span class="small muted">${esc(w)}</span></h4>
      <ol class="km-timeline">${list.map((it) => `<li class="km-entry"><img src="${esc(friendImg(it.friend))}" alt="" class="km-item-img"><div><b>${esc(it.title)}</b>
        <div class="small muted">${esc(it.done_on)} · ${esc(PLACE[it.place])} · ${esc(it.mode === 'on_screen' ? L.moveAlong : L.together)} · ${esc(byLabel(it))}</div>
        ${it.sticker ? `<span class="km-stamp"><img src="${esc(friendImg(it.sticker))}" alt="">${esc(NAME[it.sticker])}</span>` : ''}
        ${it.family_note ? `<p class="small">“${esc(it.family_note)}”</p>` : ''}${it.staff_note ? `<p class="small"><b>${esc(L.teacher)}:</b> ${esc(it.staff_note)}</p>` : ''}
        ${it.photo_path ? `<img class="km-photo" data-path="${esc(it.photo_path)}" alt="">` : ''}
        ${it.mine && it.by === 'family' && !it.staff_note ? `<button class="btn link small" type="button" data-undo="${esc(it.id)}">${esc(L.undo)}</button>` : ''}</div></li>`).join('')}</ol>`).join('') : `<p class="muted">${esc(L.empty)}</p>`}</section></div>`), L.title);
  // photos: short-lived signed links (consent was checked when the photo was taken and is checked by storage policy now)
  for (const im of document.querySelectorAll('img.km-photo[data-path]')) {
    client().storage.from('child-photos').createSignedUrl(im.dataset.path, 300).then((r) => { if (r.data?.signedUrl) im.src = r.data.signedUrl; else im.remove(); });
  }
  let marking = null;
  const form = document.getElementById('markForm');
  document.getElementById('weekCard').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-mark]'); if (!b) return;
    marking = b.dataset.mark; form.hidden = false; b.closest('li').after(form); document.getElementById('markNote').focus();
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try { await rpc('kid_work_mark', { p_center: c.center_id, p_kid: cur.kid, p_activity: marking, p_note: document.getElementById('markNote').value }); live(L.done); viewFamilyWork(ctx); }
    catch (err) { const m = document.getElementById('markMsg'); m.className = 'small msg bad'; m.textContent = friendly(err); }
  });
  document.getElementById('portfolio').addEventListener('click', async (e) => {
    const b = e.target.closest('button[data-undo]'); if (!b) return;
    try { await rpc('kid_work_unmark', { p_id: b.dataset.undo }); viewFamilyWork(ctx); } catch (err) { live(friendly(err)); }
  });
}

async function viewTeacherGrid(ctx) {
  const { c, shell, page, rpc, esc, friendly, client, live } = ctx;
  page(shell('<p class="loading">Opening the room…</p>'), 'Kid Mode & work', { english: true });
  const rooms = ((await client().from('rooms').select('id, data').eq('center_id', c.center_id).order('id')).data || []);
  const want = new URLSearchParams(location.search).get('room');
  const room = rooms.find((r) => r.id === want)?.id || rooms[0]?.id;
  if (!room) return page(shell('<div class="card"><h2>Kid Mode &amp; work</h2><p>No rooms yet.</p></div>'), 'Kid Mode & work', { english: true });
  let g;
  const stepLabels = await loadStepLabels(ctx);
  const stepLang = ctx.uiLang === 'es' ? 'es' : 'en';
  try { g = await rpc('kid_work_room_week', { p_center: c.center_id, p_room: room }); } catch (e) { return page(shell(`<div class="card"><p class="msg bad" role="alert">${esc(friendly(e))}</p></div>`), 'Kid Mode & work', { english: true }); }
  const acts = await withSpanish(rpc, g.activities || [], stepLang);   // titles in the teacher's own language (Spanish DRAFT)
  const cell = (k, a) => {
    const w = k.work.find((x) => x.activity === a.id);
    if (w) return `<td><button type="button" class="km-cell done" data-work="${esc(w.id)}" data-kid="${esc(k.kid)}" aria-label="${esc(k.name)}, ${esc(a.title)}: done ${esc(PLACE[w.place])}${w.level ? `, ${esc(LEVEL[w.level])}` : ''}">
      <span class="km-tick" aria-hidden="true">✓</span><span class="mini">${w.place === 'home' ? 'Home' : 'Center'}</span>${w.level ? `<span class="mini km-lvl">${esc(LEVEL[w.level])}</span>` : ''}${w.staff_note ? '<span class="mini">note</span>' : ''}</button></td>`;
    if (a.mode === 'on_screen') return `<td><span class="km-cell empty" aria-label="${esc(k.name)}, ${esc(a.title)}: not yet">·</span></td>`;
    return `<td><button type="button" class="km-cell mark" data-mark="${esc(a.id)}" data-kid="${esc(k.kid)}" aria-label="Mark ${esc(a.title)} done for ${esc(k.name)}">+</button></td>`;
  };
  const opts = (n, cur) => Array.from({ length: n }, (_, i) => `<option value="${i + 1}"${i + 1 === cur ? ' selected' : ''}>${i + 1}</option>`).join('');
  page(shell(`<div class="km-work" id="teacherGrid">
    <div class="card km-grid-head"><div><h2>Kid Mode &amp; work</h2><p class="muted">Who did which activity this week. Marks only: no totals and no comparing children. Most activities are done off screen; families mark the home ones, you mark the ones done in class.</p></div>
      <div class="cta-row"><a class="btn gold" data-nav href="/c/${esc(c.slug)}/kid?room=${encodeURIComponent(room)}" id="openTablet">Open Kid Mode on this tablet</a></div></div>
    <div class="card km-controls"><label class="f"><span>Room</span><select class="i" id="roomSel">${rooms.map((r) => `<option value="${esc(r.id)}"${r.id === room ? ' selected' : ''}>${esc(r.data?.name || r.id)}</option>`).join('')}</select></label>
      <form id="weekForm" class="km-weekform" novalidate><label class="f"><span>Unit</span><select class="i" id="wkUnit">${opts(12, g.unit)}</select></label>
        <label class="f"><span>Week</span><select class="i" id="wkWeek">${opts(4, g.week)}</select></label><button class="btn navy small" type="submit">Show this week in Kid Mode</button>
        <p class="small msg" id="weekMsg" role="status"></p></form></div>
    <section class="card"><h3>Unit ${g.unit}, week ${g.week}: ${esc(g.week_theme || '')} <span class="chip warn">Draft activities</span></h3>
      <div class="km-scroll" tabindex="0" role="region" aria-label="This week's activities by child"><table class="km-table"><thead><tr><th scope="col">Child</th>${acts.map((a) => `<th scope="col" title="${esc(a.title)}"><img src="${esc(friendImg(a.friend))}" alt=""><span>Day ${a.day}</span><span class="mini">${a.mode === 'on_screen' ? 'Move-along' : 'Together'}</span></th>`).join('')}</tr></thead>
      <tbody>${g.children.map((k) => `<tr><th scope="row">${esc(k.name)}${k.age_band ? ` <span class="mini muted">${esc(k.age_band)}</span>` : ''}</th>${acts.map((a) => cell(k, a)).join('')}</tr>`).join('') || `<tr><td colspan="${acts.length + 1}">No children in this room.</td></tr>`}</tbody></table></div>
      <p class="small muted">✓ done (Home = family marked it or Kid Mode at home; Center = in class). Move-alongs are on screen and only for children 3 and older.</p></section>
    <form class="card" id="evForm" hidden novalidate><h3 id="evTitle">Evidence</h3>
      <label class="f"><span>Teacher note (what the child did or said)</span><textarea class="i" id="evNote" rows="3" maxlength="500"></textarea></label>
      <label class="choice"><input type="checkbox" id="evShare"><span>Share this note with the family</span></label>
      <div class="row two"><label class="f"><span>Learning Step (optional)</span><select class="i" id="evStep"><option value="">None</option></select></label>
      <label class="f"><span>Level (words only)</span><select class="i" id="evLevel"><option value="">None</option><option value="emerging">Emerging</option><option value="developing">Developing</option><option value="secure">Secure</option></select></label></div>
      <label class="f" id="evPhotoF"><span>Photo (only for a child with photo consent)</span><input class="i" type="file" id="evPhoto" accept="image/png,image/jpeg,image/webp"></label>
      <p class="small msg" id="evMsg" role="status"></p><div class="cta-row"><button class="btn navy" type="submit">Save evidence</button><button class="btn link" type="button" id="evRemove">Remove this record</button></div></form>
  </div>`), 'Kid Mode & work', { english: true });
  document.getElementById('roomSel').addEventListener('change', (e) => ctx.go(`/c/${c.slug}/work?room=${encodeURIComponent(e.target.value)}`));
  document.getElementById('weekForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const m = document.getElementById('weekMsg');
    try { await rpc('kid_mode_set_week', { p_center: c.center_id, p_unit: Number(document.getElementById('wkUnit').value), p_week: Number(document.getElementById('wkWeek').value), p_center_cap: null }); live('Saved'); viewTeacherGrid(ctx); }
    catch (err) { m.className = 'small msg bad'; m.textContent = friendly(err); }
  });
  const ev = document.getElementById('evForm');
  let cur = null;
  document.querySelector('.km-table').addEventListener('click', async (e) => {
    const mk = e.target.closest('button[data-mark]');
    if (mk) { try { await rpc('kid_work_mark', { p_center: c.center_id, p_kid: mk.dataset.kid, p_activity: mk.dataset.mark, p_note: null }); live('Marked done'); return viewTeacherGrid(ctx); } catch (err) { return live(friendly(err)); } }
    const wb = e.target.closest('button[data-work]'); if (!wb) return;
    const k = g.children.find((x) => x.kid === wb.dataset.kid); const w = k.work.find((x) => x.id === wb.dataset.work); const a = acts.find((x) => x.id === w.activity);
    cur = { k, w, a };
    document.getElementById('evTitle').textContent = `Evidence: ${k.name}, ${a.title}`;
    document.getElementById('evNote').value = w.staff_note || '';
    document.getElementById('evShare').checked = !!w.shared;
    document.getElementById('evStep').innerHTML = `<option value="">None</option>${stepOptionsHtml(esc, a.learning_steps, { labels: stepLabels, lang: stepLang, selected: w.step, band: k.age_band })}`;
    document.getElementById('evLevel').value = w.level || '';
    document.getElementById('evPhotoF').hidden = !k.photo_consent;
    document.getElementById('evMsg').textContent = '';
    ev.hidden = false; ev.scrollIntoView({ block: 'nearest' }); document.getElementById('evNote').focus();
  });
  ev.addEventListener('submit', async (e) => {
    e.preventDefault();
    const m = document.getElementById('evMsg');
    try {
      let photo = cur.w.photo || null;
      const file = document.getElementById('evPhoto').files[0];
      if (file && cur.k.photo_consent) {
        const id = `ph-work-${crypto.randomUUID()}`, path = `${c.center_id}/${cur.k.kid}/${crypto.randomUUID()}.${(file.type.split('/')[1] || 'png').replace('jpeg', 'jpg')}`;
        const up = await client().storage.from('child-photos').upload(path, file, { contentType: file.type, upsert: false }); if (up.error) throw up.error;
        const ins = await client().from('photos').insert({ center_id: c.center_id, id, data: { kid: cur.k.kid, room, date: centerToday(), kind: 'work', caption: cur.a.title, path } }); if (ins.error) throw ins.error;
        photo = id;
      }
      await rpc('kid_work_evidence', { p_id: cur.w.id, p_note: document.getElementById('evNote').value, p_shared: document.getElementById('evShare').checked,
        p_step: document.getElementById('evStep').value || null, p_level: document.getElementById('evLevel').value || null, p_photo: photo });
      live('Evidence saved'); viewTeacherGrid(ctx);
    } catch (err) { m.className = 'small msg bad'; m.textContent = friendly(err); }
  });
  document.getElementById('evRemove').addEventListener('click', async () => { try { await rpc('kid_work_unmark', { p_id: cur.w.id }); viewTeacherGrid(ctx); } catch (err) { document.getElementById('evMsg').textContent = friendly(err); } });
}
