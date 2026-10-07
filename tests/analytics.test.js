// Website statistics (analytics.js + analytics-config.js + tools/set-analytics-config.mjs): privacy guarantees first.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const SITE = '0b6f6b2e-3c55-4a8e-9a77-2f1f1c6f0a11';
const GOOD = { url: 'https://ff-stats.dvolcore.com', siteId: SITE };

// ---- a minimal DOM: elements with attributes, parents and closest() for the simple selectors analytics.js uses
function matches(el, sel) {
  return sel.split(',').map(s => s.trim()).some(s => {
    const m = /^([a-z]+)?((?:\.[a-z0-9-]+)*)((?:\[[^\]]+\])*)$/i.exec(s);
    if (!m) throw new Error('selector not supported by the test DOM: ' + s);
    if (m[1] && el.tagName !== m[1].toUpperCase()) return false;
    for (const c of (m[2] || '').split('.').filter(Boolean)) if (!el.classList.includes(c)) return false;
    for (const a of (m[3] || '').match(/\[[^\]]+\]/g) || []) {
      const am = /^\[([a-z0-9-]+)(?:(\^?=)"([^"]*)")?\]$/i.exec(a);
      const v = el.getAttribute(am[1]);
      if (v === null) return false;
      if (am[2] === '=' && v !== am[3]) return false;
      if (am[2] === '^=' && !v.startsWith(am[3])) return false;
    }
    return true;
  });
}
function el(tag, attrs = {}, parent = null, props = {}) {
  const a = { ...attrs };
  const e = {
    tagName: tag.toUpperCase(), parent, classList: String(a.class || '').split(/\s+/).filter(Boolean),
    getAttribute: k => (k in a ? String(a[k]) : null), hasAttribute: k => k in a, setAttribute: (k, v) => { a[k] = String(v); },
    closest(sel) { let n = e; while (n) { if (matches(n, sel)) return n; n = n.parent; } return null; },
    ...props,
  };
  e.dataset = {};
  for (const k of Object.keys(a)) if (k.startsWith('data-')) e.dataset[k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = String(a[k]);
  return e;
}
function store() {
  const m = new Map(); const writes = [];
  return { writes, getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { writes.push(k); m.set(k, String(v)); }, removeItem: k => m.delete(k) };
}

// ---- a sandbox page that mirrors the real router: views.js go() renders and history.replaceState()s the hash, premium.js wraps
// it with history.pushState(), and its hashchange / popstate handlers route through go() (as the live site does). The history
// API changes the address without firing any event, exactly like a browser. Optionally loads the real intake.js first.
const TITLES = { post: 'Jane Doe and her son Mia: a family story', job: 'Job opening | Futures Friends' };
function page({ cfg = GOOD, hash = '', search = '', referrer = '', nav = {}, win = {}, routes, intake } = {}) {
  const calls = [];
  const listeners = {};
  const V = {};
  for (const r of routes || ['home', 'enroll', 'contact', 'job', 'post', 'privacy', 'friends', 'bop-at-home', 'store', 'portal', 'family-portal', 'academy', 'learn', 'learn-course', 'verify']) V[r] = () => '';
  const on = (key, fn) => { (listeners[key] = listeners[key] || []).push(fn); };
  const fire = (type, ev) => (listeners[type] || []).slice().forEach(fn => fn(ev));
  const sandbox = {
    console, URL, URLSearchParams, JSON, Date, Math, Number, Object, String, Set, WeakSet, WeakMap, Map, Promise, AbortController, FormData, File,
    V, KEYS: [], phero: () => '', card: () => '', PHONE: '(816) 988-5661', EMAIL: 'info@example.org',
    D: { catalog: [{ item: 'Booker plush' }, { item: 'Rainbow carpet' }] },
    FF_ANALYTICS: cfg,
    FFRouteMeta: { ROUTES: { home: ['Futures Friends', ''], post: ['Blog article', ''], job: ['Job opening', ''], enroll: ['Visit Futures Learning Center', ''] } },
    location: { hash, search, hostname: 'dvolcore.github.io' },
    navigator: { language: 'en-US', ...nav },
    screen: { width: 1512, height: 982 },
    innerHeight: 800, scrollY: 0,
    localStorage: store(), sessionStorage: store(),
    setTimeout: (fn, ms) => (ms ? setTimeout(fn, ms) : fn()), clearTimeout,
    crypto: require('node:crypto').webcrypto,
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } },
    addEventListener: (t, fn) => on('win:' + t, fn),
    document: {
      title: 'Futures Friends', referrer,
      documentElement: { scrollHeight: 4000 },
      addEventListener: (t, fn) => on(t, fn),
      dispatchEvent: ev => fire(ev.type, ev),
      querySelectorAll: () => [], querySelector: () => null, getElementById: () => null, createElement: () => ({}), head: { appendChild() {} },
    },
    ...win,
  };
  sandbox.window = sandbox;
  const routes2 = intake && intake.routes || {};
  sandbox.fetch = async (url, init = {}) => {
    if (intake && intake.url && url.startsWith(intake.url)) {
      const pth = url.slice(intake.url.length);
      const h = routes2[`${init.method} ${pth}`];
      if (!h) throw new TypeError('network down');
      const r = h();
      return { status: r.status, headers: { get: () => null }, json: async () => r.body };
    }
    calls.push({ url, init, body: JSON.parse(init.body) });
    return { ok: true };
  };
  const setHash = u => { const i = String(u).indexOf('#'); sandbox.location.hash = i >= 0 ? String(u).slice(i) : ''; };
  sandbox.history = { pushState: (_, __, u) => setHash(u), replaceState: (_, __, u) => setHash(u) };
  // views.js
  const viewsGo = (v, a) => { if (!V[v]) v = 'home'; sandbox.document.title = TITLES[v] || v + ' | Futures Friends'; sandbox.history.replaceState(null, '', '#' + v + (a ? '/' + a : '')); };
  sandbox.go = viewsGo;
  sandbox.FFstart = () => { const h0 = sandbox.location.hash.replace('#', '').split('/'); sandbox.go(V[h0[0]] ? h0[0] : 'home', h0[1]); };
  // premium.js
  let navigatingHistory = false;
  const realGo = sandbox.go;
  sandbox.go = function (v, a) { const old = sandbox.location.hash || '#home'; const target = '#' + (V[v] ? v : 'home') + (a ? '/' + a : ''); if (!navigatingHistory && old !== target) sandbox.history.pushState(null, '', target); return realGo(v, a); };
  const fromHistory = () => { navigatingHistory = true; const parts = sandbox.location.hash.slice(1).split('/'); sandbox.go(parts[0] || 'home', parts[1]); navigatingHistory = false; };
  on('win:popstate', fromHistory);
  on('win:hashchange', fromHistory);
  vm.createContext(sandbox);
  if (intake) {
    sandbox.window.FF_INTAKE = { url: intake.url };
    vm.runInContext(read('intake.js'), sandbox, { filename: 'intake.js' });
  }
  vm.runInContext(read('analytics.js'), sandbox, { filename: 'analytics.js' });
  return {
    sandbox, calls, listeners, fire,
    start: () => sandbox.FFstart(),
    go: (v, a) => sandbox.go(v, a),
    typeHash: h => { sandbox.location.hash = h; fire('win:hashchange', {}); },     // the visitor edits the address bar
    back: h => { sandbox.location.hash = h; fire('win:popstate', {}); },          // the Back button
    click: target => fire('click', { target }),
    sent: () => calls.map(c => c.body.payload),
    events: () => calls.map(c => c.body.payload).filter(p => p.name),
    views: () => calls.map(c => c.body.payload).filter(p => !p.name),
  };
}

