// Resource Library page (directors and teachers) and the family's "Shared with you" list. Mounted by app.js at /c/<slug>/library.
// Data comes from /api/library/* (library-server.mjs): the catalog already cut to this person's role, signed file links, and "send".
// Permissions are decided by the database and the server; library-core.js (shared with the demo) only shapes what is shown.
import { localeOf, uiLang } from './i18n.js';   // the reader's own language for dates and times (en-US / es-US)
import { centerToday } from './center-time.js';
const Core = () => window.FFLibraryCore;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Spanish screens show each item's Spanish DRAFT (title_es / desc_es / sub_es, label_es / blurb_es for groups: content/library/es.json) with
// the Borrador badge; an item with no Spanish yet keeps its English, marked lang="en" with the EN badge.
const inEs = (o, f) => uiLang() === 'es' && !!o?.[`${f}_es`];
const tx = (o, f) => (inEs(o, f) ? o[`${f}_es`] : o?.[f] ?? '');
const langAttr = (o, f, cls = '') => (inEs(o, f) ? ` lang="es"${cls ? ` class="${cls}"` : ''}` : ` lang="en" class="${cls ? `${cls} ` : ''}en-content"`);
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

const ICON = {
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14"/></svg>',
  print: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 9V3h10v6M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"/><rect x="7" y="14" width="10" height="7" rx="1"/></svg>',
  send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 3 3 10.5l7 2.5 2.5 7L21 3z"/><path d="m10 13 4-4"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 5.5V21"/></svg>',
  film: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="m10 9 5 3-5 3z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
  doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
  image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m21 16-5-5-8 8"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg>',
};
const GLYPH = { pdf: 'doc', image: 'image', video: 'film', email: 'mail', link: 'link', text: 'doc', data: 'doc', captions: 'doc', recipe: 'book', colors: 'image' };
const STATUS_SYM = { ready: '✓', draft: '✎', review: '◐', soon: '○' };

let STATE = null;            // { ctx, data, items, f, shown, today, sends }
const PAGE_SIZE = 48;

function startKey(c) { return `ff-lib-start-${c.center_id}`; }
function getStart(c) { try { return localStorage.getItem(startKey(c)) || ''; } catch { return ''; } }
function setStart(c, v) { try { if (v) localStorage.setItem(startKey(c), v); else localStorage.removeItem(startKey(c)); } catch { /* private window */ } }
const todayIso = () => centerToday();   // the center's day

