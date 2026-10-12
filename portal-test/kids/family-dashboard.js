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
import { balanceModel, glowBarHtml, glowRingSvg, clockMinutes, clockSummary, clockSvg, clockTable, dayClockModel, flowerModel, flowerSvg, gardenModel, gardenSvg, localMinutes, minutesClock,
  monthModel, moonModel, moonSvg, pieSvg, plateModel, plateSvg, ringSvg, skyModel, tableHtml, vw, weekPlatesModel } from './family-viz.js';
import { MORE_VIEWS, PHONE_BAR, VIEWS, arrowIndex, neighbour, readState, stateSearch, stepDay, sw, viewOf } from './family-shell.js';

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
  heart: '<path d="M12 20.5s-7.5-4.5-9.4-9C1.2 8.1 3.3 4.5 6.8 4.5c2.1 0 3.6 1.2 4.3 2.6h1.8c.7-1.4 2.2-2.6 4.3-2.6 3.5 0 5.6 3.6 4.2 7-1.9 4.5-9.4 9-9.4 9zM8 12h2.5l1.5-3 2 5 1.5-2H17"/>',
  grid: '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>',
  clock: '<path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  shield: '<path d="M12 3l7 3v6c0 4.4-3 7.7-7 9-4-1.3-7-4.6-7-9V6z"/>',
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
    // v2 (the one-screen command centre)
    v2: { next: "What's next", pickupUsual: (t) => `Pickup is usually about ${t}`, pickedUpAt: (t) => `Picked up at ${t}`, pickupToday: 'Pickup', nextEvent: 'Next on the calendar',
      bringTomorrow: (d) => `${d}, please bring`, nothingNext: 'Nothing else planned for the next weeks.', ticker: 'Latest', clockH: (f) => `${f}'s day clock`,
      clockKey: { meal: 'Meals', nap: 'Rest', activity: 'Activities', other: 'Potty, drinks and feelings', incident: 'Incident report' },
      plates: 'Today on the plate', weekPlates: 'The week on the plate', moon: 'Rest', sky: 'Feelings this week', skills: 'Skills', garden: 'The home garden', month: 'Attendance', reportsAll: 'All progress reports',
      noSkills: 'Skills appear here once a progress report is released.', loading: 'Loading…',
      health: { title: 'Health', plans: 'Health plans', meds: 'Medicines at the center', alerts: 'Care alerts', imm: 'Immunization records', due: 'Due or missing', none: 'None on file',
        open: 'Open the health record', ok: 'Up to date' },
      privacy: { title: 'Consents', photos: 'Photos of your child', friends: 'Videos and messages from the friends', yes: 'You said yes', no: 'Not given', waiting: 'Needs you again', open: 'Review consents' },
      kidTitle: 'Kid Mode', kidOpen: 'Open Kid Mode on this device',
      billing: { title: 'Balance', paidOf: (p, t) => `${p} paid of ${t}`, nextDue: (a, d) => `Next: ${a} due ${d}`, none: 'No invoices yet.', all: 'Billing and statements', due: 'Due', paid: 'Paid' },
      entry: (k, t) => `${k} at ${t}`, incidentH: 'Incident report', dayH: (d) => d, plateH: (d) => `The plate on ${d}`, feelH: (d) => `Feeling on ${d}`, areaH: (a) => a,
      shareOf: (p) => `${p}% of the plate`, attendanceNone: 'No attendance yet this month.', updatedLive: 'New', more: 'More', moreNums: 'More numbers', moreNumsH: (f) => `More about ${f}`, viewAll: 'View all', checkedPill: (t) => `Checked in at ${t}`, pickedPill: (t) => `Picked up at ${t}`,
      notInPill: 'Not checked in yet', clockOpen: 'Open the day clock', learnTogether: 'Learning together', atHome: 'At home', activities: 'activities', reportNone: 'No progress report yet', reportNew: 'Progress report', reportOpen: 'Read it',
      tuitionNone: 'Nothing due', dates: 'Tuition and dates', bringNote: (d) => `${d}, please bring`, demo: 'Demo preview', showHide: 'Show or hide this card', kidsCorner: "Kids' corner", prevDay: 'The day before', nextDay: 'The next day', backToday: 'Back to today', logged: (t) => `Logged at ${t}`, loggedRange: (a, b) => `${a} to ${b}`, teacherObs: 'teacher observation', asOf: 'so far this month', kAttendance: 'Attendance', kMeals: 'Meals today', schoolDays: 'school days this month', portion: 'reported portion eaten', today: 'Today', usual: 'Usual',
      observed: 'latest teacher observation', learnHome: 'Learning & home', homeActs: 'home activities this week', kidMode: 'Kid Mode', choose: 'Choose an activity', viewCal: 'View calendar',
      viewWhole: 'View whole day', attention: 'Needs your attention',
      short: { incident: () => 'incident report', video: (fr) => `${fr} video`, charmsg: (fr) => `message from ${fr}`, consent: () => 'consent to review', help: () => 'your question was answered',
        chat: () => 'new messages', announcement: () => 'announcement', report: () => 'progress report' },
      act: { readAck: 'Read & acknowledge', review: 'Review', reviewFirst: 'Review first', read: 'Read', readAnswer: 'Read the answer', open: 'Open' },
      pillar: { learn: 'LEARN', belong: 'BELONG', explore: 'EXPLORE', move: 'MOVE', bookerSub: 'This week\'s learning', lumiSub: 'Messages and the class', zuriSub: 'New work and discoveries', bopSub: 'Kid Mode' } },
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
    v2: { next: 'Lo que sigue', pickupUsual: (t) => `Suelen recogerlo hacia las ${t}`, pickedUpAt: (t) => `Lo recogieron a las ${t}`, pickupToday: 'Hora de recoger', nextEvent: 'Lo próximo en el calendario',
      bringTomorrow: (d) => `${d}, por favor traiga`, nothingNext: 'No hay nada más planeado para las próximas semanas.', ticker: 'Lo último', clockH: (f) => `El reloj del día de ${f}`,
      clockKey: { meal: 'Comidas', nap: 'Descanso', activity: 'Actividades', other: 'Baño, bebidas y emociones', incident: 'Reporte de incidente' },
      plates: 'Hoy en el plato', weekPlates: 'La semana en el plato', moon: 'Descanso', sky: 'Cómo se sintió esta semana', skills: 'Habilidades', garden: 'El jardín de casa', month: 'Asistencia', reportsAll: 'Todos los informes de progreso',
      noSkills: 'Las habilidades aparecen aquí cuando se publica un informe de progreso.', loading: 'Cargando…',
      health: { title: 'Salud', plans: 'Planes de salud', meds: 'Medicinas en el centro', alerts: 'Alertas de cuidado', imm: 'Registros de vacunas', due: 'Pendiente o falta', none: 'Nada registrado',
        open: 'Abrir el registro de salud', ok: 'Al día' },
      privacy: { title: 'Consentimientos', photos: 'Fotos de su hijo o hija', friends: 'Videos y mensajes de los amigos', yes: 'Usted dijo que sí', no: 'Sin dar', waiting: 'Lo necesitan de nuevo', open: 'Revisar los consentimientos' },
      kidTitle: 'Modo Niños', kidOpen: 'Abrir el Modo Niños en este aparato',
      billing: { title: 'Saldo', paidOf: (p, t) => `${p} pagado de ${t}`, nextDue: (a, d) => `Siguiente: ${a} vence el ${d}`, none: 'Todavía no hay facturas.', all: 'Pagos y estados de cuenta', due: 'Pendiente', paid: 'Pagado' },
      entry: (k, t) => `${k} a las ${t}`, incidentH: 'Reporte de incidente', dayH: (d) => d, plateH: (d) => `El plato del ${d}`, feelH: (d) => `Cómo se sintió el ${d}`, areaH: (a) => a,
      shareOf: (p) => `${p}% del plato`, attendanceNone: 'Todavía no hay asistencia este mes.', updatedLive: 'Nuevo', more: 'Más', moreNums: 'Más números', moreNumsH: (f) => `Más sobre ${f}`, viewAll: 'Ver todo', checkedPill: (t) => `Llegó a las ${t}`, pickedPill: (t) => `Lo recogieron a las ${t}`,
      notInPill: 'Todavía no registra llegada', clockOpen: 'Abrir el reloj del día', learnTogether: 'Aprender juntos', atHome: 'En casa', activities: 'actividades', reportNone: 'Todavía no hay informe de progreso', reportNew: 'Informe de progreso', reportOpen: 'Leerlo',
      tuitionNone: 'Nada pendiente', dates: 'Colegiatura y fechas', bringNote: (d) => `${d}, por favor traiga`, demo: 'Vista de demostración', showHide: 'Mostrar u ocultar esta tarjeta', kidsCorner: 'Rincón de los niños', prevDay: 'El día anterior', nextDay: 'El día siguiente', backToday: 'Volver a hoy', logged: (t) => `Registrado a las ${t}`, loggedRange: (a, b) => `de ${a} a ${b}`, teacherObs: 'observación de la maestra', asOf: 'en lo que va del mes', kAttendance: 'Asistencia', kMeals: 'Comidas de hoy', schoolDays: 'días de clase este mes', portion: 'de la porción, según lo registrado', today: 'Hoy', usual: 'Normal',
      observed: 'lo último que observó la maestra', learnHome: 'Aprendizaje y casa', homeActs: 'actividades para casa esta semana', kidMode: 'Modo Niños', choose: 'Elegir una actividad', viewCal: 'Ver el calendario',
      viewWhole: 'Ver todo el día', attention: 'Necesita su atención',
      short: { incident: () => 'reporte de incidente', video: (fr) => `video de ${fr}`, charmsg: (fr) => `mensaje de ${fr}`, consent: () => 'consentimiento por revisar', help: () => 'respondieron su pregunta',
        chat: () => 'mensajes nuevos', announcement: () => 'anuncio', report: () => 'informe de progreso' },
      act: { readAck: 'Leer y confirmar', review: 'Revisar', reviewFirst: 'Revisar primero', read: 'Leer', readAnswer: 'Leer la respuesta', open: 'Abrir' },
      pillar: { learn: 'APRENDER', belong: 'PERTENECER', explore: 'EXPLORAR', move: 'MOVERSE', bookerSub: 'El aprendizaje de la semana', lumiSub: 'Mensajes y la clase', zuriSub: 'Trabajos y descubrimientos', bopSub: 'Modo Niños' } },
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
    case 'kid': return `${base}/kids${q({ kid: a.kid })}`;                             // the Kids' corner for that child (kids-corner.js, hub/KIDS_CORNER.md)
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
// v2 (hub/FAMILY_DASHBOARD.md "Dashboard v2"): one screen. The rail swaps whole views, the tabs swap panels, the drawer (#fdSheet)
// slides over for detail. A view is built the first time it is shown (only the visible view is rendered and animated); the address
// carries ?view= &tab= &drawer= so Back, a reload and a shared link restore exactly.
let loads = 0;   // a newer view (another child, another page) wins over a slower, older load
let state = null;   // what is on screen now: { ctx, d, view, ui: { view, tab, drawer }, built: Set, billing, health, path, prev }
export async function viewFamilyDashboard(ctx) {
  const mine = ++loads;
  const { c, shell, page, rpc, lang } = ctx;
  const L = words(lang);
  const key = `ff-dash-kid:${c.center_id}`;
  const want = new URLSearchParams(location.search).get('kid');
  let kept = null; try { kept = localStorage.getItem(key); } catch (_) { /* private mode */ }
  applyMotion();
  document.body.classList.add('fp-fam');
  const tz = c.time_zone || centerTz();
  const part = dayPart(new Date(), tz);
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
  const view = { part, name: firstName(sess?.user?.user_metadata?.full_name), x, tz };
  state = { ctx, d, view, ui: readState(location.search), built: new Set(), billing: null, health: null, path: FFTest.pathname(), mine, key, load, loadExtras };
  if (state.ui.date && state.ui.date < String(d.date).slice(0, 10)) await loadDay(state.ui.date); else state.ui.date = null;
  if (mine !== loads || !state) return;
  render(ctx, d, view);

  // live: the numbers, the ticker, what is waiting and the clock update while the page is open and visible (every 60 s)
  let sig = JSON.stringify([d, x]);
  const refresh = async () => {
    const root = document.getElementById('familyDash');
    if (!root || mine !== loads || !state || root.dataset.child !== (state.d.child || '')) return false;
    const kid = state.d.child;
    let n, nx; try { [n, nx] = await Promise.all([load(kid), loadExtras(kid)]); } catch (_) { return true; }
    if (!state || state.d.child !== kid) return true;
    const s2 = JSON.stringify([n, nx]);
    if (s2 === sig || !document.getElementById('familyDash')) { paintClockHand(); return true; }
    sig = s2;
    liveUpdate(n, nx);
    return true;
  };
  state.refresh = refresh;
  const timer = setInterval(async () => {
    if (document.visibilityState !== 'visible') return;
    if (!(await refresh())) clearInterval(timer);
  }, 60000);
  // "Updated n min ago" stays true between refreshes
  const tick = setInterval(() => {
    const el = document.getElementById('fdUpdated');
    if (!el || mine !== loads || !state) { clearInterval(tick); return; }
    el.textContent = agoText(state.d.today?.updated_at, lang);
  }, 30000);
  bindPull(ctx, refresh);
}

function hostClass() { document.getElementById('centerSpace')?.classList.add('fd-host', 'fd2-host'); }

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
  const L = words(lang), S2 = sw(lang);
  const slug = c.slug;
  const kids = d.kids || [];
  const cur = kids.find((k) => k.id === d.child);
  if (!cur) {
    swap(ctx, `<div class="fd fd-plain" id="familyDash" data-child=""><section class="fd-welcome" id="familyWelcome"><p class="fd-date">${esc(dateLong(d.date, lang))}</p><h2>${esc(greeting(view.part, view.name, lang))}</h2></section>
      <div class="card"><p class="empty">${esc(L.noKids)}</p></div>${moreHtml(esc, L, slug, [], null)}</div>`);
    return bindMore(ctx);
  }
  const errs = (d.errors || []).length || (view.x?.errors || []).length ? `<p class="msg warn fd-err" role="status">${esc(L.couldNot)}</p>` : '';
  const ui = state.ui;
  swap(ctx, `<div class="fd fd2 fd-anim" id="familyDash" data-child="${esc(cur.id)}" data-part="${esc(view.part)}" data-view="${esc(ui.view)}">
    <div class="fd-depth" aria-hidden="true"><span class="fd-plane fd-plane-a" data-rate="0.10"></span><span class="fd-plane fd-plane-b" data-rate="-0.06"></span>
      <img class="fd-plane fd-plane-cloud fd2-drift" data-rate="0.18" src="img/scene/felt-cloud-4-480.webp" alt=""><img class="fd-plane fd-plane-cloud2 fd2-drift" data-rate="0.26" src="img/scene/felt-cloud-2-480.webp" alt=""></div>
    ${railHtml(esc, L, slug, cur, d, ui)}
    <div class="fd2-stage" id="fdStage">
      <header class="fd2-bar" id="fdBar">
        <h2 class="fd2-title" id="fdViewTitle">${esc(S2.views[ui.view])}</h2>
        ${kidsHtml(esc, L, slug, kids, cur)}
        <div class="fd2-tabs" id="fdTabs" role="tablist" aria-label="${esc(S2.sub(S2.views[ui.view]))}">${tabsHtml(esc, S2, ui)}</div>
      </header>
      ${errs}
      <div class="fd2-views" id="fdViews">${VIEWS.map((v) => `<section class="fd2-view" id="fdv-${v.id}" data-view="${v.id}" role="tabpanel" aria-labelledby="fdvt-${v.id}" tabindex="-1"${v.id === ui.view ? '' : ' hidden'}></section>`).join('')}</div>
    </div>
    ${tabbarHtml(esc, S2, ui)}
    <div class="fd2-tip" id="fdTip" role="tooltip" hidden></div>
  </div>`);
  state.built = new Set();
  buildView(ui.view, true);
  bindShell(ctx);
  bindMotion(ctx);
  if (ui.drawer) openSheet(ui.drawer, null, { fromUrl: true });
}

