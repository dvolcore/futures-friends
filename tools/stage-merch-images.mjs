#!/usr/bin/env node
/* Stage the owner's merchandise campaign pictures (Futures_Friends_Merchandise_Campaign_2026-10-07) as store pictures.
   Reads the package's store/products.json and apparel/products.json, then writes <product-id>-<n>.png files into the store_photos folder
   (default ~/Downloads/FUTURES_FRIENDS_PROJECT/05_Brand_and_Art/store_photos/) for tools/import-store-images.mjs to convert.
   - plush: n=1 the product shot, n=2..4 the front, side and back panels of the three-view turnaround board
   - apparel and backpacks: n=1 the front view, n=2 the back view (each source is a front|back pair)
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
    put(p.id, 1, [P(`plush/${k}-plush.png`)]);
    [0, 1, 2].forEach(i => put(p.id, i + 2, [P(`plush/${k}-turnaround.png`), '-crop', '3x1@', '+repage', '-delete', ['1,2', '0,2', '0,1'][i], '+repage', '-shave', '12x0', '+repage']));
  } else if (p.type === 'poster') put(p.id, 1, [P(`posters/${k}-poster-${p.id.endsWith('-v1') ? 'a' : 'b'}.png`), '-resize', '1600x']);
}
for (const p of (Array.isArray(app) ? app : app.products)) {
  ['0', '1'].forEach((c, i) => put(p.id, i + 1, [P(p.image ? 'apparel/' + p.image : `apparel/images/${p.id}.png`), '-crop', '2x1@', '+repage', '-delete', i === 0 ? '1' : '0', '+repage']));
}
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
