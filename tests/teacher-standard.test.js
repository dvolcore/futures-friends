// Our Teacher Standard (#teacher-standard) and Train your staff with us (#train-your-staff): routes render, entry points exist,
// Ms. June stays labeled as a story-world character, the video slots stay honest, forms use the "open soon" pattern, and the new
// copy never makes a claim that is not true today.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const ROUTES = ['teacher-standard', 'train-your-staff'];

// intake: 'off' = intake.js with an empty gateway url (the production state today), 'real' = with a url, 'none' = not loaded.
function site({ intake = 'off', enroll = true } = {}) {
  const window = { FFhooks: [], FF_INTAKE: intake === 'real' ? { url: 'http://gw.test' } : { url: '' }, crypto: require('node:crypto').webcrypto };
  const context = vm.createContext({
    console, window, setTimeout: () => 0, clearTimeout() {}, AbortController, FormData, File, URLSearchParams, innerHeight: 800,
    fetch: async () => { throw new TypeError('network down'); },
    document: { addEventListener() {}, getElementById: () => null, createElement: () => ({}), head: { appendChild() {} }, querySelector: () => null, querySelectorAll: () => [] }
  });
  const files = ['data.js', 'plush-cast.js', 'supporting-cast.js', 'views.js'].concat(intake === 'none' ? [] : ['intake.js'], ['plush-cast.js', 'whole-child.js']);
  for (const f of files) vm.runInContext(read(f), context, { filename: f });
  // features.js (V.enroll) needs a browser; stand in with its real markers so the wrapper can be checked.
  if (enroll) vm.runInContext('V.enroll = () => \'<div class="phero">x</div><section id="ffx-why">why</section><section id="ffx-day">day</section>\';', context);
  vm.runInContext(read('teacher-standard.js'), context, { filename: 'teacher-standard.js' });
  context.render = route => vm.runInContext(`V[${JSON.stringify(route)}]()`, context);
  return context;
}
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&rsquo;|&lsquo;/g, "'").replace(/&ldquo;|&rdquo;/g, '"').replace(/\s+/g, ' ');