function exercise(p) {
  p.start();
  p.go('enroll'); p.go('job', 'abc-123'); p.go('nope');
  p.click(el('button', { 'data-go': 'contact', class: 'btn gold' }));
  p.sandbox.ffTrack('cta_click', { to: 'enroll' });
  p.fire('ff:intake', { detail: { kind: 'tour', outcome: 'ok' } });
  p.fire('focusin', { target: el('input', {}, el('form', { id: 'ffiContact' })) });
  p.fire('play', { type: 'play', target: el('video', { id: 'ep1' }, null, { duration: 100, currentTime: 0 }) });
}

// ------------------------------------------------------------------------------------------------ the guarantees
test('unconfigured (empty, partial or unsafe config): zero requests, nothing stored, ffTrack is a no-op', () => {
  for (const cfg of [null, {}, { url: '', siteId: '' }, { url: 'https://ff-stats.dvolcore.com', siteId: '' }, { url: '', siteId: SITE },
    { url: 'https://ff-stats.dvolcore.com', siteId: 'not-a-uuid' }, { url: 'http://stats.example.com', siteId: SITE }, { url: 'javascript:alert(1)', siteId: SITE }]) {
    const p = page({ cfg, search: '?utm_source=tiktok' });
    exercise(p);
    assert.equal(p.calls.length, 0, String(JSON.stringify(cfg)));
    assert.equal(p.sandbox.ffTrack('anything', { a: 1 }), false);
    assert.equal(p.sandbox.ffTrack.enabled(), false);
    assert.deepEqual(p.sandbox.sessionStorage.writes, [], 'no campaign tag is stored either');
    assert.deepEqual(Object.keys(p.listeners).filter(k => !k.startsWith('win:')), ['click'], 'only the Privacy-page switch is listened to');
    assert.deepEqual(Object.keys(p.listeners).filter(k => k.startsWith('win:')).sort(), ['win:hashchange', 'win:popstate'], 'the router\'s own listeners only');
  }
});

