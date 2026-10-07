/* Release truth (review ticket R8): what a buyer or family can actually receive today, read from release-manifest.js
   (generated from the CRM repo's docs/release/ASSET_MANIFEST.json). One scope for #pricing, #options, the audience pages
   and the quote page:
   - Every package item is a [label, assetId] pair from the manifest's packages, shown under "Available now",
     "In development" or "Coming later" by that asset's availability. Nothing here decides a status; the manifest does.
   - Approval words come only from the manifest: internally complete is never shown as approved, and nothing is shown
     as externally approved unless the manifest says so.
   - Hub features carry a feature state: built (goes live with the Hub), preview (sample data) or planned.
   - Screen time: scheduled program minutes are defined separately from the two ceilings (weekly program, in-care all-screens).
   Loaded after views.js, features.js and pricing-all-in.js (wraps V.watch and V.quote at load; V.options and the audience
   pages call FFRelease at render time). Exposes window.FFRelease for tests. */
(function () {
  'use strict';
  const R = (typeof window !== 'undefined' && window.FFReleaseData) || null;
  if (!R) return;
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const AVAIL = { available_now: ['Available now', 'rt-now'], in_development: ['In development', 'rt-dev'], coming_later: ['Coming later', 'rt-later'] };
  const ORDER = ['available_now', 'in_development', 'coming_later'];
  const APPROVAL = { not_started: 'Not started', draft: 'Draft', internally_complete: 'Finished by our team, not yet externally reviewed', externally_approved: 'Externally approved' };
  const FEATURE = { built_needs_go_live: ['Built, goes live with the Hub', 'rt-dev'], preview: ['Preview with sample data', 'rt-later'], planned: ['Planned', 'rt-later'] };
  const asset = id => R.assets[id] || null;
  const chip = id => { if (Array.isArray(id)) return [...new Set(id.map(chip))].join(' '); const a = asset(id); if (!a) return ''; const [t, c] = AVAIL[a.availability]; return `<span class="rt-chip ${c}">${t}</span>`; };
  const feature = id => { const a = asset(id); if (!a || !a.feature) return ''; const [t, c] = FEATURE[a.feature]; return `<span class="rt-chip ${c}" data-feature="${E(a.feature)}">${t}</span>`; };

  // A package's items grouped by availability. items: [[label, assetId], ...]
  function scope(items, { notes = true } = {}) {
    const groups = ORDER.map(k => [k, items.filter(([, id]) => asset(id) && asset(id).availability === k)]).filter(([, g]) => g.length);
    return `<div class="rt-scope">${groups.map(([k, g]) => `<div class="rt-group" data-availability="${k}"><p class="rt-h"><span class="rt-chip ${AVAIL[k][1]}">${AVAIL[k][0]}</span></p><ul class="pz-list rt-list">${g.map(([label, id]) => `<li data-asset="${E(id)}">${E(label)}${notes ? `<small class="rt-note">${E(asset(id).note)}</small>` : ''}</li>`).join('')}</ul></div>`).join('')}</div>`;
  }
  const pkg = (key, o) => R.packages[key] ? scope(R.packages[key].items, o) : '';
  const count = (key, k) => (R.packages[key] ? R.packages[key].items : []).filter(([, id]) => asset(id) && asset(id).availability === k).length;
  const LEGEND = '<p class="small muted rt-legend"><b>Available now</b>: you can receive it today. <b>In development</b>: a draft or partial build exists. <b>Coming later</b>: not started yet. A finished character drawing is not a finished book or episode, and a Futures Friends completion record is not state-approved training credit.</p>';

  // Audience and option pages: which packages each one sells.
  const AUDIENCE = { 'for-centers': ['starter', 'complete'], 'for-home': ['home'], 'for-prek': ['prek'], 'for-faith': ['starter', 'home'], 'for-employers': ['starter', 'complete'], 'for-families': ['family-free', 'family-kit'] };
  function packageSection(route) {
    const keys = AUDIENCE[route]; if (!keys) return '';
    return `<section class="band-paper rt-sec" id="rt-package"><div class="wrap"><div class="rt-head"><span class="px-kicker">WHAT YOU RECEIVE</span><h2>${route === 'for-families' ? 'What families can have today' : 'What the package includes today'}</h2><p class="lede">${route === 'for-families' ? 'The family library is free and ready now. The Family Welcome Kit opens later.' : 'Ordering opens soon. This is the exact scope of each package and where every item stands right now.'}</p></div>
 <div class="rt-pkgs">${keys.map(k => `<article class="rt-pkg" data-sku="${E(k)}"><h3>${E(R.packages[k].name)}</h3>${pkg(k)}${terms(k)}</article>`).join('')}</div>${route === 'for-families' ? '' : `<p class="small rt-legend">Want to start before these are made? See the <a href="#pricing">launch package</a> (${E(LABEL.toLowerCase())}): Unit 1 now, with a live session for your staff.</p>`}${LEGEND}</div></section>`;
  }
  const OPTIONS = [['starter', 'Center Starter'], ['complete', 'Center Complete'], ['home', 'Home Daycare'], ['prek', 'Pre-K and Head Start partnership'], ['classroom-kit', 'Classroom kit only'], ['hub-only', 'Futures Hub only'], ['family-free', 'Futures at Home (free)'], ['family-kit', 'Family Welcome Kit']];
  function optionsSection() {
    return `<section class="rt-sec" id="rt-options"><div class="wrap"><div class="rt-head"><span class="px-kicker">RELEASE STATUS</span><h2>What each option includes today</h2><p class="lede">Every option below lists the same items your written quote will list, each marked by what you can receive now.</p></div>
 <div class="rt-pkgs">${OPTIONS.map(([k, n]) => `<details class="rt-pkg"><summary><b>${E(n)}</b><span class="rt-counts">${ORDER.map(a => count(k, a) ? `<span class="rt-chip ${AVAIL[a][1]}">${count(k, a)} ${AVAIL[a][0].toLowerCase()}</span>` : '').join('')}</span></summary>${pkg(k)}${terms(k)}</details>`).join('')}</div>${LEGEND}</div></section>`;
  }

  // Screen time: one definition block, used on #watch and the quote page's FAQ answer.
  const ST = R.screenTime;
  const screenLines = () => [ST.scheduled_program_minutes, ST.weekly_program_ceiling, ST.in_care_all_screens_ceiling, ST.under_three];
  function screenBlock() {
    const g = R.guidance;
    return `<section class="band-paper rt-sec" id="rt-screen"><div class="wrap"><div class="rt-head"><span class="px-kicker">SCREEN TIME, DEFINED</span><h2>Scheduled minutes are not a limit</h2><p class="lede">The program schedules fewer minutes than its ceiling. Each number below means one thing.</p></div>
 <dl class="rt-screen">${screenLines().map(s => `<div><dt>${E(s.label)}</dt><dd><b>${s.value} ${E(s.unit)}</b><span>${E(s.definition)}</span></dd></div>`).join('')}</dl>
 <p class="small muted">These are Futures Friends standards; neither Kansas nor Missouri sets a screen-time limit, and a center's own stricter policy wins. Outside guidance, checked ${E(R.accessed)}: ${g.slice(0, 3).map(x => `<a href="${E(x.url)}" target="_blank" rel="noopener noreferrer">${E(x.body.split(',')[0].replace(/ \(.*$/, ''))}</a>`).join('; ')}.</p></div></section>`;
  }

  // ---------------------------------------------------------------- commercial terms (E1, E2, E9), all from the manifest's commercial block
  const C = R.commercial;
  const LABEL = C.price_label;                                         // "Proposed, owner to confirm": the one label for every proposed price or term
  const PROPOSED = `<span class="chip warn rt-proposed">${E(LABEL)}</span>`;
  const amt = (n, src, suffix) => (window.FFPricing && window.FFPricing.pz) ? window.FFPricing.pz(n, src, suffix || '') : `<span class="pz-amt" data-src="${E(src)}">$${Number(n).toLocaleString('en-US')}${E(suffix || '')}</span>`;
  const short = id => asset(id).name.split(/[:(]/)[0].trim();
  const termsOf = key => { const t = C.package_terms[key] || {}; return { start: t.start === 'annual' ? C.annual.start : t.start, recurring: t.recurring === 'annual' ? C.annual.proposed_billing : t.recurring, annual: t.recurring === 'annual' }; };
  // E1: every priced package says what is delivered today (the exact files), what is not delivered until made, when it starts and when
  // recurring billing begins. items defaults to the package's own list; the store passes the assets its kits are made of.
  function terms(key, items, opts = {}) {
    items = items || (R.packages[key] ? R.packages[key].items : []);
    const ready = items.filter(([, id]) => asset(id) && asset(id).availability === 'available_now');
    const later = items.filter(([, id]) => asset(id) && asset(id).availability !== 'available_now');
    const t = termsOf(key);
    if (opts.compact) return `<p class="rt-terms rt-terms-line small" data-sku="${E(key)}"><b>Delivered today:</b> ${ready.length ? ready.map(([, id]) => asset(id).delivers.map(E).join('; ')).join('; ') : 'nothing yet'}. <b>Starts:</b> ${E(t.start)} <b>Recurring billing:</b> ${E(t.recurring)}</p>`;
    const today = ready.length ? `<ul class="rt-files">${ready.map(([label, id]) => `<li data-asset="${E(id)}"><b>${E(label)}</b>${(asset(id).delivers || []).length ? `: ${asset(id).delivers.map(E).join('; ')}` : ''}</li>`).join('')}</ul>` : 'Nothing in this package can be delivered today.';
    return `<dl class="rt-terms" data-sku="${E(key)}">
 <div><dt>Delivered today</dt><dd>${today}</dd></div>
 <div><dt>Not delivered until made</dt><dd data-excluded="${later.length}">${later.length ? `${later.length} item${later.length > 1 ? 's' : ''}: ${later.map(([label]) => E(label)).join('; ')}. Nothing is shipped or charged separately for an item before it exists.` : 'Nothing: every item is available now.'}</dd></div>
 <div><dt>Start date</dt><dd>${E(t.start)}</dd></div>
 <div><dt>Recurring billing</dt><dd>${E(t.recurring)}</dd></div>
 ${t.annual ? `<div><dt>Depends on unfinished work</dt><dd>${C.annual.depends_on.map(id => `${E(short(id))} ${chip(id)}`).join('; ')}. ${E(C.annual.catalog_terms)}</dd></div>` : ''}</dl>`;
  }
  // E9: the coverage rules, one list for the calculator and the written quote.
  const coverage = () => `<ul class="rt-coverage" data-rt-coverage>${C.coverage.map(r => `<li>${E(r)}</li>`).join('')}</ul>`;
  // E1: the proposed launch package, priced only from existing catalog lines. Its items are either available now or a service a person
  // delivers at signing ("Included at launch"); the manifest build refuses anything else.
  const launchScope = L => { const now = L.items.filter(([, id]) => asset(id).availability === 'available_now'), at = L.items.filter(([, id]) => asset(id).availability !== 'available_now');
    const group = (attr, cls, h, list) => `<div class="rt-group" ${attr}><p class="rt-h"><span class="rt-chip ${cls}">${h}</span></p><ul class="pz-list rt-list">${list.map(([label, id]) => `<li data-asset="${E(id)}">${E(label)}</li>`).join('')}</ul></div>`;
    return `<div class="rt-scope">${group('data-availability="available_now"', 'rt-now', 'Available now', now)}${at.length ? group('data-stage="at_launch"', 'rt-dev', 'Included at launch', at) : ''}</div>`; };
  function launch(opts = {}) {
    const L = C.launch_package;
    return `<section class="rt-sec rt-launch" id="launch"><div class="wrap"><div class="rt-head"><span class="px-kicker">START NOW</span><h2>${E(L.name)}: teach Unit 1 now</h2><p class="lede">${E(L.who)}. ${PROPOSED}</p></div>
 <div class="rt-pkgs"><article class="rt-pkg" data-sku="launch"><h3>What it includes</h3>${launchScope(L)}
  <p class="small"><b>Optional:</b> ${L.optional.map(([label]) => E(label)).join('; ')}</p>
  <dl class="rt-terms" data-sku="launch"><div><dt>Price</dt><dd><ul class="rt-files">${L.prices.map(p => `<li data-asset="${E(p.asset)}">${E(p.label)}: ${amt(p.amount, p.src)} ${E(p.unit)} <small class="pz-src">Source: ${E(p.source)}</small></li>`).join('')}</ul>${PROPOSED}</dd></div>
   <div><dt>Delivered today</dt><dd><ul class="rt-files">${L.items.filter(([, id]) => asset(id).availability === 'available_now').map(([, id]) => `<li data-asset="${E(id)}">${asset(id).delivers.map(E).join('; ')}</li>`).join('')}</ul>${E(L.free)}</dd></div>
   <div><dt>Not included</dt><dd>${L.excludes.map(id => `${E(short(id))} ${chip(id)}`).join('; ')}</dd></div>
   <div><dt>Start date</dt><dd>${E(L.start)}</dd></div>
   <div><dt>Recurring billing</dt><dd>${E(L.billing)}</dd></div></dl></article></div>
 ${opts.note === false ? '' : `<p class="small muted rt-legend">The launch package is a proposal built from catalog prices that already exist; the owner has not confirmed it. The annual bundle below is a separate, future offer.</p>`}</div></section>`;
  }

  // E2: the status strip at the top of every commercial route, with one practical evidence item next to the claim it supports.
  // Home has no strip (wave 4 calm Home): it shows one quiet status line from this same manifest (home-calm.js) linking to #pricing.
  const EVIDENCE = { 'for-centers': 'lesson', 'for-home': 'lesson', 'for-prek': 'lesson', 'for-faith': 'lesson', 'for-employers': 'workflow',
    'for-families': 'family', curriculum: 'lesson', 'unit-1': 'family', options: 'workflow', pricing: 'lesson', quote: 'workflow', store: 'family',
    'shop-families': 'family', 'shop-programs': 'lesson' };
  const EVIDENCE_FOR = { lesson: 'curriculum-unit1-days', family: 'family-library', workflow: 'hub-portals' };
  function evidence(kind) {
    // Wave 7 GATE: the full curriculum is for educators (Teacher Portal), so the public evidence is the summary, never a packet page.
    if (kind === 'lesson') { const S = window.FFGate && window.FFGate.U1; return `<figure class="rt-ev rt-ev-act" data-evidence="lesson"><figcaption><b>See the work: Unit 1 at a glance.</b> ${S ? `${S.days} teaching days and ${S.activities} activities in four weeks, each with versions for twos, threes and pre-K. ` : ''}Draft, not yet reviewed. The full plans are for licensed centers; the summary shows one sample day. <a href="#unit-1">Read the Unit 1 summary</a></figcaption></figure>`; }
    if (kind === 'workflow') return `<figure class="rt-ev" data-evidence="workflow" data-sample="true"><span class="rt-sample">Sample data</span><img src="img/journey/teacher-today-600.webp" width="600" height="311" alt="Teacher Portal preview, Today: the lesson, the day's checklist, lunch and five made-up children to mark here or absent." loading="lazy" decoding="async"><figcaption><b>See the work: a teacher's day in the Hub preview.</b> Built and tested with made-up children; it goes live only when the Hub is hosted. <a href="#signin-teacher">Open the sample Teacher Portal</a></figcaption></figure>`;
    const F = window.FFFamily, a = F && Array.isArray(F.ACTS) ? F.ACTS.find(x => x.id === 'smell-the-flower') : null;
    return a ? `<figure class="rt-ev rt-ev-act" data-evidence="family"><figcaption><b>Try one tonight: ${E(a.t)}</b> (${+a.min} minutes, nothing to buy). ${E(a.say || '')} <a href="#activities/${E(a.id)}">Print it or find more for your child's age</a></figcaption></figure>`
      : `<figure class="rt-ev" data-evidence="family"><img src="printables/previews/calm-cards.png" alt="Lumi calm cards printable" loading="lazy" decoding="async" width="300" height="388"><figcaption><b>See the work:</b> a free printable family page. <a href="#at-home">Futures at Home</a></figcaption></figure>`;
  }
  const STAGES = [['available_now', 'Available now', 'rt-now'], ['at_launch', 'Included at launch', 'rt-dev'], ['planned', 'Planned', 'rt-later']];
  function strip(route) {
    const S = C.strip, kind = EVIDENCE[route] || 'lesson', anchor = EVIDENCE_FOR[kind];
    return `<section class="rt-strip" id="rt-strip" data-route="${E(route)}" aria-labelledby="rt-strip-h"><div class="wrap">
 <div class="rt-strip-head"><h2 id="rt-strip-h">${E(S.title)}</h2><p class="small">Ordering opens soon. Prices are published before tax and are ${E(LABEL.toLowerCase())}. <a href="#pricing">Launch package and prices</a></p></div>
 <div class="rt-strip-cols">${STAGES.map(([k, h, c]) => `<div class="rt-col" data-stage="${k}"><p class="rt-col-h"><span class="rt-chip ${c}">${h}</span>${k === 'at_launch' ? ` <span class="rt-col-note">${E(LABEL)}</span>` : ''}</p><p class="rt-def">${E(S.definitions[k])}</p>
  <ul>${S[k].map(([label, id, r]) => `<li data-asset="${E(id)}"><a href="#${E(r)}">${E(label)}</a>${id === anchor ? evidence(kind) : ''}</li>`).join('')}</ul></div>`).join('')}</div>
 <p class="rt-strip-src small muted">From the release list, version ${E(R.version)}: the same list on every page.</p></div></section>`;
  }
  const STRIP_ROUTES = Object.keys(EVIDENCE);

  const API = { legend: () => LEGEND, data: R, asset, chip, feature, scope, pkg, count, packageSection, optionsSection, screenBlock, AVAIL, APPROVAL, FEATURE, AUDIENCE, OPTIONS,
    LABEL, terms, coverage, launch, strip, evidence, STRIP_ROUTES, EVIDENCE };
  window.FFRelease = API;

  if (typeof V !== 'undefined') {
    // Wrap at load: these views are defined before this file and do not know about it.
    if (V.watch) { const w = V.watch; V.watch = (...a) => { const h = w(...a); const i = h.lastIndexOf('<section class="tight">'); return i > 0 ? h.slice(0, i) + screenBlock() + h.slice(i) : h + screenBlock(); }; }
    if (V.quote) { const q = V.quote; V.quote = (...a) => q(...a) + `<section class="rt-sec" id="rt-quote"><div class="wrap"><div class="rt-head"><span class="px-kicker">WHAT A QUOTE COVERS</span><h2>Your written quote uses this scope</h2><p class="lede">Each item on your quote is marked available now, in development or coming later, exactly as below. Every price is ${E(LABEL.toLowerCase())} until your quote is written.</p></div>
 <div class="rt-pkgs"><article class="rt-pkg" data-sku="coverage"><h3>What every quote covers</h3>${coverage()}</article><article class="rt-pkg" data-sku="welcome-box"><h3>${E(R.packages['welcome-box'].name)}</h3>${pkg('welcome-box')}${terms('welcome-box')}</article></div>${LEGEND}</div></section>${launch({ note: false })}`; }
  }
})();
