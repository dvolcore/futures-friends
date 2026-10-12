// The center's sign-in page, /c/<slug> (owner 2026-10-12: "This is the showcase ... the family is going to spend a lot of time here").
// Design: hub/FAMILY_DASHBOARD.md "The sign-in page". app.js viewSignin() hands over here with everything it already had.
//
//   The scene     the felt sky of the website (family-scene.js): the felt sun, slow clouds, hills, grass and the four friends' official
//                 cut-outs standing on the grass, in the light of the time of day. A "Still scene" switch and the device's Reduce Motion
//                 setting stop every loop.
//   The card      glass over the sky: the plush Futures Friends wordmark, the center's crest (its own logo once the hub has a logo upload;
//                 until then the official plush mark ringed in the center's colour), floating labels, show / hide password, a Caps Lock hint, inline checks in family words.
//   Two ways in   the password (iPhone and Android fill it with Face ID / a password manager: one tap for most parents) and, equally
//                 prominent, "Email me a sign-in link" (no password at all). A parent who presses Sign in with no password is offered
//                 the link right there. When the link was this device's last way in, it is the one shown in gold.
//   Waiting       the button shows a friend waving while the hub answers; the local stack's 504 "Processing this request timed out"
//                 is retried by itself (1 s, 2 s, 4 s) with a calm countdown; every error is a family sentence (auth-errors.js), never
//                 raw server text. Credentials are never logged or kept.
//   Staff         teachers and directors use the same page: a quiet "Staff" line says so, and Google sign-in shows when the center
//                 offers it (center_sso_options). Two-step verification and recovery work exactly as before (app.js afterSignIn).
// Every id the existing tests and pages use stays: #signinCard, #signinForm, #email, #password, #signinMsg, #forgot, #magic,
// #googleSignin, #signinHelp, .logo.

import { authErrorKind, authMessage, authWords, withRetry } from './auth-errors.js';
import { applyMotion, dayPart, installScene, sceneHtml, setMotion, storedMotion } from './family-scene.js';

const PREF_KEY = 'ff-hub-signin-way';
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const W = {
  en: {
    welcome: 'Welcome', privateSpace: 'Private family space', showPw: 'Show password', hidePw: 'Hide password', caps: 'Caps Lock is on',
    emailBad: 'That email looks incomplete. It should look like name@example.com.', pwEmpty: 'Type your password, or get a sign-in link below instead.',
    linkHint: 'No password needed: we email you a one-time link.', useLink: 'Email me a link instead', waving: 'Signing you in…',
    staffTitle: 'Staff', staffBody: 'Teachers and directors sign in here too, with the same email and password. Directors then confirm with their two-step code.',
    still: 'Still scene', moving: 'Moving scene', sceneLabel: 'Animation of the scene', tagline: 'Learn. Move. Explore. Belong.',
    tryAgain: 'Try again', brand: 'Futures Friends',
  },
  es: {
    welcome: 'Bienvenidos', privateSpace: 'Espacio privado para familias', showPw: 'Mostrar contraseña', hidePw: 'Ocultar contraseña', caps: 'Las mayúsculas están activadas',
    emailBad: 'Ese correo parece incompleto. Debe verse así: nombre@ejemplo.com.', pwEmpty: 'Escriba su contraseña, o pida abajo un enlace para iniciar sesión.',
    linkHint: 'Sin contraseña: le enviamos por correo un enlace de un solo uso.', useLink: 'Mejor envíenme un enlace', waving: 'Iniciando sesión…',
    staffTitle: 'Personal', staffBody: 'Las maestras, los maestros y la dirección también inician sesión aquí, con el mismo correo y contraseña. La dirección confirma después con su código de dos pasos.',
    still: 'Escena quieta', moving: 'Escena en movimiento', sceneLabel: 'Animación de la escena', tagline: 'Aprende. Muévete. Explora. Pertenece.',
    tryAgain: 'Intentar de nuevo', brand: 'Futures Friends',
  },
};
export const signinWords = (lang) => W[lang === 'es' ? 'es' : 'en'];
const EYE = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 3l18 18M10.6 5.1A10.7 10.7 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.6 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7c1.7 0 3.2-.5 4.5-1.2M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
const MAIL = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 6h18v12H3z"/><path d="M3 7l9 6 9-6"/></svg>';

