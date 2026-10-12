// N17: Google sign-in for staff (migration 20261030300000_staff_google_signin_oneroster.sql, docs/ops/GOOGLE_SIGNIN.md).
// The button is offered only when center_sso_options says so (platform switch sso_google + the center's own setting, both OFF by
// default). After any sign-in the page asks sso_session_check: a Google session that is not allowed here (a family login, someone outside
// the center's allowed email domains, the center switched it off) is signed out again, with the reason shown. Pure helpers are exported
// for the unit tests (tests/sso-unit.test.mjs), which use a mocked Supabase client in place of Google.

// What signInWithOAuth gets: back to the same center's sign-in page; Google always asks which account (shared classroom tablets).
export function googleOAuthArgs(slug, origin) {
  if (!/^[a-z0-9-]{1,80}$/.test(String(slug || ''))) throw new Error('bad center address');
  return { provider: 'google', options: { redirectTo: `${origin}/c/${slug}`, queryParams: { prompt: 'select_account' } } };
}

// The sign-in methods recorded in the session's access token (GoTrue's amr claim), e.g. ['password'] or ['oauth'].
export function sessionMethods(session) {
  const tok = session?.access_token;
  if (typeof tok !== 'string' || tok.split('.').length !== 3) return [];
  try {
    const b64 = tok.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = typeof atob === 'function' ? atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)) : Buffer.from(b64, 'base64').toString('utf8');
    const amr = JSON.parse(json).amr;
    return Array.isArray(amr) ? amr.map((a) => (typeof a === 'string' ? a : a?.method)).filter(Boolean) : [];
  } catch { return []; }
}
export const usedOAuth = (session) => sessionMethods(session).includes('oauth');

// Start the Google round trip (the browser leaves the page).
export async function startGoogleSignIn(client, slug, origin) {
  const { provider, options } = googleOAuthArgs(slug, origin);
  const r = await client.auth.signInWithOAuth({ provider, options });
  if (r?.error) throw r.error;
  return r?.data ?? null;
}

// After a sign-in at a center: { ok: true } or { ok: false, reason } (and the session is signed out).
export async function enforceStaffSso(client, rpc, centerId) {
  const { data } = await client.auth.getSession();
  if (!usedOAuth(data?.session)) return { ok: true, method: 'password_or_link' };
  let r;
  try { r = await rpc('sso_session_check', { p_center: centerId }); } catch { r = { ok: false, reason: 'check_failed' }; }
  if (r && r.ok) return r;
  await client.auth.signOut().catch(() => {});
  return { ok: false, reason: r?.reason || 'check_failed' };
}

// The reason keys sso_session_check returns -> i18n keys (hub/web/i18n.js 'sso.*')
export const SSO_REASON_KEY = Object.freeze({
  google_off: 'sso.off', center_off: 'sso.off', not_member: 'sso.notMember', staff_only: 'sso.staffOnly', domain: 'sso.domain', check_failed: 'sso.failed',
});
