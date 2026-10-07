// R5 / CR-16 browser evidence: this worktree's site in Chromium against the LOCAL Futures Hub, with the Hub cut off for this page
// only (HTTP aborted, realtime websocket closed; the shared stack is never stopped). Same method as the hub repo's
// hub/tests/care-scenarios-offline.test.mjs, now asserting the fixed behaviour:
//   offline tap -> "Not saved yet" + banner + truthful badge; paper sheet from the banner; reload offline -> "Can't reach Futures
//   Hub" (never the sample classrooms); Hub back -> the entry is sent with the same id, the row is confirmed, ONE database row;
//   the same at phone width (390); sign-out with a waiting entry deletes it from the device.
// Needs the hub repo (HUB_DIR, default /Volumes/FFCRM/app) for its test helpers and playwright-core, and hub-config.local.js in
// this folder (local URL + public anon key). Fake data only (throwaway center, deleted at the end).
// Run under the shared lock:  HUB_LOCK_OWNER=OFFLINE /Volumes/FFCRM/app/scripts/hub-test-lock.sh node --test tests/browser/hub-offline.browser.mjs
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const HUB_DIR = process.env.HUB_DIR ?? '/Volumes/FFCRM/app';
const OUT = process.env.R5_EVIDENCE_DIR ?? join(homedir(), 'futures-friends-w2-offline-evidence', 'r5-offline');
const { admin, deleteUsers, emailOf, makeUser, ok, uid, url: hubUrl } = await import(join(HUB_DIR, 'hub/tests/training-helpers.mjs'));
const { chromium } = createRequire(join(HUB_DIR, 'hub/package.json'))('playwright-core');

const COMMIT = execSync('git rev-parse --short HEAD', { cwd: SITE }).toString().trim();
const C = randomUUID(), TAG = `${process.pid}-${randomBytes(3).toString('hex')}`;
const ROOM = 'w2off-room', KID1 = 'w2off1', KID2 = 'w2off2';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.mp4': 'video/mp4' };
const hubRe = new RegExp(`^(https?|wss?)://${new URL(hubUrl).host.replace(/[.]/g, '\\.')}/`);
const OBS = { commit: COMMIT };
const pw = {};
let server, site, browser, page, blocked = false;
const sockets = new Set();

async function startSite() {
  assert.ok(existsSync(join(SITE, 'hub-config.local.js')), `${SITE}/hub-config.local.js is missing (copy hub-config.local.js.example)`);
  server = createServer((req, res) => {
    const p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
    const file = join(SITE, p === '/' ? 'index.html' : p);
    if (!file.startsWith(SITE) || !existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));     // a free port chosen by the OS
  const port = server.address().port;
  assert.ok(![8765, 8811].includes(port), 'never the shared ports');
  site = `http://127.0.0.1:${port}`;
}
async function wireHubSwitch(p) {
  await p.route(hubRe, (r) => (blocked ? r.abort('internetdisconnected') : r.continue()));
  await p.routeWebSocket(hubRe, (ws) => {
    if (blocked) { ws.close({ code: 1011, reason: 'test: hub unreachable' }); return; }
    ws.connectToServer(); sockets.add(ws); ws.onClose(() => sockets.delete(ws));
  });
}
function cutHub() { blocked = true; for (const ws of sockets) ws.close({ code: 1011, reason: 'test: hub unreachable' }); sockets.clear(); }
const restoreHub = () => { blocked = false; };
const shot = (name) => page.screenshot({ path: join(OUT, `${name}.png`), fullPage: false }).catch(() => {});
const bodyText = () => page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
const row = (kid) => page.evaluate((k) => { const d = document.querySelector(`[data-att="${k}"]`)?.closest('div'); return d ? { label: d.querySelector('.mini')?.textContent ?? null, mark: d.querySelector('.ffo-mark')?.textContent ?? null } : null; }, kid);
const badge = () => page.evaluate(() => [...document.querySelectorAll('#view .phero .chip')].map((c) => c.textContent).join(' | '));
const banner = () => page.evaluate(() => { const b = document.getElementById('ffoBar'); return b && !b.hidden ? b.innerText.replace(/\s+/g, ' ') : null; });
const rows = async (kid) => ok(await admin.from('kidday').select('id, data').eq('center_id', C).eq('kid', kid), 'kidday');
const outbox = () => page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('ff-hub-outbox')).map((k) => [k, localStorage.getItem(k)]));
async function waitFor(fn, ms = 20000, step = 250) { const end = Date.now() + ms; for (;;) { const v = await fn(); if (v || Date.now() > end) return v; await new Promise((r) => setTimeout(r, step)); } }

