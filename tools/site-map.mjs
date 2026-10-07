#!/usr/bin/env node
// Site map + link audit (owner 2026-10-07: "look at ALL the buttons and make sure they go to their proper places and map everything
// out"). Serves this folder, drives headless Chromium through every route, and writes docs/site-map.json:
//   { pages: [{ route, title, section, sections: [{ id, title }], media: [{ type, src, label }] }],
//     links: [{ from_route, from_section, label, kind, to_route, to_section, status, note }] }
// kind: nav | button | card | chip | footer | hero.  status: ok | fixed | broken | pending.
// The header, the full-screen menu, the footer and the friends' strip above it are on every page: they are listed once, under
// from_route "home" with from_section "site-header" / "site-menu" / "site-footer" / "footer-friends".
// Usage: node tools/site-map.mjs [--out docs/site-map.json] [--base http://127.0.0.1:port/] [--check]
//   --check: write nothing, exit 1 when any link is broken (what tests/site-map.test.js runs).
// Needs playwright-core (see tests/a11y-harness.mjs: HUB_DIR). Sends nothing anywhere; reads only this site.
import { writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadChromium, startSite, SITE } from '../tests/a11y-harness.mjs';

const argv = process.argv.slice(2);
const opt = k => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const CHECK = argv.includes('--check');
const OUT = opt('--out') || join(SITE, 'docs/site-map.json');

