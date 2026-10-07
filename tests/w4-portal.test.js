// Wave 4 PORTAL lane: the website side, against fakes (no network). The live run is tests/browser/w4-portal.browser.mjs; the
// database side is the hub repo's hub/tests/w4-portal.test.mjs (private delete topics, family raw-day reads, kid_left_on_set).
//   W3E-N3  hub-backend.js: where('date','>=',d) loads recent weeks only (in the database), realtime changes outside the window are
//           ignored, inside it applied row by row; portal.js windows messages, photos, observations and day records and offers
//           "Load earlier"; a message is saved with the day it was sent
//   W3E-N2  hub-backend.js: deletes arrive on private topics (staff: ffdel:<center>:staff; family: one per own child); a teacher
//           without classroom access joins none; a delete notice removes just that row; nothing else listens for deletes
//   W3C-N6  care-history.js: the Edit history tab is the director's only (teachers and families get no tab); each change reads
//           who, when, record, field from -> to; a refusal (42501) says so; filters go to the RPC
//   W3C-N7  care-history.js + hub-backend.js: the director records the day a child left after a confirmation that says what it
//           starts; the call goes through hub-offline.js's waiting list with a stable id; kids.left_on is shown, never written back
//   R5-06   hub-offline.js: the paper sheet can be drawn for the room on screen, another room or every room (one page each), from
//           memory only, and can be opened while live (Children tab)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const BACKEND = read('hub-backend.js'), HISTORY = read('care-history.js'), OFFLINE = read('hub-offline.js'), PORTAL = read('portal.js'), INDEX = read('index.html');
const URL_ = 'http://127.0.0.1:54321', C = 'c-0000';
const plain = x => JSON.parse(JSON.stringify(x));
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ');

