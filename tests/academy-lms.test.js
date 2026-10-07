const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const LMS = ['academy-lms.js', 'academy-lms-items.js', 'academy-lms-team.js', 'academy-lms-director2.js', 'academy-lms-author.js', 'academy-scorm.js'];

test('every LMS script parses, and index.html loads each one in dependency order with a version', () => {
  for (const f of LMS.concat(['academy-lms.css'])) assert.ok(fs.existsSync(path.join(ROOT, f)), f + ' exists');
  for (const f of LMS) new vm.Script(read(f), { filename: f });
  const html = read('index.html');
  const order = LMS.map(f => { const m = new RegExp(`<script src="${f.replace('.', '\\.')}\\?v=(\\d+)"></script>`).exec(html); assert.ok(m, f + ' is loaded by index.html with ?v='); return html.indexOf(m[0]); });
  assert.deepEqual(order, [...order].sort((a, b) => a - b), 'academy-lms.js first, its siblings after it');
  assert.match(html, /academy-lms\.css\?v=\d+/);
  // the changed scripts moved past their previous cache-busting versions (3), the new ones start at 1
  for (const f of ['academy-lms.js', 'academy-lms-team.js', 'academy-lms-author.js']) assert.ok(Number(new RegExp(`${f.replace('.', '\\.')}\\?v=(\\d+)`).exec(html)[1]) >= 4, f + ' version bumped');
  assert.ok(Number(/academy-lms\.css\?v=(\d+)/.exec(html)[1]) >= 4);
});

test('what a learner is sent never includes an answer key: the learner scripts do not read key tables or key fields', () => {
  for (const f of ['academy-lms.js', 'academy-lms-items.js', 'academy-lms-director2.js']) {
    const src = read(f);
    for (const bad of ['training_answer_keys', 'training_item_keys', 'correct_option_ids', 'correct_order']) assert.ok(!src.includes(bad), `${f} must not reference ${bad}`);
  }
  // authoring is the only screen that reads keys, and it says the database refuses non-HQ
  assert.match(read('academy-lms-author.js'), /training_item_keys/);
  // the player takes everything from the sanitised RPCs
  const player = read('academy-lms.js') + read('academy-lms-items.js');
  for (const rpc of ['training_player_state', 'training_submit_item', 'training_start_quiz', 'training_submit_quiz', 'training_heartbeat', 'training_video_tick', 'training_finish_course']) assert.ok(player.includes(rpc), rpc);
  assert.ok(!/from\('training_(items|item_options|questions|options)'\)/.test(player), 'the learner never queries content tables for activities or questions directly');
});

// ---- render the activities with the real code, in a stub page
function load() {
  const listeners = [];
  const document = { addEventListener: (t, f) => listeners.push([t, f]), querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, createElement: () => ({ setAttribute() {}, appendChild() {} }), body: { appendChild() {} }, head: { appendChild() {} }, visibilityState: 'visible' };
  const window = { FFhooks: [], addEventListener() {}, FF_HUB: undefined, scrollTo() {}, location: { origin: 'http://x', pathname: '/' } };
  const ctx = vm.createContext({ window, document, console, setInterval() {}, clearInterval() {}, setTimeout() {}, history: {}, sessionStorage: { getItem() {}, setItem() {} }, Intl, Date, Math, URL, CSS: { escape: s => s }, V: {}, view: 'home', arg: null, render() {}, go() {}, toast() {}, navigator: {} });
  for (const f of ['academy-lms.js', 'academy-lms-items.js']) vm.runInContext(read(f), ctx, { filename: f });
  return window.FFLMS;
}
const OPT = (id, label, region) => ({ id, label, region: region || null });
const lesson = { id: 'l1', title: 'L', kind: 'text' };
const base = { lessons: [lesson], cur: 0, progress: {}, id: 'e1' };
const item = (kind, extra) => Object.assign({ id: 'i-' + kind, lesson_id: 'l1', kind, prompt: `Prompt <b>${kind}</b>`, position: 0, at_seconds: null, required: true, media_url: null, media_path: null, alt_text: null, min_length: null, options: [], done: false, attempts: 0, correct: null, reflection: null }, extra);

