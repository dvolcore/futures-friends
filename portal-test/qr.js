// A small QR Code generator for the habit card sheet (habits-ui.js). Written for the Hub, no outside service and no dependency: the codes
// are made in the browser, on the page that prints them. Model 2 symbols, byte mode, versions 1 to 10 (up to 213 bytes at level M; a habit
// address is about 70), the error correction level chosen by the caller (M by default: about 15% of the code can be damaged and it still
// scans), the mask picked by the standard penalty rules (ISO/IEC 18004:2015, 7.8.3). The algorithm follows the public description of the
// standard as laid out by Project Nayuki's QR Code generator (MIT licence); the code here is our own.
// Checked in tests/habit-cards.test.mjs by an independent decoder that reads the printed pixels back, and against a second encoder.
//
//   qrMatrix(text, { ecl: 'L'|'M'|'Q'|'H', mask: 0..7 }) -> { size, version, ecl, mask, modules: boolean[][] }   (modules[y][x], true = dark)
//   qrSvg(text, { ecl, quiet = 4, title }) -> '<svg ...>' with one <path> (crisp at any print size; dark = currentColor-free #000)

const ECL = { L: [0, 1], M: [1, 0], Q: [2, 3], H: [3, 2] };          // [table row, format bits]
// error correction codewords per block, and number of blocks, by level then version (index 0 unused). ISO/IEC 18004 Table 9.
const ECC_PER_BLOCK = [
  [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18],
  [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26],
  [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24],
  [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28],
];
const BLOCKS = [
  [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4],
  [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5],
  [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8],
  [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8],
];
const MAX_VERSION = 10;

const rawModules = (v) => {                          // data + ecc modules in a symbol (everything that is not a function pattern)
  let r = (16 * v + 128) * v + 64;
  if (v >= 2) { const n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; if (v >= 7) r -= 36; }
  return r;
};
const dataCodewords = (v, row) => Math.floor(rawModules(v) / 8) - ECC_PER_BLOCK[row][v] * BLOCKS[row][v];
const alignPositions = (v) => {
  if (v === 1) return [];
  const n = Math.floor(v / 7) + 2, size = v * 4 + 17;
  const step = Math.ceil((v * 4 + 4) / (n * 2 - 2)) * 2;
  const out = [6];
  for (let p = size - 7; out.length < n; p -= step) out.splice(1, 0, p);
  return out;
};

// GF(256) with the QR polynomial x^8 + x^4 + x^3 + x^2 + 1
const gmul = (x, y) => { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11d); z ^= ((y >>> i) & 1) * x; } return z & 0xff; };
function rsDivisor(degree) {
  const r = new Array(degree).fill(0); r[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) { r[j] = gmul(r[j], root); if (j + 1 < degree) r[j] ^= r[j + 1]; }
    root = gmul(root, 0x02);
  }
  return r;
}
function rsRemainder(data, div) {
  const r = new Array(div.length).fill(0);
  for (const b of data) { const f = b ^ r.shift(); r.push(0); div.forEach((c, i) => { r[i] ^= gmul(c, f); }); }
  return r;
}

const utf8 = (s) => (typeof TextEncoder !== 'undefined' ? [...new TextEncoder().encode(s)] : [...Buffer.from(s, 'utf8')]);

