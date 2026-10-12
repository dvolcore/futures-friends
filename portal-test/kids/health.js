// Health records (hub/HEALTH_RECORDS.md; migrations 20261030100000_health_records.sql, 20261030110000_health_records_integrations.sql).
//   /c/<slug>/health                 director: the compliance dashboard (counts, what each child still needs, settings);
//                                    a family: their children (what is due, permissions to sign, consent); staff: the emergency plans
//   /c/<slug>/health?kid=<id>        the child's health record (director, the child's room staff, the family): immunizations,
//                                    exemptions, assessments and screenings, health plans, medication (sign / receive / end), illness log
//                                    &item= &med= &plan= &illness= &dose= focus one entry (deep links from the notifications)
//   /c/<slug>/health?view=mar        the medication administration record on the classroom tablet (trained staff; the director reads)
// Every string is in health-core.js (English + Spanish DRAFT). No inline styles or handlers (strict CSP). 44 px targets (health.css).
import { L, VACCINES, SYMPTOM_KEYS, medArgs, itemText, SLOT_TONE } from './health-core.js';
import { dayText } from './absence.js';
import { deepFocus, deepMiss } from './deeplink.js';

export function healthLinkHtml(esc, slug, kid, lang = 'en') {
  return `<p class="cta-row" id="healthLink"><a class="btn soft" href="/c/${esc(slug)}/health?kid=${encodeURIComponent(kid)}" data-nav>${esc(L(lang).healthLink)}</a></p>`;
}

