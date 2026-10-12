// Staff dashboards (hub/STAFF_DASHBOARDS.md; migration 20261026950000_staff_dashboards.sql). Mounted by app.js:
//   teacher home  /c/<slug>/home?room=<id>   the classroom at a glance: header strip (room, date, clock pill), who is here + ratio, care
//                                             dots per child, "Log care", reports sent, today's plan (mark done inline), the to-do list
//                                             (each row opens the exact item), this week's skill checks (counts only), messages + announcements
//   director home (spine.js above it)         adds: attendance + ratio by room, reports by room, families, staff on duty + training, learning
//                                             counts, upcoming closures, the enrollment pipeline
//   director tabs                             grouped into a few labelled menus (every link stays in nav.tabs, so routes and tests hold)
// Honesty rule (from spine.js): a figure the Hub could not read shows "could not load" / "not connected", never 0. Learning is counts only:
// no score, no ranking, the children still to do a check are listed alphabetically. Staff views are English (like the rest of staff Hub).
// Pure helpers are exported for tests/staff-dashboard-unit.test.mjs; the views touch the DOM only when called.
import { localeOf, uiLang } from './i18n.js';   // the reader's own language for dates and times (en-US / es-US)
import { absenceChip, absenceListHtml, absenceSettingsHtml, bindAbsenceSettings } from './absence.js';   // families' absence reports (hub/ABSENCES.md)
import { planFor } from './plan-core.js';
import { centerMinutes, centerToday, centerTz } from './center-time.js';   // the center's day and clock (hub/TIME_ZONES.md)

const H = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const enc = encodeURIComponent;
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
export const ALERT_ICON = { allergy: '⚠', diet: '🍽', condition: '✚', behavior: '◐', developmental: '◆', custody: '⚖', other: '•' };
export const ALERT_WORD = { allergy: 'Allergy', diet: 'Diet', condition: 'Condition', behavior: 'Behavior plan', developmental: 'Development', custody: 'Custody / pickup', other: 'Other' };
const FEEL = { happy: 'Happy', calm: 'Calm', curious: 'Curious', energetic: 'Energetic', tired: 'Tired', wanted_comfort: 'Wanted comfort' };
const MEAL = { breakfast: 'Breakfast', am_snack: 'AM snack', lunch: 'Lunch', snack: 'Snack' };
const STATE = { here: ['ok', 'Here'], gone: ['', 'Gone home'], out: ['', 'Not here yet'], absent: ['warn', 'Absent'] };
const POTTY_DUE_MIN = 120;     // a diaper / potty check is "due" two hours after the last one logged (shown, never enforced)

// ---- deep links: ONE place that knows where each kind of item opens (hub/NOTIFICATIONS.md "Where a notification opens") -------------
// Returns null when this person's account has no page for it (allowed = the tabs app.js allows): the row then shows without a link.
export function dashLink(kind, id, { slug, allowed = null, room = null, kid = null, extra = {} } = {}) {
  const may = (tab) => !allowed || allowed.includes(tab);
  const q = (o) => { const p = new URLSearchParams(Object.entries(o).filter(([, v]) => v != null && v !== '')); const s = p.toString(); return s ? `?${s}` : ''; };
  const base = `/c/${slug}`;
  switch (kind) {
    case 'child': return may('child') ? `${base}/child/${enc(id)}` : null;
    case 'message': return may('chat') ? `${base}/chat${q({ kid, msg: id })}` : null;
    case 'thread': return may('chat') ? `${base}/chat${q({ kid: id })}` : null;
    case 'announcement': return may('chat') ? `${base}/chat${q({ a: id })}` : null;
    case 'observe': return may('grades') ? `${base}/grades${q({ room, item: id })}` : null;            // id = assignment:kid:item
    case 'flagged': return may('grades') ? `${base}/grades${q({ room, result: id })}` : null;
    case 'draft': return may('grades') ? `${base}/grades${q({ room, from: extra.from, to: extra.to, compose: kid })}` : null;
    case 'video': return may('videos') ? `${base}/videos${q({ d: id })}` : null;
    case 'upload': return may('learn') ? `${base}/learn${q({ room, upload: id })}` : null;
    case 'incident': return may('incident') ? `${base}/incident${q({ id })}` : null;
    case 'help': return may('help-desk') ? `${base}/help-desk${q({ t: id })}` : null;
    case 'consents': return may('consents') ? `${base}/consents` : null;
    case 'closure': return may('calendar') ? `${base}/calendar${q({ date: id })}` : null;
    case 'today': return may('today') ? `${base}/today${q({ room })}` : null;
    case 'plan': return may('plan') ? `${base}/plan${q({ room })}` : null;
    case 'grades': return may('grades') ? `${base}/grades${q({ room })}` : null;
    case 'chat': return may('chat') ? `${base}/chat` : null;
    case 'videos': return may('videos') ? `${base}/videos` : null;
    case 'enroll': return may('enroll') ? `${base}/enroll` : null;
    case 'timeclock': return may('timeclock') ? `${base}/timeclock` : null;
    case 'people': return may('people') ? `${base}/people` : null;
    case 'roster': return may('roster') ? `${base}/roster${q({ room })}` : null;
    // special education (special-education.js, hub/SPECIAL_EDUCATION.md): the child's plan page, opened on the item
    case 'sped-plan': return may('sped') ? `${base}/child/${enc(kid)}/plan${q({ plan: id })}` : null;
    case 'sped-meeting': return may('sped') ? `${base}/child/${enc(kid)}/plan${q({ meeting: id })}` : null;
    case 'sped-report': return may('sped') ? `${base}/child/${enc(kid)}/plan${q({ plan: id, s: 'reports' })}` : null;
    case 'sped-specialists': return may('sped') ? `${base}/child/${enc(kid)}/plan${q({ plan: id, s: 'specialists' })}` : null;
    case 'sped-docs': return may('sped') ? `${base}/child/${enc(kid)}/plan${q({ plan: id, s: 'docs' })}` : null;
    case 'sped-entry': return may('goal-entry') ? `${base}/goal-entry${q({ room })}` : null;
    default: return null;
  }
}

