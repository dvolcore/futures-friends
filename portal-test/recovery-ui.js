// Futures Hub front-end: account recovery for directors (N18, migration 20261029020000_account_recovery.sql,
// docs/ops/ACCOUNT_RECOVERY.md). /c/<slug>/recovery
//
//   Reset two-step verification   a SECOND director resets a colleague's lost authenticator (recovery_mfa_reset). Never your own.
//   New sign-in link for a family a locked-out parent, after an identity check (recovery_family_reinvite); a new email address
//                                  needs a photo-ID check. The worker sends the link.
//   Director left                  the organization owner or the center owner moves the director role to a staff member
//                                  (recovery_director_transfer). The database decides who may; this page only offers the forms.
//   Recent recoveries              account_recovery_list
// The identity note says HOW identity was checked, never an ID, license or phone number (the database refuses long digit runs).
// Staff pages stay English for now (the Spanish is in i18n-es-ui.js for the audit).

const METHODS = [
  ['in_person_photo_id', 'Photo ID, in person'],
  ['video_call_photo_id', 'Photo ID on a video call'],
  ['callback_number_on_file', 'Called back on the number on file'],
  ['known_to_staff_in_person', 'Known to staff, in person'],
];
const KIND = { mfa_reset: 'Two-step verification reset', family_reinvite: 'New sign-in link for a family', director_transfer: 'Director transfer' };
const STATUS = { done: 'Done', link_pending: 'Link waiting to be sent', link_sent: 'Link sent', failed: 'Failed' };

