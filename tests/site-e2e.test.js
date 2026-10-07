// Site end-to-end functional smoke (owner 2026-10-07: "write a check on the whole website to make sure everything's running").
// The full sweep is tools/site-e2e.mjs (every route at 390 and 1280, every feature, every video, cross-page consistency; run it
// against live with `node tools/site-e2e.mjs`). This CI version runs it on this folder, served locally, with one viewport, a handful
// of key routes and the feature areas that break most often, and adds fast source checks for copy that went stale before.
// The forms are driven against a mock intake gateway answered inside the browser: nothing is sent anywhere.
const test = require('node:test');
const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SITE = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(SITE, f), 'utf8');

test('copy that went stale before stays fixed (books, units, clips)', () => {
  const files = fs.readdirSync(SITE).filter(f => /\.js$/.test(f));
  const bad = [];
  const rules = [
    [/\b(?:one|two|three|four|1|2|3|4) read-aloud storybooks\b/i, 'the shelf has five storybooks'],
    [/\b(?:12|twelve) units planned\b/i, 'Units 1 to 4 are written; say "twelve units"'],
    [/Unit 1 is written day by day; later units|daily plans not written yet|later units (?:are )?outlined/i, 'Units 1 to 4 are written (draft); 5 to 12 outlined'],
    [/\bone short clip\b/i, 'the Watch shelf has many videos'],
    [/\bthree storybooks\b/i, 'the shelf has five storybooks'],
    [/Futures Early Learning Cent|Futures Learning Centre|Future Learning Center/, 'the school is "Futures Learning Center"']
  ];
  for (const f of files) {
    const s = read(f);
    for (const [re, why] of rules) { const m = re.exec(s); if (m) bad.push(`${f}: "${m[0]}" (${why})`); }
  }
  assert.deepEqual(bad, []);
});

test('card durations parser reads the ways the site writes a length', async () => {
  const src = read('tools/site-e2e.mjs');
  const body = /function claimed\(text\) \{[\s\S]*?\n\}/.exec(src)[0];
  const claimed = new Function(`${body}; return claimed;`)();
  const inside = (t, s) => { const c = claimed(t); return !!c && s >= c[0] && s <= c[1]; };
  assert.ok(inside('Trunk Reach 30 sec Any space', 32));
  assert.ok(!inside('Freeze & Try Again 2 min Small indoor space', 69));
  assert.ok(inside('about 3 to 5 minutes aloud', 240));
  assert.ok(inside('under a minute', 39));
  assert.ok(inside('8 seconds, no sound', 8));
  assert.equal(claimed('Booker Tries Again'), null);
});

test('smoke: key routes render clean and the core features work (tools/site-e2e.mjs --local --quick)', { timeout: 900000 }, async () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'ff-e2e-'));
  const args = [path.join(SITE, 'tools', 'site-e2e.mjs'), '--local', '--quick', '--out', out, '--only', 'routes,features',
    '--routes', 'home,at-home,story-time,activities,unit-1,talk,shop-programs,pricing,contact,enroll,watch,friends',
    '--areas', 'route,nav,chrome,home,story-time,activities,unit-1,talk,store,pricing,forms'];
  const r = await new Promise(resolve => execFile(process.execPath, args, { maxBuffer: 1 << 24, timeout: 880000 }, (err, stdout, stderr) => resolve({ code: err ? err.code : 0, stdout, stderr })));
  let rep = null; try { rep = JSON.parse(fs.readFileSync(path.join(out, 'site-e2e.json'), 'utf8')); } catch (_) { /* reported below */ }
  assert.ok(rep, `no report written: ${r.stderr.slice(0, 600)}`);
  const broken = rep.results.filter(x => x.status === 'broken').map(x => `${x.area} / ${x.feature}: ${x.detail}`);
  assert.deepEqual(broken, []);
  assert.ok(rep.results.length >= 40, `only ${rep.results.length} checks ran`);
  assert.deepEqual(rep.blocked.filter(b => !/intake\.e2e\.test/.test(b)), [], 'the sweep tried to send something');
});