test('the committed analytics-config.js is unconfigured, and the local override loads only on localhost', () => {
  const run = hostname => { const w = []; const window = {}; vm.runInNewContext(read('analytics-config.js'), { window, location: { hostname }, document: { write: s => w.push(s) } }); return { window, w }; };
  const live = run('dvolcore.github.io');
  assert.deepEqual({ ...live.window.FF_ANALYTICS }, { url: '', siteId: '' });
  assert.equal(live.w.length, 0);
  assert.match(run('127.0.0.1').w.join(''), /analytics-config\.local\.js/);
  assert.match(read('.gitignore'), /^analytics-config\.local\.js$/m);
});

test('Do Not Track and Global Privacy Control: zero requests and nothing stored', () => {
  for (const sig of [{ nav: { doNotTrack: '1' } }, { nav: { globalPrivacyControl: true } }, { win: { doNotTrack: '1' } }, { nav: { msDoNotTrack: '1' } }, { nav: { doNotTrack: 'yes' } }]) {
    const p = page({ ...sig, search: '?utm_source=tiktok&utm_medium=social' });
    exercise(p);
    assert.equal(p.calls.length, 0, JSON.stringify(sig));
    assert.deepEqual(p.sandbox.sessionStorage.writes, []);
  }
  const p = page({ nav: { doNotTrack: '0', globalPrivacyControl: false } });
  p.start();
  assert.equal(p.calls.length, 1, 'DNT=0 / GPC=false do not block');
});

test('the visitor\'s own switch turns everything off', () => {
  const p = page();
  p.start();
  p.sandbox.ffTrack.optOut();
  exercise(p);
  assert.equal(p.calls.length, 1, 'only the pageview before the switch');
  assert.equal(p.sandbox.localStorage.getItem('ff-analytics-off'), '1');
  const q = page({ win: { localStorage: (() => { const s = store(); s.setItem('ff-analytics-off', '1'); return s; })() } });
  exercise(q);
  assert.equal(q.calls.length, 0, 'remembered on the next visit');
});

