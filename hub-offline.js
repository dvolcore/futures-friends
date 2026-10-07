/* Futures Hub: what happens when the connection to the Hub is lost (R5 / care record CR-16).

   Wraps the portal's save path from outside (window.FFHub.connect, .signOut, the portal views and the toast) so portal.js and
   hub-backend.js keep their own code. Does nothing unless the Hub is configured (hub-backend.js set window.FFHub).

   1. An entry is never shown as saved before the Hub confirms it. A write that cannot reach the Hub goes into a waiting list
      ("outbox") and the row says "Not saved yet" until it is sent; anything else the Hub refuses says "Not saved".
   2. A banner and the portal badge say what is true: "Offline — N changes waiting", "Reconnecting", or Live. Driven by the
      outcome of real requests (saves and the portal's own data loads), a check of the Hub address, and online/offline events.
   3. The waiting list is kept in this browser's localStorage under one key per signed-in user. Each entry holds only what is
      needed to send it again: table, record id, center id, the record itself, a fingerprint of the Hub's version it was based
      on, a time and an order number. No names, roster or other copies. It is deleted on sign-out. When the Hub is back the
      entries are sent in order with the SAME record id (the Hub's upsert by (center_id, id) then keeps one record). If the
      Hub's record changed in the meantime the entry is held and the person chooses: send theirs or keep the Hub's.
   4. A signed-in person never falls into the sample classrooms: while the Hub cannot be reached the portal says so instead.
   5. A paper downtime sheet (attendance, meals, notes) for the room, with the roster from the last successful load (kept in
      memory only, never stored), opens from the banner.
   6. (W3B) Calls to a few Hub functions whose record id is chosen here (arrival.js: check-in, check-out, room move; a family's
      pickup-list request) use the same waiting list: FFOffline.call(name, args, id). The Hub function returns the record that is
      already there when the same id comes again, so a resend never makes a second one. Calls that carry a PIN or a one-day code
      are never kept on the device: they need a connection. */
