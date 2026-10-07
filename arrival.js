/* Futures Hub arrival and departure (wave 3, W3B; hub mode only). Every rule lives in Postgres (hub migration
   20261011200000_arrival_departure.sql); this file only draws and calls.

   - Teacher Portal tab "Arrivals": the room's children with sign-in / sign-out times and who dropped off or picked up,
     "Sign in" / "Sign out" for one child, a group room move (the live ratio then counts each child where they are),
     and "Open kiosk" for the shared tablet at the door.
   - The sign-in / sign-out steps (kiosk or one child): choose the adult from the child's authorized pickup list (or a one-day
     pickup with its code, or "someone else"), then the adult signs with a finger or enters their family PIN, and the
     signed-in staff member records it. A release to someone not on the list is refused by the Hub; a director can approve
     a one-time release with a reason (their own session, or their staff PIN typed on the tablet). A "never release to"
     entry is refused with no override.
   - Kiosk: full screen for families at the door. Leaving it needs the staff member's tablet PIN (hub-auth.js sets it), and
     the idle lock still applies.
   - Director: each child's pickup list (add, change, remove, "never release to" with "See center file" only), the version
     history, family requests to approve or decline, one-day pickups, and the attendance export (CSV) for the center's own
     billing or subsidy software.
   - Family Portal: the child's pickup list, "ask to add / remove" (the director approves), one-day pickup codes, and the
     family's kiosk PIN.
   Writes with a record id chosen here (sign-in, sign-out, room move, family request) go through hub-offline.js's waiting list
   (window.FFOffline.call): sent again with the SAME id when the Hub is back, never twice. Calls with a PIN or a code need a
   connection. Loaded after portal.js. */
(function(){
'use strict';
if (typeof V === 'undefined' || !V.portal) return;
const HUB = () => window.FFHub;
const hubOn = () => !!(HUB() && HUB().configured && HUB().connected);
const sb = () => (HUB() && HUB().client) ? HUB().client() : null;
const ctx = () => (window.FFPortal && window.FFPortal.ctx) ? window.FFPortal.ctx() : {};
const rerender = () => { try { if (window.FFPortal && window.FFPortal.rerender) window.FFPortal.rerender(); } catch (_) {} };
const E = s => esc(s);
const must = r => { if (r.error) throw r.error; return r.data; };
const msgOf = e => (e && e.message) ? e.message : 'That did not save. Try again in a moment.';
const uuid = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
  : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = (crypto.getRandomValues(new Uint8Array(1))[0] & 15); return (c === 'x' ? r : (r & 3 | 8)).toString(16); });
const REL = [['parent', 'Parent'], ['guardian', 'Guardian'], ['grandparent', 'Grandparent'], ['aunt_uncle', 'Aunt or uncle'], ['sibling', 'Adult sibling'],
  ['relative', 'Other relative'], ['family_friend', 'Family friend'], ['neighbor', 'Neighbor'], ['nanny', 'Nanny or sitter'], ['other', 'Another adult']];
const relLabel = v => (REL.find(x => x[0] === v) || [v, v ? 'Another adult' : ''])[1];
const relOpts = (v, blank) => (blank ? '<option value="">Relationship…</option>' : '') + REL.map(([k, l]) => `<option value="${k}"${k === v ? ' selected' : ''}>${E(l)}</option>`).join('');
const time = iso => iso ? new Date(iso).toLocaleTimeString('en-US', {hour:'numeric', minute:'2-digit'}) : '';
const localDay = (d = new Date()) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const kidName = k => k ? `${k.first || ''}${k.last_initial ? ' ' + k.last_initial + '.' : ''}`.trim() : '';
const roomName = id => { const r = (ctx().rooms || {})[id]; return r ? r.name : (id || ''); };
const online = () => { const o = window.FFOffline && window.FFOffline.state ? window.FFOffline.state() : null; return !o || o.net === 'live'; };

// ---------------------------------------------------------------- state
const fresh = () => ({center:null, date:null, board:null, loading:false, err:'', note:'', lists:{}, sel:new Set(), moveTo:'',
  kiosk:false, kioskRoom:'', flow:null, overlay:false, mgrKid:'', mgr:null, hist:null, pending:null, accounts:null, exp:null, expBusy:false,
  fam:{}, famPin:null, famCode:null, busy:false, dirs:null, exitPin:false});
const S = fresh();
function sync(){
  const c = ctx(), id = c.center && c.center.id;
  if (id && S.center !== id) { const keep = {}; Object.assign(S, fresh(), keep); S.center = id; }
  const d = c.date || localDay();
  if (S.date !== d) { S.date = d; S.board = null; }
  return S.center;
}
async function loadBoard(force){
  if (!hubOn() || !sync() || (S.loading && !force)) return;
  S.loading = true;
  try { S.board = must(await sb().rpc('arrival_board', {p_center:S.center, p_date:S.date})) || []; S.err = ''; }
  catch (e) { S.err = msgOf(e); if (!S.board) S.board = []; }
  finally { S.loading = false; rerender(); if (S.overlay && !S.flow) drawOverlay(); }   // never redraw a step someone is filling in
}
async function loadList(kid, force){
  if (!force && S.lists[kid]) return S.lists[kid];
  S.lists[kid] = must(await sb().rpc('pickup_list', {p_center:S.center, p_kid:kid}));
  return S.lists[kid];
}
const boardKid = kid => (S.board || []).find(k => k.kid === kid);
setInterval(() => { if (hubOn() && ctx().role !== 'family' && (S.overlay || (typeof view === 'string' && view === 'portal' && ctx().tab === 'arrivals'))) loadBoard(); }, 20000);
if (window.FFOffline && window.FFOffline.onSent) window.FFOffline.onSent(() => loadBoard(true));

// status words for one child (Today card and the Arrivals tab)
function statusOf(k){
  if (!k) return '';
  const ev = k.events || [], ins = ev.filter(e => e.kind === 'check_in'), outs = ev.filter(e => e.kind === 'check_out');
  if (k.state === 'here') return `Signed in ${time(k.in_at)}${ins.length > 1 ? ' (again)' : ''}${k.room && k.room !== k.home_room ? ` · now in ${roomName(k.room)}` : ''}`;
  if (k.state === 'gone') { const o = outs[outs.length - 1]; return `Signed out ${time(k.out_at)}${o ? ` · ${o.person_kind === 'day_pass' ? 'one-day pickup' : relLabel(o.person_relationship).toLowerCase() || 'adult'}` : ''}${o && o.override_by ? ' · director override' : ''}`; }
  return k.absent ? 'Absent' : 'Not signed in';
}
function pendingFor(kid){
  if (!window.FFOffline || !window.FFOffline.items) return 0;
  return window.FFOffline.items().filter(x => /^rpc:arrival_/.test(x.t) && (x.kid === kid || (Array.isArray(x.kids) && x.kids.includes(kid)))).length;
}

