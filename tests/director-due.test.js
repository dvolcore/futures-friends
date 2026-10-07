// director-due.js: the director's "What's due" tab, the inspection binder, the Safety logs tab (ratios, drills, incidents) and the
// family's incident acknowledgement, against a fake signed-in hub. The rules themselves (RLS, due dates, ratio tables, citations)
// are tested against Postgres in the hub repo (hub/tests/director-compliance.test.mjs, director-rules-unit.test.mjs).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const FAM_BASE = '<div class="phero">F</div><section class="band-paper" style="padding-block:22px 60px"><div class="wrap" style="display:grid;gap:16px">BODY</div></section>';

const DUE = [
  { bucket: 'overdue', due_date: '2026-09-30', days_left: -5, kind: 'drill', title: 'Monthly fire drill', detail: 'None logged for September 2026.',
    citation: 'K.A.R. 28-4-128(a)(6)(A) (amended Sept. 4, 2026)', rule_key: 'KS.drill.fire', action: { type: 'drill', drill_type: 'fire' } },
  { bucket: 'due_7', due_date: '2026-10-05', days_left: 0, kind: 'staff', user_id: 'u1', full_name: 'Tia <Teacher>', title: 'Staff and volunteer orientation within 7 days',
    citation: 'K.A.R. 28-4-428a(a)(3)', action: { type: 'record', requirement_id: 'KS-CTR-ORIENTATION-STAFF', user_id: 'u1' } },
  { bucket: 'due_7', due_date: '2026-10-05', days_left: 0, kind: 'incident', title: 'Written critical incident report to the state by the next working day',
    citation: 'K.A.R. 28-4-133(b)', action: { type: 'incident', id: 'i1', step: 'state' } },
  { bucket: 'needs_info', due_date: null, kind: 'posting', title: 'Daily schedule posted in each unit', detail: 'Not confirmed yet.', citation: 'K.A.R. 28-4-427(c)(3)-(4)',
    needs_confirmation: true, action: { type: 'record', requirement_id: 'KS-CTR-PROG-DAILY-SCHEDULE', user_id: null } },
  { bucket: 'own_records', due_date: null, kind: 'own_records', title: 'Child immunization record within 60 days of enrollment', detail: 'Kept in your own records (not in the Hub).',
    citation: 'K.A.R. 28-4-430(a)(5)-(6)' },
];
const ELIG = [{ user_id: 'u1', full_name: 'Tia <Teacher>', job_role: 'lead_teacher', eligible: false, citation: 'K.A.R. 28-4-125(a)', missing: [{ requirement_id: 'KS-ALL-BGC-BEFORE-WORK', title: 'Cleared background check before working' }] }];
const BINDER = { as_of: '2026-10-05', period_from: '2025-10-05', generated_at: '2026-10-05T15:00:00Z',
  center: { name: 'TEST <North>', state: 'KS', facility_type: 'child_care_center', license_number: 'L-1' },
  counts: { staff: 1, overdue: 1, due_30: 2, rules_in_effect: 30 },
  sections: [
    { key: 'license', title: 'License and postings', citations: ['K.A.R. 28-4-421(c)'], postings: [{ title: 'License posted', citation: 'K.A.R. 28-4-421(c)', confirmed_on: null }] },
    { key: 'drills', title: 'Emergency drills', citations: ['K.A.R. 28-4-128(a)(6)(A)'], rules: [{ title: 'Monthly fire drill', citation: 'K.A.R. 28-4-128(a)(6)(A)', months: [{ month: '2026-09', status: 'logged' }, { month: '2026-10', status: 'in_progress' }] }],
      log: [{ date: '2026-09-15', time: '10:00 AM', drill_type: 'fire', evacuation_seconds: 125, rooms: ['tods'], children_count: 12 }] },
    { key: 'incidents', title: 'Incident and injury reports', citations: ['K.A.R. 28-4-133(b)'], summary: { total: 1, injury: 0, critical: 1 },
      list: [{ date: '2026-10-02', time: '3:30 PM', kind: 'critical', critical_type: 'missing_child', room: 'pre', state_due: '2026-10-05', family_acknowledged: false }] },
    { key: 'child_records', title: 'Child health records', citations: ['K.A.R. 28-4-430(a)(5)-(6)'], note: 'Kept in your own records (not in the Hub).', rules: [{ title: 'Immunization record', citation: 'K.A.R. 28-4-430(a)(5)-(6)' }] },
  ] };
