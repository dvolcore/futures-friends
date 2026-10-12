// Teacher planning, the room roster and the substitute sheet (directors and teachers with the classroom permission). Mounted by app.js:
//   /c/<slug>/plan?room=<id>&week=<YYYY-MM-DD>   the week: each school day's curriculum day (from the center calendar + the room's pacing),
//                                                its activities to mark done / moved / skipped, notes, the materials list; printable.
//                                                Directors also set the start date, closed days and each room's pacing here.
//   /c/<slug>/roster?room=<id>                   room essentials on one screen: first name, photo (photo consent only), care alerts,
//                                                pickup list, today's attendance. Printable.
//   /c/<slug>/sub?room=<id>                      the substitute sheet: today's plan + the roster essentials, read only.
// The curriculum text comes only from /api/curriculum/* (curriculum-server.mjs: signed-in directors and teachers of this center); the
// settings, marks and roster come from the database functions of 20261026600000_teacher_planning.sql. Design: hub/TEACHER_PLANNING.md.
import { localeOf, uiLang } from './i18n.js';   // the reader's own language for dates and times (en-US / es-US)
import { centerToday } from './center-time.js';   // the plan's day is the center's day (hub/TIME_ZONES.md)
import { isIso, addDays, mondayOf, planFor, weekPlan, materialsFromText } from './plan-core.js';

const STATUS = { planned: 'Planned', done: 'Done', moved: 'Moved', skipped: 'Skipped' };
const STATUS_CHIP = { planned: '', done: 'ok', moved: 'gold', skipped: 'warn' };
const NOT_SCHOOL = { weekend: 'Weekend', closed: 'Closed', before_start: 'Before the curriculum starts', not_started: 'This room has not reached day 1 yet',
  finished: 'The 180 days are finished', no_calendar: 'No calendar yet' };
