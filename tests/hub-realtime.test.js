// W3E (roadmap W2-B / depth audit R1, R6, R9): hub-backend.js's data layer against a fake Supabase client, no network.
//   - a realtime change is applied to the ONE row it is about (insert / update / delete), no table is downloaded again
//   - one realtime channel per page, every binding filtered to this center; families are not subscribed to staff-only tables and
//     their reads name their own children
//   - a burst of changes gives one snapshot; a duplicate or a change outside the listener's filter gives none
//   - safety net: (re)connecting runs a delta resync (ids + updated_at, then only the rows that differ); while realtime is down
//     the resync repeats with backoff (15 s, 30 s, 60 s, 120 s)
//   - photos: a thumbnail is stored beside each new photo and lists load the thumbnail
//   - a refused save shows a message that stays (not a toast) until dismissed or the record saves; a save hub-offline.js queued
//     does not get a second message
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const SRC = read('hub-backend.js');
const URL_ = 'http://127.0.0.1:54321';
const C = 'c-0000';

// ---- a fake Hub: tables of rows {center_id, id, kid, room, date, data, updated_at}
function fakeHub({ role = 'teacher', guardianOf = ['k1'] } = {}) {
  const T = {}; let clock = 1000;
  const stamp = () => `2026-10-05T12:00:${String(Math.floor(clock / 1000) % 60).padStart(2, '0')}.${String(clock++ % 1000).padStart(3, '0')}123+00:00`;
  const put = (t, row) => { const r = Object.assign({ center_id: C, kid: row.data.kid ?? null, room: row.data.room ?? null, date: row.data.date ?? null, updated_at: stamp() }, row);
    (T[t] ||= new Map()).set(r.id, r); return r; };
  const queries = [], channels = [], uploads = [], removed = [], writes = [];
  let refuse = null, down = false;
  function builder(t) {
    const q = { t, cols: '*', eq: {}, in: {}, range: null, op: 'select' };
    const b = {
      select(c) { if (q.op === 'select') q.cols = c; else q.ret = c; return b; },
      eq(c, v) { q.eq[c] = v; return b; }, in(c, v) { q.in[c] = v; return b; }, order() { return b; },
      range(a, z) { q.range = [a, z]; return b; },
      upsert(row) { q.op = 'upsert'; q.row = row; return b; }, update(v) { q.op = 'update'; q.row = v; return b; },
      insert(row) { q.op = 'insert'; q.row = row; return b; }, delete() { q.op = 'delete'; return b; },
      then(f, r) { return Promise.resolve(run(q)).then(f, r); },
    };
    return b;
  }
  function run(q) {
    if (down) return { data: null, error: { message: 'TypeError: Failed to fetch' } };
    if (q.op !== 'select') {
      writes.push([q.op, q.t, q.row && (q.row.id || q.eq.id)]);
      if (refuse) return { data: null, error: refuse };
      if (q.op === 'delete') { T[q.t]?.delete(q.eq.id); return { data: null, error: null }; }
      if (q.op === 'update') { const r = T[q.t]?.get(q.eq.id); if (!r) return { data: [], error: null }; put(q.t, Object.assign({}, r, { data: q.row.data })); return { data: [{ id: r.id }], error: null }; }
      put(q.t, { id: q.row.id, data: q.row.data }); return { data: null, error: null };
    }
    queries.push(q);
    if (q.t === 'memberships') return { data: [{ center_id: C, role }], error: null };
    if (q.t === 'centers') return { data: [{ id: C, name: 'TEST Center' }], error: null };
    if (q.t === 'guardianships') return { data: guardianOf.map(k => ({ kid: k })), error: null };
    let rows = [...(T[q.t] || new Map()).values()].filter(r => r.center_id === q.eq.center_id);
    for (const [c, v] of Object.entries(q.eq)) if (c !== 'center_id') rows = rows.filter(r => String(r[c]) === String(v));
    for (const [c, v] of Object.entries(q.in)) rows = rows.filter(r => v.includes(r[c]));
    rows.sort((a, b) => (a.id < b.id ? -1 : 1));
    if (q.range) rows = rows.slice(q.range[0], q.range[1] + 1);
    const cols = q.cols.split(',');
    return { data: rows.map(r => Object.fromEntries(cols.map(c => [c, r[c]]))), error: null };
  }
  const client = {
    auth: { getSession: async () => ({ data: { session: { user: { id: 'u1', email: 'x@example.test' } } } }), onAuthStateChange() {} },
    from: builder,
    rpc: async () => ({ data: [{ center_id: C, access: 'classroom', missing: [] }], error: null }),
    channel(name) { const ch = { name, binds: [], status: null, removed: false,
      on(type, f, cb) { ch.binds.push({ type, f, cb }); return ch; }, subscribe(cb) { ch.status = cb; return ch; } }; channels.push(ch); return ch; },
    removeChannel(ch) { ch.removed = true; },
    storage: { from: () => ({
      createSignedUrls: async (paths) => ({ data: paths.map(p => ({ path: p, signedUrl: `${URL_}/storage/v1/object/sign/child-photos/${p}?token=t` })), error: null }),
      createSignedUrl: async (p) => ({ data: { signedUrl: `${URL_}/storage/v1/object/sign/child-photos/${p}?token=full` }, error: null }),
      upload: async (p, blob, o) => { uploads.push([p, o.contentType]); return { error: refuse && refuse.storage ? refuse : null }; },
      remove: async (ps) => { removed.push(...ps); return { error: null }; },
    }) },
  };
  // what realtime would send for a row now in the table / just deleted
  const event = (t, type, id) => {
    const r = T[t]?.get(id);
    const p = type === 'DELETE' ? { eventType: 'DELETE', new: {}, old: { center_id: C, id } }
      : { eventType: type, new: Object.assign({}, r, { updated_at: r.updated_at.replace('T', ' ').replace('+00:00', '+00') }), old: {} };
    for (const ch of channels.filter(c => !c.removed)) for (const b of ch.binds) if (b.f.table === t) b.cb(p);
  };
  return { T, put, client, queries, channels, uploads, removed, writes, event, refuse: e => { refuse = e; }, down: v => { down = v; } };
}

