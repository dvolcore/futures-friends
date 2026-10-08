#!/usr/bin/env node
/* Stage the owner's merchandise campaign pictures (Futures_Friends_Merchandise_Campaign_2026-10-07) as store pictures.
   Reads the package's store/all-products.json (the 58-product catalog), then writes <product-id>-<n>.png files into the store_photos folder
   (default ~/Downloads/FUTURES_FRIENDS_PROJECT/05_Brand_and_Art/store_photos/) for tools/import-store-images.mjs to convert.
   - plush: n=1 the single-shot doll (Single_Shot_Dolls/), n=2 the three-view turnaround board
   - coloring books, sticker sheets, insulated bottles, the divided plate and the replica backpacks: n=1 the product picture (universe packs add their four pages)
   - t-shirts, hoodies and the original backpacks are NOT staged: use the outline-split pictures already in img/store/ (importer --merge)
   - rugs, square corner rugs, posters: n=1 (poster V1 = poster-a, V2 = poster-b)
   - collection heroes: the owner's group shots (five carpets, five square carpets, four plush) and montages of posters and apparel
   Usage: node tools/stage-merch-images.mjs [packageDir] [outFolder]. Needs ImageMagick. */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const SITE = join(dirname(fileURLToPath(import.meta.url)), '..');

const PKG = process.argv[2] || join(homedir(), 'Downloads/Futures_Friends_Merchandise_Campaign_2026-10-07');
const OUT = process.argv[3] || join(homedir(), 'Downloads/FUTURES_FRIENDS_PROJECT/05_Brand_and_Art/store_photos');
mkdirSync(OUT, { recursive: true });
const m = a => execFileSync('magick', a, { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
const ok = f => { if (!existsSync(f)) throw new Error('missing ' + f); return f; };
const P = f => ok(join(PKG, f));
const cat = JSON.parse(readFileSync(P('store/all-products.json'), 'utf8'));
const key = id => ['booker', 'lumi', 'zuri', 'bop', 'friends-circle'].find(k => id.includes(k));
let n = 0;
const put = (id, i, args) => { m([...args, '-strip', join(OUT, `${id}-${i}.png`)]); n++; };
const UNI = ['lead-friends', 'classmates', 'school', 'families'];
for (const p of cat.products) {
  const k = key(p.id);
  if (p.type === 'rug') put(p.id, 1, [p.id.includes('-square-') ? P(`carpets/square/${k}-square-carpet.png`) : P(`carpets/${k}-carpet.png`)]);
  else if (p.type === 'plush') {
    // the owner's clean single-shot doll is the primary picture; the three-view turnaround board is the secondary "all angles" picture
    put(p.id, 1, [existsSync(join(PKG, `Single_Shot_Dolls/${k}-plush.png`)) ? P(`Single_Shot_Dolls/${k}-plush.png`) : P(`plush/${k}-plush.png`)]);
    put(p.id, 2, [P(`plush/${k}-turnaround.png`)]);
  } else if (p.type === 'poster') put(p.id, 1, [P(`posters/${k}-poster-${p.id.endsWith('-v1') ? 'a' : 'b'}.png`), '-resize', '1600x']);
  else if (['coloring-book', 'sticker-sheet', 'insulated-bottle', 'divided-plate'].includes(p.type) || p.id.endsWith('-replica-backpack')) {
    // package art_source is the primary picture; the universe packs carry their four pages as the gallery
    put(p.id, 1, [P(p.art_source)]);
    (p.additional_images || []).forEach((a, i) => put(p.id, i + 2, [P(a)]));
  }
  // T-shirts, hoodies and the five original backpacks are front|back composites. They are split by item outline (never at 50%) by the apparel script
  // /private/tmp/.../scratchpad/split-apparel.py, whose output is already in img/store/. The importer runs with --merge so those entries are kept as they are.
}
// the Zuri shell backpack the owner generated at 10:38 PM (ChatGPT image): a second angle of zuri-replica-backpack, kept as its own gallery picture
const SHELL = join(homedir(), 'Downloads', 'ChatGPT Image Oct 7, 2026, 10_38_40 PM.png');
if (existsSync(SHELL)) put('zuri-replica-backpack', 2, [SHELL]);
// bundles use the owner's group shots
put('bundle-complete-learning-zones', 1, [P('carpets/all-five-carpets.png')]);
put('bundle-four-zone-starter', 1, [P('carpets/all-five-carpets.png'), '-gravity', 'West', '-crop', '78%x100%+0+0', '+repage']);
put('bundle-character-merchandising-kit', 1, [P('plush/all-four-plush.png')]);
// collection heroes
put('collection-carpets', 1, [P('carpets/all-five-carpets.png')]);
put('collection-carpets', 2, [P('carpets/square/all-five-square-carpets.png')]);
put('collection-plush', 1, [P('plush/all-four-plush.png')]);
put('collection-posters', 1, ['(', ...['booker', 'lumi', 'friends-circle', 'zuri', 'bop'].map(k => P(`posters/${k}-poster-a.png`)), '-resize', 'x900', '+append', ')', '-resize', '2000x', '-gravity', 'center', '-background', '#F8F3EA', '-extent', '2000x1000']);
// the apparel hero is built from the outline-split front views already in img/store/ (never a 50% crop of the source)
put('collection-apparel', 1, ['(', ...['booker', 'lumi', 'all-friends', 'zuri', 'bop'].flatMap(k => [join(SITE, `img/store/${k}-tshirt-1-768.webp`), '-resize', 'x800']), '+append', ')', '-resize', '2000x', '-gravity', 'center', '-background', '#FBF6EE', '-extent', '2000x1000']);
put('collection-stickers', 1, ['(', ...['booker', 'lumi', 'zuri', 'bop', 'all-friends'].map(k => P(`coloring-stickers/images/${k}-stickers.png`)), '-resize', 'x900', '+append', ')', '-resize', '2000x', '-gravity', 'center', '-background', '#F8F3EA', '-extent', '2000x1000']);
put('collection-drinkware', 1, ['(', ...['booker', 'lumi', 'zuri', 'bop'].map(k => P(`coloring-stickers/images/${k}-insulated-bottle.png`)), P('coloring-stickers/images/eat-the-rainbow-plate.png'), '-resize', 'x900', '+append', ')', '-resize', '2000x', '-gravity', 'center', '-background', '#F8F3EA', '-extent', '2000x1000']);
console.log(`staged ${n} pictures in ${OUT}`);