test('hash routes are sent as the route name only: ids, queries and unknown routes never leave the page', () => {
  const p = page({ hash: '#job/abc-123?email=jane@example.org', search: '?name=Jane+Doe&utm_source=TikTok&utm_medium=Social&utm_campaign=fall_open_house&fbclid=XYZ123' });
  p.start();
  p.go('post', 'ratios');
  p.go('job', 'senior-teacher-42');
  p.go('enroll');
  p.sandbox.location.hash = '#bop-at-home/x?ref=FF-ABCD-2345';
  p.go('bop-at-home', 'x?ref=FF-ABCD-2345');
  const urls = p.views().map(v => v.url);
  assert.deepEqual(urls, ['/job?utm_source=tiktok&utm_medium=social&utm_campaign=fall_open_house', '/post', '/job', '/enroll', '/bop-at-home']);
  const all = JSON.stringify(p.calls.map(c => c.body));
  for (const leak of ['abc-123', 'jane', 'Jane', 'ratios', 'senior-teacher', 'FF-ABCD', 'fbclid', 'XYZ123', 'example.org']) assert.ok(!all.includes(leak), leak);
  // an unknown route: one route_404 event, the id itself is not sent
  const q = page({ hash: '#<script>alert(1)' });
  q.start();
  q.go('no-such-page');
  assert.deepEqual(q.events().map(e => e.name), ['route_404', 'route_404'], 'the second 404 lands on the page already shown and still counts');
  assert.equal(q.views().length, 1);
  assert.ok(!JSON.stringify(q.calls).includes('script') && !JSON.stringify(q.calls).includes('no-such-page'));
  const { routeOf } = p.sandbox.ffTrack._t;
  assert.equal(routeOf('#job/123'), 'job');
  assert.equal(routeOf(''), 'home');
  assert.equal(routeOf('#JOB'), 'job');
  assert.equal(routeOf('#job?x=1'), 'job');
  assert.equal(routeOf('#access_token=abc'), null);
  assert.equal(routeOf('#../../etc'), null);
});

test('no personal data in payloads: personal keys and values are dropped, form events carry kind + outcome only', () => {
  const p = page({ referrer: 'https://www.tiktok.com/@futuresfriends/video/123456789?lang=en' });
  p.start();
  p.sandbox.ffTrack('cta_click', { email: 'a@b.co', name: 'Jane', first_name: 'Jane', phone: '8165551234', child: 'Mia', kid_name: 'Mia', age: 4,
    note: 'hi', message: 'hello', ref: 'FF-ABCD-2345', token: 't', user_id: 'u1', label: 'Book a tour', to: 'enroll', extra: 'call 816-555-1234',
    link: 'https://x.y/?a=1', path: '/x?email=a', site: 'www.evil.example', count: 3 });
  p.fire('ff:intake', { detail: { kind: 'tour', outcome: 'ok', email: 'a@b.co', name: 'Jane' } });
  p.fire('ff:intake', { detail: { kind: 'subscribe', outcome: 'invalid' } });
  const ev = p.events();
  assert.deepEqual({ ...ev[0].data }, { label: 'Book a tour', to: 'enroll', count: 3 });
  assert.deepEqual({ ...ev[1].data }, { form: 'tour', result: 'ok', from: 'home' });
  assert.equal(ev[1].name, 'form_submit');
  assert.equal(ev[2].name, 'bop_subscribe');
  assert.equal(p.views()[0].referrer, 'https://www.tiktok.com/', 'referrer: the other site\'s origin only');
  const PII = /@|Jane|Mia|555|FF-ABCD|8165551234|futuresfriends\/video/;
  for (const c of p.calls) {
    assert.doesNotMatch(JSON.stringify(c.body), PII);
    assert.deepEqual(Object.keys(c.body.payload).filter(k => !['website', 'hostname', 'url', 'language', 'screen', 'title', 'referrer', 'name', 'data'].includes(k)), []);
    for (const k of Object.keys(c.body.payload.data || {})) assert.doesNotMatch(k, p.sandbox.ffTrack._t.PII_KEY);
    assert.equal(c.init.credentials, 'omit');
    assert.equal(c.init.referrerPolicy, 'no-referrer');
    assert.equal(c.url, 'https://ff-stats.dvolcore.com/api/send');
    assert.equal(c.body.payload.website, SITE);
    assert.equal(c.body.payload.screen, '1500x1000', 'screen size rounded to hundreds');
    assert.equal(c.body.payload.language, 'en');
  }
  assert.equal(p.sandbox.ffTrack('Bad Name!', {}), false);
  assert.equal(p.sandbox.ffTrack('x'.repeat(60), {}), false);
});

