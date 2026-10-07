// Futures Hub DEMO mode (owner 2026-10-07: "When I click on the Teacher Portal ... I'm not able to put down the plan, log in, check in
// the children ... I need everything operational and working", for client demonstrations). demo-core.js (fake data + demo session) and
// demo-portal.js (screens) make every portal work in the browser with sample data while the real Futures Hub is not hosted.
//   1. demo-core.js in a VM: the demo accounts, the email + password check, the document database (where / onSnapshot / set / delete),
//      memory fallback when storage is blocked, reset, and "off when a real Hub is configured";
//   2. the files: load order, no curriculum (IP lockdown), no network calls, fake data only;
//   3. a real browser at 390 and 1280: Teacher (sign in, Today, check-in/out with times, care log, nap, daily plan, children, area-tagged
//      observation, message with a sample picture, family report), Family (sign in with the documented email + password, the child's
//      day, report, messages, pickup request, friend videos), Director (dashboard, ratios, due items, staff, approvals, enrollment,
//      reports + CSV), Academy (course list, the "Meet the Friends" lesson video, progress, completion record), #account and
//      #reset-password demo flows, Reset demo, blocked storage, axe (no serious or critical issues), no page-wide sideways scroll,
//      and no request leaves the site.
// Screenshots of every step: FF_DEMO_SHOTS=<folder> node --test tests/demo-portal.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const CORE = read('demo-core.js'), SCREENS = read('demo-portal.js'), INDEX = read('index.html'), PORTAL = read('portal.js');

function core({ hub = false, blocked = false } = {}) {
  const mem = {};
  const localStorage = blocked
    ? { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } }
    : { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
  const ctx = { console, Promise, JSON, Date, Math, localStorage, FFHub: hub ? { configured: true } : undefined };
  ctx.window = ctx; vm.createContext(ctx); vm.runInContext(CORE, ctx, { filename: 'demo-core.js' });
  return { D: ctx.FFDemo, mem };
}
const tick = () => new Promise(r => setTimeout(r, 0));

// ---------------------------------------------------------------- 1. the data layer
test('demo accounts: role buttons and the documented email + password open the demo; anything else does not', () => {
  const { D, mem } = core();
  assert.deepEqual([...D.ACCOUNTS.map(a => a.key)], ['teacher', 'director', 'family', 'academy', 'staff']);
  for (const a of D.ACCOUNTS) { assert.match(a.email, /^[a-z]+@demo\.futuresfriends$/, 'a fake address that cannot be anybody\'s'); assert.equal(a.password, 'demo'); }
  assert.equal(D.session(), null);
  assert.equal(D.signInWith('teacher@demo.futuresfriends', 'wrong'), null);
  assert.equal(D.signInWith('someone@gmail.com', 'demo'), null);
  const s = D.signInWith(' Teacher@Demo.FuturesFriends ', 'demo');
  assert.equal(s.role, 'teacher'); assert.equal(s.name, 'Ms. Alana P.');
  assert.ok(!JSON.stringify(mem).includes('"demo"') || !/password/i.test(mem['ff-demo-session-v1']), 'the password is never stored');
  assert.doesNotMatch(mem['ff-demo-session-v1'], /password|demo"/);
  D.signOut(); assert.equal(D.session(), null);
  assert.equal(D.signIn('family').role, 'family'); assert.deepEqual([...D.familyKids()], ['d5']);
});

test('the demo database: where + onSnapshot, set and delete notify listeners, data survives a new page (storage) and reset puts the sample back', async () => {
  const { D, mem } = core();
  D.signIn('teacher');
  const seen = [];
  const stop = D.db.collection('kidday').where('date', '==', D.todayIso()).onSnapshot(q => seen.push(q.docs.map(d => d.id)));
  assert.equal(seen.length, 1, 'the first snapshot arrives at once');
  assert.ok(seen[0].includes(`d5_${D.todayIso()}`), 'Mia is checked in this morning');
  assert.ok(!seen[0].includes(`d8_${D.todayIso()}`), 'Kai is not here yet: the teacher checks him in during the demo');
  await D.db.collection('kidday').doc(`d8_${D.todayIso()}`).set({ kid: 'd8', date: D.todayIso(), present: true, inAt: Date.now() });
  await tick();
  assert.ok(seen.at(-1).includes(`d8_${D.todayIso()}`), 'a write reaches the listener');
  await D.db.collection('kidday').doc(`d8_${D.todayIso()}`).delete(); await tick();
  assert.ok(!seen.at(-1).includes(`d8_${D.todayIso()}`));
  stop();
  await D.put('plans', 'demo_2099-01-05', { title: 'x' });
  const again = core(); Object.assign(again.mem, mem);   // a new page in the same browser
  const D2 = (() => { const c = { console, Promise, JSON, Date, Math, localStorage: { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = v; }, removeItem: k => { delete mem[k]; } } }; c.window = c; vm.createContext(c); vm.runInContext(CORE, c); return c.FFDemo; })();
  assert.equal(D2.get('plans', 'demo_2099-01-05').title, 'x', 'kept in this browser');
  assert.equal(D2.session().role, 'teacher', 'still signed in');
  D2.reset();
  assert.equal(D2.get('plans', 'demo_2099-01-05'), null, 'reset puts the sample data back');
  assert.ok(D2.get('apps', 'a1'), 'the sample enrollment application is back');
  assert.throws(() => D2.db.collection('secrets'), /Unknown collection/);
});

test('blocked storage: the demo still works for this page, in memory', async () => {
  const { D } = core({ blocked: true });
  assert.equal(D.signIn('director').role, 'director');
  await D.put('dues', 'q1', Object.assign(D.get('dues', 'q1'), { done: true }));
  assert.equal(D.get('dues', 'q1').done, true);
  assert.equal(D.persistent(), false);
});

test('off when a real Futures Hub is configured: no demo sign-in, no demo session', () => {
  const { D } = core({ hub: true });
  assert.equal(D.enabled(), false);
  assert.equal(D.signIn('teacher'), null);
  assert.equal(D.session(), null);
});

test('sample data only: invented children (first name + last initial), the demo center, no real-looking contact details', () => {
  const { D } = core(); D.signIn('teacher');
  const kids = Object.values(D.all('kids'));
  assert.ok(kids.length >= 15);
  for (const k of kids) { assert.match(k.first, /^[A-Z][a-z]+$/); assert.match(k.last, /^[A-Z]$/); }
  assert.match(D.CENTER, /^Futures Learning Center/);
  const all = JSON.stringify(D._seed());
  assert.doesNotMatch(all, /@(?!demo\.futuresfriends)[a-z0-9-]+\.[a-z]{2,}/i, 'no email addresses');
  assert.doesNotMatch(all, /\(\d{3}\)\s?\d{3}-\d{4}|\b\d{3}-\d{3}-\d{4}\b/, 'no phone numbers');
  for (const a of Object.values(D.all('apps'))) assert.match(a.guardian, /sample parent/);
});

