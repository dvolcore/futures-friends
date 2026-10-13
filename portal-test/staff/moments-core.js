// Classroom moments, the pure part (no DOM): the words (English + Spanish DRAFT), the upload queue that survives a Wi-Fi drop, the
// sizes a photo is shrunk to, who will see a moment before it is sent, the share-link durations and the deep link. hub/MOMENTS.md.
// moments.js draws the screens; tests/moments-unit.test.mjs imports this file.

export const MAX_VIDEO_SEC = 30;
export const PHOTO_MAX_EDGE = 2048;       // the long edge a photo is shrunk to on the tablet (EXIF and location are dropped by the re-encode)
export const THUMB_EDGE = 480;
export const PHOTO_QUALITY = 0.82;
export const MAX_VIDEO_BYTES = 62914560;  // 60 MB (the bucket's limit)
export const SHARE_DAYS = [1, 7, 30];
export const BUCKET = 'classroom-moments';
// the skill / pillar tags a teacher may add when today's plan has nothing that fits (Learn. Move. Explore. Belong.)
export const SKILLS = ['learn', 'move', 'explore', 'belong', 'language', 'math', 'science', 'art', 'social'];

export const MW = {
  en: {
    title: 'Classroom moments', captureH: 'Snap a moment', sub: 'Photos and short videos for the families of the children in them.',
    takePhoto: 'Take photo', recordVideo: 'Record video', choose: 'Choose from library', maxVideo: `Videos up to ${MAX_VIDEO_SEC} seconds`,
    whoH: 'Who is in it?', whoHint: 'Tap every child in the picture. Children without photo consent cannot be tagged.',
    noConsent: 'No photo consent', noConsentWhy: (f) => `${f} has no photo consent on file, so ${f} cannot be in a photo. Take the picture without ${f}.`,
    consentPending: 'Consent waiting', groupOk: 'Group photos OK', selected: (n) => `${n} selected`,
    captionL: 'Caption (optional)', captionPh: 'What is happening?', activityL: 'Activity or skill (optional)', none: 'None',
    planH: "Today's plan", skillsH: 'Skills', skill: { learn: 'Learn', move: 'Move', explore: 'Explore', belong: 'Belong', language: 'Language & literacy', math: 'Math', science: 'Science', art: 'Art & making', social: 'Feelings & friends' },
    send: 'Send', sendN: (n) => `Send ${n}`, sending: 'Sending…', clear: 'Start over', remove: 'Remove',
    willSee: 'Who will see it', seeAll: 'Every tagged family will see it.', seeOwn: (names) => `Group photo: ${names} ${names.includes(' and ') ? 'have' : 'has'} no group-photo consent, so the other families will not see it. Each family still sees its own children.`,
    approvalOn: 'A director approves moments before families see them.', approvalOff: 'Moments go to families as soon as they are sent.',
    queued: 'Waiting to send', queuedHint: 'No connection right now. These stay on this tablet and go out by themselves when the Wi-Fi is back.',
    retry: 'Send now', discard: 'Discard', failed: 'Not sent', sentH: 'Sent today', noneSent: 'Nothing sent today yet.',
    st: { uploading: 'Uploading', pending: 'Waiting for approval', shared: 'Shared with families', queued: 'Waiting for Wi-Fi', failed: 'Not sent' },
    done: (n, pending) => (pending ? `${n === 1 ? 'Sent. It waits' : `${n} sent. They wait`} for a director's OK.` : `${n === 1 ? 'Sent to the families.' : `${n} sent to the families.`}`),
    pickMedia: 'Take or choose a photo or video first.', pickKid: 'Tag at least one child.', tooLong: (s) => `That video is ${s} seconds. Videos can be ${MAX_VIDEO_SEC} seconds at most.`,
    tooBig: 'That video is larger than 60 MB. Record a shorter one.', notImage: 'That file is not a photo or a video.', offline: 'Saved on this tablet. It goes out when the Wi-Fi is back.',
    del: 'Delete', delAsk: 'Delete this moment? Families will not see it any more.', deleted: 'Deleted.',
    approveH: 'Moments to approve', approveSub: 'Families see these after you approve them.', approve: 'Approve', decline: 'Decline', nothingWaiting: 'Nothing is waiting for approval.',
    approved: 'Approved: the families can see it now.', declined: 'Declined and deleted.', modeH: 'How moments are shared', modeAuto: 'Share right away', modeDirector: 'A director approves first',
    modeSaved: 'Saved.', by: (n, r) => `${n} · ${r}`,
    feedH: 'Moments', feedSub: (f) => `Photos and videos of ${f} from the classroom.`, today: 'Today', week: 'This week', month: 'This month',
    empty: (f) => `No moments of ${f} yet today. Teachers share photos and short videos during the day.`, emptyRange: (f) => `No moments of ${f} in this time.`,
    consentH: 'Photos need your OK', consentP: (f) => `Teachers can only take photos of ${f} after you give the photos consent. Until then ${f} shows as a friend.`, consentGo: 'Review consents',
    groupNote: 'Group photos with other children show when every family has said yes to group photos.',
    open: (t) => `Open the moment from ${t}`, video: 'Video', photo: 'Photo', withOthers: (n) => (n === 1 ? 'with 1 other child' : `with ${n} other children`),
    heart: 'Love it', hearted: 'You loved this', hearts: (n) => (n === 1 ? '1 heart' : `${n} hearts`), save: 'Save', saveDone: 'Saved to your device.',
    share: 'Share with family', shareH: 'Share with family', shareP: 'A private link for grandparents and family. It only opens this one moment, it cannot be changed, and it stops working when it expires.',
    shareGroup: 'This moment shows other children too, so it stays inside the Hub and cannot be shared by link.',
    shareFor: 'Link works for', days: (n) => (n === 1 ? '1 day' : `${n} days`), labelL: 'Who is it for? (optional)', labelPh: 'Grandma Rosa',
    makeLink: 'Make the link', copy: 'Copy link', copied: 'Link copied.', shareSys: 'Share…', linkMade: 'Link ready. Send it to your family.',
    links: 'Your links', stop: 'Stop link', stopped: 'Link stopped.', expires: (d) => `Works until ${d}`, expired: 'Expired', revoked: 'Stopped', views: (n) => (n === 1 ? 'opened once' : `opened ${n} times`),
    close: 'Close', prev: 'Previous moment', next: 'Next moment', of: (i, n) => `${i} of ${n}`,
    tileH: 'Moments today', tileN: (n) => (n === 1 ? '1 new moment' : `${n} new moments`), tileNone: 'No moments yet today', tileOpen: 'See moments',
    missing: 'That moment is not available any more, or your account cannot open it.', couldNot: 'Moments could not be loaded. Try again in a moment.', loading: 'Loading…',
    retryLoad: 'Try again',
  },
  es: {
    title: 'Momentos del salón', captureH: 'Capture un momento', sub: 'Fotos y videos cortos para las familias de los niños que aparecen.',
    takePhoto: 'Tomar foto', recordVideo: 'Grabar video', choose: 'Elegir de la galería', maxVideo: `Videos de hasta ${MAX_VIDEO_SEC} segundos`,
    whoH: '¿Quién aparece?', whoHint: 'Toque a cada niño que aparece. Los niños sin consentimiento de fotos no se pueden etiquetar.',
    noConsent: 'Sin consentimiento de fotos', noConsentWhy: (f) => `${f} no tiene consentimiento de fotos, así que no puede aparecer en una foto. Tome la foto sin ${f}.`,
    consentPending: 'Consentimiento pendiente', groupOk: 'Fotos de grupo: sí', selected: (n) => `${n} seleccionados`,
    captionL: 'Descripción (opcional)', captionPh: '¿Qué está pasando?', activityL: 'Actividad o habilidad (opcional)', none: 'Ninguna',
    planH: 'El plan de hoy', skillsH: 'Habilidades', skill: { learn: 'Aprender', move: 'Moverse', explore: 'Explorar', belong: 'Pertenecer', language: 'Lenguaje y lectura', math: 'Matemáticas', science: 'Ciencias', art: 'Arte y creación', social: 'Emociones y amigos' },
    send: 'Enviar', sendN: (n) => `Enviar ${n}`, sending: 'Enviando…', clear: 'Empezar de nuevo', remove: 'Quitar',
    willSee: 'Quién lo verá', seeAll: 'Todas las familias etiquetadas lo verán.', seeOwn: (names) => `Foto de grupo: ${names} no ${names.includes(' y ') ? 'tienen' : 'tiene'} consentimiento de fotos de grupo, así que las otras familias no la verán. Cada familia sí ve a sus propios hijos.`,
    approvalOn: 'Una directora aprueba los momentos antes de que las familias los vean.', approvalOff: 'Los momentos llegan a las familias en cuanto se envían.',
    queued: 'Esperando para enviar', queuedHint: 'No hay conexión ahora. Se guardan en esta tableta y se envían solos cuando vuelva el Wi-Fi.',
    retry: 'Enviar ahora', discard: 'Descartar', failed: 'No se envió', sentH: 'Enviados hoy', noneSent: 'Todavía no se ha enviado nada hoy.',
    st: { uploading: 'Subiendo', pending: 'Esperando aprobación', shared: 'Compartido con las familias', queued: 'Esperando Wi-Fi', failed: 'No se envió' },
    done: (n, pending) => (pending ? `${n === 1 ? 'Enviado. Espera' : `${n} enviados. Esperan`} la aprobación de una directora.` : `${n === 1 ? 'Enviado a las familias.' : `${n} enviados a las familias.`}`),
    pickMedia: 'Primero tome o elija una foto o un video.', pickKid: 'Etiquete al menos a un niño.', tooLong: (s) => `Ese video dura ${s} segundos. Los videos pueden durar ${MAX_VIDEO_SEC} segundos como máximo.`,
    tooBig: 'Ese video pesa más de 60 MB. Grabe uno más corto.', notImage: 'Ese archivo no es una foto ni un video.', offline: 'Guardado en esta tableta. Se envía cuando vuelva el Wi-Fi.',
    del: 'Borrar', delAsk: '¿Borrar este momento? Las familias ya no lo verán.', deleted: 'Borrado.',
    approveH: 'Momentos para aprobar', approveSub: 'Las familias los ven después de que usted los apruebe.', approve: 'Aprobar', decline: 'Rechazar', nothingWaiting: 'No hay nada esperando aprobación.',
    approved: 'Aprobado: las familias ya lo pueden ver.', declined: 'Rechazado y borrado.', modeH: 'Cómo se comparten los momentos', modeAuto: 'Compartir de inmediato', modeDirector: 'Una directora aprueba primero',
    modeSaved: 'Guardado.', by: (n, r) => `${n} · ${r}`,
    feedH: 'Momentos', feedSub: (f) => `Fotos y videos de ${f} en el salón.`, today: 'Hoy', week: 'Esta semana', month: 'Este mes',
    empty: (f) => `Todavía no hay momentos de ${f} hoy. Las maestras comparten fotos y videos cortos durante el día.`, emptyRange: (f) => `No hay momentos de ${f} en este tiempo.`,
    consentH: 'Las fotos necesitan su permiso', consentP: (f) => `Las maestras solo pueden tomar fotos de ${f} después de que usted dé el consentimiento de fotos. Mientras tanto, ${f} aparece como un amigo.`, consentGo: 'Revisar los consentimientos',
    groupNote: 'Las fotos de grupo con otros niños se muestran cuando todas las familias dijeron que sí a las fotos de grupo.',
    open: (t) => `Abrir el momento de las ${t}`, video: 'Video', photo: 'Foto', withOthers: (n) => (n === 1 ? 'con 1 niño más' : `con ${n} niños más`),
    heart: 'Me encanta', hearted: 'Le encantó', hearts: (n) => (n === 1 ? '1 corazón' : `${n} corazones`), save: 'Guardar', saveDone: 'Guardado en su dispositivo.',
    share: 'Compartir con la familia', shareH: 'Compartir con la familia', shareP: 'Un enlace privado para abuelos y familia. Solo abre este momento, no se puede cambiar y deja de funcionar cuando vence.',
    shareGroup: 'En este momento aparecen otros niños, así que se queda dentro del Hub y no se puede compartir por enlace.',
    shareFor: 'El enlace funciona por', days: (n) => (n === 1 ? '1 día' : `${n} días`), labelL: '¿Para quién es? (opcional)', labelPh: 'Abuela Rosa',
    makeLink: 'Crear el enlace', copy: 'Copiar enlace', copied: 'Enlace copiado.', shareSys: 'Compartir…', linkMade: 'Enlace listo. Envíelo a su familia.',
    links: 'Sus enlaces', stop: 'Detener enlace', stopped: 'Enlace detenido.', expires: (d) => `Funciona hasta el ${d}`, expired: 'Vencido', revoked: 'Detenido', views: (n) => (n === 1 ? 'abierto una vez' : `abierto ${n} veces`),
    close: 'Cerrar', prev: 'Momento anterior', next: 'Momento siguiente', of: (i, n) => `${i} de ${n}`,
    tileH: 'Momentos de hoy', tileN: (n) => (n === 1 ? '1 momento nuevo' : `${n} momentos nuevos`), tileNone: 'Todavía no hay momentos hoy', tileOpen: 'Ver los momentos',
    missing: 'Ese momento ya no está disponible, o su cuenta no puede abrirlo.', couldNot: 'No se pudieron cargar los momentos. Intente de nuevo en un momento.', loading: 'Cargando…',
    retryLoad: 'Intentar de nuevo',
  },
};
export const mw = (lang) => MW[lang === 'es' ? 'es' : 'en'];

