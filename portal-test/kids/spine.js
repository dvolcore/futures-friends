// Futures Hub front-end: the director / owner home ("the spine"). Mounted by app.js on /c/<slug>/home for directors only.
// Ideas from the QEP CEO Operating Spine, in Futures Friends' own look:
//   1. "Where these figures come from": every source's state is DERIVED from what the Hub actually returned on this load
//      (measured / measured but stale / modelled / not connected / could not load), never typed. Absent is not zero: a source
//      that is not connected shows "—" and "not connected", never 0. Stale is not "not connected": stale stopped, not
//      connected never started.
//   2. Decision-first front door: greeting, one derived sentence, then "Only you can make these" cards. A card exists only
//      while its condition is true; with none true the section says so.
//   3. "Measures off target": one row per measure (dot, measure, provenance chip, value + bar vs target, owner, status,
//      due + ageing). No trend column: the Hub keeps no history for these yet, and a trend is never faked.
//   4. Motion that settles: reveals (rise 16px, .6s, 65ms stagger, failsafe), count-ups that land on the true value
//      (and are the true value in print, hidden tabs and reduced motion). No loops.
// Role rules (permissions.js): this view is for directors and owners. Money (billing, subsidy) is derived only when the
// caller says the viewer is a director; HQ / support never reach this page (they are not members), and nothing here widens
// what row-level security returns. No child names are shown on this page. Programs serve ages 2 to 5.
//
// The derivation functions are pure and run in Node (tests/hub-spine.test.mjs); render/motion touch the DOM only when called.

export const STALE_HOURS = { clock: 24 * 7 };     // a feed that should move weekly; others have no staleness rule
import { fmtDate, fmtTime, uiLang, localeOf } from './i18n.js';
import { centerHour, centerToday } from './center-time.js';   // the person's language (staff Spanish: hub/I18N_COVERAGE.md)

export const DAY = 86400000;

