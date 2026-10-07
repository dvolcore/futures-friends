/* Futures Friends teaching-day parts shared by the teacher views (ETEACH): the Today program card (program-record.js), the Unit 1 day
   viewer (unit-1.js) and the Today prep card (prep-ahead.js). The printed packets draw the same three things (tools/make-unit1-packets.py).
   - support(record): leverage 3. The four whole-child fields, always in the same order and the same place (right after "Say or ask"):
     participation choices, movement alternative, meal reference (only when food appears; it points to the director-approved serving
     instruction, never a health detail) and family connection (the day's family activity id).
   - timing(key, blocks): E7. The day's blocks as editable timing blocks. Every minute is an estimate from the plan until a rehearsal
     times a real day; a teacher can change them to fit the room. Saved in this browser only (localStorage), never sent anywhere.
   - supplies(list): E7. The day's ONE deduplicated supply list, with the ordinary-supplies option and setup/supervision notes.
   Read-only apart from the browser-only timing; draws HTML strings. */
(function(){
'use strict';
const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY = 'ff-timing:';
const store = {
  get(k){ try { return JSON.parse((window.localStorage && window.localStorage.getItem(KEY + k)) || '{}') || {}; } catch(_) { return {}; } },
  set(k, v){ try { if (window.localStorage) window.localStorage.setItem(KEY + k, JSON.stringify(v)); } catch(_) {} },
  clear(k){ try { if (window.localStorage) window.localStorage.removeItem(KEY + k); } catch(_) {} }
};

function support(r){
  const fc = r.family_connection || {}, part = r.participation_alternatives || [];
  const row = (k, v) => `<div class="td-sup-row"><dt>${k}</dt><dd>${v}</dd></div>`;
  return `<div class="td-sup" role="group" aria-label="Everyone can join"><h4 class="td-h">Everyone can join</h4><dl>
    ${row('Participation choices', part.length ? `<ul>${part.map(x => `<li>${E(x)}</li>`).join('')}</ul>` : '<span class="td-muted">Not written yet.</span>')}
    ${row('Movement alternative', r.movement_alternative ? E(r.movement_alternative) : '<span class="td-muted">Not written yet.</span>')}
    ${row('Meal reference', r.meal_reference ? E(r.meal_reference) : 'No food in this block.')}
    ${row('Family connection', fc.note ? `${E(fc.note)} <span class="td-mini">(activity ${E(fc.activity)})</span>` : '<span class="td-muted">Not written yet.</span>')}</dl></div>`;
}

// blocks: [{id, label, min}] (min null = runs during the meal: shown, not timed)
function minutes(key, blocks){
  const mine = store.get(key);
  return blocks.map(b => ({...b, plan: b.min, now: b.min == null ? null : (Number.isFinite(+mine[b.id]) && mine[b.id] !== '' ? +mine[b.id] : b.min)}));
}
const sum = (xs, f) => xs.reduce((a, x) => a + (x[f] || 0), 0);
function bar(rows){
  const t = sum(rows, 'now') || 1;
  return rows.filter(r => r.now).map(r => `<span class="td-seg" style="flex-grow:${r.now}" title="${E(r.label)}: ${r.now} min">${r.now / t > 0.08 ? E(r.label) : ''}</span>`).join('');
}
function timing(key, blocks){
  const rows = minutes(key, blocks), changed = rows.some(r => r.now !== r.plan);
  return `<section class="td-time" data-time-key="${E(key)}" aria-labelledby="td-time-${E(key)}">
   <div class="td-head"><h4 class="td-h" id="td-time-${E(key)}">Timing blocks (estimates, editable)</h4><span class="td-chip">Estimates</span></div>
   <p class="td-mini">Minutes come from the plan and are estimates until a rehearsal times a real day. Change any block to fit your room; this is saved in this browser only.</p>
   <div class="td-bar" aria-hidden="true">${bar(rows)}</div>
   <ol class="td-blocks">${rows.map(r => `<li><span>${E(r.label)}</span>${r.now == null ? '<span class="td-mini">during the meal</span>'
     : `<label class="td-min"><span class="td-vh">${E(r.label)} minutes</span><input type="number" inputmode="numeric" min="0" max="120" step="1" value="${E(r.now)}" data-time-block="${E(r.id)}" data-time-of="${E(key)}"> min</label><span class="td-mini">plan: about ${E(r.plan)}</span>`}</li>`).join('')}</ol>
   <p class="td-total"><b data-time-total>about ${sum(rows, 'now')} min (estimate)</b> of planned blocks <span class="td-mini">· the plan says about ${sum(rows, 'plan')} min</span>
    ${changed ? `<button type="button" class="btn soft td-reset" data-time-reset="${E(key)}">Reset to the plan</button>` : ''}</p></section>`;
}

function supplies(list){
  if (!list || !list.length) return '';
  return `<section class="td-sup-list" aria-label="Supplies for today"><h4 class="td-h">Supplies for today: one list, no repeats</h4>
   <ul>${list.map(([name, kind, blocks, where, care]) => `<li><b>${E(name)}</b> <span class="td-mini">${E((blocks || []).join(', '))}</span>
     ${where ? `<span class="td-where">${E(where)}</span>` : ''}${care ? `<span class="td-care"><b>Setup and supervision:</b> ${E(care)}</span>` : ''}</li>`).join('')}</ul>
   <p class="td-mini">Printables are in the day's Start Monday file. Draft, not reviewed.</p></section>`;
}

// editable timing: update the section in place (total, bar, reset button) without redrawing the page
function onTime(t){
  const key = t.dataset.timeOf, sec = t.closest && t.closest('[data-time-key]'); if (!key) return;
  const mine = store.get(key), v = Math.max(0, Math.min(120, Math.round(+t.value)));
  if (t.value === '' || !Number.isFinite(v)) delete mine[t.dataset.timeBlock]; else mine[t.dataset.timeBlock] = v;
  store.set(key, mine);
  if (!sec || !sec.querySelectorAll) return;
  const rows = [...sec.querySelectorAll('[data-time-block]')].map(i => ({label: i.closest('li').firstElementChild.textContent, now: +i.value || 0}));
  const tot = sec.querySelector('[data-time-total]'); if (tot) tot.textContent = `about ${sum(rows, 'now')} min (estimate)`;
  const b = sec.querySelector('.td-bar'); if (b) b.innerHTML = bar(rows);
}
if (typeof document !== 'undefined' && document.addEventListener) {
  document.addEventListener('input', e => { const t = e.target; if (t && t.dataset && t.dataset.timeBlock) onTime(t); });
  document.addEventListener('click', e => { const t = e.target && e.target.closest && e.target.closest('[data-time-reset]'); if (!t) return;
    store.clear(t.dataset.timeReset); try { if (typeof render === 'function') render(); } catch(_) {} });
}

(function css(){
  if (typeof document === 'undefined' || !document.getElementById || document.getElementById('ff-teach-css') || !document.head) return;
  const s = document.createElement('style'); s.id = 'ff-teach-css'; s.textContent = `
.td-h{font-size:14px;margin:0 0 4px}
.td-mini{font-size:12.5px;color:var(--muted)}
.td-muted{color:var(--muted)}
.td-vh{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.td-sup{border-left:4px solid var(--lumi);background:var(--paper2);padding:8px 10px;border-radius:8px;min-width:0}
.td-sup dl{margin:0;display:grid;gap:6px}
.td-sup-row{display:grid;grid-template-columns:minmax(0,170px) minmax(0,1fr);gap:8px;font-size:14px}
.td-sup dt{font-weight:600}
.td-sup dd{margin:0;min-width:0;overflow-wrap:anywhere}
.td-sup ul{margin:0;padding-left:18px}
.td-time{display:grid;gap:8px;border:1px solid var(--line);border-radius:12px;padding:10px 12px;background:var(--paper)}
.td-head{display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap}
.td-chip{font-size:12px;font-weight:600;border-radius:99px;padding:2px 8px;background:var(--paper2);border:1px solid var(--line)}
.td-bar{display:flex;gap:2px;height:22px;border-radius:6px;overflow:hidden}
.td-seg{background:var(--zuri);color:#fff;font-size:11px;line-height:22px;padding:0 4px;white-space:nowrap;overflow:hidden;min-width:4px}
.td-seg:nth-child(2n){background:var(--booker)}
.td-blocks{margin:0;padding:0;list-style:none;display:grid;gap:4px}
.td-blocks li{display:grid;grid-template-columns:minmax(0,1fr) 6.2em 7.6em;gap:8px;align-items:center;font-size:14px;border-bottom:1px solid var(--line);padding:3px 0}
.td-blocks li>span.td-mini:nth-child(2){grid-column:2/-1}
.td-min{display:inline-flex;gap:4px;align-items:center}
.td-min input{width:64px;min-height:36px;padding:4px 6px;font:inherit;border:1px solid var(--line);border-radius:8px}
.td-total{margin:0;display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:14px}
.td-sup-list ul{margin:0;padding-left:18px;display:grid;gap:6px;font-size:14px}
.td-sup-list li{display:grid;gap:2px;min-width:0;overflow-wrap:anywhere}
.td-where,.td-care{font-size:13px}
@media (max-width:520px){.td-sup-row{grid-template-columns:1fr}.td-blocks li{grid-template-columns:minmax(0,1fr) 6.2em}.td-blocks li>.td-mini:last-child{grid-column:1/-1}}
`; document.head.appendChild(s);
})();

window.FFTeach = {support, timing, supplies, minutes};
})();