// ---- sizes ------------------------------------------------------------------------------------------------------------------
// the size to draw an image at so its long edge is at most `max` (never enlarged); whole pixels
export function fitSize(w, h, max) {
  const W = Number(w) || 0, H = Number(h) || 0;
  if (W <= 0 || H <= 0) return { width: 0, height: 0 };
  const s = Math.min(1, max / Math.max(W, H));
  return { width: Math.max(1, Math.round(W * s)), height: Math.max(1, Math.round(H * s)) };
}
// what a picked file is: 'photo' | 'video' | null, from its type (iPhone HEIC is a photo: the canvas re-encodes it as JPEG)
export function mediaKind(type) {
  const t = String(type || '').toLowerCase();
  if (/^image\/(jpeg|jpg|png|webp|heic|heif|gif)$/.test(t)) return 'photo';
  if (/^video\/(mp4|quicktime|webm)$/.test(t)) return 'video';
  return null;
}
// a video's problem before upload: null when fine
export function videoProblem(durationSec, bytes, lang = 'en') {
  const L = mw(lang);
  if (!(durationSec > 0)) return L.notImage;
  if (durationSec > MAX_VIDEO_SEC + 0.5) return L.tooLong(Math.round(durationSec));
  if (bytes > MAX_VIDEO_BYTES) return L.tooBig;
  return null;
}
export const videoMime = (type) => (/quicktime/i.test(type) ? 'video/quicktime' : /webm/i.test(type) ? 'video/webm' : 'video/mp4');

