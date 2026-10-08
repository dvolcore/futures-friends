const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function site() {
  const context = vm.createContext({window: {}, document: {addEventListener() {}}});
  for (const file of ['data.js', 'plush-cast.js', 'supporting-cast.js', 'views.js', 'family-library-data.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context);
  }
  return context;
}

test('training distinguishes the available catalog from planned continuing education', () => {
  const context = site();
  const html = vm.runInContext('V.training()', context);
  const count = context.window.FF.modules.length;
  assert.ok(html.includes(`${count} core modules`));
  assert.match(html, /four planned continuing-education modules/);
  assert.match(html, /Approval and eligible clock hours have not been verified/);
  assert.doesNotMatch(html, /41 modules and 87 clock hours/);
  assert.match(html, /Catalog hours/);
});

test('storybook art: the four friends\' books show their finished revised covers (read-along in Story Time); The Rainbow Picnic stays a layout preview', () => {
  const html = vm.runInContext('V.friends()', site());
  for (const id of ['booker-tries-again', 'big-feelings-brighter-days', 'what-happens-if-we-try', 'clean-up-team'])
    assert.match(html, new RegExp(`href="#story-time/${id}"[^>]*><img src="img/books/${id}/cover-640\\.webp"`), id);
  assert.match(html, /width="1200" height="1200" loading="lazy"/);
  assert.match(html, /Finished cover/); assert.match(html, /Illustrated · 18 pages/);
  assert.match(html, /Layout preview/);
  assert.match(html, /planned pages/);
  assert.doesNotMatch(html, /Cover layout preview|big-feelings-brighter-days-cover|clean-up-team-cover/);
  assert.match(html, /printed editions are not available yet/);
  assert.doesNotMatch(html, /booker-tries-again-preview/);
  assert.doesNotMatch(html, /Final illustrations are in production/);
});

test('layout previews escape book titles', () => {
  const context = site();
  const html = vm.runInContext('cover({title: "<script>test</script>", c: "all"})', context);
  assert.ok(html.includes('&lt;script&gt;test&lt;/script&gt;'));
  assert.ok(!html.includes('<script>'));
});

test('summit planning does not promise registration or approved awards', () => {
  const html = vm.runInContext('V.summit()', site());
  assert.match(html, /Dates, venues, registration and eligible training hours are not confirmed/);
  assert.match(html, /Draft schedule/);
  assert.doesNotMatch(html, /certificate ceremony|Join the interest list/);
});
