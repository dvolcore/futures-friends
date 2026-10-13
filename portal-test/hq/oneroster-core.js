// N17: OneRoster 1.1 CSV files (the IMS Global CSV binding districts and student-information systems export) turned into the roster
// import's own table, so everything after this (column mapping, the database dry run roster_import_preview with source 'oneroster', the
// commit, held invitations, undo) is the existing roster import (hub/ROSTER_IMPORT.md). Pure: no DOM, no network.
//
// Files read (by their header line, so the file names do not matter):
//   users.csv        sourcedId, status, enabledUser, orgSourcedIds, role, givenName, familyName, email, sms, phone, agentSourcedIds, ...
//   classes.csv      sourcedId, status, title, classCode, schoolSourcedId, ...
//   enrollments.csv  sourcedId, status, classSourcedId, schoolSourcedId, userSourcedId, role, primary, beginDate, endDate
//   demographics.csv sourcedId (= the user's), birthDate, ...          optional
//   orgs.csv         sourcedId, name, type, ...                        optional (school names for the school choice)
// What becomes what:
//   a student enrolled (role student) in a class -> one child; the class title is the room (matched by name, created if new)
//   the student's agents with role parent / guardian -> guardian 1 and 2 (email, phone); relative -> emergency contact
//   demographics birthDate -> date of birth; the enrollment's beginDate -> start date
//   teachers (and aides) enrolled in the classes -> LISTED on the screen, never imported (staff come through hiring or an invitation)
// Records with status "tobedeleted", users with enabledUser false and enrollments that ended before `today` are left out.
import { parseCsv } from './roster-import-core.js';

// the columns of the table this produces (all are roster-import template headers, so autoMap maps them by itself)
export const OR_HEADERS = ['child_first', 'child_last', 'child_dob', 'room', 'start_date',
  'g1_first', 'g1_last', 'g1_relationship', 'g1_email', 'g1_phone', 'g2_first', 'g2_last', 'g2_relationship', 'g2_email', 'g2_phone',
  'e1_name', 'e1_relationship', 'e1_phone'];

const KIND_BY_HEADERS = [
  ['enrollments', ['classsourcedid', 'usersourcedid', 'role']],
  ['users', ['sourcedid', 'role', 'givenname', 'familyname']],
  ['classes', ['sourcedid', 'title', 'schoolsourcedid']],
  ['demographics', ['sourcedid', 'birthdate']],
  ['orgs', ['sourcedid', 'name', 'type']],
];
const low = (s) => String(s ?? '').trim().toLowerCase();

// Which OneRoster file this is, from its header line (or null).
export function oneRosterKind(headers) {
  const h = new Set(headers.map(low));
  for (const [kind, need] of KIND_BY_HEADERS) if (need.every((x) => h.has(x))) return kind;
  return null;
}

// Do these files look like a OneRoster set? (users + enrollments at least)
export function looksLikeOneRoster(texts) {
  const kinds = new Set(texts.map((t) => oneRosterKind(parseCsv(t).headers)));
  return kinds.has('users') && kinds.has('enrollments');
}

function records(text) {
  const { headers, rows } = parseCsv(text);
  const keys = headers.map(low);
  return rows.map((r) => Object.fromEntries(keys.map((k, i) => [k, r[i] ?? ''])));
}
const live = (r) => low(r.status) !== 'tobedeleted';
const ids = (v) => String(v ?? '').split(',').map((x) => x.trim()).filter(Boolean);
const ymd = (v) => { const m = String(v ?? '').trim().match(/^(\d{4}-\d{2}-\d{2})/); return m ? m[1] : ''; };

