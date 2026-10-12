// Futures Hub front-end: child intake + care alerts (migration 20261014200000_child_intake_care_alerts.sql) and the center's view of
// HQ support access (20261014100000_org_hierarchy_support_access.sql). Mounted by app.js with its helpers.
//
//   /enroll/<token>              the family's enrollment form (no account): 7 short steps, saved as a draft on every step, signed and
//                                submitted at the end; documents upload into the enrollment's private, write-only folder
//   /c/<slug>/enroll             director: send an enrollment link, see every enrollment, review, ask for changes, approve into a room
//   /c/<slug>/children           staff (every room): the roster with care-alert badges; a child's record (alerts, action plans,
//                                contacts, consents, documents). Director: also the "Records to finish" tracking list
//   /c/<slug>/child/<kid>        one child's record; families see their own child here and add or update alerts and contacts
//   /c/<slug>/support            director: HQ support-access requests (approve, decline, end) and what was read under them
// Every read goes through audited database functions; nothing here reads the care tables directly.
import { fmtMoney, localeOf } from './i18n.js';   // the reader's own language for dates, times and money (en-US / es-US)
import { centerTz } from './center-time.js';   // times in the center's zone

export const ALERT_TYPES = [['allergy', 'Allergy'], ['diet', 'Diet'], ['condition', 'Health condition'], ['behavior', 'Behavior support'],
  ['developmental', 'Developmental / diagnosis'], ['custody', 'Custody'], ['other', 'Other']];
export const SEVERITY = [['info', 'Good to know'], ['moderate', 'Moderate'], ['severe', 'Severe'], ['life_threatening', 'Life-threatening']];
export const CATEGORY = { allergy: [['food', 'Food'], ['environmental', 'Environmental (pollen, dust, pets)'], ['medication', 'Medication'], ['insect', 'Insect sting'], ['latex', 'Latex'], ['other', 'Other']],
  diet: [['religious', 'Religious'], ['cultural', 'Cultural'], ['vegetarian', 'Vegetarian'], ['vegan', 'Vegan'], ['medical', 'Medical'], ['preference', 'Family preference']] };
export const DOC_TYPES = [['immunization_record', 'Immunization record'], ['immunization_exemption', 'Immunization exemption'],
  ['health_assessment', 'Health assessment / exam report'], ['allergy_action_plan', 'Allergy action plan'], ['care_plan', 'Care plan'],
  ['medical_statement', 'Medical statement for meals'], ['iep', 'IEP'], ['ifsp', 'IFSP'], ['court_order', 'Court order / custody papers'],
  ['medication_authorization', 'Medication permission'], ['emergency_consent', 'Emergency medical consent'], ['other', 'Other']];
const IMM = [['record_on_file', 'Up to date (I will upload the record)'], ['in_progress', 'In progress (catching up)'],
  ['exemption_medical', 'Medical exemption'], ['exemption_religious', 'Religious exemption'], ['missing', 'I need to find it']];
const ICON = { allergy: '⚠', diet: '🍽', condition: '✚', behavior: '◐', developmental: '◆', custody: '⚖', other: '•' };
export const SEV_CLASS = { info: 'sev-info', moderate: 'sev-mod', severe: 'sev-sev', life_threatening: 'sev-life' };
const label = (list, v) => (list.find((x) => x[0] === v) || [v, v])[1];

// The roster badge for one child (also used by the demo): an icon per alert type, red when anything is life-threatening.
export function badgeHtml(esc, b) {
  if (!b || !b.types || !b.types.length) return '';
  const sev = SEV_CLASS[b.top_severity] || 'sev-info';
  const words = b.types.map((t) => label(ALERT_TYPES, t)).join(', ');
  return `<span class="care-badge ${sev}" title="Care alerts: ${esc(words)}" aria-label="Care alerts: ${esc(words)}${b.emergency_med ? ', emergency medication' : ''}">
    ${b.types.map((t) => `<span aria-hidden="true">${ICON[t] || '•'}</span>`).join('')}${b.emergency_med ? '<span class="med">EPI</span>' : ''}${b.unverified ? '<span class="unv" title="Not yet verified by the director">?</span>' : ''}</span>`;
}

