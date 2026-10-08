/* Whole-Child Daily Rhythm for the Futures Hub portals (hub mode only; demo mode is untouched).
   Teacher: a Daily Rhythm timeline with one-tap moments, a mission picker, a running tally against the daily targets (each with its
   source), a sitting nudge, water prompts, a weather card (api.weather.gov) and the automatic screen log.
   Director: a weekly rhythm dashboard per room, the policy acknowledgement and the center settings.
   Family: a "Today" card with the room's day in plain words and the private weekly Bop at Home challenge.
   Every rule (who may read or write, the screen age gate, the targets math) lives in Postgres (migration whole_child_core); this file only
   draws screens and calls the database through the signed-in session hub-backend.js already holds. Guardrails: no child ranking or
   comparison anywhere, movement and outdoor time are never offered as something to withhold, food is never a reward, the weather card only
   suggests (the teacher decides), no medical claims. */
(function(){
'use strict';
const hubOn = () => !!(window.FFHub && window.FFHub.configured && window.FFHub.connected);
const sb = () => (window.FFHub && window.FFHub.client) ? window.FFHub.client() : null;
const ctx = () => (window.FFPortal && window.FFPortal.ctx) ? window.FFPortal.ctx() : {};
const rerender = () => { try { if (view==='portal' || view==='family-portal') render(); } catch(_){} };
const E = s => esc(s);
const pad2 = n => String(n).padStart(2,'0');
const isoOf = d => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
const fromIso = s => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); };
const realToday = () => isoOf(new Date());
const mondayOf = s => { const d = fromIso(s); d.setDate(d.getDate() - ((d.getDay()+6)%7)); return isoOf(d); };
const addDays = (s, n) => { const d = fromIso(s); d.setDate(d.getDate()+n); return isoOf(d); };
const shortDay = s => fromIso(s).toLocaleDateString('en-US',{month:'short',day:'numeric'});
const timeOf = ts => new Date(ts).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
const msg = e => (e && e.message) ? e.message : 'That did not save. Try again in a moment.';

const BAND = {toddler:'Twos (2 to under 3)', preschool:'Preschool (3 to 5)'};
const SPACE = {small_indoor:'Small indoor space', large_indoor:'Large indoor space', outdoor:'Outdoors'};
const SKILLS = ['Move','Balance','Reach','Control','Handle','Rhythm','Reset'];
const MONTHS_OPTS = [[24,'2 years'],[36,'3 years'],[48,'4 to 5 years']];

// ---------------------------------------------------------------- state
const R = {
  center:null, cfg:{}, cfgLoaded:false, settings:null, settingsLoaded:false, lib:null, libLoading:false, libErr:null,
  day:{}, dayBusy:{}, dayErr:{}, openStep:null, pick:{step:null, space:'', skill:'', open:null, mins:{}}, water:false, busy:false,
  weather:null, weatherBusy:false, weatherFor:null, nudge:null,
  week:{start:null, rows:null, busy:false, err:null, key:null}, policy:{loaded:false, acked:false, version:null, body:'', title:''},
  fam:{}, famBusy:{}, famErr:{},
};
const STYLE_ID = 'ff-rhythm-css';
function css(){ if(document.getElementById(STYLE_ID)) return; const s=document.createElement('style'); s.id=STYLE_ID; s.textContent=`
.rh-cols{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:16px;align-items:start}
@media (max-width:900px){.rh-cols{grid-template-columns:minmax(0,1fr)}}
.rh-stack{display:grid;gap:16px;min-width:0}
.rh-note{border-left:4px solid var(--gold);padding:8px 12px;background:var(--paper2);border-radius:10px;font-size:13.5px}
.rh-banner{display:flex;gap:10px 14px;flex-wrap:wrap;align-items:center;justify-content:space-between;padding:12px 14px;border-radius:14px;border:1px solid var(--line);background:var(--paper2)}
.rh-banner.warn{border-color:var(--gold);background:var(--paper2)}
.rh-banner.firm{border-color:var(--bad,#c0392b)}
.rh-step{display:grid;gap:8px;padding:12px 0;border-bottom:1px solid var(--line)}
.rh-step:last-child{border-bottom:0}
.rh-stephead{display:flex;gap:8px 12px;flex-wrap:wrap;align-items:center;justify-content:space-between}
.rh-dot{width:22px;height:22px;border-radius:50%;border:2px solid var(--line);display:inline-grid;place-items:center;font-size:12px;flex:none}
.rh-dot.done{background:var(--zuri);border-color:var(--zuri);color:#fff}
.rh-done{display:flex;gap:8px 12px;flex-wrap:wrap;align-items:center;padding:6px 10px;border:1px solid var(--line);border-radius:10px;background:var(--paper)}
.rh-done input[type=number]{width:70px;padding:5px 7px}
.rh-meter{height:10px;border-radius:999px;background:var(--paper2);border:1px solid var(--line);overflow:hidden}
.rh-meter i{display:block;height:100%;background:var(--zuri)}
.rh-meter.over i{background:var(--bad,#c0392b)}
.rh-meter.ok i{background:var(--bop)}
.rh-t{display:grid;gap:4px;padding:8px 0;border-bottom:1px solid var(--line)}
.rh-t:last-child{border-bottom:0}
.rh-t .rh-row{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:baseline}
.rh-src{font-size:12px;color:var(--muted)}
.rh-src a{color:inherit;text-decoration:underline}
.rh-chips{display:flex;gap:6px;flex-wrap:wrap}
.rh-chipbtn{all:unset;cursor:pointer;font-size:12.5px;font-weight:600;padding:5px 11px;border-radius:999px;border:1px solid var(--line);background:var(--paper)}
.rh-chipbtn[aria-pressed="true"]{background:var(--navy);color:#fff;border-color:var(--navy)}
.rh-chipbtn:focus-visible,.rh-link:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
.rh-link{all:unset;cursor:pointer;text-decoration:underline;font-size:13px;color:var(--ink)}
.rh-mission{border:1px solid var(--line);border-radius:12px;padding:10px 12px;background:var(--paper);display:grid;gap:6px}
.rh-mission details summary{cursor:pointer;font-size:13.5px;font-weight:600}
.rh-mission ol,.rh-mission ul{margin:4px 0 4px 18px;padding:0}
.rh-grid4{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px}
.rh-tile{border:1px solid var(--line);border-radius:12px;padding:10px 12px;display:grid;gap:2px;background:var(--paper)}
.rh-tile b{font-family:var(--display);font-size:24px;font-variant-numeric:tabular-nums}
.rh-wx{display:grid;gap:6px}
.rh-wx .big{font-family:var(--display);font-size:30px;font-variant-numeric:tabular-nums}
.rh-tbl{width:100%;border-collapse:collapse;font-size:14px}
.rh-tbl th,.rh-tbl td{padding:8px 10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
.rh-tbl th.n,.rh-tbl td.n{text-align:right;font-variant-numeric:tabular-nums}
.rh-tw{overflow-x:auto}
.rh-form{display:grid;gap:10px}
.rh-form .row{display:flex;gap:10px;flex-wrap:wrap;align-items:end}
.rh-policy{white-space:pre-line;font-size:14px;line-height:1.5;max-height:320px;overflow:auto;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:var(--paper)}
.rh-fam li{margin:2px 0}
`; document.head.appendChild(s); }
css();

