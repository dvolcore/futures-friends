'use strict';
// The whole public website in Spanish (owner 2026-10-10: "make it more bilingual across the board with everything so that somebody
// who is bilingual does not miss out"). Real headless Chromium past the entry gate, the site switched to Spanish (?lang=es):
//  - every public route (tools/i18n-audit.mjs: the prerendered pages, the store flow and the sign-in doors; investor pages are
//    owner-only and out of scope) shows no English text, screen-reader label, image description, tab title or meta description
//    beyond tools/i18n-allow.json (names and titles that stay English on purpose);
//  - the site-wide Spanish pack (i18n-es-site.js) is downloaded only while Spanish is on; the tab title follows the language;
//  - a browser that prefers Spanish is offered the switch until a language is chosen; the choice persists across pages;
//  - Spanish requests say so to the center; every page names its Spanish address (hreflang); the 404 page has Spanish.
// Every Spanish string is a DRAFT pending review by the center's Spanish teacher: this checks coverage, not wording.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const ALLOW = new Set(JSON.parse(read('tools/i18n-allow.json')).strings);

test('every public route in Spanish shows no English beyond the allowlist (tools/i18n-audit.mjs)', { timeout: 1800000 }, async () => {
  const A = await import('../tools/i18n-audit.mjs');
  const list = A.routes();
  assert.ok(list.length >= 170, `${list.length} routes`);
  const { res } = await A.audit(list, { wait: 700 });
  const bad = [];
  for (const r of res) {
    assert.ok(!r.error, `${r.key}: ${r.error}`);
    assert.equal(r.lang, 'es', `${r.key}: <html lang="es">`);
    const left = r.english.filter(e => !ALLOW.has(e.s));
    if (left.length) bad.push(`${r.key} (${left.length}): ` + left.slice(0, 4).map(e => `[${e.k}] ${JSON.stringify(e.s.slice(0, 80))}`).join(' · '));
  }
  assert.equal(bad.length, 0, `English left on ${bad.length} routes:\n` + bad.slice(0, 25).join('\n'));
});

test('the allowlist is small and holds only names, titles and codes (no sentences)', () => {
  assert.ok(ALLOW.size <= 120, `${ALLOW.size} allowed strings`);
  for (const s of ALLOW) assert.ok(s.split(/\s+/).length <= 12, `too long to be a name: ${s}`);
});

const H = () => import('./a11y-harness.mjs');
let h, site, browser;
test.before(async () => { h = await H(); site = await h.startSite(); browser = await h.loadChromium().launch(); });
test.after(async () => { if (browser) await browser.close(); if (site) await site.close(); });