export function mountCare(h) {
  const { esc, $, $$, rpc, client, page, live, friendly, go } = h;

  // ---- the family's enrollment form --------------------------------------------------------------------------------------
  // Fees of a full packet (registration fee, deposit): what is due, and how to pay. Online only while the platform switch and Stripe are on;
  // otherwise "pay at the front desk" (the director records it).
  const money = (cents) => fmtMoney(Number(cents || 0) / 100);
  function feesHtml(fees, online) {
    const due = (fees || []).filter((f) => f.status === 'due');
    if (!(fees || []).length) return '';
    const total = due.reduce((a, f) => a + Number(f.amount_cents), 0);
    return `<div class="card soft" id="packetFees"><h3>Registration fee and deposit</h3><ul class="plain">${fees.map((f) => `<li>${esc(f.kind === 'deposit' ? 'Deposit' : 'Registration fee')}: <b>${esc(money(f.amount_cents))}</b>
        ${f.status === 'due' ? '<span class="chip warn">Due</span>' : f.status === 'paid' ? '<span class="chip ok">Paid</span>' : '<span class="chip">Waived</span>'}</li>`).join('')}</ul>
      ${due.length ? (online ? `<button class="btn gold" type="button" id="payOnline">Pay ${esc(money(total))} online</button><p class="small muted">Or pay at the front desk.</p>`
        : `<p class="small"><b>Pay at the front desk</b> (cash, check or card) before the first day. Online payment opens soon.</p>`) : ''}
      <p class="msg" id="payMsg" role="status"></p></div>`;
  }
  function bindPay(token, lang) {
    if (!$('#payOnline')) return;
    $('#payOnline').onclick = async () => {
      const m = $('#payMsg');
      try {
        const r = await fetch('/api/billing/enroll-fee', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, lang }) });
        const b = await r.json().catch(() => ({}));
        if (r.ok && b.url) { location.href = b.url; return; }
        m.className = 'msg bad'; m.textContent = b.error || 'Online payment is not available. Please pay at the front desk.';
      } catch (e) { m.className = 'msg bad'; m.textContent = friendly(e); }
    };
  }

  async function viewEnroll(token, opts = {}) {
    let o;
    try { o = await rpc('intake_open', { p_token: token }); } catch (e) {
      return page(`<div class="wrap narrow"><div class="card"><h1>This link does not work</h1><p class="msg bad" role="alert">${esc(friendly(e))}</p></div></div>`, 'Enrollment');
    }
    // the packet is in the family's language (from the center's pipeline) unless they chose one on this device
    if (o.lang === 'es' && !opts.chosen && opts.useLang) await opts.useLang('es');
    if (!o.editable) {
      const msg = { submitted: 'Thank you. Your enrollment form is with the director, who will be in touch.', approved: 'Your child is enrolled. Welcome!',
        declined: 'This enrollment was closed by the center. Please contact them.', cancelled: 'This enrollment was cancelled by the center.',
        expired: 'This link has expired. Ask the center to send a new one.' }[o.status] || 'This form can no longer be changed.';
      page(`<div class="wrap narrow"><div class="card" id="enrollDone"><h1>${esc(o.center_name)}</h1><p>${esc(msg)}</p></div>${o.fees ? feesHtml(o.fees, o.online_payment) : ''}</div>`, 'Enrollment');
      return bindPay(token, o.lang);
    }
    const full = !!o.full_packet;
    const d = Object.assign({ child: { first: o.child_first }, guardians: [{}], emergency_contacts: [{}], pickups: [], custody: { has_order: false },
      health: {}, alerts: [], care_notes: {}, consents: {}, special_ed: {}, privacy_consents: {}, policies_ack: {} }, o.data || {});
    let docs = o.documents || [];
    // a full enrollment packet (hub/ENROLLMENT_PACKET.md) adds special education, privacy choices, the center's policies and the signed tuition agreement
    const STEPS = full ? ['Child', 'Family', 'Pickup', 'Health & alerts', 'Special education', 'Daily care', 'Permissions', 'Privacy choices', 'Documents', 'Policies', 'Review & sign']
      : ['Child', 'Family', 'Pickup', 'Health & alerts', 'Daily care', 'Permissions', 'Documents', 'Review & sign'];
    let step = 0;
    const days = o.state === 'KS' ? 60 : 30;

    const inp = (path, lab, v, attrs = '') => `<label class="f"><span>${lab}</span><input class="i" data-p="${path}" value="${esc(v ?? '')}" ${attrs}></label>`;
    const pick = (path, lab, v, choices) => `<fieldset class="f yn"><legend>${lab}</legend><div class="choices">
      ${choices.map(([val, l]) => `<label class="choice"><input type="radio" name="${path}" data-p="${path}" data-s="1" value="${val}"${v === val ? ' checked' : ''}><span>${l}</span></label>`).join('')}</div></fieldset>`;
    const yesno = (path, lab, v) => `<fieldset class="f yn"><legend>${lab}</legend><div class="choices two">
      <label class="choice"><input type="radio" name="${path}" data-p="${path}" value="true"${v === true ? ' checked' : ''}><span>Yes</span></label>
      <label class="choice"><input type="radio" name="${path}" data-p="${path}" value="false"${v === false ? ' checked' : ''}><span>No</span></label></div></fieldset>`;
    const person = (kind, i, p, extra) => `<div class="person card soft" data-kind="${kind}" data-i="${i}">
      <div class="row two">${inp(`${kind}.${i}.name`, 'Full name', p.name, 'maxlength="80" autocomplete="off"')}${inp(`${kind}.${i}.relationship`, 'Relationship to the child', p.relationship, 'maxlength="40"')}</div>
      <div class="row two">${inp(`${kind}.${i}.phone`, 'Phone', p.phone, 'inputmode="tel" maxlength="20"')}${extra ? inp(`${kind}.${i}.email`, 'Email <span class="hint">for the Family Portal</span>', p.email, 'type="email" maxlength="254"') : inp(`${kind}.${i}.address`, 'Address <span class="hint">optional</span>', p.address, 'maxlength="200"')}</div>
      ${extra ? `${inp(`${kind}.${i}.address`, 'Home address', p.address, 'maxlength="200" autocomplete="street-address"')}
        <div class="row two">${inp(`${kind}.${i}.employer`, 'Employer <span class="hint">optional</span>', p.employer, 'maxlength="120"')}${inp(`${kind}.${i}.work_phone`, 'Work phone <span class="hint">optional</span>', p.work_phone, 'inputmode="tel" maxlength="20"')}</div>
        ${inp(`${kind}.${i}.work_schedule`, 'Work schedule <span class="hint">optional</span>', p.work_schedule, 'maxlength="120"')}` : ''}
      <button class="btn link" type="button" data-remove="${kind}" data-i="${i}">Remove</button></div>`;
    const alertRow = (a, i) => `<div class="alert-edit card soft" data-i="${i}">
      <div class="row two"><label class="f"><span>Kind of alert</span><select class="i" data-p="alerts.${i}.type">${ALERT_TYPES.filter(([v]) => v !== 'custody').map(([v, l]) => `<option value="${v}"${a.type === v ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="f"><span>How serious</span><select class="i" data-p="alerts.${i}.severity">${SEVERITY.map(([v, l]) => `<option value="${v}"${(a.severity || 'info') === v ? ' selected' : ''}>${l}</option>`).join('')}</select></label></div>
      ${CATEGORY[a.type] ? `<label class="f"><span>Type</span><select class="i" data-p="alerts.${i}.category"><option value=""></option>${CATEGORY[a.type].map(([v, l]) => `<option value="${v}"${a.category === v ? ' selected' : ''}>${l}</option>`).join('')}</select></label>` : ''}
      ${inp(`alerts.${i}.label`, 'Short name <span class="hint">e.g. Peanut allergy, Asthma, Autism, Vegetarian</span>', a.label, 'maxlength="80"')}
      ${a.type === 'allergy' || a.type === 'condition' ? inp(`alerts.${i}.reaction`, 'What happens (signs to watch for)', a.reaction, 'maxlength="400"') : ''}
      <label class="f"><span>What staff should know or do day to day</span><textarea class="i" data-p="alerts.${i}.staff_summary" maxlength="600" rows="2">${esc(a.staff_summary || '')}</textarea></label>
      <label class="f"><span>Emergency action plan <span class="hint">${a.severity === 'severe' || a.severity === 'life_threatening' ? 'required' : 'if there is one'}</span></span><textarea class="i" data-p="alerts.${i}.action_plan" maxlength="1500" rows="2">${esc(a.action_plan || '')}</textarea></label>
      ${a.type === 'condition' || a.type === 'developmental' || a.type === 'behavior' ? `<label class="f"><span>More detail <span class="hint">optional: only what helps staff care for your child</span></span><textarea class="i" data-p="alerts.${i}.diagnosis_detail" maxlength="1500" rows="2">${esc(a.diagnosis_detail || '')}</textarea></label>` : ''}
      <label class="check"><input type="checkbox" data-p="alerts.${i}.emergency_med"${a.emergency_med ? ' checked' : ''}> My child may need an emergency medicine (for example an EpiPen or inhaler)</label>
      <button class="btn link" type="button" data-remove="alerts" data-i="${i}">Remove this alert</button></div>`;

    function readForm() {
      $$('[data-p]').forEach((el) => {
        const parts = el.dataset.p.split('.');
        let tgt = d;
        for (let k = 0; k < parts.length - 1; k++) {
          const key = /^\d+$/.test(parts[k]) ? Number(parts[k]) : parts[k];
          if (tgt[key] == null) tgt[key] = /^\d+$/.test(parts[k + 1]) ? [] : {};
          tgt = tgt[key];
        }
        const last = parts[parts.length - 1];
        if (el.type === 'radio') { if (el.checked) tgt[last] = el.dataset.s ? el.value : el.value === 'true'; }
        else if (el.type === 'checkbox') tgt[last] = el.checked;
        else tgt[last] = el.value.trim();
      });
    }
    async function save(submit = false, signature = null) {
      readForm();
      return rpc('intake_save', { p_token: token, p_data: d, p_submit: submit, p_signature: signature });
    }

    function body() {
      const cur = STEPS[step];
      if (cur === 'Child') return `<h2>About your child</h2>
        <div class="row two">${inp('child.first', 'First name', d.child.first, 'maxlength="60" required')}${inp('child.last', 'Last name', d.child.last, 'maxlength="60" required')}</div>
        <div class="row two">${inp('child.dob', 'Date of birth', d.child.dob, 'type="date" required')}${inp('child.start_date', 'First day of care', d.child.start_date, 'type="date"')}</div>
        ${inp('child.preferred', 'Name your child likes to be called <span class="hint">optional</span>', d.child.preferred, 'maxlength="60"')}
        <div class="row two">${inp('child.home_language', 'Language spoken at home', d.child.home_language, 'maxlength="60"')}${inp('child.other_languages', 'Other languages <span class="hint">optional</span>', d.child.other_languages, 'maxlength="120"')}</div>
        <label class="f"><span>Family or cultural practices we should know <span class="hint">optional</span></span><textarea class="i" data-p="child.cultural_notes" maxlength="500" rows="2">${esc(d.child.cultural_notes || '')}</textarea></label>`;
      if (cur === 'Family') return `<h2>Parents and guardians</h2><p class="muted small">Licensing asks for each parent's home address, employer and phone numbers.</p>
        ${d.guardians.map((g, i) => person('guardians', i, g, true)).join('')}
        ${d.guardians.length < 4 ? '<button class="btn soft small" type="button" data-add="guardians">Add a parent or guardian</button>' : ''}
        <h2 class="mt">Emergency contacts</h2><p class="muted small">Someone we can call if we cannot reach you. At least one, not a parent.</p>
        ${d.emergency_contacts.map((g, i) => person('emergency_contacts', i, g, false)).join('')}
        ${d.emergency_contacts.length < 6 ? '<button class="btn soft small" type="button" data-add="emergency_contacts">Add an emergency contact</button>' : ''}`;
      if (cur === 'Pickup') return `<h2>Who may pick up your child</h2><p class="muted small">Parents above are on the list. Add any other adult who may pick up. Staff check photo ID.</p>
        ${d.pickups.map((g, i) => person('pickups', i, g, false)).join('') || '<p class="empty">No other adults yet.</p>'}
        ${d.pickups.length < 8 ? '<button class="btn soft small" type="button" data-add="pickups">Add an adult</button>' : ''}
        <h2 class="mt">Custody</h2>${yesno('custody.has_order', 'Is there a court order about custody or who may pick up?', d.custody.has_order)}
        <label class="f"><span>If yes, what should staff know? <span class="hint">upload the order in Documents</span></span><textarea class="i" data-p="custody.note" maxlength="1500" rows="2">${esc(d.custody.note || '')}</textarea></label>`;
      if (cur === 'Health & alerts') return `<h2>Health</h2>
        <div class="row two">${inp('health.physician_name', 'Child\'s doctor', d.health.physician_name, 'maxlength="80"')}${inp('health.physician_phone', 'Doctor\'s phone', d.health.physician_phone, 'inputmode="tel" maxlength="20"')}</div>
        <div class="row two">${inp('health.clinic', 'Clinic <span class="hint">optional</span>', d.health.clinic, 'maxlength="120"')}${inp('health.hospital', 'Hospital to use in an emergency', d.health.hospital, 'maxlength="120"')}</div>
        <label class="f"><span>Immunizations</span><select class="i" data-p="health.immunization_status"><option value=""></option>${IMM.map(([v, l]) => `<option value="${v}"${d.health.immunization_status === v ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
        ${inp('health.exam_date', `Date of your child's last check-up <span class="hint">the exam report is due within ${days} days of starting</span>`, d.health.exam_date, 'type="date"')}
        ${full ? `<label class="f"><span>Medicines your child takes every day <span class="hint">optional: name and when; medicine given at the center needs the separate permission form</span></span><textarea class="i" data-p="health.medications" maxlength="500" rows="2">${esc(d.health.medications || '')}</textarea></label>
        ${d.health.immunization_status === 'record_on_file' ? '<p class="small muted">Upload the immunization record in Documents before you sign.</p>' : ''}` : ''}
        <h2 class="mt">Care alerts</h2><p class="muted small">Allergies, diets, health conditions, diagnoses (for example autism or ADHD), behavior supports.
          Everyone who cares for your child at this center will see these so they can keep your child safe. Only share what helps them care for your child.</p>
        ${d.alerts.map(alertRow).join('') || '<p class="empty">No alerts. Add one if your child has an allergy, special diet or condition.</p>'}
        ${d.alerts.length < 20 ? '<button class="btn soft small" type="button" data-add="alerts">Add an alert</button>' : ''}`;
      if (cur === 'Special education') return `<h2>Special education</h2>
        <p class="muted small">An IEP (Individualized Education Program, from age 3) or an IFSP (Individualized Family Service Plan, before age 3) helps us support your child.
          Sharing it is your choice. Only the director and the staff who care for your child see it.</p>
        ${pick('special_ed.iep', 'Does your child have an IEP?', d.special_ed.iep, [['yes', 'Yes'], ['no', 'No'], ['evaluating', 'Being evaluated']])}
        ${pick('special_ed.ifsp', 'Does your child have an IFSP?', d.special_ed.ifsp, [['yes', 'Yes'], ['no', 'No'], ['evaluating', 'Being evaluated']])}
        ${inp('special_ed.agency', 'School district or agency <span class="hint">optional</span>', d.special_ed.agency, 'maxlength="120"')}
        <label class="f"><span>What should we know to support your child? <span class="hint">optional</span></span><textarea class="i" data-p="special_ed.notes" maxlength="1000" rows="3">${esc(d.special_ed.notes || '')}</textarea></label>
        <p class="small muted">You can upload the IEP or IFSP in Documents.</p>`;
      if (cur === 'Daily care') return `<h2>Daily care</h2><p class="muted small">Optional. Helps the teachers on day one.</p>
        ${['nap', 'toileting', 'feeding', 'comfort', 'behavior_support', 'other'].map((k) => `<label class="f"><span>${{ nap: 'Nap and rest', toileting: 'Toileting / diapering', feeding: 'Eating and feeding', comfort: 'What comforts your child', behavior_support: 'What helps when your child is upset', other: 'Anything else' }[k]}</span><textarea class="i" data-p="care_notes.${k}" maxlength="300" rows="2">${esc(d.care_notes[k] || '')}</textarea></label>`).join('')}`;
      if (cur === 'Permissions') return `<h2>Permissions</h2>
        ${yesno('consents.emergency_medical', 'In an emergency, may the center get medical care for your child if we cannot reach you? <span class="hint">required by licensing</span>', d.consents.emergency_medical)}
        ${yesno('health.emergency_med_permission', 'May trained staff give the emergency medicine named in your child\'s action plan?', d.health.emergency_med_permission)}
        ${yesno('consents.field_trips', 'Field trips and walks away from the center', d.consents.field_trips)}
        ${yesno('consents.transportation', 'Riding in the center\'s vehicle', d.consents.transportation)}
        ${yesno('consents.photo', 'Photos of your child in the private Family Portal', d.consents.photo)}
        ${yesno('consents.water_play', 'Water play (sprinklers, water tables)', d.consents.water_play)}
        ${yesno('consents.sunscreen', 'Sunscreen you provide, applied by staff', d.consents.sunscreen)}`;
      if (cur === 'Privacy choices') return `<h2>Privacy choices</h2><p class="muted small">Each choice is separate, and you can change any of them later in the Family Portal.
        The Futures Hub keeps your child's care, health and special-education records with your consent, encrypted, and only your family and the center's authorized staff can see them.</p>
        ${(o.privacy || []).map((x) => `<div class="card soft" data-purpose="${esc(x.purpose)}"><h3>${esc(x.title)}${x.required ? ' <span class="hint">needed to enroll</span>' : ''}</h3>
          <details><summary>${esc(x.notice_title)}</summary><div class="small" translate="no">${esc(x.notice_body).replace(/\n/g, '<br>')}</div></details>
          <input type="hidden" data-p="privacy_consents.${esc(x.purpose)}.notice_sha256" value="${esc(x.notice_sha256)}">
          ${pick(`privacy_consents.${x.purpose}.answer`, 'Your answer', d.privacy_consents?.[x.purpose]?.answer, [['yes', 'Yes, I agree'], ['no', 'No']])}</div>`).join('')}`;
      if (cur === 'Policies') return `<h2>The center's policies</h2><p class="muted small">Please read each one and tick the box.</p>
        ${(o.policies || []).map((x) => `<div class="card soft"><h3>${esc(x.title)}</h3><p class="small">${esc(x.body)}</p>
          <label class="check"><input type="checkbox" data-p="policies_ack.${esc(x.key)}"${d.policies_ack?.[x.key] ? ' checked' : ''}> I have read and accept this policy</label></div>`).join('')}`;
      if (cur === 'Documents') return `<h2>Documents</h2><p class="muted small">Upload a photo or PDF. Files are private to the center: staff see care and action plans; the director sees the rest.</p>
        <ul class="list" id="docList">${docs.map((x) => `<li><span class="who"><b>${esc(x.file_name)}</b><span class="small muted">${esc(label(DOC_TYPES, x.doc_type))}</span></span></li>`).join('') || '<li class="empty">Nothing uploaded yet.</li>'}</ul>
        <div class="row two"><label class="f"><span>What is it?</span><select class="i" id="docType">${DOC_TYPES.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></label>
          <label class="f"><span>File <span class="hint">PDF or photo, up to 10 MB</span></span><input class="i" type="file" id="docFile" accept="application/pdf,image/png,image/jpeg,image/heic,image/webp"></label></div>
        <button class="btn soft" type="button" id="docUp">Upload</button><p class="msg" id="docMsg" role="status"></p>`;
      return `<h2>Review and sign</h2>
        <dl class="review"><dt>Child</dt><dd>${esc(d.child.first)} ${esc(d.child.last || '')} · born ${esc(d.child.dob || '?')}</dd>
          <dt>Parents</dt><dd>${d.guardians.map((g) => esc(g.name || '?')).join(', ')}</dd>
          <dt>Emergency contacts</dt><dd>${d.emergency_contacts.map((g) => esc(g.name || '?')).join(', ')}</dd>
          <dt>Care alerts</dt><dd>${d.alerts.map((a) => esc(a.label || '?')).join(', ') || 'None'}</dd>
          <dt>Documents</dt><dd>${docs.length}</dd></dl>
        ${full ? `<h3>Enrollment and tuition agreement</h3><div class="card soft enroll-agreement-box" id="agreementDoc" translate="no">${o.agreement?.html || ''}</div>
          ${feesHtml(o.fees, false)}
          <label class="f"><span>Type the full name of a parent or guardian, exactly as on this form</span><input class="i" id="sigName" maxlength="120" autocomplete="name"></label>
          <label class="check"><input type="checkbox" id="sigAgree"> I have read the agreement and the policies. I agree to sign electronically and my typed name is my signature. The information is true and complete, and I will tell the center when it changes.</label>`
        : `<label class="f"><span>Type your full name to sign</span><input class="i" id="sigName" maxlength="120" autocomplete="name"></label>
        <label class="check"><input type="checkbox" id="sigAgree"> The information is true and complete. I will tell the center when it changes. I give the permissions I chose above.</label>`}`;
    }

    function draw(msg = '') {
      page(`<div class="wrap narrow" id="enrollForm"><p class="muted small">${esc(o.center_name)} · Enrollment form</p>
        <h1>Enroll ${esc(d.child.first || o.child_first)}</h1>
        ${o.review_note ? `<p class="msg info" role="status"><b>The director asks:</b> ${esc(o.review_note)}</p>` : ''}
        <ol class="stepper" aria-label="Steps">${STEPS.map((s, i) => `<li class="${i === step ? 'on' : i < step ? 'done' : ''}"${i === step ? ' aria-current="step"' : ''}>${esc(s)}</li>`).join('')}</ol>
        <form class="card" id="stepForm" novalidate>${body()}
          <p class="msg ${msg ? 'bad' : ''}" id="stepMsg" role="status">${esc(msg)}</p>
          <div class="cta-row">${step > 0 ? '<button class="btn soft" type="button" id="back">Back</button>' : ''}
            ${step < STEPS.length - 1 ? '<button class="btn navy" type="submit">Save and continue</button>' : '<button class="btn gold" type="submit" id="submitBtn">Sign and send to the director</button>'}</div>
          <p class="small muted">Saved as you go. You can close this page and come back with the same link until ${esc(new Date(o.expires_at).toLocaleDateString(localeOf()))}.</p>
        </form></div>`, 'Enrollment');
      $('#stepForm').onsubmit = async (e) => {
        e.preventDefault();
        const m = $('#stepMsg');
        try {
          if (step < STEPS.length - 1) { await save(false); step++; draw(); live(`Saved. Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}.`); return; }
          const sig = { name: $('#sigName').value.trim(), agree: $('#sigAgree').checked, agreement: full ? 'ff-packet-v1' : 'ff-intake-v1',
            ...(full ? { agreement_hash: o.agreement?.hash } : {}) };
          const done = await save(true, sig);
          page(`<div class="wrap narrow"><div class="card" id="enrollDone"><h1>Thank you</h1><p>${esc(o.center_name)} has your enrollment form for ${esc(d.child.first)}. The director will review it and be in touch.</p>
            ${done?.signature_hash ? `<p class="small muted">Signed electronically ${esc(new Date(done.signed_at).toLocaleString(localeOf()))}. Signature code: <span translate="no">${esc(done.signature_hash.slice(0, 16))}</span></p>` : ''}</div>
            ${full ? feesHtml(o.fees, o.online_payment) : ''}</div>`, 'Enrollment sent');
          bindPay(token, o.lang);
          live('Enrollment form sent.');
        } catch (err) { m.className = 'msg bad'; m.textContent = friendly(err); m.focus?.(); }
      };
      if ($('#back')) $('#back').onclick = async () => { readForm(); step--; draw(); };
      $$('[data-add]').forEach((b) => { b.onclick = () => { readForm(); d[b.dataset.add].push(b.dataset.add === 'alerts' ? { type: 'allergy', severity: 'info' } : {}); draw(); }; });
      $$('[data-remove]').forEach((b) => { b.onclick = () => { readForm(); d[b.dataset.remove].splice(Number(b.dataset.i), 1); draw(); }; });
      $$('select[data-p$=".type"]').forEach((s) => { s.onchange = () => { readForm(); draw(); }; });
      $$('select[data-p$=".severity"]').forEach((s) => { s.onchange = () => { readForm(); draw(); }; });
      if ($('#docUp')) $('#docUp').onclick = async () => {
        const f = $('#docFile').files[0], m = $('#docMsg');
        if (!f) { m.className = 'msg bad'; m.textContent = 'Choose a file first.'; return; }
        if (f.size > 10485760) { m.className = 'msg bad'; m.textContent = 'That file is over 10 MB.'; return; }
        const ext = (f.name.split('.').pop() || 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'pdf';
        const path = `${o.center_id}/intake-${o.upload_key}/${crypto.randomUUID()}.${ext}`;
        m.className = 'msg info'; m.textContent = 'Uploading…';
        const up = await client().storage.from('child-records').upload(path, f, { contentType: f.type || 'application/pdf' });
        if (up.error) { m.className = 'msg bad'; m.textContent = friendly(up.error); return; }
        try {
          await rpc('intake_document_add', { p_token: token, p_path: path, p_doc_type: $('#docType').value, p_file_name: f.name });
          docs = [...docs, { file_name: f.name, doc_type: $('#docType').value }]; readForm(); draw(); live('Document uploaded.');
        } catch (err) { m.className = 'msg bad'; m.textContent = friendly(err); }
      };
    }
    draw();
  }

  // ---- director: enrollments ------------------------------------------------------------------------------------------------
  const ICHIP = { invited: ['gold', 'Link sent'], in_progress: ['warn', 'Family filling in'], submitted: ['bad', 'Ready to review'],
    changes_requested: ['warn', 'Changes asked'], approved: ['ok', 'Enrolled'], declined: ['', 'Declined'], expired: ['', 'Link expired'] };
  const chip = (st) => { const [k, l] = ICHIP[st] || ['', st]; return `<span class="chip ${k}">${esc(l)}</span>`; };

  async function viewEnrollments(c, shell, focus = null, fresh = null) {
    const [list, rooms, ps] = await Promise.all([rpc('intake_list', { p_center: c.center_id }),
      client().from('rooms').select('id, data').eq('center_id', c.center_id).order('id'), rpc('enrollment_settings_get', { p_center: c.center_id })]);
    if (rooms.error) throw rooms.error;
    const roomOpts = (sel) => rooms.data.map((r) => `<option value="${esc(r.id)}"${r.id === sel ? ' selected' : ''}>${esc(r.data?.name || r.id)}</option>`).join('');
    page(shell(`<div class="grid two">
      <div><form class="card" id="linkForm" novalidate><h2>Send an enrollment link</h2>
        <p class="muted small">The family fills in the licensing form, care alerts and permissions on their phone, uploads documents and signs. No account needed. The link works for 14 days.</p>
        <label class="f"><span>Child's first name</span><input class="i" id="lFirst" maxlength="60" required></label>
        <label class="f"><span>Parent's email <span class="hint">optional, for your records</span></span><input class="i" type="email" id="lEmail" maxlength="254"></label>
        <label class="f"><span>Planned room <span class="hint">optional</span></span><select class="i" id="lRoom"><option value=""></option>${roomOpts(null)}</select></label>
        <p class="msg" id="lMsg" role="status"></p><button class="btn center" type="submit">Create link</button></form>
        ${fresh ? `<div class="card" id="freshLink"><h3>Link for ${esc(fresh.first)}</h3><p class="small muted">Copy it now: for privacy it is shown only once. Send it by text or email.</p>
          <input class="i" id="freshUrl" readonly value="${esc(fresh.url)}"><div class="cta-row"><button class="btn soft small" type="button" id="copyLink">Copy link</button></div></div>` : ''}
        <form class="card" id="packetSettings" novalidate><h2>Enrollment packet</h2>
          <p class="muted small">A full packet adds special education, privacy choices, your policies and a tuition agreement the family signs online.
            A family who accepts a seat from the waitlist gets one automatically.</p>
          <label class="check"><input type="checkbox" id="psFull"${ps.full_packet ? ' checked' : ''}> Send the full packet with every enrollment link</label>
          <div class="row two"><label class="f"><span>Registration fee ($)</span><input class="i" id="psFee" inputmode="decimal" value="${esc((ps.registration_fee_cents / 100).toFixed(2))}"></label>
            <label class="f"><span>Deposit ($)</span><input class="i" id="psDep" inputmode="decimal" value="${esc((ps.deposit_cents / 100).toFixed(2))}"></label></div>
          <label class="check"><input type="checkbox" id="psRefund"${ps.fee_refundable ? ' checked' : ''}> Refunded if the child does not start</label>
          <label class="f"><span>Tuition plan stated in new agreements</span><select class="i" id="psPlan"><option value="">The director's rate sheet</option>${ps.plans.map((p) => `<option value="${esc(p.id)}"${p.id === ps.default_plan_id ? ' selected' : ''}>${esc(p.name)} · ${esc(money(p.amount_cents))} ${esc(p.freq)}</option>`).join('')}</select></label>
          <label class="f"><span>Extra agreement terms (English) <span class="hint">optional</span></span><textarea class="i" id="psTermsEn" maxlength="8000" rows="2">${esc(ps.agreement_terms_en || '')}</textarea></label>
          <label class="f"><span>Extra agreement terms (Spanish) <span class="hint">optional</span></span><textarea class="i" id="psTermsEs" maxlength="8000" rows="2">${esc(ps.agreement_terms_es || '')}</textarea></label>
          <p class="small muted">Policies the family accepts: ${esc(ps.policies.map((x) => x.title_en).join(', '))}${ps.policies_are_default ? ' (built-in draft wording)' : ''}.
            Payment: ${ps.online_payment ? 'online or at the front desk' : 'at the front desk (online payment is off)'}.</p>
          <p class="msg" id="psMsg" role="status"></p><button class="btn soft" type="submit">Save packet settings</button></form>
      </div>
      <div class="card"><h2>Enrollments</h2>
        ${list.length ? `<ul class="list" id="intakeList">${list.map((i) => `<li><span class="who"><b>${esc(i.child_first)} ${esc(i.child_last || '')}</b>
          <span class="small muted">${i.alerts ? `${i.alerts} care alert${i.alerts > 1 ? 's' : ''} · ` : ''}${i.documents} document${i.documents === 1 ? '' : 's'}${i.submitted_at ? ` · sent ${esc(new Date(i.submitted_at).toLocaleDateString(localeOf()))}` : ''}</span></span>
          <span>${i.full_packet ? `<span class="chip">Full packet${i.lang === 'es' ? ' · ES' : ''}</span> ` : ''}${i.full_packet && i.signed ? '<span class="chip ok">Signed</span> ' : ''}${i.fees_due ? '<span class="chip warn">Fees due</span> ' : ''}${chip(i.status)} ${['submitted', 'approved'].includes(i.status) ? `<button class="btn link" type="button" data-review="${esc(i.id)}">${i.status === 'approved' ? 'View' : 'Review'}</button>` : ''}
          ${['invited', 'in_progress', 'changes_requested', 'expired'].includes(i.status) ? `<button class="btn link" type="button" data-reissue="${esc(i.id)}" data-first="${esc(i.child_first)}">New link</button>` : ''}</span></li>`).join('')}</ul>`
          : '<p class="empty">No enrollments yet.</p>'}</div></div>
      <div id="reviewPane"></div>`), `Enrollment · ${c.name}`);
    $('#linkForm').onsubmit = async (e) => {
      e.preventDefault();
      const m = $('#lMsg');
      try {
        const r = await rpc('intake_create', { p_center: c.center_id, p_child_first: $('#lFirst').value.trim(), p_email: $('#lEmail').value.trim() || null, p_room: $('#lRoom').value || null });
        await viewEnrollments(c, shell, null, { first: $('#lFirst').value.trim(), url: `${location.origin}/enroll/${r.token}` });
        live('Enrollment link created.');
      } catch (err) { m.className = 'msg bad'; m.textContent = friendly(err); }
    };
    $('#packetSettings').onsubmit = async (e) => {
      e.preventDefault();
      const m = $('#psMsg'); const cents = (v) => Math.round(Number(String(v).replace(/[$,\s]/g, '') || 0) * 100);
      try {
        await rpc('enrollment_settings_save', { p_center: c.center_id, p: { full_packet: $('#psFull').checked, registration_fee_cents: cents($('#psFee').value), deposit_cents: cents($('#psDep').value),
          fee_refundable: $('#psRefund').checked, default_plan_id: $('#psPlan').value || null, agreement_terms_en: $('#psTermsEn').value, agreement_terms_es: $('#psTermsEs').value } });
        m.className = 'msg ok'; m.textContent = 'Saved.'; live('Packet settings saved.');
      } catch (err) { m.className = 'msg bad'; m.textContent = friendly(err); }
    };
    if ($('#copyLink')) $('#copyLink').onclick = async () => { try { await navigator.clipboard.writeText($('#freshUrl').value); live('Link copied.'); } catch { $('#freshUrl').select(); } };
    $$('[data-reissue]').forEach((b) => { b.onclick = async () => {
      const r = await rpc('intake_reissue', { p_center: c.center_id, p_id: b.dataset.reissue });
      await viewEnrollments(c, shell, null, { first: b.dataset.first, url: `${location.origin}/enroll/${r.token}` });
    }; });
    $$('[data-review]').forEach((b) => { b.onclick = () => review(b.dataset.review); });
    if (focus) review(focus);

    async function review(id) {
      const g = await rpc('intake_get', { p_center: c.center_id, p_id: id });
      const d = g.data || {}; const ch = d.child || {};
      const line = (p) => `${esc(p.name || '')}${p.relationship ? ` (${esc(p.relationship)})` : ''}${p.phone ? ` · ${esc(p.phone)}` : ''}${p.email ? ` · ${esc(p.email)}` : ''}${p.address ? `<br><span class="small muted">${esc(p.address)}</span>` : ''}`;
      $('#reviewPane').innerHTML = `<div class="card" id="reviewCard"><h2>${esc(ch.first || g.child_first)} ${esc(ch.last || '')}</h2>
        <p class="small muted">Born ${esc(ch.dob || '?')} · starts ${esc(ch.start_date || '?')} · home language ${esc(ch.home_language || '?')} · signed by ${esc(g.signature?.name || '—')}</p>
        ${g.problems?.length ? `<p class="msg bad">Still missing: ${esc(g.problems.join('; '))}</p>` : ''}
        <div class="grid two"><div><h3>Parents</h3><ul class="plain">${(d.guardians || []).map((p) => `<li>${line(p)}</li>`).join('')}</ul>
          <h3>Emergency contacts</h3><ul class="plain">${(d.emergency_contacts || []).map((p) => `<li>${line(p)}</li>`).join('')}</ul>
          <h3>Pickup</h3><ul class="plain">${(d.pickups || []).map((p) => `<li>${line(p)}</li>`).join('') || '<li>Parents only</li>'}</ul>
          ${d.custody?.has_order ? `<p class="msg bad"><b>Court order:</b> ${esc(d.custody.note || 'see documents')}</p>` : ''}</div>
        <div><h3>Care alerts</h3>${(d.alerts || []).map((a) => `<div class="alert-card ${SEV_CLASS[a.severity] || ''}"><b>${esc(a.label)}</b> <span class="chip">${esc(label(SEVERITY, a.severity || 'info'))}</span>
            ${a.reaction ? `<p class="small">Signs: ${esc(a.reaction)}</p>` : ''}${a.staff_summary ? `<p class="small">${esc(a.staff_summary)}</p>` : ''}
            ${a.action_plan ? `<p class="small"><b>Action plan:</b> ${esc(a.action_plan)}</p>` : ''}${a.diagnosis_detail ? `<p class="small muted">${esc(a.diagnosis_detail)}</p>` : ''}</div>`).join('') || '<p class="empty">None</p>'}
          <h3>Health</h3><p class="small">Doctor ${esc(d.health?.physician_name || '—')} ${esc(d.health?.physician_phone || '')} · hospital ${esc(d.health?.hospital || '—')} · immunizations: ${esc(label(IMM, d.health?.immunization_status || ''))}</p>
          <h3>Permissions</h3><p class="small">${Object.entries(d.consents || {}).map(([k, v]) => `${esc(k.replace('_', ' '))}: ${v ? 'yes' : 'no'}`).join(' · ')}</p>
          <h3>Documents</h3><ul class="plain">${g.documents.map((x) => `<li>${esc(label(DOC_TYPES, x.doc_type))}: ${esc(x.file_name)}</li>`).join('') || '<li>None</li>'}</ul></div></div>
        ${g.full_packet ? `<div class="grid two" id="packetReview"><div>
            <h3>Special education</h3><p class="small">IEP: ${esc(d.special_ed?.iep || '—')} · IFSP: ${esc(d.special_ed?.ifsp || '—')}${d.special_ed?.agency ? ` · ${esc(d.special_ed.agency)}` : ''}</p>
            ${d.special_ed?.notes ? `<p class="small" translate="no">${esc(d.special_ed.notes)}</p>` : ''}
            ${d.health?.medications ? `<h3>Daily medicines</h3><p class="small" translate="no">${esc(d.health.medications)}</p>` : ''}
            <h3>Privacy choices</h3><p class="small">${Object.entries(d.privacy_consents || {}).map(([k, v]) => `${esc(k.replace(/_/g, ' '))}: ${esc(v?.answer || '—')}`).join(' · ') || '—'}</p>
            <h3>Policies</h3><p class="small">${Object.values(d.policies_ack || {}).filter(Boolean).length} accepted</p>
            <h3>Tuition plan</h3><p class="small">${g.tuition_plan ? `${esc(g.tuition_plan.name)} · ${esc(money(g.tuition_plan.amount_cents))} ${esc(g.tuition_plan.freq)}` : 'The director\'s rate sheet (no plan chosen)'}</p></div>
          <div><h3>Signed agreement</h3>${g.agreement ? `<p class="small">Signed by <b>${esc(g.agreement.signed_name)}</b> on ${esc(new Date(g.agreement.signed_at).toLocaleString(localeOf()))} (${esc(g.agreement.lang === 'es' ? 'Spanish' : 'English')}, basic e-signature)<br>
              <span class="mini muted">Document ${esc(g.agreement.doc_hash.slice(0, 16))}… · signature ${esc(g.agreement.signature_hash.slice(0, 16))}…</span></p>
              <details><summary>Show the signed agreement</summary><div class="card soft" translate="no">${g.agreement.html}</div></details>` : '<p class="msg bad">Not signed yet.</p>'}
            <h3>Registration fee and deposit</h3><ul class="plain" id="feeList">${(g.fees || []).map((f) => `<li data-fee="${esc(f.id)}">${esc(f.kind === 'deposit' ? 'Deposit' : 'Registration fee')} ${esc(money(f.amount_cents))}:
              ${f.status === 'due' ? `<span class="chip warn">Due</span> <select class="i small" data-fee-method="${esc(f.id)}" aria-label="How it was paid"><option value="desk_cash">Cash</option><option value="desk_check">Check</option><option value="desk_card">Card at the desk</option><option value="waived">Waive</option></select>
                <input class="i small" data-fee-ref="${esc(f.id)}" maxlength="60" placeholder="Receipt or check number / reason to waive" aria-label="Receipt or check number, or the reason to waive">
                <button class="btn soft small" type="button" data-fee-record="${esc(f.id)}">Record</button>`
              : `<span class="chip ${f.status === 'paid' ? 'ok' : ''}">${esc(f.status === 'paid' ? 'Paid' : 'Waived')}</span> <span class="small muted">${esc(f.method || '')}${f.reference ? ` · ${esc(f.reference)}` : ''}</span>`}</li>`).join('') || '<li>None</li>'}</ul>
            ${g.packet_problems?.length ? `<p class="msg bad">Packet still missing: ${esc(g.packet_problems.join('; '))}</p>` : ''}
            ${g.enroll_result ? `<h3>Enrolled with</h3><p class="small">Consents recorded: ${esc((g.enroll_result.consents || []).join(', ') || 'none')} · billing: ${esc(String(g.enroll_result.billing || '').replace(/_/g, ' '))}
              · health records: ${esc(g.enroll_result.health?.module === 'not_installed' ? 'kept on the child record' : 'handed to the health records module')}
              · special education: ${esc(g.enroll_result.special_ed?.module === 'not_installed' ? 'kept on the child record' : 'handed to the special-education module')}</p>` : ''}</div></div>` : ''}
        ${g.status === 'submitted' ? `<div class="decide"><label class="f"><span>Room</span><select class="i" id="dRoom">${roomOpts(g.room)}</select></label>
          <label class="f"><span>Note to the family <span class="hint">needed to ask for changes</span></span><textarea class="i" id="dNote" maxlength="1000" rows="2"></textarea></label>
          <p class="msg" id="dMsg" role="status"></p>
          <div class="cta-row"><button class="btn center" type="button" data-decide="approve">${g.full_packet ? 'Enroll (one click)' : 'Approve and enroll'}</button>
            <button class="btn soft" type="button" data-decide="changes">Ask for changes</button><button class="btn link" type="button" data-decide="decline">Decline</button></div></div>`
          : g.kid ? `<p><a class="btn soft" href="/c/${esc(c.slug)}/child/${esc(g.kid)}" data-nav>Open ${esc(ch.first)}'s record</a></p>` : ''}</div>`;
      $('#reviewCard').scrollIntoView({ block: 'start' });
      $$('[data-fee-record]').forEach((b) => { b.onclick = async () => {
        const f = b.dataset.feeRecord, method = document.querySelector(`[data-fee-method="${f}"]`).value, ref = document.querySelector(`[data-fee-ref="${f}"]`).value.trim();
        try {
          await rpc('enrollment_fee_record', { p_center: c.center_id, p_fee: f, p_method: method, p_reference: method === 'waived' ? null : ref || null, p_note: method === 'waived' ? ref : null });
          live('Fee recorded.'); await review(id);
        } catch (err) { $('#dMsg') ? ($('#dMsg').className = 'msg bad', $('#dMsg').textContent = friendly(err)) : live(friendly(err)); }
      }; });
      $$('[data-decide]').forEach((b) => { b.onclick = async () => {
        try {
          const enroll = g.full_packet && b.dataset.decide === 'approve';
          const r = enroll ? await rpc('enrollment_enroll', { p_center: c.center_id, p_intake: id, p_room: $('#dRoom').value || null, p_note: $('#dNote').value.trim() || null })
            : await rpc('intake_decide', { p_center: c.center_id, p_id: id, p_decision: b.dataset.decide, p_room: $('#dRoom').value || null, p_note: $('#dNote').value.trim() || null });
          live(r.status === 'approved' ? `Enrolled. ${r.alerts} care alerts, ${r.pickup_people} people on the pickup list, ${r.family_invites} family invitation(s).` : 'Saved.');
          await viewEnrollments(c, shell, r.status === 'approved' ? id : null);
        } catch (err) { $('#dMsg').className = 'msg bad'; $('#dMsg').textContent = friendly(err); }
      }; });
    }
  }

  // ---- staff: roster with badges; director: records to finish ----------------------------------------------------------------
  async function viewChildren(c, shell, permViews) {
    const director = c.role === 'director';
    // A teacher without the classroom permission gets the care alerts of every child (center_alerts) and nothing else.
    let mine = null;
    if (!director && permViews) {
      mine = await rpc('my_permissions', { p_center: c.center_id }).catch(() => null);
      if (mine && !mine.perms.includes('classroom')) return permViews.alertsOnly(c, shell, 'Care alerts are shown to every staff member at');
    }
    // A teacher narrowed to some rooms still sees every child's alert (owner rule): the other rooms' children appear here, alert only.
    let extra = '';
    if (mine && (mine.rooms || []).length && !mine.perms.includes('allkids')) {
      const all = await rpc('center_alerts', { p_center: c.center_id }).catch(() => []);
      extra = `<div class="card" id="otherRoomAlerts"><h2>Care alerts in all rooms</h2><p class="small muted">You can open the records of your own rooms. For every other child you see the care alert only.</p>
        <ul class="plain">${all.map((r) => `<li><b>${esc(r.first_name)} ${esc(r.last_initial || '')}</b> · ${esc(r.room || '')}: ${esc(r.alert)}</li>`).join('') || '<li class="muted">None</li>'}</ul></div>`;
    }
    const [kids, board, rooms, status] = await Promise.all([
      client().from('kids').select('id, room, data').eq('center_id', c.center_id).is('left_on', null).order('id'),
      rpc('care_alert_board', { p_center: c.center_id }),
      client().from('rooms').select('id, data').eq('center_id', c.center_id).order('id'),
      director ? rpc('child_records_status', { p_center: c.center_id }) : Promise.resolve(null)]);
    if (kids.error) throw kids.error;
    const byKid = Object.fromEntries(board.map((b) => [b.kid, b]));
    const roomName = Object.fromEntries((rooms.data || []).map((r) => [r.id, r.data?.name || r.id]));
    const groups = {};
    for (const k of kids.data) (groups[k.room || ''] ||= []).push(k);
    page(shell(`<div class="card"><h2>Children</h2><p class="small muted">Care alerts are shown to every staff member at ${esc(c.name)} so every adult can keep every child safe. Opening a record is logged.</p>
      <div class="legend small"><span class="care-badge sev-life">⚠</span> life-threatening <span class="care-badge sev-sev">⚠</span> severe <span class="care-badge sev-mod">⚠</span> moderate <span class="care-badge sev-info">•</span> good to know · <b>EPI</b> emergency medicine · <b>?</b> not yet verified</div>
      ${Object.entries(groups).map(([room, ks]) => `<h3>${esc(roomName[room] || 'No room yet')}</h3><ul class="roster">${ks.map((k) => `<li><a href="/c/${esc(c.slug)}/child/${esc(k.id)}" data-nav class="kid-card${byKid[k.id] ? ` ${SEV_CLASS[byKid[k.id].top_severity]}` : ''}" data-kid="${esc(k.id)}">
        <span class="kid-name">${esc(k.data?.first || k.data?.name || k.id)} ${esc((k.data?.last || '').slice(0, 1))}</span>${badgeHtml(esc, byKid[k.id])}
        ${byKid[k.id] ? `<span class="small">${esc(byKid[k.id].alerts.map((a) => a.label).join(' · '))}</span>` : ''}${byKid[k.id]?.meal === 'needed' ? '<span class="chip bad">Meal held: no serving instruction</span>' : ''}</a></li>`).join('')}</ul>`).join('') || '<p class="empty">No children yet.</p>'}</div>
      ${status ? `<div class="card" id="recordsStatus"><h2>Records to finish</h2><p class="small muted">From the licensing rules for your state: exam report, immunizations, emergency contacts and consent, signature, care plans, yearly reviews.</p>
        <table class="t"><thead><tr><th>Child</th><th>Still open</th></tr></thead><tbody>${status.filter((s) => s.open.length).map((s) => `<tr><td><a href="/c/${esc(c.slug)}/child/${esc(s.kid)}" data-nav>${esc(s.first)} ${esc((s.last || '').slice(0, 1))}</a></td>
          <td>${s.open.map((i) => `<span class="chip ${i.state === 'overdue' ? 'bad' : 'warn'}">${esc(i.label)}${i.due_on ? ` · ${i.state === 'overdue' ? 'was due' : 'due'} ${esc(i.due_on)}` : ''}</span>`).join(' ')}</td></tr>`).join('') || '<tr><td colspan="2">Every file is complete.</td></tr>'}</tbody></table></div>` : ''}${extra}`), `Children · ${c.name}`);
  }

  async function viewChild(c, shell, kid) {
    const r = await rpc('child_record_get', { p_center: c.center_id, p_kid: kid });
    const p = r.profile || {}; const director = c.role === 'director'; const family = r.reader === 'family';
    const ppl = (xs) => (xs || []).map((x) => `<li>${esc(x.name || '')}${x.relationship ? ` (${esc(x.relationship)})` : ''}${x.phone ? ` · <a href="tel:${esc(x.phone)}">${esc(x.phone)}</a>` : ''}</li>`).join('') || '<li class="muted">None on file</li>';
    page(shell(`<div class="card" id="childRecord"><h2>${esc(r.first || r.name)} ${esc(r.last || '')}</h2>
      <p class="small muted">${p.dob ? `Born ${esc(p.dob)} · ` : ''}${p.preferred_name ? `Goes by ${esc(p.preferred_name)} · ` : ''}${p.home_language ? `Home language ${esc(p.home_language)}` : ''}</p>
      <h3>Care alerts</h3><div id="alertList">${r.alerts.filter((a) => a.status === 'active').map((a) => `<div class="alert-card ${SEV_CLASS[a.severity]}" data-alert="${esc(a.id)}">
        <b>${esc(a.label)}</b> <span class="chip">${esc(label(ALERT_TYPES, a.type))}</span> <span class="chip">${esc(label(SEVERITY, a.severity))}</span>
        ${a.emergency_med ? '<span class="chip bad">Emergency medicine</span>' : ''}${a.verified ? '' : '<span class="chip warn">Not yet verified</span>'}${a.verified && a.review_due ? '<span class="chip warn">Yearly review due</span>' : ''}
        ${a.reaction ? `<p>Signs: ${esc(a.reaction)}</p>` : ''}${a.staff_summary ? `<p>${esc(a.staff_summary)}</p>` : ''}
        ${a.action_plan ? `<p><b>Action plan:</b> ${esc(a.action_plan)}</p>` : ''}${a.diagnosis_detail ? `<p class="small muted">${esc(a.diagnosis_detail)}</p>` : ''}
        ${director ? `<div class="cta-row"><button class="btn link" type="button" data-verify="${esc(a.id)}">${a.verified ? 'Re-verify' : 'Verify'}</button><button class="btn link" type="button" data-end="${esc(a.id)}">No longer applies</button></div>` : ''}</div>`).join('') || '<p class="empty">No care alerts.</p>'}</div>
      ${director || family ? `<details class="add-alert"><summary>Add a care alert</summary><form id="alertForm" novalidate>
        <div class="row two"><label class="f"><span>Kind</span><select class="i" id="aType">${ALERT_TYPES.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></label>
          <label class="f"><span>How serious</span><select class="i" id="aSev">${SEVERITY.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></label></div>
        <label class="f"><span>Short name</span><input class="i" id="aLabel" maxlength="80"></label>
        <label class="f"><span>What staff should know</span><textarea class="i" id="aSum" maxlength="600" rows="2"></textarea></label>
        <label class="f"><span>Action plan</span><textarea class="i" id="aPlan" maxlength="1500" rows="2"></textarea></label>
        <label class="check"><input type="checkbox" id="aMed"> Emergency medicine may be needed</label>
        <p class="msg" id="aMsg" role="status"></p><button class="btn center" type="submit">Save alert</button>
        ${family ? '<p class="small muted">The director verifies new alerts. Staff see them right away, marked "not yet verified".</p>' : ''}</form></details>` : ''}
      <div class="grid two"><div><h3>Parents</h3><ul class="plain">${ppl(p.guardians)}</ul><h3>Emergency contacts</h3><ul class="plain">${ppl(p.emergency_contacts)}</ul></div>
        <div><h3>Doctor</h3><p>${esc(p.physician?.name || '—')} ${p.physician?.phone ? `· <a href="tel:${esc(p.physician.phone)}">${esc(p.physician.phone)}</a>` : ''}<br><span class="small muted">Hospital: ${esc(p.physician?.hospital || '—')}</span></p>
          <h3>Permissions</h3><p class="small">${Object.entries(p.consents || {}).map(([k, v]) => `${esc(k.replace('_', ' '))}: <b>${v ? 'yes' : 'no'}</b>`).join(' · ') || '—'}${p.emergency_med_permission != null ? ` · emergency medicine: <b>${p.emergency_med_permission ? 'yes' : 'no'}</b>` : ''}</p>
          ${Object.keys(p.care_notes || {}).length ? `<h3>Daily care</h3><ul class="plain small">${Object.entries(p.care_notes).map(([k, v]) => `<li><b>${esc(k.replace('_', ' '))}:</b> ${esc(v)}</li>`).join('')}</ul>` : ''}</div></div>
      <h3>Documents</h3><ul class="list">${r.documents.map((d) => `<li><span class="who"><b>${esc(label(DOC_TYPES, d.doc_type))}</b><span class="small muted">${esc(d.file_name)}</span></span>
        ${d.can_open ? `<button class="btn link" type="button" data-open="${esc(d.id)}">Open</button>` : '<span class="small muted">Director only</span>'}</li>`).join('') || '<li class="empty">None</li>'}</ul>
      ${r.records ? `<h3>Licensing file</h3><ul class="plain">${r.records.map((i) => `<li><span class="chip ${i.state === 'ok' ? 'ok' : i.state === 'overdue' || i.state === 'missing' ? 'bad' : 'warn'}">${esc(i.state)}</span> ${esc(i.label)}${i.due_on ? ` · ${esc(i.due_on)}` : ''}</li>`).join('')}</ul>` : ''}
    </div>`), `${r.first || 'Child'} · ${c.name}`);
    const again = () => viewChild(c, shell, kid);
    $$('[data-verify]').forEach((b) => { b.onclick = async () => { await rpc('care_alert_verify', { p_center: c.center_id, p_id: b.dataset.verify }); live('Verified for a year.'); again(); }; });
    $$('[data-end]').forEach((b) => { b.onclick = async () => {
      const why = prompt('Why does this alert no longer apply?'); if (!why) return;
      await rpc('care_alert_end', { p_center: c.center_id, p_id: b.dataset.end, p_reason: why }); again();
    }; });
    $$('[data-open]').forEach((b) => { b.onclick = async () => {
      const o = await rpc('child_document_open', { p_center: c.center_id, p_id: b.dataset.open });
      const s = await client().storage.from(o.bucket).createSignedUrl(o.path, 60);
      if (s.error) { live(friendly(s.error)); return; }
      window.open(s.data.signedUrl, '_blank', 'noopener');
    }; });
    if ($('#alertForm')) $('#alertForm').onsubmit = async (e) => {
      e.preventDefault();
      try {
        await rpc('care_alert_save', { p_center: c.center_id, p_kid: kid, p_alert: { type: $('#aType').value, severity: $('#aSev').value, label: $('#aLabel').value.trim(),
          staff_summary: $('#aSum').value.trim(), action_plan: $('#aPlan').value.trim(), emergency_med: $('#aMed').checked } });
        live('Alert saved.'); again();
      } catch (err) { $('#aMsg').className = 'msg bad'; $('#aMsg').textContent = friendly(err); }
    };
  }

  // ---- director: HQ support access ---------------------------------------------------------------------------------------------
  async function viewSupport(c, shell) {
    const list = await rpc('support_grants_for_center', { p_center: c.center_id });
    page(shell(`<div class="card" id="supportCard"><h2>Futures Friends support access</h2>
      <p class="small muted">Futures Friends staff cannot see your children's records or your finances. When they need to repair something, they ask here with a ticket and a reason.
        Access starts only when you approve it (or, in an emergency, at once for up to 4 hours, and you are emailed), ends by itself, and every record they open is listed.</p>
      ${list.length ? `<ul class="list">${list.map((g) => `<li><span class="who"><b>${esc(g.ticket)} · ${esc(g.scopes.map((s) => s.replace('_', ' ')).join(', '))}${g.emergency ? ' · EMERGENCY' : ''}</b>
        <span class="small muted">${esc(g.requested_email || '')}: ${esc(g.reason)}</span>
        <span class="mini muted">${esc(g.status)}${g.live ? ` until ${esc(new Date(g.expires_at).toLocaleString(localeOf(), { timeZone: centerTz(), timeZoneName: 'short' }))}` : ''} · ${g.reads} read${g.reads === 1 ? '' : 's'} logged</span></span>
        <span>${g.status === 'requested' ? `<button class="btn center small" type="button" data-grant="${esc(g.id)}" data-ok="1">Approve ${g.hours} h</button><button class="btn link" type="button" data-grant="${esc(g.id)}" data-ok="0">Decline</button>` : ''}
        ${g.live ? `<button class="btn soft small" type="button" data-revoke="${esc(g.id)}">End now</button>` : ''}</span></li>`).join('')}</ul>` : '<p class="empty">No requests.</p>'}</div>`), `Support access · ${c.name}`);
    $$('[data-grant]').forEach((b) => { b.onclick = async () => { await rpc('support_grant_decide', { p_grant: b.dataset.grant, p_approve: b.dataset.ok === '1' }); viewSupport(c, shell); }; });
    $$('[data-revoke]').forEach((b) => { b.onclick = async () => { await rpc('support_grant_revoke', { p_grant: b.dataset.revoke }); viewSupport(c, shell); }; });
  }

  return { viewEnroll, viewEnrollments, viewChildren, viewChild, viewSupport };
}