// ---- the rail (desktop and tablet): the views, then the quick actions; phones: the quick actions as a row on Today ---------------
function railHtml(esc, L, slug, cur, d, ui) {
  const S2 = sw(L === W.es ? 'es' : 'en');
  const a = (id, href, ic, label, short, cls = '') => `<a class="fd-action ${cls}" id="${id}" href="${esc(href)}" data-nav><span class="fd-ico">${icon(ic)}</span><span class="fd-a-long">${esc(label)}</span><span class="fd-a-short">${esc(short)}</span></a>`;
  const waiting = (d.attention || []).length;
  return `<aside class="fd-rail fd2-rail" aria-label="${esc(S2.nav)}">
    <nav class="fd2-railnav" aria-label="${esc(S2.nav)}"><div class="fd2-viewtabs" id="fdViewTabs" role="tablist" aria-orientation="vertical" aria-label="${esc(S2.nav)}">
      <span class="fd2-pill" id="fdPill" aria-hidden="true"></span>
      ${VIEWS.map((v) => `<a class="fd2-vt" role="tab" id="fdvt-${v.id}" href="${esc(viewHref(v.id))}" data-view="${v.id}" aria-controls="fdv-${v.id}" aria-selected="${v.id === ui.view}" tabindex="${v.id === ui.view ? 0 : -1}">
        ${icon(v.icon)}<span>${esc(S2.views[v.id])}</span>${v.id === 'messages' && waiting ? `<span class="fd2-badge" aria-label="${esc(L.attentionN(waiting))}">${waiting}</span>` : ''}</a>`).join('')}
    </div></nav>
    <nav class="fd-actions" id="fdActions" aria-label="${esc(L.actions)}">
      ${a('qaMessage', dashLink(slug, 'thread', { kid: cur.id }), 'chat', L.qaMessage, L.short.message)}
      ${a('qaAbsence', dashLink(slug, 'absence', { kid: cur.id }), 'calendar', L.qaAbsence, L.short.absence)}
      ${a('qaShare', dashLink(slug, 'share', { kid: cur.id }), 'share', L.qaShare, L.short.share)}
      ${a('openKidMode', dashLink(slug, 'kid', { kid: cur.id }), 'kid', L.qaKid, L.short.kid, 'fd-action-gold')}
      ${a('fdKidsCorner', `/c/${encodeURIComponent(slug)}/kids?kid=${encodeURIComponent(cur.id)}`, 'star', L.v2.kidsCorner, L.v2.kidsCorner)}
      ${a('familyHelpLink', dashLink(slug, 'help'), 'help', L.qaHelp, L.short.help)}</nav>
  </aside>`;
}
const viewHref = (view, tab = null) => `${FFTest.pathname()}${stateSearch(location.search, { view, tab })}`;
function tabsHtml(esc, S2, ui) {
  const v = viewOf(ui.view);
  return v.tabs.map((t) => `<a class="fd2-tab" role="tab" id="fdtab-${t}" href="${esc(viewHref(v.id, t))}" data-tab="${t}" aria-controls="fdp-${v.id}-${t}" aria-selected="${t === ui.tab}" tabindex="${t === ui.tab ? 0 : -1}">${esc(S2.tabs[t])}</a>`).join('');
}
function tabbarHtml(esc, S2, ui) {
  const inMore = MORE_VIEWS.includes(ui.view);
  return `<nav class="fd2-tabbar" id="fdTabbar" aria-label="${esc(S2.nav)}">${PHONE_BAR.map((id) => `<a class="fd2-tb" href="${esc(viewHref(id))}" data-view="${id}"${id === ui.view ? ' aria-current="page"' : ''}>${icon(viewOf(id).icon)}<span>${esc(S2.short[id])}</span></a>`).join('')}
    <button class="fd2-tb" type="button" id="fdMoreBtn" aria-haspopup="dialog"${inMore ? ' aria-current="page"' : ''}>${icon('grid')}<span>${esc(S2.short.more)}</span></button></nav>`;
}
function kidsHtml(esc, L, slug, kids, cur, id = 'fdKidsBar') {
  if (kids.length < 2) return '';
  return `<nav class="fd-kids" id="${id}" aria-label="${esc(L.kids)}">${kids.map((k) => `<a class="fd-kid" href="/c/${esc(slug)}/home?kid=${encodeURIComponent(k.id)}" data-kid="${esc(k.id)}"${k.id === cur.id ? ' aria-current="page"' : ''}>
    ${avatarHtml(esc, k.guide, 'fd-av')}<span class="fd-kid-text"><b>${esc(k.first)}</b><span>${esc(k.room_name || '')}</span></span></a>`).join('')}</nav>`;
}

// ---- hero: the greeting in the day's light, the live line, the child's friend on the grass (compact on v2) -----------------------
function liveHtml(esc, L, d) {
  const cur = (d.kids || []).find((k) => k.id === d.child) || {};
  const s = liveState(d.today);
  const f = cur.first || '';
  const text = s.left ? L.pickedUp(f, s.left) : s.arrived ? `${L.checkedIn(f, s.arrived)}${s.resting ? ` · ${L.restingNow}` : s.last ? ` · ${L.lastUpdate(cap(s.last.words), s.last.time)}` : ''}` : L.notInYet(f);
  return `<p class="fd-live fd-live-${s.left ? 'done' : s.arrived ? 'here' : 'none'}" id="fdLive"><span class="fd-pulse" aria-hidden="true"></span><span>${esc(text)}</span></p>`;
}
// ---- a figure: the graphic, a visually hidden summary, and "Show as table" (the text equivalent) --------------------------------
function figureHtml(esc, lang, id, art, summary, table, cls = '') {
  const V = vw(lang);
  return `<figure class="fv ${cls}" id="${id}" data-a><div class="fv-art">${art}</div>
    <figcaption class="sr-only" id="${id}Sum">${esc(summary)}</figcaption>
    ${table ? `<button class="fv-tgl" type="button" aria-expanded="false" aria-controls="${id}Tbl" data-on="${esc(V.hideTable)}" data-off="${esc(V.showTable)}">${esc(V.showTable)}</button>
    <div class="fv-tblwrap" id="${id}Tbl" hidden>${tableHtml(esc, table)}</div>` : ''}</figure>`;
}

// ---- a past day of the care records (?date=, kept three years): family_child_today for that date; the numbers of that day from
// the same rows (the 7-school-day series), never estimated. Today has no "next" arrow.
async function loadDay(date) {
  if (!state) return;
  if (!date) { state.dayToday = null; return; }
  try { state.dayToday = await state.ctx.rpc('family_child_today', { p_center: state.ctx.c.center_id, p_kid: state.d.child, p_date: date, p_lang: state.ctx.lang }); state.dayFor = `${state.d.child}|${date}`; }
  catch (_) { state.dayToday = null; state.ui.date = null; }
}
function dayEff() {
  const { d, view, ui } = state;
  if (!ui.date || !state.dayToday || state.dayFor !== `${d.child}|${ui.date}`) return { d, view };
  const st = view.x?.stats;
  const upTo = (rows) => (rows || []).filter((r) => String(r.day).slice(0, 10) <= ui.date);
  const pick = (rows) => { const r = upTo(rows); return r.length && String(r[r.length - 1].day).slice(0, 10) === ui.date ? r : [...r, { day: ui.date, share: null, min: null }]; };
  const stats = st ? { ...st, meals: pick(st.meals), rest: pick(st.rest), moods: upTo(st.moods), meals_today: [] } : st;
  return { d: { ...d, date: ui.date, today: state.dayToday }, view: { ...view, x: { ...view.x, stats }, past: true } };
}
async function changeDay(dir) {
  if (!state) return;
  const today = String(state.d.date).slice(0, 10), cur = state.ui.date || today;
  const next = stepDay(cur, dir, today);
  if (!next) return;
  state.ui.date = next >= today ? null : next;
  writeUrl('push');
  document.getElementById('familyDash')?.classList.add('fd2-switching');
  await loadDay(state.ui.date);
  rebuildDay();
}
function rebuildDay() {
  document.getElementById('familyDash')?.classList.remove('fd2-switching');
  for (const v of ['overview', 'today']) state.built.delete(v);
  if (['overview', 'today'].includes(state.ui.view)) buildView(state.ui.view);
  state.ctx.live?.(cap(dateLong(state.ui.date || state.d.date, state.ctx.lang)));
}

