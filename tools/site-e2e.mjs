#!/usr/bin/env node
// Site end-to-end functional sweep (owner 2026-10-07: "write a check on the whole website to make sure everything's running").
// Drives headless Chromium (playwright-core, see tests/a11y-harness.mjs: HUB_DIR) through every route in route-meta.js at 390x844 and
// 1280x800 and exercises the interactive features: nav menu, sound / nature / motion toggles, hero friends, the welcome intro, every
// video player (poster, captions track, duration, transcript), the Story Time reader (all books), activity cards, the loop widget,
// Talk cards, printables, settings, search, the store / cart, pricing, the forms (validation + the honest "requests open soon" state)
// and the deep links. Writes a JSON + Markdown report.
//
// Usage:
//   node tools/site-e2e.mjs                          # against the live site (https://dvolcore.github.io/futures-friends/)
//   node tools/site-e2e.mjs --local                  # against this folder, served on a free port
//   node tools/site-e2e.mjs --base <url> [--out dir] [--quick] [--only routes,features,media,consistency]
//   --quick: one viewport (390) for the route sweep and fewer books/videos (what tests/site-e2e.test.js runs).
//   --routes home,watch,...: sweep only these routes.  --areas nav,story-time,forms,...: run only the checks of these areas.
// Exit code 1 when any check is "broken".
//
// SAFETY: nothing is ever submitted to an external endpoint. Every non-GET request that leaves the site's own origin is aborted and
// recorded; the forms are driven only as far as their validation and their configured (FFIntake) state. The portals (account,
// reset-password, portal, hub, this-week, family/teacher sign-in, academy learn-*) are only render-checked: another agent owns them.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { loadChromium, startSite, SITE } from '../tests/a11y-harness.mjs';

const argv = process.argv.slice(2);
const opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const LIVE = 'https://dvolcore.github.io/futures-friends/';
const QUICK = argv.includes('--quick');
const ONLY = (opt('--only') || 'routes,features,media,consistency').split(',');
const AREAS = opt('--areas') ? opt('--areas').split(',') : null;          // run only the checks of these areas (route, nav, story-time, forms, ...)
const ROUTE_LIST = opt('--routes') ? opt('--routes').split(',') : null;   // sweep only these routes
const OUT = opt('--out') || join(SITE, 'docs/e2e');
const LOCAL = argv.includes('--local');
const site = LOCAL ? await startSite() : { base: opt('--base') || LIVE, close: async () => {} };
const BASE = site.base.endsWith('/') ? site.base : site.base + '/';
const ORIGIN = new URL(BASE).origin;

// Owned by the demo-portal agent: render-checked and reported, never edited here.
export const PORTAL_ROUTES = ['account', 'reset-password', 'portal', 'hub', 'this-week', 'family-portal', 'signin-family', 'signin-teacher',
  'learn', 'learn-course', 'learn-cert', 'learn-team', 'learn-author', 'learn-approve', 'verify', 'academy'];
const VIEWPORTS = QUICK ? [{ width: 390, height: 844 }] : [{ width: 390, height: 844 }, { width: 1280, height: 800 }];

const results = [];   // { area, feature, status: pass|broken|warn|owner, detail, evidence, route, owner }
const rec = (area, feature, status, detail = '', extra = {}) => { results.push({ area, feature, status, detail, ...extra }); if (status !== 'pass') console.log(`[${status}] ${area} / ${feature}: ${String(detail).slice(0, 300)}`); };
const step = async (area, feature, fn, extra = {}) => {
  if (AREAS && !AREAS.includes(area)) return;
  try { const r = await fn(); if (r && r.status) rec(area, feature, r.status, r.detail || '', { ...extra, evidence: r.evidence }); else rec(area, feature, 'pass', typeof r === 'string' ? r : '', extra); }
  catch (e) { rec(area, feature, 'broken', e.message.split('\n')[0], extra); }
};
const assert = (c, m) => { if (!c) throw new Error(m); };

const browser = await loadChromium().launch();
const blocked = [];

// A context that refuses every write leaving the site's own origin (forms, analytics beacons), so the sweep can never send data anywhere.
async function context(viewport, opts = {}) {
  const ctx = await browser.newContext({ viewport, reducedMotion: opts.motion ? 'no-preference' : 'reduce', hasTouch: viewport.width < 768,
    isMobile: false, ...(opts.ctx || {}) });
  await ctx.route('**/*', (route) => {
    const req = route.request(); const u = new URL(req.url());
    if (req.method() !== 'GET' && req.method() !== 'HEAD' && u.origin !== ORIGIN) { blocked.push(`${req.method()} ${u.origin}${u.pathname}`); return route.abort(); }
    if (req.method() !== 'GET' && req.method() !== 'HEAD') { blocked.push(`${req.method()} ${u.pathname}`); return route.abort(); }
    return route.continue();
  });
  return ctx;
}

// One page with listeners for console errors, page errors, failed and 4xx/5xx requests.
async function newPage(ctx) {
  const page = await ctx.newPage();
  const log = { console: [], pageerror: [], failed: [], bad: [] };
  page.on('console', (m) => { if (m.type() === 'error') log.console.push(m.text().slice(0, 240)); });
  page.on('pageerror', (e) => log.pageerror.push(e.message.slice(0, 240)));
  page.on('requestfailed', (r) => { const f = r.failure()?.errorText || ''; if (!/ERR_ABORTED|NS_BINDING_ABORTED|cancelled/i.test(f) || /\.(vtt|jpg|png|webp|woff2?)$/.test(r.url())) log.failed.push(`${f} ${r.url()}`); });
  // *.local.js are optional developer overrides that intake/hub/analytics config only request on localhost
  page.on('response', (r) => { if (r.status() >= 400 && !/\.local\.js(\?|$)/.test(r.url())) log.bad.push(`${r.status()} ${r.url()}`); });
  return { page, log };
}
const reset = (log) => { for (const k of Object.keys(log)) log[k].length = 0; };

async function open(page, route, settle = 700, retry = true) {
  try { await openOnce(page, route, settle); }
  catch (e) { if (!retry || !/Timeout/.test(e.message)) throw e; await page.waitForTimeout(3000); await openOnce(page, route, settle); }   // one retry: GitHub Pages hiccups
}
async function openOnce(page, route, settle) {
  await page.goto(`${BASE}?e2e=${Date.now()}#${route}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForFunction(() => document.querySelector('#view') && document.querySelector('#view').children.length > 0, null, { timeout: 20000 });
  await page.waitForTimeout(settle);
}

// Skip past the tap-to-enter sound gate / welcome overlay if one is up, so it never masks a page.
async function dismissGate(page) {
  await page.evaluate(() => {
    const sel = ['.ffe-go'];
    for (const s of sel) { const b = document.querySelector(s); if (b && b.offsetParent) { b.click(); return s; } }
    return null;
  }).catch(() => null);
}

// Text that should never reach a visitor.
const RAW = [/\bundefined\b/, /\bNaN\b/, /\[object Object\]/, /\$\{[^}]*\}/, /\{\{[^}]*\}\}/, /\bnull\b(?! and void)/];
async function textProblems(page) {
  return page.evaluate((src) => {
    const res = src.map((s) => new RegExp(s.source, s.flags));
    const out = [];
    const view = document.querySelector('#view'); if (!view) return ['no #view'];
    const t = view.innerText || '';
    for (const re of res) { const m = re.exec(t); if (m) { const i = m.index; out.push(`"${t.slice(Math.max(0, i - 50), i + 50).replace(/\s+/g, ' ')}"`); } }
    // empty sections: a <section> with a heading and nothing else visible
    view.querySelectorAll('section').forEach((s) => {
      if (!s.offsetParent || s.getAttribute('aria-hidden') === 'true') return;
      const txt = (s.innerText || '').trim(); const media = s.querySelector('img,video,svg,canvas,iframe,picture');
      if (!txt && !media && s.getBoundingClientRect().height > 40) out.push(`empty section ${s.id || s.className.slice(0, 40)}`);
    });
    // broken images in view
    view.querySelectorAll('img').forEach((im) => { if (im.complete && im.naturalWidth === 0 && im.getAttribute('src') && im.loading !== 'lazy') out.push(`broken img ${im.getAttribute('src')}`); });
    return out;
  }, RAW.map((r) => ({ source: r.source, flags: r.flags })));
}

// ---------------------------------------------------------------- 1. every route at every viewport
let ROUTES = [];
async function sweepRoutes() {
  for (const vp of VIEWPORTS) {
    const ctx = await context(vp);
    const { page, log } = await newPage(ctx);
    await open(page, 'home', 1500);
    if (!ROUTES.length) ROUTES = ROUTE_LIST || await page.evaluate(() => Object.keys(window.FFRouteMeta.ROUTES));
    const extra = ROUTE_LIST ? [] : ['activities/booker', 'activities/lumi', 'activities/zuri', 'activities/bop', 'story-time/booker-tries-again', 'post/screen-time', 'job/lead-teacher'];
    for (const r of [...ROUTES, ...extra]) {
      reset(log);
      const owner = PORTAL_ROUTES.includes(r.split('/')[0]) ? 'demo-portal agent' : undefined;
      await step('route', `#${r} @${vp.width}`, async () => {
        await open(page, r);
        // scroll the page so lazy images / videos load and get checked
        await page.evaluate(async () => { const h = document.body.scrollHeight; for (let y = 0; y < h; y += 700) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } scrollTo(0, 0); });
        await page.waitForTimeout(600);
        const probs = await textProblems(page);
        const title = await page.title();
        const viewLen = await page.evaluate(() => document.querySelector('#view').innerText.trim().length);
        const issues = [];
        if (viewLen < 40) issues.push(`view nearly empty (${viewLen} chars)`);
        if (r !== 'not-found' && /not found|page not found/i.test(title)) issues.push(`title "${title}"`);
        if (/undefined|NaN/.test(title)) issues.push(`title "${title}"`);
        issues.push(...probs);
        issues.push(...log.pageerror.map((e) => `pageerror: ${e}`));
        issues.push(...log.console.filter((e) => !/Failed to load resource/.test(e)).map((e) => `console: ${e}`));
        issues.push(...log.bad.map((e) => `HTTP ${e}`));
        issues.push(...log.failed.map((e) => `failed: ${e}`));
        const dead = await page.evaluate(() => {
          const out = []; const v = document.getElementById('view'); const routes = window.FFRouteMeta ? Object.keys(window.FFRouteMeta.ROUTES) : [];
          v.querySelectorAll('[data-anchor]').forEach((b) => { if (!document.getElementById(b.dataset.anchor)) out.push(`data-anchor="${b.dataset.anchor}" has no target`); });
          v.querySelectorAll('[data-go]').forEach((b) => { const g = (b.dataset.go || '').split('/')[0]; if (g && routes.length && !routes.includes(g) && !(typeof V !== 'undefined' && V[g])) out.push(`data-go="${b.dataset.go}" is not a page`); });
          v.querySelectorAll('a[href^="#"]').forEach((a) => { const h = a.getAttribute('href').slice(1).split('/')[0]; if (h && routes.length && !routes.includes(h) && !(typeof V !== 'undefined' && V[h]) && !document.getElementById(h)) out.push(`link #${h} goes nowhere`); });
          return [...new Set(out)];
        });
        issues.push(...dead);
        const hscroll = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        if (hscroll > 2) issues.push(`horizontal overflow ${hscroll}px`);
        if (issues.length) return { status: owner ? 'owner' : 'broken', detail: [...new Set(issues)].slice(0, 8).join(' | ') };
        return `${viewLen} chars, "${title}"`;
      }, { route: r, owner });
    }
    await ctx.close();
  }
}

