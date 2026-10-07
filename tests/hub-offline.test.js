// Lost connection to the Futures Hub (R5 / CR-16): hub-offline.js in a sandbox with a fake signed-in Hub whose network can be cut.
// The browser run against the real local Hub is tests/browser/hub-offline.browser.mjs (needs the hub repo; not part of this suite).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const SRC = read('hub-offline.js'), PORTAL = read('portal.js'), INDEX = read('index.html');
const D = '2026-10-05';
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const plain = x => JSON.parse(JSON.stringify(x));

// ---- a fake Hub: rows by center|table|id, a switch for the network, and every write recorded
function hub(){
  const S = {rows:new Map(), down:false, calls:[], listeners:new Set()};
  const net = () => Object.assign(new Error('TypeError: Failed to fetch'), {code:'error'});
  const k = (c, t, id) => `${c}|${t}|${id}`;
  S.row = (c, t, id) => S.rows.get(k(c, t, id));
  S.put = (c, t, id, data) => S.rows.set(k(c, t, id), plain(data));
  const snap = L => { const docs = [...S.rows].filter(([key, d]) => key.startsWith(`${L.c}|${L.t}|`) && (!L.filter || d[L.filter.col] === L.filter.val)).map(([key, d]) => ({id:key.split('|')[2], data:() => d})); return {docs, size:docs.length, empty:!docs.length, forEach:f => docs.forEach(f)}; };
  S.poll = L => { if (S.down) { if (L.err) L.err(net()); } else L.cb(snap(L)); };
  S.pollAll = () => S.listeners.forEach(S.poll);
  S.db = c => ({collection:t => {
    const q = filter => ({onSnapshot:(cb, err) => { const L = {c, t, filter, cb, err}; S.listeners.add(L); S.poll(L); return () => S.listeners.delete(L); }, where:(col, op, val) => q({col, val})});
    return Object.assign(q(null), {doc:id => ({
      set:async obj => { if (S.down) throw net(); if (S.refuse && S.refuse.has(`${t}:${id}`)) throw Object.assign(new Error('new row violates row-level security policy'), {code:'42501'}); S.calls.push(['set', t, String(id)]); S.put(c, t, String(id), obj); },
      delete:async () => { if (S.down) throw net(); S.calls.push(['del', t, String(id)]); S.rows.delete(k(c, t, String(id))); }
    })});
  }});
  S.client = c => ({from:t => ({select:() => { const f = {}; const b = {eq:(col, v) => { f[col] = v; return b; },
    maybeSingle:async () => S.down ? {data:null, error:{message:'TypeError: Failed to fetch'}} : {data:S.row(f.center_id, t, f.id) ? {data:S.row(f.center_id, t, f.id)} : null, error:null}}; return b; }})});
  return S;
}
function storage(){
  const m = new Map();
  return {m, getItem:k => m.has(k) ? m.get(k) : null, setItem:(k, v) => { m.set(k, String(v)); }, removeItem:k => { m.delete(k); }, key:i => [...m.keys()][i] ?? null, get length(){ return m.size; }};
}
// one page load: hub-offline.js on top of a fake FFHub; `server` and `ls` survive a reload when passed again
function page({server = hub(), ls = storage(), signedIn = true, uid = 'u1', center = 'c1', role = 'teacher', base} = {}){
  if (signedIn && !ls.getItem('ff-hub-auth')) ls.setItem('ff-hub-auth', JSON.stringify({access_token:'x', user:{id:uid}}));
  const toasts = [], renders = [], signOuts = [], timers = new Map(); let tid = 0;
  const H = {configured:true, connected:false, role:null, center:null, userId:null, ready:Promise.resolve(), client:() => server.client(center),
    connect:async () => { if (server.down || server.nolink) return null; H.connected = true; H.role = role; H.userId = uid; H.center = {id:center, name:'TEST Center'}; return {db:server.db(center), role, center:H.center, userId:uid}; },
    signOut:async () => { signOuts.push(ls.getItem('ff-hub-auth')); }};
  const sb = {
    console, JSON, Date, Math, Promise, Object, Array, Map, Set, String, Number, RegExp, Error, TypeError,
    setTimeout:(fn, ms) => { timers.set(++tid, {fn, ms}); return tid; }, clearTimeout:id => { timers.delete(id); },
    navigator:{onLine:true}, location:{reload(){}}, localStorage:ls,
    fetch:async () => { if (server.down) throw new TypeError('Failed to fetch'); return {status:200}; },
    document:{addEventListener(){}, getElementById:() => null, querySelectorAll:() => []},
    FF_HUB:{url:'http://127.0.0.1:54321', anonKey:'anon'}, FFHub:H, V:{}, view:'portal',
    render(){ renders.push(1); }, toast:m => toasts.push(m), addEventListener(){}
  };
  sb.window = sb;
  vm.createContext(sb);
  vm.runInContext(SRC, sb, {filename:'hub-offline.js'});
  const ctx = {hub:true, date:D, room:'r1', rooms:{r1:{name:'TEST Threes'}}, kids:{k1:{first:'Olive', last:'TEST', room:'r1'}, k2:{first:'Omar', last:'TEST', room:'r1'}, s1:{first:'Mia', last:'C', room:'r1', sample:true}}};
  sb.FFPortal = {ctx:() => ctx, connectHub:async () => { const c = await H.connect(); if (c) sb.db = c.db; return c ? {role:c.role} : null; }};
  sb.V.portal = base || (() => portalHtml(sb));   // assigned after hub-offline.js, as portal.js does
  const flush = () => new Promise(r => setImmediate(r));
  return {sb, H, O:sb.FFOffline, server, ls, toasts, renders, signOuts, timers, flush, connect:async () => { await sb.FFPortal.connectHub(); return sb.db; }};
}
// the portal's own markup around a child's attendance (portal.js header() and the Today list; anchors checked below)
function portalHtml(sb){
  const kd = sb.KD || {};
  const row = (id, name) => { const x = kd[id] || {}; return `<div style="display:grid"><span><b>${name}.</b> <span class="mini">${x.present === true ? 'Here' : (x.present === false ? 'Absent' : 'Not marked')}</span></span><span style="display:flex;gap:4px"><button class="btn soft" data-att="${id}" data-v="1">Here</button></span></div>`; };
  const n = Object.values(kd).filter(x => x.present === true).length;
  return `<div class="phero"><span class="chip ok" style="background:transparent;color:#7FE0A8;border-color:currentColor">Live · saving to your program</span></div><section class="band-paper"><div class="card"><h3>Children today</h3><span class="chip">${n} of 2 here</span>${row('k1', 'Olive T')}${row('k2', 'Omar T')}</div></section>`;
}
const kidday = (kid, present, extra = {}) => ({kid, date:D, present, meals:{}, nap:'', note:'', star:false, ...extra});
// the portal's put(): change its own copy first, then save
async function mark(p, db, kid, present){ p.sb.KD = p.sb.KD || {}; p.sb.KD[kid] = kidday(kid, present); await db.collection('kidday').doc(`${kid}_${D}`).set(p.sb.KD[kid]); }