const EXC = [
  { key: 'ops:1', kind: 'delivery_failed', severity: 'high', title: 'Daily report email not delivered', subject: 'fam@example.test', owner_role: 'director', reason: '550 <mailbox> unavailable',
    due_date: '2026-10-04', next_action: 'Check the family\'s email address with them, then retry.', source: { label: 'Family Portal: the report is there', hub: 'portal' }, actions: ['retry', 'escalate'] },
  { key: 'clearance:pending:u1', kind: 'clearance_pending', severity: 'high', title: 'Started without a cleared background check', subject: 'Tia <Teacher> (lead teacher)', owner_role: 'director',
    reason: 'Missing: KOEC background check. Training only until this is resolved.', due_date: '2026-10-01', next_action: 'Record the result.', source: { label: 'Classroom access (this desk)', hub: 'access', crm: '#Contact/view/abc' },
    actions: ['escalate'] },
  { key: 'crm_sync:application:a9', kind: 'sync_blocked', severity: 'medium', title: 'Hiring: hub access blocked', subject: 'TEST App', owner_role: 'hq', reason: 'No email address.',
    due_date: '2026-10-03', next_action: 'Fix it in the CRM.', source: { label: 'CRM job application', crm: '#CJobApplication/view/a9' }, actions: [], escalated_at: '2026-10-04T15:00:00Z' },
  { key: 'training:e1', kind: 'training_overdue', severity: 'medium', title: 'Training overdue: SR-100', subject: 'Tia', owner_role: 'staff', owner_name: 'Tia', reason: 'Due Oct 1.',
    due_date: '2026-10-01', next_action: 'Finish it.', source: { label: 'Team training', hub: 'learn-team' }, actions: ['escalate'] },
];
const ACCESS_ROWS = [
  { user_id: 'u1', full_name: 'Tia <Teacher>', job_role: 'lead_teacher', role: 'teacher', access: 'pending', gated: true, checks_state: 'pending',
    missing: [{ requirement_id: 'KS-ALL-BGC-BEFORE-WORK', title: 'Background check cleared by KOEC', citation: 'K.A.R. 28-4-125(a)' }] },
  { user_id: 'u2', full_name: 'Ben', job_role: 'assistant_teacher', role: 'teacher', access: 'classroom', gated: true, checks_state: 'cleared', cleared_until: '2030-01-01', missing: [] },
  { user_id: 'u3', full_name: 'Cy', job_role: 'floater', role: 'teacher', access: 'on_hold', gated: true, checks_state: 'cleared', missing: [], hold_reason: 'Review', hold_source: 'director' },
];
const LIVE = [{ room: 'tods', room_name: 'Toddlers', present: 7, age_group: 'toddler', result: { status: 'needs_staff_count', required_staff: 2,
  row: { label: 'Toddlers (walking, 12-30 months)', ratio: '1:6', citation: 'K.A.R. 28-4-428(a)(2)' } } }];

