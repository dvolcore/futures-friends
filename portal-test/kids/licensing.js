// Licensing: the state rules, staff training hours by state, inspector-ready records, CACFP and subsidy attendance
// (hub/STATE_RULES.md, INSPECTOR_EXPORTS.md, CACFP.md, SUBSIDY_EXPORTS.md; migrations 20261029100000 and 20261029110000).
//
//   /c/<slug>/licensing                 directors: the center against its state rule pack (every rule with its citation, review state and
//                                       what the Hub shows for it), the live ratios and the retention minimums
//   ?tab=training[&staff=<user>]        directors: required vs completed clock hours per staff member per state rule and cycle
//   ?tab=inspector                      directors: the inspector packet for a date range (print / save as PDF) and a CSV per section
//   ?tab=cacfp                          directors: eligibility categories, rates (entered by the director, never built in), daily counts,
//                                       the monthly claim and the production record
//   ?tab=subsidy                        directors: subsidy authorizations and the attendance export (generic, Missouri register)
//   ?tab=mine[&rule=<key>]              every staff member: their own training hours (where the 60-day alert opens)
// English + Spanish (Spanish is a DRAFT). Plain ES module, no build step; the strict CSP forbids inline styles and inline code.

import { CATEGORIES, MEAL_TYPES, PROGRAMS, SECTIONS, STATUS_TONE, addDays, centsOf, dollars, fileName, groupRules, hoursText, monthStart, rangeOk } from './licensing-core.js';
import { cssValue, deepFocus, deepMiss } from './deeplink.js';

