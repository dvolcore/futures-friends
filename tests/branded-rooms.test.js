'use strict';
// Owner 2026-10-07: "The real pictures of the real daycare need to be jazzed up a little. They need our hypothetical carpets and our
// posters added so they're branded with our stuff." img/branded-rooms/ holds CONCEPT composites of the real center photos with the
// proposed Learning Zones kit. Brand rule: a concept is never presented as the real center, so every one is listed as a concept
// (real_photo false), stays out of img/center/, is labelled wherever it shows, and keeps the plain real photo one tap away.
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

test('the manifest lists concept composites of real center photos, never as real photos', () => {
  assert.equal(man.label, LABEL);
  assert.ok(man.rooms.length >= 5);
  for (const r of man.rooms) {
    assert.equal(r.real_photo, false, r.key); assert.equal(r.concept, true, r.key); assert.equal(r.people, false, r.key);
    const base = center.photos.find(p => p.key === r.key); assert.ok(base, r.key + ' is a real photo in img/center');
    assert.equal(r.base_sha256, base.sha256, r.key + ' base photo hash');
    assert.equal(r.real, `img/center/${r.key}-800.jpg`); assert.equal(r.kit, `img/branded-rooms/${r.key}-kit-800.jpg`);
    assert.match(r.alt, /^Concept image, not installed yet:/, r.key + ' alt says concept');
  }
  assert.ok(!center.photos.some(p => /kit|concept/i.test(p.key)), 'no concept in img/center');
});

test('every file is a listed composite at 400/800/1200 px, WebP + JPEG, the real photo shape, small, no EXIF', () => {
  const want = new Set(['manifest.json']);
  for (const r of man.rooms) for (const w of [400, 800, 1200]) for (const e of ['webp', 'jpg']) want.add(`${r.key}-kit-${w}.${e}`);
  assert.deepEqual(fs.readdirSync(DIR).filter(f => !f.startsWith('.')).sort(), [...want].sort());
  for (const r of man.rooms) {
    const real = jpegSize(fs.readFileSync(path.join(ROOT, 'img/center', `${r.key}-800.jpg`))).size;
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
  assert.match(ex, /window\.FFArt\.KIT_LABEL\}<\/b> \(Lumi's Calm Corner added to the real photo; not installed yet\)/);
  assert.match(ex, /kitToggle\('turtle-rug'\)/);
  assert.match(read('experience.css'), /\.ex-hero\[data-kit-view="kit"\] img\[data-real-photo\]\.ex-heroimage,\.ex-hero\[data-kit-view="real"\] img\[data-kit-photo\]\.ex-heroimage\{opacity:0\}/);
});
