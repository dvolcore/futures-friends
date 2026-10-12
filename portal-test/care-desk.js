// Futures Hub front-end: the classroom and director desks that used to live only in the website's portal (N2 "one app",
// hub/PORTAL_RETIREMENT.md). Every rule is in the database; these pages draw and call.
//
//   /c/<slug>/meals       classroom staff + directors: the room's meal instructions before service ("Served as instructed" / "Held for the
//                         director"; a missing or out-of-date instruction blocks the shared menu); directors approve a new version
//                         (meal_service_board / meal_service_record / meal_instruction_set, migration 20261010110000), and the room's menu level
//                         and a custom lunch on the day (portal-gaps.js). A director's instruction edited offline waits on the device and
//                         asks "Keep mine / Use theirs" if someone changed it meanwhile (offline-edits.js).
//   /c/<slug>/reports     classroom staff + directors: each child's evening family report before it goes, with the note to edit, leave out
//                         or restore (daily_report_room_preview / daily_report_set_note); a note edited offline waits on the device (offline-edits.js).
//   /c/<slug>/program     classroom staff + directors: the approved daily-program records for the room and day, with each child's
//                         participation recorded explicitly (took part / not this time / not recorded; "everyone here took part" is a
//                         deliberate two-step action) on the child's day record (kidday.data.program, read by daily_report_program).
//   /c/<slug>/rhythm      classroom staff + directors: Bop's Daily 5 for the room (rhythm_room_day; moments in rhythm_moments, undo);
//                         directors also the week's numbers per room (rhythm_weekly_metrics) and the policy acknowledgement; the week's screen
//                         minutes (information only, no cap) and a form to log a screen episode (portal-gaps.js).
//   /c/<slug>/safety      classroom staff + directors: emergency drills (drill_logs), incident and injury reports (incident_reports:
//                         write, mark parent told, state report), the live ratio per room (compliance_ratio_live) and a what-if ratio (portal-gaps.js).
//   /c/<slug>/compliance  directors: what's due from the state's rules (compliance_due, "Log it" -> compliance_records), what needs action
//                         now (director_exceptions; retry / escalate: ops_exception_act), classroom access (staff_clearance_list, hold /
//                         release), the edit history of children's records (care_history_list) and the inspection binder to print.
//   familyMealHtml        the family's read-only "meal instruction on file" line on the child page.
// Staff pages are English (the page catalog in i18n-es-ui.js has the Spanish for the audit); no inline styles or handlers (strict CSP).

import { createEditQueue, isNetworkError, mountPending } from './offline-edits.js';   // edits made offline, with a mine / theirs choice on a clash
import { mountPortalGaps } from './portal-gaps.js';   // screen minutes, lunch of the day, ratio what-if (hub/PORTAL_RETIREMENT.md)

const MEALS = [['breakfast', 'Breakfast'], ['lunch', 'Lunch'], ['snack', 'Snack']];
const BUCKETS = [['overdue', 'Overdue', 'bad'], ['due_7', 'Due in 7 days', 'warn'], ['due_30', 'Due in 30 days', 'warn'], ['due_90', 'Due in 90 days', 'ok'],
  ['needs_info', 'Needs information', ''], ['own_records', 'Kept in your own records', '']];
const DRILLS = [['fire', 'Fire drill'], ['tornado', 'Tornado drill'], ['disaster', 'Disaster drill'], ['shelter_in_place', 'Shelter-in-place practice'], ['relocation', 'Off-site relocation practice']];
const CRITICAL = [['facility_damage', 'Damage to the facility that affects safety'], ['vehicle_collision', 'Vehicle collision with a child aboard'], ['missing_child', 'Missing child'],
  ['injury_medical_treatment', 'Injury that needed a health professional'], ['animal_injury', 'Injury by an animal'], ['death', 'Death of a child or staff member'], ['other_jeopardy', 'Anything else that put children at risk']];
const ACCESS = { classroom: ['Classroom', 'ok'], pending: ['Training only: checks pending', 'warn'], expired: ['Training only: check expired', 'bad'], on_hold: ['On hold', 'bad'] };
const DAILY5 = [['morning_wake_up', 'move', 'Morning wake-up'], ['transition_move', 'move', 'Transition move'], ['daily_adventure', 'move', 'Daily adventure'],
  ['outside_quest', 'outside', 'Outside quest'], ['reset', 'reset', 'Reset and rest']];
const label = (list, v) => (list.find(([k]) => k === v) || [v, v])[1];

