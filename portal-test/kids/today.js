// Daily report v2 in the Hub (migration 20261026200000_daily_report_v2.sql, hub/DAILY_REPORT.md).
//
//   /c/<slug>/today        quick entry for a classroom tablet (directors and teachers with the classroom permission): the room's
//                          children as tiles, select one or several, then ONE TAP logs a meal portion, a drink, a diaper / potty, the
//                          start or end of a rest, a feeling, an activity or a note for every selected child. Undo for the last tap and
//                          for any entry in the list. Head count and ratio read-only (compliance_ratio_live).
//   /c/<slug>/child/<kid>  the "Today" card on top of the child's page: the family's live timeline of their own child's day (polled every
//                          45 s while the page is open and visible) and, once sent, the evening report. English or Spanish (draft).
//
// Offline-tolerant: every tap becomes an operation with an id made on the device and goes into a waiting list in this browser
// (localStorage, per center and person). The list is sent with care_entries_apply and replayed with the SAME ids until the hub answers,
// so a replay never doubles a record. Nothing shows as saved before the hub confirms it ("Waiting to send"). An entry the hub refuses
// (report already sent, wording rule, a child outside your rooms) leaves the list and its reason is shown.
// Words: neutral food amounts only (none / a little / about half / most / all, "asked for more", "tried something new"); no food
// rewards; a few neutral feelings with their friend; an accident shows as "change of clothes".

import { deepFocus, deepMiss } from './deeplink.js';
import { flipBlock } from './i18n.js';
import { absenceChip, absenceListHtml } from './absence.js';   // families' absence reports (hub/ABSENCES.md)
import { centerHour, centerTimeToIso, centerToday } from './center-time.js';

const AMOUNTS = [['none', 'None'], ['a_little', 'A little'], ['about_half', 'About half'], ['most', 'Most'], ['all', 'All']];
const MEALS = [['breakfast', 'Breakfast'], ['am_snack', 'Morning snack'], ['lunch', 'Lunch'], ['snack', 'Snack']];
const TOILET = [['wet', 'Wet diaper'], ['bm', 'BM diaper'], ['wet_bm', 'Wet + BM'], ['dry', 'Dry diaper'], ['potty_success', 'Used the potty'],
  ['potty_tried', 'Tried the potty'], ['accident', 'Change of clothes']];
const FEELINGS = [['happy', 'Happy', 'bop-waving'], ['calm', 'Calm', 'lumi'], ['curious', 'Curious', 'zuri-magnifier'], ['energetic', 'Full of energy', 'bop-dancing'],
  ['tired', 'Tired', 'booker-reading'], ['wanted_comfort', 'Wanted a hug', 'lumi-waving']];
const KIND_ICON = { meal: '🍽', drink: '🥛', toilet: '🚼', nap: '🌙', mood: '💛', activity: '⭐', note: '✎' };
const OUTBOX_MAX_AGE = 2 * 24 * 3600 * 1000;     // the hub refuses entries older than two days anyway

