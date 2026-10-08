// Owner order 2026-10-08 (binding): the program serves ages 2 to 5 only (twos, threes, pre-K). No infant or baby content anywhere on the
// public site: no safe-sleep, crib, swaddle, pacifier, tummy-time or "birth to" wording in any page, script, data file, stylesheet, manifest
// or Spanish string. This scans the source of every public file; tests/teacher-standard.test.js also checks the rendered Teacher Standard page.
// Allowed non-infant uses: "baby spinach", "baby carrots", the move-180 "baby foal" story, the "Animal Babies and Their Grown-ups" week,
// "baby animals", "baby doll", and the CDC page address infant-toddler-nutrition (a real URL we link to for young children's food safety).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SKIP_DIRS = new Set(['node_modules', '.git', 'tests', 'fonts', 'vendor', 'img', 'video', 'audio']);
const EXT = /\.(js|mjs|html|json|css|txt|xml)$/;
const BANNED = /\b(infants?|newborns?|cribs?|play[- ]?yards?|playpens?|swaddl\w*|pacifiers?|bottle[- ]?feed\w*|tummy[- ]time|safe[- ]sleep|sleeping babies|sleeping baby|beb[eé]s?|lactantes?|cunas?|birth to|6 weeks|under (?:2|two) (?:years|months)|children under (?:2|two)|babies|baby)\b/i;
const ALLOW = [
  /baby (?:spinach|carrots?|foal|doll|dolls)|animal babies|animal baby names|baby animals|animal parents and babies|babies and their grown-ups/i,
  /infant-toddler-nutrition/i,
  /About 6 weeks at your chosen pace/i,      // the Academy's study-time estimate for the Foundations path
];

function walk(dir, out = []) {
  for (const n of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(n) && dir === ROOT) continue;
    const p = path.join(dir, n);
    const st = fs.lstatSync(p);
    if (st.isSymbolicLink()) continue;
    if (st.isDirectory()) { if (n !== 'node_modules' && n !== '.git') walk(p, out); } else if (EXT.test(n)) out.push(p);
  }
  return out;
}

test('no public file mentions infants, babies, cribs, swaddling, safe sleep or birth-to-3 services (allowlist: baby spinach and similar)', () => {
  const bad = [];
  for (const f of walk(ROOT)) {
    // long SVG path strings and minified vendor code are numbers and letters, never prose
    const rel = path.relative(ROOT, f);
    if (/^(flc-mark\.js|tools\/|docs\/site-map\.json)/.test(rel) && !/^docs\//.test(rel)) continue;
    const lines = fs.readFileSync(f, 'utf8').split('\n');
    lines.forEach((l, i) => {
      for (const m of l.matchAll(new RegExp(BANNED.source, 'gi'))) {
        const ctx = l.slice(Math.max(0, m.index - 40), m.index + m[0].length + 40);
        if (ALLOW.some((a) => a.test(ctx))) continue;
        bad.push(`${rel}:${i + 1}: ${m[0]} ... ${ctx.replace(/\s+/g, ' ')}`);
      }
    });
  }
  assert.deepEqual(bad, [], 'infant or baby wording found:\n' + bad.slice(0, 40).join('\n'));
});

test('the allowlist is narrow: a safe-sleep card, a crib line or a swaddle line would fail the scan', () => {
  for (const s of ['Every infant placed on the back in their own crib', 'No swaddles, bibs, pacifier clips', 'A baby asleep anywhere else is moved', 'Babies dressed for the room', 'safe sleep training', 'birth to age 3: tiny-k', 'tummy time', 'Un bebé duerme en la cuna']) {
    assert.ok(BANNED.test(s) && !ALLOW.some((a) => a.test(s)), s);
  }
  for (const s of ['Baby spinach, chopped', 'baby foal story', 'Animal Babies and Their Grown-ups', 'infant-toddler-nutrition/foods-and-drinks']) {
    const m = BANNED.exec(s);
    assert.ok(!m || ALLOW.some((a) => a.test(s)), s);
  }
});