// texts: the CSV texts (any order). opts: { today: 'YYYY-MM-DD', school: sourcedId or '' (all) }.
// -> { headers, rows, teachers: [{ name, email, classes }], schools: [{ id, name }], warnings: [], counts }
export function oneRosterToTable(texts, { today = new Date().toISOString().slice(0, 10), school = '' } = {}) {
  const files = {};
  for (const t of texts) { const k = oneRosterKind(parseCsv(t).headers); if (k && !files[k]) files[k] = records(t); }
  if (!files.users || !files.enrollments) throw new Error('OneRoster needs at least users.csv and enrollments.csv');
  const warnings = [];
  const users = new Map(files.users.filter(live).filter((u) => low(u.enableduser) !== 'false').map((u) => [u.sourcedid, u]));
  const classes = new Map((files.classes || []).filter(live).map((c) => [c.sourcedid, c]));
  const birth = new Map((files.demographics || []).filter(live).map((d) => [d.sourcedid, ymd(d.birthdate)]));
  const orgs = new Map((files.orgs || []).filter(live).map((o) => [o.sourcedid, o]));
  if (!files.classes) warnings.push('No classes.csv: rooms are named by the class id.');
  const enr = files.enrollments.filter(live).filter((e) => !ymd(e.enddate) || ymd(e.enddate) >= today)
    .filter((e) => !school || e.schoolsourcedid === school || classes.get(e.classsourcedid)?.schoolsourcedid === school);
  const schoolIds = [...new Set(files.enrollments.filter(live).map((e) => e.schoolsourcedid || classes.get(e.classsourcedid)?.schoolsourcedid).filter(Boolean))];
  const schools = schoolIds.map((id) => ({ id, name: orgs.get(id)?.name || id }));
  const room = (cid) => { const c = classes.get(cid); return (c && (c.title || c.classcode)) || cid; };

  // one class per student: the primary enrollment, else the first
  const byStudent = new Map();
  for (const e of enr) {
    if (low(e.role) !== 'student') continue;
    const u = users.get(e.usersourcedid);
    if (!u || low(u.role) !== 'student') continue;
    const prev = byStudent.get(u.sourcedid);
    if (!prev) byStudent.set(u.sourcedid, e);
    else {
      if (low(e.primary) === 'true' && low(prev.primary) !== 'true') byStudent.set(u.sourcedid, e);
      warnings.push(`${u.givenname} ${u.familyname}: in more than one class; using ${room(byStudent.get(u.sourcedid).classsourcedid)}.`);
    }
  }
  const rows = [];
  for (const [sid, e] of byStudent) {
    const s = users.get(sid);
    const agents = ids(s.agentsourcedids).map((a) => users.get(a)).filter(Boolean);
    const guardians = agents.filter((a) => ['parent', 'guardian'].includes(low(a.role))).slice(0, 2);
    const relative = agents.find((a) => low(a.role) === 'relative');
    if (!guardians.length) warnings.push(`${s.givenname} ${s.familyname}: no parent or guardian in the file.`);
    const g = (n, k) => { const a = guardians[n]; if (!a) return ''; return { first: a.givenname, last: a.familyname, rel: low(a.role) === 'parent' ? 'Parent' : 'Guardian', email: a.email, phone: a.phone || a.sms }[k] || ''; };
    rows.push([s.givenname, s.familyname, birth.get(sid) || '', room(e.classsourcedid), ymd(e.begindate),
      g(0, 'first'), g(0, 'last'), g(0, 'rel'), g(0, 'email'), g(0, 'phone'), g(1, 'first'), g(1, 'last'), g(1, 'rel'), g(1, 'email'), g(1, 'phone'),
      relative ? `${relative.givenname} ${relative.familyname}`.trim() : '', relative ? 'Relative' : '', relative ? (relative.phone || relative.sms || '') : '']
      .map((x) => String(x ?? '')));
  }
  const teach = new Map();
  for (const e of enr) {
    if (!['teacher', 'aide'].includes(low(e.role))) continue;
    const u = users.get(e.usersourcedid);
    if (!u) continue;
    const t = teach.get(u.sourcedid) || { name: `${u.givenname} ${u.familyname}`.trim(), email: u.email || '', classes: [] };
    if (!t.classes.includes(room(e.classsourcedid))) t.classes.push(room(e.classsourcedid));
    teach.set(u.sourcedid, t);
  }
  rows.sort((a, b) => (a[3] + a[1] + a[0]).localeCompare(b[3] + b[1] + b[0]));
  return { headers: [...OR_HEADERS], rows, teachers: [...teach.values()], schools, warnings,
    counts: { students: rows.length, classes: new Set(rows.map((r) => r[3])).size, teachers: teach.size } };
}
