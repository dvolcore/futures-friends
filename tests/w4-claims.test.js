'use strict';
// Wave 4, lane CLAIMS: claims that must not come back anywhere in the site (G11, C05, I05, G12) and the rebuilt brand art
// (G13-G17, plus the dining-room and zone-map pictures and the two placeholder clips made from the old art: I05, D07, D08).
// Unlike site-hygiene.test.js (a fixed list of copy files), the bans here scan EVERY site file.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const SKIP = new Set(['.git', 'node_modules', 'tests', 'vendor', 'fonts', 'printables', 'img', 'video']);
function siteFiles(dir = ROOT, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) siteFiles(p, out);
    else if (/\.(js|mjs|html|css|json|md|py)$/.test(e.name) && !/\.local\./.test(e.name)) out.push(p);
  }
  return out;
}
const FILES = siteFiles();
const ALL = FILES.map(f => [path.relative(ROOT, f), fs.readFileSync(f, 'utf8')]);
const hits = re => ALL.flatMap(([f, s]) => [...s.matchAll(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'))].map(m => `${f}: ${s.slice(Math.max(0, m.index - 60), m.index + m[0].length + 40).replace(/\s+/g, ' ')}`));

test('the scan covers the whole site, not a fixed list', () => {
  const names = ALL.map(a => a[0]);
  for (const f of ['index.html', 'views.js', 'features.js', 'academy-lms.js', 'release-manifest.js', 'family-library-data.js', 'tools/brand-art/compose.html'])
    assert.ok(names.includes(f), f);
  assert.ok(ALL.length > 90, `${ALL.length} files`);
});

test('G12: "The Happy Doer" is gone from every site file; the friends carry the current roles and pillars', () => {
  assert.deepEqual(hits(/happy[\s-]*doer/i), []);
  const v = read('views.js');
  for (const [k, role, p] of [['booker', 'The Brave Little Learner', 'LEARN'], ['lumi', 'The Kindness Keeper', 'BELONG'], ['zuri', 'The Curious Explorer', 'EXPLORE'], ['bop', 'The Mighty Mover', 'MOVE']])
    assert.match(v, new RegExp(`${k}:\\{n:'[A-Za-z]+',a:'[a-z ]+',role:'${role}',p:'${p}'`));
  assert.match(read('brand-art.js'), /booker: \['LEARN', 'SMILE'\], lumi: \['BELONG', 'RESET'\], zuri: \['EXPLORE', 'NOURISH'\], bop: \['MOVE', 'OUTSIDE'\]/);
  const compose = read('tools/brand-art/compose.html');
  assert.match(compose, /bop:'The Mighty Mover'/);
  assert.match(compose, /booker:'LEARN \+ SMILE',lumi:'BELONG \+ RESET',zuri:'EXPLORE \+ NOURISH',bop:'MOVE \+ OUTSIDE'/);
});

test('G11: unverified numbers and promises stay out of every site file', () => {
  for (const re of [/29,400/, /29\.4\s?k/i, /Season 1 has 24 episodes/i, /\b24 episodes\b/i, /Episodes? 13\s?(to|-|–)\s?24/i, /figures we have on file/i,
    /credential made for/i, /the full Futures Friends curriculum/i, /Paid Level 1 Foundations training in your first 30 days/i,
    /paused new Imagination Library sign-ups/i, /Depends on your county/])
    assert.deepEqual(hits(re), [], String(re));
});

test('G11: the numbers that stay are tied to their primary source or qualified', () => {
  const v = read('views.js');
  // USDA FNS, CACFP national average payment rates, July 1, 2026 to June 30, 2027 (FR Doc. 2026-15071, published 2026-07-27), centers, contiguous states
  assert.match(v, /For July 1, 2026 to June 30, 2027, USDA set the rates for centers in the contiguous US at \$2\.54 for a free breakfast, \$4\.76 for a free lunch or supper and \$1\.30 for a free snack[^']*FR Doc\. 2026-15071, published July 27, 2026/);
  // Garcia, Heckman, Leaf and Prados (2016): two North Carolina birth-to-five programs for disadvantaged children (ABC/CARE)
  assert.match(v, /two high-quality birth-to-five programs for disadvantaged children estimated a 13% annual return/);
  assert.match(v, /Imagination Library<\/b><\/td><td>Free monthly books under age 5<\/td><td><span class="chip warn">Only where a local program is taking sign-ups/);
  const f = read('features.js');
  assert.match(f, /Unit 1 is written; later units are added as they are written\)\. The family welcome kit and the Family App are planned/);
  assert.match(f, /<li>Planned: a Futures Friends welcome kit to take home<\/li><li>Planned: the Family App/);
  assert.match(f, /No episode is made yet\. Once episodes exist and the Futures Hub is live, every logged episode will appear/);
  assert.match(f, /'A planned path to Level 2, Level 3 and Director levels \(Futures Friends levels, not state credentials\)'/);
});

test('C05: no approved-hours, CDA-aligned, IACET or retroactive-hours claim anywhere; every "approved hours" phrase is a denial', () => {
  for (const re of [/Missouri-approved/i, /CDA[- ]aligned/i, /\bIACET\b/, /retroactiv/i, /Clock hours are designed to count/i])
    assert.deepEqual(hits(re), [], String(re));
  const approved = ALL.flatMap(([f, s]) => [...s.matchAll(/approved (clock|training) hours/gi)].map(m => [f, s.slice(Math.max(0, m.index - 90), m.index)]));
  assert.ok(approved.length >= 4, 'the denials are still on the Academy pages');
  for (const [f, before] of approved) assert.match(before, /\b(not|no|never)\b[^.]*$/i, `${f}: "${before}" must deny, not claim`);
  assert.match(read('academy-lms.js'), /Anyone can check that a Futures Friends completion certificate is real\. It is a Futures Friends record, not state-approved training credit\./);
  assert.doesNotMatch(read('academy-lms.js'), /Licensing reviewers, employers and directors can check/);
});

test('I05 (guardrail 10): no medical, health or developmental-outcome claims in any site file', () => {
  for (const re of [/prevents? (childhood )?obesity/i, /reduces? (the risk of )?obesity/i, /improves? (health|immunity|brain)/i, /boosts? (brain|immunity|readiness|development|health)/i,
    /clinically|proven to|scientifically proven/i, /healthy hearts|strong eyes|strong bodies|brain power|healthy bones|strong bones|bright minds|stronger tomorrows|heart helpers|super sight|sunny energy/i,
    /Healthy meals kids actually eat|Healthy bodies|Healthy kids/i])
    assert.deepEqual(hits(re), [], String(re));
});

// ---------------------------------------------------------------- art (G13-G17, I05, D07, D08)
function imageSize(file) {
  const b = fs.readFileSync(path.join(ROOT, file));
  if (b.slice(1, 4).toString() === 'PNG') return [b.readUInt32BE(16), b.readUInt32BE(20)];
  for (let i = 2; i < b.length;) {                              // JPEG: walk the segments to the frame header
    const marker = b[i + 1], len = b.readUInt16BE(i + 2);
    if (marker >= 0xC0 && marker <= 0xCF && ![0xC4, 0xC8, 0xCC].includes(marker)) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
    i += 2 + len;
  }
  throw new Error('no size: ' + file);
}
function mp4Seconds(file) {
  const b = fs.readFileSync(path.join(ROOT, file)), i = b.indexOf('mvhd');
  const v = b[i + 4], ts = v ? b.readUInt32BE(i + 24) : b.readUInt32BE(i + 16), d = v ? Number(b.readBigUInt64BE(i + 28)) : b.readUInt32BE(i + 20);
  return d / ts;
}
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, f))).digest('hex');
// sha256 of the old-brand files on release-platform 9ac308b ("BOP The Happy Doer", READ/PLAY stack, health labels on the walls).
const OLD_HASHES = [
  ['img/hero.jpg', '8ccc2d7f9b2f06ad8664b5f614f0f365aca145ed1cb65a78138331f35b0e37f0'],
  ['img/group.jpg', 'e78e59591dfcb2c6d13076a6e30e3286e6e091794afc2e54d9f0072424fe3447'],
  ['img/carpet.jpg', '6ff7b63c9f682c19b1e8881cc386fc6069b55ecf14bc866a633ce7d39960e23c'],
  ['img/kitchen.jpg', '413b2a61666e16e3b0f6427a26116d691e3866387c916ed59ffcc52c2349d38c'],
  ['img/zones.jpg', '30fa456828e6673af321689a9c2c578be10b110dc359a79dedb569b05806dda9'],
  ['video/episode-sample.mp4', '5c5fcd8e34989f919f855ea4bb0b7d87ad8147596ff3ce5b178637d7e870286f'],
  ['video/academy-welcome.mp4', '44dde03250f3917dc6a7d495bfe7e7656e6285bcd908ae900c8ba9e6e88e8ba8']];

test('G13-G15 and I05: the rebuilt pictures keep their file names and exact sizes, and are no longer the old-brand files', () => {
  const sizes = { 'img/hero.jpg': [1600, 900], 'img/group.jpg': [1000, 417], 'img/carpet.jpg': [1200, 728], 'img/kitchen.jpg': [1200, 675], 'img/zones.jpg': [1200, 800] };
  for (const [f, wh] of Object.entries(sizes)) {
    assert.deepEqual(imageSize(f), wh, f);
  }
  assert.equal(OLD_HASHES.length, 7);
  // Gap fill 2026-10-07: a retired file (episode-sample.mp4) is gone from the repo, which also means it is not the old-brand file.
  for (const [f, h] of OLD_HASHES) if (fs.existsSync(path.join(ROOT, f))) assert.notEqual(sha(f), h, f + ' is still the old-brand file');
});

test('G13: the share image is its own 1200x630 file, not the 1600x900 hero', () => {
  const html = read('index.html');
  const og = html.match(/<meta property="og:image" content="https:\/\/dvolcore\.github\.io\/futures-friends\/([^"]+)">/)[1];
  assert.equal(og, 'img/og/ff-share-default.png');
  assert.deepEqual(imageSize(og), [1200, 630]);
  assert.match(html, /<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">/);
  assert.match(html, new RegExp(`<meta name="twitter:image" content="https://dvolcore\\.github\\.io/futures-friends/${og.replace(/\./g, '\\.')}">`));
  assert.doesNotMatch(html, /og:image" content="[^"]*hero\.jpg/);
});

test('G16-G17: the two covers show titles that are in the series, are labelled layout previews, and the retired titles are gone', () => {
  const books = JSON.parse(read('data.js').match(/"books":(\[.*?\]),"episodes"/)[1]).map(b => b.title);
  const v = read('views.js');
  for (const [file, title, book] of [['big-feelings-brighter-days-cover', 'Big Feelings, Brighter Days', 'Book 2'], ['clean-up-team-cover', 'Clean Up, Team!', 'Book 4']]) {
    assert.ok(books.includes(title), title + ' is in the storybook series');
    assert.deepEqual(imageSize(`img/${file}.png`), [1254, 1254]);
    for (const w of [400, 800]) assert.ok(fs.statSync(path.join(ROOT, `img/${file}-${w}.webp`)).size < 140 * 1024);
    assert.match(v, new RegExp(`\\$\\{layout\\(\\)\\}\\$\\{pic\\('img/${file}\\.png',1254,1254,'Cover layout preview: ${title.replace(/[!,]/g, m => '\\' + m)}, ${book}`));
  }
  assert.deepEqual(hits(/Lumi Chooses Kindness|Bop Shows Empathy|chooses-kindness-cover|shows-empathy-cover/i), []);
  for (const f of ['lumi-chooses-kindness-cover.png', 'bop-shows-empathy-cover.png']) assert.ok(!fs.existsSync(path.join(ROOT, 'img', f)), f + ' removed (no orphans)');
});

test('room slots are labelled placeholders on the page and in the picture, never "concept renderings" of our center', () => {
  assert.deepEqual(hits(/Concept (rendering|illustration)/i), []);
  const A = {}; require('node:vm').runInNewContext(read('brand-art.js'), { window: A });
  assert.match(A.FFArt.flag('illustration'), /<b>Illustration<\/b><span>Not a photo of our center<\/span>/);
  const compose = read('tools/brand-art/compose.html');
  assert.match(compose, /placeholder\('A real classroom photo goes here'/);
  assert.match(compose, /placeholder\('The dining-room photo goes here'/);
  assert.match(compose, /Placeholder zone map: real photos of each learning zone come from our pilot classroom\./);
  assert.match(compose, /<span class="tag">Photo placeholder<\/span>/);
  assert.match(compose, /Cover layout preview (·|\\u00b7) final illustration to come/);
  // wave 10 (owner 2026-10-07): the Curriculum hero is a real photo of the pilot classroom, credited, no longer the carpet placeholder
  assert.match(read('experience.js'), /window\.FFArt\.photoImg\('turtle-rug', \{cls: 'ex-heroimage', eager: true/);
  assert.match(read('experience.js'), /Photo: \$\{window\.FFArt\.CENTER_CREDIT\}/);
});

test('the art is laid out from approved assets only, characters are never stretched, and nothing is fetched or generated', () => {
  const compose = read('tools/brand-art/compose.html'), build = read('tools/build-brand-art.mjs');
  for (const s of compose.match(/\.\.\/\.\.\/img\/[A-Za-z0-9_./${}-]+/g)) assert.match(s, /^\.\.\/\.\.\/img\/(cut_\$\{k\}\.webp|brand\/ff-(sticker|sticker-sm|white|plush-wordmark-640)\.png|rainbow\/\$\{n\}\.svg|group\.jpg)$/, s);
  assert.match(compose, /img\.cut\{display:block;height:var\(--ch\);width:auto;object-fit:contain/);
  assert.doesNotMatch(compose + build, /https?:\/\/(?!127\.0\.0\.1)|fetch\(|higgsfield|openai|replicate/i);
  for (const f of ['booker', 'lumi', 'zuri', 'bop']) assert.ok(fs.existsSync(path.join(ROOT, `img/cut_${f}.webp`)));
});

test('D07-D08: the placeholder clips were rebuilt from the new art (D07 academy-welcome is replaced by the W10 sample lesson)', () => {
  // W10 (2026-10-07): the 33 s silent four-card placeholder is replaced by the finished ~98.6 s sample lesson; its chapters moved with it.
  assert.ok(Math.abs(mp4Seconds('video/academy-welcome.mp4') - 98.6) < 0.3);
  assert.match(read('tools/build-brand-art.mjs'), /want\('academy'\) && process\.env\.REBUILD_OLD_ACADEMY_PLACEHOLDER/, 'the old placeholder build can no longer overwrite the real video by accident');
  // Gap fill 2026-10-07: the D08 placeholder is retired; the Watch player plays the finished, captioned welcome video instead.
  assert.ok(!fs.existsSync(path.join(ROOT, 'video/episode-sample.mp4')), 'episode-sample.mp4 is retired');
  assert.match(read('tools/build-brand-art.mjs'), /want\('episode'\) && process\.env\.REBUILD_RETIRED_EPISODE_PLACEHOLDER/);
  const compose = read('tools/brand-art/compose.html');
  assert.match(compose, /'ac4'[^\n]*Planned levels only: no course is state-approved yet, and no credential is issued\./);
  assert.doesNotMatch(compose, /real certificates/i);
  assert.match(read('features.js'), /\[0, 'Welcome'[^\n]*\[14\.6, 'The four friends'[^\n]*\[49\.5, 'The daily learning loop'[^\n]*\[72\.1, 'Your proposed learning pathway'/);
  // Gap fill 2026-10-07: the family Watch shelf no longer lists the placeholder; its first video is the finished welcome video.
  assert.doesNotMatch(read('family-library-data.js'), /episode-sample|placeholder clip/);
  assert.match(read('family-library-data.js'), /src: 'video\/ff-intro-titled-16x9\.mp4'/);
});
