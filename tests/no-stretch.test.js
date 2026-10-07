'use strict';
// Character art must never be stretched: the hero lineup and every cut-out keep their true proportions (object-fit: contain).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const css = fs.readFileSync(path.join(__dirname, '..', 'brand-art.css'), 'utf8');

test('the hero lineup draws each friend in proportion, standing on the stage', () => {
  const rule = css.match(/\.ffa-fig img\{[^}]*\}/)[0];
  assert.match(rule, /object-fit:contain/);
  assert.match(rule, /object-position:50% 100%/);
});

test('a site-wide guard keeps every character cut-out in proportion', () => {
  assert.match(css, /img\[src\*="cut_"\][^{]*\{object-fit:contain\}/);
});
