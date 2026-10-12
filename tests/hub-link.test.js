// One app (N2, platform repo hub/PORTAL_RETIREMENT.md): every sign-in route of the site starts with the Futures Hub card.
// FF_HUB_URL empty (until go-live): "Your center's Hub opens soon", no link; set: a link to the Hub's sign-in, https only.
// The demo below it is labelled "Interactive demo (sample data)"; the site never sets FF_HUB in production.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
function load(hubUrl) {
  const V = { 'signin-family': () => '<div class="phero"></div><section class="band-paper"><div class="wrap"><form id="demo"></form></div></section>',
    'signin-teacher': () => '<section class="band-paper"><div class="wrap">teacher demo</div></section>', 'sign-in': () => '<div>chooser</div>' };
  const ctx = { V, window: { FF_HUB_URL: hubUrl } };
  ctx.window.window = ctx.window;
  vm.runInNewContext(`var window = this.window; var V = this.V; ${read('hub-link.js')}`, ctx);
  return ctx;
}

test('until go-live: every sign-in page says the Hub opens soon, before the demo, with no link', () => {
  const { V } = load('');
  for (const k of ['signin-family', 'signin-teacher', 'sign-in']) {
    const h = V[k]();
    assert.match(h, /id="hubLink" data-hub-open="soon"/, k);
    assert.match(h, /Your center’s Hub opens soon/, k);
    assert.doesNotMatch(h, /hubLinkGo/, k);
  }
  const fam = V['signin-family']();
  assert.ok(fam.indexOf('id="hubLink"') < fam.indexOf('id="demo"'), 'the Hub card comes before the demo');
  assert.match(fam, /^<div class="phero">/, 'the hero stays first');
});
test('at go-live: the card links to the Hub sign-in; only an https address is used', () => {
  const { V, window } = load('https://hub.example.test/');
  const h = V['signin-teacher']();
  assert.match(h, /href="https:\/\/hub\.example\.test\/" rel="noopener"/);
  assert.match(h, /Teachers and directors sign in to the Futures Hub/);
  assert.equal(window.FFHubLink.url(), 'https://hub.example.test');
  for (const bad of ['http://hub.example.test', 'javascript:alert(1)', 'https://x" onmouseover="y']) assert.equal(load(bad).window.FFHubLink.url(), '', bad);
});
test('wiring: HUB_URL is empty until go-live, hub-link.js loads after the demo and the chooser, the demo is labelled', () => {
  assert.match(read('hub-config.js'), /^window\.FF_HUB_URL = '';$/m);
  const idx = read('index.html');
  const pos = (s) => idx.indexOf(s);
  assert.ok(pos('hub-link.js?v=') > pos('demo-portal.js?v=') && pos('hub-link.js?v=') > pos('audiences.js?v='));
  assert.match(read('demo-portal.js'), /Interactive demo \(sample data\)/);
  assert.doesNotMatch(idx, /Portal \(preview\)/, 'footer links say sign-in, not a portal preview');
});

// Owner 2026-10-12: "when you click on parent login it will go straight into it". Until go-live the header "Sign in" and every Family
// sign-in link open the Family portal preview (portal-test/, the Futures Hub TEST copy: tests/portal-test.test.js) directly; the cards
// offer it too, with the "opens soon" text for staff. At go-live (FF_HUB_URL set) all of it goes back to the real Hub on its own.
test('until go-live: the cards offer the Family portal preview (fake demo family), staff still read "opens soon"', () => {
  const { V, window } = load('');
  assert.equal(window.FFHubLink.preview, 'portal-test/c/test-family-demo-center/');
  for (const k of ['signin-family', 'signin-teacher', 'sign-in']) {
    const h = V[k]();
    assert.match(h, /id="hubPreviewGo" href="portal-test\/c\/test-family-demo-center\/">Family portal preview</, k);
    assert.match(h, /fake demo family: nothing you do there is saved/, k);
    assert.match(h, /When your center opens on the Futures Hub/, k);
  }
  assert.match(V['signin-teacher'](), /<b>Teachers and directors:<\/b> When your center opens/);
});
test('at go-live: no preview anywhere, and the sign-in links are left alone', () => {
  const { V, window } = load('https://hub.example.test');
  for (const k of ['signin-family', 'signin-teacher', 'sign-in']) assert.doesNotMatch(V[k](), /hubPreviewGo|portal-test/, k);
  const a = { href: '#signin-family', getAttribute() { return this.href; }, setAttribute(k, v) { if (k === 'href') this.href = v; } };
  window.FFHubLink.wire({ querySelectorAll: () => [a], matches: () => false });
  assert.equal(a.href, '#signin-family', 'go-live: the link keeps its route (the card links to the Hub)');
  const b = { href: '#signin-family', getAttribute() { return this.href; }, setAttribute(k, v) { if (k === 'href') this.href = v; } };
  load('').window.FFHubLink.wire({ querySelectorAll: () => [b], matches: () => false });
  assert.equal(b.href, 'portal-test/c/test-family-demo-center/', 'until go-live: straight to the preview');
});