export const W = {
  en: {
    title: 'Licensing', tabs: { rules: 'State rules', training: 'Training hours', inspector: 'Inspector records', cacfp: 'CACFP', subsidy: 'Subsidy', mine: 'My training hours' },
    status: { ok: 'OK', attention: 'Needs attention', missing: 'Missing', outside_hub: 'Kept outside the Hub', reference: 'Reference', manual: 'Log it on the compliance desk',
      met: 'Met', on_track: 'On track', at_risk: 'Due within 60 days', short: 'Short', unknown: 'Dates missing' },
    review: { draft: 'Draft: not reviewed yet', approved: 'Reviewed', changes_requested: 'Changes requested' },
    cat: { ratio: 'Staff-child ratios by age', group_size: 'Group sizes', staff_qualification: 'Staff qualifications', training_hours: 'Training hours',
      background_check: 'Background checks', required_record: 'Required records', record_retention: 'How long records are kept', meal_pattern: 'Meal pattern (references)' },
    noProfile: 'Set the center\'s state and license type in Center settings first.',
    noPack: (s) => `There is no rule pack for ${s} yet. Nothing is shown until official sources are researched and a reviewer signs them off.`,
    needs: 'Still needed', pack: (n, v) => `${n} rules, version ${v}`, agency: 'Licensing agency', effective: (d) => `In effect from ${d}`,
    packDraft: 'Every rule is a draft until the licensing reviewer signs it off. Confirm anything marked "needs confirmation" with your licensing consultant.',
    packSigned: (who, d) => `Signed off by ${who} on ${d}.`, needsConf: 'Needs confirmation', sources: 'Official source', rule: 'Rule', state: 'Status',
    shows: 'What the Hub shows', liveRatios: 'Ratios right now', room: 'Room', present: 'Children here', needStaff: 'Staff needed', checks30: (n, bad) => `${n} ratio checks in the last 30 days, ${bad} not OK.`,
    missingPeriods: (p) => `No drill logged for ${p}.`, notYet: 'None logged yet this period.', open12: (n) => `${n} not completed in the last 12 months.`,
    signIn: (a, b) => `${a} day(s) marked here without a sign-in and ${b} sign-in(s) without a sign-out in the last 30 days.`, people: (l) => `Missing for: ${l}.`,
    notCleared: (l) => `Not cleared: ${l}.`, noHire: (l) => `No hire date on file: ${l}.`, pending: (n) => `${n} outside certificate(s) waiting for review.`,
    obl: (o) => `Training engine: ${o}.`, oblWord: { complete: 'complete', upcoming: 'upcoming', due_soon: 'due soon', overdue: 'overdue', unknown_missing_data: 'dates missing' },
    hours: (r) => `${r.met || 0} met, ${r.at_risk || 0} due within 60 days, ${r.short || 0} short.`,
    keep: (m, basis, hub) => `At least ${m} months${basis === 'child_left' ? ' after the child leaves' : ''}. The Hub keeps: ${hub}.`,
    keepOk: 'The Hub keeps these long enough.', keepBad: 'The Hub\'s plan is shorter than the state minimum: the purge stops for these records.',
    staff: 'Staff member', cycle: 'Cycle', required: 'Required', completed: 'Completed', shortfall: 'Still needed', ends: 'Cycle ends', noStaff: 'No staff rows: add staff profiles with a hire date and job role.',
    cycles: { license_year: 'Licensure year', calendar_year: 'Calendar year', contract_year: 'Subsidy contract year' },
    alertNote: 'Staff and directors are told 60 days before a cycle ends short (once per cycle).',
    from: 'From', to: 'To', open: 'Open the packet', print: 'Print or save as PDF', csv: 'CSV', range: 'Choose a date range of up to 93 days.',
    sec: { attendance: 'Sign-in and sign-out', absences: 'Absences', ratios: 'Ratio checks', staff: 'Staff files and credentials', training: 'Training',
      drills: 'Emergency drills', incidents: 'Incidents and injuries', medication: 'Medication logs', meals: 'Meals (CACFP counts)' },
    packetHead: (n, f, t) => `${n}: licensing records ${f} to ${t}`, license: 'License', generated: 'Generated', none: 'Nothing in this period.',
    healthItems: (o, d, due) => `Health records: ${o} overdue, ${d} due${due ? `; immunization summary report due ${due}` : ''}.`,
    medLog: (n, m) => `Medication record: ${m} doses recorded in 30 days, ${n} scheduled doses with nothing recorded.`,
    medCols: { at: 'When', child: 'Child', med: 'Medication', dose: 'Dose', outcome: 'Outcome', qty: 'Quantity', given: 'Given by', checked: 'Checked by', permit: 'Permission' },
    outcomes: { given: 'Given', refused: 'Refused', missed: 'Missed', held: 'Held' },
    col: { date: 'Date', child: 'Child', in: 'In', out: 'Out', by: 'Dropped off by', pick: 'Picked up by', status: 'Status', at: 'When', staff: 'Staff', children: 'Children',
      ok: 'OK', role: 'Role', hire: 'Hired', background: 'Background check', creds: 'Credentials', entries: 'Hours this period', type: 'Type', evac: 'Evacuation (s)',
      kind: 'Kind', what: 'What happened', parent: 'Parent told', stateRep: 'State report', attendance: 'Attendance', meal: 'Meal', total: 'Total' },
    yes: 'Yes', no: 'No', excused: 'Absent (family reported)', absent: 'Absent',
    exportNote: 'Directors only. Every packet and file is recorded in the audit log. Children appear by name only where licensing asks for it (sign-in sheets); incidents show initials.',
    elig: 'Eligibility categories', eligNote: 'The category only. The family\'s income form stays in your files. Children without a category are counted but never claimed.',
    cat3: { free: 'Free', reduced: 'Reduced', paid: 'Paid', not_recorded: 'Not recorded' }, since: 'From', documented: 'Form dated', save: 'Save', saved: 'Saved.',
    rates: (y) => `Reimbursement rates, program year ${y}-${String((y + 1) % 100).padStart(2, '0')}`, ratesNote: 'Enter the rates from the current USDA notice (dollars per meal). The Hub has no built-in rates; the claim shows amounts only after you enter them.',
    rateSource: 'Where these rates come from (notice and date)', meal: { breakfast: 'Breakfast', am_snack: 'AM snack', lunch: 'Lunch', pm_snack: 'PM snack', supper: 'Supper' },
    daily: 'Daily meal counts', claim: 'Monthly claim', month: 'Month', show: 'Show', operating: (n, a) => `${n} operating day(s); average daily attendance ${a}.`,
    meals: 'Meals', rate: 'Rate', amount: 'Amount', totalAmt: 'Total', countsOnly: 'Counts only: no rates entered for this program year.', ratesIncomplete: 'Some claimable lines have no rate yet: no total until every rate is entered.',
    production: 'Production record', day: 'Day', menu: 'Menu', a12: 'Ages 1-2', a35: 'Ages 3-5', a6: '6 and older (no menu amount)', noBday: 'No birthday on file',
    servings: 'Servings', planned: 'Planned total', noMenu: 'No menu day was recorded with these meals.', item: 'Item', comp: 'Component',
    auths: 'Subsidy authorizations', program: { KS_CCA: 'Kansas Child Care Assistance', MO_CCS: 'Missouri Child Care Subsidy', other: 'Other program' },
    authId: 'Authorization number', agency: 'Agency (optional)', starts: 'Starts', endsOpt: 'Ends (optional)', add: 'Add authorization', childL: 'Child',
    subExport: 'Attendance export', format: 'Format', fmt: { generic: 'Generic (every program)', mo_register: 'Missouri time and attendance register (5 CSR 25-200.130(3))' },
    allPrograms: 'Every program', download: 'Download CSV', subNote: 'Excused = the family reported the absence; unexcused = staff marked the child absent with no family report. No absence reasons or health details are in the file.',
    noAuths: 'No authorizations yet.', downloaded: (f) => `Downloaded ${f}.`, staffMine: 'Your clock hours for each state rule that applies to you.',
  },
  es: {
    title: 'Licencia', tabs: { rules: 'Reglas estatales', training: 'Horas de capacitación', inspector: 'Registros para inspección', cacfp: 'CACFP', subsidy: 'Subsidio', mine: 'Mis horas de capacitación' },
    status: { ok: 'Bien', attention: 'Requiere atención', missing: 'Falta', outside_hub: 'Se guarda fuera del Hub', reference: 'Referencia', manual: 'Regístrelo en el escritorio de cumplimiento',
      met: 'Cumplido', on_track: 'Al día', at_risk: 'Vence en 60 días', short: 'Incompleto', unknown: 'Faltan fechas' },
    review: { draft: 'Borrador: sin revisar', approved: 'Revisada', changes_requested: 'Cambios solicitados' },
    cat: { ratio: 'Proporción personal-niños por edad', group_size: 'Tamaño de grupos', staff_qualification: 'Requisitos del personal', training_hours: 'Horas de capacitación',
      background_check: 'Verificación de antecedentes', required_record: 'Registros obligatorios', record_retention: 'Cuánto tiempo se guardan los registros', meal_pattern: 'Patrón de comidas (referencias)' },
    noProfile: 'Primero indique el estado y el tipo de licencia del centro en la configuración del centro.',
    noPack: (s) => `Todavía no hay paquete de reglas para ${s}. No se muestra nada hasta investigar las fuentes oficiales y que una revisora las apruebe.`,
    needs: 'Lo que falta', pack: (n, v) => `${n} reglas, versión ${v}`, agency: 'Agencia de licencias', effective: (d) => `Vigente desde ${d}`,
    packDraft: 'Cada regla es un borrador hasta que la revisora de licencias la apruebe. Confirme con su asesora de licencias todo lo marcado "requiere confirmación".',
    packSigned: (who, d) => `Aprobado por ${who} el ${d}.`, needsConf: 'Requiere confirmación', sources: 'Fuente oficial', rule: 'Regla', state: 'Estado',
    shows: 'Lo que muestra el Hub', liveRatios: 'Proporciones ahora', room: 'Salón', present: 'Niños presentes', needStaff: 'Personal necesario', checks30: (n, bad) => `${n} revisiones de proporción en los últimos 30 días, ${bad} con problemas.`,
    missingPeriods: (p) => `No hay simulacro registrado en ${p}.`, notYet: 'Todavía no hay registro en este período.', open12: (n) => `${n} sin completar en los últimos 12 meses.`,
    signIn: (a, b) => `${a} día(s) marcados presentes sin entrada y ${b} entrada(s) sin salida en los últimos 30 días.`, people: (l) => `Falta para: ${l}.`,
    notCleared: (l) => `Sin aprobar: ${l}.`, noHire: (l) => `Sin fecha de contratación: ${l}.`, pending: (n) => `${n} certificado(s) externo(s) esperando revisión.`,
    obl: (o) => `Motor de capacitación: ${o}.`, oblWord: { complete: 'completo', upcoming: 'próximo', due_soon: 'vence pronto', overdue: 'vencido', unknown_missing_data: 'faltan fechas' },
    hours: (r) => `${r.met || 0} cumplido(s), ${r.at_risk || 0} vencen en 60 días, ${r.short || 0} incompleto(s).`,
    keep: (m, basis, hub) => `Al menos ${m} meses${basis === 'child_left' ? ' después de que el niño se va' : ''}. El Hub guarda: ${hub}.`,
    keepOk: 'El Hub los guarda el tiempo suficiente.', keepBad: 'El plan del Hub es más corto que el mínimo del estado: la depuración se detiene para estos registros.',
    staff: 'Miembro del personal', cycle: 'Ciclo', required: 'Requeridas', completed: 'Completadas', shortfall: 'Faltan', ends: 'Fin del ciclo', noStaff: 'No hay filas: agregue perfiles del personal con fecha de contratación y puesto.',
    cycles: { license_year: 'Año de licencia', calendar_year: 'Año calendario', contract_year: 'Año del contrato de subsidio' },
    alertNote: 'El personal y la dirección reciben un aviso 60 días antes de que un ciclo termine incompleto (una vez por ciclo).',
    from: 'Desde', to: 'Hasta', open: 'Abrir el paquete', print: 'Imprimir o guardar como PDF', csv: 'CSV', range: 'Elija un período de hasta 93 días.',
    sec: { attendance: 'Entradas y salidas', absences: 'Ausencias', ratios: 'Revisiones de proporción', staff: 'Expedientes y credenciales del personal', training: 'Capacitación',
      drills: 'Simulacros de emergencia', incidents: 'Incidentes y lesiones', medication: 'Registros de medicamentos', meals: 'Comidas (conteos CACFP)' },
    packetHead: (n, f, t) => `${n}: registros de licencia del ${f} al ${t}`, license: 'Licencia', generated: 'Generado', none: 'Nada en este período.',
    healthItems: (o, d, due) => `Registros de salud: ${o} vencidos, ${d} pendientes${due ? `; informe resumen de vacunas vence el ${due}` : ''}.`,
    medLog: (n, m) => `Registro de medicamentos: ${m} dosis registradas en 30 días, ${n} dosis programadas sin registro.`,
    medCols: { at: 'Cuándo', child: 'Niño', med: 'Medicamento', dose: 'Dosis', outcome: 'Resultado', qty: 'Cantidad', given: 'La dio', checked: 'La revisó', permit: 'Permiso' },
    outcomes: { given: 'Dada', refused: 'Rechazada', missed: 'No se dio', held: 'Suspendida' },
    col: { date: 'Fecha', child: 'Niño', in: 'Entrada', out: 'Salida', by: 'Lo dejó', pick: 'Lo recogió', status: 'Estado', at: 'Cuándo', staff: 'Personal', children: 'Niños',
      ok: 'Bien', role: 'Puesto', hire: 'Contratación', background: 'Antecedentes', creds: 'Credenciales', entries: 'Horas en este período', type: 'Tipo', evac: 'Evacuación (s)',
      kind: 'Clase', what: 'Qué pasó', parent: 'Aviso a la familia', stateRep: 'Informe al estado', attendance: 'Asistencia', meal: 'Comida', total: 'Total' },
    yes: 'Sí', no: 'No', excused: 'Ausente (avisó la familia)', absent: 'Ausente',
    exportNote: 'Solo la dirección. Cada paquete y archivo queda en el registro de auditoría. Los niños aparecen con nombre solo donde la licencia lo pide (hojas de entrada); los incidentes muestran iniciales.',
    elig: 'Categorías de elegibilidad', eligNote: 'Solo la categoría. El formulario de ingresos de la familia queda en sus archivos. Los niños sin categoría se cuentan pero nunca se reclaman.',
    cat3: { free: 'Gratis', reduced: 'Reducido', paid: 'Pagado', not_recorded: 'Sin registrar' }, since: 'Desde', documented: 'Fecha del formulario', save: 'Guardar', saved: 'Guardado.',
    rates: (y) => `Tarifas de reembolso, año del programa ${y}-${String((y + 1) % 100).padStart(2, '0')}`, ratesNote: 'Escriba las tarifas del aviso vigente del USDA (dólares por comida). El Hub no trae tarifas; el reclamo muestra montos solo después de escribirlas.',
    rateSource: 'De dónde vienen estas tarifas (aviso y fecha)', meal: { breakfast: 'Desayuno', am_snack: 'Merienda de la mañana', lunch: 'Almuerzo', pm_snack: 'Merienda de la tarde', supper: 'Cena' },
    daily: 'Conteo diario de comidas', claim: 'Reclamo mensual', month: 'Mes', show: 'Mostrar', operating: (n, a) => `${n} día(s) de servicio; asistencia diaria promedio ${a}.`,
    meals: 'Comidas', rate: 'Tarifa', amount: 'Monto', totalAmt: 'Total', countsOnly: 'Solo conteos: no hay tarifas para este año del programa.', ratesIncomplete: 'Algunas líneas reclamables todavía no tienen tarifa: no hay total hasta escribir todas.',
    production: 'Registro de producción', day: 'Día', menu: 'Menú', a12: 'De 1 a 2 años', a35: 'De 3 a 5 años', a6: '6 años o más (sin cantidad en el menú)', noBday: 'Sin fecha de nacimiento',
    servings: 'Porciones', planned: 'Total planeado', noMenu: 'No se registró un día de menú con estas comidas.', item: 'Alimento', comp: 'Componente',
    auths: 'Autorizaciones de subsidio', program: { KS_CCA: 'Asistencia para Cuidado Infantil de Kansas', MO_CCS: 'Subsidio de Cuidado Infantil de Misuri', other: 'Otro programa' },
    authId: 'Número de autorización', agency: 'Agencia (opcional)', starts: 'Empieza', endsOpt: 'Termina (opcional)', add: 'Agregar autorización', childL: 'Niño',
    subExport: 'Exportar asistencia', format: 'Formato', fmt: { generic: 'General (todos los programas)', mo_register: 'Registro de horario y asistencia de Misuri (5 CSR 25-200.130(3))' },
    allPrograms: 'Todos los programas', download: 'Descargar CSV', subNote: 'Justificada = la familia avisó la ausencia; injustificada = el personal marcó la ausencia sin aviso de la familia. El archivo no tiene motivos de ausencia ni datos de salud.',
    noAuths: 'Todavía no hay autorizaciones.', downloaded: (f) => `Se descargó ${f}.`, staffMine: 'Sus horas para cada regla estatal que le corresponde.',
  },
};
const L_ = (lang) => W[lang === 'es' ? 'es' : 'en'];

