/* Futures Friends Academy: content approval console (#learn-approve, W3D). Needs academy-lms.js.
   Unit 1's daily-program records load as drafts: nothing reaches teachers or families until a reviewer of record approves it.
   Here a reviewer reads each record as the teacher will see it (every age version, materials, prompts, the family continuation and
   the kitchen prompt), sees what changed since the previous version, and approves it, approves a whole day, or sends it back with a
   comment. The same screen lists training course versions waiting for sign-off (the LMS v2 sign-off, training_sign_off).
   Every rule is the database's (migration 20261011400000_content_approval.sql): only a reviewer of record signed in with two-step
   verification can decide; a decision names the reviewer and the exact text (its hash) and the time; an approved version never
   changes (a correction is a new version); a whole day is approved all or nothing; a release can require two different reviewers
   (on by default for life-safety training). This file only draws the screen and calls those functions. Decisions need a live
   connection (they check the text the reviewer saw against the current text), so there is no offline waiting list here. */
(function(){
'use strict';
const F = window.FFLMS; if (!F || typeof V === 'undefined') return;
const { L, esc, must, say } = F;
const ROUTE = 'learn-approve', TITLE = 'Content approval';
const BLOCK = { arrival:'Arrival', circle:'Morning circle', 'picture-talk':'Picture-talk story', 'friends-live':'Friends Live', activity:'Connected activity',
  outside:'Outdoor activity', move:'Movement', zones:'Learning zones', story:'Read-aloud', meal:'Eat the Rainbow at the table', reset:'Reset',
  family:'Family share (optional)', goodbye:'Closing and take-home' };
const BAND = [['infant','Infants'], ['toddler','Toddlers'], ['twos','Twos'], ['threes','Threes'], ['prek','Pre-K']];
const FRIEND = { booker:'Booker', lumi:'Lumi', zuri:'Zuri', bop:'Bop' };
const WEEKDAY = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const MEDIA = { ready:['ok','Ready'], draft:['warn','Draft'], unavailable:['bad','Not produced yet'] };
const ATTEST = 'I reviewed every lesson, activity, answer key, caption or transcript and the learning objectives in this exact version, and I approve it for use.';
const AP = { tab:'program', rel:null, q:null, qErr:null, qLoading:null, open:null, day:null, dayErr:null, dayLoading:null, confirm:false,
  tq:null, tqErr:null, tqLoading:null, reviewers:null, ask:null };

const blockName = b => BLOCK[b] || String(b || '').replace(/-/g, ' ');
const at = s => { try { return new Intl.DateTimeFormat('en-US', { timeZone:'America/Chicago', month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit' }).format(new Date(s)); } catch(_) { return String(s || ''); } };
const dayNo = (w, d) => (w - 1) * 5 + d;
const chip = (cls, t) => `<span class="lms-chip ${cls}">${esc(t)}</span>`;
const mine = list => (list || []).some(a => a.reviewer_id === (AP.q && AP.q.me));

// ---------------------------------------------------------------- loading
function loadQueue(){
  if (AP.qLoading) return;
  AP.qLoading = (async () => {
    AP.q = must(await L.sb.rpc('program_review_queue', { p_release:AP.rel }), 'review queue'); AP.rel = AP.q.release; AP.qErr = null;
    if (!AP.reviewers) { const r = await L.sb.from('training_reviewers').select('display_name'); AP.reviewers = (r.data || []).map(x => x.display_name); }
  })().catch(e => { AP.qErr = F.friendly(e); }).finally(() => { AP.qLoading = null; F.rerender(); });
}
function loadDay(){
  if (!AP.open || AP.dayLoading) return;
  const { w, d } = AP.open;
  AP.dayLoading = (async () => { AP.day = { w, d, list:must(await L.sb.rpc('program_review_day', { p_release:AP.rel, p_week:w, p_day:d }), 'day') }; AP.dayErr = null; })()
    .catch(e => { AP.dayErr = F.friendly(e); }).finally(() => { AP.dayLoading = null; F.rerender(); });
}
function loadTraining(){
  if (AP.tqLoading) return;
  AP.tqLoading = (async () => { AP.tq = must(await L.sb.rpc('review_training_queue'), 'training queue'); AP.tqErr = null; })()
    .catch(e => { AP.tqErr = F.friendly(e); }).finally(() => { AP.tqLoading = null; F.rerender(); });
}
const refresh = () => { AP.q = null; AP.day = null; AP.confirm = false; loadQueue(); };

// ---------------------------------------------------------------- record status
function state(r){
  if (r.status === 'approved') return ['ok', 'Approved'];
  const cr = r.change_request, n = (r.approvals || []).length, need = AP.q && AP.q.requires_two ? 2 : 1;
  if (n > 0 && n < need) return ['warn', `${n} of ${need} approvals`];
  if (cr && cr.on_this_text) return ['bad', 'Changes requested'];
  return ['dim', cr ? 'Revised: waiting for review' : 'Waiting for review'];
}

// ---------------------------------------------------------------- what the teacher sees
const ul = (a, empty) => (a && a.length) ? `<ul class="ap-ul">${a.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : `<p class="lms-note">${esc(empty)}</p>`;
function preview(r){
  const ad = r.age_adaptations || {}, hc = r.home_continuation;
  const bands = BAND.filter(([k]) => ad[k]).map(([k, n]) => `<li><b>${esc(n)}:</b> ${esc(ad[k])}</li>`).join('');
  const media = (r.media || []).map(m => { const s = MEDIA[m.status] || ['dim', m.status]; return `<li>${esc(m.type)}: <code>${esc(m.ref)}</code> ${chip(s[0], s[1])}</li>`; }).join('');
  return `<div class="ap-prev">
   <p class="lms-note">${esc(blockName(r.block))} · ${r.duration_min_estimate ? `about ${esc(r.duration_min_estimate)} min (estimate)` : 'runs during the meal'} · ${esc(FRIEND[r.character] || r.character)} (${esc((r.pillars || []).join(' + '))})</p>
   <p><b>Objective:</b> ${esc(r.objective)}</p>
   <div><h5>Each age version</h5>${bands ? `<ul class="ap-ul">${bands}</ul>` : '<p class="lms-note">No age versions.</p>'}</div>
   <div class="ap-cols"><div><h5>Materials</h5>${ul(r.materials, 'No materials listed.')}</div><div><h5>Say or ask</h5>${ul(r.prompts, 'No prompts listed.')}</div></div>
   <div><h5>Another way to join</h5>${ul(r.participation_alternatives, 'No alternative written.')}</div>
   ${media ? `<div><h5>Printables and media</h5><ul class="ap-ul">${media}</ul></div>` : ''}
   <div class="ap-note"><b>Kitchen prompt:</b> ${r.kitchen_prompt ? esc(r.kitchen_prompt) : '<span class="lms-note">none</span>'}</div>
   <div class="ap-note"><b>Family continuation:</b> ${hc && hc.title ? `"${esc(hc.title)}"${ul(hc.steps, '')}<span class="lms-note">From home: ${esc((hc.materials_from_home || []).join('; ') || 'nothing extra')}</span>` : '<span class="lms-note">none</span>'}</div>
   <p class="lms-note">Learning Steps: ${esc((r.learning_steps || []).join(', ') || 'none')} · Sources: ${esc((r.sources || []).join('; '))}</p></div>`;
}

// ---------------------------------------------------------------- what changed since the previous version
const FIELDS = [['theme','Theme'], ['objective','Objective'], ['block','Block'], ['character','Lead friend'], ['pillars','Pillars'],
  ['duration_min_estimate','Minutes (estimate)'], ['age_adaptations','Age versions'], ['materials','Materials'], ['prompts','Say or ask'],
  ['participation_alternatives','Another way to join'], ['media','Printables and media'], ['kitchen_prompt','Kitchen prompt'],
  ['home_continuation','Family continuation'], ['learning_steps','Learning Steps'], ['sources','Sources']];
const SUB = { twos:'Twos', threes:'Threes', prek:'Pre-K', infant:'Infants', toddler:'Toddlers', title:'Title', steps:'Steps', materials_from_home:'From home' };
const str = x => x == null ? '' : typeof x === 'object' ? (x.ref ? `${x.type}: ${x.ref} (${x.status})` : JSON.stringify(x)) : String(x);
function diffVal(a, b){
  if (Array.isArray(a) || Array.isArray(b)) {
    const A = (a || []).map(str), B = (b || []).map(str);
    const gone = A.filter(x => !B.includes(x)), added = B.filter(x => !A.includes(x));
    if (!gone.length && !added.length) return '<p class="lms-note">Same items, new order.</p>';
    return `<ul class="ap-ul">${gone.map(x => `<li><del>${esc(x)}</del></li>`).join('')}${added.map(x => `<li><ins>${esc(x)}</ins></li>`).join('')}</ul>`;
  }
  if ((a && typeof a === 'object') || (b && typeof b === 'object')) {
    const A = a || {}, B = b || {};
    return [...new Set([...Object.keys(A), ...Object.keys(B)])].filter(k => JSON.stringify(A[k]) !== JSON.stringify(B[k]))
      .map(k => `<div class="ap-sub"><span class="lms-note">${esc(SUB[k] || k)}</span>${diffVal(A[k], B[k])}</div>`).join('') || '<p class="lms-note">Removed.</p>';
  }
  return `<p>${a != null && a !== '' ? `<del>${esc(str(a))}</del> ` : ''}${b != null && b !== '' ? `<ins>${esc(str(b))}</ins>` : '<span class="lms-note">(removed)</span>'}</p>`;
}
function diff(prev, cur){
  const rows = FIELDS.filter(([k]) => JSON.stringify(prev[k]) !== JSON.stringify(cur[k])).map(([k, n]) => `<div class="ap-d"><b>${esc(n)}</b>${diffVal(prev[k], cur[k])}</div>`);
  return rows.length ? rows.join('') : '<p class="lms-note">No content changes, only the version number.</p>';
}

// ---------------------------------------------------------------- one record in the open day
function recordCard(x){
  const r = x.record || {}, q = AP.q, s = state(Object.assign({}, x, { change_request:(q.records.find(y => y.id === x.id) || {}).change_request }));
  const pending = x.status === 'draft', iApproved = mine(x.approvals), need = q.requires_two ? 2 : 1;
  const ask = AP.ask === x.id;
  const appr = (x.approvals || []).length ? `<p class="lms-note">Approved on this text by ${x.approvals.map(a => `${esc(a.name)} (${esc(at(a.at))})`).join(', ')}${pending ? `; ${need - x.approvals.length} more needed` : ''}.</p>` : '';
  const hist = (x.reviews || []).map(v => `<li><b>${v.decision === 'approve' ? 'Approved' : 'Changes requested'}</b> · v${esc(v.version)} · ${esc(v.name)} · ${esc(at(v.at))}${v.on_this_text ? '' : ' · <span class="lms-note">on earlier text</span>'}${v.comment ? `<blockquote class="lms-quote">${esc(v.comment)}</blockquote>` : ''}</li>`).join('');
  let actions = '';
  if (pending && q.can_review) {
    actions = `<div class="lms-row ap-actions">${iApproved ? `<span class="lms-note">You approved this text. A different reviewer must approve it too.</span>`
        : `<button class="btn gold" type="button" data-lms="ap-approve" data-id="${esc(x.id)}" data-v="${esc(x.version)}" data-sha="${esc(x.review_sha)}">Approve version ${esc(x.version)}</button>`}
      ${ask ? '' : `<button class="btn soft" type="button" data-lms="ap-ask" data-id="${esc(x.id)}">Request changes</button>`}</div>
     ${ask ? `<form class="lms-form ap-ask" data-lms-form="ap-changes" data-id="${esc(x.id)}" data-v="${esc(x.version)}" data-sha="${esc(x.review_sha)}" novalidate>
       <label class="f" for="ap-c-${esc(x.id)}">What needs to change (kept with your name and the time; the record stays a draft)<textarea class="i" id="ap-c-${esc(x.id)}" name="comment" rows="3" required minlength="3" maxlength="2000"></textarea></label>
       <div class="lms-row"><button class="btn navy" type="submit">Send back with this comment</button><button class="btn soft" type="button" data-lms="ap-ask" data-id="">Cancel</button></div></form>` : ''}`;
  } else if (pending) actions = '<p class="lms-note">Only a reviewer of record, signed in with two-step verification, can approve or send back a record.</p>';
  return `<article class="lms-card ap-rec" id="ap-${esc(x.id)}" aria-labelledby="ap-t-${esc(x.id)}">
   <div class="lms-row sp"><div style="min-width:0"><span class="lms-note">${esc(blockName(x.block))} · ${esc(x.id)} · version ${esc(x.version)}</span><h3 id="ap-t-${esc(x.id)}" style="margin:2px 0 0">${esc(r.theme)}</h3></div>${chip(s[0], s[1])}</div>
   ${x.status === 'approved' ? `<p class="lms-note">Approved ${esc(at(x.approved_at))}. Approved versions never change; a correction is loaded as a new version.</p>` : ''}
   ${appr}
   ${x.previous ? `<details class="ap-det" open><summary>What changed since version ${esc(x.previous.version)} (${esc(x.previous.status)})</summary>${diff(x.previous.record || {}, r)}</details>` : '<p class="lms-note">First version: nothing to compare with.</p>'}
   <details class="ap-det"${x.previous ? '' : ' open'}><summary>What the teacher sees</summary>${preview(r)}</details>
   ${hist ? `<details class="ap-det"><summary>Decisions (${(x.reviews || []).length})</summary><ul class="ap-ul">${hist}</ul></details>` : ''}
   ${actions}</article>`;
}

// ---------------------------------------------------------------- program tab
function weeksGrid(){
  const q = AP.q, byDay = {};
  for (const r of q.records) (byDay[`${r.week}-${r.day}`] = byDay[`${r.week}-${r.day}`] || []).push(r);
  const weeks = [...new Set(q.records.map(r => r.week))].sort((a, b) => a - b);
  return weeks.map(w => `<div class="ap-week"><h4>Week ${esc(w)}</h4><div class="ap-days">${[1, 2, 3, 4, 5].map(d => {
    const rs = byDay[`${w}-${d}`]; if (!rs) return '';
    const ok = rs.filter(r => r.status === 'approved').length, back = rs.filter(r => state(r)[1] === 'Changes requested').length, wait = rs.length - ok - back;
    const cur = AP.open && AP.open.w === w && AP.open.d === d;
    return `<button type="button" class="ap-day${ok === rs.length ? ' done' : ''}" data-lms="ap-open" data-w="${w}" data-d="${d}"${cur ? ' aria-current="true"' : ''}>
      <b>Day ${dayNo(w, d)}</b><span>${esc(WEEKDAY[d] || '')}</span><span class="ap-counts">${ok}/${rs.length} approved${wait ? ` · ${wait} waiting` : ''}${back ? ` · ${back} sent back` : ''}</span></button>`;
  }).join('')}</div></div>`).join('');
}
function dayPanel(){
  if (!AP.open) return '<div class="lms-empty">Choose a day to read and approve its records.</div>';
  const { w, d } = AP.open;
  if (AP.dayErr) return `<div class="lms-banner bad"><div>${esc(AP.dayErr)}</div></div>`;
  if (!AP.day || AP.day.w !== w || AP.day.d !== d) { loadDay(); return '<div class="lms-card" role="status"><div class="lms-skel"></div></div>'; }
  const list = AP.day.list, pending = list.filter(x => x.status === 'draft'), q = AP.q;
  const canDay = q.can_review && pending.length && pending.some(x => !mine(x.approvals));
  const head = `<div class="lms-row sp ap-dayhead"><div><h3 style="margin:0">Day ${dayNo(w, d)} · Week ${w}, ${esc(WEEKDAY[d] || '')}</h3><span class="lms-note">${list.length} records · ${pending.length} waiting${q.requires_two ? ' · two different reviewers must approve each record' : ''}</span></div>
    ${canDay ? (AP.confirm ? `<div class="lms-row"><span class="lms-note">Approve all ${pending.length} waiting records on Day ${dayNo(w, d)} as you see them now?</span><button class="btn gold" type="button" data-lms="ap-day">Yes, approve the whole day</button><button class="btn soft" type="button" data-lms="ap-day-cancel">Cancel</button></div>`
      : `<button class="btn gold" type="button" data-lms="ap-day-ask">Approve whole day (${pending.length})</button>`) : ''}</div>`;
  return head + list.map(recordCard).join('');
}
function programBody(){
  if (AP.qErr) return `<div class="lms-banner bad"><div><b>Could not open the review queue.</b><p class="lms-note">${esc(AP.qErr)}</p></div></div>`;
  if (!AP.q) { loadQueue(); return '<div class="lms-card" role="status"><div class="lms-skel"></div></div>'; }
  const q = AP.q;
  if (!q.records.length) return '<div class="lms-empty">No program records are loaded yet. The content team loads them with hub/scripts/load-program.mjs.</div>';
  const ok = q.records.filter(r => r.status === 'approved').length, back = q.records.filter(r => state(r)[1] === 'Changes requested').length;
  const rel = q.releases.length > 1 ? `<label class="f ap-rel">Release<select class="i" data-ap-rel>${q.releases.map(r => `<option value="${esc(r)}"${r === q.release ? ' selected' : ''}>${esc(r)}</option>`).join('')}</select></label>` : '';
  const who = (AP.reviewers || []).length ? `Reviewers of record: ${esc(AP.reviewers.join(', '))}.` : 'No reviewer of record has an account yet.';
  return `<section class="lms-sec" aria-labelledby="ap-h-prog"><header><h2 id="ap-h-prog">Daily program: ${esc(q.release)}</h2>${rel}</header>
   <div class="lms-tiles"><div class="lms-tile"><b>${ok}</b><span>approved</span></div><div class="lms-tile"><b>${q.records.length - ok - back}</b><span>waiting</span></div><div class="lms-tile${back ? ' bad' : ''}"><b>${back}</b><span>sent back</span></div></div>
   <div class="lms-card ap-rule"><div class="lms-row sp"><div><b>Approvers per record:</b> ${q.requires_two ? 'two different reviewers' : 'one reviewer'}<p class="lms-note">Teachers and families see a record only after it is approved. ${who}${q.can_review ? '' : ' You can read this queue; only a reviewer of record can decide.'}</p></div>
     ${q.can_review ? `<button class="btn soft tiny" type="button" data-lms="ap-rule" data-kind="program" data-release="${esc(q.release)}" data-two="${q.requires_two ? '0' : '1'}">${q.requires_two ? 'Allow one approver' : 'Require two approvers'}</button>` : ''}</div>
     <p class="lms-note">Changing the rule is recorded with your name. Approvals made before a change do not count under the new rule: the record needs approving again.</p></div>
   <div class="ap-weeks">${weeksGrid()}</div>
   <div class="ap-daywrap" id="ap-day">${dayPanel()}</div></section>`;
}

// ---------------------------------------------------------------- training tab
function trainingBody(){
  if (AP.tqErr) return `<div class="lms-banner bad"><div>${esc(AP.tqErr)}</div></div>`;
  if (!AP.tq) { loadTraining(); return '<div class="lms-card" role="status"><div class="lms-skel"></div></div>'; }
  const t = AP.tq;
  const rows = t.courses.map(c => {
    const st = { signed_off:['ok','Signed off: ready to publish'], awaiting_second:['warn',`${c.signatures.length} of ${c.needed} reviewers signed`], stale:['warn','Edited since sign-off'], unreviewed:['dim','Not yet reviewed'] }[c.status] || ['dim', c.status];
    const iSigned = c.signatures.some(s => s.reviewer_id === t.me);
    const rule = c.life_safety ? '<span class="lms-note">Life-safety: always two different reviewers</span>'
      : !t.can_sign ? `<span class="lms-note">${c.requires_two ? 'Two reviewers' : 'One reviewer'}</span>` : `<button class="btn soft tiny" type="button" data-lms="ap-rule" data-kind="training" data-release="${esc(c.series_id)}" data-two="${c.requires_two ? '0' : '1'}">${c.requires_two ? 'Allow one reviewer' : 'Require two reviewers'}</button>`;
    let act = '';
    if (c.status !== 'signed_off' && t.can_sign && !iSigned) {
      act = `<form class="lms-form" data-lms-form="ap-sign" data-course="${esc(c.id)}" novalidate><label class="f" for="ap-s-${esc(c.id)}">Attestation (recorded with your name and the time; covers exactly this version's content)<textarea class="i" id="ap-s-${esc(c.id)}" name="attestation" rows="3" required minlength="40">${esc(ATTEST)}</textarea></label><div class="lms-row"><button class="btn gold" type="submit">Sign off version ${esc(c.version)}</button></div></form>`;
    } else if (iSigned && c.status !== 'signed_off') act = '<p class="lms-note">You signed this version. A different reviewer must sign it too.</p>';
    else if (!t.can_sign && c.status !== 'signed_off') act = '<p class="lms-note">Only a reviewer of record, signed in with two-step verification, can sign off.</p>';
    return `<li class="ap-course"><div class="lms-row sp"><div style="min-width:0"><b>${esc(c.code ? c.code + ' · ' : '')}${esc(c.title)}</b><div class="lms-note">Version ${esc(c.version)} · ${esc(c.track)} · ${esc(c.clock_hours)} clock hours</div></div>${chip(st[0], st[1])}</div>
      ${c.signatures.length ? `<p class="lms-note">Signed by ${c.signatures.map(s => `${esc(s.name)} (${esc(at(s.at))})`).join(', ')}.</p>` : ''}
      <div class="lms-row sp">${rule}<a class="lms-link" href="#learn-author/${esc(c.id)}">Read the full course and publish in course authoring</a></div>${act}</li>`;
  }).join('');
  return `<section class="lms-sec" aria-labelledby="ap-h-trn"><header><h2 id="ap-h-trn">Training versions waiting for sign-off</h2></header>
   <p class="lms-note">A version can be published only after the required number of different reviewers of record have signed its exact content. Any edit after a sign-off voids it.</p>
   ${t.courses.length ? `<ul class="lms-list ap-courses">${rows}</ul>` : '<div class="lms-empty">No draft training versions are waiting.</div>'}</section>`;
}

// ---------------------------------------------------------------- route
V[ROUTE] = () => {
  const g = F.gate(ROUTE, TITLE, { hq:true }); if (g) return g;
  const tabs = `<div class="lms-tabs ap-tabs" role="group" aria-label="What to review"><button type="button" data-lms="ap-tab" data-tab="program" aria-pressed="${AP.tab === 'program'}">Daily program records</button><button type="button" data-lms="ap-tab" data-tab="training" aria-pressed="${AP.tab === 'training'}">Training sign-off</button></div>`;
  return F.shell(ROUTE, TITLE, 'Read what teachers and families will see, then approve it or send it back. Every decision is kept with the reviewer\'s name, the time and the exact text.',
    tabs + (AP.tab === 'training' ? trainingBody() : programBody()));
};

// ---------------------------------------------------------------- actions (errors are shown by academy-lms.js through friendly())
F.on('ap-tab', t => { AP.tab = t.dataset.tab === 'training' ? 'training' : 'program'; F.rerender(); });
F.on('ap-open', t => { AP.open = { w:+t.dataset.w, d:+t.dataset.d }; AP.confirm = false; AP.ask = null; F.rerender();
  setTimeout(() => { const el = document.getElementById('ap-day'); if (el && el.scrollIntoView) el.scrollIntoView({ block:'start' }); }, 0); });
F.on('ap-ask', t => { AP.ask = t.dataset.id || null; F.rerender(); setTimeout(() => { const el = document.getElementById(`ap-c-${AP.ask}`); if (el) el.focus(); }, 0); });
F.on('ap-day-ask', () => { AP.confirm = true; F.rerender(); });
F.on('ap-day-cancel', () => { AP.confirm = false; F.rerender(); });
F.on('ap-approve', async t => {
  F.busy(t, true);
  try {
    const r = must(await L.sb.rpc('program_review_decide', { p_id:t.dataset.id, p_version:+t.dataset.v, p_sha:t.dataset.sha, p_decision:'approve' }), 'approve');
    say(r.status === 'approved' ? `Approved: ${t.dataset.id} version ${t.dataset.v}.` : `Your approval is recorded. ${r.needed - r.approvals} more reviewer needed.`);
  } finally { F.busy(t, false); refresh(); }
});
F.on('ap-day', async t => {
  const list = (AP.day && AP.day.list) || [], expected = {};
  for (const x of list) if (x.status === 'draft') expected[x.id] = x.review_sha;
  F.busy(t, true);
  try {
    const r = must(await L.sb.rpc('program_review_approve_day', { p_release:AP.rel, p_week:AP.open.w, p_day:AP.open.d, p_expected:expected }), 'approve day');
    say(r.awaiting_second ? `Day recorded: ${r.approved} approved, ${r.awaiting_second} waiting for a second reviewer.` : `Day ${dayNo(AP.open.w, AP.open.d)} approved: ${r.approved} records.`);
  } finally { F.busy(t, false); refresh(); }
});
F.on('ap-rule', async t => {
  F.busy(t, true);
  try {
    must(await L.sb.rpc('review_policy_set', { p_kind:t.dataset.kind, p_release:t.dataset.release, p_requires_two:t.dataset.two === '1' }), 'rule');
    say(t.dataset.two === '1' ? 'Two different reviewers are now required.' : 'One reviewer is now enough.');
  } finally { F.busy(t, false); if (t.dataset.kind === 'training') { AP.tq = null; loadTraining(); } else refresh(); }
});
F.onForm('ap-changes', async f => {
  const comment = (f.elements.comment.value || '').trim();
  if (comment.length < 3) { f.elements.comment.focus(); say('Say what needs to change.'); return; }
  must(await L.sb.rpc('program_review_decide', { p_id:f.dataset.id, p_version:+f.dataset.v, p_sha:f.dataset.sha, p_decision:'request_changes', p_comment:comment }), 'request changes');
  AP.ask = null; say('Sent back with your comment. The record stays a draft.'); refresh();
});
F.onForm('ap-sign', async f => {
  const att = (f.elements.attestation.value || '').trim();
  must(await L.sb.rpc('training_sign_off', { p_course:f.dataset.course, p_attestation:att }), 'sign off');
  say('Your sign-off is recorded.'); AP.tq = null; loadTraining();
});
document.addEventListener('change', e => {
  const s = e.target && e.target.closest && e.target.closest('[data-ap-rel]');
  if (s) { AP.rel = s.value; AP.open = null; refresh(); }
});
})();