const SEV = { life_threatening: 'bad', severe: 'bad', moderate: 'warn', mild: 'gold', info: '' };
const ATT = { here: ['ok', 'Here'], gone: ['', 'Gone home'], out: ['', 'Not in yet'] };
const KIND = { guardian: 'Guardian', authorized: 'May pick up', never: 'Do NOT release to' };
const dateLabel = (s) => new Date(`${s}T12:00:00Z`).toLocaleDateString(localeOf(), { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' });

export function mountPlan({ esc, $, rpc, client, page, live, friendly, session }) {
  async function api(c, path) {
    const s = await session();
    if (!s) throw new Error('Your sign-in has run out. Sign in again.');
    // the curriculum's Spanish DRAFT for a Spanish reader (same staff-only routes; the block keys stay the same, so marks still match)
    if (uiLang() === 'es' && path.startsWith('/api/curriculum/')) path += `${path.includes('?') ? '&' : '?'}lang=es`;
    const r = await fetch(path, { headers: { Authorization: `Bearer ${s.access_token}`, 'X-Center': c.center_id }, cache: 'no-store' });
    let j = null; try { j = await r.json(); } catch { /* not json */ }
    if (!r.ok) throw new Error(j?.error || 'That did not work. Try again.');
    return j;
  }
  const q = () => new URLSearchParams(location.search);
  const setQ = (k, v) => { const p = q(); if (v == null || v === '') p.delete(k); else p.set(k, v); history.replaceState(null, '', `${FFTest.pathname()}?${p}`); };
  const settingsOf = (st, room) => ({ start: st.calendar?.start_date || null, includeReview: st.calendar ? st.calendar.include_review : true,
    closed: [...(st.closed || []), ...(st.holidays || [])], offset: (st.rooms.find((r) => r.id === room) || {}).offset || 0 });
  const pickRoom = (st) => { const want = q().get('room'); return (st.rooms.find((r) => r.id === want) || st.rooms[0] || {}).id || null; };
  const roomBar = (st, room, id) => (st.rooms.length > 1 ? `<label class="pl-room"><span>Room</span><select class="i" id="${id}">${st.rooms.map((r) => `<option value="${esc(r.id)}"${r.id === room ? ' selected' : ''}>${esc(r.name)}</option>`).join('')}</select></label>`
    : `<span class="chip">${esc((st.rooms[0] || {}).name || 'No rooms yet')}</span>`);
  const fail = (shell, title, e) => page(shell(`<div class="card"><h2>${esc(title)}</h2><p class="msg bad" role="alert">${esc(friendly(e))}</p></div>`), title, { english: true });

  // ---------------------------------------------------------------- the week plan
  async function viewPlan(c, shell) {
    page(shell('<p class="loading">Opening the plan…</p>'), 'Planning', { english: true });
    let st, seq;
    try { [st, seq] = await Promise.all([rpc('plan_settings_get', { p_center: c.center_id }), api(c, '/api/curriculum/sequence')]); }
    catch (e) { return fail(shell, 'Planning', e); }
    const room = pickRoom(st);
    const today = centerToday();
    const wk = isIso(q().get('week')) ? mondayOf(q().get('week')) : mondayOf(today);
    const days = room ? weekPlan(wk, settingsOf(st, room), seq.days) : [];
    const ids = [...new Set(days.filter((d) => d.status === 'ok').map((d) => d.id))];
    let plans = {}, marks = [];
    try {
      const got = await Promise.all(ids.map((id) => api(c, `/api/curriculum/plan/${encodeURIComponent(id)}`)));
      plans = Object.fromEntries(got.map((p) => [p.id, p]));
      if (room && ids.length) marks = await rpc('plan_marks_get', { p_center: c.center_id, p_room: room, p_days: ids });
    } catch (e) { return fail(shell, 'Planning', e); }
    const mk = (id, key) => marks.find((m) => m.day_id === id && m.block === key) || null;
    const roomName = (st.rooms.find((r) => r.id === room) || {}).name || '';
    const blockRow = (d, b) => {
      const m = mk(d.id, b.key) || { status: 'planned' };
      return `<li class="pl-block" data-day="${esc(d.id)}" data-block="${esc(b.key)}">
        <div class="pl-bhead"><b>${esc(b.label)}</b>${b.minutes ? `<span class="small muted">about ${esc(b.minutes)} min</span>` : ''}
          <span class="chip ${STATUS_CHIP[m.status]}" data-chip>${esc(STATUS[m.status])}${m.status === 'moved' && m.moved_to ? ` to ${esc(m.moved_to)}` : ''}</span></div>
        ${b.goal ? `<p class="small">${esc(b.goal)}</p>` : ''}
        ${b.materials.length ? `<p class="small muted"><b>Materials:</b> ${esc(b.materials.join('; '))}</p>` : ''}
        ${m.note ? `<p class="small pl-note"><b>Note:</b> ${esc(m.note)}</p>` : ''}
        <details class="pl-mark no-print"><summary>Mark this activity</summary>
          <form class="pl-form" novalidate data-form>
            <fieldset class="pl-status"><legend class="sr-only">What happened</legend>
              ${['done', 'moved', 'skipped', 'planned'].map((s) => `<label class="choice"><input type="radio" name="st" value="${s}"${m.status === s ? ' checked' : ''}><span>${s === 'planned' ? 'Not yet' : STATUS[s]}</span></label>`).join('')}</fieldset>
            <label class="f"><span>Moved to <span class="hint">only for Moved</span></span><input class="i" type="date" name="moved" value="${esc(m.moved_to || '')}"></label>
            <label class="f"><span>Note</span><textarea class="i" name="note" rows="2" maxlength="1000">${esc(m.note || '')}</textarea></label>
            <p class="small msg" role="status" data-msg></p><button class="btn navy small" type="submit">Save</button></form></details></li>`;
    };
    const dayCard = (d) => {
      const head = `<h3>${esc(dateLabel(d.date))}${d.date === today ? ' <span class="chip gold">Today</span>' : ''}</h3>`;
      if (d.status !== 'ok') return `<section class="card pl-day pl-off">${head}<p class="muted">${esc(NOT_SCHOOL[d.status] || d.status)}${d.label ? `: ${esc(d.label)}` : ''}</p></section>`;
      const p = plans[d.id] || { blocks: [], supplies: [] };
      const dm = mk(d.id, 'day') || {};
      const mats = dm.materials && dm.materials.length ? dm.materials : [];
      return `<section class="card pl-day" data-dayid="${esc(d.id)}">${head}
        <p class="pl-sub"><b>${esc(d.id)}</b>: ${esc(p.title || d.theme)} <span class="small muted">· school day ${d.n}${d.review ? ' · review day' : ''}${p.may_be_closed ? ' · may fall on a closed day' : ''}</span></p>
        <ol class="pl-blocks">${p.blocks.map((b) => blockRow(d, b)).join('')}</ol>
        ${p.supplies.length ? `<details class="pl-supplies"><summary>Supplies for the day (${p.supplies.length})</summary><ul>${p.supplies.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></details>` : ''}
        ${p.prep ? `<p class="small muted"><b>Prep:</b> ${esc(p.prep)}</p>` : ''}
        <form class="pl-dayform" novalidate data-dayform="${esc(d.id)}">
          <label class="f"><span>Our materials list <span class="hint">one per line; prints with the plan</span></span><textarea class="i" name="materials" rows="3">${esc(mats.join('\n'))}</textarea></label>
          <label class="f"><span>Notes for the day</span><textarea class="i" name="note" rows="2" maxlength="1000">${esc(dm.note || '')}</textarea></label>
          <p class="small msg" role="status" data-msg></p><button class="btn soft small no-print" type="submit">Save notes and materials</button></form></section>`;
    };
    const setup = st.director ? settingsCard(st, room, c) : '';
    page(shell(`<div class="pl" id="planPage">
      <div class="pl-head"><div><h2>Planning: week of ${esc(dateLabel(wk))}</h2>
        <p class="small muted">${esc(roomName)}${room && st.calendar ? ` · pacing ${settingsOf(st, room).offset > 0 ? '+' : ''}${settingsOf(st, room).offset} school days` : ''}. For your program's educators only: please do not share the curriculum outside your program.</p></div>
        <span class="chip warn">Curriculum draft</span></div>
      <div class="pl-bar card no-print" role="group" aria-label="Week and room">
        ${roomBar(st, room, 'plRoom')}
        <a class="btn soft small" href="?${new URLSearchParams({ room: room || '', week: addDays(wk, -7) })}" data-week="${esc(addDays(wk, -7))}">Previous week</a>
        <a class="btn soft small" href="?${new URLSearchParams({ room: room || '', week: mondayOf(today) })}" data-week="${esc(mondayOf(today))}">This week</a>
        <a class="btn soft small" href="?${new URLSearchParams({ room: room || '', week: addDays(wk, 7) })}" data-week="${esc(addDays(wk, 7))}">Next week</a>
        <button class="btn navy small" type="button" id="plPrint">Print the week</button>
        ${room ? `<a class="btn soft small" href="/c/${esc(c.slug)}/roster?room=${encodeURIComponent(room)}" data-nav>Room roster</a>
        <a class="btn soft small" href="/c/${esc(c.slug)}/sub?room=${encodeURIComponent(room)}" data-nav id="plSubLink">Substitute sheet</a>` : ''}
      </div>
      ${!st.calendar ? `<div class="card" id="plNoCal"><h3>No curriculum calendar yet</h3><p>${st.director ? 'Set the date your program starts Day 1 (below). Until then, pick a day on the Curriculum tab.' : 'Your director has not set the date your program starts Day 1. Until then, pick a day on the Curriculum tab.'}</p>
        <a class="btn soft small" href="/c/${esc(c.slug)}/curriculum" data-nav>Open the Curriculum tab</a></div>`
        : !room ? '<div class="card"><p>There are no rooms to plan for yet.</p></div>' : `<div class="pl-week">${days.map(dayCard).join('')}</div>`}
      ${setup}</div>`), 'Planning', { english: true });
    bindPlan(c, st, room, wk);
  }

  function settingsCard(st, room, c) {
    const cal = st.calendar || {};
    return `<details class="card pl-settings no-print" id="plSettings"${st.calendar ? '' : ' open'}><summary><b>Curriculum calendar</b> <span class="small muted">directors</span></summary>
      <form id="plCalForm" novalidate class="row two">
        <label class="f"><span>Day 1 of the curriculum <span class="hint">a Monday to Friday</span></span><input class="i" type="date" id="plStart" value="${esc(cal.start_date || '')}" required></label>
        <label class="choice"><input type="checkbox" id="plReview"${cal.include_review === false ? '' : ' checked'}><span>Run the 25 review days in order (R01-R25)</span></label>
        <p class="small msg" role="status" id="plCalMsg"></p><button class="btn navy small" type="submit">Save the calendar</button></form>
      <h4>Closed days</h4><p class="small muted">The curriculum does not move on a closed day: the next school day picks up where the room left off. Built-in Jewish and US holidays, early dismissals and weather closures are on the <a href="/c/${esc(c.slug)}/calendar" data-nav>center calendar</a> (one calendar for the plan, the menu and the daily report).</p>
      <ul class="list" id="plClosed">${st.closed.map((d) => `<li><span class="who"><b>${esc(dateLabel(d.day))}</b><span class="small muted">${esc(d.label)}</span></span><button class="btn link small" type="button" data-open="${esc(d.day)}">Open again</button></li>`).join('') || '<li class="muted small">None yet.</li>'}</ul>
      <form id="plClosedForm" novalidate class="row two"><label class="f"><span>Closed on</span><input class="i" type="date" id="plClosedDay" required></label>
        <label class="f"><span>Why <span class="hint">optional</span></span><input class="i" id="plClosedLabel" maxlength="80" placeholder="Thanksgiving"></label>
        <p class="small msg" role="status" id="plClosedMsg"></p><button class="btn soft small" type="submit">Add a closed day</button></form>
      <h4>Room pacing</h4><p class="small muted">A room that runs ahead (+) or behind (-) the center calendar, in school days.</p>
      <ul class="list" id="plPacing">${st.rooms.map((r) => `<li><span class="who"><b>${esc(r.name)}</b></span><label class="pl-pace"><span class="sr-only">Pacing for ${esc(r.name)}</span><input class="i" type="number" min="-60" max="60" step="1" value="${esc(r.offset)}" data-room="${esc(r.id)}"></label><button class="btn soft small" type="button" data-pace="${esc(r.id)}">Save</button></li>`).join('')}</ul>
      <p class="small msg" role="status" id="plPaceMsg"></p>
      <h4>A substitute</h4><p class="small">Invite the substitute as staff (Invite staff, job role Substitute), then on Permissions give them the classroom for this one room only.
        Send them the substitute sheet link: they sign in with their own account and see today's plan and the roster essentials for that room, read only.
        Remove their access on People when they are done. ${room ? `<button class="btn link small" type="button" id="plCopySub">Copy the substitute sheet link</button>` : ''}</p>
      <p class="small msg" role="status" id="plSubMsg"></p></details>`;
  }

  function bindPlan(c, st, room, wk) {
    const rerender = () => viewPlanAgain();
    const roomSel = $('#plRoom');
    if (roomSel) roomSel.addEventListener('change', () => { setQ('room', roomSel.value); rerender(); });
    for (const a of document.querySelectorAll('a[data-week]')) a.addEventListener('click', (e) => { e.preventDefault(); setQ('room', room); setQ('week', a.dataset.week); rerender(); });
    $('#plPrint')?.addEventListener('click', () => { for (const d of document.querySelectorAll('.pl-supplies')) d.open = true; window.print(); });
    // activity marks
    for (const f of document.querySelectorAll('form[data-form]')) {
      f.addEventListener('submit', async (e) => {
        e.preventDefault();
        const li = f.closest('li[data-block]'), msg = f.querySelector('[data-msg]');
        const status = (f.querySelector('input[name=st]:checked') || {}).value || 'planned';
        const moved = f.moved.value || null;
        if (status === 'moved' && !moved) { msg.className = 'small msg bad'; msg.textContent = 'Choose the day it moves to.'; f.moved.focus(); return; }
        msg.className = 'small msg info'; msg.textContent = 'Saving…';
        try {
          const r = await rpc('plan_mark_save', { p_center: c.center_id, p_room: room, p_day: li.dataset.day, p_block: li.dataset.block, p_status: status,
            p_moved_to: status === 'moved' ? moved : null, p_note: f.note.value, p_materials: null });
          const chip = li.querySelector('[data-chip]');
          chip.className = `chip ${STATUS_CHIP[r.status]}`; chip.textContent = `${STATUS[r.status]}${r.status === 'moved' && r.moved_to ? ` to ${r.moved_to}` : ''}`;
          msg.className = 'small msg ok'; msg.textContent = 'Saved.'; live(`Saved: ${STATUS[r.status]}`);
        } catch (err) { msg.className = 'small msg bad'; msg.textContent = friendly(err); }
      });
    }
    for (const f of document.querySelectorAll('form[data-dayform]')) {
      f.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = f.querySelector('[data-msg]');
        msg.className = 'small msg info'; msg.textContent = 'Saving…';
        try {
          await rpc('plan_mark_save', { p_center: c.center_id, p_room: room, p_day: f.dataset.dayform, p_block: 'day', p_status: 'planned', p_moved_to: null,
            p_note: f.note.value, p_materials: materialsFromText(f.materials.value) });
          msg.className = 'small msg ok'; msg.textContent = 'Saved.'; live('Notes and materials saved.');
        } catch (err) { msg.className = 'small msg bad'; msg.textContent = friendly(err); }
      });
    }
    if (!st.director) return;
    const say = (id, ok, t) => { const m = $(id); if (m) { m.className = `small msg ${ok ? 'ok' : 'bad'}`; m.textContent = t; } };
    $('#plCalForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = $('#plStart').value;
      if (!isIso(v)) return say('#plCalMsg', false, 'Choose the first day of the curriculum.');
      try { await rpc('plan_calendar_save', { p_center: c.center_id, p_start: v, p_include_review: $('#plReview').checked }); live('Calendar saved.'); rerender(); }
      catch (err) { say('#plCalMsg', false, friendly(err)); }
    });
    $('#plClosedForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = $('#plClosedDay').value;
      if (!isIso(v)) return say('#plClosedMsg', false, 'Choose the closed day.');
      try { await rpc('plan_closed_day_set', { p_center: c.center_id, p_day: v, p_closed: true, p_label: $('#plClosedLabel').value }); live('Closed day added.'); rerender(); }
      catch (err) { say('#plClosedMsg', false, friendly(err)); }
    });
    $('#plClosed')?.addEventListener('click', async (e) => {
      const b = e.target.closest('button[data-open]'); if (!b) return;
      try { await rpc('plan_closed_day_set', { p_center: c.center_id, p_day: b.dataset.open, p_closed: false, p_label: '' }); live('The center is open that day again.'); rerender(); }
      catch (err) { say('#plClosedMsg', false, friendly(err)); }
    });
    $('#plPacing')?.addEventListener('click', async (e) => {
      const b = e.target.closest('button[data-pace]'); if (!b) return;
      const inp = document.querySelector(`input[data-room="${CSS.escape(b.dataset.pace)}"]`);
      const n = Number(inp.value);
      if (!Number.isInteger(n) || n < -60 || n > 60) return say('#plPaceMsg', false, 'Use a whole number from -60 to 60.');
      try { await rpc('plan_pacing_set', { p_center: c.center_id, p_room: b.dataset.pace, p_offset: n }); live('Pacing saved.'); rerender(); }
      catch (err) { say('#plPaceMsg', false, friendly(err)); }
    });
    $('#plCopySub')?.addEventListener('click', async () => {
      const link = `${location.origin}/c/${c.slug}/sub?room=${encodeURIComponent(room)}`;
      try { await navigator.clipboard.writeText(link); say('#plSubMsg', true, `Copied: ${link}`); } catch { say('#plSubMsg', true, link); }
    });
  }
  let current = null;   // { c, shell } of the page on screen, so a change re-renders it in place
  const viewPlanAgain = () => current && viewPlan(current.c, current.shell);

  // ---------------------------------------------------------------- roster cards (shared by the roster and the substitute sheet)
  // langs: kid -> home language ('es' | 'both' get a chip: the family speaks Spanish at home; kid_languages_list)
  function rosterHtml(kids, langs = {}) {
    if (!kids.length) return '<p class="muted">No children in this room.</p>';
    const chip = (kid) => (['es', 'both'].includes(langs[kid]) ? ` <span class="lang-chip" translate="no" title="${langs[kid] === 'es' ? 'Spanish at home' : 'English and Spanish at home'}">${langs[kid] === 'es' ? 'ES' : 'EN+ES'}</span>` : '');
    return `<ul class="pl-roster">${kids.map((k) => {
      const [cls, att] = k.absent ? ['warn', k.excused ? 'Absent — reported by family' : 'Absent today'] : (ATT[k.attendance] || ['', 'Not in yet']);
      const never = k.pickup.filter((p) => p.kind === 'never');
      return `<li class="card pl-kid" data-kid="${esc(k.kid)}">
        <div class="pl-kidhead">${k.photo_path ? `<img class="pl-photo" data-path="${esc(k.photo_path)}" alt="${esc(k.first)}" width="64" height="64">` : `<span class="pl-photo pl-initial" aria-hidden="true">${esc((k.first || '?')[0])}</span>`}
          <div><h3>${esc(k.first)}${chip(k.kid)}</h3><span class="chip ${cls}">${esc(att)}</span>${k.photo_path ? '' : '<span class="small muted pl-nophoto">No photo (no photo consent)</span>'}</div></div>
        ${k.alerts.length ? `<ul class="pl-alerts" aria-label="Care alerts">${k.alerts.map((a) => `<li class="pl-alert ${SEV[a.severity] || ''}"><b>${esc(a.label)}</b>${a.emergency_med ? ' <span class="chip bad">Emergency medicine</span>' : ''}${a.verified ? '' : ' <span class="chip warn">Not verified</span>'}
          ${a.staff_summary ? `<div class="small">${esc(a.staff_summary)}</div>` : ''}${a.reaction ? `<div class="small"><b>Reaction:</b> ${esc(a.reaction)}</div>` : ''}${a.action_plan ? `<div class="small"><b>What to do:</b> ${esc(a.action_plan)}</div>` : ''}</li>`).join('')}</ul>`
          : '<p class="small muted">No care alerts.</p>'}
        <h4 class="small">Pickup</h4><ul class="pl-pickup">${k.pickup.filter((p) => p.kind !== 'never').map((p) => `<li>${esc(p.name)} <span class="small muted">${esc(p.relationship || '')} · ${esc(KIND[p.kind] || p.kind)}</span></li>`).join('') || '<li class="small muted">No one on the list: ask the director.</li>'}</ul>
        ${never.length ? `<p class="msg bad small pl-never"><b>Do NOT release to:</b> ${never.map((p) => esc(p.name)).join(', ')}</p>` : ''}
      </li>`;
    }).join('')}</ul>`;
  }
  // The photo is downloaded under the child-photos storage policies (the person's own session) and shown as a data: URL: the Hub's CSP
  // allows images only from itself and data:, never from the storage host.
  function loadPhotos() {
    for (const im of document.querySelectorAll('img.pl-photo[data-path]')) {
      client().storage.from('child-photos').download(im.dataset.path).then((r) => {
        if (!r.data) return im.remove();
        const fr = new FileReader();
        fr.onload = () => { if (/^data:image\/(png|jpeg|webp|gif);/.test(String(fr.result))) im.src = fr.result; else im.remove(); };
        fr.onerror = () => im.remove();
        fr.readAsDataURL(r.data);
      }).catch(() => im.remove());
    }
  }

  async function viewRoster(c, shell) {
    page(shell('<p class="loading">Opening the roster…</p>'), 'Room roster', { english: true });
    let st, kids;
    try {
      st = await rpc('plan_settings_get', { p_center: c.center_id });
      const room = pickRoom(st);
      kids = room ? await rpc('room_roster', { p_center: c.center_id, p_room: room, p_date: centerToday() }) : [];
      const langs = {};
      try { for (const x of (await rpc('kid_languages_list', { p_center: c.center_id })) || []) langs[x.kid] = x.home; } catch (_) { /* no chips */ }
      const name = (st.rooms.find((r) => r.id === room) || {}).name || '';
      page(shell(`<div class="pl" id="rosterPage"><div class="pl-head"><div><h2>Room roster: ${esc(name)}</h2>
        <p class="small muted">${esc(dateLabel(centerToday()))} · ${kids.length} children · care alerts, pickup and today's attendance. Keep this page private: it is about the children in your care.</p></div></div>
        <div class="pl-bar card no-print">${roomBar(st, room, 'rsRoom')}<button class="btn navy small" type="button" id="rsPrint">Print</button>
          ${room ? `<a class="btn soft small" href="/c/${esc(c.slug)}/plan?room=${encodeURIComponent(room)}" data-nav>This week's plan</a>` : ''}</div>
        ${rosterHtml(kids, langs)}</div>`), 'Room roster', { english: true });
      $('#rsRoom')?.addEventListener('change', () => { setQ('room', $('#rsRoom').value); viewRoster(c, shell); });
      $('#rsPrint')?.addEventListener('click', () => window.print());
      loadPhotos();
    } catch (e) { return fail(shell, 'Room roster', e); }
  }

  // ---------------------------------------------------------------- substitute sheet (read only)
  async function viewSub(c, shell) {
    page(shell('<p class="loading">Opening the substitute sheet…</p>'), 'Substitute sheet', { english: true });
    try {
      const [st, seq] = await Promise.all([rpc('plan_settings_get', { p_center: c.center_id }), api(c, '/api/curriculum/sequence')]);
      const room = pickRoom(st);
      const today = centerToday();
      const d = room ? planFor(today, settingsOf(st, room), seq.days) : { status: 'no_calendar' };
      const [p, kids] = await Promise.all([d.status === 'ok' ? api(c, `/api/curriculum/plan/${encodeURIComponent(d.id)}`) : null,
        room ? rpc('room_roster', { p_center: c.center_id, p_room: room, p_date: today }) : []]);
      const name = (st.rooms.find((r) => r.id === room) || {}).name || '';
      page(shell(`<div class="pl pl-sub-sheet" id="subPage"><div class="pl-head"><div><h2>Substitute sheet: ${esc(name)}</h2>
        <p class="small muted">${esc(dateLabel(today))} · read only. Thank you for stepping in. Questions about a child go to the director.</p></div><span class="chip gold">Read only</span></div>
        <div class="pl-bar card no-print">${roomBar(st, room, 'sbRoom')}<button class="btn navy small" type="button" id="sbPrint">Print</button></div>
        <section class="card"><h3>Today's plan</h3>${d.status === 'ok' && p ? `<p><b>${esc(d.id)}</b>: ${esc(p.title)}</p>
          <ol class="pl-blocks">${p.blocks.map((b) => `<li class="pl-block"><div class="pl-bhead"><b>${esc(b.label)}</b>${b.minutes ? `<span class="small muted">about ${esc(b.minutes)} min</span>` : ''}</div>${b.goal ? `<p class="small">${esc(b.goal)}</p>` : ''}${b.materials.length ? `<p class="small muted"><b>Materials:</b> ${esc(b.materials.join('; '))}</p>` : ''}</li>`).join('')}</ol>`
          : `<p class="muted">${esc(NOT_SCHOOL[d.status] || 'No plan for today.')}${d.label ? `: ${esc(d.label)}` : ''}</p>`}</section>
        <section><h3 class="pl-h">Children (${kids.length})</h3>${rosterHtml(kids)}</section></div>`), 'Substitute sheet', { english: true });
      $('#sbRoom')?.addEventListener('change', () => { setQ('room', $('#sbRoom').value); viewSub(c, shell); });
      $('#sbPrint')?.addEventListener('click', () => window.print());
      loadPhotos();
    } catch (e) { return fail(shell, 'Substitute sheet', e); }
  }

  return {
    viewPlan: (c, shell) => { current = { c, shell }; return viewPlan(c, shell); },
    viewRoster, viewSub,
  };
}