export function mountHealth({ esc, $, $$, rpc, client, page, live, friendly, getLang }) {
  const lang = () => (getLang() === 'es' ? 'es' : 'en');
  const T = () => L(lang());
  const day = (d) => dayText(d, lang());
  const clock = (c, at) => (at ? new Date(at).toLocaleTimeString(lang() === 'es' ? 'es-US' : 'en-US', { hour: 'numeric', minute: '2-digit', timeZone: c.time_zone || undefined }) : '');
  const opt = (v, l, cur) => `<option value="${esc(v)}"${String(cur ?? '') === String(v) ? ' selected' : ''}>${esc(l)}</option>`;
  const opts = (map, cur, blank = null) => (blank !== null ? opt('', blank, cur) : '') + Object.entries(map).map(([v, l]) => opt(v, l, cur)).join('');
  const chip = (text, tone = '') => `<span class="chip${tone ? ` ${tone}` : ''}">${esc(text)}</span>`;
  const msg = (el, text, ok = false) => { if (!el) return; el.className = `msg ${ok ? 'ok' : 'bad'}`; el.textContent = text; };
  const val = (f, name) => f.querySelector(`[name="${name}"]`)?.value ?? '';
  const checked = (f, name) => !!f.querySelector(`[name="${name}"]`)?.checked;
  const focusFromQuery = (q) => {
    for (const [k, sel] of [['item', 'data-item'], ['med', 'data-med'], ['plan', 'data-plan'], ['illness', 'data-ill'], ['dose', 'data-dose']]) {
      const v = q.get(k); if (!v) continue;
      const el = document.querySelector(`[${sel}="${CSS.escape(v)}"]`);
      if (el) { const d = el.closest('details'); if (d) d.open = true; deepFocus(el); } else deepMiss('any', lang());
      return;
    }
  };
  const fail = (c, shell, title, e) => page(shell(`<section class="card" id="healthView"><h2>${esc(title)}</h2><p class="msg bad" role="alert">${esc(friendly(e))}</p></section>`), title);

  // ---------------------------------------------------------------------------------------------------------------------------
  async function viewHealth(c, shell, { director = false, family = false } = {}) {
    const q = new URLSearchParams(location.search);
    if (q.get('view') === 'mar') return viewMar(c, shell, q);
    if (q.get('kid')) return viewChild(c, shell, q.get('kid'), q);
    if (director) return viewDashboard(c, shell, q);
    if (family) return viewFamily(c, shell, q);
    return viewStaff(c, shell, q);
  }

  // ---- one child -----------------------------------------------------------------------------------------------------------
  async function viewChild(c, shell, kid, q = new URLSearchParams(location.search)) {
    const t = T();
    let r;
    try { r = await rpc('health_child_get', { p_center: c.center_id, p_kid: kid }); } catch (e) { return fail(c, shell, t.title, e); }
    const name = [r.child?.first, r.child?.last].filter(Boolean).join(' ') || kid;
    const can = r.can || {};
    const docOpts = (cur) => opt('', t.noDoc, cur) + (r.documents || []).map((d) => opt(d.id, `${d.file_name} (${day(String(d.uploaded_at).slice(0, 10))})`, cur)).join('');
    const verifyBtns = (kind, x) => (can.verify && x.status === 'active' ? `${x.verified ? '' : `<button class="btn soft small" type="button" data-verify="${esc(kind)}:${esc(x.id)}">${esc(t.verify)}</button>`}
      <button class="btn link small" type="button" data-remove="${esc(kind)}:${esc(x.id)}">${esc(t.remove)}</button>` : '');
    const vchip = (x) => (x.status === 'entered_in_error' ? chip(t.inError, 'bad') : x.verified ? chip(t.verified, 'ok') : chip(t.unverified, 'warn'));

    const comp = (r.compliance || []).map((i) => { const x = itemText(i, lang(), day); return `<li data-item="${esc(i.item)}">${chip(x.state, x.tone)} <b>${esc(x.label)}</b>${x.detail ? `<span class="small muted"> · ${esc(x.detail)}</span>` : ''}</li>`; }).join('');
    const imm = (r.immunizations || []).map((x) => `<tr data-imm="${esc(x.id)}"><td>${esc(t.vaccines[x.vaccine] || x.vaccine)}</td><td>${esc(x.dose ?? '')}</td><td>${esc(day(x.given_on))}</td>
      <td>${esc(t.sources[x.source] || x.source)}${x.note ? `<br><span class="small" translate="no">${esc(x.note)}</span>` : ''}</td><td>${vchip(x)} ${verifyBtns('immunization', x)}</td></tr>`).join('');
    const ex = (r.exemptions || []).map((x) => `<li data-ex="${esc(x.id)}">${vchip(x)} <b>${esc(t.exKinds[x.kind] || x.kind)}</b> · ${esc(t.scopes[x.scope] || x.scope)}
      ${(x.vaccines || []).length ? ` · ${esc(x.vaccines.map((v) => t.vaccines[v] || v).join(', '))}` : ''}${x.expires_on ? ` · ${esc(t.expiresOn)} ${esc(day(x.expires_on))}` : ''} ${verifyBtns('exemption', x)}</li>`).join('');
    const ass = (r.assessments || []).map((x) => `<li data-ass="${esc(x.id)}">${vchip(x)} <b>${esc(t.aKinds[x.kind] || x.kind)}</b> · ${esc(day(x.done_on))}${x.result ? ` · ${esc(t.results[x.result] || x.result)}` : ''}
      ${x.provider ? ` · <span translate="no">${esc(x.provider)}</span>` : ''}${x.next_due ? ` · ${esc(t.nextDue)}: ${esc(day(x.next_due))}` : ''}${x.height_cm ? ` · ${esc(t.cm(x.height_cm))}` : ''}${x.weight_kg ? ` · ${esc(t.kg(x.weight_kg))}` : ''}
      ${x.notes ? `<br><span class="small" translate="no">${esc(x.notes)}</span>` : ''} ${verifyBtns('assessment', x)}</li>`).join('');
    const plans = (r.plans || []).map((p) => `<article class="h-plan${p.status === 'ended' ? ' ended' : ''}" data-plan="${esc(p.id)}">
      <h4>${esc(t.pKinds[p.kind] || p.kind)}: <span translate="no">${esc(p.title)}</span> ${p.status === 'ended' ? chip(t.ended) : p.verified ? chip(t.verified, 'ok') : chip(t.unverified, 'warn')} ${p.review_due ? chip(t.reviewBy, 'warn') : ''}</h4>
      ${p.care_alert ? `<p class="small">${esc(t.alert)}: <b translate="no">${esc(p.care_alert.label)}</b>${p.meal ? ` · ${esc(t.mealStates[p.meal.state] || t.meal)}` : ''}</p>` : ''}
      ${p.triggers ? `<p class="small"><b>${esc(t.triggers)}:</b> <span translate="no">${esc(p.triggers)}</span></p>` : ''}
      ${p.warning_signs ? `<p class="small"><b>${esc(t.warning)}:</b> <span translate="no">${esc(p.warning_signs)}</span></p>` : ''}
      <p class="h-steps"><b>${esc(t.steps)}:</b> <span translate="no">${esc(p.emergency_steps)}</span></p>
      ${p.daily_care ? `<p class="small"><b>${esc(t.daily)}:</b> <span translate="no">${esc(p.daily_care)}</span></p>` : ''}
      ${p.emergency_med_on_site ? `<p class="small">${chip(t.medOnSite, 'gold')}</p>` : ''}
      ${p.review_by ? `<p class="small muted">${esc(t.reviewBy)}: ${esc(day(p.review_by))}</p>` : ''}
      ${can.verify && p.status === 'active' ? `<p class="cta-row">${p.verified ? '' : `<button class="btn soft small" type="button" data-verify="plan:${esc(p.id)}">${esc(t.verify)}</button>`}
        <button class="btn link small" type="button" data-endplan="${esc(p.id)}">${esc(t.endPlan)}</button></p>` : ''}</article>`).join('');
    const meds = (r.meds || []).map((m) => `<article class="h-med" data-med="${esc(m.id)}">
      <h4><span translate="no">${esc(m.med_name)}</span> · <span translate="no">${esc(m.dose)}</span> ${chip(t.statuses[m.status] || m.status, m.status === 'active' ? 'ok' : m.status === 'awaiting_signature' ? 'warn' : '')}</h4>
      ${m.status === 'draft' ? `<p class="small">${esc(t.draftNote)}</p>` : `<p class="small">${esc(t.routes[m.route] || m.route)} · ${m.as_needed ? `${esc(t.asNeeded)}${m.as_needed_when ? `: <span translate="no">${esc(m.as_needed_when)}</span>` : ''}` : esc((m.times || []).join(', '))}
        · ${esc(day(m.start_on))} – ${esc(day(m.end_on))} · ${esc(t.storages[m.storage] || m.storage)}</p>`}
      ${m.instructions ? `<p class="small"><b>${esc(t.instructions)}:</b> <span translate="no">${esc(m.instructions)}</span></p>` : ''}
      ${m.signed_at ? `<p class="small muted">${esc(t.signed(m.signed_name, day(String(m.signed_at).slice(0, 10))))} · ${esc(t.fingerprint)} <code>${esc(String(m.signature_hash || '').slice(0, 12))}</code></p>` : ''}
      ${(m.stock || []).length ? `<p class="small">${esc(t.stock)}: ${m.stock.map((s) => `${esc(t.left(s.left, s.unit))} · ${esc(t.expires)} ${esc(day(s.expires_on))}${s.expired ? ` ${chip(t.expiredStock, 'bad')}` : ''}${s.status !== 'in_use' ? ` ${chip(s.status === 'returned' ? t.returned : t.disposed)}` : can.stock ? ` <button class="btn link small" type="button" data-stockclose="${esc(s.id)}">${esc(t.returned)}</button>` : ''}`).join('; ')}</p>` : ''}
      ${(m.recent || []).length ? `<details><summary>${esc(t.recent)}</summary><ul class="plain">${m.recent.map((d) => `<li data-dose="${esc(d.id)}">${esc(day(d.slot_date))} ${esc(d.slot_time || '')} · ${esc(t.by(t.outcomes[d.outcome] || d.outcome, d.given_by_name, clock(c, d.at)))}${d.quantity ? ` · ${esc(d.quantity)} ${esc(d.unit || '')}` : ''}${d.check_status === 'checked' ? ` · ${esc(t.checked(d.checked_by_name))}` : ''}${d.error ? ` ${chip(t.error, 'bad')}` : ''}</li>`).join('')}</ul></details>` : ''}
      <p class="cta-row">${m.status === 'draft' && can.meds && r.licensed ? `<button class="btn gold" type="button" data-complete="${esc(m.id)}">${esc(t.completeDraft)}</button>` : ''}
        ${m.status === 'awaiting_signature' && can.sign ? `<button class="btn gold" type="button" data-sign="${esc(m.id)}">${esc(t.readSign)}</button>` : ''}
        ${m.status === 'awaiting_signature' && can.verify ? `<button class="btn soft small" type="button" data-paper="${esc(m.id)}">${esc(t.paper)}</button>` : ''}
        ${m.status === 'active' && can.stock ? `<button class="btn soft small" type="button" data-stock="${esc(m.id)}">${esc(t.addStock)}</button>` : ''}
        ${m.status !== 'ended' && (can.verify || can.sign) ? `<button class="btn link small" type="button" data-endmed="${esc(m.id)}">${esc(t.endMed)}</button>` : ''}</p>
      <div class="h-med-panel" id="hMedPanel-${esc(m.id)}"></div></article>`).join('');
    const ill = (r.illness || []).map((x) => `<li data-ill="${esc(x.id)}"><b>${esc(t.illKinds[x.kind] || x.kind)}</b> · ${esc(day(String(x.observed_at).slice(0, 10)))} ${esc(clock(c, x.observed_at))}
      ${(x.symptoms || []).length ? ` · ${esc(x.symptoms.map((s) => t.symptomsList[s] || s).join(', '))}` : ''}${x.temperature_f ? ` · ${esc(x.temperature_f)} °F` : ''}
      ${x.sent_home ? ` ${chip(t.sentHome, 'warn')}` : ''}${x.exclusion_until ? `<br><span class="small">${esc(t.exclusion(day(x.exclusion_until)))}${x.exclusion_basis ? `: <span translate="no">${esc(x.exclusion_basis)}</span>` : ''}</span>` : x.sent_home ? `<br><span class="small muted">${esc(t.noPolicy)}</span>` : ''}
      ${x.notes ? `<br><span class="small" translate="no">${esc(x.notes)}</span>` : ''}${x.reported_to_health_dept_at ? ` ${chip(t.reported)}` : ''}
      ${x.returned_on ? `<br><span class="small">${esc(t.returnedOn)} ${esc(day(x.returned_on))}${x.return_note ? `: <span translate="no">${esc(x.return_note)}</span>` : ''}</span>`
        : x.sent_home && can.edit ? ` <button class="btn link small" type="button" data-return="${esc(x.id)}">${esc(t.addReturn)}</button>` : ''}</li>`).join('');
    const docs = (r.documents || []).map((d) => `<li><span>${esc(d.file_name)}</span> <button class="btn link small" type="button" data-open="${esc(d.id)}">${esc(t.open)}</button></li>`).join('');
    const today = r.today;
    const lic = r.licensed ? '' : `<p class="msg info">${esc(t.noLicense)}</p>`;

    const immForm = can.edit ? `<details><summary>${esc(t.newImm)}</summary><form class="h-form" id="hImmForm" novalidate>
      <label class="f"><span>${esc(t.vaccine)}</span><select class="i" name="vaccine" id="hImmVax">${opt('', '', '')}${VACCINES.map((v) => opt(v, t.vaccines[v], '')).join('')}</select></label>
      <label class="f"><span>${esc(t.dose)}</span><input class="i" name="dose" id="hImmDose" type="number" min="1" max="10" inputmode="numeric"></label>
      <label class="f"><span>${esc(t.givenOn)}</span><input class="i" name="given_on" id="hImmDate" type="date" max="${esc(today)}"></label>
      <label class="f"><span>${esc(t.source)}</span><select class="i" name="source">${opts(Object.fromEntries(Object.entries(t.sources).filter(([k]) => !['import', 'transfer'].includes(k))), r.as === 'family' ? 'family' : 'document')}</select></label>
      <label class="f"><span>${esc(t.document)}</span><select class="i" name="document_id">${docOpts('')}</select></label>
      <label class="f"><span>${esc(t.note)}</span><input class="i" name="note" maxlength="500" autocomplete="off"></label>
      <button class="btn navy" type="submit" id="hImmSave">${esc(t.add)}</button><p class="msg" role="status"></p></form></details>` : '';
    const exForm = can.plans ? `<details><summary>${esc(t.newEx)}</summary><form class="h-form" id="hExForm" novalidate>
      <label class="f"><span>${esc(t.scope)}</span><select class="i" name="scope">${opts(t.scopes, 'immunization')}</select></label>
      <label class="f"><span>${esc(t.exKind)}</span><select class="i" name="kind">${opts(t.exKinds, 'medical')}</select></label>
      <fieldset class="f"><legend>${esc(t.vaxFor)}</legend><div class="h-checks">${VACCINES.filter((v) => v !== 'other').map((v) => `<label class="check"><input type="checkbox" name="vax" value="${esc(v)}"> ${esc(t.vaccines[v])}</label>`).join('')}</div></fieldset>
      <label class="f"><span>${esc(t.signedOn)}</span><input class="i" name="signed_on" type="date" max="${esc(today)}"></label>
      <label class="f"><span>${esc(t.expiresOn)}</span><input class="i" name="expires_on" type="date"></label>
      <label class="f"><span>${esc(t.document)}</span><select class="i" name="document_id">${docOpts('')}</select></label>
      <button class="btn navy" type="submit">${esc(t.add)}</button><p class="msg" role="status"></p></form></details>` : '';
    const assForm = can.edit ? `<details><summary>${esc(t.newAss)}</summary><form class="h-form" id="hAssForm" novalidate>
      <label class="f"><span>${esc(t.aKind)}</span><select class="i" name="kind">${opts(Object.fromEntries(Object.entries(t.aKinds).filter(([k]) => r.as !== 'staff' || k !== 'history_review')), 'physical')}</select></label>
      <label class="f"><span>${esc(t.doneOn)}</span><input class="i" name="done_on" type="date" max="${esc(today)}"></label>
      <label class="f"><span>${esc(t.result)}</span><select class="i" name="result">${opts(t.results, '', '')}</select></label>
      <label class="f"><span>${esc(t.provider)}</span><input class="i" name="provider" maxlength="120" autocomplete="off"></label>
      <label class="f"><span>${esc(t.nextDue)}</span><input class="i" name="next_due" type="date"></label>
      <label class="f"><span>${esc(t.height)}</span><input class="i" name="height_cm" type="number" min="30" max="200" step="0.1"></label>
      <label class="f"><span>${esc(t.weight)}</span><input class="i" name="weight_kg" type="number" min="2" max="150" step="0.1"></label>
      <label class="f"><span>${esc(t.document)}</span><select class="i" name="document_id">${docOpts('')}</select></label>
      <label class="f"><span>${esc(t.notes)}</span><textarea class="i" name="notes" maxlength="1000" rows="2"></textarea></label>
      <button class="btn navy" type="submit">${esc(t.add)}</button><p class="msg" role="status"></p></form></details>` : '';
    const planForm = can.plans ? `<details><summary>${esc(t.newPlan)}</summary><form class="h-form" id="hPlanForm" novalidate>
      <label class="f"><span>${esc(t.aKind)}</span><select class="i" name="kind">${opts(t.pKinds, 'allergy')}</select></label>
      <label class="f"><span>${esc(t.planTitle)}</span><input class="i" name="title" maxlength="80" autocomplete="off"></label>
      <label class="f"><span>${esc(t.alert)}</span><select class="i" name="care_alert_id">${opt('', t.noAlert, '')}${(r.care_alerts || []).map((a) => opt(a.id, a.label, '')).join('')}</select></label>
      <label class="f"><span>${esc(t.triggers)}</span><textarea class="i" name="triggers" maxlength="1000" rows="2"></textarea></label>
      <label class="f"><span>${esc(t.warning)}</span><textarea class="i" name="warning_signs" maxlength="1000" rows="2"></textarea></label>
      <label class="f"><span>${esc(t.steps)}</span><textarea class="i" name="emergency_steps" id="hPlanSteps" maxlength="2000" rows="3"></textarea></label>
      <label class="f"><span>${esc(t.daily)}</span><textarea class="i" name="daily_care" maxlength="2000" rows="2"></textarea></label>
      <label class="check"><input type="checkbox" name="emergency_med_on_site"> ${esc(t.medOnSite)}</label>
      <label class="f"><span>${esc(t.reviewBy)}</span><input class="i" name="review_by" type="date"></label>
      <label class="f"><span>${esc(t.document)}</span><select class="i" name="document_id">${docOpts('')}</select></label>
      <button class="btn navy" type="submit">${esc(t.add)}</button><p class="msg" role="status"></p></form></details>` : '';
    const medForm = can.meds && r.licensed ? `<details><summary>${esc(t.newMed)}</summary><form class="h-form" id="hMedForm" novalidate>
      <label class="f"><span>${esc(t.medName)}</span><input class="i" name="med_name" id="hMedName" maxlength="120" autocomplete="off"></label>
      <label class="f"><span>${esc(t.medDose)}</span><input class="i" name="dose" id="hMedDose" maxlength="120" autocomplete="off"></label>
      <label class="f"><span>${esc(t.amount)}</span><input class="i" name="dose_amount" id="hMedAmount" type="number" min="0.01" step="0.01"></label>
      <label class="f"><span>${esc(t.unit)}</span><select class="i" name="dose_unit">${opts(t.units, 'mL')}</select></label>
      <label class="f"><span>${esc(t.route)}</span><select class="i" name="route">${opts(t.routes, 'oral')}</select></label>
      <label class="f"><span>${esc(t.times)} <span class="hint">${esc(t.timeHint)}</span></span><input class="i" name="times" id="hMedTimes" autocomplete="off"></label>
      <label class="check"><input type="checkbox" name="as_needed" id="hMedPrn"> ${esc(t.asNeeded)}</label>
      <div id="hMedPrnWrap" hidden><label class="f"><span>${esc(t.asNeededWhen)}</span><input class="i" name="as_needed_when" maxlength="300" autocomplete="off"></label>
        <label class="f"><span>${esc(t.minHours)}</span><input class="i" name="min_hours_between" type="number" min="0.5" max="48" step="0.5"></label>
        <label class="f"><span>${esc(t.maxDay)}</span><input class="i" name="max_per_day" type="number" min="1" max="12"></label></div>
      <label class="f"><span>${esc(t.startOn)}</span><input class="i" name="start_on" id="hMedStart" type="date" min="${esc(today)}" value="${esc(today)}"></label>
      <label class="f"><span>${esc(t.endOn)}</span><input class="i" name="end_on" id="hMedEnd" type="date" min="${esc(today)}"></label>
      <label class="check"><input type="checkbox" name="prescription"> ${esc(t.prescription)}</label>
      <label class="f"><span>${esc(t.prescriber)}</span><input class="i" name="prescriber" maxlength="120" autocomplete="off"></label>
      <label class="f"><span>${esc(t.storage)}</span><select class="i" name="storage">${opts(t.storages, 'room_temp')}</select></label>
      <label class="f"><span>${esc(t.instructions)}</span><textarea class="i" name="instructions" maxlength="1000" rows="2"></textarea></label>
      <label class="check"><input type="checkbox" name="original_container" id="hMedOrig"> ${esc(t.original)}</label>
      <button class="btn navy" type="submit" id="hMedSave">${esc(t.add)}</button><p class="msg" role="status" id="hMedMsg"></p></form></details>` : '';
    const illForm = can.illness && r.licensed ? `<details><summary>${esc(t.newIll)}</summary><form class="h-form" id="hIllForm" novalidate>
      <label class="f"><span>${esc(t.aKind)}</span><select class="i" name="kind">${opts(t.illKinds, 'illness')}</select></label>
      <fieldset class="f"><legend>${esc(t.symptoms)}</legend><div class="h-checks">${SYMPTOM_KEYS.map((s) => `<label class="check"><input type="checkbox" name="sym" value="${esc(s)}"> ${esc(t.symptomsList[s])}</label>`).join('')}</div></fieldset>
      <label class="f"><span>${esc(t.temp)}</span><input class="i" name="temperature_f" id="hIllTemp" type="number" min="90" max="110" step="0.1"></label>
      <label class="f"><span>${esc(t.tempMethod)}</span><select class="i" name="temp_method">${opts(t.methods, '', '')}</select></label>
      <label class="check"><input type="checkbox" name="sent_home" id="hIllHome"> ${esc(t.sentHome)}</label>
      <label class="f"><span>${esc(t.illNotes)}</span><textarea class="i" name="notes" maxlength="1000" rows="2"></textarea></label>
      <label class="f"><span>${esc(t.incident)}</span><select class="i" name="incident_id" id="hIllInc">${opt('', t.noIncidentOpt, '')}</select></label>
      <label class="check"><input type="checkbox" name="reported"> ${esc(t.reported)}</label><p class="small muted">${esc(t.reportHint)}</p>
      <button class="btn navy" type="submit" id="hIllSave">${esc(t.add)}</button><p class="msg" role="status" id="hIllMsg"></p></form></details>` : '';

    const back = r.as === 'family' ? `/c/${c.slug}/health` : `/c/${c.slug}/child/${encodeURIComponent(kid)}`;
    page(shell(`<section id="healthView" class="h-view" data-kid="${esc(kid)}">
      <div class="card"><h2 id="hChildH">${esc(t.child(name))}</h2>${lic}<p class="small"><a class="btn link" href="${esc(back)}" data-nav>${esc(t.back)}</a></p></div>
      <section class="card" id="hCompliance" aria-labelledby="hCompH"><h3 id="hCompH">${esc(t.sec.compliance)}</h3>${comp ? `<ul class="plain h-items">${comp}</ul>` : `<p class="small muted">${esc(t.none)}</p>`}</section>
      <section class="card" id="hPlans" aria-labelledby="hPlansH"><h3 id="hPlansH">${esc(t.sec.plans)}</h3>${plans || `<p class="small muted">${esc(t.none)}</p>`}${planForm}</section>
      <section class="card" id="hMeds" aria-labelledby="hMedsH"><h3 id="hMedsH">${esc(t.sec.meds)}</h3>${meds || `<p class="small muted">${esc(t.none)}</p>`}${medForm}</section>
      <section class="card" id="hImm" aria-labelledby="hImmH"><h3 id="hImmH">${esc(t.sec.immunizations)}</h3>${imm ? `<div class="tablewrap"><table class="t"><thead><tr><th>${esc(t.vaccine)}</th><th>${esc(t.dose)}</th><th>${esc(t.givenOn)}</th><th>${esc(t.source)}</th><th></th></tr></thead><tbody>${imm}</tbody></table></div>` : `<p class="small muted">${esc(t.none)}</p>`}${immForm}</section>
      <section class="card" id="hEx" aria-labelledby="hExH"><h3 id="hExH">${esc(t.sec.exemptions)}</h3>${ex ? `<ul class="plain">${ex}</ul>` : `<p class="small muted">${esc(t.none)}</p>`}${exForm}</section>
      <section class="card" id="hAss" aria-labelledby="hAssH"><h3 id="hAssH">${esc(t.sec.assessments)}</h3>${ass ? `<ul class="plain">${ass}</ul>` : `<p class="small muted">${esc(t.none)}</p>`}${assForm}</section>
      <section class="card" id="hIll" aria-labelledby="hIllH"><h3 id="hIllH">${esc(t.sec.illness)}</h3>${ill ? `<ul class="plain">${ill}</ul>` : `<p class="small muted">${esc(t.none)}</p>`}${illForm}</section>
      <section class="card" id="hDocs" aria-labelledby="hDocsH"><h3 id="hDocsH">${esc(t.sec.docs)}</h3>${docs ? `<ul class="plain">${docs}</ul>` : `<p class="small muted">${esc(t.none)}</p>`}</section>
      <p class="msg" id="hMsg" role="status"></p></section>`), t.child(name));
    focusFromQuery(q);
    const again = () => viewChild(c, shell, kid, new URLSearchParams());
    const say = (text, ok = true) => { msg($('#hMsg'), text, ok); live(text); };
    const submit = (id, fn) => { const f = $(id); if (!f) return; f.addEventListener('submit', async (e) => {
      e.preventDefault(); const m = f.querySelector('.msg'); const b = f.querySelector('button[type=submit]'); b.disabled = true;
      try { await fn(f); live(t.saved); await again(); } catch (err) { b.disabled = false; msg(m, err.local || friendly(err)); }
    }); };
    const need = (cond, text) => { if (!cond) { const e = new Error(text); e.local = text; throw e; } };
    submit('#hImmForm', async (f) => {
      need(val(f, 'vaccine'), t.needVaccine); need(val(f, 'given_on'), t.needDate);
      await rpc('health_immunization_save', { p_center: c.center_id, p_kid: kid, p: { vaccine: val(f, 'vaccine'), dose: val(f, 'dose') || null, given_on: val(f, 'given_on'),
        source: val(f, 'source'), document_id: val(f, 'document_id') || null, note: val(f, 'note') || null } });
    });
    submit('#hExForm', async (f) => {
      await rpc('health_exemption_save', { p_center: c.center_id, p_kid: kid, p: { scope: val(f, 'scope'), kind: val(f, 'kind'), vaccines: [...f.querySelectorAll('input[name="vax"]:checked')].map((x) => x.value),
        signed_on: val(f, 'signed_on') || null, expires_on: val(f, 'expires_on') || null, document_id: val(f, 'document_id') || null } });
    });
    submit('#hAssForm', async (f) => {
      need(val(f, 'done_on'), t.needDate);
      await rpc('health_assessment_save', { p_center: c.center_id, p_kid: kid, p: { kind: val(f, 'kind'), done_on: val(f, 'done_on'), result: val(f, 'result') || null,
        provider: val(f, 'provider') || null, next_due: val(f, 'next_due') || null, height_cm: val(f, 'height_cm') || null, weight_kg: val(f, 'weight_kg') || null,
        document_id: val(f, 'document_id') || null, notes: val(f, 'notes') || null } });
    });
    submit('#hPlanForm', async (f) => {
      need(val(f, 'title').trim(), t.needTitle); need(val(f, 'emergency_steps').trim().length >= 3, t.needSteps);
      await rpc('health_plan_save', { p_center: c.center_id, p_kid: kid, p: { kind: val(f, 'kind'), title: val(f, 'title').trim(), care_alert_id: val(f, 'care_alert_id') || null,
        triggers: val(f, 'triggers') || null, warning_signs: val(f, 'warning_signs') || null, emergency_steps: val(f, 'emergency_steps'), daily_care: val(f, 'daily_care') || null,
        emergency_med_on_site: checked(f, 'emergency_med_on_site'), review_by: val(f, 'review_by') || null, document_id: val(f, 'document_id') || null } });
    });
    const mf = $('#hMedForm');
    if (mf) $('#hMedPrn').addEventListener('change', () => { $('#hMedPrnWrap').hidden = !$('#hMedPrn').checked; });
    submit('#hMedForm', async (f) => {
      const a = medArgs({ med_name: val(f, 'med_name'), dose: val(f, 'dose'), dose_amount: val(f, 'dose_amount'), dose_unit: val(f, 'dose_unit'), route: val(f, 'route'),
        times: val(f, 'times'), as_needed: checked(f, 'as_needed'), as_needed_when: val(f, 'as_needed_when'), min_hours_between: val(f, 'min_hours_between'), max_per_day: val(f, 'max_per_day'),
        start_on: val(f, 'start_on'), end_on: val(f, 'end_on'), prescription: checked(f, 'prescription'), prescriber: val(f, 'prescriber'), original_container: checked(f, 'original_container'),
        storage: val(f, 'storage'), instructions: val(f, 'instructions') }, lang());
      need(!a.error, a.error);
      await rpc('health_med_save', { p_center: c.center_id, p_kid: kid, p: a.payload, p_id: f.dataset.edit || null });
    });
    // a draft from the enrollment packet: the same form, filled with what the family wrote; saving it asks for the signature
    $$('[data-complete]').forEach((b) => b.addEventListener('click', () => {
      const m = (r.meds || []).find((x) => x.id === b.dataset.complete);
      if (!m || !mf) return;
      mf.dataset.edit = m.id;
      mf.closest('details').open = true;
      $('#hMedName').value = m.med_name || ''; $('#hMedDose').value = m.dose || '';
      mf.querySelector('[name="instructions"]').value = m.instructions || '';
      $('#hMedName').focus();
    }));
    const illF = $('#hIllForm');
    if (illF) rpc('health_incident_options', { p_center: c.center_id, p_kid: kid }).then((list) => {
      const s = $('#hIllInc'); if (s) s.insertAdjacentHTML('beforeend', (list || []).map((i) => opt(i.id, `${day(String(i.at).slice(0, 10))} ${clock(c, i.at)}`, '')).join(''));
    }).catch(() => {});
    submit('#hIllForm', async (f) => {
      await rpc('health_illness_save', { p_center: c.center_id, p_kid: kid, p: { kind: val(f, 'kind'), symptoms: [...f.querySelectorAll('input[name="sym"]:checked')].map((x) => x.value),
        temperature_f: val(f, 'temperature_f') || null, temp_method: val(f, 'temp_method') || null, sent_home: checked(f, 'sent_home'), notes: val(f, 'notes') || null,
        incident_id: val(f, 'incident_id') || null, reported_to_health_dept_at: checked(f, 'reported') ? new Date().toISOString() : null } });
    });
    $$('[data-verify]').forEach((b) => b.addEventListener('click', async () => {
      const [kind, id] = b.dataset.verify.split(':'); b.disabled = true;
      try { await rpc('health_verify', { p_center: c.center_id, p_kind: kind, p_id: id }); live(t.verified); await again(); } catch (e) { b.disabled = false; say(friendly(e), false); }
    }));
    $$('[data-remove]').forEach((b) => b.addEventListener('click', async () => {
      const [kind, id] = b.dataset.remove.split(':'); const why = prompt(t.removeWhy); if (!why) return;
      try { await rpc('health_remove', { p_center: c.center_id, p_kind: kind, p_id: id, p_reason: why }); await again(); } catch (e) { say(friendly(e), false); }
    }));
    $$('[data-endplan]').forEach((b) => b.addEventListener('click', async () => {
      const why = prompt(t.endWhy); if (!why) return;
      try { await rpc('health_plan_end', { p_center: c.center_id, p_id: b.dataset.endplan, p_reason: why }); await again(); } catch (e) { say(friendly(e), false); }
    }));
    $$('[data-endmed]').forEach((b) => b.addEventListener('click', async () => {
      const why = prompt(t.endWhy); if (!why) return;
      try { await rpc('health_med_end', { p_center: c.center_id, p_id: b.dataset.endmed, p_reason: why }); await again(); } catch (e) { say(friendly(e), false); }
    }));
    $$('[data-stockclose]').forEach((b) => b.addEventListener('click', async () => {
      try { await rpc('health_stock_close', { p_center: c.center_id, p_stock: b.dataset.stockclose, p_status: 'returned' }); await again(); } catch (e) { say(friendly(e), false); }
    }));
    $$('[data-open]').forEach((b) => b.addEventListener('click', async () => {
      try {
        const o = await rpc('child_document_open', { p_center: c.center_id, p_id: b.dataset.open });
        const s = await client().storage.from(o.bucket).createSignedUrl(o.path, 60);
        if (s.error) throw s.error;
        window.open(s.data.signedUrl, '_blank', 'noopener');
      } catch (e) { say(friendly(e), false); }
    }));
    $$('[data-return]').forEach((b) => b.addEventListener('click', () => {
      const li = b.closest('li'); b.remove();
      li.insertAdjacentHTML('beforeend', `<form class="h-form h-inline" id="hRetForm" novalidate><label class="f"><span>${esc(t.returnedOn)}</span><input class="i" name="returned_on" type="date"></label>
        <label class="f"><span>${esc(t.returnNote)}</span><input class="i" name="return_note" maxlength="500" autocomplete="off"></label>
        <button class="btn navy small" type="submit">${esc(t.save)}</button><p class="msg" role="status"></p></form>`);
      submit('#hRetForm', async (f) => rpc('health_illness_return', { p_center: c.center_id, p_id: li.dataset.ill, p: { returned_on: val(f, 'returned_on') || null, return_note: val(f, 'return_note') || null } }));
    }));
    // the guardian reads the exact text and signs it (typed name + checkbox; the text's fingerprint goes with the signature)
    $$('[data-sign]').forEach((b) => b.addEventListener('click', async () => {
      const id = b.dataset.sign; const panel = $(`#hMedPanel-${CSS.escape(id)}`);
      try {
        const d = await rpc('health_med_document', { p_center: c.center_id, p_id: id, p_lang: lang() });
        panel.innerHTML = `<form class="h-form h-sign" id="hSignForm" novalidate><h4>${esc(t.signTitle)}</h4><pre class="h-doc" id="hSignText" translate="no">${esc(d.text)}</pre>
          <p class="small muted">${esc(t.fingerprint)} <code>${esc(d.hash.slice(0, 16))}</code></p>
          <label class="f"><span>${esc(t.typeName)}</span><input class="i" id="hSignName" autocomplete="name"></label>
          <label class="check"><input type="checkbox" id="hSignAgree"> ${esc(t.agree)}</label>
          <button class="btn gold" type="submit" id="hSignBtn">${esc(t.sign)}</button><p class="msg" role="status" id="hSignMsg"></p></form>`;
        b.hidden = true;
        $('#hSignName').focus();
        $('#hSignForm').addEventListener('submit', async (e) => {
          e.preventDefault(); const btn = $('#hSignBtn'); btn.disabled = true;
          try {
            await rpc('health_med_sign', { p_center: c.center_id, p_id: id, p_typed_name: $('#hSignName').value, p_agree: $('#hSignAgree').checked, p_doc_hash: d.hash, p_lang: d.lang });
            live(t.saved); await again();
          } catch (err) { btn.disabled = false; msg($('#hSignMsg'), friendly(err)); }
        });
      } catch (e) { say(friendly(e), false); }
    }));
    $$('[data-paper]').forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.paper; const panel = $(`#hMedPanel-${CSS.escape(id)}`); b.hidden = true;
      panel.innerHTML = `<form class="h-form" id="hPaperForm" novalidate><label class="f"><span>${esc(t.paperName)}</span><input class="i" name="name" autocomplete="off"></label>
        <label class="f"><span>${esc(t.paperDoc)}</span><select class="i" name="doc">${docOpts('')}</select></label>
        <button class="btn navy small" type="submit">${esc(t.save)}</button><p class="msg" role="status"></p></form>`;
      submit('#hPaperForm', async (f) => rpc('health_med_paper', { p_center: c.center_id, p_id: id, p_guardian_name: val(f, 'name'), p_document: val(f, 'doc') || null }));
    }));
    $$('[data-stock]').forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.stock; const panel = $(`#hMedPanel-${CSS.escape(id)}`); b.hidden = true;
      panel.innerHTML = `<form class="h-form" id="hStockForm" novalidate>
        <label class="f"><span>${esc(t.quantity)}</span><input class="i" name="quantity" type="number" min="0.01" step="0.01" id="hStockQty"></label>
        <label class="f"><span>${esc(t.unit)}</span><select class="i" name="unit">${opts(t.units, 'mL')}</select></label>
        <label class="f"><span>${esc(t.expires)}</span><input class="i" name="expires_on" type="date" id="hStockExp"></label>
        <label class="f"><span>${esc(t.location)}</span><input class="i" name="location" maxlength="80" autocomplete="off"></label>
        <label class="check"><input type="checkbox" name="original_container" id="hStockOrig"> ${esc(t.original)}</label>
        <button class="btn navy small" type="submit" id="hStockSave">${esc(t.save)}</button><p class="msg" role="status"></p></form>`;
      submit('#hStockForm', async (f) => {
        need(checked(f, 'original_container'), t.needOriginal);
        await rpc('health_stock_save', { p_center: c.center_id, p_med: id, p: { quantity: val(f, 'quantity'), unit: val(f, 'unit'), expires_on: val(f, 'expires_on'),
          location: val(f, 'location') || null, original_container: true } });
      });
    }));
  }

  // ---- the medication administration record (tablet) -------------------------------------------------------------------------
  async function viewMar(c, shell, q = new URLSearchParams(location.search)) {
    const t = T();
    let d;
    try { d = await rpc('health_mar_due', { p_center: c.center_id, p_date: q.get('date') || null, p_room: q.get('room') || null }); } catch (e) { return fail(c, shell, t.marTitle, e); }
    const can = d.can_record && d.licensed;
    const cards = (d.meds || []).map((m) => {
      const slots = (m.slots || []).map((s) => `<div class="h-slot" data-slot="${esc(s.time)}" data-dose="${esc(s.record?.id || '')}">
          <span class="h-slot-time">${esc(s.time)}</span>${chip(t.slotStates[s.state] || s.state, SLOT_TONE[s.state])}
          ${s.record ? `<span class="small">${esc(t.by(t.outcomes[s.record.outcome], s.record.given_by_name, clock(c, s.record.at)))}${s.record.check_status === 'awaiting' ? ` ${chip(t.awaitingCheck, 'warn')}` : s.record.check_status === 'checked' ? ` · ${esc(t.checked(s.record.checked_by_name))}` : ''}${s.record.error ? ` ${chip(t.error, 'bad')}` : ''}</span>
             ${can && s.record.check_status === 'awaiting' ? `<button class="btn soft" type="button" data-check="${esc(s.record.id)}">${esc(t.check)}</button>` : ''}
             ${can && !s.record.error ? `<button class="btn link small" type="button" data-err="${esc(s.record.id)}" data-kid="${esc(m.kid)}">${esc(t.error)}</button>` : ''}`
           : can ? `<span class="h-outs">${['given', 'refused', 'missed', 'held'].map((o) => `<button class="btn ${o === 'given' ? 'gold' : 'soft'} h-out" type="button" data-out="${o}" data-med="${esc(m.id)}" data-time="${esc(s.time)}">${esc(t.outcomes[o])}</button>`).join('')}</span>` : ''}</div>`).join('');
      const prn = m.as_needed ? `<div class="h-slot h-prn">${(m.prn_today || []).length ? `<span class="small">${esc(t.prnToday)}: ${m.prn_today.map((x) => esc(t.by(t.outcomes[x.outcome], x.given_by_name, clock(c, x.at)))).join('; ')}</span>` : ''}
          ${can ? `<button class="btn gold h-out" type="button" data-out="given" data-med="${esc(m.id)}" data-time="">${esc(t.giveNow)}</button>` : ''}</div>` : '';
      return `<article class="card h-mar-med" data-med="${esc(m.id)}"><h3>${esc(m.first || '')} ${esc(m.last || '')} · <span translate="no">${esc(m.med_name)}</span></h3>
        <p><b translate="no">${esc(m.dose)}</b> · ${esc(t.routes[m.route] || m.route)} · ${esc(t.storages[m.storage] || m.storage)}${m.as_needed && m.as_needed_when ? ` · <span translate="no">${esc(m.as_needed_when)}</span>` : ''}</p>
        ${m.instructions ? `<p class="small"><b>${esc(t.instructions)}:</b> <span translate="no">${esc(m.instructions)}</span></p>` : ''}
        <p class="small">${esc(t.stockOnFile)}: ${esc(t.left(m.stock_left, m.dose_unit))}${m.stock_expires_on ? ` · ${esc(t.expires)} ${esc(day(m.stock_expires_on))}` : ''}${m.stock_expired ? ` ${chip(t.expiredStock, 'bad')}` : ''}</p>
        ${can ? `<label class="f"><span>${esc(t.note)}</span><input class="i" id="hNote-${esc(m.id)}" maxlength="500" autocomplete="off"></label>
          ${d.double_check === 'optional' ? `<label class="check"><input type="checkbox" id="hChk-${esc(m.id)}"> ${esc(t.askCheck)}</label>` : ''}` : ''}
        ${slots}${prn}<div class="h-err" id="hErr-${esc(m.id)}"></div></article>`;
    }).join('');
    page(shell(`<section id="hMar" class="h-view h-mar"><div class="card"><h2>${esc(t.marTitle)}</h2><p class="small muted">${esc(t.marLead)}</p>
        <form class="h-day" id="hMarDay"><label class="f"><span>${esc(t.day)}</span><input class="i" type="date" name="date" value="${esc(d.date)}" max="${esc(d.date)}"></label></form>
        ${d.licensed ? '' : `<p class="msg info">${esc(t.noLicense)}</p>`}${d.can_record ? '' : `<p class="msg info">${esc(t.untrained)}</p>`}</div>
      ${cards || `<p class="card empty">${esc(t.noMeds)}</p>`}<p class="msg" id="hMarMsg" role="status"></p></section>`), t.marTitle);
    focusFromQuery(q);
    const again = () => viewMar(c, shell, new URLSearchParams({ date: d.date }));
    $('#hMarDay').addEventListener('change', () => { const v = $('#hMarDay [name="date"]').value; history.replaceState(null, '', `/c/${c.slug}/health?view=mar&date=${v}`); viewMar(c, shell, new URLSearchParams({ date: v })); });
    const say = (text, ok) => { msg($('#hMarMsg'), text, ok); live(text); };
    $$('[data-out]').forEach((b) => b.addEventListener('click', async () => {
      const med = b.dataset.med; b.disabled = true;
      try {
        await rpc('health_mar_record', { p_center: c.center_id, p: { med_id: med, slot_date: d.date, slot_time: b.dataset.time || null, outcome: b.dataset.out,
          note: $(`#hNote-${CSS.escape(med)}`)?.value || null, request_check: !!$(`#hChk-${CSS.escape(med)}`)?.checked,
          client_id: globalThis.crypto?.randomUUID ? crypto.randomUUID() : null } });
        live(t.saved); await again();
      } catch (e) { b.disabled = false; say(friendly(e), false); }
    }));
    $$('[data-check]').forEach((b) => b.addEventListener('click', async () => {
      b.disabled = true;
      try { await rpc('health_mar_check', { p_center: c.center_id, p_mar: b.dataset.check }); live(t.saved); await again(); } catch (e) { b.disabled = false; say(friendly(e), false); }
    }));
    $$('[data-err]').forEach((b) => b.addEventListener('click', async () => {
      const box = $(`#hErr-${CSS.escape(b.closest('[data-med]').dataset.med)}`);
      try {
        const list = await rpc('health_incident_options', { p_center: c.center_id, p_kid: b.dataset.kid });
        if (!list.length) { box.innerHTML = `<p class="msg info">${esc(t.noIncident)}</p>`; return; }
        box.innerHTML = `<form class="h-form" id="hErrForm" novalidate><label class="f"><span>${esc(t.errorPick)}</span><select class="i" name="inc">${list.map((i) => opt(i.id, `${day(String(i.at).slice(0, 10))} ${clock(c, i.at)}`, '')).join('')}</select></label>
          <label class="f"><span>${esc(t.errorNote)}</span><input class="i" name="note" maxlength="500" autocomplete="off"></label>
          <button class="btn navy small" type="submit">${esc(t.save)}</button><p class="msg" role="status"></p></form>`;
        $('#hErrForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          try { await rpc('health_mar_error', { p_center: c.center_id, p_mar: b.dataset.err, p_incident: val($('#hErrForm'), 'inc'), p_note: val($('#hErrForm'), 'note') || null }); live(t.errorSaved); await again(); }
          catch (err) { msg($('#hErrForm .msg'), friendly(err)); }
        });
      } catch (e) { say(friendly(e), false); }
    }));
  }

  // ---- the director: compliance dashboard and settings --------------------------------------------------------------------------
  async function viewDashboard(c, shell, q) {
    const t = T();
    let d, s, board;
    try { [d, s, board] = await Promise.all([rpc('health_compliance', { p_center: c.center_id }), rpc('health_settings_get', { p_center: c.center_id }), rpc('health_emergency_board', { p_center: c.center_id })]); }
    catch (e) { return fail(c, shell, t.dashTitle, e); }
    const tiles = Object.entries(t.counts).map(([k, l]) => `<div class="h-tile${['overdue', 'errors_30d'].includes(k) && Number(d.counts[k]) > 0 ? ' bad' : ''}" data-count="${esc(k)}"><b>${esc(d.counts[k] ?? 0)}</b><span>${esc(l)}</span></div>`).join('');
    const rows = (d.children || []).filter((x) => x.open.length || Number(x.unverified) > 0).map((x) => `<li data-kid="${esc(x.kid)}"><a href="/c/${esc(c.slug)}/health?kid=${encodeURIComponent(x.kid)}" data-nav><b>${esc(x.first || x.kid)} ${esc(x.last || '')}</b></a>
      ${x.open.map((i) => { const it = itemText(i, lang(), day); return `${chip(`${it.label}: ${it.state}`, it.tone)}`; }).join(' ')}${Number(x.unverified) > 0 ? ` ${chip(`${t.counts.unverified}: ${x.unverified}`, 'warn')}` : ''}</li>`).join('');
    const vaxRows = (s.required_vaccines || []).map((v) => vaxRow(v)).join('');
    const exRows = (s.exclusion_policy || []).map((e) => exRow(e)).join('');
    function vaxRow(v = {}) { return `<div class="h-row" data-row="vax"><select class="i" aria-label="${esc(t.vaccine)}" name="vv">${VACCINES.filter((x) => x !== 'other').map((x) => opt(x, t.vaccines[x], v.vaccine)).join('')}</select>
      <input class="i" type="number" min="1" max="10" name="vd" value="${esc(v.doses ?? 1)}" aria-label="${esc(t.doses)}"> <span>${esc(t.doses)}</span> <button class="btn link small" type="button" data-rm>${esc(t.removeRow)}</button></div>`; }
    function exRow(e = {}) { return `<div class="h-row" data-row="ex"><select class="i" aria-label="${esc(t.symptoms)}" name="es">${SYMPTOM_KEYS.map((x) => opt(x, t.symptomsList[x], e.symptom)).join('')}</select>
      <input class="i" type="number" min="0" max="336" name="eh" value="${esc(e.hours ?? 24)}" aria-label="${esc(t.hours)}"> <span>${esc(t.hours)}</span>
      <input class="i" name="er" maxlength="200" value="${esc(e.rule || '')}" aria-label="${esc(t.rule)}" placeholder="${esc(t.rule)}"> <button class="btn link small" type="button" data-rm>${esc(t.removeRow)}</button></div>`; }
    page(shell(`<section id="hDash" class="h-view"><div class="card"><h2>${esc(t.dashTitle)}</h2>${d.licensed ? '' : `<p class="msg info">${esc(t.noLicense)}</p>`}
        <div class="h-tiles">${tiles}</div>
        ${d.immunization_summary ? `<p class="small">${esc(t.summary(day(d.immunization_summary.due_on)))}</p>` : ''}
        <p class="cta-row"><a class="btn gold" href="/c/${esc(c.slug)}/health?view=mar" data-nav id="hOpenMar">${esc(t.openMar)}</a></p></div>
      <section class="card" id="hDashKids" aria-labelledby="hDashKidsH"><h3 id="hDashKidsH">${esc(t.sec.compliance)}</h3>${rows ? `<ul class="plain h-kids">${rows}</ul>` : `<p class="small">${esc(t.allOk)}</p>`}</section>
      ${boardHtml(board)}
      <section class="card" id="hSettings" aria-labelledby="hSetH"><h3 id="hSetH">${esc(t.settings)}</h3><form class="h-form" id="hSetForm" novalidate>
        <label class="check"><input type="checkbox" name="notify" id="hSetNotify"${s.notify_family_each_dose ? ' checked' : ''}> ${esc(t.notifyDose)}</label>
        <label class="f"><span>${esc(t.dcSetting)}</span><select class="i" name="dc">${opts(t.dcOpts, s.mar_double_check)}</select></label>
        <label class="check"><input type="checkbox" name="hq" id="hSetHq"${s.hq_support_allowed ? ' checked' : ''}> ${esc(t.hqAllowed)}</label>
        <fieldset class="f"><legend>${esc(t.reqVax)}</legend><div id="hVaxRows">${vaxRows}</div><button class="btn soft small" type="button" id="hAddVax">${esc(t.addRow)}</button></fieldset>
        <fieldset class="f"><legend>${esc(t.exPolicy)}</legend><div id="hExRows">${exRows}</div><button class="btn soft small" type="button" id="hAddEx">${esc(t.addRow)}</button></fieldset>
        <button class="btn navy" type="submit" id="hSetSave">${esc(t.save)}</button><p class="msg" role="status" id="hSetMsg"></p></form></section></section>`), t.dashTitle);
    focusFromQuery(q);
    $('#hAddVax').addEventListener('click', () => $('#hVaxRows').insertAdjacentHTML('beforeend', vaxRow()));
    $('#hAddEx').addEventListener('click', () => $('#hExRows').insertAdjacentHTML('beforeend', exRow()));
    $('#hSetForm').addEventListener('click', (e) => { if (e.target.matches('[data-rm]')) e.target.closest('.h-row').remove(); });
    $('#hSetForm').addEventListener('submit', async (e) => {
      e.preventDefault(); const f = e.currentTarget;
      try {
        await rpc('health_settings_save', { p_center: c.center_id, p: { notify_family_each_dose: checked(f, 'notify'), mar_double_check: val(f, 'dc'), hq_support_allowed: checked(f, 'hq'),
          required_vaccines: [...f.querySelectorAll('[data-row="vax"]')].map((r) => ({ vaccine: r.querySelector('[name="vv"]').value, doses: Number(r.querySelector('[name="vd"]').value) })),
          exclusion_policy: [...f.querySelectorAll('[data-row="ex"]')].map((r) => ({ symptom: r.querySelector('[name="es"]').value, hours: Number(r.querySelector('[name="eh"]').value), rule: r.querySelector('[name="er"]').value || null })) } });
        msg($('#hSetMsg'), t.settingsSaved, true); live(t.settingsSaved);
      } catch (err) { msg($('#hSetMsg'), friendly(err)); }
    });
  }

  function boardHtml(board) {
    const t = T();
    const items = (board || []).map((k) => `<li data-kid="${esc(k.kid)}"><b>${esc(k.first || k.kid)} ${esc(k.last || '')}</b>${(k.plans || []).map((p) => `<div class="h-board-plan" data-plan="${esc(p.id)}">
        <span>${esc(t.pKinds[p.kind] || p.kind)}: <b translate="no">${esc(p.title)}</b>${p.emergency_med_on_site ? ` ${chip(t.medOnSite, 'gold')}` : ''}</span>
        ${p.warning_signs ? `<span class="small"><b>${esc(t.warning)}:</b> <span translate="no">${esc(p.warning_signs)}</span></span>` : ''}
        <span class="h-steps"><b>${esc(t.steps)}:</b> <span translate="no">${esc(p.emergency_steps)}</span></span></div>`).join('')}</li>`).join('');
    return `<section class="card" id="hBoard" aria-labelledby="hBoardH"><h3 id="hBoardH">${esc(t.board)}</h3><p class="small muted">${esc(t.staffLead)}</p>${items ? `<ul class="plain h-board">${items}</ul>` : `<p class="small muted">${esc(t.noPlans)}</p>`}</section>`;
  }

  // ---- staff (not the director): the emergency plans; the MAR for trained staff --------------------------------------------------
  async function viewStaff(c, shell, q) {
    const t = T();
    let board;
    try { board = await rpc('health_emergency_board', { p_center: c.center_id }); } catch (e) { return fail(c, shell, t.title, e); }
    page(shell(`<section id="hStaff" class="h-view"><div class="card"><h2>${esc(t.title)}</h2><p class="cta-row"><a class="btn gold" href="/c/${esc(c.slug)}/health?view=mar" data-nav id="hOpenMar">${esc(t.openMar)}</a></p></div>
      ${boardHtml(board)}</section>`), t.title);
    focusFromQuery(q);
  }

  // ---- the family: their children ---------------------------------------------------------------------------------------------
  async function viewFamily(c, shell, q) {
    const t = T();
    let o;
    try { o = await rpc('health_family_overview', { p_center: c.center_id }); } catch (e) { return fail(c, shell, t.title, e); }
    const kids = (o.children || []).map((k) => `<article class="card h-fam-kid" data-kid="${esc(k.kid)}"><h3>${esc(k.first || '')} ${esc(k.last || '')}</h3>
      ${(k.open || []).length ? `<ul class="plain h-items">${k.open.map((i) => { const x = itemText(i, lang(), day); return `<li data-item="${esc(i.item)}">${chip(x.state, x.tone)} ${esc(x.label)}${x.detail ? `<span class="small muted"> · ${esc(x.detail)}</span>` : ''}</li>`; }).join('')}</ul>` : ''}
      <p class="small">${Number(k.to_sign) > 0 ? chip(t.toSign(Number(k.to_sign)), 'warn') : ''} ${esc(t.activeMeds(Number(k.active_meds)))} · ${esc(t.dosesWeek(Number(k.doses_7d)))}</p>
      <p class="small">${esc(t.sharing)}: ${esc(t.consentStates[k.consent] || k.consent)} · <a href="/c/${esc(c.slug)}/privacy?kid=${encodeURIComponent(k.kid)}" data-nav>${esc(t.manageConsent)}</a></p>
      ${k.transfer ? (k.transfer.health_included ? `<p class="small">${chip(t.transferDone, 'ok')}</p>` : `<form class="h-form h-transfer" data-transfer="${esc(k.transfer.id)}" novalidate>
        <h4>${esc(t.transferTitle)}</h4><p class="small" translate="no">${esc(o.transfer_statement || '')}</p>
        <label class="f"><span>${esc(t.typeName)}</span><input class="i" name="name" autocomplete="name"></label>
        <button class="btn soft" type="submit">${esc(t.transferSend)}</button><p class="msg" role="status"></p></form>`) : ''}
      <p class="cta-row"><a class="btn gold" href="/c/${esc(c.slug)}/health?kid=${encodeURIComponent(k.kid)}" data-nav>${esc(t.openChild)}</a></p></article>`).join('');
    page(shell(`<section id="hFam" class="h-view"><div class="card"><h2>${esc(t.title)}</h2><p class="small muted">${esc(t.famLead)}</p>${o.licensed ? '' : `<p class="msg info">${esc(t.noLicense)}</p>`}</div>
      ${kids || `<p class="card empty">${esc(t.noKids)}</p>`}</section>`), t.title);
    focusFromQuery(q);
    $$('form[data-transfer]').forEach((f) => f.addEventListener('submit', async (e) => {
      e.preventDefault();
      try { await rpc('child_transfer_include_health', { p_center: c.center_id, p_id: f.dataset.transfer, p_signed_name: val(f, 'name'), p_lang: lang() }); live(t.transferDone); await viewFamily(c, shell, q); }
      catch (err) { msg(f.querySelector('.msg'), friendly(err)); }
    }));
  }

  return { viewHealth, viewChild, viewMar, viewDashboard, viewFamily, viewStaff };
}
