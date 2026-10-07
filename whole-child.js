/* Futures Friends: the Whole-Child story.
   Routes: #whole-child (the day, the four friends, daily targets with sources, what families see), #bop-at-home (free family
   movement activities plus the weekly challenge sign-up) and a licensed-center block added to #for-centers.
   Also exports window.FFWholeChild.callout() for the Home and Curriculum entry points.

   Copy rules (owner spec, docs/WHOLE_CHILD_SPEC.md): evidence-informed routines, never medical claims; movement and food are never
   a reward or a punishment; no comparing children; every Bop mission has an adapted version; official cut-outs only; Bop's line is
   "Move Your Body, Grow Your Mind". Forms post to the real intake gateway through window.FFIntake and say "open soon" when it is
   not configured. Loaded after views.js and intake.js; adds no network calls of its own. */
(function () {
'use strict';
if (typeof V === 'undefined' || typeof CH === 'undefined' || typeof KEYS === 'undefined') return;

// ---------------------------------------------------------------- data
const SRC = {
  cdc: 'https://www.cdc.gov/early-care-education/php/obesity-prevention-standards/screen-time-limits.html',   // CDC, Screen Time Limits in Early Care and Education; read 2026-10-07
  cfoc: 'https://nrckids.org/files/CFOC4%20pdf-%20FINAL.pdf',   // Caring for Our Children, 4th ed. (2019); 3.1.3.1 and 2.2.0.3 checked 2026-10-05
  who: 'https://www.who.int/publications/i/item/9789241550536'
};
const TAGLINE = 'Move Your Body, Grow Your Mind';

// Who owns what. Family Connection runs through all four.
const OWN = {
  booker: { pill: ['LEARN', 'SMILE'], hears: 'I can try.', sees: 'Literacy, sequencing and confidence.', ritual: 'Watch, Do, Repeat, Take Home', note: 'Tooth-brushing becomes a story routine.', steps: ['Watch', 'Do', 'Repeat', 'Take Home'] },
  lumi: { pill: ['BELONG', 'RESET'], hears: 'Notice. Ask. Listen.', sees: 'Relationships, feelings and regulation.', ritual: 'Quiet Time', note: 'A predictable way to slow down and rest.', steps: ['Notice', 'Breathe', 'Soften', 'Rest'] },
  zuri: { pill: ['EXPLORE', 'NOURISH'], hears: 'I wonder...', sees: 'STEM, inquiry and problem solving.', ritual: 'Notice, Predict, Try, Compare', note: 'Eat the Rainbow lives inside real meals.', steps: ['Notice', 'Predict', 'Try', 'Compare'] },
  bop: { pill: ['MOVE', 'OUTSIDE'], hears: 'Ready? Bop &amp; Go!', sees: 'Movement, rhythm and participation, built into the day.', ritual: 'The Daily 5 and Outside Quests', note: TAGLINE + '.', steps: ['Wake-Up', 'Transition', 'Adventure', 'Outside Quest', 'Reset'] }
};

// The day. owner 'all' = Family Connection, which runs through all four friends.
const DAY = [
  { n: 'Arrive', what: 'Two Taps', owner: 'all', c: 'navy', text: 'Check-in takes two taps, so the first minutes are for greeting the child.' },
  { n: 'Learn', what: 'Story + DO', owner: 'booker', c: 'booker', text: 'A short story opens one idea. Then the screen goes off and hands-on play carries it.' },
  { n: 'Nourish', what: 'Meal or snack, and water', owner: 'zuri', c: 'zuri', text: 'Regular meals stay familiar and complete. Color becomes a low-pressure way to explore food. Water is there all day.' },
  { n: 'Move', what: 'Bop &amp; Go!', owner: 'bop', c: 'bop', text: 'Short movement moments through the day, with a water break at every transition.' },
  { n: 'Reset', what: 'Quiet Time', owner: 'lumi', c: 'lumi', text: 'Notice, Breathe, Soften, Rest. Offered, never forced. Infants follow safe-sleep rules.' },
  { n: 'Connect', what: 'Pickup prompt', owner: 'all', c: 'gold', text: '"What\'s your one thing?" One question, one take-home card, one no-cost family challenge.' }
];

const DAILY5 = [
  ['Morning Wake-Up', 'Stretch, wiggle and wake up together.'],
  ['Transition Move', 'A short move between activities, with a water break prompt.'],
  ['Daily Adventure', 'The day\'s Bop mission: one skill, one story, an adapted version ready.'],
  ['Outside Quest', 'Fresh air and a quest to find, balance, reach or notice. The teacher decides when the weather allows.'],
  ['Reset', 'Slow the body down and hand over to Lumi\'s Quiet Time.']
];
const SKILLS = ['Move', 'Balance', 'Reach', 'Control', 'Handle', 'Rhythm', 'Reset'];

// ---------------------------------------------------------------- pictograms (drawn here as simple two-tone SVG, no generated art)
// 64x64, stroke in the owner's color; .t = soft tint fill, .d = solid detail. Decorative: the text beside each one says the same thing.
const PIC = {
  stomp: '<ellipse class="t" cx="22" cy="40" rx="10" ry="13"/><ellipse class="t" cx="44" cy="28" rx="10" ry="13"/><circle class="d" cx="15" cy="29" r="2.6"/><circle class="d" cx="22" cy="26" r="2.6"/><circle class="d" cx="29" cy="29" r="2.6"/><circle class="d" cx="37" cy="17" r="2.6"/><circle class="d" cx="44" cy="14" r="2.6"/><circle class="d" cx="51" cy="17" r="2.6"/><path d="M8 59h9M27 60h10M47 50h9"/>',
  reach: '<circle class="t" cx="47" cy="11" r="6.5"/><path d="M47 4.5c1-2 3-3 5-3"/><circle class="t" cx="24" cy="24" r="5.5"/><path d="M24 30v17M24 34l14-17M24 34l-10 7M24 47l-7 11M24 47l7 11"/>',
  freeze: '<circle class="t" cx="28" cy="12" r="5.5"/><path d="M28 18v20M14 24l14 1 14-6M28 38l-8 17M28 38l9 17"/><path d="M52 36v18M44.2 40.5l15.6 9M44.2 49.5l15.6-9"/>',
  paws: '<ellipse class="t" cx="16" cy="52" rx="5.5" ry="4.5"/><circle class="d" cx="10.5" cy="45.5" r="2.2"/><circle class="d" cx="16" cy="43.5" r="2.2"/><circle class="d" cx="21.5" cy="45.5" r="2.2"/><ellipse class="t" cx="32" cy="36" rx="5.5" ry="4.5"/><circle class="d" cx="26.5" cy="29.5" r="2.2"/><circle class="d" cx="32" cy="27.5" r="2.2"/><circle class="d" cx="37.5" cy="29.5" r="2.2"/><ellipse class="t" cx="48" cy="20" rx="5.5" ry="4.5"/><circle class="d" cx="42.5" cy="13.5" r="2.2"/><circle class="d" cx="48" cy="11.5" r="2.2"/><circle class="d" cx="53.5" cy="13.5" r="2.2"/>',
  flamingo: '<circle class="t" cx="32" cy="10" r="5.5"/><path d="M32 16v20M14 24l18-3 18 3M32 36v20M32 36l10 6-8 5M22 58h20"/>',
  clap: '<rect class="t" x="15" y="24" width="14" height="26" rx="7" transform="rotate(-16 22 37)"/><rect class="t" x="35" y="24" width="14" height="26" rx="7" transform="rotate(16 42 37)"/><path d="M32 6v9M19 10l5 7M45 10l-5 7"/>',
  quest: '<circle class="t" cx="18" cy="28" r="11"/><path d="M18 39v18M10 57h16"/><circle cx="43" cy="35" r="10"/><path d="M50 42l8 8"/><circle class="d" cx="39" cy="35" r="1.9"/><circle class="d" cx="43" cy="31" r="1.9"/><circle class="d" cx="47" cy="37" r="1.9"/>',
  breath: '<circle class="t" cx="18" cy="17" r="5"/><circle class="t" cx="26" cy="24" r="5"/><circle class="t" cx="23" cy="33" r="5"/><circle class="t" cx="13" cy="33" r="5"/><circle class="t" cx="10" cy="24" r="5"/><circle class="d" cx="18" cy="26" r="3.5"/><path d="M18 38v19"/><rect class="t" x="40" y="34" width="11" height="22" rx="2"/><path d="M45.5 21c4 4 4 9 0 11-4-2-4-7 0-11zM45.5 32v2"/>',
  run: '<circle class="t" cx="40" cy="10" r="5.5"/><path d="M37 16l-6 18M23 22l12-2 9 9M31 34l10 11-4 11M31 34l-8 10H12M6 20h8M4 28h8"/>',
  notes: '<path d="M24 46V16l24-6v30"/><ellipse class="d" cx="19" cy="46" rx="6" ry="5"/><ellipse class="d" cx="43" cy="40" rx="6" ry="5"/><path d="M24 24l24-6"/>',
  door: '<rect class="t" x="14" y="8" width="26" height="48" rx="3"/><circle class="d" cx="34" cy="33" r="2.4"/><path d="M8 56h38M48 24c3 2 3 7 0 9M53 20c5 4 5 13 0 17"/>',
  book: '<path class="t" d="M8 16c10-4 18-2 24 4 6-6 14-8 24-4v34c-10-4-18-2-24 4-6-6-14-8-24-4z"/><path d="M32 20v34M14 26c5-1 9 0 12 2M38 28c3-2 7-3 12-2"/>',
  plate: '<circle class="t" cx="25" cy="36" r="17"/><circle cx="25" cy="36" r="9"/><rect x="46" y="22" width="12" height="24" rx="3"/><path d="M46 30h12"/>',
  moon: '<path class="t" d="M38 8a24 24 0 1 0 18 38A19 19 0 0 1 38 8z"/><circle class="d" cx="52" cy="14" r="2"/><circle class="d" cx="58" cy="26" r="1.6"/>',
  home: '<path class="t" d="M8 30L32 10l24 20v26H8z"/><path class="d" d="M32 47c-8-5-11-9-7-13 3-2 6 0 7 2 1-2 4-4 7-2 4 4 1 8-7 13z"/>',
  sunrise: '<path class="t" d="M16 46a16 16 0 0 1 32 0z"/><path d="M6 46h52M32 12v8M12 24l6 5M52 24l-6 5M14 54h36"/>',
  switch: '<path d="M8 22h32M33 15l7 7-7 7M56 42H24M31 35l-7 7 7 7"/><path class="t" d="M50 6c4 6 6 9 6 12a6 6 0 0 1-12 0c0-3 2-6 6-12z"/>',
  star: '<path class="t" d="M32 6l7.7 16.5 18 2-13.4 12.3 3.7 17.8L32 45.7 16 54.6l3.7-17.8L6.3 24.5l18-2z"/>',
  tree: '<circle class="t" cx="24" cy="26" r="13"/><path d="M24 39v18M14 57h20"/><circle class="t" cx="50" cy="14" r="6"/><path d="M50 3v3M50 22v3M39 14h3M58 14h3"/>',
  eye: '<path class="t" d="M6 32c10-15 42-15 52 0-10 15-42 15-52 0z"/><circle cx="32" cy="32" r="8"/><circle class="d" cx="32" cy="32" r="3.4"/>',
  wind: '<path d="M8 24h28a7 7 0 1 0-7-7M8 36h38a7 7 0 1 1-7 7M8 48h20"/>',
  feather: '<path class="t" d="M52 8C30 10 16 28 14 54c18-2 34-16 38-46z"/><path d="M14 54L42 22M24 44h10M30 36h9"/>',
  heart: '<path class="t" d="M32 54C14 42 6 32 12 22c5-7 15-6 20 2 5-8 15-9 20-2 6 10-2 20-20 32z"/>',
  adjust: '<path d="M8 20h30M50 20h6M8 44h8M28 44h28"/><circle class="t" cx="44" cy="20" r="6"/><circle class="t" cx="22" cy="44" r="6"/>'
};
const pic = (k, cls = '') => `<svg class="wc-picto${cls ? ' ' + cls : ''}" viewBox="0 0 64 64" aria-hidden="true" focusable="false">${PIC[k] || ''}</svg>`;
const DAY_PIC = ['door', 'book', 'plate', 'run', 'moon', 'home'];
const D5_PIC = ['sunrise', 'switch', 'star', 'tree', 'moon'];
const Q_PIC = ['eye', 'wind', 'feather', 'moon'];
const ACT_PIC = ['stomp', 'reach', 'freeze', 'paws', 'flamingo', 'clap', 'quest', 'breath'];
const SKILL_PIC = [['Move', 'run'], ['Balance', 'flamingo'], ['Reach', 'reach'], ['Control', 'freeze'], ['Rhythm', 'notes'], ['Reset', 'wind']];
// Real photos the page needs (audit NEW-P01..P06); until the photo day, labelled placeholder frames keep their place.
const ext = (href, text) => `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}<span class="wc-vh"> (opens in a new tab)</span></a>`;
const WHO = ext(SRC.who, 'WHO 2019 under-5 guidelines'), CFOC = ext(SRC.cfoc, 'Caring for Our Children (CFOC)');
// Defaults by age band. Editable per center; every number shows where it comes from.
const TARGETS = [
  { band: 'Infant', age: 'Under 12 months', active: 'Several times a day, floor-based play. At least 30 minutes of tummy time while awake, for babies not yet mobile.', out: '2 to 3 occasions a day, weather permitting.', screen: '<b>None.</b>', sit: 'Seated no more than 15 minutes at a time. Awake in a crib, playpen or other confinement no more than 30 minutes.', src: `${ext(SRC.who, 'WHO 2019')} (under 5); ${ext(SRC.cfoc, 'CFOC')} 4th ed.; K.A.R. 28-4-440(f)` },
  { band: 'Toddler', age: '1 to under 3', active: '60 to 90 minutes of moderate-to-vigorous play (MVPA).', out: '60 to 90 minutes.', screen: '<b>None through age 2</b> (CFOC 2.2.0.3: &ldquo;ages 2 and younger&rdquo;).', sit: 'Awake confinement no more than 30 minutes. Sitting no more than 1 hour at a time.', src: `${ext(SRC.cfoc, 'CFOC 3.1.3.1')} and 2.2.0.3 (4th ed.); ${ext(SRC.who, 'WHO')}; K.A.R. 28-4-440(f)` },
  { band: 'Preschool', age: '3 to 5', active: '90 to 120 minutes of MVPA. WHO: 180 minutes at any intensity, at least 60 of them MVPA.', out: '60 to 90 minutes.', screen: '<b>Not more than 30 minutes a week in care</b> by default, only for learning or movement and never at meals or snacks (the CDC early care and education standard for children 2 and older). Centers can lower it.', sit: 'No more than 1 hour at a time.', src: `${ext(SRC.cfoc, 'CFOC 3.1.3.1')} and 2.2.0.3; ${ext(SRC.who, 'WHO 2019')}; ${ext(SRC.cdc, 'CDC screen time limits in early care')}` }
];

const PROMISES = [
  ['Everyone moves, everyone belongs', 'Every Bop mission has an adapted version: seated or wheelchair, limited space, sensory-sensitive. Quiet Time is offered, never forced, except where a state rule requires a rest period.'],
  ['Play is never a prize or a penalty', 'We never use movement, outdoor time or food as a reward or a punishment. The software has no place to record it, and teacher training says so.'],
  ['Participation, not rankings', 'No leaderboards, no "most active" child, no comparing children. Families see their own child. Centers see rooms.'],
  ['We count minutes, not bodies', 'We measure what the day delivered: minutes, missions and outdoor occasions. Never a child\'s weight, BMI, calories or a "healthy" label. Motor skills are noted only as observed milestones.'],
  ['Screens fit the age', 'No episodes for children ages 2 and younger: songs, puppets and cards take their place. For preschoolers, not more than 30 minutes a week in care is the default, and a screen is the opening act, counted against that weekly cap.'],
  ['Water and weather, with care', 'Water is available all day, with a prompt at every Bop &amp; Go! transition. The forecast can suggest an indoor swap and shows why. The teacher decides.'],
  ['Safe sleep comes first', 'For infants, Quiet Time follows the center\'s safe-sleep rules. Sleep rules always win.'],
  ['Teachers move if they want to', 'Staff movement is opt-in and never tracked per person. Movement moments simply invite teachers to model.'],
  ['Evidence-informed routines', 'We use recognized guidance, and plan a qualified review of health-related content before release. Futures Friends owns the characters, stories, rituals and delivery. We do not sell medical claims.']
];

// ---------------------------------------------------------------- small helpers
// Character art from the plush library (FFPlush, plush-cast.js): srcset 480/960, the manifest's intrinsic size.
// o.pose: a lead pose from the plush library (e.g. 'calm-breath'), falling back to the standing art.
const art = (k, o = {}) => window.FFPlush.img(o.pose ? window.FFPlush.pose(k, o.pose) : k, { cls: o.cls, alt: o.alt === undefined ? CH[k].n + ' the ' + CH[k].a : o.alt, eager: o.eager, h: o.h || 320 });
// Each friend shown doing their pillar (wave 5 generated poses): reading, heart hands, magnifier, dancing.
const PILLAR_POSE = { booker: 'reading', lumi: 'heart-hands', zuri: 'magnifier', bop: 'dancing' };
// A story-world room with friends in front (FFArt.scene, wave 5), labelled as an illustration. '' when brand-art.js is missing.
const scene = (env, chars, line) => (window.FFArt && window.FFArt.scene ? window.FFArt.scene(env, { chars, u: 100, y: 2, line, cls: 'wc-scene', sizes: '(max-width:760px) 92vw, 560px' }) : '');
const col = k => (k === 'all' || k === 'gold') ? 'var(--wc-gold)' : k === 'navy' ? 'var(--wc-navy2)' : `var(--wc-${k})`;
const ownerChip = k => k === 'all'
  ? '<span class="wc-owner wc-owner-all"><span class="wc-heads" aria-hidden="true">' + KEYS.map(x => art(x, { alt: '' })).join('') + '</span>Family Connection</span>'
  : `<span class="wc-owner" style="--c:var(--wc-${k})">${art(k, { alt: '' })}${CH[k].n}</span>`;
const pills = k => OWN[k].pill.map(p => `<span class="wc-pill" style="--c:var(--wc-${k})">${p}</span>`).join('');
const sect = (cls, id, h, inner) => `<section class="wc-sec ${cls}" id="${id}" aria-labelledby="${id}-h"><div class="wrap">${inner.replace('{H}', id + '-h')}</div></section>`;
const lead = (kick, title, sub, id) => `<div class="wc-head wc-rv">${kick ? `<span class="wc-kick">${kick}</span>` : ''}<h2 id="${id}">${title}</h2>${sub ? `<p class="lede">${sub}</p>` : ''}</div>`;
const lnk = (href, text, cls = 'btn gold') => `<a class="${cls}" href="#${href}">${text}</a>`;

// ---------------------------------------------------------------- #whole-child
function heroHtml() {
  return `<header class="wc-hero"><div class="wrap wc-hero-grid">
  <div class="wc-hero-copy">
   <span class="wc-kick">The whole-child day</span>
   <h1>More than daycare. <span>A system families can see.</span></h1>
   <p class="lede">Learning, meals, movement, rest and family connection, designed as one day. The same four friends, the same words and the same habits reinforce one another from arrival to pickup.</p>
   <div class="wc-acts">${lnk('bop-at-home', 'Try Bop at Home, free')}<button type="button" class="btn ghost" data-anchor="wc-day">See the day</button></div>
   <nav class="wc-anchors" aria-label="On this page">${[['wc-day', 'The day'], ['wc-friends', 'Four friends'], ['wc-move', 'Bop &amp; Go!'], ['wc-targets', 'Daily targets'], ['wc-quiet', 'Quiet Time'], ['wc-nourish', 'Eat the Rainbow'], ['wc-family', 'What families see'], ['wc-promises', 'Our promises']].map(a => `<button type="button" data-anchor="${a[0]}">${a[1]}</button>`).join('')}</nav>
  </div>
  <div class="wc-stage" role="group" aria-label="The four friends and what each one owns">
   ${KEYS.map(k => `<figure class="wc-fig" style="--c:var(--wc-${k})">${art(k, { eager: true })}<figcaption><b>${CH[k].n}</b><span class="wc-pills">${pills(k)}</span></figcaption></figure>`).join('')}
  </div>
 </div></header>`;
}

function dayHtml() {
  return sect('wc-day', 'wc-day', '', `${lead('From arrival to pickup', 'One day. One connected system.', 'The whole-child promise is visible at every step of the day, and every step has a friend who owns it.', '{H}')}
  <ol class="wc-steps">${DAY.map((s, i) => `<li class="wc-step wc-rv" style="--c:${col(s.c)};--i:${i}">
   <span class="wc-node" aria-hidden="true">${i + 1}</span>${pic(DAY_PIC[i], 'wc-step-pic')}
   <h3>${s.n}</h3><p class="wc-what">${s.what}</p><p class="wc-text">${s.text}</p>${ownerChip(s.owner)}</li>`).join('')}</ol>
  <p class="wc-strap wc-rv">The point is not to add six separate programs. It is to design the day so the same characters, language and habits reinforce one another.</p>`);
}

function friendsHtml() {
  return sect('wc-friends-sec band-paper', 'wc-friends', '', `${lead('Four friends carry the promise', 'Each friend owns a part of the day', 'The friends are not decoration. Each one owns a developmental territory and a repeatable classroom ritual.', '{H}')}
  <div class="wc-chars">${KEYS.map(k => { const o = OWN[k]; return `<article class="wc-char wc-rv" style="--c:var(--wc-${k});--s:var(--${k}-s)">
   <div class="wc-char-top">${art(k, { pose: PILLAR_POSE[k] })}<div class="wc-char-id"><h3>${CH[k].n}</h3><span class="wc-pills">${pills(k)}</span></div></div>
   <div class="wc-char-body"><p class="wc-ritual"><b>${o.ritual}</b><span>${o.note}</span></p>
    <ol class="wc-chips" aria-label="${esc(CH[k].n)}'s routine">${o.steps.map(s => `<li>${s}</li>`).join('')}</ol>
    <dl class="wc-hs"><div><dt>Child hears</dt><dd>&ldquo;${o.hears}&rdquo;</dd></div><div><dt>Parent sees</dt><dd>${o.sees}</dd></div></dl></div></article>`; }).join('')}</div>
  <p class="wc-strap wc-rv"><b>Family Connection runs through all four.</b> One pickup prompt, one take-home card and one no-cost family challenge each week. <button type="button" class="rl" data-anchor="wc-family">See what families get</button></p>`);
}

function moveHtml() {
  return sect('wc-move-sec', 'wc-move', '', `<div class="wc-split">
   <div class="wc-split-art wc-rv">${scene('playground', [['bop-running', 36], ['tad', 66]], 'The storybook playground, not a photo of our center') || art('bop', { cls: 'wc-big' })}<p class="wc-say" style="--c:var(--wc-bop)"><b>Ready? Bop &amp; Go!</b><span>${TAGLINE}</span></p></div>
   <div class="wc-split-copy">${lead('Bop owns MOVE and OUTSIDE', 'Bop &amp; Go! Movement without workouts', 'Missions, stories, rhythm, outdoor quests and physical literacy. Children hear &ldquo;Ready? Bop &amp; Go!&rdquo; and parents see movement built into the day.', '{H}')}
    <ul class="wc-skills" aria-label="Bop mission skills">${SKILLS.map(s => `<li>${s}</li>`).join('')}</ul>
    <h3 class="wc-h3">The Daily 5</h3>
    <ol class="wc-d5">${DAILY5.map((d, i) => `<li><span class="wc-n" aria-hidden="true">${i + 1}</span>${pic(D5_PIC[i], 'wc-d5-pic')}<div><b>${d[0]}</b><span>${d[1]}</span></div></li>`).join('')}</ol>
    <p class="wc-note">Every mission has an adapted version, and every transition includes a water break prompt. Want to try some at home? ${lnk('bop-at-home', 'Bop at Home activities', 'rl')}</p></div></div>`);
}

function targetsHtml() {
  return sect('wc-targets-sec band-paper', 'wc-targets', '', `${lead('Daily targets, with sources', 'What a day aims to deliver', 'These are defaults a center can edit, and every number shows where it comes from. Kansas and Missouri licensing rules layer on top as legal minimums: where a state rule is stricter, the state rule wins. Our screen limits are Futures Friends standards. Neither state limits screens.', '{H}')}
  <div class="wc-tw wc-rv"><table class="wc-table"><caption class="wc-vh">Daily movement, outdoor, screen and sitting defaults by age band</caption>
   <thead><tr><th scope="col">Age band</th><th scope="col">Active play</th><th scope="col">Outdoor play</th><th scope="col">Screen</th><th scope="col">Sitting or restrained</th><th scope="col">Source</th></tr></thead>
   <tbody>${TARGETS.map(t => `<tr><th scope="row"><b>${t.band}</b><span>${t.age}</span></th><td data-label="Active play">${t.active}</td><td data-label="Outdoor play">${t.out}</td><td data-label="Screen">${t.screen}</td><td data-label="Sitting or restrained">${t.sit}</td><td data-label="Source">${t.src}</td></tr>`).join('')}</tbody></table></div>
  <div class="wc-state wc-rv"><h3>State rules sit on top of these defaults</h3>
   <p class="wc-note" style="margin:0">Your center&rsquo;s state and program type decide which rules apply, and the daily plan shows the citation next to each one. These are summaries, not legal advice: your license and your state agency are the authority.</p>
   <div class="wc-state-grid">
    <div style="--c:var(--wc-booker)"><h4>Kansas centers</h4><ul><li>At least 60 minutes outdoors once a child has been in care more than 4 hours, and daily outdoor time for infants.</li><li>Awake infants and toddlers confined no more than 30 minutes (K.A.R. 28-4-440(f)).</li><li>Kansas homes: physical activity offered at least 1 hour a day.</li></ul></div>
    <div style="--c:var(--wc-zuri)"><h4>Missouri</h4><ul><li>1 hour outdoors for full-day preschool and school-age children, weather permitting.</li><li>Preschoolers who do not sleep rest 30 to 60 minutes. Rest is required, and sleep never is.</li><li>No more than 4 hours between meals and snacks.</li><li>Supervised daily tummy time for infants, and no more than 30 minutes awake in the crib.</li></ul></div>
    <div style="--c:var(--wc-lumi)"><h4>Both states</h4><ul><li>Water available at all times.</li><li>Food and rest are never used as punishment.</li><li>Neither state limits screen time. Our screen limits are Futures Friends standards, not legal requirements.</li></ul></div></div>
   <p class="wc-note" style="margin:0">Missouri programs that are religious-exempt are excused from the daily-schedule rule. The defaults above still apply to them as Futures Friends standards, not as law.</p></div>
  <div class="wc-rules wc-rv">
   <div><h3>How the day adds up</h3><ul><li>Activity can build up in bouts of 10 minutes or more.</li><li>Every child gets 2 to 3 outdoor occasions and 2 or more adult-led movement activities each day.</li><li>A gentle prompt appears when a room has gone too long without moving: after 15 minutes seated for infants, 30 minutes for toddlers and preschoolers. One hour is the ceiling.</li></ul></div>
   <div><h3>What we measure</h3><ul><li>Minutes, missions and outdoor occasions the day delivered.</li><li>Never a child's weight, BMI or calories, and never a ranking.</li></ul></div>
   <div><h3>Sources</h3><ul><li>${CFOC}, 4th edition (2019), standards 3.1.3.1 and 2.2.0.3 (PDF).</li><li>${ext(SRC.who, 'WHO guidelines on physical activity, sedentary behaviour and sleep for children under 5 years')}.</li></ul></div></div>`);
}

function quietHtml() {
  const q = [['Notice', 'Speedy body or quiet body?'], ['Breathe', 'A simple breathing ritual with Lumi.'], ['Soften', 'Slower movement and a quieter voice.'], ['Rest', 'A predictable transition into quiet or rest.']];
  return sect('wc-quiet-sec', 'wc-quiet', '', `<div class="wc-split wc-split-rev">
   <div class="wc-split-copy">${lead('Lumi owns BELONG and RESET', 'Lumi\'s Quiet Time', 'A branded reset ritual for transitions, rest and body awareness.', '{H}')}
    <ol class="wc-q">${q.map((s, i) => `<li class="wc-rv"><span class="wc-n" aria-hidden="true">${i + 1}</span>${pic(Q_PIC[i], 'wc-q-pic')}<div><b>${s[0]}</b><span>${s[1]}</span></div></li>`).join('')}</ol>
    <blockquote class="wc-quote">This is not &ldquo;calm down.&rdquo; It teaches children to notice their own state and move through a predictable routine.</blockquote>
    <p class="wc-note">Quiet Time is offered, never forced. For infants, safe-sleep rules come first. Some state rules add a requirement: Missouri preschoolers who do not sleep must have a rest period of 30 to 60 minutes. In those rooms rest is required and sleep never is.</p></div>
   <div class="wc-split-art wc-rv">${art('lumi', { cls: 'wc-big', pose: 'calm-breath', alt: 'Lumi the bunny, taking a calm breath' })}</div></div>`);
}

// Same six names as the Eat the Rainbow plate (extras.js). Names, not health claims.
const RAINBOW = [['Red Rockets', '#C93B2E', ['tomato', 'strawberry'], 'Red'], ['Orange Sunshine', '#B5530C', ['carrot', 'orange'], 'Orange'], ['Yellow Sunbeams', '#8A6700', ['banana', 'corn'], 'Yellow'], ['Green Sprouts', '#1F7A44', ['broccoli', 'peas'], 'Green'], ['Purple Pals', '#5B43A8', ['blueberries', 'grapes'], 'Blue and purple'], ['Cozy Clouds', '#6F5C44', ['cauliflower', 'bread'], 'White and tan']];
function nourishHtml() {
  return sect('wc-nourish-sec band-paper', 'wc-nourish', '', `<div class="wc-split">
   <div class="wc-split-art wc-rv">${scene('snack-and-wash-area', [['zuri-apple', 30], ['poppy', 70]], 'The storybook snack table, not a photo of our center') || art('zuri', { cls: 'wc-big' })}</div>
   <div class="wc-split-copy">${lead('Zuri owns EXPLORE and NOURISH', 'Eat the Rainbow, inside real meals', 'The rainbow adds variety to normal meals. It does not replace balanced food service, and it is not diet language.', '{H}')}
    <ul class="wc-bands" aria-label="The six rainbow colors">${RAINBOW.map(r => `<li style="--c:${r[1]}"><span class="wc-fruit" aria-hidden="true">${r[2].map(f => `<img src="img/rainbow/${f}.svg" alt="" width="34" height="34" loading="lazy" decoding="async">`).join('')}</span><b>${r[0]}</b><small>${r[3]}</small></li>`).join('')}</ul>
    ${ck(['Regular meals stay familiar and complete.', 'Color becomes a low-pressure exploration tool: &ldquo;Can you find something green on your plate?&rdquo;', 'Children can look, smell, touch or taste. Trying is the goal.', 'Cookbook, poster, placemat and take-home pages carry the idea home.'])}
    <div class="wc-words"><div><h3>Words we use</h3><p>&ldquo;Want to explore it?&rdquo; &ldquo;What color is on your plate?&rdquo; &ldquo;You can look, smell or touch it. Tasting is up to you.&rdquo;</p></div><div><h3>Words we skip</h3><p>&ldquo;Good food&rdquo; and &ldquo;bad food.&rdquo; &ldquo;Clean your plate.&rdquo; Dessert as a prize. Food is never a reward or a punishment.</p></div></div>
    <p class="wc-note">See the menus and recipes on ${lnk('rainbow', 'Eat the Rainbow', 'rl')}.</p></div></div>`);
}

function todayCard() {
  return `<figure class="wc-today" aria-labelledby="wc-today-cap">
  <span class="wc-ribbon">Example</span>
  <div class="wc-today-head"><b>Today in the Threes Room</b><span>Thursday</span></div>
  <div class="wc-today-sec"><h3>Today's moves</h3><ul class="wc-ticks">${DAILY5.map(d => `<li>${d[0]}</li>`).join('')}</ul></div>
  <div class="wc-today-sec"><h3>The day in plain words</h3>
   <dl class="wc-stats"><div><dt>Active play</dt><dd><b>95</b> min<small>Goal 90 to 120 min</small></dd></div><div><dt>Outdoor play</dt><dd><b>70</b> min<small>2 outings. Goal 60 to 90 min</small></dd></div><div><dt>Screens this week</dt><dd><b>15</b> min<small>Up to 30 min a week</small></dd></div></dl></div>
  <div class="wc-today-sec wc-two"><div><h3>Bop mission</h3><p><b>Animal Walks</b><span>Ask your child to show you a bunny hop.</span></p></div><div><h3>At pickup</h3><p><b>&ldquo;What&rsquo;s your one thing?&rdquo;</b><span>One question. No homework.</span></p></div></div>
  <div class="wc-today-sec wc-challenge"><span class="wc-box" aria-hidden="true"></span><p><b>This week at home: try two Animal Walks.</b><span>Mark it done whenever you like. Only your family sees this.</span></p></div>
  <figcaption id="wc-today-cap">Illustrative example with made-up numbers. It is not a real child, family or classroom. Families see only their own child's room and their own activity: no rankings, ever.</figcaption></figure>`;
}
function familyHtml() {
  return sect('wc-family-sec', 'wc-family', '', `<div class="wc-split">
   <div class="wc-split-copy">${lead('Family Connection runs through all four', 'What you\'ll see each day', 'The family daily report turns the day into a few plain things to look at and one thing to talk about.', '{H}')}
    ${ck(['Today\'s movement moments, in plain words', 'Minutes against the day\'s goals, with no scores', 'The Bop mission, and how to try it at home', 'The pickup prompt and a take-home card', 'A weekly, no-cost Bop at Home challenge, private to your family'])}
    <div class="wc-pickup" aria-label="The pickup conversation"><div><small>At pickup</small><b>&ldquo;What&rsquo;s your one thing?&rdquo;</b></div><div><small>Child</small><b>&ldquo;I didn&rsquo;t know yet&hellip; so I tried.&rdquo;</b></div><div><small>Parent</small><b>&ldquo;Tell me more.&rdquo;</b></div></div>
    <p class="wc-note">The daily rhythm tools are part of the Futures Hub roadmap. Ask us what is available for your program today. ${lnk('contact', 'Ask a question', 'rl')}</p></div>
   <div class="wc-split-art wc-rv">${todayCard()}</div></div>`);
}

function promisesHtml() {
  return sect('wc-promises-sec band-navy', 'wc-promises', '', `${lead('How we run it', 'Promises, built into the software, the policy and the training', 'Whole-child means the child is never the thing being measured, ranked or managed.', '{H}')}
  <ul class="wc-prom">${PROMISES.map((p, i) => `<li class="wc-rv" style="--i:${i % 3}"><span class="wc-check" aria-hidden="true"></span><h3>${p[0]}</h3><p>${p[1]}</p></li>`).join('')}</ul>`);
}

function nextHtml() {
  return `<section class="wc-sec wc-next"><div class="wrap"><div class="wc-next-grid">
   <div class="wc-next-card wc-rv" style="--c:var(--wc-bop)"><h2>For families</h2><p>Free movement activities you can do tonight, with an adapted version of every one.</p>${lnk('bop-at-home', 'Bop at Home')}</div>
   <div class="wc-next-card wc-rv" style="--c:var(--wc-booker)"><h2>For centers</h2><p>See what a licensed center gets, how the program works for partners and how to start a conversation.</p>${lnk('for-centers', 'For centers', 'btn gold')}</div></div></div></section>`;
}

// Gap fill (2026-10-07): the six empty "Photo coming" frames are replaced by the routines in motion, using finished story-world videos
// already on the site (a Bop movement break with captions, and Zuri's and Lumi's silent loops). No photos of children are shown here.
const MOTION = [
  { t: 'Bop &amp; Go! between activities', line: 'A one-minute movement break: dance, freeze, try again.', act: 'freeze-try-again' },
  { t: 'An Outside Quest', line: 'Zuri looks closely at the flowers. Outside, children find three things to notice.', k: 'zuri', src: 'video/ff-friend-zuri-4x5.mp4', poster: 'video/ff-friend-zuri-4x5-poster.webp', label: 'Zuri the turtle explores the flowers with her magnifying glass. Story-world animation, no sound.' },
  { t: 'The Quiet Time corner', line: 'Lumi takes a slow, calm breath. Smell the flower, blow the candle.', k: 'lumi', src: 'video/ff-friend-lumi-4x5.mp4', poster: 'video/ff-friend-lumi-4x5-poster.webp', label: 'Lumi the bunny closes her eyes and takes a slow, calm breath. Story-world animation, no sound.' }
];
function photosHtml() {
  const C = window.FFCaptions;
  return sect('wc-photos-sec band-paper', 'wc-photos', '', `${lead('See it in motion', 'The day, with the friends', 'Three routines from this page, shown by the friends. Story-world animation: our own classrooms are shown with real photos on the Enroll page, and children are never filmed without their families&rsquo; permission.', '{H}')}
  <div class="wc-motion">${MOTION.map(m => m.act ? `<div class="wc-motion-item" style="--c:var(--wc-bop)">${C && C.actPlayer ? C.actPlayer(m.act, m.t.replace('&amp;', '&')) : ''}<p><b>${m.t}</b> ${m.line}</p></div>`
    : `<figure class="wc-motion-item wc-motion-loop" style="--c:var(--wc-${m.k})"><video controls muted loop playsinline preload="none" poster="${m.poster}" width="640" height="800" aria-label="${m.label}"><source src="${m.src}" type="video/mp4">${window.FFCaptions ? window.FFCaptions.tracks(m.src) : ''}</video><figcaption><b>${m.t}</b> ${m.line}</figcaption></figure>`).join('')}</div>`);
}

V['whole-child'] = () => `<div class="wc">${heroHtml()}${dayHtml()}${friendsHtml()}${moveHtml()}${targetsHtml()}${quietHtml()}${nourishHtml()}${familyHtml()}${photosHtml()}${promisesHtml()}${nextHtml()}</div>`;

// ---------------------------------------------------------------- #bop-at-home
// Move along with Bop: the FULL Elephant Stomp & Sway (owner 2026-10-07: the extended version everywhere, never the 39-second short).
// It is the same video as the Elephant Stomp card (captions.js BOP_ACTS), played by the same shared player; it talks, so it never autoplays.
const bopVideo = () => `<div class="wc-bopvid wc-rv" style="--c:var(--wc-bop)">${window.FFCaptions && window.FFCaptions.actPlayer ? window.FFCaptions.actPlayer('elephant-stomp', 'Move along with Bop: Elephant Stomp & Sway') : ''}
   <p class="wc-bopvid-cap"><b>Move along with Bop</b><span>Elephant Stomp &amp; Sway, the full movement break &middot; ${vlen(VSEC['elephant-stomp'])} &middot; turn the sound on and move together. Story-world animation.</span></p></div>`;
// (The Watch page's movement break moved into the full video shelf on #watch: family-library.js, gap fill 2026-10-07.)
// The real length of each titled video on the cards (seconds, ffprobe of the act- videos, 2026-10-07 long versions); min = that length.
const VSEC = { 'bop-bubble-chase': 39, 'elephant-stomp': 158, 'trunk-reach': 39, 'freeze-try-again': 69, 'animal-walks': 69, 'flamingo-balance': 69, 'clap-back': 69 };
const vlen = sec => sec < 60 ? sec + ' sec' : Math.floor(sec / 60) + ' min' + (sec % 60 ? ' ' + (sec % 60) + ' sec' : '');
const ACTS = [
  { t: 'Elephant Stomp & Sway', vid: 'elephant-stomp', skill: ['Move', 'Rhythm'], min: VSEC['elephant-stomp'] / 60, space: 'Small indoor space', steps: ['Stomp your heavy elephant feet: one, two, three.', 'Swing your trunk from side to side.', 'Slow down until you are a sleepy elephant.'], say: 'Ready? Bop & Go!', adapt: 'Seated or wheelchair: stomp with your hands on your knees or pat the arms of the chair, and swing your trunk with both arms. Sound-sensitive: do it in silence, or hum softly.' },
  { t: 'Trunk Reach', vid: 'trunk-reach', skill: ['Reach'], min: VSEC['trunk-reach'] / 60, space: 'Any space', steps: ['Spot an apple way up high.', 'Stretch up on your tiptoes and reach your trunk up to pick it.', 'Reach once more for another apple. Yum!'], say: 'How high can your trunk go today?', adapt: 'Reach from a chair, with one arm, or by pointing with your eyes or your voice.' },
  { t: 'Freeze & Try Again', vid: 'freeze-try-again', skill: ['Control'], min: VSEC['freeze-try-again'] / 60, space: 'Small indoor space', steps: ['Move any way you like while you sing or hum.', 'When the song stops, freeze like a statue.', 'Wiggle out of it and try again.'], say: 'Freeze! Now try again.', adapt: 'Freeze just your hands, or just your face. If a child cannot hear the song stop, wave a hand or flick the lights as the signal.' },
  { t: 'Animal Walks', vid: 'animal-walks', skill: ['Move', 'Balance'], min: VSEC['animal-walks'] / 60, space: 'Large indoor space', steps: ['Pick an animal: Booker bear, Lumi bunny, Zuri turtle or Bop elephant.', 'Move like that animal across the room.', 'Call "Switch!" and pick a new animal.'], say: 'Which animal will you be?', adapt: 'Choose the animal that fits your body today. Use your arms and face for the animal, or roll, scoot or wheel across the room.' },
  { t: 'Flamingo Balance', vid: 'flamingo-balance', skill: ['Balance'], min: VSEC['flamingo-balance'] / 60, space: 'Small indoor space', steps: ['Stand tall like a flamingo and hold a grown-up\'s hand or the wall.', 'Lift one foot a little and count to five together.', 'Switch feet. Wobbles are part of it.'], say: 'Wobbles are welcome.', adapt: 'Sit tall and lift one foot, or lift both arms. Hold a grown-up\'s hands, or stand on two feet and just "grow tall."' },
  { t: 'Clap-Back Rhythm', vid: 'clap-back', skill: ['Rhythm'], min: VSEC['clap-back'] / 60, space: 'Any space', steps: ['A grown-up claps a short pattern.', 'Clap it back.', 'Swap: you make a pattern and the grown-up claps it back.'], say: 'Your turn to lead!', adapt: 'Pat your knees, tap the floor, stomp or make sounds. If a child cannot hear the claps, use big arm movements or a gentle tap on the shoulder.' },
  { t: 'Outside Quest: Find Three', skill: ['Move', 'Reach'], min: 10, space: 'Outdoors, with a grown-up', steps: ['Step outside and pick a color.', 'Find three things that color and tell what you notice.', 'Walk, skip or roll between finds, and take a water break.'], say: 'What do you notice?', adapt: 'Window Quest: find your three things from a window or inside the house. Take rest stops whenever you like, and use a wagon, stroller or chair on smooth paths.' },
  { t: 'Lumi\'s Slow Reset', skill: ['Reset'], min: 3, space: 'Any space', steps: ['Notice: is your body speedy or quiet?', 'Smell the flower, blow out the candle: three slow breaths.', 'Soften your voice and your hands, and rest as long as you like.'], say: 'Speedy body or quiet body?', adapt: 'Offered, never forced. Breathe with your eyes open, rest a hand on your tummy or hold a soft toy, or simply listen to the quiet.' }
];

// The same four bands the gateway and the hub use (intake validate.AGE_BANDS): the weekly challenge is chosen for the band.
const AGE_OPTS = [['infant', 'Baby (under 12 months)'], ['toddler', 'Toddler (1 to 2 years)'], ['preschool', 'Preschooler (3 to 5 years)'], ['mixed', 'More than one age']];
const intake = () => window.FFIntake;
const gateway = () => !!(intake() && intake().enabled());

// kind "subscribe": a double opt-in sign-up stored by the gateway in the Futures Hub. Only the adult's email, an optional first name and
// a coarse age band; explicit consent. Nothing about the child is collected.
function signupPayload(f) { return { kind: 'subscribe', data: { topic: 'bop_at_home', email: f.email, firstName: f.name || '', ageBand: f.age, consent: !!f.consent, website: f.website || '' } }; }

function signupForm() {
  const I = intake();
  if (!gateway()) return `<div class="card wc-form" id="wcBopCard"><h3>Join the weekly challenge</h3>${I ? I.soon('weekly challenge sign-ups') : '<p class="small">Online sign-ups are not available on this page right now. Please call (816) 988-5661 and a real person will help you.</p>'}</div>`;
  setTimeout(() => { try { I.warm(); } catch (e) { /* the gateway is optional */ } }, 0);
  return `<div class="card wc-form" id="wcBopCard"><h3>Join the weekly challenge</h3>
  <p class="small muted" style="margin:0">One short, no-cost movement challenge a week, by email. We will ask you to confirm your address first.</p>
  <form class="ffi-form" id="wcBop" novalidate>
   <label class="f" for="bhName">Your first name (optional)<input class="i" id="bhName" name="firstName" autocomplete="given-name" aria-describedby="bhName-e"><span class="ffx-err" id="bhName-e" aria-live="polite"></span></label>
   <label class="f" for="bhEmail">Email address<input class="i" id="bhEmail" name="email" type="email" autocomplete="email" aria-describedby="bhEmail-e"><span class="ffx-err" id="bhEmail-e" aria-live="polite"></span></label>
   <label class="f" for="bhAge">Age group to plan for<select class="i" id="bhAge" name="ageBand" aria-describedby="bhAge-e"><option value="">Choose one</option>${AGE_OPTS.map(a => `<option value="${a[0]}">${a[1]}</option>`).join('')}</select><span class="ffx-err" id="bhAge-e" aria-live="polite"></span></label>
   <div><label class="ffi-check" for="bhConsent"><input type="checkbox" id="bhConsent" name="consent" aria-describedby="bhConsent-e"><span>Yes, email me the weekly Bop at Home challenge. I can unsubscribe at any time with one click.</span></label><span class="ffx-err" id="bhConsent-e" aria-live="polite"></span></div>
   ${I.honeypot('bhHp')}
   <button class="btn gold" type="submit">Sign me up</button>
   <p class="ffi-note">Please do not include your child's name or any health details. We use your email only for this challenge and never sell it. See our <a class="rl" href="#privacy">privacy policy</a>.</p>
  </form></div>`;
}

// Honest copy: the gateway has stored the sign-up and queued ONE email; nothing is weekly until the link in it is opened.
function pendingHtml(o) {
  const sent = o.emailConfirmation === 'queued';
  return `<div class="ffx-ok" role="status" tabindex="-1" id="ffiOk">
  <span class="tag c" style="--c:var(--ok);justify-self:start">${sent ? 'One more step' : 'Not signed up yet'}</span>
  <h3>${sent ? 'Check your email to confirm' : 'We could not send the confirmation email'}</h3>
  ${sent
    ? `<p class="small" style="margin:0">We sent a message to <b style="overflow-wrap:anywhere">${esc(o.email)}</b>. <b>You are not signed up until you open the link in it.</b> If it does not arrive in a few minutes, check your spam folder.</p>
  <p class="small" style="margin:0">After you confirm, the weekly challenge arrives by email, and every email has a one-click unsubscribe link.</p>`
    : `<p class="small" style="margin:0">We could not send an email to <b style="overflow-wrap:anywhere">${esc(o.email)}</b> right now, so you are not signed up yet. Please try again later, or call (816) 988-5661 and a real person will help.</p>`}
  <p class="small muted" style="margin:0">Reference ${esc(o.ref)}</p>
  <a class="btn soft" href="#bop-at-home" style="justify-self:start">Back to the activities</a></div>`;
}

async function onSignup(form) {
  const I = intake(), $ = id => document.getElementById(id), v = id => (($(id) || {}).value || '').trim();
  if (!I) return;
  I.clearMsg(form);
  const age = v('bhAge'), consent = !!($('bhConsent') && $('bhConsent').checked);
  const ok = [I.setErr('bhEmail', I.okEmail(v('bhEmail')) ? '' : 'Enter a valid email address.'), I.setErr('bhAge', age ? '' : 'Choose an age group.'),
    I.setErr('bhConsent', consent ? '' : 'Please check the box to get the weekly email.')];
  if (!ok.every(Boolean)) { const bad = form.querySelector('[aria-invalid="true"]'); if (bad) bad.focus(); return; }
  const p = signupPayload({ name: v('bhName'), email: v('bhEmail'), age, consent, website: v('bhHp') });
  Object.keys(p.data).forEach(k => { if (p.data[k] === '') delete p.data[k]; });
  I.busy(form, true);
  const r = await I.submit(p.kind, p.data);
  if (r.ok) { const card = $('wcBopCard'); card.innerHTML = pendingHtml({ ref: r.ref, email: p.data.email, emailConfirmation: r.emailConfirmation }); const ok2 = $('ffiOk'); if (ok2) { ok2.focus({ preventScroll: true }); ok2.scrollIntoView({ block: 'nearest' }); } }
  else I.showFailure(form, r, { email: 'bhEmail', firstName: 'bhName', ageBand: 'bhAge', consent: 'bhConsent' });
}
document.addEventListener('submit', ev => { const f = ev.target; if (f && f.id === 'wcBop') { ev.preventDefault(); onSignup(f); } }, true);

function actCard(a, i) {
  return `<article class="wc-act wc-rv"${a.vid ? ` id="bop-act-${a.vid}"` : ''} style="--c:var(--wc-${['bop', 'booker', 'zuri', 'lumi'][i % 4]})" aria-labelledby="act${i}">
   <div class="wc-act-pic">${pic(ACT_PIC[i])}</div>
   <div class="wc-act-top"><span class="wc-act-n" aria-hidden="true">${i + 1}</span><h3 id="act${i}">${esc(a.t)}</h3></div>
   <p class="wc-meta"><span>${a.vid && VSEC[a.vid] ? vlen(VSEC[a.vid]) : a.min < 1 ? Math.round(a.min * 60) + ' sec' : String(a.min).replace(/\.5$/, '\u00bd') + ' min'}</span><span>${a.space}</span>${a.skill.map(s => `<span class="wc-sk">${s}</span>`).join('')}</p>
   ${a.vid && window.FFCaptions && window.FFCaptions.actPlayer ? window.FFCaptions.actPlayer(a.vid, a.t) : ''}
   <ol class="wc-act-steps">${a.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
   <p class="wc-sayit"><span>Say:</span> &ldquo;${esc(a.say)}&rdquo;</p>
   <div class="wc-adapt">${pic('adjust', 'wc-adapt-pic')}<b>Adapted version</b><p>${esc(a.adapt)}</p></div></article>`;
}

// Bop's other videos (captions.js FRIEND_ACTS with who 'bop', e.g. Bubble Chase), so every Bop video is on his page (owner 2026-10-07).
// Same shared player; each links to its Futures at Home activity card.
function bopMoreHtml() {
  const C = window.FFCaptions, ks = C && C.friendActs ? C.friendActs('bop') : [];
  if (!ks.length) return '';
  const fam = window.FFFamily && window.FFFamily.ACTS ? window.FFFamily.ACTS : [];
  return `<section class="wc-sec" id="wc-bop-more" aria-labelledby="wc-bop-more-h"><div class="wrap">${lead('Outside with Bop', 'More videos with Bop', 'Movement to take outside, with the same easy steps on its activity card.', 'wc-bop-more-h')}
  <div class="wc-bopmore">${ks.map(k => { const a = fam.find(x => x.vid === k), v = C.FRIEND_ACTS[k];
    return `<article class="wc-bopmore-item wc-rv" id="bop-act-${esc(k)}" style="--c:var(--wc-bop)"><h3>${esc(v.t)}</h3><p class="wc-meta"><span>${VSEC[k] ? vlen(VSEC[k]) : ''}</span></p>${C.actPlayer(k, v.t)}${a ? `<p class="small"><a class="rl" href="#activities/${esc(a.id)}">Try ${esc(a.t)} together: the activity card</a></p>` : ''}</article>`; }).join('')}</div></div></section>`;
}

V['bop-at-home'] = () => `<div class="wc wc-bh">
 <header class="wc-hero wc-hero-bop"><div class="wrap wc-hero-grid">
  <div class="wc-hero-copy"><span class="wc-kick">Bop at Home</span>
   <h1>${TAGLINE}</h1>
   <p class="lede">Free family movement, no equipment and no scorekeeping. Eight short activities to do together, each with an adapted version, plus a weekly challenge you can join.</p>
   <div class="wc-acts"><button type="button" class="btn gold" data-anchor="wc-signup">Join the weekly challenge</button><button type="button" class="btn ghost" data-anchor="wc-acts">See the activities</button></div></div>
  <div class="wc-stage wc-stage-one"><figure class="wc-fig" style="--c:var(--wc-bop)">${art('bop', { eager: true, pose: 'dancing', alt: 'Bop the elephant, dancing' })}<figcaption><b>Ready? Bop &amp; Go!</b></figcaption></figure></div></div></header>
 <section class="wc-sec wc-how" aria-labelledby="wc-how-h"><div class="wrap"><h2 class="wc-vh" id="wc-how-h">How Bop at Home works</h2><ul class="wc-three">
  <li class="wc-rv">${pic('heart', 'wc-three-pic')}<b>Join in</b><span>You are part of the fun. Move with your child, and follow their lead.</span></li>
  <li class="wc-rv">${pic('adjust', 'wc-three-pic')}<b>Adapt freely</b><span>Every activity has an adapted version, shown right on the card. Change anything so it works for your body, your space and your day.</span></li>
  <li class="wc-rv">${pic('star', 'wc-three-pic')}<b>Trying is the win</b><span>We celebrate taking part, not how well or how long. There are no scores and no comparing.</span></li></ul>
  <div class="wc-pillar wc-rv" style="--c:var(--wc-bop)"><div class="wc-pillar-id"><span class="wc-pill" style="--c:var(--wc-bop)">MOVE</span><span class="wc-pill" style="--c:var(--wc-bop)">OUTSIDE</span><b>Bop&rsquo;s pillar</b><span>${TAGLINE}</span></div>
   <ul class="wc-skillpics" aria-label="What the activities practice">${SKILL_PIC.map(([n, k]) => `<li>${pic(k)}<span>${n}</span></li>`).join('')}</ul></div></div></section>
 <section class="wc-sec band-paper" id="wc-acts" aria-labelledby="wc-acts-h"><div class="wrap">${lead('Free, short and screen-free', 'Eight things to try tonight', 'Each one takes 30 seconds to 10 minutes and needs nothing but you. Clear a little space, stay close and offer water.', 'wc-acts-h')}
  <div class="wc-acts-grid">${ACTS.map(actCard).join('')}</div>
  <p class="wc-strap wc-rv">A grown-up joins in and supervises every activity. Stop whenever a child is tired, and never use movement or outdoor time as a reward or a punishment.</p></div></section>
 ${bopMoreHtml()}
 <section class="wc-sec wc-bh-quote" aria-label="A word from Bop"><div class="wrap wc-bh-quote-grid">
  <figure class="wc-pull wc-rv" style="--c:var(--wc-bop)">${art('bop', { alt: '', cls: 'wc-pull-cut' })}<blockquote><p>&ldquo;Wobbles are welcome. Trying is the win.&rdquo;</p></blockquote><figcaption>Bop, the Mighty Mover</figcaption></figure>
  ${bopVideo()}</div></section>
 ${window.FFFamilyUI && window.FFFamilyUI.friendBook ? `<section class="wc-sec band-paper" id="wc-book" aria-label="Bop's storybook"><div class="wrap">${window.FFFamilyUI.friendBook('bop')}</div></section>` : ''}
 <section class="wc-sec" id="wc-signup" aria-labelledby="wc-signup-h"><div class="wrap wc-signup-grid">
  <div class="wc-split-copy">${lead('A little more, every week', 'Join the weekly Bop at Home challenge', 'One short, no-cost challenge a week. Do it any day, in any way that works. Families can mark it done, and that stays private to them.', 'wc-signup-h')}
   <div class="wc-example"><span class="wc-ribbon wc-ribbon-inline">Example</span><b>Try two different Animal Walks this week, one inside and one outside.</b><span>Then tell someone which one was your favorite.</span></div>
   <p class="wc-note">Teaching a class? See how Bop &amp; Go! runs through the day on ${lnk('whole-child', 'the whole-child page', 'rl')}.</p></div>
  <div class="wc-signup-form wc-rv">${signupForm()}</div></div></section></div>`;

// ---------------------------------------------------------------- For Centers: what a licensed center gets
const LICENSE = [
  ['Media', 'Episodes, songs and clips.', 'booker'], ['Curriculum', 'Weekly guide, activities and age adaptations.', 'zuri'], ['Environment', 'Posters, rug, zones and signage.', 'bop'],
  ['Family', 'Take-home pages, the pickup prompt and the home challenge.', 'lumi'], ['Training', 'Onboarding and an implementation standard.', 'purple'], ['Merch', 'Optional plush, books and kits.', 'gold']];
const ENGINES = [
  ['Childcare', 'Your center starts it all.', 'Tuition, enrollment and retention. A program families can see on every tour and at every pickup gives your center something recognizable to talk about.', 'booker'],
  ['Media and IP', 'Children meet the friends on screen.', 'Books, episodes, music and digital. Children meet the friends in stories, then find them in your classroom.', 'lumi'],
  ['Products', 'Characters children already love.', 'Plush, kits, books and learning tools. Optional, child-facing products extend the rituals children already know.', 'zuri'],
  ['Licensing', 'One program across locations.', 'Center package, training and renewals. The same characters, language and routines in every location you run.', 'bop']];
const PILOT = [['Lock', 'Finalize pillar kits and parent language.'], ['Pilot', 'Run it in one Futures center.'], ['Measure', 'Observe children, teachers and parents.'], ['Refine', 'Fix friction before productizing.'], ['Scale', 'More centers, then a licensing pilot.']];
const SCORE = ['Child engagement', 'Teacher usability', 'Parent recall', 'Phrase transfer', 'Activity completion', 'Tour and enrollment signal'];
const CENTER_PRESET = { id: 'centers', heading: 'Talk to us about licensing', interest: 'franchise', what: 'licensing inquiries', message: 'I would like to learn about the whole-child license package for my center.' };

function centersHtml() {
  const I = intake();
  const form = I && I.contactHtml ? I.contactHtml('contact', CENTER_PRESET) : `<div class="card"><h3>Talk to us about licensing</h3><p class="small">Online requests are not available on this page right now. Please call <b>${PHONE}</b> or email <b>${EMAIL}</b>.</p></div>`;
  return `<div class="wc wc-centers">
  <section class="wc-sec wc-lic" id="license" aria-labelledby="license-h"><div class="wrap">${lead('Partner-center package', 'What a licensed center gets', 'A licensable operating system, not a folder of PDFs. Six parts that work together so families see one consistent program.', 'license-h')}
   <ul class="wc-six">${LICENSE.map((l, i) => `<li class="wc-rv" style="--c:var(--wc-${l[2]});--i:${i % 3}"><b>${l[0]}</b><span>${l[1]}</span></li>`).join('')}</ul>
   <p class="wc-banner wc-rv">One license. One consistent family experience across locations.</p>
   <p class="wc-note">This is a partner concept package. Scope and terms are confirmed in a conversation. See the published ${lnk('pricing', 'program pricing', 'rl')}, or learn how the day works on ${lnk('whole-child', 'the whole-child page', 'rl')}.</p></div></section>
  <section class="wc-sec band-paper" id="wc-engines" aria-labelledby="wc-engines-h"><div class="wrap">${lead('How it works for partners', 'Four engines that reinforce each other', 'The childcare operation creates the audience. The characters and the shared program expand what a center can offer.', 'wc-engines-h')}
   <ol class="wc-engines">${ENGINES.map((e, i) => `<li class="wc-rv" style="--c:var(--wc-${e[3]})"><span class="wc-node" aria-hidden="true">${i + 1}</span><h3>${e[0]}</h3><p class="wc-what">${e[1]}</p><p class="wc-text">${e[2]}</p></li>`).join('')}</ol>
   <p class="wc-flow wc-rv" aria-label="How the engines feed each other"><span>Enrollment</span><i aria-hidden="true">&rarr;</i><span>Character attachment</span><i aria-hidden="true">&rarr;</i><span>Product demand</span><i aria-hidden="true">&rarr;</i><span>Licensing</span></p>
   <p class="wc-note">We do not promise enrollment or revenue results. That is why the plan starts with a pilot.</p></div></section>
  <section class="wc-sec" id="wc-pilot" aria-labelledby="wc-pilot-h"><div class="wrap wc-pilot-grid">
   <div>${lead('Pilot before scale', 'Prove it in a real center first', 'Our plan is to validate engagement, teacher workload and parent value before expanding the catalog.', 'wc-pilot-h')}
    <ol class="wc-pilot">${PILOT.map((p, i) => `<li class="wc-rv"><span class="wc-n" aria-hidden="true">${i + 1}</span><div><b>${p[0]}</b><span>${p[1]}</span></div></li>`).join('')}</ol>
    <div class="wc-score"><h3>The pilot scorecard</h3><ul>${SCORE.map(s => `<li>${s}</li>`).join('')}</ul></div></div>
   <div class="wc-partner-form">${form}</div></div></section></div>`;
}
(function () {
  const base = V['for-centers'];
  if (typeof base !== 'function') return;
  V['for-centers'] = () => { const html = base(), cut = html.indexOf('<section'); return cut < 0 ? html + centersHtml() : html.slice(0, cut) + centersHtml() + html.slice(cut); };
})();

// ---------------------------------------------------------------- entry points for Home and Curriculum
function callout(where) {
  if (where === 'curriculum') return `<section class="wc-callout wc-callout-slim" aria-labelledby="wc-cu-h"><div class="wrap wc-cu"><span class="wc-heads wc-heads-lg" aria-hidden="true">${KEYS.map(k => art(k, { alt: '' })).join('')}</span>
   <div><h2 id="wc-cu-h">Learning is one part of the day.</h2><p>See how stories, meals, movement, Quiet Time and families connect.</p></div>${lnk('whole-child', 'See the whole-child day')}</div></section>`;
  return `<section class="wc-callout wc-callout-home" aria-labelledby="wc-co-h"><div class="wrap wc-co">
   <div class="wc-co-copy"><span class="wc-kick">The whole-child day</span><h2 id="wc-co-h">More than daycare. A system families can see.</h2>
    <p>Learning, meals, movement, rest and family connection, designed as one day and led by the four friends.</p>
    <div class="wc-acts">${lnk('whole-child', 'See the whole-child day')}${lnk('bop-at-home', 'Free Bop at Home activities', 'btn soft')}</div></div>
   <ol class="wc-strip" aria-label="The day in six steps">${DAY.map((s, i) => `<li style="--c:${col(s.c)}"><span class="wc-node" aria-hidden="true">${i + 1}</span><b>${s.n}</b><span class="wc-what">${s.what}</span></li>`).join('')}</ol></div></section>`;
}

// ---------------------------------------------------------------- per-route page description, reveal-on-scroll, footer links
const META = {
  'whole-child': 'One day, one connected system: learning, meals, movement, Quiet Time and family connection, led by Booker, Lumi, Zuri and Bop. Evidence-informed routines families can see.',
  'bop-at-home': 'Free family movement activities from Bop: no equipment, every one with an adapted version. Join the weekly Bop at Home challenge. Move Your Body, Grow Your Mind.',
  'for-centers': 'What a licensed Futures Friends center gets: media, curriculum, environment, family tools, training and optional merchandise. Talk to us about licensing.'
};
let metaOrig = null;
// #bop-at-home/bop-act-<slug> (the friend chip on a Futures at Home activity): open the page at that activity's video card
window.FFhooks = window.FFhooks || [];
window.FFhooks.push(view => {
  if (view !== 'bop-at-home') return;
  const m = /^#bop-at-home\/(bop-act-[a-z-]+)$/.exec(location.hash || '');
  if (m) setTimeout(() => { const el = document.getElementById(m[1]); if (!el) return; el.scrollIntoView({ block: 'start' }); el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: true }); }, 0);   // after the router's scroll to the top
});
window.FFhooks = window.FFhooks || [];
window.FFhooks.push(function (v, root, ok) {
  const m = document.querySelector('meta[name="description"]');
  if (m) { if (metaOrig === null) metaOrig = m.getAttribute('content') || ''; if (window.FFRouteMeta) window.FFRouteMeta.describe(v, typeof arg === 'undefined' ? undefined : arg); else m.setAttribute('content', META[v] || metaOrig); }
  if (!root || !ok || !window.IntersectionObserver) return;
  const els = [...root.querySelectorAll('.wc-rv')].filter(el => el.getBoundingClientRect().top > innerHeight);
  if (!els.length) return;
  els.forEach(el => el.classList.add('wc-pre'));
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('wc-in'); io.unobserve(e.target); } }), { threshold: .12 });
  els.forEach(el => io.observe(el));
});
try {
  const col2 = document.querySelector && document.querySelector('footer .cols > div:nth-child(2)');
  if (col2 && !col2.querySelector('[data-go="whole-child"]')) col2.insertAdjacentHTML('beforeend', '<button data-go="whole-child">The Whole-Child Day</button><button data-go="bop-at-home">Bop at Home</button>');
} catch (e) { /* the footer is optional */ }

window.FFWholeChild = { callout, signupPayload, AGE_OPTS, pendingHtml, TARGETS, ACTS, DAY, OWN, PROMISES, LICENSE, ENGINES, PILOT, TAGLINE, SRC, CENTER_PRESET, meta: META };
})();
