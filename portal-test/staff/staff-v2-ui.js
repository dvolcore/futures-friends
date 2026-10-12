// The staff dashboards v2: the DOM part (hub/STAFF_DASHBOARDS.md "Dashboards v2"; the pure part is staff-v2.js, the shell ff-shell.js).
//   teacher home  /c/<slug>/home[?room=<id>]   classroom tablet first: the room, who is here vs enrolled + the live ratio chip, the
//                                              attention band, four glowing KPI rings, the quick log (one tap for several children:
//                                              care_entries_apply, the same operations as Today), today's plan (mark done inline), the
//                                              roster with friend avatars and allergy flags, the friend pillars; views Room, Learning,
//                                              Care log, Messages, Calendar, Me
//   director home /c/<slug>/home               desktop first, the command centre: the center, rooms at a glance and the live ratio
//                                              status, the attention band from every desk, four KPI rings (tuition: directors only),
//                                              six living infographics; views Rooms, Families, Staff, Billing, Compliance, Health &
//                                              special ed, Calendar, Content, Settings ("All pages": every older page stays one tap away)
// Every figure comes from an existing function or a row the person may already read; anything else says "not connected yet".
// The classic homes stay at /c/<slug>/home?classic=1 (app.js), so nothing is lost while the owner reviews v2.
import { createShell, icon, glowRingSvg, glowBarHtml, countHtml, figureHtml, tableHtml, friendFor, FRIEND_NAME } from './ff-shell.js';
import * as M from './staff-v2.js';
import { motionOn } from './family-scene.js';
import { planFor } from './plan-core.js';
import { centerMinutes, centerToday, centerTz } from './center-time.js';
import { loadSpine } from './spine.js';

const enc = encodeURIComponent;
const isDemo = (c) => /^test[\s-]/i.test(String(c?.name || '')) || /(^|-)demo(-|$)|^test-/i.test(String(c?.slug || ''));
const LESSON_FRIEND = { BELONG: 'lumi', LEARN: 'booker', EXPLORE: 'zuri', MOVE: 'bop' };

