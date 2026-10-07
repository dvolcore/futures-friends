// W3B arrival / departure on the site: arrival.js and the waiting-list calls it makes through hub-offline.js (FFOffline.call).
// A fake Hub that behaves like the real functions on the one point that matters here: an event id that is already there comes
// back as the same event (hub migration 20261011200000_arrival_departure.sql; the real-database proof is the hub repo's
// hub/tests/arrival-departure.test.mjs). The browser run against the local Hub is tests/browser/arrival.browser.mjs.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const OFF = read('hub-offline.js'), ARR = read('arrival.js'), PORTAL = read('portal.js'), INDEX = read('index.html');
const plain = x => JSON.parse(JSON.stringify(x));
const eq = (a, b, m) => assert.deepEqual(plain(a), b, m);   // values from the sandbox are another realm's objects

function hub(){
  const S = {events:new Map(), down:false, loseReply:false, calls:[]};
  const net = () => new TypeError('Failed to fetch');
  S.rpc = async (name, args) => {
    if (S.down) throw net();
    if (name !== 'arrival_board') S.calls.push([name, args.p_id]);   // arrival.js reloads its board after a send: not a waiting-list call
    if (name === 'arrival_check_in' || name === 'arrival_check_out' || name === 'arrival_move' || name === 'pickup_request_submit') {
      const had = S.events.has(args.p_id);
      if (!had) S.events.set(args.p_id, {name, kid:args.p_kid});
      if (S.loseReply) { S.loseReply = false; throw net(); }   // the Hub saved it, the answer never arrived
      return {data:Object.assign({id:args.p_id, kind:name}, had ? {replayed:true} : {}), error:null};
    }
    return {data:null, error:null};
  };
  return S;
}
function storage(){
  const m = new Map();
  return {m, getItem:k => m.has(k) ? m.get(k) : null, setItem:(k, v) => { m.set(k, String(v)); }, removeItem:k => { m.delete(k); }, key:i => [...m.keys()][i] ?? null, get length(){ return m.size; }};
}
function page({server = hub(), ls = storage(), uid = 'u1', center = 'c1'} = {}){
  if (!ls.getItem('ff-hub-auth')) ls.setItem('ff-hub-auth', JSON.stringify({access_token:'x', user:{id:uid}}));
  const toasts = [], timers = new Map(); let tid = 0;
  const H = {configured:true, connected:false, role:null, center:null, userId:null, ready:Promise.resolve(),
    client:() => ({rpc:(n, a) => server.rpc(n, a), from:() => ({select:() => ({eq(){ return this; }, maybeSingle:async () => ({data:null, error:null})})})}),
    connect:async () => { if (server.down) return null; H.connected = true; H.role = 'teacher'; H.userId = uid; H.center = {id:center, name:'TEST'};
      return {db:{collection:() => ({onSnapshot:() => () => {}, where(){ return this; }, doc:() => ({set:async () => {}, delete:async () => {}})})}, role:'teacher', center:H.center, userId:uid}; },
    signOut:async () => {}};
  const sb = {console, JSON, Date, Math, Promise, Object, Array, Map, Set, String, Number, RegExp, Error, TypeError, Uint8Array,
    setTimeout:(fn, ms) => { timers.set(++tid, {fn, ms}); return tid; }, clearTimeout:id => { timers.delete(id); }, setInterval:() => 0,
    navigator:{onLine:true}, location:{reload(){}}, localStorage:ls,
    fetch:async () => { if (server.down) throw new TypeError('Failed to fetch'); return {status:200}; },
    document:{addEventListener(){}, getElementById:() => null, querySelectorAll:() => [], body:{classList:{add(){}, remove(){}}}},
    FF_HUB:{url:'http://127.0.0.1:54321', anonKey:'anon'}, FFHub:H, V:{}, view:'portal', render(){}, toast:m => toasts.push(m), addEventListener(){},
    esc:s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'}[c])),
    crypto:{randomUUID:() => require('node:crypto').randomUUID(), getRandomValues:a => require('node:crypto').getRandomValues(a)}};
  sb.window = sb;
  vm.createContext(sb);
  vm.runInContext(OFF, sb, {filename:'hub-offline.js'});
  sb.V.portal = () => '<div></div>';
  sb.FFPortal = {ctx:() => ({hub:true, role:'teacher', center:H.center, room:'r1', rooms:{r1:{name:'TEST Threes'}}, kids:{}, date:'2026-10-05', tab:'today', canWrite:true}),
    connectHub:async () => { const c = await H.connect(); return c ? {role:c.role} : null; }, rerender(){}};
  vm.runInContext(ARR, sb, {filename:'arrival.js'});
  const flush = async () => { for (let i = 0; i < 5; i++) await new Promise(r => setImmediate(r)); };
  return {sb, H, O:sb.FFOffline, A:sb.FFArrival, server, ls, toasts, timers, flush, connect:() => sb.FFPortal.connectHub()};
}
const outbox = ls => [...ls.m].filter(([k]) => k.startsWith('ff-hub-outbox')).map(([, v]) => JSON.parse(v));
const ARGS = (id, extra = {}) => ({p_center:'c1', p_id:id, p_kid:'k1', p_person:'p1', p_sign_method:'signature', p_signature:'M1 1 L2 2 L3 3', ...extra});

