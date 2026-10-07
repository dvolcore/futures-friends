// W3D content approval console (approve.js, approve.css) and the Unit 1 "Prep ahead this week" list on the teacher Today view
// (prep-ahead.js + generated unit1-prep.js). The console runs here in a sandbox against a fake hub client; the database rules
// (only reviewers of record at AAL2, frozen approved versions, all-or-nothing days, the two-person rule) are tested in the hub
// repo: hub/tests/content-approval.test.mjs, and in a real browser by hub/tests/content-approval-browser.test.mjs.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const P = require('./private-curriculum');   // unit1-prep.js is licensed curriculum: private repo since the IP lockdown (2026-10-07)
const PREP_SKIP = P.skipUnless('unit1-prep.js');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const visible = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');

test('index.html loads the new files in order, cache-busted, and re-versions every edited file', () => {
  const index = read('index.html'), at = (f) => index.indexOf(f), v = (f) => +(new RegExp(`${f.replace('.', '\\.')}\\?v=(\\d+)`).exec(index) || [])[1];
  assert.ok(at('academy-lms-author.js') < at('approve.js') && at('approve.js') < at('not-found.js'), 'approve.js after the LMS, before not-found.js');
  assert.ok(at('program-record.js') < at('prep-ahead.js') && at('portal.js') < at('prep-ahead.js'));
  assert.ok(at('approve.css') > 0);
  for (const f of ['approve.js', 'approve.css', 'prep-ahead.js']) assert.ok(v(f) >= 1, f);
  assert.ok(v('academy-lms.js') >= 7 && v('academy-lms-author.js') >= 5 && v('portal.js') >= 21 && v('route-meta.js') >= 11 && v('analytics.js') >= 2);
  for (const f of ['approve.js', 'prep-ahead.js']) new Function(read(f));
  assert.ok(!fs.existsSync(path.join(ROOT, 'unit1-prep.js')), 'the prep data is not in the public site');
});