// ---------------------------------------------------------------- the Arrivals tab
function tabView(){
  if (!sync()) return '<div class="card"><p class="small muted">Sign in to the Futures Hub to record arrivals.</p></div>';
  if (S.board === null) { loadBoard(); return '<div class="card" role="status"><p class="small muted">Loading arrivals…</p></div>'; }
  const c = ctx(), room = c.room, dir = c.role === 'director';
  const kids = S.board.filter(k => k.room === room || k.home_room === room);
  const here = S.board.filter(k => k.state === 'here' && k.room === room).length;
  const rooms = Object.entries(c.rooms || {}).sort((a, b) => (a[1].order || 9) - (b[1].order || 9));
  const sel = [...S.sel].filter(id => kids.some(k => k.kid === id && k.state === 'here'));
  return `<div class="arr" data-arr-root>
   ${S.err ? `<p class="arr-msg bad" role="alert">${E(S.err)}</p>` : ''}${S.note ? `<p class="arr-msg ok" role="status">${E(S.note)}</p>` : ''}
   <div class="card arr-head"><div><h3>Arrivals and departures</h3><p class="small">${E(roomName(room))}: <b>${here}</b> signed in and in this room now. Times, the adult and the staff member are kept for each sign-in and sign-out.</p></div>
    <div class="arr-acts"><button type="button" class="btn gold" data-arr="kiosk">Open kiosk</button><button type="button" class="btn soft" data-arr="refresh">Refresh</button></div></div>
   <div class="card"><div class="arr-tw"><table class="arr-table"><thead><tr><th scope="col"><span class="sr">Select</span></th><th scope="col">Child</th><th scope="col">Status</th><th scope="col">Adults today</th><th scope="col"><span class="sr">Actions</span></th></tr></thead><tbody>
    ${kids.length ? kids.map(k => { const ev = (k.events || []).filter(e => e.kind !== 'room_move'); const w = pendingFor(k.kid);
      return `<tr data-arr-kid="${E(k.kid)}"><td>${k.state === 'here' ? `<input type="checkbox" class="arr-cb" data-arr-sel="${E(k.kid)}" aria-label="Select ${E(kidName(k))}"${S.sel.has(k.kid) ? ' checked' : ''}>` : ''}</td>
       <td><b>${E(kidName(k))}</b>${k.never_count ? ' <span class="arr-flag" title="This child has a do-not-release entry">Do-not-release list</span>' : ''}</td>
       <td><span class="arr-st ${k.state}">${E(statusOf(k))}</span>${w ? ` <span class="ffo-mark">Not saved yet</span>` : ''}</td>
       <td class="small">${ev.length ? ev.map(e => `${e.kind === 'check_in' ? 'In' : 'Out'} ${E(e.time_label)}: ${E(e.person_name)} (${E(e.person_kind === 'day_pass' ? 'one-day pickup' : relLabel(e.person_relationship) || 'adult')})${e.override_by ? ' · override' : ''}`).join('<br>') : '<span class="muted">None yet</span>'}</td>
       <td class="arr-acts">${c.canWrite ? (k.state === 'here' ? `<button type="button" class="btn navy" data-arr="out" data-kid="${E(k.kid)}">Sign out</button>` : `<button type="button" class="btn soft" data-arr="in" data-kid="${E(k.kid)}">Sign in</button>`) : ''}</td></tr>`; }).join('')
      : '<tr><td colspan="5" class="small muted">No children in this classroom.</td></tr>'}
   </tbody></table></div>
   ${c.canWrite ? `<form class="arr-move" data-arr-form="move" novalidate><span class="small"><b>${sel.length}</b> selected</span>
     <label class="f" for="arrMoveTo">Move to<select class="i" id="arrMoveTo" name="to">${rooms.map(([id, r]) => `<option value="${E(id)}"${id === (S.moveTo || '') ? ' selected' : ''}${id === room ? ' disabled' : ''}>${E(r.name)}</option>`).join('')}</select></label>
     <button type="submit" class="btn soft"${sel.length ? '' : ' disabled'}>Move now</button><span class="small muted">Ratios count each child in the room they are in.</span></form>` : ''}</div>
   ${dir ? directorView(kids) : ''}</div>`;
}

