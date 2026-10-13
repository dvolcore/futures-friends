// Special education: IEP / IFSP plans, goals, progress monitoring, meetings, family progress reports, encrypted documents and invited
// specialists (hub/SPECIAL_EDUCATION.md; migrations 20261030010000_special_education.sql, 20261030020000_special_education_fixes.sql).
//
//   /c/<slug>/child/<kid>/plan   the plan page, for every role that may see it (the database decides: sped_child): the center's director,
//                                the child's assigned teachers, the child's guardians, an invited specialist, HQ with both permissions.
//                                ?plan=<id> picks a plan, ?meeting=<id> / ?report=<id> / ?s=docs|reports|specialists|goals open that item.
//   /c/<slug>/plans              staff: to-do list and caseload; director: caseload counts (no child) + the list; specialist: their
//                                caseload; family: their children's plans and what is waiting for them
//   /c/<slug>/goal-entry         the quick tablet screen: tap a goal, record a data point
// English + Spanish (Spanish is a DRAFT for the center's Spanish teacher to review); every visible string lives in W below.
// Documents are encrypted IN THE BROWSER (AES-256-GCM, a new key per file); only ciphertext is uploaded; the key is kept by the database
// in the Vault field-encryption pattern and handed back only to someone who may see the plan (sped_document_open, audited).
// Plain ES module, no build step; the strict CSP forbids inline styles and inline code.

import { dict, fmtDate, fmtDateTime } from './i18n.js';
import { centerToday, centerTz } from './center-time.js';
import { cssValue, deepFocus, deepMiss } from './deeplink.js';
import { dashLink as staffLink } from './staff-dashboard.js';
import { dashLink as familyLink } from './family-dashboard.js';

export const AREAS = ['communication', 'social_emotional', 'cognitive', 'pre_academic', 'fine_motor', 'gross_motor', 'self_help', 'behavior', 'other'];
export const UNITS = ['count', 'percent', 'minutes', 'rating', 'yes_no'];
export const STATUSES = ['not_started', 'progressing', 'met', 'not_met'];
export const SERVICES = ['speech_language', 'occupational_therapy', 'physical_therapy', 'special_instruction', 'behavior_support', 'service_coordination',
  'family_training', 'assistive_technology', 'vision', 'hearing', 'nursing', 'other'];
export const LOCATIONS = ['in_classroom', 'pull_out', 'at_home', 'community', 'telehealth'];
export const TEAM_ROLES = ['family', 'teacher', 'director', 'special_educator', 'slp', 'ot', 'pt', 'service_coordinator', 'psychologist', 'district_rep', 'other'];
export const SPEC_ROLES = ['slp', 'ot', 'pt', 'special_educator', 'service_coordinator', 'psychologist', 'behavior_specialist', 'other'];
export const DOC_KINDS = ['plan', 'evaluation', 'progress_report', 'meeting_notice', 'prior_written_notice', 'consent_form', 'other'];
export const ADAPT_KEYS = ['fewer_choices', 'larger_targets', 'extra_time', 'read_aloud', 'reduced_motion', 'high_contrast', 'one_step', 'break_prompts', 'simplified'];
export const MAX_FILE = 10 * 1024 * 1024;

