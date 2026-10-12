// Grades: the teacher gradebook, skill-check assignments, the review queue and progress reports (hub/SKILL_CHECKS.md,
// migration 20261026100000_skill_checks.sql).
//
//   /c/<slug>/grades   Staff with the classroom permission: per room x skill grid with each child's own points and percent (children by
//                      id, never ordered by score, no room average), a child's answers, the review queue (observed items to score,
//                      flagged automatic grades: keep or change with a reason), assigning checks with a date window, and composing,
//                      previewing and RELEASING a progress report.
//                      Families: their own children's RELEASED progress reports, every number beside the words Emerging / Developing /
//                      Secure. English + Spanish (Spanish is a DRAFT).
// Owner decision 2026-10-10: numbers for teachers, and for families only through a released report. No ranking, no comparison.
// Plain ES module, no build step; the strict CSP forbids inline styles and inline code.

import { flipBlock, uiLang } from './i18n.js';
import { cssValue, deepFocus, deepMiss } from './deeplink.js';
import { centerToday } from './center-time.js';
// The staff member's own language for item text (prompt, Learning Step, rubric): the Spanish draft when they read Spanish and it exists.
const pickEs = (o, base) => (uiLang() === 'es' && o?.[`${base}_es`]) || o?.[`${base}_en`] || '';
const KIND = { tap_picture: 'Tap the picture', count_tap: 'Count and tap', match_pairs: 'Match pairs', sort_groups: 'Sort into 2 groups',
  put_in_order: 'Put in order', observed: 'Teacher watches' };
