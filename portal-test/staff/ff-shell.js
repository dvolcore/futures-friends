// The Futures Hub dashboard shell, shared by the staff dashboards v2 (staff-v2-ui.js: teacher, director) and built to the same rules as
// the parent dashboard v2 (family-shell.js / family-v2.css; hub/FAMILY_DASHBOARD.md "Dashboard v2", hub/STAFF_DASHBOARDS.md "Dashboards v2").
// One screen: a left rail of views (plus quick actions), tabs at the top of a view, a glass drawer that slides over (a bottom sheet on
// phones), a bottom tab bar on phones. The state lives in the address (?view= &tab= &drawer=), so Back, a reload and a shared link
// restore it; Back closes a drawer first (app.js asks window.FFOverlay).
//
// Two halves:
//   - pure (no DOM; tests/staff-v2-unit.test.mjs imports them): the icon set, the neon glow ring / bar, the "show as table" figure,
//     the address state for a list of views, arrow-key movement in a tab list;
//   - createShell(): the DOM controller (views, tabs, drawer, swipes, press feedback, count-up, entrance), touching the DOM only when called.
// Classes are ffs-* (ff-shell.css). No inline styles (the CSP has no 'unsafe-inline'): JS only sets custom properties.

const R2 = (n) => Math.round(n * 100) / 100;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const escHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---- icons (24 px stroke icons, the parent dashboard's set plus the staff ones) ---------------------------------------------------
export const ICON = {
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  meal: '<path d="M7 3v8a2 2 0 0 0 2 2v8M7 3v5M10 3v5M17 3c-1.7 0-3 2-3 5s1 4 3 4v9"/>',
  nap: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  toilet: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  mood: '<path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.2 4.3 2.6.7-1.4 2.2-2.6 4.3-2.6 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z"/>',
  incident: '<path d="M12 3l9.5 17h-19zM12 10v4M12 17.2v.3"/>',
  video: '<path d="M4 6h11v12H4zM15 10l5-3v10l-5-3"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z M8 9.5h8M8 12.5h5"/>',
  announcement: '<path d="M4 10v4l11 5V5zM15 9a3 3 0 0 1 0 6M7 14l1 5"/>',
  report: '<path d="M6 3h9l4 4v14H6zM9 12h7M9 16h7M9 8h3"/>',
  calendar: '<path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4"/>',
  tuition: '<path d="M3 7h18v10H3zM7 12h.01M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z"/>',
  arrow: '<path d="M9 5l7 7-7 7"/>',
  sun: '<path d="M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z"/>',
  learn: '<path d="M3 7l9-4 9 4-9 4zM7 9v5c0 1.7 2.2 3 5 3s5-1.3 5-3V9"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-3-5.4 3 1.1-6L3.2 9.4l6.1-.8z"/>',
  pickup: '<path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 12 0v1M16 3.3a4 4 0 0 1 0 7.4M22 21v-1a6 6 0 0 0-4-5.6"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5M8 7h7"/>',
  home: '<path d="M3 11l9-8 9 8M5 9.5V21h14V9.5"/>',
  heart: '<path d="M12 20.5s-7.5-4.5-9.4-9C1.2 8.1 3.3 4.5 6.8 4.5c2.1 0 3.6 1.2 4.3 2.6h1.8c.7-1.4 2.2-2.6 4.3-2.6 3.5 0 5.6 3.6 4.2 7-1.9 4.5-9.4 9-9.4 9zM8 12h2.5l1.5-3 2 5 1.5-2H17"/>',
  grid: '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>',
  clock: '<path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2"/>',
  shield: '<path d="M12 3l7 3v6c0 4.4-3 7.7-7 9-4-1.3-7-4.6-7-9V6z M9 12l2 2 4-4"/>',
  room: '<path d="M3 21V8l9-5 9 5v13M9 21v-6h6v6M3 21h18"/>',
  people: '<path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 12 0v1M16 3.3a4 4 0 0 1 0 7.4M22 21v-1a6 6 0 0 0-4-5.6"/>',
  badge: '<path d="M8 3h8v4H8zM5 7h14v14H5zM12 11a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM8.5 19c.6-1.6 2-2.5 3.5-2.5s2.9.9 3.5 2.5"/>',
  check: '<path d="M4 12l5 5L20 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  gear: '<path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  funnel: '<path d="M3 4h18l-7 8v7l-4 2v-9z"/>',
  pulse: '<path d="M3 12h4l2-6 4 12 2-6h6"/>',
  doc: '<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h6"/>',
  lock: '<path d="M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4"/>',
  med: '<path d="M10.5 3.5a5 5 0 0 1 7 7l-7 7a5 5 0 0 1-7-7zM7 10l7 7"/>',
  fire: '<path d="M12 21c-4 0-7-2.7-7-6.5 0-3 2-5 3.5-6.5.3 2 1.3 3 2.5 3.5C11 8 12 5 14.5 3c.2 3 4.5 5.5 4.5 11.5 0 3.8-3 6.5-7 6.5z"/>',
  swap: '<path d="M7 7h13l-3-3M17 17H4l3 3"/>',
  more: '<path d="M5 12h.01M12 12h.01M19 12h.01"/>',
  alert: '<path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v6M12 16.5v.5"/>',
  pin: '<path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/>',
  ratio: '<path d="M8 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 21v-2a5 5 0 0 1 10 0v2M17 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM15 21v-1.5a4 4 0 0 1 6.5-3"/>',
};
export const icon = (k, cls = 'ffs-ico') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICON[k] || ICON.more}</svg>`;

// ---- the four friends (official art, img/friends): pillars and default avatars ----------------------------------------------------
export const FRIENDS = ['booker', 'lumi', 'zuri', 'bop'];
export { FRIEND_NAME } from './ff-cast.js';
import { FRIEND_NAME } from './ff-cast.js';
// a child's default avatar: their chosen friend (kid_avatars) or a friend picked steadily from the child's id (never a photo: the
// dashboards never show a child's face; photo consent is shown as a mark, the photo stays on the child's page)
export function friendFor(id, chosen = null) {
  if (FRIENDS.includes(chosen)) return chosen;
  let h = 0; for (const ch of String(id || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return FRIENDS[h % 4];
}

// ---- the grown-up cast: ONE table in ff-cast.js (shared with the family dashboard), so a rename or a swap is one edit there ---------
export { CHARACTER, ROLE_CHARACTERS, roomCharacter, adultSrc, adultImg } from './ff-cast.js';

// ---- neon glow rings and bars (owner 2026-10-12: "a definite neon glowing feel"; same drawing as family-viz.js glowRingSvg) --------
const GRAD = { booker: ['#3B8BFF', '#0B5ED7'], zuri: ['#5BD889', '#1F9D52'], lumi: ['#FF7EB6', '#D9488B'], bop: ['#B56CF0', '#8236AE'], gold: ['#FFD25E', '#E7A928'], navy: ['#3A6E86', '#0A2B38'], warn: ['#FF9E6B', '#C2410C'] };
const polar = (cx, cy, r, deg) => { const a = ((deg - 90) * Math.PI) / 180; return [R2(cx + r * Math.cos(a)), R2(cy + r * Math.sin(a))]; };
export function arcPath(cx, cy, r, a0, a1) {
  const [x0, y0] = polar(cx, cy, r, a0), [x1, y1] = polar(cx, cy, r, a1);
  return `M${x0} ${y0}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`;
}
const arcLen = (r, a0, a1) => R2((Math.PI * r * Math.abs(a1 - a0)) / 180);
let gid = 0;
// frac 0..1 (null = nothing to draw: a dashed empty ring, never a made-up zero). segments > 0: one segment per unit, `lit` of them on.
export function glowRingSvg(frac, { tone = 'booker', size = 120, stroke = 12, segments = 0, lit = 0, inner = '' } = {}) {
  const id = `ffg${++gid}`, [c0, c1] = GRAD[tone] || GRAD.navy;
  const c = size / 2, r = c - stroke / 2 - 4;
  const defs = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c0}"/><stop offset="1" stop-color="${c1}"/></linearGradient></defs>`;
  let body = '';
  if (frac == null && !segments) {
    body = `<circle class="ffs-gl-off ffs-gl-none" cx="${c}" cy="${c}" r="${r}" stroke-width="${stroke}"/>`;
  } else if (segments > 0) {
    const gap = Math.min(8, 120 / segments), step = 360 / segments;
    for (let i = 0; i < segments; i++) {
      const a0 = i * step + gap / 2, a1 = (i + 1) * step - gap / 2;
      body += `<path class="${i < lit ? 'ffs-gl-on' : 'ffs-gl-off'}" d="${arcPath(c, c, r, a0, a1)}" ${i < lit ? `stroke="url(#${id})" ` : ''}stroke-width="${stroke}" data-len="${arcLen(r, a0, a1)}"/>`;
    }
  } else {
    const v = clamp(Number(frac) || 0, 0, 1), C = R2(2 * Math.PI * r);
    body = `<circle class="ffs-gl-off" cx="${c}" cy="${c}" r="${r}" stroke-width="${stroke}"/>`;
    if (v > 0) {
      const end = 360 * v - 0.01;
      const full = v >= 0.999;
      body += `<path class="ffs-gl-on" d="${full ? `M${c} ${R2(c - r)}A${r} ${r} 0 1 1 ${R2(c - 0.01)} ${R2(c - r)}` : arcPath(c, c, r, 0, end)}" stroke="url(#${id})" stroke-width="${stroke}" data-len="${R2(C * v)}"/>
        <path class="ffs-gl-core" d="${full ? `M${c} ${R2(c - r)}A${r} ${r} 0 1 1 ${R2(c - 0.01)} ${R2(c - r)}` : arcPath(c, c, r, 0, end)}" stroke-width="${R2(stroke / 3.2)}" data-len="${R2(C * v)}"/>
        <path class="ffs-gl-hi" d="${full ? `M${c} ${R2(c - r + stroke / 4)}A${R2(r - stroke / 4)} ${R2(r - stroke / 4)} 0 1 1 ${R2(c - 0.01)} ${R2(c - r + stroke / 4)}` : arcPath(c, c, r - stroke / 4, 0, end)}" stroke-width="${R2(stroke / 5)}"/>`;
      const [tx, ty] = polar(c, c, r, end);
      body += `<circle class="ffs-gl-tip" cx="${tx}" cy="${ty}" r="${R2(stroke / 2 + 1)}" fill="${c1}"/>`;
    }
  }
  return `<svg class="ffs-glring ffs-gl-${tone}" viewBox="0 0 ${size} ${size}" aria-hidden="true" focusable="false">${defs}${body}${inner}</svg>`;
}
export function glowBarHtml(frac, tone = 'booker') {
  const v = frac == null ? 0 : Math.round(clamp(Number(frac) || 0, 0, 1) * 100);
  return `<span class="ffs-glbar ffs-gb-${tone}${frac == null ? ' ffs-gb-none' : ''}" aria-hidden="true"><span class="ffs-glbar-fill" data-w="${v}"></span></span>`;
}
// a number that counts up (ffs-num); the markup already holds the final value (Reduce Motion shows it at once)
export const moneyCountHtml = (cents, lang = 'en') => `<span class="ffs-num" data-count="${Math.round((Number(cents) || 0) / 100)}" data-prefix="$" data-fmt="n" data-locale="${lang === 'es' ? 'es-US' : 'en-US'}">$${Math.round((Number(cents) || 0) / 100).toLocaleString(lang === 'es' ? 'es-US' : 'en-US')}</span>`;
export const countHtml = (n, suffix = '') => `<span class="ffs-num" data-count="${Number(n)}" data-suffix="${escHtml(suffix)}">${Number(n)}${escHtml(suffix)}</span>`;