// The crest: the center's own logo when the hub has one (no upload exists yet: center_public_profile has no logo field). Until then
// ONE clean branded crest: the official Futures Friends plush mark in a tile ringed with the center's colour (the center's name stands
// beside it as text). Never a bare block of initials, never two identities stacked. Used by the sign-in card and the center header on
// every page (app.js).
export function crestHtml(esc, p, size = '') {
  const logo = typeof p.logo_url === 'string' && /^\/(?!\/)[A-Za-z0-9/_.-]+\.(webp|png|svg)$/.test(p.logo_url) ? p.logo_url : null;
  if (logo) return `<span class="si-crest si-crest-img ${size}" aria-hidden="true"><img class="logo" src="${esc(logo)}" alt="" width="72" height="72"></span>`;
  return `<span class="si-crest ${size}" aria-hidden="true"><img class="logo si-mark" src="img/brand/ff-plush-mark-192.webp" alt="" width="96" height="96" decoding="async"></span>`;
}

export async function viewSigninPage(ctx) {
  const { p, slug, sso, T, lang, esc, page, client, live, safeNext, rememberNext, nextQuery, syncLanguage, topNav, afterSignIn, startGoogleSignIn, kindLabel } = ctx;
  const L = signinWords(lang), A = authWords(lang);
  let pref = null; try { pref = localStorage.getItem(PREF_KEY); } catch (_) { /* private mode */ }
  const linkFirst = pref === 'link';
  applyMotion();
  document.body.classList.add('fp-scene');
  const part = dayPart(new Date());
  page(`<div class="si" id="signinPage" data-part="${part}">
    ${sceneHtml({ part })}
    <div class="si-stage">
      <div class="si-hello">
        <img class="si-wordmark" src="img/brand/ff-plush-wordmark-320.webp" srcset="img/brand/ff-plush-wordmark-320.webp 1x, img/brand/ff-plush-wordmark-640.webp 2x" alt="${esc(L.brand)}" width="320" height="149">
        <p class="si-tagline">${esc(L.tagline)}</p>
      </div>
      <div class="si-cast" aria-hidden="true">${['lumi', 'booker', 'zuri', 'bop'].map((f, i) => `<img class="si-friend si-f-${f}" src="img/scene/cut-${f}-440.webp" alt="" decoding="async" data-i="${i}">`).join('')}
        <img class="si-grass" src="img/scene/div-grass-700.webp" srcset="img/scene/div-grass-700.webp 700w, img/scene/div-grass-1400.webp 1400w" sizes="100vw" alt="" decoding="async"></div>
      <section class="card signin si-card" id="signinCard" aria-labelledby="siTitle">
        <div class="si-head">${crestHtml(esc, p)}
          <div class="si-head-text"><p class="si-welcome">${esc(L.welcome)}</p><h1 id="siTitle">${esc(p.name)}</h1>
            <p class="si-chips"><span class="chip">${esc(kindLabel)}</span>${p.open ? ` <span class="chip si-chip-lock">${esc(L.privateSpace)}</span>` : ''}</p></div></div>
        ${p.open ? `<p class="si-lead">${esc(T('signin.lead', { center: p.name }))}</p>
        <form id="signinForm" class="si-form${linkFirst ? ' si-linkfirst' : ''}" novalidate>
          <div class="si-field"><input class="si-input" type="email" id="email" name="email" autocomplete="email" inputmode="email" autocapitalize="none" spellcheck="false" placeholder=" " required aria-describedby="emailNote">
            <label for="email">${esc(T('signin.email'))}</label><p class="si-note" id="emailNote" aria-live="polite"></p></div>
          <div class="si-field si-pw"><input class="si-input" type="password" id="password" name="password" autocomplete="current-password" placeholder=" " aria-describedby="pwNote capsHint">
            <label for="password">${esc(T('signin.password'))}</label>
            <button class="si-eye" type="button" id="pwToggle" aria-pressed="false" aria-label="${esc(L.showPw)}" aria-controls="password">${EYE}</button>
            <p class="si-note" id="pwNote" aria-live="polite"></p><p class="si-caps" id="capsHint" hidden>${esc(L.caps)}</p></div>
          <p class="msg" id="signinMsg" role="status"></p>
          <button class="btn si-primary" type="submit" id="signinGo"><span class="si-go-text">${esc(T('signin.submit'))}</span>
            <span class="si-wave" aria-hidden="true"><img src="img/friends/bop-waving-480.webp" alt="" width="40" height="40"></span></button>
          <button class="btn link si-forgot" type="button" id="forgot">${esc(T('signin.forgot'))}</button>
          <div class="or si-or">${esc(T('common.or'))}</div>
          <button class="btn si-secondary" type="button" id="magic">${MAIL}<span>${esc(T('signin.magic'))}</span></button>
          <p class="si-hint">${esc(L.linkHint)}</p>
          ${sso?.google ? `<div class="si-staff-sso"><button class="btn si-secondary" type="button" id="googleSignin">${esc(T('signin.google'))}</button>
          <p class="si-hint">${esc(T('signin.googleStaff'))}</p></div>` : ''}
        </form>` : `<p class="msg info" role="status">${esc(T('signin.closed', { center: p.name }))}</p>`}
        <details class="si-help" id="signinHelp"><summary>${esc(T('signin.help'))}</summary><ul class="plain">
          ${['helpPassword', 'helpLocked', 'helpTwoStep', 'helpFamily', 'helpDirector'].map((k) => `<li>${esc(T(`signin.${k}`))}</li>`).join('')}</ul></details>
        <p class="si-new">${T('signin.newHere')}</p>
      </section>
      <div class="si-foot">
        <details class="si-staff" id="staffNote"><summary>${esc(L.staffTitle)}</summary><p>${esc(L.staffBody)}</p></details>
        <button class="si-motion" type="button" role="switch" id="sceneMotion" aria-checked="${storedMotion() ? 'false' : 'true'}" aria-label="${esc(L.still)}">
          <span class="si-switch" aria-hidden="true"></span><span>${esc(L.still)}</span></button>
      </div>
    </div>
  </div>`, T('signin.title', { center: p.name }));
  const root = document.getElementById('signinPage');
  const undoScene = installScene(root);
  const stop = new AbortController();
  // leaving the page (another render replaces #main) tears the listeners down
  const mo = new MutationObserver(() => { if (!document.getElementById('signinPage')) { undoScene(); stop.abort(); mo.disconnect(); document.body.classList.remove('fp-scene'); } });
  mo.observe(document.getElementById('main'), { childList: true });

  const motionBtn = document.getElementById('sceneMotion');
  motionBtn.addEventListener('click', () => { const still = motionBtn.getAttribute('aria-checked') !== 'true'; setMotion(!still); motionBtn.setAttribute('aria-checked', String(still)); }, { signal: stop.signal });
  if (!p.open) return;

  const msg = document.getElementById('signinMsg');
  const email = document.getElementById('email'), pw = document.getElementById('password');
  const go = document.getElementById('signinGo'), form = document.getElementById('signinForm');
  const say = (cls, text, extra = '') => { msg.className = `msg ${cls}`; msg.innerHTML = `${esc(text)}${extra}`; };
  const note = (el, id, text) => { el.setAttribute('aria-invalid', text ? 'true' : 'false'); document.getElementById(id).textContent = text || ''; };

  // inline checks: only after the person has left the field once (no scolding while typing)
  email.addEventListener('blur', () => { const v = email.value.trim(); note(email, 'emailNote', v && !EMAIL.test(v) ? L.emailBad : ''); }, { signal: stop.signal });
  email.addEventListener('input', () => { if (email.getAttribute('aria-invalid') === 'true' && EMAIL.test(email.value.trim())) note(email, 'emailNote', ''); }, { signal: stop.signal });
  pw.addEventListener('input', () => { if (pw.value) note(pw, 'pwNote', ''); }, { signal: stop.signal });
  // show / hide the password (the field keeps its value and focus; password managers still see it)
  const eye = document.getElementById('pwToggle');
  eye.addEventListener('click', () => {
    const show = pw.type === 'password';
    pw.type = show ? 'text' : 'password';
    eye.setAttribute('aria-pressed', String(show)); eye.setAttribute('aria-label', show ? L.hidePw : L.showPw); eye.innerHTML = show ? EYE_OFF : EYE;
  }, { signal: stop.signal });
  // Caps Lock: a hint under the password while it is on
  const caps = (e) => { if (typeof e.getModifierState === 'function') document.getElementById('capsHint').hidden = !e.getModifierState('CapsLock'); };
  pw.addEventListener('keydown', caps, { signal: stop.signal }); pw.addEventListener('keyup', caps, { signal: stop.signal });
  pw.addEventListener('blur', () => { document.getElementById('capsHint').hidden = true; }, { signal: stop.signal });
  // press feedback on pointer-down (not on release), for every button on the card
  for (const b of root.querySelectorAll('.btn, .si-eye, .si-motion, summary')) {
    b.addEventListener('pointerdown', () => b.classList.add('is-pressed'), { signal: stop.signal });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => b.classList.remove('is-pressed'), { signal: stop.signal });
  }

  const busy = (on) => { go.classList.toggle('is-busy', on); go.disabled = on; go.setAttribute('aria-busy', String(on));
    go.querySelector('.si-go-text').textContent = on ? L.waving : T('signin.submit'); };
  const remember = (way) => { try { localStorage.setItem(PREF_KEY, way); } catch (_) { /* private mode */ } };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const em = email.value.trim(), password = pw.value;
    if (!em || !EMAIL.test(em)) { note(email, 'emailNote', em ? L.emailBad : ''); say('bad', em ? L.emailBad : T('signin.need')); email.focus(); return; }
    if (!password) {
      // no scolding: a gentle note and the sign-in link right there
      say('info', L.pwEmpty, ` <button class="btn link si-inline" type="button" id="useLink">${esc(L.useLink)}</button>`);
      document.getElementById('useLink').onclick = () => document.getElementById('magic').click();
      pw.focus(); return;
    }
    busy(true); say('info', T('signin.signingIn'));
    const r = await withRetry(() => client().auth.signInWithPassword({ email: em, password }), {
      onWait: (s) => say('info', A.retrying(s)),
    });
    if (r.error || !r.data?.session) {
      busy(false);
      const kind = authErrorKind(r.error) || 'unknown';
      say('bad', authMessage(kind, lang), kind === 'timeout' || kind === 'network' ? ` <button class="btn link si-inline" type="submit" form="signinForm" id="signinRetry">${esc(L.tryAgain)}</button>` : '');
      if (kind === 'login') pw.select();
      return;
    }
    remember('password');
    await syncLanguage(r.data.session);
    await topNav(r.data.session);
    await afterSignIn(slug);
  }, { signal: stop.signal });

  document.getElementById('forgot').addEventListener('click', async () => {
    const em = email.value.trim();
    if (!EMAIL.test(em)) { say('bad', T('signin.forgotEmailFirst')); email.focus(); return; }
    say('info', T('signin.sending'));
    const r = await withRetry(() => client().auth.resetPasswordForEmail(em, { redirectTo: `${location.origin}/?reset=1` }), { onWait: (s) => say('info', A.retrying(s)) });
    const kind = authErrorKind(r?.error);
    // the same answer whether or not the email has an account (no account discovery); only a hub that cannot be reached says so
    if (kind === 'timeout' || kind === 'network' || kind === 'rate') { say('bad', authMessage(kind, lang)); return; }
    say('ok', T('signin.forgotSent', { email: em }));
  }, { signal: stop.signal });

  document.getElementById('magic').addEventListener('click', async () => {
    const em = email.value.trim();
    if (!EMAIL.test(em)) { say('bad', T('signin.emailFirst')); note(email, 'emailNote', em ? L.emailBad : ''); email.focus(); return; }
    say('info', T('common.sending'));
    const keep = safeNext(new URLSearchParams(location.search).get('next'), slug);
    if (keep) rememberNext(keep);
    const r = await withRetry(() => client().auth.signInWithOtp({ email: em, options: { shouldCreateUser: false, emailRedirectTo: `${location.origin}/c/${slug}${nextQuery(slug)}` } }),
      { onWait: (s) => say('info', A.retrying(s)) });
    const kind = authErrorKind(r?.error);
    if (kind === 'timeout' || kind === 'network' || kind === 'rate') { say('bad', authMessage(kind, lang)); return; }
    remember('link');
    // the same answer whether or not the email has an account here
    say('ok', T('signin.magicSent', { email: em, center: p.name }));
    live(T('signin.magicSent', { email: em, center: p.name }));
  }, { signal: stop.signal });

  const g = document.getElementById('googleSignin');
  if (g) g.addEventListener('click', async () => {
    say('info', T('signin.googleGoing'));
    const keep = safeNext(new URLSearchParams(location.search).get('next'), slug);
    if (keep) rememberNext(keep);
    try { await startGoogleSignIn(client(), slug, location.origin); }
    catch (e) { say('bad', authMessage(authErrorKind(e) || 'unknown', lang)); }
  }, { signal: stop.signal });
}
