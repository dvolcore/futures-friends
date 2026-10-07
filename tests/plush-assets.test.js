'use strict';
// Wave 5 lane ASSETS (owner 2026-10-06): the plush-world asset library in img/plush is complete, honest and web-ready.
// Encodes: manifest <-> files on disk (paths, bytes, declared sizes read from the WebP/JPEG headers); every image decodes in real
// Chromium at its declared size; no "daycare" in any file name, slug, name or alt (the school is always Futures Learning Center);
// the retired cast (Ben, Nia, Kiki) is absent; lead pillars match canon; characters are transparent cut-outs with clear corners,
// feet on the bottom padding line and aspect kept between sizes; every texture tiles (L/R and T/B edge pixels match within the
// texture's own neighbour variation); light textures keep muted body text >= 4.5:1; total weight stays well under 40 MB.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const LIB = path.join(ROOT, 'img/plush');
const man = JSON.parse(fs.readFileSync(path.join(LIB, 'manifest.json'), 'utf8'));
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);

// Image dimensions straight from the file header (no decoder needed).
function dims(file) {
  const b = fs.readFileSync(file);
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const c = b.toString('ascii', 12, 16);
    if (c === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3), alpha: !!(b[20] & 0x10) };
    if (c === 'VP8L') { const v = b.readUInt32LE(21); return { w: 1 + (v & 0x3fff), h: 1 + ((v >> 14) & 0x3fff), alpha: !!((v >> 28) & 1) }; }
    if (c === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff, alpha: false };
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    for (let i = 2; i < b.length;) {
      const m = b[i + 1], len = b.readUInt16BE(i + 2);
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5), alpha: false };
      i += 2 + len;
    }
  }
  throw new Error(`unknown image format: ${file}`);
}

test('the manifest lists exactly the files in img/plush, with true byte counts and declared sizes', () => {
  const onDisk = walk(LIB).map(f => path.relative(ROOT, f)).filter(f => !f.endsWith('manifest.json')).sort();
  const listed = man.files.map(f => f.path).sort();
  assert.deepEqual(listed, onDisk);
  assert.equal(man.count, man.files.length);
  for (const f of man.files) {
    const abs = path.join(ROOT, f.path);
    assert.equal(fs.statSync(abs).size, f.bytes, f.path);
    const d = dims(abs);
    assert.deepEqual([d.w, d.h], [f.width, f.height], `${f.path} declared size`);
    assert.ok(f.source && f.canon_note && Array.isArray(f.caveats), `${f.path} provenance`);
    if (f.kind !== 'lineup') assert.match(f.source_md5, /^[0-9a-f]{32}$/, `${f.path} source md5`);
    assert.equal(typeof f.alt, 'string', `${f.path} alt`);
    if (f.kind !== 'texture') assert.ok(f.alt.length >= 40, `${f.path} needs descriptive alt`);
  }
  assert.equal(man.total_bytes, man.files.reduce((s, f) => s + f.bytes, 0));
});

test('the school is never called a daycare, and the retired cast is not in the library', () => {
  for (const f of man.files) {
    for (const k of ['path', 'slug', 'name', 'alt']) assert.doesNotMatch(String(f[k] ?? ''), /daycare/i, `${f.path} ${k}`);
    assert.doesNotMatch(`${f.slug} ${f.name ?? ''}`, /\b(ben|nia|kiki)\b/i, `${f.path}: retired cast`);
  }
  // Wave 5 SITE: the four signed buildings now come from the owner-authorised generated re-renders with a stitched
  // "Futures Learning Center" sign (plush-generated/signs, 2026-10-06); each records that fix and keeps its original reference.
  const SIGNED = ['school-exterior-wide', 'school-arrival-entrance', 'school-street', 'town-aerial'];
  const signs = man.files.filter(f => SIGNED.includes(f.slug));
  assert.equal(signs.length, 8, 'the four signed buildings, two sizes each');
  for (const f of signs) {
    assert.ok(f.caveats.some(c => /generated sign correction 2026-10-06/.test(c)), `${f.path} records its sign fix`);
    assert.match(f.source, /plush-generated\/signs\/Futures_(Learning_Center|Friends_Learning_Center|Friends_Town_Aerial)/, `${f.path} source`);
    assert.doesNotMatch(f.source, /daycare/i, `${f.path} source is a Learning Center render`);
    assert.ok(f.reference, `${f.path} keeps its original reference`);
  }
  const van = man.files.filter(f => f.slug === 'family-van-interior');
  assert.ok(van.length === 2 && van.every(f => /left-hand drive/.test(f.caveats[0]) && !/right-hand drive\);/.test(f.caveats.join(' '))), 'the van is the left-hand-drive version');
});

