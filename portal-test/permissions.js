import { centerTimeToIso, centerTz, centerToday } from './center-time.js';
// Futures Hub front-end: per-employee permissions (migrations 20261019100000_staff_permissions / 20261019200000_permission_policies).
// Mounted by app.js with its helpers. English only (staff and director views stay English for now).
//
//   /c/<slug>/permissions   director: every teacher of the center with a preset, one checkbox per permission and a room list.
//                           Saved through staff_permissions_save; the database refuses anything that is not grantable.
//   teacher home            "What you can open": the teacher's own effective permissions (my_permissions)
//   /c/<slug>/children      a teacher without 'classroom' sees every child's care alert (center_alerts) and nothing else
//   staff roles (N15)       the director gives each staff member a role (staff_role_assign): assistant teacher, kitchen, front office,
//                           read-only auditor, substitute (named rooms, until a date and time). roleBanner says it on every page;
//                           /c/<slug>/kitchen is the kitchen board (kitchen_board). Migration 20261029010000_staff_roles.sql.
// The screen only reflects the rules; row-level security and the functions enforce them whatever this page does.

export const PERMS = [
  ['hours', 'Own hours', 'Your own training hours and certificates, and clocking in and out on the time clock (your own hours only).'],
  ['classroom', 'Classroom', 'Open the children and daily records of the classroom: attendance, daily reports, pickup lists, meals, observations, photos, messages.'],
  ['allkids', 'All rooms', 'With Classroom: every room, not only the rooms listed below.'],
  ['enroll', 'Enrollment desk', 'Tours, enrollment links and family invitations (recorded now; the enrollment desk uses it).'],
  ['reports', 'Reports', 'Classroom reports and exports (recorded now; the reports use it).'],
  ['staff', 'Staff desk', 'Staff invitations and schedules (recorded now; the staff desk uses it).'],
  ['kitchen', 'Kitchen board', 'The kitchen board: rooms, head counts, approved meal instructions and care alerts (first name and last initial only).'],
];
// staff roles (N15): the role caps what the row may hold; the database enforces it (perm_role_cap)
export const ROLES = [
  ['teacher', 'Teacher', 'The classroom, as set below.'],
  ['assistant_teacher', 'Assistant teacher', 'The classroom in their rooms. Never reports, enrollment or the staff desk.'],
  ['kitchen', 'Kitchen', 'The kitchen board and care alerts. No children\'s records.'],
  ['front_office', 'Front office', 'Every room and the enrollment desk. Never reports or the staff desk.'],
  ['auditor', 'Read-only auditor', 'Reads every room and the reports. Cannot add or change anything.'],
  ['substitute', 'Substitute', 'Named rooms only, until the date and time you choose. Then nothing opens.'],
];
const ROLE_LABEL = Object.fromEntries(ROLES.map(([v, l]) => [v, l]));
export const PRESETS = [
  ['teacher', 'Teacher', ['hours', 'classroom']],
  ['hours_only', 'Hours only', ['hours']],
  ['lead', 'Lead teacher', ['hours', 'classroom', 'allkids', 'reports']],
  ['front_desk', 'Front desk', ['hours', 'classroom', 'allkids', 'enroll']],
  ['custom', 'Custom', null],
];
const PERM_LABEL = Object.fromEntries(PERMS.map(([v, l]) => [v, l]));

