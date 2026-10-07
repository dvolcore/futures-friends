/* Futures Friends Academy LMS: director tools added for self-paced credit. Three tabs on the center compliance screen:
   Observations (the checklist a director completes after a course: pass or needs practice, with notes), Reflections (the
   review queue for what learners typed in reflection activities) and Attendance (active time, touchpoints and attempts per
   learner, the 30-day reporting date, the audit log, and the roster CSV for a manual MOPD upload). A director sees only their
   own center; headquarters can open any center. The database enforces that, whatever this file draws. Needs
   academy-lms.js and academy-lms-team.js. */
(function(){
'use strict';
const F = window.FFLMS; if (!F) return;
const { L, esc, fmt, num, must, friendly, say, todayYmd, daysBetween } = F;
const fresh = () => ({ center:null, obs:null, refl:null, report:null, courses:null, loading:{}, err:{}, filter:{ course:'', from:'', to:'' }, reflStatus:'pending', mark:false });
let D = fresh();
const prevReset = F.resetTeam; F.resetTeam = () => { if (prevReset) prevReset(); D = fresh(); };
const ensureCenter = () => { if (D.center !== L.center.center_id) { D = fresh(); D.center = L.center.center_id; } };
const rpc = (name, args) => L.sb.rpc(name, args).then(r => must(r, name));
function load(key, fn){
  if (D[key] || D.loading[key]) return;
  D.loading[key] = fn().then(v => { D[key] = v; D.err[key] = null; }).catch(e => { D.err[key] = friendly(e); D[key] = []; }).finally(() => { D.loading[key] = null; F.rerender(); });
}
const wait = () => '<div class="lms-card" role="status"><div class="lms-skel"></div><div class="lms-skel" style="width:70%"></div></div>';
const errBox = k => D.err[k] ? `<div class="lms-banner bad"><div>${esc(D.err[k])}</div></div>` : '';
const STATUS_CHIP = { pending:['Waiting', 'warn'], needs_practice:['Needs practice', 'bad'], passed:['Passed', 'ok'], not_required:['Not required', 'dim'] };

// ---------------------------------------------------------------- observations
function obsTab(){
  ensureCenter();
  load('obs', () => rpc('training_observation_queue', { p_center:D.center }));
  if (!D.obs) return wait();
  const pending = D.obs.filter(o => o.status !== 'passed');
  const row = o => { const [t, c] = STATUS_CHIP[o.status] || [o.status, 'dim']; return `<tr><td><b>${esc(o.learner_name)}</b></td><td>${esc(o.course_title)}<div class="lms-note">v${esc(o.course_version)} · completed ${esc(fmt(o.completed_on))}</div></td><td><span class="lms-chip ${c}">${esc(t)}</span>${o.last_observed_on ? `<div class="lms-note">${esc(fmt(o.last_observed_on))}</div>` : ''}</td><td>${o.last_notes ? esc(o.last_notes) : ''}</td><td><button class="btn ${o.status === 'passed' ? 'soft' : 'gold'} tiny" type="button" data-lms="d-obs" data-id="${esc(o.enrollment_id)}">${o.status === 'passed' ? 'Record again' : 'Observe'}</button></td></tr>`; };
  return `${errBox('obs')}<section class="lms-sec"><header><h2>Observations</h2><span class="lms-note">After a course that asks for it, watch the person do the skill in their room, mark each checklist item, and record Pass or Needs practice. Where the course requires it, state credit waits for a passed observation.</span></header>
   ${D.obs.length ? `<div class="lms-tw"><table><caption class="sr">Observations by staff member and course</caption><thead><tr><th>Staff</th><th>Course</th><th>Status</th><th>Notes</th><th></th></tr></thead><tbody>${[...pending, ...D.obs.filter(o => o.status === 'passed')].map(row).join('')}</tbody></table></div>` : '<div class="lms-empty">Nothing to observe yet. A course appears here after someone completes it, if it has an observation checklist.</div>'}</section>`;
}
F.on('d-obs', el => {
  const o = (D.obs || []).find(x => x.enrollment_id === el.dataset.id); if (!o) return;
  F.openDlg(`<h3 id="lmsDlgTitle">Observe ${esc(o.learner_name)}</h3><p class="lms-note">${esc(o.course_title)} · mark what you saw.</p>
   <form class="lms-form" data-lms-form="d-obs-save" novalidate><input type="hidden" name="id" value="${esc(o.enrollment_id)}">
   ${o.checklist.length ? `<fieldset style="border:0;padding:0;margin:0"><legend class="lms-note">Checklist</legend><ul class="lms-checklist">${o.checklist.map(c => `<li><label class="lms-check"><input type="checkbox" name="chk" value="${esc(c.id)}"> ${esc(c.text)}</label></li>`).join('')}</ul></fieldset>` : '<p class="lms-note">This course has no checklist items; record the outcome and your notes.</p>'}
   <label class="f" for="ob-out">Outcome<select class="i" id="ob-out" name="outcome"><option value="pass">Pass: every item was met</option><option value="needs_practice">Needs practice</option></select></label>
   <label class="f" for="ob-notes">Notes (required for Needs practice; the learner can read them)<textarea class="i" id="ob-notes" name="notes" rows="3" maxlength="2000"></textarea></label>
   <div class="lms-row"><button class="btn gold" type="submit">Save observation</button><button class="btn soft" type="button" data-lms="d-close">Cancel</button><span class="lms-note" role="status" data-lms-msg></span></div></form>`);
});
F.on('d-close', () => F.closeDlg());
F.onForm('d-obs-save', async form => {
  const f = form.elements, o = D.obs.find(x => x.enrollment_id === f.id.value), msg = form.querySelector('[data-lms-msg]');
  const results = {}; o.checklist.forEach(c => { results[c.id] = !!form.querySelector(`input[name=chk][value="${c.id}"]`).checked; });
  const btn = form.querySelector('button[type=submit]'); F.busy(btn, true);
  try { await rpc('training_record_observation', { p_enrollment:o.enrollment_id, p_outcome:f.outcome.value, p_notes:f.notes.value.trim() || null, p_results:results }); F.closeDlg(); D.obs = null; D.report = null; say('Observation recorded.'); F.rerender(); }
  catch(e) { F.busy(btn, false); msg.textContent = friendly(e); msg.style.color = 'var(--bad)'; }
});

// ---------------------------------------------------------------- reflections
function reflTab(){
  ensureCenter();
  load('refl', () => rpc('training_reflection_queue', { p_center:D.center, p_status:'all' }));
  if (!D.refl) return wait();
  const list = D.refl.filter(r => D.reflStatus === 'all' || r.review_status === D.reflStatus);
  const counts = s => D.refl.filter(r => r.review_status === s).length;
  const filter = `<div class="lms-subtabs" role="group" aria-label="Show">${[['pending', `Waiting (${counts('pending')})`], ['follow_up', `Asked for more (${counts('follow_up')})`], ['reviewed', `Reviewed (${counts('reviewed')})`], ['all', 'All']].map(([k, n]) => `<button type="button" data-lms="d-refl-filter" data-k="${k}" aria-pressed="${D.reflStatus === k}">${esc(n)}</button>`).join('')}</div>`;
  const card = r => `<div class="lms-card"><div class="lms-row sp"><b>${esc(r.learner_name)}</b><span class="lms-note">${esc(r.course_title)} · ${esc(r.lesson_title)} · ${esc(fmt(r.submitted_at))}</span></div>
    <div class="lms-note">${esc(r.prompt)}</div><blockquote class="lms-quote">${esc(r.response)}</blockquote>
    ${r.review_status !== 'pending' ? `<div class="lms-note"><span class="lms-chip ${r.review_status === 'reviewed' ? 'ok' : 'warn'}">${r.review_status === 'reviewed' ? 'Reviewed' : 'Asked for more'}</span> ${r.review_comment ? esc(r.review_comment) : ''}</div>` : ''}
    <form class="lms-form" data-lms-form="d-refl-save" novalidate><input type="hidden" name="id" value="${esc(r.attempt_id)}"><label class="f" for="rv-${esc(r.attempt_id)}">Comment for the learner${r.review_status === 'pending' ? '' : ' (replaces the earlier one)'}<textarea class="i" id="rv-${esc(r.attempt_id)}" name="comment" rows="2" maxlength="2000"></textarea></label>
    <div class="lms-row"><button class="btn gold tiny" type="submit" name="decision" value="reviewed">Mark reviewed</button><button class="btn soft tiny" type="submit" name="decision" value="follow_up">Ask for more</button><span class="lms-note" role="status" data-lms-msg></span></div></form></div>`;
  return `${errBox('refl')}<section class="lms-sec"><header><h2>Reflections to review</h2><span class="lms-note">What learners wrote in reflection activities. These are not scored; review them and leave a comment. "Ask for more" lets the learner add to their answer.</span></header>${filter}
   ${list.length ? `<div class="lms-stack">${list.map(card).join('')}</div>` : '<div class="lms-empty">Nothing here.</div>'}</section>`;
}
F.on('d-refl-filter', el => { D.reflStatus = el.dataset.k; F.rerender(); });
F.onForm('d-refl-save', async (form, e) => {
  const f = form.elements, decision = (e.submitter && e.submitter.value) || 'reviewed', msg = form.querySelector('[data-lms-msg]');
  try { await rpc('training_review_reflection', { p_attempt:f.id.value, p_status:decision, p_comment:f.comment.value.trim() || null }); D.refl = null; say(decision === 'reviewed' ? 'Marked reviewed.' : 'Asked the learner for more.'); F.rerender(); }
  catch(err) { msg.textContent = friendly(err); msg.style.color = 'var(--bad)'; }
});

// ---------------------------------------------------------------- attendance report and roster export
const mins = n => `${num(n, 1)} min`;
function attTab(){
  ensureCenter();
  load('courses', async () => must(await L.sb.from('training_courses').select('id,title,code,version,series_id').order('title'), 'courses'));
  load('report', () => rpc('training_attendance_report', { p_center:D.center, p_course:D.filter.course || null, p_from:D.filter.from || null, p_to:D.filter.to || null }));
  if (!D.report || !D.courses) return wait();
  const today = todayYmd();
  const done = D.report.filter(r => r.status === 'completed');
  const toReport = done.filter(r => r.time_enforced && !r.reported_at);
  const overdue = toReport.filter(r => r.report_due_on && r.report_due_on < today);
  const seen = new Set(), courseOpts = D.courses.filter(c => { if (seen.has(c.series_id)) return false; seen.add(c.series_id); return true; });
  const row = r => `<tr><td><b>${esc(r.learner_name)}</b></td><td>${esc(r.course_title)}<div class="lms-note">v${esc(r.course_version)} · ${r.review_status === 'signed_off' ? 'reviewed' : '<span class="lms-chip flag">unreviewed</span>'}</div></td>
    <td>${r.status === 'completed' ? '<span class="lms-chip ok">Completed</span>' : r.status === 'in_progress' ? '<span class="lms-chip warn">In progress</span>' : '<span class="lms-chip dim">Not started</span>'}${r.completed_on ? `<div class="lms-note">${esc(fmt(r.completed_on))}</div>` : ''}</td>
    <td class="n">${r.time_enforced ? `${mins(r.active_minutes)} <span class="lms-note">of ${mins(r.required_minutes)}</span>` : '<span class="lms-note">not tracked</span>'}</td><td class="n">${r.sessions}</td><td class="n">${r.touchpoints_done}/${r.touchpoints_total}</td><td class="n">${r.quiz_attempts}${r.mastery_met === true ? ' <span class="lms-chip ok">mastery</span>' : ''}</td>
    <td>${r.observation_status === 'not_required' ? '–' : `<span class="lms-chip ${(STATUS_CHIP[r.observation_status] || [0, 'dim'])[1]}">${esc((STATUS_CHIP[r.observation_status] || [r.observation_status])[0])}</span>`}</td>
    <td>${r.status === 'completed' && r.time_enforced ? (r.reported_at ? `<span class="lms-chip ok">Reported</span>` : `${esc(fmt(r.report_due_on))}${r.report_due_on < today ? ' <span class="lms-chip bad">overdue</span>' : ''}`) : '–'}</td>
    <td><button class="btn soft tiny" type="button" data-lms="d-log" data-id="${esc(r.enrollment_id)}">Audit log</button></td></tr>`;
  return `${errBox('report')}<section class="lms-sec"><header><h2>Attendance and roster export</h2><span class="lms-note">Time present and active participation for every self-paced course, kept as an audit trail. Missouri expects completion data within 30 days of completing.</span></header>
   <div class="lms-tiles"><div class="lms-tile"><b>${done.length}</b><span>completions in this view</span></div><div class="lms-tile ${toReport.length ? 'warn' : ''}"><b>${toReport.length}</b><span>not yet sent on a roster</span></div><div class="lms-tile ${overdue.length ? 'bad' : 'ok'}"><b>${overdue.length}</b><span>past their 30-day reporting date</span></div></div>
   <form class="lms-card lms-form" data-lms-form="d-att-filter" novalidate><div class="lms-fields"><label class="f" for="af-course">Course<select class="i" id="af-course" name="course"><option value="">All courses</option>${courseOpts.map(c => `<option value="${esc(c.id)}"${D.filter.course === c.id ? ' selected' : ''}>${esc(c.code ? c.code + ' · ' : '')}${esc(c.title)}</option>`).join('')}</select></label>
    <label class="f" for="af-from">Completed or assigned from<input class="i" id="af-from" name="from" type="date" value="${esc(D.filter.from)}"></label><label class="f" for="af-to">to<input class="i" id="af-to" name="to" type="date" value="${esc(D.filter.to)}"></label></div>
    <div class="lms-row"><button class="btn soft" type="submit">Apply</button><button class="btn gold" type="button" data-lms="d-csv">Download the MOPD roster (CSV)</button><label class="lms-check"><input type="checkbox" data-lms-toggle-mark${D.mark ? ' checked' : ''}> Mark these completions as reported</label><span class="lms-note" role="status" id="csvMsg"></span></div>
    <p class="lms-note">The roster has five columns: learner name, email, course, completion date and hours. It lists only completions that are really credited: time tracked, observation passed where required, certificate not revoked. The email must match the person's MOPD record. Nothing else about the learner leaves the hub.</p></form>
   ${D.report.length ? `<div class="lms-tw"><table><caption class="sr">Attendance by staff member and course</caption><thead><tr><th>Staff</th><th>Course</th><th>Status</th><th class="n">Active time</th><th class="n">Sessions</th><th class="n">Touchpoints</th><th class="n">Check attempts</th><th>Observation</th><th>Report by</th><th></th></tr></thead><tbody>${D.report.map(row).join('')}</tbody></table></div>` : '<div class="lms-empty">No enrollments match.</div>'}</section>`;
}
document.addEventListener('change', e => { const t = e.target.closest && e.target.closest('[data-lms-toggle-mark]'); if (t) D.mark = t.checked; });
F.onForm('d-att-filter', form => { const f = form.elements; D.filter = { course:f.course.value, from:f.from.value, to:f.to.value }; D.report = null; F.rerender(); });
F.on('d-csv', async () => {
  const msg = document.getElementById('csvMsg'); if (msg) msg.textContent = 'Preparing...';
  try {
    const csv = await rpc('training_mopd_roster_csv', { p_center:D.center, p_course:D.filter.course || null, p_from:D.filter.from || null, p_to:D.filter.to || null, p_mark:!!D.mark });
    const rows = csv.split('\r\n').filter(Boolean).length - 1;
    const url = URL.createObjectURL(new Blob([csv], { type:'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `mopd-roster-${todayYmd()}.csv`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000);
    if (msg) msg.textContent = `${rows} row${rows === 1 ? '' : 's'} downloaded${D.mark ? ' and marked as reported' : ''}.`;
    if (D.mark) { D.report = null; F.rerender(); }
  } catch(e) { if (msg) { msg.textContent = friendly(e); msg.style.color = 'var(--bad)'; } }
});
const EV = { session_start:'Session started', lesson_complete:'Lesson completed', item:'Activity answered', video_checkpoint:'Video checkpoint answered', quiz_start:'Knowledge check started', quiz_attempt:'Knowledge check submitted', observation:'Observation recorded', course_complete:'Course completed', session:'Session summary' };
F.on('d-log', async el => {
  try {
    const rows = await rpc('training_attendance_events', { p_enrollment:el.dataset.id });
    const line = r => { const d = r.detail || {}; const bits = r.kind === 'session' ? `${Math.round(d.active_seconds / 60 * 10) / 10} min counted, ${Math.round(d.idle_seconds / 60 * 10) / 10} idle, ${Math.round(d.hidden_seconds / 60 * 10) / 10} hidden, ${d.heartbeats} heartbeats` : r.kind === 'quiz_attempt' ? `attempt ${d.attempt_no}: ${d.score_pct}% ${d.passed ? 'passed' : 'not passed'}${d.critical_missed ? `, ${d.critical_missed} life-safety missed` : ''}` : r.kind === 'item' || r.kind === 'video_checkpoint' ? `${d.kind}${d.correct === true ? ', correct' : d.correct === false ? ', wrong' : ''}, attempt ${d.attempt_no}` : r.kind === 'observation' ? esc(d.outcome) : ''; return `<tr><td>${esc(new Date(r.at).toLocaleString())}</td><td>${esc(EV[r.kind] || r.kind)}${r.lesson_title ? `<div class="lms-note">${esc(r.lesson_title)}</div>` : ''}</td><td>${bits}</td></tr>`; };
    F.openDlg(`<h3 id="lmsDlgTitle">Audit log</h3><div class="lms-tw"><table><thead><tr><th>When</th><th>What</th><th>Detail</th></tr></thead><tbody>${rows.map(line).join('') || '<tr><td colspan="3">No events yet.</td></tr>'}</tbody></table></div><div class="lms-row"><button class="btn soft" type="button" data-lms="d-close">Close</button></div>`);
  } catch(e) { say(friendly(e)); }
});

F.teamTabs = F.teamTabs || {};
F.teamTabs.observations = { standalone:true, label:() => { const n = D.obs ? D.obs.filter(o => o.status === 'pending').length : 0; return `Observations${n ? ` (${n})` : ''}`; }, render:obsTab };
F.teamTabs.reflections = { standalone:true, label:() => { const n = D.refl ? D.refl.filter(r => r.review_status === 'pending').length : 0; return `Reflections${n ? ` (${n})` : ''}`; }, render:reflTab };
F.teamTabs.attendance = { standalone:true, label:() => 'Attendance and roster', render:attTab };
})();
