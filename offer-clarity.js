/* Futures Friends: offer clarity (external review, 2026-10-07, acted on before the investor meeting).
   Answers "what do you deliver every month, and who helps us use it?" and fills the gaps a reviewer found:
   - #membership (Centers): Your month with Futures Friends: six areas, each row with an honest status; what arrives ONCE, what RENEWS
     every month, what costs EXTRA; one support promise; multi-site quotes; the "Grow your enrollment" track for members.
   - #brand-kit (Centers): "[Center name], featuring Futures Friends" lockup generator (type a name, preview, download a PNG), usage rules,
     the kit assets with status, and the approval steps.
   - A compact "Your month" band on #for-centers, #for-home, #for-faith and #pricing (wraps the views, never edits their source).
   - #for-faith: program versions, schedules, mixed ages, rotating volunteers, shared rooms and pack-away, purchasing approval, traditions.
   - #enroll (families): the facts parents ask first, as clearly marked "Owner to provide" slots until the owner fills FLC_FACTS below;
     a team section that never invents people; "a day here" practices marked "Owner to confirm".
   - #support: hours, urgent route, kinds of help, launch sequence, replacement staff and church volunteers.
   - FFOffer.lvl / FFOffer.legend: Reminder vs Advisory warning vs Enforced restriction, used by the portals' staff-readiness screens.
   Honesty rules: statuses come from the release manifest where an asset exists (available_now -> Available now, in_development ->
   Launching with pilot, coming_later -> Planned); anything not in the manifest is a proposal and says so. No invented people, numbers,
   testimonials or hours. No curriculum lesson content (IP lockdown 2026-10-07). Bop's brand accent is purple #8236AE.
   Tagline: "Learn. Move. Explore. Belong." Sends nothing; stores nothing. */