// ---------------------------------------------------------------- data
const key = (room,date) => `${room}|${date}`;
async function loadCfg(center){
  const c = sb(); if(!c || !center) return;
  const r = await c.from('rhythm_room_config').select('room,youngest_months,age_band').eq('center_id', center.id);
  if (r.error) { R.cfg = {}; R.cfgLoaded = true; return; }
  R.cfg = Object.fromEntries((r.data||[]).map(x=>[x.room,x])); R.cfgLoaded = true;
}
async function loadSettings(center){
  const c = sb(); if(!c || !center) return;
  const r = await c.from('rhythm_center_settings').select('*').eq('center_id', center.id).maybeSingle();
  R.settings = r.error ? null : r.data; R.settingsLoaded = true;
}
async function loadLib(){
  const c = sb(); if(!c || R.lib || R.libLoading) return; R.libLoading = true;
  const [m, r] = await Promise.all([
    c.from('bop_missions').select('*').eq('status','published').order('sort_order'),
    c.from('rhythm_routines').select('*').eq('status','published').order('sort_order')]);
  R.libLoading = false;
  if (m.error || r.error) { R.libErr = 'The mission library could not load. You can still tap a moment as done.'; }
  else { R.lib = {missions:m.data||[], routines:r.data||[]}; R.libErr = null; }
  rerender();
}
async function loadDay(room, date, force){
  const c = sb(), center = R.center; if(!c || !center) return;
  const k = key(room,date); if (R.dayBusy[k] && !force) return; R.dayBusy[k] = true;
  if (force) R.dayErr[k] = null;
  try {
    const r = await c.rpc('rhythm_room_day', {p_center:center.id, p_room:room, p_date:date});
    if (r.error) throw r.error;
    const sig = JSON.stringify(r.data); const changed = !R.day[k] || R.day[k].sig !== sig;
    R.day[k] = {data:r.data, sig, at:Date.now()}; R.dayErr[k] = null;
    if (changed) rerender();
  } catch(e){ R.dayErr[k] = msg(e); rerender(); }
  finally { R.dayBusy[k] = false; }
}
async function loadPolicy(center){
  const c = sb(); if(!c || !center) return;
  const [v, a] = await Promise.all([
    c.from('rhythm_policy_versions').select('version,title,body').order('version',{ascending:false}).limit(1).maybeSingle(),
    c.from('rhythm_policy_acks').select('version,center_id').eq('center_id', center.id)]);
  const ver = v.data; R.policy = {loaded:true, version:ver&&ver.version, title:ver&&ver.title, body:ver&&ver.body, acked: !!(ver && (a.data||[]).some(x=>x.version===ver.version))};
}
async function loadWeek(){
  const c = sb(), center = R.center; if(!c || !center) return;
  const start = R.week.start; const k = center.id+'|'+start; if (R.week.busy || R.week.key===k) return; R.week.busy = true;
  const r = await c.rpc('rhythm_weekly_metrics', {p_center:center.id, p_week_start:start});
  R.week.busy = false; R.week.key = k;
  if (r.error) { R.week.err = msg(r.error); R.week.rows = null; } else { R.week.err = null; R.week.rows = r.data||[]; }
  rerender();
}
function boot(c){
  if (!hubOn() || !c.center) return;
  if (!R.center || R.center.id !== c.center.id) { R.center = c.center; R.cfgLoaded = false; R.settingsLoaded = false; R.policy.loaded = false; R.lib = null; R.day = {}; R.week.key = null; R.fam = {}; }
  if (c.role==='family') return; // families read only through the family functions
  if (!R.cfgLoaded && !R.cfgBusy) { R.cfgBusy = true; loadCfg(c.center).then(()=>{ R.cfgBusy = false; rerender(); }); }
  if (!R.settingsLoaded && !R.setBusy) { R.setBusy = true; loadSettings(c.center).then(()=>{ R.setBusy = false; rerender(); }); }
}

// ---------------------------------------------------------------- the day template
const STEPS = [
  {k:'arrive',  type:'arrive',  label:'Arrive: Two Taps', hint:'Greet each child, then two taps: in the door, and settled.', min:5},
  {k:'learn',   type:'learn',   label:'Learn: Story + DO', hint:"Booker's story, then a hands-on DO.", min:20},
  {k:'nourish', type:'nourish', label:'Nourish: meal or snack', hint:"Zuri's Notice, Predict, Try, Compare inside the meal. Water is on the table.", min:20},
  {k:'morning_wake_up', type:'move', slot:'morning_wake_up', label:'Morning Wake-Up', hint:'A short, lively start.', pick:true, space:'small_indoor', min:5},
  {k:'transition_move', type:'move', slot:'transition_move', label:'Transition Move', hint:'A movement break between activities.', pick:true, space:'small_indoor', min:3},
  {k:'daily_adventure', type:'move', slot:'daily_adventure', label:'Daily Adventure', hint:'The longest Bop & Go! moment.', pick:true, space:'large_indoor', min:10},
  {k:'outside_quest', type:'outside', slot:'outside_quest', label:'Outside Quest', hint:'Outdoor time, weather permitting.', pick:true, space:'outdoor', min:30, outdoor:true},
  {k:'outing', type:'outside', label:'Another outing', hint:'A second or third trip outside counts as another outdoor occasion.', pick:true, space:'outdoor', min:20, outdoor:true, extra:true},
  {k:'reset', type:'reset', slot:'reset', label:'Reset: Quiet Time', hint:"Lumi's Notice, Breathe, Soften, Rest. Offered, never forced.", pick:true, routine:true, space:'small_indoor', min:15},
  {k:'connect', type:'connect', label:'Connect: pickup prompt', hint:'Ask each family: "What\'s your one thing?"', min:5},
];
const restRequired = day => !!(day && (day.targets||[]).some(t=>t.metric==='rest_min' && t.scope==='state'));
function stepsFor(band, day){ return STEPS.map(s => {
  if (s.k==='reset' && restRequired(day)) s = Object.assign({}, s, {label:'Rest period (required in Missouri preschool rooms)', hint:'Children who do not sleep rest at least 30 and at most 60 minutes. Sleeping is never forced. Lumi: Notice, Breathe, Soften, Rest.', min:30});
  if (s.k==='nourish' && day && (day.targets||[]).some(t=>t.metric==='meal_gap_max_hours')) s = Object.assign({}, s, {hint:s.hint+' Missouri: no more than 4 hours between meals and snacks.'});
  return s; }); }
const stepOf = (s, m) => s.slot ? m.daily5_slot===s.slot : (m.moment_type===s.type && !m.daily5_slot);

// ---------------------------------------------------------------- writing moments
async function addMoment(room, date, row){
  const c = sb(), center = R.center; if(!c||!center||R.busy) return false; R.busy = true;
  try {
    const base = {center_id:center.id, room, date, minutes:0, active_min:0, mvpa_min:0, outdoor_min:0, screen_min:0, tummy_min:0, adult_led:true, weather_swap:false, source:'teacher'};
    const r = await c.from('rhythm_moments').insert(Object.assign(base, row)).select('id').single();
    if (r.error) throw r.error;
    await loadDay(room, date, true); return true;
  } catch(e){ toast(msg(e)); return false; }
  finally { R.busy = false; }
}
function buckets(step, mission, minutes, o, band){
  const m = Math.max(0, Math.min(240, Math.round(minutes)));
  const x = {minutes:m, title: mission ? mission.title : step.label, mission_id: mission ? mission.id : null, moment_type: step.type};
  if (step.slot) x.daily5_slot = step.slot;
  if (step.type==='move') { x.active_min = m; x.mvpa_min = (mission && mission.intensity==='mvpa') ? m : 0; }
  if (step.type==='outside') {
    x.active_min = m; x.mvpa_min = (mission && mission.intensity==='mvpa') ? m : 0;
    if (o && o.swap) { x.weather_swap = true; x.outdoor_min = 0; } else x.outdoor_min = m;
  }
  if (step.type==='reset') { x.active_min = 0; x.mvpa_min = 0; x.rest_min = !mission ? m : 0; } // a rest period (not a movement reset) counts as rest
  if (mission && /tummy/i.test(mission.title)) x.tummy_min = m;
  return x;
}
function scale(mo, minutes){
  const f = mo.minutes ? minutes/mo.minutes : 1; const r = v => Math.min(240, Math.round(v*f));
  const o = {minutes, active_min:r(mo.active_min), outdoor_min:r(mo.outdoor_min), screen_min:r(mo.screen_min), tummy_min:r(mo.tummy_min), rest_min:Math.min(minutes, r(mo.rest_min||0))};
  o.mvpa_min = Math.min(o.active_min, r(mo.mvpa_min)); if (mo.screen_min && !o.screen_min) o.screen_min = minutes;
  return o;
}