async function api(path, { method = 'GET', body, ctx } = {}) {
  const s = await ctx.session();
  if (!s) throw new Error('Your sign-in has run out. Sign in again.');
  const r = await fetch(path, { method, headers: { Authorization: `Bearer ${s.access_token}`, 'X-Center': ctx.c.center_id, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
  let j = null; try { j = await r.json(); } catch { /* not json */ }
  if (!r.ok) throw Object.assign(new Error(j?.error || 'That did not work. Try again.'), { status: r.status });
  return j;
}

// ---- the page ---------------------------------------------------------------------------------------------------------------------
export function libraryTile(c, count) {
  return `<a class="lib-tilebtn" href="/c/${esc(c.slug)}/library" data-nav id="libraryTile"><span class="ico">${ICON.book}</span>
    <span><b>Library</b><span>Everything we have made${count ? `: ${count} things` : ''}, ready to open, print and send to families.</span></span></a>`;
}

export async function viewLibrary(ctx) {
  const { c, shell, page, live } = ctx;
  const Cr = Core();
  page(shell('<p class="loading">Opening the library…</p>'), 'Library', { english: true });
  let data;
  try { data = await api('/api/library/catalog', { ctx }); } catch (e) {
    return page(shell(`<div class="card"><h2>Library</h2><p class="msg bad" role="alert">${esc(e.message)}</p></div>`), 'Library', { english: true });
  }
  const f = readUrl();
  STATE = { ctx, data, items: data.items, f, shown: PAGE_SIZE, today: null, byId: new Map(data.items.map((i) => [i.id, i])) };
  const start = getStart(c) || Cr.defaultStart(Cr.fromIso(todayIso()));
  STATE.start = start; STATE.custom = !!getStart(c);
  page(shell(`<div class="lib" id="lib">
    <div class="lib-head"><div><h2>Library</h2><p>Everything the program has made, in one place. ${data.items.length} items${data.role === 'director' ? '' : ' for teachers'}. Open, print, download, or send to families.</p></div>
      <span class="chip gold lib-role">${data.role === 'director' ? 'Director: sees and sends everything' : 'Teacher: sends what is made for families'}</span></div>
    ${data.email_on ? '' : '<div class="lib-note warn" id="emailOff" role="note">Sending turns on when email is connected. Until then, a send is saved and held, and you can copy a link or download the file to share.</div>'}
    <div class="lib-bar" id="libBar"></div>
    <div id="libToday"></div><div id="libNew"></div><div id="libResults" aria-live="polite"></div>
    <section id="libSends" class="lib-strip" aria-labelledby="libSendsH"><h3 id="libSendsH">Sent from the library</h3><div id="libSendsBody"><p class="small muted">Loading…</p></div></section>
  </div>`), 'Library', { english: true });
  drawBar(); drawToday(); drawNew(); drawResults();
  loadSends();
  if (f.item && STATE.byId.get(f.item)) openPreview(f.item);
  live(`${data.items.length} items`);
}

function readUrl() {
  const p = new URLSearchParams(location.search);
  return { q: p.get('q') || '', group: p.get('g') || '', age: p.get('age') || '', lang: p.get('lang') || '', status: p.get('status') || '', unit: p.get('unit') || '', week: p.get('week') || '', day: p.get('day') || '', item: p.get('item') || '' };
}
function writeUrl() {
  const f = STATE.f; const p = new URLSearchParams();
  for (const [k, v] of [['q', f.q], ['g', f.group], ['age', f.age], ['lang', f.lang], ['status', f.status], ['unit', f.unit], ['week', f.week], ['day', f.day]]) if (v) p.set(k, v);
  history.replaceState(null, '', `${FFTest.pathname()}${p.toString() ? `?${p}` : ''}`);
}
const anyFilter = () => { const f = STATE.f; return !!(f.q || f.group || f.age || f.lang || f.status || f.unit || f.week || f.day); };

function drawBar() {
  const { data, f } = STATE; const Cr = Core(); const counts = Cr.groupCounts(data.items, data.groups);
  const opt = (v, l, cur) => `<option value="${esc(v)}"${String(cur) === String(v) ? ' selected' : ''}>${esc(l)}</option>`;
  const units = [...new Set(data.items.map((i) => i.unit).filter(Boolean))].sort((a, b) => a - b);
  $('#libBar').innerHTML = `<label class="lib-search"><span class="sr-only">Search the library</span>${ICON.search}
      <input id="libQ" type="search" placeholder="Search: packet, day 9, menu, Spanish, zone signs…" value="${esc(f.q)}" autocomplete="off" enterkeyhint="search">
      <button type="button" class="x" id="libClear" aria-label="Clear search"${f.q ? '' : ' hidden'}>${ICON.x}</button></label>
    <div class="lib-groups" role="group" aria-label="Group">
      <button type="button" data-g="" aria-pressed="${!f.group}">All <b>${data.items.length}</b></button>
      ${data.groups.filter((g) => counts[g.key]).map((g) => `<button type="button" class="g-${g.key}" data-g="${g.key}" aria-pressed="${f.group === g.key}">${esc(tx(g, 'label'))} <b>${counts[g.key]}</b></button>`).join('')}</div>
    <button type="button" class="lib-btn lib-more" id="libMore" aria-expanded="false" aria-controls="libFilters">Filters</button>
    <div class="lib-filters" id="libFilters">
      <label>Age<select id="fAge">${opt('', 'Any age', f.age)}${opt('twos', 'Twos', f.age)}${opt('threes', 'Threes', f.age)}${opt('prek', 'Pre-K', f.age)}</select></label>
      <label>Language<select id="fLang">${opt('', 'English and Spanish', f.lang)}${opt('en', 'English', f.lang)}${opt('es', 'Spanish', f.lang)}</select></label>
      <label>Status<select id="fStatus">${opt('', 'Any status', f.status)}${Object.entries(data.statuses).map(([k, l]) => opt(k, l, f.status)).join('')}</select></label>
      <label>Unit<select id="fUnit">${opt('', 'Any unit', f.unit)}${units.map((u) => opt(u, `Unit ${u}`, f.unit)).join('')}</select></label>
      <label>Calendar week<input id="fWeek" type="number" min="1" max="41" inputmode="numeric" value="${esc(f.week)}" placeholder="1 to 41"></label>
      <label>Day<input id="fDay" type="number" min="1" max="180" inputmode="numeric" value="${esc(f.day)}" placeholder="1 to 180"></label>
      <button type="button" class="lib-btn" id="fReset"${anyFilter() ? '' : ' hidden'}>Clear all</button></div>`;
  const q = $('#libQ'); let t = null;
  q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { STATE.f.q = q.value.trim(); $('#libClear').hidden = !q.value; refresh(); }, 160); });
  $('#libClear').onclick = () => { q.value = ''; STATE.f.q = ''; $('#libClear').hidden = true; refresh(); q.focus(); };
  $$('#libBar .lib-groups button').forEach((b) => { b.onclick = () => { STATE.f.group = b.dataset.g; refresh(); }; });
  for (const [id, key] of [['fAge', 'age'], ['fLang', 'lang'], ['fStatus', 'status'], ['fUnit', 'unit'], ['fWeek', 'week'], ['fDay', 'day']]) $(`#${id}`).addEventListener('change', (e) => { STATE.f[key] = e.target.value; refresh(); });
  $('#fReset').onclick = () => { STATE.f = { q: '', group: '', age: '', lang: '', status: '', unit: '', week: '', day: '', item: '' }; drawBar(); refresh(); };
  $('#libMore').onclick = (e) => { const o = $('#libFilters').classList.toggle('is-open'); e.currentTarget.setAttribute('aria-expanded', String(o)); };
}
function refresh() {
  STATE.shown = PAGE_SIZE; writeUrl();
  $$('#libBar .lib-groups button').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.g || '') === (STATE.f.group || ''))));
  const r = $('#fReset'); if (r) r.hidden = !anyFilter();
  drawToday(); drawNew(); drawResults();
}