const LEVEL = { emerging: 'Emerging', developing: 'Developing', secure: 'Secure' };
const chicagoToday = () => centerToday();   // the center's day (center-time.js), not Central time
const addDays = (ymd, n) => { const d = new Date(`${ymd}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const pct = (p, m) => (m > 0 ? Math.round((100 * p) / m) : null);
// "2 of 2 (100%)": the child's own numbers, always shown beside a level word
export const numbersText = (p, m, lang = 'en') => (m > 0 ? (lang === 'es' ? `${p} de ${m} (${pct(p, m)} %)` : `${p} of ${m} (${pct(p, m)}%)`) : '');

export async function viewGrades(ctx) {
  return ctx.c.role === 'family' ? viewFamilyReports(ctx) : viewTeacherGrades(ctx);
}

// ===========================================================================================================================
// Staff
// ===========================================================================================================================
async function viewTeacherGrades(ctx) {
  const { c, shell, page, rpc, esc, friendly, client, live, go } = ctx;
  const T = 'Grades';
  page(shell('<p class="loading">Opening grades…</p>'), T, { english: true });
  const st = await rpc('skill_checks_status', { p_center: c.center_id }).catch(() => ({ enabled: false }));
  if (!st || !st.enabled) {
    page(shell(`<div class="card" id="scOff"><h2>Grades &amp; skill checks</h2>
      <p>Skill checks are off for this center. When they are on, teachers assign short checks, children play them in Kid Mode (or a teacher scores what they see), and you send each family a progress report.</p>
      <p class="small muted">Owner decision 2026-10-10. Families never see a ranking, a comparison or a class average.</p>
      ${st && st.director ? '<button class="btn navy" type="button" id="scTurnOn">Turn on skill checks</button>' : '<p class="small muted">Your director can turn them on.</p>'}
      <p class="small msg" id="scOffMsg" role="status"></p></div>`), T, { english: true });
    const on = document.getElementById('scTurnOn');
    if (on) on.addEventListener('click', async () => { try { await rpc('skill_checks_set_enabled', { p_center: c.center_id, p_on: true }); viewTeacherGrades(ctx); } catch (e) { document.getElementById('scOffMsg').textContent = friendly(e); } });
    return;
  }
  const rooms = ((await client().from('rooms').select('id, data').eq('center_id', c.center_id).order('id')).data || []);
  const q = new URLSearchParams(location.search);
  const room = rooms.find((r) => r.id === q.get('room'))?.id || rooms[0]?.id;
  if (!room) return page(shell('<div class="card"><h2>Grades</h2><p>No rooms yet.</p></div>'), T, { english: true });
  const to = /^\d{4}-\d{2}-\d{2}$/.test(q.get('to') || '') ? q.get('to') : chicagoToday();
  const from = /^\d{4}-\d{2}-\d{2}$/.test(q.get('from') || '') ? q.get('from') : addDays(to, -90);
  let g, rq, asg, reps, cat;
  try {
    [g, rq, asg, reps, cat] = await Promise.all([
      rpc('skill_gradebook', { p_center: c.center_id, p_room: room, p_from: from, p_to: to }),
      rpc('skill_review_queue', { p_center: c.center_id, p_room: room }),
      rpc('skill_check_assignments_list', { p_center: c.center_id, p_room: room }),
      rpc('progress_reports_list', { p_center: c.center_id, p_room: room }),
      rpc('skill_check_catalog', { p_center: c.center_id }),
    ]);
  } catch (e) { return page(shell(`<div class="card"><p class="msg bad" role="alert">${esc(friendly(e))}</p></div>`), T, { english: true }); }
  const url = (extra = {}) => `/c/${c.slug}/grades?${new URLSearchParams({ room, from, to, ...extra })}`;
  const short = (s) => (s.length > 46 ? `${s.slice(0, 44)}…` : s);
  const cell = (k, s) => {
    const x = k.cells[s.step];
    if (!x) return '<td><span class="sc-cell empty" aria-label="no result">·</span></td>';
    return `<td><button type="button" class="sc-cell" data-kid="${esc(k.kid)}" aria-label="${esc(k.name)}, ${esc(s.text_en)}: ${x.points} of ${x.max}, ${x.pct}%">
      <b>${x.points}/${x.max}</b><span class="mini">${x.pct}%</span><span class="mini muted">${esc(LEVEL[x.suggested] || '')}</span>${x.flagged ? '<span class="mini sc-flag">check</span>' : ''}</button></td>`;
  };
  const byUnit = {};
  for (const it of cat) (byUnit[it.unit] ||= []).push(it);
  const kidOpts = g.children.map((k) => `<option value="${esc(k.kid)}">${esc(k.name)}</option>`).join('');

  page(shell(`<div class="sc-grades" id="gradesPage">
    <div class="card sc-head"><div><h2>Grades &amp; skill checks</h2>
      <p class="muted">Each child's own numbers per skill. Children are listed by name, never ranked, and there is no class average. Families see a child's numbers only in a progress report you release, always beside Emerging, Developing or Secure.</p>
      <p class="small"><span class="chip warn">Draft items: not yet reviewed by HQ</span></p></div>
      ${st.director ? '<button class="btn link small" type="button" id="scTurnOff">Turn skill checks off</button>' : ''}</div>
    <form class="card sc-controls" id="scFilter" novalidate>
      <label class="f"><span>Room</span><select class="i" id="scRoom">${rooms.map((r) => `<option value="${esc(r.id)}"${r.id === room ? ' selected' : ''}>${esc(r.data?.name || r.id)}</option>`).join('')}</select></label>
      <label class="f"><span>From</span><input class="i" type="date" id="scFrom" value="${esc(from)}"></label>
      <label class="f"><span>To</span><input class="i" type="date" id="scTo" value="${esc(to)}"></label>
      <button class="btn navy" type="submit">Show</button></form>

    <section class="card" id="scGradebook"><h3>Gradebook</h3>
      ${g.skills.length ? `<div class="km-scroll" tabindex="0" role="region" aria-label="Gradebook: children by skill"><table class="km-table sc-table" id="scGrid"><thead><tr><th scope="col">Child</th>
        ${g.skills.map((s) => `<th scope="col" title="${esc(s.text_en)}"><span>${esc(short(s.text_en))}</span></th>`).join('')}</tr></thead>
        <tbody>${g.children.map((k) => `<tr><th scope="row">${esc(k.name)}${k.age_band ? ` <span class="mini muted">${esc(k.age_band)}</span>` : ''}</th>${g.skills.map((s) => cell(k, s)).join('')}</tr>`).join('')}</tbody></table></div>
        <p class="small muted">Points of possible points and the percent, for that child only. Right first time = 2, right on the second try = 1. The word under each is a suggestion; you choose the level in the report.</p>`
        : '<p class="empty">No results yet for this room and period. Assign a check below.</p>'}
      <div id="scDetail" hidden></div></section>

    <section class="card" id="scReview"><h3>To review</h3>
      ${rq.observe.length ? `<h4>Score by watching</h4><ul class="list sc-obs">${rq.observe.map((o, n) => `<li data-obs="${esc(`${o.assignment}:${o.kid}:${o.item}`)}"><form class="sc-obsform" data-n="${n}" novalidate>
        <p><b>${esc(o.name)}</b> · ${esc(o.title)} <span class="mini muted">closes ${esc(o.closes_on)}</span></p><p class="small">${esc(pickEs(o, 'prompt'))}</p>
        <fieldset class="f"><legend class="small">${esc(short(pickEs(o, 'step')))}</legend><div class="choices">${o.rubric.levels.map((l) => `<label class="choice"><input type="radio" name="pts${n}" value="${l.points}"><span><b>${l.points}</b> ${esc((uiLang() === 'es' && l.es) || l.en)}</span></label>`).join('')}</div></fieldset>
        <label class="f"><span>Note (optional, what the child did)</span><input class="i" name="note" maxlength="500"></label>
        <button class="btn navy small" type="submit">Save</button><span class="small msg" role="status"></span></form></li>`).join('')}</ul>` : ''}
      ${rq.flagged.length ? `<h4>Automatic grades to look at</h4><ul class="list sc-flagged">${rq.flagged.map((f) => `<li data-res="${esc(f.id)}"><span class="who"><b>${esc(f.name)}</b><span class="small">${esc(pickEs(f, 'prompt'))}</span>
        <span class="mini muted">${f.points} of ${f.max} · ${f.flag_reason === 'fast' ? 'a very fast tap (maybe a guess)' : 'a long wait before answering'}</span></span>
        <button class="btn soft small" type="button" data-keep="${esc(f.id)}">Keep</button><button class="btn link small" type="button" data-change="${esc(f.id)}" data-max="${f.max}">Change</button></li>`).join('')}</ul>` : ''}
      ${!rq.observe.length && !rq.flagged.length ? '<p class="empty">Nothing to review.</p>' : ''}
      <form class="sc-override" id="scOverride" hidden novalidate><h4>Change a grade</h4>
        <label class="f"><span>New points</span><select class="i" id="ovPoints"></select></label>
        <label class="f"><span>Why (kept with the original grade)</span><input class="i" id="ovReason" maxlength="500"></label>
        <p class="small msg" id="ovMsg" role="status"></p><div class="cta-row"><button class="btn navy small" type="submit">Save change</button><button class="btn link small" type="button" id="ovCancel">Cancel</button></div></form></section>

    <section class="card" id="scAssign"><h3>Assign a check</h3>
      <form id="scAssignForm" novalidate>
        <div class="row two"><label class="f"><span>Title</span><input class="i" id="asTitle" maxlength="80" value="Skill check"></label>
        <label class="f"><span>For</span><select class="i" id="asFor"><option value="">The whole room</option>${kidOpts}</select></label></div>
        <div class="row two"><label class="f"><span>Opens</span><input class="i" type="date" id="asOpens" value="${esc(chicagoToday())}"></label>
        <label class="f"><span>Closes</span><input class="i" type="date" id="asCloses" value="${esc(addDays(chicagoToday(), 6))}"></label></div>
        <details class="sc-bank"><summary>Choose items (1 to 8)</summary>${Object.entries(byUnit).map(([u, list]) => `<fieldset class="sc-unit"><legend>Unit ${esc(u)}</legend>
          ${list.map((it) => `<label class="choice sc-item"><input type="checkbox" name="item" value="${esc(it.id)}"><span><b>${esc(KIND[it.kind])}</b> · ${esc(pickEs(it, 'prompt'))}
            <span class="mini muted">${esc(it.bands.join(', '))} · ${esc(short(pickEs(it, 'step')))}</span>${it.status === 'draft' ? ' <span class="chip warn mini">Draft</span>' : ''}</span></label>`).join('')}</fieldset>`).join('')}</details>
        <p class="small muted">On-screen items are played in Kid Mode by children 3 and older (no time limit; the time is recorded for you). "Teacher watches" items appear in your review queue to score. Twos only ever get "Teacher watches" items.</p>
        <p class="small msg" id="asMsg" role="status"></p><button class="btn navy" type="submit">Assign</button></form>
      ${asg.length ? `<h4>Checks for this room</h4><ul class="list" id="scAssignments">${asg.map((a) => `<li><span class="who"><b>${esc(a.title)}</b>
        <span class="small muted">${esc(a.kid_name ? `for ${a.kid_name}` : 'whole room')} · ${esc(a.opens_on)} to ${esc(a.closes_on)} · ${a.items.length} item${a.items.length === 1 ? '' : 's'}</span></span>
        ${a.status === 'active' ? `<button class="btn link small" type="button" data-cancel="${esc(a.id)}">Cancel</button>` : '<span class="chip">Cancelled</span>'}</li>`).join('')}</ul>` : ''}</section>

    <section class="card" id="scReports"><h3>Progress reports</h3>
      <p class="small muted">For ${esc(from)} to ${esc(to)}. Write a report, preview it, then release it: the family sees it in the Family Portal and gets an email (in their language).</p>
      <ul class="list">${g.children.map((k) => { const r = reps.find((x) => x.kid === k.kid && x.from === from && x.to === to); return `<li><span class="who"><b>${esc(k.name)}</b>
        ${r ? `<span class="chip ${r.status === 'released' ? 'ok' : 'warn'}">${r.status === 'released' ? 'Released' : 'Draft'}</span>` : ''}</span>
        <button class="btn soft small" type="button" data-compose="${esc(k.kid)}">${r && r.status === 'released' ? 'View' : 'Write report'}</button></li>`; }).join('')}</ul>
      ${reps.length ? `<h4>Earlier reports</h4><ul class="list small">${reps.map((r) => `<li>${esc(r.name)} · ${esc(r.from)} to ${esc(r.to)} · ${r.status === 'released' ? `released ${esc(String(r.released_at).slice(0, 10))}` : 'draft'}${r.deliveries ? ` · email: ${esc(Object.entries(r.deliveries).map(([s, n]) => `${n} ${s}`).join(', '))}` : ''}</li>`).join('')}</ul>` : ''}
      <div id="scComposer" hidden></div></section>
  </div>`), T, { english: true });

  document.getElementById('scFilter').addEventListener('submit', (e) => { e.preventDefault(); go(`/c/${c.slug}/grades?${new URLSearchParams({ room: document.getElementById('scRoom').value, from: document.getElementById('scFrom').value, to: document.getElementById('scTo').value })}`); });
  document.getElementById('scRoom').addEventListener('change', (e) => go(`/c/${c.slug}/grades?${new URLSearchParams({ room: e.target.value, from, to })}`));
  const off = document.getElementById('scTurnOff');
  if (off) off.addEventListener('click', async () => { if (!confirm('Turn skill checks off for the whole center? Existing grades and reports are kept.')) return; await rpc('skill_checks_set_enabled', { p_center: c.center_id, p_on: false }); viewTeacherGrades(ctx); });
  const again = () => go(url(), true);

  // drill-down: one child's answers
  const grid = document.getElementById('scGrid');
  if (grid) grid.addEventListener('click', async (e) => {
    const b = e.target.closest('button[data-kid]'); if (!b) return;
    const box = document.getElementById('scDetail');
    try {
      const d = await rpc('skill_child_detail', { p_center: c.center_id, p_kid: b.dataset.kid, p_from: from, p_to: to });
      box.hidden = false;
      box.innerHTML = `<h4>${esc(d.name)}: answers</h4><ol class="sc-answers">${d.results.map((r) => `<li><b>${esc(pickEs(r, 'prompt'))}</b> <span class="mini muted">${esc(KIND[r.kind])} · ${esc(r.title)}</span>
        <div class="small">${r.points} of ${r.max}${r.status === 'overridden' ? ` (changed; automatic grade was ${r.auto_points})` : ''}${r.source === 'observed' ? ' · scored by watching' : ''}${(r.note ? ` · ${esc(r.note)}` : '') + (r.accommodated ? ` <span class="chip sc-acc">${esc('Accommodated')}</span>` : '')}</div>
        ${r.attempts.length ? `<ul class="mini">${r.attempts.map((a) => `<li>Try ${a.attempt}: ${a.correct ? 'right' : 'not yet'} · ${(a.ms / 1000).toFixed(1)} s · ${esc(a.place)} · answer ${esc(JSON.stringify(Object.fromEntries(Object.entries(a.response).filter(([k2]) => k2 !== 'correct'))))}</li>`).join('')}</ul>` : ''}
        ${r.history.length ? `<ul class="mini">${r.history.map((h) => `<li>${esc(h.action === 'accept' ? 'Kept' : `Changed ${h.old} → ${h.new}`)}: ${esc(h.reason)}</li>`).join('')}</ul>` : ''}</li>`).join('') || '<li class="empty">No answers in this period.</li>'}</ol>`;
      box.scrollIntoView({ block: 'nearest' });
    } catch (err) { live(friendly(err)); }
  });

  // review: observed items
  document.querySelectorAll('.sc-obsform').forEach((f) => f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const o = rq.observe[Number(f.dataset.n)]; const pick = f.querySelector('input[type=radio]:checked'); const m = f.querySelector('.msg');
    if (!pick) { m.className = 'small msg bad'; m.textContent = 'Choose a level on the rubric.'; return; }
    try { await rpc('skill_observe_score', { p_center: c.center_id, p_assignment: o.assignment, p_kid: o.kid, p_item: o.item, p_points: Number(pick.value), p_note: f.querySelector('[name=note]').value || null }); live('Saved'); again(); }
    catch (err) { m.className = 'small msg bad'; m.textContent = friendly(err); }
  }));
  // review: flagged grades
  const ov = document.getElementById('scOverride'); let ovId = null;
  document.getElementById('scReview').addEventListener('click', async (e) => {
    const k = e.target.closest('[data-keep]');
    if (k) { try { await rpc('skill_result_accept', { p_result: k.dataset.keep }); live('Kept'); again(); } catch (err) { live(friendly(err)); } return; }
    const ch = e.target.closest('[data-change]'); if (!ch) return;
    ovId = ch.dataset.change; ov.hidden = false;
    document.getElementById('ovPoints').innerHTML = Array.from({ length: Number(ch.dataset.max) + 1 }, (_, n) => `<option value="${n}">${n}</option>`).join('');
    document.getElementById('ovReason').value = ''; document.getElementById('ovReason').focus();
  });
  document.getElementById('ovCancel').addEventListener('click', () => { ov.hidden = true; });
  ov.addEventListener('submit', async (e) => {
    e.preventDefault();
    try { await rpc('skill_result_override', { p_result: ovId, p_points: Number(document.getElementById('ovPoints').value), p_reason: document.getElementById('ovReason').value }); live('Grade changed'); again(); }
    catch (err) { const m = document.getElementById('ovMsg'); m.className = 'small msg bad'; m.textContent = friendly(err); }
  });

  // assign
  document.getElementById('scAssignForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const m = document.getElementById('asMsg');
    const items = [...document.querySelectorAll('#scAssignForm input[name=item]:checked')].map((x) => x.value);
    const kid = document.getElementById('asFor').value || null;
    try {
      await rpc('skill_check_assign', { p_center: c.center_id, p_room: kid ? null : room, p_kid: kid, p_title: document.getElementById('asTitle').value, p_items: items,
        p_opens: document.getElementById('asOpens').value || null, p_closes: document.getElementById('asCloses').value || null });
      live('Check assigned'); again();
    } catch (err) { m.className = 'small msg bad'; m.textContent = friendly(err); }
  });
  const al = document.getElementById('scAssignments');
  if (al) al.addEventListener('click', async (e) => { const b = e.target.closest('[data-cancel]'); if (!b) return; try { await rpc('skill_check_cancel', { p_id: b.dataset.cancel }); again(); } catch (err) { live(friendly(err)); } });

  // progress report composer
  document.getElementById('scReports').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-compose]'); if (!b) return;
    compose(b.dataset.compose);
  });
  async function compose(kid, levels = null, note = null) {
    const box = document.getElementById('scComposer');
    let p;
    try { p = await rpc('progress_report_preview', { p_center: c.center_id, p_kid: kid, p_from: from, p_to: to, p_levels: levels || {}, p_note: note }); }
    catch (err) { return live(friendly(err)); }
    const rep = p.report;
    const released = rep && rep.status === 'released';
    const lv = { ...(rep ? rep.levels : {}), ...(levels || {}) };
    // the teacher chooses every level (a suggestion is marked, never preselected)
    const sel = (s) => `<select class="i sc-level" data-step="${esc(s.step)}" aria-label="Level for ${esc(s.text_en)}"${released ? ' disabled' : ''}><option value="">Choose…</option>${Object.entries(LEVEL).map(([k2, w]) => `<option value="${k2}"${(lv[s.step] || s.level) === k2 ? ' selected' : ''}>${w}${s.suggested === k2 ? ' (suggested)' : ''}</option>`).join('')}</select>`;
    box.hidden = false;
    box.innerHTML = `<form id="repForm" class="sc-composer" novalidate><h4>Progress report: ${esc(p.first)}, ${esc(from)} to ${esc(to)}${released ? ' <span class="chip ok">Released</span>' : ' <span class="chip warn">Draft</span>'}</h4>
      ${p.skills.length ? `<table class="sc-reptable"><thead><tr><th scope="col">Skill</th><th scope="col">This child</th><th scope="col">Level (words)</th></tr></thead><tbody>
        ${p.skills.map((s) => `<tr><td>${esc(s.text_en)}</td><td>${s.max > 0 ? esc(numbersText(s.points, s.max)) : '<span class="muted">teacher level only</span>'}</td><td>${sel(s)}</td></tr>`).join('')}</tbody></table>`
        : '<p class="empty">Nothing to report for this period yet.</p>'}
      <label class="f"><span>Note to the family (what the child did; no comparing with other children)</span><textarea class="i" id="repNote" rows="3" maxlength="1500"${released ? ' disabled' : ''}>${esc((rep && rep.note) || note || '')}</textarea></label>
      <p class="small muted">The family sees each number beside its level word, about their child only. Releasing sends it to the Family Portal and emails each guardian.</p>
      <p class="small msg" id="repMsg" role="status"></p>
      ${released ? '' : `<div class="cta-row"><button class="btn soft" type="submit">Save draft</button><button class="btn gold" type="button" id="repRelease"${p.skills.length ? '' : ' disabled'}>Release to the family</button></div>`}</form>`;
    box.scrollIntoView({ block: 'nearest' });
    if (released) return;
    const collect = () => Object.fromEntries([...box.querySelectorAll('.sc-level')].filter((x) => x.value).map((x) => [x.dataset.step, x.value]));
    const save = async () => rpc('progress_report_save', { p_center: c.center_id, p_kid: kid, p_from: from, p_to: to, p_note: document.getElementById('repNote').value, p_levels: collect() });
    const msg = document.getElementById('repMsg');
    document.getElementById('repForm').addEventListener('submit', async (e) => { e.preventDefault(); try { await save(); msg.className = 'small msg ok'; msg.textContent = 'Draft saved'; } catch (err) { msg.className = 'small msg bad'; msg.textContent = friendly(err); } });
    document.getElementById('repRelease').addEventListener('click', async () => {
      if (!confirm(`Release ${p.first}'s progress report to the family? It cannot be changed afterwards.`)) return;
      try { const r = await save(); const rel = await rpc('progress_report_release', { p_report: r.id }); live(`Released to ${rel.recipients} guardian${rel.recipients === 1 ? '' : 's'}`); again(); }
      catch (err) { msg.className = 'small msg bad'; msg.textContent = friendly(err); }
    });
  }
  // the staff dashboard's to-do rows (staff-dashboard.js dashLink): ?item=<assignment:kid:item> an observed item to score,
  // ?result=<id> a flagged grade, ?compose=<kid> a progress report in draft (with that report's from/to)
  if (q.get('item')) { const el = document.querySelector(`.sc-obs li[data-obs="${cssValue(q.get('item'))}"]`); if (el) deepFocus(el); else deepMiss('any', 'en'); }
  else if (q.get('result')) { const el = document.querySelector(`.sc-flagged li[data-res="${cssValue(q.get('result'))}"]`); if (el) deepFocus(el); else deepMiss('any', 'en'); }
  else if (q.get('compose')) {
    if (g.children.some((k) => k.kid === q.get('compose'))) { await compose(q.get('compose')); deepFocus(document.getElementById('scComposer')); } else deepMiss('child', 'en');
  }
}