test('hub-offline.js parses, is loaded after hub-backend.js and before portal.js, with its stylesheet; portal.js anchors are still there', () => {
  new Function(SRC);
  const at = f => INDEX.indexOf(f);
  assert.ok(at('hub-backend.js?v=') > 0 && at('hub-offline.js?v=') > at('hub-backend.js?v=') && at('portal.js?v=') > at('hub-offline.js?v='));
  assert.ok(+INDEX.match(/hub-offline\.js\?v=(\d+)/)[1] >= 1 && +INDEX.match(/hub-offline\.css\?v=(\d+)/)[1] >= 1);
  assert.ok(+INDEX.match(/portal\.js\?v=(\d+)/)[1] >= 19, 'portal.js changed: cache-busting version bumped');
  // the marks are placed from these exact pieces of portal.js markup
  assert.match(PORTAL, /<span class="mini">\$\{x\.present===true\?'Here'/);
  assert.match(PORTAL, /data-att="\$\{id\}" data-v="1"/);
  assert.match(PORTAL, /<span class="chip">\$\{present\} of \$\{kids\.length\} here<\/span>/);
  assert.match(PORTAL, /sel\('a_'\+id,/);
  assert.match(PORTAL, /<span class="chip \$\{P\.live\?'ok':'warn'\}" style="background:transparent;color:\$\{P\.live\?'#7FE0A8':'#F3C969'\};border-color:currentColor">\$\{P\.live\?\(P\.canWrite\?'Live \\u00b7 saving to your program':'Live \\u00b7 view only'\)/);
  assert.match(PORTAL, /window\.FFOffline&&window\.FFOffline\.pending\('msgs',m\.id\)\?'Not sent yet'/, 'a waiting message never says Delivered');
});

test('without a configured Hub, or for a visitor who is not signed in, nothing changes (public sample mode stays)', () => {
  const sb = {window:null, V:{}, document:{addEventListener(){}, getElementById:() => null}, console};
  sb.window = sb; vm.createContext(sb); vm.runInContext(SRC, sb);
  assert.equal(sb.FFOffline, undefined);
  const p = page({signedIn:false, base:() => '<span>Sample local preview · changes stay in this browser</span>'});
  assert.match(p.sb.V.portal(), /Sample local preview/);
  assert.equal(p.O.state().mode, 'none');
});

test('Hub unreachable: the entry goes to the waiting list and is never shown as saved; the badge says Offline', async () => {
  const p = page(); const db = await p.connect();
  db.collection('kidday').where('date', '==', D).onSnapshot(() => {});
  await mark(p, db, 'k1', true);
  assert.deepEqual(p.server.calls, [['set', 'kidday', `k1_${D}`]], 'online: saved straight away');
  assert.match(text(p.sb.V.portal()), /Live · saving to your program/);
  assert.doesNotMatch(p.sb.V.portal(), /ffo-mark/);

  p.server.down = true;
  await mark(p, db, 'k2', true);   // resolves: the portal does not show its "did not save" toast
  assert.equal(p.server.row('c1', 'kidday', `k2_${D}`), undefined, 'nothing reached the Hub');
  assert.deepEqual(plain(p.O.state()), {mode:'connected', net:'offline', waiting:1, held:0, stored:true});
  const html = p.sb.V.portal(), t = text(html);
  assert.match(html, /<span class="mini">Here<\/span> <span class="ffo-mark" data-ffo-mark="wait">Not saved yet<\/span><\/span><span style="display:flex;gap:4px"><button class="btn soft" data-att="k2"/, 'the row is marked');
  const k1 = html.indexOf('data-att="k1"');
  assert.doesNotMatch(html.slice(html.lastIndexOf('<div', k1), k1), /ffo-mark/, 'the saved row is not');
  assert.match(t, /2 of 2 here 1 not saved yet/);
  assert.match(t, /Offline — 1 change waiting/);
  assert.doesNotMatch(t, /Live · saving/, 'the badge never claims Live while the Hub is unreachable');
  assert.match(p.toasts.at(-1), /Not saved yet\. It is kept on this device and will send when the Futures Hub is back/);
  p.sb.toast('Note saved');   // the portal's own success words right after
  assert.match(p.toasts.at(-1), /^Not saved yet/);
  assert.ok([...p.timers.values()].some(x => x.ms <= 15000), 'a reconnect check is scheduled');
});

test('the waiting list survives a reload and is sent in order with the same record ids; sending twice makes no duplicate', async () => {
  const server = hub(), ls = storage();
  const a = page({server, ls}); const db = await a.connect();
  server.down = true;
  await mark(a, db, 'k2', true);
  await db.collection('days').doc(`r1_${D}`).set({room:'r1', date:D, checks:{arrive:{by:'u1', at:1}}, notes:'Rainy day'});
  await db.collection('msgs').doc('m1').set({kid:'k1', from:'teacher', text:'Had a great day!', at:2});
  await mark(a, db, 'k1', false);
  assert.equal(a.O.state().waiting, 4);

  // reload while the Hub is still unreachable: the entries are still on this device
  const b = page({server, ls});
  await b.connect(); assert.equal(b.O.state().mode, 'offline'); assert.equal(b.O.state().waiting, 4);

  // the Hub is back: next page load sends them
  server.down = false;
  const c = page({server, ls}); await c.connect(); await c.O.retry();
  assert.deepEqual(server.calls, [['set', 'kidday', `k2_${D}`], ['set', 'days', `r1_${D}`], ['set', 'msgs', 'm1'], ['set', 'kidday', `k1_${D}`]], 'in order, same ids');
  assert.deepEqual(server.row('c1', 'kidday', `k2_${D}`), kidday('k2', true));
  assert.equal(c.O.state().waiting, 0); assert.equal(c.O.state().net, 'live');
  assert.equal(ls.getItem('ff-hub-outbox-v1:u1'), null, 'sent entries are deleted from the device');
  await c.O.retry();
  assert.equal(server.calls.length, 4, 'nothing is sent twice');
  assert.equal([...server.rows.keys()].filter(k => k.startsWith('c1|kidday|')).length, 2, 'one record per child per day');
});

test('a save whose answer was lost (it did reach the Hub) is not sent again', async () => {
  const server = hub(), ls = storage();
  const a = page({server, ls}); const db = await a.connect();
  server.down = true; await mark(a, db, 'k2', true);
  server.down = false; server.put('c1', 'kidday', `k2_${D}`, kidday('k2', true));   // it landed; only the reply was lost
  await a.O.retry();
  assert.deepEqual(server.calls, [], 'already there: no second write');
  assert.equal(a.O.state().waiting, 0);
});

test('a record changed in the Hub while the entry waited is held for a decision, never overwritten silently', async () => {
  const server = hub(); server.put('c1', 'kidday', `k1_${D}`, kidday('k1', false));
  server.put('c1', 'kidday', `k2_${D}`, kidday('k2', false));
  const p = page({server}); const db = await p.connect();
  let shown = null; db.collection('kidday').where('date', '==', D).onSnapshot(s => { shown = Object.fromEntries(s.docs.map(d => [d.id, d.data()])); });
  server.down = true;
  await mark(p, db, 'k1', true); await mark(p, db, 'k2', true);
  // meanwhile another teacher records lunch for both children
  server.put('c1', 'kidday', `k1_${D}`, kidday('k1', false, {meals:{lunch:'All'}}));
  server.put('c1', 'kidday', `k2_${D}`, kidday('k2', false, {meals:{lunch:'Some'}}));
  server.down = false; await p.O.retry();
  assert.deepEqual(server.calls, [], 'neither waiting entry overwrote the other teacher');
  assert.deepEqual(p.O.items().map(x => x.conflict), [true, true]);
  assert.match(text(p.sb.V.portal()), /Not saved: changed in the Hub/);
  assert.match(text(p.sb.V.portal()), /Live — 2 changes not saved/);
  const [one, two] = p.O.items();
  await p.O.resolve(one.n, true);                 // "Send mine"
  assert.deepEqual(server.calls, [['set', 'kidday', `k1_${D}`]]);
  assert.equal(server.row('c1', 'kidday', `k1_${D}`).present, true);
  p.O.resolve(two.n, false);                      // "Keep the Hub's": the screen gets the Hub's version back
  assert.equal(server.row('c1', 'kidday', `k2_${D}`).meals.lunch, 'Some');
  assert.equal(shown[`k2_${D}`].meals.lunch, 'Some');
  assert.equal(p.O.state().waiting, 0);
});

test('a signed-in teacher never lands in the sample classrooms: "Connecting", then "Can\'t reach Futures Hub" with the waiting entries', async () => {
  const server = hub(), ls = storage();
  const a = page({server, ls}); const db = await a.connect(); server.down = true; await mark(a, db, 'k2', true);
  const sample = () => '<span class="chip warn">Sample local preview · changes stay in this browser</span> Infant Room Mia Noah';
  const b = page({server, ls, base:sample});
  assert.match(text(b.sb.V.portal()), /Connecting to the Futures Hub/, 'a saved sign-in waits instead of drawing the sample');
  assert.doesNotMatch(b.sb.V.portal(), /Sample/);
  assert.equal(await b.sb.FFPortal.connectHub(), null);
  const t = text(b.sb.V.portal());
  assert.match(t, /Can't reach Futures Hub/);
  assert.match(t, /Your changes are kept on this device and will send when you're back online/);
  assert.match(t, /1 change waiting on this device/);
  assert.match(t, /Paper sheet for today/);
  assert.doesNotMatch(t, /Sample|Infant Room|Mia/);
  b.sb.V['family-portal'] = sample;
  assert.match(text(b.sb.V['family-portal']()), /Can't reach Futures Hub/);
  assert.ok(b.renders.length, 'the open portal is redrawn');
  // the Hub comes back: the same page connects and sends the entry
  server.down = false; await b.O.retry(); await b.flush(); await b.O.retry();
  assert.equal(b.O.state().mode, 'connected');
  assert.deepEqual(server.calls, [['set', 'kidday', `k2_${D}`]]);
});

test('signed in but the Hub knows no center for the account: a plain message, still not the sample', async () => {
  const server = hub(); const p = page({server, base:() => 'Sample local preview'});
  server.nolink = true;   // reachable, no membership for this account
  await p.sb.FFPortal.connectHub();
  assert.match(text(p.sb.V.portal()), /not linked to a center yet/);
});

test('sign-out deletes the waiting entries (and, when the Hub cannot be told, the sign-in on this device)', async () => {
  const server = hub(), ls = storage();
  const p = page({server, ls}); const db = await p.connect(); server.down = true; await mark(p, db, 'k2', true);
  ls.setItem('ff-hub-outbox-v1:u1:old', '{}');
  ls.setItem('ff-hub-outbox-v1:someone-else', '{"items":[]}');
  await p.H.signOut();
  assert.equal(p.signOuts.length, 1, 'the real sign-out still runs');
  assert.equal(ls.getItem('ff-hub-outbox-v1:u1'), null);
  assert.equal(ls.getItem('ff-hub-outbox-v1:u1:old'), null);
  assert.equal(ls.getItem('ff-hub-auth'), null, 'offline: the saved sign-in is removed here');
  assert.notEqual(ls.getItem('ff-hub-outbox-v1:someone-else'), null, 'another person’s entries are not touched');
  assert.equal(p.O.state().waiting, 0);
});

test('only what is needed to send an entry again is stored: no names, roster or copies of other records', async () => {
  const server = hub(), ls = storage();
  server.put('c1', 'kids', 'k1', {first:'Olive', last:'TEST', room:'r1'}); server.put('c1', 'kids', 'k2', {first:'Omar', last:'TEST', room:'r1'});
  server.put('c1', 'kidday', `k1_${D}`, kidday('k1', true, {note:'Built a tall tower'}));
  const p = page({server, ls}); const db = await p.connect();
  db.collection('kids').onSnapshot(() => {}); db.collection('kidday').where('date', '==', D).onSnapshot(() => {});
  server.down = true;
  const payload = kidday('k2', true, {meals:{lunch:'Most'}});
  await db.collection('kidday').doc(`k2_${D}`).set(payload);
  assert.deepEqual([...ls.m.keys()].sort(), ['ff-hub-auth', 'ff-hub-outbox-v1:u1']);
  const raw = ls.getItem('ff-hub-outbox-v1:u1'), box = JSON.parse(raw);
  assert.deepEqual(Object.keys(box).sort(), ['items', 'v']);
  assert.equal(box.items.length, 1);
  assert.deepEqual(Object.keys(box.items[0]).sort(), ['at', 'base', 'c', 'data', 'id', 'n', 'op', 't']);
  assert.deepEqual(box.items[0].data, payload, 'the record itself, exactly as it will be sent');
  assert.equal(box.items[0].base, null, 'the Hub had no record for this child today (fingerprint only, never a copy)');
  assert.doesNotMatch(raw, /Olive|Omar|TEST|tower|r1/, 'no names, roster or other children’s records');
  // photos are never kept on the device: they fail as before
  await assert.rejects(db.collection('photos').doc('p1').set({kid:'k2', src:'data:image/png;base64,AAAA'}));
  assert.doesNotMatch(ls.getItem('ff-hub-outbox-v1:u1'), /photos|base64/);
});

test('a change the Hub refuses (not a connection problem) is reported by the portal as before and marked "Not saved"', async () => {
  const server = hub(); server.refuse = new Set([`kidday:k2_${D}`]);
  const p = page({server}); const db = await p.connect();
  await assert.rejects(mark(p, db, 'k2', true), /row-level security/, 'the portal still gets the error and shows its message');
  assert.equal(p.O.state().waiting, 0, 'not queued: sending again cannot fix a refusal');
  assert.match(p.sb.V.portal(), /data-ffo-mark="refused">Not saved<\/span>/);
  assert.match(p.sb.V.portal(), /Live \u00b7 saving to your program/, 'the connection itself is fine');
});

test('the paper downtime sheet lists the real roster from memory (never sample children) and blank lines when there is none', async () => {
  const p = page(); await p.connect();
  const s = text(p.O.sheet());
  assert.match(s, /Downtime sheet: attendance, meals and notes/);
  assert.match(s, /Center: TEST Center/); assert.match(s, /Room: TEST Threes/); assert.match(s, /Monday, October 5, 2026/);
  assert.match(s, /Olive T\./); assert.match(s, /Omar T\./);
  assert.doesNotMatch(s, /Mia/, 'sample children are never printed');
  for (const h of ['Here / Absent', 'Time in', 'Time out', 'Breakfast', 'Lunch', 'PM snack', 'Rest', 'Note to family', 'Staff initials']) assert.match(s, new RegExp(h));
  assert.match(s, /Do not write health, allergy or medication details here/);
  const server = hub(); server.down = true;
  const q = page({server}); await q.sb.FFPortal.connectHub();
  const blank = q.O.sheet();
  assert.match(text(blank), /roster could not be loaded on this device/);
  assert.equal((blank.match(/<tr><td><\/td>/g) || []).length, 14);
  assert.doesNotMatch(text(blank), /Olive|Omar/);
});

test('the print rule for the sheet is scoped, and the banner never prints over other pages', () => {
  const css = read('hub-offline.css');
  assert.match(css, /body\.ffo-printing \*\{visibility:hidden!important\}/);
  assert.doesNotMatch(css, /(^|[\s,}])body\s+\*\s*\{\s*visibility/m);
  assert.match(css, /\.ffo-bar\{display:none!important\}/);
});
