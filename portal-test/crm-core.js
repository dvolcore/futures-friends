// CRM core shared by the director pages (hub/web/crm-ui.js), the family link pages and the worker (hub/worker/crm-sequences.mjs):
// the built-in wording of every automatic message (English + Spanish DRAFT), how a message is rendered, and the labels of the stages,
// sources and lost reasons. Plain ES module with no imports: the browser loads it from /crm-core.js and node --test / the worker import it.
//
// Spanish: every Spanish string here is a DRAFT pending review by the center's native-speaking Spanish teacher (same rule as i18n.js;
// register "usted"). When the bilingual-everywhere track merges, the UI strings (UI below) move into i18n.js unchanged: same keys,
// same {placeholder} form, same t(key, vars, lang) call.
//
// A center may reword any message (crm_templates); the unsubscribe link, the postal address and "Reply STOP" are added by render() and
// can never be removed by an edit (CAN-SPAM / TCPA).

export const TEMPLATE_KEYS = Object.freeze(['inquiry_1', 'inquiry_2', 'inquiry_3', 'tour_confirm', 'tour_reminder', 'no_show_1', 'no_show_2',
  'post_tour_1', 'post_tour_2', 'waitlist_joined', 'waitlist_checkin', 'offer_made', 'offer_reminder', 'reenroll_1', 'reenroll_2', 'reenroll_3', 'packet_sent', 'packet_reminder']);
export const PLACEHOLDERS = Object.freeze(['family_name', 'child_first', 'center_name', 'tour_time', 'tour_link', 'manage_link', 'status_link', 'place',
  'queue_size', 'room_name', 'offer_expires', 'campaign', 'due_by', 'reenroll_link', 'contact', 'packet_link']);

// What each sequence is for (the editor shows it next to the wording)
export const SEQUENCES = Object.freeze({
  inquiry: { en: 'New inquiry: 1, 3 and 7 days later, until a tour is booked', es: 'Consulta nueva: 1, 3 y 7 días después, hasta que reserven una visita' },
  tour: { en: 'Tour booked: a confirmation with the reschedule / cancel link, and a reminder 24 hours before', es: 'Visita reservada: confirmación con el enlace para cambiar o cancelar, y recordatorio 24 horas antes' },
  no_show: { en: 'Missed tour: 2 hours and 3 days later, with a link to pick a new time', es: 'Visita perdida: 2 horas y 3 días después, con un enlace para elegir otra hora' },
  post_tour: { en: 'After the tour: 1 and 5 days later, until they apply', es: 'Después de la visita: 1 y 5 días después, hasta que presenten la solicitud' },
  waitlist: { en: 'Waitlist: when they join, then a check-in every 30 days with their place', es: 'Lista de espera: al entrar, y luego cada 30 días con su lugar' },
  offer: { en: 'Seat offer: when it is made, and 24 hours before it expires', es: 'Oferta de lugar: al hacerla, y 24 horas antes de que venza' },
  reenroll: { en: 'Re-enrollment: when it opens, a week later, and 3 days before the answer-by date', es: 'Reinscripción: al abrir, una semana después y 3 días antes de la fecha límite' },
  packet: { en: 'Enrollment packet: when the family accepts a seat, and 3 days later until they send it', es: 'Paquete de inscripción: cuando la familia acepta un lugar, y 3 días después hasta que lo envíe' },
});
export const TEMPLATE_SEQUENCE = Object.freeze(Object.fromEntries(TEMPLATE_KEYS.map((k) => [k, k.replace(/_(\d|confirm|reminder|joined|checkin|made|sent)$/, '')])));