// ---- a page: hub-backend.js in a VM with fake timers and a tiny DOM
function page(hub, { offlineItems = [] } = {}) {
  const timers = new Map(); let tid = 0;
  const els = {};
  const view = { id: 'view', parentNode: { insertBefore(el) { els[el.id] = el; el.parentNode = this; } } };
  const mk = tag => ({ tag, id: '', className: '', innerHTML: '', attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, remove() { delete els[this.id]; },
    getContext: () => ({ drawImage() {} }), toBlob(cb, type) { cb({ size: 1234, type }); } });
  const listeners = {};
  const window = { FF_HUB: { url: URL_, anonKey: 'sb_publishable_test' }, supabase: { createClient: () => hub.client }, addEventListener() {},
    FFPortal: { rerender() {}, connectHub: async () => null }, FFOffline: { items: () => offlineItems } };
  const context = vm.createContext({
    window, console, Promise, Headers, Response, URLSearchParams, URL, atob, Date, Math, JSON, Map, Set, Object, Array, String, Number, RegExp, Error,
    setTimeout: (fn, ms) => { timers.set(++tid, { fn, ms: ms || 0 }); return tid; }, clearTimeout: id => timers.delete(id),
    fetch: async (u) => ({ blob: async () => ({ size: 9999, type: 'image/jpeg' }) }),
    createImageBitmap: async () => ({ width: 800, height: 600, close() {} }),
    crypto: { randomUUID: () => 'uuid-' + (++tid) },
    navigator: { onLine: true },
    localStorage: { getItem: () => null, setItem() {} },
    location: { search: '', hash: '#portal', origin: 'http://127.0.0.1:9', pathname: '/index.html', href: 'http://127.0.0.1:9/index.html#portal', reload() {} },
    history: { replaceState() {} },
    document: { addEventListener: (ev, f) => { (listeners[ev] ||= []).push(f); }, getElementById: id => (id === 'view' ? view : els[id] || null),
      createElement: mk, head: { appendChild() {}, insertAdjacentHTML() {} }, querySelectorAll: () => [] },
    view: 'portal', render() {}, go() {},
  });
  vm.runInContext(`var V = { 'signin-family': () => '', 'signin-teacher': () => '', portal: () => '', 'family-portal': () => '' };`, context);
  vm.runInContext(SRC, context, { filename: 'hub-backend.js' });
  const H = context.window.FFHub;
  // run every due zero-delay timer and settle promises; `advance(ms)` also runs timers set for up to ms
  async function settle(ms = 0) {
    for (let i = 0; i < 50; i++) {
      await new Promise(r => setImmediate(r));
      const due = [...timers].filter(([, t]) => t.ms <= ms);
      if (!due.length) { await new Promise(r => setImmediate(r)); if (![...timers].some(([, t]) => t.ms <= ms)) return; continue; }
      for (const [id, t] of due) { timers.delete(id); t.fn(); }
    }
  }
  const pending = () => [...timers.values()].map(t => t.ms).sort((a, b) => a - b);
  const click = async target => { for (const f of listeners.click || []) f({ target, preventDefault() {} }); await settle(); };
  return { H, settle, pending, els, click, timers };
}
async function connect(hub, opts) {
  const p = page(hub, opts);
  const c = await p.H.connect();
  assert.ok(c && c.db, 'connected');
  return Object.assign(p, { db: c.db });
}
const plain = x => JSON.parse(JSON.stringify(x));   // values made inside the page's VM
const snapIds = s => plain(s.docs.map(d => d.id));
const tableQueries = (hub, t) => hub.queries.filter(q => q.t === t);

