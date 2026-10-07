const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const S = require('../academy-scorm.js');

// A bundle shaped like the hub's training_scorm_bundle(): one video lesson with two checkpoints and every activity kind,
// a text lesson, and a knowledge check with a bank (two objectives, one life-safety).
const OPT = (id, label, region) => ({ id, label, region: region || null });
function bundle(over = {}) {
  return {
    course: { id: 'c-1', slug: 'safe-sleep', code: 'F-999', title: 'Safe Sleep & "Quotes" <test>', summary: 's', version: 3, clock_hours: 0.25, idle_minutes: 3, active_threshold_pct: 50, enforce_active_time: true, learning_objectives: 'o' },
    review: { status: 'signed_off', reviewer_name: 'Dr. Rae Reviewer' },
    lessons: [
      { id: 'l-1', module: 'M', title: 'Watch', kind: 'video', body: 'Body text.\n\n## Key\n- one', video_url: 'https://example.com/v.mp4', video_seconds: 100, captions_url: null, transcript: 'Transcript text '.repeat(5), minutes: 10, items: [
        { id: 'i-sc', kind: 'scenario', prompt: 'Scenario?', at_seconds: 30, required: true, media_url: null, media_path: null, alt_text: null, min_length: null, options: [OPT('o1', 'wrong'), OPT('o2', 'right')], key: { correct_option_ids: ['o2'], correct_order: [], feedback: { o1: 'Nope.' }, explanation: 'Because.' } },
        { id: 'i-mu', kind: 'multi', prompt: 'Multi?', at_seconds: 60, required: true, options: [OPT('m1', 'a'), OPT('m2', 'b'), OPT('m3', 'c')], key: { correct_option_ids: ['m1', 'm3'], correct_order: [], feedback: {}, explanation: null } },
      ] },
      { id: 'l-2', module: 'M', title: 'Practice', kind: 'text', body: 'Practice.', video_url: null, video_seconds: null, captions_url: null, transcript: null, minutes: 10, items: [
        { id: 'i-or', kind: 'ordering', prompt: 'Order?', at_seconds: null, required: true, options: [OPT('r1', 'first'), OPT('r2', 'second'), OPT('r3', 'third')], key: { correct_option_ids: [], correct_order: ['r1', 'r2', 'r3'], feedback: {}, explanation: null } },
        { id: 'i-hs', kind: 'hotspot', prompt: 'Hazards?', at_seconds: null, required: true, media_path: 'courses/c-1/img.png', alt_text: 'A room', options: [OPT('h1', 'outlet', { x: 1, y: 1, w: 5, h: 5 }), OPT('h2', 'gate', { x: 20, y: 20, w: 5, h: 5 })], key: { correct_option_ids: ['h1'], correct_order: [], feedback: {}, explanation: null } },
        { id: 'i-po', kind: 'poll', prompt: 'Poll?', at_seconds: null, required: true, options: [OPT('p1', 'yes'), OPT('p2', 'no')], key: null },
        { id: 'i-re', kind: 'reflection', prompt: 'Reflect?', at_seconds: null, required: true, min_length: 20, options: [], key: null },
      ] },
    ],
    quizzes: [{ id: 'z-1', title: 'Check', passing_score: 70, max_attempts: 3, draw_per_objective: 1, cooldown_minutes: 0, reveal_feedback: 'after_pass', questions: [
      { id: 'q1', prompt: 'Life safety A1', objective: 'A', critical: true, multi: false, options: [OPT('a1', 'x'), OPT('a2', 'y')], key: { correct_option_ids: ['a2'], explanation: 'A1 why' } },
      { id: 'q2', prompt: 'Life safety A2', objective: 'A', critical: true, multi: false, options: [OPT('b1', 'x'), OPT('b2', 'y')], key: { correct_option_ids: ['b2'], explanation: 'A2 why' } },
      { id: 'q3', prompt: 'Other B1', objective: 'B', critical: false, multi: false, options: [OPT('c1', 'x'), OPT('c2', 'y')], key: { correct_option_ids: ['c2'], explanation: 'B1 why' } },
      { id: 'q4', prompt: 'Other B2', objective: 'B', critical: false, multi: false, options: [OPT('d1', 'x'), OPT('d2', 'y')], key: { correct_option_ids: ['d2'], explanation: 'B2 why' } },
    ] }],
    ...over,
  };
}
const build = (b = bundle(), assets = { 'courses/c-1/img.png': Uint8Array.from([137, 80, 78, 71]) }) => S.buildPackage(b, { assets });
const text = (files, path) => new TextDecoder().decode(files[path]);

