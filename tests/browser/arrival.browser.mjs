// W3B browser evidence: this worktree's site in headless Chromium against the LOCAL Futures Hub (hub migration
// 20261011200000_arrival_departure.sql). Each person gets their own browser context with their real Hub session (signed in through
// supabase-js here, directors stepped up to two-step, then handed to the page as its saved sign-in), so the portal opens exactly
// as after a sign-in. 1280 px and 390 px. Screenshots + observations go to EVIDENCE_DIR.
//   teacher: Arrivals tab; the kiosk; a drop-off with a finger signature; a pick-up by someone NOT on the list -> blocked ->
//            director PIN + reason on the tablet -> released and recorded; a "never release to" warning; leaving the kiosk needs
//            the teacher's PIN; a group room move changes the live ratio count
//   director: pickup list management, a family request approved, the attendance CSV download
//   family:  the pickup card (390 px): ask to add an adult, a one-day code shown once, the family PIN
// Fake data only (throwaway center, deleted at the end). Needs hub-config.local.js (local URL + PUBLIC anon key) in this folder.
// Run under the shared lock:  HUB_LOCK_OWNER=W3B /Volumes/FFCRM/app/scripts/hub-test-lock.sh node --test tests/browser/arrival.browser.mjs
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const HUB_DIR = process.env.HUB_DIR ?? '/Volumes/FFCRM/app';
const OUT = process.env.EVIDENCE_DIR ?? join(HUB_DIR, 'docs', 'ops', 'evidence', 'w3b-arrival');
const { admin, as, deleteUsers, makeUser, ok, uid } = await import(join(HUB_DIR, 'hub/tests/training-helpers.mjs'));
const { chromium } = createRequire(join(HUB_DIR, 'hub/package.json'))('playwright-core');

const COMMIT = execSync('git rev-parse --short HEAD', { cwd: SITE }).toString().trim();
const C = randomUUID(), TAG = `${process.pid}-${randomBytes(3).toString('hex')}`;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.mp4': 'video/mp4' };
const OBS = { commit: COMMIT, pageErrors: [] };
const P = {};
let server, site, browser;