// ---- the text equivalent of every chart ---------------------------------------------------------------------------------------
export function tableHtml(esc, { head, rows }, caption = '') {
  return `<table class="ffs-table">${caption ? `<caption>${esc(caption)}</caption>` : ''}<thead><tr>${head.map((h) => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${r.map((x, i) => (i === 0 ? `<th scope="row">${esc(x)}</th>` : `<td>${esc(x)}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
}
// a figure: the graphic, a visually hidden summary, and a "Show as table" toggle with the table (the screen reader's and the
// printer's version). words: { showTable, hideTable }.
export function figureHtml(esc, { id, art, summary, table, words, cls = '' }) {
  const live = /<(a|button)\b/.test(art);   // a picture made of links stays in the reading order; a drawing is hidden (the summary says it)
  return `<figure class="ffs-fig ${cls}" id="${esc(id)}"><div class="ffs-art"${live ? '' : ' aria-hidden="true"'}>${art}</div>
    <figcaption class="ffs-sr">${esc(summary)}</figcaption>
    ${table ? `<button class="ffs-tgl" type="button" aria-expanded="false" aria-controls="${esc(id)}-t" data-on="${esc(words.hideTable)}" data-off="${esc(words.showTable)}">${esc(words.showTable)}</button>
    <div class="ffs-tblwrap" id="${esc(id)}-t" hidden>${table}</div>` : ''}</figure>`;
}

