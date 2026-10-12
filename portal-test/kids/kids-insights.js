// Learning insights from the Kids' corner (hub/KIDS_CORNER.md "Insights"): the grown-ups' views of kid_engagement_events.
//
//   mountParentInsights(el, { c, rpc, esc, lang, kid, first })   the parent dashboard's "Learning at home" card (Learning view):
//        time this week by watch / read / play, day by day, favourites (hearts, watched again), not-yet-favourites, this week's
//        activities done vs assigned, skills practised, "try next" (kid_engagement_child_summary)
//   mountRoomEngagement(el, { c, rpc, esc, lang, room, slug })     the teacher's per-child home-engagement summary for one room
//        (kid_engagement_room_summary): the component the staff-v2 dashboard mounts (hub/KIDS_CORNER.md "For the staff-v2 dashboard")
//   viewStaffInsights(ctx)                                        /c/<slug>/kids for staff: teachers their rooms; directors the center
//        (kid_engagement_center_summary: most / least liked, drop-off, content gaps, hours, devices) and the rooms
// The neon-glow chart style of the parent dashboard v2 (family-viz.js glowRingSvg / glowBarHtml, family-v2.css). Every chart has a text
// summary and a "Show as table" view; colours carry identity together with a label (never colour alone). Words, not ranks: nothing
// compares one child with another, children are listed by first name.
import { glowBarHtml, glowRingSvg, tableHtml } from './family-viz.js';
import { iw, minutesText, kindShares, titleText, KIND_HEX } from './kids-corner-core.js';
import { avatarHtml, guideFace } from './kid-mode.js';

const KINDS = ['watch', 'read', 'play'];
const TONE = { watch: 'booker', read: 'lumi', play: 'gold' };
const dayShort = (iso, lang, opt = { weekday: 'short' }) => new Date(`${String(iso).slice(0, 10)}T12:00:00Z`).toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US', { ...opt, timeZone: 'UTC' });
const setWidths = (root) => { for (const b of root.querySelectorAll('[data-w]')) b.style.setProperty('--w', `${b.dataset.w}%`); for (const b of root.querySelectorAll('[data-h]')) b.style.setProperty('--h', `${b.dataset.h}%`); };

// Stacked day columns (watch / read / play), 2 px gaps between segments, rounded tops, one hover title per day. Pure.
export function dayColumnsSvg(daily, { lang = 'en', esc, height = 120, labelEvery = 1 } = {}) {
  const W = iw(lang);
  const n = Math.max(1, daily.length), colW = 28, vw = n * colW;
  const max = Math.max(60, ...daily.map((d) => (d.watch || 0) + (d.read || 0) + (d.play || 0)));
  const top = 14, base = height - 18, span = base - top;
  let bars = '';
  daily.forEach((d, i) => {
    let y = base;
    const x = i * colW + colW * 0.18, w = colW * 0.64;
    const parts = KINDS.filter((k) => (d[k] || 0) > 0);
    const tip = `${dayShort(d.day, lang, { weekday: 'long', month: 'short', day: 'numeric' })}: ${KINDS.map((k) => `${W.kind[k]} ${minutesText(d[k] || 0, lang)}`).join(', ')}`;
    bars += `<g class="ki-col"><title>${esc(tip)}</title><rect class="ki-hit" x="${(i * colW).toFixed(2)}" y="0" width="${colW.toFixed(2)}" height="${height}"/>`;
    parts.forEach((k, j) => {
      const hgt = Math.max(2, ((d[k] || 0) / max) * span) - (j < parts.length - 1 ? 2 : 0);
      y -= hgt;
      bars += `<rect class="ki-seg ki-seg-${k}" x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${hgt.toFixed(2)}" rx="${j === parts.length - 1 ? 4 : 0}"/>`;
      y -= j < parts.length - 1 ? 2 : 0;
    });
    if (!parts.length) bars += `<rect class="ki-seg ki-seg-none" x="${x.toFixed(2)}" y="${base - 2}" width="${w.toFixed(2)}" height="2"/>`;
    if (i % labelEvery === 0 || i === n - 1) bars += `<text class="ki-ax" x="${(i * colW + colW / 2).toFixed(2)}" y="${height - 4}" text-anchor="middle">${esc(dayShort(d.day, lang, n > 10 ? { day: 'numeric' } : { weekday: 'narrow' }))}</text>`;
    bars += '</g>';
  });
  return `<svg class="ki-days" viewBox="0 0 ${vw} ${height}" role="img" aria-label="${esc(W.days)}">
    <line class="ki-base" x1="0" x2="${vw}" y1="${base}" y2="${base}"/>${bars}</svg>
    <p class="ki-scale">${esc(minutesText(max, lang))}</p>`;
}
const legendHtml = (esc, lang, seconds) => `<ul class="ki-legend">${KINDS.map((k) => `<li><span class="ki-key ki-key-${k}" aria-hidden="true"></span>${esc(iw(lang).kind[k])}${seconds ? ` <b>${esc(minutesText(seconds[k] || 0, lang))}</b>` : ''}</li>`).join('')}</ul>`;
const toggleHtml = (esc, W, id) => `<button type="button" class="fv-tgl ki-tgl" data-tbl="${id}" aria-pressed="false">${esc(W.table)}</button>`;
function bindToggles(root, W) {
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tbl]'); if (!b) return;
    const box = root.querySelector(`#${b.dataset.tbl}`); if (!box) return;
    const on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(on)); b.textContent = on ? W.picture : W.table;
    box.classList.toggle('ki-tabled', on);
  });
}
const itemFace = (esc, t) => (t?.friend ? `<span class="ki-face">${guideFace(esc, t.friend)}</span>` : '<span class="ki-face ki-face-none" aria-hidden="true"></span>');