test('portal, academy and LMS views send nothing at all, and counting resumes on public pages', () => {
  const p = page({ hash: '#portal' });
  p.start();
  for (const [r, a] of [['family-portal'], ['academy'], ['learn'], ['learn-course', 'course-uuid'], ['verify', 'CERT-1234']]) {
    p.go(r, a);
    p.click(el('button', { 'data-go': 'home' }));
    p.click(el('a', { href: 'https://example.com/x' }));
    p.fire('focusin', { target: el('input', {}, el('form', { id: 'lmsForm' })) });
    p.fire('play', { type: 'play', target: el('video', { 'data-lms-video': '' }, null, { duration: 10, currentTime: 0 }) });
    p.fire('ff:intake', { detail: { kind: 'status', outcome: 'ok' } });
    assert.equal(p.sandbox.ffTrack('anything', {}), false);
  }
  assert.equal(p.calls.length, 0);
  p.go('home');
  assert.deepEqual(p.views().map(v => v.url), ['/home']);
  for (const r of ['portal', 'family-portal', 'academy', 'learn', 'learn-course', 'learn-cert', 'learn-team', 'learn-author', 'verify']) assert.ok(p.sandbox.ffTrack._t.EXCLUDED.has(r), r);
});

test('campaign tags: first touch in sessionStorage only, sanitized, attached to events', () => {
  const p = page({ search: '?utm_source=Instagram&utm_medium=social&utm_campaign=Bop%20Week%201&utm_content=reel<b>&utm_term=8165551234' });
  p.start();
  p.sandbox.ffTrack('cta_click', { to: 'enroll' });
  assert.deepEqual(JSON.parse(p.sandbox.sessionStorage.getItem('ff-utm')), { source: 'instagram', medium: 'social', campaign: 'bop-week-1', content: 'reel-b' });
  assert.deepEqual(p.sandbox.localStorage.writes, [], 'never localStorage');
  const d = p.events()[0].data;
  assert.equal(d.utm_source, 'instagram');
  assert.equal(d.utm_campaign, 'bop-week-1');
  assert.equal(d.utm_term, undefined, 'a phone-number-like tag is dropped');
  // a later page load in the same tab keeps the first campaign
  const q = page({ search: '?utm_source=youtube', win: { sessionStorage: p.sandbox.sessionStorage } });
  q.start();
  q.sandbox.ffTrack('x_y', {});
  assert.equal(q.events()[0].data.utm_source, 'instagram');
  assert.equal(q.views()[0].url, '/home?utm_source=youtube', 'the landing pageview carries this visit\'s own campaign');
});

