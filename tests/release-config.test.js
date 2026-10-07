// Release branch configuration: the production URLs, and the guarantee that only a PUBLIC anon key can ever be written into a
// file served to browsers (tools/set-hub-config.mjs).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const tool = () => import(path.join(ROOT, 'tools', 'set-hub-config.mjs'));
const b64u = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (payload, alg = 'HS256') => `${b64u({ alg, typ: 'JWT' })}.${b64u(payload)}.${crypto.randomBytes(32).toString('base64url')}`;
const future = Math.floor(Date.now() / 1000) + 5 * 365 * 86400;

function runHubConfig(src, hostname) {
  const written = [];
  const window = {};
  vm.runInNewContext(src, { window, location: { hostname }, document: { write: (s) => written.push(s) } });
  return { window, written };
}

test('hub-config.js: production API url, and the portals stay in sample mode until a key is written', () => {
  const src = read('hub-config.js');
  const { window, written } = runHubConfig(src, 'dvolcore.github.io');
  assert.equal(window.FF_HUB_PROD.url, 'https://ff-api.dvolcore.com');
  if (window.FF_HUB_PROD.anonKey) {
    assert.deepEqual({ ...window.FF_HUB }, { url: 'https://ff-api.dvolcore.com', anonKey: window.FF_HUB_PROD.anonKey });
  } else {
    assert.equal(window.FF_HUB, undefined);
  }
  assert.equal(written.length, 0, 'the live site never loads the local override');
  const local = runHubConfig(src, '127.0.0.1');
  assert.match(local.written.join(''), /hub-config\.local\.js/);
});

test('hub-config.js: a committed key is always an anon-role JWT', async () => {
  const { anonClaims } = await tool();
  const { window } = runHubConfig(read('hub-config.js'), 'dvolcore.github.io');
  if (window.FF_HUB_PROD.anonKey) assert.equal(anonClaims(window.FF_HUB_PROD.anonKey).role, 'anon');
  assert.doesNotMatch(read('hub-config.js'), /service_role|c2VydmljZV9yb2xl/);
});

test('intake-config.js: empty until the gateway is hosted (honest "open soon" forms), else exactly the production gateway over https', () => {
  // tools/set-hub-config.mjs (run by deploy/site-config.sh at go-live) writes the production URL into this exact line.
  assert.match(read('intake-config.js'), /^window\.FF_INTAKE = \{ url: '(?:https:\/\/ff-intake\.dvolcore\.com)?', turnstileSiteKey: '[^']*' \};$/m);
});

test('set-hub-config: writes only the two marked lines, and is idempotent', async () => {
  const { apply } = await tool();
  const key = jwt({ role: 'anon', iss: 'supabase', iat: 1, exp: future });
  const cfg = { hub: { url: 'https://ff-api.dvolcore.com', anonKey: key }, intake: { url: 'https://ff-intake.dvolcore.com/' } };
  const once = apply(read('hub-config.js'), read('intake-config.js'), cfg);
  assert.match(once.hub, new RegExp(`anonKey: '${key}' \\}; // @generated`));
  const { window } = runHubConfig(once.hub, 'dvolcore.github.io');
  assert.deepEqual({ ...window.FF_HUB }, { url: 'https://ff-api.dvolcore.com', anonKey: key });
  const twice = apply(once.hub, once.intake, cfg);
  assert.equal(twice.hub, once.hub);
  assert.equal(twice.intake, once.intake);
  const changed = once.hub.split('\n').filter((l, i) => l !== read('hub-config.js').split('\n')[i]);
  assert.equal(changed.length <= 1, true);
});

test('set-hub-config: refuses service-role keys, demo keys, expiring keys and non-https or foreign URLs', async () => {
  const { apply } = await tool();
  const good = jwt({ role: 'anon', iss: 'supabase', iat: 1, exp: future });
  const base = { hub: { url: 'https://ff-api.dvolcore.com', anonKey: good }, intake: { url: 'https://ff-intake.dvolcore.com' } };
  const bad = [
    { hub: { ...base.hub, anonKey: jwt({ role: 'service_role', iss: 'supabase', exp: future }) } },
    { hub: { ...base.hub, anonKey: jwt({ role: 'anon', iss: 'supabase-demo', exp: future }) } },
    { hub: { ...base.hub, anonKey: jwt({ role: 'anon', iss: 'supabase', exp: Math.floor(Date.now() / 1000) + 86400 }) } },
    { hub: { ...base.hub, anonKey: jwt({ role: 'anon', exp: future }, 'none') } },
    { hub: { ...base.hub, anonKey: 'sb_secret_abcdef' } },
    { hub: { ...base.hub, url: 'http://ff-api.dvolcore.com' } },
    { hub: { ...base.hub, url: 'https://evil.example' } },
    { intake: { url: 'http://ff-intake.dvolcore.com' } },
  ];
  for (const b of bad) {
    assert.throws(() => apply(read('hub-config.js'), read('intake-config.js'), { ...base, ...b }), Error, JSON.stringify(b).slice(0, 80));
  }
});
