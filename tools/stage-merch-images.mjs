#!/usr/bin/env node
/* Stage the owner's merchandise campaign pictures (Futures_Friends_Merchandise_Campaign_2026-10-07) as store pictures.
   Reads the package's store/products.json and apparel/products.json, then writes <product-id>-<n>.png files into the store_photos folder
   (default ~/Downloads/FUTURES_FRIENDS_PROJECT/05_Brand_and_Art/store_photos/) for tools/import-store-images.mjs to convert.
   - plush: n=1 the single-shot doll (Single_Shot_Dolls/), n=2 the three-view turnaround board
   - apparel and backpacks: n=1 the front view, n=2 the back view, n=3 the whole front|back composite
   - rugs, square corner rugs, posters: n=1 (poster V1 = poster-a, V2 = poster-b)
   - collection heroes: the owner's group shots (five carpets, five square carpets, four plush) and montages of posters and apparel
   Usage: node tools/stage-merch-images.mjs [packageDir] [outFolder]. Needs ImageMagick. */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const PKG = process.argv[2] || join(homedir(), 'Downloads/Futures_Friends_Merchandise_Campaign_2026-10-07');
const OUT = process.argv[3] || join(homedir(), 'Downloads/FUTURES_FRIENDS_PROJECT/05_Brand_and_Art/store_photos');
mkdirSync(OUT, { recursive: true });
const m = a => execFileSync('magick', a, { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
const ok = f => { if (!existsSync(f)) throw new Error('missing ' + f); return f; };
const P = f => ok(join(PKG, f));
const cat = JSON.parse(readFileSync(P('store/products.json'), 'utf8')), app = JSON.parse(readFileSync(P('apparel/products.json'), 'utf8'));
const ZONE = { 'Reading Area': 'booker', 'Calm Corner': 'lumi', 'Discovery Zone': 'zuri', 'Movement Zone': 'bop', 'Friends Circle': 'friends-circle' };
const key = id => ['booker', 'lumi', 'zuri', 'bop', 'friends-circle'].find(k => id.includes(k));
let n = 0;
const put = (id, i, args) => { m([...args, '-strip', join(OUT, `${id}-${i}.png`)]); n++; };

for (const p of cat.products) {
  const k = key(p.id);
  if (p.type === 'rug') put(p.id, 1, [p.id.includes('-square-') ? P(`carpets/square/${k}-square-carpet.png`) : P(`carpets/${k}-carpet.png`)]);
  else if (p.type === 'plush') {
    // the owner's clean single-shot doll is the primary picture; the three-view turnaround board is the secondary "all angles" picture
    put(p.id, 1, [existsSync(join(PKG, `Single_Shot_Dolls/${k}-plush.png`)) ? P(`Single_Shot_Dolls/${k}-plush.png`) : P(`plush/${k}-plush.png`)]);
    put(p.id, 2, [P(`plush/${k}-turnaround.png`)]);
  } else if (p.type === 'poster') put(p.id, 1, [P(`posters/${k}-poster-${p.id.endsWith('-v1') ? 'a' : 'b'}.png`), '-resize', '1600x']);
}
// apparel sources are front|back compositions: the front and back garments do not meet at the middle for every type, so split where the gap is
// (T-shirt 50%, hoodie 52%, backpack 61.7%). View 1 is the front, 2 the back, 3 the whole composite.
const SPLIT = { tshirt: 0.5, hoodie: 0.522, backpack: 0.617 };
for (const p of (Array.isArray(app) ? app : app.products)) {
  const src = P(p.image ? 'apparel/' + p.image : `apparel/images/${p.id}.png`), t = p.id.split('-').pop(), r = SPLIT[t] || 0.5;
  put(p.id, 1, [src, '-gravity', 'West', '-crop', `${Math.round(r * 1000) / 10}%x100%+0+0`, '+repage']);
  put(p.id, 2, [src, '-gravity', 'East', '-crop', `${Math.round((1 - r) * 1000) / 10}%x100%+0+0`, '+repage']);
  put(p.id, 3, [src]);
}
// the Zuri shell backpack (owner image, 2026-10-07 10:38 PM): a plush turtle-shell backpack, hero of the Backpacks section
const SHELL = join(homedir(), 'Downloads', 'ChatGPT Image Oct 7, 2026, 10_38_40 PM.png');
if (existsSync(SHELL)) put('zuri-shell-backpack', 1, [SHELL]);
// bundles use the owner's group shots
put('bundle-complete-learning-zones', 1, [P('carpets/all-five-carpets.png')]);
put('bundle-four-zone-starter', 1, [P('carpets/all-five-carpets.png'), '-gravity', 'West', '-crop', '78%x100%+0+0', '+repage']);
put('bundle-character-merchandising-kit', 1, [P('plush/all-four-plush.png')]);
// collection heroes
put('collection-carpets', 1, [P('carpets/all-five-carpets.png')]);
put('collection-carpets', 2, [P('carpets/square/all-five-square-carpets.png')]);
put('collection-plush', 1, [P('plush/all-four-plush.png')]);
put('collection-posters', 1, ['(', ...['booker', 'lumi', 'friends-circle', 'zuri', 'bop'].map(k => P(`posters/${k}-poster-a.png`)), '-resize', 'x900', '+append', ')', '-resize', '2000x', '-gravity', 'center', '-background', '#F8F3EA', '-extent', '2000x1000']);
put('collection-apparel', 1, ['(', ...['booker', 'lumi', 'all-friends', 'zuri', 'bop'].flatMap(k => ['(', P(`apparel/images/${k}-tshirt.png`), '-crop', '2x1@', '+repage', '-delete', '1', '+repage', '-resize', 'x800', ')']), '+append', ')', '-resize', '2000x', '-gravity', 'center', '-background', '#FBF6EE', '-extent', '2000x1000']);
console.log(`staged ${n} pictures in ${OUT}`);
