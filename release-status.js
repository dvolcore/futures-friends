/* One status vocabulary for what exists and how far it has come (audit A3, 2026-10-08). Every page that says where a piece of the
   program stands uses these six words and these definitions, and the curriculum's true state comes from the list below, so the release
   manifest, the membership page and the curriculum pages cannot disagree.
   Loaded after release-manifest.js and before release-truth.js and offer-clarity.js. It changes nothing in the generated manifest file:
   it adds a "state" to each asset and corrects the unit wording of two curriculum assets in memory.
   Source of the unit states: the private platform repo (hub/content/program: unit-N-release.json, scope-and-sequence.json), checked
   2026-10-08. Update UNITS when a unit moves; nothing else on the site needs to change. Public text names states and counts only,
   never lesson content. */
(function () {
  'use strict';
  var STATES = [
    ['written', 'Written', 'A full draft exists. Nobody outside our team has reviewed it.'],
    ['reviewed', 'Reviewed', 'A second person on our team has read it and fixed what they found.'],
    ['approved', 'Approved', 'An early-childhood specialist has signed off on it.'],
    ['hosted', 'Hosted', 'It is on the live Futures Hub, where a program can open it.'],
    ['released', 'Released', 'It is in a published release that programs can receive.'],
    ['delivered', 'Delivered', 'It has reached a program that uses it.']
  ];
  var ORDER = STATES.map(function (s) { return s[0]; });
  var LABEL = {}, DEF = {};
  STATES.forEach(function (s) { LABEL[s[0]] = s[1]; DEF[s[0]] = s[2]; });

  // Curriculum units. stage: 'merged' (written and merged into the private platform), 'qc' (written, in quality check),
  // 'writing' (being written). All are drafts. None is approved, hosted, released or delivered.
  var UNITS = [];
  for (var n = 1; n <= 12; n++) UNITS.push({ n: n, stage: n <= 10 ? 'merged' : n === 11 ? 'qc' : 'writing', state: n <= 11 ? 'written' : null });

  var written = UNITS.filter(function (u) { return u.state === 'written'; }).length;
  var approved = UNITS.filter(function (u) { return ORDER.indexOf(u.state) >= ORDER.indexOf('approved'); }).length;
  var range = function (a, b) { return a === b ? 'Unit ' + a : 'Units ' + a + ' to ' + b; };

  var curriculum = {
    written: written, approved: approved,
    // one sentence for public pages
    short: range(1, written) + ' are written as drafts, and none is approved yet. ' + range(written + 1, 12) + (written + 1 === 12 ? ' is' : ' are') + ' being written.',
    // the full state, for the membership page and the manifest
    long: range(1, written) + ' are written as drafts on our private platform: ' + range(1, 10) + ' are merged, Unit 11 is in quality check and Unit 12 is being written. No early-childhood specialist has approved any unit yet, and none is hosted, released or delivered through the Futures Hub yet.',
    parenthetical: range(1, written) + ' written as drafts, none approved yet; Unit 12 in writing'
  };

  // an asset's state: how far the piece has come. approval says who has checked it; availability can lift it to "released".
  function stateOf(a) {
    if (!a || a.approval === 'not_started' || !a.approval) return null;
    var s = a.approval === 'externally_approved' ? 'approved' : a.approval === 'internally_complete' ? 'reviewed' : 'written';
    if (a.availability === 'available_now' && ORDER.indexOf(s) < ORDER.indexOf('released')) s = 'released';
    return s;
  }
  function chipText(a) { var s = stateOf(a); return s ? LABEL[s] : 'Not started'; }

  // The monthly-fee trigger (audit A10): one sentence, used verbatim everywhere it appears on the site. Proposed terms; the owner confirms.
  var FEE_TRIGGER = 'The monthly fee starts only when your program\u2019s Hub is live and Unit 2 is delivered.';
  var FEE_RE = /(?:The monthly fee: )?(?:it begins only when the Hub is live for your program and Unit 2 is delivered|the monthly fee begins only when the Futures Hub is live for your program and Unit 2 is delivered|no recurring fee before the Futures Hub is live for your rooms and Unit 2 is delivered|billing begins the month the Hub is live for your program)\./gi;
  function unify(v) {
    if (typeof v === 'string') return v.replace(FEE_RE, function (m) { return FEE_TRIGGER; });
    if (Array.isArray(v)) { for (var i = 0; i < v.length; i++) v[i] = unify(v[i]); return v; }
    if (v && typeof v === 'object') { Object.keys(v).forEach(function (k) { v[k] = unify(v[k]); }); }
    return v;
  }

  var api = { feeTrigger: FEE_TRIGGER, STATES: STATES, ORDER: ORDER, LABEL: LABEL, DEF: DEF, UNITS: UNITS, curriculum: curriculum, stateOf: stateOf, chipText: chipText,
    legend: function () { return STATES.map(function (s) { return s[1] + ': ' + s[2]; }).join(' '); } };

  var R = typeof window !== 'undefined' ? window.FFReleaseData : null;
  if (R && R.assets) {
    Object.keys(R.assets).forEach(function (id) { var a = R.assets[id], s = stateOf(a); a.state = s; a.stateLabel = s ? LABEL[s] : 'Not started'; });
    var u = R.assets['curriculum-units-2-12'];
    if (u) {
      u.version = 'outline v1.0; daily plans are drafts';
      u.note = 'Units 2 to 11 are written as drafts: Units 2 to 10 are merged into our private platform and Unit 11 is in quality check. Unit 12 is being written. None is approved by an early-childhood specialist yet. Daily plans are for educators in the Teacher Portal; the public website shows summaries only.';
    }
    var d1 = R.assets['curriculum-unit1-days'];
    if (d1) d1.note = 'Unit 1: twenty days of teaching plans for twos, threes and pre-K. Written as a draft: no early-childhood specialist has approved it yet. The full plans are for educators at a Futures Friends program, in the Teacher Portal; the public website shows a summary only.';
    unify(R);
    R.statusVocabulary = STATES.map(function (s) { return { key: s[0], label: s[1], definition: s[2] }; });
  }
  if (typeof window !== 'undefined') window.FFStatus = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
