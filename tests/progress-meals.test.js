// Wave 2, R1 + R4 (independent review H1 and H4), sample mode in a sandbox. The Hub side of the same rules is tested against the
// database in the CRM repo (hub/tests/progress-sharing.test.mjs, hub/tests/meal-instructions.test.mjs).
// R1: a child with no observations reads "not yet observed", never low; one observation changes documentation coverage, not an
// ability claim; the age band is chosen per child (never from the room), with history; families see only shared observations.
// R4: no blanket "everyone ate all"; director-approved instructions reach the kitchen card, changes are new versions; a missing or
// stale instruction blocks the shared menu; corrections keep who/when; tasting is optional and never recorded; claims are honest.
const P = require('./private-curriculum');
const test = P.gated(require('node:test'), 'curriculum-indicators.js');   // the portal runs here with the PRIVATE Learning Steps (IP lockdown)
const { setTimeout } = require('node:timers');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const visible = (html) => html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/&#39;|&rsquo;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');

function site() {
  const handlers = { click: [], change: [] }, fields = {}, store = {};
  const el = () => ({ hidden: true, textContent: '', innerHTML: '', value: '', style: {}, focus() {}, scrollIntoView() {}, setAttribute() {}, appendChild() {} });
  const toastEl = el();
  const byId = (id) => (fields[id] ? Object.assign(el(), fields[id]) : null);
  const c = {
    console, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, matchMedia: () => ({ matches: true }),
    localStorage: { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } },
    document: { addEventListener: (t, f) => { (handlers[t] = handlers[t] || []).push(f); }, getElementById: byId,
      querySelector: (q) => (q === '#toast' ? toastEl : (q.startsWith('#') ? byId(q.slice(1)) : null)),
      querySelectorAll: () => [], createElement: el, head: el(), body: el() },
    location: { hash: '' }, history: { replaceState() {} }, addEventListener() {},
  };
  c.window = c; vm.createContext(c);
  for (const f of ['data.js', 'views.js', 'curriculum-indicators.js', 'portal.js', 'meal-service.js']) vm.runInContext(f === 'curriculum-indicators.js' ? P.readPriv(f) : read(f), c, { filename: f });
  vm.runInContext("view='portal'; render=()=>{}", c);
  const fire = async (type, target) => { for (const h of handlers[type]) await h({ target }); };
  const node = (attrs) => ({ dataset: attrs, closest(sel) { const m = /^\[data-([a-z0-9-]+)\]$/.exec(sel); if (!m) return null; const key = m[1].replace(/-([a-z])/g, (_, x) => x.toUpperCase()); return key in attrs ? this : null; } });
  const html = (v) => vm.runInContext(`V[${JSON.stringify(v)}]()`, c);
  const saved = () => JSON.parse(store['ff-portal2-v2'] || '{}');
  return { c, html, fire, node, fields, toast: () => toastEl.textContent, saved, store };
}
const learningCard = (out) => (/<div class="card p2-fam"[\s\S]*?id="p2fLearning"[\s\S]*?<\/div><div style="display:grid;gap:16px">/.exec(out) || [''])[0];
async function newMixedRoomKids(s) {
  const { fire, node, fields } = s;
  await fire('click', node({ ptab: 'setup' }));
  Object.assign(fields, { rName: { value: 'TEST Mixed Room' }, rAges: { value: 'Mixed ages 2 to 5' } });
  await fire('click', node({ p: 'addroom' }));
  for (const n of ['Tess', 'Uma']) { Object.assign(fields, { kFirst: { value: n }, kLast: { value: 'Q' } }); await fire('click', node({ p: 'addkid' })); await new Promise((r) => setTimeout(r, 3)); } // ids are time-based
  const kids = vm.runInContext('Object.entries(FFPortal.ctx().kids).filter(([,k])=>k.first==="Tess"||k.first==="Uma").map(([id])=>id)', s.c);
  await fire('click', node({ ptab: 'progress' }));
  return kids;
}

