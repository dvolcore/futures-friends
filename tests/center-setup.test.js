// center-setup.js: the director's "Get started" panel and the read-only / suspended banners, against a fake signed-in hub.
// The rules themselves (who may mark a step, the evidence, read-only) are tested against Postgres in the hub repo
// (hub/tests/center-provisioning*.test.mjs, which also drives this panel in a real browser).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const BASE = '<div class="phero">HEAD</div><section class="band-paper"><div class="wrap">BODY</div></section>';

function steps(done) {
  return ['profile', 'rooms', 'children', 'staff', 'rhythm', 'compliance', 'families'].map(s => ({ step: s, done: done.includes(s), ready: s === 'staff' }));
}
function site({ hub = true, role = 'director', row = { id: 'c1', name: 'TEST <Sun>', status: 'active' }, done = [] } = {}) {
  const calls = [];
  const listeners = {};
  const q = (table) => {
    const chain = { select: () => chain, eq: () => chain, order: () => chain, update: (v) => { calls.push(['update', table, v]); return chain; },
      upsert: (v) => { calls.push(['upsert', table, v]); return Promise.resolve({ error: null }); },
      insert: (v) => { calls.push(['insert', table, v]); return Promise.resolve({ error: null }); },
      maybeSingle: () => Promise.resolve({ data: row, error: null }),
      then: (f) => Promise.resolve({ data: table === 'rhythm_room_config' ? [{ room: 'r1', youngest_months: 24 }] : [], error: null }).then(f) };
    return chain;
  };
  const client = { from: q, rpc: (fn, args) => { calls.push(['rpc', fn, args]);
    const st = { center: { id: 'c1', name: row.name, status: row.status }, steps: steps(done), done: done.length, total: 7, profile: { state: 'KS', license_number: 'L-1' } };
    return Promise.resolve({ data: fn === 'center_export' ? { center: row } : st, error: null }); } };
  let renders = 0;
  const window = {
    FFHub: { configured: true, connected: hub, client: () => client },
    FFPortal: { ctx: () => ({ hub, role, center: { id: 'c1' }, rooms: { r1: { name: 'Room <1>', order: 1 } }, kids: { k1: { first: 'Ada', last: 'L' } } }) },
  };
  const document = { addEventListener: (ev, f) => { (listeners[ev] = listeners[ev] || []).push(f); }, getElementById: () => null,
    createElement: () => ({}), head: { appendChild() {} } };
  const context = vm.createContext({ window, document, console, navigator: {}, setTimeout, Promise, Blob: function () {}, URL,
    esc: s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])),
    view: 'portal', render: () => { renders++; } });
  vm.runInContext('var V = { portal: () => ' + JSON.stringify(BASE) + ", 'family-portal': () => " + JSON.stringify(BASE) + ' };', context);
  vm.runInContext(read('center-setup.js'), context, { filename: 'center-setup.js' });
  const out = (r = 'portal') => vm.runInContext(`V[${JSON.stringify(r)}]()`, context);
  const settle = () => new Promise(r => setImmediate(r));
  return { out, settle, calls, listeners, renders: () => renders, window };
}
const text = h => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

test('sample mode (no hub session): the portal is untouched', async () => {
  const s = site({ hub: false });
  assert.equal(s.out(), BASE);
  await s.settle();
  assert.deepEqual(s.calls, []);
});

test('a director of a new center sees "Get started" with all seven steps, inside the portal body, names escaped', async () => {
  const s = site();
  assert.equal(s.out(), BASE, 'first render: loading');
  await s.settle(); await s.settle();
  assert.ok(s.renders() > 0, 're-rendered after loading');
  assert.deepEqual(s.calls.filter(c => c[0] === 'rpc').map(c => c[1]), ['center_setup_status']);
  const h = s.out();
  assert.ok(h.startsWith('<div class="phero">HEAD</div><section class="band-paper"><div class="wrap"><section class="cs-panel"'), 'panel at the top of the body');
  assert.match(h, /id="csTitle">Get started/);
  assert.match(text(h), /0 of 7 done/);
  for (const t of ['Confirm your center profile', 'Set up your classrooms', 'Add your children', 'Your staff', 'Acknowledge the Daily Rhythm policy', 'Review your compliance calendar', 'Invite your families']) assert.ok(h.includes(t), t);
  assert.match(h, /TEST &lt;Sun&gt;/);
  assert.doesNotMatch(h, /<Sun>|undefined|NaN|\[object Object\]/);
  assert.match(h, /id="csProfile"/, 'the first step not done is open');
  assert.match(h, /name="license_number"[^>]*value="L-1"/);
});

