// The HQ / owner network portal: the pure part (no DOM; tests/hq-portal-unit.test.mjs imports it). hub/HQ_PORTAL.md.
//   - the views (rail, tabs) and the words, English + Spanish (DRAFT, pending the Spanish teacher's review)
//   - the models: a center's health score, the network KPIs, the attention items (each opening the exact center), inspection readiness,
//     the learning-insight lists, the break-glass form check
// Every figure comes from the HQ functions of migration 20261031600000_hq_portal.sql: counts and rates only, never a child, never money.
// A null figure is "not connected" or "hidden (under 5)" (`suppressed`), never a made-up zero.

export const HQ_VIEWS = [
  { id: 'overview', icon: 'pulse', tabs: [] },
  { id: 'centers', icon: 'room', tabs: ['list', 'lifecycle', 'licenses'] },
  { id: 'quality', icon: 'shield', tabs: ['licensing', 'drills', 'credentials', 'readiness'] },
  { id: 'curriculum', icon: 'book', tabs: ['adoption', 'publish', 'pipeline'] },
  { id: 'insights', icon: 'learn', tabs: ['likes', 'dropoff', 'gaps', 'time'] },
  { id: 'breakglass', icon: 'lock', tabs: ['grants', 'request', 'log'] },
  { id: 'settings', icon: 'gear', tabs: ['users', 'roles', 'alerts', 'look'] },
];
export const HQ_BAR = ['overview', 'centers', 'quality', 'insights'];

// The owner character on the hero: official cutouts only (web/friends/adults, from the plush masters). Configurable: Settings > Look.
export const HQ_CHARACTERS = ['principal-hazel', 'mr-moss'];
export const HQ_CHARACTER_DEFAULT = 'principal-hazel';
export const HQ_CHARACTER_KEY = 'ff-hq-character';
export const pickCharacter = (v) => (HQ_CHARACTERS.includes(v) ? v : HQ_CHARACTER_DEFAULT);

export const LIFECYCLE = ['onboarding', 'active', 'paused', 'closed'];
export const SCOPES = ['child_records', 'financials', 'settings', 'account_recovery', 'health_records', 'special_education'];
export const ALERT_KINDS = ['licence_expiring', 'credential_expiring', 'drill_overdue', 'ratio_short', 'critical_incident', 'break_glass', 'content_backlog'];

