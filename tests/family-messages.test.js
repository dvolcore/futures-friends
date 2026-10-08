// Family messages on the website: the evening daily report ("Today" in the Family Portal), message settings, the teacher's
// "Family reports" preview (family-report.js, hub mode only) and the Futures at Home sign-up on #at-home (futures-at-home-signup.js).
// The database rules themselves are tested in the hub repo (hub/tests/family-daily-report.test.mjs, futures-home.test.mjs).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const report = read('family-report.js'), signup = read('futures-at-home-signup.js'), portal = read('portal.js'), index = read('index.html');
const text = html => html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ');

// ---------------------------------------------------------------- family-report.js in a sandbox with a fake signed-in hub
function reportSandbox({ rpc = {}, connected = true } = {}) {
  const calls = [], listeners = {};
  const plain = x => JSON.parse(JSON.stringify(x));
  const client = {
    rpc: async (fn, args) => { calls.push(plain([fn, args])); const r = rpc[fn]; return typeof r === 'function' ? r(args) : (r || { data: null, error: null }); },
    storage: { from: () => ({ createSignedUrl: async (p) => ({ data: { signedUrl: `https://signed.test/${p}?token=x` } }) }) },
  };
  const ctx = { center: { id: 'c1', name: 'TEST' }, role: 'family', fam: { kid: 'k1', date: '2026-10-06' }, date: '2026-10-06', room: 'threes', canWrite: true, kids: {} };
  const window = { FFHub: { configured: true, connected, client: () => client }, FFPortal: { ctx: () => ctx } };
  const toasts = [];
  const context = vm.createContext({
    window, console, setTimeout: fn => { fn(); return 0; }, CSS: { escape: s => s }, view: 'family-portal', render() {}, toast: m => toasts.push(m),
    esc: s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    document: { addEventListener: (t, fn) => { listeners[t] = fn; }, getElementById: () => null, createElement: () => ({}), head: { appendChild() {} }, querySelector: () => null },
  });
  vm.runInContext(report, context, { filename: 'family-report.js' });
  const flush = () => new Promise(r => setImmediate(r));
  return { R: window.FFReport, ctx, calls, flush, toasts, listeners };
}
const KID = (o = {}) => ({ kid: 'k1', first: 'Mia', room_name: 'Threes Room', date: '2026-10-06', attendance: { present: true, arrived: '7:45 am' },
  meals: [{ meal: 'Lunch', words: 'tried it' }], rest: 'slept 30 to 60 minutes', care: [], lesson: { theme: 'Meet Lumi: Big Feelings', friend: 'Lumi', pillar: 'BELONG', focus: 'Greeting friends' },
  activities: [{ title: 'Morning Wake-Up', friend: 'Bop', pillar: 'MOVE' }], note: 'Mia built a tower.', class_note: null, moments: [{ domain: 'lit', text: 'Mia retold the story.' }],
  photos: [{ id: 'p1', path: 'c1/k1/a.png', caption: 'Tower' }], talk_tonight: 'Ask Mia: "What did Lumi do today?"', ...o });

