// Build stamp (owner 2026-10-07): phones keep stale copies of the one shared link. index.html carries window.FF_BUILD, version.json the
// published build; build-stamp.js reloads ONCE when they differ (sessionStorage guard), never while a video plays or a field has focus.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const SRC = read('build-stamp.js');

test('the inline stamp in index.html equals version.json, and the script loads cache-busted', () => {
  const html = read('index.html'), v = JSON.parse(read('version.json'));
  const m = html.match(/<script>window\.FF_BUILD = '([^']+)';<\/script>/);
  assert.ok(m, 'inline stamp in index.html');
  assert.equal(m[1], v.build, 'index.html FF_BUILD === version.json build (bump both on every publish)');
  assert.deepEqual(Object.keys(v), ['build']);
  assert.match(html, /<script src="build-stamp\.js\?v=\d+"><\/script>/);
  assert.ok(html.indexOf('window.FF_BUILD') < html.indexOf('build-stamp.js'), 'the stamp is set before the script runs');
  assert.match(read('README.md'), /version\.json/, 'README documents the bump');
});

test('build-stamp.js asks only for version.json, with no cache', () => {
  const code = SRC.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.equal((code.match(/fetch\(/g) || []).length, 1);
  assert.match(code, /fetch\('version\.json\?t=' \+ Date\.now\(\), \{ cache: 'no-store' \}\)/);
  assert.doesNotMatch(code, /XMLHttpRequest|sendBeacon|WebSocket|localStorage|document\.cookie/);
});

// a tiny page: fetch, sessionStorage, location and visibilitychange are mocks
function page({ have = 'A', live = 'B', search = '', store = new Map(), storageThrows = false, playing = false, focus = null } = {}) {
  const calls = { fetch: [], reload: 0 }, listeners = {};
  const doc = {
    visibilityState: 'visible', activeElement: focus,
    querySelectorAll: () => [{ paused: !page.state.playing, ended: false }],
    addEventListener: (t, f) => { (listeners[t] = listeners[t] || []).push(f); }
  };
  page.state = { playing };
  const sessionStorage = {
    getItem: k => { if (storageThrows) throw new Error('blocked'); return store.has(k) ? store.get(k) : null; },
    setItem: (k, v) => { if (storageThrows) throw new Error('blocked'); store.set(k, String(v)); }
  };
  const window = { FF_BUILD: have };
  const ctx = vm.createContext({
    window, document: doc, sessionStorage, Date,
    location: { search, reload: () => { calls.reload++; } },
    fetch: (url, o) => { calls.fetch.push([url, o]); return Promise.resolve({ ok: true, json: () => Promise.resolve({ build: live }) }); }
  });
  vm.runInContext(SRC, ctx);
  const settle = () => new Promise(r => setTimeout(r, 10));
  const show = async () => { (listeners.visibilitychange || []).forEach(f => f()); await settle(); };
  return { calls, store, settle, show, window };
}

test('a newer published build reloads the page once; the next load of the same stale copy does not loop', async () => {
  const store = new Map();
  const p1 = page({ store }); await p1.settle();
  assert.equal(p1.calls.fetch.length, 1);
  assert.match(p1.calls.fetch[0][0], /^version\.json\?t=\d+$/); assert.equal(JSON.stringify(p1.calls.fetch[0][1]), '{"cache":"no-store"}');
  assert.equal(p1.calls.reload, 1);
  const p2 = page({ store }); await p2.settle(); await p2.show();   // the reload came back stale (cached index.html)
  assert.equal(p2.calls.reload, 0, 'no second reload for the same build');
  const p3 = page({ store, live: 'C' }); await p3.settle();        // a later publish: one more reload
  assert.equal(p3.calls.reload, 1);
});

test('the same build, ?nostamp, or blocked storage: no reload', async () => {
  const same = page({ live: 'A' }); await same.settle(); assert.equal(same.calls.reload, 0);
  const off = page({ search: '?nostamp=1' }); await off.settle(); assert.deepEqual([off.calls.fetch.length, off.calls.reload], [0, 0]);
  const blocked = page({ storageThrows: true }); await blocked.settle(); assert.equal(blocked.calls.reload, 0, 'no guard, no reload');
});

test('never while a video plays or a form field has focus; it tries again when the tab comes back', async () => {
  const p = page({ playing: true }); await p.settle();
  assert.equal(p.calls.reload, 0, 'a video is playing');
  page.state.playing = false; await p.show();
  assert.equal(p.calls.reload, 1, 'reloaded on the next visit back to the tab');
  const f = page({ focus: { tagName: 'INPUT' } }); await f.settle();
  assert.equal(f.calls.reload, 0, 'a field has focus');
});