// Family-facing words (the Today card): English and Spanish (DRAFT, glossary review pending)
const FT = {
  en: { today: 'Today', live: 'Updates through the day', none: 'Nothing logged yet today. Teachers add meals, rests, diapering and more as the day goes.',
    arrived: 'Arrived', left: 'Left', by: 'by', incident: (t) => `At ${t} a teacher wrote an incident report. The center shares the full report with you: please read it and acknowledge it in the Family Portal.`,
    acked: 'You have acknowledged it.', report: 'Evening report', sentAt: 'Sent', notYet: (t) => `The evening report goes out at ${t}.`, updated: 'Updated',
    meals: 'Meals', lunch: 'Lunch at school', drinks: 'Drinks', rest: 'Rest', care: 'Diapering and toileting', feelings: 'Feelings', did: 'What they did', lesson: "The room's lesson",
    note: 'From the teacher', notes: 'Notes through the day', classNote: 'For the whole class', star: 'Friendship Star', moment: 'Moment of the day', talk: 'Talk about it tonight',
    photos: 'Photos', photosN: (n) => `${n} new photo${n === 1 ? '' : 's'} in the Family Portal`, couldNot: 'Today could not be loaded. It tries again in a moment.',
    dayTitle: 'Daily report', readInc: 'Read and acknowledge' },
  es: { today: 'Hoy', live: 'Se actualiza durante el día', none: 'Todavía no hay nada registrado hoy. Las maestras y los maestros agregan comidas, descansos, pañales y más durante el día.',
    arrived: 'Llegó', left: 'Salió', by: 'con', incident: (t) => `A las ${t} una maestra o un maestro escribió un reporte de incidente. El centro le comparte el reporte completo: léalo y confirme que lo recibió en el Portal Familiar.`,
    acked: 'Usted ya lo confirmó.', report: 'Reporte de la tarde', sentAt: 'Enviado', notYet: (t) => `El reporte de la tarde se envía a las ${t.replace('about ', 'aprox. ')}.`, updated: 'Actualizado',
    meals: 'Comidas', lunch: 'Almuerzo en la escuela', drinks: 'Bebidas', rest: 'Descanso', care: 'Pañales y baño', feelings: 'Cómo se sintió', did: 'Lo que hizo', lesson: 'La lección del salón',
    note: 'De la maestra o el maestro', notes: 'Notas del día', classNote: 'Para toda la clase', star: 'Estrella de la amistad', moment: 'Momento del día', talk: 'Para conversar esta noche',
    photos: 'Fotos', photosN: (n) => `${n} ${n === 1 ? 'foto nueva' : 'fotos nuevas'} en el Portal Familiar`, couldNot: 'No se pudo cargar el día. Se intenta de nuevo en un momento.',
    dayTitle: 'Reporte del día', readInc: 'Leer y confirmar' },
};
const AMOUNT_ES = { none: 'nada hoy', a_little: 'un poco', about_half: 'como la mitad', most: 'casi todo', all: 'todo' };
const MEAL_ES = { Breakfast: 'Desayuno', 'Morning snack': 'Merienda de la mañana', Lunch: 'Almuerzo', Snack: 'Merienda' };
const TOILET_ES = { wet: 'pañal: mojado', bm: 'pañal: con popó', wet_bm: 'pañal: mojado y con popó', dry: 'pañal: seco', potty_success: 'usó la bacinica', potty_tried: 'intentó usar la bacinica', accident: 'se cambió a ropa seca' };
const FEEL_ES = { happy: 'feliz', calm: 'en calma', curious: 'con curiosidad', energetic: 'con mucha energía', tired: 'con sueño', wanted_comfort: 'quiso un abrazo' };

const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
  const r = (crypto.getRandomValues(new Uint8Array(1))[0] & 15); return (c === 'x' ? r : (r & 3) | 8).toString(16);
}));
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode: the list lives in memory only */ } },
};
// the center's own day and hour (centers.timeclock_tz, center-time.js), never the tablet's zone or Central time
const chicagoDate = (d = new Date()) => centerToday(d);
const mealNow = () => { const h = centerHour(); return h < 9 ? 'breakfast' : h < 11 ? 'am_snack' : h < 14 ? 'lunch' : 'snack'; };