const EN = {
  nav: 'HQ views', more: 'More', moreTitle: 'More views', close: 'Close', openFull: 'Open the full page', actions: 'Quick actions',
  views: { overview: 'Network', centers: 'Centers', quality: 'Quality & compliance', curriculum: 'Curriculum & brand', insights: 'Learning insights', breakglass: 'Break-glass', settings: 'Settings' },
  short: { overview: 'Network', centers: 'Centers', quality: 'Quality', insights: 'Insights', more: 'More' },
  tabs: { list: 'All centers', lifecycle: 'Lifecycle', licenses: 'Licenses', licensing: 'Licensing', drills: 'Drills', credentials: 'Credentials', readiness: 'Inspection readiness',
    adoption: 'Who adopted what', publish: 'Publish an update', pipeline: 'Review pipeline', likes: 'What children like', dropoff: 'Where they stop', gaps: 'Content gaps', time: 'Time on platform',
    grants: 'Grants', request: 'Request access', log: 'Audit log', users: 'Network users', roles: 'Roles', alerts: 'Alert routing', look: 'Look' },
  sub: (v) => `${v}: sections`,
  hello: (n) => (n ? `Hello, ${n}` : 'The Futures Friends network'),
  title: 'The Futures Friends network', date: (d) => d,
  inStates: (l) => (l.length ? `Centers in ${l.join(' and ')}` : 'No state profile yet'),
  centersPill: (n, a) => `${n} centers · ${a} active`, bgPill: (n) => (n ? `${n} break-glass live` : 'No break-glass open'), bgPillSub: 'Audited, time-limited',
  window: 'Last 30 days', attention: 'Needs HQ attention', attentionN: (n) => `${n} item${n === 1 ? '' : 's'}`, showAll: (n) => `Show all ${n}`, showFewer: 'Show fewer', allClear: 'Nothing needs HQ right now.', open: 'Open',
  kEnroll: 'Enrollment vs capacity', kAttend: 'Attendance', kStaff: 'Staffing coverage', kComp: 'Compliance', kInc: 'Open incidents', kContent: 'Waiting on a reviewer',
  kEnrollSub: (e, c) => `${e} enrolled of ${c} licensed seats`, kAttendSub: 'Child-days present, last 30 days', kStaffSub: (s, n) => `${s} of ${n} teachers the enrolled children need`,
  kCompSub: 'Average readiness score of the centers with a state profile', kIncSub: (n) => `${n} incident reports in 30 days (cells under 5 hidden)`, kContentSub: (n, d) => `${n} item${n === 1 ? '' : 's'} with a reviewer · ${Number(d || 0).toLocaleString('en-US')} library items in drafting`,
  nc: 'Not connected yet', hidden: 'under 5', hiddenTitle: 'From 1 to 4: hidden so no child can be picked out', small: 'Small center: no child figures',
  centersCard: 'Centers', centersSub: 'Health score per center (licence, drills, credentials, staffing, compliance, incidents). Tap a center for its summary.',
  health: 'Health', score: (n) => (n == null ? '—' : `${n}`), paused: 'Paused', closed: 'Closed', onboarding: 'Onboarding', active: 'Active',
  life: { onboarding: 'Onboarding', active: 'Active', paused: 'Paused', closed: 'Closed' },
  lifeSub: { onboarding: 'Setting up: no children yet', active: 'Open and running', paused: 'Read-only after the contract end', closed: 'Suspended or deleted' },
  tier: { hub_essentials: 'Hub Essentials', hub_curriculum: 'Hub + Curriculum', hub_complete: 'Hub Complete', trial: 'Trial' }, tierNone: 'No tier',
  tierDraft: 'Tier names and contents are DRAFT (owner to confirm against the Hub-only prices). No prices are shown here: money stays with billing.',
  state: 'State', enrolled: 'Enrolled', capacity: 'Capacity', attendance: 'Attendance', staff: 'Staff', needed: 'Needed', compliance: 'Compliance', incidents: 'Incidents',
  licence: 'Licence', licenceDays: (d) => (d == null ? 'No licence date on file' : d < 0 ? `Expired ${-d} days ago` : `Expires in ${d} days`),
  fire: 'Fire drill', tornado: 'Tornado drill', lastDrill: (d) => (d ? `Last ${d}` : 'None on file'), every: (m) => (m === 1 ? 'every month' : `every ${m} months`),
  overdue: 'Overdue', ok: 'On time', expired: 'Expired', expiring: 'Expiring in 60 days', credOk: 'All current',
  readiness: 'Inspection readiness', readinessSub: 'Licence, drills, credentials and the state checklist, in one score per center.',
  // attention items
  aLicence: (c, d) => (d < 0 ? `${c}: licence expired` : `${c}: licence expires in ${d} days`), aLicenceSub: 'Renewal paperwork',
  aCredExp: (c, n) => `${c}: ${n} staff credential${n === 1 ? '' : 's'} expired`, aCredSoon: (c, n) => `${c}: ${n} credential${n === 1 ? '' : 's'} expiring`, aCredSub: 'Within 60 days',
  aFire: (c) => `${c}: fire drill overdue`, aTornado: (c) => `${c}: tornado drill overdue`, aDrillSub: (m) => `Required ${m === 1 ? 'every month' : `every ${m} months`}`,
  aRatio: (c, s, n) => `${c}: ${s} teachers for ${n} needed`, aRatioSub: 'Short of the state ratio at full attendance',
  aCritical: (c) => `${c}: critical incident not reported to the state`, aCriticalSub: 'HQ awareness (no child details here)',
  aPaused: (c) => `${c}: paused after the contract end`, aPausedSub: 'Read-only; deletion follows the lifecycle',
  aGrant: (c) => `${c}: break-glass request waiting`, aGrantSub: 'The center\'s director decides',
  // centers drawer
  drawerSummary: 'Operational summary (no money, no child details)', rooms: 'Rooms', due: 'What is due', entitlements: 'License and entitlements', releases: 'Content updates', grantsOn: 'Break-glass on this center',
  effective: 'In force today', noRooms: 'No rooms yet', noDue: 'Nothing due', ageGroup: 'Age group', items: 'items', nextDue: 'next', noReleases: 'No updates sent yet',
  requestHere: 'Request emergency access to this center', offboard: (o) => `Contract end ${o.contract_end_on} · suspended ${o.suspend_on} · deletion ${o.delete_on}${o.confirmed ? ' (confirmed)' : ''}`,
  noMoney: 'HQ sees no tenant financials. Money is visible only under an audited, time-limited "financials" break-glass grant approved by the center.',
  // curriculum
  publishTitle: 'Publish a curriculum or content update', kind: 'Kind', kindCurriculum: 'Curriculum', kindContent: 'Content (videos, books, cards)', relTitle: 'Title', relVersion: 'Version',
  relNotes: 'What changed (centers see this)', audience: 'Send to', audAll: 'Every active center', audSel: 'Selected centers', publishBtn: 'Publish to centers', publishConfirm: (n) => `Publish to ${n === 'all' ? 'every active center' : `${n} centers`}? Directors will be asked to adopt it.`,
  published: (n) => `Published to ${n} centers.`, adopted: 'Adopted', pending: 'Waiting', declined: 'Declined', adoptedOf: (a, n) => `${a} of ${n} adopted`, withdraw: 'Withdraw', withdrawn: 'Withdrawn',
  noReleasesNet: 'No updates published yet.', pipelineSub: 'Content in review across the network (no child data). The reviewers work in the content queue.', openQueue: 'Open the review queue',
  waitingFor: { writer: 'the writer', supervisor: 'the supervisor', devils_advocate: "the devil's advocate", qc: 'QC' }, state_: { draft: 'Draft', writer_done: 'Written', supervisor_review: 'Supervisor review', devils_advocate_review: "Devil's advocate", qc: 'QC', approved: 'Approved', retired: 'Retired' },
  liveItems: (n) => `${n} items live`,
  // insights
  insightsNote: (m) => `De-identified: totals across every center, an item only when at least ${m} children used it, every count from 1 to 4 hidden. No center, no child.`,
  days: (n) => `${n} days`, children: 'children', childrenN: (n) => (n == null ? 'under 5 children' : `${n} children`), minutesWeek: 'Minutes per child per week', likes: 'Hearts', finishRate: 'Finish rate',
  leftEarly: 'Left early', opened: 'Opened', comingSoon: 'Coming soon taps (what children ask for)', lowFinish: 'Fix or retire (finish rate under 50%)', suppressedItems: (n) => `${n} items used by fewer than 5 children are not shown.`,
  byKind: 'Time by kind', hours: 'When children play (hour of day)', devices: 'Devices', captions: 'Caption language', places: 'Where', kindW: { watch: 'Watch', read: 'Read', play: 'Play' },
  place: { home: 'Home', center: 'Center' }, device: { phone: 'Phone', tablet: 'Tablet', computer: 'Computer', unknown: 'Unknown' }, caption: { en: 'English', es: 'Spanish', both: 'Both' },
  noInsights: 'No Kids\' corner activity with at least 5 children in this window.',
  // break-glass
  bgIntro: 'Break-glass opens a center\'s child records, settings or money for HQ support. It is never on by default: every request names a ticket and a reason, lasts 1 to 72 hours, and is approved by the center\'s director or owner (the second approval). An emergency opens at once for at most 4 hours, never money, health or special-education records, and the center is told.',
  bgRequestBtn: 'Request emergency access', bgCenter: 'Center', bgTicket: 'Support ticket', bgReason: 'Why HQ needs access (the center sees this)', bgScopes: 'What to open', bgHours: 'For how many hours',
  bgEmergency: 'Emergency: open now (at most 4 hours, never money; the director is told and can end it)', bgSend: 'Send the request', bgSendEm: 'Open emergency access', bgConfirm: 'This is audited and the center sees it. Continue?',
  bgSent: 'Request sent to the center\'s director for approval.', bgOpened: 'Emergency access is open and audited.', bgNone: 'No break-glass grants yet.', bgEnd: 'End access now', bgEnded: 'Access ended.',
  scope: { child_records: 'Child records', financials: 'Financials', settings: 'Center settings', account_recovery: 'Account recovery', health_records: 'Health records', special_education: 'Special education' },
  gStatus: { requested: 'Waiting for the director', active: 'Open', denied: 'Denied', revoked: 'Ended early', cancelled: 'Cancelled', expired: 'Expired' },
  gLeft: (m) => (m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min left` : `${m} min left`), gReads: (n) => `${n} record${n === 1 ? '' : 's'} opened`, gBy: (e) => `asked by ${e}`,
  logEvent: { support_request: 'Requested', support_emergency: 'Emergency opened', support_approve: 'Approved', support_deny: 'Denied', support_revoke: 'Ended', support_access: 'Record opened' },
  logNone: 'Nothing in the log yet.', when: 'When', who: 'Who', what: 'What', center: 'Center', why: 'Why',
  formErr: { center: 'Choose a center.', ticket: 'Add the support ticket number.', reason: 'Explain why (at least 10 characters).', scopes: 'Choose what to open.', hours: 'Between 1 and 72 hours.',
    emHours: 'An emergency lasts at most 4 hours.', emScope: 'Health and special-education records are never opened in an emergency: ask the director.', emMoney: 'Money is never opened in an emergency: send a request for the director to approve.' },
  // settings
  usersSub: 'HQ staff (two-step verification required to open the portal).', twoStep: 'Two-step on', noTwoStep: 'Two-step not set up', lastIn: 'Last sign-in', you: 'You',
  role: { hq: 'HQ', content_reviewer: 'Content reviewer' },
  rolesBody: [['HQ (owner network)', 'Network figures, compliance, curriculum, de-identified learning insights, break-glass requests. No tenant money, no child rows.'],
    ['Content reviewer', 'The content review queue (writer, supervisor, devil\'s advocate, QC). No child data.'],
    ['Center director / owner', 'Their own center, money included; approves or denies HQ break-glass requests.'],
    ['Teachers and families', 'Their room or their own children only. Care alerts are visible to every staff member of the center.']],
  alertsSub: 'Who in HQ is told about what. Every alert opens the exact center.', alertKind: { licence_expiring: 'Licence expiring', credential_expiring: 'Staff credentials expiring',
    drill_overdue: 'Drills overdue', ratio_short: 'Staffing short of ratio', critical_incident: 'Critical incident not reported', break_glass: 'Break-glass requests and openings', content_backlog: 'Content review backlog' },
  channel: { in_app: 'In the Hub', email: 'Email', both: 'Hub and email' }, save: 'Save', saved: 'Saved.', nobody: 'Nobody yet',
  lookTitle: 'The portal\'s character', lookSub: 'Official art only. Saved on this device.', character: { 'principal-hazel': 'Principal Hazel', 'mr-moss': 'Mr. Moss' },
  why_: { licence: 'licence', fire: 'fire drill', tornado: 'tornado drill', credentials_expired: 'credentials expired', credentials_expiring: 'credentials expiring', compliance: 'state checklist', staffing: 'staffing', critical: 'critical incident', attendance: 'attendance' },
  showTable: 'Show as table', hideTable: 'Hide table', loading: 'Loading…', couldNot: 'Could not load', notHq: 'This page is for Futures Friends HQ staff signed in with two-step verification.',
  classic: 'Classic network table', contentQueue: 'Content review queue', all: 'All', none: 'None',
};

const ES = {
  ...EN,
  nav: 'Vistas de la oficina central', more: 'Más', moreTitle: 'Más vistas', close: 'Cerrar', openFull: 'Abrir la página completa', actions: 'Acciones rápidas',
  views: { overview: 'Red', centers: 'Centros', quality: 'Calidad y cumplimiento', curriculum: 'Currículo y marca', insights: 'Información de aprendizaje', breakglass: 'Acceso de emergencia', settings: 'Ajustes' },
  short: { overview: 'Red', centers: 'Centros', quality: 'Calidad', insights: 'Aprendizaje', more: 'Más' },
  tabs: { list: 'Todos los centros', lifecycle: 'Ciclo de vida', licenses: 'Licencias', licensing: 'Licencias estatales', drills: 'Simulacros', credentials: 'Credenciales', readiness: 'Preparación para inspección',
    adoption: 'Quién adoptó qué', publish: 'Publicar una actualización', pipeline: 'Revisión de contenido', likes: 'Lo que les gusta', dropoff: 'Dónde se detienen', gaps: 'Contenido que falta', time: 'Tiempo en la plataforma',
    grants: 'Permisos', request: 'Pedir acceso', log: 'Registro', users: 'Usuarios de la red', roles: 'Funciones', alerts: 'Avisos', look: 'Aspecto' },
  sub: (v) => `${v}: secciones`,
  hello: (n) => (n ? `Hola, ${n}` : 'La red Futures Friends'), title: 'La red Futures Friends',
  inStates: (l) => (l.length ? `Centros en ${l.join(' y ')}` : 'Todavía sin perfil estatal'),
  centersPill: (n, a) => `${n} centros · ${a} activos`, bgPill: (n) => (n ? `${n} accesos de emergencia abiertos` : 'Ningún acceso de emergencia abierto'), bgPillSub: 'Auditado, con límite de tiempo',
  window: 'Últimos 30 días', attention: 'Necesita a la oficina central', attentionN: (n) => `${n} asunto${n === 1 ? '' : 's'}`, showAll: (n) => `Ver los ${n}`, showFewer: 'Ver menos', allClear: 'Nada necesita a la oficina central ahora.', open: 'Abrir',
  kEnroll: 'Inscripción y capacidad', kAttend: 'Asistencia', kStaff: 'Cobertura de personal', kComp: 'Cumplimiento', kInc: 'Incidentes abiertos', kContent: 'Esperando a un revisor',
  kEnrollSub: (e, c) => `${e} inscritos de ${c} lugares con licencia`, kAttendSub: 'Días-niño presentes, últimos 30 días', kStaffSub: (s, n) => `${s} de ${n} maestros que necesitan los niños inscritos`,
  kCompSub: 'Puntaje promedio de los centros con perfil estatal', kIncSub: (n) => `${n} informes de incidentes en 30 días (celdas menores de 5 ocultas)`, kContentSub: (n, d) => `${n} elemento${n === 1 ? '' : 's'} con un revisor · ${Number(d || 0).toLocaleString('es-US')} elementos de la biblioteca en redacción`,
  nc: 'Todavía no conectado', hidden: 'menos de 5', hiddenTitle: 'De 1 a 4: oculto para que no se pueda identificar a ningún niño', small: 'Centro pequeño: sin cifras de niños',
  centersCard: 'Centros', centersSub: 'Puntaje de salud por centro (licencia, simulacros, credenciales, personal, cumplimiento, incidentes). Toque un centro para ver su resumen.',
  health: 'Salud', paused: 'En pausa', closed: 'Cerrado', onboarding: 'En preparación', active: 'Activo',
  life: { onboarding: 'En preparación', active: 'Activo', paused: 'En pausa', closed: 'Cerrado' },
  lifeSub: { onboarding: 'Preparándose: todavía sin niños', active: 'Abierto y funcionando', paused: 'Solo lectura después del fin del contrato', closed: 'Suspendido o eliminado' },
  tier: { hub_essentials: 'Hub Esencial', hub_curriculum: 'Hub + Currículo', hub_complete: 'Hub Completo', trial: 'Prueba' }, tierNone: 'Sin nivel',
  tierDraft: 'Los nombres y contenidos de los niveles son un BORRADOR (la dueña los confirmará). No se muestran precios: el dinero queda en facturación.',
  state: 'Estado', enrolled: 'Inscritos', capacity: 'Capacidad', attendance: 'Asistencia', staff: 'Personal', needed: 'Necesarios', compliance: 'Cumplimiento', incidents: 'Incidentes',
  licence: 'Licencia', licenceDays: (d) => (d == null ? 'Sin fecha de licencia' : d < 0 ? `Venció hace ${-d} días` : `Vence en ${d} días`),
  fire: 'Simulacro de incendio', tornado: 'Simulacro de tornado', lastDrill: (d) => (d ? `Último ${d}` : 'Ninguno registrado'), every: (m) => (m === 1 ? 'cada mes' : `cada ${m} meses`),
  overdue: 'Atrasado', ok: 'Al día', expired: 'Vencidas', expiring: 'Vencen en 60 días', credOk: 'Todas vigentes',
  readiness: 'Preparación para inspección', readinessSub: 'Licencia, simulacros, credenciales y la lista estatal, en un puntaje por centro.',
  aLicence: (c, d) => (d < 0 ? `${c}: la licencia venció` : `${c}: la licencia vence en ${d} días`), aLicenceSub: 'Trámites de renovación',
  aCredExp: (c, n) => `${c}: ${n} credencial${n === 1 ? '' : 'es'} del personal vencida${n === 1 ? '' : 's'}`, aCredSoon: (c, n) => `${c}: ${n} credencial${n === 1 ? '' : 'es'} por vencer`, aCredSub: 'En 60 días',
  aFire: (c) => `${c}: simulacro de incendio atrasado`, aTornado: (c) => `${c}: simulacro de tornado atrasado`, aDrillSub: (m) => `Obligatorio ${m === 1 ? 'cada mes' : `cada ${m} meses`}`,
  aRatio: (c, s, n) => `${c}: ${s} maestros de ${n} necesarios`, aRatioSub: 'Por debajo de la proporción estatal con asistencia completa',
  aCritical: (c) => `${c}: incidente crítico sin reportar al estado`, aCriticalSub: 'Para conocimiento de la oficina central (sin detalles del niño)',
  aPaused: (c) => `${c}: en pausa después del fin del contrato`, aPausedSub: 'Solo lectura; la eliminación sigue el ciclo de vida',
  aGrant: (c) => `${c}: pedido de acceso de emergencia en espera`, aGrantSub: 'Decide la directora del centro',
  drawerSummary: 'Resumen operativo (sin dinero, sin detalles de niños)', rooms: 'Salones', due: 'Pendientes', entitlements: 'Licencia y derechos', releases: 'Actualizaciones de contenido', grantsOn: 'Acceso de emergencia en este centro',
  effective: 'Vigente hoy', noRooms: 'Todavía sin salones', noDue: 'Nada pendiente', ageGroup: 'Grupo de edad', items: 'elementos', nextDue: 'próximo', noReleases: 'Todavía no se enviaron actualizaciones',
  requestHere: 'Pedir acceso de emergencia a este centro', offboard: (o) => `Fin del contrato ${o.contract_end_on} · suspendido ${o.suspend_on} · eliminación ${o.delete_on}${o.confirmed ? ' (confirmada)' : ''}`,
  noMoney: 'La oficina central no ve las finanzas de los centros. El dinero solo se ve con un permiso de emergencia "finanzas" auditado, con límite de tiempo y aprobado por el centro.',
  publishTitle: 'Publicar una actualización de currículo o contenido', kind: 'Tipo', kindCurriculum: 'Currículo', kindContent: 'Contenido (videos, libros, tarjetas)', relTitle: 'Título', relVersion: 'Versión',
  relNotes: 'Qué cambió (los centros lo ven)', audience: 'Enviar a', audAll: 'Todos los centros activos', audSel: 'Centros elegidos', publishBtn: 'Publicar a los centros', publishConfirm: (n) => `¿Publicar a ${n === 'all' ? 'todos los centros activos' : `${n} centros`}? Se pedirá a las directoras que la adopten.`,
  published: (n) => `Publicado a ${n} centros.`, adopted: 'Adoptada', pending: 'En espera', declined: 'Rechazada', adoptedOf: (a, n) => `${a} de ${n} la adoptaron`, withdraw: 'Retirar', withdrawn: 'Retirada',
  noReleasesNet: 'Todavía no se publicaron actualizaciones.', pipelineSub: 'Contenido en revisión en toda la red (sin datos de niños). Los revisores trabajan en la cola de contenido.', openQueue: 'Abrir la cola de revisión',
  waitingFor: { writer: 'el escritor', supervisor: 'el supervisor', devils_advocate: 'el abogado del diablo', qc: 'control de calidad' }, state_: { draft: 'Borrador', writer_done: 'Escrito', supervisor_review: 'Revisión del supervisor', devils_advocate_review: 'Abogado del diablo', qc: 'Control de calidad', approved: 'Aprobado', retired: 'Retirado' },
  liveItems: (n) => `${n} elementos publicados`,
  insightsNote: (m) => `Sin identificar: totales de todos los centros, un elemento solo si lo usaron al menos ${m} niños, cada número de 1 a 4 oculto. Sin centro, sin niño.`,
  days: (n) => `${n} días`, children: 'niños', childrenN: (n) => (n == null ? 'menos de 5 niños' : `${n} niños`), minutesWeek: 'Minutos por niño por semana', likes: 'Corazones', finishRate: 'Terminado',
  leftEarly: 'Salieron antes', opened: 'Abierto', comingSoon: 'Toques en "Muy pronto" (lo que piden los niños)', lowFinish: 'Arreglar o retirar (menos del 50% terminado)', suppressedItems: (n) => `No se muestran ${n} elementos usados por menos de 5 niños.`,
  byKind: 'Tiempo por tipo', hours: 'Cuándo juegan (hora del día)', devices: 'Dispositivos', captions: 'Idioma de los subtítulos', places: 'Dónde', kindW: { watch: 'Ver', read: 'Leer', play: 'Jugar' },
  place: { home: 'Casa', center: 'Centro' }, device: { phone: 'Teléfono', tablet: 'Tableta', computer: 'Computadora', unknown: 'Desconocido' }, caption: { en: 'Inglés', es: 'Español', both: 'Ambos' },
  noInsights: 'No hay actividad del rincón de los niños con al menos 5 niños en este periodo.',
  bgIntro: 'El acceso de emergencia abre los registros de los niños, los ajustes o el dinero de un centro para el apoyo de la oficina central. Nunca está activo por defecto: cada pedido indica un caso y un motivo, dura de 1 a 72 horas y lo aprueba la directora o dueña del centro (la segunda aprobación). Una emergencia se abre enseguida por un máximo de 4 horas, nunca dinero, registros de salud ni de educación especial, y se avisa al centro.',
  bgRequestBtn: 'Pedir acceso de emergencia', bgCenter: 'Centro', bgTicket: 'Caso de soporte', bgReason: 'Por qué la oficina central necesita acceso (el centro lo ve)', bgScopes: 'Qué abrir', bgHours: 'Por cuántas horas',
  bgEmergency: 'Emergencia: abrir ahora (máximo 4 horas, nunca dinero; se avisa a la directora y puede terminarlo)', bgSend: 'Enviar el pedido', bgSendEm: 'Abrir el acceso de emergencia', bgConfirm: 'Esto queda auditado y el centro lo ve. ¿Continuar?',
  bgSent: 'Pedido enviado a la directora del centro para su aprobación.', bgOpened: 'El acceso de emergencia está abierto y auditado.', bgNone: 'Todavía no hay permisos de emergencia.', bgEnd: 'Terminar el acceso ahora', bgEnded: 'Acceso terminado.',
  scope: { child_records: 'Registros de los niños', financials: 'Finanzas', settings: 'Ajustes del centro', account_recovery: 'Recuperación de cuentas', health_records: 'Registros de salud', special_education: 'Educación especial' },
  gStatus: { requested: 'Esperando a la directora', active: 'Abierto', denied: 'Rechazado', revoked: 'Terminado antes', cancelled: 'Cancelado', expired: 'Vencido' },
  gLeft: (m) => (m >= 60 ? `quedan ${Math.floor(m / 60)} h ${m % 60} min` : `quedan ${m} min`), gReads: (n) => `${n} registro${n === 1 ? '' : 's'} abierto${n === 1 ? '' : 's'}`, gBy: (e) => `pedido por ${e}`,
  logEvent: { support_request: 'Pedido', support_emergency: 'Emergencia abierta', support_approve: 'Aprobado', support_deny: 'Rechazado', support_revoke: 'Terminado', support_access: 'Registro abierto' },
  logNone: 'Todavía no hay nada en el registro.', when: 'Cuándo', who: 'Quién', what: 'Qué', center: 'Centro', why: 'Por qué',
  formErr: { center: 'Elija un centro.', ticket: 'Agregue el número del caso.', reason: 'Explique el motivo (al menos 10 caracteres).', scopes: 'Elija qué abrir.', hours: 'Entre 1 y 72 horas.',
    emHours: 'Una emergencia dura como máximo 4 horas.', emScope: 'Los registros de salud y de educación especial nunca se abren en una emergencia: pregunte a la directora.', emMoney: 'El dinero nunca se abre en una emergencia: envíe un pedido para que la directora lo apruebe.' },
  usersSub: 'Personal de la oficina central (se necesita verificación en dos pasos para abrir el portal).', twoStep: 'Dos pasos activado', noTwoStep: 'Sin verificación en dos pasos', lastIn: 'Último ingreso', you: 'Usted',
  role: { hq: 'Oficina central', content_reviewer: 'Revisor de contenido' },
  rolesBody: [['Oficina central (red de la dueña)', 'Cifras de la red, cumplimiento, currículo, información de aprendizaje sin identificar, pedidos de acceso de emergencia. Sin dinero de los centros, sin filas de niños.'],
    ['Revisor de contenido', 'La cola de revisión de contenido (escritor, supervisor, abogado del diablo, control de calidad). Sin datos de niños.'],
    ['Directora / dueña del centro', 'Su propio centro, dinero incluido; aprueba o rechaza los pedidos de acceso de emergencia.'],
    ['Maestros y familias', 'Solo su salón o sus propios hijos. Todo el personal del centro ve las alertas de cuidado.']],
  alertsSub: 'Quién en la oficina central recibe qué aviso. Cada aviso abre el centro exacto.', alertKind: { licence_expiring: 'Licencia por vencer', credential_expiring: 'Credenciales del personal por vencer',
    drill_overdue: 'Simulacros atrasados', ratio_short: 'Personal por debajo de la proporción', critical_incident: 'Incidente crítico sin reportar', break_glass: 'Pedidos y aperturas de acceso de emergencia', content_backlog: 'Contenido por revisar' },
  channel: { in_app: 'En el Hub', email: 'Correo', both: 'Hub y correo' }, save: 'Guardar', saved: 'Guardado.', nobody: 'Nadie todavía',
  lookTitle: 'El personaje del portal', lookSub: 'Solo arte oficial. Se guarda en este dispositivo.', character: { 'principal-hazel': 'La directora Hazel', 'mr-moss': 'El señor Moss' },
  why_: { licence: 'licencia', fire: 'simulacro de incendio', tornado: 'simulacro de tornado', credentials_expired: 'credenciales vencidas', credentials_expiring: 'credenciales por vencer', compliance: 'lista estatal', staffing: 'personal', critical: 'incidente crítico', attendance: 'asistencia' },
  showTable: 'Ver como tabla', hideTable: 'Ocultar la tabla', loading: 'Cargando…', couldNot: 'No se pudo cargar', notHq: 'Esta página es para el personal de la oficina central de Futures Friends con verificación en dos pasos.',
  classic: 'Tabla clásica de la red', contentQueue: 'Cola de revisión de contenido', all: 'Todos', none: 'Ninguno',
};
export const hw = (lang) => (lang === 'es' ? ES : EN);

// a center's name as people read it: no "TEST " fixture prefix (the data keeps it)
export const displayName = (n) => String(n || '').replace(/^TEST\s+/i, '');

// ---- the address: ?scope=demo|all (the view / tab / drawer belong to the shell) ----
export function readScope(search, hasDemo) {
  const v = new URLSearchParams(search || '').get('scope');
  if (v === 'all' || v === 'demo') return v === 'demo' && !hasDemo ? 'all' : v;
  return hasDemo ? 'demo' : 'all';
}

// ---- a center's health score (0-100) or null (paused / closed: not scored). Each deduction is named, so the drawer can say why. ----
export function healthScore(c) {
  if (!c || c.lifecycle?.status === 'paused' || c.lifecycle?.status === 'closed') return { score: null, why: [] };
  const why = [];
  const take = (n, k) => { if (n > 0) why.push([k, n]); };
  const d = c.license?.days_left;
  if (d != null) take(d < 0 ? 30 : d <= 30 ? 15 : d <= 60 ? 8 : 0, 'licence');
  if (c.drills?.fire_overdue) take(10, 'fire');
  if (c.drills?.tornado_overdue) take(6, 'tornado');
  take(Math.min(16, 8 * (c.credentials?.expired || 0)), 'credentials_expired');
  take(Math.min(9, 3 * (c.credentials?.expiring_60 || 0)), 'credentials_expiring');
  const cs = c.compliance?.score;
  if (cs != null && cs < 60) take(Math.min(15, Math.round((60 - cs) / 3)), 'compliance');
  if (c.staff_needed != null && c.staff != null && c.staff < c.staff_needed) take(12, 'staffing');
  if (c.critical_unreported) take(15, 'critical');
  if (c.attendance_rate != null && c.attendance_rate < 80) take(5, 'attendance');
  const score = Math.max(0, 100 - why.reduce((a, [, n]) => a + n, 0));
  return { score, why };
}
export const healthTone = (s) => (s == null ? 'navy' : s >= 80 ? 'zuri' : s >= 60 ? 'gold' : 'warn');

// ---- network KPIs: each { frac (0..1 | null), big, of, sub } from the network block (null = not connected / hidden) ----
const frac = (a, b) => (a == null || !b ? null : Math.max(0, Math.min(1, a / b)));
export function networkKpis(net, centers = []) {
  const n = net || {};
  const backlog = n.content_backlog?.waiting ?? null;
  return {
    enroll: { frac: frac(n.enrolled_of_capacity, n.capacity_of_shown), a: n.enrolled_of_capacity ?? null, b: n.capacity_of_shown ?? null },
    attend: { frac: n.attendance_rate == null ? null : n.attendance_rate / 100, a: n.attendance_rate ?? null },
    staff: { frac: frac(n.staff_covered, n.staff_needed), a: n.staff_covered ?? null, b: n.staff_needed ?? null },
    comp: { frac: n.compliance_score == null ? null : n.compliance_score / 100, a: n.compliance_score ?? null },
    inc: { a: n.incidents_open ?? null, total: n.incidents ?? null, hidden: centers.some((c) => (c.suppressed || []).includes('incidents_open')) },
    content: { a: backlog, drafting: n.content_backlog?.drafting ?? null },
  };
}

// ---- attention items (owner rule: every item opens the exact center: drawer center:<id>) ----
// tone: now (red) | soon (gold) | info
export function attentionItems(centers, grants, lang = 'en') {
  const S = hw(lang);
  const out = [];
  for (const c of centers || []) {
    const life = c.lifecycle?.status;
    if (life === 'closed') continue;
    const name = c.name, drawer = `center:${c.center_id}`;
    const push = (key, tone, icon, title, sub, rank) => out.push({ key: `${key}:${c.center_id}`, tone, icon, title, sub, drawer, center: c.center_id, rank });
    if (life === 'paused') { push('paused', 'info', 'lock', S.aPaused(name), S.aPausedSub, 60); continue; }
    if (c.critical_unreported) push('critical', 'now', 'incident', S.aCritical(name), S.aCriticalSub, 0);
    const d = c.license?.days_left;
    if (d != null && d <= 60) push('licence', d <= 30 ? 'now' : 'soon', 'doc', S.aLicence(name, d), S.aLicenceSub, d < 0 ? 1 : 10 + d / 10);
    if (c.staff_needed != null && c.staff != null && c.staff < c.staff_needed) push('ratio', 'now', 'ratio', S.aRatio(name, c.staff, c.staff_needed), S.aRatioSub, 5);
    if (c.drills?.fire_overdue && life !== 'onboarding') push('fire', 'now', 'fire', S.aFire(name), S.aDrillSub(c.drills.fire_every_months), 6);
    if (c.drills?.tornado_overdue && life !== 'onboarding') push('tornado', 'soon', 'fire', S.aTornado(name), S.aDrillSub(c.drills.tornado_every_months), 12);
    if (c.credentials?.expired) push('credx', 'now', 'badge', S.aCredExp(name, c.credentials.expired), S.aCredSub, 7);
    else if (c.credentials?.expiring_60) push('creds', 'soon', 'badge', S.aCredSoon(name, c.credentials.expiring_60), S.aCredSub, 20);
  }
  for (const g of grants || []) {
    if (g.status !== 'requested') continue;
    out.push({ key: `grant:${g.id}`, tone: 'info', icon: 'lock', title: S.aGrant(g.center), sub: S.aGrantSub, drawer: `grant:${g.id}`, center: g.center_id, rank: 30 });
  }
  return out.sort((a, b) => a.rank - b.rank || a.title.localeCompare(b.title));
}

// ---- inspection readiness: the state checklist score, less what an inspector would see first ----
export function readiness(c) {
  if (!c) return null;
  const base = c.compliance?.score;
  if (base == null) return null;
  let s = base;
  const d = c.license?.days_left;
  if (d != null && d < 0) s -= 25;
  if (c.drills?.fire_overdue) s -= 10;
  if (c.drills?.tornado_overdue) s -= 5;
  s -= Math.min(15, 5 * (c.credentials?.expired || 0));
  return Math.max(0, Math.min(100, Math.round(s)));
}

// ---- learning insights ----
export function insightLists(d) {
  const items = (d?.items || []).filter((i) => i.item_type !== 'placeholder');
  const liked = [...items].filter((i) => i.hearts != null && i.hearts > 0).sort((a, b) => b.hearts - a.hearts || b.children - a.children).slice(0, 8);
  const stops = [...items].filter((i) => i.finish_rate != null).sort((a, b) => a.finish_rate - b.finish_rate).slice(0, 8);
  const asks = (d?.items || []).filter((i) => i.item_type === 'placeholder').sort((a, b) => b.children - a.children || (b.opens ?? 0) - (a.opens ?? 0));
  const fix = items.filter((i) => i.finish_rate != null && i.finish_rate < 50).sort((a, b) => a.finish_rate - b.finish_rate);
  return { liked, stops, asks, fix };
}

// ---- the break-glass form check (the database checks again; this only gives kind words first) ----
export function grantFormErrors(f, lang = 'en') {
  const E = hw(lang).formErr, e = {};
  if (!f.center) e.center = E.center;
  if (!String(f.ticket || '').trim()) e.ticket = E.ticket;
  if (String(f.reason || '').trim().length < 10) e.reason = E.reason;
  if (!f.scopes?.length) e.scopes = E.scopes;
  const h = Number(f.hours);
  if (!Number.isInteger(h) || h < 1 || h > 72) e.hours = E.hours;
  else if (f.emergency && h > 4) e.hours = E.emHours;
  if (f.emergency && (f.scopes || []).some((s) => s === 'health_records' || s === 'special_education')) e.scopes = E.emScope;
  else if (f.emergency && (f.scopes || []).includes('financials')) e.scopes = E.emMoney;
  return e;
}
export function grantState(g, now = Date.now()) {
  if (g.status === 'active') {
    const left = Math.round((Date.parse(g.expires_at) - now) / 60000);
    return left > 0 ? { key: 'active', left } : { key: 'expired', left: 0 };
  }
  return { key: g.status, left: 0 };
}
