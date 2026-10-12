// The open center's time zone (centers.timeclock_tz, read with center_clock when a center page opens: app.js viewCenter). Every
// "today" a screen sends to the database and every clock time it shows uses it, never the device's own zone or Central time
// (hub/TIME_ZONES.md). Pure functions (no DOM): the unit tests import this file directly.
export const HQ_TZ = 'America/Chicago';

// The choices offered on "Start your center" and in Center settings (any valid IANA name is accepted by the database).
export const ZONE_LABELS = {
  en: {
    'America/New_York': 'Eastern (New York)', 'America/Chicago': 'Central (Chicago)', 'America/Denver': 'Mountain (Denver)',
    'America/Phoenix': 'Arizona (no daylight saving)', 'America/Los_Angeles': 'Pacific (Los Angeles)', 'America/Anchorage': 'Alaska (Anchorage)',
    'Pacific/Honolulu': 'Hawaii (Honolulu)', 'America/Puerto_Rico': 'Atlantic (Puerto Rico)', 'Pacific/Guam': 'Chamorro (Guam)',
  },
  es: {
    'America/New_York': 'Este (Nueva York)', 'America/Chicago': 'Centro (Chicago)', 'America/Denver': 'Montaña (Denver)',
    'America/Phoenix': 'Arizona (sin horario de verano)', 'America/Los_Angeles': 'Pacífico (Los Ángeles)', 'America/Anchorage': 'Alaska (Anchorage)',
    'Pacific/Honolulu': 'Hawái (Honolulu)', 'America/Puerto_Rico': 'Atlántico (Puerto Rico)', 'Pacific/Guam': 'Chamorro (Guam)',
  },
};
export const ZONES = Object.keys(ZONE_LABELS.en).map((id) => ({ id, en: ZONE_LABELS.en[id], es: ZONE_LABELS.es[id] }));

export function validZone(tz) {
  if (typeof tz !== 'string' || !tz) return false;
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch { return false; }
}
export const zoneLabel = (tz, lang = 'en') => {
  const z = ZONES.find((x) => x.id === tz);
  return z ? z[lang === 'es' ? 'es' : 'en'] : String(tz || '');
};
// The device's zone (preselects the sign-up choice when it is one of ours).
export function deviceZone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || null; } catch { return null; }
}

let TZ = HQ_TZ;
export function setCenterTz(tz) { TZ = validZone(tz) ? tz : HQ_TZ; return TZ; }
export const centerTz = () => TZ;

// YYYY-MM-DD in the zone (the center's by default).
export function centerToday(now = new Date(), tz = TZ) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: validZone(tz) ? tz : HQ_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
// Minutes since the zone's local midnight, and the hour.
export function centerMinutes(now = new Date(), tz = TZ) {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: validZone(tz) ? tz : HQ_TZ, hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(now);
  const v = (t) => Number(p.find((x) => x.type === t)?.value ?? 0);
  return (v('hour') % 24) * 60 + v('minute');
}
export const centerHour = (now = new Date(), tz = TZ) => Math.floor(centerMinutes(now, tz) / 60);
// "CDT", "HST", "MST": the zone's short name at that moment (for times a person reads next to the zone's name).
export function zoneAbbrev(at = new Date(), tz = TZ) {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: validZone(tz) ? tz : HQ_TZ, timeZoneName: 'short' }).formatToParts(new Date(at));
  return p.find((x) => x.type === 'timeZoneName')?.value ?? '';
}
// A wall-clock time typed on the device ("14:05") for today in the center's zone, as an ISO instant (DST-aware: the offset is the
// zone's offset on that day, found by one correction step).
export function centerTimeToIso(hhmm, now = new Date(), tz = TZ) {
  const m = String(hhmm || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return now.toISOString();
  const day = centerToday(now, tz);
  const wall = Date.parse(`${day}T${m[1].padStart(2, '0')}:${m[2]}:00Z`);
  const offsetAt = (ms) => {
    const p = new Intl.DateTimeFormat('en-US', { timeZone: validZone(tz) ? tz : HQ_TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(new Date(ms));
    const g = (t) => Number(p.find((x) => x.type === t)?.value);
    return Date.UTC(g('year'), g('month') - 1, g('day'), g('hour') % 24, g('minute'), g('second')) - ms;
  };
  let t = wall - offsetAt(wall);
  t = wall - offsetAt(t);
  return new Date(t).toISOString();
}
