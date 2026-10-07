'use strict';
// Print kit for the flagship team (launch checklist E04-E09): the PDFs exist, are US Letter with embedded fonts, carry their
// draft label on every page, use only the site's own art and confirmed facts, and are linked from #printables.
// Rebuild with `node tools/build-print-kit.mjs` (headless Chromium); evidence renders live outside the repo.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { readPdf, compact } = require('./pdf-text.js');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const { PRINT_KIT } = require(path.join(ROOT, 'family-library-data.js'));
const SRC_DIR = 'printables/marketing/src';
const builder = read('tools/build-print-kit.mjs');
const SOURCE = Object.fromEntries([...builder.match(/const SOURCE = \{([\s\S]*?)\};/)[1].matchAll(/'([\w-]+)': '([\w.-]+)'/g)].map(m => [m[1], m[2]]));
const pdfs = Object.fromEntries(PRINT_KIT.map(k => [k.id, readPdf(fs.readFileSync(path.join(ROOT, k.f)))]));
const pdfText = k => pdfs[k.id].pages.map(p => p.compact).join('');
const ATTORNEY = 'DRAFT — needs attorney review';

test('the kit covers E04 to E09, each entry has a source and a built PDF', () => {
  assert.deepEqual(PRINT_KIT.flatMap(k => k.ids).sort(), ['E04', 'E05', 'E06', 'E07', 'E08', 'E09']);
  for (const k of PRINT_KIT) {
    assert.ok(SOURCE[k.id], `builder maps ${k.id} to a source`);
    assert.ok(fs.existsSync(path.join(ROOT, SRC_DIR, SOURCE[k.id])), `${k.id} source exists`);
    assert.match(k.f, /^printables\/marketing\/futures-kit-[a-z-]+\.pdf$/);
    assert.equal(fs.readFileSync(path.join(ROOT, k.f)).subarray(0, 5).toString(), '%PDF-', k.f);
  }
});

test('every kit PDF is US Letter (612 x 792 pt), has the listed page count and embeds every font as TrueType', () => {
  for (const k of PRINT_KIT) {
    const { pages, fonts } = pdfs[k.id];
    assert.equal(pages.length, k.pages, `${k.f} page count`);
    for (const [i, p] of pages.entries()) assert.deepEqual([p.width, p.height], [612, 792], `${k.f} page ${i + 1} is US Letter`);
    assert.ok(fonts.length >= 2, `${k.f} has real text in fonts`);
    for (const f of fonts) {
      assert.ok(f.embedded, `${k.f}: ${f.name} is embedded`);
      assert.notEqual(f.type, 'Type3', `${k.f}: ${f.name} is a real font, not Type 3 glyphs`);
    }
    for (const [i, p] of pages.entries()) assert.ok(p.compact.length > 200, `${k.f} page ${i + 1} is real text, not an image`);
  }
});

test('drafts carry their label on every page; the release form and photo notice say they need attorney review', () => {
  for (const k of PRINT_KIT) {
    const html = read(`${SRC_DIR}/${SOURCE[k.id]}`);
    if (/class="ph"/.test(html)) assert.ok(k.draft, `${k.id} has placeholders, so it must be a draft`);
    if (!k.draft) continue;
    for (const [i, p] of pdfs[k.id].pages.entries()) assert.ok(p.compact.includes(compact(k.draft)), `${k.f} page ${i + 1} shows "${k.draft}"`);
    assert.match(html.match(/<title>([^<]*)<\/title>/)[1], /DRAFT/, `${k.id} title says DRAFT`);
  }
  for (const id of ['media-release', 'photo-consent']) assert.equal(PRINT_KIT.find(k => k.id === id).draft, ATTORNEY);
  assert.match(pdfText(PRINT_KIT.find(k => k.id === 'media-release')), new RegExp(compact('Not for signature')));
});

test('the media release form offers levels 0 to 4 and a names choice; the Photo OK list is office-only', () => {
  const mr = pdfText(PRINT_KIT.find(k => k.id === 'media-release'));
  for (const l of ['Level0', 'Level1', 'Level2', 'Level3', 'Level4', 'Namesincaptions', 'Donotusemychild\'sname']) assert.ok(mr.includes(l), l);
  const pc = pdfText(PRINT_KIT.find(k => k.id === 'photo-consent'));
  for (const t of ['Photosofchildrenhere', 'Visitors,pleasedonotphotographorrecordchildren', 'PhotoOKlist', 'officeonly·notfordisplay']) assert.ok(pc.toLowerCase().includes(t.toLowerCase()), t);
});