test('both routes render one h1, real section headings and no template leaks', () => {
  const c = site();
  for (const r of ROUTES) {
    const html = c.render(r);
    assert.equal((html.match(/<h1[ >]/g) || []).length, 1, r + ' has exactly one h1');
    assert.ok((html.match(/<h2[ >]/g) || []).length >= 4, r + ' has section headings');
    assert.doesNotMatch(html, /undefined|\[object Object\]|NaN/, r);
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
    assert.equal(new Set(ids).size, ids.length, r + ': ids are unique');
  }
  const ts = c.render('teacher-standard');
  for (const id of ['ts-law', 'ts-further', 'ts-method', 'ts-pilot', 'ts-verify', 'ts-year', 'ts-ask', 'ts-status', 'ts-faq'])
    assert.ok(ts.includes(`id="${id}"`), id + ' section exists');
  for (const a of [...ts.matchAll(/data-anchor="([^"]+)"/g)].map(m => m[1])) assert.ok(ts.includes(`id="${a}"`), 'anchor target exists: ' + a);
});

test('the law section covers background checks, orientation, health and safety, CPR, health records and yearly hours for both states, each with a citation', () => {
  const { GATES } = site().window.FFTeacherStandard;
  assert.deepEqual([...GATES.map(g => g.when)], ['Before the first shift', 'Within 7 days', 'Within 30 days', 'Every day', 'Every year', 'Every 5 years']);
  for (const g of GATES) for (const st of ['ks', 'mo']) {
    assert.ok(g[st].length >= 1, g.when + ' ' + st);
    for (const [t, cite] of g[st]) { assert.ok(t.length > 20); assert.ok(cite.length > 3, 'cited: ' + t.slice(0, 40)); }
  }
  const t = text(site().render('teacher-standard'));
  for (const s of ['K.A.R. 28-4-125', '5 CSR 25-600.020(1)', 'K.A.R. 28-4-428a(b)', 'K.A.R. 28-4-428a(c)', 'K.A.R. 28-4-126(c)', '5 CSR 25-500.122(1)', '5 CSR 25-500.102(3)', 'K.A.R. 28-4-428a(e)'])
    assert.ok(t.includes(s), 'cites ' + s);
  assert.match(t, /16 clock hours/);
  assert.match(t, /12 clock hours/);
  assert.match(t, /1-800-392-3738/);
  assert.match(t, /not legal advice/);
});

test('the method, mastery and pilot facts match the owner-approved design', () => {
  const c = site(), t = text(c.render('teacher-standard')), api = c.window.FFTeacherStandard;
  assert.deepEqual([...api.METHOD.map(m => m[0])], ['Watch', 'Do', 'Decide', 'Master', 'Reflect', 'Show']);
  assert.match(t, /100%/);
  assert.match(t, /80% to pass, 3 attempts/);
  assert.match(t, /every 5 minutes/);
  assert.match(t, /within 30 days/i);
  assert.match(t, /coaching plan/);
  assert.match(t, /self-study with a quiz/);
  assert.match(t, /taught in person/);
  assert.equal(api.PILOT.title, "Rest Time and Lumi's Quiet Time");
  assert.equal(api.CHECKLIST.length, 12);
  assert.equal(api.PLAN.reduce((a, r) => a + r[2], 0), 12.5, 'the sample Missouri plan adds up');
  assert.match(t, /Illustrative example only/);
});

test('the honest status box says what is and is not true today', () => {
  const c = site(), t = text(c.render('teacher-standard')), { STATUS } = c.window.FFTeacherStandard;
  assert.match(t, /Where we are today/);
  assert.match(t, /preparing (them|our courses) for state review/);
  assert.match(t, /No course has been reviewed or approved by Kansas or Missouri/);
  assert.match(t, /Trainer of Record is not yet named/);
  assert.match(t, /No course is live yet/);
  assert.ok(STATUS.done.length && STATUS.now.length && STATUS.not.length);
  assert.match(text(c.render('train-your-staff')), /Where we are today/, 'the staff page carries the same status');
});

test('no forbidden or unverifiable claims appear in the new copy', () => {
  const c = site();
  const copy = ROUTES.map(r => text(c.render(r))).join('\n') + ['home', 'family', 'staff'].map(w => text(c.window.FFTeacherStandard.callout(w))).join('\n')
    + read('teacher-standard.js') + JSON.stringify(require(path.join(ROOT, 'route-meta.js')).ROUTES['teacher-standard']) + JSON.stringify(require(path.join(ROOT, 'route-meta.js')).ROUTES['train-your-staff']);
  const banned = [/state[- ]approved/i, /\baccredit/i, /certified by/i, /licensed by/i, /\bsubmitted\b/i, /trusted by/i, /guarantee/i, /award[- ]winning/i,
    /\b\d[\d,]*\+?\s+(?:teachers|educators|families|parents|centers|programs|children|staff|providers)\s+(?:have\s+)?(?:trained|served|enrolled|certified|completed|love)/i,
    /\d+\s?%\s+of\s+(?:teachers|parents|families|staff|children)/i, /★|5-star|five-star/i, /approved by (?:KDHE|KOEC|DESE|Cape|MOPD)\b/i, /(?<!how )our teachers (?:are|have been) (?:trained|certified)/i];
  for (const re of banned) assert.doesNotMatch(copy, re, String(re));
});

test('Ms. June is the visible guide and is always labeled as a story-world character', () => {
  const c = site();
  for (const r of ROUTES) {
    const html = c.render(r);
    assert.match(html, /img\/plush\/characters\/ms-june-480\.webp/, r + ': Ms. June portrait (plush library)');
    assert.match(html, /class="ff-guide /, r + ': Ms. June call-out');
    const shown = (html.match(/src="img\/plush\/characters\/(?!booker|lumi|zuri|bop)[a-z-]+-480\.webp"/g) || []).length, labeled = (html.match(/Story-world character/g) || []).length;
    assert.ok(labeled >= shown, `${r}: every story-world grown-up (Ms. June, Principal Hazel, Mr. Moss, Ms. Fern) carries the label (${labeled}/${shown})`);
  }
  assert.match(c.render('teacher-standard'), /What do you notice\? What do you wonder\?/, 'her signature question in the method');
  assert.match(text(c.render('teacher-standard')), /Is Ms\. June a real teacher\? No\./);
  // Wave 4 calm Home: the brief Teacher Standard on Home has no Ms. June; she guides #teacher-standard (checked above) and #friends.
  assert.doesNotMatch(c.window.FFTeacherStandard.callout('home'), /ms-june/, 'no unlabeled Ms. June on Home');
  assert.match(c.render('teacher-standard'), /Story-world character/);
  assert.match(read('teacher-standard.js'), /SC\(\)\.guide\(|SC\(\)\.portrait\(/, 'reuses the supporting-cast helpers');
  assert.doesNotMatch(read('teacher-standard.js'), /community\/ms-june/, 'no duplicated Ms. June markup');
});

test('the teacher video slots play finished story-world videos (gap fill 2026-10-07), labelled as story-world, never staff', () => {
  const c = site(), ts = c.render('teacher-standard'), staff = c.render('train-your-staff');
  assert.match(ts, /data-video-slot="ts-video-welcome"/);
  assert.match(staff, /data-video-slot="ts-video-welcome-staff"/);
  assert.match(ts, /Welcome, teachers &amp; providers/);
  // Gap fill (2026-10-07): the slots play finished story-world videos (no empty "coming soon" frame), labelled as story-world, never staff.
  for (const h of [ts, staff]) {
    assert.doesNotMatch(h, /Video coming soon|not been filmed|Not filmed yet/);
    assert.doesNotMatch(h, /<iframe|youtube|vimeo|autoplay/i);
    assert.match(h, /<video controls playsinline preload="none" poster="video\/academy-welcome-poster\.jpg"/);
    assert.match(h, /not a member of our staff/);
  }
  assert.doesNotMatch(ts, /data-video-slot="ts-video-method"/, 'the empty method frame is gone');
});

test('Train your staff uses the honest open-soon form while no gateway url is set, and the real form when one is', () => {
  const off = site({ intake: 'off' }).render('train-your-staff');
  assert.match(off, /Online requests open soon/);
  assert.match(off, /staff training requests/);
  assert.equal((off.match(/<form/g) || []).length, 0);
  assert.match(off, /data-ffi-preset="staff-training"/);
  const on = site({ intake: 'real' }).render('train-your-staff');
  assert.match(on, /id="ffiContact"/);
  assert.match(on, /<h3>Ask about training your staff<\/h3>/);
  assert.match(on, /<option value="question" selected>/);
  const t = text(on);
  for (const s of ['Director dashboards', 'Time tracking', 'Observation checklists', 'The same courses']) assert.ok(t.includes(s), s);
  assert.match(t, /What it will not do/);
  assert.doesNotMatch(read('teacher-standard.js'), /https?:\/\/[^'"`]*(?:intake|dvolcore)|\bfetch\(|localStorage|sessionStorage|XMLHttpRequest/, 'no hardcoded gateway, no network or storage of its own');
});

test('entry points: main nav, More menu, home band, Enroll, For Families, For Centers, Home Daycares and footer', () => {
  const p = read('premium.js');
  // Wave 6 NAV: the neutral main list is `const mainNav` (rendered into <nav id="nav">); staff see it first in their own list too.
  // Audience split (owner 2026-10-07): the Teacher Standard is a shared page (parents reach it from Home's trust band, programs
  // from the centers menu and the #centers landing); the families' header is four family links.
  assert.match(read('wayfinding.js'), /'teacher-standard': \['Teacher Standard', '', /, 'a shared page (no audience switch)');
  assert.match(read('wayfinding.js'), /\['teacher-standard', 'Teacher Standard'\]/, 'in the centers menu');
  assert.match(read('audiences.js'), /\['teacher-standard', 'Our Teacher Standard'/, 'on the #centers landing');
  assert.match(read('wayfinding.js'), /\['train-your-staff', 'Train your staff'\]/, 'in the centers group of the full-screen menu (wave 6; was the More menu)');
  assert.match(read('home-calm.js'), /window\.FFTeacherStandard \? window\.FFTeacherStandard\.callout\('home'\)/, 'Home trust section (wave 4)');
  const c = site();
  const home = c.window.FFTeacherStandard.callout('home');
  assert.match(home, /href="#teacher-standard"/);
  assert.doesNotMatch(home, /href="#train-your-staff"/, 'wave 4: the staff-training offer is for owners, so it lives on For Centers / Home Daycares (below), not on Home');
  assert.match(home, /not yet approved/);
  const enroll = c.render('enroll');
  assert.ok(enroll.indexOf('href="#teacher-standard"') > enroll.indexOf('id="ffx-why"') && enroll.indexOf('href="#teacher-standard"') < enroll.indexOf('id="ffx-day"'), 'Enroll band sits after Why families choose us');
  assert.match(read('features.js'), /<section id="ffx-day"/, 'the Enroll marker still exists in features.js');
  const fam = c.render('for-families');
  assert.match(fam, /href="#teacher-standard"/);
  assert.ok(fam.indexOf('href="#teacher-standard"') < fam.lastIndexOf('<section class="tight">'), 'before the closing call to action');
  for (const r of ['for-centers', 'for-home']) assert.match(c.render(r), /href="#train-your-staff"/, r);
  assert.match(c.render('for-centers'), /class="wc wc-centers"/, 'the whole-child block on For Centers is kept');
  assert.match(read('teacher-standard.js'), /data-go="teacher-standard"/);
});

test('route meta, index.html wiring and cache-busting', () => {
  const meta = require(path.join(ROOT, 'route-meta.js'));
  for (const r of ROUTES) assert.ok(meta.ROUTES[r] && meta.ROUTES[r][1].length <= 175, r);
  const html = read('index.html'), at = f => html.indexOf(`<script src="${f}`);
  assert.match(html, /<link rel="stylesheet" href="teacher-standard\.css\?v=\d+">/);
  assert.match(html, /<script src="teacher-standard\.js\?v=\d+"><\/script>/);
  assert.ok(at('teacher-standard.js') > at('whole-child.js') && at('teacher-standard.js') > at('features.js') && at('teacher-standard.js') < at('academy-lms.js'));
  assert.ok(+html.match(/premium\.js\?v=(\d+)/)[1] >= 11);
  assert.ok(+html.match(/route-meta\.js\?v=(\d+)/)[1] >= 2);
  assert.ok(+html.match(/supporting-cast\.js\?v=(\d+)/)[1] >= 2);
  assert.ok(+html.match(/supporting-cast\.css\?v=(\d+)/)[1] >= 2);
  assert.ok(+html.match(/features\.js\?v=(\d+)/)[1] >= 15);
  assert.doesNotMatch(read('teacher-standard.css') + read('teacher-standard.js'), /fonts\.googleapis|fonts\.gstatic|@import/);
  for (const f of ['logo-mark.png', 'shield.png']) assert.doesNotMatch(read('teacher-standard.js'), new RegExp(f.replace('.', '\\.')));
});

test('the Enroll careers card no longer says hours are being submitted', () => {
  assert.doesNotMatch(read('features.js'), /being submitted/);
});

test('owner order 2026-10-08: no infant or baby content; rest time is for twos through pre-K', () => {
  const c = site(), api = c.window.FFTeacherStandard;
  const BANNED = /\b(infants?|babies|baby|newborns?|cribs?|play[- ]?yards?|swaddl\w*|pacifiers?|bumpers?|positioners?|sids)\b|safe[- ]sleep|rolling rule|sleeping bab/i;
  for (const r of ROUTES) assert.doesNotMatch(text(c.render(r)), BANNED, r + ' has no infant wording');
  const all = JSON.stringify([api.GATES, api.FURTHER, api.METHOD, api.PILOT, api.CHECKLIST, api.PLAN, api.ASK, api.FAQ, api.OFFER, api.WONT, api.STATUS]);
  assert.doesNotMatch(all, BANNED, 'no infant wording in the page data');
  const list = api.CHECKLIST.join(' | ');
  for (const s of [/labeled cot or mat/, /spaced apart, with clear walkways/, /see each child/, /see and hear every resting child/, /No food, drink or hazard objects on cots/, /Shoes off/, /cords kept away/, /quiet activit/i])
    assert.match(list, s);
  assert.match(text(c.render('teacher-standard')), /What the director checks in the room, within 30 days/);
  assert.match(text(c.render('teacher-standard')), /licensing consultant/);
});
