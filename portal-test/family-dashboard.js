// The parent dashboard: a family's landing page in the center (/c/<slug>/home, role family). Owner request 2026-10-10: "Dashboards need
// to be created for the parents and for the staff"; premium pass 2026-10-12: "the most important thing ... very high-end design, very
// interactive ... has all the features it needs", in the layout of the command center the owner built (an icon rail, a bold greeting,
// a band of the child's numbers with rings and sparklines, then the deeper sections). Design and tests: hub/FAMILY_DASHBOARD.md.
//
// Two calls per child: family_dashboard (migration 20261026900000: today, waiting, learning, messages, friends, coming up) and
// family_dashboard_extras (20261031000000: the KPI numbers, pickup list, today's photos, the week's menu, what to bring, 75-day calendar).
// Every number on the KPI band is derived in family-kpi.js from those rows ("derive, never restate"); a source that returned nothing
// shows "not connected yet", never a made-up or zero figure. Nothing is ever compared with other children (no class figures, no order of children).
// Every link opens the exact item (deep links, deeplink.js; hub/NOTIFICATIONS.md "Where a notification opens"): see dashLink().
// English and Spanish (DRAFT). No inline styles (the CSP has no 'unsafe-inline'). 44 px targets, press states on pointer-down, hover only
// under a fine pointer, reduced motion and the "Still scene" switch respected. Polls every 60 s while visible.

import { avatarHtml, friendImg } from './kid-mode.js';
import { numbersText } from './grades.js';
import { mountFamilyConferenceCard } from './checkpoints.js';   // conference times and reports (hub/CHECKPOINTS.md)
import { absenceSummary } from './absence.js';   // the child's reported absences in "Coming up" (hub/ABSENCES.md)
import { centerTz } from './center-time.js';
import { applyMotion, dayPart, motionOn, sceneHtml } from './family-scene.js';
import { attendanceKpi, calendarStrip, firstName, greeting, homeKpi, liveState, mealsKpi, minutesText, moodKpi, restKpi, skillsKpi, sparkPoints } from './family-kpi.js';

const FRIEND_NAME = { booker: 'Booker', lumi: 'Lumi', zuri: 'Zuri', bop: 'Bop' };
const FOUR = ['booker', 'lumi', 'zuri', 'bop'];
const FEEL_ART = { happy: 'bop-waving', calm: 'lumi', curious: 'zuri-magnifier', energetic: 'bop-dancing', tired: 'booker-reading', wanted_comfort: 'lumi-waving' };
// a friend accent per kind of entry (accents, not a rainbow: the four friends' own colours)
const KIND_TONE = { meal: 'zuri', drink: 'zuri', nap: 'lumi', toilet: 'booker', activity: 'bop', note: 'navy', mood: 'gold' };
const ICON = {
  meal: '<path d="M7 3v8a2 2 0 0 0 2 2v8M7 3v5M10 3v5M17 3c-1.7 0-3 2-3 5s1 4 3 4v9"/>',
  drink: '<path d="M6 3h12l-1.5 17a1 1 0 0 1-1 .9h-7a1 1 0 0 1-1-.9z M6.5 8h11"/>',
  nap: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  toilet: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  activity: '<path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-3-5.4 3 1.1-6L3.2 9.4l6.1-.8z"/>',
  note: '<path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4"/>',
  mood: '<path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.2 4.3 2.6.7-1.4 2.2-2.6 4.3-2.6 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z"/>',
  incident: '<path d="M12 3l9.5 17h-19zM12 10v4M12 17.2v.3"/>',
  video: '<path d="M4 6h11v12H4zM15 10l5-3v10l-5-3"/>',
  charmsg: '<path d="M4 5h16v11H9l-5 4z"/>',
  consent: '<path d="M12 3l7 3v6c0 4.4-3 7.7-7 9-4-1.3-7-4.6-7-9V6z M9 12l2 2 4-4"/>',
  help: '<path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17v.2"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z M8 9.5h8M8 12.5h5"/>',
  announcement: '<path d="M4 10v4l11 5V5zM15 9a3 3 0 0 1 0 6M7 14l1 5"/>',
  report: '<path d="M6 3h9l4 4v14H6zM9 12h7M9 16h7M9 8h3"/>',
  calendar: '<path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4"/>',
  tuition: '<path d="M3 7h18v10H3zM7 12h.01M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z"/>',
  kid: '<path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9 10h.01M15 10h.01M8.5 14.5c1.8 2 5.2 2 7 0"/>',
  share: '<path d="M12 15V3M7 8l5-5 5 5M5 13v7h14v-7"/>',
  arrow: '<path d="M9 5l7 7-7 7"/>',
  sun: '<path d="M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z"/>',
  learn: '<path d="M3 7l9-4 9 4-9 4zM7 9v5c0 1.7 2.2 3 5 3s5-1.3 5-3V9"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-3-5.4 3 1.1-6L3.2 9.4l6.1-.8z"/>',
  photo: '<path d="M4 7h4l2-2h4l2 2h4v12H4zM12 10a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z"/>',
  pickup: '<path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 12 0v1M16 3.3a4 4 0 0 1 0 7.4M22 21v-1a6 6 0 0 0-4-5.6"/>',
  bag: '<path d="M6 8h12l-1 13H7zM9 8V6a3 3 0 0 1 6 0v2"/>',
  menu: '<path d="M4 4h16v16H4zM8 9h8M8 13h8M8 17h5"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5M8 7h7"/>',
  more: '<path d="M5 12h.01M12 12h.01M19 12h.01"/>',
  home: '<path d="M3 11l9-8 9 8M5 9.5V21h14V9.5"/>',
};
const icon = (k) => `<svg class="fd-ico-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICON[k] || ICON.note}</svg>`;
const DOMAIN = {
  en: { lang: 'Language and literacy', cog: 'Thinking and math', se: 'Social and emotional', pmp: 'Moving and body', arts: 'Creative arts', ss: 'Our world', atl: 'Ways of learning' },
  es: { lang: 'Lenguaje y lectoescritura', cog: 'Pensamiento y matemáticas', se: 'Social y emocional', pmp: 'Movimiento y cuerpo', arts: 'Artes creativas', ss: 'Nuestro mundo', atl: 'Formas de aprender' },
};
const FEEL = {
  en: { happy: 'Happy', calm: 'Calm', curious: 'Curious', energetic: 'Full of energy', tired: 'Tired', wanted_comfort: 'Wanted a cuddle' },
  es: { happy: 'Feliz', calm: 'Tranquilo', curious: 'Curioso', energetic: 'Con mucha energía', tired: 'Cansado', wanted_comfort: 'Quiso un abrazo' },
};

