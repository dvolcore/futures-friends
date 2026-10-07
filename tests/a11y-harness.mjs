// Shared harness for the accessibility tests and tools/a11y-audit.mjs: serves this folder on a free port, drives headless Chromium
// (playwright-core from the platform repo's hub/node_modules; override with HUB_DIR) and runs the vendored axe-core 4.11.1
// (tests/fixtures/axe-core, MPL-2.0) against a route. No network, no secrets, nothing written to the site.
import { createServer } from 'node:http';
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SITE = join(dirname(fileURLToPath(import.meta.url)), '..');
const HUB_DIR = process.env.HUB_DIR ?? '/Volumes/FFCRM/app';
const AXE = readFileSync(join(SITE, 'tests/fixtures/axe-core/axe.min.js'), 'utf8');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.pdf': 'application/pdf' };
export const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
export const BLOCKING = ['serious', 'critical'];

function rawChromium() {
  try { return createRequire(join(HUB_DIR, 'hub/package.json'))('playwright-core').chromium; }
  catch (e) { throw new Error(`playwright-core not found under ${HUB_DIR}/hub/node_modules (set HUB_DIR): ${e.message}`); }
}
// The entry gate (entry.js, owner 2026-10-07) opens the first page load of every session. Tests that are not about the gate start
// past it: every context made from this browser marks the session as entered (sessionStorage 'ff-entered'), exactly as a visitor
// who already tapped "Tap to enter". loadChromium({ gate: true }) gives the untouched browser (tests/entry-gate.test.js).
export const PASS_GATE = () => { try { sessionStorage.setItem('ff-entered', '1'); } catch (_) { /* blocked storage */ } };
export function loadChromium(opts = {}) {
  const chromium = rawChromium();
  if (opts.gate) return chromium;
  return new Proxy(chromium, { get(t, k) {
    if (k !== 'launch') { const v = t[k]; return typeof v === 'function' ? v.bind(t) : v; }
    return async (...a) => {
      const browser = await t.launch(...a), make = browser.newContext.bind(browser), page = browser.newPage.bind(browser);
      browser.newContext = async (...o) => { const c = await make(...o); await c.addInitScript(PASS_GATE); return c; };
      browser.newPage = async (...o) => { const pg = await page(...o); await pg.addInitScript(PASS_GATE); return pg; };
      return browser;
    };
  } });
}

export async function startSite(root = SITE) {
  const server = createServer((req, res) => {
    const p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
    const file = join(root, p === '/' ? 'index.html' : p);
    if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));         // a free port chosen by the OS, never 8765 or 8811
  const port = server.address().port;
  if ([8765, 8811].includes(port)) throw new Error('shared port');
  return { base: `http://127.0.0.1:${port}/`, close: () => new Promise((r) => server.close(r)) };
}

export const SIZES = { 1280: { width: 1280, height: 720 }, 390: { width: 390, height: 844 } };

export async function open(browser, width, opts = {}) {
  const ctx = await browser.newContext({ viewport: SIZES[width], reducedMotion: opts.motion ? 'no-preference' : 'reduce', ...(opts.context || {}) });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return { ctx, page, errors };
}

// Loads one hash route fresh (stale cached index.html has fooled checks before: ?fresh=).
export async function goto(page, base, route, settle = 450) {
  await page.goto(`${base}?fresh=${Date.now()}#${route}`);              // a new query string is a new document, so no route state leaks from the last one
  await page.waitForFunction(() => document.querySelector('#view') && document.querySelector('#view').children.length > 0);
  await page.waitForTimeout(settle);
}

// Runs axe on the whole page (or a context selector). Returns violations with the nodes that matter.
export async function axe(page, { include, openDetails = true } = {}) {
  if (openDetails) await page.evaluate(() => document.querySelectorAll('#view details').forEach((d) => { d.open = true; }));
  if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ content: AXE });
  return page.evaluate(async ({ tags, include }) => {
    const r = await window.axe.run(include ? { include: [[include]] } : document, { runOnly: { type: 'tag', values: tags } });
    return r.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, help: v.help,
      nodes: v.nodes.slice(0, 5).map((n) => ({ target: n.target.join(' '), html: n.html.slice(0, 120), why: n.failureSummary.replace(/\s+/g, ' ').slice(0, 200) })) }));
  }, { tags: TAGS, include });
}

export const routeList = (page) => page.evaluate(() => Object.keys(window.FFRouteMeta.ROUTES));
// Routes that need an argument to show anything real (route-meta lists them without one).
export const EXTRA_ROUTES = ['activities/smell-the-flower', 'story-time/booker-tries-again', 'story-time/big-feelings-brighter-days', 'story-time/what-happens-if-we-try',
  'this-week/lumi', 'post/screen-time', 'academy/F-101'];   // wave 7 GATE: 'unit-1/1' and 'unit-1/5' now land on the #unit-1 summary

// Tabs through the page with the keyboard and measures every focus indicator against its background (WCAG 1.4.11, 3:1).
// Returns the stops whose ring is missing or too faint. Backgrounds: the first opaque ancestor; a gradient or image on the way is
// reported as "unknown" (never counted as a pass).
export async function focusRings(page, { max = 120 } = {}) {
  const bad = [], seen = new Set();
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    const r = await page.evaluate(() => {
      const el = document.activeElement; if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      const parse = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
      const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      let bg = null, unknown = false;
      for (let n = el.parentElement; n && !bg; n = n.parentElement) { const s = getComputedStyle(n), c = parse(s.backgroundColor); if (c && c.a > 0.9) bg = c; else if (s.backgroundImage !== 'none') { unknown = true; break; } }
      if (!bg && !unknown) bg = { r: 255, g: 255, b: 255 };
      const oc = parse(cs.outlineColor), width = parseFloat(cs.outlineWidth);
      let ratio = 0;
      if (cs.outlineStyle !== 'none' && width >= 2 && oc && bg) { const a = lum(oc) + 0.05, b = lum(bg) + 0.05; ratio = Math.max(a, b) / Math.min(a, b); }
      const hb = document.querySelector('header.bar'), hr = hb ? hb.getBoundingClientRect().bottom : 0, er = el.getBoundingClientRect(), obscured = !el.closest('header') && !el.classList.contains('ff-skip') && er.height < innerHeight - hr && er.height > 0 && er.top < hr - 1 && er.bottom > 0;
      const id = el.id || el.getAttribute('data-fl') || el.getAttribute('data-u1-day') || '';
      const chain = []; for (let n = el.parentElement; n && chain.length < 5; n = n.parentElement) chain.push(`${n.tagName.toLowerCase()}${n.className ? '.' + String(n.className).trim().split(/\s+/)[0] : ''}`);
      return { chain: chain.join('<'), key: `${el.tagName}|${id}|${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 24)}|${Math.round(el.getBoundingClientRect().top)}`, tag: el.tagName, cls: String(el.className).slice(0, 30), text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30), style: cs.outlineStyle, width, color: cs.outlineColor, ratio: +ratio.toFixed(2), unknown, obscured };
    });
    if (!r) continue;
    if (seen.has(r.key)) break;                                        // wrapped around
    seen.add(r.key);
    if (r.obscured) bad.push({ ...r, ratio: 'obscured by the sticky header' });
    if (r.unknown) continue;
    if (r.style === 'none' || r.width < 2 || r.ratio < 3) bad.push(r);
  }
  return bad;
}