// ---- the roster: who can be tagged, and who will see it -------------------------------------------------------------------------
// a child chip's state: { taggable, reason: null | 'no_consent' | 'pending' }
export function kidTag(k) {
  if (k.photo_ok) return { taggable: true, reason: null };
  return { taggable: false, reason: k.photo_state === 'pending_verification' ? 'pending' : 'no_consent' };
}
// Before sending: which tagged children have no group consent (so in a group moment the other families will not see it).
// Mirrors moment_visible_for in the database (that is the rule; this is the explanation on the tablet).
export function groupNotice(kids, tagged) {
  const sel = kids.filter((k) => tagged.includes(k.id));
  if (sel.length < 2) return { group: false, blocked: [] };
  return { group: true, blocked: sel.filter((k) => !k.group_ok).map((k) => k.first) };
}
export const andList = (names, lang = 'en') => {
  const a = names.filter(Boolean);
  if (a.length <= 1) return a.join('');
  return `${a.slice(0, -1).join(', ')} ${lang === 'es' ? 'y' : 'and'} ${a[a.length - 1]}`;
};

// ---- the deep link a notification opens (same as moment_link in the database) --------------------------------------------------
export function momentLink(slug, kid, id) {
  const q = new URLSearchParams({ kid, view: 'today', tab: 'photos', moment: id });
  return `/c/${encodeURIComponent(slug)}/home?${q.toString()}`;
}
export const isMomentId = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(String(v || ''));
export const isShareToken = (v) => /^[A-Za-z0-9_-]{43}$/.test(String(v || ''));
// the date range of a feed tab, in the center's days ('today' | 'week' | 'month')
export function rangeFor(tab, today) {
  const d = new Date(`${today}T12:00:00Z`);
  const back = tab === 'week' ? 6 : tab === 'month' ? 30 : 0;
  d.setUTCDate(d.getUTCDate() - back);
  return { from: d.toISOString().slice(0, 10), to: today };
}

