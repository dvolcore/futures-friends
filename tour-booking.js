/* Book a tour at an open time (W3A). The center's director sets tour times in the Futures Hub; the intake gateway lists the open ones
   (GET /v1/tour-slots) and books one (POST /v1/inquiry kind=tour with `slot`): the hub claims the seat first, so two families can never
   get the same time, and the CRM then sends the confirmation (with a calendar file) and a reminder the day before.
   Honest by construction: with no gateway configured (window.FF_INTAKE.url empty) the tour card keeps saying "Online requests open
   soon" (features.js) and this file does nothing; with a gateway but no open times, or if the times cannot be loaded, the family keeps
   the existing request form ("this is a request, not a booked tour"). "Booked" is only ever shown after the gateway confirmed it.
   Loaded after features.js and intake.js. */
(function(){
'use strict';
const FI = () => window.FFIntake;
const LOCATION = 'flc';
const e = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const el = id => document.getElementById(id);
const val = id => ((el(id) || {}).value || '').trim();
const label = iso => new Date(iso).toLocaleString('en-US', {timeZone:'America/Chicago', weekday:'short', month:'short', day:'numeric', hour:'numeric', minute:'2-digit'});
const S = { slots:null, picked:null, loadedFor:null, busy:false };

async function fetchSlots(){
  const base = FI() && FI().base ? FI().base() : '';
  if (!base) return null;
  try {
    const r = await fetch(`${base}/v1/tour-slots?location=${LOCATION}`, {headers:{Accept:'application/json'}});
    if (!r.ok) return null;
    const j = await r.json();
    return Array.isArray(j.slots) ? j.slots.filter(s => s && typeof s.id === 'string' && s.start) : null;
  } catch (_) { return null; }
}

function slotsHtml(){
  return `<div class="ffx-tb" id="ffxTb" style="display:grid;gap:8px">
  <span class="ffx-lbl" id="ffxTbL">Book an open tour time</span>
  <div class="ffx-slots ffx-times" role="group" aria-labelledby="ffxTbL">${S.slots.map(s => `<button type="button" class="ffx-slot" data-ffxb-slot="${e(s.id)}" aria-pressed="${S.picked === s.id}"><b style="font-size:15px">${e(label(s.start))}</b><small>${e(s.minutes)} min · Central Time</small></button>`).join('')}</div>
  <span class="ffx-err" id="ffxbSlot-e" aria-live="polite"></span>
  <p class="small muted" style="margin:0" id="ffxTbHint">${S.picked ? 'Fill in your details below and press "Book this tour".' : 'Or ask for another time with the date and time pickers below.'}</p></div>`;
}

function paint(form){
  if (!S.slots || !S.slots.length || !form) return;
  const old = el('ffxTb'); if (old) old.remove();
  form.insertAdjacentHTML('afterbegin', slotsHtml());
  const btn = form.querySelector('button[type="submit"]');
  if (btn && !S.busy) btn.textContent = S.picked ? 'Book this tour' : 'Request this tour';
  const demo = form.querySelector('.ffx-demo');
  if (demo) demo.textContent = S.picked ? 'You are booking this exact time. A confirmation follows by email if you give one.' : 'This is a request, not a booked tour. The center will call you to agree on a time.';
}

async function enhance(form){
  if (!form || form.dataset.ffxbDone) return;
  form.dataset.ffxbDone = '1';
  if (!FI() || !FI().enabled()) return;
  if (S.slots === null || S.loadedFor !== FI().base()) { S.loadedFor = FI().base(); S.slots = await fetchSlots(); }
  paint(form);
}

new MutationObserver(() => { const f = el('ffxTourForm'); if (f && !f.dataset.ffxbDone) enhance(f); })
  .observe(document.documentElement, {childList:true, subtree:true});

document.addEventListener('click', ev => {
  const b = ev.target && ev.target.closest ? ev.target.closest('[data-ffxb-slot]') : null; if (!b) return;
  S.picked = S.picked === b.dataset.ffxbSlot ? null : b.dataset.ffxbSlot;
  paint(el('ffxTourForm'));
  const err = el('ffxbSlot-e'); if (err) err.textContent = '';
});

// Runs before features.js's own tour submit (window capture comes before document capture) only when an open time was picked.
window.addEventListener('submit', async ev => {
  const f = ev.target; if (!f || f.id !== 'ffxTourForm' || !S.picked) return;
  ev.preventDefault(); ev.stopImmediatePropagation();
  const okPhone = s => s.replace(/\D/g, '').length >= 10, okEmail = s => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
  const checks = [FI().setErr('tName', val('tName').length >= 2 ? '' : 'Add your name.'), FI().setErr('tPhone', okPhone(val('tPhone')) ? '' : 'Enter a 10-digit phone number.'),
    FI().setErr('tEmail', !val('tEmail') || okEmail(val('tEmail')) ? '' : 'Check the email address.'), FI().setErr('tAge', val('tAge') ? '' : 'Add your child\'s age.')];
  if (!checks.every(Boolean)) { const bad = f.querySelector('[aria-invalid="true"]'); if (bad) bad.focus(); return; }
  const slot = S.slots.find(s => s.id === S.picked);
  const data = {location:LOCATION, slot:S.picked, name:val('tName'), phone:val('tPhone'), childAge:val('tAge'), website:val('ffiHpT')};
  if (val('tEmail')) data.email = val('tEmail');
  FI().clearMsg(f); FI().busy(f, true); S.busy = true;
  const res = await FI().submit('tour', data);
  S.busy = false;
  if (!res.ok) {
    if (res.errors && res.errors.slot) {          // taken a moment ago: show the fresh list
      S.picked = null; S.slots = await fetchSlots() || [];
      FI().busy(f, false); paint(f);
      const err = el('ffxbSlot-e'); if (err) err.textContent = res.errors.slot;
      return;
    }
    return FI().showFailure(f, res, {name:'tName', phone:'tPhone', email:'tEmail', childAge:'tAge'});
  }
  f.outerHTML = FI().receipt({title:`Your tour is booked: ${slot ? label(slot.start) : 'the time you picked'} (Central Time).`, ref:res.ref, days:res.days, email:data.email,
    emailConfirmation:res.emailConfirmation, lines:['The center has this time for you. If you gave an email address, a confirmation with a calendar file follows, and a reminder the day before.',
      'Need another time? Call us and quote your reference number.']});
  S.picked = null; S.slots = null;
  const ok = el('ffiOk'); if (ok) ok.focus({preventScroll:true});
}, true);

window.FFTourBooking = { _state:S, enhance };
})();
