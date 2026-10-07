// hub-auth.js (W2-C) against a fake signed-in hub: the two-step gate, the sign-in page additions, the account and
// reset-password views, the reset-link rewrite and the password rules. The database side (AAL2 enforcement, PIN hashing,
// audit log) is tested against Postgres in the hub repo (hub/tests/security-identity*.test.mjs, the second one in a real
// browser on this file).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'hub-auth.js'), 'utf8');

function load({ status = { mfa_required: false, aal: 'aal1' }, factors = [], search = '', connected = false, role = 'teacher', hub = true } = {}) {
  const calls = [];
  const client = {
    rpc: async (fn, args) => { calls.push(['rpc', fn, args]); return fn === 'security_my_status' ? { data: status, error: null } : { data: null, error: null }; },
    auth: { mfa: {
      listFactors: async () => ({ data: { totp: factors, all: factors }, error: null }),
      enroll: async (o) => { calls.push(['enroll', o]); return { data: { id: 'f-new', totp: { qr_code: 'data:image/svg+xml;utf-8,<svg/>', secret: 'ABCDEFGHIJKLMNOP"<' } }, error: null }; },
      unenroll: async () => ({ error: null }),
    } },
  };
  const replaced = [];
  const V = {
    'signin-teacher': () => '<form class="card signin" id="hubSigninForm"><p class="note">Accounts are created by your center. There is no sign-up on this site.</p></form><div><button class="btn soft" type="button" data-hub="signout">Sign out</button></div>',
    'signin-family': () => '<p class="note">Accounts are created by your center.</p>',
  };
  const ctx = {
    console, Date, Promise, Number, String, Math, Object, JSON, URLSearchParams, setInterval: () => 0,
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    location: { search, pathname: '/ff/', origin: 'http://127.0.0.1:1', hash: '' },
    history: { replaceState: (a, b, u) => replaced.push(u) },
    document: { addEventListener() {}, getElementById: () => null, body: { children: [] } },
    addEventListener() {},
    V, view: 'home', arg: null, gone: [],
    phero: (t) => `<h1>${t}</h1>`,
    render() {},
  };
  ctx.go = (v, a) => { ctx.gone.push([v, a]); ctx.view = v; ctx.arg = a; };
  ctx.window = ctx;
  if (hub) ctx.FFHub = { configured: true, connected, role, email: 'pat@example.org', center: { name: 'TEST <Center>' }, client: () => client, ready: Promise.resolve(), portalFor: (r) => (r === 'family' ? 'family-portal' : 'portal') };
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx, { filename: 'hub-auth.js' });
  return { ctx, calls, replaced };
}

test('password rules: 10 characters, not common, not the email name', () => {
  const { ctx } = load();
  const p = ctx.FFHubAuth.pwProblem;
  assert.match(p('short', 'a@b.c'), /at least 10/);
  assert.match(p('password1234', 'a@b.c'), /too common/);
  assert.match(p('Password1234', 'a@b.c'), /too common/, 'case does not help');
  assert.match(p('aaaaaaaaaaaa', 'a@b.c'), /too common/);
  assert.match(p('1234567890', 'a@b.c'), /too common/);
  assert.match(p('jordanlee-garden', 'jordanlee@example.org'), /email name/);
  assert.equal(p('maple river lantern', 'jordan@example.org'), '');
});

test('the sign-in pages offer "Forgot your password?" and, when signed in, "Account and security"', () => {
  const { ctx } = load();
  const t = ctx.V['signin-teacher']();
  assert.match(t, /data-ffa="forgot" data-for="staff">Forgot your password\?/);
  assert.match(t, /data-go="account">Account and security<\/button>\s*<button class="btn soft" type="button" data-hub="signout">/);
  assert.match(ctx.V['signin-family'](), /data-for="family"/);
});

test('a reset link back from email (?for=family) becomes the family sign-in page; the token params are left for hub-backend', () => {
  const { replaced } = load({ search: '?for=family&x=1' });
  assert.deepEqual(replaced, ['/ff/?x=1#signin-family']);
  assert.deepEqual(load({ search: '?for=staff' }).replaced, ['/ff/#signin-teacher']);
  assert.deepEqual(load({ search: '?for=evil' }).replaced, []);
});

