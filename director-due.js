/* Futures Hub director compliance desk (hub mode only).
   - Teacher Portal tab "What's due" (director): everything overdue or due in 7 / 30 / 90 days, per staff and per center, each item with
     the citation of the rule it comes from and a one-click "Log it"; who may be left alone with children; the inspection binder.
   - Teacher Portal tab "Safety logs" (director and teachers): ratio check per room (live from today's attendance; warns, never blocks),
     a ratio calculator, emergency drills, incident and injury reports.
   - Family Portal: incident reports about the family's own child, with "I have read this" (the guardian's acknowledgement).
   - What's due also holds the director's exception queue (R6, hub migration 20261010510000_director_exceptions): everything stuck,
     failed or out of date (undelivered family email, CRM sync problems, invitations, background checks, expiring cards, incidents a
     family has not acknowledged, overdue training), each with owner, reason, due date, next action, source and Retry / Escalate;
     and "Classroom access" (20261010500000_staff_clearance): who has classroom authority, who is training only and why, holds.
   Every rule (who may read or write what, the due dates, the ratio tables, the citations) lives in Postgres
   (hub migration 20261009200000_director_compliance and hub/content/compliance/director-rules.json); this file only draws and calls.
   Child health records are not kept in the Hub (owner decision B11/X56): the rules that require them are listed as
   "kept in your own records". Loaded after portal.js. */