test('event taxonomy: CTA, nav, outbound, contact, download, store, video, story, form start, scroll depth', () => {
  const p = page({ hash: '#store' });
  p.start();
  const header = el('header'); const footer = el('footer');
  p.click(el('button', { 'data-go': 'enroll', class: 'btn gold' }));
  p.click(el('button', { 'data-nav': '', 'data-go': 'friends' }, el('nav', {}, header)));
  p.click(el('button', { 'data-go': 'privacy' }, footer));
  p.click(el('a', { href: 'https://www.instagram.com/futuresfriends?igsh=abc' }));
  p.click(el('a', { href: 'https://dvolcore.github.io/futures-friends/#home' }));
  p.click(el('a', { href: 'tel:+18169885661' }));
  p.click(el('a', { href: 'mailto:info@futureslearningcenter.com' }));
  p.click(el('a', { href: 'img/coloring/booker-page.pdf' }));
  p.click(el('a', { href: 'blob:https://x/1', download: 'futures-friends-family-plan.txt' }));
  p.click(el('button', { 'data-track': 'store_add', 'data-track-item': 'Booker plush', 'data-track-email': 'a@b.co' }));
  p.fire('change', { target: el('input', { 'data-q': '1' }, null, { value: '2' }) });
  const v = el('video', { id: 'episode-1' }, null, { duration: 200, currentTime: 0 });
  p.fire('play', { type: 'play', target: v });
  p.fire('play', { type: 'play', target: v });
  v.currentTime = 110; p.fire('timeupdate', { type: 'timeupdate', target: v });
  p.fire('ended', { type: 'ended', target: v });
  p.fire('play', { type: 'play', target: el('video', { autoplay: '', muted: '', loop: '' }, null, { autoplay: true, muted: true, loop: true }) });
  const f = el('form', { id: 'wcBop' });
  p.fire('focusin', { target: el('input', {}, f) });
  p.fire('focusin', { target: el('input', {}, f) });
  const book = el('div', { class: 'ffb', 'aria-label': 'Peek inside What Happens If We Try?', 'aria-expanded': 'true' });
  p.click(book);
  p.sandbox.scrollY = 3300; p.listeners['win:scroll'][0]();
  const got = p.events().map(e => [e.name, { ...e.data }]);
  assert.deepEqual(got, [
    ['cta_click', { to: 'enroll', from: 'store', place: 'page' }],
    ['nav_click', { to: 'friends', from: 'store', place: 'header' }],
    ['nav_click', { to: 'privacy', from: 'store', place: 'footer' }],
    ['outbound_click', { domain: 'instagram.com', from: 'store' }],
    ['contact_click', { method: 'phone', from: 'store' }],
    ['contact_click', { method: 'email', from: 'store' }],
    ['download', { file: 'booker-page.pdf', type: 'pdf', from: 'store' }],
    ['download', { file: 'futures-friends-family-plan.txt', type: 'txt', from: 'store' }],
    ['store_add', { from: 'store', item: 'Booker plush' }],
    ['store_cart', { item: 'Rainbow carpet', qty: 2, action: 'set' }],
    ['video_play', { video: 'episode-1', from: 'store' }],
    ['video_progress', { video: 'episode-1', pct: 25, from: 'store' }],
    ['video_progress', { video: 'episode-1', pct: 50, from: 'store' }],
    ['video_progress', { video: 'episode-1', pct: 75, from: 'store' }],
    ['video_progress', { video: 'episode-1', pct: 100, from: 'store' }],
    ['form_start', { form: 'wcBop', from: 'store' }],
    ['story_open', { book: 'What Happens If We Try?', from: 'store' }],
    ['scroll_depth', { pct: 25 }], ['scroll_depth', { pct: 50 }], ['scroll_depth', { pct: 75 }], ['scroll_depth', { pct: 100 }],
  ]);
  for (const e of p.events()) assert.equal(e.url, '/store');
});