// ---------------------------------------------------------------- weather (api.weather.gov)
const NWS = 'https://api.weather.gov';
function heatIndexF(t, rh){
  if (t < 80 || rh == null) return t;
  let hi = -42.379 + 2.04901523*t + 10.14333127*rh - 0.22475541*t*rh - 0.00683783*t*t - 0.05481717*rh*rh + 0.00122874*t*t*rh + 0.00085282*t*rh*rh - 0.00000199*t*t*rh*rh;
  if (rh < 13 && t >= 80 && t <= 112) hi -= ((13-rh)/4)*Math.sqrt((17-Math.abs(t-95))/17);
  else if (rh > 85 && t >= 80 && t <= 87) hi += ((rh-85)/10)*((87-t)/5);
  return Math.max(t, hi);
}
function windChillF(t, mph){ if (t > 50 || mph < 3) return t; const v = Math.pow(mph, 0.16); return 35.74 + 0.6215*t - 35.75*v + 0.4275*t*v; }
const mphOf = s => { const n = String(s||'').match(/\d+/g); return n ? Math.max(...n.map(Number)) : 0; };
function analyse(periods, set){
  const next = periods.slice(0, 8).map(p => {
    const t = p.temperatureUnit==='C' ? p.temperature*9/5+32 : p.temperature; const rh = p.relativeHumidity && p.relativeHumidity.value;
    const w = mphOf(p.windSpeed); return {t, hi:heatIndexF(t, rh), wc:windChillF(t, w), w, short:p.shortForecast||'', pop:(p.probabilityOfPrecipitation&&p.probabilityOfPrecipitation.value)||0, start:p.startTime};
  });
  const first = next[0]; const maxHi = Math.max(...next.map(p=>p.hi)), minWc = Math.min(...next.map(p=>p.wc));
  const thunder = next.some(p=>/thunder|lightning/i.test(p.short));
  const reasons = [];
  if (maxHi >= set.heat_index_f) reasons.push(`The heat index reaches about ${Math.round(maxHi)} F in the next hours, at or above your center's ${set.heat_index_f} F line.`);
  if (minWc <= set.wind_chill_f) reasons.push(`The wind chill falls to about ${Math.round(minWc)} F, at or below your center's ${set.wind_chill_f} F line.`);
  if (thunder) reasons.push('The forecast mentions thunderstorms or lightning.');
  return {now:first, maxHi, minWc, thunder, reasons, short:first.short, at:Date.now()};
}
async function nwsJson(url){
  const headers = {Accept:'application/geo+json'};
  const contact = (R.settings && R.settings.weather_contact) || 'Futures Friends Hub (center portal)';
  try { headers['User-Agent'] = `FuturesFriendsHub/1.0 (${contact})`; } catch(_){}
  const r = await fetch(url, {headers}); if (!r.ok) throw new Error('weather '+r.status); return r.json();
}
async function loadWeather(){
  const s = R.settings; if (!s || s.lat==null || s.lon==null) return;
  const lk = `${(+s.lat).toFixed(4)},${(+s.lon).toFixed(4)}`;
  if (R.weatherBusy) return;
  if (R.weather && R.weatherFor===lk && Date.now()-R.weather.at < 15*60*1000) return;
  R.weatherFor = lk;
  let cached = null; try { cached = JSON.parse(localStorage.getItem('ff-nws-'+lk)||'null'); } catch(_){}
  if (cached && Date.now()-cached.at < 15*60*1000 && cached.periods) { R.weather = Object.assign(analyse(cached.periods, s), {cached:true, at:cached.at, place:cached.place}); return rerender(); }
  R.weatherBusy = true;
  try {
    let pts = null; try { pts = JSON.parse(localStorage.getItem('ff-nws-pts-'+lk)||'null'); } catch(_){}
    if (!pts || Date.now()-pts.at > 24*3600e3) {
      const p = await nwsJson(`${NWS}/points/${lk}`); const pr = p.properties||{}; const rl = pr.relativeLocation && pr.relativeLocation.properties;
      pts = {hourly: pr.forecastHourly, place: rl ? `${rl.city}, ${rl.state}` : '', at: Date.now()}; try { localStorage.setItem('ff-nws-pts-'+lk, JSON.stringify(pts)); } catch(_){}
    }
    const f = await nwsJson(pts.hourly); const periods = (f.properties && f.properties.periods) || [];
    if (!periods.length) throw new Error('no forecast');
    try { localStorage.setItem('ff-nws-'+lk, JSON.stringify({at:Date.now(), periods:periods.slice(0,12), place:pts.place})); } catch(_){}
    R.weather = Object.assign(analyse(periods, s), {place:pts.place, at:Date.now()});
  } catch(e){
    // offline or the service is busy: keep the last good reading if there is one and say so
    if (cached && cached.periods) R.weather = Object.assign(analyse(cached.periods, s), {stale:true, at:cached.at, place:cached.place});
    else R.weather = {error:true, at:Date.now()};
  } finally { R.weatherBusy = false; rerender(); }
}
function weatherCard(){
  const s = R.settings;
  if (!s || s.lat==null) return `<div class="card"><h3>Weather</h3><p class="small muted">No location is set for this center yet, so there is no forecast here. ${ctx().role==='director' ? 'Set it on the Rhythm dashboard.' : 'Ask your director to add the center location.'} Check outside and decide.</p></div>`;
  const w = R.weather; const thr = `Heat index ${s.heat_index_f} F, wind chill ${s.wind_chill_f} F. ${s.thresholds_confirmed_at ? 'Confirmed by your director as center policy.' : 'Default from CFOC 3.1.3.2; center policy to confirm.'}`;
  if (!w) return `<div class="card"><h3>Weather</h3><p class="small muted">Checking the forecast...</p></div>`;
  if (w.error) return `<div class="card"><h3>Weather</h3><p class="small">The forecast is not available right now (you may be offline, or the National Weather Service is busy). Check outside and decide.</p><button class="btn soft" data-rh="wx-retry">Try again</button></div>`;
  const n = w.now;
  return `<div class="card rh-wx"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:baseline"><h3>Weather${w.place?' · '+E(w.place):''}</h3><span class="mini">${w.stale?'Last reading, '+timeOf(w.at)+' (offline)':'Updated '+timeOf(w.at)+' · National Weather Service'}</span></div>
   <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:baseline"><span class="big">${Math.round(n.t)} F</span><span class="small">${E(w.short)} · wind ${Math.round(n.w)} mph · feels like ${Math.round(n.hi>n.t ? n.hi : (n.wc<n.t ? n.wc : n.t))} F</span></div>
   ${w.reasons.length ? `<div class="rh-banner warn" role="status"><div><b>Suggestion: an indoor swap for outdoor time.</b><div class="small">${w.reasons.map(E).join(' ')} This is a suggestion; you decide.</div></div><button class="btn gold" data-rh="swap-indoor">Show indoor missions</button></div>` : `<p class="small">Nothing here suggests changing outdoor plans. You always decide.</p>`}
   <span class="mini">${E(thr)}</span></div>`;
}

// ---------------------------------------------------------------- tally
function words(t){
  const unit = t.unit==='minutes' ? ' min' : '';
  const goal = t.min!=null ? (t.max!=null ? `goal ${t.min} to ${t.max}${unit}` : `goal ${t.min}${unit}`) : `limit ${t.max}${unit}`;
  const state = {met:'Goal reached', building: t.min!=null ? `${Math.max(0,t.min-t.value)}${unit} to go` : '', ok:'Within the limit', over: t.metric==='rest_min' ? `Over the ${t.max}${unit} maximum` : 'Over the limit today'}[t.status]||'';
  return {value:`${t.value}${unit}`, goal, state};
}
function srcLine(t){
  const sr = t.state_rule && !t.state_rule.applied ? ` <span class="rh-src">State minimum is lower: <a href="${E(t.state_rule.url)}" target="_blank" rel="noopener">${E(t.state_rule.citation)}</a></span>` : '';
  return `<span class="rh-src" title="${E(t.source_label)}"><b>${E(t.standard||'')}</b> \u00b7 Source: ${t.source_url ? `<a href="${E(t.source_url)}" target="_blank" rel="noopener">${E(t.source_label)}</a>` : E(t.source_label)}${t.binding?' \u00b7 required by state rule':''}</span>${sr}`; }
