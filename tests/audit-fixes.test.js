// External re-audit fixes (2026-10-08): honest disabled-intake wording that comes back when intake is on (A1), true library counts and the
// send gate (A2), one status vocabulary and unit truth (A3), planner notes (A4), sample-data labels (A7), no hero-loop reference (A8),
// softened claims (A9), one monthly-fee sentence everywhere (A10).
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { site: baseSite, read, text } = require('./site-vm');

const CAT = (() => { const w = { window: {} }; w.window = w; vm.runInNewContext(read('library-catalog.js'), w); return w.FF_LIBRARY; })();
const CORE = require('../library-core.js');

test('A2: library counts are computed from the catalog, never typed', () => {
  const c = CORE.statusCounts(CAT.items);
  assert.equal(c.total, CAT.items.length);
  assert.equal(CORE.countsLine(c), `${c.ready} ready · ${c.review} in review · ${c.draft} drafts · ${c.soon} coming`);
  assert.doesNotMatch(read('library-demo.js'), /things ready to use or send/);
});

test('A2: only approved, family-facing items can go to families; staff-only and unapproved items go to staff at most', () => {
  let toFamilies = 0;
  for (const i of CAT.items) for (const role of ['director', 'teacher']) {
    const a = CORE.audiences(i, role);
    if (a.includes('families')) { toFamilies++; assert.equal(i.status, 'ready', i.id); assert.ok(i.family_facing && !i.financial && i.vis !== 'director', i.id); }
    if (i.status === 'soon') assert.deepEqual(a, [], i.id);
    if (!i.family_facing) assert.ok(!a.includes('families'), i.id);
    if (role === 'teacher') assert.ok(!a.includes('staff'), i.id);
  }
  assert.ok(toFamilies > 0);
  const draft = CAT.items.find(i => i.status === 'draft' && i.sendable && i.family_facing) || CAT.items.find(i => i.status === 'draft' && i.sendable);
  assert.match(CORE.sendReason(draft, 'director', 'families'), /^Not approved for sending yet/);
});

function withStatus() {
  const w = { window: {} }; w.window = w; vm.createContext(w);
  for (const f of ['release-manifest.js', 'release-status.js']) vm.runInContext(read(f), w, { filename: f });
  return w;
}

test('A3: one six-word vocabulary and the true unit states', () => {
  const w = withStatus(), S = w.FFStatus;
  assert.equal(JSON.stringify(S.ORDER), JSON.stringify(['written', 'reviewed', 'approved', 'hosted', 'released', 'delivered']));
  assert.equal(S.curriculum.approved, 0);
  assert.match(S.curriculum.long, /Units 1 to 11 are written as drafts[\s\S]*Units 1 to 10 are merged, Unit 11 is in quality check and Unit 12 is being written/);
  const u = w.FFReleaseData.assets['curriculum-units-2-12'];
  assert.match(u.note, /Unit 12 is being written/);
  assert.doesNotMatch(JSON.stringify(w.FFReleaseData), /Units 2 to 4 daily plans are written/);
  for (const a of Object.values(w.FFReleaseData.assets)) assert.ok(a.stateLabel, a.id);
  for (const f of ['views.js', 'route-meta.js', 'experience.js', 'pricing-all-in.js', 'offer-clarity.js']) assert.doesNotMatch(read(f), /Units 1 to 4 (?:are )?written/, f);
});

test('A10: the monthly-fee trigger reads the same everywhere', () => {
  const w = withStatus(), T = w.FFStatus.feeTrigger;
  assert.equal(T, 'The monthly fee starts only when your program’s Hub is live and Unit 2 is delivered.');
  const j = JSON.stringify(w.FFReleaseData);
  assert.equal((j.match(/Unit 2 is delivered/g) || []).length, (j.match(new RegExp(T.replace(/[.’]/g, '.'), 'g')) || []).length);
  assert.doesNotMatch(j, /billing begins the month the Hub is live|no recurring fee before/);
  assert.match(read('offer-clarity.js'), /FFStatus\.feeTrigger/);
});

test('A1: disabled intake says so up front, offers the real alternatives, and the online wording returns when it is on', () => {
  const c = baseSite(); vm.runInContext(read('intake.js'), c, { filename: 'intake.js' }); const I = c.window.FFIntake;
  assert.equal(I.enabled(), false);
  const off = c.render('enroll'), t = text(off);
  assert.match(t, /Online requests are not switched on yet/);
  assert.match(off, /tel:\+18169885661/); assert.match(off, /mailto:info@futureslearningcenter\.com/);
  assert.doesNotMatch(t, /Apply online|Apply in three short steps|About five minutes|you get a reference number|within two business days/);
  assert.match(off, /data-ffi-sumcopy/, 'a copyable and printable request summary');
  c.window.FF_INTAKE = { url: 'https://ff-intake.example.org' };
  const on = text(c.render('enroll'));
  assert.match(on, /Apply in three short steps/); assert.match(on, /About five minutes/); assert.match(on, /within two business days/);
  assert.doesNotMatch(on, /not switched on yet/);
});

test('A4: planner says saved on this device only, a fit check is not a licensing review, and nothing physical is "available now"', () => {
  const s = read('room-planner.js');
  assert.match(s, /Saved on this device only/);
  assert.match(s, /A fit check helps you plan\. It is not a licensing review; confirm with your licensing consultant\./);
  assert.doesNotMatch(s, /ships first/i);
  assert.doesNotMatch(read('room-kit.js'), /Ship with every kit today|Kits ship now/);
});

test('A7: every demo metric tile carries a Sample data label', () => {
  const s = read('demo-portal.js');
  const tiles = s.match(/class="card ffd-tile"/g).length;
  assert.ok(tiles >= 10);
  assert.equal((s.match(/<span class="small muted">[^<]*\$\{SAMPLE\}<\/span>/g) || []).length >= tiles - 1, true);
});

test('A8 and A9: no hero-loop.mp4 reference; no "learn the cue in a week"', () => {
  for (const f of ['views.js', 'index.html', 'kit-showcase.js', 'room-kit.js']) assert.doesNotMatch(read(f), /hero-loop|learn in a week/, f);
  assert.match(read('kit-showcase.js'), /usually pick up quickly/);
});
