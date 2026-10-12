// Deep links (hub/NOTIFICATIONS.md "Where a notification opens"): a notification opens the exact item. The page that owns the item
// calls deepFocus() when it is on screen (scrolled to, highlighted, focused for screen readers) or deepMiss() when it is not there any
// more or this person may not see it: a clear message on that page, never a silent jump to the home page.

const MISS = {
  en: {
    any: 'This item is not available any more, or your account cannot open it.',
    message: 'That message is not in this conversation any more.',
    child: 'This child is not on your account, or is no longer enrolled here.',
    announcement: 'That announcement is not available any more.',
    report: 'That report is not available.',
    daily: (d) => `The daily report for ${d} is not available: it was not sent for that day, or it is no longer kept.`,
    video: 'That video is not waiting here any more: it may have been answered, withdrawn or removed.',
    upload: 'That shared photo or video is not available any more.',
    request: 'That request is not waiting any more: it may have been answered already.',
    consent: 'That consent is not waiting for a check any more.',
    tab: 'This page is not part of your account at this center.',
  },
  es: {
    any: 'Esto ya no está disponible, o su cuenta no puede abrirlo.',
    message: 'Ese mensaje ya no está en esta conversación.',
    child: 'Este niño o niña no está en su cuenta, o ya no está inscrito aquí.',
    announcement: 'Ese anuncio ya no está disponible.',
    report: 'Ese informe no está disponible.',
    daily: (d) => `El reporte del día ${d} no está disponible: no se envió ese día o ya no se guarda.`,
    video: 'Ese video ya no está esperando aquí: puede que ya se haya respondido, retirado o quitado.',
    upload: 'Esa foto o video compartido ya no está disponible.',
    request: 'Esa solicitud ya no está esperando: puede que ya se haya respondido.',
    consent: 'Ese consentimiento ya no espera una revisión.',
    tab: 'Esta página no es parte de su cuenta en este centro.',
  },
};

export const deepParam = (name) => new URLSearchParams(location.search).get(name);
export const missText = (what, lang = 'en', arg = null) => {
  const t = MISS[lang === 'es' ? 'es' : 'en'];
  const v = t[what] ?? t.any;
  return typeof v === 'function' ? v(arg) : v;
};

// Scroll to the item, highlight it and move focus to it (once per page view).
export function deepFocus(el) {
  if (!el) return false;
  el.classList.add('deep-hl');
  el.setAttribute('data-deep', '1');
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
  el.scrollIntoView({ block: 'center' });
  el.focus({ preventScroll: true });
  return true;
}

// The item is gone or not this person's: say so at the top of the page (role=alert), keep the page usable.
export function deepMiss(what, lang = 'en', arg = null) { return deepNote(missText(what, lang, arg), lang); }
// the same note with the page's own words
export function deepNote(text, lang = 'en') {
  document.getElementById('deepMiss')?.remove();
  const p = document.createElement('p');
  p.id = 'deepMiss'; p.className = 'msg warn deep-miss'; p.setAttribute('role', 'alert');
  if (lang === 'es') p.lang = 'es';
  p.textContent = text;
  const host = document.querySelector('#centerSpace .tabs') || document.querySelector('#main');
  if (host?.classList?.contains('tabs')) host.insertAdjacentElement('afterend', p); else host?.prepend(p);
  p.scrollIntoView({ block: 'center' });
  return false;
}

// Both in one: focus the element that matches, or say it is missing.
export function deepTarget(selector, what, lang = 'en', arg = null) {
  const el = document.querySelector(selector);
  return el ? deepFocus(el) : deepMiss(what, lang, arg);
}

// a value safe to put in a CSS attribute selector
export const cssValue = (v) => String(v ?? '').replace(/["\\]/g, '\\$&');
