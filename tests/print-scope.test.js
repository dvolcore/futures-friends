'use strict';
// Printing any page must keep its content. Only a page that shows a certificate may hide everything else.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const cssFiles = fs.readdirSync(root).filter(f => f.endsWith('.css'));

test('no stylesheet hides the whole page in print unless it is scoped to a certificate or print view', () => {
  for (const f of cssFiles) {
    const css = fs.readFileSync(path.join(root, f), 'utf8');
    for (const m of css.matchAll(/@media print\s*\{([\s\S]*?)\n\}/g)) {
      const block = m[1];
      const unscoped = /(^|[\s,}])body\s+\*\s*\{\s*visibility:\s*hidden/m.test(block);
      assert.ok(!unscoped, `${f}: "body *{visibility:hidden}" in a print block must be scoped (e.g. body:has(.lms-cert) *)`);
    }
  }
});

test('the certificate print rule is scoped with :has(.lms-cert)', () => {
  const css = fs.readFileSync(path.join(root, 'academy-lms.css'), 'utf8');
  assert.match(css, /body:has\(\.lms-cert\) \*\{visibility:hidden!important\}/);
  assert.match(css, /@page ffcert\{size:landscape;margin:0\}/);
});
