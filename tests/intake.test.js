const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

// Loads intake.js against a scripted gateway. `routes` maps "METHOD /path" to a function(request) -> {status, body}.
function load({ url = 'http://gw.test', routes = {} } = {}) {
  const calls = [];
  const fetch = async (u, init = {}) => {
    const p = u.replace(url, '');
    calls.push({ method: init.method, path: p, headers: init.headers || {}, body: init.body });
    const handler = routes[`${init.method} ${p.split('?')[0]}`] || routes[`${init.method} ${p}`];
    if (!handler) throw new TypeError('network down');
    const r = await handler({ init, path: p });
    return { status: r.status, headers: { get: k => (r.headers || {})[k] || null }, json: async () => { if (r.body === undefined) throw new Error('no body'); return r.body; } };
  };
  const context = vm.createContext({
    console, setTimeout, clearTimeout, AbortController, FormData, File, fetch, URLSearchParams,
    V: {}, KEYS: [], phero: () => '', card: () => '', PHONE: '(816) 988-5661', EMAIL: 'info@example.org',
    window: { FF_INTAKE: url === null ? undefined : { url }, crypto: require('node:crypto').webcrypto },
    document: { getElementById: () => null, createElement: () => ({}), head: { appendChild() {} }, addEventListener() {}, querySelector: () => null },
  });
  vm.runInContext(read('intake.js'), context, { filename: 'intake.js' });
  return { api: context.window.FFIntake, context, calls };
}

const tokenRoute = { 'GET /v1/form-token': () => ({ status: 200, body: { token: '1.abc', minFillSeconds: 0.001 } }) };
const accepted = { status: 202, body: { ref: 'FF-ABCD-2345', status: 'received', emailConfirmation: 'queued', replyBusinessDays: 2, duplicate: false } };

test('with no gateway configured nothing is sent and the forms say so honestly', async () => {
  for (const url of ['', '   ', 'ftp://x', 'not a url']) {
    const { api, calls } = load({ url });
    assert.equal(api.enabled(), false, JSON.stringify(url));
    const refused = await api.submit('contact', { name: 'A B' });
    assert.deepEqual([refused.ok, refused.unavailable, refused.message], [false, true, 'Online requests are not open yet.']);
    assert.equal((await api.status('FF-ABCD-2345', 'a@b.co')).unavailable, true);
    assert.equal((await api.jobs()).unavailable, true);
    assert.equal(calls.length, 0, 'no request may leave the page');
  }
  const { api } = load({ url: '' });
  const html = api.soon('tour requests');
  assert.match(html, /Online requests open soon/);
  assert.match(html, /tel:\+18169885661/);
  assert.match(html, /mailto:info@example\.org/);
  assert.match(api.contactHtml('contact'), /Online requests open soon/);
  assert.doesNotMatch(api.contactHtml('contact'), /<form/);
});

test('a missing FF_INTAKE object is the same as an empty url', () => {
  const { api } = load({ url: null });
  assert.equal(api.enabled(), false);
});

test('success needs the 202 and returns the reference number', async () => {
  const { api, calls } = load({ routes: { ...tokenRoute, 'POST /v1/inquiry': () => accepted } });
  const r = await api.submit('contact', { name: 'Jane Doe', email: 'j@d.co', message: 'hi' });
  assert.deepEqual({ ok: r.ok, ref: r.ref, days: r.days, emailConfirmation: r.emailConfirmation }, { ok: true, ref: 'FF-ABCD-2345', days: 2, emailConfirmation: 'queued' });
  const post = calls.find(c => c.method === 'POST');
  const sent = JSON.parse(post.body);
  assert.equal(sent.kind, 'contact');
  assert.equal(sent.token, '1.abc');
  assert.match(post.headers['Idempotency-Key'], /^[A-Za-z0-9_-]{8,64}$/);
  assert.equal(post.headers['Content-Type'], 'application/json');
});

test('validation errors, network errors, rate limits and server errors each get an honest message and never look like success', async () => {
  const cases = [
    [{ status: 422, body: { error: 'validation', errors: { email: 'enter a valid email address' } } }, r => { assert.equal(r.ok, false); assert.deepEqual(r.errors, { email: 'enter a valid email address' }); }],
    [{ status: 422, body: { error: 'rejected', message: 'We could not send this form. Please call us instead.' } }, r => { assert.equal(r.ok, false); assert.match(r.message, /call us/); }],
    [{ status: 429, body: { error: 'rate_limited' } }, r => { assert.equal(r.ok, false); assert.match(r.message, /Nothing was sent/); assert.equal(r.network, true); }],
    [{ status: 503, body: { error: 'unavailable' } }, r => { assert.equal(r.ok, false); assert.match(r.message, /Nothing was sent/); }],
    [{ status: 500, body: undefined }, r => { assert.equal(r.ok, false); }],
    [{ status: 413, body: { error: 'too_large' } }, r => { assert.match(r.message, /5 MB/); }],
    [{ status: 403, body: { error: 'origin_not_allowed' } }, r => { assert.equal(r.ok, false); }],
    [{ status: 200, body: { ref: 'FF-ABCD-2345' } }, r => { assert.equal(r.ok, false, 'only 202 is success'); }],
  ];
  for (const [resp, check] of cases) {
    const { api } = load({ routes: { ...tokenRoute, 'POST /v1/inquiry': () => resp } });
    check(await api.submit('contact', { name: 'x y' }));
  }
  const { api } = load({ routes: { ...tokenRoute } });          // the inquiry route does not answer: the network is down
  const r = await api.submit('contact', { name: 'x y' });
  assert.equal(r.ok, false);
  assert.equal(r.network, true);
  assert.match(r.message, /nothing was sent/);
});