function tallyCard(day, title){
  const ORDER = ['tummy_min','mvpa_min','active_total_min','outdoor_min','outdoor_occasions','adult_led_moves','rest_min','screen_max_min'];
  const list = day.targets.filter(t=>t.status!=='clock').sort((x,y)=>ORDER.indexOf(x.metric)-ORDER.indexOf(y.metric)); const sources = [...new Map(day.targets.map(t=>[t.source_label+'|'+t.source_url, t])).values()];
  return `<div class="card"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:baseline"><h3>${title}</h3><span class="chip">${E(BAND[day.age_band]||'')}</span></div>
   ${list.map(t=>{ const w=words(t); const isMax = t.min==null; const pct = isMax ? (t.max>0 ? Math.min(100, Math.round(100*t.value/t.max)) : (t.value>0?100:0)) : t.pct;
     return `<div class="rh-t" data-metric="${E(t.metric)}"><div class="rh-row"><b title="${E('Source: '+t.source_label)}">${E(t.label)}</b><span class="small"><b>${E(w.value)}</b> · ${E(w.goal)} · ${E(w.state)}</span></div>
      <div class="rh-meter ${t.status==='over'?'over':(isMax?'ok':'')}" role="img" aria-label="${E(t.label)}: ${E(w.value)}, ${E(w.goal)}"><i style="width:${pct||0}%"></i></div>
      ${t.note?`<span class="mini">${E(t.note)}</span>`:''}${srcLine(t)}</div>`; }).join('')}
   <details><summary class="small" style="cursor:pointer"><b>Where these numbers come from</b></summary><ul class="small">${sources.map(t=>`<li>${t.source_url?`<a href="${E(t.source_url)}" target="_blank" rel="noopener">${E(t.source_label)}</a>`:E(t.source_label)}</li>`).join('')}</ul><p class="mini">Evidence-informed daily targets (Futures Friends standards). Where a Kansas or Missouri rule applies to your center and is stricter, the state rule wins and is cited. Your center may tune the numbers but never loosen a safety limit. Reports show rooms, never individual children.</p></details></div>`;
}

// ---------------------------------------------------------------- sitting nudge + water
function nudgeInfo(day, date){
  if (date !== realToday() || !day.sitting) return null;
  const mv = day.moments.filter(m=>m.active_min>0 || m.moment_type==='move' || m.moment_type==='outside');
  const first = day.moments.length ? new Date(day.moments[0].done_at).getTime() : null;
  const last = mv.length ? Math.max(...mv.map(m=>new Date(m.done_at).getTime())) : first;
  if (!last) return null; const mins = Math.floor((Date.now()-last)/60000);
  const h = new Date().getHours(); if (h < 6 || h >= 19) return null;
  const nudge = day.sitting.nudge_min, firm = day.sitting.firm_min;
  if (mins >= firm) return {firm:true, mins, nudge, limit:firm, src:day.sitting};
  if (mins >= nudge) return {firm:false, mins, nudge, limit:firm, src:day.sitting};
  return null;
}
// Missouri: no more than 4 hours between meals and snacks (a state rule, shown only where it applies)
function mealGapInfo(day, date){
  const t = (day.targets||[]).find(x=>x.metric==='meal_gap_max_hours'); if (!t || date !== realToday()) return null;
  const from = day.last_nourish_at || day.first_moment_at; if (!from) return null;
  const h = new Date().getHours(); if (h < 6 || h >= 19) return null;
  const hours = (Date.now() - new Date(from).getTime())/3600e3; if (hours <= t.max) return null;
  return {hours:Math.floor(hours*10)/10, max:t.max, t, since: day.last_nourish_at ? 'the last meal or snack' : 'the first moment logged today'};
}
setInterval(()=>{ try { const c = ctx(); if (view==='portal' && c.tab==='rhythm' && hubOn() && c.room) { const d = R.day[key(c.room,c.date)]; if (d) { const n = nudgeInfo(d.data, c.date), mg = mealGapInfo(d.data, c.date); const sig = (n ? (n.firm?'f':'n') : '') + (mg ? 'm' : ''); if (sig !== R.nudge) { R.nudge = sig; rerender(); } loadDay(c.room, c.date); } } } catch(_){} }, 30000);

// ---------------------------------------------------------------- missions picker
function missionList(day, step){
  const lib = R.lib; if (!lib) return [];
  const band = day.age_band, p = R.pick;
  return lib.missions.filter(m => m.age_bands.includes(band) && (!p.space || m.space===p.space) && (!p.skill || m.skill===p.skill)
    && (step.k==='reset' ? (m.skill==='Reset') : true));
}
function routineList(day){ return R.lib ? R.lib.routines.filter(r=>r.routine_kind==='quiet_time' && r.age_bands.includes(day.age_band)) : []; }
function missionCard(day, step, m){
  const mins = R.pick.mins[m.id] ?? Math.min(m.minutes, 240);
  return `<div class="rh-mission" data-mission="${E(m.slug)}"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:baseline"><b>${E(m.title)}</b><span class="rh-chips"><span class="chip">${E(m.skill)}</span><span class="chip">${E(SPACE[m.space])}</span><span class="chip ${m.intensity==='mvpa'?'warn':''}">${m.intensity==='mvpa'?'Brisk':'Gentle'}</span>${m.reviewed_by?'':'<span class="chip" title="Real content from HQ, awaiting its review">Pending HQ review</span>'}</span></div>
   <span class="small">${E(m.teacher_words)}</span>
   <details><summary>Steps, the adapted version and safety</summary><ol>${m.steps.map(x=>`<li>${E(x)}</li>`).join('')}</ol><p class="small"><b>Adapted version (so every child can join):</b> ${E(m.adapted_variant)}</p><p class="small"><b>Safety:</b> ${E(m.safety_note)}</p></details>
   <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><label class="small">Minutes <input class="i" type="number" min="1" max="240" value="${mins}" data-rh-mins="${E(m.id)}" style="width:70px;padding:5px 7px"></label>
   <button class="btn gold" data-rh="log-mission" data-mid="${E(m.id)}">Done: log it</button></div></div>`;
}
function pickerCard(day, step, c){
  const p = R.pick; const swapInfo = (step.k==='outside_quest' || step.k==='outing') && p.space && p.space!=='outdoor';
  const rows = step.routine ? routineList(day) : [];
  const ms = step.k==='reset' ? missionList(day, step) : missionList(day, step);
  return `<div class="card" id="rhPicker" style="border:2px solid var(--gold)"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center"><h3>${E(step.label)}: choose a mission</h3><button class="btn soft" data-rh="close-pick">Close</button></div>
   <p class="mini">Showing missions for ${E(BAND[day.age_band])}. Every mission has an adapted version.</p>
   <div class="rh-chips" role="group" aria-label="Space">${[['','Any space'],['small_indoor','Small indoor'],['large_indoor','Large indoor'],['outdoor','Outdoors']].map(([v,l])=>`<button class="rh-chipbtn" data-rh="pick-space" data-v="${v}" aria-pressed="${p.space===v}">${l}</button>`).join('')}</div>
   ${step.k!=='reset'?`<div class="rh-chips" role="group" aria-label="Skill"><button class="rh-chipbtn" data-rh="pick-skill" data-v="" aria-pressed="${!p.skill}">Any skill</button>${SKILLS.map(s=>`<button class="rh-chipbtn" data-rh="pick-skill" data-v="${s}" aria-pressed="${p.skill===s}">${s}</button>`).join('')}</div>`:''}
   ${swapInfo?`<div class="rh-note">You picked an indoor space for outdoor time. It will be logged as a <b>weather swap</b> (it does not count as an outdoor occasion). You decide.</div>`:''}
   ${R.libErr?`<p class="small">${E(R.libErr)}</p>`:''}${!R.lib&&!R.libErr?'<p class="small muted">Loading missions...</p>':''}
   ${rows.map(r=>`<div class="rh-mission"><b>${E(r.title)}</b><span class="small">${E(r.teacher_words)}</span><details><summary>Steps, the adapted version and safety</summary><ol>${r.steps.map(x=>`<li>${E(x)}</li>`).join('')}</ol><p class="small"><b>Adapted version:</b> ${E(r.adapted_variant)}</p><p class="small"><b>Safety:</b> ${E(r.safety_note)}</p></details><div><button class="btn gold" data-rh="log-routine" data-rid="${E(r.id)}">Done: Quiet Time offered</button></div></div>`).join('')}
   ${ms.length?ms.map(m=>missionCard(day, step, m)).join(''):(R.lib?'<p class="small muted">No missions match those filters. Try another space or skill.</p>':'')}
   <div><button class="btn soft" data-rh="log-quick" data-step="${E(step.k)}">Done without a mission (${step.min} min)</button></div></div>`;
}