const W = {
  en: {
    title: 'Home', welcome: 'Welcome back', kids: 'Your children', loading: 'Loading your dashboard…',
    day: (n) => `${n}'s day`, room: (r) => r, here: (t) => `Here since ${t}`, left: (t) => `Picked up at ${t}`, notIn: 'Not checked in yet today',
    updated: (s) => `Updated ${s}`, noUpdates: 'No updates yet today', justNow: 'just now', minAgo: (n) => `${n} min ago`, hrAgo: (n) => `${n} h ago`,
    emptyDay: (n) => `Nothing logged yet today. ${n}'s teachers add meals, rests, potty and more as the day goes.`,
    more: (n) => `and ${n} more`, fullDay: (n) => `See ${n}'s whole day`, reportReady: "Tonight's report is ready", reportAt: (t) => `The evening report comes at ${t}.`,
    incident: (t) => `At ${t} a teacher wrote an incident report.`, incidentAck: 'You have acknowledged it.', readAck: 'Read and acknowledge',
    attention: 'Waiting for you', attentionN: (n) => (n === 1 ? '1 thing' : `${n} things`),
    prio: { now: 'Needs you now', soon: 'When you have a minute', news: 'New for you' }, allClear: 'Nothing is waiting for you. You are all caught up.',
    a: {
      incident: (f) => `A teacher wrote an incident report for ${f}. Please read it and acknowledge it.`,
      video: (f, fr) => `A video from ${fr} for ${f} is waiting for your OK.`,
      charmsg: (f, fr) => `A message from ${fr} for ${f} is waiting for your OK.`,
      consent: (f, p) => `Please review the updated consent for ${f}: ${p}.`,
      help: (s) => `The center answered your question “${s}”.`,
      chat: (f, n) => (Number(n) === 1 ? `1 new message from ${f}'s teachers` : `${n} new messages from ${f}'s teachers`),
      announcement: (s) => `New announcement: ${s}`,
      report: (f) => `${f}'s progress report is ready.`,
    },
    open: 'Open', actions: 'Quick actions', qaMessage: 'Message the teacher', qaKid: 'Open Kid Mode', qaShare: 'Share from home', qaHelp: 'Help', qaAbsence: 'Report an absence', absences: 'Reported to the center', billingAll: 'Billing and statements',
    short: { message: 'Message', absence: 'Absence', share: 'Share', kid: 'Kid Mode', help: 'Help' },
    learning: 'Learning', thisWeek: (u, t) => `This week: Unit ${u}${t ? ` · ${t}` : ''}`, doneOf: (d, n) => `${d} of ${n} done at home`,
    noHome: 'No do-at-home activities this week.', doWeek: "This week's activities",
    report: 'Progress report', period: (a, b) => `${a} to ${b}`, readReport: 'Read the full report', reportOnly: 'About your child only, never compared with other children.',
    moreSkills: (n) => `${n} more in the full report`, noReport: 'No progress report yet. Teachers share one when it is ready.', noNum: 'teacher level',
    portfolio: 'Latest work', noPortfolio: 'Work from Kid Mode and home shows up here.', byKid: 'in Kid Mode', byFamily: 'at home', byStaff: 'at school',
    messages: 'Messages', unread: (n) => `${n} unread`, you: 'You', teacher: 'Teacher', noMessages: (f) => `No messages yet. Write to ${f}'s teachers any time.`,
    openThread: (f) => `Open ${f}'s messages`, announcements: 'Announcements', attached: 'Attachment', newChip: 'New',
    friends: 'From the friends', video: 'Today’s video', comingSoon: 'Coming soon', watch: 'Watch', message: 'Message', openPlayer: 'Open the message',
    noFriends: (f) => `When ${f}'s teachers send a video or a message from the friends and you say OK, it shows up here.`,
    friendsConsent: 'Videos and messages from the friends need your OK on Privacy & consent.',
    msgSoon: (fr) => `Messages from ${fr} arrive here once the center sends one and you say OK.`, friendMsg: 'A message from the friends',
    upcoming: 'Coming up', closed: 'Closed', early: 'Early dismissal', noClosures: 'No closed days in the next six weeks.', calendar: 'See the calendar',
    tuition: 'Tuition', due: (amt, d) => `${amt} due ${d}`, pastDue: 'Past due', billingQ: 'See the invoice', range: (a, b) => `${a} to ${b}`,
    moreTitle: 'More for your family', health: 'Health records', record: (n) => `${n}'s record`, recordHint: 'Allergies, contacts and permissions',
    privacy: 'Privacy & consent', friendsMsgs: 'Messages from the friends', videos: 'Videos from the friends', allChat: 'Messages and announcements',
    learn: 'Learning at home', work: 'Activities and portfolio', reports: 'Progress reports', conferences: 'Conferences and conference reports', habits: 'Print habit cards', cal: 'Center calendar',
    couldNot: 'Part of the dashboard could not be loaded. It tries again in a minute.', failed: 'The dashboard could not be loaded.', retry: 'Try again',
    noKids: 'No child is linked to your account yet. The center adds your child when your enrollment is complete.',
    purpose: { enrollment_data: 'enrollment records', photos: 'photos', kid_mode: 'Kid Mode', character_messages: 'messages and videos from the friends', analytics: 'program improvement', family_uploads: 'photos and videos you share', special_education: 'special education records (IEP / IFSP)' },
    // the premium pass
    sections: 'On this page', glance: (n) => `${n} at a glance`, notConnected: 'not connected yet', nothingYet: 'nothing logged yet', weekOf: (d) => `Week of ${d}`,
    checkedIn: (f, t) => `${f} checked in at ${t}`, restingNow: 'resting now', pickedUp: (f, t) => `${f} was picked up at ${t}`, notInYet: (f) => `${f} is not checked in yet today`,
    lastUpdate: (w, t) => `${w} at ${t}`,
    k: { here: 'Here today', month: 'This month', ate: 'Ate today', rest: 'Rest today', feel: 'Feeling', skills: 'Skills', home: 'At home', story: 'Story time',
      work: 'New work', msgs: 'Messages', next: 'Next day off', tuition: 'Tuition' },
    kSub: { arrived: 'Checked in', left: 'Picked up', notIn: 'Not checked in yet', days: (p, s) => `${p} of ${s} school days`, plate: 'of the plate, all meals so far',
      lastDays: 'the last 7 school days', usual: (m) => `a usual day: ${m}`, recent: 'recent days', skills: (s, d, e) => `${s} secure · ${d} developing · ${e} emerging`,
      fromReport: (d) => `from the report of ${d}`, homeDone: (d, n) => `${d} of ${n} activities done this week`, storyRoom: (r) => `story circle in ${r} today`, kidMode: (m) => `Kid Mode this week: ${m}`,
      workMonth: 'this month, since the 1st', unread: (n) => (n === 1 ? 'new message from the teachers' : 'new messages from the teachers'), allRead: 'all read',
      nextOff: (l) => l, noneSoon: 'none in the next ten weeks', due: (d) => `due ${d}`, nothingDue: 'Nothing due', minutes: 'min' },
    photos: 'Photos of the day', noPhotos: (f) => `No photos of ${f} yet today. Teachers add them during the day.`, photosConsent: 'Photos need your OK on Privacy & consent.',
    pickup: 'Who can pick up', pickupYou: 'You', pickupPass: 'Day pass today', pickupOpen: 'See the pickup list', pickupNone: 'The center has not set up the pickup list yet.',
    bring: 'What to bring', today: 'Today', tomorrow: 'Tomorrow', noBring: 'Nothing special to bring.',
    menu: 'This week’s menu', menuNote: '', breakfast: 'Breakfast', lunch: 'Lunch', snack: 'Snack', closedDay: 'Closed',
    pull: 'Pull to refresh', refreshing: 'Refreshing…',
    sh: { close: 'Close', plate: 'The plate', present: 'Here', absent: 'Not here', closedDay: 'Closed', in: 'In', out: 'Out', last7: 'The last 7 school days', month: (m) => `School days in ${m}`,
      meals: { breakfast: 'Breakfast', lunch: 'Lunch', snack: 'Snack', am_snack: 'Morning snack', pm_snack: 'Afternoon snack', dinner: 'Dinner' }, triedNew: 'Tried something new',
      amount: { none: 'None today', a_little: 'A little', about_half: 'About half', most: 'Most', all: 'All' }, noMeals: 'No meals logged yet today.', byDay: 'Day by day',
      week: 'Feelings this week', byArea: 'Skills by area of learning', levels: { secure: 'Secure', developing: 'Developing', emerging: 'Emerging' },
      storyToday: 'In the room today', kidMode: 'Kid Mode this week', home: 'At home', center: 'At the center', none: 'Nothing yet.',
      invoice: (n) => `Invoice ${n}`, status: { open: 'Open', past_due: 'Past due' }, nextDays: 'Next closed days and early dismissals',
      goDay: (f) => `See ${f}'s whole day`, goRecord: (f) => `Open ${f}'s record`, goReport: 'Read the full report', goLearn: "This week's activities",
      goWork: 'Activities and portfolio', goMsgs: (f) => `Open ${f}'s messages`, goCal: 'Open the calendar on that day', goInvoice: 'See the invoice', goBilling: 'Billing and statements' },
  },
  es: {
    title: 'Inicio', welcome: 'Bienvenidos de nuevo', kids: 'Sus hijos', loading: 'Cargando su página…',
    day: (n) => `El día de ${n}`, room: (r) => r, here: (t) => `Llegó a las ${t}`, left: (t) => `Lo recogieron a las ${t}`, notIn: 'Todavía no registra llegada hoy',
    updated: (s) => `Actualizado ${s}`, noUpdates: 'Todavía no hay novedades hoy', justNow: 'ahora mismo', minAgo: (n) => `hace ${n} min`, hrAgo: (n) => `hace ${n} h`,
    emptyDay: (n) => `Todavía no hay nada registrado hoy. Las maestras y los maestros de ${n} agregan comidas, descansos, baño y más durante el día.`,
    more: (n) => `y ${n} más`, fullDay: (n) => `Ver todo el día de ${n}`, reportReady: 'El reporte de esta tarde está listo', reportAt: (t) => `El reporte de la tarde llega ${t.replace('about ', 'aprox. a las ')}.`,
    incident: (t) => `A las ${t} una maestra o un maestro escribió un reporte de incidente.`, incidentAck: 'Usted ya lo confirmó.', readAck: 'Leer y confirmar',
    attention: 'Esperan su respuesta', attentionN: (n) => (n === 1 ? '1 cosa' : `${n} cosas`),
    prio: { now: 'Lo necesitan ahora', soon: 'Cuando tenga un minuto', news: 'Novedades para usted' }, allClear: 'No hay nada pendiente. Está al día.',
    a: {
      incident: (f) => `Una maestra o un maestro escribió un reporte de incidente de ${f}. Léalo y confirme que lo recibió.`,
      video: (f, fr) => `Un video de ${fr} para ${f} espera su aprobación.`,
      charmsg: (f, fr) => `Un mensaje de ${fr} para ${f} espera su aprobación.`,
      consent: (f, p) => `Revise el consentimiento actualizado de ${f}: ${p}.`,
      help: (s) => `El centro respondió su pregunta “${s}”.`,
      chat: (f, n) => (Number(n) === 1 ? `1 mensaje nuevo de las maestras de ${f}` : `${n} mensajes nuevos de las maestras de ${f}`),
      announcement: (s) => `Anuncio nuevo: ${s}`,
      report: (f) => `El informe de progreso de ${f} está listo.`,
    },
    open: 'Abrir', actions: 'Accesos rápidos', qaMessage: 'Escribir a la maestra', qaKid: 'Abrir Modo Niños', qaShare: 'Compartir desde casa', qaHelp: 'Ayuda', qaAbsence: 'Avisar una ausencia', absences: 'Avisado al centro', billingAll: 'Pagos y estados de cuenta',
    short: { message: 'Mensaje', absence: 'Ausencia', share: 'Compartir', kid: 'Modo Niños', help: 'Ayuda' },
    learning: 'Aprendizaje', thisWeek: (u, t) => `Esta semana: Unidad ${u}${t ? ` · ${t}` : ''}`, doneOf: (d, n) => `${d} de ${n} hechas en casa`,
    noHome: 'No hay actividades para casa esta semana.', doWeek: 'Actividades de esta semana',
    report: 'Informe de progreso', period: (a, b) => `${a} a ${b}`, readReport: 'Leer el informe completo', reportOnly: 'Solo sobre su hijo o hija; nunca se compara con otros niños.',
    moreSkills: (n) => `${n} más en el informe completo`, noReport: 'Todavía no hay informe de progreso. Las maestras lo comparten cuando está listo.', noNum: 'nivel de la maestra',
    portfolio: 'Trabajos recientes', noPortfolio: 'Aquí aparecen los trabajos del Modo Niños y de casa.', byKid: 'en el Modo Niños', byFamily: 'en casa', byStaff: 'en la escuela',
    messages: 'Mensajes', unread: (n) => `${n} sin leer`, you: 'Usted', teacher: 'Maestra', noMessages: (f) => `Todavía no hay mensajes. Escriba a las maestras de ${f} cuando quiera.`,
    openThread: (f) => `Abrir los mensajes de ${f}`, announcements: 'Anuncios', attached: 'Archivo adjunto', newChip: 'Nuevo',
    friends: 'De los amigos', video: 'El video de hoy', comingSoon: 'Muy pronto', watch: 'Ver', message: 'Mensaje', openPlayer: 'Abrir el mensaje',
    noFriends: (f) => `Cuando las maestras de ${f} envíen un video o un mensaje de los amigos y usted lo apruebe, aparecerá aquí.`,
    friendsConsent: 'Los videos y mensajes de los amigos necesitan su permiso en Privacidad y consentimiento.',
    msgSoon: (fr) => `Los mensajes de ${fr} llegan aquí cuando el centro envía uno y usted lo aprueba.`, friendMsg: 'Un mensaje de los amigos',
    upcoming: 'Próximamente', closed: 'Cerrado', early: 'Salida temprano', noClosures: 'No hay días cerrados en las próximas seis semanas.', calendar: 'Ver el calendario',
    tuition: 'Colegiatura', due: (amt, d) => `${amt} vence el ${d}`, pastDue: 'Vencido', billingQ: 'Ver la factura', range: (a, b) => `${a} al ${b}`,
    moreTitle: 'Más para su familia', health: 'Registros de salud', record: (n) => `Ficha de ${n}`, recordHint: 'Alergias, contactos y permisos',
    privacy: 'Privacidad y consentimiento', friendsMsgs: 'Mensajes de los amigos', videos: 'Videos de los amigos', allChat: 'Mensajes y anuncios',
    learn: 'Aprender en casa', work: 'Actividades y portafolio', reports: 'Informes de progreso', conferences: 'Conferencias e informes de conferencia', habits: 'Imprimir tarjetas de hábitos', cal: 'Calendario del centro',
    couldNot: 'Una parte de la página no se pudo cargar. Se intenta de nuevo en un minuto.', failed: 'No se pudo cargar la página.', retry: 'Intentar de nuevo',
    noKids: 'Todavía no hay un niño o niña en su cuenta. El centro lo agrega cuando la inscripción esté completa.',
    purpose: { enrollment_data: 'datos de inscripción', photos: 'fotos', kid_mode: 'Modo Niños', character_messages: 'mensajes y videos de los amigos', analytics: 'mejora del programa', family_uploads: 'fotos y videos que usted comparte', special_education: 'registros de educación especial (IEP / IFSP)' },
    sections: 'En esta página', glance: (n) => `${n} de un vistazo`, notConnected: 'todavía sin conectar', nothingYet: 'todavía nada registrado', weekOf: (d) => `Semana del ${d}`,
    checkedIn: (f, t) => `${f} llegó a las ${t}`, restingNow: 'descansando ahora', pickedUp: (f, t) => `Recogieron a ${f} a las ${t}`, notInYet: (f) => `${f} todavía no registra llegada hoy`,
    lastUpdate: (w, t) => `${w} a las ${t}`,
    k: { here: 'Hoy en el centro', month: 'Este mes', ate: 'Comió hoy', rest: 'Descanso hoy', feel: 'Cómo se siente', skills: 'Habilidades', home: 'En casa', story: 'Hora del cuento',
      work: 'Trabajos nuevos', msgs: 'Mensajes', next: 'Próximo día libre', tuition: 'Colegiatura' },
    kSub: { arrived: 'Llegó', left: 'Lo recogieron', notIn: 'Todavía no llega', days: (p, s) => `${p} de ${s} días de clase`, plate: 'del plato, todas las comidas hasta ahora',
      lastDays: 'los últimos 7 días de clase', usual: (m) => `un día normal: ${m}`, recent: 'días recientes', skills: (s, d, e) => `${s} afianzadas · ${d} en desarrollo · ${e} emergentes`,
      fromReport: (d) => `del informe del ${d}`, homeDone: (d, n) => `${d} de ${n} actividades hechas esta semana`, storyRoom: (r) => `cuento en grupo en ${r} hoy`, kidMode: (m) => `Modo Niños esta semana: ${m}`,
      workMonth: 'este mes, desde el día 1', unread: (n) => (n === 1 ? 'mensaje nuevo de las maestras' : 'mensajes nuevos de las maestras'), allRead: 'todo leído',
      nextOff: (l) => l, noneSoon: 'ninguno en las próximas diez semanas', due: (d) => `vence el ${d}`, nothingDue: 'Nada pendiente', minutes: 'min' },
    photos: 'Fotos del día', noPhotos: (f) => `Todavía no hay fotos de ${f} hoy. Las maestras las agregan durante el día.`, photosConsent: 'Las fotos necesitan su permiso en Privacidad y consentimiento.',
    pickup: 'Quién puede recoger', pickupYou: 'Usted', pickupPass: 'Pase de hoy', pickupOpen: 'Ver la lista para recoger', pickupNone: 'El centro todavía no ha preparado la lista para recoger.',
    bring: 'Qué traer', today: 'Hoy', tomorrow: 'Mañana', noBring: 'No hay que traer nada especial.',
    menu: 'El menú de la semana', menuNote: 'Los nombres de los platillos están en inglés, como los escribe la cocina.', breakfast: 'Desayuno', lunch: 'Almuerzo', snack: 'Merienda', closedDay: 'Cerrado',
    pull: 'Deslice para actualizar', refreshing: 'Actualizando…',
    sh: { close: 'Cerrar', plate: 'El plato', present: 'Vino', absent: 'No vino', closedDay: 'Cerrado', in: 'Llegó', out: 'Salió', last7: 'Los últimos 7 días de clase', month: (m) => `Días de clase en ${m}`,
      meals: { breakfast: 'Desayuno', lunch: 'Almuerzo', snack: 'Merienda', am_snack: 'Merienda de la mañana', pm_snack: 'Merienda de la tarde', dinner: 'Cena' }, triedNew: 'Probó algo nuevo',
      amount: { none: 'Nada hoy', a_little: 'Un poco', about_half: 'Como la mitad', most: 'Casi todo', all: 'Todo' }, noMeals: 'Todavía no hay comidas registradas hoy.', byDay: 'Día por día',
      week: 'Cómo se sintió esta semana', byArea: 'Habilidades por área de aprendizaje', levels: { secure: 'Afianzado', developing: 'En desarrollo', emerging: 'Emergente' },
      storyToday: 'Hoy en el salón', kidMode: 'Modo Niños esta semana', home: 'En casa', center: 'En el centro', none: 'Todavía nada.',
      invoice: (n) => `Factura ${n}`, status: { open: 'Abierta', past_due: 'Vencida' }, nextDays: 'Próximos días cerrados y salidas temprano',
      goDay: (f) => `Ver todo el día de ${f}`, goRecord: (f) => `Abrir la ficha de ${f}`, goReport: 'Leer el informe completo', goLearn: 'Actividades de esta semana',
      goWork: 'Actividades y portafolio', goMsgs: (f) => `Abrir los mensajes de ${f}`, goCal: 'Abrir el calendario en ese día', goInvoice: 'Ver la factura', goBilling: 'Pagos y estados de cuenta' },
  },
};

