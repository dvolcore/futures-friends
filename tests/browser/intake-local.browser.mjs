// E3 browser evidence (reevaluation 2026-10-05): the intended request route works end to end on this machine.
//   this worktree's site (Chromium) -> local intake gateway (CRM repo, compose.intake.yaml, 127.0.0.1:8097) -> durable ledger + reference
//   number -> EspoCRM Lead (127.0.0.1:8098) + confirmation email (Mailpit), and the site shows genuine success and failure states.
// FF_INTAKE.url comes from the git-ignored intake-config.local.js override (loaded only on localhost / 127.0.0.1). This script writes it
// only if it is missing and deletes it again at the end; it is never committed. Synthetic data only ("TEST Intake ECOMM ..."): the CRM
// records and the Mailpit messages it creates are deleted at the end (by reference number, with the CRM repo's own test helpers).
// Needs: the CRM stack, ff-intake and ff-mailpit running; playwright-core from the CRM repo's hub package.
//   node --test tests/browser/intake-local.browser.mjs        (EVIDENCE_DIR=... to choose where screenshots go)
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, execSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CRM = process.env.HUB_DIR ?? '/Volumes/FFCRM/app';
const GATEWAY = process.env.INTAKE_URL ?? 'http://127.0.0.1:8097';
const OUT = process.env.EVIDENCE_DIR ?? join(CRM, 'docs/reviews/shots-ECOMM');
const LOCAL = join(SITE, 'intake-config.local.js');
const { chromium } = createRequire(join(CRM, 'hub/package.json'))('playwright-core');
const COMMIT = execSync('git rev-parse --short HEAD', { cwd: SITE }).toString().trim();
const TAG = randomBytes(3).toString('hex');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp4': 'video/mp4' };
let server, port, browser, wroteLocal = false;
const refs = [];

// CRM + Mailpit check and cleanup through the CRM repo's intake test helpers (admin login from config/.env, never printed).
const PY = `
import sys, json, urllib.request
sys.path.insert(0, ${JSON.stringify(join(CRM, 'intake/tests'))})
from helpers import Crm, Mailpit, MAILPIT
mode, ref = sys.argv[1], sys.argv[2]
crm = Crm()
if mode == 'check':
    got = crm.wait_filed(ref, ['Lead'], timeout=120)
    lead = got['Lead'][0]
    msgs = Mailpit().search(ref, timeout=60)
    print(json.dumps({'entities': sorted(got), 'leads': len(got['Lead']), 'source': lead.get('source'), 'refInDescription': ref in (lead.get('description') or ''),
                      'testName': (lead.get('firstName') or '').startswith('TEST') or (lead.get('lastName') or '').startswith('TEST') or 'TEST Intake' in (lead.get('name') or ''),
                      'mails': len(msgs), 'mailSubjectsHaveRef': all(ref in m['Subject'] for m in msgs)}))
else:
    crm.refs.append(ref); crm.purge()
    ids = [m['ID'] for m in Mailpit().search(ref, timeout=2)]
    if ids:
        req = urllib.request.Request(MAILPIT + '/api/v1/messages', data=json.dumps({'IDs': ids}).encode(), method='DELETE', headers={'Content-Type': 'application/json'})
        urllib.request.urlopen(req, timeout=30).read()
    print(json.dumps({'crmLeft': sorted(crm.by_ref(ref)), 'mailsDeleted': len(ids)}))
`;
const py = (mode, ref) => JSON.parse(execFileSync('python3', ['-c', PY, mode, ref], { encoding: 'utf8', timeout: 240000 }).trim().split('\n').pop());

before(async () => {
  const h = await fetch(GATEWAY + '/health').then(r => r.json()).catch(() => null);
  assert.equal(h && h.status, 'ok', 'the local intake gateway is up (CRM repo: docker-compose -f compose.intake.yaml up -d)');
  if (!existsSync(LOCAL)) { writeFileSync(LOCAL, `window.FF_INTAKE = { url: ${JSON.stringify(GATEWAY)}, turnstileSiteKey: '' };\n`); wroteLocal = true; }
  mkdirSync(OUT, { recursive: true });
  server = createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p === '/') p = '/index.html';
    const f = normalize(join(SITE, p));
    if (!f.startsWith(SITE) || !existsSync(f) || statSync(f).isDirectory() || /(hub|analytics)-config\.local\.js$/.test(f)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); createReadStream(f).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  port = server.address().port;
  browser = await chromium.launch();
});

after(async () => {
  for (const ref of refs) { const c = py('purge', ref); console.log('E3 cleanup', ref, JSON.stringify(c)); assert.deepEqual(c.crmLeft, [], `CRM records for ${ref} deleted`); }
  if (browser) await browser.close();
  if (server) server.close();
  if (wroteLocal && existsSync(LOCAL)) unlinkSync(LOCAL);
});

