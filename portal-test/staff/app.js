// Futures Hub front-end (hub/web): the self-serve tenancy pages on top of migration 20261013100000_self_serve_centers.sql and
// 20261013200000_center_settings_rooms.sql. Runs against the LOCAL hub (served by hub/web/serve.mjs); the anon key is the only key here.
//
//   /                     home: "Start your center" or go to your center's sign-in page; also lands the one-time links the worker
//                         emails (?token_hash=...&type=invite|recovery) and asks for a password
//   /start                "Start your center": center name, web address, kind (child_care | church), state (MO | KS), license, owner
//                         -> center_signup_request -> the owner gets an email link; the center is created once they sign in with it
//   /c/<slug>             the center's own branded sign-in page (center_public_profile: name, colour, open/closed; logo placeholder)
//   /c/<slug>/home        after sign-in: "Get started" for the director (owner flag shown), a short welcome for teachers and families
//   /c/<slug>/staff       "Invite staff"     (center_staff_invites, this center only)
//   /c/<slug>/permissions "Permissions"     (director: what each teacher can open; staff_permissions_save, this center only)
//   /c/<slug>/billing     "Billing"        (director only: plans, children's billing, invoices, payments, ledger reports, QuickBooks files; billing.js)
//   /c/<slug>/families    "Invite families"  (center_family_invites + adding a child, this center only)
//   /c/<slug>/settings    center settings: name, colour, logo (placeholder), rooms and their learning zones
//   /c/<slug>/people      staff and families: remove staff access (termination), remove family access / withdraw a child, unlock
//   /c/<slug>/inbox       the AI inbox (only while the platform switch ai_inbox is on): queue, category chips, draft editor, approve & send
//   /c/<slug>/today       "Today" quick entry (staff with the classroom permission): meals + amounts, drinks, diapering, rests, feelings,
//                         activities, notes for several children in one tap, offline waiting list (today.js, DAILY_REPORT.md)
//   /c/<slug>/habits      "Habit cards" (staff, directors, families): printable QR habit cards for the public habit player (habits-ui.js)
//   /c/<slug>/crm         the enrollment pipeline (crm-ui.js, hub/CRM.md): directors and front desk ('enroll'); ?lead=<id> opens one family
//   /c/<slug>/waitlist-status, /tour, /unsubscribe, /reenroll   the family's signed links (?t=), signed out, English + Spanish
//   /c/<slug>/learn       "Home learning" (home-learning.js, hub/HOME_LEARNING.md): families: this week at school -> do it at home, uploads,
//                         time learning (no cap), portfolio; staff: the room's family uploads (react, comment, portfolio)
//   /account              your account: password, email, two-step, signed-in devices, "Sign out everywhere", recent security events
//   /c/<slug> also offers "Forgot your password?" (recovery email, lands on /?...&type=recovery). Idle sign-out follows the
//   platform switch idle_timeout (security_session_policy). Migrations 20261015100000_auth_ready.sql, 20261015200000_ai_inbox.sql.
// Roles: director (with the owner flag from my_centers), teacher, family. Directors work in a two-step (AAL2) session.
// Every query names the center it works in; row-level security is what actually keeps centers apart.
// Language (English + Spanish DRAFT, ./i18n.js): the family-facing views (home, one-time links, choose a password, /c/<slug> sign-in,
// "not part of", a family's /c/<slug>/home, errors) follow the person's language; the switch in the header saves it to
// family_profiles.preferred_language when signed in (and localStorage always). Since 2026-10-10 staff and director views follow the
// same per-person choice (their own screens only: what a family receives follows the family's choice): they render their English
// source text and ./i18n-es.js, loaded only when Spanish is on, puts the Spanish catalog on screen (hub/I18N_COVERAGE.md).

import { bindFlips, pickLocale, setUiLang, storedLanguage, storeLanguage, t as translate, localeOf, setDisplayTz } from './i18n.js';
import { ZONES, centerToday, centerTz, deviceZone, setCenterTz, validZone, zoneAbbrev, zoneLabel } from './center-time.js';   // the center's time zone (hub/TIME_ZONES.md)
import { libraryTile, renderShares, viewLibrary } from './library-ui.js';
import { viewCurriculum } from './curriculum-ui.js';
import { viewKidMode, viewWork } from './kid-mode.js';
import { familyReportsCardHtml, viewGrades } from './grades.js';
import { familyAdaptCardHtml, viewAdapt } from './accommodations.js';
import { viewCheckpoints } from './checkpoints.js';   // checkpoints and conference reports (hub/CHECKPOINTS.md)   // classroom adaptations + early-intervention notes (ACCOMMODATIONS.md)
import { viewLicensing } from './licensing.js';   // state rules, training hours, inspector records, CACFP, subsidy (hub/STATE_RULES.md)
import { viewHomeLearning } from './home-learning.js';
import { viewHomeSchool, viewHomeSignup } from './home-school.js';   // Futures at Home, the virtual center + its subscription (hub/FUTURES_AT_HOME_VIRTUAL.md)
import { viewContentReview } from './content-review.js';   // /hq/content: the content reviewers' queue (hub/CONTENT_WORKFLOW.md)
import { mountKidVideos } from './kid-videos.js';

import { mountCare } from './care.js';
import { mountKidLanguage } from './kid-language-ui.js';   // the child's home language and Kid Mode words (bilingual)
import { mountPermissions } from './permissions.js';
import { mountRecovery } from './recovery-ui.js';
import { mountArrivals } from './arrivals.js';   // arrivals, kiosk, pickup lists (N2: was the website portal)
import { mountCareDesk } from './care-desk.js';   // meals, family reports, program, rhythm, safety, compliance (N2)
import { mountCharmsg } from './charmsg.js';
import { mountTimeclock } from './timeclock.js';
import { mountBilling } from './billing.js';
import { mountPrivacy } from './privacy.js';
import { mountNetwork } from './network-dashboard.js';   // HQ network + organization dashboards (docs/ops/NETWORK_DASHBOARDS.md)
import { mountHabits } from './habits-ui.js';
import { mountNotify } from './notify-ui.js';
import { mountMessagePrefs } from './message-prefs-ui.js';   // a family's message settings on /account (hub/PORTAL_RETIREMENT.md)
import { mountPlan } from './plan-ui.js';     // teacher planning, room roster, substitute sheet (hub/TEACHER_PLANNING.md)
import { mountHelp } from './help-ui.js';     // parent help page + director help desk (hub/HELP_DESK.md)
import { mountToday } from './today.js';
import { mountChat } from './chat.js';
import { viewFamilyDashboard } from './family-dashboard.js';
import { crestHtml, viewSigninPage } from './family-signin.js';   // the center's sign-in page (hub/FAMILY_DASHBOARD.md "The sign-in page")
import { mountCalendar } from './calendar-ui.js';   // the center calendar: closures, built-in holidays (hub/TEACHER_PLANNING.md)
import { mountIncident } from './incident-ui.js';   // one incident report: read and acknowledge (deep link from the notification)
import { deepNote, missText } from './deeplink.js';
import { deriveSpine, installMotion, loadSpine, renderSpine } from './spine.js';
import { bindGroupedNav, groupedNavHtml, mountStaffDashboard } from './staff-dashboard.js';   // staff dashboards (hub/STAFF_DASHBOARDS.md)
import { mountStaffV2 } from './staff-v2-ui.js';   // staff dashboards v2: teacher + director homes on the shared shell (hub/STAFF_DASHBOARDS.md "Dashboards v2")
import { mountCrm } from './crm-ui.js';   // the enrollment pipeline and the family link pages (hub/CRM.md)
import { mountHiring } from './hiring.js';   // the hiring desk and the candidate page (hub/ATS.md)
import { mountAbsence } from './absence.js';   // families report an absence / late arrival / early pickup (hub/ABSENCES.md)
import { mountFamilyBilling } from './family-billing.js';   // the family's own billing page (hub/FAMILY_BILLING.md)
import { mountRosterImport } from './roster-import-ui.js';   // importing the roster from another program (hub/ROSTER_IMPORT.md)
import { SSO_REASON_KEY, enforceStaffSso, startGoogleSignIn } from './sso.js';   // N17 Google sign-in for staff (docs/ops/GOOGLE_SIGNIN.md)
import { mountHealth, healthLinkHtml } from './health.js';   // health records: immunizations, plans, medication record, illness log (hub/HEALTH_RECORDS.md)
const sped = () => import('./special-education.js');   // IEP / IFSP plans, goals, progress (hub/SPECIAL_EDUCATION.md), loaded when used

const CFG = window.FF_HUB_WEB || {};
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const main = () => $('#main');
const live = (t) => { const l = $('#live'); if (l) { l.textContent = ''; setTimeout(() => { l.textContent = t; }, 30); } };

// ---- language -------------------------------------------------------------------------------------------------------------
let lang = setUiLang(storedLanguage() || 'en');   // the person's language, every role (i18n.js uiLang() for the modules)
let langLoadedFor = null;                // the signed-in user whose saved choice has been read
const T = (key, vars) => translate(key, vars, lang);
// The Spanish catalog (i18n-es.js) is fetched the first time Spanish is on; its observer then keeps every view in Spanish as it
// renders (staff views write English source text). tr() is for text that never reaches the page's DOM (confirm(), titles).
let es = null;
async function loadEs() {
  if (lang !== 'es' || es) return;
  try { es = await import('./i18n-es.js'); es.installDomTranslator(document.body, () => lang); } catch (_) { es = null; /* the page still works, in English */ }
}
const tr = (s) => (es && lang === 'es' ? es.translateText(s) : s);
async function syncLanguage(s) {
  if (!s || langLoadedFor === s.user.id) return;
  langLoadedFor = s.user.id;
  try {
    const saved = await rpc('my_preferred_language');
    if (saved) { lang = setUiLang(saved); storeLanguage(lang); }
    else if (lang !== 'en') await rpc('set_my_preferred_language', { p_lang: lang });   // chosen before signing in: keep it
  } catch (_) { /* the page still works in the language on screen; the next sign-in tries again */ langLoadedFor = null; }
}
// Signed in, the choice is saved to the account first; if that fails, the page stays in the previous language and says why.
async function setLanguage(next) {
  const prev = lang, want = pickLocale(next);
  const s = await session().catch(() => null);
  if (s) {
    try { await rpc('set_my_preferred_language', { p_lang: want }); langLoadedFor = s.user.id; }
    catch (e) {
      lang = setUiLang(prev); storeLanguage(prev);
      await render();
      const msg = friendly(e);
      live(msg);
      const m = $('#langMsg'); if (m) { m.className = 'small msg bad'; m.textContent = msg; }
      return;
    }
  }
  lang = setUiLang(want);
  storeLanguage(lang);
  if (lang === 'en' && es) es.restoreTree(document.body);
  await render();
  live(T('lang.saved'));
}

export const KIND = { child_care: 'Child care', church: 'Church program' };
export const JOB_ROLES = [
  ['teacher', 'Teacher'], ['lead_teacher', 'Lead teacher'], ['assistant_teacher', 'Assistant teacher'], ['director', 'Director'],
  ['assistant_director', 'Assistant director'], ['floater', 'Floater'], ['substitute', 'Substitute'], ['aide', 'Aide'], ['cook', 'Cook'],
  ['driver', 'Driver'], ['volunteer', 'Volunteer'], ['other', 'Other staff'],
];
const FACILITY = {
  child_care_center: 'Licensed child care center', preschool: 'Preschool', family_home: 'Family child care home',
  group_home: 'Group child care home', school_age: 'School-age program', license_exempt_religious: 'License-exempt religious program (Missouri)',
};
const STATUS_CHIP = { held: ['', 'Held: not sent yet'], pending: ['warn', 'Sending'], invited: ['gold', 'Invited'], active: ['ok', 'Signed in'], blocked: ['bad', 'Needs attention'], cancelled: ['', 'Cancelled'] };

export function slugify(s) {
  return String(s ?? '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, '');
}
export const initials = (name) => String(name ?? '').replace(/^TEST\s+/i, '').split(/\s+/).filter((w) => /^[A-Za-z0-9]/.test(w))
  .slice(0, 2).map((w) => w[0].toUpperCase()).join('') || 'F';
const HEX = /^#[0-9a-f]{6}$/i;
function setCenterColour(hex) { document.documentElement.style.setProperty('--center', HEX.test(hex || '') ? hex : '#0A2B38'); }

// ---- the hub client ------------------------------------------------------------------------------------------------------
let sb = null;
function client() {
  if (sb) return sb;
  if (!window.supabase?.createClient || !CFG.url || !CFG.anonKey) throw new Error(T('err.config'));
  sb = window.supabase.createClient(CFG.url, CFG.anonKey, {
    auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'ff-hub-web-auth' },
  });
  return sb;
}
const friendly = (e) => {
  const m = String(e?.message || e || 'Something went wrong. Reload the page and try again.');
  if (/row-level security|permission denied/i.test(m)) return T('err.access');
  if (/Invalid login credentials/i.test(m)) return T('err.login');
  if (/too many attempts|locked/i.test(m)) return T('err.locked');
  if (/rate limit/i.test(m)) return T('err.rate');
  if (/Failed to fetch|NetworkError/i.test(m)) return T('err.network');
  return m.charAt(0).toUpperCase() + m.slice(1);
};
async function rpc(name, args) {
  const r = await client().rpc(name, args);
  if (r.error) throw r.error;
  return r.data;
}
async function session() { return (await client().auth.getSession()).data.session; }

