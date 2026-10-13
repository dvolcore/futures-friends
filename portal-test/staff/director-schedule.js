// The staff schedule: the DOM part (hub/DIRECTOR_OPS.md; the pure part is director-schedule-core.js).
//   mountMyShifts(el, ctx)          a staff member's published shifts (teacher Me > Time clock, the mount staff-v2-ui.js leaves empty):
//                                   this week and next, ask to swap a shift, cancel the request; ?shift=<id> opens that shift (the
//                                   notification's exact item)
//   createSchedule(ctx)             the director's builder (Staff > Schedule): see the second half of this file
import * as K from './director-schedule-core.js';

const enc = encodeURIComponent;
const defaultEsc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const errText = (e) => String(e?.message || e || 'That did not work.').replace(/^./, (x) => x.toUpperCase());
const dlabel = (iso, lang, o = { weekday: 'short', month: 'short', day: 'numeric' }) => new Date(`${iso}T12:00:00Z`).toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US', { ...o, timeZone: 'UTC' });
export const shiftParam = (search = (typeof location === 'undefined' ? '' : location.search)) => {
  const v = new URLSearchParams(search).get('shift'); return v && /^[0-9a-f-]{36}$/i.test(v) ? v : null;
};

// ==================================================================================================================================
// Teacher / staff: my shifts. ctx = { c: {center_id, slug}, rpc(name, args), esc?, lang?, live?(text), friendly?(e) }
// ==================================================================================================================================
export async function mountMyShifts(el, ctx) {
  if (!el) return null;
  const { c, rpc, lang = 'en' } = ctx;
  const esc = ctx.esc || defaultEsc, live = ctx.live || (() => {}), friendly = ctx.friendly || errText;
  const W = K.scw(lang);
  let data = null, openId = shiftParam(), msg = '';
  async function load() {
    try { data = await rpc('my_shifts', { p_center: c.center_id, p_from: null, p_to: null }); }
    catch (e) { data = null; msg = friendly(e); }
    draw();
  }
  function rowHtml(s) {
    const sw = s.swap;
    const swapChip = sw ? `<span class="dops-chip dops-chip-${sw.status === 'pending' ? 'warn' : sw.status === 'approved' ? 'ok' : 'nc'}">${esc(sw.status === 'pending' ? W.swapPending(sw.to_name) : sw.status === 'approved' ? W.swapOk : sw.status === 'declined' ? W.swapNo : W.cancelledW)}</span>` : '';
    const isOpen = openId === s.id;
    const past = s.day < data.today;
    return `<li class="dops-my${isOpen ? ' is-open' : ''}" id="dops-shift-${esc(s.id)}" data-shift="${esc(s.id)}">
      <button class="dops-my-row" type="button" aria-expanded="${isOpen}" aria-controls="dops-shift-${esc(s.id)}-more">
        <span class="dops-my-day"><b>${esc(dlabel(s.day, lang, { weekday: 'short' }))}</b><span>${esc(dlabel(s.day, lang, { month: 'short', day: 'numeric' }))}</span></span>
        <span class="dops-my-t"><b>${esc(K.span(s.start_min, s.end_min, lang))}</b><span>${esc(s.room_name || W.noRoom)}${s.break_min ? ` · ${esc(W.brk)} ${esc(W.mins(s.break_min))}` : ''}</span></span>${swapChip}</button>
      <div class="dops-my-more" id="dops-shift-${esc(s.id)}-more"${isOpen ? '' : ' hidden'}>
        ${s.note ? `<p class="dops-note">${esc(s.note)}</p>` : ''}
        ${past ? '' : sw?.status === 'pending' ? `<button class="ffs-btn ffs-btn-soft" type="button" data-cancel="${esc(sw.id)}">${esc(W.cancelReq)}</button>`
          : `<form class="dops-swapform" data-swap="${esc(s.id)}"><label class="dops-f"><span>${esc(W.swapAsk)}</span><select class="i" name="to"><option value="">${esc(W.anyone)}</option>
              ${(data.colleagues || []).map((p) => `<option value="${esc(p.user_id)}">${esc(p.name.replace(/^TEST\s+/i, ''))}</option>`).join('')}</select></label>
              <label class="dops-f"><span>${esc(W.swapNote)}</span><input class="i" name="note" maxlength="300" autocomplete="off"></label>
              <button class="ffs-btn ffs-btn-bop" type="submit">${esc(W.send)}</button></form>`}
      </div></li>`;
  }
  function draw() {
    if (!data) { el.hidden = false; el.innerHTML = `<section class="ffs-card dops-card"><h3 class="dops-h">${esc(W.myShifts)}</h3><p class="ffs-nc">${esc(msg || W.loadErr)}</p></section>`; return; }
    const wk = K.weekOf(data.today), nxt = K.addDays(wk, 7);
    const groups = [[W.thisWk, data.shifts.filter((s) => s.day < nxt)], [W.nextWk, data.shifts.filter((s) => s.day >= nxt)]];
    const hrs = (list) => K.hoursLabel(list.reduce((t, s) => t + K.paidMin(s), 0));
    el.hidden = false;
    el.innerHTML = `<section class="ffs-card dops-card" aria-labelledby="dopsMyH"><div class="ffs-ch"><h3 id="dopsMyH">${esc(W.myShifts)}</h3></div>
      ${msg ? `<p class="dops-msg" role="status">${esc(msg)}</p>` : '<p class="ffs-sr" role="status"></p>'}
      ${data.shifts.length ? groups.map(([label, list]) => (list.length ? `<h4 class="dops-h4">${esc(label)} <span>${esc(W.hours(hrs(list)))}</span></h4><ul class="dops-mylist">${list.map(rowHtml).join('')}</ul>` : '')).join('')
        : `<p class="ffs-empty">${esc(W.myNone)}</p>`}</section>`;
    el.querySelectorAll('.dops-my-row').forEach((b) => b.addEventListener('click', () => { const id = b.closest('[data-shift]').dataset.shift; openId = openId === id ? null : id; msg = ''; draw(); el.querySelector(`#dops-shift-${CSS.escape(id)} .dops-my-row`)?.focus(); }));
    el.querySelectorAll('form[data-swap]').forEach((f) => f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = f.querySelector('button[type=submit]'); btn.disabled = true;
      try { await rpc('schedule_swap_request', { p_center: c.center_id, p_shift: f.dataset.swap, p_to_user: f.to.value || null, p_note: f.note.value || null }); msg = W.sent; }
      catch (err) { msg = friendly(err); }
      live(msg); await load();
    }));
    el.querySelectorAll('[data-cancel]').forEach((b) => b.addEventListener('click', async () => {
      b.disabled = true;
      try { await rpc('schedule_swap_cancel', { p_center: c.center_id, p_swap: b.dataset.cancel }); msg = W.cancelledW; } catch (err) { msg = friendly(err); }
      live(msg); await load();
    }));
    if (openId) { const row = el.querySelector(`#dops-shift-${CSS.escape(openId)}`); if (row && shiftParam() === openId) { row.scrollIntoView({ block: 'center' }); row.querySelector('.dops-my-row')?.focus({ preventScroll: true }); } }
  }
  await load();
  return { reload: load };
}

