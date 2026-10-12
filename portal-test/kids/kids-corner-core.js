// The Kids' corner, pure parts (hub/KIDS_CORNER.md): the words (English + Spanish DRAFT), the engagement tracker, the device kind and
// a few formatters. No DOM and no network: tests/kids-corner-unit.test.mjs imports this file directly.
//
// The tracker records what happens to ONE item at a time and sends batches through a function the page gives it (kid_engagement_log,
// the parent's Kid Mode session). Per item:
//   opened        the child opened it (a "Coming soon" card records only this: a demand signal for the owner)
//   started       it began (a video plays, a book opens, a move-along shows)
//   replayed      started again after it was finished once
//   completed     finished (video ended, "The end!", "I did it!", a card or message looked at for 5 s or more), with its active time
//   exited_early  left after it started, before the end, with its active time
//   skipped       left before it started, with its (short) time
//   reaction      a heart or a sad tap (no typing, ever)
// Active time = the sum of the gaps between "pulses" (a touch, a video frame, the start), each gap capped at the item's idle cut-off,
// and nothing while the page is hidden. So a tablet left on a paused video counts at most one cut-off, never an hour.
// When the database answers {recording:false} (no learning_insights consent) the tracker stops and forgets its queue: nothing is kept
// on the device, ever (there is no storage here).

export const SECTIONS = ['watch', 'read', 'play', 'stickers', 'messages'];
export const IDLE_SEC = { video: 60, kid_video: 60, book: 180, message: 120, move: 120, together: 120, check: 90, placeholder: 30 };
export const SEEN_SEC = 5;                                   // a card or a message looked at this long counts as finished
export const FINISH_SHARE = 0.9;                             // a video watched to 90 % counts as finished
export const DOMAINS = ['lang', 'cog', 'pmp', 'se', 'ss', 'atl', 'arts'];
export const KIND_TONE = { watch: 'booker', read: 'lumi', play: 'gold' };   // the chart colours (validated: tests/kids-corner-unit)
export const KIND_HEX = { watch: '#0B5ED7', read: '#D9488B', play: '#E8A317' };

