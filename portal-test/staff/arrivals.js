// Futures Hub front-end: arrival and departure (N2 "one app": the website portal's Arrivals tab, kiosk, pickup lists and the
// family pickup card, now in the Hub; every rule lives in Postgres, migration 20261011200000_arrival_departure.sql).
//
//   /c/<slug>/arrivals   staff with the classroom permission and directors: the room's children with sign-in / sign-out times and who
//                        dropped off or picked up; "Sign in" / "Sign out" (choose the adult from the child's pickup list, a one-day pickup
//                        with its code, or "someone else"; the adult signs with a finger or types their family PIN); a blocked release
//                        can be approved once by a director (their own session, or their tablet PIN) with a reason; "never release to" has
//                        no override; a group room move; "Open kiosk" for the tablet at the door (leaving it asks the staff PIN when one
//                        is set); "Paper sheet" prints the room's sign-in sheet for a Hub outage.
//                        Directors also: family requests to approve or decline, each child's pickup list (add, change, remove, "never
//                        release to", version history), one-day pickups, and the attendance export (CSV).
//   /c/<slug>/pickup     families: who can pick up each of their children, "ask to add / remove" (the director approves), one-day pickup
//                        codes, and the family's tablet PIN.
// Each sign-in / sign-out / move carries an id chosen here, so a retry after a dropped connection is never recorded twice (the
// functions are idempotent on that id). No inline styles or handlers (strict CSP); 44 px targets. Words: English, with the Spanish in
// i18n-es-ui.js (the page catalog translates a family's page).

const REL = [['parent', 'Parent'], ['guardian', 'Guardian'], ['grandparent', 'Grandparent'], ['aunt_uncle', 'Aunt or uncle'], ['sibling', 'Adult sibling'],
  ['relative', 'Other relative'], ['family_friend', 'Family friend'], ['neighbor', 'Neighbor'], ['nanny', 'Nanny or sitter'], ['other', 'Another adult']];
const relLabel = (v) => (REL.find((x) => x[0] === v) || [v, v ? 'Another adult' : ''])[1];
const uuid = () => crypto.randomUUID();
const kidName = (k) => (k ? `${k.first || ''}${k.last_initial ? ` ${k.last_initial}.` : ''}`.trim() : '');
const REASON = {
  wrong_code: 'That code is not right.', family_pin_wrong: 'That family PIN is not right.',
  family_pin_locked: 'This family PIN is paused after too many tries: sign with a finger instead.', family_pin_no_pin: 'No family PIN is set: sign with a finger instead.',
  director_pin_wrong: 'That director PIN is not right.', director_pin_locked: 'That director PIN is paused after too many tries.', director_pin_no_pin: 'That director has no tablet PIN.',
};