(function(){
const H = window.FFHub;
if (!H || !H.configured) return;

const CFG = window.FF_HUB || {};
const HUB_URL = String(CFG.url || '').replace(/\/+$/, ''), HUB_KEY = String(CFG.anonKey || '');
const AUTH_KEY = 'ff-hub-auth';              // hub-backend.js storageKey (Supabase session)
const BOX = 'ff-hub-outbox-v1:';             // + user id
const QUEUED = ['rooms', 'kids', 'days', 'kidday', 'progress', 'obs', 'msgs'];   // photos need their upload: never queued
const RPCS = ['arrival_check_in', 'arrival_check_out', 'arrival_move', 'pickup_request_submit', 'kid_left_on_set'];   // W3B: replay-safe by id; W4: the day a child left (same date again changes nothing)
const SECRET_ARGS = ['p_pin', 'p_override_pin', 'p_day_code'];
const isRpc = t => typeof t === 'string' && t.indexOf('rpc:') === 0 && RPCS.includes(t.slice(4));
const SEND_MS = 10000, CONNECT_MS = 15000, PROBE_MS = [3000, 6000, 12000, 15000];
const MSG_WAIT = 'Not saved yet. It is kept on this device and will send when the Futures Hub is back.';
const MSG_NOSTORE = 'Not saved yet. This browser could not keep it: leave this page open until it sends.';
const KIND = {kidday:'Attendance and care log', days:'Room checklist, lunch or class notes', progress:'Learning Steps', obs:'Learning note',
  msgs:'Message', rooms:'Classroom', kids:'Child record', 'rpc:arrival_check_in':'Check-in', 'rpc:arrival_check_out':'Check-out',
  'rpc:arrival_move':'Room move', 'rpc:pickup_request_submit':'Pickup list request', 'rpc:kid_left_on_set':'Day a child left'};

// ---- small helpers
const ls = {
  get(k){ try { return localStorage.getItem(k); } catch (_) { return null; } },
  set(k, v){ try { localStorage.setItem(k, v); return true; } catch (_) { return false; } },
  del(k){ try { localStorage.removeItem(k); } catch (_) { /* unavailable */ } },
  keys(){ const a = []; try { for (let i = 0; i < localStorage.length; i++) a.push(localStorage.key(i)); } catch (_) { /* unavailable */ } return a; }
};
const E = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'}[c]));
const online = () => !(typeof navigator !== 'undefined' && navigator.onLine === false);
const plain = o => JSON.parse(JSON.stringify(o));
const canon = v => (v === null || typeof v !== 'object') ? JSON.stringify(v === undefined ? null : v)
  : Array.isArray(v) ? '[' + v.map(canon).join(',') + ']'
  : '{' + Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
function hash(v){ if (v == null) return null; const s = canon(v); let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16); }
function timed(p, ms){ let t; return Promise.race([p, new Promise((_, rej) => { t = setTimeout(() => { const e = new Error('The Futures Hub did not answer in time.'); e.code = 'timeout'; rej(e); }, ms); })]).finally(() => clearTimeout(t)); }
// a request that never reached the Hub (or got no usable answer) as opposed to one the Hub refused
function isNetwork(e){
  if (!e) return false; if (e.code === 'timeout' || !online()) return true;
  const m = [e.message, e.details, e.cause && e.cause.message].filter(Boolean).join(' ');
  return /failed to fetch|networkerror|network request failed|load failed|fetch failed|internet|ERR_|ECONN|bad gateway|service unavailable|gateway time-?out|upstream/i.test(m);
}
function storedUid(){ try { const j = JSON.parse(ls.get(AUTH_KEY) || 'null'); const u = j && (j.user || (j.currentSession && j.currentSession.user)); return u && u.id ? String(u.id) : null; } catch (_) { return null; } }
const ctx = () => { try { return window.FFPortal && window.FFPortal.ctx ? window.FFPortal.ctx() : null; } catch (_) { return null; } };
const curView = () => { try { return typeof view === 'string' ? view : ''; } catch (_) { return ''; } };
const inPortal = () => /^(portal|family-portal)$/.test(curView());
const rerender = () => { if (inPortal() && typeof render === 'function') { try { render(); } catch (_) { /* view error */ } } };
const toast0 = typeof window.toast === 'function' ? window.toast : (typeof toast === 'function' ? toast : null);
const say = m => { if (toast0) toast0(m); };

// ---- state. mode: none (not signed in here) | pending (a saved session is being opened) | connected | offline (signed in, Hub
// unreachable, portal not loaded) | unlinked | lib (offline and the sign-in library itself could not load)
const S = {mode:'none', net: online() ? 'live' : 'offline', uid:null, items:[], seq:0, stored:true, db:null, flushing:false,
  retry:0, timer:null, open:false, lastQueued:0, inflight:new Map(), refused:new Map()};
const listeners = new Set();     // portal data listeners: {t, filter, cb, raw}
const lastSeen = new Map();      // 't:id' -> fingerprint of the Hub's version (memory only)
const names = new Map();         // kid id -> "First L." from the last load (memory only, for labels and the paper sheet)

// ---- the waiting list
const here = it => S.mode === 'connected' && !!H.center && it.c === H.center.id;
const mine = () => S.items.filter(here);
function load(uid){
  S.uid = uid; let o = null; try { o = JSON.parse(ls.get(BOX + uid) || 'null'); } catch (_) { o = null; }
  S.items = (o && Array.isArray(o.items) ? o.items : []).filter(x => x && typeof x.id === 'string' && typeof x.c === 'string'
      && ((QUEUED.includes(x.t) && (x.op === 'set' || x.op === 'del')) || (isRpc(x.t) && x.op === 'rpc' && x.data && typeof x.data === 'object')))
    .map(x => ({n:+x.n || 0, t:x.t, id:x.id, c:x.c, op:x.op, at:+x.at || 0, base:x.base === undefined ? '?' : x.base, data:x.op === 'del' ? null : x.data}));
  S.items.forEach(x => { if (x.op === 'rpc') SECRET_ARGS.forEach(k => { delete x.data[k]; }); });
  S.items.sort((a, b) => a.n - b.n); S.seq = S.items.reduce((m, x) => Math.max(m, x.n), 0);
}
function persist(){
  if (!S.uid) return;
  if (!S.items.length) { ls.del(BOX + S.uid); S.stored = true; return; }
  S.stored = ls.set(BOX + S.uid, JSON.stringify({v:1, items:S.items.map(x => ({n:x.n, t:x.t, id:x.id, c:x.c, op:x.op, at:x.at, base:x.base, data:x.data}))}));
}
function clearUser(uid){ ls.keys().forEach(k => { if (k && k.indexOf(BOX + uid) === 0) ls.del(k); }); }
const covers = (L, t, id, data) => L.t === t && L.raw && (!L.filter || (data && data[L.filter.col] === L.filter.val) || L.raw.some(r => r.id === id));
function baseOf(t, id, data){
  for (const L of listeners) if (covers(L, t, id, data)) { const r = L.raw.find(x => x.id === id); return r ? hash(r.data) : null; }
  return lastSeen.has(t + ':' + id) ? lastSeen.get(t + ':' + id) : '?';
}
function enqueue(t, id, op, data){
  const c = H.center.id; let it = S.items.find(x => x.t === t && x.id === id && x.c === c);
  if (it) { it.op = op; it.data = op === 'del' ? null : data; it.at = Date.now(); delete it.conflict; delete it.failed; delete it.force; }
  else { it = {n:++S.seq, t, id, c, op, at:Date.now(), base:baseOf(t, id, data), data:op === 'del' ? null : data}; S.items.push(it); }
  S.lastQueued = Date.now(); persist(); paint(); say(S.stored ? MSG_WAIT : MSG_NOSTORE);
  if (S.net === 'live') kick();
}
// the Hub now holds `data` for this record: remember it as the Hub's version
function confirm(t, id, data){
  lastSeen.set(t + ':' + id, hash(data));
  for (const L of listeners) if (covers(L, t, id, data)) {
    const i = L.raw.findIndex(r => r.id === id);
    if (data == null) { if (i >= 0) L.raw.splice(i, 1); } else if (i >= 0) L.raw[i] = {id, data:plain(data)}; else L.raw.push({id, data:plain(data)});
  }
}

// ---- the portal's database, wrapped
const toSnap = rows => { const docs = rows.map(r => ({id:r.id, data:() => r.data})); return {docs, size:docs.length, empty:!docs.length, forEach:f => docs.forEach(f)}; };
function overlay(L){
  const rows = new Map(L.raw.map(r => [r.id, r.data]));
  for (const it of mine()) if (it.t === L.t && covers(L, it.t, it.id, it.data)) { if (it.op === 'del') rows.delete(it.id); else rows.set(it.id, it.data); }
  return [...rows].map(([id, data]) => ({id, data}));
}
function emit(L){ if (L.raw) { try { L.cb(toSnap(overlay(L))); } catch (_) { /* portal callback */ } } }
const emitAll = () => listeners.forEach(emit);
function watch(t, filter, ref, cb, err){
  const L = {t, filter, cb, raw:null}; listeners.add(L);
  const stop = ref.onSnapshot(snap => {
    L.raw = snap.docs.map(d => ({id:String(d.id), data:d.data()}));
    L.raw.forEach(r => lastSeen.set(t + ':' + r.id, hash(r.data)));
    if (t === 'kids') L.raw.forEach(r => { const k = r.data || {}; const n = k.first ? `${k.first} ${k.last ? String(k.last).charAt(0) + '.' : ''}`.trim() : (k.name || ''); if (n) names.set(r.id, n); });
    reached(); emit(L);
  }, e => { if (isNetwork(e)) lost(); if (err) err(e); });
  return () => { listeners.delete(L); stop(); };
}
async function write(t, id, op, obj, ref){
  const call = () => op === 'del' ? ref.delete() : ref.set(obj);
  if (!QUEUED.includes(t) || !H.center) { try { return await call(); } catch (e) { if (isNetwork(e)) lost(); throw e; } }
  const data = op === 'del' ? null : plain(obj), key = t + ':' + id;
  if (S.net !== 'live' || mine().length) { enqueue(t, id, op, data); return; }   // never overtake earlier waiting entries
  S.inflight.set(key, data); S.refused.delete(key);
  try { await timed(call(), SEND_MS); confirm(t, id, data); reached(); }
  catch (e) {
    if (isNetwork(e)) { lost(); enqueue(t, id, op, data); return; }   // unknown outcome: sending again with the same id is safe
    S.refused.set(key, data); throw e;
  } finally { S.inflight.delete(key); }
}
function wrapDb(db){
  const q = (t, ref, filter) => ({onSnapshot:(cb, err) => watch(t, filter, ref, cb, err), where:(col, op, val) => q(t, ref.where(col, op, val), {col, val})});
  return {collection:t => {
    const c = db.collection(t);
    return Object.assign(q(t, c, null), {doc:id => { const d = c.doc(id), sid = String(id); return {set:obj => write(t, sid, 'set', obj, d), delete:() => write(t, sid, 'del', null, d)}; }});
  }};
}

// ---- Hub function calls with a record id chosen here (W3B)
async function sendRpc(name, args){
  const sb = H.client && H.client(); if (!sb) { const e = new Error('Futures Hub client unavailable'); e.code = 'timeout'; throw e; }
  const r = await timed(sb.rpc(name, args), SEND_MS);
  if (r.error) throw r.error; return r.data;
}
const rpcWatchers = new Set();
function rpcDone(it, data){ rpcWatchers.forEach(f => { try { f({name:it.t.slice(4), id:it.id, args:it.data, data}); } catch (_) { /* watcher */ } }); }
// Resolves {data} when the Hub answered, {queued:true} when it is kept to send later; throws when the Hub refused it.
async function call(name, args, id){
  if (!RPCS.includes(name)) throw new Error('Not a waiting-list call: ' + name);
  if (!H.center || S.mode !== 'connected') { const e = new Error('Not connected to the Futures Hub.'); e.code = 'timeout'; throw e; }
  const data = plain(args || {}), secret = SECRET_ARGS.some(k => data[k] != null && data[k] !== '');
  const keep = () => {
    if (secret) { const e = new Error('This needs a connection to the Futures Hub (a PIN or code is never kept on the device).'); e.code = 'needs_connection'; throw e; }
    enqueueRpc(name, String(id), data); return {queued:true};
  };
  if (S.net !== 'live' || mine().length) return keep();
  try { const d = await sendRpc(name, data); reached(); return {data:d}; }
  catch (e) { if (isNetwork(e)) { lost(); return keep(); } throw e; }
}
function enqueueRpc(name, id, data){
  const t = 'rpc:' + name, c = H.center.id;
  if (S.items.some(x => x.t === t && x.id === id && x.c === c)) return;
  S.items.push({n:++S.seq, t, id, c, op:'rpc', at:Date.now(), base:null, data});
  S.lastQueued = Date.now(); persist(); paint(); say(S.stored ? MSG_WAIT : MSG_NOSTORE);
  if (S.net === 'live') kick();
}

// ---- reachability
function lost(){ if (S.mode === 'none') return; const was = S.net; S.net = 'offline'; if (was !== 'offline') paint(); schedule(); }
function reached(){ if (S.net !== 'live' && !S.flushing) { S.retry = 0; if (mine().length) kick(); else { S.net = 'live'; paint(); } } }
function schedule(){ if (S.timer) return; const ms = PROBE_MS[Math.min(S.retry, PROBE_MS.length - 1)]; S.retry++; S.timer = setTimeout(() => { S.timer = null; tryNow(); }, ms); }   // one pending check at a time: repeated errors never postpone it
async function probe(){
  if (!online() || !HUB_URL || typeof fetch !== 'function') return false;
  try { const r = await timed(fetch(HUB_URL + '/rest/v1/', {headers:{apikey:HUB_KEY}, cache:'no-store'}), 8000); return r.status < 500; } catch (_) { return false; }
}
async function tryNow(all){
  clearTimeout(S.timer); S.timer = null;
  if (S.mode === 'none' || S.mode === 'unlinked') return;
  if (!(await probe())) { S.net = 'offline'; paint(); schedule(); return; }
  S.retry = 0;
  if (S.mode === 'lib') { location.reload(); return; }   // the sign-in library never loaded: a reload is the only way back in
  if (S.mode === 'offline' || S.mode === 'pending') {
    S.net = 'reconnecting'; paint();
    let c = null; try { c = window.FFPortal && window.FFPortal.connectHub ? await window.FFPortal.connectHub() : null; } catch (_) { c = null; }
    if (!c && S.mode !== 'connected') { if (S.mode === 'offline') { S.net = 'offline'; paint(); schedule(); } }
    return;
  }
  return flush(!!all);
}
const kick = () => { if (S.mode === 'connected' && !S.flushing) flush(false); };

// ---- sending the waiting entries, in order, each with its own record id
async function readRow(it){
  const sb = H.client && H.client(); if (!sb) { const e = new Error('Futures Hub client unavailable'); e.code = 'timeout'; throw e; }
  const r = await timed(sb.from(it.t).select('data').eq('center_id', it.c).eq('id', it.id).maybeSingle(), SEND_MS);
  if (r.error) throw r.error; return r.data ? {data:r.data.data} : null;
}
async function flush(all){
  if (S.flushing || S.mode !== 'connected' || !S.db) return;
  S.flushing = true; S.net = 'reconnecting'; paint();
  let net = true;
  try {
    for (const it of mine().sort((a, b) => a.n - b.n)) {
      if (!S.items.includes(it) || (it.conflict && !it.force) || (it.failed && !all)) continue;
      const sent = it.data, at = it.at;
      if (it.op === 'rpc') {
        try {
          const r = await sendRpc(it.t.slice(4), sent);
          if (r && r.ok === false) { it.failed = true; continue; }   // e.g. no longer allowed: held for the person, never retried silently
          S.items.splice(S.items.indexOf(it), 1); delete it.failed; rpcDone(it, r);
        } catch (e) { if (isNetwork(e)) { net = false; break; } it.failed = true; }
        continue;
      }
      try {
        const cur = await readRow(it), now = cur ? hash(cur.data) : null, want = it.op === 'del' ? null : hash(sent);
        if (now !== want && !it.force && now !== (it.base === '?' ? null : it.base)) { it.conflict = {data:cur ? cur.data : null}; continue; }   // changed in the Hub meanwhile
        if (now !== want) { const ref = S.db.collection(it.t).doc(it.id); await timed(it.op === 'del' ? ref.delete() : ref.set(sent), SEND_MS); }
        confirm(it.t, it.id, sent);
        if (it.at === at) S.items.splice(S.items.indexOf(it), 1); else { it.base = want; delete it.force; }   // edited again while sending: send the newer one next
        delete it.failed;
      } catch (e) {
        if (isNetwork(e)) { net = false; break; }
        it.failed = true; S.refused.delete(it.t + ':' + it.id);
      }
    }
  } finally {
    S.flushing = false; persist();
    if (net) { S.net = 'live'; S.retry = 0; } else { S.net = 'offline'; schedule(); }
    paint(); emitAll();
    if (net && mine().some(x => !x.conflict && !x.failed)) setTimeout(kick, 50);
  }
}
function resolve(n, keepMine){
  const it = S.items.find(x => x.n === n); if (!it) return;
  if (keepMine) { it.force = true; delete it.conflict; delete it.failed; persist(); return flush(true); }
  if (it.conflict) confirm(it.t, it.id, it.conflict.data);   // show the Hub's version again
  S.items.splice(S.items.indexOf(it), 1); persist(); paint(); emitAll();
}

// ---- FFHub: connect, sign-out
const connect0 = H.connect, signOut0 = H.signOut;
H.connect = async function(){
  let c = null, err = null;
  try { c = await timed(Promise.resolve(connect0.apply(H, arguments)), CONNECT_MS); } catch (e) { err = e; }
  if (c && c.db) {
    S.mode = 'connected'; S.db = c.db; load(H.userId); S.net = online() ? 'live' : 'offline';
    c.db = wrapDb(c.db); paint();
    if (mine().length) setTimeout(() => tryNow(true), 0);
    return c;
  }
  const uid = storedUid();
  if (uid && ((err && err.code === 'timeout') || !(await probe()))) { offline(uid, 'offline'); return null; }
  S.mode = uid ? 'unlinked' : 'none'; paint(); rerender();   // reachable but no center for this saved sign-in: never the sample classrooms
  if (err) throw err; return null;
};
function offline(uid, mode){ S.mode = mode; S.net = 'offline'; load(uid); paint(); rerender(); schedule(); }
H.signOut = async function(){
  const uid = H.userId || storedUid() || S.uid;
  if (uid) clearUser(uid); S.items = []; S.uid = null;
  if (S.mode !== 'connected' || S.net !== 'live') { ls.del(AUTH_KEY); ls.del(AUTH_KEY + '-code-verifier'); ls.del(AUTH_KEY + '-user'); }   // the Hub cannot be told: end the sign-in on this device
  return signOut0.apply(H, arguments);
};
// a saved sign-in: the portal waits for it instead of drawing the sample classrooms
if (storedUid()) {
  S.mode = 'pending';
  if (H.ready && H.ready.catch) H.ready.catch(() => { const u = storedUid(); if (u) offline(u, 'lib'); });
  setTimeout(async () => { if (S.mode !== 'pending') return; const u = storedUid(); if (u && !(await probe())) offline(u, 'offline'); else if (S.mode === 'pending') { S.mode = u ? 'unlinked' : 'none'; rerender(); } }, CONNECT_MS + 5000);
}

// ---- what the screen says
const count = () => S.mode === 'connected' ? mine().length : S.items.length;
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
function status(){
  const n = count(), held = mine().filter(x => x.conflict || x.failed).length;
  if (S.net === 'offline' || S.mode === 'offline' || S.mode === 'lib') return {cls:'warn', text:`Offline — ${n ? plural(n, 'change') + ' waiting' : 'no changes waiting'}`};
  if (S.net === 'reconnecting') return {cls:'warn', text:`Reconnecting — ${n ? plural(n, 'change') + ' waiting' : 'checking'}`};
  if (held) return {cls:'warn', text:`Live — ${plural(held, 'change')} not saved`};
  if (n) return {cls:'warn', text:`Live — sending ${plural(n, 'change')}`};
  return null;
}
function mark(st){ return ` <span class="ffo-mark" data-ffo-mark="${E(st)}">${E({wait:'Not saved yet', saving:'Saving…', conflict:'Not saved: changed in the Hub', refused:'Not saved'}[st])}</span>`; }
function rowState(t, id){
  const it = mine().find(x => x.t === t && x.id === id);
  if (it) return it.conflict ? 'conflict' : it.failed ? 'refused' : 'wait';
  const k = t + ':' + id; return S.inflight.has(k) ? 'saving' : S.refused.has(k) ? 'refused' : null;
}
function rowStates(t){
  const out = []; const seen = new Set();
  for (const it of mine()) if (it.t === t) { seen.add(it.id); out.push({id:it.id, data:it.data, st:rowState(t, it.id)}); }
  for (const [m, st] of [[S.inflight, 'saving'], [S.refused, 'refused']]) for (const [k, data] of m) { const [tt, id] = [k.slice(0, k.indexOf(':')), k.slice(k.indexOf(':') + 1)]; if (tt === t && !seen.has(id)) { seen.add(id); out.push({id, data, st}); } }
  return out;
}
const badgeRe = /<span class="chip ok"([^>]*)>Live · (saving to your program|view only)<\/span>/;
function decorate(html){
  if (S.mode !== 'connected' || typeof html !== 'string') return html;
  const st = status();
  html = html.replace(badgeRe, (m, a, which) => st ? `<span class="chip warn" data-ffo-badge data-ffo-live="${which}" style="background:transparent;color:#F3C969;border-color:currentColor">${E(st.text)}</span>`
    : `<span class="chip ok" data-ffo-badge data-ffo-live="${which}"${a}>Live · ${which}</span>`);
  const c = ctx() || {}; let wait = 0;
  for (const r of rowStates('kidday')) {
    const d = r.data || {}, kid = d.kid || r.id.replace(/_\d{4}-\d{2}-\d{2}$/, ''), date = d.date || (r.id.match(/_(\d{4}-\d{2}-\d{2})$/) || [])[1];
    if (!kid || (c.date && date !== c.date)) continue;
    const at = html.indexOf(`data-att="${kid}"`);   // Today: after the child's status words
    if (at > 0) { const s = html.lastIndexOf('<span class="mini">', at), e = s > 0 ? html.indexOf('</span>', s) : -1; if (e > 0 && e < at) { html = html.slice(0, e + 7) + mark(r.st) + html.slice(e + 7); wait++; } }
    const sel = html.indexOf(`id="a_${kid}"`);       // Children: after the Here/Absent picker
    if (sel > 0) { const e = html.indexOf('</select>', sel); if (e > 0) { html = html.slice(0, e + 9) + mark(r.st) + html.slice(e + 9); if (at < 0) wait++; } }
  }
  if (wait) html = html.replace(/(<span class="chip">\d+ of \d+ here<\/span>)/, `$1 <span class="ffo-mark">${wait} not saved yet</span>`);
  const other = mine().filter(x => x.t !== 'kidday');
  if (other.length) {
    const kinds = [...new Set(other.map(x => KIND[x.t] || 'Change'))].join(', ');
    const note = `<div class="wrap ffo-inline" role="note"><span class="ffo-mark">Not saved yet</span> ${E(plural(other.length, 'change'))} on this screen (${E(kinds)}) ${S.net === 'live' ? 'will send in a moment.' : 'will send when the Futures Hub is back.'}</div>`;
    const i = html.indexOf('<section'); html = i >= 0 ? html.slice(0, i) + note + html.slice(i) : note + html;
  }
  return html;
}
function screen(name){
  if (S.mode === 'connected' || S.mode === 'none' || (S.mode === 'pending' && H.connected)) return null;
  const fam = name === 'family-portal', title = fam ? 'Family Portal' : 'Teacher Portal', n = S.items.length;
  const top = `<div class="phero" style="padding-block:28px"><div class="wrap" style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:end;gap:14px 28px"><div style="display:grid;gap:8px"><div class="eyebrow">Futures Hub</div><h1 style="font-size:clamp(26px,3.6vw,38px)">${title}</h1></div>`;
  const chip = t => `<span class="chip warn" data-ffo-badge style="background:transparent;color:#F3C969;border-color:currentColor">${E(t)}</span>`;
  const out = '<button type="button" class="btn soft" data-hub="signout">Sign out</button>';
  let body;
  if (S.mode === 'pending') body = `<div class="card ffo-card" role="status"><h3>Connecting to the Futures Hub…</h3><p class="small">Opening your program.</p></div>`;
  else if (S.mode === 'unlinked') body = `<div class="card ffo-card" role="alert"><h3>Your account is not linked to a center yet</h3><p class="small">You are signed in, but the Futures Hub has no classroom for this account. Ask your center to finish your invitation.</p>${n ? `<p class="small"><b>${E(plural(n, 'change'))}</b> from an earlier visit ${n === 1 ? 'is' : 'are'} still waiting on this device.</p>` : ''}<div class="ffo-acts">${out}</div></div>`;
  else body = `<div class="card ffo-card" role="alert"><h3>Can't reach Futures Hub</h3><p>Your changes are kept on this device and will send when you're back online.</p>
    <p class="small"><b>${n ? E(plural(n, 'change')) + ' waiting' : 'No changes waiting'}</b> on this device. You are still signed in. Your ${fam ? 'child’s day' : 'classrooms'} could not be loaded, so nothing new can be recorded here until the Hub is back.${fam ? '' : ' Use the paper sheet for attendance, meals and notes, then enter them in the Hub when it is back.'}</p>
    <div class="ffo-acts"><button type="button" class="btn gold" data-ffo="retry">Try again now</button>${fam ? '' : '<button type="button" class="btn navy" data-ffo="sheet">Paper sheet for today</button>'}${out}</div></div>`;
  return top + `<div style="display:grid;gap:6px;justify-items:end">${chip(S.mode === 'pending' ? 'Connecting…' : S.mode === 'unlinked' ? 'Not linked to a center' : (status() || {text:'Offline'}).text)}</div></div></div><section class="band-paper"><div class="wrap">${body}</div></section>`;
}
// keep the outermost position on the two portal views, whatever is assigned to them later
let depth = 0;
function guardView(name){
  const make = fn => function(){ const s = screen(name); if (s != null) return s; depth++; let html; try { html = typeof fn === 'function' ? fn.apply(this, arguments) : ''; } finally { depth--; } return depth ? html : decorate(html); };
  let cur = make(V[name]);
  Object.defineProperty(V, name, {configurable:true, enumerable:true, get:() => cur, set:f => { cur = make(f); }});
}
if (typeof V === 'object' && V) ['portal', 'family-portal'].forEach(guardView);

// success words from the portal right after an entry went to the waiting list are not true: say what is
if (toast0) window.toast = function(m){
  if (Date.now() - S.lastQueued < 4000 && /\b(saved|recorded|added|loaded)\b/i.test(m) && !/not saved/i.test(m)) m = S.stored ? MSG_WAIT : MSG_NOSTORE;
  else if (S.mode === 'connected' && S.net !== 'live' && /did not save/i.test(m)) m = 'Not saved: this needs a connection to the Futures Hub. Try again when you are back online.';
  return toast0.call(this, m);
};

// ---- banner
function bar(){
  if (typeof document === 'undefined' || !document.getElementById) return null;
  let el = document.getElementById('ffoBar'); if (el) return el;
  const main = document.getElementById('view'); if (!main || !main.parentNode || !document.createElement) return null;
  el = document.createElement('div'); el.id = 'ffoBar'; el.className = 'ffo-bar'; el.hidden = true;
  el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
  main.parentNode.insertBefore(el, main); return el;
}
function itemLabel(it){
  const d = it.data || {}, k = d.kid || d.p_kid || (Array.isArray(d.p_kids) && d.p_kids.length === 1 ? d.p_kids[0] : null), who = k && names.get(k);
  const when = d.date ? (() => { try { const [y, m, dd] = d.date.split('-').map(Number); return new Date(y, m - 1, dd).toLocaleDateString('en-US', {weekday:'short', month:'short', day:'numeric'}); } catch (_) { return d.date; } })() : '';
  return [KIND[it.t] || 'Change', who, when].filter(Boolean).join(' · ') + (it.op === 'del' ? ' (removal)' : '');
}
function paint(){
  const el = bar(), st = status();
  if (typeof document !== 'undefined' && document.querySelectorAll) document.querySelectorAll('#view [data-ffo-badge]').forEach(b => {
    if (!st && S.mode === 'connected' && b.dataset.ffoLive) { b.className = 'chip ok'; b.style.color = '#7FE0A8'; b.textContent = 'Live \u00b7 ' + b.dataset.ffoLive; }
    else if (st) { b.className = 'chip warn'; b.style.color = '#F3C969'; b.textContent = st.text; }
  });
  if (!el) return;
  const show = (S.mode === 'connected' && !!st) || S.mode === 'offline' || S.mode === 'lib';
  el.hidden = !show; el.classList.toggle('ffo-live', !!show && S.net === 'live');
  if (!show) { el.innerHTML = ''; return; }
  const n = count(), list = S.mode === 'connected' ? mine() : S.items, held = list.filter(x => x.conflict || x.failed).length, staff = H.role ? H.role !== 'family' : curView() !== 'family-portal';
  let head;
  if (S.net === 'offline' || S.mode !== 'connected') head = `<b>Can't reach Futures Hub</b> — your changes are kept on this device and will send when you're back online.`;
  else if (S.net === 'reconnecting') head = `<b>Reconnecting to Futures Hub…</b> ${n ? 'Sending ' + E(plural(n, 'waiting change')) + '.' : ''}`;
  else if (held) head = `<b>${E(plural(held, 'change'))} could not be saved.</b> Choose what to keep below.`;
  else head = `<b>Sending ${E(plural(n, 'change'))}…</b>`;
  const items = S.open || held ? `<ul class="ffo-list">${list.map(it => `<li><span>${E(itemLabel(it))}</span> <span class="ffo-st">${it.conflict ? 'Someone changed this in the Hub while it was waiting. Sending yours replaces their version.' : it.failed ? 'The Hub did not accept this change.' : 'Waiting to send'}</span>${it.conflict ? `<span class="ffo-acts"><button type="button" class="btn soft" data-ffo="mine" data-n="${it.n}">Send mine</button><button type="button" class="btn soft" data-ffo="theirs" data-n="${it.n}">Keep the Hub's</button></span>` : it.failed ? `<span class="ffo-acts"><button type="button" class="btn soft" data-ffo="theirs" data-n="${it.n}">Remove</button></span>` : ''}</li>`).join('')}</ul>` : '';
  el.innerHTML = `<div class="wrap ffo-in"><p class="ffo-head">${head} <span class="ffo-n">${E(n ? plural(n, 'change') + ' waiting' : 'No changes waiting')}${S.stored ? '' : ' (this browser could not keep them: leave this page open)'}</span></p>
   <div class="ffo-acts">${S.net === 'live' && S.mode === 'connected' ? '' : '<button type="button" class="btn soft" data-ffo="retry">Try now</button>'}${n && !held ? `<button type="button" class="btn soft" data-ffo="list" aria-expanded="${S.open}">${S.open ? 'Hide' : 'Show'} waiting</button>` : ''}${staff ? '<button type="button" class="btn soft" data-ffo="sheet">Paper sheet</button>' : ''}</div>${items}</div>`;
}

// ---- paper downtime sheet (from the roster in memory; nothing is stored). R5-06 (W4): one page per room: the room on screen,
// any other room, or every room (one printed page each). It can be printed ahead while the Hub is live (Children tab), and it
// needs nothing from the network: it is drawn from what this page already loaded.
let sheetRoom = null;   // null = the room on screen; '*' = every room; else a room id
function sheetHtml(roomSel){
  const c = ctx(), live = !!(c && c.hub && S.mode === 'connected');
  const rooms = live && c.rooms ? Object.entries(c.rooms).filter(([, r]) => r && !r.sample).sort((a, b) => ((a[1].order ?? 9) - (b[1].order ?? 9)) || String(a[1].name).localeCompare(String(b[1].name))) : [];
  const want = roomSel === undefined ? sheetRoom : roomSel;
  const ids = want === '*' && rooms.length ? rooms.map(([id]) => id) : [want && c && c.rooms && c.rooms[want] ? want : (c && c.room) || null];
  const pick = rooms.length > 1 || (rooms.length && want === '*') ? `<label class="ffo-room" for="ffoRoom">Room<select id="ffoRoom" data-ffo-room>${rooms.map(([id, r]) => `<option value="${E(id)}"${ids.length === 1 && ids[0] === id ? ' selected' : ''}>${E(r.name || id)}</option>`).join('')}<option value="*"${want === '*' ? ' selected' : ''}>All rooms (one page each)</option></select></label>` : '';
  return `<div class="ffo-sheet-bar">${pick}<button type="button" class="btn gold" data-ffo="print">Print</button><button type="button" class="btn soft" data-ffo="close">Close</button></div>` + ids.map((id, i) => sheetPage(c, live, id, i)).join('');
}
function sheetPage(c, live, roomId, i){
  const room = live && roomId && c.rooms && c.rooms[roomId] ? c.rooms[roomId].name : '';
  const kids = live ? Object.entries(c.kids || {}).filter(([, k]) => k && k.room === roomId && !k.sample && !k._leftOn).map(([, k]) => `${k.first || k.name || ''} ${k.last ? String(k.last).charAt(0) + '.' : ''}`.trim()).sort((a, b) => a.localeCompare(b)) : [];
  let date = ''; try { const d = live && c.date ? c.date.split('-').map(Number) : null; date = (d ? new Date(d[0], d[1] - 1, d[2]) : new Date()).toLocaleDateString('en-US', {weekday:'long', month:'long', day:'numeric', year:'numeric'}); } catch (_) { date = ''; }
  const rows = kids.concat(Array(kids.length ? 4 : 14).fill(''));
  const cols = ['Child', 'Here / Absent', 'Time in', 'Time out', 'Breakfast', 'Lunch', 'PM snack', 'Rest', 'Note to family', 'Staff initials'];
  return `<div class="ffo-paper"><h2${i ? '' : ' id="ffoSheetT"'}>Downtime sheet: attendance, meals and notes</h2>
  <p class="ffo-meta"><span>Center: <b>${E((H.center && H.center.name) || '')}</b>${H.center && H.center.name ? '' : ' ______________________'}</span><span>Room: <b>${E(room)}</b>${room ? '' : ' ______________________'}</span><span>Date: <b>${E(date)}</b></span></p>
  <p class="ffo-note">Use this sheet while the Futures Hub cannot be reached. ${kids.length ? 'Children listed are the room roster from the last time the Hub loaded on this device; add anyone missing.' : 'The roster could not be loaded on this device: write each child’s name.'} Meals: All, Most, Some, Tried it or None. Do not write health, allergy or medication details here; those stay in the center’s own records. When the Hub is back, enter these entries and keep this sheet with the center’s records.</p>
  <table class="ffo-tab"><thead><tr>${cols.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(n => `<tr><td>${E(n)}</td>${cols.slice(1).map(() => '<td></td>').join('')}</tr>`).join('')}</tbody></table>
  <div class="ffo-box"><b>Class notes for families</b></div>
  <p class="ffo-sign">Staff in the room: ______________________ &nbsp; Entered in the Hub by: ____________ on ____________</p></div>`;
}
let opener = null;
function openSheet(roomSel){
  if (typeof document === 'undefined') return;
  sheetRoom = roomSel === undefined ? null : roomSel;
  closeSheet(); opener = document.activeElement;
  const el = document.createElement('div'); el.id = 'ffoSheet'; el.className = 'ffo-sheet'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'ffoSheetT');
  el.innerHTML = sheetHtml(); document.body.appendChild(el);
  const p = el.querySelector('[data-ffo="print"]'); if (p) p.focus();
}
function closeSheet(){ const el = document.getElementById('ffoSheet'); if (el) el.remove(); if (opener && opener.focus) { try { opener.focus(); } catch (_) { /* gone */ } } opener = null; }
function printSheet(){
  document.body.classList.add('ffo-printing');
  const done = () => { document.body.classList.remove('ffo-printing'); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  try { window.print(); } catch (_) { done(); }
}

// ---- events
if (typeof document !== 'undefined' && document.addEventListener) {
  document.addEventListener('click', e => {
    const so = e.target.closest && e.target.closest('[data-hub="signout"]');   // before hub-backend.js: warn once when entries would be lost
    if (so && count() && !so.dataset.ffoArmed) { e.preventDefault(); e.stopImmediatePropagation(); so.dataset.ffoArmed = '1'; so.textContent = `Sign out and delete ${plural(count(), 'unsent change')}`; return; }
    const t = e.target.closest && e.target.closest('[data-ffo]'); if (!t) return;
    const a = t.dataset.ffo;
    if (a === 'retry') { S.retry = 0; return tryNow(true); }
    if (a === 'list') { S.open = !S.open; return paint(); }
    if (a === 'sheet') return openSheet();
    if (a === 'close') return closeSheet();
    if (a === 'print') return printSheet();
    if (a === 'mine' || a === 'theirs') return resolve(+t.dataset.n, a === 'mine');
  }, true);
  document.addEventListener('change', e => {   // the sheet's room choice: redraw the pages, keep focus on the choice
    const sel = e.target && e.target.closest && e.target.closest('[data-ffo-room]'); const el = document.getElementById('ffoSheet'); if (!sel || !el) return;
    sheetRoom = sel.value; el.innerHTML = sheetHtml(); const n = document.getElementById('ffoRoom'); if (n) n.focus();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.getElementById('ffoSheet')) closeSheet(); });
}
if (typeof window.addEventListener === 'function') {
  window.addEventListener('offline', () => { if (S.mode !== 'none') { S.net = 'offline'; paint(); } });
  window.addEventListener('online', () => { if (S.mode !== 'none') { S.retry = 0; tryNow(true); } });
}

window.FFOffline = {
  pending:(t, id) => !!rowState(t, String(id)),
  state:() => ({mode:S.mode, net:S.net, waiting:count(), held:mine().filter(x => x.conflict || x.failed).length, stored:S.stored}),
  items:() => plain(S.items.map(x => ({n:x.n, t:x.t, id:x.id, op:x.op, conflict:!!x.conflict, failed:!!x.failed,
    kid:x.op === 'rpc' && x.data ? (x.data.p_kid || null) : undefined, kids:x.op === 'rpc' && x.data ? x.data.p_kids : undefined}))),
  retry:() => tryNow(true), resolve, sheet:sheetHtml, openSheet,
  call, onSent:f => { rpcWatchers.add(f); return () => rpcWatchers.delete(f); }
};
paint();
})();