test('the console is an Academy tab for HQ only; main navigation is unchanged; the route is not tracked', () => {
  assert.match(read('academy-lms.js'), /L\.isHQ && V\['learn-approve'\]\) t\.push\(\['learn-approve','Content approval'\]\)/);
  assert.doesNotMatch(read('premium.js'), /learn-approve/);
  assert.match(read('analytics.js'), /'learn-approve'/);
  assert.match(read('route-meta.js'), /'learn-approve': \['Content approval/);
});

test('no reviewer is named in public site files (the reviewers of record are internal names; the console reads them from the hub)', () => {
  for (const f of ['approve.js', 'approve.css', 'prep-ahead.js']) assert.doesNotMatch(read(f), /Melissa|Tracy|Hill\b|Tormes/, f);
  if (P.has('unit1-prep.js')) assert.doesNotMatch(P.readPriv('unit1-prep.js'), /Melissa|Tracy|Hill\b|Tormes/, 'unit1-prep.js (private)');
});

// ---------------------------------------------------------------- the console in a sandbox
const REC = (o) => Object.assign({ id: 'u1-w2-d1-circle', release: 'unit-1', version: 1, status: 'draft', date_offset: { week: 2, day: 1 }, theme: 'Meet Lumi',
  block: 'circle', character: 'lumi', pillars: ['BELONG'], objective: 'Children greet a friend their own way.', learning_steps: ['two-se-1'],
  age_adaptations: { twos: 'TWOS wave hello.', threes: 'THREES pick a greeting.', prek: 'PREK greet two friends.' }, duration_min_estimate: 15,
  materials: ['Greeting choice board (5 pictures)', 'Lumi puppet'], prompts: ['"Good morning, friends!"'], participation_alternatives: ['A child may wave.'],
  media: [{ type: 'puppet', ref: 'puppet:lumi', status: 'unavailable' }], kitchen_prompt: null,
  home_continuation: { title: 'Hello at home', steps: ['Wave at dinner.'], materials_from_home: [] }, sources: ['Curriculum p.40'] }, o);
const SHA = 'a'.repeat(64), SHA2 = 'b'.repeat(64);
function consoleSite({ canReview = true, me = 'me-1', approvals = [], twoPerson = false } = {}) {
  const handlers = {}, forms = {}, calls = [], toasts = [];
  const cur = REC({ version: 2, theme: 'Meet Lumi (revised)', materials: ['Greeting choice board (5 pictures)', 'Lumi puppet', 'Name cards'] });
  const queue = { releases: ['unit-1'], release: 'unit-1', requires_two: twoPerson, can_review: canReview, me, records: [
    { id: 'u1-w2-d1-circle', version: 2, status: 'draft', week: 2, day: 1, block: 'circle', theme: cur.theme, character: 'lumi', review_sha: SHA, previous_version: 1, approvals, change_request: null },
    { id: 'u1-w2-d1-story', version: 1, status: 'approved', week: 2, day: 1, block: 'story', theme: 'Meet Lumi', character: 'lumi', review_sha: SHA2, previous_version: null, approvals: [], change_request: null },
    { id: 'u1-w2-d2-circle', version: 1, status: 'draft', week: 2, day: 2, block: 'circle', theme: 'Big Feelings', character: 'lumi', review_sha: SHA2, previous_version: null, approvals: [],
      change_request: { name: 'Reviewer A', at: '2026-10-05T15:00:00Z', comment: 'Shorter prompt', on_this_text: true } }] };
  const day = [
    { id: 'u1-w2-d1-circle', version: 2, status: 'draft', block: 'circle', week: 2, day: 1, record: cur, review_sha: SHA, approvals,
      previous: { version: 1, status: 'approved', record: REC() }, reviews: [{ version: 1, decision: 'approve', name: 'Reviewer A', at: '2026-10-01T15:00:00Z', comment: null, on_this_text: false }] },
    { id: 'u1-w2-d1-story', version: 1, status: 'approved', block: 'story', week: 2, day: 1, record: REC({ id: 'u1-w2-d1-story', block: 'story' }), review_sha: SHA2, approvals: [],
      previous: null, reviews: [], approved_at: '2026-10-02T15:00:00Z' }];
  const sb = {
    rpc: async (fn, args) => { calls.push([fn, args]);
      if (fn === 'program_review_queue') return { data: queue, error: null };
      if (fn === 'program_review_day') return { data: day, error: null };
      if (fn === 'program_review_decide') return { data: { status: 'approved', approvals: 1, needed: 1 }, error: null };
      if (fn === 'training_sign_off') return { data: 'signoff-1', error: null };
      if (fn === 'program_review_approve_day') return { data: { approved: 1, awaiting_second: 0 }, error: null };
      if (fn === 'review_training_queue') return { data: { can_sign: canReview, me, courses: [{ id: 'c1', code: 'SR-120-MO', title: 'Safe Sleep', version: 1, track: 'state_required', series_id: 's1', clock_hours: 1.5, requires_two: true, needed: 2, life_safety: true, signatures: [], earlier_signoffs: 0, status: 'unreviewed' }] }, error: null };
      return { data: null, error: { message: `unexpected ${fn}` } }; },
    from: () => ({ select: async () => ({ data: [{ display_name: 'Reviewer A' }], error: null }) }),
  };
  const F = { L: { sb }, esc: (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    must: (r) => { if (r.error) throw new Error(r.error.message); return r.data; }, say: (m) => toasts.push(m), friendly: (e) => e.message,
    on: (n, f) => { handlers[n] = f; }, onForm: (n, f) => { forms[n] = f; }, rerender() {}, busy() {}, gate: () => null, shell: (r, t, s, b) => b };
  const c = { console, setTimeout: (f) => f(), V: {}, document: { addEventListener() {}, getElementById: () => null }, FFLMS: F, Intl, Date };
  c.window = c; vm.createContext(c);
  vm.runInContext(read('approve.js'), c, { filename: 'approve.js' });
  const render = () => c.V['learn-approve']();
  const settle = () => new Promise((r) => setImmediate(r));
  const node = (data) => ({ dataset: data });
  return { render, settle, handlers, forms, calls, toasts, node };
}

test('the queue: weeks and days with counts; opening a day shows every age version, materials, prompts, family and kitchen parts, and the diff', async () => {
  const s = consoleSite();
  s.render(); await s.settle();
  let html = s.render(), t = visible(html);
  assert.match(t, /Daily program: unit-1/);
  assert.match(t, /Week 2/);
  assert.match(t, /Day 6 Monday 1\/2 approved · 1 waiting/);
  assert.match(t, /Day 7 Tuesday 0\/1 approved · 1 sent back/);
  assert.match(t, /Approvers per record: one reviewer/);
  await s.handlers['ap-open'](s.node({ w: '2', d: '1' })); s.render(); await s.settle();
  html = s.render(); t = visible(html);
  assert.ok(s.calls.some(([fn, a]) => fn === 'program_review_day' && a.p_release === 'unit-1' && a.p_week === 2 && a.p_day === 1));
  for (const x of ['TWOS wave hello.', 'THREES pick a greeting.', 'PREK greet two friends.', 'Greeting choice board (5 pictures)', '"Good morning, friends!"',
    'A child may wave.', 'Family continuation: "Hello at home"', 'Wave at dinner.', 'Kitchen prompt: none', 'Not produced yet']) assert.ok(t.includes(x), x);
  assert.match(html, /What changed since version 1 \(approved\)/);
  assert.match(html, /<del>Meet Lumi<\/del> <ins>Meet Lumi \(revised\)<\/ins>/);
  assert.match(html, /<li><ins>Name cards<\/ins><\/li>/);
  assert.match(t, /Approved versions never change; a correction is loaded as a new version/);
  assert.match(t, /Approve whole day \(1\)/);
  assert.match(html, /data-lms="ap-approve" data-id="u1-w2-d1-circle" data-v="2" data-sha="a{64}"/);
});

test('approve one record, approve the whole day (after a confirm), and send one back with a comment: each calls the hub with the text hash', async () => {
  const s = consoleSite();
  s.render(); await s.settle();
  await s.handlers['ap-open'](s.node({ w: '2', d: '1' })); s.render(); await s.settle(); s.render();
  await s.handlers['ap-approve'](s.node({ id: 'u1-w2-d1-circle', v: '2', sha: SHA }));
  assert.deepEqual(JSON.parse(JSON.stringify(s.calls.find(([fn]) => fn === 'program_review_decide')[1])),
    { p_id: 'u1-w2-d1-circle', p_version: 2, p_sha: SHA, p_decision: 'approve' });
  await s.settle(); s.render(); await s.handlers['ap-open'](s.node({ w: '2', d: '1' })); s.render(); await s.settle(); s.render();
  s.handlers['ap-day-ask']();
  assert.match(visible(s.render()), /Approve all 1 waiting records on Day 6 as you see them now\? Yes, approve the whole day/);
  await s.handlers['ap-day'](s.node({}));
  assert.deepEqual(JSON.parse(JSON.stringify(s.calls.find(([fn]) => fn === 'program_review_approve_day')[1])),
    { p_release: 'unit-1', p_week: 2, p_day: 1, p_expected: { 'u1-w2-d1-circle': SHA } }, 'only the waiting records, each with the hash the reviewer saw');
  const f = { dataset: { id: 'u1-w2-d1-circle', v: '2', sha: SHA }, elements: { comment: { value: '  ', focus() {} } } };
  await s.forms['ap-changes'](f);
  assert.ok(!s.calls.some(([fn, a]) => fn === 'program_review_decide' && a.p_decision === 'request_changes'), 'an empty comment is not sent');
  f.elements.comment.value = 'Twos need a shorter prompt.';
  await s.forms['ap-changes'](f);
  assert.equal(s.calls.find(([fn, a]) => fn === 'program_review_decide' && a.p_decision === 'request_changes')[1].p_comment, 'Twos need a shorter prompt.');
  assert.match(s.toasts.join(' | '), /Sent back with your comment\. The record stays a draft\./);
});

test('someone who cannot decide reads the queue without buttons; a reviewer who already approved under the two-person rule waits for another', async () => {
  const ro = consoleSite({ canReview: false });
  ro.render(); await ro.settle(); await ro.handlers['ap-open'](ro.node({ w: '2', d: '1' })); ro.render(); await ro.settle();
  let html = ro.render();
  assert.doesNotMatch(html, /data-lms="ap-approve"|data-lms="ap-day-ask"/);
  assert.match(visible(html), /Only a reviewer of record, signed in with two-step verification, can approve/);
  assert.doesNotMatch(html, /data-lms="ap-rule"/, 'only a reviewer of record can change the approval rule');
  const two = consoleSite({ twoPerson: true, approvals: [{ reviewer_id: 'me-1', name: 'Reviewer A', at: '2026-10-05T15:00:00Z' }] });
  two.render(); await two.settle(); await two.handlers['ap-open'](two.node({ w: '2', d: '1' })); two.render(); await two.settle();
  html = two.render();
  assert.match(visible(html), /You approved this text\. A different reviewer must approve it too\./);
  assert.match(visible(html), /1 more needed/);
  assert.doesNotMatch(html, /data-lms="ap-approve"|data-lms="ap-day-ask"/, 'nothing left for this reviewer to approve on the day');
});

test('training tab: versions waiting for sign-off use the LMS v2 sign-off; life-safety needs two reviewers and has no "allow one" button', async () => {
  const s = consoleSite();
  s.render(); await s.settle();
  s.handlers['ap-tab'](s.node({ tab: 'training' })); s.render(); await s.settle();
  const html = s.render(), t = visible(html);
  assert.match(t, /SR-120-MO · Safe Sleep/);
  assert.match(t, /Life-safety: always two different reviewers/);
  assert.doesNotMatch(html, /Allow one reviewer/);
  await s.forms['ap-sign']({ dataset: { course: 'c1' }, elements: { attestation: { value: 'I reviewed every lesson and key of this exact version.' } } });
  assert.deepEqual(JSON.parse(JSON.stringify(s.calls.find(([fn]) => fn === 'training_sign_off')[1])), { p_course: 'c1', p_attestation: 'I reviewed every lesson and key of this exact version.' });
  assert.match(s.toasts.join(' | '), /Your sign-off is recorded/);
});

// ---------------------------------------------------------------- prep ahead on Today
// Wave 7 GATE + IP lockdown: the prep list is part of the licensed curriculum. The public site never loads it; prep-ahead.js draws it
// only when a hosted Hub supplies window.FFUnit1Prep in a staff session. These tests inject the PRIVATE data (tests/private-curriculum.js)
// with a mocked staff session; the last one checks that without a session nothing is drawn or loaded.
function prepSite({ staff = true } = {}) {
  const appended = [];
  const c = { console, window: null, document: { getElementById: () => null, head: { appendChild: el => appended.push(el) }, createElement: () => ({}) } };
  c.window = c; vm.createContext(c);
  if (staff) c.FFHub = { configured: true, connected: true, role: 'teacher' };
  c.appended = appended;
  vm.runInContext(read('curriculum-gate.js'), c, { filename: 'curriculum-gate.js' });
  if (P.has('unit1-prep.js')) vm.runInContext(P.readPriv('unit1-prep.js'), c, { filename: 'unit1-prep.js' });
  vm.runInContext(read('prep-ahead.js'), c, { filename: 'prep-ahead.js' });
  return c;
}
const pi = (week, day, release = 'unit-1') => ({ records: [{ id: `u1-w${week}-d${day}-circle`, release, week, day }] });

test('Today: Monday of week 2 lists the week\'s prep, marks what is made today, and says it is a draft list', { skip: PREP_SKIP }, () => {
  const c = prepSite(), t = visible(c.FFPrepAhead.today(pi(2, 1)));
  assert.match(t, /Prep ahead this week Draft list, not reviewed/);
  for (const x of ['Family photo wall', 'Bunny ears headbands', 'Calm bottles', 'Kindness chain and kindness cards', 'Picture-talk cards from Days 7 and 8']) assert.ok(t.includes(x), x);
  assert.match(t, /Bunny ears headbands Today: keep it when it is made From Day 6 \(Learning zones\) · used on Day 10 \(Movement\)/);
  const fri = visible(c.FFPrepAhead.today(pi(2, 5)));
  assert.match(fri, /Bunny ears headbands Used today/);
  assert.equal(c.FFPrepAhead.today(pi(2, 1, 'unit-2')), '', 'only Unit 1 has this list');
  assert.equal(c.FFPrepAhead.today({ records: [] }), '');
});

test('Today: week 4 after Day 18 drops the recipes (already used) but keeps the Day 20 picture-talk cards', { skip: PREP_SKIP }, () => {
  const c = prepSite(), t = visible(c.FFPrepAhead.today(pi(4, 4)));
  assert.doesNotMatch(t, /Family recipes From/);
  assert.match(t, /Picture-talk cards from Days 3, 7, 14 and 17/);
  assert.match(t, /1 earlier item this week already used/);
});

test('Today without a staff session (preview, family): no prep list is drawn and the prep data is never requested', () => {
  const c = prepSite({ staff: false });
  assert.equal(c.FFPrepAhead.today(pi(2, 1)), '');
  vm.runInContext('delete window.FFUnit1Prep;', c);
  assert.equal(c.FFPrepAhead.today(pi(2, 1)), '');
  assert.equal(c.appended.filter(el => el.src).length, 0, 'unit1-prep.js is not requested');
});

test('unit1-prep.js (private) is generated from the hub list (checked when the FFCRM repo is on this machine)', { skip: (!fs.existsSync('/Volumes/FFCRM/app/hub/content/program/unit-1-prep-ahead.json') && 'FFCRM records not here') || PREP_SKIP }, () => {
  const src = fs.readFileSync('/Volumes/FFCRM/app/hub/content/program/unit-1-prep-ahead.json');
  const c = prepSite();
  assert.equal(c.FFUnit1Prep.source_sha256, require('node:crypto').createHash('sha256').update(src).digest('hex'), 'run python3 tools/make-unit1-packets.py');
  const j = JSON.parse(src);
  assert.deepEqual(JSON.parse(JSON.stringify(c.FFUnit1Prep.weeks.map((w) => w.items.map((i) => i.item)))), j.weeks.map((w) => w.items.map((i) => i.item)));
});