export function mountArrivals(h) {
  const { esc, $, $$, rpc, page, live, friendly, client, localDay } = h;
  const E = esc;
  const relOpts = (v, blank) => (blank ? '<option value="">Relationship…</option>' : '') + REL.map(([k, l]) => `<option value="${k}"${k === v ? ' selected' : ''}>${E(l)}</option>`).join('');
  const time = (iso) => (iso ? new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(iso)) : '');
  const codeBox = (c) => `<div class="card soft arr-code" role="status" id="arrCode"><p>Give this code to <b>${E(c.name)}</b>. It works on <b>${E(c.valid_on)}</b> only, once.</p>
    <p class="arr-code-n">${E(String(c.code).slice(0, 3))} ${E(String(c.code).slice(3))}</p><p class="small">The Hub does not show it again. Staff check the adult's photo ID at pick-up.</p></div>`;

  // ---------------------------------------------------------------- staff: the Arrivals page
  async function viewArrivals(c, shell, { director = false } = {}) {
    const S = { center: c.center_id, date: localDay(), board: [], rooms: [], room: new URLSearchParams(location.search).get('room') || '', sel: new Set(),
      flow: null, kiosk: false, kioskRoom: '', paper: false, exitPin: false, mgrKid: '', mgr: null, pending: [], accounts: [], hist: null, code: null, note: '', err: '', dirs: null };
    S.rooms = ((await client().from('rooms').select('id, data').eq('center_id', c.center_id)).data || [])
      .map((r) => ({ id: r.id, name: r.data?.name || r.id, order: Number(r.data?.order ?? 99) })).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
    if (!S.rooms.some((r) => r.id === S.room)) S.room = S.rooms[0]?.id || '';
    const roomName = (id) => (S.rooms.find((r) => r.id === id) || { name: id || '' }).name;
    const boardKid = (kid) => S.board.find((k) => k.kid === kid);
    const statusOf = (k) => {
      const outs = (k.events || []).filter((e) => e.kind === 'check_out');
      if (k.state === 'here') return `Signed in ${time(k.in_at)}${k.room && k.room !== k.home_room ? ` · now in ${roomName(k.room)}` : ''}`;
      if (k.state === 'gone') { const o = outs[outs.length - 1]; return `Signed out ${time(k.out_at)}${o?.override_by ? ' · director override' : ''}`; }
      return k.absent ? 'Absent' : 'Not signed in';
    };
    async function load() {
      try { S.board = (await rpc('arrival_board', { p_center: S.center, p_date: S.date })) || []; S.err = ''; } catch (e) { S.err = friendly(e); }
      if (director) S.pending = (await rpc('pickup_requests_pending', { p_center: S.center }).catch(() => [])) || [];
    }
    const mgrHtml = () => {
      if (!S.mgrKid) return '';
      if (!S.mgr) return '<p class="small muted" role="status">Loading the list…</p>';
      const people = S.mgr.people || [];
      const ed = S.mgr.edit ? people.find((p) => p.person_id === S.mgr.edit) : null;
      return `<ul class="list cd-list" id="arrPeople">${people.map((p) => `<li><span class="who"><b>${E(p.name)}</b>${p.kind === 'never' ? '<span class="chip bad">Never release to · See center file</span>'
          : `<span class="small">${E(p.relationship_label || '')}${p.phone ? ` · ${E(p.phone)}` : ''}${p.kind === 'guardian' ? ' · guardian' : ''}${p.family_pin ? ' · has a family PIN' : ''}</span>`}
          <span class="small muted">v${Number(p.version)} · ${E(p.approved_by_email || '')}</span></span>
          <span class="cta-row">${p.kind === 'never' ? '' : `<button type="button" class="btn soft small" data-arr="edit" data-pid="${E(p.person_id)}">Change</button>`}<button type="button" class="btn soft small" data-arr="remove" data-pid="${E(p.person_id)}">Remove</button></span></li>`).join('')
          || '<li class="small muted">Nobody on the list yet: no one can pick this child up until the director adds them.</li>'}</ul>
        <form class="card soft arr-form" data-arr-form="person" data-pid="${E(ed ? ed.person_id : '')}" novalidate><h3>${ed ? `Change ${E(ed.name)}` : 'Add someone'}</h3>
          <div class="row two"><label class="f"><span>Type</span><select class="i" name="kind"${ed ? ' disabled' : ''}><option value="authorized">Authorized adult</option><option value="guardian"${ed && ed.kind === 'guardian' ? ' selected' : ''}>Guardian</option><option value="never">Never release to (custody order in the center file)</option></select></label>
          <label class="f"><span>Full name</span><input class="i" name="name" maxlength="80" value="${E(ed ? ed.name : '')}" required autocomplete="off"></label>
          <label class="f"><span>Relationship</span><select class="i" name="relationship">${relOpts(ed ? ed.relationship : '', true)}</select></label>
          <label class="f"><span>Phone</span><input class="i" name="phone" inputmode="tel" maxlength="20" value="${E(ed && ed.phone ? ed.phone.replace(/^\+1/, '') : '')}" autocomplete="off"></label>
          <label class="f"><span>Family account (guardian)</span><select class="i" name="user"><option value="">None</option>${S.accounts.map((a) => `<option value="${E(a.user_id)}">${E(a.email)}${a.linked ? ' (linked)' : ''}</option>`).join('')}</select></label></div>
          <p class="small muted">"Never release to": write only the name. The court order or custody papers stay in the center's paper file.</p>
          <div class="cta-row"><button type="submit" class="btn navy">${ed ? 'Save a new version' : 'Add'}</button>${ed ? '<button type="button" class="btn soft" data-arr="edit-cancel">Cancel</button>' : ''}</div></form>
        <form class="card soft arr-form" data-arr-form="pass" novalidate><h3>One-day pickup</h3><div class="row two">
          <label class="f"><span>Name</span><input class="i" name="name" maxlength="80" required autocomplete="off"></label>
          <label class="f"><span>Relationship</span><select class="i" name="relationship">${relOpts('', true)}</select></label>
          <label class="f"><span>Day</span><input class="i" type="date" name="day" value="${E(localDay())}"></label></div>
          <button type="submit" class="btn soft">Make a code</button></form>
        ${S.code && S.code.kid === S.mgrKid ? codeBox(S.code) : ''}
        <details class="arr-hist" id="arrHist"><summary>Version history</summary>${S.hist ? `<ul class="plain small">${S.hist.map((x) => `<li>${E(new Date(x.approved_at).toLocaleString('en-US'))}: <b>${E(x.name)}</b> ${E(x.kind)} v${Number(x.version)} ${E(x.status)} · ${E(x.approved_by_email || '')}</li>`).join('')}</ul>` : '<p class="small muted">Open to load.</p>'}</details>`;
    };
    const directorHtml = () => `<div class="card" id="arrDirector"><h2>Pickup lists</h2>
      ${S.pending.length ? `<h3>Family requests waiting (${S.pending.length})</h3><ul class="list cd-list" id="arrRequests">${S.pending.map((r) => `<li><span class="who"><b>${E(r.child)}</b>: ${E(r.action === 'add' ? 'add' : r.action === 'remove' ? 'remove' : 'change')} ${E(r.name || '')} (${E(r.relationship_label || '')})${r.phone ? ` · ${E(r.phone)}` : ''} <span class="small muted">asked by ${E(r.requested_by_email || 'a guardian')}</span></span>
        <span class="cta-row"><button type="button" class="btn soft small" data-arr="req-yes" data-id="${E(r.id)}">Approve</button><button type="button" class="btn soft small" data-arr="req-no" data-id="${E(r.id)}">Decline</button></span></li>`).join('')}</ul>
        <p class="small muted">Check the adult in person before you approve. Approving adds a new version to the child's list; the earlier versions are kept.</p>` : '<p class="small muted">No family requests waiting.</p>'}
      <label class="f"><span>Child</span><select class="i" id="arrMgrKid"><option value="">Choose a child…</option>${S.board.map((k) => `<option value="${E(k.kid)}"${k.kid === S.mgrKid ? ' selected' : ''}>${E(kidName(k))}</option>`).join('')}</select></label>
      <div id="arrMgr">${mgrHtml()}</div></div>
      <form class="card arr-form" data-arr-form="export" novalidate><h2>Attendance export</h2>
        <p class="small">A CSV for the center's own billing or subsidy software. Only a director with two-step verification can export; each export is logged.</p>
        <div class="row two"><label class="f"><span>From</span><input class="i" type="date" name="from" value="${E(localDay().slice(0, 8))}01" required></label>
        <label class="f"><span>To</span><input class="i" type="date" name="to" value="${E(localDay())}" required></label>
        <label class="f"><span>Format</span><select class="i" name="format"><option value="generic">One row per child per day</option><option value="sessions">One row per sign-in / sign-out (with adults)</option></select></label></div>
        <button type="submit" class="btn navy">Download CSV</button></form>`;
    const render = () => {
      const kids = S.board.filter((k) => k.room === S.room || k.home_room === S.room);
      const here = S.board.filter((k) => k.state === 'here' && k.room === S.room).length;
      const sel = [...S.sel].filter((id) => kids.some((k) => k.kid === id && k.state === 'here'));
      page(shell(`<div class="card" id="arrivals"><h2>Arrivals and departures</h2>
        ${S.err ? `<p class="msg bad" role="alert">${E(S.err)}</p>` : ''}<p class="msg ok" role="status" id="arrNote">${E(S.note)}</p>
        <div class="row two"><label class="f"><span>Room</span><select class="i" id="arrRoom">${S.rooms.map((r) => `<option value="${E(r.id)}"${r.id === S.room ? ' selected' : ''}>${E(r.name)}</option>`).join('')}</select></label>
          <p class="small" id="arrCount">${E(roomName(S.room))}: <b>${here}</b> signed in and in this room now.</p></div>
        <div class="cta-row"><button type="button" class="btn gold" data-arr="kiosk">Open kiosk</button><button type="button" class="btn soft" data-arr="refresh">Refresh</button><button type="button" class="btn soft" data-arr="paper">Paper sheet</button></div>
        <ul class="list cd-list arr-kids" id="arrKids">${kids.map((k) => `<li data-kid="${E(k.kid)}"><span class="who">${k.state === 'here' ? `<label class="arr-pick"><input type="checkbox" data-arr-sel="${E(k.kid)}"${S.sel.has(k.kid) ? ' checked' : ''}> <b>${E(kidName(k))}</b></label>` : `<b>${E(kidName(k))}</b>`}
            ${k.never_count ? '<span class="chip bad">Do-not-release list</span>' : ''}<span class="small arr-st ${E(k.state)}">${E(statusOf(k))}</span>
            <span class="small muted">${(k.events || []).filter((e) => e.kind !== 'room_move').map((e) => `${e.kind === 'check_in' ? 'In' : 'Out'} ${E(e.time_label)}: ${E(e.person_name)} (${E(e.person_kind === 'day_pass' ? 'one-day pickup' : relLabel(e.person_relationship) || 'adult')})${e.override_by ? ' · override' : ''}`).join('; ')}</span></span>
            ${k.state === 'here' ? `<button type="button" class="btn navy small" data-arr="out" data-kid="${E(k.kid)}">Sign out</button>` : `<button type="button" class="btn soft small" data-arr="in" data-kid="${E(k.kid)}">Sign in</button>`}</li>`).join('')
            || '<li class="small muted">No children in this classroom.</li>'}</ul>
        <form class="cta-row arr-move" data-arr-form="move" novalidate><span class="small"><b>${sel.length}</b> selected</span>
          <label class="f"><span>Move to</span><select class="i" name="to">${S.rooms.map((r) => `<option value="${E(r.id)}"${r.id === S.room ? ' disabled' : ''}>${E(r.name)}</option>`).join('')}</select></label>
          <button type="submit" class="btn soft"${sel.length ? '' : ' disabled'}>Move now</button></form></div>
        ${S.paper ? paperHtml() : ''}${director ? directorHtml() : ''}`), `Arrivals · ${c.name}`, { english: true });
      bind();
    };

    // ---- the sign-in / sign-out steps, in a dialog (also the kiosk) ----
    let pad = null;
    const overlay = () => {
      let o = $('#arrOverlay');
      if (!S.flow && !S.kiosk) { if (o) o.remove(); document.body.classList.remove('arr-noscroll'); pad = null; return null; }
      if (!o) { o = document.createElement('div'); o.id = 'arrOverlay'; o.className = 'arr-overlay'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-labelledby', 'arrFlowT'); document.body.appendChild(o); }
      document.body.classList.add('arr-noscroll');
      return o;
    };
    const kioskHtml = () => {
      const kids = S.board.filter((k) => !S.kioskRoom || k.room === S.kioskRoom || k.home_room === S.kioskRoom);
      return `<div class="arr-kiosk"><div class="cta-row"><h2 id="arrFlowT">Sign in and out</h2>
        <label class="f"><span>Room</span><select class="i" id="arrKRoom"><option value="">All rooms</option>${S.rooms.map((r) => `<option value="${E(r.id)}"${r.id === S.kioskRoom ? ' selected' : ''}>${E(r.name)}</option>`).join('')}</select></label>
        <button type="button" class="btn soft" data-arr="kiosk-exit">Staff: leave kiosk</button></div>
        ${S.exitPin ? `<form class="cta-row" data-arr-form="exit" novalidate><label class="f"><span>Staff PIN</span><input class="i arr-pin" name="pin" type="password" inputmode="numeric" maxlength="6" autocomplete="off" required></label><button type="submit" class="btn navy">Leave kiosk</button><button type="button" class="btn soft" data-arr="exit-cancel">Stay</button><p class="msg" role="status" id="arrExitMsg"></p></form>` : ''}
        <p>Tap your child's name.</p>
        <div class="arr-tiles">${kids.map((k) => `<button type="button" class="arr-tile ${E(k.state)}" data-arr="kid" data-kid="${E(k.kid)}"><b>${E(kidName(k))}</b><span>${E(k.state === 'here' ? 'Here · tap to pick up' : k.state === 'gone' ? 'Signed out' : 'Tap to drop off')}</span></button>`).join('') || '<p>No children to show.</p>'}</div></div>`;
    };
    const flowHtml = () => {
      const f = S.flow, k = boardKid(f.kid), out = f.kind === 'check_out';
      const title = `${out ? 'Pick up' : 'Drop off'} ${E(kidName(k))}`;
      const close = `<button type="button" class="btn soft" data-arr="flow-close">${f.step === 'done' ? 'Close' : 'Cancel'}</button>`;
      const err = f.err ? `<p class="msg bad" role="alert">${E(f.err)}</p>` : '';
      if (!f.list) return `<div class="arr-flow"><h2 id="arrFlowT">${title}</h2><p role="status">Loading the pickup list…</p>${close}</div>`;
      const people = f.list.people || [], never = people.filter((p) => p.kind === 'never'), okp = people.filter((p) => p.kind !== 'never');
      const neverBox = never.length ? `<div class="msg bad" role="alert"><b>Do not release to:</b> ${never.map((p) => E(p.name)).join(', ')}. See the center file and call the director.</div>` : '';
      if (f.step === 'who') {
        const passes = out ? (f.list.day_passes || []).filter((d) => d.valid_on === localDay() && !d.used_at && !d.revoked_at) : [];
        return `<div class="arr-flow"><h2 id="arrFlowT">${title}</h2>${neverBox}${err}<p>Who is ${out ? 'picking up' : 'dropping off'}?</p>
          <div class="arr-tiles">${okp.map((p) => `<button type="button" class="arr-tile" data-arr="who" data-pid="${E(p.person_id)}"><b>${E(p.name)}</b><span>${E(p.relationship_label || '')}${p.kind === 'guardian' ? ' · guardian' : ''}</span></button>`).join('')}
            ${passes.map((d) => `<button type="button" class="arr-tile" data-arr="who-pass" data-id="${E(d.id)}"><b>${E(d.name)}</b><span>One-day pickup · needs the code</span></button>`).join('')}
            <button type="button" class="arr-tile" data-arr="who-other"><b>Someone else</b><span>${out ? 'Not on the list: a director must approve' : 'Write their name'}</span></button></div>
          <div class="cta-row">${close}</div></div>`;
      }
      const w = f.who || {};
      if (f.step === 'sign') {
        const canPin = !!w.family_pin;
        return `<div class="arr-flow"><h2 id="arrFlowT">${title}</h2>${neverBox}${err}<form data-arr-form="sign" novalidate>
          ${w.via === 'other' ? `<div class="row two"><label class="f"><span>Adult's full name</span><input class="i" name="other_name" maxlength="80" value="${E(w.name || '')}" required autocomplete="off"></label>
            <label class="f"><span>Relationship</span><select class="i" name="other_rel">${relOpts(w.relationship || '', true)}</select></label></div>`
            : `<p><b>${E(w.name)}</b> ${w.relationship_label ? `· ${E(w.relationship_label)}` : ''}${w.via === 'pass' ? ' · one-day pickup' : ''}</p>`}
          ${w.via === 'pass' ? '<label class="f"><span>One-day code</span><input class="i arr-pin" name="code" inputmode="numeric" maxlength="6" autocomplete="off" required></label><p class="small">Check their photo ID too.</p>' : ''}
          ${canPin ? `<div class="cta-row" role="group" aria-label="How the adult confirms"><button type="button" class="btn soft small" data-arr="method" data-m="signature" aria-pressed="${f.method === 'signature'}">Finger signature</button><button type="button" class="btn soft small" data-arr="method" data-m="family_pin" aria-pressed="${f.method === 'family_pin'}">Family PIN</button></div>` : ''}
          ${f.method === 'family_pin' && canPin ? `<label class="f"><span>${E(w.name)}, enter your family PIN</span><input class="i arr-pin" name="pin" type="password" inputmode="numeric" maxlength="6" autocomplete="off" required></label>`
            : `<p class="small" id="arrPadL">${E(w.via === 'other' ? 'The adult' : w.name)}: sign below with a finger.</p><canvas class="arr-pad" id="arrPad" width="600" height="200" role="img" aria-labelledby="arrPadL"></canvas><button type="button" class="btn soft small" data-arr="pad-clear">Clear</button>`}
          <div class="cta-row"><button type="submit" class="btn gold"${f.busy ? ' disabled' : ''}>${out ? 'Record pick-up' : 'Record drop-off'}</button><button type="button" class="btn soft" data-arr="flow-back">Back</button>${close}</div></form></div>`;
      }
      if (f.step === 'blocked') {
        return `<div class="arr-flow"><div class="msg bad" role="alert"><h2 id="arrFlowT">Do not release ${E(kidName(k))}</h2><p>${E(f.block)}</p></div>${neverBox}${err}
          ${f.noOverride ? `<p>This cannot be overridden at the door. The director must change the child's list first (that change is kept in the history).</p><div class="cta-row">${close}</div>`
            : `<form data-arr-form="override" novalidate><h3>Director approval for a one-time release</h3>
              ${director ? '<p class="small">You are signed in as a director: your approval is recorded with your account.</p>' : `<div class="row two"><label class="f"><span>Director</span><select class="i" name="director">${(S.dirs || []).map((d) => `<option value="${E(d.user_id)}">${E(d.email)}</option>`).join('') || '<option value="">No director has a tablet PIN</option>'}</select></label>
              <label class="f"><span>Director's PIN</span><input class="i arr-pin" name="pin" type="password" inputmode="numeric" maxlength="6" autocomplete="off" required></label></div>`}
              <label class="f"><span>Reason (kept with the record)</span><textarea class="i" name="reason" maxlength="300" required></textarea></label>
              <div class="cta-row"><button type="submit" class="btn navy"${f.busy ? ' disabled' : ''}>Approve and record the release</button>${close}</div></form>`}</div>`;
      }
      return `<div class="arr-flow" role="status"><h2 id="arrFlowT">${E(f.done)}</h2><div class="cta-row">${close}</div></div>`;
    };
    const draw = () => {
      const o = overlay(); if (!o) return;
      const keep = pad && pad.path.length ? pad.path.slice() : null;
      o.innerHTML = S.flow ? flowHtml() : kioskHtml();
      pad = null;
      const cv = $('#arrPad');
      if (cv) {
        const g = cv.getContext('2d'); g.lineWidth = 3; g.lineCap = 'round'; g.strokeStyle = '#1f3b4d';
        pad = { el: cv, path: keep || [], down: false };
        if (keep) { g.beginPath(); keep.forEach((tk) => { const [x, y] = tk.slice(1).split(' ').map(Number); if (tk[0] === 'M') g.moveTo(x, y); else g.lineTo(x, y); }); g.stroke(); }
        const pt = (e) => { const r = cv.getBoundingClientRect(); return [Math.round((e.clientX - r.left) * cv.width / r.width), Math.round((e.clientY - r.top) * cv.height / r.height)]; };
        cv.addEventListener('pointerdown', (e) => { e.preventDefault(); cv.setPointerCapture?.(e.pointerId); pad.down = true; const [x, y] = pt(e); pad.path.push(`M${x} ${y}`); g.beginPath(); g.moveTo(x, y); });
        cv.addEventListener('pointermove', (e) => { if (!pad.down) return; const [x, y] = pt(e); pad.path.push(`L${x} ${y}`); g.lineTo(x, y); g.stroke(); });
        const up = () => { pad.down = false; }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
      }
      const first = o.querySelector('.arr-flow input, .arr-flow .arr-tile, .arr-tile, .arr-flow button'); try { first?.focus({ preventScroll: true }); } catch (_) { /* focus is a nicety */ }
    };
    async function startFlow(kid, kind) {
      const k = boardKid(kid); if (!k) return;
      S.flow = { kid, kind: kind || (k.state === 'here' ? 'check_out' : 'check_in'), id: uuid(), step: 'who', who: null, method: 'signature', err: '', list: null, busy: false };
      draw();
      try { S.flow.list = await rpc('pickup_list', { p_center: S.center, p_kid: kid }); } catch (e) { S.flow.list = { people: [], day_passes: [] }; S.flow.err = friendly(e); }
      draw();
    }
    async function closeFlow() { S.flow = null; draw(); if (!S.kiosk) { await load(); render(); } }
    async function submitFlow(extra = {}) {
      const f = S.flow; if (!f || f.busy) return;
      const w = f.who || {}, out = f.kind === 'check_out';
      const args = { p_center: S.center, p_id: f.id, p_kid: f.kid, p_sign_method: f.method };
      if (w.via === 'person') args.p_person = w.person_id;
      else if (w.via === 'pass') { args.p_day_pass = w.id; args.p_day_code = w.code; }
      else { args.p_other_name = w.name; if (w.relationship) args.p_other_relationship = w.relationship; }
      if (f.method === 'family_pin') args.p_pin = w.pin; else args.p_signature = w.signature;
      Object.assign(args, extra);
      f.busy = true; f.err = ''; draw();
      try {
        const r = await rpc(out ? 'arrival_check_out' : 'arrival_check_in', args);
        f.busy = false;
        if (r && r.ok === false) { f.err = REASON[r.reason] || 'Not recorded. Try again.'; f.id = uuid(); }
        else {
          f.step = 'done'; f.done = `${kidName(boardKid(f.kid))} ${out ? 'signed out' : 'signed in'} at ${r?.time_label || time(new Date().toISOString())}${r?.override_by ? ' (director approval recorded)' : ''}`;
          await load();
          if (S.kiosk) setTimeout(() => { if (S.flow === f) { S.flow = null; draw(); } }, 3500);
        }
      } catch (e) {
        f.busy = false;
        const m = friendly(e);
        if (/^Blocked/i.test(e?.message || '')) {
          f.step = 'blocked'; f.block = e.message; f.noOverride = /never release to/i.test(e.message);
          if (!S.dirs && !director) S.dirs = (await rpc('arrival_override_directors', { p_center: S.center }).catch(() => [])) || [];
        } else f.err = navigator.onLine === false ? 'No connection to the Futures Hub: use the paper sheet until it is back.' : m;
      }
      draw();
    }
    async function openMgr(kid) {
      S.mgrKid = kid; S.mgr = null; S.hist = null; render();
      if (!kid) return;
      try {
        const [list, acc] = await Promise.all([rpc('pickup_list', { p_center: S.center, p_kid: kid }), rpc('pickup_guardian_accounts', { p_center: S.center, p_kid: kid })]);
        S.accounts = acc || []; S.mgr = { people: list.people || [], edit: null };
      } catch (e) { S.err = friendly(e); }
      render();
    }
    const act = async (fn, note) => { try { await fn(); S.note = note || ''; S.err = ''; } catch (e) { S.err = friendly(e); S.note = ''; } render(); };
    // a printable sheet for a Hub outage: the room's children, empty columns for times, adult and signature
    const paperHtml = () => {
      const kids = S.board.filter((k) => k.home_room === S.room || k.room === S.room);
      return `<div class="card arr-paper" id="arrPaper"><h2>${E(c.name)}: ${E(roomName(S.room))}, ${E(S.date)}</h2>
        <p class="small">Paper sign-in sheet for a Futures Hub outage. Enter these in the Hub when it is back.</p>
        <div class="arr-tw"><table class="arr-table"><thead><tr><th scope="col">Child</th><th scope="col">Time in</th><th scope="col">Adult</th><th scope="col">Signature</th><th scope="col">Time out</th><th scope="col">Adult</th><th scope="col">Signature</th><th scope="col">Staff</th></tr></thead>
        <tbody>${kids.map((k) => `<tr><td>${E(kidName(k))}${k.never_count ? ' (do-not-release list: see the center file)' : ''}</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`).join('')}</tbody></table></div>
        <div class="cta-row"><button type="button" class="btn navy" data-arr="print">Print</button><button type="button" class="btn soft" data-arr="paper-close">Close</button></div></div>`;
    };

    function bind() {
      $('#arrRoom')?.addEventListener('change', (e) => { S.room = e.target.value; S.sel.clear(); history.replaceState(null, '', `${FFTest.pathname()}?room=${encodeURIComponent(S.room)}`); render(); });
      $$('[data-arr-sel]').forEach((x) => x.addEventListener('change', () => { if (x.checked) S.sel.add(x.dataset.arrSel); else S.sel.delete(x.dataset.arrSel); render(); }));
      $('#arrMgrKid')?.addEventListener('change', (e) => openMgr(e.target.value));
      $('#arrHist')?.addEventListener('toggle', async (e) => { if (!e.target.open || S.hist) return; S.hist = (await rpc('pickup_history', { p_center: S.center, p_kid: S.mgrKid }).catch(() => [])) || []; render(); $('#arrHist').open = true; });
    }
    // one set of listeners on the document for this page (removed when the page changes: the root check)
    const onClick = async (e) => {
      const t = e.target.closest?.('[data-arr]'); if (!t || !document.getElementById('arrivals')) return;
      const a = t.dataset.arr, f = S.flow;
      if (a === 'refresh') { await load(); return render(); }
      if (a === 'paper') { S.paper = true; return render(); }
      if (a === 'paper-close') { S.paper = false; return render(); }
      if (a === 'print') return window.print();
      if (a === 'kiosk') { S.kiosk = true; S.kioskRoom = S.room; await load(); return draw(); }
      if (a === 'kiosk-exit') {
        const st = await rpc('security_my_status').catch(() => null);
        if (st && st.pin_set) { S.exitPin = true; return draw(); }
        S.kiosk = false; S.exitPin = false; draw(); return render();
      }
      if (a === 'exit-cancel') { S.exitPin = false; return draw(); }
      if (a === 'kid') return startFlow(t.dataset.kid);
      if (a === 'in' || a === 'out') return startFlow(t.dataset.kid, a === 'in' ? 'check_in' : 'check_out');
      if (a === 'flow-close') return closeFlow();
      if (a === 'flow-back' && f) { f.step = 'who'; f.err = ''; return draw(); }
      if (a === 'who' && f) { f.who = { ...(f.list.people || []).find((x) => x.person_id === t.dataset.pid), via: 'person' }; f.method = 'signature'; f.step = 'sign'; return draw(); }
      if (a === 'who-pass' && f) { f.who = { ...(f.list.day_passes || []).find((x) => x.id === t.dataset.id), via: 'pass' }; f.method = 'signature'; f.step = 'sign'; return draw(); }
      if (a === 'who-other' && f) { f.who = { via: 'other' }; f.method = 'signature'; f.step = 'sign'; return draw(); }
      if (a === 'method' && f) { f.method = t.dataset.m; return draw(); }
      if (a === 'pad-clear' && pad) { pad.el.getContext('2d').clearRect(0, 0, pad.el.width, pad.el.height); pad.path = []; return; }
      if (a === 'req-yes' || a === 'req-no') return act(async () => { await rpc('pickup_request_decide', { p_center: S.center, p_id: t.dataset.id, p_approve: a === 'req-yes' }); await load(); if (S.mgrKid) await openMgr(S.mgrKid); }, a === 'req-yes' ? 'Approved: the list has a new version.' : 'Declined.');
      if (a === 'edit' && S.mgr) { S.mgr.edit = t.dataset.pid; return render(); }
      if (a === 'edit-cancel' && S.mgr) { S.mgr.edit = null; return render(); }
      if (a === 'remove' && S.mgr) {
        if (!t.dataset.armed) { t.dataset.armed = '1'; t.textContent = 'Click again to remove'; return; }
        const p = S.mgr.people.find((x) => x.person_id === t.dataset.pid); if (!p) return;
        return act(async () => { await rpc('pickup_set', { p_center: S.center, p_kid: S.mgrKid, p_person: p.person_id, p_kind: p.kind, p_status: 'removed', p_name: p.name, p_relationship: p.relationship || null, p_phone: p.phone || null }); await openMgr(S.mgrKid); }, `${p.name} removed (kept in the history).`);
      }
    };
    const onChange = (e) => { if (e.target.id === 'arrKRoom') { S.kioskRoom = e.target.value; draw(); } };
    const onSubmit = async (e) => {
      const fm = e.target.closest?.('[data-arr-form]'); if (!fm || !document.getElementById('arrivals')) return;
      e.preventDefault();
      const kind = fm.dataset.arrForm, v = Object.fromEntries(new FormData(fm).entries()), fl = S.flow;
      if (kind === 'sign' && fl) {
        const w = fl.who || {};
        if (w.via === 'other') { w.name = String(v.other_name || '').trim(); w.relationship = v.other_rel || null; if (!w.name) { fl.err = 'Write the adult\'s full name.'; return draw(); } }
        if (w.via === 'pass') { w.code = String(v.code || '').trim(); if (!/^\d{6}$/.test(w.code)) { fl.err = 'Type the 6-digit one-day code.'; return draw(); } }
        if (fl.method === 'family_pin') { w.pin = String(v.pin || ''); if (!/^\d{4,6}$/.test(w.pin)) { fl.err = 'Type the 4 to 6 digit family PIN.'; return draw(); } }
        else { if (!pad || pad.path.length < 4) { fl.err = 'Ask the adult to sign in the box with a finger.'; return draw(); } w.signature = pad.path.join(' ').slice(0, 20000); }
        return submitFlow();
      }
      if (kind === 'override' && fl) {
        const reason = String(v.reason || '').trim();
        if (reason.length < 10) { fl.err = 'Write the reason (at least 10 characters).'; return draw(); }
        const extra = { p_override_reason: reason };
        if (!director) { if (!v.director || !/^\d{4,6}$/.test(String(v.pin || ''))) { fl.err = 'Choose the director and type their PIN.'; return draw(); } extra.p_override_director = v.director; extra.p_override_pin = String(v.pin); }
        return submitFlow(extra);
      }
      if (kind === 'exit') {
        const r = await rpc('security_verify_pin', { p_pin: String(v.pin || '') }).catch(() => null);
        if (!r || !r.ok) { const m = $('#arrExitMsg'); if (m) { m.className = 'msg bad'; m.textContent = r && r.reason === 'locked' ? 'PIN paused after too many tries: use the Account page.' : 'That PIN is not right.'; } return; }
        S.kiosk = false; S.exitPin = false; draw(); return render();
      }
      if (kind === 'move') {
        const kids = [...S.sel].filter((id) => boardKid(id)?.state === 'here'); if (!kids.length || !v.to) return;
        return act(async () => { await rpc('arrival_move', { p_center: S.center, p_id: uuid(), p_kids: kids, p_to_room: v.to }); S.sel.clear(); await load(); }, `Moved to ${roomName(v.to)}.`);
      }
      if (kind === 'person' && S.mgr) {
        const ed = fm.dataset.pid ? S.mgr.people.find((p) => p.person_id === fm.dataset.pid) : null;
        const k = ed ? ed.kind : v.kind;
        if (!String(v.name || '').trim()) { S.err = 'Write the full name.'; return render(); }
        return act(async () => {
          await rpc('pickup_set', { p_center: S.center, p_kid: S.mgrKid, p_person: ed ? ed.person_id : null, p_kind: k, p_status: 'active', p_name: v.name.trim(),
            p_relationship: v.relationship || null, p_phone: (v.phone || '').trim() || null, p_user: v.user || (ed && ed.user_id) || null,
            p_photo_path: k === 'never' ? null : (ed?.photo_path || null), p_photo_consent: k !== 'never' && !!ed?.has_photo });
          await openMgr(S.mgrKid); await load();
        }, ed ? 'Saved as a new version.' : 'Added to the list.');
      }
      if (kind === 'pass') {
        if (!String(v.name || '').trim()) { S.err = 'Write their full name.'; return render(); }
        return act(async () => { const r = await rpc('pickup_day_pass_create', { p_center: S.center, p_kid: S.mgrKid, p_name: v.name.trim(), p_relationship: v.relationship || null, p_valid_on: v.day || null }); S.code = { kid: S.mgrKid, ...r }; }, '');
      }
      if (kind === 'export') {
        return act(async () => {
          const text = await rpc('attendance_export', { p_center: S.center, p_from: v.from, p_to: v.to, p_format: v.format });
          const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
          a.download = `attendance-${v.from}-to-${v.to}-${v.format}.csv`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
        }, 'Export downloaded. It is logged in the center\'s security log.');
      }
    };
    const onKey = (e) => { if (e.key === 'Escape' && S.flow && !S.kiosk) closeFlow(); };
    // a fresh set per visit: the previous visit's listeners are removed first
    if (window.__ffArrOff) window.__ffArrOff();
    document.addEventListener('click', onClick); document.addEventListener('change', onChange); document.addEventListener('submit', onSubmit); document.addEventListener('keydown', onKey);
    const timer = setInterval(async () => { if (!document.getElementById('arrivals')) return window.__ffArrOff?.(); if (!S.flow && !S.kiosk && !document.activeElement?.closest?.('form')) { await load(); render(); } }, 30000);
    window.__ffArrOff = () => { document.removeEventListener('click', onClick); document.removeEventListener('change', onChange); document.removeEventListener('submit', onSubmit); document.removeEventListener('keydown', onKey); clearInterval(timer); S.flow = null; S.kiosk = false; overlay(); window.__ffArrOff = null; };
    await load();
    render();
  }

  // ---------------------------------------------------------------- families: who can pick up my children
  async function viewFamilyPickup(c, shell) {
    const kids = ((await client().from('kids').select('id, data').eq('center_id', c.center_id)).data || []).map((k) => ({ id: k.id, first: k.data?.first || k.data?.name || k.id }));
    const S = { kid: new URLSearchParams(location.search).get('kid') || kids[0]?.id || '', list: null, pin: {}, code: null, note: '', err: '' };
    const load = async () => {
      if (!S.kid) return;
      try { S.list = await rpc('pickup_list', { p_center: c.center_id, p_kid: S.kid }); S.err = ''; } catch (e) { S.err = friendly(e); S.list = { people: [], requests: [], day_passes: [] }; }
      S.pin = (await rpc('family_pickup_pin_status').catch(() => ({}))) || {};
    };
    const render = () => {
      const k = kids.find((x) => x.id === S.kid) || {}, first = k.first || 'your child', st = S.list || { people: [], requests: [], day_passes: [] };
      const open = (st.day_passes || []).filter((d) => !d.used_at && !d.revoked_at);
      page(shell(`<div class="card" id="famPickup"><h2>Who can pick up ${E(first)}</h2>
        ${kids.length > 1 ? `<label class="f"><span>Child</span><select class="i" id="famKid">${kids.map((x) => `<option value="${E(x.id)}"${x.id === S.kid ? ' selected' : ''}>${E(x.first)}</option>`).join('')}</select></label>` : ''}
        ${S.err ? `<p class="msg bad" role="alert">${E(S.err)}</p>` : ''}<p class="msg ok" role="status" id="famNote">${E(S.note)}</p>
        ${kids.length ? `<p class="small">The center releases ${E(first)} only to the adults below, or to someone with a one-day code from you. Changes are approved by the director.</p>
        <ul class="list cd-list" id="famPeople">${(st.people || []).map((p) => `<li><span class="who"><b>${E(p.name)}</b>${p.is_me ? ' (you)' : ''} <span class="small">${E(p.relationship_label || '')}${p.kind === 'guardian' ? ' · guardian' : ''}</span></span>${p.is_me ? '' : `<button type="button" class="btn soft small" data-fp="remove" data-pid="${E(p.person_id)}">Ask to remove</button>`}</li>`).join('') || '<li class="small muted">Nobody is on the list yet. Ask the director to add you.</li>'}</ul>
        ${(st.requests || []).length ? `<h3>Your requests</h3><ul class="list cd-list" id="famRequests">${st.requests.map((r) => `<li><span class="who">${E(r.action === 'add' ? 'Add' : r.action === 'remove' ? 'Remove' : 'Change')} ${E(r.name || '')}: <b>${E({ pending: 'waiting for the director', approved: 'approved', declined: 'declined', withdrawn: 'withdrawn' }[r.status] || r.status)}</b></span>${r.status === 'pending' ? `<button type="button" class="btn soft small" data-fp="withdraw" data-id="${E(r.id)}">Withdraw</button>` : ''}</li>`).join('')}</ul>` : ''}` : '<p class="empty">No child is linked to your account yet.</p>'}</div>
        ${kids.length ? `<form class="card" data-fp-form="add" novalidate><h2>Ask to add an adult</h2><div class="row two">
          <label class="f"><span>Full name</span><input class="i" name="name" maxlength="80" required autocomplete="off"></label>
          <label class="f"><span>Relationship</span><select class="i" name="relationship">${relOpts('', true)}</select></label>
          <label class="f"><span>Phone</span><input class="i" name="phone" inputmode="tel" maxlength="20" autocomplete="off"></label></div>
          <button type="submit" class="btn navy">Send to the director</button></form>
        <form class="card" data-fp-form="pass" novalidate><h2>Someone else picking up one day</h2><div class="row two">
          <label class="f"><span>Their full name</span><input class="i" name="name" maxlength="80" required autocomplete="off"></label>
          <label class="f"><span>Relationship</span><select class="i" name="relationship">${relOpts('', true)}</select></label>
          <label class="f"><span>Day</span><input class="i" type="date" name="day" value="${E(localDay())}"></label></div>
          <button type="submit" class="btn soft">Get a one-day code</button>
          ${S.code ? codeBox(S.code) : ''}
          ${open.length ? `<ul class="list cd-list">${open.map((d) => `<li><span class="who">One-day: <b>${E(d.name)}</b> on ${E(d.valid_on)}</span><button type="button" class="btn soft small" data-fp="revoke" data-id="${E(d.id)}">Cancel</button></li>`).join('')}</ul>` : ''}</form>
        <form class="card" data-fp-form="pin" novalidate><h2>Your sign-in PIN for the center's tablet</h2>
          <p class="small">${S.pin.pin_set ? 'You have a PIN. Set a new one any time.' : 'Optional: instead of signing with a finger at drop-off and pick-up, type this PIN.'}</p>
          <div class="row two"><label class="f"><span>PIN (4 to 6 digits)</span><input class="i arr-pin" name="pin" type="password" inputmode="numeric" maxlength="6" autocomplete="off" required></label>
          <label class="f"><span>Type it again</span><input class="i arr-pin" name="pin2" type="password" inputmode="numeric" maxlength="6" autocomplete="off" required></label></div>
          <button type="submit" class="btn soft">${S.pin.pin_set ? 'Change PIN' : 'Set PIN'}</button></form>` : ''}`), `Pickup · ${c.name}`);
      $('#famKid')?.addEventListener('change', async (e) => { S.kid = e.target.value; S.code = null; await load(); render(); });
      $$('[data-fp]').forEach((b) => b.addEventListener('click', async () => {
        const a = b.dataset.fp;
        if (a === 'remove') {
          if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Click again to ask'; return; }
          return act(async () => { await rpc('pickup_request_submit', { p_center: c.center_id, p_id: uuid(), p_kid: S.kid, p_action: 'remove', p_person: b.dataset.pid }); }, 'Asked the director to remove this adult.');
        }
        if (a === 'withdraw') return act(() => rpc('pickup_request_withdraw', { p_center: c.center_id, p_id: b.dataset.id }), 'Request withdrawn.');
        if (a === 'revoke') return act(async () => { await rpc('pickup_day_pass_revoke', { p_center: c.center_id, p_id: b.dataset.id }); S.code = null; }, 'One-day pickup cancelled.');
      }));
      $$('[data-fp-form]').forEach((fm) => fm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const v = Object.fromEntries(new FormData(fm).entries());
        if (fm.dataset.fpForm === 'add') {
          if (!String(v.name || '').trim()) { S.err = 'Write the adult\'s full name.'; return render(); }
          return act(() => rpc('pickup_request_submit', { p_center: c.center_id, p_id: uuid(), p_kid: S.kid, p_action: 'add', p_name: v.name.trim(), p_relationship: v.relationship || null, p_phone: (v.phone || '').trim() || null }), 'Sent. The director will check and approve it.');
        }
        if (fm.dataset.fpForm === 'pass') {
          if (!String(v.name || '').trim()) { S.err = 'Write their full name.'; return render(); }
          return act(async () => { const r = await rpc('pickup_day_pass_create', { p_center: c.center_id, p_kid: S.kid, p_name: v.name.trim(), p_relationship: v.relationship || null, p_valid_on: v.day || null }); S.code = r; }, '');
        }
        if (fm.dataset.fpForm === 'pin') {
          if (v.pin !== v.pin2) { S.err = 'The two PINs do not match.'; return render(); }
          return act(() => rpc('family_set_pickup_pin', { p_pin: String(v.pin || '') }), 'PIN saved. Use it on the center\'s tablet instead of signing.');
        }
      }));
    };
    const act = async (fn, note) => { try { await fn(); S.note = note; S.err = ''; if (note) live(note); } catch (e) { S.err = friendly(e); S.note = ''; } await load(); render(); };
    await load();
    render();
  }

  return { viewArrivals, viewFamilyPickup };
}