async function startSite() {
  assert.ok(existsSync(join(SITE, 'hub-config.local.js')), `${SITE}/hub-config.local.js is missing (copy hub-config.local.js.example)`);
  server = createServer((req, res) => {
    const p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
    const file = join(SITE, p === '/' ? 'index.html' : p);
    if (!file.startsWith(SITE) || !existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));   // a free port chosen by the OS
  const port = server.address().port;
  assert.ok(![8765, 8811].includes(port), 'never the shared ports');
  site = `http://127.0.0.1:${port}`;
}
// a page signed in as `who`: the Hub session from supabase-js becomes the page's saved sign-in (same storage key as hub-backend.js)
async function pageAs(who, width = 1280) {
  const { data: { session } } = await (await as(who)).auth.getSession();
  const ctx = await browser.newContext({ viewport: { width, height: width < 500 ? 844 : 900 }, acceptDownloads: true });
  await ctx.addInitScript((s) => { if (!sessionStorage.getItem('ffw3b')) { localStorage.setItem('ff-hub-auth', s); sessionStorage.setItem('ffw3b', '1'); } }, JSON.stringify(session));
  const page = await ctx.newPage();
  page.on('pageerror', (e) => OBS.pageErrors.push(`${who}: ${String(e.message).slice(0, 200)}`));
  return page;
}
const shot = (page, name) => page.screenshot({ path: join(OUT, `${name}.png`), fullPage: false });
const text = (page, sel = 'body') => page.evaluate((s) => (document.querySelector(s)?.innerText ?? '').replace(/\s+/g, ' '), sel);
const noHScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
async function waitFor(fn, ms = 20000, step = 250) { const end = Date.now() + ms; for (;;) { const v = await fn(); if (v || Date.now() > end) return v; await new Promise((r) => setTimeout(r, step)); } }
async function openPortal(page, hash = 'portal') {
  await page.goto(`${site}/?fresh=${COMMIT}#${hash}`);
  assert.ok(await waitFor(async () => /Live ·/.test(await text(page, '#view'))), `portal did not open: ${(await text(page)).slice(0, 300)}`);
}
async function sign(page) {
  const box = await (await page.waitForSelector('#arrPad')).boundingBox();
  await page.mouse.move(box.x + 30, box.y + box.height * 0.6); await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(box.x + 30 + i * (box.width - 60) / 12, box.y + box.height * (0.6 + 0.25 * Math.sin(i)), { steps: 2 });
  await page.mouse.up();
}
const events = async (kid) => ok(await admin.from('attendance_events').select('*').eq('center_id', C).eq('kid', kid).order('at'), 'events');

before(async () => {
  mkdirSync(OUT, { recursive: true });
  ok(await admin.from('centers').insert({ id: C, name: `TEST W3B Arrivals ${TAG}` }), 'center');
  ok(await admin.from('rooms').insert([{ center_id: C, id: 'w3b-threes', data: { name: 'TEST Threes', ages: 'Age 3', order: 1 } },
    { center_id: C, id: 'w3b-twos', data: { name: 'TEST Twos', ages: 'Age 2', order: 2 } }]), 'rooms');
  ok(await admin.from('kids').insert([{ center_id: C, id: 'w3bk1', data: { first: 'Ava', last: 'TEST', room: 'w3b-threes' } },
    { center_id: C, id: 'w3bk2', data: { first: 'Ben', last: 'TEST', room: 'w3b-threes' } },
    { center_id: C, id: 'w3bk3', data: { first: 'Cleo', last: 'TEST', room: 'w3b-twos' } }]), 'kids');
  for (const [k, role] of [['teacher', 'teacher'], ['director', 'director'], ['family', 'family']]) {
    await makeUser(k, `w3b-br-${k}-${TAG}`);
    ok(await admin.from('memberships').insert({ user_id: uid(k), center_id: C, role }), 'membership');
  }
  ok(await admin.from('guardianships').insert({ user_id: uid('family'), center_id: C, kid: 'w3bk1' }), 'guardian');
  const d = await as('director');
  P.mom = ok(await d.rpc('pickup_set', { p_center: C, p_kid: 'w3bk1', p_person: null, p_kind: 'guardian', p_status: 'active', p_name: 'Maya TEST', p_relationship: 'parent', p_phone: '8165550101', p_user: uid('family') })).person_id;
  ok(await d.rpc('pickup_set', { p_center: C, p_kid: 'w3bk1', p_person: null, p_kind: 'authorized', p_status: 'active', p_name: 'Rosa TEST', p_relationship: 'grandparent' }));
  ok(await d.rpc('pickup_set', { p_center: C, p_kid: 'w3bk1', p_person: null, p_kind: 'never', p_status: 'active', p_name: 'Barred Adult TEST' }));
  ok(await d.rpc('security_set_pin', { p_pin: '7391' }), 'director tablet PIN');
  ok(await (await as('teacher')).rpc('security_set_pin', { p_pin: '5284' }), 'teacher tablet PIN');
  ok(await (await as('teacher')).rpc('arrival_check_in', { p_center: C, p_id: randomUUID(), p_kid: 'w3bk2', p_other_name: 'Ben Dad TEST', p_other_relationship: 'parent', p_sign_method: 'signature', p_signature: 'M1 1 L20 20 L40 10' }), 'Ben in');
  await startSite();
  browser = await chromium.launch();
});

after(async () => {
  try { writeFileSync(join(OUT, 'observations.json'), JSON.stringify(OBS, null, 2)); } catch (_) { /* best effort */ }
  try { await browser?.close(); } catch (_) { /* closed */ }
  server?.close();
  const files = ok(await admin.storage.from('child-photos').list(`${C}/_pickup`), 'list');
  if (files.length) await admin.storage.from('child-photos').remove(files.map((f) => `${C}/_pickup/${f.name}`));
  await admin.from('centers').delete().eq('id', C);   // everything of the center cascades
  await deleteUsers();
});

describe('teacher at the door (kiosk on a shared tablet)', () => {
  let page;
  test('Arrivals tab at 1280: the room, sign-in times and the do-not-release flag', async () => {
    page = await pageAs('teacher');
    await openPortal(page);
    await page.click('[data-ptab="arrivals"]');
    assert.ok(await waitFor(async () => /Arrivals and departures/.test(await text(page, '#view'))));
    OBS.tab = (await text(page, '.arr')).slice(0, 600);
    assert.match(OBS.tab, /Ava T\. Do-not-release list/);
    assert.match(OBS.tab, /Ben T\. Signed in/);
    await shot(page, '1280-1-arrivals-tab');
  });
  test('kiosk: drop-off by the parent with a finger signature is recorded with the time, the adult and the staff member', async () => {
    await page.click('[data-arr="kiosk"]');
    await page.waitForSelector('#arrOverlay.kiosk .arr-ktile');
    await shot(page, '1280-2-kiosk-home');
    await page.click('[data-arr="kid"][data-kid="w3bk1"]');
    await page.waitForSelector('[data-arr="who"]');
    OBS.whoStep = await text(page, '#arrOverlay');
    assert.match(OBS.whoStep, /Do not release to: Barred Adult TEST/);
    assert.equal(await page.$$eval('.arr-tile', (ts) => ts.filter((t) => /Barred/.test(t.textContent)).length), 0, 'no tile for the "never" person');
    await shot(page, '1280-3-kiosk-who');
    await page.click(`[data-arr="who"][data-pid="${P.mom}"]`);
    await sign(page);
    await shot(page, '1280-4-kiosk-signature');
    await page.click('#arrOverlay button[type="submit"]');
    assert.ok(await waitFor(async () => /signed in at/.test(await text(page, '#arrOverlay'))), await text(page, '#arrOverlay'));
    await shot(page, '1280-5-kiosk-done');
    const ev = await events('w3bk1');
    assert.equal(ev.length, 1);
    assert.equal(ev[0].person_name, 'Maya TEST'); assert.equal(ev[0].staff_id, uid('teacher')); assert.equal(ev[0].sign_method, 'signature');
    assert.match(ev[0].signature, /^M\d+ \d+ L/);
    OBS.dropOff = { at: ev[0].at, recorded_at: ev[0].recorded_at, person: ev[0].person_name, method: ev[0].sign_method, signatureLength: ev[0].signature.length };
  });
  test('pick-up by someone NOT on the list is blocked; the director\'s PIN and a reason release the child; all of it is on the record', async () => {
    await page.waitForSelector('[data-arr="kid"][data-kid="w3bk1"]', { timeout: 10000 });   // the kiosk returns to its home screen by itself
    await page.click('[data-arr="kid"][data-kid="w3bk1"]');
    await page.click('[data-arr="who-other"]');
    await page.fill('#arrOName', 'Stranger TEST'); await page.selectOption('#arrORel', 'family_friend');
    await sign(page);
    await page.click('#arrOverlay button[type="submit"]');
    assert.ok(await waitFor(async () => /Do not release Ava/.test(await text(page, '#arrOverlay'))));
    OBS.blocked = await text(page, '#arrOverlay');
    assert.match(OBS.blocked, /Blocked: Stranger TEST is not on Ava's pickup list/);
    assert.equal((await events('w3bk1')).length, 1, 'nothing recorded');
    await shot(page, '1280-6-blocked');
    await page.selectOption('#arrOvDir', uid('director'));
    await page.fill('#arrOvPin', '0000'); await page.fill('#arrOvWhy', 'Parent phoned the director; photo ID matched the name');
    await page.click('#arrOverlay form[data-arr-form="override"] button[type="submit"]');
    assert.ok(await waitFor(async () => /director PIN is not right/.test(await text(page, '#arrOverlay'))), 'a wrong director PIN is refused');
    await page.fill('#arrOvPin', '7391');
    await page.click('#arrOverlay form[data-arr-form="override"] button[type="submit"]');
    assert.ok(await waitFor(async () => /signed out at .*director approval recorded/.test(await text(page, '#arrOverlay'))), await text(page, '#arrOverlay'));
    await shot(page, '1280-7-released-with-override');
    const out = (await events('w3bk1')).find((e) => e.kind === 'check_out');
    assert.equal(out.override_by, uid('director')); assert.equal(out.override_method, 'director_pin'); assert.equal(out.staff_id, uid('teacher'));
    assert.equal(out.override_reason, 'Parent phoned the director; photo ID matched the name'); assert.equal(out.person_name, 'Stranger TEST');
    OBS.override = { by: 'director', method: out.override_method, reason: out.override_reason, person_kind: out.person_kind };
  });
  test('leaving the kiosk needs the teacher\'s PIN', async () => {
    await page.waitForSelector('[data-arr="kiosk-exit"]', { timeout: 10000 });
    await page.click('[data-arr="kiosk-exit"]');
    await page.waitForSelector('#arrExitPin');
    await page.fill('#arrExitPin', '1111'); await page.click('form[data-arr-form="exit"] button[type="submit"]');
    await new Promise((r) => setTimeout(r, 800));
    assert.ok(await page.$('#arrOverlay.kiosk'), 'a wrong PIN keeps the kiosk');
    await page.fill('#arrExitPin', '5284'); await page.click('form[data-arr-form="exit"] button[type="submit"]');
    assert.ok(await waitFor(async () => !(await page.$('#arrOverlay'))), 'left the kiosk');
  });
  test('group room move: the live ratio counts the child in the room they moved to', async () => {
    const t = await as('teacher');
    const before = Object.fromEntries(ok(await t.rpc('compliance_ratio_live', { p_center: C })).map((r) => [r.room, r.present]));
    await page.click('[data-arr="refresh"]');
    await page.waitForSelector('[data-arr-sel="w3bk2"]');
    await page.check('[data-arr-sel="w3bk2"]');
    await page.selectOption('#arrMoveTo', 'w3b-twos');
    await page.click('form[data-arr-form="move"] button[type="submit"]');
    assert.ok(await waitFor(async () => /Moved to TEST Twos/.test(await text(page, '.arr'))));
    const afterMove = Object.fromEntries(ok(await t.rpc('compliance_ratio_live', { p_center: C })).map((r) => [r.room, r.present]));
    OBS.ratio = { before, after: afterMove };
    assert.equal(afterMove['w3b-threes'], before['w3b-threes'] - 1); assert.equal(afterMove['w3b-twos'], before['w3b-twos'] + 1);
    await shot(page, '1280-8-after-room-move');
  });
  test('390 px: Arrivals tab and kiosk fit the phone width (no sideways scroll)', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.click('[data-ptab="arrivals"]').catch(() => {});
    await new Promise((r) => setTimeout(r, 400));
    OBS.phoneTabNoHScroll = await noHScroll(page);
    await shot(page, '390-1-arrivals-tab');
    await page.click('[data-arr="kiosk"]');
    await page.waitForSelector('#arrOverlay.kiosk .arr-ktile');
    await shot(page, '390-2-kiosk-home');
    await page.selectOption('#arrKRoom', '');   // all rooms: Cleo is in the Twos
    await page.click('[data-arr="kid"][data-kid="w3bk3"]');
    await page.click('[data-arr="who-other"]');
    await page.waitForSelector('#arrPad');
    OBS.phoneKioskNoHScroll = await noHScroll(page);
    await shot(page, '390-3-kiosk-signature');
    assert.ok(OBS.phoneTabNoHScroll && OBS.phoneKioskNoHScroll, 'no horizontal scroll at 390');
    await page.context().close();
  });
});

describe('director', () => {
  test('pickup list management, a family request approved, the attendance CSV downloaded', async () => {
    ok(await (await as('family')).rpc('pickup_request_submit', { p_center: C, p_id: randomUUID(), p_kid: 'w3bk1', p_action: 'add', p_name: 'Uncle Leo TEST', p_relationship: 'aunt_uncle', p_phone: '8165550123' }));
    const page = await pageAs('director');
    await openPortal(page);
    await page.click('[data-ptab="arrivals"]');
    assert.ok(await waitFor(async () => /Family requests waiting \(1\)/.test(await text(page, '.arr'))), (await text(page, '.arr')).slice(0, 400));
    await page.selectOption('#arrMgrKid', 'w3bk1');
    assert.ok(await waitFor(async () => /Never release to · See center file/.test(await text(page, '.arr-dir'))));
    await page.evaluate(() => document.querySelector('.arr-dir').scrollIntoView());
    await shot(page, '1280-9-director-pickup-list');
    await page.click('[data-arr="req-yes"]');
    assert.ok(await waitFor(async () => /Approved: the list has a new version/.test(await text(page, '.arr'))));
    const added = ok(await admin.from('pickup_people').select('name, approved_by, request_id').eq('center_id', C).eq('name', 'Uncle Leo TEST'));
    assert.equal(added.length, 1); assert.equal(added[0].approved_by, uid('director')); assert.ok(added[0].request_id);
    const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    await page.fill('#arrExpFrom', today); await page.fill('#arrExpTo', today); await page.selectOption('#arrExpFmt', 'sessions');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('form[data-arr-form="export"] button[type="submit"]')]);
    const csv = readFileSync(await dl.path(), 'utf8');
    OBS.csv = { file: dl.suggestedFilename(), lines: csv.trim().split('\n') };
    assert.match(OBS.csv.lines[0], /^center,child_id,child_first_name,child_last_name,date,arrival_time,pickup_time,hours,dropped_off_by/);
    assert.ok(OBS.csv.lines.some((l) => /"w3bk1".*"Maya TEST".*"Stranger TEST".*,yes,/.test(l)), 'Ava\'s session with both adults and the override');
    await shot(page, '1280-10-director-export');
    await page.context().close();
  });
});