test('every activity kind renders with labels a screen reader can use, and escapes author text', () => {
  const F = load();
  const items = [
    item('scenario', { options: [OPT('a', 'Option <i>A</i>'), OPT('b', 'B')] }),
    item('multi', { options: [OPT('a', 'A'), OPT('b', 'B')] }),
    item('ordering', { options: [OPT('a', 'First'), OPT('b', 'Second'), OPT('c', 'Third')] }),
    item('hotspot', { media_url: 'https://example.com/i.png', alt_text: 'A classroom with an outlet', options: [OPT('a', 'Outlet', { x: 1, y: 2, w: 3, h: 4 }), OPT('b', 'Gate', { x: 10, y: 20, w: 3, h: 4 })] }),
    item('poll', { options: [OPT('a', 'Yes'), OPT('b', 'No')] }),
    item('reflection', { min_length: 30 }),
  ];
  const html = F.items.lessonItemsHtml(Object.assign({}, base, { items }), lesson);
  assert.ok(!html.includes('<b>scenario</b>') && html.includes('&lt;b&gt;scenario&lt;/b&gt;'), 'prompts are escaped');
  assert.ok(html.includes('Option &lt;i&gt;A&lt;/i&gt;'), 'options are escaped');
  // scenario / poll: radio groups in a fieldset with a legend; multi: checkboxes
  assert.equal((html.match(/type="radio"/g) || []).length, 4);
  assert.ok(/<fieldset class="lms-opts"><legend class="sr">Select all that apply<\/legend>/.test(html));
  // ordering: keyboard buttons with names that say what they move, and instructions tied to the list
  assert.equal((html.match(/data-lms="ord-move"/g) || []).length, 6);
  assert.match(html, /aria-label="Move up: First"/);
  assert.match(html, /aria-label="Move down: Third"/);
  assert.match(html, /aria-describedby="it-i-ordering-help"/);
  assert.match(html, /id="it-i-ordering-help"/);
  assert.match(html, /disabled aria-label="Move up: First"|aria-label="Move up: First"/);
  // hotspot: alt text, a labelled button per area, and the checkbox list alternative for keyboard and screen reader users
  assert.match(html, /<img src="https:\/\/example\.com\/i\.png" alt="A classroom with an outlet">/);
  assert.equal((html.match(/class="lms-hs( on)?"/g) || []).length, 2);
  assert.match(html, /aria-pressed="false" aria-label="Outlet"/);
  assert.match(html, /Prefer a list\? Select the hazards here instead of on the picture/);
  assert.equal((html.match(/<input type="checkbox" value="[ab]" data-lms-itemsel="i-hotspot"/g) || []).length, 2);
  // reflection: a real label for the textarea, a live count, and the minimum stated
  assert.match(html, /<label class="f" for="rf-i-reflection">Your answer<textarea/);
  assert.match(html, /aria-describedby="rfc-i-reflection"/);
  assert.match(html, /0 characters\. At least 30 needed\./);
  // results are announced politely
  assert.match(html, /role="status" aria-live="polite"/);
  // nothing that looks like a key or an answer
  assert.ok(!/correct_option|explanation|is_correct/.test(html));
});

test('a finished activity is locked and shows Done; a checkpoint is not listed under the lesson text; the lesson hint says what is missing', () => {
  const F = load();
  const done = item('scenario', { options: [OPT('a', 'A'), OPT('b', 'B')], done: true, correct: true });
  const cp = item('poll', { id: 'cp', at_seconds: 30, options: [OPT('a', 'A'), OPT('b', 'B')] });
  const p = Object.assign({}, base, { items: [done, cp] });
  const html = F.items.lessonItemsHtml(p, lesson);
  assert.ok(html.includes('class="lms-item done"'));
  assert.ok(/<input type="radio"[^>]*disabled/.test(html), 'a finished activity cannot be changed');
  assert.ok(!html.includes('data-item="cp"'), 'a video checkpoint appears over the video, not in the list');
  assert.ok(!/data-lms="item-submit" data-item="i-scenario"/.test(html), 'no submit button on a finished activity');
  const pending = Object.assign({}, base, { items: [item('poll', { options: [OPT('a', 'A'), OPT('b', 'B')] }), item('reflection', { id: 'r', min_length: 20 })] });
  assert.equal(F.items.lessonBlock(pending, lesson), 'Finish the 2 required activities in this lesson first.');
  pending.items.forEach(i => { i.done = true; });
  assert.equal(F.items.lessonBlock(pending, lesson), null);
  const video = { id: 'v', title: 'V', kind: 'video', video_seconds: 100 };
  const vp = { lessons: [video], cur: 0, items: [], progress: { v: { video_credit_seconds: 30 } } };
  assert.match(F.items.lessonBlock(vp, video), /Watch the video through to finish this lesson \(0:30 of 1:30 watched\)/);
  vp.progress.v.video_credit_seconds = 95;
  assert.equal(F.items.lessonBlock(vp, video), null);
});

test('the time panel and the to-do list state the rules in plain words and update from the server numbers', () => {
  const F = load();
  const p = { status: { time_enforced: true, active_seconds: 600, required_seconds: 3240, blockers: ['2 lesson(s) not finished.', 'Active time is 10 of 54 minutes required.'], completed: false } };
  const t = F.items.timeHtml(p);
  assert.match(t, /10 min counted of 54 min required/);
  assert.match(t, /role="progressbar" aria-valuenow="19"/);
  assert.match(t, /Idle or hidden time is not counted/);
  const todo = F.items.todoHtml(p);
  assert.match(todo, /To finish this course/);
  assert.match(todo, /2 lesson\(s\) not finished\./);
  assert.match(todo, /data-lms="finish-course"/);
  assert.equal(F.items.timeHtml({ status: { time_enforced: false } }), '', 'courses that do not track time show no time panel');
  assert.equal(F.items.todoHtml({ status: { completed: true } }), '');
});

test('the CSS keeps the new screens usable at phone width and respects reduced motion and the hidden attribute', () => {
  const css = read('academy-lms.css');
  assert.match(css, /@media \(max-width:480px\)/);
  assert.match(css, /\.lms \[hidden\]\{display:none!important\}/);
  assert.match(css, /\.lms-hs:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
  // visible keyboard focus for the ordering and checkpoint controls comes from the shared button styles
  assert.match(css, /\.lms-outline button:focus-visible/);
});