export const W = {
  en: {
    title: 'Support plan (IEP / IFSP)', plans: 'Support plans', entry: 'Goal data', type: { iep: 'IEP', ifsp: 'IFSP' },
    typeLong: { iep: 'IEP (Individualized Education Program, ages 3 to 5, from the school district)', ifsp: 'IFSP (Individualized Family Service Plan, under age 3, early intervention)' },
    status: { draft: 'Draft', active: 'Active', ended: 'Ended' }, privacy: 'Only the center\'s director, your child\'s assigned teachers, you, and the specialists you approve can see this plan. It is encrypted, and every view is logged.',
    staffPrivacy: 'Visible to the director, the child\'s assigned teachers, the family and specialists the family approved. Every view is logged.',
    noPlan: 'No support plan is on file for this child.', start: 'Start a plan', startHint: 'Type the plan from the district\'s or early-intervention program\'s document. Upload the document below too.',
    fromNote: 'Start from an early-intervention note (optional)', noNote: 'No note', create: 'Create draft', save: 'Save', saved: 'Saved.', cancel: 'Cancel', remove: 'Remove', edit: 'Edit',
    consentNeeded: 'The family has not given (or has withdrawn) consent for special education records. Nothing can be added or changed until they do.',
    consentFamily: 'Give your consent in Privacy & consent to let the center keep and update this plan.', consentLink: 'Privacy & consent',
    licenseOff: 'Special education plans are not part of this center\'s license. Existing records stay readable.',
    summary: 'The plan', agency: 'District or program', startsOn: 'Starts', reviewOn: 'Annual review', reevalOn: 'Re-evaluation due', transitionOn: 'Transition (age 3)', endsOn: 'Ends',
    eligibility: 'Eligibility', levels: 'Present levels (what the child does now)', priorities: 'Family concerns and priorities', activate: 'Make this plan active',
    activateHint: 'Activating replaces the current active plan and turns on the plan\'s classroom adaptations.', end: 'End this plan', endReason: 'Why it ends',
    goals: 'Goals', goal: 'Goal', area: 'Area', areaV: { communication: 'Communication', social_emotional: 'Social and emotional', cognitive: 'Thinking and problem solving', pre_academic: 'Early academics', fine_motor: 'Hands and fingers', gross_motor: 'Moving the whole body', self_help: 'Self-help and daily routines', behavior: 'Behavior', other: 'Other' },
    measure: 'How it is measured', baseline: 'Starting point', unit: 'Unit', unitV: { count: 'Count', percent: 'Percent', minutes: 'Minutes', rating: 'Rating', yes_no: 'Yes / no' },
    target: 'Target', targetOn: 'By', objectives: 'Steps along the way (objectives)', objective: 'Objective', addObjective: 'Add a step', addGoal: 'Add a goal',
    st: { not_started: 'Not started', progressing: 'Progressing', met: 'Met', not_met: 'Not met' }, setStatus: 'Progress status',
    data: 'Progress data', record: 'Record a data point', on: 'Day', value: 'Value', measureNote: 'What you saw (for example "3 of 5")', note: 'Note', noData: 'No data yet.',
    by: { teacher: 'teacher', director: 'director', specialist: 'specialist' }, chart: (g) => `Progress chart for the goal: ${g}`, steps: 'Learning Steps (skill checks)', linkSteps: 'Tag Learning Steps',
    checksLine: (r, p, m) => `${r} skill-check result${r === 1 ? '' : 's'} in the last 120 days: ${p} of ${m} points`,
    services: 'Services', service: 'Service', serviceV: { speech_language: 'Speech and language', occupational_therapy: 'Occupational therapy', physical_therapy: 'Physical therapy', special_instruction: 'Special instruction', behavior_support: 'Behavior support', service_coordination: 'Service coordination', family_training: 'Family training', assistive_technology: 'Assistive technology', vision: 'Vision', hearing: 'Hearing', nursing: 'Nursing', other: 'Other' },
    provider: 'Provider', minutes: 'Minutes', times: 'Times', per: 'per', perV: { day: 'day', week: 'week', month: 'month' }, location: 'Where',
    locationV: { in_classroom: 'In the classroom', pull_out: 'Pull-out (separate space)', at_home: 'At home', community: 'In the community', telehealth: 'Telehealth' },
    svcLine: (m, t, p) => `${m} minutes, ${t} time${t === 1 ? '' : 's'} a ${p}`, addService: 'Add a service',
    accom: 'Accommodations and modifications', kindV: { accommodation: 'Accommodation', modification: 'Modification', supplementary_aid: 'Supplementary aid' }, description: 'Description',
    adaptLink: 'Also apply in Kid Mode and skill checks', adaptOn: 'Applied in Kid Mode and skill checks:', applyNow: 'Apply to the classroom adaptations now', addAccom: 'Add an accommodation',
    adapt: { fewer_choices: 'Fewer choices', larger_targets: 'Larger buttons and pictures', extra_time: 'Extra time', read_aloud: 'Read the words aloud', reduced_motion: 'Less motion', high_contrast: 'High contrast', one_step: 'One step at a time', break_prompts: 'Break reminders', simplified: 'Simpler screens' },
    team: 'Team', name: 'Name', role: 'Role', org: 'Organization', contact: 'Contact', roleV: { family: 'Family', teacher: 'Teacher', director: 'Director', special_educator: 'Special educator', slp: 'Speech-language pathologist', ot: 'Occupational therapist', pt: 'Physical therapist', service_coordinator: 'Service coordinator', psychologist: 'Psychologist', district_rep: 'District representative', behavior_specialist: 'Behavior specialist', other: 'Other' },
    addMember: 'Add a team member', meetings: 'Meetings', purpose: 'Purpose', purposeV: { initial: 'First meeting', annual_review: 'Annual review', review: 'Review', transition: 'Transition', progress: 'Progress', other: 'Other' },
    mst: { proposed: 'Waiting for the family to choose a time', scheduled: 'Scheduled', held: 'Held', cancelled: 'Cancelled' }, how: 'How', howV: { in_person: 'In person', phone: 'Phone', video: 'Video call' },
    place: 'Place or call details', offer: 'Offer times to the family', offerHint: 'Up to 4 times, in the center\'s time zone. The family picks one.', option: (n) => `Time ${n}`, confirmOne: 'One time only: schedule it now',
    pickTime: 'Choose this time', notes: 'Notes', attendees: 'Who attended (one per line: name, role)', recordMeeting: 'Save notes', cancelMeeting: 'Cancel meeting', noMeetings: 'No meetings yet.',
    reports: 'Progress reports for the family', writeReport: 'Write a progress report', from: 'From', to: 'To', summaryLabel: 'Summary for the family', goalNote: (g) => `Note on: ${g}`,
    saveDraft: 'Save draft', release: 'Release to the family', releaseQ: 'Release this progress report to the family? It cannot be changed afterwards.', released: (d) => `Released ${d}`,
    ack: 'I have read this report', ackNote: 'Your note (optional)', acked: (d) => `Acknowledged ${d}`, noReports: 'No progress reports yet.', print: 'Print or save as PDF', printPlan: 'Print plan summary',
    reportTitle: (t) => `Goal progress report (${t})`, period: (a, b) => `${a} to ${b}`, noPoints: 'No data points in this period.',
    docs: 'Documents', docKind: 'Kind', docKindV: { plan: 'Plan', evaluation: 'Evaluation', progress_report: 'Progress report', meeting_notice: 'Meeting notice', prior_written_notice: 'Prior written notice', consent_form: 'Consent form', other: 'Other' },
    docTitle: 'Title', docFile: 'File (PDF or photo, up to 10 MB)', upload: 'Upload', uploading: 'Encrypting and uploading…', open: 'Open', noDocs: 'No documents yet.',
    docHint: 'Files are encrypted on this device before they are uploaded.', tooBig: 'That file is larger than 10 MB.', badType: 'Choose a PDF or a photo.',
    specialists: 'Outside specialists', specHint: 'A specialist (for example a speech therapist) can see this plan only after a guardian approves, for the days chosen. They sign in with two-step verification.',
    invite: 'Invite a specialist', email: 'Email', days: 'Days of access (1 to 365)', canRecord: 'May record progress data', lang: 'Email language',
    specSt: { awaiting_family: 'Waiting for the family', approved: 'Approved: login being sent', active: 'Active', declined: 'Declined', revoked: 'Revoked', expired: 'Expired' },
    approve: 'Approve', decline: 'Decline', revoke: 'Remove access', until: (d) => `until ${d}`, noSpecs: 'No specialists invited.',
    hq: 'Futures Friends support', hqHint: 'Futures Friends staff never see this plan unless you allow it here AND the director opens a support request for it.', hqAllow: 'Allow Futures Friends support to see this plan',
    todo: 'To do', noTodo: 'Nothing is waiting.', caseload: 'Caseload', counts: 'Plans at a glance', countsHint: 'Counts and dates only.',
    cIep: 'Active IEPs', cIfsp: 'Active IFSPs', cDrafts: 'Drafts', cReviews: 'Annual reviews in the next 30 days', cMeetings: 'Meetings in the next 14 days', cWaiting: 'Reports waiting for a family', cSpecs: 'Active specialists', cConsent: 'Children missing consent',
    nextReviews: 'Upcoming review dates', nextMeetings: 'Upcoming meeting dates', open2: 'Open', last: 'Last data', goalsMet: (m, n) => `${m} of ${n} goals met`,
    todoK: { annual_review: (f, d) => `Annual review for ${f}: ${d}`, reeval: (f, d) => `Re-evaluation for ${f}: ${d}`, transition: (f, d) => `Transition for ${f}: ${d}`, progress_report: (f, d) => `Progress report due for ${f}: ${d}`,
      meeting: (f, d) => `Meeting for ${f}: ${d}`, meeting_waiting: (f) => `Meeting time not chosen yet: ${f}`, specialist_waiting: (f) => `Specialist waiting for ${f}'s family`, family_document: (f) => `${f}'s family added a document`,
      report_ack: () => 'A progress report to read', meeting_choose: () => 'Choose a meeting time', specialist_approve: () => 'A specialist is waiting for your approval' },
    entryIntro: 'Tap a goal, then record what you saw.', room: 'Room', allRooms: 'All my children', noEntry: 'No active goals for these children.', recorded: 'Recorded.', today: 'Today',
    lastValue: (d, v) => `Last: ${v} on ${d}`, viewPlan: 'Open plan', planFor: (n) => `${n}: support plan`, draftNote: 'Spanish is a draft.',
    confGoals: 'Show goal progress from the child\'s support plan in this report (optional)', confGoalsHint: 'Only the goals you tick are shown to the family, as of the release.', confSaveFirst: 'Save the draft first, then choose goals.',
    confProgress: 'Support plan goals', perLine: 'One per line', transferSped: 'Also send the special education records (IEP / IFSP) if the child has any',
  },
  es: {
    title: 'Plan de apoyo (IEP / IFSP)', plans: 'Planes de apoyo', entry: 'Datos de metas', type: { iep: 'IEP', ifsp: 'IFSP' },
    typeLong: { iep: 'IEP (Programa de Educación Individualizado, de 3 a 5 años, del distrito escolar)', ifsp: 'IFSP (Plan Individualizado de Servicios para la Familia, menores de 3 años, intervención temprana)' },
    status: { draft: 'Borrador', active: 'Vigente', ended: 'Terminado' }, privacy: 'Solo la dirección del centro, las maestras asignadas a su hijo o hija, usted y los especialistas que usted apruebe pueden ver este plan. Está cifrado y cada consulta queda registrada.',
    staffPrivacy: 'Lo ven la dirección, las maestras asignadas, la familia y los especialistas que la familia aprobó. Cada consulta queda registrada.',
    noPlan: 'No hay un plan de apoyo para este niño o niña.', start: 'Empezar un plan', startHint: 'Escriba el plan a partir del documento del distrito o del programa de intervención temprana. Suba también el documento abajo.',
    fromNote: 'Empezar desde una nota de intervención temprana (opcional)', noNote: 'Sin nota', create: 'Crear borrador', save: 'Guardar', saved: 'Guardado.', cancel: 'Cancelar', remove: 'Quitar', edit: 'Editar',
    consentNeeded: 'La familia no ha dado (o retiró) el consentimiento para los registros de educación especial. No se puede agregar ni cambiar nada hasta que lo dé.',
    consentFamily: 'Dé su consentimiento en Privacidad y consentimiento para que el centro guarde y actualice este plan.', consentLink: 'Privacidad y consentimiento',
    licenseOff: 'Los planes de educación especial no forman parte de la licencia de este centro. Los registros existentes siguen visibles.',
    summary: 'El plan', agency: 'Distrito o programa', startsOn: 'Empieza', reviewOn: 'Revisión anual', reevalOn: 'Reevaluación', transitionOn: 'Transición (3 años)', endsOn: 'Termina',
    eligibility: 'Elegibilidad', levels: 'Niveles actuales (lo que hace ahora)', priorities: 'Inquietudes y prioridades de la familia', activate: 'Poner este plan vigente',
    activateHint: 'Al ponerlo vigente reemplaza al plan vigente y activa las adaptaciones del salón del plan.', end: 'Terminar este plan', endReason: 'Por qué termina',
    goals: 'Metas', goal: 'Meta', area: 'Área', areaV: { communication: 'Comunicación', social_emotional: 'Social y emocional', cognitive: 'Pensar y resolver problemas', pre_academic: 'Primeros aprendizajes', fine_motor: 'Manos y dedos', gross_motor: 'Mover todo el cuerpo', self_help: 'Autonomía y rutinas', behavior: 'Conducta', other: 'Otra' },
    measure: 'Cómo se mide', baseline: 'Punto de partida', unit: 'Unidad', unitV: { count: 'Cantidad', percent: 'Porcentaje', minutes: 'Minutos', rating: 'Calificación', yes_no: 'Sí / no' },
    target: 'Meta numérica', targetOn: 'Para', objectives: 'Pasos en el camino (objetivos)', objective: 'Objetivo', addObjective: 'Agregar un paso', addGoal: 'Agregar una meta',
    st: { not_started: 'Sin empezar', progressing: 'Avanzando', met: 'Lograda', not_met: 'No lograda' }, setStatus: 'Estado del progreso',
    data: 'Datos de progreso', record: 'Registrar un dato', on: 'Día', value: 'Valor', measureNote: 'Lo que vio (por ejemplo "3 de 5")', note: 'Nota', noData: 'Todavía no hay datos.',
    by: { teacher: 'maestra', director: 'dirección', specialist: 'especialista' }, chart: (g) => `Gráfica de progreso de la meta: ${g}`, steps: 'Pasos de aprendizaje (pruebas)', linkSteps: 'Vincular pasos de aprendizaje',
    checksLine: (r, p, m) => `${r} resultado${r === 1 ? '' : 's'} de pruebas en los últimos 120 días: ${p} de ${m} puntos`,
    services: 'Servicios', service: 'Servicio', serviceV: { speech_language: 'Habla y lenguaje', occupational_therapy: 'Terapia ocupacional', physical_therapy: 'Terapia física', special_instruction: 'Instrucción especial', behavior_support: 'Apoyo de conducta', service_coordination: 'Coordinación de servicios', family_training: 'Capacitación para la familia', assistive_technology: 'Tecnología de asistencia', vision: 'Visión', hearing: 'Audición', nursing: 'Enfermería', other: 'Otro' },
    provider: 'Proveedor', minutes: 'Minutos', times: 'Veces', per: 'por', perV: { day: 'día', week: 'semana', month: 'mes' }, location: 'Dónde',
    locationV: { in_classroom: 'En el salón', pull_out: 'Fuera del salón (espacio aparte)', at_home: 'En casa', community: 'En la comunidad', telehealth: 'Telesalud' },
    svcLine: (m, t, p) => `${m} minutos, ${t} vez${t === 1 ? '' : 'es'} por ${p}`, addService: 'Agregar un servicio',
    accom: 'Adaptaciones y modificaciones', kindV: { accommodation: 'Adaptación', modification: 'Modificación', supplementary_aid: 'Apoyo complementario' }, description: 'Descripción',
    adaptLink: 'Aplicar también en el Modo Niño y en las pruebas', adaptOn: 'Se aplica en el Modo Niño y en las pruebas:', applyNow: 'Aplicar ahora a las adaptaciones del salón', addAccom: 'Agregar una adaptación',
    adapt: { fewer_choices: 'Menos opciones', larger_targets: 'Botones y dibujos más grandes', extra_time: 'Más tiempo', read_aloud: 'Leer las palabras en voz alta', reduced_motion: 'Menos movimiento', high_contrast: 'Alto contraste', one_step: 'Un paso a la vez', break_prompts: 'Recordatorios de descanso', simplified: 'Pantallas más simples' },
    team: 'Equipo', name: 'Nombre', role: 'Función', org: 'Organización', contact: 'Contacto', roleV: { family: 'Familia', teacher: 'Maestra', director: 'Dirección', special_educator: 'Educador especial', slp: 'Terapeuta del habla y lenguaje', ot: 'Terapeuta ocupacional', pt: 'Terapeuta físico', service_coordinator: 'Coordinador de servicios', psychologist: 'Psicólogo', district_rep: 'Representante del distrito', behavior_specialist: 'Especialista en conducta', other: 'Otro' },
    addMember: 'Agregar a alguien del equipo', meetings: 'Reuniones', purpose: 'Motivo', purposeV: { initial: 'Primera reunión', annual_review: 'Revisión anual', review: 'Revisión', transition: 'Transición', progress: 'Progreso', other: 'Otro' },
    mst: { proposed: 'Esperando que la familia elija una hora', scheduled: 'Programada', held: 'Realizada', cancelled: 'Cancelada' }, how: 'Cómo', howV: { in_person: 'En persona', phone: 'Por teléfono', video: 'Videollamada' },
    place: 'Lugar o datos de la llamada', offer: 'Ofrecer horas a la familia', offerHint: 'Hasta 4 horas, en la zona horaria del centro. La familia elige una.', option: (n) => `Hora ${n}`, confirmOne: 'Una sola hora: programarla ya',
    pickTime: 'Elegir esta hora', notes: 'Notas', attendees: 'Quién asistió (uno por línea: nombre, función)', recordMeeting: 'Guardar notas', cancelMeeting: 'Cancelar la reunión', noMeetings: 'Todavía no hay reuniones.',
    reports: 'Informes de progreso para la familia', writeReport: 'Escribir un informe de progreso', from: 'Desde', to: 'Hasta', summaryLabel: 'Resumen para la familia', goalNote: (g) => `Nota sobre: ${g}`,
    saveDraft: 'Guardar borrador', release: 'Enviar a la familia', releaseQ: '¿Enviar este informe de progreso a la familia? Después no se puede cambiar.', released: (d) => `Enviado el ${d}`,
    ack: 'Leí este informe', ackNote: 'Su nota (opcional)', acked: (d) => `Leído el ${d}`, noReports: 'Todavía no hay informes de progreso.', print: 'Imprimir o guardar como PDF', printPlan: 'Imprimir el resumen del plan',
    reportTitle: (t) => `Informe de progreso de las metas (${t})`, period: (a, b) => `${a} a ${b}`, noPoints: 'No hay datos en este periodo.',
    docs: 'Documentos', docKind: 'Tipo', docKindV: { plan: 'Plan', evaluation: 'Evaluación', progress_report: 'Informe de progreso', meeting_notice: 'Aviso de reunión', prior_written_notice: 'Aviso previo por escrito', consent_form: 'Formulario de consentimiento', other: 'Otro' },
    docTitle: 'Título', docFile: 'Archivo (PDF o foto, hasta 10 MB)', upload: 'Subir', uploading: 'Cifrando y subiendo…', open: 'Abrir', noDocs: 'Todavía no hay documentos.',
    docHint: 'Los archivos se cifran en este aparato antes de subirse.', tooBig: 'Ese archivo pesa más de 10 MB.', badType: 'Elija un PDF o una foto.',
    specialists: 'Especialistas de afuera', specHint: 'Un especialista (por ejemplo, de terapia del habla) ve este plan solo después de que un tutor lo apruebe, por los días elegidos. Inicia sesión con verificación en dos pasos.',
    invite: 'Invitar a un especialista', email: 'Correo electrónico', days: 'Días de acceso (1 a 365)', canRecord: 'Puede registrar datos de progreso', lang: 'Idioma del correo',
    specSt: { awaiting_family: 'Esperando a la familia', approved: 'Aprobado: se envía el acceso', active: 'Activo', declined: 'Rechazado', revoked: 'Retirado', expired: 'Vencido' },
    approve: 'Aprobar', decline: 'Rechazar', revoke: 'Quitar el acceso', until: (d) => `hasta el ${d}`, noSpecs: 'No hay especialistas invitados.',
    hq: 'Soporte de Futures Friends', hqHint: 'El personal de Futures Friends nunca ve este plan, salvo que usted lo permita aquí Y la dirección abra una solicitud de soporte para ello.', hqAllow: 'Permitir que el soporte de Futures Friends vea este plan',
    todo: 'Pendientes', noTodo: 'No hay nada pendiente.', caseload: 'Casos', counts: 'Los planes de un vistazo', countsHint: 'Solo cantidades y fechas.',
    cIep: 'IEP vigentes', cIfsp: 'IFSP vigentes', cDrafts: 'Borradores', cReviews: 'Revisiones anuales en los próximos 30 días', cMeetings: 'Reuniones en los próximos 14 días', cWaiting: 'Informes sin leer por la familia', cSpecs: 'Especialistas activos', cConsent: 'Niños sin consentimiento',
    nextReviews: 'Próximas revisiones', nextMeetings: 'Próximas reuniones', open2: 'Abrir', last: 'Último dato', goalsMet: (m, n) => `${m} de ${n} metas logradas`,
    todoK: { annual_review: (f, d) => `Revisión anual de ${f}: ${d}`, reeval: (f, d) => `Reevaluación de ${f}: ${d}`, transition: (f, d) => `Transición de ${f}: ${d}`, progress_report: (f, d) => `Informe de progreso pendiente de ${f}: ${d}`,
      meeting: (f, d) => `Reunión de ${f}: ${d}`, meeting_waiting: (f) => `Hora de reunión sin elegir: ${f}`, specialist_waiting: (f) => `Un especialista espera a la familia de ${f}`, family_document: (f) => `La familia de ${f} agregó un documento`,
      report_ack: () => 'Un informe de progreso por leer', meeting_choose: () => 'Elija una hora de reunión', specialist_approve: () => 'Un especialista espera su aprobación' },
    entryIntro: 'Toque una meta y registre lo que vio.', room: 'Salón', allRooms: 'Todos mis niños', noEntry: 'No hay metas vigentes para estos niños.', recorded: 'Registrado.', today: 'Hoy',
    lastValue: (d, v) => `Último: ${v} el ${d}`, viewPlan: 'Abrir el plan', planFor: (n) => `${n}: plan de apoyo`, draftNote: 'El español es un borrador.',
    confGoals: 'Mostrar en este informe el progreso de las metas del plan de apoyo (opcional)', confGoalsHint: 'La familia ve solo las metas que marque, tal como estaban al enviarlo.', confSaveFirst: 'Primero guarde el borrador y después elija las metas.',
    confProgress: 'Metas del plan de apoyo', perLine: 'Uno por línea', transferSped: 'Enviar también los registros de educación especial (IEP / IFSP), si los hay',
  },
};
export const words = (lang) => dict(W, lang === 'es' ? 'es' : 'en');