export const DEFAULT_TEMPLATES = ({
  inquiry_1: {
    en: { subject: 'Thank you for your interest in {center_name}', sms: '{center_name}: thanks for reaching out! We would love to show you around. {tour_link}',
      body: 'Hello {family_name},\n\nThank you for asking about {center_name}. The best way to get to know us is a short tour: you will see the rooms, meet the teachers and ask anything you like.\n\n{tour_link}\n\n{contact}' },
    es: { subject: 'Gracias por su interés en {center_name}', sms: '{center_name}: ¡gracias por escribirnos! Nos encantaría mostrarle el centro. {tour_link}',
      body: 'Hola, {family_name}:\n\nGracias por preguntar por {center_name}. La mejor manera de conocernos es una visita corta: verá los salones, conocerá a las maestras y podrá preguntar lo que quiera.\n\n{tour_link}\n\n{contact}' },
  },
  inquiry_2: {
    en: { subject: 'Would you like to visit {center_name}?', sms: '{center_name}: we still have tour times this week. {tour_link}',
      body: 'Hello {family_name},\n\nWe wanted to check in. If a tour would help you decide, we have times this week and next.\n\n{tour_link}\n\nQuestions about schedules, ages or tuition? Just reply to this email.\n\n{contact}' },
    es: { subject: '¿Le gustaría visitar {center_name}?', sms: '{center_name}: todavía tenemos horarios de visita esta semana. {tour_link}',
      body: 'Hola, {family_name}:\n\nQueríamos saber cómo está. Si una visita le ayuda a decidir, tenemos horarios esta semana y la próxima.\n\n{tour_link}\n\n¿Preguntas sobre horarios, edades o costos? Solo responda a este correo.\n\n{contact}' },
  },
  inquiry_3: {
    en: { subject: 'We are here when you are ready', sms: '{center_name}: we are here when you are ready. Reply anytime with questions.',
      body: 'Hello {family_name},\n\nThis is our last note for now. When you are ready to visit or have a question, we are glad to help.\n\n{tour_link}\n\n{contact}' },
    es: { subject: 'Aquí estamos cuando esté listo', sms: '{center_name}: aquí estamos cuando esté listo. Escríbanos si tiene preguntas.',
      body: 'Hola, {family_name}:\n\nEste es nuestro último mensaje por ahora. Cuando quiera visitarnos o tenga una pregunta, con gusto le ayudamos.\n\n{tour_link}\n\n{contact}' },
  },
  tour_confirm: {
    en: { subject: 'Your tour of {center_name} is booked', sms: '{center_name}: your tour is booked for {tour_time}. Change or cancel: {manage_link}',
      body: 'Hello {family_name},\n\nYour tour of {center_name} is booked for {tour_time}.\n\nNeed another time, or cannot come? Change or cancel here: {manage_link}\n\nSee you soon!\n\n{contact}' },
    es: { subject: 'Su visita a {center_name} está reservada', sms: '{center_name}: su visita es el {tour_time}. Cambiar o cancelar: {manage_link}',
      body: 'Hola, {family_name}:\n\nSu visita a {center_name} está reservada para el {tour_time}.\n\n¿Necesita otro horario o no puede venir? Cámbiela o cancélela aquí: {manage_link}\n\n¡Hasta pronto!\n\n{contact}' },
  },
  tour_reminder: {
    en: { subject: 'Reminder: your tour of {center_name} is tomorrow', sms: '{center_name}: reminder, your tour is {tour_time}. Change or cancel: {manage_link}',
      body: 'Hello {family_name},\n\nA friendly reminder: your tour of {center_name} is {tour_time}.\n\nChange or cancel: {manage_link}\n\n{contact}' },
    es: { subject: 'Recordatorio: su visita a {center_name} es mañana', sms: '{center_name}: recordatorio, su visita es el {tour_time}. Cambiar o cancelar: {manage_link}',
      body: 'Hola, {family_name}:\n\nUn recordatorio: su visita a {center_name} es el {tour_time}.\n\nCambiar o cancelar: {manage_link}\n\n{contact}' },
  },
  no_show_1: {
    en: { subject: 'We missed you today', sms: '{center_name}: we missed you at your tour. Pick a new time: {manage_link}',
      body: 'Hello {family_name},\n\nWe missed you at your tour today. Life with little ones is busy: pick a new time that works better.\n\n{manage_link}\n\n{contact}' },
    es: { subject: 'Le extrañamos hoy', sms: '{center_name}: le extrañamos en su visita. Elija otro horario: {manage_link}',
      body: 'Hola, {family_name}:\n\nLe extrañamos hoy en su visita. Con niños pequeños todo es muy ocupado: elija otro horario que le funcione mejor.\n\n{manage_link}\n\n{contact}' },
  },
  no_show_2: {
    en: { subject: 'Still want to see {center_name}?', sms: '{center_name}: still want a tour? Pick a time: {manage_link}',
      body: 'Hello {family_name},\n\nIf you would still like to see {center_name}, a new tour time is one click away.\n\n{manage_link}\n\n{contact}' },
    es: { subject: '¿Todavía quiere conocer {center_name}?', sms: '{center_name}: ¿todavía quiere una visita? Elija un horario: {manage_link}',
      body: 'Hola, {family_name}:\n\nSi todavía quiere conocer {center_name}, puede elegir otro horario de visita con un clic.\n\n{manage_link}\n\n{contact}' },
  },
  post_tour_1: {
    en: { subject: 'Thank you for visiting {center_name}', sms: '{center_name}: thank you for visiting! Reply with any questions about next steps.',
      body: 'Hello {family_name},\n\nThank you for visiting {center_name}. We enjoyed meeting you.\n\nWhen you are ready, the next step is the enrollment application. Reply to this email and we will send it, or ask us anything.\n\n{contact}' },
    es: { subject: 'Gracias por visitar {center_name}', sms: '{center_name}: ¡gracias por visitarnos! Escríbanos si tiene preguntas sobre los siguientes pasos.',
      body: 'Hola, {family_name}:\n\nGracias por visitar {center_name}. Fue un gusto conocerle.\n\nCuando esté listo, el siguiente paso es la solicitud de inscripción. Responda a este correo y se la enviamos, o pregúntenos lo que quiera.\n\n{contact}' },
  },
  post_tour_2: {
    en: { subject: 'Any questions after your visit?', sms: '{center_name}: any questions after your visit? We are happy to help.',
      body: 'Hello {family_name},\n\nWe wanted to follow up on your visit. Seats can fill up, so let us know if you would like to apply.\n\n{contact}' },
    es: { subject: '¿Alguna pregunta después de su visita?', sms: '{center_name}: ¿alguna pregunta después de su visita? Con gusto le ayudamos.',
      body: 'Hola, {family_name}:\n\nQueríamos dar seguimiento a su visita. Los lugares pueden llenarse, así que avísenos si quiere presentar la solicitud.\n\n{contact}' },
  },
  waitlist_joined: {
    en: { subject: 'You are on the waitlist at {center_name}', sms: '{center_name}: you are on our waitlist (number {place}). Check anytime: {status_link}',
      body: 'Hello {family_name},\n\n{child_first} is on the waitlist for {room_name} at {center_name}. Today you are number {place} of {queue_size}.\n\nSee your place, and how the order is decided, anytime: {status_link}\n\n{contact}' },
    es: { subject: 'Está en la lista de espera de {center_name}', sms: '{center_name}: está en nuestra lista de espera (número {place}). Consulte cuando quiera: {status_link}',
      body: 'Hola, {family_name}:\n\n{child_first} está en la lista de espera para {room_name} en {center_name}. Hoy tiene el número {place} de {queue_size}.\n\nVea su lugar, y cómo se decide el orden, cuando quiera: {status_link}\n\n{contact}' },
  },
  waitlist_checkin: {
    en: { subject: 'Your waitlist update from {center_name}', sms: '{center_name}: you are number {place} on the waitlist. Details: {status_link}',
      body: 'Hello {family_name},\n\nA monthly update: {child_first} is number {place} of {queue_size} on the waitlist for {room_name}.\n\nStill interested? You do not need to do anything. To leave the list, use the same page: {status_link}\n\n{contact}' },
    es: { subject: 'Su actualización de la lista de espera de {center_name}', sms: '{center_name}: tiene el número {place} en la lista de espera. Detalles: {status_link}',
      body: 'Hola, {family_name}:\n\nUna actualización mensual: {child_first} tiene el número {place} de {queue_size} en la lista de espera para {room_name}.\n\n¿Sigue interesado? No tiene que hacer nada. Para salir de la lista, use la misma página: {status_link}\n\n{contact}' },
  },
  offer_made: {
    en: { subject: 'A seat is available for {child_first} at {center_name}', sms: '{center_name}: a seat in {room_name} is yours until {offer_expires}. Answer here: {status_link}',
      body: 'Hello {family_name},\n\nGood news: a seat in {room_name} is available for {child_first}. We are holding it for you until {offer_expires}.\n\nAccept or decline here: {status_link}\n\nIf we do not hear from you by then, the seat goes to the next family in line.\n\n{contact}' },
    es: { subject: 'Hay un lugar para {child_first} en {center_name}', sms: '{center_name}: un lugar en {room_name} es suyo hasta el {offer_expires}. Responda aquí: {status_link}',
      body: 'Hola, {family_name}:\n\nBuenas noticias: hay un lugar en {room_name} para {child_first}. Se lo guardamos hasta el {offer_expires}.\n\nAcéptelo o recházelo aquí: {status_link}\n\nSi no sabemos de usted para entonces, el lugar pasa a la siguiente familia de la lista.\n\n{contact}' },
  },
  offer_reminder: {
    en: { subject: 'Reminder: your seat offer ends soon', sms: '{center_name}: your seat offer ends {offer_expires}. Answer here: {status_link}',
      body: 'Hello {family_name},\n\nThe seat we are holding for {child_first} in {room_name} is held until {offer_expires}.\n\nAccept or decline: {status_link}\n\n{contact}' },
    es: { subject: 'Recordatorio: su oferta de lugar vence pronto', sms: '{center_name}: su oferta de lugar vence el {offer_expires}. Responda aquí: {status_link}',
      body: 'Hola, {family_name}:\n\nEl lugar que guardamos para {child_first} en {room_name} se guarda hasta el {offer_expires}.\n\nAceptar o rechazar: {status_link}\n\n{contact}' },
  },
  reenroll_1: {
    en: { subject: 'Is {child_first} returning for {campaign}?', sms: null,
      body: 'Hello {family_name},\n\nWe are planning {campaign} at {center_name}. Please tell us by {due_by} whether {child_first} is coming back.\n\nAnswer here (one click): {reenroll_link}\n\n{contact}' },
    es: { subject: '¿{child_first} regresará para {campaign}?', sms: null,
      body: 'Hola, {family_name}:\n\nEstamos planeando {campaign} en {center_name}. Por favor díganos antes del {due_by} si {child_first} regresará.\n\nResponda aquí (un clic): {reenroll_link}\n\n{contact}' },
  },
  reenroll_2: {
    en: { subject: 'Reminder: re-enrollment for {campaign}', sms: null,
      body: 'Hello {family_name},\n\nA reminder to tell us whether {child_first} is returning for {campaign}. Please answer by {due_by}.\n\n{reenroll_link}\n\n{contact}' },
    es: { subject: 'Recordatorio: reinscripción para {campaign}', sms: null,
      body: 'Hola, {family_name}:\n\nUn recordatorio para que nos diga si {child_first} regresará para {campaign}. Por favor responda antes del {due_by}.\n\n{reenroll_link}\n\n{contact}' },
  },
  reenroll_3: {
    en: { subject: 'Last call: re-enrollment closes {due_by}', sms: null,
      body: 'Hello {family_name},\n\nRe-enrollment for {campaign} closes on {due_by}. After that, seats are offered to families on the waitlist.\n\n{reenroll_link}\n\n{contact}' },
    es: { subject: 'Último aviso: la reinscripción cierra el {due_by}', sms: null,
      body: 'Hola, {family_name}:\n\nLa reinscripción para {campaign} cierra el {due_by}. Después, los lugares se ofrecen a las familias de la lista de espera.\n\n{reenroll_link}\n\n{contact}' },
  },
});

