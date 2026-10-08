'use strict';
// Owner 2026-10-07: "The real pictures of the real daycare need to be jazzed up a little. They need our hypothetical carpets and our
// posters added so they're branded with our stuff." Then the owner rejected the Pillow composites and supplied his own AI-generated
// concept images ("add these to the new classroom pics, replace the other ones there, bad"). img/branded-rooms/ holds those CONCEPT
// illustrations of the proposed Learning Zones kit, one per real center room (matched by doors, pillars, windows, shelves).
// Brand rule: a concept is never presented as the real center, so every one is listed as a concept (real_photo false), stays out of
// img/center/, is labelled wherever it shows, and keeps the plain real photo one tap away.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'img/branded-rooms');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const man = JSON.parse(fs.readFileSync(path.join(DIR, 'manifest.json'), 'utf8'));
const center = JSON.parse(read('img/center/manifest.json'));
const art = () => { const w = {}; vm.runInNewContext(read('brand-art.js'), { window: w }); return w; };
const LABEL = 'Concept: the Futures Friends Learning Zones kit in our classroom';

function jpegSize(b) {
  let i = 2; const markers = []; let size = null;
  while (i < b.length) {
    if (b[i] !== 0xFF) { i++; continue; }
    const m = b[i + 1];
    if (m === 0xD8 || m === 0x01 || (m >= 0xD0 && m <= 0xD7)) { i += 2; continue; }
    if (m === 0xDA || m === 0xD9) break;
    const len = b.readUInt16BE(i + 2); markers.push(m);
    if (m >= 0xC0 && m <= 0xCF && ![0xC4, 0xC8, 0xCC].includes(m)) size = [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
    i += 2 + len;
  }
  return { size, markers };
}

test('the manifest lists the owner concept images, one per real center room, never as real photos', () => {
  assert.equal(man.label, LABEL);
  assert.ok(man.rooms.length >= 5);
  for (const r of man.rooms) {
    assert.equal(r.real_photo, false, r.key); assert.equal(r.concept, true, r.key); assert.equal(r.people, false, r.key);
    const base = center.photos.find(p => p.key === r.key); assert.ok(base, r.key + ' is a real photo in img/center');
    assert.equal(r.generated, 'ai', r.key + ' is marked AI-generated'); assert.equal(r.kind, 'concept image');
    assert.ok(r.source_sha256 && r.source_file, r.key + ' names its owner source image');
    assert.equal(r.real, `img/center/${r.key}-800.jpg`); assert.equal(r.kit, `img/branded-rooms/${r.key}-kit-800.jpg`);
    assert.match(r.alt, /^Concept image, not installed yet:/, r.key + ' alt says concept');
  }
  assert.ok(!center.photos.some(p => /kit|concept/i.test(p.key)), 'no concept in img/center');
  assert.deepEqual(man.rooms.map(r => r.key).sort(), ['alphabet-rug', 'blue-table-room', 'dress-up-corner', 'reading-corner', 'turtle-rug']);
  assert.match(man.about, /AI-generated/); assert.match(man.about, /not photos/i);
  for (const a of man.alternates) {
    assert.ok(man.rooms.some(r => r.key === a.room), a.key + ' belongs to a listed room');
    assert.equal(a.real_photo, false); assert.equal(a.concept, true); assert.equal(a.people, false); assert.equal(a.generated, 'ai');
    assert.match(a.alt, /^Concept image, not installed yet:/);
  }
  assert.ok(man.alternates.some(a => a.key === 'alphabet-rug-wall'), 'the full-poster-wall Friends Circle concept is kept');
});

test('every file is a listed concept at 400/800/1200 px, WebP + JPEG, the real photo shape, small, no EXIF', () => {
  const want = new Set(['manifest.json']);
  for (const r of [...man.rooms, ...man.alternates]) for (const w of [400, 800, 1200]) for (const e of ['webp', 'jpg']) want.add(`${r.key}-kit-${w}.${e}`);
  assert.deepEqual(fs.readdirSync(DIR).filter(f => !f.startsWith('.')).sort(), [...want].sort());
  for (const r of [...man.rooms, ...man.alternates.map(a => ({ ...a, key: a.key, room: a.room }))]) {
    const real = jpegSize(fs.readFileSync(path.join(ROOT, 'img/center', `${r.room || r.key}-800.jpg`))).size;
    const b = fs.readFileSync(path.join(DIR, `${r.key}-kit-800.jpg`)), j = jpegSize(b);
    assert.deepEqual(j.size, real, r.key + ' same size as the real 800 px photo (a toggle swaps them in place)');
    assert.deepEqual([r.w, r.h], j.size);
    assert.ok(!j.markers.includes(0xE1) && !j.markers.includes(0xED), r.key + ' no EXIF/XMP/IPTC');
    for (const e of ['jpg', 'webp']) assert.ok(fs.statSync(path.join(DIR, `${r.key}-kit-800.${e}`)).size <= 150 * 1024, `${r.key}-kit-800.${e} <= 150 KB`);
  }
});

test('FFArt.photo shows the concept first, labelled, with the real photo one tap away; FFBrandedRooms matches the manifest', () => {
  const w = art(), A = w.FFArt;
  assert.deepEqual(Object.keys(A.KIT).sort(), man.rooms.map(r => r.key).sort());
  assert.deepEqual(JSON.parse(JSON.stringify(w.FFBrandedRooms.map(r => [r.key, r.real, r.kit, r.alt, r.w, r.h]))), man.rooms.map(r => [r.key, r.real, r.kit, r.alt, r.w, r.h]));
  for (const r of man.rooms) {
    const fig = A.photo(r.key, { title: 'T' });
    assert.match(fig, /data-kit-view="kit"/);
    assert.match(fig, new RegExp(`<img src="img/branded-rooms/${r.key}-kit-800\\.jpg"[^>]+alt="Concept image, not installed yet:[^"]+"[^>]+data-kit-photo="${r.key}"`));
    assert.match(fig, new RegExp(`data-real-photo="${r.key}"`), 'the real photo is still in the figure');
    assert.match(fig, /data-kit-show="real"[^>]*>Real room<\/button><button type="button" data-kit-show="kit" aria-pressed="true">With the kit</);
    assert.ok(fig.includes(LABEL), r.key + ' carries the concept label');
    assert.match(fig, /class="ffa-kit-label"[^>]*>Concept</);
    assert.doesNotMatch(A.photo(r.key, { kit: false }), /branded-rooms|Concept/, 'kit:false gives the plain real photo');
  }
  assert.doesNotMatch(A.photo('exterior'), /branded-rooms|data-kit-view/, 'the exterior has no concept');
  const css = read('brand-art.css');
  assert.match(css, /\.ffa-kit\[data-kit-view="kit"\] \.ffa-kit-real,\.ffa-kit\[data-kit-view="real"\] \.ffa-kit-concept\{opacity:0/);
});

test('the curriculum hero shows the concept with its label, the credit and a Real room toggle', () => {
  const ex = read('experience.js');
  assert.match(ex, /kitImg\('turtle-rug', \{cls: 'ex-heroimage ex-herokit'/);
  assert.match(ex, /window\.FFArt\.KIT_LABEL\}<\/b> \(an AI-generated illustration of all five zones in our main classroom; not installed yet\)/);
  assert.match(ex, /kitToggle\('turtle-rug'\)/);
  assert.match(read('experience.css'), /\.ex-hero\[data-kit-view="kit"\] img\[data-real-photo\]\.ex-heroimage,\.ex-hero\[data-kit-view="real"\] img\[data-kit-photo\]\.ex-heroimage\{opacity:0\}/);
});

test('a portrait concept is never cropped; the second concept for the carpet room shows on #room-kit', () => {
  const w = art(), A = w.FFArt;
  assert.doesNotMatch(A.photo('blue-table-room', { ratio: 'land' }), /ffa-photo-land/, 'the portrait Zuri concept keeps its own 4:5 shape');
  assert.match(A.photo('alphabet-rug', { ratio: 'land' }), /ffa-photo-land/);
  assert.match(read('brand-art.css'), /\.ffa-kit\.ffa-photo-land img\{aspect-ratio:4\/3\}/, 'landscape frames hold the 4:3 concepts whole');
  assert.match(read('room-kit.css'), /\.rk-roomframe\{[^}]*aspect-ratio:4\/3/);
  assert.match(read('room-kit.css'), /blue-table-room"\] \.rk-roomframe\{aspect-ratio:4\/5\}/);
  assert.deepEqual(JSON.parse(JSON.stringify(w.FFBrandedAlternates.map(a => [a.key, a.room, a.kit, a.alt, a.w, a.h]))), man.alternates.map(a => [a.key, a.room, a.kit, a.alt, a.w, a.h]));
  assert.match(read('room-kit.js'), /FFBrandedAlternates/);
  assert.match(read('room-kit.css'), /\.rk-roomframe img\[hidden\]\{display:none\}/, 'the hidden half of the toggle really is hidden (img display beat the hidden attribute)');
  assert.match(read('room-kit.css'), /\.rk-roomframe img\[hidden\]\{display:none\}/, 'the hidden half of the toggle really is hidden (img display beat the hidden attribute)');
});