test('arrival.js parses and loads after portal.js and director-due.js, with its stylesheet; hub-offline.js still before portal.js', () => {
  new Function(ARR); new Function(OFF);
  const at = f => INDEX.indexOf(f);
  assert.ok(at('arrival.js?v=') > at('portal.js?v=') && at('arrival.js?v=') > at('director-due.js?v=') && at('arrival.js?v=') < at('analytics.js?v='));
  assert.ok(at('hub-offline.js?v=') > at('hub-backend.js?v=') && at('portal.js?v=') > at('hub-offline.js?v='));
  assert.match(INDEX, /<link rel="stylesheet" href="arrival\.css\?v=\d+">/);
  assert.ok(Number(INDEX.match(/hub-offline\.js\?v=(\d+)/)[1]) >= 2 && Number(INDEX.match(/portal\.js\?v=(\d+)/)[1]) >= 21, 'changed assets are cache-busted');
  assert.match(PORTAL, /window\.FFArrival\.addTabs\(tabs, P\.role\)/);
  assert.match(PORTAL, /arrivals:\(\)=>window\.FFArrival\.view\(rhythmCtx\(\)\)/);
  assert.match(PORTAL, /data-att="\$\{id\}" data-v="1"/, 'the Today "Here" button (hub-offline.js and its browser test anchor on it) is kept');
});

test('the Arrivals tab is added for staff after Today, never for families or when the Hub is not connected', async () => {
  const p = page();
  const tabs = [['today', 'Today'], ['calendar', 'Lesson calendar']];
  p.A.addTabs(tabs, 'teacher'); eq(tabs.map(t => t[0]), ['today', 'calendar'], 'not connected: nothing');
  await p.connect();
  p.A.addTabs(tabs, 'teacher'); eq(tabs.map(t => t[0]), ['today', 'arrivals', 'calendar']);
  const fam = [['today', 'Today']]; p.A.addTabs(fam, 'family'); eq(fam.map(t => t[0]), ['today']);
});

test('online: a sign-in goes straight to the Hub, once, with the id chosen on the device', async () => {
  const p = page(); await p.connect();
  const r = await p.O.call('arrival_check_in', ARGS('e1'), 'e1');
  assert.equal(r.data.id, 'e1');
  eq(p.server.calls, [['arrival_check_in', 'e1']]);
  eq(outbox(p.ls), []);
});

test('the Hub saved it but the answer was lost: kept with the SAME id, sent again, the Hub still has ONE event', async () => {
  const p = page(); await p.connect();
  p.server.loseReply = true;
  const r = await p.O.call('arrival_check_in', ARGS('e2'), 'e2');
  eq(r, {queued:true});
  assert.equal(p.server.events.size, 1, 'the first send reached the Hub');
  const box = outbox(p.ls)[0].items;
  eq(box.map(x => [x.t, x.id, x.op, x.data.p_id]), [['rpc:arrival_check_in', 'e2', 'rpc', 'e2']]);
  await p.O.retry(); await p.flush();
  eq(p.server.calls.map(c => c[1]), ['e2', 'e2'], 'sent again with the same id');
  assert.equal(p.server.events.size, 1, 'one event');
  eq(outbox(p.ls), [], 'nothing left waiting');
});