(function(){
'use strict';
if (typeof V === 'undefined' || !V.portal) return;
const hubOn = () => !!(window.FFHub && window.FFHub.configured && window.FFHub.connected);
const sb = () => (window.FFHub && window.FFHub.client) ? window.FFHub.client() : null;
const ctx = () => (window.FFPortal && window.FFPortal.ctx) ? window.FFPortal.ctx() : {};
const rerender = () => { try { if (window.FFPortal && window.FFPortal.rerender) window.FFPortal.rerender(); } catch (_) {} };
const E = s => esc(s);
const msgOf = e => (e && e.message) ? e.message : 'That did not save. Try again in a moment.';
const must = r => { if (r.error) throw r.error; return r.data; };

const BUCKETS = [['overdue', 'Overdue', 'bad'], ['due_7', 'Due in 7 days', 'warn'], ['due_30', 'Due in 30 days', 'warn'], ['due_90', 'Due in 90 days', 'ok'],
  ['needs_info', 'Needs information', ''], ['own_records', 'Kept in your own records', '']];
const DRILLS = [['fire', 'Fire drill'], ['tornado', 'Tornado drill'], ['disaster', 'Disaster drill'], ['shelter_in_place', 'Shelter-in-place practice'], ['relocation', 'Off-site relocation practice']];
const CRITICAL = [['facility_damage', 'Damage to the facility that affects safety'], ['vehicle_collision', 'Vehicle collision with a child aboard'], ['missing_child', 'Missing child'],
  ['injury_medical_treatment', 'Injury that needed a health professional'], ['animal_injury', 'Injury by an animal'], ['death', 'Death of a child or staff member'], ['other_jeopardy', 'Anything else that put children at risk']];
const AGES = [['infant', 'Infants (under 12 months)'], ['toddler', '12 to 23 months'], ['two', '24 to 29 months'], ['two_half', '30 to 35 months'],
  ['three_four', '3 and 4 years'], ['five', '5 years (not in school)'], ['school_age', 'School age']];
const NOTIFY = [['in_person', 'In person'], ['phone', 'Phone'], ['text', 'Text'], ['email', 'Email'], ['portal', 'Futures Hub message']];
const label = (list, v) => (list.find(x => x[0] === v) || [v, v])[1];

const fresh = () => ({ centerId:null, due:null, elig:null, live:null, drills:null, incidents:null, binder:null, rules:null, exc:null, access:null,
  loading:{}, err:{}, note:'', filter:'', open:null, sub:'ratio', showBinder:false, calc:null, prefill:null, busy:false, fam:{}, famKid:null,
  escOpen:null, holdOpen:null, logOpen:null });
const S = fresh();
function center(){
  const c = ctx(); const id = c.center && c.center.id;
  if (id && S.centerId !== id) { Object.assign(S, fresh()); S.centerId = id; }
  return S.centerId;
}
function load(key, fn){
  if (S[key] !== null || S.loading[key]) return;
  S.loading[key] = true;
  fn().then(v => { S[key] = v; S.err[key] = null; }).catch(e => { S.err[key] = msgOf(e); S[key] = []; })
    .finally(() => { S.loading[key] = false; rerender(); });
}
const reload = (...keys) => { keys.forEach(k => { S[k] = null; }); rerender(); };
const wait = () => '<div class="card" role="status"><p class="small muted">Loading...</p></div>';
const errBox = k => S.err[k] ? `<p class="dd-msg bad" role="alert">${E(S.err[k])}</p>` : '';
const noteBox = () => (S.err.action ? `<p class="dd-msg bad" role="alert">${E(S.err.action)}</p>` : '') + (S.note ? `<p class="dd-msg ok" role="status">${E(S.note)}</p>` : '');
const fmt = d => d ? new Date(String(d).length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'}) : '';
const fmtT = d => d ? new Date(d).toLocaleString('en-US', {month:'short', day:'numeric', hour:'numeric', minute:'2-digit'}) : '';
const today = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const nowLocal = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
const when = it => {
  if (it.bucket === 'own_records') return 'Your own records';
  if (it.due_date == null) return 'No date yet';
  const n = it.days_left;
  return n < 0 ? `${-n} day${n === -1 ? '' : 's'} late` : n === 0 ? 'Due today' : `In ${n} day${n === 1 ? '' : 's'}`;
};
const cite = (c, flag) => c ? `<span class="dd-cite"><b>Source:</b> ${E(c)}${flag ? ' <span class="chip warn">Needs confirmation</span>' : ''}</span>` : '';
const roomsOf = c => Object.entries(c.rooms || {}).filter(([, r]) => !r.sample).sort((a, b) => (a[1].order || 9) - (b[1].order || 9));
const kidName = (c, id) => { const k = (c.kids || {})[id]; return k ? `${k.first || ''} ${k.last || ''}`.trim() : ''; };

// ---------------------------------------------------------------- What's due (director)
function itemHtml(it, i){
  const who = it.full_name ? E(it.full_name) : (it.kind === 'drill' ? 'Center: drills' : it.kind === 'incident' ? 'Center: incident' : 'Center');
  const a = it.action || {};
  let act = '';
  if (it.bucket !== 'own_records' && a.type) {
    if (a.type === 'record') act = `<button class="btn soft" type="button" data-dd="open" data-i="${i}" aria-expanded="${S.open === i}">${S.open === i ? 'Close' : 'Log it'}</button>`;
    else if (a.type === 'drill') act = `<button class="btn soft" type="button" data-dd="drill" data-type="${E(a.drill_type)}">Log the drill</button>`;
    else if (a.type === 'incident') act = `<button class="btn soft" type="button" data-dd="inc-step" data-id="${E(a.id)}" data-step="${E(a.step)}">${a.step === 'state' ? 'Mark reported to the state' : 'Mark parent notified'}</button>`;
    else if (a.type === 'training') act = `<button class="btn soft" type="button" data-go="learn-team">Open training</button>`;
  }
  const form = S.open === i && a.type === 'record' ? `<form class="dd-form" data-dd-form="record" data-i="${i}" novalidate>
   <label class="f">Done on<input class="i" type="date" name="completed_on" value="${today()}" max="${today()}" required></label>
   <label class="f">Expires on (if it has a card or expiry)<input class="i" type="date" name="expires_on"></label>
   <label class="f wide">Note (optional)<input class="i" name="note" maxlength="300" placeholder="Card number, who checked it, where the paper copy is"></label>
   <div class="dd-acts wide"><button class="btn navy" type="submit" ${S.busy ? 'disabled' : ''}>Save the record</button></div></form>` : '';
  return `<li class="dd-item ${E(it.bucket)}"><div class="dd-row"><div><b>${E(it.title)}</b><br><span class="small muted">${who}</span></div>
   <span class="dd-when">${E(when(it))}${it.due_date ? `<br><span class="small muted">${E(fmt(it.due_date))}</span>` : ''}</span></div>
   ${it.detail ? `<span class="small">${E(it.detail)}</span>` : ''}${cite(it.citation, it.needs_confirmation)}
   ${act ? `<div class="dd-acts">${act}</div>` : ''}${form}</li>`;
}
function eligHtml(){
  if (!S.elig) return '';
  if (!S.elig.length) return '';
  return `<section class="dd-sec" aria-labelledby="ddElig"><h3 id="ddElig">Who can be left alone with children</h3>
   <ul class="dd-list">${S.elig.map(p => `<li class="dd-item ${p.eligible ? 'due_90' : 'overdue'}"><div class="dd-row"><div><b>${E(p.full_name)}</b> <span class="small muted">${E(String(p.job_role || '').replace(/_/g, ' '))}</span></div>
   <span class="chip ${p.eligible ? 'ok' : 'warn'}">${p.eligible === null ? 'No rule for this license type' : p.eligible ? 'Eligible' : 'Not yet'}</span></div>
   ${(p.missing || []).length ? `<span class="small">Missing: ${p.missing.map(m => E(m.title)).join('; ')}</span>` : ''}
   ${p.note ? `<span class="small">${E(p.note)}</span>` : ''}${cite(p.citation, p.needs_confirmation)}</li>`).join('')}</ul></section>`;
}
function dueView(c){
  const id = center(); if (!id) return '';
  if (c.role !== 'director') return '<div class="card"><p class="small">Only the center director sees this page.</p></div>';
  if (S.showBinder) return binderView();
  load('due', async () => must(await sb().rpc('compliance_due', {p_center:id})));
  load('elig', async () => must(await sb().rpc('compliance_eligible_alone', {p_center:id})));
  load('exc', async () => must(await sb().rpc('director_exceptions', {p_center:id})));
  load('access', async () => must(await sb().rpc('staff_clearance_list', {p_center:id})));
  if (!S.due) return wait();
  const n = b => S.due.filter(x => x.bucket === b).length;
  const shown = S.filter ? S.due.filter(x => x.bucket === S.filter) : S.due;
  const idx = it => S.due.indexOf(it);
  return `<div class="dd" id="ddDue"><div class="dd-head"><div><h2>What’s due</h2><p class="small" style="margin:2px 0 0">Worked out from your state’s rules for your license type. Every item shows the rule it comes from.</p></div>
   <div class="dd-acts"><button class="btn gold" type="button" data-dd="binder">Inspection binder</button><button class="btn soft" type="button" data-dd="refresh">Refresh</button></div></div>
   ${errBox('due')}${noteBox()}
   <div class="dd-tiles" role="group" aria-label="Filter by when it is due">${BUCKETS.map(([k, l, cls]) => `<button type="button" class="dd-tile ${cls}" data-dd="filter" data-b="${k}" aria-pressed="${S.filter === k}"><b>${n(k)}</b><span class="small">${l}</span></button>`).join('')}</div>
   ${excView()}
   ${S.filter ? `<p class="small">Showing: ${E(label(BUCKETS, S.filter))}. <button class="rl" type="button" data-dd="filter" data-b="">Show everything</button></p>` : ''}
   ${BUCKETS.map(([k, l]) => { const items = shown.filter(x => x.bucket === k); if (!items.length) return '';
     return `<section class="dd-sec" aria-label="${E(l)}"><h3>${E(l)} <span class="chip">${items.length}</span></h3>${k === 'own_records' ? '<p class="small muted">The Futures Hub stores no child health information. These records stay in your center’s own files.</p>' : ''}
      <ul class="dd-list">${items.map(it => itemHtml(it, idx(it))).join('')}</ul></section>`; }).join('')}
   ${S.due.length ? '' : '<p class="small">Nothing is due in the next 90 days.</p>'}
   ${eligHtml()}${accessView()}</div>`;
}

// ---------------------------------------------------------------- Exception queue and classroom access (R6)
const OWNER = {director:'You (director)', hq:'Futures Friends HQ', staff:'Staff member'};
const KIND_LABEL = {delivery_failed:'Message not delivered', sync_error:'Sync error', sync_blocked:'Sync blocked', sync_waiting:'Sync waiting'};
const ACCESS = {classroom:['Classroom', 'ok'], pending:['Training only: checks pending', 'warn'], expired:['Training only: check expired', 'bad'], on_hold:['On hold', 'bad']};
function sourceHtml(src){
  if (!src) return '';
  const crmBase = String(window.FF_CRM_URL || '').replace(/\/+$/, '');
  const parts = [];
  if (src.hub === 'access') parts.push('<a class="rl" href="#ddAccess">Classroom access below</a>');
  else if (src.hub === 'safety') parts.push('<button class="rl" type="button" data-ptab="safety">Safety logs</button>');
  else if (src.hub === 'learn-team') parts.push('<button class="rl" type="button" data-go="learn-team">Team training</button>');
  else if (src.label) parts.push(E(src.label));
  if (src.crm) parts.push(crmBase ? `<a class="rl" href="${E(crmBase + '/' + src.crm)}" target="_blank" rel="noopener">Open in the CRM</a>` : `CRM record ${E(src.crm)}`);
  return `<span class="dd-cite"><b>Source:</b> ${parts.join(' · ')}</span>`;
}
function excHtml(it){
  const acts = [];
  if ((it.actions || []).includes('retry')) acts.push(`<button class="btn navy" type="button" data-dd="exc-retry" data-key="${E(it.key)}" ${S.busy ? 'disabled' : ''}>Retry</button>`);
  if ((it.actions || []).includes('escalate')) acts.push(`<button class="btn soft" type="button" data-dd="exc-esc" data-key="${E(it.key)}" aria-expanded="${S.escOpen === it.key}">${S.escOpen === it.key ? 'Close' : 'Escalate to HQ'}</button>`);
  const state = [it.retry_requested_at ? `Retry requested ${E(fmtT(it.retry_requested_at))}` : '', it.escalated_at ? `Escalated to HQ ${E(fmtT(it.escalated_at))}` : ''].filter(Boolean).join(' · ');
  const form = S.escOpen === it.key ? `<form class="dd-form" data-dd-form="exc-esc" data-key="${E(it.key)}" novalidate><label class="f wide">Note for HQ (optional)<input class="i" name="note" maxlength="500"></label>
    <div class="dd-acts wide"><button class="btn navy" type="submit" ${S.busy ? 'disabled' : ''}>Send to HQ</button></div></form>` : '';
  return `<li class="dd-item ${it.severity === 'high' ? 'overdue' : 'due_7'}" data-key="${E(it.key)}"><div class="dd-row"><div><b>${E(it.title)}</b>${it.subject ? `<br><span class="small">${E(it.subject)}</span>` : ''}</div>
    <span class="dd-when">${it.due_date ? E(fmt(it.due_date)) : ''}<br><span class="chip">${E(OWNER[it.owner_role] || it.owner_role)}${it.owner_name ? ': ' + E(it.owner_name) : ''}</span></span></div>
    <span class="small"><b>Why:</b> ${E(it.reason)}</span><span class="small"><b>Next:</b> ${E(it.next_action)}</span>${sourceHtml(it.source)}
    ${state ? `<span class="small muted">${state}</span>` : ''}${acts.length ? `<div class="dd-acts">${acts.join('')}</div>` : ''}${form}</li>`;
}
function excView(){
  if (S.exc === null) return '';
  const list = S.exc || [];
  return `<section class="dd-sec" id="ddExc" aria-labelledby="ddExcH"><h3 id="ddExcH">Needs action now <span class="chip ${list.length ? 'warn' : 'ok'}">${list.length}</span></h3>
   <p class="small muted">Things that failed, are stuck or out of date. Each one says who owns it, why, and what happens next.</p>${errBox('exc')}
   ${list.length ? `<ul class="dd-list">${list.map(excHtml).join('')}</ul>` : '<p class="small">Nothing is stuck or failing right now.</p>'}</section>`;
}
function accessView(){
  if (!S.access || !S.access.length) return S.err.access ? errBox('access') : '';
  return `<section class="dd-sec" id="ddAccess" aria-labelledby="ddAccessH"><h3 id="ddAccessH">Classroom access</h3>
   <p class="small">Training opens when someone is hired. Children, families, photos and messages open only once their background checks are on file and current. The database enforces this, not this page.</p>
   <ul class="dd-list">${S.access.map(p => { const [lab, cls] = ACCESS[p.access] || [p.access, '']; const miss = (p.missing || []);
     const canHold = p.access !== 'on_hold' && p.role !== 'director';
     const holdForm = S.holdOpen === p.user_id ? `<form class="dd-form" data-dd-form="hold" data-user="${E(p.user_id)}" novalidate><label class="f wide">Why (the person is told only that access is on hold)<input class="i" name="reason" maxlength="300" required></label>
       <div class="dd-acts wide"><button class="btn navy" type="submit" ${S.busy ? 'disabled' : ''}>Put on hold</button></div></form>` : '';
     const logForm = S.logOpen === p.user_id && miss[0] && miss[0].requirement_id ? `<form class="dd-form" data-dd-form="clr-record" data-user="${E(p.user_id)}" data-req="${E(miss[0].requirement_id)}" novalidate>
       <label class="f">Cleared on<input class="i" type="date" name="completed_on" max="${today()}" required></label><label class="f">Expires on (if stated)<input class="i" type="date" name="expires_on"></label>
       <label class="f wide">Note (who checked it, where the result is filed)<input class="i" name="note" maxlength="300"></label><div class="dd-acts wide"><button class="btn navy" type="submit" ${S.busy ? 'disabled' : ''}>Record the result</button></div></form>` : '';
     return `<li class="dd-item ${p.access === 'classroom' ? 'due_90' : 'overdue'}"><div class="dd-row"><div><b>${E(p.full_name || 'Staff member')}</b> <span class="small muted">${E(String(p.job_role || p.role || '').replace(/_/g, ' '))}</span></div>
       <span class="chip ${cls}">${E(lab)}</span></div>
       ${p.access === 'classroom' && p.cleared_until ? `<span class="small">Checks valid until ${E(fmt(p.cleared_until))}</span>` : ''}
       ${!p.gated ? '<span class="small muted">Not gated by the checks (director of record or added before checks were tracked); a hold still applies.</span>' : ''}
       ${miss.length && p.checks_state !== 'cleared' ? `<span class="small">Missing: ${miss.map(m => E(m.title)).join('; ')}</span>${cite(miss[0].citation)}` : ''}
       ${p.hold_reason ? `<span class="small"><b>On hold:</b> ${E(p.hold_reason)}${p.hold_source === 'crm_check' ? ' (from the CRM)' : ''}</span>` : ''}
       <div class="dd-acts">${miss[0] && miss[0].requirement_id && p.checks_state !== 'cleared' ? `<button class="btn soft" type="button" data-dd="clr-log" data-user="${E(p.user_id)}">Record a check result</button>` : ''}
       ${canHold ? `<button class="btn soft" type="button" data-dd="clr-hold" data-user="${E(p.user_id)}">Put on hold</button>` : ''}
       ${p.hold_reason && p.hold_source === 'director' ? `<button class="btn soft" type="button" data-dd="clr-release" data-user="${E(p.user_id)}" ${S.busy ? 'disabled' : ''}>Release the hold</button>` : ''}</div>${logForm}${holdForm}</li>`; }).join('')}</ul></section>`;
}

// ---------------------------------------------------------------- Inspection binder
const yes = b => b === true ? 'Yes' : b === false ? '<span class="miss">No</span>' : '';
const STATUS = {complete:'Done', due_soon:'Due soon', overdue:'<span class="miss">Overdue</span>', upcoming:'Upcoming', unknown_missing_data:'<span class="miss">No record on file</span>'};
function binderView(){
  const id = S.centerId;
  load('binder', async () => must(await sb().rpc('compliance_binder', {p_center:id})));
  const back = '<div class="dd-acts dd-noprint"><button class="btn soft" type="button" data-dd="binder-close">Back to What’s due</button><button class="btn gold" type="button" data-dd="print">Print or save as PDF</button></div>';
  if (!S.binder) return back + wait();
  if (S.err.binder) return back + errBox('binder');
  const b = S.binder, c = b.center, sec = Object.fromEntries((b.sections || []).map(s => [s.key, s]));
  const cites = s => `<p class="cites"><b>Rules:</b> ${(s.citations || []).map(E).join(' · ') || 'none in effect'}</p>`;
  const t = (head, rows) => rows.length ? `<table><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(x => `<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table>` : '<p>None on file.</p>';
  const parts = [];
  const s1 = sec.license; if (s1) parts.push(`<section><h2>1. ${E(s1.title)}</h2>${cites(s1)}${t(['Posting', 'Confirmed', 'Rule'], s1.postings.map(p => [E(p.title), p.confirmed_on ? E(fmt(p.confirmed_on)) : '<span class="miss">Not confirmed</span>', E(p.citation)]))}</section>`);
  const s2 = sec.staff; if (s2) parts.push(`<section><h2>2. ${E(s2.title)}</h2>${cites(s2)}${s2.staff.map(p => `<h3>${E(p.full_name)} <small>${E(String(p.job_role).replace(/_/g, ' '))}${p.hire_date ? `, hired ${E(fmt(p.hire_date))}` : ''}</small></h3>
     <p>May be left alone with children: ${yes(p.eligible_alone)}${(p.eligible_missing || []).length ? ` (missing: ${p.eligible_missing.map(m => E(m.title)).join('; ')})` : ''}</p>
     ${t(['Requirement', 'Status', 'Last on file', 'Due', 'Rule'], p.items.map(x => [E(x.title), STATUS[x.status] || E(x.status), E(fmt(x.last_evidence_on)), E(fmt(x.due_date)), E(x.citation)]))}`).join('') || '<p>No staff on file.</p>'}</section>`);
  const s3 = sec.hours; if (s3) parts.push(`<section><h2>3. ${E(s3.title)}</h2>${cites(s3)}${t(['Staff', 'Requirement', 'Period', 'Hours', 'Status'], s3.hours.map(h => [E(h.full_name), E(h.title), `${E(fmt(h.period_start))} to ${E(fmt(h.period_end))}`, `${E(h.progress)} of ${E(h.target)}${h.prorated ? ' (prorated)' : ''}`, STATUS[h.status] || E(h.status)]))}</section>`);
  const s4 = sec.drills; if (s4) parts.push(`<section><h2>4. ${E(s4.title)}</h2>${cites(s4)}${s4.rules.map(r => `<h3>${E(r.title)}</h3><p class="cites">${E(r.citation)}${r.next_due ? ` · next due ${E(fmt(r.next_due))}` : ''}</p>
     ${r.months ? t(r.months.map(m => E(m.month)), [r.months.map(m => ({logged:'Logged', missed:'<span class="miss">Missed</span>', in_progress:'This month', before_tracking:'Before tracking', no_rule:'Not in effect'}[m.status] || E(m.status)))]) : ''}`).join('')}
     <h3>Drill log (12 months)</h3>${t(['Date', 'Time', 'Type', 'Evacuation', 'Children', 'Staff', 'Alarm', 'Rooms', 'Issues'], s4.log.map(l => [E(fmt(l.date)), E(l.time), E(label(DRILLS, l.drill_type)),
       l.evacuation_seconds == null ? '' : `${Math.floor(l.evacuation_seconds / 60)}:${String(l.evacuation_seconds % 60).padStart(2, '0')}`, E(l.children_count ?? ''), E(l.staff_count ?? ''), l.alarm_activated == null ? '' : yes(l.alarm_activated), E((l.rooms || []).join(', ')), E(l.issues || '')]))}</section>`);
  const s5 = sec.incidents; if (s5) { const m = s5.summary || {}; parts.push(`<section><h2>5. ${E(s5.title)}</h2>${cites(s5)}
     <p>12 months: ${E(m.total || 0)} reports (${E(m.injury || 0)} injury, ${E(m.critical || 0)} critical). Parent not yet notified: ${E(m.parent_not_notified || 0)}. State report missing: ${E(m.state_report_missing || 0)}. Waiting for the family’s acknowledgement: ${E(m.awaiting_family || 0)}. Children are not named in this binder; the full reports are in the Futures Hub.</p>
     ${t(['Date', 'Kind', 'Room', 'Parent notified', 'State report', 'Family read it'], s5.list.map(i => [`${E(fmt(i.date))} ${E(i.time)}`, E(i.kind === 'critical' ? label(CRITICAL, i.critical_type) : 'Injury'), E(i.room || ''),
       i.parent_notified_at ? `${E(fmtT(i.parent_notified_at))}${i.parent_on_time === false ? ' <span class="miss">(late)</span>' : ''}` : '<span class="miss">Not yet</span>',
       i.kind === 'critical' ? (i.state_reported_at ? E(fmtT(i.state_reported_at)) : `<span class="miss">Due ${E(fmt(i.state_due))}</span>`) : '', yes(i.family_acknowledged)]))}</section>`); }
  const s6 = sec.ratios; if (s6) parts.push(`<section><h2>6. ${E(s6.title)}</h2>${cites(s6)}${t(['Age group', 'Ratio', 'Most in a unit or home'], s6.tables.map(r => [E(r.label), E(r.ratio || (r.providers ? r.providers + ' provider' + (r.providers > 1 ? 's' : '') : '')), E(r.max)]))}
     <h3>Ratio checks (90 days)</h3>${t(['When', 'Room', 'Staff', 'Children', 'Result', 'Row'], s6.checks.map(r => [E(fmtT(r.checked_at)), E(r.room), E(r.staff_count), E(r.total ?? ''), r.ok ? 'In ratio' : `<span class="miss">${E((r.warnings || []).join(' ') || r.status)}</span>`, E(r.row || '')]))}</section>`);
  const s7 = sec.center; if (s7) parts.push(`<section><h2>7. ${E(s7.title)}</h2>${cites(s7)}${t(['Requirement', 'Status', 'Last on file', 'Due', 'Rule'], s7.items.map(x => [E(x.title), STATUS[x.status] || E(x.status), E(fmt(x.last_evidence_on)), E(fmt(x.due_date)), E(x.citation)]))}</section>`);
  const s8 = sec.child_records; if (s8) parts.push(`<section><h2>8. ${E(s8.title)}</h2>${cites(s8)}<p>${E(s8.note)}</p>${t(['Record', 'Rule'], s8.rules.map(r => [E(r.title), E(r.citation)]))}</section>`);
  const fac = {child_care_center:'Child care center', preschool:'Preschool', family_home:'Family child care home', group_home:'Group child care home', school_age:'School-age program', license_exempt_religious:'License-exempt religious program'};
  return `${back}<article class="dd-binder" id="ddBinder" aria-label="Inspection binder">
   <div class="dd-cover"><span class="small">Inspection binder</span><h1>${E(c.name)}</h1>
    <p>${E(c.state === 'KS' ? 'Kansas' : c.state === 'MO' ? 'Missouri' : c.state)} · ${E(fac[c.facility_type] || c.facility_type)} · License ${E(c.license_number || 'not set')}${c.license_issued_on ? ` · ${E(fmt(c.license_issued_on))} to ${E(fmt(c.license_expires_on))}` : ''}${c.capacity ? ` · capacity ${E(c.capacity)}` : ''}</p>
    <p>Records as of ${E(fmt(b.as_of))} (covering ${E(fmt(b.period_from))} to ${E(fmt(b.as_of))}). Generated ${E(fmtT(b.generated_at))}. ${E(b.counts.staff)} staff · ${E(b.counts.overdue)} overdue · ${E(b.counts.due_30)} due within 30 days · ${E(b.counts.rules_in_effect)} rules in effect.</p></div>
   <div class="dd-toc"><h2>Contents</h2><ol>${(b.sections || []).map(s => `<li><b>${E(s.title)}</b><br><span class="cites">${(s.citations || []).map(E).join(' · ')}</span></li>`).join('')}</ol></div>
   ${parts.join('')}<p class="cites">Rules come from the Kansas and Missouri regulation research (requirements.json, retrieved Oct. 4, 2026), each with its citation and effective date. Where this binder and the official text disagree, the official text controls.</p></article>`;
}

// ---------------------------------------------------------------- Safety logs (staff)
function ratioPart(c){
  const id = S.centerId;
  load('live', async () => must(await sb().rpc('compliance_ratio_live', {p_center:id})));
  const rows = S.live || [];
  const res = r => { if (!r) return '<span class="small muted">Set the classroom’s youngest age on the Get started panel.</span>';
    if (r.status === 'no_rule' || r.status === 'no_profile') return `<span class="small">${E((r.warnings || [])[0] || 'No cited table.')}</span>`;
    if (r.status === 'empty') return '<span class="small muted">No children marked here yet today.</span>';
    return `<span class="small">Needs <b>${E(r.required_staff ?? '?')}</b> staff · ${E(r.row ? (r.row.ratio || '') + ' ' + r.row.label : '')}</span><br>${cite(r.row && r.row.citation, r.row && r.row.needs_confirmation)}`; };
  const calc = S.calc;
  return `<section class="dd-sec" aria-labelledby="ddRatioH"><h3 id="ddRatioH">Ratios right now</h3>
   <p class="small">Children marked <b>Here</b> today, counted at each room’s youngest age (the strictest reading, because the Hub has no birth dates). This warns; it never blocks anything.</p>
   ${errBox('live')}${S.live === null ? wait() : rows.length ? `<div class="dd-tw"><table class="dd-table"><thead><tr><th>Room</th><th>Here</th><th>What the rule needs</th><th>Staff in the room now</th></tr></thead><tbody>${rows.map(r => `<tr>
    <td><b>${E(r.room_name)}</b></td><td>${E(r.present)}</td><td>${res(r.result)}</td>
    <td><form class="dd-acts" data-dd-form="ratio" data-room="${E(r.room)}" data-group="${E(r.age_group || '')}" data-n="${E(r.present)}" novalidate><input class="i" type="number" min="0" max="50" name="staff" aria-label="Staff in ${E(r.room_name)}" style="width:80px;padding:6px" required ${r.age_group ? '' : 'disabled'}>
    <button class="btn soft" type="submit" ${r.age_group && !S.busy ? '' : 'disabled'}>Log check</button></form></td></tr>`).join('')}</tbody></table></div>` : '<p class="small muted">No classrooms yet.</p>'}
   <details ${calc ? 'open' : ''}><summary><b>Ratio calculator</b> (any mix of ages)</summary>
   <form class="dd-form" data-dd-form="calc" novalidate>${AGES.map(([k, l]) => `<label class="f">${E(l)}<input class="i" type="number" min="0" max="500" name="${k}" value="${E(calc && calc.children ? calc.children[k] || '' : '')}"></label>`).join('')}
    <label class="f">Staff counted<input class="i" type="number" min="0" max="100" name="staff" value="${E(calc && calc.staff != null ? calc.staff : '')}"></label>
    <div class="dd-acts wide"><button class="btn navy" type="submit">Check</button></div></form>
   ${calc ? `<div class="dd-warn ${calc.status === 'over' ? 'over' : ''}" role="status" id="ddCalcOut"><b>${calc.status === 'ok' ? 'In ratio.' : calc.status === 'over' ? 'Over ratio or group size (warning only).' : calc.status === 'needs_staff_count' ? `Needs ${E(calc.required_staff)} staff.` : calc.status === 'empty' ? 'No children entered.' : 'No cited table.'}</b>
     ${calc.row ? `<br><span class="small">${E(calc.row.label)}${calc.row.ratio ? ' · ' + E(calc.row.ratio) : ''} · at most ${E(calc.max_group)} in the unit · needs ${E(calc.required_staff)} staff</span><br>${cite(calc.row.citation, calc.row.needs_confirmation)}` : ''}
     ${(calc.warnings || []).map(w => `<br><span class="small">${E(w)}</span>`).join('')}
     ${(calc.alternatives || []).length ? `<br><span class="small">If this unit is licensed as another row: ${calc.alternatives.map(a => `${E(a.label)} (${E(a.ratio || '')}, needs ${E(a.required_staff)})`).join('; ')}</span>` : ''}</div>` : ''}</details></section>`;
}
function drillPart(c){
  const id = S.centerId;
  load('drills', async () => must(await sb().from('drill_logs').select('*').eq('center_id', id).order('held_at', {ascending:false}).limit(12)));
  const pre = S.prefill || '';
  return `<section class="dd-sec" aria-labelledby="ddDrillH"><h3 id="ddDrillH">Emergency drills</h3>
   <form class="dd-form" data-dd-form="drill" id="ddDrillForm" novalidate>
    <label class="f">Drill<select class="i" name="drill_type" required>${DRILLS.map(([k, l]) => `<option value="${k}" ${pre === k ? 'selected' : ''}>${E(l)}</option>`).join('')}</select></label>
    <label class="f">Date and time<input class="i" type="datetime-local" name="held_at" value="${nowLocal()}" max="${nowLocal()}" required></label>
    <label class="f">Time to evacuate (minutes)<input class="i" type="number" name="evac_min" min="0" max="120" step="1"></label>
    <label class="f">and seconds<input class="i" type="number" name="evac_sec" min="0" max="59" step="1"></label>
    <label class="f">Children present<input class="i" type="number" name="children_count" min="0" max="1000"></label>
    <label class="f">Staff present<input class="i" type="number" name="staff_count" min="0" max="500"></label>
    <label class="dd-check"><input type="checkbox" name="alarm_activated"> Fire alarm activated</label>
    <fieldset class="wide" style="border:0;padding:0;margin:0"><legend class="small">Rooms that took part</legend><div class="dd-rooms">${roomsOf(c).map(([rid, r]) => `<label class="dd-check"><input type="checkbox" name="rooms" value="${E(rid)}" checked> ${E(r.name || rid)}</label>`).join('')}</div></fieldset>
    <label class="f wide">Problems or follow-up (optional)<textarea class="i" name="issues" maxlength="2000" rows="2"></textarea></label>
    <div class="dd-acts wide"><button class="btn navy" type="submit" ${S.busy ? 'disabled' : ''}>Save the drill</button></div></form>
   ${errBox('drills')}${S.drills === null ? '' : S.drills.length ? `<div class="dd-tw"><table class="dd-table"><thead><tr><th>When</th><th>Drill</th><th>Evacuation</th><th>Children</th><th>Issues</th></tr></thead><tbody>${S.drills.map(d => `<tr><td>${E(fmtT(d.held_at))}</td><td>${E(label(DRILLS, d.drill_type))}</td>
    <td>${d.evacuation_seconds == null ? '' : `${Math.floor(d.evacuation_seconds / 60)} min ${d.evacuation_seconds % 60} s`}</td><td>${E(d.children_count ?? '')}</td><td>${E(d.issues || '')}</td></tr>`).join('')}</tbody></table></div>` : '<p class="small muted">No drills logged yet.</p>'}</section>`;
}
function incidentPart(c){
  const id = S.centerId;
  load('incidents', async () => must(await sb().from('incident_reports').select('*').eq('center_id', id).order('occurred_at', {ascending:false}).limit(25)));
  const kids = Object.entries(c.kids || {}).filter(([, k]) => !k.sample).sort((a, b) => String(a[1].first).localeCompare(String(b[1].first)));
  const st = i => [i.parent_notified_at ? `Parent told ${E(fmtT(i.parent_notified_at))}` : '<b>Parent not told yet</b>',
    i.kind === 'critical' ? (i.state_reported_at ? `State report ${E(fmtT(i.state_reported_at))}` : '<b>State report not sent</b>') : '',
    i.kid ? (i.family_ack_at ? `Family read it ${E(fmtT(i.family_ack_at))}` : 'Waiting for the family to read it') : ''].filter(Boolean).join(' · ');
  return `<section class="dd-sec" aria-labelledby="ddIncH"><h3 id="ddIncH">Incident and injury reports</h3>
   <p class="small">Write what happened and the first aid given. Do not record a diagnosis or other health information. The family sees the report in their portal and confirms they read it.</p>
   <form class="dd-form" data-dd-form="incident" novalidate>
    <label class="f">Kind<select class="i" name="kind" data-dd-kind><option value="injury">Injury that needed first aid</option><option value="critical">Critical incident</option></select></label>
    <label class="f">Critical incident type<select class="i" name="critical_type"><option value="">Not a critical incident</option>${CRITICAL.map(([k, l]) => `<option value="${k}">${E(l)}</option>`).join('')}</select></label>
    <label class="f">Date and time<input class="i" type="datetime-local" name="occurred_at" value="${nowLocal()}" max="${nowLocal()}" required></label>
    <label class="f">Room<select class="i" name="room"><option value="">Choose</option>${roomsOf(c).map(([rid, r]) => `<option value="${E(rid)}" ${c.room === rid ? 'selected' : ''}>${E(r.name || rid)}</option>`).join('')}</select></label>
    <label class="f">Child (required for an injury)<select class="i" name="kid"><option value="">No single child</option>${kids.map(([kid, k]) => `<option value="${E(kid)}">${E(`${k.first || ''} ${k.last || ''}`.trim())}</option>`).join('')}</select></label>
    <label class="f wide">What happened<textarea class="i" name="what_happened" maxlength="2000" rows="2" required></textarea></label>
    <label class="f wide">First aid given<input class="i" name="first_aid" maxlength="1000"></label>
    <label class="f">Staff present<input class="i" name="staff_present" maxlength="300"></label>
    <label class="dd-check"><input type="checkbox" name="notified"> Parent told now</label>
    <label class="f">How<select class="i" name="notify_method">${NOTIFY.map(([k, l]) => `<option value="${k}">${E(l)}</option>`).join('')}</select></label>
    <div class="dd-acts wide"><button class="btn navy" type="submit" ${S.busy ? 'disabled' : ''}>Save the report</button></div></form>
   ${errBox('incidents')}${S.incidents === null ? '' : S.incidents.length ? `<ul class="dd-list">${S.incidents.map(i => `<li class="dd-item ${i.parent_notified_at && (i.kind !== 'critical' || i.state_reported_at) ? 'due_90' : 'overdue'}">
    <div class="dd-row"><div><b>${E(i.kind === 'critical' ? label(CRITICAL, i.critical_type) : 'Injury')}</b>${i.kid ? ` · ${E(kidName(c, i.kid))}` : ''}${i.room ? ` · ${E((c.rooms[i.room] || {}).name || i.room)}` : ''}</div><span class="dd-when">${E(fmtT(i.occurred_at))}</span></div>
    <span class="small">${E(i.what_happened)}${i.first_aid ? ` First aid: ${E(i.first_aid)}` : ''}</span><span class="small">${st(i)}</span>
    <div class="dd-acts">${i.parent_notified_at ? '' : `<button class="btn soft" type="button" data-dd="inc-step" data-id="${E(i.id)}" data-step="parent">Mark parent told</button>`}
    ${i.kind === 'critical' && !i.state_reported_at && c.role === 'director' ? `<button class="btn soft" type="button" data-dd="inc-step" data-id="${E(i.id)}" data-step="state">Mark reported to the state</button>` : ''}</div></li>`).join('')}</ul>` : '<p class="small muted">No reports.</p>'}</section>`;
}
function safetyView(c){
  const id = center(); if (!id) return '';
  const subs = [['ratio', 'Ratios'], ['drills', 'Drills'], ['incidents', 'Incidents']];
  return `<div class="dd" id="ddSafety"><div class="dd-head"><div><h2>Safety logs</h2><p class="small" style="margin:2px 0 0">Ratio checks, emergency drills and incident reports for ${E((c.center && c.center.name) || 'your center')}.</p></div>
   <div class="dd-sub" role="group" aria-label="Safety log">${subs.map(([k, l]) => `<button class="btn soft" type="button" data-dd="sub" data-sub="${k}" aria-pressed="${S.sub === k}">${l}</button>`).join('')}</div></div>
   ${noteBox()}${S.sub === 'drills' ? drillPart(c) : S.sub === 'incidents' ? incidentPart(c) : ratioPart(c)}</div>`;
}

// ---------------------------------------------------------------- Family portal: incident reports about my child
function familyPanel(){
  const c = ctx(); const kid = c.fam && c.fam.kid; const id = center();
  if (!id || !kid || c.role !== 'family') return '';
  if (S.famKid !== kid) { S.famKid = kid; S.fam[kid] = undefined; }
  if (S.fam[kid] === undefined) {
    S.fam[kid] = null;
    sb().from('incident_reports').select('id,kind,critical_type,occurred_at,what_happened,first_aid,parent_notified_at,family_ack_at,family_ack_name')
      .eq('center_id', id).eq('kid', kid).order('occurred_at', {ascending:false}).limit(10)
      .then(r => { S.fam[kid] = r.error ? [] : r.data; rerender(); });
  }
  const list = S.fam[kid];
  if (!list || !list.length) return '';
  const open = list.filter(i => !i.family_ack_at);
  return `<section class="dd-fam" id="ddFam" aria-labelledby="ddFamH"><h3 id="ddFamH" style="margin:0">Incident reports${open.length ? ` <span class="chip warn">${open.length} to read</span>` : ''}</h3>
   ${list.map(i => `<div class="dd-item ${i.family_ack_at ? 'due_90' : 'due_7'}"><div class="dd-row"><b>${E(i.kind === 'critical' ? label(CRITICAL, i.critical_type) : 'Injury')}</b><span class="dd-when">${E(fmtT(i.occurred_at))}</span></div>
    <span class="small">${E(i.what_happened)}${i.first_aid ? ` First aid: ${E(i.first_aid)}` : ''}</span>
    ${i.family_ack_at ? `<span class="small muted">You confirmed you read this on ${E(fmtT(i.family_ack_at))} (${E(i.family_ack_name)}).</span>`
      : `<form class="dd-acts" data-dd-form="ack" data-id="${E(i.id)}" novalidate><label class="f" style="min-width:220px">Type your name<input class="i" name="name" maxlength="120" required autocomplete="name"></label><button class="btn navy" type="submit" ${S.busy ? 'disabled' : ''}>I have read this</button></form>`}</div>`).join('')}
   ${noteBox()}</section>`;
}
const ANCHOR = '<div class="wrap" style="display:grid;gap:16px">';
const baseFamily = V['family-portal'];
V['family-portal'] = () => {
  const html = baseFamily(); if (!hubOn()) return html;
  const top = familyPanel(); if (!top) return html;
  const at = html.indexOf(ANCHOR);
  return at < 0 ? top + html : html.slice(0, at + ANCHOR.length) + top + html.slice(at + ANCHOR.length);
};

// The binder prints from its own window: nothing of the site around it, and no other page's print rules.
function printBinder(){
  const el = document.getElementById('ddBinder'); if (!el) return;
  const w = window.open('', '_blank');
  if (!w) { S.err.action = 'Allow pop-ups for this site to print the binder.'; return rerender(); }
  const base = location.href.split('#')[0].replace(/[^/]*$/, '');
  w.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${E('Inspection binder: ' + ((S.binder && S.binder.center && S.binder.center.name) || ''))}</title><link rel="stylesheet" href="${E(base)}director-due.css?v=2">
<style>body{margin:0;padding:16px;background:#fff;font-family:system-ui,-apple-system,Segoe UI,sans-serif}.dd-binder{border:0}</style></head><body>${el.outerHTML}</body></html>`);
  w.document.close();
  const go = () => { try { w.focus(); w.print(); } catch (_) {} };
  if (w.document.readyState === 'complete') setTimeout(go, 300); else w.addEventListener('load', go);
}

// ---------------------------------------------------------------- events
// errors of an action show at the top of whichever view is open (S.err.action); data reloads only after a success
async function act(fn, okNote, reloadKeys = []){
  if (S.busy) return; S.busy = true; S.note = ''; S.err.action = null; rerender();
  try { await fn(); S.note = okNote || ''; reloadKeys.forEach(k => { S[k] = null; }); }
  catch (e) { S.err.action = msgOf(e); }
  finally { S.busy = false; rerender(); }
}
document.addEventListener('click', e => {
  const t = e.target.closest('[data-dd]'); if (!t || !hubOn()) return;
  const a = t.dataset.dd;
  if (a === 'filter') { S.filter = t.dataset.b || ''; return rerender(); }
  if (a === 'refresh') { S.note = ''; return reload('due', 'elig', 'exc', 'access'); }
  if (a === 'exc-retry') return act(async () => must(await sb().rpc('ops_exception_act', {p_center:S.centerId, p_key:t.dataset.key, p_action:'retry'})),
    'Retry requested: it is tried again within a few minutes.', ['exc']);
  if (a === 'exc-esc') { S.escOpen = S.escOpen === t.dataset.key ? null : t.dataset.key; return rerender(); }
  if (a === 'clr-hold') { S.holdOpen = S.holdOpen === t.dataset.user ? null : t.dataset.user; S.logOpen = null; return rerender(); }
  if (a === 'clr-log') { S.logOpen = S.logOpen === t.dataset.user ? null : t.dataset.user; S.holdOpen = null; return rerender(); }
  if (a === 'clr-release') return act(async () => must(await sb().rpc('staff_clearance_release', {p_center:S.centerId, p_user:t.dataset.user})), 'Hold released.', ['access', 'exc']);
  if (a === 'open') { const i = Number(t.dataset.i); S.open = S.open === i ? null : i; return rerender(); }
  if (a === 'binder') { S.showBinder = true; S.binder = null; return rerender(); }
  if (a === 'binder-close') { S.showBinder = false; return rerender(); }
  if (a === 'print') return printBinder();
  if (a === 'sub') { S.sub = t.dataset.sub; S.note = ''; return rerender(); }
  if (a === 'drill') { S.sub = 'drills'; S.prefill = t.dataset.type; S.note = ''; const tab = document.querySelector('[data-ptab="safety"]'); if (tab) tab.click(); else rerender(); return; }
  if (a === 'inc-step') {
    const patch = t.dataset.step === 'state' ? {state_reported_at:new Date().toISOString()} : {parent_notified_at:new Date().toISOString()};
    return act(async () => must(await sb().from('incident_reports').update(patch).eq('id', t.dataset.id).select('id')), 'Saved.', ['incidents', 'due']);
  }
});
document.addEventListener('submit', e => {
  const f = e.target.closest && e.target.closest('[data-dd-form]'); if (!f || !hubOn()) return; e.preventDefault();
  const kind = f.dataset.ddForm, v = Object.fromEntries(new FormData(f).entries()), id = S.centerId;
  const num = x => (x === '' || x == null) ? null : Number(x);
  if (kind === 'record') {
    const it = S.due[Number(f.dataset.i)]; if (!it) return;
    return act(async () => { must(await sb().from('compliance_records').insert({center_id:id, user_id:it.action.user_id || null, requirement_id:it.action.requirement_id,
      completed_on:v.completed_on, expires_on:v.expires_on || null, note:(v.note || '').trim() || null})); S.open = null; }, 'Recorded.', ['due', 'elig']);
  }
  if (kind === 'exc-esc') {
    return act(async () => { must(await sb().rpc('ops_exception_act', {p_center:id, p_key:f.dataset.key, p_action:'escalate', p_note:(v.note || '').trim() || null})); S.escOpen = null; },
      'Sent to HQ.', ['exc']);
  }
  if (kind === 'hold') {
    if (!String(v.reason || '').trim()) { S.err.action = 'Say why access is on hold.'; return rerender(); }
    return act(async () => { must(await sb().rpc('staff_clearance_hold', {p_center:id, p_user:f.dataset.user, p_reason:v.reason.trim()})); S.holdOpen = null; },
      'Classroom access is on hold. Their training stays open.', ['access', 'exc']);
  }
  if (kind === 'clr-record') {
    if (!v.completed_on) { S.err.action = 'Enter the date the check cleared.'; return rerender(); }
    return act(async () => { must(await sb().from('compliance_records').insert({center_id:id, user_id:f.dataset.user, requirement_id:f.dataset.req,
      completed_on:v.completed_on, expires_on:v.expires_on || null, note:(v.note || '').trim() || null})); S.logOpen = null; }, 'Recorded.', ['access', 'exc', 'due', 'elig']);
  }
  if (kind === 'drill') {
    const secs = (v.evac_min === '' && v.evac_sec === '') ? null : (Number(v.evac_min || 0) * 60 + Number(v.evac_sec || 0));
    return act(async () => { must(await sb().from('drill_logs').insert({center_id:id, drill_type:v.drill_type, held_at:new Date(v.held_at).toISOString(), evacuation_seconds:secs,
      rooms:new FormData(f).getAll('rooms'), children_count:num(v.children_count), staff_count:num(v.staff_count), alarm_activated:v.drill_type === 'fire' ? !!v.alarm_activated : null,
      issues:(v.issues || '').trim() || null})); S.prefill = null; }, 'Drill saved.', ['drills', 'due']);
  }
  if (kind === 'incident') {
    const bad = !String(v.what_happened || '').trim() ? 'Write what happened.' : (v.kind === 'critical' && !v.critical_type) ? 'Choose the critical incident type.'
      : (v.kind === 'injury' && !v.kid) ? 'Choose the child.' : '';
    if (bad) { S.err.action = bad; S.note = ''; return rerender(); }
    return act(async () => must(await sb().from('incident_reports').insert({center_id:id, kind:v.kind, critical_type:v.kind === 'critical' ? v.critical_type : null,
      occurred_at:new Date(v.occurred_at).toISOString(), room:v.room || null, kid:v.kid || null, what_happened:v.what_happened.trim(), first_aid:(v.first_aid || '').trim() || null,
      staff_present:(v.staff_present || '').trim() || null, parent_notified_at:v.notified ? new Date().toISOString() : null, notify_method:v.notified ? v.notify_method : null})),
      'Report saved.', ['incidents', 'due']);
  }
  if (kind === 'ratio') {
    const group = f.dataset.group; if (!group) return;
    return act(async () => { const r = must(await sb().from('ratio_checks').insert({center_id:id, room:f.dataset.room, staff_count:Number(v.staff || 0), children:{[group]:Number(f.dataset.n || 0)}}).select().single());
      S.calc = r.result; }, 'Ratio check saved (a warning only; nothing is blocked).', ['live']);
  }
  if (kind === 'calc') {
    const children = {}; AGES.forEach(([k]) => { const n = num(v[k]); if (n) children[k] = n; });
    return act(async () => { S.calc = must(await sb().rpc('compliance_ratio_check', {p_center:id, p_children:children, p_staff:num(v.staff)})); }, '');
  }
  if (kind === 'ack') {
    if (!String(v.name || '').trim()) { S.err.action = 'Type your name.'; return rerender(); }
    return act(async () => { must(await sb().rpc('incident_acknowledge', {p_incident:f.dataset.id, p_name:v.name.trim()})); S.fam[S.famKid] = undefined; }, 'Thank you. The center can see that you read it.');
  }
});
window.FFDue = {
  addTabs(tabs, role){ if (!hubOn()) return; if (role === 'director') tabs.splice(1, 0, ['due', 'What’s due']); tabs.push(['safety', 'Safety logs']); },
  dueView, safetyView, _state:S,
};
})();