// ---------------------------------------------------------------- teacher view
function screensBlocked(room){ const c = R.cfg[room]; return R.cfgLoaded && !(c && c.youngest_months >= 36); } // no screens through age 2
function screenCard(day, c){
  const room = c.room, t = (day.targets||[]).find(x=>x.metric==='screen_max_min'); const val = t ? t.value : 0;
  if (!day.configured) return `<div class="card"><h3>Screen time</h3><div class="rh-note">Screens stay off until this room's ages are set${c.role==='director'?'. Set them below.':'. Ask your director to set the room\'s ages.'} Use the song, puppet or card version meanwhile.</div>${altButtons(c)}</div>`;
  if (!day.screens_allowed) return `<div class="card"><h3>Screen time</h3><div class="rh-note"><b>No screens for any child through age 2.</b> This room uses a song, a puppet or a card game instead.</div>${altButtons(c)}</div>`;
  return `<div class="card"><h3>Screen time</h3><p class="small">Episodes played from the Today checklist or the episode player are logged here automatically and count against the weekly limit (Monday to today). ${t?`So far this week: <b>${val} min</b> of ${t.max}. <span class="mini">${E(t.standard||'')}: neither Kansas nor Missouri limits screen time.</span>`:''}</p>
   ${t && t.status==='over' ? `<div class="rh-banner warn"><span class="small">This week's screen limit is passed. Offer a song, a puppet or a card game instead.</span></div>${altButtons(c)}` : `<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:end"><label class="f" for="rhScr">Log a clip or episode (minutes)<input class="i" id="rhScr" type="number" min="1" max="30" value="5" style="width:90px;padding:6px 8px"></label><button class="btn soft" data-rh="log-screen">Log screen time</button></div>`}</div>`;
}
const altButtons = c => `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">${[['Song time','song'],['Puppet story','puppet'],['Card game','card']].map(([l,k])=>`<button class="btn soft" data-rh="log-alt" data-alt="${k}">Log: ${l} (no screen)</button>`).join('')}</div>`;
function stepRow(day, step, c){
  const ms = day.moments.filter(m=>stepOf(step,m)); const done = ms.length>0;
  const btn = step.pick ? `<button class="btn ${done?'soft':'gold'}" data-rh="open-pick" data-step="${E(step.k)}" ${c.canWrite?'':'disabled'}>${done?'Add another':'Pick a mission'}</button>` : `<button class="btn ${done?'soft':'gold'}" data-rh="tap" data-step="${E(step.k)}" ${c.canWrite?'':'disabled'}>${done?'Add another':'Mark done'}</button>`;
  return `<div class="rh-step" data-step="${E(step.k)}"><div class="rh-stephead"><div style="display:flex;gap:10px;align-items:center"><span class="rh-dot ${done?'done':''}" aria-hidden="true">${done?'✓':''}</span><div><b>${E(step.label)}</b><div class="mini">${E(step.hint)}</div></div></div>${btn}</div>
   ${ms.map(m=>`<div class="rh-done" data-mid="${E(m.id)}"><span class="small">${timeOf(m.done_at)}</span><span class="small"><b>${E(m.title)}</b>${m.weather_swap?' <span class="chip warn">Weather swap</span>':''}${m.screen_min?` <span class="chip">${m.screen_min} min screen</span>`:''}</span><label class="small">Minutes <input class="i" type="number" min="0" max="240" value="${m.minutes}" data-rh-edit="${E(m.id)}" aria-label="Minutes for ${E(m.title)}" ${c.canWrite?'':'disabled'}></label><button class="rh-link" data-rh="undo" data-mid="${E(m.id)}" ${c.canWrite?'':'disabled'}>Undo</button></div>`).join('')}</div>`;
}
function waterBanner(){ return R.water ? `<div class="rh-banner" role="status"><div><b>Water break?</b> <span class="small">Offer water now. Water is available all day; children can ask any time.</span></div><div style="display:flex;gap:8px"><button class="btn gold" data-rh="water-done">Water given</button><button class="btn soft" data-rh="water-skip">Not now</button></div></div>` : ''; }

function teacherView(c){
  if (!hubOn()) return `<div class="card"><h3>Daily Rhythm</h3><p class="small">Sign in with your center account to use the Daily Rhythm.</p></div>`;
  boot(c); const room = c.room, date = c.date;
  if (!R.lib && !R.libLoading) loadLib();
  if (R.settingsLoaded) loadWeather();
  const wd = fromIso(date).getDay(); if (wd===0||wd===6) return `<div class="card"><h3>No program on weekends</h3><p class="small">Pick a weekday to see the Daily Rhythm.</p></div>`;
  const k = key(room,date); const d = R.day[k];
  if (!d) { if (!R.dayErr[k]) { loadDay(room, date); return `<div class="card"><h3>Daily Rhythm</h3><p class="small muted">Loading the day...</p></div>`; }
    return `<div class="card"><h3>Daily Rhythm</h3><p class="small">${E(R.dayErr[k])}</p><button class="btn soft" data-rh="day-retry">Try again</button></div>`; }
  const day = d.data; const steps = stepsFor(day.age_band, day); const n = nudgeInfo(day, date); const mg = mealGapInfo(day, date);
  const openStep = R.pick.step ? steps.find(s=>s.k===R.pick.step) : null;
  const water = day.moments.filter(m=>m.moment_type==='water').length;
  return `<div class="rh-note">Movement and outdoor time are never withheld as punishment, and food is never a reward. The Daily Rhythm records what was delivered to the room. It never ranks or compares children.</div>
  ${!day.configured?`<div class="rh-banner warn"><div><b>This room's ages are not set.</b><div class="small">Targets use the preschool defaults and screens stay off until a director sets the room's ages.</div></div>${c.role==='director'?roomAgesForm(room):''}</div>`:''}
  ${waterBanner()}
  ${mg?`<div class="rh-banner firm" role="status"><div><b>It has been about ${mg.hours} hours since ${mg.since}. Missouri allows no more than ${mg.max} hours between meals and snacks.</b><div class="small">Offer a meal or snack, then tap it done. <a href="${E(mg.t.source_url)}" target="_blank" rel="noopener">${E(mg.t.source_label)}</a></div></div><button class="btn gold" data-rh="tap" data-step="nourish" ${c.canWrite?'':'disabled'}>Meal or snack served</button></div>`:''}
  ${n?`<div class="rh-banner ${n.firm?'firm':'warn'}" role="status"><div><b>${n.firm?`It has been about ${n.mins} minutes without a movement moment. The limit for sitting or confinement is ${n.limit} minutes at a time${n.src&&n.src.scope==='state'?' (state rule)':''}.`:`A gentle nudge: about ${n.mins} minutes since the last movement moment.`}</b><div class="small">A Transition Move can take 3 minutes. You decide.</div></div><button class="btn gold" data-rh="open-pick" data-step="transition_move">Pick a Transition Move</button></div>`:''}
  <div class="rh-cols"><div class="rh-stack">
    <div class="card"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:baseline"><h3>${E(c.rooms[room]?c.rooms[room].name:room)} · Daily Rhythm</h3><span class="mini">Tap a moment when it is done. You can change its minutes.</span></div>
     ${steps.map(s=>stepRow(day, s, c)).join('')}
     <div class="rh-stephead" style="padding-top:12px"><div><b>Water breaks</b> <span class="mini">${water} logged today</span><div class="mini">Offer water at every transition.</div></div><button class="btn soft" data-rh="water-done" ${c.canWrite?'':'disabled'}>Water given</button></div></div>
    ${openStep?pickerCard(day, openStep, c):''}
   </div><div class="rh-stack">
    ${weatherCard()}
    ${tallyCard(day, "Today's tally")}
    ${screenCard(day, c)}
   </div></div>`;
}
function roomAgesForm(room){ return `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:end"><label class="f" for="rhAges">Youngest child in this room<select class="i" id="rhAges" style="padding:7px 9px">${MONTHS_OPTS.map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select></label><button class="btn gold" data-rh="save-ages" data-room="${E(room)}">Save room ages</button></div>`; }