export const KW = {
  en: {
    corner: (n) => `${n}'s corner`, cornerGeneric: "Kids' corner", handTitle: (n) => `Ready for ${n}'s corner?`,
    handSay: (n) => `Hand the device to ${n}. To leave, a grown-up presses and holds the Grown-ups button, then answers a sum.`,
    start: (n) => `Start ${n}'s corner`, otherKid: 'Another child', back: 'Back to the dashboard',
    recOn: 'Learning insights are on: what your child enjoys shows on your dashboard.', recOff: 'Learning insights are off: your child can play, nothing is recorded.',
    recTurnOn: 'Turn on in Privacy & consent', noConsent: "The Kids' corner needs your Kid Mode consent first (Privacy & consent). Saying no never affects enrollment.",
    underAge: (a) => `The Kids' corner opens at the age your center sets (${a}). This week's do-it-together cards are on Learning at home.`,
    noAge: "The Kids' corner needs your child's date of birth on file: ask the center.", privacy: 'Privacy & consent', learnAtHome: 'Learning at home',
    hi: (n, f) => `Hi ${n}! It's me, ${f}!`, hiNoName: (f) => `Hi! It's me, ${f}!`, ask: 'What do you want to do?',
    watch: 'Watch', read: 'Read', play: 'Play & learn', stickers: 'My stickers', messages: 'Messages',
    watchSay: 'Videos with the friends', readSay: 'Stories to read together', playSay: 'Move, play and try', stickersSay: 'What you did this week', messagesSay: 'From your friend',
    pickTitle: 'Pick your friend!', pickSay: 'Your friend stays with you in your corner.', friends: 'Friends', kids: 'Kids', go: "That's my friend!", change: 'Change my friend',
    comingSoon: 'Coming soon!', comingSoonSay: (f) => `${f} is making this one. Come back soon!`,
    todayVideo: (f) => `A video from ${f}!`, play_: 'Play', again: 'Watch again', theEnd: 'The end!', prevPage: 'Page before', nextPage: 'Next page', readWith: 'Read it with your grown-up',
    like: 'Did you like it?', yes: 'I liked it', no: 'Not for me', thanks: 'Thank you!', home: 'Home',
    move: 'Move along', together: 'With your grown-up', did: 'I did it!', showGrownUp: 'Show this to your grown-up. You do it together, away from the screen!',
    checks: "Let's play a check!", doneMark: 'Done', sticker: (f) => `${f}'s sticker: you did it!`, youDid: 'You did it!',
    stickersEmpty: 'Your stickers show up here when you finish something.', stickersFrom: 'Stickers this week',
    noMessages: 'No messages right now.', noVideos: 'No videos yet.', noBooks: 'No books yet.', noPlay: 'Nothing to play this week yet.',
    grownUps: 'Grown-ups', gateHold: 'Grown-ups: press and hold for 3 seconds', gateAsk: (a, b) => `What is ${a} + ${b}?`,
    gateWrong: 'Not quite. The corner stays open.', gateCancel: 'Keep playing', idle: 'Your corner is resting. Ask your grown-up.',
    pauseT: 'Come back soon!', pauseSay: (f) => `${f} is taking a little rest. The corner needs the internet.`, backT: 'Welcome back!', backGo: 'Keep playing',
    bye: 'Goodbye for now!', loading: 'Getting ready…', captions: 'Words on the screen', capEn: 'English', capEs: 'Español', capBoth: 'English + Español',
    draftEs: 'Spanish words are a draft.',
  },
  es: {
    corner: (n) => `El rincón de ${n}`, cornerGeneric: 'Rincón de los niños', handTitle: (n) => `¿Listos para el rincón de ${n}?`,
    handSay: (n) => `Dele el aparato a ${n}. Para salir, un adulto mantiene presionado el botón Adultos y responde una suma.`,
    start: (n) => `Abrir el rincón de ${n}`, otherKid: 'Otro niño', back: 'Volver al panel',
    recOn: 'La información de aprendizaje está activada: lo que disfruta su hijo aparece en su panel.', recOff: 'La información de aprendizaje está desactivada: su hijo puede jugar y no se registra nada.',
    recTurnOn: 'Activarla en Privacidad y consentimiento', noConsent: 'El Rincón de los niños necesita primero su consentimiento para el Modo Niños (Privacidad y consentimiento). Decir que no nunca afecta la inscripción.',
    underAge: (a) => `El Rincón de los niños se abre a la edad que fija su centro (${a}). Las tarjetas para hacer juntos están en Aprender en casa.`,
    noAge: 'El Rincón de los niños necesita la fecha de nacimiento de su hijo: pídasela al centro.', privacy: 'Privacidad y consentimiento', learnAtHome: 'Aprender en casa',
    hi: (n, f) => `¡Hola ${n}! ¡Soy ${f}!`, hiNoName: (f) => `¡Hola! ¡Soy ${f}!`, ask: '¿Qué quieres hacer?',
    watch: 'Ver', read: 'Leer', play: 'Jugar y aprender', stickers: 'Mis calcomanías', messages: 'Mensajes',
    watchSay: 'Videos con los amigos', readSay: 'Cuentos para leer juntos', playSay: 'Moverse, jugar e intentar', stickersSay: 'Lo que hiciste esta semana', messagesSay: 'De tu amigo',
    pickTitle: '¡Elige a tu amigo!', pickSay: 'Tu amigo se queda contigo en tu rincón.', friends: 'Amigos', kids: 'Niños y niñas', go: '¡Ese es mi amigo!', change: 'Cambiar de amigo',
    comingSoon: '¡Muy pronto!', comingSoonSay: (f) => `${f} está preparando este. ¡Vuelve pronto!`,
    todayVideo: (f) => `¡Un video de ${f}!`, play_: 'Ver', again: 'Ver otra vez', theEnd: '¡Fin!', prevPage: 'Página anterior', nextPage: 'Página siguiente', readWith: 'Léelo con tu adulto',
    like: '¿Te gustó?', yes: 'Me gustó', no: 'No es para mí', thanks: '¡Gracias!', home: 'Inicio',
    move: 'A moverse', together: 'Con tu adulto', did: '¡Lo hice!', showGrownUp: 'Muéstrale esto a tu adulto. ¡Lo hacen juntos, sin pantalla!',
    checks: '¡Vamos a jugar una prueba!', doneMark: 'Hecho', sticker: (f) => `La calcomanía de ${f}: ¡lo hiciste!`, youDid: '¡Lo hiciste!',
    stickersEmpty: 'Tus calcomanías aparecen aquí cuando terminas algo.', stickersFrom: 'Calcomanías de esta semana',
    noMessages: 'No hay mensajes ahora.', noVideos: 'Todavía no hay videos.', noBooks: 'Todavía no hay libros.', noPlay: 'Todavía no hay nada para jugar esta semana.',
    grownUps: 'Adultos', gateHold: 'Adultos: mantenga presionado 3 segundos', gateAsk: (a, b) => `¿Cuánto es ${a} + ${b}?`,
    gateWrong: 'No es correcto. El rincón sigue abierto.', gateCancel: 'Seguir jugando', idle: 'Tu rincón está descansando. Pregúntale a tu adulto.',
    pauseT: '¡Vuelve pronto!', pauseSay: (f) => `${f} está descansando un poquito. El rincón necesita internet.`, backT: '¡Bienvenido de nuevo!', backGo: 'Seguir jugando',
    bye: '¡Adiós por ahora!', loading: 'Preparando…', captions: 'Palabras en la pantalla', capEn: 'English', capEs: 'Español', capBoth: 'English + Español',
    draftEs: 'El español es un borrador.',
  },
};
export const kw = (lang) => KW[lang === 'es' ? 'es' : 'en'];

