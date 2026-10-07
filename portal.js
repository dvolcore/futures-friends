/* Futures Hub portals inside the website: teacher day checklist, lesson calendar, lunch planning (planned or custom),
   per-child meals/nap/notes, family daily report and director accountability. Saves to the artifact's shared db when
   available; otherwise runs as a local demo. */
(function(){
const P = {db:null, user:null, me:null, canWrite:true, live:false, rooms:{}, kids:{}, days:{}, kd:{}, names:{},
  room:null, date:null, tab:'today', fam:{kid:null,date:null}, unsubDays:null, unsubKd:null, kdDate:null, hub:false, role:null, email:null, center:null};
const pad = n => String(n).padStart(2,'0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const fromIso = s => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); };
const todayIso = () => { const d=new Date(); const w=d.getDay(); if(w===6) d.setDate(d.getDate()+2); if(w===0) d.setDate(d.getDate()+1); return iso(d); };
const fmtDate = s => fromIso(s).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
const shortDate = s => fromIso(s).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
const dayKey = (room,date) => `${room}_${date}`;
const kdKey = (kid,date) => `${kid}_${date}`;
P.date = todayIso();

// ---------------- lesson + menu for a date (from the program library data)
function lessonFor(date){
  const d = fromIso(date), unitN = ((d.getMonth()-8+12)%12)+1, wk = Math.min(4, Math.floor((d.getDate()-1)/7)+1), di = d.getDay()-1;
  const u = D.units.find(x=>x.n===unitN) || D.units[0]; const w = u.weeks[wk-1] || u.weeks[0]; const sk = (u.skills||[])[wk-1] || [];
  const eps = String(w[3]||'').split(';').map(s=>s.trim()).filter(Boolean);
  const domains = ['Literacy','Math and science','Social-emotional','Physical and nutrition','Creative arts'];
  return {unit:u, wk, w, di, lead: charOf(w[2]), theme:w[1], leadTxt:w[2], book:w[4], take:w[5],
    episode: di===4 ? null : (eps[di%2]||eps[0]||''), focusDomain: domains[di]||domains[0], focus: sk[di+1]||'', friday: di===4};
}
function menuFor(level, date){ const l = lessonFor(date); return ((D.menus[String(level)]||{})[String(l.wk)]||[])[l.di] || null; }
// ---------------- the approved daily-program record for a room and date (program-record.js). It replaces the curriculum outline
// above wherever a record exists; days without one keep the outline. peek: use what is loaded, never start a hub request.
function progFor(room, date, peek){ return window.FFProgram && room ? window.FFProgram.day(rhythmCtx(), room, date, peek) : {state:'ready', records:[]}; }
function progSum(room, date, peek){ const i = progFor(room, date, peek); return i && i.state==='ready' && window.FFProgram ? window.FFProgram.summary(i) : null; }
const relName = r => String(r||'').replace(/^unit-(\d+)$/,'Unit $1').replace(/-/g,' ');

// ---------------- checklist template
function checklist(date, room){
  const L = lessonFor(date), ps = progSum(room || P.room, date, true), theme = ps ? ps.theme : L.theme;
  const items = [
    ['arrive','Arrival, health check and sign-in','7:00'],
    ['breakfast','Handwashing and breakfast served','8:00'],
    ['circle',`Morning circle: ${theme}`,'8:45'],
    L.friday ? ['screenfree','Screen-free Friday: Friends Live puppet circle','9:00'] : ['episode',`Watch together: "${L.episode}" (6 min or less)`,'9:00'],
    ['talk','Talk: discussion questions asked','9:10'],
    ['activity',`Connected activity: ${L.focusDomain.toLowerCase()} focus`,'9:20'],
    ['zones','Learning zones open: Booker, Lumi, Zuri and Bop','9:45'],
    ['outdoor','Outdoor and movement time','10:45'],
    ['lunch','Lunch served family style and intake recorded','11:30'],
    ['rest','Rest time','12:30'],
    ['readaloud',`Read-aloud: ${String(L.book).split(';')[0]}`,'2:30'],
    ['snack','PM snack served','3:00'],
    ['takehome',`Take-home sent: ${L.take}`,'4:00'],
    ['cleanup','Clean-up with Bop and closing reflection','5:00'],
    ['familynotes', P.hub ? 'Family reports checked (the hub sends them at about 5:30 pm)' : 'Daily notes sent to families','5:30']];
  return items;
}

// ---------------- data access
const dayDoc = (room,date) => Object.assign({room, date, checks:{}, lunch:{mode:'planned'}, episode:{min:5}, notes:''}, P.days[dayKey(room,date)]); // hub seed docs may lack checks/lunch
const kdDoc = (kid,date) => P.kd[kdKey(kid,date)] || {kid, date, present:null, meals:{}, nap:'', note:'', star:false};
const roomKids = room => Object.entries(P.kids).filter(([,k])=>k.room===room).sort((a,b)=>a[1].first.localeCompare(b[1].first));
async function put(coll, id, data){
  const clean = JSON.parse(JSON.stringify(data));
  if (coll==='days' && clean.date) { const L=lessonFor(clean.date), ps=progSum(clean.room, clean.date, true); clean.lesson = ps ? {theme:ps.theme, lead:ps.lead, pillar:ps.pillars[0]||'', focus:ps.objective||'', book:'', take:''} : {theme:L.theme, lead:L.lead, pillar:(String(L.leadTxt).split(',')[1]||'').trim(), focus:L.focus, book:L.book, take:L.take}; } // snapshot for the report when a room has no program record (the hub reads a record live: daily_report_build)
  if (coll==='days') P.days[id]=clean; else if (coll==='kidday') P.kd[id]=clean; else if (coll==='rooms') P.rooms[id]=clean; else if (coll==='kids') P.kids[id]=clean;
  if (P.db && P.canWrite) { try { await P.db.collection(coll).doc(id).set(clean); } catch(err){ fail(err); } }
}
async function del(coll, id){
  if (coll==='kids') delete P.kids[id]; if (coll==='rooms') delete P.rooms[id];
  if (P.db && P.canWrite) { try { await P.db.collection(coll).doc(id).delete(); } catch(err){ fail(err); } }
}
function fail(err){ if (err && err.code==='photo_consent'){ toast("This child doesn't have photo consent on file. The photo was not saved."); clearTimeout(toast._t); toast._t=setTimeout(()=>{ $('#toast').hidden=true; },7000); } else if (err && err.code==='invalid_argument'){ P.canWrite=false; toast('You can view this program but not change it.'); render(); } else if (err && err.code==='quota_exceeded') toast('Storage is full.'); else if (P.hub && err && err.code==='42501') toast('You do not have permission to make that change.'); else toast('That change did not save. Try again in a moment.'); }
const stamp = () => ({by: P.me || 'demo', at: Date.now()});
async function names(ids){ ids=[...new Set(ids.filter(x=>x && x!=='demo' && !(x in P.names)))]; if(!ids.length||!P.user) return; try{ const ps=await P.user.profiles(ids); ids.forEach(id=>P.names[id]=ps[id]?.name||'A teacher'); render(); }catch(_){} }
const who = id => id==='demo' ? 'you (demo)' : (id===P.me ? 'you' : (P.names[id]||'a teacher'));
const photoNotice = () => P.live ? 'Family photo view' : 'Sample photos on this browser';

// ---------------- sample program (demo mode or one click to load)
const SAMPLE_ROOMS = {infants:{name:'Infant Room',ages:'Infants (under 12 months)',level:1,order:-1}, toddlers:{name:'Toddler Room',ages:'Toddlers (12 to 23 months)',level:1,order:0}, twos:{name:'Twos Room',ages:'Age 2',level:1,order:1}, threes:{name:'Threes Room',ages:'Age 3',level:1,order:2}, prek:{name:'Pre-K Room',ages:'Ages 4 to 5',level:1,order:3}};
const SAMPLE_KIDS = [['Amara','B','infants'],['Theo','W','infants'],['Rosa','M','toddlers'],['Jalen','D','toddlers'],['Mila','T','toddlers'],['Ava','R','twos'],['Mateo','H','twos'],['Zoe','O','twos'],['Elijah','V','twos'],['Mia','C','threes'],['Noah','J','threes'],['Aria','Q','threes'],['Liam','X','threes'],['Nova','E','threes'],['Jayden','L','prek'],['Ivy','S','prek'],['Kai','Z','prek'],['Luna','G','prek'],['Malik','N','prek']];
async function loadSample(){ for (const [id,r] of Object.entries(SAMPLE_ROOMS)) await put('rooms', id, Object.assign({sample:true}, r));
  for (let i=0;i<SAMPLE_KIDS.length;i++){ const k=SAMPLE_KIDS[i]; await put('kids', 'k'+(i+1), {first:k[0], last:k[1], room:k[2], sample:true}); }
  P.room = 'threes'; render(); toast('Sample classes loaded'); }

// ---------------- UI pieces
const sel = (id, opts, val, attrs='') => `<select class="i" id="${id}" ${attrs} style="padding:7px 9px">${opts.map(o=>{const [v,l]=Array.isArray(o)?o:[o,o];return `<option value="${esc(v)}" ${String(v)===String(val)?'selected':''}>${esc(l)}</option>`}).join('')}</select>`;
const roomPicker = () => { const rs=Object.entries(P.rooms).sort((a,b)=>(a[1].order||9)-(b[1].order||9)); return rs.length ? sel('pRoom', rs.map(([id,r])=>[id,r.name]), P.room) : ''; };
const pct = (a,b) => b ? Math.round(a/b*100) : 0;
function completion(room,date){ const d=dayDoc(room,date), items=checklist(date, room); const done=items.filter(i=>(d.checks||{})[i[0]]).length; return {done, total:items.length, p:pct(done,items.length)}; }
function lunchText(room,date){ const r=P.rooms[room]; const d=dayDoc(room,date); if(d.lunch.mode==='custom'){ const c=d.lunch.custom||{}; return [c.dish,c.protein,c.grain,c.veg,c.fruit,c.milk].filter(Boolean).join(', '); } const m=menuFor(r?.level||1, date); return m? m[2].replace(/\s*\([EMN]\d+\)/g,'') + ', milk' : 'No menu for this day'; }
// All five CACFP lunch components are LISTED (milk, meat or alternate, vegetable, fruit or a second vegetable, grain). This checks the
// list only: portions by age, crediting, whole grain-rich for the day and milk type by age are the kitchen's job and are not checked here.
function cacfpOk(c){ return !!(c && c.protein && c.grain && c.veg && c.fruit && c.milk); }
const youngRoom = room => ['infant','toddler'].includes(ONE_BAND_AGES[String((P.rooms[room]||{}).ages||'')]);
function weekDates(date){ const d=fromIso(date); const mon=new Date(d); mon.setDate(d.getDate()-((d.getDay()+6)%7)); return [0,1,2,3,4].map(i=>{const x=new Date(mon); x.setDate(mon.getDate()+i); return iso(x);}); }
function header(title, sub){ return `<div class="phero" style="padding-block:28px"><div class="wrap" style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:end;gap:14px 28px"><div style="display:grid;gap:8px"><div class="eyebrow">Futures Hub</div><h1 style="font-size:clamp(26px,3.6vw,38px)">${title}</h1><p class="lede">${sub}</p></div>
  <div style="display:grid;gap:6px;justify-items:end"><span class="chip ${P.live?'ok':'warn'}" style="background:transparent;color:${P.live?'#7FE0A8':'#F3C969'};border-color:currentColor">${P.live?(P.canWrite?'Live \u00b7 saving to your program':'Live \u00b7 view only'):'Sample local preview \u00b7 changes stay in this browser'}</span>${P.hub?`<span class="small" id="hubWho" style="color:#C6D7DD">Signed in as ${esc(P.email)}${P.center&&P.center.name?' \u00b7 '+esc(P.center.name):''} <button type="button" class="btn soft" style="padding:4px 10px;margin-left:6px" data-hub="signout">Sign out</button></span>`:''}</div></div></div>`; }

// ---------------- TEACHER PORTAL
V.portal = () => {
  if (!Object.keys(P.rooms).length) return header('Teacher Portal','Set up your classrooms to start tracking the day.') + `<section class="band-paper"><div class="wrap"><div class="card" style="max-width:640px"><h3>No classrooms yet</h3><p class="small">Add your first classroom on the Setup tab, or load the sample classes (Twos, Threes and Pre-K with sample children) to try every feature.</p><div style="display:flex;gap:10px;flex-wrap:wrap">${P.canWrite?`<button class="btn gold" data-p="sample">Load sample classes</button><button class="btn soft" data-ptab="setup">Set up classrooms</button>`:'<span class="small muted">Ask your director to add classrooms.</span>'}${window.FFUnit1?'<button class="btn soft" data-ptab="curriculum">Curriculum</button>':''}</div></div>${P.tab==='setup'?setupView():''}${P.tab==='curriculum'&&window.FFUnit1?`<div style="margin-top:16px">${window.FFUnit1.portalView()}</div>`:''}</div></section>`;
  if (!P.room || !P.rooms[P.room]) P.room = Object.entries(P.rooms).sort((a,b)=>(a[1].order||9)-(b[1].order||9))[0][0];
  const tabs = [['today','Today'],['calendar','Lesson calendar'],['curriculum','Curriculum'],['lunch','Lunch planner'],['children','Children'],['progress','Progress'],['messages','Messages'+(teacherUnread(P.room)?` <span class="p2-dot" aria-label="${teacherUnread(P.room)} unread"></span>`:'')],['account','Accountability'],['setup','Setup']];
  if (window.FFRhythm && P.hub) { tabs.splice(1,0,['rhythm','Daily Rhythm']); if (P.role==='director') tabs.splice(2,0,['rweek','Rhythm dashboard']); } // Whole-Child Daily Rhythm (daily-rhythm.js), hub mode only
  if (window.FFDue && P.hub) window.FFDue.addTabs(tabs, P.role); // What's due (director) and Safety logs (director-due.js), hub mode only
  if (window.FFArrival && P.hub) window.FFArrival.addTabs(tabs, P.role); // Arrivals: sign-in / sign-out, pickup lists, kiosk (arrival.js), hub mode only
  if (window.FFReport && P.hub) tabs.splice(tabs.findIndex(t=>t[0]==='messages')+1,0,['reports','Family reports']); // evening daily report preview (family-report.js), hub mode only
  if (window.FFHistory && P.hub) window.FFHistory.addTabs(tabs, P.role); // Edit history (care-history.js): director only, hub mode only
  return header('Teacher Portal', `${P.rooms[P.room].name} \u00b7 ${fmtDate(P.date)}`) + `
  <section class="band-paper" style="padding-block:22px 60px"><div class="wrap" style="display:grid;gap:16px">
   <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:end">
    <label class="f" for="pRoom">Classroom${roomPicker()}</label>
    <label class="f" for="pDate">Date<input class="i" type="date" id="pDate" value="${P.date}" style="padding:7px 9px"></label>
    <div class="seg" role="group" aria-label="Portal sections" style="margin-left:auto">${tabs.map(t=>`<button data-ptab="${t[0]}" aria-pressed="${P.tab===t[0]}">${t[1]}</button>`).join('')}</div></div>
   ${({today:todayView, calendar:calendarView, lunch:lunchView, children:childrenView, progress:progressView, messages:messagesView, account:accountView, setup:setupView, rhythm:()=>window.FFRhythm.teacherView(rhythmCtx()), rweek:()=>window.FFRhythm.rweekView(rhythmCtx()), due:()=>window.FFDue.dueView(rhythmCtx()), safety:()=>window.FFDue.safetyView(rhythmCtx()), reports:()=>window.FFReport.teacherView(rhythmCtx()), arrivals:()=>window.FFArrival.view(rhythmCtx()), history:()=>window.FFHistory.view(rhythmCtx()), curriculum:()=>window.FFUnit1?window.FFUnit1.portalView():''}[P.tab] || todayView)()}
  </div></section>`;
};

function todayView(){
  const L = lessonFor(P.date), d = dayDoc(P.room,P.date), c = completion(P.room,P.date), wd = fromIso(P.date).getDay();
  const noScreen = !!(P.hub && window.FFRhythm && window.FFRhythm.screensBlocked(P.room)) || (!P.hub && ['infant','toddler'].includes(bandOfRoom(P.room))); // infants, under-2 rooms, or ages not set: no episodes
  if (wd===0||wd===6) return `<div class="card"><h3>No program on weekends</h3><p class="small">Pick a weekday to see the checklist.</p></div>`;
  const pi = progFor(P.room, P.date), ps = progSum(P.room, P.date, true);
  const items = checklist(P.date).map(it => (noScreen && it[0]==='episode') ? ['episode','Song, puppet or card version (no screen in this room)',it[2]] : it);
  const kids = roomKids(P.room); const present = kids.filter(([id])=>kdDoc(id,P.date).present===true).length;
  return `<div class="grid" style="grid-template-columns:1.25fr 1fr;gap:16px;align-items:start">
   <div style="display:grid;gap:16px">
    ${ps ? programTop(pi, ps) : `<div class="card" style="border-top:5px solid var(--${L.lead})"><div style="display:flex;gap:12px;align-items:center"><img src="${FFcut(L.lead)}" alt="" style="width:54px;border-radius:8px"><div><span class="small muted">Unit ${L.unit.n} \u00b7 ${esc(L.unit.title)} \u00b7 Week ${L.wk} \u00b7 curriculum outline</span><h3>${esc(L.theme)}</h3><span class="small" style="color:var(--${L.lead});font-weight:600">${esc(L.leadTxt)}</span></div></div>
     <div class="grid g2" style="gap:8px"><span class="small"><b>Today's focus (${L.focusDomain}):</b> ${esc(L.focus)}</span><span class="small"><b>${L.friday?'Screen-free Friday':'Episode'}:</b> ${L.friday?'No episode today':esc(L.episode)}</span><span class="small"><b>Books:</b> ${esc(L.book)}</span><span class="small"><b>Take-home:</b> ${esc(L.take)}</span></div>${programNote(pi)}</div>`}
    <div class="card"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap"><h3>Today's checklist</h3><span class="chip ${c.p===100?'ok':(c.p?'warn':'')}">${c.done} of ${c.total} done \u00b7 ${c.p}%</span></div>
     <div class="meter"><i style="width:${c.p}%"></i></div>
     <div style="display:grid;gap:2px">${items.map(it=>{const ch=d.checks[it[0]];return `<label class="chk2" style="display:grid;grid-template-columns:auto 52px 1fr auto;gap:10px;align-items:center;padding:9px 6px;border-bottom:1px solid var(--line)"><input type="checkbox" data-check="${it[0]}" ${ch?'checked':''} ${P.canWrite?'':'disabled'} style="width:20px;height:20px;accent-color:var(--zuri)"><span class="small muted">${it[2]}</span><span style="${ch?'color:var(--muted);text-decoration:line-through':''}">${esc(it[1])}</span><span class="mini">${ch?`${who(ch.by)} \u00b7 ${new Date(ch.at).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}`:''}</span></label>`;}).join('')}</div>
     ${(L.friday||noScreen)?'':`<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><label class="f" for="epMin" style="display:flex;gap:8px;align-items:center">Minutes watched<input class="i" type="number" min="0" max="6" id="epMin" value="${d.episode?.min ?? 5}" style="width:80px;padding:6px" ${P.canWrite?'':'disabled'}></label><span class="mini">This week: ${weekScreen(P.room,P.date)} of 30 minutes</span></div>`}
     <label class="f" for="dayNotes">Notes for families (whole class)<textarea class="i" id="dayNotes" ${P.canWrite?'':'disabled'} placeholder="What the class did, a highlight, a reminder">${esc(d.notes||'')}</textarea></label></div>
   </div>
   <div style="display:grid;gap:16px">
    <div class="card"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><h3>Today's lunch</h3><span class="chip ${d.lunch.mode==='custom'?'warn':'ok'}">${d.lunch.mode==='custom'?'Custom':'Planned menu'}</span></div><p class="small">${esc(lunchText(P.room,P.date))}</p><button class="btn soft" data-ptab="lunch">Change or customize lunch</button></div>
    <div class="card"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><h3>Children today</h3><span class="chip">${present} of ${kids.length} here</span></div>
     ${kids.length?`<div style="display:grid;gap:6px">${kids.map(([id,k])=>{const x=kdDoc(id,P.date), ar=P.hub && window.FFArrival && P.date===todayIso() ? window.FFArrival.todayBits(id, P.canWrite) : null;return `<div style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid var(--line)"><span><b>${esc(k.first)} ${esc(k.last||'')}.</b> <span class="mini">${x.present===true?'Here':(x.present===false?'Absent':'Not marked')}${x.meals?.lunch?' \u00b7 lunch: '+x.meals.lunch:''}${x.star?' \u00b7 \u2605 star':''}</span>${ar?` <span class="mini arr-today">${esc(ar.status)}</span>`:''}</span><span style="display:flex;gap:4px;flex-wrap:wrap;justify-content:end">${ar?ar.button:''}<button class="btn soft" style="padding:5px 10px" data-att="${id}" data-v="1" ${P.canWrite?'':'disabled'}>Here</button><button class="btn soft" style="padding:5px 10px" data-att="${id}" data-v="0" ${P.canWrite?'':'disabled'}>Absent</button></span></div>`;}).join('')}</div><button class="btn navy" data-ptab="children">Record meals, rest and notes</button>`:'<p class="small muted">No children in this classroom yet. Add them on the Children tab.</p>'}</div>
   </div></div>`;
}
// ---- Today: the day's approved program records, each with its participation log (program-record.js draws a record)
// E4 (ETEACH): participation is unknown until a teacher records it. A child nobody marked stays "Not recorded"; a save writes only the
// children the teacher chose; the one bulk action ("Everyone here took part") is a deliberate two-step choice with its exceptions shown,
// and every entry keeps who recorded it, when, which record version and how (each child, or the group action).
const PG = {draft:{}, confirm:{}};
function progKids(room, date, rid){ return roomKids(room).map(([id,k])=>{ const x=kdDoc(id,date), p=(x.program||{})[rid];
  return {id, name:`${k.first} ${k.last?k.last+'.':''}`.trim(), present:x.present===true, took: p && typeof p.took_part==='boolean' ? p.took_part : null,
    log: p && typeof p.took_part==='boolean' ? {by:who(p.by), at:p.at, v:p.v, via:p.via||'each'} : null}; }); }
function roomBands(room){ const b=new Set(roomKids(room).map(([id])=>bandOf(id))); if(!b.size) b.add(bandOfRoom(room)); return FS.bands.map(x=>x.key).filter(k=>b.has(k)); }
function programTop(pi, ps){
  window.FFProgram.css(); const bands = roomBands(P.room);
  return `<div class="card" style="border-top:5px solid var(--${esc(ps.lead)})"><div style="display:flex;gap:12px;align-items:center"><img src="${FFcut(ps.lead)}" alt="" style="width:54px;border-radius:8px"><div><span class="small muted">${esc(relName(ps.release))} \u00b7 Week ${ps.week} \u00b7 Day ${ps.day}${pi.sample?' \u00b7 sample schedule':''}</span><h3>${esc(ps.theme)}</h3><span class="small" style="color:var(--${esc(ps.lead)});font-weight:600">${esc(ps.leadName)} \u00b7 ${esc(ps.pillars.join(' + '))}</span></div></div>
   <span class="small">${pi.records.length} ${pi.records.length===1?'activity':'activities'} from the approved daily program. Log who took part in each: families hear only what you log, never that everyone did the plan.</span></div>
   ${window.FFTeach ? window.FFTeach.timing(`${P.room}|${ps.release}|w${ps.week}d${ps.day}`, pi.records.map(x=>({id:x.id, label:window.FFProgram.blockName(x.block), min:x.record.duration_min_estimate}))) : ''}
   ${window.FFPrepAhead ? window.FFPrepAhead.today(pi) : ''}
   ${pi.records.map(x=>window.FFProgram.card(x, {bands, kids:progKids(P.room,P.date,x.id), canWrite:P.canWrite, draft:PG.draft[x.id], confirm:!!PG.confirm[x.id], sample:!!pi.sample})).join('')}`;
}
// no record for this room today: say so (and why), instead of presenting the outline as the approved program
function programNote(pi){
  if (!window.FFProgram) return '';
  const rel = (pi.releases||[])[0], sch = (pi.schedule||[])[0];
  let t;
  if (pi.state==='loading') t = 'Checking the daily program for this room\u2026';
  else if (pi.state==='error') t = 'The daily program is not available right now. This is the curriculum outline.';
  else if (!rel) t = 'No approved daily-program records are released yet. This is the curriculum outline, not an approved activity record.';
  else if (!sch) return `<div class="pg-note small" style="display:grid;gap:6px"><span>${esc(relName(rel))} is approved but not scheduled in this room. This is the curriculum outline.</span>${P.canWrite&&P.hub?`<span style="display:flex;gap:8px;flex-wrap:wrap;align-items:end"><label class="f" for="pgStart">Start ${esc(relName(rel))} on (a Monday)<input class="i" type="date" id="pgStart" style="padding:6px 8px"></label><button class="btn soft" data-prog-sched="${esc(rel)}">Schedule</button></span>`:''}</div>`;
  else t = `No approved daily-program record for this day (${esc(relName(sch.release))} started ${shortDate(sch.start_date)}${pi.sample?', sample schedule':''}). This is the curriculum outline.`;
  return `<p class="mini muted" style="margin:0">${t}</p>`;
}
// one entry on one child's day: took_part is always an explicit true/false chosen by a teacher, with who, when, the record version and how
async function logProgram(id, rid, took, v, via){
  const x = kdDoc(id,P.date), prev = (x.program||{})[rid];
  if (prev && prev.took_part===took && prev.v===v) return false;
  x.program = Object.assign({}, x.program, {[rid]: Object.assign({took_part:took, v, via}, stamp())}); await put('kidday', kdKey(id,P.date), x); return true;
}
// "Save these choices": only the children the teacher marked; nobody else is touched (they stay "Not recorded")
async function saveProgram(rid, v){
  const d = PG.draft[rid] || {}; let yes = 0, no = 0;
  for (const [id] of roomKids(P.room)) { if (kdDoc(id,P.date).present!==true || typeof d[id]!=='boolean') continue;
    if (await logProgram(id, rid, d[id], v, 'each')) { if (d[id]) yes++; else no++; } }
  delete PG.draft[rid]; delete PG.confirm[rid];
  toast(yes||no ? `Saved: ${yes} took part, ${no} not this time` : 'Nothing to save yet: mark "Took part" or "Not this time" for a child first');
}
// "Everyone here took part" (after the confirm step): every child marked here, except the listed exceptions ("Not this time", chosen now or
// already recorded), is recorded as taking part. Children not marked here are never included.
function bulkPlan(rid){
  const d = PG.draft[rid] || {}, yes = [], except = [], already = [];
  for (const [id,k] of roomKids(P.room)) { const x = kdDoc(id,P.date); if (x.present!==true) continue;
    const prev = (x.program||{})[rid], name = `${k.first} ${k.last?k.last+'.':''}`.trim();
    const no = d[id]===false || (d[id]!==true && prev && prev.took_part===false);
    if (no) except.push({id, name}); else if (prev && prev.took_part===true && d[id]!==true) already.push({id, name}); else yes.push({id, name}); }
  return {yes, except, already};
}
async function saveProgramAll(rid, v){
  const plan = bulkPlan(rid); let n = 0;
  for (const k of plan.yes) if (await logProgram(k.id, rid, true, v, 'group')) n++;
  for (const k of plan.except) if ((PG.draft[rid]||{})[k.id]===false) await logProgram(k.id, rid, false, v, 'each');
  delete PG.draft[rid]; delete PG.confirm[rid];
  toast(`Saved: ${n} took part (everyone here)${plan.except.length?`, ${plan.except.length} not this time`:''}`);
}
function weekScreen(room,date){ return weekDates(date).reduce((a,dt)=>{const d=P.days[dayKey(room,dt)]; return a + (d && d.checks && d.checks.episode ? (+(d.episode?.min ?? 5)||0) : 0);},0); }

function calendarView(){
  const d = fromIso(P.date), y=d.getFullYear(), m=d.getMonth(), first=new Date(y,m,1), start=(first.getDay()+6)%7, days=new Date(y,m+1,0).getDate();
  const cells=[]; for(let i=0;i<start;i++) cells.push(null); for(let i=1;i<=days;i++) cells.push(new Date(y,m,i));
  const L0 = lessonFor(iso(new Date(y,m,Math.min(days,8))));
  const pm = window.FFProgram ? window.FFProgram.month(rhythmCtx(), P.room, iso(first), iso(new Date(y,m,days))) : {};
  return `<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><div><span class="small muted">Unit ${L0.unit.n}</span><h3>${first.toLocaleDateString('en-US',{month:'long',year:'numeric'})} \u00b7 ${esc(L0.unit.title)}</h3></div>
   <div style="display:flex;gap:6px"><button class="btn soft" data-mon="-1">Previous month</button><button class="btn soft" data-mon="1">Next month</button></div></div>
   <div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px">${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(x=>`<div class="mini" style="text-align:center;font-weight:600">${x}</div>`).join('')}
   ${cells.map(c=>{ if(!c) return '<div></div>'; const s=iso(c), wd=c.getDay(); if(wd===0||wd===6) return `<div style="min-height:86px;border-radius:10px;background:var(--paper2);padding:6px" class="mini">${c.getDate()}</div>`;
     const L=lessonFor(s), cp=completion(P.room,s), sel=s===P.date, pr=pm[s]||[]; return `<button data-day="${s}" style="all:unset;cursor:pointer;min-height:86px;border-radius:10px;border:${sel?'2px solid var(--gold)':'1px solid var(--line)'};border-top:4px solid var(--${pr.length?esc(pr[0].character):L.lead});padding:6px;display:grid;gap:2px;align-content:start;background:var(--paper)"><b style="font-size:13px">${c.getDate()}</b><span class="mini" style="line-height:1.25">${pr.length?`${esc(pr[0].theme)}${pr.length>1?` \u00b7 ${pr.length} activities`:''}`:esc(L.friday?'Screen-free Friday':L.episode)}</span>${cp.done?`<span class="mini" style="color:${cp.p===100?'var(--ok)':'var(--warn)'};font-weight:600">${cp.p}% done</span>`:''}</button>`; }).join('')}</div>
   <p class="note">A day with an approved daily-program record shows its theme, and the colored edge is its lead friend. Other days show the curriculum outline's episode or Friday plan. Tap a day to open its checklist.</p></div>`;
}

const OPT = {protein:['','Chicken','Turkey','Beef','Fish','Beans or lentils','Eggs','Cheese','Yogurt','Other'], grain:['','Whole-grain pasta','Brown rice','Whole-wheat bread or roll','Whole-wheat tortilla','Whole-grain crackers','Other'], veg:['','Broccoli','Green beans','Carrots, cooked soft','Peas','Corn','Sweet potato','Spinach','Cucumber, thin slices','Other'], fruit:['','Mandarin oranges','Apples, cooked soft for under 4','Bananas','Strawberries, diced','Pears','Pineapple','Grapes, quartered lengthwise','Other'], milk:['','1% unflavored milk (ages 2 to 5)','Fat-free unflavored milk (ages 2 to 5)','Whole unflavored milk (age 1)']};
function lunchView(){
  const r = P.rooms[P.room], dates = weekDates(P.date);
  const d = dayDoc(P.room,P.date), c = d.lunch.custom||{}, m = menuFor(r.level||1, P.date);
  return (window.FFMeals ? window.FFMeals.lunchCards(rhythmCtx()) : '') + `<div class="grid" style="grid-template-columns:1fr 1fr;gap:16px;align-items:start">
  <div class="card"><h3>Week of ${shortDate(dates[0])}</h3><div class="tw"><table><tr><th>Day</th><th>Lunch</th><th>Type</th></tr>${dates.map(dt=>{const dd=dayDoc(P.room,dt);return `<tr><td><button class="rl" data-day="${dt}" data-keep="1">${shortDate(dt)}</button></td><td class="small">${esc(lunchText(P.room,dt))}</td><td><span class="chip ${dd.lunch.mode==='custom'?'warn':'ok'}">${dd.lunch.mode==='custom'?'Custom':'Planned'}</span></td></tr>`}).join('')}</table></div>
   <label class="f" for="pLevel">Menu level for ${esc(r.name)}${sel('pLevel',[[1,'Level 1 \u00b7 Easy & Quick'],[2,'Level 2 \u00b7 Medium'],[3,'Level 3 \u00b7 Next Level']], r.level||1, P.canWrite?'':'disabled')}</label></div>
  <div class="card"><h3>${fmtDate(P.date)}</h3>
   <div class="seg" role="group" aria-label="Lunch type"><button data-lmode="planned" aria-pressed="${d.lunch.mode!=='custom'}">Planned menu</button><button data-lmode="custom" aria-pressed="${d.lunch.mode==='custom'}">Custom lunch</button></div>
   ${d.lunch.mode!=='custom' ? (m?`<div class="tw"><table><tr><th>Breakfast</th><td>${linkR(m[1])}</td></tr><tr><th>Lunch</th><td>${linkR(m[2])}</td></tr><tr><th>PM snack</th><td>${linkR(m[3])}</td></tr></table></div><p class="small muted">From the Eat the Rainbow ${LEVELS[r.level||1]} cycle menu, week ${lessonFor(P.date).wk}. Written for the CACFP lunch pattern for ages 3 to 5; portions and crediting are checked by your kitchen.${youngRoom(P.room)?' This room is younger: age 1 needs unflavored whole milk and smaller portions, and babies under 12 months follow the separate CACFP infant meal pattern.':''}</p>`:'<p class="small muted">No planned menu for this day.</p>') : `
    <label class="f" for="lDish">What are you serving?<input class="i" id="lDish" value="${esc(c.dish||'')}" placeholder="e.g. Turkey tacos with rice and corn" ${P.canWrite?'':'disabled'}></label>
    <div class="grid g2" style="gap:10px">${[['protein','Protein (meat or alternate)'],['grain','Grain (whole grain-rich)'],['veg','Vegetable'],['fruit','Fruit (or a second vegetable)'],['milk','Milk']].map(f=>`<label class="f" for="l_${f[0]}">${f[1]}${sel('l_'+f[0], OPT[f[0]], c[f[0]]||'', `data-lfield="${f[0]}" ${P.canWrite?'':'disabled'}`)}</label>`).join('')}</div>
    <label class="f" for="lAllergy">Menu change for the whole room (optional; no child names or health details)<input class="i" id="lAllergy" value="${esc(c.allergy||'')}" placeholder="e.g. Turkey instead of ham today" ${P.canWrite?'':'disabled'}></label>
    <p class="mini">A swap for one child comes only from that child's director-approved meal instruction (Before service, above), never from this box.</p>
    <span class="chip ${cacfpOk(c)?'ok':'bad'}">${cacfpOk(c)?'All 5 CACFP lunch components listed':'List all 5 CACFP lunch components'}</span>
    <p class="mini">Listing the five components is not a crediting check: portions by age, whole grain-rich for the day and milk by age (whole at age 1; 1% or fat-free at 2 to 5) are still yours to check.</p>
    <p class="mini">Families see this lunch in their daily report.</p>`}
  </div></div>`;
}

// How much of a meal a child ate: a care fact in neutral words, recorded child by child. "Not recorded" is said out loud, never guessed.
const AMT = [['','\u2014'],'All','Most','Some','Tried it','None','Not recorded'];
const NAP = ['','No rest','Rested, did not sleep','Under 30 min','30 to 60 min','60 to 90 min','Over 90 min'];
function childrenView(){
  const kids = roomKids(P.room);
  return `<div class="card"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center"><h3>${esc(P.rooms[P.room].name)} \u00b7 ${shortDate(P.date)}</h3><span class="mini">Lunch: ${esc(lunchText(P.room,P.date))}</span></div>
   ${kids.length?`<div class="tw"><table><tr><th>Child</th><th>Here</th><th>Breakfast</th><th>Lunch</th><th>Snack</th><th>Rest</th><th>Star</th><th>Note to family</th><th><span class="sr-only">Report</span></th></tr>${kids.map(([id,k])=>{const x=kdDoc(id,P.date);const dis=P.canWrite?'':'disabled';return `<tr>
    <td><b>${esc(k.first)} ${esc(k.last||'')}.</b>${window.FFMeals?window.FFMeals.kidBadge(rhythmCtx(), id):''}</td>
    <td>${sel('a_'+id,[['','\u2014'],['1','Here'],['0','Absent']], x.present===true?'1':(x.present===false?'0':''), `data-kf="present" data-kid="${id}" ${dis} aria-label="Here or absent, ${esc(k.first)}"`)}</td>
    ${['breakfast','lunch','snack'].map(meal=>`<td>${sel(meal[0]+'_'+id, AMT, x.meals?.[meal]||'', `data-kf="meal" data-meal="${meal}" data-kid="${id}" ${dis} aria-label="${meal[0].toUpperCase()+meal.slice(1)}, ${esc(k.first)}"`)}</td>`).join('')}
    <td>${sel('n_'+id, NAP, x.nap||'', `data-kf="nap" data-kid="${id}" ${dis} aria-label="Rest, ${esc(k.first)}"`)}</td>
    <td><input type="checkbox" id="st_${id}" data-kf="star" data-kid="${id}" ${x.star?'checked':''} ${dis} aria-label="Friendship Star for ${esc(k.first)}" style="width:18px;height:18px;accent-color:var(--gold)"></td>
    <td><input class="i" id="t_${id}" data-kf="note" data-kid="${id}" value="${esc(x.note||'')}" placeholder="Optional" style="min-width:160px;padding:6px" ${dis}></td>
    <td><button class="rl" data-report="${id}">Report</button></td></tr>`;}).join('')}</table></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">${P.canWrite?`<button class="btn soft" data-p="allhere">Mark everyone here</button><button class="btn soft" data-p="lunchrest">Lunch: mark the rest "Not recorded"</button><span class="mini" style="align-self:center">Record what each child ate one by one. This button only fills empty lunch boxes with "Not recorded"; it never changes an entry.</span>`:''}${P.hub && window.FFOffline ? '<button class="btn soft" data-ffo="sheet">Print paper sheet (downtime)</button>' : ''}</div>`:'<p class="small muted">No children yet. Add them below.</p>'}
   ${P.canWrite?`<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:end;border-top:1px solid var(--line);padding-top:12px"><label class="f" for="kFirst">First name<input class="i" id="kFirst" style="padding:7px 9px"></label><label class="f" for="kLast">Last initial<input class="i" id="kLast" maxlength="1" style="width:70px;padding:7px 9px"></label><button class="btn navy" data-p="addkid">Add child</button></div><p class="mini">Store first names and last initials only. Families give consent before any photo is shared.</p>`:''}</div>${P.hub && window.FFHistory ? window.FFHistory.leftCard(rhythmCtx()) : ''}`;
}

function accountView(){
  const dates = weekDates(P.date), kids = roomKids(P.room);
  const rows = dates.map(dt=>{ const cp=completion(P.room,dt), dd=dayDoc(P.room,dt); const pres=kids.filter(([id])=>kdDoc(id,dt).present===true); const logged=pres.filter(([id])=>kdDoc(id,dt).meals?.lunch).length; const L=lessonFor(dt);
    return {dt, cp, L, ep: L.friday?'Screen-free':(dd.checks?.episode?`${dd.episode?.min ?? 5} min`:'Not logged'), lunch: dd.lunch.mode==='custom'?(cacfpOk(dd.lunch.custom)?'Custom \u2713':'Custom, incomplete'):'Planned', meals: pres.length?`${logged} of ${pres.length}`:'\u2014', notes: dd.notes?'Sent':'\u2014'}; });
  const scr = weekScreen(P.room,P.date), avg = Math.round(rows.reduce((a,r)=>a+r.cp.p,0)/rows.length);
  return `<div class="grid g4">
   <div class="card"><div class="stat" style="background:none;border:0;padding:0"><b style="color:var(--navy)">${avg}%</b><span class="small muted">Checklist completion this week</span></div></div>
   <div class="card"><div class="stat" style="background:none;border:0;padding:0"><b style="color:${scr>30?'var(--bad)':'var(--navy)'}">${scr}</b><span class="small muted">of 30 screen minutes used this week</span></div></div>
   <div class="card"><div class="stat" style="background:none;border:0;padding:0"><b style="color:var(--navy)">${rows.filter(r=>r.lunch!=='Custom, incomplete').length}/5</b><span class="small muted">Lunches with all 5 CACFP components listed (portions not checked)</span></div></div>
   <div class="card"><div class="stat" style="background:none;border:0;padding:0"><b style="color:var(--navy)">${rows.filter(r=>r.notes==='Sent').length}/5</b><span class="small muted">Days with notes sent to families</span></div></div></div>
  <div class="card"><h3>Week of ${shortDate(dates[0])} \u00b7 ${esc(P.rooms[P.room].name)}</h3><div class="tw"><table><tr><th>Day</th><th>Lesson</th><th class="n">Checklist</th><th>Episode</th><th>Lunch</th><th class="n">Lunch intake logged</th><th>Family notes</th></tr>
   ${rows.map(r=>`<tr><td><button class="rl" data-day="${r.dt}">${shortDate(r.dt)}</button></td><td class="small">${esc(r.L.theme)}</td><td class="n"><span class="chip ${r.cp.p===100?'ok':(r.cp.p?'warn':'')}">${r.cp.p}%</span></td><td class="small">${r.ep}</td><td class="small">${r.lunch}</td><td class="n">${r.meals}</td><td class="small">${r.notes}</td></tr>`).join('')}</table></div>
   <p class="note">Every check mark records who completed it and when. Directors see every classroom; families see their own child's day.</p></div>`;
}

function setupView(){
  const rs = Object.entries(P.rooms).sort((a,b)=>(a[1].order||9)-(b[1].order||9));
  return `<div class="card"><h3>Classrooms</h3>${rs.length?`<div class="tw"><table><tr><th>Classroom</th><th>Ages</th><th>Menu level</th><th class="n">Children</th><th><span class="sr-only">Remove</span></th></tr>${rs.map(([id,r])=>`<tr><td><b>${esc(r.name)}</b>${r.sample?' <span class="sample">Sample</span>':''}</td><td>${esc(r.ages||'')}</td><td>${LEVELS[r.level||1]}</td><td class="n">${roomKids(id).length}</td><td>${P.canWrite?`<button class="rl" data-rmroom="${id}">Remove</button>`:''}</td></tr>`).join('')}</table></div>`:'<p class="small muted">No classrooms yet.</p>'}
   ${P.canWrite?`<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:end"><label class="f" for="rName">Classroom name<input class="i" id="rName" placeholder="e.g. Sunshine Room" style="padding:7px 9px"></label><label class="f" for="rAges">Ages${sel('rAges',['Infants (under 12 months)','Toddlers (12 to 23 months)','Age 2','Age 3','Ages 3 to 4','Ages 4 to 5','Mixed ages 2 to 5'],'Age 3')}</label><button class="btn navy" data-p="addroom">Add classroom</button>${rs.length?'':'<button class="btn gold" data-p="sample">Load sample classes</button>'}</div>`:''}
   <p class="note">${P.live?'Everything here saves to your program and is shared with your team.':'Sample local preview: changes stay in this browser. A live account or host connection is required to save to your program.'}</p></div>`;
}

// ---------------- FAMILY PORTAL
V['family-portal'] = () => {
  const kids = Object.entries(P.kids).sort((a,b)=>a[1].first.localeCompare(b[1].first));
  if (!kids.length) return header('Family Portal','Your child\'s day at Futures.') + `<section class="band-paper"><div class="wrap"><div class="card" style="max-width:620px"><h3>No children linked yet</h3><p class="small">Your center links your child to your account. To try the family view now, load the sample classes in the Teacher Portal.</p><button class="btn navy" data-go="portal">Open the Teacher Portal</button>${window.FFSupporting&&window.FFSupporting.cameo?`<div class="ff-empty-cameo">${window.FFSupporting.cameo(['mara','pip'],{unit:120,caption:'Every first day starts with a brave hello.'})}</div>`:''}</div></div></section>`;
  if (!P.fam.kid || !P.kids[P.fam.kid]) P.fam.kid = kids[0][0];
  if (!P.fam.date) P.fam.date = P.date;
  return header('Family Portal', 'What your child learned, ate and did today.') + `<section class="band-paper" style="padding-block:22px 60px"><div class="wrap" style="display:grid;gap:16px">
   <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:end"><label class="f" for="fKid">Child${sel('fKid', kids.map(([id,k])=>[id,`${k.first} ${k.last||''}.`]), P.fam.kid)}</label><label class="f" for="fDate">Day<input class="i" type="date" id="fDate" value="${P.fam.date}" style="padding:7px 9px"></label>${P.live?'':'<span class="sample">Sample family view</span>'}</div>
   ${familyReport(P.fam.kid, P.fam.date)}</div></section>`;
};
// The ONE family-report publisher in hub mode is the hub (daily_report_publish_day -> daily_reports -> family-report.js "Today's report"
// and the evening email). This screen-built report is the sample-mode preview only: in hub mode it draws nothing for families (it
// read raw day documents, so it could show a note the hub holds back), and staff are pointed to the Family reports preview.
const FR_ANCHOR = '<!--ff-family-today-->';
function familyReport(kid, date){
  if (P.hub) return FR_ANCHOR + (P.role==='family' ? '' : `<div class="card"><h3>Family reports</h3><p class="small">In the Futures Hub each family's report is built from what you log and published at about 5:30 pm. Check or edit it on the Teacher Portal's Family reports tab.</p><button class="btn navy" data-go="portal">Open the Teacher Portal</button></div>`);
  const k = P.kids[kid]; if(!k) return ''; const room = P.rooms[k.room]||{name:'Classroom',level:1}; const L = lessonFor(date), dd = dayDoc(k.room,date), x = kdDoc(kid,date), items = checklist(date), cp = completion(k.room,date);
  const wd = fromIso(date).getDay(); if (wd===0||wd===6) return `<div class="card"><p>No program on weekends.</p></div>`;
  const m = menuFor(room.level||1, date);
  const lunch = dd.lunch.mode==='custom' ? lunchText(k.room,date) : (m? m[2].replace(/\s*\([EMN]\d+\)/g,'')+', milk':'');
  const fp = familyProgram(k, x, date);
  return FR_ANCHOR + `<div class="grid g2" style="align-items:start">
   <div class="card" style="border-top:5px solid var(--${L.lead})"><div style="display:flex;gap:12px;align-items:center"><img src="${FFcut(L.lead)}" alt="" style="width:54px;border-radius:8px"><div><span class="small muted">${fmtDate(date)} \u00b7 ${esc(room.name)}</span><h3>${esc(k.first)}'s day</h3></div></div>
    <span class="small"><b>Attendance:</b> ${x.present===true?'Here':(x.present===false?'Absent':'Not recorded yet')}</span>
    ${fp ? fp.lesson : `<span class="small"><b>Lesson:</b> ${esc(L.theme)} with ${esc(L.leadTxt)}</span>
    <span class="small"><b>Today's focus:</b> ${esc(L.focus)}</span>`}
    <span class="small"><b>Watched:</b> ${watchedLine(k, room, date) || (L.friday?'Screen-free Friday':(dd.checks?.episode?`"${esc(L.episode)}" \u00b7 ${dd.episode?.min ?? 5} minutes, watched together`:'No episode recorded'))}</span>
    <span class="small"><b>Read-aloud:</b> ${esc(String(L.book).split(';')[0])}</span>
    ${x.star?'<span class="chip ok" style="justify-self:start">\u2605 Earned a Friendship Star today</span>':''}
    <span class="small"><b>${fp?'Talk about it tonight':'Ask at dinner'}:</b> ${fp ? esc(fp.talk) : `"What did ${esc(CH[L.lead].n)} do today?"`}</span></div>
   ${fp ? fp.card : ''}
   <div class="card" style="border-top:5px solid var(--bop)"><h3>What ${esc(k.first)} ate</h3>
    <div class="tw"><table><tr><th>Meal</th><th>Menu</th><th>Ate</th></tr>
     <tr><td>Breakfast</td><td class="small">${m?esc(m[1].replace(/\s*\([EMN]\d+\)/g,'')):''}</td><td>${esc(x.meals?.breakfast||'\u2014')}</td></tr>
     <tr><td>Lunch</td><td class="small">${esc(lunch)}${dd.lunch.mode==='custom'?' <span class="sample">Custom</span>':''}</td><td>${esc(x.meals?.lunch||'\u2014')}</td></tr>
     <tr><td>Snack</td><td class="small">${m?esc(m[3].replace(/\s*\([EMN]\d+\)/g,'')):''}</td><td>${esc(x.meals?.snack||'\u2014')}</td></tr></table></div>
    <span class="small"><b>Rest:</b> ${esc(x.nap||'Not recorded')}</span>${window.FFMeals?window.FFMeals.familyLine(rhythmCtx(), kid):''}</div>
   <div class="card" style="border-top:5px solid var(--zuri)"><h3>Take-home this week</h3><p class="small">${esc(L.take)}</p></div>
   <div class="card" style="border-top:5px solid var(--lumi)"><h3>Notes from the teacher</h3>${x.note?`<p class="small"><b>For ${esc(k.first)}:</b> ${esc(x.note)}</p>`:''}${dd.notes?`<p class="small"><b>For the class:</b> ${esc(dd.notes)}</p>`:''}${!x.note&&!dd.notes?'<p class="small muted">No notes yet today.</p>':''}
    <span class="mini">The room's checklist: ${cp.done} of ${cp.total} steps done</span><div class="meter"><i style="width:${cp.p}%"></i></div></div></div>`;
}

// Sample-mode family view of the daily-program record, by the same rules as the hub's daily_report_build: the room's plan is labelled
// as the room's; "took part" and the optional home continuation appear ONLY for a record the teacher logged this child as joining;
// nothing logged reads "not recorded"; a child logged as not joining gets no line at all (never a negative mark).
function familyProgram(k, x, date){
  const pi = progFor(k.room, date); if (!pi || pi.state!=='ready' || !pi.records.length || x.present===false) return null;
  const N = window.FFProgram.names, B = window.FFProgram.blockName, s0 = window.FFProgram.summary(pi);
  const say = r => `${B(r.block)}: "${r.record.theme}" with ${N[r.record.character]||''}`;
  const log = r => ((x.program||{})[r.id]||{}).took_part;
  const took = pi.records.filter(r=>log(r)===true), unknown = pi.records.filter(r=>log(r)!==true && log(r)!==false);
  const c = took.find(r=>r.record.home_continuation && r.record.home_continuation.title), hc = c && c.record.home_continuation;
  const talk = c ? `${k.first} took part in "${c.record.theme}" with ${N[c.record.character]}. Ask ${k.first}: "What did you do with ${N[c.record.character]}?" If you like, try "${hc.title}" at home together.`
                 : `Ask ${k.first}: "What is one thing you did today that you want to tell me about?"`;
  return {talk,
    lesson: `<span class="small"><b>The room's lesson:</b> ${esc(s0.theme)} with ${esc(s0.leadName)} (${esc(s0.pillars.join(' + '))})</span>`,
    card: `<div class="card" style="border-top:5px solid var(--${esc(s0.lead)})"><h3>From today's plan</h3>
     ${took.length?`<p class="small"><b>Took part in:</b> ${esc(took.map(say).join('; '))}</p>`:''}
     ${unknown.length?`<p class="small"><b>Not recorded:</b> whether ${esc(k.first)} joined ${esc(unknown.map(say).join('; '))} was not recorded today.</p>`:''}
     ${hc?`<div class="pg-note"><b>Try at home (optional): ${esc(hc.title)}</b><ol class="small" style="margin:4px 0 0 18px;padding:0">${(hc.steps||[]).map(t=>`<li>${esc(t)}</li>`).join('')}</ol>${(hc.materials_from_home||[]).length?`<p class="small" style="margin:4px 0 0"><b>You will need:</b> ${esc(hc.materials_from_home.join(', '))}</p>`:''}</div>`:''}
     ${!took.length && !unknown.length ? `<p class="small muted">Nothing from today's plan to share for ${esc(k.first)}.</p>` : ''}</div>`};
}

// ---------------- PROGRESS PORTFOLIO, MESSAGES AND PHOTO MOMENTS
// Collections: progress (id = kid), obs, photos, msgs. Demo mode keeps them in memory and mirrors to localStorage
// (LS2) so a teacher action shows in the family portal in the same browser. Live mode saves to the artifact db.
const P2 = {progress:{}, obs:{}, photos:{}, msgs:{}, pk:null, mk:null, stepSel:null, pending:null, momentPending:null, freshT:new Set(), freshF:new Set(), seeded:false};
const LS2 = 'ff-portal2-v2'; // v2: Learning Steps (word levels with notes); v1 held numeric milestone marks
const C2 = ['progress','obs','photos','msgs'];
function ls2Save(){ if(P.live) return; try{ localStorage.setItem(LS2, JSON.stringify({progress:P2.progress, obs:P2.obs, photos:P2.photos, msgs:P2.msgs})); return true; }catch(_){ return false; } }
function ls2Load(){ try{ const raw=localStorage.getItem(LS2); if(!raw) return; const o=JSON.parse(raw); C2.forEach(c=>{ if(o && o[c] && typeof o[c]==='object') Object.assign(P2[c], o[c]); }); }catch(_){} }
async function put2(coll, id, data){
  const clean = JSON.parse(JSON.stringify(data)); P2[coll][id] = clean;
  if (P.db && P.live) { if(!P.canWrite && !(P.hub && P.role==='family' && coll==='msgs')) return; try { await P.db.collection(coll).doc(id).set(clean); } catch(err){ if(P.hub && coll==='photos') delete P2[coll][id]; fail(err); return false; } }
  else if (ls2Save()===false && coll==='photos') toast('Photo kept on this screen only (browser storage is full).');
  return true;
}
const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
// ---- Learning Steps (learning-steps-summary.js on the public site: bands, areas and levels, NO steps (IP lockdown 2026-10-07); a hosted Hub supplies the steps). Generated in the CRM repo. Words, never numbers:
// no scores, percentages, rankings or comparisons between children. A level is saved only with a dated teacher note.
const FS = window.FFSteps || {bands:[], domains:[], levels:[], steps:[], referral:{title:'', lines:[]}};
const BANDS = Object.fromEntries(FS.bands.map(b=>[b.key, b.label]));
const BAND_AGES = Object.fromEntries(FS.bands.map(b=>[b.key, b.ages]));
const SDOM = Object.fromEntries(FS.domains.map(d=>[d.key, d]));
const LVLW = Object.fromEntries(FS.levels.map(l=>[l.key, l]));
const STEP = Object.fromEntries(FS.steps.map(s=>[s.id, s]));
const bandSteps = band => FS.steps.filter(s=>s.band===band);
const domFriend = d => (SDOM[d]||{}).friend || 'zuri';
const stepsOf = kid => ((P2.progress[kid]||{}).steps) || {};
function monthsOld(dob, on){ const a=fromIso(dob), b=fromIso(on); return (b.getFullYear()-a.getFullYear())*12 + (b.getMonth()-a.getMonth()) - (b.getDate()<a.getDate()?1:0); }
function bandOfRoom(room){ const r=P.rooms[room]||{}; const s=`${r.ages||''} ${r.name||''}`.toLowerCase();
  if(/infant|bab(y|ies)|under 12/.test(s)) return 'infant'; if(/toddler|12 to 23/.test(s)) return 'toddler'; if(/mixed/.test(s)) return 'threes';
  if(/pre-?k|4|5/.test(s)) return 'prek'; if(/two|age 2\b/.test(s)) return 'twos'; return 'threes'; }
// band: ONLY the set staff confirmed for this child (review H1/R1). Never inferred from a room name: a mixed-age room holds children of
// several bands. null = not confirmed yet, and the portfolio asks a teacher to choose. Every set/change is kept in bandHistory.
function bandOf(kid){ const pr=P2.progress[kid]; return pr && BANDS[pr.band] ? pr.band : null; }
// a suggestion the teacher must confirm, never applied by itself: the date of birth, else a room set to exactly one age band
const ONE_BAND_AGES = {'Infants (under 12 months)':'infant','Toddlers (12 to 23 months)':'toddler','Age 2':'twos','Age 3':'threes','Ages 4 to 5':'prek'};
function bandSuggest(kid){ const k=P.kids[kid]||{}, dob=k.birthday||k.dob;
  if(/^\d{4}-\d{2}-\d{2}$/.test(String(dob||''))){ const m=monthsOld(dob, P.date), last=FS.bands[FS.bands.length-1]; const b=FS.bands.find(x=>m>=x.min && m<=x.max) || (last && m>last.max ? last : null); if(b) return {band:b.key, why:'from the date of birth on file'}; }
  const ages=String((P.rooms[k.room]||{}).ages||''); return ONE_BAND_AGES[ages] ? {band:ONE_BAND_AGES[ages], why:`the classroom is set to "${ages}"`} : null; }
const lvlChip = (x, noted) => x && LVLW[x.level] ? `<span class="p2-lvl" data-l="${esc(x.level)}">${esc(LVLW[x.level].label)}</span>` : (noted ? '<span class="p2-lvl none">Noted, no level yet</span>' : '<span class="p2-lvl none">Not yet observed</span>');
const CTX = [['','Not given'],['play','Free play'],['small','Small group'],['large','Large group'],['routine','Routine (arrival, meals, dressing, handwashing)'],['outdoors','Outdoors'],['transition','Transition']];
const ctxLabel = c => (CTX.find(x=>x[0]===c)||['',''])[1];
// Documentation coverage: how much has been WRITTEN DOWN about a child, never how the child is doing (no percentages, no ability claim).
function coverage(kid, band){ const all=kidObs(kid), list=band?bandSteps(band):[], st=stepsOf(kid);
  const noted=new Set(all.filter(o=>o.step && STEP[o.step] && STEP[o.step].band===band).map(o=>o.step)); Object.keys(st).forEach(id=>{ if(STEP[id] && STEP[id].band===band) noted.add(id); });
  const now=fromIso(P.date).getTime(); const recent=all.filter(o=>o.date && (now-fromIso(o.date).getTime())/864e5<=30 && (now-fromIso(o.date).getTime())>=0).length;
  const doms=FS.domains.filter(d=>list.some(s=>s.domain===d.key)).map(d=>({d, n:list.filter(s=>s.domain===d.key && noted.has(s.id)).length, m:list.filter(s=>s.domain===d.key).length}));
  return {notes:all.length, shared:all.filter(o=>o.shared===true).length, recent, noted:noted.size, steps:list.length, doms}; }
const lcFirst = s => s ? s.charAt(0).toLowerCase()+s.slice(1) : s;
const fmtAt = ms => new Date(ms).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
const kidName = id => { const k=P.kids[id]; return k?`${k.first} ${k.last?k.last+'.':''}`.trim():'Child'; };
const safeSrc = s => /^(data:image\/(png|jpe?g|webp|gif);base64,|img\/)/.test(String(s||'')) || (P.hub && window.FF_HUB && String(s||'').startsWith(String(window.FF_HUB.url).replace(/\/+$/,'')+'/storage/v1/object/sign/')) ? s : '';

// ---- styles (existing tokens only, so light and dark both work)
function css2(){ if(document.getElementById('ff-portal2-css')) return; const s=document.createElement('style'); s.id='ff-portal2-css'; s.textContent=`
.p2-dot{display:inline-block;width:9px;height:9px;border-radius:50%;background:var(--lumi);vertical-align:middle;margin-left:4px;flex:none}
.p2-cols{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:16px;align-items:start}
.p2-msgs{display:grid;grid-template-columns:minmax(0,270px) minmax(0,1fr);gap:16px;align-items:start}
@media (max-width:900px){.p2-cols,.p2-msgs{grid-template-columns:minmax(0,1fr)}}
.p2-kids{display:flex;flex-wrap:wrap;gap:8px}
.p2-kid{all:unset;box-sizing:border-box;cursor:pointer;display:grid;gap:4px;padding:8px 12px;border:1px solid var(--line);border-radius:12px;background:var(--paper);min-width:118px;font-size:13.5px}
.p2-kid[aria-pressed="true"]{outline:2px solid var(--gold);background:var(--paper2)}
.p2-kid:focus-visible,.p2-dom{border-top:5px solid var(--c)}
.p2-dom h3{color:var(--c)}
.p2-ms{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--line)}
.p2-ms:last-child{border-bottom:0}
.p2-ms>span:first-child{flex:1 1 220px;min-width:0;font-size:14px}
.p2-lvl{display:inline-flex;align-items:center;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600;border:1px solid var(--line);background:var(--paper);color:var(--ink);white-space:nowrap}
.p2-lvl[data-l="emerging"]{background:var(--bop-s)}
.p2-lvl[data-l="developing"]{background:var(--booker-s)}
.p2-lvl[data-l="secure"]{background:var(--zuri-s)}
.p2-lvl.none{color:var(--muted);border-style:dashed;font-weight:500}
.p2-step-act{display:inline-flex;gap:8px;align-items:center;flex:none}
.p2-fam h4{font-size:15px;margin:8px 0 2px}
.p2-fam ul{margin:0;padding-left:18px;display:grid;gap:6px}
.p2-ref{border-top:5px solid var(--lumi)}
.p2-ref ul{margin:0;padding-left:18px;display:grid;gap:6px;font-size:14px}
.p2-obs{display:grid;gap:3px;padding:9px 0 9px 12px;border-left:4px solid var(--c);border-bottom:1px solid var(--line)}
.p2-thumbs{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px}
.p2-th{all:unset;box-sizing:border-box;cursor:zoom-in;display:grid;gap:3px;min-width:0}
.p2-th img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:10px;border:1px solid var(--line);background:var(--paper2)}
.p2-th span{font-size:11.5px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.p2-strip{display:flex;gap:10px;overflow-x:auto;padding-bottom:6px;scroll-snap-type:x mandatory}
.p2-strip .p2-th{flex:0 0 150px;scroll-snap-align:start}
.p2-priv{display:inline-flex;gap:6px;align-items:center;font-size:12px;color:var(--muted)}
.p2-priv::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--ok)}
.p2-threads{display:grid;gap:4px}
.p2-thread{all:unset;box-sizing:border-box;cursor:pointer;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 8px;padding:9px 10px;border-radius:12px;border:1px solid transparent}
.p2-thread[aria-pressed="true"]{background:var(--paper2);border-color:var(--line)}
.p2-thread .pv{grid-column:1/-1;font-size:12px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.p2-chat{display:grid;gap:10px;max-height:440px;overflow-y:auto;padding:12px;border:1px solid var(--line);border-radius:14px;background:var(--paper)}
.p2-b{max-width:min(84%,520px);padding:9px 13px;border-radius:16px;display:grid;gap:3px;font-size:14px;overflow-wrap:anywhere}
.p2-b.me{justify-self:end;background:var(--navy);color:#fff;border-bottom-right-radius:5px}
.p2-b.them{justify-self:start;background:var(--lumi-s);color:var(--ink);border:1px solid var(--line);border-bottom-left-radius:5px}
.p2-b .mt{font-size:11px;opacity:.8;display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.p2-b .an{font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;font-weight:700;color:var(--gold)}
.p2-qrs{display:flex;flex-wrap:wrap;gap:6px}
.p2-qr{all:unset;cursor:pointer;font-size:12.5px;font-weight:600;padding:5px 11px;border-radius:999px;border:1px solid var(--line);background:var(--paper2)}
.p2-qr:hover{border-color:var(--gold)}
.p2-row{display:flex;gap:10px;flex-wrap:wrap;align-items:end}
.p2-row>label.f{flex:1 1 160px;min-width:0}
.p2-file{font-size:13px;max-width:100%}
.p2-prev{display:flex;gap:10px;align-items:center}
.p2-prev img{width:64px;height:64px;object-fit:cover;border-radius:10px;border:1px solid var(--line)}
.p2-jump{display:flex;gap:6px;flex-wrap:wrap}
.p2-jump button{all:unset;cursor:pointer;font-size:13px;font-weight:600;padding:6px 13px;border-radius:999px;border:1px solid var(--line);background:var(--paper)}
.p2-jump button:focus-visible{outline:2px solid var(--gold)}
.p2-sec{list-style:none;margin:0;padding:0;display:grid;gap:5px}
.p2-sec li{display:flex;gap:8px;font-size:13.5px}
.p2-sec li::before{content:"\u2605";color:var(--c)}
@media (max-width:700px){.seg[aria-label="Portal sections"]{border-radius:14px;margin-left:0 !important}.seg[aria-label="Portal sections"] button{padding:8px 12px}}
#p2Dlg img{width:100%;max-height:70vh;object-fit:contain;border-radius:12px;background:var(--paper2)}
`; document.head.appendChild(s); }
css2();

// ---- photo downscale (max 800px, JPEG data URL)
function downscale(file, max=800){ return new Promise((res,rej)=>{ if(!file || !/^image\//.test(file.type)) return rej(new Error('not an image'));
  const fr=new FileReader(); fr.onerror=()=>rej(fr.error); fr.onload=()=>{ const im=new Image(); im.onerror=()=>rej(new Error('decode'));
    im.onload=()=>{ const sc=Math.min(1, max/Math.max(im.naturalWidth||1, im.naturalHeight||1)); const w=Math.max(1,Math.round(im.naturalWidth*sc)), h=Math.max(1,Math.round(im.naturalHeight*sc));
      const c=document.createElement('canvas'); c.width=w; c.height=h; const x=c.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,w,h); x.drawImage(im,0,0,w,h); res(c.toDataURL('image/jpeg',0.8)); };
    im.src=fr.result; }; fr.readAsDataURL(file); }); }
function openPhoto(id){ const ph=P2.photos[id]; if(!ph) return; let d=document.getElementById('p2Dlg');
  if(!d){ d=document.createElement('dialog'); d.id='p2Dlg'; d.setAttribute('aria-label','Photo'); document.body.appendChild(d); d.addEventListener('click',e=>{ if(e.target===d || e.target.closest('[data-p2close]')) d.close(); }); }
  d.innerHTML=`<div class="dlg"><img src="${esc(safeSrc(ph.src))}" alt="${esc(ph.caption||'Photo of '+kidName(ph.kid))}"><p class="small"><b>${esc(kidName(ph.kid))}</b> \u00b7 ${shortDate(ph.date)}${ph.caption?' \u00b7 '+esc(ph.caption):''}</p><p class="p2-priv">${photoNotice()}</p><div><button class="btn soft" data-p2close>Close</button></div></div>`;
  try{ d.showModal(); }catch(_){ d.setAttribute('open',''); } }
const thumb = ph => `<button class="p2-th" data-p2photo="${esc(ph.id)}" aria-label="Open photo: ${esc(ph.caption||kidName(ph.kid))}, ${shortDate(ph.date)}"><img src="${esc(safeSrc(ph.src))}" alt="" loading="lazy"><span>${esc(ph.caption||shortDate(ph.date))}</span></button>`;
const kidPhotos = (kid, kind, famOnly) => Object.entries(P2.photos).map(([id,p])=>Object.assign({id},p)).filter(p=>p.kid===kid && (!kind||p.kind===kind) && (!famOnly || p.kind!=='portfolio' || p.shared===true) && safeSrc(p.src)).sort((a,b)=>b.at-a.at);
const kidObs = kid => Object.entries(P2.obs).map(([id,o])=>Object.assign({id,text:o.note},o)).filter(o=>o.kid===kid).sort((a,b)=>(b.date||'').localeCompare(a.date||'') || b.at-a.at);
const thread = kid => Object.entries(P2.msgs).map(([id,m])=>Object.assign({id,at:Date.parse(m.ts)},m)).filter(m=>m.kid===kid).sort((a,b)=>a.at-b.at);
const unreadFor = (kid, side) => thread(kid).filter(m=>m.from!==side && !(m.read||{})[side]).length;
function teacherUnread(room){ return roomKids(room).reduce((a,[id])=>a+unreadFor(id,'teacher'),0); }
async function markRead(kid, side){ const fresh = side==='teacher'?P2.freshT:P2.freshF; for(const m of thread(kid)){ if(m.from!==side && !(m.read||{})[side]){ fresh.add(m.id); const x=Object.assign({},P2.msgs[m.id]); x.read=Object.assign({},x.read,{[side]:true}); await put2('msgs',m.id,x); } } }

// ---- teacher: Progress tab (Learning Steps portfolio)
function progressView(){
  const kids = roomKids(P.room); if(!kids.length) return `<div class="card"><h3>No children yet</h3><p class="small">Add children on the Children tab to start a Learning Steps portfolio.</p><button class="btn soft" data-ptab="children">Open Children</button></div>`;
  if(!P2.pk || !kids.some(([id])=>id===P2.pk)) P2.pk = kids[0][0];
  const kid=P2.pk, k=P.kids[kid], band=bandOf(kid), st=stepsOf(kid), dis=P.canWrite?'':'disabled';
  const obs=kidObs(kid).slice(0,6), photos=kidPhotos(kid), list=band?bandSteps(band):[], doms=FS.domains.filter(d=>list.some(s=>s.domain===d.key));
  const notedSteps=new Set(kidObs(kid).filter(o=>o.step).map(o=>o.step));
  const pick = P2.stepSel && STEP[P2.stepSel] && STEP[P2.stepSel].band===band ? P2.stepSel : '';
  const hist = ((P2.progress[kid]||{}).bandHistory||[]).slice().reverse(), last = hist[0];
  const sug = band ? null : bandSuggest(kid), cv = coverage(kid, band);
  const bandCard = band
    ? `<div class="card" data-motion="reveal" style="padding-block:16px" id="p2BandCard"><div class="p2-row" style="justify-content:space-between"><div style="display:grid;gap:2px"><h3>${esc(k.first)}'s Learning Steps</h3><span class="mini">${esc(BANDS[band])} · ${esc(BAND_AGES[band]||'')}${last?` · set by ${esc(who(last.by))}, ${fmtAt(last.at)}`:''}. Record what you see in play and routines. A level is a word, saved only with a dated note. Never a score, never compared with other children.</span></div>
     ${P.canWrite?`<div class="p2-row" style="flex:0 1 330px"><label class="f" for="p2Band" style="flex:1 1 200px">Change the set${sel('p2Band', FS.bands.map(b=>[b.key,`${b.label} (${b.ages})`]), band)}</label><button class="btn soft" data-p2="confirmband">Save change</button></div>`:''}</div>
     ${hist.length?`<details><summary class="mini">Set history (${hist.length})</summary><ul class="p2-sec" style="--c:var(--muted)">${hist.map(h=>`<li>${h.band&&BANDS[h.band]?esc(BANDS[h.band]):'Cleared'}${h.from&&BANDS[h.from]?` (was ${esc(BANDS[h.from])})`:''} · ${esc(who(h.by))} · ${fmtAt(h.at)}</li>`).join('')}</ul></details>`:''}</div>`
    : `<div class="card" data-motion="reveal" style="padding-block:16px;border-top:5px solid var(--gold)" id="p2BandCard"><h3>Choose ${esc(k.first)}'s Learning Steps set</h3>
     <p class="small">No set is confirmed for ${esc(k.first)} yet, so no Learning Steps are shown. The set is chosen for each child, not for the classroom: children in one room can be at different ages.${sug?` Suggested: <b>${esc(BANDS[sug.band])}</b>, ${esc(sug.why)}. Check it before you confirm.`:' There is no date of birth on file and the classroom covers more than one age band, so nothing is suggested.'}</p>
     ${P.canWrite?`<div class="p2-row"><label class="f" for="p2Band" style="flex:0 1 260px">Learning Steps set${sel('p2Band', [['','Choose a set']].concat(FS.bands.map(b=>[b.key,`${b.label} (${b.ages})`])), sug?sug.band:'')}</label><button class="btn navy" data-p2="confirmband">Confirm set</button></div>`:'<p class="small muted">Ask a teacher to confirm the set.</p>'}
     <p class="mini">General notes can still be saved below while the set is not confirmed.</p></div>`;
  const covCard = `<div class="card" data-motion="reveal" id="p2Coverage"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap"><h3>Documentation coverage</h3><span class="mini">How much has been written down, not how ${esc(k.first)} is doing</span></div>
     ${cv.notes===0?`<p class="small"><span class="p2-lvl none">Not yet observed</span> No notes have been recorded for ${esc(k.first)} yet. That says nothing about what ${esc(k.first)} can do: it only means nobody has written it down.</p>`
       :`<p class="small"><b>${cv.notes}</b> ${cv.notes===1?'note':'notes'} ${winFrom('obs')?`since ${shortDate(winFrom('obs'))} (load earlier notes below for more)`:'in all'} · <b>${cv.recent}</b> in the last 30 days · <b>${cv.shared}</b> shared with the family${band?` · <b>${cv.noted} of ${cv.steps}</b> ${esc(BANDS[band])} Learning Steps have at least one dated note`:''}</p>`}
     ${band?`<ul class="p2-sec" style="--c:var(--muted)">${cv.doms.map(x=>`<li>${esc(x.d.label)}: ${x.n} of ${x.m} noted</li>`).join('')}</ul>`:''}
     <p class="mini">Use this to see which areas still need an observation. It is never a score, a grade or a comparison with other children.</p></div>`;
  return `<div class="card" data-motion="reveal"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap"><h3>Learning Steps portfolio</h3><span class="mini">Pick a child · notes stay with teachers until you share them with that child's family</span></div>
   <div class="p2-kids" role="group" aria-label="Choose a child">${kids.map(([id,x])=>`<button class="p2-kid" data-p2kid="${id}" aria-pressed="${id===kid}"><b>${esc(x.first)} ${esc(x.last||'')}.</b><span class="mini">${esc(BANDS[bandOf(id)]||'Set not confirmed')}</span></button>`).join('')}</div></div>
  <div class="p2-cols">
   <div style="display:grid;gap:16px">
    ${bandCard}
    ${FS.summary_only&&!FS.steps.length?`<div class="card" data-motion="reveal" id="p2StepsPrivate"><h3>Learning Steps</h3><p class="small">The Learning Steps themselves (each step, its source and its next teaching step) are part of the licensed program and are not on this website. This preview shows the portfolio without them. Licensed centers get them through Futures Learning Center for now.</p></div>`:''}
    ${doms.map(d=>`<div class="card p2-dom" data-motion="reveal" style="--c:var(--${d.friend})"><div style="display:flex;gap:10px;align-items:center;min-width:0"><img src="${FFcut(d.friend)}" alt="" style="width:40px;border-radius:8px"><div style="min-width:0"><h3>${esc(d.label)}</h3><span class="mini">${esc(d.family)}</span></div></div>
      <div>${list.filter(s=>s.domain===d.key).map(s=>{ const x=st[s.id]; return `<div class="p2-ms" data-step-row="${s.id}"><span style="display:grid;gap:2px"><span>${esc(s.text)}</span>${x?`<span class="mini">${shortDate(x.date)}: ${esc(x.note)}</span><span class="mini"><b>Next teaching step:</b> ${esc(s.next)}</span>`:''}</span><span class="p2-step-act">${lvlChip(x, notedSteps.has(s.id))}${P.canWrite?`<button class="btn soft" style="padding:5px 10px" data-p2step="${s.id}" aria-label="Record an observation for: ${esc(s.text)}">Record</button>`:''}</span></div>`; }).join('')}</div></div>`).join('')}
   </div>
   <div style="display:grid;gap:16px">
    ${covCard}
    <div class="card" data-motion="reveal" id="p2ObsCard"><h3>Add observation</h3>
     ${P.canWrite?`<div class="p2-row"><label class="f" for="p2ObsDate">Date<input class="i" type="date" id="p2ObsDate" value="${P.date}" style="padding:7px 9px"></label><label class="f" for="p2ObsCtx">Where or when${sel('p2ObsCtx', CTX, '')}</label></div>
     <div class="p2-row"><label class="f" for="p2ObsStep">Learning Step<select class="i" id="p2ObsStep" style="padding:7px 9px"><option value="">General note (no Learning Step)</option>${doms.map(d=>`<optgroup label="${esc(d.label)}">${list.filter(s=>s.domain===d.key).map(s=>`<option value="${s.id}" ${s.id===pick?'selected':''}>${esc(s.text)}</option>`).join('')}</optgroup>`).join('')}</select></label><label class="f" for="p2ObsLvl">Level (optional)${sel('p2ObsLvl', [['','No level, just a note']].concat(FS.levels.map(l=>[l.key,l.label])), '', band?'':'disabled')}</label></div>
     <label class="f" for="p2ObsText">What did you see?<textarea class="i" id="p2ObsText" style="min-height:80px" placeholder="What the child did or said, e.g. Counted 8 bears one by one and said 'eight!'"></textarea></label>
     <p class="mini">Write what you saw in plain words. Choose a level only when this note shows it: Emerging, Developing or Secure.</p>
     <label class="f" for="p2ObsPhoto">Add photo (optional)<input class="p2-file" type="file" accept="image/*" id="p2ObsPhoto"></label>
     ${P2.pending&&P2.pending.kid===kid?`<div class="p2-prev"><img src="${esc(P2.pending.src)}" alt="Photo ready to save"><span class="small">Photo ready · <button class="rl" data-p2="clearphoto">Remove</button></span></div>`:''}
     <label style="display:flex;gap:8px;align-items:center;font-size:13.5px" for="p2ObsShare"><input type="checkbox" id="p2ObsShare" style="width:18px;height:18px;accent-color:var(--gold)"> Share with ${esc(k.first)}'s family now (they see the note, date, context and level word)</label>
     <div class="p2-row" style="justify-content:space-between;align-items:center"><span class="p2-priv">${photoNotice()}</span><button class="btn navy" data-p2="saveobs">Save observation</button></div>`:'<p class="small muted">View only.</p>'}</div>
    <div class="card" data-motion="reveal"><h3>Recent observations</h3>${obs.length?`<div>${obs.map(o=>{ const s=STEP[o.step]; return `<div class="p2-obs" data-obs="${esc(o.id)}" style="--c:var(--${s?domFriend(s.domain):(o.domain||'zuri')})"><span class="mini">${s?esc(s.text):'General note'} · ${shortDate(o.date)}${o.context?' · '+esc(ctxLabel(o.context)):''}${o.level&&LVLW[o.level]?' · '+esc(LVLW[o.level].label):''}</span><span class="small">${esc(o.text||'Photo added')}</span><span class="mini" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">${o.shared===true?'<span class="chip ok">Shared with family</span>':'<span class="chip">Teachers only</span>'}${P.canWrite?`<button class="rl" data-p2share="${esc(o.id)}">${o.shared===true?'Stop sharing':'Approve and share with family'}</button>`:''}</span></div>`; }).join('')}</div>`:'<p class="small muted">No observations yet.</p>'}${earlier('obs','notes')}</div>
    <div class="card" data-motion="reveal"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap"><h3>Photos</h3><span class="p2-priv">${photoNotice()}</span></div>${photos.length?`<div class="p2-thumbs">${photos.map(thumb).join('')}</div>`:'<p class="small muted">No photos yet. Add one with an observation or a daily photo moment.</p>'}${earlier('photos','photos')}</div>
   </div></div>`;
}

// ---- teacher: Messages tab
const QR = ['Had a great day!','Needs more diapers/wipes','Please bring a change of clothes'];
function bubbles(kid, side){ const fresh = side==='teacher'?P2.freshT:P2.freshF, ms=thread(kid);
  if(!ms.length) return '<p class="small muted" style="text-align:center">No messages yet. Say hello!</p>';
  return ms.map(m=>{ const mine=m.from===side, other=side==='teacher'?'family':'teacher'; const seen=(m.read||{})[other];
    return `<div class="p2-b ${mine?'me':'them'}">${m.ann?'<span class="an">Announcement to the room</span>':''}<span>${esc(m.text)}</span><span class="mt">${mine?'You':(m.from==='teacher'?'Teacher':`${esc(P.kids[kid]?.first||'')}'s family`)} \u00b7 ${fmtAt(m.at)}${mine?` \u00b7 ${P.live?(window.FFOffline&&window.FFOffline.pending('msgs',m.id)?'Not sent yet':(seen?'Seen':'Delivered')):'Local sample'}`:''}${!mine&&fresh.has(m.id)?' <span class="p2-dot" aria-hidden="true"></span><b>New</b>':''}</span></div>`; }).join(''); }
function messagesView(){
  const kids = roomKids(P.room); if(!kids.length) return `<div class="card"><h3>No children yet</h3><p class="small">Add children on the Children tab to message their families.</p></div>`;
  if(!P2.mk || !kids.some(([id])=>id===P2.mk)) P2.mk = kids[0][0];
  const kid=P2.mk, k=P.kids[kid], dis=P.canWrite?'':'disabled';
  const today=Object.entries(P2.photos).map(([id,p])=>Object.assign({id},p)).filter(p=>p.kind==='moment' && p.room===P.room && safeSrc(p.src)).sort((a,b)=>b.at-a.at).slice(0,12);
  return `<div class="p2-msgs">
   <div class="card" data-motion="reveal" style="padding:14px"><h3 style="padding:4px 6px">Families</h3><div class="p2-threads" role="group" aria-label="Message threads">${kids.map(([id,x])=>{const t=thread(id), last=t[t.length-1], u=unreadFor(id,'teacher');return `<button class="p2-thread" data-p2mk="${id}" aria-pressed="${id===kid}"><b>${esc(x.first)} ${esc(x.last||'')}.</b><span>${u?`<span class="p2-dot"></span><span class="sr-only" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">${u} unread</span>`:''}</span><span class="pv">${last?esc((last.from==='teacher'?'You: ':'')+last.text):'No messages yet'}</span></button>`;}).join('')}</div></div>
   <div style="display:grid;gap:16px">
    <div class="card" data-motion="reveal"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap"><h3>${esc(k.first)}'s family</h3><span class="mini">${P.live?'Two-way classroom messages':'Sample conversation / no message delivery'}</span></div>
     ${earlier('msgs','messages')}<div class="p2-chat" id="p2Chat" aria-live="polite">${bubbles(kid,'teacher')}</div>
     ${P.canWrite?`<div class="p2-qrs" role="group" aria-label="Quick replies">${QR.map(q=>`<button class="p2-qr" data-p2qr="${esc(q)}">${esc(q)}</button>`).join('')}</div>
     <label class="f" for="p2Msg">Message<textarea class="i" id="p2Msg" style="min-height:70px" placeholder="Write to ${esc(k.first)}'s family"></textarea></label>
     <div class="p2-row" style="justify-content:space-between;align-items:center"><label style="display:flex;gap:8px;align-items:center;font-size:13.5px" for="p2All"><input type="checkbox" id="p2All" style="width:18px;height:18px;accent-color:var(--gold)"> Send to all families in this room (${kids.length})</label><button class="btn navy" data-p2="send">Send</button></div>`:''}</div>
    <div class="card" data-motion="reveal"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap"><h3>Daily photo moments</h3><span class="p2-priv">${photoNotice()}</span></div>
     ${today.length?`<div class="p2-strip" tabindex="0" role="region" aria-label="Photo moments in this classroom">${today.map(p=>thumb(Object.assign({},p,{caption:`${P.kids[p.kid]?.first||''}: ${p.caption||''}`}))).join('')}</div>`:'<p class="small muted">No photo moments posted yet.</p>'}
     ${P.canWrite?`<div class="p2-row"><label class="f" for="p2MomKid">Child${sel('p2MomKid', kids.map(([id,x])=>[id,`${x.first} ${x.last||''}.`]), (P2.momentPending&&P2.momentPending.kid)||kid)}</label><label class="f" for="p2MomCap">Caption<input class="i" id="p2MomCap" style="padding:7px 9px" placeholder="e.g. Painting with Zuri's leaf stamps"></label></div>
     <div class="p2-row" style="align-items:center"><label class="f" for="p2MomFile" style="flex:1 1 200px">Photo<input class="p2-file" type="file" accept="image/*" id="p2MomFile"></label>${P2.momentPending?`<div class="p2-prev"><img src="${esc(P2.momentPending.src)}" alt="Photo ready to post"></div>`:''}<button class="btn gold" data-p2="postmoment">Post photo moment</button></div>`:''}</div>
   </div></div>`;
}

// ---- family portal sections
// Family view of Learning Steps: built ONLY from observations a teacher shared (review H1/R1; in the Hub the database returns only
// those, and families read no progress record). A level word appears only where a shared, dated observation backs it.
// Words only: no scores, percentages or comparisons.
function familyLearning(kid){
  const k=P.kids[kid], shared=kidObs(kid).filter(o=>o.shared===true);
  const latest={}; for(const o of shared){ if(o.step && STEP[o.step] && !latest[o.step]) latest[o.step]=o; }   // kidObs is newest first
  const lvl={}; for(const o of shared){ if(o.step && STEP[o.step] && o.level && LVLW[o.level] && !lvl[o.step]) lvl[o.step]=o; }
  const withStep=shared.find(o=>o.step && STEP[o.step]), band=withStep ? STEP[withStep.step].band : null, list=band?bandSteps(band):[];
  const seen=Object.keys(latest).filter(id=>STEP[id].band===band).map(id=>STEP[id]);
  const doing=seen.filter(s=>lvl[s.id] && (lvl[s.id].level==='secure'||lvl[s.id].level==='developing'));
  const next=seen.filter(s=>!lvl[s.id] || lvl[s.id].level!=='secure').slice(0,3);
  for(const s of list){ if(next.length>=3) break; if(!latest[s.id] && !next.some(n=>n.domain===s.domain)) next.push(s); }
  const obs=shared.slice(0,5);
  return `<div class="card p2-fam" data-motion="reveal" id="p2fLearning"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap"><h3>${esc(k.first)}'s learning</h3><span class="mini">${band?esc(BANDS[band]||'')+' Learning Steps':'Learning Steps'}</span></div>
    <p class="small">What teachers saw during play and routines and chose to share with you. These are words, not grades: there are no scores, percentages or comparisons with other children.</p>
    <h4>What we saw</h4>${obs.length?`<div>${obs.map(o=>{ const s=STEP[o.step]; return `<div class="p2-obs" style="--c:var(--${s?domFriend(s.domain):(o.domain||'zuri')})"><span class="mini">${shortDate(o.date)}${o.context?' · '+esc(ctxLabel(o.context)):''}${s?' · '+esc(s.family):''}${o.level&&LVLW[o.level]?' · '+esc(LVLW[o.level].label):''}</span><span class="small">${esc(o.text||'Photo added')}</span></div>`; }).join('')}</div>`:`<p class="small"><span class="p2-lvl none">Not yet observed</span> No observations have been shared yet. That says nothing about what ${esc(k.first)} can do: notes appear here when a teacher shares them.</p>`}
    <h4>Things ${esc(k.first)} is doing now</h4>${doing.length?`<ul>${doing.map(s=>`<li class="small">${esc(s.family)} <span class="p2-lvl" data-l="${esc(lvl[s.id].level)}">${esc(LVLW[lvl[s.id].level].label)}</span> <span class="mini">${shortDate(lvl[s.id].date)}</span></li>`).join('')}</ul>`:'<p class="small muted">Not yet observed. Your child\'s teacher will add these as they see them.</p>'}
    <h4>What's next</h4>${next.length?`<ul>${next.map(s=>`<li class="small">${esc(latest[s.id]?s.next:s.family)}</li>`).join('')}</ul>`:'<p class="small muted">Ideas appear here once a teacher shares an observation.</p>'}
    <h4>Try at home</h4>${next.length?`<ul>${next.map(s=>`<li class="small">${esc(s.home)}</li>`).join('')}</ul>`:'<p class="small muted">Futures at Home has activities for every age while you wait.</p>'}</div>`;
}
function familyGuide(){
  return `<div style="display:grid;gap:16px"><div class="card" data-motion="reveal"><h3>What the words mean</h3><ul style="margin:0;padding-left:18px;display:grid;gap:6px">${FS.levels.map(l=>`<li class="small"><span class="p2-lvl" data-l="${l.key}">${esc(l.label)}</span> ${esc(l.family)}</li>`).join('')}</ul><p class="mini">Every child grows at their own pace and in their own order.</p></div>
   <div class="card p2-ref" data-motion="reveal"><h3>${esc(FS.referral.title)}</h3><ul>${FS.referral.lines.map(l=>`<li>${esc(l)}</li>`).join('')}</ul></div></div>`;
}
function familyExtras(kid){
  const k=P.kids[kid]; if(!k) return ''; const photos=kidPhotos(kid, null, true); // a portfolio photo only once its observation is shared
  return `<div class="p2-jump" role="navigation" aria-label="Family portal sections"><button data-p2jump="p2fProgress">Learning</button><button data-p2jump="p2fMessages">Messages${unreadFor(kid,'family')||thread(kid).some(m=>P2.freshF.has(m.id))?' <span class="p2-dot" aria-label="new messages"></span>':''}</button><button data-p2jump="p2fPhotos">Photos (${photos.length})</button></div>
  <div id="p2fProgress" class="p2-cols" style="scroll-margin-top:90px">${familyLearning(kid)}${familyGuide()}</div>
  <div id="p2fMessages" class="card" data-motion="reveal" style="scroll-margin-top:90px"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap"><h3>Messages with ${esc(P.rooms[k.room]?.name||'the classroom')}</h3><span class="mini">${P.live?'Classroom conversation':'Sample conversation / no message delivery'}</span></div>
   ${earlier('msgs','messages')}<div class="p2-chat" id="p2FChat" aria-live="polite">${bubbles(kid,'family')}</div>
   <label class="f" for="p2FMsg">Message to the teacher<textarea class="i" id="p2FMsg" style="min-height:70px" placeholder="e.g. Grandma is picking up today"></textarea></label>
   <div style="display:flex;justify-content:flex-end"><button class="btn navy" data-p2="fsend">Send</button></div></div>
  <div id="p2fPhotos" class="card" data-motion="reveal" style="scroll-margin-top:90px"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap"><h3>${esc(k.first)}'s photos</h3><span class="p2-priv">${photoNotice()}</span></div>${photos.length?`<div class="p2-thumbs">${photos.map(thumb).join('')}</div>`:'<p class="small muted">No photos yet. Photo moments from the classroom appear here.</p>'}${earlier('photos','photos')}</div>`;
}
// "Watched:" from the episode player's log (localStorage ff-watch-log: {date, ep, min, room})
function watchedLine(k, room, date){
  let log=[]; try{ log=JSON.parse(localStorage.getItem('ff-watch-log')||'[]'); }catch(_){ return ''; } if(!Array.isArray(log)) return '';
  const real=iso(new Date()); const dates=new Set([date]); if(date===todayIso()) dates.add(real); // the report's "today" also counts the real local date
  const rn=String(room.name||'').toLowerCase();
  const hits=log.filter(e=>e && dates.has(e.date) && (!e.room || e.room===k.room || String(e.room).toLowerCase()===rn));
  if(!hits.length) return '';
  const title=e=>{ if(typeof e.ep==='number' || /^\d+$/.test(String(e.ep))){ const x=(D.episodes||[])[+e.ep]; return x?x[0]:`Episode ${e.ep}`; } if(e.ep && typeof e.ep==='object') return String(e.ep.title||e.ep[0]||'Episode'); return String(e.ep||e.title||'Episode'); };
  const titles=[...new Set(hits.map(title))]; const min=Math.round(hits.reduce((a,e)=>a+(+e.min||0),0)*10)/10;
  return `${titles.map(t=>`"${esc(t)}"`).join(', ')} (${min} min)`;
}

// ---- demo seed
function seed2(){ if(P2.seeded) return; P2.seeded=true; const base=new Date(); const at=(dOff,h,m)=>{ const d=new Date(base); d.setDate(d.getDate()+dOff); d.setHours(h,m,0,0); if(d.getTime()>Date.now()) d.setDate(d.getDate()-1); return d.getTime(); };
  const T1=['{n} built a tall block tower and counted every block with Zuri\'s counting cards!','{n} helped a friend find the calm corner today. So kind!','{n} loved our Booker story and asked to read it twice.','{n} tried green beans at lunch and gave them a thumbs up.','{n} was a super helper at clean-up time with Bop.'];
  const F1=['Thank you! {n} talked about it all evening.','Love hearing this. We practiced counting stairs at home.','That made our day. Thanks for sharing!','So glad! Will {n} need anything for the field day?'];
  const T2=['Quick reminder: please bring a change of clothes this week.','Picture day is Friday. Smiles ready!','We are out of wipes for {n}. Please send a pack when you can.'];
  const F2=['{n} had a short night, so may be a little tired today.','Grandpa will pick up at 4:30 today.','Can we chat at pickup about potty training?'];
  Object.entries(P.kids).forEach(([id,k],i)=>{ const n=k.first, f=s=>s.replace(/\{n\}/g,n);
    const add=(mid,o)=>{ if(!P2.msgs[mid]) P2.msgs[mid]=Object.assign({kid:id, room:k.room, sample:true}, o); };
    add(`s_${id}_1`, {from:'teacher', text:f(T1[i%T1.length]), at:at(-1,16,30), read:{teacher:true,family:true}});
    add(`s_${id}_2`, {from:'family', text:f(F1[i%F1.length]), at:at(-1,19,10), read:{teacher:true,family:true}});
    if(i%2===0) add(`s_${id}_3`, {from:'family', text:f(F2[i%F2.length]), at:at(0,7,40), read:{teacher:false,family:true}});
    else add(`s_${id}_3`, {from:'teacher', text:f(T2[i%T2.length]), at:at(0,8,15), read:{teacher:true,family:false}});
    // a starter portfolio so the demo is not empty: two or three Learning Steps with word levels and dated sample notes
    // sample children get a sample band confirmation (recorded as the demo's, with history) so the demo shows a full portfolio
    if(!P2.progress[id]){ const sb=(bandSuggest(id)||{band:'threes'}).band, list=bandSteps(sb), steps={}, lv=['emerging','developing','secure'];
      [0,1,2].slice(0, 2+(i%2)).forEach(j=>{ const s=list[(i*5+j*7)%Math.max(1,list.length)]; if(!s || steps[s.id]) return;
        const d0=new Date(base); d0.setDate(d0.getDate()-2-j*3); while(d0.getDay()===0||d0.getDay()===6) d0.setDate(d0.getDate()-1);
        const oid=`s_${id}_o${j+1}`, note=`${n} ${lcFirst(s.family)} (sample note).`, level=lv[(i+j)%3];
        steps[s.id]={level, date:iso(d0), note, obs:oid, by:'demo', at:at(-2-j*3,10,0)};
        if(!P2.obs[oid]) P2.obs[oid]={kid:id, room:k.room, date:iso(d0), step:s.id, level, domain:domFriend(s.domain), text:note, context:['play','small','routine'][j%3], shared:true, at:at(-2-j*3,10,0), sample:true}; });
      P2.progress[id]={kid:id, band:sb, bandHistory:[{band:sb, from:null, by:'demo', at:at(-14,9,0)}], steps, sample:true}; } });
}

// ---- events for the new sections
document.addEventListener('click', async e=>{
  const t=e.target; if(view!=='portal' && view!=='family-portal') return;
  const ph=t.closest('[data-p2photo]'); if(ph) return openPhoto(ph.dataset.p2photo);
  const jp=t.closest('[data-p2jump]'); if(jp){ const el=document.getElementById(jp.dataset.p2jump); if(el){ el.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth', block:'start'}); const f=el.querySelector('textarea,button'); if(f && jp.dataset.p2jump==='p2fMessages') setTimeout(()=>f.focus({preventScroll:true}),300); } return; }
  const tb=t.closest('[data-ptab]'); if(tb && tb.dataset.ptab==='messages'){ const ks=roomKids(P.room); if(!P2.mk || !ks.some(([id])=>id===P2.mk)) P2.mk=ks[0]&&ks[0][0]; if(P2.mk){ await markRead(P2.mk,'teacher'); render(); scrollChat(); } return; }
  const sp=t.closest('[data-p2step]'); if(sp){ P2.stepSel=sp.dataset.p2step; render(); const card=document.getElementById('p2ObsCard'); if(card) card.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth', block:'start'}); const ta=$('#p2ObsText'); if(ta) ta.focus({preventScroll:true}); return; }
  const pk=t.closest('[data-p2kid]'); if(pk){ P2.pk=pk.dataset.p2kid; P2.pending=null; P2.stepSel=null; render(); const b=document.querySelector(`[data-p2kid="${P2.pk}"]`); if(b) b.focus(); return; }
  const mk=t.closest('[data-p2mk]'); if(mk){ P2.mk=mk.dataset.p2mk; await markRead(P2.mk,'teacher'); render(); const b=document.querySelector(`[data-p2mk="${P2.mk}"]`); if(b) b.focus(); scrollChat(); return; }
  const ea=t.closest('[data-p2earlier]'); if(ea && P.hub && WINDOWED.includes(ea.dataset.p2earlier)){ const c=ea.dataset.p2earlier; P2.since[c]=weeksBefore(P2.since[c]||iso(new Date()), WIN_WEEKS); sub2(c); render(); toast(`Loading from ${shortDate(P2.since[c])}`); const b=document.querySelector(`[data-p2earlier="${c}"]`); if(b) b.focus(); return; }
  const qr=t.closest('[data-p2qr]'); if(qr){ const ta=$('#p2Msg'); if(ta){ ta.value=qr.dataset.p2qr; ta.focus(); } return; }
  if(!P.canWrite && !(P.hub && P.role==='family' && t.closest('[data-p2="fsend"]'))) return;
  const sh=t.closest('[data-p2share]'); if(sh){ const id=sh.dataset.p2share, o=P2.obs[id]; if(!o) return; const x=Object.assign({}, o, {shared:o.shared!==true}); delete x.shared_by; delete x.shared_at;
    await put2('obs', id, x); if(o.photo && P2.photos[o.photo] && !P.hub){ await put2('photos', o.photo, Object.assign({}, P2.photos[o.photo], {shared:x.shared})); } // in the Hub the database moves the photo with it
    toast(x.shared?'Shared with the family':'No longer shared with the family'); return render(); }
  const a=t.closest('[data-p2]'); if(!a) return; const act=a.dataset.p2;
  if(act==='clearphoto'){ P2.pending=null; return render(); }
  if(act==='saveobs'){ const kid=P2.pk, text=($('#p2ObsText').value||'').trim(), date=$('#p2ObsDate').value||P.date, step=$('#p2ObsStep').value, level=$('#p2ObsLvl').value; const photo=P2.pending&&P2.pending.kid===kid?P2.pending:null;
    if(!text && !photo){ $('#p2ObsText').focus(); toast('Write a note or add a photo first'); return; }
    if(level && !STEP[step]){ $('#p2ObsStep').focus(); toast('Choose the Learning Step this level is for'); return; }
    if(level && !text){ $('#p2ObsText').focus(); toast('A level needs a note about what you saw'); return; }
    if(level && !bandOf(kid)){ toast('Confirm the Learning Steps set first'); return; }
    const share=!!($('#p2ObsShare')||{}).checked, ctx=($('#p2ObsCtx')||{}).value||'';
    const s=STEP[step], oid=uid('o'); const o={kid, room:P.kids[kid].room, date, domain:s?domFriend(s.domain):'zuri', text, shared:share, at:Date.now(), by:P.me||'demo'}; if(s) o.step=s.id; if(s && level) o.level=level; if(ctx) o.context=ctx;
    if(photo){ const pid=uid('ph'); o.photo=pid; const ok=await put2('photos', pid, {kid, room:o.room, date, src:photo.src, caption:text?text.slice(0,60):(s?s.family.slice(0,60):'Learning moment'), kind:'portfolio', shared:share, domain:o.domain, at:Date.now(), by:P.me||'demo'}); if(ok===false) return; }
    await put2('obs', oid, o);
    if(s && level){ const pr=Object.assign({kid}, P2.progress[kid]); delete pr.ms; delete pr.sample; pr.steps=Object.assign({}, pr.steps); pr.steps[s.id]={level, date, note:text, obs:oid, by:P.me||'demo', at:Date.now()}; pr.by=P.me||'demo'; pr.at=Date.now(); await put2('progress', kid, pr); }
    P2.pending=null; P2.stepSel=null; toast(share?'Observation saved and shared with the family':'Observation saved for teachers. Share it with the family when it is ready.'); return render(); }
  if(act==='confirmband'){ const kid=P2.pk, b=($('#p2Band')||{}).value; if(!BANDS[b]){ const el=$('#p2Band'); if(el) el.focus(); toast('Choose a Learning Steps set first'); return; }
    const cur=P2.progress[kid]||{}; if(cur.band===b){ toast('That set is already confirmed'); return; }
    const pr=Object.assign({kid}, cur, {band:b}); delete pr.ms; delete pr.sample; pr.bandHistory=(cur.bandHistory||[]).concat([{band:b, from:cur.band||null, by:P.me||'demo', at:Date.now()}]); // the Hub keeps its own copy (actor and time from the database)
    P2.stepSel=null; await put2('progress', kid, pr); toast(`${BANDS[b]} set confirmed for ${P.kids[kid].first}`); return render(); }
  if(act==='send'){ const ta=$('#p2Msg'), text=(ta.value||'').trim(); if(!text){ ta.focus(); return; } const all=$('#p2All').checked; const kids=all?roomKids(P.room).map(([id])=>id):[P2.mk]; const ann=all?uid('a'):null;
    for(const kid of kids) await put2('msgs', uid('m'), {kid, room:P.kids[kid].room, date:iso(new Date()), from:'teacher', text, ann, at:Date.now(), by:P.me||'demo', read:{teacher:true,family:false}});
    toast(all?`Announcement sent to ${kids.length} families`:'Message sent'); render(); scrollChat(); const n=$('#p2Msg'); if(n) n.focus(); return; }
  if(act==='postmoment'){ const mp=P2.momentPending; if(!mp){ const f=$('#p2MomFile'); if(f) f.focus(); toast('Choose a photo first'); return; } const kid=$('#p2MomKid').value, cap=($('#p2MomCap').value||'').trim();
    const okm=await put2('photos', uid('ph'), {kid, room:P.kids[kid].room, date:P.date, src:mp.src, caption:cap, kind:'moment', at:Date.now(), by:P.me||'demo'}); if(okm===false) return; P2.momentPending=null; toast(P.live?`Photo moment saved for ${P.kids[kid].first}`:'Sample photo saved on this browser'); return render(); }
  if(act==='fsend'){ const kid=P.fam.kid, ta=$('#p2FMsg'), text=(ta.value||'').trim(); if(!text){ ta.focus(); return; }
    await put2('msgs', uid('m'), {kid, room:P.kids[kid].room, date:iso(new Date()), from:'family', text, at:Date.now(), by:P.me||'demo', read:{teacher:false,family:true}}); toast(P.live?'Message saved':'Sample message saved on this browser'); render(); scrollChat(); const n=$('#p2FMsg'); if(n) n.focus(); return; }
});
document.addEventListener('change', async e=>{
  const t=e.target; if(view!=='portal' && view!=='family-portal') return;
  if(t.id==='p2ObsPhoto' || t.id==='p2MomFile'){ const f=t.files&&t.files[0]; if(!f) return; try{ const src=await downscale(f);
      if(t.id==='p2ObsPhoto'){ P2.pending={kid:P2.pk, src}; } else { const kidSel=$('#p2MomKid'); P2.momentPending={src, kid:kidSel?kidSel.value:P2.mk}; const cap=$('#p2MomCap'); P2.momentCap=cap?cap.value:''; }
      const keep = t.id==='p2ObsPhoto' ? {text:($('#p2ObsText')||{}).value, date:($('#p2ObsDate')||{}).value, step:($('#p2ObsStep')||{}).value, lvl:($('#p2ObsLvl')||{}).value} : null;
      render();
      if(keep){ if($('#p2ObsText')) $('#p2ObsText').value=keep.text||''; if(keep.date&&$('#p2ObsDate')) $('#p2ObsDate').value=keep.date; if(keep.step&&$('#p2ObsStep')) $('#p2ObsStep').value=keep.step; if(keep.lvl&&$('#p2ObsLvl')) $('#p2ObsLvl').value=keep.lvl; }
      else if($('#p2MomCap')) $('#p2MomCap').value=P2.momentCap||'';
      toast('Photo ready'); }catch(_){ toast('That file could not be read as a photo.'); } return; }
});
function scrollChat(){ ['p2Chat','p2FChat'].forEach(id=>{ const c=document.getElementById(id); if(c) c.scrollTop=c.scrollHeight; }); }
// family view: show the new sections and mark the family's messages read (they keep a "New" tag for this visit)
const famBase = V['family-portal'];
V['family-portal'] = () => { const html=famBase(); const kid=P.fam.kid; if(!kid || !P.kids[kid]) return html;
  if(unreadFor(kid,'family')) setTimeout(async()=>{ await markRead(kid,'family'); if(view==='family-portal') render(); },0);
  setTimeout(scrollChat,0);
  let out = html.replace(/<\/div><\/section>$/, familyExtras(kid)+'</div></section>');
  if (P.hub && window.FFReport) { const rep = window.FFReport.familyToday(rhythmCtx()); if (rep) out = out.replace(FR_ANCHOR, ()=>rep+FR_ANCHOR); } // evening report (family-report.js): the one published report
  if (P.hub && window.FFRhythm) { const card = window.FFRhythm.familyCard(rhythmCtx()); if (card) out = out.replace(FR_ANCHOR, ()=>card+FR_ANCHOR); } // "Today" card (daily-rhythm.js)
  if (P.hub && window.FFArrival && P.role==='family') { const pk = window.FFArrival.familyCard(rhythmCtx()); if (pk) out = out.replace(/<\/div><\/section>$/, ()=>pk+'</div></section>'); } // who can pick up (arrival.js)
  return out; };
const portalBase = V.portal;
V.portal = () => { const html=portalBase(); if(P.tab==='messages') setTimeout(scrollChat,0); return html; };
// W4 (W3E-N3): in the Hub, messages, photos and observations load the last WIN_WEEKS weeks (by the day they are dated); "Load
// earlier" widens one list by WIN_WEEKS more. Realtime keeps updating the loaded rows; a new row is dated today, so it is always in.
const WIN_WEEKS = 8, WINDOWED = ['obs','photos','msgs'];
P2.since = {}; P2.unsub = {};
const weeksBefore = (date, n) => { const d=fromIso(date); d.setDate(d.getDate()-7*n); return iso(d); };
const winFrom = c => P.hub && P2.since[c] ? P2.since[c] : null;
function earlier(c, what){ const f=winFrom(c); if(!f) return '';
  return `<p class="p2-earlier mini" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:8px 0 0"><span>Showing ${what} from ${shortDate(f)} on.</span><button class="btn soft" style="padding:4px 10px" data-p2earlier="${c}">Load earlier ${what} (${WIN_WEEKS} more weeks)</button></p>`; }
function sub2(c){ if(!P.db) return; const old=P2.unsub[c];
  let ref=P.db.collection(c); if(P.hub && WINDOWED.includes(c)){ if(!P2.since[c]) P2.since[c]=weeksBefore(iso(new Date()), WIN_WEEKS); ref=ref.where('date','>=',P2.since[c]); }
  P2.unsub[c]=ref.onSnapshot(q=>{ const o={}; q.docs.forEach(d=>o[d.id]=JSON.parse(JSON.stringify(d.data()))); P2[c]=o; if(view==='portal'||view==='family-portal') render(); }, ()=>{});
  if(typeof old==='function') old(); }
function subscribe2(){ if(!P.db) return; C2.forEach(sub2); }

// ---------------- events
document.addEventListener('click', async e=>{
  const t=e.target; if(view!=='portal' && view!=='family-portal') return;
  const tb=t.closest('[data-ptab]'); if(tb){ P.tab=tb.dataset.ptab; return render(); }
  const dy=t.closest('[data-day]'); if(dy){ P.date=dy.dataset.day; if(!dy.dataset.keep) P.tab='today'; subscribeKd(); return render(); }
  const mo=t.closest('[data-mon]'); if(mo){ const d=fromIso(P.date); d.setDate(1); d.setMonth(d.getMonth()+(+mo.dataset.mon)); while(d.getDay()===0||d.getDay()===6) d.setDate(d.getDate()+1); P.date=iso(d); subscribeKd(); return render(); }
  const rp=t.closest('[data-report]'); if(rp){ if(P.hub && window.FFReport){ P.tab='reports'; return render(); } P.fam={kid:rp.dataset.report,date:P.date}; return go('family-portal'); } // hub: the published report's preview
  const pgs=t.closest('[data-prog-save]'); if(pgs && P.canWrite){ await saveProgram(pgs.dataset.progSave, +pgs.dataset.progV||1); return render(); }
  const pga=t.closest('[data-prog-all]'); if(pga && P.canWrite){ PG.confirm[pga.dataset.progAll]=true; return render(); }               // step 1: show who and the exceptions
  const pgk=t.closest('[data-prog-all-ok]'); if(pgk && P.canWrite && PG.confirm[pgk.dataset.progAllOk]){ await saveProgramAll(pgk.dataset.progAllOk, +pgk.dataset.progV||1); return render(); }
  const pgn=t.closest('[data-prog-all-cancel]'); if(pgn){ delete PG.confirm[pgn.dataset.progAllCancel]; return render(); }
  const pgc=t.closest('[data-prog-sched]'); if(pgc && P.canWrite && P.hub && window.FFProgram){ const v=($('#pgStart')||{}).value; if(!v){ const f=$('#pgStart'); if(f) f.focus(); return; }
    try{ await window.FFProgram.schedule(rhythmCtx(), P.room, pgc.dataset.progSched, v); toast(`${relName(pgc.dataset.progSched)} scheduled`); }catch(err){ toast(err && err.message ? err.message : 'That did not save.'); } return render(); }
  const lm=t.closest('[data-lmode]'); if(lm && P.canWrite){ const d=dayDoc(P.room,P.date); d.lunch=Object.assign({},d.lunch,{mode:lm.dataset.lmode}); await put('days',dayKey(P.room,P.date),d); return render(); }
  const at=t.closest('[data-att]'); if(at && P.canWrite){ const id=at.dataset.att, x=kdDoc(id,P.date); x.present = at.dataset.v==='1'; await put('kidday',kdKey(id,P.date),x); return render(); }
  const rr=t.closest('[data-rmroom]'); if(rr){ if(!rr.dataset.armed){ rr.dataset.armed=1; rr.textContent='Click again to remove'; return; } await del('rooms', rr.dataset.rmroom); P.room=null; return render(); }
  const p=t.closest('[data-p]'); if(!p) return; const a=p.dataset.p;
  if(a==='sample') return loadSample();
  if(a==='addroom'){ const n=($('#rName').value||'').trim(); if(!n){ $('#rName').focus(); return; } const id='r'+Date.now().toString(36); await put('rooms',id,{name:n,ages:$('#rAges').value,level:1,order:Object.keys(P.rooms).length+1}); P.room=id; toast('Classroom added'); return render(); }
  if(a==='addkid'){ const f=($('#kFirst').value||'').trim(); if(!f){ $('#kFirst').focus(); return; } await put('kids','k'+Date.now().toString(36),{first:f,last:($('#kLast').value||'').trim().toUpperCase(),room:P.room}); toast('Child added'); return render(); }
  if(a==='allhere'){ for(const [id] of roomKids(P.room)){ const x=kdDoc(id,P.date); if(x.present!==true){ x.present=true; await put('kidday',kdKey(id,P.date),x);} } return render(); }
  if(a==='lunchrest'){ let n=0; for(const [id] of roomKids(P.room)){ const x=kdDoc(id,P.date); if(x.present===false || (x.meals&&x.meals.lunch)) continue; x.meals=Object.assign({},x.meals,{lunch:'Not recorded'}); x.by=P.me||'demo'; await put('kidday',kdKey(id,P.date),x); n++; } toast(n?`Lunch marked "Not recorded" for ${n} ${n===1?'child':'children'}`:'Every child already has a lunch entry'); return render(); }
});
document.addEventListener('change', async e=>{
  const t=e.target; if(view!=='portal' && view!=='family-portal') return;
  if(t.id==='pRoom'){ P.room=t.value; subscribeDays(); return render(); }
  if(t.id==='pDate'){ if(t.value){ P.date=t.value; subscribeKd(); } return render(); }
  if(t.id==='fKid'){ P.fam.kid=t.value; return render(); }
  if(t.id==='fDate'){ if(t.value){ P.fam.date=t.value; P.date=t.value; subscribeKd(); } return render(); }
  if(!P.canWrite) return;
  if(t.dataset.progKid){ const r=t.dataset.progRec, v=t.value==='yes'?true:(t.value==='no'?false:null); PG.draft[r]=Object.assign({}, PG.draft[r]);   // participation draft: an explicit choice per child
    if(v===null) delete PG.draft[r][t.dataset.progKid]; else PG.draft[r][t.dataset.progKid]=v; if(PG.confirm[r]) return render(); return; }
  if(t.dataset.check){ const d=dayDoc(P.room,P.date); d.checks=Object.assign({},d.checks); if(t.checked) d.checks[t.dataset.check]=stamp(); else delete d.checks[t.dataset.check]; await put('days',dayKey(P.room,P.date),d); if (P.hub && t.dataset.check==='episode' && window.FFRhythm && !window.FFRhythm.screensBlocked(P.room)) await window.FFRhythm.syncEpisode(P.room,P.date,d); return render(); }
  if(t.id==='epMin'){ const d=dayDoc(P.room,P.date); d.episode={min:Math.max(0,Math.min(6,+t.value||0))}; await put('days',dayKey(P.room,P.date),d); if (P.hub && window.FFRhythm && !window.FFRhythm.screensBlocked(P.room)) await window.FFRhythm.syncEpisode(P.room,P.date,d); return render(); }
  if(t.id==='dayNotes'){ const d=dayDoc(P.room,P.date); d.notes=t.value.trim(); d.notesBy=P.me||'demo'; await put('days',dayKey(P.room,P.date),d); toast('Notes saved'); return; }
  if(t.id==='pLevel'){ const r=Object.assign({},P.rooms[P.room],{level:+t.value}); await put('rooms',P.room,r); return render(); }
  if(t.id==='lAllergy' && window.FFMeals && !window.FFMeals.textOk(t.value)){ toast('Not saved: leave out health details. A swap for one child belongs in that child\'s meal instruction.'); t.value=(dayDoc(P.room,P.date).lunch.custom||{}).allergy||''; return; }
  if(t.dataset.lfield || t.id==='lDish' || t.id==='lAllergy'){ const d=dayDoc(P.room,P.date); const c=Object.assign({},d.lunch.custom); if(t.dataset.lfield) c[t.dataset.lfield]=t.value; if(t.id==='lDish') c.dish=t.value.trim(); if(t.id==='lAllergy') c.allergy=t.value.trim(); d.lunch={mode:'custom',custom:c,by:P.me||'demo'}; await put('days',dayKey(P.room,P.date),d); return render(); }
  if(t.dataset.kf){ const id=t.dataset.kid, x=kdDoc(id,P.date); x.meals=Object.assign({},x.meals);
    if(t.dataset.kf==='present') x.present = t.value===''?null:t.value==='1';
    if(t.dataset.kf==='meal') x.meals[t.dataset.meal]=t.value;
    if(t.dataset.kf==='nap') x.nap=t.value; if(t.dataset.kf==='star') x.star=t.checked; if(t.dataset.kf==='note') x.note=t.value.trim();
    x.by=P.me||'demo'; await put('kidday',kdKey(id,P.date),x); if(t.dataset.kf!=='note') render(); else toast('Note saved'); const el=document.getElementById(t.id); if(el) el.focus(); return; }
});

// ---------------- live data
// Documents from the Futures Hub backend may be shaped a little differently from what this screen writes
// (seed data keeps a full name, a message time as `ts`, ids that are not day/kid keys). Read them tolerantly.
const dayDocKey = d => { const x=d.data(); return x && x.room && x.date ? dayKey(x.room,x.date) : d.id; };
const kdDocKey = d => { const x=d.data(); return x && x.kid && x.date ? kdKey(x.kid,x.date) : d.id; };
const normKid = x => { if(!x || x.first!==undefined || !x.name) return x; const w=String(x.name).trim().split(/\s+/), last=w.length>1?w.pop():''; return Object.assign({}, x, {first:w.join(' ')||String(x.name), last:last.charAt(0).toUpperCase()}); };
const normRoom = (id,x) => { const o={twos:1,threes:2,prek:3}[id]; return x && x.order==null && o ? Object.assign({}, x, {order:o}) : x; };
const normKd = x => (x && typeof x.meals==='string') ? Object.assign({}, x, {meals:{}}) : x;
// W4 (W3E-N3): in the Hub a room's day records load from WIN_WEEKS weeks back, and further back only when the chosen date needs it
// (its calendar month and that month's first week); in sample mode, every day as before
function daysFrom(){ const d=fromIso(P.date); d.setDate(1); d.setDate(d.getDate()-7); const need=iso(d), recent=weeksBefore(iso(new Date()), WIN_WEEKS); return need<recent?need:recent; }
function ensureDays(){ if(P.hub && P.daysSince && daysFrom()<P.daysSince) subscribeDays(); }
function subscribeDays(){ if(!P.db||!P.room) return; if(P.unsubDays) P.unsubDays();
  let ref=P.db.collection('days').where('room','==',P.room); if(P.hub){ P.daysSince=daysFrom(); ref=ref.where('date','>=',P.daysSince); }
  P.unsubDays = ref.onSnapshot(q=>{ q.docs.forEach(d=>{ P.days[dayDocKey(d)]=JSON.parse(JSON.stringify(d.data())); }); const ids=[]; Object.values(P.days).forEach(d=>Object.values(d.checks||{}).forEach(c=>ids.push(c.by))); names(ids); if(view==='portal'||view==='family-portal') render(); }, ()=>{}); }
function subscribeKd(){ if(!P.db) return; ensureDays(); const dt = view==='family-portal' && P.fam.date ? P.fam.date : P.date; if(P.kdDate===dt) return; P.kdDate=dt; if(P.unsubKd) P.unsubKd();
  P.unsubKd = P.db.collection('kidday').where('date','==',dt).onSnapshot(q=>{ q.docs.forEach(d=>{ P.kd[kdDocKey(d)]=normKd(JSON.parse(JSON.stringify(d.data()))); }); if(view==='portal'||view==='family-portal') render(); }, ()=>{}); }
function goLive(){
  P.live = true; P.rooms = {}; P.kids = {}; P.room = null;
  C2.forEach(c=>P2[c]={}); subscribe2();
  P.db.collection('rooms').onSnapshot(q=>{ const r={}; q.docs.forEach(d=>r[d.id]=normRoom(d.id,d.data()));
    if (!Object.keys(r).length && !P.canWrite && !P.hub) { P.live=false; for (const [id,x] of Object.entries(SAMPLE_ROOMS)) r[id]=Object.assign({sample:true},x); if(!Object.keys(P.kids).length) SAMPLE_KIDS.forEach((k,i)=>P.kids['k'+(i+1)]={first:k[0],last:k[1],room:k[2],sample:true}); }
    else P.live=true;
    P.rooms=r; if(!P.room||!r[P.room]){ const f=Object.entries(r).sort((a,b)=>(a[1].order||9)-(b[1].order||9))[0]; P.room=f?f[0]:null; } subscribeDays(); if(view==='portal'||view==='family-portal') render(); }, ()=>{});
  P.db.collection('kids').onSnapshot(q=>{ const k={}; q.docs.forEach(d=>k[d.id]=normKid(d.data())); if(!P.live && !Object.keys(k).length) return; P.kids=k; if(view==='portal'||view==='family-portal') render(); }, ()=>{});
  subscribeKd();
  if(view==='portal'||view==='family-portal') render();
}
// Futures Hub backend (hub-backend.js): only present when window.FF_HUB is configured. Called at load (saved
// session) and after sign-in. Returns {role} when connected, null when nobody is signed in.
let hubBusy=null;
async function connectHub(){
  const hub=window.FFHub; if(!hub || !hub.configured) return null;
  if(P.hub) return {role:P.role};
  if(hubBusy) return hubBusy;
  return hubBusy=(async()=>{ try{
    const c=await hub.connect(); if(!c) return null;
    P.hub=true; P.role=c.role; P.email=c.email; P.center=c.center; P.user=c.user; P.me=c.userId; P.canWrite=(await c.user.can('data.write'))!==false; P.db=c.db;
    P.days={}; P.kd={}; P.kdDate=null; P.daysSince=null; P2.since={}; P.tab='today'; P.fam={kid:null,date:null}; P2.pk=null; P2.mk=null; P2.pending=null; P2.momentPending=null;
    goLive(); if (window.FFRhythm) window.FFRhythm.boot(rhythmCtx()); return {role:c.role};
  } finally { hubBusy=null; } })();
}
(async ()=>{
  // demo seed so the portals work anywhere; replaced by live data when the store is available
  for (const [id,r] of Object.entries(SAMPLE_ROOMS)) P.rooms[id]=Object.assign({sample:true},r);
  SAMPLE_KIDS.forEach((k,i)=>P.kids['k'+(i+1)]={first:k[0],last:k[1],room:k[2],sample:true});
  P.room='threes';
  seed2(); ls2Load();
  if (window.FFHub && window.FFHub.configured) { window.FFHub.boot(); return; }
  if (!window.claude || !window.claude.use) return;
  P.user = await window.claude.use('user');
  if (P.user){ try{ P.me = await P.user.id(); }catch(_){} try{ const w=await P.user.can('data.write'); if(w===false) P.canWrite=false; }catch(_){} }
  P.db = await window.claude.use('db'); if(!P.db) return;
  goLive();
})();
// state the Whole-Child Daily Rhythm screens (daily-rhythm.js) need; read-only copies, so that file cannot change portal state
function rhythmCtx(){ return {hub:P.hub, role:P.role, center:P.center, room:P.room, date:P.date, rooms:P.rooms, kids:P.kids, fam:P.fam, canWrite:P.canWrite, tab:P.tab}; }
window.FFPortal = {subscribeKd, connectHub, ctx:rhythmCtx, rerender:()=>render()};
})();
