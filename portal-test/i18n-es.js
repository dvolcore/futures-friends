// The Spanish catalog for the hub pages (owner request 2026-10-10: bilingual for every role). Loaded by app.js only when the person
// reads the hub in Spanish. Keys are the ENGLISH text exactly as the page shows it (gettext style: no key names to keep in step),
// with {0}, {1}... where the page inserts a name, a number or a date. Every value is a DRAFT translation pending review by the
// center's native-speaking Spanish teacher (glossary: FUTURES_FRIENDS_PROJECT/09_Training_and_Curriculum/bilingual/GLOSSARY_ES.md;
// register "usted" for adults; names such as Futures Hub, Futures Friends, Booker, Lumi, Zuri, Bop are never translated).
// The pages show the glossary label "Traducción en borrador, pendiente de revisión" under every Spanish view.
//
//   translateText('3 children here')          -> '3 niños presentes'     (exact key, then {n} patterns, then " · " / ": " pieces)
//   tr('Saved.')                               -> 'Guardado.' when Spanish is on, the English otherwise (for confirm(), titles...)
//   installDomTranslator(document.body, getLang) keeps every text node, placeholder, title, aria-label and alt in Spanish as the
//                                              views render (MutationObserver). Never touches: [translate="no"] (people's own words:
//                                              messages, notes, names), textarea, input values, contenteditable, script/style/code.
//
// Data: ./i18n-es-ui.js (the page text, by view) and ./i18n-es-sql.js (messages the database raises; friendly() shows them).
// hub/scripts/i18n-audit.mjs counts a page string as bilingual when it is a key here; tests/i18n.test.mjs checks the placeholders.
import UI from './i18n-es-ui.js';
import SQL from './i18n-es-sql.js';

export const CATALOG = Object.freeze({ ...SQL, ...UI });
export const DRAFT_LABEL = 'Traducción en borrador, pendiente de revisión';

const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const EXACT = new Map();
const PATTERNS = [];
const PATTERN_KEYS = new Set();
for (const [en, es] of Object.entries(CATALOG)) {
  const k = norm(en);
  if (!k || typeof es !== 'string') continue;
  if (/\{\d+\}/.test(k)) {
    PATTERN_KEYS.add(k);
    const parts = k.split(/(\{\d+\})/).filter((p) => p !== '');
    const lits = parts.filter((p) => !/^\{\d+\}$/.test(p));
    const litLen = lits.join('').replace(/[^A-Za-z]/g, '').length;
    if (litLen < 2) continue;                       // "{0} {1}" says nothing: never used to rewrite a screen
    const order = parts.filter((p) => /^\{\d+\}$/.test(p)).map((p) => Number(p.slice(1, -1)));
    // a space next to a hole is optional: "… done. {0}" also matches the line when the hole is a button and the text ends at "done."
    const re = new RegExp(`^${parts.map((p, i) => {
      if (/^\{\d+\}$/.test(p)) return '(.*?)';
      let r = reEsc(p);
      if (i > 0 && p.startsWith(' ')) r = ` ?${reEsc(p.slice(1))}`;
      if (i < parts.length - 1 && p.endsWith(' ')) r = `${r.slice(0, -1)} ?`;
      return r;
    }).join('')}$`);
    const longest = lits.slice().sort((a, b) => b.length - a.length)[0].trim();
    PATTERNS.push({ re, es, order, lit: longest, weight: litLen, litChars: lits.join('').length });
  } else EXACT.set(k, es);
}
PATTERNS.sort((a, b) => b.weight - a.weight);

// The audit and tests ask: is this English text (normalized, {0}-style holes) a catalog key?
export function catalogHas(s) { const k = norm(s); return EXACT.has(k) || PATTERN_KEYS.has(k); }