function site({ hub = true, role = 'director', fam = null } = {}) {
  const calls = [];
  const listeners = {};
  const tables = { drill_logs: [], incident_reports: fam ? [{ id: 'i9', kind: 'injury', occurred_at: '2026-10-02T15:00:00Z', what_happened: 'Bumped <head> on shelf', first_aid: 'Cold pack', family_ack_at: null }] : [] };
  const q = (table) => {
    const chain = { select: () => chain, eq: () => chain, order: () => chain, limit: () => chain,
      insert: (v) => { calls.push(['insert', table, v]); return chain; },
      update: (v) => { calls.push(['update', table, v]); return chain; },
      single: () => Promise.resolve({ data: { result: { status: 'over', warnings: ['7 children need 2 staff here; 1 counted.'] } }, error: null }),
      then: (f, r) => Promise.resolve({ data: tables[table] || [], error: null }).then(f, r) };
    return chain;
  };
  const RPC = { compliance_due: DUE, compliance_eligible_alone: ELIG, compliance_binder: BINDER, compliance_ratio_live: LIVE,
    compliance_ratio_check: { status: 'ok', required_staff: 1, max_group: 12, row: { label: 'Toddlers', ratio: '1:6', citation: 'K.A.R. 28-4-428(a)(2)' }, warnings: [], alternatives: [] },
    incident_acknowledge: { id: 'i9' }, director_exceptions: EXC, staff_clearance_list: ACCESS_ROWS, ops_exception_act: { ok: true, message: 'ok' },
    staff_clearance_hold: { access: 'on_hold' }, staff_clearance_release: { access: 'classroom' } };
  const client = { from: q, rpc: (fn, args) => { calls.push(['rpc', fn, args]); return Promise.resolve({ data: RPC[fn], error: null }); } };
  let renders = 0;
  const ctx = { hub, role, center: { id: 'c1', name: 'TEST North' }, room: 'tods', rooms: { tods: { name: 'Toddlers <T>', order: 1 } },
    kids: { k1: { first: 'Ada', last: 'L', room: 'tods' } }, fam: fam ? { kid: fam } : {} };
  const window = { FFHub: { configured: true, connected: hub, client: () => client }, FFPortal: { ctx: () => ctx, rerender: () => { renders++; } },
    addEventListener() {},
    open: () => { const doc = { html: '', readyState: 'complete', write(h) { this.html += h; calls.push(['popup-write', h]); }, close() {} };
      return { document: doc, focus() {}, print() { calls.push(['print']); }, addEventListener() {} }; } };
  const document = { addEventListener: (ev, f) => { (listeners[ev] = listeners[ev] || []).push(f); }, querySelector: () => null,
    getElementById: (id) => id === 'ddBinder' ? { outerHTML: '<article class="dd-binder" id="ddBinder">BINDER</article>' } : null,
    body: { classList: { add: (c) => calls.push(['bodyclass', c]), remove() {} } } };
  const context = vm.createContext({ window, document, console, setTimeout, Promise, location: { href: 'http://127.0.0.1:9/index.html#portal' }, FormData: class { constructor(f) { this.f = f; } entries() { return Object.entries(this.f.values); } getAll(k) { return this.f.all[k] || []; } },
    esc: s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])) });
  vm.runInContext('var V = { portal: () => "P", "family-portal": () => ' + JSON.stringify(FAM_BASE) + ' };', context);
  vm.runInContext(read('director-due.js'), context, { filename: 'director-due.js' });
  const settle = async () => { for (let i = 0; i < 4; i++) await new Promise(r => setImmediate(r)); };
  const click = (data) => listeners.click.forEach(f => f({ target: { closest: sel => sel === '[data-dd]' ? { dataset: data } : null } }));
  const submit = (dataset, values, all = {}) => listeners.submit.forEach(f => f({ preventDefault() {}, target: { closest: () => ({ dataset, values, all }) } }));
  const FF = () => context.window.FFDue;
  return { FF, ctx, settle, click, submit, calls, renders: () => renders, fam: () => vm.runInContext('V["family-portal"]()', context) };
}
const plain = x => JSON.parse(JSON.stringify(x));   // objects from the vm realm
const text = h => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

