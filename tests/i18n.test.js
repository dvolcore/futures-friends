// English / Spanish (owner decision 2026-10-07). Checks the switch (i18n.js), the Spanish phrase tables, the Spanish library and book
// data, the Spanish caption tracks and that the Story Time reader really reads Spanish when the site is in Spanish.
// Every Spanish string is a draft pending review by the center's Spanish teacher; these tests check structure, not wording.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { site, read, text, ROOT } = require('./site-vm.js');

const TABLES = ['i18n-es.js', 'i18n-es-2.js', 'i18n-es-3.js', 'i18n-es-4.js', 'i18n-es-5.js'];
function i18n({ search = '', stored = null } = {}) {
  const ls = new Map(stored ? [['ff-lang', stored]] : []);
  const sb = { console, location: { search, hash: '' }, localStorage: { getItem: k => (ls.has(k) ? ls.get(k) : null), setItem: (k, v) => ls.set(k, String(v)) } };
  sb.window = sb; sb.globalThis = sb;
  const c = vm.createContext(sb);
  vm.runInContext(read('i18n.js'), c, { filename: 'i18n.js' });
  for (const f of TABLES) vm.runInContext(read(f), c, { filename: f });
  return { I: c.FFi18n, ls };
}

test('the switch: English by default, ?lang=es and the remembered choice turn Spanish on', () => {
  assert.equal(i18n().I.lang, 'en');
  const u = i18n({ search: '?lang=es' }); assert.equal(u.I.lang, 'es'); assert.equal(u.ls.get('ff-lang'), 'es', '?lang=es is remembered');
  assert.equal(i18n({ stored: 'es' }).I.lang, 'es');
  assert.equal(i18n({ stored: 'fr' }).I.lang, 'en', 'an unknown language falls back to English');
  assert.equal(i18n({ search: '?lang=en', stored: 'es' }).I.lang, 'en', 'the URL wins over the stored choice');
});

test('lookup: exact phrases with whitespace collapsed, patterns for numbers, English when there is no entry', () => {
  const { I } = i18n();
  I.add('es', { 'Hello  there': 'Hola' }, [[/^(\d+) apples$/, '$1 manzanas']]);
  assert.equal(I.lookup('  Hello\n there ', 'es'), 'Hola');
  assert.equal(I.lookup('12 apples', 'es'), '12 manzanas');
  assert.equal(I.lookup('No entry for this one', 'es'), null);
  assert.equal(I.t('No entry for this one'), 'No entry for this one');
  assert.equal(I.lookup('Hello there', 'en'), null, 'English never translates');
});

test('the phrase tables parse, have no empty values and cover the site chrome', () => {
  const { I } = i18n();
  const es = I._tables.es;
  assert.ok(es.size > 1000, `phrase table has ${es.size} entries`);
  for (const [k, v] of es) { assert.equal(typeof v, 'string', k); assert.ok(v.trim(), `empty Spanish for "${k}"`); }
  for (const s of ['Story Time', 'Read to me', 'Futures at Home (free)', 'Talk to a real person', 'Tap to enter', 'Enter without sound']) assert.ok(I.lookup(s, 'es'), `no Spanish for "${s}"`);
});

test('family pages: at least 95% of their English strings have Spanish (tools/i18n-extract.js)', () => {
  const { main } = require('../tools/i18n-extract.js');
  const log = console.log; console.log = () => {}; let r; try { r = main(); } finally { console.log = log; }
  const ratio = 1 - r.missing.length / r.rows.length;
  assert.ok(ratio >= 0.95, `Spanish covers ${(ratio * 100).toFixed(1)}%; missing e.g. ${r.missing.slice(0, 8).map(x => JSON.stringify(x.s)).join(', ')}`);
});

// The library and book data, loaded the way the page loads them.
function lib() {
  const sb = { console }; sb.window = sb; const c = vm.createContext(sb);
  for (const f of ['family-library-data.js', 'family-library-es.js', 'family-library-es-books.js']) vm.runInContext(read(f), c, { filename: f });
  return { F: c.FFFamily, ES: c.FFFamilyES };
}

test('Spanish books: every book, every page, the same lists, and the say-along line where the English has it', () => {
  const { F, ES } = lib();
  // the four revised books (2026-10-07) stay English until re-translated: see the next-but-one test
  for (const b of F.BOOKS.filter(x => !x.rev)) {
    const e = ES.books[b.id]; assert.ok(e, `no Spanish for ${b.id}`);
    assert.ok(e.title && e.refrain, `${b.id}: title and refrain`);
    assert.equal(e.spreads.length, b.spreads.length, `${b.id}: page count`);
    b.spreads.forEach((s, i) => {
      const x = e.spreads[i]; assert.ok(x.p && x.p.trim(), `${b.id} p${i + 1}: page text`);
      if (s.q) assert.equal(x.q[0], s.q[0], `${b.id} p${i + 1}: CROWD letter kept`);
      if (s.p.includes(b.refrain)) assert.ok(x.p.includes(e.refrain), `${b.id} p${i + 1}: the Spanish refrain is on the page`);
    });
    for (const k of ['talk', 'goals']) if (b[k]) assert.equal((e[k] || []).length, b[k].length, `${b.id}: ${k}`);
    assert.equal(e.act.steps.length, b.act.steps.length, `${b.id}: activity steps`);
  }
});

