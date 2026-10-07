/* Futures Friends Unit 1 on the public site (wave 7 GATE 2026-10-06; IP lockdown, owner decision 2026-10-07: "I don't want to give away
   our full curriculum to our competitors").
   - PUBLIC #unit-1 (any #unit-1/<day> lands here too): a curriculum SUMMARY for families and programs, built only from the facts in
     curriculum-gate.js (FFGate.U1: titles, the four weeks, counts) and the release manifest's status labels, plus ONE watermarked sample
     day packet and a few cover thumbnails (FFGate.SAMPLE). It links no other day plan, packet, Start Monday file, classroom printable or
     family card, and loads no lesson data: none of it is on this website any more.
   - TEACHER PORTAL "Curriculum" tab (portal.js calls FFUnit1.portalView()): an honest access card. The full program (every day's plan,
     the packets, Units 2 to 4) lives in the private platform repo; licensed centers request access, and until the Futures Hub is hosted
     staff access is through Futures Learning Center. No fake login.
   Copy rule (owner): claim only what is true today. Nothing in Unit 1 is reviewer-approved, so it says Draft; episodes, printed books and
   plush are "Not produced yet". Entry bands on #curriculum and #for-centers point at the summary. */
(function () {
'use strict';
if (typeof V === 'undefined' || typeof CH === 'undefined' || typeof KEYS === 'undefined') return;

const LABEL = { circle: 'Morning circle', 'picture-talk': 'Picture-talk story', 'friends-live': 'Friends Live', activity: 'Connected activity',
  outside: 'Outdoor activity', move: 'Movement', zones: 'Learning zones', story: 'Read-aloud', meal: 'Eat the Rainbow at the table',
  family: 'Family share (optional)', goodbye: 'Closing and take-home' };
const STATUS = { ready: 'Ready', draft: 'Draft', unavailable: 'Not produced yet', approved: 'Approved' };
const BANDS = { twos: 'Twos', threes: 'Threes', prek: 'Pre-K' };
let day = null;

const G = () => window.FFGate || { staff: () => false, load: () => false, U1: null, SAMPLE: null, ACCESS: null };
// Character art from the plush library (FFPlush, plush-cast.js): the display size in the attributes, 480/960 by srcset.
const art = (k, h = 120) => window.FFPlush.img(k, { alt: '', h, fixed: true });
const chip = (s, extra = '') => `<span class="u1-chip u1-${s}">${STATUS[s] || esc(s)}${extra}</span>`;
// Units written day by day after Unit 1 (wave 11, draft): only their numbers are public, never their content.
const written = () => ((G().U1 && G().U1.written) || []);
const writtenTxt = () => { const w = [1, ...written()]; return w.length === 1 ? 'Unit 1 is' : `Units ${w.slice(0, -1).join(', ')} and ${w[w.length - 1]} are`; };
const restTxt = () => `Units ${written().length + 2} to 12`;
const lnk = (href, t, cls = 'btn gold') => `<a class="${cls}" href="#${href}">${t}</a>`;

// ---------------------------------------------------------------- wave 10: the curriculum identity on the web (same system as the PDFs:
// felt story-world surfaces, the stitched thread, the drawn icon set from tools/ff_brand.py, the cast in recurring roles, labelled)
const ICONS = 'img/curriculum/icons.svg';
const ic = (n, cls = 'u1-ic') => `<svg class="${cls}" aria-hidden="true" focusable="false"><use href="${ICONS}#i-${n}"></use></svg>`;
const BLOCK_ICON = { circle: 'circle', 'picture-talk': 'picture-talk', 'friends-live': 'friends-live', activity: 'activity', outside: 'outside',
  move: 'move', zones: 'zones', story: 'story', meal: 'meal', family: 'home', goodbye: 'goodbye' };
const LOOP_ICON = { Watch: 'watch', Talk: 'talk', Do: 'activity', Move: 'move', Explore: 'observe', 'Take home': 'home' };
const P = () => (window.FFPlush && window.FFPlush.P) || {};
const scaleOf = k => (P()[k] && P()[k].scale) || 0.6;
// characters on one felt-grass ground line, one height unit for children and grown-ups (DESIGN.md)
// the row scales as one: every height is calc(--u x lineup_scale), --u set per breakpoint in unit-1.css so it never overflows
const stage = (slugs, unit, cls = '') => `<div class="u1-caststage ${cls}" style="--n:${slugs.length}" aria-hidden="true">${slugs.map(k => window.FFPlush.img(k, { alt: '', h: Math.round(unit * scaleOf(k)), fixed: true, style: `height:calc(var(--u) * ${scaleOf(k)})` })).join('')}</div>`;
const ROLES = [['ms-june', 'Ms. June', 'Teacher notes: the teacher\'s voice', 'booker'], ['principal-hazel', 'Principal Hazel', 'Routines and safety', 'zuri'],
  ['mr-moss', 'Mr. Moss', 'Setting up the room and supplies', 'bop'], ['ms-fern', 'Ms. Fern', 'Art and messy play', 'lumi'],
  ['tilly', 'Classmates', 'Show what an activity looks like', 'booker'], ['bruno', 'Grown-ups', 'On every family take-home card', 'gold']];
const av = (k, tone) => `<span class="u1-av" style="--t:var(--u1-felt-${tone})">${window.FFPlush.img(k, { alt: '', h: 150, fixed: true })}</span>`;
function rolesHtml(h, id) {
  return `<section class="wc-sec u1-roles" aria-labelledby="${id}"><div class="wrap">
   <div class="wc-head"><span class="wc-kick">The cast, in their roles</span><h2 id="${id}">${h}</h2>
    <p>Every packet, card and printable uses the same characters for the same jobs, so a teacher always knows where to look. All of them are story-world characters, not staff.</p></div>
   <ul class="u1-rolelist">${ROLES.map(([k, n, r, t]) => `<li>${av(k, t)}<b>${esc(n)}</b><small>${esc(r)}</small><span class="u1-castlabel">Story-world character</span></li>`).join('')}</ul></div></section>`;
}
const weekTabs = (W, sub) => `<ul class="u1-tabs">${W.map(w => `<li style="--t:var(--u1-felt-${w.lead})"><span class="u1-tab">Week ${w.week}</span>${art(w.lead, 104)}<div><span>${w.pillars.map(esc).join(' + ')}</span><b>${esc(w.theme)}</b><small>${sub(w)}</small></div></li>`).join('')}</ul>`;

// The Teacher Portal's Curriculum tab: what a licensed center gets (counts only) and the honest way to ask for it. Never the content.
function accessHtml() {
  const S = G().U1, A = G().ACCESS || {}, f = S ? S.files : {};
  return `<section class="card u1-locked" aria-labelledby="u1-lock-h">
   <span class="u1-lockchip">Licensed centers</span>
   <h3 id="u1-lock-h">The full curriculum is for licensed centers</h3>
   <p class="small">${esc(A.note || 'Licensed centers get the full program.')} The full plans are not on this website.</p>
   ${S ? `<p class="small"><b>What a licensed center receives</b></p><ul class="u1-lockcount">
    <li><b>${S.days}</b> teaching days in Unit 1, and Units ${S.written.join(', ')} written day by day (draft)</li><li><b>${S.activities}</b> Unit 1 activities, each with versions for twos, threes and pre-K</li>
    <li><b>${f.day}</b> daily teacher packets and <b>${f.bundle}</b> Start Monday files</li><li><b>${f.story}</b> story sets, classroom printables and family take-home cards</li>
    <li><b>${S.fileCount}</b> Unit 1 files, <b>${S.pages}</b> pages, all ${chip('draft')}</li></ul>` : ''}
   <div class="u1-lockacts"><a class="btn gold" href="#${esc(A.route || 'contact')}">Request access</a><a class="btn soft" href="#unit-1">See the summary and a sample day</a></div>
   <p class="note">This is the sample preview of the Teacher Portal. No one signs in here yet.</p></section>`;
}

function portalView() { return accessHtml(); }

// ---------------------------------------------------------------- the public summary (#unit-1): facts, no lesson text
const AGES = [['Twos', 'Ages 2 to 3', 'Pointing, naming, matching colors, simple songs and short, hands-on turns.', 'booker'],
  ['Threes', 'Ages 3 to 4', 'Retelling, counting, sorting, asking questions and practicing routines on their own.', 'zuri'],
  ['Pre-K', 'Ages 4 to 5', 'Letters and sounds, counting and patterns, predicting and testing, and kindergarten-readiness skills.', 'bop']];
function statusHtml() {
  const R = window.FFRelease, A = window.FFReleaseData && window.FFReleaseData.assets;
  if (!R || !A) return '';
  const row = (id, what) => A[id] ? `<li data-asset="${esc(id)}"><b>${esc(what)}</b> ${R.chip(id)} <span>${esc(R.APPROVAL[A[id].approval] || '')}</span></li>` : '';
  return `<ul class="u1s-status">${row('curriculum-unit1-days', 'Unit 1 daily plans, for educators')}${row('curriculum-units-2-12', written().length ? `Unit${written().length > 1 ? 's' : ''} ${written().join(', ')} daily plans (draft) and ${restTxt()}: outlined week by week` : 'Units 2 to 12: outlined week by week')}${row('curriculum-binder', 'Printed curriculum binder')}</ul>
   <p class="wc-note">From the release list${R.data && R.data.version ? ', version ' + esc(R.data.version) : ''}. Draft means written but not yet approved by an early-childhood reviewer.</p>`;
}
// The one public sample: Day 9's teacher packet, every page watermarked "Sample - licensed centers receive the full program".
function sampleHtml() {
  const X = G().SAMPLE;
  if (!X) return '';
  return `<section class="wc-sec band-paper u1s-sample" id="u1s-sample" aria-labelledby="u1s-sample-h"><div class="wrap">
   <div class="wc-head"><span class="wc-kick">Sample day</span><h2 id="u1s-sample-h">Day ${X.day}: ${esc(X.title)}</h2>
    <p>One full teacher packet, so you can see how a day is written: supplies, every block with its three age versions, teacher words and the family card. Sample: licensed centers receive the full program. ${chip('draft')}</p></div>
   <ul class="u1-files">${X.thumbs.map((t, i) => `<li class="u1-file"><img src="${esc(t)}" alt="Page ${i === 0 ? 1 : 3} of the sample Day ${X.day} teacher packet, marked Sample." width="150" height="194" loading="lazy" decoding="async"></li>`).join('')}
    <li class="u1-file"><div><a href="${esc(X.path)}" download>Sample: Day ${X.day} teacher packet</a><span>PDF · ${X.pages} pages · watermarked sample · ${chip('draft')}</span></div></li></ul>
   <p class="wc-note">Licensed centers receive all ${(G().U1 || {}).days || 20} days, the Start Monday files, story sets, classroom printables and family cards. <a class="rl" href="#contact">Request access</a></p></div></section>`;
}

function summaryHtml() {
  const S = G().U1;
  if (!S) return '';
  const units = typeof D !== 'undefined' && D.units ? D.units.length : 12;
  const loop = typeof FFH_LOOP !== 'undefined' ? FFH_LOOP : [];
  return `<div class="wc u1 u1s">
  <header class="wc-hero u1-hero u1-castfelt"><div class="wrap wc-hero-grid">
   <div class="wc-hero-copy"><span class="wc-kick">Curriculum summary · Unit 1 at a glance</span>
    <h1>Welcome to Futures: <span>Meet the Friends</span></h1>
    <p class="lede">The first month of the Futures Friends curriculum for twos, threes and pre-K: 4 weeks, ${S.days} teaching days and ${S.activities} activities. This page is the summary for families and programs, with one sample day. The full day-by-day plans are for licensed centers.</p>
    <ul class="u1-facts"><li>${chip('draft')} Not yet reviewed</li><li>No screen or internet needed</li><li>Full plans: licensed centers</li></ul>
    <div class="wc-acts"><a class="btn gold" href="#contact">Request the full program</a><button type="button" class="btn ghost" data-anchor="u1s-sample">See a sample day</button></div></div>
   <div class="u1-castrow">${stage(['principal-hazel', 'ms-june', 'lumi', 'booker-hero', 'zuri', 'bop', 'mr-moss'], 250)}<span class="u1-castlabel u1-castlabel-dark">Story-world characters</span></div></div></header>
  <section class="wc-sec u1s-year" aria-labelledby="u1s-year-h"><div class="wrap">
   <div class="wc-head"><span class="wc-kick">The year</span><h2 id="u1s-year-h">${units} monthly units, ${units * 4} theme weeks</h2>
    <p class="lede">Each month has a theme and four weeks, each week led by one friend. ${writtenTxt()} written day by day (draft); ${restTxt()} are outlined week by week. The full plans are for licensed centers. <a class="rl" href="#curriculum">See the year at a glance</a></p></div></div></section>
  <section class="wc-sec band-paper tx-felt u1s-weeks" aria-labelledby="u1-weeks-h"><div class="wrap">
   <div class="wc-head"><span class="wc-kick">Unit 1 · 4 weeks</span><h2 id="u1-weeks-h">One friend leads each week</h2><p>Each friend brings a value and two of the program's pillars, and each week ends with a celebration.</p></div>
   ${weekTabs(S.weeks, w => `${esc(w.value)} · ends with ${esc(w.celebration)}`)}</div></section>
  <section class="wc-sec u1s-day" aria-labelledby="u1s-day-h"><div class="wrap">
   <div class="wc-head"><span class="wc-kick">A day</span><h2 id="u1s-day-h">What a day looks like: six steps</h2><p>Screens are optional: every episode slot also runs as a picture-talk story with puppets.</p></div>
   ${window.FFLoopWidget ? window.FFLoopWidget.html(loop) : `<ol class="u1s-steps">${loop.map(([n, d, c], i) => `<li style="--c:var(--${c})"><span aria-hidden="true">${ic(LOOP_ICON[n] || 'star', 'u1-ic')}</span><b>${esc(n)}</b><small>${esc(d)}</small></li>`).join('')}</ol>`}</div></section>
  ${rolesHtml('The same characters, the same jobs', 'u1s-roles-h')}
  <section class="wc-sec band-paper u1s-ages" aria-labelledby="u1s-ages-h"><div class="wrap">
   <div class="wc-head"><span class="wc-kick">By age</span><h2 id="u1s-ages-h">One plan, three age versions</h2><p>Every activity has a version for each age band, so mixed-age rooms and home daycares use the same day.</p></div>
   <ul class="u1s-ages-list">${AGES.map(([h, a, p, k]) => `<li style="--c:var(--wc-${k})"><span>${a}</span><b>${h}</b><small>${p}</small></li>`).join('')}</ul></div></section>
  <section class="wc-sec u1s-taste" aria-labelledby="u1s-taste-h"><div class="wrap u1s-taste-grid">
   <div class="wc-head"><span class="wc-kick">A taste of the month</span><h2 id="u1s-taste-h">Three of the ${S.days} days</h2><p>Titles only; Day 9 is the sample below. The other plans are for licensed centers.</p></div>
   <ul class="u1s-titles">${S.sample.map(([n, t]) => `<li><span>Day ${n}</span><b>${esc(t)}</b></li>`).join('')}</ul></div></section>
  <section class="wc-sec band-paper u1s-families" aria-labelledby="u1s-fam-h"><div class="wrap">
   <div class="wc-head"><span class="wc-kick">For families</span><h2 id="u1s-fam-h">How families stay connected</h2></div>
   <ul class="u1s-cards">
    <li><b>Every day ends with a take-home</b><small>A question to ask at pickup and a short activity to try at home, matched to that day in class.</small></li>
    <li><b>The week's activities, in the Family Portal</b><small>Families enrolled at a Futures Friends program see the week's family activities after they sign in. <a class="rl" href="#this-week">This week with the friends</a></small></li>
    <li><b>Futures at Home, free for everyone</b><small>Storybooks, activities and printables for any family, no account needed. <a class="rl" href="#at-home">Futures at Home</a></small></li></ul></div></section>
  ${sampleHtml()}
  <section class="wc-sec u1s-get" aria-labelledby="u1s-get-h"><div class="wrap">
   <div class="wc-head"><span class="wc-kick">For centers and home daycares</span><h2 id="u1s-get-h">What a program receives</h2><p>Counted from the release files. Licensed centers receive all of it; this website shows the summary and one sample day.</p></div>
   <ul class="u1s-counts"><li><b>${S.days}</b><span>teaching days</span></li><li><b>${S.activities}</b><span>activities with three age versions</span></li><li><b>${S.files.day}</b><span>daily teaching plans</span></li><li><b>${S.files.bundle}</b><span>ready-to-teach day kits, one per day</span></li><li><b>${S.files.story}</b><span>story sets with read-alouds</span></li><li><b>${S.fileCount}</b><span>printable files in all (${S.pages} pages)</span></li></ul>
   <figure class="u1-binder"><img src="img/curriculum/u1-binder-mockup.webp" alt="Design mockup of the Unit 1 binder: a navy felt cover with the Futures Friends plush logo, Unit 1, the four week patches and the cast standing on felt grass, with colored tab dividers behind it." width="1200" height="1157" loading="lazy" decoding="async">
    <figcaption>Design mockup. The printed binder is not produced yet.</figcaption></figure>
   <figure class="u1-binder"><img src="img/curriculum/sample/u1-binder-flatlay.webp" alt="Design mockup of the Unit 1 binder laid flat: front cover, spine, back cover and the eight colored tab dividers." width="960" height="906" loading="lazy" decoding="async">
    <figcaption>Binder cover, spine and tabs laid flat (design mockup).</figcaption></figure>
   ${statusHtml()}</div></section>
  <section class="wc-sec band-paper u1-ask" aria-labelledby="u1-ask-h"><div class="wrap u1s-cta">
   <div class="u1s-door"><span class="wc-kick">Licensed centers</span><h2 id="u1-ask-h">Licensed centers get the full program</h2><p>Every day's plan, the packets, the Start Monday files and the printables. Ask us for access. The Futures Hub is not hosted yet, so staff access is through Futures Learning Center for now.</p><a class="btn gold" href="#contact">Request access</a></div>
   <div class="u1s-door"><span class="wc-kick">Centers and families</span><h2>Bring Futures Friends to your program</h2><p>Ask a person about your rooms and ages, or visit our pilot center in Independence, Missouri.</p><div class="wc-acts"><a class="btn navy" href="#contact">Talk to a real person</a><a class="btn soft" href="#enroll">Ask about a tour</a></div></div></div></section></div>`;
}

// #unit-1 and any old #unit-1/<day> link land on the summary.
V['unit-1'] = () => summaryHtml();

// ---------------------------------------------------------------- entry bands (no main-navigation change): they point at the summary
function band(where) {
  const S = G().U1 || { days: 20, activities: 161 };
  const copy = where === 'curriculum'
    ? ['Unit 1 at a glance', 'The first month, in summary', `Four weeks, ${S.days} teaching days and ${S.activities} activities for twos, threes and pre-K. Read the summary and a sample day; licensed centers receive the full plans.`]
    : ['See the curriculum before you talk to us', 'Unit 1 at a glance: the first month', `Four weeks led by Booker, Lumi, Zuri and Bop, ${S.days} teaching days, three age versions of every activity and a family take-home each day. Draft, clearly labeled. See a sample day; licensed centers receive the full plans.`];
  return `<section class="wc-callout wc-callout-slim u1-band" aria-labelledby="u1-band-${where}"><div class="wrap wc-cu"><span class="wc-heads wc-heads-lg" aria-hidden="true">${KEYS.map(k => `<img src="${img(k)}" alt="" width="62" height="62" loading="lazy" decoding="async">`).join('')}</span>
   <div><span class="wc-kick">${copy[0]}</span><h2 id="u1-band-${where}">${copy[1]}</h2><p>${copy[2]}</p></div>${lnk('unit-1', 'See the Unit 1 summary')}</div></section>`;
}
function insertBefore(route, marker, html) {
  const base = V[route];
  if (typeof base !== 'function') return;
  V[route] = function () { const out = base.apply(this, arguments), at = out.indexOf(marker); return at < 0 ? out + html() : out.slice(0, at) + html() + out.slice(at); };
}
insertBefore('curriculum', '<section class="ex-activities"', () => band('curriculum'));
insertBefore('for-centers', '<section', () => band('centers'));

window.FFUnit1 = { band, portalView, summary: summaryHtml, locked: accessHtml, sample: sampleHtml, LABEL };
})();
