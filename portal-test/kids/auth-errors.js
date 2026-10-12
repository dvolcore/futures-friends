// Sign-in errors in family words (hub/FAMILY_DASHBOARD.md "The sign-in page"). Pure: no DOM, no network; the sign-in page and
// tests/family-signin-unit.test.mjs import it.
//
//   authErrorKind(err)      what went wrong, from a Supabase auth error (or a thrown fetch error): 'timeout' | 'network' | 'login' |
//                           'locked' | 'rate' | 'unconfirmed' | 'weak' | 'unknown'. The raw server text is never shown to anyone.
//   transient(kind)         true for the kinds worth trying again by ourselves (the local stack sometimes answers 504 "Processing this
//                           request timed out" while the auth container reconnects to its database)
//   backoff(attempt)        the wait before automatic retry n (1 s, 2 s, 4 s; at most 3 automatic tries)
//   authMessage(kind, lang) the sentence a family reads, English or Spanish (DRAFT)
//   withRetry(fn, {onWait}) calls fn(); while it fails with a transient kind it waits (onWait(seconds, attempt) can count down on screen)
//                           and tries again, then gives the last result back. fn returns a Supabase-style { data, error } or throws.

export const MAX_AUTO_RETRIES = 3;

export function authErrorKind(err) {
  if (!err) return null;
  const m = `${err.name || ''} ${err.message || err.msg || err.error_description || err || ''}`;
  const status = Number(err.status ?? err.statusCode ?? 0);
  const code = String(err.code || err.error_code || '');
  if (status === 504 || status === 502 || status === 503 || /timed out|timeout|gateway|upstream|AuthRetryableFetchError/i.test(m)) return 'timeout';
  if (/Failed to fetch|NetworkError|Load failed|network request failed|ECONNREFUSED|fetch failed/i.test(m) || (status === 0 && /fetch/i.test(m))) return 'network';
  if (code === 'invalid_credentials' || /Invalid login credentials|invalid_grant|invalid email or password/i.test(m)) return 'login';
  if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit' || status === 429 || /rate limit|too many requests/i.test(m)) return 'rate';
  if (code === 'user_banned' || /too many attempts|locked|banned/i.test(m)) return 'locked';
  if (code === 'email_not_confirmed' || /not confirmed|confirm your email/i.test(m)) return 'unconfirmed';
  if (code === 'weak_password' || /weak password|password should/i.test(m)) return 'weak';
  return 'unknown';
}

export const transient = (kind) => kind === 'timeout' || kind === 'network';
export const backoff = (attempt) => 1000 * 2 ** Math.max(0, attempt - 1);

const W = {
  en: {
    timeout: 'The Hub is taking longer than usual to answer. Your details are safe. Please try again.',
    network: 'We could not reach the Hub. Check that you are online, then try again.',
    login: 'That email and password do not match. Check them, or get a sign-in link by email instead.',
    locked: 'For your security, this account is paused for a few minutes after several tries. Try again soon, or get a sign-in link.',
    rate: 'Lots of tries just now. Please wait a minute, then try again.',
    unconfirmed: 'This email is not confirmed yet. Open the invitation email from your center first.',
    weak: 'Please choose a longer password.',
    unknown: 'Something went wrong while signing in. Please try again in a moment.',
    retrying: (s) => `The Hub is a little slow right now. Trying again in ${s}…`,
  },
  es: {
    timeout: 'El Hub está tardando más de lo normal en responder. Sus datos están seguros. Inténtelo de nuevo.',
    network: 'No pudimos conectar con el Hub. Revise que tenga internet e inténtelo de nuevo.',
    login: 'Ese correo y esa contraseña no coinciden. Revíselos o pida un enlace para iniciar sesión por correo.',
    locked: 'Por su seguridad, esta cuenta queda en pausa unos minutos después de varios intentos. Inténtelo pronto o pida un enlace.',
    rate: 'Hubo muchos intentos en este momento. Espere un minuto e inténtelo de nuevo.',
    unconfirmed: 'Este correo todavía no está confirmado. Abra primero el correo de invitación de su centro.',
    weak: 'Elija una contraseña más larga.',
    unknown: 'Algo salió mal al iniciar sesión. Inténtelo de nuevo en un momento.',
    retrying: (s) => `El Hub está un poco lento. Lo intentamos de nuevo en ${s}…`,
  },
};
export const authWords = (lang) => W[lang === 'es' ? 'es' : 'en'];
export const authMessage = (kind, lang = 'en') => authWords(lang)[kind] || authWords(lang).unknown;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export async function withRetry(fn, { onWait = () => {}, max = MAX_AUTO_RETRIES, sleep = wait } = {}) {
  let r;
  for (let attempt = 0; ; attempt++) {
    try { r = await fn(); } catch (e) { r = { data: null, error: e }; }
    const kind = authErrorKind(r?.error);
    if (!kind || !transient(kind) || attempt >= max) return r;
    const ms = backoff(attempt + 1);
    for (let s = Math.ceil(ms / 1000); s > 0; s--) { onWait(s, attempt + 1); await sleep(Math.min(1000, ms)); }
  }
}