test('characters: 21 plush designs, canon lead pillars, roles and proposals labelled, two sizes each', () => {
  const ch = man.files.filter(f => f.kind === 'character');
  const slugs = [...new Set(ch.map(f => f.slug))];
  assert.equal(slugs.length, 21);
  const pill = Object.fromEntries(ch.map(f => [f.slug, f.pillars.join('+')]));
  assert.deepEqual([pill.booker, pill.lumi, pill.zuri, pill.bop], ['LEARN+SMILE', 'BELONG+RESET', 'EXPLORE+NOURISH', 'MOVE+OUTSIDE']);
  assert.match(ch.find(f => f.slug === 'ms-june').role, /encouraging teacher/i);
  assert.match(ch.find(f => f.slug === 'zuri').identifiers, /glasses/);
  assert.match(ch.find(f => f.slug === 'lumi').identifiers, /pink eyes/);
  for (const s of slugs) {
    const pair = ch.filter(f => f.slug === s).sort((a, b) => a.height - b.height);
    assert.deepEqual(pair.map(f => f.height), [480, 960], s);
    assert.ok(Math.abs(pair[1].width / pair[0].width - 2) < 0.02, `${s} aspect kept between sizes`);
    const lead = ['booker', 'lumi', 'zuri', 'bop', 'ms-june'].includes(s);
    assert.equal(pair[0].proposed, !lead, `${s} proposed flag`);
    assert.ok(pair[0].species && pair[0].role && pair[0].age_group, s);
    assert.ok(dims(path.join(ROOT, pair[0].path)).alpha, `${s} has an alpha channel`);
  }
  const kids = ch.filter(f => f.age_group === 'child' && f.height === 480).map(f => f.lineup_scale);
  assert.ok(kids.every(k => k >= 0.55 && k <= 0.65), 'children staged at 55-65% of an adult');
});