// ---- the views ------------------------------------------------------------------------------------------------------------
// Each view is a set of panels (one per tab). Built on first show, rebuilt when the child changes.
function viewPanels(id) {
  const { ctx } = state;
  const eff = id === 'overview' || id === 'today' ? dayEff() : { d: state.d, view: state.view };
  const { d, view } = eff;
  const { esc, lang, c } = ctx, L = words(lang), slug = c.slug, x = view.x || {};
  const cur = (d.kids || []).find((k) => k.id === d.child) || {};
  const panel = (tab, html) => `<div class="fd2-panel" id="fdp-${id}-${tab}" data-tab="${tab}" role="tabpanel" aria-labelledby="fdtab-${tab}"${tab === state.ui.tab ? '' : ' hidden'}>${html}</div>`;
  switch (id) {
    case 'overview': return `<div class="fd2-cockpit">
        ${heroHtml(esc, L, lang, slug, d, cur, view)}
        <div class="fd2-attnwrap">${attentionBandHtml(esc, L, lang, slug, d, x)}</div>
        ${bigKpisHtml(esc, L, lang, slug, d, view)}
        ${todayHtml(esc, L, lang, slug, d, true)}
        ${learnHomeHtml(esc, L, lang, slug, d, x, cur)}
        ${nextHtml(esc, L, lang, slug, d, x)}
        ${pillarsHtml(esc, L, slug)}
      </div>`;
    case 'today': return panel('day', `<div class="fd2-two">${dayListHtml(esc, L, lang, slug, d)}<section class="card fd-card fd2-clockcard" id="fdClockCard" aria-labelledby="fdClockCardH"><h2 id="fdClockCardH">${icon('clock')} ${esc(L.v2.clockH(cur.first || ''))}</h2>${clockFigHtml(320, 'fdClockFigDay')}${clockKeyHtml(esc, L, clockModelNow())}</section></div>`)
      + panel('clock', `<section class="card fd-card fd2-clockcard fd2-clockbig" aria-labelledby="fdClockBigH"><h2 id="fdClockBigH">${icon('clock')} ${esc(L.v2.clockH(cur.first || ''))}</h2>${clockFigHtml(420, 'fdClockFigBig')}${clockKeyHtml(esc, L, clockModelNow())}</section>`)
      + panel('photos', photosHtml(esc, L, lang, d, cur, x));
    case 'learning': return panel('week', weekHtml(esc, L, lang, slug, d, cur) + '<section class="card fd-card ki-card" id="kiParent" aria-live="polite"></section>') + panel('skills', skillsHtml(esc, L, lang, slug, d, x, cur))
      + panel('portfolio', portfolioHtml(esc, L, lang, slug, d, cur)) + panel('reports', reportHtml(esc, L, lang, slug, d, cur));
    case 'care': return panel('meals', mealsViewHtml(esc, L, lang, slug, d, x)) + panel('rest', restViewHtml(esc, L, lang, d, x)) + panel('feelings', feelViewHtml(esc, L, lang, d, x))
      + panel('health', `<section class="card fd-card fd2-health" id="fdHealth" aria-labelledby="fdHealthH"><h2 id="fdHealthH">${icon('heart')} ${esc(L.v2.health.title)}</h2><p class="small muted fd2-loading">${esc(L.v2.loading)}</p></section>`);
    case 'messages': return panel('teachers', messagesHtml(esc, L, lang, slug, d)) + panel('waiting', attentionHtml(esc, L, lang, slug, d, true)) + panel('friends', friendsHtml(esc, L, lang, slug, d, cur) || `<section class="card fd-card" id="fdFriends"><h2>${esc(L.friends)}</h2><p class="small muted">${esc(L.couldNot)}</p></section>`);
    case 'calendar': return panel('next', upcomingHtml(esc, L, lang, slug, d, x) || `<section class="card fd-card" id="fdUpcoming"><h2>${icon('calendar')} ${esc(L.upcoming)}</h2><p class="small muted">${esc(L.noClosures)}</p></section>`)
      + panel('attendance', monthHtml(esc, L, lang, d, x)) + panel('bring', `<div class="fd2-two">${bringHtml(esc, L, lang, cur, x)}${menuHtml(esc, L, lang, d, x) || ''}</div>`);
    case 'billing': return panel('balance', `<section class="card fd-card fd2-bill" id="fdBalance" aria-labelledby="fdBalH"><h2 id="fdBalH">${icon('tuition')} ${esc(L.v2.billing.title)}</h2><p class="small muted fd2-loading">${esc(L.v2.loading)}</p></section>`)
      + panel('history', `<section class="card fd-card fd2-bill" id="fdPayments" aria-labelledby="fdPayH"><h2 id="fdPayH">${icon('report')} ${esc(vw(lang).timeline)}</h2><p class="small muted fd2-loading">${esc(L.v2.loading)}</p></section>`);
    case 'family': return panel('pickup', pickupHtml(esc, L, slug, cur, x))
      + panel('kid', `<div class="fd2-two"><section class="card fd-card fd2-kidcard" aria-labelledby="fdKidH"><h2 id="fdKidH">${icon('kid')} ${esc(L.v2.kidTitle)}</h2>
          <img class="fd2-kidart" src="img/scene/cut-${esc(guideFriend(cur.guide) || 'bop')}-440.webp" alt="" width="120" height="150" loading="lazy">
          <a class="btn gold fd-primary" id="fdKidOpen" href="${esc(dashLink(slug, 'kid', { kid: cur.id }))}" data-nav>${esc(L.v2.kidOpen)}</a></section>
          <section class="card fd-card" id="kidDevices" aria-labelledby="kdvH"></section></div>`)
      + panel('privacy', privacyHtml(esc, L, slug, d, cur)) + panel('settings', moreHtml(esc, L, slug, d.kids || [], cur));
    default: return '';
  }
}
// build (or rebuild) a view's panels into its section, then everything that view needs once it is in the page
function buildView(id, first = false) {
  const sec = document.getElementById(`fdv-${id}`);
  if (!sec || !state) return;
  sec.innerHTML = viewPanels(id);
  state.built.add(id);
  const { ctx, d } = state;
  for (const b of sec.querySelectorAll('[data-h]')) b.style.setProperty('--h', `${b.dataset.h}%`);
  for (const b of sec.querySelectorAll('[data-w]')) b.style.setProperty('--w', `${b.dataset.w}%`);
  if (id === 'overview') mountFamilyConferenceCard({ c: ctx.c, rpc: ctx.rpc, esc: ctx.esc, lang: ctx.lang, kid: d.child }).catch(() => {});   // conference times (checkpoints.js)
  if (id === 'today') signPhotos(ctx);
  if (id === 'care') loadHealth();
  if (id === 'learning') {
    signPhotos(ctx);
    // "Learning at home" from the Kids' corner (kids-insights.js, hub/KIDS_CORNER.md): time by watch / read / play, favourites, skills, try next
    import('./kids-insights.js').then((m) => m.mountParentInsights(document.getElementById('kiParent'), { c: ctx.c, rpc: ctx.rpc, esc: ctx.esc, lang: ctx.lang, kid: d.child,
      first: ((d.kids || []).find((k) => k.id === d.child) || {}).first || '' })).catch(() => { document.getElementById('kiParent')?.remove(); });
  }
  if (id === 'billing') loadBilling();
  if (id === 'family') {
    bindMore(ctx);
    const cur = (d.kids || []).find((k) => k.id === d.child) || {};
    // Kid Mode on the child's own device (N14, kid-devices-ui.js): pair / list / remove; the "new device paired" notification lands here
    import('./kid-devices-ui.js').then((m) => m.mountFamilyDevices(document.getElementById('kidDevices'),
      { c: ctx.c, rpc: ctx.rpc, esc: ctx.esc, lang: ctx.lang, live: ctx.live, friendly: ctx.friendly, kids: (d.kids || []).map((k) => ({ id: k.id, first: k.first })), current: cur.id }))
      .catch(() => { document.getElementById('kidDevices')?.remove(); });
  }
  if (!first || motionOn()) entrance(sec);
  else settle(sec);
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
function kpiHtml(esc, L, lang, slug, d, view, which = 'big') {
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
  // v2 (the owner's mockup): four big tiles on Today; the other eight in the "More numbers" drawer (and in their views)
  const byId = new Map(out.map((h) => [/id="(kpi\w+)"/.exec(h)[1], h]));
  if (which === 'more') return `<div class="fd-kpi-grid fd2-morenums" id="fdMoreNums">${KPI_MORE.map((id) => byId.get(id)).join('')}</div>`;
  return `<section class="fd-kpis fd2-kpis" id="fdKpis" aria-labelledby="fdKpiH" data-a><h2 id="fdKpiH" class="fd-sec-h">${esc(L.glance(cur.first || ''))}</h2><div class="fd-kpi-grid">${KPI_BIG.map((id) => byId.get(id)).join('')}
    <button class="fd2-morebtn" type="button" id="fdMoreNumsBtn" data-drawer="numbers" aria-haspopup="dialog">${icon('grid')}<span>${esc(L.v2.moreNums)}</span></button></div></section>`;
}

const KPI_BIG = ['kpiMonth', 'kpiAte', 'kpiRest', 'kpiFeel'];
const KPI_MORE = ['kpiHere', 'kpiSkills', 'kpiHome', 'kpiStory', 'kpiWork', 'kpiMsgs', 'kpiNext', 'kpiTuition'];

// ---- today: the live timeline ------------------------------------------------------------------------------------------------
function todayHtml(esc, L, lang, slug, d, ticker = true) {
  void ticker;   // Overview's day card; the whole day is the Today view (dayListHtml)
  const cur = (d.kids || []).find((k) => k.id === d.child) || {};
  const t = d.today || {};
  const att = attendanceText(t.attendance, lang);
  const tl = [...(t.timeline || [])].reverse();          // newest first
  const shown = tl.slice(0, 4);
  const meals = state?.view?.x?.stats?.meals_today || [];
  const S = L.sh;
  const itemsOf = (e) => { if (e.kind !== 'meal') return ''; const m = meals.find((x) => x.time === e.time); if (!m || !(m.items || []).length) return '';
    return `<span class="fd2-entry-sub">${m.items.map((it) => `${esc(it.name)}: ${esc((S.amount[it.amount] || it.amount || '').toLowerCase())}`).join(' · ')}</span>`; };
  const title = (e) => (e.kind === 'meal' ? (S.meals[e.code] || cap(e.code || 'meal')) : cap(e.words));
  const entry = (e, i) => `<li class="fd-entry fd-e-${esc(e.kind)}${e.kind === 'nap' && !e.ended ? ' fd-e-live' : ''}" data-kind="${esc(e.kind)}" data-i="${i}" data-id="${esc(e.id)}"><span class="fd-entry-time">${esc(e.time)}</span>${entryArt(esc, e)}
    <button class="fd-entry-body fd2-entrybtn" type="button" data-drawer="entry:${esc(e.id)}"><span class="fd-entry-words">${esc(e.kind === 'meal' && itemsOf(e) ? title(e) : cap(e.words))}</span>${itemsOf(e)}</button></li>`;
  const incidents = (t.incidents || []).map((i) => `<p class="fd-incident" data-incident="${esc(i.id)}">${icon('incident')}<span>${esc(L.incident(i.time))} ${i.acknowledged ? esc(L.incidentAck)
    : `<a href="${esc(dashLink(slug, 'incident', { id: i.id }))}" data-nav>${esc(L.readAck)}</a>`}</span></p>`).join('');
  return `<section class="card fd-card fd-today fd2-ticker" id="fdToday" aria-labelledby="fdTodayH" data-a>
    <div class="fd2-cardhead"><div class="fd-today-title"><h2 id="fdTodayH">${icon('calendar')}${esc(L.day(cur.first || ''))}</h2>
      <p class="fd-status fd-st-${att.tone}"><span class="fd-dot" aria-hidden="true"></span>${esc(att.text)} <span class="fd-updated" id="fdUpdated">${esc(agoText(t.updated_at, lang))}</span></p></div>
      <a class="fd2-link fd2-link-pill" id="fdFullDay" href="${esc(dashLink(slug, 'day', { kid: d.child }))}" data-nav>${esc(L.v2.viewWhole)} ${icon('arrow')}</a>${collapseBtn(esc, L, 'fdTodayBody', true)}</div>
    <div class="fd2-cbody" id="fdTodayBody">${incidents}
    ${shown.length ? `<ol class="fd-entries" id="fdEntries" aria-live="polite">${shown.map(entry).join('')}</ol>` : `<p class="fd-empty">${esc(L.emptyDay(cur.first || ''))}</p>`}
    <p class="fd2-dayfoot">${t.published ? `<a class="fd-ready" href="${esc(dashLink(slug, 'day', { kid: d.child, date: d.date }))}" data-nav id="fdReportReady">${esc(L.reportReady)}</a>` : `<span class="small muted">${esc(L.reportAt(t.send_time || 'about 5:30 pm'))}</span>`}
      <a class="fd2-link" href="${esc(viewHref('today', 'day'))}" data-view="today" data-tab="day" id="fdDayView">${esc(tl.length > shown.length ? L.more(tl.length - shown.length) : L.v2.clockOpen)}</a></p></div>
  </section>`;
}

// ---- waiting for you: an action inbox in three bands ---------------------------------------------------------------------------
function attentionHtml(esc, L, lang, slug, d, full = true) {
  void full;   // the full list (Messages > Waiting for you); Overview shows the band (attentionBandHtml)
  const items = d.attention || [];
  if (!items.length) return `<section class="card fd-card fd-attn fd-attn-clear" id="fdAttnFull" aria-labelledby="fdAttnFullH"><h2 id="fdAttnFullH">${esc(L.attention)}</h2>
    <p class="fd-clear"><img src="img/friends/bop-waving-480.webp" alt="" width="56" height="56" loading="lazy"><span>${esc(L.allClear)}</span></p></section>`;
  const link = (it) => dashLink(slug, it.kind, { id: it.id, kid: it.kid });
  const band = (p) => items.filter((it) => (PRIORITY[it.kind] || 'news') === p);
  const li = (it) => `<li><a class="fd2-attn-row fd-k-${esc(it.kind)} fd-p-${PRIORITY[it.kind] || 'news'}" href="${esc(link(it))}" data-nav data-kind="${esc(it.kind)}" data-id="${esc(it.id)}">
      <span class="fd-ico">${icon(it.kind)}</span><span class="fd-attn-text">${esc(attentionText(it, lang))}${it.first ? `<span class="fd-attn-kid">${esc(it.first)}</span>` : ''}</span><span class="fd-go">${icon('arrow')}</span></a></li>`;
  return `<section class="card fd-card fd-attn" id="fdAttnFull" aria-labelledby="fdAttnFullH"><h2 id="fdAttnFullH">${esc(L.attention)} <span class="fd-count">${esc(L.attentionN(items.length))}</span></h2>
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
  const closures = x.calendar ?? up.closures, abs = up.absences || [];
  if (closures == null && !abs.length) return '';
  const strip = calendarStrip({ calendar: closures || [], absences: abs });   // tuition: Today's "What's next" and the Billing view
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

// ---- Overview: the owner's mockup (2026-10-12, "build this dashboard, this design, and don't lose any of our features") ---------------
// hero (greeting, date, child chips, the checked-in pill, the child's friend over the felt school) · "Needs your attention" band (the
// whole family, each chip labelled with its child) · four glowing KPI cards · the child's day · learning & home · tuition and the next
// date · the four friend pillars (LEARN, BELONG, EXPLORE, MOVE). Every card shows only the selected child, except the attention band.
function usualPickup(x) {
  const outs = (x?.stats?.days || []).filter((y) => y.present && y.out).map((y) => clockMinutes(y.out)).filter((n) => n != null).sort((a, b) => a - b);
  return outs.length ? outs[Math.floor(outs.length / 2)] : null;
}
// the checked-in pill: today's arrival (or pickup) and the child's usual pickup; a tap opens the Day Clock in the drawer
function pillHtml(esc, L, lang, d, view) {
  const att = d.today?.attendance || {}, V2 = L.v2, up = usualPickup(view.x);
  const text = att.left ? V2.pickedPill(att.left) : att.arrived ? V2.checkedPill(att.arrived) : V2.notInPill;
  const sub = !att.left && att.arrived && up != null ? V2.pickupUsual(minutesClock(up, lang)) : '';
  return `<button class="fd2-pill-in fd2-pill-${att.left ? 'done' : att.arrived ? 'here' : 'none'}" type="button" id="fdCheckPill" data-drawer="clock" aria-haspopup="dialog" aria-label="${esc(`${text}${sub ? `. ${sub}` : ''}. ${V2.clockOpen}`)}">
    <span class="fd2-pill-ico" aria-hidden="true">${icon(att.arrived ? 'consent' : 'clock')}</span><span class="fd2-pill-t"><b>${esc(text)}</b>${sub ? `<span>${esc(sub)}</span>` : ''}</span></button>`;
}
const isDemo = (c) => /^test[\s-]/i.test(String(c?.name || '')) || /(^|-)demo(-|$)|^test-/i.test(String(c?.slug || ''));
function heroHtml(esc, L, lang, slug, d, cur, view) {
  const friend = guideFriend(cur.guide) || 'booker';
  return `<section class="fd-hero fd2-hero" id="familyWelcome" aria-labelledby="fdWelcomeH" data-a>
    <img class="fd2-hero-bg" src="img/scene/school-exterior-800.webp" srcset="img/scene/school-exterior-800.webp 800w, img/scene/school-exterior-1600.webp 1600w" sizes="(min-width:1024px) 70vw, 100vw" alt="" aria-hidden="true" decoding="async">
    <img class="fd2-hero-sun" src="img/scene/felt-sun-320.webp" alt="" aria-hidden="true" decoding="async">
    <img class="fd-hero-friend fd-hf-${esc(friend)}" src="img/scene/cut-${esc(friend)}-440.webp" alt="" aria-hidden="true" decoding="async">
    <div class="fd-hero-in">
      ${isDemo(state.ctx.c) ? `<p class="fd2-demo" id="fdDemoPill">${esc(L.v2.demo)}</p>` : ''}
      <h2 id="fdWelcomeH" class="fd-hello">${esc(greeting(view.part, view.name, lang))}</h2>
      <p class="fd2-date"><button class="fd2-daystep" type="button" data-day-step="-1" aria-label="${esc(L.v2.prevDay)}">‹</button><span id="fdDayLabel">${esc(cap(dateLong(d.date, lang)))}</span>${view.past ? `<button class="fd2-daystep" type="button" data-day-step="1" aria-label="${esc(L.v2.nextDay)}">›</button><a class="fd2-link fd2-backtoday" href="${esc(`${FFTest.pathname()}${stateSearch(location.search, { ...state.ui, date: null })}`)}" data-day-step="99">${esc(L.v2.backToday)}</a>` : ''}</p>
      <div class="fd2-herorow">${kidsHtml(esc, L, slug, d.kids || [], cur, 'fdKids')}${pillHtml(esc, L, lang, d, view)}</div>
    </div>
  </section>`;
}
// "Needs your attention": every child of the family, one chip per item, each with its child and the action that opens the exact item
const ATTN_ACT = { incident: 'readAck', consent: 'review', video: 'reviewFirst', charmsg: 'reviewFirst', report: 'read', help: 'readAnswer', chat: 'open', announcement: 'read' };
function attentionBandHtml(esc, L, lang, slug, d, x) {
  const items = d.attention || [], V2 = L.v2;
  const kidOf = (id) => (d.kids || []).find((k) => k.id === id) || {};
  const chip = (it) => {
    const k = kidOf(it.kid);
    return `<li class="fd2-chip fd-p-${PRIORITY[it.kind] || 'news'}">${it.kid ? avatarHtml(esc, k.guide, 'fd-av') : `<span class="fd-ico fd-t-gold">${icon(it.kind)}</span>`}
      <span class="fd2-chip-t"><b>${esc(((sh) => (it.first ? `${it.first}: ${sh}` : cap(sh)))(V2.short[it.kind] ? V2.short[it.kind](FRIEND_NAME[it.label] || FRIEND_NAME.bop) : ''))}</b><span>${esc(attentionText(it, lang))}</span></span>
      <a class="fd-attn-item fd2-chip-go fd-k-${esc(it.kind)}" href="${esc(dashLink(slug, it.kind, { id: it.id, kid: it.kid }))}" data-nav data-kind="${esc(it.kind)}" data-id="${esc(it.id)}">${esc(V2.act[ATTN_ACT[it.kind] || 'open'])} ${icon('arrow')}</a></li>`;
  };
  const today = String(d.date).slice(0, 10);
  const bring = (x.bring || []).find((b) => String(b.day).slice(0, 10) > today);
  const bringChip = bring ? (() => { const t = new Date(`${today}T12:00:00Z`); t.setUTCDate(t.getUTCDate() + 1);
    const label = String(bring.day).slice(0, 10) === t.toISOString().slice(0, 10) ? L.tomorrow : cap(dayText(bring.day, lang, { weekday: 'long' }));
    return `<li class="fd2-chip fd2-chip-info" id="fdBringNote"><span class="fd-ico fd-t-zuri">${icon('bag')}</span><span class="fd2-chip-t"><b>${esc(V2.bringNote(label))}</b><span${bring.draft_es ? ' lang="en"' : ''}>${esc(bring.text)}</span></span></li>`; })() : '';
  return `<section class="fd2-band" id="fdAttention" aria-labelledby="fdAttnH" data-a><div class="fd2-band-h"><span class="fd2-band-ico" aria-hidden="true">!</span>
    <h2 id="fdAttnH">${esc(V2.attention)}${items.length ? ` <span class="fd-count">${esc(L.attentionN(items.length))}</span>` : ''}</h2></div>
    <ul class="fd2-chips" data-noswipe>${items.length ? items.map(chip).join('') : `<li class="fd2-chip fd2-chip-info"><img src="img/friends/bop-waving-480.webp" alt="" width="40" height="40" loading="lazy"><span class="fd2-chip-t"><b>${esc(L.allClear)}</b></span></li>`}${bringChip}</ul></section>`;
}
// four glowing KPI cards (attendance, meals, rest, feeling): derived in family-kpi.js, each opening its detail in the drawer
function bigKpisHtml(esc, L, lang, slug, d, view) {
  const x = view.x || {}, st = x.stats || null, K = L.k, V2 = L.v2;
  const off = (id, label) => `<div class="fd-kpi fd2-kpi fd-kpi-off" id="${id}"><span class="fd-kpi-label">${esc(label)}</span><span class="chip">${esc(L.notConnected)}</span></div>`;
  const card = (id, href, tone, ic, label, body) => `<a class="fd-kpi fd2-kpi fd-k-${tone}" id="${id}" href="${esc(href)}" data-nav data-sheet="${id}" aria-haspopup="dialog">
    <span class="fd-kpi-label"><span class="fd2-kpi-ico">${icon(ic)}</span>${esc(label)}</span><span class="fd2-kpi-body">${body}</span></a>`;
  const out = [];
  // when each figure was recorded (owner: "every figure states when it was recorded"): the latest entry of its kind today
  const tl = d.today?.timeline || [];
  const lastOf = (k) => [...tl].reverse().find((e) => e.kind === k);
  const logged = (t) => (t ? `<span class="fd2-logged">${esc(t)}</span>` : '');
  const meal = lastOf('meal'), nap = lastOf('nap'), mood = lastOf('mood');
  const napRange = nap ? (/(\d{1,2}:\d{2}\s?[AP]M)\s+(?:to|a)\s+(\d{1,2}:\d{2}\s?[AP]M)/i.exec(nap.words) || null) : null;
  const MM = monthModel(st, x.calendar, d.date);
  const dots = MM ? `<span class="fd2-dots" aria-hidden="true">${MM.weeks.flat().filter((c2) => c2 && c2.state !== 'closed' && c2.state !== 'none').map((c2) => `<i class="${c2.state === 'here' ? 'on' : 'off'}${c2.today ? ' td' : ''}"></i>`).join('')}</span>` : '';
  const a = attendanceKpi(st);
  out.push(a ? card('kpiMonth', dashLink(slug, 'child', { kid: d.child }), 'booker', 'calendar', V2.kAttendance,
    `${glowRingSvg(0, { tone: 'booker', segments: Math.max(a.school, 1), lit: a.present, size: 112, stroke: 13 })}<span class="fd2-kpi-num"><span class="fd2-big fd2-gl-booker">${count(a.present)}<small> / ${a.school}</small></span><span class="fd-kpi-sub">${esc(V2.schoolDays)}</span>${dots}</span>`) : off('kpiMonth', V2.kAttendance));
  const m = mealsKpi(st);
  out.push(m ? card('kpiAte', dashLink(slug, 'day', { kid: d.child }), 'zuri', 'meal', V2.kMeals,
    `${glowRingSvg((m.today ?? 0) / 100, { tone: 'zuri', size: 112, stroke: 13, inner: `<g class="fv-gl-icon" transform="translate(42 42) scale(1.15)">${ICON.meal}</g>` })}<span class="fd2-kpi-num">${m.today == null ? `<span class="fd-dim">${esc(L.nothingYet)}</span>` : `<span class="fd2-big fd2-gl-zuri">${count(m.today, '%')}</span>`}<span class="fd-kpi-sub">${esc(V2.portion)}</span>${logged(meal ? V2.logged(meal.time) : '')}</span>`) : off('kpiAte', V2.kMeals));
  const r = restKpi(st);
  out.push(r ? (() => { const mx = Math.max(r.today || 0, r.usual || 0, 1);
    return card('kpiRest', dashLink(slug, 'day', { kid: d.child }), 'lumi', 'nap', K.rest,
      `<span class="fd2-kpi-num fd2-rest">${r.today == null ? `<span class="fd-dim">${esc(L.nothingYet)}</span>` : `<span class="fd2-big fd2-gl-lumi">${count(r.today)}<small> ${esc(L.kSub.minutes)}</small></span>`}
      <span class="fd2-tvu"><span>${esc(V2.today)}</span>${glowBarHtml((r.today || 0) / mx, 'lumi')}<b>${r.today ?? '—'}</b><span>${esc(V2.usual)}</span>${glowBarHtml((r.usual || 0) / mx, 'booker')}<b>${r.usual ?? '—'}</b></span>${logged(napRange ? V2.loggedRange(napRange[1], napRange[2]) : nap ? V2.logged(nap.time) : '')}</span>`); })() : off('kpiRest', K.rest));
  const md = moodKpi(st, String(d.date).slice(0, 10));
  out.push(st ? card('kpiFeel', dashLink(slug, 'day', { kid: d.child }), 'bop', 'mood', K.feel,
    md.today ? `<img class="fd2-feelface" src="img/friends/${esc(FEEL_ART[md.today] || 'lumi')}-480.webp" alt="" width="96" height="96" loading="lazy"><span class="fd2-kpi-num"><span class="fd2-big fd2-word fd2-gl-bop">${esc((FEEL[lang] || FEEL.en)[md.today] || md.today)}</span><span class="fd-kpi-sub">${esc(mood ? `${V2.logged(mood.time)} · ${V2.teacherObs}` : V2.observed)}</span></span>`
      : `<span class="fd2-kpi-num"><span class="fd-dim">${esc(L.nothingYet)}</span></span>`) : off('kpiFeel', K.feel));
  return `<section class="fd-kpis fd2-kpis" id="fdKpis" aria-labelledby="fdKpiH" data-a><h2 id="fdKpiH" class="fd-sec-h">${esc(L.glance(((d.kids || []).find((k) => k.id === d.child) || {}).first || ''))}</h2><div class="fd-kpi-grid">${out.join('')}</div></section>`;
}
// phones: a card can fold to its heading (the day card starts open, Learning & home folded) so Overview stays about two screens
const phoneNow = () => typeof matchMedia === 'function' && matchMedia('(max-width: 767px)').matches;
function collapseBtn(esc, L, body, open) {
  const isOpen = open || !phoneNow();
  return `<button class="fd2-collapse" type="button" aria-expanded="${isOpen}" aria-controls="${body}" data-collapse="${body}"><span class="sr-only">${esc(L.v2.showHide)}</span>${icon('arrow')}</button>`;
}
// learning & home: this week's home activities (glowing ring), new work, Kid Mode minutes, the report, "Choose an activity"
function learnHomeHtml(esc, L, lang, slug, d, x, cur) {
  const l = d.learning || {}, V2 = L.v2, h = homeKpi(l), st = x.stats || null, r = l.report;
  const lt = st?.learning_time || l.time_learning || null, km = lt ? Math.round(((lt.home_sec || 0) + (lt.center_sec || 0)) / 60) : null;
  return `<section class="card fd-card fd2-learnhome" id="fdLearnHome" aria-labelledby="fdLhH" data-a><div class="fd2-cardhead"><h2 id="fdLhH" class="fd2-h">${icon('book')} ${esc(V2.learnHome)}</h2>
      ${st || d.messages || x.calendar || d.upcoming?.tuition ? `<button class="fd2-link" type="button" id="fdMoreNumsBtn" data-drawer="numbers" aria-haspopup="dialog">${esc(V2.moreNums)} ${icon('arrow')}</button>` : ''}${collapseBtn(esc, L, 'fdLhBody', false)}</div>
    <div class="fd2-cbody" id="fdLhBody"${phoneNow() ? ' hidden' : ''}><div class="fd2-lh">
      <a class="fd2-lh-ring" href="${esc(viewHref('learning', 'week'))}" data-view="learning" data-tab="week" aria-label="${esc(h ? L.kSub.homeDone(h.done, h.total) : L.noHome)}">${glowRingSvg(h ? h.done / h.total : 0, { tone: 'bop', size: 132, stroke: 12 })}
        <span class="fd2-lh-in"><span class="fd2-big fd2-gl-bop">${h ? `${count(h.done)}<small> / ${h.total}</small>` : '—'}</span><span>${esc(V2.homeActs)}</span></span></a>
      <div class="fd2-lh-side">
        <a class="fd2-mini" href="${esc(viewHref('learning', 'portfolio'))}" data-view="learning" data-tab="portfolio"><span class="fd-ico fd-t-lumi">${icon('star')}</span><span><span>${esc(L.k.work)}</span><b>${st && st.portfolio_month != null ? Number(st.portfolio_month) : '—'}</b></span></a>
        <a class="fd2-mini" href="${esc(dashLink(slug, 'kid'))}" data-nav id="fdKidMinutes"><span class="fd-ico fd-t-gold">${icon('kid')}</span><span><span>${esc(V2.kidMode)}</span><b>${km == null ? '—' : esc(minutesText(km, lang))}</b></span></a>
        <a class="fd2-mini fd2-mini-wide" href="${esc(viewHref('learning', 'reports'))}" data-view="learning" data-tab="reports">${r ? `${esc(V2.reportNew)} · ${esc(dayText(r.to, lang, { month: 'short', day: 'numeric' }))}` : esc(V2.reportNone)}</a>
        <a class="btn fd2-btn-bop" id="fdChooseActivity" href="${esc(dashLink(slug, 'learn', { kid: cur.id }))}" data-nav>${esc(V2.choose)} ${icon('arrow')}</a>
      </div></div></div></section>`;
}
// tuition and the next date on the center calendar
function nextHtml(esc, L, lang, slug, d, x) {
  const V2 = L.v2;
  const ev = (x.calendar || d.upcoming?.closures || [])[0];
  const tu = d.upcoming?.tuition;
  const tuition = tu ? `<div class="fd-tuition fd2-tu" id="fdTuition"><span class="fd-ico fd-t-${tu.status === 'past_due' ? 'gold' : 'navy'}">${icon('tuition')}</span><span><b>${esc(money(tu.due_cents, lang))}</b>
      <span>${esc(L.kSub.due(dayText(tu.due_date, lang)))}${tu.status === 'past_due' ? ` · ${esc(L.pastDue)}` : ''}</span></span>
    <a class="btn soft small fd-tuition-go" href="${esc(dashLink(slug, 'billing', { id: tu.invoice_id }))}" data-nav id="fdTuitionLink">${esc(L.billingQ)}</a></div>`
    : `<p class="fd2-nx"><span class="fd-ico fd-t-zuri">${icon('consent')}</span><b>${esc(V2.tuitionNone)}</b></p>`;
  const event = ev ? `<a class="fd2-nx fd2-nx-a" href="${esc(dashLink(slug, 'calendar', { date: String(ev.day).slice(0, 10) }))}" data-nav id="fdNextEvent"><span class="fd-ico fd-t-bop">${icon('calendar')}</span>
    <span><b>${esc(cap(dayText(ev.day, lang, { month: 'long', day: 'numeric' })))}</b><span>${esc(lang === 'es' ? (ev.label_es || ev.label) : ev.label)}${ev.status === 'early' ? ` · ${esc(L.early)}` : ''}</span></span></a>` : '';
  return `<section class="card fd-card fd2-next" id="fdNext" aria-labelledby="fdNextH" data-a><h2 id="fdNextH" class="fd2-h">${icon('tuition')} ${esc(L.tuition)}</h2>${tuition}<hr class="fd2-hr">${event}
    <a class="btn soft fd2-viewcal" href="${esc(viewHref('calendar', 'next'))}" data-view="calendar" data-tab="next" id="fdViewCal">${esc(V2.viewCal)} ${icon('arrow')}</a></section>`;
}
// the four friend pillars (official cut-outs): Booker LEARN, Lumi BELONG, Zuri EXPLORE, Bop MOVE
function pillarsHtml(esc, L, slug) {
  const P = L.v2.pillar;
  const one = (friend, word, ic, attrs) => `<a class="fd2-pillar fd2-pl-${friend}" ${attrs} data-a><img src="img/scene/cut-${friend}-440.webp" alt="" width="120" height="150" loading="lazy" decoding="async">
    <span class="fd2-pl-t"><span class="fd2-pl-name">${esc(FRIEND_NAME[friend])}</span><b>${icon(ic)}${esc(word)}</b><span class="fd2-pl-sub">${esc(P[`${friend}Sub`])}</span></span></a>`;
  return `<nav class="fd2-pillars" id="fdPillars" aria-label="${esc(L.friends)}">
    ${one('booker', P.learn, 'book', `href="${esc(viewHref('learning', 'week'))}" data-view="learning" data-tab="week" id="fdPlLearn"`)}
    ${one('lumi', P.belong, 'heart', `href="${esc(viewHref('messages', 'teachers'))}" data-view="messages" data-tab="teachers" id="fdPlBelong"`)}
    ${one('zuri', P.explore, 'star', `href="${esc(viewHref('learning', 'portfolio'))}" data-view="learning" data-tab="portfolio" id="fdPlExplore"`)}
    ${one('bop', P.move, 'activity', `href="${esc(dashLink(slug, 'kid'))}" data-nav id="fdPlMove"`)}</nav>`;
}

// ---- the Day Clock card (Today) -------------------------------------------------------------------------------------------
const nowMinutes = (tz) => localMinutes(new Date().toISOString(), tz);
function clockModelNow() {
  const { d, view } = dayEff();
  return dayClockModel({ today: d.today, stats: view.x?.stats, nowMin: view.past ? null : nowMinutes(view.tz), tz: view.tz });
}
function clockFigHtml(size = 300, id = 'fdClockFig') {
  const { ctx, d } = state, { esc, lang } = ctx;
  const cur = (d.kids || []).find((k) => k.id === d.child) || {};
  const M = clockModelNow();
  return figureHtml(esc, lang, id, clockSvg(M, { esc, lang, first: cur.first || '', friend: guideFriend(cur.guide) || 'bop', size }), clockSummary(M, cur.first || '', lang), M ? clockTable(M, lang) : null, 'fv-clockfig');
}
function clockKeyHtml(esc, L, M) {
  const K = L.v2.clockKey;
  return `<ul class="fv-key" aria-hidden="true"><li class="fv-k-meal">${esc(K.meal)}</li><li class="fv-k-nap">${esc(K.nap)}</li><li class="fv-k-activity">${esc(K.activity)}</li><li class="fv-k-other">${esc(K.other)}</li>${M?.incidents.length ? `<li class="fv-k-inc">${esc(K.incident)}</li>` : ''}</ul>`;
}
// the hand moves on the 60-second refresh (a transition on the rotation; nothing loops)
function paintClockHand() {
  if (!state) return;
  const M = clockModelNow(); if (!M || M.now == null) return;
  const m = /data-angle="([-\d.]+)"/.exec(clockSvg(M, { esc: state.ctx.esc, lang: state.ctx.lang, first: '' })); if (!m) return;
  for (const hand of document.querySelectorAll('#familyDash .fv-hand, #fdSheet .fv-hand')) {
    const c = Number(hand.dataset.c), from = Number(hand.dataset.angle), to = Number(m[1]);
    hand.dataset.angle = String(to); hand.firstElementChild?.setAttribute('transform', `rotate(${to} ${c} ${c})`);
    hand.style.setProperty('transform-origin', `${c}px ${c}px`);
    if (motionOn() && from !== to) hand.animate([{ transform: `rotate(${from - to}deg)` }, { transform: 'rotate(0deg)' }], { duration: 900, easing: EASE });
  }
}

// ---- what's next (Today): pickup, tomorrow's "what to bring", the next event, tuition --------------------------------------------
// ---- care: the whole day as a list, meals (plates), rest (moon), feelings (sky), health --------------------------------------------
function dayListHtml(esc, L, lang, slug, d) {
  const t = d.today || {};
  const tl = [...(t.timeline || [])].reverse();
  const cur = (d.kids || []).find((k) => k.id === d.child) || {};
  return `<section class="card fd-card fd2-daylist" id="fdDayList" aria-labelledby="fdDayListH"><h2 id="fdDayListH">${icon('sun')} ${esc(L.day(cur.first || ''))}</h2>
    ${tl.length ? `<ol class="fd-entries fd2-entries">${tl.map((e) => `<li class="fd-entry fd-e-${esc(e.kind)}"><span class="fd-entry-time">${esc(e.time)}</span>${entryArt(esc, e)}
      <button class="fd-entry-body fd2-entrybtn" type="button" data-drawer="entry:${esc(e.id)}"><span class="fd-entry-words">${esc(cap(e.words))}</span></button></li>`).join('')}</ol>`
      : `<p class="fd-empty">${esc(L.emptyDay(cur.first || ''))}</p>`}
    <a class="btn navy fd-primary" href="${esc(dashLink(slug, 'day', { kid: d.child }))}" data-nav id="fdFullDay2">${esc(L.fullDay(cur.first || ''))}</a></section>`;
}
const entryArt = (esc, e) => (e.kind === 'mood' && FEEL_ART[e.code] ? `<img class="fd-feel" src="img/friends/${esc(FEEL_ART[e.code])}-480.webp" alt="" width="40" height="40" loading="lazy">` : `<span class="fd-ico fd-t-${KIND_TONE[e.kind] || 'navy'}">${icon(e.kind)}</span>`);

function mealsViewHtml(esc, L, lang, slug, d, x) {
  const st = x.stats || null, V = vw(lang), S = L.sh;
  if (!st) return `<section class="card fd-card" id="fdPlates"><h2>${icon('meal')} ${esc(L.v2.plates)}</h2><span class="chip">${esc(L.notConnected)}</span></section>`;
  const meals = st.meals_today || [];
  const plateFig = (m, i) => {
    const P = plateModel(m), name = S.meals[m.meal] || cap(m.meal);
    const items = P.items.map((it) => `${it.name || S.plate}: ${S.amount[it.amount] || it.amount || V.nothing}`).join('; ');
    return `<div class="fd2-plate"><h3>${esc(name)} <span class="small muted">· ${esc(m.time || '')}</span></h3>
      ${figureHtml(esc, lang, `fd-plate-${i}`, plateSvg(P, { esc }), V.plateSum(name, items) + (P.triedNew ? ` ${V.triedNew}.` : ''), { head: [V.what, V.amount], rows: P.items.map((it) => [it.name || S.plate, S.amount[it.amount] || it.amount || V.nothing]) })}
      <ul class="fd2-plate-key">${P.items.map((it, j) => `<li class="fv-fk-${j % 4}"><span>${esc(it.name || S.plate)}</span><b>${esc(S.amount[it.amount] || it.amount || V.nothing)}</b></li>`).join('')}</ul>
      ${P.triedNew ? `<p class="chip ok fd2-tried">✦ ${esc(S.triedNew)}</p>` : ''}</div>`;
  };
  const wk = weekPlatesModel(st) || [];
  const week = wk.length ? figureHtml(esc, lang, 'fdWeekPlates', `<ol class="fd2-pies">${wk.map((p) => `<li><button class="fd2-pie" type="button" data-drawer="plate:${esc(p.day)}" data-tip="${esc(`${cap(dayText(p.day, lang, { weekday: 'long' }))}: ${p.share == null ? V.nothing : L.v2.shareOf(Math.round(p.share * 100))}`)}" aria-label="${esc(`${cap(dayText(p.day, lang, { weekday: 'long', month: 'short', day: 'numeric' }))}: ${p.share == null ? V.nothing : L.v2.shareOf(Math.round(p.share * 100))}`)}">${pieSvg(p.share)}<span>${esc(dayText(p.day, lang, { weekday: 'short' }))}</span></button></li>`).join('')}</ol>`,
    V.weekPlatesSum(wk.map((p) => `${dayText(p.day, lang, { weekday: 'short' })} ${p.share == null ? V.nothing : `${Math.round(p.share * 100)}%`}`).join(', ')),
    { head: [V.day, V.amount], rows: wk.map((p) => [cap(dayText(p.day, lang)), p.share == null ? V.nothing : `${Math.round(p.share * 100)}%`]) }) : '';
  return `<div class="fd2-two"><section class="card fd-card fd2-plates" id="fdPlates" aria-labelledby="fdPlatesH"><h2 id="fdPlatesH">${icon('meal')} ${esc(L.v2.plates)}</h2>
      ${meals.length ? `<div class="fd2-plategrid">${meals.map(plateFig).join('')}</div>` : `<p class="muted">${esc(V.noMeals)}</p>`}</section>
    <div class="fd2-stack"><section class="card fd-card" id="fdWeekPlatesCard" aria-labelledby="fdWpH"><h2 id="fdWpH">${esc(L.v2.weekPlates)}</h2>${week || `<p class="muted">${esc(L.notConnected)}</p>`}</section>
    ${menuHtml(esc, L, lang, d, x)}</div></div>`;
}
function restViewHtml(esc, L, lang, d, x) {
  const V = vw(lang);
  const M = moonModel(x.stats, String(d.date).slice(0, 10));
  if (!M) return `<section class="card fd-card" id="fdMoon"><h2>${icon('moon')} ${esc(L.v2.moon)}</h2><span class="chip">${esc(L.notConnected)}</span></section>`;
  const tt = M.today == null ? L.nothingYet : minutesText(M.today, lang), ut = M.usual == null ? '' : minutesText(M.usual, lang);
  return `<section class="card fd-card fd2-moon" id="fdMoon" aria-labelledby="fdMoonH"><h2 id="fdMoonH">${icon('moon')} ${esc(V.rest)}</h2>
    ${figureHtml(esc, lang, 'fdMoonFig', moonSvg(M, { esc, lang, todayText: tt, usualText: ut }), V.restSum(tt, ut ? V.usual(ut) : ''), { head: [V.day, V.minutes], rows: [...M.days].reverse().map((r) => [cap(dayText(r.day, lang, { weekday: 'long', month: 'short', day: 'numeric' })), r.min == null ? V.nothing : minutesText(r.min, lang)]) })}
    ${ut ? `<p class="fd2-note">${esc(V.usual(ut))}</p>` : ''}
    <ol class="fd2-restdays">${M.days.map((r) => `<li><span class="fd2-rd-bar" data-h="${r.min == null ? 0 : Math.round(Math.min(1, r.min / M.scale) * 100)}"></span><i>${esc(dayText(r.day, lang, { weekday: 'narrow' }))}</i></li>`).join('')}</ol></section>`;
}
function feelViewHtml(esc, L, lang, d, x) {
  const V = vw(lang), F = FEEL[lang] || FEEL.en;
  const S = skyModel(x.stats);
  if (!x.stats) return `<section class="card fd-card" id="fdSky"><h2>${esc(L.v2.sky)}</h2><span class="chip">${esc(L.notConnected)}</span></section>`;
  return `<section class="card fd-card fd2-skycard" id="fdSky" aria-labelledby="fdSkyH"><h2 id="fdSkyH">${icon('mood')} ${esc(V.sky)}</h2>
    ${S ? figureHtml(esc, lang, 'fdSkyFig', `<ol class="fv-sky">${S.map((m) => `<li class="fv-sky-d fv-lift-${m.lift}"><button type="button" class="fv-sky-b" data-drawer="feel:${esc(m.day)}" aria-label="${esc(`${cap(dayText(m.day, lang, { weekday: 'long' }))}: ${F[m.feeling] || m.feeling}`)}" data-tip="${esc(F[m.feeling] || m.feeling)}">
        <img src="img/friends/${esc(m.art)}-480.webp" alt="" width="64" height="64" loading="lazy"></button><b>${esc(F[m.feeling] || m.feeling)}</b><i>${esc(cap(dayText(m.day, lang, { weekday: 'short' })))}</i></li>`).join('')}</ol>`,
      V.skySum(S.map((m) => `${dayText(m.day, lang, { weekday: 'short' })} ${F[m.feeling] || m.feeling}`).join(', ')), { head: [V.day, V.feeling], rows: S.map((m) => [cap(dayText(m.day, lang, { weekday: 'long', month: 'short', day: 'numeric' })), F[m.feeling] || m.feeling]) }, 'fv-skyfig')
      : `<p class="muted">${esc(V.skyNone)}</p>`}</section>`;
}
// health (health_child_get, loaded when the Care view opens): plans, medicines, care alerts, immunizations, what is due
async function loadHealth() {
  const el = document.getElementById('fdHealth'); if (!el || !state) return;
  const { ctx, d } = state, { esc, lang } = ctx, L = words(lang), H = L.v2.health, kid = d.child;
  let h = state.health?.kid === kid ? state.health.data : null;
  if (!h) { try { h = await ctx.rpc('health_child_get', { p_center: ctx.c.center_id, p_kid: kid }); state.health = { kid, data: h }; } catch (_) { h = null; } }
  const box = document.getElementById('fdHealth'); if (!box || state.d.child !== kid) return;
  const row = (ic, label, n, extra = '') => `<li><span class="fd-ico fd-t-${ic}">${icon(ic === 'lumi' ? 'heart' : ic === 'zuri' ? 'shield' : ic === 'gold' ? 'incident' : 'report')}</span><span><b>${esc(label)}</b><span>${n == null ? `<span class="chip">${esc(L.notConnected)}</span>` : esc(n ? String(n) : H.none)}${extra}</span></span></li>`;
  const due = h ? (h.compliance || []).filter((x) => x.state === 'due' || x.state === 'missing' || x.state === 'overdue').length : null;
  box.innerHTML = `<h2 id="fdHealthH">${icon('heart')} ${esc(H.title)}</h2><ul class="fd2-hl">
    ${row('lumi', H.plans, h ? (h.plans || []).length : null)}${row('booker', H.meds, h ? (h.meds || []).length : null)}${row('gold', H.alerts, h ? (h.care_alerts || []).length : null)}
    ${row('zuri', H.imm, h ? (h.immunizations || []).length : null)}
    <li><span class="fd-ico fd-t-navy">${icon('report')}</span><span><b>${esc(H.due)}</b><span>${due == null ? `<span class="chip">${esc(L.notConnected)}</span>` : esc(due ? String(due) : H.ok)}</span></span></li></ul>
    <a class="btn navy fd-primary" id="fdHealthLink" href="/c/${esc(ctx.c.slug)}/health?kid=${encodeURIComponent(kid)}" data-nav>${esc(H.open)}</a>`;
}

// ---- learning: the home garden (this week), the skills flowers, the portfolio, the report --------------------------------------
function weekHtml(esc, L, lang, slug, d, cur) {
  const l = d.learning, V = vw(lang);
  if (!l) return `<section class="card fd-card" id="familyLearning"><h2>${esc(L.learning)}</h2><p class="muted">${esc(L.couldNot)}</p>
    <a class="btn soft" href="${esc(dashLink(slug, 'learn', { kid: cur.id }))}" data-nav id="openLearnWeek">${esc(L.doWeek)}</a></section>`;
  const G = gardenModel(l);
  return `<section class="card fd-card fd-learning fd2-week" id="familyLearning" aria-labelledby="fdLearnH"><h2 id="fdLearnH">${icon('learn')} ${esc(L.thisWeek(l.unit, l.week_theme))}</h2>
    ${G ? figureHtml(esc, lang, 'fdGarden', gardenSvg(G), V.gardenSum(G.done, G.total), { head: [V.what, V.amount], rows: G.plants.map((p, i) => [`${i + 1}`, p.grown ? V.grown : V.seed]) }, 'fv-gardenfig')
      + `<label class="fd-progress"><span>${esc(L.doneOf(l.home_done, l.home_total))}</span><progress max="${Number(l.home_total)}" value="${Number(l.home_done)}">${Number(l.home_done)} / ${Number(l.home_total)}</progress></label>`
      : `<p class="small muted">${esc(L.noHome)}</p>`}
    <a class="btn gold fd-primary" href="${esc(dashLink(slug, 'learn', { kid: cur.id }))}" data-nav id="openLearnWeek">${esc(L.doWeek)}</a></section>`;
}
function skillsHtml(esc, L, lang, slug, d, x, cur) {
  const V = vw(lang), D = DOMAIN[lang === 'es' ? 'es' : 'en'];
  const F = flowerModel(x.stats);
  if (!x.stats) return `<section class="card fd-card" id="fdSkills"><h2>${esc(L.v2.skills)}</h2><span class="chip">${esc(L.notConnected)}</span></section>`;
  if (!F) return `<section class="card fd-card" id="fdSkills"><h2>${icon('star')} ${esc(L.v2.skills)}</h2><p class="muted">${esc(L.v2.noSkills)}</p></section>`;
  const name = (a) => D[a.domain] || a.domain;
  return `<section class="card fd-card fd2-skills" id="fdSkills" aria-labelledby="fdSkillsH"><h2 id="fdSkillsH">${icon('star')} ${esc(V.flower)}</h2>
    ${figureHtml(esc, lang, 'fdFlowers', `<ul class="fv-garden-flowers">${F.areas.map((a) => `<li><button class="fv-flowerbtn" type="button" data-drawer="area:${esc(a.domain)}" aria-label="${esc(V.flowerArea(name(a), a.secure, a.developing, a.emerging))}">${flowerSvg(a)}</button>
        <b>${esc(name(a))}</b><span class="small">${esc(`${a.secure} ${V.lv.secure.toLowerCase()} · ${a.developing} ${V.lv.developing.toLowerCase()} · ${a.emerging} ${V.lv.emerging.toLowerCase()}`)}</span>
        ${a.max ? `<span class="small muted">${esc(V.points(a.points, a.max))}</span>` : ''}</li>`).join('')}</ul>`,
      V.flowerSum(F.areas.map((a) => V.flowerArea(name(a), a.secure, a.developing, a.emerging)).join('; ')),
      { head: [V.area, V.lv.secure, V.lv.developing, V.lv.emerging], rows: F.areas.map((a) => [name(a), String(a.secure), String(a.developing), String(a.emerging)]) })}
    <p class="fd-legend"><span class="fd-st-s"></span>${esc(V.lv.secure)} <span class="fd-st-d"></span>${esc(V.lv.developing)} <span class="fd-st-e"></span>${esc(V.lv.emerging)}</p>
    <p class="mini muted">${esc(V.ownNumbers)}</p>
    <a class="btn link" href="${esc(dashLink(slug, 'report', { kid: cur.id, id: F.report }))}" data-nav id="fdSkillsReport">${esc(L.readReport)}</a></section>`;
}
function portfolioHtml(esc, L, lang, slug, d, cur) {
  const l = d.learning || {};
  const by = (it) => (it.by === 'kid_mode' ? L.byKid : it.by === 'family' ? L.byFamily : L.byStaff);
  return `<section class="card fd-card fd-portfolio fd2-portfolio" id="fdPortfolio" aria-labelledby="fdPortH"><h2 id="fdPortH">${icon('star')} ${esc(L.portfolio)}</h2>
    ${(l.portfolio || []).length ? `<ul class="fd-work">${l.portfolio.map((it) => `<li>${it.photo_path && l.photo_ok ? `<img class="fd-work-img fd-photo" data-path="${esc(it.photo_path)}" alt="" width="96" height="96">` : `<img class="fd-work-img" src="${esc(friendImg(it.friend || 'bop'))}" alt="" width="96" height="96" loading="lazy">`}
      <span><b>${esc(it.title)}</b><span class="small muted">${esc(dayText(it.done_on, lang))} · ${esc(by(it))}</span></span></li>`).join('')}</ul>` : `<p class="small muted">${esc(L.noPortfolio)}</p>`}
    <a class="btn link" href="${esc(dashLink(slug, 'work', { kid: cur.id }))}" data-nav id="fdWorkLink">${esc(L.work)}</a></section>`;
}
function reportHtml(esc, L, lang, slug, d, cur) {
  const r = d.learning?.report;
  const key = r?.levels_key || {};
  const skill = (s) => { const k = key[s.level] || {}; const label = lang === 'es' ? (s.text_es || s.family_en || s.text_en) : (s.family_en || s.text_en);
    return `<li><span class="fd-skill">${esc(label)}</span><span class="fd-skill-lvl"><span class="chip sc-lvl sc-lvl-${esc(s.level)}">${esc(lang === 'es' ? k.es : k.en)}</span>
      <span class="small muted">${s.max > 0 ? esc(numbersText(s.points, s.max, lang)) : esc(L.noNum)}</span></span></li>`; };
  return `<section class="card fd-card fd-report" id="fdReport" aria-labelledby="fdReportH"><h2 id="fdReportH">${icon('report')} ${esc(L.report)}</h2>
    ${r ? `<p class="small muted">${esc(L.period(dayText(r.from, lang), dayText(r.to, lang)))}</p>${r.note ? `<p class="fd2-note">${esc(r.note)}</p>` : ''}<ul class="fd-skills">${(r.skills || []).map(skill).join('')}</ul>
      ${r.skill_count > (r.skills || []).length ? `<p class="small muted">${esc(L.moreSkills(r.skill_count - r.skills.length))}</p>` : ''}
      <p class="mini muted">${esc(L.reportOnly)}</p>
      <a class="btn navy fd-primary" href="${esc(dashLink(slug, 'report', { id: r.id, kid: cur.id }))}" data-nav id="fdReportLink">${esc(L.readReport)}</a>` : `<p class="small muted">${esc(L.noReport)}</p>`}
    <a class="btn link" href="/c/${esc(slug)}/grades?kid=${encodeURIComponent(cur.id)}" data-nav id="fdReportsAll">${esc(L.v2.reportsAll)}</a></section>`;
}

// ---- calendar: the month as a heat calendar ---------------------------------------------------------------------------------
function monthHtml(esc, L, lang, d, x) {
  const V = vw(lang);
  const M = monthModel(x.stats, x.calendar, d.date);
  if (!M) return `<section class="card fd-card" id="fdMonth"><h2>${esc(L.v2.month)}</h2><span class="chip">${esc(L.notConnected)}</span></section>`;
  const mname = cap(dayText(M.month, lang, { month: 'long', year: 'numeric' }));
  const st = { here: V.here, away: V.away, closed: V.closed, early: V.early, today: V.today, ahead: V.ahead, none: '' };
  const cell = (c) => {
    if (!c) return '<span class="fv-hc fv-hc-pad" aria-hidden="true"></span>';
    const lbl = `${cap(dayText(c.day, lang, { weekday: 'long', month: 'short', day: 'numeric' }))}: ${st[c.state] || ''}${c.label ? ` · ${lang === 'es' ? (c.label_es || c.label) : c.label}` : ''}${c.in ? ` · ${c.in}${c.out ? `–${c.out}` : ''}` : ''}`;
    return `<button class="fv-hc fv-hc-${c.state}${c.today ? ' fv-hc-today' : ''}" type="button" data-drawer="day:${esc(c.day)}" aria-label="${esc(lbl)}" data-tip="${esc(lbl)}"><span>${c.n}</span></button>`;
  };
  const rows = M.weeks.flat().filter(Boolean).filter((c) => c.state !== 'none');
  return `<section class="card fd-card fd2-month" id="fdMonth" aria-labelledby="fdMonthH"><h2 id="fdMonthH">${icon('calendar')} ${esc(V.month(mname))}</h2>
    ${figureHtml(esc, lang, 'fdMonthFig', `<div class="fv-heat"><div class="fv-hrow fv-hhead" aria-hidden="true">${V.wd.map((w) => `<span>${esc(w)}</span>`).join('')}</div>
      ${M.weeks.map((w) => `<div class="fv-hrow">${w.map(cell).join('')}</div>`).join('')}</div>`,
      V.monthSum(mname, M.present, M.school, M.closed), { head: [V.day, V.what], rows: rows.map((c) => [cap(dayText(c.day, lang)), `${st[c.state]}${c.label ? ` · ${lang === 'es' ? (c.label_es || c.label) : c.label}` : ''}`]) })}
    <ul class="fv-heatkey" aria-hidden="true"><li class="fv-hc-here">${esc(V.here)}</li><li class="fv-hc-away">${esc(V.away)}</li><li class="fv-hc-closed">${esc(V.closed)}</li><li class="fv-hc-early">${esc(V.early)}</li></ul></section>`;
}

// ---- family: consents ------------------------------------------------------------------------------------------------------
function privacyHtml(esc, L, slug, d, cur) {
  const P = L.v2.privacy;
  const waiting = (d.attention || []).filter((a) => a.kind === 'consent' && a.kid === cur.id).map((a) => a.id);
  const row = (label, ok, purpose) => `<li><span class="fd-ico fd-t-${ok ? 'zuri' : 'navy'}">${icon(ok ? 'consent' : 'shield')}</span><span><b>${esc(label)}</b>
    <span>${waiting.includes(purpose) ? `<span class="chip gold">${esc(P.waiting)}</span>` : esc(ok == null ? L.notConnected : ok ? P.yes : P.no)}</span></span></li>`;
  return `<section class="card fd-card fd2-privacy" id="fdPrivacy" aria-labelledby="fdPrivH"><h2 id="fdPrivH">${icon('consent')} ${esc(P.title)}</h2>
    <ul class="fd2-hl">${row(P.photos, d.learning ? !!d.learning.photo_ok : null, 'photos')}${row(P.friends, d.friends ? !!d.friends.consent : null, 'character_messages')}</ul>
    <a class="btn navy fd-primary" id="fdPrivacyLink" href="${esc(dashLink(slug, 'privacy', {}))}?kid=${encodeURIComponent(cur.id)}" data-nav>${esc(P.open)}</a></section>`;
}

// ---- billing (family_billing, loaded when the Billing view opens): the balance ring, the payment timeline ------------------------
async function loadBilling() {
  if (!document.getElementById('fdBalance') || !state) return;
  const { ctx } = state, { esc, lang } = ctx, L = words(lang), B = L.v2.billing, V = vw(lang), slug = ctx.c.slug;
  let b = state.billing;
  if (!b) { try { b = await ctx.rpc('family_billing', { p_center: ctx.c.center_id }); state.billing = b; } catch (_) { b = null; } }
  const bal = document.getElementById('fdBalance'), pay = document.getElementById('fdPayments');
  if (!bal || !state) return;
  const M = balanceModel(b, state.d.child);
  if (!M) { for (const el of [bal, pay]) if (el) el.querySelector('.fd2-loading')?.replaceWith(Object.assign(document.createElement('span'), { className: 'chip', textContent: L.notConnected })); return; }
  const next = (b.invoices || []).filter((i) => i.kid === state.d.child && Number(i.balance_cents) > 0).sort((a, c) => String(a.due_date).localeCompare(String(c.due_date)))[0];
  bal.innerHTML = `<h2 id="fdBalH">${icon('tuition')} ${esc(B.title)}</h2>
    ${figureHtml(esc, lang, 'fdBalFig', `<div class="fv-balance">${ringSvg(M.paidFrac, { tone: M.balance ? 'gold' : 'zuri' })}<div class="fv-bal-in"><b class="fd-money-lg">${esc(money(M.balance, lang))}</b><span>${esc(B.paidOf(money(M.paid, lang), money(M.billed, lang)))}</span></div></div>`,
      V.balanceSum(money(M.balance, lang), money(M.paid, lang), money(M.billed, lang)), null)}
    ${next ? `<p class="fd2-note">${esc(B.nextDue(money(next.balance_cents, lang), dayText(next.due_date, lang)))}</p><a class="btn navy fd-primary" id="fdBalInvoice" href="${esc(dashLink(slug, 'billing', { id: next.id }))}" data-nav>${esc(L.billingQ)}</a>` : `<p class="fd2-note">${esc(V.nothingDue)}</p>`}
    <a class="btn link" href="/c/${esc(slug)}/billing-family" data-nav id="fdBillingAll">${esc(B.all)}</a>`;
  if (pay) pay.innerHTML = `<h2 id="fdPayH">${icon('report')} ${esc(V.timeline)}</h2>
    ${M.events.length ? figureHtml(esc, lang, 'fdPayFig', `<ol class="fv-tl">${M.events.map((e) => `<li class="fv-tl-${e.kind}${e.status ? ` fv-tl-${esc(e.status)}` : ''}">
        <a href="${esc(dashLink(slug, 'billing', { id: e.kind === 'invoice' ? e.id : e.invoice }))}" data-nav class="fv-tl-a" data-id="${esc(e.id)}"><span class="fv-tl-dot" aria-hidden="true"></span>
        <b>${esc(e.kind === 'invoice' ? V.invoice(e.no || '') : V.payment)}</b><span>${esc(cap(dayText(e.day, lang)))} · ${esc(money(e.cents, lang))}${e.status ? ` · ${esc(V.status[e.status] || e.status)}` : ''}</span></a></li>`).join('')}</ol>`,
      V.timelineSum(M.events.filter((e) => e.kind === 'invoice').length, M.events.filter((e) => e.kind === 'payment').length), null)
      : `<p class="muted">${esc(B.none)}</p>`}`;
  if (motionOn()) { entrance(bal); entrance(pay); } else { settle(bal); settle(pay); }
}

// ---- the shell: views, tabs, the address, the child switcher, live updates, swipes, tooltips -------------------------------------
const EASE = 'cubic-bezier(.22,1,.36,1)';          // spring-like settle, no overshoot (calm for families of little ones)
const onDash = () => !!(state && document.getElementById('familyDash') && FFTest.pathname() === state.path);
// write the address for the current state (push: a new entry Back returns to; replace: the same entry)
function writeUrl(mode) {
  const s = stateSearch(location.search, state.ui);
  if (location.search === s) return;
  history[mode === 'push' ? 'pushState' : 'replaceState']({ ...(mode === 'push' ? {} : history.state || {}), fd2: 1 }, '', `${FFTest.pathname()}${s}`);
}
// app.js asks this first on every Back / Forward: while the dashboard is on screen it follows the address itself (no reload)
function onPop() {
  if (!onDash()) { if (window.FFOverlay === onPop) window.FFOverlay = null; return false; }
  const next = readState(location.search);
  const ui = state.ui;
  if ((next.date || null) !== (ui.date || null)) { ui.date = next.date; loadDay(next.date).then(rebuildDay); }
  if (next.view !== ui.view || next.tab !== ui.tab) showView(next.view, next.tab, { history: null });
  if (next.drawer !== (sheet?.open ? ui.drawer : null)) { if (next.drawer) openSheet(next.drawer, null, { fromUrl: true }); else if (sheet?.open) animateClose(); }
  state.ui.drawer = next.drawer;
  return true;
}
function bindShell(ctx) {
  const root = document.getElementById('familyDash');
  window.FFOverlay = onPop;
  placePill(false);
  // the rail and the phone bar: a view; the tabs: a panel (a modified click still opens a new tab)
  root.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    const v = e.target.closest('[data-view]:is(a,button)');
    if (v) { e.preventDefault(); showView(v.dataset.view, v.dataset.tab || null, { history: 'push' }); return; }
    const t = e.target.closest('a[data-tab]');
    if (t) { e.preventDefault(); showView(state.ui.view, t.dataset.tab, { history: 'replace' }); return; }
    const k = e.target.closest('a[data-kid]');
    if (k) { e.preventDefault(); if (k.getAttribute('aria-current') !== 'page') switchChild(k.dataset.kid); return; }
    const cb = e.target.closest('[data-collapse]');
    if (cb) { const body = document.getElementById(cb.dataset.collapse); const open = cb.getAttribute('aria-expanded') !== 'true';
      cb.setAttribute('aria-expanded', String(open)); if (body) { body.hidden = !open; if (open && motionOn()) body.animate([{ opacity: 0, transform: 'translate3d(0,-6px,0)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: EASE }); } return; }
    const dn = e.target.closest('[data-day-step]');
    if (dn) { e.preventDefault(); if (dn.dataset.dayStep === '99') { state.ui.date = null; writeUrl('push'); loadDay(null).then(rebuildDay); } else changeDay(Number(dn.dataset.dayStep)); return; }
    const more = e.target.closest('#fdMoreBtn');
    if (more) { openSheet('more', more); return; }
    const tg = e.target.closest('.fv-tgl');
    if (tg) { const box = document.getElementById(tg.getAttribute('aria-controls')); const open = tg.getAttribute('aria-expanded') !== 'true';
      tg.setAttribute('aria-expanded', String(open)); tg.textContent = open ? tg.dataset.on : tg.dataset.off; if (box) box.hidden = !open;
      tg.closest('.fv')?.classList.toggle('fv-tabled', open); return; }
    const dr = e.target.closest('[data-drawer]');
    if (dr) { e.preventDefault(); e.stopPropagation(); openSheet(dr.dataset.drawer, dr); }
  });
  // keyboard: arrows move through the rail (up / down) and the tabs (left / right); Enter / Space on an SVG segment opens it
  root.addEventListener('keydown', (e) => {
    const seg = e.target.closest?.('[data-drawer][role=button]');
    if (seg && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openSheet(seg.dataset.drawer, seg); return; }
    const list = e.target.closest?.('[role=tablist]'); if (!list) return;
    const items = [...list.querySelectorAll('[role=tab]')]; const i = items.indexOf(e.target); if (i < 0) return;
    const j = arrowIndex(e.key, i, items.length, list.getAttribute('aria-orientation') === 'vertical'); if (j == null) return;
    e.preventDefault();
    const it = items[j];
    if (it.dataset.view) showView(it.dataset.view, null, { history: 'push' }); else showView(state.ui.view, it.dataset.tab, { history: 'replace' });
    (list.id === 'fdTabs' ? document.getElementById(`fdtab-${it.dataset.tab}`) : document.getElementById(`fdvt-${it.dataset.view}`))?.focus();
  });
  bindTips(root);
  bindSwipeViews(root);
}
// switch the view (and / or the tab): the outgoing view fades back, the incoming one comes forward from the side it lies on
function showView(id, tab, { history: mode = 'push' } = {}) {
  if (!state) return;
  const v = viewOf(id);
  const t = v.tabs.includes(tab) ? tab : (v.id === state.ui.view && v.tabs.includes(state.ui.tab) && !tab ? state.ui.tab : (v.tabs[0] || null));
  const prev = state.ui.view, prevTab = state.ui.tab;
  state.ui = { view: v.id, tab: t, drawer: null, date: state.ui.date };
  if (mode) writeUrl(mode);
  const root = document.getElementById('familyDash'); if (!root) return;
  const { ctx } = state, S2 = sw(ctx.lang);
  root.dataset.view = v.id;
  for (const a of root.querySelectorAll('.fd2-vt')) { const on = a.dataset.view === v.id; a.setAttribute('aria-selected', String(on)); a.tabIndex = on ? 0 : -1; }
  for (const a of root.querySelectorAll('.fd2-tb')) { const on = a.dataset.view ? a.dataset.view === v.id : MORE_VIEWS.includes(v.id); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }
  if (prev !== v.id) {
    document.getElementById('fdViewTitle').textContent = S2.views[v.id];
    const tabs = document.getElementById('fdTabs'); tabs.innerHTML = tabsHtml(ctx.esc, S2, state.ui); tabs.setAttribute('aria-label', S2.sub(S2.views[v.id]));
    const out = document.getElementById(`fdv-${prev}`), inn = document.getElementById(`fdv-${v.id}`);
    const dir = VIEWS.findIndex((x) => x.id === v.id) > VIEWS.findIndex((x) => x.id === prev) ? 1 : -1;
    for (const el of [out, inn]) el?.getAnimations().forEach((a) => a.cancel());
    if (!state.built.has(v.id)) buildView(v.id); else { syncPanels(inn); if (motionOn()) entrance(inn, 0.5); }
    if (motionOn() && out) {
      inn.hidden = false;
      out.classList.add('fd2-leaving');
      const a = out.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translate3d(${-24 * dir}px,0,0) scale(.985)` }], { duration: 200, easing: 'ease-in' });
      a.onfinish = () => { out.hidden = true; out.classList.remove('fd2-leaving'); };
      a.oncancel = () => { out.hidden = state?.ui.view !== out.dataset.view; out.classList.remove('fd2-leaving'); };
      inn.animate([{ opacity: 0, transform: `translate3d(${36 * dir}px,0,0) scale(.985)` }, { opacity: 1, transform: 'none' }], { duration: 460, easing: EASE });
    } else { if (out) out.hidden = true; inn.hidden = false; }
    window.scrollTo({ top: 0, behavior: 'auto' });
    placePill(true);
    ctx.live?.(S2.views[v.id]);
  } else if (t !== prevTab) {
    const tabs = document.getElementById('fdTabs');
    for (const a of tabs.querySelectorAll('[data-tab]')) { const on = a.dataset.tab === t; a.setAttribute('aria-selected', String(on)); a.tabIndex = on ? 0 : -1; }
    const inn = document.getElementById(`fdv-${v.id}`);
    syncPanels(inn);
    const p = inn.querySelector(`.fd2-panel[data-tab="${t}"]`);
    if (p && motionOn()) entrance(p, 0.6);
    if (v.id === 'care' && t === 'health') loadHealth();
  }
}
function syncPanels(sec) { for (const p of sec?.querySelectorAll('.fd2-panel') || []) p.hidden = p.dataset.tab !== state.ui.tab; }
// the rail's sliding pill follows the selected view (FLIP: measured, then moved with a transform)
function placePill(animate) {
  const pill = document.getElementById('fdPill'), on = document.querySelector('.fd2-vt[aria-selected="true"]');
  if (!pill || !on || !on.offsetParent) return;
  const y = on.offsetTop, h = on.offsetHeight, was = pill.dataset.y == null ? null : Number(pill.dataset.y);
  pill.style.setProperty('--y', `${y}px`); pill.style.setProperty('--ph', `${h}px`); pill.dataset.y = String(y);
  if (animate && was != null && was !== y && motionOn()) pill.animate([{ transform: `translate3d(0,${was}px,0)` }, { transform: `translate3d(0,${y}px,0)` }], { duration: 380, easing: EASE });
}