// ------------------------------------------------------------------------------------------------ wiring + go-live tool
test('index.html loads the config with the other configs and analytics.js last, before FFstart', () => {
  const html = read('index.html');
  assert.match(html, /<script src="intake-config\.js\?v=\d+"><\/script>\s*<script src="analytics-config\.js\?v=\d+"><\/script>/);
  assert.match(html, /<script src="analytics\.js\?v=\d+"><\/script>\s*<script>window\.FFstart && window\.FFstart\(\);<\/script>/);
  assert.doesNotMatch(html + read('analytics.js'), /googletagmanager|gtag\(|google-analytics|facebook\.net|fbq\(|plausible\.io|hotjar|clarity\.ms|tiktok\.com\/i18n\/pixel/i);
});

test('intake.js reports the form kind and outcome only', () => {
  const src = read('intake.js');
  assert.match(src, /new CustomEvent\('ff:intake', \{ detail: \{ kind, outcome: outcome\(r\) \} \}\)/);
});

test('Privacy and Child privacy pages describe the statistics and offer the switch', () => {
  const src = read('views.js');
  assert.match(src, /'Website statistics','We count visits to this website with our own analytics server/);
  assert.match(src, /data-ff-analytics-toggle/);
  assert.match(src, /Do Not Track or Global Privacy Control/);
  assert.match(src, /as the COPPA Rule allows/);
});

test('set-analytics-config.mjs writes only https://ff-stats.dvolcore.com and a UUID', async () => {
  const { apply } = await import(path.join(ROOT, 'tools', 'set-analytics-config.mjs'));
  const src = read('analytics-config.js');
  const out = apply(src, { analytics: { url: 'https://ff-stats.dvolcore.com/', siteId: SITE.toUpperCase() } });
  assert.match(out, new RegExp(`window\\.FF_ANALYTICS = \\{ url: 'https://ff-stats\\.dvolcore\\.com', siteId: '${SITE}' \\}; // @generated`));
  assert.equal(out.split('\n').length, src.split('\n').length, 'one line changes');
  for (const bad of [{ url: 'http://ff-stats.dvolcore.com', siteId: SITE }, { url: 'https://evil.example', siteId: SITE }, { url: 'https://ff-stats.dvolcore.com/x', siteId: SITE },
    { url: 'https://ff-stats.dvolcore.com', siteId: 'abc' }, { url: 'https://ff-stats.dvolcore.com?x=1', siteId: SITE }, {}]) {
    assert.throws(() => apply(src, { analytics: bad }), JSON.stringify(bad));
  }
  assert.throws(() => apply('window.FF_ANALYTICS = {};', { analytics: { url: 'https://ff-stats.dvolcore.com', siteId: SITE } }), /not found/);
});

// ------------------------------------------------------------------------------------------------ review follow-ups
test('the Privacy-page switch is inert under Do Not Track / GPC (nothing stored) and stays in sync on every route', () => {
  for (const sig of [{ doNotTrack: '1' }, { globalPrivacyControl: true }]) {
    const btn = el('button', { 'data-ff-analytics-toggle': '' }, null, { textContent: '' });
    const p = page({ nav: sig, win: {} });
    p.sandbox.document.querySelectorAll = sel => (sel === '[data-ff-analytics-toggle]' ? [btn] : []);
    p.start();
    p.go('privacy');
    p.click(btn); p.click(btn);
    assert.deepEqual(p.sandbox.localStorage.writes, [], JSON.stringify(sig));
    assert.deepEqual(p.sandbox.sessionStorage.writes, []);
    assert.equal(p.calls.length, 0);
    assert.match(btn.textContent, /asks sites not to track/);
    assert.equal(btn.getAttribute('aria-pressed'), 'true');
  }
  // unconfigured site: the switch still works and its label follows each route change
  const btn = el('button', { 'data-ff-analytics-toggle': '' }, null, { textContent: '' });
  const p = page({ cfg: { url: '', siteId: '' } });
  p.sandbox.document.querySelectorAll = sel => (sel === '[data-ff-analytics-toggle]' ? [btn] : []);
  p.start(); p.go('privacy');
  assert.match(btn.textContent, /^Turn off/);
  p.click(btn);
  assert.equal(p.sandbox.localStorage.getItem('ff-analytics-off'), '1');
  btn.textContent = 'stale render'; p.go('home'); p.go('privacy');
  assert.match(btn.textContent, /are off on this browser/, 're-synced after navigation');
  assert.equal(p.calls.length, 0);
});

test('page titles: the route\'s static title only, never document.title (a blog post or job title can name a person)', () => {
  const p = page();
  p.start();
  p.go('post', 'family-story');
  p.go('job', 'lead-teacher');
  p.go('contact');                                               // no static title known: none sent
  p.sandbox.ffTrack('cta_click', { to: 'enroll' });
  assert.equal(p.sandbox.document.title, 'contact | Futures Friends');
  const titles = p.sent().map(x => x.title);
  assert.deepEqual(titles, ['Futures Friends', 'Blog article', 'Job opening', undefined, undefined]);
  assert.doesNotMatch(JSON.stringify(p.calls), /Jane|Mia|family story/);
});

test('the real router: address-bar edits (hashchange) and Back (popstate) count once each; history API changes are seen through go()', () => {
  const p = page();
  p.start();                                  // /home
  p.click(el('button', { 'data-go': 'enroll' }));
  p.go('enroll');                             // what the click does in views.js: pushState via premium.js
  p.typeHash('#friends');                     // hashchange -> premium.js -> go(); analytics' own hashchange safety net is a duplicate
  p.typeHash('#job/123?email=jane@example.org');
  p.back('#enroll');                          // popstate -> go()
  p.typeHash('#nope');                        // unknown route typed in: 404 counted, shown as home
  assert.deepEqual(p.views().map(v => v.url), ['/home', '/enroll', '/friends', '/job', '/enroll', '/home']);
  assert.deepEqual(p.events().map(e => e.name), ['cta_click', 'route_404']);
  assert.doesNotMatch(JSON.stringify(p.calls), /jane|123/);
});

test('stored campaign tags are re-checked (the github.io origin is shared with other sites)', () => {
  const ss = store();
  ss.setItem('ff-utm', JSON.stringify({ source: 'jane@example.org', medium: 'Social', campaign: '816-555-1234', content: 'ok post', term: { x: 1 } }));
  const p = page({ win: { sessionStorage: ss } });
  p.start();
  p.sandbox.ffTrack('cta_click', { to: 'enroll' });
  const d = p.events()[0].data;
  assert.deepEqual([d.utm_source, d.utm_medium, d.utm_campaign, d.utm_content, d.utm_term], [undefined, 'social', undefined, 'ok-post', undefined]);
  const bad = store(); bad.setItem('ff-utm', '{not json');
  const q = page({ win: { sessionStorage: bad }, search: '?utm_source=youtube' });
  q.start(); q.sandbox.ffTrack('x_y', {});
  assert.equal(q.events()[0].data.utm_source, 'youtube', 'garbage is replaced by this visit\'s tags');
  const r = page({ search: '?utm_source=jane%40example.org&utm_medium=email' });
  r.start();
  assert.equal(r.views()[0].url, '/home?utm_medium=email', 'an address in a tag is dropped whole');
});

test('landing campaign tags are read once at start, even if the address bar is rewritten before the first view', () => {
  const p = page({ search: '?utm_source=tiktok&utm_medium=social' });
  p.sandbox.location.search = '';             // e.g. hub-backend.js tidying the address bar before FFstart
  p.start();
  assert.equal(p.views()[0].url, '/home?utm_source=tiktok&utm_medium=social');
});

test('intake.js + analytics.js together: each submission reports its kind and outcome, never a field value', async () => {
  const off = page({ intake: { url: '' } });
  off.start();
  const r0 = await off.sandbox.FFIntake.submit('tour', { name: 'Jane Doe', email: 'jane@example.org', phone: '8165551234' });
  assert.equal(r0.unavailable, true);
  const gw = 'http://gw.test';
  const routes = { 'GET /v1/form-token': () => ({ status: 200, body: { token: '1.abc', minFillSeconds: 0.001 } }),
    'POST /v1/inquiry': () => ({ status: 202, body: { ref: 'FF-ABCD-2345', emailConfirmation: 'queued', replyBusinessDays: 2 } }) };
  const on = page({ intake: { url: gw, routes } });
  on.start();
  const r1 = await on.sandbox.FFIntake.submit('subscribe', { email: 'jane@example.org', firstName: 'Jane', ageBand: '3-4' });
  assert.equal(r1.ok, true);
  routes['POST /v1/inquiry'] = () => ({ status: 422, body: { errors: { email: 'bad' } } });
  await on.sandbox.FFIntake.submit('contact', { name: 'Jane Doe', email: 'x' });
  routes['POST /v1/inquiry'] = () => { throw new TypeError('down'); };
  delete routes['POST /v1/inquiry'];
  await on.sandbox.FFIntake.submit('tour', { name: 'Jane Doe' });
  const got = [...off.events(), ...on.events()].map(e => [e.name, e.data.form, e.data.result]);
  assert.deepEqual(got, [['form_submit', 'tour', 'unavailable'], ['bop_subscribe', 'subscribe', 'ok'], ['form_submit', 'contact', 'invalid'], ['form_submit', 'tour', 'network']]);
  assert.doesNotMatch(JSON.stringify([...off.calls, ...on.calls]), /Jane|jane|8165551234|FF-ABCD|3-4/);
});