test('gate: teachers and AAL2 sessions pass; a director at AAL1 with a factor is asked for the code', async () => {
  assert.equal(await load().ctx.FFHub.gate({ role: 'teacher' }), true);
  assert.equal(await load({ status: { mfa_required: true, aal: 'aal2' } }).ctx.FFHub.gate({ role: 'director' }), true);
  const { ctx, calls } = load({ status: { mfa_required: true, aal: 'aal1' }, factors: [{ id: 'f1', status: 'verified', factor_type: 'totp' }] });
  assert.equal(await ctx.FFHub.gate({ role: 'director' }), false, 'the portal does not open');
  assert.deepEqual(ctx.gone.at(-1), ['signin-teacher', undefined]);
  const card = ctx.FFHub.authCard('Teacher');
  assert.match(card, /id="ffaMfa" data-mode="verify"/);
  assert.match(card, /autocomplete="one-time-code"/);
  assert.ok(!calls.some((c) => c[0] === 'enroll'), 'no new factor when one is verified');
});

test('gate: a director without a factor gets the setup card (QR and setup key, escaped)', async () => {
  const { ctx, calls } = load({ status: { mfa_required: true, aal: 'aal1' } });
  assert.equal(await ctx.FFHub.gate({ role: 'director' }), false);
  assert.ok(calls.some((c) => c[0] === 'enroll' && c[1].factorType === 'totp'));
  const card = ctx.FFHub.authCard('Teacher');
  assert.match(card, /Set up two-step verification/);
  assert.match(card, /<img class="ffa-qr" src="data:image\/svg\+xml/);
  assert.match(card, /ABCD EFGH IJKL MNOP &quot;&lt;/);
  assert.ok(!/MNOP "</.test(card), 'setup key is escaped');
});

test('account page: signed out asks to sign in; reset page posts to the staff or family address', () => {
  const { ctx } = load();
  ctx.FFPortal = { connectHub: () => Promise.resolve(null) };
  assert.match(ctx.V.account(), /Loading your account/);
  assert.match(ctx.V.account(), /Sign in first/);
  ctx.arg = 'family';
  const r = ctx.V['reset-password']();
  assert.match(r, /id="ffaForgot" data-for="family"/);
  assert.match(r, /autocomplete="username"/);
  assert.match(r, /data-go="signin-family"/);
});

test('no live Hub (the public site): #account and #reset-password are honest pages that lead to sign-in, never the 404', () => {
  const { ctx } = load({ hub: false });
  assert.equal(typeof ctx.V.account, 'function', '#account has a view');
  assert.equal(typeof ctx.V['reset-password'], 'function', '#reset-password has a view');
  const a = ctx.V.account(), r = ctx.V['reset-password']();
  for (const t of [a, r]) {
    assert.match(t, /not live on this site yet/);
    assert.match(t, /data-go="signin-teacher"/);
    assert.match(t, /data-go="signin-family"/);
    assert.match(t, /data-go="support"/);
    assert.ok(!/<input|<form/.test(t), 'no form that would pretend to send a link or change a password');
  }
  assert.match(a, /no real accounts, passwords or two-step codes/);
  assert.match(r, /no password to reset yet/);
  assert.ok(!('FFHubAuth' in ctx), 'the live-hub code does not run');
});

test('index.html loads hub-auth after hub-backend, with cache-busting', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const a = html.search(/<script src="hub-backend\.js\?v=\d+"><\/script>/), b = html.search(/<script src="hub-auth\.js\?v=\d+"><\/script>/);
  assert.ok(a > 0 && b > a, 'hub-auth.js right after hub-backend.js');
  assert.match(html, /<link rel="stylesheet" href="hub-auth\.css\?v=\d+">/);
  const hb = fs.readFileSync(path.join(ROOT, 'hub-backend.js'), 'utf8');
  assert.match(hb, /H\.gate && !\(await H\.gate\(pick\)\)/, 'portal opens only through the gate');
  assert.match(hb, /minlength="10"/);
});
