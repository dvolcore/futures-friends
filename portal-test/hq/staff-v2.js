// The staff dashboards v2: the pure part (hub/STAFF_DASHBOARDS.md "Dashboards v2"). Owner 2026-10-12: "We've got to do the same thing
// for teachers and administrators ... get the layout and everything on how this all works together". The same shell as the parent
// dashboard v2 (ff-shell.js): a rail of views, tabs, a drawer, phones a bottom bar.
//
// This file holds no DOM and no network (tests/staff-v2-unit.test.mjs imports it):
//   - the views and their tabs, per role (teacher: classroom tablet first; director: desktop first, the command centre)
//   - the words, English and Spanish (Spanish is a DRAFT until a bilingual reviewer approves it; app.js shows the draft note)
//   - the models: every figure on a tile is DERIVED from what an existing function returned (staff_dashboard, director_dashboard,
//     spine.js loadSpine, crm_*, hiring_*, compliance_due, health_*, sped_*, the invoices / payments / attendance rows a director may
//     read). A source that failed or does not exist gives null, and the page says "not connected yet": never a made-up number.
//   - staffLink(): the exact item every row opens (staff-dashboard.js dashLink for the kinds it knows, plus the new ones here)
// Rules kept: learning is counts only (no score, no ranking); money is DIRECTORS ONLY (the teacher model never asks for it); a child is
// shown by first name + initial and a friend avatar (never a photo on a dashboard).
import { dashLink } from './staff-dashboard.js';

// ---- views ----------------------------------------------------------------------------------------------------------------------
export const TEACHER_VIEWS = [
  { id: 'today', icon: 'sun', tabs: [] },
  { id: 'room', icon: 'room', tabs: ['roster', 'pickup', 'sub'] },
  { id: 'learning', icon: 'learn', tabs: ['plan', 'week', 'unit', 'checks', 'reports'] },
  { id: 'care', icon: 'heart', tabs: ['log', 'meals', 'rest', 'health'] },
  { id: 'messages', icon: 'chat', tabs: ['families', 'announcements', 'todo'] },
  { id: 'calendar', icon: 'calendar', tabs: ['upcoming', 'absences'] },
  { id: 'me', icon: 'badge', tabs: ['clock', 'training', 'review'] },
];
export const TEACHER_BAR = ['today', 'room', 'care', 'messages'];
export const DIRECTOR_VIEWS = [
  { id: 'overview', icon: 'home', tabs: [] },
  { id: 'rooms', icon: 'room', tabs: ['board', 'staffing', 'attendance'] },
  { id: 'families', icon: 'people', tabs: ['pipeline', 'enrollment', 'waitlist', 'messages'] },
  { id: 'staff', icon: 'badge', tabs: ['onduty', 'schedule', 'hiring', 'credentials'] },   // schedule: director-ops (director-schedule.js)
  { id: 'billing', icon: 'tuition', tabs: ['month', 'overdue'] },
  { id: 'compliance', icon: 'shield', tabs: ['due', 'drills', 'records'] },
  { id: 'health', icon: 'heart', tabs: ['immunizations', 'meds', 'sped'] },
  { id: 'calendar', icon: 'calendar', tabs: ['upcoming', 'absences'] },
  { id: 'content', icon: 'doc', tabs: ['review', 'waiting', 'network'] },   // review: director-ops (director-review.js)
  { id: 'settings', icon: 'gear', tabs: ['center', 'pages'] },
];
export const DIRECTOR_BAR = ['overview', 'rooms', 'families', 'staff'];