// ---- today and new --------------------------------------------------------------------------------------------------------------
function drawToday() {
  const host = $('#libToday'); if (!host) return;
  if (anyFilter()) { host.innerHTML = ''; return; }
  const { data, items, ctx } = STATE; const Cr = Core();
  const t = Cr.todayPlan(data, items, todayIso(), STATE.start);
  const mini = (it, label) => it ? `<button type="button" class="lib-mini" data-open="${esc(it.id)}">${it.thumb_url ? `<img src="${esc(it.thumb_url)}" alt="" loading="lazy">` : `<span class="ph"></span>`}<span><small>${esc(label)}</small><b${langAttr(it, 'title')}>${esc(tx(it, 'title'))}</b></span></button>`
    : `<div class="lib-mini off"><span class="ph"></span><span><small>${esc(label)}</small><b>${t.review ? 'No new one today' : 'Not made yet'}</b></span></div>`;
  host.innerHTML = `<section class="lib-today" aria-labelledby="libTodayH"><div><h3 id="libTodayH">Today</h3><p class="sub">${esc(t.label)}${t.position ? ` · counted from ${esc(Cr.fromIso(t.start).toLocaleDateString(localeOf(), { month: 'short', day: 'numeric' }))}. <button type="button" id="libStartBtn">Change start date</button>` : ` <button type="button" id="libStartBtn">Set the first day of school</button>`}</p></div>
    <div class="lib-start" id="libStart"><label for="libStartIn" class="small">First day of school</label><input id="libStartIn" type="date" value="${esc(STATE.start)}"><button type="button" class="lib-btn gold" id="libStartSave">Save</button>${STATE.custom ? '<button type="button" class="lib-btn" id="libStartReset">Use the default</button>' : ''}</div>
    <div class="lib-today-grid">${mini(t.packet, "Today's teacher packet")}${mini(t.menu, 'This week’s menu')}${mini(t.move, "Today's Bop move")}${t.family ? mini(t.family, 'Family letter this week') : ''}</div></section>`;
  $('#libStartBtn').onclick = () => $('#libStart').classList.toggle('is-open');
  $('#libStartSave')?.addEventListener('click', () => { const v = $('#libStartIn').value; if (v) { setStart(ctx.c, v); STATE.start = v; STATE.custom = true; drawToday(); } });
  $('#libStartReset')?.addEventListener('click', () => { setStart(ctx.c, ''); STATE.start = Cr.defaultStart(Cr.fromIso(todayIso())); STATE.custom = false; drawToday(); });
  $$('[data-open]', host).forEach((b) => { b.onclick = () => openPreview(b.dataset.open); });
}
function drawNew() {
  const host = $('#libNew'); if (!host) return;
  if (anyFilter()) { host.innerHTML = ''; return; }
  const nw = Core().newThisWeek(STATE.items, new Date(), 8);
  if (!nw.items.length) { host.innerHTML = ''; return; }
  host.innerHTML = `<section class="lib-strip" aria-labelledby="libNewH"><h3 id="libNewH">New this week <span>${nw.total} added in the last 7 days</span></h3><div class="lib-rail" role="list">${nw.items.map((i) => `<div role="listitem" class="g-${esc(i.group)}">${card(i)}</div>`).join('')}</div></section>`;
  wireCards(host);
}

