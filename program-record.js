/* Daily-program records (review H3): ONE versioned activity record feeds the teacher Today/checklist, the lesson calendar, the
   kitchen prompt and the family continuation. This file only reads records and draws them; portal.js writes the teacher's
   participation log into the child's day document (kidday.program), the same logged-event record as attendance and meals.
   - Futures Hub signed in (staff): the hub decides which APPROVED current version a room runs on a date (program_day /
     program_calendar / program_kitchen_prompts, migration 20261010200000_program_records.sql). A correction is a new version and
     reaches every view without other edits.
   - Sample mode (no hub): program-data.js (generated from the same hub content files, approved versions only) on a sample schedule
     that starts this week, so nothing leaves the browser.
   Planned content is never shown as something a child did: participation comes only from what a teacher logged. E4 (ETEACH): every child
   starts "Not recorded"; a teacher marks "Took part" or "Not this time" child by child, or uses "Everyone here took part" as a deliberate
   two-step action that lists its exceptions first. The four whole-child fields and the timing blocks come from teach-day.js. */
(function(){
'use strict';
const BLOCKS = ['arrival','circle','story','move','meal','outside','reset','goodbye'];
const NAMES = {booker:'Booker', lumi:'Lumi', zuri:'Zuri', bop:'Bop'};
const BAND_LABEL = {twos:'Twos', threes:'Threes', prek:'Pre-K'};
const MEDIA_LABEL = {print:'Print', video:'Video', audio:'Audio', puppet:'Puppet'};
const STATUS_CHIP = {ready:['ok','Ready'], draft:['warn','Draft'], unavailable:['bad','Not available yet']};
const TTL = 5*60*1000;   // hub answers are re-read after 5 minutes, so an approved correction shows without a reload
const E = s => esc(s == null ? '' : String(s));
const pad = n => String(n).padStart(2,'0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const fromIso = s => { const [y,m,d] = String(s).split('-').map(Number); return new Date(y, m-1, d); };
const dow = s => { const w = fromIso(s).getDay(); return w === 0 ? 7 : w; };          // ISO weekday 1-7
const order = b => (BLOCKS.indexOf(b) + 1) || 50;
const byBlock = (a,b) => order(a.block) - order(b.block) || String(a.id).localeCompare(String(b.id));
const blockName = b => String(b || 'activity').replace(/-/g,' ').replace(/^./, c => c.toUpperCase());
const hubOn = c => !!(c && c.hub && window.FFHub && window.FFHub.connected && window.FFHub.client);
const rerender = () => { try { if (window.FFPortal && window.FFPortal.rerender) window.FFPortal.rerender(); } catch(_){} };
const S = {day:{}, cal:{}, kit:{}};

// ---------------------------------------------------------------- sample mode (program-data.js on a sample schedule)
function bundle(){ const b = window.FF_PROGRAM; return b && Array.isArray(b.records) ? b : {records:[]}; }
function sampleStart(){
  const b = bundle(); if (/^\d{4}-\d{2}-\d{2}$/.test(String(b.sample_start||'')) && dow(b.sample_start) === 1) return b.sample_start;
  const d = new Date(); const w = d.getDay(); if (w === 6) d.setDate(d.getDate()+2); if (w === 0) d.setDate(d.getDate()+1);
  d.setDate(d.getDate() - ((d.getDay()+6)%7)); return iso(d);
}
// week = whole weeks since the Monday start + 1, day = weekday 1-5 (the same rule as the hub's program_records_on)
function slot(start, date){
  const days = Math.round((fromIso(date) - fromIso(start)) / 864e5), d = dow(date);
  if (days < 0 || d > 5) return null; return {week: Math.floor(days/7) + 1, day: d};
}
function sampleOn(date){
  const b = bundle(); if (!b.records.length) return [];
  const release = b.records.map(r=>r.release).sort()[0], start = sampleStart(), s = slot(start, date); if (!s) return [];
  return b.records.filter(r => r.release === release && r.status === 'approved' && r.date_offset && r.date_offset.week === s.week && r.date_offset.day === s.day)
    .map(r => ({id:r.id, version:r.version, release:r.release, block:r.block, week:s.week, day:s.day, start_date:start, record:r})).sort(byBlock);
}

// ---------------------------------------------------------------- reads (one shape for both modes)
// -> {state:'loading'|'ready'|'error', sample, schedule:[{release,start_date}], releases:[], records:[{id,version,release,block,week,day,record}]}
function day(c, room, date, peek){
  if (!room || !date) return {state:'ready', records:[], schedule:[], releases:[]};
  if (!hubOn(c)) { const b = bundle(); const rel = b.records.length ? [b.records.map(r=>r.release).sort()[0]] : [];
    return {state:'ready', sample:true, schedule: rel.map(r=>({release:r, start_date:sampleStart()})), releases: rel, records: sampleOn(date)}; }
  if (c.role === 'family') return {state:'ready', records:[], schedule:[], releases:[]};   // families get the published report instead
  const k = c.center.id+'|'+room+'|'+date, x = S.day[k];
  if (peek) return x || {state:'loading', records:[]};       // labels and snapshots: use what is loaded, never start a request
  if (!x || (!x.busy && Date.now() - x.at > TTL)) {
    S.day[k] = Object.assign({}, x || {state:'loading', records:[]}, {busy:true, at:Date.now()});
    window.FFHub.client().rpc('program_day', {p_center:c.center.id, p_room:room, p_date:date}).then(r => {
      S.day[k] = r.error ? {state:'error', error:r.error.message, at:Date.now()} : Object.assign({state:'ready', at:Date.now()}, r.data, {records:(r.data.records||[]).slice().sort(byBlock)});
      rerender();
    }).catch(e => { S.day[k] = {state:'error', error:String(e && e.message || e), at:Date.now()}; rerender(); });
  }
  return S.day[k];
}
// lesson calendar: {date: [{id,version,block,theme,character}]} for the weekdays in [from, to]
function month(c, room, from, to){
  if (!hubOn(c)) { const out = {}; for (let d = fromIso(from); d <= fromIso(to); d.setDate(d.getDate()+1)) { const s = iso(d), rs = sampleOn(s);
      if (rs.length) out[s] = rs.map(x => ({id:x.id, version:x.version, block:x.block, theme:x.record.theme, character:x.record.character})); } return out; }
  if (c.role === 'family') return {};
  const k = c.center.id+'|'+room+'|'+from+'|'+to, x = S.cal[k];
  if (!x || (!x.busy && Date.now() - x.at > TTL)) {
    S.cal[k] = Object.assign({}, x || {map:{}}, {busy:true, at:Date.now()});
    window.FFHub.client().rpc('program_calendar', {p_center:c.center.id, p_room:room, p_from:from, p_to:to}).then(r => {
      const map = {}; (r.data || []).forEach(d => { map[d.date] = (d.records || []).slice().sort(byBlock); });
      S.cal[k] = {map, at:Date.now(), error: r.error ? r.error.message : null}; rerender();
    }).catch(() => { S.cal[k] = {map:{}, at:Date.now()}; });
  }
  return S.cal[k].map;
}
// kitchen (data only, for the meal-service view): [{room, room_name, id, version, block, theme, character, kitchen_prompt}]
function kitchen(c, date){
  if (!hubOn(c)) { return Object.entries(c.rooms || {}).flatMap(([room, r]) => sampleOn(date).filter(x => x.record.kitchen_prompt)
      .map(x => ({room, room_name:r.name, id:x.id, version:x.version, block:x.block, theme:x.record.theme, character:x.record.character, kitchen_prompt:x.record.kitchen_prompt}))); }
  const k = c.center.id+'|'+date, x = S.kit[k];
  if (!x || (!x.busy && Date.now() - x.at > TTL)) {
    S.kit[k] = Object.assign({}, x || {list:[]}, {busy:true, at:Date.now()});
    window.FFHub.client().rpc('program_kitchen_prompts', {p_center:c.center.id, p_date:date}).then(r => { S.kit[k] = {list:r.data || [], at:Date.now()}; rerender(); })
      .catch(() => { S.kit[k] = {list:[], at:Date.now()}; });
  }
  return S.kit[k].list;
}
async function schedule(c, room, release, start){
  const r = await window.FFHub.client().rpc('program_schedule_set', {p_center:c.center.id, p_room:room, p_release:release, p_start:start || null});
  if (r.error) throw r.error;
  S.day = {}; S.cal = {}; S.kit = {}; return r.data;
}
function refresh(){ S.day = {}; S.cal = {}; S.kit = {}; }
// the day's theme and lead friend (first record in block order), for the checklist, the calendar and the room's lesson line
function summary(info){
  const x = info && info.records && info.records[0]; if (!x) return null; const r = x.record || {};
  return {theme:r.theme, lead:r.character, leadName:NAMES[r.character]||'', pillars:r.pillars||[], objective:r.objective, release:x.release, week:x.week, day:x.day};
}

// ---------------------------------------------------------------- drawing
const list = (a, empty) => (a && a.length) ? `<ul class="pg-ul">${a.map(x=>`<li>${E(x)}</li>`).join('')}</ul>` : `<p class="mini muted">${E(empty)}</p>`;
// one record: the plan, the adaptations for the age bands in the room (a missing band says so), media with their real status,
// the optional kitchen and family parts, and the participation log (children marked here only; nothing is assumed).
function card(x, o){
  const r = x.record || {}, bands = o.bands || [], kids = o.kids || [], logged = kids.filter(k=>k.took===true||k.took===false).length;
  const took = kids.filter(k=>k.took===true).length, notTook = kids.filter(k=>k.took===false).length, here = kids.filter(k=>k.present);
  const unknown = kids.length - logged;
  const ad = r.age_adaptations || {};
  const adapt = bands.length ? bands.map(b => ad[b] ? `<li><b>${E(BAND_LABEL[b]||b)}:</b> ${E(ad[b])}</li>` : `<li class="muted"><b>${E(BAND_LABEL[b]||b)}:</b> No ${E((BAND_LABEL[b]||b).toLowerCase())} adaptation in this record yet.</li>`).join('') : '';
  const media = (r.media||[]).map(m => { const s = STATUS_CHIP[m.status] || ['warn', m.status]; return `<li>${E(MEDIA_LABEL[m.type]||m.type)}: <code>${E(m.ref)}</code> <span class="chip ${s[0]}">${E(s[1])}</span></li>`; }).join('');
  const hc = r.home_continuation;
  const draft = o.draft || {};
  // E4: three explicit states per child; nothing is pre-selected as taking part. "Not recorded" is the starting state.
  const box = (k) => { const v = typeof draft[k.id] === 'boolean' ? draft[k.id] : k.took, nm = `pg-${x.id}-${k.id}`, dis = o.canWrite ? '' : 'disabled';
    const opt = (val, label, on) => `<label class="pg-opt"><input type="radio" name="${E(nm)}" value="${val}" data-prog-kid="${E(k.id)}" data-prog-rec="${E(x.id)}" ${on?'checked':''} ${dis}> ${label}</label>`;
    const log = k.log ? `<span class="mini">Recorded: ${k.took ? 'took part' : 'not this time'} · ${E(k.log.by)}${k.log.at ? ' · ' + E(new Date(k.log.at).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})) : ''} · version ${E(k.log.v)}${k.log.via === 'group' ? ' · "everyone here" action' : ''}</span>` : '<span class="mini">Not recorded</span>';
    return `<fieldset class="pg-kid"><legend>${E(k.name)}</legend><span class="pg-opts">${opt('yes','Took part',v===true)}${opt('no','Not this time',v===false)}${opt('','Not recorded',v!==true&&v!==false)}</span>${log}</fieldset>`; };
  const plan = o.confirm ? (() => { const yes = [], ex = [], al = [];
    here.forEach(k => { const no = draft[k.id] === false || (draft[k.id] !== true && k.took === false); if (no) ex.push(k.name); else if (k.took === true && draft[k.id] !== true) al.push(k.name); else yes.push(k.name); });
    return {yes, ex, al}; })() : null;
  const confirmBox = plan ? `<div class="pg-confirm" role="group" aria-label="Confirm everyone here took part">
     <p class="small" style="margin:0"><b>Everyone here took part?</b> This records "took part" for ${plan.yes.length ? E(plan.yes.join(', ')) : 'nobody new'}${plan.yes.length ? ` (${plan.yes.length})` : ''}, by you, now, against record version ${E(x.version)}.</p>
     <p class="small" style="margin:0"><b>Exceptions (not this time):</b> ${plan.ex.length ? E(plan.ex.join(', ')) : 'none. Mark "Not this time" above for anyone who did not join, before you confirm.'}</p>
     ${plan.al.length ? `<p class="mini" style="margin:0">Already recorded as taking part: ${E(plan.al.join(', '))}.</p>` : ''}
     <p class="mini" style="margin:0">Children not marked here today are never included.</p>
     <span style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn navy" data-prog-all-ok="${E(x.id)}" data-prog-v="${E(x.version)}">Confirm: ${plan.yes.length} took part</button><button class="btn soft" data-prog-all-cancel="${E(x.id)}">Cancel</button></span></div>` : '';
  return `<article class="card pg-card" style="border-top:5px solid var(--${E(r.character)})" aria-label="${E(blockName(x.block))}: ${E(r.theme)}">
   <div class="pg-head"><img src="${FFcut(r.character)}" alt="" style="width:44px;border-radius:8px"><div style="min-width:0"><span class="small muted">${E(blockName(x.block))} · ${r.duration_min_estimate ? `about ${E(r.duration_min_estimate)} min` : 'time not estimated'} · ${E(NAMES[r.character]||'')} (${E((r.pillars||[]).join(' + '))})</span><h3 style="margin:0">${E(r.theme)}</h3></div></div>
   <p class="small" style="margin:0"><b>Objective:</b> ${E(r.objective)}</p>
   ${bands.length?`<div><h4 class="pg-h">For the ages in this room</h4><ul class="pg-ul">${adapt}</ul></div>`:''}
   <div class="pg-cols"><div><h4 class="pg-h">Materials</h4>${list(r.materials,'No materials listed.')}</div><div><h4 class="pg-h">Say or ask</h4>${list(r.prompts,'No prompts listed.')}</div></div>
   ${window.FFTeach ? window.FFTeach.support(r) : ''}
   ${media?`<div><h4 class="pg-h">Printables and media</h4><ul class="pg-ul">${media}</ul></div>`:''}
   ${r.kitchen_prompt?`<p class="small pg-note"><b>Kitchen learning prompt (optional talk at the table, never a serving or care instruction):</b> ${E(r.kitchen_prompt)}</p>`:''}
   ${hc&&hc.title?`<p class="small pg-note"><b>Family continuation:</b> "${E(hc.title)}". Offered only to families of children you log as taking part.</p>`:''}
   <div class="pg-log"><div class="pg-head" style="justify-content:space-between;flex-wrap:wrap"><h4 class="pg-h" style="margin:0">Who took part</h4><span class="mini">${took} took part · ${notTook} not this time · ${unknown} not recorded</span></div>
    ${here.length?`<div class="pg-kids" role="group" aria-label="Children marked here today">${here.map(box).join('')}</div>
     ${o.canWrite?`<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><button class="btn navy" data-prog-save="${E(x.id)}" data-prog-v="${E(x.version)}">Save these choices</button><button class="btn soft" data-prog-all="${E(x.id)}" ${plan?'aria-expanded="true"':'aria-expanded="false"'}>Everyone here took part&hellip;</button><span class="mini">Only children you mark are saved; everyone else stays "Not recorded". Families hear "took part" only for a child recorded as taking part.</span></div>${confirmBox}`:''}`
     :'<p class="small muted">Mark who is here first. Participation is logged only for children marked here.</p>'}
    ${kids.length>here.length?`<p class="mini muted">${kids.length-here.length} not marked here today: not included.</p>`:''}</div>
   <p class="mini muted" style="margin:0">Record ${E(x.id)} · version ${E(x.version)} · approved${o.sample?' · sample schedule in this browser':''}</p></article>`;
}
function css(){ if (document.getElementById('ff-program-css')) return; const s = document.createElement('style'); s.id = 'ff-program-css'; s.textContent = `
.pg-card{display:grid;gap:10px}
.pg-head{display:flex;gap:10px;align-items:center;min-width:0}
.pg-h{font-size:14px;margin:0 0 4px}
.pg-ul{margin:0;padding-left:18px;display:grid;gap:3px;font-size:14px}
.pg-cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:10px}
.pg-note{border-left:4px solid var(--gold);background:var(--paper2);padding:6px 10px;border-radius:8px;margin:0}
.pg-log{display:grid;gap:8px;border-top:1px solid var(--line);padding-top:10px}
.pg-kids{display:grid;gap:6px}
.pg-kid{display:grid;gap:2px;border:1px solid var(--line);border-radius:10px;padding:6px 10px;margin:0;min-width:0}
.pg-kid legend{font-weight:600;font-size:14px;padding:0 4px}
.pg-opts{display:flex;flex-wrap:wrap;gap:4px 14px}
.pg-opt{display:inline-flex;gap:6px;align-items:center;font-size:14px;min-height:32px}
.pg-opt input{width:18px;height:18px;accent-color:var(--zuri)}
.pg-confirm{display:grid;gap:6px;border:2px solid var(--gold);border-radius:10px;padding:10px;background:var(--paper2)}
.pg-card code{font-size:12px;overflow-wrap:anywhere}
`; document.head.appendChild(s); }

window.FFProgram = {day, month, kitchen, schedule, refresh, summary, card, css, slot, sampleStart, names:NAMES, blockName};
})();