test('first load reads the table once; each realtime change is applied to its one row with no new download', async () => {
  const hub = fakeHub();
  hub.put('msgs', { id: 'm1', data: { kid: 'k1', text: 'hello' } });
  hub.put('msgs', { id: 'm2', data: { kid: 'k2', text: 'hi' } });
  const p = await connect(hub);
  const snaps = [];
  p.db.collection('msgs').onSnapshot(s => snaps.push(s));
  await p.settle();
  assert.deepEqual(snapIds(snaps.at(-1)), ['m1', 'm2']);
  assert.equal(tableQueries(hub, 'msgs').length, 1, 'one load');
  assert.equal(tableQueries(hub, 'msgs')[0].cols, 'id,data,updated_at');
  const ch = hub.channels.at(-1); ch.status('SUBSCRIBED'); await p.settle();   // first connect: one cheap delta check
  const after = tableQueries(hub, 'msgs').length;
  assert.equal(tableQueries(hub, 'msgs').at(-1).cols, 'id,updated_at', 'the check after connecting asks for ids and timestamps only');

  hub.put('msgs', { id: 'm3', data: { kid: 'k1', text: 'new' } }); hub.event('msgs', 'INSERT', 'm3'); await p.settle();
  assert.deepEqual(snapIds(snaps.at(-1)), ['m1', 'm2', 'm3']);
  hub.put('msgs', { id: 'm1', data: { kid: 'k1', text: 'edited' } }); hub.event('msgs', 'UPDATE', 'm1'); await p.settle();
  assert.equal(snaps.at(-1).docs.find(d => d.id === 'm1').data().text, 'edited');
  hub.T.msgs.delete('m2'); hub.event('msgs', 'DELETE', 'm2'); await p.settle();
  assert.deepEqual(snapIds(snaps.at(-1)), ['m1', 'm3']);
  assert.equal(tableQueries(hub, 'msgs').length, after, 'no table was downloaded again for three changes');

  const n = snaps.length;
  hub.event('msgs', 'UPDATE', 'm1'); await p.settle();          // the same version again (e.g. after this page's own write)
  assert.equal(snaps.length, n, 'a duplicate change gives no new snapshot');
});

test('a burst of 50 changes in one moment gives one snapshot', async () => {
  const hub = fakeHub();
  const p = await connect(hub);
  const snaps = [];
  p.db.collection('kidday').onSnapshot(s => snaps.push(s)); await p.settle();
  hub.channels.at(-1).status('SUBSCRIBED'); await p.settle();
  const n = snaps.length;
  for (let i = 0; i < 50; i++) { hub.put('kidday', { id: `k${i}_2026-10-05`, data: { kid: `k${i}`, date: '2026-10-05', present: true } }); hub.event('kidday', 'INSERT', `k${i}_2026-10-05`); }
  await p.settle();
  assert.equal(snaps.length, n + 1);
  assert.equal(snaps.at(-1).size, 50);
});

