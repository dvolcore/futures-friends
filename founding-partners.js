/* Futures Friends: the Founding Partner pilot application (#founding-partners), owner 2026-10-07.
   Source of truth: ~/Downloads/FUTURES_FRIENDS_PROJECT/01_Investor/STRENGTHS_PACK_2026-10-07/_SHARED_BRIEF.md ("Founding Partner
   pilot" and "Pilot scorecard"). Rules this page keeps:
   - The terms are PROPOSED. The page never quotes a founding discount or a founding price (franchise-law caution, O-8/B01): it says
     "a reduced founding rate", "no monthly fee during the 90-day pilot" and "a founding monthly rate locked for 24 months", with the
     exact terms in a short written agreement after legal review. Not an offer.
   - No invented traction: the scorecard is a list of commitments. No results exist yet; the first cohort produces them.
   - No outcome or health claims. Booker, Lumi, Zuri and Bop are story-world characters.
   - The application goes ONLY through the site's existing intake (window.FFIntake, intake.js): kind "partner", interest "program",
     the same gateway every other request form uses. With the gateway off (intake-config.js url empty) the form is not shown and the
     card shows FFIntake.soon(): "Online requests open soon" with the phone number and email. Nothing is stored in the browser.
   Also adds one link band to #for-centers and one to #pricing (wrapped, never edited at the source). Home gets no link (link budget).
   Public: window.FFFounding = { GET, ASK, MEASURES, WHO, STEPS, TYPES, payload, band }. Loaded after intake.js and room-kit.js. */