// ---- results -----------------------------------------------------------------------------------------------------------------------
function drawResults() {
  const host = $('#libResults'); if (!host) return;
  const { data, items, f } = STATE; const Cr = Core();
  host.dataset.q = `${f.q}|${f.group}`;     // a hook for tests: the query these results answer
  if (!anyFilter()) {
    const counts = Cr.groupCounts(items, data.groups);
    host.innerHTML = `<h3 class="sr-only">Browse by group</h3><div class="lib-tiles">${data.groups.filter((g) => counts[g.key]).map((g) => `<button type="button" class="lib-tile g-${g.key}" data-g="${g.key}"><span class="n">${counts[g.key]}</span><b>${esc(tx(g, 'label'))}</b><span>${esc(tx(g, 'blurb'))}</span></button>`).join('')}</div>`;
    $$('.lib-tile', host).forEach((b) => { b.onclick = () => { STATE.f.group = b.dataset.g; refresh(); window.scrollTo({ top: 0 }); }; });
    return;
  }
  const hits = Cr.filterItems(items, f);
  if (!hits.length) {
    host.innerHTML = `<div class="lib-empty"><h3>Nothing matches that</h3><p class="muted">Try fewer words, or clear a filter. Things that are not made yet show as Coming soon, so check the status filter too.</p><button type="button" class="lib-btn primary" id="emptyReset">Clear all filters</button></div>`;
    $('#emptyReset').onclick = () => { STATE.f = { q: '', group: '', age: '', lang: '', status: '', unit: '', week: '', day: '', item: '' }; drawBar(); refresh(); };
    return;
  }
  const g = data.groups.find((x) => x.key === f.group);
  const shown = hits.slice(0, STATE.shown);
  const sections = f.group && !f.q ? Cr.bySub(shown) : [{ sub: '', items: shown }];
  host.innerHTML = `<div class="lib-sub"><h3>${g ? esc(tx(g, 'label')) : 'Results'}</h3><span>${hits.length} ${hits.length === 1 ? 'item' : 'items'}${g ? ` · ${esc(tx(g, 'blurb'))}` : ''}</span></div>` +
    sections.map((s) => `${s.sub ? `<div class="lib-sub"><h3>${esc(tx(s.items[0], 'sub'))}</h3><span>${s.items.length}</span></div>` : ''}<div class="lib-grid">${s.items.map((i) => `<div class="g-${esc(i.group)}">${card(i)}</div>`).join('')}</div>`).join('') +
    (hits.length > shown.length ? `<div class="lib-more-row"><button type="button" class="lib-btn primary" id="libShowMore">Show ${Math.min(PAGE_SIZE, hits.length - shown.length)} more of ${hits.length - shown.length} left</button></div>` : '');
  $('#libShowMore')?.addEventListener('click', () => { STATE.shown += PAGE_SIZE; drawResults(); });
  wireCards(host);
}

function chips(i) {
  const L = Core(); const out = [];
  out.push(`<span class="lib-chip ${esc(i.status)}"><span aria-hidden="true">${STATUS_SYM[i.status] || ''}</span>${esc(L.STATUS_LABEL[i.status])}</span>`);
  out.push(`<span class="lib-chip${i.lang !== 'en' ? ' es' : ''}">${esc(L.langLabel(i))}</span>`);
  if (i.draft_es || (inEs(i, 'title') && i.title_es !== i.title) || (inEs(i, 'desc') && i.desc_es !== i.desc)) out.push('<span class="lib-chip borrador" lang="es">Borrador</span>');
  out.push(`<span class="lib-chip">${esc(L.ageLabel(i))}</span>`);
  return out.join('');
}
function card(i) {
  const L = Core(); const soon = i.status === 'soon'; const can = i.available && !soon;
  const label = (t) => `${t}: ${tx(i, 'title')}`;
  const thumb = i.thumb_url ? `<img src="${esc(i.thumb_url)}" alt="" loading="lazy" decoding="async">` : `<span class="lib-glyph">${ICON[GLYPH[i.type] || 'doc']}</span>`;
  return `<article class="lib-card${soon ? ' is-soon' : ''}" data-id="${esc(i.id)}">
    <button type="button" class="lib-thumb" data-act="preview" aria-label="${esc(label('Preview'))}"${soon ? ' disabled tabindex="-1"' : ''}>${thumb}</button>
    <div class="lib-body"><h4 class="lib-title"><button type="button" data-act="preview"${soon ? ' disabled' : ''} lang="${inEs(i, 'title') ? 'es' : 'en'}">${esc(tx(i, 'title'))}</button></h4>
      <div class="lib-meta">${chips(i)}</div>
      <p${langAttr(i, 'desc', 'lib-desc')}>${esc(tx(i, 'desc'))}</p><span class="lib-file">${esc(tx(i, 'sub'))}${L.fileLabel(i) ? ` · ${esc(L.fileLabel(i))}` : ''}</span>
      <div class="lib-acts">${can ? `<button type="button" class="lib-btn primary" data-act="preview" aria-label="${esc(label('Preview'))}">${ICON.eye}<span>Preview</span></button>
        ${i.type === 'link' || i.inline && i.type !== 'email' && i.type !== 'text' ? '' : `<button type="button" class="lib-btn icon" data-act="download" aria-label="${esc(label('Download'))}" title="Download">${ICON.down}</button>`}
        ${i.type === 'pdf' || i.type === 'image' ? `<button type="button" class="lib-btn icon" data-act="print" aria-label="${esc(label('Print'))}" title="Print">${ICON.print}</button>` : ''}
        ${i.can_send ? `<button type="button" class="lib-btn gold" data-act="send" aria-label="${esc(label('Send to families'))}">${ICON.send}<span>Send</span></button>` : ''}`
        : `<span class="small muted">${soon ? 'Not made yet. It appears here the day it is built.' : 'File not on this machine yet.'}</span>`}</div></div></article>`;
}
function wireCards(root) {
  $$('.lib-card', root).forEach((el) => {
    const id = el.dataset.id;
    $$('[data-act]', el).forEach((b) => { b.onclick = (e) => { e.stopPropagation(); act(b.dataset.act, id, b); }; });
  });
}
function act(kind, id, btn) {
  const it = STATE.byId.get(id); if (!it) return;
  if (kind === 'preview') return openPreview(id);
  if (kind === 'send') return openSend(id);
  if (kind === 'download') return download(it, btn);
  if (kind === 'print') return printIt(it, btn);
}

