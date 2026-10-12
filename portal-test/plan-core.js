// Teacher planning: school date -> curriculum day (pure functions, no DOM; the browser page and the unit tests both import this file).
//
// A center's calendar: the date the curriculum starts (start), its closed days, whether the 25 review days run in sequence
// (includeReview), and a room's pacing offset (+n = the room is n school days ahead, -n behind). School days are Monday to Friday.
// School day 1 is the start date; every later weekday that is not a closed day is the next school day. A room is on curriculum position
// (school day + offset) in the teaching order (the sequence from /api/curriculum/sequence, sorted by seq: D001..D060, R01..R05, D061..).
// Without review days the order is D001..D180 only. Dates are 'YYYY-MM-DD' strings and all arithmetic is in UTC (no time-zone drift).

const DAY = 86400000;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
export const isIso = (s) => ISO.test(String(s || '')) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
const ms = (s) => Date.parse(`${s}T00:00:00Z`);
const fmt = (t) => new Date(t).toISOString().slice(0, 10);
export const addDays = (s, n) => fmt(ms(s) + n * DAY);
export const isoWeekday = (s) => { const d = new Date(ms(s)).getUTCDay(); return d === 0 ? 7 : d; };   // Monday 1 .. Sunday 7
export const mondayOf = (s) => addDays(s, 1 - isoWeekday(s));
export const weekDates = (s) => [0, 1, 2, 3, 4].map((i) => addDays(mondayOf(s), i));
export const isWeekend = (s) => isoWeekday(s) > 5;

// The local date of a Date in the browser (today on the teacher's tablet), as 'YYYY-MM-DD'.
export const localIso = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// School day number of a date (1 = the start date), or a status when the date is not a school day.
export function schoolDay(date, start, closed = []) {
  if (!isIso(date) || !isIso(start)) return { status: 'no_calendar' };
  const shut = closed instanceof Set ? closed : new Set(closed.map((c) => (typeof c === 'string' ? c : c.day)));
  if (isWeekend(date)) return { status: 'weekend' };
  if (shut.has(date)) return { status: 'closed' };
  if (ms(date) < ms(start)) return { status: 'before_start' };
  // weekdays from start to date inclusive, minus the closed weekdays in that range
  const days = Math.round((ms(date) - ms(start)) / DAY);
  const full = Math.floor((days + 1) / 7);
  let n = full * 5;
  for (let i = full * 7; i <= days; i++) if (!isWeekend(addDays(start, i))) n++;
  for (const c of shut) if (ms(c) >= ms(start) && ms(c) <= ms(date) && !isWeekend(c)) n--;
  return { status: 'school', n };
}

// The teaching order for a center: the sequence sorted by seq, without review days when includeReview is false.
export function teachingOrder(sequence, includeReview = true) {
  return [...(sequence || [])].sort((a, b) => a.seq - b.seq).filter((d) => includeReview || !d.review);
}

// What a room teaches on a date. settings: { start, includeReview, closed: [{day, label}] | ['YYYY-MM-DD'], offset }.
// status: ok | no_calendar | weekend | closed | before_start | not_started (offset puts the room before day 1) | finished
export function planFor(date, settings, sequence) {
  const s = settings || {};
  if (!isIso(s.start)) return { date, status: 'no_calendar' };
  const closedList = s.closed || [];
  const sd = schoolDay(date, s.start, closedList);
  if (sd.status !== 'school') {
    const label = sd.status === 'closed' ? (closedList.find((c) => (typeof c === 'string' ? c : c.day) === date)?.label || '') : '';
    return { date, status: sd.status, ...(label ? { label } : {}) };
  }
  const order = teachingOrder(sequence, s.includeReview !== false);
  const pos = sd.n + (Number.isInteger(s.offset) ? s.offset : 0);
  if (pos < 1) return { date, status: 'not_started', n: sd.n };
  if (pos > order.length) return { date, status: 'finished', n: sd.n };
  const d = order[pos - 1];
  return { date, status: 'ok', n: sd.n, position: pos, id: d.id, review: !!d.review, theme: d.theme, week_theme: d.week_theme };
}

export const weekPlan = (date, settings, sequence) => weekDates(date).map((d) => planFor(d, settings, sequence));

// Materials typed one per line -> a clean list (empty lines dropped, at most 40 items of 120 characters).
export const materialsFromText = (t) => String(t || '').split(/\r?\n/).map((x) => x.trim()).filter(Boolean).slice(0, 40).map((x) => x.slice(0, 120));
