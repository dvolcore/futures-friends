#!/usr/bin/env node
/* Lists the English strings on the family pages that the Spanish phrase table (i18n-es.js) does not cover yet.
   Usage: node tools/i18n-extract.js [--all] [--json out.json]
   It renders every family route (i18n.js FAMILY) in the test VM, plus index.html's header, footer and the entry gate, splits the HTML
   into text runs and aria-label/title/alt/placeholder values exactly as the browser pass sees them, and prints the ones with no entry.
   Book pages, activities and captions are excluded: they have their own Spanish data files. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { site, read, ROOT } = require('../tests/site-vm.js');

function i18nCtx() {
  const sb = { console, window: null, document: null, location: { search: '', hash: '' } };
  sb.window = sb; sb.globalThis = sb; const c = vm.createContext(sb);
  vm.runInContext(read('i18n.js'), c, { filename: 'i18n.js' });
  for (const f of ['i18n-es.js', 'i18n-es-2.js', 'i18n-es-3.js', 'i18n-es-4.js', 'i18n-es-5.js']) if (fs.existsSync(path.join(ROOT, f))) vm.runInContext(read(f), c, { filename: f });
  return c.FFi18n;
}
const dec = s => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&middot;/g, '·').replace(/&rarr;/g, '→').replace(/&larr;/g, '←').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&minus;/g, '−').replace(/&hellip;/g, '…')
  .replace(/&ldquo;/g, '“').replace(/&rdquo;/g, '”').replace(/&lsquo;/g, '‘').replace(/&rsquo;/g, '’').replace(/&times;/g, '×').replace(/&copy;/g, '©').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n));
// Text runs and attributes, skipping script/style/svg and anything marked data-i18n-skip / translate="no" / lang="es".
function segments(html) {
  const out = []; const stack = [];
  const re = /<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>|([^<]+)/g; let m;
  const VOID = new Set(['img', 'input', 'br', 'hr', 'meta', 'link', 'source', 'track', 'col', 'area', 'wbr', 'use', 'path', 'circle', 'rect']);
  const skipping = () => stack.some(x => x.skip);
  while ((m = re.exec(html))) {
    if (m[5] != null) { if (!skipping()) { const t = dec(m[5]).replace(/\s+/g, ' ').trim(); if (t && /[A-Za-z]/.test(t)) out.push(t); } continue; }
    const [, close, tag, attrs, self] = m; const tg = tag.toLowerCase();
    if (close) { for (let i = stack.length - 1; i >= 0; i--) if (stack[i].tag === tg) { stack.length = i; break; } continue; }
    const skip = /^(script|style|svg|textarea|code|pre)$/.test(tg) || /\sdata-i18n-skip\b|\stranslate="no"|\slang="(?!en)[a-z]/.test(attrs);
    if (!skipping() && !skip) for (const a of ['aria-label', 'title', 'alt', 'placeholder']) { const am = new RegExp(`\\s${a}="([^"]*)"`).exec(attrs); if (am) { const t = dec(am[1]).replace(/\s+/g, ' ').trim(); if (t && /[A-Za-z]/.test(t)) out.push(t); } }
    if (!self && !VOID.has(tg)) stack.push({ tag: tg, skip });
  }
  return out;
}
function staticParts() {
  const html = read('index.html');
  const body = html.slice(html.indexOf('<body>'), html.indexOf('<main id="view"')) + html.slice(html.indexOf('</main>'), html.indexOf('<dialog'));
  const gate = /D\.createElement\('div'\)[\s\S]*?innerHTML\s*=\s*`([\s\S]*?)`/.exec(read('entry.js'));
  return segments(body).concat(gate ? segments(gate[1]) : segments(read('entry.js').split('innerHTML').slice(1).join(' ')));
}
function main() {
  const args = process.argv.slice(2);
  const I = i18nCtx();
  const ctx = site();
  for (const f of ['whole-child.js']) { try { vm.runInContext(read(f), ctx, { filename: f }); } catch (e) { /* optional page file */ } }
  const V = vm.runInContext('V', ctx); const routes = [...I.FAMILY].filter(r => typeof V[r] === 'function');
  const found = new Map(); // string -> Set(routes)
  const note = (s, r) => { if (!found.has(s)) found.set(s, new Set()); found.get(s).add(r); };
  for (const r of routes) {
    let html = '';
    try { html = ctx.render(r); } catch (e) { console.error('render failed', r, e.message); continue; }
    for (const s of segments(html)) note(s, r);
  }
  // Sub-pages that families reach: the activities by band and friend, the book shelf.
  for (const a of ['infant', 'toddler', 'twos', 'threes', 'prek', 'booker', 'lumi', 'zuri', 'bop']) { try { for (const s of segments(ctx.render('activities', a))) note(s, 'activities/' + a); } catch (_) {} }
  for (const s of staticParts()) note(s, 'chrome');
  // Strings that come from the library data are localized by family-library-es*.js, not by the phrase table.
  const dataStr = new Set(); const walk = v => { if (typeof v === 'string') dataStr.add(v.replace(/\s+/g, ' ').trim()); else if (v && typeof v === 'object') Object.values(v).forEach(walk); };
  walk(vm.runInContext('window.FFFamily', ctx));
  for (const k of [...found.keys()]) if (dataStr.has(k)) found.delete(k);
  const rows = [...found].map(([s, rs]) => ({ s, routes: [...rs], es: I.lookup(s, 'es') }));
  const missing = rows.filter(r => r.es == null);
  const ji = args.indexOf('--json'); if (ji > -1) fs.writeFileSync(args[ji + 1], JSON.stringify(args.includes('--all') ? rows : missing, null, 1));
  console.log(`family strings: ${rows.length}, translated: ${rows.length - missing.length}, missing: ${missing.length}`);
  return { rows, missing };
}
if (require.main === module) main();
module.exports = { segments, main };
