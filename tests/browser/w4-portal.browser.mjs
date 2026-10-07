// Wave 4 PORTAL lane, browser evidence: this worktree's site in headless Chromium against the LOCAL Futures Hub.
//   1. Director (AAL2): "Edit history" tab lists who changed a care record, when, and old -> new; operated by keyboard; axe clean;
//      at 1280 and 390 (no sideways scroll)
//   2. Director: "Children leaving the center": record a last day by keyboard, through a confirmation; kids.left_on is set in the
//      Hub; then cleared
//   3. Teacher: no Edit history tab; Messages shows recent weeks only, "Load earlier messages" brings the older one; the reads ask
//      the database for date >= the window
//   4. Realtime: a new message appears live; a deleted one disappears live (private delete topic), with no msgs re-download
//   5. Family at 390: no history tab; a deleted message of its own child disappears live
//   6. Paper sheet: with the network cut, the sheet opens from the Children tab and prints every room on its own page
// Needs the hub repo (HUB_DIR, default /Volumes/FFCRM/app) and hub-config.local.js here. Synthetic data only (throwaway center and
// accounts, deleted at the end). Run under the shared lock:
//   HUB_LOCK_OWNER=W4PORTAL /Volumes/FFCRM/app/scripts/hub-test-lock.sh node --test tests/browser/w4-portal.browser.mjs
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startSite } from '../a11y-harness.mjs';

const SITE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const HUB_DIR = process.env.HUB_DIR ?? '/Volumes/FFCRM/app';
const OUT = process.env.W4_EVIDENCE_DIR ?? join(homedir(), 'futures-friends-w4-portal-evidence');
const { admin, as, deleteUsers, emailOf, makeUser, ok, passwordOf, uid } = await import(join(HUB_DIR, 'hub/tests/training-helpers.mjs'));
const { chromium } = createRequire(join(HUB_DIR, 'hub/package.json'))('playwright-core');
const AXE = readFileSync(join(SITE, 'tests/fixtures/axe-core/axe.min.js'), 'utf8');
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

const COMMIT = process.env.FRESH ?? execSync('git rev-parse --short HEAD', { cwd: SITE }).toString().trim();
const C = randomUUID(), TAG = `${process.pid}-${randomBytes(3).toString('hex')}`;
const R1 = 'w4r1', R2 = 'w4r2', K1 = 'w4k1', K2 = 'w4k2', K3 = 'w4k3';
const OBS = { commit: COMMIT, at: new Date().toISOString() };
let srv, base, browser;
const pages = {};
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
const TODAY = iso(new Date());
async function waitFor(fn, ms = 20000, step = 200) { const end = Date.now() + ms; for (;;) { const v = await fn(); if (v || Date.now() > end) return v; await new Promise((r) => setTimeout(r, step)); } }
const shot = (p, name) => p.screenshot({ path: join(OUT, `${name}.png`), fullPage: false }).catch(() => {});
const text = (p) => p.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
async function axe(p, include) {
  if (!(await p.evaluate(() => !!window.axe))) await p.addScriptTag({ content: AXE });
  return p.evaluate(async ({ tags, include }) => {
    const r = await window.axe.run(include ? { include: [[include]] } : document, { runOnly: { type: 'tag', values: tags } });
    return r.violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, t: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) }));
  }, { tags: TAGS, include });
}
async function open(key, width) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 900 }, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  p.reqs = []; p.errs = [];
  p.on('pageerror', (e) => p.errs.push(String(e.message).slice(0, 200)));
  p.on('request', (r) => p.reqs.push({ method: r.method(), url: r.url() }));
  pages[key] = p; return p;
}
// a signed-in page: AAL2 for the director (session handed over, as stepUpPage does), password sign-in for the others
async function signIn(p, key, who) {
  await p.goto(`${base}?fresh=${COMMIT}#signin-${who}`);
  if (key === 'dir') {
    const c = await as('dir');
    const { data: { session } } = await c.auth.getSession();
    await p.evaluate((v) => localStorage.setItem('ff-hub-auth', v), JSON.stringify(session));
    await p.goto(`${base}?fresh=${COMMIT}#portal`); await p.reload();
  } else {
    await p.waitForSelector('#hubSigninForm', { timeout: 30000 });
    await p.fill('#hubEmail', emailOf(key)); await p.fill('#hubPass', passwordOf(key)); await p.click('#hubGo');
  }
  assert.ok(await waitFor(async () => /Signed in as/.test(await text(p)), 30000), `${key} did not open the portal: ${(await text(p)).slice(0, 300)}`);
}
const noSideScroll = (p) => p.evaluate(() => document.scrollingElement.scrollWidth <= window.innerWidth + 1);

