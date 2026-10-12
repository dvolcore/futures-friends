// N35: completion endings in Kid Mode (hub/KID_MODE.md "The day's ending"). When the child has done everything assigned for today
// (today's on-screen move-alongs and the skill-check items open today), the guide says goodbye and gives an OFF-SCREEN prompt to do
// with a grown-up (today's do-it-together card). Nothing advances into more content: the ending screen has no "next", no "more", no
// video and no tile; only the grown-up gate. Kid Mode's other endings stay as they were (idle rest, no connection, consent withdrawn).
// Pure helpers (no DOM, no network) so tests/kid-mode-endings-unit.test.mjs checks the rule in node.

// What is due today: on-screen activities of this program week up to today's school day (a day missed earlier this week can still be
// done; nothing from later days), plus every on-screen check item open today. On a weekend the whole week counts.
export function dayPlan(activities, checks, isoDow) {
  const day = Math.min(5, Math.max(1, Number(isoDow) || 1));
  const acts = Array.isArray(activities) ? activities : [];
  const dueActs = acts.filter((a) => a && a.mode === 'on_screen' && Number(a.day) <= day);
  const items = [];
  for (const c of Array.isArray(checks) ? checks : []) for (const it of c?.items || []) items.push({ assignment: c.id, ...it });
  const due = dueActs.length + items.length;
  const done = dueActs.filter((a) => a.done).length + items.filter((i) => i.done).length;
  // today's do-it-together card (the off-screen prompt): today's, else the latest one this week up to today
  const cards = acts.filter((a) => a && a.mode === 'off_screen' && Number(a.day) <= day).sort((a, b) => Number(b.day) - Number(a.day));
  return { day, due, done, complete: due > 0 && done === due, together: cards[0] || null };
}

export const ENDING_WORDS = Object.freeze({
  en: {
    title: 'All done for today!',
    bye: (f) => `You did everything for today. ${f} says goodbye! See you next time.`,
    offScreen: 'Now, away from the screen, do this with your grown-up:',
    noCard: 'Now put the screen away and tell your grown-up what you did today.',
    grownUps: 'Grown-ups',
  },
  es: {
    title: '¡Terminaste por hoy!',
    bye: (f) => `Hiciste todo lo de hoy. ¡${f} te dice adiós! Nos vemos la próxima vez.`,
    offScreen: 'Ahora, sin pantalla, haz esto con tu adulto:',
    noCard: 'Ahora guarda la pantalla y cuéntale a tu adulto lo que hiciste hoy.',
    grownUps: 'Adultos',
  },
});

// The ending screen: the guide, the goodbye, the off-screen card and ONLY the grown-up gate (no next, no more, no video).
// cap: the child's captions ('en' | 'es' | 'both'); card text is already in the right language (the caller passes title/steps).
export function endingHtml(esc, { avatar, friendName, card = null, cap = 'en' } = {}) {
  const W = ENDING_WORDS[cap === 'en' ? 'en' : 'es'];
  const both = cap === 'both';
  const say = (k, ...a) => (both ? `<span lang="es" class="km-cap1">${esc(typeof ENDING_WORDS.es[k] === 'function' ? ENDING_WORDS.es[k](...a) : ENDING_WORDS.es[k])}</span><span lang="en" class="km-cap2">${esc(typeof ENDING_WORDS.en[k] === 'function' ? ENDING_WORDS.en[k](...a) : ENDING_WORDS.en[k])}</span>`
    : esc(typeof W[k] === 'function' ? W[k](...a) : W[k]));
  return `<div class="km-panel km-bye km-ending" id="kmEnding" role="status">${avatar || ''}
    <h1 class="km-title">${say('title')}</h1>
    <p class="km-say">${say('bye', friendName || 'Bop')}</p>
    ${card ? `<div class="km-ending-card"><p class="km-sub">${say('offScreen')}</p><h2 class="km-h">${esc(card.title || '')}</h2>
      ${card.steps?.length ? `<ol class="km-steps">${card.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>` : ''}</div>`
      : `<p class="km-sub">${say('noCard')}</p>`}
    <button class="km-grown km-grown-big" type="button" id="kmGate">${esc(W.grownUps)}</button></div>`;
}