// ---- director tabs, grouped (owner: "24 tabs in one bar is heavy") ----------------------------------------------------------------
export const TAB_GROUPS = [
  ['classroom', 'Classroom', ['arrivals', 'meals', 'reports', 'program', 'rhythm', 'plan', 'curriculum', 'library', 'habits', 'work', 'learn', 'grades', 'checkpoints', 'adapt', 'plans']],
  ['families', 'Families', ['children', 'enroll', 'crm', 'messages', 'chat', 'videos', 'families', 'import', 'consents', 'help-desk', 'inbox']],
  ['staff', 'Staff', ['hiring', 'staff', 'permissions', 'recovery', 'timeclock', 'people']],
  ['center', 'Center', ['calendar', 'safety', 'compliance', 'health', 'licensing', 'kitchen', 'billing', 'settings', 'support']],
];
const TOP = ['home', 'today'];
// tabs: [[id, label]] in app.js order. Returns the groups in display order; a tab no group names goes to the last group.
export function groupTabs(tabs) {
  const known = new Set(TAB_GROUPS.flatMap(([, , ids]) => ids).concat(TOP));
  const top = TOP.map((id) => tabs.find(([t]) => t === id)).filter(Boolean);
  const groups = TAB_GROUPS.map(([key, label, ids]) => ({ key, label, tabs: ids.map((id) => tabs.find(([t]) => t === id)).filter(Boolean) }));
  const rest = tabs.filter(([t]) => !known.has(t));
  if (rest.length) groups[groups.length - 1].tabs.push(...rest);
  return { top, groups: groups.filter((g) => g.tabs.length) };
}
export function groupedNavHtml({ tabs, tab, slug, label }) {
  const { top, groups } = groupTabs(tabs);
  const a = ([t, l]) => `<a href="/c/${H(slug)}/${t}" data-nav${t === tab ? ' aria-current="page"' : ''}>${H(l)}</a>`;
  return `<nav class="tabs tabs-grouped" aria-label="${H(label)}" id="dirTabs">${top.map(a).join('')}${groups.map((g) => {
    const cur = g.tabs.find(([t]) => t === tab);
    return `<details class="tab-group${cur ? ' current' : ''}" data-group="${g.key}"><summary>${H(g.label)}${cur ? `<span class="tab-cur">: ${H(cur[1])}</span>` : ''}</summary>
      <div class="tab-menu">${g.tabs.map(a).join('')}</div></details>`; }).join('')}</nav>`;
}
// one menu open at a time; Escape or a click outside closes it; following a link closes it
let navBound = false;
export function bindGroupedNav() {
  if (navBound || typeof document === 'undefined') return;
  navBound = true;
  const all = () => [...document.querySelectorAll('#dirTabs details.tab-group')];
  document.addEventListener('toggle', (e) => { const d = e.target; if (d?.matches?.('details.tab-group') && d.open) all().forEach((x) => { if (x !== d) x.open = false; }); }, true);
  document.addEventListener('click', (e) => {
    const inside = e.target.closest?.('details.tab-group');
    all().forEach((x) => { if (x !== inside || e.target.closest?.('.tab-menu a')) x.open = false; });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const open = all().find((x) => x.open); if (!open) return;
    open.open = false; open.querySelector('summary')?.focus();
  });
}

// ---- small pure helpers ---------------------------------------------------------------------------------------------------------
export function sinceLabel(at, now = Date.now()) {
  const t = typeof at === 'number' ? at : Date.parse(at);
  if (!Number.isFinite(t)) return null;
  const m = Math.max(0, Math.round((now - t) / 60000));
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60), r = m % 60;
  if (h < 24) return `${h} h${r ? ` ${r} min` : ''} ago`;
  return `${Math.floor(h / 24)} d ago`;
}
const clock = (at) => { const t = typeof at === 'number' ? at : Date.parse(at); return Number.isFinite(t) ? new Date(t).toLocaleTimeString(localeOf(), { hour: 'numeric', minute: '2-digit', timeZone: centerTz() }) : ''; };
const dayLabel = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString(localeOf(), { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });

// Per child: the four care dots. tone: ok (done) | due (needs a look) | none (nothing yet) | rest (resting now)
export function careDots(k, now = Date.now()) {
  const here = k.state === 'here';
  const meals = (k.meals || []).map((m) => MEAL[m] || m);
  const sinceToilet = k.last_toilet_at ? (now - Date.parse(k.last_toilet_at)) / 60000 : null;
  return [
    { key: 'meal', label: 'Meal', tone: meals.length ? 'ok' : 'none', text: meals.length ? meals.join(', ') : 'none logged' },
    { key: 'rest', label: 'Rest', tone: k.resting_since ? 'rest' : k.rested ? 'ok' : 'none', text: k.resting_since ? `resting since ${clock(k.resting_since)}` : k.rested ? 'rested' : 'not yet' },
    { key: 'potty', label: 'Diaper / potty', tone: sinceToilet == null ? (here ? 'due' : 'none') : sinceToilet >= POTTY_DUE_MIN && here ? 'due' : 'ok',
      text: sinceToilet == null ? 'none logged' : sinceLabel(k.last_toilet_at, now) },
    { key: 'feel', label: 'Feeling', tone: k.feeling ? 'ok' : 'none', text: k.feeling ? (FEEL[k.feeling] || k.feeling) : 'not yet' },
  ];
}