test('a filtered listener keeps only its rows: other days are ignored, a row that moves out leaves', async () => {
  const hub = fakeHub();
  hub.put('kidday', { id: 'k1_2026-10-05', data: { kid: 'k1', date: '2026-10-05', present: true } });
  const p = await connect(hub);
  const snaps = [];
  p.db.collection('kidday').where('date', '==', '2026-10-05').onSnapshot(s => snaps.push(s)); await p.settle();
  hub.channels.at(-1).status('SUBSCRIBED'); await p.settle();
  assert.equal(tableQueries(hub, 'kidday')[0].eq.date, '2026-10-05', 'the load is filtered in the database');
  const n = snaps.length;
  hub.put('kidday', { id: 'k2_2026-10-04', data: { kid: 'k2', date: '2026-10-04', present: true } }); hub.event('kidday', 'INSERT', 'k2_2026-10-04'); await p.settle();
  assert.equal(snaps.length, n, 'another day: no snapshot');
  hub.put('kidday', { id: 'k1_2026-10-05', data: { kid: 'k1', date: '2026-10-06', present: true } }); hub.event('kidday', 'UPDATE', 'k1_2026-10-05'); await p.settle();
  assert.deepEqual(snapIds(snaps.at(-1)), [], 'moved to another day: gone from this list');
});

test('one channel per page, every binding filtered to this center; a table that joins later rebuilds it and catches up', async () => {
  const hub = fakeHub();
  const p = await connect(hub);
  for (const t of ['rooms', 'kids', 'progress', 'obs', 'photos', 'msgs']) p.db.collection(t).onSnapshot(() => {});
  await p.settle();
  assert.equal(hub.channels.length, 1, 'one channel, not one per table');
  const ch = hub.channels[0];
  assert.deepEqual(ch.binds.map(b => b.f.table).sort(), ['kids', 'msgs', 'obs', 'photos', 'progress', 'rooms']);
  assert.ok(ch.binds.every(b => b.type === 'postgres_changes' && b.f.filter === `center_id=eq.${C}` && b.f.event === '*'));
  ch.status('SUBSCRIBED'); await p.settle();
  const before = hub.queries.length;
  p.db.collection('kidday').where('date', '==', '2026-10-05').onSnapshot(() => {}); await p.settle();
  assert.equal(hub.channels.length, 2); assert.ok(ch.removed, 'the old channel is closed');
  ch.status('CLOSED'); await p.settle();
  assert.ok(!p.pending().some(ms => ms === 15000), 'the replaced channel closing does not start polling');
  hub.channels[1].status('SUBSCRIBED'); await p.settle();
  assert.ok(hub.queries.slice(before).filter(q => q.cols === 'id,updated_at').length >= 6, 'after the rebuild every list checks what it missed');
});

test('family: no feed for staff-only tables, and reads name its own children', async () => {
  const hub = fakeHub({ role: 'family', guardianOf: ['k1', 'k3'] });
  hub.put('msgs', { id: 'm1', data: { kid: 'k1', text: 'yours' } });
  const p = await connect(hub);
  for (const t of ['rooms', 'kids', 'obs', 'photos', 'msgs', 'kidday', 'days', 'progress']) p.db.collection(t).onSnapshot(() => {});
  await p.settle();
  const tables = hub.channels[0].binds.map(b => b.f.table).sort();
  assert.deepEqual(tables, ['kids', 'msgs', 'obs', 'photos', 'rooms'], 'no kidday / days / progress feed for a family');
  for (const t of ['obs', 'photos', 'msgs', 'progress']) assert.deepEqual(plain(tableQueries(hub, t)[0].in.kid), ['k1', 'k3'], `${t}: the family's own children`);
  assert.equal(tableQueries(hub, 'kids')[0].in.kid, undefined);
});