test('loads after portal.js: index.html links the script and the stylesheet; portal.js asks for the tabs in hub mode only', () => {
  const html = read('index.html');
  assert.ok(html.indexOf('director-due.js') > html.indexOf('portal.js'), 'after portal.js');
  assert.match(html, /<link rel="stylesheet" href="director-due\.css\?v=\d+">/);
  assert.match(read('portal.js'), /if \(window\.FFDue && P\.hub\) window\.FFDue\.addTabs\(tabs, P\.role\)/);
  assert.match(read('portal.js'), /due:\(\)=>window\.FFDue\.dueView\(rhythmCtx\(\)\), safety:\(\)=>window\.FFDue\.safetyView\(rhythmCtx\(\)\)/);
});

test('tabs: the director gets "What’s due" and "Safety logs", a teacher only "Safety logs", sample mode nothing; the family portal is untouched without a hub', () => {
  const tabs = [['today', 'Today'], ['setup', 'Setup']];
  site().FF().addTabs(tabs, 'director');
  assert.deepEqual(tabs.map(t => t[0]), ['today', 'due', 'setup', 'safety']);
  const t2 = [['today', 'Today']]; site({ role: 'teacher' }).FF().addTabs(t2, 'teacher');
  assert.deepEqual(t2.map(t => t[0]), ['today', 'safety']);
  const t3 = [['today', 'Today']]; const off = site({ hub: false }); off.FF().addTabs(t3, 'director');
  assert.deepEqual(t3.map(t => t[0]), ['today']);
  assert.equal(off.fam(), FAM_BASE);
});

test('What’s due: every bucket, each item with its source citation, names escaped, child health records "kept in your own records"', async () => {
  const s = site();
  s.FF().dueView(s.ctx); await s.settle();
  assert.deepEqual(s.calls.filter(c => c[0] === 'rpc').map(c => c[1]).sort(), ['compliance_due', 'compliance_eligible_alone', 'director_exceptions', 'staff_clearance_list']);
  const h = s.FF().dueView(s.ctx), tx = text(h);
  for (const l of ['Overdue', 'Due in 7 days', 'Due in 30 days', 'Due in 90 days', 'Needs information', 'Kept in your own records']) assert.ok(tx.includes(l), l);
  for (const it of DUE) assert.ok(h.includes(`<b>Source:</b> ${it.citation.replace(/&/g, '&amp;')}`), it.citation);
  assert.match(tx, /5 days late/); assert.match(tx, /Due today/);
  assert.match(h, /Tia &lt;Teacher&gt;/); assert.doesNotMatch(h, /<Teacher>|undefined|NaN|\[object Object\]/);
  assert.match(h, /Needs confirmation/);
  assert.match(tx, /The Futures Hub stores no child health information/);
  assert.match(tx, /Who can be left alone with children/); assert.match(tx, /Missing: Cleared background check before working/);
  assert.match(h, /data-dd="drill" data-type="fire"/);
  assert.match(h, /data-dd="inc-step" data-id="i1" data-step="state">Mark reported to the state/);
  assert.equal(site({ role: 'teacher' }).FF().dueView({ ...s.ctx, role: 'teacher' }).includes('Only the center director'), true);
});

test('Log it: a record goes to compliance_records for that person and requirement; an incident step updates the report', async () => {
  const s = site();
  s.FF().dueView(s.ctx); await s.settle();
  s.click({ dd: 'open', i: '1' });
  assert.match(s.FF().dueView(s.ctx), /data-dd-form="record" data-i="1"/);
  s.submit({ ddForm: 'record', i: '1' }, { completed_on: '2026-10-04', expires_on: '', note: ' card #1 ' });
  await s.settle();
  assert.deepEqual(plain(s.calls.find(c => c[0] === 'insert')), ['insert', 'compliance_records',
    { center_id: 'c1', user_id: 'u1', requirement_id: 'KS-CTR-ORIENTATION-STAFF', completed_on: '2026-10-04', expires_on: null, note: 'card #1' }]);
  s.click({ dd: 'inc-step', id: 'i1', step: 'state' }); await s.settle();
  const up = s.calls.find(c => c[0] === 'update');
  assert.equal(up[1], 'incident_reports'); assert.ok(up[2].state_reported_at);
});

