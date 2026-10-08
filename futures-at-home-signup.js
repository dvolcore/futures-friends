/* "Futures at Home" messages sign-up on #at-home: three short ideas a week (Monday, Wednesday, Friday) from Booker, Lumi, Zuri and Bop,
   by email, for the child's age band. The same honest double opt-in pattern as the Bop at Home weekly challenge (whole-child.js):
   kind "subscribe" with topic "futures_at_home" goes to the intake gateway (window.FF_INTAKE.url), which stores the address in the
   Futures Hub and sends ONE confirmation email; nothing else is sent until the link in it is opened. Every message has a one-click
   unsubscribe link. With no gateway configured the form is not shown and the card says "Online requests open soon".
   Only the adult's email, an optional first name and a coarse age band are collected; nothing about the child. Loaded after
   family-library.js (it adds a section to that page) and intake.js. */
(function () {
'use strict';
if (typeof V === 'undefined' || !V['at-home']) return;
const intake = () => window.FFIntake;
const gateway = () => !!(intake() && intake().enabled());
const E = s => esc(s == null ? '' : String(s));
const PHONE = '(816) 988-5661';

// The five age bands of the family library (family-library-data.js BANDS) and of hub/content/futures-at-home.
const AGE_OPTS = [['twos', 'Two-year-old'], ['threes', 'Three-year-old'], ['prek', 'Pre-K (4 and 5 years)']];

function payload(f) {
  return { kind: 'subscribe', data: { topic: 'futures_at_home', email: f.email, firstName: f.name || '', ageBand: f.age, consent: !!f.consent, website: f.website || '' } };
}

const WHAT = `<ul class="fh-what">
  <li><b>Monday:</b> one thing worth knowing about your child's age, and why.</li>
  <li><b>Wednesday:</b> one small thing to try today, with a free activity or printable from this library.</li>
  <li><b>Friday:</b> one way to build on it.</li></ul>
  <p class="small" style="margin:0">Each tip names its source (CDC, AAP, ZERO TO THREE, Harvard Center on the Developing Child, WHO). Short enough to read in a minute. No scores, no comparing, no health claims.</p>`;

function form() {
  const I = intake();
  if (!gateway()) return `<div class="card fh-card" id="fhCard"><h3>Get Futures at Home three times a week</h3>${WHAT}${I ? I.soon('Futures at Home sign-ups') : `<p class="small">Online sign-ups are not available on this page right now. Please call ${PHONE} and a real person will help you.</p>`}</div>`;
  setTimeout(() => { try { I.warm(); } catch (e) { /* the gateway is optional */ } }, 0);
  return `<div class="card fh-card" id="fhCard"><h3>Get Futures at Home three times a week</h3>${WHAT}
  <form class="ffi-form" id="fhForm" novalidate>
   <label class="f" for="fhName">Your first name (optional)<input class="i" id="fhName" name="firstName" autocomplete="given-name" aria-describedby="fhName-e"><span class="ffx-err" id="fhName-e" aria-live="polite"></span></label>
   <label class="f" for="fhEmail">Email address<input class="i" id="fhEmail" name="email" type="email" autocomplete="email" aria-describedby="fhEmail-e"><span class="ffx-err" id="fhEmail-e" aria-live="polite"></span></label>
   <label class="f" for="fhAge">Your child's age<select class="i" id="fhAge" name="ageBand" aria-describedby="fhAge-e"><option value="">Choose one</option>${AGE_OPTS.map(a => `<option value="${a[0]}">${a[1]}</option>`).join('')}</select><span class="ffx-err" id="fhAge-e" aria-live="polite"></span></label>
   <div><label class="ffi-check" for="fhConsent"><input type="checkbox" id="fhConsent" name="consent" aria-describedby="fhConsent-e"><span>Yes, email me Futures at Home, about three short messages a week. I can unsubscribe at any time with one click.</span></label><span class="ffx-err" id="fhConsent-e" aria-live="polite"></span></div>
   ${I.honeypot('fhHp')}
   <button class="btn gold" type="submit">Sign me up</button>
   <p class="ffi-note">Please do not include your child's name or any health details: nothing about your child is collected here. We use your email only for Futures at Home and never sell it. See our <a class="rl" href="#privacy">privacy policy</a>.</p>
  </form></div>`;
}

function pending(o) {
  const sent = o.emailConfirmation === 'queued';
  return `<div class="ffx-ok" role="status" tabindex="-1" id="ffiOk">
  <span class="tag c" style="--c:var(--ok);justify-self:start">${sent ? 'One more step' : 'Not signed up yet'}</span>
  <h3>${sent ? 'Check your email to confirm' : 'We could not send the confirmation email'}</h3>
  ${sent
    ? `<p class="small" style="margin:0">We sent a message to <b style="overflow-wrap:anywhere">${E(o.email)}</b>. <b>You are not signed up until you open the link in it.</b> If it does not arrive in a few minutes, check your spam folder.</p>
  <p class="small" style="margin:0">After you confirm, Futures at Home arrives on Monday, Wednesday and Friday, and every email has a one-click unsubscribe link.</p>`
    : `<p class="small" style="margin:0">We could not send an email to <b style="overflow-wrap:anywhere">${E(o.email)}</b> right now, so you are not signed up yet. Please try again later, or call ${PHONE} and a real person will help.</p>`}
  <p class="small muted" style="margin:0">Reference ${E(o.ref)}</p>
  <a class="btn soft" href="#activities" style="justify-self:start">Find something to do tonight</a></div>`;
}

async function onSubmit(f) {
  const I = intake(), $ = id => document.getElementById(id), v = id => (($(id) || {}).value || '').trim();
  if (!I) return;
  I.clearMsg(f);
  const age = v('fhAge'), consent = !!($('fhConsent') && $('fhConsent').checked);
  const ok = [I.setErr('fhEmail', I.okEmail(v('fhEmail')) ? '' : 'Enter a valid email address.'), I.setErr('fhAge', age ? '' : 'Choose an age.'),
    I.setErr('fhConsent', consent ? '' : 'Please check the box to get the Futures at Home emails.')];
  if (!ok.every(Boolean)) { const bad = f.querySelector('[aria-invalid="true"]'); if (bad) bad.focus(); return; }
  const p = payload({ name: v('fhName'), email: v('fhEmail'), age, consent, website: v('fhHp') });
  Object.keys(p.data).forEach(k => { if (p.data[k] === '') delete p.data[k]; });
  I.busy(f, true);
  const r = await I.submit(p.kind, p.data);
  if (r.ok) { const card = $('fhCard'); card.innerHTML = pending({ ref: r.ref, email: p.data.email, emailConfirmation: r.emailConfirmation }); const o = $('ffiOk'); if (o) { o.focus({ preventScroll: true }); o.scrollIntoView({ block: 'nearest' }); } return; }
  if (r.message && /Weekly challenge sign-up/.test(r.message)) r.message = `Futures at Home sign-up is not available right now, so nothing was saved. Please try again later or call ${PHONE}.`;
  I.showFailure(f, r, { email: 'fhEmail', firstName: 'fhName', ageBand: 'fhAge', consent: 'fhConsent' });
}
document.addEventListener('submit', ev => { const f = ev.target; if (f && f.id === 'fhForm') { ev.preventDefault(); onSubmit(f); } }, true);

const STYLE = `<style id="fh-css">.fh-sec .fh-card{max-width:720px;display:grid;gap:12px}.fh-what{margin:0;padding-left:20px;display:grid;gap:4px}</style>`;
const section = () => `<section class="fl-sec band-paper fh-sec" id="fl-messages" aria-labelledby="fl-messages-h"><div class="wrap">
  ${document.getElementById('fh-css') ? '' : STYLE}<span class="fl-kick">Three times a week</span><h2 id="fl-messages-h">Futures at Home, in your inbox</h2>
  <p class="lede">Three short, specific ideas a week, one minute to read and a few minutes to try. It is the rhythm of READY4K, a text-message program that led families to do more learning activities at home in a randomized study (York, Loeb and Doss, 2019).</p>
  ${form()}</div></section>`;

const base = V['at-home'];
V['at-home'] = () => base().replace(/<\/div>\s*$/, () => section() + '</div>');
window.FFFahSignup = { payload, AGE_OPTS };
})();