// ---- routing ---------------------------------------------------------------------------------------------------------------
export function parseRoute(pathname) {
  const p = pathname.replace(/\/+$/, '') || '/';
  if (p === '/') return { name: 'home' };
  if (p === '/start') return { name: 'start' };
  if (p === '/account') return { name: 'account' };
  if (p === '/hq') return { name: 'hq' };
  if (p === '/hq/content') return { name: 'hq-content' };     // content reviewers of record (hub/CONTENT_WORKFLOW.md)
  if (p === '/at-home') return { name: 'at-home' };           // Futures at Home: learn at home without a center (hub/FUTURES_AT_HOME_VIRTUAL.md)
  if (p === '/ops/errors') return { name: 'opsErrors' };   // HQ: captured errors (ops-errors.js, docs/ops/ERROR_TRACKING.md)
  const n = p.match(/^\/n\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/);   // a device notification (sw.js): its opaque id
  if (n) return { name: 'open', id: n[1] };
  const cand = p.match(/^\/candidate\/([0-9a-f]{48})$/);   // a candidate's own page (hiring.js): the link's token is the key
  if (cand) return { name: 'candidate', token: cand[1] };
  const e = p.match(/^\/enroll\/([0-9a-f]{32,96})$/);
  if (e) return { name: 'enroll', token: e[1] };
  const sp = p.match(/^\/c\/([a-z0-9-]{3,40})\/child\/([A-Za-z0-9_.-]{1,80})\/plan$/);   // a child's support plan (special-education.js)
  if (sp) return { name: 'center', slug: sp[1], tab: 'sped', kid: sp[2] };
  const k = p.match(/^\/c\/([a-z0-9-]{3,40})\/child\/([A-Za-z0-9_.-]{1,80})$/);
  if (k) return { name: 'center', slug: k[1], tab: 'child', kid: k[2] };
  const pl = p.match(/^\/c\/([a-z0-9-]{3,40})\/player\/([A-Za-z0-9_.-]{1,80})$/);
  if (pl) return { name: 'center', slug: pl[1], tab: 'player', kid: pl[2] };
  const m = p.match(/^\/c\/([a-z0-9-]{3,40})(?:\/(home|staff|plan|roster|sub|help-desk|help|permissions|billing|timeclock|clock|families|import|settings|enroll|children|support|people|inbox|library|curriculum|messages|chat|privacy|consents|habits|work|kid|today|learn|grades|checkpoints|adapt|videos|calendar|incident|crm|waitlist-status|tour|unsubscribe|reenroll|hiring|licensing|absence|billing-family|devices|home-school|kitchen|recovery|organization|arrivals|meals|reports|program|rhythm|safety|compliance|pickup|health|plans|goal-entry|moments))?$/);
  if (m) return { name: m[2] ? 'center' : 'signin', slug: m[1], tab: m[2] || null };
  return { name: 'notfound' };
}
function go(path, replace = false) {
  if (replace) history.replaceState(null, '', path); else history.pushState(null, '', path);
  render();
}
// ---- back to the exact page after signing in (deep links from a notification, an email or a device notification) ---------------
// The page asked for is kept in ?next= on the sign-in page and in localStorage for an hour (a sign-in link opens in a new tab).
// Only a path of this center, or /n/<id>, is ever followed: never another site, never another center.
const NEXT_KEY = 'ff-hub-next';
export function safeNext(v, slug = null) {
  if (typeof v !== 'string' || v.length > 400 || v.startsWith('//') || !/^\/[A-Za-z0-9/_.~?=&%:-]*$/.test(v) || /(^|\/)\.\.?(\/|$|\?)/.test(v)) return null;
  if (/^\/n\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v)) return v;
  if (slug ? v.startsWith(`/c/${slug}/`) : /^\/c\/[a-z0-9-]{3,40}\//.test(v)) return v;
  return null;
}
function rememberNext(path) { try { localStorage.setItem(NEXT_KEY, JSON.stringify({ path, at: Date.now() })); } catch (_) { /* private mode: ?next= still works */ } }
function takeNext(slug) {
  const fromUrl = safeNext(new URLSearchParams(location.search).get('next'), slug);
  let kept = null;
  try {
    const j = JSON.parse(localStorage.getItem(NEXT_KEY) || 'null');
    localStorage.removeItem(NEXT_KEY);
    if (j && Date.now() - j.at < 3600000) kept = safeNext(j.path, slug);
  } catch (_) { /* nothing kept */ }
  return fromUrl || kept;
}
const nextQuery = (slug) => { const n = safeNext(new URLSearchParams(location.search).get('next'), slug); return n ? `?next=${encodeURIComponent(n)}` : ''; };

document.addEventListener('click', (e) => {
  const a = e.target.closest && e.target.closest('a[data-nav]');
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
  e.preventDefault();
  go(a.getAttribute('href'));
});
// Back with a sheet open closes the sheet and stays on the page (family-dashboard.js sets window.FFOverlay; Apple HIG: Back dismisses what is on top)
window.addEventListener('popstate', () => { if (typeof window.FFOverlay === 'function' && window.FFOverlay()) return; if (!window.FFKidModeLock) render(); });
bindFlips(document);   // "Ver en español / See in English" on two-version messages, announcements and reports (i18n.js flipBlock)   // Kid Mode handles its own back button (kid-mode.js)

// english: a staff / director view written in English source text; in Spanish the catalog (i18n-es.js) translates it on screen.
// Every Spanish view carries the glossary's draft label.
let pendingNote = null;     // a note for the next page (deeplink.js deepNote): why the person landed here instead
function page(html, title, { english = false } = {}) {
  void english;
  document.documentElement.lang = lang;
  const draft = lang === 'es' ? `<p class="small muted wrap draft-note" lang="es" id="draftNote">${esc(T('lang.draft'))}</p>` : '';
  main().innerHTML = html + draft;
  document.title = title ? `${tr(title)} · Futures Hub` : 'Futures Hub';
  langButton();
  main().focus({ preventScroll: true });
  window.scrollTo(0, 0);
  if (pendingNote && $('#centerSpace')) { const t = pendingNote; pendingNote = null; deepNote(t, lang); $('#deepMiss')?.setAttribute('data-note', 'not-allowed'); }
}
// Notifications (notify-ui.js): the bell in the header of every signed-in page, and the settings card on /account.
let notifyApi = null;
let msgPrefsApi = null;
const msgPrefs = () => (msgPrefsApi ||= mountMessagePrefs({ esc, $, rpc, live, getLang: () => lang, friendly }));
const notify = () => (notifyApi ||= mountNotify({ esc, $, rpc, go, live, getLang: () => lang, vapidKey: CFG.vapidPublicKey }));
// The header: the language switch (every role, every view), then "Start your center" or the account and "Sign out".
async function topNav(s) {
  const nav = $('#topNav');
  if (!nav) return;
  const sw = '<button class="btn link small" type="button" id="langSwitch"></button>';
  if (!s) { notify().stop(); nav.innerHTML = `${sw}<a class="btn soft small" href="/start" data-nav id="navStart">${esc(T('nav.start'))}</a>`; }
  else {
    nav.innerHTML = `${sw}<a class="who" href="/account" data-nav id="accountLink" title="${esc(T('nav.account'))}">${esc(s.user.email)}</a><button class="btn soft small" type="button" id="signOut">${esc(T('nav.signOut'))}</button>`;
    $('#signOut').onclick = async () => { notify().stop(); await client().auth.signOut(); langLoadedFor = null; setCenterColour(null); go('/'); live(T('nav.signedOut')); };
    notify().install(nav);
    idleWatch(s);
  }
  $('#langSwitch').onclick = () => setLanguage(lang === 'es' ? 'en' : 'es');
  langButton();
}
// Called by page(): the label is always in the OTHER language, so someone who cannot read the current one can still find it.
function langButton() {
  const b = $('#langSwitch');
  if (!b) return;
  b.hidden = false;
  const other = lang === 'es' ? 'en' : 'es';
  b.textContent = translate('lang.switch', {}, lang);
  b.setAttribute('lang', other);
  b.setAttribute('translate', 'no');
  b.setAttribute('aria-label', translate('lang.switchLabel', {}, lang));
  const shown = lang;
  const out = $('#signOut'); if (out) out.textContent = translate('nav.signOut', {}, shown);
  const st = $('#navStart'); if (st) st.textContent = translate('nav.start', {}, shown);
}

let rendering = 0;
async function render() {
  const n = ++rendering;
  const route = parseRoute(FFTest.pathname());
  if (!(route.name === 'center' && route.tab === 'kid')) document.body.classList.remove('kidmode');
  document.body.classList.remove('fp-scene', 'fp-fam', 'ffs-staff');   // the family pages' light glass look (family-signin.js, family-dashboard.js) is set by those views
  let s = null;
  try { s = await session(); } catch (e) { page(`<div class="wrap narrow"><div class="card"><h1>Futures Hub</h1><p class="msg bad">${esc(friendly(e))}</p></div></div>`); return; }
  await syncLanguage(s);
  await loadEs();
  if (n !== rendering) return;
  await topNav(s);
  if (route.name !== 'signin' && route.name !== 'center') setCenterColour(null);
  try {
    if (route.name === 'home') return await viewHome(s);
    if (route.name === 'start') return viewStart();
    if (route.name === 'account') return await viewAccount(s);
    if (route.name === 'hq') return await network().viewHq(s);
    if (route.name === 'hq-content') {
      if (!s) { rememberNext('/hq/content'); return go('/', true); }
      return await viewContentReview({ page, esc, rpc, friendly, go, live });
    }
    if (route.name === 'at-home') return await viewHomeSignup({ page, esc, rpc, friendly, go, lang, signedIn: !!s });
    if (route.name === 'opsErrors') return await (await import('./ops-errors.js')).viewOpsErrors({ s, page, rpc, esc, go });
    if (route.name === 'open') return await viewOpen(route.id, s);
    if (route.name === 'enroll') return await care().viewEnroll(route.token, { chosen: !!storedLanguage(), useLang: async (l) => { lang = setUiLang(l); await loadEs(); } });
    if (route.name === 'candidate') return await hiring().viewCandidate(route.token);
    if (route.name === 'signin') return await viewSignin(route.slug, s);
    if (route.name === 'center') return await viewCenter(route.slug, route.tab, s, route.kid);
    page(`<div class="wrap narrow"><div class="card"><h1>${esc(T('notfound.title'))}</h1><p>${esc(T('notfound.body'))}</p>
      <a class="btn navy" href="/" data-nav>${esc(T('common.goHub'))}</a></div></div>`, T('notfound.title'));
  } catch (e) {
    page(`<div class="wrap narrow"><div class="card"><h1>${esc(T('err.title'))}</h1><p class="msg bad" role="alert">${esc(friendly(e))}</p>
      <a class="btn navy" href="/" data-nav>${esc(T('common.startAgain'))}</a></div></div>`, T('err.title'));
  }
}

// ---- home + one-time links from the worker's emails -----------------------------------------------------------------------
async function viewHome(s) {
  const q = new URLSearchParams(location.search);
  if (q.get('token_hash') && ['invite', 'recovery', 'magiclink', 'email'].includes(q.get('type'))) return landLink(q.get('token_hash'), q.get('type'));
  if (s) {
    const mine = await rpc('my_centers');
    if (mine.length === 1) return go(`/c/${mine[0].slug}/home`, true);
    return page(`<div class="wrap narrow"><div class="card"><h1>${esc(T('home.yourCenters'))}</h1>
      ${mine.length ? `<ul class="list">${mine.map((c) => `<li><span class="who"><b>${esc(c.name)}</b><span class="small muted">${esc(KIND[c.org_kind] || '')} · ${esc(c.role === 'family' ? T('role.family') : roleLabel(c))}</span></span>
        <a class="btn navy small" href="/c/${esc(c.slug)}/home" data-nav>${esc(T('common.open'))}</a></li>`).join('')}</ul>`
        : `<p class="empty">${esc(T('home.noCenter'))}</p>`}
      </div></div>`, T('home.yourCenters'));
  }
  page(`<div class="wrap">
    <section class="hero"><h1>${esc(T('home.heroTitle'))}</h1>
      <p class="lead">${esc(T('home.heroLead'))}</p>
      <div class="cta-row"><a class="btn gold" href="/start" data-nav>${esc(T('nav.start'))}</a></div></section>
    <div class="grid two">
      <div class="card"><h2>${esc(T('home.haveCenter'))}</h2><p class="muted">${esc(T('home.haveCenterBody'))}</p>
        <form id="findForm" novalidate><label class="f"><span>${esc(T('home.address'))}</span>
          <div class="addr"><span class="pre">/c/</span><input class="i" id="findSlug" name="slug" autocomplete="off" spellcheck="false" placeholder="sunrise-kids" required></div></label>
          <p class="msg" id="findMsg" role="status"></p>
          <button class="btn navy" type="submit">${esc(T('home.goSignin'))}</button></form></div>
      <div class="card"><h2>${esc(T('home.how'))}</h2><ol class="steps">
        <li><span>${T('home.how1')}</span></li>
        <li><span>${T('home.how2')}</span></li>
        <li><span>${T('home.how3')}</span></li></ol></div>
    </div></div>`, 'Futures Hub');
  $('#findForm').onsubmit = async (e) => {
    e.preventDefault();
    const slug = slugify($('#findSlug').value);
    if (slug.length < 3) { $('#findMsg').className = 'msg bad'; $('#findMsg').textContent = T('home.addressBad'); return; }
    go(`/c/${slug}`);
  };
}

// /n/<id>: a device notification was tapped (sw.js). The push itself carried only this opaque id; signed in, the page asks
// notification_open (own rows only, marks it read) where it points and goes there. Signed out: sign in, then it comes back here.
async function viewOpen(id, s) {
  const es = lang === 'es';
  if (!s) {
    rememberNext(`/n/${id}`);
    page(`<div class="wrap narrow"><div class="card" id="openSignin"><h1>${esc(es ? 'Inicie sesión para verlo' : 'Sign in to see it')}</h1>
      <p>${esc(es ? 'Inicie sesión en la página de su centro. Después de iniciar sesión, se abre esta actualización.' : 'Sign in on your center\'s page. Once you are signed in, this update opens.')}</p>
      <a class="btn navy" href="/" data-nav>${esc(T('common.goHub'))}</a></div></div>`, es ? 'Iniciar sesión' : 'Sign in');
    return;
  }
  let n = null, err = null;
  try { n = await rpc('notification_open', { p_id: id }); } catch (e) { err = e; }
  if (n && n.link && safeNext(n.link)) return go(n.link, true);
  notify().refresh();
  page(`<div class="wrap narrow"><div class="card" id="openMissing"><h1>${esc(n ? n.title : (es ? 'Aviso' : 'Notification'))}</h1>
    ${n ? (n.body ? `<p>${esc(n.body)}</p>` : '') : `<p class="msg warn" role="alert">${esc(err ? friendly(err) : (es ? 'Este aviso ya no está disponible en esta cuenta.' : 'This notification is not available on this account any more.'))}</p>`}
    <a class="btn navy" href="/" data-nav>${esc(T('common.goHub'))}</a></div></div>`, es ? 'Aviso' : 'Notification');
}

async function landLink(tokenHash, type) {
  page(`<div class="wrap narrow"><div class="card"><h1>${esc(T('link.checking'))}</h1></div></div>`, T('link.signingIn'));
  const r = await client().auth.verifyOtp({ token_hash: tokenHash, type });
  history.replaceState(null, '', '/');
  if (r.error) {
    return page(`<div class="wrap narrow"><div class="card"><h1>${esc(T('link.expiredTitle'))}</h1>
      <p>${esc(T('link.expiredBody'))}</p>
      <p class="msg bad" role="alert">${esc(friendly(r.error))}</p><a class="btn navy" href="/" data-nav>${esc(T('common.goHub'))}</a></div></div>`, T('link.expiredShort'));
  }
  // render() read the language before this link signed the person in: read their saved choice now (a Spanish invitation sets it)
  const signedIn = r.data?.session || await session();
  await syncLanguage(signedIn);
  await topNav(signedIn);
  if (type === 'invite' || type === 'recovery') return viewSetPassword();
  return afterSignIn(null);
}

