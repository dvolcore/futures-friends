// axe cannot compute text contrast where the background is a photo, gradient or pseudo-element ("incomplete"). This tool does it from pixels:
// for each such node it hides the text, screenshots the box it sat in, and measures the text colour against the real pixels. A node passes when
// 90% of the background pixels give >= 4.5:1 (>= 3:1 for large text: 24px, or 18.66px bold).
//   node tools/a11y-pixel-contrast.mjs [--only <route-regex>] [--root <folder>] [--out file.json]
import { writeFileSync } from 'node:fs';
import { EXTRA_ROUTES, TAGS, axe, goto, loadChromium, open, routeList, startSite } from '../tests/a11y-harness.mjs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SITE } from '../tests/a11y-harness.mjs';

const arg = (n) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : null; };
const only = arg('--only') ? new RegExp(arg('--only')) : null, out = arg('--out'), root = arg('--root') || SITE;
const AXE = readFileSync(join(SITE, 'tests/fixtures/axe-core/axe.min.js'), 'utf8');
const site = await startSite(root), browser = await loadChromium().launch();
const results = [], summary = {};
for (const width of [1280, 390]) {
  const { ctx, page } = await open(browser, width);
  await page.goto(`${site.base}?fresh=px`);
  const routes = [...(await routeList(page)), ...EXTRA_ROUTES].filter((r) => !only || only.test(r));
  for (const route of routes) {
    await goto(page, site.base, route, 500);
    await page.evaluate(() => document.querySelectorAll('#view details').forEach((d) => { d.open = true; }));
    if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ content: AXE });
    const targets = await page.evaluate(async (tags) => {
      const r = await window.axe.run(document, { runOnly: { type: 'tag', values: tags }, resultTypes: ['incomplete'] });
      const t = []; r.incomplete.filter((v) => v.id === 'color-contrast').forEach((v) => v.nodes.forEach((n) => t.push(n.target.join(' >>> ')))); return t;
    }, TAGS);
    let n = 0, bad = 0;
    for (const sel of targets) {
      const probe = await page.evaluate((sel) => {
        let el = null; try { el = document.querySelector(sel.split(' >>> ').pop()); } catch (e) { return null; }
        if (!el) return null;
        el.scrollIntoView({ block: 'center' });
        if (el.closest('[aria-hidden="true"],[hidden],[inert]')) return null;                        // decorative or off-screen: not read, not judged
        const isSvg = el instanceof SVGElement;
        const r = el.getBoundingClientRect(), cs = getComputedStyle(el), textColor = isSvg ? cs.fill : cs.color;
        if (r.width < 2 || r.height < 2 || cs.visibility === 'hidden' || !/^rgb/.test(textColor)) return null;
        const hit = document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, r.x + r.width / 2)), Math.min(innerHeight - 1, Math.max(0, r.y + r.height / 2)));
        if (!hit || !(el === hit || el.contains(hit) || hit.contains(el))) return null;          // covered by something else: not what a reader sees
        const saved = [el, ...el.querySelectorAll('*')].map((e) => [e, e.style.cssText]);
        saved.forEach(([e]) => { e.style.setProperty('fill', 'transparent', 'important'); e.style.setProperty('color', 'transparent', 'important'); e.style.setProperty('-webkit-text-fill-color', 'transparent', 'important'); e.style.setProperty('text-shadow', 'none', 'important'); });
        window.__restore = () => saved.forEach(([e, c]) => { e.style.cssText = c; });
        const size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight, 10) >= 700;
        // the boxes the glyphs actually occupy (a block-level kicker is as wide as its column; its words are not)
        let rects = [];
        [...el.childNodes].filter((nd) => nd.nodeType === 3 && nd.textContent.trim()).forEach((nd) => { const range = document.createRange(); range.selectNodeContents(nd); rects.push(...range.getClientRects()); });   // this element's own words only
        rects = rects.filter((q) => q.width >= 2 && q.height >= 2);
        if (!rects.length) rects = [r];
        const x0 = Math.max(0, Math.min(...rects.map((q) => q.left))), y0 = Math.max(0, Math.min(...rects.map((q) => q.top)));
        const x1 = Math.min(innerWidth, Math.max(...rects.map((q) => q.right))), y1 = Math.min(innerHeight, Math.max(...rects.map((q) => q.bottom)));
        if (x1 - x0 < 2 || y1 - y0 < 2) return null;
        return { rects: rects.map((q) => ({ x: Math.max(0, q.left) - x0, y: Math.max(0, q.top) - y0, w: Math.min(q.right, x1) - Math.max(0, q.left), h: Math.min(q.bottom, y1) - Math.max(0, q.top) })), clip: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 }, color: textColor, large: size >= 24 || (size >= 18.66 && bold), text: (el.textContent || '').trim().slice(0, 40), html: sel };
      }, sel);
      if (!probe || probe.clip.width < 2 || probe.clip.height < 2) continue;
      const png = await page.screenshot({ clip: probe.clip });
      await page.evaluate(() => window.__restore && window.__restore());
      const ratio = await page.evaluate(async ({ b64, color, rects }) => {
        const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height).data;
        const m = /rgba?\(([^)]+)\)/.exec(color).slice(1)[0].split(/[ ,/]+/).filter(Boolean).map(Number);
        const lum = (r, g2, b) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g2) + 0.0722 * f(b); };
        const a = m.length > 3 ? m[3] : 1, L = [];
        const inRect = (px, py) => rects.some((q) => px >= q.x && px <= q.x + q.w && py >= q.y && py <= q.y + q.h);
        const step = Math.max(1, Math.floor(d.length / 4 / 800));
        for (let i = 0; i < d.length; i += 4 * step) {
          const px = (i / 4) % c.width, py = Math.floor(i / 4 / c.width);
          if (!inRect(px, py)) continue;
          const br = d[i], bg = d[i + 1], bb = d[i + 2], r2 = m[0] * a + br * (1 - a), g2 = m[1] * a + bg * (1 - a), b2 = m[2] * a + bb * (1 - a);
          const l1 = lum(r2, g2, b2) + 0.05, l2 = lum(br, bg, bb) + 0.05; L.push(Math.max(l1, l2) / Math.min(l1, l2));
        }
        if (!L.length) return 21; L.sort((x, y) => x - y); return L[Math.floor(L.length * 0.1)];
      }, { b64: png.toString('base64'), color: probe.color, rects: probe.rects });
      n++;
      const need = probe.large ? 3 : 4.5;
      if (ratio < need) { bad++; results.push({ route, width, text: probe.text, ratio: +ratio.toFixed(2), need, target: probe.html.slice(-70) }); }
    }
    summary[`${route}@${width}`] = { checked: n, failing: bad };
    console.log(`${route}@${width}\tchecked ${n}\tfailing ${bad}`);
  }
  await ctx.close();
}
await browser.close(); await site.close();
const failing = results.length;
console.log(`\nTOTAL failing ${failing}`);
for (const r of results) console.log(`  ${r.route}@${r.width} "${r.text}" ${r.ratio}:1 (needs ${r.need}) ${r.target}`);
if (out) writeFileSync(out, JSON.stringify({ summary, results }, null, 1));
