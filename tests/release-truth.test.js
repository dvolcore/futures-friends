// Release truth (review ticket R8): the sold package reads from the release asset manifest, drafts never read as approved,
// and screen-time labels separate scheduled program minutes from the ceilings.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { site, read, text, ROOT } = require('./site-vm');

const M = require('../release-manifest.js');
const P = require('../pricing-all-in.js');
const CRM_JSON = '/Volumes/FFCRM/app/docs/release/ASSET_MANIFEST.json';
const AVAIL = ['available_now', 'in_development', 'coming_later'];
const ids = v => (Array.isArray(v) ? v : [v]);

test('release-manifest.js is the generated copy of the CRM manifest (skipped when the CRM repo is not mounted)', { skip: !fs.existsSync(CRM_JSON) }, () => {
  const src = JSON.parse(fs.readFileSync(CRM_JSON, 'utf8'));
  assert.equal(M.version, src.version, 'rebuild with node tools/build-release-manifest.mjs');
  assert.deepEqual(Object.keys(M.assets).sort(), src.assets.map(a => a.id).sort());
  for (const a of src.assets) {
    assert.equal(M.assets[a.id].approval, a.approval_status, a.id);
    assert.equal(M.assets[a.id].availability, a.availability, a.id);
    for (const k of ['owner_role', 'source', 'version', 'age_band', 'approval_status', 'delivery_format', 'buyer_receives']) assert.ok(a[k] != null && a[k] !== '', `${a.id} has ${k}`);
    for (const k of ['creator', 'ai', 'license', 'chain_of_title']) assert.ok(a.source[k], `${a.id} source.${k}`);
    if (a.approval_status === 'not_started') assert.equal(a.availability, 'coming_later', `${a.id}: nothing started cannot be in development or available`);
  }
  assert.deepEqual(M.packages, src.packages);
});

test('every package item and every priced extra maps to a manifest asset', () => {
  for (const [k, p] of Object.entries(M.packages)) for (const [label, id] of p.items) assert.ok(M.assets[id], `package ${k}: "${label}" -> ${id}`);
  for (const t of P.TIERS) {
    assert.ok(t.inc.length >= 6, t.name);
    for (const [label, id] of t.inc) assert.ok(M.assets[id], `${t.name}: "${label}" -> ${id}`);
  }
  for (const [group, rows] of P.EXTRAS) for (const [item, , id] of rows) {
    assert.ok(id, `${group}: "${item}" has an asset id`);
    for (const x of ids(id)) assert.ok(M.assets[x], `${group}: "${item}" -> ${x}`);
  }
  for (const a of Object.values(M.assets)) { assert.ok(AVAIL.includes(a.availability), a.id); assert.ok(a.note, a.id + ' has a buyer note'); }
});

test('#pricing lists each package item under the availability the manifest gives it', () => {
  const html = site().render('pricing');
  const groups = [...html.slice(html.indexOf('pz-tiers')).matchAll(/<div class="rt-group" data-availability="([a-z_]+)">([\s\S]*?)<\/ul><\/div>/g)];   // the annual tiers (the launch package is checked in commerce.test.js)
  assert.ok(groups.length >= 6, 'three packages, at least two groups each');
  let n = 0;
  for (const [, avail, body] of groups) for (const [, id] of body.matchAll(/<li data-asset="([a-z0-9-]+)">/g)) { n++; assert.equal(M.assets[id].availability, avail, id); }
  assert.equal(n, P.TIERS.reduce((a, t) => a + t.inc.length, 0), 'every included item is shown once');
  assert.match(text(html), /a Futures Friends completion record is not state-approved training credit/);
  for (const [, , id] of P.EXTRAS.flatMap(([, rows]) => rows)) assert.ok(html.includes('rt-chip'), id);
  // E2: Unit 1 is packaged and public as a draft, so it is the one paid-package item available today; nothing else is.
  const tiers = html.slice(html.indexOf('pz-tiers'), html.indexOf('rt-legend', html.indexOf('pz-tiers')));
  const now = [...tiers.matchAll(/<div class="rt-group" data-availability="available_now">([\s\S]*?)<\/ul><\/div>/g)].flatMap(m => [...m[1].matchAll(/data-asset="([a-z0-9-]+)"/g)].map(x => x[1]));
  assert.deepEqual([...new Set(now)], ['curriculum-unit1-days'], 'only Unit 1 is available today in a paid package');
});