// one suggestion per title (five move-alongs a week share the name "Move with Booker"); the database also de-duplicates
export const uniqueByTitle = (list) => { const seen = new Set(); return (list || []).filter((t) => { const k = `${t.item_type === 'move' || t.item_type === 'together' ? 'act' : t.item_type}:${t.title?.en || t.item_id}`; if (seen.has(k)) return false; seen.add(k); return true; }); };

// ---- the parent card (also the teacher's drill-in) ----------------------------------------------------------------------------
export function parentInsightsHtml(esc, s, { lang = 'en', slug = '', kid = '', first = '', staff = false } = {}) {
  const W = iw(lang);
  const sec = s.seconds || {}, sh = kindShares(sec);
  const total = sh.total;
  const acts = s.activities || { assigned: 0, done: 0 };
  const open = slug && !staff ? `<a class="btn gold ki-open" href="/c/${esc(slug)}/kids?kid=${encodeURIComponent(kid)}" data-nav id="kiOpen">${esc(W.open)}</a>` : '';
  const head = `<header class="ki-head"><div><h2 id="kiH">${esc(W.title)}</h2><p class="ki-sub">${esc(s.days === 7 ? W.sub(first) : W.sub14(first, s.days))}</p></div>${open}</header>`;
  if (!s.recording && !total) {
    return `${head}<p class="ki-off">${esc(W.recOff)}${staff ? '' : ` <a href="/c/${esc(slug)}/privacy" data-nav>${esc(W.privacy)}</a>`}</p>
      ${acts.assigned ? `<div class="ki-acts">${glowRingSvg(acts.done / acts.assigned, { tone: 'zuri', size: 96, stroke: 10 })}<p><b>${esc(W.doneOf(acts.done, acts.assigned))}</b><br><span>${esc(W.activities)}</span></p></div>` : ''}`;
  }
  const maxSkill = Math.max(1, ...(s.skills || []).map((x) => x.times));
  s = { ...s, try_next: uniqueByTitle(s.try_next) };
  const sum = `${W.total}: ${minutesText(total, lang)}. ${KINDS.map((k) => `${W.kind[k]} ${minutesText(sec[k] || 0, lang)}`).join(', ')}.`;
  return `${head}
    <div class="ki-grid">
      <section class="ki-tile ki-time" aria-labelledby="kiTimeH"><h3 id="kiTimeH">${esc(W.total)}</h3>
        <p class="ki-big">${esc(minutesText(total, lang))}</p>
        <div class="ki-stack" aria-hidden="true">${KINDS.filter((k) => sh[k] > 0).map((k) => `<span class="ki-stack-${k}" data-w="${Math.round(sh[k] * 100)}"></span>`).join('')}</div>
        <ul class="ki-kinds">${KINDS.map((k) => `<li><span class="ki-key ki-key-${k}" aria-hidden="true"></span><span>${esc(W[k])}</span><b>${esc(minutesText(sec[k] || 0, lang))}</b>
          ${glowBarHtml(total ? (sec[k] || 0) / total : 0, TONE[k])}</li>`).join('')}</ul>
        <p class="sr-only">${esc(sum)}</p></section>
      <section class="ki-tile ki-acts-tile" aria-labelledby="kiActH"><h3 id="kiActH">${esc(W.activities)}</h3>
        <div class="ki-acts">${glowRingSvg(acts.assigned ? acts.done / acts.assigned : 0, { tone: 'zuri', size: 112, stroke: 11,
          inner: `<text x="56" y="62" text-anchor="middle" class="ki-ring-t">${Number(acts.done)}/${Number(acts.assigned)}</text>` })}
          <p><b>${esc(W.doneOf(acts.done, acts.assigned))}</b>${acts.unit ? `<br><span>Unit ${esc(acts.unit)}${acts.week_theme ? ` · ${esc(acts.week_theme)}` : ''}</span>` : ''}</p></div></section>
      <section class="ki-tile ki-days-tile" aria-labelledby="kiDaysH" id="kiDaysBox"><div class="ki-tile-h"><h3 id="kiDaysH">${esc(W.days)}</h3>${toggleHtml(esc, W, 'kiDaysBox')}</div>
        <div class="ki-pic">${dayColumnsSvg(s.daily || [], { lang, esc })}${legendHtml(esc, lang)}</div>
        <div class="ki-tbl">${tableHtml(esc, { head: [W.days, ...KINDS.map((k) => W.kind[k])], rows: (s.daily || []).map((d) => [dayShort(d.day, lang, { weekday: 'long', month: 'short', day: 'numeric' }), ...KINDS.map((k) => minutesText(d[k] || 0, lang))]) })}</div></section>
      <section class="ki-tile ki-fav" aria-labelledby="kiFavH"><h3 id="kiFavH">${esc(W.favourites)}</h3>
        ${(s.favourites || []).length ? `<ol class="ki-list">${s.favourites.map((f) => `<li>${itemFace(esc, f.title)}<span class="ki-li-t"><b>${esc(titleText(f.title, lang))}</b>
          <span class="ki-chips"><span class="ki-chip ki-chip-${f.kind}">${esc(W.kind[f.kind] || '')}</span>${f.hearts ? `<span class="ki-chip ki-chip-heart">${esc(W.hearts(f.hearts))}</span>` : ''}${f.replays ? `<span class="ki-chip">${esc(W.replays(f.replays))}</span>` : ''}</span></span></li>`).join('')}</ol>` : `<p class="ki-muted">${esc(W.never)}</p>`}
        ${(s.not_yet || []).length ? `<h4>${esc(W.notYet)}</h4><ul class="ki-list ki-list-quiet">${s.not_yet.map((f) => `<li>${itemFace(esc, f.title)}<span class="ki-li-t">${esc(titleText(f.title, lang))}
          <span class="ki-chips">${f.left_early ? `<span class="ki-chip">${esc(W.leftEarly)}</span>` : ''}${f.sads ? `<span class="ki-chip">${esc(W.sads)}</span>` : ''}</span></span></li>`).join('')}</ul>` : ''}</section>
      <section class="ki-tile ki-skills" aria-labelledby="kiSkH"><h3 id="kiSkH">${esc(W.skills)}</h3>
        ${(s.skills || []).length ? `<ul class="ki-sklist">${s.skills.slice(0, 6).map((x) => `<li><span>${esc(W.domain[x.domain] || x.domain)}</span>${glowBarHtml(x.times / maxSkill, 'bop')}</li>`).join('')}</ul>` : `<p class="ki-muted">${esc(W.never)}</p>`}</section>
      <section class="ki-tile ki-next" aria-labelledby="kiNextH"><h3 id="kiNextH">${esc(W.tryNext)}</h3>
        ${(s.try_next || []).length ? `<ul class="ki-list">${s.try_next.map((t) => `<li>${itemFace(esc, t.title)}<span class="ki-li-t"><b>${esc(titleText(t.title, lang))}</b><span class="ki-why">${esc(W.why[t.why] || '')}${t.domain ? ` · ${esc(W.domain[t.domain] || '')}` : ''}</span></span></li>`).join('')}</ul>` : `<p class="ki-muted">${esc(W.never)}</p>`}
        ${s.last_active ? `<p class="ki-muted">${esc(W.lastActive(dayShort(s.last_active, lang, { weekday: 'long', month: 'short', day: 'numeric' })))}</p>` : ''}</section>
    </div>
    <p class="ki-foot">${esc(W.noCompare)}</p>`;
}
export async function mountParentInsights(el, { c, rpc, esc, lang = 'en', kid, first = '', days = 7, staff = false }) {
  if (!el) return;
  const W = iw(lang);
  el.setAttribute('aria-labelledby', 'kiH');
  el.innerHTML = `<h2 id="kiH">${esc(W.title)}</h2><p class="ki-muted">…</p>`;
  let s;
  try { s = await rpc('kid_engagement_child_summary', { p_center: c.center_id, p_kid: kid, p_days: days }); } catch (e) { el.remove(); return; }
  el.innerHTML = parentInsightsHtml(esc, s, { lang, slug: c.slug, kid, first, staff });
  setWidths(el); bindToggles(el, W);
}

