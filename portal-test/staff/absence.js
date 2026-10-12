// Absence reporting (hub/ABSENCES.md, migration 20261028200000_absence_reports.sql).
//   /c/<slug>/absence     families (English + Spanish DRAFT): report an absence, a late arrival or an early pickup for one or more of
//                         their children; their reports, with "Cancel" until the day starts. ?kid=<id> preselects a child, ?id=<report>
//                         opens one report (deep link from the parent dashboard).
//   staff screens         Today, the teacher dashboard, the roster and the check-in board show "Absent — reported by family"
//                         (absenceChip / absenceListHtml below; the database marks the child, see absence_mark()).
//   director              the center's cutoff time and the symptom list families tick (absenceSettingsHtml / bindAbsenceSettings).
// Symptoms are checkboxes from the center's list only; the notes pass the health-words rule in the database (daily_report_text_ok).
// No inline styles or handlers (strict CSP). 44 px targets.

import { deepFocus, deepMiss } from './deeplink.js';

export const SYMPTOMS = {
  en: { fever: 'Fever', vomiting: 'Vomiting', diarrhea: 'Diarrhea', rash: 'Rash', cough: 'Cough', runny_nose: 'Runny nose', sore_throat: 'Sore throat',
        eye_redness: 'Red or crusty eyes', ear_pain: 'Ear pain', stomach_ache: 'Stomach ache', headache: 'Headache', unusually_tired: 'Unusually tired' },
  es: { fever: 'Fiebre', vomiting: 'Vómito', diarrhea: 'Diarrea', rash: 'Sarpullido', cough: 'Tos', runny_nose: 'Moqueo', sore_throat: 'Dolor de garganta',
        eye_redness: 'Ojos rojos o con lagañas', ear_pain: 'Dolor de oído', stomach_ache: 'Dolor de estómago', headache: 'Dolor de cabeza', unusually_tired: 'Más cansancio de lo normal' },
};

const W = {
  en: {
    title: 'Report an absence', lead: 'Tell the center your child will be away, arrive late or be picked up early. The room\'s teachers see it right away.',
    who: 'Which children?', what: 'What is it?', kinds: { absent: 'Absent', late: 'Late arrival', early: 'Early pickup' },
    from: 'First day', to: 'Last day', day: 'Day', atLate: 'Arriving at about', atEarly: 'Picking up at',
    why: 'Reason', reasons: { sick: 'Sick', appointment: 'Appointment', vacation: 'Vacation', other: 'Other' },
    symptoms: 'Symptoms (from the center\'s illness policy)', returnOn: 'Ready to come back on (optional)', returnNote: 'Return-to-care note (optional)',
    note: 'A note for the teachers (optional)', noteHint: 'No health details here: tick the symptoms instead.',
    send: 'Send to the center', sending: 'Sending…', sent: 'Sent. The teachers can see it now.', sentLate: (t) => `Sent. It arrived after today's ${t} cutoff, so please also call the center.`,
    cutoff: (t) => `Please report an absence for today before ${t}.`, needKid: 'Choose at least one child.', needDate: 'Choose the day.', needTime: 'Choose the time.',
    mine: 'Your reports', none: 'Nothing reported yet.', cancel: 'Cancel this report', cancelled: 'Cancelled', cancelDone: 'Cancelled. The teachers were told.',
    afterCutoff: 'After the cutoff', started: 'The day has started: message or call the center to change it.', back: 'Back to Home',
    days: (n) => (n === 1 ? '1 school day' : `${n} school days`), noKids: 'No child is linked to your account yet.',
    summary: { absent: (f, d) => `${f}: absent ${d}`, late: (f, d, t) => `${f}: arriving late ${d}, about ${t}`, early: (f, d, t) => `${f}: picked up early ${d} at ${t}` },
    range: (a, b) => `${a} to ${b}`, returning: (d) => `Coming back ${d}`,
  },
  es: {
    title: 'Avisar una ausencia', lead: 'Avísele al centro que su hijo o hija faltará, llegará tarde o lo recogerán temprano. Las maestras del salón lo ven enseguida.',
    who: '¿Qué niños?', what: '¿Qué pasa?', kinds: { absent: 'Ausencia', late: 'Llegada tarde', early: 'Salida temprano' },
    from: 'Primer día', to: 'Último día', day: 'Día', atLate: 'Llegará aprox. a las', atEarly: 'Lo recogerán a las',
    why: 'Motivo', reasons: { sick: 'Enfermedad', appointment: 'Cita', vacation: 'Vacaciones', other: 'Otro' },
    symptoms: 'Síntomas (según la política de enfermedad del centro)', returnOn: 'Listo para volver el (opcional)', returnNote: 'Nota para el regreso (opcional)',
    note: 'Una nota para las maestras (opcional)', noteHint: 'Aquí no escriba detalles de salud: marque los síntomas.',
    send: 'Enviar al centro', sending: 'Enviando…', sent: 'Enviado. Las maestras ya pueden verlo.', sentLate: (t) => `Enviado. Llegó después de la hora límite de hoy (${t}); por favor llame también al centro.`,
    cutoff: (t) => `Por favor avise una ausencia de hoy antes de las ${t}.`, needKid: 'Elija al menos un niño o niña.', needDate: 'Elija el día.', needTime: 'Elija la hora.',
    mine: 'Sus avisos', none: 'Todavía no ha avisado nada.', cancel: 'Cancelar este aviso', cancelled: 'Cancelado', cancelDone: 'Cancelado. Se avisó a las maestras.',
    afterCutoff: 'Después de la hora límite', started: 'El día ya empezó: escriba o llame al centro para cambiarlo.', back: 'Volver a Inicio',
    days: (n) => (n === 1 ? '1 día de clases' : `${n} días de clases`), noKids: 'Todavía no hay un niño o niña en su cuenta.',
    summary: { absent: (f, d) => `${f}: ausente ${d}`, late: (f, d, t) => `${f}: llega tarde ${d}, aprox. a las ${t}`, early: (f, d, t) => `${f}: sale temprano ${d} a las ${t}` },
    range: (a, b) => `${a} al ${b}`, returning: (d) => `Vuelve el ${d}`,
  },
};
const L_ = (lang) => W[lang === 'es' ? 'es' : 'en'];