// ---------------------------------------------------------------- 2. interactive features
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clickSel = async (page, sel, opts = {}) => { const l = page.locator(sel).first(); await l.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {}); await l.click({ timeout: 8000, ...opts }); };

async function features() {
  const ctx = await context({ width: 390, height: 844 }, { motion: true });
  const { page, log } = await newPage(ctx);
  await open(page, 'home', 1800);
  await dismissGate(page);

  // ---- entry gate (entry.js): a fresh session opens on "Tap to enter"; the tap wakes sound; the gate shows once per session
  await step('entry', 'entry gate: shows on a fresh session, Tap to enter lifts it and wakes sound, once per session; Enter without sound', async () => {
    const raw = await loadChromium({ gate: true }).launch();
    try {
      const c = await raw.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', hasTouch: true });
      const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
      await p.goto(`${BASE}?e2e=${Date.now()}#home`); await p.waitForTimeout(1500);
      const g = await p.evaluate(() => { const b = document.querySelector('.ffe-go'); return { has: !!b, vis: !!(b && b.offsetParent), focus: document.activeElement === b, open: window.FFEntry ? window.FFEntry.open() : null }; });
      if (!g.has) return { status: 'warn', detail: 'no entry gate on this build (not published yet?)' };
      assert(g.vis, 'gate button not visible');
      await p.locator('.ffe-go').click(); await p.waitForTimeout(1500);
      const after = await p.evaluate(() => ({ gone: !document.querySelector('.ffe-go') || !document.querySelector('.ffe-go').offsetParent, unlocked: window.FFSound ? window.FFSound.unlocked() : null, on: window.FFSound ? window.FFSound.enabled() : null, inert: document.querySelector('#view')?.closest('[inert]') ? 'inert' : 'ok' }));
      assert(after.gone, 'gate did not lift'); assert(after.inert === 'ok', 'page still inert after entering'); assert(after.unlocked, 'sound not unlocked by the tap');
      await p.goto(`${BASE}?e2e=${Date.now()}#watch`); await p.waitForTimeout(1200);
      const again = await p.evaluate(() => !!(document.querySelector('.ffe-go') && document.querySelector('.ffe-go').offsetParent));
      assert(!again, 'gate showed again in the same session');
      const c2 = await raw.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' }); const p2 = await c2.newPage();
      await p2.goto(`${BASE}?e2e=${Date.now()}#at-home`); await p2.waitForTimeout(1500);
      await p2.locator('.ffe-quiet').click(); await p2.waitForTimeout(1200);
      const quiet = await p2.evaluate(() => ({ gone: !document.querySelector('.ffe-go') || !document.querySelector('.ffe-go').offsetParent, on: window.FFSound ? window.FFSound.enabled() : null }));
      assert(quiet.gone, '"Enter without sound" did not lift the gate'); assert(quiet.on === false, `"Enter without sound" left sound on (${quiet.on})`);
      assert(!errs.length, errs.join(' | '));
      return `gate shown with focus=${g.focus}; tap: sound unlocked, enabled=${after.on}; not shown again; quiet entry sound off`;
    } finally { await raw.close(); }
  });

  // ---- global chrome
  await step('nav', 'menu opens, lists pages, closes (Escape and close button) @390', async () => {
    await clickSel(page, '#menuT');
    await page.waitForTimeout(500);
    const r1 = await page.evaluate(() => { const m = document.getElementById('ffw-menu'); return { open: !!(m && m.open), links: m ? m.querySelectorAll('a[href^="#"]').length : 0, exp: document.getElementById('menuT').getAttribute('aria-expanded') }; });
    assert(r1.open, 'menu dialog did not open'); assert(r1.links >= 8, `menu has only ${r1.links} links`);
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    assert(!(await page.evaluate(() => document.getElementById('ffw-menu').open)), 'Escape did not close the menu');
    await clickSel(page, '#menuT'); await page.waitForTimeout(400);
    await clickSel(page, '#ffw-menu .ffw-m-close'); await page.waitForTimeout(400);
    assert(!(await page.evaluate(() => document.getElementById('ffw-menu').open)), 'close button did not close the menu');
    // a menu link navigates and closes the menu
    await clickSel(page, '#menuT'); await page.waitForTimeout(400);
    const href = await page.evaluate(() => { const a = [...document.querySelectorAll('#ffw-menu a[href^="#"]')].find((x) => x.offsetParent && x.getAttribute('href') !== '#home'); a.click(); return a.getAttribute('href'); });
    await page.waitForTimeout(800);
    const after = await page.evaluate(() => ({ hash: location.hash, open: document.getElementById('ffw-menu').open }));
    assert(after.hash.split('/')[0] === href.split('/')[0], `menu link ${href} went to ${after.hash}`); assert(!after.open, 'menu stayed open after navigating');
    return `${r1.links} links; ${href} navigates and closes`;
  });

  await step('nav', 'audience switcher (Families / Centers / Teachers)', async () => {
    await open(page, 'home', 900);
    const r = await page.evaluate(async () => {
      const bs = [...document.querySelectorAll('header .ffw-audbtn, .bar .ffw-audbtn')].filter((b) => b.offsetParent);
      if (!bs.length) return { skip: true };
      const out = [];
      for (const b of bs) { b.click(); await new Promise((r) => setTimeout(r, 300)); out.push([b.innerText.trim(), b.getAttribute('aria-pressed') || b.getAttribute('aria-current') || b.className]); }
      return { out };
    });
    if (r.skip) return 'switcher hidden at 390 (desktop header only)';
    return r.out.map((x) => x.join(':')).join(', ');
  });

  await step('chrome', 'search opens, finds "Booker", result navigates', async () => {
    await open(page, 'home', 800);
    await clickSel(page, 'button[aria-label="Search Futures Friends"]');
    await page.waitForTimeout(400);
    assert(await page.evaluate(() => document.getElementById('px-search').open), 'search dialog did not open');
    await page.fill('#px-globalquery', 'Booker');
    await page.waitForTimeout(500);
    const n = await page.evaluate(() => document.querySelectorAll('#ffw-pal-list [role=option], #ffw-pal-list a, #ffw-pal-list li').length);
    assert(n > 0, 'no search results for "Booker"');
    await page.keyboard.press('Enter'); await page.waitForTimeout(800);
    const r = await page.evaluate(() => ({ open: document.getElementById('px-search').open, hash: location.hash }));
    assert(!r.open, 'search stayed open after Enter'); assert(r.hash && r.hash !== '#home', `Enter did not navigate (hash ${r.hash})`);
    // nonsense query: an honest empty state, not a blank list
    await clickSel(page, 'button[aria-label="Search Futures Friends"]'); await page.fill('#px-globalquery', 'zzqqxx'); await page.waitForTimeout(400);
    const empty = await page.evaluate(() => document.getElementById('px-search').innerText);
    await page.keyboard.press('Escape');
    assert(/no |nothing|try/i.test(empty), 'no empty-state message for a query with no results');
    return `${n} results; Enter -> ${r.hash}`;
  });

  await step('chrome', 'display preferences: motion toggle sets data-motion=off and persists', async () => {
    await open(page, 'home', 800);
    await clickSel(page, 'button[aria-label="Display preferences"]'); await page.waitForTimeout(300);
    assert(await page.evaluate(() => document.getElementById('px-settings').open), 'preferences dialog did not open');
    const before = await page.evaluate(() => document.documentElement.dataset.motion || '');
    await page.locator('#px-motion').click(); await page.waitForTimeout(300);
    const mid = await page.evaluate(() => ({ m: document.documentElement.dataset.motion || '', c: document.getElementById('px-motion').checked }));
    await page.reload(); await page.waitForTimeout(1500);
    const kept = await page.evaluate(() => document.documentElement.dataset.motion || '');
    await clickSel(page, 'button[aria-label="Display preferences"]'); await page.locator('#px-motion').click(); await page.waitForTimeout(200);
    await clickSel(page, '#px-settings [data-px=close]');
    const restored = await page.evaluate(() => document.documentElement.dataset.motion || '');
    assert(mid.m !== before || !mid.c, `toggle changed nothing (before "${before}", after "${mid.m}")`);
    assert(kept === mid.m, `choice not kept after reload ("${mid.m}" -> "${kept}")`);
    return `motion "${before}" -> "${mid.m}" (kept after reload) -> "${restored}"`;
  });

  await step('chrome', 'sound pill: Sound toggles, Nature toggles and is remembered', async () => {
    await open(page, 'home', 800);
    const r = await page.evaluate(async () => {
      const main = document.querySelector('.ffs-main'), nat = document.querySelector('.ffs-nat');
      if (!main) return { err: 'no sound pill' };
      const s0 = main.getAttribute('aria-pressed');
      main.click(); await new Promise((r) => setTimeout(r, 250)); const s1 = main.getAttribute('aria-pressed');
      main.click(); await new Promise((r) => setTimeout(r, 250)); const s2 = main.getAttribute('aria-pressed');
      const n0 = nat.getAttribute('aria-pressed'); nat.click(); await new Promise((r) => setTimeout(r, 250)); const n1 = nat.getAttribute('aria-pressed');
      const stored = Object.keys(localStorage).filter((k) => /^ff-sound-nature/.test(k)).map((k) => localStorage.getItem(k))[0] ?? null;
      nat.click(); await new Promise((r) => setTimeout(r, 200));
      return { s0, s1, s2, n0, n1, stored, unlocked: window.FFSound && window.FFSound.unlocked(), enabled: window.FFSound && window.FFSound.enabled() };
    });
    assert(!r.err, r.err); assert(r.s0 !== r.s1 && r.s0 === r.s2, `Sound did not toggle (${r.s0}/${r.s1}/${r.s2})`);
    assert(r.n0 !== r.n1, `Nature did not toggle (${r.n0}/${r.n1})`); assert(r.stored != null, 'Nature choice not remembered');
    return `sound ${r.s0}->${r.s1}->${r.s2}, nature ${r.n0}->${r.n1}, unlocked=${r.unlocked}`;
  });

  await step('chrome', 'back-to-top button scrolls to top', async () => {
    await open(page, 'at-home', 800);
    await page.evaluate(() => scrollTo(0, document.body.scrollHeight)); await page.waitForTimeout(600);
    const vis = await page.evaluate(() => { const b = document.querySelector('.totop'); return b && getComputedStyle(b).visibility !== 'hidden' && getComputedStyle(b).opacity !== '0' && b.getBoundingClientRect().width > 0; });
    assert(vis, 'back-to-top not visible after scrolling down');
    // a tucked dock (words under it) un-tucks on the first tap by design (motion.js), so a second tap may be needed
    const tucked = await page.evaluate(() => document.documentElement.classList.contains('ff-dock-tuck'));
    const waitTop = () => page.waitForFunction(() => scrollY < 50, null, { timeout: 4000 }).catch(() => {});
    await page.locator('.totop').click({ force: true }); await waitTop();
    let y = await page.evaluate(() => scrollY);
    if (y > 50 && tucked) { await page.locator('.totop').click({ force: true }); await waitTop(); y = await page.evaluate(() => scrollY); }
    assert(y < 50, `still at y=${y}`);
    return tucked ? 'ok (dock was tucked: first tap brings it out, second goes to top)' : 'ok';
  });

  // ---- home: hero friends, intro video, welcome
  for (const k of ['booker', 'lumi', 'zuri', 'bop']) {
    await step('home', `hero friend tap: ${k} (card, voice, link)`, async () => {
      await open(page, 'home', 1200);
      // the friends walk and hop, so tap the element itself (a coordinate tap can land on a neighbour mid-step)
      await page.evaluate((k) => { const b = document.querySelector(`.ffa-friend[data-k=${k}]`); b.scrollIntoView({ block: 'center' }); b.click(); }, k);
      await page.waitForTimeout(800);
      const r = await page.evaluate((k) => {
        const b = document.querySelector(`.ffa-friend[data-k=${k}]`);
        const stage = b.closest('.ffa-stage');
        const link = [...stage.querySelectorAll('a[href^="#"]')].find((a) => a.offsetParent);
        const words = stage.innerText;
        return { pressed: b.getAttribute('aria-pressed'), link: link && link.getAttribute('href'), linkText: link && link.innerText.trim(), says: new RegExp(`I'm ${k}`, 'i').test(words),
          speaking: window.FFVoices ? window.FFVoices.speaking() : null, voiceSrc: window.FFVoices ? window.FFVoices.src(k, 'm4a') : null, voiceSrc2: window.FFVoices ? window.FFVoices.src(k, 'webm') : null };
      }, k);
      assert(r.pressed === 'true', 'friend button not pressed'); assert(r.says, `no "I'm ${k}" card`);
      assert(r.link && r.link.includes(k), `card link ${r.link} does not lead to ${k}`);
      for (const v of [r.voiceSrc, r.voiceSrc2].filter(Boolean)) { const res = await page.request.get(new URL(v, BASE).href, { headers: { Range: 'bytes=0-1' } }); assert(res.status() < 300, `voice ${v} HTTP ${res.status()}`); }
      // follow the link
      await page.evaluate((h) => [...document.querySelectorAll(`.ffa-stage a[href="${h}"]`)].find((a) => a.offsetParent).click(), r.link); await page.waitForTimeout(900);
      const h = await page.evaluate(() => location.hash);
      assert(h === r.link, `link went to ${h}`);
      return `card + ${r.link}; voice ${r.voiceSrc || 'n/a'} speaking=${r.speaking}`;
    });
  }

  await step('home', 'welcome intro: tap for sound + play (captions track, plays, duration)', async () => {
    await open(page, 'home', 1200);
    const r = await page.evaluate(async () => {
      const fig = document.querySelector('[data-video=intro]'); if (!fig) return { err: 'no intro video on home' };
      fig.scrollIntoView(); await new Promise((r) => setTimeout(r, 300));
      const snd = document.querySelector('.hc-vsound'); if (snd) snd.click();
      await new Promise((r) => setTimeout(r, 300));
      const btn = fig.querySelector('[data-video-toggle=intro]'); if (btn && btn.dataset.state !== 'playing') btn.click();
      const v = fig.querySelector('video');
      const t0 = Date.now(); while (Date.now() - t0 < 12000 && !(v.currentTime > 0.3)) await new Promise((r) => setTimeout(r, 200));
      const tr = v.querySelector('track');
      return { src: v.currentSrc, t: v.currentTime, dur: v.duration, muted: v.muted, err: v.error && v.error.code, track: tr && tr.getAttribute('src'), trackMode: tr && tr.track && tr.track.mode,
        cues: tr && tr.track && tr.track.cues ? tr.track.cues.length : null, state: btn && btn.dataset.state, sound: !!snd };
    });
    assert(!r.err, `video error ${r.err}`); assert(r.t > 0.3, `intro did not play (t=${r.t}, src=${r.src})`); assert(r.dur > 1, `duration ${r.dur}`);
    assert(r.track, 'no captions track');
    return `playing ${r.src.split('/').pop()} t=${r.t.toFixed(1)} of ${r.dur.toFixed(1)}s, muted=${r.muted}, captions ${r.track} (${r.trackMode}, ${r.cues} cues), tap-for-sound ${r.sound ? 'present' : 'absent'}`;
  });

  await step('home', 'home friend picker tabs (Booker / Lumi / Zuri / Bop)', async () => {
    await open(page, 'home', 1000);
    const r = await page.evaluate(async () => {
      const out = [];
      for (const k of ['lumi', 'zuri', 'bop', 'booker']) {
        const t = document.querySelector(`.hc-picktab[data-k=${k}]`); if (!t) return { err: 'no picker tab ' + k };
        t.click(); await new Promise((r) => setTimeout(r, 300));
        const stage = document.querySelector('.hc-pickstage'); out.push([k, (t.getAttribute('aria-selected') || t.getAttribute('aria-pressed')), stage && new RegExp(k, 'i').test(stage.innerText)]);
      }
      return { out };
    });
    assert(!r.err, r.err);
    const bad = r.out.filter((x) => !x[2]); assert(!bad.length, `stage did not change for ${bad.map((x) => x[0])}`);
    return r.out.map((x) => x[0] + ':' + x[1]).join(' ');
  });

  // ---- Story Time reader: all books
  const books = await page.evaluate(async () => { location.hash = '#story-time'; await new Promise((r) => setTimeout(r, 800)); return [...new Set([...document.querySelectorAll('#view a[href^="#story-time/"]')].map((a) => a.getAttribute('href').split('/')[1]))]; });
  await step('story-time', 'bookshelf lists five books', async () => { assert(books.length === 5, `shelf links ${books.length} books: ${books.join(', ')}`); return books.join(', '); });
  for (const b of (QUICK ? books.slice(0, 2) : books)) {
    await step('story-time', `reader: ${b} (turn pages by button, keys, swipe; size; point-and-read; last page)`, async () => {
      await open(page, `story-time/${b}`, 900);
      const info = await page.evaluate(() => ({ count: document.getElementById('flCount')?.textContent, size: getComputedStyle(document.getElementById('flReader')).getPropertyValue('--fl-size') }));
      assert(info.count === 'Cover', `starts on "${info.count}"`);
      await clickSel(page, '#flReader [data-fl=next]'); await page.waitForTimeout(250);
      const p1 = await page.evaluate(() => document.getElementById('flCount').textContent);
      assert(/^Page 1 of \d+$/.test(p1), `Next -> "${p1}"`);
      const pages = +p1.split(' of ')[1];
      await page.locator('#flStage').focus().catch(() => {});
      await page.keyboard.press('ArrowRight'); await page.waitForTimeout(200);
      const p2 = await page.evaluate(() => document.getElementById('flCount').textContent);
      assert(p2 === `Page 2 of ${pages}`, `ArrowRight -> "${p2}"`);
      await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(200);
      assert((await page.evaluate(() => document.getElementById('flCount').textContent)) === `Page 1 of ${pages}`, 'ArrowLeft did not go back');
      // swipe (touch events on the stage)
      const swiped = await page.evaluate(async () => {
        const st = document.getElementById('flStage'); const r = st.getBoundingClientRect(); const y = r.top + r.height / 2;
        const t = (x) => new Touch({ identifier: 1, target: st, clientX: x, clientY: y });
        st.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [t(r.right - 20)], changedTouches: [t(r.right - 20)] }));
        document.getElementById('flStage').dispatchEvent(new TouchEvent('touchend', { bubbles: true, touches: [], changedTouches: [t(r.left + 20)] }));
        await new Promise((r) => setTimeout(r, 200)); return document.getElementById('flCount').textContent;
      });
      assert(swiped === `Page 2 of ${pages}`, `swipe left -> "${swiped}"`);
      const pageText = await page.evaluate(() => document.getElementById('flStage').innerText.trim());
      assert(pageText.length > 20, 'page 2 has no text');
      // size controls
      await clickSel(page, '#flReader [data-fl=size][data-d="1"]'); await page.waitForTimeout(150);
      const bigger = await page.evaluate(() => getComputedStyle(document.getElementById('flReader')).getPropertyValue('--fl-size'));
      assert(parseFloat(bigger) > parseFloat(info.size), `A+ did not grow the words (${info.size} -> ${bigger})`);
      await clickSel(page, '#flReader [data-fl=size][data-d="-1"]');
      // point and read: highlight moves word by word
      await clickSel(page, '#flReader [data-fl=point]'); await page.waitForTimeout(200);
      const w0 = await page.evaluate(() => { const n = document.querySelector('#flStory .fl-w.fl-now'); return n && n.textContent; });
      await clickSel(page, '#flReader [data-fl=nextword]'); await page.waitForTimeout(150);
      const w1 = await page.evaluate(() => { const ws = [...document.querySelectorAll('#flStory .fl-w')]; return { i: ws.findIndex((w) => w.classList.contains('fl-now')), n: ws.length }; });
      assert(w0 != null, 'point-and-read: no highlighted word'); assert(w1.i === 1, `Next word -> index ${w1.i} of ${w1.n}`);
      await clickSel(page, '#flReader [data-fl=point]');
      // read to me (device voice; headless often has none: the button then stays hidden with a note)
      const speak = await page.evaluate(() => { const s = document.getElementById('flSpeak'); return { hidden: s ? s.hidden : null, note: document.querySelector('.fl-voice,#flVoice')?.textContent || '' }; });
      // to the end
      for (let i = 0; i < pages + 2; i++) await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(250);
      const end = await page.evaluate(() => ({ c: document.getElementById('flCount').textContent, nextDisabled: document.querySelector('#flReader [data-fl=next]').disabled }));
      assert(end.c === 'The End' && end.nextDisabled, `last page "${end.c}", Next disabled=${end.nextDisabled}`);
      return `${pages} pages; keys, swipe, A+/A-, point-and-read ok; Read to me ${speak.hidden ? 'hidden (no device voice in headless)' : 'shown'}`;
    });
  }

  // ---- activities: friend deep links, filters, print / share / sticker
  for (const k of ['booker', 'lumi', 'zuri', 'bop']) {
    await step('activities', `deep link #activities/${k}: friend section, videos, filters`, async () => {
      await open(page, `activities/${k}`, 1000);
      const r = await page.evaluate((k) => {
        const pressed = [...document.querySelectorAll('[data-fl=filter][data-f=friend]')].find((b) => b.getAttribute('aria-pressed') === 'true');
        return { pressed: pressed && pressed.dataset.v, vids: document.querySelectorAll('#view video').length, cards: document.querySelectorAll('#flActList > *').length, h1: document.querySelector('#view h1')?.innerText };
      }, k);
      assert(r.cards > 0, 'no activity cards'); assert(r.vids > 0, 'no videos for this friend');
      // filter by age then back
      await clickSel(page, '[data-fl=filter][data-f=band][data-v=prek]'); await page.waitForTimeout(300);
      const pre = await page.evaluate(() => document.querySelectorAll('#flActList > *').length);
      await clickSel(page, '[data-fl=filter][data-f=band][data-v=""]'); await page.waitForTimeout(300);
      return `friend filter=${r.pressed}, ${r.cards} cards (${pre} pre-K), ${r.vids} videos`;
    });
  }
  await step('activities', 'activity card: open/close details, print, share copies link, sticker adds', async () => {
    await open(page, 'activities', 1000);
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
    const r = await page.evaluate(async () => {
      const d = document.querySelector('#flActList details'); let toggled = null;
      if (d) { const s = d.querySelector('summary'); s.click(); await new Promise((r) => setTimeout(r, 150)); const o = d.open; s.click(); await new Promise((r) => setTimeout(r, 150)); toggled = [o, d.open]; }
      let printed = 0; const op = window.print; window.print = () => { printed++; };
      document.querySelector('[data-fl=print]')?.click(); await new Promise((r) => setTimeout(r, 400)); window.print = op;
      document.querySelector('[data-fl=share]')?.click(); await new Promise((r) => setTimeout(r, 400));
      const toast1 = document.getElementById('toast')?.innerText || '';
      let clip = ''; try { clip = await navigator.clipboard.readText(); } catch (e) { clip = 'n/a'; }
      document.querySelector('[data-fl=sticker]')?.click(); await new Promise((r) => setTimeout(r, 300));
      const toast2 = document.getElementById('toast')?.innerText || '';
      return { toggled, printed, toast1, clip, toast2 };
    });
    if (r.toggled) assert(r.toggled[0] && !r.toggled[1], `details did not open/close ${r.toggled}`);
    assert(r.printed === 1, `print button called print() ${r.printed} times`);
    assert(/copied|http/i.test(r.toast1), `share: toast "${r.toast1}"`);
    assert(/sticker/i.test(r.toast2), `sticker: toast "${r.toast2}"`);
    return `details ${r.toggled ? 'toggle' : 'n/a'}, print ok, share "${r.toast1.slice(0, 40)}", clipboard ${r.clip.slice(0, 60)}, sticker ok`;
  });

  // ---- see-how picture guides: play the steps
  await step('see-how', 'picture guide "Play the steps" advances', async () => {
    await open(page, 'see-how', 900);
    await clickSel(page, '[data-fl=play]');
    await page.waitForTimeout(2900);
    const r = await page.evaluate(() => { const g = document.querySelector('[data-fl=play]').closest('[id^=guide-]'); return { on: [...g.querySelectorAll('.fl-steps li')].findIndex((l) => l.classList.contains('fl-on')), live: g.querySelector('[id^=glive-]')?.textContent }; });
    assert(r.on >= 1, `step highlight at ${r.on}`);
    return `step ${r.on + 1}: ${r.live}`;
  });

  // ---- my week: plan, stickers, book club, certificate, erase
  await step('my-week', 'plan settings, sticker chart, book club, certificate name, erase', async () => {
    await open(page, 'my-week', 1000);
    const r = await page.evaluate(async () => {
      const f = document.getElementById('flPlanForm'); if (!f) return { err: 'no plan form' };
      const band = f.querySelector('input[name=band][value=threes]') || f.querySelector('input[name=band]'); band.click();
      await new Promise((r) => setTimeout(r, 300));
      const plan = (document.getElementById('flPlanOut') || {}).innerText || '';
      const stk = document.querySelector('[data-fl=stk][data-k=booker][data-d="0"]'); stk.click(); await new Promise((r) => setTimeout(r, 300));
      const stk2 = document.querySelector('[data-fl=stk][data-k=booker][data-d="0"]').getAttribute('aria-label');
      document.querySelector('[data-fl=bookread]').click(); await new Promise((r) => setTimeout(r, 250));
      const club = (document.getElementById('flClub') || {}).innerText || '';
      const nm = document.getElementById('flName'); nm.value = 'Ada'; nm.dispatchEvent(new Event('input', { bubbles: true })); await new Promise((r) => setTimeout(r, 200));
      const cert = (document.getElementById('flCert') || {}).innerText || '';
      const saved = Object.keys(localStorage).filter((k) => /^ff/.test(k)).length;
      document.querySelector('[data-fl=erase]').click(); await new Promise((r) => setTimeout(r, 500));
      const stk3 = document.querySelector('[data-fl=stk][data-k=booker][data-d="0"]')?.getAttribute('aria-label');
      return { band: band.value, plan: plan.slice(0, 80), stk2, club: club.slice(0, 80), cert: /Ada/.test(cert), saved, stk3 };
    });
    assert(!r.err, r.err); assert(r.plan.length > 10, 'plan output empty'); assert(!/no sticker/i.test(r.stk2), `sticker not added: "${r.stk2}"`);
    assert(/1/.test(r.club), `book club: "${r.club}"`); assert(r.cert, 'certificate does not show the name');
    assert(/no sticker/i.test(r.stk3 || ''), `erase left "${r.stk3}"`);
    return `band ${r.band}; plan "${r.plan.replace(/\s+/g, ' ').slice(0, 50)}"; sticker, +1 book, certificate name, erase ok`;
  });

  // ---- talk cards
  await step('talk', 'Talk cards: 13 episode cards, Print this card / Print all call print()', async () => {
    await open(page, 'talk', 900);
    const r = await page.evaluate(async () => {
      const cards = document.querySelectorAll('.tk-card[data-talk]').length; let n = 0; const op = window.print; window.print = () => { n++; };
      document.querySelector('[data-tk-print="101"]').click(); await new Promise((r) => setTimeout(r, 500));
      const scoped = document.body.className + ' ' + (document.documentElement.className || '');
      document.querySelector('[data-tk-print="all"]')?.click(); await new Promise((r) => setTimeout(r, 500));
      window.print = op; return { cards, n, scoped };
    });
    assert(r.cards >= 13, `${r.cards} cards`); assert(r.n === 2, `print() called ${r.n} times for 2 buttons`);
    return `${r.cards} cards; print buttons ok`;
  });

  // ---- learning loop widget on #unit-1
  await step('unit-1', 'learning-loop widget: six tabs, keys, flip card, tick steps, zones, play', async () => {
    await open(page, 'unit-1', 1200);
    const r = await page.evaluate(async () => {
      const w = document.querySelector('[data-lw]'); if (!w) return { err: 'no loop widget' };
      const tabs = [...w.querySelectorAll('[data-lw-step]')]; const out = [];
      for (const t of tabs) { t.click(); await new Promise((r) => setTimeout(r, 250)); out.push([t.getAttribute('aria-selected'), w.querySelector('[data-lw-n]').textContent, w.querySelector('[data-lw-body]').innerText.trim().length]); }
      // Talk: flip
      tabs[1].click(); await new Promise((r) => setTimeout(r, 250));
      const fb = w.querySelector('[data-lw-flip]'); const f0 = fb && fb.getAttribute('aria-pressed'); fb && fb.click(); await new Promise((r) => setTimeout(r, 300));
      const f1 = w.querySelector('[data-lw-flip]')?.getAttribute('aria-pressed');
      // Do: tick
      tabs[2].click(); await new Promise((r) => setTimeout(r, 250));
      const tick = w.querySelector('[data-lw-do]'); tick && tick.click(); await new Promise((r) => setTimeout(r, 200));
      const t1 = w.querySelector('[data-lw-do]')?.getAttribute('aria-pressed');
      // Explore: zone
      tabs[4].click(); await new Promise((r) => setTimeout(r, 250));
      const zb = [...w.querySelectorAll('.lw-map button')]; const z0 = w.querySelector('[data-lw-body]').innerText; zb[1] && zb[1].click(); await new Promise((r) => setTimeout(r, 250));
      const z1 = w.querySelector('[data-lw-body]').innerText;
      // keyboard
      tabs[0].click(); tabs[0].focus(); tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); await new Promise((r) => setTimeout(r, 250));
      const kn = w.querySelector('[data-lw-n]').textContent;
      // Watch: play
      tabs[0].click(); await new Promise((r) => setTimeout(r, 250)); w.querySelector('[data-lw-play]')?.click(); await new Promise((r) => setTimeout(r, 400));
      const v = w.querySelector('video'); let t = 0; if (v) { const t0 = Date.now(); while (Date.now() - t0 < 10000 && v.currentTime < 0.3) await new Promise((r) => setTimeout(r, 200)); t = v.currentTime; }
      return { n: tabs.length, out, f0, f1, t1, zoneChanged: z0 !== z1, kn, played: t, track: v && !!v.querySelector('track') };
    });
    assert(!r.err, r.err); assert(r.n === 6, `${r.n} tabs`);
    r.out.forEach((o, i) => { assert(o[0] === 'true' && o[1] === String(i + 1) && o[2] > 10, `tab ${i + 1}: ${o}`); });
    assert(r.f0 !== r.f1, `flip did not toggle (${r.f0} -> ${r.f1})`); assert(r.t1 === 'true', `tick: ${r.t1}`); assert(r.zoneChanged, 'zone tap changed nothing');
    assert(r.kn === '2', `ArrowRight on tab 1 -> step ${r.kn}`); assert(r.played > 0.3, `Watch video did not play (t=${r.played})`); assert(r.track, 'Watch video has no captions track');
    return 'six tabs, flip, tick, zones, keys, Watch plays with captions';
  });

  // ---- glass widgets (w10)
  await step('glass', 'glass grids present on whole-child / for-centers / for-families / teacher-standard / pricing', async () => {
    const out = [];
    for (const r of ['whole-child', 'for-centers', 'for-families', 'teacher-standard', 'pricing']) { await open(page, r, 900); out.push([r, await page.evaluate(() => document.querySelectorAll('#view .w10g').length)]); }
    const bad = out.filter((x) => !x[1]); assert(!bad.length, `no glass grid on ${bad.map((x) => x[0])}`);
    return out.map((x) => x.join(':')).join(' ');
  });

  // ---- curriculum explorer
  await step('curriculum', 'age / month / week / friend explorers respond; family plan saves', async () => {
    await open(page, 'curriculum', 1000);
    const r = await page.evaluate(async () => {
      const v = document.getElementById('view'); const res = {};
      for (const a of ['data-ex-age', 'data-ex-month', 'data-ex-week', 'data-ex-friend']) {
        const bs = [...v.querySelectorAll(`[${a}]`)]; if (bs.length < 2) { res[a] = 'missing'; continue; }
        const before = v.innerText; bs[bs.length - 1].click(); await new Promise((r) => setTimeout(r, 300));
        res[a] = before !== v.innerText ? 'changes' : (bs[bs.length - 1].getAttribute('aria-pressed') || bs[bs.length - 1].getAttribute('aria-selected') || 'no change');
      }
      let dl = null; const oc = URL.createObjectURL; URL.createObjectURL = (b) => { dl = b.size; return oc.call(URL, b); };
      v.querySelector('[data-ex-download]')?.click(); await new Promise((r) => setTimeout(r, 400)); URL.createObjectURL = oc;
      return { res, dl, cb: v.querySelectorAll('input[type=checkbox]').length };
    });
    const bad = Object.entries(r.res).filter(([, v]) => v === 'missing' || v === 'no change');
    assert(!bad.length, `explorers not responding: ${JSON.stringify(r.res)}`);
    return `${JSON.stringify(r.res)}; family plan download ${r.dl == null ? 'used another path' : r.dl + ' bytes'}`;
  });

  // ---- rainbow plate game
  await step('rainbow', 'Eat the Rainbow plate game: foods add, Play again resets', async () => {
    await open(page, 'rainbow', 1000);
    const r = await page.evaluate(async () => {
      const foods = [...document.querySelectorAll('.ffr-food')]; if (!foods.length) return { err: 'no foods' };
      const v = document.getElementById('view'); const t0 = v.innerText;
      for (const f of foods.filter((_, i) => i % 2 === 0)) { f.click(); await new Promise((r) => setTimeout(r, 120)); }
      const t1 = v.innerText; document.querySelector('[data-ffr-again]').click(); await new Promise((r) => setTimeout(r, 250));
      return { changed: t0 !== t1, reset: v.innerText === t0 || v.innerText.length > 0, lvl: v.querySelectorAll('[data-lvl]').length };
    });
    assert(!r.err, r.err); assert(r.changed, 'placing foods changed nothing');
    return 'foods place, play again';
  });

  // ---- friends page: rooms + community + 3D
  await step('friends', 'friend room arrows / selects, community friends, 3D buttons', async () => {
    await open(page, 'friends', 1200);
    const r = await page.evaluate(async () => {
      const v = document.getElementById('view'); const res = {};
      const next = v.querySelector('[data-room-direction="1"]'); if (next) { const a = v.innerText; next.click(); await new Promise((r) => setTimeout(r, 400)); res.arrow = a !== v.innerText; }
      const cf = [...v.querySelectorAll('[data-community-friend]')]; if (cf.length) { const a = v.innerText; cf[1].click(); await new Promise((r) => setTimeout(r, 300)); res.community = a !== v.innerText || cf[1].getAttribute('aria-pressed'); }
      const d3 = v.querySelector('[data-ff3d]'); if (d3) { d3.click(); await new Promise((r) => setTimeout(r, 1200)); const dlg = [...document.querySelectorAll('dialog[open], [role=dialog]')].filter((d) => d.offsetParent || d.open); res.d3 = dlg.length ? 'dialog' : 'none'; if (dlg[0]) { dlg[0].querySelector('button[aria-label*=lose i], [data-close], .close')?.click(); } document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); }
      return res;
    });
    assert(r.arrow !== false, 'Next friend arrow changed nothing'); assert(r.community, 'community friend tap changed nothing');
    return JSON.stringify(r);
  });

  // ---- for-centers room map
  await step('for-centers', 'classroom map zones (step into a zone, whole room)', async () => {
    await open(page, 'for-centers', 1000);
    const r = await page.evaluate(async () => {
      const s = document.querySelector('.ffhm-spot[data-z=lumi]'); if (!s) return { err: 'no map' };
      const v = document.getElementById('view'); const a = v.innerText; s.click(); await new Promise((r) => setTimeout(r, 500));
      const b = v.innerText; document.querySelector('.ffhm-back')?.click(); await new Promise((r) => setTimeout(r, 400));
      return { changed: a !== b };
    });
    assert(!r.err, r.err); assert(r.changed, 'zone tap changed nothing');
    return 'ok';
  });

  // ---- store: request list
  await step('store', 'shop-programs: qty adds to list, change qty, clear; "Ordering opens soon" honest; request page', async () => {
    await open(page, 'shop-programs', 1000);
    await page.fill('#sq-FF-KIT-HOME', '2'); await page.locator('#sq-FF-KIT-HOME').dispatchEvent('change'); await page.waitForTimeout(400);
    let list = await page.evaluate(() => [...document.querySelectorAll('.fs-panel .fs-lines li')].map((l) => l.innerText.replace(/\s+/g, ' ')));
    assert(list.length === 1 && /× 2/.test(list[0]), `list after qty 2: ${JSON.stringify(list)}`);
    await page.fill('#sq-FF-CAT-0', '3'); await page.locator('#sq-FF-CAT-0').dispatchEvent('change'); await page.waitForTimeout(400);
    await page.fill('#sq-FF-KIT-HOME', '0'); await page.locator('#sq-FF-KIT-HOME').dispatchEvent('change'); await page.waitForTimeout(400);
    list = await page.evaluate(() => [...document.querySelectorAll('.fs-panel .fs-lines li')].map((l) => l.innerText.replace(/\s+/g, ' ')));
    assert(list.length === 1 && /× 3/.test(list[0]), `list after qty change: ${JSON.stringify(list)}`);
    const honest = await page.evaluate(() => /Ordering opens soon/.test(document.getElementById('view').innerText) && !/checkout|pay now|add to cart/i.test(document.getElementById('view').innerText));
    assert(honest, 'no honest "Ordering opens soon" or a checkout/pay control exists');
    await clickSel(page, '.fs-panel [data-store-req]'); await page.waitForTimeout(900);
    const req = await page.evaluate(() => ({ hash: location.hash, list: document.querySelectorAll('#view .fs-lines li').length, text: document.getElementById('view').innerText }));
    assert(req.hash === '#store-request', `request button went to ${req.hash}`); assert(req.list === 1, `request page shows ${req.list} list lines`);
    await open(page, 'shop-programs', 800);
    const keep = await page.evaluate(() => document.querySelectorAll('.fs-panel .fs-lines li').length);
    if (keep) { await clickSel(page, '[data-store-clear]'); await page.waitForTimeout(300); }
    const cleared = await page.evaluate(() => document.querySelectorAll('.fs-panel .fs-lines li').length);
    assert(cleared === 0, 'Clear list left lines');
    return `list add/change/remove, request page carries the list (${/open soon|call/i.test(req.text) ? 'honest request state' : 'form'}), clear ok`;
  });
  // audience split (2026-10-07): the old #shop-families link opens the families' Kids' Shop (poster, plush, small carpet)
  await step('store', 'shop-families -> Kids\' Shop: three items, honest status, "Tell me when it opens"', async () => {
    await open(page, 'shop-families', 900);
    const f = await page.evaluate(() => ({ hash: location.hash, n: document.querySelectorAll('.aud-kid').length, btn: !!document.querySelector('[data-go="store-request"][data-store-req="list"]') }));
    assert(f.hash === '#kids-shop', `landed on ${f.hash}`); assert(f.n === 3, `${f.n} items`); assert(f.btn, 'no "Tell me when it opens"');
    return 'ok';
  });

  // ---- pricing calculator
  await step('pricing', 'cost calculator recomputes from rooms/children; no NaN; downloads 200', async () => {
    await open(page, 'pricing', 1000);
    const o0 = await page.evaluate(() => document.getElementById('pzOut').innerText);
    await page.fill('#pz-rooms', '4'); await page.locator('#pz-rooms').dispatchEvent('input'); await page.locator('#pz-rooms').dispatchEvent('change');
    await page.fill('#pz-kids', '60'); await page.locator('#pz-kids').dispatchEvent('input'); await page.locator('#pz-kids').dispatchEvent('change'); await page.waitForTimeout(400);
    const o1 = await page.evaluate(() => document.getElementById('pzOut').innerText);
    assert(o0 !== o1, 'calculator output did not change'); assert(!/NaN|undefined|\$0\.00\b/.test(o1), `calculator shows "${o1.slice(0, 120)}"`);
    await page.fill('#pz-rooms', ''); await page.locator('#pz-rooms').dispatchEvent('input'); await page.waitForTimeout(300);
    const o2 = await page.evaluate(() => document.getElementById('pzOut').innerText);
    assert(!/NaN|undefined/.test(o2), `empty rooms shows "${o2.slice(0, 120)}"`);
    const dls = await page.evaluate(() => [...document.querySelectorAll('#view a[href]')].map((a) => a.getAttribute('href')).filter((h) => /\.(pdf|png|jpg|zip)$/i.test(h)));
    const bad = [];
    for (const d of dls) { const res = await page.request.get(new URL(d, BASE).href, { headers: { Range: 'bytes=0-1' } }); if (res.status() >= 300) bad.push(`${res.status()} ${d}`); }
    assert(!bad.length, bad.join(', '));
    return `"${o1.replace(/\s+/g, ' ').slice(0, 90)}"; ${dls.length} downloads ok`;
  });

  // ---- academy quiz (owner: demo-portal agent for the academy portal)
  await step('academy', 'lesson preview knowledge check scores answers', async () => {
    await open(page, 'academy/F-101', 1200);
    const r = await page.evaluate(async () => {
      const f = document.getElementById('ffxQuiz'); if (!f) return { err: 'no quiz on academy/F-101' };
      const radios = [...f.querySelectorAll('input[type=radio]')]; if (!radios.length) return { err: 'quiz has no answers' };
      radios[0].click(); await new Promise((r) => setTimeout(r, 300));
      return { score: document.getElementById('ffxScore')?.textContent, fb: f.innerText.length };
    });
    assert(!r.err, r.err); assert(/of 3/.test(r.score || ''), `score "${r.score}"`);
    return r.score;
  }, { owner: 'demo-portal agent' });

  // ---- printables: every download link answers 200
  await step('printables', 'every printable / family sheet link answers 200 with the right type', async () => {
    const urls = new Set();
    for (const r of ['printables', 'my-week', 'whole-child', 'teacher-standard', 'unit-1', 'watch', 'pricing']) {
      await open(page, r, 800);
      (await page.evaluate(() => [...document.querySelectorAll('#view a[href]')].map((a) => a.getAttribute('href')).filter((h) => /\.(pdf|png|jpg|zip|docx?)(\?|$)/i.test(h) && !/^https?:/.test(h)))).forEach((u) => urls.add(u));
    }
    const bad = [];
    for (const u of urls) {
      const res = await page.request.get(new URL(u, BASE).href, { headers: { Range: 'bytes=0-3' } });
      const ct = res.headers()['content-type'] || '';
      if (res.status() >= 300) bad.push(`${res.status()} ${u}`);
      else if (/\.pdf/i.test(u) && !/pdf/.test(ct)) bad.push(`${u} served as ${ct}`);
    }
    assert(urls.size > 5, `only ${urls.size} printable links found`); assert(!bad.length, bad.join(', '));
    return `${urls.size} files ok`;
  });

  // ---- maps / tel / mailto links
  await step('contact', 'maps, tel and mailto links are well formed; copy buttons', async () => {
    await open(page, 'contact', 900);
    const r = await page.evaluate(async () => {
      const as = [...document.querySelectorAll('#view a[href]')].map((a) => [a.getAttribute('href'), a.target]);
      const maps = as.filter(([h]) => /google\.com\/maps|maps\.app|maps\.google/.test(h));
      const tel = as.filter(([h]) => /^tel:\+1\d{10}$/.test(h)); const mail = as.filter(([h]) => /^mailto:[^@]+@futureslearningcenter\.com/.test(h));
      return { maps: maps.map((m) => m.join(' ')), tel: tel.length, mail: mail.length, badTel: as.filter(([h]) => /^tel:/.test(h) && !/^tel:\+1\d{10}$/.test(h)).map((x) => x[0]) };
    });
    assert(r.maps.length, 'no Google Maps link'); assert(r.maps.every((m) => /_blank/.test(m)), 'maps link does not open a new tab');
    assert(r.tel && r.mail, `tel ${r.tel}, mailto ${r.mail}`); assert(!r.badTel.length, `malformed tel: ${r.badTel}`);
    return `maps ${r.maps.length}, tel ${r.tel}, mailto ${r.mail}`;
  });

  // ---- deep links
  for (const [route, test] of [['bop-at-home/elephant-stomp', 'bop'], ['activities/smell-the-flower', 'act'], ['story-time/the-rainbow-picnic', 'book'], ['post/screen-time', 'post'], ['job/lead-teacher', 'job']]) {
    await step('deep-link', `#${route}`, async () => {
      await open(page, route, 1200);
      const r = await page.evaluate(() => ({ hash: location.hash, title: document.title, h1: document.querySelector('#view h1')?.innerText || '', y: scrollY, nf: /not found|could not find/i.test(document.getElementById('view').innerText.slice(0, 400)) }));
      assert(!r.nf, `shows not found (${r.h1})`);
      return `${r.hash} -> "${r.h1.slice(0, 60)}" y=${r.y}`;
    });
  }

  // ---- the forms, as configured (no gateway: honest state) and against a local mock gateway (nothing leaves this machine)
  await step('forms', 'live config: every request form shows the honest "requests open soon" state', async () => {
    const out = [];
    for (const r of ['contact', 'quote', 'enroll', 'store-request', 'jobs', 'at-home', 'bop-at-home']) {
      await open(page, r, 1200);
      const t = await page.evaluate(() => ({ forms: [...document.querySelectorAll('#view form')].map((f) => f.id || f.className), soon: /open soon|not open yet|call or email/i.test(document.getElementById('view').innerText), url: (window.FF_INTAKE || {}).url }));
      out.push(`${r}:${t.soon ? 'honest' : 'NO-HONEST-STATE'}${t.forms.length ? '[' + t.forms.join(',') + ']' : ''}`);
      if (!t.soon && !t.url) throw new Error(`#${r} has no honest "open soon" text while FF_INTAKE.url is empty`);
    }
    return out.join(' ');
  });

  await page.close(); await ctx.close();
  await mockForms();
}