Object.assign(DEFAULT_TEMPLATES, {
  packet_sent: {
    en: { subject: 'Next step: the enrollment packet for {child_first}', sms: '{center_name}: please complete the enrollment packet for {child_first}: {packet_link}',
      body: 'Hello {family_name},\n\nThank you for accepting the seat for {child_first} at {center_name}. Please complete the enrollment packet online: your child\'s information, contacts and pickup list, health and permissions, the center\'s policies, and the tuition agreement you sign at the end.\n\n{packet_link}\n\nIt saves as you go, and you can come back with the same link. Questions? Reply to this email.\n\n{contact}' },
    es: { subject: 'Siguiente paso: el paquete de inscripción de {child_first}', sms: '{center_name}: por favor complete el paquete de inscripción de {child_first}: {packet_link}',
      body: 'Hola, {family_name}:\n\nGracias por aceptar el lugar para {child_first} en {center_name}. Por favor complete el paquete de inscripción en línea: los datos de su hijo o hija, los contactos y la lista de recogida, la salud y los permisos, las políticas del centro y el acuerdo de colegiatura que firma al final.\n\n{packet_link}\n\nSe guarda mientras avanza y puede volver con el mismo enlace. ¿Preguntas? Responda a este correo.\n\n{contact}' },
  },
  packet_reminder: {
    en: { subject: 'Reminder: the enrollment packet for {child_first}', sms: '{center_name}: a reminder to finish the enrollment packet for {child_first}: {packet_link}',
      body: 'Hello {family_name},\n\nA friendly reminder to finish the enrollment packet for {child_first}. We need it before the first day.\n\n{packet_link}\n\n{contact}' },
    es: { subject: 'Recordatorio: el paquete de inscripción de {child_first}', sms: '{center_name}: un recordatorio para terminar el paquete de inscripción de {child_first}: {packet_link}',
      body: 'Hola, {family_name}:\n\nUn recordatorio para terminar el paquete de inscripción de {child_first}. Lo necesitamos antes del primer día.\n\n{packet_link}\n\n{contact}' },
  },
});
Object.freeze(DEFAULT_TEMPLATES);

