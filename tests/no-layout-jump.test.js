'use strict';
// The page area is reserved until the first view renders, so the static footer doesn't jump on load (layout shift).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
test('empty #view reserves a full screen of height before first render', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(html, /#view:empty\{min-height:100vh;min-height:100svh\}/);
  assert.ok(html.indexOf('#view:empty') < html.indexOf('<main id="view"'), 'rule is in the inline style, before the main element');
});
