// Classroom adaptations and early-intervention guidance (gap plan N29; hub/ACCOMMODATIONS.md; migration 20261028500000_accommodations.sql).
//
//   /c/<slug>/adapt   Staff (classroom permission, their rooms) and the director: each child's accommodation PREFERENCES (fewer
//                     choices, larger targets, extra time, read-aloud reminder, less motion, high contrast, one step at a time, break
//                     reminders, left/right hand, simpler screens), the family's change requests, the non-diagnostic early-intervention
//                     conversation note (teacher observes -> director decides -> family conversation logged), and the classroom
//                     guidance cards per learning zone.
//                     Families: what the classroom does for their child (in plain words), a form to ask for a change, notes the
//                     director chose to talk about with them, and early-intervention resources for their state.
// Owner decision 2026-10-11: IEPs and IFSPs live in the support plan (special-education.js, hub/SPECIAL_EDUCATION.md), not here. This page still
// stores no IEP or IFSP, goal or diagnosis (these are preferences); a plan's accommodations can switch them on. Free text passes the hub's health-
// words policy in the database (accom_text_ok). English + Spanish (Spanish is a DRAFT); every visible string lives in the tables below.
// Plain ES module, no build step; the strict CSP forbids inline styles and inline code.

import { centerToday } from './center-time.js';

export const SETTINGS = ['fewer_choices', 'larger_targets', 'extra_time', 'read_aloud', 'reduced_motion', 'high_contrast', 'one_step', 'break_prompts', 'simplified'];
export const AREAS = ['talking_listening', 'moving_body', 'hands_fingers', 'playing_learning', 'with_others', 'daily_routines'];
const NEXT = ['family_will_reach_out', 'family_wants_time', 'family_not_now', 'talk_again'];
const HOW = ['in_person', 'phone', 'video'];

