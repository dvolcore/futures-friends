// The grown-up cast (owner 2026-10-12): which official plush grown-up stands where, for every role. ONE config: the names are proposed
// and may change, so a rename is one edit here. The art is the owner's transparent masters (05_Brand_and_Art/plush-masters/characters),
// resized to web/friends/adults/<key>-480|960.webp; never redrawn. The staff dashboards (ff-shell.js ROLE_CHARACTERS, staff-v2) hold the
// same keys: ff-shell.js can re-export from here so both sides read one table.
export const CHARACTER = {
  'ms-june': { name: 'Ms. June', en: 'Ms. June, the giraffe teacher', es: 'La maestra June, la jirafa' },
  'ms-fern': { name: 'Ms. Fern', en: 'Ms. Fern, the owl teacher', es: 'La maestra Fern, la lechuza' },
  'mr-moss': { name: 'Mr. Moss', en: 'Mr. Moss, the badger in the leaf apron', es: 'El señor Moss, el tejón del delantal de hoja' },
  'principal-hazel': { name: 'Principal Hazel', en: 'Principal Hazel, the deer', es: 'La directora Hazel, la venada' },
  mara: { name: 'Mara', en: 'Mara, a hedgehog grown-up', es: 'Mara, una adulta erizo' },
  rowan: { name: 'Rowan', en: 'Rowan, a raccoon grown-up', es: 'Rowan, un adulto mapache' },
  rose: { name: 'Rose', en: 'Rose, a bunny mom', es: 'Rose, una mamá coneja' },
  bruno: { name: 'Bruno', en: 'Bruno, a bear dad', es: 'Bruno, un papá oso' },
  ella: { name: 'Ella', en: 'Ella, an elephant mom', es: 'Ella, una mamá elefanta' },
  sage: { name: 'Sage', en: 'Sage, a turtle grown-up', es: 'Sage, una tortuga adulta' },
};
export const ROLE_CHARACTERS = {
  director: 'principal-hazel',
  leadTeacher: 'ms-june',
  rooms: { threes: 'ms-june', twos: 'ms-fern' },
  kitchen: 'mr-moss', garden: 'mr-moss',
  caregivers: ['mara', 'rowan'],
  parents: ['rose', 'bruno', 'ella', 'sage'],
  // the family side: each friend stands with its grown-up in the parent dashboard's hero (Booker + Bruno, Lumi + Rose, Zuri + Sage, Bop + Ella)
  friendParent: { booker: 'bruno', lumi: 'rose', zuri: 'sage', bop: 'ella' },
  teacherActions: 'ms-june',   // Message the teacher, Report an absence
  pickup: 'mara',              // Who can pick up
  meals: 'mr-moss',            // the plates and the menu
};
export const FRIEND_NAME = { booker: 'Booker', lumi: 'Lumi', zuri: 'Zuri', bop: 'Bop' };
export const roomCharacter = (room) => ROLE_CHARACTERS.rooms[room] || ROLE_CHARACTERS.leadTeacher;
export const adultSrc = (key, size = 480) => `friends/adults/${key}-${size}.webp`;
const escHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// an <img> of a grown-up: decorative by default (alt=""); with lang, a real alt text in that language
export function adultImg(key, { cls = 'ffs-adult', lang = null, size = 480, w = 120, h = 288 } = {}) {
  const c = CHARACTER[key]; if (!c) return '';
  const alt = lang ? (lang === 'es' ? c.es : c.en) : '';
  return `<img class="${cls}" src="${adultSrc(key, size)}" srcset="${adultSrc(key, 480)} 480w, ${adultSrc(key, 960)} 960w" sizes="240px" alt="${escHtml(alt)}" width="${w}" height="${h}" loading="lazy" decoding="async">`;
}
// the hero pair for a child's chosen friend: the friend's grown-up, then the friend
export const pairFor = (friend) => ({ parent: ROLE_CHARACTERS.friendParent[friend] || ROLE_CHARACTERS.friendParent.bop, friend: FRIEND_NAME[friend] ? friend : 'bop' });
