#!/usr/bin/env node
/* Futures Friends Store: image importer.
   Takes a folder of product pictures named <product-id>-<n>.png|jpg|jpeg|webp (n = 1, 2, 3 ...; 1 is the card picture, 2 shows on hover),
   writes img/store/<product-id>-<n>-{400,800,1200}.webp and one -800.jpg fallback (never enlarging a small original), strips metadata, and writes
   img/store/manifest.json, which store-catalog.js reads. Re-running is safe: unchanged files are skipped; files that vanished are removed.
   Product ids are the ids in store-catalog.js (see STORE_SETUP.md); collection hero pictures use collection-<collection-id>-<n>.
   Usage:  node tools/import-store-images.mjs [folder] [--dry-run] [--alts alts.json]
   Default folder: ~/Downloads/FUTURES_FRIENDS_PROJECT/05_Brand_and_Art/store_photos/ (created, with a README.md, if it is missing).
   Needs ImageMagick (`magick`). Optional <folder>/alts.json: { "<product-id>": ["alt text for picture 1", "alt for 2"] }. */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(SITE, 'img', 'store');
const args = process.argv.slice(2).filter(a => !a.startsWith('--') || a === '--dry-run');
const DRY = process.argv.includes('--dry-run');
const folder = args.find(a => a !== '--dry-run') || join(homedir(), 'Downloads/FUTURES_FRIENDS_PROJECT/05_Brand_and_Art/store_photos');
const WIDTHS = [400, 800, 1200, 1600];
const NAME = /^([a-z0-9][a-z0-9-]*)-(\d{1,2})\.(png|jpe?g|webp)$/i;

const README = `# Store product pictures

Drop product pictures in this folder, then run \`node tools/import-store-images.mjs\` from the website repo.

## Naming

    <product-id>-<n>.png   (or .jpg, .jpeg, .webp)

- \`<product-id>\` is the product's id in store-catalog.js. Examples: \`kit-center-starter\`, \`zone-boundaries\`, \`rug-booker-reading-area\`, \`plush-lumi\`, \`booker-tshirt\`, \`poster-zuri-discovery-zone-v2\`.
- \`<n>\` is the picture number: 1 is the card picture, 2 appears when someone hovers the card, 3 and up are more gallery views.
- Collection hero pictures: \`collection-<collection-id>-1.png\` (collection ids: kits, carpets, addons, materials, posters, plush, apparel, books, kids).
- Lower-case letters, digits and hyphens only. One product per id. Files that do not match are skipped and listed.

## Sizes

Any size is fine. The importer makes WebP at 400, 800, 1200 and 1600 px wide plus one JPG fallback and never enlarges a small original. Aim for at least 1600 px on the long side, a clean background and the same lighting across a product family.

## Labels

Pictures made by AI, mock-ups and concept renders are labelled "Concept sample" on the site automatically for products marked as samples. Real photographs of finished products are not. Ask the web team before adding real photographs of a product that is still marked as a sample.

## Optional alt text

Add \`alts.json\` here: \`{ "plush-lumi": ["Lumi plush, front", "Lumi plush, side view"] }\`.
`;

function magick(a) { return execFileSync('magick', a, { stdio: ['ignore', 'pipe', 'pipe'] }).toString(); }
const sha = f => createHash('sha256').update(readFileSync(f)).digest('hex').slice(0, 16);

if (!existsSync(folder)) { if (!DRY) mkdirSync(folder, { recursive: true }); console.log('created', folder); }
if (!DRY && !existsSync(join(folder, 'README.md'))) writeFileSync(join(folder, 'README.md'), README);

const files = readdirSync(folder).filter(f => !f.startsWith('.') && !/^(README\.md|alts\.json|captions\.json)$/i.test(f)).sort();
const skipped = [], found = [];
for (const f of files) { const m = NAME.exec(f); if (m) found.push({ f, id: m[1].toLowerCase(), n: +m[2] }); else skipped.push(f); }

