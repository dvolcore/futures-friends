// IP lockdown (owner decision 2026-10-07: "I don't want to give away our full curriculum to our competitors"). The public site serves
// the curriculum overview, ONE watermarked sample day and family material; everything else (day plans, packets, Start Monday files,
// story sets, classroom printables, family-week cards, binder print file, unit data, the Learning Steps crosswalk, approved lesson
// records) lives in the private platform repo. This test fails the moment any of it comes back into the site tree, whatever its name:
//   1. a path denylist over every file in the site (tracked or not);
//   2. an allowlist for printables/: family take-homes, their Spanish versions and previews, the center marketing kit, the one sample;
//   3. content checks: no data file carrying lesson records, no Learning Steps text, no approved program records, no binder print file
//      or packet hiding under another name (size and page-count limits on every PDF outside the allowlist's known files);
//   4. the generators write to the private location, never the site.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const SKIP_DIRS = new Set(['.git', 'node_modules']);
function walk(dir = ROOT, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name), rel = path.relative(ROOT, p).split(path.sep).join('/');
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walk(p, out); }
    else out.push(rel);
  }
  return out;
}
const FILES = walk();
// what the site serves (tests, tools and vendored libraries are code, not content; their file NAMES are still checked above)
const SERVED = FILES.filter(f => !/^(tests|tools|vendor)\//.test(f));

// ---------------------------------------------------------------- 1. path denylist
const DENY = [
  /^printables\/unit-\d+\//,                          // any unit's printables folder
  /(^|\/)unit\d+-(data|prep|family)\.js$/,            // unit data files
  /(^|\/)curriculum-indicators\.js$/,                 // the full Learning Steps crosswalk
  /^units\.js$/,                                      // the staff unit picker that loaded unit data
  /start-monday/i, /teacher-packet/i, /classroom-printables/i, /binder-print/i, /family-week/i, /family-take-home-cards/i,
  /(^|\/)u\d+-story-[\w-]+\.pdf$/, /(^|\/)u\d+-day-\d+/,
];
const SAMPLE = 'printables/sample/ff-sample-u1-day-09-teacher-packet.pdf';

test('no curriculum file path exists anywhere in the site (denylist), except the one watermarked sample', () => {
  const hits = FILES.filter(f => f !== SAMPLE && DENY.some(re => re.test(f)));
  assert.deepEqual(hits, []);
});

// ---------------------------------------------------------------- 2. printables/ allowlist
const ALLOW = [
  /^printables\/futures-at-home-[\w-]+\.pdf$/,        // free family take-homes, incl. the starter pack (owner: keep public)
  /^printables\/es\/futures-en-casa-[\w-]+\.pdf$/,    // their Spanish drafts
  /^printables\/previews\/[\w-]+\.png$/,              // their preview images
  /^printables\/marketing\/[\w./-]+$/,                // the center marketing kit (flyer, checklist, cards, consent forms) and its sources
  new RegExp(`^${SAMPLE.replace(/[.]/g, '\\.')}$`),   // the one sample
];
test('printables/ holds only family take-homes, the marketing kit and the one sample', () => {
  const extra = FILES.filter(f => f.startsWith('printables/') && !ALLOW.some(re => re.test(f)));
  assert.deepEqual(extra, []);
  assert.deepEqual(FILES.filter(f => f.startsWith('printables/sample/')), [SAMPLE], 'exactly one sample file');
});

test('size and page limits: the sample is one day; no PDF anywhere in the site is a packet or bundle in disguise', () => {
  assert.ok(fs.statSync(path.join(ROOT, SAMPLE)).size < 1.5e6, 'the sample is one small day packet');
  const pdfs = SERVED.filter(f => f.endsWith('.pdf'));
  const total = pdfs.reduce((a, f) => a + fs.statSync(path.join(ROOT, f)).size, 0);
  assert.ok(total < 25e6, `all public PDFs together stay small (${(total / 1e6).toFixed(1)} MB); the curriculum was ~100 MB`);
  for (const f of pdfs) {
    const s = fs.readFileSync(path.join(ROOT, f), 'latin1');
    if (f === SAMPLE) continue;                       // the one sample is cut from a generated packet on purpose
    assert.ok(!/tools\/make-unit1?-packets\.py|tools\/make-curriculum-package\.py/.test(s), `${f} was made by a curriculum generator`);
    assert.ok(!/Teacher packet|Start Monday|Classroom printables|Story set/.test(s), `${f} reads like curriculum`);
  }
  // the sample is watermarked: tests/w7-gate.test.js reads every page
});

// ---------------------------------------------------------------- 3. content checks
test('no site data file carries lesson records, unit data or the Learning Steps', () => {
  const js = SERVED.filter(f => f.endsWith('.js') || f.endsWith('.json'));
  for (const f of js) {
    const s = fs.readFileSync(path.join(ROOT, f), 'utf8');
    assert.doesNotMatch(s, /window\.(FFUnit1Data|FFUnitData|FFUnit1Family|FFUnit1Prep)\s*=/, `${f}: unit data`);
    assert.ok((s.match(/"age_adaptations":\s*\{/g) || []).length === 0, `${f}: lesson records (age adaptations)`);
    assert.ok((s.match(/"prompts":\s*\[/g) || []).length === 0, `${f}: lesson records (teacher prompts)`);
  }
  const steps = (() => { const c = { window: {} }; vm.createContext(c); vm.runInContext(fs.readFileSync(path.join(ROOT, 'learning-steps-summary.js'), 'utf8'), c); return c.window.FFSteps; })();
  assert.equal(steps.steps.length, 0, 'the public Learning Steps file is a summary');
  const prog = (() => { const c = { window: {} }; vm.createContext(c); vm.runInContext(fs.readFileSync(path.join(ROOT, 'program-data.js'), 'utf8'), c); return c.window.FF_PROGRAM; })();
  assert.equal(prog.records.length, 0, 'no approved lesson record is published (hub/scripts/load-program.mjs --site writes none)');
});

test('index.html and robots.txt name no curriculum file', () => {
  const s = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8') + fs.readFileSync(path.join(ROOT, 'robots.txt'), 'utf8');
  assert.doesNotMatch(s, /unit\d-(data|prep|family)\.js|curriculum-indicators\.js|units\.js|printables\/unit-/);
});

// ---------------------------------------------------------------- 4. the generators write privately
test('the curriculum generators write to the private location (tools/private_paths.py), never the site tree', () => {
  const pp = fs.readFileSync(path.join(ROOT, 'tools/private_paths.py'), 'utf8');
  assert.match(pp, /FF_CURRICULUM_PRIVATE/);
  assert.match(pp, /inside the public site: refusing/);
  for (const f of ['make-unit1-packets.py', 'make-unit-packets.py', 'make-curriculum-package.py']) {
    const s = fs.readFileSync(path.join(ROOT, 'tools', f), 'utf8');
    assert.match(s, /import private_paths as PP/, f);
    assert.match(s, /PP\.check\(\)/, `${f} refuses to run without the private location`);
    assert.doesNotMatch(s, /os\.path\.join\(ROOT, 'printables', (f?'unit|'unit)/, `${f}: no printables/unit-* output under the site`);
    assert.doesNotMatch(s, /open\(os\.path\.join\(ROOT, f?'unit[\w{}]*-(data|prep|family)\.js'\), 'w'\)/, `${f}: no data file written to the site`);
  }
});