// ---- the address state for a set of views -----------------------------------------------------------------------------------
// views: [{ id, icon, tabs: [] }]; the first view is the default (left out of the address so /home stays /home)
export function shellState(views) {
  const viewOf = (id) => views.find((v) => v.id === id) || views[0];
  function readState(search) {
    const q = new URLSearchParams(search || '');
    const v = viewOf(q.get('view'));
    const tab = v.tabs.includes(q.get('tab')) ? q.get('tab') : (v.tabs[0] || null);
    const drawer = q.get('drawer');
    return { view: v.id, tab, drawer: drawer && /^[a-zA-Z][\w:.-]{0,120}$/.test(drawer) ? drawer : null };
  }
  function stateSearch(search, { view, tab, drawer }) {
    const q = new URLSearchParams(search || '');
    const v = viewOf(view);
    for (const k of ['view', 'tab', 'drawer']) q.delete(k);
    if (v.id !== views[0].id) q.set('view', v.id);
    if (tab && v.tabs.includes(tab) && tab !== v.tabs[0]) q.set('tab', tab);
    if (drawer) q.set('drawer', drawer);
    const s = q.toString();
    return s ? `?${s}` : '';
  }
  function neighbour(view, dir) {
    const i = views.findIndex((v) => v.id === view);
    const j = i + (dir > 0 ? 1 : -1);
    return j >= 0 && j < views.length ? views[j].id : null;
  }
  return { viewOf, readState, stateSearch, neighbour };
}
export function arrowIndex(key, i, n, vertical = false) {
  const next = vertical ? 'ArrowDown' : 'ArrowRight', prev = vertical ? 'ArrowUp' : 'ArrowLeft';
  if (key === next) return (i + 1) % n;
  if (key === prev) return (i - 1 + n) % n;
  if (key === 'Home') return 0;
  if (key === 'End') return n - 1;
  return null;
}