export function mountCareDesk(h) {
  const { esc, $, $$, rpc, page, live, friendly, client, localDay, reportHtml } = h;
  const E = esc;
  const gaps = mountPortalGaps(h);
  // the waiting list of edits made offline on one page (per center and person; offline-edits.js)
  const editQueue = async (c, area) => createEditQueue({ storage: (() => { try { return localStorage; } catch { return null; } })(), key: `ff-edits:${c.center_id}:${(await client().auth.getUser()).data?.user?.id || 'me'}:${area}` });
  const day = (s) => (s ? new Date(`${String(s).slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '');
  const at = (s) => (s ? new Date(s).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');
  // the rooms this person may see (row-level security narrows a room-scoped teacher), in the center's order
  const rooms = async (c) => ((await client().from('rooms').select('id, data').eq('center_id', c.center_id)).data || [])
    .map((r) => ({ id: r.id, name: r.data?.name || r.id, order: Number(r.data?.order ?? 99) })).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  const roomPicker = (list, cur, id = 'cdRoom') => `<label class="f"><span>Room</span><select class="i" id="${id}">${list.map((r) => `<option value="${E(r.id)}"${r.id === cur ? ' selected' : ''}>${E(r.name)}</option>`).join('')}</select></label>`;
  const qRoom = (list) => { const q = new URLSearchParams(location.search).get('room'); return list.some((r) => r.id === q) ? q : list[0]?.id || ''; };
  const keepRoom = (r) => history.replaceState(null, '', `${FFTest.pathname()}?room=${encodeURIComponent(r)}`);
  const note = (m, bad = false) => { const n = $('#cdNote'); if (n) { n.className = `msg ${bad ? 'bad' : 'ok'}`; n.textContent = m; } if (!bad) live(m); };
  const lines = (v) => String(v || '').split(/\n|,/).map((x) => x.trim()).filter(Boolean);

  // ---------------------------------------------------------------- meals
  async function viewMeals(c, shell, { director = false } = {}) {
    const list = await rooms(c);
    const S = { room: qRoom(list), meal: 'lunch', board: [], err: '', edKid: '' };
    const queue = await editQueue(c, 'meals'); let send = null;
    const instructionNow = async (e) => ((await rpc('meal_service_board', { p_center: c.center_id, p_room: e.room, p_date: localDay() })) || []).find((r) => r.kid === e.kid)?.instruction || { version: 0 };
    const handlers = { meal_instruction: { current: instructionNow, same: (a, b) => Number(a?.version) === Number(b?.version),
      apply: (e) => rpc('meal_instruction_set', { p_center: c.center_id, p_kid: e.kid, p_status: e.mine.status, p_serve_instead: e.mine.serve_instead, p_never_serve: e.mine.never_serve, p_note: e.mine.note, p_review_by: e.mine.review_by }) } };
    const describe = (e, v) => [v.status === 'active' ? 'Approve' : v.status === 'needed' ? 'Flag: instruction needed' : v.status === 'ended' ? 'End the instruction' : 'No instruction',
      v.serve_instead?.length ? `Serve instead: ${v.serve_instead.join(', ')}` : '', v.never_serve?.length ? `Never serve: ${v.never_serve.join(', ')}` : ''].filter(Boolean).join('; ');
    const lunchBox = document.createElement('div'); let lunchRoom = null;   // kept between renders so a half-written lunch survives a change of meal
    const load = async () => { try { S.board = (await rpc('meal_service_board', { p_center: c.center_id, p_room: S.room, p_date: localDay() })) || []; S.err = ''; } catch (e) { S.board = []; S.err = friendly(e); } };
    const chip = (st) => ({ ok: '<span class="chip ok">Instruction approved</span>', needed: '<span class="chip bad">Blocked: instruction missing</span>', stale: '<span class="chip bad">Blocked: past review date</span>' }[st.state] || '<span class="chip">Shared menu</span>');
    const render = () => {
      const flagged = S.board.filter((r) => r.instruction.state !== 'none');
      const kids = S.board;
      if (!S.edKid || !kids.some((k) => k.kid === S.edKid)) S.edKid = kids[0]?.kid || '';
      const cur = (kids.find((k) => k.kid === S.edKid) || {}).instruction || { state: 'none' };
      const mealName = label(MEALS, S.meal);
      page(shell(`<div class="card" id="mealBoard"><h2>Meal instructions</h2>
        <p class="small muted">Serving instructions only, approved by the director. Full plans are kept in the center's records, not here.</p>
        <div class="row two">${roomPicker(list, S.room)}<label class="f"><span>Meal</span><select class="i" id="cdMeal">${MEALS.map(([v, l]) => `<option value="${v}"${v === S.meal ? ' selected' : ''}>${E(l)}</option>`).join('')}</select></label></div>
        ${S.err ? `<p class="msg bad" role="alert">Meal instructions could not be loaded. Do not assume the shared menu for any child you know has an instruction: check the center's records. (${E(S.err)})</p>` : ''}
        <p class="msg" role="status" id="cdNote"></p>
        <p class="small" id="mealSummary">${flagged.length ? `<b>${flagged.length}</b> ${flagged.length === 1 ? 'child has' : 'children have'} a meal instruction. Everyone else in this room gets the shared menu.` : 'No child in this room has a meal instruction on file. The shared menu applies.'}</p>
        <ul class="list cd-list" id="mealRows">${flagged.map((r) => { const st = r.instruction, ch = (r.checks || {})[S.meal], blocked = st.state === 'needed' || st.state === 'stale';
          return `<li data-kid="${E(r.kid)}" data-state="${E(st.state)}"><span class="who"><b>${E(r.first)}</b> ${chip(st)}
            ${st.state === 'needed' ? `<span class="small">Instruction missing. <b>Do not serve the shared menu to ${E(r.first)}.</b> Hold the meal and ask the director.</span>` : ''}
            ${st.state === 'stale' ? `<span class="small">Due for review on ${E(day(st.review_by))}. <b>Do not assume the shared menu or the old instruction.</b> Hold the meal and ask the director.</span>` : ''}
            ${(st.serve_instead || []).length ? `<span class="small"><b>Serve instead:</b> ${st.serve_instead.map(E).join(', ')}</span>` : ''}${(st.never_serve || []).length ? `<span class="small"><b>Never serve:</b> ${st.never_serve.map(E).join(', ')}</span>` : ''}${st.note ? `<span class="small"><b>Note:</b> ${E(st.note)}</span>` : ''}
            <span class="small muted">${ch ? `${E(mealName)}: ${ch.outcome === 'served_as_instructed' ? 'served as instructed' : 'held for the director'} · ${E(ch.by_email || 'staff')} · ${E(at(ch.at))} · instruction v${Number(ch.version)}` : `${E(mealName)}: not confirmed yet.`}</span></span>
            <span class="cta-row">${blocked ? '' : `<button type="button" class="btn soft small" data-ms="served_as_instructed" data-kid="${E(r.kid)}">Served as instructed</button>`}<button type="button" class="btn soft small" data-ms="held_for_director" data-kid="${E(r.kid)}">Held for the director</button></span></li>`; }).join('')}</ul></div>
        <div id="lunchDayBox"></div>
        <div id="oePending"></div>
        ${director && kids.length ? `<form class="card" id="mealEditor" novalidate><h2>Approve a meal instruction</h2>
          <p class="small">Write only what to serve and what not to serve. No diagnosis, reason, medication or emergency steps: those stay in the center's records. Each save is a new version with your name and the time.</p>
          <div class="row two"><label class="f"><span>Child</span><select class="i" id="cdMsKid">${kids.map((k) => `<option value="${E(k.kid)}"${k.kid === S.edKid ? ' selected' : ''}>${E(k.first)}</option>`).join('')}</select></label>
          <label class="f"><span>Instruction</span><select class="i" name="status"><option value="active">Approve this instruction</option><option value="needed"${cur.state === 'needed' ? ' selected' : ''}>Flag: instruction needed (blocks the shared menu)</option><option value="ended">No instruction needed any more</option></select></label>
          <label class="f"><span>Serve instead (one per line)</span><textarea class="i" name="instead" rows="2">${E((cur.serve_instead || []).join('\n'))}</textarea></label>
          <label class="f"><span>Never serve (one per line)</span><textarea class="i" name="never" rows="2">${E((cur.never_serve || []).join('\n'))}</textarea></label>
          <label class="f"><span>Short note for the kitchen (optional)</span><input class="i" name="note" maxlength="200" value="${E(cur.note || '')}"></label>
          <label class="f"><span>Review by</span><input class="i" type="date" name="review" value="${E(cur.state === 'ok' && cur.review_by ? cur.review_by : '')}"></label></div>
          <p class="msg" role="status" id="cdMsMsg"></p><button type="submit" class="btn navy">Save as a new version</button></form>` : ''}`), `Meals · ${c.name}`, { english: true });
      $('#cdRoom')?.addEventListener('change', async (e) => { S.room = e.target.value; keepRoom(S.room); await load(); render(); });
      $('#lunchDayBox')?.replaceWith(lunchBox);
      if (S.room && lunchRoom !== S.room) { lunchRoom = S.room; gaps.mountLunch(lunchBox, c, { room: S.room }); }
      $('#cdMeal')?.addEventListener('change', (e) => { S.meal = e.target.value; render(); });
      $('#cdMsKid')?.addEventListener('change', (e) => { S.edKid = e.target.value; render(); });
      $$('[data-ms]').forEach((b) => b.addEventListener('click', async () => {
        try { await rpc('meal_service_record', { p_center: c.center_id, p_kid: b.dataset.kid, p_date: localDay(), p_meal: S.meal, p_outcome: b.dataset.ms }); await load(); render(); note(b.dataset.ms === 'served_as_instructed' ? 'Recorded: served as instructed.' : 'Recorded: held for the director.'); }
        catch (e) { note(friendly(e), true); }
      }));
      $('#mealEditor')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const v = Object.fromEntries(new FormData(e.target).entries()), m = $('#cdMsMsg');
        const active = v.status === 'active';
        try {
          await rpc('meal_instruction_set', { p_center: c.center_id, p_kid: S.edKid, p_status: v.status, p_serve_instead: active ? lines(v.instead) : [], p_never_serve: active ? lines(v.never) : [],
            p_note: (v.note || '').trim() || null, p_review_by: active ? (v.review || null) : null });
          await load(); render(); note(active ? 'Instruction saved as a new version.' : v.status === 'needed' ? 'Flagged: the shared menu is blocked for this child.' : 'Instruction ended.');
        } catch (err) {
          if (!isNetworkError(err)) { m.className = 'msg bad'; m.textContent = friendly(err); return; }
          const who = S.board.find((k) => k.kid === S.edKid);
          queue.put({ slot: `meal:${S.edKid}`, kind: 'meal_instruction', label: `${who?.first || 'Child'}: meal instruction`, room: S.room, kid: S.edKid, base: { version: cur.version || 0 },
            mine: { status: v.status, serve_instead: active ? lines(v.instead) : [], never_serve: active ? lines(v.never) : [], note: (v.note || '').trim() || null, review_by: active ? (v.review || null) : null } });
          render(); note('No connection. The instruction is kept on this device and sent when the hub is reachable.');
        }
      });
      send = mountPending($('#oePending'), { esc, queue, handlers, describe, onChange: async () => { await load(); render(); }, say: note });
    };
    window.addEventListener('online', () => { if (send && queue.list().length && $('#oePending')) send(); });
    await load(); render();
    if (queue.list().length && send) send();
  }
  // the family's read-only line (child page)
  async function familyMealHtml(c, kid) {
    const r = await client().from('meal_instructions').select('version,status,serve_instead,never_serve,note,review_by,approved_at').eq('center_id', c.center_id).eq('kid', kid).order('version', { ascending: false }).limit(1);
    const v = r.data?.[0];
    if (!v || v.status === 'ended') return '';
    const stale = v.status === 'active' && v.review_by && v.review_by < localDay();
    const body = v.status === 'needed' ? 'The director is preparing a meal instruction. Until it is approved, the kitchen holds the shared menu and checks with the director.'
      : stale ? `The meal instruction was due for review on ${day(v.review_by)}. The kitchen checks with the director before serving.`
        : [(v.serve_instead || []).length ? `Serve instead: ${v.serve_instead.join(', ')}.` : '', (v.never_serve || []).length ? `Never serve: ${v.never_serve.join(', ')}.` : '', v.note || ''].filter(Boolean).join(' ');
    return `<section class="card" id="familyMeal"><h2>Meal instruction on file</h2><p>${E(body)}</p>
      <p class="small muted">Full plan kept in the center's records. Talk with the director about any change.</p></section>`;
  }

  // ---------------------------------------------------------------- family reports before the send
  async function viewReports(c, shell) {
    const list = await rooms(c);
    const S = { room: qRoom(list), rows: [], err: '' };
    const queue = await editQueue(c, 'reports'); let send = null;
    const noteNow = async (e) => ((await rpc('daily_report_room_preview', { p_center: c.center_id, p_room: e.room, p_date: e.date })) || []).find((x) => x.kid === e.kid)?.report?.note || '';
    const handlers = { report_note: { current: noteNow, same: (a, b) => (a || '') === (b || ''),
      apply: (e) => rpc('daily_report_set_note', { p_center: c.center_id, p_kid: e.kid, p_date: e.date, p_note: e.mine }) } };
    const describe = (e, v) => (v === null ? 'Use the note from the day' : v === '' ? 'Send without a note' : v);
    const load = async () => { try { S.rows = (await rpc('daily_report_room_preview', { p_center: c.center_id, p_room: S.room, p_date: localDay() })) || []; S.err = ''; } catch (e) { S.rows = []; S.err = friendly(e); } };
    const render = () => {
      page(shell(`<div class="card" id="reportsIntro"><h2>Family reports for today</h2>
        <p class="small">Each family gets one report in the evening, built from what you already recorded today. Check it here and edit or leave out the note before it goes.</p>
        <p class="small muted">Reports never compare children and never include health information. Notes that mention health details or judge food or bodies are held back automatically.</p>
        ${roomPicker(list, S.room)}<p class="msg" role="status" id="cdNote"></p>${S.err ? `<p class="msg bad" role="alert">${E(S.err)}</p>` : ''}</div>
        <div id="oePending"></div>
        <div id="reportList">${S.rows.map((x) => { const r = x.report;
          const status = x.published ? '<span class="chip ok">Sent</span>' : r ? '<span class="chip">Goes out this evening</span>' : '<span class="chip warn">No report: nothing recorded yet, or marked absent</span>';
          return `<article class="card" data-kid="${E(x.kid)}" aria-label="${E(x.first)}'s report"><h3>${E(x.first)} ${status}</h3>${r ? reportHtml(r) : ''}
            ${r && r.note_held ? '<p class="msg bad">The note from the day was held back because it mentions health details or judges food or bodies. Write a new note below, or leave it out.</p>' : ''}
            ${r && !x.published ? `<label class="f"><span>Note for ${E(x.first)}'s family${x.note_edited ? ' (edited for the report)' : ''}</span><textarea class="i" data-note maxlength="600">${E(r.note || '')}</textarea></label>
              <div class="cta-row"><button type="button" class="btn navy small" data-rp="save">Save note</button><button type="button" class="btn soft small" data-rp="none">Send without a note</button>${x.note_edited ? '<button type="button" class="btn soft small" data-rp="reset">Use the note from the day</button>' : ''}</div>` : ''}</article>`; }).join('')
          || '<div class="card"><p class="empty">No children in this classroom yet.</p></div>'}</div>`), `Family reports · ${c.name}`, { english: true });
      $('#cdRoom')?.addEventListener('change', async (e) => { S.room = e.target.value; keepRoom(S.room); await load(); render(); });
      $$('[data-rp]').forEach((b) => b.addEventListener('click', async () => {
        const art = b.closest('article'), kid = art.dataset.kid, a = b.dataset.rp;
        const v = a === 'save' ? ($('[data-note]', art)?.value || '').trim() : a === 'none' ? '' : null;
        try { await rpc('daily_report_set_note', { p_center: c.center_id, p_kid: kid, p_date: localDay(), p_note: v }); await load(); render(); note(v === null ? 'Using the note from the day.' : v === '' ? 'This report goes without a note.' : 'Note saved for the report.'); }
        catch (e) {
          if (!isNetworkError(e)) return note(friendly(e), true);
          const row = S.rows.find((x) => x.kid === kid);
          queue.put({ slot: `report:${S.room}:${kid}:${localDay()}`, kind: 'report_note', label: `${row?.first || 'Child'}: note for the family report`, room: S.room, kid, date: localDay(), base: row?.report?.note || '', mine: v });
          render(); note('No connection. The note is kept on this device and sent when the hub is reachable.');
        }
      }));
      send = mountPending($('#oePending'), { esc, queue, handlers, describe, onChange: async () => { await load(); render(); }, say: note });
    };
    window.addEventListener('online', () => { if (send && queue.list().length && $('#oePending')) send(); });
    await load(); render();
    if (queue.list().length && send) send();
  }

  // ---------------------------------------------------------------- the daily program and each child's participation
  async function viewProgram(c, shell) {
    const list = await rooms(c);
    const S = { room: qRoom(list), day: null, kids: [], days: [], draft: {}, confirm: null, err: '' };
    const load = async () => {
      try {
        S.day = await rpc('program_day', { p_center: c.center_id, p_room: S.room, p_date: localDay() }); S.err = '';
        S.kids = ((await client().from('kids').select('id, data').eq('center_id', c.center_id).eq('room', S.room)).data || []).filter((k) => !k.data?.left_on && k.data?.status !== 'left')
          .map((k) => ({ id: k.id, first: k.data?.first || k.data?.name || k.id, last: k.data?.last || '' })).sort((a, b) => a.first.localeCompare(b.first));
        S.days = (await client().from('kidday').select('id, kid, data').eq('center_id', c.center_id).eq('date', localDay()).eq('room', S.room)).data || [];
      } catch (e) { S.err = friendly(e); S.day = { records: [] }; }
    };
    const dayOf = (kid) => S.days.find((d) => d.kid === kid);
    const took = (kid, rid) => { const p = dayOf(kid)?.data?.program?.[rid]; return p && typeof p.took_part === 'boolean' ? p.took_part : null; };
    const present = (kid) => dayOf(kid)?.data?.present === true;
    async function log(kid, rid, v, version, via) {
      const me = (await client().auth.getUser()).data?.user?.id || null;
      const d = dayOf(kid);
      const data = { ...(d?.data || { kid, room: S.room, date: localDay() }) };
      data.program = { ...(data.program || {}), [rid]: { took_part: v, v: version, via, by: me, at: new Date().toISOString() } };
      const r = await client().from('kidday').upsert({ center_id: c.center_id, id: d?.id || `${kid}_${localDay()}`, data }, { onConflict: 'center_id,id' });
      if (r.error) throw r.error;
    }
    const render = () => {
      const recs = S.day?.records || [];
      page(shell(`<div class="card" id="programDay"><h2>Today's program</h2><p class="small">Only approved records show here. Participation starts as "Not recorded": mark what each child did.</p>
        ${roomPicker(list, S.room)}<p class="msg" role="status" id="cdNote"></p>${S.err ? `<p class="msg bad" role="alert">${E(S.err)}</p>` : ''}
        ${recs.length ? '' : '<p class="empty">No approved program record for this room today. A director starts a unit in Planning.</p>'}</div>
        ${recs.map((x) => { const rid = x.id, r = x.record || {}, ver = Number(x.version || 1);
          return `<form class="card" data-rec="${E(rid)}" data-v="${ver}" novalidate><h3>${E(String(x.block || 'activity').replace(/-/g, ' '))}: "${E(r.theme || '')}"</h3>
            <ul class="list cd-list">${S.kids.map((k) => { const cur = S.draft[rid]?.[k.id] ?? took(k.id, rid);
              return `<li><span class="who"><b>${E(k.first)}</b><span class="small muted">${present(k.id) ? 'Here today' : 'Not marked here'}</span></span>
                <span class="cta-row" role="group" aria-label="${E(k.first)}">${[[true, 'Took part'], [false, 'Not this time'], [null, 'Not recorded']].map(([v, l]) => `<button type="button" class="btn soft small" data-pk="${E(k.id)}" data-pv="${v}" aria-pressed="${cur === v}">${E(l)}</button>`).join('')}</span></li>`; }).join('') || '<li class="small muted">No children in this room.</li>'}</ul>
            <div class="cta-row"><button type="submit" class="btn navy">Save choices</button><button type="button" class="btn soft" data-all="${E(rid)}">Everyone here took part…</button></div>
            ${S.confirm === rid ? `<div class="msg info" role="alert" data-confirm>Everyone marked here today will be recorded as having taken part, except the children set to "Not this time". <button type="button" class="btn navy small" data-all-ok="${E(rid)}">Yes, record it</button></div>` : ''}</form>`; }).join('')}`), `Program · ${c.name}`, { english: true });
      $('#cdRoom')?.addEventListener('change', async (e) => { S.room = e.target.value; keepRoom(S.room); S.draft = {}; await load(); render(); });
      $$('[data-pk]').forEach((b) => b.addEventListener('click', () => {
        const rid = b.closest('form').dataset.rec; (S.draft[rid] ||= {})[b.dataset.pk] = b.dataset.pv === 'true' ? true : b.dataset.pv === 'false' ? false : null; render();
      }));
      $$('[data-all]').forEach((b) => b.addEventListener('click', () => { S.confirm = b.dataset.all; render(); }));
      $$('[data-all-ok]').forEach((b) => b.addEventListener('click', async () => {
        const fm = b.closest('form'), rid = fm.dataset.rec, ver = Number(fm.dataset.v);
        try {
          let n = 0;
          for (const k of S.kids) {
            const d = S.draft[rid]?.[k.id];
            if (d === false) await log(k.id, rid, false, ver, 'each');
            else if (present(k.id) && took(k.id, rid) !== true) { await log(k.id, rid, true, ver, 'group'); n++; }
          }
          S.confirm = null; S.draft[rid] = {}; await load(); render(); note(`Recorded: ${n} took part.`);
        } catch (e) { note(friendly(e), true); }
      }));
      $$('form[data-rec]').forEach((fm) => fm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const rid = fm.dataset.rec, ver = Number(fm.dataset.v), d = S.draft[rid] || {};
        try {
          let n = 0;
          for (const [kid, v] of Object.entries(d)) if (typeof v === 'boolean' && took(kid, rid) !== v) { await log(kid, rid, v, ver, 'each'); n++; }
          S.draft[rid] = {}; await load(); render(); note(n ? `Saved ${n} ${n === 1 ? 'choice' : 'choices'}.` : 'Nothing changed.');
        } catch (err) { note(friendly(err), true); }
      }));
    };
    await load(); render();
  }

  // ---------------------------------------------------------------- Bop's Daily 5 (rhythm)
  async function viewRhythm(c, shell, { director = false } = {}) {
    const list = await rooms(c);
    const S = { room: qRoom(list), day: null, week: null, policy: null, err: '' };
    const meterBox = document.createElement('div'); let meterRoom = null;
    const load = async () => {
      try { S.day = await rpc('rhythm_room_day', { p_center: c.center_id, p_room: S.room, p_date: localDay() }); S.err = ''; } catch (e) { S.err = friendly(e); S.day = null; }
      if (director) {
        S.week = (await rpc('rhythm_weekly_metrics', { p_center: c.center_id }).catch(() => null)) || [];
        S.policy = await rpc('rhythm_policy_acknowledged', { c: c.center_id }).catch(() => null);
      }
    };
    const render = () => {
      const m = S.day?.moments || [];
      page(shell(`<div class="card" id="rhythmDay"><h2>Bop's Daily 5</h2><p class="small">Tap a step when the room has done it. Minutes count toward the room's movement and outdoor time.</p>
        ${roomPicker(list, S.room)}<p class="msg" role="status" id="cdNote"></p>${S.err ? `<p class="msg bad" role="alert">${E(S.err)}</p>` : ''}
        ${S.day && !S.day.configured ? '<p class="msg info">Set the room\'s youngest age in Center settings so the right targets apply.</p>' : ''}
        <ul class="list cd-list" id="rhythmSteps">${DAILY5.map(([slot, type, l]) => { const done = m.filter((x) => x.daily5_slot === slot);
          return `<li><span class="who"><b>${E(l)}</b><span class="small muted">${done.length ? `Done ${done.map((x) => `${Number(x.minutes)} min`).join(', ')}` : 'Not yet'}</span></span>
            <form class="cta-row" data-step="${slot}" data-type="${type}" novalidate><label class="f"><span>Minutes</span><input class="i" type="number" name="min" min="0" max="240" value="${type === 'reset' ? 10 : 15}"></label><button type="submit" class="btn soft small">Done</button></form></li>`; }).join('')}</ul>
        ${m.length ? `<h3>Today's moments</h3><ul class="list cd-list" id="rhythmMoments">${m.map((x) => `<li><span class="who"><b>${E(x.title)}</b><span class="small muted">${Number(x.minutes)} min · ${E(at(x.done_at))}</span></span>${x.source === 'teacher' ? `<button type="button" class="btn soft small" data-undo="${E(x.id)}">Undo</button>` : ''}</li>`).join('')}</ul>` : ''}
        ${(S.day?.targets || []).length ? `<h3>Today against the targets</h3><ul class="plain small" id="rhythmTargets">${S.day.targets.map((t) => `<li>${E(t.label || t.metric)}: ${E(t.value ?? '')}${t.min != null ? ` of at least ${E(t.min)}` : ''}${t.max != null ? ` (at most ${E(t.max)})` : ''}</li>`).join('')}</ul>` : ''}</div>
        <div id="screenMeterBox"></div>
        ${director ? `<div class="card" id="rhythmWeek"><h2>This week by room</h2>${S.week?.length ? `<div class="arr-tw"><table class="arr-table"><thead><tr><th scope="col">Room</th><th scope="col">Days logged</th><th scope="col">Active target met</th><th scope="col">Outdoor target met</th><th scope="col">Daily 5</th></tr></thead><tbody>
          ${S.week.map((w) => `<tr><td>${E(label(list.map((r) => [r.id, r.name]), w.room))}</td><td>${Number(w.days_logged)}</td><td>${Number(w.days_active_met)}</td><td>${Number(w.days_outdoor_met)}</td><td>${Number(w.daily5_done)} of ${Number(w.daily5_possible)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="empty">Nothing logged this week yet.</p>'}
          ${S.policy === false ? '<p class="small">The current Daily Rhythm policy is not acknowledged yet.</p><button type="button" class="btn navy" id="rhythmAck">Acknowledge the policy</button>' : S.policy ? '<p class="small muted">The current Daily Rhythm policy is acknowledged.</p>' : ''}</div>` : ''}`), `Daily rhythm · ${c.name}`, { english: true });
      $('#cdRoom')?.addEventListener('change', async (e) => { S.room = e.target.value; keepRoom(S.room); await load(); render(); });
      $('#screenMeterBox')?.replaceWith(meterBox);
      if (S.room && meterRoom !== S.room) {
        meterRoom = S.room;
        gaps.mountScreenMeter(meterBox, c, { room: S.room, canLog: !!S.day?.screens_allowed, onLogged: async () => { meterRoom = null; await load(); render(); } });
      }
      $$('form[data-step]').forEach((fm) => fm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const min = Math.max(0, Math.min(240, Math.round(Number(new FormData(fm).get('min')) || 0))), type = fm.dataset.type;
        const row = { center_id: c.center_id, room: S.room, date: localDay(), moment_type: type, daily5_slot: fm.dataset.step, title: label(DAILY5.map(([s, , l]) => [s, l]), fm.dataset.step),
          minutes: min, active_min: type === 'reset' ? 0 : min, mvpa_min: 0, outdoor_min: type === 'outside' ? min : 0, screen_min: 0, tummy_min: 0, rest_min: 0, adult_led: true, weather_swap: false, source: 'teacher' };
        const r = await client().from('rhythm_moments').insert(row);
        if (r.error) return note(friendly(r.error), true);
        await load(); render(); note('Saved.');
      }));
      $$('[data-undo]').forEach((b) => b.addEventListener('click', async () => {
        const r = await client().from('rhythm_moments').delete().eq('id', b.dataset.undo);
        if (r.error) return note(friendly(r.error), true);
        await load(); render(); note('Removed.');
      }));
      $('#rhythmAck')?.addEventListener('click', async () => { try { await rpc('rhythm_acknowledge_policy', { p_center: c.center_id }); await load(); render(); note('Policy acknowledged.'); } catch (e) { note(friendly(e), true); } });
    };
    await load(); render();
  }

  // ---------------------------------------------------------------- safety logs: drills, incidents, ratios
  async function viewSafety(c, shell, { director = false } = {}) {
    const list = await rooms(c);
    const S = { drills: [], incidents: [], ratio: [], kids: [] };
    const whatIfBox = document.createElement('div'); let whatIfOn = false;
    const nowLocal = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
    const load = async () => {
      const cl = client();
      const [d, i, k] = await Promise.all([cl.from('drill_logs').select('*').eq('center_id', c.center_id).order('held_at', { ascending: false }).limit(12),
        cl.from('incident_reports').select('*').eq('center_id', c.center_id).order('occurred_at', { ascending: false }).limit(25),
        cl.from('kids').select('id, data').eq('center_id', c.center_id)]);
      S.drills = d.data || []; S.incidents = i.data || []; S.kids = (k.data || []).map((x) => ({ id: x.id, name: `${x.data?.first || x.id} ${x.data?.last || ''}`.trim() }));
      S.ratio = (await rpc('compliance_ratio_live', { p_center: c.center_id }).catch(() => [])) || [];
    };
    const render = () => {
      page(shell(`<div class="card" id="safetyRatio"><h2>Ratios now</h2><p class="msg" role="status" id="cdNote"></p>
        ${Array.isArray(S.ratio) && S.ratio.length ? `<ul class="list cd-list" id="ratioList">${S.ratio.map((r) => `<li><span class="who"><b>${E(r.room_name || r.room)}</b><span class="small">${Number(r.present || 0)} children here${r.result?.required_staff != null ? ` · needs ${E(r.result.required_staff)} staff` : ''}</span></span><span class="chip ${r.result?.status === 'over' ? 'bad' : r.result?.status === 'ok' ? 'ok' : ''}">${E(r.result?.status === 'ok' ? 'In ratio' : r.result?.status === 'over' ? 'Over ratio (warning)' : r.result?.status === 'empty' ? 'No children' : 'Check staff count')}</span></li>`).join('')}</ul>` : '<p class="empty">No live ratio yet (nobody signed in).</p>'}</div>
        <div id="ratioWhatIfBox"></div>
        <form class="card" data-sf="drill" novalidate><h2>Emergency drills</h2><div class="row two">
          <label class="f"><span>Drill</span><select class="i" name="drill_type">${DRILLS.map(([k, l]) => `<option value="${k}">${E(l)}</option>`).join('')}</select></label>
          <label class="f"><span>Date and time</span><input class="i" type="datetime-local" name="held_at" value="${nowLocal()}" required></label>
          <label class="f"><span>Time to evacuate (minutes)</span><input class="i" type="number" name="evac_min" min="0" max="120"></label>
          <label class="f"><span>Children present</span><input class="i" type="number" name="children_count" min="0" max="1000"></label>
          <label class="f"><span>Staff present</span><input class="i" type="number" name="staff_count" min="0" max="500"></label>
          <label class="f"><span>Problems or follow-up (optional)</span><textarea class="i" name="issues" maxlength="2000" rows="2"></textarea></label></div>
          <button type="submit" class="btn navy">Save the drill</button>
          ${S.drills.length ? `<ul class="list cd-list" id="drillList">${S.drills.map((d) => `<li><span class="who"><b>${E(label(DRILLS, d.drill_type))}</b><span class="small muted">${E(at(d.held_at))}${d.evacuation_seconds != null ? ` · ${Math.round(d.evacuation_seconds / 60)} min` : ''}${d.issues ? ` · ${E(d.issues)}` : ''}</span></span></li>`).join('')}</ul>` : '<p class="small muted">No drills logged yet.</p>'}</form>
        <form class="card" data-sf="incident" novalidate><h2>Incident and injury reports</h2>
          <p class="small">Write what happened and the first aid given. Do not record a diagnosis or other health information. The family sees the report and confirms they read it.</p><div class="row two">
          <label class="f"><span>Kind</span><select class="i" name="kind"><option value="injury">Injury that needed first aid</option><option value="critical">Critical incident</option></select></label>
          <label class="f"><span>Critical incident type</span><select class="i" name="critical_type"><option value="">Not a critical incident</option>${CRITICAL.map(([k, l]) => `<option value="${k}">${E(l)}</option>`).join('')}</select></label>
          <label class="f"><span>Date and time</span><input class="i" type="datetime-local" name="occurred_at" value="${nowLocal()}" required></label>
          <label class="f"><span>Room</span><select class="i" name="room"><option value="">Choose</option>${list.map((r) => `<option value="${E(r.id)}">${E(r.name)}</option>`).join('')}</select></label>
          <label class="f"><span>Child (required for an injury)</span><select class="i" name="kid"><option value="">No single child</option>${S.kids.map((k) => `<option value="${E(k.id)}">${E(k.name)}</option>`).join('')}</select></label>
          <label class="f"><span>What happened</span><textarea class="i" name="what_happened" maxlength="2000" rows="2" required></textarea></label>
          <label class="f"><span>First aid given</span><input class="i" name="first_aid" maxlength="1000"></label>
          <label class="choice"><input type="checkbox" name="notified"><span><b>Parent told now</b></span></label></div>
          <button type="submit" class="btn navy">Save the report</button>
          ${S.incidents.length ? `<ul class="list cd-list" id="incidentList">${S.incidents.map((i) => `<li><span class="who"><b>${E(i.kind === 'critical' ? label(CRITICAL, i.critical_type) : 'Injury')}</b><span class="small">${E(i.what_happened)}</span>
            <span class="small muted">${E(at(i.occurred_at))} · ${i.parent_notified_at ? `Parent told ${E(at(i.parent_notified_at))}` : 'Parent not told yet'}${i.kind === 'critical' ? (i.state_reported_at ? ' · state report sent' : ' · state report not sent') : ''}${i.family_ack_at ? ' · family read it' : ''}</span></span>
            <span class="cta-row">${i.parent_notified_at ? '' : `<button type="button" class="btn soft small" data-inc="parent" data-id="${E(i.id)}">Mark parent told</button>`}${i.kind === 'critical' && !i.state_reported_at && director ? `<button type="button" class="btn soft small" data-inc="state" data-id="${E(i.id)}">Mark reported to the state</button>` : ''}</span></li>`).join('')}</ul>` : '<p class="small muted">No reports.</p>'}</form>`), `Safety · ${c.name}`, { english: true });
      $('#ratioWhatIfBox')?.replaceWith(whatIfBox);
      if (!whatIfOn) { whatIfOn = true; gaps.mountRatioWhatIf(whatIfBox, c); }
      $$('form[data-sf]').forEach((fm) => fm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const v = Object.fromEntries(new FormData(fm).entries()), num = (x) => (x === '' || x == null ? null : Number(x));
        let r;
        if (fm.dataset.sf === 'drill') {
          r = await client().from('drill_logs').insert({ center_id: c.center_id, drill_type: v.drill_type, held_at: new Date(v.held_at).toISOString(), evacuation_seconds: v.evac_min === '' ? null : Number(v.evac_min) * 60,
            rooms: list.map((x) => x.id), children_count: num(v.children_count), staff_count: num(v.staff_count), alarm_activated: v.drill_type === 'fire' ? false : null, issues: (v.issues || '').trim() || null });
        } else {
          const bad = !String(v.what_happened || '').trim() ? 'Write what happened.' : v.kind === 'critical' && !v.critical_type ? 'Choose the critical incident type.' : v.kind === 'injury' && !v.kid ? 'Choose the child.' : '';
          if (bad) return note(bad, true);
          r = await client().from('incident_reports').insert({ center_id: c.center_id, kind: v.kind, critical_type: v.kind === 'critical' ? v.critical_type : null, occurred_at: new Date(v.occurred_at).toISOString(),
            room: v.room || null, kid: v.kid || null, what_happened: v.what_happened.trim(), first_aid: (v.first_aid || '').trim() || null, parent_notified_at: v.notified ? new Date().toISOString() : null,
            notify_method: v.notified ? 'in_person' : null, reported_by: (await client().auth.getUser()).data?.user?.id });
        }
        if (r.error) return note(friendly(r.error), true);
        await load(); render(); note(fm.dataset.sf === 'drill' ? 'Drill saved.' : 'Report saved.');
      }));
      $$('[data-inc]').forEach((b) => b.addEventListener('click', async () => {
        const patch = b.dataset.inc === 'state' ? { state_reported_at: new Date().toISOString() } : { parent_notified_at: new Date().toISOString() };
        const r = await client().from('incident_reports').update(patch).eq('id', b.dataset.id).select('id');
        if (r.error) return note(friendly(r.error), true);
        await load(); render(); note('Saved.');
      }));
    };
    await load(); render();
  }

  // ---------------------------------------------------------------- director: compliance, access, edit history, binder
  async function viewCompliance(c, shell) {
    const S = { due: [], exc: [], access: [], hist: [], table: '', open: null, holdOpen: null, binder: null, err: '' };
    const load = async () => {
      const [due, exc, acc, hist] = await Promise.all([rpc('compliance_due', { p_center: c.center_id }).catch((e) => { S.err = friendly(e); return []; }),
        rpc('director_exceptions', { p_center: c.center_id }).catch(() => []), rpc('staff_clearance_list', { p_center: c.center_id }).catch(() => []),
        rpc('care_history_list', { p_center: c.center_id, p_table: S.table || null, p_limit: 50 }).catch(() => [])]);
      S.due = due || []; S.exc = exc || []; S.access = acc || []; S.hist = hist || [];
    };
    const render = () => {
      const n = (b) => S.due.filter((x) => x.bucket === b).length;
      page(shell(`<div class="card" id="complianceDue"><h2>What's due</h2>
        <p class="small">Worked out from your state's rules for your license type. Every item shows the rule it comes from.</p>
        <p class="msg" role="status" id="cdNote"></p>${S.err ? `<p class="msg bad" role="alert">${E(S.err)}</p>` : ''}
        <ul class="plain small" id="dueCounts">${BUCKETS.map(([k, l, cls]) => `<li><span class="chip ${cls}">${n(k)}</span> ${E(l)}</li>`).join('')}</ul>
        ${BUCKETS.map(([k, l]) => { const items = S.due.filter((x) => x.bucket === k); if (!items.length) return '';
          return `<h3>${E(l)}</h3><ul class="list cd-list">${items.map((it) => { const i = S.due.indexOf(it), a = it.action || {};
            return `<li><span class="who"><b>${E(it.title)}</b><span class="small">${E(it.full_name || 'Center')}${it.due_date ? ` · due ${E(day(it.due_date))}` : ''}</span>${it.citation ? `<span class="small muted">Rule: ${E(it.citation)}</span>` : ''}</span>
              ${k !== 'own_records' && a.type === 'record' ? `<button type="button" class="btn soft small" data-due="${i}">${S.open === i ? 'Close' : 'Log it'}</button>` : ''}
              ${S.open === i ? `<form class="row two" data-due-form="${i}" novalidate><label class="f"><span>Done on</span><input class="i" type="date" name="completed_on" value="${E(localDay())}" max="${E(localDay())}" required></label>
                <label class="f"><span>Expires on (if it has a card or expiry)</span><input class="i" type="date" name="expires_on"></label><label class="f"><span>Note (optional)</span><input class="i" name="note" maxlength="300"></label>
                <button type="submit" class="btn navy">Record it</button></form>` : ''}</li>`; }).join('')}</ul>`; }).join('')}
        ${S.due.length ? '' : '<p class="small">Nothing is due in the next 90 days.</p>'}</div>
        <div class="card" id="complianceExc"><h2>Needs action now <span class="chip ${S.exc.length ? 'warn' : 'ok'}">${S.exc.length}</span></h2>
          ${S.exc.length ? `<ul class="list cd-list">${S.exc.map((x) => `<li><span class="who"><b>${E(x.title)}</b>${x.subject ? `<span class="small">${E(x.subject)}</span>` : ''}<span class="small"><b>Why:</b> ${E(x.reason)}</span><span class="small"><b>Next:</b> ${E(x.next_action)}</span>
            ${x.retry_requested_at ? `<span class="small muted">Retry requested ${E(at(x.retry_requested_at))}</span>` : ''}${x.escalated_at ? `<span class="small muted">Escalated to HQ ${E(at(x.escalated_at))}</span>` : ''}</span>
            <span class="cta-row">${(x.actions || []).includes('retry') ? `<button type="button" class="btn navy small" data-exc="retry" data-key="${E(x.key)}">Retry</button>` : ''}${(x.actions || []).includes('escalate') ? `<button type="button" class="btn soft small" data-exc="escalate" data-key="${E(x.key)}">Escalate to HQ</button>` : ''}</span></li>`).join('')}</ul>` : '<p class="small">Nothing is stuck or failing right now.</p>'}</div>
        <div class="card" id="complianceAccess"><h2>Classroom access</h2><p class="small">Children, families, photos and messages open only once background checks are on file and current. The database enforces this.</p>
          <ul class="list cd-list">${S.access.map((p) => { const [lab, cls] = ACCESS[p.access] || [p.access, ''];
            return `<li><span class="who"><b>${E(p.full_name || 'Staff member')}</b><span class="small muted">${E(String(p.job_role || p.role || '').replace(/_/g, ' '))}${p.cleared_until ? ` · checks valid until ${E(day(p.cleared_until))}` : ''}</span>${p.hold_reason ? `<span class="small"><b>On hold:</b> ${E(p.hold_reason)}</span>` : ''}</span>
              <span class="chip ${cls}">${E(lab)}</span>
              ${p.access !== 'on_hold' && p.role !== 'director' ? `<button type="button" class="btn soft small" data-hold="${E(p.user_id)}">Put on hold</button>` : ''}${p.hold_reason && p.hold_source === 'director' ? `<button type="button" class="btn soft small" data-release="${E(p.user_id)}">Release the hold</button>` : ''}
              ${S.holdOpen === p.user_id ? `<form class="cta-row" data-hold-form="${E(p.user_id)}" novalidate><label class="f"><span>Why (the person is told only that access is on hold)</span><input class="i" name="reason" maxlength="300" required></label><button type="submit" class="btn navy small">Put on hold</button></form>` : ''}</li>`; }).join('') || '<li class="small muted">No staff yet.</li>'}</ul></div>
        <div class="card" id="complianceHistory"><h2>Edit history</h2><p class="small">Every change to a child's record: who, when, what changed.</p>
          <label class="f"><span>Records</span><select class="i" id="histTable"><option value="">All</option>${['kids', 'child_profiles', 'care_alerts', 'pickup_people', 'meal_instructions', 'incident_reports', 'attendance_events', 'care_entries'].map((t) => `<option value="${t}"${t === S.table ? ' selected' : ''}>${E(t.replace(/_/g, ' '))}</option>`).join('')}</select></label>
          ${S.hist.length ? `<ul class="list cd-list" id="histList">${S.hist.map((x) => `<li><span class="who"><b>${E(x.table_name.replace(/_/g, ' '))} · ${E(x.op)}</b><span class="small">${E(at(x.at))} · ${E(x.actor_email || 'system')}${x.actor_role ? ` (${E(x.actor_role)})` : ''}${x.kid ? ` · child ${E(x.kid)}` : ''}</span>${(x.changed || []).length ? `<span class="small muted">Changed: ${x.changed.map(E).join(', ')}</span>` : ''}</span></li>`).join('')}</ul>` : '<p class="small muted">No changes recorded yet.</p>'}</div>
        <div class="card" id="complianceBinder"><h2>Inspection binder</h2><p class="small">Everything an inspector asks for, from your records, ready to print or save as PDF.</p>
          <div class="cta-row"><button type="button" class="btn gold" id="binderOpen">Open the binder</button>${S.binder ? '<button type="button" class="btn soft" data-print>Print or save as PDF</button>' : ''}</div>
          ${S.binder ? `<div id="binderBody">${(S.binder.sections || []).map((s) => `<section><h3>${E(s.title)}</h3>${(s.citations || []).length ? `<p class="small muted">Rules: ${s.citations.map(E).join(' · ')}</p>` : ''}</section>`).join('')}</div>` : ''}</div>`), `Compliance · ${c.name}`, { english: true });
      $$('[data-due]').forEach((b) => b.addEventListener('click', () => { const i = Number(b.dataset.due); S.open = S.open === i ? null : i; render(); }));
      $$('[data-due-form]').forEach((fm) => fm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const it = S.due[Number(fm.dataset.dueForm)], v = Object.fromEntries(new FormData(fm).entries());
        const r = await client().from('compliance_records').insert({ center_id: c.center_id, user_id: it.action.user_id || null, requirement_id: it.action.requirement_id,
          completed_on: v.completed_on, expires_on: v.expires_on || null, note: (v.note || '').trim() || null });
        if (r.error) return note(friendly(r.error), true);
        S.open = null; await load(); render(); note('Recorded.');
      }));
      $$('[data-exc]').forEach((b) => b.addEventListener('click', async () => {
        try { await rpc('ops_exception_act', { p_center: c.center_id, p_key: b.dataset.key, p_action: b.dataset.exc, p_note: null }); await load(); render(); note(b.dataset.exc === 'retry' ? 'Retry requested.' : 'Sent to HQ.'); }
        catch (e) { note(friendly(e), true); }
      }));
      $$('[data-hold]').forEach((b) => b.addEventListener('click', () => { S.holdOpen = b.dataset.hold; render(); }));
      $$('[data-hold-form]').forEach((fm) => fm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const reason = String(new FormData(fm).get('reason') || '').trim(); if (!reason) return note('Say why access is on hold.', true);
        try { await rpc('staff_clearance_hold', { p_center: c.center_id, p_user: fm.dataset.holdForm, p_reason: reason }); S.holdOpen = null; await load(); render(); note('Classroom access is on hold. Their training stays open.'); }
        catch (err) { note(friendly(err), true); }
      }));
      $$('[data-release]').forEach((b) => b.addEventListener('click', async () => {
        try { await rpc('staff_clearance_release', { p_center: c.center_id, p_user: b.dataset.release }); await load(); render(); note('Hold released.'); } catch (e) { note(friendly(e), true); }
      }));
      $('#histTable')?.addEventListener('change', async (e) => { S.table = e.target.value; await load(); render(); });
      $('#binderOpen')?.addEventListener('click', async () => { try { S.binder = await rpc('compliance_binder', { p_center: c.center_id }); render(); } catch (e) { note(friendly(e), true); } });
      $('[data-print]')?.addEventListener('click', () => window.print());
    };
    await load(); render();
  }

  return { viewMeals, familyMealHtml, viewReports, viewProgram, viewRhythm, viewSafety, viewCompliance };
}
