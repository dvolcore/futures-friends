/* Evening daily report and family message settings for the Futures Hub portals (hub mode only; demo mode is untouched).
   Family: a "Today" report at the top of the Family Portal: each of the family's children (siblings together) as the center published
   it at about 5:30 pm, built only from what the teachers recorded that day (arrival, meals in neutral words, rest, diapering/toileting
   when recorded, the lesson and its pillar, the room's activities, the teacher's note, the moment of the day, photos only with photo
   consent), plus a "Talk about it tonight" line. Message settings: daily report email on/off, Futures at Home by email, and by text only
   with explicit consent.
   Teacher: a "Family reports" tab to preview each child's report before it is sent and to edit (or leave out) the note.
   Every rule (who may read what, consent, the health-data and wording guards, one email per guardian per day) lives in Postgres
   (migration 20261009100000_family_messages.sql); this file only draws screens and calls the database through the signed-in session
   hub-backend.js already holds. Guardrails: no child comparison, no scores, no health data, food described in neutral words. */
(function(){
'use strict';
const hubOn = () => !!(window.FFHub && window.FFHub.configured && window.FFHub.connected);
const sb = () => (window.FFHub && window.FFHub.client) ? window.FFHub.client() : null;
const ctx = () => (window.FFPortal && window.FFPortal.ctx) ? window.FFPortal.ctx() : {};
const rerender = () => { try { if (view==='portal' || view==='family-portal') render(); } catch(_){} };
const E = s => esc(s == null ? '' : String(s));
const longDay = s => { const [y,m,d] = String(s).split('-').map(Number); return new Date(y, m-1, d).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'}); };
const msg = e => (e && e.message) ? e.message : 'That did not save. Try again in a moment.';

// The same words as the report email (hub/worker/daily-report.mjs RETENTION_NOTE) and the owner decision of 2026-10-05.
const RETENTION = 'We keep daily care records for 3 years after a child leaves the program (a CACFP rule), and photos and messages for 1 year. Daily reports never include health information such as medication, allergies or diagnoses.';
const BANDS = [['infant','Baby (birth to 12 months)'],['toddler','Toddler (12 to 24 months)'],['twos','Two-year-old'],['threes','Three-year-old'],['prek','Pre-K (4 and 5 years)']];

const S = { rep:{}, repBusy:{}, prefs:null, prefsBusy:false, prefsErr:null, open:false, saving:false, prev:{}, prevBusy:{}, prevErr:{}, draft:{}, urls:{}, urlBusy:{}, pf:null };
const STYLE_ID = 'ff-report-css';
function css(){ if (document.getElementById(STYLE_ID)) return; const s = document.createElement('style'); s.id = STYLE_ID; s.textContent = `
.fr-today{border-top:5px solid var(--lumi)}
.fr-head{display:flex;justify-content:space-between;gap:6px 12px;flex-wrap:wrap;align-items:baseline}
.fr-kids{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:14px}
.fr-kid{border:1px solid var(--line);border-radius:14px;padding:14px;display:grid;gap:8px;background:var(--paper);min-width:0}
.fr-kid h4{margin:0;font-size:18px}
.fr-rows{display:grid;grid-template-columns:minmax(96px,auto) minmax(0,1fr);gap:4px 12px;margin:0;font-size:14px}
.fr-rows dt{color:var(--muted,#5b6470);font-weight:600}
.fr-rows dd{margin:0;overflow-wrap:anywhere}
.fr-talk{border-left:4px solid var(--gold);background:var(--paper2);padding:8px 12px;border-radius:10px;font-size:14px}
.fr-photos{display:flex;gap:8px;flex-wrap:wrap}
.fr-photos img{width:110px;height:110px;object-fit:cover;border-radius:10px;border:1px solid var(--line)}
.fr-note{font-size:12.5px;color:var(--muted,#5b6470);margin:0}
.fr-prefs{display:grid;gap:12px;border-top:1px solid var(--line);padding-top:12px}
.fr-prefs .ffi-check{display:flex;gap:10px;align-items:flex-start}
.fr-prefs .ffi-check input{margin-top:3px;flex:none;width:18px;height:18px}
.fr-sms{display:grid;gap:8px;padding:10px 12px;border:1px dashed var(--line);border-radius:12px}
.fr-prev{display:grid;gap:12px}
.fr-prev textarea{width:100%;min-height:64px;padding:8px;font:inherit}
.fr-held{border-left:4px solid var(--bad,#c0392b);padding:6px 10px;background:var(--paper2);border-radius:8px;font-size:13.5px}
`; document.head.appendChild(s); }

// lines for one child: [label, text], only what was recorded (same order as the email)
function lines(r){
  const out = []; const a = r.attendance || {};
  if (a.present) out.push(['Here today', [a.arrived && 'arrived '+a.arrived, a.left && 'left '+a.left].filter(Boolean).join(', ') || 'Yes']);
  if ((r.meals||[]).length) out.push(['Meals', r.meals.map(m=>m.meal+': '+m.words).join('. ')]);
  if (r.rest) out.push(['Rest', r.rest]);
  if ((r.care||[]).length) out.push(['Diapering and toileting', r.care.join('; ')]);
  if (r.lesson) out.push(["The room's lesson", `"${r.lesson.theme}" with ${r.lesson.friend}${r.lesson.pillar?' ('+r.lesson.pillar+')':''}${r.lesson.focus?'. Focus: '+r.lesson.focus:''}`]);
  // the daily-program record (same words as hub/worker/daily-report.mjs programLines): only what the teacher logged; no line for
  // a child logged as not joining, and "not recorded" when nothing was logged
  const prog = r.program || [], say = p => `${blockName(p.block)}: "${p.theme}" with ${p.friend}`;
  const took = prog.filter(p=>p.took_part===true), unknown = prog.filter(p=>p.took_part!==true && p.took_part!==false);
  if (took.length) out.push(['Took part in', took.map(say).join('; ')]);
  if (unknown.length) out.push(['Not recorded', `Whether ${r.first} joined ${unknown.map(say).join('; ')} was not recorded today`]);
  if ((r.activities||[]).length) out.push(['In the room', r.activities.map(x=>`${x.title} (${x.friend}, ${x.pillar})`).join('; ')]);
  if (r.note) out.push(['From the teacher', r.note]);
  if (r.class_note) out.push(['For the class', r.class_note]);
  (r.moments||[]).forEach(m => out.push([m.domain==='star'?'Friendship Star':'Moment of the day', m.text]));
  return out;
}
const blockName = b => String(b || 'activity').replace(/-/g,' ').replace(/^./, c => c.toUpperCase());
// the optional home continuation: the hub includes it only when this child took part in the record it belongs to
const tryHome = r => { const c = r.continuation; if (!c || !c.title) return '';
  return `<div class="fr-talk"><b>Try at home (optional): ${E(c.title)}</b>${(c.steps||[]).length?`<ol style="margin:4px 0 0 18px;padding:0">${c.steps.map(t=>`<li>${E(t)}</li>`).join('')}</ol>`:''}${(c.materials_from_home||[]).length?`<span>You will need: ${E(c.materials_from_home.join(', '))}</span>`:''}</div>`; };
const rows = r => `<dl class="fr-rows">${lines(r).map(([k,v])=>`<dt>${E(k)}</dt><dd>${E(v)}</dd>`).join('')}</dl>`;

// ---------------------------------------------------------------- family: Today
function loadReport(center, date){
  const k = center.id+'|'+date; if (S.repBusy[k] || S.rep[k]) return; S.repBusy[k] = true;
  sb().rpc('family_daily_report', {p_center:center.id, p_date:date}).then(r => {
    S.rep[k] = r.error ? {err:msg(r.error)} : r.data; S.repBusy[k] = false; rerender();
  }).catch(e => { S.rep[k] = {err:msg(e)}; S.repBusy[k] = false; rerender(); });
}
function photoUrl(path){
  if (S.urls[path] || S.urlBusy[path]) return S.urls[path] || '';
  S.urlBusy[path] = true;
  sb().storage.from('child-photos').createSignedUrl(path, 3600).then(r => { S.urls[path] = (r.data && r.data.signedUrl) || ''; S.urlBusy[path] = false; if (S.urls[path]) rerender(); }).catch(()=>{ S.urlBusy[path] = false; });
  return '';
}
function kidCard(r){
  const photos = (r.photos||[]).map(p => { const u = photoUrl(p.path); return u ? `<img src="${E(u)}" alt="${E(p.caption || ('Photo of '+r.first))}" loading="lazy">` : ''; }).join('');
  return `<article class="fr-kid" aria-label="${E(r.first)}'s day"><div class="fr-head"><h4>${E(r.first)}</h4><span class="mini">${E(r.room_name||'')}</span></div>
   ${rows(r)}
   ${(r.photos||[]).length ? `<div class="fr-photos">${photos || `<span class="mini">${r.photos.length} photo${r.photos.length===1?'':'s'} loading...</span>`}</div>` : ''}
   <p class="fr-talk"><b>Talk about it tonight:</b> ${E(r.talk_tonight)}</p>${tryHome(r)}</article>`;
}
function familyToday(c){
  if (!hubOn() || c.role!=='family' || !c.center) return '';
  css();
  const date = (c.fam && c.fam.date) || c.date; const k = c.center.id+'|'+date; const d = S.rep[k];
  if (!d) loadReport(c.center, date);
  let body;
  if (!d) body = '<p class="small muted">Loading the report...</p>';
  else if (d.err) body = `<p class="small">The report is not available right now. <button type="button" class="btn soft" data-fr="retry" style="padding:4px 10px">Try again</button></p>`;
  else if (!d.published) body = `<p class="small">The report for ${E(longDay(date))} arrives at ${E(d.send_time || 'about 5:30 pm')}. It is built from what the teachers record during the day, so there is nothing to fill in. If your child was not here, there is no report for that day.</p>`;
  else body = `<div class="fr-kids">${d.kids.map(kidCard).join('')}</div>`;
  return `<section class="card fr-today" id="frToday" aria-labelledby="frTodayH" style="display:grid;gap:12px">
   <div class="fr-head"><h3 id="frTodayH">Today's report</h3><span class="mini">${E(longDay(date))} · about your child only, never compared with other children</span></div>
   ${body}
   <p class="fr-note">${E(RETENTION)}</p>
   <div><button type="button" class="btn soft" data-fr="prefs" aria-expanded="${S.open?'true':'false'}" aria-controls="frPrefs">Message settings</button></div>
   ${S.open ? prefsPanel() : ''}</section>`;
}

// ---------------------------------------------------------------- family: message settings
function loadPrefs(){
  if (S.prefsBusy) return; S.prefsBusy = true;
  sb().rpc('family_get_message_prefs').then(r => { S.prefs = r.error ? null : r.data; S.prefsErr = r.error ? msg(r.error) : null; S.prefsBusy = false; rerender(); })
    .catch(e => { S.prefsErr = msg(e); S.prefsBusy = false; rerender(); });
}
function prefsPanel(){
  const p = S.prefs;
  if (!p) { if (!S.prefsErr) loadPrefs(); return `<div class="fr-prefs" id="frPrefs">${S.prefsErr?`<p class="small">${E(S.prefsErr)}</p>`:'<p class="small muted">Loading your settings...</p>'}</div>`; }
  // unsaved edits survive the portal's background re-renders (realtime updates redraw the page)
  const f = Object.assign({daily_report_email:p.daily_report_email, fah_email:p.fah_email, fah_sms:p.fah_sms, fah_age_band:p.fah_age_band, sms_phone:p.sms_phone, consent:!!(p.fah_sms && p.sms_consent_at)}, S.pf || {});
  const band = f.fah_age_band || p.suggested_age_band || '';
  return `<form class="fr-prefs" id="frPrefs" novalidate>
   <h4 style="margin:0">Message settings</h4>
   <label class="ffi-check" for="frDr"><input type="checkbox" id="frDr" ${f.daily_report_email?'checked':''}><span><b>Email me the daily report</b> each evening. The report is always here in the Family Portal, whatever you choose.</span></label>
   <label class="ffi-check" for="frFah"><input type="checkbox" id="frFah" ${f.fah_email?'checked':''}><span><b>Email me Futures at Home:</b> three short ideas a week (Monday, Wednesday, Friday) from Booker, Lumi, Zuri and Bop, each with a free activity and the source behind it.</span></label>
   <label class="f" for="frBand">Plan Futures at Home for<select class="i" id="frBand"><option value="">${p.suggested_age_band?'Use my child\'s room':'Choose an age'}</option>${BANDS.map(([v,l])=>`<option value="${v}" ${f.fah_age_band===v?'selected':''}>${l}${p.suggested_age_band===v?' (your child\'s room)':''}</option>`).join('')}</select></label>
   <div class="fr-sms">
    <label class="ffi-check" for="frSms"><input type="checkbox" id="frSms" ${f.fah_sms?'checked':''}><span><b>Text me Futures at Home</b> instead of, or as well as, email.</span></label>
    <label class="f" for="frPhone">Mobile number (US)<input class="i" id="frPhone" type="tel" inputmode="tel" autocomplete="tel" value="${E(f.sms_phone||'')}" placeholder="(816) 555-0100"></label>
    <label class="ffi-check" for="frConsent"><input type="checkbox" id="frConsent" ${f.consent?'checked':''}><span>${E(p.sms_consent_text)}</span></label>
    <p class="fr-note">Texts start only after our text service is registered with the phone carriers. Your choice is saved now, and nothing is texted before then.${p.fah_sms && p.sms_consent_at?' Consent recorded '+E(new Date(p.sms_consent_at).toLocaleDateString('en-US')) +'.':''}</p>
   </div>
   <p class="fr-note">${band?'':'Pick an age so Futures at Home fits your child. '}Every email has a one-click unsubscribe link. We never sell your contact details.</p>
   <div style="display:flex;gap:10px;flex-wrap:wrap"><button type="submit" class="btn gold" ${S.saving?'disabled':''}>${S.saving?'Saving...':'Save settings'}</button><button type="button" class="btn soft" data-fr="prefs-close">Close</button></div>
  </form>`;
}
async function savePrefs(){
  const $ = id => document.getElementById(id);
  const sms = $('frSms').checked, consent = $('frConsent').checked, phone = ($('frPhone').value||'').trim();
  if (sms && !phone) { toast('Enter a mobile number for texts'); $('frPhone').focus(); return; }
  if (sms && !consent && !(S.prefs && S.prefs.fah_sms && S.prefs.sms_consent_at)) { toast('Tick the consent box to get texts'); $('frConsent').focus(); return; }
  S.saving = true; rerender();
  const r = await sb().rpc('family_set_message_prefs', {p_daily_report_email:$('frDr').checked, p_fah_email:$('frFah').checked, p_fah_sms:sms,
    p_fah_age_band:$('frBand').value || null, p_sms_phone:sms ? phone : null, p_sms_consent:consent});
  S.saving = false;
  if (r.error) { toast(msg(r.error)); return rerender(); }
  S.prefs = r.data; S.pf = null; toast('Message settings saved'); rerender();
}

// ---------------------------------------------------------------- teacher: preview and edit before the send
function loadPreview(c){
  const k = c.center.id+'|'+c.room+'|'+c.date; if (S.prevBusy[k]) return; S.prevBusy[k] = true;
  sb().rpc('daily_report_room_preview', {p_center:c.center.id, p_room:c.room, p_date:c.date}).then(r => {
    S.prev[k] = r.error ? null : r.data; S.prevErr[k] = r.error ? msg(r.error) : null; S.prevBusy[k] = false; rerender();
  }).catch(e => { S.prevErr[k] = msg(e); S.prevBusy[k] = false; rerender(); });
}
function teacherView(c){
  if (!hubOn() || !c.center || !c.room) return '<div class="card"><p class="small">Family reports work with the Futures Hub sign-in.</p></div>';
  css();
  const k = c.center.id+'|'+c.room+'|'+c.date; const list = S.prev[k];
  if (list === undefined && !S.prevErr[k]) loadPreview(c);
  const intro = `<div class="card" style="display:grid;gap:6px"><h3>Family reports for ${E(longDay(c.date))}</h3>
    <p class="small" style="margin:0">Each family gets one report at about 5:30 pm, built from what you already recorded today: attendance, meals, rest, the lesson, the room's activities, your note, observations and consented photos. Check it here and edit or leave out the note before it goes. Nothing to type twice.</p>
    <p class="mini" style="margin:0">Reports never compare children and never include health information (medication, allergies, diagnoses). Notes that mention health details or judge food or bodies are held back automatically.</p></div>`;
  if (S.prevErr[k]) return intro + `<div class="card"><p class="small">${E(S.prevErr[k])}</p><button class="btn soft" data-fr="prev-retry">Try again</button></div>`;
  if (!list) return intro + '<div class="card"><p class="small muted">Loading the reports...</p></div>';
  if (!list.length) return intro + '<div class="card"><p class="small">No children in this classroom yet.</p></div>';
  return intro + `<div class="fr-prev">${list.map(x => {
    const r = x.report; const id = 'frN_'+x.kid.replace(/[^a-z0-9_-]/gi,'');
    const status = x.published ? `<span class="chip ok">Sent ${x.published_at ? new Date(x.published_at).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}) : ''}</span>` : (r ? '<span class="chip">Goes out at about 5:30 pm</span>' : '<span class="chip warn">No report: nothing recorded yet, or marked absent</span>');
    const draft = S.draft[x.kid] != null ? S.draft[x.kid] : ((r && r.note) || '');
    return `<article class="card" style="display:grid;gap:8px" aria-label="${E(x.first)}'s report"><div class="fr-head"><h3 style="margin:0">${E(x.first)}</h3>${status}</div>
     ${r ? rows(r) + `<p class="fr-talk"><b>Talk about it tonight:</b> ${E(r.talk_tonight)}</p>${tryHome(r)}${(r.photos||[]).length?`<p class="mini" style="margin:0">${r.photos.length} consented photo${r.photos.length===1?'':'s'} included in the app (never attached to the email).</p>`:''}` : ''}
     ${r && r.note_held ? '<p class="fr-held">The note from the day was held back because it mentions health details or judges food or bodies. Write a new note below, or leave it out.</p>' : ''}
     ${r && !x.published && c.canWrite ? `<label class="f" for="${id}">Note for ${E(x.first)}'s family${x.note_edited?' <span class="mini">(edited for the report)</span>':''}<textarea class="i" id="${id}" data-fr-note="${E(x.kid)}" maxlength="600">${E(draft)}</textarea></label>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn navy" data-fr="note-save" data-kid="${E(x.kid)}">Save note</button><button class="btn soft" data-fr="note-none" data-kid="${E(x.kid)}">Send without a note</button>${x.note_edited?`<button class="btn soft" data-fr="note-reset" data-kid="${E(x.kid)}">Use the note from the day</button>`:''}</div>` : ''}
    </article>`; }).join('')}</div>`;
}
async function setNote(kid, note){
  const c = ctx(); const r = await sb().rpc('daily_report_set_note', {p_center:c.center.id, p_kid:kid, p_date:c.date, p_note:note});
  if (r.error) { toast(msg(r.error)); return; }
  delete S.draft[kid]; delete S.prev[c.center.id+'|'+c.room+'|'+c.date]; toast(note === null ? 'Using the note from the day' : (note === '' ? 'This report goes without a note' : 'Note saved for the report')); loadPreview(c);
}

// ---------------------------------------------------------------- events
document.addEventListener('click', async e => {
  const b = e.target.closest ? e.target.closest('[data-fr]') : null; if (!b || !hubOn()) return;
  const a = b.dataset.fr, c = ctx();
  if (a==='prefs') { S.open = !S.open; if (S.open && !S.prefs) S.prefsErr = null; rerender(); if (S.open) setTimeout(()=>{ const f = document.getElementById('frDr'); if (f) f.focus(); }, 0); return; }
  if (a==='prefs-close') { S.open = false; S.pf = null; rerender(); const t = document.querySelector('[data-fr="prefs"]'); if (t) t.focus(); return; }
  if (a==='retry') { const date = (c.fam && c.fam.date) || c.date; delete S.rep[c.center.id+'|'+date]; return rerender(); }
  if (a==='prev-retry') { delete S.prevErr[c.center.id+'|'+c.room+'|'+c.date]; delete S.prev[c.center.id+'|'+c.room+'|'+c.date]; return rerender(); }
  if (a==='note-save') { const kid = b.dataset.kid; const v = (S.draft[kid] != null ? S.draft[kid] : (document.querySelector(`[data-fr-note="${CSS.escape(kid)}"]`)||{}).value || '').trim(); return setNote(kid, v || ''); }
  if (a==='note-none') return setNote(b.dataset.kid, '');
  if (a==='note-reset') return setNote(b.dataset.kid, null);
});
document.addEventListener('input', e => { const t = e.target; if (t && t.dataset && t.dataset.frNote) S.draft[t.dataset.frNote] = t.value; });
function keepForm(e){ const t = e.target; if (!t || !t.closest || !t.closest('#frPrefs')) return; const $ = id => document.getElementById(id);
  S.pf = {daily_report_email:$('frDr').checked, fah_email:$('frFah').checked, fah_sms:$('frSms').checked, fah_age_band:$('frBand').value || null, sms_phone:$('frPhone').value, consent:$('frConsent').checked}; }
document.addEventListener('change', keepForm);
document.addEventListener('input', keepForm);
document.addEventListener('submit', e => { if (e.target && e.target.id === 'frPrefs') { e.preventDefault(); if (hubOn()) savePrefs(); } }, true);
// a new day or a new room in the portal: refresh what we show
document.addEventListener('change', e => { const t = e.target; if (t && (t.id==='fDate' || t.id==='pDate' || t.id==='pRoom' || t.id==='fKid')) { S.prev = {}; } });

window.FFReport = {familyToday, teacherView, lines, RETENTION};
})();