// ---- pure helpers (tests/absences-unit.test.mjs) ---------------------------------------------------------------------------------
export function dayText(iso, lang = 'en', opts = { weekday: 'short', month: 'short', day: 'numeric' }) {
  if (!iso) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US', { ...opts, timeZone: 'UTC' });
}
export function timeText(hhmm, lang = 'en') {
  const m = /^(\d{2}):(\d{2})/.exec(String(hhmm || ''));
  if (!m) return '';
  return new Date(Date.UTC(2000, 0, 1, Number(m[1]), Number(m[2]))).toLocaleTimeString(lang === 'es' ? 'es-US' : 'en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' });
}
export function rangeText(from, to, lang = 'en') {
  return !to || to === from ? dayText(from, lang) : L_(lang).range(dayText(from, lang), dayText(to, lang));
}
// One line a family reads: "Maya: absent Mon, Oct 12 to Wed, Oct 14"
export function absenceSummary(r, lang = 'en') {
  const L = L_(lang);
  const f = r.first || r.kid || '';
  if (r.kind === 'late') return L.summary.late(f, dayText(r.date_from, lang), timeText(r.at_time, lang));
  if (r.kind === 'early') return L.summary.early(f, dayText(r.date_from, lang), timeText(r.at_time, lang));
  return L.summary.absent(f, rangeText(r.date_from, r.date_to, lang));
}
// The form's values -> the database call's arguments, or {error} with the words to show.
export function absenceArgs(v, lang = 'en') {
  const L = L_(lang);
  const kids = [...new Set((v.kids || []).filter(Boolean))];
  if (!kids.length) return { error: L.needKid };
  const kind = ['absent', 'late', 'early'].includes(v.kind) ? v.kind : 'absent';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.from || '')) return { error: L.needDate };
  if (kind !== 'absent' && !/^\d{2}:\d{2}$/.test(v.at || '')) return { error: L.needTime };
  const reason = ['sick', 'appointment', 'vacation', 'other'].includes(v.reason) ? v.reason : 'other';
  const sick = reason === 'sick';
  return {
    p_kids: kids, p_kind: kind, p_from: v.from, p_to: kind === 'absent' && /^\d{4}-\d{2}-\d{2}$/.test(v.to || '') ? v.to : v.from,
    p_reason: reason, p_symptoms: sick ? [...new Set(v.symptoms || [])] : [], p_note: (v.note || '').trim() || null,
    p_at: kind === 'absent' ? null : v.at, p_return_on: sick && v.returnOn ? v.returnOn : null, p_return_note: sick ? ((v.returnNote || '').trim() || null) : null,
  };
}