before(async () => {
  mkdirSync(OUT, { recursive: true });
  ok(await admin.from('centers').insert({ id: C, name: `TEST W2 Offline ${TAG}` }), 'center');
  ok(await admin.from('rooms').insert({ center_id: C, id: ROOM, data: { name: 'TEST Threes', ages: 'Age 3', order: 1 } }), 'room');
  ok(await admin.from('kids').insert([{ center_id: C, id: KID1, data: { first: 'Olive', last: 'TEST', room: ROOM } },
    { center_id: C, id: KID2, data: { first: 'Omar', last: 'TEST', room: ROOM } }]), 'kids');
  await makeUser('teacher', `w2-off-teacher-${TAG}`);
  ok(await admin.from('memberships').insert({ user_id: uid('teacher'), center_id: C, role: 'teacher' }), 'membership');
  pw.teacher = randomBytes(18).toString('base64url');
  ok(await admin.auth.admin.updateUserById(uid('teacher'), { password: pw.teacher }), 'password');
  await startSite();
  browser = await chromium.launch();
  page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();   // its own new tab
  page.on('pageerror', (e) => { (OBS.pageErrors ??= []).push(String(e.message).slice(0, 200)); });
  await wireHubSwitch(page);
});

after(async () => {
  try { writeFileSync(join(OUT, 'observations.json'), JSON.stringify(OBS, null, 2)); } catch (_) { /* best effort */ }
  try { await browser?.close(); } catch (_) { /* closed */ }
  server?.close();
  await admin.from('centers').delete().eq('id', C);   // rooms, kids, kidday, memberships cascade with the center
  await deleteUsers();
});

