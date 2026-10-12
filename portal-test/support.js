// "Contact support" footer for every Futures Hub page. Config-driven: it appears only when the server was started with
// HUB_SUPPORT_URL (hub/web/serve.mjs puts it into /config.js as supportUrl). It is a plain link. Nothing is appended to the
// address (no user id, email, center, child or page), so opening it sends no personal data to the support desk.
// The guidance line tells people not to put child information into a ticket: by design the support desk holds none.
import { storedLanguage } from './i18n.js';

export const SUPPORT_TEXT = {
  en: {
    link: 'Contact support',
    lead: 'Need help?',
    banner: 'Please do not put a child\'s name, photo, birthday, health details or any other child information in a support message. Tell us your center name and what you need. If we must see a record, we will ask your director to approve secure, time-limited access.',
  },
  es: {   // DRAFT: to be reviewed by the bilingual teacher before families see it (docs/ops/SUPPORT_DESK.md)
    link: 'Contactar con soporte',
    lead: '¿Necesita ayuda?',
    banner: 'Por favor, no escriba en un mensaje de soporte el nombre, la foto, la fecha de nacimiento, datos de salud ni ninguna otra información de un niño. Díganos el nombre de su centro y qué necesita. Si hace falta ver un registro, pediremos a su directora que apruebe un acceso seguro y por tiempo limitado.',
  },
};

// Only an http(s) address without credentials; query and fragment are dropped so nothing identifying can ride along.
export function safeSupportUrl(raw) {
  try {
    const u = new URL(String(raw ?? ''));
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    if (u.username || u.password) return null;
    u.search = ''; u.hash = '';
    return u.toString();
  } catch { return null; }
}

export function renderSupport(doc, supportUrl, lang) {
  let el = doc.getElementById('supportFooter');
  const url = safeSupportUrl(supportUrl);
  if (!url) { el?.remove(); return null; }
  const t = SUPPORT_TEXT[lang] ?? SUPPORT_TEXT.en;
  if (!el) { el = doc.createElement('footer'); el.id = 'supportFooter'; el.className = 'support-footer'; doc.body.appendChild(el); }
  el.replaceChildren();
  const p = doc.createElement('p');
  const a = doc.createElement('a');
  a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.id = 'supportLink'; a.textContent = t.link;
  p.append(`${t.lead} `, a);
  const note = doc.createElement('p');
  note.className = 'support-note'; note.id = 'supportBanner'; note.textContent = t.banner;
  el.append(p, note);
  return el;
}

if (typeof document !== 'undefined') {
  const cfg = globalThis.FF_HUB_WEB || {};
  const draw = () => renderSupport(document, cfg.supportUrl, storedLanguage() || 'en');
  draw();
  // the header's language switch changes the stored language without a reload
  document.addEventListener('click', () => setTimeout(draw, 80));
}