// ---- a fake Supabase client: tables of rows, eq / gte / in filters, channels, rpc calls recorded
function fakeHub({ role = 'teacher', access = 'classroom', guardianOf = ['k1'], realtime = true } = {}) {
  const T = {}; let clock = 1000;
  const stamp = () => `2026-10-05T12:00:${String(Math.floor(clock / 1000) % 60).padStart(2, '0')}.${String(clock++ % 1000).padStart(3, '0')}123+00:00`;
  const put = (t, row) => { const r = Object.assign({ center_id: C, kid: row.data.kid ?? null, room: row.data.room ?? null, date: row.data.date ?? null, updated_at: stamp() }, row);
    (T[t] ||= new Map()).set(r.id, r); return r; };
  const queries = [], channels = [], rpcs = [];
  function builder(t) {
    const q = { t, cols: '*', eq: {}, gte: {}, in: {}, op: 'select' };
    const b = { select(c) { if (q.op === 'select') q.cols = c; return b; }, eq(c, v) { q.eq[c] = v; return b; }, gte(c, v) { q.gte[c] = v; return b; },
      in(c, v) { q.in[c] = v; return b; }, order() { return b; }, range() { return b; },
      upsert(row) { q.op = 'upsert'; q.row = row; return b; }, delete() { q.op = 'delete'; return b; },
      then(f, r) { return Promise.resolve(run(q)).then(f, r); } };
    return b;
  }
  function run(q) {
    if (q.op === 'upsert') { put(q.t, { id: q.row.id, data: q.row.data }); return { data: null, error: null }; }
    if (q.op === 'delete') { T[q.t]?.delete(q.eq.id); return { data: null, error: null }; }
    queries.push(q);
    if (q.t === 'memberships') return { data: [{ center_id: C, role }], error: null };
    if (q.t === 'centers') return { data: [{ id: C, name: 'TEST Center' }], error: null };
    if (q.t === 'guardianships') return { data: guardianOf.map(k => ({ kid: k })), error: null };
    let rows = [...(T[q.t] || new Map()).values()].filter(r => r.center_id === q.eq.center_id);
    for (const [c, v] of Object.entries(q.eq)) if (c !== 'center_id') rows = rows.filter(r => String(r[c]) === String(v));
    for (const [c, v] of Object.entries(q.gte)) rows = rows.filter(r => r[c] != null && String(r[c]) >= String(v));
    for (const [c, v] of Object.entries(q.in)) rows = rows.filter(r => v.includes(r[c]));
    rows.sort((a, b) => (a.id < b.id ? -1 : 1));
    const cols = q.cols.split(',');
    return { data: rows.map(r => Object.fromEntries(cols.map(c => [c, r[c]]))), error: null };
  }
  const client = {
    auth: { getSession: async () => ({ data: { session: { user: { id: 'u1', email: 'x@example.test' } } } }), onAuthStateChange() {} },
    from: builder,
    rpc: async (name, args) => { rpcs.push([name, args]); if (name === 'my_staff_access') return { data: [{ center_id: C, access, missing: [] }], error: null };
      if (name === 'care_history_list') return { data: [{ id: 1 }], error: null }; return { data: [{ kid: args.p_kid, left_on: args.p_left_on }], error: null }; },
    channel(name, opts) { const ch = { name, opts, binds: [], status: null, removed: false,
      on(type, f, cb) { ch.binds.push({ type, f, cb }); return ch; }, subscribe(cb) { ch.status = cb; return ch; } }; channels.push(ch); return ch; },
    removeChannel(ch) { ch.removed = true; },
    storage: { from: () => ({ createSignedUrls: async (p) => ({ data: p.map(x => ({ path: x, signedUrl: 'u' })), error: null }) }) },
  };
  if (realtime) client.realtime = { setAuth: async () => {} };
  const event = (t, type, id) => { const r = T[t]?.get(id);
    const p = { eventType: type, new: Object.assign({}, r), old: {} };
    for (const ch of channels.filter(c => !c.removed)) for (const b of ch.binds) if (b.type === 'postgres_changes' && b.f.table === t) b.cb(p); };
  const notice = (topic, payload) => { for (const ch of channels.filter(c => !c.removed && c.name === topic)) for (const b of ch.binds) if (b.type === 'broadcast') b.cb({ payload }); };
  return { T, put, client, queries, channels, rpcs, event, notice };
}
function backend(hub, { offline = null } = {}) {
  const timers = new Map(); let tid = 0;
  const window = { FF_HUB: { url: URL_, anonKey: 'sb_publishable_test' }, supabase: { createClient: () => hub.client }, addEventListener() {},
    FFPortal: { rerender() {}, connectHub: async () => null }, FFOffline: offline || { items: () => [] } };
  const context = vm.createContext({ window, console, Promise, Headers, Response, URLSearchParams, URL, atob, Date, Math, JSON, Map, Set, Object, Array, String, Number, RegExp, Error,
    setTimeout: (fn, ms) => { timers.set(++tid, { fn, ms: ms || 0 }); return tid; }, clearTimeout: id => timers.delete(id),
    navigator: { onLine: true }, localStorage: { getItem: () => null, setItem() {} },
    location: { search: '', hash: '#portal', origin: 'http://127.0.0.1:9', pathname: '/index.html', href: 'http://127.0.0.1:9/index.html#portal', reload() {} },
    history: { replaceState() {} }, document: { addEventListener() {}, getElementById: () => null, createElement: () => ({ setAttribute() {} }), head: { appendChild() {}, insertAdjacentHTML() {} }, querySelectorAll: () => [] },
    view: 'portal', render() {}, go() {} });
  vm.runInContext(`var V = { 'signin-family': () => '', 'signin-teacher': () => '', portal: () => '', 'family-portal': () => '' };`, context);
  vm.runInContext(BACKEND, context, { filename: 'hub-backend.js' });
  async function settle() { for (let i = 0; i < 30; i++) { await new Promise(r => setImmediate(r)); const due = [...timers].filter(([, t]) => t.ms === 0); if (!due.length) return; for (const [id, t] of due) { timers.delete(id); t.fn(); } } }
  return { H: context.window.FFHub, settle };
}
async function connected(hub, opts) { const p = backend(hub, opts); const c = await p.H.connect(); assert.ok(c && c.db); return Object.assign(p, { db: c.db }); }
const ids = s => plain(s.docs.map(d => d.id));

