'use strict';
// Wave 10 (owner 2026-10-07, on a "Placeholder: a real classroom photo goes here" frame): "Pull one of the classroom photos and put
// it there. We already have that, so there's no reason that should have a placeholder."
// Every image under img/center/ must be a REAL photo of Futures Learning Center listed in img/center/manifest.json (source file,
// sha256, what/where, real_photo true, no people), served at 400/800/1200 px as WebP + JPEG, small, with alt text, dimensions and
// no EXIF/GPS metadata. Slots that promise people, food or a map stay labelled placeholders until those photos exist.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'img/center');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(DIR, 'manifest.json'), 'utf8'));
const WIDTHS = [400, 800, 1200], EXTS = ['webp', 'jpg'];
const art = () => { const w = {}; vm.runInNewContext(read('brand-art.js'), { window: w }); return w.FFArt; };

function jpegInfo(b) {
  assert.equal(b.readUInt16BE(0), 0xFFD8, 'JPEG SOI');
  let i = 2, size = null; const markers = [];
  while (i < b.length) {
    if (b[i] !== 0xFF) { i++; continue; }
    const m = b[i + 1];
    if (m === 0xD8 || m === 0x01 || (m >= 0xD0 && m <= 0xD7)) { i += 2; continue; }
    if (m === 0xDA || m === 0xD9) break;   // start of scan: no more metadata segments
    const len = b.readUInt16BE(i + 2);
    markers.push({ m, id: b.slice(i + 4, i + 4 + 14).toString('latin1') });
    if (m >= 0xC0 && m <= 0xCF && ![0xC4, 0xC8, 0xCC].includes(m)) size = [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
    i += 2 + len;
  }
  return { size, markers };
}
function webpInfo(b) {
  assert.equal(b.slice(0, 4).toString(), 'RIFF'); assert.equal(b.slice(8, 12).toString(), 'WEBP');
  const chunks = []; let size = null;
  for (let i = 12; i + 8 <= b.length;) {
    const id = b.slice(i, i + 4).toString('latin1'), len = b.readUInt32LE(i + 4), d = i + 8;
    chunks.push(id);
    if (id === 'VP8X') size = [1 + b.readUIntLE(d + 4, 3), 1 + b.readUIntLE(d + 7, 3)];
    if (id === 'VP8 ' && !size) size = [b.readUInt16LE(d + 6) & 0x3fff, b.readUInt16LE(d + 8) & 0x3fff];
    if (id === 'VP8L' && !size) { const v = b.readUInt32LE(d + 1); size = [(v & 0x3fff) + 1, ((v >> 14) & 0x3fff) + 1]; }
    i = d + len + (len & 1);
  }
  return { size, chunks };
}

test('the manifest lists only real photos of the pilot center, each with its source, sha256 and what/where', () => {
  assert.equal(manifest.credit, 'Futures Learning Center, Independence, Missouri');
  assert.ok(manifest.photos.length >= 1);
  const keys = new Set();
  for (const p of manifest.photos) {
    assert.match(p.key, /^[a-z0-9-]+$/); assert.ok(!keys.has(p.key), 'unique key ' + p.key); keys.add(p.key);
    assert.equal(p.real_photo, true, p.key + ' is a real photo');
    assert.equal(p.people, false, p.key + ' shows no people');
    assert.match(p.sha256, /^[0-9a-f]{64}$/, p.key + ' sha256');
    assert.match(p.source, /^[a-z0-9-]+\.jpg$/, p.key + ' source is a file from the original FLC site assets');
    assert.notEqual(p.source, 'logo.jpg');
    assert.doesNotMatch(p.source + p.what, /render|concept|plush|generated|real location|\bAI\b/i, p.key + ' is not a render');
    assert.ok(p.what.length > 20 && p.where.length > 3, p.key + ' says what and where');
    // when the original is on this machine, prove the hash
    const src = path.join(os.homedir(), 'Downloads/FUTURES_FRIENDS_PROJECT/06_Website/FuturesWebsite/public/assets', p.source);
    if (fs.existsSync(src)) assert.equal(crypto.createHash('sha256').update(fs.readFileSync(src)).digest('hex'), p.sha256, p.source + ' sha256');
  }
});

test('every file in img/center is a listed photo at 400/800/1200 px, WebP + JPEG, and every listed size exists', () => {
  const want = new Set(['manifest.json']);
  for (const p of manifest.photos) for (const w of WIDTHS) for (const e of EXTS) want.add(`${p.key}-${w}.${e}`);
  const have = fs.readdirSync(DIR).filter(f => !f.startsWith('.'));
  assert.deepEqual([...have].sort(), [...want].sort(), 'img/center holds exactly the listed photos');
});

test('each photo: true dimensions, small at 800 px, and no EXIF, GPS or XMP metadata', () => {
  for (const p of manifest.photos) {
    let ratio = null;
    for (const w of WIDTHS) {
      const jb = fs.readFileSync(path.join(DIR, `${p.key}-${w}.jpg`)), wb = fs.readFileSync(path.join(DIR, `${p.key}-${w}.webp`));
      const j = jpegInfo(jb), wp = webpInfo(wb);
      assert.equal(j.size[0], w, `${p.key}-${w}.jpg width`); assert.equal(wp.size[0], w, `${p.key}-${w}.webp width`);
      assert.equal(j.size[1], wp.size[1], `${p.key}-${w} jpg and webp heights match`);
      const r = j.size[1] / j.size[0]; if (ratio == null) ratio = r; assert.ok(Math.abs(r - ratio) < 0.01, p.key + ' same shape at every width');
      // metadata: no APP1 (EXIF or XMP), no APP13 (IPTC) in the JPEG; no EXIF or XMP chunk in the WebP
      assert.deepEqual(j.markers.filter(x => x.m === 0xE1 || x.m === 0xED).map(x => x.id), [], `${p.key}-${w}.jpg has no EXIF/XMP/IPTC`);
      assert.ok(!jb.includes(Buffer.from('GPS')) || !jb.includes(Buffer.from('Exif')), `${p.key}-${w}.jpg carries no GPS EXIF`);
      assert.deepEqual(wp.chunks.filter(c => c === 'EXIF' || c === 'XMP '), [], `${p.key}-${w}.webp has no EXIF/XMP`);
      if (w === 800) for (const [b, e] of [[jb, 'jpg'], [wb, 'webp']]) assert.ok(b.length <= 150 * 1024, `${p.key}-800.${e} is ${b.length} bytes (<= 150 KB)`);
    }
  }
});

test('FFArt.photo: the listed photo with alt text, width/height, srcset + sizes, lazy unless eager, and the credit line', () => {
  const A = art();
  assert.deepEqual(Object.keys(A.CENTER).sort(), manifest.photos.map(p => p.key).sort(), 'brand-art.js and the manifest list the same photos');
  assert.equal(A.CENTER_CREDIT, manifest.credit);
  for (const p of manifest.photos) {
    const c = A.CENTER[p.key], j = jpegInfo(fs.readFileSync(path.join(DIR, `${p.key}-800.jpg`)));
    assert.deepEqual([c.w, c.h], j.size, p.key + ' width/height = the 800 px file');
    assert.ok(c.alt.length >= 40, p.key + ' alt describes the room'); assert.doesNotMatch(c.alt, /placeholder|illustration|render/i);
    const fig = A.photo(p.key, { title: 'T', line: 'L' });
    assert.match(fig, new RegExp(`<source type="image/webp" srcset="img/center/${p.key}-400\\.webp 400w, img/center/${p.key}-800\\.webp 800w, img/center/${p.key}-1200\\.webp 1200w" sizes="[^"]+">`));
    assert.match(fig, new RegExp(`<img src="img/center/${p.key}-800\\.jpg" srcset="img/center/${p.key}-400\\.jpg 400w, [^"]+1200w" sizes="[^"]+" alt="[^"]{40,}" width="${c.w}" height="${c.h}" loading="lazy" decoding="async"`));
    assert.match(fig, /<span class="ffa-credit">Photo( of the building today)?: Futures Learning Center, Independence, Missouri<\/span>/);
    assert.doesNotMatch(fig, /data-placeholder|ffa-flag|Placeholder/);
    const hero = A.photoImg(p.key, { eager: true });
    assert.match(hero, /fetchpriority="high"/); assert.doesNotMatch(hero, /loading="lazy"/);
  }
  assert.equal(A.photo('no-such-photo'), '', 'unknown keys render nothing');
});

test('photos fill only what they honestly show; the people, food and map frames are no longer empty (gap fill 2026-10-07)', () => {
  const used = {};
  for (const f of ['views.js', 'features.js', 'experience.js', 'home-calm.js', 'whole-child.js', 'premium.js'])
    for (const m of read(f).matchAll(/FFArt\.photo(?:Img)?\('([a-z0-9-]+)'/g)) (used[m[1]] = used[m[1]] || []).push(f);
  for (const k of Object.keys(used)) assert.ok(manifest.photos.some(p => p.key === k), k + ' is in the manifest');
  assert.deepEqual(Object.keys(used).sort(), ['alphabet-rug', 'blue-table-room', 'dress-up-corner', 'exterior', 'reading-corner', 'turtle-rug']);
  // Gap fill (2026-10-07): the frames that promised people, food or a map no longer sit empty. The director/team frames became two more
  // room photos with "book a tour"; the map became a Maps link; the startup-package frame shows the pilot classroom; the food frames
  // are gone. The zone map and the dining-room illustration stay labelled illustrations (no photo of them exists).
  const v = read('views.js'), fe = read('features.js');
  assert.doesNotMatch(fe, /'The director at the front door'|'Our teaching team'/); assert.match(fe, /book a tour/);
  assert.doesNotMatch(v, /Map coming|'Spaghetti with meat sauce'|What arrives in a startup package/);
  assert.match(v, /Open 3625 S Blue Ridge Blvd in Google Maps/);
  assert.match(v, /class="ffhm-img" src="img\/zones\.jpg"/);
  assert.match(read('home-calm.js'), /'A teacher reading on the carpet'/, 'the labelled fallback stays for a page without the photo helper');
  assert.doesNotMatch(read('whole-child.js'), /'The Quiet Time corner', 'Set up/);
});