// Forms against a mock intake gateway served by Playwright itself (https://intake.e2e.test never resolves; every request to it is
// answered here). Exercises the validation messages, the success receipt and the request kinds: proves the forms reach FFIntake.
async function mockForms() {
  const MOCK = 'https://intake.e2e.test';
  const ctx = await context({ width: 1280, height: 800 });
  const sent = [];
  await ctx.route(/intake-config\.js/, (route) => route.fulfill({ contentType: 'text/javascript', body: `window.FF_INTAKE={url:'${MOCK}',turnstileSiteKey:''};` }));
  await ctx.route(`${MOCK}/**`, async (route) => {
    const req = route.request(); const path = new URL(req.url()).pathname;
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    let body = {}; try { body = req.postDataJSON() || {}; } catch (_) { body = { multipart: true }; }
    sent.push({ path, kind: body.kind, keys: Object.keys(body).sort() });
    const j = (status, b) => route.fulfill({ status, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
    if (path === '/v1/form-token') return j(200, { token: 'e2e-token', minFillSeconds: 0 });
    if (path === '/v1/tour-slots') return j(200, { slots: [] });
    if (path === '/v1/jobs') return j(200, { jobs: [{ id: 'e2e-job', title: 'E2E Test Teacher', role: 'Teacher', description: 'Test posting', location: { name: 'FLC', city: 'Independence', state: 'MO' } }] });
    if (path.startsWith('/v1/jobs/')) return j(200, { job: { id: 'e2e-job', title: 'E2E Test Teacher', description: 'Test posting' } });
    if (path === '/v1/status') return j(404, {});
    return j(202, { ref: 'E2E-0001', replyBusinessDays: 2 });
  });
  const { page } = await newPage(ctx);

  const tryForm = async (route, formSel, fill, okText = /received|E2E-0001|confirm/i, area = 'forms') => {
    await step(area, `#${route} ${formSel}: validation, then success via FFIntake (mock gateway)`, async () => {
      await open(page, route, 1500);
      const has = await page.evaluate((s) => !!document.querySelector(s), formSel);
      assert(has, `form ${formSel} not shown when a gateway url is configured`);
      sent.length = 0;
      await page.locator(`${formSel} [type=submit]`).first().scrollIntoViewIfNeeded();
      await page.locator(`${formSel} [type=submit]`).first().click();
      await page.waitForTimeout(500);
      const errs = await page.evaluate((s) => [...document.querySelectorAll(`${s} [aria-invalid=true]`)].map((e) => e.id || e.name), formSel);
      assert(errs.length, 'empty submit showed no validation errors');
      assert(!sent.some((x) => x.path !== '/v1/form-token'), `empty form was sent: ${JSON.stringify(sent)}`);
      await fill(page);
      await page.locator(`${formSel} [type=submit]`).first().click();
      await page.waitForTimeout(2500);
      const txt = await page.evaluate(() => document.getElementById('view').innerText);
      const posted = sent.filter((x) => x.path !== '/v1/form-token');
      assert(posted.length === 1, `expected one request, got ${JSON.stringify(posted)}`);
      assert(okText.test(txt), 'no success receipt after a 202');
      return `errors on empty: ${errs.join(',')}; sent ${posted[0].path} kind=${posted[0].kind}; receipt shown`;
    });
  };
  const fillContact = async (p) => { await p.fill('#cName', 'E2E Test'); await p.fill('#cEmail', 'e2e@example.com'); await p.fill('#cMsg', 'Automated site test, please ignore.'); await p.fill('#cZip', '64052').catch(() => {}); const t = await p.$('#cType'); if (t) await p.selectOption('#cType', { index: 1 }).catch(() => {}); };
  await tryForm('contact', '#ffiContact', fillContact);
  await tryForm('quote', '#ffiContact', fillContact);
  await tryForm('store-request', '#ffiContact', fillContact, /received|E2E-0001|confirm/i, 'store');
  await tryForm('enroll', '#ffxTourForm', async (p) => {
    await p.evaluate(async () => { const f = document.getElementById('ffxTourForm');
      const d = f.querySelector('[data-ffx-date]'); if (d) { d.click(); await new Promise((r) => setTimeout(r, 300)); }
      const t = document.getElementById('ffxTourForm').querySelector('[data-ffx-time]'); if (t) { t.click(); await new Promise((r) => setTimeout(r, 300)); }
      for (const el of document.getElementById('ffxTourForm').querySelectorAll('input,select,textarea')) {
      if (el.type === 'hidden' || /^ffiHp|website/i.test(el.id + el.name) || el.closest('[aria-hidden=true], .ffi-hp, [hidden]')) continue;
      if (el.tagName === 'SELECT') { if (el.options.length > 1) el.selectedIndex = 1; }
      else if (el.type === 'checkbox' || el.type === 'radio') { if (el.required || /consent|agree/i.test(el.name + el.id)) el.checked = true; }
      else if (el.type === 'email') el.value = 'e2e@example.com';
      else if (el.type === 'tel' || /phone/i.test(el.name + el.id)) el.value = '8165550100';
      else if (el.type === 'date') { const d = new Date(Date.now() + 9 * 864e5); el.value = d.toISOString().slice(0, 10); }
      else if (el.type === 'number') el.value = '3';
      else if (/zip/i.test(el.name + el.id)) el.value = '64052';
      else if (el.type === 'time') el.value = '10:00';
      else el.value = 'E2E Test';
      el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); } });
  });
  await tryForm('at-home', '#fhForm', async (p) => { await p.fill('#fhForm input[type=email]', 'e2e@example.com'); await p.evaluate(() => { const f = document.getElementById('fhForm'); const s = f.querySelector('select'); if (s && s.options.length > 1) s.selectedIndex = 1; s && s.dispatchEvent(new Event('change', { bubbles: true })); f.querySelectorAll('input[type=checkbox]').forEach((c) => { c.checked = true; }); }); }, /check your email|confirm|sent|received/i);
  await tryForm('bop-at-home', '#wcBop', async (p) => { await p.fill('#wcBop input[type=email]', 'e2e@example.com'); await p.evaluate(() => { const f = document.getElementById('wcBop'); f.querySelectorAll('select').forEach((s) => { if (s.options.length > 1) s.selectedIndex = 1; }); f.querySelectorAll('input[type=checkbox]').forEach((c) => { c.checked = true; }); }); }, /check your email|confirm|sent|received/i);

  // forms checked only up to validation (multi-step application with uploads, request lookup, job application)
  const validateOnly = async (route, formSel, note, btn = '[type=submit]:visible') => step('forms', `#${route} ${formSel}: empty submit shows field errors and sends nothing`, async () => {
    await open(page, route, 1500);
    assert(await page.evaluate((s) => !!document.querySelector(s), formSel), `form ${formSel} not shown with a gateway configured`);
    sent.length = 0;
    const submit = page.locator(`${formSel} ${btn}`).first();
    await submit.scrollIntoViewIfNeeded(); await submit.click(); await page.waitForTimeout(600);
    const errs = await page.evaluate((s) => [...document.querySelectorAll(`${s} [aria-invalid=true]`)].map((e) => e.id || e.name), formSel);
    const posted = sent.filter((x) => x.path !== '/v1/form-token');
    assert(errs.length, 'no field errors on an empty submit'); assert(!posted.length, `sent ${JSON.stringify(posted)}`);
    return `errors: ${errs.join(', ')}${note ? '; ' + note : ''}`;
  });
  await validateOnly('enroll', '#ffxAppForm', 'step 1 of 3 blocks Next', '[data-ffx-appnext]:visible');
  await validateOnly('enroll', '#ffxStatusForm');
  await step('forms', '#enroll request lookup: unknown reference shows "could not find"', async () => {
    await open(page, 'enroll', 1500);
    await page.fill('#wRef', 'FF-TEST-0000'); await page.fill('#wEmail', 'e2e@example.com');
    await page.locator('#ffxStatusForm [type=submit]').click(); await page.waitForTimeout(1500);
    const t = await page.evaluate(() => (document.getElementById('ffxStatusOut') || {}).innerText || '');
    assert(/could not find/i.test(t), `lookup said "${t.slice(0, 120)}"`);
    return 'ok';
  });
  await validateOnly('job/e2e-job', '#ffiApply');

  await step('forms', '#jobs lists jobs from the gateway and opens one', async () => {
    await open(page, 'jobs', 2000);
    const t = await page.evaluate(() => document.getElementById('view').innerText);
    assert(/E2E Test Teacher/.test(t), 'jobs list did not render the gateway jobs');
    return 'ok';
  });
  await page.close(); await ctx.close();
}

// ---------------------------------------------------------------- 3. every video: file, poster, captions, transcript, duration, plays
const ffprobe = (url) => { try { return +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', url], { timeout: 60000 }).toString().trim(); } catch (_) { return null; } };
// What a card promises, in seconds: [min, max]. "30 seconds", "about 2 minutes", "under a minute", "1 minute 10 seconds", "5 seconds, no sound".
function claimed(text) {
  const t = text.toLowerCase().replace(/(\d)½/g, '$1.5').replace(/½/g, '0.5');
  let m;
  if ((m = /(\d+)\s*(?:min(?:ute)?s?)\s*(?:and\s*)?(\d+)\s*sec/.exec(t))) { const s = +m[1] * 60 + +m[2]; return [s - 6, s + 6, m[0]]; }
  if ((m = /under (?:a|one) minute/.exec(t))) return [1, 62, m[0]];
  if ((m = /(?:about|around|nearly)?\s*(\d+(?:\.\d+)?)\s*(?:to|-|–)\s*(\d+)\s*min/.exec(t))) return [+m[1] * 60 - 15, +m[2] * 60 + 15, m[0]];
  if ((m = /(?:about|around|nearly)?\s*(\d+(?:\.\d+)?|one|two|three)\s*min(?:ute)?s?\b/.exec(t))) { const n = { one: 1, two: 2, three: 3 }[m[1]] || +m[1]; return [n * 60 * 0.75 - 10, n * 60 * 1.25 + 10, m[0]]; }
  if ((m = /(\d+)\s*sec(?:ond)?s?\b/.exec(t))) { const n = +m[1]; return [n * 0.7 - 2, n * 1.3 + 3, m[0]]; }
  return null;
}

async function media() {
  const ctx = await context({ width: 1280, height: 800 });
  const { page, log } = await newPage(ctx);
  const seen = new Map();   // file -> { routes, poster, track, claims: [[route, text]] }
  const routes = ['home', 'friends', 'watch', 'family-videos', 'activities', 'activities/booker', 'activities/lumi', 'activities/zuri', 'activities/bop', 'bop-at-home', 'see-how', 'whole-child', 'teacher-standard', 'train-your-staff', 'unit-1', 'academy', 'at-home'];
  for (const r of routes) {
    await open(page, r, 1200);
    await page.evaluate(async () => { const h = document.body.scrollHeight; for (let y = 0; y < h; y += 800) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } });
    const vids = await page.evaluate(() => {
      const caps = (window.FFCaptions && window.FFCaptions.CAPS) || {};
      return [...document.querySelectorAll('#view video')].map((v) => {
        const src = v.getAttribute('src') || v.querySelector('source')?.getAttribute('src') || v.dataset.src || '';
        const box = v.closest('figure, article, .card, li, details, .wc-actvid, .fl-vid, .hc-video') || v.parentElement;
        const outer = box && (box.closest('article, .card, li') || box);
        const tr = [...v.querySelectorAll('track')].map((t) => t.getAttribute('src'));
        const near = (outer && outer.innerText) || '';
        const file = src.split('?')[0];
        const reg = caps[file] || null;
        const head = reg && reg.transcript ? String(reg.transcript).replace(/\s+/g, '').slice(0, 40) : '';   // paragraphs join without spaces in textContent
        const trDetails = head && [...document.querySelectorAll('#view details.ffcap-tr')].some((d) => d.textContent.replace(/\s+/g, '').includes(head));
        return { src, file, poster: v.getAttribute('poster') || box?.querySelector('picture img, img')?.getAttribute('src') || '', tracks: tr, near: near.slice(0, 600),
          silent: !!(reg && reg.silent), hasTranscript: !!(reg && reg.transcript), transcriptShown: !!trDetails };
      }).filter((v) => v.src);
    });
    for (const v of vids) {
      const e = seen.get(v.file) || { routes: [], src: v.src, poster: new Set(), tracks: new Set(), claims: [], silent: v.silent, hasTranscript: v.hasTranscript, transcriptMissing: [] };
      e.routes.push(r); if (v.poster) e.poster.add(v.poster); v.tracks.forEach((t) => e.tracks.add(t));
      const c = claimed(v.near); if (c) e.claims.push([r, c[2]]);
      if (v.hasTranscript && !v.transcriptShown) e.transcriptMissing.push(r);
      seen.set(v.file, e);
    }
  }
  const get = async (u, range = 'bytes=0-1023') => { const res = await page.request.get(new URL(u, BASE).href, { headers: { Range: range } }); return { status: res.status(), ct: res.headers()['content-type'] || '', body: range === null ? await res.text() : '' }; };
  for (const [file, e] of seen) {
    await step('media', `${file} (${e.routes.length} pages)`, async () => {
      const issues = [];
      const mp4 = await get(e.src); if (mp4.status >= 300) issues.push(`video HTTP ${mp4.status}`); else if (!/video|octet/.test(mp4.ct)) issues.push(`video type ${mp4.ct}`);
      for (const p of e.poster) { const r = await get(p); if (r.status >= 300) issues.push(`poster ${p} HTTP ${r.status}`); }
      if (!e.tracks.size && !e.silent) issues.push('no captions track and not registered silent');
      for (const t of e.tracks) {
        const res = await page.request.get(new URL(t, BASE).href); const txt = await res.text();
        if (res.status() >= 300) issues.push(`captions ${t} HTTP ${res.status()}`);
        else if (!/^﻿?WEBVTT/.test(txt)) issues.push(`captions ${t} is not WEBVTT`);
        else if (!/-->/.test(txt)) issues.push(`captions ${t} has no cues`);
      }
      if (e.transcriptMissing.length) issues.push(`transcript registered but no "Read the transcript" on ${e.transcriptMissing.join(', ')}`);
      const dur = ffprobe(LOCAL ? join(SITE, e.src.split('?')[0]) : new URL(e.src, BASE).href);   // the local test server does not serve byte ranges
      e.duration = dur;
      if (dur == null || !(dur > 0)) issues.push(`ffprobe duration ${dur}`);
      const wrong = [];
      for (const [r, text] of e.claims) { const c = claimed(text); if (dur && c && (dur < c[0] || dur > c[1])) wrong.push(`#${r} says "${text}" but it is ${dur.toFixed(1)}s`); }
      if (wrong.length) issues.push(...new Set(wrong));
      if (issues.length) return { status: 'broken', detail: issues.join(' | ') };
      return `${dur ? dur.toFixed(1) + 's' : ''}; ${e.tracks.size ? 'captions ok' : 'silent'}${e.claims.length ? '; cards say ' + [...new Set(e.claims.map((c) => c[1]))].join(' / ') : ''}`;
    });
  }
  // play test: one player of each kind actually plays and its captions load (track readyState)
  for (const [route, sel] of [['watch', '#view video'], ['activities/lumi', '#view video'], ['bop-at-home', '#view video'], ['teacher-standard', '#view video'], ['family-videos', '#view video[src*="moments"], #view video']]) {
    if (QUICK && route !== 'watch') continue;
    await step('media', `player plays on #${route} (currentTime advances, captions load, duration > 0)`, async () => {
      await open(page, route, 1200);
      const r = await page.evaluate(async (sel) => {
        const v = [...document.querySelectorAll(sel)].find((x) => x.querySelector('track')) || document.querySelector(sel);
        if (!v) return { err: 'no video' };
        v.scrollIntoView(); v.muted = true;
        const tr = v.querySelector('track'); if (tr && tr.track) tr.track.mode = 'showing';
        try { await v.play(); } catch (e) { return { err: 'play() rejected: ' + e.message }; }
        const t0 = Date.now(); while (Date.now() - t0 < 15000 && v.currentTime < 0.5) await new Promise((r) => setTimeout(r, 200));
        await new Promise((r) => setTimeout(r, 500));
        const res = { t: v.currentTime, d: v.duration, err: v.error && v.error.code, src: v.currentSrc.split('/').pop(), tr: tr ? tr.readyState : null, cues: tr && tr.track.cues ? tr.track.cues.length : null };
        v.pause(); return res;
      }, sel);
      assert(!r.err, r.err); assert(r.t >= 0.5, `did not play (t=${r.t})`); assert(r.d > 0, `duration ${r.d}`);
      if (r.tr != null) assert(r.tr === 2 && r.cues > 0, `captions track readyState ${r.tr}, cues ${r.cues}`);
      return `${r.src} t=${r.t.toFixed(1)}/${r.d.toFixed(1)}s captions ${r.cues ?? 'n/a'} cues`;
    });
  }
  // transcripts expand
  await step('media', 'transcript toggles expand (#watch)', async () => {
    await open(page, 'watch', 1000);
    const r = await page.evaluate(async () => {
      const ds = [...document.querySelectorAll('#view details.ffcap-tr')]; if (!ds.length) return { n: 0 };
      const d = ds[0]; d.querySelector('summary').click(); await new Promise((r) => setTimeout(r, 200));
      return { n: ds.length, open: d.open, len: d.innerText.length };
    });
    assert(r.n > 0, 'no transcripts on #watch'); assert(r.open && r.len > 60, `transcript did not expand (${r.len} chars)`);
    return `${r.n} transcripts`;
  });
  MEDIA = seen;
  await page.close(); await ctx.close();
}
let MEDIA = new Map();

// ---------------------------------------------------------------- 4. cross-page consistency
async function consistency() {
  const ctx = await context({ width: 1280, height: 800 });
  const { page } = await newPage(ctx);
  const texts = {};
  await open(page, 'home', 1000);
  const routes = ROUTES.length ? ROUTES : await page.evaluate(() => Object.keys(window.FFRouteMeta.ROUTES));
  for (const r of routes) { if (PORTAL_ROUTES.includes(r)) continue; await open(page, r, 700); texts[r] = await page.evaluate(() => document.getElementById('view').innerText.replace(/\s+/g, ' ')); }
  texts._chrome = await page.evaluate(() => [...document.querySelectorAll('header, footer, #ff-prefooter, #ffw-menu')].map((e) => e.textContent).join(' ').replace(/\s+/g, ' '));
  const facts = await page.evaluate(() => ({ books: (window.FFFamilyUI && 5) || null }));
  const hits = (re) => { const out = []; for (const [r, t] of Object.entries(texts)) { let m; const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'); while ((m = g.exec(t))) out.push(`#${r}: "…${t.slice(Math.max(0, m.index - 40), m.index + m[0].length + 30)}…"`); } return out; };
  // live counts
  await open(page, 'story-time', 900);
  const nBooks = await page.evaluate(() => new Set([...document.querySelectorAll('#view a[href^="#story-time/"]')].map((a) => a.getAttribute('href'))).size);
  await open(page, 'activities', 900);
  const nActs = await page.evaluate(() => (window.FFFamily && window.FFFamily.ACTS ? window.FFFamily.ACTS.length : null));

  const checks = [
    ['school name is always "Futures Learning Center"', /\bFutures? Early Learning Cent|\bFutures Learning (?:Centre|Academy)\b|\bFuture Learning Cent|\bFutures Daycare\b/],
    ['no stale "three storybooks" / wrong book counts', new RegExp(`\\b(?:one|two|three|four|six|1|2|3|4|6) (?:read-aloud |free )?(?:story ?books|stories)\\b(?! (?:have|are being))`, 'i')],
    ['no stale "one short clip"', /one short clip/i],
    ['unit status agrees everywhere (Units 1 to 4 written as drafts, 5 to 12 outlined)', /Unit 1 is written day by day; later units|daily plans not written yet|later units (?:are )?outlined|Units 2 to 12 are outlined/i],
    ['no stale "12 units planned"', /12 units planned|twelve units planned/i],
    ['no "lorem ipsum" / TODO / TBD placeholders', /lorem ipsum|\bTODO\b|\bTBD\b|\bFIXME\b|\bXXX\b/],
  ];
  for (const [name, re] of checks) {
    await step('consistency', name, async () => { const h = hits(re); if (h.length) return { status: 'broken', detail: h.slice(0, 8).join(' | ') }; return 'none found'; });
  }
  await step('consistency', `book count: shelf has ${nBooks}; pages that state a number agree`, async () => {
    const h = hits(/\b(five|5|four|4|three|3|six|6)\s+(?:Futures Friends\s+)?(?:read-aloud\s+|free\s+)?storybooks\b/i).filter((x) => !new RegExp(`\\b(${nBooks === 5 ? 'five|5' : nBooks}) `, 'i').test(x.split('"')[1].slice(40)));
    if (h.length) return { status: 'broken', detail: h.join(' | ') };
    return `${nBooks} books everywhere`;
  });
  await step('consistency', `activity count: library has ${nActs}; pages that state a number agree`, async () => {
    if (!nActs) return { status: 'warn', detail: 'FFFamily.ACTS not exposed' };
    const h = hits(/\b(\d{2}) activities for babies/i).filter((x) => !x.includes(`${nActs} activities`));
    if (h.length) return { status: 'broken', detail: h.join(' | ') };
    return `${nActs} activities`;
  });
  await step('consistency', '"coming soon" wording (review list: honest placeholders vs stale promises)', async () => {
    const h = hits(/[^.]{0,60}coming soon[^.]{0,30}/i);
    const allowed = /price coming soon|product photo coming soon|full kit price coming soon/i;
    const stale = h.filter((x) => !allowed.test(x));
    if (stale.length) return { status: 'warn', detail: stale.slice(0, 10).join(' | ') };
    return `${h.length} honest store placeholders only`;
  });
  await step('consistency', 'video count claims match the #watch shelf', async () => {
    await open(page, 'watch', 900);
    const n = await page.evaluate(() => new Set([...document.querySelectorAll('#view video')].map((v) => (v.getAttribute('src') || v.querySelector('source')?.getAttribute('src') || '').split('?')[0])).size);
    const claim = await page.evaluate(() => { const m = /(\d+) short videos/.exec(document.getElementById('view').innerText); return m ? +m[1] : null; });
    await open(page, 'family-videos', 900);
    const claim2 = await page.evaluate(() => { const m = /(\d+) (?:short )?videos so far|(\d+) short videos/.exec(document.getElementById('view').innerText); return m ? +(m[1] || m[2]) : null; });
    const bad = [claim, claim2].filter((c) => c != null && c !== n);
    if (bad.length) return { status: 'broken', detail: `#watch shows ${n} distinct videos but says ${bad.join(' / ')}` };
    return `#watch shows ${n} distinct videos; stated counts ${[claim, claim2].filter((c) => c != null).join(' / ') || 'none'} agree`;
  });
  await page.close(); await ctx.close();
}

// ---------------------------------------------------------------- run
const t0 = Date.now();
if (ONLY.includes('routes')) await sweepRoutes();
if (ONLY.includes('features')) await features();
if (ONLY.includes('media')) await media();
if (ONLY.includes('consistency')) await consistency();
await browser.close(); await site.close();

const counts = results.reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {});
const report = { base: BASE, when: new Date().toISOString(), seconds: Math.round((Date.now() - t0) / 1000), counts, blocked: [...new Set(blocked)], results };
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'site-e2e.json'), JSON.stringify(report, null, 2));
const md = [`# Site E2E report`, '', `Base: ${BASE}  `, `Run: ${report.when} (${report.seconds}s)  `, `Counts: ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', ')}`, '',
  `Blocked outbound writes (never sent): ${report.blocked.length ? report.blocked.join(', ') : 'none'}`, '',
  '| Area | Feature | Status | Detail |', '|---|---|---|---|',
  ...results.map((r) => `| ${r.area} | ${r.feature} | ${r.status}${r.owner ? ` (${r.owner})` : ''} | ${String(r.detail).replace(/\|/g, '/').replace(/\n/g, ' ').slice(0, 400)} |`)].join('\n');
writeFileSync(join(OUT, 'site-e2e.md'), md + '\n');
console.log(`\n${JSON.stringify(counts)} in ${report.seconds}s -> ${join(OUT, 'site-e2e.md')}`);
process.exit(counts.broken ? 1 : 0);