before(async () => {
  mkdirSync(OUT, { recursive: true });
  assert.ok(existsSync(join(SITE, 'hub-config.local.js')), 'hub-config.local.js missing');
  ok(await admin.from('centers').insert({ id: C, name: `TEST W4 Portal ${TAG}` }), 'center');
  ok(await admin.from('rooms').insert([{ center_id: C, id: R1, data: { name: 'TEST Threes', ages: 'Age 3', order: 1 } },
    { center_id: C, id: R2, data: { name: 'TEST Pre-K', ages: 'Ages 4 to 5', order: 2 } }]), 'rooms');
  ok(await admin.from('kids').insert([{ center_id: C, id: K1, data: { first: 'Olive', last: 'TEST', room: R1 } },
    { center_id: C, id: K2, data: { first: 'Omar', last: 'TEST', room: R1 } }, { center_id: C, id: K3, data: { first: 'Pia', last: 'TEST', room: R2 } }]), 'kids');
  for (const k of ['dir', 'teacher', 'family']) await makeUser(k, `w4-browser-${k}-${TAG}`);
  ok(await admin.from('memberships').insert([{ user_id: uid('dir'), center_id: C, role: 'director' }, { user_id: uid('teacher'), center_id: C, role: 'teacher' },
    { user_id: uid('family'), center_id: C, role: 'family' }]), 'memberships');
  ok(await admin.from('guardianships').insert({ user_id: uid('family'), center_id: C, kid: K1 }), 'guardianship');
  // history: the teacher marks Olive absent, then here (two history rows: created, changed present Absent -> Here)
  const t = await as('teacher');
  ok(await t.from('kidday').upsert({ center_id: C, id: `${K1}_${TODAY}`, data: { kid: K1, date: TODAY, room: R1, present: false } }, { onConflict: 'center_id,id' }), 'kidday 1');
  ok(await t.from('kidday').upsert({ center_id: C, id: `${K1}_${TODAY}`, data: { kid: K1, date: TODAY, room: R1, present: true, nap: '30 to 60 min' } }, { onConflict: 'center_id,id' }), 'kidday 2');
  // messages: one from 12 weeks ago (outside the 8-week window), one from this week
  ok(await t.from('msgs').insert([{ center_id: C, id: `w4-old-${TAG}`, data: { kid: K1, room: R1, from: 'teacher', text: `TEST old message ${TAG}`, at: daysAgo(84).getTime(), read: { teacher: true, family: true } } },
    { center_id: C, id: `w4-new-${TAG}`, data: { kid: K1, room: R1, from: 'teacher', text: `TEST recent message ${TAG}`, at: daysAgo(2).getTime(), read: { teacher: true, family: true } } }]), 'messages');
  ({ base, close: srv } = await startSite(SITE)); base = base.replace(/\/$/, '/');
  OBS.port = new URL(base).port;
  browser = await chromium.launch();
});
after(async () => {
  try { OBS.pageErrors = Object.fromEntries(Object.entries(pages).map(([k, p]) => [k, p.errs])); writeFileSync(join(OUT, 'observations.json'), JSON.stringify(OBS, null, 2)); } catch (_) { /* best effort */ }
  try { await browser?.close(); } catch (_) { /* closed */ }
  await srv?.();
  await admin.from('centers').delete().eq('id', C);
  await deleteUsers();
  const left = await admin.from('centers').select('id').eq('id', C);
  OBS.cleanup = { centerLeft: (left.data || []).length };
  try { writeFileSync(join(OUT, 'observations.json'), JSON.stringify(OBS, null, 2)); } catch (_) { /* best effort */ }
});