// ---------------------------------------------------------------------------------------------------------------------------
test('W3E-N3: where(date >= d) loads only recent rows, in the database; realtime outside the window is ignored, inside is applied', async () => {
  const hub = fakeHub();
  hub.put('msgs', { id: 'old', data: { kid: 'k1', date: '2026-06-01', text: 'old' } });
  hub.put('msgs', { id: 'new', data: { kid: 'k1', date: '2026-09-30', text: 'recent' } });
  const p = await connected(hub); const snaps = [];
  p.db.collection('msgs').where('date', '>=', '2026-08-10').onSnapshot(s => snaps.push(s)); await p.settle();
  assert.deepEqual(ids(snaps.at(-1)), ['new']);
  const q0 = hub.queries.filter(q => q.t === 'msgs')[0];
  assert.deepEqual(plain(q0.gte), { date: '2026-08-10' }, 'the window is a database filter (date=gte.)');
  hub.channels.find(c => c.name.startsWith('hub:')).status('SUBSCRIBED'); await p.settle();
  const n = hub.queries.length, k = snaps.length;
  hub.put('msgs', { id: 'older', data: { kid: 'k1', date: '2026-05-01', text: 'x' } }); hub.event('msgs', 'INSERT', 'older'); await p.settle();
  assert.equal(snaps.length, k, 'a row dated before the window is not added');
  hub.put('msgs', { id: 'today', data: { kid: 'k1', date: '2026-10-05', text: 'hi' } }); hub.event('msgs', 'INSERT', 'today'); await p.settle();
  assert.deepEqual(ids(snaps.at(-1)), ['new', 'today'], 'a new message is applied row by row');
  assert.equal(hub.queries.length, n, 'no download for either change');
  // a wider window (what "Load earlier" asks for) is a second listener with an earlier date
  const wide = []; p.db.collection('msgs').where('date', '>=', '2026-04-01').onSnapshot(s => wide.push(s)); await p.settle();
  assert.deepEqual(ids(wide.at(-1)), ['new', 'old', 'older', 'today']);
  assert.throws(() => p.db.collection('msgs').where('kid', '>=', 'k'), /Unsupported filter/, '">=" only on date');
  assert.throws(() => p.db.collection('msgs').where('date', '<', 'x'), /Unsupported filter/);
});