(function () {
'use strict';
if (typeof V === 'undefined') return;
const W = window;
const E = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PHONE_ = '(816) 988-5661', TEL = '+18169885661', EMAIL_ = 'info@futureslearningcenter.com';
const TAGLINE = 'Learn. Move. Explore. Belong.';
const REL = W.FFReleaseData || null;
const hero = (e, t, l, o) => (typeof phero === 'function' ? phero(e, t, l, o || {}) : `<div class="phero"><div class="wrap"><div class="eyebrow">${e}</div><h1>${t}</h1><p class="lede">${l}</p></div></div>`);
const lead = (id, eyebrow, h, p) => `<div class="oc-head"><span class="eyebrow">${eyebrow}</span><h2 id="${id}">${h}</h2>${p ? `<p class="lede">${p}</p>` : ''}</div>`;

// ---------------------------------------------------------------- status
const STATUS = {
  now: ['Available now', 'rt-now', 'You can receive it today.'],
  pilot: ['Launching with pilot', 'rt-dev', 'Being made now for the first partner programs. Not ready yet.'],
  planned: ['Planned', 'rt-later', 'On the plan, not started yet.']
};
const FROM_MANIFEST = { available_now: 'now', in_development: 'pilot', coming_later: 'planned' };
// a row's status: the manifest's, when the row names an asset; else the row's own (a proposal)
const statusOf = row => { const a = row.asset && REL && REL.assets[row.asset]; return a ? (FROM_MANIFEST[a.availability] || row.s) : row.s; };
const chip = k => `<span class="rt-chip ${STATUS[k][1]}" data-oc-status="${k}">${STATUS[k][0]}</span>`;
const legend = () => `<p class="small muted oc-legend">${Object.keys(STATUS).map(k => `${chip(k)} ${STATUS[k][2]}`).join(' ')}</p>`;
const OWNER_TAG = '<span class="oc-owner">Owner to provide</span>';
const CONFIRM_TAG = '<span class="oc-owner">Owner to confirm</span>';
const PROPOSED = '<span class="chip warn">Proposed, owner to confirm</span>';

// ---------------------------------------------------------------- 1. your month with Futures Friends
// s = status when no manifest asset applies; asset = release-manifest id (its availability wins).
const MONTH = [
  { k: 'classroom', c: 'booker', h: 'Classroom program', who: 'For every classroom', rows: [
    { t: 'This month’s lesson plans: four theme weeks of daily plans', d: 'Unit 1 now (draft, in the Teacher Portal). Then one new unit each month as it is written; Units 2 to 4 are written in draft.', asset: 'curriculum-unit1-days' },
    { t: 'A new unit every month', d: 'Units 2 to 12 arrive one a month once your membership starts.', asset: 'curriculum-units-2-12' },
    { t: 'Age adaptations in every activity', d: 'A version for twos, threes and pre-K in each plan, so mixed rooms use one plan.', asset: 'curriculum-unit1-days' },
    { t: 'Supply lists, with everyday substitutions', d: 'Each week lists what to gather. Notes on swapping in everyday items you already have are being added.', s: 'pilot' },
    { t: 'Printables for the month', d: 'Unit 1’s day materials are in the Teacher Portal now. Picture cards and companion printables are planned.', asset: 'printables-program' }] },
  { k: 'staff', c: 'zuri', h: 'Staff support', who: 'For teachers and assistants', rows: [
    { t: 'Monthly office hours', d: 'A live group video session each month: bring questions, see the coming unit, hear what other programs tried.', s: 'pilot' },
    { t: 'One-to-one coordinator calls', d: 'On a schedule set by your package (see the support promise below).', asset: 'service-coordinator' },
    { t: 'New-hire training in the Academy', d: 'Level 1 Foundations for each new staff member, online, as part of the monthly fee.', asset: 'cred-l1' },
    { t: 'Answers within one business day', d: `Call ${PHONE_} or email ${EMAIL_}.`, s: 'now' }] },
  { k: 'family', c: 'lumi', h: 'Family connection', who: 'For your families', rows: [
    { t: 'A ready-to-send family newsletter', d: 'One message a week about what children are exploring, ready to copy into your own app or email.', asset: 'family-messages' },
    { t: 'Activities and conversation prompts', d: 'Futures at Home: free activities by age, five read-aloud storybooks and printable family pages.', asset: 'family-library' },
    { t: 'A family-event kit', d: 'An invitation, a run-of-show and take-home pages for one family night each unit.', s: 'planned' }] },
  { k: 'marketing', c: 'bop', h: 'Enrollment marketing', who: 'For the director or office lead', rows: [
    { t: 'Social posts for the month', d: 'Captions and images you edit with your own details and real photos of your own program.', asset: 'marketing-kit' },
    { t: 'A flyer with your center’s details', d: 'Two-sided, 8.5 x 11, with marked fields for your hours, ages and tuition.', asset: 'marketing-kit' },
    { t: 'Inquiry and tour emails', d: 'A reply to every inquiry, a tour confirmation and a follow-up.', asset: 'marketing-kit' },
    { t: 'Tour and open-house promotion', d: 'An open-house invitation and posts to fill it.', asset: 'marketing-kit' }] },
  { k: 'director', c: 'booker', h: 'Director support', who: 'For the director', rows: [
    { t: 'A monthly implementation check-in', d: 'Fifteen minutes: what is working, what is next, what your team needs.', s: 'planned' },
    { t: 'A usage summary', d: 'Lessons opened, training finished and family pages sent, from the Futures Hub once it is live for your program.', asset: 'hub-portals' },
    { t: 'One help route', d: `One phone number and one email for everything: ${PHONE_}, ${EMAIL_}.`, s: 'now' }] },
  { k: 'improve', c: 'zuri', h: 'Continuing improvement', who: 'For everyone', rows: [
    { t: 'A release calendar', d: 'What arrives next month and what changed this month, with each item’s status, so nothing is a surprise.', s: 'pilot' }] }
];

// the 1:1 call cadence per package, read from the release manifest so it always matches #pricing
const PKG_NAMES = { home: 'Home Daycare', starter: 'Center Starter', complete: 'Center Complete' };
const cadence = () => Object.keys(PKG_NAMES).map(id => { const p = REL && REL.packages[id]; const it = p && p.items.find(i => i[1] === 'service-coordinator');
  return [PKG_NAMES[id], it ? it[0] : 'Owner to confirm']; });

const ONCE = ['The welcome box: storybooks, posters, zone signs and, once toy-safety testing is done, plush friends', 'The character carpet', 'Live virtual onboarding: 6 hours (Center Starter) or 8 hours (Center Complete)', 'Family Welcome Kits included with Center Complete (20) and a sample with Center Starter', 'Hub sign-in set-up for your staff'];
const RENEWS = ['A new unit of lesson plans', 'The Futures Hub for staff and families', 'Level 1 training for each new hire', 'Monthly office hours and your coordinator calls', 'The family newsletter and the month’s social posts', 'The release calendar and one-business-day support'];
const EXTRA = ['Extra classroom sets, carpets and Family Welcome Kits', 'Extra live training sessions and an on-site launch day', 'Training beyond Level 1', 'Summer and holiday units', 'The Learning Zones Kit carpets and fences'];

function promise() {
  return `<div class="oc-promise" role="note"><h3>The support promise</h3>
   <p><b>Every member:</b> monthly group office hours, and an answer within one business day by phone or email.</p>
   <p><b>One-to-one coordinator calls, by package:</b></p><ul>${cadence().map(([n, c]) => `<li><b>${E(n)}:</b> ${E(c)}</li>`).join('')}</ul>
   <p class="small muted">${PROPOSED} Office hours are a proposal; the call schedule is the one in the Welcome Package &amp; Catalog v1.0, p.24-25.</p></div>`;
}
function multisite() {
  return `<div class="oc-multi"><h3>More than one classroom or site?</h3><p>Four or more classrooms in one building: <b>Center Complete</b>. More than one site, or a network of programs: a <b>custom multi-site quote</b>, with one coordinator for all your sites.</p><a class="btn navy" href="#quote">Ask for a multi-site quote</a></div>`;
}
function monthGrid() {
  return `<div class="oc-month">${MONTH.map(g => `<article class="oc-area" style="--c:var(--${g.c})" aria-labelledby="oc-a-${g.k}"><header><h3 id="oc-a-${g.k}">${E(g.h)}</h3><span class="small muted">${E(g.who)}</span></header>
   <ul class="oc-rows">${g.rows.map(r => `<li data-oc-row><span class="oc-rowt"><b>${E(r.t)}</b>${chip(statusOf(r))}</span><span class="small">${E(r.d)}</span></li>`).join('')}</ul></article>`).join('')}</div>`;
}
function cadenceCols() {
  const col = (h, sub, list, cls) => `<div class="oc-col ${cls}"><h3>${h}</h3><p class="small muted">${sub}</p><ul>${list.map(x => `<li>${E(x)}</li>`).join('')}</ul></div>`;
  return `<div class="oc-cols">${col('Arrives once', 'The startup package: paid once, shipped as each piece is made.', ONCE, 'oc-once')}${col('Renews every month', 'The monthly fee: it begins only when the Hub is live for your program and Unit 2 is delivered.', RENEWS, 'oc-renew')}${col('Costs extra', 'Only if you want it. Every package works without these.', EXTRA, 'oc-extra')}</div>
   <p class="small"><a href="#pricing">See every price on the Pricing page</a>, before tax.</p>`;
}
const GROW = [
  ['Your Google Business Profile, with a tour link', 'A checklist to complete your profile, add a booking link for tours and post each week.', 'pilot'],
  ['Give a Week, Get a Week referrals', 'A referral card and terms your families can use. Have your attorney or accountant review the terms first.', 'pilot'],
  ['An open-house kit', 'An invitation, a run-of-show for a Saturday play morning and the posts to fill it.', 'planned'],
  ['Inquiry, tour, enroll: tracking the funnel', 'A simple sheet for every inquiry, tour and enrollment, and a one-page monthly report.', 'pilot']
];
function grow() {
  return `<section class="oc-sec band-paper" id="oc-grow" aria-labelledby="oc-grow-h"><div class="wrap">${lead('oc-grow-h', 'For members', 'Grow your enrollment', 'Fill open seats with the same steps the flagship center uses. Each tool says where it stands today.')}
   <ol class="oc-steps">${GROW.map((g, i) => `<li><span class="oc-num" aria-hidden="true">${i + 1}</span><div><b>${E(g[0])}</b> ${chip(g[2])}<p class="small">${E(g[1])}</p></div></li>`).join('')}</ol>
   <p class="small">Put the Futures Friends name next to yours with the <a href="#brand-kit">partner brand kit</a>.</p></div></section>`;
}
function monthSection(id) {
  return `<section class="oc-sec" id="${id || 'oc-month'}" aria-labelledby="${id || 'oc-month'}-h"><div class="wrap">${lead((id || 'oc-month') + '-h', 'Monthly membership', 'Your month with Futures Friends', 'What we deliver every month, and who helps you use it. Each row says where it stands today.')}
   ${legend()}${monthGrid()}${promise()}</div></section>`;
}

V.membership = () => hero('Monthly membership', 'What arrives every month, and who helps you use it',
  'You pay for a startup package once, then a monthly fee. This page lists what the month holds, what is ready today and what costs extra.',
  { crumb: ['pricing', 'Pricing'], chars: ['booker', 'zuri'], anchors: [['oc-month', 'Your month'], ['oc-cadence', 'Once, monthly, extra'], ['oc-grow', 'Grow your enrollment']] }) +
  monthSection('oc-month') +
  `<section class="oc-sec band-paper" id="oc-cadence" aria-labelledby="oc-cadence-h"><div class="wrap">${lead('oc-cadence-h', 'Plainly', 'Once, every month, or extra', 'Sorted by when the money leaves your account.')}${cadenceCols()}${multisite()}</div></section>` +
  grow() +
  `<section class="tight"><div class="wrap"><div class="cta"><div style="display:grid;gap:8px"><h2>Talk through a membership</h2><p class="lede">Tell us your rooms, ages and enrollment. A real person confirms every item and price with you first. ${E(TAGLINE)}</p></div><a class="btn gold" href="#quote">Ask for a written quote</a></div></div></section>`;

// a compact band for the program pages and pricing
function band(where) {
  return `<section class="oc-band" aria-labelledby="oc-band-${where}-h"><div class="wrap oc-bandin"><div><span class="eyebrow">Monthly membership</span><h2 id="oc-band-${where}-h">Your month with Futures Friends</h2>
   <p>Lesson plans for the month with age versions, staff office hours, a family newsletter, enrollment posts, a director check-in and a release calendar. Each item is marked available now, launching with the pilot, or planned.</p></div>
   <ul class="oc-bandlist">${MONTH.map(g => `<li style="--c:var(--${g.c})">${E(g.h)}</li>`).join('')}</ul><a class="btn navy" href="#membership">See the whole month</a></div></section>`;
}

// ---------------------------------------------------------------- 2. churches and faith-based programs
const FAITH_VERSIONS = [
  ['Licensed weekday child care', 'Full days, Monday to Friday, in a licensed church-run center. Uses the Center Starter or Center Complete package as written.', 'now', 'The program as written'],
  ['Church preschool, part-day', 'Two to five mornings a week. The month’s plans are trimmed to the days you meet, keeping each week’s story and friend.', 'pilot', 'Schedule guide'],
  ['Sunday or occasional programming', 'One session a week or a few a month, with rotating volunteers. One story, one activity and one take-home page per session.', 'planned', 'Session guide']
];
function faith() {
  return `<section class="oc-sec" id="oc-faith" aria-labelledby="oc-faith-h"><div class="wrap">${lead('oc-faith-h', 'Churches and faith-based programs', 'Three ways a church can run Futures Friends', 'For children <b>ages 2 to 5</b>. It is not an infant or toddler nursery program. Follow your state’s licensing rules; we do not decide whether your program needs a license.')}
   ${legend()}<div class="oc-faithv">${FAITH_VERSIONS.map(v => `<article class="oc-card"><h3>${v[0]}</h3>${chip(v[2])}<p class="small">${v[1]}</p><span class="small muted">${v[3]}</span></article>`).join('')}</div></div></section>
  <section class="oc-sec band-paper" aria-labelledby="oc-faith2-h"><div class="wrap">${lead('oc-faith2-h', 'How it fits your church', 'Schedules, volunteers, shared rooms and approvals', '')}
   <div class="oc-faithgrid">
    <div class="oc-card"><h3>Schedule adaptations</h3><p class="small">Full day, part-day or once a week. Each plan marks what to keep when time is short: the story, the friend and the take-home page.</p>${chip('pilot')}</div>
    <div class="oc-card"><h3>Mixed ages in one room</h3><p class="small">Twos to pre-K together: every activity has a simpler version and a stretch, so one leader runs one plan.</p>${chip('now')}</div>
    <div class="oc-card"><h3>Rotating volunteers: preparation and handover</h3><p class="small">A one-page handover sheet for each session (what happened, who needs what, what is next), a 20-minute volunteer orientation and safety basics. Background screening follows your church’s policy and state law.</p>${chip('planned')}</div>
    <div class="oc-card"><h3>Shared rooms and pack-away storage</h3><p class="small">A to-scale layout for a church hall that is packed away after each use: zones on rolling bins, signs that hang and come down in minutes.</p>${chip('now')}<a class="rl" href="#room-kit">See the pack-away layout in the Learning Zones Kit</a></div>
    <div class="oc-card"><h3>Purchasing approval</h3><p class="small">A written quote for your board or finance committee, with every item’s status and price before tax. Nothing is charged until you sign.</p>${chip('now')}<a class="rl" href="#quote">Ask for a written quote</a></div>
    <div class="oc-card"><h3>Your own traditions</h3><p class="small">Futures Friends teaches kindness, courage, curiosity and helping others. Your prayers, songs, scripture stories and celebrations sit alongside it, chosen by your church.</p>${chip('now')}</div>
   </div><p class="small">Volunteer onboarding is part of every launch: see the <a href="#support">launch sequence on our Support page</a>.</p></div></section>`;
}

// ---------------------------------------------------------------- 3. the pilot center: the facts families ask first
// OWNER: fill these in. null = shown as an "Owner to provide" slot with a call-us fallback. Never invent a value.
const FLC_FACTS = {
  hours: null,                 // e.g. 'Monday to Friday, 7:00 AM to 6:00 PM'
  ages: null,                  // e.g. 'Ages 2 to 5'
  openings: [                  // status per room: e.g. 'Openings now', 'Waitlist', 'Full'
    { room: 'Twos Room (ages 2 to 3)', status: null },
    { room: 'Threes Room (ages 3 to 4)', status: null },
    { room: 'Pre-K Room (ages 4 to 5)', status: null }],
  registrationFee: null,       // e.g. '$75, once a year'
  tuitionConditions: null,     // e.g. 'Billed weekly; sibling discount; subsidy accepted'
  textOk: null,                // true when the main line accepts text messages
  team: [                      // real people only, with their permission: {role, name, bio, photo}
    { role: 'Director', name: null, bio: null, photo: null },
    { role: 'Lead teacher', name: null, bio: null, photo: null },
    { role: 'Lead teacher', name: null, bio: null, photo: null }]
};
const call = `<a href="tel:${TEL}">${PHONE_}</a>`;
const fact = (label, v, ask) => `<div class="oc-fact"><span class="small muted">${label}</span>${v ? `<b>${E(v)}</b>` : `${OWNER_TAG}<span class="small">${ask}</span>`}</div>`;
function facts() {
  const F = FLC_FACTS;
  return `<section class="oc-sec" id="oc-facts" aria-labelledby="oc-facts-h"><div class="wrap">${lead('oc-facts-h', 'Futures Learning Center', 'Hours, ages, openings and fees', 'The details families ask first. Where a detail is not on this page yet, call us and we will tell you today’s answer.')}
   <div class="oc-facts">${fact('Hours', F.hours, `Call ${call} for drop-off and pickup times.`)}${fact('Ages served', F.ages, `The program is written for ages 2 to 5. Call ${call} for the rooms open now.`)}
    ${fact('Registration fee', F.registrationFee, 'Ask on your tour.')}${fact('Tuition conditions', F.tuitionConditions, 'Tuition is $210 a week, billed weekly. Ask about sibling and subsidy options on your tour.')}</div>
   <div class="tw"><table class="oc-table"><caption>Openings by room</caption><thead><tr><th scope="col">Room</th><th scope="col">Right now</th></tr></thead><tbody>
    ${F.openings.map(o => `<tr><td>${E(o.room)}</td><td>${o.status ? E(o.status) : OWNER_TAG}</td></tr>`).join('')}</tbody></table></div>
   <p class="small">Room full? Join the waitlist: <button class="rl" type="button" data-anchor="ffx-apply">apply online</button> or call ${call}. When a spot opens, the center calls families in order of application date.</p></div></section>`;
}
const SIL = '<svg viewBox="0 0 80 80" aria-hidden="true" class="oc-sil"><circle cx="40" cy="30" r="14"/><path d="M14 74c2-16 13-24 26-24s24 8 26 24z"/></svg>';
function team() {
  return `<section class="oc-sec band-paper" id="oc-team" aria-labelledby="oc-team-h"><div class="wrap">${lead('oc-team-h', 'Our team', 'Who will greet your child at the door', 'The real people who will care for your child, with their permission. Until their photos and words are here, you meet them on your tour.')}
   <div class="oc-team">${FLC_FACTS.team.map(p => `<article class="oc-person">${p.photo ? `<img src="${E(p.photo)}" alt="${E(p.name || p.role)}" width="160" height="160" loading="lazy">` : `<span class="oc-photo">${SIL}<span class="small">Photo</span></span>`}
     <div><span class="small muted">${E(p.role)}</span><h3>${p.name ? E(p.name) : 'Name'}</h3>${p.name ? '' : OWNER_TAG}<p class="small">${p.bio ? E(p.bio) : 'A short introduction: how long they have taught, what they love about this age and one thing children ask them about.'}</p></div></article>`).join('')}</div>
   <p class="small muted">We never show stock photos or made-up staff. Booker, Lumi, Zuri, Bop and Ms. June are story-world characters, not members of our staff.</p></div></section>`;
}
const PRACTICE = [
  ['Arrival', 'A teacher greets each child at the door and you sign your child in. Children choose a learning zone while friends arrive. Tablet sign-in comes with the app pilot.'],
  ['Meals', 'Breakfast, lunch and an afternoon snack are included, planned around the USDA CACFP meal pattern and served family-style. Tasting is always the child’s choice.'],
  ['Rest', 'Rest time after lunch with lights low; a blanket from home is welcome. Quiet books for children who wake early.'],
  ['Outdoor play', 'Outdoor time twice a day, weather permitting.'],
  ['Pickup', 'A teacher tells you about the day and gives you one question to ask at dinner.'],
  ['Communication', `Talk with your child’s teacher at drop-off and pickup, or call ${PHONE_}. The Family App’s daily update comes with the app pilot.`],
  ['Transitions', 'One friendly cue moves the room from one activity to the next, so children know what comes next without raised voices.']
];
function dayHere() {
  return `<section class="oc-sec" id="oc-dayhere" aria-labelledby="oc-dayhere-h"><div class="wrap">${lead('oc-dayhere-h', 'A day here', 'How the day works, from arrival to pickup', 'Each practice is marked until the center confirms it for this year.')}
   <ul class="oc-practice">${PRACTICE.map(p => `<li><b>${p[0]}</b>${CONFIRM_TAG}<span class="small">${E(p[1])}</span></li>`).join('')}</ul></div></section>`;
}
// the tour fallback: text only when the owner confirms the line takes texts
function contactRow() {
  return `<p class="small oc-reach">Prefer to talk first? Call ${call}${FLC_FACTS.textOk ? `, <a href="sms:${TEL}">text us</a>` : ''} or email <a href="mailto:${EMAIL_}">${EMAIL_}</a>.</p>`;
}

// ---------------------------------------------------------------- 5. support
const HELP_KINDS = [
  ['Technical help', 'Sign-in, the Hub, the Teacher Portal, printing. Included for every member.', 'Included'],
  ['Classroom coaching', 'How a lesson ran, a room set-up, a child who needs a different approach (no child’s private details by email). Monthly office hours and your coordinator calls. Included.', 'Included'],
  ['Extra consulting', 'More sessions for your staff or a day on site: a live training session (90 minutes, up to 15 staff) or an on-site launch day in the Kansas City metro. Priced on the Pricing page.', 'Extra']
];
const LAUNCH = [
  ['Set-up', 'Week 0', 'Your rooms, staff list and sign-ins; the welcome box arrives as pieces are made.'],
  ['Staff orientation', 'Week 1', 'A live session for your team: the friends, the daily rhythm, Unit 1.'],
  ['First classroom use', 'Week 2', 'Teach the first days. A coordinator checks in at the end of the week.'],
  ['Family introduction', 'Week 3', 'A letter home, Futures at Home for every family and a family night if you want one.'],
  ['30-day review', 'Day 30', 'What worked, what to change, what next month brings.']
];
function support() {
  return `<section class="oc-sec" id="oc-support" aria-labelledby="oc-support-h"><div class="wrap">${lead('oc-support-h', 'How support works', 'Hours, urgent help and what is included', '')}
   <div class="oc-supgrid">
    <div class="oc-card"><h3>Support hours</h3><p>Monday to Friday, 8:00 AM to 5:00 PM Central.</p>${PROPOSED}<p class="small">We answer within one business day: <a href="tel:${TEL}">${PHONE_}</a>, <a href="mailto:${EMAIL_}">${EMAIL_}</a>.</p></div>
    <div class="oc-card"><h3>Something urgent?</h3><p class="small">Call the main line and say it is urgent. A child in danger or a medical emergency: call 911 first. Suspected abuse or neglect: call your state’s hotline. Those are never a Futures Friends support ticket.</p></div>
   </div>
   <div class="tw"><table class="oc-table"><caption>Three kinds of help</caption><thead><tr><th scope="col">Kind</th><th scope="col">What it covers</th><th scope="col">Cost</th></tr></thead><tbody>${HELP_KINDS.map(k => `<tr><th scope="row">${k[0]}</th><td>${E(k[1])}</td><td>${k[2]}</td></tr>`).join('')}</tbody></table></div>
   <h3 class="oc-h3">The launch sequence</h3><ol class="oc-steps">${LAUNCH.map((s, i) => `<li><span class="oc-num" aria-hidden="true">${i + 1}</span><div><b>${s[0]}</b> <span class="small muted">${s[1]}</span><p class="small">${s[2]}</p></div></li>`).join('')}</ol>
   <div class="oc-supgrid">
    <div class="oc-card"><h3>When a teacher leaves</h3><p class="small">A replacement starts with your state’s required checks and orientation, then shadows a teacher for the first days. Level 1 Foundations in the Academy follows as part of the monthly fee once its courses are ready. Your coordinator can join a catch-up call.</p>${chip('pilot')}</div>
    <div class="oc-card"><h3>Church volunteers</h3><p class="small">A 20-minute orientation for rotating volunteers and a one-page handover sheet for each session. <a href="#for-faith">See how churches run Futures Friends</a>.</p>${chip('planned')}</div>
   </div></div></section>`;
}

// ---------------------------------------------------------------- 6. partner brand kit
const COLOURS = [['Clubhouse navy', '#0A2B38', 'Text, header'], ['Star gold', '#E7A928', 'Buttons, stars'], ['Booker blue', '#0B5ED7', 'Booker'], ['Lumi pink', '#D9488B', 'Lumi'], ['Zuri green', '#2E9E57', 'Zuri'], ['Bop purple', '#8236AE', 'Bop'], ['Felt cream', '#FBF6EC', 'Backgrounds']];
const KIT = [
  ['Enrollment flyer', 'Two-sided, 8.5 x 11, with marked fields for your details.', 'marketing-kit'],
  ['Social posts', 'A month of captions and images to edit.', 'marketing-kit'],
  ['Tour emails', 'Inquiry reply, tour confirmation, follow-up.', 'marketing-kit'],
  ['Welcome packet', 'A family welcome letter and first-week guide.', 'welcome-box-pieces'],
  ['Open-house kit', 'Invitation, run-of-show and posts.', null, 'planned'],
  ['Window graphics', 'A door decal and window cling with your lockup.', null, 'planned']
];
const APPROVAL = [['Make it from the kit', 'Start from a kit file and fill in your own details and real photos of your own program.'], ['Send it to us', `Email the draft to ${EMAIL_} before it is printed or posted.`], ['We reply', 'Within two business days: approved, or the changes needed.'], ['Print or post', 'Keep the approved file; reuse it without asking again.']];
function brandKit() {
  return hero('Partner brand kit', 'Show families you run Futures Friends', 'Put your center’s name next to ours: make your lockup, follow a few simple rules, and use the kit pieces as they are ready.', { crumb: ['membership', 'Monthly membership'], chars: ['bop', 'lumi'], anchors: [['oc-lockup', 'Make your lockup'], ['oc-rules', 'Usage rules'], ['oc-kit', 'Kit pieces'], ['oc-approve', 'Approval']] }) + `
<section class="oc-sec" id="oc-lockup" aria-labelledby="oc-lockup-h"><div class="wrap">${lead('oc-lockup-h', 'Lockup', 'Your center, featuring Futures Friends', 'Type your center’s name to see the lockup, then download it as a PNG for screens. Print files come with your partner package.')}
 <div class="oc-lockwrap"><form class="oc-lockform" data-oc-lock novalidate><label class="f" for="ocName">Your center’s name<input class="i" id="ocName" name="name" maxlength="48" autocomplete="organization" value="Your Center Name"></label>
  <fieldset><legend>Background</legend><label><input type="radio" name="bg" value="light" checked> White</label><label><input type="radio" name="bg" value="dark"> Navy</label></fieldset>
  <button class="btn gold" type="button" data-oc-download>Download PNG</button><p class="small muted" id="ocLockMsg" role="status" aria-live="polite"></p></form>
  <figure class="oc-lockprev" id="ocLockPrev" data-bg="light">${lockupHtml('Your Center Name')}<figcaption class="small muted">Preview. Minimum size: 150 pixels wide on screen, 1 inch in print.</figcaption></figure></div></div></section>
<section class="oc-sec band-paper" id="oc-rules" aria-labelledby="oc-rules-h"><div class="wrap">${lead('oc-rules-h', 'Usage rules', 'A few rules, so the friends always look right', '')}
 <div class="oc-rules"><div class="oc-card"><h3>Logo and name</h3><ul class="small"><li>Your center’s name first, then “featuring Futures Friends” with our logo.</li><li>Keep your own name; never call your program “Futures Learning Center” or suggest you are a branch of it.</li><li>Do not add “Futures Friends” to your Google Business Profile name.</li><li>Tagline, word for word: <b>${E(TAGLINE)}</b></li></ul></div>
  <div class="oc-card"><h3>Clear space and size</h3><ul class="small"><li>Clear space on every side equal to the height of the F in Futures.</li><li>At least 150 pixels wide on screen, 1 inch in print.</li><li>White, cream or a solid brand colour behind it. No busy photos.</li></ul></div>
  <div class="oc-card"><h3>Don’ts</h3><ul class="small"><li>No stretching, rotating, shadows, outlines or glows.</li><li>No recolouring the logo or the friends.</li><li>Never redraw Booker, Lumi, Zuri or Bop; use the supplied art.</li><li>No logo copied from a screenshot.</li></ul></div></div>
 <h3 class="oc-h3">Colours</h3><ul class="oc-swatches">${COLOURS.map(c => `<li><span class="oc-sw" style="background:${c[1]}" aria-hidden="true"></span><b>${c[0]}</b><code>${c[1]}</code><span class="small muted">${c[2]}</span></li>`).join('')}</ul></div></section>
<section class="oc-sec" id="oc-kit" aria-labelledby="oc-kit-h"><div class="wrap">${lead('oc-kit-h', 'Kit pieces', 'What the kit holds, and where each piece stands', '')}${legend()}
 <div class="tw"><table class="oc-table"><caption class="sr-only">Brand kit pieces and status</caption><thead><tr><th scope="col">Piece</th><th scope="col">What it is</th><th scope="col">Status</th></tr></thead><tbody>${KIT.map(k => `<tr><th scope="row">${k[0]}</th><td>${E(k[1])}</td><td>${chip(statusOf({ asset: k[2], s: k[3] }))}</td></tr>`).join('')}</tbody></table></div></div></section>
<section class="oc-sec band-paper" id="oc-approve" aria-labelledby="oc-approve-h"><div class="wrap">${lead('oc-approve-h', 'Approval', 'Four steps before anything is printed or posted', '')}
 <ol class="oc-steps">${APPROVAL.map((s, i) => `<li><span class="oc-num" aria-hidden="true">${i + 1}</span><div><b>${s[0]}</b><p class="small">${E(s[1])}</p></div></li>`).join('')}</ol>${PROPOSED}</div></section>`;
}
function lockupHtml(name) {
  return `<div class="oc-lockup"><span class="oc-lockname">${E(name)}</span><span class="oc-lockdiv" aria-hidden="true"></span><span class="oc-lockff"><span class="oc-lockfeat">featuring</span><img src="img/brand/ff-plush-wordmark-320.webp" alt="Futures Friends" width="160" height="75"></span></div>`;
}
V['brand-kit'] = brandKit;

// lockup: live preview and PNG download (canvas; the wordmark is same-origin)
function lockName() { const i = document.getElementById('ocName'); return ((i && i.value) || '').trim().slice(0, 48) || 'Your Center Name'; }
function drawPng() {
  const msg = document.getElementById('ocLockMsg'), dark = (document.querySelector('[data-oc-lock] input[name="bg"]:checked') || {}).value === 'dark';
  const img = new Image(); img.src = 'img/brand/ff-plush-wordmark-640.png';
  img.onload = () => {
    const name = lockName(), c = document.createElement('canvas'), x = c.getContext('2d'), H = 400, pad = 80;
    x.font = '700 92px Fredoka, Poppins, sans-serif';
    const tw = Math.min(x.measureText(name).width, 1400), logoW = 420, logoH = Math.round(logoW * 298 / 640);
    c.width = Math.round(pad + tw + 80 + 2 + 80 + logoW + pad); c.height = H;
    x.fillStyle = dark ? '#0A2B38' : '#FFFFFF'; x.fillRect(0, 0, c.width, H);
    x.font = '700 92px Fredoka, Poppins, sans-serif'; x.fillStyle = dark ? '#FFFFFF' : '#0A2B38'; x.textBaseline = 'middle'; x.fillText(name, pad, H / 2, 1400);
    const dx = pad + tw + 80; x.fillStyle = dark ? 'rgba(255,255,255,.5)' : '#C9BFAE'; x.fillRect(dx, 90, 2, H - 180);
    x.font = '600 34px Poppins, sans-serif'; x.fillStyle = dark ? '#C9A2EC' : '#6B2A8E'; x.fillText('featuring', dx + 80, 96);
    x.drawImage(img, dx + 80, 130, logoW, logoH);
    const a = document.createElement('a'); a.download = name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() + '-featuring-futures-friends.png';
    try { a.href = c.toDataURL('image/png'); a.click(); if (msg) msg.textContent = 'Your PNG is downloading.'; } catch (e) { if (msg) msg.textContent = 'The download did not work in this browser. Ask us for the file.'; }
  };
  img.onerror = () => { if (msg) msg.textContent = 'The logo did not load. Please try again.'; };
}
if (typeof document !== 'undefined' && document.addEventListener) {
  document.addEventListener('input', e => { if (!e.target || e.target.id !== 'ocName') return; const p = document.querySelector('#ocLockPrev .oc-lockname'); if (p) p.textContent = lockName(); });
  document.addEventListener('change', e => { const t = e.target; if (!t || t.name !== 'bg' || !t.closest || !t.closest('[data-oc-lock]')) return; const p = document.getElementById('ocLockPrev'); if (p) p.dataset.bg = t.value; });
  document.addEventListener('click', e => { const b = e.target && e.target.closest && e.target.closest('[data-oc-download]'); if (b) drawPng(); });
}

// ---------------------------------------------------------------- 8. compliance language: reminder vs advisory vs enforced
const LEVELS = {
  reminder: ['Reminder', 'Something coming due. Nothing is blocked.'],
  advisory: ['Advisory warning', 'Needs attention. The Hub shows it but does not block anyone.'],
  enforced: ['Enforced restriction', 'The Hub blocks access until it is resolved.']
};
const lvl = k => LEVELS[k] ? `<span class="oc-lvl oc-lvl-${k}" data-oc-level="${k}">${LEVELS[k][0]}</span>` : '';
const lvlLegend = () => `<p class="small oc-lvllegend" role="note">${Object.keys(LEVELS).map(k => `${lvl(k)} ${LEVELS[k][1]}`).join(' ')}</p>`;

// ---------------------------------------------------------------- wrap existing views (never edit their source)
function wrap(route, fn) { const base = V[route]; if (typeof base !== 'function') return; V[route] = function () { return fn(base.apply(this, arguments)); }; }
const beforeLast = (html, marker, add) => { const at = html.lastIndexOf(marker); return at < 0 ? html + add : html.slice(0, at) + add + html.slice(at); };
const beforeFirst = (html, markers, add) => { for (const m of markers) { const at = html.indexOf(m); if (at >= 0) return html.slice(0, at) + add + html.slice(at); } return html + add; };
const afterHero = (html, add) => { const at = html.indexOf('<section'); return at < 0 ? html + add : html.slice(0, at) + add + html.slice(at); };

wrap('for-centers', h => beforeLast(h, '<section class="tight">', band('centers')));
wrap('for-home', h => beforeLast(h, '<section class="tight">', band('home')));
wrap('pricing', h => beforeLast(h, '<section class="tight">', band('pricing')));
wrap('for-faith', h => beforeLast(afterHero(h, faith()), '<section class="tight">', band('faith')));
wrap('support', h => h + support());
wrap('enroll', h => {
  h = beforeFirst(h, ['<section id="ffx-why"'], facts());
  h = beforeFirst(h, ['<section class="wc-callout wc-callout-slim ts-band"', '<section id="ffx-day"'], team());
  h = beforeFirst(h, ['<section id="ffx-tuition"'], dayHere());
  return beforeFirst(h, ['<section id="ffx-apply"'], `<section class="tight"><div class="wrap">${contactRow()}</div></section>`);
});

// Nav and footer links belong to the audiences work (wayfinding.js); this file adds no header or footer links.

W.FFOffer = { STATUS, MONTH, GROW, ONCE, RENEWS, EXTRA, FAITH_VERSIONS, FLC_FACTS, PRACTICE, HELP_KINDS, LAUNCH, KIT, COLOURS, APPROVAL, LEVELS, TAGLINE,
  statusOf, cadence, lvl, legend: lvlLegend, band, lockupHtml };
})();