// Insight words (grown-ups: parent card, teacher component, director view). Spanish DRAFT.
export const IW = {
  en: {
    title: 'Learning at home', sub: (n) => `${n}'s corner this week`, sub14: (n, d) => `${n}'s corner, last ${d} days`,
    watch: 'Watching', read: 'Reading', play: 'Playing & learning', total: 'Time in the corner', min: (m) => `${m} min`, hr: (h, m) => (m ? `${h} h ${m} min` : `${h} h`),
    days: 'Day by day', favourites: 'Favourites', notYet: 'Not a favourite yet', activities: "This week's activities", doneOf: (d, n) => `${d} of ${n} done`,
    skills: 'Skills practised', tryNext: 'Try next', why: { this_week: "From this week's plan", new_skill: 'Something new to explore' },
    hearts: (n) => `${n} ${n === 1 ? 'heart' : 'hearts'}`, replays: (n) => `watched again ${n}×`, finished: 'finished', leftEarly: 'left early', sads: 'a sad tap',
    none: 'Nothing yet this week. Open the corner together to start.', recOff: 'Learning insights are off, so nothing is recorded. You can turn them on in Privacy & consent.',
    open: "Open the Kids' corner", privacy: 'Privacy & consent', table: 'Show as table', picture: 'Show as picture', lastActive: (d) => `Last in the corner: ${d}`,
    never: 'Not yet', noCompare: 'About your child only. Never compared with other children.',
    domain: { lang: 'Language & books', cog: 'Thinking & numbers', pmp: 'Moving & body', se: 'Feelings & friends', ss: 'Our world', atl: 'Trying & focus', arts: 'Art & music' },
    kind: { watch: 'Watch', read: 'Read', play: 'Play' },
    // teacher
    roomTitle: (r) => `Kids' corner at home: ${r}`, child: 'Child', time: 'Time', fav: 'Favourite', last: 'Last in the corner', homeDone: 'Home activities done',
    off: 'Insights off', roomNote: 'Home engagement from the Kids\' corner (families who turned on learning insights). Children in name order, never ranked.',
    // director
    cTitle: "Kids' corner: what children use and enjoy", cSub: (d) => `Last ${d} days, this center`, active: 'Children active', recording: 'with insights on',
    sessions: 'Visits', avgPer: 'Average per active child', mostLiked: 'Most liked', leastLiked: 'Least liked', dropoff: 'Where children stop', gaps: 'Content gaps',
    demand: 'Asked for (Coming soon taps)', item: 'Item', opens: 'Opens', finishRate: 'Finished', hearts_: 'Hearts', sads_: 'Sad taps', avgTime: 'Avg. time',
    left: 'Left early', skipped: 'Skipped', when: 'When children visit', devices: 'Devices', captions: 'Caption language', friendsPicked: 'Friends picked',
    allItems: 'Every item', none_: 'No engagement recorded yet.', range: 'Window', hq: 'Network (de-identified)',
  },
  es: {
    title: 'Aprender en casa', sub: (n) => `El rincón de ${n} esta semana`, sub14: (n, d) => `El rincón de ${n}, últimos ${d} días`,
    watch: 'Viendo', read: 'Leyendo', play: 'Jugando y aprendiendo', total: 'Tiempo en el rincón', min: (m) => `${m} min`, hr: (h, m) => (m ? `${h} h ${m} min` : `${h} h`),
    days: 'Día por día', favourites: 'Favoritos', notYet: 'Todavía no es un favorito', activities: 'Actividades de esta semana', doneOf: (d, n) => `${d} de ${n} hechas`,
    skills: 'Habilidades practicadas', tryNext: 'Para probar', why: { this_week: 'Del plan de esta semana', new_skill: 'Algo nuevo para explorar' },
    hearts: (n) => `${n} ${n === 1 ? 'corazón' : 'corazones'}`, replays: (n) => `visto otra vez ${n}×`, finished: 'terminado', leftEarly: 'dejado a medias', sads: 'una carita triste',
    none: 'Todavía nada esta semana. Abran el rincón juntos para empezar.', recOff: 'La información de aprendizaje está desactivada: no se registra nada. Puede activarla en Privacidad y consentimiento.',
    open: 'Abrir el Rincón de los niños', privacy: 'Privacidad y consentimiento', table: 'Ver como tabla', picture: 'Ver como dibujo', lastActive: (d) => `Último día en el rincón: ${d}`,
    never: 'Todavía no', noCompare: 'Solo sobre su hijo. Nunca se compara con otros niños.',
    domain: { lang: 'Lenguaje y libros', cog: 'Pensar y números', pmp: 'Moverse y el cuerpo', se: 'Sentimientos y amigos', ss: 'Nuestro mundo', atl: 'Intentar y concentrarse', arts: 'Arte y música' },
    kind: { watch: 'Ver', read: 'Leer', play: 'Jugar' },
    roomTitle: (r) => `Rincón de los niños en casa: ${r}`, child: 'Niño', time: 'Tiempo', fav: 'Favorito', last: 'Último día', homeDone: 'Actividades en casa hechas',
    off: 'Desactivada', roomNote: 'Participación en casa desde el Rincón de los niños (familias que activaron la información de aprendizaje). En orden de nombre, nunca por puesto.',
    cTitle: 'Rincón de los niños: qué usan y disfrutan', cSub: (d) => `Últimos ${d} días, este centro`, active: 'Niños activos', recording: 'con información activada',
    sessions: 'Visitas', avgPer: 'Promedio por niño activo', mostLiked: 'Más queridos', leastLiked: 'Menos queridos', dropoff: 'Dónde dejan', gaps: 'Faltan contenidos',
    demand: 'Pedidos (toques en Muy pronto)', item: 'Contenido', opens: 'Aperturas', finishRate: 'Terminado', hearts_: 'Corazones', sads_: 'Caritas tristes', avgTime: 'Tiempo prom.',
    left: 'Dejado a medias', skipped: 'Saltado', when: 'Cuándo visitan', devices: 'Aparatos', captions: 'Idioma de las palabras', friendsPicked: 'Amigos elegidos',
    allItems: 'Todos los contenidos', none_: 'Todavía no hay participación registrada.', range: 'Período', hq: 'Red (sin identificar)',
  },
};
export const iw = (lang) => IW[lang === 'es' ? 'es' : 'en'];

