// W3E browser evidence: this worktree's site in Chromium against the LOCAL Futures Hub.
//   1. Teacher Portal: another session marks a child "Here" -> the open page shows it live, with NO re-download of the table
//   2. Teacher Portal Messages: a family writes -> the teacher's open thread shows it live, no re-download
//   3. Family Portal: the teacher writes -> the family's open page shows it live
//   4. A photo moment posted from the portal stores the photo AND a thumbnail; the strip loads the thumbnail; opening it shows the
//      full photo
//   5. A refused save (photo for a child without photo consent) shows a message that is still there seconds later (not a toast)
//   6. the same at phone width (390); no script errors
// Needs the hub repo (HUB_DIR, default /Volumes/FFCRM/app) for its test helpers and playwright-core, and hub-config.local.js here.
// Fake data only (throwaway center, deleted at the end). Run under the shared lock:
//   HUB_LOCK_OWNER=W3E /Volumes/FFCRM/app/scripts/hub-test-lock.sh node --test tests/browser/hub-realtime.browser.mjs
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
const OUT = process.env.W3E_EVIDENCE_DIR ?? join(homedir(), 'futures-friends-w3-scale-evidence');
const { admin, as, deleteUsers, emailOf, makeUser, ok, passwordOf, uid } = await import(join(HUB_DIR, 'hub/tests/training-helpers.mjs'));
const { chromium } = createRequire(join(HUB_DIR, 'hub/package.json'))('playwright-core');

const COMMIT = execSync('git rev-parse --short HEAD', { cwd: SITE }).toString().trim();
const C = randomUUID(), TAG = `${process.pid}-${randomBytes(3).toString('hex')}`;
const ROOM = 'w3e-room', K1 = 'w3ek1', K2 = 'w3ek2', K3 = 'w3ek3';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.mp4': 'video/mp4' };
const OBS = { commit: COMMIT };
const pw = {};
let server, site, browser, tp, fp;   // teacher page, family page
const reqs = { t: [], f: [] };
const today = () => new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10);   // the portal's day (America/Chicago, near enough)