// ===========================================================================================================================
// Families: their own child's released reports (English + Spanish DRAFT)
// ===========================================================================================================================
export const FR = {
  en: { title: 'Progress reports', none: 'No progress report yet. Your child\'s teacher sends one when it is ready.', period: (a, b) => `${a} to ${b}`,
    skill: 'Skill', level: 'Level', numbers: 'Skill check', teacher: 'From the teacher', only: 'These numbers are about your child only. They are never compared with other children, and there is no ranking.',
    noNum: 'observed by the teacher', open: 'Progress reports', openHint: "Your child's released progress reports, with the teacher's words." },
  es: { title: 'Informes de progreso', none: 'Todavía no hay informe de progreso. La maestra lo envía cuando está listo.', period: (a, b) => `${a} a ${b}`,
    skill: 'Habilidad', level: 'Nivel', numbers: 'Prueba', teacher: 'De la maestra', only: 'Estos números son solo de su hijo o hija. Nunca se comparan con otros niños y no hay clasificación.',
    noNum: 'observado por la maestra', open: 'Informes de progreso', openHint: 'Los informes de progreso de su hijo o hija, con las palabras de la maestra.' },
};
export function reportHtml(esc, content, lang = 'en') {
  const L = FR[lang === 'es' ? 'es' : 'en'];
  const key = content.levels_key || {};
  const words = (s) => (lang === 'es' ? (s.text_es || s.family_en || s.text_en) : (s.family_en || s.text_en));
  return `<table class="sc-reptable sc-family"><thead><tr><th scope="col">${esc(L.skill)}</th><th scope="col">${esc(L.level)}</th><th scope="col">${esc(L.numbers)}</th></tr></thead><tbody>
    ${(content.skills || []).map((s) => { const k = key[s.level] || {}; return `<tr><td>${esc(words(s))}</td>
      <td><span class="chip sc-lvl sc-lvl-${esc(s.level)}">${esc(lang === 'es' ? k.es : k.en)}</span><span class="mini muted sc-lvlw">${esc(lang === 'es' ? k.es_words : k.en_words)}</span></td>
      <td>${s.max > 0 ? esc(numbersText(s.points, s.max, lang)) : `<span class="mini muted">${esc(L.noNum)}</span>`}</td></tr>`; }).join('')}</tbody></table>
    ${content.note ? `<p><b>${esc(L.teacher)}:</b> ${esc(content.note)}</p>` : ''}<p class="small muted">${esc(L.only)}</p>`;
}