// ---- staff: the chip on a child and the list of reports (English source text; the catalog turns it into Spanish on screen) -----------
const STAFF_REASON = { sick: 'Sick', appointment: 'Appointment', vacation: 'Vacation', other: 'Other' };
export function absenceChip(esc, a) {
  if (!a) return '';
  const t = a.kind === 'late' ? `Late arrival ${esc(timeText(a.at_time))}` : a.kind === 'early' ? `Early pickup ${esc(timeText(a.at_time))}` : 'Absent — reported by family';
  return `<span class="chip ${a.kind === 'absent' ? 'warn' : 'gold'} abs-chip" data-absence="${esc(a.id)}">${t}</span>`;
}
export function absenceListHtml(esc, rows, { slug, linkOf, card = true, title = 'Reported by families', empty = 'No absences, late arrivals or early pickups reported for the next week.' } = {}) {
  const sp = (t) => `<span>${esc(t)}</span>`;   // one phrase per element: the staff catalog translates each on screen
  const items = (rows || []).map((r) => {
    const sym = (r.symptoms || []).map((x) => sp(SYMPTOMS.en[x] || x)).join(', ');
    const what = r.kind === 'late' ? `Late arrival, about ${timeText(r.at_time)}` : r.kind === 'early' ? `Early pickup at ${timeText(r.at_time)}` : 'Absent';
    const href = linkOf ? linkOf(r) : `/c/${slug}/today?${new URLSearchParams({ ...(r.room ? { room: r.room } : {}), kid: r.kid, absence: r.id })}`;
    const meta = [sp('Reported by family'), `${sp(STAFF_REASON[r.reason] || r.reason)}${sym ? `: ${sym}` : ''}`, r.return_on ? sp(`Back ${dayText(r.return_on)}`) : '', r.after_cutoff ? sp('After the cutoff') : ''].filter(Boolean);
    return `<li class="abs-row" id="abs-${esc(r.id)}" data-absence="${esc(r.id)}"><a href="${esc(href)}" data-nav><b>${esc(r.first)} ${esc(r.last_initial || '')}</b>
      <span>${[what, rangeText(r.date_from, r.date_to), r.room_name].filter(Boolean).map(sp).join(' · ')}</span></a>
      <span class="small muted">${meta.join(' · ')}</span>
      ${r.note ? `<span class="small" translate="no">${esc(r.note)}</span>` : ''}${r.return_note ? `<span class="small" translate="no">${esc(r.return_note)}</span>` : ''}</li>`;
  }).join('');
  const body = `<h3 id="absListH">${esc(title)}</h3>${items ? `<ul class="abs-rows">${items}</ul>` : `<p class="small muted">${esc(empty)}</p>`}`;
  return card ? `<section class="card abs-list" id="absenceList" aria-labelledby="absListH">${body}</section>` : `<div class="abs-list" id="absenceList">${body}</div>`;
}

// ---- director: the cutoff time and the symptom list ----------------------------------------------------------------------------
export function absenceSettingsHtml(esc, s) {
  if (!s) return '';
  return `<details class="abs-settings" id="absSettings"><summary>Absence reporting: cutoff time and symptoms</summary>
    <form id="absSettingsForm" class="abs-form" novalidate>
      <label class="f"><span>Report today's absence before</span><input class="i" type="time" id="absCutoff" value="${esc(s.cutoff)}" required></label>
      <fieldset class="f"><legend>Symptoms families can tick (your illness policy)</legend><div class="abs-checks">
        ${(s.catalog || []).map((k) => `<label class="check"><input type="checkbox" name="absSym" value="${esc(k)}"${(s.symptoms || []).includes(k) ? ' checked' : ''}> ${esc(SYMPTOMS.en[k] || k)}</label>`).join('')}</div></fieldset>
      <button class="btn navy small" type="submit">Save</button><p class="small msg" id="absSettingsMsg" role="status"></p></form></details>`;
}
export function bindAbsenceSettings({ $, rpc, friendly, live, c }) {
  const f = $('#absSettingsForm'); if (!f) return;
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const m = $('#absSettingsMsg');
    try {
      await rpc('absence_settings_save', { p_center: c.center_id, p_cutoff: $('#absCutoff').value, p_symptoms: [...f.querySelectorAll('input[name="absSym"]:checked')].map((x) => x.value) });
      m.className = 'small msg ok'; m.textContent = 'Saved.'; live('Saved.');
    } catch (err) { m.className = 'small msg bad'; m.textContent = friendly(err); }
  });
}