test('W3E-N3: portal.js windows messages, photos, observations and day records in the Hub, with "Load earlier"; messages carry their day', () => {
  assert.match(PORTAL, /const WIN_WEEKS = 8, WINDOWED = \['obs','photos','msgs'\]/);
  assert.match(PORTAL, /if\(P\.hub && WINDOWED\.includes\(c\)\)\{[^}]*ref=ref\.where\('date','>=',P2\.since\[c\]\)/);
  assert.match(PORTAL, /data-p2earlier="\$\{c\}">Load earlier \$\{what\} \(\$\{WIN_WEEKS\} more weeks\)/);
  for (const [c, w] of [['obs', 'notes'], ['photos', 'photos'], ['msgs', 'messages']]) assert.ok(PORTAL.includes(`earlier('${c}','${w}')`), `${c} list offers "Load earlier"`);
  assert.equal((PORTAL.match(/earlier\('msgs','messages'\)/g) || []).length, 2, 'teacher thread and family thread');
  assert.equal((PORTAL.match(/earlier\('photos','photos'\)/g) || []).length, 2, 'teacher portfolio and family photos');
  assert.match(PORTAL, /P2\.since\[c\]=weeksBefore\(P2\.since\[c\]\|\|iso\(new Date\(\)\), WIN_WEEKS\); sub2\(c\)/, 'load earlier widens by 8 weeks and re-listens');
  assert.match(PORTAL, /let ref=P\.db\.collection\('days'\)\.where\('room','==',P\.room\); if\(P\.hub\)\{ P\.daysSince=daysFrom\(\); ref=ref\.where\('date','>=',P\.daysSince\); \}/);
  assert.match(PORTAL, /function subscribeKd\(\)\{ if\(!P\.db\) return; ensureDays\(\);/, 'moving the date earlier widens the day records');
  assert.equal((PORTAL.match(/put2\('msgs', uid\('m'\), \{kid, room:P\.kids\[kid\]\.room, date:iso\(new Date\(\)\),/g) || []).length, 2, 'teacher and family messages carry the day they were sent');
  assert.match(PORTAL, /\$\{winFrom\('obs'\)\?`since \$\{shortDate\(winFrom\('obs'\)\)\} \(load earlier notes below for more\)`:'in all'\}/, 'the coverage count says it covers the loaded weeks, not "in all"');
});

test('W3E-N2: a teacher listens for deletes on the private staff topic only; a delete notice removes just that row', async () => {
  const hub = fakeHub();
  hub.put('kidday', { id: 'k1_2026-10-05', data: { kid: 'k1', date: '2026-10-05' } });
  hub.put('kidday', { id: 'k2_2026-10-05', data: { kid: 'k2', date: '2026-10-05' } });
  const p = await connected(hub); const snaps = [];
  p.db.collection('kidday').where('date', '==', '2026-10-05').onSnapshot(s => snaps.push(s)); await p.settle();
  const del = hub.channels.filter(c => c.name.startsWith('ffdel:'));
  assert.deepEqual(del.map(c => c.name), [`ffdel:${C}:staff`]);
  assert.equal(plain(del[0].opts).config.private, true, 'a private channel (the database decides who may join)');
  assert.deepEqual(plain(del[0].binds.map(b => [b.type, b.f.event])), [['broadcast', 'delete']]);
  hub.notice(`ffdel:${C}:staff`, { table: 'kidday', ids: ['k1_2026-10-05'] }); await p.settle();
  assert.deepEqual(ids(snaps.at(-1)), ['k2_2026-10-05']);
  hub.notice(`ffdel:${C}:staff`, { table: 'nope', ids: ['k2_2026-10-05'] }); hub.notice(`ffdel:${C}:staff`, { table: 'kidday' }); await p.settle();
  assert.deepEqual(ids(snaps.at(-1)), ['k2_2026-10-05'], 'a malformed notice changes nothing');
  del[0].status('CHANNEL_ERROR'); assert.ok(del[0].removed, 'a refused join is closed (no rejoin loop); the resync is the net');
});

test('W3E-N2: a family joins one topic per own child; a teacher without classroom access joins none', async () => {
  const fam = fakeHub({ role: 'family', guardianOf: ['k1', 'k3'] });
  const f = await connected(fam); f.db.collection('msgs').onSnapshot(() => {}); await f.settle();
  assert.deepEqual(fam.channels.filter(c => c.name.startsWith('ffdel:')).map(c => c.name), [`ffdel:${C}:kid:k1`, `ffdel:${C}:kid:k3`]);
  const pend = fakeHub({ access: 'pending' });
  const t = await connected(pend); t.db.collection('rooms').onSnapshot(() => {}); await t.settle();
  assert.equal(pend.channels.filter(c => c.name.startsWith('ffdel:')).length, 0);
  assert.ok(!/event:'DELETE'/.test(BACKEND), 'no listener asks postgres_changes for deletes');
});

test('W3C-N7: kids carry left_on as _leftOn (read-only); the director\'s call goes through the waiting list with a stable id', async () => {
  const calls = [];
  const offline = { items: () => [], call: async (name, args, id) => { calls.push([name, plain(args), id]); return { data: [{ kid: args.p_kid, left_on: args.p_left_on }] }; } };
  const hub = fakeHub({ role: 'director' });
  hub.put('kids', { id: 'k1', data: { first: 'TEST', room: 'r1' }, left_on: '2026-10-02' });
  const p = await connected(hub, { offline }); const snaps = [];
  p.db.collection('kids').onSnapshot(s => snaps.push(s)); await p.settle();
  assert.equal(hub.queries.filter(q => q.t === 'kids')[0].cols, 'id,data,updated_at,left_on');
  assert.equal(snaps.at(-1).docs[0].data()._leftOn, '2026-10-02');
  await p.db.collection('kids').doc('k1').set(Object.assign({}, snaps.at(-1).docs[0].data(), { first: 'TEST2' }));
  assert.ok(!('_leftOn' in hub.T.kids.get('k1').data), 'never written back into data');
  await p.H.leftOnSet('k1', '2026-10-03');
  assert.deepEqual(calls[0], ['kid_left_on_set', { p_center: C, p_kid: 'k1', p_left_on: '2026-10-03' }, 'k1:left_on:2026-10-03']);
  await p.H.leftOnSet('k1', null);
  assert.deepEqual(calls[1], ['kid_left_on_set', { p_center: C, p_kid: 'k1', p_left_on: null }, 'k1:left_on:none']);
  await p.H.history({ kid: 'k1', table: 'kidday', limit: 5000 });
  assert.deepEqual(plain(hub.rpcs.find(r => r[0] === 'care_history_list')[1]), { p_center: C, p_table: 'kidday', p_record_id: null, p_kid: 'k1', p_since: null, p_limit: 1000 });
  assert.match(OFFLINE, /const RPCS = \[[^\]]*'kid_left_on_set'\]/, 'hub-offline.js keeps it on the waiting list when offline');
});

// ---- care-history.js in a VM with a stub portal and Hub
function historyPage({ role = 'director', rows = [], fail = null, kids } = {}) {
  const state = { renders: 0, calls: [] }; const listeners = {}; const els = {};
  const H = { configured: true, connected: true, center: { id: C }, history: async o => { state.calls.push(['history', plain(o)]); if (fail) throw fail; return rows; },
    leftOnSet: async (k, d) => { state.calls.push(['left', k, d]); if (fail) throw fail; return { data: [] }; } };
  const ctx = { hub: true, role, kids: kids || { k1: { first: 'Olive', last: 'T', room: 'r1' }, k2: { first: 'Omar', last: 'T', room: 'r1', left_on: '2026-09-30' }, k3: { first: 'Nia', last: 'T', room: 'r1', _leftOn: '2026-09-01' } }, rooms: { r1: { name: 'Threes' } } };
  const timers = [];
  const sb = { console, JSON, Date, Math, Promise, Object, Array, Map, Set, String, Number, RegExp, Error, Intl,
    setTimeout: fn => { timers.push(fn); return timers.length; },
    esc: s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    V: { portal: () => '' }, FFHub: H, FFPortal: { ctx: () => ctx, rerender: () => { state.renders++; } },
    document: { addEventListener: (ev, f) => { (listeners[ev] ||= []).push(f); }, getElementById: id => els[id] || null, querySelector: () => null } };
  sb.window = sb; vm.createContext(sb); vm.runInContext(HISTORY, sb, { filename: 'care-history.js' });
  const run = async () => { for (let i = 0; i < 5; i++) { const t = timers.splice(0); for (const f of t) await f(); await new Promise(r => setImmediate(r)); } };
  const fire = async (ev, target) => { for (const f of listeners[ev] || []) await f(Object.assign({ target, preventDefault() {} }, ev === 'keydown' ? target : {})); await run(); };
  return { X: sb.FFHistory, ctx, state, run, fire };
}
const btn = (data) => ({ dataset: data, closest() { return this; } });

test('W3C-N6: only a director gets the Edit history tab; teachers and families do not', () => {
  for (const [role, want] of [['director', true], ['teacher', false], ['family', false]]) {
    const p = historyPage({ role }); const tabs = [['today', 'Today']]; p.X.addTabs(tabs, role);
    assert.equal(tabs.some(t => t[0] === 'history'), want, role);
  }
  assert.match(text(historyPage({ role: 'teacher' }).X.view({ role: 'teacher', kids: {} })), /Only the center director can see the edit history/);
  assert.equal(historyPage({ role: 'teacher' }).X.leftCard({ role: 'teacher', kids: { k1: { first: 'A' } } }), '', 'no leaving-date card for a teacher');
  assert.match(PORTAL, /if \(window\.FFHistory && P\.hub\) window\.FFHistory\.addTabs\(tabs, P\.role\)/);
  assert.match(PORTAL, /history:\(\)=>window\.FFHistory\.view\(rhythmCtx\(\)\)/);
});

test('W3C-N6: each change reads when, who, the record and field from -> to; insert / delete in words; filters go to the RPC', async () => {
  const rows = [
    { id: 3, at: '2026-10-05T14:05:00Z', table_name: 'kidday', record_id: 'k1_2026-10-05', kid: 'k1', op: 'update', actor_email: 'teacher@test.local', actor_role: 'authenticated', aal: 'aal1',
      changed: ['data.present', 'data.nap'], before: { 'data.present': false, 'data.nap': '' }, after: { 'data.present': true, 'data.nap': '30 to 60 min' } },
    { id: 2, at: '2026-10-05T13:00:00Z', table_name: 'obs', record_id: 'o1', kid: 'k1', op: 'insert', actor_email: 'teacher@test.local', aal: 'aal1', changed: ['data.text'], before: {}, after: { 'data.text': 'Stacked <six> blocks' } },
    { id: 1, at: '2026-10-04T13:00:00Z', table_name: 'kids', record_id: 'k2', kid: 'k2', op: 'delete', actor_email: null, actor_role: 'service_role', aal: null, changed: ['data.first'], before: { 'data.first': 'Omar' }, after: {} },
  ];
  const p = historyPage({ rows });
  assert.match(text(p.X.view(p.ctx)), /Loading the edit history/);
  await p.run();
  const html = p.X.view(p.ctx), t = text(html);
  assert.match(t, /teacher@test\.local changed Day record \(attendance, meals, rest, notes\) · Olive T\. · Mon, Oct 5, 2026/);
  assert.match(t, /Attendance : Absent → to Here/);
  assert.match(t, /Rest : \(empty\) → to “30 to 60 min”/);
  assert.match(t, /created Observation · Olive T\./); assert.match(t, /Note : “Stacked &lt;six&gt; blocks”/);
  assert.ok(html.includes('Stacked &lt;six&gt; blocks'), 'values are escaped');
  assert.match(t, /Futures Hub \(automatic\) deleted Child profile · Omar T\./); assert.match(t, /First name was “Omar”/);
  assert.match(t, /3 changes, newest first/);
  assert.match(html, /<ol class="chh-list">/); assert.match(html, /<time datetime="2026-10-05T14:05:00Z">/);
  assert.match(html, /role="status" aria-live="polite"/);
  for (const id of ['chhKid', 'chhTable', 'chhSince']) assert.match(html, new RegExp(`<label class="f" for="${id}">`), `${id} has a label`);
  await p.fire('submit', { id: 'chhFilters', elements: { kid: { value: 'k1' }, table: { value: 'kidday' }, since: { value: '2026-10-01' } } });
  p.X.view(p.ctx); await p.run();
  const last = p.state.calls.filter(c => c[0] === 'history').at(-1)[1];
  assert.equal(last.kid, 'k1'); assert.equal(last.table, 'kidday'); assert.match(last.since, /^2026-10-0[12]T/); assert.equal(last.limit, 200);
});

test('W3C-N6: a created record lists only its own fields (no center id, row id, duplicated columns or empty values)', async () => {
  const rows = [{ id: 9, at: '2026-10-05T14:05:00Z', table_name: 'kids', record_id: 'k9', kid: 'k9', op: 'insert', actor_role: 'service_role', aal: null,
    changed: ['center_id', 'id', 'kid', 'room', 'date', 'left_on', 'crm_child_id', 'data.first', 'data.room', 'photo_consent'],
    before: {}, after: { center_id: 'c', id: 'k9', kid: 'k9', room: 'r1', date: null, left_on: null, crm_child_id: null, 'data.first': 'Zed', 'data.room': 'r1', photo_consent: false } }];
  const p = historyPage({ rows }); p.X.view(p.ctx); await p.run();
  const t = text(p.X.view(p.ctx));
  assert.match(t, /created Child profile · child k9 First name : “Zed” Room : “r1” Photo consent : no/);
  assert.doesNotMatch(t, /center id|crm child id|Day the child left|Date :|Child : /);
});

test('W3C-N6: a refusal from the database (42501) says only the director can see it', async () => {
  const p = historyPage({ fail: Object.assign(new Error('x'), { code: '42501' }) });
  p.X.view(p.ctx); await p.run();
  const html = p.X.view(p.ctx);
  assert.match(html, /role="alert">Only the center director, signed in with two-step verification, can see the edit history\./);
});

test('W3C-N7: recording a leaving date needs a confirmation that says what it starts; cancel changes nothing', async () => {
  const p = historyPage();
  let t = text(p.X.leftCard(p.ctx));
  assert.match(t, /Children leaving the center/);
  assert.match(t, /The enrollment system says Omar T\. left on Wed, Sep 30, 2026\. Record that date/, 'the CRM date is offered, not applied');
  assert.match(t, /Nia T\. · last day Tue, Sep 1, 2026 Clear…/);
  assert.ok(!/<option value="k3"/.test(p.X.leftCard(p.ctx)), 'a child with a date recorded is not offered again');
  await p.fire('submit', { id: 'chhLeftForm', elements: { kid: { value: 'k1' }, date: { value: '2026-10-02' } } });
  t = text(p.X.leftCard(p.ctx));
  assert.match(t, /Record Olive T\.'s last day as Fri, Oct 2, 2026\?/);
  assert.match(t, /due for deletion 3 years after this day, from \w{3}, Oct 2, 2029/);
  assert.match(t, /Nothing is deleted today: the retention job is still a dry run/);
  assert.equal(p.state.calls.filter(c => c[0] === 'left').length, 0, 'nothing sent before the confirmation');
  await p.fire('click', { closest: () => btn({ chl: 'no' }) });
  assert.equal(p.state.calls.filter(c => c[0] === 'left').length, 0);
  assert.match(text(p.X.leftCard(p.ctx)), /Nothing was changed\./);
  await p.fire('submit', { id: 'chhLeftForm', elements: { kid: { value: 'k1' }, date: { value: '2026-10-02' } } });
  await p.fire('click', { closest: () => btn({ chl: 'yes' }) });
  assert.deepEqual(p.state.calls.filter(c => c[0] === 'left'), [['left', 'k1', '2026-10-02']]);
  assert.match(text(p.X.leftCard(p.ctx)), /Recorded: Olive T\.'s last day is Fri, Oct 2, 2026\./);
  await p.fire('click', { closest: () => btn({ chl: 'clear', chk: 'k3' }) });
  assert.match(text(p.X.leftCard(p.ctx)), /Clear Nia T\.'s leaving date\?/);
  await p.fire('click', { closest: () => btn({ chl: 'yes' }) });
  assert.deepEqual(p.state.calls.filter(c => c[0] === 'left').at(-1), ['left', 'k3', null]);
  const q = historyPage({ fail: Object.assign(new Error('x'), { code: '42501' }) });
  await q.fire('submit', { id: 'chhLeftForm', elements: { kid: { value: 'k1' }, date: { value: '2026-10-02' } } });
  await q.fire('click', { closest: () => btn({ chl: 'yes' }) });
  assert.match(text(q.X.leftCard(q.ctx)), /Not saved: only the director, signed in with two-step verification, can record this\./);
});

// ---- R5-06: the paper sheet per room
function offlinePage(ctx) {
  const H = { configured: true, connected: true, role: 'teacher', center: { id: C, name: 'TEST Center' }, ready: Promise.resolve(), connect: async () => ({ db: {}, role: 'teacher', center: H.center, userId: 'u1' }) };
  const sb = { console, JSON, Date, Math, Promise, Object, Array, Map, Set, String, Number, RegExp, Error, TypeError,
    setTimeout: () => 0, clearTimeout() {}, navigator: { onLine: true }, location: { reload() {} },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {}, key: () => null, length: 0 },
    fetch: async () => ({ status: 200 }), document: { addEventListener() {}, getElementById: () => null, querySelectorAll: () => [] },
    FF_HUB: { url: URL_, anonKey: 'anon' }, FFHub: H, V: {}, view: 'portal', render() {}, toast() {}, addEventListener() {} };
  sb.window = sb; vm.createContext(sb); vm.runInContext(OFFLINE, sb, { filename: 'hub-offline.js' });
  sb.FFPortal = { ctx: () => ctx, connectHub: async () => { await H.connect(); return { role: 'teacher' }; } };
  return sb;
}
test('R5-06: the paper sheet is drawn per room (this room, another, or every room on its own page) from memory', async () => {
  const ctx = { hub: true, date: '2026-10-05', room: 'r1', rooms: { r1: { name: 'TEST Threes', order: 1 }, r2: { name: 'TEST Pre-K', order: 2 }, s: { name: 'Sample', sample: true } },
    kids: { a: { first: 'Olive', last: 'T', room: 'r1' }, b: { first: 'Omar', last: 'T', room: 'r2' }, c: { first: 'Gone', last: 'T', room: 'r1', _leftOn: '2026-09-01' }, d: { first: 'Mia', last: 'C', room: 'r1', sample: true } } };
  const sb = offlinePage(ctx); await sb.FFPortal.connectHub(); await new Promise(r => setImmediate(r));
  const one = sb.FFOffline.sheet();
  assert.equal((one.match(/class="ffo-paper"/g) || []).length, 1);
  assert.match(text(one), /Room: TEST Threes/); assert.match(text(one), /Olive T\./);
  assert.doesNotMatch(text(one), /Omar|Mia|Gone/, 'other rooms, sample children and children who left are not on it');
  assert.match(one, /<label class="ffo-room" for="ffoRoom">Room<select id="ffoRoom" data-ffo-room>/);
  assert.doesNotMatch(one, /value="s"/, 'sample rooms are not offered');
  const two = text(sb.FFOffline.sheet('r2')); assert.match(two, /Room: TEST Pre-K/); assert.match(two, /Omar T\./); assert.doesNotMatch(two, /Olive/);
  const all = sb.FFOffline.sheet('*');
  assert.equal((all.match(/class="ffo-paper"/g) || []).length, 2, 'one page per room');
  assert.equal((all.match(/id="ffoSheetT"/g) || []).length, 1, 'one dialog title');
  assert.ok(text(all).indexOf('TEST Threes') < text(all).indexOf('TEST Pre-K'), 'rooms in their order');
  assert.match(read('hub-offline.css'), /body\.ffo-printing \.ffo-paper\+\.ffo-paper\{break-before:page;page-break-before:always/, 'each room prints on its own page');
  assert.match(PORTAL, /\$\{P\.hub && window\.FFOffline \? '<button class="btn soft" data-ffo="sheet">Print paper sheet \(downtime\)<\/button>' : ''\}/, 'printable ahead of time while live (Children tab)');
  assert.equal(typeof sb.FFOffline.openSheet, 'function');
});

test('index.html: care-history.js after portal.js, its stylesheet, and every edited file\'s ?v= bumped (>=)', () => {
  const at = s => INDEX.indexOf(s);
  assert.ok(at('care-history.js?v=') > at('portal.js?v=') && at('care-history.js?v=') < at('analytics-config.js?v='));
  assert.ok(at('hub-backend.js?v=') < at('hub-auth.js?v=') && at('hub-auth.js?v=') < at('hub-offline.js?v=') && at('hub-offline.js?v=') < at('portal.js?v='), 'script order kept');
  assert.ok(at('care-history.css?v=') > 0);
  const v = f => Number((new RegExp(`${f.replace('.', '\\.')}\\?v=(\\d+)`).exec(INDEX) || [])[1]);
  assert.ok(v('hub-backend.js') >= 8); assert.ok(v('hub-offline.js') >= 3); assert.ok(v('hub-offline.css') >= 2); assert.ok(v('portal.js') >= 25);
  assert.ok(v('care-history.js') >= 1); assert.ok(v('care-history.css') >= 1);
});