test('steps act through the hub: mark a step, set a room age', async () => {
  const s = site();
  s.out(); await s.settle(); await s.settle();
  const click = (attrs) => s.listeners.click.forEach(f => f({ target: { closest: sel => sel === '[data-cs]' ? { dataset: attrs } : null } }));
  click({ cs: 'open', step: 'staff' });
  assert.match(s.out(), /data-cs="mark" data-step="staff"/);
  click({ cs: 'mark', step: 'staff' });
  await s.settle(); await s.settle();
  assert.deepEqual(JSON.parse(JSON.stringify(s.calls.find(c => c[1] === 'center_setup_mark')[2])), { p_center: 'c1', p_step: 'staff', p_done: true });
  click({ cs: 'open', step: 'rooms' });
  const rooms = s.out();
  assert.match(rooms, /Room &lt;1&gt;/);
  assert.match(rooms, /<option value="24" selected>2 years/, 'the stored age is shown');
  s.listeners.change.forEach(f => f({ target: { closest: () => ({ dataset: { csAge: 'r1' }, value: '36' }) } }));
  await s.settle();
  assert.deepEqual(JSON.parse(JSON.stringify(s.calls.find(c => c[0] === 'upsert')[2])), { center_id: 'c1', room: 'r1', youngest_months: 36 });
});

test('all steps done: no panel', async () => {
  const s = site({ done: ['profile', 'rooms', 'children', 'staff', 'rhythm', 'compliance', 'families'] });
  s.out(); await s.settle(); await s.settle();
  assert.equal(s.out(), BASE);
});

test('teachers and families never see the setup panel', async () => {
  for (const role of ['teacher', 'family']) {
    const s = site({ role });
    s.out(); await s.settle(); await s.settle();
    assert.equal(s.out(role === 'family' ? 'family-portal' : 'portal'), BASE, role);
    assert.deepEqual(s.calls.filter(c => c[1] === 'center_setup_status'), [], `${role}: no setup call`);
  }
});

test('read-only: everyone sees the banner; only the director gets the export button; no setup panel', async () => {
  const row = { id: 'c1', name: 'TEST Sun', status: 'read_only', status_reason: 'program subscription cancelled', suspend_after: '2026-11-04' };
  const d = site({ row });
  d.out(); await d.settle(); await d.settle();
  const h = d.out();
  assert.match(text(h), /This center is read-only until November 4, 2026/);
  assert.match(text(h), /Program subscription cancelled\. Everything stays visible/);
  assert.match(h, /data-cs="export"/);
  assert.doesNotMatch(h, /cs-panel/);
  const f = site({ row, role: 'family' });
  f.out('family-portal'); await f.settle();
  const fh = f.out('family-portal');
  assert.match(text(fh), /This center is read-only/);
  assert.doesNotMatch(fh, /data-cs="export"/);
});

test('suspended: a stop banner; the director can still export', async () => {
  const row = { id: 'c1', name: 'TEST Sun', status: 'suspended', status_reason: 'program subscription cancelled' };
  const d = site({ row });
  d.out(); await d.settle(); await d.settle();
  const h = d.out();
  assert.match(h, /cs-banner stop/);
  assert.match(text(h), /This center is suspended/);
  assert.match(h, /data-cs="export"/);
  assert.deepEqual(d.calls.filter(c => c[1] === 'center_setup_status'), [], 'a suspended center has no setup');
  const t = site({ row, role: 'teacher' });
  t.out(); await t.settle();
  assert.doesNotMatch(t.out(), /data-cs="export"/);
});

test('index.html loads center-setup.js after portal.js and daily-rhythm.js', () => {
  const html = read('index.html');
  const at = f => html.indexOf(`<script src="${f}`);
  assert.ok(at('center-setup.js') > at('portal.js') && at('center-setup.js') > at('daily-rhythm.js') && at('portal.js') > 0);
});