// ---- opening files ----------------------------------------------------------------------------------------------------------------
async function openUrl(it, { lang = null, dl = false } = {}) {
  return api('/api/library/open', { method: 'POST', body: { item: it.id, lang, dl: dl ? 1 : 0 }, ctx: STATE.ctx });
}
async function download(it, btn) {
  const prev = btn?.getAttribute('aria-label'); try {
    const o = await openUrl(it, { dl: true });
    if (o.text != null) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([o.text], { type: 'text/plain' })); a.download = o.name || `${it.id}.txt`; document.body.appendChild(a); a.click(); a.remove(); }
    else { const a = document.createElement('a'); a.href = o.url; a.download = o.name; document.body.appendChild(a); a.click(); a.remove(); }
    STATE.ctx.live(`Downloading ${tx(it, 'title')}`);
  } catch (e) { STATE.ctx.live(e.message); toast(e.message, true); } finally { if (btn && prev) btn.setAttribute('aria-label', prev); }
}
async function printIt(it) {
  try {
    const o = await openUrl(it);
    const fr = document.createElement('iframe'); fr.className = 'sr-only'; fr.setAttribute('title', `Print ${tx(it, 'title')}`); fr.src = o.url;
    fr.onload = () => { try { fr.contentWindow.focus(); fr.contentWindow.print(); } catch { window.open(o.url, '_blank', 'noopener'); } setTimeout(() => fr.remove(), 60000); };
    document.body.appendChild(fr);
  } catch (e) { toast(e.message, true); }
}
function toast(msg, bad) {
  let t = $('#libToast'); if (!t) { t = document.createElement('div'); t.id = 'libToast'; t.className = 'sr-only'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = ''; setTimeout(() => { t.textContent = msg; }, 20);
  const n = $('#libNote'); if (n) { n.className = `lib-note ${bad ? 'bad' : 'ok'}`; n.textContent = msg; n.hidden = false; }
}

// ---- preview dialog -----------------------------------------------------------------------------------------------------------------
function dialog(id, title, bodyHtml, { two = false } = {}) {
  $(`#${id}`)?.remove();
  const d = document.createElement('dialog'); d.className = 'lib-dlg'; d.id = id; d.setAttribute('aria-labelledby', `${id}H`);
  d.innerHTML = `<div class="lib-dlg-top"><h3 id="${id}H">${esc(title)}</h3><button type="button" class="lib-btn" data-close aria-label="Close">${ICON.x}<span>Close</span></button></div><div class="lib-dlg-body${two ? ' two' : ''}">${bodyHtml}</div>`;
  document.body.appendChild(d);
  const opener = document.activeElement;
  $('[data-close]', d).onclick = () => d.close();
  d.addEventListener('close', () => { d.remove(); if (opener && opener.isConnected) { try { opener.focus(); } catch { /* gone */ } } });
  d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
  d.showModal();
  return d;
}
async function openPreview(id, lang = null) {
  const it = STATE.byId.get(id); if (!it) return;
  const L = Core(); const kind = L.previewKind(it);
  const side = `<div class="lib-side"><div class="lib-meta">${chips(it)}</div><p${langAttr(it, 'desc')}>${esc(tx(it, 'desc'))}</p>
    <dl><dt>Group</dt><dd>${esc(tx(STATE.data.groups.find((g) => g.key === it.group), 'label'))} · ${esc(tx(it, 'sub'))}</dd>${it.cal ? `<dt>Calendar</dt><dd>${esc(it.cal)}${it.unit ? ` · Unit ${it.unit}, day ${it.unit_day}` : ''}</dd>` : it.unit ? `<dt>Unit</dt><dd>Unit ${it.unit}</dd>` : ''}
      <dt>Ages</dt><dd>${esc(L.ageLabel(it))}</dd><dt>Language</dt><dd>${esc(L.langLabel(it))}${it.draft_es ? ' (Spanish is a draft until a native speaker reviews it)' : ''}</dd>${L.fileLabel(it) ? `<dt>File</dt><dd>${esc(L.fileLabel(it))}</dd>` : ''}</dl>
    <p class="lib-note" id="libNote" role="status" hidden></p>
    <div class="lib-acts"><button type="button" class="lib-btn" data-pa="download">${ICON.down}<span>Download</span></button>${it.type === 'pdf' || it.type === 'image' ? `<button type="button" class="lib-btn" data-pa="print">${ICON.print}<span>Print</span></button>` : ''}${it.can_send ? `<button type="button" class="lib-btn gold" data-pa="send">${ICON.send}<span>Send to families</span></button>` : ''}</div>
    ${!it.can_send && it.sendable ? `<p class="small muted">${esc(L.sendReason(it, STATE.data.role))}</p>` : ''}</div>`;
  const tabs = it.type === 'email' && it.variants?.length ? `<div class="lib-langtabs" role="group" aria-label="Language of this email"><button type="button" data-lang="en" aria-pressed="${lang !== 'es'}">English</button>${it.variants.map((v) => `<button type="button" data-lang="${esc(v)}" aria-pressed="${lang === v}">${v === 'es' ? 'Español (borrador)' : esc(v)}</button>`).join('')}</div>` : '';
  const d = dialog('libPreview', tx(it, 'title'), `<div>${tabs}<div class="lib-viewer" id="libViewer"><p class="muted">Opening…</p></div></div>${side}`, { two: true });
  $$('[data-pa]', d).forEach((b) => { b.onclick = () => { const a = b.dataset.pa; if (a === 'send') { d.close(); openSend(id); } else act(a, id, b); }; });
  $$('[data-lang]', d).forEach((b) => { b.onclick = () => { d.close(); openPreview(id, b.dataset.lang === 'en' ? null : b.dataset.lang); }; });
  const v = $('#libViewer', d);
  try {
    if (kind === 'colors') { v.innerHTML = `<div class="lib-swatches">${it.colors.map(([n, h]) => `<div class="lib-sw"><i class="sw-${esc(h.slice(1))}"></i><span><b>${esc(n)}</b><br>${esc(h)}</span></div>`).join('')}</div>`; $$('.lib-sw i', v).forEach((el, k) => el.style.setProperty('background', it.colors[k][1])); return; }
    if (kind === 'link') { const route = it.link?.route || it.link?.hub || it.link?.library; v.innerHTML = `<div class="lib-empty"><h3>This one opens elsewhere</h3><p class="muted">${it.link?.library ? 'It lives in the Spanish program group.' : it.link?.hub ? 'It opens in the Hub.' : `It opens on the Futures Friends website (${esc(route)}).`}</p>${it.link?.library ? `<button class="lib-btn primary" id="libGo">Show it in the library</button>` : ''}</div>`; $('#libGo')?.addEventListener('click', () => { d.close(); STATE.f = { q: '', group: '', age: '', lang: '', status: '', unit: '', week: '', day: '', item: '' }; STATE.f.q = it.link.library; drawBar(); refresh(); }); return; }
    if (kind === 'none') { v.innerHTML = `<div class="lib-empty"><h3>Not made yet</h3><p class="muted">This appears here the day it is built.</p></div>`; return; }
    const o = await openUrl(it, { lang });
    if (o.text != null) { v.innerHTML = `<pre>${esc(o.text)}</pre>`; return; }
    if (kind === 'pdf') v.innerHTML = `${it.thumb_url ? `<img class="lib-fallback" src="${esc(it.thumb_url)}" alt="">` : ''}<iframe src="${esc(o.url)}" title="${esc(tx(it, 'title'))}"></iframe><a class="lib-newtab" href="${esc(o.url)}" target="_blank" rel="noopener">Not showing? Open it in a new tab</a>`;
    else if (kind === 'email') v.innerHTML = `<iframe src="${esc(o.url)}" title="${esc(tx(it, 'title'))}" sandbox></iframe>`;
    else if (kind === 'image') v.innerHTML = `<img src="${esc(o.url)}" alt="${esc(tx(it, 'title'))}">`;
    else if (kind === 'video') {
      const tracks = await Promise.all((it.variants || []).map(async (l) => { try { return [l, (await openUrl(it, { lang: l })).url]; } catch { return null; } }));
      v.innerHTML = `<video controls playsinline preload="metadata" src="${esc(o.url)}">${tracks.filter(Boolean).map(([l, u], k) => `<track kind="captions" srclang="${esc(l)}" label="${l === 'es' ? 'Espa\u00f1ol' : 'English'}" src="${esc(u)}"${k === 0 ? ' default' : ''}>`).join('')}</video>${tracks.filter(Boolean).length ? '<p class="lib-newtab">Captions: English and Espa\u00f1ol (use the CC button)</p>' : ''}`;
    }
    else { const r = await fetch(o.url); const t = await r.text(); v.innerHTML = `<pre>${esc(t.slice(0, 200000))}${t.length > 200000 ? '\n\n(Download the file for the rest.)' : ''}</pre>`; }
  } catch (e) { v.innerHTML = `<div class="lib-empty"><h3>Could not open it</h3><p class="msg bad" role="alert">${esc(e.message)}</p></div>`; }
}

// ---- send dialog ---------------------------------------------------------------------------------------------------------------------
async function openSend(id) {
  const { ctx, data } = STATE; const it = STATE.byId.get(id); if (!it) return;
  let rooms = [], fam = [];
  try {
    const r = await ctx.client().from('rooms').select('id, data').eq('center_id', ctx.c.center_id).order('id');
    rooms = (r.data || []).map((x) => ({ id: x.id, name: (x.data && (x.data.name || x.data.title)) || x.id }));
    fam = (await api('/api/library/audience', { method: 'POST', body: { audience: { mode: 'all' }, lang_mode: 'preferred' }, ctx })).families;
  } catch (e) { toast(e.message, true); }
  const d = dialog('libSend', `Send: ${tx(it, 'title')}`, `<form class="lib-form" id="sendForm" novalidate>
    <div class="lib-meta">${chips(it)}</div>
    ${data.email_on ? '<p class="lib-note ok" role="note">Email is on. Families get an email with the file.</p>' : '<p class="lib-note warn" role="note">Sending turns on when email is connected. Save the send now and it is held; nothing goes out yet. You can copy a link or download the file to share in the meantime.</p>'}
    <fieldset><legend>Who gets it</legend><div class="choices">
      <label class="choice"><input type="radio" name="mode" value="classroom" checked><span><b>A classroom</b><span class="small muted">Every family with a child in the room</span></span></label>
      <label class="choice"><input type="radio" name="mode" value="families"><span><b>Chosen families</b><span class="small muted">Pick each family and their language</span></span></label>
      <label class="choice"><input type="radio" name="mode" value="all"><span><b>All families</b><span class="small muted">The whole center</span></span></label></div>
      <div id="modeClass" class="f"><label for="sendRoom"><span>Classroom</span></label><select class="i" id="sendRoom">${rooms.length ? rooms.map((r) => `<option value="${esc(r.id)}">${esc(r.name)}</option>`).join('') : '<option value="">No classrooms yet</option>'}</select></div>
      <div id="modeFam" hidden><div class="lib-pick" role="group" aria-label="Families">${fam.length ? fam.map((p) => `<label><input type="checkbox" name="fam" value="${esc(p.guardian_id)}"><span>${esc(p.full_name)}<small>${esc(p.kids)}</small></span>
        <select aria-label="Language for ${esc(p.full_name)}" data-lang-for="${esc(p.guardian_id)}"><option value=""${p.saved_lang === 'en' ? ' selected' : ''}>English (saved)</option><option value="es"${p.saved_lang === 'es' ? ' selected' : ''}>Español (borrador)</option></select></label>`).join('') : '<p class="empty">No family accounts yet. Invite families from the Invite families tab.</p>'}</div></div></fieldset>
    <fieldset><legend>Language</legend><div class="choices two">
      <label class="choice"><input type="radio" name="lang" value="preferred" checked><span><b>Each family’s saved language</b><span class="small muted">English unless they chose Spanish</span></span></label>
      <label class="choice"><input type="radio" name="lang" value="en"><span><b>English for everyone</b></span></label>
      <label class="choice"><input type="radio" name="lang" value="es"><span><b>Spanish for everyone</b><span class="small muted">A draft until a native speaker reviews it</span></span></label></div></fieldset>
    <label class="f"><span>A line to go with it <span class="hint">(optional)</span></span><textarea class="i" id="sendNote" rows="2" maxlength="500" placeholder="For example: this week’s letter, in case it got lost in the backpack"></textarea></label>
    <p class="lib-sum" id="sendSum" role="status" aria-live="polite">Choose who gets it.</p>
    <p class="lib-note" id="libNote" role="status" hidden></p>
    <div class="lib-acts"><button type="submit" class="lib-btn gold" id="sendGo">${ICON.send}<span>${data.email_on ? 'Send now' : 'Save the send (held)'}</span></button>
      <button type="button" class="lib-btn" id="sendCopy">${ICON.copy}<span>Copy link</span></button><button type="button" class="lib-btn" id="sendDl">${ICON.down}<span>Download to share</span></button></div></form>`);
  const form = $('#sendForm', d);
  const audience = () => { const mode = form.mode.value; return mode === 'classroom' ? { mode, room: $('#sendRoom', d).value } : mode === 'families' ? { mode, users: $$('input[name=fam]:checked', d).map((x) => x.value) } : { mode }; };
  const langs = () => { const o = {}; $$('[data-lang-for]', d).forEach((s) => { o[s.dataset.langFor] = s.value === 'es' ? 'es' : 'en'; }); return o; };
  let sumT = null;
  const sum = () => { clearTimeout(sumT); sumT = setTimeout(async () => {
    $('#modeClass', d).hidden = form.mode.value !== 'classroom'; $('#modeFam', d).hidden = form.mode.value !== 'families';
    $$('[data-lang-for]', d).forEach((s) => { s.disabled = form.lang.value !== 'preferred'; });
    const a = audience(); const el = $('#sendSum', d);
    if ((a.mode === 'classroom' && !a.room) || (a.mode === 'families' && !a.users.length)) { el.textContent = a.mode === 'families' ? 'Tick at least one family.' : 'Choose a classroom.'; return; }
    try {
      const r = await api('/api/library/audience', { method: 'POST', body: { audience: a, lang_mode: form.lang.value, langs: langs() }, ctx });
      const n = r.families.length, es = r.families.filter((x) => x.lang === 'es').length;
      el.textContent = n ? `${n} ${n === 1 ? 'family' : 'families'}: ${n - es} in English, ${es} in Spanish.` : 'No families in that choice yet.';
    } catch (e) { el.textContent = e.message; }
  }, 120); };
  form.addEventListener('change', sum); sum();
  $('#sendCopy', d).onclick = async () => {
    const link = it.family_facing ? `${location.origin}/c/${ctx.c.slug}/home?shared=${encodeURIComponent(it.id)}` : `${location.origin}/c/${ctx.c.slug}/library?item=${encodeURIComponent(it.id)}`;
    try { await navigator.clipboard.writeText(link); toast(it.family_facing ? 'Link copied. A family sees it on their home page once the send is saved for them.' : 'Link copied. Colleagues open it from their own sign-in.'); } catch { toast(`Copy this link: ${link}`); }
  };
  $('#sendDl', d).onclick = () => download(it);
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); const go = $('#sendGo', d); go.disabled = true;
    try {
      const r = await api('/api/library/send', { method: 'POST', body: { item: it.id, audience: audience(), lang_mode: form.lang.value, langs: langs(), note: $('#sendNote', d).value }, ctx });
      toast(r.state === 'queued' ? `Sent to ${r.recipients} ${r.recipients === 1 ? 'family' : 'families'}.` : `Saved for ${r.recipients} ${r.recipients === 1 ? 'family' : 'families'}. It is held until email is connected; nothing has gone out.`);
      loadSends(); setTimeout(() => { if (d.isConnected) d.close(); ctx.live(`Send saved for ${r.recipients}`); }, 1400);
    } catch (err) { go.disabled = false; toast(err.message, true); }
  });
}