// entrance choreography: everything marked data-a in the view rises in, staggered; arcs draw in; numbers count up
function entrance(sec, scale = 1) {
  if (!sec) return;
  settle(sec, true);
  if (!motionOn()) return;
  const items = [...sec.querySelectorAll('[data-a], .fd-kpi, .fd2-panel:not([hidden]) > .card, .fd2-panel:not([hidden]) > .fd2-two > *')].filter((el) => el.offsetParent !== null).slice(0, 24);
  items.forEach((el, i) => el.animate([{ opacity: 0, transform: 'translate3d(0,14px,0) scale(.985)' }, { opacity: 1, transform: 'none' }],
    { duration: 520 * scale, delay: Math.min(i * 45, 420) * scale, easing: EASE, fill: 'backwards' }));
  for (const p of sec.querySelectorAll('[data-len]')) {
    if (p.offsetParent === null && !p.closest('svg')?.getBoundingClientRect().width) continue;
    const len = Number(p.dataset.len); if (!len) continue;
    if (p.classList.contains('fv-ring-fg')) { const end = Number(p.getAttribute('stroke-dashoffset')); p.animate([{ strokeDashoffset: len }, { strokeDashoffset: end }], { duration: 1100, delay: 200, easing: EASE, fill: 'backwards' }); continue; }
    if (p.classList.contains('fv-petal')) { p.animate([{ transform: 'scale(0)' }, { transform: 'scale(1)' }], { duration: 700, delay: 250 + Math.random() * 300, easing: EASE, fill: 'backwards' }); continue; }
    p.style.strokeDasharray = `${len} ${len}`;
    p.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: 1100, delay: 250, easing: EASE, fill: 'backwards' });
  }
  sec.querySelectorAll('.fv-bead, .fv-inc-mark, .fv-plant.fv-grown, .fv-wedge, .fv-sparkle, .fv-pie-fill, .fv-hc, .fv-sky-d').forEach((b, i) => b.animate([{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }],
    { duration: 500, delay: 350 + Math.min(i * 30, 600), easing: EASE, fill: 'backwards' }));
  for (const h of sec.querySelectorAll('.fv-hand')) { h.style.setProperty('transform-origin', `${h.dataset.c}px ${h.dataset.c}px`);
    h.animate([{ transform: `rotate(${-150 - Number(h.dataset.angle)}deg)` }, { transform: 'rotate(0deg)' }], { duration: 1200, delay: 250, easing: EASE, fill: 'backwards' }); }
  const ring = sec.querySelectorAll('.fd-ring-fg');
  for (const rg of ring) { const end = rg.dataset.off; rg.animate([{ strokeDashoffset: rg.getAttribute('stroke-dasharray') }, { strokeDashoffset: end }], { duration: 1100, delay: 200, easing: EASE, fill: 'backwards' }); }
  for (const n of sec.querySelectorAll('.fd-num[data-count]')) countUp(n, 0);
}
// the final state, at once (Reduce Motion, the Still scene switch, a background tab)
function settle(sec) {
  if (!sec) return;
  for (const b of sec.querySelectorAll('.fd-bar-fill[data-h],.fd2-rd-bar[data-h]')) b.style.setProperty('--h', `${b.dataset.h}%`);
  for (const s of sec.querySelectorAll('[data-w]')) s.style.setProperty('--w', `${s.dataset.w}%`);
  for (const rg of sec.querySelectorAll('.fd-ring-fg')) rg.style.strokeDashoffset = rg.dataset.off;
}