test('realtime down: delta resync with backoff (15 s, 30 s, 60 s, 120 s); only changed rows are fetched again', async () => {
  const hub = fakeHub();
  for (let i = 0; i < 5; i++) hub.put('msgs', { id: `m${i}`, data: { kid: 'k1', text: 't' + i } });
  const p = await connect(hub);
  const snaps = [];
  p.db.collection('msgs').onSnapshot(s => snaps.push(s)); await p.settle();
  const ch = hub.channels[0];
  ch.status('SUBSCRIBED'); await p.settle();
  ch.status('CHANNEL_ERROR'); await p.settle();
  assert.ok(p.pending().includes(15000), 'first retry in 15 s');
  hub.put('msgs', { id: 'm2', data: { kid: 'k1', text: 'changed while down' } });
  hub.put('msgs', { id: 'm9', data: { kid: 'k1', text: 'added while down' } });
  hub.T.msgs.delete('m4');
  const q0 = tableQueries(hub, 'msgs').length;
  await p.settle(15000);
  const qs = tableQueries(hub, 'msgs').slice(q0);
  assert.equal(qs[0].cols, 'id,updated_at');
  assert.deepEqual(plain(qs[1].in.id).sort(), ['m2', 'm9'], 'only the two rows that differ are fetched');
  assert.deepEqual(snapIds(snaps.at(-1)), ['m0', 'm1', 'm2', 'm3', 'm9']);
  assert.equal(snaps.at(-1).docs.find(d => d.id === 'm2').data().text, 'changed while down');
  assert.ok(p.pending().includes(30000), 'then 30 s');
  await p.settle(30000); assert.ok(p.pending().includes(60000), 'then 60 s');
  await p.settle(60000); assert.ok(p.pending().includes(120000), 'then 120 s');
  await p.settle(120000); assert.ok(p.pending().includes(120000), 'and stays at 120 s');
  ch.status('SUBSCRIBED'); await p.settle();
  assert.ok(!p.pending().some(ms => ms === 120000), 'back to realtime: polling stops');
  assert.ok(p.pending().some(ms => ms >= 480000 && ms <= 720000), 'the 10-minute (+/- 20 %) safety net stays scheduled');
});

test('a trimmed realtime payload (no data) makes the list fetch what changed', async () => {
  const hub = fakeHub();
  hub.put('obs', { id: 'o1', data: { kid: 'k1', text: 'a' } });
  const p = await connect(hub);
  const snaps = [];
  p.db.collection('obs').onSnapshot(s => snaps.push(s)); await p.settle();
  hub.channels[0].status('SUBSCRIBED'); await p.settle();
  hub.put('obs', { id: 'o1', data: { kid: 'k1', text: 'b' } });
  for (const b of hub.channels[0].binds) if (b.f.table === 'obs') b.cb({ eventType: 'UPDATE', new: { center_id: C, id: 'o1' }, old: {} });
  await p.settle();
  assert.equal(snaps.at(-1).docs[0].data().text, 'b');
});

test('photos: a thumbnail is stored beside each new photo, in the same center/child folder; lists show it; the full photo stays', async () => {
  const hub = fakeHub();
  const p = await connect(hub);
  const snaps = [];
  p.db.collection('photos').onSnapshot(s => snaps.push(s)); await p.settle();
  hub.channels[0].status('SUBSCRIBED'); await p.settle();
  await p.db.collection('photos').doc('ph1').set({ kid: 'k1', room: 'r1', date: '2026-10-05', src: 'data:image/jpeg;base64,AAAA', caption: 'TEST', kind: 'moment' });
  assert.equal(hub.uploads.length, 2);
  const [[full, ft], [th, tt]] = hub.uploads;
  assert.match(full, new RegExp(`^${C}/k1/uuid-\\d+\\.jpg$`)); assert.equal(ft, 'image/jpeg');
  assert.equal(th, full + '.thumb.jpg'); assert.equal(tt, 'image/jpeg');
  const row = hub.T.photos.get('ph1').data;
  assert.equal(row.path, full); assert.equal(row.thumb, th); assert.equal(row.src, undefined, 'the data URL is never stored');
  hub.event('photos', 'INSERT', 'ph1'); await p.settle();
  assert.match(snaps.at(-1).docs[0].data().src, /\.thumb\.jpg\?token=t$/, 'the list loads the thumbnail');
});

test('photos: a refused row removes both uploaded objects and says why, and the message stays', async () => {
  const hub = fakeHub();
  const p = await connect(hub);
  hub.refuse({ code: '42501', message: 'photo rejected: child has no photo consent on file' });
  await assert.rejects(p.db.collection('photos').doc('ph2').set({ kid: 'k2', src: 'data:image/jpeg;base64,AAAA', kind: 'moment' }), e => e.code === 'photo_consent');
  assert.deepEqual(hub.removed.sort(), hub.uploads.map(u => u[0]).sort(), 'photo and thumbnail removed again');
  await p.settle();
  const el = p.els.hubSaveErr;
  assert.ok(el, 'a message is shown');
  assert.equal(el.attrs.role, 'alert');
  assert.match(el.innerHTML, /Not saved: Photo/); assert.match(el.innerHTML, /photo consent on file/);
  await p.settle(600000);                                         // minutes later: still there (not a 2-second toast)
  assert.ok(p.els.hubSaveErr, 'still shown');
});