// ---- links: every item opens exactly that item (the deep-link targets of 20261026700000_notification_deep_links.sql) ---------------------
// The single place to change a dashboard link. `a` is the item (id, kid, …) as family_dashboard returns it.
export function dashLink(slug, kind, a = {}) {
  const base = `/c/${encodeURIComponent(slug)}`;
  const q = (o) => { const s = new URLSearchParams(Object.entries(o).filter(([, v]) => v != null && v !== '')).toString(); return s ? `?${s}` : ''; };
  switch (kind) {
    case 'incident': return `${base}/incident${q({ id: a.id })}`;
    case 'video': return `${base}/videos${q({ d: a.id })}`;                         // the approve screen
    case 'video-play': return `${base}/videos${q({ d: a.id, play: 1 })}`;           // the player
    case 'charmsg': return `${base}/messages${q({ request: a.id })}`;
    case 'charmsg-play': return `${base}/player/${encodeURIComponent(a.kid)}`;       // the child's player (approved messages only)
    case 'consent': return `${base}/privacy${q({ kid: a.kid, purpose: a.id })}`;
    case 'help': return `${base}/help${q({ t: a.id })}`;
    case 'chat': return `${base}/chat${q({ kid: a.kid, msg: a.id })}`;
    case 'thread': return `${base}/chat${q({ kid: a.kid })}`;
    case 'announcement': return `${base}/chat${q({ a: a.id })}`;
    case 'report': return `${base}/grades${q({ kid: a.kid, report: a.id })}`;
    case 'day': return `${base}/child/${encodeURIComponent(a.kid)}${q({ date: a.date })}`;
    case 'calendar': return `${base}/calendar${q({ date: a.date })}`;
    case 'learn': return `${base}/learn${q({ kid: a.kid })}`;
    case 'share': return `${base}/learn${q({ kid: a.kid })}#hlShare`;
    case 'billing': return `${base}/billing-family${q({ invoice: a.id })}`;            // the family's billing page, opened on THAT invoice
    case 'absence': return `${base}/absence${q({ kid: a.kid, id: a.id })}`;             // report an absence (or open one report)
    case 'pickup': return `${base}/pickup${q({ kid: a.kid })}`;                         // the child's pickup list (arrivals.js viewFamilyPickup)
    case 'work': return `${base}/work${q({ kid: a.kid })}`;
    case 'kid': return `${base}/kid`;
    case 'child': return `${base}/child/${encodeURIComponent(a.kid)}`;
    // the child's support plan (special-education.js), opened on what is waiting: a report to read, a meeting time to choose, a specialist to approve
    case 'plan': return `${base}/child/${encodeURIComponent(a.kid)}/plan${q({ report: a.kind === 'report_ack' ? a.id : null, meeting: a.kind === 'meeting_choose' ? a.id : null, s: a.kind === 'specialist_approve' ? 'specialists' : null })}`;
    default: return `${base}/${kind}`;
  }
}