// ---- teacher: one room ----------------------------------------------------------------------------------------------------------
export function roomSummaryHtml(esc, data, { lang = 'en', roomName = '' } = {}) {
  const W = iw(lang);
  const kids = data.children || [];
  const max = Math.max(60, ...kids.map((k) => (k.watch_sec || 0) + (k.read_sec || 0) + (k.play_sec || 0)));
  return `<header class="ki-head"><div><h2 id="kiRoomH">${esc(W.roomTitle(roomName || data.room))}</h2><p class="ki-sub">${esc(W.roomNote)}</p></div></header>
    <div class="ki-tblwrap"><table class="ki-room"><thead><tr><th scope="col">${esc(W.child)}</th><th scope="col">${esc(W.time)}</th><th scope="col">${esc(W.fav)}</th>
      <th scope="col">${esc(W.homeDone)}</th><th scope="col">${esc(W.last)}</th></tr></thead><tbody>
      ${kids.map((k) => { const t = (k.watch_sec || 0) + (k.read_sec || 0) + (k.play_sec || 0);
        return `<tr data-kid="${esc(k.kid)}"><th scope="row"><button type="button" class="ki-kidbtn" data-kid="${esc(k.kid)}">${avatarHtml(esc, k.guide || { friend: 'bop', color: 'sky' }, 'km-av-s ki-av')}<span>${esc(k.first_name)}</span></button>
          ${k.recording ? '' : `<span class="ki-chip ki-chip-off">${esc(W.off)}</span>`}</th>
          <td><span class="ki-mini" aria-hidden="true">${KINDS.filter((x) => k[`${x}_sec`] > 0).map((x) => `<span class="ki-stack-${x}" data-w="${Math.max(2, Math.round((k[`${x}_sec`] / max) * 100))}"></span>`).join('')}</span>
            <span>${esc(minutesText(t, lang))}</span><span class="sr-only">${esc(KINDS.map((x) => `${W.kind[x]} ${minutesText(k[`${x}_sec`] || 0, lang)}`).join(', '))}</span></td>
          <td>${k.favourite ? esc(titleText(k.favourite, lang)) : '—'}</td><td>${Number(k.home_done || 0)}</td>
          <td>${k.last_active ? esc(dayShort(k.last_active, lang, { weekday: 'short', month: 'short', day: 'numeric' })) : esc(W.never)}</td></tr>`; }).join('')}
      </tbody></table></div>${legendHtml(esc, lang)}<div id="kiDrill"></div>`;
}
export async function mountRoomEngagement(el, { c, rpc, esc, lang = 'en', room, roomName = '', days = 7 }) {
  if (!el) return;
  let data;
  try { data = await rpc('kid_engagement_room_summary', { p_center: c.center_id, p_room: room, p_days: days }); } catch (e) { el.innerHTML = `<p class="ki-muted">${esc(e.message || '')}</p>`; return; }
  el.innerHTML = roomSummaryHtml(esc, data, { lang, roomName });
  setWidths(el);
  el.addEventListener('click', (e) => {
    const b = e.target.closest('.ki-kidbtn'); if (!b) return;
    const k = (data.children || []).find((x) => x.kid === b.dataset.kid);
    const box = el.querySelector('#kiDrill'); box.className = 'ki-card ki-drill';
    mountParentInsights(box, { c, rpc, esc, lang, kid: b.dataset.kid, first: k?.first_name || '', staff: true }).then(() => box.scrollIntoView({ block: 'start' }));
  });
}