// ---- the family page ------------------------------------------------------------------------------------------------------------
export function mountAbsence({ esc, $, rpc, page, live, friendly, getLang }) {
  async function viewFamily(c, shell) {
    const lang = getLang() === 'es' ? 'es' : 'en';
    const L = L_(lang);
    const q = new URLSearchParams(location.search);
    let data, set;
    try { [data, set] = await Promise.all([rpc('absence_family_list', { p_center: c.center_id }), rpc('absence_settings_get', { p_center: c.center_id })]); }
    catch (e) { page(shell(`<div class="card" id="absenceView"><h2>${esc(L.title)}</h2><p class="msg bad" role="alert">${esc(friendly(e))}</p></div>`), L.title); return; }
    const kids = data.kids || [];
    const pre = q.get('kid');
    const today = data.today;
    const radios = (name, opts, cur) => opts.map(([v, l]) => `<label class="choice abs-choice"><input type="radio" name="${name}" value="${esc(v)}"${v === cur ? ' checked' : ''}><span><b>${esc(l)}</b></span></label>`).join('');
    const form = kids.length ? `<form class="card abs-form" id="absForm" novalidate>
      <p class="small muted">${esc(L.cutoff(timeText(set.cutoff, lang)))}</p>
      <fieldset class="f"><legend>${esc(L.who)}</legend><div class="abs-checks">${kids.map((k) => `<label class="check abs-kid"><input type="checkbox" name="absKid" value="${esc(k.id)}"${kids.length === 1 || k.id === pre ? ' checked' : ''}> ${esc(k.first)}</label>`).join('')}</div></fieldset>
      <fieldset class="f"><legend>${esc(L.what)}</legend><div class="choices three">${radios('absKind', Object.entries(L.kinds), 'absent')}</div></fieldset>
      <div class="abs-dates"><label class="f"><span id="absFromL">${esc(L.from)}</span><input class="i" type="date" id="absFrom" min="${esc(today)}" value="${esc(today)}" required></label>
        <label class="f" id="absToWrap"><span>${esc(L.to)}</span><input class="i" type="date" id="absTo" min="${esc(today)}" value="${esc(today)}"></label>
        <label class="f" id="absAtWrap" hidden><span id="absAtL">${esc(L.atLate)}</span><input class="i" type="time" id="absAt"></label></div>
      <fieldset class="f"><legend>${esc(L.why)}</legend><div class="choices four">${radios('absReason', Object.entries(L.reasons), 'other')}</div></fieldset>
      <div id="absSick" hidden><fieldset class="f"><legend>${esc(L.symptoms)}</legend><div class="abs-checks">${(set.symptoms || []).map((s) => `<label class="check"><input type="checkbox" name="absSym" value="${esc(s)}"> ${esc((SYMPTOMS[lang] || SYMPTOMS.en)[s] || s)}</label>`).join('')}</div></fieldset>
        <label class="f"><span>${esc(L.returnOn)}</span><input class="i" type="date" id="absReturn" min="${esc(today)}"></label>
        <label class="f"><span>${esc(L.returnNote)}</span><input class="i" id="absReturnNote" maxlength="300" autocomplete="off"></label></div>
      <label class="f"><span>${esc(L.note)} <span class="hint">${esc(L.noteHint)}</span></span><textarea class="i" id="absNote" maxlength="300" rows="2"></textarea></label>
      <button class="btn gold" type="submit" id="absSend">${esc(L.send)}</button><p class="msg" id="absMsg" role="status"></p></form>`
      : `<p class="empty">${esc(L.noKids)}</p>`;
    const list = (data.reports || []).map((r) => `<li class="abs-mine${r.cancelled ? ' abs-cancelled' : ''}" id="abs-${esc(r.id)}" data-absence="${esc(r.id)}">
        <span><b>${esc(absenceSummary(r, lang))}</b><span class="small muted">${esc(L.reasons[r.reason] || r.reason)}${(r.symptoms || []).length ? `: ${esc(r.symptoms.map((s) => (SYMPTOMS[lang] || SYMPTOMS.en)[s] || s).join(', '))}` : ''}${r.kind === 'absent' && r.open_days ? ` · ${esc(L.days(r.open_days))}` : ''}${r.return_on ? ` · ${esc(L.returning(dayText(r.return_on, lang)))}` : ''}</span>
          ${r.note ? `<span class="small">${esc(r.note)}</span>` : ''}</span>
        <span class="abs-acts">${r.cancelled ? `<span class="chip">${esc(L.cancelled)}</span>` : ''}${r.after_cutoff ? `<span class="chip warn">${esc(L.afterCutoff)}</span>` : ''}
          ${r.can_cancel ? `<button type="button" class="btn soft small" data-cancel="${esc(r.id)}">${esc(L.cancel)}</button>` : ''}</span></li>`).join('');
    page(shell(`<section id="absenceView" class="abs"><div class="card"><h2>${esc(L.title)}</h2><p class="small muted">${esc(L.lead)}</p></div>
      ${form}
      <section class="card" id="absMine" aria-labelledby="absMineH"><h2 id="absMineH">${esc(L.mine)}</h2>${list ? `<ul class="abs-rows">${list}</ul>` : `<p class="small muted">${esc(L.none)}</p>`}</section>
      <p><a class="btn link" href="/c/${esc(c.slug)}/home" data-nav>${esc(L.back)}</a></p></section>`), L.title);

    const want = q.get('id');
    if (want) { const el = document.getElementById(`abs-${want}`); if (el) deepFocus(el); else deepMiss('any', lang); }

    const f = $('#absForm');
    if (f) {
      const sync = () => {
        const kind = f.querySelector('input[name="absKind"]:checked')?.value || 'absent';
        const sick = f.querySelector('input[name="absReason"]:checked')?.value === 'sick';
        $('#absToWrap').hidden = kind !== 'absent'; $('#absAtWrap').hidden = kind === 'absent';
        $('#absFromL').textContent = kind === 'absent' ? L.from : L.day;
        $('#absAtL').textContent = kind === 'early' ? L.atEarly : L.atLate;
        $('#absSick').hidden = !sick;
        if ($('#absTo').value < $('#absFrom').value) $('#absTo').value = $('#absFrom').value;
        $('#absTo').min = $('#absFrom').value || today;
      };
      f.addEventListener('change', sync); sync();
      f.addEventListener('submit', async (e) => {
        e.preventDefault();
        const m = $('#absMsg');
        const args = absenceArgs({ kids: [...f.querySelectorAll('input[name="absKid"]:checked')].map((x) => x.value), kind: f.querySelector('input[name="absKind"]:checked')?.value,
          from: $('#absFrom').value, to: $('#absTo').value, at: $('#absAt').value, reason: f.querySelector('input[name="absReason"]:checked')?.value,
          symptoms: [...f.querySelectorAll('input[name="absSym"]:checked')].map((x) => x.value), note: $('#absNote').value, returnOn: $('#absReturn').value, returnNote: $('#absReturnNote').value }, lang);
        if (args.error) { m.className = 'msg bad'; m.textContent = args.error; return; }
        const btn = $('#absSend'); btn.disabled = true; btn.textContent = L.sending;
        try {
          const r = await rpc('absence_report', { p_center: c.center_id, ...args, p_client_ref: globalThis.crypto?.randomUUID ? crypto.randomUUID() : null });
          const text = r.after_cutoff ? L.sentLate(timeText(r.cutoff, lang)) : L.sent;
          live(text);
          await viewFamily(c, shell);
          const m2 = $('#absMsg'); if (m2) { m2.className = 'msg ok'; m2.textContent = text; }
        } catch (err) { m.className = 'msg bad'; m.textContent = friendly(err); btn.disabled = false; btn.textContent = L.send; }
      });
    }
    for (const b of document.querySelectorAll('#absMine [data-cancel]')) {
      b.addEventListener('click', async () => {
        b.disabled = true;
        try { await rpc('absence_cancel', { p_center: c.center_id, p_id: b.dataset.cancel }); live(L.cancelDone); await viewFamily(c, shell); }
        catch (err) { b.disabled = false; const m = $('#absMsg'); if (m) { m.className = 'msg bad'; m.textContent = friendly(err); } else live(friendly(err)); }
      });
    }
  }
  return { viewFamily };
}
