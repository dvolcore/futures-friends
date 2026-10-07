// Reevaluation 2026-10-05, tickets E1, E2, E3, E8, E9 (tag ECOMM): one release manifest feeds every commercial route, today's launch
// package is apart from the future annual bundle, every priced item states delivery, start and billing, no "complete program" or
// "all-in" overclaims, competitor figures carry their basis, and every "open soon" form still reaches a person by phone or email.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { site, read, text, ROOT } = require('./site-vm');

const M = require('../release-manifest.js');
const P = require('../pricing-all-in.js');
const C = M.commercial;
const LATE = ['plush-cast.js', 'advisor-profiles.js', 'curriculum-gate.js', 'intake.js', 'whole-child.js', 'teacher-standard.js', 'unit-1.js', 'futures-at-home-signup.js', 'journey.js', 'premium.js', 'experience.js', 'home-calm.js', 'release-strip.js'];   // index.html order of the files that shape these routes
function full() {
  const c = site();
  c.addEventListener = () => {};
  for (const f of LATE) vm.runInContext(read(f), c, { filename: f });
  return c;
}
const S = full();
const ROUTES = S.FFRelease.STRIP_ROUTES;
const stripOf = html => { const i = html.indexOf('<section class="rt-strip"'); return i < 0 ? '' : html.slice(i, html.indexOf('</section>', i) + 10); };
const plain = h => text(h).replace(/&#39;/g, "'");
const noEvidence = s => s.replace(/<figure class="rt-ev[\s\S]*?<\/figure>/g, '').replace(/data-route="[^"]+"/, '');
const AV = { available_now: 'available_now', at_launch: null, planned: null };

test('E2: the status strip sits at the top of every commercial route, identical everywhere and driven by the manifest', () => {
  for (const r of ['for-centers', 'for-home', 'pricing', 'curriculum', 'options', 'quote', 'store', 'for-families', 'unit-1']) assert.ok(ROUTES.includes(r), r);
  // Wave 4 calm Home: the strip moved off Home (it stays on every commercial route above); Home keeps one quiet status line from the
  // same manifest that links to #pricing, where the strip sits under the hero (tests/w4-home.test.js checks that line).
  assert.ok(!ROUTES.includes('home'), 'no status strip on Home');
  const line = S.window.FFHomeCalm.status();
  assert.match(line, new RegExp(`data-release-version="${M.version.replace(/\./g, '\\.')}"`), 'Home: the status line names the same manifest version');
  assert.match(line, C.ordering_open ? /Ordering is open/ : /Ordering opens soon/, 'Home: ordering state read from the manifest');
  assert.match(line, /href="#pricing"/, 'Home: links to the strip on #pricing');
  assert.doesNotMatch(line, /rt-strip|rt-ev|\.pdf/, 'Home: a line, not the strip');
  let first = null;
  for (const r of ROUTES) {
    const html = S.render(r), strip = stripOf(html);
    assert.ok(strip, r + ' has the strip');
    assert.equal((html.match(/id="rt-strip"/g) || []).length, 1, r + ': exactly one strip');
    const before = html.slice(0, html.indexOf('<section class="rt-strip"'));
    // wave 7 GATE: #unit-1 now renders its real hero in this harness (facts list, cast art, Draft chip), not a loading line
    assert.doesNotMatch(before, /class="fj-provider"|class="wc wc-centers"|id="rt-package"|class="pz-|class="u1-(?!hero|facts|cast|chip)/, r + ': nothing commercial above the strip, only the page hero');
    assert.match(before, /<h1|class="phero"|class="hero"|u1-hero|ex-hero/, r + ': the strip comes right after the hero');
    for (const [k, h] of [['available_now', 'Available now'], ['at_launch', 'Included at launch'], ['planned', 'Planned']]) {
      const col = strip.slice(strip.indexOf(`data-stage="${k}"`));
      assert.match(col, new RegExp(`<span class="rt-chip [a-z-]+">${h}</span>`), r + ' ' + h);
      const ids = [...col.slice(0, col.indexOf('</ul>')).matchAll(/<li data-asset="([a-z0-9-]+)">/g)].map(m => m[1]);
      assert.deepEqual(ids, C.strip[k].map(x => x[1]), `${r} ${k} lists the manifest items in order`);
      for (const id of ids) {
        if (k === 'available_now') assert.equal(M.assets[id].availability, 'available_now', id);
        else assert.notEqual(M.assets[id].availability, 'available_now', `${id} is not deliverable today, so it is never under Available now`);
      }
    }
    assert.match(text(strip), new RegExp(`version ${M.version.replace(/\./g, '\\.')}`), r + ' names the manifest version');
    if (first === null) first = noEvidence(strip); else assert.equal(noEvidence(strip), first, r + ': the same strip as every other route');
  }
  assert.ok(Object.values(AV));
});

test('E2: each strip carries one practical evidence item, next to the claim it supports, and sample data is labelled', () => {
  const SUPPORTS = { lesson: 'curriculum-unit1-days', family: 'family-library', workflow: 'hub-portals' };
  const kinds = new Set();
  for (const r of ROUTES) {
    const strip = stripOf(S.render(r));
    const ev = [...strip.matchAll(/<figure class="rt-ev[^"]*" data-evidence="([a-z]+)"/g)].map(m => m[1]);
    assert.equal(ev.length, 1, r + ': one evidence item');
    kinds.add(ev[0]);
    const li = strip.slice(strip.lastIndexOf('<li data-asset="', strip.indexOf('<figure class="rt-ev')));
    assert.match(li, new RegExp(`^<li data-asset="${SUPPORTS[ev[0]]}"`), `${r}: ${ev[0]} evidence sits on the ${SUPPORTS[ev[0]]} claim`);
    if (ev[0] === 'workflow') assert.match(strip, /<span class="rt-sample">Sample data<\/span>/, r + ': the screenshot says Sample data');
    for (const [, src] of strip.matchAll(/<img src="([^"]+)"/g)) assert.ok(fs.existsSync(path.join(ROOT, src)), src + ' exists');
    for (const [, href] of strip.matchAll(/href="(printables\/[^"]+)"/g)) assert.ok(fs.existsSync(path.join(ROOT, href)), href + ' exists');
  }
  assert.deepEqual([...kinds].sort(), ['family', 'lesson', 'workflow'], 'a lesson page, a teacher workflow and a family activity are all used');
  assert.match(stripOf(S.render('for-centers')), /Draft, not yet reviewed/);
});

test('E2: every route reads availability from the same manifest; no page says Unit 1 is still being packaged', () => {
  assert.equal(M.assets['curriculum-unit1-days'].availability, 'available_now');
  assert.equal(M.assets['curriculum-unit1-days'].approval, 'draft', 'packaged, still a draft');
  assert.match(M.assets['curriculum-unit1-days'].note, /twenty days of teaching plans[\s\S]*Draft[\s\S]*Teacher Portal[\s\S]*summary only/, 'owner 2026-10-06: the public note describes Unit 1 at summary level, never as a packet list');
  assert.doesNotMatch(M.assets['curriculum-unit1-days'].note, /teacher packets|printables/i);
  assert.notEqual(M.assets['curriculum-units-2-12'].availability, 'available_now');
  for (const r of [...ROUTES, 'watch', 'hub']) {
    const html = S.render(r);
    for (const m of html.matchAll(/<div class="rt-group" data-availability="([a-z_]+)">([\s\S]*?)<\/ul><\/div>/g))
      for (const [, id] of m[2].matchAll(/data-asset="([a-z0-9-]+)"/g)) assert.equal(M.assets[id].availability, m[1], `${r}: ${id}`);
    assert.doesNotMatch(text(html), /being packaged|is being updated and packaged/i, r);
  }
  for (const f of ['plush-cast.js', 'journey.js', 'release-manifest.js', 'unit-1.js', 'views.js']) assert.doesNotMatch(read(f), /being packaged/i, f);
});

test('E2/E9: no "complete program", "full year" or "all-in" overclaims on any commercial route or in the buyer copy', () => {
  const BAD = [/complete (early learning |character-led )?program/i, /\ball[- ]in\b/i, /full year of (learning|lessons)/i, /Every price, all in/i];
  for (const r of [...ROUTES, 'enroll', 'hub', 'watch', 'friends']) {
    const t = text(S.render(r));
    for (const re of BAD) assert.doesNotMatch(t, re, `${r}: ${re}`);
  }
  for (const f of ['plush-cast.js', 'views.js', 'features.js', 'journey.js', 'pricing-all-in.js', 'release-truth.js', 'store.js', 'route-meta.js', 'premium.js'])
    for (const re of BAD) assert.doesNotMatch(read(f).replace(/\/\*[\s\S]*?\*\//g, ''), re, `${f}: ${re}`);
  const pricing = text(S.render('pricing'));
  assert.match(pricing, /Published package prices before tax/);
  assert.match(pricing, /First year, before tax/);
});

test('E1: the proposed launch package is built only from what is real today, priced only from existing catalog lines', () => {
  const L = C.launch_package;
  assert.equal(L.status, 'proposed'); assert.equal(L.label, 'Proposed, owner to confirm');
  for (const [label, id] of L.items) assert.ok(M.assets[id].availability === 'available_now' || M.assets[id].family === 'service', `${label}: real today or a person's time`);
  for (const id of ['curriculum-units-2-12', 'hub-portals', 'cred-l1', 'episodes-season-1']) assert.ok(L.excludes.includes(id), id + ' is excluded from the launch package');
  assert.equal(L.items.some(([, id]) => /^cred-|^training|^course/.test(id)), false, 'no unfinished training is sold in the launch package');
  for (const p of L.prices) { assert.equal(p.src, 'cat26'); assert.ok(P.DOCS[p.src]); }
  assert.deepEqual(L.prices.map(p => p.amount), [150, 750], 'the catalog prices for a live virtual session and an on-site launch day');
  const html = S.render('pricing'), sec = html.slice(html.indexOf('id="launch"'), html.indexOf('id="annual"'));
  assert.ok(html.indexOf('id="launch"') > 0 && html.indexOf('id="launch"') < html.indexOf('id="annual"'), 'today\'s offer comes first, apart from the annual bundle');
  assert.match(sec, /Proposed, owner to confirm/);
  assert.match(sec, /data-src="cat26"[^>]*>\$150</); assert.match(sec, /data-src="cat26"[^>]*>\$750</);
  for (const h of ['Delivered today', 'Not included', 'Start date', 'Recurring billing']) assert.match(sec, new RegExp(`<dt>${h}</dt>`), h);
  assert.match(text(sec), /No monthly fee and no 12-month agreement/);
  assert.match(text(sec), /Unit 1 teaching plans for Days 1 to 20, for your educators in the Teacher Portal/, 'the launch package names what is delivered at summary level (owner 2026-10-06)');
  assert.doesNotMatch(text(sec), /teacher packets|\(PDF\)/, 'no packet or PDF inventory on the public pricing page');
  assert.match(sec, /<div class="rt-group" data-stage="at_launch"><p class="rt-h"><span class="rt-chip rt-dev">Included at launch<\/span>/);
});

test('E1: every priced package lists the exact files delivered today, what is not delivered until made, its start date and when billing begins', () => {
  const check = (html, key, where) => {
    const i = html.indexOf(`<dl class="rt-terms" data-sku="${key}">`);
    assert.ok(i >= 0, `${where}: terms for ${key}`);
    const dl = html.slice(i, html.indexOf('</dl>', i));
    for (const h of ['Delivered today', 'Not delivered until made', 'Start date', 'Recurring billing']) assert.match(dl, new RegExp(`<dt>${h}</dt>`), `${where} ${key}: ${h}`);
    const items = M.packages[key].items, later = items.filter(([, id]) => M.assets[id].availability !== 'available_now');
    assert.match(dl, new RegExp(`data-excluded="${later.length}"`), `${where} ${key}: every planned exclusion is listed`);
    for (const [label] of later) assert.ok(plain(dl).includes(label), `${where} ${key}: excludes "${label}"`);
    for (const [, id] of items.filter(([, id]) => M.assets[id].availability === 'available_now')) for (const f of M.assets[id].delivers) assert.ok(plain(dl).includes(f), `${where} ${key}: delivers ${f}`);
    if (C.package_terms[key].recurring === 'annual') {
      assert.match(dl, /<dt>Depends on unfinished work<\/dt>/, `${where} ${key}: the annual obligation names the unfinished work it depends on`);
      for (const id of C.annual.depends_on) assert.match(dl, new RegExp(M.assets[id].name.split(/[:(]/)[0].trim().replace(/[.()]/g, '\\$&')), `${where} ${key}: ${id}`);
      assert.match(text(dl), /Proposed, owner to confirm: the monthly fee begins only when the Futures Hub is live for your program and Unit 2 is delivered/);
    }
  };
  const pricing = S.render('pricing');
  for (const t of P.TIERS) check(pricing, t.id, 'pricing');
  const options = S.render('options');
  for (const [k] of S.FFRelease.OPTIONS) check(options, k, 'options');
  for (const [route, keys] of Object.entries(S.FFRelease.AUDIENCE)) { const h = S.render(route); for (const k of keys) check(h, k, route); }
  check(S.render('quote'), 'welcome-box', 'quote');
  // the monthly lesson drop is its own line, tied to the unwritten units, never folded into "Unit 1 is available"
  for (const k of C.annual.packages) assert.ok(M.packages[k].items.some(([l, id]) => id === 'curriculum-units-2-12' && /monthly lesson drop/.test(l)), k);
  // the store: every kit and family item states delivery today, start and billing
  for (const r of ['shop-programs', 'shop-families']) {
    const h = S.render(r), n = r === 'shop-programs' ? S.FFStore.KITS.length : S.FFStore.FAMILY.length;
    assert.equal((h.match(/<p class="rt-terms rt-terms-line small" data-sku="store">/g) || []).length, n, r);
    assert.match(text(h), /Delivered today: nothing yet\. Starts: When ordering opens and each item is made/);
    assert.match(text(h), /Recurring billing: None: one-time orders\./);
  }
});

test('E9: the calculator and the written quote apply the same coverage rules; proposed prices carry one label everywhere', () => {
  const block = html => { const i = html.indexOf('<ul class="rt-coverage" data-rt-coverage>'); assert.ok(i >= 0); return html.slice(i, html.indexOf('</ul>', i) + 5); };
  const pricing = S.render('pricing'), calc = pricing.slice(pricing.indexOf('<div class="pz-out"'));
  const quote = S.render('quote');
  assert.equal(block(calc), block(quote), 'the same coverage list, word for word');
  for (const r of C.coverage) assert.ok(text(block(quote)).includes(r), r);
  assert.match(text(block(quote)), /before tax/);
  assert.match(text(calc), /estimate of a future bundle/);
  for (const r of ['pricing', 'quote', 'shop-programs', 'shop-families', 'for-centers', 'options']) assert.doesNotMatch(S.render(r), /[Pp]ending owner confirmation|pending final confirmation/, r);
  assert.match(S.render('shop-programs'), /proposed, owner to confirm/);
  assert.match(read('journey.js'), /Prices are proposed, owner to confirm/);
});

test('E8: every competitor figure shows its basis, and today\'s scope is compared with today\'s scope; the future bundle is kept apart', () => {
  for (const c of P.COMP) for (const [k] of P.BASIS) assert.ok(c[k] && String(c[k]).trim(), `${c.name}: ${k}`);
  for (const c of P.COMP.filter(c => c.url.includes('in.gov'))) assert.match(c.basis, /State (contract|price list)/, c.name + ' is a state contract price, not a public list price');
  assert.equal(P.COMP.find(c => /Scholastic/.test(c.name)).docDate, 'February 2024');
  const html = S.render('pricing'), cmp = html.slice(html.indexOf('id="pz-compare"'), html.indexOf('</section>', html.indexOf('id="pz-compare"')));
  for (const [, l] of P.BASIS) assert.equal((cmp.match(new RegExp(`<dt>${l}</dt>`, 'g')) || []).length >= P.COMP.length, true, l);
  const us = cmp.indexOf('data-scope="available"'), list = cmp.indexOf('class="pz-cmps"'), fut = cmp.indexOf('data-scope="future"');
  assert.ok(us > 0 && us < list && list < fut, 'available scope first, competitors, then the future estimate on its own');
  assert.match(text(cmp.slice(us, list)), /One month of curriculum \(Unit 1 of 12 planned\)/);
  assert.match(text(cmp.slice(fut)), /a future estimate, kept apart/);
  const calc = html.slice(html.indexOf('<div class="pz-out"'), html.indexOf('</form>') > 0 ? html.indexOf('id="pz-compare"') : undefined);
  assert.doesNotMatch(calc, /data-src="comp"/, 'the future-bundle calculator holds no competitor figures');
});

test('E3: every "Online requests open soon" dead end offers a working call and a prefilled email, with no personal data in the link', () => {
  const s = full(); const I = s.window.FFIntake;
  assert.equal(I.enabled(), false);
  const routes = vm.runInContext("Object.keys(V).filter(r => typeof V[r] === 'function')", s);
  const extra = [['job', 'teacher-1'], ['enroll', null], ['contact', null], ['quote', null]];
  let n = 0; const seen = new Set();
  for (const [r, a] of [...routes.map(r => [r, null]), ...extra]) {
    let html = ''; try { html = s.render(r, a); } catch (_) { continue; }
    if (typeof html !== 'string') continue;
    for (const m of html.matchAll(/<div class="ffi-soon" role="note" data-ffi-soon="([^"]*)">([\s\S]*?)<\/div><\/div>/g)) {
      n++; seen.add(m[1]);
      assert.match(m[2], /Online requests open soon/);
      assert.match(m[2], /href="tel:\+18169885661"/, `${r}: call`);
      const mail = (m[2].match(/href="(mailto:[^"]+)"/) || [])[1];
      assert.ok(mail, `${r}: email`);
      const u = new URL(mail.replace(/&amp;/g, '&'));
      assert.equal(u.pathname, 'info@futureslearningcenter.com', 'the flagship contact already on the site');
      assert.deepEqual([...u.searchParams.keys()], ['subject'], `${r}: only a subject line, no body`);
      const subject = u.searchParams.get('subject');
      assert.match(subject, /^Futures Friends website: [A-Z][A-Za-z -]+$/, `${r}: a fixed, per-form subject (${subject})`);
      assert.doesNotMatch(subject, /@|\d/, 'no address or number in the subject');
    }
    assert.doesNotMatch(html, /Online requests open soon(?![\s\S]{0,600}mailto:)/, `${r}: no open-soon text without the email action`);
  }
  assert.ok(n >= 6, `${n} open-soon blocks checked`);
  for (const w of ['tour requests', 'applications', 'job applications', 'Futures at Home sign-ups', 'weekly challenge sign-ups']) assert.ok(seen.has(w), w);
  const subjects = [...seen].map(I.subjectFor);
  assert.equal(new Set(subjects).size, subjects.length, 'each form type has its own subject');
  // a value typed by a visitor can never reach the link: the subject comes only from the form type
  assert.equal(I.mailtoFor('quote requests'), 'mailto:info@futureslearningcenter.com?subject=Futures%20Friends%20website%3A%20Quote%20request');
  assert.doesNotMatch(read('intake.js'), /mailto:[^`'"]*\$\{(?!e\(mailtoFor)/, 'no mailto is built from form fields');
});

test('the strip loads late (after journey.js and unit-1.js, before not-found.js and analytics.js) and changed files are cache-busted', () => {
  const html = read('index.html'), at = f => html.indexOf(`<script src="${f}?v=`);
  assert.ok(at('release-strip.js') > at('journey.js') && at('release-strip.js') > at('unit-1.js') && at('release-strip.js') > at('release-truth.js'));
  assert.ok(at('release-strip.js') < at('not-found.js') && at('not-found.js') < at('analytics.js'));
  const v = f => +(new RegExp(`${f.replace(/[.]/g, '\\.')}\\?v=(\\d+)`).exec(html) || [])[1];
  for (const [f, min] of [['experience.js', 8], ['views.js', 32], ['features.js', 22], ['intake.js', 5], ['journey.js', 2], ['store.js', 2], ['pricing-all-in.js', 3], ['release-truth.js', 2], ['release-manifest.js', 2], ['release-truth.css', 3], ['pricing-all-in.css', 2], ['release-strip.js', 2]])
    assert.ok(v(f) >= min, `${f} ?v=${v(f)} >= ${min}`);
  assert.doesNotMatch(read('release-strip.js'), /fetch\(|localStorage|sessionStorage|XMLHttpRequest/);
});