// ---- the upload queue: survives a Wi-Fi drop and a reload ----------------------------------------------------------------------
// Same idea as offline-edits.js (a waiting list on the device, replayed when the hub is reachable), for NEW moments only: nothing can
// clash, and every step is idempotent because the moment id is made here (moment_begin answers a replay; an upload that already
// arrived answers "exists", which counts as done; moment_finish answers the state it is in).
//   store: an async key-value store { get(id), put(item), del(id), all() } (IndexedDB in the browser, a Map in tests; files are Blobs)
//   item:  { id, center, room, kind, mime, bytes, duration, width, height, kids, caption, activity, takenAt, files: { main, thumb, poster },
//            step: 'new' | 'begun' | 'uploaded', error, queuedAt }
export const isNetworkError = (e, online = typeof navigator === 'undefined' ? true : navigator.onLine) =>
  online === false || /Failed to fetch|NetworkError|network|Load failed|timeout|fetch failed|ECONNREFUSED|ENOTFOUND|aborted/i.test(String(e?.message || e));
export const isExistsError = (e) => /exists|Duplicate|409/i.test(String(e?.message || e?.error || e?.statusCode || e));
const MAX_AGE = 7 * 24 * 3600 * 1000;

export function memoryStore() {
  const m = new Map();
  return { get: async (id) => m.get(id) ?? null, put: async (it) => { m.set(it.id, it); }, del: async (id) => { m.delete(id); }, all: async () => [...m.values()] };
}