// ---------------------------------------------------------------- director: lists, requests, export
function directorView(kids){
  if (S.pending === null) { S.pending = []; sb().rpc('pickup_requests_pending', {p_center:S.center}).then(r => { S.pending = r.data || []; rerender(); }); }
  const opt = S.board.map(k => `<option value="${E(k.kid)}"${k.kid === S.mgrKid ? ' selected' : ''}>${E(kidName(k))}</option>`).join('');
  const m = S.mgr, today = localDay();
  const exp = S.exp || {from:today.slice(0, 8) + '01', to:today, format:'generic'};
  return `<div class="card arr-dir"><h3>Pickup lists</h3>
   ${S.pending.length ? `<div class="arr-req"><h4>Family requests waiting (${S.pending.length})</h4><ul class="arr-list">${S.pending.map(r => `<li><span><b>${E(r.child)}</b>: ${E(r.action === 'add' ? 'add' : r.action === 'remove' ? 'remove' : 'change')} ${E(r.name || '')} (${E(r.relationship_label)})${r.phone ? ' · ' + E(r.phone) : ''} <span class="small muted">asked by ${E(r.requested_by_email || 'a guardian')}</span></span>
     <span class="arr-acts"><button type="button" class="btn soft" data-arr="req-yes" data-id="${E(r.id)}">Approve</button><button type="button" class="btn soft" data-arr="req-no" data-id="${E(r.id)}">Decline</button></span></li>`).join('')}</ul><p class="small muted">Check the adult in person before you approve. Approving adds a new version to the child's list; the earlier versions are kept.</p></div>` : '<p class="small muted">No family requests waiting.</p>'}
   <label class="f" for="arrMgrKid">Child<select class="i" id="arrMgrKid" data-arr-mgr><option value="">Choose a child…</option>${opt}</select></label>
   ${S.mgrKid ? (m ? mgrView(m) : '<p class="small muted" role="status">Loading the list…</p>') : ''}
   </div>
   <div class="card arr-dir"><h3>Attendance export</h3><p class="small">A CSV for the center's own billing or subsidy software (tuition and subsidy claims stay there). One row per child per day, or one row per sign-in / sign-out pair with the adults (the fields Missouri's subsidy rule lists for a time and attendance register). Only a director or HQ with two-step verification can export; each export is logged.</p>
   <form class="arr-form" data-arr-form="export" novalidate><label class="f" for="arrExpFrom">From<input class="i" type="date" id="arrExpFrom" name="from" value="${E(exp.from)}" required></label>
    <label class="f" for="arrExpTo">To<input class="i" type="date" id="arrExpTo" name="to" value="${E(exp.to)}" required></label>
    <label class="f" for="arrExpFmt">Format<select class="i" id="arrExpFmt" name="format"><option value="generic"${exp.format === 'generic' ? ' selected' : ''}>One row per child per day</option><option value="sessions"${exp.format === 'sessions' ? ' selected' : ''}>One row per sign-in / sign-out (with adults)</option></select></label>
    <button type="submit" class="btn navy"${S.expBusy ? ' disabled' : ''}>Download CSV</button></form></div>`;
}
function mgrView(m){
  const people = m.list.people || [], accounts = S.accounts || [];
  const row = p => `<li class="arr-person ${p.kind}"><span><b>${E(p.name)}</b> ${p.kind === 'never' ? '<span class="arr-flag">Never release to · See center file</span>' : `<span class="small">${E(p.relationship_label || '')}${p.phone ? ' · ' + E(p.phone) : ''}${p.kind === 'guardian' ? ' · guardian' : ''}${p.family_pin ? ' · has a family PIN' : ''}${p.has_photo ? ' · photo' : ''}</span>`}
     <span class="small muted">v${p.version} · ${E(p.approved_by_email || '')}</span></span>
     <span class="arr-acts">${p.kind === 'never' ? '' : `<button type="button" class="btn soft" data-arr="edit" data-pid="${E(p.person_id)}">Change</button>`}<button type="button" class="btn soft" data-arr="remove" data-pid="${E(p.person_id)}">Remove</button></span></li>`;
  const ed = m.edit ? people.find(p => p.person_id === m.edit) : null;
  return `<ul class="arr-list">${people.length ? people.map(row).join('') : '<li class="small muted">Nobody on the list yet: no one can pick this child up until the director adds them.</li>'}</ul>
   <form class="arr-form" data-arr-form="person" data-pid="${E(ed ? ed.person_id : '')}" novalidate><h4 class="wide">${ed ? `Change ${E(ed.name)}` : 'Add someone'}</h4>
    <label class="f" for="arrPKind">Type<select class="i" id="arrPKind" name="kind"${ed ? ' disabled' : ''}><option value="authorized"${ed && ed.kind === 'authorized' ? ' selected' : ''}>Authorized adult</option><option value="guardian"${ed && ed.kind === 'guardian' ? ' selected' : ''}>Guardian</option><option value="never">Never release to (custody order in the center file)</option></select></label>
    <label class="f" for="arrPName">Full name<input class="i" id="arrPName" name="name" maxlength="80" value="${E(ed ? ed.name : '')}" required autocomplete="off"></label>
    <label class="f" for="arrPRel">Relationship<select class="i" id="arrPRel" name="relationship">${relOpts(ed ? ed.relationship : '', true)}</select></label>
    <label class="f" for="arrPPhone">Phone<input class="i" id="arrPPhone" name="phone" inputmode="tel" maxlength="20" value="${E(ed && ed.phone ? ed.phone.replace(/^\+1/, '') : '')}" autocomplete="off"></label>
    <label class="f" for="arrPUser">Family account (guardian)<select class="i" id="arrPUser" name="user"><option value="">None</option>${accounts.map(a => `<option value="${E(a.user_id)}">${E(a.email)}${a.linked ? ' (linked)' : ''}</option>`).join('')}</select></label>
    <label class="f" for="arrPPhoto">Photo (optional)<input class="i" type="file" id="arrPPhoto" name="photo" accept="image/jpeg,image/png,image/webp"></label>
    <label class="arr-check wide"><input type="checkbox" name="consent"> The adult agreed to their photo being kept for pick-up checks</label>
    <p class="small muted wide">"Never release to": write only the name. The court order or custody papers stay in the center's paper file; the Hub keeps "See center file".</p>
    <div class="arr-acts wide"><button type="submit" class="btn navy">${ed ? 'Save a new version' : 'Add'}</button>${ed ? '<button type="button" class="btn soft" data-arr="edit-cancel">Cancel</button>' : ''}</div></form>
   <form class="arr-form" data-arr-form="pass" novalidate><h4 class="wide">One-day pickup</h4>
    <label class="f" for="arrDName">Name<input class="i" id="arrDName" name="name" maxlength="80" required autocomplete="off"></label>
    <label class="f" for="arrDRel">Relationship<select class="i" id="arrDRel" name="relationship">${relOpts('', true)}</select></label>
    <label class="f" for="arrDDay">Day<input class="i" type="date" id="arrDDay" name="day" value="${E(localDay())}"></label>
    <button type="submit" class="btn soft">Make a code</button></form>
   ${S.famCode && S.famCode.kid === S.mgrKid ? codeBox(S.famCode) : ''}
   <details class="arr-hist" data-arr-hist><summary>Version history</summary>${S.hist ? `<ul class="arr-list small">${S.hist.map(h => `<li>${E(new Date(h.approved_at).toLocaleString('en-US', {month:'short', day:'numeric', hour:'numeric', minute:'2-digit'}))}: <b>${E(h.name)}</b> ${E(h.kind)} v${h.version} ${E(h.status)}${h.phone ? ' · ' + E(h.phone) : ''} · ${E(h.approved_by_email || '')}${h.request_id ? ' · from a family request' : ''}</li>`).join('')}</ul>` : '<p class="small muted">Open to load.</p>'}</details>`;
}
const codeBox = c => `<div class="arr-code" role="status"><p>Give this code to <b>${E(c.name)}</b>. It works on <b>${E(new Date(c.valid_on + 'T12:00:00').toLocaleDateString('en-US', {weekday:'long', month:'long', day:'numeric'}))}</b> only, once.</p><p class="arr-code-n">${E(c.code.slice(0, 3))} ${E(c.code.slice(3))}</p><p class="small">The Hub does not show it again. Staff check the adult's photo ID at pick-up.</p></div>`;
async function openMgr(kid){
  S.mgrKid = kid; S.mgr = null; S.hist = null; S.accounts = null; rerender();
  if (!kid) return;
  try {
    const [list, acc] = await Promise.all([loadList(kid, true), sb().rpc('pickup_guardian_accounts', {p_center:S.center, p_kid:kid})]);
    S.accounts = acc.data || []; S.mgr = {list, edit:null};
  } catch (e) { S.err = msgOf(e); }
  rerender();
}