test('save errors: refused -> persistent message; same record saves later -> gone; dismiss works; queued by hub-offline -> none', async () => {
  const hub = fakeHub();
  const queued = [];
  const p = await connect(hub, { offlineItems: queued });
  hub.refuse({ code: '42501', message: 'new row violates row-level security policy for table "kidday"' });
  await assert.rejects(p.db.collection('kidday').doc('k1_2026-10-05').set({ kid: 'k1', date: '2026-10-05', present: true }));
  await p.settle();
  assert.match(p.els.hubSaveErr.innerHTML, /Not saved: Attendance and care log/);
  assert.match(p.els.hubSaveErr.innerHTML, /You do not have permission to make that change/);
  assert.doesNotMatch(p.els.hubSaveErr.innerHTML, /row-level security/, 'no database jargon');
  hub.refuse(null);
  await p.db.collection('kidday').doc('k1_2026-10-05').set({ kid: 'k1', date: '2026-10-05', present: true });
  await p.settle();
  assert.equal(p.els.hubSaveErr, undefined, 'the record saved: the message goes');

  hub.refuse({ code: 'PGRST000', message: 'boom' });
  await assert.rejects(p.db.collection('days').doc('r1_2026-10-05').set({ room: 'r1', date: '2026-10-05', notes: 'x' }));
  await p.settle();
  assert.match(p.els.hubSaveErr.innerHTML, /did not accept this change \(code PGRST000\)/);
  await p.click({ closest: sel => (sel === '[data-hubse]' ? { dataset: { hubse: 'days:r1_2026-10-05' } } : null) });
  assert.equal(p.els.hubSaveErr, undefined, 'dismissed');

  hub.refuse(null); hub.down(true);
  queued.push({ t: 'msgs', id: 'm9' });                           // hub-offline.js put it in the waiting list
  await assert.rejects(p.db.collection('msgs').doc('m9').set({ kid: 'k1', text: 'x' }));
  await p.settle();
  assert.equal(p.els.hubSaveErr, undefined, 'the waiting list shows it: no second message');
  await assert.rejects(p.db.collection('photos').doc('ph9').set({ kid: 'k1', caption: 'x', kind: 'moment' }));
  await p.settle();
  assert.match(p.els.hubSaveErr.innerHTML, /no connection to the Futures Hub, so the photo was not saved/i, 'photos are never queued: told plainly');
});

test('updated_at from the API and from realtime compare equal (one row, two spellings)', async () => {
  const hub = fakeHub();
  const r = hub.put('msgs', { id: 'm1', data: { kid: 'k1', text: 'a' } });
  const p = await connect(hub);
  const snaps = [];
  p.db.collection('msgs').onSnapshot(s => snaps.push(s)); await p.settle();
  hub.channels[0].status('SUBSCRIBED'); await p.settle();
  const n = snaps.length;
  assert.match(r.updated_at, /T.*\+00:00$/);
  hub.event('msgs', 'UPDATE', 'm1'); await p.settle();          // the event spells it '2026-10-05 12:00:01.000123+00'
  assert.equal(snaps.length, n, 'recognised as the version already shown');
});

test('index.html: hub-backend.js still loads before hub-auth.js, hub-offline.js and portal.js, with a cache-bust version', () => {
  const html = read('index.html');
  const at = s => html.indexOf(s);
  assert.ok(at('hub-backend.js?v=') > 0 && at('hub-backend.js?v=') < at('hub-auth.js?v=') && at('hub-auth.js?v=') < at('hub-offline.js?v=') && at('hub-offline.js?v=') < at('portal.js?v='));
  const v = Number((/hub-backend\.js\?v=(\d+)/.exec(html) || [])[1]);
  assert.ok(v >= 7, `hub-backend.js?v= moved on for the W3E data layer (${v})`);
});
