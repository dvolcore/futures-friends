const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

function loadHome({ reducedMotion = false, hover = true } = {}) {
  const context = vm.createContext({
    AbortController,
    console,
    FFcut: () => '',
    matchMedia: query => ({
      matches: query.includes('prefers-reduced-motion') ? reducedMotion : hover,
    }),
    window: { FFhooks: [], addEventListener() {} },
    document: { documentElement: { dataset: {} }, addEventListener() {}, querySelectorAll: () => [] },
  });

  for (const file of ['data.js', 'plush-cast.js', 'supporting-cast.js', 'views.js', 'experience.js', 'home-signatures.js']) {
    vm.runInContext(read(file), context, { filename: file });
  }
  return context;
}

function element({ tag = 'div', attrs = {}, textContent = '' } = {}) {
  const listeners = new Map();
  const values = new Map(Object.entries(attrs));
  const styleValues = new Map();
  const classes = new Set();
  const style = {
    setProperty(name, value) { styleValues.set(name, value); },
    removeProperty(name) { styleValues.delete(name); },
    get(name) { return styleValues.get(name); },
  };
  for (const property of ['strokeDasharray', 'strokeDashoffset', 'transform']) {
    Object.defineProperty(style, property, {
      get() { return styleValues.get(property); },
      set(value) { styleValues.set(property, value); },
    });
  }
  const node = {
    tagName: tag.toUpperCase(),
    dataset: {},
    hidden: false,
    textContent,
    style,
    classList: {
      toggle(name, force) {
        const enabled = force === undefined ? !classes.has(name) : force;
        if (enabled) classes.add(name); else classes.delete(name);
        return enabled;
      },
      contains(name) { return classes.has(name); },
    },
    addEventListener(type, handler) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(handler);
    },
    dispatch(type, event = {}) {
      const payload = { target: node, preventDefault() { payload.defaultPrevented = true; }, ...event };
      for (const handler of listeners.get(type) || []) handler(payload);
      return payload;
    },
    setAttribute(name, value) { values.set(name, String(value)); },
    getAttribute(name) { return values.get(name); },
    hasAttribute(name) { return values.has(name); },
    closest(selector) {
      return selector === 'button' && node.tagName === 'BUTTON' ? node : null;
    },
    focus(options) { node.focused = options; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
  };
  node.setData = (name, value) => { node.dataset[name] = String(value); };
  node.styleValues = styleValues;
  return node;
}

function roomFixture() {
  const slides = Array.from({ length: 4 }, (_, index) => {
    const stage = element();
    const slide = element();
    slide.querySelector = selector => selector === '.ffhr-stage' ? stage : null;
    slide.stage = stage;
    slide.index = index;
    return slide;
  });
  const selectors = slides.map((_, index) => {
    const button = element({ tag: 'button', attrs: { 'data-room-select': String(index) } });
    button.setData('roomSelect', index);
    return button;
  });
  const selectorGroup = element();
  const previous = element({ tag: 'button', attrs: { 'data-room-direction': '-1' } });
  const next = element({ tag: 'button', attrs: { 'data-room-direction': '1' } });
  previous.setData('roomDirection', -1);
  next.setData('roomDirection', 1);
  const status = element({ textContent: 'Booker, 1 of 4' });
  const rooms = element();
  rooms.dataset = {};
  rooms.querySelector = selector => ({
    '.ff-home-selectors': selectorGroup,
    '.ff-home-status': status,
  }[selector] || null);
  rooms.querySelectorAll = selector => selector === '.ffhr-room' ? slides : selector === '[data-room-select]' ? selectors : [];
  selectorGroup.querySelectorAll = () => selectors;
  slides.forEach((slide, index) => {
    slide.hidden = index !== 0;
  });
  selectors.forEach((button, index) => {
    button.setAttribute('aria-pressed', String(index === 0));
  });
  return { root: { querySelector: selector => selector === '#ff-rooms[data-interactive]' ? rooms : null, querySelectorAll: () => [] }, rooms, slides, selectors, selectorGroup, previous, next, status };
}

function loopFixture() {
  const steps = Array.from({ length: 6 }, (_, index) => {
    const step = element({ tag: 'button', attrs: { 'data-loop-step': String(index) } });
    step.setData('loopStep', index);
    return step;
  });
  const nodes = Array.from({ length: 6 }, () => element());
  const labels = Array.from({ length: 6 }, () => element());
  const centerTitle = element();
  const centerDescription = element();
  const center = element();
  center.querySelector = selector => selector === 'b' ? centerTitle : selector === 'span' ? centerDescription : null;
  const pathNode = element();
  const orbit = element();
  const upright = element();
  const list = element();
  const loop = element();
  loop.querySelectorAll = selector => ({
    '[data-loop-step]': steps,
    '.ffhl-node': nodes,
    '.ffhl-lab': labels,
  }[selector] || []);
  loop.querySelector = selector => ({
    '.ffhl-center': center,
    '.ffhl-draw': pathNode,
    '.ffhl-orbit': orbit,
    '.ffhl-upright': upright,
    '.ffhl-list': list,
  }[selector] || null);
  return { root: { querySelector: selector => selector === '#ff-loop[data-interactive]' ? loop : null, querySelectorAll: () => [] }, loop, steps, nodes, labels, centerTitle, centerDescription, center, pathNode, orbit, upright, list };
}

