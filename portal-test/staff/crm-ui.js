// /c/<slug>/crm: the enrollment desk (hub/CRM.md). Directors, and teachers with the 'enroll' permission (front desk); the database
// decides (crm_* functions), this page only mirrors it.
//   ?view=pipeline (default) | funnel | waitlist | messages | reenroll | referrals | settings      ?lead=<id> opens one family (deep link
//   from a notification: the family is shown, highlighted and focused; a family that is not here says so, never a silent jump)
// Family link pages (signed out; the token in ?t= is the credential): /c/<slug>/waitlist-status, /c/<slug>/tour, /c/<slug>/unsubscribe,
// /c/<slug>/reenroll. English + Spanish (DRAFT) from i18n.js 'crmpub.*'.
// Director strings: crm-core.js UI (English + Spanish DRAFT, same shape as i18n.js so they move there unchanged); shown in English like
// every staff page until the bilingual-everywhere track switches staff pages.
import { AGE_BANDS, DEFAULT_TEMPLATES, FUNNEL, LOST_REASONS, SEQUENCES, SOURCES, STAGES, TEMPLATE_KEYS, TEMPLATE_SEQUENCE, WAITLIST_RULES, formatWhen, pct, ui,
  unknownPlaceholders } from './crm-core.js';
import { localeOf, t as tr, uiLang } from './i18n.js';
import { centerToday, centerTz } from './center-time.js';   // the center's day and zone