// The to-do list: one row per waiting item, each with the most specific link this account has. Order: what a family is waiting on first.
export function todoRows(d, ctx) {
  const t = d.todo || {}, rows = [];
  const L = (kind, id, o = {}) => dashLink(kind, id, { ...ctx, ...o });
  for (const m of t.messages || []) rows.push({ kind: 'message', group: 'Messages', icon: '✉', text: `${m.first}'s family wrote`, sub: m.text || (m.files ? 'sent a file' : ''), when: m.at, href: L('message', m.id, { kid: m.kid }) });
  if ((t.messages_total || 0) > (t.messages || []).length) rows.push({ kind: 'message', group: 'Messages', icon: '✉', text: `${t.messages_total - t.messages.length} more unread`, href: L('chat') });
  for (const o of t.observe || []) rows.push({ kind: 'observe', group: 'Skill checks', icon: '◎', text: `Score by watching: ${o.first}`, sub: `${o.title} · closes ${o.closes_on}`, href: L('observe', `${o.assignment}:${o.kid}:${o.item}`, { room: d.room }) });
  if ((t.observe_total || 0) > (t.observe || []).length) rows.push({ kind: 'observe', group: 'Skill checks', icon: '◎', text: `${t.observe_total - t.observe.length} more to score by watching`, href: L('grades', null, { room: d.room }) });
  for (const f of t.flagged || []) rows.push({ kind: 'flagged', group: 'Skill checks', icon: '⚑', text: `Automatic grade to look at: ${f.first}`, href: L('flagged', f.id, { room: d.room }) });
  for (const p of t.drafts || []) rows.push({ kind: 'draft', group: 'Progress reports', icon: '✎', text: `Progress report in draft: ${p.first}`, sub: `${p.from} to ${p.to}`, href: L('draft', p.id, { room: d.room, kid: p.kid, extra: { from: p.from, to: p.to } }) });
  for (const v of t.videos || []) rows.push({ kind: 'video', group: 'Videos', icon: '▶', text: `Video waiting for a parent's OK: ${v.first}`, when: v.created_at, href: L('video', v.id) });
  for (const u of t.uploads || []) rows.push({ kind: 'upload', group: 'Home learning', icon: '♥', text: `${u.first}'s family shared a ${u.kind === 'video' ? 'video' : 'photo'}`, sub: 'React or comment', when: u.created_at, href: L('upload', u.id, { room: d.room }) });
  for (const i of t.incidents || []) rows.push({ kind: 'incident', group: 'Incidents', icon: '!', text: `Incident report to finish${i.first ? `: ${i.first}` : ''}`, sub: 'Family not marked as told yet', when: i.occurred_at, href: L('incident', i.id), urgent: true });
  for (const tr of t.training || []) rows.push({ kind: 'training', group: 'Your training', icon: '★', text: tr.title, sub: `${tr.overdue ? 'Overdue since' : 'Due'} ${tr.due_date}`, href: null, urgent: tr.overdue,
    note: 'Open it in Futures Training' });
  return rows;
}

// Skill-check completion for the week, in words (counts only)
export function learningSummary(l) {
  if (!l) return { tone: 'unavailable', text: 'Could not load.' };
  if (l.enabled === false) return { tone: 'nc', text: 'Skill checks are turned off for this center.' };
  if (!l.assignments) return { tone: 'none', text: 'No skill check is assigned to this room this week.' };
  return { tone: l.done === l.children ? 'ok' : 'some', text: `${l.done} of ${plural(l.children, 'child', 'children')} did this week's check`, done: l.done, of: l.children };
}

// The ratio in plain words (read-only; the database decides the rule). null result = no rule on file: "not connected", never "ok".
export function ratioWords(r) {
  if (!r) return { tone: 'nc', text: 'Ratio: not connected', sub: 'No state ratio rule on file for this center' };
  const res = r.result;
  if (!res) return { tone: 'nc', text: `${r.present ?? 0} here · ratio not connected`, sub: 'Set the state and license type, and the youngest age of the room' };
  if (res.status === 'empty') return { tone: 'ok', text: 'No children counted here yet', sub: res.row?.ratio ? `Ratio ${res.row.ratio}` : '' };
  if (res.status === 'no_rule') return { tone: 'nc', text: `${r.present ?? 0} here · no ratio rule`, sub: 'The cited rules have no table for this license type' };
  const need = res.required_staff;
  return { tone: res.status === 'over' ? 'bad' : 'ok', text: `${r.present ?? 0} here${res.row?.ratio ? ` · ratio ${res.row.ratio}` : ''}${need != null ? ` · ${plural(need, 'staff member', 'staff')} needed` : ''}`,
    sub: (res.warnings || [])[0] || '' };
}

