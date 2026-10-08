// Rebuilds the site art that used to bake in the old brand (G13-G17), the dining-room and zone-map pictures whose walls carried
// health labels (I05, guardrail 10), and the two placeholder clips made from that art (D07, D08). Approved assets only, laid out
// by tools/brand-art/compose.html in headless Chromium; no generated art and no paid service.
//   node tools/build-brand-art.mjs [--only hero,group,...]
// Needs playwright-core (HUB_DIR, see tests/a11y-harness.mjs) and ffmpeg with libx264 and libwebp on PATH.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SITE, loadChromium, startSite } from '../tests/a11y-harness.mjs';

const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1].split(',') : null;
const want = (k) => !only || only.includes(k);
const ff = (...a) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...a], { stdio: 'inherit' });
const P = (...a) => join(SITE, ...a);
// asset -> [output file, format]. (All four friends' books have their finished covers since the revised editions of 2026-10-07,
// img/books/<book id>/cover-*.webp; the compose.html 'cover-booker', 'cover-lumi' and 'cover-bop' layouts are no longer written to the site.) Order matters: ac1 shows the new group.jpg; the episode clip pans over the new hero.jpg.
const OUT = { hero: ['img/hero.jpg', 'jpeg'], group: ['img/group.jpg', 'jpeg'], carpet: ['img/carpet.jpg', 'jpeg'], kitchen: ['img/kitchen.jpg', 'jpeg'],
  zones: ['img/zones.jpg', 'jpeg'],
  'poster-booker': ['img/booker-a-new-friend-at-futures-poster.png', 'png'],
  'poster-bop': ['img/bop-teamwork-makes-it-brighter-poster.png', 'png'], 'poster-lumi': ['img/lumi-kindness-goes-a-long-way-poster.png', 'png'] };

const tmp = mkdtempSync(join(tmpdir(), 'ff-brand-art-'));
const site = await startSite();
const browser = await loadChromium().launch();
async function shot(asset, file, type) {
  const page = await browser.newPage();
  await page.goto(`${site.base}tools/brand-art/compose.html?fresh=${Date.now()}#${asset}`);
  await page.evaluate(() => window.READY);
  const [w, h] = await page.evaluate((a) => window.ASSETS[a], asset);
  await page.setViewportSize({ width: w, height: h });
  await page.waitForTimeout(150);
  await page.screenshot({ path: file, type, ...(type === 'jpeg' ? { quality: 88 } : {}), clip: { x: 0, y: 0, width: w, height: h } });
  await page.close();
  console.log(`${asset} -> ${file} (${w}x${h})`);
}
for (const [asset, [file, type]] of Object.entries(OUT)) {
  if (!want(asset)) continue;
  await shot(asset, P(file), type);
  if (type === 'png') for (const s of [400, 800]) ff('-i', P(file), '-vf', `scale=${s}:-1`, '-c:v', 'libwebp', '-quality', '82', P(file.replace(/\.png$/, `-${s}.webp`)));
}
if (want('academy') && process.env.REBUILD_OLD_ACADEMY_PLACEHOLDER) {   // D07 (retired by W10, 2026-10-07): the 33 s four-card placeholder.
  // video/academy-welcome.mp4 is now the finished sample lesson (plush-generated/video-w10-academy); this target would overwrite it,
  // so it only runs when explicitly asked for.
  const cards = ['ac1', 'ac2', 'ac3', 'ac4'], secs = [8, 8, 8, 9];
  for (const c of cards) await shot(c, join(tmp, `${c}.png`), 'png');
  const inputs = cards.flatMap((c, i) => ['-loop', '1', '-t', String(secs[i]), '-i', join(tmp, `${c}.png`)]);
  ff(...inputs, '-filter_complex', `${cards.map((_, i) => `[${i}:v]fps=25,format=yuv420p[v${i}]`).join(';')};${cards.map((_, i) => `[v${i}]`).join('')}concat=n=4:v=1:a=0[o]`,
    '-map', '[o]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-movflags', '+faststart', '-an', P('video/academy-welcome.mp4'));
  console.log('academy -> video/academy-welcome.mp4');
}
// Gap fill 2026-10-07: episode-sample.mp4 is retired (the Watch player plays the finished welcome video), so this build only runs on request.
if (want('episode') && process.env.REBUILD_RETIRED_EPISODE_PLACEHOLDER) {   // D08: 12 s slow push-in on the hero art, silent placeholder
  ff('-loop', '1', '-i', P('img/hero.jpg'), '-vf', "scale=3200:-1,zoompan=z='1+0.08*on/300':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=300:s=1280x720:fps=25,format=yuv420p",
    '-frames:v', '300', '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-movflags', '+faststart', '-an', P('video/episode-sample.mp4'));
  console.log('episode -> video/episode-sample.mp4');
}
await browser.close(); await site.close(); rmSync(tmp, { recursive: true, force: true });