export const W = {
  en: {
    title: 'Classroom adaptations',
    intro: 'Small changes in how activities and screens are presented, so every child can take part. These are classroom preferences, not a diagnosis: an IEP or IFSP, when the family consents, lives in the child\'s separate support plan (encrypted; only the director, the child\'s assigned teachers, the family and specialists the family approves see it), and its accommodations can switch these settings on.',
    room: 'Room', open: 'Settings', none: 'No children in this room.', noneOn: 'None set', requests: (n) => `${n} family request${n === 1 ? '' : 's'}`,
    set: {
      fewer_choices: 'Fewer choices: 2 pictures instead of 3 or 4', larger_targets: 'Larger buttons and pictures', extra_time: 'Extra time: no speed flags on skill checks',
      read_aloud: 'Remind the grown-up to read the words aloud (captions are always on)', reduced_motion: 'Less motion and animation',
      high_contrast: 'High-contrast screens', one_step: 'Instructions one step at a time', break_prompts: 'Break reminders', simplified: 'Simpler screens, fewer things at once',
      hand_left: 'Main buttons on the left', hand_right: 'Main buttons on the right',
    },
    hand: 'Main buttons', handEither: 'Either side', handLeft: 'Left side', handRight: 'Right side', breakEvery: 'Break reminder every (minutes)',
    note: 'Classroom note (optional: what helps in class; leave out health details and labels)', save: 'Save', saved: 'Saved.', back: 'Back to the room',
    settingsFor: (n) => `Adaptations for ${n}`, scoreNote: 'Skill checks are graded the same way with or without adaptations. Teachers see an "Accommodated" mark for context; families never see it.',
    reqTitle: 'Family requests', reqNone: 'No requests.', apply: 'Apply', decline: 'Not now', response: 'Answer to the family (optional)',
    status: { open: 'Waiting', applied: 'Applied', declined: 'Not now', withdrawn: 'Withdrawn' }, wants: 'Asks for', message: 'Message',
    eiTitle: 'Early intervention conversation note',
    eiIntro: 'Write only what you saw and heard in the classroom (no labels, diagnoses or health details). The director decides whether to talk with the family about free early-intervention resources. Only the director, the child\'s lead teachers and the family (after the director decides) can see these notes; every view is logged.',
    areas: 'Areas you noticed', area: { talking_listening: 'Talking and listening', moving_body: 'Moving the whole body', hands_fingers: 'Using hands and fingers', playing_learning: 'Playing and learning', with_others: 'Playing with others', daily_routines: 'Daily routines' },
    observed: 'What you saw and heard (dates, situations, words)', tried: 'What the classroom already tried (optional)', from: 'From', to: 'To',
    saveDraft: 'Save draft', submit: 'Send to the director', eiNone: 'No notes.', eiHidden: 'Notes are shown to the director, the child\'s lead teachers and the family only.',
    st: { draft: 'Draft', submitted: 'Waiting for the director', reviewed: 'Director decided', closed: 'Closed' },
    dec: { talk_with_family: 'Talk with the family', keep_observing: 'Keep observing' }, decide: 'Decision', dirNote: 'Director note (optional)', record: 'Record decision',
    convTitle: 'Log the family conversation', heldOn: 'Day of the conversation', how: 'How', howV: { in_person: 'In person', phone: 'Phone', video: 'Video call' },
    summary: 'What was shared (no health details)', resShared: 'Resources shared', next: 'What the family would like next',
    nextV: { family_will_reach_out: 'The family will reach out to the program', family_wants_time: 'The family would like time to think', family_not_now: 'Not now', talk_again: 'Talk again later' },
    closeAfter: 'Close the note after logging', logIt: 'Log conversation', close: 'Close note', conv: 'Conversation',
    queue: 'Notes waiting for you', queueNone: 'Nothing waiting.', resources: 'Early-intervention resources', needsReview: 'Link under review: ask the center for the contact',
    guides: 'Classroom guidance cards (draft)', guidesIntro: 'Practical classroom ideas by learning zone. Not medical or clinical advice.', draft: 'Draft',
    famTitle: (n) => `How the classroom adapts for ${n}`, famNone: 'No adaptations are set. Every child gets captions on screen and a grown-up nearby.',
    famAsk: 'Ask for a change', famAskHint: 'Tick what you would like. The teacher answers here.', famMsg: 'Message to the teacher (optional; no health details)', send: 'Send request',
    withdraw: 'Withdraw', sent: 'Sent. The teacher will answer here.', famNotes: 'Notes the center shared with you',
    famRes: 'Questions about how your child is growing?', famResHint: 'These programs are free to ask. You decide whether to contact them.', yes: 'On', no: 'Off',
    accommodated: 'Accommodated',
  },
  es: {
    title: 'Adaptaciones en el salón',
    intro: 'Pequeños cambios en cómo se presentan las actividades y las pantallas, para que cada niño pueda participar. Son preferencias del salón, no un diagnóstico: un IEP o IFSP, si la familia da su consentimiento, se guarda aparte en el plan de apoyo del niño (cifrado; solo lo ven la dirección, las maestras asignadas, la familia y los especialistas que la familia apruebe), y sus adaptaciones pueden activar estos ajustes.',
    room: 'Salón', open: 'Ajustes', none: 'No hay niños en este salón.', noneOn: 'Ninguna', requests: (n) => `${n} solicitud${n === 1 ? '' : 'es'} de la familia`,
    set: {
      fewer_choices: 'Menos opciones: 2 dibujos en vez de 3 o 4', larger_targets: 'Botones y dibujos más grandes', extra_time: 'Más tiempo: sin avisos de rapidez en las pruebas',
      read_aloud: 'Recordar al adulto que lea las palabras en voz alta (los subtítulos siempre están)', reduced_motion: 'Menos movimiento y animación',
      high_contrast: 'Pantallas de alto contraste', one_step: 'Instrucciones un paso a la vez', break_prompts: 'Recordatorios de descanso', simplified: 'Pantallas más simples, menos cosas a la vez',
      hand_left: 'Botones principales a la izquierda', hand_right: 'Botones principales a la derecha',
    },
    hand: 'Botones principales', handEither: 'Cualquier lado', handLeft: 'Lado izquierdo', handRight: 'Lado derecho', breakEvery: 'Recordatorio de descanso cada (minutos)',
    note: 'Nota del salón (opcional: qué ayuda en clase; sin datos de salud ni etiquetas)', save: 'Guardar', saved: 'Guardado.', back: 'Volver al salón',
    settingsFor: (n) => `Adaptaciones para ${n}`, scoreNote: 'Las pruebas se califican igual con o sin adaptaciones. Las maestras ven una marca "Con adaptaciones" como contexto; las familias nunca la ven.',
    reqTitle: 'Solicitudes de la familia', reqNone: 'No hay solicitudes.', apply: 'Aplicar', decline: 'Ahora no', response: 'Respuesta a la familia (opcional)',
    status: { open: 'En espera', applied: 'Aplicada', declined: 'Ahora no', withdrawn: 'Retirada' }, wants: 'Pide', message: 'Mensaje',
    eiTitle: 'Nota para conversar sobre intervención temprana',
    eiIntro: 'Escriba solo lo que vio y oyó en el salón (sin etiquetas, diagnósticos ni datos de salud). La dirección decide si se habla con la familia sobre recursos gratuitos de intervención temprana. Solo la dirección, las maestras principales del niño y la familia (después de la decisión) ven estas notas; cada consulta queda registrada.',
    areas: 'Áreas que notó', area: { talking_listening: 'Hablar y escuchar', moving_body: 'Mover todo el cuerpo', hands_fingers: 'Usar las manos y los dedos', playing_learning: 'Jugar y aprender', with_others: 'Jugar con otros', daily_routines: 'Rutinas diarias' },
    observed: 'Lo que vio y oyó (fechas, situaciones, palabras)', tried: 'Lo que el salón ya intentó (opcional)', from: 'Desde', to: 'Hasta',
    saveDraft: 'Guardar borrador', submit: 'Enviar a la dirección', eiNone: 'No hay notas.', eiHidden: 'Las notas solo las ven la dirección, las maestras principales del niño y la familia.',
    st: { draft: 'Borrador', submitted: 'Esperando a la dirección', reviewed: 'La dirección decidió', closed: 'Cerrada' },
    dec: { talk_with_family: 'Hablar con la familia', keep_observing: 'Seguir observando' }, decide: 'Decisión', dirNote: 'Nota de la dirección (opcional)', record: 'Guardar decisión',
    convTitle: 'Registrar la conversación con la familia', heldOn: 'Día de la conversación', how: 'Cómo', howV: { in_person: 'En persona', phone: 'Por teléfono', video: 'Videollamada' },
    summary: 'Lo que se compartió (sin datos de salud)', resShared: 'Recursos compartidos', next: 'Lo que la familia quiere después',
    nextV: { family_will_reach_out: 'La familia se comunicará con el programa', family_wants_time: 'La familia quiere tiempo para pensarlo', family_not_now: 'Ahora no', talk_again: 'Hablar otra vez más adelante' },
    closeAfter: 'Cerrar la nota después de registrar', logIt: 'Registrar conversación', close: 'Cerrar nota', conv: 'Conversación',
    queue: 'Notas que esperan su decisión', queueNone: 'Nada en espera.', resources: 'Recursos de intervención temprana', needsReview: 'Enlace en revisión: pida el contacto al centro',
    guides: 'Tarjetas de ideas para el salón (borrador)', guidesIntro: 'Ideas prácticas para el salón por zona de aprendizaje. No son consejos médicos ni clínicos.', draft: 'Borrador',
    famTitle: (n) => `Cómo el salón se adapta para ${n}`, famNone: 'No hay adaptaciones. Cada niño tiene subtítulos en la pantalla y un adulto cerca.',
    famAsk: 'Pedir un cambio', famAskHint: 'Marque lo que le gustaría. La maestra responde aquí.', famMsg: 'Mensaje para la maestra (opcional; sin datos de salud)', send: 'Enviar solicitud',
    withdraw: 'Retirar', sent: 'Enviada. La maestra responderá aquí.', famNotes: 'Notas que el centro compartió con usted',
    famRes: '¿Preguntas sobre cómo está creciendo su hijo?', famResHint: 'Preguntar a estos programas es gratis. Usted decide si se comunica con ellos.', yes: 'Sí', no: 'No',
    accommodated: 'Con adaptaciones',
  },
};