// ---- small helpers ---------------------------------------------------------------------------------------------------------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
export const words = (n) => (n >= 0 && n <= 10 ? WORDS[n] : String(n));
const lc = (s) => (/^[A-Z]{2}/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));   // keeps acronyms (CACFP)
const plural = (n, one, many) => (n === 1 ? one : many);
const joinAnd = (xs) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
// a calendar date (YYYY-MM-DD or Date) to a UTC midnight number, so day differences ignore the clock and time zones
const dayNum = (d) => {
  if (!d) return null;
  if (d instanceof Date) return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : null;
};
export const daysBetween = (from, to) => { const a = dayNum(from), b = dayNum(to); return a == null || b == null ? null : Math.round((b - a) / DAY); };
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const shortDate = (d) => { const n = dayNum(d); if (n == null) return null; const x = new Date(n); return uiLang() === 'es' ? fmtDate(x, { month: 'short', day: 'numeric', timeZone: 'UTC' }) : `${MON[x.getUTCMonth()]} ${x.getUTCDate()}`; };
const latest = (xs) => xs.filter(Boolean).map((x) => new Date(x)).filter((x) => !Number.isNaN(+x)).sort((a, b) => b - a)[0] || null;
const money = (cents) => `$${Math.round(cents / 100).toLocaleString(localeOf())}`;
// share() returns null without a denominator: a bare percent is never shown
export const share = (part, whole) => (whole > 0 && part != null ? part / whole : null);
export function daypart(hour) { return hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'; }

// ---- loading: every source on its own; one failing source never blanks the page -----------------------------------------
// Each source becomes { ok: true, data, at } | { ok: false, error } | { skipped: true, why } (not this viewer's to see).
async function source(fn) {
  try { return { ok: true, data: await fn(), at: new Date() }; } catch (error) { return { ok: false, error: String(error?.message || error) }; }
}
const unwrap = (r) => { if (r?.error) throw r.error; return r?.data; };

export async function loadSpine({ c, rpc, client }) {
  const director = c.role === 'director';
  const cid = c.center_id;
  const skip = (why) => Promise.resolve({ skipped: true, why });
  const [exceptions, capacity, intakes, requests, whosIn, grants, staff, billing, invoices] = await Promise.all([
    source(() => rpc('director_exceptions', { p_center: cid })),
    source(() => rpc('center_room_capacity', { p_center: cid })),
    source(() => rpc('intake_list', { p_center: cid })),
    source(() => rpc('staff_punch_requests_list', { p_center: cid, p_status: 'pending' })),
    source(() => rpc('timeclock_whos_in', { p_center: cid })),
    source(() => rpc('support_grants_for_center', { p_center: cid })),
    source(() => rpc('center_staff_list', { p_center: cid })),
    // money: directors and owners only (row-level security says the same; this keeps the page from even asking)
    director ? source(async () => unwrap(await client().from('center_billing').select('ledger_ready, charges_enabled, updated_at').eq('center_id', cid).maybeSingle())) : skip('directors only'),
    director ? source(async () => unwrap(await client().from('invoices').select('status, family_cents, subsidy_cents, due_date, invoice_date')
      .eq('center_id', cid).in('status', ['open', 'past_due']).limit(500))) : skip('directors only'),
  ]);
  // today / hour: the CENTER's day and hour (its time zone, center-time.js), not the device's (hub/TIME_ZONES.md)
  const asOf = new Date();
  return { center: { id: cid, slug: c.slug, name: c.name }, role: c.role, isOwner: !!c.is_owner, asOf, today: centerToday(asOf), hour: centerHour(asOf),
    src: { exceptions, capacity, intakes, requests, whosIn, grants, staff, billing, invoices } };
}

// ---- 1. provenance -----------------------------------------------------------------------------------------------------------
// state: measured | stale | modelled | nc (not connected) | unavailable (asked, failed: the alarm cannot switch itself off)
export const STATE = {
  measured: { label: 'Measured', tone: 'measured' }, stale: { label: 'Measured, stale', tone: 'stale' },
  modelled: { label: 'Modelled', tone: 'modelled' }, nc: { label: 'Not connected', tone: 'nc' }, unavailable: { label: 'Could not load', tone: 'unavailable' },
};

export function deriveFeeds(d) {
  const s = d.src, now = d.asOf, director = d.role === 'director';
  const feeds = [];
  const add = (key, name, system, r, fn) => {
    if (!r || r.skipped) return;                       // not this viewer's source: not listed at all (never "0")
    if (!r.ok) { feeds.push({ key, name, system, state: 'unavailable', updated: null, note: 'The Hub did not answer for this source on this load.' }); return; }
    feeds.push({ key, name, system, ...fn(r) });
  };
  add('staff', 'Staff files and certificates', 'Hub: background checks, cards, training, incidents', s.exceptions,
    (r) => ({ state: 'measured', updated: r.at, updatedLabel: 'checked live', note: `${r.data.length} open ${plural(r.data.length, 'item', 'items')}` }));
  add('rooms', 'Licensed room capacity', 'Hub rooms + CRM classroom capacity', s.capacity, (r) => {
    const rooms = r.data || [], known = rooms.filter((x) => x.capacity != null);
    if (!rooms.length) return { state: 'nc', updated: null, note: 'No rooms yet: add them in Center settings.' };
    if (!known.length) return { state: 'nc', updated: null, note: 'No licensed capacity on file for any room (set it on the classroom in the CRM).' };
    return { state: 'measured', updated: r.at, updatedLabel: 'checked live',
      note: known.length < rooms.length ? `${rooms.length - known.length} of ${rooms.length} rooms have no capacity on file` : `${rooms.length} ${plural(rooms.length, 'room', 'rooms')}` };
  });
  add('enroll', 'Enrollment packets', 'Hub enrollment desk', s.intakes, (r) => {
    const u = latest((r.data || []).flatMap((i) => [i.created_at, i.saved_at, i.submitted_at, i.reviewed_at]));
    return { state: 'measured', updated: u, note: (r.data || []).length ? null : 'No packets sent yet' };
  });
  if (s.requests && s.whosIn) {
    const r = s.requests.ok && s.whosIn.ok ? { ok: true, data: [...(s.requests.data || []), ...(s.whosIn.data || [])] } : { ok: false };
    add('clock', 'Staff time clock', 'Hub time clock', r, (x) => {
      const u = latest(x.data.flatMap((p) => [p.in_at, p.created_at]));
      const age = u ? (now - u) / 3600000 : null;
      return { state: age != null && age > STALE_HOURS.clock ? 'stale' : 'measured', updated: u, note: u ? null : 'Nobody clocked in right now' };
    });
  }
  add('support', 'Support access requests', 'Hub support desk', s.grants, (r) => ({ state: 'measured', updated: latest((r.data || []).map((g) => g.requested_at)) }));
  if (director) {
    add('billing', 'Tuition billing', 'Hub billing ledger', s.billing.ok && s.invoices && !s.invoices.ok ? { ok: false } : s.billing, (r) => {
      if (!r.data) return { state: 'nc', updated: null, note: 'Billing is not set up yet (Billing tab).' };
      if (!r.data.ledger_ready) return { state: 'nc', updated: null, note: 'Billing set-up is not finished.' };
      const u = latest([r.data.updated_at, ...((s.invoices?.data) || []).map((i) => i.invoice_date)]);
      return { state: 'measured', updated: u };
    });
    if (s.billing && !s.billing.skipped) {
      feeds.push({ key: 'payments', name: 'Online card payments', system: 'Stripe', state: s.billing.ok && s.billing.data?.charges_enabled ? 'measured' : 'nc',
        updated: null, note: s.billing.ok && s.billing.data?.charges_enabled ? 'Charges enabled' : 'Not connected: payments are recorded by hand.' });
    }
    // No connection to these exists in the Hub yet: they are always "not connected", and their figures are absent.
    feeds.push({ key: 'subsidy', name: 'State subsidy portal', system: 'Not built yet', state: 'nc', updated: null, note: 'Reimbursements owed by the state are absent, not zero.' });
    feeds.push({ key: 'cacfp', name: 'CACFP meal claims', system: 'Not built yet', state: 'nc', updated: null, note: 'Meal-claim money is absent, not zero.' });
  }
  return feeds;
}

export function provenance(feeds) {
  const by = (st) => feeds.filter((f) => f.state === st);
  const n = { measured: by('measured').length, stale: by('stale').length, modelled: by('modelled').length, nc: by('nc').length, unavailable: by('unavailable').length };
  const names = (st) => joinAnd(by(st).map((f) => f.name));
  const parts = [`${words(n.measured)} of ${feeds.length} sources behind this page ${plural(n.measured, 'is', 'are')} measured in the Hub and current`];
  if (n.stale) parts.push(`${lc(words(n.stale))} ${plural(n.stale, 'is', 'are')} measured but stale (${names('stale')})`);
  if (n.modelled) parts.push(`${lc(words(n.modelled))} ${plural(n.modelled, 'is', 'are')} modelled (${names('modelled')})`);
  if (n.nc) parts.push(`${lc(words(n.nc))} ${plural(n.nc, 'is', 'are')} not connected (${names('nc')}), so anything downstream of ${plural(n.nc, 'it', 'them')} is absent rather than estimated`);
  if (n.unavailable) parts.push(`${lc(words(n.unavailable))} could not be loaded (${names('unavailable')}): reload before trusting a blank`);
  const tone = n.unavailable ? 'unavailable' : n.nc ? 'nc' : n.stale || n.modelled ? 'stale' : 'measured';
  const chips = Object.entries(n).filter(([, v]) => v > 0).map(([k, v]) => ({ state: k, n: v, label: STATE[k].label, detail: by(k).map((f) => f.name).join(', ') }));
  return { n, chips, tone, line: `${parts.join('; ')}.` };
}

// ---- 2. measures ------------------------------------------------------------------------------------------------------------
// band: ok | watch | off | severe | nc (absent) | unknown
export function bandFor(att) { return att == null ? 'unknown' : att >= 0.9 ? 'ok' : att >= 0.75 ? 'watch' : att >= 0.5 ? 'off' : 'severe'; }
const BLOCKED = new Set(['clearance_pending', 'clearance_expired', 'clearance_on_hold', 'clearance_no_rule']);
const OWNER = { director: 'You', hq: 'Futures Friends HQ', staff: 'Staff member' };

function ageing(items, today) {
  // due + ageing: "Nd untouched" only for work nobody has started (no retry, no escalation) and that is already due
  const dated = items.filter((i) => i.due_date).sort((a, b) => dayNum(a.due_date) - dayNum(b.due_date));
  const first = dated[0];
  if (!first) return { due: null, age: null, untouched: null };
  const late = daysBetween(first.due_date, today);
  const touched = items.some((i) => i.escalated_at || i.retry_requested_at);
  if (late > 0 && !touched) return { due: first.due_date, age: `${late}d untouched`, untouched: late };
  if (late > 0) return { due: first.due_date, age: items.some((i) => i.escalated_at) ? 'escalated' : 'retry requested', untouched: null };
  if (late === 0) return { due: first.due_date, age: 'due today', untouched: null };
  return { due: first.due_date, age: `in ${-late}d`, untouched: null };
}
const statusOf = (items) => (items.some((i) => i.escalated_at) ? 'Escalated to HQ' : items.some((i) => i.retry_requested_at) ? 'Retry requested' : 'Not started');
const ownerOf = (items) => { const roles = [...new Set(items.map((i) => i.owner_role))]; return roles.length === 1 ? (items[0].owner_name && roles[0] === 'staff' && items.length === 1 ? items[0].owner_name : OWNER[roles[0]] || roles[0]) : 'Shared'; };

// A count that should be zero: no bar (there is no honest denominator), the target says "0".
function zeroLimit({ key, label, sub, src, items, today, severe }) {
  const n = items.length;
  const a = ageing(items, today);
  return { key, label, sub, src, kind: 'count', value: n, display: String(n), share: null, targetLabel: '0 allowed',
    band: n === 0 ? 'ok' : severe ? 'severe' : 'off', owner: n ? ownerOf(items) : null, status: n ? statusOf(items) : 'Clear', ...a };
}
const absent = (key, label, sub, src, why) => ({ key, label, sub, src, kind: 'absent', value: null, display: '—', share: null, targetLabel: why,
  band: 'nc', owner: null, status: 'Not connected', due: null, age: null, untouched: null });
const unavailable = (key, label, src) => ({ key, label, sub: 'The Hub did not answer for this source', src, kind: 'absent', value: null, display: '—', share: null,
  targetLabel: 'could not load', band: 'unavailable', owner: null, status: 'Reload', due: null, age: null, untouched: null });

export function deriveMeasures(d) {
  const s = d.src, today = d.today || d.asOf, director = d.role === 'director';
  const out = [];
  const ex = s.exceptions.ok ? s.exceptions.data : null;
  const kinds = (pred) => (ex || []).filter((i) => pred(i.kind));

  if (!ex) out.push(unavailable('staff_cleared', 'Staff cleared for classrooms', 'staff'));
  else {
    const blocked = kinds((k) => BLOCKED.has(k));
    const expiring = kinds((k) => k === 'clearance_expiring');
    const staff = s.staff.ok ? (s.staff.data || []).filter((p) => p.active !== false) : null;
    const nBlocked = new Set(blocked.map((i) => i.key.split(':').pop())).size;
    const sub = `${expiring.length ? `${expiring.length} ${plural(expiring.length, 'check expires', 'checks expire')} within 30 days` : 'Background checks on file'}`;
    if (staff && staff.length) {
      const cleared = Math.max(0, staff.length - nBlocked);
      const att = share(cleared, staff.length);
      const a = ageing(blocked.length ? blocked : expiring, today);
      out.push({ key: 'staff_cleared', label: 'Staff cleared for classrooms', sub, src: 'staff', kind: 'ratio', value: cleared, denom: staff.length,
        display: `${cleared}/${staff.length}`, share: att, targetLabel: `target: all ${staff.length}`,
        band: nBlocked ? 'severe' : expiring.length ? 'watch' : 'ok', owner: blocked.length || expiring.length ? ownerOf(blocked.length ? blocked : expiring) : null,
        status: blocked.length ? statusOf(blocked) : expiring.length ? 'Renewal due' : 'Clear', ...a });
    } else {
      out.push({ ...zeroLimit({ key: 'staff_cleared', label: 'Staff without a cleared check', sub, src: 'staff', items: blocked, today, severe: true }) });
    }
    const expired = kinds((k) => k === 'credential_expired'), soon = kinds((k) => k === 'credential_expiring');
    const cert = zeroLimit({ key: 'certs', label: 'Expired cards and certificates', sub: soon.length ? `${soon.length} more ${plural(soon.length, 'expires', 'expire')} within 30 days` : 'CPR, first aid, food handler', src: 'staff', items: expired, today, severe: true });
    if (!expired.length && soon.length) Object.assign(cert, { band: 'watch', owner: ownerOf(soon), status: 'Renewal due', ...ageing(soon, today) });
    out.push(cert);
    out.push(zeroLimit({ key: 'training', label: 'Required training overdue', sub: 'Active staff, past the due date', src: 'staff', items: kinds((k) => k === 'training_overdue'), today }));
    out.push(zeroLimit({ key: 'incident_ack', label: 'Incident reports not acknowledged', sub: 'Family told 2+ days ago', src: 'staff', items: kinds((k) => k === 'incident_unacknowledged'), today }));
    out.push(zeroLimit({ key: 'invites', label: 'Family invitations not landing', sub: 'Blocked, or 3 emails and no sign-in', src: 'staff', items: kinds((k) => k === 'invite_blocked' || k === 'invite_unanswered'), today }));
  }

  if (!s.capacity.ok) out.push(unavailable('seats', 'Seats filled', 'rooms'));
  else {
    const rooms = (s.capacity.data || []).filter((r) => r.capacity != null);
    if (!rooms.length) out.push(absent('seats', 'Seats filled', 'Licensed capacity per room', 'rooms', 'no capacity on file'));
    else {
      const cap = rooms.reduce((t, r) => t + r.capacity, 0), enrolled = rooms.reduce((t, r) => t + r.enrolled, 0);
      const over = rooms.filter((r) => r.state === 'over');
      const att = share(enrolled, cap);
      out.push({ key: 'seats', label: 'Seats filled', sub: over.length ? `${joinAnd(over.map((r) => r.room_name))} over capacity` : `${rooms.length} ${plural(rooms.length, 'room', 'rooms')} with capacity on file`,
        src: 'rooms', kind: 'ratio', value: enrolled, denom: cap, display: `${enrolled}/${cap}`, share: att, targetLabel: `licensed for ${cap}`,
        // The licence is the only target on record (the Hub has no enrollment goal): over it is severe, at or under it is on target.
        band: over.length ? 'severe' : 'ok', owner: over.length ? 'You' : null,
        status: over.length ? 'Over licence' : enrolled >= cap ? 'Full' : 'Open seats', due: null, age: null, untouched: null });
    }
  }

  if (!s.requests.ok) out.push(unavailable('time_fix', 'Time corrections waiting', 'clock'));
  else {
    const items = (s.requests.data || []).map((q) => ({ due_date: String(q.created_at).slice(0, 10), owner_role: 'director' }));
    const m = zeroLimit({ key: 'time_fix', label: 'Time corrections waiting', sub: 'Staff asked to fix a punch', src: 'clock', items, today });
    out.push(m);
  }
  if (s.whosIn.ok) {
    const missing = (s.whosIn.data || []).filter((p) => p.missing_out);
    if (missing.length) out.push(zeroLimit({ key: 'missing_out', label: 'Missing clock-outs', sub: 'Clocked in 20+ hours ago', src: 'clock',
      items: missing.map((p) => ({ due_date: String(p.in_at).slice(0, 10), owner_role: 'director' })), today }));
  }

  if (!s.intakes.ok) out.push(unavailable('packets', 'Enrollment packets to review', 'enroll'));
  else {
    const sub = (s.intakes.data || []).filter((i) => i.status === 'submitted');
    out.push(zeroLimit({ key: 'packets', label: 'Enrollment packets to review', sub: 'Submitted by families', src: 'enroll',
      items: sub.map((i) => ({ due_date: String(i.submitted_at || i.created_at).slice(0, 10), owner_role: 'director' })), today }));
  }

  if (director) {
    const bill = s.billing;
    if (!bill.ok || (s.invoices && !s.invoices.ok)) out.push(unavailable('past_due', 'Tuition past due', 'billing'));
    else if (!bill.data || !bill.data.ledger_ready) out.push(absent('past_due', 'Tuition past due', 'Family share of open invoices', 'billing', 'billing not set up'));
    else {
      const pd = (s.invoices.data || []).filter((i) => i.status === 'past_due');
      const m = zeroLimit({ key: 'past_due', label: 'Tuition past due', sub: pd.length ? `${money(pd.reduce((t, i) => t + Number(i.family_cents || 0), 0))} owed by families` : 'Family share of open invoices',
        src: 'billing', items: pd.map((i) => ({ due_date: i.due_date, owner_role: 'director' })), today });
      out.push(m);
    }
    out.push(absent('subsidy_owed', 'Subsidy reimbursements owed', 'State child care subsidy', 'subsidy', 'not connected'));
  }
  return out;
}

const ORDER = { unavailable: 0, severe: 1, off: 2, watch: 3, nc: 4, unknown: 5, ok: 6 };
export function splitMeasures(ms) {
  const sorted = [...ms].sort((a, b) => ORDER[a.band] - ORDER[b.band] || (b.untouched || 0) - (a.untouched || 0));
  return { off: sorted.filter((m) => m.band !== 'ok'), on: sorted.filter((m) => m.band === 'ok') };
}

// ---- 3. decisions only the director can make ---------------------------------------------------------------------------
// Each card: kicker, title, stake {n, label}, deadline, why, options [{label, then}], ifNothing, href, linkLabel, tone.
export function deriveDecisions(d) {
  const s = d.src, today = d.today || d.asOf, slug = d.center.slug, director = d.role === 'director';
  const href = (t) => `/c/${slug}/${t}`;
  const cards = [];
  if (!director) return cards;                          // these are a director's or owner's calls, by definition

  const ex = s.exceptions.ok ? s.exceptions.data : [];
  const blocked = ex.filter((i) => BLOCKED.has(i.kind) && i.owner_role === 'director');
  if (blocked.length) {
    const first = [...blocked].sort((a, b) => (dayNum(a.due_date) ?? 0) - (dayNum(b.due_date) ?? 0))[0];
    const one = blocked.length === 1;
    cards.push({ key: 'clearance', tone: 'bad', kicker: 'Staff file not cleared',
      title: one ? `Clear ${first.subject.replace(/ \(.*\)$/, '')}'s background check, or keep them out of the rooms` : `${words(blocked.length)} staff files are not cleared`,
      stake: { n: blocked.length, label: `${plural(blocked.length, 'person', 'people')} without a cleared check` },
      deadline: first.due_date, why: first.reason,
      options: [{ label: 'Record the result', then: 'Classroom access opens by itself once every check is on file.' },
        { label: 'Move the start date', then: 'They keep training only until the check clears.' }],
      ifNothing: 'They stay training-only: no rooms, no children, no family information, and they cannot count toward ratio.',
      href: href('people'), linkLabel: 'Open People' });
  }

  if (s.capacity.ok) {
    for (const r of (s.capacity.data || []).filter((x) => x.state === 'over')) {
      cards.push({ key: `over:${r.room}`, tone: 'bad', kicker: 'Over licensed capacity', title: `${r.room_name} is over its licensed capacity`,
        stake: { n: Math.max(r.enrolled, r.present), label: `children against a licence for ${r.capacity}` }, deadline: null, why: r.warning,
        options: [{ label: 'Move a child', then: 'to a room with an open seat, today.' }, { label: 'Hold new starts', then: `until ${r.room_name} is back at ${r.capacity}.` }],
        ifNothing: 'The room stays out of licence for as long as it lasts.', href: href('children'), linkLabel: 'Open Children' });
    }
  }

  if (s.grants.ok) {
    const live = (s.grants.data || []).filter((g) => g.emergency && g.live);
    const asked = (s.grants.data || []).filter((g) => g.status === 'requested');
    for (const g of live) {
      cards.push({ key: `grant:${g.id}`, tone: 'bad', kicker: 'Emergency support access is open', title: 'Futures Friends support can see your records right now',
        stake: { n: Number(g.reads || 0), label: `${plural(Number(g.reads || 0), 'read', 'reads')} so far · ${(g.scopes || []).join(', ').replace('_', ' ')}` },
        deadline: g.expires_at ? String(g.expires_at).slice(0, 10) : null, why: g.reason,
        options: [{ label: 'Keep it', then: 'it ends by itself when the time runs out.' }, { label: 'Revoke it', then: 'support loses access at once.' }],
        ifNothing: 'Access stays open until it expires; every read is logged.', href: href('support'), linkLabel: 'Open Support access' });
    }
    if (asked.length) {
      const g = asked[0], money = asked.some((x) => (x.scopes || []).includes('financials'));
      cards.push({ key: 'grants', tone: 'gold', kicker: 'Support is asking', title: asked.length === 1 ? `Let support see ${joinAnd((g.scopes || []).map((x) => x.replace('_', ' ')))} for ${g.hours} hours?` : `${words(asked.length)} support access requests`,
        stake: { n: asked.length, label: plural(asked.length, 'request waiting', 'requests waiting') }, deadline: null, why: g.reason,
        options: [{ label: 'Approve', then: `time-limited; every read is logged${money ? '. Includes money: only you can allow that.' : '.'}` }, { label: 'Decline', then: 'support works without your records.' }],
        ifNothing: 'Support cannot see anything inside your center.', href: href('support'), linkLabel: 'Open Support access' });
    }
  }

  if (s.intakes.ok) {
    const sub = (s.intakes.data || []).filter((i) => i.status === 'submitted');
    if (sub.length) {
      const oldest = sub.map((i) => i.submitted_at).filter(Boolean).sort()[0];
      const waited = oldest ? daysBetween(String(oldest).slice(0, 10), today) : null;
      cards.push({ key: 'packets', tone: 'gold', kicker: 'Families waiting on you', title: `Review ${lc(words(sub.length))} enrollment ${plural(sub.length, 'packet', 'packets')}`,
        stake: { n: sub.length, label: waited ? `oldest waiting ${waited} ${plural(waited, 'day', 'days')}` : plural(sub.length, 'packet submitted', 'packets submitted') },
        deadline: null, why: 'Each family has finished their part. Only a director can approve a child into a room.',
        options: [{ label: 'Approve', then: 'the child joins the room and the family gets access.' }, { label: 'Ask for changes', then: 'the family gets their link back.' }],
        ifNothing: 'The family waits, and an approved start date slips.', href: href('enroll'), linkLabel: 'Open Enrollment' });
    }
    const rooms = s.capacity.ok ? (s.capacity.data || []) : [];
    const known = rooms.filter((r) => r.capacity != null);
    const active = (s.intakes.data || []).filter((i) => ['invited', 'in_progress', 'changes_requested', 'submitted'].includes(i.status));
    if (known.length && known.length === rooms.length && known.every((r) => r.open_seats <= 0) && active.length) {
      cards.push({ key: 'full', tone: 'gold', kicker: 'Outgrown the rooms', title: 'Every seat is taken while families are still enrolling',
        stake: { n: active.length, label: `${plural(active.length, 'family', 'families')} mid-enrollment · 0 open seats` }, deadline: null,
        why: 'Every room with a licensed capacity is full.',
        options: [{ label: 'Open more seats', then: 'a new room or a capacity change, through licensing.' }, { label: 'Give each family a real date', then: 'costs nothing now; some will enroll elsewhere.' }],
        ifNothing: 'Packets keep arriving for seats that do not exist.', href: href('enroll'), linkLabel: 'Open Enrollment' });
    }
  }

  if (s.requests.ok && (s.requests.data || []).length) {
    const n = s.requests.data.length;
    cards.push({ key: 'time_fix', tone: 'gold', kicker: 'Before payroll', title: `Approve or decline ${lc(words(n))} time ${plural(n, 'correction', 'corrections')}`,
      stake: { n, label: plural(n, 'request waiting', 'requests waiting') }, deadline: null, why: 'Staff asked to fix a punch. Payroll hours come from the time clock.',
      options: [{ label: 'Approve', then: 'the hours change and the change is logged.' }, { label: 'Decline', then: 'the punch stays as clocked.' }],
      ifNothing: 'Payroll hours for the period stay as clocked.', href: href('timeclock'), linkLabel: 'Open Time clock' });
  }

  if (s.billing?.ok && s.billing.data?.ledger_ready && s.invoices?.ok) {
    const pd = (s.invoices.data || []).filter((i) => i.status === 'past_due');
    if (pd.length) {
      const owed = pd.reduce((t, i) => t + Number(i.family_cents || 0), 0);
      cards.push({ key: 'past_due', tone: 'gold', kicker: 'Money', title: `${words(pd.length)} ${plural(pd.length, 'invoice is', 'invoices are')} past due`,
        stake: { n: pd.length, label: `${money(owed)} owed by families` }, deadline: pd.map((i) => i.due_date).sort()[0] || null,
        why: 'Only a director can agree a payment plan or write off tuition.',
        options: [{ label: 'Agree a plan', then: 'record payments as they arrive.' }, { label: 'Write it off', then: 'it leaves receivables and is logged.' }],
        ifNothing: 'Late fees follow the center\'s policy and the balance keeps ageing.', href: href('billing'), linkLabel: 'Open Billing' });
    }
  }
  const rank = { bad: 0, gold: 1 };
  return cards.sort((a, b) => rank[a.tone] - rank[b.tone]);
}

// ---- 4. the one derived sentence --------------------------------------------------------------------------------------------
const WORDS_ES = ['Ninguna', 'Una', 'Dos', 'Tres', 'Cuatro', 'Cinco', 'Seis', 'Siete', 'Ocho', 'Nueve', 'Diez'];
const joinY = (xs) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`);
// The Spanish sentence (DRAFT): feed names arrive in English and the page's catalog translates them where it knows them.
function narrativeEs({ decisions, off, nc, down }) {
  const w = (n) => (n >= 0 && n <= 10 ? WORDS_ES[n] : String(n));
  const head = decisions.length || off
    ? `${w(decisions.length)} ${decisions.length === 1 ? 'decisión le espera' : 'decisiones le esperan'} y ${w(off).toLowerCase()} ${off === 1 ? 'medida está' : 'medidas están'} fuera de la meta`
    : 'No hay nada esperándole, y todas las medidas que el Hub puede ver están en la meta';
  const tail = down.length ? `; no se pudo cargar ${joinY(down)}, así que ${down.length === 1 ? 'sus cifras faltan' : 'sus cifras faltan'}, no son cero`
    : nc.length ? `; ${joinY(nc)} ${nc.length === 1 ? 'no está conectado' : 'no están conectados'}, así que esas cifras no están, en lugar de estimarse` : '';
  return `${head}${tail}.`;
}
export function narrative({ decisions, measures, feeds }, lang = uiLang()) {
  const off = measures.filter((m) => ['severe', 'off', 'watch'].includes(m.band)).length;
  const nc = feeds.filter((f) => f.state === 'nc').map((f) => f.name);
  const down = feeds.filter((f) => f.state === 'unavailable').map((f) => f.name);
  if (lang === 'es') return narrativeEs({ decisions, off, nc, down });
  const head = decisions.length || off
    ? `${words(decisions.length)} ${plural(decisions.length, 'decision waits', 'decisions wait')} on you and ${lc(words(off))} ${plural(off, 'measure is', 'measures are')} off target`
    : 'Nothing is waiting on you, and every measure the Hub can see is on target';
  const tail = down.length ? `; ${joinAnd(down)} could not be loaded, so ${plural(down.length, 'its', 'their')} figures are missing, not zero`
    : nc.length ? `; ${joinAnd(nc.map(lc))} ${plural(nc.length, 'is', 'are')} not connected, so ${plural(nc.length, 'its', 'those')} figures are absent rather than estimated` : '';
  return `${head}${tail}.`;
}

export function deriveSpine(d, { firstName = null, hour = d.hour ?? d.asOf.getHours() } = {}) {
  const feeds = deriveFeeds(d);
  const measures = deriveMeasures(d);
  const decisions = deriveDecisions(d);
  const prov = provenance(feeds);
  const cap = d.src.capacity.ok ? (d.src.capacity.data || []) : null;
  const known = cap ? cap.filter((r) => r.capacity != null) : [];
  const present = cap ? cap.reduce((t, r) => t + (r.present || 0), 0) : null;
  return {
    greeting: uiLang() === 'es' ? `${{ morning: 'Buenos días', afternoon: 'Buenas tardes', evening: 'Buenas noches' }[daypart(hour)]}${firstName ? `, ${firstName}` : ''}`
      : `Good ${daypart(hour)}${firstName ? `, ${firstName}` : ''}`,
    sentence: narrative({ decisions, measures, feeds }),
    decisions, measures, feeds, prov,
    counts: {
      decisions: decisions.length,
      off: measures.filter((m) => ['severe', 'off', 'watch'].includes(m.band)).length,
      // absent is not zero: no capacity on file -> null ("—"); no check-ins yet today -> null, never "0 here"
      seats: known.length ? { value: known.reduce((t, r) => t + r.enrolled, 0), of: known.reduce((t, r) => t + r.capacity, 0) } : null,
      here: present ? { value: present, of: cap.reduce((t, r) => t + (r.enrolled || 0), 0) } : null,
    },
  };
}

// ---- render ---------------------------------------------------------------------------------------------------------------
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const time = (d) => fmtTime(d);
function updatedLabel(f, now) {
  if (f.state === 'nc') return 'not connected';
  if (f.state === 'unavailable') return 'could not load';
  if (!f.updated) return f.note || 'no activity yet';
  if (f.updatedLabel) return `${f.updatedLabel} ${time(f.updated)}`;
  const days = daysBetween(f.updated, now);
  return days === 0 ? `updated ${time(f.updated)}` : days === 1 ? 'updated yesterday' : `updated ${shortDate(f.updated)}`;
}
const chipHtml = (st) => `<span class="sp-chip sp-${STATE[st].tone}">${esc(STATE[st].label)}</span>`;

function countTile(cls, value, label, sub, of) {
  const shown = value == null ? '—' : String(value);
  return `<div class="sp-count ${cls}" data-reveal><b class="sp-num"${value == null ? '' : ` data-count="${value}"`}>${esc(shown)}</b>${of != null && value != null ? `<span class="sp-of">/${of}</span>` : ''}
    <span class="sp-cl">${esc(label)}<small>${esc(sub)}</small></span></div>`;
}

function decisionCard(x, i) {
  return `<article class="sp-dcard${i === 0 ? ' sp-lead' : ''} sp-${x.tone}" data-reveal data-decision="${esc(x.key)}">
    <div class="sp-k"><span class="sp-n">${String(i + 1).padStart(2, '0')}</span><span class="sp-kick">${esc(x.kicker)}</span>${x.deadline ? `<span class="sp-due">${esc(shortDate(x.deadline))}</span>` : ''}</div>
    <h3>${esc(x.title)}</h3>
    <div class="sp-stake"><b data-count="${x.stake.n}">${x.stake.n}</b><small>${esc(x.stake.label)}</small></div>
    ${x.why ? `<p class="sp-why">${esc(x.why)}</p>` : ''}
    <div class="sp-opts">${x.options.map((o) => `<div class="sp-opt"><b>${esc(o.label)}</b><span>${esc(o.then)}</span></div>`).join('')}</div>
    <p class="sp-ifnot"><b>If you don't:</b> ${esc(x.ifNothing)}</p>
    <a class="btn ${i === 0 ? 'gold' : 'soft'} small" href="${esc(x.href)}" data-nav>${esc(x.linkLabel)} →</a></article>`;
}

function measureRow(m, feedState) {
  const pct = m.share == null ? null : Math.max(0, Math.min(100, Math.round(m.share * 100)));
  return `<div class="sp-mr sp-b-${m.band}" role="row" data-measure="${esc(m.key)}">
    <span class="sp-dot" role="cell" aria-label="${esc(m.band === 'nc' ? 'not connected' : m.band)}"></span>
    <div class="sp-mn" role="cell"><b>${esc(m.label)}</b><small>${esc(m.sub || '')}</small>${chipHtml(feedState(m.src))}</div>
    <div class="sp-mv" role="cell"><span class="sp-val">${esc(m.display)}</span>
      ${pct == null ? (m.kind === 'count' ? '' : '<span class="sp-track sp-empty" aria-hidden="true"></span>') : `<span class="sp-track" aria-hidden="true"><i data-w="${pct}"></i><em class="sp-tick"></em></span>`}
      <small>${esc(pct == null ? m.targetLabel : `${pct}% · ${m.targetLabel}`)}</small></div>
    <div class="sp-own" role="cell">${m.owner ? `<b>${esc(m.owner)}</b>` : '<b class="muted">—</b>'}<small>${esc(m.status)}</small></div>
    <div class="sp-dd" role="cell">${m.due ? `<b>${esc(shortDate(m.due))}</b>` : '<b class="muted">—</b>'}<small class="${m.untouched ? 'sp-late' : ''}">${esc(m.age || '')}</small></div></div>`;
}

export function renderSpine(v, d) {
  const now = d.asOf;
  const feedState = (k) => (v.feeds.find((f) => f.key === k) || { state: 'unavailable' }).state;
  const { off, on } = splitMeasures(v.measures);
  const lead = v.decisions.slice(0, 4), more = v.decisions.length - lead.length;
  return `<section class="sp" id="spine" aria-label="Director brief">
  <div class="sp-hero" data-reveal>
    <div class="sp-dateline"><span>${esc(d.today ? fmtDate(d.today, { weekday: 'long', month: 'long', day: 'numeric' }) : uiLang() === 'es' ? fmtDate(now, { weekday: 'long', month: 'long', day: 'numeric' }) : `${DAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}`)}</span><hr><span>${esc(d.center.name)}</span></div>
    <h2 class="sp-greet" id="spineGreeting">${esc(v.greeting)}</h2>
    <p class="sp-lede" id="spineSentence">${esc(v.sentence)}</p>
    <span class="sp-friends" aria-hidden="true"><i class="booker"></i><i class="lumi"></i><i class="zuri"></i><i class="bop"></i></span>
  </div>
  <div class="sp-counts">
    ${countTile('c-gold', v.counts.decisions, plural(v.counts.decisions, 'Decision waiting', 'Decisions waiting'), 'only you can make')}
    ${countTile(v.counts.off ? 'c-coral' : 'c-green', v.counts.off, plural(v.counts.off, 'Measure off target', 'Measures off target'), 'see the ledger below')}
    ${countTile(v.counts.seats && v.counts.seats.value > v.counts.seats.of ? 'c-coral' : 'c-blue', v.counts.seats?.value ?? null, 'Seats filled', v.counts.seats ? `licensed for ${v.counts.seats.of}` : 'no capacity on file', v.counts.seats?.of)}
    ${countTile('c-green', v.counts.here?.value ?? null, 'Here now', v.counts.here ? `of ${v.counts.here.of} enrolled` : 'no check-ins recorded yet today', null)}
  </div>
  <section class="sp-prov sp-t-${v.prov.tone}" id="spineProvenance" data-reveal aria-label="Where these figures come from">
    <div class="sp-row1"><h3>Where these figures come from</h3>${v.prov.chips.map((c) => `<span class="sp-chip sp-${STATE[c.state].tone}" title="${esc(c.detail)}">${c.n} ${esc(lc(c.label))}</span>`).join('')}</div>
    <p>${esc(v.prov.line)}</p>
    <ul class="sp-feeds">${v.feeds.map((f) => `<li data-feed="${esc(f.key)}" data-state="${esc(f.state)}"><i class="sp-fd sp-${STATE[f.state].tone}"></i><b>${esc(f.name)}</b>
      <span>${esc(updatedLabel(f, now))}</span>${f.note && f.updated ? `<small>${esc(f.note)}</small>` : f.state === 'nc' && f.note ? `<small>${esc(f.note)}</small>` : ''}</li>`).join('')}</ul>
  </section>
  <div class="sp-hrow" data-reveal><h2>Only you can make these</h2><p class="muted small">Licence-holder authority, a money call, or a promise to a family nobody below you can make.</p></div>
  ${v.decisions.length ? `<div class="sp-dec" id="spineDecisions">${lead.map(decisionCard).join('')}</div>${more > 0 ? `<details class="sp-more" data-reveal><summary>${more} more ${plural(more, 'decision', 'decisions')} waiting</summary><div class="sp-dec">${v.decisions.slice(4).map((x, i) => decisionCard(x, i + 4)).join('')}</div></details>` : ''}`
    : '<p class="empty sp-none" id="spineDecisions" data-reveal>Nothing is waiting on you. When a call only you can make comes up (a staff file, a room over capacity, a support request, a family\'s packet), it appears here.</p>'}
  <div class="sp-hrow" data-reveal><h2>Measures off target</h2><p class="muted small">Worst first. Untouched means nobody has started it, not that it is late.</p></div>
  ${off.length ? `<div class="sp-ledger" id="spineLedger" role="table" aria-label="Measures off target" data-reveal>
    <div class="sp-mr sp-head" role="row"><span role="columnheader"><span class="sr-only">State</span></span><span role="columnheader">Measure</span><span role="columnheader">Value vs target</span><span role="columnheader">Owner · status</span><span role="columnheader">Due · ageing</span></div>
    ${off.map((m) => measureRow(m, feedState)).join('')}</div>`
    : '<p class="empty" id="spineLedger" data-reveal>Every measure the Hub can see is on target.</p>'}
  ${on.length ? `<p class="small muted sp-on" id="spineOnTarget" data-reveal><b>On target:</b> ${esc(on.map((m) => `${m.label} (${m.display})`).join(' · '))}</p>` : ''}
</section>`;
}

// ---- motion: reveals + count-ups that settle on the real value -------------------------------------------------------------
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const EASE = 'cubic-bezier(.22,1,.36,1)';
export const MOTION = { rise: 16, duration: 600, stagger: 65, failsafe: 2800, count: 900 };

function settleCounts(scope) {
  scope.querySelectorAll('[data-count]').forEach((el) => { el.textContent = String(el.dataset.count); el.dataset.done = '1'; el.dataset.settled = '1'; });
  scope.querySelectorAll('[data-w]').forEach((el) => { el.style.width = `${el.dataset.w}%`; });
}
function countUp(el) {
  if (el.dataset.done) return;
  el.dataset.done = '1';
  const to = Number(el.dataset.count);
  if (!Number.isFinite(to) || to === 0 || reduced() || document.hidden || typeof requestAnimationFrame !== 'function') { el.textContent = String(to); return; }
  const t0 = performance.now();
  const settle = () => { el.textContent = String(to); };
  const failsafe = setTimeout(settle, MOTION.count + 400);       // frames stopped mid-ramp: the real figure anyway
  const tick = (n) => {
    if (el.dataset.settled) { clearTimeout(failsafe); return; }   // settled from outside (failsafe, hidden tab, print)
    const p = Math.min(1, (n - t0) / MOTION.count);
    el.textContent = String(Math.round(to * (1 - Math.pow(1 - p, 3))));
    if (p < 1 && !document.hidden) requestAnimationFrame(tick); else { clearTimeout(failsafe); settle(); }
  };
  requestAnimationFrame(tick);
}
function fire(el) {
  el.querySelectorAll('[data-count]').forEach(countUp);
  if (el.matches?.('[data-count]')) countUp(el);
  el.querySelectorAll('[data-w]').forEach((b) => requestAnimationFrame(() => { b.style.width = `${b.dataset.w}%`; }));
}

export function installMotion(root) {
  if (!root) return () => {};
  const els = [...root.querySelectorAll('[data-reveal]')];
  if (reduced() || !('IntersectionObserver' in window)) { settleCounts(root); return () => {}; }
  // hidden state set from JS only: with no JS (or print) everything is visible and every number is the real one
  els.forEach((el) => { el.style.opacity = '0'; el.style.transform = `translateY(${MOTION.rise}px)`;
    el.style.transition = `opacity ${MOTION.duration}ms ${EASE}, transform ${MOTION.duration}ms ${EASE}`; });
  const show = (el) => { el.style.opacity = '1'; el.style.transform = 'none'; fire(el); };
  const io = new IntersectionObserver((entries) => {
    entries.filter((e) => e.isIntersecting).map((e) => e.target).forEach((el, i) => { setTimeout(() => show(el), i * MOTION.stagger); io.unobserve(el); });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.04 });
  els.forEach((el) => io.observe(el));
  // failsafe: anything not revealed by now appears at once with its real numbers (no late count-up caught mid-ramp)
  const fs = setTimeout(() => { io.disconnect(); els.forEach((el) => { el.style.opacity = '1'; el.style.transform = 'none'; }); settleCounts(root); }, MOTION.failsafe);
  const vis = () => { if (document.hidden) { els.forEach((el) => { el.style.opacity = '1'; el.style.transform = 'none'; }); settleCounts(root); } };
  document.addEventListener('visibilitychange', vis);
  const pr = () => { els.forEach((el) => { el.style.opacity = '1'; el.style.transform = 'none'; }); settleCounts(root); };
  window.addEventListener('beforeprint', pr);
  return () => { io.disconnect(); clearTimeout(fs); document.removeEventListener('visibilitychange', vis); window.removeEventListener('beforeprint', pr); };
}
