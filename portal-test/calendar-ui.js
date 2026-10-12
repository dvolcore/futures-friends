// /c/<slug>/calendar: the center calendar (migration 20261026720000_center_calendar.sql, hub/TEACHER_PLANNING.md "Center calendar").
//   everyone   the coming year's closures and early dismissals: the director's own days (holidays, in-service, weather) and the
//              built-in Jewish and US federal holidays the center is closed on. ?date=YYYY-MM-DD (a closure notification) highlights it.
//              Kid Mode keeps working at home: a closure is about the building.
//   directors  add a closed day / early dismissal / weather closure (optionally telling every family now), open a day again, and choose
//              per built-in holiday: closed / open / early dismissal, plus early dismissal on the evening it begins (erev).
// One calendar per center: the planning page, the menu day, the daily report and attendance all read the same days.
// Families: English + Spanish (DRAFT). Staff views are English.
import { deepFocus, deepNote } from './deeplink.js';
import { HOLIDAY_BY_KEY } from './holidays-core.js';
import { centerToday } from './center-time.js';

const W = {
  en: { title: 'Center calendar', lead: 'The days the center is closed or dismisses early in the coming year.', kid: 'Kid Mode still works at home on a closed day.',
    none: 'No closed days in the coming year.', closed: 'Closed', early: 'Early dismissal', sundown: (d) => `begins at sundown ${d}`,
    gone: (d) => `Nothing is planned for ${d} any more: the center is open that day.` },
  es: { title: 'Calendario del centro', lead: 'Los días que el centro está cerrado o sale temprano en el próximo año.', kid: 'El Modo Niños sigue funcionando en casa cuando el centro está cerrado.',
    none: 'No hay días cerrados en el próximo año.', closed: 'Cerrado', early: 'Salida temprano', sundown: (d) => `comienza al atardecer del ${d}`,
    gone: (d) => `Ya no hay nada previsto para el ${d}: el centro está abierto ese día.` },
};
const CHOICE = { closed: 'Closed', open: 'Open', early: 'Early dismissal' };
const SET = { jewish: 'Jewish holidays', us_federal: 'US federal holidays' };
const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function mountCalendar({ esc, $, rpc, page, live, friendly }) {
  const dayLabel = (s, lang, opts = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) =>
    new Date(`${s}T12:00:00Z`).toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US', { ...opts, timeZone: 'UTC' });
  const addDays = (s, n) => new Date(Date.parse(`${s}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

  async function viewCalendar(c, shell, { family = false, director = false, lang = 'en' } = {}) {
    const fl = lang === 'es' ? 'es' : 'en';
    const w = W[fl];
    const opts = { english: !family };
    const today = centerToday();   // the center's day
    const want = new URLSearchParams(location.search).get('date');
    const focusDay = ISO.test(want || '') ? want : null;
    const from = focusDay && focusDay < today && focusDay >= addDays(today, -400) ? focusDay : today;   // at most 800 days per read
    let cal;
    try { cal = await rpc('center_calendar_get', { p_center: c.center_id, p_from: from, p_to: addDays(today, 365) }); }
    catch (e) { return page(shell(`<div class="card"><h2>${esc(w.title)}</h2><p class="msg bad" role="alert">${esc(friendly(e))}</p></div>`), w.title, opts); }

    const months = new Map();
    for (const d of cal.days) { const k = d.day.slice(0, 7); (months.get(k) ?? months.set(k, []).get(k)).push(d); }
    const row = (d) => `<li data-day="${esc(d.day)}" data-source="${esc(d.source)}"><span class="cal-day">${esc(dayLabel(d.day, fl))}</span>
      <span class="chip ${d.status === 'closed' ? 'warn' : 'gold'}">${esc(d.status === 'closed' ? w.closed : w.early)}</span>
      <span class="cal-what">${esc(fl === 'es' ? d.label_es : d.label)}${d.erev ? ` <span class="small muted">· ${esc(w.sundown(dayLabel(d.erev, fl, { weekday: 'short', month: 'short', day: 'numeric' })))}</span>` : ''}</span></li>`;
    const list = cal.days.length ? [...months.entries()].map(([m, ds]) => `<section class="cal-month"><h3>${esc(dayLabel(`${m}-15`, fl, { month: 'long', year: 'numeric' }))}</h3>
      <ul class="cal-list">${ds.map(row).join('')}</ul></section>`).join('') : `<p class="muted">${esc(w.none)}</p>`;

    const dir = director && cal.director;
    const hName = (h) => (fl === 'es' && (h.label_es || HOLIDAY_BY_KEY.get(h.key)?.es)) || h.label;   // the built-in Spanish name (draft)
    const holidayRows = (set) => (cal.holidays || []).filter((h) => h.set === set).map((h) => `<tr data-key="${esc(h.key)}">
        <th scope="row">${esc(hName(h))}<br><span class="small muted">${(h.dates || []).slice(0, 8).map((d) => esc(dayLabel(d, fl, { weekday: 'short', month: 'short', day: 'numeric' }))).join(', ')}${h.sundown && (h.dates || []).length ? ` · begins at sundown ${esc(dayLabel(addDays(h.dates[0], -1), fl, { weekday: 'short', month: 'short', day: 'numeric' }))}` : ''}</span></th>
        <td><label class="sr-only" for="hc-${esc(h.key)}">${esc(hName(h))}</label><select class="i" id="hc-${esc(h.key)}" data-choice="${esc(h.key)}">${Object.entries(CHOICE).map(([v, l]) => `<option value="${v}"${v === h.choice ? ' selected' : ''}>${esc(l)}${v === h.default ? ' (default)' : ''}</option>`).join('')}</select></td>
        <td>${h.sundown ? `<label class="choice small"><input type="checkbox" data-erev="${esc(h.key)}"${h.erev_early ? ' checked' : ''}> <span>Early dismissal the evening before</span></label>` : '<span class="small muted">begins at dawn</span>'}</td></tr>`).join('');
    const custom = (cal.custom || []).filter((d) => d.day >= today);
    const editor = dir ? `
      <form class="card" id="calAdd" novalidate><h2>Add a closed day</h2>
        <p class="small muted">A day you add wins over a built-in holiday on the same date. Weather closures and early dismissals can tell every family right away (a notification that opens this calendar).</p>
        <div class="row two"><label class="f"><span>Day</span><input class="i" type="date" id="calDay" required></label>
          <label class="f"><span>What</span><select class="i" id="calStatus"><option value="closed">Closed</option><option value="early">Early dismissal</option></select></label></div>
        <div class="row two"><label class="f"><span>Kind</span><select class="i" id="calKind"><option value="custom">Holiday / in-service / other</option><option value="weather">Weather</option></select></label>
          <label class="f"><span>Label <span class="hint">shown to families</span></span><input class="i" id="calLabel" maxlength="80"></label></div>
        <label class="f"><span>Label in Spanish <span class="hint">optional (draft)</span></span><input class="i" id="calLabelEs" maxlength="80"></label>
        <label class="choice"><input type="checkbox" id="calNotify"> <span>Tell every family now</span></label>
        <p class="msg" id="calAddMsg" role="status"></p><button class="btn navy" type="submit">Save the day</button></form>
      <section class="card" id="calCustom"><h2>Days you added</h2>${custom.length ? `<ul class="list">${custom.map((d) => `<li data-day="${esc(d.day)}"><span class="who"><b>${esc(dayLabel(d.day, 'en'))}</b>
          <span class="small muted">${esc(d.status === 'early' ? 'Early dismissal' : 'Closed')}${d.kind === 'weather' ? ' · weather' : ''}${d.label ? ` · ${esc(d.label)}` : ''}${d.notice_sent_at ? ' · families told' : ''}</span></span>
          <button class="btn link small" type="button" data-open-day="${esc(d.day)}">Open again</button></li>`).join('')}</ul>` : '<p class="muted small">None yet.</p>'}</section>
      <section class="card" id="calHolidays"><h2>Built-in holidays</h2>
        <p class="small muted">Jewish holidays follow the Hebrew calendar (diaspora: two days of Rosh Hashanah, Sukkot, Passover and Shavuot) and begin at sundown the evening before. Closed by default: Rosh Hashanah, Yom Kippur, the first two days of Sukkot, Shemini Atzeret, Simchat Torah, the first two and last two days of Passover, Shavuot, and the US federal closures. Your choice applies every year.</p>
        <p class="msg" id="calHolMsg" role="status"></p>
        ${['jewish', 'us_federal'].map((set) => `<h3>${esc(SET[set])}</h3><div class="cal-scroll"><table class="cal-hol" data-set="${set}"><thead><tr><th scope="col">Holiday (dates in the coming year)</th><th scope="col">The center is</th><th scope="col">Evening before</th></tr></thead>
          <tbody>${holidayRows(set)}</tbody></table></div>`).join('')}</section>` : '';

    page(shell(`<div class="cal" id="calendarPage"><div class="card"><h2>${esc(w.title)}</h2><p class="muted">${esc(w.lead)}</p><p class="small">${esc(w.kid)}</p></div>
      <section class="card" id="calList">${list}</section>${editor}</div>`), w.title, opts);

    if (focusDay) {
      const el = document.querySelector(`#calList li[data-day="${focusDay}"]`);
      if (el) deepFocus(el); else deepNote(w.gone(dayLabel(focusDay, fl)), fl);
    }
    if (!dir) return;
    const again = async (msgId, text) => { await viewCalendar(c, shell, { family, director, lang }); const m = $(msgId); if (m && text) { m.className = 'msg ok'; m.textContent = text; } live(text); };
    $('#calAdd').addEventListener('submit', async (e) => {
      e.preventDefault();
      const m = $('#calAddMsg'), day = $('#calDay').value;
      if (!ISO.test(day)) { m.className = 'msg bad'; m.textContent = 'Choose the day.'; $('#calDay').focus(); return; }
      try {
        const r = await rpc('center_closure_set', { p_center: c.center_id, p_day: day, p_status: $('#calStatus').value, p_kind: $('#calKind').value,
          p_label: $('#calLabel').value.trim(), p_label_es: $('#calLabelEs').value.trim() || null, p_notify: $('#calNotify').checked });
        await again('#calAddMsg', r.notified ? `Saved. ${r.notified} family account${r.notified === 1 ? '' : 's'} told.` : 'Saved.');
      } catch (err) { m.className = 'msg bad'; m.textContent = friendly(err); }
    });
    $('#calCustom').addEventListener('click', async (e) => {
      const b = e.target.closest('[data-open-day]'); if (!b) return;
      try { await rpc('center_closure_set', { p_center: c.center_id, p_day: b.dataset.openDay, p_status: 'open' }); await again('#calAddMsg', 'The center is open that day again.'); }
      catch (err) { live(friendly(err)); }
    });
    $('#calHolidays').addEventListener('change', async (e) => {
      const tr = e.target.closest('tr[data-key]'); if (!tr) return;
      const key = tr.dataset.key, m = $('#calHolMsg');
      try {
        await rpc('center_holiday_choice_set', { p_center: c.center_id, p_key: key, p_choice: tr.querySelector('[data-choice]').value,
          p_erev_early: !!tr.querySelector('[data-erev]')?.checked });
        await again('#calHolMsg', 'Saved. The planning page, the menu day and the daily report follow it.');
        document.querySelector(`#calHolidays tr[data-key="${key}"] select`)?.focus();
      } catch (err) { m.className = 'msg bad'; m.textContent = friendly(err); }
    });
  }
  return { viewCalendar };
}
