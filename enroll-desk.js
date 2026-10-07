/* Futures Hub director: "Rooms and tours" (W3A; hub migrations 20261011100000_w3a_enrollment_identity_capacity and
   20261011110000_w3a_tour_slots). Hub mode only, directors only.
   - Capacity per room: the licensed capacity comes from the CRM classroom (the ONE capacity number; it cannot be typed here), with
     children enrolled, children here today, open seats and a warning when a room is over its capacity (center_room_capacity).
   - Tour times: the director adds open tour slots for the center; families book them on the website (the intake gateway). A booked
     time cannot be moved or deleted here: the director changes or cancels the tour in the CRM, which tells the family.
   Every rule (who may read or write, no double booking, capacity) lives in Postgres; this file only draws and calls.
   Loaded after center-setup.js and director-due.js (it wraps V.portal the same way). */
(function(){
'use strict';
if (typeof V === 'undefined' || !V.portal) return;
const hubOn = () => !!(window.FFHub && window.FFHub.configured && window.FFHub.connected);
const sb = () => (window.FFHub && window.FFHub.client) ? window.FFHub.client() : null;
const ctx = () => (window.FFPortal && window.FFPortal.ctx) ? window.FFPortal.ctx() : {};
const rerender = () => { try { if (window.FFPortal && window.FFPortal.rerender) window.FFPortal.rerender(); } catch (_) {} };
const E = s => esc(s);
const msgOf = e => (e && e.message) ? e.message : 'That did not save. Try again in a moment.';
const S = { centerId:null, rooms:null, slots:null, bookings:null, err:'', note:'', busy:false, loading:false };
const STYLE_ID = 'ffEnrollDeskCss';
function css(){ if (document.getElementById(STYLE_ID)) return; const s = document.createElement('style'); s.id = STYLE_ID; s.textContent = `
.ed-panel{display:grid;gap:12px;margin-bottom:18px;border:1px solid var(--line);border-radius:18px;padding:16px 18px;background:var(--paper)}
.ed-panel h2{font-size:22px;margin:0}.ed-panel h3{font-size:17px;margin:6px 0 0}
.ed-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}
.ed-table{width:100%;border-collapse:collapse;font-size:14px;min-width:520px}.ed-table th,.ed-table td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--line);vertical-align:top}
.ed-warn{color:var(--bad);font-weight:600}.ed-form{display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end}.ed-form .f{min-width:140px}
.ed-chip{display:inline-block;border-radius:999px;padding:1px 9px;font-size:12px;border:1px solid var(--line)}.ed-chip.over{border-color:var(--bad);color:var(--bad)}.ed-chip.full{border-color:var(--gold)}`;
  document.head.appendChild(s); }

const CHICAGO = 'America/Chicago';
const when = iso => { try { return new Date(iso).toLocaleString('en-US', {timeZone:CHICAGO, weekday:'short', month:'short', day:'numeric', hour:'numeric', minute:'2-digit'}); } catch (_) { return iso; } };
// a Central-time date + time from the form -> an ISO instant (DST-correct: the offset Chicago has on that day)
function chicagoIso(date, time){
  const [y, m, d] = date.split('-').map(Number), [hh, mm] = time.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const parts = new Intl.DateTimeFormat('en-US', {timeZone:CHICAGO, hourCycle:'h23', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit'}).formatToParts(new Date(guess));
  const p = Object.fromEntries(parts.map(x => [x.type, x.value]));
  const asChicago = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
  return new Date(guess + (guess - asChicago)).toISOString();
}

async function load(){
  const c = ctx(); if (!c.center || S.loading) return;
  S.loading = true; S.centerId = c.center.id;
  try {
    const db = sb();
    const [rooms, slots, bookings] = await Promise.all([
      db.rpc('center_room_capacity', {p_center:S.centerId}),
      db.from('tour_slots').select('id, starts_at, minutes, seats, status, note').eq('center_id', S.centerId).gte('starts_at', new Date(Date.now() - 86400000).toISOString()).order('starts_at'),
      db.from('tour_bookings').select('id, slot_id, family_name, email, phone, child_age, status').eq('center_id', S.centerId)]);
    for (const r of [rooms, slots, bookings]) if (r.error) throw r.error;
    S.rooms = rooms.data || []; S.slots = (slots.data || []).filter(x => x.status === 'open'); S.bookings = (bookings.data || []).filter(b => b.status === 'booked');
    S.err = '';
  } catch (e) { S.err = msgOf(e); }
  finally { S.loading = false; rerender(); }
}

function roomsHtml(){
  if (!S.rooms) return '';
  if (!S.rooms.length) return '<p class="small muted">No rooms yet.</p>';
  const warn = S.rooms.filter(r => r.warning && r.state !== 'unknown');
  return `${warn.length ? `<p class="ed-warn" role="alert">${warn.map(r => `${E(r.room_name)}: ${E(r.warning)}`).join('<br>')}</p>` : ''}
 <div class="ed-scroll"><table class="ed-table"><tr><th scope="col">Room</th><th scope="col">Licensed capacity</th><th scope="col">Enrolled</th><th scope="col">Here today</th><th scope="col">Open seats</th></tr>
 ${S.rooms.map(r => `<tr><td>${E(r.room_name)}</td><td>${r.capacity == null ? `<span class="small">${E(r.warning || 'Not set')}</span>` : `${E(r.capacity)}${r.from_crm ? ' <span class="mini muted">from the CRM</span>' : ''}`}</td>
 <td>${E(r.enrolled)}</td><td>${E(r.present)}</td><td>${r.open_seats == null ? '' : E(r.open_seats)} ${r.state === 'over' ? '<span class="ed-chip over">Over capacity</span>' : r.state === 'full' ? '<span class="ed-chip full">Full</span>' : ''}</td></tr>`).join('')}</table></div>
 <p class="small muted" style="margin:0">Licensed capacity is set on each classroom in the CRM and copied here; waitlist offers use the same number.</p>`;
}

function toursHtml(){
  if (!S.slots) return '';
  const bySlot = id => S.bookings.filter(b => b.slot_id === id);
  return `<form class="ed-form" id="edSlotForm" novalidate>
 <label class="f" for="edDate">Date<input class="i" type="date" id="edDate" name="date" required></label>
 <label class="f" for="edTime">Start (Central)<input class="i" type="time" id="edTime" name="time" step="900" required></label>
 <label class="f" for="edMin">Minutes<select class="i" id="edMin" name="minutes"><option>20</option><option>30</option><option>45</option></select></label>
 <label class="f" for="edSeats">Families<select class="i" id="edSeats" name="seats"><option>1</option><option>2</option><option>3</option></select></label>
 <button class="btn navy" type="submit" ${S.busy ? 'disabled' : ''}>Add tour time</button></form>
 ${S.slots.length ? `<div class="ed-scroll"><table class="ed-table"><tr><th scope="col">Tour time</th><th scope="col">Booked</th><th scope="col"></th></tr>
 ${S.slots.map(s => { const bk = bySlot(s.id); return `<tr><td>${E(when(s.starts_at))} <span class="mini muted">${E(s.minutes)} min</span></td>
 <td>${bk.length ? bk.map(b => `${E(b.family_name)}${b.phone ? `, ${E(b.phone)}` : ''}${b.email ? `, ${E(b.email)}` : ''}${b.child_age ? ` <span class="mini muted">child ${E(b.child_age)}</span>` : ''}`).join('<br>') : `<span class="small muted">Open (${E(s.seats)} ${s.seats === 1 ? 'family' : 'families'})</span>`}</td>
 <td>${bk.length ? '<span class="mini muted">Change or cancel it in the CRM tour</span>' : `<button class="rl" type="button" data-ed="cancel" data-id="${E(s.id)}">Remove</button>`}</td></tr>`; }).join('')}</table></div>`
 : '<p class="small muted" style="margin:0">No tour times yet. Families see the times you add here on the website.</p>'}`;
}

function panel(){
  return `<section class="ed-panel" id="edPanel" aria-labelledby="edTitle"><h2 id="edTitle">Rooms and tours</h2>
 ${S.err ? `<p class="note" role="alert" style="color:var(--bad)">${E(S.err)}</p>` : ''}${S.note ? `<p class="note" role="status" style="color:var(--ok)">${E(S.note)}</p>` : ''}
 <h3>Capacity</h3>${roomsHtml()}<h3>Tour times</h3>${toursHtml()}</section>`;
}

const ANCHOR = '<section class="band-paper"><div class="wrap">';
function inject(html){
  if (!hubOn()) return html;
  const c = ctx(); if (!c.center || c.role !== 'director') return html;
  css();
  if (S.centerId !== c.center.id) { S.rooms = S.slots = S.bookings = null; load(); return html; }
  if (!S.rooms && !S.err) return html;
  const at = html.indexOf(ANCHOR);
  return at < 0 ? panel() + html : html.slice(0, at + ANCHOR.length) + panel() + html.slice(at + ANCHOR.length);
}
const basePortal = V.portal;
V.portal = () => inject(basePortal());

async function act(fn, note){
  if (S.busy) return; S.busy = true; S.err = ''; S.note = ''; rerender();
  try { await fn(); S.note = note; } catch (e) { S.err = msgOf(e); }
  finally { S.busy = false; S.centerId = null; await load(); }
}
document.addEventListener('click', e => {
  const t = e.target && e.target.closest ? e.target.closest('[data-ed]') : null; if (!t || !hubOn()) return;
  if (t.dataset.ed === 'cancel') act(async () => { const r = await sb().from('tour_slots').delete().eq('center_id', S.centerId).eq('id', t.dataset.id); if (r.error) throw r.error; }, 'Tour time removed.');
});
document.addEventListener('submit', e => {
  const f = e.target; if (!f || f.id !== 'edSlotForm' || !hubOn()) return; e.preventDefault();
  const v = Object.fromEntries(new FormData(f).entries());
  if (!v.date || !v.time) { S.err = 'Choose a date and a start time.'; return rerender(); }
  act(async () => {
    const r = await sb().from('tour_slots').insert({center_id:S.centerId, starts_at:chicagoIso(v.date, v.time), minutes:Number(v.minutes) || 20, seats:Number(v.seats) || 1});
    if (r.error) throw (r.error.code === '23505' ? new Error('There is already an open tour at that time.') : r.error);
  }, 'Tour time added: families can book it on the website.');
});
window.FFEnrollDesk = { chicagoIso, _state:S, reload:() => { S.centerId = null; return load(); } };
})();
