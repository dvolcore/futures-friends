// The parent dashboard's numbers (hub/FAMILY_DASHBOARD.md "Premium pass"). Pure: no DOM, no network; tests/family-dashboard-unit.test.mjs
// imports it. The rule, taken from the command-center work the owner pointed at: DERIVE, NEVER RESTATE. Every figure on the KPI band is
// computed here from the rows family_dashboard / family_dashboard_extras return; a figure whose source returned nothing is null, and the
// page shows "not connected yet" for it, never a made-up or zero number. No figure compares the child with anyone else.

export const AMOUNT_SHARE = { none: 0, a_little: 0.25, about_half: 0.5, most: 0.75, all: 1 };
const pct = (x) => (x == null ? null : Math.round(x * 100));
const numbers = (xs) => xs.filter((x) => typeof x === 'number' && Number.isFinite(x));

// attendance this month: school days present of the school days so far (closed days and weekends are not school days)
export function attendanceKpi(stats) {
  if (!stats || stats.school_days == null || stats.present_days == null) return null;
  const school = Number(stats.school_days), present = Math.min(Number(stats.present_days), school);
  return { present, school, pct: school ? Math.round((present / school) * 100) : null };
}

// meals: today's share of the plate (all the meal entries of today), and the last seven school days for the sparkline
export function mealsKpi(stats) {
  const series = (stats?.meals || []).map((d) => ({ day: d.day, value: d.share == null ? null : Number(d.share) }));
  if (!series.length) return null;
  const today = series[series.length - 1];
  return { today: pct(today.value), series, logged: numbers(series.map((d) => d.value)).length };
}

// rest: today's minutes and the child's own usual day over the other days that have a rest logged
export function restKpi(stats) {
  const series = (stats?.rest || []).map((d) => ({ day: d.day, value: d.min == null ? null : Number(d.min) }));
  if (!series.length) return null;
  const today = series[series.length - 1].value;
  const earlier = numbers(series.slice(0, -1).map((d) => d.value));
  return { today, usual: earlier.length ? Math.round(earlier.reduce((a, b) => a + b, 0) / earlier.length) : null, series };
}

// feelings: today's (the latest of today) and the recent days, oldest first (at most 7)
export function moodKpi(stats, today) {
  const list = (stats?.moods || []).slice(-7);
  const t = list.find((m) => m.day === today);
  return { today: t ? t.feeling : null, days: list };
}

// skills: how many skills sit at each level in the latest released report, and per area of learning (counts only; the child's own
// points stay beside the words on the report). Never a total across skills, never a comparison.
export function skillsKpi(stats) {
  const s = stats?.skills;
  if (!s || !s.levels) return null;
  const lv = { emerging: Number(s.levels.emerging || 0), developing: Number(s.levels.developing || 0), secure: Number(s.levels.secure || 0) };
  const total = lv.emerging + lv.developing + lv.secure;
  return { ...lv, total, report: s.report, to: s.to, domains: (s.domains || []).map((d) => ({ domain: d.domain, emerging: Number(d.emerging || 0), developing: Number(d.developing || 0), secure: Number(d.secure || 0) })) };
}

export function homeKpi(learning) {
  if (!learning || !learning.home_total) return null;
  return { done: Number(learning.home_done || 0), total: Number(learning.home_total), pct: Math.round((Number(learning.home_done || 0) / Number(learning.home_total)) * 100) };
}

// minutes in family words: 85 -> "1 h 25 min"
export function minutesText(min, lang = 'en') {
  if (min == null) return '';
  const m = Math.max(0, Math.round(min)), h = Math.floor(m / 60), r = m % 60;
  if (!h) return `${r} min`;
  return r ? `${h} h ${r} min` : `${h} h`;
}

