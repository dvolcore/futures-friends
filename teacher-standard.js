/* Futures Friends: Our Teacher Standard (#teacher-standard) and Train your staff with us (#train-your-staff).
   Also adds entry bands to Home (window.FFTeacherStandard.callout('home'), the brief version in home-calm.js's trust section), Enroll, For Families,
   For Centers and Home Daycares, plus footer links.

   Copy rule (owner): claim only what is true today. The state rules are summaries of the cited Kansas (K.A.R. 28-4, KOEC,
   Sept. 2026) and Missouri (5 CSR 25-500 / -600) text in the CRM repo's research/regulations/. Everything about our own courses
   comes from docs/training/curriculum.json (draft 0.1, 2026-10-05) and is described as a design that is in development:
   no course is approved, and we only say we are "preparing our courses for state review". Ms. June is a story-world character
   (supporting-cast.js): she introduces sections in the page's own voice and is never quoted about, or given the credentials of,
   real staff. The video tiles play finished story-world videos (gap fill 2026-10-07), labelled as story-world animation, never as staff. Forms go through window.FFIntake and
   say "Online requests open soon" while window.FF_INTAKE.url is empty. Loaded after whole-child.js; no network calls of its own. */
(function () {
'use strict';
if (typeof V === 'undefined' || typeof CH === 'undefined' || typeof KEYS === 'undefined') return;

// ---------------------------------------------------------------- sources (links only; nothing is fetched)
const SRC = {
  ks: 'https://www.koec.ks.gov/home/showpublisheddocument/810/639239627114270000',
  mo: 'https://www.sos.mo.gov/CMSImages/AdRules/csr/current/5csr/5c25-500.pdf',
  mobg: 'https://www.sos.mo.gov/CMSImages/AdRules/csr/current/5csr/5c25-600.pdf',
  cape: 'https://www.yourcape.org/article/Policy-Training-Approval',
  mopd: 'https://earlyconnections.mo.gov/sites/g/files/zuston536/files/media/pdf/2025/10/MOPD%20Trainer%20Guide.pdf',
  async: 'https://earlyconnections.mo.gov/sites/g/files/zuston536/files/media/pdf/2025/10/Asynchronous%20Training%20Overview%20Oct%202025%20Accessible_0.pdf',
  cfoc: 'https://nrckids.org/files/CFOC4%20pdf-%20FINAL.pdf'
};
const STATUS_DATE = 'October 5, 2026';
const ext = (href, t) => `<a href="${href}" target="_blank" rel="noopener noreferrer">${t}<span class="wc-vh"> (opens in a new tab)</span></a>`;
const cite = t => ` <cite class="ts-cite">${t}</cite>`;
// Character art from the plush library (FFPlush, plush-cast.js): srcset 480/960, the manifest's intrinsic size.
// o.pose: a lead pose from the plush library (e.g. 'calm-breath'), falling back to the standing art.
const art = (k, o = {}) => window.FFPlush.img(o.pose ? window.FFPlush.pose(k, o.pose) : k, { cls: o.cls, alt: o.alt === undefined ? CH[k].n + ' the ' + CH[k].a : o.alt, eager: o.eager, h: o.h || 320 });
const lnk = (href, t, cls = 'btn gold') => `<a class="${cls}" href="#${href}">${t}</a>`;
const lead = (kick, title, sub, id) => `<div class="wc-head wc-rv">${kick ? `<span class="wc-kick">${kick}</span>` : ''}<h2 id="${id}">${title}</h2>${sub ? `<p class="lede">${sub}</p>` : ''}</div>`;
const sect = (cls, id, inner) => `<section class="wc-sec ts-sec ${cls}" id="${id}" aria-labelledby="${id}-h"><div class="wrap">${inner}</div></section>`;
const SC = () => window.FFSupporting;
// A story-world grown-up introduces a section (Ms. June leads; Principal Hazel, Mr. Moss and Ms. Fern take one section each, wave 5).
// Every call-out carries the visible "Story-world character" label. Without supporting-cast.js the page simply has no call-out.
const guideBy = (key, text, opts) => (SC() && SC().guide ? SC().guide(key, text, Object.assign({ cls: 'ts-guide wc-rv' }, opts || {})) : '');
const june = (text, opts) => guideBy('june', text, opts);
const JUNE_Q = 'What do you notice? What do you wonder?';

// Gap fill (2026-10-07): the empty "Video coming soon" frames now play finished story-world videos that are already on the site: the
// Academy sample lesson (Ms. June, a story-world teacher, introduces the friends), labelled as story-world animation, never as our
// staff. The empty method-explainer frame is removed: the comparison table carries that section (the cast clips stay on the guide cards).
const TS_VIDS = {
  academy: { src: 'video/academy-welcome.mp4', poster: 'video/academy-welcome-poster.jpg', w: 1280, h: 720, label: 'Academy sample lesson: Ms. June, a story-world teacher, introduces Booker, Lumi, Zuri and Bop' }
};
function videoSlot(id, title, text, key = 'academy') {
  const v = TS_VIDS[key], C = window.FFCaptions;
  return `<figure class="ts-video ts-video-${key} wc-rv" data-video-slot="${id}" aria-labelledby="${id}-cap">
   <video controls playsinline preload="none" poster="${v.poster}" width="${v.w}" height="${v.h}" aria-label="${v.label}"><source src="${v.src}" type="video/mp4">${C ? window.FFCaptions.tracks(v.src) : ''}</video>
   <figcaption id="${id}-cap"><b>${title}</b><span>${text}</span>${C ? C.transcript(v.src, title.replace(/&amp;/g, '&')) : ''}</figcaption></figure>`;
}

// ---------------------------------------------------------------- the law: what every teacher must meet (cited summaries)
const GATES = [
  { when: 'Before the first shift', sub: 'Before working, volunteering or being present', c: 'navy2',
    ks: [['A background check that has cleared. Fingerprint-based for center staff and for volunteers counted in ratio, and covering every state the person lived in during the last 5 years.', 'K.A.R. 28-4-125']],
    mo: [['A comprehensive background check through the state: FBI fingerprints, sex offender registries and child abuse registries, including the Family Care Safety Registry, for every state lived in during the last 5 years.', '5 CSR 25-600.020(1)'],
      ['A new hire may start early on a qualifying fingerprint result only while supervised at all times by staff whose own check is complete.', '5 CSR 25-600.020(2)(B)']] },
  { when: 'Within 7 days', sub: 'And before being left alone with children', c: 'booker',
    ks: [['A facility orientation: the licensing rules, emergency procedures, behavior and discipline policies, the daily schedule, each child\'s allergies and special needs, health and safety, and confidentiality.', 'K.A.R. 28-4-428a(a)']],
    mo: [['A documented facility orientation: a tour, the licensing rules, medication, illness and discipline practices, the needs of the children assigned, the safe sleep policy, the emergency plan and how to report suspected abuse or neglect.', '5 CSR 25-500.102(1)(K)'],
      ['Every caregiver reviews the licensing rules when they start.', '5 CSR 25-500.102(1)(H)']] },
  { when: 'Within 30 days', sub: 'In Kansas, also before sole responsibility for children', c: 'zuri',
    ks: [['Health and safety training approved by the state, in 10 subject areas: abuse and neglect, child development and supervision, safe sleep, illness and infection, food and allergy emergencies, building safety, emergency preparedness, hazardous materials, transportation and medication.', 'K.A.R. 28-4-428a(b)'],
      ['Pediatric first aid and pediatric CPR, with the skills shown in person to an instructor, and kept current.', 'K.A.R. 28-4-428a(c)'],
      ['A negative TB test or chest x-ray.', 'K.A.R. 28-4-126(c)'],
      ['Lead teachers in infant rooms: 4 hours of infant-specific training.', 'K.A.R. 28-4-428a(d)']],
    mo: [['A medical exam report signed by a physician or a supervised nurse, with a TB risk assessment or a negative TB skin test.', '5 CSR 25-500.122(1)'],
      ['In programs licensed for infants: safe sleep training approved by the state and based on the AAP recommendations, repeated every 3 years.', '5 CSR 25-500.102(4)']] },
  { when: 'Every day', sub: 'Whenever children are in care', c: 'bop',
    ks: [['At least one person with current pediatric first aid and CPR in every unit, at all times.', 'K.A.R. 28-4-428a(c)(4)'],
      ['Each staff member reports suspected abuse or neglect to the Kansas Department for Children and Families within 24 hours.', 'K.A.R. 28-4-430(c)(2)'],
      ['Medication is given only by staff who have completed medication administration training.', 'K.A.R. 28-4-132(i)(1)']],
    mo: [['Current first aid and CPR for at least one caregiver per 20 children of licensed capacity, and at least one on site whenever children are present.', '5 CSR 25-500.102(1)(T)'],
      ['Suspected abuse or neglect is reported immediately to the Children\'s Division hotline, 1-800-392-3738. No one may investigate first or stand in the way of the report.', 'RSMo 210.115; 5 CSR 25-500.102(1)(J)']] },
  { when: 'Every year', sub: 'For as long as they work with children', c: 'lumi',
    ks: [['16 clock hours of training approved by the state each licensure year, at least 4 of them in health and safety. Infant caregivers: 4 of the 16 infant-specific. Directors: 6 in program administration. Family home providers: 10 hours.', 'K.A.R. 28-4-428a(e); 28-4-114a(d)(2)'],
      ['An updated staff health status form, and practice of shelter-in-place and off-site relocation.', 'K.A.R. 28-4-126(b); 28-4-128(a)']],
    mo: [['12 clock hours of training approved by the state each calendar year, recorded in the state\'s MOPD system. Repeating a course in the same year earns no extra credit.', '5 CSR 25-500.102(3)'],
      ['A Family Care Safety Registry check on every staff member before the license anniversary.', '5 CSR 25-500.052(2)(C)']] },
  { when: 'Every 5 years', sub: 'Background checks again', c: 'gold',
    ks: [['Fingerprints taken again when the Kansas Office of Early Childhood sends notice.', 'KOEC background check guidance']],
    mo: [['The full comprehensive background check repeated.', '5 CSR 25-600.020(5)']] }
];
const col = k => k === 'gold' ? 'var(--wc-gold)' : `var(--wc-${k})`;
const items = list => `<ul>${list.map(i => `<li>${i[0]}${cite(i[1])}</li>`).join('')}</ul>`;

function heroHtml() {
  const prof = SC() && SC().profile ? SC().profile('june') : null;
  const juneFig = SC() && SC().portrait ? `<figure class="wc-fig ts-june-fig" style="--c:#75439d">${SC().portrait('june', 'ts-june-img', false, 420)}<figcaption><b>${prof ? prof.name : 'Ms. June'}</b><span class="ts-story">Story-world character</span></figcaption></figure>` : '';
  return `<header class="wc-hero ts-hero"><div class="wrap wc-hero-grid">
  <div class="wc-hero-copy">
   <span class="wc-kick">Our Teacher Standard</span>
   <h1>Who is with your child, <span>and how we know they are ready.</span></h1>
   <p class="lede">Every rule a teacher must meet before working alone with children in Kansas and Missouri, with the citation. Then what our own training adds, how a teacher proves mastery, and an honest account of where our courses stand today.</p>
   <div class="wc-acts"><button type="button" class="btn gold" data-anchor="ts-law">See the rules</button><button type="button" class="btn ghost" data-anchor="ts-status">Where we are today</button></div>
   <p class="ts-flag"><b>Today:</b> our courses are in development, and we are preparing them for state review. None is approved by Kansas or Missouri yet. <button type="button" class="rl" data-anchor="ts-status">Read the status</button></p>
   <nav class="wc-anchors" aria-label="On this page">${[['ts-law', 'Before day one'], ['ts-further', 'Where we go further'], ['ts-method', 'How training works'], ['ts-pilot', 'The pilot course'], ['ts-verify', 'How we verify'], ['ts-year', 'Every year'], ['ts-ask', 'What to ask'], ['ts-faq', 'Questions']].map(a => `<button type="button" data-anchor="${a[0]}">${a[1]}</button>`).join('')}</nav>
  </div>
  <div class="wc-stage ts-stage" role="group" aria-label="Ms. June with Lumi and Booker">
   ${juneFig}
   <figure class="wc-fig" style="--c:var(--wc-lumi)">${art('lumi', { eager: true })}<figcaption><b>Lumi</b></figcaption></figure>
   <figure class="wc-fig" style="--c:var(--wc-booker)">${art('booker', { eager: true })}<figcaption><b>Booker</b></figcaption></figure>
  </div>
 </div></header>`;
}

function welcomeHtml() {
  return `<section class="wc-sec ts-welcome" aria-labelledby="ts-welcome-h"><div class="wrap ts-welcome-grid">
  <div class="ts-welcome-copy">${lead('Welcome', 'Welcome, teachers, providers and families', 'Training is how a promise to families becomes something you can check. This page shows the rules, the method and the record, in plain words.', 'ts-welcome-h')}
   ${june('Every grown-up in the room starts as a learner. Let\'s look closely at what that learning asks of them.', { quote: JUNE_Q })}</div>
  ${videoSlot('ts-video-welcome', 'Welcome, teachers &amp; providers', 'A sample lesson from the Futures Friends Academy (about 1.5 minutes). Ms. June is a teacher in our story world, not a member of our staff. Story-world animation.')}
 </div></section>`;
}

function lawHtml() {
  return sect('band-paper ts-law-sec', 'ts-law', `${lead('The law, in plain words', 'Before any teacher is alone with your child', 'These are the minimums every licensed child care center must meet in Kansas and Missouri. They are not ours to choose. We list them so you know exactly what to expect and what to ask.', 'ts-law-h')}
  ${guideBy('hazel', 'First things first: before a grown-up teaches, the law asks who they are and whether they are ready.')}
  <ol class="ts-gates">${GATES.map((g, i) => `<li class="ts-gate wc-rv" style="--c:${col(g.c)};--i:${i % 3}">
   <div class="ts-when"><span class="wc-node" aria-hidden="true">${i + 1}</span><div><h3>${g.when}</h3><p>${g.sub}</p></div></div>
   <div class="ts-state"><h4>Kansas</h4>${items(g.ks)}</div>
   <div class="ts-state"><h4>Missouri</h4>${items(g.mo)}</div></li>`).join('')}</ol>
  <p class="wc-note">Plain-language summaries of the Kansas rules in effect September 4, 2026 (K.A.R. 28-4, published by the Kansas Office of Early Childhood) and the Missouri rules (5 CSR 25-500 and 5 CSR 25-600, DESE Office of Childhood), checked October 4, 2026. They are not legal advice: the official text and your state agency are the authority. Family child care homes and Missouri religious-exempt programs follow different rules. Read the sources: ${ext(SRC.ks, 'Kansas center regulations')}, ${ext(SRC.mo, 'Missouri 5 CSR 25-500')}, ${ext(SRC.mobg, 'Missouri 5 CSR 25-600')}.</p>`);
}

// ---------------------------------------------------------------- where our standard goes further (curriculum.json design_standard)
const FURTHER = [
  ['Mastery, not attendance', 'Life-safety questions must be answered 100% correctly, whatever the overall score. A miss sends the teacher back to that lesson, then retests with a different question on the same point.', 'Life-safety topics include safe sleep, reporting abuse and neglect, and missing-child counts.', 'lumi'],
  ['Seen doing it, in the room', 'Within 30 days of each course, the director (or a senior mentor teacher) watches the teacher at work and signs a short checklist for that course. A missed life-safety item starts a coaching plan.', 'The checklist is not counted as clock hours. It is proof the training reached the classroom.', 'booker'],
  ['Thinking, not clicking', 'Every course ends with one or two short written reflections, read by a coach. They are marked complete or not complete, never graded.', 'Example: "Walk through your infant room in your head. What one thing will you check differently at the next nap?"', 'zuri'],
  ['Real time on task', 'No fast-forward and no skipping slides. An activity at least every 5 minutes means the course moves only when the teacher takes part, and the clock pauses when they step away.', 'Active time is logged for each part of the course.', 'bop'],
  ['No swaddling, in either state', 'Kansas rules ban swaddling in child care. Missouri\'s rules do not mention it, so in Missouri it is our policy.', `National guidance agrees: ${ext(SRC.cfoc, 'Caring for Our Children')} 3.1.4.2 calls swaddling not necessary or recommended in child care.`, 'lumi'],
  ['Safe sleep for everyone who covers a nap', 'Missouri requires safe sleep training in programs licensed for infants. Our safe sleep course is built for directors, teachers, floaters, substitutes and volunteers, and we recommend it for every Kansas teacher who may cover an infant room or nap time.', 'Infant safe sleep always comes before Quiet Time.', 'booker'],
  ['One named person signs every course', 'Each version of each course must be checked against the current rule text and signed by our Training Content Lead and Trainer of Record before teachers use it.', 'That role is not filled yet. Kansas and Missouri editions differ wherever the rules differ.', 'zuri']
];
function furtherHtml() {
  return sect('ts-further-sec', 'ts-further', `${lead('Our standard', 'Where our training goes further than the law', 'The states set the minimum. Our courses are designed to add the seven things below. They are written into the course design now, and they will apply to our teachers as each course launches.', 'ts-further-h')}
  ${guideBy('moss', 'Knowing the rule is the start. Showing it, every day, is the standard.')}
  <ul class="ts-further">${FURTHER.map((f, i) => `<li class="wc-rv" style="--c:var(--wc-${f[3]});--i:${i % 3}"><span class="wc-check" aria-hidden="true"></span><h3>${f[0]}</h3><p>${f[1]}</p><p class="ts-why">${f[2]}</p></li>`).join('')}</ul>`);
}

// ---------------------------------------------------------------- the method (design standard, every clock-hour course)
const METHOD = [
  ['Watch', 'A short video', 'Two to four minutes: a friend opener, a real-classroom demonstration filmed with family consent, or a scene acted by adults. No child is filmed in a staged unsafe scene.', 'booker'],
  ['Do', 'An activity every few minutes', 'Spot the hazards in a crib photo, put the reporting steps in order, choose what to do next. Progress waits for an answer.', 'zuri'],
  ['Decide', 'Scenario questions', 'Drawn at random from a bank at least three times larger than the quiz, with feedback on every answer. 80% to pass, 3 attempts.', 'bop'],
  ['Master', 'Life-safety at 100%', 'Safety questions must be right every time. A miss means the lesson again and a new question.', 'lumi'],
  ['Reflect', 'A coach reads it', 'One or two short written reflections, read and marked complete by a coach.', 'navy2'],
  ['Show', 'On the job', 'The director observes in the classroom within 30 days and signs the course checklist.', 'gold']
];
const VS = [
  ['Press play and walk away', 'Progress stops until the teacher answers'],
  ['One quiz at the very end', 'Practice every few minutes, then a scenario check'],
  ['A lucky guess can pass a safety question', 'Safety questions need 100%'],
  ['Done when the video ends', 'Done when the director has seen it in the room']
];
function methodHtml() {
  return sect('band-paper ts-method-sec', 'ts-method', `${lead('How training works', 'Why scenario practice beats a video you can click through', 'A teacher can sit through a video and still not know what to do when a baby rolls over at nap time. So every course is short lessons, constant practice and real decisions, then proof in the classroom.', 'ts-method-h')}
  ${june('In our story world, I ask the children two questions. Good training asks the grown-ups the same two.', { quote: JUNE_Q, kicker: 'The question behind the method' })}
  <ol class="wc-steps ts-steps">${METHOD.map((s, i) => `<li class="wc-step wc-rv" style="--c:${col(s[3])};--i:${i}"><span class="wc-node" aria-hidden="true">${i + 1}</span><h3>${s[0]}</h3><p class="wc-what">${s[1]}</p><p class="wc-text">${s[2]}</p></li>`).join('')}</ol>
  <div class="ts-method-grid">
   <div class="ts-vs wc-rv"><table><caption class="wc-vh">A click-through video course compared with our course design</caption><thead><tr><th scope="col">A click-through video course</th><th scope="col">Our course design</th></tr></thead>
    <tbody>${VS.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</tbody></table></div>
  </div>
  <p class="wc-note">This design also follows the states' rules for online training. Missouri does not give clock-hour credit for self-study with a quiz or for pre-recorded webinars, and a self-paced course counts only on a learning platform the state has approved: one that blocks fast-forwarding, checks knowledge, requires interaction and tracks time present (${ext(SRC.mopd, 'DESE MOPD Trainer Guide')}; ${ext(SRC.async, 'DESE Asynchronous Training Overview')}, Oct. 2025). Our platform has not been approved yet. Pediatric first aid and CPR are taught in person by an outside partner, never online.</p>`);
}

// ---------------------------------------------------------------- the pilot (curriculum.json SR-120 + PILOT_COURSE_BRIEF.md)
const PILOT = { code: 'SR-120', title: 'Safe Sleep and Lumi\'s Quiet Time', hours: '1.5', videos: 13, activities: 16, checkpoint: 4, checkpointAt: 55, finalItems: 8, bank: 28, bankSafety: 16, reflections: 2 };
const PRACTICE = [
  'Every infant under 12 months goes on their back for every nap, in their own crib or play yard that meets the rules. A baby who falls asleep anywhere else is moved.',
  'Spot every unsafe item in a sleep space: soft bedding, bumpers, positioners, swaddles, weighted products, bibs, pacifier clips, covered heads and overdressing.',
  'The rolling rule: place every baby on the back. A baby who rolls both ways may stay in the position they choose; a baby who cannot yet roll both ways is returned to the back.',
  'Watch sleeping babies by sight and sound, with enough light to see each face and skin color.',
  'Lead Lumi\'s Quiet Time (Notice, Breathe, Soften, Rest) for toddlers and preschoolers: offered, never forced, never a punishment, and within each state\'s rest rule.'
];
const CHECKLIST = ['Every infant placed on the back in their own crib or play yard', 'Fitted sheet only in the sleep space', 'No swaddles, bibs, necklaces, pacifier clips or positioners', 'A baby asleep anywhere else is moved promptly', 'Light enough to see each face and skin color', 'Staff placed to see and hear every sleeping baby', 'No equipment that blocks seeing or hearing', 'Babies dressed for the room: one layer more than an adult', 'An awake baby is out of the crib within 30 minutes', 'Quiet Time led with the four steps', 'Children who do not sleep get a quiet activity, per the state rule', 'Rest is never used as punishment'];
function pilotHtml() {
  const p = PILOT;
  return sect('wc-quiet-sec ts-pilot-sec', 'ts-pilot', `<div class="wc-split wc-split-rev">
   <div class="wc-split-copy">${lead('The pilot course, in development', p.title, 'The first course we are building. Safe sleep is the rule that matters most for babies, and Missouri reviews every word of a safe sleep course against the AAP recommendations. If this course meets the bar, the format does.', 'ts-pilot-h')}
    <dl class="ts-facts">
     <div><dt>Length</dt><dd><b>${p.hours}</b> hours</dd></div>
     <div><dt>Short videos</dt><dd><b>${p.videos}</b> of 2 to 4 minutes</dd></div>
     <div><dt>Activities</dt><dd><b>${p.activities}</b> along the way</dd></div>
     <div><dt>Safety checkpoint</dt><dd><b>${p.checkpoint}</b> questions at minute ${p.checkpointAt}, 100% to go on</dd></div>
     <div><dt>Final check</dt><dd><b>${p.finalItems}</b> questions from a bank of ${p.bank}, ${p.bankSafety} of them life-safety</dd></div>
     <div><dt>Reflections</dt><dd><b>${p.reflections}</b> read by a coach</dd></div>
    </dl>
    <h3 class="wc-h3">What teachers practice</h3>
    ${ck(PRACTICE)}
   </div>
   <div class="wc-split-art wc-rv">${art('lumi', { cls: 'wc-big', pose: 'calm-breath', alt: 'Lumi the bunny, taking a calm breath' })}</div></div>
  <div class="ts-checklist wc-rv"><h3>What the director checks in the room, within 30 days</h3>
   <ol>${CHECKLIST.map(c => `<li>${c}</li>`).join('')}</ol>
   <p class="wc-note">This course is a design (draft 0.1). It has not yet been reviewed by our trainer of record or by either state. For babies, safe sleep always comes first; Quiet Time is for toddlers and preschoolers.</p></div>`);
}

// ---------------------------------------------------------------- how mastery is verified (the completion record)
const RECORD = ['Every video segment watched, with no skipping', 'Every activity answered', 'Life-safety questions: 100%', 'Overall knowledge check: 80% or higher, within 3 attempts', 'Reflections read and marked complete by a coach', 'Active time logged for each part, with idle time paused', 'Director\'s on-the-job checklist signed within 30 days'];
function verifyHtml() {
  return sect('band-paper ts-verify-sec', 'ts-verify', `<div class="wc-split">
   <div class="wc-split-copy">${lead('How we verify mastery', 'A completion means proof, not attendance', 'When a course is live, a teacher\'s record for it is complete only when every line below is true.', 'ts-verify-h')}
    ${ck(RECORD)}
    <p class="wc-note">The completion certificate shows the course code, version and hours. State credit appears on it only after Kansas (through Cape, the state's training registry) or Missouri (through the MOPD system) has approved the course and recorded the completion.</p>
    ${guideBy('fern', 'If a grown-up misses a safety question, they go back and learn it again. That is not a failure. That is the point.')}</div>
   <div class="wc-split-art wc-rv"><figure class="wc-today ts-record" aria-labelledby="ts-record-cap">
    <span class="wc-ribbon">Example</span>
    <div class="wc-today-head"><b>Course record: SR-120</b><span>Safe Sleep and Lumi's Quiet Time, version 0.1 (draft)</span></div>
    <div class="wc-today-sec"><h3>Course work</h3><ul class="wc-ticks">${['Videos', 'Activities', 'Life-safety 100%', 'Final check 80%+', 'Reflections'].map(x => `<li>${x}</li>`).join('')}</ul></div>
    <div class="wc-today-sec"><h3>In the room</h3><p class="ts-rec-line"><b>Director checklist</b><span>Due within 30 days of the course</span></p></div>
    <div class="wc-today-sec ts-rec-state"><h3>State credit</h3><p class="ts-rec-line"><b>Pending approval</b><span>Shown only after Kansas or Missouri records it</span></p></div>
    <figcaption id="ts-record-cap">Illustrative example only. It is not a real teacher or a real record, and no course is live yet.</figcaption></figure></div></div>`);
}

// ---------------------------------------------------------------- every year (curriculum.json annual_plans, Missouri center teacher)
const PLAN = [['SR-120', 'Safe Sleep and Lumi\'s Quiet Time', 1.5], ['SR-200', 'Lumi\'s Calm Corner: Developmentally Appropriate Guidance and Discipline', 1.5], ['FF-110', 'The Whole-Child Daily Rhythm', 1.0], ['FF-120', 'Bop &amp; Go!: Move Your Body, Grow Your Mind', 1.5], ['FF-140', 'Booker\'s Watch, Do, Repeat, Take Home', 2.0], ['SR-160', 'Ready for Anything: Emergency Preparedness, Drills and Reunification', 1.5], ['SR-130', 'Healthy Rooms: Recognizing Illness and Preventing Infection', 1.5], ['FF-170', 'Observing and Documenting Children\'s Learning', 2.0]];
const planTotal = () => PLAN.reduce((a, r) => a + r[2], 0);
function yearHtml() {
  return sect('ts-year-sec', 'ts-year', `${lead('Every year after', 'Training does not stop after the first month', 'The states require training every year. Our draft catalog plans it by role, so the minimum is met without repeating a course.', 'ts-year-h')}
  <div class="ts-year-grid">
   <div class="wc-rules ts-year-rules">
    <div><h3>The hours, planned by role</h3><ul><li>Kansas centers: 16 hours a licensure year, at least 4 in health and safety. Kansas homes: 10.</li><li>Missouri: 12 hours a calendar year.</li><li>Each plan in our draft catalog meets the state minimum without repeating a course in the same year.</li></ul></div>
    <div><h3>A needs check every year</h3><ul><li>In Kansas, the director must assess each teacher's training needs every licensure year (K.A.R. 28-4-428a(e)(2)).</li><li>Every new course brings its own director checklist.</li></ul></div>
    <div><h3>Renewals that matter</h3><ul><li>Missouri infant programs: safe sleep training again every 3 years.</li><li>Pediatric first aid and CPR kept current, in person.</li></ul></div>
   </div>
   <div class="ts-plan wc-rv"><span class="wc-ribbon wc-ribbon-inline">Sample plan</span><h3>A Missouri teacher in an infant-licensed center</h3>
    <table><caption class="wc-vh">Sample annual training plan, ${planTotal().toFixed(1)} hours</caption><thead><tr><th scope="col">Course</th><th scope="col">Hours</th></tr></thead>
     <tbody>${PLAN.map(r => `<tr><td><b>${r[0]}</b> ${r[1]}</td><td>${r[2].toFixed(1)}</td></tr>`).join('')}</tbody>
     <tfoot><tr><th scope="row">Total (Missouri requires 12)</th><td>${planTotal().toFixed(1)}</td></tr></tfoot></table>
    <p class="wc-note">From our draft catalog. These courses are in development, and their hours count toward Missouri's 12 only after the state approves each one.</p></div>
  </div>`);
}

// ---------------------------------------------------------------- what families can ask to see
const ASK = [
  ['The written safe sleep policy', 'Kansas programs must share their safe sleep plan before a baby\'s first day. Missouri programs give you a copy of their policy at enrollment.', 'K.A.R. 28-4-436(b); 5 CSR 25-500.132', 'lumi'],
  ['The emergency plan', 'Kansas programs review it with parents and with staff every year: fire, weather, a missing child, lockdown, where children go and how families are reunited.', 'K.A.R. 28-4-128(a)', 'bop'],
  ['Who has current first aid and CPR today', 'Ask how the program makes sure someone with current pediatric first aid and CPR is with your child\'s group all day.', 'K.A.R. 28-4-428a(c); 5 CSR 25-500.102(1)(T)', 'zuri'],
  ['Whether each teacher in the room has finished orientation and health and safety training', 'Programs keep these records in each person\'s file. Expect a yes or no, not the personal file: background check results stay confidential.', 'K.A.R. 28-4-428a(f); 5 CSR 25-500.102(1)(N)', 'booker'],
  ['How abuse or neglect is reported', 'Every staff member reports directly. In Missouri that means calling the Children\'s Division hotline right away; no one may investigate first.', 'RSMo 210.115', 'lumi'],
  ['Our course outlines, once a course is live', 'Ask to see the course outline, its life-safety topics and the director checklist. They are the same for every teacher who takes the course.', 'Our policy', 'bop']
];
function askHtml() {
  return sect('ts-ask-sec band-paper', 'ts-ask', `${lead('For families', 'What you can ask to see', 'Any licensed program should be able to answer these questions. Ask us too.', 'ts-ask-h')}
  <ul class="ts-ask">${ASK.map((a, i) => `<li class="wc-rv" style="--c:var(--wc-${a[3]});--i:${i % 3}"><h3>${a[0]}</h3><p>${a[1]}</p><p class="ts-why">${cite(a[2]).trim()}</p></li>`).join('')}</ul>`);
}

// ---------------------------------------------------------------- where we are today (honest status box)
const STATUS = {
  done: ['A draft course map for Kansas and Missouri, with every state rule tied to its citation (draft 0.1).', 'The pilot course designed: Safe Sleep and Lumi\'s Quiet Time.', 'The course design standard: short videos, activities every few minutes, scenario checks, 100% life-safety mastery, coach-read reflections and director sign-off.'],
  now: ['Building the first courses: what a new teacher needs first, starting with safe sleep, reporting abuse and neglect, emergency preparedness, guidance and discipline, and the Futures Friends daily rhythm.', 'Preparing our courses for state review in Kansas (Cape) and Missouri (MOPD).'],
  not: ['No course has been reviewed or approved by Kansas or Missouri. Until one is, its hours do not count toward required training.', 'Our learning platform is not yet approved by Missouri for self-paced courses.', 'Our Training Content Lead and Trainer of Record is not yet named.', 'No course is live yet.']
};
function statusHtml(compact) {
  const colh = (k, t, list) => `<div class="ts-col ts-col-${k}"><h3>${t}</h3><ul>${list.map(x => `<li>${x}</li>`).join('')}</ul></div>`;
  return `<section class="wc-sec ts-status band-navy" id="${compact ? 'ts-staff-status' : 'ts-status'}" aria-labelledby="${compact ? 'ts-staff-status' : 'ts-status'}-h"><div class="wrap">
  <div class="ts-status-box">
   <div class="ts-status-head"><span class="wc-kick">Honest status, as of ${STATUS_DATE}</span><h2 id="${compact ? 'ts-staff-status' : 'ts-status'}-h">Where we are today</h2>
    <p>We are preparing our courses for state review. Nothing on this page is approved by Kansas or Missouri yet, and we will say so plainly until it is.</p></div>
   <div class="ts-status-cols">${colh('done', 'Done', STATUS.done)}${colh('now', 'In progress', STATUS.now)}${colh('not', 'Not yet', STATUS.not)}</div>
   <p class="ts-status-foot">Until a course is approved, required training hours can only come from training the state has already approved. In Kansas, approval runs through ${ext(SRC.cape, 'Cape')}; in Missouri, through DESE's MOPD system. Pediatric first aid and CPR always come from an in-person provider.</p>
  </div></div></section>`;
}

// ---------------------------------------------------------------- FAQ
const FAQ = [
  ['Are your courses approved by the state?', 'Not yet. We are preparing them for state review. In Kansas, training counts only after Cape, the state\'s training registry, approves it. In Missouri, only after DESE approves it in the MOPD system. Until then we describe every course as pending approval.'],
  ['Can a teacher finish a course by letting the video play?', 'No. Videos cannot be skipped or fast-forwarded, an activity comes at least every 5 minutes, and the clock pauses when the teacher is idle. Finishing also takes the knowledge check, the reflections and the director\'s sign-off in the room.'],
  ['What happens if a teacher misses a safety question?', 'They go back to the lesson that covers it and answer a different question on the same point. Life-safety questions need 100%, whatever the overall score. If the director sees a life-safety item missed in the classroom, a coaching plan starts.'],
  ['Do teachers learn CPR online?', 'No. Kansas requires pediatric first aid and CPR with the skills shown in person to an instructor. CPR and first aid come from an in-person partner, not from our online courses.'],
  ['Is a background check done before a teacher starts?', 'Both states require it before the person works or is present. In Missouri, a new hire may start on a qualifying fingerprint result only under constant supervision until the full check is complete.'],
  ['Does Lumi\'s Quiet Time replace the safe sleep rules?', 'No. For babies, safe sleep always comes first: on the back, in their own crib or play yard, with nothing soft. Quiet Time is for toddlers and preschoolers, offered and never forced. In Missouri, preschoolers who do not sleep still rest for 30 to 60 minutes, because the state requires it.'],
  ['Who checks that the courses are correct?', 'Every course cites the rule it teaches, with separate Kansas and Missouri editions where the rules differ. Before teachers use a course, our Training Content Lead and Trainer of Record must check it against the current rule text and sign it. That person has not been named yet.'],
  ['Is Ms. June a real teacher?', 'No. Ms. June is a character from the Futures Friends story world. She introduces parts of this page; she does not speak for, or describe, any real member of our staff.'],
  ['Are Principal Hazel, Mr. Moss and Ms. Fern real staff?', 'No. They are story-world characters too, like Ms. June. They introduce a section each; none of them describes a real person at our center.'],
  ['Can my child care center use this training?', 'We plan to offer the same courses to other centers and home daycares. It is not open yet. See Train your staff with us.']
];
function faqHtml() {
  return `<section class="wc-sec ts-sec" id="ts-faq" aria-labelledby="ts-faq-h"><div class="wrap" style="max-width:900px">${lead('Questions', 'Questions families ask about our teachers', '', 'ts-faq-h')}
  <div class="faq">${FAQ.map(f => `<details><summary>${esc(f[0])}</summary><p>${esc(f[1])}</p></details>`).join('')}</div></div></section>`;
}

function nextHtml() {
  return `<section class="wc-sec wc-next"><div class="wrap"><div class="wc-next-grid">
   <div class="wc-next-card wc-rv" style="--c:var(--wc-lumi)"><h2>For families</h2><p>Visit the flagship center, meet the director and ask the questions on this page in person.</p>${lnk('enroll', 'Visit Futures Learning Center')}</div>
   <div class="wc-next-card wc-rv" style="--c:#75439d"><h2>For centers and home daycares</h2><p>The same course method, planned for your staff. Not open yet: tell us you are interested.</p>${lnk('train-your-staff', 'Train your staff with us')}</div></div></div></section>`;
}

V['teacher-standard'] = () => `<div class="wc ts">${heroHtml()}${welcomeHtml()}${lawHtml()}${furtherHtml()}${methodHtml()}${pilotHtml()}${verifyHtml()}${yearHtml()}${askHtml()}${statusHtml(false)}${faqHtml()}${nextHtml()}</div>`;

// ---------------------------------------------------------------- #train-your-staff (for center and home daycare owners)
const OFFER = [
  ['The same courses', 'Kansas and Missouri editions of the state-required topics (safe sleep, reporting abuse and neglect, emergencies, medication and more), plus the Futures Friends methods.', 'booker'],
  ['Mastery, not attendance', 'Two to four minute videos, activities every few minutes, scenario checks and 100% on life-safety questions.', 'lumi'],
  ['Director dashboards', 'Who has finished what, what is due, and each person\'s hours against your state\'s clock: the Kansas licensure year or the Missouri calendar year.', 'zuri'],
  ['Time tracking', 'Active time for each lesson, idle time paused, and completion records ready for the state registry once a course is approved.', 'bop'],
  ['Observation checklists', 'A short on-the-job checklist for each course, for the director to sign within 30 days. A missed life-safety item starts a coaching plan.', 'purple'],
  ['Annual plans by role', 'Sample plans for teachers, infant-room staff, directors and home providers, checked against your state\'s hour minimums.', 'gold']
];
const WONT = [
  ['Count toward state hours before approval', 'Each course counts only after Kansas (Cape) or Missouri (MOPD) approves it.'],
  ['Replace your facility orientation', 'Orientation is your program\'s own duty and earns no clock hours. A planned orientation kit helps your director run it.'],
  ['Teach CPR or first aid online', 'Those need an in-person provider with a hands-on skills check.'],
  ['Replace your background checks or licensing duties', 'Those stay with your program and your state agency.']
];
const STAFF_PRESET = { id: 'staff-training', heading: 'Ask about training your staff', interest: 'question', what: 'staff training requests', message: 'I would like to hear when Futures Friends staff training opens for my program.' };
const intake = () => window.FFIntake;
function staffForm() {
  const I = intake();
  return I && I.contactHtml ? I.contactHtml('contact', STAFF_PRESET)
    : `<div class="card"><h3>${STAFF_PRESET.heading}</h3><p class="small">Online requests open soon. Please call <b>${PHONE}</b> or email <b>${EMAIL}</b>.</p></div>`;
}

V['train-your-staff'] = () => `<div class="wc ts ts-staff">
 <header class="wc-hero ts-hero"><div class="wrap wc-hero-grid">
  <div class="wc-hero-copy"><span class="wc-kick">For center and home daycare owners</span>
   <h1>Train your staff <span>with us.</span></h1>
   <p class="lede">The same course method we are building for our own teachers: short lessons, real practice, 100% on life-safety questions and proof in the classroom. It is not open yet. Tell us you are interested and we will contact you when it is.</p>
   <div class="wc-acts"><button type="button" class="btn gold" data-anchor="ts-staff-ask">Ask to hear when it opens</button>${lnk('teacher-standard', 'See our teacher standard', 'btn ghost')}</div>
   <p class="ts-flag"><b>Availability:</b> in development. No course is approved by Kansas or Missouri yet, and there is no start date.</p></div>
  <div class="wc-stage ts-stage" role="group" aria-label="Ms. June with Booker">
   ${SC() && SC().portrait ? `<figure class="wc-fig ts-june-fig" style="--c:#75439d">${SC().portrait('june', 'ts-june-img', false, 420)}<figcaption><b>Ms. June</b><span class="ts-story">Story-world character</span></figcaption></figure>` : ''}
   <figure class="wc-fig" style="--c:var(--wc-booker)">${art('booker', { eager: true })}<figcaption><b>Booker</b></figcaption></figure>
  </div></div></header>
 <section class="wc-sec ts-welcome" aria-labelledby="ts-staff-welcome-h"><div class="wrap ts-welcome-grid">
  <div class="ts-welcome-copy">${lead('Directors and providers', 'Training your team should leave proof, not just hours', 'Every course is built the same way: watch, do, decide, master, reflect and show it in the room. Your director signs off on what they saw.', 'ts-staff-welcome-h')}
   ${june('Small steps. Big stories. A team learns the same way children do: one clear step, practiced until it sticks.')}</div>
  ${videoSlot('ts-video-welcome-staff', 'Welcome, teachers &amp; providers', 'A sample lesson from the Futures Friends Academy (about 1.5 minutes). Ms. June is a teacher in our story world, not a member of our staff. Story-world animation.')}
 </div></section>
 <section class="wc-sec wc-lic" id="ts-offer" aria-labelledby="ts-offer-h"><div class="wrap">${lead('What your team would get', 'One method, from the first week to every renewal', 'These are planned features. Nothing here is available to outside programs yet.', 'ts-offer-h')}
  <ul class="wc-six">${OFFER.map((o, i) => `<li class="wc-rv" style="--c:var(--wc-${o[2]});--i:${i % 3}"><b>${o[0]}</b><span>${o[1]}</span></li>`).join('')}</ul></div></section>
 <section class="wc-sec band-paper" id="ts-wont" aria-labelledby="ts-wont-h"><div class="wrap">${lead('Plainly', 'What it will not do', 'So nobody is surprised later.', 'ts-wont-h')}
  <ul class="ts-wont">${WONT.map(w => `<li class="wc-rv"><h3>${w[0]}</h3><p>${w[1]}</p></li>`).join('')}</ul></div></section>
 ${statusHtml(true)}
 <section class="wc-sec" id="ts-staff-ask" aria-labelledby="ts-staff-ask-h"><div class="wrap wc-pilot-grid">
  <div>${lead('Be first to hear', 'Tell us about your program', 'Centers and home daycares in Kansas and Missouri. We will contact you when the first courses open. Please do not include any child\'s details.', 'ts-staff-ask-h')}
   ${june('What do you notice about your team? What do you wonder? Bring both questions to the conversation.')}
   <p class="wc-note">Want the details first? Read ${lnk('teacher-standard', 'our teacher standard', 'rl')}, or see ${lnk('for-centers', 'what a licensed center gets', 'rl')}.</p></div>
  <div class="wc-partner-form">${staffForm()}</div></div></section></div>`;

// ---------------------------------------------------------------- entry bands
function callout(where) {
  if (where === 'family') return `<section class="wc-callout wc-callout-slim ts-band" aria-labelledby="ts-fam-h"><div class="wrap wc-cu">${SC() && SC().portrait ? `<span class="ts-band-june">${SC().portrait('june', '', true, 120)}<small class="ff-story-tag">Ms. June, story-world character, not a member of our staff</small></span>` : ''}
   <div><h2 id="ts-fam-h">How we prepare every teacher</h2><p>Every rule a teacher must meet before working alone with children, how our training goes further, and where our courses stand today.</p></div>${lnk('teacher-standard', 'Read our Teacher Standard')}</div></section>`;
  if (where === 'staff') return `<section class="wc-callout wc-callout-slim ts-band" aria-labelledby="ts-staff-h"><div class="wrap wc-cu">${SC() && SC().portrait ? `<span class="ts-band-june">${SC().portrait('hazel', '', true, 120)}<small class="ff-story-tag">Principal Hazel, story-world character</small></span>` : ''}
   <div><h2 id="ts-staff-h">Train your staff with us</h2><p>The course method we are building for our own teachers, planned for your team: scenario mastery, time tracking and director checklists. In development, not open yet.</p></div>${lnk('train-your-staff', 'See the staff training plan')}</div></section>`;
  // 'home': the brief version inside Home's trust section (home-calm.js). Wave 4 calm Home: the staff-training link and Ms. June
  // moved off Home; they are on #teacher-standard, #train-your-staff, the For Centers / Home Daycares bands and #friends.
  return `<div class="ts-home-compact">
   <h2 id="ts-home-h">Who is with your child, and how we know they are ready</h2>
    <p>The law sets the minimum before any teacher is alone with children. Our training is designed to add mastery and proof on the job, and we tell you exactly where it stands.</p>
    <ul class="ts-home-points"><li><b>Before day one</b><span>Background checks, orientation and safety training, by state law</span></li><li><b>100% on life-safety</b><span>Safe sleep, reporting and missing-child questions, every time</span></li><li><b>Seen in the room</b><span>A director checklist within 30 days of each course</span></li></ul>
    <p class="ts-home-flag">Our courses are in development and not yet approved by either state.</p>
    <a class="hc-btn hc-btn-quiet" href="#teacher-standard">Read our Teacher Standard <svg class="px-icon" aria-hidden="true"><use href="img/ui-icons.svg#ArrowRight"></use></svg></a></div>`;
}

// Wrap existing views: insert a band without editing their source. Each wrapper is a no-op if the view or the marker is missing.
function insertBefore(route, marker, html, last) {
  const base = V[route];
  if (typeof base !== 'function') return;
  V[route] = function () { const out = base.apply(this, arguments), at = last ? out.lastIndexOf(marker) : out.indexOf(marker); return at < 0 ? out + html() : out.slice(0, at) + html() + out.slice(at); };
}
insertBefore('enroll', '<section id="ffx-day"', () => callout('family'));
insertBefore('for-families', '<section class="tight">', () => callout('family'), true);
insertBefore('for-centers', '<section class="tight">', () => callout('staff'), true);
insertBefore('for-home', '<section class="tight">', () => callout('staff'), true);

try {
  const cols = document.querySelectorAll ? document.querySelectorAll('footer .cols > div') : [];
  if (cols[0] && !cols[0].querySelector('[data-go="teacher-standard"]')) cols[0].insertAdjacentHTML('beforeend', '<button data-go="teacher-standard">Our Teacher Standard</button>');
  if (cols[1] && !cols[1].querySelector('[data-go="train-your-staff"]')) cols[1].insertAdjacentHTML('beforeend', '<button data-go="train-your-staff">Train Your Staff</button>');
} catch (e) { /* the footer is optional */ }

window.FFTeacherStandard = { callout, videoSlot, GATES, FURTHER, METHOD, PILOT, CHECKLIST, RECORD, PLAN, ASK, STATUS, FAQ, OFFER, WONT, STAFF_PRESET, STATUS_DATE };
})();
