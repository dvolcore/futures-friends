// The parent dashboard v2's app shell (hub/FAMILY_DASHBOARD.md "Dashboard v2"). Owner 2026-10-12: "the parent can see most of it from
// just their one page and it clicks around versus big scrolls". The left rail swaps whole views in the stage, the tabs at the top of a
// view swap its panels, a drawer slides over for detail; on phones a bottom tab bar (five views, "More" for the rest), swipes between
// views and a bottom sheet. The state lives in the address (?view= &tab= &drawer=), so Back, a reload and a shared link restore it.
//
// This file is the pure part (no DOM): the views and their tabs, their words (EN / ES draft), reading and writing the address.
// tests/family-dashboard-unit.test.mjs imports it.

export const VIEWS = [
  { id: 'overview', icon: 'home', tabs: [] },
  { id: 'today', icon: 'sun', tabs: ['day', 'clock', 'photos'] },
  { id: 'learning', icon: 'learn', tabs: ['week', 'skills', 'portfolio', 'reports'] },
  { id: 'messages', icon: 'chat', tabs: ['teachers', 'waiting', 'friends'] },
  { id: 'care', icon: 'heart', tabs: ['meals', 'rest', 'feelings', 'health'] },
  { id: 'calendar', icon: 'calendar', tabs: ['next', 'attendance', 'bring'] },
  { id: 'billing', icon: 'tuition', tabs: ['balance', 'history'] },
  { id: 'family', icon: 'pickup', tabs: ['pickup', 'kid', 'privacy', 'settings'] },
];
// the phone's bottom bar: the five most used (the last one opens the rest)
export const PHONE_BAR = ['overview', 'today', 'learning', 'messages'];
export const MORE_VIEWS = ['care', 'calendar', 'billing', 'family'];

export const SW = {
  en: {
    views: { overview: 'Overview', today: 'Today', learning: 'Learning', care: 'Care & health', messages: 'Messages', calendar: 'Calendar & events', billing: 'Billing', family: 'Family & settings' },
    short: { overview: 'Overview', today: 'Today', learning: 'Learning', care: 'Care', messages: 'Messages', calendar: 'Calendar', billing: 'Billing', family: 'Family', more: 'More' },
    tabs: {
      week: 'This week', skills: 'Skills', portfolio: 'Portfolio', reports: 'Reports',
      day: 'The day', clock: 'Day clock', photos: 'Moments', waiting: 'Waiting for you', meals: 'Meals', rest: 'Rest', feelings: 'Feelings', health: 'Health',
      teachers: 'Teachers', friends: 'From the friends',
      next: 'Coming up', attendance: 'Attendance', bring: 'What to bring',
      balance: 'Balance', history: 'Invoices & payments',
      pickup: 'Pickup list', kid: 'Kid Mode', privacy: 'Consents', settings: 'Language & more',
    },
    nav: 'Dashboard views', sub: (v) => `${v}: sections`, more: 'More', moreTitle: 'More views', close: 'Close',
    openFull: 'Open full page', swipeHint: 'Swipe left or right to change views',
  },
  es: {
    views: { overview: 'Resumen', today: 'Hoy', learning: 'Aprendizaje', care: 'Cuidado y salud', messages: 'Mensajes', calendar: 'Calendario y eventos', billing: 'Pagos', family: 'Familia y ajustes' },
    short: { overview: 'Resumen', today: 'Hoy', learning: 'Aprender', care: 'Cuidado', messages: 'Mensajes', calendar: 'Calendario', billing: 'Pagos', family: 'Familia', more: 'Más' },
    tabs: {
      week: 'Esta semana', skills: 'Habilidades', portfolio: 'Portafolio', reports: 'Informes',
      day: 'El día', clock: 'Reloj del día', photos: 'Momentos', waiting: 'Esperan su respuesta', meals: 'Comidas', rest: 'Descanso', feelings: 'Emociones', health: 'Salud',
      teachers: 'Maestras', friends: 'De los amigos',
      next: 'Próximamente', attendance: 'Asistencia', bring: 'Qué traer',
      balance: 'Saldo', history: 'Facturas y pagos',
      pickup: 'Quién recoge', kid: 'Modo Niños', privacy: 'Consentimientos', settings: 'Idioma y más',
    },
    nav: 'Vistas de la página', sub: (v) => `${v}: secciones`, more: 'Más', moreTitle: 'Más vistas', close: 'Cerrar',
    openFull: 'Abrir la página completa', swipeHint: 'Deslice a la izquierda o a la derecha para cambiar de vista',
  },
};
export const sw = (lang) => SW[lang === 'es' ? 'es' : 'en'];

export const viewOf = (id) => VIEWS.find((v) => v.id === id) || VIEWS[0];
// the state from the address: an unknown view or tab falls back to the first (a stale shared link never breaks the page)
export function readState(search) {
  const q = new URLSearchParams(search || '');
  const v = viewOf(q.get('view'));
  const tab = v.tabs.includes(q.get('tab')) ? q.get('tab') : (v.tabs[0] || null);
  const drawer = q.get('drawer'), date = q.get('date');
  return { view: v.id, tab, drawer: drawer && /^[a-zA-Z][\w:.-]{0,120}$/.test(drawer) ? drawer : null, date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null };
}
// the address for a state, keeping every other parameter (?kid=, ?lang= …); the defaults are left out so /home stays /home
export function stateSearch(search, { view, tab, drawer, date = undefined }) {
  const q = new URLSearchParams(search || '');
  const v = viewOf(view);
  for (const k of ['view', 'tab', 'drawer']) q.delete(k);
  if (date !== undefined) { q.delete('date'); if (date) q.set('date', date); }   // a past day of the care records (undefined: leave it as it is)
  if (v.id !== 'overview') q.set('view', v.id);
  if (tab && v.tabs.includes(tab) && tab !== v.tabs[0]) q.set('tab', tab);
  if (drawer) q.set('drawer', drawer);
  const s = q.toString();
  return s ? `?${s}` : '';
}
// the neighbour view for a swipe (phones): left = the next one, right = the previous one; stops at the ends
export function neighbour(view, dir) {
  const i = VIEWS.findIndex((v) => v.id === view);
  const j = i + (dir > 0 ? 1 : -1);
  return j >= 0 && j < VIEWS.length ? VIEWS[j].id : null;
}
// arrow keys in a tab list: the index to move to (Home / End / arrows, wrapping)
export function arrowIndex(key, i, n, vertical = false) {
  const next = vertical ? 'ArrowDown' : 'ArrowRight', prev = vertical ? 'ArrowUp' : 'ArrowLeft';
  if (key === next) return (i + 1) % n;
  if (key === prev) return (i - 1 + n) % n;
  if (key === 'Home') return 0;
  if (key === 'End') return n - 1;
  return null;
}

// the day before / after (school days only: Saturday and Sunday are skipped); never past today
export function stepDay(iso, dir, today) {
  const d = new Date(`${iso}T12:00:00Z`);
  do d.setUTCDate(d.getUTCDate() + (dir > 0 ? 1 : -1)); while ([0, 6].includes(d.getUTCDay()));
  const out = d.toISOString().slice(0, 10);
  return dir > 0 && out > today ? null : out;
}
