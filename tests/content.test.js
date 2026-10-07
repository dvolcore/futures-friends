const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function site() {
  const context = vm.createContext({window: {}, document: {addEventListener() {}}});
  for (const file of ['data.js', 'plush-cast.js', 'supporting-cast.js', 'views.js']) {
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

test('storybook art: Booker has his finished cover (read-along in Story Time); the others stay layout previews, not published editions', () => {
  const html = vm.runInContext('V.friends()', site());
  assert.match(html, /href="#story-time\/booker-tries-again"[^>]*><img src="img\/books\/booker-tries-again\/cover-640\.webp"/);
  assert.match(html, /width="1200" height="1200" loading="lazy"/);
  assert.match(html, /Finished cover/);
  assert.match(html, /Layout preview/);
  assert.match(html, /planned pages/);
  assert.match(html, /printed editions are not available yet/);
  assert.doesNotMatch(html, /booker-tries-again-preview/);
  assert.doesNotMatch(html, /Final illustrations are in production/);
});

test('layout previews escape book titles', () => {
  const context = site();
  const html = vm.runInContext('cover({title: "<script>test</script>", c: "lumi"})', context);
  assert.ok(html.includes('&lt;script&gt;test&lt;/script&gt;'));
  assert.ok(!html.includes('<script>'));
});

test('summit planning does not promise registration or approved awards', () => {
  const html = vm.runInContext('V.summit()', site());
  assert.match(html, /Dates, venues, registration and eligible training hours are not confirmed/);
  assert.match(html, /Draft schedule/);
  assert.doesNotMatch(html, /certificate ceremony|Join the interest list/);
});
