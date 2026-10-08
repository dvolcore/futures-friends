/* Futures Friends Academy LMS: director screens (center compliance, staff, assignments, outside-training review) and
   the HQ network overview. Needs academy-lms.js. All permissions are enforced by the database: a director only ever
   receives their own center's rows; headquarters staff can open any center. */
(function(){
'use strict';
const F = window.FFLMS; if (!F) return;
const { L, esc, fmt, num, must, friendly, say, ROLE_LABEL, ROLES, STATUS, FACILITY, statusChip, flagChip, safeUrl, todayYmd, daysBetween } = F;
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const SYM = { complete:'✓', due_soon:'!', overdue:'×', upcoming:'·', unknown_missing_data:'?' };
const T = { center:null, data:null, loading:null, err:null, tab:'overview', calAll:false, network:null, networkLoading:null };
F.resetTeam = () => { T.center = null; T.data = null; T.network = null; };
const canManage = () => !!L.center && (L.center.role === 'director' || L.center.role === 'hq' || L.isHQ);

async function loadTeam(){
  const sb = L.sb, c = L.center.center_id;
  const [obl, sum, staff, mem, enr, ext, hrs, rec, prof, cat] = await Promise.all([
    sb.rpc('compliance_center_obligations', { p_center:c }),
    sb.rpc('compliance_center_summary', { p_center:c }),
    sb.from('training_staff').select('*').eq('center_id', c).order('full_name'),
    sb.from('memberships').select('user_id,role').eq('center_id', c).in('role', ['director', 'teacher']),
    sb.from('training_enrollments').select('*, training_courses(id,title,code,clock_hours)').eq('center_id', c).order('assigned_at', { ascending:false }),
    sb.from('training_external').select('*').eq('center_id', c).order('created_at', { ascending:false }),
    sb.from('training_hours').select('user_id,hours,completed_on,approved_states,title,source').eq('center_id', c),
    sb.from('compliance_records').select('*').eq('center_id', c).order('completed_on', { ascending:false }),
    sb.from('compliance_centers').select('*').eq('center_id', c).maybeSingle(),
    sb.from('training_courses').select('id,title,code,clock_hours,summary,track,states,audience_roles').order('code', { nullsFirst:false }),
  ]);
  const d = { obligations:must(obl, 'obligations'), summary:must(sum, 'summary'), staff:must(staff, 'staff'), members:must(mem, 'accounts'), enrollments:must(enr, 'assignments'), external:must(ext, 'outside training'), hours:must(hrs, 'hours'), records:must(rec, 'records'), profile:must(prof, 'center profile'), catalog:must(cat, 'catalog') };
  const state = d.profile && d.profile.state;
  d.requirements = state ? must(await sb.from('compliance_requirements').select('*').eq('state', state).eq('active', true).order('title'), 'requirements') : [];
  d.reqById = Object.fromEntries(d.requirements.map(r => [r.id, r]));
  d.staffById = Object.fromEntries(d.staff.map(s => [s.user_id, s]));
  T.center = c; T.data = d;
}
function ensure(){
  if (T.center !== L.center.center_id) T.data = null;
  if (!T.data && !T.loading) { T.err = null; T.loading = loadTeam().catch(e => { T.err = friendly(e); }).finally(() => { T.loading = null; F.rerender(); }); }
}
const reload = () => { T.data = null; F.rerender(); };

// ---------------------------------------------------------------- pieces
const staffName = (d, id) => (d.staffById[id] || {}).full_name || 'Staff member';
const centerLine = () => `${esc(L.center.state || 'State not set')} · ${esc(FACILITY[L.center.facility_type] || '')}`;
function scoreRing(s){
  if (!s || s.score === null || s.score === undefined) return '<div class="lms-score" style="--p:0"><b>–</b></div>';
  const c = s.score >= 80 ? 'var(--ok)' : s.score >= 60 ? 'var(--warn)' : 'var(--bad)';
  return `<div class="lms-score" style="--p:${s.score};--c:${c}" role="img" aria-label="Compliance score ${s.score} percent"><b>${s.score}%</b></div>`;
}
function itemRow(d, o){
  const [, cls] = STATUS[o.status] || ['', 'dim'];
  const who = o.scope === 'center' ? 'Center' : staffName(d, o.user_id);
  return `<li class="${cls}"><div class="lms-row sp"><b>${esc(who)}: ${esc(o.title)}</b><span class="lms-row">${statusChip(o.status)}${o.needs_confirmation ? flagChip() : ''}</span></div>
    <div class="lms-note">${o.due_date ? `Due ${esc(fmt(o.due_date))}` : esc(o.reason || '')}${o.due_date && o.status === 'overdue' ? ` (${-daysBetween(todayYmd(), o.due_date)} days ago)` : ''}</div>
    <div><button class="btn soft tiny" type="button" data-lms="t-cell" data-user="${esc(o.user_id || '')}" data-req="${esc(o.requirement_id)}">Details</button></div></li>`;
}
const urgency = o => ({ overdue:0, due_soon:1, unknown_missing_data:2, upcoming:3, complete:4 })[o.status];
const byUrgency = (a, b) => urgency(a) - urgency(b) || String(a.due_date || '9999').localeCompare(String(b.due_date || '9999'));

// ---------------------------------------------------------------- tabs
function overviewTab(d){
  const s = d.summary, today = todayYmd();
  if (!s.configured) return `<div class="lms-banner warn"><div><b>Set your state and license type first.</b><p class="lms-note">The compliance calendar needs to know which state's rules apply to your center.</p><p style="margin-top:8px"><button class="btn gold" type="button" data-lms="t-tab" data-tab="settings">Open center settings</button></p></div></div>`;
  const pend = d.external.filter(x => x.status === 'pending').length;
  const overdueCourses = d.enrollments.filter(e => e.status !== 'completed' && e.due_date && e.due_date < today);
  const open = d.enrollments.filter(e => e.status !== 'completed');
  const todo = d.obligations.filter(o => ['overdue', 'due_soon', 'unknown_missing_data'].includes(o.status)).sort(byUrgency);
  const year = today.slice(0, 4);
  const hoursBy = {}; d.hours.filter(h => String(h.completed_on).startsWith(year)).forEach(h => { const k = h.user_id; hoursBy[k] = hoursBy[k] || { total:0, appr:0 }; hoursBy[k].total += Number(h.hours); if ((h.approved_states || []).includes(s.state)) hoursBy[k].appr += Number(h.hours); });
  const hoursReq = {}; d.obligations.filter(o => o.satisfied_by === 'any_hours' && o.user_id).forEach(o => { hoursReq[o.user_id] = o; });
  return `<div class="lms-row" style="gap:22px;align-items:center">${scoreRing(s)}<div class="lms-stack"><h2>Compliance score</h2><p class="lms-note">${esc(centerLine().replace(/&middot;/g, '·'))} · as of ${esc(fmt(s.as_of))}. The score is the share of obligations that are complete or not yet due. Due soon, overdue and missing data all lower it.</p>
    <div class="lms-row"><span class="lms-chip ok">${s.complete} complete</span><span class="lms-chip dim">${s.upcoming} not yet due</span><span class="lms-chip warn">${s.due_soon} due soon</span><span class="lms-chip bad">${s.overdue} overdue</span><span class="lms-chip dim">${s.unknown_missing_data} missing data</span>${s.needs_confirmation ? `<span class="lms-chip flag">${s.needs_confirmation} need confirmation</span>` : ''}</div></div></div>
  <div class="lms-tiles"><div class="lms-tile ${pend ? 'warn' : ''}"><b>${pend}</b><span>outside certificates to verify</span></div><div class="lms-tile ${overdueCourses.length ? 'bad' : ''}"><b>${overdueCourses.length}</b><span>assigned courses overdue</span></div><div class="lms-tile"><b>${open.length}</b><span>courses in progress or assigned</span></div><div class="lms-tile"><b>${d.staff.filter(x => x.active).length}</b><span>active staff</span></div></div>
  <section class="lms-sec"><header><h2>Do this first</h2><span class="lms-note">Most urgent first</span></header>
   ${todo.length ? `<ul class="lms-list">${todo.slice(0, 10).map(o => itemRow(d, o)).join('')}</ul>${todo.length > 10 ? `<p class="lms-note">${todo.length - 10} more. <button class="lms-link" type="button" data-lms="t-tab" data-tab="matrix">See the full matrix</button></p>` : ''}` : '<div class="lms-empty">Nothing is overdue or due soon.</div>'}</section>
  <section class="lms-sec"><header><h2>Clock hours this year</h2><span class="lms-note">Hours that count toward ${esc(s.state)}: approved Futures courses and verified, state-approved outside training</span></header>
   ${d.staff.filter(x => x.active).length ? `<div class="lms-tw"><table><thead><tr><th>Staff</th><th>Role</th><th class="n">On record</th><th class="n">Counted for ${esc(s.state)}</th><th class="n">Required</th><th>Status</th></tr></thead><tbody>${d.staff.filter(x => x.active).map(p => { const h = hoursBy[p.user_id] || { total:0, appr:0 }, r = hoursReq[p.user_id]; return `<tr><td>${esc(p.full_name)}</td><td>${esc(ROLE_LABEL[p.job_role] || p.job_role)}</td><td class="n">${num(h.total, 2)}</td><td class="n">${num(h.appr, 2)}</td><td class="n">${r ? num(r.target, 1) : '–'}</td><td>${r ? statusChip(r.status) + (r.needs_confirmation ? ' ' + flagChip() : '') : '<span class="lms-note">No hours rule for this role</span>'}</td></tr>`; }).join('')}</tbody></table></div>` : '<div class="lms-empty">No staff profiles yet. Add them under People and courses.</div>'}</section>`;
}
function matrixTab(d){
  if (!d.summary.configured) return overviewTab(d);
  const staffObl = d.obligations.filter(o => o.scope === 'staff');
  const reqs = [...new Map(staffObl.map(o => [o.requirement_id, o])).values()].sort((a, b) => a.title.localeCompare(b.title));
  const people = d.staff.filter(s => s.active && staffObl.some(o => o.user_id === s.user_id));
  const cell = (uid, rid) => { const o = staffObl.find(x => x.user_id === uid && x.requirement_id === rid); if (!o) return '<span class="lms-note" aria-label="Does not apply">–</span>'; return `<button class="lms-dot ${o.status}" type="button" data-lms="t-cell" data-user="${esc(uid)}" data-req="${esc(rid)}" aria-label="${esc(staffName(d, uid))}: ${esc(o.title)}: ${esc((STATUS[o.status] || [o.status])[0])}${o.due_date ? ', due ' + esc(fmt(o.due_date)) : ''}">${SYM[o.status]}</button>`; };
  const centerObl = d.obligations.filter(o => o.scope === 'center').sort(byUrgency);
  return `<div class="lms-legend" aria-label="Legend">${Object.entries(STATUS).map(([k, [t]]) => `<span><span class="lms-dot ${k}">${SYM[k]}</span>${esc(t)}</span>`).join('')}<span>– does not apply</span></div>
   ${reqs.length && people.length ? `<div class="lms-tw"><table class="lms-matrix"><caption class="sr">Staff by requirement</caption><thead><tr><th>Staff</th>${reqs.map(r => `<th class="v" scope="col">${esc(r.title)}${r.needs_confirmation ? '<br>' + flagChip() : ''}</th>`).join('')}</tr></thead><tbody>${people.map(p => `<tr><th scope="row" style="white-space:normal">${esc(p.full_name)}<div class="lms-note">${esc(ROLE_LABEL[p.job_role] || p.job_role)}</div></th>${reqs.map(r => `<td class="c">${cell(p.user_id, r.requirement_id)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : `<div class="lms-empty">${d.requirements.length ? 'No staff profiles match the loaded requirements yet.' : `No requirements are loaded for ${esc(d.summary.state)} yet. They arrive with the regulation research and appear here automatically.`}</div>`}
   <section class="lms-sec"><header><h2>Center requirements</h2></header>${centerObl.length ? `<ul class="lms-list">${centerObl.map(o => itemRow(d, o)).join('')}</ul>` : '<div class="lms-empty">No center-level requirements are loaded.</div>'}</section>
   <p class="lms-note">Select any circle for the rule, its official source, how it is calculated and the courses that satisfy it. Items flagged "Needs confirmation" are not confirmed against the official source yet.</p>`;
}
function calendarTab(d){
  if (!d.summary.configured) return overviewTab(d);
  const today = todayYmd();
  const items = [];
  for (const o of d.obligations) if (o.due_date && (T.calAll || o.status !== 'complete')) items.push({ date:o.due_date, o, label:`${o.scope === 'center' ? 'Center' : staffName(d, o.user_id)}: ${o.title}` });
  for (const e of d.enrollments) if (e.status !== 'completed' && e.due_date) items.push({ date:e.due_date, e, label:`${staffName(d, e.user_id)}: course "${(e.training_courses || {}).title}"` });
  items.sort((a, b) => a.date.localeCompare(b.date));
  const groups = []; let key = '';
  for (const i of items) { const k = i.date.slice(0, 7); if (k !== key) { key = k; groups.push({ k, name:`${MONTHS[+i.date.slice(5, 7) - 1]} ${i.date.slice(0, 4)}`, items:[] }); } groups[groups.length - 1].items.push(i); }
  return `<div class="lms-row sp"><span class="lms-note">Everything with a due date, soonest first. Overdue items stay at the top until they are done.</span><label class="lms-check"><input type="checkbox" data-lms-toggle="calAll"${T.calAll ? ' checked' : ''}> Show completed</label></div>
   ${groups.length ? groups.map(g => `<section class="lms-sec"><header><h2>${esc(g.name)}</h2></header><ul class="lms-list">${g.items.map(i => { const dd = daysBetween(today, i.date); const cls = i.o ? (STATUS[i.o.status] || ['', 'dim'])[1] : (dd < 0 ? 'bad' : dd <= 14 ? 'warn' : 'dim'); return `<li class="${cls}"><div class="lms-row sp"><b>${esc(i.label)}</b><span class="lms-row">${i.o ? statusChip(i.o.status) : '<span class="lms-chip dim">Assigned course</span>'}${i.o && i.o.needs_confirmation ? flagChip() : ''}</span></div><div class="lms-note">${esc(fmt(i.date))}${dd < 0 ? ` · ${-dd} days ago` : dd === 0 ? ' · today' : ` · in ${dd} days`}</div>${i.o ? `<div><button class="btn soft tiny" type="button" data-lms="t-cell" data-user="${esc(i.o.user_id || '')}" data-req="${esc(i.o.requirement_id)}">Details</button></div>` : ''}</li>`; }).join('')}</ul></section>`).join('') : '<div class="lms-empty">No dated items yet.</div>'}`;
}
function peopleTab(d){
  const today = todayYmd(), year = today.slice(0, 4);
  const withProfile = new Set(d.staff.map(s => s.user_id));
  const orphans = d.members.filter(m => !withProfile.has(m.user_id));
  const open = u => d.enrollments.filter(e => e.user_id === u && e.status !== 'completed');
  const state = L.center.state;
  const courses = d.catalog.filter(c => !c.states.length || (state && c.states.includes(state)));
  return `<section class="lms-sec"><header><h2>Staff</h2><span class="lms-note">Name, role and hire date drive every deadline. Accounts are created by headquarters; you set up the profile.</span></header>
   ${d.staff.length ? `<div class="lms-tw"><table><thead><tr><th>Name</th><th>Role</th><th>Hired</th><th class="n">Courses open</th><th class="n">Overdue</th><th></th></tr></thead><tbody>${d.staff.map(s => { const o = open(s.user_id); const od = o.filter(e => e.due_date && e.due_date < today).length; return `<tr><td><b>${esc(s.full_name)}</b>${s.active ? '' : ' <span class="lms-chip dim">Inactive</span>'}</td><td>${esc(ROLE_LABEL[s.job_role] || s.job_role)}</td><td>${s.hire_date ? esc(fmt(s.hire_date)) : '<span class="lms-chip warn">Not set</span>'}</td><td class="n">${o.length}</td><td class="n">${od ? `<span class="lms-chip bad">${od}</span>` : '0'}</td><td><button class="btn soft tiny" type="button" data-lms="t-staff" data-user="${esc(s.user_id)}">Edit</button></td></tr>`; }).join('')}</tbody></table></div>` : '<div class="lms-empty">No staff profiles yet.</div>'}
   ${orphans.length ? `<div class="lms-banner warn"><div><b>${orphans.length} account${orphans.length === 1 ? ' has' : 's have'} no staff profile.</b><p class="lms-note">They cannot be assigned courses or tracked until you add a name, role and hire date.</p><ul class="lms-list" style="margin-top:8px">${orphans.map(m => `<li class="warn"><div class="lms-row sp"><span>${esc(m.role === 'director' ? 'Director' : 'Teacher')} account ending <b>${esc(m.user_id.slice(-6))}</b></span><button class="btn gold tiny" type="button" data-lms="t-staff" data-user="${esc(m.user_id)}" data-new="1">Set up profile</button></div></li>`).join('')}</ul></div></div>` : ''}</section>
  <section class="lms-sec"><header><h2>Assign a course</h2></header>
   <form class="lms-card lms-form" data-lms-form="t-assign" novalidate><div class="lms-fields"><label class="f" for="as-course">Course<select class="i" id="as-course" name="course" required><option value="">Choose a course</option>${courses.map(c => `<option value="${esc(c.id)}">${esc(c.code ? c.code + ' · ' : '')}${esc(c.title)} (${num(c.clock_hours)} h)</option>`).join('')}</select></label>
    <label class="f" for="as-due">Due date<input class="i" id="as-due" name="due" type="date"></label></div>
    <fieldset style="border:0;padding:0;margin:0"><legend class="lms-note">Assign to</legend><div class="lms-row">${d.staff.filter(s => s.active).map(s => `<label class="lms-check"><input type="checkbox" name="who" value="${esc(s.user_id)}"> ${esc(s.full_name)}</label>`).join('') || '<span class="lms-note">No active staff.</span>'}</div></fieldset>
    <div class="lms-row"><button class="btn gold" type="submit">Assign</button><span class="lms-note" role="status" data-lms-msg></span></div></form></section>
  <section class="lms-sec"><header><h2>Assignments and progress</h2></header>
   ${d.enrollments.length ? `<div class="lms-tw"><table><thead><tr><th>Staff</th><th>Course</th><th>Status</th><th>Due</th><th></th></tr></thead><tbody>${d.enrollments.slice(0, 80).map(e => `<tr><td>${esc(staffName(d, e.user_id))}</td><td>${esc((e.training_courses || {}).title || '')}</td><td>${e.status === 'completed' ? '<span class="lms-chip ok">Completed</span>' : e.status === 'in_progress' ? '<span class="lms-chip warn">In progress</span>' : '<span class="lms-chip dim">Not started</span>'}</td><td>${e.due_date ? esc(fmt(e.due_date)) + (e.status !== 'completed' && e.due_date < today ? ' <span class="lms-chip bad">Overdue</span>' : '') : '–'}</td><td>${e.status === 'in_progress' ? `<button class="btn soft tiny" type="button" data-lms="t-reset" data-id="${esc(e.id)}">Reset knowledge check</button>` : ''}</td></tr>`).join('')}</tbody></table></div>${d.enrollments.length > 80 ? '<p class="lms-note">Showing the 80 most recent.</p>' : ''}` : '<div class="lms-empty">Nothing assigned yet.</div>'}</section>`;
}
function reviewTab(d){
  const pend = d.external.filter(x => x.status === 'pending'), done = d.external.filter(x => x.status !== 'pending');
  const row = x => `<tr><td><b>${esc(x.title)}</b>${x.provider ? `<div class="lms-note">${esc(x.provider)}</div>` : ''}</td><td>${esc(staffName(d, x.user_id))}</td><td>${esc(fmt(x.completed_on))}${x.expires_on ? `<div class="lms-note">expires ${esc(fmt(x.expires_on))}</div>` : ''}</td><td class="n">${num(x.hours, 2)}</td><td>${x.status === 'pending' ? '<span class="lms-chip warn">Waiting</span>' : x.status === 'verified' ? `<span class="lms-chip ok">Verified</span>${x.state_approved ? '<div class="lms-note">state hours</div>' : ''}${x.self_verified ? '<div class="lms-note">self-verified</div>' : ''}` : '<span class="lms-chip bad">Not accepted</span>'}</td><td><button class="btn ${x.status === 'pending' ? 'gold' : 'soft'} tiny" type="button" data-lms="t-ext" data-id="${esc(x.id)}">${x.status === 'pending' ? 'Review' : 'View'}</button></td></tr>`;
  return `<section class="lms-sec"><header><h2>Waiting for your review</h2><span class="lms-note">Open the certificate file, check it, then approve or reject. Approved hours go on the person's ledger.</span></header>${pend.length ? `<div class="lms-tw"><table><thead><tr><th>Training</th><th>Staff</th><th>Date</th><th class="n">Hours</th><th>Status</th><th></th></tr></thead><tbody>${pend.map(row).join('')}</tbody></table></div>` : '<div class="lms-empty">Nothing waiting.</div>'}</section>
   ${done.length ? `<section class="lms-sec"><header><h2>Reviewed</h2></header><div class="lms-tw"><table><thead><tr><th>Training</th><th>Staff</th><th>Date</th><th class="n">Hours</th><th>Status</th><th></th></tr></thead><tbody>${done.slice(0, 60).map(row).join('')}</tbody></table></div></section>` : ''}`;
}
function settingsTab(d){
  const p = d.profile || {};
  const evid = d.requirements.filter(r => r.scope !== 'info');
  const st = p.state || '';
  const facs = Object.entries(FACILITY).filter(([k]) => !(st === 'KS' && k === 'license_exempt_religious'));
  return `<section class="lms-sec"><header><h2>Center compliance profile</h2><span class="lms-note">Your state and facility type decide which rules apply to you.</span></header>
   <form class="lms-card lms-form" data-lms-form="t-profile" novalidate><div class="lms-fields">
    <label class="f" for="pf-state">State<select class="i" id="pf-state" name="state" required data-lms-change="profile-state"><option value="">Choose</option><option value="KS"${p.state === 'KS' ? ' selected' : ''}>Kansas</option><option value="MO"${p.state === 'MO' ? ' selected' : ''}>Missouri</option>${p.state && !['KS', 'MO'].includes(p.state) ? `<option value="${esc(p.state)}" selected>${esc(p.state)}</option>` : ''}</select></label>
    <label class="f" for="pf-fac">Facility type<select class="i" id="pf-fac" name="facility_type" required>${facs.map(([k, v]) => `<option value="${k}"${p.facility_type === k ? ' selected' : ''}>${esc(v)}</option>`).join('')}</select></label>
    <label class="f" for="pf-num">License number<input class="i" id="pf-num" name="license_number" value="${esc(p.license_number || '')}" maxlength="60"></label>
    <label class="f" for="pf-iss">Licensure year starts (license effective date)<input class="i" id="pf-iss" name="license_issued_on" type="date" value="${esc(p.license_issued_on || '')}"></label>
    <label class="f" for="pf-exp">Licensure year ends (license expires / renewal date)<input class="i" id="pf-exp" name="license_expires_on" type="date" value="${esc(p.license_expires_on || '')}"></label>
    <label class="f" for="pf-cap">Licensed capacity<input class="i" id="pf-cap" name="capacity" type="number" min="0" max="999" value="${esc(p.capacity ?? '')}"></label>
    <label class="f" for="pf-trk">Records tracked since<input class="i" id="pf-trk" name="tracking_since" type="date" value="${esc(p.tracking_since || '')}"></label></div>
    <div class="lms-row"><label class="lms-check"><input type="checkbox" name="subsidy_contract"${p.subsidy_contract ? ' checked' : ''}> We hold a child care subsidy contract (turns on subsidy-provider requirements)</label></div>
    <p class="lms-note">Kansas counts training hours per licensure year, from the license effective date to its expiration. Update both dates when the license renews. Anything that fell due before "records tracked since" and has no record on file shows as missing data instead of overdue: enter when it was done and it clears. ${st === 'KS' ? 'Kansas has no religious exemption from licensing.' : ''}</p>
    <div class="lms-row"><button class="btn gold" type="submit">Save</button><span class="lms-note" role="status" data-lms-msg></span></div></form></section>
  <section class="lms-sec"><header><h2>Record evidence</h2><span class="lms-note">For things that are not a Futures course: background checks, a CPR card, a fire drill, a license renewal.</span></header>
   ${evid.length ? `<form class="lms-card lms-form" data-lms-form="t-record" novalidate><div class="lms-fields">
    <label class="f" for="rc-req">Requirement<select class="i" id="rc-req" name="req" required><option value="">Choose</option>${evid.map(r => `<option value="${esc(r.id)}">${esc(r.title)}${r.scope === 'center' ? ' (center)' : ''}</option>`).join('')}</select></label>
    <label class="f" for="rc-who">For<select class="i" id="rc-who" name="who"><option value="">The center</option>${d.staff.filter(s => s.active).map(s => `<option value="${esc(s.user_id)}">${esc(s.full_name)}</option>`).join('')}</select></label>
    <label class="f" for="rc-date">Date done<input class="i" id="rc-date" name="completed_on" type="date" required></label>
    <label class="f" for="rc-exp">Expires (if it does)<input class="i" id="rc-exp" name="expires_on" type="date"></label>
    <label class="f" for="rc-hrs">Hours (if any)<input class="i" id="rc-hrs" name="hours" type="number" min="0" max="200" step="0.25"></label>
    <label class="f" for="rc-note">Note<input class="i" id="rc-note" name="note" maxlength="300"></label></div>
    <div class="lms-row"><button class="btn gold" type="submit">Save record</button><span class="lms-note" role="status" data-lms-msg></span></div></form>` : `<div class="lms-empty">${d.profile ? 'No requirements are loaded for your state yet.' : 'Save your state above first.'}</div>`}
   ${d.records.length ? `<div class="lms-tw"><table><thead><tr><th>Requirement</th><th>For</th><th>Date</th><th>Expires</th><th></th></tr></thead><tbody>${d.records.slice(0, 80).map(r => `<tr><td>${esc((d.reqById[r.requirement_id] || {}).title || r.requirement_id)}${r.note ? `<div class="lms-note">${esc(r.note)}</div>` : ''}</td><td>${r.user_id ? esc(staffName(d, r.user_id)) : 'Center'}</td><td>${esc(fmt(r.completed_on))}</td><td>${r.expires_on ? esc(fmt(r.expires_on)) : '–'}</td><td>${r.external_id ? '<span class="lms-note">from outside training</span>' : `<button class="btn danger tiny" type="button" data-lms="t-del-record" data-id="${esc(r.id)}">Delete</button>`}</td></tr>`).join('')}</tbody></table></div>` : ''}</section>`;
}
function networkTab(){
  if (!T.network && !T.networkLoading) T.networkLoading = Promise.resolve(L.sb.rpc('compliance_network_overview')).then(r => { T.network = must(r, 'network'); }).catch(e => { T.network = []; say(friendly(e)); }).finally(() => { T.networkLoading = null; F.rerender(); });
  if (!T.network) return '<div class="lms-card" role="status"><div class="lms-skel"></div></div>';
  const rows = T.network;
  return `<section class="lms-sec"><header><h2>All centers</h2><span class="lms-note">Headquarters view. Select a center to open its dashboard.</span></header>${rows.length ? `<div class="lms-tw"><table><thead><tr><th>Center</th><th>State</th><th class="n">Score</th><th class="n">Overdue</th><th class="n">Due soon</th><th class="n">Missing data</th><th class="n">To verify</th><th></th></tr></thead><tbody>${rows.map(r => { const s = r.summary || {}; return `<tr><td><b>${esc(r.name)}</b></td><td>${esc(r.state)} · ${esc(FACILITY[r.facility_type] || '')}</td><td class="n">${s.score === null || s.score === undefined ? '–' : s.score + '%'}</td><td class="n">${s.overdue || 0}</td><td class="n">${s.due_soon || 0}</td><td class="n">${s.unknown_missing_data || 0}</td><td class="n">${s.pending_external || 0}</td><td><button class="btn soft tiny" type="button" data-lms="t-open-center" data-id="${esc(r.center_id)}">Open</button></td></tr>`; }).join('')}</tbody></table></div>` : '<div class="lms-empty">No centers have a compliance profile yet.</div>'}</section>`;
}

V['learn-team'] = () => {
  const g = F.gate('learn-team', 'Center compliance', { manage:true }); if (g) return g;
  ensure();
  const tabs = [['overview', 'Overview'], ['matrix', 'Staff matrix'], ['calendar', 'Calendar'], ['people', 'People and courses'], ['review', 'Review outside training'], ['settings', 'Center settings']];
  const extra = F.teamTabs || {};
  Object.keys(extra).forEach(k => tabs.push([k, extra[k].label()]));
  if (L.isHQ) tabs.push(['network', 'All centers']);
  const sub = `${esc(L.center.name)} · ${centerLine()}. Who is current, who is due, and what is coming.`;
  const bar = `<div class="lms-subtabs" role="group" aria-label="Sections">${tabs.map(([k, n]) => `<button type="button" data-lms="t-tab" data-tab="${k}" aria-pressed="${T.tab === k}">${esc(n)}${k === 'review' && T.data ? (T.data.external.filter(x => x.status === 'pending').length ? ` (${T.data.external.filter(x => x.status === 'pending').length})` : '') : ''}</button>`).join('')}</div>`;
  if (T.err) return F.shell('learn-team', 'Center compliance', sub, `<div class="lms-banner bad"><div>${esc(T.err)}</div></div>`);
  if (T.tab === 'network' && L.isHQ) return F.shell('learn-team', 'Center compliance', sub, bar + networkTab());
  if (extra[T.tab] && extra[T.tab].standalone) return F.shell('learn-team', 'Center compliance', sub, bar + extra[T.tab].render(T.data));
  if (!T.data) return F.shell('learn-team', 'Center compliance', sub, bar + '<div class="lms-card" role="status"><div class="lms-skel"></div><div class="lms-skel" style="width:70%"></div></div>');
  const d = T.data;
  const body = (({ overview:overviewTab, matrix:matrixTab, calendar:calendarTab, people:peopleTab, review:reviewTab, settings:settingsTab })[T.tab] || (extra[T.tab] && extra[T.tab].render) || overviewTab)(d);
  return F.shell('learn-team', 'Center compliance', sub, bar + body);
};

// ---------------------------------------------------------------- actions
F.on('t-tab', el => { T.tab = el.dataset.tab; F.rerender(); });
F.on('t-open-center', el => { T.tab = 'overview'; const c = L.centers.find(x => x.center_id === el.dataset.id); if (c) { L.center = c; try { sessionStorage.setItem('ff-lms-center', c.center_id); } catch(_) {} L.dash = null; T.data = null; F.rerender(); } });
document.addEventListener('change', e => { const ps = e.target.closest && e.target.closest('[data-lms-change="profile-state"]'); if (ps) { const fac = document.getElementById('pf-fac'); const opt = fac && fac.querySelector('option[value="license_exempt_religious"]'); if (ps.value === 'KS' && opt) { if (fac.value === 'license_exempt_religious') fac.value = 'child_care_center'; opt.remove(); } else if (ps.value !== 'KS' && fac && !opt) { const o = document.createElement('option'); o.value = 'license_exempt_religious'; o.textContent = FACILITY.license_exempt_religious; fac.appendChild(o); } } const t = e.target.closest && e.target.closest('[data-lms-toggle]'); if (t && t.dataset.lmsToggle === 'calAll') { T.calAll = t.checked; F.rerender(); } });

function cellDialog(userId, reqId){
  const d = T.data;
  const o = d.obligations.find(x => x.requirement_id === reqId && (x.user_id || '') === (userId || ''));
  const r = d.reqById[reqId] || {};
  if (!o) return;
  const who = o.scope === 'center' ? 'The center' : staffName(d, o.user_id);
  const pub = (o.courses || []).filter(c => c.enrollment !== 'enrolled');
  const canRecord = o.satisfied_by !== 'any_hours';
  F.openDlg(`<h3 id="lmsDlgTitle">${esc(o.title)}</h3><div class="lms-row">${statusChip(o.status)}${o.needs_confirmation ? flagChip() : ''}<span class="lms-chip dim">${esc(who)}</span></div>
   ${o.needs_confirmation ? '<div class="lms-banner warn"><div>This rule has not been confirmed against the official source yet. Use it for planning, and confirm it with the licensing agency before relying on it.</div></div>' : ''}
   <p>${esc(r.requirement || '')}</p>
   <dl style="display:grid;grid-template-columns:auto 1fr;gap:4px 14px;margin:0;font-size:14px"><dt class="lms-note">Schedule</dt><dd style="margin:0">${esc(o.recurrence)}</dd>
    <dt class="lms-note">Due</dt><dd style="margin:0">${o.due_date ? esc(fmt(o.due_date)) : 'No date can be calculated'}</dd>
    ${o.period_start ? `<dt class="lms-note">Period</dt><dd style="margin:0">${esc(fmt(o.period_start))} to ${esc(fmt(o.period_end))}</dd>` : ''}
    <dt class="lms-note">Counted so far</dt><dd style="margin:0">${num(o.progress, 2)} of ${num(o.target, 2)} ${esc(o.unit)}${o.prorated ? ' (prorated: one clock hour per month employed this year)' : ''}${o.last_evidence_on ? `, last on ${esc(fmt(o.last_evidence_on))}` : ''}</dd>
    ${o.quantity_other && !o.prorated ? `<dt class="lms-note">Content rule</dt><dd style="margin:0">${esc(o.quantity_other)} <span class="lms-note">(not checked automatically)</span></dd>` : ''}
    ${o.reason ? `<dt class="lms-note">Missing</dt><dd style="margin:0">${esc(o.reason)}</dd>` : ''}
    ${o.deadline_rule ? `<dt class="lms-note">Deadline rule</dt><dd style="margin:0">${esc(o.deadline_rule)}</dd>` : ''}
    <dt class="lms-note">Source</dt><dd style="margin:0">${o.source_citation ? (safeUrl(o.source_url) ? `<a class="lms-link" href="${esc(safeUrl(o.source_url))}" target="_blank" rel="noopener">${esc(o.source_citation)}</a>` : esc(o.source_citation)) : 'None on file'}${r.source_retrieved ? `<div class="lms-note">Retrieved ${esc(fmt(r.source_retrieved))}</div>` : ''}</dd>
    <dt class="lms-note">Confidence</dt><dd style="margin:0">${esc(o.confidence)}</dd>
    ${r.source_excerpt ? `<dt class="lms-note">Excerpt</dt><dd style="margin:0"><q>${esc(r.source_excerpt)}</q></dd>` : ''}${r.notes ? `<dt class="lms-note">Notes</dt><dd style="margin:0">${esc(r.notes)}</dd>` : ''}</dl>
   ${pub.length && o.user_id ? `<div><b>Courses that count</b><ul class="lms-list" style="margin-top:6px">${pub.map(c => `<li class="dim"><div class="lms-row sp"><span>${esc(c.title)} <span class="lms-note">${num(c.clock_hours)} h${c.enrollment === 'completed' ? ' · completed' : ''}</span></span>${c.enrollment === 'completed' ? '' : `<button class="btn gold tiny" type="button" data-lms="t-assign-one" data-course="${esc(c.id)}" data-user="${esc(o.user_id)}">Assign to ${esc(who.split(' ')[0])}</button>`}</div></li>`).join('')}</ul></div>` : (o.satisfied_by === 'any_hours' ? '<p class="lms-note">Any approved training counts toward this. Assign a course or verify outside training.</p>' : '')}
   ${canRecord ? `<form class="lms-form" data-lms-form="t-record-quick" novalidate><b>Record that it was done</b><input type="hidden" name="req" value="${esc(reqId)}"><input type="hidden" name="who" value="${esc(userId || '')}"><div class="lms-fields"><label class="f" for="q-date">Date done<input class="i" id="q-date" name="completed_on" type="date" required></label><label class="f" for="q-exp">Expires (if it does)<input class="i" id="q-exp" name="expires_on" type="date"></label><label class="f" for="q-hrs">Hours<input class="i" id="q-hrs" name="hours" type="number" min="0" max="200" step="0.25"></label></div><div class="lms-row"><button class="btn gold" type="submit">Save record</button><span class="lms-note" role="status" data-lms-msg></span></div></form>` : ''}
   <div class="lms-row"><button class="btn soft" type="button" data-lms="t-close">Close</button></div>`);
}
F.on('t-cell', el => cellDialog(el.dataset.user, el.dataset.req));
F.on('t-close', () => F.closeDlg());
F.on('t-assign-one', async el => {
  F.busy(el, true);
  try { must(await L.sb.rpc('training_assign_course', { p_course:el.dataset.course, p_user:el.dataset.user, p_center:L.center.center_id, p_due:null }), 'assign'); say('Assigned.'); F.closeDlg(); reload(); }
  catch(e) { say(friendly(e)); F.busy(el, false); }
});
F.onForm('t-assign', async form => {
  const f = form.elements, msg = form.querySelector('[data-lms-msg]');
  const who = [...form.querySelectorAll('input[name=who]:checked')].map(x => x.value);
  if (!f.course.value || !who.length) { msg.textContent = 'Choose a course and at least one person.'; msg.style.color = 'var(--bad)'; return; }
  const btn = form.querySelector('button[type=submit]'); F.busy(btn, true);
  let ok = 0, fail = [];
  for (const u of who) { const r = await L.sb.rpc('training_assign_course', { p_course:f.course.value, p_user:u, p_center:L.center.center_id, p_due:f.due.value || null }); if (r.error) fail.push(`${(T.data.staffById[u] || {}).full_name || 'someone'}: ${friendly(r.error)}`); else ok++; }
  say(fail.length ? `Assigned to ${ok}. ${fail.join(' ')}` : `Assigned to ${ok} ${ok === 1 ? 'person' : 'people'}.`);
  reload();
});
F.on('t-reset', async el => {
  if (!confirm('Reset the failed attempts so this person can take the knowledge check again?')) return;
  try { must(await L.sb.rpc('training_reset_attempts', { p_enrollment:el.dataset.id }), 'reset'); say('Knowledge check reset.'); reload(); } catch(e) { say(friendly(e)); }
});

function staffDialog(userId, isNew){
  const d = T.data, s = d.staffById[userId] || {};
  F.openDlg(`<h3 id="lmsDlgTitle">${isNew ? 'Set up staff profile' : 'Edit ' + esc(s.full_name)}</h3>
   <form class="lms-form" data-lms-form="t-staff-save" novalidate><input type="hidden" name="user" value="${esc(userId)}"><input type="hidden" name="isNew" value="${isNew ? '1' : ''}">
   <div class="lms-fields"><label class="f" for="sf-name">Full name (printed on certificates)<input class="i" id="sf-name" name="full_name" required maxlength="120" value="${esc(s.full_name || '')}"></label>
   <label class="f" for="sf-role">Role<select class="i" id="sf-role" name="job_role">${ROLES.map(r => `<option value="${r}"${(s.job_role || 'teacher') === r ? ' selected' : ''}>${esc(ROLE_LABEL[r])}</option>`).join('')}</select></label>
   <label class="f" for="sf-hire">Hire date<input class="i" id="sf-hire" name="hire_date" type="date" value="${esc(s.hire_date || '')}"></label></div>
   <label class="lms-check"><input type="checkbox" name="active"${s.active === false ? '' : ' checked'}> Active (counted in deadlines and reminders)</label>
   <p class="lms-note">New hires are assigned the Level 1 courses automatically when their profile is created.</p>
   <div class="lms-row"><button class="btn gold" type="submit">Save</button><button class="btn soft" type="button" data-lms="t-close">Cancel</button><span class="lms-note" role="status" data-lms-msg></span></div></form>`);
}
F.on('t-staff', el => staffDialog(el.dataset.user, !!el.dataset.new));
F.onForm('t-staff-save', async form => {
  const f = form.elements, msg = form.querySelector('[data-lms-msg]');
  if (!f.full_name.value.trim()) { msg.textContent = 'Enter a name.'; msg.style.color = 'var(--bad)'; return; }
  const row = { user_id:f.user.value, center_id:L.center.center_id, full_name:f.full_name.value.trim(), job_role:f.job_role.value, hire_date:f.hire_date.value || null, active:f.active.checked };
  const btn = form.querySelector('button[type=submit]'); F.busy(btn, true);
  const r = f.isNew.value ? await L.sb.from('training_staff').insert(row) : await L.sb.from('training_staff').update({ full_name:row.full_name, job_role:row.job_role, hire_date:row.hire_date, active:row.active }).eq('user_id', row.user_id).eq('center_id', row.center_id);
  if (r.error) { msg.textContent = friendly(r.error); msg.style.color = 'var(--bad)'; F.busy(btn, false); return; }
  F.closeDlg(); say('Saved.'); reload();
});
F.onForm('t-profile', async form => {
  const f = form.elements, msg = form.querySelector('[data-lms-msg]');
  const row = { center_id:L.center.center_id, state:f.state.value, facility_type:f.facility_type.value, license_number:f.license_number.value.trim() || null, license_issued_on:f.license_issued_on.value || null, license_expires_on:f.license_expires_on.value || null, capacity:f.capacity.value === '' ? null : Number(f.capacity.value), tracking_since:f.tracking_since.value || (T.data && T.data.profile ? null : todayYmd()), serves_infants:false, subsidy_contract:f.subsidy_contract.checked };
  if (!row.state) { msg.textContent = 'Choose a state.'; msg.style.color = 'var(--bad)'; return; }
  const btn = form.querySelector('button[type=submit]'); F.busy(btn, true);
  const r = await L.sb.from('compliance_centers').upsert(row, { onConflict:'center_id' });
  if (r.error) { msg.textContent = friendly(r.error); msg.style.color = 'var(--bad)'; F.busy(btn, false); return; }
  L.center.state = row.state; L.center.facility_type = row.facility_type; say('Saved.'); reload();
});
async function saveRecord(f, msg, btn){
  const row = { center_id:L.center.center_id, user_id:f.who.value || null, requirement_id:f.req.value, completed_on:f.completed_on.value, expires_on:f.expires_on.value || null, hours:f.hours && f.hours.value !== '' ? Number(f.hours.value) : null, note:f.note ? (f.note.value.trim() || null) : null };
  if (!row.requirement_id || !row.completed_on) { msg.textContent = 'Choose the requirement and the date.'; msg.style.color = 'var(--bad)'; return false; }
  F.busy(btn, true);
  const r = await L.sb.from('compliance_records').insert(row);
  if (r.error) { msg.textContent = friendly(r.error); msg.style.color = 'var(--bad)'; F.busy(btn, false); return false; }
  say('Record saved.'); return true;
}
F.onForm('t-record', async form => { if (await saveRecord(form.elements, form.querySelector('[data-lms-msg]'), form.querySelector('button[type=submit]'))) reload(); });
F.onForm('t-record-quick', async form => { if (await saveRecord(form.elements, form.querySelector('[data-lms-msg]'), form.querySelector('button[type=submit]'))) { F.closeDlg(); reload(); } });
F.on('t-del-record', async el => {
  if (!confirm('Delete this record?')) return;
  try { must(await L.sb.from('compliance_records').delete().eq('id', el.dataset.id), 'delete'); say('Deleted.'); reload(); } catch(e) { say(friendly(e)); }
});

function extDialog(id){
  const d = T.data, x = d.external.find(e => e.id === id); if (!x) return;
  const who = staffName(d, x.user_id);
  const reqs = d.obligations.filter(o => o.user_id === x.user_id && o.satisfied_by !== 'any_hours' && o.scope === 'staff');
  const pending = x.status === 'pending';
  F.openDlg(`<h3 id="lmsDlgTitle">${esc(x.title)}</h3><div class="lms-row"><span class="lms-chip dim">${esc(who)}</span>${x.status === 'verified' ? '<span class="lms-chip ok">Verified</span>' : x.status === 'rejected' ? '<span class="lms-chip bad">Not accepted</span>' : '<span class="lms-chip warn">Waiting</span>'}</div>
   <dl style="display:grid;grid-template-columns:auto 1fr;gap:4px 14px;margin:0;font-size:14px"><dt class="lms-note">Provider</dt><dd style="margin:0">${esc(x.provider || '–')}</dd><dt class="lms-note">Completed</dt><dd style="margin:0">${esc(fmt(x.completed_on))}</dd><dt class="lms-note">Hours</dt><dd style="margin:0">${num(x.hours, 2)}</dd><dt class="lms-note">Expires</dt><dd style="margin:0">${x.expires_on ? esc(fmt(x.expires_on)) : '–'}</dd><dt class="lms-note">Kind</dt><dd style="margin:0">${esc(x.category || '–')}</dd>${x.review_note ? `<dt class="lms-note">Note</dt><dd style="margin:0">${esc(x.review_note)}</dd>` : ''}</dl>
   <div><button class="btn soft" type="button" data-lms="t-open-file" data-path="${esc(x.file_path)}">Open the certificate file</button></div>
   ${pending ? `<form class="lms-form" data-lms-form="t-ext-review" novalidate><input type="hidden" name="id" value="${esc(x.id)}">
    ${x.user_id === L.uid ? '<div class="lms-banner warn"><div>This is your own certificate. You can verify it, and it will be marked as self-verified.</div></div>' : ''}
    <label class="lms-check"><input type="checkbox" name="state_approved"> This counts toward ${esc(L.center.state || 'the state')} clock-hour requirements (the training is state-approved)</label>
    ${reqs.length ? `<fieldset style="border:0;padding:0;margin:0"><legend class="lms-note">It also satisfies</legend>${reqs.map(r => `<label class="lms-check"><input type="checkbox" name="req" value="${esc(r.requirement_id)}"> ${esc(r.title)}</label>`).join('')}</fieldset>` : ''}
    <label class="f" for="rv-note">Note (shown to the staff member)<input class="i" id="rv-note" name="note" maxlength="300"></label>
    <div class="lms-row"><button class="btn gold" type="submit" name="decision" value="approve">Approve and add the hours</button><button class="btn danger" type="submit" name="decision" value="reject">Reject</button><button class="btn soft" type="button" data-lms="t-close">Cancel</button><span class="lms-note" role="status" data-lms-msg></span></div></form>` : '<div class="lms-row"><button class="btn soft" type="button" data-lms="t-close">Close</button></div>'}`);
}
F.on('t-ext', el => extDialog(el.dataset.id));
F.on('t-open-file', async el => { try { window.open(await F.signedUrl(el.dataset.path, 600), '_blank', 'noopener'); } catch(e) { say('Could not open that file.'); } });
F.onForm('t-ext-review', async (form, e) => {
  const f = form.elements, msg = form.querySelector('[data-lms-msg]');
  const approve = (e.submitter && e.submitter.value) !== 'reject';
  const reqs = [...form.querySelectorAll('input[name=req]:checked')].map(x => x.value);
  const btn = e.submitter; F.busy(btn, true);
  const r = await L.sb.rpc('training_verify_external', { p_id:f.id.value, p_approve:approve, p_state_approved:approve && f.state_approved.checked, p_requirement_ids:approve ? reqs : [], p_note:f.note.value.trim() || null });
  if (r.error) { msg.textContent = friendly(r.error); msg.style.color = 'var(--bad)'; F.busy(btn, false); return; }
  F.closeDlg(); say(approve ? 'Verified. The hours are on the ledger.' : 'Rejected.'); reload();
});
})();
