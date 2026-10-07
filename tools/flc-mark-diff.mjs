// Overlay diff: the traced FLC shield (flc-mark.js, at rest) against its master PNG, rendered by headless Chromium.
//   node tools/flc-mark-diff.mjs [outDir]     (default ~/futures-friends-w9-shield-evidence; HUB_DIR as tests/a11y-harness.mjs)
// For each colourway (rev on the footer navy, light on white) and each scale (1x = the PNG's own 256 x 318 grid; 4x = 1024 x 1272,
// PNG smoothly upscaled; footer = 44 x 55 CSS px at device pixel ratio 2, both downscaled by the browser as visitors see it), it
// draws PNG and SVG on the same ground and reports: mean absolute difference per channel (0-255), the share of pixels whose
// largest channel difference is over 32 and over 64, and the 99th-percentile difference. Writes <kind>-<scale>.png strips
// (PNG | SVG | 50/50 overlay | difference x4) to outDir and prints JSON.
import { mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { loadChromium, startSite } from '../tests/a11y-harness.mjs';

export const GROUNDS = { rev: '#0A2B38', light: '#FFFFFF' };
export const SCALES = { '1x': { w: 256, h: 318, dpr: 1 }, '4x': { w: 1024, h: 1272, dpr: 1 }, footer: { w: 44, h: 55, dpr: 2 } };

// In-page: renders both images onto canvases and measures. Returns metrics and (optionally) a strip as a data URL.
export async function measure(page, base, kind, scale, strip = false) {
  const s = SCALES[scale];
  return page.evaluate(async ({ base, kind, s, ground, strip }) => {
    const svg = window.FFFlcMark.build(kind);
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const svgUrl = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }));
    const load = src => new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = j; i.src = src; });
    const [png, vec] = await Promise.all([load(base + (kind === 'light' ? 'img/brand/flc-mark.png' : 'img/brand/flc-mark-rev.png')), load(svgUrl)]);
    const W = Math.round(s.w * s.dpr), H = Math.round(s.h * s.dpr);
    const draw = img => { const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
      x.fillStyle = ground; x.fillRect(0, 0, W, H); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, W, H); return c; };
    const a = draw(png), b = draw(vec);
    const A = a.getContext('2d').getImageData(0, 0, W, H).data, B = b.getContext('2d').getImageData(0, 0, W, H).data;
    let sum = 0, over32 = 0, over64 = 0; const hist = new Uint32Array(256);
    const d = document.createElement('canvas'); d.width = W; d.height = H; const dx = d.getContext('2d'); const D = dx.createImageData(W, H);
    for (let i = 0; i < A.length; i += 4) {
      const m = Math.max(Math.abs(A[i] - B[i]), Math.abs(A[i + 1] - B[i + 1]), Math.abs(A[i + 2] - B[i + 2]));
      sum += (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2])) / 3;
      hist[m]++; if (m > 32) over32++; if (m > 64) over64++;
      const v = Math.min(255, m * 4); D.data[i] = v; D.data[i + 1] = v * 0.35; D.data[i + 2] = 0; D.data[i + 3] = 255;
    }
    const n = W * H; let acc = 0, p99 = 0; for (let k = 0; k < 256; k++) { acc += hist[k]; if (acc >= n * 0.99) { p99 = k; break; } }
    dx.putImageData(D, 0, 0);
    const out = { kind, w: W, h: H, mean: +(sum / n).toFixed(3), over32: +(over32 / n * 100).toFixed(3), over64: +(over64 / n * 100).toFixed(3), p99 };
    if (strip) {
      const gap = Math.max(4, W >> 6), c = document.createElement('canvas'); c.width = W * 4 + gap * 3; c.height = H; const x = c.getContext('2d');
      x.fillStyle = '#888'; x.fillRect(0, 0, c.width, c.height);
      x.drawImage(a, 0, 0); x.drawImage(b, W + gap, 0);
      x.drawImage(a, 2 * (W + gap), 0); x.globalAlpha = 0.5; x.drawImage(b, 2 * (W + gap), 0); x.globalAlpha = 1;
      x.drawImage(d, 3 * (W + gap), 0);
      out.strip = c.toDataURL('image/png');
    }
    URL.revokeObjectURL(svgUrl);
    return out;
  }, { base, kind, s, ground: GROUNDS[kind], strip });
}

export async function openMark(browser, base) {
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 1300 } });
  const page = await ctx.newPage();
  await page.goto(base + 'tests/fixtures/blank.html?fresh=' + Date.now()).catch(() => null);
  await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ url: base + 'flc-mark.js?fresh=' + Date.now() });
  await page.waitForFunction(() => !!window.FFFlcMark);
  return { ctx, page };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = process.argv[2] || join(homedir(), 'futures-friends-w9-shield-evidence');
  mkdirSync(out, { recursive: true });
  const srv = await startSite();
  const browser = await loadChromium().launch();
  try {
    const { page } = await openMark(browser, srv.base);
    const report = [];
    for (const kind of ['rev', 'light']) for (const scale of Object.keys(SCALES)) {
      const r = await measure(page, srv.base, kind, scale, true);
      writeFileSync(join(out, `diff-${kind}-${scale}.png`), Buffer.from(r.strip.split(',')[1], 'base64'));
      delete r.strip; r.scale = scale; report.push(r);
    }
    writeFileSync(join(out, 'diff-report.json'), JSON.stringify(report, null, 1));
    console.log(JSON.stringify(report, null, 1));
  } finally { await browser.close(); await srv.close(); }
}