function viewSetPassword() {
  page(`<div class="wrap narrow"><div class="card"><h1>${esc(T('pw.title'))}</h1>
    <p class="muted">${esc(T('pw.lead'))}</p>
    <form id="pwForm" novalidate>
      <label class="f"><span>${esc(T('pw.new'))} <span class="hint">${esc(T('pw.hint'))}</span></span><input class="i" type="password" id="pw1" autocomplete="new-password" minlength="10" required></label>
      <label class="f"><span>${esc(T('pw.again'))}</span><input class="i" type="password" id="pw2" autocomplete="new-password" minlength="10" required></label>
      <p class="msg" id="pwMsg" role="status"></p>
      <button class="btn gold" type="submit">${esc(T('pw.save'))}</button></form></div></div>`, T('pw.title'));
  $('#pwForm').onsubmit = async (e) => {
    e.preventDefault();
    const a = $('#pw1').value, b = $('#pw2').value, m = $('#pwMsg');
    if (a.length < 10) { m.className = 'msg bad'; m.textContent = T('pw.short'); return; }
    if (a !== b) { m.className = 'msg bad'; m.textContent = T('pw.differ'); return; }
    const r = await client().auth.updateUser({ password: a });
    if (r.error) { m.className = 'msg bad'; m.textContent = friendly(r.error); return; }
    live(T('pw.saved'));
    await afterSignIn(null);
  };
}

// the time zone choices (a zone set elsewhere that is not in the list is kept as its own option)
function zoneOptions(current) {
  const list = ZONES.some((z) => z.id === current) || !current ? ZONES : [...ZONES, { id: current, en: current }];
  return list.map((z) => `<option value="${esc(z.id)}"${z.id === current ? ' selected' : ''}>${esc(zoneLabel(z.id) || z.en)} · ${esc(zoneAbbrev(new Date(), z.id))}</option>`).join('');
}

// ---- "Start your center" ------------------------------------------------------------------------------------------------
function viewStart() {
  page(`<div class="wrap narrow">
    <h1>Start your center</h1>
    <p class="lead">Your program gets its own private space in the Futures Hub. It takes about two minutes, and nothing is created until you confirm by email.</p>
    <form class="card" id="startForm" novalidate>
      <label class="f"><span>Center name</span><input class="i" id="sName" name="center_name" maxlength="120" autocomplete="organization" required></label>
      <label class="f"><span>Your center's web address <span class="hint">your staff and families sign in here</span></span>
        <div class="addr"><span class="pre">${esc(location.host)}/c/</span><input class="i" id="sSlug" name="slug" maxlength="40" autocomplete="off" spellcheck="false" required aria-describedby="slugMsg"></div>
        <span class="small" id="slugMsg" role="status"></span></label>
      <fieldset class="f"><legend>What kind of program is it?</legend><div class="choices two">
        <label class="choice"><input type="radio" name="org_kind" value="child_care" checked><span><b>Child care</b><span class="small muted">A licensed center, preschool or home</span></span></label>
        <label class="choice"><input type="radio" name="org_kind" value="church"><span><b>Church program</b><span class="small muted">A preschool, nursery or weekday program run by a church</span></span></label>
      </div></fieldset>
      <div class="row two">
        <label class="f"><span>State</span><select class="i" id="sState" name="state" required><option value="MO">Missouri</option><option value="KS">Kansas</option></select></label>
        <label class="f"><span>ZIP code <span class="hint">optional</span></span><input class="i" id="sZip" name="zip" inputmode="numeric" maxlength="5" autocomplete="postal-code"></label>
      </div>
      <label class="f"><span>Program type</span><select class="i" id="sType" name="facility_type"></select></label>
      <label class="f"><span>Time zone <span class="hint">the daily report goes out about 5:30 pm in this zone; "today" on every screen follows it</span></span>
        <select class="i" id="sTz" name="time_zone">${zoneOptions(ZONES.some((z) => z.id === deviceZone()) ? deviceZone() : 'America/Chicago')}</select></label>
      <label class="f" id="licWrap"><span>State license number</span><input class="i" id="sLic" name="license_number" maxlength="40" autocomplete="off"></label>
      <p class="small muted" id="typeNote"></p>
      <label class="f"><span>Rooms <span class="hint">optional, separated by commas: you can add them later</span></span><input class="i" id="sRooms" name="rooms" placeholder="Twos, Threes, Pre-K"></label>
      <div class="row two">
        <label class="f"><span>Your name</span><input class="i" id="sOwner" name="owner_name" maxlength="120" autocomplete="name" required></label>
        <label class="f"><span>Your email</span><input class="i" type="email" id="sEmail" name="owner_email" maxlength="254" autocomplete="email" required></label>
      </div>
      <p class="small muted">You will be the owner and director of this center. We send a sign-in link to this email; your center's private space opens when you use it.</p>
      <p class="msg" id="startMsg" role="status"></p>
      <button class="btn gold" type="submit" id="startBtn">Start your center</button>
    </form></div>`, 'Start your center', { english: true });

  const f = $('#startForm');
  let slugTouched = false, timer = null, lastChecked = '';
  const kind = () => f.org_kind.value;
  function types(kindChanged = false) {
    const st = $('#sState').value, k = kind(), sel = $('#sType'), prev = kindChanged ? '' : sel.value;
    const opts = k === 'church'
      ? (st === 'MO' ? ['license_exempt_religious', 'child_care_center', 'preschool'] : ['child_care_center', 'preschool'])
      : ['child_care_center', 'preschool', 'family_home', 'group_home', 'school_age'];
    sel.innerHTML = opts.map((o) => `<option value="${o}">${esc(FACILITY[o])}</option>`).join('');
    if (opts.includes(prev)) sel.value = prev;
    const exempt = sel.value === 'license_exempt_religious';
    $('#licWrap').hidden = exempt;
    $('#typeNote').textContent = exempt ? 'Missouri lets church programs run license-exempt. No license number is needed.'
      : k === 'church' && st === 'KS' ? 'Kansas has no license exemption for church programs, so a license number is needed.' : '';
  }
  async function checkSlug() {
    const s = $('#sSlug').value.trim(), m = $('#slugMsg');
    if (!s) { m.textContent = ''; return null; }
    if (s !== slugify(s) || s.length < 3) { m.className = 'small msg bad'; m.textContent = 'Use 3 to 40 lowercase letters, numbers and single dashes.'; $('#sSlug').setAttribute('aria-invalid', 'true'); return false; }
    lastChecked = s;
    try {
      const ok = await rpc('center_slug_available', { p_slug: s });
      if (lastChecked !== s) return null;
      m.className = `small msg ${ok ? 'ok' : 'bad'}`;
      m.textContent = ok ? `/c/${s} is free.` : `/c/${s} is taken or reserved. Try another.`;
      $('#sSlug').setAttribute('aria-invalid', ok ? 'false' : 'true');
      return ok;
    } catch (e) { m.className = 'small msg bad'; m.textContent = friendly(e); return false; }
  }
  const later = () => { clearTimeout(timer); timer = setTimeout(checkSlug, 350); };
  $('#sName').addEventListener('input', () => { if (!slugTouched) { $('#sSlug').value = slugify($('#sName').value); later(); } });
  $('#sSlug').addEventListener('input', () => { slugTouched = true; later(); });
  f.addEventListener('change', (e) => { if (e.target.name === 'org_kind' || e.target.id === 'sState' || e.target.id === 'sType') types(e.target.name === 'org_kind'); });
  types();

  f.onsubmit = async (e) => {
    e.preventDefault();
    const m = $('#startMsg'), btn = $('#startBtn');
    const need = [['sName', 'the center name'], ['sSlug', 'a web address'], ['sOwner', 'your name'], ['sEmail', 'your email']];
    if ($('#sType').value !== 'license_exempt_religious') need.push(['sLic', 'the state license number']);
    const missing = need.filter(([id]) => !$(`#${id}`).value.trim());
    $$('.i', f).forEach((i) => i.removeAttribute('aria-invalid'));
    missing.forEach(([id]) => $(`#${id}`).setAttribute('aria-invalid', 'true'));
    if (missing.length) { m.className = 'msg bad'; m.textContent = `Please add ${missing.map((x) => x[1]).join(', ')}.`; $(`#${missing[0][0]}`).focus(); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test($('#sEmail').value.trim())) { m.className = 'msg bad'; m.textContent = 'That email does not look right.'; $('#sEmail').focus(); return; }
    if ($('#sZip').value && !/^[0-9]{5}$/.test($('#sZip').value)) { m.className = 'msg bad'; m.textContent = 'A ZIP code has 5 digits.'; $('#sZip').focus(); return; }
    if ((await checkSlug()) === false) { m.className = 'msg bad'; m.textContent = 'That web address will not work. Choose another one.'; $('#sSlug').focus(); return; }
    const rooms = $('#sRooms').value.split(',').map((x) => x.trim()).filter(Boolean).slice(0, 20).map((name) => ({ name: name.slice(0, 60) }));
    const p = {
      center_name: $('#sName').value.trim(), slug: $('#sSlug').value.trim(), org_kind: kind(), state: $('#sState').value,
      facility_type: $('#sType').value, license_number: $('#sType').value === 'license_exempt_religious' ? null : $('#sLic').value.trim(),
      zip: $('#sZip').value.trim() || null, owner_name: $('#sOwner').value.trim(), owner_email: $('#sEmail').value.trim(), rooms, time_zone: $('#sTz').value,
      lang,   // the owner's emails and screens start in the language this page is read in
    };
    btn.disabled = true; m.className = 'msg info'; m.textContent = 'Sending…';
    try {
      const r = await rpc('center_signup_request', { p });
      page(`<div class="wrap narrow"><div class="card" id="startDone"><h1>Check your email</h1>
        <p>${esc(r.message)}</p>
        <ol class="steps"><li class="done"><span><b>Request received</b> for ${esc(p.center_name)}.</span></li>
          <li><span><b>Open the email</b> we just sent to ${esc(p.owner_email)} and choose your password.</span></li>
          <li><span><b>Your center opens</b> at <a href="/c/${esc(r.slug)}" data-nav>/c/${esc(r.slug)}</a> within a minute of signing in.</span></li></ol>
        <p class="small muted">Nothing arrived? Check your spam folder. The link is sent again the next day.</p></div></div>`, 'Check your email', { english: true });
      live('Request sent. Check your email.');
    } catch (err) {
      btn.disabled = false; m.className = 'msg bad'; m.textContent = friendly(err);
    }
  };
}

// ---- per-center sign-in ---------------------------------------------------------------------------------------------------
async function profile(slug) { return rpc('center_public_profile', { p_slug: slug }); }
function centerHead(p, size = '') {
  return `<div class="center-head">${crestHtml(esc, p, size === 'big' ? '' : 'si-crest-sm')}
    <div><h1>${esc(p.name)}</h1><span class="chip">${esc(KIND[p.org_kind] || 'Center')}</span></div></div>`;
}

async function viewSignin(slug, s) {
  const p = await profile(slug);
  if (!p) {
    setCenterColour(null);
    return page(`<div class="wrap narrow"><div class="card"><h1>${esc(T('signin.notFoundTitle'))}</h1>
      <p>${T('signin.notFoundBody', { path: esc(`/c/${slug}`) })}</p>
      <div class="cta-row"><a class="btn navy" href="/" data-nav>${esc(T('common.hubHome'))}</a><a class="btn soft" href="/start" data-nav>${esc(T('nav.start'))}</a></div></div></div>`, T('signin.notFoundShort'));
  }
  setCenterColour(p.brand_color);
  if (s && p.open) return afterSignIn(slug);
  const sso = p.open ? await rpc('center_sso_options', { p_slug: slug }).catch(() => null) : null;
  // the redesigned page (family-signin.js, hub/FAMILY_DASHBOARD.md "The sign-in page"): the same sign-in, MFA, SSO and recovery paths
  return viewSigninPage({ p, slug, sso, T, lang, esc, page, client, live, safeNext, rememberNext, nextQuery, syncLanguage, topNav, afterSignIn,
    startGoogleSignIn, kindLabel: T(`kind.${p.org_kind}`) !== `kind.${p.org_kind}` ? T(`kind.${p.org_kind}`) : (KIND[p.org_kind] || 'Center') });
}

// After any sign-in: is this person part of the center, and do they need two-step verification first?
async function afterSignIn(slug) {
  const mine = await rpc('my_centers');
  const here = slug ? mine.find((c) => c.slug === slug) : mine[0];
  if (!here) {
    const p = slug ? await profile(slug) : null;
    return page(`<div class="wrap narrow"><div class="card" id="notMember"><h1>${esc(T('member.notTitle', { center: p?.name || T('member.aCenter') }))}</h1>
      <p>${esc(T('member.notBody', { center: p?.name || T('member.anyCenter') }))}</p>
      ${mine.length ? `<p>${esc(T('member.yours'))}</p><ul class="list">${mine.map((c) => `<li><span class="who"><b>${esc(c.name)}</b></span><a class="btn navy small" href="/c/${esc(c.slug)}/home" data-nav>${esc(T('common.open'))}</a></li>`).join('')}</ul>` : ''}
      <div class="cta-row"><button class="btn soft" type="button" id="reload">${esc(T('common.reload'))}</button></div></div></div>`, T('member.notShort'));
  }
  const sso = await enforceStaffSso(client(), rpc, here.center_id);
  if (!sso.ok) {
    return page(`<div class="wrap narrow"><div class="card" id="ssoRefused"><h1>${esc(T('sso.title'))}</h1>
      <p class="msg bad" role="alert">${esc(T(SSO_REASON_KEY[sso.reason] || 'sso.failed', { center: here.name }))}</p>
      <div class="cta-row"><a class="btn navy" href="/c/${esc(here.slug)}" data-nav>${esc(T('sso.again'))}</a></div></div></div>`, T('sso.title'));
  }
  const next = takeNext(slug ? here.slug : null);
  const st = await rpc('security_my_status').catch(() => null);
  if (st && st.mfa_required && st.aal !== 'aal2') return viewTwoStep(here, next);
  return go(next || `/c/${here.slug}/home`, true);
}
document.addEventListener('click', (e) => { if (e.target && e.target.id === 'reload') render(); });