// the child switcher: the new child's numbers count from the old ones; nothing reloads the page
async function switchChild(kid) {
  if (!state) return;
  const { ctx } = state, mine = state.mine;
  const before = new Map([...document.querySelectorAll('#familyDash .fd-num[data-count][id], #familyDash [id] > .fd-kpi-val .fd-num[data-count]')].map((n) => [n.closest('[id]').id, Number(n.dataset.count)]));
  document.getElementById('familyDash')?.classList.add('fd2-switching');
  let n, nx; try { [n, nx] = await Promise.all([state.load(kid), state.loadExtras(kid)]); } catch (e) { document.getElementById('familyDash')?.classList.remove('fd2-switching'); ctx.live?.(ctx.friendly(e)); return; }
  if (!state || mine !== loads) return;
  try { localStorage.setItem(state.key, kid); } catch (_) { /* */ }
  const q = new URLSearchParams(location.search); q.set('kid', kid);
  history.replaceState(history.state, '', `${FFTest.pathname()}?${q}`);
  state.d = n; state.view.x = nx; state.billing = state.billing; state.health = null;
  const ui = { ...state.ui, drawer: null };
  state.ui = ui;
  if (ui.date) await loadDay(ui.date);   // a past day stays the same day for the other child
  try { render(ctx, n, state.view); }
  catch (e) { location.assign(`${FFTest.pathname()}?${q}`); return; }   // never a broken page: the full load of that child instead
  if (motionOn()) for (const el of document.querySelectorAll('#familyDash .fd-num[data-count]')) { const id = el.closest('[id]')?.id; if (before.has(id)) countUp(el, before.get(id)); }
  ctx.live?.(words(ctx.lang).day((n.kids || []).find((k) => k.id === n.child)?.first || ''));
}