// ---------------------------------------------------------------- 2. the files
test('index.html: demo-core.js loads before portal.js, demo-portal.js after the portal and Academy screens it wraps, with cache-busting', () => {
  const at = f => INDEX.search(new RegExp(`<script src="${f.replace('.', '\\.')}\\?v=\\d+"></script>`));
  assert.ok(at('demo-core.js') > 0 && at('demo-core.js') < at('portal.js'));
  for (const f of ['portal.js', 'academy-lms.js', 'this-week.js', 'hub-auth.js', 'views.js', 'enroll-desk.js', 'center-setup.js', 'director-due.js']) assert.ok(at(f) > 0 && at(f) < at('demo-portal.js'), f);
  assert.match(INDEX, /<link rel="stylesheet" href="demo-portal\.css\?v=\d+">/);
  assert.match(PORTAL, /window\.FFDemo && window\.FFDemo\.enabled\(\) && window\.FFDemo\.session\(\)\) \{ connectDemo\(\); return; \}/);
  assert.ok(PORTAL.indexOf('window.FFHub.boot(); return;') < PORTAL.indexOf('connectDemo(); return;'), 'a configured Hub always wins over the demo');
});

test('IP lockdown: the demo carries no curriculum and calls no network', () => {
  for (const [f, s] of [['demo-core.js', CORE], ['demo-portal.js', SCREENS]]) {
    assert.doesNotMatch(s, /fetch\(|XMLHttpRequest|sendBeacon|WebSocket|supabase|navigator\.sendBeacon/, `${f}: no network`);
    assert.doesNotMatch(s, /"age_adaptations"|"prompts":\s*\[|FFUnit1Data|unit\d-(data|prep|family)\.js|curriculum-indicators/, `${f}: no lesson records`);
  }
  // the only licensed-program piece it points to is the public, watermarked Day 9 sample
  assert.match(SCREENS, /printables\/sample\/ff-sample-u1-day-09-teacher-packet\.pdf/);
  assert.doesNotMatch(SCREENS + CORE, /printables\/unit-/);
  assert.match(SCREENS, /This planner holds your own plans\. The demo does not include the licensed day plans\./);
  for (const f of fs.readdirSync(path.join(ROOT, 'img/demo'))) assert.match(f, /^sample-photo-[a-z]+\.svg$/);
});

// ---------------------------------------------------------------- 3. the real browser
const H = () => import('./a11y-harness.mjs');
let h, srv, browser;
const SHOTS = process.env.FF_DEMO_SHOTS || '';
test.before(async () => { h = await H(); srv = await h.startSite(); browser = await h.loadChromium().launch(); if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true }); });
test.after(async () => { if (browser) await browser.close(); if (srv) await srv.close(); });

async function openPage(width, opts = {}) {
  const { ctx, page, errors } = await h.open(browser, width, opts);
  const offsite = [];
  page.on('request', r => { const u = r.url(); if (!u.startsWith(srv.base) && !u.startsWith('data:') && !u.startsWith('blob:')) offsite.push(u); });
  await ctx.addInitScript(() => { try { localStorage.setItem('ff-sound', 'off'); } catch (_) {} });
  return { ctx, page, errors, offsite };
}
const text = async page => (await page.evaluate(() => document.querySelector('#view').innerText)).replace(/\s+/g, ' ');
let n = 0;
const shot = async (page, width, name) => { if (!SHOTS) return; await page.waitForTimeout(200); await page.screenshot({ path: path.join(SHOTS, `${width}-${String(++n).padStart(2, '0')}-${name}.png`) }); };
const settle = page => page.waitForTimeout(250);
async function noSideScroll(page, where) {
  const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
  assert.ok(r.sw <= r.w + 1, `${where}: the page scrolls sideways (${r.sw} > ${r.w})`);
}
async function axeClean(page, where) {
  await page.evaluate(() => { const t = document.getElementById('toast'); if (t) t.hidden = true; window.scrollTo(0, 0); });   // the 2.4 s toast is not a target; nothing sits under the sticky header
  const v = (await h.axe(page, { include: '#view' })).filter(x => h.BLOCKING.includes(x.impact));
  assert.deepEqual(v, [], `${where}: axe ${JSON.stringify(v, null, 1)}`);
}
async function signIn(page, key) { await page.click(`[data-demo-signin="${key}"]`); await page.waitForTimeout(500); }