function download(name, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' })); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

// One line of "what the Hub shows" for a rule's evidence.
export function evidenceText(r, L) {
  const e = r.evidence || {};
  if (r.status === 'outside_hub') return e.why || '';
  if (e.kept_in === 'health_records') return L.healthItems(e.items_overdue ?? 0, e.items_due ?? 0, e.summary_report_due_on || '');   // health records module (hub/HEALTH_RECORDS.md)
  if (e.kept_in === 'health_mar') return L.medLog(e.scheduled_doses_without_record_30d ?? 0, e.doses_recorded_30d ?? 0);
  if (r.category === 'record_retention') {
    const hub = e.hub ? (e.hub.months ? `${e.hub.months} ${L === W.es ? 'meses' : 'months'}` : e.hub.rule) : '';
    return `${L.keep(e.months ?? r.params?.months, e.basis ?? r.params?.basis, hub)} ${e.hub_keeps_long_enough === false ? L.keepBad : L.keepOk}`;
  }
  if (Array.isArray(e.missing_periods)) return e.missing_periods.length ? L.missingPeriods(e.missing_periods.join(', ')) : (e.current_period_done ? '' : L.notYet);
  if (e.open_last_12_months != null) return e.open_last_12_months ? L.open12(e.open_last_12_months) : '';
  if (e.days_present_without_sign_in_30d != null) return (e.days_present_without_sign_in_30d || e.sign_ins_without_sign_out_30d) ? L.signIn(e.days_present_without_sign_in_30d, e.sign_ins_without_sign_out_30d) : '';
  if (Array.isArray(e.staff_missing)) return e.staff_missing.length ? L.people(e.staff_missing.join(', ')) : '';
  if (Array.isArray(e.staff_not_cleared)) return e.staff_not_cleared.length ? L.notCleared(e.staff_not_cleared.map((x) => x.name).join(', ')) : '';
  if (Array.isArray(e.staff_without_hire_date)) return e.staff_without_hire_date.length ? L.noHire(e.staff_without_hire_date.join(', ')) : '';
  if (e.outside_certificates_waiting_review != null) return e.outside_certificates_waiting_review ? L.pending(e.outside_certificates_waiting_review) : '';
  if (e.rows != null) return e.rows ? L.hours(e) : '';
  if (e.obligations && Object.keys(e.obligations).length) return L.obl(Object.entries(e.obligations).map(([k, n]) => `${n} ${L.oblWord[k] || k}`).join(', '));
  if (r.category === 'meal_pattern') return r.params?.summary || '';
  return '';
}

const chip = (esc, L, s) => `<span class="chip ${STATUS_TONE[s] ?? ''}">${esc(L.status[s] || s)}</span>`;
const err = (esc, friendly, e) => `<p class="msg bad" role="alert">${esc(friendly(e))}</p>`;

export async function viewLicensing(ctx) {
  const { c, shell, page, rpc, esc, friendly, lang } = ctx;
  const l = lang === 'es' ? 'es' : 'en'; const L = L_(l);
  const director = c.role === 'director';
  const q = new URLSearchParams(location.search);
  const tabs = director ? ['rules', 'training', 'inspector', 'cacfp', 'subsidy', 'mine'] : ['mine'];
  const tab = tabs.includes(q.get('tab')) ? q.get('tab') : tabs[0];
  const nav = tabs.length > 1 ? `<nav class="tabs lic-tabs no-print" aria-label="${esc(L.title)}">${tabs.map((t) => `<a href="/c/${esc(c.slug)}/licensing?tab=${t}" data-nav${t === tab ? ' aria-current="page"' : ''}>${esc(L.tabs[t])}</a>`).join('')}</nav>` : '';
  page(shell(`<div id="licensing" class="lic">${nav}<div id="licBody"><p class="loading">…</p></div></div>`), `${L.title} · ${L.tabs[tab]}`, { english: l === 'en' });
  const body = document.getElementById('licBody');
  const x = { ...ctx, L, l, body, director };
  try {
    if (tab === 'rules') await rulesTab(x);
    else if (tab === 'training') await trainingTab(x, q.get('staff'));
    else if (tab === 'inspector') await inspectorTab(x);
    else if (tab === 'cacfp') await cacfpTab(x);
    else if (tab === 'subsidy') await subsidyTab(x);
    else await mineTab(x, q.get('rule'));
  } catch (e) { body.innerHTML = `<section class="card">${err(esc, friendly, e)}</section>`; }
}

async function rulesTab({ c, rpc, esc, L, body }) {
  const ev = await rpc('state_rules_evaluate', { p_center: c.center_id, p_as_of: null });
  if (!ev.configured) { body.innerHTML = `<section class="card"><p>${esc(L.noProfile)}</p></section>`; return; }
  if (!ev.pack) {
    body.innerHTML = `<section class="card" id="licNoPack"><h2>${esc(L.tabs.rules)}</h2><p>${esc(L.noPack(ev.state))}</p>
      ${ev.research ? `<h3>${esc(L.needs)}</h3><ul>${ev.research.needs.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}</section>`;
    return;
  }
  const p = ev.pack;
  const live = (ev.ratios_live || []).length ? `<h3>${esc(L.liveRatios)}</h3><div class="tablewrap"><table class="t"><thead><tr><th>${esc(L.room)}</th><th class="num">${esc(L.present)}</th><th class="num">${esc(L.needStaff)}</th><th>${esc(L.state)}</th></tr></thead><tbody>
    ${ev.ratios_live.map((r) => `<tr><td>${esc(r.room_name || r.room)}</td><td class="num">${esc(r.present)}</td><td class="num">${esc(r.required_staff ?? '')}</td><td>${esc(r.status || '')}</td></tr>`).join('')}</tbody></table></div>` : '';
  body.innerHTML = `<section class="card" id="licPack"><h2>${esc(p.name)} · ${esc(L.pack(ev.rules.length, p.version))}</h2>
      <p>${esc(L.agency)}: ${esc(p.agency || '')}. ${p.effective_from ? esc(L.effective(p.effective_from)) : ''}</p>
      <p class="small">${p.status === 'approved' ? `<span class="chip ok">${esc(L.review.approved)}</span> ${esc(L.packSigned(p.reviewer_name, String(p.reviewed_at).slice(0, 10)))}` : `<span class="chip warn">${esc(L.review.draft)}</span> ${esc(L.packDraft)}`}</p>
      <p class="chips">${Object.entries(ev.summary || {}).map(([s, n]) => `<span class="chip ${STATUS_TONE[s] ?? ''}">${esc(L.status[s] || s)}: ${esc(n)}</span>`).join('')}</p>
      ${live}<p class="small muted">${esc(L.checks30(ev.ratio_checks_30d?.checks ?? 0, ev.ratio_checks_30d?.not_ok ?? 0))}</p></section>
    ${groupRules(ev.rules).map(([cat, list]) => `<section class="card lic-cat" data-category="${esc(cat)}"><h3>${esc(L.cat[cat] || cat)}</h3>
      <div class="tablewrap"><table class="t"><thead><tr><th>${esc(L.rule)}</th><th>${esc(L.state)}</th><th>${esc(L.shows)}</th><th>${esc(L.sources)}</th></tr></thead><tbody>
      ${list.map((r) => `<tr data-rule="${esc(r.key)}"><td>${esc(r.title)}<br><span class="mini muted">${esc(L.review[r.review_status] || r.review_status)}${r.needs_confirmation ? ` · ${esc(L.needsConf)}` : ''}</span></td>
        <td>${chip(esc, L, r.status)}</td><td class="small">${esc(evidenceText(r, L))}</td>
        <td class="small">${r.source_urls.map((u) => `<a href="${esc(u)}" rel="noopener noreferrer" target="_blank">${esc(r.citation)}</a>`).slice(0, 1).join('')}</td></tr>`).join('')}
      </tbody></table></div></section>`).join('')}`;
}

const hoursTable = (esc, L, rows, mine = false) => (rows.length ? `<div class="tablewrap"><table class="t"><thead><tr>${mine ? '' : `<th>${esc(L.staff)}</th>`}<th>${esc(L.rule)}</th><th>${esc(L.cycle)}</th><th>${esc(L.ends)}</th>
  <th class="num">${esc(L.required)}</th><th class="num">${esc(L.completed)}</th><th class="num">${esc(L.shortfall)}</th><th>${esc(L.state)}</th></tr></thead><tbody>
  ${rows.map((r) => `<tr data-staff="${esc(r.user_id)}" data-rule="${esc(r.rule_key)}">${mine ? '' : `<td>${esc(r.full_name)}</td>`}<td>${esc(r.title)}<br><span class="mini muted">${esc(r.citation)}</span></td>
    <td>${esc(L.cycles[r.cycle] || r.cycle || '')}${r.period_start ? `<br><span class="mini muted">${esc(r.period_start)}</span>` : ''}</td><td>${esc(r.period_end || '')}</td>
    <td class="num">${esc(hoursText(r.required))}</td><td class="num">${esc(hoursText(r.completed))}</td><td class="num">${esc(hoursText(r.shortfall))}</td><td>${chip(esc, L, r.status)}</td></tr>`).join('')}
  </tbody></table></div>` : `<p class="muted">${esc(L.noStaff)}</p>`);

async function trainingTab({ c, rpc, esc, L, l, body }, staff) {
  const t = await rpc('state_training_hours', { p_center: c.center_id, p_as_of: null });
  body.innerHTML = `<section class="card" id="licTraining"><h2>${esc(L.tabs.training)}</h2><p class="small muted">${esc(L.alertNote)}</p>${hoursTable(esc, L, t.rows)}</section>`;
  if (staff) { const el = body.querySelector(`tr[data-staff="${cssValue(staff)}"]`); if (el) deepFocus(el); else deepMiss('any', l); }
}

async function mineTab({ rpc, esc, L, l, body, c }, rule) {
  const rows = (await rpc('state_training_hours_mine', { p_as_of: null })).filter((r) => r.center_id === c.center_id);
  body.innerHTML = `<section class="card" id="licMine"><h2>${esc(L.tabs.mine)}</h2><p class="small muted">${esc(L.staffMine)}</p>${hoursTable(esc, L, rows, true)}</section>`;
  if (rule) { const el = body.querySelector(`tr[data-rule="${cssValue(rule)}"]`); if (el) deepFocus(el); else deepMiss('any', l); }
}

// ---- inspector packet -------------------------------------------------------------------------------------------------------------
function packetHtml(esc, L, p, centerName) {
  const s = p.sections; const yn = (v) => (v ? L.yes : L.no);
  const table = (cols, rows) => (rows.length ? `<div class="tablewrap"><table class="t"><thead><tr>${cols.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((v) => `<td>${esc(v ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : `<p class="muted">${esc(L.none)}</p>`);
  const name = (x) => [x.first, x.last].filter(Boolean).join(' ');
  const sec = {
    attendance: () => table([L.col.date, L.col.child, L.col.in, L.col.by, L.col.out, L.col.pick], s.attendance.map((x) => [x.date, name(x), x.in, x.dropped_off_by, x.out, x.picked_up_by])),
    absences: () => table([L.col.date, L.col.child, L.col.status], s.absences.map((x) => [x.date, name(x), x.status === 'absent_excused' ? L.excused : L.absent])),
    ratios: () => table([L.col.at, L.room, L.col.staff, L.col.children, L.needStaff, L.col.ok], s.ratios.map((x) => [x.at, x.room, x.staff, x.children, x.required_staff, yn(x.ok)])),
    staff: () => table([L.staff, L.col.role, L.col.hire, L.col.background, L.col.creds], s.staff.map((x) => [x.name, x.role, x.hire_date, x.background ? `${x.background.state}${x.background.cleared_until ? ` (${x.background.cleared_until})` : ''}` : '-',
      x.credentials.map((cr) => `${cr.type}${cr.expires_on ? ` (${cr.expires_on})` : ''}`).join(', ')])),
    training: () => table([L.staff, L.col.entries, L.rule, L.required, L.completed, L.col.status], s.training.flatMap((x) => (x.state_hours.length ? x.state_hours : [{}]).map((h, i) => [i ? '' : x.name,
      i ? '' : hoursText(x.entries.reduce((a, e) => a + Number(e.hours || 0), 0)), h.rule, hoursText(h.required), hoursText(h.completed), h.status ? L.status[h.status] || h.status : '']))),
    drills: () => table([L.col.type, L.col.at, L.col.evac, L.col.children, L.col.staff], s.drills.map((x) => [x.type, x.at, x.evacuation_seconds, x.children, x.staff])),
    incidents: () => table([L.col.at, L.col.kind, L.col.child, L.col.what, L.col.parent, L.col.stateRep], s.incidents.map((x) => [x.at, x.critical_type || x.kind, x.child_initials, x.what_happened, x.parent_notified_at, x.state_reported_at])),
    medication: () => table(Object.values(L.medCols), s.medication.map((x) => [x.at, x.child_initials, x.medication, x.dose, (L.outcomes[x.outcome] || x.outcome) + (x.error ? ' !' : ''),
      x.quantity != null ? `${x.quantity} ${x.unit || ''}` : '', x.given_by, x.checked_by, `${x.permission_signed_on || ''} (${x.permission_from} – ${x.permission_to})`])),   // the MAR (hub/HEALTH_RECORDS.md)
    meals: () => table([L.col.date, L.col.attendance, ...MEAL_TYPES.map((m) => L.meal[m])], s.meals.days.map((d) => [d.date, d.attendance, ...MEAL_TYPES.map((m) => d.meals[m]?.total ?? '')])),
  };
  return `<article class="lic-packet" id="licPacket"><h2>${esc(L.packetHead(centerName, p.from, p.to))}</h2>
    <p class="small">${esc(L.license)}: ${esc(p.center.license_number || '-')} · ${esc(p.center.state || '')} · ${esc(p.center.facility_type || '')} · ${esc(L.generated)} ${esc(String(p.generated_at).slice(0, 16).replace('T', ' '))} (${esc(p.time_zone)})</p>
    ${SECTIONS.map((k) => `<section class="lic-sec" data-section="${k}"><div class="lic-sec-head"><h3>${esc(L.sec[k])}</h3><button class="btn soft small no-print" type="button" data-csv="${k}">${esc(L.csv)}</button></div>${sec[k]()}</section>`).join('')}</article>`;
}

async function inspectorTab({ c, rpc, esc, friendly, L, body, live }) {
  const today = await rpc('center_clock', { p_center: c.center_id }).then((r) => r?.today).catch(() => null) || new Date().toISOString().slice(0, 10);
  body.innerHTML = `<section class="card no-print" id="licInspector"><h2>${esc(L.tabs.inspector)}</h2><p class="small muted">${esc(L.exportNote)}</p>
    <form id="licRange" class="lic-form" novalidate><label class="f"><span>${esc(L.from)}</span><input class="i" type="date" name="from" value="${esc(addDays(today, -29))}" required></label>
      <label class="f"><span>${esc(L.to)}</span><input class="i" type="date" name="to" value="${esc(today)}" required></label>
      <button class="btn navy" type="submit">${esc(L.open)}</button></form><p class="msg" id="licMsg" role="status"></p></section><div id="licOut"></div>`;
  const msg = document.getElementById('licMsg'); const out = document.getElementById('licOut'); const f = document.getElementById('licRange');
  let range = null;
  f.addEventListener('submit', async (e) => {
    e.preventDefault(); msg.className = 'msg'; msg.textContent = '';
    if (!rangeOk(f.from.value, f.to.value)) { msg.className = 'msg bad'; msg.textContent = L.range; return; }
    try {
      const p = await rpc('inspector_packet', { p_center: c.center_id, p_from: f.from.value, p_to: f.to.value });
      range = [f.from.value, f.to.value];
      out.innerHTML = `<section class="card"><p class="no-print"><button class="btn gold" type="button" id="licPrint">${esc(L.print)}</button></p>${packetHtml(esc, L, p, c.name)}</section>`;
      live?.(L.tabs.inspector);
    } catch (er) { msg.className = 'msg bad'; msg.textContent = friendly(er); }
  });
  out.addEventListener('click', async (e) => {
    if (e.target.closest('#licPrint')) {
      document.body.classList.add('lic-print-mode');
      const done = () => { document.body.classList.remove('lic-print-mode'); window.removeEventListener('afterprint', done); };
      window.addEventListener('afterprint', done); window.print(); return;
    }
    const b = e.target.closest('[data-csv]'); if (!b || !range) return;
    try {
      const csv = await rpc('inspector_csv', { p_center: c.center_id, p_section: b.dataset.csv, p_from: range[0], p_to: range[1] });
      const name = fileName(c.slug, `inspector-${b.dataset.csv}`, range[0], range[1]); download(name, csv); msg.className = 'msg ok'; msg.textContent = L.downloaded(name);
    } catch (er) { msg.className = 'msg bad'; msg.textContent = friendly(er); }
  });
}

// ---- CACFP ------------------------------------------------------------------------------------------------------------------------
async function cacfpTab({ c, rpc, esc, friendly, L, body, client }) {
  const today = await rpc('center_clock', { p_center: c.center_id }).then((r) => r?.today).catch(() => null) || new Date().toISOString().slice(0, 10);
  const year = Number(today.slice(5, 7)) >= 7 ? Number(today.slice(0, 4)) : Number(today.slice(0, 4)) - 1;
  const [kids, rates] = await Promise.all([rpc('cacfp_eligibility_list', { p_center: c.center_id, p_as_of: null }), rpc('cacfp_rates_list', { p_center: c.center_id, p_program_year: year })]);
  const rate = (m, k) => rates.find((r) => r.meal_type === m && r.category === k);
  const opt = (v, cur) => `<option value="${v}"${v === cur ? ' selected' : ''}>${esc(L.cat3[v])}</option>`;
  body.innerHTML = `<section class="card" id="licElig"><h2>${esc(L.elig)}</h2><p class="small muted">${esc(L.eligNote)}</p>
      <div class="tablewrap"><table class="t"><thead><tr><th>${esc(L.childL)}</th><th>${esc(L.col.status)}</th><th>${esc(L.since)}</th><th>${esc(L.documented)}</th><th>${esc(L.save)}</th></tr></thead><tbody>
      ${kids.map((k) => `<tr data-kid="${esc(k.kid)}"><td>${esc([k.first, k.last].filter(Boolean).join(' '))}</td>
        <td><select class="i" name="category" aria-label="${esc(L.col.status)}">${!k.category ? `<option value="">${esc(L.cat3.not_recorded)}</option>` : ''}${CATEGORIES.map((v) => opt(v, k.category)).join('')}</select></td>
        <td><input class="i" type="date" name="from" value="${esc(today)}" aria-label="${esc(L.since)}"></td>
        <td><input class="i" type="date" name="documented" value="" aria-label="${esc(L.documented)}">${k.history?.[0] ? `<br><span class="mini muted">${esc(L.since)} ${esc(k.history[0].effective_from)}</span>` : ''}</td>
        <td><button class="btn soft small" type="button" data-save-elig="${esc(k.kid)}">${esc(L.save)}</button></td></tr>`).join('')}</tbody></table></div>
      <p class="msg" id="licEligMsg" role="status"></p></section>
    <section class="card" id="licRates"><h2>${esc(L.rates(year))}</h2><p class="small muted">${esc(L.ratesNote)}</p>
      <form id="licRateForm" novalidate><div class="tablewrap"><table class="t"><thead><tr><th>${esc(L.col.meal)}</th>${CATEGORIES.map((k) => `<th>${esc(L.cat3[k])}</th>`).join('')}</tr></thead><tbody>
      ${MEAL_TYPES.map((m) => `<tr><td>${esc(L.meal[m])}</td>${CATEGORIES.map((k) => `<td><input class="i lic-rate" inputmode="decimal" name="r_${m}_${k}" value="${esc(dollars(rate(m, k)?.rate_cents) ?? '')}" aria-label="${esc(`${L.meal[m]} ${L.cat3[k]}`)}"></td>`).join('')}</tr>`).join('')}
      </tbody></table></div><label class="f"><span>${esc(L.rateSource)}</span><input class="i" name="source" maxlength="300" value="${esc(rates[0]?.source_note || '')}"></label>
      <button class="btn navy" type="submit">${esc(L.save)}</button><p class="msg" id="licRateMsg" role="status"></p></form></section>
    <section class="card" id="licDaily"><h2>${esc(L.daily)}</h2><form id="licDailyForm" class="lic-form" novalidate>
      <label class="f"><span>${esc(L.from)}</span><input class="i" type="date" name="from" value="${esc(monthStart(today))}"></label><label class="f"><span>${esc(L.to)}</span><input class="i" type="date" name="to" value="${esc(today)}"></label>
      <button class="btn navy" type="submit">${esc(L.show)}</button><button class="btn soft" type="button" id="licDailyCsv">${esc(L.csv)}</button></form><div id="licDailyOut"></div></section>
    <section class="card" id="licClaim"><h2>${esc(L.claim)}</h2><form id="licClaimForm" class="lic-form" novalidate>
      <label class="f"><span>${esc(L.month)}</span><input class="i" type="month" name="month" value="${esc(today.slice(0, 7))}"></label>
      <button class="btn navy" type="submit">${esc(L.show)}</button><button class="btn soft" type="button" id="licClaimCsv">${esc(L.csv)}</button></form><div id="licClaimOut"></div></section>
    <section class="card" id="licProd"><h2>${esc(L.production)}</h2><form id="licProdForm" class="lic-form" novalidate>
      <label class="f"><span>${esc(L.day)}</span><input class="i" type="date" name="date" value="${esc(today)}"></label><button class="btn navy" type="submit">${esc(L.show)}</button></form><div id="licProdOut"></div></section>`;
  const say = (id, text, bad = false) => { const m = document.getElementById(id) || document.querySelector(`#${id}`); if (m) { m.className = `msg ${bad ? 'bad' : 'ok'}`; m.textContent = text; } };
  const outMsg = (el, e) => { el.innerHTML = err(esc, friendly, e); };
  document.getElementById('licElig').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-save-elig]'); if (!b) return; const tr = b.closest('tr');
    try {
      await rpc('cacfp_eligibility_set', { p_center: c.center_id, p_kid: b.dataset.saveElig, p_category: tr.querySelector('[name=category]').value, p_from: tr.querySelector('[name=from]').value || null,
        p_documented_on: tr.querySelector('[name=documented]').value || null, p_note: null });
      say('licEligMsg', L.saved);
    } catch (er) { say('licEligMsg', friendly(er), true); }
  });
  document.getElementById('licRateForm').addEventListener('submit', async (e) => {
    e.preventDefault(); const f = e.currentTarget;
    try {
      for (const m of MEAL_TYPES) for (const k of CATEGORIES) {
        const v = f[`r_${m}_${k}`].value.trim(); const had = rate(m, k);
        const cents = v === '' ? null : centsOf(v);
        if (v !== '' && cents == null) throw new Error(L.ratesNote);
        if (cents === (had?.rate_cents ?? null) && (cents == null || f.source.value.trim() === (had?.source_note || ''))) continue;
        await rpc('cacfp_rate_set', { p_center: c.center_id, p_program_year: year, p_meal_type: m, p_category: k, p_rate_cents: cents, p_source_note: f.source.value });
      }
      say('licRateMsg', L.saved);
    } catch (er) { say('licRateMsg', friendly(er), true); }
  });
  const dailyForm = document.getElementById('licDailyForm'); const dailyOut = document.getElementById('licDailyOut');
  dailyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const d = await rpc('cacfp_daily_counts', { p_center: c.center_id, p_from: dailyForm.from.value, p_to: dailyForm.to.value });
      dailyOut.innerHTML = d.days.length ? `<div class="tablewrap"><table class="t"><thead><tr><th>${esc(L.col.date)}</th><th class="num">${esc(L.col.attendance)}</th>${MEAL_TYPES.map((m) => `<th class="num">${esc(L.meal[m])}</th>`).join('')}</tr></thead><tbody>
        ${d.days.map((x) => `<tr><td>${esc(x.date)}</td><td class="num">${esc(x.attendance)}</td>${MEAL_TYPES.map((m) => `<td class="num">${esc(x.meals[m] ? `${x.meals[m].total} (${x.meals[m].free}/${x.meals[m].reduced}/${x.meals[m].paid}/${x.meals[m].not_recorded})` : '')}</td>`).join('')}</tr>`).join('')}
        </tbody></table></div><p class="mini muted">${esc(`${L.col.total} (${L.cat3.free}/${L.cat3.reduced}/${L.cat3.paid}/${L.cat3.not_recorded})`)}</p>` : `<p class="muted">${esc(L.none)}</p>`;
    } catch (er) { outMsg(dailyOut, er); }
  });
  document.getElementById('licDailyCsv').addEventListener('click', async () => {
    try { const csv = await rpc('cacfp_csv', { p_center: c.center_id, p_kind: 'daily', p_from: dailyForm.from.value, p_to: dailyForm.to.value }); download(fileName(c.slug, 'cacfp-daily', dailyForm.from.value, dailyForm.to.value), csv); }
    catch (er) { outMsg(dailyOut, er); }
  });
  const claimForm = document.getElementById('licClaimForm'); const claimOut = document.getElementById('licClaimOut');
  claimForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const k = await rpc('cacfp_claim', { p_center: c.center_id, p_month: `${claimForm.month.value}-01` });
      claimOut.innerHTML = `<p>${esc(L.operating(k.operating_days, k.average_daily_attendance ?? 0))}</p>${!k.rates_entered ? `<p class="msg info">${esc(L.countsOnly)}</p>` : k.total_amount_cents == null ? `<p class="msg info">${esc(L.ratesIncomplete)}</p>` : ''}
        <div class="tablewrap"><table class="t"><thead><tr><th>${esc(L.col.meal)}</th><th>${esc(L.col.status)}</th><th class="num">${esc(L.meals)}</th><th class="num">${esc(L.rate)}</th><th class="num">${esc(L.amount)}</th></tr></thead><tbody>
        ${k.lines.map((x) => `<tr><td>${esc(L.meal[x.meal_type])}</td><td>${esc(L.cat3[x.category])}</td><td class="num">${esc(x.meals)}</td><td class="num">${esc(dollars(x.rate_cents) ?? '')}</td><td class="num">${esc(dollars(x.amount_cents) ?? '')}</td></tr>`).join('')}
        ${k.total_amount_cents != null ? `<tr><th colspan="4">${esc(L.totalAmt)}</th><td class="num">${esc(dollars(k.total_amount_cents))}</td></tr>` : ''}</tbody></table></div>`;
    } catch (er) { outMsg(claimOut, er); }
  });
  document.getElementById('licClaimCsv').addEventListener('click', async () => {
    const m = `${claimForm.month.value}-01`;
    try { const csv = await rpc('cacfp_csv', { p_center: c.center_id, p_kind: 'claim', p_from: m, p_to: m }); download(fileName(c.slug, 'cacfp-claim', claimForm.month.value), csv); }
    catch (er) { outMsg(claimOut, er); }
  });
  const prodForm = document.getElementById('licProdForm'); const prodOut = document.getElementById('licProdOut');
  prodForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const sess = (await client().auth.getSession()).data.session;
      const r = await fetch(`/api/licensing/production?date=${encodeURIComponent(prodForm.date.value)}`, { headers: { Authorization: `Bearer ${sess?.access_token || ''}`, 'X-Center': c.center_id } });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || L.none);
      prodOut.innerHTML = j.meals.length ? j.meals.map((m) => `<section class="lic-prod" data-meal="${esc(m.meal_type)}"><h3>${esc(L.meal[m.meal_type])}${m.menu_id ? ` · ${esc(L.menu)} ${esc(m.menu_id)}: ${esc(m.title || '')}` : ''}</h3>
        <p class="small">${esc(L.a12)}: ${esc(m.children.a12)} · ${esc(L.a35)}: ${esc(m.children.a35)}${m.children.a6 ? ` · ${esc(L.a6)}: ${esc(m.children.a6)}` : ''}${m.children.no_birthday ? ` · ${esc(L.noBday)}: ${esc(m.children.no_birthday)}` : ''}</p>
        ${m.menu_id ? `<div class="tablewrap"><table class="t"><thead><tr><th>${esc(L.item)}</th><th>${esc(L.comp)}</th><th class="num">${esc(L.servings)}</th></tr></thead><tbody>${m.items.map((it) => `<tr><td>${esc(it.what)}</td><td>${esc(it.comp)}</td><td class="num">${esc(it.servings)}</td></tr>`).join('')}</tbody></table></div>
          <p class="small">${esc(L.planned)}: ${m.components.map((k) => `${esc(k.comp)} ${esc(k.planned)} ${esc(k.unit)}`).join(' · ')}</p>` : `<p class="muted">${esc(L.noMenu)}</p>`}</section>`).join('') : `<p class="muted">${esc(L.none)}</p>`;
    } catch (er) { outMsg(prodOut, er); }
  });
}

