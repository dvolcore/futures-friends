const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
function setup() {
  let click;
  const context = vm.createContext({window:{}, document:{addEventListener(type, handler) {
    if (type === 'click') click = handler;
  }}});
  vm.runInContext(read('plush-cast.js'), context);
  vm.runInContext(read('supporting-cast.js'), context);
  return {api:context.window.FFSupporting, click, context};
}

test('community preserves the core cast and offers four supporting friends', () => {
  const {api} = setup();
  const html = api.community();
  assert.match(html, /The four are the stars/);
  assert.equal((html.match(/data-community-friend=/g) || []).length, 4);
  assert.equal((html.match(/aria-pressed="true"/g) || []).length, 1);
  assert.match(html, /role="status" aria-live="polite"/);
  assert.match(html, /illustration previews/);
  assert.equal((html.match(/alt=""/g) || []).length, 4);
});

test('each character has a supervised activity, valid route and real optimized art', () => {
  const {api} = setup();
  for (const key of api.keys) {
    const html = api.detail(key);
    assert.match(html, /With a grown-up/);
    assert.equal((html.match(/<li>/g) || []).length, 3);
    assert.match(html, /href="#(curriculum|friends|for-families)"/);
    const image = html.match(/src="(img\/plush\/characters\/[a-z-]+-480\.webp)"/)[1];   // wave 5: the plush library
    assert.ok(fs.statSync(path.join(__dirname, '..', image)).size > 1000);
    assert.match(html, /loading="lazy" decoding="async"/);
  }
  assert.equal(api.detail('__proto__'), api.detail('june'));
  assert.equal(api.detail('<script>'), api.detail('june'));
});

test('selection updates only its own section and announces the activity', () => {
  const {click} = setup();
  const detail = {innerHTML:''}, status = {textContent:''};
  const buttons = ['june','rowan','tilly','pip'].map(key => ({
    dataset:{communityFriend:key},
    setAttribute(name, value) { this[name] = value; },
    closest() { return section; }
  }));
  const section = {
    querySelectorAll() { return buttons; },
    querySelector(selector) { return selector === '.ff-community-detail' ? detail : status; }
  };
  click({target:{closest() { return buttons[1]; }}});
  assert.equal(buttons[1]['aria-pressed'], 'true');
  assert.equal(buttons.filter(b => b['aria-pressed'] === 'true').length, 1);
  assert.match(detail.innerHTML, /Our goodbye ritual/);
  assert.equal(status.textContent, 'Rowan: Our goodbye ritual');
  const previous = detail.innerHTML;
  click({target:{closest() { return {dataset:{communityFriend:'invalid'}}; }}});
  assert.equal(detail.innerHTML, previous);
  click({target:{closest() { return null; }}});
});

test('teacher and family moments retain core companions and truthful boundaries', () => {
  const {api,context} = setup();
  assert.match(api.teacher(), /img\/plush\/characters\/booker-480\.webp/);
  assert.match(api.teacher('academy'), /ff-context-compact/);
  assert.match(api.arrival(), /img\/plush\/characters\/lumi-waving-480\.webp/, "Lumi waves goodbye (generated pose)");
  assert.match(api.arrival(), /fictional story-world character, not a member of our staff/);
  for (const file of ['data.js','views.js']) vm.runInContext(read(file), context);
  assert.match(vm.runInContext('V.friends()',context), /ff-community/);
  assert.match(vm.runInContext("V['for-families']()",context), /ff-arrival/);
  assert.match(read('premium.js'), /FFSupporting.teacher\('academy'\)/);
  assert.match(read('views.js'), /V\.friends = [\s\S]*?FFSupporting\.community\(\)/, 'the supporting characters live on #friends (wave 4: no longer repeated on Home)');
  assert.doesNotMatch(read('premium.js'), /FFSupporting\.community\(\)/, 'off the calm Home');
  assert.match(read('experience.js'), /FFSupporting.teacher\(\)/);
});

test('supporting art respects motion preferences and loads before view renderers', () => {
  const html = read('index.html');
  assert.ok(html.indexOf('supporting-cast.js') < html.indexOf('views.js'));
  assert.ok(html.indexOf('supporting-cast.js') < html.indexOf('premium.js'));
  assert.match(read('supporting-cast.css'), /prefers-reduced-motion:reduce/);
  assert.match(read('supporting-cast.css'), /data-motion=off/);
});