const cache = new Map();
function lookup(k, depth = 0) {
  if (EXACT.has(k)) return EXACT.get(k);
  // "Saved" vs "Saved." vs "Saved:": the same words with or without the closing mark
  const bare = k.replace(/[.:!?…]+$/, '');
  if (bare !== k && EXACT.has(bare)) return EXACT.get(bare) + k.slice(bare.length);
  if (depth > 1) return null;
  for (const p of PATTERNS) {
    if (p.lit && !k.includes(p.lit)) continue;
    const m = p.re.exec(k);
    if (!m || !fits(p, m, k)) continue;
    return p.es.replace(/\{(\d+)\}/g, (_, i) => {
      const at = p.order.indexOf(Number(i));
      const v = at < 0 ? '' : m[at + 1];
      return translatePiece(v, depth + 1) ?? v;   // "Care alerts: Allergy" -> both halves
    });
  }
  return null;
}
// A pattern rewrites a line only when it is clearly that line: its own words are most of the text, or what fills the holes looks like
// a value (a number, a name, a date, a short label). "{0} the {1}" must never rewrite a paragraph that happens to contain " the ".
const VALUE = /^[\s\d.,:%$#/+×–—()-]*$/;
function fits(p, m, k) {
  const caps = m.slice(1);
  if (p.weight < 3 && !caps.every((c) => VALUE.test(c) || /^\d/.test(c))) return false;
  if (p.litChars / k.length >= 0.45) return true;
  return caps.every((c) => VALUE.test(c) || (c.length <= 80 && c.split(/\s+/).length <= 10 && !/[.;!?]\s/.test(c)));
}
// A piece of a longer line ("Allergy" in "Allergy · severe", a hole's value): the exact text, or a pattern that is most of the piece;
// "Seats filled (3/3)" keeps its count and translates the words.
function translatePiece(v, depth) {
  const k = norm(v);
  if (!k || !/[A-Za-z]/.test(k)) return null;
  if (EXACT.has(k)) return EXACT.get(k);
  const paren = k.match(/^(.*\S) (\([^()]*\))$/);
  if (paren && EXACT.has(paren[1])) return `${EXACT.get(paren[1])} ${paren[2]}`;
  if (depth > 1) return null;
  for (const p of PATTERNS) {
    if (p.lit && !k.includes(p.lit)) continue;
    if (p.litChars / k.length < 0.5) continue;
    const m = p.re.exec(k);
    if (m && fits(p, m, k)) return lookup(k, depth);
  }
  return null;
}
const SEP = /( · | — | – | \| |: |; |, | \/ )/;
const STRONG = /( · | — | – | \| )/;
// English UI text -> Spanish, or null when the catalog does not know it.
export function translateKnown(s) {
  const k = norm(s);
  if (!k || !/[A-Za-z]/.test(k)) return null;
  if (cache.has(k)) return cache.get(k);
  let r = lookup(k);
  if (r == null && SEP.test(k)) {
    // a line built from several pieces ("Allergy · severe", "Room: Sunflowers"): translate the pieces the catalog knows, first by the
    // strong separators (" · ", " — "), then a piece that is still unknown by the weak ones (": ", ", ", "; ")
    let changed = false;
    const piece = (p, weak) => {
      if (/^( · | — | – | \| |: |; |, | \/ )$/.test(p)) return p;
      const t = translatePiece(p, 0);
      if (t != null) { changed = true; return t; }
      if (!weak && SEP.test(p)) return p.split(SEP).map((q) => piece(q, true)).join('');
      return p;
    };
    const out = (STRONG.test(k) ? k.split(STRONG) : [k]).map((p) => (STRONG.test(k) ? piece(p, false) : p.split(SEP).map((q) => piece(q, true)).join(''))).join('');
    if (changed) r = out;
  }
  if (cache.size > 5000) cache.clear();
  cache.set(k, r);
  return r;
}
// Keeps the text's own leading/trailing spaces (they separate it from the next element).
export function translateText(s) {
  const r = translateKnown(s);
  if (r == null) return s;
  const str = String(s);
  return (str.match(/^\s*/)[0]) + r + (str.match(/\s*$/)[0]);
}

// ---- the page --------------------------------------------------------------------------------------------------------------
let getLangFn = () => 'en';
export const tr = (s) => (getLangFn() === 'es' ? translateText(s) : s);

const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE', 'NOSCRIPT', 'svg', 'SVG']);
const written = new WeakMap();   // node -> the Spanish we wrote (so our own write never loops)
const original = new WeakMap();  // node -> the English it had (to put back when the person switches to English without a re-render)
function skipped(el) {
  for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
    if (SKIP_TAGS.has(e.tagName) || e.getAttribute('translate') === 'no' || e.isContentEditable || e.hasAttribute('data-i18n-skip')) return true;
    if (e.getAttribute('lang') === 'en' && e !== e.ownerDocument.documentElement) return true;   // English on purpose (a bilingual card's other side)
  }
  return false;
}
function doText(node) {
  const v = node.data;
  if (written.get(node) === v) return;
  const t = translateText(v);
  if (t !== v) { original.set(node, v); written.set(node, t); node.data = t; }
}
function doAttrs(el) {
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    if (!v) continue;
    const key = `${a}:${v}`;
    if (written.get(el) === key) continue;
    const t = translateText(v);
    if (t !== v) { written.set(el, `${a}:${t}`); el.setAttribute(a, t); }
  }
  if (el.tagName === 'INPUT' && (el.type === 'submit' || el.type === 'button') && el.value) {
    const t = translateText(el.value);
    if (t !== el.value) el.value = t;
  }
}
export function translateTree(root) {
  if (!root) return;
  if (root.nodeType === 3) { if (!skipped(root.parentElement)) doText(root); return; }
  if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
  if (root.nodeType === 1 && skipped(root)) return;
  const doc = root.ownerDocument || root;
  const w = doc.createTreeWalker(root, 1 | 4, {
    acceptNode(n) {
      if (n.nodeType === 1) {
        if (SKIP_TAGS.has(n.tagName) || n.getAttribute('translate') === 'no' || n.isContentEditable || n.hasAttribute('data-i18n-skip')
            || n.getAttribute('lang') === 'en') return 2;   // reject subtree
        doAttrs(n);
        return 3;   // skip the element itself, keep walking its children
      }
      return 1;
    },
  });
  if (root.nodeType === 1) doAttrs(root);
  for (let n = w.nextNode(); n; n = w.nextNode()) doText(n);
}
// Puts the English back on the nodes still on screen (the language switch re-renders anyway; this is for what stays, e.g. the header).
export function restoreTree(root) {
  const doc = root.ownerDocument || root;
  const w = doc.createTreeWalker(root, 4);
  for (let n = w.nextNode(); n; n = w.nextNode()) { const o = original.get(n); if (o != null && written.get(n) === n.data) { n.data = o; written.delete(n); } }
}
let observer = null;
let dialogsWrapped = false;
export function installDomTranslator(root, getLang) {
  getLangFn = getLang;
  if (!dialogsWrapped && typeof window !== 'undefined') {
    dialogsWrapped = true;
    for (const name of ['confirm', 'alert', 'prompt']) {
      const orig = window[name]?.bind(window);
      if (orig) window[name] = (msg, ...rest) => orig(typeof msg === 'string' ? tr(msg) : msg, ...rest);
    }
  }
  if (observer) return observer;
  observer = new MutationObserver((muts) => {
    if (getLangFn() !== 'es') return;
    for (const m of muts) {
      if (m.type === 'childList') m.addedNodes.forEach((n) => translateTree(n));
      else if (m.type === 'characterData') { if (!skipped(m.target.parentElement)) doText(m.target); }
      else if (m.type === 'attributes' && !skipped(m.target)) doAttrs(m.target);
    }
  });
  observer.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  if (getLangFn() === 'es') translateTree(root);
  return observer;
}
