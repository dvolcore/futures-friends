// Checkpoints and conference reports (hub/CHECKPOINTS.md, migration 20261028410000_checkpoints_conferences.sql; ELOF filter from the
// standards crosswalk, hub/STANDARDS_CROSSWALK.md).
//
//   /c/<slug>/checkpoints   Staff with the classroom permission: the three checkpoint windows of the school year (fall / winter /
//                           spring, from the center calendar; the director can change them), the room's checklist (each child's
//                           Learning Steps in words, the child's own skill-check numbers beside them, fall -> winter -> spring for THAT
//                           child only), the conference report composer (strengths, growing next, home ideas, the teacher's note with an
//                           optional second-language version, shared goals), release, and conference times. Directors also get
//                           completion counts per room (counts only).
//                           Families: their own child's released conference reports (printable: Print / Save as PDF), acknowledging and
//                           adding their own notes and goals, and choosing a conference time. English + Spanish (Spanish is a DRAFT).
// Owner rules: scores ON (numbers beside words), never ranking, comparison or class averages to families.
// Plain ES module, no build step; the strict CSP forbids inline styles and inline code.

import { bindExport, exportCardHtml } from './assessment-export.js';   // N22 GOLD / DRDP entry export (hub/ASSESSMENT_EXPORT.md)
import { flipText } from './i18n.js';
import { cssValue, deepFocus, deepMiss } from './deeplink.js';
import { mountPortalGaps } from './portal-gaps.js';   // the child's Learning Steps set (hub/PORTAL_RETIREMENT.md)

export const SEASONS = ['fall', 'winter', 'spring'];
export const LEVELS = ['emerging', 'developing', 'secure', 'not_observed'];
export const W = {
  en: {
    title: 'Checkpoints & conferences', season: { fall: 'Fall', winter: 'Winter', spring: 'Spring' }, report: (s) => `${s} conference report`,
    strengths: 'Strengths', growing: 'Growing next', note: 'From the teacher', goals: 'Our shared goals', ideas: 'Ideas to try at home',
    yourGoals: 'Your notes and goals', steps: 'Learning Steps', level: 'Level', checks: 'Skill checks', growth: 'This year so far',
    print: 'Print or save as PDF', ack: 'I have read this report', ackDone: (d) => `You acknowledged this report on ${d}.`, save: 'Save',
    famNote: 'Your notes (optional)', famGoals: 'Your goals for your child (optional)', thanks: 'Thank you. Your teacher can see your notes.',
    conf: 'Conferences', booked: (w) => `Your conference: ${w}`, with: (t) => `with ${t}`, choose: 'Choose this time', cancel: 'Cancel this time',
    noSlots: 'No conference times are open right now. Your teacher adds them during each checkpoint.', pick: 'Pick a conference time',
    none: 'No conference report yet. Your child\'s teacher shares one after each checkpoint (fall, winter and spring).', translatedBy: 'Translation by the teacher',
    mode: { in_person: 'in person', phone: 'by phone', video: 'by video' }, at: (c) => `at ${c}`, draft: 'Spanish translation in draft',
    released: (d) => `Shared ${d}`, kids: 'Children',
    domain: { atl: 'Approaches to Learning', se: 'Social and Emotional', lang: 'Language and Literacy', cog: 'Thinking and Math',
      pmp: 'Physical and Motor', arts: 'Creative Arts', ss: 'Social Studies' },
  },
  es: {
    title: 'Evaluaciones y conferencias', season: { fall: 'Otoño', winter: 'Invierno', spring: 'Primavera' }, report: (s) => `Informe de la conferencia de ${s.toLowerCase()}`,
    strengths: 'Fortalezas', growing: 'Lo que sigue', note: 'De la maestra', goals: 'Nuestras metas compartidas', ideas: 'Ideas para hacer en casa',
    yourGoals: 'Sus notas y metas', steps: 'Pasos de aprendizaje', level: 'Nivel', checks: 'Pruebas', growth: 'Este año hasta ahora',
    print: 'Imprimir o guardar como PDF', ack: 'Leí este informe', ackDone: (d) => `Usted confirmó que leyó este informe el ${d}.`, save: 'Guardar',
    famNote: 'Sus notas (opcional)', famGoals: 'Sus metas para su hijo o hija (opcional)', thanks: 'Gracias. La maestra puede ver sus notas.',
    conf: 'Conferencias', booked: (w) => `Su conferencia: ${w}`, with: (t) => `con ${t}`, choose: 'Elegir este horario', cancel: 'Cancelar este horario',
    noSlots: 'No hay horarios de conferencia abiertos ahora. La maestra los agrega en cada evaluación.', pick: 'Elija un horario para la conferencia',
    none: 'Todavía no hay informe de conferencia. La maestra lo comparte después de cada evaluación (otoño, invierno y primavera).', translatedBy: 'Traducción de la maestra',
    mode: { in_person: 'en persona', phone: 'por teléfono', video: 'por video' }, at: (c) => `en ${c}`, draft: 'Traducción en borrador',
    released: (d) => `Compartido el ${d}`, kids: 'Niños',
    domain: { atl: 'Formas de aprender', se: 'Social y emocional', lang: 'Lenguaje y lectoescritura', cog: 'Pensamiento y matemáticas',
      pmp: 'Físico y motor', arts: 'Artes creativas', ss: 'Estudios sociales' },
  },
};
const L_ = (lang) => W[lang === 'es' ? 'es' : 'en'];
const dateText = (iso, lang = 'en') => (iso ? new Date(`${String(iso).slice(0, 10)}T12:00:00Z`).toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '');
export const yearLabel = (y) => `${y}-${String((Number(y) + 1) % 100).padStart(2, '0')}`;
// "2 of 2 (100%)": the child's own skill-check numbers, always beside a level word
export const numbersText = (p, m, lang = 'en') => (m > 0 ? (lang === 'es' ? `${p} de ${m} (${Math.round((100 * p) / m)} %)` : `${p} of ${m} (${Math.round((100 * p) / m)}%)`) : '');

