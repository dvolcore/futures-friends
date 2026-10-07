/* Futures Friends website statistics (window.ffTrack). Privacy first, by construction:
   - sends ONLY to our own self-hosted analytics server named in window.FF_ANALYTICS (analytics-config.js); with no url or
     no website id it sends nothing at all and ffTrack does nothing
   - no cookies, no localStorage identifiers, no fingerprinting; campaign tags (utm_*) are kept in sessionStorage for this
     tab only. The only localStorage value ever written is the visitor's own "off" switch on the Privacy page
   - Do Not Track or Global Privacy Control: nothing is sent and nothing is stored
   - virtual pageviews carry the ROUTE NAME ONLY (#job/<id> -> /job); never the address bar's query string, never a form
     field, never a name, email, phone, reference number or child detail; property keys that look personal are dropped
   - nothing at all is sent while a Teacher/Family Portal, Training Academy or LMS view is open
   Event taxonomy and retention: docs/analytics/ANALYTICS_PLAN.md (CRM repo). Loaded after every other site script. */
(function (root) {
'use strict';
const doc = root.document;
const nav = root.navigator || {};
const loc = root.location || { hash: '', search: '', hostname: '' };

// ---------------------------------------------------------------- rules
const EXCLUDED = new Set(['portal', 'family-portal', 'academy', 'learn', 'learn-course', 'learn-cert', 'learn-team', 'learn-author', 'learn-approve', 'verify']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// a property key that could carry personal data is never sent, whatever a caller passes
const PII_KEY = /(^|_)(name|first|last|full|email|mail|phone|tel|mobile|address|street|city|zip|postal|dob|birth|birthday|child|kid|kids|age|ageband|ref|reference|token|password|pass|ssn|message|msg|note|notes|comment|resume|ip|user|userid|id|uid|session|search|query|q)($|_)/i;
const UTM_KEYS = ['source', 'medium', 'campaign', 'content', 'term'];
const MAX_EVENTS = 300;                  // per page load: a runaway loop can never flood the server
const OFF_KEY = 'ff-analytics-off';
const UTM_STORE = 'ff-utm';

function config(c = root.FF_ANALYTICS) {
  c = c || {};
  const url = String(c.url || '').trim().replace(/\/+$/, '');
  const siteId = String(c.siteId || '').trim();
  const okUrl = /^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(url) || /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(url);
  return okUrl && UUID.test(siteId) ? { url, siteId } : null;
}
function privacySignal(n = nav, w = root) {
  const dnt = String(n.doNotTrack || w.doNotTrack || n.msDoNotTrack || '').toLowerCase();
  return n.globalPrivacyControl === true || dnt === '1' || dnt === 'yes';
}
function optedOut() { try { return root.localStorage.getItem(OFF_KEY) === '1'; } catch (_) { return false; } }
const enabled = () => !!config() && !privacySignal() && !optedOut();

const known = id => typeof V !== 'undefined' && Object.prototype.hasOwnProperty.call(V, id);   // V: the site's route table (views.js)
// '#job/abc?x=1' -> 'job'; '' -> 'home'; an id that is not a route -> null (counted as a 404, the id itself is never sent)
function routeOf(hash, isKnown = known) {
  const id = String(hash || '').replace(/^#/, '').split(/[/?&#=]/)[0].toLowerCase();
  if (!id) return 'home';
  if (!/^[a-z0-9-]{1,40}$/.test(id) || !isKnown(id)) return null;
  return id;
}
function cleanValue(v) {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v * 100) / 100 : undefined;
  if (typeof v !== 'string') return undefined;
  const s = v.replace(/\s+/g, ' ').trim().slice(0, 80);
  // anything that looks like an address, phone number, link with parameters or long number is dropped
  if (!s || /@|https?:|www\.|[?&][^\s]*=|\d{3}\D?\d{3}\D?\d{4}|\d{6,}/.test(s)) return undefined;
  return s;
}
function cleanProps(props) {
  const out = {};
  let n = 0;
  for (const k of Object.keys(props || {})) {
    if (n >= 12) break;
    if (!/^[a-z][a-z0-9_]{0,31}$/.test(k) || PII_KEY.test(k)) continue;
    const v = cleanValue(props[k]);
    if (v === undefined) continue;
    out[k] = v; n++;
  }
  return out;
}
const cleanName = name => (/^[a-z][a-z0-9_]{1,39}$/.test(String(name || '')) ? String(name) : null);
function readUtm(search) {
  let p; try { p = new URLSearchParams(String(search || '').replace(/^[^?]*\?/, '?')); } catch (_) { return null; }
  const o = {};
  for (const k of UTM_KEYS) {
    const raw = String(p.get('utm_' + k) || '');
    if (!raw || cleanValue(raw) === undefined) continue;          // an address, phone number or link in a tag is dropped whole
    const v = raw.toLowerCase().replace(/[^a-z0-9_.-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64);
    if (v) o[k] = v;
  }
  return Object.keys(o).length ? o : null;
}
const utmQuery = u => (u ? '?' + UTM_KEYS.filter(k => u[k]).map(k => 'utm_' + k + '=' + encodeURIComponent(u[k])).join('&') : '');
const utmProps = u => { const o = {}; if (u) for (const k of UTM_KEYS) if (u[k]) o['utm_' + k] = u[k]; return o; };
// first touch of this tab: the campaign that brought the visitor in, kept in sessionStorage only
const landingUtm = () => { const hq = String(loc.hash || '').split('?')[1]; return readUtm(loc.search) || (hq ? readUtm('?' + hq) : null); };
// a stored value is re-checked with the same rules: dvolcore.github.io is shared with other sites that could write this key
function revalidate(saved) {
  try { const o = JSON.parse(saved); return o && typeof o === 'object' ? readUtm('?' + UTM_KEYS.filter(k => typeof o[k] === 'string').map(k => 'utm_' + k + '=' + encodeURIComponent(o[k])).join('&')) : null; } catch (_) { return null; }
}
function firstTouch(now) {
  try {
    const saved = root.sessionStorage.getItem(UTM_STORE);
    const ok = saved ? revalidate(saved) : null;
    if (ok) return ok;
    if (saved) root.sessionStorage.removeItem(UTM_STORE);
    if (now) root.sessionStorage.setItem(UTM_STORE, JSON.stringify(now));
  } catch (_) { /* storage blocked: use this page's tags only */ }
  return now;
}
const lang = () => String(nav.language || '').toLowerCase().split('-')[0].replace(/[^a-z]/g, '').slice(0, 3);
// coarse size bucket (hundreds of pixels): enough for phone / tablet / desktop, not enough to tell devices apart
const screenBucket = () => { const s = root.screen || {}; const r = x => Math.round((+x || 0) / 100) * 100; return s.width ? r(s.width) + 'x' + r(s.height) : ''; };
// another site's ORIGIN only (never its path or query), and nothing for our own pages
function referrerOrigin(ref, host = loc.hostname) {
  try { const u = new URL(ref); return /^https?:$/.test(u.protocol) && u.hostname !== host ? u.protocol + '//' + u.hostname + '/' : ''; } catch (_) { return ''; }
}

// ---------------------------------------------------------------- state + transport
const S = { route: null, routeKey: null, excluded: false, sent: 0, landing: true, utm: null, scroll: new Set(), forms: new WeakSet(), video: new WeakMap(), lastDl: '' };

function base(route) {
  const c = config();
  const p = { website: c.siteId, hostname: String(loc.hostname || '').slice(0, 100), url: '/' + (route || 'home'), language: lang(), screen: screenBucket() };
  const m = root.FFRouteMeta && root.FFRouteMeta.ROUTES && Object.prototype.hasOwnProperty.call(root.FFRouteMeta.ROUTES, route) ? root.FFRouteMeta.ROUTES[route] : null;
  if (m && typeof m[0] === 'string') p.title = m[0].slice(0, 120);
  return p;
}
function post(payload) {
  if (S.sent >= MAX_EVENTS) return false;
  S.sent++;
  const c = config();
  try {
    // text/plain is a CORS "simple" request: no preflight, no cookies, no referrer
    const r = root.fetch(c.url + '/api/send', { method: 'POST', body: JSON.stringify({ type: 'event', payload }), headers: { 'Content-Type': 'text/plain' },
      keepalive: true, credentials: 'omit', mode: 'cors', referrerPolicy: 'no-referrer', cache: 'no-store' });
    if (r && r.catch) r.catch(() => {});
  } catch (_) { /* never break the page */ }
  return true;
}
function pageview(route) {
  if (!enabled() || !route || EXCLUDED.has(route)) return false;
  const p = base(route);
  if (S.landing) {
    const ref = referrerOrigin(doc && doc.referrer);
    if (ref) p.referrer = ref;
    if (S.landingUtm) p.url += utmQuery(S.landingUtm);   // campaign of THIS landing, so the dashboard's UTM and channel reports work
    S.landing = false;
  }
  return post(p);
}
function track(name, props) {
  name = cleanName(name);
  if (!name || !enabled() || S.excluded) return false;
  const p = base(S.route || 'home');
  p.name = name;
  const data = Object.assign(cleanProps(props), utmProps(S.utm));
  if (Object.keys(data).length) p.data = data;
  return post(p);
}

// ---------------------------------------------------------------- routes (virtual pageviews)
function onRoute(attempted) {
  syncToggle();
  const r = routeOf(loc.hash) || 'home';
  const key = String(loc.hash || '');
  const same = key === S.routeKey && r === S.route;
  S.routeKey = key; S.route = r; S.excluded = EXCLUDED.has(r);
  if (attempted === false && !S.excluded) track('route_404', {});
  if (same) return;
  S.scroll = new Set();
  pageview(r);
}
function wrapGo() {
  const orig = root.go;
  if (typeof orig !== 'function' || orig.__ffAnalytics) return;
  const wrapped = function (v) {
    const ok = typeof v === 'string' && known(v);
    const res = orig.apply(this, arguments);
    try { onRoute(ok); } catch (_) { /* never break navigation */ }
    return res;
  };
  wrapped.__ffAnalytics = true;
  root.go = wrapped;
}

// ---------------------------------------------------------------- delegated events
const attr = (el, k) => (el && el.getAttribute ? el.getAttribute(k) : null);
const closest = (el, sel) => (el && el.closest ? el.closest(sel) : null);
function place(el) {
  if (closest(el, 'footer')) return 'footer';
  if (closest(el, 'header, nav')) return 'header';
  return 'page';
}
function fileOf(href, dl) {
  const name = String(dl || href || '').split(/[?#]/)[0].split('/').pop().toLowerCase();
  const m = /\.([a-z0-9]{2,5})$/.exec(name);
  return { file: name.replace(/[^a-z0-9._-]/g, '').slice(0, 60), type: m ? m[1] : 'file' };
}
function dataProps(el) {
  const o = {};
  for (const k of Object.keys(el.dataset || {})) if (/^track[A-Z]/.test(k)) o[k.slice(5).replace(/^[A-Z]/, c => c.toLowerCase()).replace(/[A-Z]/g, c => '_' + c.toLowerCase())] = el.dataset[k];
  return o;
}
function onClick(e) {
  const t = e.target;
  const toggle = closest(t, '[data-ff-analytics-toggle]');
  if (toggle) { setOff(!optedOut()); return; }
  if (!enabled() || S.excluded) return;
  const from = S.route || 'home';
  const explicit = closest(t, '[data-track]');
  if (explicit) { track(attr(explicit, 'data-track'), Object.assign({ from }, dataProps(explicit))); return; }
  const a = closest(t, 'a[href]');
  if (a) {
    const href = attr(a, 'href') || '';
    if (/^mailto:/i.test(href)) return void track('contact_click', { method: 'email', from });
    if (/^tel:/i.test(href)) return void track('contact_click', { method: 'phone', from });
    if (a.hasAttribute && a.hasAttribute('download') || /\.(pdf|docx?|xlsx?|pptx?|csv|txt|zip|epub)([?#]|$)/i.test(href)) {
      const f = fileOf(href, attr(a, 'download'));
      if (S.lastDl === f.file + '|' + from) return;            // the same programmatic download clicked twice in one view
      S.lastDl = f.file + '|' + from;
      return void track('download', { file: f.file, type: f.type, from });
    }
    if (/^https?:/i.test(href)) {
      let host = ''; try { host = new URL(href).hostname; } catch (_) { /* malformed */ }
      if (host && host !== loc.hostname) return void track('outbound_click', { domain: host.replace(/^www\./, '').slice(0, 60), from });
    }
    if (href.charAt(0) === '#') {
      const to = routeOf(href);
      if (to) return void track(place(a) === 'page' ? 'cta_click' : 'nav_click', { to, from, place: place(a) });
    }
  }
  const g = closest(t, '[data-go]') || closest(t, '[data-post]') || closest(t, 'button[data-job]');
  if (g) {
    const to = attr(g, 'data-go') !== null ? routeOf(attr(g, 'data-go')) : attr(g, 'data-post') !== null ? 'post' : 'job';
    if (to) track(place(g) === 'page' ? 'cta_click' : 'nav_click', { to, from, place: place(g) });
    return;
  }
  const book = closest(t, '.ffb');
  if (book) root.setTimeout(() => { if (attr(book, 'aria-expanded') === 'true') track('story_open', { book: String(attr(book, 'aria-label') || '').replace(/^Peek inside\s*/i, ''), from }); }, 0);
}
function onChange(e) {
  if (!enabled() || S.excluded) return;
  const t = e.target;
  if (!t || !t.dataset || t.dataset.q === undefined) return;
  const qty = Math.max(0, Math.floor(+t.value || 0));
  let item = 'item-' + String(t.dataset.q).replace(/\D/g, '').slice(0, 4);
  try { if (typeof D !== 'undefined' && D.catalog && D.catalog[+t.dataset.q]) item = D.catalog[+t.dataset.q].item || item; } catch (_) { /* no catalog */ }
  track('store_cart', { item, qty, action: qty > 0 ? 'set' : 'remove' });
}
function onFocus(e) {
  if (!enabled() || S.excluded) return;
  const f = closest(e.target, 'form');
  if (!f || S.forms.has(f)) return;
  S.forms.add(f);
  track('form_start', { form: attr(f, 'data-track-form') || attr(f, 'id') || 'form', from: S.route || 'home' });
}
// intake.js reports each submission's kind and outcome (ok / invalid / unavailable / network / error), never a field value
function onIntake(e) {
  const d = (e && e.detail) || {};
  const kind = String(d.kind || '').replace(/[^a-z_]/g, '').slice(0, 30) || 'form';
  const result = String(d.outcome || '').replace(/[^a-z_]/g, '').slice(0, 20) || 'error';
  track(kind === 'subscribe' ? 'bop_subscribe' : 'form_submit', { form: kind, result, from: S.route || 'home' });
}
function videoKey(v) {
  return String(attr(v, 'data-track-video') || v.id || attr(v, 'id') || String(v.currentSrc || attr(v, 'src') || '').split(/[?#]/)[0].split('/').pop() || 'video').slice(0, 60);
}
function onMedia(e) {
  const v = e.target;
  if (!v || v.tagName !== 'VIDEO' || !enabled() || S.excluded) return;
  if (v.autoplay && v.muted && v.loop) return;                  // decorative background loops are not "watched"
  let st = S.video.get(v);
  if (!st) { st = { played: false, marks: new Set() }; S.video.set(v, st); }
  if (e.type === 'play' && !st.played) { st.played = true; track('video_play', { video: videoKey(v), from: S.route || 'home' }); return; }
  const pct = e.type === 'ended' ? 100 : (v.duration > 0 ? (v.currentTime / v.duration) * 100 : 0);
  for (const m of [25, 50, 75, 100]) {
    if (pct >= m && !st.marks.has(m)) { st.marks.add(m); track('video_progress', { video: videoKey(v), pct: m, from: S.route || 'home' }); }
  }
}
let scrollAt = 0;
function onScroll() {
  const now = Date.now();
  if (now - scrollAt < 250 || !enabled() || S.excluded || !doc) return;
  scrollAt = now;
  const h = (doc.documentElement && doc.documentElement.scrollHeight) || 0, vh = root.innerHeight || 0;
  if (!h || !vh || h < vh * 2.5) return;                         // only long pages
  const depth = ((root.scrollY || 0) + vh) / h * 100;
  for (const m of [25, 50, 75, 100]) {
    if (depth >= (m === 100 ? 98 : m) && !S.scroll.has(m)) { S.scroll.add(m); track('scroll_depth', { pct: m }); }
  }
}

// ---------------------------------------------------------------- the visitor's own switch (Privacy page)
function setOff(off) {
  if (privacySignal()) { syncToggle(); return; }       // the browser already says no: nothing to store
  try { if (off) root.localStorage.setItem(OFF_KEY, '1'); else root.localStorage.removeItem(OFF_KEY); } catch (_) { /* blocked */ }
  if (off) { try { root.sessionStorage.removeItem(UTM_STORE); } catch (_) { /* blocked */ } }
  syncToggle();
}
function syncToggle() {
  if (!doc || !doc.querySelectorAll) return;
  const off = optedOut(), signal = privacySignal();
  doc.querySelectorAll('[data-ff-analytics-toggle]').forEach(b => {
    b.textContent = signal ? 'Your browser asks sites not to track: nothing is counted' : off ? 'Website statistics are off on this browser. Turn them back on' : 'Turn off website statistics on this browser';
    b.setAttribute('aria-pressed', off || signal ? 'true' : 'false');
    if (signal) b.setAttribute('disabled', '');
  });
}

// ---------------------------------------------------------------- public API
function ffTrack(name, props) { return track(name, props); }
ffTrack.enabled = enabled;
ffTrack.optOut = () => setOff(true);
ffTrack.optIn = () => setOff(false);
ffTrack._t = { config, privacySignal, routeOf, cleanProps, cleanName, readUtm, referrerOrigin, screenBucket, EXCLUDED, PII_KEY, state: S, onRoute };
root.ffTrack = ffTrack;

// ---------------------------------------------------------------- start
// Unconfigured: only the Privacy-page switch works (and is kept in sync); nothing else is listened to, stored or sent.
// Configured: every handler still checks enabled() first, so DNT / GPC / the visitor's "off" switch mean nothing is sent or stored.
if (!doc) return;
wrapGo();
if (!config()) {
  if (doc.addEventListener) doc.addEventListener('click', e => { if (closest(e.target, '[data-ff-analytics-toggle]')) setOff(!optedOut()); }, true);
  return;
}
S.landingUtm = landingUtm();                                       // read once, before any script rewrites the address bar
if (enabled()) S.utm = firstTouch(S.landingUtm);
doc.addEventListener('click', onClick, true);                     // capture: runs before the router re-renders the page
doc.addEventListener('change', onChange, true);
doc.addEventListener('focusin', onFocus, true);
doc.addEventListener('ff:intake', onIntake);
['play', 'timeupdate', 'ended'].forEach(t => doc.addEventListener(t, onMedia, true));   // media events do not bubble; capture sees them
if (root.addEventListener) {
  root.addEventListener('scroll', onScroll, { passive: true });
  // safety net: a route change that did not go through go() (the router's own handlers normally call it; duplicates are ignored)
  root.addEventListener('hashchange', () => { try { onRoute(); } catch (_) { /* never break the page */ } });
  root.addEventListener('popstate', () => { try { onRoute(); } catch (_) { /* never break the page */ } });
}
// the first view: FFstart() routes through the wrapped go(); an unknown starting hash is a 404 FFstart quietly sends home
const startHash = String(loc.hash || '').replace(/^#/, '').split(/[/?&#=]/)[0];
if (startHash && routeOf(startHash) === null && enabled()) S.pending404 = true;
const origStart = root.FFstart;
if (typeof origStart === 'function') {
  root.FFstart = function () {
    const r = origStart.apply(this, arguments);
    if (S.pending404) { S.pending404 = false; track('route_404', {}); }
    return r;
  };
}
})(typeof window !== 'undefined' ? window : globalThis);
