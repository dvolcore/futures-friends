// The licensed curriculum's DATA, checked where it now lives: the private platform repo (IP lockdown, owner decision 2026-10-07;
// tests/private-curriculum.js). These are the data assertions that used to sit in tests/unit-1.test.js, tests/units.test.js and
// tests/this-week.test.js, ported so the content keeps its coverage after it left the public site. The old staff views that rendered
// it (unit-1.js day viewer, units.js, the signed-in This Week) are no longer in the site; their code and their rendering tests are kept
// in the private repo (hub/content/curriculum-assets/web/) for when the hosted Futures Hub serves the curriculum.
// Every test is skipped, with the reason, on a machine where the private repo is not mounted.
const nodeTest = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const P = require('./private-curriculum');

const SITE = path.join(__dirname, '..');
const FFCRM = '/Volumes/FFCRM/app/hub/content/program';
// Units 2 to 4 are 4 weeks; Units 5 to 12 (180-day calendar) are 2 or 3. Every unit<n>-data.js present in the private store is checked.
const UNITS = (() => { try { return fs.readdirSync(path.join(P.PRIV, 'data')).map(f => /^unit(\d+)-data\.js$/.exec(f)).filter(Boolean).map(m => Number(m[1])).filter(n => n >= 2).sort((a, b) => a - b); } catch (_) { return [2, 3, 4]; } })();
const test = P.gated(nodeTest, 'unit1-data.js', 'unit1-family.js', 'unit1-prep.js', ...UNITS.map(n => `unit${n}-data.js`));
const load = (f, g) => { if (!P.has(f)) return null; const c = vm.createContext({ window: {} }); vm.runInContext(P.readPriv(f), c); return JSON.parse(JSON.stringify(c.window[g])); };
const DATA = load('unit1-data.js', 'FFUnit1Data'), FAM = load('unit1-family.js', 'FFUnit1Family');
const unit = n => { const d = load(`unit${n}-data.js`, 'FFUnitData'); return d && d[n]; };
const isPdf = rel => fs.readFileSync(P.filePath(rel)).subarray(0, 5).toString() === '%PDF-';
const canon = (manFile, files) => {
  const h = crypto.createHash('sha256').update(fs.readFileSync(path.join(FFCRM, manFile)));
  for (const f of files) h.update(fs.readFileSync(path.join(FFCRM, f)));
  return h.digest('hex');
};

// ---------------------------------------------------------------- Unit 1 (was tests/unit-1.test.js)
test('Unit 1 exact scope: 20 days and 161 activities, every status group counted from the data', () => {
  assert.equal(DATA.counts.days, 20);
  assert.equal(DATA.counts.activities, 161);
  assert.equal(DATA.days.reduce((a, d) => a + d.blocks.length, 0), 161);
  const counts = {};
  for (const a of Object.values(DATA.assets)) counts[a[2]] = (counts[a[2]] || 0) + 1;
  assert.deepEqual(counts, DATA.counts.assets);
});

test('Unit 1: nothing is approved; every record and every file says draft; minutes are estimates', () => {
  assert.equal(DATA.status, 'draft');
  for (const r of Object.values(DATA.detail).flat()) assert.equal(r.status, 'draft', r.id);
  for (const f of DATA.files) assert.equal(f.status, 'draft', f.path);
  assert.match(DATA.duration_note, /estimate/i);
});

test('Unit 1: every unproduced episode or asset has a print or puppet path; no file needs the internet', () => {
  for (const d of DATA.days) for (const b of d.blocks) {
    if (!b.media.some(m => m[1] === 'unavailable')) continue;
    assert.ok(b.media.some(m => m[1] !== 'unavailable' && /^(print|puppet):/.test(m[0])), b.id);
  }
  assert.doesNotMatch(JSON.stringify(DATA), /https?:\/\/|www\.|\bQR\b/);
});

