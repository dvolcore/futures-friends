const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const ROUTES = ['whole-child', 'bop-at-home', 'for-centers'];

// Loads the site the way the other suites do. `intake` = 'real' loads intake.js with a gateway url, 'off' loads it with none,
// anything else leaves window.FFIntake undefined.
function site({ intake = 'none', url = 'http://gw.test', fetch, document, setTimeout: st } = {}) {
  const window = { FFhooks: [], FF_INTAKE: intake === 'off' ? { url: '' } : { url }, crypto: require('node:crypto').webcrypto };
  const context = vm.createContext({
    console, window, setTimeout: st || (() => 0), clearTimeout() {}, AbortController, FormData, File, URLSearchParams, innerHeight: 800,
    fetch: fetch || (async () => { throw new TypeError('network down'); }),
    document: document || { addEventListener() {}, getElementById: () => null, createElement: () => ({}), head: { appendChild() {} }, querySelector: () => null },
  });
  const files = ['data.js', 'plush-cast.js', 'supporting-cast.js', 'views.js'].concat(intake === 'none' ? [] : ['intake.js'], ['plush-cast.js', 'whole-child.js']);
  for (const f of files) vm.runInContext(read(f), context, { filename: f });
  context.render = route => vm.runInContext(`V[${JSON.stringify(route)}]()`, context);
  return context;
}
const text = html => html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&rsquo;|&lsquo;/g, "'").replace(/&ldquo;|&rdquo;/g, '"').replace(/&hellip;/g, '...').replace(/\s+/g, ' ').replace(/\s+([.,;:!?)])/g, '$1').replace(/\(\s+/g, '(');

test('the three routes exist and render one h1 with a real heading outline', () => {
  const c = site();
  for (const r of ROUTES) {
    const html = c.render(r);
    assert.equal((html.match(/<h1[ >]/g) || []).length, 1, r + ' has exactly one h1');
    assert.ok((html.match(/<h2[ >]/g) || []).length >= 3, r + ' has section headings');
    assert.doesNotMatch(html, /undefined|\[object Object\]|NaN/, r);
  }
  const wc = c.render('whole-child');
  for (const id of ['wc-day', 'wc-friends', 'wc-move', 'wc-targets', 'wc-quiet', 'wc-nourish', 'wc-family', 'wc-promises'])
    assert.ok(wc.includes(`id="${id}"`) && wc.includes(`data-anchor="${id}"`), id + ' section and its anchor button exist');
});

test("Bop's line is Move Your Body, Grow Your Mind and the old tagline is gone from copy", () => {
  const c = site();
  const NEW = 'Move Your Body, Grow Your Mind', OLD = /big hearts make a big difference/i;
  assert.ok(c.render('whole-child').includes(NEW));
  assert.ok(c.render('bop-at-home').includes(NEW));
  assert.equal(vm.runInContext('CH.bop.m', c), 'Move your body, grow your mind.');
  for (const f of ['plush-cast.js', 'views.js', 'whole-child.js', 'premium.js', 'experience.js', 'features.js', 'extras.js', 'supporting-cast.js', 'home-signatures.js'])
    assert.doesNotMatch(read(f), OLD, f);
  for (const r of ROUTES) assert.doesNotMatch(c.render(r), OLD, r);
});

test('the day runs Arrive, Learn, Nourish, Move, Reset, Connect with one owner each; Family Connection runs through all four', () => {
  const html = site().render('whole-child');
  const steps = [...html.matchAll(/<li class="wc-step[^>]*>[\s\S]*?<h3>(\w+)<\/h3>/g)].map(m => m[1]);
  assert.deepEqual(steps, ['Arrive', 'Learn', 'Nourish', 'Move', 'Reset', 'Connect']);
  const owners = [...html.matchAll(/<li class="wc-step[\s\S]*?<\/li>/g)].map(m => (m[0].match(/wc-owner[^>]*>[\s\S]*?(Booker|Lumi|Zuri|Bop|Family Connection)/) || [])[1]);
  assert.deepEqual(owners, ['Family Connection', 'Booker', 'Zuri', 'Bop', 'Lumi', 'Family Connection']);
  assert.match(html, /Family Connection runs through all four/);
  assert.match(html, /Two Taps/);
  assert.match(html, /Story \+ DO/);
});

test('each friend owns exactly the pillars the owner chose, with the child-hears and parent-sees lines', () => {
  const html = site().render('whole-child');
  const card = k => html.split('<article class="wc-char')[['booker', 'lumi', 'zuri', 'bop'].indexOf(k) + 1].split('</article>')[0];
  const pills = h => [...h.matchAll(/class="wc-pill"[^>]*>([A-Z]+)</g)].map(m => m[1]);
  assert.deepEqual(pills(card('bop')), ['MOVE', 'OUTSIDE']);
  assert.deepEqual(pills(card('lumi')), ['BELONG', 'RESET']);
  assert.deepEqual(pills(card('zuri')), ['EXPLORE', 'NOURISH']);
  assert.deepEqual(pills(card('booker')), ['LEARN', 'SMILE']);
  assert.match(card('bop'), /Ready\? Bop &amp; Go!/);
  assert.match(card('lumi'), /Notice\. Ask\. Listen\./);
  assert.match(card('zuri'), /I wonder\.\.\./);
  assert.match(card('booker'), /I can try\./);
  for (const k of ['booker', 'lumi', 'zuri', 'bop']) { assert.match(card(k), /Child hears/); assert.match(card(k), /Parent sees/); }
  assert.match(card('lumi'), /Quiet Time/);
  assert.match(card('booker'), /Tooth-brushing/);
  assert.match(card('zuri'), /Eat the Rainbow/);
  assert.match(card('bop'), /Daily 5/);
});

test('daily targets match the owner spec, show their sources and link only to the two cited documents', () => {
  const c = site(), html = c.render('whole-child'), t = text(html);
  const rows = html.split('<tbody>')[1].split('</tbody>')[0].split('<tr>').slice(1);
  assert.equal(rows.length, 3);
  assert.match(t, /Under 12 months/);
  assert.match(t, /At least 30 minutes of tummy time while awake/);
  assert.match(t, /60 to 90 minutes of moderate-to-vigorous play \(MVPA\)/);
  assert.match(t, /90 to 120 minutes of MVPA/);
  assert.match(t, /180 minutes at any intensity, at least 60 of them MVPA/);
  assert.match(t, /None through age 2 \(CFOC 2\.2\.0\.3: "ages 2 and younger"\)/);
  assert.match(t, /Not more than 30 minutes a week in care by default, only for learning or movement and never at meals or snacks/);
  assert.doesNotMatch(t, /30 minutes a day in care/, 'the 30-minutes-a-day in-care default is retired (owner 2026-10-07)');
  assert.doesNotMatch(t, /no more than 1 hour a day in total/i, 'the old preschool screen default is gone');
  assert.match(t, /Seated no more than 15 minutes at a time\. Awake in a crib, playpen or other confinement no more than 30 minutes/);
  assert.match(t, /Awake confinement no more than 30 minutes\. Sitting no more than 1 hour at a time/);
  assert.match(t, /K\.A\.R\. 28-4-440\(f\)/);
  assert.match(t, /CFOC 3\.1\.3\.1 \(opens in a new tab\) and 2\.2\.0\.3/);
  assert.match(t, /bouts of 10 minutes or more/);
  assert.match(t, /2 to 3 outdoor occasions and 2 or more adult-led movement activities/);
  assert.match(t, /where a state rule is stricter, the state rule wins/);
  assert.match(t, /Our screen limits are Futures Friends standards\. Neither state limits screens/);
  for (const r of rows) assert.match(r, /<a href="https:\/\//, 'every row cites a source link');
  const hrefs = [...new Set([...html.matchAll(/href="(https?:[^"]+)"/g)].map(m => m[1]))];
  assert.deepEqual(hrefs.sort(), ['https://nrckids.org/files/CFOC4%20pdf-%20FINAL.pdf', 'https://www.cdc.gov/early-care-education/php/obesity-prevention-standards/screen-time-limits.html', 'https://www.who.int/publications/i/item/9789241550536']);
  assert.equal((html.match(/target="_blank"/g) || []).length, (html.match(/rel="noopener noreferrer"/g) || []).length, 'new-tab links are noopener');
  assert.match(html, /<th scope="row"><b>Infant<\/b>/);
  assert.match(html, /data-label="Screen"/, 'cells carry labels for the stacked mobile layout');
});

test('state rules are shown on top of the defaults, with Kansas, Missouri and both-state items, and screens labeled as our standard', () => {
  const html = site().render('whole-child'), t = text(html);
  assert.match(html, /State rules sit on top of these defaults/);
  assert.match(t, /At least 60 minutes outdoors once a child has been in care more than 4 hours/);
  assert.match(t, /Awake infants and toddlers confined no more than 30 minutes \(K\.A\.R\. 28-4-440\(f\)\)/);
  assert.match(t, /Kansas homes: physical activity offered at least 1 hour a day/);
  assert.match(t, /1 hour outdoors for full-day preschool and school-age children, weather permitting/);
  assert.match(t, /Preschoolers who do not sleep rest 30 to 60 minutes\. Rest is required, and sleep never is/);
  assert.match(t, /No more than 4 hours between meals and snacks/);
  assert.match(t, /Supervised daily tummy time for infants, and no more than 30 minutes awake in the crib/);
  assert.match(t, /Water available at all times/);
  assert.match(t, /Food and rest are never used as punishment/);
  assert.match(t, /Neither state limits screen time\. Our screen limits are Futures Friends standards, not legal requirements/);
  assert.match(t, /religious-exempt/);
  assert.match(t, /not legal advice/);
  assert.match(t, /Missouri preschoolers who do not sleep must have a rest period of 30 to 60 minutes/);
  assert.match(t, /No episodes for children ages 2 and younger/);
  assert.match(t, /Up to 30 min a week/, 'the example Today card uses the 30 minutes a week preschool default');
  assert.doesNotMatch(t, /Up to 60 min/);
  const hrefs = [...new Set([...html.matchAll(/href="(https?:[^"]+)"/g)].map(m => m[1]))];
  assert.equal(hrefs.length, 3, 'no invented links for the state rules (CFOC, WHO and the CDC screen standard only)');
});

test('copy follows the guardrails: no medical claims, no body measurement, no diet language, nothing withheld as punishment', () => {
  const c = site();
  for (const r of ROUTES) {
    const t = text(c.render(r));
    assert.doesNotMatch(t, /prevent|obesity|\bcures?\b|\btreat(s|ed|ment)\b|improves? (your |their |a child's )?health|health outcomes|lose weight|weight loss|clinically proven/i, r);
    assert.doesNotMatch(t, /leaderboard(?!s)|most active child(?!")|top performer|rank(s|ed) (children|kids)/i, r);
  }
  const t = text(c.render('whole-child'));
  assert.match(t, /We do not sell medical claims/);
  assert.match(t, /evidence-informed routines/i);
  assert.match(t, /never a child's weight, BMI, calories/i);
  assert.match(t, /never use movement, outdoor time or food as a reward or a punishment/i);
  assert.match(t, /No leaderboards, no "most active" child, no comparing children/);
  assert.match(t, /Every Bop mission has an adapted version: seated or wheelchair, limited space, sensory-sensitive/);
  assert.match(t, /Quiet Time is offered, never forced/);
  assert.match(t, /Water is available all day, with a prompt at every Bop & Go! transition/);
  assert.match(t, /The teacher decides/);
  assert.match(t, /safe-sleep/i);
  assert.match(t, /opt-in and never tracked per person/);
  assert.match(t, /does not replace balanced food service/);
});

test('only official art: the four cut-outs and the rainbow icons, all present on disk, all with dimensions and honest alt text', () => {
  const c = site();
  for (const r of ROUTES) {
    const html = c.render(r);
    const from = html.indexOf('class="wc wc-centers"'), own = r === 'for-centers' ? html.slice(from, html.indexOf('</section></div>', from)) : html;
    for (const m of own.matchAll(/<img\b[^>]*>/g)) {
      const tag = m[0], src = (tag.match(/src="([^"]+)"/) || [])[1];
      assert.match(src, /^img\/(plush\/characters\/[a-z-]+-480\.webp|plush\/environments\/[a-z-]+-800\.webp|rainbow\/[a-z]+\.svg)$/, `${r}: ${src}`);
      assert.ok(fs.existsSync(path.join(ROOT, src)), src + ' exists');
      assert.match(tag, /width="\d+" height="\d+"/, src + ' has intrinsic size');
      assert.match(tag, /alt="[^"]*"/, src + ' has an alt attribute');
    }
  }
  const hero = c.render('whole-child').split('<header class="wc-hero">')[1].split('</header>')[0];
  assert.match(hero, /alt="Booker the brown bear"/);
  assert.match(hero, /alt="Bop the elephant"/);
  assert.doesNotMatch(read('whole-child.js'), /group\.jpg|hero\.jpg|zones\.jpg|ff_primary_sticker|flc_/, 'no cropped group art or shield in the new pages');
});

test('Bop at Home: eight no-equipment, participation-based activities, each with a visible adapted version', () => {
  const c = site(), acts = c.window.FFWholeChild.ACTS, html = c.render('bop-at-home');
  assert.equal(acts.length, 8);
  assert.equal((html.match(/<article class="wc-act/g) || []).length, 8);
  assert.equal((html.match(/Adapted version<\/b><p>/g) || []).length, 8, 'the adapted version is printed on every card, not hidden');
  for (const a of acts) {
    assert.ok(a.adapt.length > 40, a.t + ' adaptation is real');
    assert.ok(a.steps.length >= 3 && a.min >= 0.5 && a.min <= 10   /* owner 2026-10-07: Trunk Reach is a 30-second activity, matching its video */, a.t);
    assert.doesNotMatch(JSON.stringify(a), /\b(ball|balloon|hula|rope|cones?|bean ?bags?|scarf|jump rope|buy|purchase|stopwatch|timer)\b/i, a.t + ' needs no equipment');
    assert.doesNotMatch(JSON.stringify(a), /\b(win|winner|race|fastest|compete|score|points|best)\b/i, a.t + ' is not competitive');
  }
  const t = text(html);
  assert.match(t, /no equipment and no scorekeeping/);
  assert.match(t, /Trying is the win/);
  assert.match(t, /never use movement or outdoor time as a reward or a punishment/);
  assert.ok(acts.some(a => /seated or wheelchair|from a chair/i.test(a.adapt)), 'seated or wheelchair');
  assert.ok(acts.some(a => /small|window|in place/i.test(a.adapt + a.space)), 'limited space');
  assert.ok(acts.some(a => /silence|hum softly|sensory|offered, never forced|eyes open/i.test(a.adapt)), 'sensory-sensitive');
});

test('the weekly challenge form says "open soon" when there is no gateway, and is a real form when there is one', () => {
  const none = site().render('bop-at-home');
  assert.doesNotMatch(none, /<form/);
  assert.match(none, /\(816\) 988-5661/);
  const off = site({ intake: 'off' }).render('bop-at-home');
  assert.match(off, /Online requests open soon/);
  assert.match(off, /weekly challenge sign-ups/);
  assert.doesNotMatch(off, /<form/);
  assert.match(off, /tel:\+18169885661/);
  const on = site({ intake: 'real' }).render('bop-at-home');
  assert.match(on, /<form class="ffi-form" id="wcBop"/);
  for (const id of ['bhName', 'bhEmail', 'bhAge', 'bhConsent']) assert.match(on, new RegExp(`id="${id}"`));
  assert.match(on, /<input type="checkbox" id="bhConsent" name="consent"/, 'an explicit, unchecked consent box');
  assert.doesNotMatch(on, /id="bhConsent"[^>]*checked/);
  assert.match(on, /Yes, email me the weekly Bop at Home challenge\. I can unsubscribe at any time with one click/);
  assert.match(on, /We will ask you to confirm your address first/);
  assert.match(on, /name="website" id="bhHp"/, 'honeypot present');
  assert.match(on, /do not include your child's name or any health details/);
  assert.doesNotMatch(on, /name="adapt"|Sound or sensory sensitive/, 'no health-adjacent preference is collected');
  assert.doesNotMatch(on, /Online requests open soon/);
  const opts = [...on.match(/<select class="i" id="bhAge"[\s\S]*?<\/select>/)[0].matchAll(/<option value="(\w*)"/g)].map(m => m[1]);
  assert.deepEqual(opts, ['', 'infant', 'toddler', 'preschool', 'mixed'], 'the same four age bands as the gateway and the hub');
});

test('the sign-up payload is the gateway "subscribe" kind: topic, email, optional first name, age band, explicit consent, nothing about the child', () => {
  const c = site(), p = c.window.FFWholeChild.signupPayload({ name: 'Jane', email: 'jane@example.com', age: 'toddler', consent: true, website: '' });
  assert.equal(p.kind, 'subscribe');
  assert.deepEqual(JSON.parse(JSON.stringify(p.data)), { topic: 'bop_at_home', email: 'jane@example.com', firstName: 'Jane', ageBand: 'toddler', consent: true, website: '' });
  assert.equal(c.window.FFWholeChild.signupPayload({ email: 'a@b.co', age: 'mixed' }).data.consent, false, 'consent is never assumed');
  assert.doesNotMatch(JSON.stringify(p), /child.?s? ?name|childFirst|dob|birth|message|adapt/i, 'no child identity or free text is collected');
  assert.deepEqual(Array.from(c.window.FFWholeChild.AGE_OPTS, a => a[0]), ['infant', 'toddler', 'preschool', 'mixed']);
});

test('the success message is honest: check your email and confirm; not signed up until the link is opened; no "a person will contact you"', () => {
  const c = site();
  const sent = c.window.FFWholeChild.pendingHtml({ ref: 'FF-ABCD-2345', email: 'a<b>@x.co', emailConfirmation: 'queued' });
  assert.match(sent, /Check your email to confirm/);
  assert.match(sent, /You are not signed up until you open the link in it/);
  assert.match(sent, /check your spam folder/);
  assert.match(sent, /one-click unsubscribe/);
  assert.doesNotMatch(sent, /a real person will contact you|Request received|We received your/i);
  assert.doesNotMatch(sent, /<b>@x/, 'the address is escaped');
  const held = c.window.FFWholeChild.pendingHtml({ ref: 'FF-ABCD-2345', email: 'a@x.co', emailConfirmation: 'suppressed' });
  assert.match(held, /We could not send the confirmation email/);
  assert.match(held, /you are not signed up yet/);
  assert.doesNotMatch(held, /Check your email to confirm/);
});

// A small fake page to drive the real submit handler: elements by id, the captured document listeners and the card the result is written to.
function formPage({ values = {}, checked = false, routes = {} } = {}) {
  const listeners = {}, els = {}, calls = [];
  const mk = (id, extra = {}) => (els[id] = Object.assign({ id, value: values[id] || '', attrs: {}, textContent: '', setAttribute(k, v) { this.attrs[k] = v; }, focus() {}, scrollIntoView() {} }, extra));
  ['bhName', 'bhEmail', 'bhAge', 'bhHp'].forEach(id => mk(id));
  mk('bhConsent', { checked });
  ['bhName-e', 'bhEmail-e', 'bhAge-e', 'bhConsent-e'].forEach(id => mk(id));
  const card = mk('wcBopCard', { innerHTML: '' });
  const button = { textContent: 'Sign me up', dataset: {}, disabled: false };
  const msgs = { textContent: '' };
  const form = { id: 'wcBop', querySelector: sel => (sel === 'button[type="submit"]' ? button : sel === '[data-ffi-msg]' ? msgs : sel === '[aria-invalid="true"]' ? Object.values(els).find(e => e.attrs['aria-invalid'] === 'true') || null : null), setAttribute() {}, removeAttribute() {}, appendChild() {} };
  const document = { addEventListener: (t, fn) => { listeners[t] = fn; }, getElementById: id => els[id] || null, createElement: () => ({ setAttribute() {} }), head: { appendChild() {} }, querySelector: () => null };
  const fetch = async (u, init = {}) => {
    const path = u.replace('http://gw.test', '').split('?')[0];
    calls.push({ method: init.method, path, headers: init.headers || {}, body: init.body });
    const r = routes[`${init.method} ${path}`];
    if (!r) throw new TypeError('network down');
    return { status: r.status, headers: { get: () => null }, json: async () => r.body };
  };
  const c = site({ intake: 'real', fetch, document, setTimeout: fn => { fn(); return 0; } });
  const submit = async () => { let prevented = false; listeners.submit({ target: form, preventDefault() { prevented = true; } }); await new Promise(r => setImmediate(r)); await new Promise(r => setImmediate(r)); return prevented; };
  return { c, els, card, form, calls, msgs, submit, button };
}
const GW = { 'GET /v1/form-token': { status: 200, body: { token: '1.abc', minFillSeconds: 0 } } };

test('submitting posts kind subscribe with the consent and age band, then says "Check your email to confirm"', async () => {
  const pg = formPage({ values: { bhName: 'Pat', bhEmail: 'pat@example.org', bhAge: 'infant' }, checked: true,
    routes: { ...GW, 'POST /v1/inquiry': { status: 202, body: { ref: 'FF-ABCD-2345', status: 'received', emailConfirmation: 'queued', kind: 'subscribe' } } } });
  assert.equal(await pg.submit(), true, 'the default browser submit is prevented');
  const post = pg.calls.find(x => x.method === 'POST');
  assert.equal(post.path, '/v1/inquiry');
  const sent = JSON.parse(post.body);
  assert.deepEqual(sent, { kind: 'subscribe', token: '1.abc', topic: 'bop_at_home', email: 'pat@example.org', firstName: 'Pat', ageBand: 'infant', consent: true });
  assert.match(pg.card.innerHTML, /Check your email to confirm/);
  assert.match(pg.card.innerHTML, /pat@example\.org/);
  assert.match(pg.card.innerHTML, /FF-ABCD-2345/);
  assert.doesNotMatch(pg.card.innerHTML, /a real person will contact you/i);
});

test('without the consent box, an age band or a valid email nothing is sent, and each problem is shown on its field', async () => {
  const pg = formPage({ values: { bhEmail: 'not-an-email', bhAge: '' }, checked: false, routes: { ...GW } });
  await pg.submit();
  assert.equal(pg.calls.length, 0, 'no request left the page');
  assert.match(pg.els['bhConsent-e'].textContent, /check the box to get the weekly email/);
  assert.match(pg.els['bhAge-e'].textContent, /Choose an age group/);
  assert.match(pg.els['bhEmail-e'].textContent, /valid email/);
});

test('the gateway\'s answers are shown honestly: field errors, limits, and "not available" with nothing claimed as saved', async () => {
  const mk = (post) => formPage({ values: { bhEmail: 'pat@example.org', bhAge: 'toddler' }, checked: true, routes: { ...GW, 'POST /v1/inquiry': post } });
  let pg = mk({ status: 422, body: { error: 'validation', errors: { consent: 'please check the box to get the weekly email' } } });
  await pg.submit();
  assert.match(pg.els['bhConsent-e'].textContent, /check the box/);
  assert.doesNotMatch(pg.card.innerHTML, /Check your email/);
  pg = mk({ status: 503, body: { error: 'subscribe_unavailable', message: 'x' } });
  await pg.submit();
  assert.match(pg.msgs.textContent, /not available right now, so nothing was saved/);
  assert.doesNotMatch(pg.card.innerHTML, /Check your email/);
  pg = mk({ status: 429, body: { error: 'rate_limited' } });
  await pg.submit();
  assert.match(pg.msgs.textContent, /Nothing was sent/);
  pg = mk({ status: 202, body: { ref: 'FF-ABCD-2345', emailConfirmation: 'suppressed' } });
  await pg.submit();
  assert.match(pg.card.innerHTML, /We could not send the confirmation email/);
  assert.match(pg.card.innerHTML, /you are not signed up yet/);
});

test('the form kinds and interest used here are accepted by the gateway validator (skipped when the CRM repo is not mounted)', { skip: !fs.existsSync('/Volumes/FFCRM/app/intake/ffintake/validate.py') }, () => {
  const py = fs.readFileSync('/Volumes/FFCRM/app/intake/ffintake/validate.py', 'utf8');
  const kinds = (py.match(/^KINDS = \(([^)]*)\)/m) || [])[1], interests = (py.match(/^INTERESTS = \(([^)]*)\)/m) || [])[1], orgs = (py.match(/^ORG_TYPES = \(([^)]*)\)/m) || [])[1];
  assert.match(kinds, /'contact'/);
  assert.match(kinds, /'partner'/);
  const preset = site().window.FFWholeChild.CENTER_PRESET;
  assert.ok(interests.includes(`'${preset.interest}'`), 'preset interest is allowed for the partner kind');
  assert.ok(orgs.includes("'center'"));
  assert.match(py, /if kind in \('contact', 'quote', 'partner'\):/);
  assert.match(kinds, /'subscribe'/, 'the gateway accepts the subscribe kind');
  const bands = (py.match(/^AGE_BANDS = \(([^)]*)\)/m) || [])[1], topics = (py.match(/^TOPICS = \(([^)]*)\)/m) || [])[1];
  assert.deepEqual([...bands.matchAll(/'(\w+)'/g)].map(m => m[1]), Array.from(site().window.FFWholeChild.AGE_OPTS, a => a[0]), 'age bands match the gateway');
  assert.ok(topics.includes("'bop_at_home'"));
  assert.match(py, /elif kind == 'subscribe':/);
  assert.match(py, /c\.get\('ageBand', choice, AGE_BANDS, required=True\)/);
  assert.match(py, /c\.errors\['consent'\]/);
});

test('the cache-busting versions of the changed scripts were bumped', () => {
  const html = read('index.html');
  assert.match(html, /<script src="whole-child\.js\?v=\d+"><\/script>/);
  assert.ok(+html.match(/whole-child\.js\?v=(\d+)/)[1] >= 3);
  assert.match(html, /<script src="intake\.js\?v=\d+"><\/script>/);
  assert.ok(+html.match(/intake\.js\?v=(\d+)/)[1] >= 3);
  assert.ok(+html.match(/daily-rhythm\.js\?v=(\d+)/)[1] >= 3, "daily-rhythm.js bumped for the weekly screen cap");
});

test('the family card asks for the weekly challenge for the child\'s age band', () => {
  const src = read('daily-rhythm.js');
  assert.match(src, /rhythm_current_challenge', band \? \{p_date:date, p_band:band\} : \{p_date:date\}/);
});

test('For Centers keeps the existing page and adds the licensed-center block, the four engines, the pilot and a real partner form', () => {
  const html = site({ intake: 'real' }).render('for-centers'), t = text(html);
  // E2 (reevaluation 2026-10-05): the hero no longer calls an unfinished year "a complete program"; it starts with Unit 1.
  assert.match(html, /Bring Futures Friends to your child care center, starting with Unit 1/, 'existing hero kept (no "boost readiness" outcome promise)');
  assert.doesNotMatch(html, /complete early learning program/);
  assert.doesNotMatch(html, /Boost readiness/);
  assert.match(html, /Ages 2 to 5, in three age bands/, 'existing sections kept');
  assert.ok(html.indexOf('class="wc wc-centers"') < html.indexOf('Ages 2 to 5, in three age bands'), 'new block sits right after the hero');
  assert.ok(html.indexOf('class="phero"') < html.indexOf('class="wc wc-centers"'));
  for (const part of ['Media', 'Curriculum', 'Environment', 'Family', 'Training', 'Merch']) assert.ok(html.includes(`<b>${part}</b>`), part);
  assert.match(t, /Episodes, songs and clips/);
  assert.match(t, /Posters, rug, zones and signage/);
  assert.match(t, /Optional plush, books and kits/);
  assert.match(t, /One license\. One consistent family experience across locations/);
  for (const e of ['Childcare', 'Media and IP', 'Products', 'Licensing']) assert.ok(html.includes(`<h3>${e}</h3>`), e);
  assert.match(t, /Enrollment .* Character attachment .* Product demand .* Licensing/);
  assert.match(t, /We do not promise enrollment or revenue results/);
  assert.match(t, /partner concept package/);
  for (const s of ['Lock', 'Pilot', 'Measure', 'Refine', 'Scale', 'Child engagement', 'Teacher usability', 'Parent recall', 'Phrase transfer', 'Activity completion', 'Tour and enrollment signal']) assert.ok(t.includes(s), s);
  assert.match(html, /data-ffi-preset="centers"/);
  assert.match(html, /<h3>Talk to us about licensing<\/h3>/);
  assert.match(html, /<option value="franchise" selected>/);
  assert.match(html, /whole-child license package for my center/);
  assert.match(html, /id="ffiContact"/);
  const off = site({ intake: 'off' }).render('for-centers');
  assert.match(off, /Online requests open soon/);
  assert.match(off, /licensing inquiries/);
  assert.equal((off.match(/<form/g) || []).length, 0);
});

test('the shared contact form is unchanged by default and escapes any preset it is given', () => {
  const { window } = site({ intake: 'real' });
  const plain = window.FFIntake.contactHtml('contact');
  assert.match(plain, /<h3>Request information<\/h3>/);
  assert.match(plain, /<option value="question" selected>/);
  assert.doesNotMatch(plain, /data-ffi-preset/);
  assert.match(window.FFIntake.contactHtml('quote'), /<h3>Request a quote<\/h3>/);
  const hostile = window.FFIntake.contactHtml('contact', { id: 'x"y', heading: '<img src=x onerror=1>', message: '</textarea><script>1</script>', interest: 'nonsense' });
  assert.doesNotMatch(hostile, /<img src=x|<script>1/);
  assert.match(hostile, /<option value="question" selected>/, 'an unknown interest falls back to the default');
});

test('the Whole-Child entry points exist on For Families (moved from Home in wave 4), Curriculum, Home\'s day steps and in the main navigation', () => {
  const c = site(), home = c.window.FFWholeChild.callout('home'), cur = c.window.FFWholeChild.callout('curriculum');
  assert.match(home, /href="#whole-child"/);
  assert.match(home, /href="#bop-at-home"/);
  assert.equal((home.match(/<li style=/g) || []).length, 6);
  assert.match(cur, /href="#whole-child"/);
  assert.ok(cur.length < home.length, 'the curriculum band is a short pointer, not a copy of the page');
  // audience split (2026-10-07): the families' header is four links; the whole-child day is a big link in their menu and Home's day steps
  assert.match(read('wayfinding.js'), /\['friends', 'Friends & Books'\], \['whole-child', 'The whole-child day'\]/);
  // wave 6: the old More menu is the full-screen menu in wayfinding.js (families group; centers group)
  assert.match(read('wayfinding.js'), /\['bop-at-home', 'Bop at Home'\]/);
  assert.match(read('wayfinding.js'), /\['for-centers', 'Child care centers'\]/);
  assert.match(read('home-calm.js'), /'for-families': \['<section class="tight">', \(\) => \(window\.FFWholeChild \? window\.FFWholeChild\.callout\('home'\)/, 'the band moved to #for-families');
  assert.match(read('home-calm.js'), /href="#whole-child">See the whole-child day/, 'Home still points to the whole-child day');
  assert.match(read('experience.js'), /window\.FFWholeChild\?window\.FFWholeChild\.callout\('curriculum'\)/);
  for (const [r] of [['whole-child'], ['bop-at-home'], ['for-centers']]) assert.match(read('premium.js'), new RegExp(`\\['${r}','[^']+'\\]`), 'page title registered for ' + r);
});

test('index.html loads the new files after intake.js and bumps the cache-busting versions of every edited file', () => {
  const html = read('index.html');
  assert.match(html, /<link rel="stylesheet" href="whole-child\.css\?v=\d+">/);
  const at = f => html.indexOf(`<script src="${f}`);
  assert.ok(at('whole-child.js') > at('intake.js') && at('whole-child.js') > at('views.js') && at('whole-child.js') > 0);
  for (const f of ['plush-cast.js', 'views.js', 'intake.js', 'premium.js', 'experience.js', 'whole-child.js']) assert.match(html, new RegExp(`<script src="${f.replace('.', '\\.')}\\?v=\\d+"></script>`), f);
  assert.ok(+html.match(/views\.js\?v=(\d+)/)[1] >= 19);
  assert.ok(+html.match(/intake\.js\?v=(\d+)/)[1] >= 2);
  assert.ok(+html.match(/premium\.js\?v=(\d+)/)[1] >= 9);
  assert.ok(+html.match(/experience\.js\?v=(\d+)/)[1] >= 4);
});

test('the existing routing, brand and nav fixes are untouched', () => {
  const html = read('index.html'), css = read('premium.css'), views = read('views.js');
  assert.match(css, /@media \(min-width:901px\) and \(max-width:1180px\)\{nav\.main\.px-main\{position:static/);
  assert.match(html, /<button class="logo"[^>]*><img class="ff-plush-wm" src="img\/brand\/ff-plush-wordmark-160\.webp"/, 'plush wordmark in the header (owner 2026-10-07)');
  assert.match(html, /<div class="fprog"><img src="img\/brand\/flc-mark-rev\.png"[^>]*alt="Futures Learning Center"><p class="small"><b[^>]*>A program of Futures Learning Center/, 'shield only for the "A program of" mention');
  assert.match(views, /window\.FFcut = k => ART\[k\];/);
  assert.match(views, /const FF_CRM_ALLOWED = \[\];/, 'CRM-link allowlist intact');
  for (const k of ['booker', 'lumi', 'zuri', 'bop']) assert.ok(views.includes(`img/plush/characters/${k}-480.webp`), 'FFcut points at the plush library (wave 5)');
});

test('the new code sends nothing itself and stores nothing in the browser', () => {
  const src = read('whole-child.js');
  assert.doesNotMatch(src, /\bfetch\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|indexedDB|document\.cookie/);
  assert.match(src, /I\.submit\(/, 'submission goes through FFIntake');
  assert.doesNotMatch(src, /https?:\/\/ff-intake|dvolcore/, 'no gateway address of its own');
});

test('scroll reveals run only when motion is allowed and never hide content that starts on screen; page descriptions follow the route', () => {
  const c = site(), hook = c.window.FFhooks[c.window.FFhooks.length - 1];
  const mk = top => { const cls = new Set(); return { classList: { add: x => cls.add(x), has: x => cls.has(x) }, getBoundingClientRect: () => ({ top }) }; };
  const els = [mk(100), mk(2000), mk(3000)];
  const root = { querySelectorAll: () => els };
  let observed = 0;
  c.IntersectionObserver = function () { return { observe() { observed++; }, unobserve() {} }; };
  const meta = { v: 'ORIGINAL', getAttribute() { return this.v; }, setAttribute(_, v) { this.v = v; } };
  c.document.querySelector = s => (s === 'meta[name="description"]' ? meta : null);
  c.window.IntersectionObserver = c.IntersectionObserver;
  hook('whole-child', root, false);
  assert.equal(els.some(e => e.classList.has('wc-pre')), false, 'reduced motion: nothing is hidden');
  assert.match(meta.v, /One day, one connected system/);
  hook('home', root, true);
  assert.equal(meta.v, 'ORIGINAL', 'other routes get the original description back');
  assert.deepEqual(els.map(e => e.classList.has('wc-pre')), [false, true, true], 'only below-the-fold items start hidden');
  assert.equal(observed, 2);
  const css = read('whole-child.css');
  assert.match(css, /@media \(prefers-reduced-motion:no-preference\)\{\s*\.wc-pre\{opacity:0/, 'the hidden state exists only inside the no-preference query');
  assert.match(css, /@media \(prefers-reduced-motion:no-preference\)\{\s*\.wc-fig img\{animation/);
  assert.doesNotMatch(css.replace(/@media \(prefers-reduced-motion:no-preference\)\{[\s\S]*?\n\}\n/g, ''), /animation:/, 'every animation is inside the motion query');
});