const FOOT = {
  en: { unsub: 'Stop these emails', why: (c) => `You get these emails because you contacted ${c}.`, whyFamily: (c) => `You get this email because your child is enrolled at ${c}.`,
        prefs: 'Your email choices', stop: 'Reply STOP to opt out.', call: 'Call us', write: 'Write to us',
        tour: 'Book a tour', tourAsk: 'Reply to this email to set up a tour.' },
  es: { unsub: 'Dejar de recibir estos correos', why: (c) => `Recibe estos correos porque se comunicó con ${c}.`, whyFamily: (c) => `Recibe este correo porque su hijo o hija está inscrito en ${c}.`,
        prefs: 'Sus opciones de correo', stop: 'Responda STOP para no recibir más.', call: 'Llámenos', write: 'Escríbanos',
        tour: 'Reservar una visita', tourAsk: 'Responda a este correo para programar una visita.' },
};
const pickLang = (l) => (String(l ?? '').toLowerCase().startsWith('es') ? 'es' : 'en');

export function fill(text, vars) {
  return String(text ?? '').replace(/\{(\w+)\}/g, (m, k) => (Object.prototype.hasOwnProperty.call(vars, k) && vars[k] != null ? String(vars[k]) : ''));
}
// placeholders an edited wording uses that this module does not know (the database refuses them too: crm_template_problems)
export const unknownPlaceholders = (...texts) => [...new Set(texts.join(' ').match(/\{(\w+)\}/g) ?? [])].map((x) => x.slice(1, -1)).filter((x) => !PLACEHOLDERS.includes(x));

