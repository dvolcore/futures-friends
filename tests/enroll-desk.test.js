// W3A website: enroll-desk.js (director "Rooms and tours") and tour-booking.js (book an open tour time), against fakes.
// The rules themselves (capacity mirror, no double booking, who may write slots) are tested against Postgres and the live CRM in the
// platform repo (hub/tests/w3a-*.test.mjs, intake/tests/test_unit.py TourBooking).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const BASE = '<div class="phero">HEAD</div><section class="band-paper"><div class="wrap">BODY</div></section>';
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const text = h => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

function desk({ hub = true, role = 'director' } = {}) {
  const calls = [];
  const listeners = {};
  const rooms = [{ room: 'r1', room_name: 'Threes <A>', capacity: 1, enrolled: 2, present: 1, open_seats: -1, from_crm: true, state: 'over',
    warning: '2 children are enrolled; the licensed capacity is 1. Do not accept more until a child leaves.' }];
  const slots = [{ id: 's1', starts_at: '2026-11-03T15:00:00Z', minutes: 20, seats: 1, status: 'open' }, { id: 's2', starts_at: '2026-11-04T15:00:00Z', minutes: 20, seats: 1, status: 'open' }];
  const bookings = [{ id: 'b1', slot_id: 's1', family_name: 'Pat <P>', phone: '816', email: 'p@x.test', child_age: '3', status: 'booked' }];
  const q = (table) => {
    const chain = { select: () => chain, eq: () => chain, gte: () => chain, order: () => chain,
      delete: () => { calls.push(['delete', table]); return chain; },
      insert: (v) => { calls.push(['insert', table, v]); return Promise.resolve({ error: null }); },
      then: (f) => Promise.resolve({ data: table === 'tour_slots' ? slots : bookings, error: null }).then(f) };
    return chain;
  };
  const client = { from: q, rpc: (fn, args) => { calls.push(['rpc', fn, args]); return Promise.resolve({ data: rooms, error: null }); } };
  let renders = 0;
  const window = { FFHub: { configured: true, connected: hub, client: () => client },
    FFPortal: { ctx: () => ({ role, center: { id: 'c1' } }), rerender: () => { renders++; } } };
  const document = { addEventListener: (ev, f) => { (listeners[ev] = listeners[ev] || []).push(f); }, getElementById: () => null,
    createElement: () => ({}), head: { appendChild() {} } };
  const context = vm.createContext({ window, document, console, setTimeout, Promise, Intl, Date, Object, Number, FormData: class { constructor(f) { this.f = f; } entries() { return Object.entries(this.f.values); } }, esc });
  vm.runInContext('var V = { portal: () => ' + JSON.stringify(BASE) + ' };', context);
  vm.runInContext(read('enroll-desk.js'), context, { filename: 'enroll-desk.js' });
  return { out: () => vm.runInContext('V.portal()', context), settle: () => new Promise(r => setImmediate(r)), calls, listeners, renders: () => renders, window };
}

test('enroll-desk: sample mode, teachers and families: the portal is untouched and nothing is called', async () => {
  for (const opts of [{ hub: false }, { role: 'teacher' }]) {
    const s = desk(opts);
    assert.equal(s.out(), BASE);
    await s.settle();
    assert.deepEqual(s.calls, []);
  }
});

test('enroll-desk: a director sees capacity from the CRM with the over-capacity warning, tour times and bookings, escaped', async () => {
  const s = desk();
  assert.equal(s.out(), BASE, 'first render: loading');
  await s.settle(); await s.settle();
  const html = s.out();
  assert.ok(html.indexOf('Rooms and tours') > html.indexOf('<div class="wrap">'), 'inside the portal body');
  const t = text(html);
  assert.match(t, /Threes &lt;A&gt;: 2 children are enrolled; the licensed capacity is 1/);
  assert.match(t, /from the CRM/);
  assert.match(t, /Over capacity/);
  assert.match(html, /Pat &lt;P&gt;/);
  assert.match(t, /Change or cancel it in the CRM tour/, 'a booked time is changed in the CRM, not here');
  assert.equal((html.match(/data-ed="cancel"/g) || []).length, 1, 'only the unbooked time can be removed');
  assert.deepEqual(JSON.parse(JSON.stringify(s.calls[0])), ['rpc', 'center_room_capacity', { p_center: 'c1' }]);
});

test('enroll-desk: adding a tour time sends a Central-time instant (DST-correct)', async () => {
  const s = desk();
  s.out(); await s.settle(); await s.settle();
  const submit = s.listeners.submit[0];
  submit({ target: { id: 'edSlotForm', values: { date: '2026-11-03', time: '10:00', minutes: '20', seats: '1' } }, preventDefault() {} });
  await s.settle(); await s.settle();
  const ins = s.calls.find(c => c[0] === 'insert');
  assert.deepEqual(JSON.parse(JSON.stringify(ins[2])), { center_id: 'c1', starts_at: '2026-11-03T16:00:00.000Z', minutes: 20, seats: 1 }, '10:00 CST = 16:00 UTC');
  assert.equal(s.window.FFEnrollDesk.chicagoIso('2026-07-01', '10:00'), '2026-07-01T15:00:00.000Z', '10:00 CDT = 15:00 UTC');
});