test('Unit 1: every listed PDF and preview exists in the private store; sample days come from the documented seed', () => {
  assert.equal(DATA.files.filter(f => f.kind === 'day').length, 20);
  for (const f of DATA.files) {
    assert.ok(isPdf(f.path), f.path);
    assert.ok(f.pages >= 1, f.path);
    if (f.preview) assert.ok(fs.statSync(P.filePath(f.preview)).size > 1000, f.preview);
  }
  assert.equal(DATA.sample_days.length, 3);
  assert.equal(JSON.stringify(Object.keys(DATA.detail).map(Number).sort((a, b) => a - b)), JSON.stringify(DATA.sample_days));
  assert.match(fs.readFileSync(path.join(SITE, 'tools/make-unit1-packets.py'), 'utf8'), new RegExp(`SEED = ${DATA.sample_seed}`));
});

test('Unit 1: no retired pillar, tagline or food-benefit claim in the data', () => {
  const all = JSON.stringify(DATA) + JSON.stringify(FAM);
  for (const re of [/heart helper/i, /super sight/i, /sunny energy/i, /growing strong/i, /brain boost/i, /strong bones/i, /grow strong/i, /big hearts/i, /happy doer/i, /\bREAD\b/, /\bPLAY\b/, /\bQR\b/]) {
    assert.doesNotMatch(all, re, String(re));
  }
});

test('E6: every day has ONE Start Monday file that exists, 20 to 45 pages, plus its packet', () => {
  const bundles = DATA.files.filter(f => f.kind === 'bundle');
  assert.deepEqual(bundles.map(f => f.day), Array.from({ length: 20 }, (_, i) => i + 1));
  for (const d of DATA.days) {
    assert.equal(d.bundle.path, `printables/unit-1/start-monday/u1-day-${String(d.day).padStart(2, '0')}-start-monday.pdf`);
    assert.ok(isPdf(d.bundle.path), d.bundle.path);
    assert.ok(d.bundle.pages >= 20 && d.bundle.pages <= 45, `${d.bundle.path}: ${d.bundle.pages} pages`);
    assert.ok(isPdf(d.packet), d.packet);
  }
  assert.deepEqual(bundles.filter(f => f.preview).map(f => f.day), [1, 9]);
});

test('leverage 3 and E7: every block carries the four whole-child fields; each day has one deduplicated supply list', () => {
  for (const d of DATA.days) {
    for (const b of d.blocks) {
      assert.ok(Array.isArray(b.part) || typeof b.part === 'string', `${b.id}: participation choices`);
      assert.ok(b.move, `${b.id}: movement alternative`);
      assert.ok(b.family && b.family.activity, `${b.id}: family connection`);
    }
    const names = d.supplies.map(x => x[0]);
    assert.equal(new Set(names).size, names.length, `day ${d.day}: no item twice`);
    for (const [name, kind, , where] of d.supplies) if (kind === 'special') assert.match(where, /^If you do not have it: /, `${d.day}: ${name}`);
  }
  assert.equal(DATA.days[8].supplies.filter(x => /timer/i.test(x[0])).length, 1, 'Day 9: one visual timer');
});

test('Unit 1 data matches the canonical records and supply catalog (checked when the FFCRM records are here)', { skip: !fs.existsSync(path.join(FFCRM, 'unit-1-release.json')) && 'FFCRM records not here' }, () => {
  const man = JSON.parse(fs.readFileSync(path.join(FFCRM, 'unit-1-release.json'), 'utf8'));
  const want = canon('unit-1-release.json', man.record_files);
  assert.equal(DATA.source_sha256, want, 'run python3 tools/make-unit1-packets.py after changing the records');
  assert.equal(FAM.source_sha256, want);
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(FFCRM, 'unit-1-supplies.json'))).digest('hex'), DATA.supplies_sha256);
});

// ---------------------------------------------------------------- Unit 1 family weeks (was tests/this-week.test.js)
test('family weeks: the same activity id as the teacher plan, each one that day\'s family card, and every card file exists', () => {
  const acts = FAM.weeks.flatMap(w => w.activities);
  assert.equal(acts.length, 20);
  for (const a of acts) {
    const d = DATA.days[a.day - 1], good = d.blocks.find(b => b.block === 'goodbye');
    assert.equal(a.id, good.id);
    assert.equal(a.title, d.home.title);
    assert.deepEqual(a.steps, d.home.steps);
    for (const b of d.blocks) assert.equal(b.family.activity, a.id, `${b.id}: the teacher view names the same activity`);
    assert.ok(isPdf(a.card.path), a.card.path);
    if (a.story.kind === 'pdf') assert.ok(fs.existsSync(P.filePath(a.story.href)), a.story.href);
  }
  for (const w of FAM.weeks) assert.ok(isPdf(w.card), w.card);
});