// "Good afternoon, Pat" (the first name from the account; nothing when there is no usable name)
export function firstName(fullName) {
  const n = String(fullName || '').replace(/^TEST\s+/i, '').trim();
  if (!n || n.includes('@')) return '';
  return n.split(/\s+/)[0];
}
const HELLO = {
  en: { morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening', night: 'Good evening' },
  es: { morning: 'Buenos días', afternoon: 'Buenas tardes', evening: 'Buenas noches', night: 'Buenas noches' },
};
export function greeting(part, name, lang = 'en') {
  const h = HELLO[lang === 'es' ? 'es' : 'en'][part] || HELLO.en.afternoon;
  return name ? `${h}, ${name}` : h;
}

// The calendar strip: closed days and early dismissals (75 days), the child's reported absences and the tuition due date, by day;
// a holiday that runs several days in a row (Chanukah: five early dismissals) becomes one tile "Dec 7 to 11".
export function calendarStrip({ calendar = [], absences = [], tuition = null } = {}) {
  const items = [];
  const sorted = [...calendar].sort((a, b) => String(a.day).localeCompare(String(b.day)));
  for (const c of sorted) {
    const last = items[items.length - 1];
    const next = (d) => { const x = new Date(`${d}T12:00:00Z`); x.setUTCDate(x.getUTCDate() + 1); while ([0, 6].includes(x.getUTCDay())) x.setUTCDate(x.getUTCDate() + 1); return x.toISOString().slice(0, 10); };
    if (last && last.kind === 'closure' && last.status === c.status && last.label === c.label && c.holiday && last.holiday === c.holiday && next(last.to) === String(c.day).slice(0, 10)) {
      last.to = String(c.day).slice(0, 10); continue;
    }
    items.push({ kind: 'closure', day: String(c.day).slice(0, 10), to: String(c.day).slice(0, 10), status: c.status, label: c.label, label_es: c.label_es, holiday: c.holiday || null });
  }
  for (const a of absences) items.push({ kind: 'absence', day: String(a.date_from || '').slice(0, 10), to: String(a.date_to || a.date_from || '').slice(0, 10), id: a.id, item: a });
  if (tuition && tuition.due_date) items.push({ kind: 'tuition', day: String(tuition.due_date).slice(0, 10), to: String(tuition.due_date).slice(0, 10), id: tuition.invoice_id, cents: tuition.due_cents, status: tuition.status });
  return items.filter((x) => x.day).sort((a, b) => a.day.localeCompare(b.day) || a.kind.localeCompare(b.kind));
}

// the live line under the greeting: "Mia checked in 8:12 · resting now"
export function liveState(today) {
  const t = today || {};
  const att = t.attendance || {};
  const tl = t.timeline || [];
  const last = tl[tl.length - 1] || null;
  const openNap = [...tl].reverse().find((e) => e.kind === 'nap' && !e.ended);
  return { arrived: att.arrived || null, left: att.left || null, resting: !!openNap && !att.left, last };
}

// the sparkline: points for an SVG polyline (0..1 values; null days leave a gap)
export function sparkPoints(values, w = 120, h = 32, pad = 3) {
  const n = values.length;
  if (!n) return [];
  const step = n > 1 ? (w - pad * 2) / (n - 1) : 0;
  return values.map((v, i) => (v == null ? null : [+(pad + i * step).toFixed(1), +(h - pad - Math.max(0, Math.min(1, v)) * (h - pad * 2)).toFixed(1)]));
}

// Every time-ordered list on the family pages runs morning at the top to evening at the bottom (owner 2026-10-12): earliest first.
// key: the ISO instant or date field ('at' for entries and messages, 'day' for school days). Rows without it keep their place at the end.
export function inDayOrder(rows, key = 'at') {
  return [...(rows || [])].map((r, i) => [r, i]).sort((a, b) => {
    const x = a[0]?.[key], y = b[0]?.[key];
    if (x && y) return String(x).localeCompare(String(y)) || a[1] - b[1];
    return x ? -1 : y ? 1 : a[1] - b[1];
  }).map(([r]) => r);
}