// ---- pure helpers (tests/special-education-unit.test.mjs) ------------------------------------------------------------------------
// A wall-clock date + time ("2026-10-20", "15:30") in a time zone, as an ISO instant (DST-aware; same method as centerTimeToIso).
export function zonedIso(day, hhmm, tz) {
  const d = String(day || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); const t = String(hhmm || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!d || !t) return null;
  const wall = Date.UTC(+d[1], +d[2] - 1, +d[3], +t[1], +t[2]);
  const offsetAt = (ms) => {
    const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(new Date(ms));
    const g = (k) => Number(p.find((x) => x.type === k)?.value);
    return Date.UTC(g('year'), g('month') - 1, g('day'), g('hour') % 24, g('minute'), g('second')) - ms;
  };
  let ms = wall - offsetAt(wall);
  ms = wall - offsetAt(ms);
  return new Date(ms).toISOString();
}
// The points of a goal as an SVG line chart (no inline style: colours come from special-education.css). Accessible name from `label`.
export function chartSvg(esc, points, { unit = 'count', target = null, label = '' } = {}) {
  const pts = (points || []).filter((p) => p && p.value != null && Number.isFinite(Number(p.value)));
  if (!pts.length) return '';
  const W0 = 320, H0 = 120, L = 30, R = 8, T = 10, B = 22;
  const max = Math.max(unit === 'percent' ? 100 : unit === 'yes_no' ? 1 : 1, ...pts.map((p) => Number(p.value)), target != null ? Number(target) : 0);
  const n = pts.length;
  const x = (i) => L + (n === 1 ? (W0 - L - R) / 2 : (i * (W0 - L - R)) / (n - 1));
  const y = (v) => T + (H0 - T - B) * (1 - Number(v) / (max || 1));
  const line = pts.map((p, i) => `${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const tgt = target != null ? `<line class="sp-c-target" x1="${L}" x2="${W0 - R}" y1="${y(target).toFixed(1)}" y2="${y(target).toFixed(1)}"/>` : '';
  return `<svg class="sp-chart" viewBox="0 0 ${W0} ${H0}" role="img" aria-label="${esc(label)}" focusable="false">
    <line class="sp-c-axis" x1="${L}" x2="${L}" y1="${T}" y2="${H0 - B}"/><line class="sp-c-axis" x1="${L}" x2="${W0 - R}" y1="${H0 - B}" y2="${H0 - B}"/>
    <text class="sp-c-lbl" x="${L - 4}" y="${T + 4}" text-anchor="end">${esc(String(+max.toFixed(2)))}</text><text class="sp-c-lbl" x="${L - 4}" y="${H0 - B}" text-anchor="end">0</text>
    ${tgt}<polyline class="sp-c-line" points="${line}"/>${pts.map((p, i) => `<circle class="sp-c-dot" cx="${x(i).toFixed(1)}" cy="${y(p.value).toFixed(1)}" r="3.5"/>`).join('')}
    <text class="sp-c-lbl" x="${L}" y="${H0 - 6}">${esc(pts[0].on)}</text><text class="sp-c-lbl" x="${W0 - R}" y="${H0 - 6}" text-anchor="end">${esc(pts[n - 1].on)}</text></svg>`;
}
export const valueText = (v, unit, L) => (v == null ? '' : unit === 'percent' ? `${v}%` : unit === 'yes_no' ? (Number(v) ? '✓' : '✗') : unit === 'minutes' ? `${v} ${L.minutes.toLowerCase()}` : String(v));
// The adaptation settings of a plan accommodation as words
export const adaptWords = (s, L) => ADAPT_KEYS.filter((k) => s?.[k]).map((k) => L.adapt[k]);
// "Name, role" lines -> attendees
export function parseAttendees(text) {
  return String(text || '').split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 20).map((l) => {
    const [name, ...rest] = l.split(',');
    return { name: name.trim().slice(0, 120), role: rest.join(',').trim().slice(0, 60) };
  }).filter((a) => a.name);
}
export const attendeesText = (list) => (list || []).map((a) => [a.name, a.role].filter(Boolean).join(', ')).join('\n');
// Encrypt a file for upload (AES-256-GCM, a fresh key): { body, key (base64), iv (base64) }. Decrypt the downloaded ciphertext.
const b64 = (u8) => { let s = ''; for (const c of u8) s += String.fromCharCode(c); return btoa(s); };
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
export async function encryptFile(bytes, subtle = globalThis.crypto.subtle) {
  const key = await subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const body = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes));
  return { body, key: b64(new Uint8Array(await subtle.exportKey('raw', key))), iv: b64(iv) };
}
export async function decryptFile(body, keyB64, ivB64, subtle = globalThis.crypto.subtle) {
  const key = await subtle.importKey('raw', unb64(keyB64), 'AES-GCM', false, ['decrypt']);
  return new Uint8Array(await subtle.decrypt({ name: 'AES-GCM', iv: unb64(ivB64) }, key, body));
}
// The to-do rows (staff and family), each with its deep link
export function todoRows(items, L, { slug, allowed = null, lang = 'en', family = false } = {}) {
  const d = (x) => (x ? fmtDate(x, { month: 'short', day: 'numeric' }, lang) : '');
  return (items || []).map((it) => {
    const f = it.first || '';
    const text = (L.todoK[it.kind] || (() => it.kind))(f, it.at ? fmtDateTime(it.at, undefined, lang) : d(it.on));
    const href = family ? familyLink(slug, 'plan', { kid: it.kid, id: it.id, kind: it.kind })
      : staffLink(it.kind === 'meeting' || it.kind === 'meeting_waiting' ? 'sped-meeting' : it.kind === 'progress_report' ? 'sped-report'
        : it.kind === 'specialist_waiting' ? 'sped-specialists' : it.kind === 'family_document' ? 'sped-docs' : 'sped-plan', it.meeting || it.plan || null, { slug, allowed, kid: it.kid });
    return { kind: it.kind, text, href, urgent: !!it.overdue };
  });
}

// =================================================================================================================================
// Views
// =================================================================================================================================
export async function viewSped(ctx) {
  if (ctx.tab === 'goal-entry') return viewEntry(ctx);
  if (ctx.tab === 'plans') return viewPlans(ctx);
  return viewPlan(ctx);
}

const q = () => new URLSearchParams(location.search);
const today = () => centerToday();
const fail = (el, e, friendly) => { if (el) { el.className = 'small msg bad'; el.textContent = friendly(e); } };
const okMsg = (el, t) => { if (el) { el.className = 'small msg ok'; el.textContent = t; } };
const opt = (list, labels, cur) => list.map((v) => `<option value="${v}"${v === cur ? ' selected' : ''}>${labels[v] || v}</option>`).join('');

// ---- the plan page -----------------------------------------------------------------------------------------------------------------
async function viewPlan(ctx) {
  const { c, shell, page, rpc, esc, friendly, lang, kid } = ctx;
  const L = words(lang);
  page(shell('<p class="loading">…</p>'), L.title);
  let d;
  try { d = await rpc('sped_child', { p_center: c.center_id, p_kid: kid }); }
  catch (e) { return page(shell(`<div class="card" id="spPage" data-i18n-skip><p class="msg warn" role="alert">${esc(friendly(e))}</p></div>`), L.title); }
  const role = d.role, staff = role === 'director' || role === 'teacher', family = role === 'family';
  const writable = d.consent === 'active' && d.licensed;
  const want = q().get('plan');
  const plan = d.plans.find((p) => p.id === want) || d.plans[0] || null;
  const fd = (x) => (x ? fmtDate(x, { year: 'numeric', month: 'short', day: 'numeric' }, lang) : '—');
  const banner = d.consent !== 'active'
    ? `<p class="msg warn" id="spConsent" role="status">${esc(L.consentNeeded)}${family ? ` <a href="/c/${esc(c.slug)}/privacy?kid=${encodeURIComponent(kid)}&purpose=special_education" data-nav>${esc(L.consentLink)}</a>` : ''}</p>`
    : !d.licensed ? `<p class="msg warn" role="status">${esc(L.licenseOff)}</p>` : '';
  const tabs = d.plans.length > 1 ? `<nav class="tabs" aria-label="${esc(L.plans)}">${d.plans.map((p) => `<a href="/c/${esc(c.slug)}/child/${encodeURIComponent(kid)}/plan?plan=${encodeURIComponent(p.id)}" data-nav${p.id === plan?.id ? ' aria-current="page"' : ''}>${esc(L.type[p.plan_type])} · ${esc(L.status[p.status])}</a>`).join('')}</nav>` : '';
  const head = `<div class="card sp-head" id="spHead"><h2>${esc(L.planFor(d.name || ''))}</h2>
    ${plan ? `<p><span class="chip gold">${esc(L.type[plan.plan_type])}</span> <span class="chip ${plan.status === 'active' ? 'ok' : ''}">${esc(L.status[plan.status])}</span></p><p class="small muted">${esc(L.typeLong[plan.plan_type])}</p>` : ''}
    <p class="small muted">${esc(family ? L.privacy : L.staffPrivacy)}</p>${lang === 'es' ? `<p class="small"><span class="chip warn">${esc(L.draftNote)}</span></p>` : ''}
    ${plan ? `<div class="cta-row no-print"><button class="btn soft small" type="button" id="spPrintPlan">${esc(L.printPlan)}</button></div>` : ''}</div>`;

  const startForm = staff && writable && !d.plans.some((p) => p.status === 'draft') ? `<form class="card" id="spStart" novalidate><h3>${esc(L.start)}</h3><p class="small muted">${esc(L.startHint)}</p>
      <div class="row two"><label class="f"><span>${esc(L.type.iep)} / ${esc(L.type.ifsp)}</span><select class="i" name="plan_type">${opt(['iep', 'ifsp'], L.typeLong, 'iep')}</select></label>
      ${(d.ei_notes || []).length ? `<label class="f"><span>${esc(L.fromNote)}</span><select class="i" name="ei_note"><option value="">${esc(L.noNote)}</option>${d.ei_notes.map((n) => `<option value="${esc(n.id)}">${esc(fd(n.observed_from))} – ${esc(fd(n.observed_to))}</option>`).join('')}</select></label>` : ''}</div>
      <button class="btn navy" type="submit">${esc(L.create)}</button><p class="small msg" role="status"></p></form>` : '';

  if (!plan) {
    page(shell(`<div class="sp-page" id="spPage" data-i18n-skip>${head}${banner}<div class="card"><p class="empty">${esc(L.noPlan)}</p></div>${startForm}${docsHtml()}${specsHtml()}</div>`), L.title);
    bindCommon();
    return;
  }
  const canEdit = staff && writable && plan.status !== 'ended';
  const canRecord = d.can_record && writable && plan.status === 'active';

  function summaryHtml() {
    const row = (k, v) => `<div class="sp-kv"><dt>${esc(k)}</dt><dd>${v ? esc(v) : '—'}</dd></div>`;
    return `<section class="card sp-sec" id="spSummary" aria-labelledby="spSumH"><h3 id="spSumH">${esc(L.summary)}</h3>
      <dl class="sp-dl">${row(L.agency, plan.agency)}${row(L.startsOn, fd(plan.starts_on))}${row(L.reviewOn, fd(plan.annual_review_on))}
        ${plan.plan_type === 'iep' ? row(L.reevalOn, fd(plan.reeval_on)) : row(L.transitionOn, fd(plan.transition_on))}${plan.ends_on ? row(L.endsOn, fd(plan.ends_on)) : ''}${row(L.eligibility, plan.eligibility)}</dl>
      <h4>${esc(L.levels)}</h4><p class="sp-pre">${esc(plan.present_levels || '—')}</p>
      ${plan.plan_type === 'ifsp' || plan.family_priorities ? `<h4>${esc(L.priorities)}</h4><p class="sp-pre">${esc(plan.family_priorities || '—')}</p>` : ''}
      ${canEdit ? `<details class="no-print"><summary>${esc(L.edit)}</summary><form id="spPlanForm" novalidate>
        <label class="f"><span>${esc(L.agency)}</span><input class="i" name="agency" maxlength="200" value="${esc(plan.agency || '')}"></label>
        <div class="row two"><label class="f"><span>${esc(L.startsOn)}</span><input class="i" type="date" name="starts_on" value="${esc(plan.starts_on || '')}"></label>
          <label class="f"><span>${esc(L.reviewOn)}</span><input class="i" type="date" name="annual_review_on" value="${esc(plan.annual_review_on || '')}"></label></div>
        <div class="row two"><label class="f"><span>${esc(L.reevalOn)}</span><input class="i" type="date" name="reeval_on" value="${esc(plan.reeval_on || '')}"></label>
          <label class="f"><span>${esc(L.transitionOn)}</span><input class="i" type="date" name="transition_on" value="${esc(plan.transition_on || '')}"></label></div>
        <label class="f"><span>${esc(L.eligibility)}</span><input class="i" name="eligibility" maxlength="500" value="${esc(plan.eligibility || '')}"></label>
        <label class="f"><span>${esc(L.levels)}</span><textarea class="i" name="present_levels" rows="4" maxlength="6000">${esc(plan.present_levels || '')}</textarea></label>
        <label class="f"><span>${esc(L.priorities)}</span><textarea class="i" name="family_priorities" rows="3" maxlength="3000">${esc(plan.family_priorities || '')}</textarea></label>
        <button class="btn navy small" type="submit">${esc(L.save)}</button><p class="small msg" role="status"></p></form></details>` : ''}
      ${role === 'director' && writable && plan.status === 'draft' ? `<div class="no-print"><p class="small muted">${esc(L.activateHint)}</p><button class="btn gold small" type="button" id="spActivate">${esc(L.activate)}</button></div>` : ''}
      ${role === 'director' && plan.status !== 'ended' && writable ? `<details class="no-print"><summary class="small">${esc(L.end)}</summary><form id="spEndForm" novalidate><label class="f"><span>${esc(L.endReason)}</span><input class="i" name="reason" maxlength="500" required></label>
        <button class="btn soft small" type="submit">${esc(L.end)}</button></form></details>` : ''}
      <p class="small msg" id="spSumMsg" role="status"></p></section>`;
  }

  function goalHtml(g) {
    const data = g.data || [];
    return `<article class="sp-goal" data-goal="${esc(g.id)}"><header class="sp-goal-h"><span class="chip">${esc(L.areaV[g.area] || g.area)}</span> <span class="chip ${g.status === 'met' ? 'ok' : g.status === 'not_met' ? 'bad' : g.status === 'progressing' ? 'gold' : ''}">${esc(L.st[g.status])}</span></header>
      <p class="sp-goal-t"><b>${esc(g.goal)}</b></p>
      ${g.measure || g.baseline || g.target_value != null || g.target_on ? `<p class="small">${g.measure ? `${esc(L.measure)}: ${esc(g.measure)}. ` : ''}${g.baseline ? `${esc(L.baseline)}: ${esc(g.baseline)}. ` : ''}${g.target_value != null ? `${esc(L.target)}: ${esc(valueText(g.target_value, g.unit, L))}. ` : ''}${g.target_on ? `${esc(L.targetOn)} ${esc(fd(g.target_on))}.` : ''}</p>` : ''}
      ${(g.objectives || []).length ? `<h4 class="sp-h5">${esc(L.objectives)}</h4><ol class="sp-obj">${g.objectives.map((o) => `<li>${esc(o.objective)} <span class="chip">${esc(L.st[o.status])}</span></li>`).join('')}</ol>` : ''}
      ${(g.steps || []).length ? `<p class="small"><b>${esc(L.steps)}:</b> ${g.steps.map((s) => `${esc((lang === 'es' && s.text_es) || (family ? s.family_en || s.text_en : s.text_en))}${s.checks && s.checks.results ? ` <span class="mini muted">(${esc(L.checksLine(s.checks.results, s.checks.points, s.checks.max))})</span>` : ''}`).join(' · ')}</p>` : ''}
      ${chartSvg(esc, data, { unit: g.unit, target: g.target_value, label: L.chart(g.goal) })}
      <details class="sp-data"><summary class="small">${esc(L.data)} (${data.length})</summary>${data.length ? `<table class="t sp-table"><thead><tr><th scope="col">${esc(L.on)}</th><th scope="col">${esc(L.value)}</th><th scope="col">${esc(L.note)}</th><th scope="col"><span class="sr-only">${esc(L.remove)}</span></th></tr></thead><tbody>
        ${data.map((p) => `<tr><td>${esc(fd(p.on))}</td><td>${esc(valueText(p.value, g.unit, L))}${p.measure ? ` · ${esc(p.measure)}` : ''}</td><td>${esc(p.note || '')} <span class="mini muted">(${esc(L.by[p.by] || p.by)})</span></td>
          <td>${(p.mine || role === 'director') && writable ? `<button class="btn link small no-print" type="button" data-rmpoint="${esc(p.id)}">${esc(L.remove)}</button>` : ''}</td></tr>`).join('')}</tbody></table>` : `<p class="small muted">${esc(L.noData)}</p>`}</details>
      ${canRecord ? `<form class="sp-record no-print" data-record="${esc(g.id)}" novalidate><div class="row three"><label class="f"><span>${esc(L.on)}</span><input class="i" type="date" name="on" value="${today()}" max="${today()}" required></label>
        <label class="f"><span>${esc(L.value)} (${esc(L.unitV[g.unit])})</span><input class="i" type="number" name="value" min="0" ${g.unit === 'percent' ? 'max="100"' : g.unit === 'yes_no' ? 'max="1"' : ''} step="any" inputmode="decimal"></label>
        <label class="f"><span>${esc(L.measureNote)}</span><input class="i" name="measure" maxlength="200"></label></div>
        <label class="f"><span>${esc(L.note)}</span><input class="i" name="note" maxlength="1000"></label><button class="btn navy small" type="submit">${esc(L.record)}</button><p class="small msg" role="status"></p></form>` : ''}
      ${canEdit ? `<div class="sp-goal-tools no-print"><label class="f sp-inline"><span>${esc(L.setStatus)}</span><select class="i" data-gstatus="${esc(g.id)}">${opt(STATUSES, L.st, g.status)}</select></label>
        <button class="btn link small" type="button" data-steps="${esc(g.id)}">${esc(L.linkSteps)}</button>
        <button class="btn link small" type="button" data-rm="goal:${esc(g.id)}">${esc(L.remove)}</button></div>` : ''}</article>`;
  }
  function goalsHtml() {
    return `<section class="card sp-sec" id="spGoals" aria-labelledby="spGoalsH"><h3 id="spGoalsH">${esc(L.goals)}</h3>${(plan.goals || []).map(goalHtml).join('') || `<p class="empty">—</p>`}
      ${canEdit ? `<details class="no-print"><summary>${esc(L.addGoal)}</summary><form id="spGoalForm" novalidate>
        <div class="row two"><label class="f"><span>${esc(L.area)}</span><select class="i" name="area">${opt(AREAS, L.areaV, 'communication')}</select></label>
          <label class="f"><span>${esc(L.unit)}</span><select class="i" name="unit">${opt(UNITS, L.unitV, 'count')}</select></label></div>
        <label class="f"><span>${esc(L.goal)}</span><textarea class="i" name="goal" rows="2" minlength="10" maxlength="2000" required></textarea></label>
        <label class="f"><span>${esc(L.measure)}</span><input class="i" name="measure" maxlength="300"></label><label class="f"><span>${esc(L.baseline)}</span><input class="i" name="baseline" maxlength="500"></label>
        <div class="row two"><label class="f"><span>${esc(L.target)}</span><input class="i" type="number" name="target_value" min="0" step="any"></label><label class="f"><span>${esc(L.targetOn)}</span><input class="i" type="date" name="target_on"></label></div>
        <label class="f"><span>${esc(L.objectives)}</span><textarea class="i" name="objectives" rows="3" maxlength="3000" placeholder="${esc(L.perLine)}"></textarea></label>
        <button class="btn navy small" type="submit">${esc(L.addGoal)}</button><p class="small msg" role="status"></p></form></details>` : ''}</section>`;
  }
  function listSection(id, title, rows, form) {
    return `<section class="card sp-sec" id="${id}" aria-labelledby="${id}H"><h3 id="${id}H">${esc(title)}</h3>${rows || '<p class="empty">—</p>'}${form || ''}</section>`;
  }
  function servicesHtml() {
    const rows = (plan.services || []).length ? `<ul class="list">${plan.services.map((s) => `<li><span class="who"><b>${esc(L.serviceV[s.service] || s.service)}</b><span class="small">${esc(L.svcLine(s.minutes, s.times, L.perV[s.per]))} · ${esc(L.locationV[s.location])}${s.provider ? ` · ${esc(s.provider)}` : ''}</span>${s.note ? `<span class="small muted">${esc(s.note)}</span>` : ''}</span>
      ${canEdit ? `<button class="btn link small no-print" type="button" data-rm="service:${esc(s.id)}">${esc(L.remove)}</button>` : ''}</li>`).join('')}</ul>` : '';
    const form = canEdit ? `<details class="no-print"><summary>${esc(L.addService)}</summary><form id="spSvcForm" novalidate><div class="row two"><label class="f"><span>${esc(L.service)}</span><select class="i" name="service">${opt(SERVICES, L.serviceV, 'speech_language')}</select></label>
      <label class="f"><span>${esc(L.location)}</span><select class="i" name="location">${opt(LOCATIONS, L.locationV, 'in_classroom')}</select></label></div>
      <div class="row three"><label class="f"><span>${esc(L.minutes)}</span><input class="i" type="number" name="minutes" min="5" max="600" value="30" required></label><label class="f"><span>${esc(L.times)}</span><input class="i" type="number" name="times" min="1" max="31" value="1" required></label>
      <label class="f"><span>${esc(L.per)}</span><select class="i" name="per">${opt(['day', 'week', 'month'], L.perV, 'week')}</select></label></div>
      <label class="f"><span>${esc(L.provider)}</span><input class="i" name="provider" maxlength="200"></label><label class="f"><span>${esc(L.note)}</span><input class="i" name="note" maxlength="1000"></label>
      <button class="btn navy small" type="submit">${esc(L.addService)}</button><p class="small msg" role="status"></p></form></details>` : '';
    return listSection('spServices', L.services, rows, form);
  }
  function accomHtml() {
    const rows = (plan.accommodations || []).length ? `<ul class="list">${plan.accommodations.map((a) => `<li><span class="who"><b>${esc(L.kindV[a.kind])}</b><span>${esc(a.description)}</span>
      ${adaptWords(a.adapt_settings, L).length ? `<span class="small muted">${esc(L.adaptOn)} ${esc(adaptWords(a.adapt_settings, L).join(', '))}</span>` : ''}</span>
      ${canEdit ? `<button class="btn link small no-print" type="button" data-rm="accommodation:${esc(a.id)}">${esc(L.remove)}</button>` : ''}</li>`).join('')}</ul>` : '';
    const form = canEdit ? `<details class="no-print"><summary>${esc(L.addAccom)}</summary><form id="spAccForm" novalidate><label class="f"><span>${esc(L.kindV.accommodation)}</span><select class="i" name="kind">${opt(['accommodation', 'modification', 'supplementary_aid'], L.kindV, 'accommodation')}</select></label>
      <label class="f"><span>${esc(L.description)}</span><textarea class="i" name="description" rows="2" maxlength="1000" required></textarea></label>
      <fieldset class="f"><legend>${esc(L.adaptLink)}</legend><div class="sp-checks">${ADAPT_KEYS.map((k) => `<label class="sp-check"><input type="checkbox" name="adapt" value="${k}"><span>${esc(L.adapt[k])}</span></label>`).join('')}</div></fieldset>
      <button class="btn navy small" type="submit">${esc(L.addAccom)}</button><p class="small msg" role="status"></p></form></details>
      ${plan.status === 'active' ? `<button class="btn soft small no-print" type="button" id="spApply">${esc(L.applyNow)}</button>` : ''}` : '';
    return listSection('spAccom', L.accom, rows, form);
  }
  function teamHtml() {
    const rows = (plan.team || []).length ? `<ul class="list">${plan.team.map((t) => `<li><span class="who"><b>${esc(t.name)}</b><span class="small">${esc(L.roleV[t.role] || t.role)}${t.organization ? ` · ${esc(t.organization)}` : ''}${t.contact ? ` · ${esc(t.contact)}` : ''}</span></span>
      ${canEdit ? `<button class="btn link small no-print" type="button" data-rm="team:${esc(t.id)}">${esc(L.remove)}</button>` : ''}</li>`).join('')}</ul>` : '';
    const form = canEdit ? `<details class="no-print"><summary>${esc(L.addMember)}</summary><form id="spTeamForm" novalidate><div class="row two"><label class="f"><span>${esc(L.name)}</span><input class="i" name="name" maxlength="120" required></label>
      <label class="f"><span>${esc(L.role)}</span><select class="i" name="role">${opt(TEAM_ROLES, L.roleV, 'slp')}</select></label></div>
      <div class="row two"><label class="f"><span>${esc(L.org)}</span><input class="i" name="organization" maxlength="200"></label><label class="f"><span>${esc(L.contact)}</span><input class="i" name="contact" maxlength="200"></label></div>
      <button class="btn navy small" type="submit">${esc(L.addMember)}</button><p class="small msg" role="status"></p></form></details>` : '';
    return listSection('spTeam', L.team, rows, form);
  }
  function meetingsHtml() {
    const rows = (plan.meetings || []).length ? `<ul class="list sp-meetings">${plan.meetings.map((m) => `<li data-meeting="${esc(m.id)}"><span class="who"><b>${esc(L.purposeV[m.purpose])}</b>
        <span class="small">${esc(L.mst[m.status])}${m.starts_at ? ` · ${esc(fmtDateTime(m.starts_at, undefined, lang))}` : ''} · ${esc(L.howV[m.how])}${m.place ? ` · ${esc(m.place)}` : ''}</span>
        ${m.notes ? `<span class="small sp-pre">${esc(m.notes)}</span>` : ''}${(m.attendees || []).length ? `<span class="small muted">${esc(attendeesText(m.attendees).replace(/\n/g, '; '))}</span>` : ''}
        ${m.status === 'proposed' && (family || staff) && writable ? `<span class="sp-opts no-print">${m.options.map((o) => `<button class="btn soft small" type="button" data-choose="${esc(m.id)}" data-at="${esc(o)}">${esc(L.pickTime)}: ${esc(fmtDateTime(o, undefined, lang))}</button>`).join('')}</span>` : ''}</span>
      ${canEdit && ['proposed', 'scheduled'].includes(m.status) ? `<button class="btn link small no-print" type="button" data-mcancel="${esc(m.id)}">${esc(L.cancelMeeting)}</button>` : ''}
      ${canEdit && ['scheduled', 'held'].includes(m.status) && new Date(m.starts_at).getTime() <= Date.now() + 3600000 ? `<form class="sp-mnotes no-print" data-mnotes="${esc(m.id)}" novalidate><label class="f"><span>${esc(L.notes)}</span><textarea class="i" name="notes" rows="3" maxlength="6000">${esc(m.notes || '')}</textarea></label>
        <label class="f"><span>${esc(L.attendees)}</span><textarea class="i" name="attendees" rows="3">${esc(attendeesText(m.attendees))}</textarea></label><button class="btn navy small" type="submit">${esc(L.recordMeeting)}</button></form>` : ''}</li>`).join('')}</ul>` : `<p class="empty">${esc(L.noMeetings)}</p>`;
    const form = canEdit ? `<details class="no-print"><summary>${esc(L.offer)}</summary><form id="spMeetForm" novalidate><p class="small muted">${esc(L.offerHint)}</p>
      <div class="row three"><label class="f"><span>${esc(L.purpose)}</span><select class="i" name="purpose">${opt(['initial', 'annual_review', 'review', 'transition', 'progress', 'other'], L.purposeV, 'review')}</select></label>
        <label class="f"><span>${esc(L.how)}</span><select class="i" name="how">${opt(['in_person', 'phone', 'video'], L.howV, 'in_person')}</select></label>
        <label class="f"><span>${esc(L.minutes)}</span><input class="i" type="number" name="minutes" min="15" max="240" value="60"></label></div>
      ${[1, 2, 3, 4].map((n) => `<div class="row two"><label class="f"><span>${esc(L.option(n))}</span><input class="i" type="date" name="d${n}" min="${today()}"${n === 1 ? ' required' : ''}></label><label class="f"><span><span class="sr-only">${esc(L.option(n))} </span>${esc(L.on)}</span><input class="i" type="time" name="t${n}"${n === 1 ? ' required' : ''}></label></div>`).join('')}
      <label class="f"><span>${esc(L.place)}</span><input class="i" name="place" maxlength="300"></label><label class="sp-check"><input type="checkbox" name="confirm"><span>${esc(L.confirmOne)}</span></label>
      <button class="btn navy small" type="submit">${esc(L.offer)}</button><p class="small msg" role="status"></p></form></details>` : '';
    return listSection('spMeetings', L.meetings, rows, form);
  }
  function reportsHtml() {
    const reps = plan.progress_reports || [];
    const goalTitle = (id) => (plan.goals.find((g) => g.id === id)?.goal || '').slice(0, 80);
    const rows = reps.length ? reps.map((r) => r.status === 'released' ? `<article class="sp-report" data-report="${esc(r.id)}">${reportBodyHtml(esc, r, L, lang, d.name, plan.plan_type, c.name)}
        <div class="cta-row no-print"><button class="btn soft small" type="button" data-printreport="${esc(r.id)}">${esc(L.print)}</button></div>
        ${r.family_ack_at ? `<p class="small ok">${esc(L.acked(fd(r.family_ack_at)))}${r.family_note ? `: ${esc(r.family_note)}` : ''}</p>` : ''}
        ${family && !r.family_ack_at ? `<form class="no-print" data-ack="${esc(r.id)}" novalidate><label class="f"><span>${esc(L.ackNote)}</span><textarea class="i" name="note" rows="2" maxlength="2000"></textarea></label><button class="btn navy small" type="submit">${esc(L.ack)}</button><p class="small msg" role="status"></p></form>` : ''}</article>`
      : `<article class="sp-report sp-draft" data-report="${esc(r.id)}"><p><span class="chip">${esc(L.status.draft)}</span> ${esc(L.period(fd(r.from), fd(r.to)))}</p>${canEdit ? reportFormHtml(r) : ''}</article>`).join('') : `<p class="empty">${esc(L.noReports)}</p>`;
    function reportFormHtml(r) {
      return `<form class="sp-repform no-print" data-repform="${esc(r?.id || '')}" novalidate><div class="row two"><label class="f"><span>${esc(L.from)}</span><input class="i" type="date" name="from" value="${esc(r?.from || '')}" required></label>
        <label class="f"><span>${esc(L.to)}</span><input class="i" type="date" name="to" value="${esc(r?.to || today())}" required></label></div>
        <label class="f"><span>${esc(L.summaryLabel)}</span><textarea class="i" name="summary" rows="3" maxlength="4000">${esc(r?.summary || '')}</textarea></label>
        ${plan.goals.map((g) => `<label class="f"><span>${esc(L.goalNote(goalTitle(g.id)))}</span><input class="i" data-gnote="${esc(g.id)}" maxlength="1000" value="${esc(r?.goal_notes?.[g.id] || '')}"></label>`).join('')}
        <div class="cta-row"><button class="btn soft small" type="submit">${esc(L.saveDraft)}</button>${r ? `<button class="btn gold small" type="button" data-release="${esc(r.id)}">${esc(L.release)}</button>` : ''}</div><p class="small msg" role="status"></p></form>`;
    }
    const form = canEdit && plan.status === 'active' && !reps.some((r) => r.status === 'draft') ? `<details class="no-print"><summary>${esc(L.writeReport)}</summary>${reportFormHtml(null)}</details>` : '';
    return listSection('spReports', L.reports, rows, form);
  }
  function docsHtml() {
    const docs = d.documents || [];
    const canUp = writable && ['director', 'teacher', 'family', 'specialist'].includes(role);
    return `<section class="card sp-sec no-print" id="spDocs" aria-labelledby="spDocsH"><h3 id="spDocsH">${esc(L.docs)}</h3>
      ${docs.length ? `<ul class="list">${docs.map((x) => `<li data-doc="${esc(x.id)}"><span class="who"><b>${esc(x.title)}</b><span class="small muted">${esc(L.docKindV[x.kind] || x.kind)} · ${esc(fd(x.at))} · ${esc(L.by[x.by] || (x.by === 'family' ? L.roleV.family : x.by))}</span></span>
        <span><button class="btn soft small" type="button" data-opendoc="${esc(x.id)}">${esc(L.open)}</button>${x.mine || role === 'director' ? ` <button class="btn link small" type="button" data-rmdoc="${esc(x.id)}">${esc(L.remove)}</button>` : ''}</span></li>`).join('')}</ul>` : `<p class="empty">${esc(L.noDocs)}</p>`}
      ${canUp ? `<form id="spDocForm" novalidate><p class="small muted">${esc(L.docHint)}</p><div class="row two"><label class="f"><span>${esc(L.docTitle)}</span><input class="i" name="title" maxlength="200" required></label>
        <label class="f"><span>${esc(L.docKind)}</span><select class="i" name="kind">${opt(DOC_KINDS, L.docKindV, 'plan')}</select></label></div>
        <label class="f"><span>${esc(L.docFile)}</span><input class="i" type="file" name="file" accept="application/pdf,image/png,image/jpeg,image/heic,image/heif,image/webp" required></label>
        <button class="btn navy small" type="submit">${esc(L.upload)}</button><p class="small msg" role="status"></p></form>` : ''}<p class="small msg" id="spDocMsg" role="status"></p></section>`;
  }
  function specsHtml() {
    if (!['director', 'teacher', 'family'].includes(role)) return '';
    const list = d.specialists || [];
    const P = plan;
    return `<section class="card sp-sec no-print" id="spSpecialists" aria-labelledby="spSpecH"><h3 id="spSpecH">${esc(L.specialists)}</h3><p class="small muted">${esc(L.specHint)}</p>
      ${list.length ? `<ul class="list">${list.map((s) => `<li data-spec="${esc(s.id)}"><span class="who"><b>${esc(s.name)}</b><span class="small">${esc(L.roleV[s.role] || s.role)}${s.email ? ` · ${esc(s.email)}` : ''} · ${esc(L.specSt[s.status] || s.status)}${s.expires_on ? ` ${esc(L.until(fd(s.expires_on)))}` : ` · ${s.days} d`}</span></span>
        <span>${family && s.status === 'awaiting_family' && writable ? `<button class="btn navy small" type="button" data-specok="${esc(s.id)}">${esc(L.approve)}</button> <button class="btn soft small" type="button" data-specno="${esc(s.id)}">${esc(L.decline)}</button>` : ''}
        ${(family || role === 'director') && ['awaiting_family', 'approved', 'active'].includes(s.status) ? ` <button class="btn link small" type="button" data-specrevoke="${esc(s.id)}">${esc(L.revoke)}</button>` : ''}</span></li>`).join('')}</ul>` : `<p class="empty">${esc(L.noSpecs)}</p>`}
      ${role === 'director' && P && P.status !== 'ended' && writable ? `<details><summary>${esc(L.invite)}</summary><form id="spSpecForm" novalidate><div class="row two"><label class="f"><span>${esc(L.name)}</span><input class="i" name="name" maxlength="120" required></label>
        <label class="f"><span>${esc(L.email)}</span><input class="i" type="email" name="email" maxlength="254" required></label></div>
        <div class="row three"><label class="f"><span>${esc(L.role)}</span><select class="i" name="role">${opt(SPEC_ROLES, L.roleV, 'slp')}</select></label><label class="f"><span>${esc(L.days)}</span><input class="i" type="number" name="days" min="1" max="365" value="90" required></label>
        <label class="f"><span>${esc(L.lang)}</span><select class="i" name="lang"><option value="en">English</option><option value="es">Español</option></select></label></div>
        <label class="sp-check"><input type="checkbox" name="can_record" checked><span>${esc(L.canRecord)}</span></label><button class="btn navy small" type="submit">${esc(L.invite)}</button><p class="small msg" role="status"></p></form></details>` : ''}
      ${family && P ? `<div class="sp-hq"><h4>${esc(L.hq)}</h4><p class="small muted">${esc(L.hqHint)}</p><label class="sp-check"><input type="checkbox" id="spHqOk"${P.hq_support_ok ? ' checked' : ''}><span>${esc(L.hqAllow)}</span></label></div>` : ''}
      <p class="small msg" id="spSpecMsg" role="status"></p></section>`;
  }

  page(shell(`<div class="sp-page" id="spPage" data-i18n-skip>${tabs}<div id="spPrintable">${head}${banner}${summaryHtml()}${goalsHtml()}${servicesHtml()}${accomHtml()}${teamHtml()}${meetingsHtml()}</div>${reportsHtml()}${docsHtml()}${specsHtml()}${startForm}</div>`), L.title);
  bindCommon();
  bindPlan();

  // ---- behaviour ----------------------------------------------------------------------------------------------------------------
  function reload() { return viewPlan(ctx); }
  function msgOf(el) { return el.querySelector('.msg') || document.getElementById('spSumMsg'); }
  function bindCommon() {
    const start = document.getElementById('spStart');
    if (start) start.addEventListener('submit', async (e) => {
      e.preventDefault();
      const p = { plan_type: start.plan_type.value }; if (start.ei_note && start.ei_note.value) p.ei_note = start.ei_note.value;
      try { const r = await rpc('sped_plan_save', { p_center: c.center_id, p_kid: kid, p_plan: null, p }); ctx.go(`/c/${c.slug}/child/${encodeURIComponent(kid)}/plan?plan=${r.id}`); }
      catch (err) { fail(msgOf(start), err, friendly); }
    });
    const df = document.getElementById('spDocForm');
    if (df) df.addEventListener('submit', async (e) => {
      e.preventDefault();
      const m = msgOf(df); const f = df.file.files[0];
      if (!f) return;
      if (f.size > MAX_FILE) { m.className = 'small msg bad'; m.textContent = L.tooBig; return; }
      if (!/^(application\/pdf|image\/(png|jpeg|heic|heif|webp))$/.test(f.type)) { m.className = 'small msg bad'; m.textContent = L.badType; return; }
      m.className = 'small msg info'; m.textContent = L.uploading;
      try {
        const enc = await encryptFile(new Uint8Array(await f.arrayBuffer()));
        const path = `${c.center_id}/${kid}/${crypto.randomUUID()}.bin`;
        const up = await ctx.client().storage.from('sped-records').upload(path, enc.body, { contentType: 'application/octet-stream' });
        if (up.error) throw up.error;
        await rpc('sped_document_add', { p_center: c.center_id, p_kid: kid, p_plan: plan?.id || null, p_path: path, p_kind: df.kind.value, p_title: df.title.value, p_mime: f.type, p_size: f.size, p_key: enc.key, p_iv: enc.iv });
        ctx.live(L.saved); reload();
      } catch (err) { fail(m, err, friendly); }
    });
    const docs = document.getElementById('spDocs');
    if (docs) docs.addEventListener('click', async (e) => {
      const o = e.target.closest('[data-opendoc]'); const r = e.target.closest('[data-rmdoc]'); const m = document.getElementById('spDocMsg');
      try {
        if (o) {
          const x = await rpc('sped_document_open', { p_id: o.dataset.opendoc });
          const s = await ctx.client().storage.from(x.bucket).createSignedUrl(x.path, 60);
          if (s.error) throw s.error;
          const body = new Uint8Array(await (await fetch(s.data.signedUrl, { cache: 'no-store' })).arrayBuffer());
          const plain = await decryptFile(body, x.key, x.iv);
          const url = URL.createObjectURL(new Blob([plain], { type: x.mime }));
          const a = document.createElement('a'); a.href = url; a.download = `${String(x.title || 'document').replace(/[^\w.-]+/g, '_').slice(0, 60)}${x.mime === 'application/pdf' ? '.pdf' : ''}`;
          a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
        }
        if (r) { await rpc('sped_document_remove', { p_id: r.dataset.rmdoc }); reload(); }
      } catch (err) { fail(m, err, friendly); }
    });
    const sp = document.getElementById('spSpecialists');
    if (sp) {
      sp.addEventListener('click', async (e) => {
        const ok = e.target.closest('[data-specok]'), no = e.target.closest('[data-specno]'), rv = e.target.closest('[data-specrevoke]'); const m = document.getElementById('spSpecMsg');
        try {
          if (ok || no) { await rpc('sped_specialist_decide', { p_id: (ok || no).dataset[ok ? 'specok' : 'specno'], p_approve: !!ok }); reload(); }
          if (rv) { await rpc('sped_specialist_revoke', { p_id: rv.dataset.specrevoke, p_reason: null }); reload(); }
        } catch (err) { fail(m, err, friendly); }
      });
      const hq = document.getElementById('spHqOk');
      if (hq) hq.addEventListener('change', async () => { try { await rpc('sped_hq_support_set', { p_plan: plan.id, p_ok: hq.checked }); okMsg(document.getElementById('spSpecMsg'), L.saved); } catch (err) { hq.checked = !hq.checked; fail(document.getElementById('spSpecMsg'), err, friendly); } });
      const f = document.getElementById('spSpecForm');
      if (f) f.addEventListener('submit', async (e) => {
        e.preventDefault();
        try { await rpc('sped_specialist_invite', { p_plan: plan.id, p_email: f.email.value, p_name: f.name.value, p_role: f.role.value, p_days: Number(f.days.value), p_can_record: f.can_record.checked, p_lang: f.lang.value }); reload(); }
        catch (err) { fail(msgOf(f), err, friendly); }
      });
    }
    // deep links: ?s=docs|reports|specialists|goals, ?meeting=, ?report=
    const s = q().get('s'), mt = q().get('meeting'), rp = q().get('report');
    const sec = { docs: 'spDocs', reports: 'spReports', specialists: 'spSpecialists', goals: 'spGoals', meetings: 'spMeetings' }[s];
    if (mt) { const el = document.querySelector(`[data-meeting="${cssValue(mt)}"]`); if (el) deepFocus(el); else deepMiss('any', lang); }
    else if (rp) { const el = document.querySelector(`[data-report="${cssValue(rp)}"]`); if (el) deepFocus(el); else deepMiss('any', lang); }
    else if (sec && document.getElementById(sec)) deepFocus(document.getElementById(sec));
  }
  function bindPlan() {
    const P = plan;
    const pr = document.getElementById('spPrintPlan'); if (pr) pr.addEventListener('click', () => printEl(document.getElementById('spPrintable')));
    const form = (id, fn) => { const f = document.getElementById(id); if (f) f.addEventListener('submit', async (e) => { e.preventDefault(); try { await fn(f); reload(); } catch (err) { fail(msgOf(f), err, friendly); } }); };
    form('spPlanForm', (f) => rpc('sped_plan_save', { p_center: c.center_id, p_kid: kid, p_plan: P.id, p: Object.fromEntries(['agency', 'starts_on', 'annual_review_on', 'reeval_on', 'transition_on', 'eligibility', 'present_levels', 'family_priorities'].map((k) => [k, f[k].value || null])) }));
    form('spEndForm', (f) => rpc('sped_plan_end', { p_plan: P.id, p_reason: f.reason.value }));
    form('spGoalForm', (f) => rpc('sped_goal_save', { p_plan: P.id, p_id: null, p: { area: f.area.value, unit: f.unit.value, goal: f.goal.value, measure: f.measure.value || null, baseline: f.baseline.value || null,
      target_value: f.target_value.value === '' ? null : Number(f.target_value.value), target_on: f.target_on.value || null,
      objectives: f.objectives.value.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 10).map((objective) => ({ objective })) } }));
    form('spSvcForm', (f) => rpc('sped_service_save', { p_plan: P.id, p_id: null, p: { service: f.service.value, location: f.location.value, minutes: Number(f.minutes.value), times: Number(f.times.value), per: f.per.value, provider: f.provider.value || null, note: f.note.value || null } }));
    form('spAccForm', (f) => rpc('sped_accommodation_save', { p_plan: P.id, p_id: null, p: { kind: f.kind.value, description: f.description.value,
      adapt_settings: Object.fromEntries([...f.querySelectorAll('[name="adapt"]:checked')].map((x) => [x.value, true])) } }));
    form('spTeamForm', (f) => rpc('sped_team_save', { p_plan: P.id, p_id: null, p: { name: f.name.value, role: f.role.value, organization: f.organization.value || null, contact: f.contact.value || null } }));
    form('spMeetForm', (f) => {
      const options = [1, 2, 3, 4].map((n) => zonedIso(f[`d${n}`].value, f[`t${n}`].value, d.time_zone || centerTz())).filter(Boolean);
      return rpc('sped_meeting_propose', { p_plan: P.id, p: { purpose: f.purpose.value, how: f.how.value, minutes: Number(f.minutes.value) || 60, place: f.place.value || null, options, confirm: f.confirm.checked } });
    });
    const act = document.getElementById('spActivate'); if (act) act.addEventListener('click', async () => { try { await rpc('sped_plan_activate', { p_plan: P.id }); reload(); } catch (err) { fail(document.getElementById('spSumMsg'), err, friendly); } });
    const ap = document.getElementById('spApply'); if (ap) ap.addEventListener('click', async () => { try { await rpc('sped_accommodations_apply', { p_plan: P.id }); ctx.live(L.saved); } catch (err) { ctx.live(friendly(err)); } });
    const page0 = document.getElementById('spPage');
    page0.addEventListener('click', async (e) => {
      const rm = e.target.closest('[data-rm]'), rp = e.target.closest('[data-rmpoint]'), ch = e.target.closest('[data-choose]'), mc = e.target.closest('[data-mcancel]');
      const rel = e.target.closest('[data-release]'), prr = e.target.closest('[data-printreport]'), st = e.target.closest('[data-steps]');
      try {
        if (rm) { const [kind, id] = rm.dataset.rm.split(':'); await rpc('sped_item_remove', { p_kind: kind, p_id: id }); return reload(); }
        if (rp) { await rpc('sped_data_remove', { p_id: rp.dataset.rmpoint }); return reload(); }
        if (ch) { await rpc('sped_meeting_choose', { p_meeting: ch.dataset.choose, p_starts: ch.dataset.at }); return reload(); }
        if (mc) { await rpc('sped_meeting_cancel', { p_meeting: mc.dataset.mcancel }); return reload(); }
        if (rel) { if (!window.confirm(L.releaseQ)) return; await rpc('sped_report_release', { p_id: rel.dataset.release }); return reload(); }
        if (prr) return printEl(prr.closest('.sp-report'));
        if (st) return pickSteps(st.dataset.steps);
      } catch (err) { ctx.live(friendly(err)); const m = e.target.closest('form, .sp-goal, li')?.querySelector('.msg'); fail(m, err, friendly); }
    });
    page0.addEventListener('change', async (e) => {
      const s = e.target.closest('[data-gstatus]'); if (!s) return;
      try { await rpc('sped_goal_status', { p_goal: s.dataset.gstatus, p_status: s.value }); ctx.live(L.saved); } catch (err) { ctx.live(friendly(err)); }
    });
    page0.addEventListener('submit', async (e) => {
      const f = e.target;
      if (f.matches('[data-record]')) {
        e.preventDefault();
        try { await rpc('sped_data_add', { p_goal: f.dataset.record, p_on: f.on.value, p_value: f.value.value === '' ? null : Number(f.value.value), p_measure: f.measure.value || null, p_note: f.note.value || null, p_objective: null }); reload(); }
        catch (err) { fail(msgOf(f), err, friendly); }
      } else if (f.matches('[data-mnotes]')) {
        e.preventDefault();
        try { await rpc('sped_meeting_record', { p_meeting: f.dataset.mnotes, p_notes: f.notes.value, p_attendees: parseAttendees(f.attendees.value) }); reload(); } catch (err) { ctx.live(friendly(err)); }
      } else if (f.matches('[data-ack]')) {
        e.preventDefault();
        try { await rpc('sped_report_ack', { p_id: f.dataset.ack, p_note: f.note.value || null }); reload(); } catch (err) { fail(msgOf(f), err, friendly); }
      } else if (f.matches('[data-repform]')) {
        e.preventDefault();
        const notes = Object.fromEntries([...f.querySelectorAll('[data-gnote]')].filter((x) => x.value.trim()).map((x) => [x.dataset.gnote, x.value.trim()]));
        try { await rpc('sped_report_save', { p_plan: P.id, p_id: f.dataset.repform || null, p_from: f.from.value, p_to: f.to.value, p_summary: f.summary.value || null, p_goal_notes: notes }); reload(); }
        catch (err) { fail(msgOf(f), err, friendly); }
      }
    });
  }
  async function pickSteps(goalId) {
    const g = plan.goals.find((x) => x.id === goalId);
    const r = await ctx.client().from('skill_steps').select('id, text_en, band').order('band').order('id');
    const art = document.querySelector(`[data-goal="${cssValue(goalId)}"]`);
    if (r.error || !art) return ctx.live(friendly(r.error || 'not found'));
    const have = new Set((g.steps || []).map((s) => s.id));
    const box = document.createElement('form'); box.className = 'sp-stepsform no-print'; box.noValidate = true;
    box.innerHTML = `<fieldset class="f"><legend>${esc(L.linkSteps)}</legend><div class="sp-checks sp-steplist">${r.data.map((s) => `<label class="sp-check"><input type="checkbox" name="step" value="${esc(s.id)}"${have.has(s.id) ? ' checked' : ''}><span>${esc(s.text_en)} <span class="mini muted">${esc(s.band)}</span></span></label>`).join('')}</div></fieldset>
      <button class="btn navy small" type="submit">${esc(L.save)}</button><p class="small msg" role="status"></p>`;
    art.appendChild(box);
    box.addEventListener('submit', async (e) => { e.preventDefault(); try { await rpc('sped_goal_link_steps', { p_goal: goalId, p_steps: [...box.querySelectorAll('[name="step"]:checked')].map((x) => x.value) }); reload(); } catch (err) { fail(box.querySelector('.msg'), err, friendly); } });
    box.querySelector('input')?.focus();
  }
}

// The released report as the family reads and prints it (chrome in the reader's language; the teacher's words as written)
export function reportBodyHtml(esc, r, L, lang, childName, planType, centerName = '') {
  const s = r.snapshot || {};
  const fd = (x) => (x ? fmtDate(x, { year: 'numeric', month: 'short', day: 'numeric' }, lang) : '');
  return `<header class="sp-rep-brand"><span class="cp-mark" aria-hidden="true">F</span><span><b>Futures Friends</b>${centerName ? ` · ${esc(centerName)}` : ''}</span></header>
    <h4>${esc(L.reportTitle(L.type[s.plan_type || planType] || ''))}: ${esc(s.child || childName || '')}</h4>
    <p class="small">${esc(L.period(fd(r.from), fd(r.to)))} · ${esc(L.released(fd(r.released_at)))}</p>
    ${r.summary ? `<p class="sp-pre">${esc(r.summary)}</p>` : ''}
    ${(s.goals || []).map((g) => `<div class="sp-rep-goal"><p><span class="chip">${esc(L.areaV[g.area] || g.area)}</span> <span class="chip">${esc(L.st[g.status] || g.status)}</span></p><p><b>${esc(g.goal)}</b></p>
      ${g.measure ? `<p class="small">${esc(L.measure)}: ${esc(g.measure)}</p>` : ''}
      ${chartSvg(esc, g.points, { unit: g.unit, target: g.target_value, label: L.chart(g.goal) })}
      ${(g.points || []).length ? `<p class="small">${g.points.map((p) => `${esc(fd(p.on))}: ${esc(valueText(p.value, g.unit, L))}${p.measure ? ` (${esc(p.measure)})` : ''}`).join(' · ')}</p>` : `<p class="small muted">${esc(L.noPoints)}</p>`}
      ${g.note ? `<p class="sp-pre">${esc(g.note)}</p>` : ''}</div>`).join('')}`;
}
function printEl(el) {
  if (!el) return;
  document.querySelectorAll('.sp-printing').forEach((x) => x.classList.remove('sp-printing'));
  el.classList.add('sp-printing'); document.body.classList.add('sp-print-mode');
  const done = () => { document.body.classList.remove('sp-print-mode'); el.classList.remove('sp-printing'); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  window.print();
}

// ---- /plans: to-dos and caseload (staff, director, specialist) or the family's list -------------------------------------------------
async function viewPlans(ctx) {
  const { c, shell, page, rpc, esc, friendly, lang, allowed } = ctx;
  const L = words(lang);
  const fd = (x) => (x ? fmtDate(x, { month: 'short', day: 'numeric' }, lang) : '—');
  page(shell('<p class="loading">…</p>'), L.plans);
  if (c.role === 'family') {
    let ov;
    try { ov = await rpc('sped_family_overview', { p_center: c.center_id }); } catch (e) { return page(shell(`<div class="card"><p class="msg bad" role="alert">${esc(friendly(e))}</p></div>`), L.plans); }
    const rows = (k) => todoRows(k.todo.map((t) => ({ ...t, kid: k.kid })), L, { slug: c.slug, lang, family: true });
    return page(shell(`<div class="sp-page" id="spPlans" data-i18n-skip>${ov.length ? ov.map((k) => `<section class="card" data-kid="${esc(k.kid)}"><h2>${esc(L.planFor(k.name))}</h2>
      <p>${k.plans.map((p) => `<span class="chip gold">${esc(L.type[p.plan_type])}</span> <span class="chip">${esc(L.status[p.status])}</span>`).join(' ')}</p>
      ${k.next_meeting ? `<p class="small">${esc(L.meetings)}: ${esc(fmtDateTime(k.next_meeting.starts_at, undefined, lang))}</p>` : ''}
      ${k.todo.length ? `<h3>${esc(L.todo)}</h3><ul class="list">${rows(k).map((r) => `<li data-kind="${esc(r.kind)}"><a href="${esc(r.href)}" data-nav>${esc(r.text)}</a></li>`).join('')}</ul>` : ''}
      <a class="btn navy small" href="/c/${esc(c.slug)}/child/${encodeURIComponent(k.kid)}/plan" data-nav>${esc(L.viewPlan)}</a></section>`).join('') : `<div class="card"><p class="empty">${esc(L.noPlan)}</p></div>`}</div>`), L.plans);
  }
  const director = c.role === 'director';
  const [todos, list, counts] = await Promise.all([
    c.role === 'specialist' ? null : rpc('sped_staff_todos', { p_center: c.center_id }).catch(() => null),
    rpc('sped_caseload_list', { p_center: c.center_id }).catch((e) => ({ error: e })),
    director ? rpc('sped_caseload', { p_center: c.center_id }).catch(() => null) : null]);
  if (list && list.error) return page(shell(`<div class="card"><p class="msg bad" role="alert">${esc(friendly(list.error))}</p></div>`), L.plans);
  const rows = todos ? todoRows(todos.items, L, { slug: c.slug, allowed, lang }) : [];
  page(shell(`<div class="sp-page" id="spPlans" data-i18n-skip>
    ${counts ? countsHtml(esc, counts, L, lang) : ''}
    ${todos ? `<section class="card" id="spTodo"><h2>${esc(L.todo)}</h2>${rows.length ? `<ul class="list">${rows.map((r) => `<li class="${r.urgent ? 'urgent' : ''}" data-kind="${esc(r.kind)}">${r.href ? `<a href="${esc(r.href)}" data-nav>${esc(r.text)}</a>` : esc(r.text)}</li>`).join('')}</ul>` : `<p class="empty">${esc(L.noTodo)}</p>`}</section>` : ''}
    <section class="card" id="spCaseload"><h2>${esc(L.caseload)}</h2><p class="cta-row"><a class="btn gold small" href="/c/${esc(c.slug)}/goal-entry" data-nav>${esc(L.entry)}</a></p>
      ${list.length ? `<div class="km-scroll" tabindex="0" role="region" aria-label="${esc(L.caseload)}"><table class="t sp-table"><thead><tr><th scope="col">${esc(L.name)}</th><th scope="col">${esc(L.plans)}</th><th scope="col">${esc(L.reviewOn)}</th><th scope="col">${esc(L.goals)}</th><th scope="col">${esc(L.last)}</th><th scope="col"><span class="sr-only">${esc(L.open2)}</span></th></tr></thead><tbody>
        ${list.map((k) => `<tr data-kid="${esc(k.kid)}"><th scope="row">${esc(k.first)}</th><td>${esc(L.type[k.plan_type])} · ${esc(L.status[k.status])}${k.consent !== 'active' ? ' <span class="chip warn">!</span>' : ''}</td><td>${esc(fd(k.annual_review_on))}</td>
          <td>${esc(L.goalsMet(k.goals_met, k.goals))}</td><td>${esc(fd(k.last_data_on))}</td><td><a class="btn soft small" href="/c/${esc(c.slug)}/child/${encodeURIComponent(k.kid)}/plan?plan=${encodeURIComponent(k.plan)}" data-nav>${esc(L.open2)}</a></td></tr>`).join('')}</tbody></table></div>`
        : `<p class="empty">${esc(L.noPlan)}</p>`}</section></div>`), L.plans);
}
export function countsHtml(esc, n, L, lang = 'en') {
  const fd = (x) => fmtDate(x, { month: 'short', day: 'numeric' }, lang);
  const tile = (v, t) => `<div class="sp-count"><b>${esc(String(v ?? 0))}</b><span class="small">${esc(t)}</span></div>`;
  return `<section class="card" id="spCounts" data-i18n-skip aria-labelledby="spCountsH"><h2 id="spCountsH">${esc(L.counts)}</h2><p class="small muted">${esc(L.countsHint)}</p>
    <div class="sp-counts">${tile(n.iep, L.cIep)}${tile(n.ifsp, L.cIfsp)}${tile(n.drafts, L.cDrafts)}${tile(n.reviews_30, L.cReviews)}${tile(n.meetings_14, L.cMeetings)}${tile(n.reports_waiting_family, L.cWaiting)}${tile(n.specialists_active, L.cSpecs)}${tile(n.consent_missing, L.cConsent)}</div>
    ${(n.review_dates || []).length ? `<p class="small"><b>${esc(L.nextReviews)}:</b> ${n.review_dates.map((x) => esc(fd(x))).join(', ')}</p>` : ''}
    ${(n.meeting_dates || []).length ? `<p class="small"><b>${esc(L.nextMeetings)}:</b> ${n.meeting_dates.map((x) => esc(fd(x))).join(', ')}</p>` : ''}</section>`;
}

// ---- /goal-entry: the quick tablet screen -------------------------------------------------------------------------------------------
async function viewEntry(ctx) {
  const { c, shell, page, rpc, esc, friendly, lang, live } = ctx;
  const L = words(lang);
  page(shell('<p class="loading">…</p>'), L.entry);
  const room = q().get('room') || null;
  let d, rooms = [];
  try { [d, rooms] = await Promise.all([rpc('sped_goal_entry_list', { p_center: c.center_id, p_room: room }),
    c.role === 'specialist' ? [] : ctx.client().from('rooms').select('id, data').eq('center_id', c.center_id).order('id').then((r) => r.data || [])]); }
  catch (e) { return page(shell(`<div class="card"><p class="msg bad" role="alert">${esc(friendly(e))}</p></div>`), L.entry); }
  page(shell(`<div class="sp-page sp-entry" id="spEntry" data-i18n-skip><div class="card"><h2>${esc(L.entry)}</h2><p class="muted">${esc(L.entryIntro)}</p>
    ${rooms.length > 1 ? `<nav class="tabs" aria-label="${esc(L.room)}"><a href="/c/${esc(c.slug)}/goal-entry" data-nav${!room ? ' aria-current="page"' : ''}>${esc(L.allRooms)}</a>${rooms.map((r) => `<a href="/c/${esc(c.slug)}/goal-entry?room=${encodeURIComponent(r.id)}" data-nav${r.id === room ? ' aria-current="page"' : ''}>${esc(r.data?.name || r.id)}</a>`).join('')}</nav>` : ''}</div>
    ${d.children.length ? d.children.map((k) => `<section class="card sp-entry-kid" data-kid="${esc(k.kid)}"><h3>${esc(k.first)} <span class="chip gold">${esc(L.type[k.plan_type])}</span></h3>
      <div class="sp-entry-goals">${k.goals.map((g) => `<button class="sp-goal-btn" type="button" data-entry="${esc(g.id)}" data-unit="${esc(g.unit)}" aria-expanded="false"><span class="chip">${esc(L.areaV[g.area])}</span><span>${esc(g.goal)}</span>
        ${g.last ? `<span class="mini muted">${esc(L.lastValue(fmtDate(g.last.on, { month: 'short', day: 'numeric' }, lang), valueText(g.last.value, g.unit, L)))}</span>` : ''}</button>`).join('')}</div></section>`).join('')
      : `<div class="card"><p class="empty">${esc(L.noEntry)}</p></div>`}
    <p class="msg" id="spEntryMsg" role="status"></p></div>`), L.entry);
  const box = document.getElementById('spEntry');
  box.addEventListener('click', (e) => {
    const b = e.target.closest('[data-entry]'); if (!b) return;
    const open = box.querySelector('form.sp-qform'); if (open) { open.previousElementSibling?.setAttribute('aria-expanded', 'false'); open.remove(); if (open.dataset.goal === b.dataset.entry) return; }
    const unit = b.dataset.unit;
    const f = document.createElement('form'); f.className = 'sp-qform'; f.noValidate = true; f.dataset.goal = b.dataset.entry;
    f.innerHTML = `${unit === 'yes_no' ? `<fieldset class="f"><legend>${esc(L.value)}</legend><div class="sp-yn"><label class="sp-check"><input type="radio" name="value" value="1"><span>✓</span></label><label class="sp-check"><input type="radio" name="value" value="0"><span>✗</span></label></div></fieldset>`
      : `<label class="f"><span>${esc(L.value)} (${esc(L.unitV[unit] || unit)})</span><input class="i sp-big" type="number" name="value" min="0" ${unit === 'percent' ? 'max="100"' : ''} step="any" inputmode="decimal"></label>`}
      <label class="f"><span>${esc(L.measureNote)}</span><input class="i" name="measure" maxlength="200"></label><label class="f"><span>${esc(L.note)}</span><input class="i" name="note" maxlength="1000"></label>
      <label class="f"><span>${esc(L.on)}</span><input class="i" type="date" name="on" value="${today()}" max="${today()}"></label><button class="btn gold sp-big" type="submit">${esc(L.record)}</button>`;
    b.after(f); b.setAttribute('aria-expanded', 'true'); f.querySelector('input')?.focus();
    f.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const v = unit === 'yes_no' ? f.querySelector('[name="value"]:checked')?.value : f.value.value;
      try {
        await rpc('sped_data_add', { p_goal: f.dataset.goal, p_on: f.on.value || today(), p_value: v === '' || v == null ? null : Number(v), p_measure: f.measure.value || null, p_note: f.note.value || null, p_objective: null });
        okMsg(document.getElementById('spEntryMsg'), L.recorded); live(L.recorded); f.remove(); b.setAttribute('aria-expanded', 'false'); b.focus();
      } catch (err) { fail(document.getElementById('spEntryMsg'), err, friendly); }
    });
  });
}

// ---- small cards for other pages --------------------------------------------------------------------------------------------------
// The teacher dashboard (after "To do") and the director home (above "Your day and set-up"): to-dos, or counts only for the director.
export async function mountDashCard({ c, rpc, esc, lang, allowed, director = false }) {
  const L = words(lang);
  let html = '';
  try {
    if (director) {
      const n = await rpc('sped_caseload', { p_center: c.center_id });
      if (!n.children && !n.drafts) return;
      html = countsHtml(esc, n, L, lang).replace('id="spCounts"', 'id="spDashCounts"');
      html = html.replace('</section>', `<p class="cta-row"><a class="btn soft small" href="/c/${esc(c.slug)}/plans" data-nav>${esc(L.plans)}</a></p></section>`);
    } else {
      const t = await rpc('sped_staff_todos', { p_center: c.center_id });
      if (!t.items.length) return;
      const rows = todoRows(t.items, L, { slug: c.slug, allowed, lang }).slice(0, 6);
      html = `<section class="card sd-card" id="spDashTodo" data-i18n-skip aria-labelledby="spDashH"><div class="sd-ch"><h2 id="spDashH">${esc(L.plans)}</h2><span class="chip gold">${t.items.length}</span></div>
        <ul class="sd-todos">${rows.map((r) => `<li class="${r.urgent ? 'urgent' : ''}" data-kind="${esc(r.kind)}">${r.href ? `<a class="sd-trow" href="${esc(r.href)}" data-nav><span class="sd-tt"><b>${esc(r.text)}</b></span></a>` : `<span class="sd-trow">${esc(r.text)}</span>`}</li>`).join('')}</ul>
        <p class="cta-row"><a class="btn soft small" href="/c/${esc(c.slug)}/plans" data-nav>${esc(L.caseload)}</a><a class="btn gold small" href="/c/${esc(c.slug)}/goal-entry" data-nav>${esc(L.entry)}</a></p></section>`;
    }
  } catch (_) { return; }    // no plans, or no access: nothing to add
  const anchor = director ? document.querySelector('#centerSpace h2.sp-sub') : document.getElementById('sdTodo');
  if (!anchor) return;
  if (director) anchor.insertAdjacentHTML('beforebegin', html); else anchor.insertAdjacentHTML('afterend', html);
}
// The family's child page: a link to the child's plan when there is one
export async function mountFamilyCard({ c, rpc, esc, lang, kid, after }) {
  const L = words(lang);
  let ov; try { ov = await rpc('sped_family_overview', { p_center: c.center_id }); } catch (_) { return; }
  const k = (ov || []).find((x) => x.kid === kid); if (!k || !after) return;
  after.insertAdjacentHTML('afterend', `<div class="card" id="childSped" data-i18n-skip><h3>${esc(L.title)}</h3>
    ${k.todo.length ? `<p class="small"><span class="chip gold">${k.todo.length}</span> ${esc(L.todo)}</p>` : ''}
    <a class="btn soft small" href="/c/${esc(c.slug)}/child/${encodeURIComponent(kid)}/plan" data-nav>${esc(L.viewPlan)}</a></div>`);
}
// Checkpoints (staff composer): opt in to show goal progress in a conference report
export async function mountConferenceGoals(box, { c, kid, reportId, released, rpc, esc, friendly, lang = 'en' }) {
  const L = words(lang);
  let d, cur;
  try { d = await rpc('sped_child', { p_center: c.center_id, p_kid: kid }); } catch (_) { return; }   // not this teacher's plan, or no plan
  const plan = d.plans.find((p) => p.status === 'active'); if (!plan || !(plan.goals || []).length) return;
  try { cur = reportId ? await rpc('sped_conference_progress', { p_report: reportId }) : { goals: [] }; } catch (_) { cur = { goals: [] }; }
  const on = new Set((cur.goals || []).map((g) => g.id));
  const host = box.querySelector('#cpReportForm') || box;
  host.insertAdjacentHTML('beforeend', `<fieldset class="f sp-confgoals" id="spConfGoals" data-i18n-skip><legend>${esc(L.confGoals)}</legend><p class="small muted">${esc(reportId ? L.confGoalsHint : L.confSaveFirst)}</p>
    ${plan.goals.map((g) => `<label class="sp-check"><input type="checkbox" name="sped_goal" value="${esc(g.id)}"${on.has(g.id) ? ' checked' : ''}${released || !reportId ? ' disabled' : ''}><span>${esc(g.goal)}</span></label>`).join('')}<p class="small msg" role="status"></p></fieldset>`);
  const fs = document.getElementById('spConfGoals');
  fs.addEventListener('change', async () => {
    try { await rpc('sped_conference_attach', { p_report: reportId, p_goals: [...fs.querySelectorAll('[name="sped_goal"]:checked')].map((x) => x.value) }); okMsg(fs.querySelector('.msg'), L.saved); }
    catch (err) { fail(fs.querySelector('.msg'), err, friendly); }
  });
}
// Checkpoints (family report): the goal progress the teacher chose, under the report
export async function mountConferenceProgress(article, { reportId, rpc, esc, lang = 'en' }) {
  const L = words(lang);
  let p; try { p = await rpc('sped_conference_progress', { p_report: reportId }); } catch (_) { return; }
  if (!p || !(p.goals || []).length) return;
  article.querySelector('.cp-actions')?.insertAdjacentHTML('beforebegin', `<section class="sp-confprog" data-i18n-skip data-sped-progress="${esc(reportId)}"><h4>${esc(L.confProgress)}</h4>
    ${p.goals.map((g) => `<div class="sp-rep-goal"><p><span class="chip">${esc(L.areaV[g.area] || g.area)}</span> <span class="chip">${esc(L.st[g.status])}</span></p><p><b>${esc(g.goal)}</b></p>
      ${chartSvg(esc, g.points, { unit: g.unit, target: g.target_value, label: L.chart(g.goal) })}</div>`).join('')}</section>`);
}

