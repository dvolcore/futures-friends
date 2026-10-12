// Curriculum day view (directors and teachers). Mounted by app.js at /c/<slug>/curriculum.
// A day picker (D001-D180, R01-R25) and, for the chosen day, the lesson, the Eat the Rainbow menu and Bop's Daily Move together.
// Everything comes from /api/curriculum/* (curriculum-server.mjs), which checks the person's role in this center before sending any content.
// There is no school-year date mapping in the Hub yet, so the day is always chosen here (see content/move-180/WIRING.md).
// A Spanish reader gets the Spanish DRAFT (?lang=es, same staff-only routes), marked lang="es" with the draft badge; any line not yet
// translated stays English inside it.
import { uiLang } from './i18n.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ID = /^(?:D(?:00[1-9]|0[1-9]\d|1[0-7]\d|180)|R(?:0[1-9]|1\d|2[0-5]))$/;

async function api(ctx, path) {
  const s = await ctx.session();
  if (!s) throw new Error('Your sign-in has run out. Sign in again.');
  const r = await fetch(path, { headers: { Authorization: `Bearer ${s.access_token}`, 'X-Center': ctx.c.center_id }, cache: 'no-store' });
  let j = null; try { j = await r.json(); } catch { /* not json */ }
  if (!r.ok) throw new Error(j?.error || 'That did not work. Try again.');
  return j;
}

export async function viewCurriculum(ctx) {
  const { c, shell, page, live } = ctx;
  page(shell('<p class="loading">Opening the curriculum…</p>'), 'Curriculum', { english: true });
  let idx;
  const es = uiLang() === 'es', qs = es ? '?lang=es' : '';
  try { idx = await api(ctx, `/api/curriculum/index${qs}`); } catch (e) {
    return page(shell(`<div class="card"><h2>Curriculum</h2><p class="msg bad" role="alert">${esc(e.message)}</p></div>`), 'Curriculum', { english: true });
  }
  const all = [...idx.days, ...idx.review];
  const q = new URLSearchParams(location.search).get('day') || '';
  let cur = ID.test(q) ? q : 'D001';
  const opts = (list) => list.map((d) => `<option value="${esc(d.id)}">${esc(d.label)}</option>`).join('');
  page(shell(`<div class="cur" id="cur">
    <div class="cur-head"><div><h2>Curriculum</h2><p>Pick a day to see its lesson, its Eat the Rainbow menu and Bop's Daily Move together. For your program's educators only: please do not share these pages outside your program.</p></div>
      <span class="chip warn">Draft: not yet reviewed</span></div>
    <div class="cur-bar card" role="group" aria-label="Choose a day">
      <button type="button" class="btn soft small" id="curPrev">Previous day</button>
      <label for="curPick">Day</label>
      <select id="curPick"><optgroup label="Instruction days (D001-D180)">${opts(idx.days)}</optgroup><optgroup label="Review days (R01-R25)">${opts(idx.review)}</optgroup></select>
      <button type="button" class="btn soft small" id="curNext">Next day</button>
    </div>
    <p class="small muted">Today's date is not matched to a day yet: this Hub does not have your program's start date and closed days. Choose the day here.</p>
    <div id="curDay" aria-live="polite" tabindex="-1"></div></div>`), 'Curriculum', { english: true });
  const pick = document.getElementById('curPick'), host = document.getElementById('curDay');
  async function show(id) {
    cur = id; pick.value = id;
    const p = new URLSearchParams(location.search); p.set('day', id);
    history.replaceState(null, '', `${FFTest.pathname()}?${p}`);
    host.innerHTML = '<p class="loading">Opening the day…</p>';
    try {
      const d = await api(ctx, `/api/curriculum/day/${encodeURIComponent(id)}${qs}`);
      const L = d.lang === 'es' ? 'es' : 'en';
      host.innerHTML = `<h3 class="cur-title">${esc(d.id)}: <span lang="${L}">${esc(d.title)}</span></h3>
        <nav class="cur-jump small" aria-label="Sections of this day"><a href="#cur-lesson">Lesson</a> · <a href="#cur-menu">Menu</a> · <a href="#cur-move">Bop's Daily Move</a></nav>
        <div class="${L}-content" lang="${L}"><div id="cur-lesson">${d.sections.lesson}</div><div id="cur-menu">${d.sections.menu}</div><div id="cur-move">${d.sections.move}</div></div>`;
      live(`${d.id}: ${d.title}`);
    } catch (e) { host.innerHTML = `<p class="msg bad" role="alert">${esc(e.message)}</p>`; }
  }
  const step = (n) => { const i = all.findIndex((d) => d.id === cur) + n; if (all[i]) show(all[i].id); };
  pick.addEventListener('change', () => show(pick.value));
  document.getElementById('curPrev').addEventListener('click', () => step(-1));
  document.getElementById('curNext').addEventListener('click', () => step(1));
  await show(cur);
}