// ===================================================================== R1
test('R1: a child with no observations reads "not yet observed" (teacher and family), never a low level, score or readiness word', async () => {
  const s = site();
  const [tess] = await newMixedRoomKids(s);
  await s.fire('click', s.node({ p2kid: tess }));
  const out = s.html('portal'), text = visible(out);
  assert.match(text, /Choose Tess's Learning Steps set/);
  assert.match(text, /Documentation coverage[\s\S]*Not yet observed No notes have been recorded for Tess yet\. That says nothing about what Tess can do/);
  assert.ok(!out.includes('data-step-row='), 'no Learning Steps until a set is confirmed');
  assert.doesNotMatch(text, /\d\s*%|readiness|behind|low (level|readiness)|at risk/i); // "never a score" disclaimers aside
  vm.runInContext("view='family-portal'", s.c);
  await s.fire('change', { id: 'fKid', value: tess, dataset: {} });
  const fam = s.html('family-portal'), card = visible(learningCard(fam));
  assert.match(card, /What we saw Not yet observed No observations have been shared yet/);
  assert.doesNotMatch(card, /Emerging|Developing|Secure|\d\s*%|readiness/i, 'no level word without a shared observation behind it');
});

test('R1: a mixed-age room never assigns one band: each child is unconfirmed until a teacher picks, and every set/change is kept', async () => {
  const s = site();
  const [tess, uma] = await newMixedRoomKids(s);
  const picker = /<div class="p2-kids"[\s\S]*?<\/div><\/div>/.exec(s.html('portal'))[0];
  assert.equal((visible(picker).match(/Set not confirmed/g) || []).length, 2);
  assert.match(visible(s.html('portal')), /nothing is suggested/, 'no date of birth and a mixed room: no suggestion');
  s.fields.p2Band = { value: 'twos' };
  await s.fire('click', s.node({ p2kid: tess }));
  await s.fire('click', s.node({ p2: 'confirmband' }));
  s.fields.p2Band = { value: 'prek' };
  await s.fire('click', s.node({ p2kid: uma }));
  await s.fire('click', s.node({ p2: 'confirmband' }));
  let pr = s.saved().progress;
  assert.equal(pr[tess].band, 'twos'); assert.equal(pr[uma].band, 'prek', 'two children in one room, two bands');
  s.fields.p2Band = { value: 'threes' };
  await s.fire('click', s.node({ p2kid: tess }));
  await s.fire('click', s.node({ p2: 'confirmband' }));
  pr = s.saved().progress;
  assert.deepEqual(pr[tess].bandHistory.map((h) => [h.band, h.from, h.by]), [['twos', null, 'demo'], ['threes', 'twos', 'demo']]);
  assert.ok(pr[tess].bandHistory.every((h) => typeof h.at === 'number'));
  assert.match(visible(s.html('portal')), /Set history \(2\) Threes \(was Twos\) · you \(demo\)/);
  // the portal never infers a band from a room name any more
  assert.doesNotMatch(read('portal.js'), /function bandOf\(kid\)\{[^}]*bandOfRoom/);
});

test('R1: a date of birth or a single-age room only SUGGESTS a band; nothing is applied without a click', async () => {
  const s = site();
  // a new child in the Threes Room ("Age 3") gets a suggestion from the room's single age band, and nothing is applied
  s.fields.kFirst = { value: 'Vera' }; s.fields.kLast = { value: 'W' };
  await s.fire('change', { id: 'pRoom', value: 'threes', dataset: {} });
  await s.fire('click', s.node({ ptab: 'children' }));
  await s.fire('click', s.node({ p: 'addkid' }));
  await s.fire('click', s.node({ ptab: 'progress' }));
  const vera = vm.runInContext('Object.entries(FFPortal.ctx().kids).find(([,k])=>k.first==="Vera")[0]', s.c);
  await s.fire('click', s.node({ p2kid: vera }));
  const text = visible(s.html('portal'));
  assert.match(text, /Suggested: Threes , the classroom is set to "Age 3"\. Check it before you confirm/);
  assert.ok(!(s.saved().progress || {})[vera], 'nothing saved until confirmed');
});

test('R1: one new observation changes documentation coverage, never an ability claim', async () => {
  const s = site();
  const [tess] = await newMixedRoomKids(s);
  await s.fire('click', s.node({ p2kid: tess }));
  s.fields.p2Band = { value: 'threes' };
  await s.fire('click', s.node({ p2: 'confirmband' }));
  const S = s.c.FFSteps, step = S.steps.find((x) => x.band === 'threes'), total = S.steps.filter((x) => x.band === 'threes').length;
  let text = visible(s.html('portal'));
  assert.match(text, /Not yet observed No notes have been recorded for Tess yet/);
  Object.assign(s.fields, { p2ObsText: { value: 'TEST stacked six blocks and counted them' }, p2ObsDate: { value: vm.runInContext('FFPortal.ctx().date', s.c) }, p2ObsStep: { value: step.id }, p2ObsLvl: { value: '' }, p2ObsCtx: { value: 'play' }, p2ObsShare: { checked: false } });
  await s.fire('click', s.node({ p2: 'saveobs' }));
  text = visible(s.html('portal'));
  assert.match(text, new RegExp(`1 note in all · 1 in the last 30 days · 0 shared with the family · 1 of ${total} Threes Learning Steps have at least one dated note`));
  assert.match(visible(/data-step-row="[^"]+"[\s\S]*?<\/div>/.exec(s.html('portal').slice(s.html('portal').indexOf(`data-step-row="${step.id}"`) - 30))[0]), /Noted, no level yet/);
  assert.doesNotMatch(text, /\d\s*%|readiness|percent|on track|ahead|behind/i);
  assert.match(s.toast(), /saved for teachers/);
});

test('R1: families see only observations a teacher shared; levels appear only where a shared observation backs them', async () => {
  const s = site();
  const [tess] = await newMixedRoomKids(s);
  await s.fire('click', s.node({ p2kid: tess }));
  s.fields.p2Band = { value: 'prek' };
  await s.fire('click', s.node({ p2: 'confirmband' }));
  const step = s.c.FFSteps.steps.find((x) => x.band === 'prek');
  Object.assign(s.fields, { p2ObsText: { value: 'TEST draft note about Tess' }, p2ObsDate: { value: '2026-10-02' }, p2ObsStep: { value: step.id }, p2ObsLvl: { value: 'secure' }, p2ObsCtx: { value: '' }, p2ObsShare: { checked: false } });
  await s.fire('click', s.node({ p2: 'saveobs' }));
  const fam = () => { vm.runInContext("view='family-portal'", s.c); const o = s.html('family-portal'); vm.runInContext("view='portal'", s.c); return o; };
  await s.fire('change', { id: 'fKid', value: tess, dataset: {} });
  let f = fam();
  assert.ok(!f.includes('TEST draft note'), 'an unshared note is not in the family view');
  assert.doesNotMatch(visible(learningCard(f)), /Secure/);
  const oid = Object.keys(s.saved().obs).find((id) => s.saved().obs[id].text === 'TEST draft note about Tess');
  await s.fire('click', s.node({ p2share: oid }));
  assert.equal(s.saved().obs[oid].shared, true);
  f = fam();
  assert.ok(f.includes('TEST draft note about Tess'));
  assert.match(visible(learningCard(f)), new RegExp(`Things Tess is doing now ${step.family.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} Secure`));
  await s.fire('click', s.node({ p2share: oid }));
  assert.ok(!fam().includes('TEST draft note'), 'unsharing hides it again');
  assert.match(visible(s.html('portal')), /Teachers only Approve and share with family/);
});

// ===================================================================== R4
test('R4: no blanket "everyone ate all": the bulk button only fills EMPTY lunch entries with "Not recorded", never an amount', async () => {
  const s = site();
  assert.doesNotMatch(read('portal.js'), /everyone ate all|lunchall/i);
  await s.fire('change', { id: 'pRoom', value: 'threes', dataset: {} });
  await s.fire('click', s.node({ ptab: 'children' }));
  await s.fire('change', { id: 'l_k10', value: 'Some', dataset: { kf: 'meal', meal: 'lunch', kid: 'k10' } });
  await s.fire('change', { id: 'a_k11', value: '0', dataset: { kf: 'present', kid: 'k11' } });
  await s.fire('click', s.node({ p: 'lunchrest' }));
  const out = s.html('portal');
  assert.match(visible(out), /Lunch: mark the rest "Not recorded"/);
  const lunchOf = (id) => (new RegExp(`id="l_${id}"[^>]*>[\\s\\S]*?<option value="([^"]*)" selected`).exec(out) || [])[1];
  assert.equal(lunchOf('k10'), 'Some', 'an actual intake choice is preserved');
  assert.equal(lunchOf('k11'), '', 'an absent child is left alone');
  for (const id of ['k12', 'k13', 'k14']) assert.equal(lunchOf(id), 'Not recorded', id);
  assert.match(s.toast(), /"Not recorded" for 3 children/);
});

test('R4: a synthetic instruction and a changed substitution reach the kitchen card; missing and stale instructions block the shared menu', async () => {
  const s = site();
  await s.fire('change', { id: 'pRoom', value: 'threes', dataset: {} });
  await s.fire('click', s.node({ ptab: 'lunch' }));
  let out = s.html('portal'), text = visible(out);
  assert.match(text, /Before service · Threes Room Meal instructions/);
  assert.match(text, /Full plans are kept in the center's records/);
  assert.match(text, /3 children have a meal instruction, 2 blocked/);
  const rowOf = (o, id) => (new RegExp(`<div class="ms-row" data-ms-kid="${id}"[\\s\\S]*?(?=<div class="ms-row"|</div><div class="card" id="msDirector")`).exec(o) || [''])[0];
  assert.match(visible(rowOf(out, 'k10')), /Mia Instruction approved Serve instead: Sunflower seed butter Never serve: Peanut butter, Tree nuts/);
  assert.match(visible(rowOf(out, 'k11')), /Blocked: instruction missing Instruction missing\. Do not serve the shared menu to Noah\./);
  assert.ok(!rowOf(out, 'k11').includes('data-outcome="served_as_instructed"'), 'no "served" button while blocked');
  assert.match(visible(rowOf(out, 'k12')), /Blocked: past review date .*Do not assume the shared menu or the old instruction/);
  // the database's rule, mirrored: a blocked child can only be held
  await s.fire('click', s.node({ msRec: 'k12', outcome: 'served_as_instructed' }));
  assert.match(s.toast(), /Blocked: hold the meal/);
  assert.equal(s.c.FFMeals._sample().checks.length, 0);
  // confirm Mia, then the director changes her substitution: a new version, and the old check is flagged
  await s.fire('click', s.node({ msRec: 'k10', outcome: 'served_as_instructed' }));
  Object.assign(s.fields, { msStatus: { value: 'active' }, msInstead: { value: 'Soy butter\nSunflower seed butter' }, msNever: { value: 'Peanut butter' }, msNote: { value: '' }, msReview: { value: '2099-01-01' } });
  await s.fire('change', { id: 'msKid', value: 'k10', dataset: {} });
  await s.fire('click', s.node({ ms: 'approve' }));
  out = s.html('portal');
  assert.match(visible(rowOf(out, 'k10')), /Serve instead: Soy butter, Sunflower seed butter Never serve: Peanut butter .*version 2/);
  assert.match(visible(rowOf(out, 'k10')), /instruction v1 · The instruction changed after this check: confirm again\./);
  assert.match(visible(out), /Version history \(2\) v2 · serve instead: Soy butter, Sunflower seed butter; never serve: Peanut butter · you \(sample\)/);
  assert.equal(s.c.FFMeals._sample().instr.k10[0].serve_instead[0], 'Sunflower seed butter', 'version 1 kept unchanged');
});

test('R4: corrections keep both entries with who and when; health details are refused in the director\'s editor', async () => {
  const s = site();
  await s.fire('change', { id: 'pRoom', value: 'threes', dataset: {} });
  await s.fire('click', s.node({ ptab: 'lunch' }));
  await s.fire('click', s.node({ msRec: 'k10', outcome: 'served_as_instructed' }));
  await s.fire('click', s.node({ msRec: 'k10', outcome: 'held_for_director' }));
  const ch = s.c.FFMeals._sample().checks;
  assert.equal(ch.length, 2); assert.equal(ch[1].corrects, ch[0].id);
  assert.ok(ch.every((x) => x.by && x.at));
  assert.match(visible(s.html('portal')), /Lunch: held for the director · you \(sample\) · .* · instruction v1 \(correction\)/);
  const before = s.c.FFMeals._sample().instr.k10.length;
  for (const bad of [{ msInstead: { value: 'EpiPen in cubby' } }, { msNote: { value: 'Allergy plan from the doctor' } }, { msNever: { value: 'Peanuts, diagnosed anaphylaxis' } }]) {
    Object.assign(s.fields, { msStatus: { value: 'active' }, msInstead: { value: 'Oat milk' }, msNever: { value: 'Cow milk' }, msNote: { value: '' }, msReview: { value: '2099-01-01' } }, bad);
    await s.fire('change', { id: 'msKid', value: 'k10', dataset: {} });
    await s.fire('click', s.node({ ms: 'approve' }));
    assert.equal(s.c.FFMeals._sample().instr.k10.length, before, JSON.stringify(bad));
  }
  // the room-level "menu change" box refuses health details too
  await s.fire('click', s.node({ lmode: 'custom' }));
  await s.fire('change', { id: 'lAllergy', value: 'Allergy swap for Mia', dataset: {} });
  assert.match(s.toast(), /leave out health details/);
});

test('R4: the family sees their own child\'s instruction read-only, with no medical detail; learning prompts stay separate from care instructions', async () => {
  const s = site();
  await s.fire('change', { id: 'pRoom', value: 'threes', dataset: {} });
  await s.fire('click', s.node({ ptab: 'lunch' }));
  const out = s.html('portal');
  const board = /<div class="card ms-card" id="msBoard">[\s\S]*?<div class="card" id="msDirector">/.exec(out)[0];
  assert.ok(out.includes('id="msLearn"') && !board.includes('msLearn'), 'the learning prompt is its own card');
  assert.doesNotMatch(visible(board), /tast|explor|Zuri/i, 'care instructions carry no learning prompt');
  assert.match(visible(out), /Food exploration optional learning prompt .*"No thanks" is a complete answer: nothing is recorded about who tasted/);
  vm.runInContext("view='family-portal'", s.c);
  await s.fire('change', { id: 'fKid', value: 'k10', dataset: {} });
  const famHtml = s.html('family-portal'), fam = visible(famHtml), famCard = visible((/<div class="ms-fam"[\s\S]*?<\/div>/.exec(famHtml) || [''])[0]);
  assert.match(fam, /Meal instruction on file Serve instead: Sunflower seed butter Never serve: Peanut butter, Tree nuts .*Full plan kept in the center's records/);
  await s.fire('change', { id: 'fKid', value: 'k11', dataset: {} });
  assert.match(visible(s.html('family-portal')), /The director is preparing a meal instruction for Noah/);
  await s.fire('change', { id: 'fKid', value: 'k13', dataset: {} });
  assert.doesNotMatch(visible(s.html('family-portal')), /Meal instruction on file/, 'no instruction, no card');
  assert.doesNotMatch(famCard, /diagnos|medic|epinephrine|severity|reaction|allerg/i);
  assert.ok(famCard.length > 40);
});

test('R4: declining a food activity produces no negative status anywhere; meal words are neutral', () => {
  const files = ['plush-cast.js', 'portal.js', 'meal-service.js', 'daily-rhythm.js', 'family-report.js', 'family-library.js', 'family-library-data.js', 'whole-child.js', 'talk-cards.js'];
  for (const f of files) assert.doesNotMatch(read(f), /\b(refused|declined|picky|fussy|won't eat|did not try|clean plate club|one bite rule)\b/i, f);
  const S = (() => { const c = { window: {} }; vm.createContext(c); vm.runInContext(P.readPriv('curriculum-indicators.js'), c); return c.window.FFSteps; })();
  assert.doesNotMatch(JSON.stringify(S.steps), /refus|declin|picky|tries all|eats all|finishes (a|the|her|his|their) (plate|meal|food)/i, 'no Learning Step can record declining food');
  const amt = /const AMT = (\[.*\]);/.exec(read('portal.js'))[1];
  assert.doesNotMatch(amt, /good|bad|refus|declin|picky/i);
  for (const f of ['plush-cast.js', 'views.js', 'whole-child.js', 'features.js']) assert.doesNotMatch(read(f), /Tried It (sticker )?chart|one bite and see|sticker chart for every new food/i, f);
});

test('R4: meal-pattern claims are worded as planning, not compliance, and milk follows age (CACFP: whole at 1, 1% or fat-free at 2 to 5)', () => {
  const all = ['portal.js', 'views.js', 'features.js'].map(read).join('\n');
  assert.doesNotMatch(all, /CACFP-ready|Meets the CACFP|meal-pattern compliance|Are the meals CACFP-ready/);
  assert.match(read('portal.js'), /Whole unflavored milk \(age 1\)/);
  assert.match(read('views.js'), /Unflavored whole milk at age 1, unflavored 1% or fat-free at ages 2 to 5/);
  assert.match(read('views.js'), /not reviewed or approved by USDA or a state agency/);
  const index = read('index.html'), at = (f) => index.indexOf(f);
  assert.ok(at('meal-service.js?v=') > at('portal.js?v=') && at('portal.js?v=') > 0, 'meal-service.js loads after portal.js');
});