// a 60-second refresh that changed something: the parts on screen update in place; a new timeline entry slides into the ticker and a
// number that moved ticks to its new value (an element the parent is using, a focused one, is left alone)
function liveUpdate(n, nx) {
  const { ctx } = state, { esc, lang } = ctx, L = words(lang), slug = ctx.c.slug;
  const oldIds = new Set((state.d.today?.timeline || []).map((e) => e.id));
  const oldNums = new Map([...document.querySelectorAll('#fdKpis .fd-kpi .fd-num[data-count]')].map((el) => [el.closest('.fd-kpi').id, Number(el.dataset.count)]));
  state.d = n; state.view.x = nx;
  const cur = (n.kids || []).find((k) => k.id === n.child) || {};
  const parts = [['fdToday', () => todayHtml(esc, L, lang, slug, n, true)], ['fdAttention', () => attentionBandHtml(esc, L, lang, slug, n, nx || {})], ['fdKpis', () => bigKpisHtml(esc, L, lang, slug, n, state.view)],
    ['fdCheckPill', () => pillHtml(esc, L, lang, n, state.view)], ['fdLearnHome', () => learnHomeHtml(esc, L, lang, slug, n, nx || {}, cur)], ['fdNext', () => nextHtml(esc, L, lang, slug, n, nx || {})],
    ['fdMessages', () => messagesHtml(esc, L, lang, slug, n)], ['fdDayList', () => dayListHtml(esc, L, lang, slug, n)]];
  for (const [id, html] of parts) {
    if (state.ui.date && ['fdToday', 'fdCheckPill', 'fdKpis', 'fdDayList'].includes(id)) continue;   // a past day stays as it was
    const el = document.getElementById(id);
    if (el && !el.contains(document.activeElement)) { el.outerHTML = html(); settle(document.getElementById(id)?.parentElement); }
  }
  // the views not on screen are rebuilt when next shown
  for (const v of [...state.built]) if (v !== state.ui.view) state.built.delete(v);
  if (!motionOn()) return;
  for (const li of document.querySelectorAll('#fdEntries .fd-entry')) if (!oldIds.has(li.dataset.id)) { li.classList.add('fd2-new');
    li.animate([{ opacity: 0, transform: 'translate3d(0,-14px,0)' }, { opacity: 1, transform: 'none' }], { duration: 520, easing: EASE }); }
  for (const el of document.querySelectorAll('#fdKpis .fd-kpi .fd-num[data-count]')) { const was = oldNums.get(el.closest('.fd-kpi').id); if (was != null && was !== Number(el.dataset.count)) countUp(el, was); }
}

