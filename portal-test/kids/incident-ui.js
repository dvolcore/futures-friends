// /c/<slug>/incident?id=<incident id>: one incident report, where the incident notification opens (hub/NOTIFICATIONS.md).
//   family   the report about their own child (row-level security: incident_reports_select lets a guardian read it) and the
//            acknowledgement: type your name -> incident_acknowledge (migration 20261009200000_director_compliance.sql). Once.
//   staff    the same report read only, with whether and when the family acknowledged it.
// Not found, or not this person's child: a clear message on this page (never a silent jump to the home page).
// English + Spanish (DRAFT) for families; staff views are English.

const W = {
  en: { title: 'Incident report', when: 'When', kind: 'What kind', injury: 'Injury', critical: 'Critical incident', what: 'What happened',
    aid: 'First aid given', staff: 'Staff present', told: 'The center told you', ack: 'Acknowledge', ackLead: 'Type your name to say you have read this report.',
    name: 'Your name', ackBtn: 'I have read it', acked: (n, d) => `Acknowledged by ${n} on ${d}.`, notAcked: 'The family has not acknowledged it yet.',
    need: 'Type your name first.', saved: 'Thank you. The center can see that you read it.', missing: 'This incident report is not available: it is not about your child, or it is no longer kept.',
    back: 'Back' },
  es: { title: 'Reporte de incidente', when: 'Cuándo', kind: 'Tipo', injury: 'Lesión', critical: 'Incidente crítico', what: 'Qué pasó',
    aid: 'Primeros auxilios', staff: 'Personal presente', told: 'El centro le avisó', ack: 'Confirmar', ackLead: 'Escriba su nombre para confirmar que leyó este reporte.',
    name: 'Su nombre', ackBtn: 'Lo leí', acked: (n, d) => `Confirmado por ${n} el ${d}.`, notAcked: 'La familia todavía no lo ha confirmado.',
    need: 'Primero escriba su nombre.', saved: 'Gracias. El centro puede ver que usted lo leyó.', missing: 'Este reporte de incidente no está disponible: no es sobre su niño o niña, o ya no se guarda.',
    back: 'Volver' },
};

import { centerTz } from './center-time.js';   // times in the center's zone

export function mountIncident({ esc, $, rpc, client, page, live, friendly }) {
  async function viewIncident(c, shell, { family = false, lang = 'en' } = {}) {
    const w = W[lang === 'es' ? 'es' : 'en'];
    const loc = lang === 'es' ? 'es-US' : 'en-US';
    const when = (iso) => (iso ? new Date(iso).toLocaleString(loc, { timeZone: centerTz(), weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');
    const id = new URLSearchParams(location.search).get('id') || '';
    const opts = { english: !family };
    let r = null, err = null;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      const q = await client().from('incident_reports')
        .select(`id, kind, critical_type, occurred_at, what_happened, first_aid,${family ? '' : ' staff_present,'} parent_notified_at, family_ack_at, family_ack_name`)
        .eq('center_id', c.center_id).eq('id', id).maybeSingle();
      if (q.error) err = q.error; else r = q.data;
    }
    if (!r) {
      return page(shell(`<div class="card" id="incidentMissing"><h2>${esc(w.title)}</h2><p class="msg warn deep-miss" role="alert">${esc(w.missing)}</p>
        ${err ? `<p class="small muted">${esc(friendly(err))}</p>` : ''}</div>`), w.title, opts);
    }
    const ackLine = r.family_ack_at ? `<p class="msg ok" id="incAcked">${esc(w.acked(r.family_ack_name || '', when(r.family_ack_at)))}</p>` : '';
    page(shell(`<article class="card deep-hl" id="incident" data-deep="1" tabindex="-1"><h2>${esc(w.title)}</h2>
      <dl class="inc-detail">
        <dt>${esc(w.when)}</dt><dd>${esc(when(r.occurred_at))}</dd>
        <dt>${esc(w.kind)}</dt><dd>${esc(r.kind === 'critical' ? w.critical : w.injury)}</dd>
        <dt>${esc(w.what)}</dt><dd>${esc(r.what_happened)}</dd>
        ${r.first_aid ? `<dt>${esc(w.aid)}</dt><dd>${esc(r.first_aid)}</dd>` : ''}
        ${!family && r.staff_present ? `<dt>${esc(w.staff)}</dt><dd>${esc(r.staff_present)}</dd>` : ''}
        ${r.parent_notified_at ? `<dt>${esc(w.told)}</dt><dd>${esc(when(r.parent_notified_at))}</dd>` : ''}
      </dl>
      ${ackLine}
      ${family && !r.family_ack_at ? `<form id="incAckForm" novalidate><h3>${esc(w.ack)}</h3><p class="small muted">${esc(w.ackLead)}</p>
        <label class="f"><span>${esc(w.name)}</span><input class="i" id="incName" maxlength="120" autocomplete="name" required></label>
        <p class="msg" id="incMsg" role="status"></p><button class="btn navy" type="submit">${esc(w.ackBtn)}</button></form>` : ''}
      ${!family && !r.family_ack_at ? `<p class="small muted" id="incNotAcked">${esc(w.notAcked)}</p>` : ''}
    </article>`), w.title, opts);
    const card = $('#incident'); card.scrollIntoView({ block: 'start' }); card.focus({ preventScroll: true });
    const f = $('#incAckForm');
    if (f) f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const m = $('#incMsg'), name = $('#incName').value.trim();
      if (!name) { m.className = 'msg bad'; m.textContent = w.need; $('#incName').focus(); return; }
      try {
        await rpc('incident_acknowledge', { p_incident: r.id, p_name: name });
        live(w.saved);
        await viewIncident(c, shell, { family, lang });
      } catch (err2) { m.className = 'msg bad'; m.textContent = friendly(err2); }
    });
  }
  return { viewIncident };
}
