// hub-backend.js center selection (R6, review H6 / E4): a person with several centers always sees which center the page works in,
// switching is explicit, every database call carries that center (x-ff-center: the database refuses writes to any other center,
// hub migration 20261010520000_acting_center_guard.sql) and a tab left behind by a switch in another tab stops writing.
// Training-only staff (background checks pending / expired / on hold) get a view-only portal and are told why. Fake hub, no network.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const URL_ = 'http://127.0.0.1:54321';
const PORTAL = '<div class="phero">P</div><section class="band-paper">BODY</section>';

function hub({ stored = null, memberships, access } = {}) {
  const store = new Map(stored ? [['ff-hub-center:u1', stored]] : []);
  const fetched = [];
  const winListeners = {};
  let reloads = 0, rerenders = 0, opts = null;
  const result = (data) => ({ data, error: null });
  const chain = (data) => { const c = { select: () => c, eq: () => c, order: () => c, in: () => c, then: (f, r) => Promise.resolve(result(data)).then(f, r) }; return c; };
  const ms = memberships || [{ center_id: 'cB', role: 'teacher' }, { center_id: 'cA', role: 'teacher' }];
  const client = {
    auth: { getSession: async () => ({ data: { session: { user: { id: 'u1', email: 'multi@example.test' } } } }), onAuthStateChange() {} },
    from: (t) => chain(t === 'memberships' ? ms : [{ id: 'cA', name: 'TEST North' }, { id: 'cB', name: 'TEST South <S>' }]),
    rpc: async (fn) => result(fn === 'my_staff_access' ? (access || [{ center_id: 'cA', access: 'classroom', missing: [] },
      { center_id: 'cB', access: 'pending', missing: [{ title: 'Background check cleared by KOEC' }] }]) : null),
  };
  const window = {
    FF_HUB: { url: URL_, anonKey: 'sb_publishable_test' },
    supabase: { createClient: (u, k, o) => { opts = o; return client; } },
    addEventListener: (ev, f) => { winListeners[ev] = f; },
    FFPortal: { rerender: () => { rerenders++; }, connectHub: async () => null },
  };
  const context = vm.createContext({
    window, console, Promise, Headers, Response, URLSearchParams, URL, atob,
    fetch: async (input, init) => { fetched.push({ url: String(input), init }); return new Response('[]', { status: 200 }); },
    localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); } },
    location: { search: '', hash: '#portal', origin: 'http://127.0.0.1:9', pathname: '/index.html', href: 'http://127.0.0.1:9/index.html#portal', reload: () => { reloads++; } },
    history: { replaceState() {} },
    document: { addEventListener() {}, getElementById: () => null, head: { appendChild() {}, insertAdjacentHTML() {} } },
    view: 'portal', render() {}, go() {},
  });
  vm.runInContext(`var V = { 'signin-family': () => '<form class="card signin" id="signinForm">', 'signin-teacher': () => '<form class="card signin" id="signinForm">',
    portal: () => ${JSON.stringify(PORTAL)}, 'family-portal': () => ${JSON.stringify(PORTAL)} };`, context);
  vm.runInContext(read('hub-backend.js'), context, { filename: 'hub-backend.js' });
  const H = context.window.FFHub;
  return { H, store, fetched, winListeners, context, opts: () => opts, reloads: () => reloads, rerenders: () => rerenders,
    portal: () => vm.runInContext('V.portal()', context) };
}
const text = h => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

test('loads before portal.js; the cache-bust version moved on', () => {
  const html = read('index.html');
  assert.ok(html.indexOf('hub-backend.js') < html.indexOf('portal.js'));
  assert.match(html, /hub-backend\.js\?v=\d+/);
});

test('several centers: the remembered choice wins, else the first by name; the choice is remembered per person', async () => {
  const a = hub();
  await a.H.ready;
  const c = await a.H.connect();
  assert.equal(c.center.id, 'cA', 'first by name (North) when nothing was chosen');
  assert.equal(a.store.get('ff-hub-center:u1'), 'cA');
  assert.deepEqual(a.H.centers.map(x => [x.id, x.access]), [['cA', 'classroom'], ['cB', 'pending']]);
  const b = hub({ stored: 'cB' });
  await b.H.ready;
  assert.equal((await b.H.connect()).center.id, 'cB', 'the center chosen last');
  const gone = hub({ stored: 'cZ' });
  await gone.H.ready;
  assert.equal((await gone.H.connect()).center.id, 'cA', 'a center the person no longer belongs to is never used');
});