async function startSite() {
  assert.ok(existsSync(join(SITE, 'hub-config.local.js')), `${SITE}/hub-config.local.js is missing (copy hub-config.local.js.example)`);
  server = createServer((req, res) => {
    const p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
    const file = join(SITE, p === '/' ? 'index.html' : p);
    if (!file.startsWith(SITE) || !existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  assert.ok(![8765, 8811].includes(port), 'never the shared ports');
  site = `http://127.0.0.1:${port}`;
}
async function waitFor(fn, ms = 20000, step = 200) { const end = Date.now() + ms; for (;;) { const v = await fn(); if (v || Date.now() > end) return v; await new Promise((r) => setTimeout(r, step)); } }
const shot = (p, name) => p.screenshot({ path: join(OUT, `${name}.png`), fullPage: false }).catch(() => {});
const text = (p) => p.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
const attLabel = (kid) => tp.evaluate((k) => { const d = document.querySelector(`[data-att="${k}"]`)?.closest('div'); return d?.querySelector('.mini')?.textContent ?? null; }, kid);
const restGets = (who, table, since) => reqs[who].slice(since).filter((r) => r.method === 'GET' && r.url.includes(`/rest/v1/${table}?`));
async function signIn(p, who, key) {
  await p.goto(`${site}/?fresh=${COMMIT}#signin-${who}`);
  await p.waitForSelector('#hubSigninForm', { timeout: 30000 });
  await p.fill('#hubEmail', emailOf(key)); await p.fill('#hubPass', pw[key]); await p.click('#hubGo');
}

before(async () => {
  mkdirSync(OUT, { recursive: true });
  ok(await admin.from('centers').insert({ id: C, name: `TEST W3E Live ${TAG}` }), 'center');
  ok(await admin.from('rooms').insert({ center_id: C, id: ROOM, data: { name: 'TEST Threes', ages: 'Age 3', order: 1 } }), 'room');
  ok(await admin.from('kids').insert([{ center_id: C, id: K1, data: { first: 'Olive', last: 'TEST', room: ROOM }, photo_consent: true },
    { center_id: C, id: K2, data: { first: 'Omar', last: 'TEST', room: ROOM }, photo_consent: true },
    { center_id: C, id: K3, data: { first: 'Nia', last: 'TEST', room: ROOM }, photo_consent: false }]), 'kids');
  for (const k of ['teacher', 'teacher2', 'family']) { await makeUser(k, `w3e-live-${k}-${TAG}`); pw[k] = passwordOf(k); }
  ok(await admin.from('memberships').insert([{ user_id: uid('teacher'), center_id: C, role: 'teacher' }, { user_id: uid('teacher2'), center_id: C, role: 'teacher' },
    { user_id: uid('family'), center_id: C, role: 'family' }]), 'memberships');
  ok(await admin.from('guardianships').insert({ user_id: uid('family'), center_id: C, kid: K1 }), 'guardianship');
  await startSite();
  browser = await chromium.launch();
  tp = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  fp = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  for (const [k, p] of [['t', tp], ['f', fp]]) {
    p.on('pageerror', (e) => { (OBS.pageErrors ??= []).push(`${k}: ${String(e.message).slice(0, 200)}`); });
    p.on('request', (r) => reqs[k].push({ method: r.method(), url: r.url(), at: Date.now() }));
  }
});
after(async () => {
  try { writeFileSync(join(OUT, 'observations.json'), JSON.stringify(OBS, null, 2)); } catch (_) { /* best effort */ }
  try { await browser?.close(); } catch (_) { /* closed */ }
  server?.close();
  const { data: objs } = await admin.storage.from('child-photos').list(`${C}/${K1}`);
  if (objs?.length) await admin.storage.from('child-photos').remove(objs.map((o) => `${C}/${K1}/${o.name}`));
  await admin.from('centers').delete().eq('id', C);
  await deleteUsers();
});

describe('W3E: the portals update live from another session, without re-downloading tables', () => {
  test('Teacher Portal: another teacher marks Omar "Here" -> shown live, no kidday re-download', async () => {
    await signIn(tp, 'teacher', 'teacher');
    assert.ok(await waitFor(async () => (await attLabel(K2)) !== null, 30000), `portal did not open: ${(await text(tp)).slice(0, 300)}`);
    await tp.waitForTimeout(3000);                     // realtime connected and its catch-up check done
    OBS.before = { k2: await attLabel(K2) };
    const mark = reqs.t.length, t0 = Date.now();
    const other = await as('teacher2');
    ok(await other.from('kidday').upsert({ center_id: C, id: `${K2}_${today()}`, data: { kid: K2, date: today(), present: true, arrived: '08:01' } }, { onConflict: 'center_id,id' }), 'other session writes');
    assert.ok(await waitFor(async () => (await attLabel(K2)) === 'Here', 15000), `not shown live (label ${await attLabel(K2)})`);
    OBS.teacherLive = { label: await attLabel(K2), ms: Date.now() - t0, kiddayGets: restGets('t', 'kidday', mark).length, restAfter: reqs.t.slice(mark).filter((r) => r.url.includes('/rest/v1/')).map((r) => r.method + ' ' + r.url.split('/rest/v1/')[1].split('?')[0]) };
    await shot(tp, '1-teacher-live-here');
    assert.equal(OBS.teacherLive.kiddayGets, 0, 'the table was not downloaded again');
  });

  test('Teacher Portal Messages: the family writes -> the open thread shows it live, no msgs re-download', async () => {
    await tp.click('[data-ptab="messages"]');
    await tp.click(`[data-p2mk="${K1}"]`).catch(() => {});
    await tp.waitForTimeout(1500);
    const mark = reqs.t.length, t0 = Date.now(), msg = `TEST hello from home ${TAG}`;
    const fam = await as('family');
    ok(await fam.from('msgs').insert({ center_id: C, id: `w3e-m-${TAG}`, data: { kid: K1, room: ROOM, from: 'family', text: msg, at: Date.now(), read: { teacher: false, family: true } } }), 'family writes');
    assert.ok(await waitFor(async () => (await text(tp)).includes(msg), 15000), 'message not shown live');
    OBS.teacherMsgLive = { ms: Date.now() - t0, msgsGets: restGets('t', 'msgs', mark).length };
    await shot(tp, '2-teacher-message-live');
    assert.equal(OBS.teacherMsgLive.msgsGets, 0);
  });

  test('Family Portal: the teacher writes -> the family page shows it live; the family reads name its own child', async () => {
    await signIn(fp, 'family', 'family');
    assert.ok(await waitFor(async () => /Olive/.test(await text(fp)), 30000), `family portal did not open: ${(await text(fp)).slice(0, 300)}`);
    OBS.familyReads = reqs.f.filter((r) => /\/rest\/v1\/(msgs|obs|photos)\?/.test(r.url)).map((r) => decodeURIComponent(r.url.split('/rest/v1/')[1]).replace(/center_id=eq\.[0-9a-f-]+/, 'center_id=eq.C'));
    assert.ok(OBS.familyReads.length && OBS.familyReads.every((u) => u.includes(`kid=in.(${K1})`)), `family reads name its child: ${OBS.familyReads}`);
    await fp.waitForTimeout(3000);
    const mark = reqs.f.length, t0 = Date.now(), msg = `TEST from the teacher ${TAG}`;
    const t = await as('teacher2');
    ok(await t.from('msgs').insert({ center_id: C, id: `w3e-m2-${TAG}`, data: { kid: K1, room: ROOM, from: 'teacher', text: msg, at: Date.now(), read: { teacher: true, family: false } } }), 'teacher writes');
    const shown = await waitFor(async () => (await text(fp)).includes(msg), 15000);
    if (!shown) {   // the family's open screen may not list messages: open them
      const b = await fp.$('[data-ftab="messages"], [data-p2ftab="messages"], button:has-text("Messages")'); if (b) await b.click();
    }
    assert.ok(shown || await waitFor(async () => (await text(fp)).includes(msg), 8000), 'family page did not show the message');
    OBS.familyLive = { ms: Date.now() - t0, liveWithoutClick: !!shown, msgsGets: restGets('f', 'msgs', mark).length };
    await shot(fp, '3-family-live-message');
    assert.equal(OBS.familyLive.msgsGets, 0, 'no msgs re-download on the family page');
  });

  test('photo moment: photo + thumbnail stored; the strip loads the thumbnail; opening it shows the full photo', async () => {
    const jpeg = await tp.evaluate(() => { const c = document.createElement('canvas'); c.width = 1200; c.height = 900; const g = c.getContext('2d');
      const gr = g.createLinearGradient(0, 0, 1200, 900); gr.addColorStop(0, '#E7A928'); gr.addColorStop(1, '#1D3557'); g.fillStyle = gr; g.fillRect(0, 0, 1200, 900);
      g.fillStyle = '#fff'; g.font = 'bold 120px sans-serif'; g.fillText('TEST', 420, 480); return c.toDataURL('image/jpeg', 0.9).split(',')[1]; });
    await tp.selectOption('#p2MomKid', K1);
    await tp.fill('#p2MomCap', 'TEST thumbnail');
    await tp.setInputFiles('#p2MomFile', { name: 'test.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(jpeg, 'base64') });
    await tp.waitForTimeout(800);
    await tp.click('[data-p2="postmoment"]');
    const objs = await waitFor(async () => { const { data } = await admin.storage.from('child-photos').list(`${C}/${K1}`); return data?.length >= 2 ? data : null; }, 15000);
    assert.ok(objs, 'photo and thumbnail stored');
    const names = objs.map((o) => o.name).sort();
    OBS.objects = objs.map((o) => ({ name: o.name.replace(/^[0-9a-f-]+/, '<uuid>'), bytes: o.metadata?.size, type: o.metadata?.mimetype }));
    const full = objs.find((o) => !o.name.endsWith('.thumb.jpg')), thumb = objs.find((o) => o.name.endsWith('.thumb.jpg'));
    assert.ok(full && thumb && thumb.name === full.name + '.thumb.jpg', `names: ${names}`);
    assert.ok(thumb.metadata.size < full.metadata.size / 3, `thumbnail is much smaller (${thumb.metadata.size} vs ${full.metadata.size} bytes)`);
    const row = ok(await admin.from('photos').select('data').eq('center_id', C).eq('kid', K1).single(), 'row').data;
    assert.equal(row.thumb, `${row.path}.thumb.jpg`);
    assert.ok(await waitFor(async () => (await tp.$$eval('.p2-strip img', (a) => a.map((i) => i.getAttribute('src')))).some((s) => s.includes('.thumb.jpg')), 15000), 'strip shows the thumbnail');
    OBS.stripSrc = (await tp.$$eval('.p2-strip img', (a) => a.map((i) => i.getAttribute('src').split('?')[0].replace(/[0-9a-f-]{36}/g, '<id>'))));
    await shot(tp, '4-photo-strip-thumbnail');
    await tp.click('.p2-strip [data-p2photo]');
    assert.ok(await waitFor(async () => { const s = await tp.$eval('dialog img', (i) => i.getAttribute('src')).catch(() => ''); return s && !s.includes('.thumb.jpg') && s.includes('/sign/'); }, 10000), 'the dialog shows the full photo');
    OBS.dialogFull = true;
    await shot(tp, '5-photo-dialog-full');
    await tp.keyboard.press('Escape'); await tp.click('[data-p2close]').catch(() => {});
  });

  test('a refused save shows a lasting message (photo for a child without consent)', async () => {
    await tp.selectOption('#p2MomKid', K3);
    const png = await tp.evaluate(() => { const c = document.createElement('canvas'); c.width = 300; c.height = 200; c.getContext('2d').fillRect(0, 0, 300, 200); return c.toDataURL('image/jpeg').split(',')[1]; });
    await tp.setInputFiles('#p2MomFile', { name: 'nia.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(png, 'base64') });
    await tp.waitForTimeout(800);
    await tp.click('[data-p2="postmoment"]');
    assert.ok(await waitFor(async () => tp.$('#hubSaveErr'), 10000), 'message shown');
    await tp.evaluate(() => window.scrollTo(0, 0));
    OBS.saveErr = await tp.$eval('#hubSaveErr', (e) => ({ text: e.innerText.replace(/\s+/g, ' '), role: e.getAttribute('role') }));
    await shot(tp, '6-save-error-1280');
    assert.equal(OBS.saveErr.role, 'alert');
    assert.match(OBS.saveErr.text, /Not saved: Photo/); assert.match(OBS.saveErr.text, /photo consent/);
    await tp.waitForTimeout(8000);
    assert.ok(await tp.$('#hubSaveErr'), 'still there 8 s later (a toast is gone after ~2 s)');
    await tp.setViewportSize({ width: 390, height: 844 });
    await tp.evaluate(() => window.scrollTo(0, 0));
    OBS.phone = { scrollX: await tp.evaluate(() => document.documentElement.scrollWidth > innerWidth) };
    await shot(tp, '7-save-error-390');
    assert.equal(OBS.phone.scrollX, false, 'no sideways scroll at 390');
    await tp.click('#hubSaveErr [data-hubse]');
    assert.equal(await tp.$('#hubSaveErr'), null, 'dismissed');
    await tp.setViewportSize({ width: 1280, height: 900 });
  });

  test('phone width (390): the family page still updates live; no script errors anywhere', async () => {
    await fp.setViewportSize({ width: 390, height: 844 });
    const msg = `TEST phone ${TAG}`, t = await as('teacher2');
    ok(await t.from('msgs').insert({ center_id: C, id: `w3e-m3-${TAG}`, data: { kid: K1, room: ROOM, from: 'teacher', text: msg, at: Date.now(), read: { teacher: true, family: false } } }), 'teacher writes');
    assert.ok(await waitFor(async () => (await text(fp)).includes(msg), 15000), 'shown live at 390');
    OBS.phoneFamily = { scrollX: await fp.evaluate(() => document.documentElement.scrollWidth > innerWidth) };
    await shot(fp, '8-family-live-390');
    assert.equal(OBS.phoneFamily.scrollX, false);
    assert.deepEqual(OBS.pageErrors ?? [], [], 'no script errors');
  });
});
