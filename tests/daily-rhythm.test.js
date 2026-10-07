// Whole-Child Daily Rhythm screens (daily-rhythm.js): source-level guardrail checks and the portal.js hooks. The database rules themselves
// are tested in the hub repo (hub/tests/whole-child*.test.mjs); the browser flows are exercised against the local Supabase.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const rhythm = read('daily-rhythm.js');
const portal = read('portal.js');
const index = read('index.html');

test('daily-rhythm.js parses and exposes the portal API', () => {
  new Function(rhythm); // syntax only; it is not executed
  for (const name of ['teacherView', 'rweekView', 'familyCard', 'syncEpisode', 'screensBlocked', 'boot']) assert.match(rhythm, new RegExp(`window\\.FFRhythm = \\{[^}]*\\b${name}\\b`));
});

test('guardrails: no child body measurement, ranking, or withholding wording anywhere in the screens', () => {
  const visible = rhythm.replace(/\/\*[\s\S]*?\*\//, '').replace(/^\s*\/\/.*$/gm, '');
  const text = visible.replace(/font-weight/g, '').replace(/never withheld as punishment/g, '').replace(/never ranks or compares/g, '');
  for (const re of [/\bbmi\b/i, /\bcalorie/i, /\bweigh(t|ed|s)\b/i, /\bobes/i, /\bleaderboard/i, /\bmost active\b/i, /\branking\b/i, /\bwithhold\b/i, /\btake away (recess|outside)/i, /\bgood food\b|\bbad food\b/i])
    assert.ok(!re.test(text), `forbidden wording: ${re}`);
  assert.match(rhythm, /never withheld as punishment/);
  assert.match(rhythm, /never ranks or compares children/);
  assert.match(rhythm, /Reports show rooms, never individual children/);
  assert.ok(!/data-kid=|kid_id|per.child/i.test(rhythm), 'moments are room level: the rhythm screens address no child');
});

test('the weather card only suggests; the sitting nudge and the state rules are cited and never block', () => {
  assert.match(rhythm, /This is a suggestion; you decide/);
  assert.match(rhythm, /api\.weather\.gov/);
  assert.match(rhythm, /15\*60\*1000/); // 15 minute cache
  assert.match(rhythm, /User-Agent/);
  assert.match(rhythm, /Check outside and decide/); // offline fallback
  assert.match(rhythm, /Default from CFOC 3\.1\.3\.2; center policy to confirm/);
  assert.match(rhythm, /Missouri allows no more than \$\{mg\.max\} hours between meals and snacks/);
  assert.match(rhythm, /Rest period \(required in Missouri preschool rooms\)/);
  assert.match(rhythm, /No screens for infants, toddlers or any child through age 2/);
  assert.match(rhythm, /youngest_months >= 36/); // the client gate mirrors the database trigger
  assert.ok(!/disabled[^`]{0,40}weather|block(ed)? outdoor/i.test(rhythm));
});

test('portal.js wires the rhythm in hub mode only and leaves demo mode alone', () => {
  assert.match(portal, /if \(window\.FFRhythm && P\.hub\) \{ tabs\.splice\(1,0,\['rhythm','Daily Rhythm'\]\)/);
  assert.match(portal, /P\.role==='director'\) tabs\.splice\(2,0,\['rweek','Rhythm dashboard'\]\)/);
  assert.match(portal, /P\.hub && window\.FFRhythm\) \{ const card = window\.FFRhythm\.familyCard/);
  assert.match(portal, /syncEpisode/);
  assert.match(portal, /window\.FFPortal = \{subscribeKd, connectHub, ctx:rhythmCtx/);
});

test('index.html loads daily-rhythm.js after portal.js', () => {
  const p = index.indexOf('portal.js'), d = index.indexOf('daily-rhythm.js');
  assert.ok(p > 0 && d > p);
});