// ---- pure helpers (tested in tests/family-dashboard-unit.test.mjs) -------------------------------------------------------------
export const words = (lang) => W[lang === 'es' ? 'es' : 'en'];
export function agoText(iso, lang = 'en', now = Date.now()) {
  const L = words(lang);
  if (!iso) return L.noUpdates;
  const min = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  return L.updated(min < 1 ? L.justNow : min < 60 ? L.minAgo(min) : L.hrAgo(Math.floor(min / 60)));
}
export function attendanceText(att, lang = 'en') {
  const L = words(lang);
  if (att?.left) return { tone: 'done', text: L.left(att.left) };
  if (att?.arrived) return { tone: 'here', text: L.here(att.arrived) };
  return { tone: 'none', text: L.notIn };
}
export function attentionText(item, lang = 'en') {
  const L = words(lang);
  const f = item.first || '';
  const fr = FRIEND_NAME[item.label] || FRIEND_NAME.bop;
  switch (item.kind) {
    case 'incident': return L.a.incident(f);
    case 'video': return L.a.video(f, fr);
    case 'charmsg': return L.a.charmsg(f, fr);
    case 'consent': return L.a.consent(f, L.purpose[item.id] || item.id);
    case 'help': return L.a.help(item.extra || '');
    case 'chat': return L.a.chat(f, item.label || 1);
    case 'announcement': return L.a.announcement(item.extra || '');
    case 'report': return L.a.report(f);
    default: return '';
  }
}
// what is waiting, in three bands: things that need the parent now, things for when they have a minute, and news
export const PRIORITY = { incident: 'now', consent: 'now', video: 'soon', charmsg: 'soon', report: 'soon', help: 'soon', chat: 'news', announcement: 'news' };
export const money = (cents, lang = 'en') => new Intl.NumberFormat(lang === 'es' ? 'es-US' : 'en-US', { style: 'currency', currency: 'USD' }).format((Number(cents) || 0) / 100);
export const dayText = (iso, lang = 'en', opts = { weekday: 'short', month: 'short', day: 'numeric' }) => {
  if (!iso) return '';
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00Z`);
  return new Intl.DateTimeFormat(lang === 'es' ? 'es-US' : 'en-US', { ...opts, timeZone: 'UTC' }).format(d);
};
export const cap = (t) => { const x = String(t ?? ''); return x.charAt(0).toUpperCase() + x.slice(1); };
const dateLong = (iso, lang) => dayText(iso, lang, { weekday: 'long', month: 'long', day: 'numeric' });
const shortName = (n) => String(n || '').replace(/^TEST\s+/i, '');
const initialsOf = (n) => shortName(n).split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '·';
const guideFriend = (g) => (FOUR.includes(g?.friend) ? g.friend : null);

// ---- the page ----------------------------------------------------------------------------------------------------------------
// ctx: { c, shell, page, rpc, client, session, esc, live, friendly, lang, setLanguage, renderShares, T }
let loads = 0;   // a newer view (another child, another page) wins over a slower, older load
let state = null;   // what is on screen now (the detail sheets read it): { ctx, d, view }
export async function viewFamilyDashboard(ctx) {
  const mine = ++loads;
  const { c, shell, page, rpc, lang } = ctx;
  const L = words(lang);
  const key = `ff-dash-kid:${c.center_id}`;
  const want = new URLSearchParams(location.search).get('kid');
  let kept = null; try { kept = localStorage.getItem(key); } catch (_) { /* private mode */ }
  applyMotion();
  document.body.classList.add('fp-fam');
  const part = dayPart(new Date(), c.time_zone || centerTz());
  document.body.dataset.part = part;

  page(shell(skeleton(ctx.esc, L)), c.name);
  hostClass();
  const load = async (kid) => rpc('family_dashboard', { p_center: c.center_id, p_child: kid || null, p_lang: lang });
  const loadExtras = async (kid) => (kid ? rpc('family_dashboard_extras', { p_center: c.center_id, p_child: kid, p_lang: lang }).catch(() => null) : null);
  let d, early = null;
  // the extras for the child we expect go out at the same time (one round trip of waiting, not two)
  try { [d, early] = await Promise.all([load(want || kept), loadExtras(want || kept)]); }
  catch (e) {
    // a remembered child that is no longer on this account: fall back to the first one (never an error page for that)
    if (!want && kept) { try { localStorage.removeItem(key); } catch (_) { /* */ } try { d = await load(null); } catch (e2) { return mine === loads && failed(ctx, e2); } }
    else return mine === loads && failed(ctx, e);
  }
  const [x, sess] = await Promise.all([early && d.child === (want || kept) ? early : loadExtras(d.child), ctx.session?.().catch(() => null)]);
  if (mine !== loads || !document.getElementById('familyDash')) return;   // the person moved on while it loaded
  if (d.child) { try { localStorage.setItem(key, d.child); } catch (_) { /* */ } }
  const view = { part, name: firstName(sess?.user?.user_metadata?.full_name), x };
  state = { ctx, d, view };
  render(ctx, d, view);
  mountFamilyConferenceCard({ c, rpc, esc: ctx.esc, lang, kid: d.child }).catch(() => {});   // choose / see the conference time (checkpoints.js)

  // live: the Today card, what is waiting, messages and the numbers update while the page is open and visible
  let sig = JSON.stringify([d, x]);
  const refresh = async () => {
    const root = document.getElementById('familyDash');
    if (!root || mine !== loads || root.dataset.child !== (d.child || '')) return false;
    let n, nx; try { [n, nx] = await Promise.all([load(d.child), loadExtras(d.child)]); } catch (_) { return true; }
    const s2 = JSON.stringify([n, nx]);
    if (s2 === sig || !document.getElementById('familyDash')) return true;
    sig = s2; d = n; view.x = nx; state = { ctx, d, view };
    const slug = c.slug, esc = ctx.esc;
    for (const [id, html] of [['fdToday', todayHtml(esc, L, lang, slug, d)], ['fdAttention', attentionHtml(esc, L, lang, slug, d)], ['fdMessages', messagesHtml(esc, L, lang, slug, d)],
      ['fdKpis', kpiHtml(esc, L, lang, slug, d, view)], ['fdLive', liveHtml(esc, L, d)]]) {
      const el = document.getElementById(id);
      if (el && !el.contains(document.activeElement)) el.outerHTML = html;
    }
    for (const b of document.querySelectorAll('#familyDash [data-h]')) b.style.setProperty('--h', `${b.dataset.h}%`);
    for (const b of document.querySelectorAll('#familyDash [data-w]')) b.style.setProperty('--w', `${b.dataset.w}%`);
    return true;
  };
  const timer = setInterval(async () => {
    if (document.visibilityState !== 'visible') return;
    if (!(await refresh())) clearInterval(timer);
  }, 60000);
  // "Updated n min ago" stays true between refreshes
  const tick = setInterval(() => {
    const el = document.getElementById('fdUpdated');
    if (!el || mine !== loads) { clearInterval(tick); return; }
    el.textContent = agoText(d.today?.updated_at, lang);
  }, 30000);
  bindPull(ctx, refresh);
}

function hostClass() { document.getElementById('centerSpace')?.classList.add('fd-host'); }

// The skeleton is on screen (page() ran once: title, language, the deep-link note); the dashboard replaces just the skeleton.
function swap(ctx, html) {
  const el = document.getElementById('familyDash');
  if (el) el.outerHTML = html; else ctx.page(ctx.shell(html), ctx.c.name);
  hostClass();
}

function failed(ctx, e) {
  const { c, esc, friendly, lang } = ctx;
  const L = words(lang);
  swap(ctx, `<div class="fd fd-plain" id="familyDash" data-child=""><div class="card" id="familyWelcome"><h2>${esc(L.welcome)}</h2>
    <p class="msg bad" role="alert">${esc(L.failed)} ${esc(friendly(e))}</p>
    <div class="cta-row"><a class="btn navy" href="/c/${esc(c.slug)}/home" data-nav id="fdRetry">${esc(L.retry)}</a></div></div>${moreHtml(ctx.esc, L, c.slug, [], null)}</div>`);
  bindMore(ctx);
}

function skeleton(esc, L) {
  return `<div class="fd fd-loading" id="familyDash" aria-busy="true"><p class="sr-only" role="status">${esc(L.loading)}</p>
    <div class="fd-sk fd-sk-hero" aria-hidden="true"></div>
    <div class="fd-sk-row" aria-hidden="true">${'<div class="fd-sk fd-sk-kpi"></div>'.repeat(6)}</div>
    <div class="fd-sk-row fd-sk-two" aria-hidden="true"><div class="fd-sk fd-sk-card"></div><div class="fd-sk fd-sk-card"></div></div></div>`;
}

function render(ctx, d, view) {
  const { c, esc, lang } = ctx;
  const L = words(lang);
  const slug = c.slug;
  const kids = d.kids || [];
  const cur = kids.find((k) => k.id === d.child);
  if (!cur) {
    swap(ctx, `<div class="fd fd-plain" id="familyDash" data-child=""><section class="fd-welcome" id="familyWelcome"><p class="fd-date">${esc(dateLong(d.date, lang))}</p><h2>${esc(greeting(view.part, view.name, lang))}</h2></section>
      <div class="card"><p class="empty">${esc(L.noKids)}</p></div>${moreHtml(esc, L, slug, [], null)}</div>`);
    return bindMore(ctx);
  }
  const errs = (d.errors || []).length || (view.x?.errors || []).length ? `<p class="msg warn fd-err" role="status">${esc(L.couldNot)}</p>` : '';
  const x = view.x || {};
  swap(ctx, `<div class="fd fd-anim" id="familyDash" data-child="${esc(cur.id)}" data-part="${esc(view.part)}">
    <div class="fd-depth" aria-hidden="true"><span class="fd-plane fd-plane-a" data-rate="0.10"></span><span class="fd-plane fd-plane-b" data-rate="-0.06"></span>
      <img class="fd-plane fd-plane-cloud" data-rate="0.18" src="img/scene/felt-cloud-4-480.webp" alt=""><img class="fd-plane fd-plane-cloud2" data-rate="0.26" src="img/scene/felt-cloud-2-480.webp" alt=""></div>
    ${heroHtml(esc, L, lang, slug, d, cur, kids, view)}
    ${railHtml(esc, L, slug, cur, d)}
    <div class="fd-main">
      ${errs}
      ${kpiHtml(esc, L, lang, slug, d, view)}
      <div class="fd-row fd-row-day">${todayHtml(esc, L, lang, slug, d)}${attentionHtml(esc, L, lang, slug, d)}</div>
      <div class="fd-row fd-row-three">${photosHtml(esc, L, lang, d, cur, x)}${pickupHtml(esc, L, slug, cur, x)}${bringHtml(esc, L, lang, cur, x)}</div>
      ${learningHtml(esc, L, lang, slug, d, cur)}
      <div class="fd-row fd-row-two">${friendsHtml(esc, L, lang, slug, d, cur)}${messagesHtml(esc, L, lang, slug, d)}</div>
      ${upcomingHtml(esc, L, lang, slug, d, x)}
      ${menuHtml(esc, L, lang, d, x)}
      <section class="card fd-card" id="kidDevices" aria-labelledby="kdvH"></section>
      ${moreHtml(esc, L, slug, kids, cur)}
    </div>
  </div>`);
  signPhotos(ctx);
  bindMore(ctx);
  bindMotion(ctx);
  // Kid Mode on the child's own device (N14, kid-devices-ui.js): pair / list / remove; the "new device paired" notification lands here
  import('./kid-devices-ui.js').then((m) => m.mountFamilyDevices(document.getElementById('kidDevices'),
    { c, rpc: ctx.rpc, esc, lang, live: ctx.live, friendly: ctx.friendly, kids: kids.map((k) => ({ id: k.id, first: k.first })), current: cur.id }))
    .catch(() => { document.getElementById('kidDevices')?.remove(); });
}

// ---- hero: the greeting in the day's light, the live line, the child switcher, the child's friend on the grass -------------------
function liveHtml(esc, L, d) {
  const cur = (d.kids || []).find((k) => k.id === d.child) || {};
  const s = liveState(d.today);
  const f = cur.first || '';
  const text = s.left ? L.pickedUp(f, s.left) : s.arrived ? `${L.checkedIn(f, s.arrived)}${s.resting ? ` · ${L.restingNow}` : s.last ? ` · ${L.lastUpdate(cap(s.last.words), s.last.time)}` : ''}` : L.notInYet(f);
  return `<p class="fd-live fd-live-${s.left ? 'done' : s.arrived ? 'here' : 'none'}" id="fdLive"><span class="fd-pulse" aria-hidden="true"></span><span>${esc(text)}</span></p>`;
}
function heroHtml(esc, L, lang, slug, d, cur, kids, view) {
  const friend = guideFriend(cur.guide) || 'bop';
  const monday = (() => { const t = new Date(`${String(d.date).slice(0, 10)}T12:00:00Z`); t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7)); return t.toISOString().slice(0, 10); })();
  return `<section class="fd-hero" id="familyWelcome" aria-labelledby="fdWelcomeH">
    ${sceneHtml({ part: view.part })}
    <img class="fd-hero-friend fd-hf-${esc(friend)}" src="img/scene/cut-${esc(friend)}-440.webp" alt="" aria-hidden="true" decoding="async">
    <div class="fd-hero-in">
      <p class="fd-date"><span>${esc(dateLong(d.date, lang))}</span><span class="fd-rule" aria-hidden="true"></span><span class="fd-weekof">${esc(L.weekOf(dayText(monday, lang, { month: 'short', day: 'numeric' })))}</span></p>
      <h2 id="fdWelcomeH" class="fd-hello">${esc(greeting(view.part, view.name, lang))}</h2>
      ${liveHtml(esc, L, d)}
      ${kids.length > 1 ? `<nav class="fd-kids" id="fdKids" aria-label="${esc(L.kids)}">${kids.map((k) => `<a class="fd-kid" href="/c/${esc(slug)}/home?kid=${encodeURIComponent(k.id)}" data-nav data-kid="${esc(k.id)}"${k.id === cur.id ? ' aria-current="page"' : ''}>
        ${avatarHtml(esc, k.guide, 'fd-av')}<span class="fd-kid-text"><b>${esc(k.first)}</b><span>${esc(k.room_name || '')}</span></span></a>`).join('')}</nav>` : ''}
    </div>
  </section>`;
}

// ---- the rail (desktop) / section chips + the bottom action bar (phones) -----------------------------------------------------
function railHtml(esc, L, slug, cur, d) {
  const sec = [['fdKpis', 'star', L.glance(cur.first || '')], ['fdToday', 'sun', L.day(cur.first || '')], ...((d.attention || []).length ? [['fdAttention', 'incident', L.attention]] : []),
    ['familyLearning', 'learn', L.learning], ['fdFriends', 'video', L.friends], ['fdMessages', 'chat', L.messages], ['fdUpcoming', 'calendar', L.upcoming], ['familyMore', 'more', L.moreTitle]];
  const a = (id, href, ic, label, short, cls = '') => `<a class="fd-action ${cls}" id="${id}" href="${esc(href)}" data-nav><span class="fd-ico">${icon(ic)}</span><span class="fd-a-long">${esc(label)}</span><span class="fd-a-short">${esc(short)}</span></a>`;
  return `<aside class="fd-rail" aria-label="${esc(L.sections)}">
    <nav class="fd-secnav" id="fdSecNav" aria-label="${esc(L.sections)}">${sec.map(([id, ic, label]) => `<a class="fd-sec" href="#${id}" data-sec="${id}">${icon(ic)}<span>${esc(label)}</span></a>`).join('')}</nav>
    <nav class="fd-actions" id="fdActions" aria-label="${esc(L.actions)}">
      ${a('qaMessage', dashLink(slug, 'thread', { kid: cur.id }), 'chat', L.qaMessage, L.short.message)}
      ${a('qaAbsence', dashLink(slug, 'absence', { kid: cur.id }), 'calendar', L.qaAbsence, L.short.absence)}
      ${a('qaShare', dashLink(slug, 'share', { kid: cur.id }), 'share', L.qaShare, L.short.share)}
      ${a('openKidMode', dashLink(slug, 'kid'), 'kid', L.qaKid, L.short.kid, 'fd-action-gold')}
      ${a('familyHelpLink', dashLink(slug, 'help'), 'help', L.qaHelp, L.short.help)}</nav>
  </aside>`;
}

// ---- the KPI band: the child's numbers, each derived (family-kpi.js), each opening where it comes from ---------------------------
const count = (n, suffix = '') => `<span class="fd-num" data-count="${Number(n)}" data-suffix="${suffix}">${Number(n)}${suffix}</span>`;
function ring(p, tone) {
  const r = 26, C = 2 * Math.PI * r, v = Math.max(0, Math.min(100, Number(p) || 0));
  return `<svg class="fd-ring fd-rt-${tone}" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><circle class="fd-ring-bg" cx="32" cy="32" r="${r}"/>
    <circle class="fd-ring-fg" cx="32" cy="32" r="${r}" stroke-dasharray="${C.toFixed(2)}" data-off="${(C * (1 - v / 100)).toFixed(2)}" stroke-dashoffset="${(C * (1 - v / 100)).toFixed(2)}"/></svg>`;
}
function bars(series, lang, tone, max = 1) {
  const days = series.map((s) => dayText(s.day, lang, { weekday: 'narrow' }));
  return `<span class="fd-bars fd-t-${tone}" aria-hidden="true">${series.map((s, i) => `<span class="fd-bar${i === series.length - 1 ? ' fd-bar-today' : ''}${s.value == null ? ' fd-bar-none' : ''}">
    <span class="fd-bar-fill" data-h="${s.value == null ? 0 : Math.round(Math.min(1, s.value / max) * 100)}"></span><span class="fd-bar-d">${(days[i])}</span></span>`).join('')}</span>`;
}
function spark(values, tone) {
  const pts = sparkPoints(values, 120, 34);
  const segs = []; let curSeg = [];
  for (const p of pts) { if (p) curSeg.push(p.join(',')); else if (curSeg.length) { segs.push(curSeg); curSeg = []; } }
  if (curSeg.length) segs.push(curSeg);
  return `<svg class="fd-spark fd-t-${tone}" viewBox="0 0 120 34" aria-hidden="true" focusable="false">${segs.map((s) => `<polyline points="${s.join(' ')}"/>`).join('')}</svg>`;
}
// the last school days as dots: here (filled), closed (striped), not here (empty); each with its weekday letter
function strip7(esc, lang, days) {
  if (!days.length) return '';
  return `<span class="fd-strip7" aria-hidden="true">${days.map((x) => `<span class="fd-s7 ${x.closed ? 'fd-s7-closed' : x.present ? 'fd-s7-here' : 'fd-s7-away'}"><span></span><i>${esc(dayText(x.day, lang, { weekday: 'narrow' }))}</i></span>`).join('')}</span>`;
}
// skills by area of learning: one stacked bar per area (secure / developing / emerging counts); no totals across areas
function domainChart(esc, lang, domains, mini = false) {
  if (!domains?.length) return '';
  const D = DOMAIN[lang === 'es' ? 'es' : 'en'];
  const max = Math.max(...domains.map((x) => x.secure + x.developing + x.emerging), 1);
  return `<span class="fd-dchart${mini ? ' fd-dchart-mini' : ''}"${mini ? ' aria-hidden="true"' : ''}>${domains.map((x) => { const n = x.secure + x.developing + x.emerging;
    return `<span class="fd-drow"><span class="fd-dlabel">${esc(D[x.domain] || x.domain)}</span><span class="fd-dbar" data-w="${Math.round((n / max) * 100)}">
      ${['secure', 'developing', 'emerging'].map((k) => (x[k] ? `<span class="fd-st-${k[0]}" data-w="${Math.round((x[k] / n) * 100)}">${mini ? '' : x[k]}</span>` : '')).join('')}</span></span>`; }).join('')}</span>`;
}
function kpiHtml(esc, L, lang, slug, d, view) {
  const cur = (d.kids || []).find((k) => k.id === d.child) || {};
  const x = view.x || {}, st = x.stats || null, K = L.k, S = L.kSub;
  const off = (id, label, cls = '') => `<div class="fd-kpi fd-kpi-off ${cls}" id="${id}"><span class="fd-kpi-label">${esc(label)}</span><span class="chip">${esc(L.notConnected)}</span></div>`;
  const tile = (id, href, tone, label, value, sub, viz = '', extraCls = '') => `<a class="fd-kpi fd-k-${tone} ${extraCls}" id="${id}" href="${esc(href)}" data-nav data-sheet="${id}" aria-haspopup="dialog">
    <span class="fd-kpi-label">${esc(label)}</span><span class="fd-kpi-val">${value}</span><span class="fd-kpi-sub">${esc(sub)}</span>${viz}</a>`;
  const out = [];
  // 1. here today
  const att = d.today?.attendance || {};
  out.push(tile('kpiHere', dashLink(slug, 'day', { kid: d.child }), att.left ? 'navy' : att.arrived ? 'zuri' : 'muted', K.here,
    `<span class="fd-time">${esc(att.left || att.arrived || '—')}</span>`, att.left ? S.left : att.arrived ? S.arrived : S.notIn,
    `<span class="fd-kpi-ico">${icon('home')}</span>`));
  // 2. attendance this month
  const a = attendanceKpi(st);
  out.push(a ? tile('kpiMonth', dashLink(slug, 'child', { kid: d.child }), 'booker', K.month, `${count(a.present)}<small>/${a.school}</small>`, S.days(a.present, a.school),
    ring(a.pct ?? 0, 'booker') + strip7(esc, lang, (st.days || []).slice(-7)), 'fd-kpi-ring') : off('kpiMonth', K.month));
  // 3. ate today
  const m = mealsKpi(st);
  out.push(m ? tile('kpiAte', dashLink(slug, 'day', { kid: d.child }), 'zuri', K.ate, m.today == null ? `<span class="fd-dim">${esc(L.nothingYet)}</span>` : count(m.today, '%'), m.today == null ? S.lastDays : S.plate,
    bars(m.series, lang, 'zuri'), 'fd-kpi-wide') : off('kpiAte', K.ate, 'fd-kpi-wide'));
  // 4. rest
  const r = restKpi(st);
  out.push(r ? tile('kpiRest', dashLink(slug, 'day', { kid: d.child }), 'lumi', K.rest, r.today == null ? `<span class="fd-dim">${esc(L.nothingYet)}</span>` : `${count(r.today)}<small> ${esc(S.minutes)}</small>`,
    r.usual != null ? S.usual(minutesText(r.usual, lang)) : S.lastDays, bars(r.series, lang, 'lumi', Math.max(120, ...r.series.map((s) => s.value || 0))), 'fd-kpi-wide') : off('kpiRest', K.rest, 'fd-kpi-wide'));
  // 5. feelings
  const md = moodKpi(st, String(d.date).slice(0, 10));
  out.push(st ? tile('kpiFeel', dashLink(slug, 'day', { kid: d.child }), 'gold', K.feel,
    md.today ? `<img class="fd-feel-big" src="img/friends/${esc(FEEL_ART[md.today] || 'lumi')}-480.webp" alt="" width="56" height="56" loading="lazy"><span class="fd-feel-word">${esc((FEEL[lang] || FEEL.en)[md.today] || md.today)}</span>` : `<span class="fd-dim">${esc(L.nothingYet)}</span>`,
    S.recent, md.days.length ? `<span class="fd-feels" aria-hidden="true">${md.days.map((x2) => `<span class="fd-feelday"><img src="img/friends/${esc(FEEL_ART[x2.feeling] || 'lumi')}-480.webp" alt="" width="24" height="24" loading="lazy"><i>${esc(dayText(x2.day, lang, { weekday: 'narrow' }))}</i></span>`).join('')}</span>` : '', 'fd-kpi-feel') : off('kpiFeel', K.feel));
  // 6. skills (counts per level from the latest released report; no scores added up, no comparison)
  const sk = skillsKpi(st);
  out.push(sk && sk.total ? tile('kpiSkills', dashLink(slug, 'report', { kid: d.child, id: sk.report }), 'bop', K.skills, `${count(sk.secure)}<small>/${sk.total}</small>`,
    S.skills(sk.secure, sk.developing, sk.emerging), domainChart(esc, lang, sk.domains, true), 'fd-kpi-wide')
    : st ? tile('kpiSkills', dashLink(slug, 'grades', {}) + `?kid=${encodeURIComponent(d.child)}`, 'bop', K.skills, `<span class="fd-dim">${esc(L.noReport.split('.')[0])}</span>`, '', '', 'fd-kpi-wide') : off('kpiSkills', K.skills, 'fd-kpi-wide'));
  // 7. at home this week
  const h = homeKpi(d.learning);
  out.push(h ? tile('kpiHome', dashLink(slug, 'learn', { kid: d.child }), 'zuri', K.home, `${count(h.done)}<small>/${h.total}</small>`, S.homeDone(h.done, h.total), ring(h.pct, 'zuri'), 'fd-kpi-ring')
    : off('kpiHome', K.home));
  // 8. story time: the room's story circle today (the classroom's log) and the child's Kid Mode minutes this week
  const lt = st?.learning_time; const km = lt ? Math.round(((lt.home_sec || 0) + (lt.center_sec || 0)) / 60) : null;
  out.push(st ? tile('kpiStory', dashLink(slug, 'day', { kid: d.child }), 'booker', K.story, st.story_min ? `${count(st.story_min)}<small> ${esc(S.minutes)}</small>` : `<span class="fd-dim">${esc(L.nothingYet)}</span>`,
    st.story_min ? S.storyRoom(cur.room_name || '') : (km != null ? S.kidMode(minutesText(km, lang)) : ''), `<span class="fd-kpi-ico">${icon('book')}</span>`) : off('kpiStory', K.story));
  // 9. portfolio this month
  out.push(st && st.portfolio_month != null ? tile('kpiWork', dashLink(slug, 'work', { kid: d.child }), 'lumi', K.work, count(st.portfolio_month), S.workMonth, `<span class="fd-kpi-ico">${icon('star')}</span>`) : off('kpiWork', K.work));
  // 10. messages
  const un = d.messages ? Number(d.messages.unread || 0) : null;
  out.push(un != null ? tile('kpiMsgs', dashLink(slug, 'thread', { kid: d.child }), un ? 'gold' : 'navy', K.msgs, count(un), un ? S.unread(un) : S.allRead, `<span class="fd-kpi-ico">${icon('chat')}</span>`, un ? 'fd-kpi-alert' : '') : off('kpiMsgs', K.msgs));
  // 11. the next day off
  const nextOff = (x.calendar || []).find((c2) => c2.status === 'closed') || (x.calendar || [])[0];
  out.push(x.calendar ? (nextOff ? tile('kpiNext', dashLink(slug, 'calendar', { date: String(nextOff.day).slice(0, 10) }), 'navy', K.next,
    `<span class="fd-cal fd-cal-lg"><span class="fd-cal-m">${esc(dayText(nextOff.day, lang, { month: 'short' }))}</span><span class="fd-cal-d">${esc(dayText(nextOff.day, lang, { day: 'numeric' }))}</span></span>`,
    `${lang === 'es' ? (nextOff.label_es || nextOff.label) : nextOff.label}${nextOff.status === 'early' ? ` · ${L.early}` : ''}`, '', 'fd-kpi-cal')
    : tile('kpiNext', dashLink(slug, 'calendar', {}), 'navy', K.next, '—', S.noneSoon)) : off('kpiNext', K.next));
  // 12. tuition: the balance of the open invoice, opening THAT invoice
  const tu = d.upcoming?.tuition;
  out.push(tu ? tile('kpiTuition', dashLink(slug, 'billing', { id: tu.invoice_id }), tu.status === 'past_due' ? 'bad' : 'navy', K.tuition, `<span class="fd-money">${esc(money(tu.due_cents, lang))}</span>`,
    tu.status === 'past_due' ? L.pastDue : S.due(dayText(tu.due_date, lang)), `<span class="fd-kpi-ico">${icon('tuition')}</span>`)
    : tile('kpiTuition', `/c/${encodeURIComponent(slug)}/billing-family`, 'navy', K.tuition, `<span class="fd-money">${esc(S.nothingDue)}</span>`, L.billingAll, `<span class="fd-kpi-ico">${icon('tuition')}</span>`));
  return `<section class="fd-kpis" id="fdKpis" aria-labelledby="fdKpiH"><h2 id="fdKpiH" class="fd-sec-h">${esc(L.glance(cur.first || ''))}</h2><div class="fd-kpi-grid">${out.join('')}</div></section>`;
}

// ---- today: the live timeline ------------------------------------------------------------------------------------------------
function todayHtml(esc, L, lang, slug, d) {
  const cur = (d.kids || []).find((k) => k.id === d.child) || {};
  const t = d.today || {};
  const att = attendanceText(t.attendance, lang);
  const tl = [...(t.timeline || [])].reverse();          // newest first
  const shown = tl.slice(0, 8);
  const entry = (e, i) => {
    const tone = KIND_TONE[e.kind] || 'navy';
    const art = e.kind === 'mood' && FEEL_ART[e.code] ? `<img class="fd-feel" src="img/friends/${esc(FEEL_ART[e.code])}-480.webp" alt="" width="40" height="40" loading="lazy">` : `<span class="fd-ico fd-t-${tone}">${icon(e.kind)}</span>`;
    return `<li class="fd-entry fd-e-${esc(e.kind)}${e.kind === 'nap' && !e.ended ? ' fd-e-live' : ''}" data-kind="${esc(e.kind)}" data-i="${i}"><span class="fd-entry-time">${esc(e.time)}</span>${art}<span class="fd-entry-body"><span class="fd-entry-words">${esc(cap(e.words))}</span></span></li>`;
  };
  const incidents = (t.incidents || []).map((i) => `<p class="fd-incident" data-incident="${esc(i.id)}">${icon('incident')}<span>${esc(L.incident(i.time))} ${i.acknowledged ? esc(L.incidentAck)
    : `<a href="${esc(dashLink(slug, 'incident', { id: i.id }))}" data-nav>${esc(L.readAck)}</a>`}</span></p>`).join('');
  return `<section class="card fd-card fd-today" id="fdToday" aria-labelledby="fdTodayH">
    <div class="fd-today-head">${avatarHtml(esc, cur.guide, 'fd-av-l')}
      <div class="fd-today-title"><h2 id="fdTodayH">${esc(L.day(cur.first || ''))}</h2>
        <p class="fd-room">${esc(cur.room_name || '')}</p>
        <p class="fd-status fd-st-${att.tone}"><span class="fd-dot" aria-hidden="true"></span>${esc(att.text)}</p></div>
      <p class="fd-updated small" id="fdUpdated">${esc(agoText(t.updated_at, lang))}</p></div>
    ${incidents}
    ${shown.length ? `<ol class="fd-entries" id="fdEntries">${shown.map(entry).join('')}</ol>${tl.length > shown.length ? `<p class="fd-more-n small muted">${esc(L.more(tl.length - shown.length))}</p>` : ''}`
      : `<p class="fd-empty">${esc(L.emptyDay(cur.first || ''))}</p>`}
    <div class="fd-today-foot">
      ${t.published ? `<p class="fd-report-ready"><a class="fd-ready" href="${esc(dashLink(slug, 'day', { kid: d.child, date: d.date }))}" data-nav id="fdReportReady">${esc(L.reportReady)}</a></p>` : `<p class="small muted">${esc(L.reportAt(t.send_time || 'about 5:30 pm'))}</p>`}
      <a class="btn navy fd-primary" id="fdFullDay" href="${esc(dashLink(slug, 'day', { kid: d.child }))}" data-nav>${esc(L.fullDay(cur.first || ''))}</a></div>
  </section>`;
}

// ---- waiting for you: an action inbox in three bands ---------------------------------------------------------------------------
function attentionHtml(esc, L, lang, slug, d) {
  const items = d.attention || [];
  if (!items.length) return `<section class="card fd-card fd-attn fd-attn-clear" id="fdAttention" aria-labelledby="fdAttnH"><h2 id="fdAttnH">${esc(L.attention)}</h2>
    <p class="fd-clear"><img src="img/friends/bop-waving-480.webp" alt="" width="56" height="56" loading="lazy"><span>${esc(L.allClear)}</span></p></section>`;
  const link = (it) => dashLink(slug, it.kind, { id: it.id, kid: it.kid });
  const band = (p) => items.filter((it) => (PRIORITY[it.kind] || 'news') === p);
  const li = (it) => `<li><a class="fd-attn-item fd-k-${esc(it.kind)} fd-p-${PRIORITY[it.kind] || 'news'}" href="${esc(link(it))}" data-nav data-kind="${esc(it.kind)}" data-id="${esc(it.id)}">
      <span class="fd-ico">${icon(it.kind)}</span><span class="fd-attn-text">${esc(attentionText(it, lang))}${it.first ? `<span class="fd-attn-kid">${esc(it.first)}</span>` : ''}</span><span class="fd-go">${icon('arrow')}</span></a></li>`;
  return `<section class="card fd-card fd-attn" id="fdAttention" aria-labelledby="fdAttnH"><h2 id="fdAttnH">${esc(L.attention)} <span class="fd-count">${esc(L.attentionN(items.length))}</span></h2>
    ${['now', 'soon', 'news'].map((p) => (band(p).length ? `<h3 class="fd-band fd-band-${p}">${esc(L.prio[p])}</h3><ul class="fd-attn-list">${band(p).map(li).join('')}</ul>` : '')).join('')}</section>`;
}

// ---- photos of the day, pickup, what to bring --------------------------------------------------------------------------------
function photosHtml(esc, L, lang, d, cur, x) {
  const ok = !!d.learning?.photo_ok;
  const ph = x.photos;
  if (ph == null) return `<section class="card fd-card fd-photos" id="fdPhotos" aria-labelledby="fdPhH"><h2 id="fdPhH">${icon('photo')} ${esc(L.photos)}</h2><span class="chip">${esc(L.notConnected)}</span></section>`;
  return `<section class="card fd-card fd-photos" id="fdPhotos" aria-labelledby="fdPhH"><h2 id="fdPhH">${icon('photo')} ${esc(L.photos)}</h2>
    ${ph.length ? `<ul class="fd-photo-strip">${ph.map((p) => `<li><figure><img class="fd-photo fd-photo-day" data-path="${esc(p.path)}" alt="${esc(p.caption || L.photos)}" width="320" height="240" loading="lazy">
      ${p.caption ? `<figcaption>${esc(p.caption)}</figcaption>` : ''}</figure></li>`).join('')}</ul>`
      : `<p class="small muted">${esc(ok ? L.noPhotos(cur.first || '') : L.photosConsent)}</p>`}</section>`;
}
function pickupHtml(esc, L, slug, cur, x) {
  const pk = x.pickup;
  if (pk == null) return `<section class="card fd-card fd-pickup" id="fdPickup" aria-labelledby="fdPkH"><h2 id="fdPkH">${icon('pickup')} ${esc(L.pickup)}</h2><span class="chip">${esc(L.notConnected)}</span></section>`;
  const people = pk.people || [], passes = pk.passes_today || [];
  return `<section class="card fd-card fd-pickup" id="fdPickup" aria-labelledby="fdPkH"><h2 id="fdPkH">${icon('pickup')} ${esc(L.pickup)}</h2>
    ${people.length ? `<ul class="fd-people">${people.map((p) => `<li><span class="fd-person-av fd-pk-${p.kind === 'guardian' ? 'g' : 'a'}" aria-hidden="true">${esc(initialsOf(p.name))}</span>
      <span><b>${esc(shortName(p.name))}</b>${p.is_me ? ` <span class="chip gold">${esc(L.pickupYou)}</span>` : ''}<span class="small muted">${esc(p.relationship_label || '')}</span></span></li>`).join('')}</ul>`
      : `<p class="small muted">${esc(L.pickupNone)}</p>`}
    ${passes.length ? `<p class="fd-pass">${esc(L.pickupPass)}: ${passes.map((p) => esc(shortName(p.name))).join(', ')}</p>` : ''}
    <a class="btn link fd-cardlink" id="fdPickupLink" href="${esc(dashLink(slug, 'pickup', { kid: cur.id }))}" data-nav>${esc(L.pickupOpen)}</a></section>`;
}
function bringHtml(esc, L, lang, cur, x) {
  const b = x.bring;
  if (b == null) return `<section class="card fd-card fd-bring" id="fdBring" aria-labelledby="fdBrH"><h2 id="fdBrH">${icon('bag')} ${esc(L.bring)}</h2><span class="chip">${esc(L.notConnected)}</span></section>`;
  const today = String(x.date || '').slice(0, 10);
  const label = (day) => { if (day === today) return L.today; const t = new Date(`${today}T12:00:00Z`); t.setUTCDate(t.getUTCDate() + 1); return day === t.toISOString().slice(0, 10) ? L.tomorrow : cap(dayText(day, lang, { weekday: 'long' })); };
  return `<section class="card fd-card fd-bring" id="fdBring" aria-labelledby="fdBrH"><h2 id="fdBrH">${icon('bag')} ${esc(L.bring)}</h2>
    ${b.length ? `<ul class="fd-notes">${b.map((n) => `<li class="fd-note"><span class="fd-note-day">${esc(label(String(n.day).slice(0, 10)))}</span><span${n.draft_es ? ' lang="en"' : ''}>${esc(n.text)}</span></li>`).join('')}</ul>`
      : `<p class="small muted">${esc(L.noBring)}</p>`}</section>`;
}

// ---- learning ---------------------------------------------------------------------------------------------------------------
function learningHtml(esc, L, lang, slug, d, cur) {
  const l = d.learning;
  if (!l) return `<section class="card fd-card" id="familyLearning"><h2>${esc(L.learning)}</h2><p class="muted">${esc(L.couldNot)}</p>
    <a class="btn soft" href="${esc(dashLink(slug, 'learn', { kid: cur.id }))}" data-nav id="openLearnWeek">${esc(L.doWeek)}</a></section>`;
  const r = l.report;
  const key = r?.levels_key || {};
  const skill = (s) => { const k = key[s.level] || {}; const label = lang === 'es' ? (s.text_es || s.family_en || s.text_en) : (s.family_en || s.text_en);
    return `<li><span class="fd-skill">${esc(label)}</span><span class="fd-skill-lvl"><span class="chip sc-lvl sc-lvl-${esc(s.level)}">${esc(lang === 'es' ? k.es : k.en)}</span>
      <span class="small muted">${s.max > 0 ? esc(numbersText(s.points, s.max, lang)) : esc(L.noNum)}</span></span></li>`; };
  const by = (it) => (it.by === 'kid_mode' ? L.byKid : it.by === 'family' ? L.byFamily : L.byStaff);
  const h = homeKpi(l);
  return `<section class="card fd-card fd-learning" id="familyLearning" aria-labelledby="fdLearnH"><h2 id="fdLearnH">${icon('learn')} ${esc(L.learning)}</h2>
    <div class="fd-learn-grid">
    <div class="fd-week"><h3>${esc(L.thisWeek(l.unit, l.week_theme))}</h3>
      ${h ? `<div class="fd-week-ring">${ring(h.pct, 'zuri')}<span class="fd-week-n"><b>${h.done}</b>/${h.total}</span></div>
        <label class="fd-progress"><span>${esc(L.doneOf(l.home_done, l.home_total))}</span><progress max="${Number(l.home_total)}" value="${Number(l.home_done)}">${Number(l.home_done)} / ${Number(l.home_total)}</progress></label>`
        : `<p class="small muted">${esc(L.noHome)}</p>`}
      <a class="btn gold fd-primary" href="${esc(dashLink(slug, 'learn', { kid: cur.id }))}" data-nav id="openLearnWeek">${esc(L.doWeek)}</a></div>
    <div class="fd-report" id="fdReport"><h3>${esc(L.report)}</h3>
      ${r ? `<p class="small muted">${esc(L.period(dayText(r.from, lang), dayText(r.to, lang)))}</p><ul class="fd-skills">${(r.skills || []).map(skill).join('')}</ul>
        ${r.skill_count > (r.skills || []).length ? `<p class="small muted">${esc(L.moreSkills(r.skill_count - r.skills.length))}</p>` : ''}
        <p class="mini muted">${esc(L.reportOnly)}</p>
        <a class="btn link" href="${esc(dashLink(slug, 'report', { id: r.id, kid: cur.id }))}" data-nav id="fdReportLink">${esc(L.readReport)}</a>` : `<p class="small muted">${esc(L.noReport)}</p>`}</div>
    <div class="fd-portfolio"><h3>${esc(L.portfolio)}</h3>
      ${(l.portfolio || []).length ? `<ul class="fd-work">${l.portfolio.map((it) => `<li>${it.photo_path && l.photo_ok ? `<img class="fd-work-img fd-photo" data-path="${esc(it.photo_path)}" alt="" width="96" height="96">` : `<img class="fd-work-img" src="${esc(friendImg(it.friend || 'bop'))}" alt="" width="96" height="96" loading="lazy">`}
        <span><b>${esc(it.title)}</b><span class="small muted">${esc(dayText(it.done_on, lang))} · ${esc(by(it))}</span></span></li>`).join('')}</ul>` : `<p class="small muted">${esc(L.noPortfolio)}</p>`}</div>
    </div></section>`;
}

// ---- messages --------------------------------------------------------------------------------------------------------------
function messagesHtml(esc, L, lang, slug, d) {
  const m = d.messages;
  const cur = (d.kids || []).find((k) => k.id === d.child) || {};
  const head = `<h2 id="fdMsgH">${icon('chat')} ${esc(L.messages)}${m?.unread ? ` <span class="fd-badge" id="fdUnread">${esc(L.unread(m.unread))}</span>` : ''}</h2>`;
  if (!m) return `<section class="card fd-card" id="fdMessages" aria-labelledby="fdMsgH">${head}<p class="muted">${esc(L.couldNot)}</p></section>`;
  const fmt = (iso) => new Intl.DateTimeFormat(lang === 'es' ? 'es-US' : 'en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: centerTz() }).format(new Date(iso));
  return `<section class="card fd-card fd-messages" id="fdMessages" aria-labelledby="fdMsgH">${head}
    ${(m.items || []).length ? `<ul class="fd-msgs">${m.items.map((x) => `<li><a class="fd-msg${x.mine ? ' fd-mine' : ''}${x.unread ? ' fd-unread' : ''}" href="${esc(dashLink(slug, 'chat', { kid: d.child, id: x.id }))}" data-nav data-id="${esc(x.id)}">
        <span class="fd-msg-meta"><b>${esc(x.mine ? L.you : L.teacher)}</b> · ${esc(fmt(x.at))}${x.unread ? ` <span class="chip gold">${esc(L.newChip)}</span>` : ''}</span>
        <span class="fd-msg-text">${esc(x.text || (x.files ? L.attached : ''))}</span></a></li>`).join('')}</ul>` : `<p class="small muted">${esc(L.noMessages(cur.first || ''))}</p>`}
    ${(m.announcements || []).length ? `<h3>${esc(L.announcements)}</h3><ul class="fd-anns">${m.announcements.map((a) => `<li><a href="${esc(dashLink(slug, 'announcement', { id: a.id }))}" data-nav data-id="${esc(a.id)}">
        <span class="fd-ico fd-t-gold">${icon('announcement')}</span><span><b>${esc(a.title)}</b><span class="small muted">${esc(dayText(a.at, lang))}</span></span>${a.unread ? `<span class="chip gold">${esc(L.newChip)}</span>` : ''}</a></li>`).join('')}</ul>` : ''}
    <a class="btn navy fd-primary" href="${esc(dashLink(slug, 'thread', { kid: d.child }))}" data-nav id="fdThread">${esc(L.openThread(cur.first || ''))}</a></section>`;
}

// ---- from the friends: Today's video (placeholders say "Coming soon"; the owner makes the videos) and the character message --------
function friendsHtml(esc, L, lang, slug, d, cur) {
  const f = d.friends;
  if (!f) return '';
  const title = (x) => (lang === 'es' ? (x.title_es || x.title_en) : x.title_en) || '';
  const v = f.video, m = f.message;
  const body = [];
  if (v) {
    const ready = v.state === 'ready';
    const fr = FOUR.includes(v.friend) ? v.friend : 'bop';
    body.push(`<a class="fd-friend fd-f-${esc(fr)}" href="${esc(dashLink(slug, ready ? 'video-play' : 'video', { id: v.delivery_id }))}" data-nav id="fdVideo" data-id="${esc(v.delivery_id)}">
      <span class="fd-poster"><img src="img/scene/cut-${esc(fr)}-440.webp" alt="" width="120" height="160" loading="lazy"><span class="fd-playbtn" aria-hidden="true">${icon('video')}</span></span>
      <span class="fd-friend-text"><span class="small">${esc(L.video)}</span><b>${esc(title(v))}</b>
      ${ready ? `<span class="fd-play">${esc(L.watch)}</span>` : `<span class="chip gold">${esc(L.comingSoon)}</span>`}</span></a>`);
  }
  if (m) {
    const fr = FOUR.includes(m.friend) ? m.friend : 'lumi';
    body.push(`<a class="fd-friend fd-f-${esc(fr)}" href="${esc(dashLink(slug, 'charmsg-play', { kid: cur.id }))}" data-nav id="fdCharmsg" data-id="${esc(m.request_id)}">
      <span class="fd-poster"><img src="img/scene/cut-${esc(fr)}-440.webp" alt="" width="120" height="160" loading="lazy"></span><span class="fd-friend-text"><span class="small">${esc(L.message)}</span><b>${esc(title(m))}</b><span class="fd-play">${esc(L.openPlayer)}</span></span></a>`);
  } else if (f.consent) {
    const g = guideFriend(cur.guide) || 'lumi';
    body.push(`<div class="fd-friend fd-f-${esc(g)} fd-friend-soon" id="fdCharmsgSoon"><span class="fd-poster"><img src="img/scene/cut-${esc(g)}-440.webp" alt="" width="120" height="160" loading="lazy"></span>
      <span class="fd-friend-text"><span class="small">${esc(L.friendMsg)}</span><b>${esc(L.msgSoon(FRIEND_NAME[g]))}</b><span class="chip gold">${esc(L.comingSoon)}</span></span></div>`);
  }
  return `<section class="card fd-card fd-friends" id="fdFriends" aria-labelledby="fdFriendsH"><h2 id="fdFriendsH">${icon('video')} ${esc(L.friends)}</h2>
    ${body.length && (v || m || f.consent) ? `<div class="fd-friend-grid">${body.join('')}</div>` : `<div class="fd-friends-empty"><img src="img/friends/bop-waving-480.webp" alt="" width="72" height="72" loading="lazy"><p class="small muted">${esc(f.consent ? L.noFriends(cur.first || '') : L.friendsConsent)}</p></div>`}
  </section>`;
}

// ---- coming up: a calendar strip (closed days incl. the Jewish holidays the center closes or dismisses early for, absences, tuition) ----
function upcomingHtml(esc, L, lang, slug, d, x) {
  const up = d.upcoming || {};
  const closures = x.calendar ?? up.closures, tu = up.tuition, abs = up.absences || [];
  if (closures == null && !tu && !abs.length) return '';
  const strip = calendarStrip({ calendar: closures || [], absences: abs, tuition: tu });
  const cal = (day) => `<span class="fd-cal"><span class="fd-cal-m">${esc(dayText(day, lang, { month: 'short' }))}</span><span class="fd-cal-d">${esc(dayText(day, lang, { day: 'numeric' }))}</span></span>`;
  const tileOf = (it) => {
    if (it.kind === 'closure') return `<li><a class="fd-day fd-day-${it.status === 'closed' ? 'closed' : 'early'}" href="${esc(dashLink(slug, 'calendar', { date: it.day }))}" data-nav data-day="${esc(it.day)}">
      ${cal(it.day)}<span class="fd-day-body"><b>${esc(lang === 'es' ? (it.label_es || it.label) : it.label)}</b><span class="small muted">${esc(it.to !== it.day ? L.range(dayText(it.day, lang, { weekday: 'short', month: 'short', day: 'numeric' }), dayText(it.to, lang, { weekday: 'short', month: 'short', day: 'numeric' })) : cap(dayText(it.day, lang, { weekday: 'long' })))}</span>
      <span class="chip ${it.status === 'closed' ? 'warn' : 'gold'}">${esc(it.status === 'closed' ? L.closed : L.early)}</span></span></a></li>`;
    if (it.kind === 'absence') return `<li><a class="fd-day fd-day-absence" href="${esc(dashLink(slug, 'absence', { id: it.id }))}" data-nav data-id="${esc(it.id)}">${cal(it.day)}
      <span class="fd-day-body"><b>${esc(absenceSummary({ ...it.item, first: d.kids?.find((k) => k.id === it.item.kid)?.first }, lang))}</b><span class="small muted">${esc(L.absences)}</span></span></a></li>`;
    return '';
  };
  const closuresHtml = strip.filter((i) => i.kind === 'closure');
  return `<section class="card fd-card fd-upcoming" id="fdUpcoming" aria-labelledby="fdUpH"><h2 id="fdUpH">${icon('calendar')} ${esc(L.upcoming)}</h2>
    ${closures != null ? (closuresHtml.length ? `<ul class="fd-days fd-strip">${closuresHtml.map(tileOf).join('')}</ul>` : `<p class="small muted">${esc(L.noClosures)}</p>`) : ''}
    ${tu ? `<div class="fd-tuition" id="fdTuition"><span class="fd-ico fd-t-navy">${icon('tuition')}</span><span><b>${esc(L.tuition)}</b>
        <span>${esc(L.due(money(tu.due_cents, lang), dayText(tu.due_date, lang)))}</span>${tu.status === 'past_due' ? ` <span class="chip bad">${esc(L.pastDue)}</span>` : ''}</span>
      <a class="btn soft small fd-tuition-go" href="${esc(dashLink(slug, 'billing', { id: tu.invoice_id }))}" data-nav id="fdTuitionLink">${esc(L.billingQ)}</a></div>` : ''}
    ${abs.length ? `<h3>${esc(L.absences)}</h3><ul class="fd-days" id="fdAbsences">${strip.filter((i) => i.kind === 'absence').map(tileOf).join('')}</ul>` : ''}
    ${closures != null ? `<a class="btn link" href="${esc(dashLink(slug, 'calendar', {}))}" data-nav id="fdCalendar">${esc(L.calendar)}</a>` : ''}
  </section>`;
}

// ---- this week's menu (the room's menu plan; the kitchen's change for a day wins) ----------------------------------------------
function menuHtml(esc, L, lang, d, x) {
  const m = x.menu;
  if (!m || !m.length) return '';
  const today = String(d.date).slice(0, 10);
  return `<section class="card fd-card fd-menu" id="fdMenu" aria-labelledby="fdMenuH"><h2 id="fdMenuH">${icon('menu')} ${esc(L.menu)}</h2>
    ${L.menuNote ? `<p class="mini muted">${esc(L.menuNote)}</p>` : ''}
    <ol class="fd-menu-days">${m.map((day) => `<li class="fd-mday${String(day.day).slice(0, 10) === today ? ' fd-mday-today' : ''}${day.source === 'closed' ? ' fd-mday-closed' : ''}">
      <span class="fd-mday-h"><b>${esc(cap(dayText(day.day, lang, { weekday: 'short' })))}</b><span class="small muted">${esc(dayText(day.day, lang, { month: 'short', day: 'numeric' }))}</span>${String(day.day).slice(0, 10) === today ? `<span class="chip gold">${esc(L.today)}</span>` : ''}</span>
      ${day.source === 'closed' ? `<span class="chip warn">${esc(L.closedDay)}${day.label ? ` · ${esc(lang === 'es' ? (day.label_es || day.label) : day.label)}` : ''}</span>`
        : `<dl>${[['breakfast', day.breakfast], ['lunch', day.lunch], ['snack', day.snack]].filter(([, v]) => v).map(([k, v]) => `<div><dt>${esc(L[k])}</dt><dd lang="en">${esc(v)}</dd></div>`).join('')}</dl>`}</li>`).join('')}</ol>
  </section>`;
}

// Everything the older landing page linked to, kept one tap away (and the email language, and files the center shared).
function moreHtml(esc, L, slug, kids, cur) {
  const lang = L === W.es ? 'es' : 'en';
  const tile = (id, href, label, hint = '') => `<a class="fd-tile" id="${id}" href="${esc(href)}" data-nav><b>${esc(label)}</b>${hint ? `<span class="small muted">${esc(hint)}</span>` : ''}</a>`;
  const opt = (v, label) => `<label class="choice"><input type="radio" name="preferred_language" value="${v}"${lang === v ? ' checked' : ''}><span lang="${v}"><b>${esc(label)}</b></span></label>`;
  return `<section class="card fd-more" id="familyMore" aria-labelledby="fdMoreH"><h2 id="fdMoreH">${esc(L.moreTitle)}</h2>
    ${kids.length ? `<ul class="fd-records" id="myKids">${kids.map((k) => `<li>${tile(`rec-${k.id}`, dashLink(slug, 'child', { kid: k.id }), L.record(k.first), L.recordHint)}</li>`).join('')}</ul>` : ''}
    <div class="fd-tiles">
      ${tile('familyChatLink', `/c/${slug}/chat${cur ? `?kid=${encodeURIComponent(cur.id)}` : ''}`, L.allChat)}
      ${tile('familyMessagesLink', `/c/${slug}/messages`, L.friendsMsgs)}
      ${tile('familyVideosLink', `/c/${slug}/videos`, L.videos)}
      ${tile('openLearn', `/c/${slug}/learn${cur ? `?kid=${encodeURIComponent(cur.id)}` : ''}`, L.learn)}
      ${tile('openWork', `/c/${slug}/work`, L.work)}
      ${tile('openReports', `/c/${slug}/grades${cur ? `?kid=${encodeURIComponent(cur.id)}` : ''}`, L.reports)}
      ${tile('openConferences', `/c/${slug}/checkpoints${cur ? `?kid=${encodeURIComponent(cur.id)}` : ''}`, L.conferences)}
      ${tile('familyCalendarLink', `/c/${slug}/calendar`, L.cal)}
      ${tile('familyHealthLink', `/c/${slug}/health`, L.health)}
      ${tile('familyPrivacyLink', `/c/${slug}/privacy`, L.privacy)}
      ${tile('familyHabitsLink', `/c/${slug}/habits`, L.habits)}
      ${tile('familyBillingLink', `/c/${slug}/billing-family`, L.billingAll)}
    </div>
    <form id="langForm" class="fd-lang" novalidate><fieldset class="f"><legend>${esc(lang === 'es' ? 'Idioma de estas páginas y de los correos' : 'Language for these pages and emails')}</legend>
      <div class="choices two">${opt('en', 'English')}${opt('es', 'Español')}</div></fieldset><p class="small msg" id="langMsg" role="status"></p></form>
  </section><div class="card" id="familyShares" hidden></div>`;
}

function bindMore(ctx) {
  const f = document.getElementById('langForm');
  if (f) f.addEventListener('change', (e) => { if (e.target.name === 'preferred_language' && e.target.value !== ctx.lang) ctx.setLanguage(e.target.value); });
  const sh = document.getElementById('familyShares');
  if (sh && ctx.renderShares) ctx.renderShares(sh, { c: ctx.c, session: ctx.session, client: ctx.client, live: ctx.live, title: ctx.T('family.shared'), open: ctx.T('family.sharedOpen') });
}

// Motion: count-ups, rings and bars grow in, the timeline arrives one entry after another; the section chips follow the scroll.
// With Reduce Motion or the Still scene switch nothing moves and every final value is already on screen (the HTML holds it).
function bindMotion(ctx) {
  const root = document.getElementById('familyDash');
  if (!root) return;
  const top = document.getElementById('top');   // the sticky glass header: the section chips stick just under it
  if (top) document.documentElement.style.setProperty('--fd-top', `${top.offsetHeight}px`);
  const grow = () => {
    for (const b of root.querySelectorAll('.fd-bar-fill[data-h]')) b.style.setProperty('--h', `${b.dataset.h}%`);
    for (const s of root.querySelectorAll('[data-w]')) s.style.setProperty('--w', `${s.dataset.w}%`);
  };
  const moving = motionOn() && document.visibilityState === 'visible';
  if (moving) {
    for (const rg of root.querySelectorAll('.fd-ring-fg')) rg.style.strokeDashoffset = rg.getAttribute('stroke-dasharray');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      grow();
      for (const rg of root.querySelectorAll('.fd-ring-fg')) rg.style.strokeDashoffset = rg.dataset.off;
      for (const n of root.querySelectorAll('.fd-num[data-count]')) countUp(n);
    }));
    setTimeout(() => root.classList.remove('fd-anim'), 1600);
  } else { grow(); root.classList.remove('fd-anim'); }
  // section chips / rail: smooth scroll (no hash change, so the router does not re-render) and the current section highlighted
  const nav = document.getElementById('fdSecNav');
  nav?.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-sec]'); if (!a) return;
    e.preventDefault();
    const t = document.getElementById(a.dataset.sec); if (!t) return;
    t.scrollIntoView({ behavior: motionOn() ? 'smooth' : 'auto', block: 'start' });
    t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true });
  });
  if (nav && typeof IntersectionObserver === 'function') {
    const links = new Map([...nav.querySelectorAll('a[data-sec]')].map((a) => [a.dataset.sec, a]));
    const io = new IntersectionObserver((es) => {
      if (!document.body.contains(nav)) { io.disconnect(); return; }
      for (const e of es) if (e.isIntersecting) { links.forEach((a) => a.removeAttribute('aria-current')); links.get(e.target.id)?.setAttribute('aria-current', 'true');
        const a = links.get(e.target.id); if (a && nav.scrollWidth > nav.clientWidth) nav.scrollTo({ left: a.offsetLeft - 16, behavior: motionOn() ? 'smooth' : 'auto' }); }
    }, { rootMargin: ['-35%', '0px', '-60%', '0px'].join(' ') });   // the section in the upper middle of the screen
    for (const id of links.keys()) { const el = document.getElementById(id); if (el) io.observe(el); }
  }
  // a KPI tile opens its detail sheet (a bottom sheet on phones); a modified click (new tab) still follows the link
  root.addEventListener('click', (e) => {
    const t = e.target.closest('a.fd-kpi[data-sheet]');
    if (!t || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0 || !state) return;
    if (!sheetBody(t.dataset.sheet, state.ctx, state.d, state.view)) return;   // no detail for this one: the link opens its page
    e.preventDefault(); e.stopPropagation();
    openSheet(t.dataset.sheet, t);
  });
  installDepth(root);
  // press feedback on pointer-down for every tappable thing on the dashboard (iOS shows :active late without it)
  root.addEventListener('pointerdown', (e) => { const t = e.target.closest('a,button,summary,label.choice'); if (t && root.contains(t)) { t.classList.add('is-pressed');
    const up = () => { t.classList.remove('is-pressed'); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
    window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up); } });
}
// a count-up that settles on the real figure (never stops at zero: a hidden tab or a missed frame shows the final value)
function countUp(el) {
  const to = Number(el.dataset.count), suffix = el.dataset.suffix || '';
  if (!Number.isFinite(to) || to === 0) return;
  const t0 = performance.now(), ms = 900;
  const settle = () => { el.textContent = `${to}${suffix}`; };
  const fail = setTimeout(settle, ms + 400);
  const step = (t) => { const p = Math.min(1, (t - t0) / ms); el.textContent = `${Math.round(to * (1 - (1 - p) ** 3))}${suffix}`; if (p < 1 && document.visibilityState === 'visible') requestAnimationFrame(step); else { clearTimeout(fail); settle(); } };
  requestAnimationFrame(step);
}

// Pull to refresh (phones): at the top of the page, a pull of 70 px shows a friend and reloads the numbers. Passive listeners only:
// the page's own scrolling and the iOS bounce stay untouched.
function bindPull(ctx, refresh) {
  const root = document.getElementById('familyDash');
  if (!root || !('ontouchstart' in window)) return;
  const L = words(ctx.lang);
  let y0 = null, pulled = 0, busy = false;
  const ind = document.createElement('div');
  ind.className = 'fd-ptr'; ind.setAttribute('aria-hidden', 'true');
  ind.innerHTML = `<img src="img/friends/bop-waving-480.webp" alt="" width="36" height="36"><span>${esc0(L.pull)}</span>`;
  root.prepend(ind);
  root.addEventListener('touchstart', (e) => { y0 = window.scrollY <= 0 && !busy ? e.touches[0].clientY : null; pulled = 0; }, { passive: true });
  root.addEventListener('touchmove', (e) => { if (y0 == null) return; pulled = Math.max(0, e.touches[0].clientY - y0); ind.style.setProperty('--pull', `${Math.min(90, pulled * 0.6)}px`); ind.classList.toggle('fd-ptr-ready', pulled > 70); }, { passive: true });
  root.addEventListener('touchend', async () => {
    if (y0 == null) return; y0 = null;
    if (pulled > 70 && !busy) { busy = true; ind.classList.add('fd-ptr-busy'); ind.querySelector('span').textContent = L.refreshing; await refresh(); busy = false; ind.querySelector('span').textContent = L.pull; }
    ind.classList.remove('fd-ptr-busy', 'fd-ptr-ready'); ind.style.setProperty('--pull', '0px');
  }, { passive: true });
}
const esc0 = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// photos (child-photos bucket, photo consent checked by the database and again by storage): short-lived signed links
function signPhotos(ctx) {
  for (const im of document.querySelectorAll('#familyDash img.fd-photo[data-path]')) {
    ctx.client().storage.from('child-photos').createSignedUrl(im.dataset.path, 300)
      .then((r) => { if (r.data?.signedUrl) im.src = r.data.signedUrl; else im.closest('li')?.remove(); }).catch(() => im.closest('li')?.remove());
  }
}

// ---- depth: soft planes behind the board move at their own speed as the page scrolls (the command center's layered glass) -------
function installDepth(root) {
  const planes = [...root.querySelectorAll('.fd-plane[data-rate]')];
  if (!planes.length || !motionOn()) return;
  let raf = 0;
  const paint = () => { raf = 0; if (!document.body.contains(root)) { window.removeEventListener('scroll', onScroll); return; }
    const y = window.scrollY; for (const p of planes) p.style.transform = `translate3d(0, ${Math.max(-220, Math.min(220, y * Number(p.dataset.rate))).toFixed(1)}px, 0)`; };
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(paint); };
  window.addEventListener('scroll', onScroll, { passive: true });
  paint();
}

// ---- the detail sheets: tap a number to see where it comes from, then open the exact item ---------------------------------------
// A <dialog> (focus stays inside, Escape closes). Phones: a bottom sheet with a grabber that follows the finger and closes on a swipe
// down; wider screens: a centered panel. Open and close are CSS transitions keyed to data-state, so a close that is grabbed again
// reverses from where it is. Back closes the sheet (an entry in the history; app.js asks window.FFOverlay first). The page behind does
// not scroll while it is open.
let sheet = null, sheetFrom = null;
function sheetEl() {
  if (sheet && document.body.contains(sheet)) return sheet;
  sheet = document.createElement('dialog');
  sheet.className = 'fd-sheet'; sheet.id = 'fdSheet'; sheet.setAttribute('aria-labelledby', 'fdSheetH');
  document.body.appendChild(sheet);
  sheet.addEventListener('cancel', (e) => { e.preventDefault(); closeSheet(); });
  sheet.addEventListener('click', (e) => { if (e.target === sheet) closeSheet(); });     // the backdrop
  sheet.addEventListener('transitionend', (e) => { if (e.target.classList?.contains('fd-sheet-panel') && sheet.dataset.state === 'closing') finishClose(); });
  return sheet;
}
const overlay = () => { if (sheet && sheet.open) { animateClose(); return true; } return false; };
function openSheet(kind, from) {
  if (!state) return;
  window.FFOverlay = overlay;   // app.js: Back closes the sheet first
  const el = sheetEl();
  const { ctx, d, view } = state;
  const body = sheetBody(kind, ctx, d, view);
  if (!body) return;
  const L = words(ctx.lang), esc = ctx.esc;
  sheetFrom = from || null;
  el.innerHTML = `<div class="fd-sheet-panel"><div class="fd-grabber" aria-hidden="true"></div>
    <header class="fd-sheet-head"><h2 id="fdSheetH">${esc(body.title)}</h2><button class="fd-sheet-x" type="button" aria-label="${esc(L.sh.close)}">${icon('arrow')}</button></header>
    <div class="fd-sheet-body">${body.html}</div>
    ${body.href ? `<a class="btn navy fd-primary fd-sheet-go" id="fdSheetGo" href="${esc(body.href)}" data-nav>${esc(body.go)}</a>` : ''}</div>`;
  el.querySelector('.fd-sheet-x').addEventListener('click', () => closeSheet());
  el.querySelector('#fdSheetGo')?.addEventListener('click', () => {           // the global router follows the link; the sheet goes away
    if (history.state?.fdSheet) history.replaceState(null, '');
    finishClose(true);
  });
  for (const b of el.querySelectorAll('[data-w]')) b.style.setProperty('--w', `${b.dataset.w}%`);
  for (const b of el.querySelectorAll('[data-h]')) b.style.setProperty('--h', `${b.dataset.h}%`);
  bindSwipe(el);
  if (!el.open) { el.dataset.state = 'closed'; el.showModal(); history.pushState({ ...(history.state || {}), fdSheet: 1 }, ''); }
  document.documentElement.classList.add('fd-locked');
  requestAnimationFrame(() => requestAnimationFrame(() => { el.dataset.state = 'open'; }));
  ctx.live?.(body.title);
}
// every way of closing goes through the history entry, so Back and the X behave the same
function closeSheet() { if (history.state?.fdSheet) history.back(); else animateClose(); }
function animateClose() {
  if (!sheet || !sheet.open) return;
  const panel = sheet.querySelector('.fd-sheet-panel');
  if (panel) panel.style.removeProperty('transform');
  if (!motionOn()) return finishClose();
  sheet.dataset.state = 'closing';
  setTimeout(() => { if (sheet?.dataset.state === 'closing') finishClose(); }, 500);   // a transition that never ends still closes
}
function finishClose(navigating = false) {
  if (!sheet) return;
  sheet.dataset.state = 'closed';
  if (sheet.open) sheet.close();
  document.documentElement.classList.remove('fd-locked');
  if (!navigating) sheetFrom?.focus?.({ preventScroll: true });
}
// swipe down to dismiss (the grabber, the header, or the body when it is scrolled to the top); the panel follows the finger
function bindSwipe(el) {
  const panel = el.querySelector('.fd-sheet-panel');
  const scroller = el.querySelector('.fd-sheet-body');
  let y0 = null, t0 = 0, dy = 0;
  panel.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && !e.target.closest('.fd-grabber,.fd-sheet-head')) return;
    if (e.target.closest('a,button') || (scroller.contains(e.target) && scroller.scrollTop > 0)) return;
    y0 = e.clientY; t0 = performance.now(); dy = 0; panel.classList.add('fd-dragging');
  });
  panel.addEventListener('pointermove', (e) => { if (y0 == null) return; dy = Math.max(0, e.clientY - y0); panel.style.transform = `translate3d(0, ${dy}px, 0)`; });
  const end = () => {
    if (y0 == null) return;
    const v = dy / Math.max(1, performance.now() - t0);
    y0 = null; panel.classList.remove('fd-dragging');
    if (dy > 110 || v > 0.6) closeSheet(); else panel.style.removeProperty('transform');
  };
  panel.addEventListener('pointerup', end); panel.addEventListener('pointercancel', end);
}

// what each sheet shows (every figure from the same rows as its tile: derive, never restate)
function sheetBody(kind, ctx, d, view) {
  const { esc, lang } = ctx, L = words(lang), S = L.sh, slug = ctx.c.slug;
  const cur = (d.kids || []).find((k) => k.id === d.child) || {}, f = cur.first || '';
  const st = view.x?.stats || null, K = L.k;
  const amt = (a) => S.amount[a] || a || '';
  const share = (a) => (AMOUNT_WIDTH[a] ?? 0);
  const daysList = (days) => `<ol class="fd-sh-days">${days.map((x) => `<li class="${x.closed ? 'fd-s7-closed' : x.present ? 'fd-s7-here' : 'fd-s7-away'}"><span class="fd-sh-dot"></span>
    <b>${esc(cap(dayText(x.day, lang, { weekday: 'long', month: 'short', day: 'numeric' })))}</b><span class="small muted">${esc(x.closed ? S.closedDay : x.present ? [x.in ? `${S.in} ${x.in}` : '', x.out ? `${S.out} ${x.out}` : ''].filter(Boolean).join(' · ') || S.present : S.absent)}</span></li>`).join('')}</ol>`;
  switch (kind) {
    case 'kpiHere': case 'kpiMonth': {
      if (!st?.days) return null;
      const month = st.days.filter((x) => x.day >= String(st.month_start).slice(0, 10));
      const mname = dayText(d.date, lang, { month: 'long' });
      const a = attendanceKpi(st);
      return { title: kind === 'kpiHere' ? `${K.here}: ${f}` : `${K.month}: ${f}`, href: kind === 'kpiHere' ? dashLink(slug, 'day', { kid: d.child }) : dashLink(slug, 'child', { kid: d.child }),
        go: kind === 'kpiHere' ? S.goDay(f) : S.goRecord(f),
        html: `${kind === 'kpiMonth' && a ? `<div class="fd-sh-hero">${ring(a.pct ?? 0, 'booker')}<p><b>${a.present}/${a.school}</b> ${esc(L.kSub.days(a.present, a.school))}</p></div>` : ''}
          <h3>${esc(kind === 'kpiHere' ? S.last7 : S.month(mname))}</h3>${daysList([...(kind === 'kpiHere' ? st.days.slice(-7) : month)].reverse())}` };
    }
    case 'kpiAte': {
      const meals = st?.meals_today || [];
      const m = mealsKpi(st);
      const row = (label, a) => `<li><span>${esc(label)}</span><span class="fd-amt"><span class="fd-amt-bar" data-w="${share(a)}"></span></span><b>${esc(amt(a))}</b></li>`;
      return { title: `${K.ate}: ${f}`, href: dashLink(slug, 'day', { kid: d.child }), go: S.goDay(f),
        html: `${meals.length ? meals.map((x) => `<section class="fd-sh-meal"><h3>${esc(S.meals[x.meal] || cap(x.meal))}<span class="small muted"> · ${esc(x.time || '')}</span></h3>
          ${x.title ? `<p class="small muted" lang="en">${esc(x.title)}</p>` : ''}<ul class="fd-amts">${(x.items || []).length ? x.items.map((it) => row(it.name, it.amount)).join('') : row(S.plate, x.amount)}</ul>
          ${x.tried_new ? `<p class="chip ok">${esc(S.triedNew)}</p>` : ''}</section>`).join('') : `<p class="muted">${esc(S.noMeals)}</p>`}
          ${m ? `<h3>${esc(S.byDay)}</h3><div class="fd-k-zuri">${bars(m.series, lang, 'zuri')}</div>` : ''}` };
    }
    case 'kpiRest': {
      const r = restKpi(st); if (!r) return null;
      return { title: `${K.rest}: ${f}`, href: dashLink(slug, 'day', { kid: d.child }), go: S.goDay(f),
        html: `<div class="fd-k-lumi">${bars(r.series, lang, 'lumi', Math.max(120, ...r.series.map((x) => x.value || 0)))}</div>
          <ol class="fd-sh-list">${[...r.series].reverse().map((x) => `<li><b>${esc(cap(dayText(x.day, lang, { weekday: 'long' })))}</b><span>${esc(x.value == null ? L.nothingYet : minutesText(x.value, lang))}</span></li>`).join('')}</ol>` };
    }
    case 'kpiFeel': {
      const md = moodKpi(st, String(d.date).slice(0, 10));
      return { title: `${S.week}: ${f}`, href: dashLink(slug, 'day', { kid: d.child }), go: S.goDay(f),
        html: md.days.length ? `<ol class="fd-sh-feels">${[...md.days].reverse().map((x) => `<li><img src="img/friends/${esc(FEEL_ART[x.feeling] || 'lumi')}-480.webp" alt="" width="64" height="64" loading="lazy">
          <span><b>${esc((FEEL[lang] || FEEL.en)[x.feeling] || x.feeling)}</b><span class="small muted">${esc(cap(dayText(x.day, lang, { weekday: 'long', month: 'short', day: 'numeric' })))}</span></span></li>`).join('')}</ol>` : `<p class="muted">${esc(S.none)}</p>` };
    }
    case 'kpiSkills': {
      const sk = skillsKpi(st); if (!sk || !sk.total) return null;
      const lv = S.levels;
      return { title: `${K.skills}: ${f}`, href: dashLink(slug, 'report', { kid: d.child, id: sk.report }), go: S.goReport,
        html: `<p class="small muted">${esc(L.kSub.fromReport(dayText(sk.to, lang)))}</p><h3>${esc(S.byArea)}</h3>${domainChart(esc, lang, sk.domains)}
          <p class="fd-legend"><span class="fd-st-s"></span>${esc(lv.secure)} <span class="fd-st-d"></span>${esc(lv.developing)} <span class="fd-st-e"></span>${esc(lv.emerging)}</p>
          <p class="mini muted">${esc(L.reportOnly)}</p>` };
    }
    case 'kpiStory': {
      const lt = st?.learning_time || {};
      return { title: `${K.story}: ${f}`, href: dashLink(slug, 'day', { kid: d.child }), go: S.goDay(f),
        html: `<h3>${esc(S.storyToday)}</h3>${(st?.story_titles || []).length ? `<ul class="fd-sh-list">${st.story_titles.map((t) => `<li><span>${esc(t)}</span></li>`).join('')}</ul>` : `<p class="muted">${esc(S.none)}</p>`}
          <h3>${esc(S.kidMode)}</h3><ul class="fd-sh-list"><li><b>${esc(S.home)}</b><span>${esc(minutesText(Math.round((lt.home_sec || 0) / 60), lang))}</span></li><li><b>${esc(S.center)}</b><span>${esc(minutesText(Math.round((lt.center_sec || 0) / 60), lang))}</span></li></ul>` };
    }
    case 'kpiNext': {
      const strip = calendarStrip({ calendar: view.x?.calendar || [] }).slice(0, 6);
      const first = strip[0];
      return { title: S.nextDays, href: first ? dashLink(slug, 'calendar', { date: first.day }) : dashLink(slug, 'calendar', {}), go: S.goCal,
        html: strip.length ? `<ol class="fd-sh-list">${strip.map((x) => `<li><b>${esc(x.to !== x.day ? L.range(dayText(x.day, lang), dayText(x.to, lang)) : dayText(x.day, lang))}</b><span>${esc(lang === 'es' ? (x.label_es || x.label) : x.label)} · ${esc(x.status === 'closed' ? L.closed : L.early)}</span></li>`).join('')}</ol>` : `<p class="muted">${esc(L.kSub.noneSoon)}</p>` };
    }
    case 'kpiTuition': {
      const tu = d.upcoming?.tuition;
      if (!tu) return { title: K.tuition, href: `/c/${encodeURIComponent(slug)}/billing-family`, go: S.goBilling, html: `<p class="muted">${esc(L.kSub.nothingDue)}</p>` };
      return { title: K.tuition, href: dashLink(slug, 'billing', { id: tu.invoice_id }), go: S.goInvoice,
        html: `<div class="fd-sh-hero"><span class="fd-money fd-money-lg">${esc(money(tu.due_cents, lang))}</span></div><ul class="fd-sh-list"><li><b>${esc(S.invoice(tu.invoice_no || ''))}</b><span>${esc(S.status[tu.status] || tu.status)}</span></li>
          <li><b>${esc(L.kSub.due(dayText(tu.due_date, lang)))}</b></li></ul>` };
    }
    default: return null;   // the others open their page straight away (messages, work, home learning)
  }
}
const AMOUNT_WIDTH = { none: 2, a_little: 25, about_half: 50, most: 75, all: 100 };