test('the inspection binder: table of contents with citations, month grid, no child named, print', async () => {
  const s = site();
  s.FF().dueView(s.ctx); await s.settle();
  s.click({ dd: 'binder' }); s.FF().dueView(s.ctx); await s.settle();
  const h = s.FF().dueView(s.ctx), tx = text(h);
  assert.match(h, /id="ddBinder"/); assert.match(h, /TEST &lt;North&gt;/);
  assert.match(tx, /Contents/); assert.match(tx, /K\.A\.R\. 28-4-128\(a\)\(6\)\(A\)/);
  assert.match(tx, /2026-09 2026-10 Logged This month/);
  assert.match(tx, /Missing child/); assert.match(tx, /Due Oct 5, 2026/); assert.match(tx, /2:05/);
  assert.match(tx, /Children are not named in this binder/);
  assert.match(tx, /Kept in your own records \(not in the Hub\)/);
  s.click({ dd: 'print' });
  const w = s.calls.find(c => c[0] === 'popup-write');
  assert.ok(w, 'the binder opens in its own window');
  assert.match(w[1], /<link rel="stylesheet" href="http:\/\/127\.0\.0\.1:9\/director-due\.css\?v=\d+">/);
  assert.match(w[1], /<body><article class="dd-binder" id="ddBinder">BINDER<\/article><\/body>/);
  assert.match(w[1], /<title>Inspection binder: TEST &lt;North&gt;<\/title>/);
  await new Promise(r => setTimeout(r, 350));
  assert.ok(s.calls.some(c => c[0] === 'print'), 'and prints');
});

test('Safety logs: live ratio per room with the cited row; a logged check sends only the room, staff and counts (the result is computed in the database)', async () => {
  const s = site({ role: 'teacher' });
  s.FF().safetyView(s.ctx); await s.settle();
  const h = s.FF().safetyView(s.ctx), tx = text(h);
  assert.match(tx, /Needs 2 staff · 1:6 Toddlers/); assert.match(tx, /K\.A\.R\. 28-4-428\(a\)\(2\)/); assert.match(tx, /never blocks anything/);
  s.submit({ ddForm: 'ratio', room: 'tods', group: 'toddler', n: '7' }, { staff: '1' }); await s.settle();
  assert.deepEqual(plain(s.calls.find(c => c[0] === 'insert')), ['insert', 'ratio_checks', { center_id: 'c1', room: 'tods', staff_count: 1, children: { toddler: 7 } }]);
  assert.match(text(s.FF().safetyView(s.ctx)), /Over ratio or group size \(warning only\)/);
});