test('Spanish activities and library data: every activity, same list lengths', () => {
  const { F, ES } = lib();
  for (const a of F.ACTS) {
    const e = ES.acts[a.id]; assert.ok(e && e.t, `no Spanish for activity ${a.id}`);
    for (const k of ['mat', 'steps', 'notice', 'adapt']) if (Array.isArray(a[k]) && e[k]) assert.equal(e[k].length, a[k].length, `${a.id}.${k}`);
  }
  for (const b of F.BANDS) assert.ok(ES.bands[b.id] && ES.bands[b.id].n, `band ${b.id}`);
  for (const k of Object.keys(F.FRIENDS)) assert.ok(ES.friends[k], `friend ${k}`);
});

test('Story Time reads Spanish when the site is in Spanish, and the read-aloud word spans are Spanish words', () => {
  const s = site({ before: { 'family-library-data.js': c => {
    c.FFi18n = { lang: 'es', on() {} };
    for (const f of ['family-library-es.js', 'family-library-es-books.js']) vm.runInContext(read(f), c, { filename: f });
  } } });
  const { ES } = lib();
  const shelf = text(s.render('story-time'));
  const rp = 'the-rainbow-picnic', L = vm.runInContext('window.FFFamilyLocalized', s);
  assert.ok(ES.books[rp].title && shelf.includes(ES.books[rp].title), 'the Rainbow Picnic shows its Spanish title');
  const cover = text(s.render('story-time', rp));
  assert.ok(cover.includes(ES.books[rp].refrain), 'the cover shows the Spanish say-along line');
  const rb = L.BOOKS.find(x => x.id === rp);
  assert.equal(rb.spreads[0].p, ES.books[rp].spreads[0].p, 'the reader data is the Spanish page text');
  const spans = L.words(rb.spreads[0].p, rb.refrain);
  assert.ok(spans.includes(`data-wi="0" data-at="0">${rb.spreads[0].p.split(/\s+/)[0]}</span>`), 'word spans are built from the Spanish words');
  // The revised four stay in their revised English (the Spanish drafts translate the previous text) and say so.
  const bk = L.BOOKS[0], en0 = vm.runInContext('window.FFFamily.BOOKS[0]', s);
  assert.equal(bk.id, 'booker-tries-again'); assert.equal(bk.spreads[0].p, en0.spreads[0].p, 'revised English text, not the old Spanish draft');
  assert.match(text(s.render('story-time', 'booker-tries-again')), /su versión en español está en preparación/);
  // English stays English with no switch.
  const en = site();
  assert.match(text(en.render('story-time')), /Booker Tries Again/);
});

test('the reader picks a Spanish device voice for Spanish books (es-US / es-MX first) and never an English one', () => {
  const src = read('family-library.js');
  assert.match(src, /es \? \/\^es\(-\|_\|\$\)\/i : \/\^en\(-\|_\|\$\)\/i/);
  assert.match(src, /localService/, 'device voices only: the story text never leaves the device');
});

test('Spanish caption tracks: one per English track, same cues and timings; offered as a second track', () => {
  const sb = { console }; sb.window = sb; const c = vm.createContext(sb);
  vm.runInContext(read('captions.js'), c); vm.runInContext(read('captions-es.js'), c);
  const caps = c.FFCaptions.CAPS, es = c.FFCaptionsES;
  const cues = f => read(f).split(/\r?\n/).filter(l => /-->/.test(l));
  let n = 0;
  for (const [src, e] of Object.entries(caps)) {
    if (!e.vtt) continue; n++;
    const x = es[src]; assert.ok(x && x.vtt, `no Spanish track for ${src}`);
    assert.ok(fs.existsSync(path.join(ROOT, x.vtt)), `${x.vtt} exists`);
    assert.match(read(x.vtt), /^WEBVTT/);
    assert.deepEqual(cues(x.vtt), cues(e.vtt), `${x.vtt}: same cue timings as ${e.vtt}`);
    assert.ok(x.transcript && x.transcript.trim(), `${src}: Spanish transcript`);
  }
  assert.ok(n >= 25, `${n} voiced videos`);
  const t = c.FFCaptions.tracks('video/act-zuri-color-walk.mp4');
  assert.match(t, /srclang="en" label="English" src="video\/act-zuri-color-walk.en.vtt" default>/);
  assert.match(t, /<track kind="subtitles" srclang="es" label="Español \(borrador\)" src="video\/act-zuri-color-walk.es.vtt">/);
  c.FFi18n = { lang: 'es' };
  assert.match(c.FFCaptions.tracks('video/act-zuri-color-walk.mp4'), /srclang="es"[^>]*default>/, 'Spanish is the default track when the site is in Spanish');
  assert.match(c.FFCaptions.transcript('video/act-zuri-color-walk.mp4', 'Color Walk'), /lang="es"/);
});

test('index.html loads the switch before the page files and the Spanish data before the library', () => {
  const html = read('index.html'), at = f => html.indexOf(`src="${f}?`);
  for (const f of ['i18n.js', ...TABLES, 'captions-es.js', 'family-library-es.js', 'family-library-es-books.js']) assert.ok(at(f) > -1, `${f} is loaded`);
  assert.ok(at('i18n.js') < at('data.js') && at('i18n.js') < at('views.js'));
  assert.ok(at('family-library-es-books.js') < at('family-library.js'));
  assert.ok(at('captions-es.js') > at('captions.js'));
  assert.match(html, /href="i18n.css\?v=\d+"/);
});

test('every Spanish file says it is a draft pending review', () => {
  for (const f of ['i18n.js', ...TABLES, 'captions-es.js', 'family-library-es.js', 'family-library-es-books.js']) assert.match(read(f), /draft|DRAFT|borrador/i, f);
});
