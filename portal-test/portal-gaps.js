// Futures Hub front-end: the last of the website portals' capabilities (hub/PORTAL_RETIREMENT.md). Every rule is in the database
// (migrations 20261029400000 .. 20261029430000); these cards draw and call. Each mount function fills a placeholder the page already
// has, so the page that owns it (care-desk.js, checkpoints.js) keeps its own render cycle.
//
//   mountScreenMeter    /rhythm   the week's screen minutes for the room (rhythm_screen_week) and a form to log a screen episode.
//                                 INFORMATION ONLY: minutes, never a limit or a "left" count (owner decision: no screen-time cap).
//   mountLunch          /meals    the room's menu level (menu_level_set) and a custom lunch on the day (menu_day_get / lunch_day_set).
//   mountRatioWhatIf    /safety   "what if" ratio: children by age group and staff, answered from the cited table (ratio_whatif).
//   bandCardHtml / bindBand       the child's Learning Steps set on /checkpoints (checkpoint_band_info / checkpoint_band_confirm).
// Staff pages are English (the page catalog in i18n-es-ui.js has the Spanish); no inline styles or handlers (strict CSP).

import { fmtDate } from './i18n.js';

const LEVELS = [[1, 'Level 1 · Easy & Quick'], [2, 'Level 2 · Medium'], [3, 'Level 3 · Next Level']];
const COMPONENTS = [['protein', 'Protein (meat or alternate)'], ['grain', 'Grain (whole grain-rich)'], ['veg', 'Vegetable'], ['fruit', 'Fruit (or a second vegetable)'], ['milk', 'Milk']];
const AGE_GROUPS = [['toddler', 'Toddlers (12 to 23 months)'], ['two', 'Twos (24 to 29 months)'], ['two_half', 'Twos (30 to 35 months)'],
  ['three_four', 'Threes and fours'], ['five', 'Fives'], ['school_age', 'School age (6 and older)']];
const BANDS = [['twos', 'Twos'], ['threes', 'Threes'], ['prek', 'Pre-K']];
export const bandName = (b) => (BANDS.find(([k]) => k === b) || [b, b || ''])[1];