describe('W4 PORTAL in the browser (local Hub)', () => {
  test('1. Director: Edit history tab, keyboard filters, from -> to, axe clean at 1280', async () => {
    const p = await open('dir', 1280); await signIn(p, 'dir', 'teacher');
    assert.ok(await waitFor(() => p.$('[data-ptab="history"]')), 'the director has the Edit history tab');
    await p.click('[data-ptab="history"]');
    assert.ok(await waitFor(async () => /changes?, newest first/.test(await text(p)), 20000), `history did not load: ${(await text(p)).slice(0, 400)}`);
    const t = await text(p);
    assert.match(t, /changed Day record \(attendance, meals, rest, notes\) · Olive T\./);
    assert.match(t, /Attendance: Absent → (to )?Here/);
    assert.match(t, new RegExp(emailOf('teacher').replace(/[.]/g, '\\.')));
    await shot(p, '1-director-history-1280');
    // keyboard: choose the child and the kind of record, then submit, without the mouse
    await p.focus('#chhKid'); await p.keyboard.type('Ol');                     // type-ahead picks Olive T.
    const kidVal = await p.$eval('#chhKid', (s) => s.value);
    await p.keyboard.press('Tab'); await p.keyboard.type('Day');              // Day record ...
    await p.keyboard.press('Tab'); await p.keyboard.press('Tab'); await p.keyboard.press('Enter');   // Since (date), then Show changes
    assert.ok(await waitFor(async () => (await p.$eval('#chhStatus', (e) => e.textContent)).includes('newest first'), 15000));
    OBS.historyKeyboard = { kid: kidVal, table: await p.$eval('#chhTable', (s) => s.value), status: await p.$eval('#chhStatus', (e) => e.textContent), focus: await p.evaluate(() => document.activeElement && document.activeElement.id) };
    assert.equal(OBS.historyKeyboard.kid, K1); assert.equal(OBS.historyKeyboard.table, 'kidday');
    assert.match(OBS.historyKeyboard.status, /^2 changes, newest first/, 'only the day record of Olive: created, then changed');
    OBS.axeHistory1280 = await axe(p, '#chhCard');
    assert.deepEqual(OBS.axeHistory1280, [], 'axe: no serious or critical issue in the Edit history panel');
    await shot(p, '1b-director-history-filtered-1280');
  });

  test('1c. Director: Edit history at 390 px, no sideways scroll, axe clean', async () => {
    const p = await open('dir390', 390); await signIn(p, 'dir', 'teacher');
    await p.click('[data-ptab="history"]');
    assert.ok(await waitFor(async () => /newest first/.test(await text(p)), 20000));
    await p.$eval('#chhCard', (e) => e.scrollIntoView());
    await shot(p, '1c-director-history-390');
    assert.ok(await noSideScroll(p), 'no horizontal scroll at 390');
    OBS.axeHistory390 = await axe(p, '#chhCard');
    assert.deepEqual(OBS.axeHistory390, []);
  });

  test('2. Director: record a last day through a confirmation (keyboard), then clear it', async () => {
    const p = pages.dir;
    await p.click('[data-ptab="children"]');
    assert.ok(await waitFor(() => p.$('#chhLeft')), 'the leaving-date card is there');
    await p.selectOption('#chhLeftKid', K2);
    await p.fill('#chhLeftDate', TODAY);
    await p.focus('#chhLeftGo'); await p.keyboard.press('Enter');
    const okc = await waitFor(() => p.$('#chhConfirm'), 8000); await p.waitForTimeout(300);
    if (!okc) OBS.debugLeft = await p.evaluate(() => ({ lv: JSON.stringify(window.FFHistory._state.LV), tab: document.querySelector('[data-ptab][aria-pressed="true"]')?.dataset.ptab, card: document.getElementById('chhLeft')?.innerText.slice(0, 300), active: document.activeElement?.outerHTML.slice(0, 120) }));
    assert.ok(okc, 'a confirmation appears ' + JSON.stringify(OBS.debugLeft));
    const cf = await p.$eval('#chhConfirm', (e) => e.innerText);
    OBS.leftConfirm = cf.replace(/\s+/g, ' ');
    assert.match(OBS.leftConfirm, /Record Omar T\.'s last day/); assert.match(OBS.leftConfirm, /3 years after this day/);
    assert.equal(await p.evaluate(() => document.activeElement && document.activeElement.dataset.chl), 'yes', 'focus is on the confirm button');
    assert.equal(ok(await admin.from('kids').select('left_on').eq('center_id', C).eq('id', K2).single()).left_on, null, 'nothing saved before confirming');
    await p.$eval('#chhLeft', (e) => e.scrollIntoView()); await shot(p, '2-director-left-confirm-1280');
    await p.keyboard.press('Enter');
    assert.ok(await waitFor(async () => ok(await admin.from('kids').select('left_on').eq('center_id', C).eq('id', K2).single()).left_on === TODAY, 15000), 'kids.left_on set in the Hub');
    assert.ok(await waitFor(async () => /Leaving dates recorded/.test(await text(p)), 15000), 'shown as recorded');
    OBS.leftRecorded = (await p.$eval('#chhLeft', (e) => e.innerText)).replace(/\s+/g, ' ');
    await p.$eval('#chhLeft', (e) => e.scrollIntoView()); await shot(p, '2b-director-left-recorded-1280');
    const h = ok(await admin.from('care_history').select('changed,after,actor_id').eq('center_id', C).eq('table_name', 'kids').eq('record_id', K2));
    OBS.leftHistory = h.map((r) => ({ changed: r.changed, after: r.after, byDirector: r.actor_id === uid('dir') }));
    assert.ok(h.some((r) => r.changed.includes('left_on') && r.actor_id === uid('dir')), 'in the edit history, by the director');
    await p.focus(`[data-chl="clear"][data-chk="${K2}"]`); await p.keyboard.press('Enter');
    assert.ok(await waitFor(() => p.$('#chhConfirm')), 'clearing asks too');
    await p.waitForTimeout(300); await p.keyboard.press('Enter');
    assert.ok(await waitFor(async () => ok(await admin.from('kids').select('left_on').eq('center_id', C).eq('id', K2).single()).left_on === null, 15000), 'cleared');
    OBS.axeLeft = await axe(p, '#chhLeft');
    assert.deepEqual(OBS.axeLeft, []);
  });

  test('3. Teacher: no history tab; Messages loads recent weeks only, "Load earlier" brings the older message', async () => {
    const p = await open('teacher', 1280); await signIn(p, 'teacher', 'teacher');
    assert.ok(await waitFor(() => p.$('[data-ptab="messages"]')));
    assert.equal(await p.$('[data-ptab="history"]'), null, 'no Edit history tab for a teacher');
    await p.click('[data-ptab="messages"]'); await p.click(`[data-p2mk="${K1}"]`).catch(() => {});
    assert.ok(await waitFor(async () => (await text(p)).includes(`TEST recent message ${TAG}`), 20000), 'recent message shown');
    const t1 = await text(p);
    assert.ok(!t1.includes(`TEST old message ${TAG}`), 'the 12-week-old message is not loaded yet');
    const msgGets = p.reqs.filter((r) => r.method === 'GET' && /\/rest\/v1\/msgs\?/.test(r.url)).map((r) => decodeURIComponent(r.url.split('/rest/v1/')[1]));
    OBS.msgWindowQuery = msgGets[0];
    assert.match(OBS.msgWindowQuery, /date=gte\.\d{4}-\d{2}-\d{2}/, 'the window is asked of the database');
    assert.match(t1, /Showing messages from .* on\. Load earlier messages \(8 more weeks\)/);
    await shot(p, '3-teacher-messages-window-1280');
    await p.click('[data-p2earlier="msgs"]');
    assert.ok(await waitFor(async () => (await text(p)).includes(`TEST old message ${TAG}`), 20000), 'older message loaded');
    await shot(p, '3b-teacher-messages-earlier-1280');
    OBS.daysQuery = p.reqs.filter((r) => /\/rest\/v1\/days\?/.test(r.url)).map((r) => decodeURIComponent(r.url.split('/rest/v1/')[1]))[0];
    assert.match(OBS.daysQuery, /date=gte\./, 'day records are windowed too');
  });

  test('4. Realtime: a new message appears live; a deleted one disappears live, without re-downloading messages', async () => {
    const p = pages.teacher;
    await p.waitForTimeout(2500);
    const fam = await as('family');
    const msg = `TEST live from home ${TAG}`;
    ok(await fam.from('msgs').insert({ center_id: C, id: `w4-live-${TAG}`, data: { kid: K1, room: R1, from: 'family', text: msg, at: Date.now(), read: { teacher: false, family: true } } }), 'family writes');
    assert.ok(await waitFor(async () => (await text(p)).includes(msg), 15000), 'shown live');
    assert.ok((await text(p)).includes(`TEST recent message ${TAG}`), 'the message is on screen before it is deleted');
    const mark = p.reqs.length, t0 = Date.now();
    ok(await admin.from('msgs').delete().eq('center_id', C).eq('id', `w4-new-${TAG}`), 'a message is deleted in the Hub');
    assert.ok(await waitFor(async () => !(await text(p)).includes(`TEST recent message ${TAG}`), 15000), 'gone live');
    OBS.deleteLive = { ms: Date.now() - t0, msgsGets: p.reqs.slice(mark).filter((r) => r.method === 'GET' && /\/rest\/v1\/msgs\?/.test(r.url)).length,
      ws: p.reqs.filter((r) => r.url.startsWith('ws')).length };
    assert.equal(OBS.deleteLive.msgsGets, 0, 'the delete notice removed the row; no table download');
    await shot(p, '4-teacher-delete-live-1280');
  });

  test('5. Family at 390: no history tab; its child\'s deleted message disappears live; axe clean', async () => {
    const p = await open('family', 390); await signIn(p, 'family', 'family');
    assert.ok(await waitFor(async () => (await text(p)).includes(`TEST live from home ${TAG}`), 30000), `family view: ${(await text(p)).slice(0, 300)}`);
    assert.equal(await p.$('[data-ptab="history"]'), null);
    assert.ok(!/Edit history/.test(await text(p)));
    await p.waitForTimeout(2500);
    ok(await admin.from('msgs').delete().eq('center_id', C).eq('id', `w4-live-${TAG}`), 'deleted in the Hub');
    assert.ok(await waitFor(async () => !(await text(p)).includes(`TEST live from home ${TAG}`), 15000), 'gone live for the family');
    await p.$eval('#p2fMessages', (e) => e.scrollIntoView()).catch(() => {});
    await shot(p, '5-family-390');
    assert.ok(await noSideScroll(p));
    OBS.axeFamilyMsgs390 = await axe(p, '#p2fMessages');
    assert.deepEqual(OBS.axeFamilyMsgs390, []);
  });

  test('6. Paper sheet: network cut, opened from the Children tab, every room on its own page', async () => {
    const p = pages.teacher;
    await p.click('[data-ptab="children"]');
    await p.context().setOffline(true);
    await p.click('button[data-ffo="sheet"]');
    assert.ok(await waitFor(() => p.$('#ffoSheet')), 'sheet opened offline');
    await p.selectOption('#ffoRoom', '*');
    assert.ok(await waitFor(async () => (await p.$$('#ffoSheet .ffo-paper')).length === 2));
    const s = (await p.$eval('#ffoSheet', (e) => e.innerText)).replace(/\s+/g, ' ');
    OBS.sheet = s.slice(0, 600);
    assert.match(s, /Room: TEST Threes/); assert.match(s, /Room: TEST Pre-K/); assert.match(s, /Olive T\..*Omar T\./); assert.match(s, /Pia T\./);
    await shot(p, '6-paper-sheet-all-rooms-offline-1280');
    await p.emulateMedia({ media: 'print' });
    await p.evaluate(() => document.body.classList.add('ffo-printing'));
    OBS.printBreak = await p.$$eval('#ffoSheet .ffo-paper', (els) => els.map((e) => getComputedStyle(e).breakBefore));
    await p.pdf?.({ path: join(OUT, '6b-paper-sheet-all-rooms.pdf'), format: 'Letter', landscape: true }).catch(() => {});
    await p.evaluate(() => document.body.classList.remove('ffo-printing'));
    await p.emulateMedia({ media: 'screen' });
    assert.deepEqual(OBS.printBreak.slice(1), ['page'], 'the second room starts a new printed page');
    await p.keyboard.press('Escape');
    await p.context().setOffline(false);
  });
});