async function viewTwoStep(c, next = null) {
  setCenterColour(c.brand_color);
  const f = await client().auth.mfa.listFactors();
  const totp = (f.data?.totp || []).find((x) => x.status === 'verified');
  let enrol = null;
  if (!totp) {
    for (const old of (f.data?.all || []).filter((x) => x.status !== 'verified')) await client().auth.mfa.unenroll({ factorId: old.id }).catch(() => {});
    const e = await client().auth.mfa.enroll({ factorType: 'totp', friendlyName: `Futures Hub ${new Date().toISOString().slice(0, 16)}` });
    if (e.error) throw e.error;
    enrol = e.data;
  }
  const factorId = totp ? totp.id : enrol.id;
  const qr = enrol && /^data:image\/svg\+xml/.test(enrol.totp.qr_code || '') ? `<img src="${esc(enrol.totp.qr_code)}" alt="QR code to add the Futures Hub to an authenticator app" width="180" height="180">` : '';
  page(`<div class="center-band"></div><div class="wrap narrow"><div class="card" id="twoStep">
    <h1>${enrol ? 'Turn on two-step verification' : 'Enter your verification code'}</h1>
    <p class="muted">Directors protect children's records with a code from an authenticator app${enrol ? '. Scan the code with the app, or type the key, then enter the 6-digit code it shows.' : '.'}</p>
    ${enrol ? `${qr}<p class="small">Key: <code id="totpSecret">${esc(enrol.totp.secret)}</code></p>` : ''}
    <form id="codeForm" novalidate><label class="f"><span>6-digit code</span><input class="i" id="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required></label>
      <p class="msg" id="codeMsg" role="status"></p><button class="btn center" type="submit">Verify</button></form></div></div>`, 'Two-step verification', { english: true });
  $('#codeForm').onsubmit = async (e) => {
    e.preventDefault();
    const m = $('#codeMsg');
    const r = await client().auth.mfa.challengeAndVerify({ factorId, code: $('#code').value.trim() });
    if (r.error) { m.className = 'msg bad'; m.textContent = 'That code did not work. The code in your app changes every 30 seconds, so enter the one showing now.'; return; }
    live('Verified.');
    go(next || `/c/${c.slug}/home`, true);
  };
}

// ---- the center space -----------------------------------------------------------------------------------------------------
const roleLabel = (c) => (c.role === 'director' ? (c.is_owner ? 'Director · Owner' : 'Director') : c.role === 'teacher' ? 'Teacher' : c.role === 'family' ? 'Family' : c.role);

let careViews = null;
const care = () => (careViews ||= mountCare({ esc, $, $$, rpc, client, page, live, friendly, go }));
let permViews = null;
const perms = () => (permViews ||= mountPermissions({ esc, $, $$, rpc, page, live, friendly }));
let recoveryViews = null;   // account recovery for directors (N18, recovery-ui.js)
const recovery = () => (recoveryViews ||= mountRecovery({ esc, $, rpc, page, live, friendly }));
let cmViews = null;
const charmsg = () => (cmViews ||= mountCharmsg({ esc, $, $$, rpc, page, live, friendly, go, lang: () => lang }));
let tcViews = null;
const tc = () => (tcViews ||= mountTimeclock({ esc, $, $$, rpc, client, page, live, friendly, go, holdIdle: (on) => { idleHold = on; } }));
let privViews = null;
const privacy = () => (privViews ||= mountPrivacy({ esc, $, $$, rpc, page, live, friendly, go, client, getLang: () => lang }));
let netViews = null;
const network = () => (netViews ||= mountNetwork({ esc, rpc, page, friendly, go }));
let billViews = null;
const billing = () => (billViews ||= mountBilling({ esc, $, $$, rpc, page, live, friendly, client, session }));
let kvViews = null;
const kidVideos = () => (kvViews ||= mountKidVideos({ esc, rpc, page, live, friendly, client }));
let habitViews = null;
const habits = () => (habitViews ||= mountHabits({ esc, $, page, live, session }));
let planViews = null;
const plan = () => (planViews ||= mountPlan({ esc, $, rpc, client, page, live, friendly, session }));
let helpViews = null;
const help = () => (helpViews ||= mountHelp({ esc, $, rpc, page, live, friendly, getLang: () => lang }));
let todayViews = null;
const today = () => (todayViews ||= mountToday({ esc, $, $$, rpc, client, page, live, friendly, session }));
let arrViews = null, deskViews = null;   // N2 "one app" (hub/PORTAL_RETIREMENT.md)
const arrivals = () => (arrViews ||= mountArrivals({ esc, $, $$, rpc, page, live, friendly, client, localDay: () => centerToday() }));
const desk = () => (deskViews ||= mountCareDesk({ esc, $, $$, rpc, page, live, friendly, client, localDay: () => centerToday(), reportHtml: (r) => today().reportHtml(r) }));   // daily report v2 (today.js)
let calViews = null;
const calendar = () => (calViews ||= mountCalendar({ esc, $, rpc, page, live, friendly }));
let importViews = null;
const rosterImport = () => (importViews ||= mountRosterImport({ esc, $, $$, rpc, page, live, friendly }));
let incViews = null;
const incident = () => (incViews ||= mountIncident({ esc, $, rpc, client, page, live, friendly }));
let chatViews = null;
const chat = () => (chatViews ||= mountChat({ esc, $, rpc, page, live, friendly, client, session }));
let dashViews = null;
const staffDash = () => (dashViews ||= mountStaffDashboard({ esc, $, rpc, page, live, friendly, session }));
let dashV2 = null;
const staffV2 = () => (dashV2 ||= mountStaffV2({ esc, $, rpc, client, page, live, friendly, session }));
const classicHome = () => new URLSearchParams(location.search).has('classic');   // ?classic=1: the pre-v2 homes, kept while the owner reviews v2
let crmViews = null;
const crm = () => (crmViews ||= mountCrm({ esc, $, $$, rpc, page, live, friendly, go, client }));
const CRM_PUBLIC = new Set(['waitlist-status', 'tour', 'unsubscribe', 'reenroll']);
let hiringViews = null;
const hiring = () => (hiringViews ||= mountHiring({ esc, $, $$, rpc, client, page, live, friendly, go }));
let absViews = null;
const absence = () => (absViews ||= mountAbsence({ esc, $, rpc, page, live, friendly, getLang: () => lang }));
let healthViews = null;
const health = () => (healthViews ||= mountHealth({ esc, $, $$, rpc, client, page, live, friendly, getLang: () => lang }));
let famBillViews = null;
const famBilling = () => (famBillViews ||= mountFamilyBilling({ esc, $, rpc, page, live, friendly, getLang: () => lang, session }));

