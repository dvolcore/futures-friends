// Home learning: the pure parts of the parent home-learning hub (hub/HOME_LEARNING.md), shared by home-learning.js and the unit
// tests (tests/home-learning-unit.test.mjs). No DOM, no network.
//
// Owner decisions 2026-10-10: no screen-time cap (time learning is information only, never a limit or a warning); families may upload
// photos and short videos of learning at home (consent 'family_uploads'); photos are re-encoded in the browser so EXIF and location
// never leave the device.

export const IMAGE_MAX = 10 * 1024 * 1024;         // 10 MB after re-encoding (database and bucket check it again)
export const VIDEO_MAX = 100 * 1024 * 1024;        // 100 MB (the bucket's file size limit)
export const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
export const REACTIONS = ['heart', 'star', 'clap', 'smile', 'sparkle'];
export const REACTION_ICON = { heart: '❤️', star: '⭐', clap: '👏', smile: '😊', sparkle: '✨' };

// The program's unit titles (content/program/calendar-180.json; a unit test keeps them in step). Spanish: DRAFT.
export const UNITS = {
  en: ['Welcome to Futures: Meet the Friends', 'All About Me', 'Fall Harvest and Eat the Rainbow', 'Kindness Everywhere', 'Winter Wonders',
    'Friends and Community Helpers', 'Brave Builders', 'Growing Things', 'Creature Discovery', 'Healthy Summer, Safe Summer',
    'Stories and Imagination', 'Ready, Set, Grow!'],
  es: ['Bienvenidos a Futures: conoce a los amigos', 'Todo sobre mí', 'Cosecha de otoño y come el arcoíris', 'Bondad en todas partes',
    'Maravillas del invierno', 'Amigos y ayudantes de la comunidad', 'Constructores valientes', 'Cosas que crecen', 'Descubriendo criaturas',
    'Verano sano, verano seguro', 'Cuentos e imaginación', '¡Listos, a crecer!'],
};
export const unitTitle = (n, lang = 'en') => (UNITS[lang === 'es' ? 'es' : 'en'][Number(n) - 1] || UNITS.en[Number(n) - 1] || '');

// What a chosen file becomes: a photo (always re-encoded to JPEG first) or a video (sent as it is), or a reason it cannot be shared.
export function classifyFile(file) {
  const type = String(file?.type || '').toLowerCase();
  const size = Number(file?.size || 0);
  if (!size) return { ok: false, why: 'empty' };
  if (type.startsWith('image/')) return { ok: true, kind: 'image' };     // size is checked after re-encoding
  if (VIDEO_TYPES.includes(type)) return size > VIDEO_MAX ? { ok: false, why: 'videoTooBig' } : { ok: true, kind: 'video', mime: type };
  return { ok: false, why: 'type' };
}

// Minutes for the "time learning this week" line: whole minutes, never negative. Information only.
export const minutes = (sec) => Math.max(0, Math.round(Number(sec || 0) / 60));

// Does this JPEG still carry metadata a family did not mean to share? Looks for an APP1 segment (Exif or XMP) before the image data.
// The page re-encodes every photo through a canvas (which writes none) and then checks with this before uploading.
export function jpegHasMetadata(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return false;     // not a JPEG
  let i = 2;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) return false;
    const marker = b[i + 1];
    if (marker === 0xda || marker === 0xd9) return false;              // start of scan / end of image: no more headers
    const len = (b[i + 2] << 8) | b[i + 3];
    if (marker === 0xe1) {                                             // APP1: Exif or XMP
      const tag = String.fromCharCode(...b.subarray(i + 4, Math.min(i + 4 + 28, b.length)));
      if (tag.startsWith('Exif') || tag.startsWith('http://ns.adobe.com/xap')) return true;
    }
    i += 2 + len;
  }
  return false;
}