test('business cards: 3.5 x 2 in trim, 0.125 in bleed, 8-up with crop marks; names and phones stay labelled placeholders', () => {
  const html = read(`${SRC_DIR}/director-business-cards.html`);
  assert.match(html, /W = 3\.75, H = 2\.25, B = 0\.125/);
  assert.equal(JSON.parse('[' + html.match(/COLS = \[([^\]]+)\]/)[1] + ']').length * JSON.parse('[' + html.match(/ROWS = \[([^\]]+)\]/)[1] + ']').length, 8);
  assert.match(html, /className = 'mark '/);
  const t = pdfText(PRINT_KIT.find(k => k.id === 'business-cards'));
  assert.ok(t.includes(compact('Trim 3.5 x 2 in · bleed 0.125 in · 8-up on US Letter')));
  assert.equal((t.match(/PLACEHOLDER:directorname/g) || []).length, 8, 'every card front labels the name a placeholder');
  assert.equal((t.match(/PLACEHOLDER:directorphone/g) || []).length, 8);
});

test('the enrollment checklist is one per child and records no health details', () => {
  const t = pdfText(PRINT_KIT.find(k => k.id === 'enrollment-checklist'));
  assert.ok(t.includes(compact('one checklist per child').toUpperCase()));
  assert.ok(t.includes(compact('No health details on this page.')));
  assert.ok(t.includes(compact('never entered in the Futures Hub')));
});

test('E04: the library sheet replaces the Imagination Library sign-up with sourced facts and dates', () => {
  const k = PRINT_KIT.find(x => x.id === 'library-card-sheet');
  const t = pdfText(k), html = read(`${SRC_DIR}/library-card-sheet.html`);
  assert.ok(t.includes(compact("Missouri's program is not taking new sign-ups.")));
  assert.ok(t.includes(compact('beginning July 1, 2026')));
  assert.ok(t.includes(compact('No reopening date has been announced.')));
  for (const src of ['dese.mo.gov/childhood/outreach/dolly-partons-imagination-library', 'imaginationlibraryks.org', 'mymcpl.org/about/get-help/get-a-library-card',
    'mymcpl.org/kids/early-learners/1000-books', 'mymcpl.org/kids/early-learners/storytimes', 'mymcpl.org/locations']) assert.ok(html.includes(src), 'cites ' + src);
  assert.match(html, /all accessed 2026-10-05/);
  assert.doesNotMatch(html, /when (sign-ups|Missouri) reopen|help families enroll/i, 'no promise of a reopening');
});

test('kit copy keeps to confirmed facts: no licensed, infant, hours or price claims, current pillars and canon names', () => {
  const all = PRINT_KIT.map(k => read(`${SRC_DIR}/${SOURCE[k.id]}`)).join('\n');
  const banned = [
    [/\blicensed\b|\blicense[sd]? (teacher|program|center)/i, 'no licensed claims'], [/infant/i, 'no infant-room claims'],
    [/\b\d{1,2}(:\d{2})?\s*(AM|PM|a\.m\.|p\.m\.)/i, 'no hours'], [/\$\s?\d/, 'no prices until the owner confirms (G09)'],
    [/READ with|PLAY with|'READ'/, 'old READ/PLAY pillars'], [/Happy Doer|big hearts/i, 'retired lines'], [/Green Giants/i, 'retired rainbow name'],
    [/immuniz|allerg|medicat|diagnos|\bIEP\b|IFSP/i, 'no health data fields'], [/fonts\.googleapis|fonts\.gstatic|https?:\/\/(?!dvolcore)/, 'nothing loaded from other sites']
  ];
  for (const [re, why] of banned) assert.doesNotMatch(all, re, why);
  assert.match(read(`${SRC_DIR}/flyer.html`), /Futures Friends is piloting at Futures Learning Center in Independence, Missouri/);
  for (const p of ['LEARN', 'BELONG', 'EXPLORE', 'MOVE']) assert.match(read(`${SRC_DIR}/flyer.html`), new RegExp(`<b>${p}</b>`));
  for (const n of ['Red Rockets', 'Orange Sunshine', 'Yellow Sunbeams', 'Green Sprouts', 'Purple Pals', 'Cozy Clouds']) assert.match(read(`${SRC_DIR}/flyer.html`), new RegExp(n));
});