describe('family (phone)', () => {
  test('390 px: who can pick up, ask to add an adult, a one-day code shown once, the family PIN', async () => {
    const page = await pageAs('family', 390);
    await page.goto(`${site}/?fresh=${COMMIT}#family-portal`);
    assert.ok(await waitFor(async () => /Who can pick up Ava/.test(await text(page, '#view')), 30000), (await text(page, '#view')).slice(0, 300));
    const card = await text(page, '#arrFam');
    assert.match(card, /Maya TEST \(you\)/); assert.match(card, /Rosa TEST/); assert.match(card, /Uncle Leo TEST/);
    assert.doesNotMatch(card, /Barred/, 'the "never" entry is not shown to families');
    await page.fill('#arrFName', 'Neighbor Kim TEST'); await page.selectOption('#arrFRel', 'neighbor');
    await page.click('form[data-arr-form="fam-add"] button[type="submit"]');
    assert.ok(await waitFor(async () => /waiting for the director/.test(await text(page, '#arrFam'))));
    await page.fill('#arrFPName', 'Aunt June TEST'); await page.selectOption('#arrFPRel', 'aunt_uncle');
    await page.click('form[data-arr-form="fam-pass"] button[type="submit"]');
    assert.ok(await waitFor(async () => /Give this code to Aunt June TEST/.test(await text(page, '#arrFam'))));
    OBS.familyCode = (await text(page, '.arr-code')).replace(/\d{3} \d{3}/, '### ###');
    await page.evaluate(() => document.getElementById('arrFam').scrollIntoView());
    await shot(page, '390-4-family-pickup-card');
    await page.fill('#arrFPin1', '4826'); await page.fill('#arrFPin2', '4826');
    await page.click('form[data-arr-form="fam-pin"] button[type="submit"]');
    assert.ok(await waitFor(async () => /PIN saved/.test(await text(page, '#arrFam'))));
    OBS.familyNoHScroll = await noHScroll(page);
    assert.ok(OBS.familyNoHScroll);
    await shot(page, '390-5-family-pin-saved');
    const req = ok(await admin.from('pickup_requests').select('name, status, requested_by').eq('center_id', C).eq('name', 'Neighbor Kim TEST'));
    assert.deepEqual(req.map((r) => [r.status, r.requested_by]), [['pending', uid('family')]]);
    await page.context().close();
  });
  test('no page errors', () => { assert.deepEqual(OBS.pageErrors, []); });
});