const VIEWS = ['pipeline', 'funnel', 'waitlist', 'messages', 'reenroll', 'referrals', 'settings'];
const DIRECTOR_ONLY = new Set(['reenroll', 'settings']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const L = (k, v) => ui(k, v, uiLang());   // staff screens follow the person's own language (bilingual everywhere)
const when = (iso) => (iso ? new Date(iso).toLocaleString(localeOf(), { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: centerTz() }) : '');
const day = (iso) => (iso ? new Date(iso).toLocaleDateString(localeOf(), { month: 'short', day: 'numeric', year: 'numeric' }) : '');
const STAGE_CHIP = { inquiry: '', tour_booked: 'gold', toured: 'gold', applied: 'gold', waitlisted: 'warn', offered: 'warn', enrolled: 'ok', lost: 'bad' };

export function mountCrm({ esc, $, $$, rpc, page, live, friendly, go, client }) {
  const opt = (v, label, cur) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(label)}</option>`;
  const msg = (id, text, tone = 'ok') => { const el = $(`#${id}`); if (el) { el.className = `small msg ${tone}`; el.textContent = text; } live(text); };
  const busy = async (btn, fn) => { btn.disabled = true; try { await fn(); } finally { btn.disabled = false; } };

  // ---------------------------------------------------------------------------------------------------------------- the desk
  async function viewDesk(c, shell, { director = false } = {}) {
    const q = new URLSearchParams(location.search);
    let view = VIEWS.includes(q.get('view')) ? q.get('view') : 'pipeline';
    if (DIRECTOR_ONLY.has(view) && !director) view = 'pipeline';
    const lead = UUID.test(q.get('lead') || '') ? q.get('lead') : null;
    const base = `/c/${esc(c.slug)}/crm`;
    const nav = `<nav class="tabs" aria-label="${esc(L('crm.title'))}" id="crmViews">${VIEWS.filter((v) => director || !DIRECTOR_ONLY.has(v))
      .map((v) => `<a href="${base}?view=${v}" data-nav${v === view && !lead ? ' aria-current="page"' : ''}>${esc(L(`crm.tab.${v}`))}</a>`).join('')}</nav>`;
    const head = `<div class="card"><h2 id="crmTitle">${esc(L('crm.title'))}</h2><p class="muted">${esc(L('crm.lead'))}</p>${nav}<p class="small" id="crmSeq"></p></div>`;
    page(shell(`${head}<div id="crmBody"><p class="loading">Loading…</p></div>`), L('crm.title'), { english: true });
    try {
      const s = await rpc('crm_settings_get', { p_center: c.center_id });
      $('#crmSeq').innerHTML = s.sequences_on ? `<span class="chip ok">${esc(L('crm.seqOn'))}</span>`
        : `<span class="msg warn" id="seqOff">${esc(L('crm.seqOff'))}</span>`;
      const body = $('#crmBody');
      const ctx = { c, s, director, base, body };
      if (lead) return await viewLead(ctx, lead);
      if (view === 'funnel') return await viewFunnel(ctx);
      if (view === 'waitlist') return await viewWaitlist(ctx);
      if (view === 'messages') return await viewMessages(ctx);
      if (view === 'reenroll') return await viewReenroll(ctx);
      if (view === 'referrals') return await viewReferrals(ctx);
      if (view === 'settings') return await viewSettings(ctx);
      return await viewPipeline(ctx);
    } catch (e) {
      $('#crmBody').innerHTML = `<div class="card"><p class="msg bad" role="alert" id="crmErr">${esc(friendly(e))}</p></div>`;
    }
  }

  async function viewPipeline({ c, base, body }) {
    const q = new URLSearchParams(location.search);
    const stage = STAGES.includes(q.get('stage')) || q.get('stage') === 'open' ? q.get('stage') : null;
    const [leads, toMark, sum] = await Promise.all([
      rpc('crm_leads_list', { p_center: c.center_id, p_stage: stage, p_q: q.get('q') || null }),
      rpc('crm_tours_to_mark', { p_center: c.center_id }), rpc('crm_desk_summary', { p_center: c.center_id })]);
    const chips = `<p class="chips" id="crmCounts"><a class="chip" href="${base}?stage=open" data-nav>Open: ${sum.open}</a>
      <span class="chip">New this week: ${sum.new_7d}</span><span class="chip ${sum.first_contact_overdue ? 'bad' : ''}">${esc(L('crm.overdue'))}: ${sum.first_contact_overdue}</span>
      <span class="chip">Tours next 7 days: ${sum.tours_next_7d}</span><span class="chip">Waiting: ${sum.waiting}</span><span class="chip">Offers open: ${sum.offers_open}</span>
      <span class="chip ok">Enrolled (30 days): ${sum.enrolled_30d}</span></p>`;
    const filter = `<form class="row two" id="crmFilter" role="search"><label class="f"><span>${esc(L('crm.search'))}</span><input class="i" id="crmQ" value="${esc(q.get('q') || '')}" maxlength="80"></label>
      <label class="f"><span>Stage</span><select class="i" id="crmStage">${opt('', 'All', stage || '')}${opt('open', 'Open (not enrolled or lost)', stage)}${STAGES.map((s) => opt(s, L(`stage.${s}`), stage)).join('')}</select></label></form>`;
    const mark = toMark.length ? `<div class="card" id="toursToMark"><h3>${esc(L('crm.toMark'))}</h3><ul class="list">${toMark.map((t) => `<li data-booking="${esc(t.booking)}">
        <span>${esc(when(t.starts_at))} · ${t.lead_id ? `<a href="${base}?lead=${esc(t.lead_id)}" data-nav>${esc(t.family_name)}</a>` : esc(t.family_name)}</span>
        <button class="btn small" type="button" data-outcome="attended">${esc(L('crm.attended'))}</button> <button class="btn soft small" type="button" data-outcome="no_show">${esc(L('crm.noShow'))}</button></li>`).join('')}</ul>
        <p class="small" id="markMsg" aria-live="polite"></p></div>` : '';
    const add = `<details class="card" id="addLead"><summary><b>${esc(L('crm.newLead'))}</b></summary><form id="addLeadForm" novalidate>
      <div class="row two"><label class="f"><span>Family name</span><input class="i" id="alName" maxlength="120" required></label>
        <label class="f"><span>Child's first name</span><input class="i" id="alChild" maxlength="60"></label></div>
      <div class="row two"><label class="f"><span>Email</span><input class="i" id="alEmail" type="email" maxlength="254"></label>
        <label class="f"><span>Phone</span><input class="i" id="alPhone" type="tel" maxlength="20"></label></div>
      <div class="row two"><label class="f"><span>How they found us</span><select class="i" id="alSource">${SOURCES.filter((s) => s !== 'website').map((s) => opt(s, L(`source.${s}`), 'phone')).join('')}</select></label>
        <label class="f"><span>Age</span><select class="i" id="alBand">${opt('', 'Not known yet', '')}${AGE_BANDS.map((b) => opt(b, L(`band.${b}`), '')).join('')}</select></label></div>
      <div class="row two"><label class="f"><span>Language</span><select class="i" id="alLang">${opt('en', 'English', 'en')}${opt('es', 'Español', 'en')}</select></label>
        <label class="f"><span>Referral code (optional)</span><input class="i" id="alRef" maxlength="24"></label></div>
      <p><button class="btn" type="submit">${esc(L('crm.newLead'))}</button></p><p class="small" id="alMsg" aria-live="polite"></p></form></details>`;
    const rows = leads.map((l) => `<tr data-lead="${esc(l.id)}"><td><a href="${base}?lead=${esc(l.id)}" data-nav>${esc(l.family_name)}</a>${l.child_first ? `<br><span class="small muted">${esc(l.child_first)}</span>` : ''}</td>
      <td><span class="chip ${STAGE_CHIP[l.stage]}">${esc(L(`stage.${l.stage}`))}</span>${l.sla_overdue ? ` <span class="chip bad">${esc(L('crm.overdue'))}</span>` : ''}</td>
      <td>${esc(L(`source.${l.source}`))}${l.utm_campaign ? `<br><span class="small muted">${esc(l.utm_campaign)}</span>` : ''}</td><td>${esc(day(l.created_at))}</td></tr>`).join('');
    body.innerHTML = `${chips}${mark}${add}<div class="card"><h3>Families</h3>${filter}<div class="tablewrap"><table class="t" id="crmLeads"><thead><tr><th>Family</th><th>Stage</th><th>Source</th><th>First contact us</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="4" class="muted">${esc(L('crm.none'))}</td></tr>`}</tbody></table></div></div>`;
    const apply = () => { const p = new URLSearchParams(); const qq = $('#crmQ').value.trim(); const st = $('#crmStage').value; if (qq) p.set('q', qq); if (st) p.set('stage', st); go(`${base}${p.toString() ? `?${p}` : ''}`); };
    $('#crmFilter').onsubmit = (e) => { e.preventDefault(); apply(); };
    $('#crmStage').onchange = apply;
    $$('#toursToMark [data-outcome]').forEach((b) => { b.onclick = () => busy(b, async () => {
      const li = b.closest('li');
      try { await rpc('crm_tour_outcome', { p_center: c.center_id, p_booking: li.dataset.booking, p_outcome: b.dataset.outcome }); li.remove(); msg('markMsg', L('crm.saved')); }
      catch (e) { msg('markMsg', friendly(e), 'bad'); }
    }); });
    $('#addLeadForm').onsubmit = async (e) => {
      e.preventDefault();
      const p = { family_name: $('#alName').value, child_first: $('#alChild').value || null, email: $('#alEmail').value || null, phone: $('#alPhone').value || null,
        source: $('#alSource').value, child_age_band: $('#alBand').value || null, lang: $('#alLang').value, referral_code: $('#alRef').value || null };
      try { const l = await rpc('crm_lead_save', { p_center: c.center_id, p_lead: null, p }); go(`${base}?lead=${l.id}`); }
      catch (err) { msg('alMsg', friendly(err), 'bad'); }
    };
  }

  async function viewLead({ c, director, base, body }, id) {
    let l;
    try { l = await rpc('crm_lead_get', { p_center: c.center_id, p_lead: id }); }
    catch (e) {
      body.innerHTML = `<div class="card"><p class="msg warn deep-miss" role="alert" id="deepMiss">This family is not in this center's pipeline any more, or the link is not for this center.</p>
        <p><a href="${base}" data-nav>Back to the pipeline</a></p><p class="small muted">${esc(friendly(e))}</p></div>`;
      $('#deepMiss')?.focus?.();
      return;
    }
    const wl = l.waitlist;
    const contact = [l.email ? `<a href="mailto:${esc(l.email)}">${esc(l.email)}</a>` : '', l.phone ? `<a href="tel:${esc(l.phone)}">${esc(l.phone)}</a>` : ''].filter(Boolean).join(' · ');
    const attr = [['Source', L(`source.${l.source}`)], ['Campaign', l.utm_campaign], ['utm_source', l.utm_source], ['utm_medium', l.utm_medium], ['Referred from', l.referrer_host],
      ['Landing page', l.landing_path], ['Referral code', l.referral_code], ['Website reference', l.intake_ref]].filter(([, v]) => v);
    const settings = await rpc('crm_settings_get', { p_center: c.center_id });
    body.innerHTML = `<div class="card deep-hl" id="leadDetail" tabindex="-1" data-lead="${esc(l.id)}">
      <p class="small"><a href="${base}" data-nav>← ${esc(L('crm.tab.pipeline'))}</a></p>
      <h2 id="leadName">${esc(l.family_name)}</h2>
      <p><span class="chip ${STAGE_CHIP[l.stage]}" id="leadStage">${esc(L(`stage.${l.stage}`))}</span>${l.lost_reason ? ` <span class="chip bad">${esc(L(`lost.${l.lost_reason}`))}</span>` : ''}
        ${l.sla_overdue ? ` <span class="chip bad">${esc(L('crm.overdue'))}</span>` : ''}${l.replied_at ? ' <span class="chip">Replied: automatic messages stopped</span>' : ''}
        ${l.automation_paused ? ' <span class="chip warn">Automatic messages paused</span>' : ''}${l.email_opt_out_at ? ' <span class="chip">Unsubscribed from email</span>' : ''}
        ${l.sms_consent ? ` <span class="chip ok">Texts OK (${esc(l.sms_consent_source)}, ${esc(day(l.sms_consent_at))})</span>` : ''}</p>
      <p>${contact || '<span class="muted">No contact details</span>'}</p>
      <p class="small muted">${l.child_first ? `Child: ${esc(l.child_first)} · ` : ''}${l.child_age_band ? `${esc(L(`band.${l.child_age_band}`))} · ` : ''}Language: ${l.lang === 'es' ? 'Español' : 'English'} · First contacted us ${esc(when(l.created_at))}${l.first_contact_at ? ` · We reached them ${esc(when(l.first_contact_at))}` : ''}</p>
      ${attr.length ? `<p class="small" id="leadAttr">${attr.map(([k, v]) => `<span class="chip">${esc(k)}: ${esc(v)}</span>`).join(' ')}</p>` : ''}
      <div class="row two">
        <form id="stageForm"><label class="f"><span>${esc(L('crm.moveTo'))}</span><select class="i" id="stageSel">${opt('', 'Choose a stage…', '')}${STAGES.filter((s) => !['waitlisted', 'offered'].includes(s) && s !== l.stage).map((s) => opt(s, L(`stage.${s}`), '')).join('')}</select></label>
          <label class="f" id="lostWrap" hidden><span>${esc(L('crm.lostWhy'))}</span><select class="i" id="lostSel">${opt('', 'Choose…', '')}${LOST_REASONS.map((r) => opt(r, L(`lost.${r}`), '')).join('')}</select></label>
          <button class="btn small" type="submit">Save stage</button></form>
        <form id="contactForm"><label class="f"><span>${esc(L('crm.contacted'))}</span><select class="i" id="howSel">${['call', 'email', 'text', 'in_person', 'voicemail'].map((h) => opt(h, h.replace('_', ' '), 'call')).join('')}</select></label>
          <button class="btn small" type="submit">Record</button></form>
      </div>
      <p class="actions"><button class="btn soft small" type="button" id="btnReplied">${esc(L('crm.replied'))}</button>
        <button class="btn soft small" type="button" id="btnPause">${esc(l.automation_paused ? L('crm.resume') : L('crm.pause'))}</button>
        ${l.tours.some((t) => t.status === 'booked') ? '<button class="btn soft small" type="button" id="btnTourLink">Tour change link for the family</button>' : ''}
        ${wl ? '<button class="btn soft small" type="button" id="btnStatusLink">Waitlist status link for the family</button>' : ''}
        ${director ? `<button class="btn small" type="button" id="btn360">${esc(L('crm.family360'))}</button>` : ''}</p>
      <p class="small" id="leadMsg" aria-live="polite"></p><p class="small" id="linkOut"></p>
      <details><summary>Details and waitlist facts</summary><form id="leadEdit">
        <div class="row two"><label class="f"><span>Family name</span><input class="i" id="leName" value="${esc(l.family_name)}" maxlength="120"></label>
          <label class="f"><span>Child's first name</span><input class="i" id="leChild" value="${esc(l.child_first || '')}" maxlength="60"></label></div>
        <div class="row two"><label class="f"><span>Email</span><input class="i" id="leEmail" type="email" value="${esc(l.email || '')}"></label>
          <label class="f"><span>Phone</span><input class="i" id="lePhone" type="tel" value="${esc(l.phone || '')}"></label></div>
        <div class="row two"><label class="f"><span>Language</span><select class="i" id="leLang">${opt('en', 'English', l.lang)}${opt('es', 'Español', l.lang)}</select></label>
          <label class="f"><span>Age</span><select class="i" id="leBand">${opt('', 'Not known yet', l.child_age_band || '')}${AGE_BANDS.map((b) => opt(b, L(`band.${b}`), l.child_age_band)).join('')}</select></label></div>
        <fieldset><legend>Waitlist facts you confirmed (never guessed)</legend>
          <label class="choice"><input type="checkbox" id="leSib"${l.sibling ? ' checked' : ''}> <span>${esc(L('rule.sibling'))}</span></label>
          <label class="choice"><input type="checkbox" id="leStaff"${l.staff_child ? ' checked' : ''}> <span>${esc(L('rule.staff_child'))}</span></label>
          <label class="choice"><input type="checkbox" id="leSub"${l.subsidy ? ' checked' : ''}> <span>${esc(L('rule.subsidy'))}</span></label></fieldset>
        <fieldset><legend>Text messages (TCPA: only with the family's own yes)</legend>
          <label class="choice"><input type="checkbox" id="leSms"${l.sms_consent ? ' checked' : ''}> <span>The family agreed to automatic texts</span></label>
          <label class="f"><span>How they agreed</span><select class="i" id="leSmsHow">${opt('paper', 'Signed paper form', 'paper')}${opt('verbal_recorded', 'Recorded verbal yes', '')}</select></label></fieldset>
        <button class="btn small" type="submit">Save details</button></form></details>
      ${!wl && !['enrolled', 'lost'].includes(l.stage) ? `<details id="wlAdd"><summary>${esc(L('crm.waitlistAdd'))}</summary><form id="wlAddForm" class="row two">
        <label class="f"><span>Room</span><select class="i" id="wlRoom">${opt('', 'No room chosen yet', '')}${settings.rooms.map((r) => opt(r.id, r.name, '')).join('')}</select></label>
        <label class="f"><span>Joined the list on (only for an earlier paper list)</span><input class="i" type="date" id="wlJoined"></label>
        <button class="btn small" type="submit">${esc(L('crm.waitlistAdd'))}</button></form></details>` : ''}
      ${wl ? `<p id="leadWait">Waitlist: <b>${esc(wl.room_name || 'no room chosen yet')}</b> · ${wl.place ? esc(L('crm.place', { place: wl.place, size: wl.queue_size })) : esc(wl.status)} · ${esc(L('crm.points', { points: wl.points ?? 0 }))}
        <a href="${base}?view=waitlist" data-nav>Open the waitlist</a></p>` : ''}
      <form id="noteForm"><label class="f"><span>${esc(L('crm.note'))}</span><input class="i" id="noteText" maxlength="1000"></label><p><button class="btn small" type="submit">Add note</button></p></form>
    </div>
    <div id="fam360"></div>
    <div class="grid two"><div class="card"><h3>${esc(L('crm.history'))}</h3><ul class="list" id="leadHistory">${l.events.map((e) => `<li><span class="small muted">${esc(when(e.at))}</span> ${esc(eventLine(e))}</li>`).join('')}</ul></div>
      <div class="card"><h3>${esc(L('crm.messages'))}</h3><ul class="list" id="leadMessages">${l.messages.map((m) => `<li><span class="chip ${m.state === 'sent' ? 'ok' : m.state === 'queued' ? '' : 'warn'}">${esc(m.state)}</span>
        ${esc(m.sequence)} ${m.step} · ${esc(m.channel)} · ${esc(when(m.sent_at || m.due_at))}${m.reason ? ` <span class="small muted">${esc(m.reason)}</span>` : ''}</li>`).join('') || '<li class="muted">None yet</li>'}</ul>
        ${l.tours.length ? `<h3>Tours</h3><ul class="list">${l.tours.map((t) => `<li>${esc(when(t.starts_at))} · ${esc(t.status)}${t.outcome ? ` · ${esc(t.outcome.replace('_', ' '))}` : ''}</li>`).join('')}</ul>` : ''}</div></div>`;
    const card = $('#leadDetail'); card.focus({ preventScroll: false });
    const reload = () => viewLead({ c, director, base, body }, id);
    const act = async (fn) => { try { await fn(); await reload(); live(L('crm.saved')); } catch (e) { msg('leadMsg', friendly(e), 'bad'); } };
    $('#stageSel').onchange = () => { $('#lostWrap').hidden = $('#stageSel').value !== 'lost'; };
    $('#stageForm').onsubmit = (e) => { e.preventDefault(); if (!$('#stageSel').value) return msg('leadMsg', 'Choose a stage first.', 'bad'); act(() => rpc('crm_lead_set_stage', { p_center: c.center_id, p_lead: id, p_stage: $('#stageSel').value, p_lost_reason: $('#lostSel').value || null })); };
    $('#contactForm').onsubmit = (e) => { e.preventDefault(); act(() => rpc('crm_lead_contacted', { p_center: c.center_id, p_lead: id, p_how: $('#howSel').value })); };
    $('#btnReplied').onclick = () => act(() => rpc('crm_lead_automation', { p_center: c.center_id, p_lead: id, p_action: 'replied' }));
    $('#btnPause').onclick = () => act(() => rpc('crm_lead_automation', { p_center: c.center_id, p_lead: id, p_action: l.automation_paused ? 'resume' : 'pause' }));
    $('#noteForm').onsubmit = (e) => { e.preventDefault(); act(() => rpc('crm_lead_note', { p_center: c.center_id, p_lead: id, p_note: $('#noteText').value })); };
    $('#leadEdit').onsubmit = (e) => {
      e.preventDefault();
      const p = { family_name: $('#leName').value, child_first: $('#leChild').value || null, email: $('#leEmail').value || null, phone: $('#lePhone').value || null,
        lang: $('#leLang').value, child_age_band: $('#leBand').value || null, sibling: $('#leSib').checked, staff_child: $('#leStaff').checked, subsidy: $('#leSub').checked };
      if ($('#leSms').checked !== !!l.sms_consent) { p.sms_consent = $('#leSms').checked; p.sms_consent_source = $('#leSmsHow').value; }
      act(() => rpc('crm_lead_save', { p_center: c.center_id, p_lead: id, p }));
    };
    const linkBtn = (sel, purpose) => { const b = $(sel); if (b) b.onclick = () => busy(b, async () => {
      try {
        const r = await rpc('crm_lead_link_issue', { p_center: c.center_id, p_lead: id, p_purpose: purpose });
        const url = `${location.origin}${r.path}`;
        $('#linkOut').innerHTML = `${esc(L('crm.linkCopy'))}: <input class="i" readonly id="linkValue" value="${esc(url)}" aria-label="${esc(L('crm.linkCopy'))}">`;
        $('#linkValue').select();
      } catch (e) { msg('leadMsg', friendly(e), 'bad'); }
    }); };
    linkBtn('#btnTourLink', 'tour'); linkBtn('#btnStatusLink', 'waitlist');
    const wf = $('#wlAddForm');
    if (wf) wf.onsubmit = (e) => { e.preventDefault(); act(() => rpc('crm_waitlist_add', { p_center: c.center_id, p_lead: id, p_room: $('#wlRoom').value || null,
      p_joined_at: $('#wlJoined').value ? new Date(`${$('#wlJoined').value}T12:00:00`).toISOString() : null })); };
    if ($('#btn360')) $('#btn360').onclick = () => show360(c, { lead: id });
  }

  function eventLine(e) {
    const d = e.detail || {};
    switch (e.kind) {
      case 'stage': return `Stage: ${e.from ? L(`stage.${e.from}`) : '—'} → ${L(`stage.${e.to}`)}${d.reason ? ` (${L(`lost.${d.reason}`)})` : ''}${d.note ? `: ${d.note}` : ''}`;
      case 'created': return `Added (${L(`source.${d.source || 'manual'}`)})`;
      case 'captured': return `Website ${d.kind || 'form'}${d.ref ? ` ${d.ref}` : ''}${d.utm_campaign ? ` · campaign ${d.utm_campaign}` : ''}${d.utm_source ? ` · ${d.utm_source}` : ''}`;
      case 'note': return `Note: ${d.text}`;
      case 'contact': return `Contact: ${String(d.how || '').replace('_', ' ')}${d.note ? ` (${d.note})` : ''}`;
      case 'message': return d.planned ? `Planned ${d.planned} message(s): ${d.sequence}` : d.cancelled ? `Cancelled ${d.cancelled} message(s): ${d.why}` : `Message ${d.sequence || ''} ${d.step || ''} ${d.channel || ''}: ${d.state}${d.why ? ` (${d.why})` : ''}`;
      case 'tour': return `Tour ${d.what}${d.starts_at ? ` (${when(d.starts_at)})` : ''}`;
      case 'waitlist': return `Waitlist: ${d.what}${d.override ? ` (override: ${d.override})` : ''}`;
      case 'consent': return d.opt_out ? `Opted out: ${d.opt_out}${d.via ? ` (${d.via})` : ''}` : `Texts ${d.sms ? `allowed (${d.source})` : 'withdrawn'}`;
      case 'flag': return d.automation ? `Automatic messages: ${d.automation}` : `Waitlist facts updated`;
      case 'reopened': return `Came back (was lost: ${d.was ? L(`lost.${d.was}`) : ''})`;
      case 'link': return `Family link made (${d.purpose})`;
      default: return e.kind;
    }
  }

  // Family 360 (directors): one screen, audited in the database
  async function show360(c, { lead = null, kid = null }) {
    const box = $('#fam360');
    try {
      const v = await rpc('crm_family_360', { p_center: c.center_id, p_lead: lead, p_kid: kid });
      const money = v.financial && v.balance ? `${(v.balance.family_cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}${v.balance.past_due ? ` · ${v.balance.past_due} past due` : ''}` : L('crm.money.hidden');
      box.innerHTML = `<div class="card" id="family360" tabindex="-1"><h2>${esc(L('crm.family360'))}</h2>
        <div class="grid two"><div><h3>Family</h3><ul class="list">${v.guardians.map((g) => `<li>${esc(g.name)} · ${esc(g.email)}</li>`).join('') || '<li class="muted">No family account yet</li>'}</ul>
          <h3>Children</h3><ul class="list">${v.children.map((k) => `<li><a href="/c/${esc(c.slug)}/child/${esc(k.kid)}" data-nav>${esc(k.first)} ${esc(k.last_initial)}</a> · ${esc(k.room_name || '')} · ${esc(k.status)}</li>`).join('') || '<li class="muted">Not enrolled yet</li>'}</ul>
          <h3>${esc(L('crm.balance'))}</h3><p id="f360Balance">${esc(money)}</p></div>
        <div><h3>Inquiries and applications</h3><ul class="list">${v.inquiries.map((i) => `<li>${esc(L(`stage.${i.stage}`))} · ${esc(L(`source.${i.source}`))} · ${esc(day(i.created_at))}</li>`).join('')}
          ${v.applications.map((a) => `<li>Enrollment form: ${esc(a.status)} (${esc(a.child_first)})</li>`).join('')}${v.tours.map((t) => `<li>Tour ${esc(when(t.starts_at))}: ${esc(t.status)}${t.outcome ? ` · ${esc(t.outcome)}` : ''}</li>`).join('')}</ul>
          <h3>Consents and documents</h3><ul class="list">${v.consents.map((x) => `<li>${esc(x.purpose)}: ${esc(x.status)}</li>`).join('')}${v.documents.map((d) => `<li>${esc(d.doc_type)}: ${esc(d.file_name)}</li>`).join('') || ''}</ul>
          <h3>Messages</h3><p class="small">${v.messages.automatic.filter((m) => m.state === 'sent').length} automatic sent · ${v.messages.chat.reduce((n, x) => n + Number(x.messages_30d || 0), 0)} chat messages in 30 days</p></div></div>
        <h3>Timeline</h3><ul class="list" id="f360Timeline">${v.timeline.slice(0, 60).map((t) => `<li><span class="small muted">${esc(when(t.at))}</span> ${esc(String(t.what).replace(/_/g, ' '))}${t.to ? `: ${esc(L(`stage.${t.to}`))}` : ''}</li>`).join('')}</ul></div>`;
      $('#family360').focus();
    } catch (e) { box.innerHTML = `<div class="card"><p class="msg bad" role="alert">${esc(friendly(e))}</p></div>`; }
  }

  async function viewFunnel({ c, director, body }) {
    const q = new URLSearchParams(location.search);
    const today = centerToday();   // the center's day
    const from = /^\d{4}-\d{2}-\d{2}$/.test(q.get('from') || '') ? q.get('from') : new Date(Date.parse(`${today}T12:00:00Z`) - 90 * 86400000).toISOString().slice(0, 10);
    const to = /^\d{4}-\d{2}-\d{2}$/.test(q.get('to') || '') ? q.get('to') : today;
    const [f, org] = await Promise.all([rpc('crm_funnel', { p_center: c.center_id, p_from: from, p_to: to }),
      director ? rpc('crm_funnel_org', { p_from: from, p_to: to }).catch(() => null) : null]);
    const max = Math.max(1, f.counts.inquiry);
    const bar = (s) => `<tr><th scope="row">${esc(L(`stage.${s}`))}</th><td class="num">${f.counts[s]}</td>
      <td><progress class="crm-bar" max="100" value="${Math.round(100 * f.counts[s] / max)}" aria-hidden="true"></progress></td><td class="num">${s === 'inquiry' ? '' : pct(f.conversion[s])}</td></tr>`;
    const tis = Object.entries(f.time_in_stage).map(([s, v]) => `<tr><th scope="row">${esc(L(`stage.${s}`))}</th><td class="num">${v.median_days ?? '–'}</td><td class="num">${v.avg_days ?? '–'}</td><td class="num">${v.n}</td></tr>`).join('');
    const lost = Object.entries(f.lost_reasons).map(([r, n]) => `<tr><th scope="row">${esc(L(`lost.${r}`))}</th><td class="num">${n}</td></tr>`).join('');
    const attr = f.attribution.map((a) => `<tr><td>${esc(a.dimension === 'source' ? 'Source' : a.dimension)}</td><td>${esc(a.dimension === 'source' ? L(`source.${a.value}`) : a.value)}</td>
      <td class="num">${a.leads}</td><td class="num">${a.toured}</td><td class="num">${a.enrolled}</td><td class="num">${pct(a.conversion)}</td></tr>`).join('');
    body.innerHTML = `<div class="card"><form class="row two" id="funnelRange"><label class="f"><span>${esc(L('crm.funnel.range'))}</span><input class="i" type="date" id="fFrom" value="${esc(from)}"></label>
        <label class="f"><span>and</span><input class="i" type="date" id="fTo" value="${esc(to)}"></label><button class="btn small" type="submit">Show</button></form>
      <div class="tablewrap"><table class="t" id="funnelTable"><thead><tr><th>Stage</th><th class="num">Families</th><th><span class="sr-only">Share of all inquiries</span></th><th class="num">${esc(L('crm.funnel.conv'))}</th></tr></thead>
        <tbody>${FUNNEL.map(bar).join('')}</tbody></table></div>
      <p class="small">Overall: <b id="funnelOverall">${pct(f.conversion.overall)}</b> enrolled · Lost: ${f.counts.lost} (${pct(f.conversion.lost)}) · Waitlisted: ${f.counts.waitlisted} · Offered a seat: ${f.counts.offered} · Still open: ${f.counts.open}</p></div>
      <div class="grid two"><div class="card"><h3>${esc(L('crm.funnel.time'))}</h3><table class="t"><thead><tr><th>Stage</th><th class="num">Median days</th><th class="num">Average</th><th class="num">Families</th></tr></thead><tbody>${tis || '<tr><td colspan="4" class="muted">Not enough history yet</td></tr>'}</tbody></table>
        <h3>${esc(L('crm.funnel.speed'))}</h3><p class="small" id="speed">Median ${f.speed_to_lead.median_hours ?? '–'} h to the first contact · ${f.speed_to_lead.within_sla} of ${f.speed_to_lead.contacted} within ${f.speed_to_lead.sla_hours} h</p></div>
        <div class="card"><h3>${esc(L('crm.funnel.lost'))}</h3><table class="t"><tbody>${lost || '<tr><td class="muted">None</td></tr>'}</tbody></table></div></div>
      <div class="card"><h3>${esc(L('crm.funnel.sources'))}</h3><div class="tablewrap"><table class="t" id="attrTable"><thead><tr><th>By</th><th>Value</th><th class="num">Families</th><th class="num">Toured</th><th class="num">Enrolled</th><th class="num">Conversion</th></tr></thead><tbody>${attr}</tbody></table></div></div>
      ${org && org.centers.length > 1 ? `<div class="card" id="orgRollup"><h3>${esc(L('crm.funnel.org'))}</h3><table class="t"><thead><tr><th>Center</th>${FUNNEL.map((s) => `<th class="num">${esc(L(`stage.${s}`))}</th>`).join('')}<th class="num">Overall</th></tr></thead>
        <tbody>${org.centers.map((x) => `<tr><td>${esc(x.name)}</td>${FUNNEL.map((s) => `<td class="num">${x.counts[s] ?? 0}</td>`).join('')}<td class="num">${pct(x.conversion.overall)}</td></tr>`).join('')}
        <tr><th>Total</th>${FUNNEL.map((s) => `<th class="num">${org.totals[s] ?? 0}</th>`).join('')}<th class="num">${pct(org.conversion.overall)}</th></tr></tbody></table></div>` : ''}`;
    $('#funnelRange').onsubmit = (e) => { e.preventDefault(); go(`/c/${c.slug}/crm?view=funnel&from=${$('#fFrom').value}&to=${$('#fTo').value}`); };
  }

  async function viewWaitlist({ c, base, body }) {
    const w = await rpc('crm_waitlist_list', { p_center: c.center_id });
    const rules = Object.entries(w.weights).filter(([, v]) => Number(v) > 0);
    const rooms = [...w.rooms, { id: null, name: 'No room chosen yet', free_seats: null }];
    body.innerHTML = `<div class="card"><p>${rules.length ? `Order: priority points (${rules.map(([k, v]) => `${esc(L(`rule.${k}`))} ${v}`).join(', ')}), then the date the family joined.`
      : 'Order: the date the family joined the list (no priority rules in use; a director sets them in Settings).'} Offers are held ${w.hold_days} days.</p>
      <p class="small" id="wlMsg" aria-live="polite"></p></div>
      ${rooms.map((r) => { const es = w.entries.filter((e) => (e.wanted_room ?? null) === r.id); if (!es.length && r.id === null) return '';
        return `<div class="card" data-room="${esc(r.id ?? '')}"><h3>${esc(r.name)} <span class="chip">${r.id === null ? '' : r.free_seats == null ? esc(L('crm.capUnknown')) : esc(L('crm.freeSeats', { n: r.free_seats }))}</span></h3>
          <div class="tablewrap"><table class="t"><thead><tr><th>#</th><th>Family</th><th>Points</th><th>Joined</th><th>Status</th><th></th></tr></thead><tbody>
          ${es.map((e) => `<tr data-entry="${esc(e.id)}"><td>${e.place ?? ''}</td><td><a href="${base}?lead=${esc(e.lead_id)}" data-nav>${esc(e.family_name)}</a>${e.child_first ? ` <span class="small muted">${esc(e.child_first)}</span>` : ''}</td>
            <td>${e.points ?? 0}${(e.rules || []).map((x) => ` <span class="chip small">${esc(L(`rule.${x.rule}`))}${x.found ? ' (found)' : ''}</span>`).join('')}</td><td>${esc(day(e.joined_at))}</td>
            <td>${esc(e.status)}${e.offer_expires_at && e.status === 'offered' ? ` until ${esc(when(e.offer_expires_at))}` : ''}${e.offer_override ? ` <span class="small muted">(override: ${esc(e.offer_override)})</span>` : ''}</td>
            <td>${e.status === 'waiting' && r.id !== null ? `<button class="btn small" type="button" data-offer>${esc(L('crm.offer'))}</button>` : ''}
              ${e.status === 'offered' ? '<button class="btn soft small" type="button" data-answer="accept">Family said yes</button> <button class="btn soft small" type="button" data-answer="decline">Family said no</button>' : ''}
              <button class="btn link small" type="button" data-withdraw>${esc(L('crm.withdraw'))}</button></td></tr>`).join('') || '<tr><td colspan="6" class="muted">Nobody is waiting</td></tr>'}</tbody></table></div></div>`; }).join('')}`;
    const reload = () => viewWaitlist({ c, base, body });
    const run = (b, fn) => busy(b, async () => { try { await fn(); await reload(); live(L('crm.saved')); } catch (e) { msg('wlMsg', friendly(e), 'bad'); } });
    $$('[data-offer]').forEach((b) => { b.onclick = () => run(b, async () => {
      const entry = b.closest('tr').dataset.entry;
      try { await rpc('crm_waitlist_offer', { p_center: c.center_id, p_entry: entry }); }
      catch (e) {
        if (!/out of order|free seat|capacity/.test(e.message || '')) throw e;
        const why = window.prompt(`${e.message}\n\n${L('crm.override')}`);
        if (!why) throw e;
        await rpc('crm_waitlist_offer', { p_center: c.center_id, p_entry: entry, p_override: why });
      }
    }); });
    $$('[data-answer]').forEach((b) => { b.onclick = () => run(b, () => rpc('crm_waitlist_record_answer', { p_center: c.center_id, p_entry: b.closest('tr').dataset.entry, p_answer: b.dataset.answer })); });
    $$('[data-withdraw]').forEach((b) => { b.onclick = () => run(b, () => rpc('crm_waitlist_withdraw', { p_center: c.center_id, p_entry: b.closest('tr').dataset.entry })); });
  }

  async function viewMessages({ c, director, body }) {
    const [out, own] = await Promise.all([rpc('crm_outbox', { p_center: c.center_id, p_limit: 100 }), rpc('crm_templates_get', { p_center: c.center_id })]);
    const ownOf = (k, lang) => own.find((x) => x.key === k && x.lang === lang);
    body.innerHTML = `<div class="card"><h3>How the automatic messages work</h3><ul class="list">${Object.entries(SEQUENCES).map(([k, v]) => `<li><b>${esc(k.replace('_', ' '))}</b>: ${esc(v.en)}</li>`).join('')}</ul>
      <p class="small muted">They stop when the family replies, books or moves on, unsubscribes, or you pause them. Nothing goes out in quiet hours. Texts need the family's recorded consent and stay off until the SMS account is set up.</p></div>
      ${director ? `<div class="card" id="tplEditor"><h3>Wording</h3><form id="tplForm"><div class="row two"><label class="f"><span>Message</span><select class="i" id="tplKey">${TEMPLATE_KEYS.map((k) => opt(k, `${k}${ownOf(k, 'en') || ownOf(k, 'es') ? ' (edited)' : ''}`, 'inquiry_1')).join('')}</select></label>
        <label class="f"><span>Language</span><select class="i" id="tplLang">${opt('en', 'English', 'en')}${opt('es', 'Español (draft)', 'en')}</select></label></div>
        <label class="f"><span>Subject</span><input class="i" id="tplSubject" maxlength="140"></label><label class="f"><span>Email text</span><textarea class="i" id="tplBody" rows="8" maxlength="4000"></textarea></label>
        <label class="f"><span>Text message (short)</span><textarea class="i" id="tplSms" rows="2" maxlength="300"></textarea></label>
        <p class="small muted">Placeholders: {family_name} {child_first} {center_name} {tour_time} {tour_link} {manage_link} {status_link} {place} {queue_size} {room_name} {offer_expires} {campaign} {due_by} {reenroll_link} {contact}.
          The unsubscribe link, your postal address and "Reply STOP" are always added.</p>
        <p><button class="btn small" type="submit">Save wording</button> <button class="btn soft small" type="button" id="tplReset">Use the built-in wording</button></p><p class="small" id="tplMsg" aria-live="polite"></p></form></div>` : ''}
      <div class="card"><h3>Outbox</h3><div class="tablewrap"><table class="t" id="outbox"><thead><tr><th>When</th><th>Family</th><th>Message</th><th>Channel</th><th>State</th></tr></thead><tbody>
      ${out.map((m) => `<tr><td>${esc(when(m.sent_at || m.due_at))}</td><td>${esc(m.family_name || 'Re-enrollment')}</td><td>${esc(m.template)}</td><td>${esc(m.channel)}</td>
        <td><span class="chip ${m.state === 'sent' ? 'ok' : ['failed', 'held'].includes(m.state) ? 'bad' : ''}">${esc(m.state)}</span>${m.reason ? ` <span class="small muted">${esc(m.reason)}</span>` : ''}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">Nothing yet</td></tr>'}</tbody></table></div></div>`;
    if (!director) return;
    const fill = () => {
      const k = $('#tplKey').value, lang = $('#tplLang').value, o = ownOf(k, lang), d = DEFAULT_TEMPLATES[k][lang];
      $('#tplSubject').value = o?.subject ?? d.subject; $('#tplBody').value = o?.body ?? d.body; $('#tplSms').value = o?.sms ?? d.sms ?? '';
      $('#tplSms').disabled = d.sms === null;
      $('#tplMsg').textContent = `${o ? 'Your wording.' : 'The built-in wording.'} ${SEQUENCES[TEMPLATE_SEQUENCE[k]].en}`;
    };
    $('#tplKey').onchange = fill; $('#tplLang').onchange = fill; fill();
    $('#tplForm').onsubmit = async (e) => {
      e.preventDefault();
      const bad = unknownPlaceholders($('#tplSubject').value, $('#tplBody').value, $('#tplSms').value);
      if (bad.length) return msg('tplMsg', `Unknown placeholder(s): ${bad.join(', ')}`, 'bad');
      try { await rpc('crm_template_save', { p_center: c.center_id, p_key: $('#tplKey').value, p_lang: $('#tplLang').value, p_subject: $('#tplSubject').value, p_body: $('#tplBody').value, p_sms: $('#tplSms').disabled ? null : $('#tplSms').value || null });
        own.splice(0, own.length, ...(await rpc('crm_templates_get', { p_center: c.center_id }))); msg('tplMsg', L('crm.saved')); }
      catch (err) { msg('tplMsg', friendly(err), 'bad'); }
    };
    $('#tplReset').onclick = async () => {
      try { await rpc('crm_template_save', { p_center: c.center_id, p_key: $('#tplKey').value, p_lang: $('#tplLang').value, p_subject: null, p_body: null });
        own.splice(0, own.length, ...(await rpc('crm_templates_get', { p_center: c.center_id }))); fill(); msg('tplMsg', L('crm.saved')); }
      catch (err) { msg('tplMsg', friendly(err), 'bad'); }
    };
  }

  async function viewReenroll({ c, body }) {
    const list = await rpc('crm_campaigns_list', { p_center: c.center_id });
    const q = new URLSearchParams(location.search);
    const focus = UUID.test(q.get('target') || '') ? q.get('target') : null;
    body.innerHTML = `<div class="card"><h3>${esc(L('crm.reenroll.new'))}</h3><form class="row two" id="campForm"><label class="f"><span>School year</span><input class="i" id="campLabel" maxlength="80" placeholder="2027-2028 school year"></label>
      <label class="f"><span>Answer by</span><input class="i" type="date" id="campDue"></label><button class="btn small" type="submit">Create (draft)</button></form><p class="small" id="campMsg" aria-live="polite"></p></div>
      ${list.map((cp) => `<div class="card" data-campaign="${esc(cp.id)}"><h3>${esc(cp.label)} <span class="chip">${esc(cp.status)}</span></h3><p class="small">Answer by ${esc(day(`${cp.due_by}T12:00:00`))} ·
        ${['returning', 'not_returning', 'unsure', 'pending'].map((r) => `${esc(L(`reenroll.${r}`))}: ${cp.counts?.[r] ?? 0}`).join(' · ')}</p>
        ${cp.status === 'draft' ? `<button class="btn small" type="button" data-open>${esc(L('crm.reenroll.open'))}</button>` : ''}${cp.status !== 'closed' ? ` <button class="btn soft small" type="button" data-close>${esc(L('crm.reenroll.close'))}</button>` : ''}
        <div class="tablewrap"><table class="t"><thead><tr><th>Family</th><th>Children</th><th>Answer</th><th></th></tr></thead><tbody>${cp.families.map((f) => `<tr data-target="${esc(f.target)}"${f.target === focus ? ' class="deep-hl" tabindex="-1" id="deepTarget"' : ''}><td>${esc(f.name)}</td><td>${esc(f.children.join(', '))}</td>
          <td>${esc(L(`reenroll.${f.response}`))}${f.note ? ` <span class="small muted">${esc(f.note)}</span>` : ''}</td><td>${cp.status === 'active' ? ['returning', 'not_returning', 'unsure'].map((r) => `<button class="btn link small" type="button" data-record="${r}">${esc(L(`reenroll.${r}`))}</button>`).join(' ') : ''}</td></tr>`).join('')}</tbody></table></div></div>`).join('')}`;
    $('#deepTarget')?.focus();
    const reload = () => viewReenroll({ c, body });
    const run = async (fn) => { try { await fn(); await reload(); live(L('crm.saved')); } catch (e) { msg('campMsg', friendly(e), 'bad'); } };
    $('#campForm').onsubmit = (e) => { e.preventDefault(); run(() => rpc('crm_campaign_save', { p_center: c.center_id, p_label: $('#campLabel').value, p_due_by: $('#campDue').value || null })); };
    $$('[data-open]').forEach((b) => { b.onclick = () => run(() => rpc('crm_campaign_open', { p_center: c.center_id, p_campaign: b.closest('[data-campaign]').dataset.campaign })); });
    $$('[data-close]').forEach((b) => { b.onclick = () => run(() => rpc('crm_campaign_close', { p_center: c.center_id, p_campaign: b.closest('[data-campaign]').dataset.campaign })); });
    $$('[data-record]').forEach((b) => { b.onclick = () => run(() => rpc('crm_campaign_record_answer', { p_center: c.center_id, p_target: b.closest('tr').dataset.target, p_response: b.dataset.record })); });
  }

  async function viewReferrals({ c, base, body }) {
    const refs = await rpc('crm_referrals', { p_center: c.center_id });
    body.innerHTML = `<div class="card"><h3>${esc(L('crm.ref.new'))}</h3><p class="small muted">${esc(L('crm.ref.note'))}</p><form class="row two" id="refForm">
      <label class="f"><span>For</span><select class="i" id="refKind">${['family', 'staff', 'partner', 'other'].map((k) => opt(k, k, 'family')).join('')}</select></label>
      <label class="f"><span>Name</span><input class="i" id="refLabel" maxlength="120"></label><label class="f"><span>Code (empty: one is made)</span><input class="i" id="refCode" maxlength="24"></label>
      <button class="btn small" type="submit">Save code</button></form><p class="small" id="refMsg" aria-live="polite"></p></div>
      <div class="card"><div class="tablewrap"><table class="t" id="refTable"><thead><tr><th>Code</th><th>For</th><th class="num">Families</th><th class="num">Toured</th><th class="num">Enrolled</th><th>Who</th></tr></thead><tbody>
      ${refs.map((r) => `<tr><td><b>${esc(r.code)}</b>${r.active ? '' : ' <span class="chip">off</span>'}</td><td>${esc(r.owner_label)} <span class="small muted">${esc(r.owner_kind)}</span></td>
        <td class="num">${r.leads}</td><td class="num">${r.toured}</td><td class="num">${r.enrolled}</td><td>${r.families.map((f) => `<a href="${base}?lead=${esc(f.lead_id)}" data-nav>${esc(f.family_name)}</a> (${esc(L(`stage.${f.stage}`))})`).join(', ')}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">No codes yet</td></tr>'}</tbody></table></div></div>`;
    $('#refForm').onsubmit = async (e) => {
      e.preventDefault();
      try { await rpc('crm_referral_code_save', { p_center: c.center_id, p_code: $('#refCode').value, p_owner_kind: $('#refKind').value, p_owner_label: $('#refLabel').value }); await viewReferrals({ c, base, body }); live(L('crm.saved')); }
      catch (err) { msg('refMsg', friendly(err), 'bad'); }
    };
  }

  async function viewSettings({ c, s, body }) {
    const w = s.waitlist_weights || {}, bands = s.room_bands || {};
    body.innerHTML = `<form class="card" id="crmSettings" novalidate><h3>${esc(L('crm.tab.settings'))}</h3>
      <label class="choice"><input type="checkbox" id="setSeq"${s.sequences_on ? ' checked' : ''}> <span><b>Send automatic follow-up messages</b> (email now; texts once the SMS account is set up)</span></label>
      <div class="row two"><label class="f"><span>${esc(L('crm.settings.quiet'))}: from</span><input class="i" type="time" id="setQs" value="${esc(String(s.quiet_start).slice(0, 5))}"></label>
        <label class="f"><span>until</span><input class="i" type="time" id="setQe" value="${esc(String(s.quiet_end).slice(0, 5))}"></label></div>
      <div class="row two"><label class="f"><span>${esc(L('crm.settings.sla'))}</span><input class="i" type="number" min="1" max="168" id="setSla" value="${s.sla_hours}"></label>
        <label class="f"><span>${esc(L('crm.settings.hold'))}</span><input class="i" type="number" min="1" max="30" id="setHold" value="${s.offer_hold_days}"></label></div>
      <label class="f"><span>${esc(L('crm.settings.reminders'))}</span><select class="i" id="setRem">${opt('auto', s.crm_linked ? 'Automatic: the CRM sends them for this center' : 'Automatic: the Hub sends them', s.tour_reminders)}${opt('on', 'The Hub sends them', s.tour_reminders)}${opt('off', 'Off', s.tour_reminders)}</select></label>
      <fieldset><legend>${esc(L('crm.settings.weights'))}</legend><div class="row two">${WAITLIST_RULES.map((r) => `<label class="f"><span>${esc(L(`rule.${r}`))}</span><input class="i" type="number" min="0" max="100" data-weight="${r}" value="${Number(w[r] || 0)}"></label>`).join('')}</div>
        <p class="small muted">Every change is recorded. Families see on their status page which rules apply to them.</p></fieldset>
      <fieldset><legend>Age band of each room (for "Age fits the room")</legend><div class="row two">${s.rooms.map((r) => `<label class="f"><span>${esc(r.name)}</span><select class="i" data-band="${esc(r.id)}">${opt('', '—', bands[r.id] || '')}${['twos', 'threes', 'prek'].map((b) => opt(b, L(`band.${b}`), bands[r.id])).join('')}</select></label>`).join('')}</div></fieldset>
      <label class="f"><span>${esc(L('crm.settings.postal'))}</span><input class="i" id="setPostal" maxlength="300" value="${esc(s.postal_address || '')}"></label>
      <div class="row two"><label class="f"><span>${esc(L('crm.settings.contact'))}: phone</span><input class="i" type="tel" id="setPhone" value="${esc(s.contact_phone || '')}"></label>
        <label class="f"><span>email (replies go here)</span><input class="i" type="email" id="setEmail" value="${esc(s.contact_email || '')}"></label></div>
      <label class="f"><span>${esc(L('crm.settings.tourUrl'))}</span><input class="i" type="url" id="setTourUrl" value="${esc(s.tour_url || '')}" placeholder="https://"></label>
      <p><button class="btn" type="submit">Save settings</button></p><p class="small" id="setMsg" aria-live="polite"></p></form>`;
    $('#crmSettings').onsubmit = async (e) => {
      e.preventDefault();
      const weights = Object.fromEntries($$('[data-weight]').map((i) => [i.dataset.weight, Number(i.value || 0)]));
      const room_bands = Object.fromEntries($$('[data-band]').filter((x) => x.value).map((x) => [x.dataset.band, x.value]));
      const p = { sequences_on: $('#setSeq').checked, quiet_start: $('#setQs').value, quiet_end: $('#setQe').value, sla_hours: Number($('#setSla').value),
        offer_hold_days: Number($('#setHold').value), tour_reminders: $('#setRem').value, waitlist_weights: weights, room_bands,
        postal_address: $('#setPostal').value, contact_phone: $('#setPhone').value, contact_email: $('#setEmail').value, tour_url: $('#setTourUrl').value };
      try { await rpc('crm_settings_save', { p_center: c.center_id, p }); msg('setMsg', L('crm.saved')); }
      catch (err) { msg('setMsg', friendly(err), 'bad'); }
    };
  }

  // A small card for the director's (and front desk's) home: the desk's numbers and a link in.
  async function deskCard(c) {
    try {
      const s = await rpc('crm_desk_summary', { p_center: c.center_id });
      const base = `/c/${esc(c.slug)}/crm`;
      return `<div class="card" id="crmCard"><h2>${esc(L('crm.title'))}</h2><p class="chips">
        <a class="chip" href="${base}?stage=open" data-nav>${s.open} open</a> <span class="chip ${s.first_contact_overdue ? 'bad' : ''}">${s.first_contact_overdue} waiting for a first contact</span>
        <span class="chip ${s.tours_to_mark ? 'warn' : ''}">${s.tours_to_mark} tour(s) to mark</span> <span class="chip">${s.offers_open} offer(s) open</span>
        <span class="chip ok">${s.accepted_to_enroll} accepted: send the forms</span></p>
        <p><a class="btn small" href="${base}" data-nav>Open the enrollment pipeline</a> <a class="btn soft small" href="${base}?view=funnel" data-nav>Funnel</a></p>
        ${s.sequences_on ? '' : `<p class="small muted">${esc(L('crm.seqOff'))}</p>`}</div>`;
    } catch { return ''; }
  }

  // ---------------------------------------------------------------------------------------------------------------- family links
  async function viewPublic(slug, tab, { lang = 'en', chosen = false, useLang = () => {} } = {}) {
    const token = new URLSearchParams(location.search).get('t') || '';
    const T = (k, v, l) => tr(k, v, l);
    const frame = (inner, l) => `<div class="wrap narrow"><div class="card" id="crmPublic" lang="${l}">${inner}</div></div>`;
    let o;
    try { o = await client().rpc('crm_public_open', { p_token: token }); if (o.error) throw o.error; o = o.data; }
    catch { return page(frame(`<p class="msg bad" role="alert" id="pubBad">${esc(T('crmpub.bad', {}, lang))}</p>`, lang), '', {}); }
    const want = { 'waitlist-status': 'waitlist', tour: 'tour', unsubscribe: 'unsub', reenroll: 'reenroll' }[tab];
    const l = chosen ? lang : (o.lang === 'es' ? 'es' : lang);
    useLang(l);                      // the header's language switch and the page's lang follow what is shown
    if (o.slug !== slug || o.purpose !== want) return page(frame(`<p class="msg bad" role="alert" id="pubBad">${esc(T('crmpub.bad', {}, l))}</p>`, l), '', {});
    const fmt = (iso, withTime = true) => formatWhen(iso, l, o.time_zone || 'America/Chicago', withTime);
    const closed = o.open ? '' : `<p class="msg warn" role="alert">${esc(T('crmpub.closed', {}, l))}</p>`;
    const act = async (action, arg, done) => {
      const m = $('#pubMsg'); m.className = 'small msg'; m.textContent = T('crmpub.working', {}, l);
      $$('#crmPublic button').forEach((b) => { b.disabled = true; });
      const r = await client().rpc('crm_public_act', { p_token: token, p_action: action, p_arg: arg || {} });
      if (r.error) {
        $$('#crmPublic button').forEach((b) => { b.disabled = false; });
        const k = /center_closed/.test(r.error.message) ? 'crmpub.closed' : /too_late/.test(r.error.message) ? 'crmpub.tourLate' : /campaign_closed/.test(r.error.message) ? 'crmpub.reClosed'
          : /offer_closed/.test(r.error.message) ? 'crmpub.status.expired' : /slot_/.test(r.error.message) ? 'crmpub.tourNone' : 'crmpub.bad';
        m.className = 'small msg bad'; m.setAttribute('role', 'alert'); m.textContent = T(k, {}, l); live(m.textContent); return;
      }
      $('#pubBody').innerHTML = `<p class="msg ok" role="status" id="pubDone">${esc(done(r.data))}</p>`; live($('#pubDone').textContent);
    };
    const head = (title) => `<h1>${esc(title)}</h1><p class="muted">${esc(o.center_name)}</p>${closed}`;
    if (o.purpose === 'waitlist') {
      const w = o.waitlist, child = o.child_first || (l === 'es' ? 'Su hijo o hija' : 'Your child');
      const rulesLine = w.rules_in_effect.length ? `<p>${esc(T('crmpub.waitHow', {}, l))}</p><p>${esc(T('crmpub.waitRules', {}, l))} ${w.rules_in_effect.map((r) => esc(ui(`rule.${r}`, {}, l))).join(', ')}.</p>
        <p>${w.points ? esc(T('crmpub.waitYours', { points: w.points }, l)) + ` (${w.rules.map((r) => esc(ui(`rule.${r.rule}`, {}, l))).join(', ')})` : esc(T('crmpub.waitNoPoints', {}, l))}</p>`
        : `<p>${esc(T('crmpub.waitDateOnly', {}, l))}</p>`;
      let inner;
      if (w.status === 'offered') {
        inner = `${head(T('crmpub.offerTitle', {}, l))}<p id="pubOffer">${esc(T('crmpub.offerBody', { room: w.room_name || '', child, date: fmt(w.offer_expires_at) }, l))}</p>
          <div id="pubBody"><p class="actions"><button class="btn" type="button" id="pubAccept">${esc(T('crmpub.accept', {}, l))}</button> <button class="btn soft" type="button" id="pubDecline">${esc(T('crmpub.decline', {}, l))}</button></p></div>`;
      } else if (w.status === 'waiting') {
        inner = `${head(T('crmpub.waitTitle', {}, l))}<p id="pubPlace"><b>${esc(T('crmpub.waitPlace', { child, place: w.place, size: w.queue_size, room: w.room_name || '—' }, l))}</b></p>
          <p>${esc(T('crmpub.waitJoined', { date: fmt(w.joined_at, false) }, l))}</p>${rulesLine}
          <div id="pubBody"><p><button class="btn link" type="button" id="pubLeave">${esc(T('crmpub.leave', {}, l))}</button></p></div>`;
      } else {
        inner = `${head(T('crmpub.waitTitle', {}, l))}<p id="pubPlace">${esc(T(w.status === 'expired' ? 'crmpub.status.expired' : w.status === 'accepted' ? 'crmpub.accepted' : 'crmpub.status.closed', {}, l))}</p>`;
      }
      page(frame(`${inner}<p class="small" id="pubMsg" aria-live="polite"></p>`, l), T('crmpub.waitTitle', {}, l), {});
      if ($('#pubAccept')) $('#pubAccept').onclick = () => act('accept', {}, () => T('crmpub.accepted', {}, l));
      if ($('#pubDecline')) $('#pubDecline').onclick = () => act('decline', {}, () => T('crmpub.declined', {}, l));
      if ($('#pubLeave')) $('#pubLeave').onclick = () => { if (window.confirm(T('crmpub.leaveConfirm', {}, l))) act('leave', {}, () => T('crmpub.left', {}, l)); };
      return;
    }
    if (o.purpose === 'tour') {
      const tt = o.tour;
      const state = tt.status === 'cancelled' ? T('crmpub.tourCancelled', {}, l) : tt.outcome === 'no_show' ? T('crmpub.tourMissed', {}, l)
        : T('crmpub.tourWhen', { date: fmt(tt.starts_at), minutes: tt.minutes }, l);
      const slots = (o.slots || []).map((x) => `<label class="choice"><input type="radio" name="slot" value="${esc(x.id)}"> <span>${esc(fmt(x.starts_at))}</span></label>`).join('');
      const inner = `${head(T('crmpub.tourTitle', {}, l))}<p id="pubTour">${esc(state)}</p><div id="pubBody">${tt.can_change ? `
        <fieldset><legend>${esc(T('crmpub.tourPick', {}, l))}</legend>${slots || `<p class="muted">${esc(T('crmpub.tourNone', {}, l))}</p>`}</fieldset>
        ${slots ? `<p><button class="btn" type="button" id="pubMove">${esc(T('crmpub.tourMove', {}, l))}</button></p>` : ''}
        ${tt.outcome ? '' : `<p><button class="btn soft" type="button" id="pubCancel">${esc(T('crmpub.tourCancel', {}, l))}</button></p>`}` : tt.status === 'booked' ? `<p>${esc(T('crmpub.tourLate', {}, l))}</p>` : ''}</div>`;
      page(frame(`${inner}<p class="small" id="pubMsg" aria-live="polite"></p>`, l), T('crmpub.tourTitle', {}, l), {});
      if ($('#pubMove')) $('#pubMove').onclick = () => { const s = $('input[name="slot"]:checked'); if (!s) { $('#pubMsg').textContent = T('crmpub.tourPick', {}, l); return; } act('reschedule', { slot: s.value }, (d) => T('crmpub.tourMoved', { date: fmt(d.starts_at) }, l)); };
      if ($('#pubCancel')) $('#pubCancel').onclick = () => { if (window.confirm(T('crmpub.tourCancelConfirm', {}, l))) act('cancel', {}, () => T('crmpub.tourDone', {}, l)); };
      return;
    }
    if (o.purpose === 'unsub') {
      const inner = `${head(T('crmpub.unsubTitle', {}, l))}<div id="pubBody">${o.email_off && (o.sms_off || !o.has_sms) ? `<p>${esc(T('crmpub.unsubAlready', { center: o.center_name }, l))}</p>` : `
        ${o.has_email && !o.email_off ? `<p><button class="btn" type="button" id="pubUnsubEmail">${esc(T('crmpub.unsubEmail', { center: o.center_name }, l))}</button></p>` : ''}
        ${o.has_sms && !o.sms_off ? `<p><button class="btn soft" type="button" id="pubUnsubSms">${esc(T('crmpub.unsubSms', { center: o.center_name }, l))}</button></p>` : ''}
        <p><button class="btn link" type="button" id="pubUnsubAll">${esc(T('crmpub.unsubAll', {}, l))}</button></p>`}</div>`;
      page(frame(`${inner}<p class="small" id="pubMsg" aria-live="polite"></p>`, l), T('crmpub.unsubTitle', {}, l), {});
      for (const [id, a] of [['#pubUnsubEmail', 'email'], ['#pubUnsubSms', 'sms'], ['#pubUnsubAll', 'all']]) if ($(id)) $(id).onclick = () => act(a, {}, () => T('crmpub.unsubDone', {}, l));
      return;
    }
    const cp = o.campaign;
    const answer = { returning: 'crmpub.reReturning', not_returning: 'crmpub.reNot', unsure: 'crmpub.reUnsure' };
    const inner = `${head(T('crmpub.reTitle', {}, l))}<p id="pubAsk">${esc(T('crmpub.reAsk', { children: cp.children.join(l === 'es' ? ' y ' : ' and '), campaign: cp.label, date: fmt(`${cp.due_by}T12:00:00Z`, false) }, l))}</p>
      ${cp.response !== 'pending' ? `<p>${esc(T('crmpub.reCurrent', { answer: T(answer[cp.response], {}, l) }, l))}</p>` : ''}
      <div id="pubBody">${cp.status === 'active' ? `<label class="f"><span>${esc(T('crmpub.reNote', {}, l))}</span><input class="i" id="pubNote" maxlength="500"></label>
        <p class="actions">${Object.entries(answer).map(([k, v]) => `<button class="btn${k === 'returning' ? '' : ' soft'}" type="button" data-re="${k}">${esc(T(v, {}, l))}</button>`).join(' ')}</p>` : `<p>${esc(T('crmpub.reClosed', {}, l))}</p>`}</div>`;
    page(frame(`${inner}<p class="small" id="pubMsg" aria-live="polite"></p>`, l), T('crmpub.reTitle', {}, l), {});
    $$('[data-re]').forEach((b) => { b.onclick = () => act(b.dataset.re, { note: $('#pubNote')?.value || '' }, () => T('crmpub.reThanks', {}, l)); });
  }

  return { viewDesk, viewPublic, deskCard, show360 };
}
