// Learning Steps (curriculum-indicators.js, generated in the CRM repo by hub/scripts/build-curriculum.mjs; since the IP lockdown of
// 2026-10-07 it lives in the PRIVATE repo, tests/private-curriculum.js, and the site carries only learning-steps-summary.js):
// every step has a source and an age band, crosswalk codes come only from the fetched official documents, no child ever
// gets a number (percent, score, readiness label), and the twos, threes and pre-K sets render in the teacher and family views (the program serves ages 2 to 5 only; there are no infant or toddler sets).
const P = require('./private-curriculum');
const test = P.gated(require('node:test'), 'curriculum-indicators.js');   // the steps are private: skipped where not mounted
const publicTest = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const FIX = JSON.parse(read('tests/fixtures/standards-codes.json'));

function steps() { const c = { window: {} }; vm.createContext(c); vm.runInContext(P.readPriv('curriculum-indicators.js'), c); return c.window.FFSteps; }
function summary() { const c = { window: {} }; vm.createContext(c); vm.runInContext(read('learning-steps-summary.js'), c); return c.window.FFSteps; }

// The site in a sandbox: data, views, the indicators and the portal, with just enough DOM for the portal to run.
function site() {
  const handlers = { click: [], change: [] }, fields = {}, store = {};
  const el = () => ({ hidden: true, textContent: '', innerHTML: '', value: '', focus() {}, scrollIntoView() {}, setAttribute() {}, appendChild() {} });
  const toastEl = el(), viewEl = el();
  const c = {
    console, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, matchMedia: () => ({ matches: true }),
    localStorage: { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } },
    document: { addEventListener: (t, f) => { (handlers[t] = handlers[t] || []).push(f); }, getElementById: () => null,
      querySelector: (q) => q === '#toast' ? toastEl : q === '#view' ? viewEl : (fields[q.replace('#', '')] ? Object.assign(el(), fields[q.replace('#', '')]) : null),
      querySelectorAll: () => [], createElement: el, head: el(), body: el() },
    location: { hash: '' }, history: { replaceState() {} }, addEventListener() {},
  };
  c.window = c; vm.createContext(c);
  for (const f of ['data.js', 'views.js', 'curriculum-indicators.js', 'portal.js']) vm.runInContext(f === 'curriculum-indicators.js' ? P.readPriv(f) : read(f), c, { filename: f });
  vm.runInContext("view='portal'", c);
  const fire = async (type, target) => { for (const h of handlers[type]) await h({ target }); };
  const node = (attrs) => ({ dataset: attrs, closest(sel) { const m = /^\[data-([a-z0-9-]+)\]$/.exec(sel); if (!m) return null; const key = m[1].replace(/-([a-z])/g, (_, x) => x.toUpperCase()); return key in attrs ? this : null; } });
  const saved = () => JSON.parse(store['ff-portal2-v2'] || '{}');
  return { c, html: (v) => vm.runInContext(`V[${JSON.stringify(v)}]()`, c), fire, node, fields, toast: () => toastEl.textContent, saved };
}
const visible = (html) => html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ');

test('curriculum-indicators.js parses and carries three age bands, twos to pre-K', () => {
  const S = steps();
  assert.equal(JSON.stringify(S.bands.map((b) => b.key)), JSON.stringify(['twos', 'threes', 'prek']));
  assert.equal(JSON.stringify(S.levels.map((l) => l.label)), JSON.stringify(['Emerging', 'Developing', 'Secure']));
  assert.equal(S.steps.length, S.summary.total);
  for (const b of S.bands) assert.ok(S.steps.filter((s) => s.band === b.key).length >= 15, b.key);
});

test('every Learning Step has an age band, a domain, family wording and at least one quoted source', () => {
  const S = steps(), bands = new Set(S.bands.map((b) => b.key)), doms = new Set(S.domains.map((d) => d.key));
  for (const s of S.steps) {
    assert.ok(bands.has(s.band) && doms.has(s.domain), s.id);
    for (const f of ['text', 'family', 'next', 'home']) assert.ok(s[f] && s[f].length > 8, `${s.id} ${f}`);
    assert.ok(s.sources.length >= 1, s.id);
    for (const q of s.sources) { assert.ok(['cdc', 'kels', 'mels', 'elof'].includes(q.doc), s.id); assert.ok(q.excerpt && q.ref, s.id); }
  }
});