// rich tooltips: hover with a fine pointer, or keyboard focus, on anything with data-tip
function bindTips(root) {
  const tip = document.getElementById('fdTip'); if (!tip) return;
  const fine = typeof matchMedia === 'function' && matchMedia('(hover: hover) and (pointer: fine)').matches;
  const show = (t) => { tip.textContent = t.dataset.tip; tip.hidden = false; const r = t.getBoundingClientRect();
    tip.style.setProperty('--tx', `${Math.round(Math.min(innerWidth - 16, Math.max(16, r.left + r.width / 2)))}px`); tip.style.setProperty('--ty', `${Math.round(r.top)}px`); };
  const hide = () => { tip.hidden = true; };
  if (fine) { root.addEventListener('pointerover', (e) => { const t = e.target.closest?.('[data-tip]'); if (t) show(t); }); root.addEventListener('pointerout', (e) => { if (e.target.closest?.('[data-tip]')) hide(); }); }
  root.addEventListener('focusin', (e) => { const t = e.target.closest?.('[data-tip]'); if (t) show(t); else hide(); });
  root.addEventListener('focusout', hide);
  window.addEventListener('scroll', hide, { passive: true });
}
// phones: a horizontal swipe on the stage moves to the next / previous view (never inside something that scrolls sideways)
function bindSwipeViews(root) {
  const stage = document.getElementById('fdStage'); if (!stage) return;
  let x0 = null, y0 = 0, t0 = 0;
  stage.addEventListener('touchstart', (e) => {
    const t = e.target;
    x0 = e.touches.length === 1 && !t.closest('.fd-kids,.fd2-tabs,.fd-photo-strip,.fd-strip,.fd-menu-days,.fv-heat,.fd2-pies,input,textarea,select,[data-noswipe]') ? e.touches[0].clientX : null;
    y0 = e.touches[0].clientY; t0 = performance.now();
  }, { passive: true });
  stage.addEventListener('touchend', (e) => {
    if (x0 == null || !matchMedia('(max-width: 767px)').matches) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 2 || performance.now() - t0 > 700) return;
    const to = neighbour(state.ui.view, dx < 0 ? 1 : -1);
    if (to) showView(to, null, { history: 'push' });
  }, { passive: true });
}