export function mountPermissions(h) {
  const { esc, $, $$, rpc, page, live, friendly } = h;

  const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
  const presetFor = (perms) => (PRESETS.find(([, , p]) => p && sameSet(p, perms)) || ['custom'])[0];

  async function viewPermissions(c, shell) {
    const [list, set] = await Promise.all([rpc('staff_permissions_list', { p_center: c.center_id }), rpc('center_settings', { p_center: c.center_id })]);
    const rooms = set.rooms || [];
    const row = (t) => `<form class="card soft perm-row" data-user="${esc(t.user_id)}" novalidate>
      <div class="row two"><div><b>${esc(t.name)}</b><br><span class="small muted">${esc(t.email)}</span>${t.default ? ' <span class="chip">Standard teacher</span>' : ''}</div>
        <label class="f"><span>Preset</span><select class="i" data-preset aria-label="Preset for ${esc(t.name)}">${PRESETS.map(([v, l]) =>
          `<option value="${v}"${v === (t.preset || presetFor(t.perms)) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label></div>
      <fieldset class="f"><legend class="small muted">What ${esc(t.name)} can open</legend><div class="choices two">${PERMS.map(([v, l, d]) =>
        `<label class="choice"><input type="checkbox" data-perm="${v}"${t.perms.includes(v) ? ' checked' : ''}><span><b>${esc(l)}</b><span class="small muted">${esc(d)}</span></span></label>`).join('')}</div></fieldset>
      <fieldset class="f"><legend class="small muted">Rooms <span class="hint">leave all unchecked for every room; ignored when All rooms is on</span></legend>
        <div class="choices two">${rooms.length ? rooms.map((r) => `<label class="choice"><input type="checkbox" data-room="${esc(r.id)}"${(t.rooms || []).includes(r.id) ? ' checked' : ''}><span><b>${esc(r.name || r.id)}</b></span></label>`).join('')
          : '<p class="empty small">No rooms yet. Add rooms in Center settings.</p>'}</div></fieldset>
      <p class="msg" role="status" data-msg></p><button class="btn center" type="submit">Save</button></form>`;
    page(shell(`<div class="card" id="permissionsIntro"><h2>Permissions</h2>
      <p>Choose what each teacher can open. Every teacher can always see the <b>care alerts</b> of every child, so each adult can keep each child safe.</p>
      <p class="small" id="moneyRule"><b>Money is for directors and owners only.</b> Billing, payroll and financials cannot be given to anyone else, and are never shown to Futures Friends support.</p>
      <p class="small muted">Changes apply the next time the teacher opens a page. Each change is recorded in the audit log.</p></div>
      ${list.length ? `<div class="card" id="rolesIntro"><h2>Staff roles</h2><p class="small muted">A role sets the most a person can ever open. Read-only auditors cannot change anything; a substitute's access ends on its own.</p></div>
      <div id="roleList">${list.map((t) => roleForm(t, rooms)).join('')}</div>` : ''}
      ${list.length ? `<div id="permList">${list.map(row).join('')}</div>` : '<div class="card"><p class="empty" id="permList">No teachers yet. Invite staff first.</p></div>'}`), `Permissions · ${c.name}`, { english: true });
    bindRoles(c);

    $$('.perm-row').forEach((f) => {
      const sel = $('[data-preset]', f);
      const boxes = () => $$('[data-perm]', f);
      // choosing a preset ticks its boxes; ticking a box by hand turns the preset into the matching one (or Custom)
      sel.addEventListener('change', () => {
        const p = PRESETS.find(([v]) => v === sel.value);
        if (p && p[2]) boxes().forEach((b) => { b.checked = p[2].includes(b.dataset.perm); });
      });
      boxes().forEach((b) => b.addEventListener('change', () => { sel.value = presetFor(boxes().filter((x) => x.checked).map((x) => x.dataset.perm)); }));
      f.addEventListener('submit', async (e) => {
        e.preventDefault();
        const m = $('[data-msg]', f);
        const perms = boxes().filter((x) => x.checked).map((x) => x.dataset.perm);
        const rms = $$('[data-room]', f).filter((x) => x.checked).map((x) => x.dataset.room);
        try {
          const r = await rpc('staff_permissions_save', { p_center: c.center_id, p_user: f.dataset.user, p_preset: sel.value, p_perms: perms, p_rooms: rms });
          sel.value = r.preset;
          m.className = 'msg ok'; m.textContent = `Saved: ${r.perms.map((p) => PERM_LABEL[p] || p).join(', ') || 'nothing'}${r.rooms.length ? ` · rooms: ${r.rooms.join(', ')}` : ''}.`;
          live('Permissions saved.');
        } catch (err) { m.className = 'msg bad'; m.textContent = friendly(err); }
      });
    });
  }

  // ---- staff roles (N15) ------------------------------------------------------------------------------------------------------------
  const when = (iso) => (iso ? new Intl.DateTimeFormat('en-US', { timeZone: centerTz(), dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso)) : '');
  // the role line of one staff member on the permissions page
  const roleForm = (t, rooms) => {
    const until = t.access_until ? new Date(t.access_until) : null;
    const day = until ? centerToday(until) : '';
    const hm = until ? new Intl.DateTimeFormat('en-GB', { timeZone: centerTz(), hour: '2-digit', minute: '2-digit', hour12: false }).format(until) : '';
    return `<form class="card soft role-row" data-user="${esc(t.user_id)}" novalidate>
      <div class="row two"><div><b>${esc(t.name)}</b><br><span class="small muted">${esc(ROLE_LABEL[t.job_role] || 'Teacher')}${t.access_until ? ` · until ${esc(when(t.access_until))}` : ''}${t.active === false ? ' · <b>access closed</b>' : ''}</span></div>
        <label class="f"><span>Role</span><select class="i" data-role aria-label="Role for ${esc(t.name)}">${ROLES.map(([v, l]) =>
          `<option value="${v}"${v === (t.job_role || 'teacher') ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label></div>
      <p class="small muted" data-role-help>${esc((ROLES.find(([v]) => v === (t.job_role || 'teacher')) || ROLES[0])[2])}</p>
      <div class="row two" data-window${(t.job_role || 'teacher') === 'substitute' ? '' : ' hidden'}>
        <label class="f"><span>Access ends (date)</span><input class="i" type="date" data-until-day value="${esc(day)}"></label>
        <label class="f"><span>Access ends (time)</span><input class="i" type="time" data-until-time value="${esc(hm)}"></label></div>
      <fieldset class="f"><legend class="small muted">Rooms for this role <span class="hint">a substitute needs at least one room</span></legend>
        <div class="choices two">${rooms.map((r) => `<label class="choice"><input type="checkbox" data-role-room="${esc(r.id)}"${(t.rooms || []).includes(r.id) ? ' checked' : ''}><span><b>${esc(r.name || r.id)}</b></span></label>`).join('') || '<p class="empty small">No rooms yet. Add rooms in Center settings.</p>'}</div></fieldset>
      <p class="msg" role="status" data-role-msg></p>
      <div class="cta-row"><button class="btn center" type="submit">Save role</button>${t.access_until && t.active !== false ? '<button class="btn soft" type="button" data-end>End access now</button>' : ''}</div></form>`;
  };
  function bindRoles(c) {
    $$('.role-row').forEach((f) => {
      const sel = $('[data-role]', f);
      sel.addEventListener('change', () => {
        $('[data-window]', f).hidden = sel.value !== 'substitute';
        $('[data-role-help]', f).textContent = (ROLES.find(([v]) => v === sel.value) || ROLES[0])[2];
      });
      f.addEventListener('submit', async (e) => {
        e.preventDefault();
        const m = $('[data-role-msg]', f);
        const day = $('[data-until-day]', f).value, hm = $('[data-until-time]', f).value;
        const until = sel.value === 'substitute' && day ? centerTimeToIso(hm || '18:00', new Date(`${day}T12:00:00Z`)) : null;
        try {
          const r = await rpc('staff_role_assign', { p_center: c.center_id, p_user: f.dataset.user, p_role: sel.value,
            p_rooms: $$('[data-role-room]', f).filter((x) => x.checked).map((x) => x.dataset.roleRoom), p_until: until });
          m.className = 'msg ok'; m.textContent = `Saved: ${ROLE_LABEL[r.role] || r.role}${r.access_until ? `, until ${when(r.access_until)}` : ''}.`;
          live('Role saved.');
        } catch (err) { m.className = 'msg bad'; m.textContent = friendly(err); }
      });
      const end = $('[data-end]', f);
      if (end) end.addEventListener('click', async () => {
        const m = $('[data-role-msg]', f);
        try { await rpc('staff_access_end', { p_center: c.center_id, p_user: f.dataset.user }); m.className = 'msg ok'; m.textContent = 'Access ended.'; end.remove(); live('Access ended.'); }
        catch (err) { m.className = 'msg bad'; m.textContent = friendly(err); }
      });
    });
  }

  // On every page of a staff member whose role says so: read-only, or a substitute's window.
  function roleBanner(p) {
    if (!p || p.role !== 'teacher') return '';
    if (p.active === false) return `<p class="msg warn" role="status" id="roleBanner">${esc(p.access_from && new Date(p.access_from) > new Date() ? `Your access opens ${when(p.access_from)}.` : 'Your access at this center has ended.')}</p>`;
    if (p.read_only) return '<p class="msg" role="status" id="roleBanner"><b>Read-only access.</b> You can open and read; nothing can be added or changed.</p>';
    if (p.job_role === 'substitute') return `<p class="msg" role="status" id="roleBanner"><b>Substitute access</b> for ${esc((p.rooms || []).join(', '))} until ${esc(when(p.access_until))}.</p>`;
    return '';
  }
  function accessClosedCard(p, c) {
    return `<div class="card" id="accessClosed"><h2>No access right now</h2>
      <p>${esc(p.access_from && new Date(p.access_from) > new Date() ? `Your access to ${c.name} opens ${when(p.access_from)}.` : `Your access to ${c.name} has ended.`)}</p>
      <p class="small muted">Ask the center's director if you still need it. Your training stays open.</p></div>`;
  }

  // The kitchen board (kitchen staff and directors): counts per room, approved meal instructions, care alerts, the day's kitchen prompts.
  async function kitchenCard(c) {
    const b = await rpc('kitchen_board', { p_center: c.center_id });
    const SEV = { life_threatening: 'Life-threatening', severe: 'Severe', moderate: 'Moderate', info: 'Good to know' };
    const STATE = { ok: 'Approved', stale: 'Review due', needed: 'Missing: hold the meal and ask the director' };
    const list = (xs) => (xs || []).map((x) => esc(x)).join(', ');
    return `<div class="card" id="kitchenBoard"><h2>Kitchen board</h2>
      <p class="small muted">Today in ${esc(c.name)}. First name and last initial only.</p>
      <h3>Head counts</h3><ul class="plain" id="kitchenRooms">${b.rooms.map((r) => `<li><b>${esc(r.name)}</b>: ${Number(r.present)} here of ${Number(r.enrolled)} enrolled</li>`).join('') || '<li class="empty">No rooms yet.</li>'}</ul>
      <h3>Meal instructions</h3><ul class="plain" id="kitchenMeals">${b.meals.map((m) => `<li><b>${esc(m.first_name)} ${esc(m.last_initial || '')}</b> (${esc(m.room || '')}): ${esc(STATE[m.state] || m.state)}${m.never_serve?.length ? `. Never serve: ${list(m.never_serve)}` : ''}${m.serve_instead?.length ? `. Serve instead: ${list(m.serve_instead)}` : ''}</li>`).join('') || '<li class="empty">No meal instructions. The shared menu applies.</li>'}</ul>
      <h3>Care alerts</h3><ul class="plain" id="kitchenAlerts">${b.alerts.map((a) => `<li><b>${esc(a.first_name)} ${esc(a.last_initial || '')}</b> (${esc(a.room || '')}): ${esc(a.alert)} <span class="chip ${a.severity === 'life_threatening' || a.severity === 'severe' ? 'bad' : a.severity === 'moderate' ? 'warn' : ''}">${esc(SEV[a.severity] || a.severity)}</span></li>`).join('') || '<li class="empty">No care alerts at this center right now.</li>'}</ul>
      ${b.prompts?.length ? `<h3>Kitchen prompts</h3><ul class="plain">${b.prompts.map((x) => `<li><b>${esc(x.room_name)}</b>: ${esc(x.kitchen_prompt)}</li>`).join('')}</ul>` : ''}</div>`;
  }
  async function viewKitchen(c, shell) {
    page(shell(await kitchenCard(c)), `Kitchen · ${c.name}`, { english: true });
  }

  // The teacher's own view of what they can open (home page).
  async function mineCard(c) {
    let p;
    try { p = await rpc('my_permissions', { p_center: c.center_id }); } catch (_) { return ''; }
    if (!p || p.role !== 'teacher') return '';
    const has = (x) => p.perms.includes(x);
    return `<div class="card" id="myPermissions"><h2>What you can open</h2>${p.job_role && p.job_role !== 'teacher' ? `<p class="small" id="myRole">Your role: <b>${esc(ROLE_LABEL[p.job_role] || p.job_role)}</b>${p.read_only ? ' (read only)' : ''}</p>` : ''}
      <ul class="plain">${PERMS.filter(([v]) => has(v)).map(([, l]) => `<li>${esc(l)}</li>`).join('')}
        <li>Care alerts for every child (so everyone can keep every child safe)</li></ul>
      ${has('classroom') ? `<p class="small muted">${has('allkids') || !(p.rooms || []).length ? 'Children in every room.' : `Children in your rooms: ${esc(p.rooms.join(', '))}.`}</p>`
        : '<p class="small muted">Children\'s records are not part of your role at this center. Ask your director if you need them.</p>'}
      <p class="small muted">Billing and other money are for directors and owners only.</p></div>`;
  }

  // A teacher without 'classroom': every child's alert, nothing else about the child.
  async function alertsCard(c, intro) {
    const rows = await rpc('center_alerts', { p_center: c.center_id });
    const SEV = { life_threatening: 'Life-threatening', severe: 'Severe', moderate: 'Moderate', info: 'Good to know' };
    const byRoom = {};
    for (const r of rows) (byRoom[r.room || 'No room'] ||= []).push(r);
    return `<div class="card" id="alertsOnly"><h2>Care alerts</h2>
      <p class="small muted">${esc(intro || 'Every adult at')} ${esc(c.name)} sees these so every child stays safe. Only the first name, last initial, room and alert are shown.</p>
      ${Object.entries(byRoom).map(([room, rs]) => `<h3>${esc(room)}</h3><ul class="plain">${rs.map((r) => `<li><b>${esc(r.first_name)} ${esc(r.last_initial || '')}</b>: ${esc(r.alert)}
        <span class="chip ${r.severity === 'life_threatening' || r.severity === 'severe' ? 'bad' : r.severity === 'moderate' ? 'warn' : ''}">${esc(SEV[r.severity] || r.severity)}</span></li>`).join('')}</ul>`).join('')
        || '<p class="empty">No care alerts at this center right now.</p>'}</div>`;
  }
  async function alertsOnly(c, shell, intro) {
    page(shell(await alertsCard(c, intro)), `Care alerts · ${c.name}`, { english: true });
  }

  return { viewPermissions, mineCard, alertsOnly, alertsCard, roleBanner, accessClosedCard, kitchenCard, viewKitchen };
}