// The local wall-clock time in a time zone -> an ISO instant (conference times are typed in the center's time).
export function zonedIso(ymd, hhmm, tz = 'America/Chicago') {
  const [y, mo, d] = ymd.split('-').map(Number); const [h, mi] = hhmm.split(':').map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    .formatToParts(new Date(guess)).filter((p) => p.type !== 'literal').map((p) => [p.type, Number(p.value)]));
  const asIf = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  return new Date(guess - (asIf - guess)).toISOString();
}
// n back-to-back conference times starting at hh:mm, each `minutes` long
export function slotStarts(ymd, hhmm, count, minutes, tz = 'America/Chicago') {
  const first = Date.parse(zonedIso(ymd, hhmm, tz));
  return Array.from({ length: Math.max(1, Math.min(Number(count) || 1, 30)) }, (_, i) => new Date(first + i * minutes * 60000).toISOString());
}

// The family's report (frozen content). The teacher's words stay as written; a second-language version, if the teacher wrote one, is
// one tap away (the family's language first). Level words for every step; the child's own numbers beside them; growth across this
// child's checkpoints only. Never another child, never an average.
export function reportHtml(esc, content, lang = 'en') {
  const l = lang === 'es' ? 'es' : 'en'; const L = L_(l);
  const key = content.levels_key || {};
  const word = (lv) => (lv && key[lv] ? (l === 'es' ? key[lv].es : key[lv].en) : '');
  const stepText = (s) => (l === 'es' ? (s.text_es || s.family_en || s.text_en) : (s.family_en || s.text_en));
  const words = (field) => {
    const own = content[field]; const alt = content.alt?.[field];
    if (!own) return '';
    const other = content.written_lang === 'es' ? 'en' : 'es';
    return flipText(esc, { [content.written_lang || 'en']: own, ...(alt ? { [other]: alt } : {}) }, l, { cls: 'cp-words' });
  };
  const upto = SEASONS.slice(0, SEASONS.indexOf(content.season) + 1);
  const byDomain = {};
  for (const s of content.steps || []) if (upto.some((x) => s.seasons?.[x]?.level || s.seasons?.[x]?.max)) (byDomain[s.domain] ||= []).push(s);
  const cell = (s, x) => { const v = s.seasons?.[x] || {}; return `<td>${v.level ? `<span class="chip cp-lvl cp-lvl-${esc(v.level)}">${esc(word(v.level))}</span>` : '<span class="muted">·</span>'}
    ${v.max > 0 ? `<span class="mini cp-num">${esc(L.checks)}: ${esc(numbersText(v.points, v.max, l))}</span>` : ''}</td>`; };
  const goal = (g) => `<li>${flipText(esc, { [content.written_lang || 'en']: g.text, ...(g.alt ? { [content.written_lang === 'es' ? 'en' : 'es']: g.alt } : {}) }, l)}</li>`;
  const idea = (a) => `<li><b>${esc((l === 'es' && a.title_es) || a.title)}</b><span class="small">${esc((l === 'es' && a.prompt_es) || a.prompt)}</span></li>`;
  const conf = content.conference;
  return `<header class="cp-brand"><span class="cp-mark" aria-hidden="true">FF</span><div><b class="cp-word">Futures Friends</b>
      <span class="small">${esc(content.center_name || '')}${content.room_name ? ` · ${esc(content.room_name)}` : ''}</span></div>
      <img class="cp-friends" src="img/friends/bop-waving-480.webp" alt="" width="64" height="64"></header>
    <h3 class="cp-title">${esc(L.report(L.season[content.season] || content.season))}: ${esc(content.first || '')} · ${esc(yearLabel(content.school_year))}</h3>
    ${conf ? `<p class="small">${esc(L.booked(l === 'es' ? conf.when_es : conf.when_en))}</p>` : ''}
    <section class="cp-sec"><h4>${esc(L.strengths)}</h4>${words('strengths')}</section>
    <section class="cp-sec"><h4>${esc(L.growing)}</h4>${words('growing')}</section>
    <section class="cp-sec"><h4>${esc(L.steps)}</h4>
      ${Object.entries(byDomain).map(([d, list]) => `<table class="cp-steps"><caption>${esc(L.domain[d] || d)}</caption>
        <thead><tr><th scope="col">${esc(L.growth)}</th>${upto.map((x) => `<th scope="col">${esc(L.season[x])}</th>`).join('')}</tr></thead>
        <tbody>${list.map((s) => `<tr><th scope="row">${esc(stepText(s))}</th>${upto.map((x) => cell(s, x)).join('')}</tr>`).join('')}</tbody></table>`).join('')}
      <p class="small muted cp-key">${['emerging', 'developing', 'secure', 'not_observed'].map((k) => key[k] ? `<b>${esc(word(k))}</b>: ${esc(l === 'es' ? key[k].es_words : key[k].en_words)}` : '').filter(Boolean).join(' · ')}</p></section>
    ${content.teacher_note ? `<section class="cp-sec"><h4>${esc(L.note)}</h4>${words('teacher_note')}</section>` : ''}
    ${(content.goals || []).length ? `<section class="cp-sec"><h4>${esc(L.goals)}</h4><ul class="cp-goals">${content.goals.map(goal).join('')}</ul></section>` : ''}
    ${(content.home_ideas || []).length ? `<section class="cp-sec"><h4>${esc(L.ideas)}</h4><ul class="cp-ideas">${content.home_ideas.map(idea).join('')}</ul></section>` : ''}
    <p class="small muted cp-disclaimer">${esc(l === 'es' ? content.disclaimer_es : content.disclaimer_en)}</p>`;
}