export const titleText = (t, lang) => (t ? (lang === 'es' && t.es) || t.en || '' : '');

// seconds -> "35 min" / "1 h 5 min" (rounded to the minute; a little time shows as 1 min, none as 0 min)
export function minutesText(sec, lang = 'en') {
  const W = iw(lang); const s = Math.max(0, Number(sec) || 0);
  const m = s === 0 ? 0 : Math.max(1, Math.round(s / 60));
  return m >= 60 ? W.hr(Math.floor(m / 60), m % 60) : W.min(m);
}

// A coarse device kind (never a model, a version or an id): phone, tablet or computer.
export function deviceKind({ ua = '', width = 1024, touch = 0 } = {}) {
  const u = String(ua);
  if (/iPad|Tablet|Android(?!.*Mobile)/i.test(u) || (/Macintosh/.test(u) && touch > 1)) return 'tablet';
  if (/Mobi|iPhone|Android/i.test(u)) return 'phone';
  if (touch > 0 && width <= 1366) return width < 700 ? 'phone' : 'tablet';
  return u ? 'computer' : 'unknown';
}

// The engagement tracker. send(events) -> Promise<{recording}>; now() -> ms; captions() -> 'en' | 'es' | 'both'.
export function createTracker({ send, now = () => Date.now(), captions = () => 'en', batch = 20 } = {}) {
  let on = true, hidden = false;
  const q = [];
  const open = new Set();
  const push = (ev) => {
    if (!on) return;
    q.push({ ...ev, captions: captions(), at: new Date(now()).toISOString() });
    if (q.length > 300) q.splice(0, q.length - 300);          // a long offline spell: keep the newest
    if (q.length >= batch) flush();
  };
  // sends everything queued, 60 at a time; a call while a send is running waits for it and then sends the rest (so the grown-up gate's
  // final flush never loses the last events)
  let running = null;
  async function flush() {
    if (running) { await running; if (!on || !q.length) return; }
    running = (async () => {
      while (on && q.length) {
        const chunk = q.splice(0, 60);
        try {
          const r = await send(chunk);
          if (r && r.recording === false) { on = false; q.length = 0; }
        } catch (_) { q.unshift(...chunk); break; }       // try again next time (the page pauses when offline)
      }
    })();
    try { await running; } finally { running = null; }
  }
  function item({ section, item_type, item_id }) {
    const base = { section, item_type, item_id: String(item_id) };
    const cutoff = (IDLE_SEC[item_type] || 60) * 1000;
    let started = false, done = false, closed = false, active = 0, last = now(), paused = hidden;
    const tick = () => { const t = now(); if (!paused) active += Math.min(Math.max(0, t - last), cutoff); last = t; };
    const secs = () => Math.round(active / 1000);
    const h = {
      get active() { tick(); return secs(); },
      get started() { return started; }, get done() { return done; },
      pulse() { if (!closed) tick(); },
      hide(v) { tick(); paused = v; last = now(); },
      start() {
        if (closed) return;
        tick();
        if (started && !done) return;                          // already going
        if (done) { push({ ...base, event: 'replayed' }); done = false; active = 0; } else push({ ...base, event: 'started' });
        started = true;
      },
      complete() {
        if (closed || done) return;
        tick(); if (!started) { started = true; push({ ...base, event: 'started' }); }
        done = true; push({ ...base, event: 'completed', active_sec: secs() }); active = 0;
      },
      react(r) { if (r === 'heart' || r === 'sad') push({ ...base, event: 'reaction', reaction: r }); },
      // close: finished things say nothing more; a card / message looked at for SEEN_SEC counts as finished
      close({ seen = false } = {}) {
        if (closed) return; tick();
        if (!done) {
          if (seen && secs() >= SEEN_SEC) { if (!started) push({ ...base, event: 'started' }); push({ ...base, event: 'completed', active_sec: secs() }); }
          else if (item_type !== 'placeholder') push({ ...base, event: started ? 'exited_early' : 'skipped', active_sec: secs() });
        }
        closed = true; open.delete(h);
      },
    };
    push({ ...base, event: 'opened' });
    open.add(h);
    return h;
  }
  return {
    item,
    section(name) { push({ section: name, item_type: 'section', item_id: name, event: 'opened' }); },
    picked(friend) { push({ section: 'pick', item_type: 'friend', item_id: friend, event: 'picked' }); },
    setHidden(v) { hidden = !!v; for (const h of open) h.hide(hidden); },
    closeAll() { for (const h of [...open]) h.close(); },
    flush,
    get recording() { return on; },
    get queued() { return q.length; },
    stop() { on = false; q.length = 0; },
  };
}

// The sticker book: this week's stickers grouped by day (oldest first). No count, no total, no empty slots.
export function stickerDays(stickers, lang = 'en') {
  const by = new Map();
  for (const s of stickers || []) { const d = String(s.day || '').slice(0, 10); if (!by.has(d)) by.set(d, []); by.get(d).push(s); }
  return [...by.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, list]) => ({
    day, label: day ? new Date(`${day}T12:00:00Z`).toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US', { weekday: 'long', timeZone: 'UTC' }) : '', list }));
}

// Share of time by watch / read / play (for the stacked bar), each 0..1, summing to 1 (or all 0).
export function kindShares(seconds = {}) {
  const w = Number(seconds.watch) || 0, r = Number(seconds.read) || 0, p = Number(seconds.play) || 0, t = w + r + p;
  return t ? { watch: w / t, read: r / t, play: p / t, total: t } : { watch: 0, read: 0, play: 0, total: 0 };
}

// Is a video "finished"? (ended, or 90 % watched)
export const videoFinished = (current, duration) => Number(duration) > 0 && Number(current) / Number(duration) >= FINISH_SHARE;