test('the package is a zip with imsmanifest.xml at the root, every file listed, and a manifest that passes the SCORM 1.2 structure checks', () => {
  const pkg = build();
  const zipped = S.zip(pkg.files, new Date(2026, 9, 5, 10, 0, 0));
  assert.equal(String.fromCharCode(zipped[0], zipped[1]), 'PK');
  const files = S.unzip(zipped);
  const names = Object.keys(files);
  for (const n of ['imsmanifest.xml', 'index.html', 'scorm-api.js', 'engine.js', 'player.js', 'course.js', 'style.css']) assert.ok(names.includes(n), n);
  assert.ok(names.some(n => /^assets\/.*img\.png$/.test(n)), 'the hotspot image is in the package');
  assert.deepEqual(S.validateManifest(text(files, 'imsmanifest.xml'), names), []);
  const xml = text(files, 'imsmanifest.xml');
  assert.match(xml, /<schema>ADL SCORM<\/schema>/);
  assert.match(xml, /<schemaversion>1\.2<\/schemaversion>/);
  assert.match(xml, /adlcp:scormtype="sco"/);
  assert.match(xml, /<adlcp:masteryscore>70<\/adlcp:masteryscore>/);
  assert.match(xml, /Safe Sleep &amp; &quot;Quotes&quot; &lt;test&gt;/, 'titles are escaped');
  assert.equal(S.parseXml(xml).name, 'manifest');
  // the course data in the package carries keys (SCORM scores in the browser) and the version/review
  assert.match(text(files, 'course.js'), /correct_option_ids/);
  assert.ok(!text(files, 'course.js').includes('</script>'), 'no way to break out of a script tag');
});

