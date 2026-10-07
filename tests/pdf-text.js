'use strict';
// Minimal PDF reader for the print-kit tests (no dependencies): page sizes, embedded fonts and the text on each page.
// Page text comes back with whitespace removed (`compact`). Handles the PDFs Chromium writes: Flate streams, Type0/Identity-H (and simple) fonts with ToUnicode maps, text in the
// page content or in Form XObjects it draws. Not a general PDF parser.
const zlib = require('node:zlib');

function parse(buf) {
  const s = buf.toString('latin1'), objs = new Map();
  const re = /(\d+) 0 obj\b/g;
  let m;
  while ((m = re.exec(s))) {
    const start = m.index + m[0].length, end = s.indexOf('endobj', start);
    const body = s.slice(start, end), si = body.indexOf('stream');
    const dict = si >= 0 ? body.slice(0, si) : body;
    let data = null;
    if (si >= 0) {
      let a = start + si + 6;
      if (s[a] === '\r') a++;
      if (s[a] === '\n') a++;
      const raw = buf.subarray(a, s.indexOf('endstream', a));
      try { data = /\/FlateDecode/.test(dict) ? zlib.inflateSync(raw) : raw; } catch { data = raw; }
    }
    objs.set(+m[1], { dict, data });
    re.lastIndex = end;
  }
  return objs;
}

const ref = (dict, key) => { const m = dict.match(new RegExp('/' + key + '\\s+(\\d+) 0 R')); return m ? +m[1] : null; };
// "/Name << ... >>" (one level of nesting is enough for Chromium's resource dicts), or "/Name N 0 R" pointing at one
function subdict(objs, dict, key) {
  const i = dict.indexOf('/' + key);
  if (i < 0) return '';
  const rest = dict.slice(i + key.length + 1).trimStart();
  if (/^\d+ 0 R/.test(rest)) return objs.get(+rest.match(/^(\d+)/)[1])?.dict || '';
  if (!rest.startsWith('<<')) return '';
  let depth = 0;
  for (let j = 0; j < rest.length; j++) {
    if (rest.startsWith('<<', j)) { depth++; j++; } else if (rest.startsWith('>>', j)) { depth--; j++; if (!depth) return rest.slice(2, j - 1); }
  }
  return '';
}
const names = (d) => Object.fromEntries([...d.matchAll(/\/([\w.+-]+)\s+(\d+) 0 R/g)].map(m => [m[1], +m[2]]));

function cmapOf(objs, fontId) {
  const font = objs.get(fontId), tu = font && ref(font.dict, 'ToUnicode'), map = new Map();
  const two = /\/Subtype\s*\/Type0/.test(font?.dict || '');
  if (!tu) return { map, two };
  const txt = objs.get(tu).data.toString('latin1');
  const uni = (h) => String.fromCodePoint(...h.match(/.{4}/g).map(x => parseInt(x, 16)).filter(c => c < 0xD800 || c > 0xDFFF));
  for (const b of txt.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) for (const p of b[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) map.set(parseInt(p[1], 16), uni(p[2]));
  for (const b of txt.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) for (const p of b[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
    const lo = parseInt(p[1], 16), hi = parseInt(p[2], 16), base = parseInt(p[3], 16);
    for (let c = lo; c <= hi; c++) map.set(c, String.fromCodePoint(base + c - lo));
  }
  return { map, two };
}

function textOf(objs, content, resources, seen = new Set()) {
  const fonts = names(subdict(objs, resources, 'Font')), xobjs = names(subdict(objs, resources, 'XObject'));
  const cache = {};
  let font = null, out = '';
  const decode = (hex) => {
    if (!font) return '';
    const step = font.two ? 4 : 2;
    let t = '';
    for (let i = 0; i + step <= hex.length; i += step) t += font.map.get(parseInt(hex.slice(i, i + step), 16)) ?? '';
    return t;
  };
  const tokens = content.match(/\/[\w.+-]+\s+[\d.]+\s+Tf|\[[^\]]*\]\s*TJ|<[0-9A-Fa-f]*>\s*Tj|\/[\w.+-]+\s+Do|\bT\*|\bTd\b|\bTD\b|\bET\b/g) || [];
  for (const t of tokens) {
    if (/Tf$/.test(t)) { const n = t.match(/^\/([\w.+-]+)/)[1]; font = cache[n] || (cache[n] = fonts[n] ? cmapOf(objs, fonts[n]) : null); }
    else if (/Tj$/.test(t)) out += decode(t.match(/<([0-9A-Fa-f]*)>/)[1]);
    else if (/TJ$/.test(t)) for (const p of t.matchAll(/<([0-9A-Fa-f]*)>|(-?[\d.]+)/g)) out += p[1] != null ? decode(p[1]) : (+p[2] < -200 ? ' ' : '');
    else if (/Do$/.test(t)) {
      const id = xobjs[t.match(/^\/([\w.+-]+)/)[1]], x = id && objs.get(id);
      if (x && /\/Subtype\s*\/Form/.test(x.dict) && !seen.has(id)) { seen.add(id); out += ' ' + textOf(objs, x.data.toString('latin1'), x.dict, seen) + ' '; }
    } else out += ' ';
  }
  return out;
}

function readPdf(buf) {
  const objs = parse(buf), pages = [];
  for (const [, o] of objs) {
    if (!/\/Type\s*\/Page\b(?!s)/.test(o.dict)) continue;
    const box = o.dict.match(/\/MediaBox\s*\[\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\]/);
    const ids = (o.dict.match(/\/Contents\s*\[([^\]]*)\]/)?.[1].match(/\d+(?= 0 R)/g) || [ref(o.dict, 'Contents')]).map(Number);
    const content = ids.map(i => objs.get(i)?.data?.toString('latin1') || '').join('\n');
    const resources = subdict(objs, o.dict, 'Resources');
    // Chromium places glyphs one by one, so word spaces are not reliable: compare text with all whitespace removed.
    pages.push({ width: box && +box[3] - +box[1], height: box && +box[4] - +box[2], compact: textOf(objs, content, resources).replace(/\s+/g, '') });
  }
  const fonts = [...objs.values()].filter(o => /\/Type\s*\/Font\b/.test(o.dict) && !/\/Subtype\s*\/CIDFontType/.test(o.dict))
    .map(o => {
      const name = o.dict.match(/\/BaseFont\s*\/([^\s/]+)/)?.[1] || '(unnamed)';
      const desc = ref(o.dict, 'FontDescriptor') || ref(objs.get(+(o.dict.match(/\/DescendantFonts\s*\[\s*(\d+) 0 R/)?.[1]))?.dict || '', 'FontDescriptor');
      const embedded = !!desc && /\/FontFile[23]?\s+\d+ 0 R/.test(objs.get(desc)?.dict || '');
      return { name, type: o.dict.match(/\/Subtype\s*\/(\w+)/)?.[1], embedded };
    });
  return { pages, fonts };
}

const compact = (t) => t.replace(/\s+/g, '');
module.exports = { readPdf, compact };