// Family and teacher words (family-facing: English + Spanish DRAFT; staff views English for now)
export const HW = {
  en: {
    title: 'Learning at home', intro: 'What your child is learning at school this week, and ideas to do together at home.',
    week: (u, t) => `This week at school: Unit ${u}${t ? `, ${t}` : ''}`, theme: 'Theme', doAtHome: 'Do this at home',
    draft: 'Draft activities: not yet reviewed', weDid: 'We did it', done: 'Done', note: 'What did your child do or say? (optional)', save: 'Save',
    addProof: 'Add a photo or video', time: 'Time learning this week', timeLine: (h, c) => `Kid Mode: ${h} min at home, ${c} min at the center.`,
    timeHint: 'Shown for your information. There is no limit.', openKid: 'Open Kid Mode', kidNo: 'Kid Mode is not available for this child yet.',
    share: 'Share from home', shareIntro: 'Share a photo or a short video of your child learning at home. Only you, the other guardians and your child\'s teachers can see it.',
    pick: 'Choose a photo or video', caption: 'Caption (optional)', which: 'Which activity? (optional)', none: 'None', send: 'Share',
    photoNote: 'Photos are cleaned before they leave your device: location and camera details are removed. Videos are sent as they are: please avoid showing your address or other children.',
    consentNeeded: 'To share photos and videos, first give your consent in Privacy & consent. Saying no never affects enrollment.', privacy: 'Privacy & consent',
    shared: 'What you shared', nothing: 'Nothing shared yet.', teacher: 'Teacher', del: 'Delete', delAsk: 'Delete this upload?',
    portfolio: 'Portfolio', inPortfolio: 'In the portfolio', empty: 'Nothing recorded yet.', teacherNote: 'Teacher note', byKid: 'in Kid Mode', byYou: 'marked by family', byStaff: 'at the center',
    sending: 'Sending…', sent: 'Shared. Thank you!', children: 'Children',
    err: { empty: 'That file is empty.', type: 'Choose a photo, or a video (MP4, MOV or WebM).', videoTooBig: 'Videos can be up to 100 MB. Try a shorter clip.',
      imageTooBig: 'That photo is too big even after resizing. Try another one.', unreadable: 'That photo could not be opened here. Try a JPEG or PNG, or a screenshot of it.',
      metadata: 'That photo could not be cleaned of its hidden details, so it was not sent.' },
  },
  es: {
    title: 'Aprender en casa', intro: 'Lo que su hijo o hija aprende en la escuela esta semana, e ideas para hacer juntos en casa.',
    week: (u, t) => `Esta semana en la escuela: Unidad ${u}${t ? `, ${t}` : ''}`, theme: 'Tema', doAtHome: 'Hagan esto en casa',
    draft: 'Actividades en borrador: aún sin revisar', weDid: 'Lo hicimos', done: 'Hecho', note: '¿Qué hizo o dijo su hijo? (opcional)', save: 'Guardar',
    addProof: 'Agregar una foto o un video', time: 'Tiempo aprendiendo esta semana', timeLine: (h, c) => `Modo Niños: ${h} min en casa, ${c} min en el centro.`,
    timeHint: 'Se muestra para su información. No hay límite.', openKid: 'Abrir Modo Niños', kidNo: 'El Modo Niños todavía no está disponible para este niño.',
    share: 'Compartir desde casa', shareIntro: 'Comparta una foto o un video corto de su hijo o hija aprendiendo en casa. Solo usted, los otros tutores y los maestros de su hijo o hija pueden verlo.',
    pick: 'Elija una foto o un video', caption: 'Descripción (opcional)', which: '¿Qué actividad? (opcional)', none: 'Ninguna', send: 'Compartir',
    photoNote: 'Las fotos se limpian antes de salir de su aparato: se quitan la ubicación y los datos de la cámara. Los videos se envían tal como están: evite mostrar su dirección o a otros niños.',
    consentNeeded: 'Para compartir fotos y videos, primero dé su consentimiento en Privacidad y consentimiento. Decir que no nunca afecta la inscripción.', privacy: 'Privacidad y consentimiento',
    shared: 'Lo que usted compartió', nothing: 'Todavía no ha compartido nada.', teacher: 'Maestra', del: 'Borrar', delAsk: '¿Borrar esto?',
    portfolio: 'Portafolio', inPortfolio: 'En el portafolio', empty: 'Todavía no hay nada.', teacherNote: 'Nota de la maestra', byKid: 'en Modo Niños', byYou: 'marcado por la familia', byStaff: 'en el centro',
    sending: 'Enviando…', sent: 'Compartido. ¡Gracias!', children: 'Niños',
    err: { empty: 'El archivo está vacío.', type: 'Elija una foto o un video (MP4, MOV o WebM).', videoTooBig: 'Los videos pueden ser de hasta 100 MB. Pruebe con uno más corto.',
      imageTooBig: 'La foto es demasiado grande aun después de achicarla. Pruebe con otra.', unreadable: 'No se pudo abrir esa foto aquí. Pruebe con un JPEG o PNG, o con una captura de pantalla.',
      metadata: 'No se pudieron quitar los datos ocultos de esa foto, así que no se envió.' },
  },
};