async function loadSends() {
  const body = $('#libSendsBody'); if (!body) return;
  try {
    const { sends } = await api('/api/library/sends', { ctx: STATE.ctx });
    body.innerHTML = sends.length ? `<ul class="lib-sends">${sends.map((s) => `<li><b>${esc(s.item_title)}</b><small>${esc(s.audience_label)} · ${s.recipient_count} ${s.recipient_count === 1 ? 'family' : 'families'} · ${esc(s.lang_mode === 'preferred' ? 'saved languages' : s.lang_mode === 'es' ? 'Spanish' : 'English')} · ${esc(s.sent_by_name)} (${esc(s.sent_by_role)}) · ${esc(new Date(s.created_at).toLocaleString(localeOf(), { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }))}</small>
      <small>${s.sent ? `${s.sent} sent` : s.held ? `${s.held} held until email is connected` : 'Done'}</small></li>`).join('')}</ul>` : '<p class="empty">Nothing sent yet. Find something made for families and press Send.</p>';
  } catch (e) { body.innerHTML = `<p class="msg bad">${esc(e.message)}</p>`; }
}

// ---- the family's list ---------------------------------------------------------------------------------------------------------------
export async function renderShares(host, ctx) {
  try {
    const { shares } = await api('/api/library/shares', { ctx });
    if (!shares.length) { host.hidden = true; return; }
    host.hidden = false;
    host.innerHTML = `<h2>${esc(ctx.title || 'Shared with you')}</h2><ul class="lib-shared">${shares.map((s) => `<li><span><b lang="${uiLang() === 'es' && s.item_title_es ? 'es' : 'en'}">${esc(uiLang() === 'es' && s.item_title_es ? s.item_title_es : s.item_title)}</b>${s.note ? `<br><span class="small muted">${esc(s.note)}</span>` : ''}</span>
      <button type="button" class="btn navy small" data-share="${esc(s.item_id)}" data-lang="${esc(s.lang)}">${esc(ctx.open || 'Open')}</button></li>`).join('')}</ul>`;
    $$('[data-share]', host).forEach((b) => { b.onclick = async () => { try { const o = await api('/api/library/open', { method: 'POST', body: { item: b.dataset.share, lang: b.dataset.lang }, ctx }); if (o.url) { const a = document.createElement('a'); a.href = o.url; a.target = '_blank'; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove(); } } catch (e) { ctx.live(e.message); } }; });
  } catch { host.hidden = true; }
}
