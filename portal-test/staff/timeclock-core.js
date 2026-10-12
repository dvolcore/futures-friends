// Futures Hub time clock, the part that has no screen: the offline punch queue and number formatting (plain ES module, runs in the
// browser and in node tests). The database does the real work (migrations 20261022100000 .. 20261023100000); this file only makes
// sure a punch made without a connection is kept on the phone and sent once, whenever the phone is back online.
//
// Offline rules (docs/ops/TIME_CLOCK.md):
//  * every punch carries a client id (uuid). The server records a client id once per person and action, so sending the same punch
//    again - after a lost response, a retry, two open tabs - returns the punch already recorded and changes nothing.
//  * a queued punch also carries the time it was made on the phone. The server uses it (never in the future, at most 72 hours old),
//    stores both clocks, and flags the punch when the two differ by more than 5 minutes.
//  * a queued entry belongs to the person who made it: it is only ever sent by that person's own session, never by whoever signs in next.
//  * the queue holds only what the server needs (action, time, id and, when the center uses a geofence, the position taken at that moment);
//    an entry is deleted as soon as the server has answered.
import { localeOf } from './i18n.js';   // the reader's own language for dates and times (en-US / es-US)

export const QUEUE_KEY = 'ff-timeclock-queue-v1';
const MAX_ENTRIES = 50;

export function createQueue({ storage, uuid, now = () => new Date() }) {
  const read = () => { try { const v = JSON.parse(storage.getItem(QUEUE_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (_) { return []; } };
  const write = (list) => { try { storage.setItem(QUEUE_KEY, JSON.stringify(list.slice(-MAX_ENTRIES))); return true; } catch (_) { return false; } };
  return {
    list: (user, center) => read().filter((e) => e.user === user && e.center === center),
    all: read,
    // Adds one punch; returns the entry (or null when the phone refuses to store it).
    add({ user, center, action, geo = null, clientId = uuid(), clientAt = now().toISOString() }) {
      if (action !== 'in' && action !== 'out') throw new Error('action must be in or out');
      const e = { client_id: clientId, user, center, action, client_at: clientAt, ...(geo ? { lat: geo.lat, lon: geo.lon, acc: geo.acc ?? null } : {}) };
      const list = read();
      if (!list.some((x) => x.client_id === e.client_id)) list.push(e);
      return write(list) ? e : null;
    },
    remove(clientId) { write(read().filter((e) => e.client_id !== clientId)); },
    clear() { write([]); },
  };
}

// What the button should offer, given what the server last said and what is waiting on the phone: the last queued action wins.
export function nextAction(serverOpen, queued) {
  const last = queued.length ? queued[queued.length - 1].action : (serverOpen ? 'in' : 'out');
  return last === 'in' ? 'out' : 'in';
}

const NETWORK = /failed to fetch|networkerror|network request failed|load failed|fetch failed|timeout|aborted|offline/i;
export const isNetworkError = (e) => !!e && (e.name === 'TypeError' || NETWORK.test(String(e.message || e)) || (!e.code && !e.status && NETWORK.test(String(e))));
const isAuthError = (e) => !!e && (e.code === '28000' || e.code === 'PGRST301' || e.status === 401 || /jwt|not signed in/i.test(String(e.message || '')));

// Sends this person's queued punches in the order they were made. call(entry) must return {data, error} like supabase-js (or throw on
// a network failure). Stops at the first network or sign-in problem and keeps everything not yet answered. Returns what was answered.
export async function replay(queue, user, center, call) {
  const done = []; const rejected = [];
  let stopped = null;
  for (const e of queue.list(user, center)) {
    let res;
    try { res = await call(e); } catch (err) { stopped = isNetworkError(err) ? 'offline' : 'error'; break; }
    if (res?.error) {
      if (isNetworkError(res.error)) { stopped = 'offline'; break; }
      if (isAuthError(res.error)) { stopped = 'signin'; break; }
      queue.remove(e.client_id);                                  // refused for good (not allowed): do not retry forever
      rejected.push({ entry: e, reason: res.error.code || 'error', message: res.error.message || 'The server refused this punch.' });
      continue;
    }
    const d = res?.data;
    if (d && d.ok) { queue.remove(e.client_id); done.push({ entry: e, replay: !!d.replay, punch: d.punch }); continue; }
    queue.remove(e.client_id);                                    // a business refusal ("already clocked in", "closed pay period"): tell the person
    rejected.push({ entry: e, reason: d?.reason || 'refused', message: d?.message || 'The server did not record this punch.' });
  }
  return { done, rejected, stopped, pending: queue.list(user, center).length };
}

// ---- numbers and dates for the screens -------------------------------------------------------------------------------------
export function fmtHm(hundredths) {
  const h = Math.max(0, Math.round(Number(hundredths) || 0));
  const mins = Math.round(h * 0.6);
  return `${Math.floor(mins / 60)} h ${String(mins % 60).padStart(2, '0')} m`;
}
export const fmtHundredths = (n) => (Math.round(Number(n) || 0) / 100).toFixed(2);
export function fmtTime(iso, tz) { return new Date(iso).toLocaleTimeString(localeOf(), { hour: 'numeric', minute: '2-digit', ...(tz ? { timeZone: tz } : {}) }); }
export function fmtDay(iso, tz) { return new Date(iso).toLocaleDateString(localeOf(), { weekday: 'short', month: 'short', day: 'numeric', ...(tz ? { timeZone: tz } : {}) }); }
// <input type=datetime-local> value (the device's local time) -> ISO string with an offset
export const fromLocalInput = (v) => (v ? new Date(v).toISOString() : null);
export function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso); const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
