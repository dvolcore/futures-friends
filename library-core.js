/* Resource Library: the logic both the hosted Hub and the public demo share (permissions, search, filters, "New this week", "Today").
   One source: hub/web/library-core.js. The website demo gets a byte-identical copy written by hub/scripts/build-library.mjs --site, so the two
   can never disagree about who may see or send what. Plain script (no import/export): it sets window.FFLibraryCore in a page and
   module.exports under CommonJS. No DOM, no network, no clock of its own: every function takes what it needs, so tests drive it directly. */
var FFLibraryCore = (function () {
  'use strict';

  var ROLES = ['director', 'teacher', 'family'];
  var AGE_LABEL = { twos: 'Twos', threes: 'Threes', prek: 'Pre-K' };
  var STATUS_LABEL = { ready: 'Ready', draft: 'Draft', review: 'Needs review', soon: 'Coming soon' };
  var TYPE_LABEL = { pdf: 'PDF', image: 'Image', video: 'Video', captions: 'Captions', text: 'Text', data: 'Data', link: 'Link', email: 'Email', recipe: 'Recipe', colors: 'Colors' };

  // ---- permissions ---------------------------------------------------------------------------------------------------------
  // The matrix (owner decisions 2026-10-07): directors and the owner see and send everything; teachers see everything that is not director-only
  // or financial and may SEND only what is made for families; families have no library; money is directors and the owner only.
  // A staff member whose own permissions lack the classroom (hours-only) gets no library: the caller passes role 'none' for them.
  function normRole(role) { return role === 'director' || role === 'owner' ? 'director' : role === 'teacher' ? 'teacher' : role === 'family' ? 'family' : 'none'; }
  function canView(item, role) {
    var r = normRole(role);
    if (r === 'director') return true;
    if (r === 'teacher') return item.vis !== 'director' && !item.financial;
    return false;
  }
  function canSend(item, role) {
    var r = normRole(role);
    if (!item || !item.sendable || item.status === 'soon') return false;
    if (r === 'director') return true;
    if (r === 'teacher') return !!item.family_facing && !item.financial && item.vis !== 'director';
    return false;
  }
  // ---- approval and audience gate (audit A2) ---------------------------------------------------------------------------------
  // Only an item whose status is "ready" (approved) may go to families, and only if it is made for families. Draft, review and
  // coming-soon items, internal items, staff-only items and money items never go to families; the most a director may do with
  // an internal or unapproved item is send it to staff.
  function isApproved(item) { return !!item && item.status === 'ready'; }
  function audienceOf(item) { return item && item.family_facing && !item.financial && item.vis !== 'director' ? 'families' : 'staff'; }
  function audiences(item, role) {
    var r = normRole(role), out = [];
    if (!canSend(item, role)) return out;
    if (isApproved(item) && audienceOf(item) === 'families') out.push('families');
    if (r === 'director') out.push('staff');
    return out;
  }
  function canSendTo(item, role, audience) { return audiences(item, role).indexOf(audience) !== -1; }
  var NOT_APPROVED = 'Not approved for sending yet';
  function sendReason(item, role, audience) {
    var r = normRole(role);
    if (!item.sendable || item.status === 'soon') return item.status === 'soon' ? 'Not made yet, so there is nothing to send.' : 'This is reference material, not something to send.';
    if (r === 'teacher' && item.financial) return 'Money items are for directors and the owner only.';
    if (r === 'teacher' && !item.family_facing) return 'Teachers can send items made for families. Ask your director to send this one.';
    if (r !== 'director' && r !== 'teacher') return 'Sending is for directors and teachers.';
    if (audience === 'families' || !audience) {
      if (!isApproved(item)) return NOT_APPROVED + '. It is a ' + (item.status === 'review' ? 'review copy' : 'draft') + ', so it cannot go to families.';
      if (audienceOf(item) !== 'families') return 'Staff only. This item is for your team, so it can be sent to staff but not to families.';
    }
    return '';
  }
  // true counts, computed from the catalog (never typed in)
  function statusCounts(items) {
    var c = { ready: 0, review: 0, draft: 0, soon: 0, total: 0 };
    (items || []).forEach(function (i) { if (c[i.status] != null) c[i.status] += 1; c.total += 1; });
    return c;
  }
  function countsLine(c) { return c.ready + ' ready · ' + c.review + ' in review · ' + c.draft + (c.draft === 1 ? ' draft' : ' drafts') + ' · ' + c.soon + ' coming'; }
  function visibleItems(items, role) { return items.filter(function (i) { return canView(i, role); }); }

  // ---- search and filters --------------------------------------------------------------------------------------------------
  function haystack(i) {
    if (i._hay) return i._hay;
    var h = [i.title, i.desc, i.sub, i.kind, (i.tags || []).join(' '), i.cal || '', i.d ? 'day ' + i.d : '', i.unit ? 'unit ' + i.unit : '',
      i.week ? 'week ' + i.week : '', (i.age || []).map(function (a) { return AGE_LABEL[a]; }).join(' '), i.lang === 'es' || i.lang === 'bi' ? 'spanish espanol español' : 'english',
      STATUS_LABEL[i.status] || '', TYPE_LABEL[i.type] || ''].join(' ').toLowerCase();
    try { Object.defineProperty(i, '_hay', { value: h, enumerable: false }); } catch (e) { /* frozen */ }
    return h;
  }
  function matchesQuery(i, q) {
    var toks = String(q || '').toLowerCase().split(/\s+/).filter(Boolean);
    if (!toks.length) return true;
    var h = haystack(i);
    return toks.every(function (t) { return h.indexOf(t) !== -1; });
  }
  // f: { q, group, age, lang ('en'|'es'), status, unit, week (calendar week), day (1..180), sub }
  function filterItems(items, f) {
    f = f || {};
    return items.filter(function (i) {
      if (f.group && i.group !== f.group && (i.also || []).indexOf(f.group) === -1) return false;
      if (f.sub && i.sub !== f.sub) return false;
      if (f.age && (i.age || []).indexOf(f.age) === -1) return false;
      if (f.lang && !(i.lang === f.lang || i.lang === 'bi')) return false;
      if (f.status && i.status !== f.status) return false;
      if (f.unit && Number(i.unit) !== Number(f.unit)) return false;
      if (f.week && Number(i.cal_week) !== Number(f.week)) return false;
      if (f.day && Number(i.d) !== Number(f.day)) return false;
      return matchesQuery(i, f.q);
    });
  }
  function groupCounts(items, groups) {
    var c = {};
    groups.forEach(function (g) { c[g.key] = 0; });
    items.forEach(function (i) { c[i.group] = (c[i.group] || 0) + 1; (i.also || []).forEach(function (g) { if (c[g] != null) c[g] += 1; }); });
    return c;
  }
  // items grouped by subgroup, in catalog order
  function bySub(items) {
    var order = [], map = {};
    items.forEach(function (i) { if (!map[i.sub]) { map[i.sub] = []; order.push(i.sub); } map[i.sub].push(i); });
    return order.map(function (s) { return { sub: s, items: map[s] }; });
  }

  // ---- "New this week": the newest things, one group at a time so one big batch does not fill the strip --------------------
  function newThisWeek(items, now, limit) {
    var cutoff = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
    var fresh = items.filter(function (i) { return i.added && i.added >= cutoff && i.status !== 'soon'; })
      .sort(function (a, b) { return a.added < b.added ? 1 : a.added > b.added ? -1 : a.id < b.id ? -1 : 1; });
    var buckets = {}, order = [];
    fresh.forEach(function (i) { if (!buckets[i.group]) { buckets[i.group] = []; order.push(i.group); } buckets[i.group].push(i); });
    var out = [], more = true;
    while (out.length < (limit || 8) && more) {
      more = false;
      for (var k = 0; k < order.length && out.length < (limit || 8); k++) { var b = buckets[order[k]]; if (b.length) { out.push(b.shift()); more = true; } }
    }
    return { items: out, total: fresh.length };
  }

  // ---- "Today": the day of the 180-day calendar --------------------------------------------------------------------------------
  function isoOf(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function fromIso(s) { var p = String(s).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  // the school year starts on the first Monday on or after August 24 (an illustrative start: a center sets its own)
  function defaultStart(date) {
    var y = date.getMonth() >= 6 ? date.getFullYear() : date.getFullYear() - 1;
    var d = new Date(y, 7, 24);
    while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
    return isoOf(d);
  }
  // school-day position (1 = first day), weekends roll to Monday; null before the start
  function position(dateIso, startIso) {
    var d = fromIso(dateIso), s = fromIso(startIso);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    if (d < s) return null;
    var n = 0, c = new Date(s);
    while (c <= d) { if (c.getDay() !== 0 && c.getDay() !== 6) n++; c.setDate(c.getDate() + 1); }
    return n;
  }
  function todayPlan(catalog, items, dateIso, startIso) {
    var cal = catalog.calendar, start = startIso || defaultStart(fromIso(dateIso)), pos = position(dateIso, start);
    var out = { start: start, position: pos, day: null, review: false, packet: null, startMonday: null, menu: null, move: null, family: null, label: '' };
    if (!pos) { out.label = 'The school year has not started yet.'; return out; }
    var day = null;
    // calendar.days lists every position (teaching and review days) by seq
    (cal.positions || cal.days).forEach(function (c) { if ((c.seq || c.d) === pos) day = c; });
    if (!day) { out.label = 'Past the last day of the calendar.'; return out; }
    out.day = day;
    if (day.review) { out.review = true; out.label = 'Review day ' + day.id + ' (no new packet)'; return out; }
    out.label = 'Day ' + day.d + ' of ' + cal.school_days + ' · Unit ' + day.unit + ', week ' + day.week;
    function one(re) { return items.filter(function (i) { return i.cal === day.id && re.test(i.kind); })[0] || null; }
    out.packet = one(/^teacher-packet$/); out.startMonday = one(/^start-monday$/); out.move = one(/^move-card$/);
    out.menu = items.filter(function (i) { return i.cal_week === day.cal_week && i.kind === 'menu-poster'; })[0] || null;
    out.family = items.filter(function (i) { return i.kind === 'family-week' && i.unit === day.unit && i.week === day.week && i.lang !== 'es'; })[0] || null;
    return out;
  }

  // ---- labels ---------------------------------------------------------------------------------------------------------------
  function sizeLabel(bytes) {
    if (bytes == null) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB';
    return (bytes / 1048576).toFixed(bytes < 10485760 ? 1 : 0) + ' MB';
  }
  function fileLabel(i) { var t = TYPE_LABEL[i.type] || ''; var s = sizeLabel(i.bytes); return [t, s].filter(Boolean).join(' · '); }
  function langLabel(i) { return i.lang === 'es' ? 'ES' : i.lang === 'bi' ? 'EN + ES' : 'EN'; }
  function ageLabel(i) {
    var a = i.age || [];
    if (!a.length) return 'Staff';
    if (a.length === 3) return 'Ages 2 to 5';
    return a.map(function (x) { return AGE_LABEL[x]; }).join(', ');
  }
  // what the preview shows for an item: a pdf / image / video viewer, a text reader, an email frame, or nothing to open
  function previewKind(i) {
    if (i.status === 'soon') return 'none';
    if (i.type === 'pdf') return 'pdf';
    if (i.type === 'image') return 'image';
    if (i.type === 'video') return 'video';
    if (i.type === 'email') return 'email';
    if (i.type === 'text' || i.type === 'recipe' || i.type === 'captions' || i.type === 'data') return 'text';
    if (i.type === 'colors') return 'colors';
    return 'link';
  }

  var api = { ROLES: ROLES, AGE_LABEL: AGE_LABEL, STATUS_LABEL: STATUS_LABEL, TYPE_LABEL: TYPE_LABEL, normRole: normRole, canView: canView, canSend: canSend, canSendTo: canSendTo, audiences: audiences, audienceOf: audienceOf, isApproved: isApproved, NOT_APPROVED: NOT_APPROVED, statusCounts: statusCounts, countsLine: countsLine, sendReason: sendReason,
    visibleItems: visibleItems, filterItems: filterItems, matchesQuery: matchesQuery, groupCounts: groupCounts, bySub: bySub, newThisWeek: newThisWeek, defaultStart: defaultStart,
    position: position, todayPlan: todayPlan, sizeLabel: sizeLabel, fileLabel: fileLabel, langLabel: langLabel, ageLabel: ageLabel, previewKind: previewKind, isoOf: isoOf, fromIso: fromIso };
  if (typeof window !== 'undefined') window.FFLibraryCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  return api;
})();
