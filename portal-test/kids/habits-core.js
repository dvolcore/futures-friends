// i18n-pairs: rows keep the English name right before its Spanish (hub/scripts/i18n-audit.mjs reads them as a pair).
// Habit cards (online school workstream C): the data and the printable sheet for /c/<slug>/habits (habits-ui.js).
// A habit card is a small printed card with a friend, the habit's name and a QR code. The QR code is the PUBLIC player's plain address on
// the Futures Friends website (https://dvolcore.github.io/futures-friends/habit-<id>, plus ?l=es for a Spanish card). It never carries a
// child, a family, a center, a user or a token: habitUrl() builds it from the site and the habit id ONLY, and the tests hold it to that.
// The card sheet itself (character art + QR codes) exists only here, inside the signed-in Hub, for staff, directors and families (the
// anti-bootleg rule: printable licensed character art is never offered on the public site). The art comes from /api/habits/art
// (habits-server.mjs), which answers only a signed-in member of the center.
// The habit list mirrors the website's habits.js (same ids, names and friends). Spanish = DRAFT pending the Spanish teacher's review.
// Plain ES module: the page imports it and node --test does too.
import { qrSvg } from './qr.js';

export const DEFAULT_SITE = 'https://dvolcore.github.io/futures-friends';
// id, friend, art (habit-art/<pose>.webp), names, where the card goes
export const HABITS = Object.freeze([
  ['wash-hands', 'bop', 'bop-waving', 'Wash your hands', 'Lávate las manos', 'By the sink', 'Junto al lavabo'],
  ['brush-teeth', 'booker', 'booker-waving', 'Brush your teeth', 'Cepíllate los dientes', 'In the bathroom', 'En el baño'],
  ['toys-away', 'zuri', 'zuri-pointing', 'Put toys away', 'Guarda los juguetes', 'On the toy shelf', 'En el estante de juguetes'],
  ['clean-up-song', 'bop', 'bop-dancing', 'Clean-up song', 'Canción para recoger', 'Where you play', 'Donde juegas'],
  ['shoes-on', 'zuri', 'zuri', 'Shoes on', 'Ponte los zapatos', 'By the door', 'Junto a la puerta'],
  ['gentle-hands', 'lumi', 'lumi-heart-hands', 'Gentle hands', 'Manos gentiles', 'Where friends play together', 'Donde juegan los amigos'],
  ['take-turns', 'booker', 'booker-hero', 'Take turns', 'Tomar turnos', 'On the game shelf', 'En el estante de juegos'],
  ['water-break', 'bop', 'bop-running', 'Water break', 'Pausa para tomar agua', 'By the water cups', 'Junto a los vasos de agua'],
  ['rest-time', 'lumi', 'lumi-calm-breath', 'Rest time', 'Hora de descansar', 'By the rest mats', 'Junto a las colchonetas'],
  ['calm-breathing', 'lumi', 'lumi-calm-breath', 'Calm-down breathing', 'Respirar con calma', 'In the calm corner', 'En el rincón de la calma'],
  ['kind-friend', 'lumi', 'lumi-waving', 'Be a kind friend', 'Sé un amigo amable', 'At the classroom door', 'En la puerta del salón'],
  ['feelings-check', 'lumi', 'lumi', 'How do I feel?', '¿Cómo me siento?', 'At morning circle', 'En el círculo de la mañana'],
  ['wiggle-break', 'bop', 'bop-walk-in', 'Movement break', 'Pausa para moverse', 'On the movement rug', 'En la alfombra de movimiento'],
].map(([id, k, art, en, es, whereEn, whereEs]) => Object.freeze({ id, k, art, name: { en, es }, where: { en: whereEn, es: whereEs } })));
export const ART = Object.freeze([...new Set(HABITS.map((h) => h.art)), 'wordmark']);
const FRIEND = { booker: 'Booker', lumi: 'Lumi', zuri: 'Zuri', bop: 'Bop' };
const BY = new Map(HABITS.map((h) => [h.id, h]));
export const habit = (id) => BY.get(id) || null;

