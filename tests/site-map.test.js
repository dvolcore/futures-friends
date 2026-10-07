// Link audit (owner 2026-10-07: "make sure ALL the buttons go to their proper places"). Crawls every route in headless Chromium with
// tools/site-map.mjs --check and fails on any broken internal link: a missing page, Page not found, a blank page, a missing in-page
// section or chip target, a missing file, or a label that promises something its target is not ("Read the book" must open a book,
// "Watch" must reach a video). The same tool writes docs/site-map.json (node tools/site-map.mjs).
const test = require('node:test');
const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const path = require('node:path');

test('every internal link, button and chip on every page lands somewhere real (tools/site-map.mjs --check)', { timeout: 900000 }, async () => {
  const out = await new Promise(resolve => execFile(process.execPath, [path.join(__dirname, '..', 'tools', 'site-map.mjs'), '--check'], { maxBuffer: 1 << 24, timeout: 880000 }, (err, stdout, stderr) => resolve({ code: err ? err.code : 0, stdout, stderr })));
  const summary = (out.stdout.match(/\{"pages".*\}/) || ['{}'])[0];
  const s = JSON.parse(summary);
  assert.ok(s.pages >= 50, `crawled ${s.pages} pages`);
  assert.ok(s.links >= 400, `checked ${s.links} links`);
  assert.equal(out.code, 0, out.stdout.split('\n').filter(l => l.startsWith('BROKEN')).join('\n') || out.stderr);
});