test('the manifest validator rejects what SCORM 1.2 does not allow', () => {
  const good = build().manifest;
  const bad = (re, to) => S.validateManifest(good.replace(re, to));
  assert.ok(bad('<schemaversion>1.2</schemaversion>', '<schemaversion>2004</schemaversion>').some(p => /schemaversion/.test(p)));
  assert.ok(bad('adlcp:scormtype="sco"', 'adlcp:scormtype="video"').some(p => /scormtype/.test(p)));
  assert.ok(bad('type="webcontent"', 'type="other"').some(p => /webcontent/.test(p)));
  assert.ok(bad(/identifierref="[^"]+"/, 'identifierref="NOPE"').some(p => /missing resource/.test(p)));
  assert.ok(bad('<organizations default="FF_safe-sleep_ORG">', '<organizations default="X">').some(p => /default/.test(p)));
  assert.ok(bad(/<\/metadata>/, '</meta>').some(p => /mismatched/.test(p)));
  assert.ok(bad('xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"', 'xmlns="http://example.com"').some(p => /namespace/.test(p)));
  assert.ok(bad('<file href="index.html"/>', '').some(p => /launch file/.test(p)));
  assert.ok(bad('<title>Safe Sleep', '<title>Safe & Sleep').some(p => /entity/.test(p)), 'an unescaped ampersand is not well-formed');
  assert.ok(S.validateManifest(good, ['index.html']).some(p => /missing from the package/.test(p)));
  assert.ok(S.validateManifest(good.replace('<metadata>', '<organizations/><metadata>')).length > 0);
  assert.ok(S.validateManifest('not xml at all').length > 0);
});

// ---- a minimal SCORM 1.2 run-time: the API object an LMS provides, with the data model rules the engine must respect
function lms() {
  const d = { 'cmi.core.lesson_status': 'not attempted', 'cmi.core.student_id': 'S1', 'cmi.core.student_name': 'Test, Terry', 'cmi.core.score.raw': '', 'cmi.core.score.min': '', 'cmi.core.score.max': '', 'cmi.core.session_time': '', 'cmi.core.exit': '', 'cmi.suspend_data': '', 'cmi.interactions._count': '0' };
  const ro = new Set(['cmi.core.student_id', 'cmi.core.student_name', 'cmi.interactions._count', 'cmi.core.total_time']);
  const wo = /^cmi\.core\.(session_time|exit)$/;
  const inter = [];
  let state = 'not initialized', err = 0, commits = 0;
  const STATUS = ['passed', 'completed', 'failed', 'incomplete', 'browsed', 'not attempted'];
  const TYPES = ['true-false', 'choice', 'fill-in', 'matching', 'performance', 'sequencing', 'likert', 'numeric'];
  const api = {
    LMSInitialize() { if (state !== 'not initialized') { err = 101; return 'false'; } state = 'running'; err = 0; return 'true'; },
    LMSFinish() { if (state !== 'running') { err = 301; return 'false'; } state = 'terminated'; err = 0; return 'true'; },
    LMSGetValue(k) { err = 0; if (state !== 'running') { err = 301; return ''; } if (wo.test(k)) { err = 404; return ''; } if (/^cmi\.interactions\.\d+\./.test(k)) { err = 404; return ''; } if (!(k in d)) { err = 201; return ''; } return d[k]; },
    LMSSetValue(k, v) {
      err = 0; if (state !== 'running') { err = 301; return 'false'; }
      if (ro.has(k)) { err = 403; return 'false'; }
      let m;
      if ((m = /^cmi\.interactions\.(\d+)\.(\w+)(?:\.0\.pattern)?$/.exec(k)) || (m = /^cmi\.interactions\.(\d+)\.correct_responses\.0\.pattern$/.exec(k))) {
        const n = Number(m[1]); if (n > inter.length) { err = 201; return 'false'; }
        const o = inter[n] || (inter[n] = {}); const f = /correct_responses/.test(k) ? 'pattern' : m[2];
        if (f === 'type' && !TYPES.includes(v)) { err = 405; return 'false'; }
        if (f === 'result' && !['correct', 'wrong', 'unanticipated', 'neutral'].includes(v) && isNaN(Number(v))) { err = 405; return 'false'; }
        if (['student_response', 'pattern'].includes(f) && String(v).length > 255) { err = 405; return 'false'; }
        if (f === 'id' && (String(v).length > 255 || /[^A-Za-z0-9_-]/.test(v))) { err = 405; return 'false'; }
        if (f === 'time' && !/^\d{2}:\d{2}:\d{2}(\.\d{1,2})?$/.test(v)) { err = 405; return 'false'; }
        if (f === 'latency' && !/^\d{4}:\d{2}:\d{2}(\.\d{1,2})?$/.test(v)) { err = 405; return 'false'; }
        o[f] = v; d['cmi.interactions._count'] = String(inter.length); return 'true';
      }
      if (k === 'cmi.core.lesson_status' && !STATUS.includes(v)) { err = 405; return 'false'; }
      if (/^cmi\.core\.score\.(raw|min|max)$/.test(k) && !(v !== '' && Number(v) >= 0 && Number(v) <= 100)) { err = 405; return 'false'; }
      if (k === 'cmi.core.session_time' && !/^\d{4}:\d{2}:\d{2}(\.\d{1,2})?$/.test(v)) { err = 405; return 'false'; }
      if (k === 'cmi.core.exit' && !['', 'time-out', 'suspend', 'logout'].includes(v)) { err = 405; return 'false'; }
      if (k === 'cmi.suspend_data' && String(v).length > 4096) { err = 405; return 'false'; }
      if (!(k in d)) { err = 201; return 'false'; }
      d[k] = v; return 'true';
    },
    LMSCommit() { if (state !== 'running') { err = 301; return 'false'; } commits++; return 'true'; },
    LMSGetLastError() { return String(err); }, LMSGetErrorString(e) { return 'error ' + e; }, LMSGetDiagnostic() { return ''; },
  };
  return { api, d, inter, get commits() { return commits; }, get state() { return state; } };
}
function load(pkgFiles, run) {
  const sandbox = { console, Math, Date, JSON, Object, Array, String, Number, setTimeout, clearTimeout };
  const win = { API: run.api, document: { addEventListener() {}, getElementById: () => null }, parent: null }; win.parent = win;
  sandbox.window = win; sandbox.self = win;
  const ctx = vm.createContext(sandbox);
  vm.runInContext(text(pkgFiles, 'scorm-api.js'), ctx, { filename: 'scorm-api.js' });
  vm.runInContext(text(pkgFiles, 'engine.js'), ctx, { filename: 'engine.js' });
  return { ctx, win };
}
function engine(over = {}, clock = { t: Date.UTC(2026, 9, 5, 15, 0, 0) }, opts = {}) {
  const files = S.unzip(S.zip(build(bundle(over)).files));
  const run = lms();
  const { win } = load(files, run);
  const course = vm.runInContext(text(files, 'course.js').replace('window.FF_COURSE =', '(') .replace(/;\s*$/, ')'), vm.createContext({}));
  const e = win.FFEngine.create(JSON.parse(JSON.stringify(course)), win.FFScormAPI, { now: () => clock.t, random: opts.random || (() => 0.5), skipVideoCredit: opts.skipVideoCredit });
  return { e, run, clock, win };
}

test('the engine loads in a SCORM 1.2 run-time and reports the status, score, interactions, session time and suspend data', () => {
  const { e, run, clock } = engine({}, undefined, { skipVideoCredit: true });
  assert.equal(e.init(), true);
  assert.equal(run.state, 'running');
  assert.equal(run.d['cmi.core.lesson_status'], 'incomplete');
  assert.equal(run.d['cmi.core.score.min'], '0');
  assert.equal(run.d['cmi.core.score.max'], '100');

  // activities: scenario (wrong then right), multi, ordering, hotspot, poll, reflection
  let r = e.answerItem('i-sc', { option: 'o1' });
  assert.deepEqual([r.correct, r.completed, r.feedback], [false, false, 'Nope.']);
  r = e.answerItem('i-sc', { option: 'o2' });
  assert.deepEqual([r.correct, r.completed, r.explanation], [true, true, 'Because.']);
  assert.equal(e.answerItem('i-mu', { options: ['m1'] }).correct, false);
  assert.equal(e.answerItem('i-mu', { options: ['m3', 'm1'] }).correct, true);
  assert.equal(e.answerItem('i-or', { order: ['r2', 'r1', 'r3'] }).correct, false);
  assert.equal(e.answerItem('i-or', { order: ['r1', 'r2', 'r3'] }).correct, true);
  assert.equal(e.answerItem('i-or', { order: ['r1'] }).error, 'put every step in order');
  assert.equal(e.answerItem('i-hs', { options: ['h1', 'h2'] }).correct, false);
  assert.equal(e.answerItem('i-hs', { options: ['h1'] }).correct, true);
  assert.equal(e.answerItem('i-po', { option: 'p2' }).correct, null);
  assert.ok(e.answerItem('i-re', { text: 'short' }).error);
  assert.equal(e.answerItem('i-re', { text: 'I will check the crib every morning.' }).completed, true);
  // interactions went to the LMS with valid types and results
  assert.equal(run.inter.length, 10);
  assert.deepEqual(run.inter.map(i => i.type).filter((t, i, a) => a.indexOf(t) === i).sort(), ['choice', 'fill-in', 'likert', 'sequencing']);
  assert.equal(run.inter[0].id, 'i-sc');
  assert.deepEqual([run.inter[0].result, run.inter[0].student_response, run.inter[0].pattern], ['wrong', 'a', 'b']);
  assert.deepEqual([run.inter[1].result, run.inter[1].student_response], ['correct', 'b']);
  assert.equal(run.inter[3].student_response, 'a,c', 'multi-select response is the sorted letters');
  assert.equal(run.inter[5].type, 'sequencing');
  assert.equal(run.inter[5].student_response, 'a,b,c');
  assert.equal(run.inter[8].result, 'neutral');
  assert.equal(run.inter[9].type, 'fill-in');
  assert.match(run.inter[0].time, /^\d{2}:\d{2}:\d{2}$/);
  assert.equal(run.d['cmi.interactions._count'], '10');

  // lessons, then the bank: two objectives, one question drawn from each; a missed life-safety question fails the attempt
  assert.equal(e.status().complete, false);
  assert.equal(e.completeLesson('l-1').ok, true);
  assert.equal(e.completeLesson('l-2').ok, true);
  const draw = e.startQuiz();
  assert.equal(draw.questions.length, 2);
  assert.deepEqual(Array.from(draw.questions.map(q => q.objective)).sort(), ['A', 'B']);
  const crit = draw.questions.find(q => q.critical), other = draw.questions.find(q => !q.critical);
  const wrongCrit = { [crit.id]: [crit.options.find(o => !crit.key.correct_option_ids.includes(o.id)).id], [other.id]: other.key.correct_option_ids };
  const bad = e.submitQuiz(wrongCrit);
  assert.deepEqual([bad.score, bad.passed, bad.criticalMissed, bad.masteryMet, bad.review.length], [50, false, 1, false, 0]);
  assert.equal(run.d['cmi.core.score.raw'], '50');
  assert.equal(run.d['cmi.core.lesson_status'], 'incomplete');
  // retake: new questions where the bank has them
  const draw2 = e.startQuiz();
  assert.equal(draw2.questions.filter(q => draw.questions.some(x => x.id === q.id)).length, 0);
  const win = e.submitQuiz(Object.fromEntries(draw2.questions.map(q => [q.id, q.key.correct_option_ids])));
  assert.deepEqual([win.passed, win.score, win.attemptsLeft], [true, 100, 1]);
  assert.equal(run.d['cmi.core.score.raw'], '100');
  assert.equal(e.status().complete, false, 'active time is still missing');
  assert.equal(run.d['cmi.core.lesson_status'], 'incomplete');

  // active time with fixed timestamps: visible + recent interaction counts, idle and hidden do not
  e.beat(true, 0);
  for (let i = 0; i < 4; i++) { clock.t += 15000; e.beat(true, 5); }                    // 60 s
  clock.t += 15000; e.beat(true, 181);                                                   // idle (3 minute limit)
  clock.t += 15000; e.beat(false, 0);                                                    // hidden
  clock.t += 15000; e.beat(true, 0);                                                     // visible again, interval started hidden
  clock.t += 100000; e.beat(true, 0);                                                    // a gap: not counted
  assert.equal(e.status().activeSeconds, 60);
  assert.equal(e.required, 450);
  clock.t += 45000; e.beat(true, 0);
  clock.t += 45000; e.beat(true, 0);
  for (let i = 0; i < 9; i++) { clock.t += 45000; e.beat(true, 0); }
  assert.ok(e.status().activeSeconds >= 450, 'active ' + e.status().activeSeconds);
  e.completeLesson('l-1');                                                               // any sync call updates the status
  assert.equal(e.status().complete, true);
  assert.equal(run.d['cmi.core.lesson_status'], 'passed');
  // finish: session time in the SCORM format, suspend data within the limit, exit
  clock.t += 125500;
  assert.equal(e.finish(), true);
  assert.equal(run.state, 'terminated');
  assert.match(run.d['cmi.core.session_time'], /^\d{4}:\d{2}:\d{2}\.\d{2}$/);
  assert.equal(run.d['cmi.core.exit'], '');
  assert.ok(run.d['cmi.suspend_data'].length > 0 && run.d['cmi.suspend_data'].length <= 4096);
  assert.ok(run.commits >= 5, 'committed along the way');
});

test('timespan formatting and an incomplete exit are SCORM 1.2 compliant', () => {
  const { e, run, clock } = engine();
  assert.equal(e.timespan(0), '0000:00:00.00');
  assert.equal(e.timespan(3725.5), '0001:02:05.50');
  e.init();
  clock.t += 61000;
  e.finish();
  assert.equal(run.d['cmi.core.session_time'], '0000:01:01.00');
  assert.equal(run.d['cmi.core.exit'], 'suspend', 'an unfinished course exits as suspend');
  assert.equal(run.d['cmi.core.lesson_status'], 'incomplete');
});

test('a lesson with required activities, or a video not watched through, cannot be completed; attempts and cooldown are honored', () => {
  const { e, clock } = engine({}, undefined, {});
  e.init();
  assert.match(e.completeLesson('l-2').reason, /Finish the 4 required activity/);
  assert.equal(e.allowedPosition('l-1'), 30, 'the video cannot go past the first unfinished checkpoint');
  e.answerItem('i-sc', { option: 'o2' });
  assert.equal(e.allowedPosition('l-1'), 60);
  e.answerItem('i-mu', { options: ['m1', 'm3'] });
  assert.equal(e.allowedPosition('l-1'), Infinity);
  assert.equal(e.completeLesson('l-1').reason, 'Watch the video through first.');
  e.videoCredit('l-1', 89);
  assert.equal(e.completeLesson('l-1').ok, false);
  e.videoCredit('l-1', 1);
  assert.equal(e.completeLesson('l-1').ok, true);
  // attempts: three allowed, then none
  e.completeLesson('l-2');
  for (let n = 0; n < 3; n++) { const d = e.startQuiz(); e.submitQuiz(Object.fromEntries(d.questions.map(q => [q.id, []]))); clock.t += 1000; }
  assert.equal(e.startQuiz().error, 'no attempts left');
  // cooldown
  const b = bundle(); b.quizzes[0].cooldown_minutes = 30;
  const x = engine(b);
  x.e.init(); x.e.completeLesson('l-2');
  x.e.answerItem('i-or', { order: ['r1', 'r2', 'r3'] });
  const d = x.e.startQuiz(); x.e.submitQuiz(Object.fromEntries(d.questions.map(q => [q.id, []])));
  assert.match(x.e.startQuiz().error, /try again in 30 minute/);
  x.clock.t += 31 * 60000;
  assert.ok(x.e.startQuiz().questions);
});

test('the player files are well-formed and escape what they print', () => {
  const files = S.unzip(S.zip(build().files));
  new vm.Script(text(files, 'player.js'), { filename: 'player.js' });
  new vm.Script(text(files, 'scorm-api.js'), { filename: 'scorm-api.js' });
  assert.match(text(files, 'index.html'), /<title>Safe Sleep &amp; &quot;Quotes&quot; &lt;test&gt;<\/title>/);
  // an LMS with no API: the wrapper reports "not connected" instead of throwing
  const ctx = vm.createContext({ window: null });
  const win = { parent: null }; win.parent = win; ctx.window = win;
  vm.runInContext(text(files, 'scorm-api.js'), ctx);
  assert.equal(win.FFScormAPI.init(), false);
  assert.equal(win.FFScormAPI.get('cmi.core.lesson_status'), '');
  assert.equal(win.FFScormAPI.set('x', 'y'), false);
});

test('the zip writer produces a readable archive with correct checksums', () => {
  const z = S.zip([{ path: 'a.txt', data: 'hello' }, { path: 'dir/b.bin', data: Uint8Array.from([1, 2, 3]) }, { path: 'ü.txt', data: 'unicode' }]);
  const files = S.unzip(z);
  assert.equal(new TextDecoder().decode(files['a.txt']), 'hello');
  assert.deepEqual(Array.from(files['dir/b.bin']), [1, 2, 3]);
  assert.equal(new TextDecoder().decode(files['ü.txt']), 'unicode');
  assert.equal(S.crc32(new TextEncoder().encode('123456789')), 0xCBF43926);
  z[35] ^= 255;                                                                           // corrupt a data byte
  assert.throws(() => S.unzip(z));
});