(function () {
'use strict';
if (typeof V === 'undefined') return;
const W = window;
const E = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PH = typeof PHONE !== 'undefined' ? PHONE : '(816) 988-5661';
const EM = typeof EMAIL !== 'undefined' ? EMAIL : 'info@futureslearningcenter.com';
const TEL = 'tel:+1' + PH.replace(/\D/g, '').slice(-10);
const intake = () => W.FFIntake;
const gateway = () => !!(intake() && intake().enabled && intake().enabled());
const NOTE = 'Founding Partner terms are proposed and set in a written agreement after legal review. Not an offer.';

// ---------------------------------------------------------------- the program (brief: "Founding Partner pilot", proposed terms)
const GET = [
  ['A reduced founding rate', 'on the launch package for your program.'],
  ['No monthly fee during the pilot', 'for the full 90 days.'],
  ['A founding monthly rate, locked for 24 months', 'after the pilot, if you choose to continue.'],
  ['Onboarding and a room-map call', 'we fit the friend zones to your real rooms.'],
  ['A weekly 15-minute check-in', 'a standing time that fits around nap and pickup.'],
  ['A direct line to the founder', 'for questions, problems and ideas.'],
  ['First look at new units', 'before they reach other programs.'],
  ['Founding Partner recognition', 'on our site and in our materials, with your permission.']
];
const ASK = [
  ['Honest feedback', 'at the weekly check-in, plus short surveys on day 30, 60 and 90.'],
  ['The pilot scorecard, measured in your rooms', 'the eight measures below, mostly simple logs and timed checks.'],
  ['Case-study rights', 'your program name and quotes. Photos only with signed parent releases, and no child faces by default.'],
  ['Up to two warm introductions', 'to other programs, only if you are satisfied.'],
  ['Permission to list you as a Founding Partner', 'on our site and in our materials.']
];
// The pilot scorecard: commitments, not claims. [what, how we measure it, target or note]
const MEASURES = [
  ['Teacher setup time', 'Timed, from the kit being unboxed to the room being ready.', 'Target: under one day.'],
  ['Daily-use rate', 'The share of program days the Futures Friends routine is run, from the teacher log.', 'Target: 4 of 5 days.'],
  ['Teacher prep time per day', 'Timed in week 2 and again in week 10.', 'We make no prep-time claim until it is measured.'],
  ['Family connection', 'The share of families who open or receive the weekly take-home or pickup prompt (Futures Hub or a paper count).', 'Counted weekly.'],
  ['Parent recall', 'Can a parent name a friend or a phrase at pickup? A short parent survey on day 60.', 'Day-60 survey.'],
  ['Director value', 'Would you renew at the list price: yes, maybe or no, on day 90, plus a Net Promoter Score.', 'Day-90 review.'],
  ['Tour signal', 'The share of prospective-family tours where the room or the friends came up, from the director’s log.', 'Director log.'],
  ['Issues logged and fixed', 'Every issue you raise, counted, with the median number of days to fix it.', 'Tracked all 90 days.']
];
const WHO = [
  ['Licensed home providers', 'A licensed family child care home. We are looking for two or three.', 'lumi'],
  ['Small centers', 'About 20 to 40 children. We are looking for two.', 'booker'],
  ['Larger centers', 'About 41 to 80 children. We are looking for one or two.', 'zuri'],
  ['Church weekday preschools', 'Including rooms that are packed away for Sunday. We are looking for one or two.', 'bop']
];
const STEPS = [
  ['Apply', 'Send the short form below, or call or email us.'],
  ['A 20-minute call', 'We talk about your rooms, ages, enrollment and what would make this worth it for you.'],
  ['A short written agreement', 'The exact founding terms, in writing, after legal review. Nothing starts before both sides sign.'],
  ['Kit and onboarding', 'Your kit arrives, we fit the zones to your room map, and your team learns the routine.'],
  ['Weekly check-ins', 'Fifteen minutes a week, and the scorecard measured as you go.'],
  ['Day-90 review', 'We go through the scorecard together, and you decide whether to continue at the founding rate.']
];
// [value, label, gateway orgType]
const TYPES = [['home', 'Licensed home provider', 'homeDaycare'], ['small', 'Small center (about 20 to 40 children)', 'center'],
  ['larger', 'Larger center (about 41 to 80 children)', 'center'], ['church', 'Church weekday preschool', 'church'], ['other', 'Other program', 'other']];
const STATES = [['MO', 'Missouri'], ['KS', 'Kansas'], ['other', 'Another state']];

// ---------------------------------------------------------------- page
const sect = (id, cls, inner) => `<section class="fp-sec ${cls || ''}" id="${id}" aria-labelledby="${id}-h"><div class="wrap">${inner}</div></section>`;
const lead = (kick, title, sub, id) => `<div class="fp-head"><span class="fp-kick">${kick}</span><h2 id="${id}">${title}</h2>${sub ? `<p class="lede">${sub}</p>` : ''}</div>`;
const pairs = (rows, cls) => `<ul class="fp-list ${cls || ''}">${rows.map(r => `<li><b>${E(r[0])}</b> <span>${E(r[1])}</span></li>`).join('')}</ul>`;

function hero() {
  const h = typeof phero === 'function' ? phero : null;
  const lede = 'A 90-day pilot for 5 to 10 programs in the Kansas City area, in Missouri and Kansas: licensed home providers, small and larger centers, and church weekday preschools. You run Futures Friends in your rooms, and we measure together what it is worth.';
  const ctas = '<button type="button" class="btn gold" data-anchor="fp-apply">Apply to be a Founding Partner</button><button type="button" class="btn soft" data-anchor="fp-measure">What we will measure</button>';
  return h ? h('Founding Partners', 'Become a Founding Partner', lede, { crumb: ['for-centers', 'For centers'], cta: ctas })
    : `<div class="phero"><div class="wrap"><h1>Become a Founding Partner</h1><p class="lede">${lede}</p></div></div>`;
}
function terms() {
  return sect('fp-terms', 'band-paper', `${lead('Proposed terms', 'What you get, and what we ask', 'A reduced founding rate on the launch package, no monthly fee during the 90-day pilot, then a founding monthly rate locked for 24 months. The exact terms are in a short written agreement.', 'fp-terms-h')}
   <div class="grid g2 fp-terms">
    <div class="card fp-card fp-get"><h3>What you get</h3>${pairs(GET)}</div>
    <div class="card fp-card fp-ask"><h3>What we ask</h3>${pairs(ASK)}</div>
   </div>
   <p class="fp-note">Either side may end the pilot at any time during the 90 days, and you keep the printed materials.</p>`);
}
function measures() {
  return sect('fp-measure', '', `${lead('The pilot scorecard', 'What we’ll measure together', 'These are the measures we commit to tracking with you. No results yet: the first pilot cohort produces them.', 'fp-measure-h')}
   <ol class="fp-measures">${MEASURES.map((m, i) => `<li class="card fp-measure"><span class="fp-num" aria-hidden="true">${i + 1}</span><div><h3>${E(m[0])}</h3><p class="small">${E(m[1])}</p><p class="fp-target">${E(m[2])}</p></div></li>`).join('')}</ol>
   <p class="fp-note">Results are reported in aggregate. A program is named only with its permission.</p>`);
}
function who() {
  return sect('fp-who', 'band-paper', `${lead('Who it’s for', 'Four kinds of programs, one pilot', 'A mix of program types in the Kansas City metro, on both sides of State Line, so the pilot shows how Futures Friends works in each kind of room.', 'fp-who-h')}
   <div class="grid g4 fp-who">${WHO.map(w => `<div class="card fp-card" style="border-top:5px solid var(--${w[2]})"><h3>${E(w[0])}</h3><p class="small">${E(w[1])}</p></div>`).join('')}</div>`);
}
function how() {
  return sect('fp-how', '', `${lead('How it works', 'From application to day 90', '', 'fp-how-h')}
   <ol class="fp-steps">${STEPS.map(s => `<li><b>${E(s[0])}</b><span>${E(s[1])}</span></li>`).join('')}</ol>`);
}

const field = (id, label, input, err) => `<label class="f" for="${id}">${label}${input}${err ? `<span class="ffx-err" id="${id}-e" aria-live="polite"></span>` : ''}</label>`;
function formHtml() {
  const I = intake();
  const wrapCard = inner => `<div class="card fp-formcard" id="fpApplyCard"><h3>Apply to be a Founding Partner</h3>${inner}</div>`;
  if (!gateway()) {
    const soon = I && I.soon ? I.soon('Founding Partner applications')
      : `<div class="ffi-soon" role="note"><b>Online requests open soon.</b><p class="small" style="margin:0">Please call <a class="rl" href="${TEL}">${E(PH)}</a> or email <a class="rl" href="mailto:${E(EM)}">${E(EM)}</a>.</p></div>`;
    return wrapCard(`${soon}<p class="small fp-tell">When you call or email, tell us: your program name and type, city and state, number of children and classrooms, a contact name, email and phone, and what would make this worth it for you.</p>`);
  }
  setTimeout(() => { try { I.warm(); } catch (_) { /* the gateway is optional */ } }, 0);
  const opt = list => list.map(o => `<option value="${o[0]}">${E(o[1])}</option>`).join('');
  return wrapCard(`<p class="small muted" style="margin:0">A real person will contact you within two business days to set up a 20-minute call. Applying is not an agreement. Please do not include children’s names, health or personal details.</p>
  <form class="ffi-form" id="fpForm" novalidate>
   ${field('fpOrg', 'Program name', '<input class="i" id="fpOrg" name="org" autocomplete="organization" maxlength="150" aria-describedby="fpOrg-e">', true)}
   ${field('fpType', 'Program type', `<select class="i" id="fpType" name="programType" aria-describedby="fpType-e"><option value="">Choose one</option>${opt(TYPES)}</select>`, true)}
   <div class="ffx-row">${field('fpCity', 'City', '<input class="i" id="fpCity" name="city" autocomplete="address-level2" maxlength="60" aria-describedby="fpCity-e">', true)}
   ${field('fpState', 'State', `<select class="i" id="fpState" name="state" aria-describedby="fpState-e"><option value="">Choose one</option>${opt(STATES)}</select>`, true)}
   ${field('fpZip', 'ZIP code', '<input class="i" id="fpZip" name="zip" inputmode="numeric" autocomplete="postal-code" maxlength="10" aria-describedby="fpZip-e">', true)}</div>
   <div class="ffx-row">${field('fpKids', 'Number of children', '<input class="i" id="fpKids" name="kids" type="number" min="1" max="9999" inputmode="numeric" aria-describedby="fpKids-e">', true)}
   ${field('fpRooms', 'Number of classrooms', '<input class="i" id="fpRooms" name="classrooms" type="number" min="1" max="99" inputmode="numeric" aria-describedby="fpRooms-e">', true)}</div>
   ${field('fpName', 'Contact name', '<input class="i" id="fpName" name="name" autocomplete="name" maxlength="100" aria-describedby="fpName-e">', true)}
   <div class="ffx-row">${field('fpEmail', 'Email address', '<input class="i" id="fpEmail" name="email" type="email" autocomplete="email" aria-describedby="fpEmail-e">', true)}
   ${field('fpPhone', 'Phone', '<input class="i" id="fpPhone" name="phone" type="tel" autocomplete="tel" aria-describedby="fpPhone-e">', true)}</div>
   ${field('fpWorth', 'What would make this worth it for you?', '<textarea class="i" id="fpWorth" name="worth" maxlength="1500" aria-describedby="fpWorth-e"></textarea>', true)}
   ${I.honeypot('fpHp')}
   <button class="btn gold" type="submit">Send my application</button>
   <p class="ffi-note">${E(NOTE)} We use what you send only to answer your application. See our <a class="rl" href="#privacy">privacy policy</a>.</p>
  </form>`);
}
function apply() {
  return sect('fp-apply', 'band-paper', `<div class="fp-applygrid"><div>${lead('Apply', 'Tell us about your program', 'Five to ten programs, Kansas City area first. We read every application and call you to talk it through before anything is agreed.', 'fp-apply-h')}
    <p class="fp-note">Prefer to talk? Call <a class="rl" href="${TEL}">${E(PH)}</a> or email <a class="rl" href="mailto:${E(EM)}">${E(EM)}</a>.</p></div>
   <div>${formHtml()}</div></div>`);
}

V['founding-partners'] = () => `<div class="fp">${hero()}${terms()}${measures()}${who()}${how()}${apply()}
 <p class="wrap fp-foot">${E(NOTE)} Booker, Lumi, Zuri and Bop are story-world characters.</p></div>`;

// ---------------------------------------------------------------- the application: the site's own intake, kind "partner"
function payload(f) {
  const t = TYPES.find(x => x[0] === f.type) || TYPES[TYPES.length - 1], s = STATES.find(x => x[0] === f.state);
  const message = ['Founding Partner pilot application', 'Program type: ' + t[1], 'City and state: ' + [f.city, s ? s[1] : ''].filter(Boolean).join(', '),
    'Classrooms: ' + f.rooms, 'What would make this worth it: ' + (f.worth || '')].join('\n');
  const data = { interest: 'program', name: f.name, email: f.email, phone: f.phone, org: f.org, orgType: t[2], kids: f.kids, zip: f.zip, message, website: f.website || '' };
  Object.keys(data).forEach(k => { if (data[k] === '' || data[k] == null) delete data[k]; });
  return { kind: 'partner', data };
}
const FIELDS = { name: 'fpName', email: 'fpEmail', phone: 'fpPhone', org: 'fpOrg', orgType: 'fpType', kids: 'fpKids', zip: 'fpZip', message: 'fpWorth' };
async function onSubmit(f) {
  const I = intake(); if (!I) return;
  const $ = id => document.getElementById(id), v = id => (($(id) || {}).value || '').trim();
  I.clearMsg(f);
  const whole = (x, lo, hi) => /^\d{1,4}$/.test(x) && +x >= lo && +x <= hi;
  const ok = [I.setErr('fpOrg', v('fpOrg').length >= 2 ? '' : 'Add your program name.'), I.setErr('fpType', v('fpType') ? '' : 'Choose your program type.'),
    I.setErr('fpCity', v('fpCity').length >= 2 ? '' : 'Add your city.'), I.setErr('fpState', v('fpState') ? '' : 'Choose your state.'),
    I.setErr('fpZip', /^\d{5}(-\d{4})?$/.test(v('fpZip')) ? '' : 'Add the 5-digit ZIP code of your program.'),
    I.setErr('fpKids', whole(v('fpKids'), 1, 9999) ? '' : 'Enter the number of children, 1 or more.'),
    I.setErr('fpRooms', whole(v('fpRooms'), 1, 99) ? '' : 'Enter the number of classrooms, 1 or more.'),
    I.setErr('fpName', v('fpName').length >= 2 ? '' : 'Add a contact name.'), I.setErr('fpEmail', I.okEmail(v('fpEmail')) ? '' : 'Enter a valid email address.'),
    I.setErr('fpPhone', I.okPhone(v('fpPhone')) ? '' : 'Enter a 10-digit phone number.'),
    I.setErr('fpWorth', v('fpWorth') ? '' : 'Tell us what would make this worth it for you.')];
  if (!ok.every(Boolean)) { const bad = f.querySelector('[aria-invalid="true"]'); if (bad) bad.focus(); return; }
  const p = payload({ org: v('fpOrg'), type: v('fpType'), city: v('fpCity'), state: v('fpState'), zip: v('fpZip'), kids: v('fpKids'), rooms: v('fpRooms'),
    name: v('fpName'), email: v('fpEmail'), phone: v('fpPhone'), worth: v('fpWorth'), website: v('fpHp') });
  I.busy(f, true);
  const r = await I.submit(p.kind, p.data);
  if (r.ok) {
    I.showReceipt($('fpApplyCard'), { title: 'We received your Founding Partner application.', ref: r.ref, days: r.days, email: p.data.email, emailConfirmation: r.emailConfirmation,
      lines: ['We will call you to set up a 20-minute conversation. Applying is not an agreement, and nothing starts until both sides sign the written terms.'] });
  } else I.showFailure(f, r, FIELDS);
}
if (typeof document !== 'undefined' && document.addEventListener) {
  document.addEventListener('submit', ev => { const f = ev.target; if (f && f.id === 'fpForm') { ev.preventDefault(); onSubmit(f); } }, true);
}

// ---------------------------------------------------------------- one link band on #for-centers and #pricing (wrap, never edit their source)
function band(where) {
  const copy = where === 'pricing'
    ? ['Founding Partner pilot', 'Five to ten Kansas City area programs get a reduced founding rate and no monthly fee during a 90-day pilot. Terms are proposed and set in a written agreement.']
    : ['Be one of our first programs', 'A 90-day Founding Partner pilot for 5 to 10 programs in the Kansas City area: home providers, centers and church weekday preschools.'];
  return `<section class="fp-band" aria-labelledby="fp-band-${where}-h"><div class="wrap fp-bandin"><div><h2 id="fp-band-${where}-h">${copy[0]}</h2><p>${copy[1]}</p></div><a class="btn navy" href="#founding-partners">Become a Founding Partner</a></div></section>`;
}
function wrap(route, fn) {
  const base = V[route];
  if (typeof base !== 'function') return;
  V[route] = function () { return fn(base.apply(this, arguments)); };
}
const beforeLast = (html, marker, add) => { const at = html.lastIndexOf(marker); return at < 0 ? html + add : html.slice(0, at) + add + html.slice(at); };
wrap('for-centers', h => beforeLast(h, '<section class="tight">', band('centers')));
wrap('pricing', h => beforeLast(h, '<section class="tight">', band('pricing')));

W.FFFounding = { GET, ASK, MEASURES, WHO, STEPS, TYPES, STATES, NOTE, payload, band };
})();