test('drills and incidents: the drill form saves the cited fields; an injury without a child is refused before anything is sent', async () => {
  const s = site({ role: 'teacher' });
  s.FF().safetyView(s.ctx); await s.settle();
  s.click({ dd: 'sub', sub: 'drills' });
  assert.match(s.FF().safetyView(s.ctx), /data-dd-form="drill"/);
  s.submit({ ddForm: 'drill' }, { drill_type: 'fire', held_at: '2026-10-05T09:30', evac_min: '2', evac_sec: '5', children_count: '12', staff_count: '3', alarm_activated: 'on', issues: '' }, { rooms: ['tods'] });
  await s.settle();
  const d = s.calls.find(c => c[0] === 'insert' && c[1] === 'drill_logs')[2];
  assert.equal(d.evacuation_seconds, 125); assert.deepEqual(plain(d.rooms), ['tods']); assert.equal(d.alarm_activated, true); assert.equal(d.children_count, 12);
  s.click({ dd: 'sub', sub: 'incidents' });
  const h = s.FF().safetyView(s.ctx);
  assert.match(text(h), /Do not record a diagnosis/);
  assert.match(h, /Missing child/);
  s.submit({ ddForm: 'incident' }, { kind: 'injury', what_happened: 'fell', kid: '', occurred_at: '2026-10-05T09:00' });
  await s.settle();
  assert.equal(s.calls.filter(c => c[0] === 'insert' && c[1] === 'incident_reports').length, 0);
  assert.match(s.FF().safetyView(s.ctx), /Choose the child/);
  s.submit({ ddForm: 'incident' }, { kind: 'injury', what_happened: ' fell ', kid: 'k1', room: 'tods', occurred_at: '2026-10-05T09:00', first_aid: 'cold pack', notified: 'on', notify_method: 'phone' });
  await s.settle();
  const inc = s.calls.find(c => c[0] === 'insert' && c[1] === 'incident_reports')[2];
  assert.equal(inc.kid, 'k1'); assert.equal(inc.what_happened, 'fell'); assert.equal(inc.critical_type, null); assert.equal(inc.notify_method, 'phone'); assert.ok(inc.parent_notified_at);
});

test('family portal: incident reports about the family’s own child, escaped, and "I have read this" calls incident_acknowledge', async () => {
  const s = site({ role: 'family', fam: 'k1' });
  assert.equal(s.fam(), FAM_BASE, 'first render: loading');
  await s.settle();
  const h = s.fam();
  assert.ok(h.includes('<div class="wrap" style="display:grid;gap:16px"><section class="dd-fam"'), 'panel at the top of the family body');
  assert.match(h, /Bumped &lt;head&gt; on shelf/); assert.match(h, /1 to read/);
  s.submit({ ddForm: 'ack', id: 'i9' }, { name: '' }); await s.settle();
  assert.equal(s.calls.filter(c => c[1] === 'incident_acknowledge').length, 0);
  s.submit({ ddForm: 'ack', id: 'i9' }, { name: ' Pat Parent ' }); await s.settle();
  assert.deepEqual(plain(s.calls.find(c => c[1] === 'incident_acknowledge')), ['rpc', 'incident_acknowledge', { p_incident: 'i9', p_name: 'Pat Parent' }]);
});