// ---- director: the center ----------------------------------------------------------------------------------------------------
const pct = (n) => (n == null ? '—' : `${n}%`);
export function centerSummaryHtml(esc, d, { lang = 'en' } = {}) {
  const W = iw(lang), T = d.totals || {};
  const items = d.items || [];
  const content = items.filter((i) => i.item_type !== 'placeholder');
  const liked = [...content].filter((i) => i.hearts > 0 || i.replays > 0).sort((a, b) => (b.hearts * 3 + b.replays) - (a.hearts * 3 + a.replays)).slice(0, 5);
  const least = [...content].filter((i) => i.opens >= 2 || i.sads > 0).map((i) => ({ ...i, bad: i.sads * 3 + i.left_early + i.skipped - i.hearts * 2 })).filter((i) => i.bad > 0).sort((a, b) => b.bad - a.bad).slice(0, 5);
  const drop = [...content].filter((i) => i.starts > 0 && i.finish_rate != null).sort((a, b) => a.finish_rate - b.finish_rate).slice(0, 6);
  const demand = items.filter((i) => i.item_type === 'placeholder').sort((a, b) => b.opens - a.opens);
  const skippy = content.filter((i) => i.skipped + i.left_early >= 2).sort((a, b) => (b.skipped + b.left_early) - (a.skipped + a.left_early)).slice(0, 5);
  const perChild = T.children_active ? Math.round(T.active_sec / T.children_active) : 0;
  const hours = Array.from({ length: 24 }, (_, h) => Number(d.hours?.[h] || 0)); const hmax = Math.max(1, ...hours);
  const sh = kindShares({ watch: T.watch_sec, read: T.read_sec, play: T.play_sec });
  const li = (i, extra) => `<li>${itemFace(esc, i.title)}<span class="ki-li-t"><b>${esc(titleText(i.title, lang))}</b><span class="ki-chips"><span class="ki-chip ki-chip-${i.kind}">${esc(W.kind[i.kind] || '')}</span>${extra}</span></span></li>`;
  const kpi = (label, value, sub = '', tone = 'navy') => `<div class="ki-kpi ki-kpi-${tone}"><span>${esc(label)}</span><b>${esc(String(value))}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</div>`;
  const obj = (o) => Object.entries(o || {}).sort((a, b) => b[1] - a[1]);
  const smallBars = (o, labels = {}) => { const e = obj(o); const m = Math.max(1, ...e.map(([, v]) => v)); return e.length ? `<ul class="ki-sklist">${e.map(([k, v]) => `<li><span>${esc(labels[k] || k)} <b>${v}</b></span>${glowBarHtml(v / m, 'booker')}</li>`).join('')}</ul>` : `<p class="ki-muted">—</p>`; };
  return `<header class="ki-head"><div><h2 id="kiCenterH">${esc(W.cTitle)}</h2><p class="ki-sub">${esc(W.cSub(d.days))}</p></div>
      <div class="ki-range" role="group" aria-label="${esc(W.range)}">${[7, 30, 90].map((n) => `<button type="button" class="ki-rng" data-days="${n}" aria-pressed="${n === d.days}">${n}</button>`).join('')}</div></header>
    ${!items.length ? `<p class="ki-muted">${esc(W.none_)}</p>` : ''}
    <div class="ki-kpis">${kpi(W.active, T.children_active ?? 0, `${T.children_recording ?? 0} / ${T.children_enrolled ?? 0} ${W.recording}`, 'booker')}
      ${kpi(W.sessions, T.sessions ?? 0, '', 'lumi')}${kpi(W.total, minutesText(T.active_sec, lang), '', 'zuri')}${kpi(W.avgPer, minutesText(perChild, lang), '', 'gold')}
      ${kpi(W.hearts_, T.hearts ?? 0, `${T.sads ?? 0} ${W.sads_.toLowerCase()}`, 'bop')}</div>
    <div class="ki-grid ki-grid-wide">
      <section class="ki-tile ki-span2" id="kiCDays"><div class="ki-tile-h"><h3>${esc(W.days)}</h3>${toggleHtml(esc, W, 'kiCDays')}</div>
        <div class="ki-pic">${dayColumnsSvg(d.daily || [], { lang, esc, height: 130, labelEvery: d.days > 30 ? 14 : d.days > 7 ? 5 : 1 })}${legendHtml(esc, lang, { watch: T.watch_sec, read: T.read_sec, play: T.play_sec })}
          <div class="ki-stack" aria-hidden="true">${KINDS.filter((k) => sh[k] > 0).map((k) => `<span class="ki-stack-${k}" data-w="${Math.round(sh[k] * 100)}"></span>`).join('')}</div></div>
        <div class="ki-tbl">${tableHtml(esc, { head: [W.days, ...KINDS.map((k) => W.kind[k]), W.active], rows: (d.daily || []).map((x) => [String(x.day), ...KINDS.map((k) => minutesText(x[k] || 0, lang)), String(x.children)]) })}</div></section>
      <section class="ki-tile"><h3>${esc(W.mostLiked)}</h3>${liked.length ? `<ol class="ki-list">${liked.map((i) => li(i, `<span class="ki-chip ki-chip-heart">${esc(W.hearts(i.hearts))}</span>${i.replays ? `<span class="ki-chip">${esc(W.replays(i.replays))}</span>` : ''}`)).join('')}</ol>` : `<p class="ki-muted">—</p>`}</section>
      <section class="ki-tile"><h3>${esc(W.leastLiked)}</h3>${least.length ? `<ol class="ki-list ki-list-quiet">${least.map((i) => li(i, `${i.sads ? `<span class="ki-chip">${esc(`${i.sads} ${W.sads_.toLowerCase()}`)}</span>` : ''}${i.left_early + i.skipped ? `<span class="ki-chip">${esc(`${i.left_early + i.skipped} ${W.left.toLowerCase()}`)}</span>` : ''}`)).join('')}</ol>` : `<p class="ki-muted">—</p>`}</section>
      <section class="ki-tile"><h3>${esc(W.dropoff)}</h3>${drop.length ? `<ul class="ki-sklist ki-drop">${drop.map((i) => `<li><span>${esc(titleText(i.title, lang))} <b>${pct(i.finish_rate)}</b></span>${glowBarHtml((i.finish_rate || 0) / 100, i.finish_rate < 50 ? 'lumi' : 'booker')}</li>`).join('')}</ul>` : `<p class="ki-muted">—</p>`}</section>
      <section class="ki-tile"><h3>${esc(W.gaps)}</h3>
        <h4>${esc(W.demand)}</h4>${demand.length ? `<ul class="ki-list">${demand.map((i) => li(i, `<span class="ki-chip ki-chip-gold">${esc(`${i.opens} ${W.opens.toLowerCase()}`)}</span><span class="ki-chip">${esc(`${i.children} ${W.child.toLowerCase()}`)}</span>`)).join('')}</ul>` : `<p class="ki-muted">—</p>`}
        ${skippy.length ? `<h4>${esc(W.skipped)} / ${esc(W.left)}</h4><ul class="ki-list ki-list-quiet">${skippy.map((i) => li(i, `<span class="ki-chip">${esc(String(i.skipped + i.left_early))}</span>`)).join('')}</ul>` : ''}</section>
      <section class="ki-tile"><h3>${esc(W.when)}</h3><div class="ki-hours" aria-hidden="true">${hours.map((v, h) => `<span class="ki-hr" data-h="${Math.round((v / hmax) * 100)}" title="${h}:00 · ${v}"></span>`).join('')}</div>
        <p class="ki-hours-ax"><span>0</span><span>6</span><span>12</span><span>18</span><span>23</span></p>
        <p class="sr-only">${esc(hours.map((v, h) => (v ? `${h}:00 ${v}` : '')).filter(Boolean).join(', '))}</p>
        <h4>${esc(W.devices)}</h4>${smallBars(d.devices)}<h4>${esc(W.captions)}</h4>${smallBars(d.captions, { en: 'English', es: 'Español', both: 'English + Español' })}</section>
      <section class="ki-tile"><h3>${esc(W.friendsPicked)}</h3>${smallBars(d.friends, { booker: 'Booker', lumi: 'Lumi', zuri: 'Zuri', bop: 'Bop', nico: 'Nico', tilly: 'Tilly', poppy: 'Poppy', mimi: 'Mimi', tad: 'Tad', rory: 'Rory', nova: 'Nova', teo: 'Teo' })}</section>
      <section class="ki-tile ki-span2"><h3>${esc(W.allItems)}</h3><div class="ki-tblwrap">${tableHtml(esc, { head: [W.item, W.opens, W.finishRate, W.left, W.skipped, W.hearts_, W.sads_, W.avgTime],
        rows: items.map((i) => [titleText(i.title, lang), String(i.opens), pct(i.finish_rate), String(i.left_early), String(i.skipped), String(i.hearts), String(i.sads), i.avg_active_sec == null ? '—' : minutesText(i.avg_active_sec, lang)]) })}</div></section>
    </div>`;
}