test('kit sources use only the site fonts and approved art, and character art is never stretched', () => {
  for (const k of PRINT_KIT) {
    const f = SOURCE[k.id], html = read(`${SRC_DIR}/${f}`);
    const refs = [...html.matchAll(/\b(?:src|href)="([^"#]+)"/g)].map(m => m[1]);
    assert.ok(refs.includes('kit.css'), f + ' uses kit.css');
    for (const r of refs) {
      assert.ok(fs.existsSync(path.join(ROOT, SRC_DIR, r)), `${f}: ${r} resolves`);
      if (/\.(png|webp|jpe?g|svg)$/.test(r)) assert.match(r, /^(\.\.\/\.\.\/\.\.\/img\/(brand\/(ff-plush-wordmark-640|ff-plush-mark-512|flc-lockup)\.png|cut_(booker|lumi|zuri|bop)\.webp)|qr-tour\.svg)$/, `${f}: ${r} is approved art`);
    }
    for (const m of html.matchAll(/<img[^>]*cut_[^>]*>/g)) { assert.match(m[0], /class="cut"/, 'character art uses the .cut class'); assert.doesNotMatch(m[0], /\b(width|height)=/, 'no fixed box on character art'); }
  }
  const css = read(`${SRC_DIR}/kit.css`);
  assert.match(css, /img\.cut \{ height: var\(--h, [\d.]+in\); width: auto; object-fit: contain; \}/);
  assert.match(css, /@import url\('\.\.\/\.\.\/\.\.\/fonts\/fonts\.css'\)/);
  assert.match(css, /@page \{ size: 8\.5in 11in; margin: 0; \}/);
  assert.match(read(`${SRC_DIR}/qr-tour.svg`), /aria-label="QR code: https:\/\/dvolcore\.github\.io\/futures-friends\/#enroll"/);
});

test('#printables lists only the finished family sheet; staff drafts are built but not linked publicly', () => {
  const window = { FFhooks: [], FF_INTAKE: { url: '' } };
  const context = vm.createContext({ console, window, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {}, innerHeight: 800, FormData, URLSearchParams,
    document: { addEventListener() {}, getElementById: () => null, createElement: () => ({}), head: { appendChild() {} }, querySelector: () => null, querySelectorAll: () => [] } });
  for (const f of ['data.js', 'plush-cast.js', 'supporting-cast.js', 'views.js', 'whole-child.js', 'family-library-data.js', 'family-library.js']) vm.runInContext(read(f), context, { filename: f });
  const html = vm.runInContext('arg = null; V.printables()', context);
  assert.match(html, /id="fl-kit"/);
  assert.doesNotMatch(html, /center team|Print kit/, 'no staff kit on the family page');
  const fam = PRINT_KIT.filter(k => k.family);
  assert.deepEqual(fam.map(k => k.id), ['library-card-sheet']);
  for (const k of fam) {
    assert.ok(html.includes(`href="${k.f}" download`), k.f + ' is linked');
    assert.ok(fs.existsSync(path.join(ROOT, k.f)), k.f + ' link resolves');
    assert.equal(k.draft, null, 'only finished sheets are public');
  }
  const site = fs.readdirSync(ROOT).filter(f => /\.(js|html)$/.test(f) && f !== 'family-library-data.js').map(f => read(f)).join('\n') + html;
  for (const k of PRINT_KIT.filter(k => !k.family)) {
    assert.ok(fs.existsSync(path.join(ROOT, k.f)), k.f + ' is still built');
    assert.ok(!site.includes(k.f), k.f + ' is not linked from the public site');
  }
  const idx = read('index.html');
  const v = name => +idx.match(new RegExp(name.replace('.', '\\.') + '\\?v=(\\d+)'))[1];
  assert.ok(v('family-library-data.js') >= 4 && v('family-library.js') >= 5, 'cache-busted');
});