// Classroom guidance cards per learning zone (DRAFT, EN/ES; zone names from the bilingual glossary). Ideas only: no medical advice.
export const GUIDE = {
  en: [
    { zone: "Booker's Reading Area", tips: ['Offer two books to choose from instead of the whole shelf.', 'Point to each picture as you read; pause so the child can point too.', 'Let the child hold the book or turn the pages.', 'Use the same short phrase for routines ("Book time, sit with Booker").'] },
    { zone: "Lumi's Calm Corner", tips: ['Show the calm corner before it is needed, when everyone is relaxed.', 'Keep a picture card of each calm choice (squeeze, breathe, look at a book).', 'Dim, quiet and close to a grown-up; never used as a time-out.', 'A short visual timer helps some children know when to come back.'] },
    { zone: "Zuri's Discovery Zone", tips: ['Put out fewer materials at once; rotate them during the week.', 'Show one step, then let the child try it before showing the next.', 'Larger, easy-to-grip tools (chunky magnifiers, wide scoops).', 'Name what the child is doing ("You are pouring!") instead of asking many questions.'] },
    { zone: "Bop's Movement Zone", tips: ['Give a clear start and stop signal the child can see as well as hear.', 'Offer a spot marker so each child knows their space.', 'Model the move slowly first; any version of the move counts.', 'Offer a seated way to join in.'] },
    { zone: 'Spanish Circle', tips: ['Pair each new word with a gesture or a picture.', 'Welcome answers in either language.', 'Repeat the same song or rhyme for several days.'] },
    { zone: 'Kid Mode and screens', tips: ['Turn on the child\'s adaptations on the Adaptations page; Kid Mode follows them.', 'Sit beside the child and read the words aloud; Kid Mode has no sound.', 'Keep screen moments short and end with a movement or an off-screen activity.'] },
    { zone: 'Transitions and routines', tips: ['Give a warning before a change ("Two more turns, then clean-up").', 'Use the same picture schedule every day and point to what comes next.', 'Give one direction at a time and wait before repeating it.'] },
  ],
  es: [
    { zone: 'Área de lectura de Booker', tips: ['Ofrezca dos libros para elegir en vez de todo el estante.', 'Señale cada dibujo al leer; haga una pausa para que el niño también señale.', 'Deje que el niño sostenga el libro o pase las páginas.', 'Use la misma frase corta para las rutinas ("Hora del libro, siéntate con Booker").'] },
    { zone: 'Rincón de calma de Lumi', tips: ['Muestre el rincón de calma antes de necesitarlo, cuando todos están tranquilos.', 'Tenga una tarjeta con dibujo de cada opción para calmarse (apretar, respirar, mirar un libro).', 'Luz suave, silencio y un adulto cerca; nunca se usa como castigo.', 'Un temporizador visual corto ayuda a algunos niños a saber cuándo volver.'] },
    { zone: 'Zona de descubrimiento de Zuri', tips: ['Ponga menos materiales a la vez; cámbielos durante la semana.', 'Muestre un paso y deje que el niño lo intente antes de mostrar el siguiente.', 'Herramientas más grandes y fáciles de agarrar (lupas gruesas, palas anchas).', 'Nombre lo que el niño hace ("¡Estás vaciando!") en vez de hacer muchas preguntas.'] },
    { zone: 'Zona de movimiento de Bop', tips: ['Dé una señal clara para empezar y parar que el niño pueda ver además de oír.', 'Ofrezca una marca en el piso para que cada niño sepa cuál es su lugar.', 'Muestre el movimiento despacio primero; cualquier versión del movimiento cuenta.', 'Ofrezca una forma de participar sentado.'] },
    { zone: 'Círculo de español', tips: ['Acompañe cada palabra nueva con un gesto o un dibujo.', 'Acepte respuestas en cualquiera de los dos idiomas.', 'Repita la misma canción o rima varios días.'] },
    { zone: 'Modo Niños y pantallas', tips: ['Active las adaptaciones del niño en la página Adaptaciones; el Modo Niños las sigue.', 'Siéntese al lado del niño y lea las palabras en voz alta; el Modo Niños no tiene sonido.', 'Que los momentos de pantalla sean cortos y terminen con movimiento o una actividad sin pantalla.'] },
    { zone: 'Transiciones y rutinas', tips: ['Avise antes de un cambio ("Dos turnos más y luego a recoger").', 'Use el mismo horario con dibujos cada día y señale lo que sigue.', 'Dé una instrucción a la vez y espere antes de repetirla.'] },
  ],
};