// The public site's address (SITE_PUBLIC_URL; the live site by default). Only an https address without credentials, query or fragment.
export function siteBase(value) {
  try {
    const u = new URL(String(value || DEFAULT_SITE));
    if (u.protocol !== 'https:' && !(u.protocol === 'http:' && /^(127\.0\.0\.1|localhost)$/.test(u.hostname))) return DEFAULT_SITE;
    if (u.username || u.password || u.search || u.hash) return DEFAULT_SITE;
    return `${u.origin}${u.pathname}`.replace(/\/+$/, '');
  } catch { return DEFAULT_SITE; }
}
// The QR code's text: site + habit + language. Nothing else can get in (no second argument carries data).
export function habitUrl(site, id, lang) {
  if (!BY.has(id)) throw new Error(`unknown habit ${id}`);
  return `${siteBase(site)}/habit-${id}${lang === 'es' ? '?l=es' : ''}`;
}

export const PAPER = Object.freeze({ letter: { label: 'US Letter (8.5 × 11 in)', perPage: 6 }, a4: { label: 'A4 (210 × 297 mm)', perPage: 6 } });
const T = {
  en: { scan: 'Scan me', with: (k) => `with ${FRIEND[k]}`, foot: 'A short moment with a friend. No sign-in, no personal data.', draft: '' },
  es: { scan: 'Escanéame', with: (k) => `con ${FRIEND[k]}`, foot: 'Un momento corto con un amigo. Sin cuenta, sin datos personales.', draft: 'Borrador' },
};
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// One card. art: { [pose]: 'data:image/webp;base64,...' } from /api/habits/art (missing art = a coloured panel with the friend's initial).
export function cardHtml(h, lang, { site, art = {} } = {}) {
  const t = T[lang] || T.en, url = habitUrl(site, h.id, lang), other = lang === 'es' ? 'en' : 'es';
  const pic = art[h.art] ? `<img class="hc-art" src="${esc(art[h.art])}" alt="${esc(FRIEND[h.k])}" draggable="false">` : `<span class="hc-art hc-noart" aria-hidden="true">${esc(FRIEND[h.k][0])}</span>`;
  return `<article class="hc hc-${h.k}" data-habit="${h.id}" data-lang="${lang}" lang="${lang}">
    <header class="hc-band"><b class="hc-name${h.name[lang].length > 17 ? ' hc-long' : ''}">${esc(h.name[lang])}</b><span class="hc-alt" lang="${other}">${esc(h.name[other])}</span></header>
    <div class="hc-body"><div class="hc-pic">${pic}<span class="hc-with">${esc(t.with(h.k))}</span></div>
      <div class="hc-qr">${qrSvg(url, { ecl: 'M', quiet: 2, title: `${h.name[lang]}: ${url}` })}<span class="hc-scan">${esc(t.scan)}</span></div></div>
    <footer class="hc-foot"><span class="hc-where">${esc(h.where[lang])}</span>${art.wordmark ? `<img class="hc-mark" src="${esc(art.wordmark)}" alt="Futures Friends">` : '<span class="hc-mark-t">Futures Friends</span>'}</footer>
    <p class="hc-note">${esc(t.foot)}${t.draft ? ` <i>${esc(t.draft)}</i>` : ''}</p>
  </article>`;
}

// The sheet: pages of six cards (2 x 3) with dashed cut lines. langs: ['en'] | ['es'] | ['en', 'es'] (a card per habit per language).
export function sheetHtml({ ids = HABITS.map((h) => h.id), langs = ['en'], paper = 'letter', site, art = {} } = {}) {
  const per = (PAPER[paper] || PAPER.letter).perPage;
  const cards = [];
  for (const lang of langs) for (const id of ids) { const h = habit(id); if (h) cards.push(cardHtml(h, lang, { site, art })); }
  const pages = [];
  for (let i = 0; i < cards.length; i += per) pages.push(cards.slice(i, i + per));
  return `<div class="hc-sheet hc-${paper === 'a4' ? 'a4' : 'letter'}" id="hcSheet" data-cards="${cards.length}">${pages.map((p, n) => `<section class="hc-page" aria-label="Page ${n + 1} of ${pages.length}">
    <div class="hc-grid">${p.join('')}</div></section>`).join('')}</div>`;
}