// Every link this audit changed: [from_route, label (exact visible text), old target, note]. A link found with one of these labels
// is marked "fixed" (when it is otherwise ok) so the visual graph can show what moved.
export const FIXED = [
  ['home', 'Meet the friends', '#friends', 'Hero button with a play icon: now lands on the talking intro (each friend introduces themself) and starts it.'],
  ['friends', "Read Booker's book", '#friends (same page)', 'Opens Booker Tries Again in the Story Time reader.'],
  ['friends', "Read Lumi's book", '#friends (same page)', 'Opens Big Feelings, Brighter Days in the Story Time reader.'],
  ['friends', "Read Zuri's book", '#friends (same page)', 'Opens What Happens If We Try? in the Story Time reader.'],
  ['friends', "Read Bop's book", '#friends (same page)', 'Opens the Clean Up, Team! preview (full read-along waits on the revised text).'],
  ['friends', 'Read Booker Tries Again in Story Time', 'img/booker-tries-again-preview.png (raw image, new tab)', 'The cover opens the reader.'],
  ['at-home', 'Watch What there is to watch today', '#family-videos with one placeholder clip', 'The shelf now holds the friends\' talking hello and Bop\'s move-along (captioned), and points to Bop at Home.'],
  ['home', '21 story-world characters', '#friends (page top)', 'Lands on Meet the whole town (#ff-town-h).'],
  ['friends', 'Read three of the stories free in Story Time', '#story-time (page top)', 'Lands on the bookshelf (#fl-shelf), the three free books highlighted.']
];
// Words a visitor reads as a promise, and what the target must then be. Checked against every internal link.
const PROMISES = [
  { re: /^read (the book|\w+'s book|it together|booker tries again.*|big feelings.*|what happens if we try.*)$/i, ok: l => l.to_route === 'story-time' && !!l.arg, want: 'a book open in the Story Time reader (#story-time/<book>)' },
  { re: /^(▶\s*)?meet the friends$/i, ok: l => (l.to_route === 'home' && /intro/.test(l.to_section || '')) || l.to_route === 'friends', want: 'the friends\' talking intro video or the friends page' },
  { re: /^watch\b/i, ok: (l, pages) => (pages.get(l.to_route)?.media || []).some(m => m.type === 'video'), want: 'a page with a video on it' },
  { re: /bop at home|move with bop|move along/i, ok: (l, pages) => (pages.get(l.to_route)?.media || []).some(m => m.type === 'video') || l.to_route === 'bop-at-home', want: 'Bop\'s movement videos' }
];

const site = opt('--base') ? { base: opt('--base'), close: async () => {} } : await startSite();
const browser = await loadChromium().launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' });
const page = await ctx.newPage();
const pageErrors = new Map();
let curRoute = '';
page.on('pageerror', e => { const a = pageErrors.get(curRoute) || []; a.push(e.message); pageErrors.set(curRoute, a); });

async function open(key, settle = 350) {
  curRoute = key;
  await page.goto(`${site.base}?fresh=${Date.now()}#${key}`);
  await page.waitForFunction(() => document.querySelector('#view') && document.querySelector('#view').children.length > 0, null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(settle);
}

// ---- 1. the routes: every view registered on V that has a title in route-meta.js, plus any other registered public view
await open('home', 600);
const routes = await page.evaluate(() => {
  const meta = (window.FFRouteMeta && (window.FFRouteMeta.R || window.FFRouteMeta.map)) || {};
  const skip = new Set(['bad', 'busy', 'confirm', 'date', 'kid', 'msg']);   // internal pieces registered on V, not pages
  const all = Object.keys(V).filter(k => typeof V[k] === 'function' && !skip.has(k));
  return { all, meta: Object.keys(meta) };
});
const ROUTES = [...new Set(['home', ...routes.all])].filter(r => r !== 'not-found');

// ---- 2. per page: title, sections, media and every clickable
const COLLECT = () => {
  const words = el => { const out = []; const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement && n.parentElement.closest('[aria-hidden="true"]') && !el.matches('[aria-hidden="true"] *') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT }); while (w.nextNode()) { const t = w.currentNode.nodeValue.trim(); if (t) out.push(t); } return out.join(' ').replace(/\s*→\s*$/, ''); };
  const txt = el => (el.getAttribute('aria-label') || words(el) || [...el.querySelectorAll('img[alt]')].map(i => i.alt).join(' ') || el.getAttribute('title') || '').replace(/\s+/g, ' ').trim();
  const sectionOf = el => {
    const s = el.closest('section[id], [data-section], section[aria-labelledby], article[id]');
    if (!s) return '';
    if (s.id) return s.id;
    if (s.dataset.section) return s.dataset.section;
    return s.getAttribute('aria-labelledby') || '';
  };
  const region = el => el.closest('body > header') ? 'site-header' : el.closest('body > footer') ? 'site-footer' : el.closest('.ffw-menu, dialog.ffw-m, [data-ffw-menu]') ? 'site-menu' : el.closest('.ffs-strip, .ff-footscene, [class*="footer-scene"], [class*="fsc-"]') ? 'footer-friends' : el.closest('#view') ? 'view' : 'other';
  const kindOf = (el, reg) => {
    if (reg === 'site-header' || reg === 'site-menu') return 'nav';
    if (reg === 'site-footer' || reg === 'footer-friends') return 'footer';
    if (el.closest('.px-homehero, .phero, [class*="hero"]') && reg === 'view') return 'hero';
    if (el.matches('[data-anchor], .chip, [class*="chip"], .anchors button')) return 'chip';
    if (el.closest('li[class*="card"], article, .card, [class*="tile"], [class*="door"], .friend, [class*="card"]')) return 'card';
    return el.tagName === 'A' && !/btn/.test(el.className) ? 'nav' : 'button';
  };
  const out = [];
  const els = document.querySelectorAll('a[href], button, [role="button"], [data-go]');
  for (const el of els) {
    const reg = region(el);
    if (reg === 'other') continue;
    const href = el.getAttribute('href');
    const rec = { label: txt(el).slice(0, 120), kind: kindOf(el, reg), region: reg, section: reg === 'view' ? sectionOf(el) : reg,
      href: href || null, go: el.dataset.go || null, anchor: el.dataset.anchor || null, reveal: el.dataset.reveal || null, post: el.dataset.post || null,
      tag: el.tagName.toLowerCase(), data: Object.keys(el.dataset).filter(k => !/^(ffw|wired)/.test(k)).join(','), target: el.getAttribute('target') || '' };
    out.push(rec);
  }
  const v = document.querySelector('#view');
  const sections = [...v.querySelectorAll('section, [data-section]')].map(s => {
    const h = s.querySelector('h1, h2'); const id = s.id || s.dataset.section || (h && h.id) || '';
    return id ? { id, title: h ? h.textContent.replace(/\s+/g, ' ').trim().slice(0, 120) : (s.getAttribute('aria-label') || '') } : null;
  }).filter(Boolean).filter((s, i, a) => a.findIndex(x => x.id === s.id) === i);
  const media = [];
  for (const m of v.querySelectorAll('video, audio')) {
    const src = m.currentSrc || m.getAttribute('src') || (m.querySelector('source') && m.querySelector('source').getAttribute('src')) || '';
    const f = m.closest('[data-video]');
    const HV = window.FFHomeCalm && window.FFHomeCalm.VIDEOS && f ? window.FFHomeCalm.VIDEOS[f.dataset.video] : null;
    media.push({ type: m.tagName.toLowerCase(), src: (src || (HV && ((HV.wide || HV.tall).mp4)) || '').replace(location.origin + '/', '').replace(/^\//, ''), label: m.getAttribute('aria-label') || (HV && HV.label) || (m.closest('figure') && m.closest('figure').querySelector('figcaption') ? m.closest('figure').querySelector('figcaption').textContent.trim().slice(0, 100) : '') });
  }
  for (const a of v.querySelectorAll('a[href^="#story-time/"]')) {
    const id = a.getAttribute('href').split('/')[1]; const B = window.FFFamily && window.FFFamily.BOOKS.find(b => b.id === id);
    if (B && !media.some(m => m.type === 'book' && m.src === '#story-time/' + id)) media.push({ type: 'book', src: '#story-time/' + id, label: B.title + (B.status === 'full' ? '' : ' (preview)') });
  }
  if (location.hash.startsWith('#story-time/') && v.querySelector('h1')) media.push({ type: 'book', src: location.hash, label: v.querySelector('h1').textContent.trim() });
  const imgs = [...v.querySelectorAll('img')].length;
  return { links: out, sections, media, title: document.title, h1: (v.querySelector('h1') || {}).textContent ? v.querySelector('h1').textContent.replace(/\s+/g, ' ').trim() : '', imgs };
};

const pages = new Map();
const raw = [];
for (const r of ROUTES) {
  await open(r);
  const d = await page.evaluate(COLLECT);
  // the full-screen menu: its links only exist in its dialog; open it once (home), read it, close it
  if (r === 'home') {
    const menu = await page.evaluate(() => { const W = window.FFWay; if (!W || !W.menu) return []; try { W.openMenu(); } catch (e) { /* closed menu still holds its links */ } const m = W.menu(); if (!m) return []; setTimeout(() => { try { W.closeMenu({ animate: false }); } catch (e) { /* already closed */ } }, 0); return [...m.querySelectorAll('a[href]')].map(a => ({ label: (a.getAttribute('aria-label') || a.textContent).replace(/\s+/g, ' ').trim().slice(0, 120), kind: 'nav', region: 'site-menu', section: 'site-menu', href: a.getAttribute('href'), go: null, anchor: null, reveal: a.dataset.reveal || null, tag: 'a', data: '' })); });
    d.links.push(...menu);
  }
  pages.set(r, { route: r, title: d.title.replace(/ \| Futures Friends$/, ''), section: d.h1, sections: d.sections, media: d.media });
  for (const l of d.links) if (r === 'home' || l.region === 'view') raw.push({ from: r, ...l });
}

// ---- 3. resolve each link's target and check it
const ROUTESET = new Set(ROUTES);
const split = h => { const p = String(h).replace(/^#/, '').split('/'); let a = ''; try { a = decodeURIComponent(p[1] || ''); } catch { a = p[1] || ''; } return { route: p[0] || 'home', arg: a }; };
const targetCache = new Map();
async function probe(route, arg, reveal) {
  const key = route + (arg ? '/' + arg : '') + (reveal ? ' ' + reveal : '');
  if (targetCache.has(key)) return targetCache.get(key);
  let res;
  if (!ROUTESET.has(route)) res = { ok: false, why: `no page called #${route}` };
  else {
    await open(route + (arg ? '/' + encodeURIComponent(arg) : ''), 250);
    res = await page.evaluate(({ arg, reveal }) => {
      const v = document.querySelector('#view');
      if (/Page not found/.test(document.title)) return { ok: false, why: 'lands on Page not found' };
      if (!v || !v.textContent.trim()) return { ok: false, why: 'blank page' };
      if (reveal && !v.querySelector(reveal)) return { ok: false, why: `section ${reveal} missing` };
      return { ok: true, h1: (v.querySelector('h1') || {}).textContent || '' };
    }, { arg, reveal });
    if (res.ok && arg) {   // the argument must change the page (a detail view), or be a section on it
      const base = targetCache.get('__h1 ' + route) ?? await (async () => { await open(route, 200); const h = await page.evaluate(() => (document.querySelector('#view h1') || {}).textContent || ''); targetCache.set('__h1 ' + route, h); return h; })();
      if (res.h1 === base && route !== 'talk' && route !== 'post' && route !== 'job') res = { ok: true, weak: `#${route}/${arg} shows the same page as #${route}` };
    }
  }
  targetCache.set(key, res);
  return res;
}

const links = [];
const seen = new Set();
for (const l of raw) {
  let to = null, toSection = '', note = '', status = 'ok';
  if (l.href && /^(https?:|mailto:|tel:)/.test(l.href)) continue;             // outside the site: not part of the map
  if (l.href === '#view' || l.href === '#') continue;                           // the skip link
  if (l.go) { const s = split(l.go); to = s.route; toSection = s.arg; }
  else if (l.post) { to = 'post'; toSection = l.post; }
  else if (l.anchor) { to = l.from; toSection = l.anchor; }
  else if (l.href && l.href.startsWith('#')) { const s = split(l.href); to = s.route; toSection = s.arg; }
  else if (l.href) {                                                            // a file on this site (printable, image)
    to = l.href.split('?')[0]; const ok = existsSync(join(SITE, decodeURIComponent(to)));
    status = ok ? 'ok' : 'broken'; note = ok ? 'file' : 'file missing';
  } else continue;                                                              // a control (toggle, play, tab): not a link
  const arg = l.anchor || (l.href && !l.href.startsWith('#')) ? '' : toSection;
  if (l.reveal) toSection = (toSection ? toSection + ' ' : '') + l.reveal.replace(/^\[data-video=(\w+)\]$/, 'video:$1');
  const rec = { from_route: l.from, from_section: l.section || '', label: l.label, kind: l.kind, to_route: to, to_section: toSection, status, note };
  const k = [rec.from_route, rec.from_section, rec.label, rec.to_route, rec.to_section].join('|');
  if (seen.has(k)) continue;
  seen.add(k);
  rec.arg = arg;
  rec.reveal = l.reveal;
  links.push(rec);
}
for (const l of links) {
  if (l.note === 'file' || l.note === 'file missing') continue;
  if (l.from_route === l.to_route && l.to_section && !l.arg && !l.reveal) {      // an in-page chip: the id must exist
    await open(l.from_route, 200);
    const ok = await page.evaluate(id => !!document.getElementById(id), l.to_section);
    if (!ok) { l.status = 'broken'; l.note = `#${l.to_section} not on the page`; }
    continue;
  }
  const r = await probe(l.to_route, l.arg, l.reveal);
  if (!r.ok) { l.status = 'broken'; l.note = r.why; }
  else if (r.weak) l.note = r.weak;
  if (l.status === 'ok' && l.from_route === l.to_route && !l.arg && !l.reveal && l.from_section !== 'site-header' && l.from_section !== 'site-menu' && l.from_section !== 'site-footer' && l.kind !== 'footer') { l.note = (l.note ? l.note + '; ' : '') + 'links to the page it is on'; }
}
for (const l of links) {
  for (const p of PROMISES) if (p.re.test(l.label) && l.status === 'ok' && !p.ok(l, pages)) { l.status = 'broken'; l.note = `label promises ${p.want}`; }
  const f = FIXED.find(([r, label]) => r === l.from_route && (label === l.label || l.label.startsWith(label + ' ')));
  if (f && l.status === 'ok') { l.status = 'fixed'; l.note = `was ${f[2]}. ${f[3]}`; }
  delete l.arg; delete l.reveal;
}
const errs = [...pageErrors.entries()].filter(([, a]) => a.length);
const map = { generated: new Date().toISOString().slice(0, 10), tool: 'tools/site-map.mjs', pages: [...pages.values()], links, page_errors: Object.fromEntries(errs) };

await ctx.close(); await browser.close(); await site.close();
const broken = links.filter(l => l.status === 'broken');
if (!CHECK) { writeFileSync(OUT, JSON.stringify(map, null, 1) + '\n'); console.log(`wrote ${OUT}: ${map.pages.length} pages, ${links.length} links, ${broken.length} broken, ${links.filter(l => l.status === 'fixed').length} fixed`); }
for (const b of broken) console.log(`BROKEN ${b.from_route} [${b.from_section}] "${b.label}" -> #${b.to_route}${b.to_section ? '/' + b.to_section : ''}: ${b.note}`);
if (CHECK) { console.log(JSON.stringify({ pages: map.pages.length, links: links.length, broken: broken.length })); process.exit(broken.length ? 1 : 0); }
