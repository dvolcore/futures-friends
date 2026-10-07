const test = require('node:test');
const assert = require('node:assert/strict');

const premium = require('../premium-core.js');

const modules = [
  {code: 'F-01', title: 'Read Aloud', format: 'video', hours: 2},
  {code: 'F-02', title: 'Play & Talk', format: 'workshop', hours: 1},
  {code: 'C-01', title: 'Family "Circle"', format: 'guide', hours: 3},
  {code: 'F-03', title: 'Belonging Basics', format: 'video', hours: 4}
];

const emptyState = {done: {}, open: {}};

test('filter combines query, track, status, and saved filters', () => {
  const state = {done: {'F-01': true}, open: {'F-02': true, 'F-03': true}};

  assert.deepEqual(
    premium.filter(modules, state, ['F-02', 'C-01'], {
      query: 'talk', track: 'F', status: 'started', savedOnly: true
    }).map(m => m.code),
    ['F-02']
  );
  assert.deepEqual(
    premium.filter(modules, state, ['F-02', 'C-01'], {status: 'done'}).map(m => m.code),
    ['F-01']
  );
  assert.deepEqual(
    premium.filter(modules, state, [], {status: 'new'}).map(m => m.code),
    ['C-01']
  );
});

test('filter sorts short and title results without changing the catalog', () => {
  const original = modules.slice();
  const state = {done: {}, open: {}};

  assert.deepEqual(
    premium.filter(modules, state, [], {sort: 'short'}).map(m => m.code),
    ['F-02', 'F-01', 'C-01', 'F-03']
  );
  assert.deepEqual(
    premium.filter(modules, state, [], {sort: 'title'}).map(m => m.title),
    ['Belonging Basics', 'Family "Circle"', 'Play & Talk', 'Read Aloud']
  );
  assert.deepEqual(modules, original);
});

test('plan selects whole unfinished modules and reports remaining work', () => {
  const state = {done: {'F-01': true}, open: {}};

  assert.deepEqual(premium.plan(modules, state, 'F', 3), {
    modules: [modules[1]], hours: 1, remainingHours: 5, weeks: 2
  });
  assert.deepEqual(modules.map(m => m.code), ['F-01', 'F-02', 'C-01', 'F-03']);
});

test('plan clamps invalid and oversized budgets', () => {
  assert.equal(premium.plan(modules, emptyState, 'F', 0.1).hours, 0);
  assert.equal(premium.plan(modules, emptyState, 'F', 99).hours, 7);
  assert.equal(premium.plan(modules, emptyState, 'F', 0.1).weeks, 14);
});

test('plan reports a completed track with no remaining modules', () => {
  const state = {done: {'F-01': true, 'F-02': true, 'F-03': true}, open: {}};

  assert.deepEqual(premium.plan(modules, state, 'F', 2), {
    modules: [], hours: 0, remainingHours: 0, weeks: 0
  });
});

test('csv escapes cells and identifies the record as nonofficial', () => {
  const csv = premium.csv(modules, {done: {'C-01': true}});

  assert.equal(csv, [
    '"Futures Friends self-recorded learning preview - not an official transcript"',
    '"Code","Module","Catalog hours (not verified)","Self-recorded complete"',
    '"C-01","Family ""Circle""","3","Yes"'
  ].join('\r\n'));
  assert.match(csv, /not an official transcript/);
  assert.match(csv, /Catalog hours \(not verified\)/);
});
