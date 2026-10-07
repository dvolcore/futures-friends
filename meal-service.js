/* Meal service: director-approved meal instructions and the kitchen's "before service" check (independent review H4 / R4).
   Owner decision 2026-10-05 (V1 "instructions only"): the Hub keeps ONLY the serving instruction a director approved for a child (what
   to serve instead, what never to serve, an optional short note), versioned with who approved it and when. No diagnosis, reason,
   severity, medical plan or medication: the full plan stays in the center's own records, and every card says so.
   A child flagged as needing an instruction, or whose instruction is past its review date, is BLOCKED: staff can only record
   "held for the director", never assume the shared menu.
   Hub mode: meal_service_board / meal_instruction_set / meal_service_record (hub/supabase/migrations/20261010110000_meal_instructions.sql);
   the database enforces every rule. Sample mode: the same rules on sample children in this browser only.
   Food exploration is a separate, optional learning prompt: declining it is never recorded anywhere. */
(function(){
const M = {board:{}, loading:{}, err:{}, fam:{}, famLoading:{}, hist:{}, meal:'lunch', edKid:null, busy:false};
const LS = 'ff-meals-sample-v1';
const MEALS = [['breakfast','Breakfast'],['lunch','Lunch'],['snack','Snack']];
const e = s => (typeof esc === 'function' ? esc(s) : String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])));
const say = t => { if (typeof toast === 'function') toast(t); };
const rerender = () => { if (window.FFPortal && window.FFPortal.rerender) window.FFPortal.rerender(); };
const day = s => { if (!s) return ''; const [y,m,d] = String(s).slice(0,10).split('-').map(Number); return new Date(y, m-1, d).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'}); };
const at = s => s ? new Date(s).toLocaleString('en-US', {month:'short', day:'numeric', hour:'numeric', minute:'2-digit'}) : '';
const isoOf = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const addDays = (s, n) => { const [y,m,d] = s.split('-').map(Number); return isoOf(new Date(y, m-1, d+n)); };

// Mirror of the database's health-word guard (daily_report_text_ok). The database is the authority; this only explains early.
const HEALTH = /(\b(medic|medication|medicine|allerg|anaphyla|immuniz|immunis|vaccin|shots? record|diagnos|inhaler|epi ?pen|epinephrine|nebuliz|insulin|dose|dosage|prescri|asthma|seizure|tylenol|acetaminophen|ibuprofen|motrin|benadryl|antibiotic|fever|rash|vomit|diarrh|therap(y|ist)|disabilit|autis|adhd|special needs)|\biep\b|\bifsp\b|good food|bad food|junk|unhealthy|healthy food|fattening|calorie|\bdiet\b|\bbmi\b|obes|overweight)/i;
const textOk = t => !HEALTH.test(String(t || ''));

const hubOn = ctx => !!(ctx && ctx.hub && window.FFHub && window.FFHub.connected && window.FFHub.client);
const sb = () => window.FFHub.client();

// ---- the state rule (same as meal_instruction_state in the database)
function stateOf(v, date){
  if (!v) return {state:'none'};
  const state = v.status === 'ended' ? 'none' : v.status === 'needed' ? 'needed' : (v.review_by && v.review_by < date ? 'stale' : 'ok');
  return Object.assign({state}, v);
}

// ---- sample mode store (this browser only), seeded with synthetic instructions for three sample children
let S = null;
function sample(ctx){
  if (S) return S;
  try { S = JSON.parse(localStorage.getItem(LS) || 'null'); } catch (_) { S = null; }
  if (!S || typeof S !== 'object' || !S.instr) {
    S = {instr:{}, checks:[]};
    const today = isoOf(new Date()), byName = n => Object.keys(ctx.kids || {}).find(id => ctx.kids[id].first === n && ctx.kids[id].sample);
    const add = (n, v) => { const id = byName(n); if (id) S.instr[id] = [Object.assign({version:1, approved_by:'sample-director', approved_at:new Date(Date.now()-20*864e5).toISOString()}, v)]; };
    add('Mia', {status:'active', serve_instead:['Sunflower seed butter'], never_serve:['Peanut butter', 'Tree nuts'], note:'Use the nut-free serving spoon', review_by:addDays(today, 60)});
    add('Noah', {status:'needed', serve_instead:[], never_serve:[], note:null, review_by:null});
    add('Aria', {status:'active', serve_instead:['Oat milk'], never_serve:['Cow milk', 'Cheese'], note:null, review_by:addDays(today, -3)});
    save();
  }
  return S;
}
function save(){ try { localStorage.setItem(LS, JSON.stringify(S)); } catch (_) {} }
const latest = kid => { const v = (S && S.instr[kid]) || []; return v[v.length-1] || null; };
const who = id => id === 'sample-director' ? 'Sample director' : (id === 'demo' ? 'you (sample)' : '');

// ---- board for a room and date: [{kid, first, instruction:{state,...}, checks:{meal:{outcome,version,by,at,corrects}}}]
function board(ctx){
  const key = `${ctx.room}|${ctx.date}`;
  if (!hubOn(ctx)) {
    sample(ctx);
    return Object.entries(ctx.kids || {}).filter(([, k]) => k.room === ctx.room).sort((a, b) => a[1].first.localeCompare(b[1].first)).map(([id, k]) => {
      const checks = {};
      for (const c of S.checks) if (c.kid === id && c.date === ctx.date) checks[c.meal] = c;
      return {kid:id, first:k.first, instruction:stateOf(latest(id), ctx.date), checks};
    });
  }
  if (M.board[key]) return M.board[key];
  if (!M.loading[key]) {
    M.loading[key] = true;
    sb().rpc('meal_service_board', {p_center:ctx.center.id, p_room:ctx.room, p_date:ctx.date}).then(({data, error}) => {
      M.loading[key] = false;
      if (error) { M.err[key] = error.message || 'error'; } else { delete M.err[key]; M.board[key] = data || []; }
      rerender();
    });
  }
  return null;
}
const refresh = ctx => { delete M.board[`${ctx.room}|${ctx.date}`]; M.hist = {}; M.fam = {}; };

// ---- cards in the Lunch tab: before service, the director's editor, and (separately) the optional learning prompt
function stateChip(st){
  return {ok:'<span class="chip ok">Instruction approved</span>', needed:'<span class="chip bad">Blocked: instruction missing</span>',
          stale:'<span class="chip bad">Blocked: past review date</span>'}[st.state] || '<span class="chip">Shared menu</span>';
}
function instrLines(st){
  return `${st.serve_instead && st.serve_instead.length ? `<span class="small"><b>Serve instead:</b> ${st.serve_instead.map(e).join(', ')}</span>` : ''}
    ${st.never_serve && st.never_serve.length ? `<span class="small"><b>Never serve:</b> ${st.never_serve.map(e).join(', ')}</span>` : ''}
    ${st.note ? `<span class="small"><b>Note:</b> ${e(st.note)}</span>` : ''}`;
}
const approver = st => e(st.approved_by_email || who(st.approved_by) || 'the director');
function row(ctx, r){
  const st = r.instruction, c = r.checks[M.meal], blocked = st.state === 'needed' || st.state === 'stale', meal = MEALS.find(m => m[0] === M.meal)[1];
  const chk = c ? `<span class="mini" data-ms-check>${meal}: ${c.outcome === 'served_as_instructed' ? 'served as instructed' : 'held for the director'} · ${e(c.by_email || who(c.by) || 'staff')} · ${at(c.at)} · instruction v${c.version}${c.corrects ? ' (correction)' : ''}${c.version < st.version ? ' · <b style="color:var(--bad)">The instruction changed after this check: confirm again.</b>' : ''}</span>` : `<span class="mini">${meal}: not confirmed yet.</span>`;
  return `<div class="ms-row" data-ms-kid="${e(r.kid)}" data-state="${st.state}">
    <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap"><b>${e(r.first)}</b>${stateChip(st)}</div>
    ${st.state === 'needed' ? `<p class="ms-block" role="alert">Instruction missing. <b>Do not serve the shared menu to ${e(r.first)}.</b> Hold the meal and ask the director.</p>` : ''}
    ${st.state === 'stale' ? `<p class="ms-block" role="alert">This instruction was due for review on ${day(st.review_by)}. <b>Do not assume the shared menu or the old instruction.</b> Hold the meal and ask the director.</p>` : ''}
    ${st.state !== 'needed' ? `<div style="display:grid;gap:2px">${instrLines(st)}<span class="mini">Approved by ${approver(st)}, ${at(st.approved_at)} · version ${st.version}${st.review_by ? ` · review by ${day(st.review_by)}` : ''}</span></div>` : ''}
    ${chk}
    ${ctx.canWrite ? `<div style="display:flex;gap:6px;flex-wrap:wrap">${blocked ? '' : `<button class="btn soft" style="padding:5px 10px" data-ms-rec="${e(r.kid)}" data-outcome="served_as_instructed">Served as instructed</button>`}<button class="btn soft" style="padding:5px 10px" data-ms-rec="${e(r.kid)}" data-outcome="held_for_director">Held for the director</button></div>` : ''}
  </div>`;
}
function boardCard(ctx){
  const rows = board(ctx), key = `${ctx.room}|${ctx.date}`;
  const head = `<div style="display:flex;justify-content:space-between;gap:10px;align-items:end;flex-wrap:wrap"><div><span class="small muted">Before service · ${e((ctx.rooms[ctx.room] || {}).name || '')}</span><h3>Meal instructions</h3></div>
    <div style="display:flex;gap:8px;align-items:end"><label class="f" for="msMeal">Meal<select class="i" id="msMeal" style="padding:7px 9px">${MEALS.map(m => `<option value="${m[0]}" ${m[0] === M.meal ? 'selected' : ''}>${m[1]}</option>`).join('')}</select></label>${hubOn(ctx) ? '<button class="btn soft" data-ms="refresh">Refresh</button>' : ''}</div></div>
    <p class="mini" style="margin:0">Serving instructions only, approved by the director. Full plans are kept in the center's records, not here.${hubOn(ctx) ? '' : ' <span class="sample">Sample children, this browser only</span>'}</p>`;
  if (!rows) return `<div class="card ms-card" id="msBoard">${head}${M.err[key] ? `<p class="ms-block" role="alert">Meal instructions could not be loaded. Do not assume the shared menu for any child you know has an instruction: check the center's records. <button class="rl" data-ms="refresh">Try again</button></p>` : '<p class="small muted">Loading meal instructions...</p>'}</div>`;
  const flagged = rows.filter(r => r.instruction.state !== 'none'), blocked = flagged.filter(r => r.instruction.state !== 'ok');
  return `<div class="card ms-card" id="msBoard">${head}
    <p class="small" data-ms-summary>${flagged.length ? `<b>${flagged.length}</b> ${flagged.length === 1 ? 'child has' : 'children have'} a meal instruction${blocked.length ? `, <b style="color:var(--bad)">${blocked.length} blocked</b>` : ''}. Everyone else in this room gets the shared menu.` : 'No child in this room has a meal instruction on file. The shared menu applies.'}</p>
    ${flagged.map(r => row(ctx, r)).join('')}</div>`;
}
function editorCard(ctx){
  const director = hubOn(ctx) ? ctx.role === 'director' : true;
  if (!director || !ctx.canWrite) return '';
  const kids = Object.entries(ctx.kids || {}).filter(([, k]) => k.room === ctx.room).sort((a, b) => a[1].first.localeCompare(b[1].first));
  if (!kids.length) return '';
  if (!M.edKid || !kids.some(([id]) => id === M.edKid)) M.edKid = kids[0][0];
  const kid = M.edKid, rows = board(ctx) || [], cur = (rows.find(r => r.kid === kid) || {}).instruction || {state:'none'};
  const hist = history(ctx, kid);
  return `<div class="card" id="msDirector"><h3>Approve a meal instruction${hubOn(ctx) ? '' : ' <span class="sample">Sample director</span>'}</h3>
    <p class="small">Write only what to serve and what not to serve. Do not write a diagnosis, the reason, medication or emergency steps: those stay in the center's records. Each save is a new version with your name and the time; nothing is overwritten.</p>
    <div class="p2-row"><label class="f" for="msKid">Child<select class="i" id="msKid" style="padding:7px 9px">${kids.map(([id, k]) => `<option value="${e(id)}" ${id === kid ? 'selected' : ''}>${e(k.first)} ${e(k.last || '')}.</option>`).join('')}</select></label>
     <label class="f" for="msStatus">Instruction<select class="i" id="msStatus" style="padding:7px 9px"><option value="active">Approve this instruction</option><option value="needed" ${cur.state === 'needed' ? 'selected' : ''}>Flag: instruction needed (blocks the shared menu)</option><option value="ended">No instruction needed any more</option></select></label></div>
    <div class="p2-row"><label class="f" for="msInstead">Serve instead (one per line)<textarea class="i" id="msInstead" style="min-height:64px" placeholder="e.g. Oat milk">${e((cur.serve_instead || []).join('\n'))}</textarea></label>
     <label class="f" for="msNever">Never serve (one per line)<textarea class="i" id="msNever" style="min-height:64px" placeholder="e.g. Cow milk">${e((cur.never_serve || []).join('\n'))}</textarea></label></div>
    <div class="p2-row"><label class="f" for="msNote">Short note for the kitchen (optional)<input class="i" id="msNote" maxlength="200" value="${e(cur.note || '')}" placeholder="e.g. Use the separate serving spoon" style="padding:7px 9px"></label>
     <label class="f" for="msReview" style="flex:0 1 180px">Review by<input class="i" type="date" id="msReview" value="${e(cur.state === 'ok' ? cur.review_by : addDays(isoOf(new Date()), 90))}" style="padding:7px 9px"></label></div>
    <p class="note" id="msMsg" role="alert" aria-live="polite"></p>
    <div><button class="btn navy" data-ms="approve">Save as a new version</button></div>
    ${hist && hist.length ? `<details><summary class="mini">Version history (${hist.length})</summary><ul class="p2-sec" style="--c:var(--muted)">${hist.map(v => `<li>v${v.version} · ${v.status === 'active' ? `serve instead: ${e((v.serve_instead || []).join(', ') || 'none')}; never serve: ${e((v.never_serve || []).join(', ') || 'none')}` : v.status === 'needed' ? 'flagged: instruction needed' : 'ended'} · ${e(v.approved_by_email || who(v.approved_by) || 'director')} · ${at(v.approved_at)}</li>`).join('')}</ul></details>` : ''}
  </div>`;
}
function history(ctx, kid){
  if (!hubOn(ctx)) { sample(ctx); return (S.instr[kid] || []).slice().reverse(); }
  const k = `${ctx.center.id}|${kid}`;
  if (M.hist[k] !== undefined) return M.hist[k];
  M.hist[k] = null;
  sb().from('meal_instructions').select('version,status,serve_instead,never_serve,note,review_by,approved_by,approved_at').eq('center_id', ctx.center.id).eq('kid', kid).order('version', {ascending:false})
    .then(({data}) => { M.hist[k] = data || []; rerender(); });
  return null;
}
function learnCard(){
  return `<div class="card" id="msLearn" style="border-top:5px solid var(--zuri)"><h3>Food exploration <span class="mini">optional learning prompt</span></h3>
    <p class="small">Zuri's Notice, Predict, Try, Compare. Children may look, smell, touch or taste. "No thanks" is a complete answer: nothing is recorded about who tasted, and saying no never appears in Learning Steps, the daily report or anywhere else.</p>
    <p class="mini">A learning prompt never changes what a child is served. Meal instructions come first, every time.</p></div>`;
}
function lunchCards(ctx){
  if (!ctx || !ctx.room) return '';
  const ed = editorCard(ctx);
  return `<div class="grid" style="grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:16px;align-items:start;margin-bottom:16px" id="msCards">${boardCard(ctx)}${ed || learnCard()}</div>${ed ? `<div style="margin-bottom:16px">${learnCard()}</div>` : ''}`;
}

// ---- small badge on the Children table
function kidBadge(ctx, kid){
  const rows = board(ctx); if (!rows) return '';
  const r = rows.find(x => x.kid === kid); if (!r || r.instruction.state === 'none') return '';
  return r.instruction.state === 'ok' ? ' <span class="chip" data-ms-badge="ok" style="font-size:11px">Meal instruction</span>' : ' <span class="chip bad" data-ms-badge="blocked" style="font-size:11px">Meal held: ask the director</span>';
}

// ---- the family's read-only line in "What X ate"
function familyLine(ctx, kid){
  let st;
  if (hubOn(ctx) && ctx.role === 'family') {
    const k = `${ctx.center.id}|${kid}`;
    if (M.fam[k] === undefined) {
      M.fam[k] = null;
      sb().from('meal_instructions').select('version,status,serve_instead,never_serve,note,review_by,approved_at').eq('center_id', ctx.center.id).eq('kid', kid).order('version', {ascending:false}).limit(1)
        .then(({data}) => { M.fam[k] = (data && data[0]) || false; rerender(); });
    }
    st = M.fam[k] ? stateOf(M.fam[k], isoOf(new Date())) : {state:'none'};
  } else if (hubOn(ctx)) {
    const r = (board(Object.assign({}, ctx, {room:(ctx.kids[kid] || {}).room})) || []).find(x => x.kid === kid); st = r ? r.instruction : {state:'none'};
  } else { sample(ctx); st = stateOf(latest(kid), isoOf(new Date())); }
  const first = e((ctx.kids[kid] || {}).first || 'your child');
  if (st.state === 'none') return '';
  const body = st.state === 'needed' ? `The director is preparing a meal instruction for ${first}. Until it is approved, the kitchen holds the shared menu for ${first} and checks with the director.`
    : st.state === 'stale' ? `${first}'s meal instruction was due for review on ${day(st.review_by)}. The kitchen checks with the director before serving.`
    : `<span style="display:grid;gap:2px">${instrLines(st)}</span><span class="mini">Approved by the director on ${day(st.approved_at)} · next review ${day(st.review_by)}.</span>`;
  return `<div class="ms-fam" data-ms-fam="${st.state}"><b class="small">Meal instruction on file</b> <span class="small">${body}</span><span class="mini">Full plan kept in the center's records. Talk with the director about any change.</span></div>`;
}

// ---- actions
async function recordCheck(ctx, kid, outcome){
  if (!hubOn(ctx)) {
    sample(ctx); const st = stateOf(latest(kid), ctx.date);
    if (st.state === 'none') return say('This child has no meal instruction: the shared menu applies.');
    if (st.state !== 'ok' && outcome !== 'held_for_director') return say('Blocked: hold the meal and ask the director.');
    const prev = [...S.checks].reverse().find(c => c.kid === kid && c.date === ctx.date && c.meal === M.meal);
    S.checks.push({id:Date.now(), kid, date:ctx.date, meal:M.meal, version:st.version, outcome, corrects:prev ? prev.id : null, by:'demo', at:new Date().toISOString()}); save();
  } else {
    const {error} = await sb().rpc('meal_service_record', {p_center:ctx.center.id, p_kid:kid, p_date:ctx.date, p_meal:M.meal, p_outcome:outcome});
    if (error) return say(error.message || 'That was not saved. Try again.');
    refresh(ctx);
  }
  say(outcome === 'served_as_instructed' ? 'Recorded: served as instructed' : 'Recorded: held for the director');
  rerender();
}
async function approve(ctx){
  const val = id => (document.getElementById(id) || {}).value || '';
  const lines = id => val(id).split(/\n|,/).map(x => x.trim()).filter(Boolean);
  const status = val('msStatus'), si = status === 'active' ? lines('msInstead') : [], ns = status === 'active' ? lines('msNever') : [], note = val('msNote').trim() || null, review = status === 'active' ? val('msReview') : null;
  const msg = t => { const m = document.getElementById('msMsg'); if (m) { m.textContent = t; m.style.color = 'var(--bad)'; } else say(t); };
  if (![...si, ...ns, note || ''].every(textOk)) return msg('Not saved: write only what to serve or not serve. Leave out diagnoses, medication and health details: those stay in the center\'s records.');
  if (status === 'active' && !si.length && !ns.length) return msg('Add at least one "serve instead" or "never serve" item.');
  if (status === 'active' && (!review || review < isoOf(new Date()))) return msg('Choose a review date from today on.');
  if ([...si, ...ns].some(x => x.length > 60) || si.length > 12 || ns.length > 12) return msg('Keep each item under 60 characters, and 12 items at most.');
  const kid = M.edKid;
  if (!hubOn(ctx)) {
    sample(ctx); const v = (S.instr[kid] || []);
    v.push({version:v.length + 1, status, serve_instead:si, never_serve:ns, note, review_by:review, approved_by:'demo', approved_at:new Date().toISOString()});
    S.instr[kid] = v; save();
  } else {
    const {error} = await sb().rpc('meal_instruction_set', {p_center:ctx.center.id, p_kid:kid, p_status:status, p_serve_instead:si, p_never_serve:ns, p_note:note, p_review_by:review});
    if (error) return msg(error.message || 'That was not saved. Try again.');
    refresh(ctx);
  }
  say(status === 'active' ? 'Instruction saved as a new version' : status === 'needed' ? 'Flagged: the shared menu is blocked for this child' : 'Instruction ended');
  rerender();
}
const ctxNow = () => window.FFPortal && window.FFPortal.ctx ? window.FFPortal.ctx() : null;
document.addEventListener('click', async ev => {
  if (typeof view !== 'undefined' && view !== 'portal') return;
  const t = ev.target; if (!t || !t.closest) return;
  const ctx = ctxNow(); if (!ctx || M.busy) return;
  const rec = t.closest('[data-ms-rec]');
  const act = t.closest('[data-ms]');
  if (!rec && !act) return;
  M.busy = true;
  try {
    if (rec && ctx.canWrite) await recordCheck(ctx, rec.dataset.msRec, rec.dataset.outcome);
    else if (act && act.dataset.ms === 'refresh') { refresh(ctx); rerender(); }
    else if (act && act.dataset.ms === 'approve' && ctx.canWrite) await approve(ctx);
  } finally { M.busy = false; }
});
document.addEventListener('change', ev => {
  const t = ev.target; if (!t) return;
  if (t.id === 'msMeal') { M.meal = t.value; rerender(); }
  if (t.id === 'msKid') { M.edKid = t.value; rerender(); }
});

// styles (existing tokens only, so light and dark both work)
try {
  if (!document.getElementById('ff-meals-css')) { const s = document.createElement('style'); s.id = 'ff-meals-css'; s.textContent = `
.ms-row{display:grid;gap:6px;padding:10px 0;border-top:1px solid var(--line)}
.ms-row[data-state="needed"],.ms-row[data-state="stale"]{border-left:5px solid var(--bad);padding-left:10px}
.ms-block{margin:0;padding:8px 10px;border-radius:10px;background:var(--paper2);border:1px solid var(--bad);font-size:13.5px}
.ms-fam{display:grid;gap:4px;margin-top:8px;padding:10px 12px;border-radius:12px;border:1px solid var(--line);background:var(--paper2)}
@media (max-width:900px){#msCards{grid-template-columns:minmax(0,1fr) !important}}`; document.head.appendChild(s); }
} catch (_) {}

window.FFMeals = {lunchCards, kidBadge, familyLine, textOk, stateOf, _sample:() => S, _reset:() => { S = null; M.board = {}; M.fam = {}; M.hist = {}; }};
})();