// ==================================================================================================================================
// The first-load reveal (owner 2026-10-12): KPI rings, bars and numbers populate ONE CARD AT A TIME. Each card starts at zero: the arc
// sweeps and its number counts up over REVEAL.duration, then a neon bloom; the next card starts REVEAL.gap later. A tap, a key, a wheel or a
// scroll skips to the end at once. No replay on a room / child switch in the same page: the numbers and arcs move from the old values to
// the new ones instead. Reduce Motion / the Still switch / ?reveal=off (tests, screenshots): nothing moves, the markup's final state shows.
// Only transform, opacity and stroke-dashoffset are animated (the bloom is an ::after layer's opacity / transform; ff-shell.css).
// Shared with the parent dashboard (family-v2-reveal uses the same timings): REVEAL is the one place the numbers live.
export const REVEAL = { duration: 1400, gap: 700, bloom: 650, oldToNew: 700, ease: 'cubic-bezier(.22,1,.36,1)' };
export const revealDisabled = (search = (typeof location === 'undefined' ? '' : location.search)) => /(?:^|[?&])reveal=off(?:&|$)/.test(search);
const revealSeen = new Map();   // key -> Map(card id -> [numbers]) : what this page last showed (no replay, old -> new)
const fmtNum = (v, el) => { const n = Math.round(v); const s = el.dataset.fmt === 'n' ? n.toLocaleString(el.dataset.locale || undefined) : String(n); return `${el.dataset.prefix || ''}${s}${el.dataset.suffix || ''}`; };
export function countTo(el, from, to, ms, delay = 0, onEnd = null) {
  const t0 = performance.now() + delay;
  let raf = 0, stopped = false;
  const done = () => { stopped = true; cancelAnimationFrame(raf); el.textContent = fmtNum(to, el); el.classList.remove('ffs-counting'); onEnd?.(); };
  const step = (t) => {
    if (stopped) return;
    if (t < t0) { el.textContent = fmtNum(from, el); raf = requestAnimationFrame(step); return; }
    el.classList.add('ffs-counting');
    const p = Math.min(1, (t - t0) / ms);
    el.textContent = fmtNum(from + (to - from) * (1 - (1 - p) ** 3), el);
    if (p < 1 && document.visibilityState === 'visible') raf = requestAnimationFrame(step); else done();
  };
  el.textContent = fmtNum(from, el);
  raf = requestAnimationFrame(step);
  const fail = setTimeout(() => { if (!stopped) done(); }, delay + ms + 600);   // a hidden tab or a lost frame still lands on the real figure
  return () => { clearTimeout(fail); if (!stopped) done(); };
}
// cards: the elements to reveal in order. key: one per dashboard (e.g. 'sv2:teacher'). Returns { skip }.
export function revealSequence(cards, { key, motionOn = () => true, search } = {}) {
  const list = [...cards].filter((c) => c.offsetParent !== null);
  const values = new Map(list.map((c, i) => [c.id || `#${i}`, [...c.querySelectorAll('.ffs-num[data-count]')].map((n) => Number(n.dataset.count))]));
  const prev = revealSeen.get(key);
  revealSeen.set(key, values);
  if (!motionOn() || revealDisabled(search)) return { skip() {} };
  const anims = [], stops = [], timers = [];
  const R = REVEAL, E = R.ease;
  const run = (card, i, old) => {
    const delay = old ? 0 : i * R.gap, dur = old ? R.oldToNew : R.duration;
    if (!old) anims.push(card.animate([{ opacity: 0.35, transform: 'translate3d(0,10px,0) scale(.985)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay, easing: E, fill: 'backwards' }));
    for (const p of card.querySelectorAll('[data-len]')) {
      const len = Number(p.dataset.len); if (!len) continue;
      p.style.strokeDasharray = `${len} ${len}`;
      anims.push(p.animate([{ strokeDashoffset: old ? len * 0.5 : len }, { strokeDashoffset: 0 }], { duration: dur, delay, easing: E, fill: 'backwards' }));
    }
    for (const t of card.querySelectorAll('.ffs-gl-tip')) anims.push(t.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: delay + dur - 160, easing: 'linear', fill: 'backwards' }));
    for (const b of card.querySelectorAll('.ffs-glbar-fill, .sv2-fn-fill')) anims.push(b.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: dur, delay, easing: E, fill: 'backwards' }));
    for (const b of card.querySelectorAll('.sv2-col-fill')) anims.push(b.animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: dur, delay, easing: E, fill: 'backwards' }));
    card.querySelectorAll('.ffs-pop').forEach((b, j) => anims.push(b.animate([{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }],
      { duration: Math.min(520, dur), delay: delay + Math.min(j * (dur / 40), dur * 0.6), easing: E, fill: 'backwards' })));
    const nums = [...card.querySelectorAll('.ffs-num[data-count]')];
    nums.forEach((n, j) => stops.push(countTo(n, old ? (old[j] ?? 0) : 0, Number(n.dataset.count), dur, delay)));
    if (!old) timers.push(setTimeout(() => { card.classList.remove('ffs-bloom'); void card.offsetWidth; card.classList.add('ffs-bloom'); }, delay + dur - 120));
  };
  list.forEach((c, i) => run(c, i, prev ? (prev.get(c.id || `#${i}`) || values.get(c.id || `#${i}`)) : null));
  const skip = () => {
    for (const a of anims) { try { a.finish(); } catch (_) { /* gone */ } }
    for (const s of stops) s();
    for (const t of timers) clearTimeout(t);
    off();
  };
  const evs = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
  const onScroll = () => skip();
  function off() { for (const e of evs) window.removeEventListener(e, skip, true); window.removeEventListener('scroll', onScroll); }
  for (const e of evs) window.addEventListener(e, skip, { capture: true, passive: true });
  setTimeout(() => window.addEventListener('scroll', onScroll, { passive: true }), 300);   // the page's own first scroll-to-top is not a skip
  timers.push(setTimeout(off, (prev ? R.oldToNew : list.length * R.gap + R.duration) + R.bloom + 200));
  return { skip };
}