test('offline: sign-in, room move and a family request wait on the device in order and survive a reload; a PIN or code is never kept', async () => {
  const server = hub(), ls = storage();
  let p = page({server, ls}); await p.connect();
  server.down = true;
  eq(await p.O.call('arrival_check_in', ARGS('e3'), 'e3'), {queued:true});
  eq(await p.O.call('arrival_move', {p_center:'c1', p_id:'m1', p_kids:['k1', 'k2'], p_to_room:'r2'}, 'm1'), {queued:true});
  eq(await p.O.call('pickup_request_submit', {p_center:'c1', p_id:'q1', p_kid:'k1', p_action:'add', p_name:'TEST Aunt'}, 'q1'), {queued:true});
  await assert.rejects(p.O.call('arrival_check_out', ARGS('e4', {p_sign_method:'family_pin', p_pin:'4826', p_signature:undefined}), 'e4'), e => e.code === 'needs_connection');
  await assert.rejects(p.O.call('arrival_check_out', ARGS('e5', {p_day_pass:'d1', p_day_code:'123456'}), 'e5'), e => e.code === 'needs_connection');
  const box = outbox(ls)[0].items;
  eq(box.map(x => x.id), ['e3', 'm1', 'q1']);
  assert.ok(!JSON.stringify(box).includes('4826') && !JSON.stringify(box).includes('123456'), 'no PIN or code on the device');
  assert.equal(p.O.state().waiting, 3);
  // reload (still offline), then the Hub comes back
  p = page({server, ls}); server.down = false; await p.connect(); await p.O.retry(); await p.flush();
  eq(server.calls.map(c => c[0]), ['arrival_check_in', 'arrival_move', 'pickup_request_submit'], 'sent in order');
  eq(server.calls.map(c => c[1]), ['e3', 'm1', 'q1'], 'with the ids chosen on the device');
  assert.equal(server.events.size, 3);
  await p.O.retry(); await p.flush();
  assert.equal(server.calls.length, 3, 'nothing is sent twice');
});

test('an entry the Hub refuses on replay (for example a release it blocks) is held for the person, never retried silently', async () => {
  const server = hub(), ls = storage();
  const p = page({server, ls}); await p.connect();
  server.down = true;
  await p.O.call('arrival_check_out', ARGS('e6'), 'e6');
  server.down = false;
  server.rpc = async (name, args) => { server.calls.push([name, args.p_id]); return {data:null, error:{message:'Blocked: TEST Stranger is not on TEST Ava\'s pickup list.', code:'55000'}}; };
  await p.O.retry(); await p.flush();
  eq(p.O.items().map(x => [x.id, x.failed]), [['e6', true]]);
  assert.equal(p.O.state().held, 1);
  await p.O.retry(); await p.flush();
  assert.equal(server.calls.length, 2, 'retried only when the person asks (Try now), still held');
  p.O.resolve(p.O.items()[0].n, false);
  eq(outbox(ls), []);
});

test('a stored outbox that somehow holds a PIN is cleaned on load; unknown functions are never queued or called', async () => {
  const ls = storage();
  ls.setItem('ff-hub-outbox-v1:u1', JSON.stringify({v:1, items:[
    {n:1, t:'rpc:arrival_check_in', id:'e7', c:'c1', op:'rpc', at:1, data:ARGS('e7', {p_pin:'4826'})},
    {n:2, t:'rpc:pickup_set', id:'x', c:'c1', op:'rpc', at:2, data:{p_center:'c1'}}]}));
  const server = hub(); server.down = true;
  const p = page({server, ls}); server.down = false; await p.connect(); await p.flush();
  eq(p.O.items().map(x => x.t), ['rpc:arrival_check_in'], 'only the allowed calls load');
  await p.O.retry(); await p.flush();
  assert.equal(server.events.size, 1);
  await assert.rejects(p.O.call('pickup_set', {}, 'y'), /Not a waiting-list call/);
});