// api: { begin(item) -> { status, paths }, upload(path, blob, mime) -> void (throws; "exists" is fine), finish(item) -> { status } }
// -> { sent: [{ id, status }], failed: [{ id, error }], offline: boolean, left: number }
export async function runQueue(store, api, { now = Date.now } = {}) {
  const out = { sent: [], failed: [], offline: false, left: 0 };
  const items = (await store.all()).sort((a, b) => (a.queuedAt || 0) - (b.queuedAt || 0));
  for (const it of items) {
    if (now() - (it.queuedAt || 0) > MAX_AGE) { await store.del(it.id); continue; }   // a week old: the moment is stale, dropped
    if (it.error) { out.failed.push({ id: it.id, error: it.error }); continue; }       // refused: waits for the teacher (discard)
    try {
      let cur = it;
      if (cur.step === 'new') {
        const r = await api.begin(cur);
        cur = { ...cur, step: 'begun', paths: r.paths, status: r.status };
        await store.put(cur);
      }
      if (cur.step === 'begun' && cur.status === 'uploading') {
        for (const [k, path] of Object.entries(cur.paths || {})) {
          const blob = cur.files?.[k];
          if (!path || !blob) continue;
          try { await api.upload(path, blob, k === 'main' ? cur.mime : 'image/jpeg'); } catch (e) { if (!isExistsError(e)) throw e; }
        }
        cur = { ...cur, step: 'uploaded' };
        await store.put(cur);
      }
      const f = cur.status && cur.status !== 'uploading' ? { status: cur.status } : await api.finish(cur);
      if (f.status === 'refused') {                 // consent withdrawn while it uploaded: the hub deleted it; the teacher sees why
        await store.put({ ...cur, files: null, error: f.error || 'refused' });
        out.failed.push({ id: cur.id, error: f.error || 'refused' });
        continue;
      }
      await store.del(cur.id);
      out.sent.push({ id: cur.id, status: f.status });
    } catch (e) {
      if (isNetworkError(e)) { out.offline = true; break; }
      const msg = String(e?.message || e);
      await store.put({ ...it, error: msg });
      out.failed.push({ id: it.id, error: msg });
    }
  }
  out.left = (await store.all()).length;
  return out;
}

// a new queue item for one picked file (the caller adds the files)
export function queueItem({ id, center, room, kind, mime, bytes, duration = null, width = null, height = null, kids, caption = '', activity = null, takenAt, files }, now = Date.now) {
  return { id, center, room, kind, mime, bytes, duration, width, height, kids: [...kids], caption: String(caption || '').trim().slice(0, 300) || null,
    activity, takenAt: takenAt || new Date(now()).toISOString(), files, step: 'new', error: null, queuedAt: now() };
}
// the begin call's arguments for an item
export const beginArgs = (it) => ({ p_center: it.center, p_id: it.id, p_room: it.room, p_kind: it.kind, p_mime: it.mime, p_bytes: it.bytes, p_kids: it.kids,
  p_caption: it.caption, p_activity: it.activity, p_taken_at: it.takenAt, p_duration_sec: it.kind === 'video' ? it.duration : null,
  p_width: it.width, p_height: it.height, p_thumb: !!it.files?.thumb, p_poster: !!it.files?.poster });

// a share-link's line: { state: 'active'|'expired'|'revoked', text }
export function linkState(l, lang = 'en', now = Date.now()) {
  const L = mw(lang);
  if (l.revoked) return { state: 'revoked', text: L.revoked };
  if (Date.parse(l.expires_at) <= now) return { state: 'expired', text: L.expired };
  const d = new Date(l.expires_at).toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return { state: 'active', text: L.expires(d) };
}
