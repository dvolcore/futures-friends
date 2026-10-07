/* Futures Hub DEMO mode: the screens (owner 2026-10-07, client demonstrations: "I need everything operational and working").
   demo-core.js holds the fake data and the demo session; this file draws what a demo account sees and wires every button:
     - Sign-in (#signin-teacher, #signin-family): "Sign in as Demo Teacher / Director / Family / Academy staff", or the documented demo
       email + password. #portal and #family-portal ask for a demo sign-in first. #account and #reset-password run demo flows.
     - Teacher Portal (portal.js, with the demo database): Today, Check-in (times, pickup, care log, naps), Daily plan (the teacher's
       OWN six-step plans, submitted for approval; the public Day 9 sample to look at), Children, Progress (area-tagged notes),
       Messages (sample pictures, no uploads), Family reports (built from the day, sent to families).
     - Director: Dashboard (attendance, ratios, what is due), Staff, Approvals, Enrollment desk, Reports (+ every teacher tab).
     - Family Portal: the child's day (check-in time, plan, report, notes, messages), friend videos and Futures at Home links.
     - Academy (#learn, #learn-course/F-101): course list, the "Meet the Friends" sample lesson video, progress, a demo completion record.
   Everything is labelled "Demo, sample data, resets anytime". No curriculum is shown beyond what the public site already carries
   (the unit outline in data.js, the six step NAMES of the learning loop, the public Day 9 sample PDF, the Learning Steps AREAS).
   Nothing here sends data anywhere. Does nothing when a real Futures Hub is configured. */