export async function viewCheckpoints(ctx) {
  return ctx.c.role === 'family' ? viewFamily(ctx) : viewStaff(ctx);
}

// Print one report: everything else is hidden by checkpoints.css (@media print) while body.cp-print-mode is set.
function printReport(el) {
  document.querySelectorAll('.cp-printing').forEach((x) => x.classList.remove('cp-printing'));
  el.classList.add('cp-printing'); document.body.classList.add('cp-print-mode');
  const done = () => { document.body.classList.remove('cp-print-mode'); el.classList.remove('cp-printing'); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  window.print();
}

// ===========================================================================================================================
// Families
// ===========================================================================================================================
async function viewFamily(ctx) {
  const { c, shell, page, rpc, esc, friendly, lang, live } = ctx;
  const l = lang === 'es' ? 'es' : 'en'; const L = L_(l);
  page(shell('<p class="loading">…</p>'), L.title);
  let kids;
  try { kids = await rpc('kid_mode_kids', { p_center: c.center_id, p_room: null }); } catch (e) { return page(shell(`<div class="card"><p class="msg bad" role="alert">${esc(friendly(e))}</p></div>`), L.title); }
  if (!kids.length) return page(shell(`<div class="card"><h2>${esc(L.title)}</h2><p>${esc(L.none)}</p></div>`), L.title);
  const q = new URLSearchParams(location.search);
  const want = q.get('kid');
  const cur = kids.find((k) => k.kid === want) || kids[0];
  let reps, conf;
  try { [reps, conf] = await Promise.all([rpc('conference_reports_for_family', { p_center: c.center_id, p_kid: cur.kid }), rpc('conference_family', { p_center: c.center_id, p_kid: cur.kid })]); }
  catch (e) { return page(shell(`<div class="card"><p class="msg bad" role="alert">${esc(friendly(e))}</p></div>`), L.title); }
  const when = (x) => (l === 'es' ? x.when_es : x.when_en);
  page(shell(`<div class="cp-fam" id="familyCheckpoints">
    ${kids.length > 1 ? `<nav class="tabs" aria-label="${esc(L.kids)}">${kids.map((k) => `<a href="/c/${esc(c.slug)}/checkpoints?kid=${encodeURIComponent(k.kid)}" data-nav${k.kid === cur.kid ? ' aria-current="page"' : ''}>${esc(k.label)}</a>`).join('')}</nav>` : ''}
    <section class="card" id="cpConf"><h2>${esc(L.conf)}: ${esc(cur.label)}</h2>${l === 'es' ? `<p class="small"><span class="chip warn">${esc(L.draft)}</span></p>` : ''}
      ${conf.bookings.map((b) => `<div class="cp-booked" data-booking="${esc(b.id)}"><p><b>${esc(L.booked(when(b)))}</b> <span class="small">${esc(L.with(b.teacher || ''))} · ${esc(L.mode[b.mode] || b.mode)}${b.location ? ` · ${esc(b.location)}` : ''}</span></p>
        <button class="btn link small" type="button" data-cancel-booking="${esc(b.id)}">${esc(L.cancel)}</button></div>`).join('')}
      ${conf.slots.length ? `<h3>${esc(L.pick)}</h3><ul class="list cp-slots">${conf.slots.map((s) => `<li><span class="who"><b>${esc(when(s))}</b><span class="small muted">${esc(L.with(s.teacher || ''))} · ${esc(L.mode[s.mode] || s.mode)}${s.location ? ` · ${esc(s.location)}` : ''}</span></span>
        <button class="btn soft small" type="button" data-book="${esc(s.id)}">${esc(L.choose)}</button></li>`).join('')}</ul>` : (conf.bookings.length ? '' : `<p class="muted">${esc(L.noSlots)}</p>`)}
      <p class="small msg" id="cpConfMsg" role="status"></p></section>
    <section class="card" id="cpReports"><h2>${esc(L.title)}</h2>
      ${reps.length ? reps.map((r) => `<article class="cp-report" data-report="${esc(r.id)}">${reportHtml(esc, r.content, l)}
        <div class="cp-actions no-print"><button class="btn soft small" type="button" data-print="${esc(r.id)}">${esc(L.print)}</button></div>
        <form class="cp-respond no-print" data-respond="${esc(r.id)}" novalidate><h4>${esc(L.yourGoals)}</h4>
          ${r.mine ? `<p class="small ok">${esc(L.ackDone(dateText(r.mine.acknowledged_at, l)))}</p>` : ''}
          <label class="f"><span>${esc(L.famNote)}</span><textarea class="i" name="note" rows="2" maxlength="1500">${esc(r.mine?.family_note || '')}</textarea></label>
          <label class="f"><span>${esc(L.famGoals)}</span><textarea class="i" name="goals" rows="2" maxlength="1000">${esc(r.mine?.family_goals || '')}</textarea></label>
          <button class="btn navy small" type="submit">${esc(r.mine ? L.save : L.ack)}</button><span class="small msg" role="status"></span></form></article>`).join('')
        : `<p class="empty">${esc(L.none)}</p>`}</section></div>`), L.title);

  const again = () => viewFamily(ctx);
  // goal progress from the child's support plan, when the teacher chose to include it (special-education.js)
  import('./special-education.js').then((m) => document.querySelectorAll('#cpReports .cp-report[data-report]').forEach((a) => m.mountConferenceProgress(a, { reportId: a.dataset.report, rpc, esc, lang: l }))).catch(() => {});
  document.getElementById('cpConf').addEventListener('click', async (e) => {
    const m = document.getElementById('cpConfMsg');
    const b = e.target.closest('[data-book]'); const x = e.target.closest('[data-cancel-booking]');
    try {
      if (b) { await rpc('conference_book', { p_center: c.center_id, p_kid: cur.kid, p_slot: b.dataset.book }); live(L.conf); return again(); }
      if (x) { await rpc('conference_cancel', { p_booking: x.dataset.cancelBooking }); return again(); }
    } catch (err) { m.className = 'small msg bad'; m.textContent = friendly(err); }
  });
  document.getElementById('cpReports').addEventListener('click', (e) => {
    const p = e.target.closest('[data-print]'); if (p) printReport(p.closest('.cp-report'));
  });
  document.querySelectorAll('form[data-respond]').forEach((f) => f.addEventListener('submit', async (e) => {
    e.preventDefault(); const m = f.querySelector('.msg');
    try { await rpc('conference_report_respond', { p_report: f.dataset.respond, p_note: f.note.value || null, p_goals: f.goals.value || null }); m.className = 'small msg ok'; m.textContent = L.thanks; }
    catch (err) { m.className = 'small msg bad'; m.textContent = friendly(err); }
  }));
  if (want && !kids.some((k) => k.kid === want)) deepMiss('child', l);
  else if (q.get('report')) { const el = document.querySelector(`.cp-report[data-report="${cssValue(q.get('report'))}"]`); if (el) deepFocus(el); else deepMiss('report', l); }
  else if (q.get('booking')) { const el = document.querySelector(`.cp-booked[data-booking="${cssValue(q.get('booking'))}"]`); if (el) deepFocus(el); else deepFocus(document.getElementById('cpConf')); }
}

// A small card on the family dashboard when a conference time can be chosen or is booked (family-dashboard.js calls it).
export async function mountFamilyConferenceCard({ c, rpc, esc, lang, kid }) {
  if (!kid) return;
  const root = document.getElementById('familyDash'); if (!root || document.getElementById('fdConference')) return;
  const l = lang === 'es' ? 'es' : 'en'; const L = L_(l);
  let conf; try { conf = await rpc('conference_family', { p_center: c.center_id, p_kid: kid }); } catch (_) { return; }
  if (!conf.bookings.length && !conf.slots.length) return;
  const b = conf.bookings[0];
  const html = `<section class="card fd-conf" id="fdConference" aria-labelledby="fdConfH"><h2 id="fdConfH">${esc(L.conf)}</h2>
    <p>${b ? esc(L.booked(l === 'es' ? b.when_es : b.when_en)) : esc(L.pick)}</p>
    <a class="btn ${b ? 'soft' : 'gold'} small" href="/c/${esc(c.slug)}/checkpoints?kid=${encodeURIComponent(kid)}${b ? `&booking=${encodeURIComponent(b.id)}` : ''}" data-nav>${esc(b ? L.conf : L.pick)}</a></section>`;
  const after = document.getElementById('fdAttention') || root.firstElementChild;
  if (document.getElementById('fdConference')) return;
  if (after) after.insertAdjacentHTML('afterend', html); else root.insertAdjacentHTML('afterbegin', html);
}

// ===========================================================================================================================
// Staff
// ===========================================================================================================================
async function viewStaff(ctx) {
  const { c, shell, page, rpc, esc, friendly, client, live, go } = ctx;
  const gaps = mountPortalGaps({ esc, $: (s, r = document) => r.querySelector(s), $$: (s, r = document) => [...r.querySelectorAll(s)], rpc, live, friendly, client, localDay: () => '' });
  const T = 'Checkpoints';
  page(shell('<p class="loading">Opening checkpoints…</p>'), T, { english: true });
  const q = new URLSearchParams(location.search);
  let win, rooms, overview;
  try {
    [win, rooms, overview] = await Promise.all([
      rpc('checkpoint_windows_get', { p_center: c.center_id, p_year: /^\d{4}$/.test(q.get('year') || '') ? Number(q.get('year')) : null }),
      client().from('rooms').select('id, data').eq('center_id', c.center_id).order('id').then((r) => r.data || []),
      rpc('standards_overview', {}).catch(() => ({ elof_domains: [] })),
    ]);
  } catch (e) { return page(shell(`<div class="card"><p class="msg bad" role="alert">${esc(friendly(e))}</p></div>`), T, { english: true }); }
  const year = win.school_year;
  const season = SEASONS.includes(q.get('season')) ? q.get('season') : (win.current_season || 'fall');
  const room = rooms.find((r) => r.id === q.get('room'))?.id || rooms[0]?.id;
  const elof = q.get('elof') || '';
  const url = (extra = {}) => `/c/${c.slug}/checkpoints?${new URLSearchParams(Object.fromEntries(Object.entries({ year, season, room, elof, ...extra }).filter(([, v]) => v != null && v !== '')))}`;
  if (!room) return page(shell('<div class="card"><h2>Checkpoints</h2><p>No rooms yet.</p></div>'), T, { english: true });
  let list, slots, done = null;
  try {
    [list, slots, done] = await Promise.all([
      rpc('checkpoint_room', { p_center: c.center_id, p_room: room, p_year: year, p_season: season }),
      rpc('conference_slots_staff', { p_center: c.center_id, p_room: room, p_days: 180 }),
      win.director ? rpc('checkpoint_completion', { p_center: c.center_id, p_year: year, p_season: season }) : Promise.resolve(null),
    ]);
  } catch (e) { return page(shell(`<div class="card"><p class="msg bad" role="alert">${esc(friendly(e))}</p></div>`), T, { english: true }); }
  const w = (s) => win.windows.find((x) => x.season === s) || {};
  const cw = w(season);
  const L = W.en;

  page(shell(`<div class="cp-staff" id="checkpointsPage">
    <div class="card cp-head"><h2>Checkpoints &amp; conferences · ${esc(yearLabel(year))}</h2>
      <p class="muted">Three checkpoints a year. Record each child's Learning Steps in words (their own skill-check numbers appear beside them), write the conference report, release it to the family, and set conference times. Growth is shown only as each child's own movement from checkpoint to checkpoint, never against other children.</p>
      <nav class="tabs cp-seasons" aria-label="Checkpoint">${SEASONS.map((s) => `<a href="${esc(url({ season: s, kid: null }))}" data-nav${s === season ? ' aria-current="page"' : ''}>${esc(L.season[s])}
        <span class="mini">${w(s).opens_on ? `${esc(w(s).opens_on)} to ${esc(w(s).closes_on)}` : 'no window yet'}</span>${w(s).open ? ' <span class="chip ok mini">open</span>' : ''}</a>`).join('')}</nav>
      ${!cw.opens_on ? `<p class="msg warn">This checkpoint has no window yet. ${win.calendar_start ? 'The curriculum starts in another school year: ' : ''}${win.director ? 'set the curriculum start on Planning, or the dates below.' : 'Your director sets it.'}</p>` : `<p class="small muted">Window ${esc(cw.opens_on)} to ${esc(cw.closes_on)} (${cw.source === 'director' ? 'set by the director' : 'from the center calendar'}).</p>`}
    </div>
    ${win.director ? `<details class="card" id="cpWindows"><summary><b>Checkpoint windows (director)</b></summary>
      <p class="small muted">From the center calendar: the program's checkpoint weeks (review weeks 1, 3 and 5) with two school weeks before and one after, skipping closed days. Change any of them; clear the dates to go back to the calendar.</p>
      <form id="cpWinForm" novalidate>${SEASONS.map((s) => `<fieldset class="row three"><legend>${esc(L.season[s])}${w(s).suggested_opens ? ` <span class="mini muted">calendar: ${esc(w(s).suggested_opens)} to ${esc(w(s).suggested_closes)}</span>` : ''}</legend>
        <label class="f"><span>Opens</span><input class="i" type="date" name="${s}-opens" value="${esc(w(s).source === 'director' ? w(s).opens_on : '')}"></label>
        <label class="f"><span>Closes</span><input class="i" type="date" name="${s}-closes" value="${esc(w(s).source === 'director' ? w(s).closes_on : '')}"></label>
        <button class="btn soft small" type="button" data-savewin="${s}">Save ${esc(L.season[s].toLowerCase())}</button></fieldset>`).join('')}
        <p class="small msg" id="cpWinMsg" role="status"></p></form></details>
      <section class="card" id="cpCompletion"><h3>Completion: ${esc(L.season[season])} (counts only)</h3>
        <div class="km-scroll" tabindex="0" role="region" aria-label="Checkpoint completion per room"><table class="km-table"><thead><tr><th scope="col">Room</th><th scope="col">Children</th><th scope="col">Started</th><th scope="col">All steps recorded</th><th scope="col">Report draft</th><th scope="col">Released</th><th scope="col">Family read it</th><th scope="col">Conference booked</th></tr></thead>
        <tbody>${done.rooms.map((r) => `<tr data-room="${esc(r.room)}"><th scope="row">${esc(r.name)}</th><td>${r.children}</td><td>${r.started}</td><td>${r.complete}</td><td>${r.drafts}</td><td>${r.released}</td><td>${r.acknowledged}</td><td>${r.booked}</td></tr>`).join('')}</tbody></table></div>
        <p class="small muted">How far each room is with this checkpoint. No levels, scores or children are shown here.</p></section>` : ''}
    <form class="card cp-controls" id="cpFilter" novalidate>
      <label class="f"><span>Room</span><select class="i" id="cpRoom">${rooms.map((r) => `<option value="${esc(r.id)}"${r.id === room ? ' selected' : ''}>${esc(r.data?.name || r.id)}</option>`).join('')}</select></label>
      <label class="f"><span>Head Start ELOF domain</span><select class="i" id="cpElof"><option value="">All Learning Steps</option>${(overview.elof_domains || []).map((d) => `<option value="${esc(d.domain)}"${d.domain === elof ? ' selected' : ''}>${esc(d.domain)}</option>`).join('')}</select></label>
      <button class="btn navy" type="submit">Show</button>
      <p class="small muted">The ELOF filter uses the standards crosswalk (draft until a named reviewer approves each row).</p></form>
    <section class="card" id="cpRoomList"><h3>${esc(L.season[season])} checklist</h3>
      ${list.children.length ? `<ul class="list">${list.children.map((k) => `<li data-kid="${esc(k.kid)}"><span class="who"><b>${esc(k.name)}</b>
        <span class="small muted">${esc(k.band || 'age not on file')} · ${k.recorded} of ${k.steps} steps recorded${k.booking ? ` · conference ${esc(k.booking.when)}` : ''}</span></span>
        ${k.report ? `<span class="chip ${k.report.status === 'released' ? 'ok' : 'warn'}">${k.report.status === 'released' ? 'Released' : 'Draft'}</span>` : ''}
        <button class="btn soft small" type="button" data-open="${esc(k.kid)}">Open</button></li>`).join('')}</ul>` : '<p class="empty">No children in this room.</p>'}</section>
    ${exportCardHtml(esc, { seasonLabel: L.season[season], roomName: rooms.find((r) => r.id === room)?.data?.name || room, director: !!win.director })}
    <section class="card" id="cpChild" hidden></section>
    <section class="card" id="cpSlots"><h3>Conference times</h3>
      <form id="cpSlotForm" class="cp-slotform" novalidate><div class="row three">
        <label class="f"><span>Day</span><input class="i" type="date" id="slDay" value="${esc(cw.opens_on && cw.opens_on > win.today ? cw.opens_on : win.today)}"></label>
        <label class="f"><span>First time</span><input class="i" type="time" id="slTime" value="15:30"></label>
        <label class="f"><span>How many</span><input class="i" type="number" id="slCount" min="1" max="30" value="4"></label></div>
        <div class="row three"><label class="f"><span>Minutes each</span><input class="i" type="number" id="slMin" min="10" max="90" value="20"></label>
        <label class="f"><span>How</span><select class="i" id="slMode"><option value="in_person">In person</option><option value="phone">Phone</option><option value="video">Video</option></select></label>
        <label class="f"><span>Where (optional)</span><input class="i" id="slWhere" maxlength="300"></label></div>
        <p class="small muted">Times are in the center's time zone (${esc(win.tz || '')}) and go inside a checkpoint window (or up to 3 weeks after). Families of this room pick one on their dashboard; both of you get a reminder the day before.</p>
        <p class="small msg" id="slMsg" role="status"></p><button class="btn navy" type="submit">Add times</button></form>
      ${slots.length ? `<ul class="list" id="cpSlotList">${slots.map((s) => `<li data-slot="${esc(s.id)}"><span class="who"><b>${esc(s.when)}</b>
        <span class="small muted">${esc(s.teacher || '')} · ${esc(L.mode[s.mode])}${s.location ? ` · ${esc(s.location)}` : ''} · ${esc(L.season[s.season])}${s.room ? '' : ' · any room'}</span>
        ${s.booking ? `<span class="small">Booked: <b>${esc(s.booking.name)}</b> (${s.booking.by === 'family' ? 'by the family' : 'by staff'})</span>` : ''}</span>
        ${s.booking ? '' : `<label class="sr-only" for="bk-${esc(s.id)}">Book for</label><select class="i small" id="bk-${esc(s.id)}" data-bookfor="${esc(s.id)}"><option value="">Book for…</option>${list.children.map((k) => `<option value="${esc(k.kid)}">${esc(k.name)}</option>`).join('')}</select>`}
        <button class="btn link small" type="button" data-cancelslot="${esc(s.id)}">Remove time</button></li>`).join('')}</ul>` : '<p class="empty">No conference times yet.</p>'}</section>
  </div>`), T, { english: true });

  document.getElementById('cpFilter').addEventListener('submit', (e) => { e.preventDefault(); go(url({ room: document.getElementById('cpRoom').value, elof: document.getElementById('cpElof').value })); });
  document.getElementById('cpRoom').addEventListener('change', (e) => go(url({ room: e.target.value })));
  const again = (extra = {}) => go(url(extra), true);
  const wf = document.getElementById('cpWinForm');
  if (wf) wf.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-savewin]'); if (!b) return;
    const s = b.dataset.savewin; const m = document.getElementById('cpWinMsg');
    try { await rpc('checkpoint_window_save', { p_center: c.center_id, p_year: year, p_season: s, p_opens: wf[`${s}-opens`].value || null, p_closes: wf[`${s}-closes`].value || null }); live('Window saved'); again(); }
    catch (err) { m.className = 'small msg bad'; m.textContent = friendly(err); }
  });
  bindExport({ rpc, c, year, season, room, live, friendly });
  document.getElementById('cpRoomList').addEventListener('click', (e) => { const b = e.target.closest('[data-open]'); if (b) openChild(b.dataset.open); });

  // conference times
  document.getElementById('cpSlotForm').addEventListener('submit', async (e) => {
    e.preventDefault(); const m = document.getElementById('slMsg');
    const day = document.getElementById('slDay').value; const t = document.getElementById('slTime').value; const min = Number(document.getElementById('slMin').value || 20);
    if (!day || !t) { m.className = 'small msg bad'; m.textContent = 'Choose a day and a first time.'; return; }
    try {
      const r = await rpc('conference_slots_add', { p_center: c.center_id, p_room: room, p_starts: slotStarts(day, t, document.getElementById('slCount').value, min, win.tz || 'America/Chicago'), p_minutes: min,
        p_mode: document.getElementById('slMode').value, p_location: document.getElementById('slWhere').value || null });
      live(`${r.added} time${r.added === 1 ? '' : 's'} added`); again();
    } catch (err) { m.className = 'small msg bad'; m.textContent = friendly(err); }
  });
  const sl = document.getElementById('cpSlotList');
  if (sl) {
    sl.addEventListener('click', async (e) => { const b = e.target.closest('[data-cancelslot]'); if (!b) return; if (!confirm('Remove this time? A family booked on it is told.')) return; try { await rpc('conference_slot_cancel', { p_slot: b.dataset.cancelslot }); again(); } catch (err) { live(friendly(err)); } });
    sl.addEventListener('change', async (e) => { const s = e.target.closest('[data-bookfor]'); if (!s || !s.value) return; try { await rpc('conference_book', { p_center: c.center_id, p_kid: s.value, p_slot: s.dataset.bookfor }); live('Booked'); again(); } catch (err) { live(friendly(err)); } });
  }

  async function openChild(kid) {
    const box = document.getElementById('cpChild');
    let d, p, band;
    try { [d, p, band] = await Promise.all([rpc('checkpoint_child', { p_center: c.center_id, p_kid: kid, p_year: year, p_elof: elof || null }), rpc('conference_report_preview', { p_center: c.center_id, p_kid: kid, p_year: year, p_season: season }),
      rpc('checkpoint_band_info', { p_center: c.center_id, p_kid: kid }).catch(() => null)]); }
    catch (err) { return live(friendly(err)); }
    const rep = p.report || {}; const released = rep.status === 'released';
    const locked = released || !cw.opens_on || win.today < cw.opens_on;
    const key = d.levels_key;
    const cell = (s, x) => { const v = s.seasons?.[x] || {}; return `${v.level ? `<span class="chip cp-lvl cp-lvl-${esc(v.level)}">${esc(key[v.level].en)}</span>` : '<span class="muted">·</span>'}${v.max > 0 ? `<span class="mini cp-num">${esc(numbersText(v.points, v.max))}</span>` : ''}`; };
    const byDomain = {}; for (const s of d.steps) (byDomain[s.domain] ||= []).push(s);
    const ideas = new Set(rep.home_ideas || []);
    const goals = [...(rep.goals || []), {}, {}, {}].slice(0, 3);
    box.hidden = false;
    box.innerHTML = `<h3>${esc(d.first)} · ${esc(L.season[season])} ${esc(yearLabel(year))}${elof ? ` <span class="chip">${esc(elof)}</span>` : ''}${released ? ' <span class="chip ok">Released</span>' : ''}</h3>
      ${band ? gaps.bandCardHtml(band) : ''}
      <p class="small muted">Levels in words for every domain (choose "Not yet observed" when you have not seen it; it is not a score). Numbers are this child's own skill checks in each window. ${locked && !released ? 'This checkpoint is not open yet.' : ''}${released ? 'Released: this checkpoint is locked.' : ''}</p>
      ${Object.entries(byDomain).map(([dom, list]) => `<div class="km-scroll" tabindex="0" role="region" aria-label="${esc(L.domain[dom] || dom)}"><table class="km-table cp-check"><caption>${esc(L.domain[dom] || dom)}</caption>
        <thead><tr><th scope="col">Learning Step</th>${SEASONS.map((x) => `<th scope="col">${esc(L.season[x])}</th>`).join('')}<th scope="col">${esc(L.season[season])}: level and note</th></tr></thead><tbody>
        ${list.map((s) => `<tr data-step="${esc(s.step)}"><th scope="row">${esc(s.text_en)}${(s.elof || []).length ? `<span class="mini muted cp-elof">${(s.elof || []).map((x) => `ELOF ${esc(x.code)}${x.status === 'approved' ? '' : ' (draft)'}`).join(', ')}</span>` : ''}</th>
          ${SEASONS.map((x) => `<td>${cell(s, x)}</td>`).join('')}
          <td><label class="sr-only" for="lv-${esc(s.step)}">Level for ${esc(s.text_en)}</label><select class="i cp-level" id="lv-${esc(s.step)}" data-step="${esc(s.step)}"${locked ? ' disabled' : ''}><option value="">—</option>${LEVELS.map((v) => `<option value="${v}"${s.seasons?.[season]?.level === v ? ' selected' : ''}>${esc(key[v].en)}</option>`).join('')}</select>
            <label class="sr-only" for="nt-${esc(s.step)}">Note</label><input class="i small cp-note" id="nt-${esc(s.step)}" data-note="${esc(s.step)}" maxlength="500" placeholder="What you saw (optional)" value="${esc(s.seasons?.[season]?.note || '')}"${locked ? ' disabled' : ''}></td></tr>`).join('')}
        </tbody></table></div>`).join('') || '<p class="empty">No Learning Steps for this filter.</p>'}
      <p class="small msg" id="cpObsMsg" role="status"></p>
      <form id="cpReportForm" class="cp-composer" novalidate><h4>${esc(L.report(L.season[season]))}</h4>
        <p class="small muted">Families speak: ${esc((p.family_languages || []).map((x) => (x === 'es' ? 'Spanish' : 'English')).join(', ') || 'English')}. Write in your language; add the other language if you can (optional). Your words are shown as you wrote them.</p>
        <label class="f"><span>I am writing in</span><select class="i" name="written_lang"${released ? ' disabled' : ''}><option value="en"${rep.written_lang !== 'es' ? ' selected' : ''}>English</option><option value="es"${rep.written_lang === 'es' ? ' selected' : ''}>Spanish</option></select></label>
        ${['strengths', 'growing', 'teacher_note'].map((f) => `<label class="f"><span>${esc({ strengths: 'Strengths (what this child does well)', growing: 'Growing next', teacher_note: 'Teacher note (optional)' }[f])}</span><textarea class="i" name="${f}" rows="3" maxlength="1500"${released ? ' disabled' : ''}>${esc(rep[f] || '')}</textarea></label>
          <details class="cp-alt"${rep.alt?.[f] ? ' open' : ''}><summary class="small">Second-language version (optional)</summary><textarea class="i" name="alt_${f}" rows="2" maxlength="1500"${released ? ' disabled' : ''}>${esc(rep.alt?.[f] || '')}</textarea></details>`).join('')}
        <fieldset class="f"><legend>Shared goals (up to 3)</legend>${goals.map((g, i) => `<div class="row two"><input class="i" name="goal${i}" maxlength="300" placeholder="Goal ${i + 1}" value="${esc(g.text || '')}"${released ? ' disabled' : ''}>
          <input class="i" name="goalalt${i}" maxlength="300" placeholder="Other language (optional)" value="${esc(g.alt || '')}"${released ? ' disabled' : ''}></div>`).join('')}</fieldset>
        <fieldset class="f"><legend>Home ideas (up to 4, from the home-learning cards)</legend>
          ${(p.suggested_ideas || []).map((a) => `<label class="choice"><input type="checkbox" name="idea" value="${esc(a.id)}"${ideas.has(a.id) ? ' checked' : ''}${released ? ' disabled' : ''}><span><b>${esc(a.title)}</b><span class="small">${esc(a.prompt)}</span></span></label>`).join('') || '<p class="small muted">Record a few levels first: ideas follow what the child is growing in.</p>'}</fieldset>
        <p class="small msg" id="cpRepMsg" role="status"></p>
        ${released ? '' : `<div class="cta-row"><button class="btn soft" type="submit">Save draft</button><button class="btn link" type="button" id="cpPreview">Preview</button><button class="btn gold" type="button" id="cpRelease">Release to the family</button></div>`}
        ${(p.responses || []).length ? `<h4>From the family</h4><ul class="list small">${p.responses.map((r2) => `<li>Read ${esc(dateText(r2.acknowledged_at))}${r2.family_note ? ` · ${esc(r2.family_note)}` : ''}${r2.family_goals ? ` · Goals: ${esc(r2.family_goals)}` : ''}</li>`).join('')}</ul>` : ''}</form>
      <article class="cp-report cp-preview" id="cpPreviewBox"${released ? '' : ' hidden'}>${released ? reportHtml(esc, p.body, 'en') : ''}<div class="cta-row no-print"><button class="btn soft small" type="button" id="cpPrint">${esc(L.print)}</button></div></article>`;
    box.scrollIntoView({ block: 'nearest' });
    // support plan goals (special-education.js): the teacher may opt in to show goal progress in this report; nothing shows otherwise
    import('./special-education.js').then((m) => m.mountConferenceGoals(box, { c, kid, reportId: rep.id || null, released, rpc, esc, friendly })).catch(() => {});
    if (band) gaps.bindBand(box, c, kid, () => again({ kid }));
    const obsMsg = document.getElementById('cpObsMsg');
    const saveObs = async (step) => {
      const lv = box.querySelector(`select[data-step="${cssValue(step)}"]`).value; const nt = box.querySelector(`input[data-note="${cssValue(step)}"]`).value;
      try { await rpc('checkpoint_observe_set', { p_center: c.center_id, p_kid: kid, p_year: year, p_season: season, p_step: step, p_level: lv || null, p_note: nt || null }); obsMsg.className = 'small msg ok'; obsMsg.textContent = 'Saved'; }
      catch (err) { obsMsg.className = 'small msg bad'; obsMsg.textContent = friendly(err); }
    };
    box.querySelectorAll('select.cp-level').forEach((s) => s.addEventListener('change', () => saveObs(s.dataset.step)));
    box.querySelectorAll('input.cp-note').forEach((s) => s.addEventListener('change', () => { if (box.querySelector(`select[data-step="${cssValue(s.dataset.note)}"]`).value) saveObs(s.dataset.note); }));
    const pr = document.getElementById('cpPrint'); if (pr) pr.addEventListener('click', () => printReport(document.getElementById('cpPreviewBox')));
    if (released) return;
    const f = document.getElementById('cpReportForm'); const msg = document.getElementById('cpRepMsg');
    const body = () => ({ written_lang: f.written_lang.value, strengths: f.strengths.value, growing: f.growing.value, teacher_note: f.teacher_note.value,
      alt: { strengths: f.alt_strengths.value, growing: f.alt_growing.value, teacher_note: f.alt_teacher_note.value },
      goals: [0, 1, 2].map((i) => ({ text: f[`goal${i}`].value, alt: f[`goalalt${i}`].value })).filter((g) => g.text.trim()),
      home_ideas: [...f.querySelectorAll('input[name=idea]:checked')].map((x) => x.value) });
    const save = () => rpc('conference_report_save', { p_center: c.center_id, p_kid: kid, p_year: year, p_season: season, p: body() });
    f.addEventListener('submit', async (e) => { e.preventDefault(); try { await save(); msg.className = 'small msg ok'; msg.textContent = 'Draft saved'; } catch (err) { msg.className = 'small msg bad'; msg.textContent = friendly(err); } });
    document.getElementById('cpPreview').addEventListener('click', async () => {
      try { await save(); const p2 = await rpc('conference_report_preview', { p_center: c.center_id, p_kid: kid, p_year: year, p_season: season });
        const pv = document.getElementById('cpPreviewBox'); pv.hidden = false; pv.innerHTML = `${reportHtml(esc, p2.body, f.written_lang.value)}<div class="cta-row no-print"><button class="btn soft small" type="button" id="cpPrint2">${esc(L.print)}</button></div>`;
        document.getElementById('cpPrint2').addEventListener('click', () => printReport(pv)); pv.scrollIntoView({ block: 'nearest' }); }
      catch (err) { msg.className = 'small msg bad'; msg.textContent = friendly(err); }
    });
    document.getElementById('cpRelease').addEventListener('click', async () => {
      if (!confirm(`Release ${d.first}'s ${L.season[season].toLowerCase()} conference report to the family? It cannot be changed afterwards, and this checkpoint's levels are locked.`)) return;
      try { const r = await save(); const rel = await rpc('conference_report_release', { p_report: r.id }); live(`Released; ${rel.notified} guardian${rel.notified === 1 ? '' : 's'} notified`); again({ kid }); }
      catch (err) { msg.className = 'small msg bad'; msg.textContent = friendly(err); }
    });
  }
  // deep links: ?kid= opens the child (a family read the report), ?slot= highlights a conference time
  if (q.get('kid')) { if (list.children.some((k) => k.kid === q.get('kid'))) { await openChild(q.get('kid')); deepFocus(document.getElementById('cpChild')); } else deepMiss('child', 'en'); }
  else if (q.get('slot')) { const el = document.querySelector(`#cpSlotList li[data-slot="${cssValue(q.get('slot'))}"]`); if (el) deepFocus(el); else deepMiss('any', 'en'); }
}