// ---------------------------------------------------------------- director dashboard
function pctText(v){ return v==null ? 'n/a' : `${Math.round(Number(v))}%`; }
function rweekView(c){
  if (!hubOn() || c.role!=='director') return `<div class="card"><h3>Rhythm dashboard</h3><p class="small">This page is for directors.</p></div>`;
  boot(c);
  if (!R.policy.loaded) { loadPolicy(c.center).then(rerender); return `<div class="card"><p class="small muted">Loading...</p></div>`; }
  if (!R.settingsLoaded) return `<div class="card"><p class="small muted">Loading...</p></div>`;
  if (!R.policy.acked) return policyCard();
  if (!R.week.start) R.week.start = mondayOf(c.date);
  loadWeek(); const rows = R.week.rows; const ws = R.week.start;
  return `<div class="rh-note">This page shows <b>rooms, never children</b>. It measures what was delivered: minutes, missions and occasions.</div>
  <div class="card"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center"><h3>Week of ${shortDay(ws)} to ${shortDay(addDays(ws,4))}</h3><div style="display:flex;gap:6px"><button class="btn soft" data-rh="week" data-d="-7">Previous week</button><button class="btn soft" data-rh="week" data-d="7">Next week</button></div></div>
   ${R.week.err?`<p class="small">${E(R.week.err)}</p>`:!rows?'<p class="small muted">Loading...</p>':rows.length?`<div class="rh-tw"><table class="rh-tbl"><thead><tr><th>Room</th><th class="n">Days logged</th><th class="n">Days meeting the active-play target</th><th class="n">Days meeting the outdoor target</th><th class="n">Average screen minutes</th><th class="n">Daily 5 completed</th><th class="n">Weather swaps</th></tr></thead><tbody>${rows.map(r=>`<tr><td><b>${E((c.rooms[r.room]&&c.rooms[r.room].name)||r.room)}</b><div class="mini">${E(BAND[r.age_band]||'Room ages not set')}</div></td><td class="n">${r.days_logged}</td><td class="n">${pctText(r.pct_active_met)}${r.days_logged&&r.pct_active_met!=null?`<div class="mini">${r.days_active_met} of ${r.days_logged}</div>`:''}</td><td class="n">${pctText(r.pct_outdoor_met)}${r.days_logged&&r.pct_outdoor_met!=null?`<div class="mini">${r.days_outdoor_met} of ${r.days_logged}</div>`:''}</td><td class="n">${r.avg_screen_min==null?'n/a':Number(r.avg_screen_min)}</td><td class="n">${pctText(r.pct_daily5)}${r.days_logged?`<div class="mini">${r.daily5_done} of ${r.daily5_possible}</div>`:''}</td><td class="n">${r.weather_swaps}</td></tr>`).join('')}</tbody></table></div><p class="mini">A day counts when at least one moment was logged for the room. Targets are the daily defaults for each room's age band, or your center's own numbers. These figures feed the pilot scorecard.</p>`:'<p class="small muted">No rooms yet.</p>'}</div>
  ${settingsCard(c)}`;
}
function policyCard(){
  return `<div class="card rh-form"><h3>${E(R.policy.title||'Whole-Child policy')}</h3><p class="small">Directors acknowledge this written policy before they open the rhythm dashboard or change center settings.</p><div class="rh-policy">${E(R.policy.body||'')}</div>
   <label class="small" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="rhAck" style="width:18px;height:18px"> I have read this policy and I will follow it in my center.</label><div><button class="btn gold" data-rh="ack">Acknowledge the policy</button></div></div>`;
}
function settingsCard(c){
  const s = R.settings || {}; const rooms = Object.entries(c.rooms||{});
  return `<div class="card rh-form"><h3>Center settings</h3>
   <div class="row"><label class="f" for="rsLat">Latitude<input class="i" id="rsLat" inputmode="decimal" value="${s.lat??''}" style="width:120px;padding:6px 8px"></label><label class="f" for="rsLon">Longitude<input class="i" id="rsLon" inputmode="decimal" value="${s.lon??''}" style="width:120px;padding:6px 8px"></label><label class="f" for="rsZip">ZIP<input class="i" id="rsZip" maxlength="5" value="${E(s.zip||'')}" style="width:90px;padding:6px 8px"></label><label class="f" for="rsContact">Weather contact (for the National Weather Service)<input class="i" id="rsContact" value="${E(s.weather_contact||'')}" placeholder="director@yourcenter.org" style="width:240px;padding:6px 8px"></label></div>
   <div class="row"><label class="f" for="rsNudge">Gentle sitting nudge after (minutes, optional)<input class="i" id="rsNudge" type="number" min="10" max="60" value="${s.sitting_nudge_min??''}" placeholder="age default" style="width:110px;padding:6px 8px"></label><label class="f" for="rsFirm">Firm advice after (minutes, optional)<input class="i" id="rsFirm" type="number" min="30" max="120" value="${s.sitting_firm_min??''}" placeholder="age default" style="width:110px;padding:6px 8px"></label><span class="mini" style="align-self:center">Blank uses the age default (30 then 60 minutes). A center may shorten these, never lengthen them past a state rule.</span></div>
   <div class="row"><label class="f" for="rsHeat">Heat index suggestion line (F)<input class="i" id="rsHeat" type="number" min="70" max="130" value="${s.heat_index_f??90}" style="width:90px;padding:6px 8px"></label><label class="f" for="rsWind">Wind chill suggestion line (F)<input class="i" id="rsWind" type="number" min="-60" max="40" value="${s.wind_chill_f??-15}" style="width:90px;padding:6px 8px"></label></div>
   <label class="small" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="rsConfirm" ${s.thresholds_confirmed_at?'checked':''} style="width:18px;height:18px"> These two lines match my center's written weather policy. ${s.thresholds_confirmed_at?'':'(Until confirmed, the defaults from CFOC 3.1.3.2 are shown as "center policy to confirm".)'}</label>
   <p class="mini">The weather card only suggests an indoor swap. Teachers decide, and the system never blocks outdoor play.</p>
   <div><button class="btn gold" data-rh="save-settings">Save settings</button></div>
   <h3 style="margin-top:8px">Room ages</h3><p class="mini">The youngest child in each room sets its daily targets and turns screens off for every child through age 2 (rooms whose youngest child is 3 or older can use them).</p>
   <div class="rh-tw"><table class="rh-tbl"><thead><tr><th>Room</th><th>Youngest child</th><th></th></tr></thead><tbody>${rooms.map(([id,r])=>{ const cf=R.cfg[id]; return `<tr><td>${E(r.name||id)}</td><td><select class="i" data-rh-ages="${E(id)}" aria-label="Youngest child in ${E(r.name||id)}" style="padding:6px 8px"><option value="" ${cf?'':'selected'}>Not set</option>${MONTHS_OPTS.map(([v,l])=>`<option value="${v}" ${cf&&((v===6&&cf.youngest_months<12)||(v===12&&cf.youngest_months>=12&&cf.youngest_months<24)||(v===24&&cf.youngest_months>=24&&cf.youngest_months<36)||(v===36&&cf.youngest_months>=36&&cf.youngest_months<48)||(v===48&&cf.youngest_months>=48))?'selected':''}>${l}</option>`).join('')}</select></td><td class="mini">${cf?E(BAND[cf.age_band]):'Screens stay off'}</td></tr>`; }).join('')}</tbody></table></div></div>`;
}

