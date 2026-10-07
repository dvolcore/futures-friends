/* Futures Hub: the director's records tools in the Teacher Portal (hub mode only). Wave 4, PORTAL lane.
   - "Edit history" tab (W3C-N6): who changed a care record, when, and each field from -> to, read from the Hub's append-only
     care_history (RPC care_history_list). Director only: the database refuses everyone else (teachers, families, a director without
     two-step verification) with 42501, and this tab is not offered to them. Why not teachers: the history holds colleagues' edits,
     deleted values and incident edits made before a family acknowledged them; it is the director's oversight record
     (docs/ops/CARE_HISTORY.md, "Who can read it"). A teacher who needs to know asks the director.
   - "Children leaving the center" card under the Children tab (W3C-N7): the director records the last day a child attends
     (kids.left_on, RPC kid_left_on_set), after a confirmation that says what it starts (the retention clock). Sent through
     hub-offline.js's waiting list (the same child and date again changes nothing in the Hub).
   Nothing here decides who may see or change what: row-level security and the RPCs do. Loaded after portal.js. */
(function(){
'use strict';
if (typeof V === 'undefined' || !V.portal) return;
const H = () => window.FFHub || null;
const hubOn = () => !!(H() && H().configured && H().connected);
const rerender = () => { try { if (window.FFPortal && window.FFPortal.rerender) window.FFPortal.rerender(); } catch (_) {} };
const E = s => esc(s);
const pad = n => String(n).padStart(2, '0');
const isoOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => isoOf(new Date());
const dayTxt = s => { try { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('en-US', {weekday:'short', month:'short', day:'numeric', year:'numeric'}); } catch (_) { return String(s); } };
const atTxt = s => { try { return new Date(s).toLocaleString('en-US', {month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit'}); } catch (_) { return String(s); } };
const plusYears = (s, n) => { const [y, m, d] = String(s).split('-').map(Number); return isoOf(new Date(y + n, m - 1, d)); };

// ---- what the history rows mean, in words
const TABLES = [['kidday', 'Day record (attendance, meals, rest, notes)'], ['obs', 'Observation'], ['kids', 'Child profile'],
  ['incident_reports', 'Incident report'], ['meal_instructions', 'Meal instruction'], ['meal_service_checks', 'Meal service check'],
  ['attendance_events', 'Sign-in / sign-out'], ['pickup_people', 'Pick-up list'], ['pickup_requests', 'Pick-up list request'],
  ['pickup_day_passes', 'One-day pick-up pass'], ['drill_logs', 'Drill'], ['ratio_checks', 'Ratio check']];
const TABLE = Object.fromEntries(TABLES);
const FIELD = {present:'Attendance', meals:'Meals', nap:'Rest', note:'Note to family', star:'Friendship Star', text:'Note', shared:'Shared with family',
  level:'Level', step:'Learning Step', context:'Where or when', room:'Room', date:'Date', left_on:'Day the child left', first:'First name',
  last:'Last initial', photo_consent:'Photo consent', program:'Took part', status:'Status', first_aid:'First aid', what_happened:'What happened',
  kid:'Child', photo:'Photo', caption:'Caption'};
const OP = {insert:'created', update:'changed', delete:'deleted'};
const fieldName = k => { const b = String(k).replace(/^data\./, ''); return FIELD[b] || b.replace(/_/g, ' '); };
function val(k, v){
  const b = String(k).replace(/^data\./, '');
  if (b === 'present') return v === true ? 'Here' : v === false ? 'Absent' : 'Not marked';
  if (v === null || v === undefined || v === '') return '(empty)';
  if (typeof v === 'boolean') return v ? 'yes' : 'no';
  if (typeof v === 'object') {
    const parts = Array.isArray(v) ? v.map(x => typeof x === 'object' ? JSON.stringify(x) : String(x))
      : Object.entries(v).map(([a, x]) => `${a}: ${x && typeof x === 'object' ? (typeof x.took_part === 'boolean' ? (x.took_part ? 'took part' : 'not this time') : JSON.stringify(x)) : x}`);
    const t = parts.join(', '); return t.length > 160 ? t.slice(0, 157) + '…' : (t || '(empty)');
  }
  const t = String(v); return t.length > 160 ? `“${t.slice(0, 157)}…”` : (typeof v === 'string' ? `“${t}”` : t);
}
function who(r){
  if (r.actor_email) return r.actor_email;
  if (r.actor_role === 'service_role') return 'Futures Hub (automatic)';
  return r.actor_role || 'unknown';
}
function recordLabel(r, kids){
  const t = TABLE[r.table_name] || r.table_name, kid = r.kid && kids[r.kid];
  const name = kid ? `${kid.first || ''} ${kid.last ? String(kid.last).charAt(0) + '.' : ''}`.trim() : (r.kid ? `child ${r.kid}` : '');
  const m = /_(\d{4}-\d{2}-\d{2})$/.exec(r.record_id || '');
  return [t, name, m ? dayTxt(m[1]) : ''].filter(Boolean).join(' · ');
}
// keys that only repeat what the row is (its center, its id) or repeat a data.<key> field are left out; a new record lists only
// the fields it was created with
const ALWAYS_OUT = new Set(['center_id', 'id', 'updated_at', 'updated_by']);
function shownKeys(r){
  const all = (r.changed && r.changed.length) ? r.changed : Object.keys(r.op === 'delete' ? (r.before || {}) : (r.after || {}));
  const vals = r.op === 'delete' ? (r.before || {}) : (r.after || {});
  return all.filter(k => !ALWAYS_OUT.has(k) && !all.includes('data.' + k) && !(k === 'kid' && (r.table_name === 'kids' || r.table_name === 'rooms'))
    && !(r.op !== 'update' && (vals[k] === null || vals[k] === undefined || vals[k] === '')));
}
function changes(r){
  const keys = shownKeys(r);
  const shown = keys.slice(0, 12);
  const li = shown.map(k => {
    if (r.op === 'insert') return `<li><b>${E(fieldName(k))}</b>: ${E(val(k, (r.after || {})[k]))}</li>`;
    if (r.op === 'delete') return `<li><b>${E(fieldName(k))}</b> was ${E(val(k, (r.before || {})[k]))}</li>`;
    return `<li><b>${E(fieldName(k))}</b>: ${E(val(k, (r.before || {})[k]))} <span aria-hidden="true">→</span><span class="sr-only"> to </span> ${E(val(k, (r.after || {})[k]))}</li>`;
  }).join('');
  return li ? `<ul class="chh-f">${li}${keys.length > shown.length ? `<li class="mini">and ${keys.length - shown.length} more</li>` : ''}</ul>` : '';
}

// ---- Edit history tab
const S = {kid:'', table:'', since:'', limit:200, rows:null, loading:false, err:'', key:'', seq:0, d:{}};   // d: filter choices not applied yet
// The portal redraws itself whenever live data arrives. Choices not yet applied are kept (S.d, LV) and focus goes back where it was.
let focusSel = null;
const restoreFocus = () => setTimeout(() => {
  const a = document.activeElement; if (!focusSel || (a && a !== document.body && a !== document.documentElement)) return;
  const el = document.querySelector(focusSel); if (el && el.focus) { try { el.focus({preventScroll:true}); } catch (_) { el.focus(); } }
}, 0);
const qkey = () => [hubOn() && H().center ? H().center.id : '', S.kid, S.table, S.since, S.limit].join('|');
async function load(){
  const n = ++S.seq; S.loading = true; S.err = '';
  try {
    const rows = await H().history({kid:S.kid || null, table:S.table || null, since:S.since ? new Date(S.since + 'T00:00:00').toISOString() : null, limit:S.limit});
    if (n !== S.seq) return; S.rows = rows;
  } catch (e) {
    if (n !== S.seq) return; S.rows = null;
    S.err = e && e.code === '42501' ? 'Only the center director, signed in with two-step verification, can see the edit history.'
      : 'The edit history could not be loaded. Check the connection and try again.';
  }
  S.loading = false; rerender();
}
function view(ctx){
  if (!hubOn()) return '';
  if (ctx.role !== 'director') return `<div class="card"><h3>Edit history</h3><p class="small">Only the center director can see the edit history.</p></div>`;
  if (S.key !== qkey()) { S.key = qkey(); S.loading = true; S.err = ''; setTimeout(load, 0); }
  restoreFocus();
  const dk = 'kid' in S.d ? S.d.kid : S.kid, dt = 'table' in S.d ? S.d.table : S.table, ds = 'since' in S.d ? S.d.since : S.since;
  const kids = ctx.kids || {};
  const kidOpts = Object.entries(kids).filter(([, k]) => k && !k.sample).sort((a, b) => String(a[1].first).localeCompare(String(b[1].first)));
  const rows = S.rows || [];
  const list = rows.length ? `<ol class="chh-list">${rows.map(r => `<li class="chh-row">
      <p class="chh-h"><time datetime="${E(r.at)}">${E(atTxt(r.at))}</time> <b>${E(who(r))}</b> ${E(OP[r.op] || r.op)} <span class="chh-rec">${E(recordLabel(r, kids))}</span></p>${changes(r)}</li>`).join('')}</ol>`
    : (S.loading ? '' : `<p class="small muted">No changes match these filters.</p>`);
  const more = rows.length >= S.limit && S.limit < 1000 ? `<button type="button" class="btn soft" data-chh="more">Show more (up to ${Math.min(1000, S.limit + 200)})</button>`
    : rows.length >= 1000 ? `<p class="mini">Showing the newest 1,000. Choose a child, a kind of record or a start date to see older changes.</p>` : '';
  return `<div class="card chh" id="chhCard"><div class="chh-top"><h3>Edit history</h3><span class="chip">Director only</span></div>
   <p class="small">Every change to a child's care records: who made it, when, and what changed (old value, then new). The history cannot be edited or deleted. Teachers and families do not see it.</p>
   <form class="chh-filters" id="chhFilters" novalidate>
    <label class="f" for="chhKid">Child<select class="i" id="chhKid" name="kid"><option value="">All children</option>${kidOpts.map(([id, k]) => `<option value="${E(id)}"${dk === id ? ' selected' : ''}>${E(`${k.first || ''} ${k.last ? String(k.last).charAt(0) + '.' : ''}`.trim() || id)}</option>`).join('')}</select></label>
    <label class="f" for="chhTable">Kind of record<select class="i" id="chhTable" name="table"><option value="">All kinds</option>${TABLES.map(([t, l]) => `<option value="${t}"${dt === t ? ' selected' : ''}>${E(l)}</option>`).join('')}</select></label>
    <label class="f" for="chhSince">Since<input class="i" type="date" id="chhSince" name="since" value="${E(ds)}"></label>
    <button type="submit" class="btn navy" id="chhGo">Show changes</button></form>
   <p class="small" role="status" aria-live="polite" id="chhStatus">${S.err ? '' : S.loading ? 'Loading the edit history…' : `${rows.length} ${rows.length === 1 ? 'change' : 'changes'}, newest first.`}</p>
   ${S.err ? `<p class="chh-err" role="alert">${E(S.err)}</p>` : list}${more}</div>`;
}

// ---- Children leaving the center (director)
const LV = {kid:'', date:'', confirm:null, busy:false, msg:'', bad:false};
const nameOf = k => `${k.first || ''} ${k.last ? String(k.last).charAt(0) + '.' : ''}`.trim();
function leftCard(ctx){
  if (!hubOn() || ctx.role !== 'director') return '';
  restoreFocus();
  const kids = Object.entries(ctx.kids || {}).filter(([, k]) => k && !k.sample).sort((a, b) => nameOf(a[1]).localeCompare(nameOf(b[1])));
  if (!kids.length) return '';
  const rooms = ctx.rooms || {};
  const left = kids.filter(([, k]) => k._leftOn);
  const crm = kids.filter(([, k]) => !k._leftOn && /^\d{4}-\d{2}-\d{2}$/.test(String(k.left_on || '')));
  const date = LV.date || today(), max = isoOf(new Date(Date.now() + 366 * 864e5));
  const c = LV.confirm, ck = c && (ctx.kids || {})[c.kid];
  const confirm = c && ck ? `<div class="chh-confirm" role="group" aria-labelledby="chhCfT" id="chhConfirm"><p id="chhCfT"><b>${c.date ? `Record ${E(nameOf(ck))}'s last day as ${E(dayTxt(c.date))}?` : `Clear ${E(nameOf(ck))}'s leaving date?`}</b></p>
     <p class="small">${c.date ? `This starts the retention clock: ${E(nameOf(ck))}'s records (observations, photos, messages, daily reports) are due for deletion 3 years after this day, from ${E(dayTxt(plusYears(c.date, 3)))}. Attendance and sign-in/out records are held longer while the owner decides how long (now 5 years). Nothing is deleted today: the retention job is still a dry run.` : 'The retention clock stops: nothing about this child will be due for deletion until a leaving date is recorded again.'} The change is kept in the edit history.</p>
     <div class="chh-acts"><button type="button" class="btn gold" data-chl="yes"${LV.busy ? ' disabled' : ''}>${c.date ? 'Yes, record this date' : 'Yes, clear it'}</button><button type="button" class="btn soft" data-chl="no">Cancel</button></div></div>` : '';
  return `<div class="card chh-left" id="chhLeft"><h3>Children leaving the center</h3>
   <p class="small">Record the last day a child attends. Only the director can do this. Until it is recorded, the child's records are never due for deletion.</p>
   ${crm.length ? `<ul class="chh-crm">${crm.map(([id, k]) => `<li class="small">The enrollment system says <b>${E(nameOf(k))}</b> left on ${E(dayTxt(k.left_on))}. <button type="button" class="rl" data-chl="crm" data-chk="${E(id)}" data-date="${E(k.left_on)}">Record that date</button></li>`).join('')}</ul>` : ''}
   <form class="chh-filters" id="chhLeftForm" novalidate>
    <label class="f" for="chhLeftKid">Child<select class="i" id="chhLeftKid" name="kid"><option value="">Choose a child</option>${kids.filter(([, k]) => !k._leftOn).map(([id, k]) => `<option value="${E(id)}"${LV.kid === id ? ' selected' : ''}>${E(nameOf(k) || id)}${rooms[k.room] ? ` (${E(rooms[k.room].name)})` : ''}</option>`).join('')}</select></label>
    <label class="f" for="chhLeftDate">Last day<input class="i" type="date" id="chhLeftDate" name="date" value="${E(date)}" min="2000-01-01" max="${max}"></label>
    <button type="submit" class="btn navy" id="chhLeftGo">Record leaving date…</button></form>
   ${confirm}
   <p class="small" role="status" aria-live="polite" id="chhLeftMsg"${LV.bad ? ' style="color:var(--bad)"' : ''}>${E(LV.msg)}</p>
   ${left.length ? `<h4>Leaving dates recorded</h4><ul class="chh-done">${left.map(([id, k]) => `<li><span><b>${E(nameOf(k))}</b> · last day ${E(dayTxt(k._leftOn))}</span> <button type="button" class="rl" data-chl="clear" data-chk="${E(id)}">Clear…</button></li>`).join('')}</ul>` : ''}</div>`;
}
async function saveLeft(){
  const c = LV.confirm; if (!c || LV.busy) return;
  LV.busy = true; rerender();
  const k = (window.FFPortal.ctx().kids || {})[c.kid] || {};
  try {
    const r = await H().leftOnSet(c.kid, c.date || null);
    LV.msg = r && r.queued ? `Not saved yet: kept on this device, it will send when the Futures Hub is back.`
      : c.date ? `Recorded: ${nameOf(k)}'s last day is ${dayTxt(c.date)}.` : `Cleared ${nameOf(k)}'s leaving date.`;
    LV.bad = false; LV.kid = ''; LV.confirm = null;
  } catch (e) {
    const code = e && String(e.code || '');
    LV.msg = code === '42501' ? 'Not saved: only the director, signed in with two-step verification, can record this.'
      : code === '22023' ? 'Not saved: choose a real date, at most a year ahead.'
      : code === 'timeout' || code === 'needs_connection' ? 'Not saved: there is no connection to the Futures Hub. Try again when you are back online.' : code === 'P0002' ? 'Not saved: this child is not on this center’s list any more.'
      : 'Not saved: the Futures Hub did not accept this. Try again in a moment.';
    LV.bad = true;
  }
  LV.busy = false; rerender();
  const m = document.getElementById('chhLeftMsg'); if (m && m.focus) { m.setAttribute('tabindex', '-1'); m.focus(); }
}
const focusId = id => setTimeout(() => { const el = document.getElementById(id); if (el && el.focus) el.focus(); }, 0);

if (typeof document !== 'undefined' && document.addEventListener) {
  document.addEventListener('submit', e => {
    const f = e.target; if (!f) return;
    if (f.id === 'chhFilters') { e.preventDefault(); S.kid = f.elements.kid.value; S.table = f.elements.table.value; S.since = f.elements.since.value; S.d = {}; S.limit = 200; S.rows = null; rerender(); return; }
    if (f.id === 'chhLeftForm') {
      e.preventDefault(); LV.kid = f.elements.kid.value; LV.date = f.elements.date.value;
      if (!LV.kid) { LV.msg = 'Choose a child first.'; LV.bad = true; rerender(); focusId('chhLeftKid'); return; }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(LV.date)) { LV.msg = 'Choose the last day.'; LV.bad = true; rerender(); focusId('chhLeftDate'); return; }
      LV.msg = ''; LV.bad = false; LV.confirm = {kid:LV.kid, date:LV.date}; rerender(); focusId('chhConfirm');
      setTimeout(() => { const b = document.querySelector('[data-chl="yes"]'); if (b) b.focus(); }, 0);
    }
  });
  document.addEventListener('click', e => {
    const t = e.target && e.target.closest && e.target.closest('[data-chh],[data-chl]'); if (!t) return;
    if (t.dataset.chh === 'more') { S.limit = Math.min(1000, S.limit + 200); rerender(); return; }
    const a = t.dataset.chl; if (!a) return; e.preventDefault();
    if (a === 'yes') return void saveLeft();
    if (a === 'no') { LV.confirm = null; LV.msg = 'Nothing was changed.'; LV.bad = false; rerender(); focusId('chhLeftKid'); return; }
    if (a === 'clear') { LV.confirm = {kid:t.dataset.chk, date:null}; rerender(); setTimeout(() => { const b = document.querySelector('[data-chl="yes"]'); if (b) b.focus(); }, 0); return; }
    if (a === 'crm') { LV.kid = t.dataset.chk; LV.date = t.dataset.date; LV.confirm = {kid:t.dataset.chk, date:t.dataset.date}; rerender(); setTimeout(() => { const b = document.querySelector('[data-chl="yes"]'); if (b) b.focus(); }, 0); }
  });
  const keep = e => { const t = e.target; if (!t || !t.id) return;
    if (t.id === 'chhKid') S.d.kid = t.value; else if (t.id === 'chhTable') S.d.table = t.value; else if (t.id === 'chhSince') S.d.since = t.value;
    else if (t.id === 'chhLeftKid') LV.kid = t.value; else if (t.id === 'chhLeftDate') LV.date = t.value; };
  document.addEventListener('change', keep); document.addEventListener('input', keep);
  document.addEventListener('focusin', e => {
    const t = e.target; if (!t || !t.closest || !t.closest('#chhCard,#chhLeft')) return;
    focusSel = t.id ? '#' + t.id : t.dataset && t.dataset.chl ? `[data-chl="${t.dataset.chl}"]${t.dataset.chk ? `[data-chk="${t.dataset.chk}"]` : ''}` : t.dataset && t.dataset.chh ? `[data-chh="${t.dataset.chh}"]` : null;
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && LV.confirm && document.getElementById('chhConfirm')) { LV.confirm = null; rerender(); focusId('chhLeftKid'); } });
}

window.FFHistory = {
  addTabs(tabs, role){ if (hubOn() && role === 'director') tabs.push(['history', 'Edit history']); },
  view, leftCard, _state:{S, LV},
};
})();
