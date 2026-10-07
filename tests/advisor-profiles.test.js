const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

function setup() {
  const events = {}, modalEvents = {};
  const dialog = {
    open:false, attributes:{},
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(name, handler) { modalEvents[name] = handler; },
    showModal() { this.open = true; },
    close() { this.open = false; modalEvents.close(); }
  };
  let appended = 0;
  const context = vm.createContext({
    window:{addEventListener(name, handler) { events[name] = handler; }},
    document:{
      addEventListener(name, handler) { events[name] = handler; },
      createElement(tag) { assert.equal(tag, 'dialog'); return dialog; },
      body:{appendChild() { appended++; }}
    }
  });
  vm.runInContext(read('advisor-profiles.js'), context);
  return {api:context.window.FFAdvisors, context, events, modalEvents, dialog, appended:() => appended};
}

test('professional profiles preserve supplied identities, statements and boundaries', () => {
  const {api} = setup();
  const melissa = api.render('melissa'), laurie = api.render('laurie');
  assert.match(melissa, /Melissa Hill, M.Ed./);
  assert.match(melissa, /Education Adjunct Faculty/);
  assert.match(melissa, /The Futures Learning Center curriculum is thoughtfully designed/);
  assert.match(melissa, /ABD denotes doctoral studies, not an awarded doctorate/);
  assert.match(melissa, /does not establish Academy accreditation/);
  assert.match(laurie, /Laurie Ouding, RN, LNC/);
  assert.match(laurie, /As an RN with 40 years of experience, including pediatrics and community health/);
  assert.match(laurie, /does not establish certification of every recipe/);
  assert.doesNotMatch(melissa + laurie, /Board.certified|Registered Dietitian|Dr\. Melissa/);
  assert.match(api.render('melissa', true), /ff-advisor-compact/);
  for (const html of [melissa, laurie]) {
    assert.match(html, /<details class="ff-advisor-background"/);
    assert.match(html, /aria-haspopup="dialog"/);
    assert.match(html, /loading="lazy" decoding="async"/);
    assert.match(html, /width="1122" height="1402"/);
    const image = html.match(/src="([^"]+)"/)[1];
    const data = fs.readFileSync(path.join(__dirname, '..', image));
    assert.equal(data.toString('ascii', 8, 12), 'WEBP');
    assert.ok(data.length > 100000 && data.length < 400000);
  }
});

test('unknown and prototype keys cannot render or open a profile', () => {
  const {api,events,appended} = setup();
  for (const key of ['__proto__', 'constructor', '<script>', 'unknown']) {
    assert.equal(api.render(key), '');
    events.click({target:{closest() { return {dataset:{advisorProfile:key}}; }}});
  }
  assert.equal(appended(), 0);
});

test('poster dialog reuses one modal and restores connected trigger focus', () => {
  const {events,modalEvents,dialog,appended} = setup();
  let focus = 0;
  const trigger = {dataset:{advisorProfile:'melissa'}, isConnected:true, focus() { focus++; }};
  events.click({target:{closest() { return trigger; }}});
  assert.equal(dialog.open, true);
  assert.equal(dialog.attributes['aria-label'], 'Melissa Hill, M.Ed. profile artwork');
  assert.match(dialog.innerHTML, /aria-label="Close profile"/);
  assert.match(dialog.innerHTML, /Open full-size artwork/);
  modalEvents.click({target:{closest() { return {}; }}});
  assert.equal(dialog.open, false);
  assert.equal(focus, 1);
  trigger.dataset.advisorProfile = 'laurie';
  events.click({target:{closest() { return trigger; }}});
  assert.match(dialog.innerHTML, /laurie-ouding.webp/);
  assert.equal(appended(), 1);
  trigger.isConnected = false;
  events.hashchange();
  assert.equal(dialog.open, false);
  assert.equal(focus, 1);
  assert.equal(dialog.trigger, null);
});

test('clicking dialog content leaves it open and backdrop click closes it', () => {
  const {events,modalEvents,dialog} = setup();
  events.click({target:{closest() { return {dataset:{advisorProfile:'laurie'}}; }}});
  modalEvents.click({target:{closest() { return null; }}});
  assert.equal(dialog.open, true);
  modalEvents.click({target:dialog});
  assert.equal(dialog.open, false);
});

test('profiles appear in appropriate routes without replacing existing controls', () => {
  const {context} = setup();
  for (const file of ['data.js','plush-cast.js', 'supporting-cast.js','views.js','experience.js']) vm.runInContext(read(file), context);
  const curriculum = vm.runInContext('V.curriculum()', context);
  assert.match(curriculum, /ff-advisor-melissa/);
  assert.match(curriculum, /data-ex-download/);
  assert.match(curriculum, /FF|Ms\. June/);
  const rainbow = vm.runInContext('V.rainbow()', context);
  assert.match(rainbow, /ff-advisor-laurie/);
  assert.match(rainbow, /data-lvl=/);
  assert.match(rainbow, /data-wk=/);
  assert.match(read('premium.js'), /FFAdvisors.render\('melissa', true\)/);
  const index = read('index.html');
  assert.ok(index.indexOf('advisor-profiles.js') < index.indexOf('views.js'));
  const css = read('advisor-profiles.css');
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /data-motion=off/);
});