export function mountStaffV2({ esc, $, rpc, client, page, live, friendly, session }) {
  const ROOM_KEY = (c) => `ff-today-room:${c.center_id}`;   // shared with Today and the classic home, so the same room opens everywhere
  const getRoom = (c) => { try { const v = JSON.parse(localStorage.getItem(ROOM_KEY(c)) || 'null'); return typeof v === 'string' ? v : null; } catch { return null; } };
  const setRoom = (c, r) => { try { localStorage.setItem(ROOM_KEY(c), JSON.stringify(r)); } catch { /* private mode */ } };
  const src = async (f) => { try { return { ok: true, data: await f() } } catch (e) { return { ok: false, error: String(e?.message || e) }; } };
  const unwrap = (r) => { if (r?.error) throw r.error; return r?.data; };
  const tfmt = (iso, lang) => { const t = Date.parse(iso); return Number.isFinite(t) ? new Date(t).toLocaleTimeString(lang === 'es' ? 'es-US' : 'en-US', { hour: 'numeric', minute: '2-digit', timeZone: centerTz() }) : ''; };
  const dfmt = (iso, lang, o = { weekday: 'short', month: 'short', day: 'numeric' }) => new Date(`${String(iso).slice(0, 10)}T12:00:00Z`).toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US', { ...o, timeZone: 'UTC' });
  const minutesOf = (iso) => { const t = Date.parse(iso); return Number.isFinite(t) ? centerMinutes(new Date(t)) : null; };
  const hhmm = (m, lang) => new Intl.DateTimeFormat(lang === 'es' ? 'es-US' : 'en-US', { hour: 'numeric', ...(m % 60 ? { minute: '2-digit' } : {}), timeZone: 'UTC' }).format(new Date(Date.UTC(2000, 0, 1, Math.floor(m / 60), m % 60)));
  async function api(c, path) {
    const s = await session();
    if (!s) throw new Error('signed out');
    const r = await fetch(path, { headers: { Authorization: `Bearer ${s.access_token}`, 'X-Center': c.center_id }, cache: 'no-store' });
    let j = null; try { j = await r.json(); } catch { /* not json */ }
    if (!r.ok) throw new Error(j?.error || 'That did not work.');
    return j;
  }

  // ---- shared pieces -------------------------------------------------------------------------------------------------------
  const av = (id, chosen, size = 40) => { const f = friendFor(id, chosen); return `<span class="ffs-av ffs-av-${f}"><img src="img/friends/${f}-480.webp" alt="" width="${size}" height="${size}" loading="lazy"></span>`; };
  const ncHtml = (S, why = '') => `<p class="ffs-nc">${icon('lock')}<span>${esc(S.nc)}${why ? ` · ${esc(why)}` : ''}</span></p>`;
  const link = (href, inner, cls = 'ffs-link') => (href ? `<a class="${cls}" href="${esc(href)}" data-nav>${inner}</a>` : '');
  const cardHead = (title, ic, right = '') => `<div class="ffs-ch"><h3>${ic ? icon(ic) : ''}${esc(title)}</h3>${right}</div>`;
  const drawerHref = (kind) => { const q = new URLSearchParams(location.search); q.set('drawer', kind); return `${FFTest.pathname()}?${q}`; };
  function kpiHtml({ id, tone, ic, label, f, big, sub, foot = '', drawer, gl = true }) {
    return `<a class="ffs-kpi" id="${id}" href="${esc(drawerHref(drawer))}" data-drawer="${esc(drawer)}">
      <span class="ffs-kpi-label"><span class="ffs-kpi-ico ffs-t-${tone}">${icon(ic)}</span>${esc(label)}</span>
      <span class="ffs-kpi-body">${glowRingSvg(f, { tone, size: 120, stroke: 12 })}<span class="ffs-kpi-num"><span class="ffs-big${gl ? ` ffs-gl-t-${tone}` : ''}">${big}</span><span class="ffs-kpi-sub">${esc(sub)}</span></span></span>
      ${foot ? `<span class="ffs-kpi-foot">${foot}</span>` : ''}</a>`;
  }
  const ratioBig = (a, b) => (a == null ? '' : `${countHtml(a)}<small> / ${esc(String(b ?? '—'))}</small>`);
  function bandHtml(items, S, kids = new Map()) {
    const shown = items.slice(0, 8);
    return `<section class="ffs-band" id="sv2Attn" aria-labelledby="sv2AttnH"><div class="ffs-band-h"><span class="ffs-band-ico" aria-hidden="true">!</span>
      <div><h2 id="sv2AttnH">${esc(S.attention)}</h2>${items.length ? `<span class="ffs-band-n">${esc(S.attentionN(items.length))}</span>` : ''}</div></div>
      ${items.length ? `<ul class="ffs-chips" aria-label="${esc(S.attention)}">${shown.map((it) => `<li class="ffs-attn ffs-attn-${it.tone}" data-key="${esc(it.key)}">
        ${it.kid && kids.has(it.kid) ? av(it.kid, kids.get(it.kid)) : `<span class="ffs-dot ffs-t-${it.tone === 'now' ? 'bad' : it.tone === 'soon' ? 'gold' : 'booker'}">${icon(it.icon)}</span>`}
        <span class="ffs-attn-t"><b>${esc(it.title)}</b>${it.sub ? `<span>${esc(it.sub)}</span>` : ''}</span>
        ${it.href ? `<a class="ffs-attn-go" href="${esc(it.href)}" data-nav>${esc(it.go)}${icon('arrow')}</a>` : ''}</li>`).join('')}</ul>`
        : `<p class="ffs-attn-clear">${icon('check')}${esc(S.allClear)}</p>`}</section>`;
  }
  function pillarsHtml(list, cls = '', label = '') {
    return `<nav class="ffs-pillars ${cls}" aria-label="${esc(label)}">${list.map(({ f, word, ic, sub, href, drawer }) => `<a class="ffs-pillar ffs-pl-${f}" href="${esc(href)}"${drawer ? ` data-view="${esc(drawer)}"` : ' data-nav'}>
      <img src="img/scene/cut-${f}-440.webp" alt="" width="110" height="110" loading="lazy"><span class="ffs-pl-t"><span class="ffs-pl-name">${esc(FRIEND_NAME[f])}</span><b>${icon(ic)}${esc(word)}</b><span class="ffs-pl-sub">${esc(sub)}</span></span></a>`).join('')}</nav>`;
  }
  function heroHtml({ hello, date, row, friend, S, c, cls = '' }) {
    return `<section class="ffs-hero ${cls}" id="sv2Hero" aria-labelledby="sv2Hello">
      <img class="ffs-hero-bg" src="img/scene/school-exterior-1600.webp" srcset="img/scene/school-exterior-800.webp 800w, img/scene/school-exterior-1600.webp 1600w" sizes="(max-width: 767px) 100vw, 70vw" alt="" width="1600" height="560">
      <img class="ffs-hero-sun" src="img/scene/felt-sun-320.webp" alt="" width="96" height="96">
      <img class="ffs-hero-friend" src="img/friends/${esc(friend)}-480.webp" alt="" width="220" height="220">
      ${isDemo(c) ? `<p class="ffs-demo">${esc(S.demo)}</p>` : ''}
      <div class="ffs-hero-in"><h1 class="ffs-hello" id="sv2Hello">${esc(hello)}</h1><p class="ffs-date">${esc(date)}</p><div class="ffs-herorow">${row}</div></div></section>`;
  }
  const actionHtml = (id, href, ic, long, short, cls = '', drawer = null) => `<a class="ffs-action ${cls}" id="${id}" href="${esc(href)}"${drawer ? ` data-drawer="${esc(drawer)}"` : ' data-nav'}><span class="ffs-aico">${icon(ic)}</span><span class="ffs-a-long">${esc(long)}</span><span class="ffs-a-short">${esc(short)}</span></a>`;
  function hostUp() {
    document.getElementById('centerSpace')?.classList.add('ffs-host');
    document.body.classList.add('fp-fam', 'ffs-staff');
  }
  const skeleton = (title = '') => `<div class="ffs ffs-loading" id="sv2" aria-busy="true"><p class="ffs-sr" role="status">…</p>
    <div class="ffs-stage">${title ? `<h2 class="ffs-title sv2-sk-title">${esc(title)}</h2>` : ''}<div class="ffs-sk ffs-sk-hero" aria-hidden="true"></div><div class="ffs-sk-row" aria-hidden="true">${'<div class="ffs-sk ffs-sk-kpi"></div>'.repeat(4)}</div></div></div>`;

  // =====================================================================================================================
  // TEACHER
  // =====================================================================================================================
  async function viewTeacher(c, frame, opts) {
    const { lang = 'en', allowed, clockCard, tabs = [] } = opts;
    const S = M.sw(lang), Q = M.qw(lang);
    page(frame(skeleton(S.yourRoom)), c.name, { english: lang !== 'es' });
    hostUp();
    const want = new URLSearchParams(location.search).get('room') || getRoom(c);
    let d = null, err = null;
    try { d = await rpc('staff_dashboard', { p_center: c.center_id, p_room: want }).catch((e) => (want ? rpc('staff_dashboard', { p_center: c.center_id, p_room: null }) : Promise.reject(e))); } catch (e) { err = e; }
    if (!d) {
      page(frame(`<div class="ffs" id="sv2"><div class="ffs-stage"><section class="ffs-card"><h2>${esc(S.yourRoom)}</h2><p class="msg bad" role="alert">${esc(S.couldNot)}: ${esc(friendly(err))}</p>
        <p>${link(`/c/${c.slug}/home?classic=1`, esc(S.classic))}</p></section></div></div>`), c.name, { english: lang !== 'es' });
      return hostUp();
    }
    if (d.room) { setRoom(c, d.room); const p = new URLSearchParams(location.search); if (p.get('room') !== d.room) { p.set('room', d.room); history.replaceState(history.state, '', `${FFTest.pathname()}?${p}`); } }
    const room = d.room;
    const ctx = { slug: c.slug, allowed, room };
    const roomKids = (d.kids || []).map((k) => k.kid);
    const [mar, alerts, sped, avatars, pickup, clockSt, clock, plan] = await Promise.all([
      src(() => rpc('health_mar_due', { p_center: c.center_id, p_date: null, p_room: room })),
      src(() => rpc('care_alert_board', { p_center: c.center_id, p_room: room })),
      src(() => rpc('sped_staff_todos', { p_center: c.center_id })),
      src(async () => unwrap(await client().from('kid_avatars').select('kid, friend').eq('center_id', c.center_id).in('kid', roomKids.length ? roomKids : ['-']))),
      src(async () => unwrap(await client().from('pickup_people').select('kid, name, kind, relationship, status').eq('center_id', c.center_id).eq('status', 'active').in('kid', roomKids.length ? roomKids : ['-']))),
      src(() => rpc('staff_clock_state', { p_center: c.center_id })),
      clockCard(c).catch(() => ({ html: '', bind() {} })),
      room ? src(() => loadPlan(c, room)) : Promise.resolve({ ok: false }),
    ]);
    const kidsAv = new Map((d.kids || []).map((k) => [k.kid, null]));
    for (const a of M.ok(avatars) || []) kidsAv.set(a.kid, a.friend);
    const x = { mar: M.ok(mar), alerts: M.ok(alerts), sped: M.ok(sped), pickup: M.ok(pickup), clock: M.ok(clockSt), plan: M.ok(plan), marOk: mar.ok, alertsOk: alerts.ok, pickupOk: pickup.ok };
    const T = M.teacherModel(d, x);
    const attn = M.teacherAttention(d, x, ctx, lang, centerMinutes());
    const alertBy = new Map((x.alerts || []).map((a) => [a.kid, a]));
    const state = { sel: new Set((d.kids || []).filter((k) => k.state === 'here').map((k) => k.kid)) };

    // ---- views ----
    const kidsHere = (d.kids || []).filter((k) => k.state === 'here');
    const order = ['here', 'out', 'absent', 'gone'];
    const sortedKids = [...(d.kids || [])].sort((a, b) => order.indexOf(a.state) - order.indexOf(b.state) || a.first.localeCompare(b.first));
    const stateWord = { here: lang === 'es' ? 'Presente' : 'Here', out: lang === 'es' ? 'Todavía no' : 'Not here yet', gone: lang === 'es' ? 'Se fue' : 'Gone home', absent: lang === 'es' ? 'Ausente' : 'Absent' };
    const flagsHtml = (k) => { const a = alertBy.get(k.kid); const types = k.alerts?.types || a?.types || [];
      return `${types.includes('allergy') ? `<span class="sv2-flag sv2-flag-allergy" title="${esc(S.allergyFlag)}">${icon('alert')}<span class="ffs-sr">${esc(S.allergyFlag)}</span></span>` : ''}${(k.alerts?.emergency_med || a?.emergency_med) ? `<span class="sv2-flag sv2-flag-med" title="${esc(S.medFlag)}">${icon('med')}<span class="ffs-sr">${esc(S.medFlag)}</span></span>` : ''}`; };
    const rosterTile = (k, big = false) => `<li class="sv2-kid st-${esc(k.state)}"><a class="sv2-kid-a" href="${esc(drawerHref(`child:${k.kid}`))}" data-drawer="child:${esc(k.kid)}">
      ${av(k.kid, kidsAv.get(k.kid), big ? 56 : 44)}<span class="sv2-kid-t"><b>${esc(k.first)}${k.last_initial ? ` ${esc(k.last_initial)}` : ''}</b><span>${esc(stateWord[k.state] || k.state)}</span></span>${flagsHtml(k)}</a></li>`;
    const planCard = (full = false) => {
      const p = x.plan;
      const head = cardHead(S.plan, 'book', link(M.staffLink('plan', null, ctx), `${esc(S.openPlanning)}${icon('arrow')}`));
      if (!plan.ok) return `<section class="ffs-card sv2-plan" id="sv2Plan">${head}${ncHtml(S)}</section>`;
      if (p.status !== 'ok') return `<section class="ffs-card sv2-plan" id="sv2Plan">${head}<p class="ffs-empty">${esc(p.why || S.planNone)}</p></section>`;
      const done = p.blocks.filter((b) => b.status === 'done').length;
      const list = full ? p.blocks : p.blocks.slice(0, 3);
      return `<section class="ffs-card sv2-plan" id="sv2Plan">${head}
        <p class="sv2-lesson"><span class="ffs-chip ffs-chip-${LESSON_FRIEND[p.pillar] ? { lumi: 'bop', booker: 'booker', zuri: 'ok', bop: 'bop' }[LESSON_FRIEND[p.pillar]] : 'booker'}">${esc(p.id)}</span> <b>${esc(p.title || '')}</b> <span class="ffs-sub">${esc(S.planDone(done, p.blocks.length))}</span>
          ${!full && p.blocks.length > 3 ? `<a class="ffs-link sv2-plan-more" href="${esc(sh.viewHref('learning'))}" data-view="learning">+${p.blocks.length - 3}${icon('arrow')}</a>` : ''}</p>
        <ol class="sv2-blocks">${list.map((b) => `<li class="${b.status === 'done' ? 'is-done' : ''}"><span class="sv2-bt"><b>${esc(b.label)}</b>${b.minutes ? `<span>${esc(b.minutes)} min</span>` : ''}</span>
          <button class="ffs-btn ${b.status === 'done' ? 'ffs-btn-soft' : 'ffs-btn-navy'} sv2-done" type="button" data-done="${esc(b.key)}" aria-pressed="${b.status === 'done'}">${b.status === 'done' ? `${icon('check')}${esc(S.doneMark)}` : esc(S.markDone)}</button></li>`).join('')}</ol>
        <p class="ffs-note" id="sv2PlanMsg" role="status"></p></section>`;
    };
    const quickLogCard = (inline = false) => `<section class="ffs-card sv2-quick${inline ? ' sv2-quick-inline' : ''}" id="${inline ? 'sv2-quick-inline' : 'sv2-quick'}">
      ${cardHead(S.quickLog, 'pulse', link(M.staffLink('today', null, ctx), `${esc(S.fullScreen)}${icon('arrow')}`))}
      ${inline ? quickLogBody() : `<p class="ffs-sr">${esc(S.quickLogSub)}</p>
      <ul class="sv2-qkids" aria-label="${esc(S.selectAll)}">${kidsHere.slice(0, 7).map((k) => `<li>${av(k.kid, kidsAv.get(k.kid), 36)}</li>`).join('')}${kidsHere.length > 7 ? `<li class="sv2-more">+${kidsHere.length - 7}</li>` : ''}</ul>
      <div class="sv2-qkinds">${['meal', 'nap', 'toilet', 'mood'].map((k) => `<a class="sv2-qk sv2-qk-${k}" href="${esc(drawerHref(`log:${k}`))}" data-drawer="log:${k}"><span class="ffs-dot ffs-t-${{ meal: 'zuri', nap: 'lumi', toilet: 'booker', mood: 'gold' }[k]}">${icon(k)}</span><b>${esc(S.kinds[k])}</b></a>`).join('')}</div>
      ${eveningHtml()}`}
      </section>`;
    function eveningHtml() {
      const rep = d.reports || { published: 0, total: 0 };
      return `<a class="sv2-evening" href="${esc(M.staffLink('reports', null, ctx) || sh.viewHref('care'))}" data-nav>${icon('report')}<span><b>${esc(S.evening)}</b> ${esc(S.eveningSub(rep.published, rep.total, rep.send_time || '5:30 pm'))}</span></a>`;
    }
    function quickLogBody(kind = 'meal') {
      return `<form class="sv2-qform" data-kind="${kind}" novalidate>
        <fieldset class="sv2-qfs"><legend>${esc(S.selected(state.sel.size))}</legend>
          <div class="sv2-qsel">${kidsHere.map((k) => `<button type="button" class="sv2-qkid" data-kid="${esc(k.kid)}" aria-pressed="${state.sel.has(k.kid)}">${av(k.kid, kidsAv.get(k.kid), 40)}<span>${esc(k.first)}</span></button>`).join('')}</div>
          <button type="button" class="ffs-link sv2-qall">${esc(S.selectAll)}</button></fieldset>
        <div class="sv2-qtabs" role="radiogroup" aria-label="${esc(S.quickLog)}">${['meal', 'nap', 'toilet', 'mood'].map((k) => `<button type="button" role="radio" class="sv2-qtab" data-k="${k}" aria-checked="${k === kind}">${icon(k)}<span>${esc(S.kinds[k])}</span></button>`).join('')}</div>
        <div class="sv2-qopts">${quickOpts(kind)}</div>
        <button class="ffs-btn ffs-btn-bop sv2-qgo" type="submit">${icon('check')}${esc(S.logNow)}</button>
        <p class="ffs-note sv2-qmsg" role="status"></p></form>`;
    }
    function quickOpts(kind) {
      const q = M.QUICK[kind];
      const radios = (name, values, label, def) => `<div class="sv2-qrow" role="radiogroup" aria-label="${esc(label)}"><span class="sv2-ql">${esc(label)}</span>${values.map((v) => `<button type="button" role="radio" class="sv2-qopt" data-name="${name}" data-v="${v}" aria-checked="${v === def}">${kind === 'mood' && name === 'v' ? `<img src="img/friends/${M.FEEL_ART[v]}-480.webp" alt="" width="28" height="28">` : ''}${esc(Q[v])}</button>`).join('')}</div>`;
      if (kind === 'meal') { const hour = Math.floor(centerMinutes() / 60); const def = hour < 10 ? 'breakfast' : hour < 11 ? 'am_snack' : hour < 14 ? 'lunch' : 'snack';
        return radios('v', q.values, Q.which, def) + radios('amount', q.amounts, Q.how, 'most'); }
      if (kind === 'nap') return radios('v', q.values, Q.what, 'start');
      return radios('v', q.values, Q.what, q.values[0]);
    }
    function bindQuick(form) {
      if (!form) return;
      const refreshSel = () => { form.querySelector('legend').textContent = S.selected(state.sel.size); for (const b of form.querySelectorAll('.sv2-qkid')) b.setAttribute('aria-pressed', String(state.sel.has(b.dataset.kid))); };
      form.addEventListener('click', (e) => {
        const kb = e.target.closest('.sv2-qkid'); if (kb) { state.sel.has(kb.dataset.kid) ? state.sel.delete(kb.dataset.kid) : state.sel.add(kb.dataset.kid); refreshSel(); return; }
        if (e.target.closest('.sv2-qall')) { const all = kidsHere.every((k) => state.sel.has(k.kid)); state.sel = new Set(all ? [] : kidsHere.map((k) => k.kid)); refreshSel(); return; }
        const t = e.target.closest('.sv2-qtab'); if (t) { form.dataset.kind = t.dataset.k; for (const x2 of form.querySelectorAll('.sv2-qtab')) x2.setAttribute('aria-checked', String(x2 === t)); form.querySelector('.sv2-qopts').innerHTML = quickOpts(t.dataset.k); return; }
        const o = e.target.closest('.sv2-qopt'); if (o) { for (const x2 of form.querySelectorAll(`.sv2-qopt[data-name="${o.dataset.name}"]`)) x2.setAttribute('aria-checked', String(x2 === o)); }
      });
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = form.querySelector('.sv2-qmsg'), kind = form.dataset.kind;
        if (!state.sel.size) { msg.textContent = Q.pick; return; }
        const pick = (n) => form.querySelector(`.sv2-qopt[data-name="${n}"][aria-checked="true"]`)?.dataset.v;
        const at = new Date().toISOString(), v = pick('v');
        const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(16)}-0000-4000-8000-${Math.random().toString(16).slice(2, 14).padEnd(12, '0')}`);
        let ops;
        if (kind === 'nap' && v === 'end') {
          ops = (d.kids || []).filter((k) => state.sel.has(k.kid) && k.resting_since).map((k) => ({ op: 'end_nap', id: uuid(), kid: k.kid, at }));
          if (!ops.length) { msg.textContent = Q.end; return; }
        } else {
          const data = kind === 'meal' ? { meal: v, amount: pick('amount') } : kind === 'toilet' ? { what: v } : kind === 'mood' ? { feeling: v } : {};
          ops = [...state.sel].map((kid) => ({ op: 'add', id: uuid(), kid, kind, at, data }));
        }
        const go = form.querySelector('.sv2-qgo'); go.disabled = true; msg.textContent = Q.waiting;
        try {
          const res = (await rpc('care_entries_apply', { p_center: c.center_id, p_ops: ops })) || [];
          const bad = res.filter((r) => r.status === 'refused').length;
          const okN = ops.length - bad;
          msg.textContent = `${Q.saved(okN, S.kinds[kind])}${bad ? ` ${Q.refused(bad)}` : ''}`;
          live(msg.textContent);
          setTimeout(() => viewTeacher(c, frame, opts).then(() => live(msg.textContent)), 900);
        } catch (er) { msg.textContent = friendly(er); go.disabled = false; }
      });
    }

    function buildView(id) {
      const P = (tab, html, cls) => sh.panel(id, tab, html, cls);
      if (id === 'today') {
        const r = T.ratio;
        const ratioPill = r.tone === 'nc' ? `<span class="ffs-pillbtn ffs-pill-nc"><span class="ffs-pill-ico">${icon('ratio')}</span><span class="ffs-pill-t"><b>${esc(S.ratioNc)}</b></span></span>`
          : `<a class="ffs-pillbtn ffs-pill-${r.tone === 'bad' ? 'bad' : 'ok'}" href="${esc(drawerHref('kpi:present'))}" data-drawer="kpi:present" id="sv2RatioPill"><span class="ffs-pill-ico">${icon('ratio')}</span><span class="ffs-pill-t"><b>${esc(S.presentOf(T.here, T.enrolled))}</b><span>${esc(r.ratio ? S.ratioChip(r.ratio, r.required ?? 0) : S.ratioEmpty)}</span></span></a>`;
        const open = x.clock?.open;
        const clockPill = x.clock ? `<a class="ffs-pillbtn ffs-pill-${open ? 'ok' : 'warn'}" href="${esc(sh.viewHref('me', 'clock'))}" data-view="me" data-tab="clock" id="sv2ClockPill"><span class="ffs-pill-ico">${icon('clock')}</span><span class="ffs-pill-t"><b>${esc(open ? S.clockIn : S.clockOut)}</b>${open ? `<span>${esc(tfmt(open.in_at, lang))}</span>` : ''}</span></a>` : '';
        const rooms = d.rooms || [];
        const roomChips = rooms.length > 1 ? `<nav class="sv2-rooms" aria-label="${esc(S.room)}">${rooms.map((rm) => `<a class="sv2-roomchip" href="/c/${esc(c.slug)}/home?room=${enc(rm.id)}" data-room="${esc(rm.id)}"${rm.id === room ? ' aria-current="page"' : ''}>${esc(rm.name)}</a>`).join('')}</nav>` : '';
        const hour = Math.floor(centerMinutes() / 60);
        const friend = x.plan?.pillar && LESSON_FRIEND[x.plan.pillar] ? `${LESSON_FRIEND[x.plan.pillar]}-waving` : 'booker-waving';
        const hero = heroHtml({ c, S, friend: friend === 'zuri-waving' ? 'zuri-pointing' : friend, hello: d.room_name || S.yourRoom,
          date: `${S.hello[M.daypart(hour)]} · ${new Date().toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: centerTz() })}`, row: `${roomChips}${ratioPill}${clockPill}` });
        const kpis = `<div class="ffs-kpis" id="sv2Kpis">
          ${kpiHtml({ id: 'sv2-kpi-present', tone: 'booker', ic: 'people', label: S.kPresent, f: M.frac(T.here, T.enrolled), big: ratioBig(T.here, T.enrolled), sub: `${S.kPresentSub(T.enrolled)}${T.absent ? ` · ${S.absent(T.absent)}` : ''}${T.out ? ` · ${S.notYet(T.out)}` : ''}`, drawer: 'kpi:present' })}
          ${kpiHtml({ id: 'sv2-kpi-meals', tone: 'zuri', ic: 'meal', label: S.kMeals, f: M.frac(T.meals.logged, T.meals.of), big: ratioBig(T.meals.logged, T.meals.of), sub: S.kMealsSub, drawer: 'kpi:meals' })}
          ${kpiHtml({ id: 'sv2-kpi-naps', tone: 'lumi', ic: 'nap', label: S.kNaps, f: M.frac(T.naps.done, T.naps.of), big: ratioBig(T.naps.done, T.naps.of), sub: S.kNapsSub(T.naps.resting), drawer: 'kpi:naps' })}
          ${kpiHtml({ id: 'sv2-kpi-checks', tone: 'bop', ic: 'star', label: S.kChecks, f: M.frac(T.checks.done, T.checks.of), big: T.checks.of ? ratioBig(T.checks.done, T.checks.of) : `<span class="ffs-big-nc">${esc(T.checks.state === 'none' ? S.checksNone : T.checks.state === 'off' ? S.checksOff : S.nc)}</span>`, sub: S.kChecksSub(T.checks.observe), drawer: 'kpi:checks', gl: !!T.checks.of })}</div>`;
        const roster = `<section class="ffs-card sv2-roster" id="sv2Roster">${cardHead(S.roster, 'room', `<a class="ffs-link" href="${esc(sh.viewHref('room'))}" data-view="room">${esc(S.views.room)}${icon('arrow')}</a>`)}
          <ul class="sv2-kids sv2-kids-mini">${sortedKids.slice(0, 12).map((k) => rosterTile(k)).join('')}</ul>${sortedKids.length > 12 ? `<a class="ffs-link" href="${esc(sh.viewHref('room'))}" data-view="room">+${sortedKids.length - 12}${icon('arrow')}</a>` : ''}</section>`;
        return `<div class="ffs-grid sv2-cockpit">${hero}${bandHtml(attn, S, kidsAv)}${kpis}
          <div class="sv2-row3">${quickLogCard()}${planCard()}${roster}</div>
          ${pillarsHtml([
            { f: 'booker', word: 'LEARN', ic: 'book', sub: S.tabs.plan, href: sh.viewHref('learning'), drawer: 'learning' },
            { f: 'lumi', word: 'BELONG', ic: 'heart', sub: S.chat, href: sh.viewHref('messages'), drawer: 'messages' },
            { f: 'zuri', word: 'EXPLORE', ic: 'star', sub: S.tabs.checks, href: sh.viewHref('learning', 'checks'), drawer: 'learning' },
            { f: 'bop', word: 'MOVE', ic: 'pulse', sub: S.quickLog, href: sh.viewHref('care'), drawer: 'care' }], '', S.tagline)}</div>`;
      }
      if (id === 'room') {
        const pickupBy = new Map(); for (const p of x.pickup || []) (pickupBy.get(p.kid) || pickupBy.set(p.kid, []).get(p.kid)).push(p);
        return P('roster', `<section class="ffs-card">${cardHead(S.roster, 'room', link(M.staffLink('roster', null, ctx), `${esc(S.openFull)}${icon('arrow')}`))}<p class="ffs-sub">${esc(S.rosterSub)}</p>
            <ul class="sv2-kids">${sortedKids.map((k) => rosterTile(k, true)).join('')}</ul>
            <p class="ffs-note">${esc(S.presentOf(T.here, T.enrolled))} · ${esc(S.notYet(T.out))} · ${esc(S.gone(T.gone))} · ${esc(S.absent(T.absent))}</p></section>`)
          + P('pickup', `<section class="ffs-card">${cardHead(S.pickupList, 'pickup', link(M.staffLink('pickup', null, ctx), `${esc(S.openFull)}${icon('arrow')}`))}<p class="ffs-sub">${esc(S.pickupSub)}</p>
            ${!x.pickupOk ? ncHtml(S) : `<ul class="ffs-list">${sortedKids.filter((k) => k.state === 'here' || k.state === 'gone').map((k) => `<li class="ffs-row">${av(k.kid, kidsAv.get(k.kid), 36)}<span class="ffs-row-t"><b>${esc(k.first)} ${esc(k.last_initial || '')}</b>
              <span>${esc((pickupBy.get(k.kid) || []).map((p) => `${M.shortName(p.name)} (${p.relationship || p.kind})`).join(' · ') || S.nc)}</span></span><span class="ffs-chip ${k.state === 'gone' ? '' : 'ffs-chip-ok'}">${esc(stateWord[k.state])}</span></li>`).join('')}</ul>`}</section>`)
          + P('sub', `<section class="ffs-card">${cardHead(S.subSheet, 'doc', link(M.staffLink('sub', null, ctx), `${esc(S.openFull)}${icon('arrow')}`))}<p class="ffs-sub">${esc(S.subSub)}</p>
            <div class="ffs-two"><div><h4 class="sv2-h4">${esc(S.alerts)}</h4>${alertsList()}</div><div><h4 class="sv2-h4">${esc(S.plan)}</h4>${x.plan?.status === 'ok' ? `<ol class="sv2-blocks sv2-blocks-ro">${x.plan.blocks.map((b) => `<li><span class="sv2-bt"><b>${esc(b.label)}</b>${b.minutes ? `<span>${esc(b.minutes)} min</span>` : ''}</span></li>`).join('')}</ol>` : `<p class="ffs-empty">${esc(x.plan?.why || S.planNone)}</p>`}</div></div></section>`);
      }
      if (id === 'learning') {
        const l = d.learning || {};
        const drafts = d.todo?.drafts || [];
        return P('plan', planCard(true))
          + P('checks', `<section class="ffs-card">${cardHead(S.gradebook, 'star', link(M.staffLink('grades', null, ctx), `${esc(S.openFull)}${icon('arrow')}`))}
            <div class="sv2-ringrow">${glowRingSvg(T.checks.of ? M.frac(T.checks.done, T.checks.of) : null, { tone: 'bop', size: 140, stroke: 14 })}<div><p class="ffs-big ffs-gl-t-bop">${T.checks.of ? `${countHtml(T.checks.done)}<small> / ${T.checks.of}</small>` : `<span class="ffs-big-nc">${esc(S.nc)}</span>`}</p>
            ${(l.not_done || []).length ? `<p><b>${esc(S.stillToDo)}:</b> ${l.not_done.map((k) => esc(k.first)).join(', ')}</p>` : ''}<p class="ffs-note">${esc(S.countsOnly)}</p></div></div>
            ${todoList(['observe', 'flagged'])}</section>`)
          + P('reports', `<section class="ffs-card">${cardHead(S.tabs.reports, 'report', link(M.staffLink('grades', null, ctx), `${esc(S.openFull)}${icon('arrow')}`))}<p class="ffs-sub">${esc(S.reportsDraft(drafts.length))}</p>${todoList(['draft'])}</section>`);
      }
      if (id === 'care') {
        const mealWord = { breakfast: Q.breakfast, am_snack: Q.am_snack, lunch: Q.lunch, snack: Q.snack };
        return P('log', quickLogCard(true))
          + P('meals', `<section class="ffs-card">${cardHead(S.tabs.meals, 'meal', link(M.staffLink('today', null, ctx), `${esc(S.openToday)}${icon('arrow')}`))}
            ${figureHtml(esc, { id: 'sv2-meals-fig', words: S, summary: `${S.kMeals}: ${T.meals.logged} / ${T.meals.of}`, art: `<ul class="sv2-carebars">${kidsHere.map((k) => `<li><span>${esc(k.first)}</span>${glowBarHtml(Math.min(1, (k.meals || []).length / 3), 'zuri')}<i>${esc((k.meals || []).map((m) => mealWord[m] || m).join(', ') || '—')}</i></li>`).join('')}</ul>`,
              table: tableHtml(esc, { head: [S.children, S.tabs.meals], rows: kidsHere.map((k) => [k.first, (k.meals || []).map((m) => mealWord[m] || m).join(', ') || '—']) }) })}</section>`)
          + P('rest', `<section class="ffs-card">${cardHead(S.tabs.rest, 'nap', '')}
            ${figureHtml(esc, { id: 'sv2-rest-fig', words: S, summary: `${S.kNaps}: ${T.naps.done} / ${T.naps.of}`, art: `<ul class="sv2-kids">${kidsHere.map((k) => `<li class="sv2-kid ${k.resting_since ? 'is-resting' : k.rested ? 'is-rested' : ''}"><span class="sv2-kid-a">${av(k.kid, kidsAv.get(k.kid), 44)}<span class="sv2-kid-t"><b>${esc(k.first)}</b><span>${esc(k.resting_since ? `${Q.start.split(' ')[0]} · ${tfmt(k.resting_since, lang)}` : k.rested ? '✓' : '—')}</span></span></span></li>`).join('')}</ul>`,
              table: tableHtml(esc, { head: [S.children, S.tabs.rest], rows: kidsHere.map((k) => [k.first, k.resting_since ? tfmt(k.resting_since, lang) : k.rested ? '✓' : '—']) }) })}</section>`)
          + P('health', `<div class="ffs-two"><section class="ffs-card">${cardHead(S.alerts, 'alert', link(M.staffLink('tab', 'children', ctx), `${esc(S.openFull)}${icon('arrow')}`))}${alertsList()}</section>
            <section class="ffs-card">${cardHead(S.meds, 'med', link(M.staffLink('mar', null, ctx), `${esc(S.openFull)}${icon('arrow')}`))}${medsList()}</section></div>`);
      }
      if (id === 'messages') {
        const recent = d.recent || [], anns = d.announcements || [];
        return P('families', `<section class="ffs-card">${cardHead(S.chat, 'chat', link(M.staffLink('chat', null, ctx), `${esc(S.openFull)}${icon('arrow')}`))}
            ${recent.length ? `<ul class="ffs-list">${recent.map((m) => `<li><a class="ffs-row" href="${esc(M.staffLink('message', m.id, { ...ctx, kid: m.kid }))}" data-nav>${av(m.kid, kidsAv.get(m.kid), 36)}<span class="ffs-row-t"><b>${esc(m.first)} · ${esc(m.from === 'family' ? (lang === 'es' ? 'familia' : 'family') : (lang === 'es' ? 'maestra' : 'teacher'))}</b><span>${esc(m.text || '')}</span></span>${m.unread ? `<span class="ffs-chip ffs-chip-warn">${esc(S.unread)}</span>` : ''}${icon('arrow')}</a></li>`).join('')}</ul>` : `<p class="ffs-empty">${esc(S.noMsgs)}</p>`}</section>`)
          + P('announcements', `<section class="ffs-card">${cardHead(S.announce, 'announcement', link(M.staffLink('chat', null, ctx), `${esc(S.openFull)}${icon('arrow')}`))}
            ${anns.length ? `<ul class="ffs-list">${anns.map((a) => `<li><a class="ffs-row" href="${esc(M.staffLink('announcement', a.id, ctx))}" data-nav><span class="ffs-dot ffs-t-gold">${icon('announcement')}</span><span class="ffs-row-t"><b>${esc(a.title)}</b><span>${esc(a.body || '')}</span></span>${icon('arrow')}</a></li>`).join('')}</ul>` : `<p class="ffs-empty">${esc(S.noMsgs)}</p>`}</section>`)
          + P('todo', `<section class="ffs-card">${cardHead(S.tabs.todo, 'check', '')}${attn.length ? attnList(attn) : `<p class="ffs-empty">${esc(S.allClear)}</p>`}</section>`);
      }
      if (id === 'calendar') {
        return P('upcoming', `<section class="ffs-card">${cardHead(S.upcoming, 'calendar', link(M.staffLink('calendar', null, ctx), `${esc(S.openFull)}${icon('arrow')}`))}${closuresList(d.closures)}</section>`)
          + P('absences', `<section class="ffs-card">${cardHead(S.tabs.absences, 'pickup', '')}${(d.absences || []).length ? `<ul class="ffs-list">${d.absences.map((a) => `<li class="ffs-row">${av(a.kid, kidsAv.get(a.kid), 36)}<span class="ffs-row-t"><b>${esc(a.first || a.kid)}</b><span>${esc(dfmt(a.from || a.day || a.starts_on || '', lang))}${a.note ? ` · ${esc(a.note)}` : ''}</span></span></li>`).join('')}</ul>` : `<p class="ffs-empty">${esc(S.absencesNone)}</p>`}</section>`);
      }
      if (id === 'me') {
        const tr = d.todo?.training || [];
        return P('clock', `<section class="ffs-card sv2-clock">${cardHead(S.clockCard, 'clock', '')}${clock.html || ncHtml(S, S.clockNc)}</section>`)
          + P('training', `<section class="ffs-card">${cardHead(S.training, 'learn', link(M.staffLink('licensing-mine', null, ctx), `${esc(S.openFull)}${icon('arrow')}`))}
            ${tr.length ? `<ul class="ffs-list">${tr.map((t) => `<li class="ffs-row"><span class="ffs-dot ffs-t-${t.overdue ? 'bad' : 'gold'}">${icon('learn')}</span><span class="ffs-row-t"><b>${esc(t.title)}</b><span>${esc(t.due_date || '')}</span></span></li>`).join('')}</ul>` : `<p class="ffs-empty">${esc(S.trainingNone)}</p>`}</section>`);
      }
      return '';
    }
    function alertsList() {
      if (!x.alertsOk) return ncHtml(S);
      const list = x.alerts || [];
      return list.length ? `<ul class="ffs-list">${list.map((a) => `<li><a class="ffs-row" href="${esc(M.staffLink('child', a.kid, ctx))}" data-nav>${av(a.kid, kidsAv.get(a.kid), 36)}<span class="ffs-row-t"><b>${esc(a.first)} ${esc(a.last || '')}</b><span>${esc((a.alerts || []).map((z) => M.shortName(z.label)).join(' · '))}</span></span>
        ${a.emergency_med ? `<span class="ffs-chip ffs-chip-bad">${esc(S.medFlag)}</span>` : ''}${icon('arrow')}</a></li>`).join('')}</ul>` : `<p class="ffs-empty">${esc(S.alertsNone)}</p>`;
    }
    function medsList() {
      if (!x.marOk) return ncHtml(S, S.medsNc);
      const meds = x.mar?.meds || [];
      return meds.length ? `<ul class="ffs-list">${meds.map((m) => `<li><a class="ffs-row" href="${esc(M.staffLink('mar', null, ctx))}" data-nav>${av(m.kid, kidsAv.get(m.kid), 36)}<span class="ffs-row-t"><b>${esc(m.first)} · ${esc(M.shortName(m.med_name))}</b><span>${esc(m.dose || '')}</span></span>
        ${(m.slots || []).map((s) => `<span class="ffs-chip ${s.state === 'overdue' ? 'ffs-chip-bad' : s.state === 'due' ? 'ffs-chip-warn' : s.state === 'recorded' ? 'ffs-chip-ok' : ''}">${esc(s.time)}</span>`).join('')}</a></li>`).join('')}</ul>` : `<p class="ffs-empty">${esc(S.medsNone)}</p>`;
    }
    function closuresList(list) {
      return (list || []).length ? `<ul class="ffs-list">${list.map((x2) => `<li><a class="ffs-row" href="${esc(M.staffLink('closure', x2.day, ctx))}" data-nav><span class="ffs-dot ffs-t-${x2.status === 'early' ? 'gold' : 'navy'}">${icon('calendar')}</span><span class="ffs-row-t"><b>${esc(dfmt(x2.day, lang, { weekday: 'long', month: 'long', day: 'numeric' }))}</b><span>${esc(x2.status === 'early' ? S.early : S.closed)} · ${esc(x2.label || '')}</span></span>${icon('arrow')}</a></li>`).join('')}</ul>` : `<p class="ffs-empty">${esc(S.noClosures)}</p>`;
    }
    function attnList(items) {
      return `<ul class="ffs-list">${items.map((it) => `<li>${it.href ? `<a class="ffs-row" href="${esc(it.href)}" data-nav>` : '<span class="ffs-row">'}${it.kid ? av(it.kid, kidsAv.get(it.kid), 36) : `<span class="ffs-dot ffs-t-${it.tone === 'now' ? 'bad' : 'gold'}">${icon(it.icon)}</span>`}
        <span class="ffs-row-t"><b>${esc(it.title)}</b>${it.sub ? `<span>${esc(it.sub)}</span>` : ''}</span>${it.href ? `${icon('arrow')}</a>` : '</span>'}</li>`).join('')}</ul>`;
    }
    function todoList(kinds) {
      const items = attn.filter((a) => kinds.some((k) => a.key.startsWith(k === 'observe' ? 'obs:' : k === 'flagged' ? 'flag:' : 'draft:')));
      return items.length ? attnList(items) : '';
    }

    function drawer(kind) {
      const [k, arg] = kind.split(':');
      if (k === 'log') return { title: S.quickLog, html: quickLogBody(['meal', 'nap', 'toilet', 'mood'].includes(arg) ? arg : 'meal'), href: M.staffLink('today', null, ctx), go: S.openToday, bind: (el) => bindQuick(el.querySelector('.sv2-qform')) };
      if (k === 'child') {
        const kid = (d.kids || []).find((z) => z.kid === arg); if (!kid) return null;
        const a = alertBy.get(arg);
        const dots = [[S.kinds.meal, (kid.meals || []).length ? (kid.meals || []).join(', ') : '—'], [S.kinds.nap, kid.resting_since ? tfmt(kid.resting_since, lang) : kid.rested ? '✓' : '—'], [S.kinds.toilet, kid.last_toilet_at ? tfmt(kid.last_toilet_at, lang) : '—'], [S.kinds.mood, kid.feeling ? (Q[kid.feeling] || kid.feeling) : '—']];
        return { title: `${kid.first} ${kid.last_initial || ''}`.trim(), href: M.staffLink('child', arg, ctx),
          html: `<div class="sv2-dr-kid">${av(arg, kidsAv.get(arg), 96)}<p><span class="ffs-chip">${esc(stateWord[kid.state] || kid.state)}</span></p></div>
            <ul class="sv2-drdots">${dots.map(([l, v]) => `<li><b>${esc(l)}</b><span>${esc(v)}</span></li>`).join('')}</ul>
            ${a ? `<h3>${esc(S.alerts)}</h3><ul class="ffs-list">${(a.alerts || []).map((z) => `<li class="ffs-row"><span class="ffs-dot ffs-t-${z.severity === 'life_threatening' ? 'bad' : 'gold'}">${icon('alert')}</span><span class="ffs-row-t"><b>${esc(M.shortName(z.label))}</b><span>${esc(M.shortName(z.action_plan || z.reaction || ''))}</span></span></li>`).join('')}</ul>` : ''}
            ${(x.pickup || []).filter((p) => p.kid === arg).length ? `<h3>${esc(S.pickupList)}</h3><ul class="ffs-list">${x.pickup.filter((p) => p.kid === arg).map((p) => `<li class="ffs-row"><span class="ffs-dot ffs-t-booker">${icon('pickup')}</span><span class="ffs-row-t"><b>${esc(M.shortName(p.name))}</b><span>${esc(p.relationship || p.kind)}</span></span></li>`).join('')}</ul>` : ''}` };
      }
      if (k === 'kpi') {
        const rows = (pick) => tableHtml(esc, { head: [S.children, ''], rows: (d.kids || []).map((z) => [`${z.first} ${z.last_initial || ''}`, pick(z)]) });
        if (arg === 'present') return { title: S.kPresent, href: M.staffLink('arrivals', null, ctx), html: `<div class="sv2-dr-hero">${glowRingSvg(M.frac(T.here, T.enrolled), { tone: 'booker', size: 150, stroke: 14 })}<p><b class="ffs-big">${T.here}/${T.enrolled}</b><br>${esc(T.ratio.ratio ? S.ratioChip(T.ratio.ratio, T.ratio.required ?? 0) : S.ratioNc)}</p></div>
          ${T.ratio.citation ? `<p class="ffs-note">${esc(T.ratio.citation)}</p>` : ''}${rows((z) => stateWord[z.state] || z.state)}` };
        if (arg === 'meals') return { title: S.kMeals, href: M.staffLink('today', null, ctx), html: `<div class="sv2-dr-hero">${glowRingSvg(M.frac(T.meals.logged, T.meals.of), { tone: 'zuri', size: 150, stroke: 14 })}<p><b class="ffs-big">${T.meals.logged}/${T.meals.of}</b></p></div>${rows((z) => (z.meals || []).join(', ') || '—')}` };
        if (arg === 'naps') return { title: S.kNaps, href: M.staffLink('today', null, ctx), html: `<div class="sv2-dr-hero">${glowRingSvg(M.frac(T.naps.done, T.naps.of), { tone: 'lumi', size: 150, stroke: 14 })}<p><b class="ffs-big">${T.naps.done}/${T.naps.of}</b><br>${esc(S.kNapsSub(T.naps.resting))}</p></div>${rows((z) => (z.resting_since ? tfmt(z.resting_since, lang) : z.rested ? '✓' : '—'))}` };
        if (arg === 'checks') return { title: S.kChecks, href: M.staffLink('grades', null, ctx), html: `<div class="sv2-dr-hero">${glowRingSvg(T.checks.of ? M.frac(T.checks.done, T.checks.of) : null, { tone: 'bop', size: 150, stroke: 14 })}<p>${T.checks.of ? `<b class="ffs-big">${T.checks.done}/${T.checks.of}</b>` : esc(S.nc)}</p></div>${todoList(['observe', 'flagged', 'draft'])}<p class="ffs-note">${esc(S.countsOnly)}</p>` };
      }
      return null;
    }

    // ---- assemble ----
    const sh = createShell({ rootId: 'sv2', views: M.TEACHER_VIEWS, words: S, phoneBar: M.TEACHER_BAR, esc, live, buildView, drawer, motionOn,
      afterBuild: (id, el) => { bindPlan(el); bindQuick(el.querySelector('#sv2-quick-inline .sv2-qform')); if (id === 'me') clock.bind(); } });
    const actions = `<nav class="ffs-actions" id="sv2Actions" aria-label="${esc(S.actions)}">
      ${actionHtml('qaLog', drawerHref('log'), 'pulse', S.quickLog, S.kinds.meal, 'ffs-action-gold', 'log')}
      ${M.staffLink('chat', null, ctx) ? actionHtml('qaChat', M.staffLink('chat', null, ctx), 'chat', S.chat, S.short.messages) : ''}
      ${M.staffLink('incident', null, ctx) ? actionHtml('qaIncident', `/c/${c.slug}/incident`, 'incident', lang === 'es' ? 'Reporte de incidente' : 'Incident report', lang === 'es' ? 'Incidente' : 'Incident') : ''}
      ${M.staffLink('sub', null, ctx) ? actionHtml('qaSub', M.staffLink('sub', null, ctx), 'doc', S.subSheet, lang === 'es' ? 'Suplente' : 'Sub') : ''}
      ${actionHtml('qaClassic', M.staffLink('classic', null, ctx), 'grid', lang === 'es' ? 'Inicio clásico' : 'Classic home', lang === 'es' ? 'Clásico' : 'Classic')}</nav>`;
    const badges = attn.length ? { messages: { n: attn.length, label: S.attentionN(attn.length) } } : {};
    const html = `<div class="ffs ffs-teacher" id="sv2" data-view="${esc(sh.ui.view)}" data-room="${esc(room || '')}">
      ${sh.railHtml({ actions, badges })}
      <div class="ffs-stage" id="sv2Stage">${sh.barHtml()}<div class="ffs-mobile-actions">${actions.replace('id="sv2Actions"', 'id="sv2ActionsM"').split('id="qa').join('id="qam')}</div>${sh.viewsHtml()}</div>
      ${sh.tabbarHtml()}<p class="ffs-sr" role="status" id="sv2-live"></p></div>`;
    page(frame(html), c.name, { english: lang !== 'es' });
    hostUp();
    sh.bind();
    void tabs;
    function bindPlan(el) {
      el.querySelectorAll('[data-done]').forEach((b) => { b.onclick = async () => {
        const p = x.plan; if (!p) return;
        const blk = p.blocks.find((z) => z.key === b.dataset.done); if (!blk) return;
        const next = blk.status === 'done' ? 'planned' : 'done';
        b.disabled = true;
        try {
          const saved = await rpc('plan_mark_save', { p_center: c.center_id, p_room: room, p_day: p.id, p_block: blk.key, p_status: next, p_moved_to: null, p_note: blk.note || null, p_materials: null });
          blk.status = saved?.status || next;
          b.setAttribute('aria-pressed', String(blk.status === 'done')); b.className = `ffs-btn ${blk.status === 'done' ? 'ffs-btn-soft' : 'ffs-btn-navy'} sv2-done`;
          b.innerHTML = blk.status === 'done' ? `${icon('check')}${esc(S.doneMark)}` : esc(S.markDone); b.closest('li')?.classList.toggle('is-done', blk.status === 'done');
          live(`${blk.label}: ${blk.status === 'done' ? S.doneMark : S.markDone}`);
        } catch (e) { const m = document.getElementById('sv2PlanMsg'); if (m) m.textContent = friendly(e); }
        b.disabled = false;
      }; });
    }
  }
  // today's plan for a room: the curriculum day from the center calendar + pacing (plan-core.js), its blocks, the room's marks
  async function loadPlan(c, room) {
    const [st, seq] = await Promise.all([rpc('plan_settings_get', { p_center: c.center_id }), api(c, '/api/curriculum/sequence')]);
    const date = centerToday();
    const r = (st.rooms || []).find((x) => x.id === room) || {};
    const p = planFor(date, { start: st.calendar?.start_date || null, includeReview: st.calendar ? st.calendar.include_review : true, closed: [...(st.closed || []), ...(st.holidays || [])], offset: r.offset || 0 }, seq.days);
    if (p.status !== 'ok') return { status: p.status, why: { weekend: 'Weekend', closed: p.label || 'Closed', no_calendar: 'No curriculum calendar yet' }[p.status] || null };
    const [plan, marks] = await Promise.all([api(c, `/api/curriculum/plan/${enc(p.id)}`), rpc('plan_marks_get', { p_center: c.center_id, p_room: room, p_days: [p.id] })]);
    const mk = (key) => (marks || []).find((m) => m.block === key) || { status: 'planned' };
    const pillar = String(plan.pillar || plan.lead_pillar || '').toUpperCase() || null;
    return { status: 'ok', id: p.id, title: plan.title || p.theme || '', pillar, blocks: (plan.blocks || []).map((b) => ({ key: b.key, label: b.label, minutes: b.minutes, status: mk(b.key).status, note: mk(b.key).note })) };
  }

  // =====================================================================================================================
  // DIRECTOR
  // =====================================================================================================================
  async function viewDirector(c, frame, opts) {
    const { lang = 'en', allowed, tabs = [], firstName = null, clockCard } = opts;
    const S = M.sw(lang);
    page(frame(skeleton(S.center)), c.name, { english: lang !== 'es' });
    hostUp();
    const cid = c.center_id, today = centerToday();
    const monthStart = `${today.slice(0, 8)}01`;
    const back = (n) => { const x = new Date(`${today}T12:00:00Z`); x.setUTCDate(x.getUTCDate() - n); return x.toISOString().slice(0, 10); };
    const [dd, spine, crm, funnel, hiring, forecast, due, health, sped, events, punches, invoices, payments, pilot, leads, waitlist, jobs, clock] = await Promise.all([
      src(() => rpc('director_dashboard', { p_center: cid })),
      loadSpine({ c, rpc, client }).catch(() => null),
      src(() => rpc('crm_desk_summary', { p_center: cid })),
      src(() => rpc('crm_funnel', { p_center: cid, p_from: back(60), p_to: today })),
      src(() => rpc('hiring_summary', { p_center: cid })),
      src(() => rpc('hiring_staffing_forecast', { p_center: cid })),
      src(() => rpc('compliance_due', { p_center: cid })),
      src(() => rpc('health_compliance', { p_center: cid })),
      src(() => rpc('sped_caseload', { p_center: cid })),
      src(async () => unwrap(await client().from('attendance_events').select('kid, kind, at, date, room').eq('center_id', cid).gte('date', monthStart).lte('date', today).limit(5000))),
      src(async () => unwrap(await client().from('staff_time_punches').select('user_id, in_at, out_at, voided_at').eq('center_id', cid).gte('in_at', new Date(Date.now() - 20 * 3600e3).toISOString()).limit(500))),
      src(async () => unwrap(await client().from('invoices').select('id, kid, invoice_no, status, family_cents, invoice_date, due_date').eq('center_id', cid).gte('invoice_date', back(75)).limit(2000))),
      src(async () => unwrap(await client().from('payments').select('invoice_id, kind, amount_cents, received_on').eq('center_id', cid).gte('received_on', back(120)).limit(4000))),
      src(async () => unwrap(await client().from('content_pilot_centers').select('enabled, note').eq('center_id', cid).maybeSingle())),
      src(() => rpc('crm_leads_list', { p_center: cid, p_stage: 'open', p_q: null, p_limit: 12 })),
      src(() => rpc('crm_waitlist_list', { p_center: cid })),
      src(() => rpc('hiring_jobs_list', { p_center: cid })),
      clockCard ? clockCard(c).catch(() => ({ html: '', bind() {} })) : Promise.resolve({ html: '', bind() {} }),
    ]);
    const D = M.ok(dd);
    const sp = spine?.src || {};
    const capRows = sp.capacity?.ok ? sp.capacity.data : null;
    const onDuty = Array.isArray(D?.on_duty) ? D.on_duty : sp.whosIn?.ok ? sp.whosIn.data : null;
    const ratio = M.centerRatio(D?.rooms, onDuty);
    const enrollK = M.enrollmentKpi(capRows);
    const attK = M.attendanceKpi(D?.rooms);
    const cash = M.cashModel(M.ok(invoices), M.ok(payments), monthStart, today);
    const fun = M.funnelModel(M.ok(funnel));
    const enrolledTotal = attK?.enrolled ?? enrollK?.enrolled ?? null;
    const heat = M.heatModel(M.ok(events), enrolledTotal, monthStart, today, (D?.closures || []).filter((x) => x.status === 'closed').map((x) => x.day));
    const staffing = M.staffingModel(M.ok(events)?.filter((e) => e.date === today), M.ok(punches), D?.rooms, minutesOf, centerMinutes());
    const countdown = M.countdownModel(M.ok(due));
    const ctx = { slug: c.slug, allowed };
    const attn = M.directorAttention({ ratio, due: M.ok(due), family: D?.family, exceptions: sp.exceptions?.ok ? sp.exceptions.data : [], health: M.ok(health), cash, crm: M.ok(crm),
      intakes: sp.intakes?.ok ? sp.intakes.data : [], hiring: M.ok(hiring) }, ctx, lang);
    const hour = Math.floor(centerMinutes() / 60);
    const me = (await session().catch(() => null))?.user?.id;
    const meRow = sp.staff?.ok ? (sp.staff.data || []).find((p) => p.user_id === me) : null;
    const meName = M.shortName(meRow?.full_name || '').trim();
    const hi = meName && !/@/.test(meName) ? meName.split(/\s+/)[0] : firstName;
    const fc = M.ok(forecast);
    const scheduled = fc?.totals?.scheduled_fte ?? null;

    // ---- the six living infographics (each: picture + summary + "Show as table") ----
    // right: the "open the full page" link; on the overview it shrinks to its arrow (the words stay for screen readers)
    const fig = (id, title, ic, sub, art, summary, table, right = '') => `<section class="ffs-card sv2-fig" id="${id}">${cardHead(title, ic, right)}<p class="ffs-sub">${esc(sub)}</p>${art == null ? ncHtml(S) : figureHtml(esc, { id: `${id}F`, words: S, summary, art, table })}</section>`;
    const flink = (href, label) => (href ? `<a class="ffs-link sv2-figlink" href="${esc(href)}" data-nav><span class="sv2-figlbl">${esc(label)}</span>${icon('arrow')}</a>` : '');
    const boardFig = () => fig('figBoard', S.board, 'ratio', S.boardSub, ratio.rooms.length ? `<ul class="sv2-board${ratio.rooms.length > 2 ? ' sv2-board-2' : ''}">${ratio.rooms.map((r) => `<li class="sv2-br sv2-br-${r.tone}">
        <a class="sv2-br-a" href="${esc(drawerHref(`room:${r.id}`))}" data-drawer="room:${esc(r.id)}"><b>${esc(r.name)}</b>
        <span class="sv2-br-bar">${glowBarHtml(M.frac(r.present, r.capacity || r.enrolled), r.tone === 'bad' ? 'warn' : 'booker')}</span>
        <span class="sv2-br-n">${r.present}<small>/${r.capacity ?? r.enrolled ?? '—'}</small></span>
        <span class="sv2-br-t">${r.ratio ? `${esc(r.ratio)} · ${'<i class="sv2-tch"></i>'.repeat(Math.min(6, r.required || 0))}${r.required ?? '—'}` : esc(S.nc)}</span></a></li>`).join('')}</ul>` : null,
      `${S.board}: ${ratio.rooms.map((r) => `${r.name} ${r.present} ${S.here}, ${r.required ?? '?'} ${S.need}`).join('; ')}`,
      tableHtml(esc, { head: [S.views.rooms, S.here, lang === 'es' ? 'Capacidad' : 'Capacity', 'Ratio', S.need], rows: ratio.rooms.map((r) => [r.name, r.present, r.capacity ?? '—', r.ratio || S.nc, r.required ?? '—']) }),
      flink(M.staffLink('today', null, ctx), S.views.rooms));
    // the funnel stands up: one glowing column per stage (its height = families who reached it), the count on top, the stage below
    const funnelFig = () => fig('figFunnel', S.funnel, 'funnel', S.funnelSub, fun ? `<ol class="sv2-cols">${fun.stages.map((s) => `<li><a href="${esc(M.staffLink('crm-stage', s.stage, ctx) || '#')}" data-nav class="sv2-col-a" aria-label="${esc(`${S.stages[s.stage]}: ${s.reached}`)}">
        <b>${s.reached}</b><span class="sv2-col"><span class="sv2-col-fill ffs-pop" data-h="${Math.max(4, Math.round((s.frac || 0) * 100))}"></span></span><span class="sv2-col-l">${esc(S.stages[s.stage])}</span></a></li>`).join('')}</ol>` : null,
      fun ? `${S.funnel}: ${fun.stages.map((s) => `${S.stages[s.stage]} ${s.reached}`).join(', ')}` : '',
      fun ? tableHtml(esc, { head: [S.stage, lang === 'es' ? 'Llegaron' : 'Reached', lang === 'es' ? 'Ahora' : 'Now'], rows: fun.stages.map((s) => [S.stages[s.stage], s.reached, s.now]) }) : '',
      flink(M.staffLink('crm', 'funnel', ctx), S.openFull));
    const heatFig = () => {
      if (!heat) return fig('figHeat', S.heat, 'calendar', S.heatSub, null);
      const first = heat.days[0]?.dow || 1;
      const cells = [...Array(first - 1).fill('<span class="sv2-hc sv2-hc-pad" aria-hidden="true"></span>'), ...heat.days.map((x2) => {
        const lvl = x2.frac == null ? '' : x2.frac >= 0.92 ? 'h4' : x2.frac >= 0.85 ? 'h3' : x2.frac >= 0.75 ? 'h2' : 'h1';
        return `<span class="sv2-hc ffs-pop sv2-hc-${x2.state} ${lvl ? `sv2-lv${lvl.slice(1)}` : ''}" title="${esc(`${dfmt(x2.day, lang)}: ${x2.frac == null ? (x2.state === 'closed' ? S.closed : '—') : `${x2.n}/${x2.of}`}`)}">${Number(x2.day.slice(8))}</span>`; })];
      return fig('figHeat', `${S.heatShort}${heat.avg != null ? ` · ${heat.avg}%` : ''}`, 'calendar', S.heatSub, `<div class="sv2-heat"><div class="sv2-heat-h">${(lang === 'es' ? ['L', 'M', 'M', 'J', 'V'] : ['M', 'T', 'W', 'T', 'F']).map((w) => `<span>${w}</span>`).join('')}</div><div class="sv2-heat-g">${cells.join('')}</div>
        ${heat.avg != null ? `<p class="sv2-heat-avg"><b class="ffs-gl-t-zuri">${heat.avg}%</b> ${esc(lang === 'es' ? 'promedio del mes' : 'month average')}</p>` : ''}</div>`,
        `${S.heat}: ${heat.avg ?? '—'}%`, tableHtml(esc, { head: [S.day, S.here, S.share], rows: heat.days.filter((x2) => x2.frac != null).map((x2) => [dfmt(x2.day, lang), `${x2.n}/${x2.of}`, `${Math.round(x2.frac * 100)}%`]) }),
        flink(M.staffLink('tab', 'arrivals', ctx), S.openFull));
    };
    const cashFig = () => {
      if (!cash) return fig('figCash', S.cash, 'tuition', S.cashSub, null);
      const W = 260, H = 96, max = Math.max(1, ...cash.weeks.map((w) => Math.max(w.billed, w.collected)));
      const bw = Math.min(26, (W - 20) / Math.max(1, cash.weeks.length) / 2.4);
      const bars = cash.weeks.map((w, i) => { const x0 = 10 + i * ((W - 20) / Math.max(1, cash.weeks.length)); const hb = Math.round((w.billed / max) * (H - 18)), hc = Math.round((w.collected / max) * (H - 18));
        return `<rect class="sv2-cb ffs-pop" x="${x0.toFixed(1)}" y="${H - 14 - hb}" width="${bw.toFixed(1)}" height="${hb}" rx="4"/><rect class="sv2-cc ffs-pop" x="${(x0 + bw + 3).toFixed(1)}" y="${H - 14 - hc}" width="${bw.toFixed(1)}" height="${hc}" rx="4"/>
          <text class="sv2-ct" x="${(x0 + bw).toFixed(1)}" y="${H - 2}" text-anchor="middle">${esc(dfmt(w.week, lang, { month: 'short', day: 'numeric' }))}</text>`; }).join('');
      return fig('figCash', S.cash, 'tuition', `${S.cashSub} · ${S.directorsOnly}`, `<div class="sv2-cash"><svg class="sv2-cash-svg" viewBox="0 0 ${W} ${H}" aria-hidden="true">${bars}</svg>
        <ul class="sv2-cash-k"><li class="k-b"><span>${esc(S.billed)}</span><b>${esc(M.money(cash.billed, lang))}</b></li><li class="k-c"><span>${esc(S.collected)}</span><b>${esc(M.money(cash.collected, lang))}</b></li><li class="k-o"><span>${esc(S.open)}</span><b>${esc(M.money(cash.open, lang))}</b></li></ul></div>`,
        `${S.billed} ${M.money(cash.billed, lang)}, ${S.collected} ${M.money(cash.collected, lang)}, ${S.open} ${M.money(cash.open, lang)}`,
        tableHtml(esc, { head: [lang === 'es' ? 'Semana' : 'Week', S.billed, S.collected], rows: cash.weeks.map((w) => [dfmt(w.week, lang), M.money(w.billed, lang), M.money(w.collected, lang)]) }),
        flink(M.staffLink('billing', 'invoices', ctx), S.openFull));
    };
    const staffingFig = () => {
      if (!staffing) return fig('figStaff', S.staffing, 'people', S.staffingSub, null);
      const W = 300, H = 110, x0 = 22, x1 = W - 6, y0 = 8, y1 = H - 18, n = staffing.slots.length;
      const X = (i) => x0 + (i * (x1 - x0)) / (n - 1), Y = (v) => y1 - (v / staffing.max) * (y1 - y0);
      const seen = staffing.slots.map((s, i) => ({ ...s, i })).filter((s) => s.need != null);
      const step = (key) => seen.map((s, j) => `${j ? 'L' : 'M'}${X(s.i).toFixed(1)} ${Y(s[key]).toFixed(1)}${j < seen.length - 1 ? `L${X(seen[j + 1].i).toFixed(1)} ${Y(s[key]).toFixed(1)}` : ''}`).join('');
      const area = seen.length ? `${step('need')}L${X(seen[seen.length - 1].i).toFixed(1)} ${y1}L${X(seen[0].i).toFixed(1)} ${y1}Z` : '';
      const ticks = [7, 9, 11, 13, 15, 17].map((h) => { const i = (h * 60 - 7 * 60) / 30; return `<text class="sv2-ct" x="${X(i).toFixed(1)}" y="${H - 4}" text-anchor="middle">${esc(hhmm(h * 60, lang))}</text>`; }).join('');
      const nowI = seen.length ? seen[seen.length - 1].i : null;
      return fig('figStaff', S.staffing, 'people', S.staffingSub, `<svg class="sv2-staff-svg" viewBox="0 0 ${W} ${H}" aria-hidden="true">
          ${[0, 0.5, 1].map((f) => `<line class="sv2-grid" x1="${x0}" x2="${x1}" y1="${(y1 - f * (y1 - y0)).toFixed(1)}" y2="${(y1 - f * (y1 - y0)).toFixed(1)}"/>`).join('')}
          ${area ? `<path class="sv2-need-a" d="${area}"/><path class="sv2-need" d="${step('need')}" data-len="600"/><path class="sv2-on" d="${step('on')}" data-len="600"/>` : ''}
          ${nowI != null ? `<line class="sv2-now" x1="${X(nowI).toFixed(1)}" x2="${X(nowI).toFixed(1)}" y1="${y0}" y2="${y1}"/>` : ''}${ticks}
          <text class="sv2-ct" x="2" y="${(y0 + 6).toFixed(1)}">${staffing.max}</text></svg>
        <ul class="sv2-legend"><li class="lg-need">${esc(S.need)}</li><li class="lg-on">${esc(S.onClock)}</li>${staffing.short ? `<li class="lg-short">${esc(lang === 'es' ? `${staffing.short} medias horas cortas` : `${staffing.short} half-hours short`)}</li>` : ''}</ul>`,
        `${S.staffing}`, tableHtml(esc, { head: [S.time, S.children, S.need, S.onClock], rows: seen.map((s) => [hhmm(s.t, lang), s.children, s.need, s.on]) }),
        flink(M.staffLink('timeclock', null, ctx), S.openFull));
    };
    const countdownFig = () => {
      if (!countdown) return fig('figDue', S.countdown, 'shield', S.countdownSub, null);
      const when = (i) => `${i.days < 0 ? S.overdueD(i.days) : S.dueIn(i.days)}${i.date ? ` · ${dfmt(i.date, lang, { month: 'short', day: 'numeric' })}` : ''}`;
      return fig('figDue', S.countdown, 'shield', S.countdownSub, countdown.items.length ? `<ul class="sv2-cd">${countdown.items.map((i) => `<li class="sv2-cd-${i.days < 0 ? 'over' : i.days <= 7 ? 'soon' : 'ok'}">${glowRingSvg(i.frac, { tone: i.days < 0 ? 'warn' : i.days <= 7 ? 'gold' : 'zuri', size: 48, stroke: 6 })}
          <span class="sv2-cd-t"><b>${esc(i.title)}</b><span class="sv2-cd-when">${esc(when(i))}</span></span></li>`).join('')}</ul>` : `<p class="ffs-empty">${esc(S.allClear)}</p>`,
        `${S.countdown}: ${countdown.items.map((i) => `${i.title}, ${when(i)}`).join('; ')}`,
        tableHtml(esc, { head: [S.item, S.daysLeft, lang === 'es' ? 'Cita' : 'Citation'], rows: countdown.items.map((i) => [i.title, when(i), i.citation || '']) }),
        flink(M.staffLink('compliance', null, ctx), S.openFull));
    };

    function buildView(id) {
      const P = (tab, html, cls) => sh.panel(id, tab, html, cls);
      if (id === 'overview') {
        const roomsRow = ratio.rooms.length ? `<ul class="sv2-glance" aria-label="${esc(S.roomsGlance)}">${ratio.rooms.map((r) => `<li><a class="sv2-gl sv2-gl-${r.tone}" href="${esc(drawerHref(`room:${r.id}`))}" data-drawer="room:${esc(r.id)}">
          ${glowRingSvg(M.frac(r.present, r.enrolled), { tone: r.tone === 'bad' ? 'warn' : 'booker', size: 40, stroke: 5 })}<span><b>${esc(r.name.replace(/\s+Room$/i, ''))}</b><span>${r.present}/${r.enrolled ?? '—'}${r.ratio ? ` · ${esc(r.ratio)}` : ''}</span></span></a></li>`).join('')}</ul>` : '';
        const ratioPill = ratio.tone === 'nc' ? `<span class="ffs-pillbtn ffs-pill-nc"><span class="ffs-pill-ico">${icon('ratio')}</span><span class="ffs-pill-t"><b>${esc(S.ratioNc)}</b></span></span>`
          : `<a class="ffs-pillbtn ffs-pill-${ratio.short ? 'bad' : 'ok'}" href="${esc(sh.viewHref('rooms', 'staffing'))}" data-view="rooms" data-tab="staffing" id="sv2RatioPill"><span class="ffs-pill-ico">${icon('ratio')}</span><span class="ffs-pill-t"><b>${esc(ratio.short ? S.needStaff(ratio.short) : S.allInRatio)}</b><span>${esc(S.staffOn(ratio.staff))} · ${ratio.required} ${esc(S.need.toLowerCase())}</span></span></a>`;
        const hero = heroHtml({ c, S, cls: 'sv2-hero-dir', friend: 'zuri-pointing', hello: `${S.hello[M.daypart(hour)]}${hi ? `, ${hi}` : ''}`,
          date: `${c.name.replace(/^TEST\s+/i, '')} · ${new Date().toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: centerTz() })}`, row: `${ratioPill}${roomsRow}` });
        const kpis = `<div class="ffs-kpis" id="sv2Kpis">
          ${kpiHtml({ id: 'sv2-kpi-enroll', tone: 'booker', ic: 'people', label: S.kEnroll, f: enrollK?.frac ?? null, big: enrollK?.capacity != null ? ratioBig(enrollK.enrolled, enrollK.capacity) : `<span class="ffs-big-nc">${esc(S.nc)}</span>`, sub: enrollK?.capacity != null ? S.kEnrollSub(enrollK.capacity) : (lang === 'es' ? 'sin capacidad registrada' : 'no capacity on file'), drawer: 'kpi:enroll', gl: enrollK?.capacity != null })}
          ${kpiHtml({ id: 'sv2-kpi-attend', tone: 'zuri', ic: 'check', label: S.kAttend, f: attK?.frac ?? null, big: attK ? ratioBig(attK.here, attK.enrolled) : `<span class="ffs-big-nc">${esc(S.couldNot)}</span>`, sub: attK ? S.kAttendSub(attK.enrolled) : '', drawer: 'kpi:attend', gl: !!attK })}
          ${kpiHtml({ id: 'sv2-kpi-staff', tone: ratio.short ? 'warn' : 'lumi', ic: 'badge', label: S.kStaff, f: ratio.required ? M.frac(ratio.staff, ratio.required) : null, big: ratio.staff != null ? `${countHtml(ratio.staff)}${ratio.required != null ? `<span class="sv2-badge sv2-badge-${ratio.short ? 'bad' : 'ok'}">${esc(ratio.short ? S.short2(ratio.short) : ratio.staff > ratio.required ? S.extra(ratio.staff - ratio.required) : '✓')}</span>` : ''}` : `<span class="ffs-big-nc">${esc(S.couldNot)}</span>`,
            sub: ratio.required != null ? S.staffBig(ratio.staff ?? '—', ratio.required) : S.nc, drawer: 'kpi:staff' })}
          ${kpiHtml({ id: 'sv2-kpi-tuition', tone: 'gold', ic: 'tuition', label: S.kTuition, f: cash?.frac ?? null, big: cash ? `<span class="sv2-money">${esc(M.money(cash.collected, lang))}</span>` : `<span class="ffs-big-nc">${esc(S.nc)}</span>`, sub: `${cash ? S.kTuitionSub(M.money(cash.billed, lang)) : S.nc} · ${S.directorsOnly}`, drawer: 'kpi:tuition' })}</div>`;
        return `<div class="ffs-grid sv2-cockpit sv2-dir">${hero}${bandHtml(attn, S)}${kpis}
          <div class="sv2-figs">${boardFig()}${funnelFig()}${heatFig()}${cashFig()}${staffingFig()}${countdownFig()}</div>
          ${pillarsHtml([
            { f: 'booker', word: 'LEARN', ic: 'book', sub: S.views.rooms, href: sh.viewHref('rooms'), drawer: 'rooms' },
            { f: 'lumi', word: 'BELONG', ic: 'heart', sub: S.views.families, href: sh.viewHref('families'), drawer: 'families' },
            { f: 'zuri', word: 'EXPLORE', ic: 'star', sub: S.views.compliance, href: sh.viewHref('compliance'), drawer: 'compliance' },
            { f: 'bop', word: 'MOVE', ic: 'pulse', sub: S.views.staff, href: sh.viewHref('staff'), drawer: 'staff' }], 'ffs-pillars-slim', S.tagline)}</div>`;
      }
      if (id === 'rooms') {
        return P('board', `<div class="ffs-two">${boardFig()}<section class="ffs-card">${cardHead(S.roomsGlance, 'room', link(M.staffLink('today', null, ctx), `${esc(S.openFull)}${icon('arrow')}`))}
            ${D ? `<div class="ffs-tblwrap">${tableHtml(esc, { head: [S.views.rooms, S.here, lang === 'es' ? 'Cuidado registrado' : 'Care logged', lang === 'es' ? 'Informes' : 'Reports'], rows: (D.rooms || []).map((r) => [r.name, `${r.attendance?.here ?? 0}/${r.enrolled}`, r.children_logged, `${r.reports_published}`]) })}</div>` : ncHtml(S)}</section></div>`)
          + P('staffing', `<div class="ffs-two">${staffingFig()}<section class="ffs-card">${cardHead(lang === 'es' ? 'Pronóstico de personal' : 'Staffing forecast', 'people', link(M.staffLink('hiring', 'forecast', ctx), `${esc(S.openFull)}${icon('arrow')}`))}
            ${fc ? `<div class="ffs-tblwrap">${tableHtml(esc, { head: [S.views.rooms, 'Ratio', lang === 'es' ? 'FTE necesarios' : 'FTE needed', lang === 'es' ? 'Programados' : 'Scheduled'], rows: (fc.rooms || []).map((r) => [r.room_name, r.ratio || '—', r.fte_needed ?? '—', r.scheduled_fte ?? '—']) })}</div><p class="ffs-note">${esc(fc.note || '')}</p>` : ncHtml(S)}</section></div>`)
          + P('attendance', `<div class="ffs-two">${heatFig()}<section class="ffs-card">${cardHead(S.tabs.absences, 'pickup', '')}${absenceList(D?.absences)}</section></div>`);
      }
      if (id === 'families') {
        const cs = M.ok(crm), wl = M.ok(waitlist), ls = M.ok(leads);
        const intakes = sp.intakes?.ok ? sp.intakes.data : null;
        return P('pipeline', `<div class="ffs-two">${funnelFig()}<section class="ffs-card">${cardHead(lang === 'es' ? 'Familias abiertas' : 'Open families', 'people', link(M.staffLink('crm', 'pipeline', ctx), `${esc(S.openFull)}${icon('arrow')}`))}
            ${cs ? `<p class="sv2-stats">${[[cs.open, lang === 'es' ? 'abiertas' : 'open'], [cs.new_7d, lang === 'es' ? 'nuevas en 7 días' : 'new in 7 days'], [cs.tours_next_7d, lang === 'es' ? 'visitas en 7 días' : 'tours in 7 days'], [cs.offers_open, lang === 'es' ? 'ofertas' : 'offers out']].map(([n, l]) => `<span><b>${n ?? '—'}</b> ${esc(l)}</span>`).join('')}</p>` : ncHtml(S)}
            ${ls ? `<ul class="ffs-list">${ls.slice(0, 7).map((l) => `<li><a class="ffs-row" href="${esc(M.staffLink('lead', l.id, ctx))}" data-nav><span class="ffs-dot ffs-t-${l.sla_overdue ? 'bad' : 'booker'}">${icon('people')}</span><span class="ffs-row-t"><b>${esc(M.shortName(l.family_name))}</b><span>${esc(S.stages[l.stage] || l.stage)}${l.child_first ? ` · ${esc(l.child_first)}` : ''}</span></span>${l.sla_overdue ? `<span class="ffs-chip ffs-chip-bad">SLA</span>` : ''}${icon('arrow')}</a></li>`).join('')}</ul>` : ''}</section></div>`)
          + P('enrollment', `<section class="ffs-card">${cardHead(S.tabs.enrollment, 'doc', link(M.staffLink('enroll', null, ctx), `${esc(S.openFull)}${icon('arrow')}`))}
            ${intakes ? `<ul class="ffs-list">${intakes.map((i) => `<li><a class="ffs-row" href="${esc(M.staffLink('enroll', null, ctx))}" data-nav><span class="ffs-dot ffs-t-${i.status === 'submitted' ? 'gold' : 'navy'}">${icon('doc')}</span><span class="ffs-row-t"><b>${esc(M.shortName(i.child_first))}</b><span>${esc(i.status)}${i.room ? ` · ${esc(i.room)}` : ''}</span></span>${icon('arrow')}</a></li>`).join('') || `<li class="ffs-empty">—</li>`}</ul>` : ncHtml(S)}</section>`)
          + P('waitlist', `<section class="ffs-card">${cardHead(S.tabs.waitlist, 'pickup', link(M.staffLink('crm', 'waitlist', ctx), `${esc(S.openFull)}${icon('arrow')}`))}
            ${wl ? `<ul class="ffs-list">${(wl.entries || []).map((w) => `<li><a class="ffs-row" href="${esc(M.staffLink('lead', w.lead_id, ctx))}" data-nav><span class="sv2-place">${esc(w.place ?? '')}</span><span class="ffs-row-t"><b>${esc(M.shortName(w.family_name))}</b><span>${esc(w.child_first || '')} · ${esc(w.wanted_room || '')} · ${esc(w.status)}</span></span>${icon('arrow')}</a></li>`).join('') || `<li class="ffs-empty">—</li>`}</ul>
              <p class="sv2-stats">${(wl.rooms || []).map((r) => `<span><b>${r.free_seats ?? '—'}</b> ${esc(lang === 'es' ? 'lugares libres en' : 'free seats in')} ${esc(r.name)}</span>`).join('')}</p>` : ncHtml(S)}</section>`)
          + P('messages', `<section class="ffs-card">${cardHead(lang === 'es' ? 'Mensajes de las familias' : 'Family messages', 'chat', link(M.staffLink('chat', null, ctx), `${esc(S.openFull)}${icon('arrow')}`))}
            ${D ? `<p class="sv2-stats"><span><b>${D.family?.unread ?? 0}</b> ${esc(lang === 'es' ? 'sin leer' : 'unread')}</span><span><b>${D.family?.unread_old ?? 0}</b> ${esc(lang === 'es' ? 'de más de 4 h' : 'older than 4 h')}</span><span><b>${D.family?.help_open_total ?? 0}</b> ${esc(lang === 'es' ? 'preguntas abiertas' : 'help questions open')}</span></p>
            <ul class="ffs-list">${(D.family?.help_open || []).map((t) => `<li><a class="ffs-row" href="${esc(M.staffLink('help', t.id, ctx))}" data-nav><span class="ffs-dot ffs-t-booker">${icon('chat')}</span><span class="ffs-row-t"><b>${esc(t.subject)}</b></span>${icon('arrow')}</a></li>`).join('')}</ul>` : ncHtml(S)}</section>`);
      }
      if (id === 'staff') {
        const hs = M.ok(hiring), js = M.ok(jobs);
        const ex = sp.exceptions?.ok ? sp.exceptions.data : null;
        return P('onduty', `<div class="ffs-two"><section class="ffs-card">${cardHead(S.tabs.onduty, 'clock', link(M.staffLink('timeclock', null, ctx), `${esc(S.openFull)}${icon('arrow')}`))}
            ${onDuty ? `<ul class="ffs-list">${onDuty.map((p) => `<li class="ffs-row"><span class="ffs-dot ffs-t-zuri">${icon('badge')}</span><span class="ffs-row-t"><b>${esc(M.shortName(p.name))}</b><span>${esc(tfmt(p.in_at, lang))}</span></span>${p.missing_out ? `<span class="ffs-chip ffs-chip-bad">20 h</span>` : '<span class="ffs-live-dot" aria-hidden="true"></span>'}</li>`).join('') || `<li class="ffs-empty">—</li>`}</ul>` : ncHtml(S)}</section>${staffingFig()}</div>`)
          + P('hiring', `<section class="ffs-card">${cardHead(S.tabs.hiring, 'people', link(M.staffLink('hiring', 'pipeline', ctx), `${esc(S.openFull)}${icon('arrow')}`))}
            ${hs ? `<p class="sv2-stats"><span><b>${hs.open_jobs}</b> ${esc(lang === 'es' ? 'puestos abiertos' : 'open jobs')}</span><span><b>${hs.interviews_week}</b> ${esc(lang === 'es' ? 'entrevistas esta semana' : 'interviews this week')}</span><span><b>${hs.offers_waiting}</b> ${esc(lang === 'es' ? 'ofertas esperando' : 'offers waiting')}</span><span><b>${hs.to_hire}</b> ${esc(lang === 'es' ? 'por contratar' : 'to hire')}</span></p>
              <ol class="sv2-funnel sv2-funnel-sm">${['applied', 'screening', 'interview', 'offer', 'background', 'hired'].map((k) => `<li><span class="sv2-fn-a"><span class="sv2-fn-l">${esc(k)}</span><span class="sv2-fn-bar"><span class="sv2-fn-fill" data-w="${Math.max(4, Math.min(100, (hs.active?.[k] || 0) * 25))}"></span></span><b>${hs.active?.[k] || 0}</b></span></li>`).join('')}</ol>` : ncHtml(S)}
            ${js ? `<ul class="ffs-list">${js.map((j) => `<li><a class="ffs-row" href="${esc(`/c/${c.slug}/hiring?view=jobs&job=${enc(j.id)}`)}" data-nav><span class="ffs-dot ffs-t-bop">${icon('badge')}</span><span class="ffs-row-t"><b>${esc(M.shortName(j.title))}</b><span>${esc(j.status)}</span></span>${icon('arrow')}</a></li>`).join('')}</ul>` : ''}</section>`)
          + P('credentials', `<section class="ffs-card">${cardHead(S.tabs.credentials, 'shield', link(M.staffLink('compliance', null, ctx), `${esc(S.openFull)}${icon('arrow')}`))}
            ${ex ? `<ul class="ffs-list">${ex.filter((e) => /^(credential_|clearance_|training_)/.test(e.kind)).map((e) => `<li><a class="ffs-row" href="${esc(M.staffLink('compliance', null, ctx))}" data-nav><span class="ffs-dot ffs-t-${/expired|overdue/.test(e.kind) ? 'bad' : 'gold'}">${icon(/training/.test(e.kind) ? 'learn' : 'badge')}</span><span class="ffs-row-t"><b>${esc(M.shortName(e.subject || ''))}</b><span>${esc(e.title)}</span></span><span class="ffs-row-end">${esc(e.due_date || '')}</span></a></li>`).join('') || `<li class="ffs-empty">${esc(S.allClear)}</li>`}</ul>` : ncHtml(S)}</section>`);
      }
      if (id === 'billing') {
        return P('month', `<div class="ffs-two">${cashFig()}<section class="ffs-card">${cardHead(S.kTuition, 'tuition', link(M.staffLink('billing', 'reports', ctx), `${esc(S.openFull)}${icon('arrow')}`))}
            ${cash ? `<div class="sv2-ringrow">${glowRingSvg(cash.frac, { tone: 'gold', size: 140, stroke: 14 })}<div><p class="ffs-big ffs-gl-t-gold sv2-money">${esc(M.money(cash.collected, lang))}</p><p class="ffs-sub">${esc(S.kTuitionSub(M.money(cash.billed, lang)))}</p><p class="ffs-note">${icon('lock')} ${esc(S.hqNote)}</p></div></div>` : ncHtml(S)}</section></div>`)
          + P('overdue', `<section class="ffs-card">${cardHead(S.pastDue, 'tuition', link(M.staffLink('billing', 'invoices', ctx), `${esc(S.openFull)}${icon('arrow')}`))}
            ${cash ? `<ul class="ffs-list">${cash.pastDueList.map((i) => `<li><a class="ffs-row" href="${esc(M.staffLink('billing', 'invoices', ctx))}" data-nav><span class="ffs-dot ffs-t-bad">${icon('tuition')}</span><span class="ffs-row-t"><b>${esc(i.invoice_no)}</b><span>${esc(dfmt(i.due_date, lang))}</span></span><span class="ffs-row-end">${esc(M.money(i.family_cents, lang))}</span></a></li>`).join('') || `<li class="ffs-empty">${esc(S.allClear)}</li>`}</ul>` : ncHtml(S)}</section>`);
      }
      if (id === 'compliance') {
        const du = M.ok(due);
        return P('due', `<div class="ffs-two">${countdownFig()}<section class="ffs-card">${cardHead(S.tabs.due, 'shield', link(M.staffLink('compliance', null, ctx), `${esc(S.openFull)}${icon('arrow')}`))}
            ${du ? `<ul class="ffs-list">${du.filter((i) => i.bucket !== 'own_records').slice(0, 9).map((i) => `<li><a class="ffs-row" href="${esc(M.staffLink('compliance', null, ctx))}" data-nav><span class="ffs-dot ffs-t-${i.bucket === 'overdue' ? 'bad' : i.bucket === 'due_7' ? 'gold' : 'navy'}">${icon('shield')}</span><span class="ffs-row-t"><b>${esc(i.title)}</b><span>${esc(i.citation || '')}</span></span><span class="ffs-row-end">${esc(i.days_left == null ? (lang === 'es' ? 'falta info' : 'needs info') : i.days_left < 0 ? S.overdueD(i.days_left) : S.dueIn(i.days_left))}</span></a></li>`).join('')}</ul>` : ncHtml(S)}</section></div>`)
          + P('drills', `<section class="ffs-card">${cardHead(S.tabs.drills, 'fire', link(M.staffLink('safety', null, ctx), `${esc(S.openFull)}${icon('arrow')}`))}
            ${du ? `<ul class="ffs-list">${du.filter((i) => i.kind === 'drill' || i.kind === 'incident').map((i) => `<li><a class="ffs-row" href="${esc(M.staffLink(i.kind === 'incident' && i.action?.id ? 'incident' : 'safety', i.action?.id || null, ctx))}" data-nav><span class="ffs-dot ffs-t-${i.bucket === 'overdue' ? 'bad' : 'gold'}">${icon(i.kind === 'drill' ? 'fire' : 'incident')}</span><span class="ffs-row-t"><b>${esc(i.title)}</b><span>${esc(i.detail || '')}</span></span>${icon('arrow')}</a></li>`).join('') || `<li class="ffs-empty">${esc(S.allClear)}</li>`}</ul>` : ncHtml(S)}</section>`)
          + P('records', `<section class="ffs-card">${cardHead(S.tabs.records, 'doc', '')}<ul class="ffs-list">
            ${[['inspector', lang === 'es' ? 'Paquete para la inspección' : 'Inspector packet', 'doc'], ['cacfp', 'CACFP', 'meal'], ['rules', lang === 'es' ? 'Reglas del estado' : 'State rules', 'shield'], ['subsidy', lang === 'es' ? 'Subsidios' : 'Subsidy', 'tuition']].map(([t, l, ic]) => M.staffLink('licensing', t, ctx) ? `<li><a class="ffs-row" href="${esc(M.staffLink('licensing', t, ctx))}" data-nav><span class="ffs-dot ffs-t-navy">${icon(ic)}</span><span class="ffs-row-t"><b>${esc(l)}</b></span>${icon('arrow')}</a></li>` : '').join('')}</ul></section>`);
      }
      if (id === 'health') {
        const hc = M.ok(health), sc = M.ok(sped);
        return P('immunizations', `<section class="ffs-card">${cardHead(S.tabs.immunizations, 'med', link(M.staffLink('health', null, ctx), `${esc(S.openFull)}${icon('arrow')}`))}
            ${hc ? `<p class="sv2-stats"><span><b>${hc.counts?.overdue ?? 0}</b> ${esc(lang === 'es' ? 'vencidos' : 'overdue')}</span><span><b>${hc.counts?.due ?? 0}</b> ${esc(lang === 'es' ? 'pendientes' : 'due')}</span><span><b>${hc.counts?.children ?? 0}</b> ${esc(S.children.toLowerCase())}</span></p>
              <ul class="ffs-list">${(hc.children || []).filter((k) => (k.open || []).length).slice(0, 10).map((k) => `<li><a class="ffs-row" href="${esc(M.staffLink('health', null, { ...ctx, kid: k.kid }))}" data-nav>${av(k.kid, null, 36)}<span class="ffs-row-t"><b>${esc(k.first)} ${esc(k.last || '')}</b><span>${esc((k.open || []).map((o) => o.item.replace(/_/g, ' ')).join(' · '))}</span></span>${icon('arrow')}</a></li>`).join('')}</ul>` : ncHtml(S)}</section>`)
          + P('meds', `<section class="ffs-card">${cardHead(S.tabs.meds, 'med', link(M.staffLink('mar', null, ctx), `${esc(S.openFull)}${icon('arrow')}`))}
            ${hc ? `<p class="sv2-stats"><span><b>${hc.counts?.meds_active ?? 0}</b> ${esc(lang === 'es' ? 'medicinas activas' : 'active medicines')}</span><span><b>${hc.counts?.doses_today ?? 0}</b> ${esc(lang === 'es' ? 'dosis hoy' : 'doses today')}</span><span><b>${hc.counts?.doses_recorded_today ?? 0}</b> ${esc(lang === 'es' ? 'registradas' : 'recorded')}</span><span><b>${hc.counts?.meds_to_sign ?? 0}</b> ${esc(lang === 'es' ? 'por firmar' : 'to sign')}</span></p>` : ncHtml(S)}</section>`)
          + P('sped', `<section class="ffs-card">${cardHead(S.tabs.sped, 'doc', link(M.staffLink('sped', null, ctx), `${esc(S.openFull)}${icon('arrow')}`))}
            ${sc ? `<p class="sv2-stats"><span><b>${sc.iep}</b> IEP</span><span><b>${sc.ifsp}</b> IFSP</span><span><b>${sc.meetings_14}</b> ${esc(lang === 'es' ? 'reuniones en 14 días' : 'meetings in 14 days')}</span><span><b>${sc.reviews_30}</b> ${esc(lang === 'es' ? 'revisiones en 30 días' : 'reviews in 30 days')}</span><span><b>${sc.consent_missing}</b> ${esc(lang === 'es' ? 'sin consentimiento' : 'consent missing')}</span></p>
              <ul class="ffs-list">${[...(sc.meeting_dates || []).map((x2) => [x2, lang === 'es' ? 'Reunión' : 'Meeting']), ...(sc.review_dates || []).map((x2) => [x2, lang === 'es' ? 'Revisión anual' : 'Annual review'])].map(([dd2, l]) => `<li class="ffs-row"><span class="ffs-dot ffs-t-bop">${icon('calendar')}</span><span class="ffs-row-t"><b>${esc(l)}</b><span>${esc(dfmt(dd2, lang))}</span></span></li>`).join('')}</ul><p class="ffs-note">${esc(S.countsOnly)}</p>` : ncHtml(S)}</section>`);
      }
      if (id === 'calendar') {
        return P('upcoming', `<section class="ffs-card">${cardHead(S.upcoming, 'calendar', link(M.staffLink('calendar', null, ctx), `${esc(S.openFull)}${icon('arrow')}`))}
            ${(D?.closures || []).length ? `<ul class="ffs-list">${D.closures.map((x2) => `<li><a class="ffs-row" href="${esc(M.staffLink('closure', x2.day, ctx))}" data-nav><span class="ffs-dot ffs-t-${x2.status === 'early' ? 'gold' : 'navy'}">${icon('calendar')}</span><span class="ffs-row-t"><b>${esc(dfmt(x2.day, lang, { weekday: 'long', month: 'long', day: 'numeric' }))}</b><span>${esc(x2.status === 'early' ? S.early : S.closed)} · ${esc(x2.label || '')}</span></span>${icon('arrow')}</a></li>`).join('')}</ul>` : `<p class="ffs-empty">${esc(S.noClosures)}</p>`}</section>`)
          + P('absences', `<section class="ffs-card">${cardHead(S.tabs.absences, 'pickup', '')}${absenceList(D?.absences)}</section>`);
      }
      if (id === 'content') {
        const f = D?.family || {}, pl = M.ok(pilot);
        return P('waiting', `<section class="ffs-card">${cardHead(S.tabs.waiting, 'video', '')}
            ${D ? `<ul class="ffs-list">${[['videos', f.videos_pending, lang === 'es' ? 'Videos esperando a una familia' : 'Videos waiting for a parent', 'video'], ['messages', f.messages_pending, lang === 'es' ? 'Mensajes de los amigos esperando' : 'Friend messages waiting for a parent', 'chat'], ['consents', f.consents_pending, lang === 'es' ? 'Consentimientos por revisar' : 'Signed consents to check', 'shield']].map(([k, n, l, ic]) => `<li><a class="ffs-row" href="${esc(M.staffLink(k === 'videos' ? 'videos' : k, null, ctx) || '#')}" data-nav><span class="ffs-dot ffs-t-bop">${icon(ic)}</span><span class="ffs-row-t"><b>${esc(l)}</b></span><span class="ffs-chip ${n ? 'ffs-chip-warn' : 'ffs-chip-ok'}">${n ?? 0}</span>${icon('arrow')}</a></li>`).join('')}</ul>` : ncHtml(S)}</section>`)
          + P('network', `<section class="ffs-card">${cardHead(S.tabs.network, 'doc', '')}<p>${esc(S.contentNet)}</p>
            <p><span class="ffs-chip ${pl?.enabled ? 'ffs-chip-bop' : ''}">${esc(S.pilot)}: ${esc(pl?.enabled ? S.pilotOn : S.pilotOff)}</span></p>${ncHtml(S, lang === 'es' ? 'cola de revisión por centro' : 'a per-center review queue')}</section>`);
      }
      if (id === 'settings') {
        const groups = M.pagesFor(tabs);
        return P('center', `<div class="ffs-two"><section class="ffs-card">${cardHead(S.tabs.center, 'gear', '')}<ul class="ffs-list">
            ${[['settings', lang === 'es' ? 'Ajustes del centro' : 'Center settings', 'gear'], ['people', lang === 'es' ? 'Personas' : 'People', 'people'], ['staff-invite', lang === 'es' ? 'Invitar personal' : 'Invite staff', 'badge'], ['tab', lang === 'es' ? 'Invitar familias' : 'Invite families', 'heart', 'families'], ['tab', lang === 'es' ? 'Permisos' : 'Permissions', 'lock', 'permissions']].map(([k, l, ic, arg]) => { const h = M.staffLink(k, arg || null, ctx); return h ? `<li><a class="ffs-row" href="${esc(h)}" data-nav><span class="ffs-dot ffs-t-navy">${icon(ic)}</span><span class="ffs-row-t"><b>${esc(l)}</b></span>${icon('arrow')}</a></li>` : ''; }).join('')}
            <li><a class="ffs-row" href="${esc(M.staffLink('classic', null, ctx))}" data-nav><span class="ffs-dot ffs-t-gold">${icon('grid')}</span><span class="ffs-row-t"><b>${esc(S.classic)}</b></span>${icon('arrow')}</a></li></ul></section>
            <section class="ffs-card sv2-clock">${cardHead(S.clockCard, 'clock', '')}${clock.html || ncHtml(S)}</section></div>`)
          + P('pages', `<section class="ffs-card">${cardHead(S.pages, 'grid', '')}<p class="ffs-sub">${esc(S.pagesSub)}</p><div class="sv2-pages">${groups.map((g) => `<div><h4 class="sv2-h4">${esc(M.PAGE_GROUP_WORD[lang === 'es' ? 'es' : 'en'][g.group])}</h4><ul class="sv2-pagelist">${g.pages.map((p) => `<li><a href="/c/${esc(c.slug)}/${esc(p.id)}" data-nav>${esc(p.label)}</a></li>`).join('')}</ul></div>`).join('')}</div></section>`);
      }
      return '';
    }
    function absenceList(list) {
      return (list || []).length ? `<ul class="ffs-list">${list.map((a) => `<li class="ffs-row">${av(a.kid, null, 36)}<span class="ffs-row-t"><b>${esc(a.first || a.kid)}</b><span>${esc(a.kind || '')} · ${esc(dfmt(a.from || a.starts_on || a.day || today, lang))}</span></span></li>`).join('')}</ul>` : `<p class="ffs-empty">${esc(S.absencesNone)}</p>`;
    }
    function drawer(kind) {
      const [k, arg] = kind.split(':');
      if (k === 'room') {
        const r = ratio.rooms.find((z) => z.id === arg); const raw = (D?.rooms || []).find((z) => z.id === arg); if (!r || !raw) return null;
        const a = raw.attendance || {};
        return { title: r.name, href: M.staffLink('today', null, { ...ctx, room: arg }), html: `<div class="sv2-dr-hero">${glowRingSvg(M.frac(r.present, r.enrolled), { tone: r.tone === 'bad' ? 'warn' : 'booker', size: 150, stroke: 14 })}<p><b class="ffs-big">${r.present}/${r.enrolled ?? '—'}</b><br>${esc(r.ratio ? `${r.ratio} · ${r.required} ${S.need.toLowerCase()}` : S.nc)}</p></div>
          ${tableHtml(esc, { head: ['', S.count], rows: [[S.here, a.here ?? 0], [lang === 'es' ? 'Todavía no' : 'Not here yet', a.out ?? 0], [lang === 'es' ? 'Se fueron' : 'Gone home', a.gone ?? 0], [lang === 'es' ? 'Ausentes' : 'Absent', a.absent ?? 0], [lang === 'es' ? 'Niños con cuidado registrado' : 'Children with care logged', raw.children_logged], [lang === 'es' ? 'Informes enviados' : 'Reports sent', raw.reports_published], [lang === 'es' ? 'Capacidad' : 'Licensed capacity', r.capacity ?? '—']] })}
          ${r.citation ? `<p class="ffs-note">${esc(r.citation)}</p>` : ''}` };
      }
      if (k === 'kpi') {
        if (arg === 'enroll') return enrollK ? { title: S.kEnroll, href: M.staffLink('crm', 'waitlist', ctx), html: `<div class="sv2-dr-hero">${glowRingSvg(enrollK.frac, { tone: 'booker', size: 150, stroke: 14 })}<p><b class="ffs-big">${enrollK.enrolled}/${enrollK.capacity ?? '—'}</b></p></div>${tableHtml(esc, { head: [S.views.rooms, lang === 'es' ? 'Inscritos' : 'Enrolled', lang === 'es' ? 'Capacidad' : 'Capacity', lang === 'es' ? 'Libres' : 'Open'], rows: capRows.map((r) => [r.room_name, r.enrolled, r.capacity ?? '—', r.open_seats ?? '—']) })}` } : null;
        if (arg === 'attend') return attK ? { title: S.kAttend, href: M.staffLink('tab', 'arrivals', ctx), html: `<div class="sv2-dr-hero">${glowRingSvg(attK.frac, { tone: 'zuri', size: 150, stroke: 14 })}<p><b class="ffs-big">${attK.here}/${attK.enrolled}</b></p></div>${tableHtml(esc, { head: [S.views.rooms, S.here, lang === 'es' ? 'Ausentes' : 'Absent'], rows: (D.rooms || []).map((r) => [r.name, `${(r.attendance?.here || 0) + (r.attendance?.gone || 0)}/${r.enrolled}`, r.attendance?.absent || 0]) })}` } : null;
        if (arg === 'staff') return { title: S.kStaff, href: M.staffLink('timeclock', null, ctx), html: `<div class="sv2-dr-hero">${glowRingSvg(ratio.required ? M.frac(ratio.staff, Math.max(ratio.required, ratio.staff || 0)) : null, { tone: ratio.short ? 'warn' : 'lumi', size: 150, stroke: 14 })}<p><b class="ffs-big">${ratio.staff ?? '—'}</b><br>${esc(ratio.required != null ? S.staffBig(ratio.staff ?? '—', ratio.required) : S.nc)}${scheduled != null ? `<br>${esc(S.fte(scheduled))}` : ''}</p></div>
          ${onDuty ? `<ul class="ffs-list">${onDuty.map((p) => `<li class="ffs-row"><span class="ffs-dot ffs-t-zuri">${icon('badge')}</span><span class="ffs-row-t"><b>${esc(M.shortName(p.name))}</b><span>${esc(tfmt(p.in_at, lang))}</span></span></li>`).join('')}</ul>` : ''}` };
        if (arg === 'tuition') return cash ? { title: S.kTuition, href: M.staffLink('billing', 'reports', ctx), html: `<div class="sv2-dr-hero">${glowRingSvg(cash.frac, { tone: 'gold', size: 150, stroke: 14 })}<p><b class="ffs-big sv2-money">${esc(M.money(cash.collected, lang))}</b><br>${esc(S.kTuitionSub(M.money(cash.billed, lang)))}</p></div><p class="ffs-note">${icon('lock')} ${esc(S.hqNote)}</p>` } : null;
      }
      return null;
    }

    const sh = createShell({ rootId: 'sv2', views: M.DIRECTOR_VIEWS, words: S, phoneBar: M.DIRECTOR_BAR, esc, live, buildView, drawer, motionOn,
      afterBuild: (id) => { if (id === 'settings') clock.bind(); } });
    const actions = `<nav class="ffs-actions" id="sv2Actions" aria-label="${esc(S.actions)}">
      ${M.staffLink('enroll', null, ctx) ? actionHtml('qaEnroll', M.staffLink('enroll', null, ctx), 'plus', lang === 'es' ? 'Inscribir a un niño' : 'Enroll a child', lang === 'es' ? 'Inscribir' : 'Enroll', 'ffs-action-gold') : ''}
      ${M.staffLink('staff-invite', null, ctx) ? actionHtml('qaStaff', M.staffLink('staff-invite', null, ctx), 'badge', lang === 'es' ? 'Invitar personal' : 'Invite staff', lang === 'es' ? 'Personal' : 'Staff') : ''}
      ${M.staffLink('safety', null, ctx) ? actionHtml('qaDrill', M.staffLink('safety', null, ctx), 'fire', lang === 'es' ? 'Registrar un simulacro' : 'Log a drill', lang === 'es' ? 'Simulacro' : 'Drill') : ''}
      ${M.staffLink('chat', null, ctx) ? actionHtml('qaChat', M.staffLink('chat', null, ctx), 'chat', lang === 'es' ? 'Mensaje a las familias' : 'Message families', lang === 'es' ? 'Mensajes' : 'Message') : ''}
      ${actionHtml('qaClassic', M.staffLink('classic', null, ctx), 'grid', lang === 'es' ? 'Inicio clásico' : 'Classic home', lang === 'es' ? 'Clásico' : 'Classic')}</nav>`;
    const badges = attn.length ? { overview: { n: attn.length, label: S.attentionN(attn.length) } } : {};
    const html = `<div class="ffs ffs-director" id="sv2" data-view="${esc(sh.ui.view)}">
      ${sh.railHtml({ actions, badges })}
      <div class="ffs-stage" id="sv2Stage">${sh.barHtml()}<div class="ffs-mobile-actions">${actions.replace('id="sv2Actions"', 'id="sv2ActionsM"').split('id="qa').join('id="qam')}</div>${sh.viewsHtml()}</div>
      ${sh.tabbarHtml()}</div>`;
    page(frame(html), c.name, { english: lang !== 'es' });
    hostUp();
    sh.bind();
  }

  return { viewTeacher, viewDirector };
}