// ---- subsidy ----------------------------------------------------------------------------------------------------------------------
async function subsidyTab({ c, rpc, esc, friendly, L, body }) {
  const today = await rpc('center_clock', { p_center: c.center_id }).then((r) => r?.today).catch(() => null) || new Date().toISOString().slice(0, 10);
  const [auths, kids] = await Promise.all([rpc('subsidy_authorizations_list', { p_center: c.center_id }), rpc('cacfp_eligibility_list', { p_center: c.center_id, p_as_of: null })]);
  const progOpts = (cur) => PROGRAMS.map((p) => `<option value="${p}"${p === cur ? ' selected' : ''}>${esc(L.program[p])}</option>`).join('');
  body.innerHTML = `<section class="card" id="licAuths"><h2>${esc(L.auths)}</h2>
      ${auths.length ? `<div class="tablewrap"><table class="t"><thead><tr><th>${esc(L.childL)}</th><th>${esc(L.format)}</th><th>${esc(L.authId)}</th><th>${esc(L.starts)}</th><th>${esc(L.endsOpt)}</th></tr></thead><tbody>
        ${auths.map((a) => `<tr data-auth="${esc(a.id)}"><td>${esc([a.first, a.last].filter(Boolean).join(' '))}</td><td>${esc(L.program[a.program])}</td><td>${esc(a.authorization_id)}</td><td>${esc(a.starts_on)}</td><td>${esc(a.ends_on || '')}</td></tr>`).join('')}</tbody></table></div>` : `<p class="muted">${esc(L.noAuths)}</p>`}
      <form id="licAuthForm" class="lic-form" novalidate><label class="f"><span>${esc(L.childL)}</span><select class="i" name="kid">${kids.map((k) => `<option value="${esc(k.kid)}">${esc([k.first, k.last].filter(Boolean).join(' '))}</option>`).join('')}</select></label>
        <label class="f"><span>${esc(L.format)}</span><select class="i" name="program">${progOpts('MO_CCS')}</select></label>
        <label class="f"><span>${esc(L.authId)}</span><input class="i" name="auth" maxlength="60" required></label><label class="f"><span>${esc(L.agency)}</span><input class="i" name="agency" maxlength="120"></label>
        <label class="f"><span>${esc(L.starts)}</span><input class="i" type="date" name="starts" value="${esc(today)}" required></label><label class="f"><span>${esc(L.endsOpt)}</span><input class="i" type="date" name="ends"></label>
        <button class="btn navy" type="submit">${esc(L.add)}</button></form><p class="msg" id="licAuthMsg" role="status"></p></section>
    <section class="card" id="licSubExport"><h2>${esc(L.subExport)}</h2><p class="small muted">${esc(L.subNote)}</p>
      <form id="licSubForm" class="lic-form" novalidate><label class="f"><span>${esc(L.from)}</span><input class="i" type="date" name="from" value="${esc(monthStart(today))}"></label>
        <label class="f"><span>${esc(L.to)}</span><input class="i" type="date" name="to" value="${esc(today)}"></label>
        <label class="f"><span>${esc(L.format)}</span><select class="i" name="format"><option value="generic">${esc(L.fmt.generic)}</option><option value="mo_register">${esc(L.fmt.mo_register)}</option></select></label>
        <label class="f"><span>${esc(L.auths)}</span><select class="i" name="program"><option value="">${esc(L.allPrograms)}</option>${progOpts(null)}</select></label>
        <button class="btn navy" type="submit">${esc(L.download)}</button></form><p class="msg" id="licSubMsg" role="status"></p></section>`;
  const say = (id, text, bad = false) => { const m = document.getElementById(id); m.className = `msg ${bad ? 'bad' : 'ok'}`; m.textContent = text; };
  document.getElementById('licAuthForm').addEventListener('submit', async (e) => {
    e.preventDefault(); const f = e.currentTarget;
    try {
      await rpc('subsidy_authorization_save', { p_center: c.center_id, p_id: null, p_kid: f.kid.value, p_program: f.program.value, p_authorization_id: f.auth.value, p_agency: f.agency.value || null,
        p_starts: f.starts.value || null, p_ends: f.ends.value || null, p_note: null });
      return subsidyTab({ c, rpc, esc, friendly, L, body });
    } catch (er) { say('licAuthMsg', friendly(er), true); }
  });
  document.getElementById('licSubForm').addEventListener('submit', async (e) => {
    e.preventDefault(); const f = e.currentTarget;
    if (!rangeOk(f.from.value, f.to.value)) return say('licSubMsg', L.range, true);
    try {
      const csv = await rpc('subsidy_attendance_export', { p_center: c.center_id, p_from: f.from.value, p_to: f.to.value, p_format: f.format.value, p_program: f.program.value || null });
      const name = fileName(c.slug, `subsidy-${f.format.value}`, f.from.value, f.to.value); download(name, csv); say('licSubMsg', L.downloaded(name));
    } catch (er) { say('licSubMsg', friendly(er), true); }
  });
}