test('the Spanish pack loads only in Spanish; the tab title, meta description and <html lang> follow the language', async () => {
  const ctx = await browser.newContext({ viewport: h.SIZES[1280], reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const packs = []; page.on('request', r => { if (/i18n-es-site\.js/.test(r.url())) packs.push(r.url()); });
  await page.goto(site.base + '?nogate&nostamp#kids-shop', { waitUntil: 'load' });
  await page.waitForTimeout(500);
  assert.equal(packs.length, 0, 'English never downloads the Spanish pack');
  const en = await page.evaluate(() => ({ title: document.title, lang: document.documentElement.lang }));
  assert.equal(en.lang, 'en');
  await page.click('header.bar [data-ff-lang]');
  await page.waitForFunction(() => document.documentElement.lang === 'es' && /Tienda para Niños/.test(document.title), null, { timeout: 10000 });
  assert.equal(packs.length, 1, 'Spanish downloads the pack once');
  const es = await page.evaluate(() => ({ desc: document.querySelector('meta[name="description"]').content, stored: localStorage.getItem('ff-lang') }));
  assert.equal(es.stored, 'es', 'the choice is remembered');
  assert.doesNotMatch(es.desc, /\b(the|and|for)\b/, 'the meta description is Spanish');
  // the choice persists to another page (a real prerendered address) and back to English restores the English title
  await page.goto(site.base + 'habits?nogate&nostamp', { waitUntil: 'load' });
  await page.waitForFunction(() => document.documentElement.lang === 'es', null, { timeout: 10000 });
  await page.click('#ff-lang-note [data-ff-lang-to="en"]');
  await page.waitForFunction(() => document.documentElement.lang === 'en' && !/[áéíóúñ]/.test(document.title), null, { timeout: 10000 });
  await ctx.close();
});

test('a browser that prefers Spanish is offered the switch until a language is chosen; "No, gracias" is remembered', async () => {
  const ctx = await browser.newContext({ viewport: h.SIZES[390], reducedMotion: 'reduce', locale: 'es-MX' });
  const page = await ctx.newPage();
  await page.goto(site.base + '?nogate&nostamp#home', { waitUntil: 'load' });
  await page.waitForSelector('#ff-lang-note [data-ff-lang-to="es"]', { timeout: 10000 });
  assert.equal(await page.evaluate(() => document.documentElement.lang), 'en', 'offered, not forced');
  await page.click('#ff-lang-note [data-ff-lang-offer-no]');
  await page.waitForFunction(() => !document.getElementById('ff-lang-note'));
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(400);
  assert.equal(await page.$('#ff-lang-note'), null, 'not offered again');
  await ctx.close();
  const ctx2 = await browser.newContext({ viewport: h.SIZES[390], reducedMotion: 'reduce', locale: 'es-US' });
  const p2 = await ctx2.newPage();
  await p2.goto(site.base + '?nogate&nostamp#home', { waitUntil: 'load' });
  await p2.click('#ff-lang-note [data-ff-lang-to="es"]');
  await p2.waitForFunction(() => document.documentElement.lang === 'es' && /borrador/.test((document.getElementById('ff-lang-note') || {}).textContent || ''));
  await ctx2.close();
  const ctx3 = await browser.newContext({ viewport: h.SIZES[390], reducedMotion: 'reduce' });   // en-US: no offer
  const p3 = await ctx3.newPage();
  await p3.goto(site.base + '?nogate&nostamp#home', { waitUntil: 'load' }); await p3.waitForTimeout(400);
  assert.equal(await p3.$('#ff-lang-note'), null);
  await ctx3.close();
});

test('voiced videos default to Spanish captions while Spanish is on', async () => {
  const ctx = await browser.newContext({ viewport: h.SIZES[1280], reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(site.base + '?nogate&nostamp&lang=es#bop-at-home', { waitUntil: 'load' });
  await page.waitForSelector('video track[srclang="es"]', { timeout: 15000, state: 'attached' });
  const t = await page.evaluate(() => [...document.querySelectorAll('video')].filter(v => v.querySelector('track')).map(v => {
    const d = v.querySelector('track[default]'); return d ? d.getAttribute('srclang') : null;
  }));
  assert.ok(t.length > 0 && t.every(x => x === 'es'), `default tracks: ${t.join(',')}`);
  await ctx.close();
});

// intake.js against a scripted gateway (the same harness as tests/intake.test.js)
function intake(langEs) {
  const calls = [];
  const fetch = async (u, init = {}) => {
    const p = u.replace('http://gw.test', '');
    calls.push({ method: init.method, path: p, body: init.body });
    if (p.startsWith('/v1/form-token')) return { status: 200, headers: { get: () => null }, json: async () => ({ token: '1.abc', minFillSeconds: 0.001 }) };
    return { status: 202, headers: { get: () => null }, json: async () => ({ ref: 'FF-ABCD-2345', emailConfirmation: 'queued', replyBusinessDays: 2 }) };
  };
  const c = vm.createContext({
    console, setTimeout, clearTimeout, AbortController, FormData, File, fetch, URLSearchParams,
    V: {}, KEYS: [], phero: () => '', card: () => '', PHONE: '(816) 988-5661', EMAIL: 'info@example.org',
    window: { FF_INTAKE: { url: 'http://gw.test' }, crypto: require('node:crypto').webcrypto, FFi18n: langEs ? { lang: 'es' } : undefined },
    document: { getElementById: () => null, createElement: () => ({}), head: { appendChild() {} }, addEventListener() {}, querySelector: () => null },
  });
  vm.runInContext(read('intake.js'), c, { filename: 'intake.js' });
  return { api: c.window.FFIntake, calls };
}
test('a request sent from the Spanish site tells the center the family prefers Spanish (English requests are unchanged)', async () => {
  const sent = async (es, kind, data) => { const { api, calls } = intake(es); await api.submit(kind, data); return JSON.parse(calls.find(x => x.path === '/v1/inquiry').body); };
  const a = await sent(true, 'contact', { name: 'Ana P', email: 'a@b.co', message: 'Hola' });
  assert.match(a.message, /^Hola\n\n\[Idioma preferido: español \/ Preferred language: Spanish\]$/);
  const b = await sent(true, 'tour', { name: 'Ana P', phone: '8165551234', location: 'flc' });
  assert.match(b.message, /Idioma preferido: español/, 'an empty optional message carries the tag');
  const c = await sent(true, 'enrollment', { name: 'Ana P', message: 'x'.repeat(480) });
  assert.equal(c.message, 'x'.repeat(480), 'never pushes a message past the gateway limit');
  const d = await sent(true, 'subscribe', { email: 'a@b.co' });
  assert.equal(d.message, undefined, 'sign-ups have no message field');
  const e = await sent(false, 'contact', { name: 'Ana P', email: 'a@b.co', message: 'Hi' });
  assert.equal(e.message, 'Hi');
});

test('every prerendered page names its Spanish address (hreflang), and the 404 page has Spanish', () => {
  const m = JSON.parse(read('docs/seo-manifest.json'));
  for (const p of m.pages) {
    const html = read(p.file);
    assert.ok(html.includes(`<link rel="alternate" hreflang="es" href="${p.url}?lang=es">`), `${p.file}: hreflang es`);
    assert.ok(html.includes(`<link rel="alternate" hreflang="x-default" href="${p.url}">`), `${p.file}: x-default`);
  }
  const nf = read('404.html');
  assert.match(nf, /<section id="nf-es" lang="es"><h2>No encontramos esa página<\/h2>/);
  assert.match(nf, /borrador/);
});

test('the Spanish pack says it is a draft and has no empty values', () => {
  const src = read('i18n-es-site.js');
  assert.match(src, /DRAFT/);
  const sb = { console, location: { search: '', hash: '' } }; sb.window = sb; sb.globalThis = sb;
  const c = vm.createContext(sb);
  vm.runInContext(read('i18n.js'), c); vm.runInContext(src, c);
  const es = c.FFi18n._tables.es;
  assert.ok(es.size > 3500, `${es.size} entries`);
  for (const [k, v] of es) assert.ok(typeof v === 'string' && v.trim(), `empty Spanish for ${k}`);
  assert.doesNotMatch(src, /\binfants?\b|\bbebés?\b/i);
});