// ---------------------------------------------------------------- the sign-in / sign-out steps (kiosk or one child)
// flow: {kid, kind:'check_in'|'check_out', id (stable for this attempt), step:'who'|'sign'|'blocked'|'done', who:{...}, method, err, list}
async function startFlow(kid, kind){
  const k = boardKid(kid); if (!k) return;
  S.flow = {kid, kind:kind || (k.state === 'here' ? 'check_out' : 'check_in'), id:uuid(), step:'who', who:null, method:'signature', err:'', list:null, busy:false};
  S.overlay = true; drawOverlay();
  try { S.flow.list = await loadList(kid, online()); } catch (e) { S.flow.list = S.lists[kid] || {people:[], day_passes:[]}; S.flow.err = online() ? msgOf(e) : 'Offline: showing the list from the last time it loaded.'; }
  drawOverlay();
}
function flowHtml(){
  const f = S.flow, k = boardKid(f.kid), nm = kidName(k), out = f.kind === 'check_out';
  const title = `${out ? 'Pick up' : 'Drop off'} ${E(nm)}`;
  const close = `<button type="button" class="btn soft" data-arr="flow-close">${f.step === 'done' ? 'Close' : 'Cancel'}</button>`;
  const err = f.err ? `<p class="arr-msg bad" role="alert">${E(f.err)}</p>` : '';
  if (!f.list) return `<div class="arr-flow"><h2 id="arrFlowT">${title}</h2><p role="status">Loading the pickup list…</p>${close}</div>`;
  const people = (f.list.people || []), never = people.filter(p => p.kind === 'never'), ok = people.filter(p => p.kind !== 'never');
  const neverBox = never.length ? `<div class="arr-never" role="alert"><b>Do not release to:</b> ${never.map(p => E(p.name)).join(', ')}. See the center file and call the director.</div>` : '';
  if (f.step === 'who') {
    const passes = out ? (f.list.day_passes || []).filter(d => d.valid_on === localDay() && !d.used_at && !d.revoked_at) : [];
    return `<div class="arr-flow"><h2 id="arrFlowT">${title}</h2>${neverBox}${err}<p>Who is ${out ? 'picking up' : 'dropping off'}?</p>
     <div class="arr-tiles">${ok.map(p => `<button type="button" class="arr-tile" data-arr="who" data-pid="${E(p.person_id)}">${p.has_photo ? `<img alt="" data-arr-photo="${E(p.person_id)}">` : ''}<b>${E(p.name)}</b><span>${E(p.relationship_label || '')}${p.kind === 'guardian' ? ' · guardian' : ''}</span></button>`).join('')}
      ${passes.map(d => `<button type="button" class="arr-tile pass" data-arr="who-pass" data-id="${E(d.id)}"><b>${E(d.name)}</b><span>One-day pickup · needs the code</span></button>`).join('')}
      <button type="button" class="arr-tile other" data-arr="who-other"><b>Someone else</b><span>${out ? 'Not on the list: a director must approve' : 'Write their name'}</span></button></div>
     <div class="arr-acts">${close}</div></div>`;
  }
  const w = f.who || {};
  if (f.step === 'sign') {
    const canPin = !!w.family_pin && online();
    return `<div class="arr-flow"><h2 id="arrFlowT">${title}</h2>${neverBox}${err}
     <form data-arr-form="sign" novalidate class="arr-sign">
      ${w.kind === 'other' ? `<div class="arr-form"><label class="f" for="arrOName">Adult's full name<input class="i" id="arrOName" name="other_name" maxlength="80" value="${E(w.name || '')}" required autocomplete="off"></label>
        <label class="f" for="arrORel">Relationship<select class="i" id="arrORel" name="other_rel">${relOpts(w.relationship || '', true)}</select></label></div>`
        : `<p><b>${E(w.name)}</b> ${w.relationship_label ? '· ' + E(w.relationship_label) : ''}${w.kind === 'pass' ? ' · one-day pickup' : ''}</p>`}
      ${w.kind === 'pass' ? `<label class="f" for="arrCode">One-day code<input class="i arr-pin" id="arrCode" name="code" inputmode="numeric" maxlength="6" autocomplete="off" required></label><p class="small">Check their photo ID too.</p>` : ''}
      ${canPin ? `<div class="seg" role="group" aria-label="How the adult confirms"><button type="button" data-arr="method" data-m="signature" aria-pressed="${f.method === 'signature'}">Finger signature</button><button type="button" data-arr="method" data-m="family_pin" aria-pressed="${f.method === 'family_pin'}">Family PIN</button></div>` : ''}
      ${f.method === 'family_pin' && canPin ? `<label class="f" for="arrFPin">${E(w.name)}, enter your family PIN<input class="i arr-pin" id="arrFPin" name="pin" type="password" inputmode="numeric" maxlength="6" autocomplete="off" required></label>`
        : `<div class="arr-pad-wrap"><p class="small" id="arrPadL">${E(w.kind === 'other' ? 'The adult' : w.name)}: sign below with a finger.</p><canvas class="arr-pad" id="arrPad" width="600" height="200" role="img" aria-labelledby="arrPadL"></canvas><button type="button" class="btn soft" data-arr="pad-clear">Clear</button></div>`}
      <p class="small muted">${out ? 'Released' : 'Received'} by ${E((HUB() && HUB().email) || 'the signed-in staff member')} at the time you press the button.</p>
      <div class="arr-acts"><button type="submit" class="btn gold"${f.busy ? ' disabled' : ''}>${out ? 'Record pick-up' : 'Record drop-off'}</button><button type="button" class="btn soft" data-arr="flow-back">Back</button>${close}</div></form></div>`;
  }
  if (f.step === 'blocked') {
    const dirs = S.dirs || [], me = ctx().role === 'director';
    return `<div class="arr-flow"><div class="arr-block" role="alert"><h2 id="arrFlowT">Do not release ${E(nm)}</h2><p>${E(f.block)}</p></div>${neverBox}${err}
     ${f.noOverride ? `<p>This cannot be overridden at the door. The director must change the child's list first (that change is kept in the history).</p><div class="arr-acts">${close}</div>` :
      `<form data-arr-form="override" novalidate class="arr-form"><h3 class="wide">Director approval for a one-time release</h3>
       ${me ? '<p class="small wide">You are signed in as a director: your approval is recorded with your account.</p>' : `<label class="f" for="arrOvDir">Director<select class="i" id="arrOvDir" name="director">${dirs.length ? dirs.map(d => `<option value="${E(d.user_id)}">${E(d.email)}</option>`).join('') : '<option value="">No director has a tablet PIN</option>'}</select></label>
       <label class="f" for="arrOvPin">Director's PIN<input class="i arr-pin" id="arrOvPin" name="pin" type="password" inputmode="numeric" maxlength="6" autocomplete="off" required></label>`}
       <label class="f wide" for="arrOvWhy">Reason (kept with the record)<textarea class="i" id="arrOvWhy" name="reason" maxlength="300" required placeholder="For example: guardian called the director, photo ID matched"></textarea></label>
       <div class="arr-acts wide"><button type="submit" class="btn navy"${f.busy ? ' disabled' : ''}>Approve and record the release</button>${close}</div></form>`}</div>`;
  }
  if (f.step === 'done') {
    return `<div class="arr-flow arr-done" role="status"><h2 id="arrFlowT">${E(f.done)}</h2>${f.queued ? '<p><span class="ffo-mark">Not saved yet</span> It is kept on this device and will send when the Futures Hub is back.</p>' : ''}<div class="arr-acts">${close}</div></div>`;
  }
  return '';
}
// the signature pad: pointer strokes -> SVG path data (only digits, M/L, spaces): what the Hub stores
let pad = null;
function bindPad(){
  const c = document.getElementById('arrPad'); if (!c || c === (pad && pad.el)) return;
  const g = c.getContext('2d'); g.lineWidth = 3; g.lineCap = 'round'; g.strokeStyle = '#1f3b4d';
  pad = {el:c, path:[], down:false, n:0};
  const pt = e => { const r = c.getBoundingClientRect(); return [Math.round((e.clientX - r.left) * c.width / r.width), Math.round((e.clientY - r.top) * c.height / r.height)]; };
  c.addEventListener('pointerdown', e => { e.preventDefault(); c.setPointerCapture(e.pointerId); pad.down = true; const [x, y] = pt(e); pad.path.push(`M${x} ${y}`); g.beginPath(); g.moveTo(x, y); });
  c.addEventListener('pointermove', e => { if (!pad.down) return; const [x, y] = pt(e); pad.path.push(`L${x} ${y}`); pad.n++; g.lineTo(x, y); g.stroke(); });
  const up = () => { pad.down = false; };
  c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
}
function redrawPad(){
  const g = pad.el.getContext('2d'); g.beginPath();
  pad.path.forEach(tk => { const [x, y] = tk.slice(1).split(' ').map(Number); if (tk[0] === 'M') g.moveTo(x, y); else g.lineTo(x, y); });
  g.stroke();
}
function clearPad(){ if (!pad) return; pad.el.getContext('2d').clearRect(0, 0, pad.el.width, pad.el.height); pad.path = []; pad.n = 0; }
async function photos(){
  const imgs = document.querySelectorAll('#arrOverlay img[data-arr-photo]'); if (!imgs.length || !S.flow || !S.flow.list) return;
  for (const im of imgs) {
    if (im.src) continue;
    const p = (S.flow.list.people || []).find(x => x.person_id === im.dataset.arrPhoto);
    if (!p || !p.photo_path) continue;
    try { const r = await sb().storage.from('child-photos').createSignedUrl(p.photo_path, 300); if (r.data) im.src = r.data.signedUrl; } catch (_) { /* no photo */ }
  }
}