mkdirSync(OUT, { recursive: true });
const manPath = join(OUT, 'manifest.json');
const old = existsSync(manPath) ? JSON.parse(readFileSync(manPath, 'utf8')) : { products: {} };
const alts = existsSync(join(folder, 'alts.json')) ? JSON.parse(readFileSync(join(folder, 'alts.json'), 'utf8')) : {};
const products = {}, keep = new Set();
let made = 0, same = 0;

for (const { f, id, n } of found) {
  const src = join(folder, f), hash = sha(src), prev = ((old.products[id] || {}).images || []).find(i => i.n === n);
  let dims = prev && prev.src === hash ? { w: prev.w, h: prev.h } : null;
  const ow = (() => { try { return +magick(['identify', '-format', '%w', src + '[0]']); } catch { return 0; } })();
  const oh = (() => { try { return +magick(['identify', '-format', '%h', src + '[0]']); } catch { return 0; } })();
  if (!ow || !oh) { skipped.push(f + ' (unreadable)'); continue; }
  const sizes = WIDTHS.filter(w => w <= ow);
  if (!sizes.length || ow > Math.max(...sizes) * 1.15) sizes.push(ow);   // keep the original's own width when it falls between the standard sizes
  const base = `${id}-${n}`;
  const need = prev && prev.src === hash && sizes.every(w => existsSync(join(OUT, `${base}-${w}.webp`)));
  if (need) same++;
  else if (!DRY) {
    for (const w of sizes) {
      magick([src + '[0]', '-auto-orient', '-strip', '-colorspace', 'sRGB', '-resize', `${w}x`, '-quality', '82', join(OUT, `${base}-${w}.webp`)]);
    }
    const mid0 = sizes.includes(800) ? 800 : (sizes.filter(w => w >= 600)[0] || sizes[sizes.length - 1]);   // one JPG per picture: the fallback for old browsers
    magick([src + '[0]', '-auto-orient', '-strip', '-colorspace', 'sRGB', '-resize', `${mid0}x`, '-background', 'white', '-flatten', '-quality', '84', '-interlace', 'Plane', join(OUT, `${base}-${mid0}.jpg`)]);
    made++;
  }
  const top = sizes[sizes.length - 1], mid = sizes.includes(800) ? 800 : (sizes.filter(w => w >= 600)[0] || top);
  sizes.forEach(w => keep.add(`${base}-${w}.webp`)); keep.add(`${base}-${mid}.jpg`);
  const entry = { n, src: hash, w: ow >= top ? top : ow, h: Math.round((oh / ow) * (ow >= top ? top : ow)), sizes,
    files: sizes.map(w => [`img/store/${base}-${w}.webp`, w]), w400: `img/store/${base}-${sizes[0]}.webp`, w800: `img/store/${base}-${mid}.webp`, w1200: `img/store/${base}-${top}.webp`,
    jpg: `img/store/${base}-${mid}.jpg`, ratio: +(ow / oh).toFixed(4) };
  if (alts[id] && alts[id][n - 1]) entry.alt = alts[id][n - 1];
  (products[id] = products[id] || { images: [] }).images.push(entry);
}
for (const p of Object.values(products)) p.images.sort((a, b) => a.n - b.n);

// remove pictures that are no longer in the folder
const gone = existsSync(OUT) ? readdirSync(OUT).filter(f => /\.(webp|jpg)$/.test(f) && !keep.has(f)) : [];
if (!DRY) for (const f of gone) rmSync(join(OUT, f));
const manifest = { about: 'Written by tools/import-store-images.mjs. Do not edit by hand. Product ids match store-catalog.js; collection hero pictures use collection-<id>.', generated: new Date().toISOString().slice(0, 10), products };
if (!DRY) writeFileSync(manPath, JSON.stringify(manifest, null, 1) + '\n');
console.log(`${DRY ? '[dry run] ' : ''}${Object.keys(products).length} products, ${found.length} pictures (${made} converted, ${same} unchanged), ${gone.length} stale files removed`);
if (skipped.length) console.log('skipped (name must be <product-id>-<n>.png|jpg):\n  ' + skipped.join('\n  '));
