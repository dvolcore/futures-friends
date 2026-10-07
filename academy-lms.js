/* Futures Friends Academy LMS: core, learner dashboard, course player, certificates, public verification.
   Hub mode only: everything here talks to the Futures Hub (Supabase) through the session that hub-backend.js already
   holds. Every rule (who may see or change what, scoring, certificates, hours) is enforced in Postgres; this file only
   draws screens and calls the database. With no hub configured the training screens say so and nothing else happens.
   Sibling files: academy-lms-team.js (directors, HQ network), academy-lms-author.js (HQ course authoring),
   academy-lms-items.js (activities, video checkpoints, active time), academy-lms-author2.js and academy-lms-director2.js
   (v2 authoring and director tools), academy-scorm.js (SCORM 1.2 export). */
(function(){
'use strict';
const BUCKET = 'training-files';
const hub = () => window.FFHub;
const hubOn = () => !!(hub() && hub().configured);

// ---------------------------------------------------------------- small helpers
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $ = s => document.querySelector(s);
const pad = n => String(n).padStart(2,'0');
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmt = ymd => { if(!ymd) return ''; const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(ymd)); return m ? `${MONTHS[+m[2]-1]} ${+m[3]}, ${m[1]}` : String(ymd); };
const todayYmd = () => new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const daysBetween = (a,b) => { const t = s => Date.UTC(+s.slice(0,4), +s.slice(5,7)-1, +s.slice(8,10)); return Math.round((t(b)-t(a))/864e5); };
const num = (n, d=1) => { const x = Number(n); return Number.isFinite(x) ? (Math.round(x*10**d)/10**d).toString() : '0'; };
const hoursLabel = n => { const x = Number(n); return `${num(x, 2)} clock hour${x === 1 ? '' : 's'}`; };
const safeUrl = u => /^https?:\/\//i.test(String(u||'')) ? String(u) : '';
const ROLE_LABEL = {director:'Director', assistant_director:'Assistant director', owner_provider:'Owner / provider', lead_teacher:'Lead teacher', teacher:'Teacher', assistant_teacher:'Assistant teacher', floater:'Floater', substitute:'Substitute', aide:'Aide', cook:'Cook', driver:'Driver', volunteer:'Volunteer', other:'Other'};
const ROLES = Object.keys(ROLE_LABEL);
// Does this course's completion count toward the state's clock-hour rules? Only an approved, referenced, unexpired approval.
function approvalOf(course, state){
  const a = course && course.state_approvals && state ? course.state_approvals[state] : null;
  if (a && a.status === 'approved' && a.ref && (!a.expires_on || a.expires_on >= todayYmd())) return 'approved';
  if (a && a.status === 'pending') return 'pending';
  if (a && a.status === 'approved' && a.expires_on && a.expires_on < todayYmd()) return 'expired';
  return 'none';
}
const approvalChip = (course, state) => {
  if (!state) return '';
  const k = approvalOf(course, state);
  return k === 'approved' ? `<span class="lms-chip ok" title="Approved for ${esc(state)} clock hours">Counts toward ${esc(state)} hours</span>`
    : k === 'pending' ? `<span class="lms-chip warn" title="Approval requested; not yet granted">${esc(state)} approval pending</span>`
    : k === 'expired' ? `<span class="lms-chip warn">${esc(state)} approval expired</span>`
    : `<span class="lms-chip dim" title="Hours are recorded as Futures Friends hours until the state approves the course">Futures Friends hours only</span>`;
};
const STATUS = {complete:['Complete','ok'], due_soon:['Due soon','warn'], overdue:['Overdue','bad'], upcoming:['Not yet due','dim'], unknown_missing_data:['Missing data','dim']};
const FACILITY = {child_care_center:'Child care center', preschool:'Preschool', family_home:'Family child care home', group_home:'Group child care home', school_age:'School-age program', license_exempt_religious:'License-exempt religious program (Missouri)'};
const TRACK_COLOR = {foundations:'#2F6FC0', classroom:'#2E9E57', lead:'#E8761E', director:'#0A2B38', kitchen:'#C0392B', home:'#D9488B', trainer:'#B9820C', state:'#7B57C8'};

function must(res, what){
  if (res && res.error) { const e = new Error(res.error.message || what || 'Request failed'); e.code = res.error.code; throw e; }
  return res ? res.data : null;
}
const friendly = e => {
  const m = (e && e.message) || '';
  if (e && (e.code === 'P0001' || e.code === 'P0002' || e.code === '22023' || e.code === '23514')) return m;
  if (e && e.code === '42501') return /row-level security|permission denied/i.test(m) ? 'You do not have permission to do that.' : m;
  return m || 'That did not work. Try again in a moment.';
};
function say(m){ try { toast(m); } catch(_) { /* toast lives in views.js */ } }

// text format used by lessons: blank-line paragraphs, "## " headings, "- " bullets, **bold**
function md(text){
  const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const out = []; let list = null;
  const flush = () => { if (list) { out.push('<ul>' + list.map(li => `<li>${inline(li)}</li>`).join('') + '</ul>'); list = null; } };
  for (const raw of String(text||'').split('\n')) {
    const line = raw.trimEnd();
    if (!line.trim()) { flush(); continue; }
    let m;
    if ((m = /^##\s+(.*)$/.exec(line))) { flush(); out.push(`<h3>${inline(m[1])}</h3>`); }
    else if ((m = /^[-*]\s+(.*)$/.exec(line))) { (list = list || []).push(m[1]); }
    else { flush(); out.push(`<p>${inline(line)}</p>`); }
  }
  flush();
  return out.join('');
}

// ---------------------------------------------------------------- state
const L = { state:'init', sb:null, uid:null, email:null, isHQ:false, centers:[], center:null, profile:null, err:null, checkedAt:0, booting:null,
  dash:null, player:null, cert:null, verify:{code:'', res:null, busy:false} };
const handlers = {}; const formHandlers = {};
const FFLMS = window.FFLMS = {
  L, esc, md, fmt, todayYmd, daysBetween, num, safeUrl, must, friendly, say, ROLE_LABEL, ROLES, STATUS, FACILITY, TRACK_COLOR, BUCKET, hoursLabel,
  on:(name, fn) => { handlers[name] = fn; }, onForm:(name, fn) => { formHandlers[name] = fn; },
  rerender, boot, shell, gate, openDlg, closeDlg, signedUrl, courseLink: null,
  busy:(el, on) => { if (el) { el.disabled = !!on; el.setAttribute('aria-busy', on ? 'true' : 'false'); } },
  finished,
};
const routeOf = () => (typeof view === 'string' ? view : '');
function rerender(){ if (/^(learn|verify)/.test(routeOf())) render(); }

// ---------------------------------------------------------------- session and identity
async function boot(force){
  if (L.booting) return L.booting;
  if (!force && (L.state === 'ready' || L.state === 'off')) return;
  L.booting = (async () => {
    L.checkedAt = Date.now();
    if (!hubOn()) { L.state = 'off'; return; }
    try { await hub().ready; } catch(e) { L.state = 'error'; L.err = 'The sign-in library could not load. Check your connection and reload.'; return; }
    if (typeof hub().client !== 'function') { L.state = 'error'; L.err = 'The hub connection is out of date. Reload the page.'; return; }
    L.sb = hub().client();
    const { data:{ session } } = await L.sb.auth.getSession();
    if (!session) { L.state = 'signedout'; L.uid = null; return; }
    L.uid = session.user.id; L.email = session.user.email || '';
    const [hq, cs] = await Promise.all([L.sb.rpc('training_is_hq'), L.sb.rpc('compliance_my_centers')]);
    L.isHQ = hq.data === true;
    L.centers = cs.data || [];
    if (!L.centers.length) { L.state = 'nocenter'; return; }
    let want = null; try { want = sessionStorage.getItem('ff-lms-center'); } catch(_) {}
    L.center = L.centers.find(c => c.center_id === want) || L.centers.find(c => c.role !== 'hq') || L.centers[0];
    await loadProfile();
    L.state = 'ready';
  })().catch(e => { L.state = 'error'; L.err = friendly(e); }).finally(() => { L.booting = null; rerender(); });
  return L.booting;
}
async function loadProfile(){
  L.profile = null;
  const r = await L.sb.from('training_staff').select('*').eq('user_id', L.uid).eq('center_id', L.center.center_id).maybeSingle();
  L.profile = r.data || null;
}
const canManage = () => !!L.center && (L.center.role === 'director' || L.center.role === 'hq' || L.isHQ);
function setCenter(id){
  const c = L.centers.find(x => x.center_id === id); if (!c) return;
  L.center = c; try { sessionStorage.setItem('ff-lms-center', id); } catch(_) {}
  L.dash = null; L.player = null; if (FFLMS.resetTeam) FFLMS.resetTeam();
  loadProfile().then(rerender);
}
async function signedUrl(path, secs){
  const { data, error } = await L.sb.storage.from(BUCKET).createSignedUrl(path, secs || 3600);
  if (error) throw error; return data.signedUrl;
}

// ---------------------------------------------------------------- chrome
const statusChip = s => { const [t, c] = STATUS[s] || [s, 'dim']; return `<span class="lms-chip ${c}">${esc(t)}</span>`; };
const flagChip = () => '<span class="lms-chip flag" title="This rule has not been confirmed against the official source yet. Do not treat it as final.">Needs confirmation</span>';
FFLMS.statusChip = statusChip; FFLMS.flagChip = flagChip; FFLMS.approvalChip = approvalChip; FFLMS.approvalOf = approvalOf;

function tabsHtml(active){
  const t = [['learn','My training']];
  if (L.state === 'ready' && canManage()) t.push(['learn-team','Center compliance']);
  if (L.state === 'ready' && L.isHQ) t.push(['learn-author','Course authoring']);
  if (L.state === 'ready' && L.isHQ && V['learn-approve']) t.push(['learn-approve','Content approval']);
  t.push(['verify','Verify a certificate']);
  return `<nav class="lms-tabs" aria-label="Training">${t.map(([r,n]) => `<a href="#${r}"${active===r?' aria-current="page"':''}>${esc(n)}</a>`).join('')}</nav>`;
}
function centerPicker(){
  if (L.state !== 'ready' || L.centers.length < 2) return '';
  return `<label class="f" style="max-width:340px;margin-top:10px;color:#C6D7DD">Center<select class="i" data-lms-change="center">${L.centers.map(c => `<option value="${esc(c.center_id)}"${c.center_id===L.center.center_id?' selected':''}>${esc(c.name)}${c.role==='hq'?' (HQ view)':''}</option>`).join('')}</select></label>`;
}
function shell(active, title, sub, body){
  const who = L.state === 'ready' ? `Signed in as ${esc(L.profile ? L.profile.full_name : L.email)} at ${esc(L.center.name)}` : '';
  return `<div class="lms"><div class="lms-hero"><div class="wrap"><div class="eyebrow">Futures Friends Academy${who ? ' · ' + who : ''}</div><h1>${esc(title)}</h1>${sub ? `<p>${sub}</p>` : ''}${tabsHtml(active)}${centerPicker()}</div></div><div class="wrap lms-body">${body}</div></div>`;
}
const skeleton = () => '<div class="lms-card" role="status" aria-label="Loading"><div class="lms-skel" style="width:60%"></div><div class="lms-skel"></div><div class="lms-skel" style="width:80%"></div></div>';

// Common gate: returns {html} when the user cannot see the screen yet, or null when ready.
function gate(active, title, opts){
  opts = opts || {};
  if (L.state === 'init' || (L.state === 'signedout' && Date.now() - L.checkedAt > 2500)) { boot(true); if (L.state === 'init') return shell(active, title, '', skeleton()); }
  if (L.state === 'off') return shell(active, title, 'The training platform is part of the Futures Hub.', `<div class="lms-banner warn"><div><b>Training is not connected on this site.</b><p class="lms-note">This is the public preview. Programs sign in to the Futures Hub to take courses, track clock hours and keep up with state requirements. The Academy page describes the program.</p><p style="margin-top:8px"><button class="btn gold" type="button" data-go="academy">See the Academy</button></p></div></div>`);
  if (L.state === 'error') return shell(active, title, '', `<div class="lms-banner bad"><div><b>Could not open training.</b><p class="lms-note">${esc(L.err || 'Something went wrong.')}</p><p style="margin-top:8px"><button class="btn gold" type="button" data-lms="retry">Try again</button></p></div></div>`);
  if (L.state === 'signedout') return shell(active, title, 'Sign in with your staff account to see your courses, hours and deadlines.', `<div class="lms-banner"><div><b>You are not signed in.</b><p class="lms-note">Accounts are created by your center. There is no sign-up on this site.</p><p style="margin-top:8px"><button class="btn gold" type="button" data-go="signin-teacher">Teacher and staff sign-in</button></p></div></div>`);
  if (L.state === 'nocenter') return shell(active, title, '', `<div class="lms-banner warn"><div><b>Your account is not linked to a center yet.</b><p class="lms-note">Ask your center director to finish your invitation.</p></div></div>`);
  if (L.state !== 'ready') return shell(active, title, '', skeleton());
  if (opts.manage && !canManage()) return shell(active, title, '', `<div class="lms-banner warn"><div><b>This screen is for directors.</b><p class="lms-note">Your own training is under <a href="#learn">My training</a>.</p></div></div>`);
  if (opts.hq && !L.isHQ) return shell(active, title, '', `<div class="lms-banner warn"><div><b>This screen is for Futures Friends headquarters staff.</b></div></div>`);
  return null;
}
FFLMS.courseLink = (c, enrollments) => {
  const e = (enrollments || []).find(x => x.course_id === c.id && x.status !== 'completed');
  if (e) return `<a class="lms-link" href="#learn-course/${esc(e.id)}">${esc(c.title)}</a>`;
  return `${esc(c.title)}`;
};

// ---------------------------------------------------------------- dialog
function ensureDlg(){
  let d = $('#lmsDlg');
  if (!d) { d = document.createElement('dialog'); d.id = 'lmsDlg'; d.setAttribute('aria-labelledby', 'lmsDlgTitle'); d.innerHTML = '<div class="lms-dlg" id="lmsDlgBody"></div>'; document.body.appendChild(d); d.addEventListener('click', e => { if (e.target === d) d.close(); }); }
  return d;
}
function openDlg(html){ const d = ensureDlg(); $('#lmsDlgBody').innerHTML = html; try { d.showModal(); } catch(_) { d.setAttribute('open', ''); } }
function closeDlg(){ const d = $('#lmsDlg'); if (d && d.open) d.close(); }

// ---------------------------------------------------------------- learner dashboard
async function loadDash(){
  const sb = L.sb, uid = L.uid, c = L.center.center_id;
  const [enr, cert, hrs, ext, obl, cat] = await Promise.all([
    sb.from('training_enrollments').select('*, training_courses(id,title,code,clock_hours,summary,track,state_approvals)').eq('user_id', uid).eq('center_id', c).order('assigned_at', { ascending:false }),
    sb.from('training_certificates').select('*').eq('user_id', uid).order('issued_at', { ascending:false }),
    sb.from('training_hours').select('*').eq('user_id', uid).order('completed_on', { ascending:false }),
    sb.from('training_external').select('*').eq('user_id', uid).eq('center_id', c).order('created_at', { ascending:false }),
    sb.rpc('compliance_my_obligations'),
    sb.from('training_courses').select('id,title,code,clock_hours,summary,track,kind,states,audience_roles,state_approvals').order('code', { nullsFirst:false }),
  ]);
  const enrollments = must(enr, 'enrollments');
  const cids = [...new Set(enrollments.map(e => e.course_id))];
  const [les, prog] = cids.length ? await Promise.all([
    sb.from('training_lessons').select('id,course_id').in('course_id', cids),
    sb.from('training_lesson_progress').select('enrollment_id,lesson_id,completed_at').eq('user_id', uid),
  ]) : [{ data:[] }, { data:[] }];
  const lessonsBy = {}; (les.data || []).forEach(l => { (lessonsBy[l.course_id] = lessonsBy[l.course_id] || []).push(l.id); });
  const doneBy = {}; (prog.data || []).forEach(p => { if (p.completed_at) doneBy[p.enrollment_id] = (doneBy[p.enrollment_id] || 0) + 1; });
  for (const e of enrollments) { e.lessonCount = (lessonsBy[e.course_id] || []).length; e.lessonsDone = doneBy[e.id] || 0; }
  L.dash = { enrollments, certs:must(cert,'certificates'), hours:must(hrs,'hours'), external:must(ext,'outside training'), obligations:must(obl,'requirements'), catalog:must(cat,'catalog'), loadedAt:Date.now() };
}
const approvedForState = h => !!(L.center.state && (h.approved_states || []).includes(L.center.state));
function dueBadge(due){
  if (!due) return '';
  const d = daysBetween(todayYmd(), due);
  const cls = d < 0 ? 'bad' : d <= 7 ? 'warn' : 'dim';
  return `<span class="lms-chip ${cls}">${d < 0 ? `${-d} day${d===-1?'':'s'} overdue` : d === 0 ? 'Due today' : `Due in ${d} day${d===1?'':'s'}`} · ${esc(fmt(due))}</span>`;
}
function citationHtml(o){
  const bits = [];
  if (o.source_citation) bits.push(safeUrl(o.source_url) ? `<a class="lms-link" href="${esc(safeUrl(o.source_url))}" target="_blank" rel="noopener">${esc(o.source_citation)}</a>` : esc(o.source_citation));
  if (!bits.length) return '<span class="lms-note">No source on file.</span>';
  return `<span class="lms-note">Source: ${bits.join('')}</span>`;
}
function oblCourses(o, enrollments){
  if (!o.courses || !o.courses.length) return '';
  return `<div class="lms-note">Courses that count: ${o.courses.map(c => {
    const e = (enrollments || []).find(x => x.course_id === c.id && x.status !== 'completed');
    if (e) return `<a class="lms-link" href="#learn-course/${esc(e.id)}">${esc(c.title)}</a>`;
    if (c.enrollment === 'completed') return `${esc(c.title)} (completed)`;
    return `${esc(c.title)} <button class="lms-link" type="button" data-lms="enroll" data-course="${esc(c.id)}">add to my list</button>`;
  }).join(', ')}</div>`;
}
function oblItem(o, enrollments){
  const [, cls] = STATUS[o.status] || ['', 'dim'];
  const prog = o.unit === 'hours' && o.scope === 'staff' ? ` · ${num(o.progress)} of ${num(o.target)} hours counted` : '';
  return `<li class="${cls}"><div class="lms-row sp"><b>${esc(o.title)}</b><span class="lms-row">${statusChip(o.status)}${o.needs_confirmation ? flagChip() : ''}</span></div>
    <div class="lms-note">${esc(o.recurrence)}${o.due_date ? ` · due ${esc(fmt(o.due_date))}` : ''}${prog}${o.period_start && o.period_end ? ` · period ${esc(fmt(o.period_start))} to ${esc(fmt(o.period_end))}` : ''}</div>
    ${o.prorated ? `<div class="lms-note">Prorated for a mid-year hire: ${num(o.target)} hour${Number(o.target) === 1 ? '' : 's'} this year (one clock hour per month employed).</div>` : ''}
    ${o.quantity_other && !o.prorated ? `<div class="lms-note">Content requirement (not checked automatically): ${esc(o.quantity_other)}</div>` : ''}
    ${o.reason ? `<div class="lms-note"><b>Missing data:</b> ${esc(o.reason)}. Ask your director.</div>` : ''}
    ${o.deadline_rule ? `<div class="lms-note">Rule: ${esc(o.deadline_rule)}</div>` : ''}
    ${oblCourses(o, enrollments)}${citationHtml(o)}</li>`;
}
function courseCard(e){
  const c = e.training_courses || {};
  const pct = e.status === 'completed' ? 100 : e.lessonCount ? Math.round(100 * e.lessonsDone / e.lessonCount) : 0;
  const label = e.status === 'completed' ? 'Review' : e.status === 'in_progress' ? 'Continue' : 'Start';
  return `<div class="lms-card"><div class="lms-row sp"><h3>${esc(c.title || 'Course')}</h3>${e.status === 'completed' ? '<span class="lms-chip ok">Completed</span>' : e.status === 'in_progress' ? '<span class="lms-chip warn">In progress</span>' : '<span class="lms-chip dim">Not started</span>'}</div>
    <div class="lms-row"><span class="lms-note">${c.code ? esc(c.code) + ' · ' : ''}${hoursLabel(c.clock_hours)}</span>${approvalChip(c, L.center.state)}</div>
    <div class="lms-note">${e.assigned_via === 'self' ? ' · you added this' : e.assigned_via === 'auto' ? ' · assigned when you joined' : ' · assigned by ' + (e.assigned_via === 'hq' ? 'headquarters' : 'your director')}</div>
    <div class="lms-meter" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Progress"><i style="width:${pct}%"></i></div>
    <div class="lms-row sp"><span class="lms-note">${e.lessonsDone} of ${e.lessonCount} lessons${e.status !== 'completed' && e.due_date ? '' : ''}</span>${e.status !== 'completed' ? dueBadge(e.due_date) : ''}</div>
    <div><a class="btn ${e.status === 'completed' ? 'soft' : 'gold'}" href="#learn-course/${esc(e.id)}">${label}</a></div></div>`;
}
function hoursSection(d){
  const year = todayYmd().slice(0, 4);
  const thisYear = d.hours.filter(h => String(h.completed_on).startsWith(year));
  const total = thisYear.reduce((a, h) => a + Number(h.hours), 0);
  const appr = thisYear.filter(approvedForState).reduce((a, h) => a + Number(h.hours), 0);
  const byYear = {}; d.hours.forEach(h => { const y = String(h.completed_on).slice(0, 4); (byYear[y] = byYear[y] || []).push(h); });
  const years = Object.keys(byYear).sort().reverse();
  return `<section class="lms-sec" aria-labelledby="h-hours"><header><h2 id="h-hours">My training hours</h2><span class="lms-note">Calendar year ${esc(year)}: ${num(total, 2)} hours on record, ${num(appr, 2)} counted toward ${esc(L.center.state || 'your state')} requirements</span></header>
   ${d.hours.length ? years.map(y => `<div class="lms-tw"><table><caption class="sr">Hours earned in ${esc(y)}</caption><thead><tr><th>${esc(y)}</th><th>Source</th><th>Date</th><th class="n">Hours</th><th>Counts toward ${esc(L.center.state || 'state')}</th></tr></thead><tbody>${byYear[y].map(h => `<tr><td>${esc(h.title)}</td><td>${h.source === 'course' ? 'Futures course' : 'Outside training'}</td><td>${esc(fmt(h.completed_on))}</td><td class="n">${num(h.hours, 2)}</td><td>${approvedForState(h) ? '<span class="yes">Yes</span>' : '<span class="lms-note">Not state-approved</span>'}</td></tr>`).join('')}</tbody></table></div>`).join('') : '<div class="lms-empty">No hours yet. Finish a course or add outside training below.</div>'}
   <p class="lms-note">Futures Friends hours count toward a state's clock-hour rules only when that state has approved the course. Outside training counts when your director verifies it and marks it as state-approved.</p></section>`;
}
function externalSection(d){
  return `<section class="lms-sec" aria-labelledby="h-ext"><header><h2 id="h-ext">Outside training</h2><span class="lms-note">CPR, first aid, state courses, conferences: upload the certificate and your director verifies it.</span></header>
   <form class="lms-card lms-form" data-lms-form="ext-submit" novalidate><h3>Add a certificate</h3><div class="lms-fields">
    <label class="f" for="ex-title">Training title<input class="i" id="ex-title" name="title" required maxlength="160"></label>
    <label class="f" for="ex-prov">Provider<input class="i" id="ex-prov" name="provider" maxlength="160"></label>
    <label class="f" for="ex-date">Date completed<input class="i" id="ex-date" name="completed_on" type="date" required></label>
    <label class="f" for="ex-hours">Clock hours<input class="i" id="ex-hours" name="hours" type="number" min="0" max="200" step="0.25" required></label>
    <label class="f" for="ex-exp">Expires (if it does)<input class="i" id="ex-exp" name="expires_on" type="date"></label>
    <label class="f" for="ex-cat">Kind<select class="i" id="ex-cat" name="category"><option value="">Other</option><option value="first_aid_cpr">First aid or CPR</option><option value="health_safety">Health and safety</option><option value="child_development">Child development</option><option value="state_required">State-required course</option></select></label>
    <label class="f" for="ex-file">Certificate file (PDF or image, up to 25 MB)<input class="i" id="ex-file" name="file" type="file" accept="application/pdf,image/png,image/jpeg,image/webp" required></label></div>
    <div class="lms-row"><button class="btn gold" type="submit">Submit for verification</button><span class="lms-note" role="status" data-lms-msg></span></div></form>
   ${d.external.length ? `<div class="lms-tw"><table><thead><tr><th>Training</th><th>Date</th><th class="n">Hours</th><th>Status</th><th></th></tr></thead><tbody>${d.external.map(x => `<tr><td><b>${esc(x.title)}</b>${x.provider ? `<div class="lms-note">${esc(x.provider)}</div>` : ''}${x.review_note ? `<div class="lms-note">Director note: ${esc(x.review_note)}</div>` : ''}</td><td>${esc(fmt(x.completed_on))}${x.expires_on ? `<div class="lms-note">expires ${esc(fmt(x.expires_on))}</div>` : ''}</td><td class="n">${num(x.hours, 2)}</td><td>${x.status === 'verified' ? '<span class="lms-chip ok">Verified</span>' + (x.state_approved ? '<div class="lms-note">counts toward state hours</div>' : '') : x.status === 'rejected' ? '<span class="lms-chip bad">Not accepted</span>' : '<span class="lms-chip warn">Waiting for your director</span>'}</td><td>${x.status === 'pending' ? `<button class="btn soft tiny" type="button" data-lms="ext-withdraw" data-id="${esc(x.id)}">Withdraw</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : ''}</section>`;
}
function learnerBody(){
  const d = L.dash;
  if (!d) return skeleton();
  const today = todayYmd();
  const open = d.enrollments.filter(e => e.status !== 'completed');
  const done = d.enrollments.filter(e => e.status === 'completed');
  const overdueCourses = open.filter(e => e.due_date && e.due_date < today);
  const attention = [];
  for (const o of d.obligations) if (o.status === 'overdue' || o.status === 'due_soon') attention.push({ kind:'req', o, days:o.due_date ? daysBetween(today, o.due_date) : 0 });
  for (const e of open) if (e.due_date && daysBetween(today, e.due_date) <= 30) attention.push({ kind:'course', e, days:daysBetween(today, e.due_date) });
  attention.sort((a, b) => a.days - b.days);
  const year = today.slice(0, 4);
  const hrs = d.hours.filter(h => String(h.completed_on).startsWith(year)).reduce((a, h) => a + Number(h.hours), 0);
  const overdueReq = d.obligations.filter(o => o.status === 'overdue').length;
  const myCourseIds = new Set(open.map(e => e.course_id));
  const myRole = L.profile && L.profile.job_role;
  const browse = d.catalog.filter(c => !myCourseIds.has(c.id) && (!c.states.length || (L.center.state && c.states.includes(L.center.state))) && (!c.audience_roles.length || (myRole && c.audience_roles.includes(myRole))));
  const needProfile = !L.profile ? `<div class="lms-banner warn"><div><b>Your staff profile is not set up yet.</b><p class="lms-note">Your director adds your name, role and hire date. Until then you cannot be assigned courses or see deadlines.</p></div></div>` : '';
  const stateWarn = !L.center.state ? `<div class="lms-banner warn"><div><b>Your center has not set its state yet.</b><p class="lms-note">Your director sets the state and license type; then your state requirements and deadlines appear here.</p></div></div>` : '';
  return `${needProfile}${stateWarn}
  <div class="lms-tiles"><div class="lms-tile ${overdueReq + overdueCourses.length ? 'bad' : 'ok'}"><b>${overdueReq + overdueCourses.length}</b><span>overdue</span></div>
   <div class="lms-tile ${attention.length ? 'warn' : ''}"><b>${attention.length}</b><span>need attention in the next 30 days</span></div>
   <div class="lms-tile"><b>${num(hrs, 2)}</b><span>clock hours on record in ${esc(year)}</span></div>
   <div class="lms-tile"><b>${d.certs.filter(c => !c.revoked_at).length}</b><span>certificates</span></div></div>
  <section class="lms-sec" aria-labelledby="h-att"><header><h2 id="h-att">What needs your attention</h2></header>
   ${attention.length ? `<ul class="lms-list">${attention.map(a => a.kind === 'req' ? oblItem(a.o, d.enrollments) : `<li class="${a.days < 0 ? 'bad' : a.days <= 7 ? 'warn' : 'dim'}"><div class="lms-row sp"><b>${esc(a.e.training_courses.title)}</b><span class="lms-chip dim">Assigned course</span></div><div>${dueBadge(a.e.due_date)}</div><div><a class="btn gold tiny" href="#learn-course/${esc(a.e.id)}">${a.e.status === 'in_progress' ? 'Continue' : 'Start'}</a></div></li>`).join('')}</ul>` : '<div class="lms-empty">Nothing is due soon. Nice work.</div>'}</section>
  <section class="lms-sec" aria-labelledby="h-courses"><header><h2 id="h-courses">My courses</h2></header>
   ${open.length ? `<div class="lms-grid">${open.map(courseCard).join('')}</div>` : '<div class="lms-empty">No courses assigned right now. Browse the catalog below.</div>'}
   ${done.length ? `<details><summary class="lms-link">Completed courses (${done.length})</summary><div class="lms-grid" style="margin-top:12px">${done.map(courseCard).join('')}</div></details>` : ''}</section>
  <section class="lms-sec" aria-labelledby="h-req"><header><h2 id="h-req">Rules that apply to me</h2><span class="lms-note">${esc(L.center.state ? `${L.center.state} · ${FACILITY[L.center.facility_type] || ''}` : 'State not set')}</span></header>
   ${d.obligations.length ? `<ul class="lms-list">${d.obligations.map(o => oblItem(o, d.enrollments)).join('')}</ul><p class="lms-note">Anything marked "Needs confirmation" has not been confirmed against the official source yet and is shown for planning only.</p>` : `<div class="lms-empty">${L.center.state ? 'No requirements are loaded for your state and role yet.' : 'Set up the center state to see requirements.'}</div>`}</section>
  ${hoursSection(d)}
  <section class="lms-sec" aria-labelledby="h-cert"><header><h2 id="h-cert">My certificates</h2></header>
   ${d.certs.length ? `<ul class="lms-list">${d.certs.map(c => `<li class="${c.revoked_at ? 'bad' : 'ok'}"><div class="lms-row sp"><b>${esc(c.course_title)}</b>${c.revoked_at ? '<span class="lms-chip bad">Revoked</span>' : '<span class="lms-chip ok">Valid</span>'}</div><div class="lms-note">${esc(fmt(c.completed_on))} · ${num(c.clock_hours, 2)} clock hours · code ${esc(c.code)}</div><div><a class="btn soft tiny" href="#learn-cert/${esc(c.id)}">View and print</a></div></li>`).join('')}</ul>` : '<div class="lms-empty">Certificates appear here as soon as you pass a course.</div>'}</section>
  <section class="lms-sec" aria-labelledby="h-browse"><header><h2 id="h-browse">Add a course</h2></header>
   ${browse.length ? `<div class="lms-grid">${browse.map(c => `<div class="lms-card"><h3>${esc(c.title)}</h3><div class="lms-row"><span class="lms-note">${c.code ? esc(c.code) + ' · ' : ''}${hoursLabel(c.clock_hours)}</span>${approvalChip(c, L.center.state)}</div><p class="small">${esc((c.summary || '').slice(0, 220))}${(c.summary || '').length > 220 ? '...' : ''}</p><div><button class="btn soft tiny" type="button" data-lms="enroll" data-course="${esc(c.id)}">${d.enrollments.some(e => e.course_id === c.id) ? 'Take again' : 'Add to my list'}</button></div></div>`).join('')}</div>` : '<div class="lms-empty">You already have every course available to you.</div>'}</section>
  ${externalSection(d)}`;
}
V.learn = () => {
  const g = gate('learn', 'My training', ''); if (g) return g;
  if (!L.dash && !L.dashLoading) { L.dashLoading = loadDash().catch(e => { L.dashErr = friendly(e); }).finally(() => { L.dashLoading = null; rerender(); }); }
  const sub = L.profile ? `${esc(ROLE_LABEL[L.profile.job_role] || L.profile.job_role)} · hired ${esc(fmt(L.profile.hire_date) || 'date not set')}. Your courses, hours and the deadlines that apply to you.` : 'Your courses, hours and the deadlines that apply to you.';
  return shell('learn', 'My training', sub, L.dashErr ? `<div class="lms-banner bad"><div>${esc(L.dashErr)}</div></div>` : learnerBody());
};

// ---------------------------------------------------------------- course player
async function loadPlayer(id){
  const sb = L.sb;
  const p = L.player = { id, loading:true, err:null, enr:null, course:null, modules:[], lessons:[], progress:{}, quizzes:[], attempts:[], cert:null, cur:null, answers:{}, result:null, items:[], status:null, draw:null, lastDraw:null, observations:[] };
  try {
    const enr = must(await sb.from('training_enrollments').select('*').eq('id', id).maybeSingle(), 'enrollment');
    if (!enr) throw new Error('That course is not in your list.');
    if (enr.user_id !== L.uid) throw new Error('That course belongs to someone else.');
    p.enr = enr;
    const cid = enr.course_id;
    const [course, mods, les, prog, qz, att, ps] = await Promise.all([
      sb.from('training_courses').select('*').eq('id', cid).maybeSingle(),
      sb.from('training_modules').select('*').eq('course_id', cid).order('position'),
      sb.from('training_lessons').select('*').eq('course_id', cid).order('position'),
      sb.from('training_lesson_progress').select('*').eq('enrollment_id', id),
      sb.from('training_quizzes').select('*').eq('course_id', cid).order('position'),
      sb.from('training_quiz_attempts').select('*').eq('enrollment_id', id).order('submitted_at'),
      sb.rpc('training_player_state', { p_enrollment:id }),
    ]);
    p.course = must(course, 'course');
    if (!p.course) throw new Error('This course is not available right now.');
    p.modules = must(mods, 'modules');
    const lessons = must(les, 'lessons');
    const mpos = {}; p.modules.forEach(m => { mpos[m.id] = m.position; });
    p.lessons = lessons.sort((a, b) => (mpos[a.module_id] - mpos[b.module_id]) || (a.position - b.position));
    must(prog, 'progress').forEach(r => { p.progress[r.lesson_id] = r; });
    p.quizzes = must(qz, 'quizzes');
    p.attempts = must(att, 'attempts');
    const state = must(ps, 'activities');
    p.items = state.items; p.status = state.status;
    if (FFLMS.items) await FFLMS.items.afterLoad(p);
    if (enr.status === 'completed') {
      p.observations = must(await sb.from('training_observations').select('outcome,notes,observed_on').eq('enrollment_id', id).order('created_at'), 'observations');
      const comp = must(await sb.from('training_completions').select('id').eq('enrollment_id', id).maybeSingle(), 'completion');
      if (comp) p.cert = must(await sb.from('training_certificates').select('*').eq('completion_id', comp.id).maybeSingle(), 'certificate');
    }
    const firstOpen = p.lessons.findIndex(l => !(p.progress[l.id] && p.progress[l.id].completed_at));
    p.cur = enr.status === 'completed' ? 'done' : firstOpen >= 0 ? firstOpen : (p.quizzes.length ? 'quiz' : 0);
  } catch(e) { p.err = friendly(e); }
  p.loading = false; rerender();
}
const lessonDone = (p, l) => !!(p.progress[l.id] && p.progress[l.id].completed_at);
function embedFor(url, captions){   // captions: the lesson's .vtt link (D156); the <track> is added only when one is set
  const u = safeUrl(url); if (!u) return '';
  let m;
  if ((m = /^https:\/\/(?:www\.)?youtube\.com\/watch\?v=([\w-]{6,20})/.exec(u)) || (m = /^https:\/\/youtu\.be\/([\w-]{6,20})/.exec(u)) || (m = /^https:\/\/(?:www\.)?youtube(?:-nocookie)?\.com\/embed\/([\w-]{6,20})/.exec(u)))
    return `<div class="lms-video"><iframe src="https://www.youtube-nocookie.com/embed/${esc(m[1])}" title="Lesson video" allow="encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`;
  if ((m = /^https:\/\/(?:www\.)?vimeo\.com\/(\d+)/.exec(u)) || (m = /^https:\/\/player\.vimeo\.com\/video\/(\d+)/.exec(u)))
    return `<div class="lms-video"><iframe src="https://player.vimeo.com/video/${esc(m[1])}" title="Lesson video" allow="picture-in-picture" allowfullscreen></iframe></div>`;
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(u)) return `<div class="lms-video"><video controls preload="metadata" data-lms-video src="${esc(u)}">${captions && safeUrl(captions) ? `<track kind="captions" srclang="en" label="English" src="${esc(safeUrl(captions))}" default>` : ''}</video></div>`;
  return `<p><a class="btn soft" href="${esc(u)}" target="_blank" rel="noopener">Open the video in a new tab</a></p>`;
}
function outlineHtml(p){
  let html = '', lastMod = null, i = 0;
  for (const l of p.lessons) {
    if (l.module_id !== lastMod) { const m = p.modules.find(x => x.id === l.module_id); html += `<h4>${esc(m ? m.title : '')}</h4>`; lastMod = l.module_id; }
    const idx = i++, done = lessonDone(p, l);
    html += `<button type="button" data-lms="lesson-go" data-idx="${idx}"${p.cur === idx ? ' aria-current="true"' : ''}><span class="tick${done ? ' done' : ''}" aria-hidden="true">${done ? '✓' : ''}</span><span>${esc(l.title)}${done ? '<span class="sr"> (completed)</span>' : ''}</span></button>`;
  }
  if (p.quizzes.length) {
    const passed = p.quizzes.every(q => p.attempts.some(a => a.quiz_id === q.id && a.passed));
    html += `<h4>Check your learning</h4><button type="button" data-lms="lesson-go" data-idx="quiz"${p.cur === 'quiz' ? ' aria-current="true"' : ''}><span class="tick${passed ? ' done' : ''}" aria-hidden="true">${passed ? '✓' : ''}</span><span>Knowledge check${passed ? '<span class="sr"> (passed)</span>' : ''}</span></button>`;
  }
  if (p.enr.status === 'completed') html += `<h4>Finished</h4><button type="button" data-lms="lesson-go" data-idx="done"${p.cur === 'done' ? ' aria-current="true"' : ''}><span class="tick done" aria-hidden="true">✓</span><span>Certificate</span></button>`;
  if (FFLMS.items && p.enr.status !== 'completed') html += FFLMS.items.timeHtml(p) + FFLMS.items.todoHtml(p);
  return html;
}
function lessonHtml(p){
  const l = p.lessons[p.cur]; if (!l) return '<div class="lms-empty">This course has no lessons yet.</div>';
  const done = lessonDone(p, l), last = p.cur === p.lessons.length - 1, completedCourse = p.enr.status === 'completed';
  const X = FFLMS.items;
  let body = '';
  if (l.kind === 'video') body = (X && l.video_seconds ? X.videoHtml(p, l) : embedFor(l.video_url, l.captions_url) + (l.transcript ? `<details class="lms-transcript"><summary class="lms-link">Transcript</summary><div class="lms-prose">${md(l.transcript)}</div></details>` : '')) + (l.body ? `<div class="lms-prose">${md(l.body)}</div>` : '');
  else if (l.kind === 'file') body = (l.body ? `<div class="lms-prose">${md(l.body)}</div>` : '') + `<p><button class="btn soft" type="button" data-lms="open-file" data-path="${esc(l.file_path || '')}">Download ${esc(l.file_name || 'the file')}</button></p>`;
  else body = `<div class="lms-prose">${md(l.body)}</div>`;
  const activities = X ? X.lessonItemsHtml(p, l) : '';
  const block = X && !done && !completedCourse ? X.lessonBlock(p, l) : null;
  const nextLabel = last ? (p.quizzes.length && !completedCourse ? 'Mark complete and go to the knowledge check' : 'Mark complete') : 'Mark complete and continue';
  return `<article class="lms-lesson" aria-labelledby="ls-title"><div class="lms-row sp"><span class="lms-note">Lesson ${p.cur + 1} of ${p.lessons.length}${l.minutes ? ` · about ${l.minutes} min` : ''}</span>${done ? '<span class="lms-chip ok">Completed</span>' : ''}</div><h2 id="ls-title">${esc(l.title)}</h2>${body}${activities}
   <div class="lms-row sp" style="margin-top:6px"><div>${p.cur > 0 ? '<button class="btn soft" type="button" data-lms="lesson-prev">Previous</button>' : ''}</div><div class="lms-row">${done || completedCourse ? (last ? (p.quizzes.length && !completedCourse ? '<button class="btn gold" type="button" data-lms="lesson-go" data-idx="quiz">Go to the knowledge check</button>' : '') : '<button class="btn gold" type="button" data-lms="lesson-next">Next lesson</button>') : `<button class="btn gold" type="button" data-lms="lesson-complete" data-id="${esc(l.id)}"${block ? ' disabled aria-disabled="true"' : ''} aria-describedby="lmsLessonHint">${nextLabel}</button>`}</div></div><p class="lms-note" id="lmsLessonHint" role="status">${esc(block || '')}</p></article>`;
}
const timeLeft = iso => { const ms = new Date(iso).getTime() - Date.now(); return ms > 0 ? Math.ceil(ms / 60000) : 0; };
function startDraw(p){
  if (p.drawLoading) return; p.drawErr = null;
  p.drawLoading = L.sb.rpc('training_start_quiz', { p_enrollment:p.id, p_quiz:p.quizzes[0].id }).then(r => { if (r.error) throw r.error; p.draw = r.data; p.answers = {}; })
    .catch(e => { p.drawErr = friendly(e); }).finally(() => { p.drawLoading = null; rerender(); });
}
function reviewList(p, r){
  if (!r.review || !r.review.length || !p.lastDraw) return '';
  const byQ = Object.fromEntries(r.review.map(x => [x.question_id, x]));
  return `<div><b>Feedback on each question</b><ul>${p.lastDraw.questions.map((q, i) => { const x = byQ[q.id]; return x ? `<li><b>${i + 1}. ${x.correct ? 'Correct' : 'Not quite'}.</b> ${esc(q.prompt)}${x.explanation ? `<div class="lms-note">${esc(x.explanation)}</div>` : ''}</li>` : ''; }).join('')}</ul></div>`;
}
function quizHtml(p){
  const q = p.quizzes[0]; if (!q) return '';
  const my = p.attempts.filter(a => a.quiz_id === q.id);
  const passed = my.some(a => a.passed);
  const left = Math.max(0, q.max_attempts - my.length);
  const unfinished = p.lessons.filter(l => !lessonDone(p, l)).length;
  const r = p.result;
  const n = p.draw ? p.draw.questions.length : (r ? r.total : 0);
  let head = `<div class="lms-row sp"><span class="lms-note">${n ? `${n} questions${q.draw_per_objective ? ' drawn at random for this attempt' : ''} · ` : ''}pass mark ${q.passing_score} percent · ${left} of ${q.max_attempts} attempts left</span>${passed ? '<span class="lms-chip ok">Passed</span>' : ''}</div><h2 id="ls-title">${esc(q.title)}</h2>`;
  if (unfinished) return `<article class="lms-lesson">${head}<div class="lms-banner warn"><div><b>Finish the lessons first.</b><p class="lms-note">${unfinished} lesson${unfinished === 1 ? ' is' : 's are'} not marked complete yet.</p><p style="margin-top:8px"><button class="btn gold" type="button" data-lms="lesson-go" data-idx="${p.lessons.findIndex(l => !lessonDone(p, l))}">Go to the next lesson</button></p></div></div></article>`;
  const resultBox = r ? `<div class="lms-result ${r.passed ? 'pass' : 'fail'}" role="status" aria-live="polite"><div class="big">${esc(num(r.score_pct, 1))}%</div><b>${r.passed ? 'You passed.' : 'Not yet.'}</b><span>${r.correct} of ${r.total} correct. The pass mark is ${r.passing_score} percent.${r.critical_missed ? ` ${r.critical_missed} health or safety question${r.critical_missed === 1 ? ' was' : 's were'} missed. Every health and safety question must be right, so this attempt cannot pass.` : ''}${r.passed ? '' : ` You have ${r.attempts_left} attempt${r.attempts_left === 1 ? '' : 's'} left.`}</span>
     ${!r.passed && r.missed.length ? `<div><b>Review these topics, then try again:</b><ul>${[...new Set(r.missed.map(m => m.objective || 'A question'))].map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>` : ''}
     ${reviewList(p, r)}
     ${r.passed && r.certificate_code ? `<p>Your certificate is ready: <b>${esc(r.certificate_code)}</b></p>` : ''}
     ${r.passed && !r.completed ? `<p class="lms-note">Knowledge check passed. To finish the course you still need: ${esc((r.status && r.status.blockers || []).join(' ') || 'nothing')}</p>` : ''}
     ${!r.passed && r.next_attempt_at && timeLeft(r.next_attempt_at) ? `<p class="lms-note">You can try again in about ${timeLeft(r.next_attempt_at)} minute${timeLeft(r.next_attempt_at) === 1 ? '' : 's'}. Use the time to review the lessons.</p>` : ''}</div>` : '';
  if (passed && !r) return `<article class="lms-lesson">${head}<div class="lms-banner ok"><div><b>You passed this knowledge check.</b></div></div></article>`;
  if (r && r.passed) return `<article class="lms-lesson">${head}${resultBox}<div class="lms-row"><button class="btn gold" type="button" data-lms="lesson-go" data-idx="done">${p.enr.status === 'completed' ? 'See my certificate' : 'Back to the course'}</button></div></article>`;
  if (r && !r.passed) return `<article class="lms-lesson">${head}${resultBox}${left === 0 ? '<div class="lms-banner bad"><div><b>No attempts left.</b><p class="lms-note">Ask your director to reset this knowledge check.</p></div></div>' : `<div class="lms-row"><button class="btn gold" type="button" data-lms="quiz-retry">Try again with new questions</button></div>`}</article>`;
  if (left === 0) return `<article class="lms-lesson">${head}<div class="lms-banner bad"><div><b>No attempts left.</b><p class="lms-note">Ask your director to reset this knowledge check.</p></div></div></article>`;
  if (!p.draw) {
    if (!p.drawLoading && !p.drawErr) startDraw(p);
    if (p.drawErr) return `<article class="lms-lesson">${head}<div class="lms-banner warn"><div><b>${esc(p.drawErr)}</b><p style="margin-top:8px"><button class="btn soft" type="button" data-lms="quiz-retry">Try again</button></p></div></div></article>`;
    return `<article class="lms-lesson">${head}${skeleton()}</article>`;
  }
  const qHtml = p.draw.questions.map((qq, i) => {
    const type = qq.multi ? 'checkbox' : 'radio', cur = p.answers[qq.id];
    const has = id => qq.multi ? (cur || []).includes(id) : cur === id;
    return `<div class="lms-q"><fieldset><legend>${i + 1}. ${esc(qq.prompt)}${qq.critical ? ' <span class="lms-chip flag">Health or safety</span>' : ''}${qq.multi ? ' <span class="lms-note">Select all that apply.</span>' : ''}</legend>${qq.options.map(o => `<label><input type="${type}" name="q-${esc(qq.id)}" value="${esc(o.id)}" data-lms-answer="${esc(qq.id)}"${has(o.id) ? ' checked' : ''}><span>${esc(o.label)}</span></label>`).join('')}</fieldset></div>`;
  }).join('');
  return `<article class="lms-lesson">${head}<form data-lms-form="quiz-submit" novalidate><div class="lms-stack">${qHtml}</div><div class="lms-row" style="margin-top:12px"><button class="btn gold" type="submit">Submit answers</button><span class="lms-note">You must answer every question.</span></div></form></article>`;
}
function observationNote(p){
  const o = p.observations || [], last = o[o.length - 1];
  if (last && last.outcome === 'pass') return '<div class="lms-banner ok"><div><b>Observation passed.</b> Your director observed this skill on ' + esc(fmt(last.observed_on)) + '. Your hours can count toward state requirements.</div></div>';
  if (last) return `<div class="lms-banner warn"><div><b>Needs practice.</b> ${last.notes ? esc(last.notes) : ''} Your director will observe you again. State credit waits for a passed observation.</div></div>`;
  return '<div class="lms-banner warn"><div><b>Waiting for your director to observe you.</b> This course asks your director to watch you do the skill in your room. The hours count toward state requirements after a passed observation.</div></div>';
}
function certReviewLine(c){
  if (!c) return '';
  return `<p class="lms-note">Course version ${esc(c.course_version == null ? '1' : c.course_version)} · ${c.review_status === 'signed_off' ? `reviewed by ${esc(c.reviewer_name || '')}, reviewer of record${c.reviewed_at ? ' (' + esc(fmt(c.reviewed_at)) + ')' : ''}` : 'not reviewed by a reviewer of record (published before that step existed)'}</p>`;
}
function doneHtml(p){
  const c = p.cert;
  return `<article class="lms-lesson"><h2 id="ls-title">Course complete</h2><div class="lms-banner ok"><div><b>${esc(p.course.title)}</b><p class="lms-note">${hoursLabel(p.course.clock_hours)} recorded${p.enr.completed_at ? ' on ' + esc(fmt(p.enr.completed_at)) : ''}.</p></div></div>
    ${c ? `<div class="lms-row"><a class="btn gold" href="#learn-cert/${esc(c.id)}">View and print my certificate</a><span class="lms-note">Code ${esc(c.code)}</span></div>` : ''}
    ${p.course.requires_observation ? observationNote(p) : ''}
    ${certReviewLine(c)}
    <p class="lms-note">Hours from Futures Friends courses count toward your state's clock-hour rules only when the state has approved the course. Your hours page shows exactly what counts.</p>
    <div><a class="btn soft" href="#learn">Back to my training</a></div></article>`;
}
V['learn-course'] = () => {
  const g = gate('learn', 'Course', ''); if (g) return g;
  const id = (typeof arg === 'string' ? arg : '') || '';
  if (!L.player || L.player.id !== id) loadPlayer(id);
  const p = L.player;
  if (!p || p.loading) return shell('learn', 'Course', '', skeleton());
  if (p.err) return shell('learn', 'Course', '', `<div class="lms-banner bad"><div><b>${esc(p.err)}</b><p style="margin-top:8px"><a class="btn gold" href="#learn">Back to my training</a></p></div></div>`);
  const main = p.cur === 'quiz' ? quizHtml(p) : p.cur === 'done' ? doneHtml(p) : lessonHtml(p);
  const sub = `${p.course.code ? esc(p.course.code) + ' · ' : ''}${hoursLabel(p.course.clock_hours)}${L.center.state ? (approvalOf(p.course, L.center.state) === 'approved' ? ' · counts toward ' + esc(L.center.state) + ' clock hours' : ' · Futures Friends hours (not yet state-approved)') : ''}${p.enr.due_date && p.enr.status !== 'completed' ? ' · due ' + esc(fmt(p.enr.due_date)) : ''}`;
  return shell('learn', p.course.title, sub, `<div class="lms-player"><aside class="lms-outline" aria-label="Course outline">${outlineHtml(p)}<a class="lms-link" href="#learn">Back to my training</a></aside><div>${main}</div></div>`);
};
async function refreshAfter(p){
  const id = p.id; L.dash = null; L.player = null; await loadPlayer(id);
}
async function saveProgress(lessonId, complete, position){
  const p = L.player;
  const r = must(await L.sb.rpc('training_save_progress', { p_enrollment:p.id, p_lesson:lessonId, p_position:position == null ? null : Math.floor(position), p_complete:!!complete }), 'progress');
  if (complete) {
    p.progress[lessonId] = Object.assign({}, p.progress[lessonId], { lesson_id:lessonId, completed_at:new Date().toISOString() });
    if (r && r.completed) { await finished(p); return; }
    if (r && r.status) { p.status = r.status; }
  }
  return r;
}
async function finished(p){
  await refreshAfter(p); if (L.player) { L.player.cur = 'done'; rerender(); }
  say('Course complete. Your certificate is ready.');
}
FFLMS.on('lesson-go', el => { const p = L.player; if (!p) return; const i = el.dataset.idx; p.cur = /^\d+$/.test(i) ? +i : i; p.result = (i === 'quiz') ? p.result : null; rerender(); window.scrollTo(0, 0); });
FFLMS.on('lesson-prev', () => { const p = L.player; if (p && typeof p.cur === 'number' && p.cur > 0) { p.cur--; rerender(); window.scrollTo(0, 0); } });
FFLMS.on('lesson-next', () => { const p = L.player; if (p && typeof p.cur === 'number' && p.cur < p.lessons.length - 1) { p.cur++; rerender(); window.scrollTo(0, 0); } });
FFLMS.on('lesson-complete', async el => {
  const p = L.player; if (!p) return; FFLMS.busy(el, true);
  try {
    const wasLast = p.cur === p.lessons.length - 1;
    const doneBefore = p.enr.status === 'completed';
    await saveProgress(el.dataset.id, true);
    if (!L.player || L.player.cur === 'done') return;
    const q = L.player;
    if (wasLast && !doneBefore) q.cur = q.quizzes.length ? 'quiz' : q.cur; else if (!wasLast) q.cur = Math.min(q.cur + 1, q.lessons.length - 1);
    rerender(); window.scrollTo(0, 0);
  } catch(e) { say(friendly(e)); FFLMS.busy(el, false); }
});
FFLMS.on('open-file', async el => {
  try { const u = await signedUrl(el.dataset.path, 600); window.open(u, '_blank', 'noopener'); } catch(e) { say('Could not open that file.'); }
});
document.addEventListener('change', e => {
  const a = e.target.closest && e.target.closest('[data-lms-answer]');
  if (!a || !L.player) return;
  if (a.type === 'checkbox') { const cur = L.player.answers[a.dataset.lmsAnswer] || []; L.player.answers[a.dataset.lmsAnswer] = a.checked ? [...new Set([...cur, a.value])] : cur.filter(x => x !== a.value); }
  else L.player.answers[a.dataset.lmsAnswer] = a.value;
});
FFLMS.on('quiz-retry', () => { const p = L.player; if (!p) return; p.result = null; p.draw = null; p.drawErr = null; p.lastDraw = null; p.answers = {}; rerender(); });
FFLMS.onForm('quiz-submit', async (form) => {
  const p = L.player, q = p.quizzes[0], draw = p.draw;
  if (!draw) return;
  const missing = draw.questions.filter(x => !(Array.isArray(p.answers[x.id]) ? p.answers[x.id].length : p.answers[x.id]));
  if (missing.length) { say(`Answer every question first (${missing.length} left).`); return; }
  const btn = form.querySelector('button[type=submit]'); FFLMS.busy(btn, true);
  try {
    const answers = {}; draw.questions.forEach(x => { answers[x.id] = Array.isArray(p.answers[x.id]) ? p.answers[x.id] : [p.answers[x.id]]; });
    const r = must(await L.sb.rpc('training_submit_quiz', { p_enrollment:p.id, p_quiz:q.id, p_answers:answers }), 'quiz');
    const att = must(await L.sb.from('training_quiz_attempts').select('*').eq('enrollment_id', p.id).order('submitted_at'), 'attempts');
    p.attempts = att; p.result = r; p.lastDraw = draw; p.draw = null; if (r.status) p.status = r.status;
    if (r.passed) { L.dash = null; const id = p.id; const result = r, last = draw; await loadPlayer(id); if (L.player) { L.player.cur = 'quiz'; L.player.result = result; L.player.lastDraw = last; L.player.attempts = att.length ? att : L.player.attempts; rerender(); } say(r.completed ? 'You passed. Your certificate is ready.' : 'You passed this knowledge check.'); }
    else { p.answers = {}; rerender(); window.scrollTo(0, 0); }
  } catch(e) { say(friendly(e)); FFLMS.busy(btn, false); }
});
// resume position and periodic save for video files
document.addEventListener('loadedmetadata', e => {
  const v = e.target; if (!v || !v.matches || !v.matches('video[data-lms-video]') || !L.player) return;
  const l = L.player.lessons[L.player.cur]; const pr = l && L.player.progress[l.id];
  if (pr && pr.position_seconds > 5 && pr.position_seconds < (v.duration || 1e9) - 5) v.currentTime = pr.position_seconds;
}, true);
let lastSave = 0;
document.addEventListener('timeupdate', e => {
  const v = e.target; if (!v || !v.matches || !v.matches('video[data-lms-video]') || !L.player) return;
  const now = Date.now(); if (now - lastSave < 15000) return; lastSave = now;
  const l = L.player.lessons[L.player.cur]; if (l) L.sb.rpc('training_save_progress', { p_enrollment:L.player.id, p_lesson:l.id, p_position:Math.floor(v.currentTime), p_complete:false }).then(() => {});
}, true);
document.addEventListener('ended', e => {
  const v = e.target; if (v && v.matches && v.matches('video[data-lms-video]')) say('Video finished. Mark the lesson complete when you are ready.');
}, true);

// ---------------------------------------------------------------- enrolling and outside training
FFLMS.on('enroll', async el => {
  FFLMS.busy(el, true);
  try { must(await L.sb.rpc('training_enroll_self', { p_course:el.dataset.course, p_center:L.center.center_id }), 'enroll'); L.dash = null; say('Added to your list.'); rerender(); }
  catch(e) { say(friendly(e)); FFLMS.busy(el, false); }
});
FFLMS.on('retry', () => { L.state = 'init'; boot(true); rerender(); });
FFLMS.onForm('ext-submit', async (form) => {
  const f = form.elements, file = f.file.files[0], msg = form.querySelector('[data-lms-msg]');
  const bad = t => { msg.textContent = t; msg.style.color = 'var(--bad)'; };
  if (!f.title.value.trim() || !f.completed_on.value || f.hours.value === '' || !file) return bad('Add the title, date, hours and the certificate file.');
  if (Number(f.hours.value) < 0 || Number(f.hours.value) > 200) return bad('Hours must be between 0 and 200.');
  if (file.size > 25 * 1024 * 1024) return bad('That file is larger than 25 MB.');
  const ext = ({ 'application/pdf':'pdf', 'image/png':'png', 'image/jpeg':'jpg', 'image/webp':'webp' })[file.type];
  if (!ext) return bad('Use a PDF, PNG, JPG or WebP file.');
  const btn = form.querySelector('button[type=submit]'); FFLMS.busy(btn, true); msg.style.color = ''; msg.textContent = 'Uploading...';
  const path = `external/${L.center.center_id}/${L.uid}/${crypto.randomUUID()}.${ext}`;
  try {
    const up = await L.sb.storage.from(BUCKET).upload(path, file, { contentType:file.type, upsert:false });
    if (up.error) throw up.error;
    const ins = await L.sb.from('training_external').insert({ center_id:L.center.center_id, title:f.title.value.trim(), provider:f.provider.value.trim() || null, category:f.category.value || null, completed_on:f.completed_on.value, hours:Number(f.hours.value), expires_on:f.expires_on.value || null, file_path:path });
    if (ins.error) { await L.sb.storage.from(BUCKET).remove([path]); throw ins.error; }
    L.dash = null; say('Submitted. Your director will verify it.'); rerender();
  } catch(e) { bad(friendly(e)); FFLMS.busy(btn, false); }
});
FFLMS.on('ext-withdraw', async el => {
  if (!confirm('Withdraw this entry?')) return;
  try {
    const row = L.dash.external.find(x => x.id === el.dataset.id);
    must(await L.sb.from('training_external').delete().eq('id', el.dataset.id), 'withdraw');
    if (row) await L.sb.storage.from(BUCKET).remove([row.file_path]);
    L.dash = null; say('Withdrawn.'); rerender();
  } catch(e) { say(friendly(e)); }
});

// ---------------------------------------------------------------- certificate (printable)
async function loadCert(id){
  L.cert = { id, loading:true };
  try {
    const c = must(await L.sb.from('training_certificates').select('*').eq('id', id).maybeSingle(), 'certificate');
    if (!c) throw new Error('That certificate was not found, or it is not yours to see.');
    const co = await L.sb.from('training_courses').select('track').eq('id', c.course_id).maybeSingle();
    L.cert = { id, cert:c, track:co.data ? co.data.track : null };
  } catch(e) { L.cert = { id, err:friendly(e) }; }
  rerender();
}
V['learn-cert'] = () => {
  const g = gate('learn', 'Certificate', ''); if (g) return g;
  const id = (typeof arg === 'string' ? arg : '') || '';
  if (!L.cert || L.cert.id !== id) loadCert(id);
  const s = L.cert;
  if (!s || s.loading) return shell('learn', 'Certificate', '', skeleton());
  if (s.err) return shell('learn', 'Certificate', '', `<div class="lms-banner bad"><div><b>${esc(s.err)}</b><p style="margin-top:8px"><a class="btn gold" href="#learn">Back to my training</a></p></div></div>`);
  const c = s.cert, url = `${location.origin}${location.pathname}#verify/${c.code}`;
  return shell('learn', 'Certificate', 'Print this page or choose "Save as PDF" in the print dialog.', `<div class="lms-cert-wrap"><div class="lms-row"><button class="btn gold" type="button" data-lms="cert-print">Print or save as PDF</button><a class="btn soft" href="#learn">Back to my training</a></div>
   <div class="lms-cert${c.revoked_at ? ' revoked' : ''}" style="--cc:${TRACK_COLOR[s.track] || '#2F6FC0'}" role="img" aria-label="Futures Friends completion record for ${esc(c.holder_name)}, ${esc(c.course_title)}">
    <div class="eyebrow" style="color:#B9820C">Futures Friends Academy</div><h2>Completion Record</h2><div>This records that</div><div class="nm">${esc(c.holder_name)}</div><div>has completed</div><div class="cr">${esc(c.course_title)}</div>
    <div>${esc(fmt(c.completed_on))} · ${num(c.clock_hours, 2)} training hours recorded by Futures Friends</div>
    <div class="lms-cert-rev">Course version ${esc(c.course_version == null ? '1' : c.course_version)} · ${c.review_status === 'signed_off' ? `Reviewer of record: ${esc(c.reviewer_name || '')}${c.reviewed_at ? ', ' + esc(fmt(c.reviewed_at)) : ''}` : 'Not reviewed by a reviewer of record'}</div>
    <div class="code">${esc(c.code)}</div><small>Verify this record at ${esc(url)}. This is a Futures Friends completion record, not state-approved training credit. Whether a state counts these hours toward its own requirements depends on that state's approval of the course and is not implied by this record.</small></div></div>`);
};
FFLMS.on('cert-print', () => window.print());

// ---------------------------------------------------------------- public verification (works signed out)
async function runVerify(code){
  const cfg = window.FF_HUB;
  L.verify.busy = true; L.verify.res = null; rerender();
  try {
    if (!cfg || !cfg.url || !cfg.anonKey) { L.verify.res = { off:true }; }
    else {
      const r = await fetch(String(cfg.url).replace(/\/+$/, '') + '/rest/v1/rpc/training_verify_certificate_v2', { method:'POST', headers:{ apikey:cfg.anonKey, Authorization:'Bearer ' + cfg.anonKey, 'Content-Type':'application/json' }, body:JSON.stringify({ p_code:code }) });
      if (!r.ok) throw new Error('The verification service did not answer.');
      const rows = await r.json();
      L.verify.res = rows && rows.length ? { row:rows[0] } : { none:true };
    }
  } catch(e) { L.verify.res = { err:e.message || 'Could not verify right now.' }; }
  L.verify.busy = false; rerender();
}
V.verify = () => {
  const code = (typeof arg === 'string' ? arg : '').trim();
  if (code && L.verify.code !== code) { L.verify.code = code; runVerify(code); }
  const r = L.verify.res;
  let result = '';
  if (L.verify.busy) result = '<div class="res" role="status">Checking...</div>';
  else if (r && r.off) result = '<div class="res bad"><b>Verification is not connected on this site.</b><p class="lms-note">The public verification service is part of the Futures Hub.</p></div>';
  else if (r && r.err) result = `<div class="res bad"><b>${esc(r.err)}</b></div>`;
  else if (r && r.none) result = `<div class="res bad" role="status"><b>No certificate matches ${esc(L.verify.code)}.</b><p class="lms-note">Check the code for typing mistakes. Codes look like FF-1234-ABCD-5678-EF90.</p></div>`;
  else if (r && r.row) {
    const x = r.row;
    result = `<div class="res ${x.valid ? 'ok' : 'bad'}" role="status"><div class="lms-row"><span class="lms-chip ${x.valid ? 'ok' : 'bad'}">${x.valid ? 'Valid certificate' : 'This certificate has been revoked'}</span></div><dl><dt>Name</dt><dd>${esc(x.holder_name)}</dd><dt>Course</dt><dd>${esc(x.course_title)}</dd><dt>Completed</dt><dd>${esc(fmt(x.completed_on))}</dd><dt>Clock hours</dt><dd>${num(x.clock_hours, 2)}</dd><dt>Issued</dt><dd>${esc(fmt(x.issued_at))}</dd><dt>Course version</dt><dd>${esc(x.course_version == null ? '1' : x.course_version)}</dd><dt>Reviewed by</dt><dd>${x.review_status === 'signed_off' ? `${esc(x.reviewer_name || '')}${x.reviewed_at ? ' (' + esc(fmt(x.reviewed_at)) + ')' : ''}` : 'Not reviewed by a reviewer of record'}</dd></dl><p class="lms-note">This page shows only the name, course, date, hours, course version, reviewer and whether the certificate is valid. Whether a state counts the hours toward its own requirements is for that state to decide.</p></div>`;
  }
  const body = `<div class="lms-verify"><form class="lms-card lms-form" data-lms-form="verify-go" novalidate><label class="f" for="vcode">Certificate code<input class="i" id="vcode" name="code" value="${esc(L.verify.code)}" placeholder="FF-1234-ABCD-5678-EF90" autocomplete="off" spellcheck="false" style="text-transform:uppercase"></label><div><button class="btn gold" type="submit">Verify</button></div></form>${result}</div>`;
  return `<div class="lms"><div class="lms-hero"><div class="wrap"><div class="eyebrow">Futures Friends Academy</div><h1>Verify a certificate</h1><p>Anyone can check that a Futures Friends completion certificate is real. It is a Futures Friends record, not state-approved training credit.</p>${tabsHtml('verify')}</div></div><div class="wrap lms-body">${body}</div></div>`;
};
FFLMS.onForm('verify-go', async form => {
  const code = form.elements.code.value.trim().toUpperCase();
  if (!code) return;
  L.verify.code = ''; go('verify', code);
});

// ---------------------------------------------------------------- events
document.addEventListener('click', async e => {
  const t = e.target.closest && e.target.closest('[data-lms]');
  if (!t) return;
  const fn = handlers[t.dataset.lms];
  if (fn) { e.preventDefault(); try { await fn(t, e); } catch(err) { say(friendly(err)); } }
});
document.addEventListener('submit', async e => {
  const f = e.target.closest && e.target.closest('[data-lms-form]');
  if (!f) return;
  e.preventDefault();
  const fn = formHandlers[f.dataset.lmsForm];
  if (fn) { try { await fn(f, e); } catch(err) { say(friendly(err)); } }
});
document.addEventListener('change', e => {
  const t = e.target.closest && e.target.closest('[data-lms-change]');
  if (t && t.dataset.lmsChange === 'center') setCenter(t.value);
});

// ---------------------------------------------------------------- entry points
// A "My training" link in the top utility bar once someone is signed in to the hub.
function addNavLink(){
  const box = document.querySelector('.px-utility .wrap > div');
  if (!box || box.querySelector('[data-lms-nav]')) return;
  const a = document.createElement('a'); a.href = '#learn'; a.className = 'px-link'; a.textContent = 'My training'; a.setAttribute('data-lms-nav', '');
  box.appendChild(a);
}
if (hubOn()) {
  boot(true).then(() => { if (L.state === 'ready') addNavLink(); });
  window.addEventListener('hashchange', () => { if (L.state === 'signedout' || L.state === 'init') boot(true).then(() => { if (L.state === 'ready') addNavLink(); }); });
}
})();