async function viewCenter(slug, tab, s, kid = null) {
  if (CRM_PUBLIC.has(tab)) {     // a family's signed link: no sign-in; the family's own language unless they chose one here
    return crm().viewPublic(slug, tab, { lang, chosen: !!storedLanguage(), useLang: (l) => { lang = setUiLang(l); } });
  }
  if (!s && tab === 'help') {   // the help page's answers are public; asking the center needs a sign-in
    const p = await profile(slug); if (!p) return go(`/c/${slug}`, true);
    setCenterColour(p.brand_color);
    return help().viewHelp(null, (b) => `<div class="center-band"></div><div class="wrap">${centerHead(p)}${b}</div>`, { signedIn: false, slug });
  }
  if (!s) {                                      // signed out: sign in, then come back to exactly this page
    const back = safeNext(FFTest.pathname() + location.search, slug);
    if (back) rememberNext(back);
    return go(`/c/${slug}${back ? `?next=${encodeURIComponent(back)}` : ''}`, true);
  }
  const mine = await rpc('my_centers');
  const c = mine.find((x) => x.slug === slug);
  if (!c) return afterSignIn(slug);
  setCenterColour(c.brand_color);
  // the center's time zone: every "today" and every time on its pages (a failed read keeps the last zone, HQ time at first)
  const clock = await rpc('center_clock', { p_center: c.center_id }).catch(() => null);
  c.time_zone = setCenterTz(clock?.time_zone || centerTz()); setDisplayTz(c.time_zone);
  const director = c.role === 'director';
  const specialist = c.role === 'specialist';   // an invited outside specialist: no membership, only the children a family approved
  if (director || specialist) {
    const st = await rpc('security_my_status').catch(() => null);
    if (st && st.mfa_required && st.aal !== 'aal2') return viewTwoStep(c, safeNext(FFTest.pathname() + location.search, slug));
  }
  const inbox = await inboxAccess(c);
  const family = c.role === 'family';
  // A teacher whose permissions do not include the classroom is "hours only": the time clock and every child's care alert, nothing else.
  let hoursOnly = false, frontDesk = false, staffDesk = false, kitchen = false, myPerm = null;   // staffDesk: the hiring desk (hub/ATS.md)
  if (c.role === 'teacher') {
    const mp = myPerm = await rpc('my_permissions', { p_center: c.center_id }).catch(() => null);
    // staff roles (N15, docs/ops/PERMISSIONS.md "Staff roles"): outside a substitute's window nothing opens; the database says the same
    const closed = !!mp && mp.active === false;
    hoursOnly = closed || (!!mp && mp.role === 'teacher' && !mp.perms.includes('classroom'));
    frontDesk = !closed && !!mp && mp.perms.includes('enroll'); staffDesk = !closed && !!mp && mp.perms.includes('staff'); kitchen = !closed && !!mp && mp.perms.includes('kitchen');
  }
  const orgs = director ? await rpc('my_organizations').catch(() => []) : [];   // an owner of this center's organization: the organization tab
  const owner = (orgs || []).some((o) => (o.centers || []).some((x) => x.center_id === c.center_id));
  const allowed = director ? [...(owner ? ['organization'] : []), 'home', 'plan', 'roster', 'sub', 'help-desk', 'today', 'moments', 'library', 'curriculum', 'habits', 'work', 'kid', 'learn', 'grades', 'checkpoints', 'adapt', 'plans', 'goal-entry', 'sped', 'staff', 'permissions', 'billing', 'timeclock', 'clock', 'families', 'import', 'settings', 'people', 'enroll', 'children', 'support', 'child', 'messages', 'chat', 'player', 'consents', 'videos', 'calendar', 'incident', 'crm', 'hiring', 'licensing', 'kitchen', 'recovery', 'arrivals', 'meals', 'reports', 'program', 'rhythm', 'safety', 'compliance', 'health', ...(inbox ? ['inbox'] : [])]
    : specialist ? ['home', 'plans', 'goal-entry', 'sped']
    : c.role === 'teacher' && myPerm && myPerm.active === false ? ['home']
    : c.role === 'teacher' ? ['home', 'licensing', ...(frontDesk ? ['crm'] : []), ...(kitchen ? ['kitchen'] : []), ...(hoursOnly ? [] : ['today', 'moments', 'arrivals', 'meals', 'reports', 'program', 'rhythm', 'safety', 'library', 'curriculum', 'plan', 'roster', 'sub', 'habits', 'work', 'kid', 'learn', 'grades', 'checkpoints', 'adapt', 'plans', 'goal-entry', 'sped', 'messages', 'chat', 'player', 'videos', 'incident', 'health']), 'children', 'child', 'clock', 'calendar', 'hiring', ...(inbox ? ['inbox'] : [])] : ['home', 'child'].concat('moments', 'help', 'messages', 'chat', 'player', 'privacy', 'habits', 'work', 'kid', 'learn', 'grades', 'checkpoints', 'adapt', 'videos', 'calendar', 'incident', 'absence', 'billing-family', 'devices', 'pickup', 'plans', 'sped', 'health');   // families: messages, privacy, habit cards, Learning at home, Kid Mode, released progress reports, the calendar, incident reports, absence reports, their own billing
  const L = (key, en) => (family ? T(key) : en);   // the family's view is translated; staff views stay English for now
  const tabs = director ? [['home', 'Home'], ['today', 'Today'], ['moments', 'Moments'], ['arrivals', 'Arrivals'], ['meals', 'Meals'], ['reports', 'Family reports'], ['program', 'Program'], ['rhythm', 'Daily rhythm'], ['library', 'Library'], ['curriculum', 'Curriculum'], ['plan', 'Planning'], ['habits', 'Habit cards'], ['work', 'Kid Mode & work'], ['learn', 'Home learning'], ['grades', 'Grades'], ['checkpoints', 'Checkpoints'], ['adapt', 'Adaptations'], ['plans', 'Support plans'], ['enroll', 'Enrollment'], ['crm', 'Enrollment pipeline'], ['children', 'Children'], ['messages', 'Messages'], ['chat', 'Chat'], ['videos', 'Videos'], ...(inbox ? [['inbox', 'Inbox']] : []), ['hiring', 'Hiring'], ['staff', 'Invite staff'],
                           ['permissions', 'Permissions'], ['recovery', 'Account recovery'], ['billing', 'Billing'], ['timeclock', 'Time clock'], ['families', 'Invite families'], ['import', 'Import roster'], ['people', 'People'], ['consents', 'Consents'], ['help-desk', 'Help desk'], ['calendar', 'Calendar'], ['safety', 'Safety logs'], ['compliance', 'Compliance'], ['health', 'Health records'], ['licensing', 'Licensing'], ['kitchen', 'Kitchen'], ['settings', 'Center settings'], ['support', 'Support access'], ...(owner ? [['organization', 'Organization']] : [])]
    : specialist ? [['plans', lang === 'es' ? 'Planes de apoyo' : 'Support plans'], ['goal-entry', lang === 'es' ? 'Datos de metas' : 'Goal data']]
    : c.role === 'teacher' && myPerm && myPerm.active === false ? [['home', 'Home']]
    : c.role === 'teacher' ? [['home', 'Home'], ...(kitchen ? [['kitchen', 'Kitchen']] : []), ...(hoursOnly ? [] : [['today', 'Today'], ['moments', 'Moments'], ['arrivals', 'Arrivals'], ['meals', 'Meals'], ['reports', 'Family reports'], ['program', 'Program'], ['rhythm', 'Daily rhythm'], ['safety', 'Safety logs'], ['library', 'Library'], ['curriculum', 'Curriculum'], ['plan', 'Planning'], ['roster', 'Roster'], ['habits', 'Habit cards'], ['work', 'Kid Mode & work'], ['learn', 'Home learning'], ['grades', 'Grades'], ['checkpoints', 'Checkpoints'], ['adapt', 'Adaptations'], ['health', 'Health']]), ['children', hoursOnly ? 'Care alerts' : 'Children'], ...(hoursOnly ? [] : [['messages', 'Messages'], ['chat', 'Chat'], ['videos', 'Videos']]), ['calendar', 'Calendar'], ['licensing', 'My training hours'], ...(frontDesk ? [['crm', 'Enrollment pipeline']] : []), ...(staffDesk ? [['hiring', 'Hiring']] : []), ...(inbox ? [['inbox', 'Enrollment inbox']] : [])] : [];
  const shell = (body) => `<div class="center-band"></div><div class="wrap" id="centerSpace" data-center="${esc(c.center_id)}">
    <div class="center-head">${crestHtml(esc, c, 'si-crest-sm')}
      <div><h1 id="centerName">${esc(c.name)}</h1><span class="chip">${esc(KIND[c.org_kind] ? L(`kind.${c.org_kind}`, KIND[c.org_kind]) : '')}</span> <span class="chip gold" id="roleChip">${esc(family ? T('role.family') : specialist ? (lang === 'es' ? 'Especialista' : 'Specialist') : roleLabel(c))}</span>
      ${c.status !== 'active' ? ` <span class="chip warn">${c.status === 'read_only' ? esc(L('center.readOnly', 'Read only')) : esc(c.status)}</span>` : ''}</div></div>
    ${myPerm ? perms().roleBanner(myPerm) : ''}
    ${director ? groupedNavHtml({ tabs, tab, slug, label: c.name }) : tabs.length ? `<nav class="tabs" aria-label="${esc(c.name)}">${tabs.map(([t, l]) => `<a href="/c/${esc(slug)}/${t}" data-nav${t === tab ? ' aria-current="page"' : ''}>${l}</a>`).join('')}</nav>` : '<div class="tabs"></div>'}
    ${body}</div>`;
  if (director) bindGroupedNav();
  // a page this account does not have (an old link, a link meant for another role): the account's home, WITH a note saying why (never
  // a silent jump: the note is shown at the top of the home page)
  if (!allowed.includes(tab)) { pendingNote = missText('tab', lang); return go(`/c/${slug}/home`, true); }
  if (tab === 'sped' || tab === 'plans' || tab === 'goal-entry' || (specialist && tab === 'home')) {   // support plans (special-education.js)
    return (await sped()).viewSped({ c, shell, page, rpc, client, esc, friendly, go, live, lang, allowed, tab: specialist && tab === 'home' ? 'plans' : tab, kid });
  }
  if (tab === 'clock') return tc().viewKiosk(c);              // the center tablet: the database decides whether this sign-in may run it
  if (tab === 'today' && !family) return today().viewToday(c, shell);   // quick entry for the classroom tablet
  if (tab === 'child') {
    try { await care().viewChild(c, shell, kid); }
    catch (e) {                                    // not this person's child (or no longer here): say so on this page
      page(shell(`<div class="card" id="childMissing"><p class="msg warn" role="alert">${esc(missText('child', lang))}</p>
        <p class="small muted">${esc(friendly(e))}</p></div>`), c.name, { english: !family });
      return;
    }
    // families: a link to the child's released progress reports (grades.js)
    if (family && $('#childRecord')) $('#childRecord').insertAdjacentHTML('afterend', familyReportsCardHtml(esc, slug, kid, lang) + familyAdaptCardHtml(esc, slug, kid, lang));
    if ($('#childRecord') && (family || allowed.includes('sped'))) {   // the child's support plan, when there is one (staff: the database decides who may open it)
      if (family) await (await sped()).mountFamilyCard({ c, rpc, esc, lang, kid, after: $('#childRecord') }).catch(() => {});
      else $('#childRecord').insertAdjacentHTML('afterend', `<p class="cta-row" id="childSpedLink"><a class="btn soft small" href="/c/${esc(slug)}/child/${encodeURIComponent(kid)}/plan" data-nav>${esc(lang === 'es' ? 'Plan de apoyo (IEP / IFSP)' : 'Support plan (IEP / IFSP)')}</a></p>`);
    }
    // the meal instruction on file (read only) and who can pick up (arrivals.js /pickup): were the website portal's family cards (N2)
    if (family && $('#childRecord')) {
      const meal = await desk().familyMealHtml(c, kid).catch(() => '');
      $('#childRecord').insertAdjacentHTML('afterend', `${meal}<p class="cta-row" id="pickupLink"><a class="btn soft" href="/c/${esc(slug)}/pickup?kid=${encodeURIComponent(kid)}" data-nav>${esc(lang === 'es' ? 'Quién puede recoger' : 'Who can pick up')}</a></p>`);
    }
    if ($('#childRecord') && !hoursOnly) $('#childRecord').insertAdjacentHTML('afterend', healthLinkHtml(esc, slug, kid, lang));   // the child's health records tab
    await today().childToday(c, kid, { lang });
    return mountKidLanguage({ esc, rpc, friendly, c, kid, lang, after: $('#childRecord') });
  }
  if (tab === 'children') return care().viewChildren(c, shell, perms());
  if (tab === 'kitchen' && (kitchen || director)) return perms().viewKitchen(c, shell);   // the kitchen board (N15)
  // N2 "one app": the desks that used to be the website portal's (arrivals.js, care-desk.js; hub/PORTAL_RETIREMENT.md)
  if (tab === 'arrivals' && !family) return arrivals().viewArrivals(c, shell, { director });
  if (tab === 'pickup' && family) return arrivals().viewFamilyPickup(c, shell);
  if (tab === 'meals' && !family) return desk().viewMeals(c, shell, { director });
  if (tab === 'reports' && !family) return desk().viewReports(c, shell);
  if (tab === 'program' && !family) return desk().viewProgram(c, shell);
  if (tab === 'rhythm' && !family) return desk().viewRhythm(c, shell, { director });
  if (tab === 'safety' && !family) return desk().viewSafety(c, shell, { director });
  if (tab === 'compliance' && director) return desk().viewCompliance(c, shell);
  if (tab === 'enroll') return care().viewEnrollments(c, shell);
  if (tab === 'crm') return crm().viewDesk(c, shell, { director });
  if (tab === 'support') return care().viewSupport(c, shell);
  if (tab === 'messages') return charmsg().viewMessages(c, shell);       // character messages (charmsg.js): parents approve, staff request
  if (tab === 'player') return charmsg().viewPlayer(c, kid);             // the child's stand-alone player (approved messages only)
  if (tab === 'chat') {                                                  // parent <-> teacher messages and announcements (chat.js)
    const q = new URLSearchParams(location.search);
    return chat().viewChat(c, shell, { lang, director, family, kidParam: q.get('kid'), annParam: q.get('a'), msgParam: q.get('msg') });
  }
  if (tab === 'videos') return kidVideos().viewVideos(c, shell, { family, lang });
  if (tab === 'moments') return (await import('./moments.js')).viewMoments({ c, shell, page, live, session, client, rpc, esc, friendly, go, lang, director, family });   // classroom moments (hub/MOMENTS.md)
  if (tab === 'devices' && family) return viewKidDevices(c, shell);   // Kid Mode devices paired for my children (N14, kid-devices-ui.js)   // Today's video (kid-videos.js): parents approve, staff send
  if (tab === 'calendar') return calendar().viewCalendar(c, shell, { family, director, lang });
  if (tab === 'incident') return incident().viewIncident(c, shell, { family, lang });
  if (tab === 'hiring' && !family) return hiring().viewHiring(c, shell, { director, lang });   // the hiring desk; interviewers see their own interviews
  if (tab === 'privacy' && family) return privacy().viewFamily(c, shell);
  if (tab === 'consents' && director) return privacy().viewDesk(c, shell);
  if (tab === 'organization' && director) return network().viewOrg(c, shell, orgs);
  if (tab === 'habits') return habits().viewHabits(c, shell, { family, lang });   // the printable QR habit cards (no child data in any code)
  // Kid Mode and the child's work (kid-mode.js): families, and staff with the classroom permission
  if (tab === 'kid' || tab === 'work') {
    const kctx = { c, shell, page, live, session, client, rpc, esc, friendly, go, lang, uiLang: lang };   // every role in their own language (Kid Mode captions: the child's choice, kid-mode.js)
    return tab === 'kid' ? viewKidMode(kctx) : viewWork(kctx);
  }
  // Grades: the gradebook, skill checks and progress reports (grades.js, SKILL_CHECKS.md); families see released reports only
  if (family && c.slug === 'futures-at-home' && tab === 'home') return go(`/c/${slug}/home-school`, true);   // the virtual center's families land on their own page
  if (tab === 'home-school' && family) return viewHomeSchool({ c, shell, page, live, session, rpc, esc, friendly, go, lang });
  if (tab === 'learn') return viewHomeLearning({ c, shell, page, live, session, client, rpc, esc, friendly, go, lang });
  if (tab === 'grades') return viewGrades({ c, shell, page, live, session, client, rpc, esc, friendly, go, lang });
  if (tab === 'checkpoints') return viewCheckpoints({ c, shell, page, live, session, client, rpc, esc, friendly, go, lang });
  if (tab === 'licensing' && !family) return viewLicensing({ c, shell, page, live, session, client, rpc, esc, friendly, go, lang });
  if (tab === 'adapt') return viewAdapt({ c, shell, page, live, session, client, rpc, esc, friendly, go, lang });
  if (tab === 'help' && family) return help().viewHelp(c, shell);
  if (tab === 'health') return health().viewHealth(c, shell, { director, family });   // health records (hub/HEALTH_RECORDS.md)
  if (tab === 'absence' && family) return absence().viewFamily(c, shell);
  if (tab === 'billing-family' && family) return famBilling().viewFamily(c, shell);
  if (family) return viewFamilyHome(c, shell);
  if (tab === 'library') return viewLibrary({ c, shell, page, live, session, client });
  if (tab === 'curriculum') return viewCurriculum({ c, shell, page, live, session });
  if (tab === 'plan') return plan().viewPlan(c, shell);
  if (tab === 'roster') return plan().viewRoster(c, shell);
  if (tab === 'sub') return plan().viewSub(c, shell);
  if (tab === 'help-desk' && director) return help().viewDesk(c, shell);
  if (tab === 'inbox' && inbox) return viewInbox(c, shell, director);
  if (!director) {
    if (!hoursOnly && !classicHome()) return staffV2().viewTeacher(c, shell, { lang, allowed, tabs, clockCard: (x) => tc().clockCard(x) });   // v2 (staff-v2-ui.js)
    if (!hoursOnly) {   // the teacher dashboard (staff-dashboard.js): the classroom at a glance; the library tile stays at the bottom
      await staffDash().viewTeacherHome(c, shell, { clockCard: (x) => tc().clockCard(x), allowed, footer: libraryTile(c) });
      return (await sped()).mountDashCard({ c, rpc, esc, lang, allowed }).catch(() => {});   // support-plan to-dos (deep-linked)
    }
    if (myPerm && myPerm.active === false) { page(shell(perms().accessClosedCard(myPerm, c)), c.name, { english: true }); return; }
    const clock = await tc().clockCard(c);
    const [kitchenHtml, alerts] = await Promise.all([kitchen ? perms().kitchenCard(c).catch(() => '') : '', perms().alertsCard(c).catch(() => '')]);
    page(shell(`${clock.html}${kitchenHtml}${kitchen ? '' : alerts}`), c.name, { english: true });
    return clock.bind();
  }
  if (tab === 'staff') return viewStaff(c, shell);
  if (tab === 'permissions') return perms().viewPermissions(c, shell);
  if (tab === 'recovery') return recovery().viewRecovery(c, shell);
  if (tab === 'timeclock') return tc().viewDesk(c, shell);
  if (tab === 'billing') return billing().viewBilling(c, shell);
  if (tab === 'families') return viewFamilies(c, shell);
  if (tab === 'import') return rosterImport().viewImport(c, shell);   // directors only (allowed list above)
  if (tab === 'settings') return viewSettings(c, shell);
  if (tab === 'people') return viewPeople(c, shell);
  if (tab === 'home' && !classicHome()) {   // the director dashboard v2 (staff-v2-ui.js); ?classic=1 keeps the brief + set-up home
    const full = String(s?.user?.user_metadata?.full_name || '').replace(/^TEST\s+/i, '').trim();
    return staffV2().viewDirector(c, shell, { lang, allowed, tabs, firstName: full && !/@/.test(full) ? full.split(/\s+/)[0] : null, clockCard: (x) => tc().clockCard(x) });
  }
  return viewGetStarted(c, shell, s, allowed);
}

// A family's home in the center: the parent dashboard (family-dashboard.js, hub/FAMILY_DASHBOARD.md): today, what is waiting, learning,
// messages, the friends, what is coming up, and every older link (with the email language and shared files) under "More for your family".
// The family's paired Kid Mode devices on their own page: where the "new device paired" notification opens (?device=<id>).
async function viewKidDevices(c, shell) {
  page(shell('<section class="card" id="kidDevices" aria-labelledby="kdvH"><p class="loading">…</p></section>'), lang === 'es' ? 'Aparatos del Modo Niños' : 'Kid Mode devices');
  const kids = ((await rpc('kid_mode_kids', { p_center: c.center_id, p_room: null })) || []).map((k) => ({ id: k.kid, first: k.label }));
  const m = await import('./kid-devices-ui.js');
  const q = new URLSearchParams(location.search);
  return m.mountFamilyDevices(document.getElementById('kidDevices'), { c, rpc, esc, lang, live, friendly, kids, current: q.get('kid') || kids[0]?.id, highlight: q.get('device') });
}
async function viewFamilyHome(c, shell) {
  return viewFamilyDashboard({ c, shell, page, rpc, client, session, esc, live, friendly, lang, setLanguage, renderShares, T });
}

