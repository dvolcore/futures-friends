/* Futures Friends Academy: SCORM 1.2 export. Builds a single-SCO package (zip) of a course so it can be hosted in another
   LMS (for example MOPD's) as a fallback. Pure JavaScript with no dependencies: it runs in the browser (HQ authoring screen)
   and in Node (tests). Input is the JSON from the database function training_scorm_bundle (HQ only).

   Package contents: imsmanifest.xml (SCORM 1.2), index.html (the SCO), scorm-api.js (API discovery and calls), engine.js (course
   rules and scoring: no DOM), player.js (screens), course.js (the course data), style.css and assets/. A SCORM package scores
   inside the learner's browser, so unlike the hub it must contain the answer keys: keep the file out of public places.
   The engine reports cmi.core.lesson_status, score.raw/min/max, session_time, suspend_data and cmi.interactions.n.*. */
(function (root) {
'use strict';

// ------------------------------------------------------------------------------------------------ small helpers
const enc = new TextEncoder();
const bytes = s => (typeof s === 'string' ? enc.encode(s) : s);
const xmlEsc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&apos;' }[c]));
const idSafe = s => String(s).replace(/[^A-Za-z0-9_-]/g, '_');
const jsonForScript = o => JSON.stringify(o).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

// ------------------------------------------------------------------------------------------------ zip (store, no compression)
let CRC = null;
function crc32(buf) {
  if (!CRC) { CRC = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; CRC[n] = c >>> 0; } }
  let c = 0xFFFFFFFF; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function zip(files, when) {
  const d = when instanceof Date ? when : new Date();
  const dosTime = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const dosDate = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  const parts = [], central = []; let offset = 0;
  const u16 = n => [n & 255, (n >>> 8) & 255], u32 = n => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
  for (const f of files) {
    const name = enc.encode(f.path), data = bytes(f.data), crc = crc32(data);
    const local = Uint8Array.from([0x50, 0x4b, 3, 4, ...u16(20), ...u16(0x0800), ...u16(0), ...u16(dosTime), ...u16(dosDate), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0)]);
    parts.push(local, name, data);
    central.push(Uint8Array.from([0x50, 0x4b, 1, 2, ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(dosTime), ...u16(dosDate), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset)]), name);
    offset += local.length + name.length + data.length;
  }
  const cdSize = central.reduce((a, b) => a + b.length, 0);
  const end = Uint8Array.from([0x50, 0x4b, 5, 6, ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(cdSize), ...u32(offset), ...u16(0)]);
  const all = [...parts, ...central, end], out = new Uint8Array(all.reduce((a, b) => a + b.length, 0));
  let p = 0; for (const a of all) { out.set(a, p); p += a.length; }
  return out;
}
// reads back a zip written by zip() (store only): {path: Uint8Array}; used by the tests and by validators
function unzip(buf) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength), out = {};
  let eocd = buf.length - 22; while (eocd >= 0 && dv.getUint32(eocd, true) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error('not a zip file');
  const n = dv.getUint16(eocd + 10, true); let p = dv.getUint32(eocd + 16, true);
  for (let i = 0; i < n; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('bad central directory');
    const method = dv.getUint16(p + 10, true), crc = dv.getUint32(p + 16, true), size = dv.getUint32(p + 24, true);
    const nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(buf.subarray(p + 46, p + 46 + nl));
    if (method !== 0) throw new Error('only stored entries are supported');
    const ln = dv.getUint16(lo + 26, true), le = dv.getUint16(lo + 28, true), start = lo + 30 + ln + le;
    const data = buf.slice(start, start + size);
    if (crc32(data) !== crc) throw new Error('crc mismatch for ' + name);
    out[name] = data; p += 46 + nl + el + cl;
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ manifest and its checks
function manifestXml(course, review, files, quiz) {
  const id = 'FF_' + idSafe(course.slug || course.id), org = id + '_ORG', item = id + '_ITEM', res = id + '_RES';
  const title = xmlEsc(course.title);
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${id}" version="${xmlEsc(String(course.version || 1))}" xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2" xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="${org}">
    <organization identifier="${org}">
      <title>${title}</title>
      <item identifier="${item}" identifierref="${res}" isvisible="true">
        <title>${title}</title>${quiz ? `
        <adlcp:masteryscore>${Number(quiz.passing_score) || 80}</adlcp:masteryscore>` : ''}
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="${res}" type="webcontent" adlcp:scormtype="sco" href="index.html">
${files.map(f => `      <file href="${xmlEsc(f)}"/>`).join('\n')}
    </resource>
  </resources>
</manifest>
`;
}

// Minimal XML reader: enough to check well-formedness and read the manifest. Throws on malformed input.
function parseXml(xml) {
  let i = 0; const stack = []; let root = null;
  const err = m => { throw new Error('XML error at ' + i + ': ' + m); };
  const decl = /^<\?xml[^>]*\?>\s*/.exec(xml); if (decl) i = decl[0].length;
  while (i < xml.length) {
    if (xml[i] === '<') {
      if (xml.startsWith('<!--', i)) { const e = xml.indexOf('-->', i); if (e < 0) err('unterminated comment'); i = e + 3; continue; }
      if (xml[i + 1] === '/') {
        const m = /^<\/([A-Za-z_][\w:.-]*)\s*>/.exec(xml.slice(i)); if (!m) err('bad end tag');
        const top = stack.pop(); if (!top || top.name !== m[1]) err('mismatched end tag ' + m[1]);
        i += m[0].length; continue;
      }
      const m = /^<([A-Za-z_][\w:.-]*)((?:\s+[A-Za-z_][\w:.-]*\s*=\s*(?:"[^"<]*"|'[^'<]*'))*)\s*(\/?)>/.exec(xml.slice(i)); if (!m) err('bad start tag');
      const el = { name: m[1], attrs: {}, children: [], text: '' };
      m[2].replace(/([A-Za-z_][\w:.-]*)\s*=\s*(?:"([^"<]*)"|'([^'<]*)')/g, (_, k, a, b) => { if (k in el.attrs) err('duplicate attribute ' + k); el.attrs[k] = a != null ? a : b; return ''; });
      for (const v of Object.values(el.attrs)) if (/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/.test(v)) err('bad entity in attribute');
      if (stack.length) stack[stack.length - 1].children.push(el); else if (root) err('more than one root'); else root = el;
      if (!m[3]) stack.push(el);
      i += m[0].length;
    } else {
      const e = xml.indexOf('<', i), t = xml.slice(i, e < 0 ? xml.length : e);
      if (/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/.test(t)) err('bad entity in text');
      if (stack.length) stack[stack.length - 1].text += t; else if (t.trim()) err('text outside the root');
      i = e < 0 ? xml.length : e;
    }
  }
  if (stack.length) err('unclosed element ' + stack[stack.length - 1].name);
  if (!root) err('no root element');
  return root;
}
const kids = (el, name) => el.children.filter(c => c.name === name);
// Structure checks for a SCORM 1.2 content package manifest. Returns a list of problems (empty = valid).
function validateManifest(xml, fileList) {
  const out = []; let root;
  try { root = parseXml(xml); } catch (e) { return [e.message]; }
  if (root.name !== 'manifest') out.push('root element must be manifest');
  if (!root.attrs.identifier) out.push('manifest needs an identifier');
  if (root.attrs.xmlns !== 'http://www.imsproject.org/xsd/imscp_rootv1p1p2') out.push('default namespace must be the IMS content packaging 1.1.2 namespace');
  if (root.attrs['xmlns:adlcp'] !== 'http://www.adlnet.org/xsd/adlcp_rootv1p2') out.push('adlcp namespace must be the SCORM 1.2 one');
  const names = root.children.map(c => c.name);
  if (names.join(',') !== 'metadata,organizations,resources') out.push('manifest children must be metadata, organizations, resources in that order (got ' + names.join(',') + ')');
  const md = kids(root, 'metadata')[0];
  if (md) {
    const schema = kids(md, 'schema')[0], ver = kids(md, 'schemaversion')[0];
    if (!schema || schema.text.trim() !== 'ADL SCORM') out.push('metadata/schema must be "ADL SCORM"');
    if (!ver || ver.text.trim() !== '1.2') out.push('metadata/schemaversion must be "1.2"');
  }
  const ids = new Set(), seen = (kind, v) => { if (!v) out.push(kind + ' needs an identifier'); else if (!/^[A-Za-z_][\w.-]*$/.test(v)) out.push(kind + ' identifier "' + v + '" is not a valid XML ID'); else if (ids.has(v)) out.push('duplicate identifier ' + v); ids.add(v); };
  seen('manifest', root.attrs.identifier);
  const orgs = kids(root, 'organizations')[0], resources = kids(root, 'resources')[0];
  const resIds = new Map();
  if (resources) for (const r of kids(resources, 'resource')) {
    seen('resource', r.attrs.identifier); resIds.set(r.attrs.identifier, r);
    if (r.attrs.type !== 'webcontent') out.push('resource ' + r.attrs.identifier + ' type must be webcontent');
    const st = r.attrs['adlcp:scormtype']; if (st !== 'sco' && st !== 'asset') out.push('resource ' + r.attrs.identifier + ' needs adlcp:scormtype sco or asset');
    if (!r.attrs.href) out.push('resource ' + r.attrs.identifier + ' needs an href');
    const fs = kids(r, 'file').map(f => f.attrs.href);
    if (r.attrs.href && !fs.includes(r.attrs.href)) out.push('the launch file ' + r.attrs.href + ' must be listed as a file');
    if (fileList) for (const f of fs) if (!fileList.includes(f)) out.push('file ' + f + ' is listed in the manifest but missing from the package');
    if (fileList && r.attrs.href && !fileList.includes(r.attrs.href)) out.push('launch file ' + r.attrs.href + ' is missing from the package');
    for (const f of fs) if (/^(\/|[A-Za-z]:|\.\.)/.test(f) || /\\/.test(f)) out.push('file ' + f + ' must be a relative path');
  } else out.push('resources element is missing');
  if (orgs) {
    const list = kids(orgs, 'organization');
    if (!list.length) out.push('there must be at least one organization');
    if (!orgs.attrs.default || !list.some(o => o.attrs.identifier === orgs.attrs.default)) out.push('organizations/@default must name an organization');
    for (const o of list) {
      seen('organization', o.attrs.identifier);
      if (!kids(o, 'title').length) out.push('organization ' + o.attrs.identifier + ' needs a title');
      const walk = (el) => { for (const it of kids(el, 'item')) {
        seen('item', it.attrs.identifier);
        if (!kids(it, 'title').length) out.push('item ' + it.attrs.identifier + ' needs a title');
        if (it.children[0] && it.children[0].name !== 'title') out.push('item ' + it.attrs.identifier + ': title must come first');
        if (it.attrs.identifierref && !resIds.has(it.attrs.identifierref)) out.push('item ' + it.attrs.identifier + ' points at a missing resource ' + it.attrs.identifierref);
        const ms = kids(it, 'adlcp:masteryscore')[0]; if (ms && !(Number(ms.text) >= 0 && Number(ms.text) <= 100)) out.push('masteryscore must be 0 to 100');
        walk(it);
      } };
      walk(o);
    }
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ the SCO files
const SCORM_API_JS = `/* SCORM 1.2 API discovery and calls. Never throws: every call returns the LMS's own answer or a safe default. */
(function (root) {
  'use strict';
  var api = null;
  function find(win) {
    var tries = 0;
    while (win && tries++ < 500) {
      try { if (win.API) return win.API; } catch (e) { /* cross-origin */ }
      if (win.parent && win.parent !== win) win = win.parent; else break;
    }
    return null;
  }
  function locate() {
    if (api) return api;
    api = find(root);
    if (!api && root.opener) api = find(root.opener);
    return api;
  }
  var S = {
    connected: false,
    init: function () { var a = locate(); if (!a) return false; S.connected = String(a.LMSInitialize('')) === 'true'; return S.connected; },
    get: function (k) { var a = locate(); return a ? String(a.LMSGetValue(k)) : ''; },
    set: function (k, v) { var a = locate(); return a ? String(a.LMSSetValue(k, String(v))) === 'true' : false; },
    commit: function () { var a = locate(); return a ? String(a.LMSCommit('')) === 'true' : false; },
    finish: function () { var a = locate(); var ok = a ? String(a.LMSFinish('')) === 'true' : false; S.connected = false; return ok; },
    error: function () { var a = locate(); return a ? Number(a.LMSGetLastError()) : -1; },
    errorString: function () { var a = locate(); return a ? String(a.LMSGetErrorString(a.LMSGetLastError())) : ''; }
  };
  root.FFScormAPI = S;
})(typeof window !== 'undefined' ? window : this);
`;

// The course engine. No DOM: it takes the course data and the API wrapper, and owns every rule (the package is the only
// place these rules run, so they mirror the hub's: server-style scoring, mastery on life-safety items, per-objective draws,
// attempt limits and cooldown, touchpoints, active time with an idle limit).
const ENGINE_JS = `(function (root) {
  'use strict';
  function pad(n, w) { n = String(n); while (n.length < (w || 2)) n = '0' + n; return n; }
  // SCORM 1.2 CMITimespan: HHHH:MM:SS.SS
  function timespan(sec) { sec = Math.max(0, sec); var h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60; return pad(h, 4) + ':' + pad(m) + ':' + pad(Math.floor(s)) + '.' + pad(Math.round((s - Math.floor(s)) * 100)); }
  function clock(ms) { var d = new Date(ms); return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()); }
  var LETTERS = 'abcdefghijklmnopqrstuvwxyz';
  function shuffle(a, rnd) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function sameSet(a, b) { if (a.length !== b.length) return false; var x = a.slice().sort(), y = b.slice().sort(); for (var i = 0; i < x.length; i++) if (x[i] !== y[i]) return false; return true; }
  function sameList(a, b) { if (a.length !== b.length) return false; for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; }

  function create(course, scorm, opts) {
    opts = opts || {};
    var rnd = opts.random || Math.random, now = opts.now || function () { return Date.now(); };
    var idleLimit = (course.course.idle_minutes || 3) * 60;
    var required = course.course.enforce_active_time && course.course.clock_hours > 0 ? Math.round(course.course.clock_hours * 3600 * course.course.active_threshold_pct / 100) : 0;
    var st = { lessons: {}, items: {}, quiz: { attempts: 0, passed: false, best: null, seen: {}, draw: null, lastAt: 0, failedOut: false }, active: 0, lastBeat: null, lastState: 'hidden', started: now(), interactions: 0, sessionSeconds: 0, finished: false };
    var lessonById = {}, itemById = {};
    course.lessons.forEach(function (l) { lessonById[l.id] = l; (l.items || []).forEach(function (i) { i.lesson_id = l.id; itemById[i.id] = i; }); });
    var quiz = course.quizzes && course.quizzes[0];

    // ---- SCORM data model
    function setv(k, v) { return scorm.set(k, v); }
    function addInteraction(it, type, response, result, pattern, latency) {
      var n = st.interactions++, b = 'cmi.interactions.' + n + '.';
      setv(b + 'id', String(it.id).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 255));
      setv(b + 'type', type);
      if (response != null) setv(b + 'student_response', String(response).slice(0, 255));
      setv(b + 'result', result);
      if (pattern != null) setv(b + 'correct_responses.0.pattern', String(pattern).slice(0, 255));
      setv(b + 'weighting', '1');
      setv(b + 'time', clock(now()));
      if (latency != null) setv(b + 'latency', timespan(latency));
    }
    function letters(item, ids) { return ids.map(function (id) { var i = item.options.findIndex(function (o) { return o.id === id; }); return i < 0 ? '?' : LETTERS[i]; }); }
    function suspend() {
      var s = { l: Object.keys(st.lessons).filter(function (k) { return st.lessons[k]; }).map(function (k) { return course.lessons.findIndex(function (x) { return x.id === k; }); }),
        i: Object.keys(st.items).filter(function (k) { return st.items[k].done; }).map(function (k) { return Object.keys(itemById).indexOf(k); }),
        q: [st.quiz.attempts, st.quiz.passed ? 1 : 0, st.quiz.best], t: Math.round(st.active) };
      return JSON.stringify(s).slice(0, 4000);
    }
    function restore() {
      var raw = scorm.get('cmi.suspend_data'); if (!raw) return;
      try { var s = JSON.parse(raw), ids = Object.keys(itemById);
        (s.l || []).forEach(function (i) { if (course.lessons[i]) st.lessons[course.lessons[i].id] = true; });
        (s.i || []).forEach(function (i) { if (ids[i]) st.items[ids[i]] = { done: true, attempts: 1, correct: null }; });
        if (s.q) { st.quiz.attempts = s.q[0] || 0; st.quiz.passed = !!s.q[1]; st.quiz.best = s.q[2]; }
        st.active = s.t || 0;
      } catch (e) { /* unreadable suspend data: start fresh */ }
    }
    function status() {
      var blockers = [], lessonsDone = course.lessons.filter(function (l) { return st.lessons[l.id]; }).length;
      if (lessonsDone < course.lessons.length) blockers.push((course.lessons.length - lessonsDone) + ' lesson(s) not finished');
      var req = Object.keys(itemById).filter(function (k) { return itemById[k].required && !(st.items[k] && st.items[k].done); }).length;
      if (req) blockers.push(req + ' activity(ies) not done');
      if (quiz && !st.quiz.passed) blockers.push('knowledge check not passed');
      if (required && st.active < required) blockers.push('active time ' + Math.floor(st.active / 60) + ' of ' + Math.ceil(required / 60) + ' minutes');
      return { complete: blockers.length === 0, blockers: blockers, activeSeconds: Math.floor(st.active), requiredSeconds: required };
    }
    function sync() {
      var s = status();
      setv('cmi.suspend_data', suspend());
      var cur = scorm.get('cmi.core.lesson_status');
      if (s.complete) setv('cmi.core.lesson_status', quiz ? (st.quiz.passed ? 'passed' : 'failed') : 'completed');
      else if (st.quiz.failedOut) setv('cmi.core.lesson_status', 'failed');
      else if (cur !== 'incomplete') setv('cmi.core.lesson_status', 'incomplete');
      scorm.commit();
      return s;
    }

    var eng = {
      state: st, required: required, status: status, timespan: timespan,
      init: function () {
        var ok = scorm.init();
        if (ok) { var s = scorm.get('cmi.core.lesson_status'); restore(); if (!s || s === 'not attempted') setv('cmi.core.lesson_status', 'incomplete'); setv('cmi.core.score.min', '0'); setv('cmi.core.score.max', '100'); }
        return ok;
      },
      // a heartbeat: counts time only when the page is visible AND the learner did something within the idle limit
      beat: function (visible, idleSeconds) {
        var t = now() / 1000, state = !visible ? 'hidden' : idleSeconds > idleLimit ? 'idle' : 'active';
        if (st.lastBeat != null && t > st.lastBeat) { var el = t - st.lastBeat; if (el <= 45 && st.lastState === 'active' && state === 'active') st.active += el; }
        st.lastBeat = t; st.lastState = state; return { state: state, active: Math.floor(st.active) };
      },
      completeLesson: function (id) {
        var l = lessonById[id]; if (!l) return { ok: false, reason: 'unknown lesson' };
        var left = (l.items || []).filter(function (i) { return i.required && !(st.items[i.id] && st.items[i.id].done); }).length;
        if (left) return { ok: false, reason: 'Finish the ' + left + ' required activity(ies) first.' };
        if (l.kind === 'video' && l.video_seconds && (st.video && st.video[id] || 0) < Math.ceil(l.video_seconds * 0.9) && !opts.skipVideoCredit) return { ok: false, reason: 'Watch the video through first.' };
        st.lessons[id] = true; sync(); return { ok: true };
      },
      videoCredit: function (id, seconds) { st.video = st.video || {}; st.video[id] = Math.min((st.video[id] || 0) + seconds, (lessonById[id] || {}).video_seconds || 1e9); },
      allowedPosition: function (lessonId) { var l = lessonById[lessonId], next = null; (l.items || []).forEach(function (i) { if (i.at_seconds != null && i.required && !(st.items[i.id] && st.items[i.id].done) && (next == null || i.at_seconds < next)) next = i.at_seconds; }); return next == null ? Infinity : next; },
      answerItem: function (id, answer) {
        var it = itemById[id]; if (!it) return { error: 'unknown activity' };
        var key = it.key || {}, ok = null, fb = null, started = now();
        if (it.kind === 'scenario') { ok = (key.correct_option_ids || []).indexOf(answer.option) >= 0; fb = key.feedback && (key.feedback[answer.option] || key.feedback[ok ? 'correct' : 'incorrect']); addInteraction(it, 'choice', letters(it, [answer.option]).join(','), ok ? 'correct' : 'wrong', letters(it, key.correct_option_ids || []).join(',')); }
        else if (it.kind === 'multi' || it.kind === 'hotspot') { var sel = (answer.options || []).filter(function (o) { return it.options.some(function (x) { return x.id === o; }); }); if (!sel.length) return { error: 'choose at least one' }; ok = sameSet(sel, key.correct_option_ids || []); fb = key.feedback && key.feedback[ok ? 'correct' : 'incorrect']; addInteraction(it, 'choice', letters(it, sel).sort().join(','), ok ? 'correct' : 'wrong', letters(it, key.correct_option_ids || []).sort().join(',')); }
        else if (it.kind === 'ordering') { var ord = answer.order || []; if (ord.length !== it.options.length) return { error: 'put every step in order' }; ok = sameList(ord, key.correct_order || []); fb = key.feedback && key.feedback[ok ? 'correct' : 'incorrect']; addInteraction(it, 'sequencing', letters(it, ord).join(','), ok ? 'correct' : 'wrong', letters(it, key.correct_order || []).join(',')); }
        else if (it.kind === 'poll') { addInteraction(it, 'likert', letters(it, [answer.option]).join(','), 'neutral', null); }
        else { var text = String(answer.text || '').trim(); if (text.length < (it.min_length || 1)) return { error: 'Write at least ' + (it.min_length || 1) + ' characters.' }; addInteraction(it, 'fill-in', text, 'neutral', null); }
        var rec = st.items[id] || (st.items[id] = { done: false, attempts: 0, correct: null });
        rec.attempts++; rec.correct = ok; if (ok === true || ok === null) rec.done = true;
        sync();
        return { correct: ok, completed: rec.done, feedback: fb || null, explanation: ok !== false ? (key.explanation || null) : null, attempt: rec.attempts };
      },
      startQuiz: function () {
        if (!quiz) return null;
        if (st.quiz.passed) return { error: 'already passed' };
        if (st.quiz.attempts >= quiz.max_attempts) { st.quiz.failedOut = true; sync(); return { error: 'no attempts left' }; }
        if (quiz.cooldown_minutes && st.quiz.lastAt && now() - st.quiz.lastAt < quiz.cooldown_minutes * 60000) return { error: 'try again in ' + Math.ceil((quiz.cooldown_minutes * 60000 - (now() - st.quiz.lastAt)) / 60000) + ' minute(s)' };
        if (st.quiz.draw) return st.quiz.draw;
        var qs = quiz.questions, pick;
        if (!quiz.draw_per_objective) pick = qs.slice();
        else {
          var groups = {}; qs.forEach(function (q) { var o = (q.objective || '').trim() || 'General'; (groups[o] = groups[o] || []).push(q); });
          pick = []; Object.keys(groups).forEach(function (o) {
            var unseen = shuffle(groups[o].filter(function (q) { return !st.quiz.seen[q.id]; }), rnd), seen = shuffle(groups[o].filter(function (q) { return st.quiz.seen[q.id]; }), rnd);
            pick = pick.concat(unseen.concat(seen).slice(0, quiz.draw_per_objective));
          });
          pick = shuffle(pick, rnd);
        }
        pick.forEach(function (q) { st.quiz.seen[q.id] = true; });
        st.quiz.draw = { questions: pick };
        return st.quiz.draw;
      },
      submitQuiz: function (answers) {
        var d = st.quiz.draw; if (!d) return { error: 'start the knowledge check first' };
        var correct = 0, crit = 0, review = [], t0 = now();
        d.questions.forEach(function (q) {
          var sel = (answers[q.id] || []).filter(function (o) { return q.options.some(function (x) { return x.id === o; }); }), ok = sameSet(sel, q.key.correct_option_ids || []);
          if (ok) correct++; else if (q.critical) crit++;
          review.push({ question_id: q.id, correct: ok, explanation: q.key.explanation || null });
          addInteraction({ id: q.id }, 'choice', letters(q, sel).sort().join(','), ok ? 'correct' : 'wrong', letters(q, q.key.correct_option_ids || []).sort().join(','));
        });
        var score = d.questions.length ? Math.round(1000 * correct / d.questions.length) / 10 : 0, passed = score >= quiz.passing_score && crit === 0;
        st.quiz.attempts++; st.quiz.draw = null; st.quiz.lastAt = now(); st.quiz.best = Math.max(st.quiz.best || 0, score); if (passed) st.quiz.passed = true;
        if (!passed && st.quiz.attempts >= quiz.max_attempts) st.quiz.failedOut = true;
        setv('cmi.core.score.raw', String(st.quiz.best));
        sync();
        return { score: score, passed: passed, criticalMissed: crit, masteryMet: crit === 0, correct: correct, total: d.questions.length, attemptsLeft: quiz.max_attempts - st.quiz.attempts, review: (passed || quiz.reveal_feedback === 'after_attempt') ? review : [] };
      },
      finish: function () {
        if (st.finished) return false; st.finished = true;
        var sec = (now() - st.started) / 1000;
        setv('cmi.core.session_time', timespan(sec));
        var s = status(); setv('cmi.suspend_data', suspend());
        setv('cmi.core.exit', s.complete ? '' : 'suspend');
        scorm.commit(); return scorm.finish();
      }
    };
    return eng;
  }
  root.FFEngine = { create: create, timespan: timespan };
})(typeof window !== 'undefined' ? window : this);
`;

const PLAYER_CSS = `body{margin:0;font:16px/1.55 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#14313D;background:#faf7f0}
header{background:#0A2B38;color:#fff;padding:14px 18px}header h1{margin:0;font-size:20px}header p{margin:2px 0 0;font-size:13px;color:#C6D7DD}
main{max-width:860px;margin:0 auto;padding:18px;display:grid;gap:16px}
.card{background:#fff;border:1px solid #d9d2c3;border-radius:12px;padding:16px;display:grid;gap:10px}
h2{margin:0;font-size:20px}h3{margin:0;font-size:17px}
button{font:inherit;padding:8px 16px;border-radius:999px;border:1px solid #0A2B38;background:#fff;cursor:pointer}button.primary{background:#E7A928;border-color:#E7A928;font-weight:600}
button[disabled]{opacity:.5;cursor:not-allowed}
label.opt{display:flex;gap:10px;padding:8px 12px;border:1px solid #d9d2c3;border-radius:10px;cursor:pointer}
.fb{border:1px solid #d9d2c3;border-radius:10px;padding:8px 12px}.fb.ok{border-color:#2E7D4F}.fb.bad{border-color:#B3382E}
.note{font-size:13px;color:#5B6E77}nav{display:flex;gap:8px;flex-wrap:wrap}
ol.ord{list-style:none;margin:0;padding:0;display:grid;gap:6px}ol.ord li{display:flex;gap:8px;align-items:center;border:1px solid #d9d2c3;border-radius:10px;padding:6px 10px}ol.ord li span{flex:1}
.hsbox{position:relative;max-width:640px}.hsbox img{width:100%;display:block;border-radius:8px}.hs{position:absolute;border:2px solid transparent;background:transparent;border-radius:6px;padding:0}.hs:hover,.hs:focus-visible{border-color:#E7A928;background:rgba(231,169,40,.2)}.hs.on{border-color:#2F6FC0;background:rgba(47,111,192,.25)}
video{max-width:100%;border-radius:10px;background:#000}
@media (max-width:480px){main{padding:12px}.card{padding:12px}}
`;

const PLAYER_JS = `(function () {
  'use strict';
  var C = window.FF_COURSE, S = window.FFScormAPI, E = null, cur = 0, ui = {}, T = 0;
  var el = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  function para(t) { return String(t || '').split(/\\n\\s*\\n/).map(function (p) { p = p.trim(); if (/^##\\s/.test(p)) return '<h3>' + esc(p.slice(3)) + '</h3>'; if (/^[-*]\\s/.test(p)) return '<ul>' + p.split(/\\n/).map(function (l) { return '<li>' + esc(l.replace(/^[-*]\\s*/, '')) + '</li>'; }).join('') + '</ul>'; return '<p>' + esc(p).replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>') + '</p>'; }).join(''); }
  function u(id) { return ui[id] || (ui[id] = { sel: [], order: null, text: '', res: null }); }
  function itemHtml(it) {
    var s = u(it.id), st = E.state.items[it.id], done = st && st.done, h = '<section class="card" data-item="' + esc(it.id) + '"><h3>' + esc(it.prompt) + '</h3>';
    if (it.kind === 'scenario' || it.kind === 'poll') h += it.options.map(function (o) { return '<label class="opt"><input type="radio" name="i' + esc(it.id) + '" value="' + esc(o.id) + '"' + (s.sel[0] === o.id ? ' checked' : '') + (done ? ' disabled' : '') + '> ' + esc(o.label) + '</label>'; }).join('');
    else if (it.kind === 'multi') h += it.options.map(function (o) { return '<label class="opt"><input type="checkbox" value="' + esc(o.id) + '"' + (s.sel.indexOf(o.id) >= 0 ? ' checked' : '') + (done ? ' disabled' : '') + '> ' + esc(o.label) + '</label>'; }).join('');
    else if (it.kind === 'ordering') { s.order = s.order || it.options.map(function (o) { return o.id; }).reverse(); h += '<ol class="ord">' + s.order.map(function (id, i) { var o = it.options.filter(function (x) { return x.id === id; })[0]; return '<li><span>' + (i + 1) + '. ' + esc(o.label) + '</span><button type="button" data-mv="' + i + '" data-dir="-1"' + (i === 0 || done ? ' disabled' : '') + ' aria-label="Move up: ' + esc(o.label) + '">Up</button><button type="button" data-mv="' + i + '" data-dir="1"' + (i === s.order.length - 1 || done ? ' disabled' : '') + ' aria-label="Move down: ' + esc(o.label) + '">Down</button></li>'; }).join('') + '</ol>'; }
    else if (it.kind === 'hotspot') h += '<div class="hsbox">' + (it.media_url || it.media_path ? '<img src="' + esc(it.media_path || it.media_url) + '" alt="' + esc(it.alt_text || '') + '">' : '') + it.options.filter(function (o) { return o.region; }).map(function (o) { var r = o.region; return '<button type="button" class="hs' + (s.sel.indexOf(o.id) >= 0 ? ' on' : '') + '" data-hs="' + esc(o.id) + '" style="left:' + r.x + '%;top:' + r.y + '%;width:' + r.w + '%;height:' + r.h + '%" aria-pressed="' + (s.sel.indexOf(o.id) >= 0) + '" aria-label="' + esc(o.label) + '"></button>'; }).join('') + '</div><p class="note">Or choose from the list:</p>' + it.options.map(function (o) { return '<label class="opt"><input type="checkbox" value="' + esc(o.id) + '"' + (s.sel.indexOf(o.id) >= 0 ? ' checked' : '') + (done ? ' disabled' : '') + '> ' + esc(o.label) + '</label>'; }).join('');
    else h += '<textarea rows="4" data-text style="width:100%"' + (done ? ' disabled' : '') + '>' + esc(s.text) + '</textarea><p class="note">At least ' + (it.min_length || 1) + ' characters.</p>';
    if (s.res) h += '<div class="fb ' + (s.res.correct === false ? 'bad' : 'ok') + '" role="status"><b>' + (s.res.error ? esc(s.res.error) : s.res.correct === true ? 'Correct.' : s.res.correct === false ? 'Not quite. Try again.' : 'Recorded.') + '</b> ' + esc(s.res.feedback || '') + ' ' + esc(s.res.explanation || '') + '</div>';
    if (!done) h += '<div><button class="primary" type="button" data-submit>Submit</button></div>'; else h += '<p class="note">Done.</p>';
    return h + '</section>';
  }
  function answerOf(it, s) { return it.kind === 'scenario' || it.kind === 'poll' ? { option: s.sel[0] } : it.kind === 'multi' || it.kind === 'hotspot' ? { options: s.sel } : it.kind === 'ordering' ? { order: s.order } : { text: s.text }; }
  function render() {
    var st = E.status(), l = C.lessons[cur], h = '';
    h += '<nav aria-label="Lessons">' + C.lessons.map(function (x, i) { return '<button type="button" data-go="' + i + '"' + (i === cur ? ' aria-current="true"' : '') + '>' + (E.state.lessons[x.id] ? '✓ ' : '') + esc(x.title) + '</button>'; }).join('') + (C.quizzes.length ? '<button type="button" data-go="quiz"' + (cur === 'quiz' ? ' aria-current="true"' : '') + '>Knowledge check</button>' : '') + '</nav>';
    h += '<p class="note">Active time: ' + Math.floor(st.activeSeconds / 60) + ' of ' + Math.ceil(st.requiredSeconds / 60) + ' minutes. ' + (st.complete ? 'You have finished the course.' : st.blockers.join('; ') + '.') + '</p>';
    if (cur === 'quiz') h += quizHtml();
    else {
      h += '<article class="card"><h2>' + esc(l.title) + '</h2>';
      if (l.kind === 'video' && l.video_url) h += (/\\.(mp4|webm|ogg)(\\?|$)/i.test(l.video_url) ? '<video controls playsinline data-vid="' + esc(l.id) + '" src="' + esc(l.video_url) + '"' + '>' + (l.captions_url ? '<track kind="captions" src="' + esc(l.captions_url) + '" srclang="en" label="English" default>' : '') + '</video>' : '<p><a href="' + esc(l.video_url) + '" target="_blank" rel="noopener">Open the video</a></p>') + (l.transcript ? '<details><summary>Transcript</summary>' + para(l.transcript) + '</details>' : '');
      h += para(l.body) + '</article>';
      h += (l.items || []).map(itemHtml).join('');
      h += '<div><button class="primary" type="button" data-done' + (E.state.lessons[l.id] ? ' disabled' : '') + '>' + (E.state.lessons[l.id] ? 'Lesson complete' : 'Mark lesson complete') + '</button> <span class="note" id="why"></span></div>';
    }
    el('app').innerHTML = h;
    var v = document.querySelector('video[data-vid]');
    if (v) { var last = 0; v.addEventListener('timeupdate', function () { var lim = E.allowedPosition(l.id); if (v.currentTime > lim + 0.75) { v.currentTime = lim; } else if (!v.paused && v.currentTime > last && v.currentTime - last < 2) { E.videoCredit(l.id, v.currentTime - last); } last = v.currentTime; }); v.addEventListener('ratechange', function () { v.playbackRate = 1; }); }
  }
  function quizHtml() {
    var q = C.quizzes[0], d = E.startQuiz(), h = '<article class="card"><h2>' + esc(q.title) + '</h2>';
    if (d && d.error) return h + '<p>' + esc(d.error) + '</p></article>';
    if (E.state.quiz.passed) return h + '<p>You passed.</p></article>';
    h += '<form id="qf">' + d.questions.map(function (qq, i) { var type = qq.multi ? 'checkbox' : 'radio'; return '<fieldset class="card"><legend>' + (i + 1) + '. ' + esc(qq.prompt) + (qq.critical ? ' <b>(health or safety)</b>' : '') + '</legend>' + qq.options.map(function (o) { return '<label class="opt"><input type="' + type + '" name="q' + esc(qq.id) + '" value="' + esc(o.id) + '"> ' + esc(o.label) + '</label>'; }).join('') + '</fieldset>'; }).join('') + '<button class="primary" type="submit">Submit answers</button></form>';
    if (ui.lastQuiz) h += '<div class="fb ' + (ui.lastQuiz.passed ? 'ok' : 'bad') + '" role="status">' + ui.lastQuiz.score + '% ' + (ui.lastQuiz.passed ? 'Passed.' : 'Not yet.' + (ui.lastQuiz.criticalMissed ? ' A health or safety question was missed.' : '')) + '</div>';
    return h + '</article>';
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('button'); if (!t || !E) return;
    if (t.dataset.go != null) { cur = t.dataset.go === 'quiz' ? 'quiz' : +t.dataset.go; ui.lastQuiz = null; render(); }
    else if (t.dataset.done != null) { var r = E.completeLesson(C.lessons[cur].id); if (!r.ok) el('why').textContent = r.reason; else render(); }
    else if (t.dataset.mv != null) { var sec = t.closest('[data-item]'), it = itemFor(sec), s = u(it.id), i = +t.dataset.mv, j = i + +t.dataset.dir; var x = s.order[i]; s.order[i] = s.order[j]; s.order[j] = x; render(); }
    else if (t.dataset.hs != null) { var sec2 = t.closest('[data-item]'), it2 = itemFor(sec2), s2 = u(it2.id), k = s2.sel.indexOf(t.dataset.hs); if (k >= 0) s2.sel.splice(k, 1); else s2.sel.push(t.dataset.hs); render(); }
    else if (t.dataset.submit != null) { var sec3 = t.closest('[data-item]'), it3 = itemFor(sec3), s3 = u(it3.id); var ta = sec3.querySelector('[data-text]'); if (ta) s3.text = ta.value; s3.res = E.answerItem(it3.id, answerOf(it3, s3)); render(); }
  });
  document.addEventListener('change', function (e) { var sec = e.target.closest('[data-item]'); if (!sec) return; var it = itemFor(sec), s = u(it.id), i = e.target; if (i.type === 'radio') s.sel = [i.value]; else if (i.type === 'checkbox') { var k = s.sel.indexOf(i.value); if (i.checked && k < 0) s.sel.push(i.value); if (!i.checked && k >= 0) s.sel.splice(k, 1); } });
  document.addEventListener('submit', function (e) { if (e.target.id !== 'qf') return; e.preventDefault(); var d = E.state.quiz.draw, a = {}; d.questions.forEach(function (q) { a[q.id] = Array.prototype.map.call(e.target.querySelectorAll('input[name="q' + q.id + '"]:checked'), function (i) { return i.value; }); }); ui.lastQuiz = E.submitQuiz(a); render(); });
  function itemFor(sec) { var id = sec.getAttribute('data-item'), r = null; C.lessons.forEach(function (l) { (l.items || []).forEach(function (i) { if (i.id === id) r = i; }); }); return r; }
  var last = Date.now(); ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(function (ev) { window.addEventListener(ev, function () { last = Date.now(); }, true); });
  window.addEventListener('load', function () {
    E = window.FFEngine.create(C, S, {}); var ok = E.init();
    el('conn').textContent = ok ? '' : 'This course is not connected to an LMS: progress will not be recorded.';
    render(); setInterval(function () { E.beat(document.visibilityState === 'visible', (Date.now() - last) / 1000); }, 15000);
  });
  function bye() { if (E) E.finish(); } window.addEventListener('beforeunload', bye); window.addEventListener('pagehide', bye);
})();
`;

function indexHtml(course) {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${xmlEsc(course.title)}</title><link rel="stylesheet" href="style.css"></head>
<body><header><h1>${xmlEsc(course.title)}</h1><p>Futures Friends Academy · ${xmlEsc(String(course.clock_hours))} clock hours · version ${xmlEsc(String(course.version))}</p></header>
<main><p class="note" id="conn" role="status"></p><div id="app" aria-live="polite"></div></main>
<script src="scorm-api.js"></script><script src="engine.js"></script><script src="course.js"></script><script src="player.js"></script></body></html>
`;
}

// bundle: the JSON from training_scorm_bundle. opts.assets: {storagePath: Uint8Array} for hotspot images (optional).
function buildPackage(bundle, opts) {
  opts = opts || {};
  const course = JSON.parse(JSON.stringify(bundle)), files = [], assets = opts.assets || {};
  const c = course.course;
  const data = { course: c, review: course.review || null, lessons: course.lessons, quizzes: course.quizzes };
  for (const l of data.lessons) for (const it of l.items || []) {
    if (it.media_path && assets[it.media_path]) {
      const name = 'assets/' + idSafe(it.id) + '-' + String(it.media_path).split('/').pop().replace(/[^A-Za-z0-9._-]/g, '_');
      files.push({ path: name, data: assets[it.media_path] }); it.media_path = name;
    } else if (it.media_path) it.media_path = null;
  }
  const body = [
    ['index.html', indexHtml(c)], ['style.css', PLAYER_CSS], ['scorm-api.js', SCORM_API_JS], ['engine.js', ENGINE_JS],
    ['course.js', 'window.FF_COURSE = ' + jsonForScript(data) + ';\n'], ['player.js', PLAYER_JS],
  ].map(([path, text]) => ({ path, data: text }));
  const all = [...body, ...files];
  const manifest = manifestXml(c, course.review, all.map(f => f.path), data.quizzes && data.quizzes[0]);
  const out = [{ path: 'imsmanifest.xml', data: manifest }, ...all];
  const problems = validateManifest(manifest, out.map(f => f.path));
  if (problems.length) throw new Error('the generated manifest is not valid SCORM 1.2: ' + problems.join('; '));
  return { files: out, manifest };
}

const api = { buildPackage, zip, unzip, crc32, validateManifest, parseXml, manifestXml, ENGINE_JS, SCORM_API_JS, PLAYER_JS, PLAYER_CSS };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FFScorm = api;
})(typeof window !== 'undefined' ? window : globalThis);
