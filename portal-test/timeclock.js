// Futures Hub front-end: the staff time clock (migrations 20261022100000 .. 20261023100000; offline queue in timeclock-core.js).
// Mounted by app.js with its helpers. English only (staff and director views stay English for now).
//
//   every staff member's home   "Time clock" card: one big Clock in / Clock out button, today's and this week's hours, recent punches,
//                               ask for a correction, set the tablet PIN. A punch made offline is kept on the phone and sent later.
//   /c/<slug>/timeclock         director desk: who is in now, correction requests, pay periods (close, reopen, export), timesheets with
//                               edit / add / void, settings (zone, workweek, tablet, geofence, overtime-exempt people)
//   /c/<slug>/clock             the center tablet: tap your name, enter your PIN, confirm; back to the names after 20 seconds
// The screens only mirror the rules. Row-level security, the functions and the lock on closed pay periods enforce them whatever this
// page does. No inline code or styles (strict CSP); the payroll CSV is built on the server from the same rows (timeclock-server.mjs).
import { localeOf } from './i18n.js';   // the reader's own language for dates and times (en-US / es-US)
import { ZONES as TZ_CHOICES, centerToday } from './center-time.js';
import { createQueue, fmtDay, fmtHm, fmtHundredths, fmtTime, fromLocalInput, isNetworkError, nextAction, replay, toLocalInput } from './timeclock-core.js';

const FLAG = { late_sync: 'Sent late', client_clock_ahead: 'Phone clock off', missing_out: 'No clock-out', long_shift: 'Over 12 h', self_edited: 'Edited by self', outside_geofence: 'Outside center', tablet: 'Tablet' };
const FLAG_BAD = new Set(['missing_out', 'long_shift', 'self_edited', 'outside_geofence', 'client_clock_ahead']);
const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ZONES = TZ_CHOICES.map((z) => z.id);   // the center's time zone: the same setting as Center settings (hub/TIME_ZONES.md)

function safeStorage() {
  try { const s = window.localStorage; s.setItem('ff-tc-probe', '1'); s.removeItem('ff-tc-probe'); return s; } catch (_) {
    const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
  }
}
const position = () => new Promise((resolve) => {
  if (!navigator.geolocation) return resolve(null);
  navigator.geolocation.getCurrentPosition((p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy }), () => resolve(null),
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 });
});
const ymd = (d) => d.toISOString().slice(0, 10);
const addDays = (iso, n) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return ymd(d); };