// ==================================================================================================================================
// Director: the schedule builder (Staff > Schedule). ctx = { c, rpc, esc, lang, live, friendly, icon, figureHtml, tableHtml, shell() }
//   createSchedule(ctx) -> { load(week?), data(), panelHtml(), bind(el), drawer(kind), overview(staffing) }
//   Drawers (the shell's slide-over, so Back closes them and the address holds them): shift:<id>, add:<user>.<day>.<start>.<end>,
//   cover:<room>.<day>, swap:<id>.
// ==================================================================================================================================
const ROOM_TONES = ['booker', 'zuri', 'lumi', 'bop', 'gold', 'navy'];
export function createSchedule(ctx) {
  const { c, rpc, lang = 'en' } = ctx;
  const esc = ctx.esc || defaultEsc, live = ctx.live || (() => {}), friendly = ctx.friendly || errText, icon = ctx.icon || (() => '');
  const W = K.scw(lang);
  let week = null, weekStart = null, sect = 'build', phoneDay = null, msg = '', root = null, loadErr = null;
  const name = (p) => String(p?.name || '').replace(/^TEST\s+/i, '');
  const person = (uid) => (week?.staff || []).find((p) => p.user_id === uid);
  const roomOf = (id) => (week?.rooms || []).find((r) => r.id === id);
  const roomTone = (id) => { const i = (week?.rooms || []).findIndex((r) => r.id === id); return i < 0 ? 'none' : ROOM_TONES[i % ROOM_TONES.length]; };
  const days = () => K.weekDays(week.week_start);
  const open = () => week.settings.open_min, close = () => week.settings.close_min;
  const issuesOf = (s) => K.shiftIssues(s, person(s.user_id), { settings: week.settings, shifts: week.shifts, closed: week.closed }, lang);

  async function load(ws = weekStart) {
    try { week = await rpc('schedule_week', { p_center: c.center_id, p_week: ws }); weekStart = week.week_start; loadErr = null; }
    catch (e) { loadErr = friendly(e); }
    return week;
  }
  const narrow = () => typeof window !== 'undefined' && (window.innerWidth < 1024 || window.matchMedia?.('(pointer: coarse)').matches);

  // ---- markup ----
  function toolbarHtml() {
    const w = week.week, st = w.status === 'published' ? (w.changed ? 'changed' : 'published') : 'draft';
    return `<div class="dops-tools">
      <div class="dops-weeknav" role="group" aria-label="${esc(W.week(dlabel(week.week_start, lang, { month: 'long', day: 'numeric' })))}">
        <button class="dops-ib" type="button" data-wk="-7" aria-label="${esc(W.prev)}">${icon('arrow')}</button>
        <h3 class="dops-wk">${esc(W.week(dlabel(week.week_start, lang, { month: 'long', day: 'numeric' })))}</h3>
        <button class="dops-ib dops-ib-next" type="button" data-wk="7" aria-label="${esc(W.next)}">${icon('arrow')}</button>
        ${week.week_start !== K.weekOf(week.today) ? `<button class="ffs-btn ffs-btn-soft dops-sm" type="button" data-wk="0">${esc(W.thisWeek)}</button>` : ''}</div>
      <span class="dops-chip dops-chip-${st === 'published' ? 'ok' : st === 'changed' ? 'warn' : 'nc'}" id="dopsWeekState">${esc(st === 'draft' ? W.draft : st === 'changed' ? W.changed : W.published(w.version))}</span>
      <div class="dops-acts">${week.shifts.length ? '' : `<button class="ffs-btn ffs-btn-soft" type="button" data-copy>${esc(W.copyLast)}</button>`}
        <button class="ffs-btn ffs-btn-bop" type="button" data-publish${st === 'published' ? ' disabled' : ''}>${icon('check')}${esc(st === 'changed' ? W.republish : W.publish)}</button></div></div>`;
  }
  function segHtml() {
    const pend = (week.swaps || []).filter((s) => s.status === 'pending').length;
    return `<div class="dops-seg" role="group" aria-label="${esc(W.title)}">${[['build', W.sectBuild], ['cover', W.sectCover], ['swaps', `${W.sectSwaps}${pend ? ` (${pend})` : ''}`], ['worked', W.sectWorked]]
      .map(([k, l]) => `<button type="button" class="dops-segb" data-sect="${k}" aria-pressed="${sect === k}">${esc(l)}</button>`).join('')}</div>`;
  }
  function blockHtml(s) {
    const iss = issuesOf(s), worst = K.worstIssue(iss.filter((x) => x.sev !== 'info'));
    const room = roomOf(s.room);
    const label = `${name(person(s.user_id))}, ${dlabel(s.day, lang)}, ${K.span(s.start_min, s.end_min, lang)}, ${room?.name || W.noRoom}${iss.length ? `. ${iss.map((x) => x.text).join(' ')}` : ''}`;
    return `<button type="button" class="dops-blk dops-r-${roomTone(s.room)}${worst ? ` dops-iss-${worst}` : ''}" data-shift="${esc(s.id)}" data-l="${K.minToPct(s.start_min, open(), close()).toFixed(2)}" data-w="${(K.minToPct(s.end_min, open(), close()) - K.minToPct(s.start_min, open(), close())).toFixed(2)}" aria-label="${esc(label)}">
      <span class="dops-hd dops-hd-l" aria-hidden="true"></span><span class="dops-blk-t">${esc(K.hmShort(s.start_min))}–${esc(K.hmShort(s.end_min))}</span><span class="dops-blk-r">${esc(room?.name?.replace(/\s*Room$/i, '') || W.noRoomShort)}</span>${worst ? `<span class="dops-blk-i" aria-hidden="true">!</span>` : ''}<span class="dops-hd dops-hd-r" aria-hidden="true"></span></button>`;
  }
  function gridHtml() {
    const ds = days(), closed = new Set(week.closed || []);
    return `<div class="dops-gridwrap ffs-scroll"><div class="dops-grid" role="table" aria-label="${esc(W.title)}">
      <div class="dops-gr dops-gh" role="row"><span class="dops-gc dops-gname" role="columnheader">${esc(W.staff)}</span>${ds.map((d) => `<span class="dops-gc${d === week.today ? ' is-today' : ''}" role="columnheader">${esc(dlabel(d, lang, { weekday: 'short', day: 'numeric' }))}${closed.has(d) ? `<br>${esc(W.closed)}` : ''}</span>`).join('')}</div>
      ${week.staff.map((p) => {
        const hrs = K.weekHours(week.shifts, p.user_id), ot = !p.exempt && hrs > week.settings.week_ot_min;
        const cpr = p.cpr_until || p.first_aid_until;
        return `<div class="dops-gr" role="row"><span class="dops-gc dops-gname" role="rowheader"><b>${esc(name(p))}</b><span>${esc(String(p.job_role || '').replace(/_/g, ' '))} · ${esc(W.hours(K.hoursLabel(hrs)))}${ot ? ' · OT' : ''}</span>
          <span class="dops-badges">${p.clearance && p.clearance.state !== 'cleared' ? `<span class="dops-chip dops-chip-warn">${esc(lang === 'es' ? 'Antecedentes pendientes' : 'Check pending')}</span>` : ''}${cpr ? `<span class="dops-chip ${cpr < week.week_start ? 'dops-chip-bad' : 'dops-chip-ok'}">CPR ${esc(dlabel(cpr, lang, { month: 'short', day: 'numeric' }))}</span>` : ''}</span></span>
          ${ds.map((d) => `<div class="dops-gc dops-cell${closed.has(d) ? ' is-closed' : ''}${d === week.today ? ' is-today' : ''}" role="cell" data-user="${esc(p.user_id)}" data-day="${d}">
            ${week.shifts.filter((s) => s.user_id === p.user_id && s.day === d).map(blockHtml).join('')}
            <button type="button" class="dops-add" data-add="${esc(p.user_id)}.${d}" aria-label="${esc(`${W.addShift}: ${name(p)}, ${dlabel(d, lang)}`)}">${icon('plus')}</button></div>`).join('')}</div>`;
      }).join('')}</div></div><p class="ffs-note dops-hint">${esc(W.dragHint)} ${esc(W.settingsNote(K.hm(open(), lang), K.hm(close(), lang)))}</p>`;
  }
  function phoneHtml() {
    const ds = days(); if (!ds.includes(phoneDay)) phoneDay = ds.includes(week.today) ? week.today : ds[0];
    const list = week.shifts.filter((s) => s.day === phoneDay).sort((a, b) => a.start_min - b.start_min);
    return `<div class="dops-daychips ffs-scroll" role="group" aria-label="${esc(W.day)}">${ds.map((d) => `<button type="button" class="dops-daychip" data-pday="${d}" aria-pressed="${d === phoneDay}">${esc(dlabel(d, lang))}</button>`).join('')}</div>
      <ul class="dops-daylist">${list.map((s) => { const iss = issuesOf(s), worst = K.worstIssue(iss.filter((x) => x.sev !== 'info'));
        return `<li><button type="button" class="dops-dayrow dops-r-${roomTone(s.room)}" data-shift="${esc(s.id)}"><span class="dops-dayrow-t"><b>${esc(name(person(s.user_id)))}</b><span>${esc(K.span(s.start_min, s.end_min, lang))} · ${esc(roomOf(s.room)?.name || W.noRoom)}</span></span>${worst ? `<span class="dops-chip dops-chip-${worst === 'error' ? 'bad' : 'warn'}">${esc(iss.find((x) => x.sev !== 'info').text)}</span>` : ''}${icon('arrow')}</button></li>`; }).join('') || `<li class="ffs-empty">—</li>`}</ul>
      <button type="button" class="ffs-btn ffs-btn-gold" data-add="${esc(week.staff[0]?.user_id || '')}.${phoneDay}">${icon('plus')}${esc(W.addShift)}</button>
      <p class="ffs-note">${esc(W.tapHint)}</p>`;
  }
  function coverHtml(compact) {
    const grid = K.coverageGrid(week, week.shifts), sum = K.coverageSummary(grid);
    const ds = days();
    const art = `<div class="dops-cov${compact ? ' dops-cov-c' : ''}"><div class="dops-cov-scroll ffs-scroll"><div class="dops-cov-h"><span></span>${ds.map((d) => `<span>${esc(dlabel(d, lang, { weekday: 'short' }))}</span>`).join('')}</div>
      ${grid.map((r) => `<div class="dops-cov-r"><span class="dops-cov-n"><b>${esc(r.room.name)}</b><span>${esc(r.room.rule ? `${r.room.rule.ratio} · ${r.room.enrolled}` : W.nc)}</span></span>
        ${r.days.map((d) => (d.closed ? `<span class="dops-cov-d is-closed">${esc(W.closed)}</span>` : `<a class="dops-cov-d" href="?view=staff&tab=schedule&drawer=cover:${enc(r.room.id)}.${d.day}" data-dops-drawer="cover:${esc(r.room.id)}.${d.day}" aria-label="${esc(`${r.room.name}, ${dlabel(d.day, lang)}: ${['short', 'tight', 'ok'].map((t) => `${d.slots.filter((s) => s.tone === t).length} ${W[t]}`).join(', ')}`)}">
          ${d.slots.map((s) => `<i class="dops-sg dops-t-${s.tone}" title="${esc(`${K.hm(s.t, lang)} ${W[s.tone]}`)}"></i>`).join('')}</a>`)).join('')}</div>`).join('')}
      </div><ul class="dops-legend"><li class="lg-ok">${esc(W.ok)} ${sum.ok}</li><li class="lg-tight">${esc(W.tight)} ${sum.tight}</li><li class="lg-short">${esc(W.short)} ${sum.short}</li><li class="lg-none">${esc(W.none)}</li></ul></div>`;
    const table = ctx.tableHtml ? ctx.tableHtml(esc, { head: [W.room, W.day, W.short, W.tight, W.ok], rows: grid.flatMap((r) => r.days.filter((d) => !d.closed).map((d) => [r.room.name, dlabel(d.day, lang),
      d.slots.filter((s) => s.tone === 'short').map((s) => K.hm(s.t, lang)).join(', ') || '—', d.slots.filter((s) => s.tone === 'tight').map((s) => K.hm(s.t, lang)).join(', ') || '—', String(d.slots.filter((s) => s.tone === 'ok').length)])) }) : '';
    const summary = `${W.coverage}: ${sum.short} ${W.short}, ${sum.tight} ${W.tight}, ${sum.ok} ${W.ok}.`;
    const fig = ctx.figureHtml ? ctx.figureHtml(esc, { id: compact ? 'dopsCovC' : 'dopsCov', art, summary, table, words: { showTable: W.table, hideTable: W.picture }, cls: 'dops-fig' }) : art;
    if (compact) return `<section class="ffs-card dops-card"><div class="ffs-ch"><h3>${icon('ratio')}${esc(W.coverage)}</h3></div>${fig}</section>`;
    const cpr = ds.map((d) => ({ d, cv: (week.closed || []).includes(d) ? null : K.cprCoverage(week, week.shifts, d) })).filter((x) => x.cv);
    const roster = cpr[0]?.cv;
    return `<section class="ffs-card dops-card"><div class="ffs-ch"><h3>${icon('ratio')}${esc(W.coverage)}</h3></div><p class="ffs-sub">${esc(W.coverSub)}</p>${fig}
      <p class="ffs-note">${esc([...new Set(week.rooms.filter((r) => r.rule).map((r) => r.rule.citation))].join(' · '))}</p></section>
      ${roster ? `<section class="ffs-card dops-card"><div class="ffs-ch"><h3>${icon('med')}${esc(W.cprCover)}</h3></div>
        ${roster.need ? `<p class="dops-chip ${roster.certified >= roster.need ? 'dops-chip-ok' : 'dops-chip-warn'}">${esc(W.cprRoster(roster.certified, roster.need))}</p>` : ''}
        <ul class="ffs-list">${cpr.filter((x) => x.cv.gaps.length).map((x) => `<li class="ffs-row"><span class="ffs-dot ffs-t-bad">${icon('alert')}</span><span class="ffs-row-t"><b>${esc(dlabel(x.d, lang))}</b><span>${esc(W.cprShort(x.cv.gaps.map((g) => K.hm(g.t, lang) + (g.room ? ` (${roomOf(g.room)?.name})` : '')).slice(0, 6).join(', ')))}</span></span></li>`).join('') || `<li class="ffs-empty">${esc(W.noIssues)}</li>`}</ul>
        <p class="ffs-note">${esc(roster.citation || '')}</p></section>` : ''}`;
  }
  function swapsHtml() {
    const list = week.swaps || [];
    return `<section class="ffs-card dops-card"><div class="ffs-ch"><h3>${icon('swap')}${esc(W.swaps)}</h3></div>
      <ul class="ffs-list">${list.map((w) => `<li><a class="ffs-row" href="?view=staff&tab=schedule&drawer=swap:${esc(w.id)}" data-dops-drawer="swap:${esc(w.id)}"><span class="ffs-dot ffs-t-${w.status === 'pending' ? 'gold' : 'navy'}">${icon('swap')}</span>
        <span class="ffs-row-t"><b>${esc(W.swapFrom(w.from_name.replace(/^TEST\s+/i, '')))}</b><span>${esc(dlabel(w.shift.day, lang))} · ${esc(K.span(w.shift.start_min, w.shift.end_min, lang))} · ${esc(w.shift.room_name || W.noRoom)}${w.to_name ? ` · ${esc(W.swapTo(w.to_name.replace(/^TEST\s+/i, '')))}` : ` · ${esc(W.anyone)}`}</span></span>
        <span class="dops-chip dops-chip-${w.status === 'pending' ? 'warn' : w.status === 'approved' ? 'ok' : 'nc'}">${esc({ pending: W.pending, approved: W.approvedW, declined: W.declinedW, cancelled: W.cancelledW }[w.status])}</span>${icon('arrow')}</a></li>`).join('') || `<li class="ffs-empty">${esc(W.swapsNone)}</li>`}</ul></section>`;
  }
  function workedHtml() {
    if (!week.published.length && !week.punches.length) return `<section class="ffs-card dops-card"><p class="ffs-empty">${esc(W.workedNone)}</p></section>`;
    const rows = K.reconcile(week.published, week.punches, week.tz, week.today, K.zoned(new Date().toISOString(), week.tz)?.min).filter((r) => !r.future);
    const flagText = (r) => r.flags.map((f) => (f === 'late' ? W.late(r.late) : f === 'early' ? W.early(r.earlyBy) : W[f])).join(' · ');
    const totals = new Map(); for (const r of rows) { const t = totals.get(r.user_id) || { s: 0, w: 0 }; t.s += r.scheduled; t.w += r.worked; totals.set(r.user_id, t); }
    return `<section class="ffs-card dops-card"><div class="ffs-ch"><h3>${icon('clock')}${esc(W.worked)}</h3></div><p class="ffs-sub">${esc(W.workedSub)}</p>
      <div class="dops-worked">${[...totals].map(([uid, t]) => { const v = t.w - t.s; return `<div class="dops-wk-row"><span class="dops-wk-n">${esc(name(person(uid)) || '—')}</span>
        <span class="dops-wk-bars" aria-hidden="true"><i class="dops-wk-s" data-w="${Math.min(100, (t.s / 2400) * 100).toFixed(1)}"></i><i class="dops-wk-w" data-w="${Math.min(100, (t.w / 2400) * 100).toFixed(1)}"></i></span>
        <span class="dops-wk-v ${Math.abs(v) > 30 ? (v < 0 ? 'is-under' : 'is-over') : ''}">${v >= 0 ? '+' : '−'}${esc(K.hoursLabel(Math.abs(v)))} h</span></div>`; }).join('')}</div>
      <div class="ffs-tblwrap">${ctx.tableHtml ? ctx.tableHtml(esc, { head: [W.staff, W.day, W.sched, W.clocked, W.variance, ''], rows: rows.map((r) => [name(person(r.user_id)) || '—', dlabel(r.day, lang),
        `${K.hoursLabel(r.scheduled)} h`, `${K.hoursLabel(r.worked)} h`, `${r.variance >= 0 ? '+' : '−'}${K.hoursLabel(Math.abs(r.variance))} h`, flagText(r) || '—']) }) : ''}</div></section>`;
  }
  function bodyHtml() {
    if (loadErr || !week) return `<p class="ffs-nc">${icon('lock')}<span>${esc(loadErr || W.loadErr)}</span></p>`;
    const main = sect === 'build' ? `${narrow() ? `<section class="ffs-card dops-card">${phoneHtml()}</section>` : `<section class="ffs-card dops-card dops-buildcard">${gridHtml()}</section>`}${coverHtml(true)}`
      : sect === 'cover' ? coverHtml(false) : sect === 'swaps' ? swapsHtml() : workedHtml();
    return `${toolbarHtml()}${segHtml()}<p class="dops-msg" role="status" aria-live="polite">${esc(msg)}</p>${main}`;
  }
  const panelHtml = () => `<div class="dops dops-sched" id="dopsSched">${bodyHtml()}</div>`;

  // ---- behaviour ----
  function settle(scope) { for (const b of scope.querySelectorAll('[data-l]')) { b.style.setProperty('--l', `${b.dataset.l}%`); b.style.setProperty('--w', `${b.dataset.w}%`); }
    for (const b of scope.querySelectorAll('.dops-wk-row [data-w]')) b.style.setProperty('--w', `${b.dataset.w}%`); }
  function render(focusSel = null) {
    if (!root) return;
    root.innerHTML = bodyHtml(); settle(root);
    if (focusSel) root.querySelector(focusSel)?.focus({ preventScroll: true });
    document.dispatchEvent(new CustomEvent('dops:schedule', { detail: { week } }));
  }
  const openDrawer = (kind, from) => ctx.shell?.()?.openDrawer(kind, from);
  async function save(shift, { quiet = false } = {}) {
    try { await rpc('schedule_shift_save', { p_center: c.center_id, p_shift: shift }); msg = W.saved; }
    catch (e) { msg = friendly(e); }
    await load(); render(); if (!quiet) live(msg);
  }
  function usualRoom(uid) {
    const n = new Map(); for (const s of week.shifts) if (s.user_id === uid && s.room) n.set(s.room, (n.get(s.room) || 0) + 1);
    return [...n].sort((a, b) => b[1] - a[1])[0]?.[0] ?? week.rooms[0]?.id ?? null;
  }
  function bind(el) {
    root = el.querySelector('#dopsSched') || el; settle(root);
    if (root.dataset.bound) return; root.dataset.bound = '1';
    root.addEventListener('click', async (e) => {
      const t = e.target.closest('button,a'); if (!t || !root.contains(t)) return;
      if (t.dataset.wk != null) { const d = Number(t.dataset.wk); await load(d ? K.addDays(week.week_start, d) : K.weekOf(week.today)); msg = ''; render(); live(root.querySelector('.dops-wk')?.textContent || ''); return; }
      if (t.dataset.sect) { sect = t.dataset.sect; msg = ''; render(`[data-sect="${sect}"]`); return; }
      if (t.dataset.pday) { phoneDay = t.dataset.pday; render(`[data-pday="${phoneDay}"]`); return; }
      if (t.hasAttribute('data-publish')) { t.disabled = true; try { const r = await rpc('schedule_publish', { p_center: c.center_id, p_week: week.week_start }); msg = W.published_ok(r.notified); } catch (err) { msg = friendly(err); } await load(); render(); live(msg); return; }
      if (t.hasAttribute('data-copy')) { try { const n = await rpc('schedule_copy_week', { p_center: c.center_id, p_from: K.addDays(week.week_start, -7), p_to: week.week_start }); msg = W.copied(n); } catch (err) { msg = friendly(err); } await load(); render(); live(msg); return; }
      if (t.dataset.shift && !t.dataset.dragged) { e.preventDefault(); openDrawer(`shift:${t.dataset.shift}`, t); return; }
      if (t.dataset.add) { e.preventDefault(); const [u, d] = t.dataset.add.split('.'); openDrawer(`add:${u}.${d}`, t); return; }
      if (t.dataset.dopsDrawer) { e.preventDefault(); openDrawer(t.dataset.dopsDrawer, t); }
    });
    // desktop: drag in a day cell to add a shift, drag a shift's edge to change its time (snapped to 15 minutes)
    let drag = null;
    root.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.pointerType === 'touch') return;
      const cell = e.target.closest('.dops-cell'); if (!cell || cell.classList.contains('is-closed') || e.target.closest('.dops-add')) return;
      const r = cell.getBoundingClientRect(), x = e.clientX - r.left;
      const hd = e.target.closest('.dops-hd'), blk = e.target.closest('.dops-blk');
      if (blk && !hd) return;   // a click on a shift opens it
      e.preventDefault();
      if (hd) { const s = week.shifts.find((z) => z.id === blk.dataset.shift); drag = { kind: 'resize', side: hd.classList.contains('dops-hd-l') ? 'l' : 'r', s: { ...s }, cell, r, blk }; }
      else { const m = K.xToMin(x, r.width, open(), close(), 30); const ghost = document.createElement('span'); ghost.className = 'dops-ghost'; cell.appendChild(ghost);
        drag = { kind: 'new', a: m, b: Math.min(close(), m + 30), cell, r, ghost }; }
      cell.setPointerCapture?.(e.pointerId);
      move(e);
    });
    function move(e) {
      if (!drag) return;
      const m = K.xToMin(e.clientX - drag.r.left, drag.r.width, open(), close(), 15);
      if (drag.kind === 'new') { drag.b = m; const a = Math.min(drag.a, drag.b), b = Math.max(drag.a, drag.b, a + 30);
        drag.ghost.style.setProperty('--l', `${K.minToPct(a, open(), close())}%`); drag.ghost.style.setProperty('--w', `${K.minToPct(b, open(), close()) - K.minToPct(a, open(), close())}%`);
        drag.ghost.dataset.t = `${K.hm(a, lang)}–${K.hm(b, lang)}`; }
      else { if (drag.side === 'l') drag.s.start_min = Math.min(m, drag.s.end_min - 30); else drag.s.end_min = Math.max(m, drag.s.start_min + 30);
        drag.blk.style.setProperty('--l', `${K.minToPct(drag.s.start_min, open(), close())}%`); drag.blk.style.setProperty('--w', `${K.minToPct(drag.s.end_min, open(), close()) - K.minToPct(drag.s.start_min, open(), close())}%`);
        drag.blk.querySelector('.dops-blk-t').textContent = `${K.hmShort(drag.s.start_min)}–${K.hmShort(drag.s.end_min)}`; drag.moved = true; }
    }
    root.addEventListener('pointermove', move);
    const end = async () => {
      if (!drag) return; const d = drag; drag = null;
      if (d.kind === 'new') {
        const a = Math.min(d.a, d.b), b = Math.max(d.a, d.b, a + 30); d.ghost.remove();
        if (b - a < 60) { openDrawer(`add:${d.cell.dataset.user}.${d.cell.dataset.day}.${a}`, d.cell.querySelector('.dops-add')); return; }   // a click: the form
        await save({ user_id: d.cell.dataset.user, day: d.cell.dataset.day, room: usualRoom(d.cell.dataset.user), start_min: a, end_min: b, break_min: b - a > week.settings.break_after_min ? week.settings.break_min : 0 });
      } else if (d.moved) { d.blk.dataset.dragged = '1'; await save(d.s); }
    };
    root.addEventListener('pointerup', end); root.addEventListener('pointercancel', end);
  }

  // ---- drawers ----
  function shiftForm(s, isNew) {
    const iss = issuesOf(s);
    const brks = [0, 15, 30, 45, 60];
    return `<form class="dops-form" id="dopsShiftForm">
      <label class="dops-f"><span>${esc(W.who)}</span><select class="i" name="user_id">${week.staff.map((p) => `<option value="${esc(p.user_id)}"${p.user_id === s.user_id ? ' selected' : ''}>${esc(name(p))}</option>`).join('')}</select></label>
      <label class="dops-f"><span>${esc(W.day)}</span><select class="i" name="day">${days().map((d) => `<option value="${d}"${d === s.day ? ' selected' : ''}>${esc(dlabel(d, lang, { weekday: 'long', month: 'short', day: 'numeric' }))}</option>`).join('')}</select></label>
      <label class="dops-f"><span>${esc(W.room)}</span><select class="i" name="room"><option value="">${esc(W.noRoom)}</option>${week.rooms.map((r) => `<option value="${esc(r.id)}"${r.id === s.room ? ' selected' : ''}>${esc(r.name)}${r.rule ? ` (${esc(r.rule.ratio)})` : ''}</option>`).join('')}</select></label>
      <div class="dops-f2"><label class="dops-f"><span>${esc(W.start)}</span><input class="i" type="time" name="start" step="300" required value="${K.toInput(s.start_min)}"></label>
        <label class="dops-f"><span>${esc(W.end)}</span><input class="i" type="time" name="end" step="300" required value="${K.toInput(s.end_min)}"></label></div>
      <label class="dops-f"><span>${esc(W.brk)}</span><select class="i" name="break_min">${brks.map((m) => `<option value="${m}"${m === (s.break_min || 0) ? ' selected' : ''}>${esc(m ? W.mins(m) : W.brkNone)}</option>`).join('')}</select></label>
      <label class="dops-f"><span>${esc(W.note)}</span><input class="i" name="note" maxlength="300" autocomplete="off" value="${esc(s.note || '')}"></label>
      <div class="dops-issues" aria-live="polite">${issuesHtml(iss)}</div>
      <p class="dops-msg" role="status"></p>
      <div class="dops-formacts"><button class="ffs-btn ffs-btn-bop" type="submit">${esc(W.save)}</button>${isNew ? '' : `<button class="ffs-btn ffs-btn-soft dops-danger" type="button" data-delete>${esc(W.del)}</button>`}</div></form>`;
  }
  function issuesHtml(iss) {
    return `<h4 class="dops-h4">${esc(W.issues)}</h4>${iss.length ? `<ul class="dops-isslist">${iss.map((x) => `<li class="dops-iss-${x.sev}"><span>${esc(x.text)}</span><span class="dops-kind">${esc(W[x.kind])}</span></li>`).join('')}</ul>` : `<p class="ffs-note">${esc(W.noIssues)}</p>`}`;
  }
  function bindShiftForm(el, base) {
    const f = el.querySelector('#dopsShiftForm'); if (!f) return;
    const read = () => ({ ...base, user_id: f.user_id.value, day: f.day.value, room: f.room.value || null, start_min: K.fromInput(f.start.value), end_min: K.fromInput(f.end.value), break_min: Number(f.break_min.value), note: f.note.value || null });
    f.addEventListener('input', () => { const s = read(); if (s.start_min != null && s.end_min != null) f.querySelector('.dops-issues').innerHTML = issuesHtml(issuesOf(s)); });
    f.addEventListener('submit', async (e) => {
      e.preventDefault(); const s = read(); const out = f.querySelector('.dops-msg');
      f.querySelector('[type=submit]').disabled = true;
      try { await rpc('schedule_shift_save', { p_center: c.center_id, p_shift: s }); msg = W.saved; await load(); render(); live(msg); ctx.shell?.()?.closeDrawer(); }
      catch (err) { out.textContent = friendly(err); f.querySelector('[type=submit]').disabled = false; }
    });
    f.querySelector('[data-delete]')?.addEventListener('click', async () => {
      try { await rpc('schedule_shift_delete', { p_center: c.center_id, p_id: base.id }); msg = W.deleted; await load(); render(); live(msg); ctx.shell?.()?.closeDrawer(); }
      catch (err) { f.querySelector('.dops-msg').textContent = friendly(err); }
    });
  }
  function coverDrawer(roomId, day) {
    const room = roomOf(roomId); if (!room) return null;
    const grid = K.coverageGrid(week, week.shifts, [day])[week.rooms.indexOf(room)].days[0];
    const rows = grid.slots.map((s) => {
      const fixes = s.tone === 'short' ? K.fixSuggestions(week, week.shifts, roomId, day, s.t).slice(0, 3) : [];
      return `<li class="dops-slot dops-t-${s.tone}"><span class="dops-slot-t"><b>${esc(K.hm(s.t, lang))}</b><span>${esc(W[s.tone])}${s.required != null && s.expected ? ` · ${esc(W.expected(s.expected))} · ${esc(W.needed(s.required))} · ${esc(W.scheduled(s.scheduled))}` : ''}${s.groupOver ? ` · ${esc(W.groupOver(s.groupOver))}` : ''}</span></span>
        ${fixes.length ? `<div class="dops-fix"><b>${esc(W.fix)}:</b> ${fixes.map((f) => `<button type="button" class="ffs-btn ffs-btn-soft dops-sm" data-fix="${esc(f.user_id)}" data-fix-t="${s.t}" data-fix-kind="${f.kind}"${f.shift ? ` data-fix-shift="${esc(f.shift)}"` : ''}>${esc(f.kind === 'move' ? W.fixMove(f.name.replace(/^TEST\s+/i, ''), f.fromName) : W.fixFree(f.name.replace(/^TEST\s+/i, ''), K.span(s.t, s.t + 60, lang)))}</button>`).join('')}</div>`
          : s.tone === 'short' ? `<p class="ffs-note">${esc(W.fixNone)}</p>` : ''}</li>`;
    }).join('');
    return { title: `${room.name} · ${dlabel(day, lang)}`, html: `<p class="ffs-sub">${esc(room.rule ? `${room.rule.ratio} · ${room.rule.label || ''}` : W.nc)}</p><p class="dops-msg" role="status"></p><ul class="dops-slots">${rows}</ul>${room.rule ? `<p class="ffs-note">${esc(room.rule.citation)}</p>` : ''}`,
      bind: (el) => el.querySelectorAll('[data-fix]').forEach((b) => b.addEventListener('click', async () => {
        const t = Number(b.dataset.fixT), uid = b.dataset.fix;
        // extend a short window to the whole contiguous run of short hours
        const run = grid.slots.filter((s) => s.tone === 'short').map((s) => s.t); let a = t, z = t + 60; while (run.includes(a - 60)) a -= 60; while (run.includes(z)) z += 60;
        b.disabled = true;
        try {
          if (b.dataset.fixKind === 'floater') { const s = week.shifts.find((x) => x.user_id === uid && x.day === day && !x.room && x.start_min <= t && x.end_min > t); await rpc('schedule_shift_save', { p_center: c.center_id, p_shift: { ...s, room: roomId } }); }
          else if (b.dataset.fixKind === 'move') { const s = week.shifts.find((x) => x.id === b.dataset.fixShift); await rpc('schedule_shift_save', { p_center: c.center_id, p_shift: { ...s, room: roomId } }); }
          else { const mine = week.shifts.filter((x) => x.user_id === uid && x.day === day); const adj = mine.find((x) => x.end_min === a || x.start_min === z);
            await rpc('schedule_shift_save', { p_center: c.center_id, p_shift: adj && adj.room === roomId ? { ...adj, start_min: Math.min(adj.start_min, a), end_min: Math.max(adj.end_min, z) } : { user_id: uid, day, room: roomId, start_min: a, end_min: z, break_min: 0 } }); }
          msg = W.saved; await load(); render(); live(msg); ctx.shell?.()?.closeDrawer();
        } catch (err) { el.querySelector('.dops-msg').textContent = friendly(err); b.disabled = false; }
      })) };
  }
  function swapDrawer(id) {
    const w = (week.swaps || []).find((x) => x.id === id); if (!w) return null;
    const busy = (uid) => week.published.some((p) => p.user_id === uid && p.day === w.shift.day && p.start_min < w.shift.end_min && p.end_min > w.shift.start_min);
    return { title: W.swapFrom(w.from_name.replace(/^TEST\s+/i, '')), html: `<p class="dops-big">${esc(dlabel(w.shift.day, lang, { weekday: 'long', month: 'long', day: 'numeric' }))}<br><b>${esc(K.span(w.shift.start_min, w.shift.end_min, lang))}</b> · ${esc(w.shift.room_name || W.noRoom)}</p>
      ${w.note ? `<p class="dops-note">“${esc(w.note)}”</p>` : ''}
      ${w.status === 'pending' ? `<form class="dops-form" id="dopsSwapForm"><label class="dops-f"><span>${esc(W.takes)}</span><select class="i" name="to">${week.staff.filter((p) => p.user_id !== w.from_user).map((p) => `<option value="${esc(p.user_id)}"${p.user_id === w.to_user ? ' selected' : ''}${busy(p.user_id) ? ' disabled' : ''}>${esc(name(p))}${busy(p.user_id) ? ` (${esc(lang === 'es' ? 'ocupada' : 'busy')})` : ''}</option>`).join('')}</select></label>
        <label class="dops-f"><span>${esc(W.note)}</span><input class="i" name="note" maxlength="300" autocomplete="off"></label><p class="dops-msg" role="status"></p>
        <div class="dops-formacts"><button class="ffs-btn ffs-btn-bop" type="submit" value="1">${esc(W.approve)}</button><button class="ffs-btn ffs-btn-soft" type="button" data-decline>${esc(W.decline)}</button></div></form>`
        : `<p><span class="dops-chip">${esc({ approved: W.approvedW, declined: W.declinedW, cancelled: W.cancelledW }[w.status])}</span>${w.to_name ? ` ${esc(W.swapTo(w.to_name.replace(/^TEST\s+/i, '')))}` : ''}</p>${w.decision_note ? `<p class="dops-note">${esc(w.decision_note)}</p>` : ''}`}`,
      bind: (el) => { const f = el.querySelector('#dopsSwapForm'); if (!f) return;
        const act = async (approve) => { try { await rpc('schedule_swap_decide', { p_center: c.center_id, p_swap: id, p_approve: approve, p_to_user: approve ? f.to.value : null, p_note: f.note.value || null });
          msg = approve ? W.swapApproved : W.swapDeclined; await load(); render(); live(msg); ctx.shell?.()?.closeDrawer(); } catch (err) { f.querySelector('.dops-msg').textContent = friendly(err); } };
        f.addEventListener('submit', (e) => { e.preventDefault(); act(true); }); f.querySelector('[data-decline]').addEventListener('click', () => act(false)); } };
  }
  function drawer(kind) {
    if (!week) return null;
    const [k, arg = ''] = kind.split(/:(.*)/s);
    if (k === 'shift') { const s = week.shifts.find((x) => x.id === arg); if (!s) return null; return { title: `${W.editShift} · ${name(person(s.user_id))}`, html: shiftForm(s, false), bind: (el) => bindShiftForm(el, s) }; }
    if (k === 'add') { const [u, d, st] = arg.split('.'); const p = person(u) || week.staff[0]; if (!p) return null; const day = days().includes(d) ? d : days()[0];
      const s0 = st ? Number(st) : Math.max(open(), 450); const s = { user_id: p.user_id, day, room: usualRoom(p.user_id), start_min: s0, end_min: Math.min(close(), s0 + 480), break_min: 30, note: null };
      return { title: W.newShift, html: shiftForm(s, true), bind: (el) => bindShiftForm(el, s) }; }
    if (k === 'cover') { const [r, d] = arg.split(/\.(?=\d{4}-)/); return coverDrawer(r, d); }
    if (k === 'swap') return swapDrawer(arg);
    return null;
  }

  // ---- the Overview: the real schedule (published) behind "Staff on the clock" and "Staffing vs need" ----
  function overview(staffing, nowMin) {
    if (!week) return null;
    const today = week.today, pub = week.published || [];
    return { scheduledNow: K.scheduledNow(pub, today, nowMin), staffing: K.withScheduled(staffing, pub, today), published: week.week.status === 'published', hasToday: pub.some((s) => s.day === today) };
  }
  return { load, data: () => week, panelHtml, bind, drawer, overview, render };
}