const today = () => centerToday();   // the center's day (center-time.js, hub/TIME_ZONES.md)
const addDays = (ymd, n) => { const d = new Date(`${ymd}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

// The settings that are on, as plain words (pure: tests/accommodations-unit.test.mjs)
export function onLabels(settings, lang = 'en') {
  const L = W[lang === 'es' ? 'es' : 'en'];
  const out = SETTINGS.filter((k) => settings?.[k]).map((k) => L.set[k]);
  if (settings?.hand === 'left' || settings?.hand === 'right') out.push(L.set[`hand_${settings.hand}`]);
  return out;
}
// The keys from a list (accommodations_room "on": fewer_choices, hand_left ...) as plain words
export const keyLabels = (keys, lang = 'en') => (keys || []).map((k) => W[lang === 'es' ? 'es' : 'en'].set[k]).filter(Boolean);
// What changed between two settings objects (the family's request carries only the differences)
export function diffSettings(before, after) {
  const out = {};
  for (const k of [...SETTINGS, 'hand', 'break_minutes']) if (after[k] !== undefined && after[k] !== before?.[k]) out[k] = after[k];
  return out;
}

function settingsFormHtml(esc, L, s, { idp = 'ac', note = null, withNote = true, noteLabel = L.note } = {}) {
  return `<fieldset class="ac-checks"><legend>${esc(L.title)}</legend>${SETTINGS.map((k) => `<label class="ac-check"><input type="checkbox" name="${k}" id="${idp}-${k}"${s[k] ? ' checked' : ''}><span>${esc(L.set[k])}</span></label>`).join('')}</fieldset>
    <div class="ac-row"><label class="f"><span>${esc(L.hand)}</span><select class="i" name="hand" id="${idp}-hand">${[['either', L.handEither], ['left', L.handLeft], ['right', L.handRight]].map(([v, l]) => `<option value="${v}"${s.hand === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
      <label class="f"><span>${esc(L.breakEvery)}</span><input class="i" type="number" min="5" max="30" step="1" name="break_minutes" id="${idp}-break" value="${Number(s.break_minutes) || 10}"></label></div>
    ${withNote ? `<label class="f"><span>${esc(noteLabel)}</span><textarea class="i" name="note" id="${idp}-note" maxlength="300" rows="2">${esc(note || '')}</textarea></label>` : ''}`;
}
function readSettings(form) {
  const s = {};
  for (const k of SETTINGS) s[k] = !!form.querySelector(`[name="${k}"]`)?.checked;
  s.hand = form.querySelector('[name="hand"]').value;
  s.break_minutes = Math.max(5, Math.min(30, Number(form.querySelector('[name="break_minutes"]').value) || 10));
  return s;
}
const wantsText = (esc, L, w) => Object.entries(w || {}).map(([k, v]) => (k === 'hand' ? `${L.hand}: ${{ either: L.handEither, left: L.handLeft, right: L.handRight }[v] || ''}`
  : k === 'break_minutes' ? `${L.breakEvery}: ${Number(v)}` : `${L.set[k] || ''}: ${v ? L.yes : L.no}`)).map(esc).join(' · ');

function resourcesHtml(esc, L, list, lang, staff) {
  return `<ul class="ac-res">${(list || []).map((r) => `<li data-res="${esc(r.id)}"><b>${esc(lang === 'es' ? r.name_es : r.name_en)}</b><br><span class="small">${esc(lang === 'es' ? r.about_es : r.about_en)}</span><br>
    ${r.url && r.review === 'verified' ? `<a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(r.url.slice('https://'.length))}</a>` : `<span class="small muted">${esc(L.needsReview)}</span>${staff ? ` <span class="chip warn">${esc(L.draft)}</span>` : ''}`}</li>`).join('')}</ul>`;
}
function guidesHtml(esc, L, lang) {
  return `<div class="card" id="acGuides"><h3>${esc(L.guides)}</h3><p class="small muted">${esc(L.guidesIntro)}</p>
    ${GUIDE[lang === 'es' ? 'es' : 'en'].map((g) => `<details class="ac-guide"><summary>${esc(g.zone)}</summary><ul>${g.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></details>`).join('')}</div>`;
}

export async function viewAdapt(ctx) {
  return ctx.c.role === 'family' ? viewFamily(ctx) : viewStaff(ctx);
}

// ===========================================================================================================================
// Staff
// ===========================================================================================================================
async function viewStaff(ctx) {
  const { c, shell, page, rpc, esc, friendly, client, go, lang } = ctx;
  const L = W[lang === 'es' ? 'es' : 'en'];
  page(shell('<p class="loading">…</p>'), L.title);
  const q = new URLSearchParams(location.search);
  const kid = q.get('kid');
  if (kid) return viewStaffChild(ctx, kid);
  const rooms = ((await client().from('rooms').select('id, data').eq('center_id', c.center_id).order('id')).data || []);
  const room = rooms.find((r) => r.id === q.get('room'))?.id || rooms[0]?.id;
  let kids = [], queue = null;
  if (room) { try { kids = await rpc('accommodations_room', { p_center: c.center_id, p_room: room }); } catch (e) { return page(shell(`<div class="card"><p class="msg bad" role="alert">${esc(friendly(e))}</p></div>`), L.title); } }
  if (c.role === 'director') { try { queue = await rpc('ei_director_queue', { p_center: c.center_id }); } catch (_) { queue = null; } }
  page(shell(`<div class="ac-page" id="adaptPage">
    <div class="card"><h2>${esc(L.title)}</h2><p class="muted">${esc(L.intro)}</p>
      ${rooms.length > 1 ? `<nav class="tabs" aria-label="${esc(L.room)}">${rooms.map((r) => `<a href="/c/${esc(c.slug)}/adapt?room=${encodeURIComponent(r.id)}" data-nav${r.id === room ? ' aria-current="page"' : ''}>${esc(r.data?.name || r.id)}</a>`).join('')}</nav>` : ''}
      <ul class="ac-kids" id="acKids">${kids.length ? kids.map((k) => `<li class="ac-kid" data-kid="${esc(k.kid)}"><span class="ac-kid-name">${esc(k.name)}</span>
        <span class="ac-chips">${(k.on.length ? keyLabels(k.on, lang) : [L.noneOn]).map((t) => `<span class="chip">${esc(t)}</span>`).join('')}${k.open_requests ? `<span class="chip warn">${esc(L.requests(k.open_requests))}</span>` : ''}</span>
        <a class="btn soft small" data-nav href="/c/${esc(c.slug)}/adapt?kid=${encodeURIComponent(k.kid)}">${esc(L.open)}</a></li>`).join('') : `<li class="empty">${esc(L.none)}</li>`}</ul></div>
    ${queue ? `<div class="card" id="acQueue"><h3>${esc(L.queue)}</h3>${queue.length ? `<ul class="ac-kids">${queue.map((n) => `<li class="ac-kid"><span class="ac-kid-name">${esc(n.name)}</span><span class="chip">${esc(L.st[n.status])}</span>
      <a class="btn soft small" data-nav href="/c/${esc(c.slug)}/adapt?kid=${encodeURIComponent(n.kid)}#acEi">${esc(L.open)}</a></li>`).join('')}</ul>` : `<p class="empty">${esc(L.queueNone)}</p>`}</div>` : ''}
    ${guidesHtml(esc, L, lang)}</div>`), L.title);
  void go;
}

async function viewStaffChild(ctx, kid) {
  const { c, shell, page, rpc, esc, friendly, live, lang } = ctx;
  const L = W[lang === 'es' ? 'es' : 'en'];
  let a, ei = null;
  try { a = await rpc('accommodations_get', { p_center: c.center_id, p_kid: kid }); } catch (e) { return page(shell(`<div class="card" id="adaptPage"><p class="msg bad" role="alert">${esc(friendly(e))}</p></div>`), L.title); }
  try { ei = await rpc('ei_notes_for_child', { p_center: c.center_id, p_kid: kid }); } catch (_) { ei = null; }
  const s = a.settings;
  const role = ei?.role;
  const noteHtml = (n) => `<article class="ac-note" data-note="${esc(n.id)}"><p><span class="chip">${esc(L.st[n.status])}</span>${n.decision ? ` <span class="chip gold">${esc(L.dec[n.decision])}</span>` : ''}
      <span class="small muted">${esc(n.observed_from)} – ${esc(n.observed_to)}</span></p>
      <p class="small">${n.areas.map((x) => esc(L.area[x])).join(' · ')}</p><p>${esc(n.observed)}</p>${n.tried ? `<p class="small"><b>${esc(L.tried)}:</b> ${esc(n.tried)}</p>` : ''}
      ${n.director_note ? `<p class="small"><b>${esc(L.dirNote)}:</b> ${esc(n.director_note)}</p>` : ''}
      ${n.conversations.map((v) => `<div class="ac-req"><b>${esc(L.conv)} ${esc(v.held_on)}</b> · ${esc(L.howV[v.how])} · ${esc(L.nextV[v.family_next])}<p>${esc(v.summary)}</p></div>`).join('')}
      ${n.status === 'draft' && n.mine ? `<button class="btn soft small" type="button" data-submit="${esc(n.id)}">${esc(L.submit)}</button>` : ''}
      ${role === 'director' && (n.status === 'submitted' || n.status === 'reviewed') ? `<form class="ac-form ac-review" data-review="${esc(n.id)}"><div class="ac-row">
        <label class="f"><span>${esc(L.decide)}</span><select class="i" name="decision">${Object.entries(L.dec).map(([v, l]) => `<option value="${v}"${n.decision === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
        <label class="f"><span>${esc(L.dirNote)}</span><input class="i" name="note" maxlength="1000"></label><button class="btn navy small" type="submit">${esc(L.record)}</button>
        ${n.status === 'reviewed' ? `<button class="btn link small" type="button" data-close="${esc(n.id)}">${esc(L.close)}</button>` : ''}</div></form>` : ''}
      ${(role === 'director' || role === 'lead') && n.decision === 'talk_with_family' && n.status !== 'closed' ? `<form class="ac-form ac-conv" data-conv="${esc(n.id)}"><h4>${esc(L.convTitle)}</h4><div class="ac-row">
        <label class="f"><span>${esc(L.heldOn)}</span><input class="i" type="date" name="held_on" value="${today()}" max="${today()}" required></label>
        <label class="f"><span>${esc(L.how)}</span><select class="i" name="how">${HOW.map((v) => `<option value="${v}">${esc(L.howV[v])}</option>`).join('')}</select></label>
        <label class="f"><span>${esc(L.next)}</span><select class="i" name="family_next">${NEXT.map((v) => `<option value="${v}">${esc(L.nextV[v])}</option>`).join('')}</select></label></div>
        <label class="f"><span>${esc(L.summary)}</span><textarea class="i" name="summary" rows="3" maxlength="1500" required></textarea></label>
        <fieldset class="ac-checks"><legend>${esc(L.resShared)}</legend>${(ei.resources || []).map((r) => `<label class="ac-check"><input type="checkbox" name="res" value="${esc(r.id)}"><span>${esc(lang === 'es' ? r.name_es : r.name_en)}</span></label>`).join('')}</fieldset>
        <label class="ac-check"><input type="checkbox" name="close"><span>${esc(L.closeAfter)}</span></label><button class="btn navy small" type="submit">${esc(L.logIt)}</button></form>` : ''}</article>`;

  page(shell(`<div class="ac-page" id="adaptPage">
    <p><a class="btn link small" data-nav href="/c/${esc(c.slug)}/adapt">${esc(L.back)}</a></p>
    <div class="card" id="acChild"><h2>${esc(L.settingsFor(a.name))}</h2><p class="small muted">${esc(L.intro)}</p><p class="small">${esc(L.scoreNote)}</p>
      <form class="ac-form" id="acForm">${settingsFormHtml(esc, L, s, { note: a.note })}<button class="btn navy" type="submit">${esc(L.save)}</button><p class="small msg" id="acMsg" role="status"></p></form></div>
    <div class="card" id="acRequests"><h3>${esc(L.reqTitle)}</h3>${a.requests.length ? a.requests.map((r) => `<div class="ac-req" data-req="${esc(r.id)}"><span class="chip">${esc(L.status[r.status])}</span>
      <p class="small"><b>${esc(L.wants)}:</b> ${wantsText(esc, L, r.wanted) || '—'}</p>${r.message ? `<p class="small"><b>${esc(L.message)}:</b> ${esc(r.message)}</p>` : ''}${r.response ? `<p class="small"><b>${esc(L.response)}:</b> ${esc(r.response)}</p>` : ''}
      ${r.status === 'open' ? `<div class="ac-row"><label class="f"><span>${esc(L.response)}</span><input class="i" data-resp="${esc(r.id)}" maxlength="500"></label>
        <button class="btn navy small" type="button" data-apply="${esc(r.id)}">${esc(L.apply)}</button><button class="btn soft small" type="button" data-decline="${esc(r.id)}">${esc(L.decline)}</button></div>` : ''}</div>`).join('') : `<p class="empty">${esc(L.reqNone)}</p>`}</div>
    <div class="card" id="acEi"><h3>${esc(L.eiTitle)}</h3><p class="small muted">${esc(L.eiIntro)}</p>
      ${ei ? `${ei.notes.length ? ei.notes.map(noteHtml).join('') : `<p class="empty">${esc(L.eiNone)}</p>`}
      <form class="ac-form" id="eiForm"><fieldset class="ac-checks"><legend>${esc(L.areas)}</legend>${AREAS.map((x) => `<label class="ac-check"><input type="checkbox" name="area" value="${x}"><span>${esc(L.area[x])}</span></label>`).join('')}</fieldset>
        <label class="f"><span>${esc(L.observed)}</span><textarea class="i" name="observed" rows="4" minlength="20" maxlength="2000" required></textarea></label>
        <label class="f"><span>${esc(L.tried)}</span><textarea class="i" name="tried" rows="2" maxlength="1000"></textarea></label>
        <div class="ac-row"><label class="f"><span>${esc(L.from)}</span><input class="i" type="date" name="from" value="${addDays(today(), -28)}" required></label><label class="f"><span>${esc(L.to)}</span><input class="i" type="date" name="to" value="${today()}" required></label></div>
        <div class="ac-row"><button class="btn soft" type="submit" name="draft">${esc(L.saveDraft)}</button><button class="btn navy" type="button" id="eiSubmitNew">${esc(L.submit)}</button></div>
        <p class="small msg" id="eiMsg" role="status"></p></form>
      <h4>${esc(L.resources)}</h4>${resourcesHtml(esc, L, ei.resources, lang, true)}` : `<p class="small muted">${esc(L.eiHidden)}</p>`}</div>
    ${guidesHtml(esc, L, lang)}</div>`), L.title);
  if (location.hash === '#acEi') document.getElementById('acEi')?.scrollIntoView({ block: 'start' });
  const reload = () => viewStaffChild(ctx, kid);
  const fail = (el, e) => { if (el) el.textContent = friendly(e); else live(friendly(e)); };

  document.getElementById('acForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.currentTarget; const msg = document.getElementById('acMsg');
    try { await rpc('accommodations_save', { p_center: c.center_id, p_kid: kid, p_settings: readSettings(f), p_note: f.querySelector('[name="note"]').value.trim() || null }); msg.textContent = L.saved; }
    catch (err) { fail(msg, err); }
  });
  document.getElementById('acRequests').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-apply],[data-decline]'); if (!b) return;
    const id = b.dataset.apply || b.dataset.decline;
    const resp = document.querySelector(`[data-resp="${id}"]`)?.value.trim() || null;
    try { await rpc('accommodation_request_decide', { p_id: id, p_apply: !!b.dataset.apply, p_response: resp }); reload(); } catch (err) { live(friendly(err)); }
  });
  if (!ei) return;
  const eiForm = document.getElementById('eiForm');
  const saveNote = async (submit) => {
    const msg = document.getElementById('eiMsg');
    const areas = [...eiForm.querySelectorAll('[name="area"]:checked')].map((x) => x.value);
    try {
      await rpc('ei_note_save', { p_center: c.center_id, p_kid: kid, p_areas: areas, p_observed: eiForm.querySelector('[name="observed"]').value,
        p_from: eiForm.querySelector('[name="from"]').value, p_to: eiForm.querySelector('[name="to"]').value, p_tried: eiForm.querySelector('[name="tried"]').value.trim() || null,
        p_id: null, p_submit: submit });
      reload();
    } catch (err) { fail(msg, err); }
  };
  eiForm.addEventListener('submit', (e) => { e.preventDefault(); saveNote(false); });
  document.getElementById('eiSubmitNew').addEventListener('click', () => { if (eiForm.reportValidity()) saveNote(true); });
  const box = document.getElementById('acEi');
  box.addEventListener('click', async (e) => {
    const sb = e.target.closest('[data-submit]'); const cl = e.target.closest('[data-close]');
    try {
      if (sb) {
        const n = ei.notes.find((x) => x.id === sb.dataset.submit);
        await rpc('ei_note_save', { p_center: c.center_id, p_kid: kid, p_areas: n.areas, p_observed: n.observed, p_from: n.observed_from, p_to: n.observed_to, p_tried: n.tried, p_id: n.id, p_submit: true });
        reload();
      } else if (cl) { await rpc('ei_note_close', { p_id: cl.dataset.close }); reload(); }
    } catch (err) { live(friendly(err)); }
  });
  box.addEventListener('submit', async (e) => {
    const f = e.target;
    if (!f.matches('.ac-review, .ac-conv')) return;
    e.preventDefault();
    try {
      if (f.dataset.review) await rpc('ei_note_review', { p_id: f.dataset.review, p_decision: f.querySelector('[name="decision"]').value, p_note: f.querySelector('[name="note"]').value.trim() || null });
      else await rpc('ei_conversation_log', { p_note: f.dataset.conv, p_held_on: f.querySelector('[name="held_on"]').value, p_how: f.querySelector('[name="how"]').value,
        p_summary: f.querySelector('[name="summary"]').value, p_resources: [...f.querySelectorAll('[name="res"]:checked')].map((x) => x.value),
        p_family_next: f.querySelector('[name="family_next"]').value, p_close: f.querySelector('[name="close"]').checked });
      reload();
    } catch (err) { live(friendly(err)); }
  });
}

// ===========================================================================================================================
// Family
// ===========================================================================================================================
async function viewFamily(ctx) {
  const { c, shell, page, rpc, esc, friendly, lang } = ctx;
  const L = W[lang === 'es' ? 'es' : 'en'];
  page(shell('<p class="loading">…</p>'), L.title);
  let kids, a, ei = null;
  try { kids = await rpc('kid_mode_kids', { p_center: c.center_id, p_room: null }); } catch (e) { return page(shell(`<div class="card" id="adaptPage"><p class="msg bad" role="alert">${esc(friendly(e))}</p></div>`), L.title); }
  if (!kids.length) return page(shell(`<div class="card" id="adaptPage"><h2>${esc(L.title)}</h2><p>${esc(L.none)}</p></div>`), L.title);
  const want = new URLSearchParams(location.search).get('kid');
  const cur = kids.find((k) => k.kid === want) || kids[0];
  try { a = await rpc('accommodations_get', { p_center: c.center_id, p_kid: cur.kid }); } catch (e) { return page(shell(`<div class="card" id="adaptPage"><p class="msg bad" role="alert">${esc(friendly(e))}</p></div>`), L.title); }
  try { ei = await rpc('ei_notes_for_child', { p_center: c.center_id, p_kid: cur.kid }); } catch (_) { ei = null; }
  const on = onLabels(a.settings, lang);
  page(shell(`<div class="ac-page" id="adaptPage">
    ${kids.length > 1 ? `<nav class="tabs" aria-label="${esc(L.title)}">${kids.map((k) => `<a href="/c/${esc(c.slug)}/adapt?kid=${encodeURIComponent(k.kid)}" data-nav${k.kid === cur.kid ? ' aria-current="page"' : ''}>${esc(k.label)}</a>`).join('')}</nav>` : ''}
    <div class="card" id="acFamily"><h2>${esc(L.famTitle(cur.label))}</h2><p class="small muted">${esc(L.intro)}</p>
      ${on.length ? `<ul class="ac-plain" id="acOn">${on.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : `<p id="acOn">${esc(L.famNone)}</p>`}</div>
    <div class="card" id="acAsk"><h3>${esc(L.famAsk)}</h3><p class="small muted">${esc(L.famAskHint)}</p>
      <form class="ac-form" id="acAskForm">${settingsFormHtml(esc, L, a.settings, { idp: 'fa', withNote: false })}
        <label class="f"><span>${esc(L.famMsg)}</span><textarea class="i" name="message" id="fa-msg" maxlength="500" rows="2"></textarea></label>
        <button class="btn navy" type="submit">${esc(L.send)}</button><p class="small msg" id="acAskMsg" role="status"></p></form>
      ${a.requests.map((r) => `<div class="ac-req" data-req="${esc(r.id)}"><span class="chip">${esc(L.status[r.status])}</span> <span class="small">${wantsText(esc, L, r.wanted)}</span>
        ${r.message ? `<p class="small">${esc(r.message)}</p>` : ''}${r.response ? `<p class="small"><b>${esc(L.response)}:</b> ${esc(r.response)}</p>` : ''}
        ${r.status === 'open' && r.mine ? `<button class="btn link small" type="button" data-withdraw="${esc(r.id)}">${esc(L.withdraw)}</button>` : ''}</div>`).join('')}</div>
    ${ei && ei.notes.length ? `<div class="card" id="acFamNotes"><h3>${esc(L.famNotes)}</h3>${ei.notes.map((n) => `<article class="ac-note"><p class="small muted">${esc(n.observed_from)} – ${esc(n.observed_to)} · ${n.areas.map((x) => esc(L.area[x])).join(' · ')}</p>
      <p>${esc(n.observed)}</p>${n.conversations.map((v) => `<p class="small"><b>${esc(L.conv)} ${esc(v.held_on)}:</b> ${esc(v.summary)}</p>`).join('')}</article>`).join('')}</div>` : ''}
    ${ei ? `<div class="card" id="acFamRes"><h3>${esc(L.famRes)}</h3><p class="small muted">${esc(L.famResHint)}</p>${resourcesHtml(esc, L, ei.resources, lang, false)}</div>` : ''}</div>`), L.title);
  const form = document.getElementById('acAskForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('acAskMsg');
    try {
      await rpc('accommodation_request', { p_center: c.center_id, p_kid: cur.kid, p_wanted: diffSettings(a.settings, readSettings(form)), p_message: form.querySelector('[name="message"]').value.trim() || null });
      msg.textContent = L.sent; setTimeout(() => viewFamily(ctx), 600);
    } catch (err) { msg.textContent = friendly(err); }
  });
  document.getElementById('acAsk').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-withdraw]'); if (!b) return;
    try { await rpc('accommodation_request_withdraw', { p_id: b.dataset.withdraw }); viewFamily(ctx); } catch (err) { document.getElementById('acAskMsg').textContent = friendly(err); }
  });
}

// A small card for the family's child page: a link to the adaptations page
export function familyAdaptCardHtml(esc, slug, kid, lang = 'en') {
  const L = W[lang === 'es' ? 'es' : 'en'];
  return `<div class="card" id="childAdapt"><h3>${esc(L.title)}</h3><p class="small muted">${esc(L.famAskHint)}</p>
    <a class="btn soft small" href="/c/${esc(slug)}/adapt?kid=${encodeURIComponent(kid)}" data-nav>${esc(L.title)}</a></div>`;
}
