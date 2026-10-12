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

// Owner 2026-10-12: until go-live there is no "opens soon": every card offers Family / Teacher / Director login into the Futures Hub preview
// (portal-test/, fake demo data, no credentials), before the demo.
test('until go-live: every sign-in card offers Family, Teacher and Director login (the preview), before the demo', () => {
  const { V } = load('');
  for (const k of ['signin-family', 'signin-teacher', 'sign-in']) {
    const h = V[k]();
    assert.match(h, /id="hubLink" data-hub-open="preview"/, k);
    assert.doesNotMatch(h, /hubLinkGo|opens soon/, k);
    for (const [id, role, label] of [['hubPreviewGo', 'family', 'Family'], ['hubPreviewTeacher', 'teacher', 'Teacher'], ['hubPreviewDirector', 'director', 'Director']])
      assert.match(h, new RegExp(`id="${id}" href="portal-test/c/test-family-demo-center/\\?enter=${role}">${label} login<`), `${k} ${role}`);
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

// Owner 2026-10-12: the website's sign-in links go STRAIGHT into the preview's dashboards until go-live; at go-live they are left alone
// (the cards link to the Hub) and "Director login" opens the Hub's sign-in.
const fakeLink = (href) => ({ href, attrs: {}, getAttribute(k) { return k === 'href' ? this.href : this.attrs[k]; }, setAttribute(k, v) { if (k === 'href') this.href = v; else this.attrs[k] = v; } });
test('until go-live: Family, Teacher and Director sign-in links open that dashboard of the preview directly', () => {
  const { window } = load('');
  assert.equal(window.FFHubLink.preview, 'portal-test/c/test-family-demo-center/');
  for (const [href, role] of [['#signin-family', 'family'], ['#signin-teacher', 'teacher'], ['#signin-director', 'director']]) {
    const a = fakeLink(href);
    window.FFHubLink.wire({ querySelectorAll: () => [a], matches: () => false });
    assert.equal(a.href, `portal-test/c/test-family-demo-center/?enter=${role}`, href);
  }
  assert.match(read('index.html'), /<a href="#signin-teacher">Teacher sign-in<\/a><\/li><li><a href="#signin-director">Director login<\/a>/, 'the footer has a Director login next to Teacher sign-in');
});
test('at go-live: no preview anywhere; sign-in links stay; Director login opens the Hub', () => {
  const { V, window } = load('https://hub.example.test');
  for (const k of ['signin-family', 'signin-teacher', 'sign-in']) assert.doesNotMatch(V[k](), /hubPreview|portal-test/, k);
  const a = fakeLink('#signin-family'), d = fakeLink('#signin-director');
  window.FFHubLink.wire({ querySelectorAll: () => [a, d], matches: () => false });
  assert.equal(a.href, '#signin-family');
  assert.equal(d.href, 'https://hub.example.test/');
});
