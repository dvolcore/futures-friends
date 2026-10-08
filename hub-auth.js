/* Futures Hub sign-in security (wave 2, W2-C). Loads after hub-backend.js and does nothing unless the Hub is configured.

     - Two-step verification (TOTP) for directors and HQ: after the password, set up an authenticator app or enter its code.
       The database is what enforces it: below AAL2 a director or HQ session reads no children's records, compliance,
       training management or exports (hub migration 20261010610000). This screen is the way through, not the lock.
     - Forgot password (#reset-password): emails a one-time link; hub-backend.js already turns that link into
       "Choose your password".
     - Account (#account): change password (current password checked by the server), two-step status, classroom PIN.
     - Idle lock for shared classroom tablets: a staff session locks after 10 minutes without a touch or key press;
       the staff PIN (hashed and rate-limited on the server) or the password unlocks it, "Switch person" signs out.

   Passwords: at least 10 characters (also enforced by Supabase Auth) and not on the common-password list below. The
   leaked-password check against HaveIBeenPwned is a hosted Supabase setting (owner step), not something this page does. */
(function(){
const H = window.FFHub;
if (!H || !H.configured) {
  // No live Hub on this copy of the site (the public site today): the Teacher and Family portals are sample previews with no
  // real accounts or passwords. #account and #reset-password are still listed routes, so they say that plainly and lead to
  // the sign-in pages instead of falling through to "We can't find that page" (visual audit, 2026-10-07).
  if (typeof V === 'undefined' || typeof phero !== 'function') return;
  const noHub = (title, kicker, k, h3, body) => phero(title, kicker, '', {chars:[k]}) + `
<section class="band-paper"><div class="wrap"><div class="card signin ffa-card" id="ffaNoHub"><h3>${h3}</h3>
 <p class="small">${body}</p>
 <div class="ffa-row"><button class="btn gold" type="button" data-go="signin-teacher">Teacher Sign-In</button><button class="btn soft" type="button" data-go="signin-family">Family Sign-In</button></div>
 <p class="note">Need help with an account? <button type="button" class="rl" data-go="support">Contact the center</button></p></div></div></section>`;
  if (!V.account) V.account = () => noHub('Account and security', 'Your Futures Hub account', 'zuri', 'Account settings are not open yet',
    'Futures Hub sign-in is not live on this site yet. The Teacher and Family portals here are sample previews: they have no real accounts, passwords or two-step codes to change. When real accounts open, your center will send an invitation and this page will hold your password, two-step verification and classroom PIN.');
  if (!V['reset-password']) V['reset-password'] = () => noHub('Reset your password', 'Forgot your password?', arg === 'family' ? 'lumi' : 'booker', 'There is no password to reset yet',
    'Futures Hub sign-in is not live on this site yet, so there are no real passwords here. The sample portals open without one. If your center has given you a real account, contact the center and a real person will help.');
  return;
}
const sb = () => H.client();
const MIN_PW = 10;
const STORE_LAST = 'ff-hub-last-active', STORE_LOCK = 'ff-hub-locked';
let idleMs = (Number((window.FF_HUB || {}).idleMinutes) || 10) * 60000;
const esc_ = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ls = {get:k => { try { return localStorage.getItem(k); } catch (_) { return null; } },
            set:(k, v) => { try { localStorage.setItem(k, v); } catch (_) {} },
            del:k => { try { localStorage.removeItem(k); } catch (_) {} }};

// ---- a password reset link opened from email: ?for=staff|family -> the matching sign-in page (before the router starts)
try {
  const q = new URLSearchParams(location.search), f = q.get('for');
  if (f === 'family' || f === 'staff') {
    q.delete('for');
    const s = q.toString();
    history.replaceState(null, '', location.pathname + (s ? '?' + s : '') + (f === 'family' ? '#signin-family' : '#signin-teacher'));
  }
} catch (_) {}

// ---- password rules ----------------------------------------------------------------------------------------------------
// Common choices that meet the length rule (lower-cased). A short list on purpose: it catches the obvious ones; the hosted
// leaked-password check catches the rest.
const COMMON = new Set(('password1234 password123! password12 1234567890 0123456789 12345678910 1111111111 0000000000 ' +
  'qwertyuiop qwerty12345 qwerty123456 1q2w3e4r5t 1qaz2wsx3edc asdfghjkl1 iloveyou12 iloveyou123 abc1234567 abcdefghij ' +
  'football12 baseball12 basketball welcome123 welcome1234 letmein123 sunshine12 princess12 password01 passw0rd123 ' +
  'changeme123 administrator 9876543210 123123123123 monkey12345 dragon12345 superman12 trustno1234 teacher123 ' +
  'teacher1234 daycare123 daycare1234 childcare1 childcare12 futuresfriends futuresfriends1 futuresfriends123 ' +
  'kansascity1 kansascity12 chiefs12345 royals12345').split(' '));
function pwProblem(pw, email){
  const p = String(pw || '');
  if (p.length < MIN_PW) return `Use at least ${MIN_PW} characters.`;
  const low = p.toLowerCase(), local = String(email || '').split('@')[0].toLowerCase();
  if (COMMON.has(low) || /^(.)\1+$/.test(p) || '01234567890123456789'.includes(p) || 'abcdefghijklmnopqrstuvwxyz'.includes(low)) return 'That password is too common. Choose something less predictable, such as three or four unrelated words.';
  if (local.length >= 4 && low.includes(local)) return 'Do not use your email name in your password.';
  return '';
}

// ---- server status -------------------------------------------------------------------------------------------------------
async function myStatus(){
  try { const r = await sb().rpc('security_my_status'); return r.error ? null : r.data; } catch (_) { return null; }
}

// ---- two-step verification gate (hub-backend.js calls H.gate before a portal opens) -------------------------------------
let mfa = null;   // {who, mode:'enroll'|'verify', factorId, qr, secret, busy}
const whoOf = pick => pick && pick.role === 'family' ? 'Family' : 'Teacher';
async function startEnroll(){
  const c = sb();
  const list = await c.auth.mfa.listFactors();
  for (const f of ((list.data && list.data.all) || []).filter(f => f.factor_type === 'totp' && f.status !== 'verified')) {
    try { await c.auth.mfa.unenroll({factorId:f.id}); } catch (_) {}   // an earlier, unfinished setup
  }
  const e = await c.auth.mfa.enroll({factorType:'totp', friendlyName:'Futures Hub ' + new Date().toISOString().slice(0, 10)});
  if (e.error) throw e.error;
  return {mode:'enroll', factorId:e.data.id, qr:e.data.totp.qr_code, secret:e.data.totp.secret};
}
H.gate = async pick => {
  const st = await myStatus();
  if (!st || !st.mfa_required || st.aal === 'aal2') return true;
  const who = whoOf(pick);
  try {
    const list = await sb().auth.mfa.listFactors();
    const done = ((list.data && list.data.totp) || []).find(f => f.status === 'verified');
    mfa = Object.assign({who}, done ? {mode:'verify', factorId:done.id} : await startEnroll());
  } catch (e) {
    mfa = {who, mode:'error'};
  }
  go(who === 'Family' ? 'signin-family' : 'signin-teacher');
  return false;
};
function mfaCard(){
  const msg = `<p class="note" id="ffaMsg" role="alert" aria-live="polite"></p>`;
  const out = `<button class="btn soft" type="button" data-ffa="signout">Sign out</button>`;
  if (mfa.mode === 'error') return `<div class="card signin ffa-card" id="ffaMfa" role="alert"><h3>Two-step verification could not start</h3>
 <p class="small">Your role needs two-step verification, and it could not be set up just now. Try again in a moment.</p>${out}</div>`;
  const code = `<label class="f" for="ffaCode">6-digit code from the app<input class="i ffa-code" id="ffaCode" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required></label>`;
  if (mfa.mode === 'verify') return `<form class="card signin ffa-card" id="ffaMfa" data-mode="verify" novalidate><h3>Enter your verification code</h3>
 <p class="small">Open the authenticator app on your phone and type the 6-digit code for Futures Hub.</p>${code}
 <button class="btn gold" type="submit">Verify and continue</button>${out}${msg}
 <p class="note">Lost your phone? Ask headquarters to reset your two-step verification.</p></form>`;
  const key = String(mfa.secret || '').replace(/(.{4})/g, '$1 ').trim();
  const qr = /^data:image\/svg\+xml/.test(String(mfa.qr || '')) ? `<img class="ffa-qr" src="${esc_(mfa.qr)}" alt="QR code to add Futures Hub to an authenticator app" width="180" height="180">` : '';
  return `<form class="card signin ffa-card" id="ffaMfa" data-mode="enroll" novalidate><h3>Set up two-step verification</h3>
 <p class="small">Directors and headquarters staff can see every child's records, so your account needs a second step: a code from an app on your phone, as well as your password.</p>
 <ol class="ffa-steps small"><li>Install an authenticator app on your phone (for example Google Authenticator, Microsoft Authenticator or 1Password).</li>
 <li>In the app, add an account and scan this code${key ? ', or type the setup key' : ''}.${qr}${key ? `<span class="ffa-key" id="ffaKey">${esc_(key)}</span>` : ''}</li>
 <li>Type the 6-digit code the app shows.</li></ol>${code}
 <button class="btn gold" type="submit">Verify and continue</button>${out}${msg}</form>`;
}
H.authCard = () => mfa ? mfaCard() : '';
const ffaMsg = (t, bad) => { const m = document.getElementById('ffaMsg'); if (!m) return; m.textContent = t || ''; m.style.color = bad ? 'var(--bad)' : 'var(--ok)'; };

document.addEventListener('submit', async e => {
  const f = e.target; if (f.id !== 'ffaMfa') return; e.preventDefault();
  if (!mfa || mfa.busy) return;
  const code = String(f.elements.code.value || '').replace(/\s/g, '');
  if (!/^[0-9]{6}$/.test(code)) { ffaMsg('Enter the 6 digits the app shows.', true); return; }
  mfa.busy = true; ffaMsg('Checking...', false);
  const r = await sb().auth.mfa.challengeAndVerify({factorId:mfa.factorId, code});
  mfa.busy = false;
  if (r.error) { ffaMsg(/rate|too many/i.test(r.error.message || '') ? 'Too many tries. Wait a minute and try again.' : 'That code did not work. Codes change every 30 seconds: try the newest one.', true); f.elements.code.value = ''; f.elements.code.focus(); return; }
  const who = mfa.who; mfa = null;
  try { await H.afterSignIn(who); } catch (_) { render(); }
});

// ---- forgot password ------------------------------------------------------------------------------------------------------
V['reset-password'] = () => {
  const fam = arg === 'family';
  return phero('Reset your password', 'Forgot your password?', '', {chars:[fam ? 'lumi' : 'booker']}) + `
<section class="band-paper"><div class="wrap"><form class="card signin ffa-card" id="ffaForgot" data-for="${fam ? 'family' : 'staff'}" novalidate><h3>Email me a reset link</h3>
 <p class="small">Enter the email address you sign in with. If it has an account, we will email a link to choose a new password. The link works once and expires after a short time.</p>
 <label class="f" for="ffaEmail">Email<input class="i" id="ffaEmail" name="email" type="email" autocomplete="username" required></label>
 <button class="btn gold" type="submit">Send the reset link</button>
 <button class="btn soft" type="button" data-go="${fam ? 'signin-family' : 'signin-teacher'}">Back to sign-in</button>
 <p class="note" id="ffaMsg" role="alert" aria-live="polite"></p></form></div></section>`;
};
document.addEventListener('submit', async e => {
  const f = e.target; if (f.id !== 'ffaForgot') return; e.preventDefault();
  const email = String(f.elements.email.value || '').trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { ffaMsg('Enter the email address you sign in with.', true); return; }
  const b = f.querySelector('button[type=submit]'); b.disabled = true; ffaMsg('Sending...', false);
  let r; try { await H.ready; r = await sb().auth.resetPasswordForEmail(email, {redirectTo:location.origin + (window.FF_ROOT_PATH||location.pathname) + '?for=' + f.dataset.for}); } catch (err) { r = {error:err}; }
  b.disabled = false;
  if (r.error && (r.error.status === 429 || /rate limit|too many|seconds/i.test(r.error.message || ''))) { ffaMsg('A link was just sent. Wait a minute before asking for another.', true); return; }
  ffaMsg('If that address has an account, a reset link is on its way. Check your email, including spam.', false);   // same answer either way
});

// sign-in pages: "Forgot your password?" under the hub's sign-in form; "Account" on the signed-in card
['Family', 'Teacher'].forEach(who => {
  const key = 'signin-' + who.toLowerCase(), base = V[key];
  V[key] = () => base()
    .replace('<p class="note">Accounts are created by your center.', () => `<button class="btn soft" type="button" data-ffa="forgot" data-for="${who === 'Family' ? 'family' : 'staff'}">Forgot your password?</button>\n <p class="note">Accounts are created by your center.`)
    .replace('<button class="btn soft" type="button" data-hub="signout">Sign out</button>', m => `<button class="btn soft" type="button" data-go="account">Account and security</button>\n ${m}`);
});

// ---- account page ------------------------------------------------------------------------------------------------------------
let acct = null, acctTried = false;   // {st, factors, enroll}
async function loadAccount(){
  const st = await myStatus();
  const list = await sb().auth.mfa.listFactors();
  acct = {st, factors:((list.data && list.data.totp) || []).filter(f => f.status === 'verified'), enroll:acct && acct.enroll};
  if (view === 'account') render();
}
V.account = () => {
  const head = phero('Account and security', 'Your Futures Hub account', '', {chars:['zuri']});
  if (!H.connected && !acctTried) {   // opened directly (#account): restore a saved session first
    acctTried = true;
    Promise.resolve(window.FFPortal && window.FFPortal.connectHub()).catch(() => null).then(() => { if (view === 'account') render(); });
    return head + `<section class="band-paper"><div class="wrap"><div class="card ffa-card" id="ffaAccount"><p class="small">Loading your account...</p></div></div></section>`;
  }
  if (!H.connected) return head + `<section class="band-paper"><div class="wrap"><div class="card ffa-card" id="ffaAccount"><h3>Sign in first</h3>
 <p class="small">Your account settings open after you sign in.</p><div class="ffa-row"><button class="btn gold" type="button" data-go="signin-teacher">Teacher Sign-In</button><button class="btn soft" type="button" data-go="signin-family">Family Sign-In</button></div></div></div></section>`;
  if (!acct) { loadAccount(); return head + `<section class="band-paper"><div class="wrap"><div class="card ffa-card" id="ffaAccount"><p class="small">Loading your account...</p></div></div></section>`; }
  const st = acct.st || {}, staff = H.role !== 'family';
  const mfaPart = acct.factors.length
    ? `<p class="small"><span class="ffa-chip ok">On</span> Codes come from your authenticator app${acct.factors.length > 1 ? ` (${acct.factors.length} apps)` : ''}.</p>
       ${st.mfa_required ? '<p class="note">Required for your role. To move it to a new phone, ask headquarters to reset it, then set it up again when you next sign in.</p>' : `<button class="btn soft" type="button" data-ffa="mfa-off" data-id="${esc_(acct.factors[0].id)}">Turn off two-step verification</button>`}`
    : acct.enroll ? `<form id="ffaEnrollAcct" novalidate><p class="small">Scan the code with your authenticator app${acct.enroll.secret ? ' or type the setup key' : ''}, then type the 6-digit code it shows.</p>
       ${/^data:image\/svg\+xml/.test(String(acct.enroll.qr || '')) ? `<img class="ffa-qr" src="${esc_(acct.enroll.qr)}" alt="QR code to add Futures Hub to an authenticator app" width="180" height="180">` : ''}
       <span class="ffa-key">${esc_(String(acct.enroll.secret || '').replace(/(.{4})/g, '$1 ').trim())}</span>
       <label class="f" for="ffaAcctCode">6-digit code<input class="i ffa-code" id="ffaAcctCode" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required></label>
       <button class="btn gold" type="submit">Turn on</button></form>`
    : `<p class="small"><span class="ffa-chip">Off</span> Add a code from an app on your phone as a second step when you sign in.</p><button class="btn soft" type="button" data-ffa="mfa-on">Set up two-step verification</button>`;
  const pinPart = staff ? `<section class="ffa-sec" aria-labelledby="ffaPinH"><h4 id="ffaPinH">Classroom tablet PIN</h4>
 <p class="small">On a shared classroom tablet the Hub locks itself after ${Math.round(idleMs / 60000)} minutes without use. Your PIN unlocks it. ${st.pin_set ? '<span class="ffa-chip ok">PIN set</span>' : '<span class="ffa-chip">No PIN yet</span>'}</p>
 <form id="ffaPin" novalidate><label class="f" for="ffaPinNew">New PIN (4 to 6 digits)<input class="i ffa-code" id="ffaPinNew" name="pin" type="password" inputmode="numeric" autocomplete="off" maxlength="6" required></label>
 <label class="f" for="ffaPinNew2">Type it again<input class="i ffa-code" id="ffaPinNew2" name="pin2" type="password" inputmode="numeric" autocomplete="off" maxlength="6" required></label>
 <button class="btn gold" type="submit">${st.pin_set ? 'Change PIN' : 'Set PIN'}</button></form></section>` : '';
  return head + `<section class="band-paper"><div class="wrap"><div class="card ffa-card" id="ffaAccount">
 <h3>${esc_(H.email)}</h3><p class="small">${H.role === 'family' ? 'Family account' : H.role === 'director' ? 'Director' : 'Teacher'}${H.center && H.center.name ? ' at ' + esc_(H.center.name) : ''}.</p>
 <p class="note" id="ffaMsg" role="alert" aria-live="polite"></p>
 <section class="ffa-sec" aria-labelledby="ffaPwH"><h4 id="ffaPwH">Password</h4>
 <form id="ffaPw" novalidate><input type="email" name="username" autocomplete="username" value="${esc_(H.email)}" hidden>
 <label class="f" for="ffaPwOld">Current password<input class="i" id="ffaPwOld" name="current" type="password" autocomplete="current-password" required></label>
 <label class="f" for="ffaPwNew">New password (at least ${MIN_PW} characters)<input class="i" id="ffaPwNew" name="password" type="password" autocomplete="new-password" minlength="${MIN_PW}" required></label>
 <label class="f" for="ffaPwNew2">Type it again<input class="i" id="ffaPwNew2" name="confirm" type="password" autocomplete="new-password" minlength="${MIN_PW}" required></label>
 <button class="btn gold" type="submit">Change password</button></form></section>
 <section class="ffa-sec" aria-labelledby="ffaMfaH"><h4 id="ffaMfaH">Two-step verification</h4>${mfaPart}</section>
 ${pinPart}
 <div class="ffa-row"><button class="btn soft" type="button" data-go="${H.portalFor(H.role)}">Back to the portal</button><button class="btn soft" type="button" data-hub="signout">Sign out</button></div>
 </div></div></section>`;
};
document.addEventListener('submit', async e => {
  const f = e.target;
  if (f.id === 'ffaPw') {
    e.preventDefault();
    const cur = f.elements.current.value, p1 = f.elements.password.value, p2 = f.elements.confirm.value;
    const bad = pwProblem(p1, H.email);
    if (!cur) { ffaMsg('Enter your current password.', true); return; }
    if (bad) { ffaMsg(bad, true); return; }
    if (p1 !== p2) { ffaMsg('The two new passwords do not match.', true); return; }
    if (p1 === cur) { ffaMsg('Choose a password different from your current one.', true); return; }
    ffaMsg('Checking...', false);
    const chk = await sb().rpc('security_check_password', {p_password:cur});
    if (chk.error) { ffaMsg(chk.error.code === '54000' ? 'Too many tries. Wait 15 minutes and try again.' : 'Could not check your password. Try again in a moment.', true); return; }
    if (chk.data !== true) { ffaMsg('Your current password is not right.', true); return; }
    const u = await sb().auth.updateUser({password:p1});
    if (u.error) { ffaMsg(/weak|short|least/i.test(u.error.message || '') ? `Use at least ${MIN_PW} characters.` : 'That password cannot be used. Choose a different one.', true); return; }
    f.reset(); ffaMsg('Password changed.', false);
  } else if (f.id === 'ffaPin') {
    e.preventDefault();
    const a = f.elements.pin.value, b = f.elements.pin2.value;
    if (!/^[0-9]{4,6}$/.test(a)) { ffaMsg('Use 4 to 6 digits.', true); return; }
    if (a !== b) { ffaMsg('The two PINs do not match.', true); return; }
    const r = await sb().rpc('security_set_pin', {p_pin:a});
    if (r.error) { ffaMsg(/easy/i.test(r.error.message || '') ? 'That PIN is too easy to guess (no repeats or runs like 1234).' : 'Could not save the PIN. Try again in a moment.', true); return; }
    ffaMsg('PIN saved.', false); await loadAccount(); ffaMsg('PIN saved.', false);
  } else if (f.id === 'ffaEnrollAcct') {
    e.preventDefault();
    const code = String(f.elements.code.value || '').replace(/\s/g, '');
    const r = await sb().auth.mfa.challengeAndVerify({factorId:acct.enroll.factorId, code});
    if (r.error) { ffaMsg('That code did not work. Try the newest one.', true); return; }
    acct.enroll = null; await loadAccount(); ffaMsg('Two-step verification is on.', false);
  }
});

// ---- idle lock (staff sessions) ---------------------------------------------------------------------------------------------
// starts from the last activity stored on this device: a tablet left signed in overnight opens locked
let locked = false, usePw = false, lastSeen = Number(ls.get(STORE_LAST)) || Date.now();
function touch(){ if (locked) return; const n = Date.now(); if (n - lastSeen > 5000) ls.set(STORE_LAST, String(n)); lastSeen = n; }
['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'].forEach(ev => addEventListener(ev, touch, {passive:true, capture:true}));
const lockable = () => H.connected && H.role && H.role !== 'family';
function idleFor(){ return Date.now() - Math.max(lastSeen, Number(ls.get(STORE_LAST)) || 0); }
function lockNow(){
  if (locked || !lockable()) return;
  locked = true; usePw = false; ls.set(STORE_LOCK, '1');
  const o = document.createElement('div');
  o.id = 'ffaLock'; o.className = 'ffa-lock'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-labelledby', 'ffaLockH');
  document.body.appendChild(o);
  [...document.body.children].forEach(el => { if (el !== o) el.setAttribute('inert', ''); });
  drawLock();
}
async function drawLock(note){
  const o = document.getElementById('ffaLock'); if (!o) return;
  const st = await myStatus();
  const pin = st && st.pin_set && !(st.pin_locked_until) && !usePw;
  o.innerHTML = `<form class="ffa-lockbox" id="ffaUnlock" novalidate><h2 id="ffaLockH">Locked for privacy</h2>
 <p>Signed in as <b>${esc_(H.email)}</b>. ${pin ? 'Enter your PIN to continue.' : 'Enter your password to continue.'}</p>
 ${pin ? `<label class="f" for="ffaLockPin">PIN<input class="i ffa-code" id="ffaLockPin" name="pin" type="password" inputmode="numeric" autocomplete="off" maxlength="6"></label>`
       : `<input type="email" name="username" autocomplete="username" value="${esc_(H.email)}" hidden><label class="f" for="ffaLockPw">Password<input class="i" id="ffaLockPw" name="password" type="password" autocomplete="current-password"></label>`}
 <button class="btn gold" type="submit">Unlock</button>
 ${pin ? '<button class="btn soft" type="button" data-ffa="lock-pw">Use my password instead</button>' : ''}
 <button class="btn soft" type="button" data-ffa="switch">Switch person (sign out)</button>
 <p class="note" id="ffaLockMsg" role="alert" aria-live="polite">${esc_(note || (st && st.pin_locked_until ? 'Your PIN is paused after too many tries. Use your password.' : st && !st.pin_set && st.staff ? 'Tip: set a PIN on your Account page to unlock faster.' : ''))}</p></form>`;
  const i = o.querySelector('input:not([hidden])'); if (i) i.focus();
}
function unlock(){
  locked = false; ls.del(STORE_LOCK); lastSeen = Date.now(); ls.set(STORE_LAST, String(lastSeen));
  const o = document.getElementById('ffaLock'); if (o) o.remove();
  [...document.body.children].forEach(el => el.removeAttribute('inert'));
}
document.addEventListener('submit', async e => {
  const f = e.target; if (f.id !== 'ffaUnlock') return; e.preventDefault();
  const m = document.getElementById('ffaLockMsg'), say = t => { if (m) { m.textContent = t; m.style.color = 'var(--bad)'; } };
  if (f.elements.pin) {
    const r = await sb().rpc('security_verify_pin', {p_pin:String(f.elements.pin.value || '')});
    if (r.error) { say('Could not check the PIN. Use your password.'); usePw = true; return drawLock(); }
    if (r.data && r.data.ok) return unlock();
    f.elements.pin.value = '';
    if (r.data && r.data.reason === 'locked') { usePw = true; return drawLock('Too many wrong PINs. Use your password, or wait 15 minutes.'); }
    return say(`That PIN is not right.${r.data && r.data.tries_left ? ` ${r.data.tries_left} ${r.data.tries_left === 1 ? 'try' : 'tries'} left.` : ''}`);
  }
  const pw = String(f.elements.password.value || ''); if (!pw) return say('Enter your password.');
  const r = await sb().rpc('security_check_password', {p_password:pw});
  if (r.error) return say(r.error.code === '54000' ? 'Too many tries. Wait 15 minutes, or switch person.' : 'Could not check your password. Try again.');
  if (r.data === true) return unlock();
  f.elements.password.value = ''; say('That password is not right.');
});
setInterval(() => { if (!locked && lockable() && idleFor() >= idleMs) lockNow(); else if (!locked && lockable() && ls.get(STORE_LOCK) === '1') lockNow(); }, 1000);

// ---- clicks -------------------------------------------------------------------------------------------------------------------
document.addEventListener('click', async e => {
  const t = e.target.closest('[data-ffa]'); if (!t) return;
  const a = t.dataset.ffa; e.preventDefault();
  if (a === 'forgot') return go('reset-password', t.dataset.for === 'family' ? 'family' : 'staff');
  if (a === 'signout' || a === 'switch') { mfa = null; acct = null; unlock(); return H.signOut(); }
  if (a === 'lock-pw') { usePw = true; return drawLock(); }
  if (a === 'mfa-on') {
    try { const en = await startEnroll(); acct.enroll = en; render(); } catch (_) { ffaMsg('Could not start the setup. Try again in a moment.', true); }
    return;
  }
  if (a === 'mfa-off') {
    if (!confirm('Turn off two-step verification? Signing in will need only your password.')) return;
    const r = await sb().auth.mfa.unenroll({factorId:t.dataset.id});
    if (r.error) { ffaMsg('Could not turn it off. Sign out, sign in again with your code, then try.', true); return; }
    await loadAccount(); ffaMsg('Two-step verification is off.', false);
  }
});

// for tests and the browser check: the lock and its timing, nothing that bypasses a server check
window.FFHubAuth = {lockNow, isLocked:() => locked, setIdleMs:ms => { idleMs = Math.max(1000, Number(ms) || idleMs); }, pwProblem};
})();