test('training only: a pending center is view-only in the portal (the database refuses writes anyway)', async () => {
  const a = hub({ stored: 'cB' }); await a.H.ready;
  const c = await a.H.connect();
  assert.equal(await c.user.can('data.write'), false);
  const b = hub({ stored: 'cA' }); await b.H.ready;
  assert.equal(await (await b.H.connect()).user.can('data.write'), true);
  const fam = hub({ memberships: [{ center_id: 'cA', role: 'family' }] }); await fam.H.ready;
  assert.equal(await (await fam.H.connect()).user.can('data.write'), false);
});

test('every database call carries the center the page works in; auth and storage calls are left alone', async () => {
  const a = hub(); await a.H.ready; await a.H.connect();
  const f = a.opts().global.fetch;
  await f(`${URL_}/rest/v1/kidday?on_conflict=center_id,id`, { method: 'POST', headers: { apikey: 'k' }, body: '{}' });
  await f(`${URL_}/rest/v1/rpc/compliance_due`, { method: 'POST', headers: new Headers({ apikey: 'k' }) });
  await f(`${URL_}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: 'k' } });
  await f(`${URL_}/storage/v1/object/child-photos/x`, { method: 'POST', headers: { apikey: 'k' } });
  const hdr = i => new Headers(a.fetched[i].init.headers).get('x-ff-center');
  assert.equal(hdr(0), 'cA'); assert.equal(hdr(1), 'cA');
  assert.equal(new Headers(a.fetched[0].init.headers).get('apikey'), 'k', 'other headers kept');
  assert.equal(hdr(2), null); assert.equal(hdr(3), null);
});

test('a switch in another tab: this tab says so and refuses to write until the person chooses; reading still works', async () => {
  const a = hub(); await a.H.ready; await a.H.connect();
  const f = a.opts().global.fetch;
  a.store.set('ff-hub-center:u1', 'cB');
  a.winListeners.storage({ key: 'ff-hub-center:u1', newValue: 'cB' });
  assert.deepEqual(JSON.parse(JSON.stringify(a.H.stale)), { id: 'cB', name: 'TEST South <S>' });
  assert.ok(a.rerenders() > 0, 'the page redraws with the warning');
  const before = a.fetched.length;
  const r = await f(`${URL_}/rest/v1/kidday`, { method: 'POST', body: '{}' });
  assert.equal(r.status, 409);
  const body = await r.json();
  assert.equal(body.code, 'center_changed');
  assert.match(body.message, /working in TEST North, but you switched to TEST South/);
  assert.equal(a.fetched.length, before, 'nothing reached the server');
  await f(`${URL_}/rest/v1/kidday?select=id`, { method: 'GET' });
  assert.equal(a.fetched.length, before + 1, 'reads still go out');
  await a.H.boot();
  const bar = text(a.portal());
  assert.match(bar, /You switched to TEST South &lt;S&gt; in another tab/);
  assert.match(bar, /will not save anything until you choose/);
  assert.doesNotMatch(a.portal(), /<S>/, 'names escaped');
  a.H.keepCenter();
  assert.equal(a.H.stale, null);
  assert.equal(a.store.get('ff-hub-center:u1'), 'cA', 'keeping this center makes it the remembered one again');
  assert.equal((await f(`${URL_}/rest/v1/kidday`, { method: 'POST', body: '{}' })).status, 200);
});

test('the center bar: always names the center; a person with several centers switches explicitly (reload into the new center)', async () => {
  const a = hub({ stored: 'cB' }); await a.H.ready; await a.H.connect(); a.H.connected = true;
  await a.H.boot();
  const h = a.portal(), tx = text(h);
  assert.ok(h.indexOf('id="hubCenterBar"') < h.indexOf('<section class="band-paper"'), 'above the portal content');
  assert.match(tx, /Working in TEST South &lt;S&gt; staff/);
  assert.match(h, /<select class="i" id="hubCenterPick"/);
  assert.match(h, /<option value="cA" >TEST North \(staff\)<\/option>/);
  assert.match(tx, /Training only for now/); assert.match(tx, /Still needed: Background check cleared by KOEC/);
  assert.match(h, /data-go="learn"/);
  assert.equal(a.H.switchCenter('cZ'), false, 'not a center of this person');
  assert.equal(a.reloads(), 0);
  assert.equal(a.H.switchCenter('cA'), true);
  assert.equal(a.store.get('ff-hub-center:u1'), 'cA');
  assert.equal(a.reloads(), 1, 'the page reloads into the new center: no screen keeps the old one');
  const one = hub({ memberships: [{ center_id: 'cA', role: 'teacher' }] }); await one.H.ready; await one.H.connect(); one.H.connected = true; await one.H.boot();
  const h1 = one.portal();
  assert.match(text(h1), /Working in TEST North/);
  assert.doesNotMatch(h1, /hubCenterPick/, 'one center: nothing to switch');
  assert.doesNotMatch(text(h1), /Training only/);
});