describe('Teacher Portal when the Hub becomes unreachable (fixed behaviour)', () => {
  test('online: sign in, "Here" for child 1 is saved and the badge says Live', async () => {
    await page.goto(`${site}/?fresh=${COMMIT}#signin-teacher`);
    await page.waitForSelector('#hubSigninForm', { timeout: 30000 });
    await page.fill('#hubEmail', emailOf('teacher')); await page.fill('#hubPass', pw.teacher); await page.click('#hubGo');
    assert.ok(await waitFor(async () => (await row(KID1)) !== null, 30000), `portal did not open: ${(await bodyText()).slice(0, 300)}`);
    await page.click(`[data-att="${KID1}"][data-v="1"]`);
    assert.ok(await waitFor(async () => (await rows(KID1))[0]?.data?.present === true), 'saved to the hub');
    OBS.online = { row1: await row(KID1), badge: await badge(), banner: await banner() };
    await shot('1-online-live');
    assert.match(OBS.online.badge, /Live · saving to your program/);
    assert.equal(OBS.online.banner, null);
  });

  test('Hub unreachable: "Here" for child 2 shows "Not saved yet", a lasting banner and an Offline badge; nothing in the database', async () => {
    cutHub();
    await page.click(`[data-att="${KID2}"][data-v="1"]`);
    assert.ok(await waitFor(async () => (await row(KID2))?.mark, 15000), 'the row is marked');
    OBS.offline = { row2: await row(KID2), badge: await badge(), banner: await banner(), outbox: (await outbox()).map(([k, v]) => [k, JSON.parse(v)]) };
    await shot('2-offline-not-saved-yet');
    assert.deepEqual(OBS.offline.row2, { label: 'Here', mark: 'Not saved yet' });
    assert.match(OBS.offline.badge, /Offline — 1 change waiting/);
    assert.doesNotMatch(OBS.offline.badge, /Live/);
    assert.match(OBS.offline.banner, /Can't reach Futures Hub — your changes are kept on this device and will send when you're back online/);
    assert.equal(OBS.offline.outbox.length, 1);
    assert.deepEqual(OBS.offline.outbox[0][1].items.map((x) => [x.t, x.id]), [['kidday', `${KID2}_${OBS.offline.outbox[0][1].items[0].data.date}`]]);
    assert.deepEqual(await rows(KID2), [], 'nothing reached the hub');
    // the paper sheet from the banner, with the roster loaded earlier
    await page.click('#ffoBar [data-ffo="sheet"]');
    await page.waitForSelector('#ffoSheet');
    OBS.sheet = (await page.evaluate(() => document.getElementById('ffoSheet').innerText.replace(/\s+/g, ' '))).slice(0, 700);
    await shot('3-paper-sheet');
    assert.match(OBS.sheet, /Downtime sheet: attendance, meals and notes/);
    assert.match(OBS.sheet, /Olive T\..*Omar T\./);
    await page.click('#ffoSheet [data-ffo="close"]');
    // still there after the 15 s polling interval
    await new Promise((r) => setTimeout(r, 17000));
    OBS.offlineAfter17s = { row2: await row(KID2), banner: await banner(), badge: await badge() };
    await shot('4-offline-17s-later');
    assert.equal(OBS.offlineAfter17s.row2.mark, 'Not saved yet');
    assert.match(OBS.offlineAfter17s.banner, /Can't reach Futures Hub/);
  });

  test('reload while unreachable: still signed in, "Can\'t reach Futures Hub" with the waiting entry, never the sample classrooms', async () => {
    await page.reload();
    assert.ok(await waitFor(async () => /Can't reach Futures Hub/.test(await bodyText()), 30000), 'offline screen shown');
    const t = await bodyText();
    OBS.reloadOffline = { excerpt: t.slice(0, 600), sample: /Sample local preview|Infant Room/.test(t), badge: await badge(), outbox: (await outbox()).length };
    await shot('5-reload-while-offline');
    assert.equal(OBS.reloadOffline.sample, false, 'never the sample classrooms');
    assert.match(t, /1 change waiting on this device/);
    assert.equal(OBS.reloadOffline.outbox, 1, 'the waiting entry survived the reload');
  });

  test('Hub back: the waiting entry is sent with the same id, the row is confirmed and there is exactly one database row', async () => {
    restoreHub();
    assert.ok(await waitFor(async () => (await row(KID2))?.label === 'Here' && !(await row(KID2)).mark && (await rows(KID2)).length === 1, 45000), 'replayed');
    const r2 = await rows(KID2);
    OBS.backOnline = { row2: await row(KID2), badge: await badge(), banner: await banner(), db: r2.map((r) => ({ id: r.id, present: r.data.present })), outbox: (await outbox()).length };
    await shot('6-back-online-confirmed');
    assert.equal(r2.length, 1, 'one row');
    assert.equal(r2[0].id, OBS.offline.outbox[0][1].items[0].id, 'the same record id');
    assert.equal(r2[0].data.present, true);
    assert.match(OBS.backOnline.badge, /Live · saving to your program/);
    assert.equal(OBS.backOnline.banner, null);
    assert.equal(OBS.backOnline.outbox, 0, 'deleted from the device once sent');
  });

  test('phone width (390): offline "Absent" for child 1 is marked and then sent once', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    assert.ok(await waitFor(async () => (await row(KID1))?.label === 'Here', 30000), 'portal at 390');
    cutHub();
    await page.click(`[data-att="${KID1}"][data-v="0"]`);
    assert.ok(await waitFor(async () => (await row(KID1))?.mark, 15000));
    OBS.phoneOffline = { row1: await row(KID1), banner: await banner(), scrollX: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth) };
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot('7-phone-offline');
    const at = await page.evaluate((k) => { const el = document.querySelector(`[data-att="${k}"]`); el.scrollIntoView({ block: 'center' }); return true; }, KID1);
    assert.ok(at); await shot('7b-phone-offline-row');
    assert.deepEqual(OBS.phoneOffline.row1, { label: 'Absent', mark: 'Not saved yet' });
    restoreHub();
    assert.ok(await waitFor(async () => (await rows(KID1))[0]?.data?.present === false && !(await row(KID1)).mark, 45000), 'sent');
    OBS.phoneBack = { row1: await row(KID1), db: (await rows(KID1)).map((r) => ({ id: r.id, present: r.data.present })) };
    await shot('8-phone-back-online');
    assert.equal(OBS.phoneBack.db.length, 1);
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  test('sign-out with a waiting entry warns once, then deletes it (and the sign-in) from this device', async () => {
    cutHub();
    await page.click(`[data-att="${KID2}"][data-v="0"]`);
    assert.ok(await waitFor(async () => (await outbox()).length === 1, 10000));
    const so = page.locator('#hubWho [data-hub="signout"]');
    await so.click();
    OBS.signOutWarn = await so.textContent();
    await shot('9-signout-warning');
    assert.match(OBS.signOutWarn, /Sign out and delete 1 unsent change/);
    await Promise.all([page.waitForEvent('load', { timeout: 20000 }), so.click()]);
    const keys = await page.evaluate(() => Object.keys(localStorage).filter((k) => /^ff-hub-(outbox|auth)/.test(k)));
    OBS.afterSignOut = { keys, hash: new URL(page.url()).hash };
    restoreHub();
    assert.deepEqual(keys, [], 'nothing of the session or the waiting list stays');
    assert.deepEqual(OBS.pageErrors ?? [], [], 'no script errors on the page');
    assert.equal((await rows(KID2))[0].data.present, true, 'the deleted entry never reached the hub');
  });
});