export function mountPortalGaps(h) {
  const { esc: E, $, $$, rpc, live, friendly, client, localDay } = h;
  const dayText = (s, opts = { weekday: 'short', month: 'short', day: 'numeric' }) => fmtDate(String(s).slice(0, 10), opts);
  const say = (box, m, bad = false) => { const n = $('[data-gapmsg]', box); if (n) { n.className = `msg ${bad ? 'bad' : 'ok'}`; n.textContent = m; } if (!bad) live(m); };

  // ---------------------------------------------------------------- weekly screen minutes (information only)
  async function mountScreenMeter(box, c, { room, canLog = false, onLogged = null } = {}) {
    if (!box) return;
    let data = null, err = '';
    try { data = await rpc('rhythm_screen_week', { p_center: c.center_id }); } catch (e) { err = friendly(e); }
    const mine = (data?.rooms || []).find((r) => r.id === room || r.room === room);
    const all = data?.rooms || [];
    box.innerHTML = `<div class="card" id="screenMeter"><h2>Screen minutes this week</h2>
      <p class="small">The minutes this room watched on a screen, ${data ? `${E(dayText(data.week_start))} to ${E(dayText(data.week_end))}` : 'this week'}. This is for your own records: it counts minutes and does not set a limit.</p>
      ${err ? `<p class="msg bad" role="alert">${E(err)}</p>` : ''}
      ${mine ? `<p class="smw-total"><b id="smTotal">${Number(mine.total)}</b> <span>minutes this week</span> <span class="small muted">${Number(mine.episodes) === 1 ? 'Logged 1 time' : `Logged ${Number(mine.episodes)} times`}</span></p>
        <ul class="list cd-list" id="smDays">${mine.days.map((d) => `<li${d.date === data.today ? ' aria-current="date"' : ''}><span class="who"><b>${E(dayText(d.date))}</b></span><span class="small">${Number(d.minutes)} min</span></li>`).join('')}</ul>`
        : (!err ? '<p class="empty">No screen minutes logged for this room this week.</p>' : '')}
      ${all.length > 1 ? `<h3>All rooms</h3><div class="arr-tw"><table class="arr-table" id="smRooms"><thead><tr><th scope="col">Room</th><th scope="col">Minutes this week</th></tr></thead><tbody>
        ${all.map((r) => `<tr><td>${E(r.name)}</td><td>${Number(r.total)}</td></tr>`).join('')}</tbody></table></div>` : ''}
      ${canLog ? `<form id="smLog" novalidate><h3>Log a screen episode</h3>
        <p class="small muted">Screens are only for learning or moving together, with an adult, and never during meals or snacks.</p>
        <div class="row two"><label class="f"><span>Minutes</span><input class="i" type="number" name="min" min="1" max="60" value="6" required></label>
        <label class="f"><span>What the room watched (optional)</span><input class="i" name="title" maxlength="80" autocomplete="off"></label></div>
        <button type="submit" class="btn soft">Add to this week</button></form>` : ''}
      <p class="msg" role="status" data-gapmsg></p></div>`;
    $('#smLog', box)?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = Object.fromEntries(new FormData(e.target).entries());
      const min = Math.round(Number(v.min));
      if (!(min >= 1 && min <= 60)) return say(box, 'Enter the minutes, from 1 to 60.', true);
      const title = String(v.title || '').trim() ? `Watch together: ${String(v.title).trim()}` : 'Watch together';
      const r = await client().from('rhythm_moments').insert({ center_id: c.center_id, room, date: localDay(), moment_type: 'learn', title, minutes: min, active_min: 0, mvpa_min: 0,
        outdoor_min: 0, screen_min: min, tummy_min: 0, rest_min: 0, adult_led: true, weather_swap: false, source: 'episode' });
      if (r.error) return say(box, friendly(r.error), true);
      if (onLogged) await onLogged(); else await mountScreenMeter(box, c, { room, canLog, onLogged });
      say(box, 'Added to this week.');
    });
  }

  // ---------------------------------------------------------------- the room's menu level and a custom lunch
  async function mountLunch(box, c, { room, date = null } = {}) {
    if (!box) return;
    const S = { date: date || localDay(), d: null, mode: 'planned', err: '' };
    const load = async () => { try { S.d = await rpc('menu_day_get', { p_center: c.center_id, p_room: room, p_date: S.date }); S.mode = S.d.mode; S.err = ''; } catch (e) { S.d = null; S.err = friendly(e); } };
    const render = () => {
      const d = S.d, cu = d?.custom || {}, today = d?.today || localDay(), past = S.date < today;
      box.innerHTML = `<div class="card" id="lunchDay"><h2>Lunch for the day</h2>
        <p class="small">Choose the room's menu level, and say when the room serves its own lunch instead of the planned menu.</p>
        ${S.err ? `<p class="msg bad" role="alert">${E(S.err)}</p>` : ''}
        ${d ? `<div class="row two"><label class="f"><span>Menu level for this room</span><select class="i" id="lgLevel">${LEVELS.map(([v, l]) => `<option value="${v}"${v === d.level ? ' selected' : ''}>${E(l)}</option>`).join('')}</select></label>
          <label class="f"><span>Day</span><input class="i" type="date" id="lgDate" value="${E(S.date)}"></label></div>
          <div class="cta-row" role="group" aria-label="Lunch type"><button type="button" class="btn soft small" data-lmode="planned" aria-pressed="${S.mode === 'planned'}">Planned menu</button>
            <button type="button" class="btn soft small" data-lmode="custom" aria-pressed="${S.mode === 'custom'}">Custom lunch</button></div>
          ${S.mode === 'planned' ? `<p class="small" id="lgPlanned">The planned menu for this room is the Eat the Rainbow menu at ${E(LEVELS.find(([v]) => v === d.level)[1])}. Open it on the Curriculum page.</p>
            <p id="lgPlannedDish">${d.planned?.lunch?.title ? `Planned lunch on this day (menu ${E(d.planned.id)}): <b>${E(d.planned.lunch.title)}</b>` : `<span class="small muted">${d.planned?.source === 'closed' ? `The center is closed on this day${d.planned.label ? ` (${E(d.planned.label)})` : ''}.` : 'No planned lunch on this day (no program start date for this room, a weekend, or past the last menu day).'}</span>`}</p>
            ${d.mode === 'custom' && !past ? '<button type="button" class="btn navy" id="lgSavePlanned">Go back to the planned menu for this day</button>' : ''}`
            : `<form id="lgForm" novalidate><label class="f"><span>What are you serving?</span><input class="i" name="dish" maxlength="120" required value="${E(cu.dish || '')}" placeholder="For example: Turkey tacos with rice and corn"${past ? ' disabled' : ''}></label>
              <div class="row two">${COMPONENTS.map(([k, l]) => `<label class="f"><span>${E(l)}</span><input class="i" name="${k}" maxlength="120" value="${E(cu[k] || '')}"${past ? ' disabled' : ''}></label>`).join('')}</div>
              <label class="f"><span>Menu change for the whole room (optional; no child names or health details)</span><input class="i" name="room_change" maxlength="200" value="${E(cu.room_change || '')}" placeholder="For example: Turkey instead of ham today"${past ? ' disabled' : ''}></label>
              <p class="small muted">A swap for one child comes only from that child's meal instruction approved by the director, never from this box.</p>
              <p><span class="chip ${d.mode === 'custom' && d.components_listed ? 'ok' : 'warn'}" id="lgChip">${d.mode === 'custom' && d.components_listed ? 'All 5 CACFP lunch components listed' : 'List all 5 CACFP lunch components'}</span></p>
              <p class="small muted">Listing the five components is not a crediting check: portions by age, whole grain-rich for the day and milk by age are still yours to check.</p>
              ${past ? '<p class="small">This day has passed, so it can no longer be changed.</p>' : '<button type="submit" class="btn navy">Save this lunch</button>'}</form>`}
          <h3>This week</h3><ul class="list cd-list" id="lgWeek">${(d.week || []).map((w) => `<li><span class="who"><b>${E(dayText(w.date))}</b><span class="small">${w.mode === 'custom' ? E(w.dish) : (w.planned_title ? `Planned: ${E(w.planned_title)}` : 'Planned menu')}</span></span>
            <span class="chip ${w.mode === 'custom' ? 'warn' : 'ok'}">${w.mode === 'custom' ? 'Custom' : 'Planned'}</span></li>`).join('')}</ul>` : ''}
        <p class="msg" role="status" data-gapmsg></p></div>`;
      $('#lgLevel', box)?.addEventListener('change', async (e) => {
        try { await rpc('menu_level_set', { p_center: c.center_id, p_room: room, p_level: Number(e.target.value) }); await load(); render(); say(box, 'Menu level saved.'); } catch (err) { say(box, friendly(err), true); }
      });
      $('#lgDate', box)?.addEventListener('change', async (e) => { if (!e.target.value) return; S.date = e.target.value; await load(); render(); });
      $$('[data-lmode]', box).forEach((b) => b.addEventListener('click', () => { S.mode = b.dataset.lmode; render(); }));
      $('#lgSavePlanned', box)?.addEventListener('click', async () => {
        try { await rpc('lunch_day_set', { p_center: c.center_id, p_room: room, p_date: S.date, p_mode: 'planned' }); await load(); render(); say(box, 'This day uses the planned menu.'); } catch (err) { say(box, friendly(err), true); }
      });
      $('#lgForm', box)?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const v = Object.fromEntries(new FormData(e.target).entries());
        if (!String(v.dish || '').trim()) return say(box, 'Say what the room is serving.', true);
        try { await rpc('lunch_day_set', { p_center: c.center_id, p_room: room, p_date: S.date, p_mode: 'custom', p_custom: v }); await load(); render(); say(box, 'Lunch saved.'); } catch (err) { say(box, friendly(err), true); }
      });
    };
    await load(); render();
  }

  // ---------------------------------------------------------------- what-if ratio
  function mountRatioWhatIf(box, c) {
    if (!box) return;
    const statusOf = (r) => ({ ok: ['ok', 'In ratio'], over: ['bad', 'Over ratio (warning)'], needs_staff_count: ['', `Needs ${r.required_staff ?? '?'} staff`],
      empty: ['', 'No children entered'], no_rule: ['warn', 'No ratio rule for this license type'], no_profile: ['warn', 'Set the center profile first'] }[r.status] || ['', r.status]);
    box.innerHTML = `<form class="card" id="ratioWhatIf" novalidate><h2>Ratio what-if</h2>
      <p class="small">Try a room before you set it up: how many children of each age, and how many staff. The answer comes from your state's rule for your license type. Nothing is saved and nothing is blocked.</p>
      <div class="row two">${AGE_GROUPS.map(([k, l]) => `<label class="f"><span>${E(l)}</span><input class="i" type="number" name="${k}" min="0" max="500" inputmode="numeric" value="0"></label>`).join('')}
        <label class="f"><span>Staff in the room (leave empty to ask how many are needed)</span><input class="i" type="number" name="staff" min="0" max="100" inputmode="numeric"></label></div>
      <button type="submit" class="btn navy">Check this room</button>
      <div id="ratioResult" role="status" aria-live="polite"></div></form>`;
    $('#ratioWhatIf', box).addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = Object.fromEntries(new FormData(e.target).entries()), out = $('#ratioResult', box);
      const children = {};
      for (const [k] of AGE_GROUPS) { const n = Math.round(Number(v[k] || 0)); if (n > 0) children[k] = n; }
      const staff = v.staff === '' || v.staff == null ? null : Math.round(Number(v.staff));
      try {
        const r = await rpc('ratio_whatif', { p_center: c.center_id, p_children: children, p_staff: staff });
        const [cls, text] = statusOf(r);
        out.innerHTML = `<p><span class="chip ${cls}" id="ratioChip">${E(text)}</span></p>
          ${r.total ? `<p class="small">${Number(r.total) === 1 ? '1 child' : `${Number(r.total)} children`}${r.required_staff != null ? ` need ${Number(r.required_staff)} staff` : ''}.</p>` : ''}
          ${r.max_group ? `<p class="small">A group of at most ${Number(r.max_group)} children.</p>` : ''}
          ${r.row ? `<p class="small">${E(r.row.label || '')}${r.row.ratio ? ` · ${E(r.row.ratio)}` : ''}${r.row.citation ? ` · ${E(r.row.citation)}` : ''}</p>` : ''}
          ${(r.warnings || []).length ? `<ul class="plain small">${r.warnings.map((w) => `<li>${E(w)}</li>`).join('')}</ul>` : ''}
          ${(r.alternatives || []).length ? `<p class="small muted">Other rows that also fit: ${r.alternatives.map((a) => E(a.label)).join('; ')}.</p>` : ''}`;
        live(text);
      } catch (err) { out.innerHTML = `<p class="msg bad" role="alert">${E(friendly(err))}</p>`; }
    });
  }

  // ---------------------------------------------------------------- the child's Learning Steps set (checkpoints)
  const bandCardHtml = (b) => {
    const eff = b?.effective, sug = b?.from_birthday;
    return `<section class="card" id="cpBand"><h4>Learning Steps set</h4>
      <p class="small" id="cpBandNow">${eff ? (b.confirmed ? `${E(b.first)} is on the ${E(bandName(eff))} set (confirmed by a teacher).` : `${E(b.first)} is on the ${E(bandName(eff))} set (from the birthday on file).`)
        : `No Learning Steps set is confirmed for ${E(b?.first || 'this child')} yet.`}</p>
      <p class="small muted">${sug ? `The birthday on file suggests ${E(bandName(sug))}.` : 'There is no birthday on file, so nothing is suggested.'}</p>
      <p class="small muted">The set is chosen for each child, not for the room: children in one room can be at different ages. Check it before you confirm.</p>
      <div class="row two"><label class="f"><span>Learning Steps set</span><select class="i" id="cpBandSel"><option value="">Choose a set</option>${BANDS.map(([k, l]) => `<option value="${k}"${(b?.confirmed || sug) === k ? ' selected' : ''}>${E(l)}</option>`).join('')}</select></label></div>
      <div class="cta-row"><button type="button" class="btn navy small" id="cpBandSave">Confirm set</button>${b?.confirmed ? '<button type="button" class="btn link small" id="cpBandReset">Use the birthday on file instead</button>' : ''}</div>
      <p class="small msg" id="cpBandMsg" role="status"></p>
      ${(b?.history || []).length ? `<details><summary class="small">Who confirmed it</summary><ul class="plain small" id="cpBandHistory">${b.history.map((x) => `<li>${x.band ? E(bandName(x.band)) : 'Back to the birthday reading'} · ${E(dayText(x.at, { month: 'short', day: 'numeric', year: 'numeric' }))} · ${E(x.by || 'staff')}</li>`).join('')}</ul></details>` : ''}</section>`;
  };
  // after: called with the new info once a set is saved (the page reloads the child)
  function bindBand(root, c, kid, after) {
    const msg = (m, bad) => { const n = $('#cpBandMsg', root); if (n) { n.className = `small msg ${bad ? 'bad' : 'ok'}`; n.textContent = m; } if (!bad) live(m); };
    const save = async (band, done) => { try { const r = await rpc('checkpoint_band_confirm', { p_center: c.center_id, p_kid: kid, p_band: band }); await after(r); msg(done); } catch (e) { msg(friendly(e), true); } };
    $('#cpBandSave', root)?.addEventListener('click', () => { const v = $('#cpBandSel', root).value; if (!v) return msg('Choose a set first.', true); save(v, 'Learning Steps set confirmed.'); });
    $('#cpBandReset', root)?.addEventListener('click', () => save(null, 'Using the birthday on file.'));
  }

  return { mountScreenMeter, mountLunch, mountRatioWhatIf, bandCardHtml, bindBand };
}