// ---- tour-booking.js -------------------------------------------------------------------------------------------------------
function tour({ url = 'https://intake.example.test', slots = [{ id: 's1', start: '2026-11-03T15:00:00+00:00', minutes: 20 }], submitResult } = {}) {
  const listeners = {}, wlisteners = {}, sent = [];
  let observer = null;
  const nodes = {};
  const form = { id: 'ffxTourForm', dataset: {}, html: '', insertAdjacentHTML(_, h) { this.html = h + this.html; },
    querySelector: (s) => (s === 'button[type="submit"]' ? form.btn : s === '.ffx-demo' ? form.demo : null), btn: { textContent: 'Request this tour' }, demo: { textContent: '' } };
  nodes.ffxTourForm = form;
  const intake = { enabled: () => !!url, base: () => url, setErr: (id, m) => !m, clearMsg() {}, busy() {}, showFailure() {},
    submit: async (kind, data) => { sent.push([kind, data]); return submitResult || { ok: true, ref: 'FF-AAAA-BBBB', days: 2 }; },
    receipt: (o) => `<div id="ffiOk">${esc(o.title)}</div>` };
  const window = { FFIntake: intake, addEventListener: (ev, f) => { (wlisteners[ev] = wlisteners[ev] || []).push(f); } };
  const document = { documentElement: {}, addEventListener: (ev, f) => { (listeners[ev] = listeners[ev] || []).push(f); },
    getElementById: (id) => nodes[id] || (id === 'ffxTb' ? null : { value: { tName: 'Pat Parent', tPhone: '816-555-0100', tAge: '3 years', tEmail: '' }[id] || '', textContent: '', focus() {} }) };
  const fetchCalls = [];
  const fetch = async (u) => { fetchCalls.push(u); return { ok: true, json: async () => ({ slots }) }; };
  const context = vm.createContext({ window, document, console, fetch, Date, MutationObserver: class { constructor(f) { observer = f; } observe() {} } });
  vm.runInContext(read('tour-booking.js'), context, { filename: 'tour-booking.js' });
  return { form, observe: () => observer(), settle: () => new Promise(r => setImmediate(r)), sent, fetchCalls, listeners, wlisteners, window };
}

test('tour-booking: with no gateway url nothing is fetched or changed (the card keeps "Online requests open soon")', async () => {
  const t = tour({ url: '' });
  t.observe(); await t.settle();
  assert.deepEqual(t.fetchCalls, []);
  assert.equal(t.form.html, '');
});

test('tour-booking: with no open times the request form is left as it is', async () => {
  const t = tour({ slots: [] });
  t.observe(); await t.settle(); await t.settle();
  assert.deepEqual(t.fetchCalls, ['https://intake.example.test/v1/tour-slots?location=flc']);
  assert.equal(t.form.html, '');
});

test('tour-booking: open times are offered; picking one books it through the gateway with the slot id, then says booked', async () => {
  const t = tour();
  t.observe(); await t.settle(); await t.settle();
  assert.match(t.form.html, /Book an open tour time/);
  assert.match(t.form.html, /data-ffxb-slot="s1"/);
  t.listeners.click[0]({ target: { closest: () => ({ dataset: { ffxbSlot: 's1' } }) } });
  assert.equal(t.form.btn.textContent, 'Book this tour');
  let stopped = false;
  await t.wlisteners.submit[0]({ target: t.form, preventDefault() {}, stopImmediatePropagation() { stopped = true; } });
  assert.ok(stopped, 'features.js does not also send a request');
  assert.deepEqual(JSON.parse(JSON.stringify(t.sent)), [['tour', { location: 'flc', slot: 's1', name: 'Pat Parent', phone: '816-555-0100', childAge: '3 years', website: '' }]]);
  assert.match(t.form.outerHTML, /Your tour is booked/);
});

test('tour-booking: a time taken a moment ago is not shown as booked; the list is fetched again', async () => {
  const t = tour({ submitResult: { ok: false, errors: { slot: 'That time was just taken. Please choose another time.' } } });
  t.observe(); await t.settle(); await t.settle();
  t.listeners.click[0]({ target: { closest: () => ({ dataset: { ffxbSlot: 's1' } }) } });
  await t.wlisteners.submit[0]({ target: t.form, preventDefault() {}, stopImmediatePropagation() {} });
  assert.equal(t.form.outerHTML, undefined, 'no receipt');
  assert.equal(t.fetchCalls.length, 2);
  assert.equal(t.form.btn.textContent, 'Request this tour', 'nothing picked any more');
});

test('index.html loads the W3A files after the code they extend', () => {
  const html = read('index.html');
  const at = s => html.indexOf(s);
  assert.ok(at('enroll-desk.js?v=') > at('director-due.js?v=') && at('enroll-desk.js?v=') > at('portal.js?v='));
  assert.ok(at('tour-booking.js?v=') > at('intake.js?v=') && at('tour-booking.js?v=') > at('features.js?v='));
});