export function mountRecovery(h) {
  const { esc, $, rpc, page, live, friendly } = h;
  const methodSelect = (id, only) => `<label class="f"><span>How you checked who this is</span><select class="i" id="${id}" required>
    <option value="">Choose…</option>${METHODS.filter(([v]) => !only || only.includes(v)).map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join('')}</select></label>`;
  const noteField = (id) => `<label class="f"><span>What you checked <span class="hint">10 to 300 characters; never an ID, license or phone number</span></span>
    <textarea class="i" id="${id}" rows="2" maxlength="300" required></textarea></label>`;
  const when = (iso) => new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));

  async function viewRecovery(c, shell) {
    const [people, list] = await Promise.all([rpc('account_recovery_people', { p_center: c.center_id }), rpc('account_recovery_list', { p_center: c.center_id })]);
    const staff = people.filter((p) => p.role !== 'family' && !p.me);
    const twoStep = staff.filter((p) => p.two_step);
    const families = people.filter((p) => p.role === 'family');
    const directors = people.filter((p) => p.role === 'director' && !p.me && !p.org);
    const others = people.filter((p) => p.role !== 'family');
    const opt = (p) => `<option value="${esc(p.user_id)}">${esc(p.name)} (${esc(p.email)})${p.locked ? ' · locked' : ''}</option>`;
    page(shell(`<div class="card" id="recoveryIntro"><h2>Account recovery</h2>
      <p>Help someone back into their account. Check who they are first, in person, on a video call with photo ID, or by calling back the number on file. Every step is recorded in the audit log and the person is told.</p>
      <p class="small muted">Forgot a password? They can reset it themselves from the sign-in page ("Forgot your password?").</p></div>

      <form class="card" id="mfaForm" novalidate><h2>Reset two-step verification</h2>
        <p class="small muted">For a colleague who lost the phone with their authenticator app. Only a second director (or Futures Friends support) can do this, never the person themselves. They set it up again at their next sign-in.</p>
        ${twoStep.length ? `<label class="f"><span>Staff member</span><select class="i" id="mfaUser" required>${twoStep.map(opt).join('')}</select></label>
        ${methodSelect('mfaMethod', ['in_person_photo_id', 'video_call_photo_id', 'callback_number_on_file'])}${noteField('mfaNote')}
        <p class="msg" role="status" id="mfaMsg"></p><button class="btn center" type="submit">Reset two-step verification</button>`
          : '<p class="empty">Nobody else at this center uses two-step verification yet.</p>'}</form>

      <form class="card" id="famForm" novalidate><h2>New sign-in link for a family</h2>
        <p class="small muted">For a parent who is locked out or no longer gets our emails. Their account is unlocked, every session ends, and a one-time link to choose a new password is emailed to them.</p>
        ${families.length ? `<label class="f"><span>Family member</span><select class="i" id="famUser" required>${families.map(opt).join('')}</select></label>
        ${methodSelect('famMethod')}${noteField('famNote')}
        <label class="f"><span>New email address <span class="hint">optional; needs a photo-ID check</span></span><input class="i" type="email" id="famEmail" autocomplete="off"></label>
        <p class="msg" role="status" id="famMsg"></p><button class="btn center" type="submit">Send a new sign-in link</button>`
          : '<p class="empty">No family accounts at this center yet.</p>'}</form>

      <form class="card" id="xferForm" novalidate><h2>A director has left</h2>
        <p class="small muted">The owner of the center (or Futures Friends support) moves the director role to a staff member and removes the departed director's access. Their records stay.</p>
        ${directors.length ? `<label class="f"><span>Director who left</span><select class="i" id="xferFrom" required>${directors.map(opt).join('')}</select></label>
        <label class="f"><span>New director</span><select class="i" id="xferTo" required>${others.filter((p) => p.role === 'teacher' || p.role === 'director').map(opt).join('')}</select></label>
        <label class="f"><span>Reason</span><textarea class="i" id="xferReason" rows="2" maxlength="300" required></textarea></label>
        <p class="msg" role="status" id="xferMsg"></p><button class="btn center" type="submit">Transfer the director role</button>`
          : '<p class="empty">There is no other director at this center.</p>'}</form>

      <div class="card" id="recoveryList"><h2>Recent recoveries</h2>${list.length ? `<ul class="list">${list.map((r) => `<li><span class="who"><b>${esc(KIND[r.kind] || r.kind)}</b>
        <span class="small muted">${esc(r.target || '')}${r.other ? ` → ${esc(r.other)}` : ''} · ${esc(when(r.at))} · by ${esc(r.by || 'support')} · ${esc(STATUS[r.status] || r.status)}</span></span></li>`).join('')}</ul>`
        : '<p class="empty">No account recoveries yet.</p>'}</div>`), `Account recovery · ${c.name}`, { english: true });

    const submit = (formId, msgId, call, ok) => {
      const f = $(`#${formId}`); const m = $(`#${msgId}`);
      if (!f || !m) return;
      f.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const r = await call();
          m.className = 'msg ok'; m.textContent = ok(r); live(m.textContent);
        } catch (err) { m.className = 'msg bad'; m.textContent = friendly(err); }
      });
    };
    submit('mfaForm', 'mfaMsg', () => rpc('recovery_mfa_reset', { p_center: c.center_id, p_user: $('#mfaUser').value, p_identity_method: $('#mfaMethod').value || null,
      p_identity_note: $('#mfaNote').value, p_reason: null }), () => 'Two-step verification reset. Their sessions ended; they set it up again at their next sign-in.');
    submit('famForm', 'famMsg', () => rpc('recovery_family_reinvite', { p_center: c.center_id, p_user: $('#famUser').value, p_identity_method: $('#famMethod').value || null,
      p_identity_note: $('#famNote').value, p_new_email: $('#famEmail').value.trim() || null }), () => 'Done. A new sign-in link is on its way to the family.');
    submit('xferForm', 'xferMsg', () => rpc('recovery_director_transfer', { p_center: c.center_id, p_from: $('#xferFrom').value, p_to: $('#xferTo').value,
      p_reason: $('#xferReason').value }), () => 'Director role transferred. The departed director\'s access is removed.');
  }
  return { viewRecovery };
}