// Motion: press feedback, the drawer for KPI tiles, the depth planes. The entrance choreography is entrance() (per view, when shown).
// With Reduce Motion or the Still scene switch nothing moves and every final value is already on screen (the HTML holds it).
function bindMotion(ctx) {
  void ctx;
  const root = document.getElementById('familyDash');
  if (!root) return;
  const top = document.getElementById('top');   // the sticky glass header: the stage bar sticks just under it
  if (top) document.documentElement.style.setProperty('--fd-top', `${top.offsetHeight}px`);
  setTimeout(() => root.classList.remove('fd-anim'), motionOn() ? 1600 : 0);
  // a KPI tile opens its detail drawer (a bottom sheet on phones); a modified click (new tab) still follows the link
  root.addEventListener('click', (e) => {
    const t = e.target.closest('a.fd-kpi[data-sheet]');
    if (!t || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0 || !state) return;
    if (!sheetBody(t.dataset.sheet, state.ctx, state.d, state.view)) return;   // no detail for this one: the link opens its page
    e.preventDefault(); e.stopPropagation();
    openSheet(t.dataset.sheet, t);
  }, true);
  installDepth(root);
  // press feedback on pointer-down for every tappable thing on the dashboard (iOS shows :active late without it); a micro-reaction
  root.addEventListener('pointerdown', (e) => { const t = e.target.closest('a,button,summary,label.choice,[role=button]'); if (t && root.contains(t)) { t.classList.add('is-pressed');
    const up = () => { t.classList.remove('is-pressed'); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
    window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up); } });
}
// a count-up that settles on the real figure (never stops at zero: a hidden tab or a missed frame shows the final value)
function countUp(el, from = 0) {
  const to = Number(el.dataset.count), suffix = el.dataset.suffix || '';
  if (!Number.isFinite(to) || to === from) { el.textContent = `${to}${suffix}`; return; }
  const t0 = performance.now(), ms = 900;
  const settleN = () => { el.textContent = `${to}${suffix}`; };
  const fail = setTimeout(settleN, ms + 400);
  const step = (t) => { const p = Math.min(1, (t - t0) / ms); el.textContent = `${Math.round(from + (to - from) * (1 - (1 - p) ** 3))}${suffix}`; if (p < 1 && document.visibilityState === 'visible') requestAnimationFrame(step); else { clearTimeout(fail); settleN(); } };
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
  sheet.className = 'fd-sheet fd2-drawer'; sheet.id = 'fdSheet'; sheet.setAttribute('aria-labelledby', 'fdSheetH');
  document.body.appendChild(sheet);
  sheet.addEventListener('cancel', (e) => { e.preventDefault(); closeSheet(); });
  sheet.addEventListener('click', (e) => { if (e.target === sheet) closeSheet(); });     // the backdrop
  sheet.addEventListener('transitionend', (e) => { if (e.target.classList?.contains('fd-sheet-panel') && sheet.dataset.state === 'closing') finishClose(); });
  return sheet;
}
// opts.fromUrl: the address already says ?drawer= (a reload, a shared link, Forward): no new history entry
function openSheet(kind, from, opts = {}) {
  if (!state) return;
  window.FFOverlay = onPop;   // app.js: Back closes the drawer first
  const { ctx, d, view } = state;
  const body = kind === 'more' ? moreSheet(ctx) : sheetBody(kind, ctx, d, view);
  if (!body) { if (opts.fromUrl) { state.ui.drawer = null; writeUrl('replace'); } return; }
  const el = sheetEl();
  const L = words(ctx.lang), esc = ctx.esc;
  sheetFrom = from || sheetFrom || null;
  el.dataset.kind = kind;
  el.innerHTML = `<div class="fd-sheet-panel"><div class="fd-grabber" aria-hidden="true"></div>
    <header class="fd-sheet-head"><h2 id="fdSheetH">${esc(body.title)}</h2><button class="fd-sheet-x" type="button" aria-label="${esc(L.sh.close)}">${icon('arrow')}</button></header>
    <div class="fd-sheet-body">${body.html}</div>
    ${body.href ? `<a class="btn navy fd-primary fd-sheet-go" id="fdSheetGo" href="${esc(body.href)}" data-nav>${esc(body.go || sw(ctx.lang).openFull)}</a>` : ''}</div>`;
  el.querySelector('.fd-sheet-x').addEventListener('click', () => closeSheet());
  el.querySelector('#fdSheetGo')?.addEventListener('click', () => {           // the global router follows the link; the drawer goes away
    if (history.state?.fdSheet) history.replaceState(null, '', `${FFTest.pathname()}${stateSearch(location.search, { ...state.ui, drawer: null })}`);
    finishClose(true);
  });
  el.querySelectorAll('[data-view]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); const v = a.dataset.view; finishClose(true);
    if (history.state?.fdSheet) { history.replaceState({ fd2: 1 }, '', `${FFTest.pathname()}${stateSearch(location.search, { ...state.ui, drawer: null })}`); }
    showView(v, null, { history: 'push' }); }));
  el.querySelectorAll('a.fd-kpi[data-sheet], .fd-sheet-body [data-drawer]').forEach((t) => t.addEventListener('click', (e) => {
    const k = t.dataset.sheet || t.dataset.drawer;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || !(k === 'more' || sheetBody(k, state.ctx, state.d, state.view))) return;
    e.preventDefault(); e.stopPropagation(); openSheet(k, sheetFrom);
  }));
  el.querySelectorAll('.fd-sheet-body [role=button][data-drawer]').forEach((t) => t.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSheet(t.dataset.drawer, sheetFrom); } }));
  for (const b of el.querySelectorAll('[data-w]')) b.style.setProperty('--w', `${b.dataset.w}%`);
  for (const b of el.querySelectorAll('[data-h]')) b.style.setProperty('--h', `${b.dataset.h}%`);
  bindSwipe(el);
  const wasOpen = el.open;
  if (!wasOpen) { el.dataset.state = 'closed'; el.showModal(); }
  if (!opts.fromUrl && state.ui.drawer !== kind) {
    state.ui.drawer = kind;
    if (wasOpen && history.state?.fdSheet) writeUrl('replace');
    else history.pushState({ ...(history.state || {}), fdSheet: 1, fd2: 1 }, '', `${FFTest.pathname()}${stateSearch(location.search, state.ui)}`);
  } else state.ui.drawer = kind;
  document.documentElement.classList.add('fd-locked');
  document.getElementById('familyDash')?.classList.add('fd2-dim');
  if (motionOn()) requestAnimationFrame(() => requestAnimationFrame(() => { el.dataset.state = 'open'; }));
  else el.dataset.state = 'open';
  if (motionOn()) for (const p of el.querySelectorAll('[data-len]')) { const len = Number(p.dataset.len); if (!len || p.classList.contains('fv-petal') || p.classList.contains('fv-ring-fg')) continue;
    p.style.strokeDasharray = `${len} ${len}`; p.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: 900, delay: 150, easing: EASE, fill: 'backwards' }); }
  ctx.live?.(body.title);
}
// every way of closing goes through the history entry, so Back and the X behave the same
function closeSheet() {
  if (history.state?.fdSheet) { history.back(); return; }
  if (state) { state.ui.drawer = null; writeUrl('replace'); }
  animateClose();
}
function animateClose() {
  if (!sheet || !sheet.open) return;
  if (state) state.ui.drawer = null;
  const panel = sheet.querySelector('.fd-sheet-panel');
  if (panel) panel.style.removeProperty('transform');
  if (!motionOn()) return finishClose();
  sheet.dataset.state = 'closing';
  document.getElementById('familyDash')?.classList.remove('fd2-dim');
  setTimeout(() => { if (sheet?.dataset.state === 'closing') finishClose(); }, 500);   // a transition that never ends still closes
}
function finishClose(navigating = false) {
  if (!sheet) return;
  sheet.dataset.state = 'closed';
  if (sheet.open) sheet.close();
  if (state) state.ui.drawer = null;
  document.documentElement.classList.remove('fd-locked');
  document.getElementById('familyDash')?.classList.remove('fd2-dim');
  if (!navigating) sheetFrom?.focus?.({ preventScroll: true });
  sheetFrom = null;
}
// the phone's "More": the views that are not on the bottom bar, and the quick actions
function moreSheet(ctx) {
  const S2 = sw(ctx.lang), esc = ctx.esc;
  return { title: S2.moreTitle, html: `<ul class="fd2-morelist">${MORE_VIEWS.map((v) => `<li><a class="fd2-morelink" href="${esc(viewHref(v))}" data-view="${v}">${icon(viewOf(v).icon)}<span>${esc(S2.views[v])}</span>${icon('arrow')}</a></li>`).join('')}</ul>` };
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
    default: return itemBody(kind, ctx, d, view);   // an item (entry:, incident:, day:, plate:, feel:, area:); else the page opens straight away
  }
}
// the drawer for one item: a timeline entry, an incident marker, a day of the month, a small plate, a feeling, an area of learning.
// Each one says what it is and opens the exact item ("Open full page": the deep links, dashLink).
function itemBody(kind, ctx, d, view) {
  if (kind === 'clock') {
    const L = words(ctx.lang), cur = (d.kids || []).find((k) => k.id === d.child) || {};
    return { title: L.v2.clockH(cur.first || ''), href: dashLink(ctx.c.slug, 'day', { kid: d.child }), go: L.sh.goDay(cur.first || ''),
      html: `<div class="fd2-dr-clock">${clockFigHtml(360, 'fdClockFigDr')}${clockKeyHtml(ctx.esc, L, clockModelNow())}</div>` };
  }
  if (kind === 'numbers') {
    const L = words(ctx.lang), cur = (d.kids || []).find((k) => k.id === d.child) || {};
    return { title: L.v2.moreNumsH(cur.first || ''), html: kpiHtml(ctx.esc, L, ctx.lang, ctx.c.slug, d, view, 'more') };
  }
  const m = /^(entry|incident|day|plate|feel|area):(.+)$/.exec(kind || '');
  if (!m) return null;
  const [, type, id] = m;
  const { esc, lang } = ctx, L = words(lang), S = L.sh, V = vw(lang), slug = ctx.c.slug;
  const cur = (d.kids || []).find((k) => k.id === d.child) || {}, f = cur.first || '';
  const st = view.x?.stats || null;
  const longDay = (iso) => cap(dayText(iso, lang, { weekday: 'long', month: 'long', day: 'numeric' }));
  if (type === 'entry') {
    const e = (d.today?.timeline || []).find((x) => x.id === id); if (!e) return null;
    let art = `<div class="fd2-dr-art">${entryArt(esc, e)}</div>`;
    if (e.kind === 'meal') {
      const meal = (st?.meals_today || []).find((x) => x.time === e.time || x.meal === e.code);
      if (meal) { const P = plateModel(meal); art = `<div class="fd2-dr-plate">${plateSvg(P, { esc })}<ul class="fd2-plate-key">${P.items.map((it, j) => `<li class="fv-fk-${j % 4}"><span>${esc(it.name || S.plate)}</span><b>${esc(S.amount[it.amount] || it.amount || V.nothing)}</b></li>`).join('')}</ul></div>`; }
    } else if (e.kind === 'nap') {
      const M = moonModel(st, String(d.date).slice(0, 10));
      if (M) art = `<div class="fd2-dr-moon">${moonSvg(M, { esc, lang, todayText: M.today == null ? '' : minutesText(M.today, lang), usualText: M.usual == null ? '' : minutesText(M.usual, lang) })}${M.usual != null ? `<p class="fd2-note">${esc(V.usual(minutesText(M.usual, lang)))}</p>` : ''}</div>`;
    }
    return { title: L.v2.entry(cap(V.kinds[e.kind] || e.kind), e.time), href: dashLink(slug, 'day', { kid: d.child }), go: S.goDay(f),
      html: `${art}<p class="fd2-dr-words">${esc(cap(e.words))}</p>` };
  }
  if (type === 'incident') {
    const i = (d.today?.incidents || []).find((x) => x.id === id); if (!i) return null;
    return { title: L.v2.incidentH, href: dashLink(slug, 'incident', { id }), go: i.acknowledged ? L.open : L.readAck,
      html: `<p class="fd-incident">${icon('incident')}<span>${esc(L.incident(i.time))}${i.acknowledged ? ` ${esc(L.incidentAck)}` : ''}</span></p>` };
  }
  if (type === 'day') {
    const row = (st?.days || []).find((x) => String(x.day).slice(0, 10) === id);
    const c = (view.x?.calendar || []).find((x) => String(x.day).slice(0, 10) === id);
    const text = row ? (row.closed ? S.closedDay : row.present ? [row.in ? `${S.in} ${row.in}` : '', row.out ? `${S.out} ${row.out}` : ''].filter(Boolean).join(' · ') || S.present : S.absent)
      : c ? `${lang === 'es' ? (c.label_es || c.label) : c.label} · ${c.status === 'closed' ? L.closed : L.early}` : V.ahead;
    const past = id <= String(d.date).slice(0, 10);
    return { title: longDay(id), href: past && row?.present ? dashLink(slug, 'day', { kid: d.child, date: id }) : dashLink(slug, 'calendar', { date: id }), go: past && row?.present ? S.goDay(f) : S.goCal,
      html: `<p class="fd2-dr-words">${esc(text)}</p>` };
  }
  if (type === 'plate') {
    const p = (weekPlatesModel(st) || []).find((x) => x.day === id); if (!p) return null;
    return { title: L.v2.plateH(longDay(id)), href: dashLink(slug, 'day', { kid: d.child, date: id }), go: S.goDay(f),
      html: `<div class="fd2-dr-plate">${pieSvg(p.share, { size: 140 })}<p class="fd2-dr-words">${esc(p.share == null ? V.nothing : L.v2.shareOf(Math.round(p.share * 100)))}</p></div>` };
  }
  if (type === 'feel') {
    const x = (st?.moods || []).find((y) => String(y.day).slice(0, 10) === id); if (!x) return null;
    return { title: L.v2.feelH(longDay(id)), href: dashLink(slug, 'day', { kid: d.child, date: id }), go: S.goDay(f),
      html: `<div class="fd2-dr-art"><img src="img/friends/${esc(FEEL_ART[x.feeling] || 'lumi')}-480.webp" alt="" width="120" height="120" loading="lazy"></div><p class="fd2-dr-words">${esc((FEEL[lang] || FEEL.en)[x.feeling] || x.feeling)}</p>` };
  }
  if (type === 'area') {
    const F = flowerModel(st); const a = F?.areas.find((x) => x.domain === id); if (!a) return null;
    const D = DOMAIN[lang === 'es' ? 'es' : 'en'];
    return { title: D[a.domain] || a.domain, href: dashLink(slug, 'report', { kid: d.child, id: F.report }), go: S.goReport,
      html: `<div class="fd2-dr-flower">${flowerSvg(a, { size: 180 })}</div><ul class="fd-sh-list"><li><b>${esc(V.lv.secure)}</b><span>${a.secure}</span></li><li><b>${esc(V.lv.developing)}</b><span>${a.developing}</span></li><li><b>${esc(V.lv.emerging)}</b><span>${a.emerging}</span></li>
        ${a.max ? `<li><b>${esc(V.points(a.points, a.max))}</b></li>` : ''}</ul><p class="mini muted">${esc(V.ownNumbers)}</p>` };
  }
  return null;
}
const AMOUNT_WIDTH = { none: 2, a_little: 25, about_half: 50, most: 75, all: 100 };