async function viewFamilyReports(ctx) {
  const { c, shell, page, rpc, esc, friendly, lang } = ctx;
  const L = FR[lang === 'es' ? 'es' : 'en'];
  page(shell('<p class="loading">…</p>'), L.title);
  let kids;
  try { kids = await rpc('kid_mode_kids', { p_center: c.center_id, p_room: null }); } catch (e) { return page(shell(`<div class="card"><p class="msg bad" role="alert">${esc(friendly(e))}</p></div>`), L.title); }
  if (!kids.length) return page(shell(`<div class="card"><h2>${esc(L.title)}</h2><p>${esc(L.none)}</p></div>`), L.title);
  const qs = new URLSearchParams(location.search);
  const want = qs.get('kid'), wantReport = qs.get('report');       // ?kid=&report= : the released report a notification is about
  const cur = kids.find((k) => k.kid === want) || kids[0];
  let reps = [];
  try { reps = await rpc('progress_reports_for_family', { p_center: c.center_id, p_kid: cur.kid }); } catch (e) { return page(shell(`<div class="card"><p class="msg bad" role="alert">${esc(friendly(e))}</p></div>`), L.title); }
  page(shell(`<div class="sc-fam" id="familyReports">
    ${kids.length > 1 ? `<nav class="tabs" aria-label="${esc(lang === 'es' ? 'Niños' : 'Children')}">${kids.map((k) => `<a href="/c/${esc(c.slug)}/grades?kid=${encodeURIComponent(k.kid)}" data-nav${k.kid === cur.kid ? ' aria-current="page"' : ''}>${esc(k.label)}</a>`).join('')}</nav>` : ''}
    <div class="card"><h2>${esc(L.title)}: ${esc(cur.label)}</h2>${lang === 'es' ? '<p class="small"><span class="chip warn">Traducción en borrador</span></p>' : ''}
      ${reps.length ? reps.map((r) => `<article class="sc-report" data-report="${esc(r.id)}"><h3>${esc(L.period(r.from, r.to))}</h3>${flipBlock({ en: reportHtml(esc, r.content, 'en'), es: reportHtml(esc, r.content, 'es') }, lang, { cls: 'sc-report-body' })}</article>`).join('') : `<p class="empty">${esc(L.none)}</p>`}</div></div>`), L.title);
  if (want && !kids.some((k) => k.kid === want)) deepMiss('child', lang);
  else if (wantReport) { const el = document.querySelector(`.sc-report[data-report="${cssValue(wantReport)}"]`); if (el) deepFocus(el); else deepMiss('report', lang); }
}

// A small card for the family's child page (/c/<slug>/child/<kid>): a link to the released reports.
export function familyReportsCardHtml(esc, slug, kid, lang = 'en') {
  const L = FR[lang === 'es' ? 'es' : 'en'];
  return `<div class="card" id="childReports"><h3>${esc(L.open)}</h3><p class="small muted">${esc(L.openHint)}</p>
    <a class="btn soft small" href="/c/${esc(slug)}/grades?kid=${encodeURIComponent(kid)}" data-nav>${esc(L.open)}</a></div>`;
}
