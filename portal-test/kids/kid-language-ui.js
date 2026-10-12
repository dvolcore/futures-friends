// A child's languages (owner request 2026-10-10, bilingual everywhere; migration 20261027100000_bilingual_everywhere.sql):
//   home language   en / es / both: teachers see which families speak Spanish at home; chat and announcements open "Write in both
//                   languages" by themselves for a Spanish-speaking home. "auto" = follow the guardians' own language choices.
//   Kid Mode words  en / es / both: what the child reads on screen in Kid Mode (the child can also switch it there); Zuri always
//                   speaks both.
// Shown on the child page (/c/<slug>/child/<kid>) to the child's family and staff; saved with kid_language_set (the database checks
// who may: the child's guardians, the director, the classroom staff of the child's room). Spanish is a DRAFT.
import { dict } from './i18n.js';

const W = {
  en: {
    title: 'Languages', home: 'Language at home', homeHint: 'Teachers see it, and messages and announcements to this family open in both languages when Spanish is spoken at home.',
    caps: 'Words in Kid Mode', capsHint: 'What the child reads on screen in Kid Mode. Zuri always speaks both.',
    auto: 'From the family\'s own language choice', en: 'English', es: 'Spanish', both: 'English and Spanish', save: 'Save', saved: 'Saved.',
    families: (l) => `The family reads the Hub in: ${l}`, none: 'not chosen yet',
  },
  es: {
    title: 'Idiomas', home: 'Idioma en casa', homeHint: 'Las maestras lo ven, y los mensajes y anuncios para esta familia se abren en los dos idiomas cuando en casa se habla español.',
    caps: 'Palabras en el Modo Niños', capsHint: 'Lo que el niño o la niña lee en la pantalla del Modo Niños. Zuri siempre habla los dos idiomas.',
    auto: 'Según el idioma que eligió la familia', en: 'Inglés', es: 'Español', both: 'Inglés y español', save: 'Guardar', saved: 'Guardado.',
    families: (l) => `La familia lee el Hub en: ${l}`, none: 'todavía sin elegir',
  },
};
export const LANG_CHIP = { es: 'ES', both: 'EN+ES' };

export async function mountKidLanguage({ esc, rpc, friendly, c, kid, lang, after }) {
  if (!after) return;
  const L = dict(W, lang);
  let row = null;
  try { row = ((await rpc('kid_languages_list', { p_center: c.center_id })) || []).find((x) => x.kid === kid) || null; } catch (_) { return; }
  if (!row) return;
  const opt = (v, cur, label) => `<option value="${v}"${v === cur ? ' selected' : ''}>${esc(label)}</option>`;
  const fam = (row.families || []).map((l) => L[l] || l).join(', ') || L.none;
  after.insertAdjacentHTML('afterend', `<section class="card" id="kidLanguages" aria-labelledby="kidLangH"><h2 id="kidLangH">${esc(L.title)}</h2>
    <form id="kidLangForm" novalidate>
      <label class="f"><span>${esc(L.home)}</span><select class="i" id="klHome">${opt('auto', row.home_set ? '' : 'auto', L.auto)}${['en', 'es', 'both'].map((v) => opt(v, row.home_set ? row.home : '', L[v])).join('')}</select></label>
      <p class="small muted">${esc(L.homeHint)}</p><p class="small">${esc(L.families(fam))}</p>
      <label class="f"><span>${esc(L.caps)}</span><select class="i" id="klCaps">${['en', 'es', 'both'].map((v) => opt(v, row.captions, L[v])).join('')}</select></label>
      <p class="small muted">${esc(L.capsHint)}</p>
      <p class="small msg" id="klMsg" role="status"></p><button class="btn navy small" type="submit">${esc(L.save)}</button></form></section>`);
  document.getElementById('kidLangForm').onsubmit = async (e) => {
    e.preventDefault();
    const m = document.getElementById('klMsg');
    try {
      await rpc('kid_language_set', { p_center: c.center_id, p_kid: kid, p_home: document.getElementById('klHome').value, p_captions: document.getElementById('klCaps').value });
      m.className = 'small msg ok'; m.textContent = L.saved;
    } catch (err) { m.className = 'small msg bad'; m.textContent = friendly(err); }
  };
}
