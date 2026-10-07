/* Futures Hub: the director's "Get started" checklist for a new center, and the center's lifecycle banners (hub mode only).
   A center the CRM provisions (the CRM -> hub center sync) opens with this panel for its director: confirm the center profile
   (license, state, license type, the location for the weather card), rooms with age bands, children, staff (hires arrive from the
   CRM), the Daily Rhythm policy, the compliance calendar and inviting families. Progress is saved in the hub
   (center_setup_steps) and HQ sees it in the CRM. Read-only and suspended centers show a banner to everyone; their director can
   export the center's data. Every rule (who may mark a step, what evidence a step needs, read-only) is enforced in Postgres
   (migration 20261008100000_center_provisioning); this file only draws and calls. Loaded after portal.js and daily-rhythm.js. */
(function(){
'use strict';
if (typeof V === 'undefined' || !V.portal) return;
const hubOn = () => !!(window.FFHub && window.FFHub.configured && window.FFHub.connected);
const sb = () => (window.FFHub && window.FFHub.client) ? window.FFHub.client() : null;
const ctx = () => (window.FFPortal && window.FFPortal.ctx) ? window.FFPortal.ctx() : {};
const rerender = () => { try { if (view === 'portal' || view === 'family-portal') render(); } catch (_) {} };
const E = s => esc(s);
const msgOf = e => (e && e.message) ? e.message : 'That did not save. Try again in a moment.';

const STEPS = {
  profile: ['Confirm your center profile', 'License number and dates, state and license type, and where the center is (for the weather card).'],
  rooms: ['Set up your classrooms', 'Each classroom needs the age of its youngest child: it sets the daily rhythm targets.'],
  children: ['Add your children', 'Add each child to a classroom. Families see only their own child.'],
  staff: ['Your staff', 'Teachers and staff you hire in the CRM get their Futures Hub login automatically, with their required training.'],
  rhythm: ['Acknowledge the Daily Rhythm policy', 'Read the policy once; then you can adjust the center’s rhythm settings.'],
  compliance: ['Review your compliance calendar', 'Your state’s training and licensing deadlines, worked out from your profile.'],
  families: ['Invite your families', 'Each family gets an email to set a password and follow their child’s day.'],
};
const FACILITY = [['child_care_center','Child care center'],['preschool','Preschool'],['family_home','Family child care home'],['group_home','Group child care home'],
  ['school_age','School-age program'],['license_exempt_religious','License-exempt religious program (Missouri)']];
const MONTHS = [[0,'Infants (under 12 months)'],[12,'12 to 23 months'],[24,'2 years'],[36,'3 years'],[48,'4 to 5 years'],[60,'School age']];
const INVITE_STATUS = {pending:'Sending soon', invited:'Invited', active:'Joined', blocked:'Needs attention', cancelled:'Cancelled'};

const S = { centerId:null, row:null, status:null, cfg:null, invites:null, loading:false, err:null, open:null, collapsed:false, busy:false, note:'', exporting:false };
const STYLE_ID = 'ff-setup-css';
function css(){ if (document.getElementById(STYLE_ID)) return; const s = document.createElement('style'); s.id = STYLE_ID; s.textContent = `
.cs-panel{display:grid;gap:12px;margin-bottom:18px;border:2px solid var(--gold);border-radius:18px;padding:16px 18px;background:var(--paper)}
.cs-head{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;justify-content:space-between}
.cs-head h2{font-size:22px;margin:0}
.cs-meter{height:10px;border-radius:999px;background:var(--paper2);border:1px solid var(--line);overflow:hidden;min-width:160px;flex:1;max-width:280px}
.cs-meter i{display:block;height:100%;background:var(--zuri)}
.cs-steps{display:grid;gap:0;list-style:none;margin:0;padding:0}
.cs-step{display:grid;gap:8px;padding:10px 0;border-top:1px solid var(--line)}
.cs-row{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center}
.cs-dot{width:24px;height:24px;border-radius:50%;border:2px solid var(--line);display:inline-grid;place-items:center;font-size:13px}
.cs-dot.done{background:var(--zuri);border-color:var(--zuri);color:#fff}
.cs-body{display:grid;gap:10px;padding:4px 0 6px 34px}
.cs-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}
.cs-grid .i,.cs-body select.i{padding:7px 9px;width:100%}
.cs-acts{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.cs-check{display:flex;gap:8px;align-items:center;font-size:14px;align-self:end;padding-bottom:10px}
.cs-check input{width:18px;height:18px;flex:none}
.cs-banner{display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;justify-content:space-between;margin-bottom:18px;padding:14px 16px;border-radius:14px;border:2px solid var(--gold);background:var(--paper2)}
.cs-banner.stop{border-color:var(--bad,#c0392b)}
.cs-table{width:100%;border-collapse:collapse;font-size:14px}.cs-table td,.cs-table th{padding:6px 4px;border-bottom:1px solid var(--line);text-align:left}
@media (max-width:640px){.cs-body{padding-left:0}.cs-row{grid-template-columns:auto minmax(0,1fr)}.cs-row>.btn{grid-column:1/-1}}
`; document.head.appendChild(s); }

// ---------------------------------------------------------------- data
async function load(force){
  const c = ctx(); const id = c.center && c.center.id; if (!id || !sb()) return;
  if (S.loading || (!force && S.centerId === id)) return;
  if (S.centerId !== id) Object.assign(S, {status:null, cfg:null, invites:null, open:null, note:'', err:null});
  S.centerId = id; S.loading = true;
  try {
    const r = await sb().from('centers').select('id,name,status,status_reason,suspend_after').eq('id', id).maybeSingle();
    if (r.error) throw r.error;
    S.row = r.data;
    if (c.role === 'director' && S.row && S.row.status !== 'suspended') {
      const [st, cfg, inv] = await Promise.all([
        sb().rpc('center_setup_status', {p_center:id}),
        sb().from('rhythm_room_config').select('room,youngest_months').eq('center_id', id),
        sb().from('center_family_invites').select('id,email,full_name,kid,status,note,created_at').eq('center_id', id).order('created_at', {ascending:false}),
      ]);
      if (st.error) throw st.error;
      S.status = st.data;
      S.cfg = Object.fromEntries((cfg.data || []).map(x => [x.room, x.youngest_months]));
      S.invites = inv.data || [];
    }
    S.err = null;
  } catch (e) { S.err = msgOf(e); }
  finally { S.loading = false; rerender(); }
}

async function act(fn, okNote){
  if (S.busy) return; S.busy = true; S.note = ''; rerender();
  try { await fn(); if (okNote) S.note = okNote; S.err = null; }
  catch (e) { S.err = msgOf(e); }
  finally { S.busy = false; await load(true); }
}
const useStatus = data => { if (data && data.steps) S.status = data; };

// ---------------------------------------------------------------- views
const fmt = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', {month:'long', day:'numeric', year:'numeric'}) : '';
function banner(role){
  const r = S.row; if (!r || r.status === 'active') return '';
  const dir = role === 'director';
  const exp = dir ? `<button class="btn gold" type="button" data-cs="export" ${S.exporting?'disabled':''}>${S.exporting?'Preparing...':'Export the center’s data'}</button>` : '';
  if (r.status === 'read_only') return `<div class="cs-banner" role="status" id="csBanner"><div><b>This center is read-only${r.suspend_after?` until ${E(fmt(r.suspend_after))}`:''}.</b>
 <p class="small" style="margin:4px 0 0">${r.status_reason?E(r.status_reason[0].toUpperCase()+r.status_reason.slice(1))+'. ':''}Everything stays visible, but nothing new can be saved. Nothing has been deleted.${dir?' You can download everything the center has at any time.':''}</p></div>${exp}</div>`;
  return `<div class="cs-banner stop" role="alert" id="csBanner"><div><b>This center is suspended.</b>
 <p class="small" style="margin:4px 0 0">${r.status_reason?E(r.status_reason[0].toUpperCase()+r.status_reason.slice(1))+'. ':''}Its information is closed to staff and families. Nothing has been deleted${dir?'; as the director you can still download all of it':''}. Contact Futures Friends to open it again.</p></div>${exp}</div>`;
}

function stepBody(step, st){
  const c = ctx(), id = S.centerId, done = st.done, ready = st.ready;
  const mark = (label, needReady = true) => done
    ? `<button class="btn soft" type="button" data-cs="undo" data-step="${step}" ${S.busy?'disabled':''}>Mark as not done</button>`
    : `<button class="btn navy" type="button" data-cs="mark" data-step="${step}" ${S.busy||(needReady&&!ready)?'disabled':''}>${label}</button>`;
  if (step === 'profile') {
    const p = (S.status && S.status.profile) || {};
    const opt = (v, cur, l) => `<option value="${E(v)}" ${String(cur ?? '') === String(v) ? 'selected' : ''}>${E(l)}</option>`;
    return `<form id="csProfile" class="cs-grid" novalidate>
 <label class="f">State<select class="i" name="state" required>${opt('', p.state, 'Choose')}${opt('KS', p.state, 'Kansas')}${opt('MO', p.state, 'Missouri')}</select></label>
 <label class="f">License type<select class="i" name="facility_type" required>${opt('', p.facility_type, 'Choose')}${FACILITY.map(([v, l]) => opt(v, p.facility_type, l)).join('')}</select></label>
 <label class="f">License number<input class="i" name="license_number" maxlength="60" value="${E(p.license_number || '')}" required></label>
 <label class="f">License issued<input class="i" type="date" name="license_issued_on" value="${E(p.license_issued_on || '')}" required></label>
 <label class="f">License expires<input class="i" type="date" name="license_expires_on" value="${E(p.license_expires_on || '')}" required></label>
 <label class="f">Licensed capacity<input class="i" type="number" min="0" name="capacity" value="${E(p.capacity ?? '')}"></label>
 <label class="f">ZIP code<input class="i" name="zip" inputmode="numeric" maxlength="5" value="${E(p.zip || '')}"></label>
 <label class="f">Latitude<input class="i" name="lat" inputmode="decimal" value="${E(p.lat ?? '')}" required></label>
 <label class="f">Longitude<input class="i" name="lon" inputmode="decimal" value="${E(p.lon ?? '')}" required></label>
 <label class="cs-check"><input type="checkbox" name="serves_infants" ${p.serves_infants?'checked':''}> We care for infants (under 12 months)</label>
 <label class="cs-check"><input type="checkbox" name="subsidy_contract" ${p.subsidy_contract?'checked':''}> We have a child care subsidy contract</label>
 <div class="cs-acts" style="grid-column:1/-1"><button class="btn soft" type="button" data-cs="locate">Use this device’s location</button>
 <span class="small muted">Do this at the center. The location is used only for the weather card (api.weather.gov); it is not shared.</span></div>
 <div class="cs-acts" style="grid-column:1/-1"><button class="btn navy" type="submit" ${S.busy?'disabled':''}>Save the profile</button></div></form>`;
  }
  if (step === 'rooms') {
    const rooms = Object.entries(c.rooms || {}).filter(([, r]) => !r.sample).sort((a, b) => (a[1].order || 9) - (b[1].order || 9));
    return `${rooms.length ? `<table class="cs-table"><tr><th>Classroom</th><th>Youngest child</th></tr>${rooms.map(([rid, r]) => `<tr><td><b>${E(r.name || rid)}</b></td><td>
 <select class="i" data-cs-age="${E(rid)}" aria-label="Youngest child in ${E(r.name || rid)}" ${S.busy?'disabled':''}><option value="">Set the age</option>${MONTHS.map(([m, l]) => `<option value="${m}" ${S.cfg && S.cfg[rid] !== undefined && Number(S.cfg[rid]) === m ? 'selected' : ''}>${l}</option>`).join('')}</select></td></tr>`).join('')}</table>`
      : '<p class="small muted">No classrooms yet.</p>'}
 <div class="cs-acts"><button class="btn soft" type="button" data-ptab="setup">Add a classroom</button>${mark('These are our classrooms')}</div>`;
  }
  if (step === 'children') {
    const n = Object.values(c.kids || {}).filter(k => !k.sample).length;
    return `<p class="small">${n ? `${n} child${n === 1 ? '' : 'ren'} added so far.` : 'No children yet.'} Add children on the Children tab of each classroom.</p>
 <div class="cs-acts"><button class="btn soft" type="button" data-ptab="children">Open the Children tab</button>${mark('All our children are in')}</div>`;
  }
  if (step === 'staff') return `<p class="small">When you hire someone in the CRM (Job application: Hired), they get their own login for this center and their required training within a minute, and you get an email. When someone leaves (Employment status: Separated), their access ends.</p><div class="cs-acts">${mark('Got it', false)}</div>`;
  if (step === 'rhythm') return `<p class="small">${ready ? 'You have acknowledged the policy.' : 'Open the Rhythm dashboard and read the policy.'}</p>
 <div class="cs-acts">${ready ? '' : '<button class="btn soft" type="button" data-ptab="rweek">Open the Rhythm dashboard</button>'}${mark('Done')}</div>`;
  if (step === 'compliance') return `<p class="small">${ready ? 'Open the team training screen to see each deadline, who it applies to and its source.' : 'Save the center profile first: the calendar depends on your state and license type.'}</p>
 <div class="cs-acts">${ready ? '<button class="btn soft" type="button" data-go="learn-team">Open the compliance calendar</button>' : ''}${mark('I reviewed it')}</div>`;
  if (step === 'families') {
    const kids = Object.entries(c.kids || {}).filter(([, k]) => !k.sample).sort((a, b) => String(a[1].first).localeCompare(String(b[1].first)));
    const name = id_ => { const k = (c.kids || {})[id_]; return k ? `${k.first || ''} ${k.last || ''}`.trim() : id_; };
    return `${kids.length ? `<form id="csInvite" class="cs-grid" novalidate>
 <label class="f">Family email<input class="i" type="email" name="email" required autocomplete="off"></label>
 <label class="f">Name (optional)<input class="i" name="full_name" maxlength="120" autocomplete="off"></label>
 <label class="f">Child<select class="i" name="kid" required>${kids.map(([kid, k]) => `<option value="${E(kid)}">${E(`${k.first || ''} ${k.last || ''}`.trim())}</option>`).join('')}</select></label>
 <div class="cs-acts" style="grid-column:1/-1"><button class="btn navy" type="submit" ${S.busy?'disabled':''}>Send the invitation</button></div></form>` : '<p class="small muted">Add children first; each invitation is for one child.</p>'}
 ${(S.invites || []).length ? `<table class="cs-table"><tr><th>Family</th><th>Child</th><th>Status</th><th></th></tr>${S.invites.filter(i => i.status !== 'cancelled').map(i => `<tr><td>${E(i.full_name ? `${i.full_name} (${i.email})` : i.email)}</td><td>${E(name(i.kid))}</td>
 <td>${E(INVITE_STATUS[i.status] || i.status)}${i.note ? `<br><span class="mini">${E(i.note)}</span>` : ''}</td><td>${['pending','invited','blocked'].includes(i.status) ? `<button class="rl" type="button" data-cs="cancel" data-id="${E(i.id)}">Cancel</button>` : ''}</td></tr>`).join('')}</table>` : ''}
 <div class="cs-acts">${mark('Families are invited')}</div>`;
  }
  return '';
}

function panel(){
  const st = S.status; if (!st) return S.err ? `<div class="cs-panel" id="csPanel"><p class="small" role="alert">${E(S.err)}</p></div>` : '';
  if (st.done >= st.total) return '';
  const pct = Math.round(100 * st.done / st.total);
  const next = (st.steps.find(s => !s.done) || {}).step;
  if (S.open === null) S.open = next;
  return `<section class="cs-panel" id="csPanel" aria-labelledby="csTitle">
 <div class="cs-head"><div><h2 id="csTitle">Get started</h2><p class="small" style="margin:2px 0 0">Set up ${E(st.center.name)} in the Futures Hub. Your progress is saved as you go.</p></div>
 <div class="cs-acts"><span class="small" id="csProgress"><b>${st.done} of ${st.total}</b> done</span><div class="cs-meter" role="progressbar" aria-valuemin="0" aria-valuemax="${st.total}" aria-valuenow="${st.done}" aria-label="Setup progress"><i style="width:${pct}%"></i></div>
 <button class="btn soft" type="button" data-cs="collapse" aria-expanded="${!S.collapsed}">${S.collapsed ? 'Show steps' : 'Hide steps'}</button></div></div>
 ${S.err ? `<p class="note" role="alert" style="color:var(--bad)">${E(S.err)}</p>` : ''}${S.note ? `<p class="note" role="status" style="color:var(--ok)">${E(S.note)}</p>` : ''}
 ${S.collapsed ? '' : `<ol class="cs-steps">${st.steps.map((s, i) => `<li class="cs-step" data-step="${s.step}">
 <div class="cs-row"><span class="cs-dot ${s.done ? 'done' : ''}" aria-hidden="true">${s.done ? '✓' : i + 1}</span>
 <div><b>${E(STEPS[s.step][0])}</b>${s.done ? ' <span class="chip ok">Done</span>' : ''}<br><span class="small muted">${E(STEPS[s.step][1])}</span></div>
 <button class="btn soft" type="button" data-cs="open" data-step="${s.step}" aria-expanded="${S.open === s.step}">${S.open === s.step ? 'Close' : (s.done ? 'Review' : 'Open')}</button></div>
 ${S.open === s.step ? `<div class="cs-body">${stepBody(s.step, s)}</div>` : ''}</li>`).join('')}</ol>`}</section>`;
}

const ANCHOR = '<section class="band-paper"><div class="wrap">';
function inject(html, role){
  if (!hubOn()) return html;
  const c = ctx(); if (!c.center) return html;
  css();
  if (S.centerId !== c.center.id) { load(); return html; }
  const top = banner(role) + (role === 'director' && S.row && S.row.status === 'active' ? panel() : '');
  if (!top) return html;
  const at = html.indexOf(ANCHOR);
  return at < 0 ? top + html : html.slice(0, at + ANCHOR.length) + top + html.slice(at + ANCHOR.length);
}
const basePortal = V.portal, baseFamily = V['family-portal'];
V.portal = () => inject(basePortal(), ctx().role === 'director' ? 'director' : 'staff');
V['family-portal'] = () => inject(baseFamily(), 'family');

// ---------------------------------------------------------------- events
const num = v => (v === '' || v === null || v === undefined) ? null : Number(v);
document.addEventListener('click', async e => {
  const t = e.target.closest('[data-cs]'); if (!t || !hubOn()) return;
  const a = t.dataset.cs, id = S.centerId;
  if (a === 'collapse') { S.collapsed = !S.collapsed; return rerender(); }
  if (a === 'open') { S.open = S.open === t.dataset.step ? '' : t.dataset.step; S.err = null; S.note = ''; return rerender(); }
  if (a === 'mark' || a === 'undo') return act(async () => { const r = await sb().rpc('center_setup_mark', {p_center:id, p_step:t.dataset.step, p_done:a === 'mark'}); if (r.error) throw r.error; useStatus(r.data);
    if (a === 'mark') { const nx = (S.status.steps.find(s => !s.done) || {}).step; S.open = nx || null; } }, a === 'mark' ? 'Saved.' : '');
  if (a === 'cancel') return act(async () => { const r = await sb().from('center_family_invites').update({status:'cancelled'}).eq('id', t.dataset.id); if (r.error) throw r.error; }, 'Invitation cancelled.');
  if (a === 'locate') {
    if (!navigator.geolocation) { S.err = 'This browser cannot share its location. Enter the latitude and longitude instead.'; return rerender(); }
    navigator.geolocation.getCurrentPosition(p => { const f = document.getElementById('csProfile'); if (!f) return;
      f.elements.lat.value = p.coords.latitude.toFixed(5); f.elements.lon.value = p.coords.longitude.toFixed(5); },
      () => { S.err = 'The location was not shared. Enter the latitude and longitude instead.'; rerender(); }, {timeout:15000});
    return;
  }
  if (a === 'export') {
    if (S.exporting) return; S.exporting = true; rerender();
    try {
      const r = await sb().rpc('center_export', {p_center:id}); if (r.error) throw r.error;
      const blob = new Blob([JSON.stringify(r.data, null, 2)], {type:'application/json'});
      const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
      link.download = `futures-hub-${String((S.row && S.row.name) || 'center').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(link.href), 60000);
      S.note = 'Export downloaded.';
    } catch (err) { S.err = msgOf(err); }
    finally { S.exporting = false; rerender(); }
  }
});
document.addEventListener('change', e => {
  const s = e.target.closest('[data-cs-age]'); if (!s || !hubOn() || s.value === '') return;
  const room = s.dataset.csAge, months = Number(s.value);
  act(async () => { const r = await sb().from('rhythm_room_config').upsert({center_id:S.centerId, room, youngest_months:months}, {onConflict:'center_id,room'}); if (r.error) throw r.error; }, 'Classroom age saved.');
});
document.addEventListener('submit', e => {
  const f = e.target; if (!hubOn() || (f.id !== 'csProfile' && f.id !== 'csInvite')) return; e.preventDefault();
  const v = Object.fromEntries(new FormData(f).entries());
  if (f.id === 'csProfile') return act(async () => {
    const p = {state:v.state, facility_type:v.facility_type, license_number:v.license_number, license_issued_on:v.license_issued_on, license_expires_on:v.license_expires_on,
      capacity:num(v.capacity), zip:v.zip || null, lat:num(v.lat), lon:num(v.lon), serves_infants:!!v.serves_infants, subsidy_contract:!!v.subsidy_contract};
    const r = await sb().rpc('center_setup_save_profile', {p_center:S.centerId, p}); if (r.error) throw r.error; useStatus(r.data);
    S.open = (S.status.steps.find(s => !s.done) || {}).step || null;
  }, 'Profile saved.');
  return act(async () => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(v.email || '').trim())) throw new Error('Enter the family’s email address.');
    const r = await sb().from('center_family_invites').insert({center_id:S.centerId, kid:v.kid, email:String(v.email).trim(), full_name:String(v.full_name || '').trim() || null});
    if (r.error) throw (r.error.code === '23505' ? new Error('That family is already invited for this child.') : r.error);
  }, 'Invitation on its way: the family gets an email within a minute.');
});
window.FFSetup = {reload:() => load(true), _state:S};
})();