export function formatWhen(iso, lang, timeZone = 'America/Chicago', withTime = true) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const opts = withTime ? { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone }
    : { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' };
  return new Intl.DateTimeFormat(pickLang(lang) === 'es' ? 'es-US' : 'en-US', opts).format(d);
}
const phoneLabel = (p) => (/^\+1\d{10}$/.test(p ?? '') ? `(${p.slice(2, 5)}) ${p.slice(5, 8)}-${p.slice(8)}` : '');
const escHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// One claimed message (crm_messages_claim) -> {subject, text, html} for email or {sms} for a text.
//   hubUrl         HUB_PUBLIC_URL (the links to the family pages); postalFallback: MAIL_POSTAL_ADDRESS when the center has none
//   Returns {refused} instead when the email cannot be sent lawfully (no postal address) or a link would be missing.
export function renderMessage(m, { hubUrl = '', postalFallback = '' } = {}) {
  const lang = pickLang(m.lang);
  const f = FOOT[lang];
  const center = m.center ?? {};
  const base = String(hubUrl).replace(/\/+$/, '');
  const slug = center.slug ?? '';
  const link = (path, tok) => (base && slug && tok ? `${base}/c/${slug}/${path}?t=${tok}` : '');
  // names come from forms: never a link or an address in the center's message (only the system's own links are links)
  const plain = (x) => String(x ?? '').replace(/(https?:\/\/|www\.)\S*|\S+@\S+/gi, '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();
  const v0 = m.vars ?? {};
  const v = { ...v0, family_name: plain(v0.family_name), child_first: plain(v0.child_first) };
  const contactBits = [center.contact_phone ? `${f.call}: ${phoneLabel(center.contact_phone)}` : '', center.contact_email ? `${f.write}: ${center.contact_email}` : ''].filter(Boolean);
  const vars = {
    family_name: v.family_name || (lang === 'es' ? 'familia' : 'there'), child_first: v.child_first || (lang === 'es' ? 'su hijo o hija' : 'your child'),
    center_name: center.name ?? '', tour_time: formatWhen(v.tour_start, lang, center.time_zone || 'America/Chicago'),
    tour_link: center.tour_url ? `${f.tour}: ${center.tour_url}` : f.tourAsk,
    manage_link: link('tour', v.tour_token), status_link: link('waitlist-status', v.status_token), reenroll_link: link('reenroll', v.reenroll_token),
    packet_link: base && v.packet_token ? `${base}/enroll/${v.packet_token}` : '',
    place: v.place ?? '', queue_size: v.queue_size ?? '', room_name: v.room_name ?? '',
    offer_expires: formatWhen(v.offer_expires, lang, center.time_zone || 'America/Chicago'),
    campaign: v.campaign ?? '', due_by: v.due_by ? formatWhen(`${v.due_by}T12:00:00Z`, lang, 'UTC', false) : '', contact: contactBits.join(' · '),
  };
  const needs = { tour_confirm: 'manage_link', tour_reminder: 'manage_link', no_show_1: 'manage_link', no_show_2: 'manage_link', waitlist_joined: 'status_link',
    waitlist_checkin: 'status_link', offer_made: 'status_link', offer_reminder: 'status_link', reenroll_1: 'reenroll_link', reenroll_2: 'reenroll_link', reenroll_3: 'reenroll_link',
    packet_sent: 'packet_link', packet_reminder: 'packet_link' };
  if (needs[m.template] && !vars[needs[m.template]]) return { refused: 'HUB_PUBLIC_URL is not set, so the family link would be missing' };
  const def = DEFAULT_TEMPLATES[m.template]?.[lang] ?? DEFAULT_TEMPLATES[m.template]?.en;
  if (!def) return { refused: `unknown message ${m.template}` };
  const own = m.override ?? null;
  if (m.channel === 'sms') {
    const body = fill(own?.sms ?? def.sms ?? '', vars).replace(/\s+/g, ' ').trim();
    if (!body) return { refused: 'this message has no text version' };
    return { sms: `${body} ${f.stop}`.trim() };
  }
  const postal = String(center.postal_address || postalFallback || '').replace(/\s+/g, ' ').trim();
  if (!postal) return { refused: 'no postal address for this center (crm settings) and MAIL_POSTAL_ADDRESS is not set: CAN-SPAM needs one in every email' };
  // a prospective family (lead): the unsubscribe link. An enrolled family (re-enrollment, a relationship message): its email choices page.
  const enrolled = !!m.target_id;
  const unsub = enrolled ? (base ? `${base}/account#notify` : '') : link('unsubscribe', v.unsub_token);
  if (!unsub) return { refused: 'HUB_PUBLIC_URL is not set, so the unsubscribe link would be missing' };
  const subject = fill(own?.subject ?? def.subject, vars).replace(/\s+/g, ' ').trim().slice(0, 140);
  const body = fill(own?.body ?? def.body, vars).replace(/\n{3,}/g, '\n\n').trim();
  const why = enrolled ? f.whyFamily(center.name ?? '') : f.why(center.name ?? '');
  const unsubLabel = enrolled ? f.prefs : f.unsub;
  const footer = ['--', why, `${unsubLabel}: ${unsub}`, center.name ?? '', postal];
  const text = `${body}\n\n${footer.join('\n')}`;
  const linkify = (s) => escHtml(s).replace(/https?:\/\/[^\s<]+/g, (u) => `<a href="${u}" style="color:#1b2a5e">${u}</a>`);
  const html = '<div style="font-family:Arial,Helvetica,sans-serif;color:#222;max-width:600px;margin:0 auto;line-height:1.5">'
    + `<div style="background:#1b2a5e;color:#fff;padding:14px 20px;font-size:18px;font-weight:bold;border-bottom:4px solid #c99a06">${escHtml(center.name ?? '')}</div>`
    + `<div style="padding:20px">${body.split('\n\n').map((p) => `<p>${linkify(p).replace(/\n/g, '<br>')}</p>`).join('')}`
    + `<hr style="border:0;border-top:1px solid #ddd;margin:20px 0"><p style="color:#666;font-size:12px">${escHtml(why)}<br>`
    + `<a href="${escHtml(unsub)}" style="color:#1b2a5e">${escHtml(unsubLabel)}</a><br><br>${escHtml(center.name ?? '')}<br>${escHtml(postal)}</p></div></div>`;
  return { subject, text, html, unsubscribeUrl: enrolled ? null : unsub };
}

// ---- labels (director pages and family pages) ----------------------------------------------------------------------------------
export const STAGES = Object.freeze(['inquiry', 'tour_booked', 'toured', 'applied', 'waitlisted', 'offered', 'enrolled', 'lost']);
export const FUNNEL = Object.freeze(['inquiry', 'tour_booked', 'toured', 'applied', 'enrolled']);
export const LOST_REASONS = Object.freeze(['chose_other', 'price', 'schedule', 'location', 'no_seat', 'not_responding', 'moved', 'age', 'declined', 'other']);
export const SOURCES = Object.freeze(['website', 'phone', 'walk_in', 'referral', 'social', 'event', 'email', 'other', 'manual']);
export const AGE_BANDS = Object.freeze(['twos', 'threes', 'prek', 'other']);
export const WAITLIST_RULES = Object.freeze(['sibling', 'staff_child', 'subsidy', 'age_room_fit']);

export const UI = Object.freeze({
  en: Object.freeze({
    'crm.title': 'Enrollment pipeline', 'crm.lead': 'Every family from first inquiry to enrolled, with what happens next.',
    'crm.tab.pipeline': 'Pipeline', 'crm.tab.funnel': 'Funnel', 'crm.tab.waitlist': 'Waitlist', 'crm.tab.messages': 'Messages', 'crm.tab.reenroll': 'Re-enrollment',
    'crm.tab.referrals': 'Referrals', 'crm.tab.settings': 'Settings',
    'stage.inquiry': 'Inquiry', 'stage.tour_booked': 'Tour booked', 'stage.toured': 'Toured', 'stage.applied': 'Applied', 'stage.waitlisted': 'Waitlisted',
    'stage.offered': 'Seat offered', 'stage.enrolled': 'Enrolled', 'stage.lost': 'Lost',
    'lost.chose_other': 'Chose another program', 'lost.price': 'Price', 'lost.schedule': 'Schedule did not fit', 'lost.location': 'Location', 'lost.no_seat': 'No seat when needed',
    'lost.not_responding': 'Stopped responding', 'lost.moved': 'Moved away', 'lost.age': 'Age did not fit', 'lost.declined': 'Declined', 'lost.other': 'Other',
    'source.website': 'Website', 'source.phone': 'Phone call', 'source.walk_in': 'Walk-in', 'source.referral': 'Referral', 'source.social': 'Social media', 'source.event': 'Event',
    'source.email': 'Email', 'source.other': 'Other', 'source.manual': 'Added by staff',
    'band.twos': 'Twos', 'band.threes': 'Threes', 'band.prek': 'Pre-K', 'band.other': 'Other',
    'rule.sibling': 'Brother or sister enrolled here', 'rule.staff_child': 'Parent works here', 'rule.subsidy': 'Uses a child care subsidy', 'rule.age_room_fit': 'Age fits the room',
    'crm.newLead': 'Add a family', 'crm.search': 'Search name, email, phone or child', 'crm.open': 'Open', 'crm.overdue': 'First contact overdue', 'crm.none': 'No families here yet.',
    'crm.toMark': 'How did these tours go?', 'crm.attended': 'Came', 'crm.noShow': 'Did not come',
    'crm.contacted': 'I reached them', 'crm.replied': 'They replied (stop automatic messages)', 'crm.pause': 'Pause automatic messages', 'crm.resume': 'Resume automatic messages',
    'crm.moveTo': 'Move to', 'crm.lostWhy': 'Why was the family lost?', 'crm.note': 'Add a note', 'crm.history': 'History', 'crm.messages': 'Automatic messages',
    'crm.family360': 'Family view', 'crm.waitlistAdd': 'Add to the waitlist', 'crm.offer': 'Offer a seat', 'crm.withdraw': 'Remove from the waitlist',
    'crm.override': 'Why are you offering out of order or without a known free seat?', 'crm.place': 'Number {place} of {size}', 'crm.points': '{points} priority points',
    'crm.freeSeats': '{n} free seat(s)', 'crm.capUnknown': 'no capacity on file', 'crm.linkCopy': 'Status link for the family (shown once)',
    'crm.funnel.range': 'Families who first contacted you between', 'crm.funnel.conv': 'conversion', 'crm.funnel.time': 'Time in each stage', 'crm.funnel.lost': 'Why families were lost',
    'crm.funnel.sources': 'Where families came from', 'crm.funnel.speed': 'Speed to lead', 'crm.funnel.org': 'All your centers',
    'crm.seqOff': 'Automatic messages are OFF for this center. Turn them on in Settings.', 'crm.seqOn': 'Automatic messages are on.',
    'crm.settings.quiet': 'Quiet hours (nothing automatic is sent)', 'crm.settings.sla': 'Speed to lead: first contact within (hours)', 'crm.settings.hold': 'Hold a seat offer for (days)',
    'crm.settings.weights': 'Waitlist priority points (0 = rule off; the date the family joined always breaks ties)', 'crm.settings.postal': 'Postal address in every email (required by law)',
    'crm.settings.contact': 'Phone and email families can reach you at', 'crm.settings.tourUrl': 'Web page where families book a tour (optional)',
    'crm.settings.reminders': 'Tour reminders', 'crm.saved': 'Saved.',
    'crm.reenroll.new': 'Start re-enrollment for next school year', 'crm.reenroll.open': 'Open and email every enrolled family', 'crm.reenroll.close': 'Close',
    'reenroll.returning': 'Returning', 'reenroll.not_returning': 'Not returning', 'reenroll.unsure': 'Not sure yet', 'reenroll.pending': 'No answer yet',
    'crm.ref.new': 'New referral code', 'crm.ref.note': 'Tracking only: credits are given by hand, never paid out by the Hub.',
    'crm.money.hidden': 'Balance: directors only', 'crm.balance': 'Open balance',
  }),
  es: Object.freeze({
    'crm.title': 'Proceso de inscripción', 'crm.lead': 'Cada familia desde la primera consulta hasta la inscripción, con el siguiente paso.',
    'crm.tab.pipeline': 'Proceso', 'crm.tab.funnel': 'Embudo', 'crm.tab.waitlist': 'Lista de espera', 'crm.tab.messages': 'Mensajes', 'crm.tab.reenroll': 'Reinscripción',
    'crm.tab.referrals': 'Referidos', 'crm.tab.settings': 'Configuración',
    'stage.inquiry': 'Consulta', 'stage.tour_booked': 'Visita reservada', 'stage.toured': 'Visitó', 'stage.applied': 'Presentó solicitud', 'stage.waitlisted': 'En lista de espera',
    'stage.offered': 'Lugar ofrecido', 'stage.enrolled': 'Inscrito', 'stage.lost': 'Perdido',
    'lost.chose_other': 'Eligió otro programa', 'lost.price': 'Precio', 'lost.schedule': 'El horario no funcionó', 'lost.location': 'Ubicación', 'lost.no_seat': 'No había lugar a tiempo',
    'lost.not_responding': 'Dejó de responder', 'lost.moved': 'Se mudó', 'lost.age': 'La edad no correspondía', 'lost.declined': 'Rechazó', 'lost.other': 'Otro',
    'source.website': 'Sitio web', 'source.phone': 'Llamada', 'source.walk_in': 'Visita sin cita', 'source.referral': 'Referido', 'source.social': 'Redes sociales', 'source.event': 'Evento',
    'source.email': 'Correo', 'source.other': 'Otro', 'source.manual': 'Agregado por el personal',
    'band.twos': 'Dos años', 'band.threes': 'Tres años', 'band.prek': 'Pre-K', 'band.other': 'Otro',
    'rule.sibling': 'Un hermano o hermana inscrito aquí', 'rule.staff_child': 'El padre o la madre trabaja aquí', 'rule.subsidy': 'Usa un subsidio de cuidado infantil', 'rule.age_room_fit': 'La edad corresponde al salón',
    'crm.newLead': 'Agregar una familia', 'crm.search': 'Buscar nombre, correo, teléfono o niño', 'crm.open': 'Abrir', 'crm.overdue': 'Primer contacto atrasado', 'crm.none': 'Todavía no hay familias aquí.',
    'crm.toMark': '¿Cómo salieron estas visitas?', 'crm.attended': 'Vino', 'crm.noShow': 'No vino',
    'crm.contacted': 'Me comuniqué con ellos', 'crm.replied': 'Respondieron (detener mensajes automáticos)', 'crm.pause': 'Pausar mensajes automáticos', 'crm.resume': 'Reanudar mensajes automáticos',
    'crm.moveTo': 'Mover a', 'crm.lostWhy': '¿Por qué se perdió la familia?', 'crm.note': 'Agregar una nota', 'crm.history': 'Historial', 'crm.messages': 'Mensajes automáticos',
    'crm.family360': 'Vista de la familia', 'crm.waitlistAdd': 'Agregar a la lista de espera', 'crm.offer': 'Ofrecer un lugar', 'crm.withdraw': 'Quitar de la lista de espera',
    'crm.override': '¿Por qué ofrece fuera de orden o sin un lugar libre conocido?', 'crm.place': 'Número {place} de {size}', 'crm.points': '{points} puntos de prioridad',
    'crm.freeSeats': '{n} lugar(es) libre(s)', 'crm.capUnknown': 'sin capacidad registrada', 'crm.linkCopy': 'Enlace de estado para la familia (se muestra una vez)',
    'crm.funnel.range': 'Familias que se comunicaron por primera vez entre', 'crm.funnel.conv': 'conversión', 'crm.funnel.time': 'Tiempo en cada etapa', 'crm.funnel.lost': 'Por qué se perdieron familias',
    'crm.funnel.sources': 'De dónde vinieron las familias', 'crm.funnel.speed': 'Rapidez de respuesta', 'crm.funnel.org': 'Todos sus centros',
    'crm.seqOff': 'Los mensajes automáticos están APAGADOS en este centro. Actívelos en Configuración.', 'crm.seqOn': 'Los mensajes automáticos están activados.',
    'crm.settings.quiet': 'Horas de silencio (no se envía nada automático)', 'crm.settings.sla': 'Rapidez: primer contacto dentro de (horas)', 'crm.settings.hold': 'Guardar una oferta de lugar por (días)',
    'crm.settings.weights': 'Puntos de prioridad de la lista de espera (0 = regla apagada; la fecha de ingreso siempre desempata)', 'crm.settings.postal': 'Dirección postal en cada correo (lo exige la ley)',
    'crm.settings.contact': 'Teléfono y correo donde las familias pueden comunicarse', 'crm.settings.tourUrl': 'Página web donde las familias reservan una visita (opcional)',
    'crm.settings.reminders': 'Recordatorios de visita', 'crm.saved': 'Guardado.',
    'crm.reenroll.new': 'Iniciar la reinscripción para el próximo año escolar', 'crm.reenroll.open': 'Abrir y enviar un correo a cada familia inscrita', 'crm.reenroll.close': 'Cerrar',
    'reenroll.returning': 'Regresa', 'reenroll.not_returning': 'No regresa', 'reenroll.unsure': 'Todavía no sabe', 'reenroll.pending': 'Sin respuesta',
    'crm.ref.new': 'Nuevo código de referido', 'crm.ref.note': 'Solo seguimiento: los créditos se dan a mano, el Hub nunca hace pagos.',
    'crm.money.hidden': 'Saldo: solo directores', 'crm.balance': 'Saldo pendiente',
  }),
});
export function ui(key, vars = {}, lang = 'en') {
  const s = UI[pickLang(lang)][key] ?? UI.en[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (m, k) => (Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : m));
}
export const pct = (v) => (v == null ? '–' : `${Number(v).toFixed(Number(v) % 1 ? 1 : 0)}%`);