// ==================================================================================================================================
// The DOM controller. cfg:
//   rootId          the dashboard root element's id (rendered by the role module with railHtml / tabbarHtml / viewsHtml below)
//   views, words    the views ({id, icon, tabs}) and their words { views, short, tabs, nav, sub(view), more, moreTitle, close, openFull }
//   phoneBar        the view ids on the phone's bottom bar (the fifth button is "More")
//   esc, live       app.js's escaper and the polite live region
//   buildView(id)   -> the view's inner HTML (panels carry class ffs-panel and data-tab); called once per view, on first show
//   afterBuild(id, el), onTab(view, tab, el)   optional hooks
//   drawer(kind)    -> { title, html, href?, go? } | null (null: nothing to show; a link with data-drawer then follows its href)
//   motionOn()      family-scene.js's switch (Reduce Motion and the Still switch)
export function createShell(cfg) {
  const { rootId, views, words: S, phoneBar, esc, live = () => {}, buildView, afterBuild = () => {}, onTab = () => {}, drawer: drawerBody, motionOn = () => true, reveal = null } = cfg;
  const st = shellState(views);
  const moreViews = views.map((v) => v.id).filter((id) => !phoneBar.includes(id));
  const EASE = 'cubic-bezier(.22,1,.36,1)';
  const ui = st.readState(typeof location === 'undefined' ? '' : location.search);
  const built = new Set();
  const path = typeof location === 'undefined' ? '' : FFTest.pathname();
  let sheet = null, sheetFrom = null;
  const root = () => document.getElementById(rootId);
  const onDash = () => !!(root() && FFTest.pathname() === path);
  const viewHref = (view, tab = null) => `${path}${st.stateSearch(location.search, { view, tab })}`;

  // ---- markup the role module places ----
  function railHtml({ actions = '', badges = {}, head = '' } = {}) {
    return `<aside class="ffs-rail" aria-label="${esc(S.nav)}">${head}
      <nav class="ffs-railnav" aria-label="${esc(S.nav)}"><div class="ffs-viewtabs" id="${rootId}-vt" role="tablist" aria-orientation="vertical" aria-label="${esc(S.nav)}">
        <span class="ffs-pill" id="${rootId}-pill" aria-hidden="true"></span>
        ${views.map((v) => `<a class="ffs-vt" role="tab" id="${rootId}-vt-${v.id}" href="${esc(viewHref(v.id))}" data-view="${v.id}" aria-controls="${rootId}-v-${v.id}" aria-selected="${v.id === ui.view}" tabindex="${v.id === ui.view ? 0 : -1}">
          ${icon(v.icon)}<span>${esc(S.views[v.id])}</span>${badges[v.id] ? `<span class="ffs-badge" aria-label="${esc(badges[v.id].label)}">${esc(badges[v.id].n)}</span>` : ''}</a>`).join('')}
      </div></nav>${actions}</aside>`;
  }
  function tabsHtml() {
    const v = st.viewOf(ui.view);
    return v.tabs.map((t) => `<a class="ffs-tab" role="tab" id="${rootId}-t-${t}" href="${esc(viewHref(v.id, t))}" data-tab="${t}" aria-controls="${rootId}-p-${v.id}-${t}" aria-selected="${t === ui.tab}" tabindex="${t === ui.tab ? 0 : -1}">${esc(S.tabs[t] || t)}</a>`).join('');
  }
  function barHtml(extra = '') {
    return `<header class="ffs-bar" id="${rootId}-bar"><h2 class="ffs-title" id="${rootId}-title">${esc(S.views[ui.view])}</h2>${extra}
      <div class="ffs-tabs" id="${rootId}-tabs" role="tablist" aria-label="${esc(S.sub(S.views[ui.view]))}">${tabsHtml()}</div></header>`;
  }
  function viewsHtml() {
    return `<div class="ffs-views" id="${rootId}-views">${views.map((v) => `<section class="ffs-view" id="${rootId}-v-${v.id}" data-view="${v.id}" role="tabpanel" aria-labelledby="${rootId}-vt-${v.id}" tabindex="-1"${v.id === ui.view ? '' : ' hidden'}></section>`).join('')}</div>`;
  }
  function tabbarHtml() {
    const inMore = moreViews.includes(ui.view);
    return `<nav class="ffs-tabbar" id="${rootId}-tabbar" aria-label="${esc(S.nav)}">${phoneBar.map((id) => `<a class="ffs-tb" href="${esc(viewHref(id))}" data-view="${id}"${id === ui.view ? ' aria-current="page"' : ''}>${icon(st.viewOf(id).icon)}<span>${esc(S.short[id] || S.views[id])}</span></a>`).join('')}
      <button class="ffs-tb" type="button" id="${rootId}-more" aria-haspopup="dialog"${inMore ? ' aria-current="page"' : ''}>${icon('grid')}<span>${esc(S.short.more)}</span></button></nav>`;
  }
  // a panel of a view: role/ids for the tabs
  const panel = (view, tab, html, cls = '') => `<div class="ffs-panel ${cls}" id="${rootId}-p-${view}-${tab}" data-tab="${tab}" role="tabpanel" aria-labelledby="${rootId}-t-${tab}"${tab === ui.tab && view === ui.view ? '' : ' hidden'}>${html}</div>`;

  // ---- history ----
  function writeUrl(mode) {
    const s = st.stateSearch(location.search, ui);
    if (location.search === s) return;
    history[mode === 'push' ? 'pushState' : 'replaceState']({ ...(mode === 'push' ? {} : history.state || {}), ffs: 1 }, '', `${FFTest.pathname()}${s}`);
  }
  function onPop() {
    if (!onDash()) { if (window.FFOverlay === onPop) window.FFOverlay = null; return false; }
    const next = st.readState(location.search);
    if (next.view !== ui.view || next.tab !== ui.tab) showView(next.view, next.tab, { history: null });
    if (next.drawer !== (sheet?.open ? ui.drawer : null)) { if (next.drawer) openDrawer(next.drawer, null, { fromUrl: true }); else if (sheet?.open) animateClose(); }
    ui.drawer = next.drawer;
    return true;
  }

  // ---- views ----
  function build(id, first = false) {
    const sec = document.getElementById(`${rootId}-v-${id}`); if (!sec) return;
    sec.innerHTML = buildView(id);
    built.add(id);
    syncPanels(sec);
    afterBuild(id, sec);
    // the dashboard's own cards (cfg.reveal.cards) reveal one at a time on the first view; the rest rises in as usual
    const cards = reveal ? [...sec.querySelectorAll(reveal.cards)] : [];
    if (cards.length) { settle(sec); entrance(sec, 1, cards); revealSequence(cards, { key: reveal.key, motionOn }); return; }
    if (!first || motionOn()) entrance(sec); else settle(sec);
  }
  function syncPanels(sec) { for (const p of sec?.querySelectorAll(':scope .ffs-panel') || []) p.hidden = p.dataset.tab !== ui.tab; }
  function showView(id, tab, { history: mode = 'push' } = {}) {
    const v = st.viewOf(id);
    const t = v.tabs.includes(tab) ? tab : (v.id === ui.view && v.tabs.includes(ui.tab) && !tab ? ui.tab : (v.tabs[0] || null));
    const prev = ui.view, prevTab = ui.tab;
    Object.assign(ui, { view: v.id, tab: t, drawer: null });
    if (mode) writeUrl(mode);
    const r = root(); if (!r) return;
    r.dataset.view = v.id;
    for (const a of r.querySelectorAll('.ffs-vt')) { const on = a.dataset.view === v.id; a.setAttribute('aria-selected', String(on)); a.tabIndex = on ? 0 : -1; }
    for (const a of r.querySelectorAll('.ffs-tb')) { const on = a.dataset.view ? a.dataset.view === v.id : moreViews.includes(v.id); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }
    if (prev !== v.id) {
      document.getElementById(`${rootId}-title`).textContent = S.views[v.id];
      const tabs = document.getElementById(`${rootId}-tabs`); tabs.innerHTML = tabsHtml(); tabs.setAttribute('aria-label', S.sub(S.views[v.id]));
      const out = document.getElementById(`${rootId}-v-${prev}`), inn = document.getElementById(`${rootId}-v-${v.id}`);
      const dir = views.findIndex((x) => x.id === v.id) > views.findIndex((x) => x.id === prev) ? 1 : -1;
      for (const el of [out, inn]) el?.getAnimations?.().forEach((a) => a.cancel());
      if (!built.has(v.id)) build(v.id); else { syncPanels(inn); if (motionOn()) entrance(inn, 0.5); }
      if (motionOn() && out) {
        inn.hidden = false;
        out.classList.add('ffs-leaving');
        const a = out.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translate3d(${-24 * dir}px,0,0) scale(.985)` }], { duration: 200, easing: 'ease-in' });
        a.onfinish = () => { out.hidden = true; out.classList.remove('ffs-leaving'); };
        a.oncancel = () => { out.hidden = ui.view !== out.dataset.view; out.classList.remove('ffs-leaving'); };
        inn.animate([{ opacity: 0, transform: `translate3d(${36 * dir}px,0,0) scale(.985)` }, { opacity: 1, transform: 'none' }], { duration: 460, easing: EASE });
      } else { if (out) out.hidden = true; inn.hidden = false; }
      window.scrollTo({ top: 0, behavior: 'auto' });
      placePill(true);
      live(S.views[v.id]);
      onTab(v.id, t, inn);
    } else if (t !== prevTab) {
      const tabs = document.getElementById(`${rootId}-tabs`);
      for (const a of tabs.querySelectorAll('[data-tab]')) { const on = a.dataset.tab === t; a.setAttribute('aria-selected', String(on)); a.tabIndex = on ? 0 : -1; }
      const inn = document.getElementById(`${rootId}-v-${v.id}`);
      syncPanels(inn);
      const p = inn.querySelector(`:scope .ffs-panel[data-tab="${t}"]`);
      if (p && motionOn()) entrance(p, 0.6); else settle(p);
      onTab(v.id, t, inn);
    }
  }
  function placePill(animate) {
    const pill = document.getElementById(`${rootId}-pill`), on = root()?.querySelector('.ffs-vt[aria-selected="true"]');
    if (!pill || !on || !on.offsetParent) return;
    const y = on.offsetTop, h = on.offsetHeight, was = pill.dataset.y == null ? null : Number(pill.dataset.y);
    pill.style.setProperty('--y', `${y}px`); pill.style.setProperty('--ph', `${h}px`); pill.dataset.y = String(y);
    if (animate && was != null && was !== y && motionOn()) pill.animate([{ transform: `translate3d(0,${was}px,0)` }, { transform: `translate3d(0,${y}px,0)` }], { duration: 380, easing: EASE });
  }

  // ---- motion ----
  function settle(sec) {
    if (!sec) return;
    for (const b of sec.querySelectorAll('[data-w]')) b.style.setProperty('--w', `${b.dataset.w}%`);
    for (const b of sec.querySelectorAll('[data-h]')) b.style.setProperty('--h', `${b.dataset.h}%`);
    for (const b of sec.querySelectorAll('[data-x]')) b.style.setProperty('--x', `${b.dataset.x}%`);
  }
  function entrance(sec, scale = 1, skipCards = []) {
    if (!sec) return;
    settle(sec);
    if (!motionOn() || revealDisabled()) return;
    const inCard = (el) => skipCards.some((c) => c === el || c.contains(el));
    const items = [...sec.querySelectorAll('[data-a], .ffs-kpi, .ffs-panel:not([hidden]) > .ffs-card, .ffs-grid > .ffs-card')].filter((el) => el.offsetParent !== null && !inCard(el)).slice(0, 28);
    items.forEach((el, i) => el.animate([{ opacity: 0, transform: 'translate3d(0,14px,0) scale(.985)' }, { opacity: 1, transform: 'none' }],
      { duration: 520 * scale, delay: Math.min(i * 40, 420) * scale, easing: EASE, fill: 'backwards' }));
    for (const p of sec.querySelectorAll('[data-len]')) {
      const len = Number(p.dataset.len); if (!len || inCard(p) || !p.closest('svg')?.getBoundingClientRect().width) continue;
      p.style.strokeDasharray = `${len} ${len}`;
      p.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: 1100, delay: 250, easing: EASE, fill: 'backwards' });
    }
    [...sec.querySelectorAll('.ffs-pop')].filter((b) => !inCard(b)).forEach((b, i) => b.animate([{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }],
      { duration: 460, delay: 300 + Math.min(i * 22, 600), easing: EASE, fill: 'backwards' }));
    for (const n of sec.querySelectorAll('.ffs-num[data-count]')) if (!inCard(n)) countUp(n, 0);
  }
  function countUp(el, from = 0) {
    const to = Number(el.dataset.count), suffix = el.dataset.suffix || '';
    if (!Number.isFinite(to) || to === from) { el.textContent = `${to}${suffix}`; return; }
    const t0 = performance.now(), ms = 900;
    const done = () => { el.textContent = `${to}${suffix}`; };
    const fail = setTimeout(done, ms + 400);
    const step = (t) => { const p = Math.min(1, (t - t0) / ms); el.textContent = `${Math.round(from + (to - from) * (1 - (1 - p) ** 3))}${suffix}`; if (p < 1 && document.visibilityState === 'visible') requestAnimationFrame(step); else { clearTimeout(fail); done(); } };
    requestAnimationFrame(step);
  }

  // ---- the drawer: a <dialog>; a right-hand glass slide-over from 768 px, a bottom sheet below. Back closes it. ----
  function sheetEl() {
    if (sheet && document.body.contains(sheet)) return sheet;
    sheet = document.createElement('dialog');
    sheet.className = 'ffs-sheet'; sheet.id = `${rootId}-sheet`; sheet.setAttribute('aria-labelledby', `${rootId}-sheet-h`);
    document.body.appendChild(sheet);
    sheet.addEventListener('cancel', (e) => { e.preventDefault(); closeDrawer(); });
    sheet.addEventListener('click', (e) => { if (e.target === sheet) closeDrawer(); });
    sheet.addEventListener('transitionend', (e) => { if (e.target.classList?.contains('ffs-sheet-panel') && sheet.dataset.state === 'closing') finishClose(); });
    return sheet;
  }
  function moreBody() {
    return { title: S.moreTitle, html: `<ul class="ffs-morelist">${moreViews.map((v) => `<li><a class="ffs-morelink" href="${esc(viewHref(v))}" data-view="${v}">${icon(st.viewOf(v).icon)}<span>${esc(S.views[v])}</span>${icon('arrow')}</a></li>`).join('')}</ul>` };
  }
  function openDrawer(kind, from, opts = {}) {
    window.FFOverlay = onPop;
    const body = kind === 'more' ? moreBody() : drawerBody(kind);
    if (!body) { if (opts.fromUrl) { ui.drawer = null; writeUrl('replace'); } return false; }
    const el = sheetEl();
    sheetFrom = from || sheetFrom || null;
    el.dataset.kind = kind.split(':')[0];
    el.innerHTML = `<div class="ffs-sheet-panel"><div class="ffs-grabber" aria-hidden="true"></div>
      <header class="ffs-sheet-head"><h2 id="${rootId}-sheet-h">${esc(body.title)}</h2><button class="ffs-sheet-x" type="button" aria-label="${esc(S.close)}">${icon('plus')}</button></header>
      <div class="ffs-sheet-body">${body.html}</div>
      ${body.href ? `<a class="btn navy ffs-sheet-go" id="${rootId}-go" href="${esc(body.href)}" data-nav>${esc(body.go || S.openFull)}</a>` : ''}</div>`;
    el.querySelector('.ffs-sheet-x').addEventListener('click', () => closeDrawer());
    el.querySelectorAll('a[data-nav]').forEach((a) => a.addEventListener('click', () => {   // the router follows the link; the drawer goes away
      if (history.state?.ffsSheet) history.replaceState(null, '', `${FFTest.pathname()}${st.stateSearch(location.search, { ...ui, drawer: null })}`);
      finishClose(true);
    }));
    el.querySelectorAll('[data-view]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); finishClose(true);
      if (history.state?.ffsSheet) history.replaceState({ ffs: 1 }, '', `${FFTest.pathname()}${st.stateSearch(location.search, { ...ui, drawer: null })}`);
      showView(a.dataset.view, a.dataset.tab || null, { history: 'push' }); }));
    el.querySelectorAll('.ffs-sheet-body [data-drawer]').forEach((t) => t.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault(); e.stopPropagation(); openDrawer(t.dataset.drawer, sheetFrom);
    }));
    bindToggles(el);
    settle(el);
    bindSwipe(el);
    if (body.bind) body.bind(el);
    const wasOpen = el.open;
    if (!wasOpen) { el.dataset.state = 'closed'; el.showModal(); }
    if (!opts.fromUrl && ui.drawer !== kind) {
      ui.drawer = kind;
      if (wasOpen && history.state?.ffsSheet) writeUrl('replace');
      else history.pushState({ ...(history.state || {}), ffsSheet: 1, ffs: 1 }, '', `${FFTest.pathname()}${st.stateSearch(location.search, ui)}`);
    } else ui.drawer = kind;
    document.documentElement.classList.add('ffs-locked');
    root()?.classList.add('ffs-dim');
    if (motionOn()) requestAnimationFrame(() => requestAnimationFrame(() => { el.dataset.state = 'open'; }));
    else el.dataset.state = 'open';
    if (motionOn()) for (const p of el.querySelectorAll('[data-len]')) { const len = Number(p.dataset.len); if (!len) continue;
      p.style.strokeDasharray = `${len} ${len}`; p.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: 900, delay: 150, easing: EASE, fill: 'backwards' }); }
    live(body.title);
    return true;
  }
  function closeDrawer() {
    if (history.state?.ffsSheet) { history.back(); return; }
    ui.drawer = null; writeUrl('replace');
    animateClose();
  }
  function animateClose() {
    if (!sheet || !sheet.open) return;
    ui.drawer = null;
    const p = sheet.querySelector('.ffs-sheet-panel');
    if (p) p.style.removeProperty('transform');
    if (!motionOn()) return finishClose();
    sheet.dataset.state = 'closing';
    root()?.classList.remove('ffs-dim');
    setTimeout(() => { if (sheet?.dataset.state === 'closing') finishClose(); }, 500);
  }
  function finishClose(navigating = false) {
    if (!sheet) return;
    sheet.dataset.state = 'closed';
    if (sheet.open) sheet.close();
    ui.drawer = null;
    document.documentElement.classList.remove('ffs-locked');
    root()?.classList.remove('ffs-dim');
    if (!navigating) sheetFrom?.focus?.({ preventScroll: true });
    sheetFrom = null;
  }
  function bindSwipe(el) {
    const p = el.querySelector('.ffs-sheet-panel'), scroller = el.querySelector('.ffs-sheet-body');
    let y0 = null, t0 = 0, dy = 0;
    p.addEventListener('pointerdown', (e) => {
      if (window.innerWidth >= 768) return;
      if (e.pointerType === 'mouse' && !e.target.closest('.ffs-grabber,.ffs-sheet-head')) return;
      if (e.target.closest('a,button,input,select,textarea,label') || (scroller.contains(e.target) && scroller.scrollTop > 0)) return;
      y0 = e.clientY; t0 = performance.now(); dy = 0; p.classList.add('ffs-dragging');
    });
    p.addEventListener('pointermove', (e) => { if (y0 == null) return; dy = Math.max(0, e.clientY - y0); p.style.transform = `translate3d(0, ${dy}px, 0)`; });
    const end = () => { if (y0 == null) return; const v = dy / Math.max(1, performance.now() - t0); y0 = null; p.classList.remove('ffs-dragging');
      if (dy > 110 || v > 0.6) closeDrawer(); else p.style.removeProperty('transform'); };
    p.addEventListener('pointerup', end); p.addEventListener('pointercancel', end);
  }
  function bindToggles(scope) {
    scope.addEventListener('click', (e) => {
      const tg = e.target.closest('.ffs-tgl'); if (!tg || !scope.contains(tg)) return;
      const box = document.getElementById(tg.getAttribute('aria-controls')); const open = tg.getAttribute('aria-expanded') !== 'true';
      tg.setAttribute('aria-expanded', String(open)); tg.textContent = open ? tg.dataset.on : tg.dataset.off; if (box) box.hidden = !open;
      tg.closest('.ffs-fig')?.classList.toggle('ffs-tabled', open);
    });
  }

  // ---- binding ----
  function bind() {
    const r = root(); if (!r) return;
    window.FFOverlay = onPop;
    const top = document.getElementById('top');
    if (top) document.documentElement.style.setProperty('--ffs-top', `${top.offsetHeight}px`);
    build(ui.view, true);
    placePill(false);
    r.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      const v = e.target.closest('[data-view]:is(a,button)');
      if (v && r.contains(v)) { e.preventDefault(); showView(v.dataset.view, v.dataset.tab || null, { history: 'push' }); return; }
      const t = e.target.closest('a[data-tab]');
      if (t) { e.preventDefault(); showView(ui.view, t.dataset.tab, { history: 'replace' }); return; }
      if (e.target.closest(`#${rootId}-more`)) { openDrawer('more', e.target.closest('button')); return; }
      const dr = e.target.closest('[data-drawer]');
      if (dr && openDrawer(dr.dataset.drawer, dr)) { e.preventDefault(); e.stopPropagation(); }
    });
    bindToggles(r);
    r.addEventListener('keydown', (e) => {
      const seg = e.target.closest?.('[data-drawer][role=button]');
      if (seg && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openDrawer(seg.dataset.drawer, seg); return; }
      const list = e.target.closest?.('[role=tablist]'); if (!list) return;
      const items = [...list.querySelectorAll('[role=tab]')]; const i = items.indexOf(e.target); if (i < 0) return;
      const j = arrowIndex(e.key, i, items.length, list.getAttribute('aria-orientation') === 'vertical'); if (j == null) return;
      e.preventDefault();
      const it = items[j];
      if (it.dataset.view) showView(it.dataset.view, null, { history: 'push' }); else showView(ui.view, it.dataset.tab, { history: 'replace' });
      (it.dataset.view ? document.getElementById(`${rootId}-vt-${it.dataset.view}`) : document.getElementById(`${rootId}-t-${it.dataset.tab}`))?.focus();
    });
    // press feedback on pointer-down (iOS shows :active late without it)
    r.addEventListener('pointerdown', (e) => { const t = e.target.closest('a,button,summary,[role=button]'); if (!t || !r.contains(t)) return; t.classList.add('is-pressed');
      const up = () => { t.classList.remove('is-pressed'); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
      window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up); });
    // phones: a horizontal swipe on the stage moves to the neighbouring view (never inside a scroller, a chart or a form)
    let x0 = null, y0 = null;
    r.addEventListener('touchstart', (e) => { const t = e.target; if (window.innerWidth >= 768 || t.closest('.ffs-tabs,.ffs-scroll,.ffs-chips,input,select,textarea,svg,table')) { x0 = null; return; }
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    r.addEventListener('touchend', (e) => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
      if (Math.abs(dx) > 80 && Math.abs(dy) < 40) { const n = st.neighbour(ui.view, dx < 0 ? 1 : -1); if (n) showView(n, null, { history: 'push' }); } }, { passive: true });
    window.addEventListener('resize', () => placePill(false), { passive: true });
    if (ui.drawer) openDrawer(ui.drawer, null, { fromUrl: true });
  }

  return { ui, state: st, railHtml, barHtml, viewsHtml, tabbarHtml, panel, bind, showView, openDrawer, closeDrawer, entrance, settle, countUp, viewHref };
}