// Wave 4 calm Home: the carousel moved to #friends and the learning loop to #curriculum (home-calm.js); the hook wires them there.
function runHomeHooks(window, root, view) {
  for (const hook of window.FFhooks) hook(view, root);
}

test('home room markup preserves the four-slide carousel contract', () => {
  const { window } = loadHome();
  const markup = window.FFHome.rooms();

  assert.equal((markup.match(/data-room-select=/g) || []).length, 4);
  assert.equal((markup.match(/id="ff-room-/g) || []).length, 4);
  assert.match(markup, /aria-roledescription="carousel"/);
  assert.match(markup, /role="status" aria-live="polite"/);
  assert.match(markup, /Booker, 1 of 4/);
  assert.equal((markup.match(/aria-controls="ff-room-/g) || []).length, 4);
});

test('wrapIndex handles forward and backward carousel wrapping', () => {
  const { window } = loadHome();
  const wrapIndex = window.FFHome.wrapIndex;

  assert.equal(wrapIndex(0, 4), 0);
  assert.equal(wrapIndex(4, 4), 0);
  assert.equal(wrapIndex(-1, 4), 3);
  assert.equal(wrapIndex(-5, 4), 3);
});

test('room controls update selection, status, focus, and keyboard navigation', () => {
  const { window } = loadHome();
  const fixture = roomFixture();
  runHomeHooks(window, fixture.root, 'friends');

  assert.equal(fixture.slides.map(slide => slide.hidden).join(','), 'false,true,true,true');
  assert.deepEqual(fixture.selectors.map(button => button.getAttribute('aria-pressed')), ['true', 'false', 'false', 'false']);
  fixture.rooms.dispatch('click', { target: fixture.previous });
  assert.equal(fixture.rooms.dataset.character, 'bop');
  assert.equal(fixture.status.textContent, 'Bop, 4 of 4');

  const keyEvent = fixture.selectorGroup.dispatch('keydown', { key: 'Home' });
  assert.equal(keyEvent.defaultPrevented, true);
  assert.equal(fixture.selectors[0].focused.preventScroll, true);
  fixture.selectorGroup.dispatch('keydown', { key: 'ArrowRight' });
  assert.equal(fixture.status.textContent, 'Lumi, 2 of 4');
});

test('room stage motion responds to hover and clears under reduced motion', () => {
  const active = roomFixture();
  const activeWindow = loadHome().window;
  runHomeHooks(activeWindow, active.root, 'friends');
  active.slides[0].stage.dispatch('pointermove', { clientX: 100, clientY: 0 });
  assert.equal(active.slides[0].stage.style.get('--mx'), '12px');
  assert.equal(active.slides[0].stage.style.get('--ry'), '4deg');

  const reduced = roomFixture();
  const reducedWindow = loadHome({ reducedMotion: true }).window;
  runHomeHooks(reducedWindow, reduced.root, 'friends');
  reduced.slides[0].stage.style.setProperty('--mx', '12px');
  reduced.slides[0].stage.dispatch('pointermove', { clientX: 100, clientY: 0 });
  assert.equal(reduced.slides[0].stage.style.get('--mx'), undefined);
});

test('six-stage learning cycle updates progress and wraps accessibly', () => {
  const { window } = loadHome();
  const fixture = loopFixture();
  runHomeHooks(window, fixture.root, 'curriculum');

  assert.equal(fixture.steps.filter(step => step.getAttribute('aria-pressed') === 'true').length, 1);
  assert.equal(fixture.steps[0].getAttribute('aria-pressed'), 'true');
  assert.equal(fixture.centerTitle.textContent, 'Watch');
  assert.equal(fixture.nodes[0].classList.contains('on'), true);
  assert.equal(fixture.pathNode.style.get('strokeDasharray'), String(2 * Math.PI * 170));
  assert.equal(fixture.pathNode.style.get('strokeDashoffset'), String(2 * Math.PI * 170));
  fixture.steps[5].dispatch('click');
  assert.equal(fixture.centerTitle.textContent, 'Take home');
  assert.equal(fixture.steps[5].getAttribute('aria-pressed'), 'true');
  assert.equal(fixture.nodes[0].classList.contains('done'), true);
  assert.equal(fixture.nodes[5].classList.contains('on'), true);
  assert.equal(fixture.orbit.style.get('transform'), 'rotate(300deg)');
  assert.equal(fixture.upright.style.get('transform'), 'rotate(-300deg)');

  const keyEvent = fixture.list.dispatch('keydown', { key: 'ArrowDown' });
  assert.equal(keyEvent.defaultPrevented, true);
  assert.equal(fixture.centerTitle.textContent, 'Watch');
  assert.equal(fixture.steps[0].focused.preventScroll, true);
});

test('wave 4: the carousel and loop are wired on their new pages, not on the calm Home', () => {
  const { window } = loadHome();
  const fixture = roomFixture();
  runHomeHooks(window, fixture.root, 'home');
  fixture.rooms.dispatch('click', { target: fixture.previous });
  assert.equal(fixture.status.textContent, 'Booker, 1 of 4', 'nothing wired on Home');
  runHomeHooks(window, fixture.root, 'friends');
  fixture.rooms.dispatch('click', { target: fixture.previous });
  assert.equal(fixture.status.textContent, 'Bop, 4 of 4', 'wired on #friends');
  assert.match(read('home-signatures.js'), /const HOSTS = \['friends', 'curriculum'\]/);
});
