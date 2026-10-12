// Hiring desk (/c/<slug>/hiring) and the candidate page (/candidate/<token>). hub/ATS.md.
// The database decides everything (hiring_can: a cleared director, or a teacher with the 'staff' permission; the candidate page: the link's
// token). This file only draws. Strings EN + ES (hiring-core.js); staff views follow the page's language, the candidate page the candidate's.
import { EMPLOYMENT, JOB_ROLES, OPEN_STAGES, REJECT_REASONS, SOURCES, STAGES, buildIcs, t } from './hiring-core.js';
import { centerTz } from './center-time.js';

const MOVE_TO = ['applied', 'screening', 'interview', 'offer', 'withdrawn'];
const VIEWS = ['pipeline', 'jobs', 'interviews', 'pool', 'forecast', 'credentials', 'reports', 'privacy', 'settings'];
const DIRECTOR_ONLY = new Set(['privacy', 'settings']);

export function mountHiring({ esc, $, $$, rpc, client, page, live, friendly, go }) {
  let lang = 'en';
  const H = (k, v) => t(k, v, lang);
  const day = (d) => (d ? new Date(d).toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '');
  // interview and offer times in the CENTER's zone, with its short name ("10:00 AM HST"): the candidate page uses the zone the center
  // sends (hiring_portal_open center.time_zone), the desk the open center's (center-time.js)
  let candZone = null;
  const zoneNow = () => candZone || centerTz();
  const when = (d) => (d ? new Date(d).toLocaleString(lang === 'es' ? 'es-US' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: zoneNow(), timeZoneName: 'short' }) : '');
  const opt = (v, label, sel) => `<option value="${esc(v)}"${sel ? ' selected' : ''}>${esc(label)}</option>`;
  const say = (el, text, kind = 'ok') => { if (!el) return; el.className = `msg ${kind}`; el.textContent = text; live(text); };
  const fail = (el, e) => say(el, friendly(e), 'bad');
  const val = (form, name) => { const x = form.elements.namedItem(name); return x ? (x.type === 'checkbox' ? x.checked : String(x.value).trim()) : null; };
  const download = (name, type, text) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  };

  // ---------------------------------------------------------------------------------------------------------------------------------
  // the desk
  // ---------------------------------------------------------------------------------------------------------------------------------
  async function viewHiring(c, shell, { director = false, lang: l = 'en' } = {}) {
    lang = l === 'es' ? 'es' : 'en';
    const q = new URLSearchParams(location.search);
    const base = `/c/${c.slug}/hiring`;
    if (q.get('view') === 'mine') return viewMine(c, shell, q);   // any staff member: their own credentials and onboarding (the alert links here)
    let team = true;
    try { await rpc('hiring_settings_get', { p_center: c.center_id }); } catch (e) { if (/42501|staff desk|directors/.test(`${e.code} ${e.message}`)) team = false; else throw e; }
    if (!team) return viewInterviewer(c, shell, q, base);
    const view = q.get('app') ? 'app' : (VIEWS.includes(q.get('view')) && (director || !DIRECTOR_ONLY.has(q.get('view'))) ? q.get('view') : 'pipeline');
    const nav = `<nav class="hr-nav" aria-label="${esc(H('hiring.title'))}">${VIEWS.filter((v) => director || !DIRECTOR_ONLY.has(v))
      .map((v) => `<a href="${base}?view=${v}" data-nav${v === view ? ' aria-current="page"' : ''}>${esc(H(`tab.${v}`))}</a>`).join('')}</nav>`;
    const frame = (body) => shell(`<section id="hiring" data-view="${view}"><h2>${esc(H('hiring.title'))}</h2><p class="muted">${esc(H('hiring.lead'))}</p>${nav}${body}</section>`);
    const ctx = { c, base, director, q, frame };
    if (view === 'app') return viewApplication(ctx, q.get('app'));
    return ({ pipeline: viewPipeline, jobs: viewJobs, interviews: viewInterviews, pool: viewPool, forecast: viewForecast, credentials: viewCredentials,
      reports: viewReports, privacy: viewPrivacy, settings: viewSettings })[view](ctx);
  }

  // ---- pipeline (kanban) ----------------------------------------------------------------------------------------------------------
  async function viewPipeline({ c, base, q, frame }) {
    const [board, jobs] = await Promise.all([rpc('hiring_board', { p_center: c.center_id, p_job: q.get('job') || null, p_closed: false }),
      rpc('hiring_jobs_list', { p_center: c.center_id })]);
    const card = (k) => `<article class="hr-card${k.overdue ? ' late' : ''}" draggable="true" data-app="${esc(k.id)}" data-stage="${esc(k.stage)}">
        <a class="hr-name" href="${base}?app=${esc(k.id)}" data-nav>${esc(k.name)}</a><span class="small muted">${esc(k.job)}</span>
        <div class="chips">${k.overdue ? `<span class="chip bad">${esc(H('board.overdue'))}</span>` : ''}<span class="chip">${esc(H('board.days', { n: k.days_in_stage }))}</span>
          ${k.knockout ? `<span class="chip warn">${esc(H('board.knockout'))}</span>` : ''}${k.possible_duplicate ? `<span class="chip warn">${esc(H('board.duplicate'))}</span>` : ''}
          ${k.referred ? `<span class="chip gold">${esc(H('board.referral'))}</span>` : ''}${k.interview ? `<span class="chip ok">${esc(when(k.interview.starts_at))}</span>` : ''}</div>
        ${OPEN_STAGES.includes(k.stage) ? `<label class="f small"><span class="sr-only">${esc(H('board.move'))} (${esc(k.name)})</span>
          <select class="i hr-move" data-app="${esc(k.id)}" aria-label="${esc(H('board.move'))}: ${esc(k.name)}">${opt('', `${H('board.move')}…`, true)}${MOVE_TO.filter((s) => s !== k.stage).map((s) => opt(s, H(`stage.${s}`))).join('')}${opt('reject', H('app.reject'))}</select></label>` : ''}
      </article>`;
    const cols = STAGES.map((s) => {
      const cards = board.cards.filter((k) => k.stage === s);
      return `<section class="hr-col" data-stage="${s}" aria-label="${esc(H(`stage.${s}`))}"><h3>${esc(H(`stage.${s}`))} <span class="chip">${cards.length}</span></h3>
        ${cards.map(card).join('') || `<p class="small muted">${esc(H('board.empty'))}</p>`}</section>`;
    }).join('');
    const open = jobs.filter((j) => ['published', 'draft', 'paused'].includes(j.status));
    page(frame(`<div class="card"><form id="hrFilter" class="grid two"><label class="f"><span>${esc(H('tab.jobs'))}</span><select class="i" name="job" id="hrJobFilter">
        ${opt('', H('board.allJobs'), !q.get('job'))}${jobs.map((j) => opt(j.id, `${j.title} (${H(`job.status.${j.status}`)})`, q.get('job') === j.id)).join('')}</select></label></form>
      <div class="hr-board" id="hrBoard">${cols}</div><p class="msg" id="hrBoardMsg" role="status"></p></div>
      <details class="card" id="hrAdd"><summary><b>${esc(H('board.addCandidate'))}</b></summary>
        <form id="hrAddForm" class="grid two" novalidate>
          <label class="f"><span>${esc(H('job.title'))}</span><select class="i" name="job" required>${open.map((j) => opt(j.id, j.title)).join('')}</select></label>
          <label class="f"><span>Name / Nombre</span><input class="i" name="full_name" required maxlength="120" autocomplete="off"></label>
          <label class="f"><span>Email</span><input class="i" name="email" type="email" maxlength="254" autocomplete="off"></label>
          <label class="f"><span>Phone / Teléfono</span><input class="i" name="phone" maxlength="32" autocomplete="off"></label>
          <label class="f"><span>${esc(H('app.source'))}</span><select class="i" name="source">${SOURCES.map((s) => opt(s, H(`source.${s}`), s === 'walk_in')).join('')}</select></label>
          <label class="f"><span>${esc(H('board.referral'))}</span><input class="i" name="referred_by_name" maxlength="120"></label>
          <label class="f"><span>Language / Idioma</span><select class="i" name="preferred_language">${opt('en', 'English')}${opt('es', 'Español')}</select></label>
          <div><button class="btn navy" type="submit">${esc(H('common.save'))}</button></div><p class="msg" id="hrAddMsg" role="status"></p></form></details>`), H('hiring.title'), { english: true });
    $('#hrJobFilter').onchange = (e) => go(`${base}?view=pipeline${e.target.value ? `&job=${encodeURIComponent(e.target.value)}` : ''}`);
    const move = async (app, stage) => {
      if (stage === 'reject') return go(`${base}?app=${encodeURIComponent(app)}#reject`);
      try { await rpc('hiring_move', { p_center: c.center_id, p_app: app, p_stage: stage, p_reason: null, p_note: null, p_tell: true }); live(H('common.saved')); go(FFTest.pathname() + location.search, true); }
      catch (e) { fail($('#hrBoardMsg'), e); }
    };
    $$('.hr-move').forEach((s) => { s.onchange = () => s.value && move(s.dataset.app, s.value); });
    $$('.hr-card').forEach((el) => { el.ondragstart = (e) => e.dataTransfer.setData('text/plain', el.dataset.app); });
    $$('.hr-col').forEach((col) => {
      if (!MOVE_TO.includes(col.dataset.stage)) return;
      col.ondragover = (e) => { e.preventDefault(); col.classList.add('drop'); };
      col.ondragleave = () => col.classList.remove('drop');
      col.ondrop = (e) => { e.preventDefault(); col.classList.remove('drop'); const id = e.dataTransfer.getData('text/plain'); if (id) move(id, col.dataset.stage); };
    });
    $('#hrAddForm').onsubmit = async (e) => {
      e.preventDefault();
      const f = e.target;
      try {
        const r = await rpc('hiring_candidate_add', { p_center: c.center_id, p_job: val(f, 'job'), p: { full_name: val(f, 'full_name'), email: val(f, 'email') || null,
          phone: val(f, 'phone') || null, source: val(f, 'source'), referred_by_name: val(f, 'referred_by_name') || null, preferred_language: val(f, 'preferred_language') } });
        go(`${base}?app=${r.application_id}`);
      } catch (err) { fail($('#hrAddMsg'), err); }
    };
  }

  // ---- one application ------------------------------------------------------------------------------------------------------------
  async function viewApplication({ c, base, director, frame }, appId) {
    const d = await rpc('hiring_application_get', { p_center: c.center_id, p_app: appId });
    const a = d.application; const k = d.candidate; const j = d.job;
    const open = OPEN_STAGES.includes(a.stage);
    const offer = d.offers[0] || null;
    const bg = d.background;
    const sc = d.scorecards;
    const mine = sc.cards.find((x) => x.mine && x.status === 'draft');
    const myDone = sc.cards.some((x) => x.mine && x.status === 'submitted');
    const comp = sc.template?.competencies || [];
    const lbl = (x) => (lang === 'es' && x.label_es) || x.label;
    const scoreForm = !myDone ? `<form id="hrScore" class="grid" novalidate><p class="small muted">${esc(H('sc.jobOnly'))}</p><p class="small">${esc(H('sc.rate'))}</p>
        ${comp.map((x) => `<fieldset class="f"><legend>${esc(lbl(x))} <span class="hint">${esc((lang === 'es' && x.hint_es) || x.hint || '')}</span></legend>
          <div class="hr-rate">${[1, 2, 3, 4].map((n) => `<label><input type="radio" name="r_${esc(x.key)}" value="${n}"${mine?.ratings?.[x.key] === n ? ' checked' : ''}> ${n}</label>`).join('')}</div>
          <input class="i" name="n_${esc(x.key)}" maxlength="1000" aria-label="${esc(H('app.note'))}: ${esc(lbl(x))}" value="${esc(mine?.notes?.[x.key] || '')}"></fieldset>`).join('')}
        <label class="f"><span>${esc(H('sc.recommendation'))}</span><select class="i" name="rec">${opt('', '—', !mine?.recommendation)}${['strong_yes', 'yes', 'no', 'strong_no'].map((r) => opt(r, H(`sc.${r}`), mine?.recommendation === r)).join('')}</select></label>
        <label class="f"><span>${esc(H('sc.summary'))}</span><textarea class="i" name="summary" rows="3" maxlength="2000">${esc(mine?.summary || '')}</textarea></label>
        <div><button class="btn soft" type="submit" name="draft" value="1">${esc(H('sc.saveDraft'))}</button> <button class="btn navy" type="submit" name="submit" value="1">${esc(H('sc.submit'))}</button></div>
        <p class="msg" id="hrScoreMsg" role="status"></p></form>` : '';
    const cards = sc.cards.filter((x) => x.status === 'submitted').map((x) => `<div class="card soft"><b>${esc(x.interviewer)}</b> · ${esc(H(`sc.${x.recommendation}`))}
        <ul class="small">${comp.map((cc) => `<li>${esc(lbl(cc))}: <b>${esc(x.ratings[cc.key] ?? '–')}</b>${x.notes?.[cc.key] ? ` · ${esc(x.notes[cc.key])}` : ''}</li>`).join('')}</ul>${x.summary ? `<p class="small">${esc(x.summary)}</p>` : ''}</div>`).join('');
    const offerHtml = () => {
      if (!offer || ['withdrawn', 'expired', 'declined', 'rescinded'].includes(offer.status)) {
        if (!['interview', 'offer', 'screening'].includes(a.stage)) return offer ? `<p class="small">${esc(offer.status)}${offer.close_reason ? ` · ${esc(offer.close_reason)}` : ''}</p>` : '';
        return `<form id="hrOffer" class="grid two" novalidate>
          <label class="f"><span>${esc(H('offer.pay'))}</span><input class="i" name="pay_rate" type="number" min="0" step="0.01" required value="${esc(j.pay_min ?? '')}"></label>
          <label class="f"><span>${esc(H('job.payUnit'))}</span><select class="i" name="pay_unit">${opt('hour', H('job.hour'), j.pay_unit !== 'year')}${opt('year', H('job.year'), j.pay_unit === 'year')}</select></label>
          <label class="f"><span>${esc(H('offer.start'))}</span><input class="i" name="start_on" type="date" required></label>
          <label class="f"><span>${esc(H('offer.expires'))}</span><input class="i" name="expires_on" type="date"></label>
          <label class="f"><span>${esc(H('app.note'))}</span><input class="i" name="note" maxlength="500"></label>
          <label class="f"><span><input type="checkbox" name="conditional" checked> ${esc(H('offer.conditional'))}</span></label>
          <div><button class="btn navy" type="submit">${esc(H('offer.create'))}</button></div><p class="msg" id="hrOfferMsg" role="status"></p></form>`;
      }
      return `<div class="hr-letter" id="hrLetter" tabindex="0" role="region" aria-label="${esc(H('app.offer'))}">${offer.letter_html}</div>
        <dl class="hr-kv small"><dt>${esc(H('offer.fingerprint'))}</dt><dd class="hr-hash">${esc(offer.letter_hash)}</dd>
          ${offer.signed_at ? `<dt>✔</dt><dd>${esc(H('offer.signedBy', { name: offer.signed_name, at: when(offer.signed_at) }))}</dd><dt>Signature</dt><dd class="hr-hash">${esc(offer.signature_hash)}</dd>` : ''}
          <dt>Status</dt><dd>${esc(offer.status)} · ${esc((offer.events || []).map((e) => `${e.event} ${when(e.at)}`).join(' → '))}</dd></dl>
        <p class="small muted">${esc(H('offer.basic'))}</p>
        <div class="no-print">${offer.status === 'draft' && director ? `<button class="btn navy" id="hrOfferSend" type="button">${esc(H('offer.send'))}</button> ` : ''}
          ${['draft', 'sent'].includes(offer.status) && director ? `<button class="btn soft" id="hrOfferWithdraw" type="button">${esc(H('offer.withdraw'))}</button> ` : ''}
          <button class="btn soft" id="hrPrint" type="button">${esc(H('offer.print'))}</button></div><p class="msg" id="hrOfferMsg" role="status"></p>`;
    };
    const bgHtml = () => {
      if (!offer || offer.status !== 'signed') return bg ? `<p>${esc(bg.status)}</p>` : '';
      if (!bg || bg.status === 'cancelled') return `<button class="btn navy" id="hrBgStart" type="button">${esc(H('bg.start'))}</button><p class="msg" id="hrBgMsg" role="status"></p>`;
      const rows = `<dl class="hr-kv small"><dt>Status</dt><dd>${esc(bg.status)}</dd>${bg.authorized_at ? `<dt>${esc(H('bg.authorized'))}</dt><dd>${esc(bg.authorized_name)} · ${esc(when(bg.authorized_at))}</dd>`
        : `<dt>&nbsp;</dt><dd>${esc(H('bg.waiting'))}</dd>`}${bg.pre_adverse_until ? `<dt>FCRA</dt><dd>${esc(day(bg.pre_adverse_until))}</dd>` : ''}
        ${bg.self_disclosure ? `<dt>${esc(H('cand.crim'))}</dt><dd>${bg.self_disclosure.has_record ? esc(H('common.yes')) : esc(H('common.no'))}${bg.self_disclosure.explanation ? ` · ${esc(bg.self_disclosure.explanation)}` : ''}</dd>` : ''}</dl>`;
      const record = bg.authorized_at && ['authorized', 'in_progress', 'clear', 'consider'].includes(bg.status) ? `<form id="hrBgRec" class="grid two" novalidate>
          <label class="f"><span>${esc(H('bg.record'))}</span><select class="i" name="status">${['in_progress', 'clear', 'consider'].map((s) => opt(s, H(`bg.${s}`), bg.status === s)).join('')}</select></label>
          <label class="f"><span>${esc(H('app.note'))}</span><input class="i" name="note" maxlength="2000"></label><div><button class="btn navy" type="submit">${esc(H('common.save'))}</button></div></form>` : '';
      const pre = director && bg.status === 'consider' ? `<form id="hrPre" class="grid" novalidate><h4>${esc(H('bg.assessment'))}</h4><p class="small muted">${esc(H('bg.draft'))}</p>
          ${[['nature_gravity', 'bg.nature'], ['time_elapsed', 'bg.time'], ['job_relevance', 'bg.relevance'], ['mitigating', 'bg.mitigating']].map(([n, l2]) => `<label class="f"><span>${esc(H(l2))}</span><textarea class="i" name="${n}" rows="2" maxlength="1000"></textarea></label>`).join('')}
          <label class="f"><span>${esc(H('bg.agency'))}</span><input class="i" name="agency" maxlength="300" required></label>
          <div><button class="btn navy" type="submit">${esc(H('bg.preAdverse'))}</button></div></form>` : '';
      const fin = director && ['pre_adverse', 'consider'].includes(bg.status) ? `<div class="no-print"><h4>${esc(H('bg.final'))}</h4>
          <button class="btn soft" id="hrBgClear" type="button">${esc(H('bg.clearAfter'))}</button> ${bg.status === 'pre_adverse' ? `<button class="btn soft" id="hrBgAdverse" type="button">${esc(H('bg.adverse'))}</button>` : ''}</div>` : '';
      return `${rows}${record}${pre}${fin}<p class="msg" id="hrBgMsg" role="status"></p>`;
    };
    const hireHtml = director && a.stage === 'background' && bg && ['clear', 'cleared_after_review'].includes(bg.status) ? `<form id="hrHire" class="grid two" novalidate>
        <label class="f"><span>${esc(H('offer.start'))}</span><input class="i" name="start_on" type="date" value="${esc(offer?.start_on || '')}"></label>
        <label class="f"><span>${esc(H('app.note'))}</span><input class="i" name="note" maxlength="1000"></label>
        <p class="small muted">${esc(H('app.hireNote'))}</p><div><button class="btn gold" type="submit">${esc(H('app.hire'))}</button></div><p class="msg" id="hrHireMsg" role="status"></p></form>` : '';
    const slots = open ? await rpc('hiring_slots_list', { p_center: c.center_id, p_days: 28 }).catch(() => []) : [];
    const free = slots.filter((s) => !s.booked);
    const ans = (j.screening || []).map((x) => `<li>${esc(x.q)}: <b>${esc(a.answers?.[x.key] ? H(`common.${a.answers[x.key]}`) : '–')}</b>${(a.knockout || []).includes(x.key) ? ` <span class="chip warn">${esc(H('board.knockout'))}</span>` : ''}</li>`).join('');
    page(frame(`<p><a href="${base}?view=pipeline" data-nav>← ${esc(H('tab.pipeline'))}</a></p>
      <div class="card" id="hrApp"><h3>${esc(k.full_name)} <span class="chip gold">${esc(H(`stage.${a.stage}`))}</span>${a.overdue ? ` <span class="chip bad">${esc(H('board.overdue'))}</span>` : ''}</h3>
        <p class="muted">${esc(j.title)} · ${esc(H(`role.${j.job_role}`))}</p>
        <dl class="hr-kv"><dt>${esc(H('app.contact'))}</dt><dd>${esc(k.email || '')} ${esc(k.phone || '')} · ${esc(k.preferred_language === 'es' ? 'Español' : 'English')}</dd>
          <dt>${esc(H('app.source'))}</dt><dd>${esc(H(`source.${k.source}`))}${k.source_detail ? ` · ${esc(k.source_detail)}` : ''}${k.referred_by || k.referred_by_name ? ` · ${esc(H('board.referral'))}: ${esc(k.referred_by || k.referred_by_name)}` : ''}</dd>
          ${k.duplicate_of_name ? `<dt>${esc(H('board.duplicate'))}</dt><dd>${esc(k.duplicate_of_name)} <button class="btn link" id="hrMerge" type="button">${esc(H('app.merge'))} ${esc(k.duplicate_of_name)}</button></dd>` : ''}
          ${k.other_applications.length ? `<dt>${esc(H('app.otherApps'))}</dt><dd>${k.other_applications.map((o) => `<a href="${base}?app=${esc(o.id)}" data-nav>${esc(o.job)}</a> (${esc(H(`stage.${o.stage}`))})`).join(', ')}</dd>` : ''}
          <dt>${esc(H('app.pool'))}</dt><dd><label><input type="checkbox" id="hrPool"${k.talent_pool ? ' checked' : ''}> ${esc(H('app.pool'))}</label> <input class="i" id="hrTags" aria-label="Tags" value="${esc((k.pool_tags || []).join(', '))}" placeholder="tags"></dd></dl>
        <h4>${esc(H('app.answers'))}</h4><ul class="small">${ans}${a.availability ? `<li>${esc(a.availability)}</li>` : ''}<li>${a.years_experience ?? '–'} y · CDA ${a.has_cda ? '✔' : '–'} · CPR ${a.has_cpr ? '✔' : '–'}</li></ul>
        ${a.cover_note ? `<p class="small">${esc(a.cover_note)}</p>` : ''}
        ${a.resume_path ? `<p><button class="btn soft small" id="hrResume" type="button">${esc(H('app.resume'))}</button> <span class="small muted">${esc(H('app.resumeNote'))}</span></p>` : ''}
        ${open ? `<div class="grid two no-print"><label class="f"><span>${esc(H('board.move'))}</span><select class="i" id="hrMoveOne">${opt('', '…', true)}${MOVE_TO.filter((s) => s !== a.stage).map((s) => opt(s, H(`stage.${s}`))).join('')}</select></label>
          <div><button class="btn soft" id="hrLink" type="button">${esc(H('app.link'))}</button><p class="small muted">${esc(H('app.linkNote'))}</p><input class="i" id="hrLinkOut" readonly hidden aria-label="${esc(H('app.link'))}"></div></div>
          <form id="reject" class="card soft grid two" novalidate><h4>${esc(H('app.reject'))}</h4>
            <label class="f"><span>${esc(H('app.reason'))}</span><select class="i" name="reason" required>${opt('', '…', true)}${REJECT_REASONS.map((r) => opt(r, H(`reason.${r}`))).join('')}</select></label>
            <label class="f"><span>${esc(H('app.note'))}</span><input class="i" name="note" maxlength="1000"></label>
            <label class="f"><span><input type="checkbox" name="tell" checked> ${esc(H('app.tell'))}</span></label><div><button class="btn soft" type="submit">${esc(H('app.reject'))}</button></div></form>` : ''}
        <p class="msg" id="hrAppMsg" role="status"></p></div>
      <div class="grid two">
        <div class="card" id="hrInterviews"><h3>${esc(H('app.interviews'))}</h3><ul>${d.interviews.map((i) => `<li>${esc(when(i.starts_at))} · ${esc(H(`iv.${i.mode}`))} · ${esc(i.interviewer || '')} · ${esc(i.status)}
            ${i.status === 'scheduled' ? `<button class="btn link hr-ivx" data-iv="${esc(i.id)}" type="button">${esc(H('iv.cancel'))}</button>` : ''}</li>`).join('') || `<li class="muted">${esc(H('iv.none'))}</li>`}</ul>
          ${open && free.length ? `<form id="hrBook" class="grid" novalidate><label class="f"><span>${esc(H('iv.open'))}</span><select class="i" name="slot">${free.map((s) => opt(s.id, `${when(s.starts_at)} · ${s.interviewer} · ${H(`iv.${s.mode}`)}`)).join('')}</select></label>
            <div><button class="btn navy" type="submit">${esc(H('iv.book'))}</button></div></form>` : ''}<p class="msg" id="hrIvMsg" role="status"></p></div>
        <div class="card" id="hrScorecards"><h3>${esc(H('app.scorecards'))}</h3>${!sc.can_see_others && sc.submitted ? `<p class="small muted">${esc(H('sc.hidden'))}</p>` : ''}${cards}${scoreForm}</div>
      </div>
      <div class="card" id="hrOfferCard"><h3>${esc(H('app.offer'))}</h3>${offerHtml()}</div>
      <div class="card" id="hrBg"><h3>${esc(H('app.background'))}</h3>${bgHtml()}${hireHtml}</div>
      ${d.onboarding.length ? `<div class="card" id="hrOnboarding"><h3>${esc(H('app.onboarding'))}</h3><ul class="hr-list">${d.onboarding.map((o) => `<li><label><input type="checkbox" class="hr-onb" data-id="${esc(o.id)}"${o.done ? ' checked' : ''}${o.kind === 'course' ? ' disabled' : ''}> ${esc(o.label)}</label>
          <span class="small muted">${o.due_on ? esc(day(o.due_on)) : ''}${o.kind === 'course' ? ` · ${o.enrolled ? 'LMS ✔' : 'LMS'}` : ''}</span></li>`).join('')}</ul></div>` : ''}
      <div class="grid two"><div class="card"><h3>${esc(H('app.messages'))}</h3><ul class="small">${d.messages.map((m) => `<li>${esc(m.subject)} · <span class="chip${m.state === 'held' ? ' warn' : ''}">${esc(m.state)}</span> ${esc(day(m.at))}</li>`).join('')}</ul></div>
        <div class="card"><h3>${esc(H('app.history'))}</h3><ol class="small">${d.history.map((h) => `<li>${esc(when(h.at))}: ${esc(H(`stage.${h.to}`))}${h.reason ? ` (${esc(h.reason)})` : ''}${h.by ? ` · ${esc(h.by)}` : h.by_kind === 'candidate' ? ' · candidate' : ''}</li>`).join('')}</ol></div></div>`), k.full_name, { english: true });
    if (location.hash === '#reject') $('#reject')?.scrollIntoView();
    const again = () => go(FFTest.pathname() + location.search, true);
    const act = async (msgSel, fn) => { try { await fn(); live(H('common.saved')); again(); } catch (e) { fail($(msgSel), e); } };
    $('#hrMoveOne') && ($('#hrMoveOne').onchange = (e) => e.target.value && act('#hrAppMsg', () => rpc('hiring_move', { p_center: c.center_id, p_app: a.id, p_stage: e.target.value, p_reason: null, p_note: null, p_tell: true })));
    $('#reject') && ($('#reject').onsubmit = (e) => { e.preventDefault(); const f = e.target; act('#hrAppMsg', () => rpc('hiring_move', { p_center: c.center_id, p_app: a.id, p_stage: 'rejected', p_reason: val(f, 'reason') || null, p_note: val(f, 'note') || null, p_tell: val(f, 'tell') })); });
    $('#hrResume') && ($('#hrResume').onclick = async () => {
      try {
        const r = await rpc('hiring_resume_open', { p_center: c.center_id, p_app: a.id });
        const u = await client().storage.from(r.bucket).createSignedUrl(r.path, 60, { download: true });
        if (u.error) throw u.error;
        window.open(u.data.signedUrl, '_blank', 'noopener');
      } catch (e) { fail($('#hrAppMsg'), e); }
    });
    $('#hrLink') && ($('#hrLink').onclick = async () => {
      try { const r = await rpc('hiring_candidate_link', { p_center: c.center_id, p_app: a.id }); const o = $('#hrLinkOut'); o.hidden = false; o.value = `${location.origin}${r.path}`; o.select(); navigator.clipboard?.writeText(o.value).catch(() => {}); }
      catch (e) { fail($('#hrAppMsg'), e); }
    });
    const savePool = () => act('#hrAppMsg', () => rpc('hiring_candidate_update', { p_center: c.center_id, p_candidate: k.id, p: { talent_pool: $('#hrPool').checked, pool_tags: $('#hrTags').value.split(',').map((x) => x.trim()).filter(Boolean) } }));
    $('#hrPool').onchange = savePool; $('#hrTags').onchange = savePool;
    $('#hrMerge') && ($('#hrMerge').onclick = async () => { try { await rpc('hiring_candidate_merge', { p_center: c.center_id, p_keep: k.duplicate_of, p_dup: k.id }); go(`${base}?view=pipeline`); } catch (e) { fail($('#hrAppMsg'), e); } });
    $$('.hr-ivx').forEach((b) => { b.onclick = () => act('#hrIvMsg', () => rpc('hiring_interview_cancel', { p_center: c.center_id, p_interview: b.dataset.iv, p_reason: null })); });
    $('#hrBook') && ($('#hrBook').onsubmit = (e) => { e.preventDefault(); act('#hrIvMsg', () => rpc('hiring_interview_book', { p_center: c.center_id, p_app: a.id, p_slot: val(e.target, 'slot') })); });
    $('#hrScore') && ($('#hrScore').onsubmit = (e) => {
      e.preventDefault();
      const f = e.target; const submit = e.submitter?.name === 'submit';
      const ratings = {}; const notes = {};
      for (const x of comp) { const r = f.querySelector(`input[name="r_${x.key}"]:checked`); if (r) ratings[x.key] = Number(r.value); const n = val(f, `n_${x.key}`); if (n) notes[x.key] = n; }
      act('#hrScoreMsg', () => rpc('hiring_scorecard_save', { p_center: c.center_id, p_app: a.id, p_interview: d.interviews.find((i) => i.status !== 'cancelled')?.id ?? null, p_ratings: ratings, p_notes: notes,
        p_recommendation: val(f, 'rec') || null, p_summary: val(f, 'summary') || null, p_submit: submit }));
    });
    $('#hrOffer') && ($('#hrOffer').onsubmit = (e) => { e.preventDefault(); const f = e.target;
      act('#hrOfferMsg', () => rpc('hiring_offer_create', { p_center: c.center_id, p_app: a.id, p: { pay_rate: Number(val(f, 'pay_rate')), pay_unit: val(f, 'pay_unit'), start_on: val(f, 'start_on') || null,
        expires_on: val(f, 'expires_on') || null, conditional: val(f, 'conditional'), note: val(f, 'note') || null } })); });
    $('#hrOfferSend') && ($('#hrOfferSend').onclick = () => act('#hrOfferMsg', () => rpc('hiring_offer_send', { p_center: c.center_id, p_offer: offer.id })));
    $('#hrOfferWithdraw') && ($('#hrOfferWithdraw').onclick = () => { const r = prompt(H('app.note')); if (r) act('#hrOfferMsg', () => rpc('hiring_offer_withdraw', { p_center: c.center_id, p_offer: offer.id, p_reason: r })); });
    $('#hrPrint') && ($('#hrPrint').onclick = () => window.print());
    $('#hrBgStart') && ($('#hrBgStart').onclick = () => act('#hrBgMsg', () => rpc('hiring_background_start', { p_center: c.center_id, p_app: a.id })));
    $('#hrBgRec') && ($('#hrBgRec').onsubmit = (e) => { e.preventDefault(); act('#hrBgMsg', () => rpc('hiring_background_record', { p_center: c.center_id, p_app: a.id, p_status: val(e.target, 'status'), p_note: val(e.target, 'note') || null })); });
    $('#hrPre') && ($('#hrPre').onsubmit = (e) => { e.preventDefault(); const f = e.target;
      act('#hrBgMsg', () => rpc('hiring_background_pre_adverse', { p_center: c.center_id, p_app: a.id, p_agency: val(f, 'agency'),
        p_assessment: { nature_gravity: val(f, 'nature_gravity'), time_elapsed: val(f, 'time_elapsed'), job_relevance: val(f, 'job_relevance'), mitigating: val(f, 'mitigating') } })); });
    $('#hrBgClear') && ($('#hrBgClear').onclick = () => act('#hrBgMsg', () => rpc('hiring_background_final', { p_center: c.center_id, p_app: a.id, p_decision: 'clear', p_note: null })));
    $('#hrBgAdverse') && ($('#hrBgAdverse').onclick = () => act('#hrBgMsg', () => rpc('hiring_background_final', { p_center: c.center_id, p_app: a.id, p_decision: 'adverse', p_note: null })));
    $('#hrHire') && ($('#hrHire').onsubmit = (e) => { e.preventDefault(); act('#hrHireMsg', () => rpc('hiring_hire', { p_center: c.center_id, p_app: a.id, p_start_on: val(e.target, 'start_on') || null, p_note: val(e.target, 'note') || null })); });
    $$('.hr-onb').forEach((b) => { b.onchange = () => act('#hrAppMsg', () => rpc('hiring_onboarding_check', { p_center: c.center_id, p_item: b.dataset.id, p_done: b.checked })); });
  }

  // ---- openings ---------------------------------------------------------------------------------------------------------------------
  async function viewJobs({ c, base, q, frame }) {
    const jobs = await rpc('hiring_jobs_list', { p_center: c.center_id });
    const settings = await rpc('hiring_settings_get', { p_center: c.center_id });
    const rooms = await client().from('rooms').select('id, data').eq('center_id', c.center_id).then((r) => r.data || [], () => []);
    const sel = q.get('job') === 'new' ? {} : jobs.find((j) => j.id === q.get('job'));
    const qRow = (x = {}, i = 0) => `<div class="hr-q" data-q><label class="f"><span>${esc(H('job.screening'))} ${i + 1}</span><input class="i" name="q" maxlength="300" value="${esc(x.q || '')}"></label>
      <label class="f"><span>${esc(H('job.knockout'))}</span><select class="i" name="ko">${opt('', '—', !x.knockout)}${opt('yes', H('common.yes'), x.knockout === 'yes')}${opt('no', H('common.no'), x.knockout === 'no')}</select></label>
      <input type="hidden" name="key" value="${esc(x.key || '')}"></div>`;
    const form = sel ? `<form id="hrJob" class="card grid two" novalidate><h3>${esc(sel.id ? sel.title : H('job.new'))}</h3>
        <label class="f"><span>${esc(H('job.title'))}</span><input class="i" name="title" required maxlength="120" value="${esc(sel.title || '')}"></label>
        <label class="f"><span>${esc(H('job.titleEs'))}</span><input class="i" name="title_es" maxlength="120" value="${esc(sel.title_es || '')}" lang="es"></label>
        <label class="f"><span>${esc(H('job.role'))}</span><select class="i" name="job_role">${JOB_ROLES.map((r) => opt(r, H(`role.${r}`), (sel.job_role || 'teacher') === r)).join('')}</select></label>
        <label class="f"><span>${esc(H('job.employment'))}</span><select class="i" name="employment_type">${EMPLOYMENT.map((r) => opt(r, H(`emp.${r}`), (sel.employment_type || 'full_time') === r)).join('')}</select></label>
        <label class="f"><span>${esc(H('job.room'))}</span><select class="i" name="forecast_room">${opt('', '—', !sel.forecast_room)}${rooms.map((r) => opt(r.id, r.data?.name || r.id, sel.forecast_room === r.id)).join('')}</select></label>
        <label class="f"><span>${esc(H('job.openings'))}</span><input class="i" name="openings" type="number" min="1" max="50" value="${esc(sel.openings || 1)}"></label>
        <label class="f"><span>${esc(H('job.payMin'))}</span><input class="i" name="pay_min" type="number" min="0" step="0.01" value="${esc(sel.pay_min ?? '')}"></label>
        <label class="f"><span>${esc(H('job.payMax'))}</span><input class="i" name="pay_max" type="number" min="0" step="0.01" value="${esc(sel.pay_max ?? '')}"></label>
        <label class="f"><span>${esc(H('job.payUnit'))}</span><select class="i" name="pay_unit">${opt('hour', H('job.hour'), sel.pay_unit !== 'year')}${opt('year', H('job.year'), sel.pay_unit === 'year')}</select></label>
        <label class="f"><span>${esc(H('job.closes'))}</span><input class="i" name="closes_on" type="date" value="${esc(sel.closes_on || '')}"></label>
        <label class="f"><span>${esc(H('job.description'))}</span><textarea class="i" name="description" rows="5" maxlength="8000">${esc(sel.description || '')}</textarea></label>
        <label class="f"><span>${esc(H('job.description'))} (ES)</span><textarea class="i" name="description_es" rows="5" maxlength="8000" lang="es">${esc(sel.description_es || '')}</textarea></label>
        <label class="f"><span>${esc(H('job.requirements'))}</span><textarea class="i" name="requirements" rows="3" maxlength="4000">${esc(sel.requirements || '')}</textarea></label>
        <label class="f"><span>${esc(H('job.requirements'))} (ES)</span><textarea class="i" name="requirements_es" rows="3" maxlength="4000" lang="es">${esc(sel.requirements_es || '')}</textarea></label>
        <fieldset class="f" id="hrQs"><legend>${esc(H('job.screening'))}</legend>${settings.ban_the_box ? `<p class="small muted">${esc(H('job.btbNote'))}</p>` : ''}
          ${(sel.screening || []).map(qRow).join('')}<button class="btn link" id="hrAddQ" type="button">${esc(H('job.addQuestion'))}</button></fieldset>
        <div><button class="btn navy" type="submit" name="save">${esc(H('job.save'))}</button> <button class="btn gold" type="submit" name="published">${esc(H('job.publish'))}</button>
          ${sel.id ? `<button class="btn soft" type="submit" name="paused">${esc(H('job.pause'))}</button> <button class="btn soft" type="submit" name="closed">${esc(H('job.close'))}</button>` : ''}</div>
        <p class="msg" id="hrJobMsg" role="status"></p></form>` : '';
    page(frame(`<div class="card"><p><a class="btn navy" href="${base}?view=jobs&job=new" data-nav>${esc(H('job.new'))}</a></p>
        <div class="hr-scroll"><table class="hr-table"><thead><tr><th>${esc(H('job.title'))}</th><th>Status</th><th>${esc(H('job.openings'))}</th><th>${esc(H('tab.pipeline'))}</th></tr></thead><tbody>
        ${jobs.map((j) => `<tr><td><a href="${base}?view=jobs&job=${esc(j.id)}" data-nav>${esc(j.title)}</a><br><span class="small muted">${esc(H(`role.${j.job_role}`))} · ${esc(H(`emp.${j.employment_type}`))}</span></td>
          <td><span class="chip${j.status === 'published' ? ' ok' : ''}">${esc(H(`job.status.${j.status}`))}</span></td><td>${j.hired}/${j.openings}</td>
          <td><a href="${base}?view=pipeline&job=${esc(j.id)}" data-nav>${Object.values(j.counts || {}).reduce((x, y) => x + y, 0)}</a></td></tr>`).join('') || `<tr><td colspan="4" class="muted">${esc(H('job.none'))}</td></tr>`}</tbody></table></div></div>${form}`), H('tab.jobs'), { english: true });
    if (!sel) return;
    $('#hrAddQ').onclick = () => { $('#hrAddQ').insertAdjacentHTML('beforebegin', qRow({}, $$('[data-q]').length)); };
    $('#hrJob').onsubmit = async (e) => {
      e.preventDefault();
      const f = e.target; const b = e.submitter?.name;
      const screening = $$('[data-q]').map((row, i) => ({ q: row.querySelector('[name="q"]').value.trim(), knockout: row.querySelector('[name="ko"]').value || null,
        key: row.querySelector('[name="key"]').value || `q${i + 1}` })).filter((x) => x.q);
      const p = { title: val(f, 'title'), title_es: val(f, 'title_es'), job_role: val(f, 'job_role'), employment_type: val(f, 'employment_type'), forecast_room: val(f, 'forecast_room'),
        openings: Number(val(f, 'openings') || 1), pay_min: val(f, 'pay_min'), pay_max: val(f, 'pay_max'), pay_unit: val(f, 'pay_unit'), closes_on: val(f, 'closes_on'),
        description: val(f, 'description'), description_es: val(f, 'description_es'), requirements: val(f, 'requirements'), requirements_es: val(f, 'requirements_es'), screening,
        ...(b && b !== 'save' ? { status: b } : {}) };
      try { const r = await rpc('hiring_job_save', { p_center: c.center_id, p_job: sel.id || null, p }); go(`${base}?view=jobs&job=${r.id}`, true); }
      catch (err) { fail($('#hrJobMsg'), err); }
    };
  }

  // ---- interviews ---------------------------------------------------------------------------------------------------------------------
  async function viewInterviews({ c, frame }) {
    const [list, slots, staff] = await Promise.all([rpc('hiring_interviews_list', { p_center: c.center_id, p_days: 28 }), rpc('hiring_slots_list', { p_center: c.center_id, p_days: 28 }),
      rpc('hiring_credential_board', { p_center: c.center_id }).then((b) => b.staff, () => [])]);
    page(frame(`<div class="grid two"><form id="hrSlots" class="card grid" novalidate><h3>${esc(H('iv.add'))}</h3>
        <label class="f"><span>${esc(H('iv.interviewer'))}</span><select class="i" name="who">${staff.map((s) => opt(s.user_id, s.name)).join('')}</select></label>
        <label class="f"><span>Date / Fecha</span><input class="i" name="date" type="date" required></label>
        <label class="f"><span>${esc(H('iv.times'))}</span><input class="i" name="times" placeholder="09:00, 09:45, 13:30" required></label>
        <label class="f"><span>${esc(H('iv.minutes'))}</span><input class="i" name="minutes" type="number" min="15" max="180" value="30"></label>
        <label class="f"><span>${esc(H('iv.mode'))}</span><select class="i" name="mode">${['in_person', 'phone', 'video'].map((m) => opt(m, H(`iv.${m}`))).join('')}</select></label>
        <label class="f"><span>${esc(H('iv.where'))}</span><input class="i" name="location" maxlength="300"></label>
        <div><button class="btn navy" type="submit">${esc(H('common.save'))}</button></div><p class="msg" id="hrSlotsMsg" role="status"></p></form>
      <div class="card"><h3>${esc(H('tab.interviews'))}</h3><ul>${list.filter((i) => i.status === 'scheduled').map((i) => `<li>${esc(when(i.starts_at))} · <a href="/c/${esc(c.slug)}/hiring?app=${esc(i.application_id)}" data-nav>${esc(i.name)}</a> · ${esc(i.job)} · ${esc(i.interviewer || '')}</li>`).join('') || `<li class="muted">${esc(H('iv.none'))}</li>`}</ul>
        <h3>${esc(H('iv.open'))}</h3><ul>${slots.map((s) => `<li>${esc(when(s.starts_at))} · ${esc(s.interviewer)} · ${esc(H(`iv.${s.mode}`))}${s.booked ? ` · <b>${esc(s.booked.name)}</b>` : ''}
          <button class="btn link hr-slotx" data-slot="${esc(s.id)}" type="button">${esc(H('common.cancel'))}</button></li>`).join('') || `<li class="muted">${esc(H('iv.none'))}</li>`}</ul><p class="msg" id="hrSlotMsg" role="status"></p></div></div>`), H('tab.interviews'), { english: true });
    $('#hrSlots').onsubmit = async (e) => {
      e.preventDefault(); const f = e.target;
      const starts = val(f, 'times').split(/[\s,]+/).filter((x) => /^\d{1,2}:\d{2}$/.test(x)).map((tm) => new Date(`${val(f, 'date')}T${tm.padStart(5, '0')}:00`).toISOString());
      try { const n = await rpc('hiring_slots_add', { p_center: c.center_id, p_interviewer: val(f, 'who'), p_starts: starts, p_minutes: Number(val(f, 'minutes')), p_mode: val(f, 'mode'), p_location: val(f, 'location') || null });
        say($('#hrSlotsMsg'), `${n} ✔`); go(FFTest.pathname() + location.search, true); } catch (err) { fail($('#hrSlotsMsg'), err); }
    };
    $$('.hr-slotx').forEach((b) => { b.onclick = async () => { try { await rpc('hiring_slot_cancel', { p_center: c.center_id, p_slot: b.dataset.slot }); go(FFTest.pathname() + location.search, true); } catch (e) { fail($('#hrSlotMsg'), e); } }; });
  }

  // an interviewer who is not on the hiring team: their interviews and their own scorecards only
  async function viewInterviewer(c, shell, q, base) {
    const list = await rpc('hiring_interviews_list', { p_center: c.center_id, p_days: 28 });
    const app = q.get('app');
    let form = '';
    if (app) {
      const sc = await rpc('hiring_scorecards_for', { p_center: c.center_id, p_app: app });
      const mine = sc.cards.find((x) => x.mine);
      const comp = sc.template.competencies;
      form = mine?.status === 'submitted' ? `<p class="msg ok">${esc(H('common.saved'))}</p>` : `<form id="hrScore" class="card grid" novalidate><h3>${esc(H('sc.title'))}</h3><p class="small muted">${esc(H('sc.jobOnly'))}</p>
        ${comp.map((x) => `<fieldset class="f"><legend>${esc((lang === 'es' && x.label_es) || x.label)}</legend><div class="hr-rate">${[1, 2, 3, 4].map((n) => `<label><input type="radio" name="r_${esc(x.key)}" value="${n}"> ${n}</label>`).join('')}</div></fieldset>`).join('')}
        <label class="f"><span>${esc(H('sc.recommendation'))}</span><select class="i" name="rec">${['strong_yes', 'yes', 'no', 'strong_no'].map((r) => opt(r, H(`sc.${r}`))).join('')}</select></label>
        <label class="f"><span>${esc(H('sc.summary'))}</span><textarea class="i" name="summary" rows="3"></textarea></label><div><button class="btn navy" type="submit">${esc(H('sc.submit'))}</button></div><p class="msg" id="hrScoreMsg" role="status"></p></form>`;
      page(shell(`<section id="hiring"><h2>${esc(H('tab.interviews'))}</h2>${form}</section>`), H('tab.interviews'), { english: true });
      $('#hrScore') && ($('#hrScore').onsubmit = async (e) => {
        e.preventDefault(); const f = e.target; const ratings = {};
        for (const x of comp) { const r = f.querySelector(`input[name="r_${x.key}"]:checked`); if (r) ratings[x.key] = Number(r.value); }
        try { await rpc('hiring_scorecard_save', { p_center: c.center_id, p_app: app, p_interview: q.get('iv') || null, p_ratings: ratings, p_notes: {}, p_recommendation: val(f, 'rec'), p_summary: val(f, 'summary') || null, p_submit: true });
          go(`${base}?view=interviews`); } catch (err) { fail($('#hrScoreMsg'), err); }
      });
      return;
    }
    page(shell(`<section id="hiring"><h2>${esc(H('tab.interviews'))}</h2><div class="card"><ul>${list.map((i) => `<li>${esc(when(i.starts_at))} · ${esc(i.name)} · ${esc(i.job)} · ${esc(i.status)}
      ${i.scorecard !== 'submitted' ? ` <a href="${base}?app=${esc(i.application_id)}&iv=${esc(i.id)}" data-nav>${esc(H('sc.title'))}</a>` : ' ✔'}</li>`).join('') || `<li class="muted">${esc(H('iv.none'))}</li>`}</ul></div></section>`), H('tab.interviews'), { english: true });
  }

  // a staff member's own credentials and onboarding checklist (pending people too)
  async function viewMine(c, shell, q) {
    const m = await rpc('my_credentials', { p_center: c.center_id });
    const hi = q.get('cred');
    page(shell(`<section id="hiring" data-view="mine"><h2>${esc(H('cred.title'))}</h2><div class="card" id="hrMine"><ul>${m.items.map((i) => `<li${i.type === hi ? ' class="hr-hi" aria-current="true"' : ''}>
        <b>${esc((lang === 'es' && i.label_es) || i.label)}</b>: <span class="chip">${esc(H(`cred.status.${i.status}`))}</span>${i.expires_on ? ` ${esc(day(i.expires_on))}` : i.due_on ? ` · ${esc(day(i.due_on))}` : ''}
        <span class="mini muted">${esc(i.citation)}</span></li>`).join('') || '<li class="muted">—</li>'}</ul></div>
      ${m.onboarding.length ? `<div class="card"><h3>${esc(H('app.onboarding'))}</h3><ul>${m.onboarding.map((o) => `<li>${o.done ? '✔' : '○'} ${esc((lang === 'es' && o.label_es) || o.label)}${o.due_on ? ` · ${esc(day(o.due_on))}` : ''}</li>`).join('')}</ul></div>` : ''}</section>`),
      H('cred.title'), { english: true });
  }

  // ---- talent pool ------------------------------------------------------------------------------------------------------------------
  async function viewPool({ c, base, q, frame }) {
    const [pool, jobs] = await Promise.all([rpc('hiring_talent_pool', { p_center: c.center_id, p_tag: q.get('tag') || null }), rpc('hiring_jobs_list', { p_center: c.center_id })]);
    const pub = jobs.filter((j) => j.status === 'published');
    page(frame(`<div class="card"><div class="hr-scroll"><table class="hr-table"><thead><tr><th>Name</th><th>Tags</th><th>${esc(H('app.history'))}</th><th>${esc(H('app.reengage'))}</th></tr></thead><tbody>
      ${pool.map((p) => `<tr><td><b>${esc(p.name)}</b>${p.finalist ? ' <span class="chip gold">finalist</span>' : ''}<br><span class="small muted">${esc(H(`source.${p.source}`))}</span></td>
        <td>${(p.tags || []).map((x) => `<a class="chip" href="${base}?view=pool&tag=${encodeURIComponent(x)}" data-nav>${esc(x)}</a>`).join(' ')}</td>
        <td class="small">${p.last ? `${esc(p.last.job)} · ${esc(H(`stage.${p.last.stage}`))}` : ''}</td>
        <td>${p.contact_ok && pub.length ? `<form class="hr-re" data-cand="${esc(p.id)}"><label class="sr-only" for="re-${esc(p.id)}">${esc(H('app.reengage'))}</label><select class="i" id="re-${esc(p.id)}" name="job">${pub.map((j) => opt(j.id, j.title)).join('')}</select>
          <button class="btn small soft" type="submit">${esc(H('app.reengage'))}</button></form>` : ''}</td></tr>`).join('') || `<tr><td colspan="4" class="muted">—</td></tr>`}</tbody></table></div><p class="msg" id="hrPoolMsg" role="status"></p></div>`), H('tab.pool'), { english: true });
    $$('.hr-re').forEach((f) => { f.onsubmit = async (e) => { e.preventDefault(); try { const r = await rpc('hiring_reengage', { p_center: c.center_id, p_candidate: f.dataset.cand, p_job: val(f, 'job') }); go(`${base}?app=${r.application_id}`); } catch (err) { fail($('#hrPoolMsg'), err); } }; });
  }

  // ---- staffing forecast ------------------------------------------------------------------------------------------------------------
  async function viewForecast({ c, frame }) {
    const f = await rpc('hiring_staffing_forecast', { p_center: c.center_id });
    const a = f.assumptions || {};
    page(frame(`<div class="card" id="hrForecast"><h3>${esc(H('fc.title'))}: ${esc(H('fc.hire'))} <b>${esc(f.totals.to_hire)}</b> · ${esc(H('fc.atCapacity'))} ${esc(f.totals.to_hire_at_capacity)}</h3>
      <p class="small muted">${esc(H('fc.assumptions', { hours: a.open_hours, days: a.days, coverage: a.coverage, fte: a.fte_hours }))} ${esc(f.note)}</p>
      <div class="hr-scroll"><table class="hr-table"><thead><tr><th>${esc(H('fc.room'))}</th><th>${esc(H('fc.enrolled'))}</th><th>${esc(H('fc.ratio'))}</th><th>${esc(H('fc.need'))}</th><th>${esc(H('fc.scheduled'))}</th><th>${esc(H('fc.open'))}</th><th>${esc(H('fc.hire'))}</th></tr></thead><tbody>
      ${f.rooms.map((r) => `<tr><td><b>${esc(r.room_name)}</b>${r.warnings.length ? `<br><span class="small muted">${esc(r.warnings.join(' '))}</span>` : ''}</td><td>${r.enrolled}${r.capacity ? ` / ${r.capacity}` : ''}</td>
        <td>${esc(r.ratio || '–')}<br><span class="mini muted">${esc(r.citation || '')}</span></td><td>${r.fte_needed ?? '–'}</td>
        <td><form class="hr-fte" data-room="${esc(r.room)}"><label class="sr-only" for="fte-${esc(r.room)}">${esc(H('fc.scheduled'))} ${esc(r.room_name)}</label><input class="i" id="fte-${esc(r.room)}" name="fte" type="number" min="0" max="99" step="0.5" value="${esc(r.scheduled_fte)}">
          ${r.scheduled_is_estimate ? `<span class="mini muted">${esc(H('fc.estimate'))}</span>` : ''}<button class="btn small soft" type="submit">${esc(H('fc.save'))}</button></form></td>
        <td>${r.open_requisitions}</td><td><b>${r.to_hire ?? '–'}</b><br><span class="mini muted">${esc(H('fc.atCapacity'))}: ${r.to_hire_at_capacity ?? '–'}</span></td></tr>`).join('')}</tbody></table></div>
      <p class="msg" id="hrFcMsg" role="status"></p></div>`), H('fc.title'), { english: true });
    $$('.hr-fte').forEach((fm) => { fm.onsubmit = async (e) => { e.preventDefault(); try { await rpc('hiring_room_staffing_save', { p_center: c.center_id, p_room: fm.dataset.room, p_fte: Number(val(fm, 'fte')), p_note: null }); go(FFTest.pathname() + location.search, true); } catch (err) { fail($('#hrFcMsg'), err); } }; });
  }

  // ---- credentials ------------------------------------------------------------------------------------------------------------------
  async function viewCredentials({ c, frame }) {
    const b = await rpc('hiring_credential_board', { p_center: c.center_id });
    const types = await client().from('hiring_credential_types').select('key, label, label_es').then((r) => r.data || [], () => []);
    const chip = (i) => `<span class="chip ${({ ok: 'ok', expiring: 'warn', expired: 'bad', overdue: 'bad', missing: '', optional: '' })[i.status]}" title="${esc(i.citation)}">${esc((lang === 'es' && i.label_es) || i.label)}: ${esc(H(`cred.status.${i.status}`))}${i.expires_on ? ` ${esc(day(i.expires_on))}` : ''}</span>`;
    page(frame(`<div class="card" id="hrCreds"><h3>${esc(H('cred.title'))}${b.state ? ` · ${esc(b.state)}` : ''}</h3>${b.pending_states_note ? `<p class="msg info">${esc(b.pending_states_note)}</p>` : ''}
      ${b.coverage ? `<p class="msg ${b.coverage.certified >= b.coverage.needed ? 'ok' : 'bad'}">${esc(H('cred.coverage', { have: b.coverage.certified, need: b.coverage.needed }))} (${esc(b.coverage.citation)})</p>` : ''}
      <div class="hr-scroll"><table class="hr-table"><tbody>${b.staff.map((s) => `<tr><td><b>${esc(s.name)}</b><br><span class="small muted">${esc(H(`role.${s.job_role}`))}</span></td><td><div class="chips">${s.items.map(chip).join('')}</div></td></tr>`).join('')}</tbody></table></div></div>
      <form id="hrCred" class="card grid two" novalidate><h3>${esc(H('cred.add'))}</h3>
        <label class="f"><span>Staff</span><select class="i" name="user">${b.staff.map((s) => opt(s.user_id, s.name)).join('')}</select></label>
        <label class="f"><span>Type</span><select class="i" name="type">${types.map((x) => opt(x.key, (lang === 'es' && x.label_es) || x.label)).join('')}</select></label>
        <label class="f"><span>${esc(H('cred.issued'))}</span><input class="i" name="issued" type="date"></label>
        <label class="f"><span>${esc(H('cred.expires'))}</span><input class="i" name="expires" type="date"></label>
        <div><button class="btn navy" type="submit">${esc(H('common.save'))}</button></div><p class="msg" id="hrCredMsg" role="status"></p></form>`), H('cred.title'), { english: true });
    $('#hrCred').onsubmit = async (e) => {
      e.preventDefault(); const f = e.target;
      try { await rpc('hiring_credential_save', { p_center: c.center_id, p_user: val(f, 'user'), p_app: null, p_type: val(f, 'type'), p_issued: val(f, 'issued') || null, p_expires: val(f, 'expires') || null, p_note: null });
        go(FFTest.pathname() + location.search, true); } catch (err) { fail($('#hrCredMsg'), err); }
    };
  }

  // ---- reports ----------------------------------------------------------------------------------------------------------------------
  async function viewReports({ c, director, frame }) {
    const f = await rpc('hiring_funnel', { p_center: c.center_id, p_from: null, p_to: null });
    const eeo = director ? await rpc('hiring_eeo_report', { p_center: c.center_id, p_from: null, p_to: null }).catch(() => null) : null;
    const pct = (x) => (x == null ? '–' : `${Math.round(x * 1000) / 10}%`);
    const steps = ['applied', 'screening', 'interview', 'offer', 'hired'];
    const eeoTable = (dim, rows) => `<h4>${esc(dim)}</h4><div class="hr-scroll"><table class="hr-table"><thead><tr><th>${esc(dim)}</th><th>${esc(H('rep.applicants'))}</th><th>${esc(H('rep.hired'))}</th><th>${esc(H('rep.rate'))}</th><th>${esc(H('rep.impact'))}</th></tr></thead><tbody>
      ${rows.map((r) => `<tr><td>${esc(r.group)}</td>${r.suppressed ? `<td colspan="4" class="muted">${esc(H('rep.suppressed', { n: eeo.min_cell }))}</td>` : `<td>${r.applicants}</td><td>${r.hired ?? '<' + eeo.min_cell}</td><td>${pct(r.selection_rate)}</td><td>${r.impact_ratio ?? '–'}${r.below_four_fifths ? ' <span class="chip bad">&lt; 4/5</span>' : ''}</td>`}</tr>`).join('')}</tbody></table></div>`;
    page(frame(`<div class="grid two"><div class="card" id="hrFunnel"><h3>${esc(H('rep.funnel'))}</h3><table class="hr-table"><tbody>${steps.map((s, i) => `<tr><th>${esc(H(`stage.${s}`))}</th><td>${f.funnel[s]}</td><td class="muted">${i ? pct(f.funnel[steps[i - 1]] ? f.funnel[s] / f.funnel[steps[i - 1]] : null) : ''}</td></tr>`).join('')}</tbody></table>
        <p>${esc(H('rep.timeToHire'))}: <b>${esc(H('rep.median', { n: f.time_to_hire_days.median ?? '–' }))}</b></p>
        <p class="small">${Object.entries(f.days_in_stage || {}).map(([s, d]) => `${esc(H(`stage.${s}`))}: ${d} d`).join(' · ')}</p></div>
      <div class="card"><h3>${esc(H('rep.bySource'))}</h3><div class="hr-scroll"><table class="hr-table"><thead><tr><th>${esc(H('app.source'))}</th><th>${esc(H('rep.applicants'))}</th><th>${esc(H('stage.interview'))}</th><th>${esc(H('rep.hired'))}</th><th>${esc(H('rep.rate'))}</th></tr></thead><tbody>
        ${f.by_source.map((s) => `<tr><td>${esc(H(`source.${s.source}`))}</td><td>${s.applicants}</td><td>${s.interviewed}</td><td>${s.hired}</td><td>${pct(s.hire_rate)}</td></tr>`).join('')}</tbody></table></div>
        <h3>${esc(H('rep.referrals'))}</h3><ul>${f.referrals.map((r) => `<li>${esc(r.referrer)}: ${r.referrals} · ${esc(H('rep.hired'))} ${r.hired}</li>`).join('') || '<li class="muted">—</li>'}</ul>
        <h3>${esc(H('rep.offers'))}</h3><p>${f.offers.signed} / ${f.offers.sent} · ${pct(f.offers.acceptance_rate)}</p></div></div>
      ${eeo ? `<div class="card" id="hrEeo"><h3>${esc(H('rep.eeo'))}</h3><p class="small muted">${esc(H('rep.eeoNote', { n: eeo.min_cell }))} ${esc(eeo.note)}</p>
        ${Object.entries(eeo.dimensions).map(([dim, rows]) => eeoTable(dim, rows)).join('')}</div>` : ''}`), H('tab.reports'), { english: true });
  }

  // ---- privacy requests and settings (directors) ------------------------------------------------------------------------------------
  async function viewPrivacy({ c, frame }) {
    const list = await rpc('hiring_privacy_list', { p_center: c.center_id });
    page(frame(`<div class="card" id="hrPriv"><h3>${esc(H('priv.title'))}</h3><ul>${list.map((r) => `<li><b>${esc(r.name || '—')}</b> · ${esc(r.kind)} · <span class="chip${r.status === 'open' ? ' warn' : ''}">${esc(r.status)}</span> · ${esc(H('priv.due', { d: day(r.due_on) }))}
        ${r.status === 'open' || r.status === 'on_hold' ? `<form class="hr-priv grid two" data-id="${esc(r.id)}"><label class="f"><span>${esc(H('app.note'))}</span><input class="i" name="note" maxlength="500"></label>
          <div>${r.kind === 'delete' && !r.hired ? `<button class="btn soft" name="delete" type="submit">${esc(H('priv.delete'))}</button> ` : ''}<button class="btn soft" name="hold" type="submit">${esc(H('priv.hold'))}</button> <button class="btn soft" name="decline" type="submit">${esc(H('priv.decline'))}</button></div></form>` : ''}</li>`).join('') || `<li class="muted">${esc(H('priv.none'))}</li>`}</ul><p class="msg" id="hrPrivMsg" role="status"></p></div>`), H('tab.privacy'), { english: true });
    $$('.hr-priv').forEach((f) => { f.onsubmit = async (e) => { e.preventDefault(); try { await rpc('hiring_privacy_decide', { p_center: c.center_id, p_request: f.dataset.id, p_action: e.submitter?.name, p_note: val(f, 'note') || null }); go(FFTest.pathname() + location.search, true); } catch (err) { fail($('#hrPrivMsg'), err); } }; });
  }

  async function viewSettings({ c, frame }) {
    const s = await rpc('hiring_settings_get', { p_center: c.center_id });
    const feed = (p) => `<li><a href="${p}">${esc(location.origin)}${esc(p)}</a></li>`;
    page(frame(`<form id="hrSettings" class="card grid two" novalidate><h3>${esc(H('tab.settings'))}</h3>
      <label class="f"><span><input type="checkbox" name="careers_public"${s.careers_public ? ' checked' : ''}> ${esc(H('set.careers'))}</span></label>
      <label class="f"><span><input type="checkbox" name="ban_the_box"${s.ban_the_box ? ' checked' : ''}> ${esc(H('set.btb'))}</span></label>
      <label class="f"><span>${esc(H('set.address'))}</span><input class="i" name="street" maxlength="120" value="${esc(s.street || '')}"></label>
      <label class="f"><span>${esc(H('set.city'))}</span><input class="i" name="city" maxlength="80" value="${esc(s.city || '')}"></label>
      <label class="f"><span>${esc(H('set.postal'))}</span><input class="i" name="postal_code" maxlength="10" value="${esc(s.postal_code || '')}"></label>
      <label class="f"><span>${esc(H('set.retention'))}</span><input class="i" name="retention_months" type="number" min="12" max="84" value="${esc(s.retention_months)}"></label>
      <label class="f"><span>${esc(H('set.minCell'))}</span><input class="i" name="eeo_min_cell" type="number" min="3" max="50" value="${esc(s.eeo_min_cell)}"></label>
      <label class="f"><span>${esc(H('set.wait'))}</span><input class="i" name="fcra_wait_days" type="number" min="5" max="30" value="${esc(s.fcra_wait_days)}"></label>
      <fieldset class="f"><legend>${esc(H('set.sla'))}</legend>${OPEN_STAGES.map((st) => `<label class="f"><span>${esc(H(`stage.${st}`))}</span><input class="i" name="sla_${st}" type="number" min="1" max="60" value="${esc(s.sla_days[st] ?? 7)}"></label>`).join('')}</fieldset>
      <fieldset class="f"><legend>${esc(H('fc.title'))}</legend>${[['open_hours', 1, 24, 0.5], ['days', 1, 7, 1], ['fte_hours', 10, 60, 1], ['coverage', 1, 2, 0.05]].map(([n, mn, mx, st]) => `<label class="f"><span>${esc(n)}</span><input class="i" name="fc_${n}" type="number" min="${mn}" max="${mx}" step="${st}" value="${esc(s.forecast[n])}"></label>`).join('')}</fieldset>
      <p class="small"><b>${esc(H('set.esign'))}</b>: ${esc(H('set.esignBasic'))}. ${s.esign_vendor_on ? '' : esc(H('set.esignVendorOff'))}</p>
      <div><button class="btn navy" type="submit">${esc(H('set.save'))}</button></div><p class="msg" id="hrSetMsg" role="status"></p></form>
      <div class="card"><h3>${esc(H('set.feeds'))}</h3><ul class="small">${[`/careers/${c.slug}/jobs.json`, `/careers/${c.slug}/jobs.jsonld`, `/careers/${c.slug}/jobs.xml`].map(feed).join('')}</ul></div>`), H('tab.settings'), { english: true });
    $('#hrSettings').onsubmit = async (e) => {
      e.preventDefault(); const f = e.target;
      const p = { careers_public: val(f, 'careers_public'), ban_the_box: val(f, 'ban_the_box'), street: val(f, 'street'), city: val(f, 'city'), postal_code: val(f, 'postal_code'),
        retention_months: Number(val(f, 'retention_months')), eeo_min_cell: Number(val(f, 'eeo_min_cell')), fcra_wait_days: Number(val(f, 'fcra_wait_days')),
        sla_days: Object.fromEntries(OPEN_STAGES.map((st) => [st, Number(val(f, `sla_${st}`))])),
        forecast: Object.fromEntries(['open_hours', 'days', 'fte_hours', 'coverage'].map((n) => [n, Number(val(f, `fc_${n}`))])) };
      try { await rpc('hiring_settings_save', { p_center: c.center_id, p }); say($('#hrSetMsg'), H('set.saved')); } catch (err) { fail($('#hrSetMsg'), err); }
    };
  }

  // ---- the director's home tile -------------------------------------------------------------------------------------------------
  async function fillTile(c, l = 'en') {
    lang = l === 'es' ? 'es' : 'en';
    const el = $('#hiringTile');
    if (!el) return;
    try {
      const s = await rpc('hiring_summary', { p_center: c.center_id });
      const active = Object.values(s.active || {}).reduce((x, y) => x + y, 0);
      el.innerHTML = `<div class="card hr-tile" id="hrTile"><h2>${esc(H('tile.title'))}</h2><div class="hr-stats">
        <span class="chip">${esc(H('tile.open', { n: s.open_jobs }))}</span><span class="chip">${active} ${esc(H('tab.pipeline').toLowerCase())}</span>
        ${s.overdue ? `<span class="chip bad">${esc(H('tile.overdue', { n: s.overdue }))}</span>` : ''}<span class="chip">${esc(H('tile.interviews', { n: s.interviews_week }))}</span>
        ${s.to_hire ? `<span class="chip gold">${esc(H('tile.toHire', { n: s.to_hire }))}</span>` : ''}${s.credential_alerts ? `<span class="chip warn">${esc(H('tile.credentials', { n: s.credential_alerts }))}</span>` : ''}</div>
        <a class="btn soft" href="/c/${esc(c.slug)}/hiring" data-nav>${esc(H('tile.go'))}</a></div>`;
    } catch (_) { el.remove(); }
  }

  // ---------------------------------------------------------------------------------------------------------------------------------
  // the candidate page (no account; the link is the key)
  // ---------------------------------------------------------------------------------------------------------------------------------
  async function viewCandidate(token, { lang: initial = null } = {}) {
    let d;
    try { d = await rpc('hiring_portal_open', { p_token: token }); }
    catch (e) {
      lang = initial === 'es' ? 'es' : 'en';
      page(`<div class="wrap narrow hr-cand"><div class="card" id="candInvalid"><h1>${esc(H('cand.title'))}</h1><p class="msg bad" role="alert">${esc(H('cand.invalid'))}</p></div></div>`, H('cand.title'), { english: true });
      document.documentElement.lang = lang;
      return;
    }
    lang = initial || d.lang || 'en';
    candZone = d.center?.time_zone || null;
    const job = (lang === 'es' && d.job.title_es) || d.job.title;
    const again = () => viewCandidate(token, { lang });
    const act = async (sel, fn, okText) => { try { await fn(); if (okText) live(okText); await again(); if (okText) say($(sel), okText); } catch (e) { say($(sel), /slot_unavailable/.test(e.message) ? H('cand.taken') : friendly(e).replace(/^[a-z_]+: /, ''), 'bad'); } };
    const iv = d.interview;
    const lbl = (x) => (lang === d.lang ? x.label : when(x.starts_at));   // the server writes dates in the candidate's language
    const ivHtml = iv ? `<p><b>${esc(H('cand.booked', { when: lbl(iv) }))}</b> · ${esc(H(`cand.mode.${iv.mode}`))}${iv.location ? ` · ${esc(iv.location)}` : ''}</p>
        <p><button class="btn soft" id="candIcs" type="button">${esc(H('cand.addCalendar'))}</button> <button class="btn soft" id="candCancel" type="button">${esc(H('cand.cancel'))}</button></p>
        ${d.slots.length ? `<details><summary>${esc(H('cand.change'))}</summary><div class="hr-slots">${d.slots.map((s) => `<button class="btn soft cand-slot" type="button" data-slot="${esc(s.id)}">${esc(lbl(s))} · ${esc(H(`cand.mode.${s.mode}`))}</button>`).join('')}</div></details>` : ''}`
      : d.slots.length ? `<div class="hr-slots">${d.slots.map((s) => `<button class="btn soft cand-slot" type="button" data-slot="${esc(s.id)}">${esc(lbl(s))} · ${esc(H(`cand.mode.${s.mode}`))}</button>`).join('')}</div>` : '';
    const o = d.offer;
    const offerHtml = !o ? '' : `<section class="card" id="candOffer"><h2>${esc(H('cand.offer'))}</h2><div class="hr-letter" tabindex="0" role="region" aria-label="${esc(H('cand.offer'))}">${o.letter_html}</div>
      ${o.status === 'signed' ? `<p class="msg ok">${esc(H('cand.signed', { at: when(o.signed_at) }))}</p><p class="hr-hash">${esc(o.signature_hash)}</p><button class="btn soft no-print" id="candPrint" type="button">${esc(H('offer.print'))}</button>`
        : o.expired || o.status === 'expired' ? `<p class="msg bad">${esc(H('cand.expired'))}</p>`
        : o.status === 'sent' ? `<form id="candSign" class="grid" novalidate><p class="small muted">${esc(H('cand.basic'))}</p>
          <label class="f"><span>${esc(H('cand.typeName'))}</span><input class="i" name="name" required autocomplete="name" maxlength="120"></label>
          <label class="f"><span><input type="checkbox" name="agree" required> ${esc(H('cand.agree'))}</span></label>
          <div><button class="btn gold" type="submit">${esc(H('cand.sign'))}</button> <button class="btn soft" id="candDecline" type="button">${esc(H('cand.decline'))}</button></div></form>` : `<p>${esc(o.status)}</p>`}
      <p class="msg" id="candOfferMsg" role="status"></p></section>`;
    const b = d.background;
    const bgHtml = !b ? '' : `<section class="card" id="candBg"><h2>${esc(H('cand.bg'))}</h2>
      ${b.status === 'disclosure_sent' ? `<h3>${esc(b.disclosure.title)}</h3><div class="hr-letter" tabindex="0" role="region" aria-label="${esc(b.disclosure.title)}"><p>${esc(b.disclosure.text).replace(/\n\n/g, '</p><p>')}</p></div>
        <p><a href="${esc(b.disclosure.rights_url)}" rel="noopener" target="_blank">${esc(H('cand.bgRights'))}</a></p>
        <form id="candFcra" class="grid" novalidate><label class="f"><span>${esc(H('cand.typeName'))}</span><input class="i" name="name" autocomplete="name" maxlength="120"></label>
          <label class="f"><span><input type="checkbox" name="agree"> ${esc(b.disclosure.authorize)}</span></label>
          <div><button class="btn navy" type="submit" name="yes">${esc(H('cand.bgAuthorize'))}</button> <button class="btn soft" type="submit" name="no">${esc(H('cand.bgDecline'))}</button></div></form>`
        : `<p>${esc(H('cand.bgThanks'))}</p><p><a href="${esc(b.disclosure.rights_url)}" rel="noopener" target="_blank">${esc(H('cand.bgRights'))}</a></p>`}
      ${b.self_disclosure_open && o?.status === 'signed' ? `<form id="candCrim" class="card soft grid" novalidate><h3>${esc(H('cand.crim'))}</h3><p class="small muted">${esc(H('cand.crimNote'))}</p>
        <fieldset class="f"><legend>${esc(H('cand.crimQ'))}</legend><label><input type="radio" name="rec" value="no"> ${esc(H('common.no'))}</label> <label><input type="radio" name="rec" value="yes"> ${esc(H('common.yes'))}</label></fieldset>
        <label class="f"><span>${esc(H('cand.crimExplain'))}</span><textarea class="i" name="explain" rows="3" maxlength="2000"></textarea></label><div><button class="btn navy" type="submit">${esc(H('common.save'))}</button></div></form>` : ''}
      <p class="msg" id="candBgMsg" role="status"></p></section>`;
    const sel = (name, keys, prefix) => `<label class="f"><span>${esc(H(name))}</span><select class="i" name="${prefix}">${opt('decline', H('cand.decline'), true)}${keys.map((k) => opt(k, H(`${prefix[0]}.${k}`))).join('')}</select></label>`;
    page(`<div class="center-band"></div><div class="wrap hr-cand" id="candidate" data-stage="${esc(d.stage)}">
      <div class="card"><p class="no-print"><button class="btn link" id="candLang" type="button" lang="${lang === 'es' ? 'en' : 'es'}">${lang === 'es' ? 'English' : 'Español'}</button></p>
        <h1>${esc(H('cand.hello', { name: d.first_name }))}</h1><p class="lead">${esc(H('cand.for', { job, center: d.center.name }))}</p>
        <p><span class="chip gold" id="candStage">${esc(H('cand.status', { stage: H(`stage.${d.stage}`) }))}</span></p>
        ${!d.open ? `<p class="msg info">${esc(d.stage === 'withdrawn' ? H('cand.withdrawn') : H('cand.closed'))}</p>` : ''}
        ${d.open && d.invited && d.stage === 'applied' ? `<button class="btn gold" id="candInterest" type="button">${esc(H('cand.interested'))}</button>` : ''}<p class="msg" id="candMsg" role="status"></p></div>
      ${d.open && (iv || d.slots.length || d.stage === 'interview') ? `<section class="card" id="candInterview"><h2>${esc(H('cand.chooseTime'))}</h2>${ivHtml || `<p class="muted">${esc(H('cand.noTimes'))}</p>`}<p class="msg" id="candIvMsg" role="status"></p></section>` : ''}
      ${offerHtml}${bgHtml}
      ${d.open ? `<section class="card" id="candEeo"><h2>${esc(H('cand.eeo'))}</h2><p class="small muted">${esc(H('cand.eeoNote'))}</p>${d.eeo_done ? `<p class="small">${esc(H('cand.eeoDone'))}</p>` : ''}
        <details${d.eeo_done ? '' : ' open'}><summary>${esc(H('cand.eeo'))}</summary><form id="candEeoForm" class="grid two" novalidate>
          ${sel('cand.gender', ['female', 'male', 'nonbinary'], 'gender')}${sel('cand.race', ['hispanic_latino', 'white', 'black', 'asian', 'native_hawaiian_pacific', 'american_indian_alaska', 'two_or_more'], 'race_ethnicity')}
          ${sel('cand.veteran', ['protected_veteran', 'not_veteran'], 'veteran')}${sel('cand.disability', ['yes', 'no'], 'disability')}
          <div><button class="btn soft" type="submit">${esc(H('common.save'))}</button></div></form></details><p class="msg" id="candEeoMsg" role="status"></p></section>` : ''}
      <section class="card" id="candPrivacy"><h2>${esc(H('cand.privacy'))}</h2><p class="small muted">${esc(H('cand.retention'))}</p>
        <p><button class="btn soft" id="candData" type="button">${esc(H('cand.download'))}</button> <button class="btn soft" id="candDelete" type="button">${esc(H('cand.deleteReq'))}</button>
        ${d.open ? ` <button class="btn soft" id="candWithdraw" type="button">${esc(H('cand.withdraw'))}</button>` : ''}</p>
        ${d.privacy.filter((r) => r.kind === 'delete' && r.status !== 'done').map((r) => `<p class="msg info">${esc(H('cand.deleteSent', { d: day(r.due_on) }))}</p>`).join('')}<p class="msg" id="candPrivMsg" role="status"></p></section></div>`,
    H('cand.title'), { english: true });
    document.documentElement.lang = lang;
    $('#candLang').onclick = () => viewCandidate(token, { lang: lang === 'es' ? 'en' : 'es' });
    $$('.cand-slot').forEach((bt) => { bt.onclick = () => act('#candIvMsg', () => rpc('hiring_portal_book', { p_token: token, p_slot: bt.dataset.slot }), H('cand.bookedOk')); });
    $('#candCancel') && ($('#candCancel').onclick = () => act('#candIvMsg', () => rpc('hiring_portal_cancel', { p_token: token }), H('cand.cancelled')));
    $('#candIcs') && ($('#candIcs').onclick = () => download('interview.ics', 'text/calendar', buildIcs(iv.ics)));
    $('#candSign') && ($('#candSign').onsubmit = (e) => { e.preventDefault(); const f = e.target;
      act('#candOfferMsg', () => rpc('hiring_portal_offer_sign', { p_token: token, p_offer: o.id, p_typed_name: val(f, 'name'), p_agree: val(f, 'agree'), p_letter_hash: o.letter_hash })); });
    $('#candDecline') && ($('#candDecline').onclick = () => { if (confirm(H('cand.decline'))) act('#candOfferMsg', () => rpc('hiring_portal_offer_decline', { p_token: token, p_offer: o.id, p_reason: null })); });
    $('#candPrint') && ($('#candPrint').onclick = () => window.print());
    $('#candFcra') && ($('#candFcra').onsubmit = (e) => { e.preventDefault(); const f = e.target; const yes = e.submitter?.name === 'yes';
      act('#candBgMsg', () => rpc('hiring_portal_fcra', { p_token: token, p_typed_name: val(f, 'name'), p_agree: yes && val(f, 'agree') })); });
    $('#candCrim') && ($('#candCrim').onsubmit = (e) => { e.preventDefault(); const f = e.target; const r = f.querySelector('input[name="rec"]:checked');
      act('#candBgMsg', () => rpc('hiring_portal_self_disclose', { p_token: token, p: { has_record: r ? r.value === 'yes' : null, explanation: val(f, 'explain') } })); });
    $('#candEeoForm') && ($('#candEeoForm').onsubmit = (e) => { e.preventDefault(); const f = e.target;
      act('#candEeoMsg', () => rpc('hiring_portal_eeo', { p_token: token, p: { gender: val(f, 'gender'), race_ethnicity: val(f, 'race_ethnicity'), veteran: val(f, 'veteran'), disability: val(f, 'disability') } }), H('cand.eeoSaved')); });
    $('#candInterest') && ($('#candInterest').onclick = () => act('#candMsg', () => rpc('hiring_portal_interest', { p_token: token }), H('cand.interestedOk')));
    $('#candWithdraw') && ($('#candWithdraw').onclick = () => { if (confirm(H('cand.withdraw'))) act('#candMsg', () => rpc('hiring_portal_withdraw', { p_token: token, p_reason: null }), H('cand.withdrawn')); });
    $('#candData').onclick = async () => { try { const r = await rpc('hiring_portal_privacy', { p_token: token, p_kind: 'access' }); download('my-application.json', 'application/json', JSON.stringify(r.data, null, 2)); } catch (e) { say($('#candPrivMsg'), friendly(e), 'bad'); } };
    $('#candDelete').onclick = () => { if (confirm(H('cand.deleteReq'))) act('#candPrivMsg', () => rpc('hiring_portal_privacy', { p_token: token, p_kind: 'delete' })); };
  }

  return { viewHiring, viewCandidate, fillTile };
}