for (const width of [390, 1280]) {
  test(`teacher flow at ${width}: sign in, Today, check-in and pickup with times, care log, nap, daily plan, children, observation, message, family report`, async () => {
    const { ctx, page, errors, offsite } = await openPage(width);
    await h.goto(page, srv.base, 'portal', 500);
    let t = await text(page);
    assert.match(t, /Sign in with a demo account to open the Teacher Portal/);
    assert.match(t, /Demo · sample data, resets anytime/);
    assert.match(t, /teacher@demo\.futuresfriends/);
    await shot(page, width, 'teacher-signin'); await axeClean(page, 'sign-in'); await noSideScroll(page, 'sign-in');
    await signIn(page, 'teacher');
    assert.match(page.url(), /#portal$/);
    t = await text(page);
    assert.match(t, /Teacher Portal Demo Classroom/);
    assert.match(t, /Signed in as Ms\. Alana P\. \(Demo Teacher\)/);
    assert.match(t, /Today's plan Approved Kind hands at the block center/);
    assert.match(t, /6 checked in · 0 picked up · 2 not here yet/);
    await shot(page, width, 'teacher-today'); await axeClean(page, 'Today'); await noSideScroll(page, 'Today');

    // check-in: Kai arrives, a potty entry, a nap, Amara is picked up
    await page.click('[data-ptab="checkin"]'); await settle(page);
    assert.match(await text(page), /Kai Z\. Not here yet/);
    await page.click('[data-dm="checkin"][data-child="d8"]'); await settle(page);
    t = await text(page);
    assert.match(t, /Kai Z\. Checked in \d{1,2}:\d\d [AP]M by Family/);
    await page.click('[data-dm="care"][data-child="d8"][data-t="Potty"]'); await settle(page);
    assert.match(await text(page), /Kai Z\. Checked in [^]*?Potty \d{1,2}:\d\d [AP]M/);
    await page.click('[data-dm="napstart"][data-child="d5"]'); await settle(page);
    assert.match(await text(page), /Nap since \d{1,2}:\d\d [AP]M · end/);
    await page.click('[data-dm="napend"][data-child="d5"]'); await settle(page);
    assert.match(await text(page), /Mia C\. [^]*?Rest: Under 30 min/);
    await page.click('[data-dm="outask"][data-child="d1"]'); await settle(page);
    await page.selectOption('#dmOut_d1', 'Grandparent (on the pickup list)');
    await shot(page, width, 'teacher-checkout');
    await page.click('[data-dm="checkout"][data-child="d1"]'); await settle(page);
    t = await text(page);
    assert.match(t, /Amara B\. Picked up \d{1,2}:\d\d [AP]M by Grandparent \(on the pickup list\)/);
    assert.match(t, /6 Here now 1 Not here yet 1 Picked up/);
    await shot(page, width, 'teacher-checkin'); await axeClean(page, 'Check-in'); await noSideScroll(page, 'Check-in');

    // daily plan: write Monday's plan with the six steps and submit it; the public sample day is there to look at
    await page.click('[data-ptab="plans"]'); await settle(page);
    t = await text(page);
    assert.match(t, /Sample day from the licensed program Day 9: Kind Hands, Kind Words/);
    assert.ok(await page.$('a[href="printables/sample/ff-sample-u1-day-09-teacher-packet.pdf"]'));
    const empty = await page.evaluate(() => [...document.querySelectorAll('.ffd-day')].find(b => /No plan yet/.test(b.innerText))?.dataset.day);
    assert.ok(empty, 'a day this week without a plan');
    await page.click(`.ffd-day[data-day="${empty}"]`); await settle(page);
    await page.click('[data-dm="plansubmit"]'); await settle(page);
    assert.match(await page.textContent('#dmPlanMsg'), /Give the plan a title first/);
    await page.fill('#dmTitle', 'Demo plan: shapes all around us');
    await page.selectOption('#dmFriend', 'zuri'); await page.selectOption('#dmArea', 'cog');
    await page.fill('#dmStep_watch', 'Zuri puppet hello.'); await page.fill('#dmStep_talk', 'Ask: what shapes do you see?');
    await page.fill('#dmStep_do', 'Shape hunt with clipboards.'); await page.fill('#dmStep_move', 'Make a circle with our bodies.');
    await page.fill('#dmStep_explore', 'Discovery zone: shape sorter.'); await page.fill('#dmStep_home', 'Find three circles at home.');
    await page.click('[data-dm="plansubmit"]'); await settle(page);
    t = await text(page);
    assert.match(t, /Waiting for approval/);
    assert.match(await page.textContent('#dmPlanMsg'), /Submitted/);
    assert.equal(await page.inputValue('#dmTitle'), 'Demo plan: shapes all around us');
    await shot(page, width, 'teacher-plan'); await axeClean(page, 'Daily plan'); await noSideScroll(page, 'Daily plan');

    // back to today (the date picker)
    await page.fill('#pDate', await page.evaluate(() => window.FFDemo.todayIso())); await settle(page);
    // children: lunch for Mia; progress: an area-tagged note shared with the family
    await page.click('[data-ptab="children"]'); await settle(page);
    await page.selectOption('#l_d5', 'All'); await settle(page);
    await page.click('[data-ptab="progress"]'); await settle(page);
    await page.click('[data-p2kid="d5"]'); await settle(page);
    await page.selectOption('#p2ObsArea', 'lang'); await page.selectOption('#p2ObsLvl', 'developing');
    await page.fill('#p2ObsText', 'Mia retold the bus story in order, first to last.');
    await page.selectOption('#p2ObsPhotoDemo', 'img/demo/sample-photo-story.svg');
    await page.check('#p2ObsShare');
    await page.click('[data-p2="saveobs"]'); await settle(page);
    t = await text(page);
    assert.match(t, /Language and Literacy · [A-Z][a-z]{2}, [A-Z][a-z]{2} \d+ · Developing Mia retold the bus story/);
    assert.match(t, /Shared with family/);
    await shot(page, width, 'teacher-progress'); await axeClean(page, 'Progress');

    // messages: a note to Mia's family and a photo moment with a sample picture (no upload control in the demo)
    await page.click('[data-ptab="messages"]'); await settle(page);
    assert.equal(await page.$('input[type="file"]'), null, 'no upload control in the demo');
    await page.click('[data-p2mk="d5"]'); await settle(page);
    await page.fill('#p2Msg', 'Mia painted a big green tree today!');
    await page.click('[data-p2="send"]'); await settle(page);
    assert.match(await text(page), /Mia painted a big green tree today!/);
    await page.selectOption('#p2MomKid', 'd5'); await page.fill('#p2MomCap', 'Painting a tree');
    await page.selectOption('#p2MomFileDemo', 'img/demo/sample-photo-painting.svg');
    await page.click('[data-p2="postmoment"]'); await settle(page);
    assert.ok(await page.$('.p2-strip img[src="img/demo/sample-photo-painting.svg"]'), 'the photo moment shows');
    await shot(page, width, 'teacher-messages'); await axeClean(page, 'Messages');

    // family reports: preview Mia's, then send it
    await page.click('[data-ptab="reports"]'); await settle(page);
    await page.click('[data-dm="repopen"][data-child="d5"]'); await settle(page);
    t = await text(page);
    assert.match(t, /Arrived: \d{1,2}:\d\d [AP]M \(Sam C\. \(family\)\)/);
    assert.match(t, /Today with Lumi: Kind hands at the block center/);
    assert.match(t, /lunch All/);
    assert.match(t, /Mia retold the bus story in order/);
    await page.click('[data-dm="repsend"][data-child="d5"]'); await settle(page);
    assert.match(await text(page), /Mia C\. Sent \d{1,2}:\d\d [AP]M/);
    await shot(page, width, 'teacher-reports'); await axeClean(page, 'Family reports'); await noSideScroll(page, 'Family reports');

    // everything is still there after a reload
    await page.reload(); await page.waitForTimeout(700);
    await page.click('[data-ptab="checkin"]'); await settle(page);
    assert.match(await text(page), /Amara B\. Picked up/);
    // the checklist and other tabs still work in the demo
    for (const tab of ['calendar', 'lunch', 'account', 'setup', 'curriculum']) { await page.click(`[data-ptab="${tab}"]`); await settle(page); assert.ok((await text(page)).length > 200, tab); }
    assert.deepEqual(errors, []);
    assert.deepEqual(offsite, [], 'nothing leaves the site');
    await ctx.close();
  });
}

test('family flow (390): sign in with the documented email + password, see only Mia: check-in time, plan, report, messages, pickup request, friend videos', async () => {
  const width = 390;
  const { ctx, page, errors, offsite } = await openPage(width);
  // the teacher sends Mia's report first (same browser = same demo data)
  await h.goto(page, srv.base, 'signin-teacher', 400);
  await signIn(page, 'teacher');
  await page.click('[data-ptab="reports"]'); await settle(page);
  await page.click('[data-dm="repsend"][data-child="d5"]'); await settle(page);
  await page.click('[data-demo="signout"]'); await page.waitForTimeout(800);
  await h.goto(page, srv.base, 'family-portal', 500);
  assert.match(await text(page), /Sign in with the demo family account/);
  await page.fill('#ffdEmail', 'family@demo.futuresfriends'); await page.fill('#ffdPass', 'nope');
  await page.click('#ffdSigninForm button[type="submit"]'); await settle(page);
  assert.match(await page.textContent('#ffdMsg'), /not one of the demo accounts/);
  assert.equal(await page.inputValue('#ffdPass'), '', 'a wrong password is cleared');
  await page.fill('#ffdPass', 'demo');
  await page.click('#ffdSigninForm button[type="submit"]'); await page.waitForTimeout(600);
  assert.match(page.url(), /#family-portal$/);
  const t = await text(page);
  assert.match(t, /Signed in as Sam C\. \(Demo Family\)/);
  assert.deepEqual(await page.$$eval('#fKid option', o => o.map(x => x.textContent)), ['Mia C.'], 'only their own child');
  assert.match(t, /Arrival and pickup Here now Checked in \d{1,2}:\d\d [AP]M by Sam C\. \(family\)/);
  assert.match(t, /Today in Demo Classroom Kind hands at the block center with Lumi/);
  assert.match(t, /Mia's daily report Sent \d{1,2}:\d\d [AP]M/);
  assert.match(t, /Mia's daily report for [A-Z][a-z]{2}, [A-Z][a-z]{2} \d+ is ready in the Family Portal/);
  for (const f of ['booker', 'lumi', 'zuri', 'bop']) assert.ok(await page.$(`a.ffd-vid[href="#activities/${f}"]`), f);
  for (const r of ['this-week', 'at-home', 'story-time', 'bop-at-home']) assert.ok(await page.$(`.ffd-links a[href="#${r}"]`), r);
  await shot(page, width, 'family-day'); await axeClean(page, 'Family Portal'); await noSideScroll(page, 'Family Portal');
  await page.fill('#p2FMsg', 'Thank you! Grandpa Joe picks up today.');
  await page.click('[data-p2="fsend"]'); await settle(page);
  assert.match(await text(page), /Thank you! Grandpa Joe picks up today\./);
  await page.fill('#dmPuName', 'Aunt Kim T.'); await page.fill('#dmPuRel', 'Aunt');
  await page.click('#dmPickupForm button[type="submit"]'); await settle(page);
  assert.match(await text(page), /Aunt Kim T\. \(Aunt\) Waiting for the director/);
  await shot(page, width, 'family-messages');
  // a family cannot open the Teacher Portal
  await h.goto(page, srv.base, 'portal', 400);
  assert.match(await text(page), /This portal is for teachers and directors/);
  assert.deepEqual(errors, []); assert.deepEqual(offsite, []);
  await ctx.close();
});

for (const width of [390, 1280]) {
  test(`director flow at ${width}: dashboard (attendance, ratios, due), staff on duty, approvals, enrollment desk, reports + CSV`, async () => {
    const { ctx, page, errors, offsite } = await openPage(width, { context: { acceptDownloads: true } });
    await h.goto(page, srv.base, 'signin-teacher', 400);
    await signIn(page, 'director');
    let t = await text(page);
    assert.match(t, /Director Portal/);
    assert.match(t, /Children here now \/ enrolled/);
    assert.match(t, /Rooms right now/);
    assert.match(t, /Demo Classroom · 8 enrolled 6 Ms\. Alana P\., Mr\. Devin K\. 2:6 · In ratio/);
    assert.match(t, /What's due 1 overdue Fire extinguisher monthly check Safety · was due/);
    await shot(page, width, 'director-dashboard'); await axeClean(page, 'Dashboard'); await noSideScroll(page, 'Dashboard');
    await page.click('[data-dm="duedone"][data-id="q1"]'); await settle(page);
    assert.match(await text(page), /What's due Nothing overdue/);
    // staff: Priya clocks out, the Twos Room drops out of ratio
    await page.click('[data-ptab="staff"]'); await settle(page);
    await page.click('[data-dm="duty"][data-id="s-priya"]'); await settle(page);
    assert.match(await text(page), /Ms\. Priya S\. · Lead teacher [^]*?Off · clock in/);
    await page.fill('#dmStName', 'Ms. Rosa V.'); await page.selectOption('#dmStRole', 'Floater');
    await page.click('#dmStaffForm button[type="submit"]'); await settle(page);
    assert.match(await text(page), /Ms\. Rosa V\. · Floater/);
    await shot(page, width, 'director-staff'); await axeClean(page, 'Staff'); await noSideScroll(page, 'Staff');
    await page.click('[data-ptab="dash"]'); await settle(page);
    assert.match(await text(page), /Twos Room · 4 enrolled \d+ Nobody 0:\d+ · Out of ratio/);
    // approvals: tomorrow's plan from the teacher, the family's pickup request
    await page.click('[data-ptab="approvals"]'); await settle(page);
    t = await text(page);
    assert.match(t, /Counting leaves outside/);
    await page.click('[data-dm="revopen"][data-id^="demo_"]'); await settle(page);
    assert.match(await text(page), /Leaf toss/);
    const pid = await page.getAttribute('[data-dm="planok"]', 'data-id');
    await page.click(`[data-dm="planback"][data-id="${pid}"]`); await settle(page);
    await page.fill(`#dmRevNote_${pid}`, 'Add a rain plan, please.');
    await page.click(`[data-dm="planback"][data-id="${pid}"]`); await settle(page);
    assert.match(await text(page), /Returned with a note/);
    await page.click('[data-dm="reqok"][data-id="r1"]'); await settle(page);
    await shot(page, width, 'director-approvals'); await axeClean(page, 'Approvals'); await noSideScroll(page, 'Approvals');
    // enrollment desk: Sofia's application is accepted into the Demo Classroom; a new inquiry is added
    await page.click('[data-ptab="enroll"]'); await settle(page);
    await page.click('[data-dm="enrollask"][data-id="a1"]'); await settle(page);
    await page.selectOption('#dmEnRoom_a1', 'demo');
    await page.click('[data-dm="enrollok"][data-id="a1"]'); await settle(page);
    assert.match(await text(page), /Enrolled 1 Sofia R\./);
    await page.fill('#dmApChild', 'Rafi K.'); await page.fill('#dmApGuardian', 'Dee K.');
    await page.click('#dmAppForm button[type="submit"]'); await settle(page);
    assert.match(await text(page), /New inquiries 2 Rafi K\./);
    await page.click('[data-dm="tourask"][data-id="a3"]'); await settle(page);
    await page.fill('#dmTour_a3', '2026-12-01T10:00');
    await page.click('[data-dm="tourbook"][data-id="a3"]'); await settle(page);
    assert.match(await text(page), /Tours booked 2/);
    await shot(page, width, 'director-enrollment'); await axeClean(page, 'Enrollment'); await noSideScroll(page, 'Enrollment');
    await page.click('[data-ptab="children"]'); await settle(page);
    assert.match(await text(page), /Sofia R\./, 'the new child is in the room');
    // reports: the week table and a CSV of demo data
    await page.click('[data-ptab="dreports"]'); await settle(page);
    assert.match(await text(page), /Attendance · week of/);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-dm="csv"]')]);
    assert.match(dl.suggestedFilename(), /^demo-attendance-\d{4}-\d\d-\d\d\.csv$/);
    const csv = fs.readFileSync(await dl.path(), 'utf8');
    assert.match(csv, /^# DEMO sample data, made up\n"date","room","child","status"/);
    await shot(page, width, 'director-reports'); await axeClean(page, 'Reports'); await noSideScroll(page, 'Reports');
    assert.deepEqual(errors, []); assert.deepEqual(offsite, []);
    await ctx.close();
  });
}

for (const width of [390, 1280]) {
  test(`academy flow at ${width}: staff sign-in, course list, the "Meet the Friends" sample lesson video, progress, completion record`, async () => {
    const { ctx, page, errors, offsite } = await openPage(width);
    await h.goto(page, srv.base, 'learn', 500);
    assert.match(await text(page), /Sign in to the Academy demo/);
    await signIn(page, 'academy');
    assert.match(page.url(), /#learn$/);
    let t = await text(page);
    assert.match(t, /Signed in as Mr\. Devin K\. \(Demo Academy staff\)/i);
    assert.match(t, /F-101 · 1\.5 clock hours/);
    assert.match(t, /0 of 3 lessons done/);
    await shot(page, width, 'academy-list'); await axeClean(page, 'My training'); await noSideScroll(page, 'My training');
    await page.click('a[href="#learn-course/F-101"]'); await page.waitForTimeout(500);
    const v = await page.$eval('#dmVideo', el => ({ src: el.getAttribute('src'), tracks: el.querySelectorAll('track').length, controls: el.controls }));
    assert.equal(v.src, 'video/academy-welcome.mp4'); assert.ok(v.tracks >= 1, 'captions'); assert.ok(v.controls);
    await shot(page, width, 'academy-lesson'); await axeClean(page, 'Lesson'); await noSideScroll(page, 'Lesson');
    await page.click('[data-dm="lessondone"][data-k="meet"]'); await settle(page);
    assert.match(await text(page), /1 of 3 lessons done/);
    await page.click('[data-dm="lessondone"][data-k="loop"]'); await settle(page);
    await page.check('input[name="q1"][value="Zuri"]'); await page.check('input[name="q2"][value="Six"]'); await page.check('input[name="q3"][value="As words with dated teacher notes"]');
    await page.click('#dmQuiz button[type="submit"]'); await settle(page);
    assert.match(await page.textContent('#dmQuizMsg'), /2 of 3 right/);
    await page.check('input[name="q1"][value="Lumi"]');
    await page.click('#dmQuiz button[type="submit"]'); await settle(page);
    t = await text(page);
    assert.match(t, /Completion record · demo, not a real certificate/);
    assert.match(t, /3 of 3 lessons done/);
    await shot(page, width, 'academy-complete');
    await page.click('[data-go="learn"]'); await settle(page);
    assert.match(await text(page), /1\.5 Clock hours completed/);
    await page.click('[data-dm="lmsadd"][data-code="F-102"]'); await settle(page);
    assert.match(await text(page), /F-102 · 1\.5 clock hours/);
    assert.deepEqual(errors, []); assert.deepEqual(offsite, []);
    await ctx.close();
  });
}

test('#account and #reset-password run demo flows; Reset demo puts the sample back; blocked storage still works', async () => {
  const width = 390;
  const { ctx, page, errors, offsite } = await openPage(width);
  await h.goto(page, srv.base, 'reset-password', 400);
  await page.fill('#dmRsEmail', 'someone@example.org'); await page.click('#dmResetEmail button[type="submit"]'); await settle(page);
  assert.match(await page.textContent('#dmRsMsg'), /Only the demo accounts exist/);
  await page.fill('#dmRsEmail', 'teacher@demo.futuresfriends'); await page.click('#dmResetEmail button[type="submit"]'); await settle(page);
  await page.fill('#dmRsNew', 'short'); await page.fill('#dmRsNew2', 'short'); await page.click('#dmResetPw button[type="submit"]'); await settle(page);
  assert.match(await page.textContent('#dmRsMsg'), /at least 10/);
  await page.fill('#dmRsNew', 'purple tiger lamp'); await page.fill('#dmRsNew2', 'purple tiger lamp'); await page.click('#dmResetPw button[type="submit"]'); await settle(page);
  assert.match(await text(page), /Password updated \(demo\)/);
  await shot(page, width, 'reset-password'); await axeClean(page, 'Reset password');
  await page.click('[data-dm="resetdone"]'); await settle(page);
  assert.match(page.url(), /#signin-teacher$/);
  await signIn(page, 'teacher');
  await h.goto(page, srv.base, 'account', 400);
  let t = await text(page);
  assert.match(t, /Ms\. Alana P\. Demo Teacher · teacher@demo\.futuresfriends/);
  await page.fill('#dmPwCur', 'demo'); await page.fill('#dmPwNew', 'river stone kite'); await page.fill('#dmPwNew2', 'river stone kite');
  await page.click('#dmPwForm button[type="submit"]'); await settle(page);
  assert.match(await page.textContent('#dmPwMsg'), /accepted \(demo\)/);
  await page.click('[data-dm="mfasetup"]'); await settle(page);
  await page.fill('#dmMfaCode', '123456'); await page.click('#dmMfaForm button[type="submit"]'); await settle(page);
  assert.match(await text(page), /On \(demo\)/);
  await shot(page, width, 'account'); await axeClean(page, 'Account'); await noSideScroll(page, 'Account');
  // change something, then Reset demo (two clicks) puts it back
  await h.goto(page, srv.base, 'portal', 500);
  await page.click('[data-ptab="checkin"]'); await settle(page);
  await page.click('[data-dm="checkin"][data-child="d8"]'); await settle(page);
  assert.doesNotMatch(await text(page), /Kai Z\. Not here yet/);
  await page.click('[data-demo="reset"]'); await settle(page);
  assert.match(await page.textContent('[data-demo="reset"]'), /Click again/);
  await page.click('[data-demo="reset"]'); await page.waitForTimeout(900);
  await page.click('[data-ptab="checkin"]'); await settle(page);
  assert.match(await text(page), /Kai Z\. Not here yet/, 'the sample data is back');
  assert.match(await text(page), /Signed in as Ms\. Alana P\./, 'still signed in after a reset');
  assert.deepEqual(errors, []); assert.deepEqual(offsite, []);
  await ctx.close();
  // blocked storage: the demo works for this page
  const b = await openPage(width);
  await b.ctx.addInitScript(() => { const thrower = () => { throw new DOMException('blocked', 'SecurityError'); }; Object.defineProperty(window, 'localStorage', { get: thrower, configurable: true }); });
  await h.goto(b.page, srv.base, 'portal', 500);
  await signIn(b.page, 'teacher');
  await b.page.click('[data-ptab="checkin"]'); await settle(b.page);
  await b.page.click('[data-dm="checkin"][data-child="d8"]'); await settle(b.page);
  assert.match(await text(b.page), /Kai Z\. Checked in/);
  assert.deepEqual(b.errors, []);
  await b.ctx.close();
});

// ---------------------------------------------------------------- self-serve centers (mirrors the platform's multi-tenant model)
test('centers: three demo centers, each its own space; a new center starts empty; data never mixes; reset removes made-up centers', () => {
  const { D, mem } = core();
  assert.deepEqual([...D.centers().map(c => c.id)], ['flc', 'sunshine', 'grace']);
  assert.deepEqual([...D.centers().map(c => c.type)], ['child_care', 'child_care', 'church']);
  const names = id => { D.signIn('teacher', id); return Object.values(D.all('kids')).map(k => `${k.first} ${k.last}`); };
  const sun = names('sunshine'), grace = names('grace'), flc = names('flc');
  assert.equal(sun.length, 17); assert.equal(grace.length, 17);
  assert.deepEqual(sun.filter(n => grace.includes(n) || flc.includes(n)), [], 'no child appears in two centers');
  D.signIn('teacher', 'sunshine'); assert.equal(D.session().name, 'Ms. Tara J.'); assert.equal(D.center().name, 'Sunshine Daycare (demo)');
  D.put('plans', 'demo_2099-01-05', { title: 'Sunshine only' });
  D.switchCenter('grace'); assert.equal(D.get('plans', 'demo_2099-01-05'), null, 'a Sunshine plan is not in Grace');
  assert.equal(D.session().center, 'grace'); assert.equal(D.session().name, 'Ms. Hope K.');
  assert.ok(mem['ff-demo-db-v1:sunshine'] && mem['ff-demo-db-v1:grace'], 'separate storage per center');
  D.signIn('director', 'grace'); assert.equal(D.session().owner, true); assert.match(D.session().label, /, owner/);
  const c = D.createCenter({ name: 'Little Acorns (demo)', type: 'church', state: 'KS', color: '#2E9E57', ownerName: 'Ms. Kim R.' });
  assert.equal(c.slug, 'little-acorns-demo'); assert.equal(D.bySlug('little-acorns-demo').id, c.id);
  assert.equal(D.createCenter({ name: 'Little Acorns (demo)' }).slug, 'little-acorns-demo-2', 'slugs stay unique');
  D.signIn('director', c.id);
  assert.equal(Object.keys(D.all('kids')).length, 0, 'a new center starts with no children');
  assert.equal(D.session().name, 'Ms. Kim R.');
  assert.deepEqual([...D.familyKids()], []);
  D.reset();
  assert.equal(D.centers().length, 3, 'reset removes the made-up centers');
  assert.equal(D.session().center, 'flc', 'and moves the person back to a demo center');
});

test('start your center (390): create a church center, Get started, invite staff and a family, its own sign-in page, the switcher keeps centers apart', async () => {
  const width = 390;
  const { ctx, page, errors, offsite } = await openPage(width);
  await h.goto(page, srv.base, 'start-center', 500);
  await axeClean(page, 'Start your center'); await noSideScroll(page, 'Start your center');
  await page.click('#dmStartForm button[type="submit"]'); await settle(page);
  assert.match(await page.textContent('#dmScMsg'), /Give your center a name/);
  await page.fill('#dmScName', 'Little Acorns Preschool (demo)');
  await page.check('input[name="dmScType"][value="church"]'); await page.selectOption('#dmScState', 'KS');
  await page.check('input[name="dmScColor"][value="#2E9E57"]'); await page.fill('#dmScOwner', 'Ms. Kim R.');
  await shot(page, width, 'start-center');
  await page.click('#dmStartForm button[type="submit"]'); await page.waitForTimeout(1200);
  assert.match(page.url(), /#portal$/);
  let t = await text(page);
  assert.match(t, /Director Portal/);
  assert.match(t, /Little Acorns Preschool \(demo\) Church program · KS/);
  assert.match(t, /Signed in as Ms\. Kim R\. \(Demo Director, owner\)/);
  assert.match(t, /Get started with Little Acorns Preschool \(demo\) 2 of 5 done/);
  assert.match(t, /#c\/little-acorns-preschool-demo/);
  await shot(page, width, 'get-started'); await axeClean(page, 'Get started'); await noSideScroll(page, 'Get started');
  await page.click('.ffd-gslist [data-ptab="invite"]'); await settle(page);
  await page.fill('#dmIsName', 'Ms. Rosa V.'); await page.click('#dmInvStaff button[type="submit"]'); await settle(page);
  await page.fill('#dmIfParent', 'Dee K.'); await page.fill('#dmIfChild', 'Rafi K.'); await page.click('#dmInvFam button[type="submit"]'); await settle(page);
  t = await text(page);
  assert.match(t, /Ms\. Rosa V\. Invitation sent/); assert.match(t, /Dee K\. · Rafi K\. Invitation sent/);
  await axeClean(page, 'Invite'); await noSideScroll(page, 'Invite');
  for (const b of await page.$$('[data-dm="invaccept"]')) { await page.click('[data-dm="invaccept"]'); await settle(page); }
  assert.match(await text(page), /Ms\. Rosa V\. Joined/);
  await shot(page, width, 'invites');
  await page.click('[data-ptab="dash"]'); await settle(page);
  assert.match(await text(page), /4 of 5 done/);
  // the center's own sign-in page
  await page.click('[data-demo="signout"]'); await page.waitForTimeout(800);
  await h.goto(page, srv.base, 'c/little-acorns-preschool-demo', 500);
  t = await text(page);
  assert.match(t, /Center sign-in Little Acorns Preschool \(demo\) Church program · KS/i);
  assert.match(t, /Sign in as Demo Family Dee K\. · Rafi K\.’s family/);
  await shot(page, width, 'center-signin'); await axeClean(page, 'Center sign-in');
  await page.click('[data-demo-signin="family"]'); await page.waitForTimeout(600);
  assert.deepEqual(await page.$$eval('#fKid option', o => o.map(x => x.textContent)), ['Rafi K.'], 'the invited family sees their child');
  // the switcher: Sunshine and Grace each show only their own children
  await page.click('[data-demo="signout"]'); await page.waitForTimeout(800);
  await h.goto(page, srv.base, 'c/sunshine-daycare', 500);
  await page.click('[data-demo-signin="director"]'); await page.waitForTimeout(600);
  await page.click('[data-ptab="children"]'); await settle(page); await page.selectOption('#pRoom', 'demo'); await settle(page);
  t = await text(page);
  assert.match(t, /Harper L\./); assert.doesNotMatch(t, /Eliana F\.|Amara B\.|Rafi K\./);
  await page.selectOption('#ffdCenterSwitch', 'grace'); await page.waitForTimeout(1200);
  await page.click('[data-ptab="children"]'); await settle(page); await page.selectOption('#pRoom', 'demo'); await settle(page);
  t = await text(page);
  assert.match(t, /Grace Church Preschool \(demo\)/); assert.match(t, /Eliana F\./); assert.doesNotMatch(t, /Harper L\.|Amara B\./);
  await shot(page, width, 'center-switch');
  await h.goto(page, srv.base, 'c/no-such-center', 400);
  assert.match(await text(page), /No demo center at this address/);
  assert.deepEqual(errors, []); assert.deepEqual(offsite, []);
  await ctx.close();
});

// ---------------------------------------------------------------- 4. the owner's Procare workflow (2026-10-07)
test('data: capacity per room, tuition accounts and a paid history, two weeks of punches, permission presets (owner = everything, cook = hours only)', () => {
  const { D } = core(); D.signIn('director');
  assert.deepEqual(['twos', 'demo', 'prek'].map(r => D.get('rooms', r).capacity), [6, 10, 6]);
  assert.equal(Object.keys(D.all('accounts')).length, 17, 'every child has a tuition account');
  const mia = Object.values(D.all('invoices')).filter(x => x.kid === 'd5');
  assert.ok(mia.length >= 8 && mia.every(x => x.status === 'paid' && x.receipt), 'the family has a paid history for statements');
  assert.ok(Object.values(D.all('invoices')).some(x => x.subsidy > 0), 'subsidy shares are kept apart');
  assert.ok(Object.keys(D.all('punches')).length > 20);
  assert.deepEqual([...D.permsOf('s-carmen')], ['hours']); assert.deepEqual([...D.permsOf('s-alana')], ['hours', 'classroom']);
  assert.equal(D.presetOf(D.permsOf('s-dana')), 'director'); assert.equal(D.can('s-carmen', 'billing'), false);
  assert.doesNotMatch(JSON.stringify(D.all('accounts')) + JSON.stringify(Object.values(D.all('invoices')).map(x => [x.via, x.receipt])), /\d{9,}|routing|cvv|card number/i, 'no card or bank numbers anywhere');
  assert.equal(D.signIn('staff').home, 'timeclock');
});

for (const width of [390, 1280]) {
  test(`procare workflow at ${width}: enrollment link -> parent form -> room with live capacity -> billing + autopay + receipt -> permissions -> hours-only staff -> family statements`, async () => {
    const { ctx, page, errors, offsite } = await openPage(width, { context: { acceptDownloads: true } });
    await h.goto(page, srv.base, 'signin-teacher', 400);
    await signIn(page, 'director');
    await page.click('[data-ptab="enroll"]'); await settle(page);
    let t = await text(page);
    assert.match(t, /Rooms and capacity/); assert.match(t, /Demo Classroom · Age 3 8 \/ 10/);
    await page.fill('#pgLkParent', 'Jordan P.'); await page.selectOption('#pgLkRoom', 'demo'); await page.click('#pgLinkForm button[type="submit"]'); await settle(page);
    assert.match(await text(page), /Jordan P\. Link sent/);
    await shot(page, width, 'enroll-link'); await axeClean(page, 'Enrollment link'); await noSideScroll(page, 'Enrollment link');
    // the parent opens the link
    await page.click('[data-pg="openlink"]'); await settle(page);
    assert.match(page.url(), /#enroll-link\/flc\.[A-Z0-9]+$/);
    assert.match(await text(page), /Enroll your child at Futures Learning Center/);
    assert.doesNotMatch(await text(page), /immuni[sz]ation (date|record) *:|medication|diagnos/i, 'no medical fields beyond the alert flag');
    await axeClean(page, 'Parent form'); await noSideScroll(page, 'Parent form');
    await page.click('#pgEnrollForm button[type="submit"]'); await settle(page);
    assert.match(await page.textContent('#pgEfMsg'), /Please add your child’s first name/);
    await page.fill('#pgEfFirst', 'Remy'); await page.fill('#pgEfLast', 'P'); await page.fill('#pgEfBirth', '2023-03');
    await page.selectOption('#pgEfPay', 'subsidy');
    await page.fill('#pgEc1Name', 'Lee P.'); await page.fill('#pgEc1Rel', 'Grandmother'); await page.fill('#pgEc1Ph', '555-0100');
    await page.check('input[name="pgEfAlert"][value="yes"]'); await page.fill('#pgEfAlertText', 'Peanut allergy: plan at the front desk');
    await page.check('#pgEfDocs'); await page.check('#pgEfOk');
    await shot(page, width, 'parent-form');
    await page.click('#pgEnrollForm button[type="submit"]'); await settle(page);
    assert.match(await text(page), /Thank you\. Your form is with Futures Learning Center/);
    // back at the desk: the application, the alert, the documents promise, placement with live capacity
    await page.click('[data-pg="backdesk"]'); await page.waitForTimeout(500);
    t = await text(page);
    assert.match(t, /Remy P\./); assert.match(t, /Came in through the enrollment link/);
    assert.match(t, /Alert \(parent-reported\): Peanut allergy: plan at the front desk/); assert.match(t, /Health documents: family will bring them/);
    const app = await page.getAttribute('[data-pg="docsin"]', 'data-id');
    await page.click(`[data-pg="docsin"][data-id="${app}"]`); await settle(page);
    assert.match(await text(page), /Health documents received at the front desk/);
    await page.click(`[data-dm="enrollask"][data-id="${app}"]`); await settle(page);
    assert.match(await page.textContent(`#pgCap_${app}`), /After enrolling: 9 \/ 10 in Demo Classroom/);
    await page.selectOption(`#dmEnRoom_${app}`, 'twos'); await settle(page);
    assert.match(await page.textContent(`#pgCap_${app}`), /After enrolling: 5 \/ 6 in Twos Room/);
    await page.selectOption(`#dmEnRoom_${app}`, 'demo');
    await page.click(`[data-dm="enrollok"][data-id="${app}"]`); await settle(page);
    t = await text(page);
    assert.match(t, /Enrolled 1 Remy P\./); assert.match(t, /Demo Classroom · Age 3 9 \/ 10/);
    await shot(page, width, 'placed'); await axeClean(page, 'Placed'); await noSideScroll(page, 'Placed');
    // billing
    await page.click('[data-ptab="billing"]'); await settle(page);
    t = await text(page);
    assert.match(t, /Demo: payments are not processed\. No card or bank details are collected or stored/);
    assert.match(t, /Remy P\. · Demo Classroom \$225\.00 \$150\.00 \$75\.00 Autopay off/);
    await page.click('[data-pg="invweek"]'); await settle(page);
    await page.locator('tr', { hasText: 'Remy P.' }).locator('[data-pg="autopay"]').click(); await settle(page);
    assert.match(await text(page), /Remy P\. · Demo Classroom \$225\.00 \$150\.00 \$75\.00 Autopay on \$75\.00/);
    await page.click('[data-pg="autorun"]'); await settle(page);
    assert.match(await text(page), /Remy P\. · Demo Classroom \$225\.00 \$150\.00 \$75\.00 Autopay on \$0\.00 Paid up/);
    await page.click('[data-pg="receipt"]'); await settle(page);
    assert.match(await page.textContent('#pgReceipt'), /Receipt R-\d{6}-[A-Z0-9]+[^]*EIN XX-XXXXXXX/);
    await shot(page, width, 'billing'); await axeClean(page, 'Billing'); await noSideScroll(page, 'Billing');
    // recurring tuition per child: the schedule preview, then turn it off
    t = await text(page);
    assert.match(t, /Child billing plan Recurring on/);
    assert.match(t, /Next alert: Wed, [A-Z][a-z]{2} \d+ · Due: Fri, [A-Z][a-z]{2} \d+ · Covers Mon, [A-Z][a-z]{2} \d+ to Fri, [A-Z][a-z]{2} \d+ · \$[\d,]+\.\d\d/);
    assert.match(t, /Already paid\? Please ignore/);
    await page.uncheck('#pgBpRec'); await page.click('#pgPlanForm button[type="submit"]'); await settle(page);
    assert.match(await text(page), /Child billing plan Recurring off/);
    await page.check('#pgBpRec'); await page.click('#pgPlanForm button[type="submit"]'); await settle(page);
    // payment reminders: due Friday for the following week; paid and autopay families are skipped; nothing is really sent
    assert.match(await text(page), /Tuition due: every Friday for the following week/);
    await page.click('[data-pg="remrun"][data-stage="wed"]'); await settle(page);
    assert.match(await page.innerText('#pgRemPrev'), /Wednesday reminder by (email|email and text)/);
    assert.match(await page.innerText('#pgRemPrev'), /Reply STOP to opt out/);
    await axeClean(page, 'Reminders'); await noSideScroll(page, 'Reminders');
    // hours and access: timesheets, payroll CSV, the permission matrix
    await page.click('[data-ptab="access"]'); await settle(page);
    t = await text(page);
    assert.match(t, /Timesheets · week of/); assert.match(t, /Who can see what/);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-pg="payroll"]')]);
    assert.match(fs.readFileSync(await dl.path(), 'utf8'), /^# DEMO sample data, made up\n"week_of","staff","role"/);
    assert.equal(await page.isDisabled('#pgPre_s-dana'), true, 'the owner always has everything');
    await page.selectOption('#pgPre_s-alana', 'hours'); await settle(page);
    assert.equal(await page.isChecked('#pgPm_s-alana_classroom'), false);
    await page.check('#pgPm_s-carmen_reports'); await settle(page);
    assert.equal(await page.inputValue('#pgPre_s-carmen'), 'custom');
    assert.equal(await page.isDisabled('#pgPm_s-carmen_billing'), true, 'non-director employees never get financials');
    assert.equal(await page.isDisabled('#pgPm_s-alana_billing'), true);
    // HQ support access: requested, off until the owner approves; time-limited and logged
    assert.match(await page.innerText('#pgSupport'), /Requested: off until you approve/);
    await page.click('[data-pg="supok"]'); await settle(page);
    assert.match(await page.innerText('#pgSupport'), /On until/);
    await page.click('[data-pg="supoff"]'); await settle(page);
    assert.match(await page.innerText('#pgSupport'), /Off/);
    await shot(page, width, 'access'); await axeClean(page, 'Hours and access'); await noSideScroll(page, 'Hours and access');
    // the teacher is now "Hours only": the time clock and nothing else
    await page.click('[data-demo="signout"]'); await page.waitForTimeout(800);
    await signIn(page, 'teacher');
    t = await text(page);
    assert.match(t, /time clock/i); assert.match(t, /Your access: Hours only/); assert.doesNotMatch(t, /Check-in|Amara|Mia C|Tuition|\$\d/);
    assert.match(t, /Care alerts · whole center/); assert.match(t, /Tree nut allergy/); assert.match(t, /Peanut allergy/);
    await page.click('[data-pg="punch"]'); await settle(page);
    assert.match(await text(page), /Clocked out/);
    await shot(page, width, 'timeclock'); await axeClean(page, 'Time clock'); await noSideScroll(page, 'Time clock');
    // the family pulls their own statements
    await page.click('[data-demo="signout"]'); await page.waitForTimeout(800);
    await h.goto(page, srv.base, 'signin-family', 400); await signIn(page, 'family');
    t = await text(page);
    assert.match(t, /Tuition and payments/); assert.match(t, /Statements/); assert.match(t, /Upcoming charges/);
    await page.click('[data-pg="taxstmt"]'); await settle(page);
    const st = (await page.innerText('#pgStmt')).replace(/\s+/g, ' ');
    assert.match(st, new RegExp(`Child care payments statement · ${new Date().getFullYear()}`)); assert.match(st, /EIN: XX-XXXXXXX/); assert.match(st, /Total \$[\d,]+\.\d\d/);
    await shot(page, width, 'tax-statement'); await axeClean(page, 'Tax statement'); await noSideScroll(page, 'Tax statement');
    await page.click('[data-pg="attstmt"]'); await settle(page);
    assert.match((await page.innerText('#pgStmt')).replace(/\s+/g, ' '), /Attendance record · [A-Z][a-z]+ \d{4}[^]*days attended/);
    await shot(page, width, 'attendance-statement');
    assert.deepEqual(errors, []); assert.deepEqual(offsite, []);
    await ctx.close();
  });
}