test('the same payload keeps its Idempotency-Key across retries; a changed payload gets a new one', async () => {
  let n = 0;
  const { api, calls } = load({ routes: { ...tokenRoute, 'POST /v1/inquiry': () => (++n === 1 ? { status: 503, body: {} } : accepted) } });
  const payload = { name: 'Jane Doe', email: 'j@d.co', message: 'hi' };
  await api.submit('contact', payload);
  await api.submit('contact', payload);
  await api.submit('contact', { ...payload, message: 'changed' });
  const keys = calls.filter(c => c.method === 'POST').map(c => c.headers['Idempotency-Key']);
  assert.equal(keys[0], keys[1], 'a retry after a failure must reuse the key so it can never be filed twice');
  assert.notEqual(keys[1], keys[2]);
});

test('the receipt shows the reference number and escapes everything it is given', () => {
  const { api } = load();
  const html = api.receipt({ title: '<img src=x onerror=alert(1)>', ref: 'FF-ABCD-2345', days: 2, email: '"><script>x</script>@a.co', emailConfirmation: 'queued', lines: ['safe <b>html line</b>'] });
  assert.match(html, /FF-ABCD-2345/);
  assert.match(html, /within 2 business days/);
  assert.doesNotMatch(html, /<img src=x/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /safe <b>html line<\/b>/, 'caller-provided lines are trusted markup, everything else is escaped');
});

test('the confirmation line only claims what the gateway said', () => {
  const { api } = load();
  const base = { title: 't', ref: 'FF-ABCD-2345', days: 1, email: 'a@b.co' };
  assert.match(api.receipt({ ...base, emailConfirmation: 'queued' }), /We are sending a confirmation email/);
  assert.match(api.receipt({ ...base, emailConfirmation: 'suppressed' }), /could not send a confirmation email/);
  assert.doesNotMatch(api.receipt({ ...base, emailConfirmation: 'none' }), /confirmation email/);
  assert.match(api.receipt(base), /within 1 business day\./);
  assert.doesNotMatch(api.receipt({ ...base, emailConfirmation: 'queued' }), /waitlist|accepted|approved/i);
});

test('status maps found and not-found', async () => {
  const { api } = load({ routes: { 'POST /v1/status': ({ init }) => (JSON.parse(init.body).ref === 'FF-ABCD-2345' ? { status: 200, body: { ref: 'FF-ABCD-2345', filed: true, message: 'ok' } } : { status: 404, body: { error: 'not_found' } }) } });
  assert.equal((await api.status('FF-ABCD-2345', 'a@b.co')).status.filed, true);
  const miss = await api.status('FF-ZZZZ-ZZZZ', 'a@b.co');
  assert.equal(miss.ok, false);
  assert.equal(miss.notFound, true);
});

test('jobs are cached for a minute and a closed opening reports closed', async () => {
  let listed = 0;
  const jobs = [{ id: '6ac271da900473d19', title: 'Lead Teacher' }];
  const { api } = load({ routes: {
    'GET /v1/jobs': () => { listed++; return { status: 200, body: { jobs } }; },
    'GET /v1/jobs/6ac000000000000000': () => ({ status: 404, body: { error: 'not_found' } }) } });
  assert.equal((await api.jobs()).jobs.length, 1);
  await api.jobs();
  assert.equal(listed, 1, 'second call served from the cache');
  assert.equal((await api.job('6ac271da900473d19')).job.title, 'Lead Teacher');
  assert.equal((await api.job('6ac000000000000000')).closed, true);
  await api.jobs(true);
  assert.equal(listed, 2, 'force refresh');
});

test('jobs failure is reported, not hidden as an empty list', async () => {
  const { api } = load({ routes: { 'GET /v1/jobs': () => ({ status: 500, body: {} }) } });
  const r = await api.jobs();
  assert.equal(r.ok, false);
  assert.match(r.message, /could not load/);
});