// ---- words ------------------------------------------------------------------------------------------------------------------
export const SW = {
  en: {
  views: { today: 'Today', room: 'Room', learning: 'Learning', care: 'Care log', messages: 'Messages', calendar: 'Calendar', me: 'Me',
    overview: 'Overview', rooms: 'Rooms', families: 'Families', staff: 'Staff', billing: 'Billing', compliance: 'Compliance', health: 'Health & special ed', content: 'Content', settings: 'Settings' },
  short: { today: 'Today', room: 'Room', learning: 'Learning', care: 'Care', messages: 'Messages', calendar: 'Calendar', me: 'Me', more: 'More',
    overview: 'Overview', rooms: 'Rooms', families: 'Families', staff: 'Staff', billing: 'Billing', compliance: 'Compliance', health: 'Health', content: 'Content', settings: 'Settings' },
  tabs: { schedule: 'Schedule', review: 'Content review', week: 'This week', unit: 'The unit', roster: 'Roster', pickup: 'Pickup', sub: 'Substitute sheet', plan: "Today's plan", checks: 'Skill checks', reports: 'Progress reports', log: 'Quick log', meals: 'Meals',
    rest: 'Rest', health: 'Allergies & meds', families: 'Families', announcements: 'Announcements', todo: 'To do', upcoming: 'Coming up', absences: 'Absences', clock: 'Time clock', training: 'Training',
    board: 'Ratio board', staffing: 'Staffing', attendance: 'Attendance', pipeline: 'Pipeline', enrollment: 'Enrollment packets', waitlist: 'Waitlist', onduty: 'On duty', hiring: 'Hiring',
    credentials: 'Credentials & training', messages: 'Messages', month: 'This month', overdue: 'Past due', due: "What's due", drills: 'Drills & incidents', records: 'Inspector & CACFP',
    immunizations: 'Immunizations', meds: 'Medication', sped: 'Special education', waiting: 'Waiting at the center', network: 'Network content', center: 'Center', pages: 'All pages' },
  nav: 'Dashboard views', sub: (v) => `${v}: sections`, more: 'More', moreTitle: 'More views', close: 'Close', openFull: 'Open the full page',
  showTable: 'Show as table', captureMoment: 'Capture a moment', openDetail: 'open the details', hideTable: 'Show as picture', nc: 'Not connected yet', couldNot: 'Could not load', demo: 'Demo preview',
  attention: 'Needs your attention', attentionN: (n) => `${n} ${n === 1 ? 'thing' : 'things'}`, allClear: 'All clear: nothing is waiting on you.',
  hello: { morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening' },
  actions: 'Quick actions', tagline: 'Learn. Move. Explore. Belong.',
  // teacher
  room: 'Room', yourRoom: 'Your classroom', presentOf: (p, e) => `${p} of ${e} here`, notYet: (n) => `${n} not here yet`, gone: (n) => `${n} gone home`, absent: (n) => `${n} absent`,
  ratioChip: (r, need) => `Ratio ${r} · ${need} ${need === 1 ? 'teacher' : 'teachers'} needed`, ratioNc: 'Ratio: not connected yet', ratioEmpty: 'No children counted yet',
  ratioOver: 'Over the ratio', clockIn: 'Clocked in', clockOut: 'Not clocked in', clockNc: 'Time clock off for you',
  kPresent: 'Present', kMeals: 'Meals logged', kNaps: 'Rest', kChecks: 'Skill checks', kPresentSub: (e) => `of ${e} enrolled`, kMealsSub: 'here, with a meal today',
  kNapsSub: (r) => (r ? `${r} resting now` : 'rested or resting'), kChecksSub: (o) => `children checked this week${o ? ` · ${o} skills to score` : ''}`,
  checksNone: 'None assigned this week', checksOff: 'Skill checks are off', fullScreen: 'Full screen',
  quickLog: 'Quick log', logShort: 'Log', quickLogSub: 'Tap the children, then what happened. One tap logs it for all of them.', logNow: 'Log for the selected', selectAll: 'Select everyone here', selected: (n) => `${n} selected`,
  kinds: { meal: 'Meal', nap: 'Rest', toilet: 'Potty', mood: 'Feeling' }, openToday: 'Open the full Today screen',
  plan: "Today's plan", planNone: 'No plan today.', planDone: (d, n) => `${d} of ${n} done`, openPlanning: 'Planning', markDone: 'Mark done', doneMark: 'Done',
  roster: 'The room', rosterSub: 'Friend avatars by default; a child\'s photo stays on their own page.', allergyFlag: 'Allergy', medFlag: 'Emergency medicine', photoOk: 'Photo consent on file', photoNo: 'No photo consent',
  pickupList: 'Pickup list', pickupSub: 'Who may pick up each child (approved by the director).', evening: 'Evening report', eveningSub: (p, t, time) => `${p} of ${t} sent · goes out ${time}`,
  subSheet: 'Substitute sheet', subSub: 'Everything a substitute needs for this room today, on one page.',
  gradebook: 'Gradebook & skill checks', reportsDraft: (n) => `${n} progress ${n === 1 ? 'report' : 'reports'} in draft`, countsOnly: 'Counts only. Children are never ranked or compared.',
  stillToDo: 'Still to do', chat: 'Chat with families', announce: 'Announcements', noMsgs: 'No messages with this room\'s families yet.', unread: 'New',
  meds: 'Medication today', medsNone: 'No scheduled doses for this room today.', medsNc: 'Medication: only staff with medication training see this.',
  alerts: 'Allergies and care alerts', alertsNone: 'No care alerts in this room.',
  training: 'Your training', trainingNone: 'Nothing due.', clockCard: 'Time clock',
  upcoming: 'Coming up', closed: 'Closed', early: 'Early dismissal', noClosures: 'No closed days in the next 30 days.', absencesNone: 'No absences reported.',
  // director
  center: 'The center', roomsGlance: 'Rooms right now', allInRatio: 'Ratio covered in every room', needStaff: (n) => `${n} more ${n === 1 ? 'teacher' : 'teachers'} needed now`, staffOn: (n) => `${n} staff on the clock`,
  kEnroll: 'Enrollment', kEnrollSub: (c) => `of ${c} licensed seats`, kAttend: 'Attendance today', kAttendSub: (e) => `of ${e} enrolled`, kStaff: 'Staff on the clock', kStaffSub: (n) => `${n} needed for today's children`, fte: (n) => `${n} FTE scheduled`, staffBig: (on, need) => `${on} on the clock · ${need} needed`, extra: (n) => `+${n} extra`, short2: (n) => `${n} short`,
  kTuition: 'Tuition collected', kTuitionSub: (b) => `of ${b} billed this month`, directorsOnly: 'Directors only',
  board: 'Ratio board', boardSub: 'Children here and teachers needed, room by room (the cited state table).', funnel: 'Enrollment funnel', funnelSub: 'Families by stage, last 60 days',
  heat: 'Attendance this month', heatShort: 'Attendance', heatSub: 'Share of enrolled children here, school day by school day', cash: 'Tuition this month', cashSub: 'Billed, collected and still open',
  staffing: 'Staffing vs need today', staffingSub: 'Teachers on the clock against teachers the children here need, through the day',
  countdown: 'Compliance countdown', countdownSub: 'Days left on the next items due', billed: 'Billed', collected: 'Collected', open: 'Still open', pastDue: 'Past due',
  stages: { inquiry: 'Inquiry', tour_booked: 'Tour booked', toured: 'Toured', applied: 'Applied', waitlisted: 'Waitlist', offered: 'Offered', enrolled: 'Enrolled', lost: 'Lost' },
  here: 'Here', need: 'Needed', onClock: 'On the clock', children: 'Children', teachers: 'Teachers', time: 'Time', day: 'Day', share: 'Share', count: 'Count', item: 'Item', daysLeft: 'Days left', stage: 'Stage', amount: 'Amount',
  overdueD: (n) => (Math.abs(n) > 90 ? '90+ days overdue' : `${Math.abs(n)} ${Math.abs(n) === 1 ? 'day' : 'days'} overdue`), dueIn: (n) => (n === 0 ? 'Due today' : `Due in ${n} ${n === 1 ? 'day' : 'days'}`),
  hqNote: 'Financials are for directors only. HQ never sees tenant money.',
  pages: 'Every page of the Hub', pagesSub: 'Everything that existed before stays one tap away.', classic: 'The classic director home (brief and set-up)',
  contentNet: 'Network content (stories, songs, lessons) is reviewed by the HQ content team. Your center sees what is waiting for a parent or for you.',
  pilot: 'Content pilot', pilotOn: 'Drafts allowed at this center', pilotOff: 'Not in the content pilot',
  // attention items
  a: {
    incident: (f) => `Incident report to finish${f ? `: ${f}` : ''}`, incidentSub: 'Family not marked as told yet', meds: (f) => `Medicine due: ${f}`, medsN: (f, n) => `${f}: ${n} doses of medicine`, medsSub: (t, s) => `${t} · ${s === 'overdue' ? 'overdue' : 'due now'}`,
    allergy: (f) => `Allergy: ${f}`, allergySub: 'Emergency medicine on file', pickup: (n) => `${n} ${n === 1 ? 'child' : 'children'} still to be picked up`, pickupSub: 'Check the pickup list at the door',
    message: (f) => `${f}'s family wrote`, observe: (f) => `Score by watching: ${f}`, flagged: (f) => `Automatic grade to look at: ${f}`, draft: (f) => `Progress report in draft: ${f}`,
    video: (f) => `Video waiting for a parent: ${f}`, upload: (f) => `${f}'s family shared from home`, training: (t) => `Training due: ${t}`,
    ratio: (n) => `Ratio: ${n} more ${n === 1 ? 'teacher' : 'teachers'} needed`, ratioSub: 'Teachers on the clock vs the children here', incidentsReview: (n) => `${n} incident ${n === 1 ? 'report' : 'reports'} to review`,
    incidentsSub: 'Not acknowledged, or a deadline today', creds: (n) => `${n} ${n === 1 ? 'credential' : 'credentials'} expired or expiring`, credsSub: 'CPR, first aid, background checks',
    trainingOver: (n) => `${n} required ${n === 1 ? 'training' : 'trainings'} overdue`, immun: (n) => `Immunizations: ${n} ${n === 1 ? 'child' : 'children'}`, immunSub: 'Records due or overdue',
    invoices: (n) => `${n} ${n === 1 ? 'invoice' : 'invoices'} past due`, leads: (n) => `${n} new ${n === 1 ? 'family' : 'families'} past the first-contact time`, tours: (n) => `${n} ${n === 1 ? 'tour' : 'tours'} in the next 7 days`,
    packets: (n) => `${n} enrollment ${n === 1 ? 'packet' : 'packets'} to review`, interviews: (n) => `${n} ${n === 1 ? 'interview' : 'interviews'} this week`,
    due: (n) => `${n} licensing ${n === 1 ? 'item' : 'items'} overdue or due this week`, dueSub: "What's due, with the citation", moments: (n) => `${n} ${n === 1 ? 'classroom moment waits' : 'classroom moments wait'} for your OK`, momentsSub: 'Photos and videos from the rooms, before families see them', content: (n) => `${n} ${n === 1 ? 'item waits' : 'items wait'} for review`, contentSub: 'Videos, friend messages, consents',
    go: { open: 'Open', review: 'Review', finish: 'Finish', give: 'Record dose', check: 'See plan', reply: 'Reply', score: 'Score', pickups: 'Pickups', staff: 'Staff', log: 'Log it' },
  },
  },
  es: {
  views: { today: 'Hoy', room: 'Salón', learning: 'Aprendizaje', care: 'Cuidado', messages: 'Mensajes', calendar: 'Calendario', me: 'Yo',
    overview: 'Resumen', rooms: 'Salones', families: 'Familias', staff: 'Personal', billing: 'Pagos', compliance: 'Cumplimiento', health: 'Salud y educación especial', content: 'Contenido', settings: 'Ajustes' },
  short: { today: 'Hoy', room: 'Salón', learning: 'Aprender', care: 'Cuidado', messages: 'Mensajes', calendar: 'Calendario', me: 'Yo', more: 'Más',
    overview: 'Resumen', rooms: 'Salones', families: 'Familias', staff: 'Personal', billing: 'Pagos', compliance: 'Normas', health: 'Salud', content: 'Contenido', settings: 'Ajustes' },
  tabs: { schedule: 'Horario', review: 'Revisión de contenido', week: 'Esta semana', unit: 'La unidad', roster: 'Lista', pickup: 'Quién recoge', sub: 'Hoja para suplentes', plan: 'Plan de hoy', checks: 'Revisiones de habilidades', reports: 'Informes de progreso', log: 'Registro rápido', meals: 'Comidas',
    rest: 'Descanso', health: 'Alergias y medicinas', families: 'Familias', announcements: 'Avisos', todo: 'Pendientes', upcoming: 'Próximamente', absences: 'Ausencias', clock: 'Reloj', training: 'Capacitación',
    board: 'Tablero de proporción', staffing: 'Personal', attendance: 'Asistencia', pipeline: 'Embudo', enrollment: 'Paquetes de inscripción', waitlist: 'Lista de espera', onduty: 'En turno', hiring: 'Contratación',
    credentials: 'Credenciales y capacitación', messages: 'Mensajes', month: 'Este mes', overdue: 'Vencidos', due: 'Pendientes', drills: 'Simulacros e incidentes', records: 'Inspector y CACFP',
    immunizations: 'Vacunas', meds: 'Medicinas', sped: 'Educación especial', waiting: 'En espera en el centro', network: 'Contenido de la red', center: 'Centro', pages: 'Todas las páginas' },
  nav: 'Vistas del tablero', sub: (v) => `${v}: secciones`, more: 'Más', moreTitle: 'Más vistas', close: 'Cerrar', openFull: 'Abrir la página completa',
  showTable: 'Ver como tabla', captureMoment: 'Capturar un momento', openDetail: 'abrir los detalles', hideTable: 'Ver como imagen', nc: 'Todavía no conectado', couldNot: 'No se pudo cargar', demo: 'Vista de demostración',
  attention: 'Necesita su atención', attentionN: (n) => `${n} ${n === 1 ? 'cosa' : 'cosas'}`, allClear: 'Todo al día: nada le espera.',
  hello: { morning: 'Buenos días', afternoon: 'Buenas tardes', evening: 'Buenas noches' },
  actions: 'Acciones rápidas', tagline: 'Aprender. Moverse. Explorar. Pertenecer.',
  room: 'Salón', yourRoom: 'Su salón', presentOf: (p, e) => `${p} de ${e} presentes`, notYet: (n) => `${n} todavía no llegan`, gone: (n) => `${n} ya se fueron`, absent: (n) => `${n} ausentes`,
  ratioChip: (r, need) => `Proporción ${r} · ${need} ${need === 1 ? 'maestra necesaria' : 'maestras necesarias'}`, ratioNc: 'Proporción: todavía no conectada', ratioEmpty: 'Todavía no hay niños contados',
  ratioOver: 'Fuera de la proporción', clockIn: 'Turno iniciado', clockOut: 'Sin marcar entrada', clockNc: 'Reloj no activado para usted',
  kPresent: 'Presentes', kMeals: 'Comidas registradas', kNaps: 'Descanso', kChecks: 'Revisiones', kPresentSub: (e) => `de ${e} inscritos`, kMealsSub: 'presentes, con una comida hoy',
  kNapsSub: (r) => (r ? `${r} descansando ahora` : 'descansaron o descansan'), kChecksSub: (o) => `niños revisados esta semana${o ? ` · ${o} por calificar` : ''}`,
  checksNone: 'Ninguna asignada esta semana', checksOff: 'Revisiones desactivadas', fullScreen: 'Pantalla completa',
  quickLog: 'Registro rápido', logShort: 'Registrar', quickLogSub: 'Toque a los niños y luego lo que pasó. Un toque lo registra para todos.', logNow: 'Registrar para los seleccionados', selectAll: 'Seleccionar a todos los presentes', selected: (n) => `${n} seleccionados`,
  kinds: { meal: 'Comida', nap: 'Descanso', toilet: 'Baño', mood: 'Emoción' }, openToday: 'Abrir la pantalla Hoy completa',
  plan: 'Plan de hoy', planNone: 'No hay plan hoy.', planDone: (d, n) => `${d} de ${n} hechas`, openPlanning: 'Planificación', markDone: 'Marcar hecha', doneMark: 'Hecha',
  roster: 'El salón', rosterSub: 'Avatares de los amigos por defecto; la foto del niño queda en su propia página.', allergyFlag: 'Alergia', medFlag: 'Medicina de emergencia', photoOk: 'Consentimiento de fotos', photoNo: 'Sin consentimiento de fotos',
  pickupList: 'Quién puede recoger', pickupSub: 'Quién puede recoger a cada niño (aprobado por la directora).', evening: 'Informe de la tarde', eveningSub: (p, t, time) => `${p} de ${t} enviados · salen ${time}`,
  subSheet: 'Hoja para suplentes', subSub: 'Todo lo que una suplente necesita para este salón hoy, en una página.',
  gradebook: 'Calificaciones y revisiones', reportsDraft: (n) => `${n} ${n === 1 ? 'informe' : 'informes'} de progreso en borrador`, countsOnly: 'Solo conteos. Nunca se ordena ni se compara a los niños.',
  stillToDo: 'Faltan', chat: 'Chat con las familias', announce: 'Avisos', noMsgs: 'Todavía no hay mensajes con las familias de este salón.', unread: 'Nuevo',
  meds: 'Medicinas de hoy', medsNone: 'No hay dosis programadas hoy en este salón.', medsNc: 'Medicinas: solo el personal capacitado en medicinas ve esto.',
  alerts: 'Alergias y alertas de cuidado', alertsNone: 'No hay alertas de cuidado en este salón.',
  training: 'Su capacitación', trainingNone: 'Nada pendiente.', clockCard: 'Reloj',
  upcoming: 'Próximamente', closed: 'Cerrado', early: 'Salida temprano', noClosures: 'No hay días cerrados en los próximos 30 días.', absencesNone: 'No hay ausencias reportadas.',
  center: 'El centro', roomsGlance: 'Los salones ahora', allInRatio: 'Proporción cubierta en todos los salones', needStaff: (n) => `Faltan ${n} ${n === 1 ? 'maestra' : 'maestras'} ahora`, staffOn: (n) => `${n} del personal en turno`,
  kEnroll: 'Inscripción', kEnrollSub: (c) => `de ${c} lugares con licencia`, kAttend: 'Asistencia hoy', kAttendSub: (e) => `de ${e} inscritos`, kStaff: 'Personal en turno', kStaffSub: (n) => `${n} necesarias para los niños de hoy`, fte: (n) => `${n} FTE programados`, staffBig: (on, need) => `${on} en turno · ${need} necesarias`, extra: (n) => `+${n} de más`, short2: (n) => `faltan ${n}`,
  kTuition: 'Colegiaturas cobradas', kTuitionSub: (b) => `de ${b} facturado este mes`, directorsOnly: 'Solo directoras',
  board: 'Tablero de proporción', boardSub: 'Niños presentes y maestras necesarias, salón por salón (la tabla estatal citada).', funnel: 'Embudo de inscripción', funnelSub: 'Familias por etapa, últimos 60 días',
  heat: 'Asistencia este mes', heatShort: 'Asistencia', heatSub: 'Parte de los niños inscritos presentes, día por día', cash: 'Colegiaturas este mes', cashSub: 'Facturado, cobrado y pendiente',
  staffing: 'Personal y necesidad hoy', staffingSub: 'Maestras en turno frente a las que necesitan los niños presentes, durante el día',
  countdown: 'Cuenta regresiva de normas', countdownSub: 'Días que quedan para lo próximo', billed: 'Facturado', collected: 'Cobrado', open: 'Pendiente', pastDue: 'Vencido',
  stages: { inquiry: 'Consulta', tour_booked: 'Visita reservada', toured: 'Visitó', applied: 'Solicitó', waitlisted: 'Lista de espera', offered: 'Oferta', enrolled: 'Inscrito', lost: 'Perdido' },
  here: 'Presentes', need: 'Necesarias', onClock: 'En turno', children: 'Niños', teachers: 'Maestras', time: 'Hora', day: 'Día', share: 'Parte', count: 'Cantidad', item: 'Asunto', daysLeft: 'Días', stage: 'Etapa', amount: 'Monto',
  overdueD: (n) => (Math.abs(n) > 90 ? 'más de 90 días de atraso' : `${Math.abs(n)} ${Math.abs(n) === 1 ? 'día' : 'días'} de atraso`), dueIn: (n) => (n === 0 ? 'Vence hoy' : `Vence en ${n} ${n === 1 ? 'día' : 'días'}`),
  hqNote: 'Las finanzas son solo para directoras. La oficina central nunca ve el dinero de los centros.',
  pages: 'Todas las páginas del Hub', pagesSub: 'Todo lo que existía sigue a un toque.', classic: 'El inicio clásico de la directora (resumen y configuración)',
  contentNet: 'El contenido de la red (cuentos, canciones, lecciones) lo revisa el equipo de contenido de la oficina central. Su centro ve lo que espera a una familia o a usted.',
  pilot: 'Piloto de contenido', pilotOn: 'Borradores permitidos en este centro', pilotOff: 'No está en el piloto de contenido',
  a: {
    incident: (f) => `Reporte de incidente por terminar${f ? `: ${f}` : ''}`, incidentSub: 'La familia todavía no está marcada como avisada', meds: (f) => `Medicina pendiente: ${f}`, medsN: (f, n) => `${f}: ${n} dosis de medicina`, medsSub: (t, s) => `${t} · ${s === 'overdue' ? 'atrasada' : 'ahora'}`,
    allergy: (f) => `Alergia: ${f}`, allergySub: 'Medicina de emergencia registrada', pickup: (n) => `${n} ${n === 1 ? 'niño' : 'niños'} por recoger`, pickupSub: 'Revise la lista en la puerta',
    message: (f) => `La familia de ${f} escribió`, observe: (f) => `Calificar observando: ${f}`, flagged: (f) => `Calificación automática por revisar: ${f}`, draft: (f) => `Informe en borrador: ${f}`,
    video: (f) => `Video esperando a la familia: ${f}`, upload: (f) => `La familia de ${f} compartió desde casa`, training: (t) => `Capacitación pendiente: ${t}`,
    ratio: (n) => `Proporción: faltan ${n} ${n === 1 ? 'maestra' : 'maestras'}`, ratioSub: 'Personal en turno frente a los niños presentes', incidentsReview: (n) => `${n} ${n === 1 ? 'reporte' : 'reportes'} de incidente por revisar`,
    incidentsSub: 'Sin confirmar, o con plazo hoy', creds: (n) => `${n} ${n === 1 ? 'credencial vencida o por vencer' : 'credenciales vencidas o por vencer'}`, credsSub: 'RCP, primeros auxilios, antecedentes',
    trainingOver: (n) => `${n} ${n === 1 ? 'capacitación obligatoria atrasada' : 'capacitaciones obligatorias atrasadas'}`, immun: (n) => `Vacunas: ${n} ${n === 1 ? 'niño' : 'niños'}`, immunSub: 'Registros pendientes o vencidos',
    invoices: (n) => `${n} ${n === 1 ? 'factura vencida' : 'facturas vencidas'}`, leads: (n) => `${n} ${n === 1 ? 'familia nueva' : 'familias nuevas'} sin primer contacto a tiempo`, tours: (n) => `${n} ${n === 1 ? 'visita' : 'visitas'} en los próximos 7 días`,
    packets: (n) => `${n} ${n === 1 ? 'paquete' : 'paquetes'} de inscripción por revisar`, interviews: (n) => `${n} ${n === 1 ? 'entrevista' : 'entrevistas'} esta semana`,
    due: (n) => `${n} ${n === 1 ? 'asunto de licencia atrasado o de esta semana' : 'asuntos de licencia atrasados o de esta semana'}`, dueSub: 'Pendientes, con la cita legal', moments: (n) => `${n} ${n === 1 ? 'momento del salón espera' : 'momentos del salón esperan'} su aprobación`, momentsSub: 'Fotos y videos de los salones, antes de que las familias los vean', content: (n) => `${n} ${n === 1 ? 'cosa espera' : 'cosas esperan'} revisión`, contentSub: 'Videos, mensajes de los amigos, consentimientos',
    go: { open: 'Abrir', review: 'Revisar', finish: 'Terminar', give: 'Registrar dosis', check: 'Ver plan', reply: 'Responder', score: 'Calificar', pickups: 'Recogidas', staff: 'Personal', log: 'Registrar' },
  },
  },
};
export const sw = (lang) => SW[lang === 'es' ? 'es' : 'en'];
// the quick log's choices (the same values today.js sends to care_entries_apply)
export const QUICK = {
  meal: { field: 'meal', values: ['breakfast', 'am_snack', 'lunch', 'snack'], amounts: ['none', 'a_little', 'about_half', 'most', 'all'] },
  toilet: { field: 'what', values: ['wet', 'dry', 'potty_success', 'potty_tried', 'accident'] },
  mood: { field: 'feeling', values: ['happy', 'calm', 'curious', 'energetic', 'tired', 'wanted_comfort'] },
  nap: { field: null, values: ['start', 'end'] },
};
export const QW = {
  en: { breakfast: 'Breakfast', am_snack: 'Morning snack', lunch: 'Lunch', snack: 'Snack', none: 'None', a_little: 'A little', about_half: 'About half', most: 'Most', all: 'All',
    wet: 'Wet diaper', dry: 'Dry', potty_success: 'Used the potty', potty_tried: 'Tried the potty', accident: 'Change of clothes', happy: 'Happy', calm: 'Calm', curious: 'Curious', energetic: 'Full of energy',
    tired: 'Tired', wanted_comfort: 'Wanted a hug', start: 'Rest starts now', end: 'Rest ends now', which: 'Which meal', how: 'How much', what: 'What happened',
    saved: (n, k) => `Logged ${k} for ${n} ${n === 1 ? 'child' : 'children'}.`, refused: (n) => `${n} not logged (the hub said no).`, waiting: 'Saving…', pick: 'Choose at least one child.' },
  es: { breakfast: 'Desayuno', am_snack: 'Refrigerio de la mañana', lunch: 'Almuerzo', snack: 'Refrigerio', none: 'Nada', a_little: 'Un poco', about_half: 'Como la mitad', most: 'Casi todo', all: 'Todo',
    wet: 'Pañal mojado', dry: 'Seco', potty_success: 'Usó la bacinica', potty_tried: 'Intentó la bacinica', accident: 'Cambio de ropa', happy: 'Feliz', calm: 'Tranquilo', curious: 'Curioso', energetic: 'Con mucha energía',
    tired: 'Cansado', wanted_comfort: 'Quiso un abrazo', start: 'Empieza el descanso', end: 'Termina el descanso', which: 'Qué comida', how: 'Cuánto', what: 'Qué pasó',
    saved: (n, k) => `${k}: registrado para ${n} ${n === 1 ? 'niño' : 'niños'}.`, refused: (n) => `${n} sin registrar (el hub no lo aceptó).`, waiting: 'Guardando…', pick: 'Elija al menos un niño.' },
};
export const qw = (lang) => QW[lang === 'es' ? 'es' : 'en'];
export const FEEL_ART = { happy: 'bop-waving', calm: 'lumi', curious: 'zuri-magnifier', energetic: 'bop-dancing', tired: 'booker-reading', wanted_comfort: 'lumi-waving' };

// ---- small helpers --------------------------------------------------------------------------------------------------------------
const num = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
export const frac = (a, b) => (a == null || !b ? null : Math.max(0, Math.min(1, a / b)));
export const pct = (a, b) => { const f = frac(a, b); return f == null ? null : Math.round(f * 100); };
export const money = (cents, lang = 'en') => (cents == null ? null : new Intl.NumberFormat(lang === 'es' ? 'es-US' : 'en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100));
export const daypart = (hour) => (hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening');
export const shortName = (n) => String(n || '').replace(/^TEST\s+/i, '');
// an ok source ({ok, data}) -> its data; anything else -> null
export const ok = (s) => (s && s.ok ? s.data : null);

// ---- the exact item every row opens ---------------------------------------------------------------------------------------------
export function staffLink(kind, id, ctx = {}) {
  const { slug, allowed = null, room = null, kid = null } = ctx;
  const may = (tab) => !allowed || allowed.includes(tab);
  const base = `/c/${slug}`;
  const q = (o) => { const p = new URLSearchParams(Object.entries(o).filter(([, v]) => v != null && v !== '')); const s = p.toString(); return s ? `?${s}` : ''; };
  switch (kind) {
    case 'curriculum-day': return may('curriculum') ? `${base}/curriculum${q({ day: id })}` : null;   // one day's full lesson, menu and move
    case 'moments-approve': return `${base}/home${q({ view: 'content', tab: 'waiting', approve: id })}`;   // the director dashboard's approval queue (moments.js mountMomentApprovals)
    case 'lead': return may('crm') ? `${base}/crm${q({ lead: id })}` : null;
    case 'crm': return may('crm') ? `${base}/crm${q({ view: id })}` : null;
    case 'crm-stage': return may('crm') ? `${base}/crm${q({ stage: id })}` : null;
    case 'hiring': return may('hiring') ? `${base}/hiring${q({ view: id })}` : null;
    case 'application': return may('hiring') ? `${base}/hiring${q({ app: id })}` : null;
    case 'billing': return may('billing') ? `${base}/billing${id ? `#${id}` : ''}` : null;
    case 'compliance': return may('compliance') ? `${base}/compliance` : null;
    case 'safety': return may('safety') ? `${base}/safety` : null;
    case 'licensing': return may('licensing') ? `${base}/licensing${q({ tab: id })}` : null;
    case 'health': return may('health') ? `${base}/health${q({ kid })}` : null;
    case 'mar': return may('health') ? `${base}/health${q({ view: 'mar', room })}` : null;
    case 'sped': return may('plans') ? `${base}/plans` : null;
    case 'arrivals': return may('arrivals') ? `${base}/arrivals${q({ room })}` : null;
    case 'pickup': return may('arrivals') ? `${base}/arrivals${q({ room })}` : null;
    case 'sub': return may('sub') ? `${base}/sub${q({ room })}` : null;
    case 'reports': return may('reports') ? `${base}/reports${q({ room })}` : null;
    case 'calendar': return may('calendar') ? `${base}/calendar${q({ date: id })}` : null;
    case 'licensing-mine': return may('licensing') ? `${base}/licensing` : null;
    case 'clock': return may('clock') ? `${base}/clock` : null;
    case 'people': return may('people') ? `${base}/people` : null;
    case 'settings': return may('settings') ? `${base}/settings` : null;
    case 'staff-invite': return may('staff') ? `${base}/staff` : null;
    case 'timeclock': return may('timeclock') ? `${base}/timeclock` : null;
    case 'messages': return may('messages') ? `${base}/messages` : null;
    case 'consents': return may('consents') ? `${base}/consents` : null;
    case 'tab': return may(id) ? `${base}/${id}` : null;
    case 'classic': return `${base}/home?classic=1`;
    default: return dashLink(kind, id, { slug, allowed, room, kid, extra: ctx.extra || {} });
  }
}

// ---- ratio --------------------------------------------------------------------------------------------------------------------
// One room's live ratio, read-only: the database decides the rule (compliance_ratio_live inside staff_dashboard / director_dashboard).
// No rule on file = "not connected", never "ok". required = teachers the children here need under the cited table.
export function ratioState(r) {
  if (!r || !r.result) return { tone: 'nc', present: num(r?.present), ratio: null, required: null, perStaff: null };
  const res = r.result;
  const ratio = res.row?.ratio || null, perStaff = num(res.row?.children_per_staff);
  if (res.status === 'empty') return { tone: 'ok', present: 0, ratio, required: 0, perStaff };
  if (res.status === 'no_rule' || res.status === 'no_profile') return { tone: 'nc', present: num(r.present), ratio: null, required: null, perStaff: null };
  return { tone: res.status === 'over' ? 'bad' : 'ok', present: num(r.present) ?? num(res.total), ratio, required: num(res.required_staff), perStaff, maxGroup: num(res.max_group), citation: res.row?.citation || null };
}

// ---- teacher ---------------------------------------------------------------------------------------------------------------
// d = staff_dashboard(center, room); x = { mar, alerts, sped, clock } (each null when it could not be read)
export function teacherModel(d, x = {}, now = Date.now()) {
  const kids = d?.kids || [];
  const by = (s) => kids.filter((k) => k.state === s);
  const here = by('here');
  const enrolled = kids.length;
  const r = ratioState(d?.ratio);
  const mealsLogged = here.filter((k) => (k.meals || []).length).length;
  const resting = here.filter((k) => k.resting_since).length;
  const rested = here.filter((k) => k.rested && !k.resting_since).length;
  const l = d?.learning || null;
  const observe = num(d?.todo?.observe_total) ?? (d?.todo?.observe || []).length;
  return {
    enrolled, here: here.length, out: by('out').length, gone: by('gone').length, absent: by('absent').length, ratio: r,
    meals: { logged: mealsLogged, of: here.length },
    naps: { done: rested + resting, resting, of: here.length },
    // skill checks: off for the center / none assigned this week are real states (not "not connected"); no learning block = could not read
    checks: l && l.enabled !== false && l.assignments ? { state: 'ok', done: num(l.done), of: num(l.children), observe }
      : { state: !l ? 'nc' : l.enabled === false ? 'off' : 'none', done: null, of: null, observe },
    reports: d?.reports || null,
    since: now,
  };
}
// morning at the top, evening at the bottom: every staff day list (messages, announcements, medicines, absences, closures,
// clock-ins, incidents, meetings, the attention band within each urgency) reads oldest/earliest first (owner rule, 2026-10-12)
export function clockKey(v) {
  if (v == null || v === '') return Infinity;
  if (typeof v === 'number') return Number.isFinite(v) ? v : Infinity;
  const hm = /^(\d{1,2}):(\d{2})/.exec(String(v));
  if (hm) return Number(hm[1]) * 60 + Number(hm[2]);
  const t = Date.parse(String(v));
  return Number.isNaN(t) ? Infinity : t;
}
export function byClock(list, pick) {
  return (list || []).map((v, i) => [v, clockKey(pick(v)), i]).sort((a, b) => (a[1] === b[1] ? a[2] - b[2] : a[1] < b[1] ? -1 : 1)).map((z) => z[0]);
}
export function inClockOrder(list, pick) { const k = (list || []).map((v) => clockKey(pick(v))); return k.every((v, i) => !i || k[i - 1] <= v); }
// the first dose time of a medicine (its earliest slot), for ordering the medicine lists
export const firstSlot = (m) => (m?.slots || []).map((s) => clockKey(s.time)).reduce((a, b) => Math.min(a, b), Infinity);

// the attention band: most urgent first; within one urgency, earliest in the day first (untimed items keep their order, after the timed ones)
export function byUrgencyThenClock(items) {
  const rank = { now: 0, soon: 1, later: 2 }, at = (v) => (Number.isFinite(v.at) ? v.at : Infinity);
  return items.map((v, i) => [v, i]).sort((a, b) => rank[a[0].tone] - rank[b[0].tone] || (at(a[0]) === at(b[0]) ? a[1] - b[1] : at(a[0]) < at(b[0]) ? -1 : 1)).map((z) => z[0]);
}
// a moment as minutes since midnight ("14:30", an ISO time, epoch ms): one scale for the band
export function dayMinutes(v) {
  const k = clockKey(v); if (!Number.isFinite(k)) return Infinity;
  if (typeof v === 'string' && /^\d{1,2}:\d{2}/.test(v)) return k;
  const dt = new Date(k); return dt.getHours() * 60 + dt.getMinutes();
}
// children still here late in the day (after 4:30 pm at the center): the pickup reminder
export function stillHere(d, centerMinutes) { return centerMinutes >= 16 * 60 + 30 ? (d?.kids || []).filter((k) => k.state === 'here').length : 0; }

export function teacherAttention(d, x, ctx, lang = 'en', centerMinutes = 0) {
  const A = sw(lang).a, G = A.go, t = d?.todo || {}, out = [];
  const L = (kind, id, o = {}) => staffLink(kind, id, { ...ctx, ...o });
  for (const i of t.incidents || []) out.push({ key: `inc:${i.id}`, at: dayMinutes(i.at || i.occurred_at || i.created_at), tone: 'now', icon: 'incident', kid: i.kid, title: A.incident(i.first), sub: A.incidentSub, href: L('incident', i.id), go: G.finish });
  // one chip per medicine, however many doses are due or overdue ("Omar: 2 doses" with their times)
  for (const m of x?.mar?.meds || []) {
    const due = (m.slots || []).filter((s) => s.state === 'due' || s.state === 'overdue');
    if (!due.length) continue;
    const times = due.map((s) => { const t = /^(\d{1,2}):(\d{2})/.exec(String(s.time || '')); return t ? hhmmText(Number(t[1]) * 60 + Number(t[2]), lang) : s.time; }).join(', ');
    const over = due.some((s) => s.state === 'overdue');
    out.push({ key: `med:${m.id}`, at: Math.min(...due.map((s) => clockKey(s.time))), tone: over ? 'now' : 'soon', icon: 'med', kid: m.kid, title: due.length > 1 ? A.medsN(m.first, due.length) : A.meds(m.first), sub: A.medsSub(times, over ? 'overdue' : 'due'), href: L('mar', null, { room: d?.room }), go: G.give });
  }
  const hereIds = new Set((d?.kids || []).filter((k) => k.state === 'here').map((k) => k.kid));
  for (const a of x?.alerts || []) if (hereIds.has(a.kid) && a.emergency_med && a.top_severity === 'life_threatening') {
    out.push({ key: `alg:${a.kid}`, tone: 'soon', icon: 'alert', kid: a.kid, title: A.allergy(a.first), sub: A.allergySub, href: L('child', a.kid), go: G.check });
  }
  const late = stillHere(d, centerMinutes);
  if (late) out.push({ key: 'pickup', at: 16 * 60 + 30, tone: centerMinutes >= 17 * 60 + 30 ? 'now' : 'soon', icon: 'pickup', title: A.pickup(late), sub: A.pickupSub, href: L('pickup', null, { room: d?.room }), go: G.pickups });
  for (const m of t.messages || []) out.push({ key: `msg:${m.id}`, at: dayMinutes(m.at), tone: 'soon', icon: 'chat', kid: m.kid, title: A.message(m.first), sub: m.text || '', href: L('message', m.id, { kid: m.kid }), go: G.reply });
  for (const o of t.observe || []) out.push({ key: `obs:${o.assignment}:${o.kid}:${o.item}`, tone: 'soon', icon: 'star', kid: o.kid, title: A.observe(o.first), sub: o.title || '', href: L('observe', `${o.assignment}:${o.kid}:${o.item}`, { room: d?.room }), go: G.score });
  for (const f of t.flagged || []) out.push({ key: `flag:${f.id}`, tone: 'soon', icon: 'star', kid: f.kid, title: A.flagged(f.first), sub: '', href: L('flagged', f.id, { room: d?.room }), go: G.review });
  for (const p of t.drafts || []) out.push({ key: `draft:${p.id}`, tone: 'later', icon: 'report', kid: p.kid, title: A.draft(p.first), sub: `${p.from} – ${p.to}`, href: L('draft', p.id, { room: d?.room, kid: p.kid, extra: { from: p.from, to: p.to } }), go: G.open });
  for (const v of t.videos || []) out.push({ key: `vid:${v.id}`, tone: 'later', icon: 'video', kid: v.kid, title: A.video(v.first), sub: '', href: L('video', v.id), go: G.open });
  for (const u of t.uploads || []) out.push({ key: `up:${u.id}`, tone: 'later', icon: 'heart', kid: u.kid, title: A.upload(u.first), sub: '', href: L('upload', u.id, { room: d?.room }), go: G.reply });
  for (const s of x?.sped?.items || []) if (s.overdue || s.kind === 'meeting') out.push({ key: `sped:${s.kind}:${s.plan}`, tone: s.overdue ? 'soon' : 'later', icon: 'doc', kid: s.kid, title: `${s.first}: ${s.kind.replace(/_/g, ' ')}`, sub: s.on || s.at || '', href: L('sped-plan', s.plan, { kid: s.kid }), go: G.open });
  return byUrgencyThenClock(out);
}

// ---- director ------------------------------------------------------------------------------------------------------------
// The center-wide ratio: teachers the children here need (sum of the rooms' required staff) against staff on the clock.
export function centerRatio(rooms, onDuty) {
  const rs = (rooms || []).map((r) => ({ id: r.id, name: r.name, present: num(r.attendance?.here) ?? 0, enrolled: num(r.enrolled), capacity: num(r.capacity), ...ratioState(r.ratio) }));
  const known = rs.filter((r) => r.required != null);
  const required = known.length ? known.reduce((t, r) => t + r.required, 0) : null;
  const staff = Array.isArray(onDuty) ? onDuty.length : null;
  const short = required != null && staff != null ? Math.max(0, required - staff) : null;
  return { rooms: rs, required, staff, short, tone: required == null || staff == null ? 'nc' : short ? 'bad' : 'ok' };
}
export function enrollmentKpi(capacityRows) {
  const rows = capacityRows || null;
  if (!rows) return null;
  const withCap = rows.filter((r) => r.capacity != null);
  const enrolled = rows.reduce((t, r) => t + (num(r.enrolled) || 0), 0);
  const cap = withCap.length ? withCap.reduce((t, r) => t + num(r.capacity), 0) : null;
  return { enrolled, capacity: cap, frac: frac(enrolled, cap), open: cap == null ? null : Math.max(0, cap - enrolled) };
}
export function attendanceKpi(rooms) {
  if (!rooms) return null;
  const here = rooms.reduce((t, r) => t + (num(r.attendance?.here) || 0) + (num(r.attendance?.gone) || 0), 0);
  const enrolled = rooms.reduce((t, r) => t + (num(r.enrolled) || 0), 0);
  const absent = rooms.reduce((t, r) => t + (num(r.attendance?.absent) || 0), 0);
  return { here, enrolled, absent, frac: frac(here, enrolled) };
}
// tuition this month: billed = invoices dated this month (not void / draft), collected = payments received this month (DIRECTORS ONLY)
export function cashModel(invoices, payments, monthStart, today) {
  if (!invoices || !payments) return null;
  const inMonth = (d) => d && d >= monthStart && d <= today.slice(0, 8) + '31';
  const live = invoices.filter((i) => !['void', 'draft', 'written_off'].includes(i.status));
  const billed = live.filter((i) => inMonth(String(i.invoice_date || '').slice(0, 10))).reduce((t, i) => t + Number(i.family_cents || 0), 0);
  const collected = payments.filter((p) => inMonth(String(p.received_on || '').slice(0, 10))).reduce((t, p) => t + (p.kind === 'reversal' ? -1 : 1) * Number(p.amount_cents || 0), 0);
  const pastDue = live.filter((i) => i.status === 'past_due' || (i.status === 'open' && String(i.due_date) < today));
  const sign = (p) => (p.kind === 'reversal' ? -1 : 1);
  const paidOn = new Map(); for (const p of payments) if (p.invoice_id) paidOn.set(p.invoice_id, (paidOn.get(p.invoice_id) || 0) + sign(p) * Number(p.amount_cents || 0));
  const open = live.filter((i) => i.status === 'open' || i.status === 'past_due').reduce((t, i) => t + Number(i.family_cents || 0) - (paidOn.get(i.id) || 0), 0);
  // by week (Monday) for the flow chart
  const weeks = new Map();
  const wk = (d) => { const x = new Date(`${d}T12:00:00Z`); x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7)); return x.toISOString().slice(0, 10); };
  for (const i of live) { const d = String(i.invoice_date || '').slice(0, 10); if (!inMonth(d)) continue; const w = wk(d); const e = weeks.get(w) || { week: w, billed: 0, collected: 0 }; e.billed += Number(i.family_cents || 0); weeks.set(w, e); }
  for (const p of payments) { const d = String(p.received_on || '').slice(0, 10); if (!inMonth(d)) continue; const w = wk(d); const e = weeks.get(w) || { week: w, billed: 0, collected: 0 }; e.collected += Number(p.amount_cents || 0); weeks.set(w, e); }
  return { billed, collected, open: Math.max(0, open), pastDue: pastDue.length, pastDueCents: pastDue.reduce((t, i) => t + Number(i.family_cents || 0), 0), frac: frac(collected, billed),
    weeks: [...weeks.values()].sort((a, b) => a.week.localeCompare(b.week)), pastDueList: pastDue };
}
// the enrollment funnel: crm_funnel(...).counts in pipeline order
export const FUNNEL = ['inquiry', 'tour_booked', 'toured', 'applied', 'waitlisted', 'offered', 'enrolled'];
export function funnelModel(f) {
  if (!f || !f.counts) return null;
  const c = f.counts;
  // a family counts in every stage it has reached (cumulative from the end), so the funnel narrows
  const own = FUNNEL.map((s) => num(c[s]) || 0);
  const reached = own.map((_, i) => own.slice(i).reduce((t, n) => t + n, 0));
  const top = reached[0] || 0;
  return { stages: FUNNEL.map((s, i) => ({ stage: s, now: own[i], reached: reached[i], frac: frac(reached[i], top) })), lost: num(c.lost) || 0, total: top };
}
// attendance heat calendar: per school day of the month, children checked in / enrolled (closed days marked)
export function heatModel(events, enrolled, monthStart, today, closedDays = []) {
  if (!events || !enrolled) return null;
  const per = new Map();
  for (const e of events) if (e.kind === 'check_in') { const d = String(e.date).slice(0, 10); (per.get(d) || per.set(d, new Set()).get(d)).add(e.kid); }
  const closed = new Set(closedDays);
  const days = [];
  const end = new Date(`${monthStart}T12:00:00Z`); end.setUTCMonth(end.getUTCMonth() + 1); end.setUTCDate(0);
  for (let d = new Date(`${monthStart}T12:00:00Z`); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const iso = d.toISOString().slice(0, 10), w = d.getUTCDay();
    if (w === 0 || w === 6) continue;
    const n = per.get(iso)?.size ?? 0;
    days.push({ day: iso, dow: w, n, of: enrolled, frac: iso <= today && !closed.has(iso) ? frac(n, enrolled) : null, state: closed.has(iso) ? 'closed' : iso > today ? 'ahead' : iso === today ? 'today' : 'past' });
  }
  const past = days.filter((x) => x.frac != null);
  return { days, avg: past.length ? Math.round((past.reduce((t, x) => t + x.frac, 0) / past.length) * 100) : null };
}
// staffing vs need through the day, every 30 minutes from 7:00 to 18:00 (center time): children here per room -> teachers needed
// (ceil(children / children per staff)), against staff on the clock. minutesOf(iso) gives the center's minutes after midnight.
export function staffingModel(events, punches, rooms, minutesOf, nowMin) {
  if (!events || !punches || !rooms) return null;
  const per = new Map(rooms.map((r) => [r.id, ratioState(r.ratio).perStaff]));
  if (![...per.values()].some((v) => v)) return null;
  const spans = new Map();
  for (const e of [...events].sort((a, b) => String(a.at).localeCompare(String(b.at)))) {
    const m = minutesOf(e.at); if (m == null) continue;
    const s = spans.get(e.kid) || { room: e.room, in: null, out: null };
    if (e.kind === 'check_in' && s.in == null) s.in = m; if (e.kind === 'check_out') s.out = m;
    spans.set(e.kid, s);
  }
  const staff = punches.filter((p) => !p.voided_at).map((p) => ({ in: minutesOf(p.in_at), out: p.out_at ? minutesOf(p.out_at) : null })).filter((p) => p.in != null);
  const slots = [];
  for (let t = 7 * 60; t <= 18 * 60; t += 30) {
    if (nowMin != null && t > nowMin + 1) { slots.push({ t, children: null, need: null, on: null }); continue; }
    const byRoom = new Map();
    for (const s of spans.values()) if (s.in != null && s.in <= t && (s.out == null || s.out > t)) byRoom.set(s.room, (byRoom.get(s.room) || 0) + 1);
    let need = 0, children = 0;
    for (const [room, n] of byRoom) { children += n; const p = per.get(room); need += p ? Math.ceil(n / p) : 0; }
    const on = staff.filter((p) => p.in <= t && (p.out == null || p.out > t)).length;
    slots.push({ t, children, need, on });
  }
  const seen = slots.filter((s) => s.need != null);
  return { slots, max: Math.max(1, ...seen.map((s) => Math.max(s.need, s.on))), short: seen.filter((s) => s.on < s.need).length };
}
// compliance countdown: the next items with a date (overdue first), from compliance_due
export function countdownModel(due) {
  if (!due) return null;
  const dated = due.filter((i) => i.days_left != null && ['overdue', 'due_7', 'due_30', 'due_90'].includes(i.bucket)).sort((a, b) => a.days_left - b.days_left);
  // a mix: at most two staff records, so a drill or an incident deadline is never pushed off by old staff paperwork
  const pick = []; let staff = 0;
  for (const i of dated) { if (i.kind === 'staff') { if (staff >= 2) continue; staff++; } pick.push(i); if (pick.length === 4) break; }
  return { items: pick.slice(0, 3).map((i) => ({ title: i.title, date: i.due_date, days: i.days_left, bucket: i.bucket, kind: i.kind, citation: i.citation, detail: i.detail, frac: i.days_left < 0 ? 1 : 1 - Math.min(1, i.days_left / 30) })),
    overdue: due.filter((i) => i.bucket === 'overdue').length, week: due.filter((i) => i.bucket === 'due_7').length, needsInfo: due.filter((i) => i.bucket === 'needs_info').length };
}

// the director's attention band, from every source (each item links to the exact page / item)
export function directorAttention(src, ctx, lang = 'en') {
  const A = sw(lang).a, G = A.go, out = [];
  const L = (kind, id, o = {}) => staffLink(kind, id, { ...ctx, ...o });
  const rat = src.ratio;
  if (rat && rat.short) out.push({ key: 'ratio', tone: 'now', icon: 'ratio', title: A.ratio(rat.short), sub: A.ratioSub, href: L('timeclock'), go: G.staff });
  const due = src.due || [];
  const inc = due.filter((i) => i.kind === 'incident' && ['overdue', 'due_7'].includes(i.bucket)).length + (num(src.family?.incidents_unacked) || 0);
  if (inc) out.push({ key: 'incidents', tone: 'now', icon: 'incident', title: A.incidentsReview(inc), sub: A.incidentsSub, href: L('safety'), go: G.review });
  const ex = src.exceptions || [];
  const creds = ex.filter((e) => /^(credential_|clearance_)/.test(e.kind || '')).length;
  if (creds) out.push({ key: 'creds', tone: ex.some((e) => /expired/.test(e.kind)) ? 'now' : 'soon', icon: 'badge', title: A.creds(creds), sub: A.credsSub, href: L('compliance'), go: G.review });
  const tr = ex.filter((e) => e.kind === 'training_overdue').length;
  if (tr) out.push({ key: 'training', tone: 'soon', icon: 'learn', title: A.trainingOver(tr), sub: '', href: L('licensing', 'training'), go: G.open });
  const hc = src.health;
  const immun = hc ? (hc.children || []).filter((k) => (k.open || []).some((o) => o.item === 'immunization_record' && (o.state === 'overdue' || o.state === 'due'))).length : 0;
  if (immun) out.push({ key: 'immun', tone: hc.counts?.overdue ? 'now' : 'soon', icon: 'med', title: A.immun(immun), sub: A.immunSub, href: L('health'), go: G.review });
  if (src.cash?.pastDue) out.push({ key: 'invoices', tone: 'soon', icon: 'tuition', title: A.invoices(src.cash.pastDue), sub: money(src.cash.pastDueCents, lang) || '', href: L('billing', 'invoices'), go: G.open });
  const crm = src.crm;
  if (crm?.first_contact_overdue) out.push({ key: 'leads', tone: 'now', icon: 'people', title: A.leads(crm.first_contact_overdue), sub: '', href: L('crm-stage', 'inquiry'), go: G.reply });
  if (crm?.tours_next_7d) out.push({ key: 'tours', tone: 'later', icon: 'calendar', title: A.tours(crm.tours_next_7d), sub: '', href: L('crm', 'pipeline'), go: G.open });
  const packets = (src.intakes || []).filter((i) => i.status === 'submitted').length;
  if (packets) out.push({ key: 'packets', tone: 'soon', icon: 'doc', title: A.packets(packets), sub: '', href: L('enroll'), go: G.review });
  if (src.hiring?.interviews_week) out.push({ key: 'interviews', tone: 'later', icon: 'people', title: A.interviews(src.hiring.interviews_week), sub: '', href: L('hiring', 'interviews'), go: G.open });
  const lic = due.filter((i) => i.kind !== 'incident' && ['overdue', 'due_7'].includes(i.bucket)).length;
  if (lic) out.push({ key: 'due', tone: due.some((i) => i.kind !== 'incident' && i.bucket === 'overdue') ? 'now' : 'soon', icon: 'shield', title: A.due(lic), sub: A.dueSub, href: L('compliance'), go: G.review });
  const f = src.family || {};
  const content = (num(f.videos_pending) || 0) + (num(f.messages_pending) || 0) + (num(f.consents_pending) || 0);
  const mo = num(src.moments?.pending?.length);
  if (mo) out.push({ key: 'moments', tone: 'soon', icon: 'camera', title: A.moments(mo), sub: A.momentsSub, href: L('moments-approve', mo === 1 ? src.moments.pending[0].id : null), go: G.review });
  if (content) out.push({ key: 'content', tone: 'later', icon: 'video', title: A.content(content), sub: A.contentSub, href: L('videos'), go: G.review });
  return byUrgencyThenClock(out);
}

// every staff page that existed before v2, per role, grouped: the inventory (the "All pages" tab and the docs; nothing is lost)
export const PAGE_GROUPS = [
  ['classroom', ['today', 'arrivals', 'meals', 'reports', 'program', 'rhythm', 'safety', 'plan', 'roster', 'sub', 'curriculum', 'library', 'habits', 'work', 'learn', 'grades', 'checkpoints', 'adapt', 'plans', 'goal-entry']],
  ['families', ['children', 'enroll', 'crm', 'inbox', 'chat', 'messages', 'videos', 'families', 'import', 'consents', 'help-desk']],
  ['staff', ['hiring', 'staff', 'permissions', 'recovery', 'timeclock', 'clock', 'people', 'licensing']],
  ['center', ['calendar', 'compliance', 'health', 'kitchen', 'billing', 'settings', 'support', 'organization']],
];
export const PAGE_GROUP_WORD = { en: { classroom: 'Classroom', families: 'Families', staff: 'Staff', center: 'Center' }, es: { classroom: 'Salón', families: 'Familias', staff: 'Personal', center: 'Centro' } };
export function pagesFor(tabs) {
  const have = new Map((tabs || []).map(([id, label]) => [id, label]));
  const groups = PAGE_GROUPS.map(([g, ids]) => ({ group: g, pages: ids.filter((id) => have.has(id)).map((id) => ({ id, label: have.get(id) })) })).filter((g) => g.pages.length);
  const known = new Set(PAGE_GROUPS.flatMap(([, ids]) => ids).concat('home'));
  const rest = (tabs || []).filter(([id]) => !known.has(id)).map(([id, label]) => ({ id, label }));
  if (rest.length) groups.push({ group: 'center', pages: rest });
  return groups;
}

// ---- the teacher's Game plan (hub/TEACHER_DAY.md): ten steps in the order of the day ---------------------------------------------
// Default times (minutes after midnight, the center's clock). A center's own schedule is not connected yet: the page says so.
export const DAY_STEPS = [
  { id: 'open', from: 6 * 60 + 45, to: 7 * 60 + 30, icon: 'home', tone: 'navy' },
  { id: 'arrive', from: 7 * 60 + 30, to: 8 * 60 + 30, icon: 'pickup', tone: 'booker' },
  { id: 'breakfast', from: 8 * 60 + 30, to: 9 * 60, icon: 'meal', tone: 'zuri', meal: 'breakfast' },
  { id: 'lessons', from: 9 * 60, to: 10 * 60 + 30, icon: 'book', tone: 'booker' },
  { id: 'outside', from: 10 * 60 + 30, to: 11 * 60 + 30, icon: 'sun', tone: 'bop' },
  { id: 'lunch', from: 11 * 60 + 30, to: 12 * 60 + 15, icon: 'meal', tone: 'zuri', meal: 'lunch' },
  { id: 'rest', from: 12 * 60 + 30, to: 14 * 60 + 30, icon: 'nap', tone: 'lumi' },
  { id: 'afternoon', from: 14 * 60 + 30, to: 16 * 60, icon: 'star', tone: 'gold', meal: 'snack' },
  { id: 'pickup', from: 16 * 60, to: 17 * 60 + 30, icon: 'pickup', tone: 'booker' },
  { id: 'close', from: 17 * 60 + 30, to: 18 * 60, icon: 'check', tone: 'navy' },
];
// which curriculum block types belong to which step (the curriculum's own order is kept inside a step)
export const BLOCK_STEP = { circle: 'lessons', 'picture-talk': 'lessons', 'friends-live': 'lessons', activity: 'lessons', zones: 'lessons', story: 'afternoon',
  outside: 'outside', move: 'outside', meal: 'lunch', family: 'afternoon', goodbye: 'pickup' };
// now / next for a time of day: the step holding the time, else the next one to come (before the day: step 1; after: the last)
export function stepNow(min) {
  if (min == null) return { now: 0, next: 1 };
  let i = DAY_STEPS.findIndex((s) => min >= s.from && min < s.to);
  if (i < 0) { const n = DAY_STEPS.findIndex((s) => min < s.from); i = n < 0 ? DAY_STEPS.length - 1 : n; }
  return { now: i, next: i + 1 < DAY_STEPS.length ? i + 1 : null };
}
export function stepState(i, cur) { return i < cur.now ? 'done' : i === cur.now ? 'now' : i === cur.next ? 'next' : 'later'; }
export function blocksFor(stepId, blocks) { return (blocks || []).filter((b) => (BLOCK_STEP[b.type] || (b.type ? 'lessons' : 'lessons')) === stepId); }
export function hhmmText(min, lang = 'en') { return hhmmFmt(min, lang); }
const hhmmFmt = (min, lang = 'en') => new Intl.DateTimeFormat(lang === 'es' ? 'es-US' : 'en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(new Date(Date.UTC(2000, 0, 1, Math.floor(min / 60), min % 60)));

// allergy checks: a child's active allergy / diet alerts against the names of the items served (a reminder, never a decision)
export const ALLERGEN_WORDS = {
  dairy: ['milk', 'cheese', 'yogurt', 'yoghurt', 'butter', 'cream', 'dairy'], peanut: ['peanut'], 'tree nut': ['almond', 'walnut', 'cashew', 'pecan', 'pistachio', 'hazelnut', 'tree nut'],
  egg: ['egg'], wheat: ['wheat', 'bread', 'pasta', 'tortilla', 'cracker', 'muffin', 'pancake', 'bagel', 'roll'], gluten: ['wheat', 'bread', 'pasta', 'cracker', 'muffin', 'pancake', 'bagel', 'barley', 'rye'],
  fish: ['fish', 'salmon', 'tuna', 'cod', 'tilapia'], shellfish: ['shrimp', 'crab', 'lobster', 'shellfish'], soy: ['soy', 'tofu', 'edamame'], sesame: ['sesame', 'tahini', 'hummus'],
  pork: ['pork', 'ham', 'bacon', 'sausage'], vegetarian: ['chicken', 'beef', 'turkey', 'pork', 'ham', 'fish', 'meatball', 'sausage', 'bacon'],
};
export function allergenKeys(label) {
  const t = String(label || '').toLowerCase();
  const keys = Object.keys(ALLERGEN_WORDS).filter((k) => t.includes(k) || (k === 'dairy' && /\bmilk|lactose/.test(t)) || (k === 'tree nut' && /tree[- ]?nut|\bnuts?\b/.test(t)) || (k === 'vegetarian' && /vegetarian|vegan/.test(t)));
  return keys;
}
// alerts: care_alert_board rows ({kid, alerts:[{type, label}]}); items: [{name}]. Returns Map(kid -> [{item, alert}])
export function allergyChecks(alerts, items) {
  const out = new Map();
  for (const a of alerts || []) for (const al of a.alerts || []) {
    if (!['allergy', 'diet'].includes(al.type)) continue;
    const keys = allergenKeys(al.label);
    for (const it of items || []) {
      const name = String(it.name || '').toLowerCase();
      if (keys.some((k) => ALLERGEN_WORDS[k].some((w) => name.includes(w)))) (out.get(a.kid) || out.set(a.kid, []).get(a.kid)).push({ item: it.name, alert: shortName(al.label) });
    }
  }
  return out;
}
export const GP = {
  en: { title: 'Game plan', now: 'Now', next: 'Next', done: 'Done', later: 'Later', defaultTimes: 'Default times: your center\'s own schedule is not connected yet.',
    steps: { open: 'Open the room', arrive: 'Arrivals', breakfast: 'Breakfast', lessons: 'Circle and lessons', outside: 'Outside and movement', lunch: 'Lunch', rest: 'Rest', afternoon: 'Afternoon', pickup: 'Pickup', close: 'End of day' },
    hints: { open: 'Clock in, check the room, read today\'s alerts', arrive: 'Check in at the door, health check, notes', breakfast: 'Serve and log what each child ate', lessons: "Today's curriculum, in order", outside: 'Outdoor play and the Bop moves', lunch: 'Serve and log what each child ate', rest: 'Rest start and stop', afternoon: 'Snack, story and the family activity', pickup: 'Who is still here, who may pick up', close: 'Reports, follow-ups, clock out' },
    checklist: 'Room ready and safe', checks: ['Outlets covered, cords out of reach', 'Gates and doors latched', 'Cots or mats ready for rest', 'First-aid kit stocked', 'Outdoor area walked for hazards', 'Sign-in sheet and pickup list at the door'],
    tabletOnly: 'Ticks are kept on this tablet for today (no checklist record yet).', todayAlerts: "Today's alerts", meds: 'Medicine times', absences: 'Absent today', custody: 'Custody and pickup alerts', ratioToday: 'Ratio for today',
    expected: (n, e) => `${n} of ${e} expected`, prep: 'Prep for today', materials: 'Materials', supplies: 'Supplies for the day', noPlan: 'No curriculum day today.',
    checkIn: 'Check in at the door', dropNotes: 'Notes from families', none: 'Nothing here.', menu: 'On the menu', logMeal: (m) => `Log ${m}`, noMenu: 'No menu for this room today.',
    friendOfDay: 'Friend of the day', unit: (u, w) => `Unit ${u} · Week ${w}`, goal: 'Goal', steps2: 'How to run it', prompts: 'Say', watch: 'Watch for (Learning Steps)', family: 'Family connection',
    outdoorGoal: 'Aim for 1 hour outside today (both states).', weather: 'Check the weather before going out (weather is not connected yet).', bopMoves: 'Bop moves',
    restRule: 'A child who does not sleep rests 30 minutes to 1 hour, then quiet play.', resting: 'Resting', notResting: 'Not resting', startRest: 'Start rest', endRest: 'End rest', since: (t) => `since ${t}`,
    stillHere: 'Still here', pickupList: 'May pick up', checkOut: 'Check out at the door', reportsSent: (p, t) => `Evening reports: ${p} of ${t} sent (about 5:30 pm)`,
    followUps: 'Follow-ups', noteTomorrow: 'Note for tomorrow', noteHint: 'Kept on this tablet (no handoff record yet).', clockOut: 'Clock out', print: 'Print the day',
    amounts: 'How much', askedMore: 'Asked for more', triedNew: 'Tried a new food', check: 'Check', saveMeal: 'Save for the selected children', allFor: 'All', perItem: 'Tap an amount for each item',
    week: 'This week', unitView: 'The unit', openDay: 'Open', checkFor: (a) => `Check: ${a}`, noneOnFile: 'no one on file yet: ask the director',
    rel: { parent: 'parent', grandparent: 'grandparent', family_friend: 'family friend', aunt_uncle: 'aunt or uncle', sibling: 'sibling', guardian: 'guardian', nanny: 'nanny', other: 'other' } },
  es: { title: 'Plan del día', now: 'Ahora', next: 'Después', done: 'Hecho', later: 'Más tarde', defaultTimes: 'Horario predeterminado: el horario propio de su centro todavía no está conectado.',
    steps: { open: 'Abrir el salón', arrive: 'Llegadas', breakfast: 'Desayuno', lessons: 'Círculo y lecciones', outside: 'Afuera y movimiento', lunch: 'Almuerzo', rest: 'Descanso', afternoon: 'Tarde', pickup: 'Salida', close: 'Fin del día' },
    hints: { open: 'Marcar entrada, revisar el salón, leer las alertas de hoy', arrive: 'Registro en la puerta, revisión de salud, notas', breakfast: 'Servir y registrar lo que comió cada niño', lessons: 'El currículo de hoy, en orden', outside: 'Juego afuera y los movimientos de Bop', lunch: 'Servir y registrar lo que comió cada niño', rest: 'Inicio y fin del descanso', afternoon: 'Refrigerio, cuento y la actividad en familia', pickup: 'Quién sigue aquí, quién puede recoger', close: 'Informes, seguimientos, marcar salida' },
    checklist: 'Salón listo y seguro', checks: ['Enchufes cubiertos, cables fuera de alcance', 'Rejas y puertas cerradas', 'Catres o colchonetas listos', 'Botiquín completo', 'Área de afuera revisada', 'Hoja de registro y lista de recogida en la puerta'],
    tabletOnly: 'Las marcas se guardan en esta tableta por hoy (todavía no hay registro de la lista).', todayAlerts: 'Alertas de hoy', meds: 'Horarios de medicinas', absences: 'Ausentes hoy', custody: 'Alertas de custodia y recogida', ratioToday: 'Proporción de hoy',
    expected: (n, e) => `${n} de ${e} esperados`, prep: 'Preparar para hoy', materials: 'Materiales', supplies: 'Materiales del día', noPlan: 'Hoy no hay día de currículo.',
    checkIn: 'Registrar en la puerta', dropNotes: 'Notas de las familias', none: 'Nada aquí.', menu: 'En el menú', logMeal: (m) => `Registrar ${m}`, noMenu: 'No hay menú para este salón hoy.',
    friendOfDay: 'Amigo del día', unit: (u, w) => `Unidad ${u} · Semana ${w}`, goal: 'Meta', steps2: 'Cómo hacerlo', prompts: 'Decir', watch: 'Observar (Pasos de aprendizaje)', family: 'Conexión con la familia',
    outdoorGoal: 'Meta: 1 hora afuera hoy (en ambos estados).', weather: 'Revise el clima antes de salir (el clima todavía no está conectado).', bopMoves: 'Movimientos de Bop',
    restRule: 'El niño que no duerme descansa de 30 minutos a 1 hora y luego juega en calma.', resting: 'Descansando', notResting: 'Sin descansar', startRest: 'Empezar descanso', endRest: 'Terminar descanso', since: (t) => `desde ${t}`,
    stillHere: 'Siguen aquí', pickupList: 'Pueden recoger', checkOut: 'Registrar salida en la puerta', reportsSent: (p, t) => `Informes de la tarde: ${p} de ${t} enviados (hacia las 5:30 pm)`,
    followUps: 'Seguimientos', noteTomorrow: 'Nota para mañana', noteHint: 'Se guarda en esta tableta (todavía no hay registro de entrega de turno).', clockOut: 'Marcar salida', print: 'Imprimir el día',
    amounts: 'Cuánto', askedMore: 'Pidió más', triedNew: 'Probó algo nuevo', check: 'Revisar', saveMeal: 'Guardar para los seleccionados', allFor: 'Todos', perItem: 'Toque una cantidad para cada alimento',
    week: 'Esta semana', unitView: 'La unidad', openDay: 'Abrir', checkFor: (a) => `Revisar: ${a}`, noneOnFile: 'nadie registrado todavía: pregunte a la directora',
    rel: { parent: 'madre o padre', grandparent: 'abuela o abuelo', family_friend: 'amistad de la familia', aunt_uncle: 'tía o tío', sibling: 'hermana o hermano', guardian: 'tutor', nanny: 'niñera', other: 'otra persona' } },
};
export const gp = (lang) => GP[lang === 'es' ? 'es' : 'en'];