test('family-report.js parses, exposes its API and does nothing for a teacher, in demo mode or when signed out', () => {
  new Function(report);
  assert.match(report, /window\.FFReport = \{familyToday, teacherView/);
  const s = reportSandbox({ connected: false });
  assert.equal(s.R.familyToday(s.ctx), '');
  const t = reportSandbox();
  assert.equal(t.R.familyToday({ ...t.ctx, role: 'teacher' }), '');
  assert.equal(t.calls.length, 0);
});

test('Today: before 5:30 pm it says when the report arrives; after, every child of the family (siblings together) in neutral words', async () => {
  const s = reportSandbox({ rpc: { family_daily_report: { data: { date: '2026-10-06', published: false, kids: [], send_time: 'about 5:30 pm' }, error: null } } });
  s.R.familyToday(s.ctx); await s.flush();
  const before = text(s.R.familyToday(s.ctx));
  assert.match(before, /arrives at about 5:30 pm/);
  assert.match(before, /nothing to fill in/);
  assert.deepEqual(s.calls[0], ['family_daily_report', { p_center: 'c1', p_date: '2026-10-06' }]);

  const p = reportSandbox({ rpc: { family_daily_report: { data: { date: '2026-10-06', published: true, kids: [KID(), KID({ kid: 'k2', first: 'Noah', photos: [], care: ['10:15 diaper change (wet)'] })] }, error: null } } });
  p.R.familyToday(p.ctx); await p.flush();
  p.R.familyToday(p.ctx); await p.flush();   // the second draw asks for the signed photo URL
  const html = p.R.familyToday(p.ctx), t = text(html);
  assert.match(t, /Mia/); assert.match(t, /Noah/);
  assert.match(t, /Lunch: tried it/);
  assert.match(t, /"Meet Lumi: Big Feelings" with Lumi \(BELONG\)/);
  assert.match(t, /Diapering and toileting 10:15 diaper change \(wet\)/);
  assert.match(t, /Talk about it tonight: Ask Mia: "What did Lumi do today\?"/);
  assert.match(html, /<img src="https:\/\/signed\.test\/c1\/k1\/a\.png\?token=x" alt="Tower"/, 'photos through short-lived signed URLs');
  assert.match(t, /never compared with other children/);
  assert.match(t, /3 years after a child leaves the program \(a CACFP rule\), and photos and messages for 1 year/);
  assert.match(t, /never include health information/);
});

test('teacher text is escaped, never trusted as HTML', async () => {
  const p = reportSandbox({ rpc: { family_daily_report: { data: { published: true, kids: [KID({ note: '<img src=x onerror=alert(1)>' })] }, error: null } } });
  p.R.familyToday(p.ctx); await p.flush();
  const html = p.R.familyToday(p.ctx);
  assert.doesNotMatch(html, /<img src=x/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
});

test('message settings: daily report email, Futures at Home by email, texts only with a number and explicit consent', async () => {
  const prefs = { daily_report_email: true, fah_email: false, fah_sms: false, fah_age_band: null, suggested_age_band: 'threes', sms_phone: null, sms_consent_at: null,
                  sms_consent_text: 'I agree to receive Futures at Home text messages from Futures Friends at this number, about 3 a week. Message and data rates may apply. Reply STOP to end, HELP for help. Consent is not a condition of enrollment.' };
  const s = reportSandbox({ rpc: { family_daily_report: { data: { published: false, kids: [] }, error: null }, family_get_message_prefs: { data: prefs, error: null } } });
  s.R.familyToday(s.ctx); await s.flush();
  s.listeners.click({ target: { closest: () => ({ dataset: { fr: 'prefs' } }) } });
  s.R.familyToday(s.ctx); await s.flush();
  const t = text(s.R.familyToday(s.ctx));
  assert.match(t, /Email me the daily report/);
  assert.match(t, /always here in the Family Portal/);
  assert.match(t, /Email me Futures at Home/);
  assert.match(t, /Text me Futures at Home/);
  assert.match(t, /Reply STOP to end/);
  assert.match(t, /Consent is not a condition of enrollment/);
  assert.match(t, /nothing is texted before then/);
  assert.match(t, /Three-year-old \(your child's room\)/);
  // the save sends the consent flag only when the box is ticked; the client refuses texts without consent before calling the hub
  assert.match(report, /if \(sms && !consent && !\(S\.prefs && S\.prefs\.fah_sms && S\.prefs\.sms_consent_at\)\) \{ toast\('Tick the consent box to get texts'\)/);
  assert.match(report, /p_sms_consent:consent/);
});

test('teacher preview: shows each child\'s report, held notes, and edits the note before (never after) the send', async () => {
  const list = [
    { kid: 'k1', first: 'Mia', published: false, note_edited: false, report: KID({ note: null, note_held: true }) },
    { kid: 'k2', first: 'Noah', published: true, published_at: '2026-10-06T22:30:00Z', report: KID({ first: 'Noah' }) },
    { kid: 'k3', first: 'Zoe', published: false, report: null }];
  const s = reportSandbox({ rpc: { daily_report_room_preview: { data: list, error: null }, daily_report_set_note: { data: {}, error: null } } });
  const c = { ...s.ctx, role: 'teacher' };
  s.R.teacherView(c); await s.flush();
  const html = s.R.teacherView(c), t = text(html);
  assert.deepEqual(s.calls[0], ['daily_report_room_preview', { p_center: 'c1', p_room: 'threes', p_date: '2026-10-06' }]);
  assert.match(t, /held back because it mentions health details or judges food or bodies/);
  assert.match(t, /No report: nothing recorded yet, or marked absent/);
  assert.match(t, /Sent/);
  assert.equal((html.match(/data-fr="note-save"/g) || []).length, 1, 'only the unsent report with content can be edited');
  assert.match(t, /never compare children and never include health information/);
  s.listeners.click({ target: { closest: () => ({ dataset: { fr: 'note-none', kid: 'k1' } }) } }); await s.flush();
  assert.deepEqual(s.calls.find(x => x[0] === 'daily_report_set_note'), ['daily_report_set_note', { p_center: 'c1', p_kid: 'k1', p_date: '2026-10-06', p_note: '' }]);
});

test('guardrails in the screens: no scores, ranking, body measurement or food judgement wording', () => {
  const visible = (report + signup).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/font-weight/g, '');
  for (const re of [/\bbmi\b/i, /\bcalorie/i, /\bweigh(t|ed|s)\b/i, /\bobes/i, /leaderboard/i, /most active/i, /\branking\b/i, /good food|bad food|junk/i, /clean (your )?plate/i, /\bscore(s|d)?\b(?! and no comparing)/i])
    assert.doesNotMatch(visible.replace(/No scores, no comparing/g, '').replace(/no scores and no comparing/gi, ''), re, String(re));
});

test('portal.js wires the report in hub mode only and stores the day\'s lesson on the room\'s day', () => {
  assert.match(portal, /if \(window\.FFReport && P\.hub\) tabs\.splice\(tabs\.findIndex\(t=>t\[0\]==='messages'\)\+1,0,\['reports','Family reports'\]\)/);
  assert.match(portal, /reports:\(\)=>window\.FFReport\.teacherView\(rhythmCtx\(\)\)/);
  assert.match(portal, /if \(P\.hub && window\.FFReport\) \{ const rep = window\.FFReport\.familyToday\(rhythmCtx\(\)\)/);
  // the snapshot comes from the approved daily-program record when the room has one (program-record.js), else the curriculum outline
  assert.match(portal, /if \(coll==='days' && clean\.date\) \{ const L=lessonFor\(clean\.date\), ps=progSum\(clean\.room, clean\.date, true\); clean\.lesson = ps \? \{theme:ps\.theme, lead:ps\.lead, pillar:[^}]*\} : \{theme:L\.theme, lead:L\.lead, pillar:/);
  // the report card is inserted before the rhythm card, so it is the first thing a family sees
  assert.ok(portal.indexOf('window.FFReport.familyToday') < portal.indexOf('window.FFRhythm.familyCard(rhythmCtx())'));
});

test('index.html loads family-report.js after portal.js and the sign-up after the family library and intake.js', () => {
  const at = f => index.indexOf(f);
  assert.ok(at('family-report.js?v=') > at('portal.js?v=') && at('portal.js?v=') > 0);
  assert.ok(at('futures-at-home-signup.js?v=') > at('family-library.js?v=') && at('futures-at-home-signup.js?v=') > at('intake.js?v='));
  assert.ok(+index.match(/portal\.js\?v=(\d+)/)[1] >= 15);
});

// ---------------------------------------------------------------- the #at-home sign-up
function site({ intake = 'off', fetch, document } = {}) {
  const window = { FFhooks: [], FF_INTAKE: { url: intake === 'off' ? '' : 'http://gw.test' }, crypto: require('node:crypto').webcrypto };
  const context = vm.createContext({
    console, window, setTimeout: fn => { if (document) fn(); return 0; }, clearTimeout() {}, AbortController, FormData, File, URLSearchParams, innerHeight: 800,
    fetch: fetch || (async () => { throw new TypeError('network down'); }),
    document: document || { addEventListener() {}, getElementById: () => null, createElement: () => ({}), head: { appendChild() {} }, querySelector: () => null, querySelectorAll: () => [] },
  });
  for (const f of ['data.js', 'plush-cast.js', 'supporting-cast.js', 'views.js', 'intake.js', 'whole-child.js', 'family-library-data.js', 'family-library.js', 'futures-at-home-signup.js'])
    vm.runInContext(read(f), context, { filename: f });
  context.render = r => vm.runInContext(`V[${JSON.stringify(r)}]()`, context);
  return context;
}

test('#at-home: honest "Online requests open soon" without a gateway, a real double opt-in form with one', () => {
  const off = site({ intake: 'off' }).render('at-home');
  assert.match(off, /id="fl-messages"/);
  assert.match(off, /Online requests open soon/);
  assert.doesNotMatch(off, /id="fhForm"/);
  assert.equal((off.match(/<h1[ >]/g) || []).length, 1);
  const on = site({ intake: 'real' }).render('at-home');
  assert.match(on, /<form class="ffi-form" id="fhForm" novalidate>/);
  for (const [v] of [['twos'], ['threes'], ['prek']]) assert.match(on, new RegExp(`<option value="${v}">`));
  assert.match(text(on), /Monday: .* Wednesday: .* Friday:/);
  assert.match(text(on), /nothing about your child is collected here/);
  assert.match(text(on), /READY4K.*York, Loeb and Doss, 2019/);
  assert.doesNotMatch(on, /Online requests open soon/);
});

test('#at-home sign-up posts topic futures_at_home with the age band and consent, then asks to confirm by email', async () => {
  const listeners = {}, els = {}, calls = [];
  const mk = (id, extra = {}) => (els[id] = Object.assign({ id, value: '', attrs: {}, textContent: '', setAttribute(k, v) { this.attrs[k] = v; }, focus() {}, scrollIntoView() {} }, extra));
  ['fhName', 'fhEmail', 'fhAge', 'fhHp', 'fhName-e', 'fhEmail-e', 'fhAge-e', 'fhConsent-e'].forEach(id => mk(id));
  Object.assign(els.fhName, { value: 'Pat' }); Object.assign(els.fhEmail, { value: 'pat@example.org' }); Object.assign(els.fhAge, { value: 'twos' });
  mk('fhConsent', { checked: true });
  const card = mk('fhCard', { innerHTML: '' });
  const form = { id: 'fhForm', querySelector: sel => (sel === 'button[type="submit"]' ? { dataset: {} } : sel === '[data-ffi-msg]' ? { textContent: '' } : null), setAttribute() {}, removeAttribute() {}, appendChild() {} };
  const document = { addEventListener: (t, fn) => { listeners[t] = listeners[t] || fn; if (t === 'submit') listeners.last = fn; }, getElementById: id => els[id] || null, createElement: () => ({ setAttribute() {} }), head: { appendChild() {} }, querySelector: () => null };
  const fetch = async (u, init = {}) => {
    calls.push({ method: init.method, path: u.replace('http://gw.test', ''), body: init.body });
    if (init.method === 'GET') return { status: 200, headers: { get: () => null }, json: async () => ({ token: '1.abc', minFillSeconds: 0 }) };
    return { status: 202, headers: { get: () => null }, json: async () => ({ ref: 'FF-FAH1-2345', emailConfirmation: 'queued', kind: 'subscribe' }) };
  };
  site({ intake: 'real', fetch, document });
  let prevented = false;
  listeners.last({ target: form, preventDefault() { prevented = true; } });
  for (let i = 0; i < 4; i++) await new Promise(r => setImmediate(r));
  assert.equal(prevented, true);
  const sent = JSON.parse(calls.find(x => x.method === 'POST').body);
  assert.deepEqual(sent, { kind: 'subscribe', token: '1.abc', topic: 'futures_at_home', email: 'pat@example.org', firstName: 'Pat', ageBand: 'twos', consent: true });
  assert.match(card.innerHTML, /Check your email to confirm/);
  assert.match(card.innerHTML, /You are not signed up until you open the link/);
  assert.match(card.innerHTML, /FF-FAH1-2345/);
});

test('the age bands and topic the sign-up sends are the ones the gateway accepts (skipped when the CRM repo is not mounted)', { skip: !fs.existsSync('/Volumes/FFCRM/app/intake/ffintake/validate.py') }, () => {
  const py = fs.readFileSync('/Volumes/FFCRM/app/intake/ffintake/validate.py', 'utf8');
  assert.match(py, /TOPICS = \('bop_at_home', 'futures_at_home'\)/);
  assert.match(py, /FAH_AGE_BANDS = \([^)]*'twos', 'threes', 'prek'\)/);
  assert.match(signup, /\[\['twos', [^\]]+\], \['threes', [^\]]+\], \['prek', [^\]]+\]\]/);
  assert.doesNotMatch(signup, /'infant'|'toddler'/);
});