export function mountToday({ esc, $, $$, rpc, client, page, live, friendly, session }) {
  let timers = [];
  const stop = () => { for (const t of timers) clearInterval(t); timers = []; };

  // ---------------------------------------------------------------------------------------------------------------------
  // The waiting list (outbox)
  // ---------------------------------------------------------------------------------------------------------------------
  function outbox(c, userId) {
    const key = `ff-today-outbox:${c.center_id}:${userId}`;
    let mem = store.get(key, []).filter((o) => Date.now() - (o._q || 0) < OUTBOX_MAX_AGE);
    let sending = false;
    const save = () => store.set(key, mem);
    return {
      list: () => mem.slice(),
      add(ops) { mem = mem.concat(ops.map((o) => ({ ...o, _q: Date.now() }))); save(); },
      drop(ids) { const x = new Set(ids); mem = mem.filter((o) => !x.has(o.id)); save(); },
      // -> { sent, refused: [{op, reason}], offline }
      async flush() {
        if (sending || !mem.length) return { sent: 0, refused: [], offline: false };
        sending = true;
        try {
          const batch = mem.slice(0, 100);
          let res;
          try { res = await rpc('care_entries_apply', { p_center: c.center_id, p_ops: batch.map(({ _q, ...o }) => o) }); }
          catch (e) {
            const m = String(e?.message || e);
            if (/Failed to fetch|NetworkError|network|Load failed|timeout/i.test(m) || !navigator.onLine) return { sent: 0, refused: [], offline: true };
            // the whole batch was refused (signed out, no classroom access, center read-only): keep it, say why
            return { sent: 0, refused: [], offline: false, error: friendly(e) };
          }
          const done = new Set(), refused = [];
          (res || []).forEach((r, i) => {
            const op = batch[i];
            if (!op) return;
            done.add(op.id);
            if (r.status === 'refused') refused.push({ op, reason: r.reason });
          });
          mem = mem.filter((o) => !done.has(o.id)); save();
          return { sent: done.size - refused.length, refused, offline: false };
        } finally { sending = false; }
      },
    };
  }

  // ---------------------------------------------------------------------------------------------------------------------
  // /c/<slug>/today : quick entry
  // ---------------------------------------------------------------------------------------------------------------------
  async function viewToday(c, shell) {
    stop();
    const s = await session();
    const box = outbox(c, s.user.id);
    const roomsRes = await client().from('rooms').select('id, data').eq('center_id', c.center_id).order('id');
    if (roomsRes.error) throw roomsRes.error;
    const rooms = (roomsRes.data || []).sort((a, b) => (Number(a.data?.order ?? 99) - Number(b.data?.order ?? 99)) || a.id.localeCompare(b.id));
    const roomKey = `ff-today-room:${c.center_id}`;
    let room = new URLSearchParams(location.search).get('room') || store.get(roomKey, null);   // ?room= from the dashboard's "Log care"
    if (!rooms.some((r) => r.id === room)) room = rooms[0]?.id || null;
    if (!room) {
      page(shell('<div class="card" id="todayView"><h2>Today</h2><p class="empty">No rooms yet. A director adds rooms in Center settings.</p></div>'), `Today · ${c.name}`, { english: true });
      return;
    }
    const st = { board: null, menu: null, sel: new Set(), panel: 'meal', meal: mealNow(), mealItems: {}, whole: null, asked: false, tried: false, drink: 'water',
      extra: [], undo: null, msgs: [], date: chicagoDate() };

    page(shell(`<section id="todayView" class="td">
      <div class="td-head"><div><h2>Today</h2><p class="small muted" id="tdSub">Tap children, then one tap logs it for all of them. Families see it in their child's Today and in the evening report.</p></div>
        <label class="f td-room"><span>Room</span><select class="i" id="tdRoom">${rooms.map((r) => `<option value="${esc(r.id)}"${r.id === room ? ' selected' : ''}>${esc(r.data?.name || r.id)}</option>`).join('')}</select></label></div>
      <div class="td-status" role="status" aria-live="polite"><span id="tdRatio" class="chip"></span><span id="tdSync" class="chip"></span></div>
      <p class="msg" id="tdMsg" role="alert" hidden></p>
      <div class="td-bar"><button type="button" class="btn soft small" id="tdAll">Select everyone here</button><button type="button" class="btn link small" id="tdNone">Clear</button>
        <span class="small muted" id="tdCount">No one selected</span></div>
      <ul class="td-kids" id="tdKids" aria-label="Children in this room"></ul>
      <div id="tdAbsences"></div>
      <div class="card td-actions">
        <div class="td-tabs" role="tablist" aria-label="What to log">${[['meal', 'Meal'], ['drink', 'Drink'], ['toilet', 'Diaper / potty'], ['nap', 'Rest'], ['mood', 'Feeling'], ['activity', 'Activity'], ['note', 'Note']]
          .map(([k, l]) => `<button type="button" role="tab" class="td-tab" data-panel="${k}" aria-selected="${k === 'meal'}">${l}</button>`).join('')}</div>
        <div id="tdPanel"></div>
        <details class="td-time"><summary class="small">Log for an earlier time</summary><label class="f"><span>Time (leave empty for now)</span><input class="i" type="time" id="tdAt"></label></details>
        <div class="td-undo"><button type="button" class="btn soft small" id="tdUndo" hidden>Undo last</button></div>
      </div>
      <div class="card"><h3>Logged in this room today</h3><ul class="td-log" id="tdLog"></ul></div>
    </section>`), `Today · ${c.name}`, { english: true });

    const msg = (text, bad = true) => { const m = $('#tdMsg'); if (!m) return; m.hidden = !text; m.className = `msg ${bad ? 'bad' : 'ok'}`; m.textContent = text || ''; };
    const atIso = () => {
      const v = $('#tdAt')?.value;
      if (!v) return new Date().toISOString();
      return centerTimeToIso(v);   // the time typed is the center's clock time, whatever zone the tablet is set to
    };
    const kids = () => st.board?.kids || [];
    const nameOf = (k) => (kids().find((x) => x.kid === k)?.first) || k;

    function syncChip() {
      const n = box.list().length, el = $('#tdSync');
      if (!el) return;
      el.className = `chip ${n ? 'warn' : 'ok'}`;
      el.textContent = n ? `${navigator.onLine ? 'Waiting to send' : 'Offline'}: ${n}` : 'All saved';
    }
    function ratioChip() {
      const el = $('#tdRatio'); if (!el) return;
      const r = st.board?.ratio;
      if (!r) { el.hidden = true; return; }
      el.hidden = false;
      const res = r.result || {};
      el.className = `chip ${res.status === 'over' ? 'bad' : ''}`;
      el.textContent = `Here now: ${r.present ?? 0}${res.row?.ratio ? ` · ratio ${res.row.ratio}, ${res.required_staff ?? '?'} staff needed` : ''}`;
    }
    function renderKids() {
      const ul = $('#tdKids'); if (!ul) return;
      ul.innerHTML = kids().map((k) => {
        const on = st.sel.has(k.kid);
        const chips = [k.here === false ? '<span class="chip">Not checked in</span>' : '',
          k.published ? '<span class="chip ok">Report sent</span>' : '',
          k.resting_since ? `<span class="chip">🌙 since ${esc(k.resting_since)}</span>` : '',
          k.last_toilet ? `<span class="chip">🚼 ${esc(k.last_toilet)}</span>` : '',
          (k.meals || []).length ? `<span class="chip">🍽 ${esc(k.meals.length)}</span>` : '',
          k.meal_state === 'needed' ? '<span class="chip bad">Meal held: see the meal plan</span>' : '',
          absenceChip(esc, k.absence)].join('');
        return `<li><button type="button" class="td-kid${on ? ' on' : ''}${k.here === false ? ' away' : ''}" data-kid="${esc(k.kid)}" aria-pressed="${on}"${k.published ? ' disabled' : ''}>
          <span class="td-kname">${esc(k.first)} ${esc(k.last_initial || '')}</span><span class="td-kchips">${chips}</span></button></li>`;
      }).join('') || '<li class="empty">No children in this room.</li>';
      const n = st.sel.size; const c2 = $('#tdCount'); if (c2) c2.textContent = n ? `${n} selected: ${[...st.sel].map(nameOf).join(', ')}` : 'No one selected';
    }
    function renderLog() {
      const ul = $('#tdLog'); if (!ul) return;
      const pend = box.list().filter((o) => o.op === 'add' || o.op === 'end_nap' || !o.op).map((o) => `<li class="td-pending"><span class="chip warn">Waiting to send</span>
        <b>${esc(nameOf(o.kid))}</b> ${esc(o.op === 'end_nap' ? 'rest ended' : (KIND_ICON[o.kind] || '') + ' ' + o.kind)}</li>`).join('');
      const rows = (st.board?.entries || []).slice(0, 60).map((e) => `<li><span class="td-time-l">${esc(e.time)}</span><span><b>${esc(nameOf(e.kid))}</b> ${KIND_ICON[e.kind] || ''} ${esc(e.words || '')}</span>
        <button type="button" class="btn link small" data-void="${esc(e.id)}" aria-label="Undo this entry for ${esc(nameOf(e.kid))}">Undo</button></li>`).join('');
      ul.innerHTML = pend + rows || '<li class="empty">Nothing logged yet today.</li>';
    }
    function amountButtons(name, current, attr) {
      return `<div class="td-amounts" role="group" aria-label="${esc(name)}">${AMOUNTS.map(([v, l]) => `<button type="button" class="td-amt${current === v ? ' on' : ''}" ${attr}="${esc(v)}" aria-pressed="${current === v}">${l}</button>`).join('')}</div>`;
    }
    function renderPanel() {
      const p = $('#tdPanel'); if (!p) return;
      $$('.td-tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.panel === st.panel)));
      if (st.panel === 'meal') {
        const m = st.menu?.meals?.[st.meal === 'am_snack' ? 'snack' : st.meal];
        const items = [...(m?.items || []).map((i) => i.name), ...st.extra];
        p.innerHTML = `<div class="td-row"><label class="f"><span>Meal</span><select class="i" id="tdMeal">${MEALS.map(([v, l]) => `<option value="${v}"${v === st.meal ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
          <p class="small muted td-menu">${m ? `On the menu${st.menu?.id ? ` (${esc(st.menu.id)})` : ''}: <b>${esc(m.title)}</b>` : (st.menu?.source === 'closed' ? `The center calendar says closed${st.menu.label ? ` (${esc(st.menu.label)})` : ''}: no menu. Add what was served if children are here.` : 'No menu for this room today: add what was served.')}</p></div>
          <div class="td-item"><b>Whole meal</b>${amountButtons('Whole meal', st.whole, 'data-whole')}</div>
          ${items.map((n) => `<div class="td-item"><b>${esc(n)}</b>${amountButtons(n, st.mealItems[n], `data-item="${esc(n)}" data-amt`)}</div>`).join('')}
          <form class="td-add" id="tdAddItem"><label class="f"><span>Add an item that was served</span><input class="i" id="tdItemName" maxlength="80" autocomplete="off"></label><button class="btn soft small" type="submit">Add</button></form>
          <div class="td-row"><label class="check"><input type="checkbox" id="tdAsked"${st.asked ? ' checked' : ''}> Asked for more</label>
            <label class="check"><input type="checkbox" id="tdTried"${st.tried ? ' checked' : ''}> Tried something new</label></div>
          <button type="button" class="btn gold td-go" id="tdSaveMeal">Save meal for the selected children</button>
          <p class="small muted">Neutral words only: no praise or rewards for eating, no stickers for food.</p>`;
      } else if (st.panel === 'drink') {
        p.innerHTML = `<div class="td-row" role="group" aria-label="Drink">${[['water', 'Water'], ['milk', 'Milk']].map(([v, l]) => `<button type="button" class="td-amt${st.drink === v ? ' on' : ''}" data-drink="${v}" aria-pressed="${st.drink === v}">${l}</button>`).join('')}</div>
          <p class="small muted">How much (one tap saves for the selected children)</p>${amountButtons('How much', null, 'data-drinkamt')}`;
      } else if (st.panel === 'toilet') {
        p.innerHTML = `<p class="small muted">One tap saves for the selected children.</p><div class="td-grid">${TOILET.map(([v, l]) => `<button type="button" class="td-big" data-toilet="${v}">${esc(l)}</button>`).join('')}</div>`;
      } else if (st.panel === 'nap') {
        p.innerHTML = `<div class="td-grid two"><button type="button" class="td-big" id="tdNapStart">🌙 Rest starts</button><button type="button" class="td-big" id="tdNapEnd">☀ Rest ends</button></div>
          <p class="small muted">A child can rest more than once a day. Families see the times.</p>`;
      } else if (st.panel === 'mood') {
        p.innerHTML = `<p class="small muted">How did they seem? One tap saves. These are feelings, never "good" or "bad" behaviour.</p><div class="td-grid">${FEELINGS.map(([v, l, art]) =>
          `<button type="button" class="td-big td-feel" data-feel="${v}"><img src="img/friends/${art}-480.webp" alt="" width="56" height="56" loading="lazy"><span>${esc(l)}</span></button>`).join('')}</div>`;
      } else if (st.panel === 'activity') {
        const prog = st.board?.program || [];
        p.innerHTML = `${prog.length ? `<p class="small muted">From today's program (one tap saves)</p><div class="td-grid">${prog.map((x) => `<button type="button" class="td-big" data-prog="${esc(x.id)}" data-text="${esc(x.theme)}">${esc(x.theme)}<span class="small muted">${esc(x.friend || '')}</span></button>`).join('')}</div>` : '<p class="small muted">No program record for this room today.</p>'}
          <form id="tdActForm" class="td-add"><label class="f"><span>What they did</span><input class="i" id="tdActText" maxlength="200" autocomplete="off" placeholder="Built a tall block tower"></label><button class="btn gold small" type="submit">Save</button></form>`;
      } else if (st.panel === 'note') {
        p.innerHTML = `<form id="tdNoteForm"><label class="f"><span>A short note for the family</span><textarea class="i" id="tdNote" maxlength="600" rows="3"></textarea></label>
          <p class="small muted">Leave out health details (medication, allergies, diagnoses): those go to the director. Use neutral words about food and bodies.</p>
          <button class="btn gold" type="submit">Save note for the selected children</button></form>`;
      }
    }

    async function load() {
      try {
        st.board = await rpc('care_room_today', { p_center: c.center_id, p_room: room, p_date: st.date });
        st.sel = new Set([...st.sel].filter((k) => kids().some((x) => x.kid === k && !x.published)));
      } catch (e) { msg(friendly(e)); }
      renderKids(); renderLog(); ratioChip(); syncChip();
      const ab = $('#tdAbsences'); if (ab) ab.innerHTML = (st.board?.absences || []).length ? absenceListHtml(esc, st.board.absences, { slug: c.slug }) : '';
    }
    async function loadMenu() {
      st.menu = null;
      try {
        const ses = await session();
        const r = await fetch(`/api/today/menu?room=${encodeURIComponent(room)}&date=${st.date}`, { headers: { Authorization: `Bearer ${ses.access_token}`, 'x-center': c.center_id } });
        if (r.ok) st.menu = await r.json();
      } catch { /* offline: type the items */ }
      if (st.panel === 'meal') renderPanel();
    }
    async function flush() {
      const r = await box.flush();
      if (r.error) msg(r.error);
      if (r.refused.length) msg(`Not saved: ${r.refused.map((x) => `${nameOf(x.op.kid) || 'an entry'}: ${x.reason}`).join(' · ')}`);
      if (r.sent || r.refused.length) await load(); else { syncChip(); renderLog(); }
      return r;
    }
    // one tap: an operation per selected child, into the waiting list, then sent
    async function log(kind, data, extra = {}) {
      if (!st.sel.size) { msg('Tap one or more children first.'); return; }
      const at = atIso();
      const ops = [...st.sel].map((kid) => ({ op: 'add', id: uuid(), kid, kind, at, data, ...extra }));
      box.add(ops); st.undo = ops.map((o) => o.id);
      $('#tdUndo').hidden = false;
      msg('');
      renderLog(); syncChip();
      const r = await flush();
      live(r.offline ? `Waiting to send: ${ops.length}` : `Saved for ${ops.length - r.refused.length}`);
    }
    async function endNap() {
      if (!st.sel.size) { msg('Tap one or more children first.'); return; }
      const at = atIso();
      box.add([...st.sel].map((kid) => ({ op: 'end_nap', id: uuid(), kid, at })));
      st.undo = null; $('#tdUndo').hidden = true;
      renderLog(); syncChip(); await flush(); live('Rest ended');
    }
    async function voidIds(ids) {
      box.add(ids.map((id) => ({ op: 'void', id })));
      syncChip(); await flush();
    }

    // ---- events
    $('#tdRoom').onchange = async (e) => { room = e.target.value; store.set(roomKey, room); st.sel.clear(); await Promise.all([load(), loadMenu()]); };
    $('#tdAll').onclick = () => { st.sel = new Set(kids().filter((k) => k.here !== false && !k.published).map((k) => k.kid)); renderKids(); };
    $('#tdNone').onclick = () => { st.sel.clear(); renderKids(); };
    $('#tdKids').onclick = (e) => {
      const b = e.target.closest('.td-kid'); if (!b || b.disabled) return;
      const k = b.dataset.kid; if (st.sel.has(k)) st.sel.delete(k); else st.sel.add(k);
      renderKids();
    };
    $('.td-tabs').onclick = (e) => { const b = e.target.closest('.td-tab'); if (!b) return; st.panel = b.dataset.panel; renderPanel(); };
    $('#tdUndo').onclick = async () => {
      if (!st.undo) return;
      const ids = st.undo; st.undo = null; $('#tdUndo').hidden = true;
      // still waiting on this device: drop them; otherwise void them in the hub
      const waiting = new Set(box.list().map((o) => o.id));
      const sent = ids.filter((id) => !waiting.has(id));
      box.drop(ids.filter((id) => waiting.has(id)));
      if (sent.length) await voidIds(sent); else { renderLog(); syncChip(); }
      live('Undone');
    };
    $('#tdLog').onclick = async (e) => { const b = e.target.closest('[data-void]'); if (!b) return; b.disabled = true; await voidIds([b.dataset.void]); live('Undone'); };
    $('#tdPanel').onclick = async (e) => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.whole) { st.whole = t.dataset.whole; for (const n of [...(st.menu?.meals?.[st.meal === 'am_snack' ? 'snack' : st.meal]?.items || []).map((i) => i.name), ...st.extra]) st.mealItems[n] = st.whole; renderPanel(); return; }
      if (t.dataset.amt) { st.mealItems[t.dataset.item] = t.dataset.amt; renderPanel(); return; }
      if (t.id === 'tdSaveMeal') {
        const items = Object.entries(st.mealItems).filter(([, a]) => a).map(([name, amount]) => ({ name, amount }));
        if (!items.length && !st.whole) { msg('Pick how much for the meal or for each item.'); return; }
        const m = st.menu?.meals?.[st.meal === 'am_snack' ? 'snack' : st.meal];
        const data = { meal: st.meal, items, asked_more: $('#tdAsked').checked, tried_new: $('#tdTried').checked,
          ...(st.menu?.id && m ? { menu: st.menu.id, title: m.title } : {}), ...(items.length ? {} : { amount: st.whole }) };
        await log('meal', data);
        st.mealItems = {}; st.whole = null; st.asked = false; st.tried = false; renderPanel();
        return;
      }
      if (t.dataset.drink) { st.drink = t.dataset.drink; renderPanel(); return; }
      if (t.dataset.drinkamt) return log('drink', { drink: st.drink, amount: t.dataset.drinkamt });
      if (t.dataset.toilet) return log('toilet', { what: t.dataset.toilet });
      if (t.id === 'tdNapStart') return log('nap', {});
      if (t.id === 'tdNapEnd') return endNap();
      if (t.dataset.feel) return log('mood', { feeling: t.dataset.feel });
      if (t.dataset.prog) return log('activity', { text: t.dataset.text, source: 'program', ref: t.dataset.prog });
    };
    $('#tdPanel').onchange = (e) => {
      if (e.target.id === 'tdMeal') { st.meal = e.target.value; st.mealItems = {}; st.whole = null; renderPanel(); }
      if (e.target.id === 'tdAsked') st.asked = e.target.checked;
      if (e.target.id === 'tdTried') st.tried = e.target.checked;
    };
    $('#tdPanel').onsubmit = async (e) => {
      e.preventDefault();
      if (e.target.id === 'tdAddItem') { const n = $('#tdItemName').value.trim(); if (n && !st.extra.includes(n)) st.extra.push(n.slice(0, 80)); renderPanel(); $('#tdItemName')?.focus(); }
      if (e.target.id === 'tdActForm') { const v = $('#tdActText').value.trim(); if (v) { await log('activity', { text: v, source: 'free' }); renderPanel(); } }
      if (e.target.id === 'tdNoteForm') { const v = $('#tdNote').value.trim(); if (v) { await log('note', { text: v }); renderPanel(); } }
    };
    const onOnline = () => { if ($('#todayView')) flush(); };
    window.addEventListener('online', onOnline);
    timers.push(setInterval(() => {
      if (!$('#todayView')) { stop(); window.removeEventListener('online', onOnline); return; }
      if (box.list().length) flush(); else if (document.visibilityState === 'visible') load();
    }, 20000));

    renderPanel();
    await Promise.all([load(), loadMenu()]);
    // a notification about a family's absence report opens the child here (?kid=) and the report itself (?absence=)
    const dq = new URLSearchParams(location.search);
    if (dq.get('absence') || dq.get('kid')) {
      const rep = dq.get('absence') && document.getElementById(`abs-${dq.get('absence')}`);
      const tile = dq.get('kid') && document.querySelector(`#tdKids [data-kid="${CSS.escape(dq.get('kid'))}"]`);
      if (rep) deepFocus(rep); else if (tile) deepFocus(tile); else deepMiss(dq.get('kid') ? 'child' : 'any');
    }
    if (box.list().length) flush();
  }

  // ---------------------------------------------------------------------------------------------------------------------
  // The "Today" card on /c/<slug>/child/<kid> (families; staff see the same timeline)
  // ---------------------------------------------------------------------------------------------------------------------
  function reportHtml(r, L, lang) {
    const es = lang === 'es';
    const rows = [];
    const add = (k, v) => { if (v) rows.push(`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`); };
    const amt = (a) => (es ? AMOUNT_ES[a] ?? a : String(a || '').replace(/_/g, ' '));
    const meal = (m) => {
      const name = es ? MEAL_ES[m.meal] ?? m.meal : m.meal;
      if (!m.code) return `${name}: ${m.words}`;
      const items = (m.items || []).map((i) => `${i.name}: ${amt(i.amount)}`);
      return `${name}${m.title ? ` (${m.title})` : ''}: ${[items.join('; ') || (m.amount ? amt(m.amount) : ''), m.asked_more ? (es ? 'Pidió más' : 'Asked for more') : '',
        m.tried_new ? (es ? 'Probó algo nuevo' : 'Tried something new') : ''].filter(Boolean).join('. ')}`;
    };
    add(L.meals, (r.meals || []).map(meal).join('. '));
    if (r.lunch?.dish) add(L.lunch, r.lunch.source === 'custom' ? `${r.lunch.dish} (${es ? 'el almuerzo propio del salón' : "the room's own lunch"})` : r.lunch.dish);
    add(L.drinks, (r.drinks || []).map((d) => `${es ? d.words_es : d.words} (${d.at})`).join('; '));
    add(L.rest, es && (r.naps || []).length ? r.naps.map((n) => (n.end ? `${n.start} – ${n.end} (${n.minutes} min)` : `${n.start} –`)).join('; ') : r.rest);
    add(L.care, es && (r.care_items || []).length ? r.care_items.map((x) => `${x.at} ${TOILET_ES[x.what] ?? x.what}`).join('; ') : (r.care || []).join('; '));
    add(L.feelings, (r.moods || []).map((m) => `${es ? FEEL_ES[m.feeling] : m.words} (${m.at})`).join('; '));
    add(L.did, (r.did || []).map((d) => d.text).join('; '));
    if (r.lesson) add(L.lesson, `"${r.lesson.theme}" ${es ? 'con' : 'with'} ${r.lesson.friend}`);
    add(L.note, r.note);
    add(L.notes, (r.day_notes || []).map((n) => `${n.at}: ${n.text}`).join(' '));
    add(L.classNote, r.class_note);
    for (const m of r.moments || []) add(m.domain === 'star' ? L.star : L.moment, m.text);
    if ((r.photos || []).length) add(L.photos, L.photosN(r.photos.length));
    return `<dl class="td-report">${rows.join('')}</dl>${r.talk_tonight && !es ? `<p class="td-talk"><b>${esc(L.talk)}:</b> ${esc(r.talk_tonight)}</p>` : ''}`;
  }

  // ?date=YYYY-MM-DD (the daily report notification): that day's report, opened and highlighted; a past day is not polled
  async function childToday(c, kid, { lang = 'en' } = {}) {
    const L = FT[lang === 'es' ? 'es' : 'en'];
    const anchor = $('#childRecord');
    if (!anchor || $('#childToday')) return;
    const want = new URLSearchParams(location.search).get('date');
    const day = /^\d{4}-\d{2}-\d{2}$/.test(want || '') && !Number.isNaN(Date.parse(`${want}T12:00:00Z`)) ? want : null;
    const todayIso = centerToday();
    const past = !!day && day !== todayIso;
    const dayLabel = day ? new Date(`${day}T12:00:00Z`).toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '';
    let focused = !day;
    const card = document.createElement('section');
    card.className = 'card td-family'; card.id = 'childToday'; card.setAttribute('aria-labelledby', 'childTodayH');
    if (lang === 'es') card.lang = 'es';
    anchor.parentNode.insertBefore(card, anchor);
    let last = '', otherHtml = null, otherFor = '';
    const other = lang === 'es' ? 'en' : 'es';
    // the same report in the other language, for "Ver en español / See in English" (bilingual families; fetched once per new report)
    async function otherReport(sig) {
      if (otherFor === sig) return otherHtml;
      otherFor = sig; otherHtml = null;
      try {
        const o = await rpc('family_child_today', { p_center: c.center_id, p_kid: kid, p_date: day, p_lang: other });
        if (o?.published) otherHtml = reportHtml(o.report || {}, FT[other], other);
      } catch (_) { otherHtml = null; }
      return otherHtml;
    }
    async function tick() {
      if (!document.body.contains(card)) return false;
      let d;
      try { d = await rpc('family_child_today', { p_center: c.center_id, p_kid: kid, p_date: day, p_lang: lang === 'es' ? 'es' : 'en' }); }
      catch (e) { if (!last) card.innerHTML = `<h2 id="childTodayH">${esc(L.today)}</h2><p class="msg bad">${esc(/permission|42501|no such child/i.test(String(e?.message)) ? friendly(e) : L.couldNot)}</p>`; return true; }
      const sig = JSON.stringify(d);
      if (sig === last) return true;
      last = sig;
      const a = d.attendance || {};
      const att = [a.arrived ? `${L.arrived} ${a.arrived}${a.dropped_off_by ? ` (${L.by} ${a.dropped_off_by === 'you' && lang === 'es' ? 'usted' : a.dropped_off_by})` : ''}` : '',
        a.left ? `${L.left} ${a.left}${a.picked_up_by ? ` (${L.by} ${a.picked_up_by === 'you' && lang === 'es' ? 'usted' : a.picked_up_by})` : ''}` : ''].filter(Boolean).join(' · ');
      card.innerHTML = `<div class="td-fhead"><h2 id="childTodayH">${esc(past ? `${L.dayTitle}: ${d.first} · ${dayLabel}` : `${L.today}: ${d.first}`)}</h2>${past ? '' : `<span class="chip">${esc(L.live)}</span>`}</div>
        ${att ? `<p class="small">${esc(att)}</p>` : ''}
        ${(d.incidents || []).map((i) => `<p class="msg warn td-incident">${esc(L.incident(i.time))}${i.acknowledged ? ` ${esc(L.acked)}` : ` <a href="/c/${esc(c.slug)}/incident?id=${esc(i.id)}" data-nav>${esc(L.readInc)}</a>`}</p>`).join('')}
        <ol class="td-timeline" id="todayTimeline">${(d.timeline || []).map((t) => `<li data-kind="${esc(t.kind)}"><span class="td-time-l">${esc(t.time)}</span><span class="td-ico" aria-hidden="true">${KIND_ICON[t.kind] || '•'}</span><span>${esc(t.words)}</span></li>`).join('')
          || `<li class="empty">${esc(L.none)}</li>`}</ol>
        ${d.published ? `<section id="childReport" aria-label="${esc(L.report)}"><h3>${esc(L.report)}</h3>${flipBlock({ [lang === 'es' ? 'es' : 'en']: reportHtml(d.report || {}, L, lang), ...(await otherReport(sig).then((h) => (h ? { [other]: h } : {}))) }, lang, { cls: 'td-report' })}</section>` : `<p class="small muted">${esc(L.notYet(d.send_time || 'about 5:30 pm'))}</p>`}`;
      if (!focused) {                                   // the deep link: the report of that day, or why it is not there
        focused = true;
        if (d.published) deepFocus(card.querySelector('#childReport')); else deepMiss('daily', lang, dayLabel);
      }
      return true;
    }
    await tick();
    if (past) return;
    const t = setInterval(async () => {
      if (document.visibilityState !== 'visible') return;
      if (!(await tick())) clearInterval(t);
    }, 45000);
    timers.push(t);
  }

  return { viewToday, childToday, stop, reportHtml: (r) => reportHtml(r, FT.en, 'en') };   // reportHtml: the room preview (care-desk.js)
}
