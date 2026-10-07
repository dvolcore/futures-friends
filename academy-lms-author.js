/* Futures Friends Academy LMS: HQ course authoring (courses, modules, lessons, activities, video checkpoints, knowledge-check
   banks, observation checklist, versions, reviewer sign-off, publishing, SCORM export, requirement mapping, certificate lookup
   and revocation). Needs academy-lms.js. Only headquarters staff (the hub's HQ list) can write any of this: the database
   refuses everyone else, whatever this screen shows. Answer keys are stored apart from the questions and never sent to
   learners; scoring happens on the server. A published version is frozen: changing it means creating a new draft version, and
   a version can be published only after a named reviewer of record has signed off its exact content. */
(function(){
'use strict';
const F = window.FFLMS; if (!F) return;
const { L, esc, fmt, num, must, friendly, say, ROLE_LABEL, ROLES } = F;
const TRACKS = ['foundations', 'classroom', 'lead', 'director', 'kitchen', 'home', 'trainer', 'state', 'general'];
const KINDS = { futures:'Futures Friends course', state_licensing:'State licensing essentials', external_partner:'Partner course' };
const ITEM_KINDS = { scenario:'Scenario (single choice, feedback on every option)', multi:'Multi-select (select all that apply)', ordering:'Ordering (put the steps in order)', hotspot:'Image hotspot (spot the hazard)', poll:'Poll (not scored)', reflection:'Typed reflection (not scored, goes to a review queue)' };
const ATTEST = 'I reviewed every lesson, activity, answer key, caption or transcript and the learning objectives in this exact version, and I approve it for use.';
const A = { list:null, loading:null, err:null, id:null, c:null, cLoading:null, sel:{ type:'course' }, problems:null, cert:null, reqs:null, review:null, reviewers:null, hs:{ placing:null }, scorm:null };
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random());
const slugify = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'course';
const frozen = c => !!(c && c.course && c.course.published_at);

async function loadList(){
  const [cs, ls] = await Promise.all([L.sb.from('training_courses').select('*').order('code', { nullsFirst:false }).order('version'), L.sb.from('training_lessons').select('id,course_id')]);
  const lessons = {}; must(ls, 'lessons').forEach(l => { lessons[l.course_id] = (lessons[l.course_id] || 0) + 1; });
  A.list = must(cs, 'courses').map(c => Object.assign(c, { lessonCount:lessons[c.id] || 0 }));
}
async function loadCourse(id){
  const sb = L.sb;
  const [course, mods, les, qz, map, items, obs, sign] = await Promise.all([
    sb.from('training_courses').select('*').eq('id', id).maybeSingle(),
    sb.from('training_modules').select('*').eq('course_id', id).order('position'),
    sb.from('training_lessons').select('*').eq('course_id', id).order('position'),
    sb.from('training_quizzes').select('*').eq('course_id', id).order('position'),
    sb.from('compliance_requirement_courses').select('*').eq('course_id', id),
    sb.from('training_items').select('*').eq('course_id', id).order('position'),
    sb.from('training_observation_items').select('*').eq('course_id', id).order('position'),
    sb.from('training_course_signoffs').select('*').eq('course_id', id).order('signed_at', { ascending:false }),
  ]);
  const c = { course:must(course, 'course'), modules:must(mods, 'modules'), lessons:must(les, 'lessons'), quizzes:must(qz, 'quizzes'), mapping:must(map, 'mapping'), items:must(items, 'activities'), obs:must(obs, 'observation items'), signoffs:must(sign, 'sign-offs'), itemOpts:{}, itemKeys:{}, questions:[], options:{}, keys:{} };
  if (!c.course) throw new Error('Course not found.');
  if (c.items.length) {
    const ids = c.items.map(i => i.id);
    const [os, ks] = await Promise.all([sb.from('training_item_options').select('*').in('item_id', ids).order('position'), sb.from('training_item_keys').select('*').in('item_id', ids)]);
    must(os, 'activity options').forEach(o => { (c.itemOpts[o.item_id] = c.itemOpts[o.item_id] || []).push(o); });
    must(ks, 'activity keys').forEach(k => { c.itemKeys[k.item_id] = k; });
  }
  if (c.quizzes.length) {
    const qs = must(await sb.from('training_questions').select('*').eq('quiz_id', c.quizzes[0].id).order('position'), 'questions');
    c.questions = qs;
    if (qs.length) {
      const [os, ks] = await Promise.all([sb.from('training_options').select('*').in('question_id', qs.map(q => q.id)).order('position'), sb.from('training_answer_keys').select('*').in('question_id', qs.map(q => q.id))]);
      must(os, 'options').forEach(o => { (c.options[o.question_id] = c.options[o.question_id] || []).push(o); });
      must(ks, 'answer keys').forEach(k => { c.keys[k.question_id] = k; });
    }
  }
  A.review = must(await sb.rpc('training_course_review_info', { p_course:id }), 'review status');
  A.c = c; A.id = id;
}
async function loadReqs(){
  A.reqs = must(await L.sb.from('compliance_requirements').select('id,state,title,active').eq('active', true).order('state').order('title'), 'requirements');
  const rv = await L.sb.from('training_reviewers').select('display_name,credentials'); A.reviewers = rv.data || [];
}
const reloadCourse = async () => { try { await loadCourse(A.id); A.problems = null; } catch(e) { say(friendly(e)); } F.rerender(); };
const reloadList = () => { A.list = null; F.rerender(); };

// ---------------------------------------------------------------- list
function statusChips(c){
  if (c.superseded_at) return '<span class="lms-chip dim">Superseded</span>';
  if (c.published) return `<span class="lms-chip ok">Published</span> ${c.review_waived ? '<span class="lms-chip flag" title="Published before the reviewer-of-record step existed">Unreviewed</span>' : '<span class="lms-chip ok">Signed off</span>'}`;
  if (c.published_at) return '<span class="lms-chip warn">Unpublished</span>';
  return '<span class="lms-chip dim">Draft</span>';
}
function listBody(){
  const rows = A.list;
  return `<section class="lms-sec"><header><h2>Courses</h2><span class="lms-note">Drafts are visible only to headquarters. A version is published only after a reviewer of record signs it off, and a published version cannot be edited: you create a new draft version instead.</span></header>
   <div class="lms-tw"><table><thead><tr><th>Code</th><th>Course</th><th>Version</th><th>Status</th><th class="n">Hours</th><th class="n">Lessons</th><th>Applies to</th><th></th></tr></thead><tbody>${rows.map(c => `<tr><td>${esc(c.code || '')}</td><td><b>${esc(c.title)}</b><div class="lms-note">${esc(KINDS[c.kind] || c.kind)} · ${esc(c.track)}${c.enforce_active_time ? '' : ' · time not tracked'}</div></td><td>v${c.version}</td><td>${statusChips(c)}</td><td class="n">${num(c.clock_hours, 2)}</td><td class="n">${c.lessonCount}</td><td>${c.states.length ? esc(c.states.join(', ')) : 'All states'}${c.audience_roles.length ? `<div class="lms-note">${esc(c.audience_roles.map(r => ROLE_LABEL[r] || r).join(', '))}</div>` : ''}</td><td><a class="btn soft tiny" href="#learn-author/${esc(c.id)}">${c.published_at ? 'Open' : 'Edit'}</a></td></tr>`).join('')}</tbody></table></div></section>
  <section class="lms-sec"><header><h2>New course</h2></header>
   <form class="lms-card lms-form" data-lms-form="a-new" novalidate><div class="lms-fields">
    <label class="f" for="nc-title">Title<input class="i" id="nc-title" name="title" required maxlength="160"></label>
    <label class="f" for="nc-code">Code (optional)<input class="i" id="nc-code" name="code" maxlength="20" placeholder="F-109"></label>
    <label class="f" for="nc-hours">Clock hours<input class="i" id="nc-hours" name="hours" type="number" min="0" max="99" step="0.25" value="1"></label>
    <label class="f" for="nc-track">Track<select class="i" id="nc-track" name="track">${TRACKS.map(t => `<option value="${t}">${esc(t)}</option>`).join('')}</select></label>
    <label class="f" for="nc-kind">Kind<select class="i" id="nc-kind" name="kind">${Object.entries(KINDS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select></label></div>
    <div class="lms-row"><button class="btn gold" type="submit">Create draft</button><span class="lms-note" role="status" data-lms-msg></span></div></form></section>
  <section class="lms-sec"><header><h2>Certificates</h2><span class="lms-note">Look up a certificate by its code. Revoking removes its hours from the ledger and marks it invalid on the public check.</span></header>
   <form class="lms-card lms-form" data-lms-form="a-cert-find" novalidate><label class="f" for="cf-code">Certificate code<input class="i" id="cf-code" name="code" placeholder="FF-1234-ABCD-5678-EF90" autocomplete="off" style="text-transform:uppercase"></label><div class="lms-row"><button class="btn soft" type="submit">Look up</button></div></form>
   ${A.cert === 'none' ? '<div class="lms-empty">No certificate has that code.</div>' : A.cert ? `<div class="lms-card"><div class="lms-row sp"><b>${esc(A.cert.holder_name)}</b>${A.cert.revoked_at ? '<span class="lms-chip bad">Revoked</span>' : '<span class="lms-chip ok">Valid</span>'}</div><div class="lms-note">${esc(A.cert.course_title)} · v${esc(A.cert.course_version == null ? 1 : A.cert.course_version)} · ${esc(fmt(A.cert.completed_on))} · ${num(A.cert.clock_hours, 2)} hours · ${esc(A.cert.code)}</div>${A.cert.revoked_at ? `<div class="lms-note">Revoked: ${esc(A.cert.revoked_reason || '')}</div>` : `<form class="lms-form" data-lms-form="a-cert-revoke" novalidate><input type="hidden" name="id" value="${esc(A.cert.id)}"><label class="f" for="cr-why">Reason for revoking<input class="i" id="cr-why" name="reason" required maxlength="300"></label><div class="lms-row"><button class="btn danger" type="submit">Revoke this certificate</button><span class="lms-note" role="status" data-lms-msg></span></div></form>`}</div>` : ''}</section>`;
}

// ---------------------------------------------------------------- editor
function treeHtml(c){
  const sel = A.sel, cur = (t, id) => (sel.type === t && (!id || sel.id === id)) ? ' aria-current="true"' : '';
  const fz = frozen(c);
  let h = `<button type="button" data-lms="a-sel" data-type="course"${cur('course')}>Course settings and publishing</button>`;
  for (const m of c.modules) {
    h += `<div class="m"><span><button type="button" data-lms="a-sel" data-type="module" data-id="${esc(m.id)}"${cur('module', m.id)}>${esc(m.title)}</button></span></div>`;
    for (const l of c.lessons.filter(x => x.module_id === m.id)) {
      h += `<button type="button" data-lms="a-sel" data-type="lesson" data-id="${esc(l.id)}"${cur('lesson', l.id)} style="padding-left:18px">${esc(l.title)}${l.kind === 'video' ? ' (video)' : ''}</button>`;
      for (const it of c.items.filter(x => x.lesson_id === l.id).sort((a, b) => (a.at_seconds ?? 1e9) - (b.at_seconds ?? 1e9) || a.position - b.position)) {
        h += `<button type="button" data-lms="a-sel" data-type="item" data-id="${esc(it.id)}"${cur('item', it.id)} style="padding-left:34px;font-size:13px">${it.at_seconds != null ? `@${esc(fmtClock(it.at_seconds))} ` : ''}${esc(it.kind)}: ${esc(it.prompt.slice(0, 28))}${it.prompt.length > 28 ? '…' : ''}</button>`;
      }
      if (!fz) h += `<button type="button" class="lms-link" data-lms="a-add-item" data-lesson="${esc(l.id)}" style="padding-left:34px;font-size:13px">+ Add activity</button>`;
    }
    if (!fz) h += `<button type="button" class="lms-link" data-lms="a-add-lesson" data-module="${esc(m.id)}" style="padding-left:18px">+ Add lesson</button>`;
  }
  if (!fz) h += `<button type="button" class="lms-link" data-lms="a-add-module">+ Add module</button>`;
  h += `<div class="m"><span>Knowledge check</span></div>`;
  if (c.quizzes.length) {
    h += `<button type="button" data-lms="a-sel" data-type="quiz"${cur('quiz')}>${esc(c.quizzes[0].title)}</button>`;
    c.questions.forEach((q, i) => { h += `<button type="button" data-lms="a-sel" data-type="question" data-id="${esc(q.id)}"${cur('question', q.id)} style="padding-left:18px">${i + 1}. ${q.critical ? '★ ' : ''}${esc(q.prompt.slice(0, 36))}${q.prompt.length > 36 ? '…' : ''}</button>`; });
    if (!fz) h += `<button type="button" class="lms-link" data-lms="a-add-question" style="padding-left:18px">+ Add question</button>`;
  } else if (!fz) h += `<button type="button" class="lms-link" data-lms="a-add-quiz">+ Add a knowledge check</button>`;
  h += `<div class="m"><span>Director observation</span></div><button type="button" data-lms="a-sel" data-type="obs"${cur('obs')}>Observation checklist (${c.obs.length})</button>`;
  return `<nav class="lms-tree" aria-label="Course structure">${h}</nav>`;
}
const fmtClock = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
function approvalsRows(c){
  const a = c.course.state_approvals || {};
  return Object.keys(a).map(k => apprRow(k, a[k] || {})).join('');
}
const apprRow = (st, a) => `<div class="lms-row" data-appr><input class="i" style="width:70px" name="appr-state" value="${esc(st)}" maxlength="2" aria-label="State"><select class="i" style="width:130px" name="appr-status" aria-label="Status"><option value="pending"${a.status === 'pending' ? ' selected' : ''}>Pending</option><option value="approved"${a.status === 'approved' ? ' selected' : ''}>Approved</option></select><input class="i" style="flex:1;min-width:160px" name="appr-ref" value="${esc(a.ref || '')}" placeholder="Approval number or reference" aria-label="Approval reference"><label class="f" style="width:150px">Approved on<input class="i" name="appr-date" type="date" value="${esc(a.approved_on || '')}"></label><label class="f" style="width:150px">Expires<input class="i" name="appr-exp" type="date" value="${esc(a.expires_on || '')}"></label><button type="button" class="btn danger tiny" data-lms="a-appr-del">Remove</button></div>`;
function reviewBox(c){
  const k = c.course, r = A.review || {};
  const status = k.published && k.review_waived ? ['Unreviewed', 'flag', 'Published before the reviewer-of-record step existed. A new version needs a sign-off.']
    : r.status === 'signed_off' ? ['Signed off', 'ok', ''] : r.status === 'awaiting_second' ? ['Waiting for a second reviewer', 'warn', `Two-person rule: ${r.signatures || 1} of ${r.needed || 2} different reviewers have signed this exact version. Another reviewer of record must sign it before it can be published.`] : r.status === 'stale' ? ['Edited since sign-off', 'warn', 'The signed content is not this content. A reviewer must sign this version again before it can be published.'] : ['Not yet reviewed', 'dim', 'A reviewer of record must sign off this version before it can be published.'];
  const latest = c.signoffs[0];
  const names = (A.reviewers || []).map(x => x.display_name).join(', ');
  return `<div class="lms-card"><h3>Reviewer of record</h3>
   <div class="lms-row"><span class="lms-chip ${status[1]}">${esc(status[0])}</span><span class="lms-note">Version ${esc(k.version)}${frozen(c) ? ' · frozen' : ''}</span></div>${status[2] ? `<p class="lms-note">${esc(status[2])}</p>` : ''}
   ${latest ? `<dl class="lms-kvs"><dt>Reviewer</dt><dd>${esc(latest.reviewer_name)}</dd><dt>Signed</dt><dd>${esc(fmt(latest.signed_at))}</dd><dt>Version signed</dt><dd>${esc(latest.course_version)}</dd></dl><blockquote class="lms-quote">${esc(latest.attestation)}</blockquote>` : ''}
   ${!frozen(c) && r.can_sign && r.status !== 'signed_off' ? `<form class="lms-form" data-lms-form="a-signoff" novalidate><label class="f" for="so-text">Attestation (what you reviewed; recorded with your name and the time)<textarea class="i" id="so-text" name="attestation" rows="3" required>${esc(ATTEST)}</textarea></label><div class="lms-row"><button class="btn gold" type="submit">Sign off this version as ${esc((A.reviewers || []).length ? 'the reviewer of record' : 'reviewer')}</button><span class="lms-note" role="status" data-lms-msg></span></div><p class="lms-note">Signing covers exactly the content as it is now. Any later edit voids it.</p></form>` : !frozen(c) && r.status !== 'signed_off' ? `<p class="lms-note">Only a reviewer of record can sign off a version${names ? `: ${esc(names)}` : ''}. The owner designates reviewers.</p>` : ''}</div>`;
}
function courseForm(c){
  const k = c.course, fz = frozen(c), ro = fz ? ' disabled' : '';
  const mapped = c.mapping.map(m => (A.reqs || []).find(r => r.id === m.requirement_id) || { id:m.requirement_id, title:m.requirement_id, state:'' });
  return `${fz ? `<div class="lms-banner warn"><div><b>This version has been published and is frozen.</b><p class="lms-note">Lessons, activities, questions, hours and time rules cannot change, so learners and the reviewer always see exactly what was approved. You can still manage who it applies to and its state approvals below. To change the content, create a new draft version.</p><p style="margin-top:8px">${k.superseded_at ? '<span class="lms-note">A newer version has replaced this one.</span>' : '<button class="btn gold" type="button" data-lms="a-new-version">Create a new draft version</button>'}</p></div></div>` : ''}
  <form class="lms-card lms-form" data-lms-form="a-course-save" novalidate><h3>Course settings</h3><div class="lms-fields">
    <label class="f" for="cs-title">Title<input class="i" id="cs-title" name="title" required maxlength="160" value="${esc(k.title)}"${ro}></label>
    <label class="f" for="cs-code">Code<input class="i" id="cs-code" name="code" maxlength="20" value="${esc(k.code || '')}"></label>
    <label class="f" for="cs-hours">Clock hours (credited)<input class="i" id="cs-hours" name="clock_hours" type="number" min="0" max="99" step="0.25" value="${esc(k.clock_hours)}"${ro}></label>
    <label class="f" for="cs-ver">Version<input class="i" id="cs-ver" value="${esc(k.version)}" disabled></label>
    <label class="f" for="cs-track">Track<select class="i" id="cs-track" name="track">${TRACKS.map(t => `<option value="${t}"${k.track === t ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>
    <label class="f" for="cs-kind">Kind<select class="i" id="cs-kind" name="kind">${Object.entries(KINDS).map(([v, n]) => `<option value="${v}"${k.kind === v ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
    <label class="f" for="cs-states">States it applies to (blank = all; e.g. KS, MO)<input class="i" id="cs-states" name="states" value="${esc(k.states.join(', '))}"></label>
    <label class="f" for="cs-due">Due days after hire (for auto-assign)<input class="i" id="cs-due" name="due_days_after_hire" type="number" min="0" max="365" value="${esc(k.due_days_after_hire ?? '')}"></label></div>
    <label class="f" for="cs-sum">Summary<textarea class="i" id="cs-sum" name="summary" rows="3"${ro}>${esc(k.summary)}</textarea></label>
    <fieldset style="border:0;padding:0;margin:0"><legend class="lms-note">Job roles it is for (none checked = everyone)</legend><div class="lms-row">${ROLES.map(r => `<label class="lms-check"><input type="checkbox" name="aud" value="${r}"${k.audience_roles.includes(r) ? ' checked' : ''}> ${esc(ROLE_LABEL[r])}</label>`).join('')}</div></fieldset>
    <div class="lms-row"><label class="lms-check"><input type="checkbox" name="included_with_program"${k.included_with_program ? ' checked' : ''}> Included with the program</label><label class="lms-check"><input type="checkbox" name="auto_assign_on_hire"${k.auto_assign_on_hire ? ' checked' : ''}> Assign automatically to new hires</label></div>
    <fieldset style="border:0;padding:0;margin:0;display:grid;gap:8px"><legend class="lms-note"><b>Self-paced credit rules</b> (what a state reviewer looks for)</legend>
     <label class="lms-check"><input type="checkbox" name="enforce_active_time"${k.enforce_active_time ? ' checked' : ''}${ro}> Track time present and active participation (required for a Missouri self-paced course)</label>
     <div class="lms-fields"><label class="f" for="cs-pct">Active time required (percent of credited hours)<input class="i" id="cs-pct" name="active_threshold_pct" type="number" min="50" max="100" value="${esc(k.active_threshold_pct)}"${ro}></label>
      <label class="f" for="cs-idle">Idle limit (minutes without interaction before time stops counting)<input class="i" id="cs-idle" name="idle_minutes" type="number" min="1" max="30" value="${esc(k.idle_minutes)}"${ro}></label></div>
     <label class="lms-check"><input type="checkbox" name="requires_observation"${k.requires_observation ? ' checked' : ''}${ro}> State credit also requires a director observation (checklist below)</label>
     <label class="f" for="cs-obj">Measurable learning objectives<textarea class="i" id="cs-obj" name="learning_objectives" rows="3"${ro}>${esc(k.learning_objectives)}</textarea></label>
     <label class="f" for="cs-skill">Skills assessment (how the skill is assessed; Missouri requires this described)<textarea class="i" id="cs-skill" name="skills_assessment" rows="2"${ro}>${esc(k.skills_assessment)}</textarea></label>
     <label class="f" for="cs-areas">Content areas (at most 2 per hour; separate with commas)<input class="i" id="cs-areas" name="content_areas" value="${esc((k.content_areas || []).join(', '))}"${ro}></label></fieldset>
    <label class="f" for="cs-src">Source note (where this content came from)<textarea class="i" id="cs-src" name="source_note" rows="2">${esc(k.source_note || '')}</textarea></label>
    <fieldset style="border:0;padding:0;margin:0;display:grid;gap:8px"><legend class="lms-note">State approval. Hours from this course count toward a state's clock-hour rules ONLY while its status here is Approved, with a reference and an unexpired date. Pending or missing means Futures Friends hours only. Kansas approval comes through Cape; Missouri through MOPD (a self-paced course also needs its LMS approved by DESE).</legend><div id="apprRows" style="display:grid;gap:8px">${approvalsRows(c)}</div><div><button type="button" class="btn soft tiny" data-lms="a-appr-add">Add a state approval</button></div></fieldset>
    <div class="lms-row"><button class="btn gold" type="submit">Save settings</button><span class="lms-note" role="status" data-lms-msg></span></div></form>
  ${reviewBox(c)}
  <div class="lms-card"><h3>Publishing</h3><div class="lms-row">${statusChips(k)}<button class="btn soft" type="button" data-lms="a-check">Check for problems</button>${k.superseded_at ? '' : k.published ? '<button class="btn soft" type="button" data-lms="a-unpublish">Unpublish</button>' : '<button class="btn gold" type="button" data-lms="a-publish">Publish</button>'}</div>
   ${A.problems ? (A.problems.length ? `<div class="lms-banner bad"><div><b>Fix these before publishing:</b><ul>${A.problems.map(p => `<li>${esc(p)}</li>`).join('')}</ul></div></div>` : '<div class="lms-banner ok"><div>No problems found. Once a reviewer of record has signed this version off it can be published.</div></div>') : ''}
   <p class="lms-note">Publishing checks: lessons and answers complete, video length and captions or a transcript, activities have keys, a touchpoint in every lesson when time is tracked, checkpoints no further apart than the idle limit allows, credited hours matching lesson time, and the state criteria for the states chosen above.</p></div>
  <div class="lms-card"><h3>Export for another LMS (SCORM 1.2)</h3><p class="lms-note">A zip that can be hosted in MOPD's LMS or any SCORM 1.2 LMS as a fallback. The package scores inside the learner's browser, so it contains the answer keys: keep the file private.</p><div class="lms-row"><button class="btn soft" type="button" data-lms="a-scorm">Build the SCORM package</button><span class="lms-note" role="status" id="scormMsg"></span></div>${A.scorm ? `<a class="btn gold" href="${esc(A.scorm.url)}" download="${esc(A.scorm.name)}">Download ${esc(A.scorm.name)} (${num(A.scorm.size / 1024, 0)} KB)</a>` : ''}</div>
  <div class="lms-card"><h3>Counts toward these requirements</h3><p class="lms-note">Completing this course satisfies the requirements below for the people they apply to.</p>
   ${mapped.length ? `<ul class="lms-list">${mapped.map(r => `<li class="dim"><div class="lms-row sp"><span>${r.state ? `<b>${esc(r.state)}</b> · ` : ''}${esc(r.title)}</span><button class="btn danger tiny" type="button" data-lms="a-unmap" data-req="${esc(r.id)}">Remove</button></div></li>`).join('')}</ul>` : '<div class="lms-empty">Not mapped to any requirement.</div>'}
   <form class="lms-form lms-row" data-lms-form="a-map" novalidate><label class="f" for="mp-req" style="flex:1;min-width:220px">Add a requirement<select class="i" id="mp-req" name="req"><option value="">${A.reqs && A.reqs.length ? 'Choose' : 'No requirements loaded yet'}</option>${(A.reqs || []).filter(r => !c.mapping.some(m => m.requirement_id === r.id)).map(r => `<option value="${esc(r.id)}">${esc(r.state)} · ${esc(r.title)}</option>`).join('')}</select></label><button class="btn soft" type="submit">Map</button></form></div>
  <div class="lms-card"><h3>Delete</h3><p class="lms-note">Only a draft that was never published, with no learners, can be deleted.</p><div><button class="btn danger" type="button" data-lms="a-delete"${k.published_at ? ' disabled' : ''}>Delete this draft</button></div></div>`;
}
function moveBtns(kind, id){ return `<div class="lms-row"><button class="btn soft tiny" type="button" data-lms="a-move" data-kind="${kind}" data-id="${esc(id)}" data-dir="-1">Move up</button><button class="btn soft tiny" type="button" data-lms="a-move" data-kind="${kind}" data-id="${esc(id)}" data-dir="1">Move down</button></div>`; }
function moduleForm(c){
  const m = c.modules.find(x => x.id === A.sel.id); if (!m) return '<div class="lms-empty">Select something to edit.</div>';
  return `<form class="lms-card lms-form" data-lms-form="a-module-save" novalidate><h3>Module</h3><input type="hidden" name="id" value="${esc(m.id)}"><label class="f" for="md-title">Title<input class="i" id="md-title" name="title" required maxlength="160" value="${esc(m.title)}"></label>${moveBtns('module', m.id)}<div class="lms-row"><button class="btn gold" type="submit">Save</button><button class="btn danger" type="button" data-lms="a-del-module" data-id="${esc(m.id)}">Delete module and its lessons</button><span class="lms-note" role="status" data-lms-msg></span></div></form>`;
}
function lessonForm(c){
  const l = c.lessons.find(x => x.id === A.sel.id); if (!l) return '<div class="lms-empty">Select something to edit.</div>';
  return `<form class="lms-card lms-form" data-lms-form="a-lesson-save" novalidate><h3>Lesson</h3><input type="hidden" name="id" value="${esc(l.id)}"><div class="lms-fields">
   <label class="f" for="ls-title">Title<input class="i" id="ls-title" name="title" required maxlength="160" value="${esc(l.title)}"></label>
   <label class="f" for="ls-kind">Type<select class="i" id="ls-kind" name="kind"><option value="text"${l.kind === 'text' ? ' selected' : ''}>Reading</option><option value="video"${l.kind === 'video' ? ' selected' : ''}>Video</option><option value="file"${l.kind === 'file' ? ' selected' : ''}>Downloadable file</option></select></label>
   <label class="f" for="ls-min">Minutes (counts toward matching credited hours)<input class="i" id="ls-min" name="minutes" type="number" min="0" max="600" value="${esc(l.minutes ?? '')}"></label></div>
   <fieldset style="border:0;padding:0;margin:0;display:grid;gap:8px"><legend class="lms-note"><b>Video</b> (type Video)</legend>
   <label class="f" for="ls-video">Video link (https; YouTube, Vimeo or an .mp4 file)<input class="i" id="ls-video" name="video_url" type="url" value="${esc(l.video_url || '')}"></label>
   <label class="f" for="ls-vsec">Video length in seconds (required: it is how skipping ahead is prevented)<input class="i" id="ls-vsec" name="video_seconds" type="number" min="1" max="28800" value="${esc(l.video_seconds ?? '')}"></label>
   <label class="f" for="ls-cap">Captions: link to a caption file (.vtt) for an .mp4 (the host must allow cross-origin requests). Required before publishing, unless a transcript is given<input class="i" id="ls-cap" name="captions_url" type="url" value="${esc(l.captions_url || '')}"></label>
   <label class="f" for="ls-tr">Transcript (a full text alternative; at least 50 characters if there is no caption file)<textarea class="i" id="ls-tr" name="transcript" rows="4">${esc(l.transcript || '')}</textarea></label></fieldset>
   <label class="f" for="ls-file">Downloadable file (PDF, Office or image, up to 25 MB)${l.file_path ? ` · current: ${esc(l.file_name || l.file_path)}` : ''}<input class="i" id="ls-file" name="file" type="file"></label>
   <label class="f" for="ls-body">Text<textarea class="i" id="ls-body" name="body" rows="14">${esc(l.body)}</textarea></label>
   <p class="lms-note">Format: blank line between paragraphs, "## " for a heading, "- " for a bullet, **bold**. Add activities from the course tree: a video checkpoint is an activity with a time.</p>
   ${moveBtns('lesson', l.id)}<div class="lms-row"><button class="btn gold" type="submit">Save lesson</button><button class="btn danger" type="button" data-lms="a-del-lesson" data-id="${esc(l.id)}">Delete lesson</button><span class="lms-note" role="status" data-lms-msg></span></div></form>`;
}
function quizForm(c){
  const q = c.quizzes[0];
  const byObj = {}; c.questions.forEach(x => { const o = (x.objective || '').trim() || '(no objective)'; byObj[o] = (byObj[o] || 0) + 1; });
  return `<form class="lms-card lms-form" data-lms-form="a-quiz-save" novalidate><h3>Knowledge check</h3><input type="hidden" name="id" value="${esc(q.id)}"><div class="lms-fields">
   <label class="f" for="qz-title">Title<input class="i" id="qz-title" name="title" required maxlength="160" value="${esc(q.title)}"></label>
   <label class="f" for="qz-pass">Pass mark (percent)<input class="i" id="qz-pass" name="passing_score" type="number" min="1" max="100" value="${esc(q.passing_score)}"></label>
   <label class="f" for="qz-att">Attempts allowed<input class="i" id="qz-att" name="max_attempts" type="number" min="1" max="20" value="${esc(q.max_attempts)}"></label>
   <label class="f" for="qz-draw">Question bank: questions drawn per objective each attempt (blank = every question)<input class="i" id="qz-draw" name="draw_per_objective" type="number" min="1" max="50" value="${esc(q.draw_per_objective ?? '')}"></label>
   <label class="f" for="qz-cool">Wait between attempts (minutes, 0 = none)<input class="i" id="qz-cool" name="cooldown_minutes" type="number" min="0" max="10080" value="${esc(q.cooldown_minutes)}"></label>
   <label class="f" for="qz-rev">Feedback on each question<select class="i" id="qz-rev" name="reveal_feedback"><option value="after_pass"${q.reveal_feedback === 'after_pass' ? ' selected' : ''}>After the learner passes</option><option value="after_attempt"${q.reveal_feedback === 'after_attempt' ? ' selected' : ''}>After every attempt</option></select></label></div>
   <p class="lms-note">Each attempt draws the set number of questions from every objective (a retake prefers questions the learner has not seen). Questions marked life-safety (★) are mastery items: missing one fails the attempt whatever the score. Scoring happens on the server; learners never receive the answer key.</p>
   <div class="lms-card"><b>Bank</b>${Object.keys(byObj).length ? `<ul class="lms-list">${Object.entries(byObj).map(([o, n]) => `<li class="dim"><div class="lms-row sp"><span>${esc(o)}</span><span class="lms-note">${n} question${n === 1 ? '' : 's'}${q.draw_per_objective && n < q.draw_per_objective ? ' (fewer than drawn)' : ''}</span></div></li>`).join('')}</ul>` : '<span class="lms-note">No questions yet.</span>'}</div>
   <div class="lms-row"><button class="btn gold" type="submit">Save</button><button class="btn danger" type="button" data-lms="a-del-quiz">Delete the knowledge check</button><span class="lms-note" role="status" data-lms-msg></span></div></form>`;
}
function questionForm(c){
  const q = c.questions.find(x => x.id === A.sel.id); if (!q) return '<div class="lms-empty">Select something to edit.</div>';
  const opts = c.options[q.id] || [], key = (c.keys[q.id] || {}).correct_option_ids || [];
  return `<form class="lms-card lms-form" data-lms-form="a-question-save" novalidate><h3>Question</h3><input type="hidden" name="id" value="${esc(q.id)}">
   <label class="f" for="qq-prompt">Question<textarea class="i" id="qq-prompt" name="prompt" rows="2" required>${esc(q.prompt)}</textarea></label>
   <label class="f" for="qq-obj">Objective (questions are grouped by it; shown to a learner for a missed question, never the answer)<input class="i" id="qq-obj" name="objective" maxlength="200" value="${esc(q.objective || '')}"></label>
   <div class="lms-row"><label class="lms-check"><input type="checkbox" name="multi"${q.multi ? ' checked' : ''} data-lms-change-opts> More than one correct answer (select all that apply)</label><label class="lms-check"><input type="checkbox" name="critical"${q.critical ? ' checked' : ''}> Life-safety question (mastery: missing it fails the check)</label></div>
   <fieldset style="border:0;padding:0;margin:0;display:grid;gap:8px"><legend class="lms-note">Options. Mark the correct answer(s).</legend><div id="optRows" style="display:grid;gap:8px">${opts.map((o, i) => optRow(o.id, o.label, key.includes(o.id), i, q.multi)).join('')}</div><div><button class="btn soft tiny" type="button" data-lms="a-opt-add">Add an option</button></div></fieldset>
   <label class="f" for="qq-exp">Feedback for this question (shown after passing, or after every attempt if the check is set that way)<textarea class="i" id="qq-exp" name="explanation" rows="2">${esc((c.keys[q.id] || {}).explanation || '')}</textarea></label>
   ${moveBtns('question', q.id)}<div class="lms-row"><button class="btn gold" type="submit">Save question</button><button class="btn danger" type="button" data-lms="a-del-question" data-id="${esc(q.id)}">Delete question</button><span class="lms-note" role="status" data-lms-msg></span></div></form>`;
}
const optRow = (id, label, correct, i, multi) => `<div class="lms-row" data-opt data-id="${esc(id || '')}"><input type="${multi ? 'checkbox' : 'radio'}" name="correct" value="${i}"${correct ? ' checked' : ''} aria-label="Correct answer"><input class="i" style="flex:1;min-width:200px" name="opt-label" value="${esc(label || '')}" maxlength="300" aria-label="Option text"><button type="button" class="btn danger tiny" data-lms="a-opt-del">Remove</button></div>`;

// ---- activity (interactive item) editor
function itemRow(kind, o, key, i, regionsOn){
  const fb = (key.feedback || {})[o && o.id] || '';
  const correct = o && (kind === 'ordering' ? false : (key.correct_option_ids || []).includes(o.id));
  const r = (o && o.region) || {};
  const mark = kind === 'scenario' ? `<input type="radio" name="icorrect" value="${i}"${correct ? ' checked' : ''} aria-label="Correct option">` : (kind === 'multi' || kind === 'hotspot') ? `<input type="checkbox" name="icorrect" value="${i}"${correct ? ' checked' : ''} aria-label="Correct option">` : kind === 'ordering' ? `<span class="lms-note">${i + 1}.</span>` : '';
  return `<div class="lms-card" data-iopt data-id="${esc((o && o.id) || '')}"><div class="lms-optrow">${mark}<input class="i" style="flex:1;min-width:180px" name="ilabel" value="${esc((o && o.label) || '')}" maxlength="300" aria-label="${kind === 'ordering' ? 'Step' : kind === 'hotspot' ? 'Area name (also the list alternative)' : 'Option text'}">
    ${kind === 'ordering' ? `<button type="button" class="btn soft tiny" data-lms="a-iopt-move" data-idx="${i}" data-dir="-1">Up</button><button type="button" class="btn soft tiny" data-lms="a-iopt-move" data-idx="${i}" data-dir="1">Down</button>` : ''}<button type="button" class="btn danger tiny" data-lms="a-iopt-del">Remove</button></div>
    ${regionsOn ? `<div class="lms-optrow"><span class="lms-note">Place on the image (percent of width and height):</span><label class="f">X<input class="i" style="width:70px" name="rx" type="number" min="0" max="100" step="0.5" value="${esc(r.x ?? '')}"></label><label class="f">Y<input class="i" style="width:70px" name="ry" type="number" min="0" max="100" step="0.5" value="${esc(r.y ?? '')}"></label><label class="f">Width<input class="i" style="width:70px" name="rw" type="number" min="1" max="100" step="0.5" value="${esc(r.w ?? '')}"></label><label class="f">Height<input class="i" style="width:70px" name="rh" type="number" min="1" max="100" step="0.5" value="${esc(r.h ?? '')}"></label><button type="button" class="btn soft tiny" data-lms="a-hs-place" data-idx="${i}">Click the image to place</button></div>` : ''}
    ${kind === 'scenario' || kind === 'multi' || kind === 'hotspot' ? `<label class="f">Feedback shown when this option is chosen<input class="i" name="ifb" maxlength="400" value="${esc(fb)}"></label>` : ''}</div>`;
}
function itemForm(c){
  const it = c.items.find(x => x.id === A.sel.id); if (!it) return '<div class="lms-empty">Select something to edit.</div>';
  const lesson = c.lessons.find(l => l.id === it.lesson_id), isVideo = lesson && lesson.kind === 'video';
  const opts = c.itemOpts[it.id] || [], key = c.itemKeys[it.id] || { feedback:{}, correct_option_ids:[], correct_order:[] };
  const rows = it.kind === 'ordering' ? (key.correct_order || []).map(id => opts.find(o => o.id === id)).filter(Boolean).concat(opts.filter(o => !(key.correct_order || []).includes(o.id))) : opts;
  const hs = it.kind === 'hotspot', src = hs ? (it.media_url || (it.media_path && A.mediaUrls && A.mediaUrls[it.media_path]) || '') : '';
  if (hs && it.media_path && !(A.mediaUrls && A.mediaUrls[it.media_path])) { (A.mediaUrls = A.mediaUrls || {}); F.signedUrl(it.media_path, 3600).then(u => { A.mediaUrls[it.media_path] = u; F.rerender(); }).catch(() => {}); }
  const scored = !['poll', 'reflection'].includes(it.kind);
  return `<form class="lms-card lms-form" data-lms-form="a-item-save" novalidate><h3>Activity in "${esc(lesson ? lesson.title : '')}"</h3><input type="hidden" name="id" value="${esc(it.id)}">
   <div class="lms-fields"><label class="f" for="it-kind">Type<select class="i" id="it-kind" name="kind">${Object.entries(ITEM_KINDS).map(([k, n]) => `<option value="${k}"${it.kind === k ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
   ${isVideo ? `<label class="f" for="it-at">Video checkpoint at (seconds; blank = shown after the lesson)<input class="i" id="it-at" name="at_seconds" type="number" min="0" value="${esc(it.at_seconds ?? '')}"></label>` : '<input type="hidden" name="at_seconds" value="">'}
   ${it.kind === 'reflection' ? `<label class="f" for="it-min">Minimum length (characters)<input class="i" id="it-min" name="min_length" type="number" min="10" max="2000" value="${esc(it.min_length ?? 40)}"></label>` : '<input type="hidden" name="min_length" value="">'}</div>
   <label class="lms-check"><input type="checkbox" name="required"${it.required ? ' checked' : ''}> Required: the learner must finish it (a checkpoint always pauses the video)</label>
   <label class="f" for="it-prompt">Prompt<textarea class="i" id="it-prompt" name="prompt" rows="2" required>${esc(it.prompt)}</textarea></label>
   ${hs ? `<fieldset style="border:0;padding:0;margin:0;display:grid;gap:8px"><legend class="lms-note"><b>Image</b></legend>
     <label class="f" for="it-img">Upload the image (PNG, JPG or WebP)<input class="i" id="it-img" name="image" type="file" accept="image/png,image/jpeg,image/webp"></label>
     <label class="f" for="it-url">or an https image link<input class="i" id="it-url" name="media_url" type="url" value="${esc(it.media_url || '')}"></label>
     <label class="f" for="it-alt">Alt text: describe the picture for a learner who cannot see it (required)<textarea class="i" id="it-alt" name="alt_text" rows="2">${esc(it.alt_text || '')}</textarea></label>
     <div class="lms-hsbox" id="hsPreview">${src ? `<img src="${esc(src)}" alt="Preview of the image" id="hsImg">` : '<div class="lms-empty">No image yet.</div>'}${src ? opts.filter(o => o.region).map(o => `<span class="lms-hs on" style="left:${o.region.x}%;top:${o.region.y}%;width:${o.region.w}%;height:${o.region.h}%;pointer-events:none" title="${esc(o.label)}"></span>`).join('') : ''}</div>
     <p class="lms-note">Every area also appears as a checkbox in a list, so a learner can answer without the picture. ${A.hs.placing != null ? '<b>Now click the picture to place area ' + (A.hs.placing + 1) + '.</b>' : ''}</p></fieldset>` : '<input type="hidden" name="media_url" value=""><input type="hidden" name="alt_text" value="">'}
   <fieldset style="border:0;padding:0;margin:0;display:grid;gap:8px"><legend class="lms-note">${it.kind === 'ordering' ? 'Steps, listed in the CORRECT order (learners see them shuffled)' : it.kind === 'hotspot' ? 'Areas. Tick the ones that are hazards.' : it.kind === 'reflection' ? 'No options for a reflection' : it.kind === 'poll' ? 'Poll options' : 'Options. Mark the correct answer' + (it.kind === 'multi' ? 's.' : '.')}</legend>
    <div id="iOptRows" style="display:grid;gap:8px">${it.kind === 'reflection' ? '' : rows.map((o, i) => itemRow(it.kind, o, key, i, hs)).join('')}</div>${it.kind === 'reflection' ? '' : '<div><button class="btn soft tiny" type="button" data-lms="a-iopt-add">Add an option</button></div>'}</fieldset>
   ${scored ? `<div class="lms-fields"><label class="f" for="it-fbc">Feedback when the answer is right (optional)<input class="i" id="it-fbc" name="fb_correct" maxlength="400" value="${esc((key.feedback || {}).correct || '')}"></label><label class="f" for="it-fbi">Feedback when it is wrong (optional)<input class="i" id="it-fbi" name="fb_incorrect" maxlength="400" value="${esc((key.feedback || {}).incorrect || '')}"></label></div>
   <label class="f" for="it-exp">Explanation (shown only after a correct answer)<textarea class="i" id="it-exp" name="explanation" rows="2">${esc(key.explanation || '')}</textarea></label>` : ''}
   <div class="lms-row"><button class="btn gold" type="submit">Save activity</button><button class="btn danger" type="button" data-lms="a-del-item" data-id="${esc(it.id)}">Delete activity</button><span class="lms-note" role="status" data-lms-msg></span></div></form>`;
}
function obsForm(c){
  return `<div class="lms-card"><h3>Observation checklist</h3><p class="lms-note">After a learner completes the course, their director (or HQ) watches them do the skill and marks each item met or not, then records Pass or Needs practice with notes. When "State credit also requires a director observation" is on, state credit waits for a passed observation.</p>
   <form class="lms-form" data-lms-form="a-obs-save" novalidate><div id="obsRows" style="display:grid;gap:8px">${c.obs.map((o, i) => obsRow(o.id, o.text)).join('')}</div><div class="lms-row"><button class="btn soft tiny" type="button" data-lms="a-obs-add">Add a checklist item</button><button class="btn gold" type="submit">Save the checklist</button><span class="lms-note" role="status" data-lms-msg></span></div></form></div>`;
}
const obsRow = (id, text) => `<div class="lms-row" data-obs data-id="${esc(id || '')}"><input class="i" style="flex:1;min-width:220px" name="otext" maxlength="300" value="${esc(text || '')}" aria-label="Checklist item (what the director should see)"><button type="button" class="btn danger tiny" data-lms="a-obs-del">Remove</button></div>`;

V['learn-author'] = () => {
  const g = F.gate('learn-author', 'Course authoring', { hq:true }); if (g) return g;
  const sub = 'Create, review and publish the courses every program takes. Only headquarters staff can change anything here.';
  const id = typeof arg === 'string' ? arg : '';
  if (A.err) return F.shell('learn-author', 'Course authoring', sub, `<div class="lms-banner bad"><div>${esc(A.err)}</div></div>`);
  if (!id) {
    A.id = null;
    if (!A.list && !A.loading) A.loading = loadList().catch(e => { A.err = friendly(e); }).finally(() => { A.loading = null; F.rerender(); });
    return F.shell('learn-author', 'Course authoring', sub, A.list ? listBody() : '<div class="lms-card" role="status"><div class="lms-skel"></div></div>');
  }
  if (A.id !== id) { if (!A.cLoading) { A.cLoading = Promise.all([loadCourse(id), A.reqs ? null : loadReqs()]).then(() => { A.sel = { type:'course' }; A.problems = null; A.scorm = null; }).catch(e => { A.err = friendly(e); }).finally(() => { A.cLoading = null; F.rerender(); }); } return F.shell('learn-author', 'Course authoring', sub, '<div class="lms-card" role="status"><div class="lms-skel"></div></div>'); }
  const c = A.c;
  let panel = ({ course:courseForm, module:moduleForm, lesson:lessonForm, quiz:quizForm, question:questionForm, item:itemForm, obs:obsForm })[A.sel.type](c);
  if (frozen(c) && A.sel.type !== 'course') panel = `<div class="lms-banner warn"><div>This version is published and frozen. You are viewing it; to change it, create a new draft version under Course settings and publishing.</div></div><fieldset disabled style="border:0;padding:0;margin:0;min-width:0">${panel}</fieldset>`;
  const head = `<div class="lms-row sp"><div><a class="lms-link" href="#learn-author">All courses</a><h2 style="margin-top:4px">${esc(c.course.title)} <span class="lms-note">v${esc(c.course.version)}</span></h2></div><span>${statusChips(c.course)}</span></div>`;
  return F.shell('learn-author', 'Course authoring', sub, `${head}<div class="lms-edit">${treeHtml(c)}<div class="lms-stack">${panel}</div></div>`);
};

// ---------------------------------------------------------------- actions
const msgOf = form => form.querySelector('[data-lms-msg]');
const fail = (form, e) => { const m = msgOf(form); if (m) { m.textContent = friendly(e); m.style.color = 'var(--bad)'; } else say(friendly(e)); };
const done = (form, t) => { const m = msgOf(form); if (m) { m.textContent = t; m.style.color = 'var(--ok)'; } say(t); };
const nextPos = rows => rows.reduce((a, r) => Math.max(a, r.position), -1) + 1;
const numOrNull = v => (v === '' || v == null ? null : Number(v));

F.onForm('a-new', async form => {
  const f = form.elements, btn = form.querySelector('button[type=submit]');
  if (!f.title.value.trim()) return fail(form, { message:'Enter a title.' });
  F.busy(btn, true);
  const slug = `${slugify(f.code.value || f.title.value)}-${uuid().slice(0, 4)}`;
  const r = await L.sb.from('training_courses').insert({ slug, code:f.code.value.trim() || null, title:f.title.value.trim(), clock_hours:Number(f.hours.value || 0), track:f.track.value, kind:f.kind.value, states:[] }).select('id').single();
  if (r.error) { F.busy(btn, false); return fail(form, r.error); }
  const m = await L.sb.from('training_modules').insert({ course_id:r.data.id, position:0, title:'Module 1' }).select('id').single();
  if (!m.error) await L.sb.from('training_lessons').insert({ module_id:m.data.id, position:0, title:'Lesson 1', kind:'text', body:'' });
  A.list = null; A.c = null; A.id = null; go('learn-author', r.data.id);
});
F.on('a-sel', el => { A.sel = { type:el.dataset.type, id:el.dataset.id }; A.hs.placing = null; F.rerender(); window.scrollTo(0, 0); });
F.on('a-appr-add', () => { document.getElementById('apprRows').insertAdjacentHTML('beforeend', apprRow('', { status:'pending' })); });
F.on('a-appr-del', el => el.closest('[data-appr]').remove());
F.onForm('a-course-save', async form => {
  const f = form.elements, btn = form.querySelector('button[type=submit]'), fz = frozen(A.c);
  const states = f.states.value.split(/[,\s]+/).map(s => s.trim().toUpperCase()).filter(Boolean);
  if (states.some(s => !/^[A-Z]{2}$/.test(s))) return fail(form, { message:'States are two-letter codes, like KS, MO.' });
  const approvals = {};
  for (const row of form.querySelectorAll('[data-appr]')) { const st = row.querySelector('[name=appr-state]').value.trim().toUpperCase(), status = row.querySelector('[name=appr-status]').value, ref = row.querySelector('[name=appr-ref]').value.trim(), dt = row.querySelector('[name=appr-date]').value, ex = row.querySelector('[name=appr-exp]').value; if (!st && !ref) continue; if (!/^[A-Z]{2}$/.test(st)) return fail(form, { message:'Each state approval needs a two-letter state.' }); if (status === 'approved' && !ref) return fail(form, { message:'An approved state needs its approval number or reference.' }); approvals[st] = { status, ref:ref || null, approved_on:dt || null, expires_on:ex || null }; }
  F.busy(btn, true);
  const admin = { code:f.code.value.trim() || null, track:f.track.value, kind:f.kind.value, states, due_days_after_hire:f.due_days_after_hire.value === '' ? null : Number(f.due_days_after_hire.value), audience_roles:[...form.querySelectorAll('input[name=aud]:checked')].map(x => x.value), included_with_program:f.included_with_program.checked, auto_assign_on_hire:f.auto_assign_on_hire.checked, source_note:f.source_note.value.trim() || null, state_approvals:approvals };
  const content = fz ? {} : { title:f.title.value.trim(), clock_hours:Number(f.clock_hours.value || 0), summary:f.summary.value, enforce_active_time:f.enforce_active_time.checked, active_threshold_pct:Number(f.active_threshold_pct.value || 90), idle_minutes:Number(f.idle_minutes.value || 3), requires_observation:f.requires_observation.checked, learning_objectives:f.learning_objectives.value, skills_assessment:f.skills_assessment.value, content_areas:f.content_areas.value.split(',').map(s => s.trim()).filter(Boolean) };
  const r = await L.sb.from('training_courses').update(Object.assign(admin, content)).eq('id', A.id);
  F.busy(btn, false);
  if (r.error) return fail(form, r.error);
  A.list = null; await reloadCourse(); say('Saved.');
});
F.on('a-check', async () => { try { A.problems = must(await L.sb.rpc('training_course_problems', { p_course:A.id }), 'check'); F.rerender(); } catch(e) { say(friendly(e)); } });
F.onForm('a-signoff', async form => {
  const btn = form.querySelector('button[type=submit]'); F.busy(btn, true);
  const r = await L.sb.rpc('training_sign_off', { p_course:A.id, p_attestation:form.elements.attestation.value.trim() });
  F.busy(btn, false);
  if (r.error) return fail(form, r.error);
  await reloadCourse(); say('Signed off. This version can now be published.');
});
F.on('a-publish', async () => {
  const r = await L.sb.from('training_courses').update({ published:true }).eq('id', A.id);
  if (r.error) { const m = friendly(r.error); A.problems = m.replace(/^cannot publish:\s*/i, '').split(/(?<=\.)\s+/).filter(Boolean); F.rerender(); return say('Not published yet. See the list of problems.'); }
  A.list = null; await reloadCourse(); say('Published. This version is now frozen and learners can be assigned it.');
});
F.on('a-unpublish', async () => {
  if (!confirm('Unpublish this course? Learners lose access until it is published again.')) return;
  const r = await L.sb.from('training_courses').update({ published:false }).eq('id', A.id);
  if (r.error) return say(friendly(r.error)); A.list = null; await reloadCourse(); say('Unpublished.');
});
F.on('a-new-version', async () => {
  if (!confirm('Create a new draft version? Learners in progress stay on the version they started; the new version replaces this one when it is signed off and published.')) return;
  const r = await L.sb.rpc('training_new_version', { p_course:A.id });
  if (r.error) return say(friendly(r.error));
  A.list = null; A.c = null; A.id = null; say('New draft version created.'); go('learn-author', r.data);
});
F.on('a-delete', async () => {
  if (!confirm('Delete this draft course for good?')) return;
  const r = await L.sb.from('training_courses').delete().eq('id', A.id).select('id');
  if (r.error) return say(friendly(r.error.code === '23503' ? { message:'This course already has learners and cannot be deleted. Unpublish it instead.' } : r.error));
  if (!r.data || !r.data.length) return say('Only an unpublished draft can be deleted.');
  A.list = null; A.c = null; A.id = null; say('Deleted.'); go('learn-author');
});
F.onForm('a-map', async form => {
  const req = form.elements.req.value; if (!req) return;
  const r = await L.sb.from('compliance_requirement_courses').insert({ requirement_id:req, course_id:A.id });
  if (r.error) return say(friendly(r.error)); await reloadCourse(); say('Mapped.');
});
F.on('a-unmap', async el => { const r = await L.sb.from('compliance_requirement_courses').delete().eq('requirement_id', el.dataset.req).eq('course_id', A.id); if (r.error) return say(friendly(r.error)); await reloadCourse(); });

F.on('a-add-module', async () => {
  const c = A.c; const r = await L.sb.from('training_modules').insert({ course_id:A.id, position:nextPos(c.modules), title:'New module' }).select('id').single();
  if (r.error) return say(friendly(r.error)); await reloadCourse(); A.sel = { type:'module', id:r.data.id }; F.rerender();
});
F.onForm('a-module-save', async form => { const f = form.elements; const r = await L.sb.from('training_modules').update({ title:f.title.value.trim() }).eq('id', f.id.value); if (r.error) return fail(form, r.error); await reloadCourse(); say('Saved.'); });
F.on('a-del-module', async el => { if (!confirm('Delete this module and every lesson in it?')) return; const r = await L.sb.from('training_modules').delete().eq('id', el.dataset.id); if (r.error) return say(friendly(r.error)); A.sel = { type:'course' }; await reloadCourse(); });
F.on('a-add-lesson', async el => {
  const c = A.c, rows = c.lessons.filter(l => l.module_id === el.dataset.module);
  const r = await L.sb.from('training_lessons').insert({ module_id:el.dataset.module, position:nextPos(rows), title:'New lesson', kind:'text', body:'' }).select('id').single();
  if (r.error) return say(friendly(r.error)); await reloadCourse(); A.sel = { type:'lesson', id:r.data.id }; F.rerender();
});
F.onForm('a-lesson-save', async form => {
  const f = form.elements, btn = form.querySelector('button[type=submit]'), l = A.c.lessons.find(x => x.id === f.id.value);
  const kind = f.kind.value, url = f.video_url.value.trim(), cap = f.captions_url.value.trim();
  if (url && !/^https:\/\//i.test(url) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(url)) return fail(form, { message:'The video link must start with https://.' });
  if (cap && !/^https:\/\//i.test(cap) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(cap)) return fail(form, { message:'The caption link must start with https://.' });
  const patch = { title:f.title.value.trim(), kind, body:f.body.value, video_url:url || null, minutes:numOrNull(f.minutes.value), video_seconds:numOrNull(f.video_seconds.value), captions_url:cap || null, transcript:f.transcript.value.trim() || null };
  F.busy(btn, true);
  const file = f.file.files[0];
  if (file) {
    if (file.size > 25 * 1024 * 1024) { F.busy(btn, false); return fail(form, { message:'That file is larger than 25 MB.' }); }
    const safe = file.name.replace(/[^A-Za-z0-9._-]+/g, '_').slice(-80);
    const path = `courses/${A.id}/${uuid()}-${safe}`;
    const up = await L.sb.storage.from(F.BUCKET).upload(path, file, { contentType:file.type || 'application/octet-stream', upsert:false });
    if (up.error) { F.busy(btn, false); return fail(form, up.error); }
    patch.file_path = path; patch.file_name = file.name;
  }
  const r = await L.sb.from('training_lessons').update(patch).eq('id', l.id);
  F.busy(btn, false);
  if (r.error) return fail(form, r.error);
  await reloadCourse(); say('Saved.');
});
F.on('a-del-lesson', async el => { if (!confirm('Delete this lesson?')) return; const r = await L.sb.from('training_lessons').delete().eq('id', el.dataset.id); if (r.error) return say(friendly(r.error)); A.sel = { type:'course' }; await reloadCourse(); });
F.on('a-move', async el => {
  const c = A.c, kind = el.dataset.kind, id = el.dataset.id, dir = Number(el.dataset.dir);
  const table = { module:'training_modules', lesson:'training_lessons', question:'training_questions' }[kind];
  const rows = (kind === 'module' ? c.modules : kind === 'question' ? c.questions : c.lessons.filter(l => l.module_id === c.lessons.find(x => x.id === id).module_id)).slice().sort((a, b) => a.position - b.position);
  const i = rows.findIndex(r => r.id === id), j = i + dir;
  if (i < 0 || j < 0 || j >= rows.length) return;
  [rows[i], rows[j]] = [rows[j], rows[i]];
  for (let k = 0; k < rows.length; k++) { const r = await L.sb.from(table).update({ position:k }).eq('id', rows[k].id); if (r.error) return say(friendly(r.error)); }
  await reloadCourse();
});

// ---- knowledge check
F.on('a-add-quiz', async () => { const r = await L.sb.from('training_quizzes').insert({ course_id:A.id, position:0, title:'Knowledge check' }); if (r.error) return say(friendly(r.error)); await reloadCourse(); A.sel = { type:'quiz' }; F.rerender(); });
F.onForm('a-quiz-save', async form => {
  const f = form.elements;
  const r = await L.sb.from('training_quizzes').update({ title:f.title.value.trim(), passing_score:Number(f.passing_score.value), max_attempts:Number(f.max_attempts.value), draw_per_objective:numOrNull(f.draw_per_objective.value), cooldown_minutes:Number(f.cooldown_minutes.value || 0), reveal_feedback:f.reveal_feedback.value }).eq('id', f.id.value);
  if (r.error) return fail(form, r.error); await reloadCourse(); say('Saved.');
});
F.on('a-del-quiz', async () => { if (!confirm('Delete the knowledge check and all its questions?')) return; const r = await L.sb.from('training_quizzes').delete().eq('id', A.c.quizzes[0].id); if (r.error) return say(friendly(r.error)); A.sel = { type:'course' }; await reloadCourse(); });
F.on('a-add-question', async () => {
  const c = A.c, q = c.quizzes[0];
  const r = await L.sb.from('training_questions').insert({ quiz_id:q.id, position:nextPos(c.questions), prompt:'New question', objective:c.questions.length ? c.questions[c.questions.length - 1].objective : null }).select('id').single();
  if (r.error) return say(friendly(r.error));
  const o = await L.sb.from('training_options').insert([{ question_id:r.data.id, position:0, label:'Option A' }, { question_id:r.data.id, position:1, label:'Option B' }]).select('id');
  if (!o.error) await L.sb.from('training_answer_keys').insert({ question_id:r.data.id, correct_option_ids:[o.data[0].id] });
  await reloadCourse(); A.sel = { type:'question', id:r.data.id }; F.rerender();
});
F.on('a-opt-add', () => { const box = document.getElementById('optRows'); const multi = !!document.querySelector('input[name=multi]:checked'); box.insertAdjacentHTML('beforeend', optRow('', '', false, box.children.length, multi)); });
F.on('a-opt-del', el => { const box = document.getElementById('optRows'); if (box.children.length <= 2) return say('A question needs at least two options.'); el.closest('[data-opt]').remove(); [...box.children].forEach((r, i) => { r.querySelector('input[name=correct]').value = i; }); });
document.addEventListener('change', e => {
  const t = e.target.closest && e.target.closest('[data-lms-change-opts]'); if (!t) return;
  document.querySelectorAll('#optRows input[name=correct]').forEach(i => { i.type = t.checked ? 'checkbox' : 'radio'; });
});
F.onForm('a-question-save', async form => {
  const f = form.elements, btn = form.querySelector('button[type=submit]'), c = A.c, qid = f.id.value;
  const rows = [...form.querySelectorAll('[data-opt]')].map((r, i) => ({ id:r.dataset.id || '', label:r.querySelector('[name=opt-label]').value.trim(), i, correct:r.querySelector('[name=correct]').checked }));
  if (!f.prompt.value.trim()) return fail(form, { message:'Enter the question.' });
  if (rows.length < 2 || rows.some(r => !r.label)) return fail(form, { message:'Give every option text (at least two options).' });
  const right = rows.filter(r => r.correct);
  if (!right.length) return fail(form, { message:'Mark the correct answer.' });
  if (right.length > 1 && !f.multi.checked) return fail(form, { message:'More than one answer is marked correct: tick "More than one correct answer".' });
  F.busy(btn, true);
  try {
    must(await L.sb.from('training_questions').update({ prompt:f.prompt.value.trim(), objective:f.objective.value.trim() || null, critical:f.critical.checked, multi:f.multi.checked }).eq('id', qid), 'question');
    const keep = new Set(rows.filter(r => r.id).map(r => r.id));
    const drop = (c.options[qid] || []).filter(o => !keep.has(o.id)).map(o => o.id);
    if (drop.length) must(await L.sb.from('training_options').delete().in('id', drop), 'options');
    const ids = [];
    for (const r of rows) {
      if (r.id) { must(await L.sb.from('training_options').update({ label:r.label, position:r.i }).eq('id', r.id), 'option'); ids[r.i] = r.id; }
      else { const ins = must(await L.sb.from('training_options').insert({ question_id:qid, position:r.i, label:r.label }).select('id').single(), 'option'); ids[r.i] = ins.id; }
    }
    must(await L.sb.from('training_answer_keys').upsert({ question_id:qid, correct_option_ids:right.map(r => ids[r.i]), explanation:f.explanation.value.trim() || null }, { onConflict:'question_id' }), 'answer');
    await reloadCourse(); say('Saved.');
  } catch(e) { F.busy(btn, false); fail(form, e); }
});
F.on('a-del-question', async el => { if (!confirm('Delete this question?')) return; const r = await L.sb.from('training_questions').delete().eq('id', el.dataset.id); if (r.error) return say(friendly(r.error)); A.sel = { type:'quiz' }; await reloadCourse(); });

// ---- activities (touchpoints and video checkpoints)
F.on('a-add-item', async el => {
  const c = A.c, rows = c.items.filter(i => i.lesson_id === el.dataset.lesson);
  const r = await L.sb.from('training_items').insert({ lesson_id:el.dataset.lesson, position:nextPos(rows), kind:'scenario', prompt:'New activity' }).select('id').single();
  if (r.error) return say(friendly(r.error));
  const o = await L.sb.from('training_item_options').insert([{ item_id:r.data.id, position:0, label:'Option A' }, { item_id:r.data.id, position:1, label:'Option B' }]).select('id');
  if (!o.error) await L.sb.from('training_item_keys').insert({ item_id:r.data.id, correct_option_ids:[o.data[0].id] });
  await reloadCourse(); A.sel = { type:'item', id:r.data.id }; F.rerender();
});
F.on('a-iopt-add', () => {
  const form = document.querySelector('[data-lms-form="a-item-save"]'), kind = form.elements.kind.value, box = document.getElementById('iOptRows');
  box.insertAdjacentHTML('beforeend', itemRow(kind, null, { feedback:{}, correct_option_ids:[] }, box.children.length, kind === 'hotspot'));
});
F.on('a-iopt-del', el => { const box = document.getElementById('iOptRows'); if (box.children.length <= 2) return say('This activity needs at least two options.'); el.closest('[data-iopt]').remove(); });
F.on('a-iopt-move', el => {
  const box = document.getElementById('iOptRows'), row = el.closest('[data-iopt]'), dir = Number(el.dataset.dir);
  const sib = dir < 0 ? row.previousElementSibling : row.nextElementSibling; if (!sib) return;
  if (dir < 0) box.insertBefore(row, sib); else box.insertBefore(sib, row);
  [...box.children].forEach((r, i) => { const n = r.querySelector('.lms-note'); if (n && /^\d+\.$/.test(n.textContent)) n.textContent = (i + 1) + '.'; r.querySelectorAll('[data-idx]').forEach(b => { b.dataset.idx = i; }); });
});
F.on('a-hs-place', el => { A.hs.placing = Number(el.dataset.idx); say('Now click the picture where this area is.'); const p = document.getElementById('hsPreview'); if (p) p.scrollIntoView({ block:'center' }); });
document.addEventListener('click', e => {
  const box = e.target.closest && e.target.closest('#hsPreview'); if (!box || A.hs.placing == null) return;
  const img = box.querySelector('img'); if (!img) return;
  const r = img.getBoundingClientRect(), x = Math.max(0, Math.min(92, (e.clientX - r.left) / r.width * 100 - 4)), y = Math.max(0, Math.min(92, (e.clientY - r.top) / r.height * 100 - 4));
  const row = document.querySelectorAll('#iOptRows [data-iopt]')[A.hs.placing]; if (!row) return;
  row.querySelector('[name=rx]').value = x.toFixed(1); row.querySelector('[name=ry]').value = y.toFixed(1);
  if (!row.querySelector('[name=rw]').value) row.querySelector('[name=rw]').value = 8; if (!row.querySelector('[name=rh]').value) row.querySelector('[name=rh]').value = 8;
  A.hs.placing = null; say('Placed. Save the activity to keep it.');
});
F.onForm('a-item-save', async form => {
  const f = form.elements, btn = form.querySelector('button[type=submit]'), c = A.c, id = f.id.value, kind = f.kind.value;
  const rows = [...form.querySelectorAll('[data-iopt]')].map((r, i) => ({ id:r.dataset.id || '', label:r.querySelector('[name=ilabel]').value.trim(), i, correct:!!(r.querySelector('[name=icorrect]') && r.querySelector('[name=icorrect]').checked), fb:(r.querySelector('[name=ifb]') || { value:'' }).value.trim(),
    region:kind === 'hotspot' ? (r.querySelector('[name=rx]').value === '' ? null : { x:Number(r.querySelector('[name=rx]').value), y:Number(r.querySelector('[name=ry]').value), w:Number(r.querySelector('[name=rw]').value), h:Number(r.querySelector('[name=rh]').value) }) : null }));
  if (!f.prompt.value.trim()) return fail(form, { message:'Enter the prompt.' });
  if (kind !== 'reflection') {
    if (rows.length < 2 || rows.some(r => !r.label)) return fail(form, { message:'Give every option text (at least two options).' });
    if (kind === 'scenario' && rows.filter(r => r.correct).length !== 1) return fail(form, { message:'Mark exactly one correct option.' });
    if ((kind === 'multi' || kind === 'hotspot') && !rows.some(r => r.correct)) return fail(form, { message:'Mark at least one correct option.' });
    if (kind === 'hotspot' && rows.some(r => !r.region)) return fail(form, { message:'Place every area on the image (X, Y, width, height).' });
  } else if (Number(f.min_length.value || 0) < 10) return fail(form, { message:'A reflection needs a minimum length of at least 10 characters.' });
  const at = f.at_seconds.value === '' ? null : Number(f.at_seconds.value);
  F.busy(btn, true);
  try {
    const patch = { kind, prompt:f.prompt.value.trim(), required:f.required.checked, at_seconds:at, min_length:kind === 'reflection' ? Number(f.min_length.value) : null, media_url:kind === 'hotspot' ? (f.media_url.value.trim() || null) : null, alt_text:kind === 'hotspot' ? (f.alt_text.value.trim() || null) : null };
    const file = kind === 'hotspot' && f.image && f.image.files[0];
    if (kind !== 'hotspot') patch.media_path = null;
    else if (file) {
      if (file.size > 10 * 1024 * 1024) throw { message:'That image is larger than 10 MB.' };
      const ext = ({ 'image/png':'png', 'image/jpeg':'jpg', 'image/webp':'webp' })[file.type]; if (!ext) throw { message:'Use a PNG, JPG or WebP image.' };
      const path = `courses/${A.id}/${uuid()}.${ext}`;
      const up = await L.sb.storage.from(F.BUCKET).upload(path, file, { contentType:file.type, upsert:false }); if (up.error) throw up.error;
      patch.media_path = path; patch.media_url = null;
    } else if (patch.media_url) patch.media_path = null;
    must(await L.sb.from('training_items').update(patch).eq('id', id), 'activity');
    const ids = [];
    if (kind !== 'reflection') {
      const keep = new Set(rows.filter(r => r.id).map(r => r.id));
      const drop = (c.itemOpts[id] || []).filter(o => !keep.has(o.id)).map(o => o.id);
      if (drop.length) must(await L.sb.from('training_item_options').delete().in('id', drop), 'options');
      for (const r of rows) {
        const body = { label:r.label, position:r.i, region:r.region };
        if (r.id) { must(await L.sb.from('training_item_options').update(body).eq('id', r.id), 'option'); ids[r.i] = r.id; }
        else { const ins = must(await L.sb.from('training_item_options').insert(Object.assign({ item_id:id }, body)).select('id').single(), 'option'); ids[r.i] = ins.id; }
      }
    } else {
      const drop = (c.itemOpts[id] || []).map(o => o.id); if (drop.length) must(await L.sb.from('training_item_options').delete().in('id', drop), 'options');
    }
    if (['poll', 'reflection'].includes(kind)) { must(await L.sb.from('training_item_keys').delete().eq('item_id', id), 'key'); }
    else {
      const feedback = {}; rows.forEach(r => { if (r.fb) feedback[ids[r.i]] = r.fb; });
      if (f.fb_correct && f.fb_correct.value.trim()) feedback.correct = f.fb_correct.value.trim();
      if (f.fb_incorrect && f.fb_incorrect.value.trim()) feedback.incorrect = f.fb_incorrect.value.trim();
      must(await L.sb.from('training_item_keys').upsert({ item_id:id, correct_option_ids:kind === 'ordering' ? [] : rows.filter(r => r.correct).map(r => ids[r.i]), correct_order:kind === 'ordering' ? rows.map(r => ids[r.i]) : [], feedback, explanation:f.explanation ? (f.explanation.value.trim() || null) : null }, { onConflict:'item_id' }), 'key');
    }
    await reloadCourse(); say('Saved.');
  } catch(e) { F.busy(btn, false); fail(form, e); }
});
// changing the type re-draws the form for that type (the choice is saved at once; options and keys are checked when the activity is saved)
document.addEventListener('change', async e => {
  const t = e.target; if (!t || t.id !== 'it-kind') return;
  const form = t.closest('form'); if (!form || !A.c || frozen(A.c)) return;
  const r = await L.sb.from('training_items').update({ kind:t.value, prompt:form.elements.prompt.value.trim() || 'New activity' }).eq('id', form.elements.id.value);
  if (r.error) return say(friendly(r.error)); await reloadCourse();
});
F.on('a-del-item', async el => { if (!confirm('Delete this activity?')) return; const r = await L.sb.from('training_items').delete().eq('id', el.dataset.id); if (r.error) return say(friendly(r.error)); A.sel = { type:'course' }; await reloadCourse(); });

// ---- observation checklist
F.on('a-obs-add', () => { document.getElementById('obsRows').insertAdjacentHTML('beforeend', obsRow('', '')); });
F.on('a-obs-del', el => el.closest('[data-obs]').remove());
F.onForm('a-obs-save', async form => {
  const rows = [...form.querySelectorAll('[data-obs]')].map((r, i) => ({ id:r.dataset.id || '', text:r.querySelector('[name=otext]').value.trim(), i })).filter(r => r.text);
  const keep = new Set(rows.filter(r => r.id).map(r => r.id));
  try {
    const drop = A.c.obs.filter(o => !keep.has(o.id)).map(o => o.id); if (drop.length) must(await L.sb.from('training_observation_items').delete().in('id', drop), 'checklist');
    for (const r of rows) { if (r.id) must(await L.sb.from('training_observation_items').update({ text:r.text, position:r.i }).eq('id', r.id), 'checklist'); else must(await L.sb.from('training_observation_items').insert({ course_id:A.id, text:r.text, position:r.i }), 'checklist'); }
    await reloadCourse(); say('Checklist saved.');
  } catch(e) { fail(form, e); }
});

// ---- SCORM 1.2 export
F.on('a-scorm', async () => {
  const msg = document.getElementById('scormMsg'); const set = t => { if (msg) msg.textContent = t; };
  if (!window.FFScorm) return set('The SCORM builder is not loaded.');
  try {
    set('Building...');
    const bundle = must(await L.sb.rpc('training_scorm_bundle', { p_course:A.id }), 'export');
    const assets = {};
    for (const l of bundle.lessons) for (const it of l.items || []) {
      if (it.media_path && !assets[it.media_path]) { try { const u = await F.signedUrl(it.media_path, 600); assets[it.media_path] = new Uint8Array(await (await fetch(u)).arrayBuffer()); } catch(_) { /* the image stays out of the package */ } }
    }
    const pkg = window.FFScorm.buildPackage(bundle, { assets });
    const zipped = window.FFScorm.zip(pkg.files);
    if (A.scorm && A.scorm.url) URL.revokeObjectURL(A.scorm.url);
    A.scorm = { url:URL.createObjectURL(new Blob([zipped], { type:'application/zip' })), name:`${(A.c.course.slug || 'course')}-v${A.c.course.version}-scorm12.zip`, size:zipped.length };
    F.rerender(); say('SCORM package ready.');
  } catch(e) { set(friendly(e)); }
});

// ---- certificates
F.onForm('a-cert-find', async form => {
  const code = form.elements.code.value.trim().toUpperCase(); if (!code) return;
  const r = await L.sb.from('training_certificates').select('*').eq('code', code).maybeSingle();
  if (r.error) return fail(form, r.error); A.cert = r.data || 'none'; F.rerender();
});
F.onForm('a-cert-revoke', async form => {
  const f = form.elements; if (!confirm('Revoke this certificate? This cannot be undone.')) return;
  const r = await L.sb.rpc('training_revoke_certificate', { p_certificate:f.id.value, p_reason:f.reason.value.trim() });
  if (r.error) return fail(form, r.error);
  const again = await L.sb.from('training_certificates').select('*').eq('id', f.id.value).maybeSingle(); A.cert = again.data || 'none'; say('Revoked.'); F.rerender();
});
})();