export function qrMatrix(text, { ecl = 'M', mask = -1 } = {}) {
  if (!ECL[ecl]) throw new Error(`QR level ${ecl}?`);
  const [row, fbits] = ECL[ecl];
  const bytes = utf8(String(text));
  let version = 0;
  for (let v = 1; v <= MAX_VERSION; v++) {
    const bits = 4 + (v <= 9 ? 8 : 16) + bytes.length * 8;
    if (bits <= dataCodewords(v, row) * 8) { version = v; break; }
  }
  if (!version) throw new Error('Text too long for a habit card QR code');
  const v = version, size = v * 4 + 17, cap = dataCodewords(v, row) * 8;

  // the bit stream: byte mode, count, data, terminator, pad to a byte, pad codewords
  const bits = [];
  const put = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  put(0b0100, 4); put(bytes.length, v <= 9 ? 8 : 16); bytes.forEach((b) => put(b, 8));
  put(0, Math.min(4, cap - bits.length));
  put(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < cap; pad ^= 0xec ^ 0x11) put(pad, 8);
  const data = [];
  for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));

  // blocks, error correction, interleave
  const nBlocks = BLOCKS[row][v], eccLen = ECC_PER_BLOCK[row][v], raw = Math.floor(rawModules(v) / 8);
  const nShort = nBlocks - (raw % nBlocks), shortLen = Math.floor(raw / nBlocks), div = rsDivisor(eccLen);
  const blocks = [];
  for (let i = 0, k = 0; i < nBlocks; i++) {
    const len = shortLen - eccLen + (i < nShort ? 0 : 1);
    const d = data.slice(k, k + len); k += len;
    const e = rsRemainder(d, div);
    if (i < nShort) d.push(0);
    blocks.push(d.concat(e));
  }
  const words = [];
  for (let i = 0; i < blocks[0].length; i++) blocks.forEach((b, j) => { if (i !== shortLen - eccLen || j >= nShort) words.push(b[i]); });

  // function patterns
  const mods = Array.from({ length: size }, () => new Array(size).fill(false));
  const fn = Array.from({ length: size }, () => new Array(size).fill(false));
  const set = (x, y, dark) => { mods[y][x] = dark; fn[y][x] = true; };
  for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]]) {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const d = Math.max(Math.abs(dx), Math.abs(dy)), x = cx + dx, y = cy + dy;
      if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, d !== 2 && d !== 4);
    }
  }
  const al = alignPositions(v);
  al.forEach((ax, i) => al.forEach((ay, j) => {
    if ((i === 0 && j === 0) || (i === 0 && j === al.length - 1) || (i === al.length - 1 && j === 0)) return;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }));
  const drawFormat = (m) => {
    const d = (fbits << 3) | m; let r = d;
    for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
    const f = ((d << 10) | r) ^ 0x5412, b = (i) => ((f >>> i) & 1) === 1;
    for (let i = 0; i <= 5; i++) set(8, i, b(i));
    set(8, 7, b(6)); set(8, 8, b(7)); set(7, 8, b(8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, b(i));
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, b(i));
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, b(i));
    set(8, size - 8, true);
  };
  drawFormat(0);
  if (v >= 7) {
    let r = v; for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
    const vb = (v << 12) | r;
    for (let i = 0; i < 18; i++) { const dark = ((vb >>> i) & 1) === 1, a = size - 11 + (i % 3), c = Math.floor(i / 3); set(a, c, dark); set(c, a, dark); }
  }

  // the codewords, two columns at a time, zig-zag from the bottom right
  let bit = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) for (let j = 0; j < 2; j++) {
      const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - vert : vert;
      if (!fn[y][x] && bit < words.length * 8) { mods[y][x] = ((words[bit >>> 3] >>> (7 - (bit & 7))) & 1) === 1; bit++; }
    }
  }

  const MASKS = [
    (x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0, (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
  ];
  const applyMask = (m) => { for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y][x] && MASKS[m](x, y)) mods[y][x] = !mods[y][x]; };
  let best = mask;
  if (best < 0 || best > 7) {
    let low = Infinity;
    for (let m = 0; m < 8; m++) {
      applyMask(m); drawFormat(m);
      const p = penalty(mods);
      if (p < low) { low = p; best = m; }
      applyMask(m);                                    // XOR again = undo
    }
  }
  applyMask(best); drawFormat(best);
  return { size, version: v, ecl, mask: best, modules: mods };
}

// ISO/IEC 18004 7.8.3: runs of 5+, 2x2 blocks, finder-like 1:1:3:1:1 with 4 light, and the dark/light balance
function penalty(m) {
  const n = m.length; let p = 0;
  const line = (get) => {
    let run = 1;
    for (let i = 1; i <= n; i++) {
      if (i < n && get(i) === get(i - 1)) run++;
      else { if (run >= 5) p += 3 + (run - 5); run = 1; }
    }
    const A = [true, false, true, true, true, false, true];
    for (let i = 0; i + 7 <= n; i++) {
      if (!A.every((b, k) => get(i + k) === b)) continue;
      const lightBefore = [1, 2, 3, 4].every((k) => i - k < 0 || !get(i - k));
      const lightAfter = [0, 1, 2, 3].every((k) => i + 7 + k >= n || !get(i + 7 + k));
      if (lightBefore) p += 40;
      if (lightAfter) p += 40;
    }
  };
  for (let y = 0; y < n; y++) line((x) => m[y][x]);
  for (let x = 0; x < n; x++) line((y) => m[y][x]);
  for (let y = 0; y + 1 < n; y++) for (let x = 0; x + 1 < n; x++) { const c = m[y][x]; if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) p += 3; }
  let dark = 0; m.forEach((r) => r.forEach((c) => { if (c) dark++; }));
  const total = n * n; p += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
  return p;
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export function qrSvg(text, { ecl = 'M', quiet = 4, title = '' } = {}) {
  const q = qrMatrix(text, { ecl });
  const n = q.size + quiet * 2;
  let d = '';
  q.modules.forEach((r, y) => { for (let x = 0; x < q.size; x++) if (r[x]) { let w = 1; while (x + w < q.size && r[x + w]) w++; d += `M${x + quiet} ${y + quiet}h${w}v1h-${w}z`; x += w - 1; } });
  return `<svg class="qr" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges" role="img" aria-label="${esc(title || 'QR code')}" data-qr-version="${q.version}" data-qr-text="${esc(text)}">`
    + `${title ? `<title>${esc(title)}</title>` : ''}<rect width="${n}" height="${n}" fill="#fff"/><path fill="#000" d="${d}"/></svg>`;
}
