// Evidence for the FLC shield animation (wave 9): real-time videos of the footer mark (first view, idle, hover replay) and
// frame strips of the intro seeked every 100 ms, at 1280 and 390 px. Headless Chromium (HUB_DIR as tests/a11y-harness.mjs).
//   node tools/flc-mark-evidence.mjs [outDir]        (default ~/futures-friends-w9-shield-evidence)
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { loadChromium, startSite } from '../tests/a11y-harness.mjs';

const out = process.argv[2] || join(homedir(), 'futures-friends-w9-shield-evidence');
mkdirSync(out, { recursive: true });
const srv = await startSite();
const browser = await loadChromium().launch();
const SIZES = { 1280: { width: 1280, height: 720 }, 390: { width: 390, height: 844 } };

async function toFooter(page) {
  await page.goto(`${srv.base}?fresh=w9e-${Date.now()}#home`);
  await page.waitForFunction(() => document.querySelector('footer .fprog .flcm'));
  await page.evaluate(() => localStorage.setItem('ff-sound', 'off'));
}

try {
  for (const w of [1280, 390]) {
    // 1. real-time video: scroll to the footer, the intro plays, idle for a while, a hover (or tap) replays the arrow and star
    const vctx = await browser.newContext({ viewport: SIZES[w], reducedMotion: 'no-preference', recordVideo: { dir: out, size: SIZES[w] } });
    const vp = await vctx.newPage();
    await toFooter(vp);
    await vp.waitForTimeout(800);
    await vp.evaluate(() => document.querySelector('footer .fprog').scrollIntoView({ block: 'center' }));
    await vp.waitForTimeout(2600);
    const b = await vp.evaluate(() => { const r = document.querySelector('footer .flcm').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    if (w === 1280) await vp.mouse.move(b.x, b.y); else await vp.mouse.click(b.x, b.y);
    await vp.waitForTimeout(8500);                         // idle: a star twinkle (6 s) and a shine (13 s cycle, first at ~3.5 s)
    const video = vp.video();
    const crop = await vp.evaluate(() => { const r = document.querySelector('footer .fprog').getBoundingClientRect(); return { x: Math.max(0, Math.round(r.x - 16)), y: Math.max(0, Math.round(r.y - 16)), w: Math.round(Math.min(r.width, 300) + 32), h: Math.round(r.height + 32) }; });
    await vctx.close();
    renameSync(await video.path(), join(out, `intro-${w}.webm`));
    writeFileSync(join(out, `crop-${w}.json`), JSON.stringify(crop));   // the footer block in the video, for a zoomed cut (ffmpeg crop)

    // 2. deterministic strip: the intro seeked every 100 ms, the mark at device pixel ratio 4 (44 px -> 176 px)
    const ctx = await browser.newContext({ viewport: SIZES[w], deviceScaleFactor: 4, reducedMotion: 'no-preference' });
    const p = await ctx.newPage();
    await toFooter(p);
    await p.evaluate(() => document.querySelector('footer .fprog').scrollIntoView({ block: 'center' }));
    await p.waitForFunction(() => { const s = document.querySelector('footer .flcm').__flc; return s && s.running && s.running.length; });
    await p.evaluate(() => document.querySelector('footer .flcm').__flc.running.forEach(a => a.pause()));
    const frames = [];
    for (let t = 0; t <= 1800; t += 100) {
      await p.evaluate(t => document.querySelector('footer .flcm').__flc.running.forEach(a => { a.currentTime = t; }), t);
      const r = await p.evaluate(() => { const r = document.querySelector('footer .flcm').getBoundingClientRect(); return { x: r.x - 10, y: r.y - 12, width: r.width + 20, height: r.height + 18 }; });
      frames.push({ t, png: (await p.screenshot({ clip: r })).toString('base64') });
    }
    // the strip itself is composed in the page (no image library needed here)
    const strip = await p.evaluate(async frames => {
      const imgs = await Promise.all(frames.map(f => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + f.png; })));
      const W = imgs[0].width, H = imgs[0].height, c = document.createElement('canvas'); c.width = W * imgs.length; c.height = H + 44;
      const x = c.getContext('2d'); x.fillStyle = '#0A2B38'; x.fillRect(0, 0, c.width, c.height);
      imgs.forEach((im, i) => { x.drawImage(im, i * W, 0); x.fillStyle = '#C6D7DD'; x.font = '24px sans-serif'; x.fillText(frames[i].t + ' ms', i * W + 12, H + 32); });
      return c.toDataURL('image/png');
    }, frames);
    writeFileSync(join(out, `strip-${w}.png`), Buffer.from(strip.split(',')[1], 'base64'));
    await ctx.close();
  }
  console.log('evidence written to', out);
} finally { await browser.close(); await srv.close(); }