(function(){
'use strict';
if (typeof V === 'undefined' || !window.FFDemo) return;
const DM = window.FFDemo;
const on = () => DM.enabled();
const api = () => (window.FFPortal && window.FFPortal.demoApi) || null;
const ses = () => DM.session();
const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const FR = ['booker','lumi','zuri','bop'], FNAME = {booker:'Booker', lumi:'Lumi', zuri:'Zuri', bop:'Bop'};
const FS = () => window.FFSteps || {domains:[], levels:[], bands:[]};
const areaLabel = k => ((FS().domains || []).find(d => d.key === k) || {}).label || '';
const LOOP = [['watch','Watch','A friend story, told with puppets for now'],['talk','Talk','The teacher asks what happened and why'],['do','Do','A connected hands-on activity'],
  ['move','Move','Movement, role play, art or a song'],['explore','Explore','The four learning zones, all day'],['home','Take home','A question and activity for families']];
const STEP_FRIEND = {watch:'lumi', talk:'booker', do:'zuri', move:'bop', explore:'lumi', home:'gold'};
const DS = {open:{}, armed:{}, plan:{}, review:{}, tour:{}, enroll:{}, out:{}, quiz:{}, quizRes:null, lesson:null, msg:'', pw:null, reset:null, mfa:null, pin:null};
const fmtTime = ms => ms ? new Date(ms).toLocaleTimeString('en-US', {hour:'numeric', minute:'2-digit'}) : '';
const nowOn = date => { const n = new Date(), d = api() ? api().fromIso(date) : new Date(); d.setHours(n.getHours(), n.getMinutes(), 0, 0); return d.getTime(); };
const shortD = s => { try { return api().shortDate(s); } catch (_) { return s; } };
const chipFor = st => ({draft:['','Draft'], submitted:['warn','Waiting for approval'], approved:['ok','Approved'], returned:['bad','Returned with a note']}[st] || ['','No plan yet']);
const roleLabel = r => ({teacher:'Demo Teacher', director:'Demo Director', family:'Demo Family', academy:'Demo Academy staff'}[r] || 'Demo');
const BADGE = '<span class="ffd-badge" role="note"><span aria-hidden="true">●</span> Demo · sample data, resets anytime</span>';
const say = m => { try { toast(m); } catch (_) {} };
function rerender(focus){ render(); if (focus) { const el = document.querySelector(focus); if (el) try { el.focus({preventScroll:true}); } catch (_) {} } }
const kidsOf = room => { const a = api(); return a ? a.roomKids(room) : []; };
const ctx = () => window.FFPortal ? window.FFPortal.ctx() : {};

// ---------------------------------------------------------------- sign-in
function accountsTable(){
  return `<details class="ffd-accts" open><summary>Demo accounts (fake, for this demo only)</summary><div class="tw"><table><caption class="sr-only">Demo accounts</caption><tr><th scope="col">Sign in as</th><th scope="col">Email</th><th scope="col">Password</th></tr>
   ${DM.ACCOUNTS.map(a => `<tr><td>${E(a.label)}</td><td><code>${E(a.email)}</code></td><td><code>${E(a.password)}</code></td></tr>`).join('')}</table></div>
   <p class="mini">These accounts exist only inside this page. Never type a real email or password here.</p></details>`;
}
function whoIn(k){
  const st = DM.all('staff'), fam = DM.familyKids()[0], kid = fam ? DM.get('kids', fam) : null;
  const room = (DM.get('rooms', 'demo') || {}).name || 'a classroom';
  if (k === 'teacher') return st['s-alana'] ? `${st['s-alana'].name} \u00b7 ${room}` : `New teacher \u00b7 ${room}`;
  if (k === 'director') return `${(st['s-dana'] || {}).name || 'Owner'} \u00b7 owner, the whole center`;
  if (k === 'academy') return st['s-devin'] ? `${st['s-devin'].name} \u00b7 staff training` : 'A staff member \u00b7 staff training';
  return kid ? `${DM.familyName() || 'A parent'} \u00b7 ${kid.first} ${kid.last}.\u2019s family` : 'No family invited yet';
}
function centerPick(id, label){
  const cur = DM.center().id;
  return `<label class="f ffd-cpick" for="${id}">${E(label || 'Center')}<select class="i" id="${id}" data-dm-ch="center">${DM.centers().map(c => `<option value="${E(c.id)}" ${c.id === cur ? 'selected' : ''}>${E(c.name)} \u00b7 ${E(DM.TYPE_LABEL[c.type])}, ${E(c.state)}</option>`).join('')}</select></label>`;
}
function centerChip(c, dark){ c = c || DM.center(); return `<span class="ffd-center${dark ? ' ffd-dark' : ''}" style="--cc:${E(c.color)}"><span class="ffd-dot" aria-hidden="true"></span><b>${E(c.name)}</b> <span>${E(DM.TYPE_LABEL[c.type])} \u00b7 ${E(c.state)}</span></span>`; }
function roleButtons(first){
  const order = first === 'family' ? ['family','teacher','director','academy'] : ['teacher','director','academy','family'];
  return `<div class="ffd-roles" role="group" aria-label="Choose a demo account">${order.map((k, i) => { const a = DM.ACCOUNTS.find(x => x.key === k);
    const f = {teacher:'booker', director:'zuri', family:'lumi', academy:'bop'}[k];
    return `<button type="button" class="ffd-role${i === 0 ? ' is-first' : ''}" style="--c:var(--${f})" data-demo-signin="${k}"><img src="${E(FFcut(f))}" alt="" width="44" height="44"><span><b>Sign in as ${E(a.label)}</b><span class="mini">${E(whoIn(k))}</span></span></button>`; }).join('')}</div>`;
}
function signinCard(who){
  const s = ses();
  if (s) return `<div class="card signin ffd-card" id="ffdSignedIn">${BADGE}<h2 class="h3">You are signed in to the demo</h2>
   <p class="small">Signed in as <b>${E(s.name)}</b> (${E(s.label)}) at ${E(DM.CENTER)}.</p>${centerChip()}
   <div class="ffd-row"><button class="btn gold" type="button" data-demo="home">Open my ${s.role === 'family' ? 'Family Portal' : s.role === 'academy' ? 'training' : s.role === 'director' ? 'Director Portal' : 'Teacher Portal'}</button><button class="btn soft" type="button" data-demo="signout">Sign out</button></div></div>`;
  const fam = who === 'Family';
  return `<div class="card signin ffd-card" id="ffdSignin">${BADGE}<h2 class="h3">Try the Futures Hub demo</h2>
   <p class="small">The live Futures Hub is not open to the public yet. This demo works the same way with made-up sample data for <b>${E(DM.CENTER)}</b>. It runs only in this browser: nothing you do is sent anywhere.</p>
   ${centerPick('ffdCenterSignin', 'Sign in to this demo center')}
   ${roleButtons(fam ? 'family' : 'teacher')}
   <p class="small ffd-new">Running your own program? <button type="button" class="rl" data-go="start-center">Start your center (demo)</button></p>
   <form class="ffd-form" id="ffdSigninForm" data-who="${fam ? 'family' : 'teacher'}" novalidate><h3 class="h4">Or sign in with a demo account</h3>
    <label class="f" for="ffdEmail">Email<input class="i" id="ffdEmail" name="email" type="email" autocomplete="off" spellcheck="false" placeholder="${fam ? 'family' : 'teacher'}@demo.futuresfriends"></label>
    <label class="f" for="ffdPass">Password<input class="i" id="ffdPass" name="password" type="password" autocomplete="off" placeholder="demo"></label>
    <button class="btn navy" type="submit">Sign in</button>
    <p class="note" id="ffdMsg" role="alert" aria-live="polite"></p>
    <p class="mini"><button type="button" class="rl" data-go="reset-password${fam ? '/family' : ''}">Forgot your password?</button></p></form>
   ${accountsTable()}
   <p class="note">For a real center account, <button type="button" class="rl" data-go="contact">contact Futures Learning Center</button>.</p></div>`;
}
const signinPage = (who, k, lead) => phero(`${who} Sign-In`, 'Welcome back', lead || '', {chars:[k]}) + `<section class="band-paper"><div class="wrap">${signinCard(who)}</div></section>`;
['Teacher','Family'].forEach(who => {
  const key = 'signin-' + who.toLowerCase(), base = V[key];
  V[key] = () => on() ? signinPage(who, who === 'Family' ? 'lumi' : 'booker') : base();
});

// #portal and #family-portal: a demo sign-in first
const basePortal = V.portal, baseFamily = V['family-portal'];
V.portal = () => {
  if (!on()) return basePortal();
  const s = ses();
  if (!s) return signinPage('Teacher', 'booker', 'Sign in with a demo account to open the Teacher Portal.');
  if (s.role === 'family') return phero('Teacher Portal', 'For staff', '', {chars:['booker']}) + `<section class="band-paper"><div class="wrap"><div class="card signin ffd-card">${BADGE}<h2 class="h3">This portal is for teachers and directors</h2><p class="small">You are signed in as ${E(s.name)} (${E(s.label)}).</p><div class="ffd-row"><button class="btn gold" type="button" data-go="family-portal">Open the Family Portal</button><button class="btn soft" type="button" data-demo="signout">Sign out</button></div></div></div></section>`;
  if (!ctx().demo) connect();
  return basePortal();
};
V['family-portal'] = () => {
  if (!on()) return baseFamily();
  const s = ses();
  if (!s) return signinPage('Family', 'lumi', 'Sign in with the demo family account to see a child’s day.');
  if (!ctx().demo) connect();
  return baseFamily();
};
function connect(){ try { if (window.FFPortal && window.FFPortal.connectDemo) window.FFPortal.connectDemo(); } catch (e) { console.warn(e); } }
function afterSignIn(){
  const s = ses(); if (!s) return;
  if (ctx().demo) { try { history.replaceState(null, '', '#' + s.home); } catch (_) {} location.reload(); return; }   // switching demo accounts: start clean
  if (s.home !== 'learn') connect();
  go(s.home);
  say(`Signed in as ${s.name} (${s.label})`);
}
function signOut(){
  const s = ses(); DM.signOut();
  try { history.replaceState(null, '', '#' + (s && s.role === 'family' ? 'signin-family' : 'signin-teacher')); } catch (_) {}
  location.reload();
}
function resetDemo(btn){
  if (btn && !btn.dataset.armed) { btn.dataset.armed = '1'; btn.textContent = 'Click again to reset'; say('Click "Reset demo" again to put all the sample data back'); return; }
  DM.reset(); try { sessionStorage.setItem('ff-demo-just-reset', '1'); } catch (_) {}
  location.reload();
}
try { const sw = sessionStorage.getItem('ff-demo-switched'); if (sw) { sessionStorage.removeItem('ff-demo-switched'); setTimeout(() => say(`Now working in ${sw}`), 600); } } catch (_) {}
try { if (sessionStorage.getItem('ff-demo-just-reset')) { sessionStorage.removeItem('ff-demo-just-reset'); setTimeout(() => say('Demo reset: the sample data is back'), 600); } } catch (_) {}

// ---------------------------------------------------------------- the portal header and tabs
function headerBits(c){
  const s = ses() || {};
  return `<span class="ffd-badge ffd-dark" role="note"><span aria-hidden="true">●</span> Demo · sample data, resets anytime</span>
   ${centerChip(null, true)}
   <span class="small ffd-who" id="hubWho">Signed in as <b>${E(s.name || '')}</b> (${E(s.label || roleLabel(c.role))}) · ${E(DM.CENTER)}</span>
   <span class="ffd-acts">${c.role === 'family' ? '' : `<span class="ffd-switch">${centerPick('ffdCenterSwitch', 'Switch center')}</span><button type="button" class="btn soft ffd-mini" data-go="start-center">Start a new center</button>`}<button type="button" class="btn soft ffd-mini" data-go="account">Account</button><button type="button" class="btn soft ffd-mini" data-demo="reset">Reset demo</button><button type="button" class="btn soft ffd-mini" data-demo="signout">Sign out</button></span>`;
}
function addTabs(tabs, role){
  const T = Object.fromEntries(tabs.map(t => [t[0], t]));
  const waiting = role === 'director' ? approvalsWaiting() : 0;
  const out = [];
  if (role === 'director') out.push(['dash','Dashboard'], ['staff','Staff'], ['approvals', 'Approvals' + (waiting ? ` <span class="ffd-count" aria-label="${waiting} waiting">${waiting}</span>` : '')], ['invite','Invite'], ['enroll','Enrollment'], ['dreports','Reports']);
  out.push(T.today, ['checkin','Check-in'], ['plans','Daily plan'], T.children, T.progress, T.messages, ['reports','Family reports'], T.calendar, T.lunch, T.curriculum, T.account, T.setup);
  tabs.splice(0, tabs.length, ...out.filter(Boolean));
}
function view(tab, c){
  const f = {checkin:checkinView, plans:plansView, reports:reportsView, dash:dashView, staff:staffView, approvals:approvalsView, enroll:enrollView, dreports:dReportsView, invite:inviteView}[tab];
  if (!f) return null;
  if (['dash','staff','approvals','enroll','dreports','invite'].includes(tab) && c.role !== 'director') return null;
  try { return f(c); } catch (e) { console.error(e); return `<div class="card" role="alert"><h3>Something went wrong in the demo</h3><p class="small">${E(e.message)}</p><button class="btn soft" data-demo="reset">Reset demo</button></div>`; }
}

// ---------------------------------------------------------------- shared pieces
const planId = (room, date) => `${room}_${date}`;
const planOf = (room, date) => DM.get('plans', planId(room, date));
function stampAttendance(x){
  if (x.present === true && !x.inAt) { x.inAt = nowOn(x.date); x.inBy = x.inBy || 'Family'; x.inStaff = (ses() || {}).id; }
  if (x.present !== true) { delete x.inAt; delete x.outAt; delete x.outBy; }
}
function kidStatus(x){
  if (x.present === false) return {k:'absent', t:'Absent today'};
  if (x.outAt) return {k:'out', t:`Picked up ${fmtTime(x.outAt)}${x.outBy ? ' by ' + x.outBy : ''}`};
  if (x.present === true) return {k:'in', t:`Checked in ${fmtTime(x.inAt) || ''}${x.inBy ? ' by ' + x.inBy : ''}`};
  return {k:'none', t:'Not here yet'};
}
function staffOn(room){ return Object.entries(DM.all('staff')).filter(([, s]) => s.room === room && s.onDuty); }
function ratioOf(room){
  const r = DM.get('rooms', room) || {}, a = api(), date = ctx().date;
  const here = kidsOf(room).filter(([id]) => { const x = a.kd(id, date); return x.present === true && !x.outAt; }).length;
  const st = staffOn(room).length, max = r.ratio || 10, need = Math.ceil(here / max);
  return {here, staff:st, max, ok:st >= need && (here === 0 || st > 0), need};
}
function approvalsWaiting(){
  return Object.values(DM.all('plans')).filter(p => p.status === 'submitted').length + Object.values(DM.all('requests')).filter(r => r.status === 'pending').length;
}
const friendSel = (id, val) => `<select class="i" id="${id}">${FR.map(f => `<option value="${f}" ${f === val ? 'selected' : ''}>${FNAME[f]}</option>`).join('')}</select>`;
const areaSel = (id, val) => `<select class="i" id="${id}"><option value="">No area</option>${(FS().domains || []).map(d => `<option value="${E(d.key)}" ${d.key === val ? 'selected' : ''}>${E(d.label)}</option>`).join('')}</select>`;

// ---------------------------------------------------------------- Today (top of the left column)
function todayCard(c){
  const p = planOf(c.room, c.date), [cls, lbl] = chipFor(p && p.status), a = api(), kids = kidsOf(c.room);
  const xs = kids.map(([id]) => a.kd(id, c.date)), here = xs.filter(x => x.present === true && !x.outAt).length, out = xs.filter(x => x.outAt).length, notYet = xs.filter(x => x.present == null).length;
  return `<div class="card ffd-today" style="--c:var(--${p ? E(p.friend) : 'gold'})"><div class="ffd-row sp"><h3>Today's plan</h3><span class="chip ${cls}">${lbl}</span></div>
   ${p ? `<p class="ffd-ptitle"><img src="${E(FFcut(p.friend))}" alt="" width="40" height="40"><span><b>${E(p.title || 'Untitled plan')}</b><span class="mini">With ${FNAME[p.friend] || ''}${p.area ? ' · ' + E(areaLabel(p.area)) : ''}</span></span></p>
     <ol class="ffd-loop">${LOOP.filter(([k]) => p.steps && p.steps[k]).map(([k, n]) => `<li style="--c:var(--${STEP_FRIEND[k]})"><b>${n}</b> ${E(p.steps[k])}</li>`).join('')}</ol>`
   : `<p class="small">No plan for today yet. Write it in a few minutes with the six-step loop, or start from the sample day.</p>`}
   <div class="ffd-row"><button class="btn ${p ? 'soft' : 'gold'}" data-ptab="plans">${p ? 'Open the daily plan' : 'Write today’s plan'}</button></div></div>
  <div class="card ffd-today" style="--c:var(--zuri)"><div class="ffd-row sp"><h3>Check-in</h3><span class="chip ${notYet ? 'warn' : 'ok'}">${here} here now</span></div>
   <p class="small">${here} checked in · ${out} picked up · ${notYet} not here yet</p>
   <div class="ffd-row"><button class="btn navy" data-ptab="checkin">Open check-in and care log</button><button class="btn soft" data-ptab="reports">Family reports</button></div></div>`;
}

// ---------------------------------------------------------------- Check-in, pickup and care log
const CARE = [['Diaper','Diaper change'],['Potty','Potty'],['Water','Water'],['Bottle','Bottle']];
function checkinView(c){
  const a = api(), kids = kidsOf(c.room), date = c.date, rt = ratioOf(c.room), r = DM.get('rooms', c.room) || {};
  if (!kids.length) return `<div class="card"><h3>No children in this classroom</h3><p class="small">Add children on the Children tab.</p></div>`;
  const pickups = approvedPickups();
  const rows = kids.map(([id, k]) => {
    const x = a.kd(id, date), st = kidStatus(x), care = (x.care || []).slice(-4), name = `${k.first} ${k.last || ''}.`;
    const opts = ['Family'].concat(pickups.filter(p => p.kid === id).map(p => `${p.name} (approved pickup)`), ['Grandparent (on the pickup list)', 'Other adult on the pickup list']);
    const outForm = DS.out[id] ? `<div class="ffd-out"><label class="f" for="dmOut_${id}">Picked up by<select class="i" id="dmOut_${id}">${opts.map(o => `<option>${E(o)}</option>`).join('')}</select></label><button class="btn navy" data-dm="checkout" data-child="${id}">Confirm pickup</button><button class="btn soft" data-dm="outcancel" data-child="${id}">Cancel</button><span class="mini">ID is checked against the pickup list at the door.</span></div>` : '';
    const btns = !c.canWrite ? '' : st.k === 'none' ? `<button class="btn gold" data-dm="checkin" data-child="${id}" aria-label="Check in ${E(k.first)}">Check in</button><button class="btn soft" data-dm="absent" data-child="${id}" aria-label="Mark ${E(k.first)} absent">Absent</button>`
      : st.k === 'in' ? `<button class="btn navy" data-dm="outask" data-child="${id}" aria-label="Check out ${E(k.first)}">Check out</button>`
      : `<button class="btn soft" data-dm="undo" data-child="${id}" aria-label="Undo for ${E(k.first)}">Undo</button>`;
    const careBtns = st.k === 'in' && c.canWrite ? `<span class="ffd-care" role="group" aria-label="Care log for ${E(k.first)}">${CARE.map(([t, l]) => `<button class="ffd-pill" data-dm="care" data-child="${id}" data-t="${t}" aria-label="${l} for ${E(k.first)}">+ ${t}</button>`).join('')}
      ${x.napStart && !x.napEnd ? `<button class="ffd-pill on" data-dm="napend" data-child="${id}" aria-label="End nap for ${E(k.first)}">Nap since ${fmtTime(x.napStart)} · end</button>` : `<button class="ffd-pill" data-dm="napstart" data-child="${id}" aria-label="Start nap for ${E(k.first)}">Nap start</button>`}</span>` : '';
    return `<li class="ffd-kid" data-st="${st.k}"><div class="ffd-kidmain"><span class="ffd-av" aria-hidden="true">${E(k.first[0])}</span><span><b>${E(name)}</b><span class="mini ffd-st">${E(st.t)}</span>
      ${care.length || x.nap ? `<span class="mini">${care.map(e => `${E(e.t)} ${fmtTime(e.at)}`).join(' · ')}${x.nap ? `${care.length ? ' · ' : ''}Rest: ${E(x.nap)}` : ''}</span>` : ''}</span></div>
      <div class="ffd-kidacts">${btns}</div>${careBtns}${outForm}</li>`;
  }).join('');
  const xs = kids.map(([id]) => a.kd(id, date));
  return `<div class="grid g4 ffd-tiles">
    <div class="card ffd-tile"><b>${xs.filter(x => x.present === true && !x.outAt).length}</b><span class="small muted">Here now</span></div>
    <div class="card ffd-tile"><b>${xs.filter(x => x.present == null).length}</b><span class="small muted">Not here yet</span></div>
    <div class="card ffd-tile"><b>${xs.filter(x => x.outAt).length}</b><span class="small muted">Picked up</span></div>
    <div class="card ffd-tile"><b class="${rt.ok ? '' : 'ffd-bad'}">${rt.staff} : ${rt.here}</b><span class="small muted">Staff to children now (${E(r.name || '')} limit 1:${rt.max}) · ${rt.ok ? 'In ratio' : 'Needs another adult'}</span></div></div>
   <div class="card"><div class="ffd-row sp"><h3>Arrivals and pickups · ${E(shortD(date))}</h3>${c.canWrite ? `<button class="btn soft" data-dm="allin">Check in everyone not here yet</button>` : ''}</div>
    <ul class="ffd-kids" aria-live="polite">${rows}</ul>
    <p class="note">Times are recorded when you tap. Families see the check-in and pickup times in their portal. In the live Hub, families can also sign in at the door kiosk.</p></div>`;
}
function approvedPickups(){ return Object.values(DM.all('requests')).filter(r => r.type === 'pickup' && r.status === 'approved'); }
async function kdUpdate(id, fn){
  const a = api(), c = ctx(), x = a.kd(id, c.date); fn(x); x.by = c.me || 'demo'; await a.put('kidday', a.kdKey(id, c.date), x);
}

// ---------------------------------------------------------------- Daily plan (the teacher's own plans; the six-step loop)
function plansView(c){
  const a = api(), room = c.room, date = c.date, wd = a.fromIso(date).getDay();
  const week = (() => { const d = a.fromIso(date); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return [0,1,2,3,4].map(i => { const x = new Date(d); x.setDate(d.getDate() + i); return a.iso(x); }); })();
  const strip = `<div class="ffd-week" role="group" aria-label="Plans this week">${week.map(dt => { const p = planOf(room, dt), [cls, lbl] = chipFor(p && p.status);
    return `<button class="ffd-day${dt === date ? ' is-on' : ''}" data-day="${dt}" data-keep="1" aria-pressed="${dt === date}"><b>${E(shortD(dt))}</b><span class="mini">${p && p.title ? E(p.title) : '—'}</span><span class="chip ${cls}">${lbl}</span></button>`; }).join('')}</div>`;
  if (wd === 0 || wd === 6) return strip + `<div class="card"><p>No program on weekends. Pick a weekday.</p></div>`;
  const p = planOf(room, date) || DS.plan[planId(room, date)] || {room, date, status:'new', friend:'booker', area:'', title:'', steps:{}, notes:''};
  const rName = (DM.get('rooms', room) || {}).name || 'this room';
  const dir = c.role === 'director', ro = !c.canWrite;
  const [cls, lbl] = chipFor(p.status === 'new' ? null : p.status);
  const rev = p.review ? `<p class="small ffd-review"><b>${p.status === 'returned' ? 'Returned by' : 'Approved by'} ${E(a.who(p.review.by))}</b> · ${fmtTime(p.review.at)}${p.review.note ? `: “${E(p.review.note)}”` : ''}</p>` : '';
  const form = `<form class="card ffd-plan" id="dmPlanForm" novalidate style="--c:var(--${E(p.friend || 'booker')})">
    <div class="ffd-row sp"><h3>${E(rName)} · ${E(a.fmtDate(date))}</h3><span class="chip ${cls}" id="dmPlanStatus">${lbl}</span></div>${rev}
    <label class="f" for="dmTitle">Plan title<input class="i" id="dmTitle" value="${E(p.title)}" placeholder="e.g. Kind hands at the block center" ${ro ? 'disabled' : ''}></label>
    <div class="grid g2" style="gap:10px"><label class="f" for="dmFriend">Lead friend${friendSel('dmFriend', p.friend)}</label><label class="f" for="dmArea">Learning Steps area (tag)${areaSel('dmArea', p.area)}</label></div>
    <fieldset class="ffd-steps"><legend>The six-step learning loop</legend>
     ${LOOP.map(([k, n, hint], i) => `<label class="f ffd-step" for="dmStep_${k}" style="--c:var(--${STEP_FRIEND[k]})"><span><span class="ffd-num" aria-hidden="true">${i + 1}</span>${n} <span class="mini">${E(hint)}</span></span><textarea class="i" id="dmStep_${k}" rows="2" ${ro ? 'disabled' : ''} placeholder="What you will do">${E((p.steps || {})[k] || '')}</textarea></label>`).join('')}</fieldset>
    <label class="f" for="dmNotes">Notes for the team (optional)<textarea class="i" id="dmNotes" rows="2" ${ro ? 'disabled' : ''}>${E(p.notes || '')}</textarea></label>
    ${ro ? '' : `<div class="ffd-row"><button class="btn soft" type="button" data-dm="plansave">Save draft</button>${dir ? `<button class="btn gold" type="button" data-dm="planapprove">Save and approve</button>` : `<button class="btn gold" type="button" data-dm="plansubmit">Submit for director approval</button>`}
     <button class="btn soft" type="button" data-dm="plancopy">Copy to next school day</button>${p.status !== 'new' ? `<button class="btn soft" type="button" data-dm="plandel">Delete plan</button>` : ''}</div>`}
    <p class="note" id="dmPlanMsg" role="status" aria-live="polite"></p></form>`;
  const G = window.FFGate || {}, SP = G.SAMPLE || {day:9, title:'Kind Hands, Kind Words', pages:11, path:'printables/sample/ff-sample-u1-day-09-teacher-packet.pdf', thumbs:[]};
  const sample = `<div class="card ffd-sample" style="--c:var(--lumi)"><span class="small muted">Sample day from the licensed program</span><h3>Day ${SP.day}: ${E(SP.title)}</h3>
    <p class="small">Unit 1, Week 2 (Lumi week). Look through the public sample to see how a full licensed day is laid out. Licensed centers get every day of the program.</p>
    ${(SP.thumbs || []).length ? `<div class="ffd-thumbs">${SP.thumbs.map((t, i) => `<img src="${E(t)}" alt="Sample day ${SP.day}, page ${i ? 3 : 1} (watermarked sample)" loading="lazy" width="160" height="207">`).join('')}</div>` : ''}
    <div class="ffd-row"><a class="btn soft" href="${E(SP.path)}" target="_blank" rel="noopener">Open the sample day (PDF, ${SP.pages} pages)</a>${ro ? '' : `<button class="btn soft" type="button" data-dm="planfromsample">Start a plan with this day's title</button>`}</div>
    <p class="mini">This planner holds your own plans. The demo does not include the licensed day plans.</p></div>`;
  return strip + `<div class="ffd-cols">${form}<div style="display:grid;gap:16px;align-content:start">${sample}
    <div class="card"><h3>How plans move</h3><ol class="small ffd-flow"><li>The teacher writes the day with the six steps.</li><li>Submit: the director sees it under Approvals.</li><li>Approved plans show on Today and in each family's day.</li></ol></div></div></div>`;
}
function readPlanForm(base){
  const v = id => ((document.getElementById(id) || {}).value || '').trim();
  const steps = {}; LOOP.forEach(([k]) => steps[k] = v('dmStep_' + k));
  return Object.assign({}, base, {title:v('dmTitle'), friend:v('dmFriend') || 'booker', area:v('dmArea'), steps, notes:v('dmNotes')});
}
async function savePlan(status){
  const c = ctx(), id = planId(c.room, c.date), cur = planOf(c.room, c.date) || {room:c.room, date:c.date, by:c.me};
  const p = readPlanForm(cur);
  if (!p.title) { const t = document.getElementById('dmTitle'); if (t) t.focus(); planMsg('Give the plan a title first.', true); return false; }
  if (status !== 'draft' && !LOOP.some(([k]) => p.steps[k])) { planMsg('Write at least one of the six steps before you submit.', true); return false; }
  p.status = status; p.at = Date.now(); p.by = cur.by || c.me;
  if (status === 'approved') p.review = {by:c.me, at:Date.now(), note:''}; else if (status !== 'returned') delete p.review;
  await DM.put('plans', id, p); delete DS.plan[id];
  return true;
}
function planMsg(t, bad){ const m = document.getElementById('dmPlanMsg'); if (m) { m.textContent = t; m.style.color = bad ? 'var(--bad)' : 'var(--ok)'; } }

// ---------------------------------------------------------------- Family reports (built from the day, sent at the end of it)
function reportData(kid, date){
  const a = api(), k = (DM.get('kids', kid) || {}), x = a.kd(kid, date), room = k.room, p = planOf(room, date);
  const obs = Object.values(a.obs()).filter(o => o.kid === kid && o.date === date && o.shared === true);
  const photos = Object.values(a.photos()).filter(ph => ph.kid === kid && ph.date === date && (ph.kind === 'moment' || ph.shared === true));
  const day = a.day(room, date);
  return {k, x, p:p && p.status === 'approved' ? p : null, obs, photos, day, lunch:a.lunchText(room, date)};
}
function reportHtml(kid, date){
  const d = reportData(kid, date), x = d.x, m = x.meals || {};
  if (x.present === false) return `<p class="small">${E(d.k.first)} was absent today, so there is no daily report.</p>`;
  return `<div class="ffd-rep">
   <p class="small"><b>Arrived:</b> ${x.inAt ? fmtTime(x.inAt) : 'Not recorded'}${x.inBy ? ` (${E(x.inBy)})` : ''} · <b>Picked up:</b> ${x.outAt ? fmtTime(x.outAt) + (x.outBy ? ` (${E(x.outBy)})` : '') : 'Not yet'}</p>
   ${d.p ? `<p class="small"><b>Today with ${FNAME[d.p.friend] || ''}:</b> ${E(d.p.title)}</p><ul class="ffd-replist">${LOOP.filter(([k]) => d.p.steps[k]).map(([k, n]) => `<li><b>${n}:</b> ${E(d.p.steps[k])}</li>`).join('')}</ul>` : '<p class="small muted">No approved plan for this day.</p>'}
   <p class="small"><b>Meals:</b> breakfast ${E(m.breakfast || 'not recorded')} · lunch ${E(m.lunch || 'not recorded')} · snack ${E(m.snack || 'not recorded')} <span class="mini">(lunch: ${E(d.lunch)})</span></p>
   <p class="small"><b>Rest:</b> ${E(x.nap || 'Not recorded')}${(x.care || []).length ? ` · <b>Care:</b> ${(x.care || []).map(e => `${E(e.t)} ${fmtTime(e.at)}`).join(', ')}` : ''}</p>
   ${d.obs.length ? `<p class="small"><b>What we saw:</b></p><ul class="ffd-replist">${d.obs.map(o => `<li>${E(o.text)}${o.area ? ` <span class="mini">(${E(areaLabel(o.area))}${o.level ? ', ' + E(o.level) : ''})</span>` : ''}</li>`).join('')}</ul>` : ''}
   ${x.star ? '<p class="small"><span class="chip ok">★ Friendship Star today</span></p>' : ''}
   ${x.note ? `<p class="small"><b>From the teacher:</b> ${E(x.note)}</p>` : ''}${d.day && d.day.notes ? `<p class="small"><b>For the class:</b> ${E(d.day.notes)}</p>` : ''}
   ${d.photos.length ? `<div class="ffd-thumbs">${d.photos.map(ph => `<img src="${E(ph.src)}" alt="${E(ph.caption || 'Sample picture')}" width="96" height="84" loading="lazy">`).join('')}</div>` : ''}
   ${d.p && d.p.steps.home ? `<p class="small ffd-home"><b>Take home:</b> ${E(d.p.steps.home)}</p>` : ''}</div>`;
}
function reportsView(c){
  const a = api(), kids = kidsOf(c.room), date = c.date;
  const rows = kids.map(([id, k]) => { const x = a.kd(id, date), sent = DM.get('reports', `${id}_${date}`), open = !!DS.open[id];
    const state = x.present === false ? ['','Absent: no report'] : x.present !== true ? ['warn','Not checked in'] : sent ? ['ok', `Sent ${fmtTime(sent.sentAt)}`] : ['warn','Ready to send'];
    return `<li class="ffd-repitem"><div class="ffd-row sp"><span><b>${E(k.first)} ${E(k.last || '')}.</b> <span class="chip ${state[0]}">${state[1]}</span></span>
      <span class="ffd-row"><button class="btn soft" data-dm="repopen" data-child="${id}" aria-expanded="${open}" aria-controls="dmRep_${id}">${open ? 'Hide' : 'Preview'}</button>${x.present === true && c.canWrite ? `<button class="btn ${sent ? 'soft' : 'navy'}" data-dm="repsend" data-child="${id}">${sent ? 'Send again' : 'Send to family'}</button>` : ''}</span></div>
      <div id="dmRep_${id}" ${open ? '' : 'hidden'}>${open ? reportHtml(id, date) : ''}</div></li>`; }).join('');
  const ready = kids.filter(([id]) => a.kd(id, date).present === true && !DM.get('reports', `${id}_${date}`)).length;
  return `<div class="card"><div class="ffd-row sp"><h3>Family reports · ${E(shortD(date))}</h3>${c.canWrite && ready ? `<button class="btn gold" data-dm="repall">Send all ready reports (${ready})</button>` : ''}</div>
   <p class="small">Each report is built from what was logged today: check-in and pickup, the approved plan, meals, rest, care, shared notes and pictures. In the live Hub reports go out by themselves at about 5:30 pm; in the demo you send them.</p>
   <ul class="ffd-reps">${rows}</ul></div>`;
}
async function sendReport(kid){
  const c = ctx(), a = api(), k = DM.get('kids', kid) || {}, id = `${kid}_${c.date}`;
  await DM.put('reports', id, {kid, date:c.date, room:k.room, sentAt:nowOn(c.date), by:c.me});
  await a.put2('msgs', 'mrep_' + id, {kid, room:k.room, date:c.date, from:'teacher', text:`${k.first}'s daily report for ${shortD(c.date)} is ready in the Family Portal.`, at:Date.now(), ts:new Date().toISOString(), by:c.me, read:{teacher:true, family:false}});
}

// ---------------------------------------------------------------- Family Portal additions
function familyTop(c){
  const a = api(), kid = c.fam && c.fam.kid, date = (c.fam && c.fam.date) || c.date; if (!kid || !a) return '';
  const k = DM.get('kids', kid) || {}, x = a.kd(kid, date), st = kidStatus(x), p = planOf(k.room, date), sent = DM.get('reports', `${kid}_${date}`);
  const pr = Object.entries(DM.all('requests')).filter(([, r]) => r.type === 'pickup' && r.kid === kid);
  return `<div class="ffd-fam">
   <div class="card ffd-today" style="--c:var(--zuri)"><div class="ffd-row sp"><h3>Arrival and pickup</h3><span class="chip ${st.k === 'in' ? 'ok' : st.k === 'out' ? '' : 'warn'}">${st.k === 'in' ? 'Here now' : st.k === 'out' ? 'Picked up' : st.k === 'absent' ? 'Absent' : 'Not here yet'}</span></div>
    <p class="small">${E(st.t)}</p>${(x.care || []).length ? `<p class="mini">Care today: ${(x.care || []).map(e => `${E(e.t)} ${fmtTime(e.at)}`).join(' · ')}</p>` : ''}${x.napStart && !x.napEnd ? `<p class="mini">Resting since ${fmtTime(x.napStart)}</p>` : ''}</div>
   ${p && p.status === 'approved' ? `<div class="card ffd-today" style="--c:var(--${E(p.friend)})"><div class="ffd-row sp"><h3>Today in ${E((DM.get('rooms', k.room) || {}).name || 'class')}</h3><img src="${E(FFcut(p.friend))}" alt="" width="40" height="40"></div>
    <p class="small"><b>${E(p.title)}</b> with ${FNAME[p.friend]}${p.area ? ` · ${E(areaLabel(p.area))}` : ''}</p>
    <ol class="ffd-loop">${LOOP.filter(([s]) => p.steps[s]).map(([s, n]) => `<li style="--c:var(--${STEP_FRIEND[s]})"><b>${n}</b> ${E(p.steps[s])}</li>`).join('')}</ol></div>` : ''}
   <div class="card ffd-today" style="--c:var(--lumi)" id="ffdFamReport"><div class="ffd-row sp"><h3>${E(k.first || '')}'s daily report</h3>${sent ? `<span class="chip ok">Sent ${fmtTime(sent.sentAt)}</span>` : '<span class="chip">Not sent yet</span>'}</div>
    ${sent ? reportHtml(kid, date) : `<p class="small">The teacher sends the daily report at the end of the day. (Demo: sign in as the Demo Teacher and send it from Family reports.)</p>`}</div>
   ${c.role === 'family' ? `<form class="card ffd-today" style="--c:var(--booker)" id="dmPickupForm" novalidate><h3>Add someone to the pickup list</h3>
    <p class="small">The director approves every new pickup person before they can collect ${E(k.first || 'your child')}. Demo: use a made-up name.</p>
    <div class="grid g2" style="gap:10px"><label class="f" for="dmPuName">Name<input class="i" id="dmPuName" autocomplete="off" placeholder="e.g. Aunt Kim T."></label><label class="f" for="dmPuRel">Relationship<input class="i" id="dmPuRel" autocomplete="off" placeholder="e.g. Aunt"></label></div>
    <div class="ffd-row"><button class="btn navy" type="submit">Send to the director</button></div><p class="note" id="dmPuMsg" role="status" aria-live="polite"></p>
    ${pr.length ? `<ul class="ffd-plain">${pr.map(([, r]) => `<li class="small">${E(r.name)} (${E(r.relation)}) <span class="chip ${r.status === 'approved' ? 'ok' : r.status === 'declined' ? 'bad' : 'warn'}">${r.status === 'pending' ? 'Waiting for the director' : r.status === 'approved' ? 'Approved' : 'Not approved'}</span></li>`).join('')}</ul>` : ''}</form>` : ''}
  </div>`;
}
function familyEnd(c){
  const vids = [['booker','First-Sound Hunt with Booker'],['lumi','Look, Listen, Lend a Hand with Lumi'],['zuri','Color Walk with Zuri'],['bop','Bubble Chase with Bop']];
  return `<div class="card ffd-videos"><div class="ffd-row sp"><h3>Play along with the friends</h3><span class="mini">Story-world animation · free for every family</span></div>
   <div class="ffd-vgrid">${vids.map(([f, t]) => `<a class="ffd-vid" href="#activities/${f}" style="--c:var(--${f})"><img src="${E(FFcut(f))}" alt="" width="56" height="56"><span><b>${E(t)}</b><span class="mini">${FNAME[f]}'s activities and video</span></span></a>`).join('')}</div></div>
   <div class="card ffd-videos" style="--c:var(--gold)"><h3>Futures at Home</h3><div class="ffd-links">
    <a class="btn soft" href="#this-week">This week with the friends</a><a class="btn soft" href="#at-home">Futures at Home</a><a class="btn soft" href="#story-time">Story Time</a><a class="btn soft" href="#bop-at-home">Bop at Home</a><a class="btn soft" href="#family-videos">Family videos</a></div></div>`;
}

// ---------------------------------------------------------------- Director: dashboard
function dashView(c){
  const a = api(), rooms = Object.entries(DM.all('rooms')).sort((x, y) => (x[1].order || 9) - (y[1].order || 9)), date = c.date;
  const allKids = Object.keys(DM.all('kids')), here = allKids.filter(id => { const x = a.kd(id, date); return x.present === true && !x.outAt; }).length;
  const staff = Object.values(DM.all('staff')), onDuty = staff.filter(s => s.onDuty).length;
  const rts = rooms.map(([id, r]) => [id, r, ratioOf(id)]), inRatio = rts.filter(x => x[2].ok).length;
  const dues = Object.entries(DM.all('dues')), open = dues.filter(([, d]) => !d.done).sort((x, y) => x[1].due.localeCompare(y[1].due)), today = DM.todayIso();
  const overdue = open.filter(([, d]) => d.due < today).length, waiting = approvalsWaiting(), apps = Object.values(DM.all('apps')).filter(x => ['inquiry','application'].includes(x.stage)).length;
  const tile = (n, l, cls, tab) => `<button class="card ffd-tile ffd-tbtn" ${tab ? `data-ptab="${tab}"` : 'disabled'}><b class="${cls || ''}">${n}</b><span class="small muted">${l}</span></button>`;
  return getStarted() + `<div class="grid g4 ffd-tiles">${tile(`${here}<span class="ffd-of"> / ${allKids.length}</span>`, 'Children here now / enrolled', '', 'checkin')}${tile(onDuty, 'Staff on duty now', '', 'staff')}
    ${tile(`${inRatio}<span class="ffd-of"> / ${rooms.length}</span>`, 'Rooms in ratio', inRatio < rooms.length ? 'ffd-bad' : '', 'staff')}${tile(waiting, 'Approvals waiting', waiting ? 'ffd-warn' : '', 'approvals')}</div>
  <div class="ffd-cols">
   <div class="card"><h3>Rooms right now</h3><div class="tw"><table><caption class="sr-only">Attendance and ratio by room</caption><tr><th scope="col">Room</th><th scope="col" class="n">Here</th><th scope="col">Staff on duty</th><th scope="col">Ratio</th><th scope="col"><span class="sr-only">Open</span></th></tr>
    ${rts.map(([id, r, rt]) => `<tr><td><b>${E(r.name)}</b><span class="mini"> · ${kidsOf(id).length} enrolled</span></td><td class="n">${rt.here}</td><td class="small">${staffOn(id).map(([, s]) => E(s.name)).join(', ') || '<span class="ffd-bad">Nobody</span>'}</td>
      <td><span class="chip ${rt.ok ? 'ok' : 'bad'}">${rt.staff}:${rt.here} · ${rt.ok ? 'In ratio' : 'Out of ratio'}</span><span class="mini"> limit 1:${rt.max}</span></td><td><button class="rl" data-dm="openroom" data-room="${id}">Open room</button></td></tr>`).join('')}</table></div>
    <p class="note">Ratios update as teachers check children in and out and as staff clock in on the Staff tab. Demo limits: Twos 1:8, Threes and Pre-K 1:10.</p></div>
   <div class="card"><div class="ffd-row sp"><h3>What's due</h3><span class="chip ${overdue ? 'bad' : 'ok'}">${overdue ? `${overdue} overdue` : 'Nothing overdue'}</span></div>
    <ul class="ffd-due">${open.map(([id, d]) => `<li class="${d.due < today ? 'is-late' : ''}"><span><b>${E(d.title)}</b><span class="mini">${E(d.area)} · ${d.due < today ? 'was due' : 'due'} ${E(shortD(d.due))}</span></span><button class="btn soft" data-dm="duedone" data-id="${id}">Mark done</button></li>`).join('') || '<li class="small">All caught up.</li>'}</ul>
    ${dues.some(([, d]) => d.done) ? `<details><summary class="mini">Done recently</summary><ul class="ffd-plain">${dues.filter(([, d]) => d.done).map(([id, d]) => `<li class="small">${E(d.title)} · ${E(a.who(d.doneBy))}, ${fmtTime(d.doneAt)} <button class="rl" data-dm="dueundo" data-id="${id}">Undo</button></li>`).join('')}</ul></details>` : ''}</div>
  </div>
  <div class="grid g3">
   <div class="card"><h3>Today's plans</h3><ul class="ffd-plain">${rooms.map(([id, r]) => { const p = planOf(id, date), [cls, lbl] = chipFor(p && p.status); return `<li class="small"><b>${E(r.name)}:</b> ${p ? E(p.title) : 'No plan'} <span class="chip ${cls}">${lbl}</span></li>`; }).join('')}</ul><button class="btn soft" data-ptab="approvals">Review plans</button></div>
   <div class="card"><h3>Enrollment</h3><p class="small">${apps} new ${apps === 1 ? 'inquiry or application' : 'inquiries and applications'} to answer.</p><button class="btn soft" data-ptab="enroll">Open the enrollment desk</button></div>
   <div class="card"><h3>Family messages</h3><p class="small">${Object.values(a.msgs()).filter(m => m.from === 'family' && !(m.read || {}).teacher).length} unread from families.</p><button class="btn soft" data-ptab="messages">Open messages</button></div></div>`;
}

// ---------------------------------------------------------------- Director: staff
const STAFF_ROLES = ['Lead teacher','Assistant teacher','Floater','Cook','Director','Assistant director'];
function trainingOf(id){ const t = DM.get('training', id) || {courses:{}}, f = (t.courses || {})['F-101'] || {}; const n = Object.values(f.lessons || {}).filter(Boolean).length; return {n, done:!!f.done}; }
function staffView(c){
  const rooms = Object.entries(DM.all('rooms')).sort((x, y) => (x[1].order || 9) - (y[1].order || 9));
  const list = Object.entries(DM.all('staff')).sort((x, y) => x[1].name.localeCompare(y[1].name));
  const roomSel = (id, val) => `<select class="i" id="${id}" data-dm-ch="staffroom"><option value="">No room (office or kitchen)</option>${rooms.map(([rid, r]) => `<option value="${rid}" ${rid === val ? 'selected' : ''}>${E(r.name)}</option>`).join('')}</select>`;
  return `<div class="card"><div class="ffd-row sp"><h3>Staff</h3><span class="mini">${list.filter(([, s]) => s.onDuty).length} of ${list.length} on duty</span></div>
   <div class="tw"><table class="ffd-staff"><caption class="sr-only">Staff list</caption><tr><th scope="col">Name</th><th scope="col">Room</th><th scope="col">On duty</th><th scope="col">Background check</th><th scope="col">Training: F-101</th><th scope="col"><span class="sr-only">Remove</span></th></tr>
   ${list.map(([id, s]) => { const t = trainingOf(id); return `<tr><td><b>${E(s.name)}</b><span class="mini"> · ${E(s.role)}</span></td>
     <td><label class="sr-only" for="dmSR_${id}">Room for ${E(s.name)}</label>${roomSel('dmSR_' + id, s.room).replace('data-dm-ch="staffroom"', `data-dm-ch="staffroom" data-id="${id}"`)}</td>
     <td><button class="ffd-toggle" data-dm="duty" data-id="${id}" aria-pressed="${!!s.onDuty}" aria-label="${E(s.name)} on duty">${s.onDuty ? `On since ${fmtTime(s.clockIn)}` : 'Off · clock in'}</button></td>
     <td><span class="chip ${s.bg === 'Cleared' ? 'ok' : 'warn'}">${E(s.bg)}</span><span class="mini"> renew by ${E(shortD(s.bgDue))}</span></td>
     <td><span class="chip ${t.done ? 'ok' : t.n ? 'warn' : ''}">${t.done ? 'Complete' : t.n ? `${t.n} of 3 lessons` : 'Not started'}</span></td>
     <td>${id === 's-dana' ? '' : `<button class="rl" data-dm="staffdel" data-id="${id}" ${DS.armed['st' + id] ? 'data-armed="1"' : ''}>${DS.armed['st' + id] ? 'Click again to remove' : 'Remove'}</button>`}</td></tr>`; }).join('')}</table></div></div>
  <form class="card" id="dmStaffForm" novalidate><h3>Add a staff member</h3><p class="small">Demo: use a made-up name (first name and last initial).</p>
   <div class="ffd-row"><label class="f" for="dmStName">Name<input class="i" id="dmStName" autocomplete="off" placeholder="e.g. Ms. Rosa V."></label>
   <label class="f" for="dmStRole">Role<select class="i" id="dmStRole">${STAFF_ROLES.map(r => `<option>${r}</option>`).join('')}</select></label>
   <label class="f" for="dmStRoom">Room${roomSel('dmStRoom', 'demo').replace(' data-dm-ch="staffroom"', '')}</label>
   <button class="btn navy" type="submit">Add staff member</button></div><p class="note" id="dmStMsg" role="status" aria-live="polite"></p>
   <p class="mini">In the live Hub a new staff member gets an email invitation, and their classroom opens once their background checks are on file.</p></form>`;
}

// ---------------------------------------------------------------- Director: approvals
function approvalsView(c){
  const a = api(), plans = Object.entries(DM.all('plans')).filter(([, p]) => p.status === 'submitted').sort((x, y) => x[1].date.localeCompare(y[1].date));
  const reqs = Object.entries(DM.all('requests')), pend = reqs.filter(([, r]) => r.status === 'pending'), done = reqs.filter(([, r]) => r.status !== 'pending');
  const decided = Object.entries(DM.all('plans')).filter(([, p]) => p.review && p.review.at).sort((x, y) => y[1].review.at - x[1].review.at).slice(0, 5);
  const planCard = ([id, p]) => { const r = DM.get('rooms', p.room) || {}, open = !!DS.review[id];
    return `<li class="ffd-appr" style="--c:var(--${E(p.friend)})"><div class="ffd-row sp"><span><b>${E(p.title)}</b><span class="mini"> · ${E(r.name || p.room)} · ${E(shortD(p.date))} · from ${E(a.who(p.by))}</span></span>
      <button class="btn soft" data-dm="revopen" data-id="${id}" aria-expanded="${open}" aria-controls="dmRev_${id}">${open ? 'Hide plan' : 'Read plan'}</button></div>
      <div id="dmRev_${id}" ${open ? '' : 'hidden'}>${open ? `<ol class="ffd-loop">${LOOP.filter(([k]) => p.steps[k]).map(([k, n]) => `<li style="--c:var(--${STEP_FRIEND[k]})"><b>${n}</b> ${E(p.steps[k])}</li>`).join('')}</ol>${p.notes ? `<p class="mini">Team notes: ${E(p.notes)}</p>` : ''}` : ''}</div>
      <label class="f" for="dmRevNote_${id}">Note to the teacher (optional)<input class="i" id="dmRevNote_${id}" autocomplete="off" placeholder="e.g. Add a rain plan"></label>
      <div class="ffd-row"><button class="btn gold" data-dm="planok" data-id="${id}">Approve</button><button class="btn soft" data-dm="planback" data-id="${id}">Return with note</button></div></li>`; };
  const reqLine = ([id, r]) => r.type === 'pickup'
    ? `<li class="ffd-appr" style="--c:var(--booker)"><div><b>New pickup person: ${E(r.name)}</b> (${E(r.relation)})<span class="mini"> · for ${E(a.kidName(r.kid))} · from ${E(r.from)} · ${fmtTime(r.at)}</span></div>${r.status === 'pending' ? `<div class="ffd-row"><button class="btn gold" data-dm="reqok" data-id="${id}">Approve</button><button class="btn soft" data-dm="reqno" data-id="${id}">Decline</button></div>` : `<span class="chip ${r.status === 'approved' ? 'ok' : 'bad'}">${r.status === 'approved' ? 'Approved' : 'Declined'}</span>`}</li>`
    : `<li class="ffd-appr" style="--c:var(--bop)"><div><b>Time off: ${E(r.from)}</b><span class="mini"> · ${E(r.what)} · ${E(r.cover || '')}</span></div>${r.status === 'pending' ? `<div class="ffd-row"><button class="btn gold" data-dm="reqok" data-id="${id}">Approve</button><button class="btn soft" data-dm="reqno" data-id="${id}">Decline</button></div>` : `<span class="chip ${r.status === 'approved' ? 'ok' : 'bad'}">${r.status === 'approved' ? 'Approved' : 'Declined'}</span>`}</li>`;
  return `<div class="card"><div class="ffd-row sp"><h3>Plans waiting for approval</h3><span class="chip ${plans.length ? 'warn' : 'ok'}">${plans.length} waiting</span></div>
    ${plans.length ? `<ul class="ffd-apprs">${plans.map(planCard).join('')}</ul>` : '<p class="small">No plans waiting. Teachers submit plans from the Daily plan tab.</p>'}</div>
   <div class="card"><div class="ffd-row sp"><h3>Requests</h3><span class="chip ${pend.length ? 'warn' : 'ok'}">${pend.length} waiting</span></div>
    ${pend.length ? `<ul class="ffd-apprs">${pend.map(reqLine).join('')}</ul>` : '<p class="small">No requests waiting.</p>'}
    ${done.length ? `<details><summary class="mini">Decided (${done.length})</summary><ul class="ffd-apprs">${done.map(reqLine).join('')}</ul></details>` : ''}</div>
   ${decided.length ? `<div class="card"><h3>Recently decided plans</h3><ul class="ffd-plain">${decided.map(([, p]) => `<li class="small">${E(shortD(p.date))} · ${E((DM.get('rooms', p.room) || {}).name || '')}: ${E(p.title)} <span class="chip ${chipFor(p.status)[0]}">${chipFor(p.status)[1]}</span>${p.review.note ? ` <span class="mini">“${E(p.review.note)}”</span>` : ''}</li>`).join('')}</ul></div>` : ''}`;
}

// ---------------------------------------------------------------- Director: enrollment desk
const STAGES = [['inquiry','New inquiries'],['tour','Tours booked'],['application','Applications'],['waitlist','Waitlist'],['enrolled','Enrolled'],['declined','Closed']];
function enrollView(c){
  const apps = Object.entries(DM.all('apps')).sort((x, y) => y[1].at - x[1].at), rooms = Object.entries(DM.all('rooms')).sort((x, y) => (x[1].order || 9) - (y[1].order || 9));
  const rs = (id, val) => `<select class="i" id="${id}">${rooms.map(([rid, r]) => `<option value="${rid}" ${rid === val ? 'selected' : ''}>${E(r.name)} (${kidsOf(rid).length} enrolled)</option>`).join('')}</select>`;
  const card = ([id, x]) => {
    let acts = '';
    if (x.stage === 'inquiry') acts = DS.tour[id] ? `<div class="ffd-row"><label class="f" for="dmTour_${id}">Tour day and time<input class="i" type="datetime-local" id="dmTour_${id}"></label><button class="btn navy" data-dm="tourbook" data-id="${id}">Book tour</button><button class="btn soft" data-dm="tourcancel" data-id="${id}">Cancel</button></div>`
      : `<div class="ffd-row"><button class="btn navy" data-dm="tourask" data-id="${id}">Book a tour</button><button class="btn soft" data-dm="appstage" data-stage="application" data-id="${id}">Send an application</button><button class="btn soft" data-dm="appstage" data-stage="declined" data-id="${id}">Close</button></div>`;
    else if (x.stage === 'tour') acts = `<div class="ffd-row"><button class="btn navy" data-dm="appstage" data-stage="application" data-id="${id}">Tour done: invite to apply</button><button class="btn soft" data-dm="appstage" data-stage="inquiry" data-id="${id}">Cancel tour</button></div>`;
    else if (x.stage === 'application') acts = DS.enroll[id] ? `<div class="ffd-row"><label class="f" for="dmEnRoom_${id}">Room${rs('dmEnRoom_' + id, x.room)}</label><label class="f" for="dmEnStart_${id}">Start date<input class="i" type="date" id="dmEnStart_${id}" value="${E(x.start || DM.todayIso())}"></label><button class="btn gold" data-dm="enrollok" data-id="${id}">Enroll ${E(String(x.child).split(' ')[0])}</button><button class="btn soft" data-dm="enrollcancel" data-id="${id}">Cancel</button></div>`
      : `<div class="ffd-row"><button class="btn gold" data-dm="enrollask" data-id="${id}">Accept and enroll</button><button class="btn soft" data-dm="appstage" data-stage="waitlist" data-id="${id}">Waitlist</button><button class="btn soft" data-dm="appstage" data-stage="declined" data-id="${id}">Decline</button></div>`;
    else if (x.stage === 'waitlist') acts = `<div class="ffd-row"><button class="btn navy" data-dm="appstage" data-stage="application" data-id="${id}">Offer a spot</button></div>`;
    else if (x.stage === 'declined') acts = `<div class="ffd-row"><button class="btn soft" data-dm="appstage" data-stage="inquiry" data-id="${id}">Reopen</button></div>`;
    return `<li class="ffd-app"><div class="ffd-row sp"><b>${E(x.child)}</b><span class="mini">${E(x.age)}</span></div>
      <span class="mini">${E(x.guardian)} · wants ${E((DM.get('rooms', x.room) || {}).name || 'a room')}${x.start ? ` from ${E(shortD(x.start))}` : ''}${x.tour ? ` · tour ${E(x.tour.replace('T', ' '))}` : ''}</span>
      ${x.notes ? `<span class="small">${E(x.notes)}</span>` : ''}${acts}</li>`; };
  return `<div class="ffd-pipe">${STAGES.map(([st, label]) => { const xs = apps.filter(([, x]) => x.stage === st);
     if (st === 'declined' && !xs.length) return ''; return `<section class="card ffd-stage" aria-labelledby="dmSt_${st}"><div class="ffd-row sp"><h3 id="dmSt_${st}">${label}</h3><span class="chip">${xs.length}</span></div>${xs.length ? `<ul class="ffd-apps">${xs.map(card).join('')}</ul>` : '<p class="small muted">None right now.</p>'}</section>`; }).join('')}</div>
  <form class="card" id="dmAppForm" novalidate><h3>Add an inquiry</h3><p class="small">A family called or stopped by. Demo: use a made-up child and parent (first name and last initial).</p>
   <div class="grid g3" style="gap:10px"><label class="f" for="dmApChild">Child<input class="i" id="dmApChild" autocomplete="off" placeholder="e.g. Rafi K."></label>
    <label class="f" for="dmApAge">Age<select class="i" id="dmApAge"><option>2 years</option><option selected>3 years</option><option>4 years</option></select></label>
    <label class="f" for="dmApRoom">Room wanted${rs('dmApRoom', 'demo')}</label>
    <label class="f" for="dmApGuardian">Parent or guardian<input class="i" id="dmApGuardian" autocomplete="off" placeholder="e.g. Dee K."></label>
    <label class="f" for="dmApNotes" style="grid-column:span 2">Notes<input class="i" id="dmApNotes" autocomplete="off" placeholder="e.g. Needs full days"></label></div>
   <div class="ffd-row"><button class="btn navy" type="submit">Add inquiry</button></div><p class="note" id="dmApMsg" role="status" aria-live="polite"></p>
   <p class="mini">On the live site, applications from the Enroll page land here.</p></form>`;
}

// ---------------------------------------------------------------- Director: reports
function weekOf(date){ const a = api(), d = a.fromIso(date); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return [0,1,2,3,4].map(i => { const x = new Date(d); x.setDate(d.getDate() + i); return a.iso(x); }); }
function dReportsView(c){
  const a = api(), days = weekOf(c.date), rooms = Object.entries(DM.all('rooms')).sort((x, y) => (x[1].order || 9) - (y[1].order || 9));
  const cell = (room, dt) => { const ks = kidsOf(room), here = ks.filter(([id]) => (DM.get('kidday', `${id}_${dt}`) || {}).present === true).length; return {here, n:ks.length}; };
  const kd = Object.values(DM.all('kidday')).filter(x => days.includes(x.date));
  const meals = kd.reduce((s, x) => s + ['breakfast','lunch','snack'].filter(m => (x.meals || {})[m] && x.meals[m] !== 'Not recorded').length, 0);
  const reps = Object.values(DM.all('reports')).filter(r => days.includes(r.date)).length, obs = Object.values(a.obs()).filter(o => days.includes(o.date)).length;
  const plans = Object.values(DM.all('plans')).filter(p => days.includes(p.date) && p.status === 'approved').length;
  return `<div class="grid g4 ffd-tiles"><div class="card ffd-tile"><b>${meals}</b><span class="small muted">Meals recorded this week</span></div><div class="card ffd-tile"><b>${reps}</b><span class="small muted">Daily reports sent</span></div>
    <div class="card ffd-tile"><b>${obs}</b><span class="small muted">Learning notes written</span></div><div class="card ffd-tile"><b>${plans}</b><span class="small muted">Plans approved</span></div></div>
  <div class="card"><div class="ffd-row sp"><h3>Attendance · week of ${E(shortD(days[0]))}</h3><span class="ffd-row"><button class="btn soft" data-dm="csv">Download attendance (CSV)</button><button class="btn soft" data-dm="print">Print</button></span></div>
   <div class="tw"><table><caption class="sr-only">Children present by room and day</caption><tr><th scope="col">Room</th>${days.map(d => `<th scope="col" class="n">${E(shortD(d))}</th>`).join('')}</tr>
   ${rooms.map(([id, r]) => `<tr><th scope="row">${E(r.name)}</th>${days.map(d => { const x = cell(id, d); return `<td class="n">${d > DM.todayIso() ? '—' : `${x.here} of ${x.n}`}</td>`; }).join('')}</tr>`).join('')}</table></div>
   <p class="note">Counts children checked in each day. The live Hub also exports CACFP meal counts and licensing attendance in the formats the state asks for.</p></div>`;
}
function downloadCsv(){
  const days = weekOf(ctx().date), rows = [['date','room','child','status','checked_in','picked_up','picked_up_by']];
  const kids = DM.all('kids'), rooms = DM.all('rooms');
  days.forEach(d => Object.entries(kids).forEach(([id, k]) => { const x = DM.get('kidday', `${id}_${d}`) || {};
    rows.push([d, (rooms[k.room] || {}).name || k.room, `${k.first} ${k.last || ''}.`, x.present === true ? 'present' : x.present === false ? 'absent' : 'not recorded', fmtTime(x.inAt), fmtTime(x.outAt), x.outBy || '']); }));
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  try { const url = URL.createObjectURL(new Blob(['# DEMO sample data, made up\n' + csv], {type:'text/csv'})); const l = document.createElement('a'); l.href = url; l.download = `demo-attendance-${days[0]}.csv`; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000); say('Attendance CSV downloaded (demo data)'); }
  catch (_) { say('This browser could not make the file.'); }
}

// ---------------------------------------------------------------- photo picker (demo: sample pictures, never uploads)
const PICS = [['img/demo/sample-photo-blocks.svg','Block road'],['img/demo/sample-photo-painting.svg','Painting'],['img/demo/sample-photo-outdoors.svg','Outdoor play'],['img/demo/sample-photo-story.svg','Story time']];
function photoPick(id, label){
  return `<label class="f" for="${id}" style="flex:1 1 200px">${E(label)}<select class="i" id="${id}"><option value="">No picture</option>${PICS.map(([s, l]) => `<option value="${s}">Sample picture: ${l}</option>`).join('')}</select><span class="mini">Demo: sample pictures only. Nothing is uploaded.</span></label>`;
}

// ---------------------------------------------------------------- Account and password reset (demo flows)
const baseAccount = V.account, baseReset = V['reset-password'];
const PW_MIN = 10;
V.account = () => {
  if (!on()) return baseAccount ? baseAccount() : '';
  const s = ses();
  const head = phero('Account and security', 'Your Futures Hub account', '', {chars:['zuri']});
  if (!s) return head + `<section class="band-paper"><div class="wrap"><div class="card signin ffd-card">${BADGE}<h2 class="h3">Sign in to see your account</h2><p class="small">Account settings belong to a signed-in person. Sign in with a demo account to try them.</p>${roleButtons('teacher')}${accountsTable()}</div></div></section>`;
  const staff = s.role !== 'family';
  return head + `<section class="band-paper"><div class="wrap ffd-acct">
   <div class="card ffd-card">${BADGE}<h2 class="h3">${E(s.name)}</h2><p class="small">${E(s.label)} · <code>${E(s.email)}</code> · ${E(DM.CENTER)}</p>
    <div class="ffd-row"><button class="btn gold" type="button" data-demo="home">Open my ${s.role === 'family' ? 'Family Portal' : s.role === 'academy' ? 'training' : 'portal'}</button><button class="btn soft" type="button" data-demo="reset">Reset demo</button><button class="btn soft" type="button" data-demo="signout">Sign out</button></div></div>
   <form class="card ffd-card" id="dmPwForm" novalidate><h2 class="h3">Change password</h2>
    <label class="f" for="dmPwCur">Current password<input class="i" id="dmPwCur" type="password" autocomplete="off"></label>
    <label class="f" for="dmPwNew">New password (at least ${PW_MIN} characters)<input class="i" id="dmPwNew" type="password" autocomplete="off" minlength="${PW_MIN}"></label>
    <label class="f" for="dmPwNew2">Type it again<input class="i" id="dmPwNew2" type="password" autocomplete="off" minlength="${PW_MIN}"></label>
    <button class="btn navy" type="submit">Change password</button><p class="note" id="dmPwMsg" role="alert" aria-live="polite">${DS.pw ? E(DS.pw) : ''}</p>
    <p class="mini">Demo: the check runs here and nothing is saved, so the demo accounts keep the password <code>demo</code> for the next person.</p></form>
   ${staff ? `<div class="card ffd-card"><h2 class="h3">Two-step verification</h2>
    ${DS.mfa === 'on' ? `<p class="small"><span class="chip ok">On (demo)</span> Codes from your authenticator app are asked for at each sign-in.</p><button class="btn soft" type="button" data-dm="mfaoff">Turn off (demo)</button>`
      : DS.mfa === 'setup' ? `<form id="dmMfaForm" novalidate><p class="small">In the live Hub you scan a QR code with an authenticator app. Demo: type any 6 digits.</p><label class="f" for="dmMfaCode">6-digit code<input class="i" id="dmMfaCode" inputmode="numeric" maxlength="6" autocomplete="off"></label><div class="ffd-row"><button class="btn navy" type="submit">Verify</button><button class="btn soft" type="button" data-dm="mfacancel">Cancel</button></div><p class="note" id="dmMfaMsg" role="alert" aria-live="polite"></p></form>`
      : `<p class="small">${s.role === 'director' ? 'Directors must use two-step verification in the live Hub.' : 'Add a second step to your sign-in.'}</p><button class="btn navy" type="button" data-dm="mfasetup">Set up (demo)</button>`}</div>
   <form class="card ffd-card" id="dmPinForm" novalidate><h2 class="h3">Classroom tablet PIN</h2><p class="small">Unlocks a shared classroom tablet after 10 minutes idle.${DS.pin ? ' <span class="chip ok">PIN set (demo)</span>' : ''}</p>
    <label class="f" for="dmPin">New 4-digit PIN<input class="i" id="dmPin" type="password" inputmode="numeric" maxlength="4" autocomplete="off"></label><button class="btn navy" type="submit">Save PIN</button><p class="note" id="dmPinMsg" role="alert" aria-live="polite"></p></form>` : ''}
  </div></section>`;
};
V['reset-password'] = () => {
  if (!on()) return baseReset ? baseReset() : '';
  const fam = arg === 'family', st = DS.reset || {step:1};
  const head = phero('Reset your password', 'Forgot your password?', '', {chars:[fam ? 'lumi' : 'booker']});
  let body;
  if (st.step === 3) body = `<div class="card signin ffd-card" role="status">${BADGE}<h2 class="h3">Password updated (demo)</h2><p class="small">In the live Hub you would now sign in with your new password. The demo accounts always use <code>demo</code>, so nothing was changed.</p><div class="ffd-row"><button class="btn gold" type="button" data-dm="resetdone" data-to="${fam ? 'signin-family' : 'signin-teacher'}">Go to sign-in</button></div></div>`;
  else if (st.step === 2) body = `<form class="card signin ffd-card" id="dmResetPw" novalidate>${BADGE}<h2 class="h3">Choose a new password</h2><p class="small">In the live Hub we email a one-time link to <b>${E(st.email)}</b> and you open it to get here. In the demo no email is sent: continue right here.</p>
    <label class="f" for="dmRsNew">New password (at least ${PW_MIN} characters)<input class="i" id="dmRsNew" type="password" autocomplete="off"></label><label class="f" for="dmRsNew2">Type it again<input class="i" id="dmRsNew2" type="password" autocomplete="off"></label>
    <button class="btn navy" type="submit">Save new password</button><p class="note" id="dmRsMsg" role="alert" aria-live="polite"></p></form>`;
  else body = `<form class="card signin ffd-card" id="dmResetEmail" novalidate>${BADGE}<h2 class="h3">Email me a reset link</h2><p class="small">Enter the email of a demo account. Nothing is sent anywhere, and nothing you type is kept.</p>
    <label class="f" for="dmRsEmail">Email<input class="i" id="dmRsEmail" type="email" autocomplete="off" spellcheck="false" placeholder="${fam ? 'family' : 'teacher'}@demo.futuresfriends"></label>
    <button class="btn navy" type="submit">Send reset link</button><p class="note" id="dmRsMsg" role="alert" aria-live="polite"></p>
    <p class="mini"><button type="button" class="rl" data-go="${fam ? 'signin-family' : 'signin-teacher'}">Back to sign-in</button></p>${accountsTable()}</form>`;
  return head + `<section class="band-paper"><div class="wrap">${body}</div></section>`;
};
function pwProblem(p){ if (String(p).length < PW_MIN) return `Use at least ${PW_MIN} characters.`; if (/^(.)\1+$/.test(p) || /^(password|1234567890|qwerty)/i.test(p)) return 'That password is too easy to guess. Try three or four unrelated words.'; return ''; }

// ---------------------------------------------------------------- Academy (#learn, #learn-course/<code>)
const baseLearn = V.learn, baseCourse = V['learn-course'];
const COURSE = 'F-101';
const LESSONS = [['meet','Meet the Friends','Sample lesson video · about 2 minutes'],['loop','Our learning loop: six steps','Reading · 3 minutes'],['check','Knowledge check','3 questions']];
const QUIZ = [['q1','Which friend leads the Calm Corner?',['Booker','Lumi','Zuri','Bop'],'Lumi'],['q2','How many steps are in the Futures Friends learning loop?',['Four','Five','Six','Seven'],'Six'],
  ['q3','How do families see Learning Steps?',['As scores out of 100','As words with dated teacher notes','As a ranking in the class','They do not see them'],'As words with dated teacher notes']];
function myTraining(){ const s = ses(); return (s && DM.get('training', s.id)) || {courses:{}}; }
async function saveTraining(t){ const s = ses(); if (s) await DM.put('training', s.id, t); }
const catalog = () => ((typeof D !== 'undefined' && D.modules) || []);
function lmsShell(title, sub, body){
  const s = ses();
  return `<div class="lms"><div class="lms-hero"><div class="wrap"><div class="eyebrow">Futures Friends Academy${s ? ` · Signed in as ${E(s.name)} (${E(s.label)})` : ''}</div><h1>${E(title)}</h1>${sub ? `<p>${sub}</p>` : ''}
   <div class="ffd-row">${BADGE.replace('ffd-badge', 'ffd-badge ffd-dark')}${s ? `<button type="button" class="btn soft ffd-mini" data-go="learn">My training</button>${s.role !== 'academy' && s.role !== 'family' ? `<button type="button" class="btn soft ffd-mini" data-demo="home">My portal</button>` : ''}<button type="button" class="btn soft ffd-mini" data-demo="signout">Sign out</button>` : ''}</div></div></div><div class="wrap lms-body">${body}</div></div>`;
}
function courseProgress(code){ const c = (myTraining().courses || {})[code]; if (!c) return null; const n = code === COURSE ? LESSONS.filter(([k]) => (c.lessons || {})[k]).length : 0; return {n, total:code === COURSE ? LESSONS.length : 0, done:!!c.done, c}; }
V.learn = () => {
  if (!on()) return baseLearn ? baseLearn() : '';
  const s = ses();
  if (!s || s.role === 'family') return lmsShell('My training', 'Courses, clock hours and completion records for staff.', `<div class="lms-card ffd-card">${BADGE}<h2 class="h3">${s ? 'The Academy is for staff' : 'Sign in to the Academy demo'}</h2>
    <p class="small">${s ? 'You are signed in as a family. Sign out and sign in as a staff member to try the Academy.' : 'Sign in as a demo staff member to open the sample lesson and track progress.'}</p>
    ${s ? '<button class="btn soft" type="button" data-demo="signout">Sign out</button>' : `<div class="ffd-row"><button class="btn gold" type="button" data-demo-signin="academy">Sign in as Demo Academy staff</button><button class="btn soft" type="button" data-demo-signin="teacher">Demo Teacher</button><button class="btn soft" type="button" data-demo-signin="director">Demo Director</button></div>${accountsTable()}`}</div>`);
  const t = myTraining(), mine = Object.keys(t.courses || {}), cat = catalog();
  const p = courseProgress(COURSE) || {n:0, total:LESSONS.length, done:false};
  const hours = Object.values(t.courses || {}).reduce((a, c) => a + (c.done ? (c.hours || 0) : 0), 0);
  const f101 = cat.find(m => m.code === COURSE) || {title:'Welcome to Futures Friends', hours:1.5, format:'Online self-paced'};
  const others = mine.filter(code => code !== COURSE);
  const team = s.role === 'director' ? `<section class="lms-sec"><header><h2>My team (${COURSE})</h2></header><div class="tw"><table><caption class="sr-only">Team training</caption><tr><th scope="col">Staff</th><th scope="col">${COURSE}</th></tr>${Object.entries(DM.all('staff')).map(([id, st]) => { const x = trainingOf(id); return `<tr><td>${E(st.name)}</td><td><span class="chip ${x.done ? 'ok' : x.n ? 'warn' : ''}">${x.done ? 'Complete' : x.n ? `${x.n} of 3 lessons` : 'Not started'}</span></td></tr>`; }).join('')}</table></div></section>` : '';
  return lmsShell('My training', 'Your courses, clock hours and completion records.', `
   <div class="grid g3 ffd-tiles"><div class="card ffd-tile"><b>${hours}</b><span class="small muted">Clock hours completed (demo)</span></div><div class="card ffd-tile"><b>${mine.length || 1}</b><span class="small muted">Courses in my list</span></div><div class="card ffd-tile"><b>${p.done ? 1 : 0}</b><span class="small muted">Completion records</span></div></div>
   <section class="lms-sec"><header><h2>My courses</h2></header><div class="lms-grid">
    <div class="lms-card ffd-course" style="--c:var(--booker)"><span class="lms-note">${COURSE} · ${E(String(f101.hours))} clock hours · ${E(f101.format || '')}</span><h3>${E(f101.title)}</h3>
     <div class="meter" role="progressbar" aria-label="${COURSE} progress" aria-valuemin="0" aria-valuemax="${p.total}" aria-valuenow="${p.n}"><i style="width:${Math.round(p.n / p.total * 100)}%"></i></div>
     <span class="small">${p.done ? 'Complete' : `${p.n} of ${p.total} lessons done`}</span>
     <div class="ffd-row"><a class="btn ${p.done ? 'soft' : 'gold'}" href="#learn-course/${COURSE}">${p.done ? 'Review the course' : p.n ? 'Continue' : 'Start the course'}</a></div></div>
    ${others.map(code => { const m = cat.find(x => x.code === code) || {title:code}; return `<div class="lms-card ffd-course"><span class="lms-note">${E(code)} · ${E(String(m.hours || ''))} clock hours</span><h3>${E(m.title)}</h3><span class="small">Added to my list</span><div class="ffd-row"><a class="btn soft" href="#learn-course/${E(code)}">Open</a></div></div>`; }).join('')}</div></section>
   ${team}
   <section class="lms-sec"><header><h2>Course catalog</h2></header><p class="small">The demo opens the first course. Licensed centers get the full Academy.</p>
    <div class="tw"><table><caption class="sr-only">Course catalog</caption><tr><th scope="col">Code</th><th scope="col">Course</th><th scope="col" class="n">Hours</th><th scope="col"><span class="sr-only">Add</span></th></tr>
    ${cat.slice(0, 12).map(m => `<tr><td>${E(m.code)}</td><td>${E(m.title)}</td><td class="n">${E(String(m.hours))}</td><td>${mine.includes(m.code) || m.code === COURSE ? '<span class="chip ok">In my list</span>' : `<button class="rl" data-dm="lmsadd" data-code="${E(m.code)}">Add to my list</button>`}</td></tr>`).join('')}</table></div></section>`);
};
V['learn-course'] = () => {
  if (!on()) return baseCourse ? baseCourse() : '';
  const s = ses(); if (!s || s.role === 'family') return V.learn();
  const code = String(arg || COURSE), m = catalog().find(x => x.code === code) || {title:code, hours:'', format:''};
  if (code !== COURSE) return lmsShell(m.title, `${E(code)} · ${E(String(m.hours))} clock hours · ${E(m.format || '')}`, `<div class="lms-card ffd-card"><h2 class="h3">Course content is for licensed centers</h2><p class="small">This course is in your list. Its lessons open for staff at licensed centers. The demo includes the first course, ${COURSE}, with its sample lesson.</p><div class="ffd-row"><a class="btn gold" href="#learn-course/${COURSE}">Open ${COURSE}</a><a class="btn soft" href="#learn">Back to My training</a></div></div>`);
  const t = myTraining(), c = (t.courses || {})[COURSE] || {lessons:{}}, cur = DS.lesson && LESSONS.some(l => l[0] === DS.lesson) ? DS.lesson : (LESSONS.find(([k]) => !(c.lessons || {})[k]) || LESSONS[0])[0];
  const done = LESSONS.filter(([k]) => (c.lessons || {})[k]).length;
  const nav = `<nav class="lms-card ffd-lessons" aria-label="Lessons"><h2 class="h4">Lessons</h2><ol>${LESSONS.map(([k, n, d]) => `<li><button class="ffd-lesson${k === cur ? ' is-on' : ''}" data-dm="lesson" data-k="${k}" aria-current="${k === cur ? 'step' : 'false'}"><span class="ffd-tick${(c.lessons || {})[k] ? ' on' : ''}" aria-hidden="true">${(c.lessons || {})[k] ? '✓' : ''}</span><span><b>${E(n)}</b><span class="mini">${E(d)}${(c.lessons || {})[k] ? ' · done' : ''}</span></span></button></li>`).join('')}
    <li><span class="ffd-lesson is-locked"><span class="ffd-tick" aria-hidden="true">\u{1F512}</span><span><b>Modules 2 and 3</b><span class="mini">For licensed centers</span></span></span></li></ol>
    <div class="meter" role="progressbar" aria-label="Course progress" aria-valuemin="0" aria-valuemax="${LESSONS.length}" aria-valuenow="${done}"><i style="width:${Math.round(done / LESSONS.length * 100)}%"></i></div><span class="small">${done} of ${LESSONS.length} lessons done</span></nav>`;
  const mark = k => (c.lessons || {})[k] ? '<span class="chip ok">Lesson complete</span>' : `<button class="btn gold" data-dm="lessondone" data-k="${k}">Mark lesson complete</button>`;
  let main;
  if (cur === 'meet') main = `<div class="lms-card"><h2 class="h3">Meet the Friends</h2><p class="small">Ms. June, a story-world teacher, introduces Booker, Lumi, Zuri and Bop: four friends, four pillars, one program.</p>
    <div class="ffd-video"><video id="dmVideo" controls playsinline preload="metadata" poster="video/academy-welcome-poster.jpg" src="video/academy-welcome.mp4" aria-label="Sample lesson video: Meet the Friends">${window.FFCaptions ? window.FFCaptions.tracks('video/academy-welcome.mp4') : ''}</video></div>
    <p class="mini">Story-world animation with captions. The lesson is marked complete when the video ends, or with the button.</p><div class="ffd-row">${mark('meet')}</div></div>`;
  else if (cur === 'loop') main = `<div class="lms-card"><h2 class="h3">Our learning loop: six steps</h2><p class="small">Every Futures Friends day follows the same six steps, so children know what comes next.</p>
    <ol class="ffd-loop big">${LOOP.map(([k, n, d]) => `<li style="--c:var(--${STEP_FRIEND[k]})"><b>${n}</b> ${E(d)}</li>`).join('')}</ol><div class="ffd-row">${mark('loop')}</div></div>`;
  else main = `<form class="lms-card" id="dmQuiz" novalidate><h2 class="h3">Knowledge check</h2><p class="small">Answer all three to finish the lesson.</p>
    ${QUIZ.map(([id, q, opts]) => `<fieldset class="ffd-q"><legend>${E(q)}</legend>${opts.map((o, i) => `<label class="ffd-opt"><input type="radio" name="${id}" value="${E(o)}" ${DS.quiz[id] === o ? 'checked' : ''}> ${E(o)}</label>`).join('')}</fieldset>`).join('')}
    <div class="ffd-row"><button class="btn navy" type="submit">Check my answers</button>${(c.lessons || {}).check ? '<span class="chip ok">Lesson complete</span>' : ''}</div><p class="note" id="dmQuizMsg" role="alert" aria-live="polite">${DS.quizRes ? E(DS.quizRes) : ''}</p></form>`;
  const cert = c.done ? `<div class="lms-card ffd-cert" id="dmCert"><span class="lms-note">Completion record · demo, not a real certificate</span><h2 class="h3">${E(m.title)}</h2><p class="small">${E(s.name)} · ${COURSE} · ${E(String(m.hours || 1.5))} clock hours (Futures Friends hours) · completed ${E(new Date(c.done).toLocaleDateString('en-US', {month:'long', day:'numeric', year:'numeric'}))}</p><div class="ffd-row"><button class="btn soft" data-dm="print">Print</button></div></div>` : '';
  return lmsShell(m.title, `${COURSE} · ${E(String(m.hours))} clock hours · ${E(m.format || '')}`, `${cert}<div class="ffd-course-grid">${nav}<div style="display:grid;gap:16px;align-content:start">${main}</div></div>`);
};
async function lessonDone(k){
  const t = myTraining(); t.courses = t.courses || {}; const c = t.courses[COURSE] = t.courses[COURSE] || {lessons:{}}; c.lessons = c.lessons || {};
  if (c.lessons[k]) return; c.lessons[k] = true; c.started = c.started || Date.now();
  const all = LESSONS.every(([x]) => c.lessons[x]); if (all) { c.done = Date.now(); c.hours = 1.5; }
  await saveTraining(t);
  const next = LESSONS.find(([x]) => !c.lessons[x]); DS.lesson = next ? next[0] : k;
  say(all ? `Course complete: ${COURSE} (demo completion record below)` : 'Lesson complete');
  rerender(all ? '#dmCert' : null);
}
document.addEventListener('ended', e => { if (e.target && e.target.id === 'dmVideo' && view === 'learn-course') lessonDone('meet'); }, true);

// ---------------------------------------------------------------- self-serve centers (the platform's business model, in the demo)
// Each demo center is its own space: its own name, colour, sign-in page (#c/<slug>), rooms, children, staff, plans and families.
// Director = the center owner. "Start your center" makes a new, empty center with a Get started list; Invite staff / Invite families
// add people to it. The switcher moves between centers; nothing from one center ever shows in another (separate storage keys).
function getStarted(){
  const c = DM.center(), rooms = Object.keys(DM.all('rooms')).length, staff = Object.keys(DM.all('staff')).length, inv = Object.values(DM.all('invites'));
  const kids = Object.keys(DM.all('kids')).length, plans = Object.keys(DM.all('plans')).length;
  const steps = [
    ['Create your center', `${c.name} · ${DM.TYPE_LABEL[c.type]} · ${c.state}`, true, ''],
    ['Set up classrooms', `${rooms} ${rooms === 1 ? 'classroom' : 'classrooms'}`, rooms > 0, 'setup'],
    ['Invite staff', staff > 1 ? `${staff} staff` : inv.some(i => i.kind === 'staff') ? 'Invitation sent' : 'Nobody invited yet', staff > 1 || inv.some(i => i.kind === 'staff'), 'invite'],
    ['Invite families', kids ? `${kids} children enrolled` : inv.some(i => i.kind === 'family') ? 'Invitation sent' : 'No families yet', kids > 0 || inv.some(i => i.kind === 'family'), 'invite'],
    ['Write the first daily plan', plans ? `${plans} plans` : 'No plans yet', plans > 0, 'plans']];
  const done = steps.filter(x => x[2]).length, all = done === steps.length;
  const link = `<p class="small">Your center's own sign-in page: <a href="#c/${E(c.slug)}">#c/${E(c.slug)}</a></p>`;
  if (all) return `<div class="card ffd-gs is-done" style="--cc:${E(c.color)}"><div class="ffd-row sp"><h3>Get started</h3><span class="chip ok">Setup complete</span></div>${link}</div>`;
  return `<div class="card ffd-gs" style="--cc:${E(c.color)}"><div class="ffd-row sp"><h3>Get started with ${E(c.name)}</h3><span class="chip warn">${done} of ${steps.length} done</span></div>
   <div class="meter" role="progressbar" aria-label="Setup progress" aria-valuemin="0" aria-valuemax="${steps.length}" aria-valuenow="${done}"><i style="width:${Math.round(done / steps.length * 100)}%"></i></div>
   <ol class="ffd-gslist">${steps.map(([t, d, ok, tab]) => `<li class="${ok ? 'ok' : ''}"><span class="ffd-tick${ok ? ' on' : ''}" aria-hidden="true">${ok ? '✓' : ''}</span><span><b>${E(t)}</b><span class="mini">${E(d)}${ok ? ' · done' : ''}</span></span>${!ok && tab ? `<button class="btn soft" data-ptab="${tab}">${E(t)}</button>` : ''}</li>`).join('')}</ol>${link}</div>`;
}
function inviteView(c){
  const center = DM.center(), inv = Object.entries(DM.all('invites')).sort((a, b) => b[1].at - a[1].at), rooms = Object.entries(DM.all('rooms')).sort((x, y) => (x[1].order || 9) - (y[1].order || 9));
  const rs = id => `<select class="i" id="${id}">${rooms.map(([rid, r]) => `<option value="${rid}">${E(r.name)}</option>`).join('')}</select>`;
  const line = ([id, x]) => `<li class="ffd-app"><div class="ffd-row sp"><b>${E(x.kind === 'staff' ? x.name : `${x.parent} · ${x.child}`)}</b><span class="chip ${x.status === 'accepted' ? 'ok' : 'warn'}">${x.status === 'accepted' ? 'Joined' : 'Invitation sent'}</span></div>
     <span class="mini">${x.kind === 'staff' ? E(x.role) : 'Family'} · ${E((DM.get('rooms', x.room) || {}).name || '')} · code ${E(x.code)} · link #c/${E(center.slug)}</span>
     ${x.status === 'pending' ? `<div class="ffd-row"><button class="btn navy" data-dm="invaccept" data-id="${id}">Accept as ${E(x.kind === 'staff' ? x.name : x.parent)} (demo)</button><button class="btn soft" data-dm="invcancel" data-id="${id}">Cancel invitation</button></div>` : ''}</li>`;
  return `<div class="ffd-cols"><div style="display:grid;gap:16px">
   <form class="card" id="dmInvStaff" novalidate><h3>Invite staff</h3><p class="small">They get a sign-in for <b>${E(center.name)}</b> only. Demo: made-up names, and no email is sent; you accept the invitation yourself below.</p>
    <div class="grid g3" style="gap:10px"><label class="f" for="dmIsName">Name<input class="i" id="dmIsName" autocomplete="off" placeholder="e.g. Ms. Rosa V."></label>
    <label class="f" for="dmIsRole">Role<select class="i" id="dmIsRole">${STAFF_ROLES.filter(r => r !== 'Director').map(r => `<option>${r}</option>`).join('')}</select></label><label class="f" for="dmIsRoom">Room${rs('dmIsRoom')}</label></div>
    <div class="ffd-row"><button class="btn navy" type="submit">Send staff invitation</button></div><p class="note" id="dmIsMsg" role="status" aria-live="polite"></p></form>
   <form class="card" id="dmInvFam" novalidate><h3>Invite families</h3><p class="small">A family sees only their own child at ${E(center.name)}. Demo: made-up names (first name and last initial).</p>
    <div class="grid g3" style="gap:10px"><label class="f" for="dmIfParent">Parent or guardian<input class="i" id="dmIfParent" autocomplete="off" placeholder="e.g. Dee K."></label>
    <label class="f" for="dmIfChild">Child<input class="i" id="dmIfChild" autocomplete="off" placeholder="e.g. Rafi K."></label><label class="f" for="dmIfRoom">Room${rs('dmIfRoom')}</label></div>
    <div class="ffd-row"><button class="btn navy" type="submit">Send family invitation</button></div><p class="note" id="dmIfMsg" role="status" aria-live="polite"></p></form></div>
   <div class="card"><h3>Invitations</h3>${inv.length ? `<ul class="ffd-apps">${inv.map(line).join('')}</ul>` : '<p class="small muted">No invitations yet.</p>'}
    <p class="note">In the live Hub each person gets a one-time email link to ${E(center.name)}'s sign-in page, chooses a password, and staff classrooms open once background checks are on file.</p></div></div>`;
}
const baseStart = V['start-center'], baseC = V.c;
V['start-center'] = () => {
  if (!on()) return baseStart ? baseStart() : '';
  return phero('Start your center', 'Futures Hub for your program', 'Create your own center space in the demo: its own name, colour and sign-in page. Nothing is sent anywhere.', {chars:['zuri','bop']}) + `
  <section class="band-paper"><div class="wrap"><form class="card signin ffd-card ffd-start" id="dmStartForm" novalidate>${BADGE}<h2 class="h3">Your center</h2>
   <label class="f" for="dmScName">Center name<input class="i" id="dmScName" autocomplete="off" maxlength="60" placeholder="e.g. Little Acorns Learning Center (demo)"></label>
   <fieldset class="ffd-fs"><legend>Type of program</legend><label class="ffd-opt"><input type="radio" name="dmScType" value="child_care" checked> Child care center</label><label class="ffd-opt"><input type="radio" name="dmScType" value="church"> Church program (preschool or ministry)</label></fieldset>
   <label class="f" for="dmScState">State<select class="i" id="dmScState"><option value="MO">Missouri</option><option value="KS">Kansas</option></select></label>
   <fieldset class="ffd-fs"><legend>Your center's colour</legend><div class="ffd-swatches">${DM.COLORS.map((col, i) => `<label class="ffd-sw"><input type="radio" name="dmScColor" value="${col}" ${i === 0 ? 'checked' : ''}><span style="background:${col}" aria-hidden="true"></span><span class="sr-only">Colour ${i + 1}</span></label>`).join('')}</div></fieldset>
   <label class="f" for="dmScOwner">Your name as the owner (made up)<input class="i" id="dmScOwner" autocomplete="off" maxlength="40" placeholder="e.g. Ms. Kim R."></label>
   <button class="btn gold" type="submit">Create my center</button><p class="note" id="dmScMsg" role="alert" aria-live="polite"></p>
   <p class="mini">You become the owner and director. Next: Get started, invite staff and invite families.</p></form>
   <div class="card ffd-card" style="margin-top:16px"><h2 class="h3">Demo centers already here</h2><ul class="ffd-plain">${DM.centers().map(c => `<li class="small">${centerChip(c)} <a href="#c/${E(c.slug)}">#c/${E(c.slug)}</a></li>`).join('')}</ul></div></div></section>`;
};
V.c = () => {
  if (!on()) return baseC ? baseC() : V['not-found'] ? V['not-found']() : '';
  const c = DM.bySlug(arg);
  if (!c) return phero('Center sign-in', 'Find your center', '', {chars:['booker']}) + `<section class="band-paper"><div class="wrap"><div class="card signin ffd-card">${BADGE}<h2 class="h3">No demo center at this address</h2>
    <ul class="ffd-plain">${DM.centers().map(x => `<li class="small"><a href="#c/${E(x.slug)}">${E(x.name)}</a></li>`).join('')}</ul><button class="btn gold" type="button" data-go="start-center">Start your center</button></div></div></section>`;
  const s = ses(); if (!s || s.center !== c.id) DM.setViewCenter(c.id);
  const k = c.type === 'church' ? 'lumi' : 'booker';
  return `<div class="ffd-cpage" style="--cc:${E(c.color)}">` + phero('Center sign-in', E(c.name), `${E(DM.TYPE_LABEL[c.type])} · ${E(c.state)} · sign in to this center's Futures Hub`, {chars:[k]}) + `</div>
  <section class="band-paper"><div class="wrap"><div class="card signin ffd-card" id="ffdCenterSignin">${BADGE}${centerChip(c)}
   ${s && s.center === c.id ? `<p class="small">You are signed in here as <b>${E(s.name)}</b> (${E(s.label)}).</p><div class="ffd-row"><button class="btn gold" type="button" data-demo="home">Open my portal</button><button class="btn soft" type="button" data-demo="signout">Sign out</button></div>`
   : `<h2 class="h3">Sign in to ${E(c.name)}</h2><p class="small">This page belongs to this center only. Staff and families of other centers cannot see its children or plans.</p>
   <div class="ffd-roles" role="group" aria-label="Choose a demo account">${['director','teacher','family','academy'].map(key => { const a = DM.ACCOUNTS.find(x => x.key === key), f = {teacher:'booker', director:'zuri', family:'lumi', academy:'bop'}[key];
     return `<button type="button" class="ffd-role" style="--c:var(--${f})" data-demo-signin="${key}" data-center="${E(c.id)}"><img src="${E(FFcut(f))}" alt="" width="44" height="44"><span><b>Sign in as ${E(a.label)}</b><span class="mini">${E(whoIn(key))}</span></span></button>`; }).join('')}</div>`}
   <p class="mini">Demo sign-in page at <code>#c/${E(c.slug)}</code>. In the live Hub this is the address a center shares with its staff and families.</p></div></div></section>`;
};

// ---------------------------------------------------------------- events
document.addEventListener('click', async e => {
  if (!on()) return;
  const t = e.target;
  const si = t.closest && t.closest('[data-demo-signin]');
  if (si) { e.preventDefault(); const s = DM.signIn(si.dataset.demoSignin, si.dataset.center); if (s) afterSignIn(); return; }
  const d = t.closest && t.closest('[data-demo]');
  if (d) { e.preventDefault(); const a = d.dataset.demo;
    if (a === 'signout') return signOut();
    if (a === 'reset') return resetDemo(d);
    if (a === 'home') { const s = ses(); if (!s) return go('signin-teacher'); if (s.home !== 'learn' && !ctx().demo) connect(); return go(s.home); }
    return; }
  // children tab "Report" link: open this child's report preview
  const rp = t.closest && t.closest('[data-report]'); if (rp && ctx().demo) { DS.open[rp.dataset.report] = true; setTimeout(() => rerender(`[data-dm="repopen"][data-child="${rp.dataset.report}"]`), 0); return; }
  const b = t.closest && t.closest('[data-dm]'); if (!b) return;
  const act = b.dataset.dm, c = ctx(), A = api(), id = b.dataset.id, kid = b.dataset.child;
  const writer = c.canWrite;
  try {
    // ---- check-in
    if (act === 'checkin' && writer) { await kdUpdate(kid, x => { x.present = true; x.inAt = nowOn(x.date); x.inBy = 'Family'; x.inStaff = c.me; delete x.outAt; }); say(`${A.kidName(kid)} checked in at ${fmtTime(nowOn(c.date))}`); return rerender(`[data-dm="outask"][data-child="${kid}"]`); }
    if (act === 'absent' && writer) { await kdUpdate(kid, x => { x.present = false; delete x.inAt; delete x.outAt; }); say(`${A.kidName(kid)} marked absent`); return rerender(`[data-dm="undo"][data-child="${kid}"]`); }
    if (act === 'outask') { DS.out[kid] = true; return rerender(`#dmOut_${kid}`); }
    if (act === 'outcancel') { delete DS.out[kid]; return rerender(`[data-dm="outask"][data-child="${kid}"]`); }
    if (act === 'checkout' && writer) { const by = (document.getElementById('dmOut_' + kid) || {}).value || 'Family'; delete DS.out[kid];
      await kdUpdate(kid, x => { x.outAt = nowOn(x.date); x.outBy = by; if (x.napStart && !x.napEnd) x.napEnd = x.outAt; }); say(`${A.kidName(kid)} picked up by ${by}`); return rerender(`[data-dm="undo"][data-child="${kid}"]`); }
    if (act === 'undo' && writer) { await kdUpdate(kid, x => { if (x.outAt) { delete x.outAt; delete x.outBy; } else { x.present = null; delete x.inAt; } }); say('Undone'); return rerender(); }
    if (act === 'allin' && writer) { let n = 0; for (const [k2] of kidsOf(c.room)) { const x = A.kd(k2, c.date); if (x.present == null) { await kdUpdate(k2, y => { y.present = true; y.inAt = nowOn(y.date); y.inBy = 'Family'; y.inStaff = c.me; }); n++; } } say(n ? `${n} checked in` : 'Everyone is already marked'); return rerender(); }
    if (act === 'care' && writer) { const tp = b.dataset.t; await kdUpdate(kid, x => { x.care = (x.care || []).concat([{t:tp, at:nowOn(x.date), by:c.me}]); }); say(`${tp} logged for ${A.kidName(kid)} at ${fmtTime(nowOn(c.date))}`); return rerender(`[data-dm="care"][data-child="${kid}"][data-t="${tp}"]`); }
    if (act === 'napstart' && writer) { await kdUpdate(kid, x => { x.napStart = nowOn(x.date); delete x.napEnd; }); say(`Nap started for ${A.kidName(kid)}`); return rerender(`[data-dm="napend"][data-child="${kid}"]`); }
    if (act === 'napend' && writer) { await kdUpdate(kid, x => { x.napEnd = Math.max(nowOn(x.date), x.napStart + 60000); const m = Math.round((x.napEnd - x.napStart) / 60000);
        x.nap = m < 30 ? 'Under 30 min' : m < 60 ? '30 to 60 min' : m <= 90 ? '60 to 90 min' : 'Over 90 min'; x.napMin = m; }); say(`Nap ended for ${A.kidName(kid)}`); return rerender(`[data-dm="napstart"][data-child="${kid}"]`); }
    // ---- plans
    if (act === 'plansave' && writer) { if (await savePlan('draft')) { say('Draft saved'); rerender('[data-dm="plansave"]'); planMsg('Draft saved. Submit it when it is ready.'); } return; }
    if (act === 'plansubmit' && writer) { if (await savePlan('submitted')) { say('Submitted to the director'); rerender('[data-dm="plansubmit"]'); planMsg('Submitted. The director sees it under Approvals.'); } return; }
    if (act === 'planapprove' && writer) { if (await savePlan('approved')) { say('Plan approved'); rerender('[data-dm="planapprove"]'); planMsg('Approved: it shows on Today and in each family’s day.'); } return; }
    if (act === 'plancopy' && writer) { const p = readPlanForm(planOf(c.room, c.date) || {room:c.room}); const nd = DM.weekdayOffset(c.date, 1);
      if (!p.title) { planMsg('Give the plan a title first.', true); return; }
      await DM.put('plans', planId(c.room, nd), Object.assign({}, p, {room:c.room, date:nd, status:'draft', by:c.me, at:Date.now(), review:undefined}));
      say(`Copied to ${shortD(nd)} as a draft`); return planMsg(`Copied to ${shortD(nd)} as a draft.`); }
    if (act === 'plandel' && writer) { if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Click again to delete'; return; } await DM.del('plans', planId(c.room, c.date)); say('Plan deleted'); return rerender('#dmTitle'); }
    if (act === 'planfromsample' && writer) { const G = (window.FFGate || {}).SAMPLE || {title:'Kind Hands, Kind Words'}; const cur = planOf(c.room, c.date);
      if (cur && cur.title) { planMsg('This day already has a plan. Pick an empty day in the week strip first.', true); return; }
      DS.plan[planId(c.room, c.date)] = {room:c.room, date:c.date, status:'new', friend:'lumi', area:'se', title:G.title, steps:{}, notes:'Started from the public sample day title. Write your own six steps.'};
      say('Title and friend filled in. Write your own steps.'); return rerender('#dmStep_watch'); }
    // ---- reports
    if (act === 'repopen') { DS.open[kid] = !DS.open[kid]; return rerender(`[data-dm="repopen"][data-child="${kid}"]`); }
    if (act === 'repsend' && writer) { await sendReport(kid); say(`Report sent to ${A.kidName(kid)}'s family`); return rerender(`[data-dm="repsend"][data-child="${kid}"]`); }
    if (act === 'repall' && writer) { let n = 0; for (const [k2] of kidsOf(c.room)) { if (A.kd(k2, c.date).present === true && !DM.get('reports', `${k2}_${c.date}`)) { await sendReport(k2); n++; } } say(`${n} reports sent`); return rerender(); }
    // ---- director
    if (act === 'openroom') { A.setRoom(b.dataset.room); A.setTab('today'); return rerender(); }
    if (act === 'duedone') { const x = DM.get('dues', id); x.done = true; x.doneAt = Date.now(); x.doneBy = c.me; await DM.put('dues', id, x); say(`Done: ${x.title}`); return rerender(); }
    if (act === 'dueundo') { const x = DM.get('dues', id); x.done = false; delete x.doneAt; await DM.put('dues', id, x); return rerender(); }
    if (act === 'duty') { const x = DM.get('staff', id); x.onDuty = !x.onDuty; x.clockIn = x.onDuty ? Date.now() : null; await DM.put('staff', id, x); say(`${x.name} ${x.onDuty ? 'clocked in' : 'clocked out'}`); return rerender(`[data-dm="duty"][data-id="${id}"]`); }
    if (act === 'staffdel') { if (!DS.armed['st' + id]) { DS.armed['st' + id] = true; return rerender(`[data-dm="staffdel"][data-id="${id}"]`); } delete DS.armed['st' + id]; const x = DM.get('staff', id); await DM.del('staff', id); say(`${x ? x.name : 'Staff member'} removed`); return rerender(); }
    if (act === 'revopen') { DS.review[id] = !DS.review[id]; return rerender(`[data-dm="revopen"][data-id="${id}"]`); }
    if (act === 'planok' || act === 'planback') { const p = DM.get('plans', id), note = ((document.getElementById('dmRevNote_' + id) || {}).value || '').trim();
      if (act === 'planback' && !note) { const n = document.getElementById('dmRevNote_' + id); if (n) n.focus(); say('Write a note so the teacher knows what to change'); return; }
      p.status = act === 'planok' ? 'approved' : 'returned'; p.review = {by:c.me, at:Date.now(), note}; await DM.put('plans', id, p); say(act === 'planok' ? `Approved: ${p.title}` : 'Returned to the teacher with your note'); return rerender(); }
    if (act === 'reqok' || act === 'reqno') { const r = DM.get('requests', id); r.status = act === 'reqok' ? 'approved' : 'declined'; r.decidedBy = c.me; r.decidedAt = Date.now(); await DM.put('requests', id, r); say(r.status === 'approved' ? 'Approved' : 'Declined'); return rerender(); }
    if (act === 'tourask') { DS.tour[id] = true; return rerender(`#dmTour_${id}`); }
    if (act === 'tourcancel') { delete DS.tour[id]; return rerender(); }
    if (act === 'tourbook') { const v = (document.getElementById('dmTour_' + id) || {}).value; if (!v) { const f = document.getElementById('dmTour_' + id); if (f) f.focus(); say('Choose a day and time'); return; }
      const x = DM.get('apps', id); x.stage = 'tour'; x.tour = v; await DM.put('apps', id, x); delete DS.tour[id]; say(`Tour booked for ${x.child}`); return rerender(); }
    if (act === 'appstage') { const x = DM.get('apps', id); x.stage = b.dataset.stage; if (x.stage !== 'tour') delete x.tour; await DM.put('apps', id, x); say(`${x.child}: ${STAGES.find(s => s[0] === x.stage)[1]}`); return rerender(); }
    if (act === 'enrollask') { DS.enroll[id] = true; return rerender(`#dmEnRoom_${id}`); }
    if (act === 'enrollcancel') { delete DS.enroll[id]; return rerender(); }
    if (act === 'enrollok') { const x = DM.get('apps', id), room = (document.getElementById('dmEnRoom_' + id) || {}).value || x.room, start = (document.getElementById('dmEnStart_' + id) || {}).value || '';
      const parts = String(x.child).trim().split(/\s+/), first = parts[0], last = (parts[1] || '').replace(/\W/g, '').charAt(0).toUpperCase();
      const kidId = 'k' + Date.now().toString(36); await A.put('kids', kidId, {first, last, room, start}); x.stage = 'enrolled'; x.room = room; x.start = start; x.kid = kidId; await DM.put('apps', id, x);
      await DM.put('progress', kidId, {kid:kidId, band:room === 'twos' ? 'twos' : room === 'prek' ? 'prek' : 'threes', bandHistory:[], steps:{}});
      delete DS.enroll[id]; say(`${first} enrolled in ${(DM.get('rooms', room) || {}).name || 'the room'}`); return rerender(); }
    if (act === 'invaccept') { const x = DM.get('invites', id); if (!x || x.status !== 'pending') return;
      if (x.kind === 'staff') await DM.put('staff', 's-' + Date.now().toString(36), {name:x.name, role:x.role, room:x.room, onDuty:false, bg:'Pending', bgDue:DM.weekdayOffset(DM.todayIso(), 30)});
      else { const parts = String(x.child).trim().split(/\s+/), kidId = 'k' + Date.now().toString(36);
        await A.put('kids', kidId, {first:parts[0], last:(parts[1] || '').replace(/\W/g, '').charAt(0).toUpperCase(), room:x.room});
        await DM.put('progress', kidId, {kid:kidId, band:x.room === 'twos' ? 'twos' : x.room === 'prek' ? 'prek' : 'threes', bandHistory:[], steps:{}});
        if (!DM.familyKids().length) DM.setFamily(x.parent, kidId); }
      x.status = 'accepted'; x.acceptedAt = Date.now(); await DM.put('invites', id, x); say(`${x.kind === 'staff' ? x.name : x.parent} joined ${DM.CENTER}`); return rerender(); }
    if (act === 'invcancel') { await DM.del('invites', id); say('Invitation cancelled'); return rerender(); }
    if (act === 'csv') return downloadCsv();
    if (act === 'print') { try { window.print(); } catch (_) {} return; }
    // ---- account
    if (act === 'mfasetup') { DS.mfa = 'setup'; return rerender('#dmMfaCode'); }
    if (act === 'mfacancel') { DS.mfa = null; return rerender(); }
    if (act === 'mfaoff') { DS.mfa = null; say('Two-step verification turned off (demo)'); return rerender(); }
    if (act === 'resetdone') { DS.reset = null; return go(b.dataset.to); }
    // ---- academy
    if (act === 'lesson') { DS.lesson = b.dataset.k; DS.quizRes = null; return rerender(`[data-dm="lesson"][data-k="${b.dataset.k}"]`); }
    if (act === 'lessondone') return lessonDone(b.dataset.k);
    if (act === 'lmsadd') { const tr = myTraining(); tr.courses = tr.courses || {}; tr.courses[b.dataset.code] = tr.courses[b.dataset.code] || {lessons:{}, added:Date.now()}; await saveTraining(tr); say(`${b.dataset.code} added to My courses`); return rerender(); }
  } catch (err) { console.error(err); say('That did not work in the demo. Try "Reset demo".'); }
});
document.addEventListener('change', async e => {
  if (!on()) return; const t = e.target;
  if (t.dataset && t.dataset.dmCh === 'center') { const s = ses();
    if (s) { DM.switchCenter(t.value); try { sessionStorage.setItem('ff-demo-switched', DM.CENTER); } catch (_) {} location.reload(); return; }
    DM.setViewCenter(t.value); return rerender('#' + t.id); }
  if (t.dataset && t.dataset.dmCh === 'staffroom' && t.dataset.id) { const x = DM.get('staff', t.dataset.id); x.room = t.value; await DM.put('staff', t.dataset.id, x); say(`${x.name} moved`); return rerender(`#${t.id}`); }
  if (t.name && /^q\d$/.test(t.name)) DS.quiz[t.name] = t.value;
});
document.addEventListener('submit', async e => {
  if (!on()) return; const f = e.target; if (!f || !f.id) return;
  const v = id => ((document.getElementById(id) || {}).value || '').trim(), msg = (id, txt, bad) => { const m = document.getElementById(id); if (m) { m.textContent = txt; m.style.color = bad ? 'var(--bad)' : 'var(--ok)'; } };
  if (f.id === 'ffdSigninForm') { e.preventDefault(); const em = v('ffdEmail'), pw = (document.getElementById('ffdPass') || {}).value || '';
    if (!em || !pw) return msg('ffdMsg', 'Enter a demo email and password, or use a "Sign in as" button above.', true);
    const s = DM.signInWith(em, pw);
    if (!s) { const p = document.getElementById('ffdPass'); if (p) p.value = ''; return msg('ffdMsg', 'That is not one of the demo accounts. Open "Demo accounts" below for the emails and password.', true); }
    return afterSignIn(); }
  if (f.id === 'dmStartForm') { e.preventDefault(); const name = v('dmScName'); if (!name) { const n = document.getElementById('dmScName'); if (n) n.focus(); return msg('dmScMsg', 'Give your center a name.', true); }
    const pick = n2 => (f.querySelector(`input[name="${n2}"]:checked`) || {}).value;
    const c = DM.createCenter({name, type:pick('dmScType'), state:v('dmScState'), color:pick('dmScColor'), ownerName:v('dmScOwner')});
    DM.signIn('director', c.id); try { sessionStorage.setItem('ff-demo-switched', c.name); history.replaceState(null, '', '#portal'); } catch (_) {} location.reload(); return; }
  if (f.id === 'dmInvStaff' || f.id === 'dmInvFam') { e.preventDefault(); const staff = f.id === 'dmInvStaff', code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const x = staff ? {kind:'staff', name:v('dmIsName'), role:v('dmIsRole'), room:v('dmIsRoom')} : {kind:'family', parent:v('dmIfParent'), child:v('dmIfChild'), room:v('dmIfRoom')};
    if (staff ? !x.name : !(x.parent && x.child)) return msg(staff ? 'dmIsMsg' : 'dmIfMsg', staff ? 'Enter a name.' : 'Enter the parent and the child.', true);
    await DM.put('invites', 'i' + Date.now().toString(36), Object.assign(x, {status:'pending', code, at:Date.now()}));
    say('Invitation ready (demo: nothing was emailed)'); rerender(staff ? '#dmIsName' : '#dmIfParent'); return msg(staff ? 'dmIsMsg' : 'dmIfMsg', `Invitation ready, code ${code}. Accept it below to see them join.`); }
  if (f.id === 'dmPickupForm') { e.preventDefault(); const c = ctx(), name = v('dmPuName'), rel = v('dmPuRel'); if (!name || !rel) return msg('dmPuMsg', 'Enter a name and a relationship.', true);
    await DM.put('requests', 'r' + Date.now().toString(36), {type:'pickup', kid:c.fam.kid, name, relation:rel, status:'pending', from:`${(ses() || {}).name || 'Family'} (family)`, at:Date.now()});
    say('Sent to the director for approval'); rerender('#dmPuName'); return msg('dmPuMsg', 'Sent. The director sees it under Approvals.'); }
  if (f.id === 'dmStaffForm') { e.preventDefault(); const name = v('dmStName'); if (!name) { const n = document.getElementById('dmStName'); if (n) n.focus(); return msg('dmStMsg', 'Enter a name.', true); }
    const id = 's-' + Date.now().toString(36); await DM.put('staff', id, {name, role:v('dmStRole') || 'Floater', room:v('dmStRoom'), onDuty:false, bg:'Pending', bgDue:DM.weekdayOffset(DM.todayIso(), 30)});
    say(`${name} added (invitation would be emailed in the live Hub)`); rerender('#dmStName'); return msg('dmStMsg', `${name} added. Background check: pending.`); }
  if (f.id === 'dmAppForm') { e.preventDefault(); const child = v('dmApChild'); if (!child) { const n = document.getElementById('dmApChild'); if (n) n.focus(); return msg('dmApMsg', 'Enter the child’s first name and last initial.', true); }
    await DM.put('apps', 'a' + Date.now().toString(36), {child, age:v('dmApAge'), room:v('dmApRoom') || 'demo', guardian:v('dmApGuardian') ? `${v('dmApGuardian')} (sample parent)` : 'Sample parent', stage:'inquiry', start:'', notes:v('dmApNotes'), at:Date.now()});
    say(`Inquiry added for ${child}`); rerender('#dmApChild'); return msg('dmApMsg', `Inquiry added for ${child}.`); }
  if (f.id === 'dmPwForm') { e.preventDefault(); const cur = (document.getElementById('dmPwCur') || {}).value || '', n1 = (document.getElementById('dmPwNew') || {}).value || '', n2 = (document.getElementById('dmPwNew2') || {}).value || '';
    if (cur !== 'demo') return msg('dmPwMsg', 'The current password is not right. (Demo accounts use "demo".)', true);
    const bad = pwProblem(n1); if (bad) return msg('dmPwMsg', bad, true); if (n1 !== n2) return msg('dmPwMsg', 'The two new passwords do not match.', true);
    ['dmPwCur','dmPwNew','dmPwNew2'].forEach(id => { const x = document.getElementById(id); if (x) x.value = ''; });
    return msg('dmPwMsg', 'Password change accepted (demo). In the live Hub your new password works from your next sign-in.'); }
  if (f.id === 'dmMfaForm') { e.preventDefault(); if (!/^\d{6}$/.test(v('dmMfaCode'))) return msg('dmMfaMsg', 'Enter 6 digits.', true); DS.mfa = 'on'; say('Two-step verification is on (demo)'); return rerender(); }
  if (f.id === 'dmPinForm') { e.preventDefault(); if (!/^\d{4}$/.test(v('dmPin'))) return msg('dmPinMsg', 'Enter 4 digits.', true); DS.pin = true; say('Classroom PIN saved (demo)'); return rerender(); }
  if (f.id === 'dmResetEmail') { e.preventDefault(); const em = v('dmRsEmail').toLowerCase(); if (!em) return msg('dmRsMsg', 'Enter an email.', true);
    if (!DM.ACCOUNTS.some(a => a.email === em)) { const x = document.getElementById('dmRsEmail'); if (x) x.value = ''; return msg('dmRsMsg', 'Only the demo accounts exist in this demo. Nothing was sent. Try teacher@demo.futuresfriends.', true); }
    DS.reset = {step:2, email:em}; return rerender('#dmRsNew'); }
  if (f.id === 'dmResetPw') { e.preventDefault(); const n1 = (document.getElementById('dmRsNew') || {}).value || '', n2 = (document.getElementById('dmRsNew2') || {}).value || '';
    const bad = pwProblem(n1); if (bad) return msg('dmRsMsg', bad, true); if (n1 !== n2) return msg('dmRsMsg', 'The two passwords do not match.', true);
    DS.reset = {step:3}; return rerender(); }
  if (f.id === 'dmQuiz') { e.preventDefault(); const miss = QUIZ.filter(([id]) => !DS.quiz[id]); if (miss.length) { DS.quizRes = `Answer all three questions (${miss.length} left).`; return msg('dmQuizMsg', DS.quizRes, true); }
    const wrong = QUIZ.filter(([id, , , ok]) => DS.quiz[id] !== ok); if (wrong.length) { DS.quizRes = `${3 - wrong.length} of 3 right. Check: "${wrong[0][1]}"`; return msg('dmQuizMsg', DS.quizRes, true); }
    DS.quizRes = '3 of 3 right. Well done!'; return lessonDone('check'); }
});
// leaving the reset page starts it fresh next time
window.addEventListener('hashchange', () => { if (!/^#reset-password/.test(location.hash)) DS.reset = null; DS.pw = null; });

window.FFDemoPortal = {headerBits, addTabs, view, todayCard, familyTop, familyEnd, stampAttendance, photoPick, reportHtml};
})();