// ---------------------------------------------------------------- family card
function loadFam(c){
  const kid = c.fam.kid, date = c.fam.date || c.date; if (!kid || !c.center) return; const k = kid+'|'+date; if (R.famBusy[k] || R.fam[k]) return; R.famBusy[k] = true;
  const cl = sb();
  // The weekly challenge is chosen for the child's age band (the room's band, known once the family day answers); no band = any challenge.
  cl.rpc('rhythm_family_day', {p_center:c.center.id, p_kid:kid, p_date:date}).then(async d => {
    const band = d.data && d.data.age_band || null;
    const ch = await cl.rpc('rhythm_current_challenge', band ? {p_date:date, p_band:band} : {p_date:date});
    let done = false; const cdata = ch.data;
    if (cdata && cdata.id) { const r = await cl.from('home_challenge_done').select('challenge_id').eq('challenge_id', cdata.id).eq('week_start', cdata.week_start); done = !!(r.data && r.data.length); }
    R.fam[k] = {day:d.error?null:d.data, err:d.error?msg(d.error):null, ch:ch.error?null:cdata, done}; R.famBusy[k] = false; rerender();
  }).catch(e=>{ R.fam[k] = {err:msg(e)}; R.famBusy[k] = false; rerender(); });
}
function familyCard(c){
  if (!hubOn() || c.role!=='family' || !c.fam.kid) return '';
  boot(c); const date = c.fam.date || c.date; const k = c.fam.kid+'|'+date; const f = R.fam[k];
  const kid = c.kids[c.fam.kid]; const first = kid ? kid.first : 'your child';
  if (!f) { loadFam(c); return `<div class="card" id="rhFam"><h3>Today</h3><p class="small muted">Loading today...</p></div>`; }
  const day = f.day;
  let body = '';
  if (f.err || !day) body = `<p class="small">Today's rhythm is not available right now.</p>`;
  else if (!day.present) body = `<p class="small">${E(first)}'s Daily Rhythm shows here once ${E(first)} is marked here for the day.</p>`;
  else {
    const tg = Object.fromEntries((day.targets||[]).map(t=>[t.metric,t]));
    const act = tg.mvpa_min || tg.tummy_min, out = tg.outdoor_min || tg.outdoor_occasions, scr = tg.screen_max_min;
    const line = (t, what) => !t ? '' : `<li><b>${what}:</b> ${t.value} ${t.unit==='minutes'?'minutes':(t.unit==='occasions'?'times':'activities')} today in ${E(first)}'s room. ${t.min!=null?`Our goal for this age is ${t.min}${t.max!=null?' to '+t.max:''} ${t.unit==='minutes'?'minutes':''}. ${t.status==='met'?'Reached today.':'Still building today.'}`:`The limit is ${t.max} ${t.unit==='minutes'?'minutes':''}.`} <span class="rh-src">Source: ${t.source_url?`<a href="${E(t.source_url)}" target="_blank" rel="noopener">${E(t.source_label)}</a>`:E(t.source_label)}</span></li>`;
    const moments = (day.moments||[]).filter(m=>m.moment_type!=='water');
    const mission = (day.moments||[]).map(m=>m.mission).find(Boolean);
    body = `<ul class="rh-fam" style="list-style:none;padding:0;margin:0;display:grid;gap:4px">${line(tg.mvpa_min,'Active play')}${tg.tummy_min?line(tg.tummy_min,'Tummy time'):''}${line(tg.outdoor_min,'Outdoors')}${scr?`<li><b>Screen time:</b> ${scr.value===0?'None today.':`${scr.value} minutes today, with a teacher.`} ${scr.max===0?'Children through age 2 do not use screens here.':''}</li>`:''}</ul>
     ${moments.length?`<h3 style="font-size:16px;margin-top:8px">${E(first)}'s room today</h3><ul class="rh-fam" style="margin:0;padding-left:18px">${moments.map(m=>`<li>${E(m.title)}${m.minutes?` <span class="mini">${m.minutes} min</span>`:''}${m.weather_swap?' <span class="mini">(moved indoors for the weather)</span>':''}</li>`).join('')}</ul>`:'<p class="small muted">No moments logged yet today.</p>'}
     ${mission?`<div class="rh-note" style="margin-top:8px"><b>Today's Bop mission: ${E(mission.title)}.</b> ${E(mission.teacher_words)}</div>`:''}
     <div class="rh-note" style="margin-top:8px"><b>At pickup, ask:</b> "What's your one thing?" Let ${E(first)} choose the one thing from today that they want to tell you about.</div>`;
  }
  const ch = f.ch;
  const chHtml = ch ? `<div class="card" style="border-top:5px solid var(--bop);box-shadow:none"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:baseline"><h3>Bop at Home this week: ${E(ch.title)}</h3><span class="chip">${ch.minutes} min · free</span></div><p class="small">${E(ch.summary)}</p>${(ch.household_items||[]).length?`<p class="small"><b>You will need:</b> ${ch.household_items.map(E).join(', ')}.</p>`:'<p class="small"><b>You will need:</b> nothing at all.</p>'}<ol class="small" style="margin:0 0 6px 18px;padding:0">${ch.steps.map(s=>`<li>${E(s)}</li>`).join('')}</ol><p class="small"><b>An easier or different way:</b> ${E(ch.adapted_variant)}</p><p class="small"><b>Safety:</b> ${E(ch.safety_note)}</p><p class="small">${E(ch.family_words)}</p>
     <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><button class="btn ${f.done?'soft':'gold'}" data-rh="we-did-it" data-k="${E(k)}" aria-pressed="${f.done?'true':'false'}">${f.done?'We did it! (tap to undo)':'We did it'}</button><span class="mini">Only you can see this. It is never shared with the center or other families.</span></div></div>` : '';
  return `<div class="card" id="rhFam" style="border-top:5px solid var(--bop)"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:baseline"><h3>Today</h3><span class="mini">Evidence-informed routines. Your child's day, never compared with other children.</span></div>${body}${chHtml}</div>`;
}

// ---------------------------------------------------------------- events
document.addEventListener('click', async e => {
  const b = e.target.closest ? e.target.closest('[data-rh]') : null; if (!b || !hubOn()) return;
  const c = ctx(); const a = b.dataset.rh; const room = c.room, date = c.date;
  const day = (R.day[key(room,date)]||{}).data; const steps = day ? stepsFor(day.age_band, day) : STEPS;
  const afterMove = ok => { if (ok) R.water = true; rerender(); };
  if (a==='open-pick') { R.pick = {step:b.dataset.step, space:(steps.find(s=>s.k===b.dataset.step)||{}).space||'', skill:'', mins:{}}; if (R.weather && R.weather.reasons && R.weather.reasons.length && /outside|outing/.test(b.dataset.step)) R.pick.space = 'small_indoor'; rerender(); setTimeout(()=>{ const p=document.getElementById('rhPicker'); if(p) p.scrollIntoView({block:'center', behavior:'smooth'}); },30); return; }
  if (a==='day-retry') { R.dayErr[key(room,date)] = null; return rerender(); }
  if (a==='close-pick') { R.pick.step = null; return rerender(); }
  if (a==='pick-space') { R.pick.space = b.dataset.v; return rerender(); }
  if (a==='pick-skill') { R.pick.skill = b.dataset.v; return rerender(); }
  if (a==='swap-indoor') { const s = steps.find(x=>x.k==='outside_quest'); R.pick = {step:'outside_quest', space:'small_indoor', skill:'', mins:{}}; rerender(); setTimeout(()=>{ const p=document.getElementById('rhPicker'); if(p) p.scrollIntoView({block:'center', behavior:'smooth'}); },30); return; }
  if (a==='wx-retry') { R.weather = null; R.weatherFor = null; try { Object.keys(localStorage).filter(k=>k.startsWith('ff-nws-')).forEach(k=>localStorage.removeItem(k)); } catch(_){} loadWeather(); return rerender(); }
  if (a==='water-skip') { R.water = false; return rerender(); }
  if (a==='water-done') { R.water = false; const ok = await addMoment(room, date, {moment_type:'water', title:'Water break', minutes:1}); if (ok) toast('Water break logged'); return rerender(); }
  if (a==='tap') { const s = steps.find(x=>x.k===b.dataset.step); if (!s) return; const ok = await addMoment(room, date, buckets(s, null, s.min, null, day&&day.age_band)); return afterMove(ok); }
  if (a==='log-quick') { const s = steps.find(x=>x.k===b.dataset.step); const swap = (s.type==='outside') && R.pick.space && R.pick.space!=='outdoor'; const ok = await addMoment(room, date, buckets(s, null, s.min, {swap}, day&&day.age_band)); if (ok) R.pick.step = null; return afterMove(ok); }
  if (a==='log-mission') { const s = steps.find(x=>x.k===R.pick.step); const m = R.lib.missions.find(x=>x.id===b.dataset.mid); if (!s||!m) return;
    const mins = +(R.pick.mins[m.id] ?? m.minutes) || m.minutes; const swap = s.type==='outside' && m.space!=='outdoor';
    const ok = await addMoment(room, date, buckets(s, m, mins, {swap}, day&&day.age_band)); if (ok) { R.pick.step = null; toast(swap?'Logged as a weather swap':'Logged. Nice moving!'); } return afterMove(ok); }
  if (a==='log-routine') { const s = steps.find(x=>x.k===R.pick.step); const r = R.lib.routines.find(x=>x.id===b.dataset.rid); if (!s||!r) return;
    const ok = await addMoment(room, date, {moment_type:'reset', daily5_slot:'reset', title:r.title, minutes:r.minutes||s.min, rest_min: (r.minutes||s.min), routine_id:r.id}); if (ok) R.pick.step = null; return afterMove(ok); }
  if (a==='undo') { const r = await sb().from('rhythm_moments').delete().eq('id', b.dataset.mid); if (r.error) toast(msg(r.error)); await loadDay(room, date, true); return rerender(); }
  if (a==='log-screen') { const el = document.getElementById('rhScr'); const mins = Math.max(1, Math.min(30, +el.value||5)); const ok = await addMoment(room, date, {moment_type:'learn', title:'Episode or clip (watched together)', minutes:mins, screen_min:mins, source:'clip', adult_led:false}); if (ok) toast('Screen time logged'); return rerender(); }
  if (a==='log-alt') { const t = {song:'Song time (no screen)', puppet:'Puppet story (no screen)', card:'Card game (no screen)'}[b.dataset.alt]; const ok = await addMoment(room, date, {moment_type:'learn', title:t, minutes:6}); if (ok) toast(t+' logged'); return rerender(); }
  if (a==='save-ages') { const v = +(document.getElementById('rhAges')||{}).value; if (!v) return; await saveAges(b.dataset.room, v); return; }
  if (a==='ack') { if (!document.getElementById('rhAck').checked) { toast('Tick the box to acknowledge the policy'); return; } const r = await sb().rpc('rhythm_acknowledge_policy', {p_center:R.center.id}); if (r.error) return toast(msg(r.error)); R.policy.acked = true; toast('Policy acknowledged'); return rerender(); }
  if (a==='week') { R.week.start = addDays(R.week.start, +b.dataset.d); R.week.key = null; R.week.rows = null; return rerender(); }
  if (a==='save-settings') { return saveSettings(); }
  if (a==='we-did-it') { const f = R.fam[b.dataset.k]; if (!f || !f.ch) return; const cl = sb(); let r;
    if (f.done) r = await cl.from('home_challenge_done').delete().eq('challenge_id', f.ch.id).eq('week_start', f.ch.week_start);
    else r = await cl.from('home_challenge_done').insert({center_id:R.center.id, challenge_id:f.ch.id, week_start:f.ch.week_start});
    if (r.error) return toast(msg(r.error)); f.done = !f.done; toast(f.done?'Nice! Saved for you.':'Removed'); return rerender(); }
});
document.addEventListener('change', async e => {
  const t = e.target; if (!hubOn() || !t.dataset) return; const c = ctx();
  if (t.dataset.rhMins) { R.pick.mins[t.dataset.rhMins] = Math.max(1, Math.min(240, +t.value||1)); return; }
  if (t.dataset.rhEdit) { const day = (R.day[key(c.room,c.date)]||{}).data; const mo = day && day.moments.find(m=>m.id===t.dataset.rhEdit); if (!mo) return;
    const mins = Math.max(0, Math.min(240, Math.round(+t.value||0))); const r = await sb().from('rhythm_moments').update(scale(mo, mins)).eq('id', mo.id); if (r.error) toast(msg(r.error)); await loadDay(c.room, c.date, true); return rerender(); }
  if (t.dataset.rhAges) { if (!t.value) return; return saveAges(t.dataset.rhAges, +t.value); }
});
async function saveAges(room, months){
  const r = await sb().from('rhythm_room_config').upsert({center_id:R.center.id, room, youngest_months:months}, {onConflict:'center_id,room'}).select('room,youngest_months,age_band').single();
  if (r.error) return toast(msg(r.error)); R.cfg[room] = r.data; R.day = {}; R.week.key = null; toast('Room ages saved'); rerender();
}
async function saveSettings(){
  const v = id => (document.getElementById(id)||{}).value; const num = x => (x===''||x==null) ? null : Number(x);
  const lat = num(v('rsLat')), lon = num(v('rsLon')), zip = (v('rsZip')||'').trim()||null;
  const confirmed = document.getElementById('rsConfirm').checked;
  const row = {center_id:R.center.id, lat, lon, zip, weather_contact:(v('rsContact')||'').trim()||null, sitting_nudge_min:num(v('rsNudge')), sitting_firm_min:num(v('rsFirm')), heat_index_f:+v('rsHeat'), wind_chill_f:+v('rsWind'),
    thresholds_confirmed_at: confirmed ? ((R.settings&&R.settings.thresholds_confirmed_at)||new Date().toISOString()) : null, thresholds_confirmed_by: confirmed ? undefined : null};
  if (row.thresholds_confirmed_by===undefined) delete row.thresholds_confirmed_by;
  const r = await sb().from('rhythm_center_settings').upsert(row, {onConflict:'center_id'}).select('*').single();
  if (r.error) return toast(/row-level/i.test(r.error.message) ? 'Acknowledge the policy first.' : msg(r.error));
  R.settings = r.data; R.weather = null; R.weatherFor = null; R.day = {}; toast('Settings saved'); rerender();
}

// ---------------------------------------------------------------- automatic screen log
// 1) The Today checklist's episode box and minutes (portal.js calls this after saving the day).
async function syncEpisode(room, date, dayDoc){
  if (!hubOn() || !R.center) return; const c = sb(); const ref = `portal-episode:${room}:${date}`;
  const on = !!(dayDoc && dayDoc.checks && dayDoc.checks.episode); const mins = Math.max(0, Math.min(240, Math.round(+((dayDoc.episode||{}).min ?? 5)||0)));
  try {
    if (!on || mins===0) { await c.from('rhythm_moments').delete().eq('center_id', R.center.id).eq('source_ref', ref); }
    else {
      const r = await c.from('rhythm_moments').upsert({center_id:R.center.id, room, date, moment_type:'learn', title:'Episode (watched together)', minutes:mins, screen_min:mins, source:'episode', source_ref:ref, adult_led:false}, {onConflict:'center_id,source_ref'});
      if (r.error) { toast(msg(r.error)); return false; }
    }
    delete R.day[key(room,date)]; return true;
  } catch(e){ return false; }
}
// 2) The episode player's watch log (localStorage ff-watch-log): every logged clip becomes a screen moment in the matching room.
function mirrorWatchLog(){
  if (!hubOn() || !R.center) return; const cx = ctx(); if (cx.role==='family' || !R.center) return;
  let log = []; try { log = JSON.parse(localStorage.getItem('ff-watch-log')||'[]'); } catch(_){ return; } if (!Array.isArray(log)) return;
  let seen = {}; try { seen = JSON.parse(localStorage.getItem('ff-rhythm-mirrored')||'{}'); } catch(_){}
  log.forEach(async (en, i) => {
    if (!en || typeof en.date!=='string' || typeof en.min!=='number') return;
    const ref = `watchlog:${en.date}:${en.room||''}:${en.ep||''}:${i}`; if (seen[ref]) return; seen[ref] = 1;
    const rn = String(en.room||'').toLowerCase(); const hit = Object.entries(cx.rooms||{}).find(([id,r])=>String(r.name||'').toLowerCase()===rn || id===en.room);
    const room = hit ? hit[0] : cx.room; if (!room) return;
    const r = await sb().from('rhythm_moments').upsert({center_id:R.center.id, room, date:en.date, moment_type:'learn', title:`Clip: ${String(en.ep||'episode').slice(0,80)}`, minutes:Math.round(en.min), screen_min:Math.round(en.min), source:'clip', source_ref:ref, adult_led:false}, {onConflict:'center_id,source_ref'});
    if (r.error) toast(msg(r.error)); else delete R.day[key(room,en.date)];
  });
  try { localStorage.setItem('ff-rhythm-mirrored', JSON.stringify(seen)); } catch(_){}
}
document.addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-ffx-log]')) setTimeout(mirrorWatchLog, 120); });

window.FFRhythm = {boot, teacherView, rweekView, familyCard, syncEpisode, screensBlocked: room => hubOn() && screensBlocked(room), _state:R};
})();