test('#options, the audience pages and the quote page show the same scope, from the manifest', () => {
  const s = site();
  const opt = s.render('options');
  assert.match(opt, /id="rt-options"/);
  for (const [k] of s.FFRelease.OPTIONS) for (const [, id] of M.packages[k].items) assert.ok(opt.includes(`data-asset="${id}"`), `options ${k} ${id}`);
  assert.doesNotMatch(text(opt), /Family subscription/);
  for (const [route, keys] of Object.entries(s.FFRelease.AUDIENCE)) {
    const h = s.render(route);
    assert.match(h, /id="rt-package"/, route);
    for (const k of keys) for (const [, id] of M.packages[k].items) assert.ok(h.includes(`data-asset="${id}"`), `${route} ${id}`);
  }
  const q = s.render('quote');
  assert.match(q, /id="rt-quote"/);
  assert.match(text(q), /Your written quote uses this scope/);
  const faq = text(read('views.js').match(/\['What comes in the welcome box\?','[^']+'\]/)[0]);
  assert.match(faq, /planned to hold/); assert.match(faq, /in development or coming later/);
});

test('nothing is externally approved, so no draft course, credential or asset is called approved or certified', () => {
  const approved = Object.values(M.assets).filter(a => a.approval === 'externally_approved');
  assert.deepEqual(approved.map(a => a.id), [], 'update this test when the first external approval is recorded');
  const files = ['data.js', 'views.js', 'features.js', 'academy-lms.js', 'pricing-all-in.js', 'release-truth.js', 'route-meta.js', 'premium.js', 'release-manifest.js'];
  const src = files.map(read).join('\n');
  assert.doesNotMatch(src, /Certified (Classroom|Home) Educator|Certified Cook|Certified Trainer|Certified Educator/, 'credential titles do not say Certified');
  assert.doesNotMatch(src, /Certificate of Completion|Certificate of completion|This certifies that/, 'Academy records are completion records');
  assert.match(read('academy-lms.js'), /This is a Futures Friends completion record, not state-approved training credit/);
  // every approval word in the manifest notes and on the buyer routes is qualified (not yet, pending, until, once, when, only...)
  const OK = /\b(not|no|pending|until|once|when|only|never|nor|unless|yet|planned|before|whether|without|awaiting|approval|requested)\b/i;
  for (const a of Object.values(M.assets)) for (const m of (a.name + ' ' + a.note).matchAll(/\b(approved|certified|accredited)\b/gi)) assert.match((a.name + ' ' + a.note).slice(Math.max(0, m.index - 70), m.index + 40), OK, a.id);
  const s = site();
  for (const r of ['pricing', 'options', 'for-centers', 'for-home', 'for-prek', 'for-faith', 'for-employers', 'for-families', 'quote', 'support', 'why', 'news', 'hub', 'training', 'curriculum']) {
    const t = text(s.render(r)).replace(/Teacher Training & Certification v1\.0/g, 'Volume 04');   // the cited owner document's title
    for (const m of t.matchAll(/\b(approved|certified|accredited|certification)\b/gi)) {
      const win = t.slice(Math.max(0, m.index - 70), m.index + 40);
      assert.match(win, OK, `${r}: "${win}"`);
    }
  }
});

test('Hub features say built, preview or planned; no CACFP claim summary is claimed as a working feature', () => {
  const s = site(), h = s.render('hub'), t = text(h);
  for (const f of ['hub-portals', 'hub-ops-preview', 'hub-cacfp-claims', 'hub-store-funding', 'hub-lms']) assert.ok(M.assets[f].feature, f);
  assert.match(h, /data-feature="planned"/); assert.match(h, /data-feature="preview"/); assert.match(h, /data-feature="built_needs_go_live"/);
  assert.match(t, /Point-of-service counts and a monthly claim summary are planned/);
  assert.doesNotMatch(read('views.js'), /Point-of-service counts with 2026–27 rates and a monthly claim summary|point-of-service CACFP counts\.'|Record CACFP meal counts/);
  assert.match(t, /Classroom Live \(preview\)/);
  assert.match(text(read('views.js').match(/'Step-by-step guide[^']*'|Planned: a step-by-step guide[^<]*/)[0]), /Planned/);
});

test('screen time: scheduled program minutes are defined apart from the weekly program and in-care all-screens ceilings, and every label agrees', () => {
  const S = M.screenTime;
  assert.equal(S.scheduled_program_minutes.value, 24); assert.equal(S.weekly_program_ceiling.value, 30);
  assert.equal(S.in_care_all_screens_ceiling.value, 30); assert.equal(S.in_care_all_screens_ceiling.unit, 'minutes a week'); assert.equal(S.daily_all_screens_ceiling, undefined, 'the 30-minutes-a-day in-care default is retired (owner 2026-10-07)'); assert.equal(S.under_three.value, 0);
  assert.ok(S.scheduled_program_minutes.value < S.weekly_program_ceiling.value, 'scheduled minutes sit under the ceiling');
  const files = ['plush-cast.js', 'views.js', 'features.js', 'family-library.js', 'whole-child.js', 'portal.js', 'daily-rhythm.js', 'talk-cards.js', 'route-meta.js', 'release-truth.js'];
  const all = files.map(f => [f, read(f)]);
  for (const [f, src] of all) {
    for (const m of src.matchAll(/(\d+) (?:screen |scheduled |scheduled episode |program )?minutes (?:of [a-z ]+)?a week/g)) assert.ok(['24', '30'].includes(m[1]), `${f}: "${m[0]}"`);
    for (const m of src.matchAll(/(\d+) minutes a day (?:of all screens|in care|or less)/g)) assert.ok(f === 'family-library.js' && /or less/.test(m[0]), `${f}: "${m[0]}" (the in-care default is 30 minutes a week)`);
    assert.doesNotMatch(src, /the most screen time we ever ask for|Every classroom is designed to stay within 30 minutes a week/, f);
    assert.doesNotMatch(src, /The AAP suggests no more than 1 hour a day/, f + ': 2016 AAP figure is not presented as current guidance');
    assert.doesNotMatch(src, /Caring for Our Children[^.]{0,80}30 minutes a week/, f + ': the 30-minute weekly figure is not CFOC 4th edition');
  }
  const s = site();
  const watch = text(s.render('watch'));
  assert.match(watch, /Scheduled minutes are not a limit/);
  for (const l of ['Scheduled program minutes', 'Weekly program ceiling', 'In-care all-screens ceiling']) assert.match(watch, new RegExp(l));
  assert.match(watch, /at most 24 a week, under a 30-minute weekly ceiling/);
  const v = read('views.js'), faq = v.slice(v.indexOf("['How much screen time does the program use?'"), v.indexOf("['Do we need the internet to teach?'"));
  assert.match(faq, /Scheduled program minutes: at most 24 a week/);
  assert.match(faq, /never more than 30 minutes of Futures Friends episodes in a week, and no more than 30 minutes a week of all screens in care/);
  assert.match(read('features.js'), /NO_SCREENS = room => room === 'Twos Room'/, 'the twos room has no episode allowance');
});

test('external screen guidance links point at the verified sources', () => {
  assert.match(read('whole-child.js'), /cfoc: 'https:\/\/nrckids\.org\/files\/CFOC4%20pdf-%20FINAL\.pdf'/);
  assert.doesNotMatch(read('whole-child.js'), /crosswalk/i, 'the 2nd-edition crosswalk does not contain standard 2.2.0.3');
  const F = read('family-library-data.js');
  assert.match(F, /aap2026: \['AAP policy statement \(Pediatrics, January 2026\)/);
  assert.match(F, /cfoc: \['Caring for Our Children, 4th edition, standard 2\.2\.0\.3/);
  for (const g of M.guidance) assert.match(g.url, /^https:\/\//, g.body);
  assert.match(M.accessed, /^2026-10-05$/);
});

test('index.html loads the manifest before pricing and release-truth after it, with cache-busting versions', () => {
  const html = read('index.html');
  const v = f => { const m = new RegExp(`<script src="${f.replace(/[.]/g, '\\.')}\\?v=(\\d+)"></script>`).exec(html); assert.ok(m, f); return [Number(m[1]), html.indexOf(m[0])]; };
  const [mv, mi] = v('release-manifest.js'), [pv, pi] = v('pricing-all-in.js'), [rv, ri] = v('release-truth.js'), [, fi] = v('features.js');
  assert.ok(mv >= 1 && rv >= 1 && pv >= 2);
  assert.ok(mi < pi && pi < ri && fi < ri, 'manifest, then pricing, then release-truth (after features.js)');
  assert.match(html, /<link rel="stylesheet" href="release-truth\.css\?v=\d+">/);
  for (const [f, min] of [['views.js', 30], ['features.js', 19], ['data.js', 11], ['academy-lms.js', 6], ['whole-child.js', 6], ['family-library.js', 3], ['family-library-data.js', 3], ['route-meta.js', 8]]) assert.ok(v(f)[0] >= min, `${f} version bumped`);
  assert.ok(fs.existsSync(path.join(ROOT, 'tools/build-release-manifest.mjs')));
});