test('crosswalk codes come only from the fetched official documents, and CDC quotes are verbatim', () => {
  const S = steps(), cdcItems = new Set(FIX.cdc.ages.flatMap((a) => a.items));
  assert.match(FIX.mels.url, /^https:\/\/dese\.mo\.gov\//); assert.match(FIX.kels.url, /^https:\/\/kels\.ksde\.gov\//); assert.match(FIX.elof.url, /^https:\/\/headstart\.gov\//);
  let mapped = 0, unmapped = 0;
  for (const s of S.steps) {
    for (const std of ['mels', 'kels', 'elof']) {
      const codes = s.codes[std];
      if (codes === null) { unmapped++; continue; }
      assert.ok(codes.length, `${s.id} ${std} mapped with no codes`); mapped++;
      for (const code of codes) assert.ok(FIX[std].codes.includes(code), `${s.id}: ${std} ${code} is not in the fetched document`);
    }
    for (const q of s.sources.filter((x) => x.doc === 'cdc')) assert.ok(cdcItems.has(q.excerpt), `${s.id}: CDC quote "${q.excerpt}"`);
  }
  assert.equal(mapped + unmapped, S.steps.length * 3);
  for (const std of ['mels', 'kels', 'elof']) assert.equal(S.steps.filter((s) => s.codes[std]).length, S.summary.by_standard[std].mapped, std);
});

test('nothing in the Learning Steps or the family guidance is a score, percent or readiness label, and the guidance is not diagnostic', () => {
  const S = steps();
  assert.doesNotMatch(JSON.stringify([S.steps.map((s) => [s.text, s.family, s.next, s.home]), S.levels, S.referral]), /\d\s*%|percent|readiness|score|rank/i);
  const r = S.referral.lines.join(' ');
  assert.match(r, /child's doctor/); assert.match(r, /First Steps/); assert.match(r, /tiny-k/); assert.match(r, /not a test, a screening or a diagnosis/);
  assert.doesNotMatch(r, /\b(delay(ed)?|disorder|behind|at risk|red flag)\b/i);
});

test('portal.js has no readiness score, percentages, rings or side-by-side child bars left', () => {
  const portal = read('portal.js');
  for (const re of [/readiness/i, /domainScore/, /readyCard/, /p2-ring/, /p2-bar/, /p2-mini/, /Strong foundations|Building steadily|Early days/])
    assert.doesNotMatch(portal, re, String(re));
  assert.match(portal, /window\.FFSteps/);
  const index = read('index.html');
  assert.ok(index.indexOf('learning-steps-summary.js') > 0 && index.indexOf('learning-steps-summary.js') < index.indexOf('portal.js'), 'the public summary loads before the portal');
  assert.doesNotMatch(index, /curriculum-indicators\.js/, 'the full Learning Steps are private (IP lockdown)');
});

test('teacher view: the twos and pre-K rooms show their Learning Steps, words only, selectable in the observation entry', async () => {
  const { c, html, fire, node } = site();
  const S = c.FFSteps;
  await fire('click', node({ ptab: 'progress' }));
  for (const [room, band] of [['twos', 'twos'], ['threes', 'threes'], ['prek', 'prek']]) {
    await fire('change', { id: 'pRoom', value: room, dataset: {} });
    const out = html('portal');
    const mine = S.steps.filter((s) => s.band === band);
    for (const s of mine) {
      assert.ok(out.includes(`data-step-row="${s.id}"`), `${room}: row for ${s.id}`);
      assert.ok(out.includes(`<option value="${s.id}"`), `${room}: ${s.id} selectable in the observation entry`);
    }
    for (const s of S.steps.filter((x) => x.band !== band)) assert.ok(!out.includes(`data-step-row="${s.id}"`), `${room}: no ${s.id}`);
    const text = visible(out);
    assert.doesNotMatch(text, /\d\s*%|readiness|Strong foundations|Early days/i, room);
    assert.match(text, /Not yet observed|Emerging|Developing|Secure/);
    assert.match(out, /id="p2ObsLvl"/); assert.match(out, /No level, just a note/);
  }
  // the child picker shows names and age bands only: no bars, counts or levels side by side
  const picker = /<div class="p2-kids"[\s\S]*?<\/div><\/div>/.exec(html('portal'))[0];
  assert.doesNotMatch(picker, /%|observed|width:|Secure|Developing|Emerging/);
});

test('teacher view: a level needs a Learning Step and a note; saving stores a dated word level, never a number', async () => {
  const { c, html, fire, node, fields, toast, saved } = site();
  const S = c.FFSteps, step = S.steps.find((s) => s.band === 'twos'), kid = 'k6'; // Ava, Twos Room
  await fire('click', node({ ptab: 'progress' }));
  await fire('change', { id: 'pRoom', value: 'twos', dataset: {} });
  await fire('click', node({ p2kid: kid }));
  await fire('click', node({ p2step: step.id }));
  assert.match(html('portal'), new RegExp(`<option value="${step.id}" selected>`), 'Record preselects the step');
  Object.assign(fields, { p2ObsText: { value: '' }, p2ObsDate: { value: '2026-10-05' }, p2ObsStep: { value: step.id }, p2ObsLvl: { value: 'secure' } });
  await fire('click', node({ p2: 'saveobs' }));
  assert.match(toast(), /Write a note or add a photo first/);
  fields.p2ObsText.value = 'TEST walked across the room to the window on her own';
  fields.p2ObsStep.value = '';
  await fire('click', node({ p2: 'saveobs' }));
  assert.match(toast(), /Choose the Learning Step this level is for/);
  fields.p2ObsStep.value = step.id;
  await fire('click', node({ p2: 'saveobs' }));
  assert.match(toast(), /Observation saved/);
  const doc = saved().progress[kid];
  assert.deepEqual(Object.keys(doc.steps[step.id]).sort(), ['at', 'by', 'date', 'level', 'note', 'obs']);
  assert.equal(doc.steps[step.id].level, 'secure'); assert.equal(doc.steps[step.id].date, '2026-10-05');
  assert.equal(doc.steps[step.id].note, 'TEST walked across the room to the window on her own');
  for (const k of ['ms', 'percent', 'score', 'readiness', 'overall']) assert.ok(!(k in doc), k);
  for (const x of Object.values(doc.steps)) assert.ok(['emerging', 'developing', 'secure'].includes(x.level) && x.date && x.note);
  const out = html('portal');
  assert.match(out, new RegExp(`data-step-row="${step.id}"[\\s\\S]*?TEST walked across the room[\\s\\S]*?data-l="secure">Secure`));
});

test('family view: twos and threes children get the friendly version (what we saw, what\'s next, try at home) and fixed referral guidance', async () => {
  const { c, html, fire } = site();
  vm.runInContext("view='family-portal'", c);
  const S = c.FFSteps;
  for (const room of ['twos', 'threes']) {
    const kid = { twos: 'k6', threes: 'k10' }[room];
    await fire('change', { id: 'fKid', value: kid, dataset: {} });
    const out = html('family-portal'), text = visible(out);
    for (const h of ['What we saw', 'Things', "What's next", 'Try at home', 'What the words mean', S.referral.title]) assert.ok(text.includes(h), `${room}: ${h}`);
    const band = room;
    assert.ok(S.steps.filter((s) => s.band === band).some((s) => text.includes(s.home) || text.includes(s.next) || text.includes(s.family)), `${room}: shows its own band's steps`);
    assert.match(text, /First Steps/); assert.match(text, /tiny-k/);
    assert.doesNotMatch(text, /\d\s*%|readiness|Strong foundations|Building steadily|Early days|Kindergarten readiness/i, room);
    assert.doesNotMatch(out, /role="img" aria-label="[^"]*%/);
  }
});

test('site claims match the verified crosswalk: no unverified "based on CDC and the Missouri standards" line, and counts come from the data', () => {
  const context = vm.createContext({ window: { addEventListener() {} }, document: { addEventListener() {} } });
  for (const f of ['data.js', 'views.js', 'learning-steps-summary.js']) vm.runInContext(read(f), context);   // what the public site loads
  const S = context.window.FFSteps;
  const impact = vm.runInContext('V.impact()', context), readiness = vm.runInContext('V.readiness()', context);
  assert.doesNotMatch(impact + readiness, /based on CDC milestones and the Missouri Early Learning Standards|Checklists for ages 2, 3, 4 and 5|readiness checklist/i);
  assert.match(impact, new RegExp(`${S.summary.total} teacher-observed Learning Steps`));
  assert.match(impact, new RegExp(`${S.summary.by_standard.kels.mapped} are matched to Kansas standards, ${S.summary.by_standard.mels.mapped} to Missouri and ${S.summary.by_standard.elof.mapped} to Head Start`));
  assert.match(readiness, /id="steps"/);
  for (const b of S.bands) { const r = S.summary.by_band_standard[b.key]; assert.ok(readiness.includes(`${r.kels.mapped} of ${r.kels.mapped + r.kels.unmapped} matched`), b.key); }
  assert.doesNotMatch(read('views.js'), /Spot the gap|Suggest the next activity|Milestones this unit|<td>Kindergarten readiness<\/td>/);
});

publicTest('learning-steps-summary.js (public) carries the counts, bands, areas and level words, and no Learning Step at all', () => {
  const S = summary();
  assert.equal(S.summary_only, true);
  assert.equal(S.steps.length, 0);
  assert.equal(JSON.stringify(S.bands.map((b) => b.key)), JSON.stringify(['twos', 'threes', 'prek']));
  assert.ok(S.summary.total > 0);
  assert.ok(read('learning-steps-summary.js').length < 12000, 'a summary, not the crosswalk');
  assert.doesNotMatch(read('learning-steps-summary.js'), /"codes":|"excerpt":|"next":/, 'no step text, quotes or crosswalk codes');
});

test('the public summary counts equal the private Learning Steps', () => {
  // the public summary covers ages 2 to 5 only (twos, threes, pre-K); the private set may still hold under-2 bands
  const pub = JSON.parse(JSON.stringify(summary().summary)), priv = JSON.parse(JSON.stringify(steps().summary));
  for (const b of ['twos', 'threes', 'prek']) { assert.equal(pub.by_band[b], priv.by_band[b], b); assert.deepEqual(pub.by_band_standard[b], priv.by_band_standard[b], b); }
  assert.deepEqual(Object.keys(pub.by_band), ['twos', 'threes', 'prek']);
  assert.equal(pub.total, pub.by_band.twos + pub.by_band.threes + pub.by_band.prek);
});
