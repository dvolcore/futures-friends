// Kid Mode honours the child's classroom accommodations (hub/ACCOMMODATIONS.md, migration 20261028500000_accommodations.sql).
// The settings come from kid_mode_accommodations(session) (one child, the adult's session). They change how the screen LOOKS and
// PACES, never what is scored: fewer choices is done by the database (the key never leaves it), extra time only stops speed flags.
//   larger_targets  bigger buttons and pictures            high_contrast   plain white, black outlines
//   reduced_motion  no bounce or pop even if the device allows motion
//   hand            main buttons on the child's side         simplified      fewer things on each screen (no caption switcher,
//                                                                            messages or extra tiles on the home screen)
//   read_aloud      a note for the grown-up: read the words aloud (captions are always on; Kid Mode has no sound)
//   one_step        an activity's steps one at a time         break_prompts   a calm "stretch break?" every break_minutes
// Plain ES module, no build step; the strict CSP forbids inline styles (every look is a class in accommodations.css).

export const ACC_W = {
  en: { readAloud: 'Grown-up: please read the words on the screen aloud with your child.', nextStep: 'Next step', stepOf: (i, n) => `Step ${i} of ${n}`,
    breakTitle: (f) => `Time for a stretch break with ${f}!`, breakBody: 'Stand up, reach high, wiggle your fingers and take a slow breath.', breakDone: "I'm ready" },
  es: { readAloud: 'Adulto: por favor lea en voz alta con su niño o niña las palabras de la pantalla.', nextStep: 'Siguiente paso', stepOf: (i, n) => `Paso ${i} de ${n}`,
    breakTitle: (f) => `¡Hora de estirarse con ${f}!`, breakBody: 'Ponte de pie, estírate hacia arriba, mueve los dedos y respira despacio.', breakDone: 'Estoy listo' },
};
const Lw = (cap) => ACC_W[cap === 'en' ? 'en' : 'es'];

// The classes for the Kid Mode wrapper (#kidMode)
export function accClasses(acc) {
  if (!acc) return '';
  const c = [];
  if (acc.larger_targets) c.push('acc-large');
  if (acc.high_contrast) c.push('acc-contrast');
  if (acc.reduced_motion) c.push('acc-motion');
  if (acc.simplified) c.push('acc-simple');
  if (acc.hand === 'left' || acc.hand === 'right') c.push(`acc-${acc.hand}`);
  return c.join(' ');
}

// The grown-up's read-aloud note (top of the home screen and of each activity)
export function accBannerHtml(esc, acc, cap) {
  return acc?.read_aloud ? `<p class="acc-readaloud" id="accReadAloud">${esc(Lw(cap).readAloud)}</p>` : '';
}

// One step at a time: the first step shows; "Next step" shows the next one (the list stays a list for screen readers)
export function accOneStep(list, acc, cap) {
  if (!acc?.one_step || !list) return;
  const items = [...list.querySelectorAll('li')];
  if (items.length < 2) return;
  const L = Lw(cap);
  let i = 0;
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'km-btn acc-next'; btn.id = 'accNextStep';
  const tag = document.createElement('p'); tag.className = 'acc-stepof'; tag.setAttribute('role', 'status');
  const paint = () => {
    items.forEach((li, k) => { li.hidden = k !== i; });
    tag.textContent = L.stepOf(i + 1, items.length);
    btn.textContent = L.nextStep; btn.hidden = i >= items.length - 1;
  };
  btn.addEventListener('click', () => { i = Math.min(items.length - 1, i + 1); paint(); });
  list.classList.add('acc-onestep');
  list.after(tag, btn);
  paint();
}

// Break prompts: every break_minutes of Kid Mode a calm panel (no sound, nothing ends; one tap goes back). Returns the interval id.
export function accStartBreaks(acc, { getCap, friendName, root = () => document.getElementById('kidMode'), now = () => Date.now() }) {
  if (!acc?.break_prompts) return null;
  const every = Math.max(5, Math.min(30, Number(acc.break_minutes) || 10)) * 60000;
  let last = now();
  return setInterval(() => {
    const box = root();
    if (!box || document.getElementById('accBreak') || document.getElementById('kmGateBox') || now() - last < every) return;
    last = now();
    accShowBreak(box, getCap(), friendName());
  }, 15000);
}
export function accShowBreak(box, cap, friend) {
  const L = Lw(cap);
  const d = document.createElement('div');
  d.className = 'acc-break'; d.id = 'accBreak'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true');
  const card = document.createElement('div'); card.className = 'acc-break-card';
  const h = document.createElement('p'); h.className = 'km-say acc-break-t'; h.id = 'accBreakT'; h.textContent = L.breakTitle(friend);
  const p = document.createElement('p'); p.className = 'acc-break-b'; p.textContent = L.breakBody;
  const b = document.createElement('button'); b.type = 'button'; b.className = 'km-btn km-btn-go'; b.id = 'accBreakDone'; b.textContent = L.breakDone;
  d.setAttribute('aria-labelledby', 'accBreakT');
  b.addEventListener('click', () => d.remove());
  card.append(h, p, b); d.append(card); box.append(d);
  b.focus();
  return d;
}