export function mountTimeclock(h) {
  const { esc, $, $$, rpc, client, page, live, friendly, holdIdle = () => {} } = h;
  const storage = safeStorage();
  const queue = createQueue({ storage, uuid: () => crypto.randomUUID() });
  const lastKey = (u, c) => `ff-timeclock-last-v1:${u}:${c}`;
  let deskClick = null;
  const me = async () => (await client().auth.getSession()).data.session?.user?.id || null;
  const fnFor = (action) => (action === 'in' ? 'staff_punch_in' : 'staff_punch_out');
  const argsFor = (center, e, withClock) => ({ p_center: center, p_client_id: e.client_id, p_client_at: withClock ? e.client_at : null,
    ...(e.lat != null ? { p_lat: e.lat, p_lon: e.lon, p_acc: e.acc ?? null } : {}) });

  // =====================================================================================================================
  // The card on a staff member's home
  // =====================================================================================================================
  async function clockCard(c) {
    const empty = { html: '', bind() {} };
    let cfg, st, uid;
    try { uid = await me(); [cfg, st] = await Promise.all([rpc('timeclock_config', { p_center: c.center_id }), rpc('staff_clock_state', { p_center: c.center_id })]); } catch (err) {
      if (isNetworkError(err) && uid) { cfg = { may_clock: true, geofence: false, kiosk_enabled: false }; st = null; }
      else return empty;                                       // no 'hours' permission (or not staff): no card
    }
    if (!cfg || !cfg.may_clock) return empty;
    const state = { st, cfg, notes: [], busy: false };

    const recentRows = () => (state.st?.recent || []).map((p) => `<li><span class="who"><b>${esc(fmtDay(p.in_at, state.st.tz))}</b>
      <span class="small muted">${esc(fmtTime(p.in_at, state.st.tz))} to ${p.out_at ? esc(fmtTime(p.out_at, state.st.tz)) : 'now'} · ${esc(p.source === 'tablet' ? 'tablet' : p.source === 'director' ? 'added by your director' : 'phone')}</span></span>
      <span>${p.edited ? '<span class="chip gold">Corrected</span> ' : ''}${(p.flags || []).map((f) => `<span class="chip ${FLAG_BAD.has(f) ? 'warn' : ''}">${esc(FLAG[f] || f)}</span>`).join(' ')}</span></li>`).join('');

    const inner = () => {
      const q = queue.list(uid, c.center_id);
      const open = state.st ? state.st.open : (storage.getItem(lastKey(uid, c.center_id)) === 'in' ? { stale: false } : null);
      const act = nextAction(!!open, q);
      const stale = open && open.stale;
      return `<h2>Time clock</h2>
        <p class="clock-status ${act === 'out' ? 'in' : 'out'}" id="clockStatus">${open && state.st ? `Clocked in since ${esc(fmtTime(open.in_at, state.st.tz))}` : act === 'out' ? 'Clocked in' : 'Clocked out'}</p>
        ${stale ? '<p class="msg bad" role="alert">You have been clocked in for more than 20 hours. Ask your director to fix this with a correction request below.</p>' : ''}
        <button class="btn clock-btn ${act}" type="button" id="clockBtn" data-act="punch"${state.busy || stale ? ' disabled' : ''}>${act === 'in' ? 'Clock in' : 'Clock out'}</button>
        <p class="msg ${state.noteBad ? 'bad' : 'ok'}" id="clockMsg" role="status">${esc(state.note || '')}</p>
        ${q.length ? `<p class="msg info" id="clockQueued">${q.length} punch${q.length === 1 ? '' : 'es'} saved on this phone, waiting for a connection. <button class="btn link" type="button" data-act="sync">Send now</button></p>` : ''}
        ${state.notes.map((n) => `<p class="msg bad" role="alert">${esc(n)}</p>`).join('')}
        ${state.st ? `<div class="clock-totals"><div><span class="small muted">Today</span><b id="clockToday">${esc(fmtHm(state.st.today_hundredths))}</b></div>
          <div><span class="small muted">This week</span><b id="clockWeek">${esc(fmtHm(state.st.week_hundredths))}</b></div></div>` : '<p class="small muted">You are offline. Punches are saved on this phone and sent when you are back online.</p>'}
        ${state.cfg.geofence ? `<p class="small muted">Your center checks that you are at the center when you clock in or out${state.cfg.geofence_enforce ? '' : ' (it only notes it)'}. Your location is used for that moment only; the Hub keeps only whether you were at the center.</p>` : ''}
        ${state.st && state.st.recent.length ? `<h3>Recent</h3><ul class="list" id="clockRecent">${recentRows()}</ul>` : ''}
        <details class="clock-more" id="clockCorrect"><summary>Something wrong? Ask for a correction${state.st && state.st.pending_requests ? ` (${state.st.pending_requests} waiting)` : ''}</summary>
          <form id="clockCorrectForm" novalidate>
            <label class="f"><span>Which punch</span><select class="i" id="ccPunch"><option value="">A shift I forgot to punch</option>${(state.st?.recent || []).map((p) =>
              `<option value="${esc(p.id)}" data-in="${esc(p.in_at)}" data-out="${esc(p.out_at || '')}">${esc(fmtDay(p.in_at, state.st.tz))} ${esc(fmtTime(p.in_at, state.st.tz))}${p.out_at ? ` to ${esc(fmtTime(p.out_at, state.st.tz))}` : ' (still open)'}</option>`).join('')}</select></label>
            <div class="row two"><label class="f"><span>Clocked in</span><input class="i" type="datetime-local" id="ccIn" required></label>
              <label class="f"><span>Clocked out</span><input class="i" type="datetime-local" id="ccOut"></label></div>
            <label class="f"><span>What happened <span class="hint">your director reads this</span></span><textarea class="i" id="ccReason" rows="2" maxlength="500" required></textarea></label>
            <p class="small muted">Times are in this device's time zone. Your director approves or declines; nothing changes until then.</p>
            <p class="msg" id="ccMsg" role="status"></p><button class="btn navy" type="submit">Send to my director</button></form></details>
        ${state.cfg.kiosk_enabled || (state.st && state.st.pin_set) ? `<details class="clock-more" id="clockPin"><summary>Your PIN for the center tablet${state.st && state.st.pin_set ? ' (set)' : ' (not set yet)'}</summary>
          <form id="clockPinForm" novalidate><p class="small muted">4 to 6 digits. Not your birthday, not 1234. Five wrong tries lock it for 15 minutes.</p>
            <label class="f"><span>New PIN</span><input class="i" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" minlength="4" autocomplete="off" id="pinNew"></label>
            <p class="msg" id="pinMsg" role="status"></p><button class="btn navy" type="submit">Save PIN</button></form></details>` : ''}`;
    };
    const html = `<div class="card" id="clockCard" data-center="${esc(c.center_id)}">${inner()}</div>`;

    function bind() {
      const root = $('#clockCard');
      if (!root) return;
      const paint = () => {
        const open = $('#clockCorrect', root)?.open, pin = $('#clockPin', root)?.open;
        root.innerHTML = inner();
        if (open) $('#clockCorrect', root).open = true;
        if (pin) $('#clockPin', root).open = true;
      };
      const say = (msg, bad = false) => { state.note = msg; state.noteBad = bad; const m = $('#clockMsg', root); if (m) { m.textContent = msg; m.className = `msg ${bad ? 'bad' : 'ok'}`; } live(msg); };
      async function refresh() {
        try { state.st = await rpc('staff_clock_state', { p_center: c.center_id }); storage.setItem(lastKey(uid, c.center_id), state.st.open ? 'in' : 'out'); } catch (err) { if (!isNetworkError(err)) say(friendly(err), true); }
        paint();
      }
      async function sync() {
        const r = await replay(queue, uid, c.center_id, (e) => client().rpc(fnFor(e.action), argsFor(c.center_id, e, true)));
        state.notes = r.rejected.map((x) => `A punch you made offline was not recorded: ${x.message}`);
        if (r.done.length) say(`${r.done.length} saved punch${r.done.length === 1 ? ' was' : 'es were'} sent.`);
        await refresh();
      }
      async function punch() {
        if (state.busy) return;
        const act = nextAction(!!(state.st ? state.st.open : storage.getItem(lastKey(uid, c.center_id)) === 'in'), queue.list(uid, c.center_id));
        state.busy = true; paint();
        const geo = state.cfg.geofence ? await position() : null;
        const entry = { client_id: crypto.randomUUID(), client_at: new Date().toISOString(), action: act, ...(geo ? { lat: geo.lat, lon: geo.lon, acc: geo.acc } : {}) };
        const keepOffline = () => {
          if (!queue.add({ user: uid, center: c.center_id, action: act, geo, clientId: entry.client_id, clientAt: entry.client_at })) say('This phone could not save the punch. Tell your director the time and clock in again when you are online.', true);
          else say(`Saved on this phone at ${fmtTime(entry.client_at)}. It is sent when you are back online.`);
          storage.setItem(lastKey(uid, c.center_id), act);
        };
        try {
          const r = navigator.onLine === false ? { error: { message: 'Failed to fetch' } } : await client().rpc(fnFor(act), argsFor(c.center_id, entry, false));
          if (r.error) { if (isNetworkError(r.error)) keepOffline(); else say(friendly(r.error), true); }
          else if (!r.data.ok) say(r.data.message, true);
          else say(act === 'in' ? `Clocked in at ${fmtTime(r.data.punch.in_at, state.st?.tz)}. Have a good day.` : `Clocked out at ${fmtTime(r.data.punch.out_at, state.st?.tz)}. Thank you.`);
        } catch (err) { if (isNetworkError(err)) keepOffline(); else say(friendly(err), true); }
        state.busy = false;
        if (navigator.onLine === false) paint(); else await refresh();
      }
      root.addEventListener('click', (e) => {
        const b = e.target.closest('[data-act]');
        if (!b) return;
        if (b.dataset.act === 'punch') punch(); else if (b.dataset.act === 'sync') sync();
      });
      root.addEventListener('change', (e) => {
        if (e.target.id !== 'ccPunch') return;
        const o = e.target.selectedOptions[0];
        $('#ccIn', root).value = toLocalInput(o?.dataset.in || ''); $('#ccOut', root).value = toLocalInput(o?.dataset.out || '');
      });
      root.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (e.target.id === 'clockCorrectForm') {
          const m = $('#ccMsg', root); const reason = $('#ccReason', root).value.trim();
          if (reason.length < 5) { m.className = 'msg bad'; m.textContent = 'Say what happened (at least 5 characters).'; return; }
          if (!$('#ccIn', root).value) { m.className = 'msg bad'; m.textContent = 'Add the time you clocked in.'; return; }
          try {
            await rpc('staff_punch_request_edit', { p_center: c.center_id, p_punch: $('#ccPunch', root).value || null, p_in_at: fromLocalInput($('#ccIn', root).value),
              p_out_at: fromLocalInput($('#ccOut', root).value), p_reason: reason });
            await refresh(); const mm = $('#ccMsg', root); if (mm) { mm.className = 'msg ok'; mm.textContent = 'Sent. Your director will approve or decline it.'; }
            live('Correction request sent.');
          } catch (err) { m.className = 'msg bad'; m.textContent = friendly(err); }
        } else if (e.target.id === 'clockPinForm') {
          const m = $('#pinMsg', root);
          try { await rpc('security_set_pin', { p_pin: $('#pinNew', root).value }); await refresh(); const mm = $('#pinMsg', root); if (mm) { mm.className = 'msg ok'; mm.textContent = 'PIN saved.'; } live('PIN saved.'); }
          catch (err) { m.className = 'msg bad'; m.textContent = friendly(err); }
        }
      });
      window.addEventListener('online', () => { if (root.isConnected && queue.list(uid, c.center_id).length) sync(); });
      if (queue.list(uid, c.center_id).length) sync(); else if (!state.st) refresh();
      if (state.st) storage.setItem(lastKey(uid, c.center_id), state.st.open ? 'in' : 'out');
    }
    return { html, bind };
  }

  // =====================================================================================================================
  // The director's desk
  // =====================================================================================================================
  async function viewDesk(c, shell) {
    const CID = c.center_id;
    const today = centerToday();   // the center's day (the same zone as settings.tz)
    const [periods, settings, whos, reqs] = await Promise.all([rpc('pay_period_list', { p_center: CID }), rpc('timeclock_settings_get', { p_center: CID }),
      rpc('timeclock_whos_in', { p_center: CID }), rpc('staff_punch_requests_list', { p_center: CID, p_status: 'pending' })]);
    const lastEnd = periods.length ? periods[0].end : null;
    const wsDay = settings.week_start;
    // the next period: starts the day after the last one ended, or on the most recent workweek start; two whole weeks
    const nextStart = lastEnd ? addDays(lastEnd, 1) : (() => { const d = new Date(`${addDays(today, -14)}T00:00:00Z`); while (d.getUTCDay() !== wsDay) d.setUTCDate(d.getUTCDate() - 1); return ymd(d); })();
    const nextEnd = addDays(nextStart, 13);
    const rangeFrom = periods[0] ? periods[0].start : addDays(today, -13), rangeTo = periods[0] && periods[0].end >= today ? today : (periods[0] ? periods[0].end : today);
    const sheetRange = { from: periods.find((p) => p.status === 'open')?.start || rangeFrom, to: periods.find((p) => p.status === 'open')?.end || rangeTo };
    if (sheetRange.to > today) sheetRange.to = today;
    if (sheetRange.from > sheetRange.to) sheetRange.from = addDays(sheetRange.to, -13);

    // the payroll provider push (hub/worker/vendors/payroll.mjs): only when HQ switched payroll_vendor on (OFF by default)
    const payrollOn = !!(await client().from('platform_flags').select('enabled').eq('key', 'payroll_vendor').maybeSingle().then((r) => r.data, () => null))?.enabled;
    const chips = (flags) => (flags || []).map((f) => `<span class="chip ${FLAG_BAD.has(f) ? 'warn' : ''}">${esc(FLAG[f] || f)}</span>`).join(' ');
    const periodRow = (p) => `<li data-period="${esc(p.id)}"><span class="who"><b>${esc(p.start)} to ${esc(p.end)}</b>
        <span class="small muted">${p.status === 'locked' ? `Closed${p.exported_at ? ` · exported ${p.export_count}x` : ''}` : 'Open'}${p.aligned ? '' : ' · not whole workweeks: overtime may be understated'}${p.reopen_count ? ` · reopened ${p.reopen_count}x` : ''}</span></span>
      <span class="actions"><span class="chip ${p.status === 'locked' ? 'ok' : ''}">${p.status === 'locked' ? 'Closed' : 'Open'}</span>
        ${p.status === 'open' ? `<button class="btn soft small" type="button" data-lock="${esc(p.id)}">Close period</button><button class="btn link small" type="button" data-sheet="${esc(p.start)}|${esc(p.end)}">Timesheet</button>`
          : `<button class="btn navy small" type="button" data-export="${esc(p.id)}|gusto">Gusto CSV</button><button class="btn soft small" type="button" data-export="${esc(p.id)}|generic">Other payroll CSV</button>
             <button class="btn soft small" type="button" data-export="${esc(p.id)}|check">Check CSV</button>
             ${payrollOn ? `<button class="btn gold small" type="button" data-push="${esc(p.id)}" data-end="${esc(p.end)}">Send to payroll provider</button>` : ''}
             <button class="btn link small" type="button" data-reopen="${esc(p.id)}">Reopen</button>`}</span></li>`;
    const reqRow = (q) => `<li data-req="${esc(q.id)}"><span class="who"><b>${esc(q.name)}</b>
        <span class="small muted">${q.kind === 'add' ? 'Missing shift' : 'Change'}: ${q.current_in ? `${esc(fmtDay(q.current_in))} ${esc(fmtTime(q.current_in))} to ${q.current_out ? esc(fmtTime(q.current_out)) : 'open'} becomes ` : ''}${esc(fmtDay(q.proposed_in))} ${esc(fmtTime(q.proposed_in))} to ${q.proposed_out ? esc(fmtTime(q.proposed_out)) : 'open'}</span>
        <span class="small">"${esc(q.reason)}"</span></span>
      <span class="actions"><button class="btn navy small" type="button" data-approve="${esc(q.id)}">Approve</button><button class="btn soft small" type="button" data-decline="${esc(q.id)}">Decline</button></span></li>`;

    page(shell(`<div class="card" id="deskIntro"><h2>Time clock</h2>
        <p class="small muted">Hours only: no pay rates live here. Edits need a reason and are kept in a history your staff can see for their own time. Closed pay periods cannot change until you reopen them.</p>
        <p class="small"><a class="btn soft small" href="/c/${esc(c.slug)}/clock" data-nav id="openKiosk">Open the center tablet page</a></p>
        <div id="deskAction" tabindex="-1"></div><p class="msg" id="deskMsg" role="status"></p></div>
      <div class="grid two">
        <div class="card" id="whoIn"><h3>Who is in now</h3>${whos.length ? `<ul class="list">${whos.map((w) => `<li><span class="who"><b>${esc(w.name)}</b><span class="small muted">since ${esc(fmtTime(w.in_at))} (${Math.floor(w.minutes / 60)} h ${w.minutes % 60} m)</span></span>
          <span>${chips([...(w.missing_out ? ['missing_out'] : []), ...(w.outside_geofence ? ['outside_geofence'] : []), ...(w.source === 'tablet' ? ['tablet'] : [])])}</span></li>`).join('')}</ul>` : '<p class="empty">No one is clocked in.</p>'}</div>
        <div class="card" id="requests"><h3>Corrections waiting</h3>${reqs.length ? `<ul class="list">${reqs.map(reqRow).join('')}</ul>` : '<p class="empty">None waiting.</p>'}</div></div>
      <div class="card" id="payPeriods"><h2>Pay periods</h2>
        ${periods.length ? `<ul class="list" id="periodList">${periods.map(periodRow).join('')}</ul>` : '<p class="empty">No pay periods yet. Add the first one below.</p>'}
        <form id="periodForm" class="card soft" novalidate><div class="row three"><label class="f"><span>First day</span><input class="i" type="date" id="ppStart" value="${esc(nextStart)}" required></label>
          <label class="f"><span>Last day</span><input class="i" type="date" id="ppEnd" value="${esc(nextEnd)}" required></label>
          <div class="f"><span>&nbsp;</span><button class="btn navy" type="submit">Add pay period</button></div></div>
          <p class="small muted">Use whole workweeks (your workweek starts on ${esc(DOW[wsDay])}) so overtime is computed from full weeks. A period can be closed after its last day, with no one still clocked in and no corrections waiting.</p></form></div>
      <div class="card" id="timesheets"><h2>Timesheets</h2>
        <form id="sheetForm" class="row three" novalidate><label class="f"><span>From</span><input class="i" type="date" id="shFrom" value="${esc(sheetRange.from)}"></label>
          <label class="f"><span>To</span><input class="i" type="date" id="shTo" value="${esc(sheetRange.to)}"></label>
          <div class="f"><span>&nbsp;</span><button class="btn navy" type="submit">Show</button></div></form>
        <div id="sheetBody" aria-live="polite"><p class="loading">Loading</p></div></div>
      <form class="card" id="settingsForm" novalidate><h2>Settings</h2>
        <div class="row three"><label class="f"><span>Center time zone <span class="hint">used everywhere, not only here</span></span><select class="i" id="stTz">${[...new Set([settings.tz, ...ZONES])].map((z) => `<option${z === settings.tz ? ' selected' : ''}>${esc(z)}</option>`).join('')}</select></label>
          <label class="f"><span>Workweek starts on <span class="hint">overtime is over 40 h in a workweek</span></span><select class="i" id="stWeek">${DOW.map((d, i) => `<option value="${i}"${i === wsDay ? ' selected' : ''}>${d}</option>`).join('')}</select></label></div>
        <fieldset class="f"><legend>Center tablet</legend>
          <label class="choice"><input type="checkbox" id="stKiosk"${settings.kiosk_enabled ? ' checked' : ''}><span><b>Tablet clock is on</b><span class="small muted">Staff tap their name and enter their PIN. Switch it off and it stops working at once.</span></span></label>
          <label class="f"><span>Tablet account <span class="hint">the staff sign-in kept open on the tablet; give it the Hours only preset in Permissions</span></span>
            <select class="i" id="stKioskUser"><option value="">No account (only a director's own sign-in)</option>${settings.staff.map((s) => `<option value="${esc(s.user_id)}"${s.user_id === settings.kiosk_user ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label></fieldset>
        <fieldset class="f"><legend>Location check</legend><div class="row three">
          <label class="f"><span>Latitude</span><input class="i" id="gLat" inputmode="decimal" value="${settings.geofence ? esc(settings.geofence.lat) : ''}"></label>
          <label class="f"><span>Longitude</span><input class="i" id="gLon" inputmode="decimal" value="${settings.geofence ? esc(settings.geofence.lon) : ''}"></label>
          <label class="f"><span>Radius (metres)</span><input class="i" id="gRad" inputmode="numeric" value="${settings.geofence ? esc(settings.geofence.radius_m) : '150'}"></label></div>
          <label class="choice"><input type="checkbox" id="gEnforce"${settings.geofence?.enforce ? ' checked' : ''}><span><b>Refuse punches away from the center</b><span class="small muted">Off: the punch is recorded and marked "outside center" for you to see.</span></span></label>
          <p><button class="btn soft small" type="button" id="gHere">Use this device's location</button> <button class="btn link small" type="button" id="gClear">Turn the location check off</button></p>
          <p class="small muted">The Hub stores only whether a punch was at the center and the distance rounded to 10 m. Phones can fake a location, so this is a deterrent, not proof.</p></fieldset>
        <fieldset class="f"><legend>Exempt from overtime <span class="hint">salaried people your accountant says are exempt; they get regular hours only</span></legend>
          <div class="choices two">${settings.staff.map((s) => `<label class="choice"><input type="checkbox" data-exempt="${esc(s.user_id)}"${s.exempt ? ' checked' : ''}><span><b>${esc(s.name)}</b><span class="small muted">${esc(s.role)}${s.has_pin ? '' : ' · no tablet PIN yet'}</span></span></label>`).join('')}</div></fieldset>
        <p class="msg" id="settingsMsg" role="status"></p><button class="btn center" type="submit">Save settings</button></form>`),
      `Time clock · ${c.name}`, { english: true });

    const msg = (text, bad = false) => { const m = $('#deskMsg'); m.className = `msg ${bad ? 'bad' : 'ok'}`; m.textContent = text; live(text); };
    const reload = () => viewDesk(c, shell);
    const hint = () => (Intl.DateTimeFormat().resolvedOptions().timeZone !== settings.tz ? `These times use this device's time zone (${Intl.DateTimeFormat().resolvedOptions().timeZone}), not the center's (${settings.tz}).` : '');

    // One small inline form for everything that needs a reason (edit, add, void, reopen, decline).
    function ask({ title, fields = '', needReason = true, confirm = 'Save', run }) {
      const box = $('#deskAction');
      box.innerHTML = `<form class="card soft" id="askForm" novalidate><h3>${esc(title)}</h3>${fields}
        ${needReason ? '<label class="f"><span>Reason <span class="hint">at least 5 characters; kept in the history</span></span><input class="i" id="askReason" maxlength="500" required></label>' : ''}
        <p class="msg" id="askMsg" role="alert"></p><div class="cta-row"><button class="btn navy" type="submit">${esc(confirm)}</button><button class="btn link" type="button" id="askCancel">Cancel</button></div></form>`;
      box.focus();
      $('#askCancel').onclick = () => { box.innerHTML = ''; };
      $('#askForm').onsubmit = async (e) => {
        e.preventDefault();
        const reason = needReason ? $('#askReason').value.trim() : '';
        if (needReason && reason.length < 5) { $('#askMsg').className = 'msg bad'; $('#askMsg').textContent = 'Give a reason of at least 5 characters.'; return; }
        try { await run(reason); } catch (err) { $('#askMsg').className = 'msg bad'; $('#askMsg').textContent = friendly(err); }
      };
      if (needReason) $('#askReason').focus(); else $('#askForm button[type=submit]').focus();
    }
    const timeFields = (i, o) => `<div class="row two"><label class="f"><span>Clocked in</span><input class="i" type="datetime-local" id="askIn" value="${esc(toLocalInput(i))}" required></label>
      <label class="f"><span>Clocked out</span><input class="i" type="datetime-local" id="askOut" value="${esc(toLocalInput(o))}"></label></div><p class="small muted">${esc(hint())}</p>`;

    // ---- timesheets
    async function loadSheet() {
      const from = $('#shFrom').value, to = $('#shTo').value, body = $('#sheetBody');
      try {
        const s = await rpc('staff_timesheet', { p_center: CID, p_from: from, p_to: to });
        body.innerHTML = s.employees.length ? s.employees.map((e) => `<div class="card soft" data-emp="${esc(e.user_id)}"><div class="row two"><div><b>${esc(e.name)}</b>${e.exempt ? ' <span class="chip">Exempt</span>' : ''}
            <br><span class="small muted">${esc(e.email || '')}</span></div><div class="amt"><b>${esc(fmtHundredths(e.total))} h</b> <span class="small muted">${esc(fmtHm(e.total))}</span></div></div>
          <table class="t"><thead><tr><th>Workweek</th><th>Worked</th><th>Regular</th><th>Overtime</th></tr></thead><tbody>${e.weeks.map((w) => `<tr><td>${esc(w.week_start)} to ${esc(w.week_end)}${w.partial ? ' <span class="chip warn">part of the week</span>' : ''}</td>
            <td>${esc(fmtHundredths(w.worked))}</td><td>${esc(fmtHundredths(w.regular))}</td><td>${w.overtime ? `<span class="chip warn">${esc(fmtHundredths(w.overtime))}</span>` : '0.00'}</td></tr>`).join('')}</tbody></table>
          <ul class="list">${e.punches.map((p) => `<li data-punch="${esc(p.id)}"${p.void ? ' class="void"' : ''}><span class="who"><b>${esc(fmtDay(p.in_at, s.tz))}</b>
            <span class="small muted">${esc(fmtTime(p.in_at, s.tz))} to ${p.out_at ? esc(fmtTime(p.out_at, s.tz)) : 'open'}${p.void ? ` · voided: ${esc(p.void_reason || '')}` : ''}</span></span>
            <span class="actions">${p.edited ? '<span class="chip gold">Corrected</span> ' : ''}${chips(p.flags)}${p.void ? '' : `<button class="btn link small" type="button" data-edit="${esc(p.id)}" data-name="${esc(e.name)}" data-in="${esc(p.in_at)}" data-out="${esc(p.out_at || '')}">Edit</button><button class="btn link small" type="button" data-void="${esc(p.id)}" data-name="${esc(e.name)}">Void</button>`}</span></li>`).join('')}</ul></div>`).join('')
          : '<p class="empty">No hours in this range.</p>';
      } catch (err) { body.innerHTML = `<p class="msg bad" role="alert">${esc(friendly(err))}</p>`; }
    }
    $('#sheetForm').onsubmit = (e) => { e.preventDefault(); loadSheet(); };
    loadSheet();

    // ---- clicks (delegated)
    const main = $('main') || document;
    if (deskClick) main.removeEventListener('click', deskClick);
    deskClick = onClick;
    main.addEventListener('click', onClick);
    async function onClick(e) {
      const b = e.target.closest('button[data-lock], [data-reopen], [data-export], [data-sheet], [data-edit], [data-void], [data-approve], [data-decline], #gHere, #gClear, #addPunchBtn');
      if (!b || !$('#deskIntro')) return;
      if (b.dataset.sheet) { const [f, t] = b.dataset.sheet.split('|'); $('#shFrom').value = f; $('#shTo').value = t > today ? today : t; loadSheet(); $('#timesheets').scrollIntoView(); return; }
      if (b.dataset.lock) {
        ask({ title: 'Close this pay period?', needReason: false, confirm: 'Close the period', fields: '<p class="small">Nothing in it can change afterwards unless you reopen it (recorded). Check the timesheets first.</p>',
          run: async () => { await rpc('pay_period_lock', { p_period: b.dataset.lock }); await reload(); msg('Pay period closed. You can export it now.'); } });
      } else if (b.dataset.reopen) {
        ask({ title: 'Reopen this pay period', confirm: 'Reopen', fields: '<p class="small">Reopening is recorded, with your reason, and notes whether the period had been exported.</p>',
          run: async (reason) => { await rpc('pay_period_reopen', { p_period: b.dataset.reopen, p_reason: reason }); await reload(); msg('Pay period reopened.'); } });
      } else if (b.dataset.export) {
        const [period, format] = b.dataset.export.split('|');
        msg('Preparing the file...');
        try {
          const sess = (await client().auth.getSession()).data.session;
          const r = await fetch('/api/timeclock/payroll-export', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sess.access_token}`, 'X-Center': CID }, body: JSON.stringify({ period, format }) });
          const j = await r.json();
          if (!r.ok) throw new Error(j.error || 'The export failed.');
          const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([j.csv], { type: 'text/csv' })); a.download = j.filename; document.body.appendChild(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(a.href), 4000);
          msg(`Downloaded ${j.filename}: ${j.employees} people, ${j.rows} days of hours. Hours only; Gusto or your payroll service adds pay.${j.warnings.length ? ` Check: ${j.warnings.join(' ')}` : ''}`, j.warnings.length > 0);
        } catch (err) { msg(err.message || friendly(err), true); }
      } else if (b.dataset.push) {
        const period = b.dataset.push;
        ask({ title: 'Send these hours to the payroll provider?', needReason: false, confirm: 'Send hours',
          fields: `<label class="f"><span>Payday</span><input class="i" type="date" id="askPayday" value="${esc(addDays(b.dataset.end, 5))}"></label><p class="small">Hours only. People are matched by email at the provider; anyone not found there is listed, not sent.</p>`,
          run: async () => {
            const sess = (await client().auth.getSession()).data.session;
            const r = await fetch('/api/timeclock/payroll-push', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sess.access_token}`, 'X-Center': CID }, body: JSON.stringify({ period, payday: $('#askPayday').value }) });
            const j = await r.json();
            if (!r.ok) throw new Error(j.error || 'The hours could not be sent.');
            msg(`Sent to ${j.provider}: ${j.items} people.${j.unmatched.length ? ` Not found at the provider: ${j.unmatched.join(', ')}.` : ''}`, j.unmatched.length > 0);
          } });
      } else if (b.dataset.edit) {
        const id = b.dataset.edit, name = b.dataset.name;
        ask({ title: `Edit the punch of ${name}`, fields: timeFields(b.dataset.in, b.dataset.out),
          run: async (reason) => { await rpc('staff_punch_edit', { p_punch: id, p_in_at: fromLocalInput($('#askIn').value), p_out_at: fromLocalInput($('#askOut').value), p_reason: reason }); await reload(); msg('Punch corrected. The old times are kept in the history.'); } });
      } else if (b.dataset.void) {
        const id = b.dataset.void, name = b.dataset.name;
        ask({ title: `Void the punch of ${name}`, confirm: 'Void it', fields: '<p class="small">A voided punch no longer counts. It stays in the history.</p>',
          run: async (reason) => { await rpc('staff_punch_void', { p_punch: id, p_reason: reason }); await reload(); msg('Punch voided.'); } });
      } else if (b.dataset.approve) {
        ask({ title: 'Approve this correction?', needReason: false, confirm: 'Approve', fields: '<p class="small">The change is applied now and recorded with the employee\'s reason.</p>',
          run: async () => { await rpc('staff_punch_request_decide', { p_request: b.dataset.approve, p_approve: true }); await reload(); msg('Correction approved and applied.'); } });
      } else if (b.dataset.decline) {
        ask({ title: 'Decline this correction', confirm: 'Decline', fields: '<p class="small">Your reason is shown to the employee.</p>',
          run: async (reason) => { await rpc('staff_punch_request_decide', { p_request: b.dataset.decline, p_approve: false, p_note: reason }); await reload(); msg('Correction declined.'); } });
      } else if (b.id === 'gHere') {
        const p = await position();
        if (!p) { msg('This device would not share its location. Allow location for this page, or type the numbers.', true); return; }
        $('#gLat').value = p.lat.toFixed(6); $('#gLon').value = p.lon.toFixed(6); msg('Location filled in. Save the settings to use it.');
      } else if (b.id === 'gClear') { $('#gLat').value = ''; $('#gLon').value = ''; msg('The location check will be off once you save.'); }
    }

    $('#periodForm').onsubmit = async (e) => {
      e.preventDefault();
      try { const p = await rpc('pay_period_save', { p_center: CID, p_start: $('#ppStart').value, p_end: $('#ppEnd').value }); await reload(); msg(p.aligned ? 'Pay period added.' : 'Pay period added. It is not whole workweeks, so overtime may be understated.', !p.aligned); }
      catch (err) { msg(friendly(err), true); }
    };
    $('#settingsForm').onsubmit = async (e) => {
      e.preventDefault();
      const lat = $('#gLat').value.trim(), lon = $('#gLon').value.trim();
      const s = { tz: $('#stTz').value, week_start: Number($('#stWeek').value), kiosk_enabled: $('#stKiosk').checked, kiosk_user: $('#stKioskUser').value || null,
        exempt: $$('[data-exempt]').filter((x) => x.checked).map((x) => x.dataset.exempt),
        geofence: lat && lon ? { lat: Number(lat), lon: Number(lon), radius_m: Number($('#gRad').value), enforce: $('#gEnforce').checked } : null };
      const m = $('#settingsMsg');
      try { await rpc('timeclock_settings_save', { p_center: CID, p_settings: s }); m.className = 'msg ok'; m.textContent = 'Saved.'; live('Time clock settings saved.'); }
      catch (err) { m.className = 'msg bad'; m.textContent = friendly(err); }
    };
  }

  // =====================================================================================================================
  // The center tablet
  // =====================================================================================================================
  async function viewKiosk(c) {
    const CID = c.center_id;
    page(`<div class="kiosk" id="kiosk" data-center="${esc(CID)}"><div class="kiosk-head"><h1>${esc(c.name)}</h1><p class="kiosk-clock" id="kClock"></p></div><div id="kBody" aria-live="polite"></div></div>`, `Time clock · ${c.name}`, { english: true });
    holdIdle(true);
    const root = $('#kiosk');
    let roster = [], cfg = { geofence: false }, idleT = null, refreshT = null, tickT = null;
    const alive = () => root.isConnected && $('#kiosk') === root;
    const stopAll = () => { clearTimeout(idleT); clearInterval(refreshT); clearInterval(tickT); holdIdle(false); };
    tickT = setInterval(() => { if (!alive()) return stopAll(); const k = $('#kClock'); if (k) k.textContent = new Date().toLocaleString(localeOf(), { weekday: 'long', hour: 'numeric', minute: '2-digit' }); }, 1000);
    const idle = (fn) => { clearTimeout(idleT); idleT = setTimeout(() => { if (alive()) fn(); }, 20000); };
    const body = () => $('#kBody');

    async function loadRoster() {
      try { roster = await rpc('timeclock_kiosk_roster', { p_center: CID }); cfg = await rpc('timeclock_config', { p_center: CID }).catch(() => cfg); return true; } catch (err) {
        const m = String(err?.message || '');
        body().innerHTML = /not switched on/i.test(m) ? '<div class="card kiosk-card"><h2>This tablet is not set up</h2><p>A director turns on the tablet clock in Time clock, Settings, and picks this sign-in as the tablet account.</p></div>'
          : `<div class="card kiosk-card"><h2>The names could not be loaded</h2><p class="msg bad">${esc(isNetworkError(err) ? 'No connection. Use your phone: it saves your punch and sends it later.' : friendly(err))}</p><button class="btn navy" type="button" id="kRetry">Try again</button></div>`;
        const r = $('#kRetry'); if (r) r.onclick = () => showNames();
        return false;
      }
    }
    async function showNames() {
      if (!alive()) return;
      clearTimeout(idleT);
      if (!(await loadRoster())) return;
      body().innerHTML = `<h2 class="kiosk-title">Tap your name</h2>${roster.length ? `<ul class="kiosk-names" id="kNames">${roster.map((r) =>
        `<li><button class="btn kiosk-name ${r.in ? 'is-in' : ''}" type="button" data-user="${esc(r.user_id)}"><b>${esc(r.name)}</b><span>${r.in ? `In since ${esc(fmtTime(r.since))}` : 'Out'}</span></button></li>`).join('')}</ul>` : '<p class="empty">No one can use the tablet yet.</p>'}`;
      $$('.kiosk-name', body()).forEach((b) => { b.onclick = () => showPad(roster.find((r) => r.user_id === b.dataset.user)); });
      clearInterval(refreshT);
      refreshT = setInterval(() => { if (!alive()) return stopAll(); if ($('#kNames')) showNames(); }, 30000);
    }
    function showPad(person, note = '') {
      clearInterval(refreshT);
      const action = person.in ? 'out' : 'in';
      let pin = '';
      body().innerHTML = `<div class="card kiosk-card"><h2 class="kiosk-title">${esc(person.name)}</h2>
        <p class="kiosk-sub">${action === 'in' ? 'Enter your PIN to clock in' : 'Enter your PIN to clock out'}</p>
        <p class="kiosk-dots" id="kDots" aria-label="PIN digits entered">&nbsp;</p>
        <p class="msg ${note ? 'bad' : ''}" id="kMsg" role="alert">${esc(note)}</p>
        ${person.has_pin ? '' : '<p class="msg bad">You have no PIN yet. Set it on your phone: Home, Time clock, Your PIN for the center tablet.</p>'}
        <div class="kiosk-pad" role="group" aria-label="PIN pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button class="btn kiosk-key" type="button" data-key="${n}">${n}</button>`).join('')}
          <button class="btn kiosk-key soft" type="button" data-key="clear" aria-label="Clear">Clear</button><button class="btn kiosk-key" type="button" data-key="0">0</button>
          <button class="btn kiosk-key soft" type="button" data-key="back" aria-label="Delete last digit">&larr;</button></div>
        <div class="cta-row kiosk-actions"><button class="btn gold kiosk-go" type="button" id="kGo" disabled>${action === 'in' ? 'Clock in' : 'Clock out'}</button><button class="btn soft" type="button" id="kBack">Back</button></div></div>`;
      const dots = $('#kDots'), go = $('#kGo');
      const paint = () => { dots.textContent = pin ? '● '.repeat(pin.length).trim() : ' '; go.disabled = pin.length < 4; idle(showNames); };
      idle(showNames);
      $$('.kiosk-key', body()).forEach((k) => { k.onclick = () => {
        const v = k.dataset.key;
        if (v === 'clear') pin = ''; else if (v === 'back') pin = pin.slice(0, -1); else if (pin.length < 6) pin += v;
        paint();
      }; });
      $('#kBack').onclick = () => showNames();
      go.onclick = async () => {
        go.disabled = true; $('#kMsg').textContent = 'Checking...'; $('#kMsg').className = 'msg info';
        const geo = cfg.geofence ? await position() : null;
        try {
          const r = await client().rpc('staff_punch_pin', { p_center: CID, p_user: person.user_id, p_pin: pin, p_action: action, p_client_id: crypto.randomUUID(),
            ...(geo ? { p_lat: geo.lat, p_lon: geo.lon, p_acc: geo.acc } : {}) });
          if (r.error) throw r.error;
          const d = r.data;
          if (!d.ok) {
            pin = ''; paint();
            if (d.reason === 'already_in' || d.reason === 'not_in') { await showNames(); return; }
            $('#kMsg').className = 'msg bad'; $('#kMsg').textContent = d.reason === 'wrong' && d.tries_left != null ? `${d.message} ${d.tries_left} ${d.tries_left === 1 ? 'try' : 'tries'} left.` : d.message;
            return;
          }
          showDone(d.name || person.name, d.action, d.action === 'in' ? d.punch.in_at : d.punch.out_at);
        } catch (err) { pin = ''; paint(); $('#kMsg').className = 'msg bad'; $('#kMsg').textContent = isNetworkError(err) ? 'No connection. Try again, or use your phone: it saves your punch and sends it later.' : friendly(err); }
      };
    }
    function showDone(name, action, at) {
      clearTimeout(idleT);
      body().innerHTML = `<div class="card kiosk-card kiosk-done" role="status"><div class="kiosk-check" aria-hidden="true">&#10003;</div><h2 class="kiosk-title">${esc(name)}, you are clocked ${action === 'in' ? 'in' : 'out'}</h2>
        <p class="kiosk-sub">${esc(fmtTime(at))}</p></div>`;
      live(`${name} clocked ${action} at ${fmtTime(at)}.`);
      setTimeout(() => { if (alive()) showNames(); }, 4000);
    }
    document.addEventListener('pointerdown', () => { if (alive() && $('#kDots')) idle(showNames); }, { passive: true });
    await showNames();
  }

  return { clockCard, viewDesk, viewKiosk };
}