async function contactPage(width, override) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  if (override !== undefined) await page.route('**/intake-config.local.js', r => r.fulfill({ contentType: 'text/javascript', body: `window.FF_INTAKE = { url: ${JSON.stringify(override)}, turnstileSiteKey: '' };` }));
  await page.goto(`http://127.0.0.1:${port}/?fresh=${COMMIT}#contact`, { waitUntil: 'networkidle' });
  return { ctx, page };
}
async function fill(page, message) {
  await page.selectOption('#cInterest', 'question');
  await page.fill('#cName', `TEST Intake ECOMM ${TAG}`);
  await page.fill('#cEmail', `test-intake-ecomm-${TAG}@example.com`);
  await page.selectOption('#cType', 'center');
  await page.fill('#cZip', '64052');
  await page.fill('#cMsg', message);
}

test('success: a synthetic inquiry reaches the gateway, gets a reference number, and is filed in the CRM with a confirmation email', async () => {
  const { ctx, page } = await contactPage(1280);
  assert.equal(await page.evaluate(() => window.FFIntake.enabled()), true, 'FF_INTAKE.url points at the local gateway');
  assert.equal(await page.locator('.ffi-soon').count(), 0, 'with a gateway the form is real, not "open soon"');
  await fill(page, `Synthetic ECOMM check ${TAG}: please ignore.`);
  await page.waitForTimeout(3500);                                  // the gateway refuses forms sent faster than a person could fill them
  await page.click('#ffiContact button[type="submit"]');
  await page.waitForSelector('#ffiOk', { timeout: 60000 });
  const ref = (await page.textContent('.ffi-ref b')).trim();
  assert.match(ref, /^FF-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  refs.push(ref);
  const t = await page.textContent('#ffiOk');
  assert.match(t, /Request received/); assert.match(t, /A real person will contact you within 2 business days/);
  await page.locator('#ffiContactCard').screenshot({ path: join(OUT, 'e3-success-1280.png') });
  const crm = py('check', ref);
  assert.deepEqual(crm.entities, ['Lead']); assert.equal(crm.leads, 1, 'filed once');
  assert.equal(crm.refInDescription, true, 'staff can find the lead by its reference number');
  assert.ok(crm.mails >= 1 && crm.mailSubjectsHaveRef, 'confirmation email carries the reference number');
  console.log('E3 success evidence', JSON.stringify({ ref, ...crm }));
  await ctx.close();
});

test('failure: the gateway refuses a request and the site says nothing was sent (genuine 422 from the real gateway)', async () => {
  const { ctx, page } = await contactPage(390);
  await fill(page, `Synthetic ECOMM refusal ${TAG}: https://a.example/1 https://b.example/2 https://c.example/3`);   // more than two links: refused
  await page.waitForTimeout(3500);
  await page.click('#ffiContact button[type="submit"]');
  await page.waitForFunction(() => { const m = document.querySelector('[data-ffi-msg]'); const e = document.getElementById('cMsg-e'); return (m && m.textContent) || (e && e.textContent); }, null, { timeout: 30000 });
  assert.equal(await page.locator('#ffiOk').count(), 0, 'no receipt is shown for a refused request');
  const shown = await page.evaluate(() => [document.querySelector('[data-ffi-msg]')?.textContent || '', document.getElementById('cMsg-e')?.textContent || ''].join(' ').trim());
  assert.ok(shown.length > 5, 'the refusal is shown: ' + shown);
  await page.locator('#ffiContactCard').screenshot({ path: join(OUT, 'e3-refused-390.png') });
  console.log('E3 refusal shown:', shown);
  await ctx.close();
});

test('failure: an unreachable gateway shows "nothing was sent" with the phone number, never a receipt', async () => {
  const { ctx, page } = await contactPage(390, 'http://127.0.0.1:9');
  await fill(page, `Synthetic ECOMM offline ${TAG}.`);
  await page.click('#ffiContact button[type="submit"]');
  await page.waitForFunction(() => /nothing was sent/.test(document.querySelector('[data-ffi-msg]')?.textContent || ''), null, { timeout: 45000 });
  assert.equal(await page.locator('#ffiOk').count(), 0);
  assert.match(await page.textContent('[data-ffi-msg]'), /\(816\) 988-5661/);
  assert.match(await page.textContent('#ffiContact button[type="submit"]'), /Try again/);
  await page.locator('#ffiContactCard').screenshot({ path: join(OUT, 'e3-unreachable-390.png') });
  await ctx.close();
});

test('with no gateway configured (the live site today) the form says "open soon" and offers call and a prefilled email', async () => {
  const { ctx, page } = await contactPage(1280, '');
  const soon = page.locator('.ffi-soon');
  assert.equal(await soon.count(), 1);
  assert.equal(await soon.locator('a[href^="tel:+18169885661"]').count(), 1);
  const mail = await soon.locator('a[href^="mailto:"]').getAttribute('href');
  assert.equal(mail, 'mailto:info@futureslearningcenter.com?subject=Futures%20Friends%20website%3A%20Information%20request');
  await soon.screenshot({ path: join(OUT, 'e3-open-soon-1280.png') });
  await ctx.close();
});