test('application sends multipart with the file, the token and an idempotency key', async () => {
  const { api, calls } = load({ routes: { ...tokenRoute, 'POST /v1/apply': () => accepted } });
  const fd = new FormData();
  fd.set('name', 'Alex Applicant');
  fd.set('resume', new File(['%PDF-1.4 x %%EOF'], 'cv.pdf', { type: 'application/pdf' }));
  const r = await api.apply(fd);
  assert.equal(r.ok, true);
  const post = calls.find(c => c.path === '/v1/apply');
  assert.ok(post.body instanceof FormData);
  assert.equal(post.body.get('token'), '1.abc');
  assert.equal(post.body.get('resume').name, 'cv.pdf');
  assert.equal(post.headers['Content-Type'], undefined, 'the browser must set the multipart boundary itself');
  assert.match(post.headers['Idempotency-Key'], /^[A-Za-z0-9_-]{8,64}$/);
});

test('the site itself no longer fakes a successful submission or keeps requests in the browser', () => {
  for (const file of ['views.js', 'features.js', 'intake.js']) {
    const src = read(file);
    assert.doesNotMatch(src, /save\('ff-(tours|applications|jobs)'/, file);
    assert.doesNotMatch(src, /localStorage\.setItem\('ff-(tours|applications|jobs)/, file);
    assert.doesNotMatch(src, /is on the waitlist/i, file);
    assert.doesNotMatch(src, /Waitlist position<\/span><b>#4/i, file);
    assert.doesNotMatch(src, /\(sample\)/i, file);
  }
  assert.doesNotMatch(read('features.js'), /Application received: added to the waitlist/);
  // The only remaining "demo note" is on the Watch screen-time log, which really is kept on this device. No request form uses it.
  const uses = read('features.js').match(/demoNote\([^)]*\)/g) || [];
  assert.deepEqual(uses.filter(u => !/^demoNote\(extra=''\)$/.test(u)), ["demoNote('The log saves in this browser.')"]);
});

test('the shipped config points only at the production gateway over https and only localhost can load a local override', () => {
  const cfg = read('intake-config.js');
  // release-platform: the hosted gateway (tests/release-config.test.js checks how it is written); never a plain-http address
  assert.match(cfg, /window\.FF_INTAKE = \{ url: '(|https:\/\/ff-intake\.dvolcore\.com)'/);
  assert.match(cfg, /h === 'localhost' \|\| h === '127\.0\.0\.1'/);
  assert.match(fs.readFileSync(path.join(__dirname, '..', '.gitignore'), 'utf8'), /intake-config\.local\.js/);
});

test('index.html loads the intake files in order and links Careers', () => {
  const html = read('index.html');
  const order = ['intake-config.js', 'features.js', 'intake.js', 'extras.js'].map(f => html.indexOf(`<script src="${f}`));
  assert.ok(order.every(i => i > 0), 'all four scripts present');
  assert.deepEqual([...order].sort((a, b) => a - b), order, 'config before features before intake before extras');
  assert.match(html, /data-go="jobs">Careers<\/button>/);
});

test('a weekly-challenge sign-up posts kind subscribe through the same gateway path and returns the reference', async () => {
  const { api, calls } = load({ routes: { ...tokenRoute, 'POST /v1/inquiry': () => ({ status: 202, body: { ref: 'FF-ABCD-2345', status: 'received', emailConfirmation: 'queued', replyBusinessDays: 2, duplicate: false, kind: 'subscribe' } }) } });
  const data = { topic: 'bop_at_home', email: 'pat@example.org', firstName: 'Pat', ageBand: 'toddler', consent: true };
  const r = await api.submit('subscribe', data);
  assert.deepEqual([r.ok, r.ref, r.emailConfirmation], [true, 'FF-ABCD-2345', 'queued']);
  const post = calls.find(c => c.method === 'POST');
  assert.deepEqual(JSON.parse(post.body), { kind: 'subscribe', token: '1.abc', ...data });
  await api.submit('subscribe', data);
  assert.equal(calls.filter(c => c.method === 'POST').length, 2);
  assert.equal(calls.filter(c => c.method === 'POST')[0].headers['Idempotency-Key'], calls.filter(c => c.method === 'POST')[1].headers['Idempotency-Key'], 'a retry of the same sign-up reuses its key');
});

test('sign-up errors from the gateway are surfaced per field, and "subscribe not available" says nothing was saved', async () => {
  let r = await load({ routes: { ...tokenRoute, 'POST /v1/inquiry': () => ({ status: 422, body: { error: 'validation', errors: { consent: 'please check the box to get the weekly email' } } }) } }).api.submit('subscribe', { email: 'a@b.co' });
  assert.deepEqual([r.ok, r.errors.consent], [false, 'please check the box to get the weekly email']);
  r = await load({ routes: { ...tokenRoute, 'POST /v1/inquiry': () => ({ status: 503, body: { error: 'subscribe_unavailable', message: 'x' } }) } }).api.submit('subscribe', { email: 'a@b.co' });
  assert.equal(r.ok, false);
  assert.match(r.message, /nothing was saved/);
  assert.match(r.message, /\(816\) 988-5661/);
});