test('R6 exception queue on What\u2019s due: every item shows owner, reason, due date, next action, source and retry / escalate', async () => {
  const s = site();
  s.FF().dueView(s.ctx); await s.settle();
  const h = s.FF().dueView(s.ctx), tx = text(h);
  assert.match(h, /id="ddExc"/);
  assert.ok(h.indexOf('id="ddExc"') < h.indexOf('aria-label="Overdue"'), 'the queue comes before the due buckets');
  assert.match(tx, /Needs action now 4/);
  for (const it of EXC) {
    const li = h.slice(h.indexOf(`data-key="${it.key}"`), h.indexOf('</li>', h.indexOf(`data-key="${it.key}"`)));
    assert.ok(li, it.key);
    assert.match(li, /<b>Why:<\/b>/); assert.match(li, /<b>Next:<\/b>/); assert.match(li, /<b>Source:<\/b>/);
    assert.match(text(li), /You \(director\)|Futures Friends HQ|Staff member/);
    assert.ok(/data-dd="exc-retry"|data-dd="exc-esc"|Escalated to HQ/.test(li), `${it.key} has retry, escalate or is escalated`);
  }
  assert.match(h, /550 &lt;mailbox&gt; unavailable/); assert.doesNotMatch(h, /<mailbox>|undefined|\[object Object\]/);
  assert.match(h, /data-dd="exc-retry" data-key="ops:1"/);
  assert.doesNotMatch(h, /data-dd="exc-retry" data-key="clearance/, 'no retry where a retry would do nothing');
  assert.match(tx, /Escalated to HQ/);
  assert.match(tx, /CRM record #CJobApplication\/view\/a9/, 'without a CRM address configured the record is named');
  assert.match(h, /href="#ddAccess"/); assert.match(h, /data-go="learn-team"/);
});

test('R6 queue actions: retry and escalate (with a note) call ops_exception_act for this center and reload the queue', async () => {
  const s = site();
  s.FF().dueView(s.ctx); await s.settle();
  s.click({ dd: 'exc-retry', key: 'ops:1' }); await s.settle();
  assert.deepEqual(plain(s.calls.filter(c => c[1] === 'ops_exception_act').pop()), ['rpc', 'ops_exception_act', { p_center: 'c1', p_key: 'ops:1', p_action: 'retry' }]);
  s.FF().dueView(s.ctx); await s.settle();
  s.click({ dd: 'exc-esc', key: 'training:e1' });
  assert.match(s.FF().dueView(s.ctx), /data-dd-form="exc-esc" data-key="training:e1"/);
  s.submit({ ddForm: 'exc-esc', key: 'training:e1' }, { note: ' call Tia ' }); await s.settle();
  assert.deepEqual(plain(s.calls.filter(c => c[1] === 'ops_exception_act').pop()), ['rpc', 'ops_exception_act', { p_center: 'c1', p_key: 'training:e1', p_action: 'escalate', p_note: 'call Tia' }]);
  assert.ok(s.calls.filter(c => c[1] === 'director_exceptions').length >= 2, 'reloaded after the action');
});

test('R6 classroom access: training-only staff with what is missing (cited); hold, release and record a check result', async () => {
  const s = site();
  s.FF().dueView(s.ctx); await s.settle();
  const h = s.FF().dueView(s.ctx), tx = text(h);
  assert.match(h, /id="ddAccess"/);
  assert.match(tx, /Training only: checks pending/); assert.match(tx, /Classroom/); assert.match(tx, /On hold/);
  assert.match(tx, /Missing: Background check cleared by KOEC/); assert.match(h, /K\.A\.R\. 28-4-125\(a\)/);
  assert.match(tx, /Checks valid until Jan 1, 2030/);
  assert.match(h, /Tia &lt;Teacher&gt;/);
  s.click({ dd: 'clr-hold', user: 'u2' });
  s.submit({ ddForm: 'hold', user: 'u2' }, { reason: '' }); await s.settle();
  assert.equal(s.calls.filter(c => c[1] === 'staff_clearance_hold').length, 0, 'a hold needs a reason');
  s.submit({ ddForm: 'hold', user: 'u2' }, { reason: ' review ' }); await s.settle();
  assert.deepEqual(plain(s.calls.filter(c => c[1] === 'staff_clearance_hold').pop()), ['rpc', 'staff_clearance_hold', { p_center: 'c1', p_user: 'u2', p_reason: 'review' }]);
  s.click({ dd: 'clr-release', user: 'u3' }); await s.settle();
  assert.deepEqual(plain(s.calls.filter(c => c[1] === 'staff_clearance_release').pop()), ['rpc', 'staff_clearance_release', { p_center: 'c1', p_user: 'u3' }]);
  s.FF().dueView(s.ctx); await s.settle();
  s.click({ dd: 'clr-log', user: 'u1' });
  assert.match(s.FF().dueView(s.ctx), /data-dd-form="clr-record" data-user="u1" data-req="KS-ALL-BGC-BEFORE-WORK"/);
  s.submit({ ddForm: 'clr-record', user: 'u1', req: 'KS-ALL-BGC-BEFORE-WORK' }, { completed_on: '2026-10-02', expires_on: '', note: '' }); await s.settle();
  assert.deepEqual(plain(s.calls.filter(c => c[0] === 'insert').pop()), ['insert', 'compliance_records',
    { center_id: 'c1', user_id: 'u1', requirement_id: 'KS-ALL-BGC-BEFORE-WORK', completed_on: '2026-10-02', expires_on: null, note: null }]);
});

