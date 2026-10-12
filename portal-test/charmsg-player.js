// Character messages: the child-facing player (owner decision 2026-10-10; hub/CHARACTER_MESSAGES.md).
// Used by the stand-alone player screen (/c/<slug>/player/<kid>, charmsg.js) and meant for Kid Mode to import as is:
//
//   import { FRIENDS, friendArt, renderMessageCard, playMessage } from './charmsg-player.js';
//   const data = await rpc('charmsg_for_child', { p_center, p_kid });     // approved by the parent, still deliverable, in the
//                                                                          // child's favourite friend's voice when that variant exists
//   el.innerHTML = data.messages.map((m) => renderMessageCard(m, { lang })).join('');
//   await playMessage(stage, m, { lang, rpc, context: 'kid_mode' });       // records the play (charmsg_play), then shows it (no sound)
//
// Sound: OFF everywhere (owner decision 2026-10-10). The player shows the friend's art and the words as a large caption for a grown-up
// to read aloud; no audio playback, no sound effects. The database keeps an empty, optional audio_path slot per variant, unused.
// Nothing runs before a tap; no network calls other than the play record.

export const FRIENDS = {
  booker: { name: 'Booker', animal: 'bear', animal_es: 'oso', pillar: 'LEARN · SMILE' },
  lumi: { name: 'Lumi', animal: 'bunny', animal_es: 'conejita', pillar: 'BELONG · RESET' },
  zuri: { name: 'Zuri', animal: 'turtle', animal_es: 'tortuga', pillar: 'EXPLORE · NOURISH' },
  bop: { name: 'Bop', animal: 'elephant', animal_es: 'elefante', pillar: 'MOVE · OUTSIDE' },
};
export const friendArt = (f) => `friends/${FRIENDS[f] ? f : 'lumi'}.webp`;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const WORDS = {
  en: { from: (n) => `A message from ${n}`, readAloud: 'Grown-up: read it aloud, slowly and warmly.', back: 'All messages', draftEs: '' },
  es: { from: (n) => `Un mensaje de ${n}`, readAloud: 'Adulto: léalo en voz alta, despacio y con cariño.', back: 'Todos los mensajes',
    draftEs: 'Español en borrador (pendiente de revisión).' },
};
const W = (lang) => WORDS[lang === 'es' ? 'es' : 'en'];
export const scriptFor = (m, lang) => (lang === 'es' && m.script_es ? m.script_es : m.script_en);
export const titleFor = (m, lang) => (lang === 'es' && m.title_es ? m.title_es : m.title_en);

// A big tappable card for one message (friend face + title). data-request carries the id for playMessage.
// label: what the card says (default the message title). A title can name the default friend's strategy ("Heart Hands..."),
// so the player passes the topic instead when it shows another friend's version.
export function renderMessageCard(m, { lang = 'en', label } = {}) {
  const f = FRIENDS[m.friend] || FRIENDS.lumi;
  const text = label || titleFor(m, lang);
  return `<button type="button" class="cm-card cm-f-${esc(m.friend)}" data-request="${esc(m.request_id)}" aria-label="${esc(W(lang).from(f.name))}: ${esc(text)}">
    <img src="${friendArt(m.friend)}" alt="" width="96" height="140" loading="lazy">
    <span class="cm-card-t">${esc(text)}</span><span class="cm-card-f">${esc(f.name)}</span></button>`;
}

// Sound is off everywhere (owner decision 2026-10-10): no audio playback and no sound effects. stopSound stays as a no-op so a
// caller (Kid Mode) can call it safely.
export function stopSound() {}

// Shows one message on the stage: the friend's art and the words large (a caption a grown-up reads aloud). No sound. The play is recorded FIRST through
// charmsg_play, which the database refuses unless the child's parent approved it: nothing shows if that fails.
export async function playMessage(stage, m, { lang = 'en', rpc, context = 'player', onBack } = {}) {
  const shown = await rpc('charmsg_play', { p_request: m.request_id, p_context: context });   // throws when not deliverable
  const msg = { ...m, ...shown };
  const f = FRIENDS[msg.friend] || FRIENDS.lumi;
  const w = W(lang);
  stage.innerHTML = `<div class="cm-stage cm-f-${esc(msg.friend)}" role="region" aria-label="${esc(w.from(f.name))}">
    <img class="cm-stage-art" src="${friendArt(msg.friend)}" alt="${esc(lang === 'es' ? `${f.name}, ${f.animal_es}` : `${f.name} the ${f.animal}`)}" width="300" height="480">
    <div class="cm-bubble"><p class="cm-from">${esc(w.from(f.name))}</p>
      <p class="cm-words" id="cmWords" lang="${lang === 'es' && msg.script_es ? 'es' : 'en'}">${esc(scriptFor(msg, lang))}</p>
      ${lang === 'es' && msg.script_es ? `<p class="cm-note">${esc(w.draftEs)}</p>` : ''}
      <p class="cm-note">${esc(w.readAloud)}</p>
      ${onBack ? `<div class="cm-row"><button type="button" class="btn soft" id="cmBack">${esc(w.back)}</button></div>` : ''}</div></div>`;
  if (onBack) stage.querySelector('#cmBack').onclick = () => onBack();
  return msg;
}