test('family weeks: family words only (no health detail, no claim about a particular child, no internet path, no recording)', () => {
  const all = P.readPriv('unit1-family.js');
  assert.doesNotMatch(all, /\b(allerg\w*|medic\w*|diagnos\w*|therap\w*|disabilit\w*|IEP|IFSP)\b/i);
  assert.doesNotMatch(all, /your child (did|took part|learned)\b/i);
  assert.doesNotMatch(all, /https?:\/\/|\.mp3|\.m4a|\.wav/);
});

// ---------------------------------------------------------------- Units 2 to 4 (was tests/units.test.js)
for (const n of UNITS) {
  test(`Unit ${n}: 10 to 20 days (2 to 4 weeks), the full loop, three distinct age versions on every block, draft, and every file exists`, () => {
    const U = unit(n);
    assert.equal(U.n, n); assert.equal(U.status, 'draft'); assert.match(U.approval, /No content in this release has been approved/);
    assert.equal(U.days.length, U.weeks.length * 5); assert.equal(U.counts.days, U.days.length);
    assert.ok(n <= 4 ? U.weeks.length === 4 : [2, 3].includes(U.weeks.length), `Unit ${n}: weeks`);
    assert.equal(U.counts.activities, U.days.reduce((a, d) => a + d.blocks.length, 0));
    U.days.forEach((d, i) => {
      const b = d.blocks.map(x => x.block), fri = i % 5 === 4;
      for (const need of ['circle', fri ? 'friends-live' : 'picture-talk', 'move', 'zones', 'story', 'meal', 'goodbye']) assert.ok(b.includes(need), `day ${d.day}: ${need}`);
      assert.ok(b.includes('activity') || b.includes('outside'), `day ${d.day}: connected activity`);
      assert.equal(!!d.picture_talk, !fri, `day ${d.day}: picture-talk Monday to Thursday`);
      assert.ok(d.home.steps.some(s => /language you speak at home|home language/i.test(s)), `day ${d.day}: home-language step`);
      for (const x of d.blocks) {
        assert.deepEqual(Object.keys(x.age_adaptations), ['twos', 'threes', 'prek'], x.id);
        assert.notEqual(x.age_adaptations.prek, x.age_adaptations.threes, x.id);
      }
      assert.ok(isPdf(d.packet), d.packet);
    });
    for (const f of U.files) { assert.ok(isPdf(f.path), f.path); assert.ok(f.pages >= 1); assert.equal(f.status, 'draft'); }
    for (const [ref, a] of Object.entries(U.assets)) if (a[0] === 'video') assert.equal(a[2], 'unavailable', `${ref}: no episode exists`);
    assert.doesNotMatch(JSON.stringify(U), /https?:|www\.|\bQR\b/, 'no internet needed');
  });

  test(`Unit ${n}: the data was built from the canonical FFCRM records`, { skip: !fs.existsSync(path.join(FFCRM, `unit-${n}-release.json`)) && 'FFCRM records not here' }, () => {
    const man = JSON.parse(fs.readFileSync(path.join(FFCRM, `unit-${n}-release.json`), 'utf8'));
    assert.equal(unit(n).source_sha256, canon(`unit-${n}-release.json`, man.days.map(d => path.join(`unit-${n}`, `day-${String(d.day).padStart(2, '0')}.json`))),
      `rebuild: python3 tools/make-unit-packets.py --unit ${n}`);
  });
}

// ---------------------------------------------------------------- the private store itself
test('every file in the private manifest is present (sizes and sha256 are verified by the private repo\'s own check)', () => {
  const man = JSON.parse(fs.readFileSync(path.join(P.PRIV, 'manifest.json'), 'utf8'));
  assert.ok(man.entries.length >= 140);
  const missing = man.entries.filter(e => !fs.existsSync(path.join(P.PRIV, e.path))).map(e => e.path);
  assert.deepEqual(missing, []);
});