test('poses: twelve generated lead poses, two sizes each, tied to their lead and its canon, never a new character', () => {
  const poses = man.files.filter(f => f.kind === 'pose');
  const slugs = [...new Set(poses.map(f => f.slug))].sort();
  assert.deepEqual(slugs, ['booker-reading', 'booker-thinking', 'booker-waving', 'bop-dancing', 'bop-running', 'bop-waving', 'lumi-calm-breath', 'lumi-heart-hands', 'lumi-waving', 'zuri-apple', 'zuri-magnifier', 'zuri-pointing']);
  const lead = Object.fromEntries(man.files.filter(f => f.kind === 'character' && f.height === 480).map(f => [f.slug, f]));
  for (const s of slugs) {
    const pair = poses.filter(f => f.slug === s).sort((a, b) => a.height - b.height);
    assert.deepEqual(pair.map(f => f.height), [480, 960], s);
    assert.ok(Math.abs(pair[1].width / pair[0].width - 2) < 0.02, `${s} aspect kept between sizes`);
    const base = lead[pair[0].pose_of];
    assert.ok(base, `${s} belongs to a lead`);
    assert.deepEqual([pair[0].name, pair[0].pillars.join('+'), pair[0].identifiers], [base.name, base.pillars.join('+'), base.identifiers], `${s} keeps the lead canon`);
    assert.ok(pair[0].caveats.some(c => /generated pose 2026-10-06/.test(c)) && /plush-generated\/poses\//.test(pair[0].source), `${s} provenance`);
    assert.ok(dims(path.join(ROOT, pair[0].path)).alpha, `${s} has an alpha channel`);
  }
});

test('weight: the whole library stays well under 40 MB', () => {
  assert.ok(man.total_bytes < 25e6, `${(man.total_bytes / 1e6).toFixed(1)} MB`);
  for (const f of man.files) assert.ok(f.bytes < 800e3, `${f.path} is ${f.bytes} bytes`);
});

// ---------- real decode in headless Chromium ----------
const H = () => import('./a11y-harness.mjs');
let h, site, browser, page;
test.before(async () => {
  h = await H(); site = await h.startSite(); browser = await h.loadChromium().launch();
  page = await (await browser.newContext()).newPage(); await page.goto(site.base + 'img/plush/manifest.json');
});
test.after(async () => { await browser?.close(); await site?.close(); });

const probe = (urls) => page.evaluate(async (urls) => {
  const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const L = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const out = {};
  for (const u of urls) {
    const bmp = await createImageBitmap(await (await fetch('/' + u)).blob(), { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
    const c = new OffscreenCanvas(bmp.width, bmp.height), x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(bmp, 0, 0);
    const { data: d, width: w, height: hh } = x.getImageData(0, 0, bmp.width, bmp.height);
    const px = (i, j) => (j * w + i) * 4;
    let opaque = 0, clear = 0, lowest = -1;
    for (let j = 0; j < hh; j++) for (let i = 0; i < w; i++) { const a = d[px(i, j) + 3]; if (a > 200) { opaque++; lowest = j; } else if (a < 8) clear++; }
    const corners = [px(0, 0), px(w - 1, 0), px(0, hh - 1), px(w - 1, hh - 1)].map(k => d[k + 3]);
    // seam: mean |edge - opposite edge| vs mean |neighbour difference| inside the tile
    let lr = 0, tb = 0, inner = 0, n = 0;
    for (let j = 0; j < hh; j++) for (let ch = 0; ch < 3; ch++) lr += Math.abs(d[px(0, j) + ch] - d[px(w - 1, j) + ch]);
    for (let i = 0; i < w; i++) for (let ch = 0; ch < 3; ch++) tb += Math.abs(d[px(i, 0) + ch] - d[px(i, hh - 1) + ch]);
    for (let j = 0; j < hh; j += 3) for (let i = 1; i < w; i += 3) { for (let ch = 0; ch < 3; ch++) inner += Math.abs(d[px(i, j) + ch] - d[px(i - 1, j) + ch]); n++; }
    // contrast of muted text (#536761) against the darkest 1% of pixels
    const lums = []; for (let k = 0; k < d.length; k += 4 * 7) lums.push(L(d[k], d[k + 1], d[k + 2]));
    lums.sort((a, b) => a - b); const dark = lums[Math.floor(lums.length / 100)], muted = L(0x53, 0x67, 0x61);
    out[u] = { w, h: hh, opaque, clear, lowest, corners, lr: lr / (hh * 3), tb: tb / (w * 3), inner: inner / (n * 3), contrast: (dark + 0.05) / (muted + 0.05) };
  }
  return out;
}, urls);

test('every image decodes at its declared size in Chromium', async () => {
  const r = await probe(man.files.map(f => f.path));
  for (const f of man.files) assert.deepEqual([r[f.path].w, r[f.path].h], [f.width, f.height], f.path);
});

test('character and prop cut-outs are transparent, tightly cropped, feet on the bottom padding line', async () => {
  const cuts = man.files.filter(f => f.kind === 'character' || f.kind === 'pose' || f.kind === 'prop');
  const r = await probe(cuts.map(f => f.path));
  for (const f of cuts) {
    const p = r[f.path];
    assert.ok(p.corners.every(a => a === 0), `${f.path} corners must be fully transparent`);
    assert.ok(p.clear / (p.w * p.h) > 0.15 && p.opaque / (p.w * p.h) > 0.2, `${f.path} is a real cut-out`);
    if (f.kind === 'character' || f.kind === 'pose') {
      const gap = (p.h - 1 - p.lowest) / p.h;
      assert.ok(gap >= 0.005 && gap <= 0.03, `${f.path} feet sit on the baseline (bottom gap ${(gap * 100).toFixed(1)}%)`);
    }
  }
});

test('textures tile without seams, and light variants keep body text readable', async () => {
  const tx = man.files.filter(f => f.kind === 'texture');
  assert.ok(new Set(tx.map(f => f.slug.replace(/-light$/, ''))).size >= 5, 'a small set of signature textures');
  for (const f of tx) assert.ok(f.width === f.height && [512, 1024].includes(f.width), f.path);
  const r = await probe(tx.map(f => f.path));
  for (const f of tx) {
    const p = r[f.path], tol = 2 * p.inner + 2;
    assert.ok(p.lr <= tol && p.tb <= tol, `${f.path} seam L/R ${p.lr.toFixed(1)} T/B ${p.tb.toFixed(1)} vs inner ${p.inner.toFixed(1)}`);
    if (f.variant === 'light') assert.ok(p.contrast >= 4.5, `${f.path} muted text contrast ${p.contrast.toFixed(2)}`);
  }
});