// ---- /c/<slug>/kids for staff ---------------------------------------------------------------------------------------------------
export async function viewStaffInsights(ctx) {
  const { c, shell, page, rpc, esc, client, lang } = ctx;
  const W = iw(lang);
  const director = c.role === 'director' || c.role === 'owner';
  page(shell(`<div class="ki-staff">${director ? '<section class="card ki-card" id="kiCenter" aria-labelledby="kiCenterH"><p class="ki-muted">…</p></section>' : ''}
    <section class="card ki-card" id="kiRoomCard"><nav class="tabs ki-rooms" id="kiRooms" aria-label="Rooms"></nav><div id="kiRoom"></div></section></div>`), W.cTitle, { english: lang !== 'es' });
  const rooms = ((await client().from('rooms').select('id, data').eq('center_id', c.center_id).order('id')).data || []);
  const want = new URLSearchParams(location.search).get('room');
  const cur = rooms.find((r) => r.id === want) || rooms[0];
  document.getElementById('kiRooms').innerHTML = rooms.map((r) => `<a href="/c/${esc(c.slug)}/kids?room=${encodeURIComponent(r.id)}" data-nav${r.id === cur?.id ? ' aria-current="page"' : ''}>${esc(r.data?.name || r.id)}</a>`).join('');
  if (cur) mountRoomEngagement(document.getElementById('kiRoom'), { c, rpc, esc, lang, room: cur.id, roomName: cur.data?.name || cur.id });
  if (!director) return;
  const box = document.getElementById('kiCenter');
  const load = async (days) => {
    try { const d = await rpc('kid_engagement_center_summary', { p_center: c.center_id, p_days: days }); box.innerHTML = centerSummaryHtml(esc, d, { lang }); setWidths(box); }
    catch (e) { box.innerHTML = `<p class="ki-muted">${esc(e.message || '')}</p>`; }
  };
  box.addEventListener('click', (e) => { const b = e.target.closest('[data-days]'); if (b) load(Number(b.dataset.days)); });
  bindToggles(box, W);
  await load(30);
}
export { KIND_HEX };