// ---- the views ------------------------------------------------------------------------------------------------------------------
export function mountStaffDashboard({ esc, $, rpc, page, live, friendly, session }) {
  const ROOM_KEY = (c) => `ff-today-room:${c.center_id}`;       // shared with Today (today.js), so "Log care" opens the same room
  const getRoom = (c) => { try { const v = JSON.parse(localStorage.getItem(ROOM_KEY(c)) || 'null'); return typeof v === 'string' ? v : null; } catch { return null; } };
  const setRoom = (c, r) => { try { localStorage.setItem(ROOM_KEY(c), JSON.stringify(r)); } catch { /* private mode */ } };
  const link = (href, inner, cls = '') => (href ? `<a class="${cls}" href="${esc(href)}" data-nav>${inner}</a>` : `<span class="${cls}">${inner}</span>`);
  async function api(c, path) {
    const s = await session();
    if (!s) throw new Error('Your sign-in has run out. Sign in again.');
    // the curriculum's Spanish DRAFT for a Spanish reader (same staff-only routes; the block keys stay the same, so marks still match)
    if (uiLang() === 'es' && path.startsWith('/api/curriculum/')) path += `${path.includes('?') ? '&' : '?'}lang=es`;
    const r = await fetch(path, { headers: { Authorization: `Bearer ${s.access_token}`, 'X-Center': c.center_id }, cache: 'no-store' });
    let j = null; try { j = await r.json(); } catch { /* not json */ }
    if (!r.ok) throw new Error(j?.error || 'That did not work.');
    return j;
  }
  const skel = (n = 3) => `<div class="sd-skel" aria-hidden="true">${'<span></span>'.repeat(n)}</div>`;

  // ======================================================= teacher home
  async function viewTeacherHome(c, shell, opts) {
    const { clockCard, allowed, footer = '' } = opts;
    const want = new URLSearchParams(location.search).get('room') || getRoom(c);
    const today = new Date().toLocaleDateString(localeOf(), { weekday: 'long', month: 'long', day: 'numeric', timeZone: centerTz() });
    page(shell(`<div class="sd" id="staffDash" aria-busy="true">
      <section class="sd-head card" aria-label="Your day"><div class="sd-hl"><h2 class="sd-title">Your classroom</h2><p class="sd-date">${esc(today)}</p></div>
        <div class="sd-hr">${skel(2)}</div></section>
      <div class="sd-grid">${['Who is here', "Today's care", 'To do', "Today's plan"].map((t) => `<section class="card sd-card"><h2>${t}</h2>${skel(4)}</section>`).join('')}</div>
      <p class="sr-only" role="status">Loading your classroom…</p></div>`), c.name, { english: true });
    let d = null, err = null, clock = { html: '', bind() {} };
    try {
      [d, clock] = await Promise.all([
        rpc('staff_dashboard', { p_center: c.center_id, p_room: want }).catch((e) => (want ? rpc('staff_dashboard', { p_center: c.center_id, p_room: null }) : Promise.reject(e))),
        clockCard(c).catch(() => ({ html: '', bind() {} })),
      ]);
    } catch (e) { err = e; }
    if (!d) {
      page(shell(`<div class="sd" id="staffDash">${clock.html ? `<div class="sd-clock-full">${clock.html}</div>` : ''}<section class="card"><h2>Your classroom</h2>
        <p class="msg bad" role="alert">The classroom could not be loaded: ${esc(friendly(err))}. Reload the page; Today and the other tabs still work.</p></section></div>`), c.name, { english: true });
      return clock.bind();
    }
    if (d.room) { setRoom(c, d.room); const p = new URLSearchParams(location.search); if (p.get('room') !== d.room) { p.set('room', d.room); history.replaceState(null, '', `${FFTest.pathname()}?${p}`); } }
    const ctx = { slug: c.slug, allowed, room: d.room };
    page(shell(teacherHtml(c, d, ctx, clock.html, today) + footer), c.name, { english: true });
    clock.bind();
    bindTeacher(c, shell, d, ctx, opts);
    loadPlan(c, d, ctx);
    langChips(c);
  }
  // bilingual: a small ES / EN+ES chip on each child whose family speaks Spanish at home (kid_languages_list); never blocks the page
  async function langChips(c) {
    let rows = [];
    try { rows = (await rpc('kid_languages_list', { p_center: c.center_id })) || []; } catch (_) { return; }
    for (const x of rows) {
      if (!['es', 'both'].includes(x.home)) continue;
      const name = document.querySelector(`#sdKids li[data-kid="${CSS.escape(x.kid)}"] .sd-name`);
      if (name && !name.querySelector('.lang-chip')) name.insertAdjacentHTML('beforeend', ` <span class="lang-chip" translate="no" title="${x.home === 'es' ? 'Spanish at home' : 'English and Spanish at home'}">${x.home === 'es' ? 'ES' : 'EN+ES'}</span>`);
    }
  }

  function teacherHtml(c, d, ctx, clockHtml, today) {
    const rooms = d.rooms || [];
    const roomSel = rooms.length > 1 ? `<label class="sd-room"><span>Room</span><select class="i" id="sdRoom">${rooms.map((r) => `<option value="${esc(r.id)}"${r.id === d.room ? ' selected' : ''}>${esc(r.name)}</option>`).join('')}</select></label>`
      : `<span class="chip sd-roomchip">${esc(d.room_name || 'No room yet')}</span>`;
    const head = `<section class="sd-head card" aria-label="Your day"><div class="sd-hl"><h2 class="sd-title">${esc(d.room_name || 'Your classroom')}</h2><p class="sd-date">${esc(today)}</p></div>
      <div class="sd-hr">${roomSel}<div class="sd-clock" id="sdClock">${clockHtml || '<span class="chip">Time clock not on for you</span>'}</div></div></section>`;
    if (!d.room) return `<div class="sd" id="staffDash">${head}<section class="card"><p class="empty">No rooms yet. A director adds rooms in Center settings.</p></section></div>`;
    const kids = d.kids || [];
    const n = (st) => kids.filter((k) => k.state === st).length;
    const rw = ratioWords(d.ratio);
    const closures = (d.closures || []).slice(0, 3);
    const tile = (k) => {
      const [tone, word] = STATE[k.state] || ['', k.state];
      const types = k.alerts?.types || [];
      const alerts = types.length ? `<span class="sd-alerts sev-${esc(k.alerts.top || 'info')}" title="Care alerts: ${esc(types.map((x) => ALERT_WORD[x] || x).join(', '))}">${types.map((x) => `<span aria-hidden="true">${ALERT_ICON[x] || '•'}</span>`).join('')}${k.alerts.emergency_med ? '<span class="sd-med">Med</span>' : ''}<span class="sr-only">Care alerts: ${esc(types.map((x) => ALERT_WORD[x] || x).join(', '))}${k.alerts.emergency_med ? ', emergency medicine' : ''}</span></span>` : '';
      const stateChip = k.absence && k.state === 'absent' ? absenceChip(esc, k.absence) : `<span class="chip ${tone}">${esc(word)}</span>${k.absence ? absenceChip(esc, k.absence) : ''}`;
      return `<li data-kid="${esc(k.kid)}">${link(dashLink('child', k.kid, ctx), `<span class="sd-name">${esc(k.first)}${k.last_initial ? ` ${esc(k.last_initial)}` : ''}</span>${alerts}${stateChip}`, `sd-kid st-${esc(k.state)}`)}</li>`;
    };
    const order = ['here', 'out', 'absent', 'gone'];
    const sorted = [...kids].sort((a, b) => order.indexOf(a.state) - order.indexOf(b.state));
    const who = `<section class="card sd-card sd-who" id="sdWho" aria-labelledby="sdWhoH"><div class="sd-ch"><h2 id="sdWhoH">Who is here</h2>
        <span class="chip sd-ratio tone-${rw.tone}" id="sdRatio">${esc(rw.text)}</span></div>
      ${rw.sub ? `<p class="small muted">${esc(rw.sub)}</p>` : ''}
      <p class="sd-counts"><b>${n('here')}</b> here · <b>${n('out')}</b> not here yet · <b>${n('gone')}</b> gone home${n('absent') ? ` · <b>${n('absent')}</b> absent` : ''}</p>
      ${kids.length ? `<ul class="sd-kids" id="sdKids">${sorted.map(tile).join('')}</ul>` : '<p class="empty">No children in this room yet.</p>'}
      ${closures.length ? `<p class="small sd-closed">${closures.map((x) => link(dashLink('closure', x.day, ctx), `${esc(x.status === 'early' ? 'Early dismissal' : 'Closed')} ${esc(dayLabel(x.day))}: ${esc(x.label)}`)).join(' · ')}</p>` : ''}
      ${(d.absences || []).length ? absenceListHtml(esc, d.absences, { slug: c.slug, card: false }) : ''}</section>`;

    const careRows = kids.filter((k) => k.state === 'here' || (k.meals || []).length || k.rested || k.feeling).map((k) => `<li class="sd-care-row"><span class="sd-cname">${esc(k.first)}</span>
      <span class="sd-dots">${careDots(k).map((x) => `<span class="sd-dot t-${x.tone}" title="${esc(`${x.label}: ${x.text}`)}"><i aria-hidden="true"></i><span class="sd-dl">${esc(x.label)}</span> <span class="sd-dv">${esc(x.text)}</span></span>`).join('')}</span></li>`).join('');
    const rep = d.reports || { published: 0, total: 0 };
    const care = `<section class="card sd-card sd-care" id="sdCare" aria-labelledby="sdCareH"><div class="sd-ch"><h2 id="sdCareH">Today's care</h2>
        ${link(dashLink('today', null, ctx), 'Log care', 'btn gold sd-log')}</div>
      ${careRows ? `<ul class="sd-carelist">${careRows}</ul>` : '<p class="empty">Nobody checked in yet. Care you log shows here.</p>'}
      <p class="sd-reports" id="sdReports"><span class="chip ${rep.total && rep.published === rep.total ? 'ok' : ''}">${rep.published} of ${rep.total} daily reports sent</span>
        <span class="small muted">Reports go to families automatically ${esc(rep.send_time || 'about 5:30 pm')}; anything logged before then is in them.</span></p></section>`;

    const rows = todoRows(d, ctx);
    const todo = `<section class="card sd-card sd-todo" id="sdTodo" aria-labelledby="sdTodoH"><div class="sd-ch"><h2 id="sdTodoH">To do</h2><span class="chip ${rows.length ? 'gold' : 'ok'}">${rows.length ? plural(rows.length, 'item') : 'All clear'}</span></div>
      ${d.todo?.review_ok === false ? '<p class="small msg warn">The skill-check review queue could not be loaded.</p>' : ''}
      ${rows.length ? `<ul class="sd-todos">${rows.map((r) => `<li class="${r.urgent ? 'urgent' : ''}" data-kind="${esc(r.kind)}">${link(r.href, `<span class="sd-ti" aria-hidden="true">${esc(r.icon)}</span><span class="sd-tt"><b>${esc(r.text)}</b>${r.sub ? `<span class="small muted">${esc(r.sub)}</span>` : ''}${!r.href && r.note ? `<span class="mini muted">${esc(r.note)}</span>` : ''}</span>${r.when ? `<span class="mini muted sd-tw">${esc(sinceLabel(r.when) || '')}</span>` : ''}`, 'sd-trow')}</li>`).join('')}</ul>`
        : '<p class="empty">Nothing is waiting on you. New family messages, checks to score, reports and uploads show up here.</p>'}</section>`;

    const plan = `<section class="card sd-card sd-plan" id="sdPlan" aria-labelledby="sdPlanH"><div class="sd-ch"><h2 id="sdPlanH">Today's plan</h2>${link(dashLink('plan', null, ctx), 'Planning', 'btn soft small')}</div>
      <div id="sdPlanBody">${skel(3)}</div></section>`;

    const ls = learningSummary(d.learning);
    const l = d.learning || {};
    const learn = `<section class="card sd-card sd-learn" id="sdLearn" aria-labelledby="sdLearnH"><div class="sd-ch"><h2 id="sdLearnH">Skill checks this week</h2>${link(dashLink('grades', null, ctx), 'Grades', 'btn soft small')}</div>
      <p class="sd-lsum t-${ls.tone}">${ls.of ? `<progress class="sd-meter" value="${ls.done}" max="${ls.of}" aria-label="${esc(ls.text)}"></progress>` : ''}<span>${esc(ls.text)}</span></p>
      ${l.assignments && (l.not_done || []).length ? `<p class="small"><b>Still to do:</b> ${l.not_done.map((k) => esc(k.first)).join(', ')}</p>` : ''}
      <p class="mini muted">Counts only. Children are never ranked or compared.</p></section>`;

    const recent = d.recent || [], anns = d.announcements || [];
    const msgs = `<section class="card sd-card sd-msgs" id="sdMsgs" aria-labelledby="sdMsgsH"><div class="sd-ch"><h2 id="sdMsgsH">Messages</h2>${link(dashLink('chat', null, ctx), 'Chat', 'btn soft small')}</div>
      ${recent.length ? `<ul class="sd-mlist">${recent.map((m) => `<li>${link(dashLink('message', m.id, { ...ctx, kid: m.kid }), `<b>${esc(m.first)}</b> <span class="small muted">${esc(m.from === 'family' ? 'family' : 'teacher')} · ${esc(sinceLabel(m.at) || '')}</span>${m.unread ? ' <span class="chip gold">New</span>' : ''}<span class="small sd-mt">${esc(m.text || 'a file')}</span>`, 'sd-mrow')}</li>`).join('')}</ul>` : '<p class="empty">No messages with this room\'s families yet.</p>'}
      <h3 class="sd-h3">Announcements</h3>
      ${anns.length ? `<ul class="sd-mlist">${anns.map((a) => `<li>${link(dashLink('announcement', a.id, ctx), `<b>${esc(a.title)}</b> <span class="small muted">${esc(a.room ? 'this room' : 'whole center')} · ${esc(sinceLabel(a.created_at) || '')}</span><span class="small sd-mt">${esc(a.body)}</span>`, 'sd-mrow')}</li>`).join('')}</ul>` : '<p class="empty">No announcements yet.</p>'}</section>`;

    // two independent columns from 768 px (no row-height holes); below that one column in priority order (CSS order on .sd-col children)
    return `<div class="sd" id="staffDash">${head}${who}<div class="sd-cols sd-teach"><div class="sd-col">${care}${plan}${learn}</div><div class="sd-col">${todo}${msgs}</div></div></div>`;
  }

  function bindTeacher(c, shell, d, ctx, opts) {
    const sel = $('#sdRoom');
    if (sel) sel.onchange = () => { setRoom(c, sel.value); history.replaceState(null, '', `${FFTest.pathname()}?room=${enc(sel.value)}`); viewTeacherHome(c, shell, opts).then(() => live(`Showing ${sel.options[sel.selectedIndex].text}`)); };
  }

  // Today's plan: the curriculum day for this room from the center calendar + pacing (plan-core.js), its activities, Done inline
  async function loadPlan(c, d, ctx) {
    const body = $('#sdPlanBody'); if (!body || !d.room) return;
    let st, seq;
    try { [st, seq] = await Promise.all([rpc('plan_settings_get', { p_center: c.center_id }), api(c, '/api/curriculum/sequence')]); }
    catch (e) { body.innerHTML = `<p class="small msg warn">The plan could not be loaded (${esc(friendly(e))}).</p>`; return; }
    const date = centerToday();
    const room = (st.rooms || []).find((r) => r.id === d.room) || {};
    const p = planFor(date, { start: st.calendar?.start_date || null, includeReview: st.calendar ? st.calendar.include_review : true,
      closed: [...(st.closed || []), ...(st.holidays || [])], offset: room.offset || 0 }, seq.days);
    const why = { weekend: 'No school today (weekend).', closed: `The center is closed today${p.label ? `: ${p.label}` : ''}.`, before_start: 'The curriculum has not started yet.',
      not_started: 'This room has not reached day 1 yet.', finished: 'The 180 days are finished.', no_calendar: 'No curriculum calendar yet: a director sets the start date on Planning.' };
    if (p.status !== 'ok') { body.innerHTML = `<p class="empty">${esc(why[p.status] || 'No plan today.')}</p>`; return; }
    let plan, marks;
    try { [plan, marks] = await Promise.all([api(c, `/api/curriculum/plan/${enc(p.id)}`), rpc('plan_marks_get', { p_center: c.center_id, p_room: d.room, p_days: [p.id] })]); }
    catch (e) { body.innerHTML = `<p class="small msg warn">The plan could not be loaded (${esc(friendly(e))}).</p>`; return; }
    const mk = (key) => (marks || []).find((m) => m.block === key) || { status: 'planned' };
    const blocks = plan.blocks || [];
    const done = blocks.filter((b) => mk(b.key).status === 'done').length;
    body.innerHTML = `<p class="small"><b>${esc(p.id)}</b>: ${esc(plan.title || p.theme || '')} <span class="muted">· ${done} of ${blocks.length} done</span></p>
      ${blocks.length ? `<ol class="sd-blocks">${blocks.map((b) => { const m = mk(b.key); return `<li class="${m.status === 'done' ? 'is-done' : ''}" data-block="${esc(b.key)}">
        <span class="sd-bt"><b>${esc(b.label)}</b>${b.minutes ? `<span class="mini muted">about ${esc(b.minutes)} min</span>` : ''}${m.status !== 'planned' && m.status !== 'done' ? `<span class="chip warn">${esc(m.status === 'moved' ? 'Moved' : 'Skipped')}</span>` : ''}</span>
        <button class="btn ${m.status === 'done' ? 'soft' : 'navy'} small sd-done" type="button" data-done="${esc(b.key)}" aria-pressed="${m.status === 'done'}">${m.status === 'done' ? 'Done ✓' : 'Mark done'}</button></li>`; }).join('')}</ol>`
        : '<p class="empty">No activities listed for this day.</p>'}
      <p class="small msg" id="sdPlanMsg" role="status"></p>`;
    body.querySelectorAll('[data-done]').forEach((b) => { b.onclick = async () => {
      const key = b.dataset.done, m = mk(key), next = m.status === 'done' ? 'planned' : 'done';
      b.disabled = true;
      try {
        const saved = await rpc('plan_mark_save', { p_center: c.center_id, p_room: d.room, p_day: p.id, p_block: key, p_status: next, p_moved_to: null, p_note: m.note || null, p_materials: null });
        const i = (marks || []).findIndex((x) => x.block === key);
        const row = { ...(i >= 0 ? marks[i] : { block: key, day_id: p.id }), status: saved?.status || next };
        if (i >= 0) marks[i] = row; else (marks ||= []).push(row);
        const label = blocks.find((x) => x.key === key)?.label || 'Activity';
        await loadPlan(c, d, ctx);
        live(`${label}: ${next === 'done' ? 'done' : 'not done yet'}`);
      } catch (e) { const msg = $('#sdPlanMsg'); if (msg) { msg.className = 'small msg bad'; msg.textContent = friendly(e); } b.disabled = false; }
    }; });
  }

  // ======================================================= director additions (below the spine brief)
  function directorSkeleton() {
    return `<section class="sd sd-dir" id="dirDash" aria-busy="true" aria-labelledby="dirDashH"><h2 class="sp-sub" id="dirDashH">Today across the center</h2>
      <div class="sd-grid">${['Rooms', 'Families', 'Staff', 'Learning'].map((t) => `<section class="card sd-card"><h3>${t}</h3>${skel(4)}</section>`).join('')}</div></section>`;
  }

  async function fillDirector(c, { spine, allowed }) {
    const host = $('#dirDash'); if (!host) return;
    let d = null, err = null;
    try { d = await rpc('director_dashboard', { p_center: c.center_id }); } catch (e) { err = e; }
    if (!$('#dirDash')) return;
    host.removeAttribute('aria-busy');
    if (!d) { host.innerHTML = `<h2 class="sp-sub" id="dirDashH">Today across the center</h2><p class="msg bad" role="alert">These figures could not be loaded: ${esc(friendly(err))}. Reload before trusting a blank.</p>`; return; }
    host.innerHTML = directorHtml(c, d, { spine, allowed });
    // the families' absence reports: the center's cutoff time and symptom list (directors only; never blocks the page)
    try {
      const s = await rpc('absence_settings_get', { p_center: c.center_id });
      const box = $('#dirAbsences');
      if (box) { box.insertAdjacentHTML('beforeend', absenceSettingsHtml(esc, s)); bindAbsenceSettings({ $, rpc, friendly, live, c }); }
    } catch (_) { /* the list still shows */ }
  }

  function directorHtml(c, d, { spine, allowed }) {
    const ctx = { slug: c.slug, allowed };
    const rooms = d.rooms || [];
    const late = centerMinutes() >= 17 * 60 + 45;   // after 5:45 pm at the center (its own time zone)
    const roomRows = rooms.map((r) => {
      const a = r.attendance || {}, rw = ratioWords(d.ratio_ok ? r.ratio : null);
      const here = a.here || 0;
      const rep = `${r.reports_published} of ${here + (a.gone || 0)}`;
      const repTone = late && r.reports_published < here + (a.gone || 0) ? 'warn' : r.reports_published && r.reports_published >= here + (a.gone || 0) ? 'ok' : '';
      return `<tr data-room="${esc(r.id)}"><th scope="row">${link(dashLink('roster', null, { ...ctx, room: r.id }), esc(r.name))}</th>
        <td data-l="Here"><b>${here}</b> <span class="muted small">of ${r.enrolled}</span><span class="mini muted sd-sub">${a.out || 0} not yet · ${a.gone || 0} gone${a.absent ? ` · ${a.absent} absent` : ''}</span></td>
        <td data-l="Ratio"><span class="chip sd-ratio tone-${rw.tone}">${esc(rw.text.replace(/^\d+ here · /, ''))}</span>${rw.tone === 'bad' && rw.sub ? `<span class="mini sd-sub bad-t">${esc(rw.sub)}</span>` : ''}</td>
        <td data-l="Care today">${r.children_logged} <span class="muted small">children logged</span></td>
        <td data-l="Daily reports"><span class="chip ${repTone}">${rep} sent</span></td></tr>`;
    }).join('');
    const roomsCard = `<section class="card sd-card sd-wide" id="dirRooms" aria-labelledby="dirRoomsH"><div class="sd-ch"><h3 id="dirRoomsH">Rooms right now</h3>${link(dashLink('today', null, ctx), 'Today', 'btn soft small')}</div>
      ${rooms.length ? `<div class="sd-tablewrap" tabindex="0" role="region" aria-label="Rooms right now, table"><table class="sd-table"><thead><tr><th scope="col">Room</th><th scope="col">Here</th><th scope="col">Ratio</th><th scope="col">Care today</th><th scope="col">Daily reports</th></tr></thead><tbody>${roomRows}</tbody></table></div>
        <p class="mini muted">${rooms.some((r) => r.capacity == null) ? `Licensed capacity is not on file for ${rooms.every((r) => r.capacity == null) ? 'any room' : 'some rooms'}, so "Seats filled" above shows no figure (not zero). ` : ''}Daily reports go out automatically about 5:30 pm.${late ? ' After 5:45 pm a room with reports still unsent is marked.' : ''} Ratios are read-only from the cited state tables${d.ratio_ok ? '' : ' (could not load)'}.</p>`
        : '<p class="empty">No rooms yet: add them in Center settings.</p>'}</section>`;

    const f = d.family || {};
    const oldest = f.oldest_unread_at ? sinceLabel(f.oldest_unread_at) : null;
    const famCard = `<section class="card sd-card" id="dirFamilies" aria-labelledby="dirFamH"><h3 id="dirFamH">Families</h3>
      <ul class="sd-stats">
        <li>${link(dashLink('chat', null, ctx), `<b>${f.unread}</b> unread family ${f.unread === 1 ? 'message' : 'messages'}${f.unread_old ? ` <span class="chip warn">${f.unread_old} older than 4 h</span>` : ''}${oldest ? `<span class="mini muted sd-sub">oldest ${esc(oldest)}</span>` : ''}`)}</li>
        <li>${link(dashLink('videos', null, ctx), `<b>${f.videos_pending}</b> ${f.videos_pending === 1 ? 'video waits' : 'videos wait'} for a parent's OK`)}</li>
        <li><b>${f.messages_pending}</b> friend ${f.messages_pending === 1 ? 'message waits' : 'messages wait'} for a parent's OK</li>
        <li>${link(dashLink('consents', null, ctx), `<b>${f.consents_pending}</b> signed ${f.consents_pending === 1 ? 'consent' : 'consents'} to check`)}</li>
        <li><b>${f.incidents_unacked}</b> incident ${f.incidents_unacked === 1 ? 'report' : 'reports'} not acknowledged by the family (30 days)</li>
      </ul>
      <h4 class="sd-h3">Help desk: ${f.help_open_total} open</h4>
      ${(f.help_open || []).length ? `<ul class="sd-mlist">${f.help_open.map((t) => `<li>${link(dashLink('help', t.id, ctx), `<b>${esc(t.subject)}</b><span class="small muted sd-sub">waiting ${esc(sinceLabel(t.created_at) || '')}</span>`, 'sd-mrow')}</li>`).join('')}</ul>` : '<p class="empty">No open help requests.</p>'}</section>`;

    const src = spine?.src || {};
    // who is clocked in, with the staff member's name (staff record / invitation / account name, never the email: staff_dash_name)
    const whos = Array.isArray(d.on_duty) ? d.on_duty : src.whosIn?.ok ? (src.whosIn.data || []).map((p) => ({ ...p, name: String(p.name || '').split('@')[0] })) : null;
    const exc = src.exceptions?.ok ? src.exceptions.data || [] : null;
    const certs = exc ? exc.filter((x) => /^(credential_|clearance_)/.test(x.kind || '')).length : null;
    const t = d.training || {};
    const staffCard = `<section class="card sd-card" id="dirStaff" aria-labelledby="dirStaffH"><div class="sd-ch"><h3 id="dirStaffH">Staff on duty</h3>${link(dashLink('timeclock', null, ctx), 'Time clock', 'btn soft small')}</div>
      ${whos == null ? '<p class="small msg warn">Who is clocked in could not be loaded.</p>' : whos.length ? `<ul class="sd-mlist">${whos.map((p) => `<li class="sd-mrow"><b>${esc(p.name)}</b> <span class="small muted sd-sub">since ${esc(clock(p.in_at))}${p.missing_out ? ' · <span class="chip warn">no clock-out for 20 h</span>' : ''}</span></li>`).join('')}</ul>` : '<p class="empty">Nobody is clocked in right now.</p>'}
      <ul class="sd-stats">
        <li>${certs == null ? 'Certificates and background checks: <b>could not load</b>' : `<b>${certs}</b> ${certs === 1 ? 'certificate or check' : 'certificates or checks'} expired or expiring in 30 days`}</li>
        <li><b>${t.overdue}</b> required ${t.overdue === 1 ? 'training' : 'trainings'} overdue · <b>${t.due_soon}</b> due in 30 days${t.people ? ` <span class="muted small">(${t.people} ${t.people === 1 ? 'person' : 'people'})</span>` : ''}</li>
      </ul></section>`;

    const lrow = (r) => `<tr><th scope="row">${link(dashLink('grades', null, { ...ctx, room: r.id }), esc(r.name))}</th><td data-l="This week's check">${r.learning.assignments ? `${r.learning.done} of ${r.enrolled}` : '<span class="muted">none assigned</span>'}</td><td data-l="Reports in draft">${r.learning.drafts}</td><td data-l="Released (90 d)">${r.learning.released}</td></tr>`;
    const learnCard = `<section class="card sd-card" id="dirLearning" aria-labelledby="dirLearnH"><h3 id="dirLearnH">Learning</h3>
      ${rooms.length ? `<div class="sd-tablewrap" tabindex="0" role="region" aria-label="Learning by room, table"><table class="sd-table"><thead><tr><th scope="col">Room</th><th scope="col">This week's check</th><th scope="col">Reports in draft</th><th scope="col">Released (90 d)</th></tr></thead><tbody>${rooms.map(lrow).join('')}</tbody></table></div>` : '<p class="empty">No rooms yet.</p>'}
      <p class="mini muted">Counts only: children are never ranked or compared.</p></section>`;

    const cl = d.closures || [];
    const calCard = `<section class="card sd-card" id="dirClosures" aria-labelledby="dirCalH"><div class="sd-ch"><h3 id="dirCalH">Coming up: closed days</h3>${link(dashLink('closure', null, ctx), 'Calendar', 'btn soft small')}</div>
      ${cl.length ? `<ul class="sd-mlist">${cl.map((x) => `<li>${link(dashLink('closure', x.day, ctx), `<b>${esc(dayLabel(x.day))}</b> <span class="chip ${x.status === 'early' ? 'gold' : ''}">${x.status === 'early' ? 'Early dismissal' : 'Closed'}</span><span class="small sd-mt">${esc(x.label)}</span>`, 'sd-mrow')}</li>`).join('')}</ul>` : '<p class="empty">No closed days or early dismissals in the next 30 days.</p>'}</section>`;

    const e = d.enrollment || {};
    const stages = [['invited', 'Invited'], ['in_progress', 'Filling in'], ['submitted', 'To review'], ['changes_requested', 'Changes asked'], ['approved', 'Approved']];
    const total = Object.values(e).reduce((a, b) => a + b, 0);
    const enrCard = `<section class="card sd-card" id="dirEnroll" aria-labelledby="dirEnrH"><div class="sd-ch"><h3 id="dirEnrH">Enrollment packets</h3>${link(dashLink('enroll', null, ctx), 'Enrollment', 'btn soft small')}</div>
      ${total ? `<ol class="sd-pipe">${stages.map(([k, l]) => `<li class="${k === 'submitted' && e[k] ? 'hot' : ''}"><b>${e[k] || 0}</b><span class="small">${l}</span></li>`).join('')}</ol>` : '<p class="empty">No enrollment packets sent yet.</p>'}
      <p class="mini muted">${d.kids_total} ${d.kids_total === 1 ? 'child' : 'children'} enrolled now.</p></section>`;

    const absCard = `<section class="card sd-card" id="dirAbsences" aria-label="Absences reported by families">${absenceListHtml(esc, d.absences || [], { slug: c.slug, card: false, title: 'Absences reported by families' })}</section>`;
    return `<h2 class="sp-sub" id="dirDashH">Today across the center</h2>${roomsCard}<div class="sd-cols sd-dircols"><div class="sd-col">${absCard}${famCard}${learnCard}</div><div class="sd-col">${staffCard}${enrCard}${calCard}</div></div>`;
  }

  return { viewTeacherHome, directorSkeleton, fillDirector };
}