// ---------------------------------------------------------------- the kiosk
function kioskHtml(){
  const c = ctx(), rooms = Object.entries(c.rooms || {}).sort((a, b) => (a[1].order || 9) - (b[1].order || 9));
  const kids = (S.board || []).filter(k => !S.kioskRoom || k.room === S.kioskRoom || k.home_room === S.kioskRoom);
  return `<div class="arr-kiosk-in"><div class="arr-kbar"><h2 id="arrFlowT">Sign in and out</h2>
    <label class="f" for="arrKRoom">Room<select class="i" id="arrKRoom" data-arr-kroom><option value="">All rooms</option>${rooms.map(([id, r]) => `<option value="${E(id)}"${id === S.kioskRoom ? ' selected' : ''}>${E(r.name)}</option>`).join('')}</select></label>
    <button type="button" class="btn soft" data-arr="kiosk-exit">Staff: leave kiosk</button></div>
   ${S.exitPin ? `<form class="arr-form arr-exit" data-arr-form="exit" novalidate><label class="f" for="arrExitPin">Staff PIN<input class="i arr-pin" id="arrExitPin" name="pin" type="password" inputmode="numeric" maxlength="6" autocomplete="off" required></label><button type="submit" class="btn navy">Leave kiosk</button><button type="button" class="btn soft" data-arr="exit-cancel">Stay</button></form>` : ''}
   <p class="arr-khint">Tap your child's name.</p>
   <div class="arr-ktiles">${kids.map(k => `<button type="button" class="arr-ktile ${k.state}" data-arr="kid" data-kid="${E(k.kid)}"><b>${E(kidName(k))}</b><span>${E(k.state === 'here' ? 'Here · tap to pick up' : k.state === 'gone' ? 'Signed out' : 'Tap to drop off')}</span></button>`).join('') || '<p>No children to show.</p>'}</div></div>`;
}
function drawOverlay(){
  let o = document.getElementById('arrOverlay');
  if (!S.overlay) { if (o) o.remove(); pad = null; document.body.classList.remove('arr-noscroll'); return; }
  if (!o) { o = document.createElement('div'); o.id = 'arrOverlay'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-labelledby', 'arrFlowT'); document.body.appendChild(o); }
  o.className = 'arr-overlay' + (S.kiosk ? ' kiosk' : '');
  document.body.classList.add('arr-noscroll');
  // a redraw (an error shown, a method switched) keeps what was typed (never a PIN) and the signature strokes
  const typed = {}; o.querySelectorAll('input[id]:not([type=password]):not([type=file]), textarea[id], select[id]').forEach(el => { typed[el.id] = el.value; });
  const keep = pad && pad.path.length ? {path:pad.path.slice(), n:pad.n} : null;
  o.innerHTML = S.flow ? flowHtml() : (S.kiosk ? kioskHtml() : '');
  Object.entries(typed).forEach(([id, v]) => { const el = document.getElementById(id); if (el && o.contains(el) && v !== '' && el.value !== v) el.value = v; });
  pad = null; bindPad();
  if (keep && pad) { pad.path = keep.path; pad.n = keep.n; redrawPad(); }
  photos();
  const first = o.querySelector('.arr-flow input:not([type=hidden]), .arr-flow .arr-tile, .arr-flow button.btn.gold, .arr-ktile'); if (first && !o.contains(document.activeElement)) { try { first.focus({preventScroll:true}); } catch (_) {} }
}
function closeFlow(){ S.flow = null; if (!S.kiosk) S.overlay = false; drawOverlay(); rerender(); }

async function submitFlow(extra){
  const f = S.flow; if (!f || f.busy) return;
  const w = f.who || {}, out = f.kind === 'check_out';
  const args = {p_center:S.center, p_id:f.id, p_kid:f.kid, p_sign_method:f.method};
  if (w.kind === 'person') args.p_person = w.person_id;
  else if (w.kind === 'pass') { args.p_day_pass = w.id; args.p_day_code = w.code; }
  else { args.p_other_name = w.name; if (w.relationship) args.p_other_relationship = w.relationship; }
  if (f.method === 'family_pin') args.p_pin = w.pin; else args.p_signature = w.signature;
  Object.assign(args, extra || {});
  if (!online() && out && w.kind !== 'person') { f.err = 'Offline: only an adult on the list can be signed out until the Hub is back. Use the paper sheet and call the director.'; return drawOverlay(); }
  f.busy = true; f.err = ''; drawOverlay();
  const name = out ? 'arrival_check_out' : 'arrival_check_in';
  try {
    const r = window.FFOffline && window.FFOffline.call ? await window.FFOffline.call(name, args, f.id) : {data:must(await sb().rpc(name, args))};
    f.busy = false;
    if (r.queued) { f.step = 'done'; f.queued = true; f.done = `${kidName(boardKid(f.kid))}: ${out ? 'pick-up' : 'drop-off'} kept on this device`; }
    else if (r.data && r.data.ok === false) {
      const why = {wrong_code:`That code is not right.${r.data.tries_left != null ? ` ${r.data.tries_left} ${r.data.tries_left === 1 ? 'try' : 'tries'} left.` : ''}`,
        family_pin_wrong:'That family PIN is not right.', family_pin_locked:'This family PIN is paused after too many tries: sign with a finger instead.',
        family_pin_no_pin:'No family PIN is set: sign with a finger instead.', director_pin_wrong:'That director PIN is not right.',
        director_pin_locked:'That director PIN is paused after too many tries.', director_pin_no_pin:'That director has no tablet PIN.'}[r.data.reason] || 'Not recorded. Try again.';
      f.err = why; f.id = uuid();   // nothing was recorded under that id; a fresh id for the next try
    } else {
      const e = r.data || {};
      f.step = 'done'; f.done = `${kidName(boardKid(f.kid))} ${out ? 'signed out' : 'signed in'} at ${e.time_label || time(new Date().toISOString())}`;
      if (e.override_by) f.done += ' (director approval recorded)';
      loadBoard(true);
    }
  } catch (e) {
    f.busy = false;
    const m = msgOf(e);
    if (/^Blocked/.test(m)) {
      f.step = 'blocked'; f.block = m; f.noOverride = /never release to/i.test(m);
      if (!S.dirs) { try { S.dirs = must(await sb().rpc('arrival_override_directors', {p_center:S.center})); } catch (_) { S.dirs = []; } }
    } else f.err = e && e.code === 'needs_connection' ? 'This needs a connection to the Futures Hub. Use the paper sheet until it is back, or sign with a finger.' : m;
  }
  drawOverlay();
  if (f.step === 'done' && S.kiosk) setTimeout(() => { if (S.flow === f) closeFlow(); }, 3500);
}

// ---------------------------------------------------------------- Family Portal card
function familyCard(c){
  const kid = c.fam && c.fam.kid; if (!kid || !hubOn()) return '';
  sync();
  const st = S.fam[kid];
  if (st === undefined) { S.fam[kid] = null; sb().rpc('pickup_list', {p_center:S.center, p_kid:kid}).then(r => { S.fam[kid] = r.error ? {err:msgOf(r.error)} : r.data; rerender(); }); }
  if (S.famPin === null) { S.famPin = {}; sb().rpc('family_pickup_pin_status').then(r => { S.famPin = r.data || {}; rerender(); }); }
  const k = (c.kids || {})[kid] || {}, first = k.first || 'your child';
  if (!st) return `<div class="card arr-fam" id="arrFam"><h3>Who can pick up ${E(first)}</h3><p class="small muted" role="status">Loading…</p></div>`;
  if (st.err) return `<div class="card arr-fam" id="arrFam"><h3>Who can pick up ${E(first)}</h3><p class="arr-msg bad">${E(st.err)}</p></div>`;
  const waiting = window.FFOffline && window.FFOffline.items ? window.FFOffline.items().filter(x => x.t === 'rpc:pickup_request_submit').length : 0;
  const pin = S.famPin || {};
  return `<div class="card arr-fam" id="arrFam"><h3>Who can pick up ${E(first)}</h3>
   ${S.note ? `<p class="arr-msg ok" role="status">${E(S.note)}</p>` : ''}${S.err ? `<p class="arr-msg bad" role="alert">${E(S.err)}</p>` : ''}
   <p class="small">The center releases ${E(first)} only to the adults below, or to someone with a one-day code from you. Changes are approved by the director.</p>
   <ul class="arr-list">${(st.people || []).map(p => `<li><span><b>${E(p.name)}</b>${p.is_me ? ' (you)' : ''} <span class="small">${E(p.relationship_label || '')}${p.kind === 'guardian' ? ' · guardian' : ''}</span></span>${p.is_me ? '' : `<span class="arr-acts"><button type="button" class="btn soft" data-arr="fam-remove" data-pid="${E(p.person_id)}">Ask to remove</button></span>`}</li>`).join('') || '<li class="small muted">Nobody is on the list yet. Ask the director to add you.</li>'}</ul>
   ${(st.requests || []).length || waiting ? `<h4>Your requests</h4><ul class="arr-list small">${(st.requests || []).map(r => `<li><span>${E(r.action === 'add' ? 'Add' : r.action === 'remove' ? 'Remove' : 'Change')} ${E(r.name || '')}: <b>${E({pending:'waiting for the director', approved:'approved', declined:'declined', withdrawn:'withdrawn'}[r.status])}</b>${r.decision_note ? ' · ' + E(r.decision_note) : ''}</span>${r.status === 'pending' ? `<button type="button" class="btn soft" data-arr="fam-withdraw" data-id="${E(r.id)}">Withdraw</button>` : ''}</li>`).join('')}${waiting ? `<li><span class="ffo-mark">Not saved yet</span> ${waiting} request${waiting === 1 ? '' : 's'} on this device</li>` : ''}</ul>` : ''}
   <form class="arr-form" data-arr-form="fam-add" novalidate><h4 class="wide">Ask to add an adult</h4>
    <label class="f" for="arrFName">Full name<input class="i" id="arrFName" name="name" maxlength="80" required autocomplete="off"></label>
    <label class="f" for="arrFRel">Relationship<select class="i" id="arrFRel" name="relationship">${relOpts('', true)}</select></label>
    <label class="f" for="arrFPhone">Phone<input class="i" id="arrFPhone" name="phone" inputmode="tel" maxlength="20" autocomplete="off"></label>
    <button type="submit" class="btn navy">Send to the director</button></form>
   <form class="arr-form" data-arr-form="fam-pass" novalidate><h4 class="wide">Someone else picking up one day</h4>
    <label class="f" for="arrFPName">Their full name<input class="i" id="arrFPName" name="name" maxlength="80" required autocomplete="off"></label>
    <label class="f" for="arrFPRel">Relationship<select class="i" id="arrFPRel" name="relationship">${relOpts('', true)}</select></label>
    <label class="f" for="arrFPDay">Day<input class="i" type="date" id="arrFPDay" name="day" value="${E(localDay())}"></label>
    <button type="submit" class="btn soft">Get a one-day code</button></form>
   ${S.famCode && S.famCode.kid === kid ? codeBox(S.famCode) : ''}
   ${(st.day_passes || []).filter(d => !d.used_at && !d.revoked_at).length ? `<ul class="arr-list small">${st.day_passes.filter(d => !d.used_at && !d.revoked_at).map(d => `<li><span>One-day: <b>${E(d.name)}</b> on ${E(d.valid_on)}</span><button type="button" class="btn soft" data-arr="fam-revoke" data-id="${E(d.id)}">Cancel</button></li>`).join('')}</ul>` : ''}
   <form class="arr-form" data-arr-form="fam-pin" novalidate><h4 class="wide">Your sign-in PIN for the center's tablet</h4>
    <p class="small wide">${pin.pin_set ? 'You have a PIN. Set a new one any time.' : 'Optional: instead of signing with a finger at drop-off and pick-up, type this PIN.'}</p>
    <label class="f" for="arrFPin1">PIN (4 to 6 digits)<input class="i arr-pin" id="arrFPin1" name="pin" type="password" inputmode="numeric" maxlength="6" autocomplete="off" required></label>
    <label class="f" for="arrFPin2">Type it again<input class="i arr-pin" id="arrFPin2" name="pin2" type="password" inputmode="numeric" maxlength="6" autocomplete="off" required></label>
    <button type="submit" class="btn soft">${pin.pin_set ? 'Change PIN' : 'Set PIN'}</button></form></div>`;
}

// ---------------------------------------------------------------- events
async function act(fn, note){
  if (S.busy) return; S.busy = true; S.err = ''; S.note = ''; rerender();
  try { await fn(); S.note = note || ''; } catch (e) { S.err = msgOf(e); }
  finally { S.busy = false; rerender(); }
}
document.addEventListener('click', async e => {
  const t = e.target.closest && e.target.closest('[data-arr]'); if (!t || !hubOn()) return;
  const a = t.dataset.arr, f = S.flow;
  if (a === 'refresh') { S.note = ''; return loadBoard(true); }
  if (a === 'kiosk') { S.kiosk = true; S.overlay = true; S.kioskRoom = ctx().room || ''; S.flow = null; await loadBoard(true); return drawOverlay(); }
  if (a === 'kiosk-exit') {
    let st = null; try { st = must(await sb().rpc('security_my_status')); } catch (_) { st = null; }
    if (st && st.pin_set) { S.exitPin = true; return drawOverlay(); }
    S.kiosk = false; S.overlay = false; S.flow = null; S.exitPin = false; drawOverlay(); return rerender();
  }
  if (a === 'exit-cancel') { S.exitPin = false; return drawOverlay(); }
  if (a === 'kid') return startFlow(t.dataset.kid);
  if (a === 'in' || a === 'out') return startFlow(t.dataset.kid, a === 'in' ? 'check_in' : 'check_out');
  if (a === 'flow-close') return closeFlow();
  if (a === 'flow-back' && f) { f.step = 'who'; f.err = ''; return drawOverlay(); }
  if (a === 'who' && f) { const p = (f.list.people || []).find(x => x.person_id === t.dataset.pid); f.who = Object.assign({kind:'person'}, p); f.method = 'signature'; f.step = 'sign'; return drawOverlay(); }
  if (a === 'who-pass' && f) { const d = (f.list.day_passes || []).find(x => x.id === t.dataset.id); f.who = Object.assign({kind:'pass'}, d); f.method = 'signature'; f.step = 'sign'; return drawOverlay(); }
  if (a === 'who-other' && f) { f.who = {kind:'other'}; f.method = 'signature'; f.step = 'sign'; return drawOverlay(); }
  if (a === 'method' && f) { f.method = t.dataset.m; return drawOverlay(); }
  if (a === 'pad-clear') return clearPad();
  if (a === 'req-yes' || a === 'req-no') return act(async () => { must(await sb().rpc('pickup_request_decide', {p_center:S.center, p_id:t.dataset.id, p_approve:a === 'req-yes'})); S.pending = null; if (S.mgrKid) await openMgr(S.mgrKid); }, a === 'req-yes' ? 'Approved: the list has a new version.' : 'Declined.');
  if (a === 'edit' && S.mgr) { S.mgr.edit = t.dataset.pid; return rerender(); }
  if (a === 'edit-cancel' && S.mgr) { S.mgr.edit = null; return rerender(); }
  if (a === 'remove' && S.mgr) {
    if (!t.dataset.armed) { t.dataset.armed = '1'; t.textContent = 'Click again to remove'; return; }
    const p = S.mgr.list.people.find(x => x.person_id === t.dataset.pid); if (!p) return;
    return act(async () => { must(await sb().rpc('pickup_set', {p_center:S.center, p_kid:S.mgrKid, p_person:p.person_id, p_kind:p.kind, p_status:'removed', p_name:p.name, p_relationship:p.relationship || null, p_phone:p.phone || null})); await openMgr(S.mgrKid); }, `${p.name} removed (kept in the history).`);
  }
  if (a === 'fam-remove') {
    const kid = ctx().fam.kid, st = S.fam[kid]; const p = st && (st.people || []).find(x => x.person_id === t.dataset.pid); if (!p) return;
    if (!t.dataset.armed) { t.dataset.armed = '1'; t.textContent = 'Click again to ask'; return; }
    return famRequest(kid, {p_action:'remove', p_person:p.person_id}, `Asked the director to remove ${p.name}.`);
  }
  if (a === 'fam-withdraw') return act(async () => { must(await sb().rpc('pickup_request_withdraw', {p_center:S.center, p_id:t.dataset.id})); S.fam[ctx().fam.kid] = undefined; }, 'Request withdrawn.');
  if (a === 'fam-revoke') return act(async () => { must(await sb().rpc('pickup_day_pass_revoke', {p_center:S.center, p_id:t.dataset.id})); S.fam[ctx().fam.kid] = undefined; S.famCode = null; }, 'One-day pickup cancelled.');
});
document.addEventListener('toggle', e => {
  const d = e.target; if (!d || !d.matches || !d.matches('[data-arr-hist]') || !d.open || S.hist) return;
  sb().rpc('pickup_history', {p_center:S.center, p_kid:S.mgrKid}).then(r => { S.hist = r.data || []; rerender(); });
}, true);
document.addEventListener('change', e => {
  const t = e.target; if (!hubOn()) return;
  if (t.matches && t.matches('[data-arr-sel]')) { if (t.checked) S.sel.add(t.dataset.arrSel); else S.sel.delete(t.dataset.arrSel); return rerender(); }
  if (t.id === 'arrMoveTo') { S.moveTo = t.value; return; }
  if (t.matches && t.matches('[data-arr-mgr]')) return openMgr(t.value);
  if (t.matches && t.matches('[data-arr-kroom]')) { S.kioskRoom = t.value; return drawOverlay(); }
});
async function famRequest(kid, extra, note){
  const id = uuid(), args = Object.assign({p_center:S.center, p_id:id, p_kid:kid}, extra);
  return act(async () => {
    const r = window.FFOffline && window.FFOffline.call ? await window.FFOffline.call('pickup_request_submit', args, id) : {data:must(await sb().rpc('pickup_request_submit', args))};
    S.fam[kid] = undefined;
    if (r.queued) throw new Error('Not saved yet: kept on this device, it will send when the Futures Hub is back.');
  }, note);
}
document.addEventListener('submit', async e => {
  const f = e.target.closest && e.target.closest('[data-arr-form]'); if (!f || !hubOn()) return; e.preventDefault();
  const kind = f.dataset.arrForm, v = Object.fromEntries(new FormData(f).entries()), fl = S.flow;
  if (kind === 'sign' && fl) {
    const w = fl.who || {};
    if (w.kind === 'other') { w.name = String(v.other_name || '').trim(); w.relationship = v.other_rel || null; if (!w.name) { fl.err = 'Write the adult\'s full name.'; return drawOverlay(); } }
    if (w.kind === 'pass') { w.code = String(v.code || '').trim(); if (!/^\d{6}$/.test(w.code)) { fl.err = 'Type the 6-digit one-day code.'; return drawOverlay(); } }
    if (fl.method === 'family_pin') { w.pin = String(v.pin || ''); if (!/^\d{4,6}$/.test(w.pin)) { fl.err = 'Type the 4 to 6 digit family PIN.'; return drawOverlay(); } }
    else { if (!pad || pad.n < 3) { fl.err = 'Ask the adult to sign in the box with a finger.'; return drawOverlay(); } w.signature = pad.path.join(' ').slice(0, 20000); }
    return submitFlow();
  }
  if (kind === 'override' && fl) {
    const reason = String(v.reason || '').trim();
    if (reason.length < 10) { fl.err = 'Write the reason (at least 10 characters).'; return drawOverlay(); }
    const extra = {p_override_reason:reason};
    if (ctx().role !== 'director') { if (!v.director || !/^\d{4,6}$/.test(String(v.pin || ''))) { fl.err = 'Choose the director and type their PIN.'; return drawOverlay(); } extra.p_override_director = v.director; extra.p_override_pin = String(v.pin); }
    return submitFlow(extra);
  }
  if (kind === 'exit') {
    try { const r = must(await sb().rpc('security_verify_pin', {p_pin:String(v.pin || '')})); if (!r || !r.ok) { toast(r && r.reason === 'locked' ? 'PIN paused after too many tries: use the Account page.' : 'That PIN is not right.'); return; } }
    catch (_) { toast('Could not check the PIN.'); return; }
    S.kiosk = false; S.overlay = false; S.flow = null; S.exitPin = false; drawOverlay(); return rerender();
  }
  if (kind === 'move') {
    const kids = [...S.sel].filter(id => { const k = boardKid(id); return k && k.state === 'here'; }), to = v.to || S.moveTo;
    if (!kids.length || !to) return;
    const id = uuid();
    return act(async () => {
      const r = window.FFOffline && window.FFOffline.call ? await window.FFOffline.call('arrival_move', {p_center:S.center, p_id:id, p_kids:kids, p_to_room:to}, id)
        : {data:must(await sb().rpc('arrival_move', {p_center:S.center, p_id:id, p_kids:kids, p_to_room:to}))};
      S.sel.clear();
      if (r.queued) throw new Error('Not saved yet: the move is kept on this device and will send when the Futures Hub is back.');
      await loadBoard(true);
    }, `Moved to ${roomName(to)}.`);
  }
  if (kind === 'person') {
    const ed = f.dataset.pid ? S.mgr.list.people.find(p => p.person_id === f.dataset.pid) : null;
    const k = ed ? ed.kind : v.kind, file = f.elements.photo && f.elements.photo.files && f.elements.photo.files[0];
    if (!String(v.name || '').trim()) { S.err = 'Write the full name.'; return rerender(); }
    if (file && !v.consent) { S.err = 'A photo needs the adult\'s consent: tick the box, or leave the photo out.'; return rerender(); }
    return act(async () => {
      let path = ed && ed.photo_path ? ed.photo_path : null;
      if (file && k !== 'never') {
        const ext = ({'image/jpeg':'jpg', 'image/png':'png', 'image/webp':'webp'})[file.type]; if (!ext) throw new Error('Use a JPEG, PNG or WebP photo.');
        path = `${S.center}/_pickup/${uuid()}.${ext}`;
        must(await sb().storage.from('child-photos').upload(path, file, {contentType:file.type, upsert:false}));
      }
      must(await sb().rpc('pickup_set', {p_center:S.center, p_kid:S.mgrKid, p_person:ed ? ed.person_id : null, p_kind:k, p_status:'active', p_name:v.name.trim(),
        p_relationship:v.relationship || null, p_phone:(v.phone || '').trim() || null, p_user:v.user || (ed && ed.user_id) || null,
        p_photo_path:k === 'never' ? null : path, p_photo_consent:k !== 'never' && (!!v.consent || !!(ed && ed.has_photo && !file))}));
      await openMgr(S.mgrKid); S.board = null;
    }, ed ? 'Saved as a new version.' : 'Added to the list.');
  }
  if (kind === 'pass' || kind === 'fam-pass') {
    const kid = kind === 'pass' ? S.mgrKid : ctx().fam.kid;
    if (!String(v.name || '').trim()) { S.err = 'Write their full name.'; return rerender(); }
    return act(async () => { const r = must(await sb().rpc('pickup_day_pass_create', {p_center:S.center, p_kid:kid, p_name:v.name.trim(), p_relationship:v.relationship || null, p_valid_on:v.day || null}));
      S.famCode = Object.assign({kid}, r); S.fam[kid] = undefined; S.lists[kid] = null; }, '');
  }
  if (kind === 'fam-add') {
    if (!String(v.name || '').trim()) { S.err = 'Write the adult\'s full name.'; return rerender(); }
    return famRequest(ctx().fam.kid, {p_action:'add', p_name:v.name.trim(), p_relationship:v.relationship || null, p_phone:(v.phone || '').trim() || null}, 'Sent. The director will check and approve it.');
  }
  if (kind === 'fam-pin') {
    if (v.pin !== v.pin2) { S.err = 'The two PINs do not match.'; return rerender(); }
    return act(async () => { must(await sb().rpc('family_set_pickup_pin', {p_pin:String(v.pin || '')})); S.famPin = null; }, 'PIN saved. Use it on the center\'s tablet instead of signing.');
  }
  if (kind === 'export') {
    S.exp = {from:v.from, to:v.to, format:v.format};
    if (!v.from || !v.to) { S.err = 'Choose both dates.'; return rerender(); }
    S.expBusy = true;
    return act(async () => {
      try {
        const text = must(await sb().rpc('attendance_export', {p_center:S.center, p_from:v.from, p_to:v.to, p_format:v.format}));
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], {type:'text/csv'}));
        a.download = `attendance-${(ctx().center && ctx().center.name || 'center').replace(/[^A-Za-z0-9]+/g, '-').toLowerCase()}-${v.from}-to-${v.to}-${v.format}.csv`;
        document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      } finally { S.expBusy = false; }
    }, 'Export downloaded. It is logged in the center\'s security log.');
  }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && S.overlay && S.flow && !S.kiosk) closeFlow(); });

window.FFArrival = {
  addTabs(tabs, role){ if (!hubOn() || role === 'family') return; const i = tabs.findIndex(t => t[0] === 'today'); tabs.splice(i + 1, 0, ['arrivals', 'Arrivals']); },
  view:() => tabView(),
  // Today card: the sign-in / sign-out words and button for one child (null until the board has loaded)
  todayBits(kid, canWrite){
    if (!hubOn()) return null; sync();
    if (S.board === null) { loadBoard(); return null; }
    const k = boardKid(kid); if (!k) return null;
    const w = pendingFor(kid);
    return {status:statusOf(k) + (w ? ' · not saved yet' : ''), button:canWrite ? `<button type="button" class="btn soft arr-mini" data-arr="${k.state === 'here' ? 'out' : 'in'}" data-kid="${E(kid)}">${k.state === 'here' ? 'Sign out' : 'Sign in'}</button>` : ''};
  },
  familyCard,
  state:() => ({board:S.board, kiosk:S.kiosk, flow:S.flow ? {kid:S.flow.kid, kind:S.flow.kind, step:S.flow.step} : null})
};
})();