let spineUndo = () => {};
async function viewGetStarted(c, shell, s, allowed = null) {
  const clock = await tc().clockCard(c);          // every director clocks in too
  // The director brief (spine.js): every source on its own, so one failing source shows "could not load", never blanks the page.
  const [spineData, set, staff, fam, crmCard] = await Promise.all([
    loadSpine({ c, rpc, client }).catch(() => null),
    rpc('center_settings', { p_center: c.center_id }),
    client().from('center_staff_invites').select('id', { count: 'exact', head: true }).eq('center_id', c.center_id).neq('status', 'cancelled'),
    client().from('center_family_invites').select('id', { count: 'exact', head: true }).eq('center_id', c.center_id).neq('status', 'cancelled'),
    crm().deskCard(c),                                  // the enrollment desk's numbers (crm-ui.js), '' when unavailable
  ]);
  const done = { rooms: set.rooms.length > 0, look: !!set.brand_color, staff: (staff.count || 0) > 0, fam: (fam.count || 0) > 0 };
  const step = (ok, html) => `<li class="${ok ? 'done' : ''}"><span>${html}</span></li>`;
  let spine = '';
  if (spineData) {
    const me = spineData.src.staff.ok ? (spineData.src.staff.data || []).find((p) => p.user_id === s?.user?.id) : null;
    const first = me?.full_name && !/@/.test(me.full_name) ? me.full_name.replace(/^TEST\s+/i, '').split(/\s+/)[0] : null;
    spine = renderSpine(deriveSpine(spineData, { firstName: first }), spineData);
  } else {
    spine = '<p class="msg bad" id="spineDown" role="alert">The director brief could not be loaded. Reload the page; nothing below is affected.</p>';
  }
  spineUndo();
  page(shell(`${spine}${staffDash().directorSkeleton()}<h2 class="sp-sub">Your day and set-up</h2>${clock.html}${crmCard}<div id="hiringTile"></div>${libraryTile(c)}<div class="grid two">
    <div class="card" id="getStarted"><h2>Get started</h2><p class="muted">Four steps, in any order, and ${esc(c.name)} is open to your team and families.</p>
      <ol class="steps">
        ${step(done.look, `<b>Make it yours.</b> Your center's name and colour on its sign-in page. <a href="/c/${esc(c.slug)}/settings" data-nav>Center settings</a>`)}
        ${step(done.rooms, `<b>Add your rooms</b> and their learning zones. <a href="/c/${esc(c.slug)}/settings" data-nav>Rooms</a>`)}
        ${step(done.staff, `<b>Invite staff.</b> Teachers sign in with their own login. <a href="/c/${esc(c.slug)}/staff" data-nav>Invite staff</a>`)}
        ${step(done.fam, `<b>Invite families</b> to their child's daily reports. <a href="/c/${esc(c.slug)}/families" data-nav>Invite families</a>`)}
      </ol></div>
    <div class="card"><h2>Your sign-in page</h2><p>Share this address with your staff and families:</p>
      <p><a href="/c/${esc(c.slug)}" id="ownLink">${esc(location.host)}/c/${esc(c.slug)}</a></p>
      <p class="small muted">${c.is_owner ? 'You own this center\'s account.' : 'You are a director at this center.'} Only people invited to ${esc(c.name)} can see anything in it.</p></div>
  </div>`), c.name, { english: true });
  clock.bind();
  spineUndo = installMotion($('#spine'));
  await staffDash().fillDirector(c, { spine: spineData, allowed });   // today across the center (staff-dashboard.js), below the brief
  await (await sped()).mountDashCard({ c, rpc, esc, lang, allowed, director: true }).catch(() => {});   // support plans: counts and dates only
  await hiring().fillTile(c, lang);   // hiring at a glance: openings, waiting too long, interviews, the ratio forecast, credential alerts
}

function statusChip(st) { const [k, l] = STATUS_CHIP[st] || ['', st]; return `<span class="chip ${k}">${esc(l)}</span>`; }

async function viewStaff(c, shell) {
  const r = await client().from('center_staff_invites').select('id, email, full_name, job_role, status, note, created_at')
    .eq('center_id', c.center_id).order('created_at', { ascending: false });
  if (r.error) throw r.error;
  const label = Object.fromEntries(JOB_ROLES);
  page(shell(`<div class="grid two">
    <form class="card" id="staffForm" novalidate><h2>Invite staff</h2>
      <p class="muted small">They get an email to choose a password. Children's records open for them once their background checks are on file.</p>
      <label class="f"><span>Full name</span><input class="i" id="stName" maxlength="120" autocomplete="off" required></label>
      <label class="f"><span>Email</span><input class="i" type="email" id="stEmail" maxlength="254" autocomplete="off" required></label>
      <label class="f"><span>Role</span><select class="i" id="stRole">${JOB_ROLES.map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join('')}</select></label>
      <label class="f"><span>Their language <span class="hint">for their invitation and their own screens; they can change it</span></span>
        <select class="i" id="stLang"><option value="en">English</option><option value="es">Spanish (draft translation, pending review by the center's Spanish teacher)</option></select></label>
      <p class="msg" id="stMsg" role="status"></p><button class="btn center" type="submit">Send invitation</button></form>
    <div class="card"><h2>Staff invitations</h2>
      ${r.data.length ? `<ul class="list" id="staffList">${r.data.map((i) => `<li data-id="${esc(i.id)}"><span class="who"><b>${esc(i.full_name)}</b>
        <span class="small muted">${esc(i.email)} · ${esc(label[i.job_role] || i.job_role)}</span>${i.note ? `<span class="mini muted">${esc(i.note)}</span>` : ''}</span>
        <span>${statusChip(i.status)} ${['pending', 'invited', 'blocked'].includes(i.status) ? `<button class="btn link" type="button" data-cancel-staff="${esc(i.id)}">Cancel</button>` : ''}</span></li>`).join('')}</ul>`
        : '<p class="empty" id="staffList">No one invited yet. Use the form to send the first invitation.</p>'}</div></div>`), `Invite staff · ${c.name}`, { english: true });
  $('#staffForm').onsubmit = async (e) => {
    e.preventDefault();
    const m = $('#stMsg'), name = $('#stName').value.trim(), email = $('#stEmail').value.trim();
    if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { m.className = 'msg bad'; m.textContent = 'Add their name and a valid email.'; return; }
    const ins = await client().from('center_staff_invites').insert({ center_id: c.center_id, email, full_name: name, job_role: $('#stRole').value, preferred_language: $('#stLang').value === 'es' ? 'es' : 'en' });
    if (ins.error) { m.className = 'msg bad'; m.textContent = /duplicate|unique/i.test(ins.error.message) ? 'That email is already invited here.' : friendly(ins.error); return; }
    live(`Invitation for ${name} saved. It is emailed within a minute.`);
    await viewStaff(c, shell);
    const mm = $('#stMsg'); mm.className = 'msg ok'; mm.textContent = `Invitation for ${name} saved. It is emailed within a minute.`;
  };
  $$('[data-cancel-staff]').forEach((b) => { b.onclick = async () => {
    const u = await client().from('center_staff_invites').update({ status: 'cancelled' }).eq('id', b.dataset.cancelStaff).eq('center_id', c.center_id);
    if (u.error) { live(friendly(u.error)); return; }
    await viewStaff(c, shell);
  }; });
}

async function viewFamilies(c, shell) {
  const [kids, rooms, inv] = await Promise.all([
    client().from('kids').select('id, room, data').eq('center_id', c.center_id).order('id'),
    client().from('rooms').select('id, data').eq('center_id', c.center_id).order('id'),
    client().from('center_family_invites').select('id, kid, email, full_name, preferred_language, status, note, created_at').eq('center_id', c.center_id).order('created_at', { ascending: false }),
  ]);
  for (const r of [kids, rooms, inv]) if (r.error) throw r.error;
  const kidName = Object.fromEntries(kids.data.map((k) => [k.id, k.data?.name || k.id]));
  page(shell(`<div class="grid two">
    <div>
      <form class="card" id="famForm" novalidate><h2>Invite families</h2>
        <p class="muted small">A parent or guardian gets an email to set a password. They see only their own child's reports.</p>
        ${kids.data.length ? `<label class="f"><span>Child</span><select class="i" id="fKid">${kids.data.map((k) => `<option value="${esc(k.id)}">${esc(k.data?.name || k.id)}</option>`).join('')}</select></label>`
          : '<p class="empty">Add a child first, using the form below.</p>'}
        <label class="f"><span>Parent or guardian name <span class="hint">optional</span></span><input class="i" id="fName" maxlength="120" autocomplete="off"></label>
        <label class="f"><span>Email</span><input class="i" type="email" id="fEmail" maxlength="254" autocomplete="off" required></label>
        <label class="f"><span>Family's language <span class="hint">for their invitation, emails and pages; they can change it</span></span>
          <select class="i" id="fLang"><option value="en">English</option><option value="es">Spanish (draft translation, pending review by the center's Spanish teacher)</option></select></label>
        <p class="msg" id="fMsg" role="status"></p><button class="btn center" type="submit"${kids.data.length ? '' : ' disabled'}>Send invitation</button></form>
      <form class="card" id="kidForm" novalidate><h3>Add a child</h3>
        <div class="row two"><label class="f"><span>Child's first name</span><input class="i" id="kName" maxlength="60" autocomplete="off" required></label>
        <label class="f"><span>Room</span><select class="i" id="kRoom">${rooms.data.length ? rooms.data.map((r) => `<option value="${esc(r.id)}">${esc(r.data?.name || r.id)}</option>`).join('') : '<option value="">No rooms yet</option>'}</select></label></div>
        <p class="msg" id="kMsg" role="status"></p><button class="btn soft" type="submit">Add child</button></form>
    </div>
    <div class="card"><h2>Family invitations</h2>
      ${inv.data.length ? `<ul class="list" id="famList">${inv.data.map((i) => `<li data-id="${esc(i.id)}"><span class="who"><b>${esc(i.full_name || i.email)}</b>
        <span class="small muted">${esc(i.email)} · for ${esc(kidName[i.kid] || i.kid)}${i.preferred_language === 'es' ? ' · <span class="chip" title="Spanish emails and pages are a draft translation, pending review">Spanish (draft)</span>' : ''}</span>${i.note ? `<span class="mini muted">${esc(i.note)}</span>` : ''}</span>
        <span>${statusChip(i.status)} ${['held', 'pending', 'invited', 'blocked'].includes(i.status) ? `<button class="btn link" type="button" data-cancel-fam="${esc(i.id)}">Cancel</button>` : ''}</span></li>`).join('')}</ul>`
        : '<p class="empty" id="famList">No families invited yet. Pick a child and send the first invitation.</p>'}</div></div>`), `Invite families · ${c.name}`, { english: true });
  $('#famForm').onsubmit = async (e) => {
    e.preventDefault();
    const m = $('#fMsg'), email = $('#fEmail').value.trim();
    if (!$('#fKid') || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { m.className = 'msg bad'; m.textContent = 'Choose the child and add a valid email.'; return; }
    const ins = await client().from('center_family_invites').insert({ center_id: c.center_id, kid: $('#fKid').value, email, full_name: $('#fName').value.trim() || null, preferred_language: $('#fLang').value === 'es' ? 'es' : 'en' });
    if (ins.error) { m.className = 'msg bad'; m.textContent = /duplicate|unique/i.test(ins.error.message) ? 'That email is already invited for this child.' : friendly(ins.error); return; }
    await viewFamilies(c, shell);
    const mm = $('#fMsg'); mm.className = 'msg ok'; mm.textContent = `Invitation for ${email} saved. It is emailed within a minute.`;
    live('Family invitation saved.');
  };
  $('#kidForm').onsubmit = async (e) => {
    e.preventDefault();
    const m = $('#kMsg'), name = $('#kName').value.trim();
    if (!name) { m.className = 'msg bad'; m.textContent = 'Add the child\'s first name.'; return; }
    const id = `${slugify(name) || 'child'}-${Math.random().toString(36).slice(2, 7)}`;
    const room = $('#kRoom').value || null;
    const ins = await client().from('kids').insert({ center_id: c.center_id, id, data: { name, ...(room ? { room } : {}) } });
    if (ins.error) { m.className = 'msg bad'; m.textContent = friendly(ins.error); return; }
    await viewFamilies(c, shell);
    live(`${name} added.`);
  };
  $$('[data-cancel-fam]').forEach((b) => { b.onclick = async () => {
    const u = await client().from('center_family_invites').update({ status: 'cancelled' }).eq('id', b.dataset.cancelFam).eq('center_id', c.center_id);
    if (u.error) { live(friendly(u.error)); return; }
    await viewFamilies(c, shell);
  }; });
}

async function viewSettings(c, shell) {
  const [set, clock, sso] = await Promise.all([rpc('center_settings', { p_center: c.center_id }), rpc('center_clock', { p_center: c.center_id }),
    rpc('center_sso_get', { p_center: c.center_id }).catch(() => null)]);
  const colour = set.brand_color || '#0a2b38';
  const roomRow = (r, i) => `<div class="room" data-room="${esc(r.id || '')}">
    <label class="f"><span>Room name</span><input class="i" data-room-name value="${esc(r.name || '')}" maxlength="60" aria-label="Room ${i + 1} name"></label>
    <label class="f"><span>Learning zones <span class="hint">separated by commas</span></span><input class="i" data-room-zones value="${esc((r.zones || []).join(', '))}" placeholder="Booker zone, Lumi zone, Zuri zone, Bop zone" aria-label="Room ${i + 1} learning zones"></label></div>`;
  page(shell(`<div class="grid two">
    <form class="card" id="brandForm" novalidate><h2>Center settings</h2>
      <label class="f"><span>Center name <span class="hint">shown on your sign-in page</span></span><input class="i" id="bName" maxlength="120" value="${esc(set.display_name || set.name)}"></label>
      <div class="f"><span>Colour</span><div class="swatch-row"><input type="color" id="bColor" value="${esc(colour)}" aria-label="Center colour">
        <input class="i" id="bHex" value="${esc(colour)}" maxlength="7" aria-label="Colour as a hex code" spellcheck="false"></div></div>
      <div class="f"><span>Logo</span><div class="placeholder" id="logoPlaceholder"><span class="logo" aria-hidden="true">${esc(initials(set.display_name || set.name))}</span>
        <span class="small"><b>Logo upload is coming soon.</b> Until then your initials show in your colour.<br>
        <input type="file" accept="image/png,image/jpeg,image/svg+xml" disabled aria-label="Logo upload (coming soon)"></span></div></div>
      <div class="preview" aria-hidden="true"><div class="center-band"></div><div class="in">${centerHead({ name: set.display_name || set.name, org_kind: set.org_kind })}</div></div>
      <p class="small muted">Address: /c/${esc(set.slug)} (cannot be changed here). Kind: ${esc(KIND[set.org_kind] || '')}.</p>
      <p class="msg" id="bMsg" role="status"></p><button class="btn center" type="submit">Save name and colour</button></form>
    <form class="card" id="roomsForm" novalidate><h2>Rooms and learning zones</h2>
      <p class="muted small">Rename a room or change its zones here. Rooms cannot be deleted, because children and their records belong to them.</p>
      <div class="rooms" id="roomList">${(set.rooms.length ? set.rooms : [{ id: '', name: '', zones: [] }]).map(roomRow).join('')}</div>
      <button class="btn soft small" type="button" id="addRoom">Add a room</button>
      <p class="msg" id="rMsg" role="status"></p><button class="btn center" type="submit">Save rooms</button></form>
    <form class="card" id="tzForm" novalidate><h2>Time zone</h2>
      <p class="muted small">Where the center is. The daily report goes out about 5:30 pm in this zone; attendance, the menu, the curriculum day,
        Kid Mode weeks, dashboards, quiet hours and the time clock all count "today" in it.</p>
      <label class="f"><span>Center time zone</span><select class="i" id="tzSel">${zoneOptions(clock.time_zone)}</select></label>
      <p class="small muted" id="tzNow">Today here: ${esc(clock.today)} (${esc(clock.abbrev)}).</p>
      <p class="msg" id="tzMsg" role="status"></p><button class="btn center" type="submit">Save time zone</button></form>
    ${sso ? `<form class="card" id="ssoForm" novalidate><h2>Google sign-in for staff</h2>
      <p class="muted small">Staff can sign in with their Google account when its email is the one this center invited. Families keep their
        email and password (or a sign-in link). Directors still enter their two-step code.</p>
      ${sso.platform_on ? '' : '<p class="msg info" id="ssoPlatformOff">Not available yet: Futures Friends HQ has not connected Google. Your choice is kept for when it is.</p>'}
      <label class="choice"><input type="checkbox" id="ssoGoogle"${sso.google_enabled ? ' checked' : ''}><span>Offer "Staff: sign in with Google" on this center's sign-in page</span></label>
      <label class="f"><span>Only these email domains <span class="hint">optional, separated by commas, for example yourcenter.org</span></span>
        <input class="i" id="ssoDomains" value="${esc((sso.allowed_domains || []).join(', '))}" spellcheck="false"></label>
      <p class="msg" id="ssoMsg" role="status"></p><button class="btn center" type="submit">Save sign-in settings</button></form>` : ''}
  </div>`), `Center settings · ${c.name}`, { english: true });
  if ($('#ssoForm')) $('#ssoForm').onsubmit = async (e) => {
    e.preventDefault();
    const m = $('#ssoMsg');
    try {
      const domains = $('#ssoDomains').value.split(',').map((d) => d.trim()).filter(Boolean);
      const r = await rpc('center_sso_set', { p_center: c.center_id, p_google: $('#ssoGoogle').checked, p_domains: domains });
      $('#ssoDomains').value = (r.allowed_domains || []).join(', ');
      m.className = 'msg ok'; m.textContent = r.google_enabled ? 'Saved. Google sign-in is offered to staff here.' : 'Saved. Google sign-in is not offered here.';
      live(m.textContent);
    } catch (err) { m.className = 'msg bad'; m.textContent = friendly(err); }
  };
  $('#tzForm').onsubmit = async (e) => {
    e.preventDefault();
    const m = $('#tzMsg'), tz = $('#tzSel').value;
    if (!validZone(tz)) { m.className = 'msg bad'; m.textContent = 'Choose a time zone.'; return; }
    try {
      const r = await rpc('center_time_zone_set', { p_center: c.center_id, p_tz: tz });
      c.time_zone = setCenterTz(r.time_zone); setDisplayTz(c.time_zone);
      $('#tzNow').textContent = `Today here: ${r.today} (${r.abbrev}).`;
      m.className = 'msg ok'; m.textContent = `Saved. The center now runs on ${zoneLabel(r.time_zone)} time.`; live('Time zone saved.');
    } catch (err) { m.className = 'msg bad'; m.textContent = friendly(err); }
  };
  const sync = (v) => { if (HEX.test(v)) { setCenterColour(v); $('#bColor').value = v.toLowerCase(); } };
  $('#bColor').oninput = () => { $('#bHex').value = $('#bColor').value; setCenterColour($('#bColor').value); };
  $('#bHex').oninput = () => sync($('#bHex').value.trim());
  $('#brandForm').onsubmit = async (e) => {
    e.preventDefault();
    const m = $('#bMsg'), hex = $('#bHex').value.trim().toLowerCase();
    if (!HEX.test(hex)) { m.className = 'msg bad'; m.textContent = 'The colour must look like #1a7f5a.'; return; }
    try {
      const p = await rpc('center_brand_save', { p_center: c.center_id, p_display_name: $('#bName').value.trim(), p_brand_color: hex });
      m.className = 'msg ok'; m.textContent = 'Saved. Your sign-in page now shows this name and colour.';
      c.name = p.name; c.brand_color = p.brand_color;
      $('#centerName').textContent = p.name; setCenterColour(p.brand_color); live('Center settings saved.');
    } catch (err) { m.className = 'msg bad'; m.textContent = friendly(err); }
  };
  $('#addRoom').onclick = () => {
    const list = $('#roomList');
    list.insertAdjacentHTML('beforeend', roomRow({ id: '', name: '', zones: [] }, list.children.length));
    list.lastElementChild.querySelector('[data-room-name]').focus();
  };
  $('#roomsForm').onsubmit = async (e) => {
    e.preventDefault();
    const m = $('#rMsg');
    const rooms = $$('.room', $('#roomList')).map((el) => ({
      id: el.dataset.room || undefined, name: $('[data-room-name]', el).value.trim(),
      zones: $('[data-room-zones]', el).value.split(',').map((z) => z.trim()).filter(Boolean),
    })).filter((r) => r.id || r.name);
    if (rooms.some((r) => !r.name)) { m.className = 'msg bad'; m.textContent = 'Every room needs a name.'; return; }
    try {
      await rpc('center_rooms_save', { p_center: c.center_id, p_rooms: rooms });
      await viewSettings(c, shell);
      const mm = $('#rMsg'); mm.className = 'msg ok'; mm.textContent = 'Rooms saved.'; live('Rooms saved.');
    } catch (err) { m.className = 'msg bad'; m.textContent = friendly(err); }
  };
}

// ---- idle sign-out (platform switch idle_timeout) ---------------------------------------------------------------------------
let idleTimer = null, idleMinutes = null, idleUser = null;
let idleHold = false;
async function idleWatch(s) {
  if (!s || idleUser === s.user.id) return;
  idleUser = s.user.id;
  try { idleMinutes = (await rpc('security_session_policy'))?.idle_minutes ?? null; } catch { idleMinutes = null; }
  if (!idleMinutes) return;
  const reset = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(async () => {
      if (idleHold) { reset(); return; }          // the center tablet page stays signed in; leaving it ends the hold
      await client().auth.signOut({ scope: 'local' });
      idleUser = null; setCenterColour(null);
      go('/'); live('You were signed out because the page sat idle. Sign in again to pick up where you left off.');
    }, idleMinutes * 60000);
  };
  for (const ev of ['pointerdown', 'keydown', 'scroll', 'visibilitychange']) document.addEventListener(ev, reset, { passive: true });
  reset();
}

// ---- your account -------------------------------------------------------------------------------------------------------------
const EVENT_LABEL = { new_device: 'Signed in on a new device', locked: 'Locked after too many attempts', sign_out_all: 'Signed out everywhere',
  password_changed: 'Password changed', email_changed: 'Email changed', mfa_enabled: 'Two-step verification turned on',
  staff_access_removed: 'Staff access removed at a center', family_access_removed: 'Family access removed at a center',
  mfa_reset: 'Two-step verification reset (account recovery)', recovery_reinvite: 'New sign-in link sent by your center (account recovery)',
  director_transfer: 'You became a director of a center' };
const when = (iso) => new Date(iso).toLocaleString(localeOf(), { dateStyle: 'medium', timeStyle: 'short', timeZone: centerTz() });

async function viewAccount(s) {
  if (!s) return go('/', true);
  const [acct, sessions, notifCard, isFamily] = await Promise.all([rpc('security_my_account'), rpc('security_my_sessions'), notify().settingsCard().catch(() => ''),
    rpc('my_centers').then((l) => (l || []).some((m) => m.role === 'family')).catch(() => false)]);
  const prefsCard = isFamily ? await msgPrefs().card().catch(() => '') : '';
  page(`<div class="wrap" id="account"><h1>Your account</h1><div class="grid two">
    <div>
      <form class="card" id="pwChange" novalidate><h2>Password</h2>
        <label class="f"><span>New password <span class="hint">at least 10 characters</span></span><input class="i" type="password" id="np1" autocomplete="new-password" minlength="10"></label>
        <label class="f"><span>Type it again</span><input class="i" type="password" id="np2" autocomplete="new-password" minlength="10"></label>
        <p class="msg" id="pwMsg2" role="status"></p><button class="btn navy" type="submit">Change password</button></form>
      <form class="card" id="emailChange" novalidate><h2>Email</h2>
        <p class="small">You sign in with <b id="curEmail">${esc(acct.email)}</b>.${acct.new_email ? ` A change to <b>${esc(acct.new_email)}</b> is waiting for confirmation from both addresses.` : ''}</p>
        <label class="f"><span>New email</span><input class="i" type="email" id="newEmail" autocomplete="email" maxlength="254"></label>
        <p class="small muted">We email both your current and your new address; the change happens once both links are opened.</p>
        <p class="msg" id="emMsg" role="status"></p><button class="btn navy" type="submit">Change email</button></form>
      <div class="card"><h2>Two-step verification</h2>
        <p>${acct.status.verified_factors ? '<span class="chip ok">On</span> An authenticator app protects this account.' : '<span class="chip warn">Off</span> Directors are asked to turn it on at sign-in.'}</p></div>
    </div>
    <div>
      <div class="card" id="devices"><h2>Where you are signed in</h2>
        ${sessions.length ? `<ul class="list">${sessions.map((x) => `<li><span class="who"><b>${esc(x.device)}${x.current ? ' <span class="chip gold">This device</span>' : ''}</b>
          <span class="small muted">Last active ${esc(when(x.last_active))}${x.ip ? ` · network ${esc(x.ip)}` : ''}</span></span></li>`).join('')}</ul>` : '<p class="empty">Only this device is signed in.</p>'}
        <div class="cta-row"><button class="btn soft small" type="button" id="signOutOthers">Sign out other devices</button>
          <button class="btn navy small" type="button" id="signOutAll">Sign out everywhere</button></div>
        <p class="msg" id="soMsg" role="status"></p></div>
      <div class="card"><h2>Recent security activity</h2>
        ${acct.events.length ? `<ul class="list" id="events">${acct.events.map((e) => `<li><span class="who"><b>${esc(EVENT_LABEL[e.kind] || e.kind)}</b>
          <span class="small muted">${esc(when(e.at))}${e.device ? ` · ${esc(e.device)}` : ''}</span></span></li>`).join('')}</ul>` : '<p class="empty" id="events">No security activity yet.</p>'}
        <p class="small muted">Something you do not recognise? Change your password, then sign out everywhere.</p></div>
      <form class="card" id="myLanguage" novalidate><h2>${esc(T('lang.staffTitle'))}</h2>
        <div class="choices" role="radiogroup" aria-label="${esc(T('lang.staffTitle'))}">
          <label class="choice"><input type="radio" name="myLang" value="en"${lang === 'en' ? ' checked' : ''}><span lang="en" translate="no">English</span></label>
          <label class="choice"><input type="radio" name="myLang" value="es"${lang === 'es' ? ' checked' : ''}><span lang="es" translate="no">Español</span></label></div>
        <p class="small muted">${esc(T('lang.staffHint'))}</p><p class="small msg" id="langMsg" role="status"></p></form>
      ${prefsCard}
      ${notifCard}
    </div></div></div>`, 'Your account', { english: true });
  msgPrefs().bind();
  for (const r of document.querySelectorAll('input[name="myLang"]')) r.onchange = () => setLanguage(r.value);
  notify().bindSettings().catch(() => null);
  if (location.hash === '#notify') $('#notify')?.scrollIntoView();
  $('#pwChange').onsubmit = async (e) => {
    e.preventDefault();
    const a = $('#np1').value, b = $('#np2').value, m = $('#pwMsg2');
    if (a.length < 10) { m.className = 'msg bad'; m.textContent = 'Use at least 10 characters.'; return; }
    if (a !== b) { m.className = 'msg bad'; m.textContent = 'The two passwords are different.'; return; }
    const r = await client().auth.updateUser({ password: a });
    if (r.error) { m.className = 'msg bad'; m.textContent = friendly(r.error); return; }
    m.className = 'msg ok'; m.textContent = 'Password changed.'; live('Password changed.');
  };
  $('#emailChange').onsubmit = async (e) => {
    e.preventDefault();
    const v = $('#newEmail').value.trim(), m = $('#emMsg');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) { m.className = 'msg bad'; m.textContent = 'That email does not look right.'; return; }
    const r = await client().auth.updateUser({ email: v }, { emailRedirectTo: `${location.origin}/account` });
    if (r.error) { m.className = 'msg bad'; m.textContent = friendly(r.error); return; }
    m.className = 'msg ok'; m.textContent = `Check both inboxes: ${acct.email} and ${v}.`;
  };
  $('#signOutOthers').onclick = async () => {
    const r = await client().auth.signOut({ scope: 'others' });
    $('#soMsg').className = r.error ? 'msg bad' : 'msg ok'; $('#soMsg').textContent = r.error ? friendly(r.error) : 'Your other devices are signed out.';
  };
  $('#signOutAll').onclick = async () => {
    await rpc('security_note_sign_out_all').catch(() => {});
    await client().auth.signOut({ scope: 'global' });
    idleUser = null; setCenterColour(null); go('/'); live('Signed out on every device.');
  };
}

// ---- people: staff access (termination) and family access (withdrawal) -------------------------------------------------------
async function viewPeople(c, shell) {
  const [staff, fams, kids] = await Promise.all([
    rpc('center_staff_list', { p_center: c.center_id }), rpc('center_family_list', { p_center: c.center_id }),
    client().from('kids').select('id, data').eq('center_id', c.center_id).order('id'),
  ]);
  if (kids.error) throw kids.error;
  const kidName = Object.fromEntries(kids.data.map((k) => [k.id, k.data?.first || k.data?.name || k.id]));
  const enrolled = kids.data.filter((k) => k.data?.status !== 'left');
  page(shell(`<div class="grid two">
    <div class="card" id="staffPeople"><h2>Staff</h2>
      <p class="small muted">Removing someone ends their access to ${esc(c.name)} at once and signs them out everywhere. Their training records stay.</p>
      <ul class="list">${staff.map((p) => `<li data-user="${esc(p.user_id)}"><span class="who"><b>${esc(p.full_name)}</b>
        <span class="small muted">${esc(p.email)} · ${esc(p.role === 'director' ? 'Director' : 'Staff')}${p.is_owner ? ' · Owner' : ''}${p.locked ? ' · <b>locked</b>' : ''}</span></span>
        <span>${p.locked ? `<button class="btn link" type="button" data-unlock="${esc(p.user_id)}">Unlock</button>` : ''}
        ${p.is_owner || p.user_id === idleUser ? '' : `<button class="btn soft small" type="button" data-remove-staff="${esc(p.user_id)}" data-name="${esc(p.full_name)}">Remove access</button>`}</span></li>`).join('')}</ul></div>
    <div>
      <div class="card" id="familyPeople"><h2>Families</h2>
        ${fams.length ? `<ul class="list">${fams.map((f) => `<li data-user="${esc(f.user_id)}"><span class="who"><b>${esc(f.full_name)}</b>
          <span class="small muted">${esc(f.email)}${f.kids.length ? ` · ${esc(f.kids.map((k) => kidName[k] || k).join(', '))}` : ''}</span></span>
          <button class="btn soft small" type="button" data-remove-family="${esc(f.user_id)}" data-name="${esc(f.full_name)}">Remove access</button></li>`).join('')}</ul>` : '<p class="empty">No family accounts yet. Invite families from the Invite families tab.</p>'}</div>
      <form class="card" id="withdrawForm" novalidate><h3>A child is leaving</h3>
        ${enrolled.length ? `<label class="f"><span>Child</span><select class="i" id="wKid">${enrolled.map((k) => `<option value="${esc(k.id)}">${esc(kidName[k.id])}</option>`).join('')}</select></label>
        <label class="f"><span>Last day</span><input class="i" type="date" id="wDate"></label>
        <label class="choice"><input type="checkbox" id="wNow"><span><b>Remove the family's access now</b><span class="small muted">Otherwise access ends automatically after the grace period, when that switch is on.</span></span></label>
        <p class="msg" id="wMsg" role="status"></p><button class="btn soft" type="submit">Mark as withdrawn</button>` : '<p class="empty">No enrolled children.</p>'}</form>
    </div></div><p class="msg" id="peopleMsg" role="status"></p>`), `People · ${c.name}`, { english: true });
  const done = async (t) => { await viewPeople(c, shell); const m = $('#peopleMsg'); m.className = 'msg ok'; m.textContent = t; live(t); };
  const fail = (e) => { const m = $('#peopleMsg'); m.className = 'msg bad'; m.textContent = friendly(e); };
  $$('[data-remove-staff]').forEach((b) => { b.onclick = async () => {
    if (!confirm(`Remove ${b.dataset.name}'s access to ${c.name}? They are signed out everywhere right away.`)) return;
    try { await rpc('center_staff_remove', { p_center: c.center_id, p_user: b.dataset.removeStaff, p_reason: null }); await done(`${b.dataset.name} no longer has access.`); } catch (e) { fail(e); }
  }; });
  $$('[data-remove-family]').forEach((b) => { b.onclick = async () => {
    if (!confirm(`Remove ${b.dataset.name}'s access to ${c.name}?`)) return;
    try { await rpc('center_family_remove', { p_center: c.center_id, p_user: b.dataset.removeFamily }); await done(`${b.dataset.name} no longer has access.`); } catch (e) { fail(e); }
  }; });
  $$('[data-unlock]').forEach((b) => { b.onclick = async () => {
    try { await rpc('security_unlock', { p_center: c.center_id, p_user: b.dataset.unlock }); await done('Account unlocked.'); } catch (e) { fail(e); }
  }; });
  if ($('#wKid')) $('#withdrawForm').onsubmit = async (e) => {
    e.preventDefault();
    try {
      await rpc('center_child_withdraw', { p_center: c.center_id, p_kid: $('#wKid').value, p_left_on: $('#wDate').value || null, p_remove_access: $('#wNow').checked });
      await done(`${kidName[$('#wKid').value] || 'The child'} is marked as withdrawn.`);
    } catch (err) { const m = $('#wMsg'); m.className = 'msg bad'; m.textContent = friendly(err); }
  };
}

// ---- AI inbox -------------------------------------------------------------------------------------------------------------
const CAT = { enrollment_inquiry: 'Enrollment', tour_request: 'Tour', billing_question: 'Billing', absence_pickup: 'Absence / pick-up', care_health: 'Care / health',
  complaint: 'Complaint', staff_hr: 'Staff / HR', spam: 'Spam', other: 'Other' };
const ACTION_LABEL = { schedule_tour: 'Schedule a tour', mark_absent: 'Mark absent', send_payment_link: 'Send payment link', send_enrollment_packet: 'Send enrollment packet',
  call_parent: 'Call the parent', forward_to_classroom: 'Tell the classroom' };
const PRI = { urgent: ['bad', 'Urgent'], high: ['warn', 'Today'], normal: ['', '1 day'], low: ['', 'Low'] };
async function inboxAccess(c) {
  try {
    const on = await client().from('platform_flags').select('enabled').eq('key', 'ai_inbox').maybeSingle();
    if (!on.data?.enabled) return false;
    if (c.role === 'director') return true;
    const a = await client().from('inbox_assignees').select('route').eq('center_id', c.center_id).limit(1);
    return !!a.data?.length;
  } catch { return false; }
}
let inboxFilter = 'open', inboxCat = '';
async function viewInbox(c, shell, director, openId = null) {
  const [msgs, set] = await Promise.all([
    client().from('inbox_messages').select('id, received_at, from_name, from_email, subject, status, category, priority, sla_due_at, route, injection_flag, note')
      .eq('center_id', c.center_id).order('received_at', { ascending: false }).limit(200),
    director ? rpc('ai_inbox_settings_get', { p_center: c.center_id }) : Promise.resolve(null),
  ]);
  if (msgs.error) throw msgs.error;
  const openSet = ['new', 'drafted', 'needs_human', 'approved'];
  let rows = msgs.data.filter((m) => (inboxFilter === 'open' ? openSet.includes(m.status) : !openSet.includes(m.status)));
  if (inboxCat) rows = rows.filter((m) => m.category === inboxCat);
  const cats = [...new Set(msgs.data.map((m) => m.category).filter(Boolean))];
  page(shell(`<div class="grid two inbox" id="inbox">
    <div class="card"><h2>Inbox</h2>
      ${set && !set.enabled ? `<p class="msg info">The AI inbox is off for ${esc(c.name)}. Turn it on below; nothing is ever sent without your approval.</p>` : ''}
      <div class="tabs" role="group" aria-label="Show"><a href="#" data-filter="open"${inboxFilter === 'open' ? ' aria-current="page"' : ''}>Open</a><a href="#" data-filter="done"${inboxFilter === 'done' ? ' aria-current="page"' : ''}>Done</a></div>
      <div class="chips" role="group" aria-label="Category">${['', ...cats].map((k) => `<button type="button" class="chip${inboxCat === k ? ' gold' : ''}" data-cat="${esc(k)}">${esc(k ? CAT[k] : 'All')}</button>`).join(' ')}</div>
      ${rows.length ? `<ul class="list" id="queue">${rows.map((m) => `<li><span class="who"><b>${esc(m.subject || '(no subject)')}</b>
        <span class="small muted">${esc(m.from_name || m.from_email)} · ${esc(when(m.received_at))}</span>
        <span class="mini">${m.category ? `<span class="chip">${esc(CAT[m.category])}</span> ` : ''}${m.priority ? `<span class="chip ${PRI[m.priority][0]}">${esc(PRI[m.priority][1])}</span> ` : ''}${m.route ? `<span class="chip">${esc(m.route)}</span> ` : ''}${m.injection_flag ? '<span class="chip bad">Suspicious</span> ' : ''}<span class="chip">${esc(m.status.replace('_', ' '))}</span></span></span>
        <button class="btn navy small" type="button" data-open="${esc(m.id)}">Open</button></li>`).join('')}</ul>` : '<p class="empty" id="queue">Nothing waiting. New emails to your inbox address show up here.</p>'}
    </div>
    <div id="detail">${director && set ? inboxSettingsCard(set) : ''}</div></div>`), `Inbox · ${c.name}`, { english: true });
  $$('[data-filter]').forEach((a) => { a.onclick = (e) => { e.preventDefault(); inboxFilter = a.dataset.filter; viewInbox(c, shell, director); }; });
  $$('[data-cat]').forEach((b) => { b.onclick = () => { inboxCat = b.dataset.cat; viewInbox(c, shell, director); }; });
  $$('[data-open]').forEach((b) => { b.onclick = () => openMessage(c, shell, director, b.dataset.open); });
  if (director && set) bindInboxSettings(c, shell);
  if (openId) openMessage(c, shell, director, openId);
}
function inboxSettingsCard(set) {
  return `<form class="card" id="aiSettings" novalidate><h2>AI inbox settings</h2>
    <label class="choice"><input type="checkbox" id="aiOn"${set.enabled ? ' checked' : ''}${set.available ? '' : ' disabled'}><span><b>Prepare draft replies with AI</b>
      <span class="small muted">Emails to ${esc(set.inbound_local)}@… are sorted and a reply is drafted for you to review. Nothing is sent until you approve it.</span></span></label>
    <label class="f"><span>Monthly budget <span class="hint">US dollars; at the limit the AI pauses and emails wait for you</span></span><input class="i" id="aiCap" inputmode="decimal" value="${(set.monthly_cap_cents / 100).toFixed(2)}"></label>
    <p class="small">Used this month: <b id="aiSpend">$${(Number(set.month_spend_cents) / 100).toFixed(2)}</b></p>
    <label class="f"><span>Your center's voice <span class="hint">optional, e.g. "warm, first names, sign as Ms. Dana"</span></span><textarea class="i" id="aiVoice" maxlength="600" rows="2">${esc(set.voice)}</textarea></label>
    <p class="msg" id="aiMsg" role="status"></p><button class="btn center" type="submit">Save</button></form>`;
}
function bindInboxSettings(c, shell) {
  $('#aiSettings').onsubmit = async (e) => {
    e.preventDefault();
    const cap = Math.round(Number($('#aiCap').value) * 100);
    const m = $('#aiMsg');
    if (!Number.isFinite(cap) || cap < 0 || cap > 100000) { m.className = 'msg bad'; m.textContent = 'Enter a budget between 0 and 1000 dollars.'; return; }
    try {
      await rpc('ai_inbox_settings_save', { p_center: c.center_id, p: { enabled: $('#aiOn').checked, monthly_cap_cents: cap, voice: $('#aiVoice').value } });
      m.className = 'msg ok'; m.textContent = 'Saved.'; live('AI inbox settings saved.');
    } catch (err) { m.className = 'msg bad'; m.textContent = friendly(err); }
  };
}
async function openMessage(c, shell, director, id) {
  const [m, d, log] = await Promise.all([
    client().from('inbox_messages').select('*').eq('id', id).single(),
    client().from('inbox_drafts').select('*').eq('message_id', id).order('created_at', { ascending: false }).limit(1),
    director ? client().from('ai_action_log').select('at, action, model, cost_cents, detail').eq('message_id', id).order('at') : Promise.resolve({ data: [] }),
  ]);
  if (m.error) throw m.error;
  const msg = m.data, draft = d.data?.[0];
  const canAnswer = ['drafted', 'needs_human', 'new'].includes(msg.status);
  const facts = draft?.facts ?? [];
  $('#detail').innerHTML = `<div class="card" id="message"><h2>${esc(msg.subject || '(no subject)')}</h2>
    <p class="small muted">From ${esc(msg.from_name ? `${msg.from_name} <${msg.from_email}>` : msg.from_email)} · ${esc(when(msg.received_at))}${msg.sla_due_at ? ` · reply by ${esc(when(msg.sla_due_at))}` : ''}</p>
    ${msg.injection_flag ? '<p class="msg bad">This email contains instructions aimed at the AI. They were ignored and treated as text only.</p>' : ''}
    ${msg.note ? `<p class="msg info">${esc(msg.note)}</p>` : ''}
    <pre class="email-body">${esc(msg.body_text)}</pre></div>
    ${canAnswer ? `<form class="card" id="draftForm" novalidate><h3>${draft?.author === 'ai' ? 'AI draft <span class="chip warn">AI draft — review before sending</span>' : 'Your reply'}</h3>
      <label class="f"><span class="sr-only">Reply</span><textarea class="i" id="draftBody" rows="10" maxlength="8000">${esc(draft?.body ?? '')}</textarea></label>
      ${draft?.actions?.length ? `<div class="cta-row" aria-label="Suggested actions">${draft.actions.map((a) => `<span class="chip">${esc(ACTION_LABEL[a] || a)}</span>`).join(' ')}</div>` : ''}
      <p class="msg" id="draftMsg" role="status"></p>
      <div class="cta-row"><button class="btn center" type="submit" id="approve">Approve &amp; send</button>
        <button class="btn soft small" type="button" id="dismiss">Dismiss</button><button class="btn link" type="button" id="spam">Mark as spam</button></div></form>` : `<div class="card"><p>Status: <b>${esc(msg.status)}</b></p></div>`}
    <div class="card" id="why"><h3>What the AI looked up</h3>
      ${facts.length ? `<ul class="list">${facts.map((f) => `<li><span class="who"><b>${esc(f.label)}</b><span class="small">${esc(Array.isArray(f.value) ? (f.value.join(', ') || 'none') : f.value)}</span></span></li>`).join('')}</ul>` : '<p class="empty">No records were used.</p>'}
      <h3>Why</h3><p class="small">${esc(msg.triage_reason || '')} ${esc(draft?.why || '')}</p>
      ${log.data?.length ? `<details><summary class="small">AI activity log</summary><ul class="small">${log.data.map((l) => `<li>${esc(when(l.at))}: ${esc(l.action)}${l.model ? ` (${esc(l.model)})` : ''}${Number(l.cost_cents) ? ` · ${Number(l.cost_cents).toFixed(2)}¢` : ''}</li>`).join('')}</ul></details>` : ''}</div>`;
  $('#message').scrollIntoView({ block: 'start' });
  if (!canAnswer) return;
  $('#draftForm').onsubmit = async (e) => {
    e.preventDefault();
    const body = $('#draftBody').value.trim(), out = $('#draftMsg');
    if (body.length < 2) { out.className = 'msg bad'; out.textContent = 'Write a reply first.'; return; }
    try {
      if (draft && draft.status === 'draft') await rpc('inbox_draft_approve', { p_draft: draft.id, p_body: body });
      else await rpc('inbox_reply_write', { p_message: msg.id, p_body: body });
      live('Approved. The reply is sent within a minute.');
      await viewInbox(c, shell, director, msg.id);
    } catch (err) { out.className = 'msg bad'; out.textContent = friendly(err); }
  };
  const dismiss = (spam) => async () => { try { await rpc('inbox_message_dismiss', { p_message: msg.id, p_spam: spam }); await viewInbox(c, shell, director); } catch (err) { $('#draftMsg').className = 'msg bad'; $('#draftMsg').textContent = friendly(err); } };
  $('#dismiss').onclick = dismiss(false);
  $('#spam').onclick = dismiss(true);
}

// ---- boot -----------------------------------------------------------------------------------------------------------------
function boot() {
  try { client().auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_IN' && new URLSearchParams(location.search).has('code')) { history.replaceState(null, '', FFTest.pathname()); render(); } }); }
  catch (e) { page(`<div class="wrap narrow"><div class="card"><h1>Futures Hub</h1><p class="msg bad">${esc(friendly(e))}</p></div></div>`); return; }
  render();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
