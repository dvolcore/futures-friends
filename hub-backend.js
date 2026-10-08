/* Futures Hub backend adapter (Supabase). Gives portal.js the same small document-database interface it already
   uses (collection / where / onSnapshot / doc.set / doc.delete, user.id / user.can) on top of the Futures Hub
   Supabase project, and adds real sign-in to the two sign-in pages.

   Does nothing at all unless window.FF_HUB = {url, anonKey} is set (see hub-config.js). On the live site it is
   not set, so the portals stay in sample mode. Only the public anon key belongs here: every rule that protects
   children's data is enforced in Postgres row-level security and storage policies, never in this file. */
(function(){
const cfg = window.FF_HUB;
if (!cfg || !cfg.url || !cfg.anonKey) return;

// ---- configuration checks (fail closed)
const URL_ = String(cfg.url).replace(/\/+$/, '');
const KEY_ = String(cfg.anonKey);
const isLocal = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(URL_);
if (!isLocal && !/^https:\/\//.test(URL_)) { console.error('FF_HUB.url must be https (or a localhost address).'); return; }
try { // never run with a privileged key in the browser
  const role = JSON.parse(atob(KEY_.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).role;
  if (role && role !== 'anon') { console.error('FF_HUB.anonKey must be the public anon key.'); return; }
} catch (_) { /* publishable keys are not JWTs: fine */ }
if (/service_role|secret/i.test(KEY_) && !/^sb_publishable_/.test(KEY_)) { console.error('FF_HUB.anonKey must be the public anon key.'); return; }

const SB_SRC = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/dist/umd/supabase.js';
const SB_SRI = 'sha384-Rj26LVGvoeRVR6+mwQmFfcR3QOBEwT+ZmuCWpuiqeTzJpCs0ER4ITAWGb4Hiy3Ok';
const BUCKET = 'child-photos';
const POLL_MS = [15000, 30000, 60000, 120000];   // delta resync while realtime is not connected (backs off)
const RESYNC_MS = 10*60*1000;   // delta resync (and renewal of signed photo links) even when realtime is healthy, +/- 20 %
const URL_TTL = 3600;           // signed photo URL lifetime, seconds
const DOCS = ['rooms','kids','days','kidday','progress','obs','photos','msgs'];
const FILTER_COLS = ['kid','room','date'];
const FILTER_OPS = {'==':'eq', '>=':'gte'};   // W4 (W3E-N3): '>=' on date loads recent weeks only
const EXT = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','image/heic':'heic','image/heif':'heif'};

const H = { configured:true, connected:false, role:null, email:null, center:null, userId:null, centers:[], stale:null };
window.FFHub = H;
let sb = null, centerId = null;
const active = new Set();   // live listeners, stopped on sign-out

// ---- load supabase-js (pinned version, subresource integrity)
H.ready = new Promise((resolve, reject) => {
  if (window.supabase && window.supabase.createClient) return resolve();
  const s = document.createElement('script');
  s.src = SB_SRC; s.integrity = SB_SRI; s.crossOrigin = 'anonymous'; s.async = true;
  s.onload = () => resolve(); s.onerror = () => reject(new Error('Could not load the sign-in library.'));
  document.head.appendChild(s);
}).then(() => {
  sb = window.supabase.createClient(URL_, KEY_, {auth:{flowType:'pkce', persistSession:true, autoRefreshToken:true, detectSessionInUrl:true, storageKey:'ff-hub-auth'},
    global:{fetch:centerFetch}});
  sb.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT' && H.connected) { H.connected = false; stopAll(); try{ history.replaceState(null,'','#home'); }catch(_){} location.reload(); } });
});
H.ready.catch(() => {});

// ---- the center this page works in (R6, review H6 / E4)
// One center per page load. Every database call says which one (header x-ff-center): the database refuses a write to any other
// center's rows (hub migration 20261010520000_acting_center_guard.sql). Switching is explicit (the center bar) and reloads the page.
// If another tab switches this browser to another center, this tab stops writing until the person chooses (see markStale).
const SEL_PREFIX = 'ff-hub-center:';
const selKey = () => SEL_PREFIX + (H.userId || '');
const readSel = () => { try { return localStorage.getItem(selKey()); } catch (_) { return null; } };
const writeSel = id => { try { localStorage.setItem(selKey(), id); } catch (_) {} };
const REST = URL_ + '/rest/v1/';
function centerFetch(input, init){
  const u = String(typeof input === 'string' ? input : (input && input.url) || '');
  if (!u.startsWith(REST)) return fetch(input, init);
  const o = Object.assign({}, init || {});
  const method = String(o.method || (input && input.method) || 'GET').toUpperCase();
  if (H.stale && method !== 'GET' && method !== 'HEAD') {
    const body = JSON.stringify({code:'center_changed', message:`This tab is working in ${H.center && H.center.name || 'another center'}, but you switched to ${H.stale.name || 'another center'} in another tab. Choose which center to work in at the top of the page.`});
    return Promise.resolve(new Response(body, {status:409, headers:{'Content-Type':'application/json'}}));
  }
  if (centerId) { const h = new Headers(o.headers || (input && input.headers) || undefined); h.set('x-ff-center', centerId); o.headers = h; }
  return fetch(input, o);
}
function markStale(id){
  if (!H.connected || !centerId || !id || id === centerId) { if (H.stale && id === centerId) { H.stale = null; rerenderPortal(); } return; }
  const to = H.centers.find(c => c.id === id);
  H.stale = {id, name:to ? to.name : ''};
  rerenderPortal();
}
window.addEventListener('storage', e => { if (e.key && e.key === selKey()) markStale(e.newValue); });
const rerenderPortal = () => { try { if (window.FFPortal && window.FFPortal.rerender) window.FFPortal.rerender(); } catch (_) {} };
H.switchCenter = id => {
  if (!H.centers.some(c => c.id === id)) return false;
  writeSel(id); H.stale = null; stopAll();
  try { history.replaceState(null, '', '#' + H.portalFor((H.centers.find(c => c.id === id) || {}).role)); } catch (_) {}
  location.reload();
  return true;
};
H.keepCenter = () => { if (!centerId) return; writeSel(centerId); H.stale = null; rerenderPortal(); };

// ---- errors
function wrap(e, fallback){ const err = new Error((e && e.message) || fallback || 'Request failed'); err.code = (e && (e.code || e.statusCode)) ? String(e.code || e.statusCode) : 'error'; err.cause = e; return err; }
const isDenied = e => !!e && (e.code === '42501' || e.status === 403 || e.statusCode === '403' || e.statusCode === 403 || /row-level security|not authorized|policy|consent/i.test(e.message || ''));

// ---- documents (W3E: row-level realtime). Each listener keeps its rows in memory (id -> data + the row's updated_at). It loads
// them once, then applies each realtime change (insert / update / delete) to that one row and hands the portal a fresh snapshot;
// it never re-downloads the table because something changed. Safety net: a "delta resync" (ids + updated_at only, then just the
// rows that differ) when realtime (re)connects, every RESYNC_MS while healthy, and with backoff (POLL_MS) while it is down.
// One realtime channel per page, one binding per table, filtered to this center; the database's row-level security still
// decides what each person receives (postgres_changes in RLS mode). Families do not subscribe to tables they cannot read.
// Deletes (W4, W3E-N2): the Hub no longer publishes DELETE through postgres_changes (it skipped row-level security and carried
// '<child>_<date>' keys). A delete arrives as {table, ids} on a PRIVATE topic the database lets this person join: staff
// 'ffdel:<center>:staff', a family 'ffdel:<center>:kid:<child>' for each of its own children (hub migration 20261012200000).
const toSnap = rows => { const docs = rows.map(r => ({id:r.id, data:() => r.data})); return {docs, size:docs.length, empty:!docs.length, forEach:f => docs.forEach(f)}; };
const PAGE = 1000, IN_CHUNK = 100;
const NO_FEED_FAMILY = ['days', 'kidday', 'progress'];        // staff-only tables: a family would only ever get delete notices
const KID_TABLES = ['progress', 'obs', 'photos', 'msgs'];      // a family's reads name its own children (uses the (center_id, kid) index)
let famKids = null;                                           // family: own children at this center (RLS decides; this only narrows)
// updated_at as written by PostgREST ("...T12:00:00.123456+00:00") or realtime ("... 12:00:00.123456+00"): one comparable key
const tsKey = s => { const m = /^(\d{4}-\d\d-\d\d)[T ](\d\d:\d\d:\d\d)(?:\.(\d{1,6}))?(Z|[+-]\d\d(?::?\d\d)?)?$/.exec(String(s || '')); if (!m) return String(s || '');
  const tz = !m[4] || m[4] === 'Z' ? 'Z' : m[4].length === 3 ? m[4] + ':00' : m[4].replace(/^([+-]\d\d)(\d\d)$/, '$1:$2');
  const t = Date.parse(`${m[1]}T${m[2]}${tz}`); return isNaN(t) ? String(s) : String(t / 1000 * 1e6 + Number((m[3] || '').padEnd(6, '0'))); };

const urlCache = new Map(); // path -> {url, exp}
const URL_MARGIN = () => RESYNC_MS + 120000;   // re-sign before the next resync could find the link expired
async function attachSrc(rows){
  const now = Date.now(), key = d => d.thumb || d.path;   // lists show the thumbnail when there is one (W3E); the full photo opens on demand
  const need = [...new Set(rows.filter(r => r.data && key(r.data) && !((urlCache.get(key(r.data)) || {}).exp > now + URL_MARGIN())).map(r => key(r.data)))];
  for (let i = 0; i < need.length; i += PAGE) {
    const {data, error} = await sb.storage.from(BUCKET).createSignedUrls(need.slice(i, i + PAGE), URL_TTL);
    // a missing object is remembered too (no link), so it is not asked for again on every check
    if (!error) (data || []).forEach(x => { if (x && x.path) urlCache.set(x.path, {url:x.signedUrl && !x.error ? x.signedUrl : '', exp:now + URL_TTL*1000}); });
  }
  rows.forEach(r => { const c = r.data && key(r.data) && urlCache.get(key(r.data)); if (c && c.url) r.data = Object.assign({}, r.data, {src:c.url}); });
}
async function signOne(path){
  const c = urlCache.get(path); if (c && c.exp > Date.now() + 60000) return c.url;
  const {data, error} = await sb.storage.from(BUCKET).createSignedUrl(path, URL_TTL);
  if (error || !data || !data.signedUrl) return null;
  urlCache.set(path, {url:data.signedUrl, exp:Date.now() + URL_TTL*1000}); return data.signedUrl;
}
// the portal's photo dialog shows `src` (the thumbnail in lists): swap in the full-size photo when one is opened
document.addEventListener('click', e => {
  const b = e.target && e.target.closest && e.target.closest('[data-p2photo]'); if (!b || !H.connected) return;
  const row = [...lists].map(L => L.table === 'photos' && L.rows.get(b.dataset.p2photo)).find(Boolean);
  if (!row || !row.data || !row.data.thumb || !row.data.path) return;
  signOne(row.data.path).then(url => { if (!url) return; document.querySelectorAll('dialog img').forEach(im => { if (row.data.src && im.getAttribute('src') === row.data.src) im.src = url; }); }).catch(() => {});
});

const lists = new Set();     // live listeners
const RT = {ch:null, ok:false, tables:new Set(), poll:null, tries:0, resync:null, build:null};
const feedable = table => !(H.role === 'family' && NO_FEED_FAMILY.includes(table));
function channel(){
  if (RT.build) return;   // listeners added in the same tick share one channel
  RT.build = Promise.resolve().then(() => {
    RT.build = null;
    const want = [...new Set([...lists].map(L => L.table).filter(feedable))].sort();
    if (RT.ch && want.every(t => RT.tables.has(t))) return;
    if (RT.ch) { try { sb.removeChannel(RT.ch); } catch (_) {} RT.ch = null; RT.ok = false; }
    if (!want.length) return;
    delFeed();
    RT.tables = new Set(want);
    try {
      const ch = sb.channel(`hub:${centerId}:${want.join(',')}`);
      want.forEach(t => ch.on('postgres_changes', {event:'*', schema:'public', table:t, filter:`center_id=eq.${centerId}`}, p => onChange(t, p)));
      RT.ch = ch;
      ch.subscribe(status => {
        if (RT.ch !== ch) return;   // a replaced channel closing
        const was = RT.ok; RT.ok = status === 'SUBSCRIBED';
        if (RT.ok) { RT.tries = 0; stopPoll(); if (!was) resyncAll(); }   // (re)connected: catch up on what changed before the feed was live
        else if (was || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') startPoll();
      });
    } catch (_) { RT.ok = false; startPoll(); }
  });
}
// ---- delete notices on private topics (W4, W3E-N2). Needs the realtime client's setAuth (private channels send the user's token).
const DEL = {chs:[], key:''};
function delTopics(){
  if (!centerId) return [];
  if (H.role === 'family') return (famKids || []).filter(k => /^[A-Za-z0-9_.-]+$/.test(k)).map(k => `ffdel:${centerId}:kid:${k}`);
  const a = H.center && H.center.access;
  return a === 'pending' || a === 'expired' || a === 'on_hold' ? [] : [`ffdel:${centerId}:staff`];   // no classroom: no child rows to keep
}
async function delFeed(){
  const topics = lists.size && sb && sb.realtime && typeof sb.realtime.setAuth === 'function' ? delTopics() : [];
  const key = topics.join('|'); if (key === DEL.key) return;
  closeDel(); DEL.key = key; if (!topics.length) return;
  try { await sb.realtime.setAuth(); } catch (_) {}
  if (DEL.key !== key) return;
  for (const t of topics) {
    try {
      const ch = sb.channel(t, {config:{private:true}});
      ch.on('broadcast', {event:'delete'}, m => onDeleted(m && m.payload));
      ch.subscribe(st => { if (st === 'CHANNEL_ERROR' && DEL.chs.includes(ch)) { DEL.chs = DEL.chs.filter(x => x !== ch); try { sb.removeChannel(ch); } catch (_) {} } });   // refused: the resync is the net
      DEL.chs.push(ch);
    } catch (_) {}
  }
}
function closeDel(){ DEL.chs.forEach(ch => { try { sb.removeChannel(ch); } catch (_) {} }); DEL.chs = []; DEL.key = ''; }
function onDeleted(p){
  if (!p || !DOCS.includes(p.table) || !Array.isArray(p.ids)) return;
  for (const id of p.ids) for (const L of lists) if (L.table === p.table) L.apply('DELETE', null, {id:String(id)});
}
H._onDeleted = onDeleted;

function startPoll(){ if (RT.poll || !lists.size) return; const ms = POLL_MS[Math.min(RT.tries, POLL_MS.length - 1)]; RT.tries++;
  RT.poll = setTimeout(() => { RT.poll = null; if (RT.ok) return; resyncAll(); startPoll(); }, ms); }
function stopPoll(){ if (RT.poll) { clearTimeout(RT.poll); RT.poll = null; } }
function resyncAll(){ lists.forEach(L => L.sync()); }
function safetyNet(){ if (RT.resync) return; const next = () => { RT.resync = setTimeout(() => { RT.resync = null; if (!lists.size) return; if (RT.ok) resyncAll(); next(); }, RESYNC_MS * (0.8 + Math.random() * 0.4)); }; next(); }
function closeFeed(){ closeDel(); stopPoll(); if (RT.resync) { clearTimeout(RT.resync); RT.resync = null; } if (RT.ch) { try { sb.removeChannel(RT.ch); } catch (_) {} } RT.ch = null; RT.ok = false; RT.tables = new Set(); }

// one realtime change: the listeners of that table update just that row
function onChange(table, p){
  if (!p) return;
  const row = p.new && Object.keys(p.new).length ? p.new : null, old = p.old || {};
  for (const L of lists) if (L.table === table) L.apply(p.eventType, row, old);
}
// does a row belong to this listener (its where() filter and, for a family, its own children)?
const fits = (L, row) => L.filters.every(f => { const v = row[f.col] ?? (row.data || {})[f.col];
    return f.op === 'gte' ? v != null && String(v) >= String(f.val) : String(v ?? '') === String(f.val); })
  && (!L.kids || L.kids.includes(row.kid ?? (row.data || {}).kid));
// kids: the director's "left on" date (column kids.left_on, W3C-N7) rides along as data._leftOn; it is never written back from data
let noLeftOn = false;
const fullCols = table => table === 'kids' && !noLeftOn ? 'id,data,updated_at,left_on' : 'id,data,updated_at';
const rowData = (table, r) => table === 'kids' && r && 'left_on' in r ? Object.assign({}, r.data, {_leftOn:r.left_on || null}) : r.data;

function listen(table, filters, cb, err){
  const L = {table, filters:filters || [], rows:new Map(), loaded:false, stopped:false, busy:null, again:false, timer:null,
    kids:H.role === 'family' && KID_TABLES.includes(table) && famKids ? famKids : null};
  const base = cols => { let q = sb.from(table).select(cols).eq('center_id', centerId); for (const f of L.filters) q = q[f.op](f.col, f.val); if (L.kids) q = q.in('kid', L.kids); return q; };
  const emit = () => { if (L.stopped || L.timer) return; L.timer = setTimeout(async () => {   // coalesce a burst of changes into one snapshot
    L.timer = null; if (L.stopped) return;
    const rows = [...L.rows].map(([id, r]) => ({id, data:r.data})).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    if (table === 'photos') { try { await attachSrc(rows); } catch (_) {} rows.forEach(r => { const m = L.rows.get(r.id); if (m) m.data = r.data; }); }
    if (!L.stopped) { try { cb(toSnap(rows)); } catch (_) {} }
  }, 0); };
  const fail = e => { if (!L.stopped && err) { try { err(e); } catch (_) {} } };
  async function pages(cols){
    const out = [];
    for (let from = 0; ; from += PAGE) {
      const {data, error} = await base(cols).order('id').range(from, from + PAGE - 1);
      if (error && cols.includes('left_on') && /left_on/.test(error.message || '')) { noLeftOn = true; return pages(fullCols(table)); }   // a Hub without kids.left_on
      if (error) throw wrap(error, 'Could not load data');
      out.push(...data); if (data.length < PAGE) return out;
    }
  }
  // first load: every row; afterwards: ids + updated_at, then only the rows that are new or changed
  async function sync(){
    if (L.stopped) return; if (L.busy) { L.again = true; return L.busy; }
    L.busy = (async () => {
      try {
        if (L.kids && !L.kids.length) { L.rows.clear(); L.loaded = true; return emit(); }
        if (!L.loaded) {
          (await pages(fullCols(table))).forEach(r => L.rows.set(r.id, {data:rowData(table, r), at:tsKey(r.updated_at)}));
          L.loaded = true; return emit();
        }
        const seen = await pages('id,updated_at'), ids = new Set(seen.map(r => r.id)); let changed = false;
        for (const id of [...L.rows.keys()]) if (!ids.has(id)) { L.rows.delete(id); changed = true; }
        const stale = seen.filter(r => { const m = L.rows.get(r.id); return !m || m.at !== tsKey(r.updated_at); }).map(r => r.id);
        for (let i = 0; i < stale.length; i += IN_CHUNK) {
          const {data, error} = await base(fullCols(table)).in('id', stale.slice(i, i + IN_CHUNK));
          if (error) throw wrap(error, 'Could not load data');
          data.forEach(r => L.rows.set(r.id, {data:rowData(table, r), at:tsKey(r.updated_at)}));
          changed = true;
        }
        if (!changed && table === 'photos') {   // nothing new: still renew photo links that would expire before the next check
          const lim = Date.now() + URL_MARGIN();
          changed = [...L.rows.values()].some(m => { const k = m.data && (m.data.thumb || m.data.path), c = k && urlCache.get(k); return !!k && (!c || c.exp < lim); });
        }
        if (changed) emit();
      } catch (e) { fail(e); }
      finally { L.busy = null; if (L.again && !L.stopped) { L.again = false; sync(); } }
    })();
    return L.busy;
  }
  L.sync = sync;
  L.apply = (type, row, old) => {
    if (!L.loaded) return void sync();   // still loading: the load (and a re-check) picks it up
    if (type === 'DELETE') { if (old && old.id != null && L.rows.delete(String(old.id))) emit(); return; }
    if (!row || row.id == null || (row.center_id && row.center_id !== centerId)) return;
    const id = String(row.id);
    if (!('data' in row) || !('updated_at' in row)) return void sync();   // a trimmed payload (very large row): fetch what changed
    if (fits(L, row)) { const m = L.rows.get(id), at = tsKey(row.updated_at); if (m && m.at === at) return; L.rows.set(id, {data:rowData(table, row), at}); emit(); }
    else if (L.rows.delete(id)) emit();   // moved out of this listener (e.g. a child changed room)
  };
  // this page's own write, shown at once (realtime or the next resync then confirms it with the Hub's updated_at)
  L.local = (id, data) => { if (!L.loaded) return; if (data == null) { if (L.rows.delete(id)) emit(); return; }
    const row = Object.assign({id, kid:data.kid, room:data.room, date:data.date}, {data});
    if (table === 'kids') { const m = L.rows.get(id); data = Object.assign({}, data, {_leftOn:m && m.data ? m.data._leftOn || null : null}); row.data = data; }
    if (fits(L, row)) { L.rows.set(id, {data, at:'local'}); emit(); } else if (L.rows.delete(id)) emit(); };
  lists.add(L); channel(); safetyNet(); sync();
  const stop = () => { if (L.stopped) return; L.stopped = true; clearTimeout(L.timer); lists.delete(L); active.delete(stop); if (!lists.size) closeFeed(); };
  active.add(stop);
  return stop;
}
function stopAll(){ [...active].forEach(s => s()); closeFeed(); }
const localWrite = (table, id, data) => lists.forEach(L => { if (L.table === table) L.local(String(id), data == null ? null : JSON.parse(JSON.stringify(data))); });

// ---- thumbnails (W3E): a ~320 px JPEG beside every new photo, '<photo path>.thumb.jpg' in the same center/child folder, so the
// same storage rules decide it (staff of that center, and only with the child's photo consent on file). Lists load it instead
// of the full photo. If the browser cannot make one, the photo is saved without it and lists fall back to the full photo.
const THUMB_PX = 320;
async function makeThumb(blob){
  try {
    if (typeof createImageBitmap !== 'function' || !document.createElement) return null;
    const bmp = await createImageBitmap(blob), s = Math.min(1, THUMB_PX / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(bmp.width * s)); c.height = Math.max(1, Math.round(bmp.height * s));
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); if (bmp.close) bmp.close();
    return await new Promise(r => c.toBlob(b => r(b), 'image/jpeg', 0.72));
  } catch (_) { return null; }
}
async function storePhoto(data){
  const d = Object.assign({}, data), src = d.src; delete d.src;
  if (typeof src === 'string' && src.startsWith('data:')) {
    const m = /^data:(image\/[a-z0-9.+-]+);base64,/i.exec(src), ext = m && EXT[m[1].toLowerCase()];
    if (!ext) { const e = new Error('That file type cannot be stored as a photo.'); e.code = 'bad_photo'; throw e; }
    if (!/^[A-Za-z0-9_.-]+$/.test(String(d.kid || ''))) { const e = new Error('Photo needs a child.'); e.code = 'bad_photo'; throw e; }
    const blob = await (await fetch(src)).blob();
    const path = `${centerId}/${d.kid}/${crypto.randomUUID()}.${ext}`;
    const {error} = await sb.storage.from(BUCKET).upload(path, blob, {contentType:m[1].toLowerCase(), upsert:false});
    if (error) { const e = wrap(error, 'Photo upload failed'); e.code = isDenied(error) ? 'photo_consent' : 'upload_failed'; throw e; }
    d.path = path; delete d.thumb;
    const tb = await makeThumb(blob);
    if (tb) { const tp = path + '.thumb.jpg'; const t = await sb.storage.from(BUCKET).upload(tp, tb, {contentType:'image/jpeg', upsert:false}); if (!t.error) d.thumb = tp; }
  }
  return d;
}

// ---- saves that fail outside the waiting list (W3E): a clear message that stays until the person closes it or the same record
// saves. Writes that lost the connection are hub-offline.js's (it keeps them and says "Not saved yet"): not repeated here.
const KIND_ = {kidday:'Attendance and care log', days:'Room checklist, lunch or class notes', progress:'Learning Steps', obs:'Learning note',
  msgs:'Message', rooms:'Classroom', kids:'Child record', photos:'Photo'};
const saveErrs = new Map();   // 'table:id' -> {what, msg, at}
const netErr = e => { const m = [e && e.message, e && e.cause && e.cause.message].filter(Boolean).join(' ');
  return (typeof navigator !== 'undefined' && navigator.onLine === false) || /failed to fetch|networkerror|network request failed|load failed|fetch failed|timeout|did not answer/i.test(m); };
function saveMsg(table, e){
  const c = e && String(e.code || ''), raw = (e && e.cause && e.cause.message) || (e && e.message) || '';
  if (c === 'photo_consent') return 'This child does not have photo consent on file, so the photo was not saved.';
  if (c === 'bad_photo') return raw;
  if (c === 'center_changed' || /another center|classroom access at this center/i.test(raw)) return raw;
  if (netErr(e)) return table === 'photos' ? 'There is no connection to the Futures Hub, so the photo was not saved. Add it again when you are back online.' : 'There is no connection to the Futures Hub. Try again when you are back online.';
  if (c === 'upload_failed') return 'The photo could not be uploaded. Try again.';
  if (c === '42501' || isDenied(e && e.cause) || isDenied(e)) return 'You do not have permission to make that change.';
  return `The Futures Hub did not accept this change${c && c !== 'error' ? ` (code ${esc_(c)})` : ''}. Try again; if it keeps happening, tell your director.`;
}
function saveFailed(table, id, e){
  setTimeout(() => {   // after hub-offline.js has decided: an entry in its waiting list is shown there, not here
    try { if (window.FFOffline && window.FFOffline.items().some(x => x.t === table && x.id === String(id))) return; } catch (_) {}
    saveErrs.set(table + ':' + id, {what:KIND_[table] || 'Change', msg:saveMsg(table, e), at:new Date()}); paintErrs();
  }, 0);
}
function saveOk(table, id){ if (saveErrs.delete(table + ':' + id)) paintErrs(); }
const SE_CSS = `<style id="hubSeCss">.hub-se{position:sticky;top:0;z-index:60;margin:0;padding:10px 16px;background:#FDECEC;color:#6B1111;border-bottom:2px solid #B42318}
.hub-se ul{list-style:none;margin:6px 0 0;padding:0;display:grid;gap:6px}.hub-se li{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:baseline}
.hub-se .hub-se-acts{display:flex;gap:8px;flex-wrap:wrap}.hub-se button{min-height:32px}</style>`;
function paintErrs(){
  if (typeof document === 'undefined' || !document.getElementById) return;
  let el = document.getElementById('hubSaveErr');
  if (!saveErrs.size) { if (el) el.remove(); return; }
  if (!el) {
    const main = document.getElementById('view'); if (!main || !main.parentNode) return;
    try { if (!document.getElementById('hubSeCss')) document.head.insertAdjacentHTML('beforeend', SE_CSS); } catch (_) {}
    el = document.createElement('div'); el.id = 'hubSaveErr'; el.className = 'hub-se'; el.setAttribute('role', 'alert');
    main.parentNode.insertBefore(el, main);
  }
  const t = d => { try { return d.toLocaleTimeString('en-US', {hour:'numeric', minute:'2-digit'}); } catch (_) { return ''; } };
  el.innerHTML = `<div class="wrap"><b>${saveErrs.size === 1 ? 'A change was not saved.' : `${saveErrs.size} changes were not saved.`}</b> It is not in the Futures Hub: enter it again once the problem below is fixed.
   <ul>${[...saveErrs].map(([k, x]) => `<li><span><b>Not saved: ${esc_(x.what)}</b> (${esc_(t(x.at))}). ${esc_(x.msg)}</span><button class="btn soft" type="button" data-hubse="${esc_(k)}">Dismiss</button></li>`).join('')}</ul>
   ${saveErrs.size > 1 ? '<div class="hub-se-acts"><button class="btn soft" type="button" data-hubse="*">Dismiss all</button></div>' : ''}</div>`;
}
document.addEventListener('click', e => {
  const b = e.target && e.target.closest && e.target.closest('[data-hubse]'); if (!b) return; e.preventDefault();
  if (b.dataset.hubse === '*') saveErrs.clear(); else saveErrs.delete(b.dataset.hubse);
  paintErrs();
});

async function setDoc(table, id, obj){
  let data = JSON.parse(JSON.stringify(obj));
  if (table === 'kids' && data) delete data._leftOn;   // read-only copy of kids.left_on (the director sets it: H.leftOnSet)
  try {
    if (table === 'photos') data = await storePhoto(data);
  } catch (e) { saveFailed(table, String(id), e); throw e; }
  const row = {center_id:centerId, id:String(id), data};
  const newPaths = table === 'photos' && data.path && data.path !== (obj && obj.path) ? [data.path, data.thumb].filter(Boolean) : null; // uploaded by this call
  try {
    if (H.role === 'family') { // families only edit their own message (read flag) or add one: avoid upsert, which also needs INSERT rights
      const u = await sb.from(table).update({data}).eq('center_id', centerId).eq('id', row.id).select('id');
      if (u.error) throw u.error;
      if (!(u.data && u.data.length)) { const i = await sb.from(table).insert(row); if (i.error) throw i.error; }
    } else {
      const {error} = await sb.from(table).upsert(row, {onConflict:'center_id,id'}); if (error) throw error;
    }
  } catch (e) {
    if (newPaths) sb.storage.from(BUCKET).remove(newPaths).catch(() => {}); // row refused: do not leave orphan objects
    const w = wrap(e, 'Could not save'); if (table === 'photos' && isDenied(e)) w.code = 'photo_consent';
    saveFailed(table, row.id, w); throw w;
  }
  saveOk(table, row.id); localWrite(table, row.id, data);
}
async function delDoc(table, id){
  const {error} = await sb.from(table).delete().eq('center_id', centerId).eq('id', String(id));
  if (error) { const w = wrap(error, 'Could not delete'); saveFailed(table, String(id), w); throw w; }
  saveOk(table, String(id)); localWrite(table, id, null);
}

function makeDb(){
  const q = (table, filter) => ({
    onSnapshot:(cb, err) => listen(table, filter, cb, err),
    where:(col, op, val) => { if (!FILTER_OPS[op] || !FILTER_COLS.includes(col) || (op === '>=' && col !== 'date')) throw new Error('Unsupported filter: ' + col + ' ' + op);
      return q(table, (filter || []).concat([{col, op:FILTER_OPS[op], val}])); }
  });
  return {collection:table => {
    if (!DOCS.includes(table)) throw new Error('Unknown collection: ' + table);
    return Object.assign(q(table, []), {doc:id => ({
      set:obj => setDoc(table, id, obj),
      delete:() => delDoc(table, id)
    })});
  }};
}

// ---- auth + session
async function loadContext(){
  await H.ready;
  const {data:{session}} = await sb.auth.getSession(); if (!session) return null;
  const uid = session.user.id;
  const m = await sb.from('memberships').select('center_id,role').eq('user_id', uid).order('center_id');
  if (m.error || !m.data.length) return null;
  const cs = await sb.from('centers').select('id,name').in('id', m.data.map(x => x.center_id));
  const names = {}; (cs.data || []).forEach(c => names[c.id] = c.name);
  // staff: classroom access at each center (training only while background checks are pending, expired or on hold)
  const acc = {};
  if (m.data.some(x => x.role !== 'family')) {
    const a = await sb.rpc('my_staff_access');
    if (!a.error) (a.data || []).forEach(r => acc[r.center_id] = r);
  }
  H.centers = m.data.map(x => ({id:x.center_id, role:x.role, name:names[x.center_id] || '',
    access:x.role === 'family' ? 'family' : (acc[x.center_id] ? acc[x.center_id].access : 'unknown'),
    missing:acc[x.center_id] ? (acc[x.center_id].missing || []).map(i => i.title) : []}))
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  H.userId = uid; H.email = session.user.email || '';
  // the center chosen last on this browser (explicitly), else the first by name; the choice is remembered per person
  const pick = H.centers.find(c => c.id === readSel()) || H.centers[0];
  centerId = pick.id; H.center = pick; H.role = pick.role; H.stale = null;
  writeSel(pick.id);
  return pick;
}
H.peek = loadContext;
H.client = () => sb;
// W4: the director's edit history (W3C-N6) and the day a child left (W3C-N7). The database decides who may (director at AAL2).
H.history = async (o) => {
  const a = {p_center:centerId, p_table:o && o.table || null, p_record_id:o && o.record || null, p_kid:o && o.kid || null,
    p_since:o && o.since || null, p_limit:Math.max(1, Math.min(1000, (o && o.limit) || 200))};
  const {data, error} = await sb.rpc('care_history_list', a);
  if (error) throw wrap(error, 'Could not load the edit history');
  return data || [];
};
H.leftOnSet = async (kid, date) => {   // same (center, child, date) again changes nothing: safe for hub-offline.js to replay
  const args = {p_center:centerId, p_kid:String(kid), p_left_on:date || null};
  const id = `${kid}:left_on:${date || 'none'}`;
  if (window.FFOffline && window.FFOffline.call) {
    const r = await window.FFOffline.call('kid_left_on_set', args, id);
    if (!r.queued) lists.forEach(L => { if (L.table === 'kids' && L.loaded) L.sync(); });
    return r;
  }
  const {data, error} = await sb.rpc('kid_left_on_set', args);
  if (error) throw wrap(error, 'Could not record the day this child left');
  lists.forEach(L => { if (L.table === 'kids' && L.loaded) L.sync(); });
  return {data};
};   // the signed-in Supabase client, for the training screens (academy-lms*.js); RLS still decides everything
H.connect = async () => {
  const pick = await loadContext(); if (!pick) return null;
  if (H.gate && !(await H.gate(pick))) return null;   // hub-auth.js: directors and HQ finish two-step verification first
  H.connected = true;
  famKids = null;
  if (pick.role === 'family') {   // the family's own children here: its reads then name them (RLS still decides what comes back)
    const g = await sb.from('guardianships').select('kid').eq('center_id', pick.id).eq('user_id', H.userId);
    if (!g.error && Array.isArray(g.data)) famKids = [...new Set(g.data.map(x => x.kid))].sort();
  }
  const staff = pick.role !== 'family';
  const classroom = staff && pick.access !== 'pending' && pick.access !== 'expired' && pick.access !== 'on_hold';
  return {db:makeDb(), role:pick.role, center:pick, email:H.email, userId:H.userId,
    user:{id:async () => H.userId, can:async p => p === 'data.write' ? classroom : false, profiles:async () => ({})}};
};
H.signIn = async (email, password) => {
  try { await H.ready; } catch (e) { return {ok:false, error:'Sign-in is unavailable right now. Try again in a moment.'}; }
  const {error} = await sb.auth.signInWithPassword({email:String(email).trim(), password:String(password)});
  if (!error) return {ok:true};
  if (error.status === 429 || /rate limit|too many/i.test(error.message || '')) return {ok:false, error:'Too many tries. Wait a minute and try again.'};
  if (error.status === 400 || error.status === 422 || /invalid login/i.test(error.message || '')) return {ok:false, error:'That email and password did not match. Check them and try again.'};
  return {ok:false, error:'Could not sign in. Try again in a moment.'};
};
H.magicLink = async (email, who) => {
  try { await H.ready; } catch (e) { return {ok:false, error:'Sign-in is unavailable right now. Try again in a moment.'}; }
  const redirect = location.origin + (window.FF_ROOT_PATH||location.pathname) + '#' + (who === 'Family' ? 'signin-family' : 'signin-teacher');
  const {error} = await sb.auth.signInWithOtp({email:String(email).trim(), options:{shouldCreateUser:false, emailRedirectTo:redirect}});
  if (error && (error.status === 429 || /rate limit|too many|seconds/i.test(error.message || ''))) return {ok:false, error:'A link was just sent. Wait a minute before asking for another.'};
  return {ok:true}; // same answer whether or not the address has an account
};
H.signOut = async () => {
  H.connected = false; stopAll();
  try { await sb.auth.signOut(); } catch (_) {}
  try { history.replaceState(null, '', '#' + (H.role === 'family' ? 'signin-family' : 'signin-teacher')); } catch (_) {}
  location.reload();
};
H.portalFor = role => role === 'family' ? 'family-portal' : 'portal';
H.afterSignIn = who => afterSignIn(who);   // hub-auth.js continues here after two-step verification

// ---- one-time links from the hub's own emails (hub/worker/crm-sync.mjs): ?token_hash=...&type=invite|recovery#signin-teacher.
// The link is taken out of the address bar at once (it works once and must not linger in history or a shared screenshot), checked
// with Supabase (verifyOtp), and the person then chooses a password on the sign-in page.
const LINK_TYPES = ['invite', 'recovery'];
let setPw = null;     // null | {state:'verifying'|'ready'|'error', email}
try {
  const q0 = new URLSearchParams(location.search);
  if (q0.get('token_hash') && LINK_TYPES.includes(q0.get('type'))) {
    setPw = {state:'verifying', hash:q0.get('token_hash'), type:q0.get('type')};
    const u = new URL(location.href); u.searchParams.delete('token_hash'); u.searchParams.delete('type');
    history.replaceState(null, '', u.pathname + u.search + u.hash);
  }
} catch (_) { setPw = null; }

// ---- sign-in pages
const esc_ = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function pwCard(who){
  if (setPw.state === 'verifying') return `<div class="card signin" id="hubSigninCard" style="margin-bottom:18px"><h3>Checking your link</h3><p class="small">One moment...</p></div>`;
  if (setPw.state === 'error') return `<div class="card signin" id="hubSigninCard" style="margin-bottom:18px" role="alert"><h3>This link no longer works</h3>
 <p class="small">For your security, an invitation link works once and expires after a short time. A new one is emailed automatically the next day. If you already chose a password, sign in below.</p></div>` + signinForm(who);
  return `<form class="card signin" id="hubPwForm" data-who="${who}" style="margin-bottom:18px" novalidate><h3>Choose your password</h3>
 <p class="small">Welcome${setPw.email ? `, <b>${esc_(setPw.email)}</b>` : ''}. Choose a password for the Futures Hub. You will use it with this email address to sign in.</p>
 <input type="email" name="username" autocomplete="username" value="${esc_(setPw.email || '')}" hidden>
 <label class="f" for="hubNewPass">New password (at least 10 characters)<input class="i" id="hubNewPass" name="password" type="password" autocomplete="new-password" minlength="10" required style="padding:9px 11px"></label>
 <label class="f" for="hubNewPass2">Type it again<input class="i" id="hubNewPass2" name="confirm" type="password" autocomplete="new-password" minlength="10" required style="padding:9px 11px"></label>
 <button class="btn gold" type="submit" id="hubPwGo">Save password and sign in</button>
 <p class="note" id="hubMsg" role="alert" aria-live="polite"></p></form>`;
}
function signinForm(who){
  return `<form class="card signin" id="hubSigninForm" data-who="${who}" style="margin-bottom:18px" novalidate><h3>Sign in to your account</h3>
 <p class="small">Use the email and password from your invitation. Your information is saved to your account.</p>
 <label class="f" for="hubEmail">Email<input class="i" id="hubEmail" name="email" type="email" autocomplete="username" required style="padding:9px 11px"></label>
 <label class="f" for="hubPass">Password<input class="i" id="hubPass" name="password" type="password" autocomplete="current-password" style="padding:9px 11px"></label>
 <button class="btn gold" type="submit" id="hubGo">Sign in</button>
 <button class="btn soft" type="button" data-hub="magic" id="hubMagic">Email me a sign-in link</button>
 <p class="note" id="hubMsg" role="alert" aria-live="polite"></p>
 <p class="note">Accounts are created by your center. There is no sign-up on this site.</p></form>`;
}
function hubCard(who){
  const a = H.authCard && H.authCard(who); if (a) return a;   // hub-auth.js: two-step verification screen
  if (setPw) return pwCard(who);
  if (H.connected) return `<div class="card signin" id="hubSigninCard" style="margin-bottom:18px"><h3>You are signed in</h3>
 <p class="small">Signed in as <b>${esc_(H.email)}</b>${H.center && H.center.name ? ' at ' + esc_(H.center.name) : ''}.</p>
 <button class="btn gold" type="button" data-go="${H.portalFor(H.role)}">Open the ${H.role === 'family' ? 'Family' : 'Teacher'} Portal</button>
 <button class="btn soft" type="button" data-hub="signout">Sign out</button></div>`;
  return signinForm(who);
}
const hubMsg = (t, bad) => { const m = document.getElementById('hubMsg'); if (!m) return; m.textContent = t || ''; m.style.color = bad ? 'var(--bad)' : 'var(--ok)'; };
['Family','Teacher'].forEach(who => {
  const key = 'signin-' + who.toLowerCase(), base = V[key];
  V[key] = () => base().replace('<form class="card signin" id="signinForm"', () => hubCard(who) + '<form class="card signin" id="signinForm"');
});

async function afterSignIn(who){
  const pick = await loadContext(); // role check before any portal data is loaded
  if (!pick) { hubMsg('Your account is not linked to a center yet. Ask your center to finish your invitation.', true); try{ await sb.auth.signOut({scope:'local'}); }catch(_){} return; }
  if ((pick.role === 'family') !== (who === 'Family')) {
    try{ await sb.auth.signOut({scope:'local'}); }catch(_){}
    hubMsg(pick.role === 'family' ? 'That is a family account. Use Family Sign-In.' : 'That is a staff account. Use Teacher Sign-In.', true); return;
  }
  const c = await window.FFPortal.connectHub();
  if (!c) { hubMsg('Could not open your portal. Try again in a moment.', true); return; }
  go(H.portalFor(c.role));
}
document.addEventListener('submit', async e => {
  const f = e.target; if (f.id !== 'hubPwForm') return; e.preventDefault();
  const p1 = f.elements.password.value, p2 = f.elements.confirm.value;
  const weak = window.FFHubAuth ? window.FFHubAuth.pwProblem(p1, setPw && setPw.email) : (p1.length < 10 ? 'Use at least 10 characters.' : '');
  if (weak) { hubMsg(weak, true); return; }
  if (p1 !== p2) { hubMsg('The two passwords do not match.', true); return; }
  const b = document.getElementById('hubPwGo'); b.disabled = true; hubMsg('Saving...', false);
  const {error} = await sb.auth.updateUser({password:p1});
  if (error) {
    b.disabled = false;
    hubMsg(error.status === 401 || /session|expired|jwt/i.test(error.message || '') ? 'This page timed out. Open the link from your email again.' : 'That password cannot be used. Choose a longer one, different from any password you used before.', true);
    return;
  }
  setPw = null;
  try { await afterSignIn(f.dataset.who); } catch (err) { render(); }
});
document.addEventListener('submit', async e => {
  const f = e.target; if (f.id !== 'hubSigninForm') return; e.preventDefault();
  const email = f.elements.email.value, pass = f.elements.password.value;
  if (!email.trim() || !pass) { hubMsg('Enter your email and password.', true); return; }
  const b = document.getElementById('hubGo'); b.disabled = true; hubMsg('Signing in...', false);
  const r = await H.signIn(email, pass);
  if (!r.ok) { b.disabled = false; hubMsg(r.error, true); return; }
  try { await afterSignIn(f.dataset.who); } catch (err) { hubMsg('Could not open your portal. Try again in a moment.', true); }
  b.disabled = false;
});
document.addEventListener('click', async e => {
  const t = e.target.closest('[data-hub]'); if (!t) return;
  if (t.dataset.hub === 'signout') { e.preventDefault(); return H.signOut(); }
  if (t.dataset.hub === 'magic') {
    e.preventDefault(); const f = document.getElementById('hubSigninForm'); if (!f) return;
    const email = f.elements.email.value; if (!email.trim()) { hubMsg('Enter your email first, then ask for a link.', true); return; }
    t.disabled = true; hubMsg('Sending...', false);
    const r = await H.magicLink(email, f.dataset.who); t.disabled = false;
    hubMsg(r.ok ? 'If that address has an account, a sign-in link is on its way. Open it in this same browser.' : r.error, !r.ok);
  }
});

// ---- the center bar on both portals: which center this page works in, the switch, and training-only status
const ACCESS_NOTE = {
  pending:'Training only for now: your classroom (children, families, photos and messages) opens by itself once your background checks are on file with the center.',
  expired:'Training only: a background check on file has expired. Your classroom opens again once the renewed check is recorded.',
  on_hold:'Training only: your classroom access at this center is on hold. Your director can tell you more.'};
let pickDraft = null;     // the center chosen in the switch but not switched to yet (survives the portal redrawing itself)
function centerBar(){
  if (!H.connected || !H.center) return '';
  const c = H.center, many = H.centers.length > 1, chosen = pickDraft || c.id;
  const roleTxt = r => r === 'family' ? 'family' : r === 'director' ? 'director' : 'staff';
  const stale = H.stale ? `<div class="hub-cb-stale" role="alert"><b>You switched to ${esc_(H.stale.name || 'another center')} in another tab.</b> This tab still shows ${esc_(c.name)} and will not save anything until you choose.
    <span class="hub-cb-acts"><button class="btn gold" type="button" data-hubc="go" data-id="${esc_(H.stale.id)}">Work in ${esc_(H.stale.name || 'that center')}</button><button class="btn soft" type="button" data-hubc="keep">Keep working in ${esc_(c.name)}</button></span></div>` : '';
  const note = ACCESS_NOTE[c.access] ? `<p class="hub-cb-note" role="status">${esc_(ACCESS_NOTE[c.access])}${c.missing && c.missing.length ? ` Still needed: ${c.missing.map(esc_).join('; ')}.` : ''} <button class="rl" type="button" data-go="learn">Open my training</button></p>` : '';
  const sw = many ? `<form class="hub-cb-switch" id="hubCenterSwitch" novalidate><label class="f" for="hubCenterPick">Switch center<select class="i" id="hubCenterPick" name="center">${H.centers.map(x => `<option value="${esc_(x.id)}" ${x.id === chosen ? 'selected' : ''}>${esc_(x.name || 'Unnamed center')} (${roleTxt(x.role)})</option>`).join('')}</select></label>
    <button class="btn soft" type="submit" data-hubc="switch">Switch</button></form>` : '';
  return `<div class="hub-cb wrap" id="hubCenterBar" data-center="${esc_(c.id)}"><div class="hub-cb-row"><span class="small">Working in</span> <b id="hubCenterName">${esc_(c.name || 'your center')}</b> <span class="chip">${roleTxt(c.role)}</span>${many ? `<span class="small muted">${H.centers.length} centers on this account</span>` : ''}</div>${sw}${note}${stale}</div>`;
}
const CB_CSS = `<style id="hubCbCss">.hub-cb{display:grid;gap:8px;margin:14px auto 0;padding:12px 16px;border:2px solid var(--gold,#E7A928);border-radius:12px;background:var(--paper,#FBF6EC)}
.hub-cb-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.hub-cb-switch{display:flex;flex-wrap:wrap;gap:8px;align-items:end}.hub-cb-switch .f{min-width:220px;flex:1 1 220px}
.hub-cb-note{margin:0;font-size:14px}.hub-cb-stale{display:grid;gap:8px;padding:10px;border-radius:8px;background:#FDECEC;color:#6B1111}.hub-cb-acts{display:flex;flex-wrap:wrap;gap:8px}</style>`;
let wrapped = false;
function wrapPortals(){
  if (wrapped) return; wrapped = true;
  try { if (!document.getElementById('hubCbCss')) document.head.insertAdjacentHTML('beforeend', CB_CSS); } catch (_) {}
  ['portal', 'family-portal'].forEach(k => {
    const base = V[k]; if (typeof base !== 'function') return;
    V[k] = () => {
      const html = base(); const bar = centerBar(); if (!bar) return html;
      const at = html.indexOf('<section class="band-paper"');
      return at < 0 ? bar + html : html.slice(0, at) + bar + html.slice(at);
    };
  });
}
document.addEventListener('change', e => { if (e.target && e.target.id === 'hubCenterPick') pickDraft = e.target.value; });
document.addEventListener('submit', e => {
  const f = e.target; if (!f || f.id !== 'hubCenterSwitch') return; e.preventDefault();
  const id = f.elements.center.value; if (id && H.center && id !== H.center.id) H.switchCenter(id);
});
document.addEventListener('click', e => {
  const t = e.target.closest && e.target.closest('[data-hubc]'); if (!t) return; e.preventDefault();
  if (t.dataset.hubc === 'go') H.switchCenter(t.dataset.id);
  else if (t.dataset.hubc === 'keep') H.keepCenter();
  else if (t.dataset.hubc === 'switch') { const sel = document.getElementById('hubCenterPick'); if (sel && H.center && sel.value !== H.center.id) H.switchCenter(sel.value); }
});
H.centerBar = centerBar;

// ---- on load: restore a saved session (or finish a magic-link sign-in) once portal.js is ready
H.boot = async () => {
  wrapPortals();
  const fromLink = new URLSearchParams(location.search).has('code');
  try { await H.ready; } catch (_) { if (setPw) { setPw = {state:'error'}; if (/^signin-/.test(view)) render(); } return; }
  if (setPw && setPw.state === 'verifying') {
    try { await sb.auth.signOut({scope:'local'}); } catch (_) {}   // the link is for one person: never mix it with a session already in this browser
    const {data, error} = await sb.auth.verifyOtp({token_hash:setPw.hash, type:setPw.type});
    setPw = error ? {state:'error'} : {state:'ready', email:(data && data.user && data.user.email) || ''};
    if (/^signin-/.test(view)) render(); else go('signin-teacher');
    return;
  }
  let c = null; try { c = await window.FFPortal.connectHub(); } catch (_) {}
  if (c && fromLink) { try{ history.replaceState(null, '', location.pathname); }catch(_){} go(H.portalFor(c.role)); }
  else if (c && /^signin-/.test(view)) render();
};
})();
