// Futures Hub front-end: "Privacy & consent" for families and the director's consent desk (migration 20261025400000_parental_consent_vpc.sql).
// Mounted by app.js with its helpers. Every read and write goes through audited database functions; nothing here reads a table.
//
//   /c/<slug>/privacy                     family: for each of their children, the notice to parents, each purpose with its own consent
//                                         (give: email confirmation where allowed, or a signed form the director verifies; withdraw),
//                                         download everything the Hub holds about the child, ask for deletion, see their requests
//   /c/<slug>/privacy?form=<kid>          the printable consent form (signed on paper, returned to the center)
//   /c/<slug>/consents                    director: signed forms to verify, privacy requests to decide, every child's consent states
//   /c/<slug>/consents?kid=<kid>          director: one child (record a paper consent, record a withdrawal the parent asked for)
// Family text is English + Spanish (DRAFT translation); the notice texts come from the database in the family's language.

import { cssValue, deepFocus, deepMiss } from './deeplink.js';
const S = {
  en: {
    title: 'Privacy & consent', intro: 'You decide, separately for each purpose, what the Hub may do with information about your child. You can change your mind at any time.',
    draft: 'Draft text: pending legal review', notice: 'Notice to parents', readNotice: 'Read what you are agreeing to',
    state: { active: 'Consent given', pending_verification: 'Waiting for the center to check your signed form', withdrawn: 'Withdrawn', reconsent_needed: 'Please review the updated notice', none: 'Not given' },
    required: 'Needed to enroll through the Hub', optional: 'Optional: saying no never affects enrollment',
    give: 'Give consent', name: 'Type your full name as your signature', how: 'How do you want to confirm it is you?',
    emailPlus: 'Confirm with my email', emailPlusHint: 'You are signed in through the link we emailed you. We will also email you a confirmation in 24 hours.',
    signed: 'Sign a paper form', signedHint: 'Print the form (or ask the center for one), sign it and give it to the director. It counts once the director has checked it.',
    vendor: 'Verify online', vendorHint: 'An identity check by our verification partner.',
    print: 'Print the consent form', withdraw: 'Withdraw consent', withdrawConfirm: 'Withdraw this consent? We stop using this information now and delete it (records the law requires the center to keep are kept only as long as required).',
    reason: 'Reason (optional)', legacy: 'Recorded at enrollment on the enrollment form. Please confirm it here so it is verified.',
    data: 'Your child\'s information', download: 'Download everything the Hub holds (file)', deleteData: 'Ask to delete my child\'s information',
    deleteConfirm: 'Ask the center to delete your child\'s information from the Hub? The director answers within 30 days. Records the licensing rules require are kept until the end of their retention period.',
    deleteAccount: 'Delete my account at this center', deleteAccountConfirm: 'Ask to delete your Hub account at this center? You will no longer be able to sign in to it.',
    requests: 'Your requests', none: 'No requests.', saved: 'Saved.', sent: 'Request sent to the director.', downloaded: 'Downloaded.',
    kind: { delete_child_data: 'Delete my child\'s information', delete_account: 'Delete my account', consent_withdrawal_purge: 'Delete after withdrawal', correction: 'Correct information' },
    rstatus: { open: 'Waiting for the director', approved: 'Approved: being deleted', on_hold: 'On hold', declined: 'Declined', completed: 'Done', cancelled: 'Cancelled' },
    never: 'Never sold. Never used for advertising. Never used to train artificial intelligence.', noKids: 'No child is linked to your account at this center yet.',
    formTitle: 'Parental consent form', formIntro: 'Initial each purpose you agree to (leave blank to refuse), then sign. Return this page to the director.',
    child: 'Child', guardian: 'Parent or guardian (print)', signature: 'Signature', date: 'Date', agree: 'I agree', back: 'Back',
    correctTitle: 'Ask to correct information', correctIntro: 'If something the Hub holds about your child is wrong, tell the center what it should say. The director answers within 30 days and tells you what was changed.',
    what: 'What is wrong?', now: 'The record says now', empty: '(empty)', correctValue: 'What it should say', why: 'Why it is wrong (briefly)',
    sendCorrection: 'Send the correction request', correctionSent: 'Correction request sent to the director.', myCorrections: 'Your correction requests',
    asked: 'You asked for', due: 'Answer due', overdue: 'Past its due date', changedTo: 'Changed to', manualHint: 'The director corrects this where it is kept and tells you.',
    resolution: { applied: 'Corrected', corrected_elsewhere: 'Corrected at the source', denied: 'Not changed' },
    moveTitle: 'Send my child\'s records to another center', moveIntro: 'Moving to another center that uses the Futures Hub? This center\'s director releases the records and the new center\'s director accepts them.',
    moveSlug: 'The new center\'s Hub address (the part after /c/)', moveSign: 'Type your full name as your signature', moveSend: 'Sign and send the request',
    moveSent: 'Request sent to the director.', tstatus: { requested: 'Waiting for this center', released: 'Waiting for the new center', completed: 'Records sent', declined: 'Declined', cancelled: 'Cancelled' },
  },
  es: {
    title: 'Privacidad y consentimiento', intro: 'Usted decide, por separado para cada propósito, qué puede hacer el Hub con la información de su hijo o hija. Puede cambiar de opinión en cualquier momento.',
    draft: 'Texto en borrador: pendiente de revisión legal', notice: 'Aviso a los padres', readNotice: 'Lea lo que está aceptando',
    state: { active: 'Consentimiento dado', pending_verification: 'Esperando que el centro revise su formulario firmado', withdrawn: 'Retirado', reconsent_needed: 'Revise el aviso actualizado', none: 'No dado' },
    required: 'Necesario para inscribirse por el Hub', optional: 'Opcional: decir que no nunca afecta la inscripción',
    give: 'Dar consentimiento', name: 'Escriba su nombre completo como firma', how: '¿Cómo quiere confirmar que es usted?',
    emailPlus: 'Confirmar con mi correo', emailPlusHint: 'Usted entró con el enlace que le enviamos por correo. También le enviaremos una confirmación en 24 horas.',
    signed: 'Firmar un formulario en papel', signedHint: 'Imprima el formulario (o pídalo en el centro), fírmelo y entréguelo al director. Cuenta cuando el director lo haya revisado.',
    vendor: 'Verificar en línea', vendorHint: 'Una verificación de identidad con nuestro socio de verificación.',
    print: 'Imprimir el formulario', withdraw: 'Retirar el consentimiento', withdrawConfirm: '¿Retirar este consentimiento? Dejamos de usar esta información ahora y la borramos (los registros que la ley obliga al centro a conservar se guardan solo el tiempo exigido).',
    reason: 'Motivo (opcional)', legacy: 'Registrado al inscribirse en el formulario de inscripción. Confírmelo aquí para que quede verificado.',
    data: 'La información de su hijo o hija', download: 'Descargar todo lo que tiene el Hub (archivo)', deleteData: 'Pedir que se borre la información de mi hijo o hija',
    deleteConfirm: '¿Pedir al centro que borre del Hub la información de su hijo o hija? El director responde en 30 días. Los registros que exigen las reglas de licencia se guardan hasta el final de su periodo de conservación.',
    deleteAccount: 'Borrar mi cuenta en este centro', deleteAccountConfirm: '¿Pedir que se borre su cuenta del Hub en este centro? Ya no podrá entrar con ella.',
    requests: 'Sus solicitudes', none: 'No hay solicitudes.', saved: 'Guardado.', sent: 'Solicitud enviada al director.', downloaded: 'Descargado.',
    kind: { delete_child_data: 'Borrar la información de mi hijo o hija', delete_account: 'Borrar mi cuenta', consent_withdrawal_purge: 'Borrar después de retirar', correction: 'Corregir información' },
    rstatus: { open: 'Esperando al director', approved: 'Aprobada: se está borrando', on_hold: 'En espera', declined: 'Rechazada', completed: 'Hecho', cancelled: 'Cancelada' },
    never: 'Nunca se vende. Nunca se usa para publicidad. Nunca se usa para entrenar inteligencia artificial.', noKids: 'Todavía no hay ningún niño vinculado a su cuenta en este centro.',
    formTitle: 'Formulario de consentimiento de los padres', formIntro: 'Escriba sus iniciales en cada propósito que acepta (déjelo en blanco para negarlo) y firme. Entregue esta página al director.',
    child: 'Niño o niña', guardian: 'Padre, madre o tutor (letra de molde)', signature: 'Firma', date: 'Fecha', agree: 'Acepto', back: 'Volver',
    correctTitle: 'Pedir que se corrija información', correctIntro: 'Si algo que el Hub tiene sobre su hijo o hija está mal, diga al centro qué debe decir. El director responde en 30 días y le dice qué se cambió.',
    what: '¿Qué está mal?', now: 'El registro dice ahora', empty: '(vacío)', correctValue: 'Lo que debe decir', why: 'Por qué está mal (brevemente)',
    sendCorrection: 'Enviar la solicitud de corrección', correctionSent: 'Solicitud de corrección enviada al director.', myCorrections: 'Sus solicitudes de corrección',
    asked: 'Usted pidió', due: 'Respuesta a más tardar', overdue: 'Pasó su fecha límite', changedTo: 'Se cambió a', manualHint: 'El director lo corrige donde se guarda y le avisa.',
    resolution: { applied: 'Corregido', corrected_elsewhere: 'Corregido en el origen', denied: 'No se cambió' },
    moveTitle: 'Enviar los registros de mi hijo o hija a otro centro', moveIntro: '¿Se cambia a otro centro que usa el Futures Hub? El director de este centro entrega los registros y el director del nuevo centro los acepta.',
    moveSlug: 'La dirección del nuevo centro en el Hub (lo que va después de /c/)', moveSign: 'Escriba su nombre completo como firma', moveSend: 'Firmar y enviar la solicitud',
    moveSent: 'Solicitud enviada al director.', tstatus: { requested: 'Esperando a este centro', released: 'Esperando al nuevo centro', completed: 'Registros enviados', declined: 'Rechazada', cancelled: 'Cancelada' },
  },
};
const paras = (esc, t) => String(t ?? '').split(/\n\s*\n/).map((x) => `<p>${esc(x.trim())}</p>`).join('');
const CHIP = { active: 'ok', pending_verification: 'warn', withdrawn: 'bad', reconsent_needed: 'warn', none: '' };
const PURPOSE_EN = { enrollment_data: 'Enrollment and care records', photos: 'Photos', kid_mode: 'Kid Mode', character_messages: 'Character messages', analytics: 'Optional statistics' };

export function mountPrivacy(h) {
  const { esc, $, $$, rpc, page, live, friendly, go, getLang, client } = h;
  const L = () => S[getLang() === 'es' ? 'es' : 'en'];
  const fmt = (iso) => (iso ? new Intl.DateTimeFormat(getLang() === 'es' ? 'es-US' : 'en-US', { dateStyle: 'medium' }).format(new Date(iso)) : '');
  const say = (el, text, ok = true) => { if (el) { el.className = `small msg ${ok ? 'ok' : 'bad'}`; el.textContent = text; } live(text); };
  const params = () => new URLSearchParams(location.search);

  function saveFile(name, obj) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function purposeCard(o, p, s) {
    const notice = p.notice ? `<details class="small"><summary>${esc(s.readNotice)}${p.notice.draft_for_counsel ? ` <span class="chip warn">${esc(s.draft)}</span>` : ''}</summary>
      ${paras(esc, p.notice.body)}<p class="mini muted">v${esc(p.notice.version)} · ${esc(p.notice.lang)} · SHA-256 ${esc(String(p.notice.sha256).slice(0, 16))}…</p></details>` : '';
    const mine = (p.consents || []).filter((c) => c.mine);
    let act = '';
    if (p.state === 'active') {
      act = `<form class="f withdraw" data-purpose="${esc(p.key)}" data-kid="${esc(o.kid)}"><label class="f"><span>${esc(s.reason)}</span><input class="i" name="reason" maxlength="500"></label>
        <button class="btn soft small" type="submit">${esc(s.withdraw)}</button></form>`;
    } else if (p.state === 'pending_verification') {
      act = `<p class="small">${esc(s.state.pending_verification)}</p><a class="btn soft small" href="?form=${encodeURIComponent(o.kid)}" data-form>${esc(s.print)}</a>`;
    } else {
      act = `<form class="give" data-purpose="${esc(p.key)}" data-kid="${esc(o.kid)}" novalidate>
        <label class="f"><span>${esc(s.name)}</span><input class="i" name="signed" autocomplete="name" maxlength="120" required></label>
        <fieldset class="f"><legend>${esc(s.how)}</legend><div class="choices">
          ${p.email_plus_allowed ? `<label class="choice"><input type="radio" name="method" value="email_plus" checked><span><b>${esc(s.emailPlus)}</b><span class="small muted">${esc(s.emailPlusHint)}</span></span></label>` : ''}
          <label class="choice"><input type="radio" name="method" value="signed_form"${p.email_plus_allowed ? '' : ' checked'}><span><b>${esc(s.signed)}</b><span class="small muted">${esc(s.signedHint)}</span></span></label>
          ${o.vendor_available ? `<label class="choice"><input type="radio" name="method" value="vendor"><span><b>${esc(s.vendor)}</b><span class="small muted">${esc(s.vendorHint)}</span></span></label>` : ''}
        </div></fieldset><button class="btn navy small" type="submit">${esc(s.give)}</button></form>`;
    }
    const legacy = p.key === 'photos' && o.legacy_photo ? `<p class="small msg info">${esc(s.legacy)}</p>` : '';
    const history = mine.length ? `<p class="mini muted">${mine.map((c) => `${esc(s.state[c.status] || c.status)} · ${esc(fmt(c.given_at))}${c.withdrawn_at ? ` → ${esc(fmt(c.withdrawn_at))}` : ''}`).join('<br>')}</p>` : '';
    return `<div class="card consent-purpose" data-purpose="${esc(p.key)}"><h3>${esc(p.title)} <span class="chip ${CHIP[p.state] || ''}" data-state="${esc(p.state)}">${esc(s.state[p.state] || p.state)}</span></h3>
      <p class="mini muted">${esc(p.required_for_enrollment ? s.required : s.optional)}</p>${legacy}${notice}${history}${act}<p class="small msg" role="status"></p></div>`;
  }

  // N37: ask to correct a field of the child's record; the guardian's own requests with their answer
  function correctionCard(kid, fx, s) {
    const fields = fx.fields || [];
    if (!fields.length) return '';
    const items = (fx.mine || []).map((r) => `<li data-correction-id="${esc(r.id)}"><span class="who"><b>${esc(r.label)}</b>
        <span class="mini muted">${esc(s.now)}: ${esc(r.current_value || s.empty)} · ${esc(s.asked)}: ${esc(r.requested_value || '')} · ${esc(fmt(r.requested_at))}</span>
        ${r.status === 'open' || r.status === 'on_hold' ? `<span class="mini muted">${esc(s.due)} ${esc(fmt(r.due_at))}${r.overdue ? ` · <b>${esc(s.overdue)}</b>` : ''}</span>` : ''}
        ${r.applied_value ? `<span class="mini">${esc(s.changedTo)}: <b>${esc(r.applied_value)}</b></span>` : ''}${r.decision_note ? `<span class="mini muted">${esc(r.decision_note)}</span>` : ''}</span>
        <span class="chip ${r.resolution === 'applied' ? 'ok' : r.resolution === 'denied' ? 'bad' : ''}">${esc(r.resolution ? s.resolution[r.resolution] : (s.rstatus[r.status] || r.status))}</span></li>`).join('');
    return `<div class="card correction" data-kid="${esc(kid)}"><h3>${esc(s.correctTitle)}</h3><p class="small">${esc(s.correctIntro)}</p>
      <form class="correct" data-kid="${esc(kid)}" novalidate>
        <label class="f"><span>${esc(s.what)}</span><select class="i" name="field">${fields.map((x, i) => `<option value="${i}">${esc(x.label)}</option>`).join('')}</select></label>
        <p class="small">${esc(s.now)}: <b data-current></b></p><p class="mini muted" data-manual hidden>${esc(s.manualHint)}</p>
        <label class="f"><span>${esc(s.correctValue)}</span><input class="i" name="requested" maxlength="1000" required></label>
        <label class="f"><span>${esc(s.why)}</span><textarea class="i" name="reason" maxlength="1000" rows="2" required></textarea></label>
        <button class="btn navy small" type="submit">${esc(s.sendCorrection)}</button></form>
      <h4>${esc(s.myCorrections)}</h4>${items ? `<ul class="list">${items}</ul>` : `<p class="small muted">${esc(s.none)}</p>`}<p class="small msg" role="status"></p></div>`;
  }

  // N25: send the child's records to another center (the guardian signs; both directors decide)
  function moveCard(kid, statement, mine, s) {
    const open = mine.some((t) => ['requested', 'released'].includes(t.status));
    return `<div class="card move-records" data-kid="${esc(kid)}"><h3>${esc(s.moveTitle)}</h3><p class="small">${esc(s.moveIntro)}</p>
      ${mine.length ? `<ul class="list">${mine.map((t) => `<li data-transfer-id="${esc(t.id)}"><span class="who"><b>${esc(t.to_center)}</b><span class="mini muted">${esc(fmt(t.consented_at))}${t.decided_note ? ` · ${esc(t.decided_note)}` : ''}</span></span>
        <span class="chip ${t.status === 'completed' ? 'ok' : t.status === 'declined' ? 'bad' : ''}">${esc(s.tstatus[t.status] || t.status)}</span></li>`).join('')}</ul>` : ''}
      ${open ? '' : `<form class="move" data-kid="${esc(kid)}" novalidate><p class="small"><i>${esc(statement)}</i></p>
        <label class="f"><span>${esc(s.moveSlug)}</span><input class="i" name="slug" maxlength="40" autocomplete="off" required></label>
        <label class="f"><span>${esc(s.moveSign)}</span><input class="i" name="signed" autocomplete="name" maxlength="120" required></label>
        <label class="choice"><input type="checkbox" name="sped"><span>${esc(getLang() === 'es' ? 'Enviar también los registros de educación especial (IEP / IFSP), si los hay' : 'Also send the special education records (IEP / IFSP) if the child has any')}</span></label>
        <button class="btn soft small" type="submit">${esc(s.moveSend)}</button></form>`}<p class="small msg" role="status"></p></div>`;
  }

  async function viewFamily(c, shell) {
    const s = L();
    const form = params().get('form');
    const kids = await rpc('my_kids', { c: c.center_id }).catch(() => []);
    const list = (Array.isArray(kids) ? kids : []).map((k) => (typeof k === 'string' ? k : k.my_kids || Object.values(k)[0]));
    if (form && list.includes(form)) return viewForm(c, form);
    if (!list.length) return page(shell(`<div class="card"><h2>${esc(s.title)}</h2><p>${esc(s.noKids)}</p></div>`), s.title);
    const overviews = await Promise.all(list.map((k) => rpc('consent_overview', { p_center: c.center_id, p_kid: k, p_lang: getLang() })));
    // correction requests (N37): the fields with what the record says now, and this guardian's own requests
    const fixes = await Promise.all(list.map((k) => Promise.all([
      rpc('privacy_correction_fields', { p_center: c.center_id, p_kid: k, p_lang: getLang() }).catch(() => []),
      rpc('privacy_correction_list', { p_center: c.center_id, p_kid: k, p_lang: getLang() }).catch(() => [])])));
    const fixOf = Object.fromEntries(list.map((k, i) => [k, { fields: fixes[i][0] || [], mine: fixes[i][1] || [] }]));
    // N25: a consented transfer of the records to another center (the statement the guardian signs comes from the database)
    const [statement, transfers] = await Promise.all([rpc('child_transfer_statement', { p_lang: getLang() }).catch(() => ''), rpc('child_transfers_list', { p_center: c.center_id }).catch(() => [])]);
    const dn = overviews[0].direct_notice;
    page(shell(`<div class="card" id="privacyIntro"><h2>${esc(s.title)}</h2><p>${esc(s.intro)}</p><p class="small"><b>${esc(s.never)}</b></p>
      ${dn ? `<details><summary>${esc(s.notice)}${dn.draft_for_counsel ? ` <span class="chip warn">${esc(s.draft)}</span>` : ''}</summary>${paras(esc, dn.body)}</details>` : ''}</div>
      ${overviews.map((o) => `<section class="child-privacy" data-kid="${esc(o.kid)}"><h2>${esc(o.child_first)}</h2>
        ${o.purposes.map((p) => purposeCard(o, p, s)).join('')}
        <div class="card"><h3>${esc(s.data)}</h3><div class="row">
          <button class="btn soft small" data-export="${esc(o.kid)}">${esc(s.download)}</button>
          <button class="btn soft small" data-request="delete_child_data" data-kid="${esc(o.kid)}">${esc(s.deleteData)}</button>
          <button class="btn link small" data-request="delete_account" data-kid="${esc(o.kid)}">${esc(s.deleteAccount)}</button></div>
          <h4>${esc(s.requests)}</h4>${o.requests.length ? `<ul class="list">${o.requests.map((r) => `<li data-request-id="${esc(r.id)}"><span class="who"><b>${esc(s.kind[r.kind] || r.kind)}</b>
            <span class="mini muted">${esc(fmt(r.requested_at))}${r.decision_note ? ` · ${esc(r.decision_note)}` : ''}</span></span><span class="chip">${esc(s.rstatus[r.status] || r.status)}</span></li>`).join('')}</ul>` : `<p class="small muted">${esc(s.none)}</p>`}
          <p class="small msg" role="status"></p></div>${correctionCard(o.kid, fixOf[o.kid], s)}${moveCard(o.kid, statement, (transfers || []).filter((t) => t.kid === o.kid), s)}</section>`).join('')}`), s.title);
    const refresh = () => viewFamily(c, shell);
    // ?kid=&purpose= (a consent was confirmed or not): that consent, highlighted
    const wantKid = params().get('kid'), wantPurpose = params().get('purpose'), wantRequest = params().get('request');
    if (wantRequest) {
      const el = document.querySelector(`[data-correction-id="${cssValue(wantRequest)}"]`) || document.querySelector(`[data-request-id="${cssValue(wantRequest)}"]`);
      if (el) deepFocus(el); else deepMiss('request', getLang());
    } else if (wantKid) {
      const el = document.querySelector(`.child-privacy[data-kid="${cssValue(wantKid)}"] ${wantPurpose ? `.consent-purpose[data-purpose="${cssValue(wantPurpose)}"]` : ''}`.trim());
      if (el) deepFocus(el); else deepMiss(list.includes(wantKid) ? 'consent' : 'child', getLang());
    }
    $$('form.give').forEach((f) => f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = f.closest('.card').querySelector('.msg');
      try {
        const method = (f.querySelector('input[name=method]:checked') || {}).value;
        await rpc('consent_give', { p_center: c.center_id, p_kid: f.dataset.kid, p_purpose: f.dataset.purpose, p_method: method, p_lang: getLang(), p_signed_name: f.signed.value });
        live(s.saved);
        await refresh();
        if (method === 'signed_form') go(`${FFTest.pathname()}?form=${encodeURIComponent(f.dataset.kid)}`);
      } catch (err) { say(msg, friendly(err), false); }
    }));
    $$('form.withdraw').forEach((f) => f.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!window.confirm(s.withdrawConfirm)) return;
      const msg = f.closest('.card').querySelector('.msg');
      try {
        await rpc('consent_withdraw', { p_center: c.center_id, p_kid: f.dataset.kid, p_purpose: f.dataset.purpose, p_reason: f.reason.value || null });
        live(s.saved); await refresh();
      } catch (err) { say(msg, friendly(err), false); }
    }));
    $$('[data-export]').forEach((b) => b.addEventListener('click', async () => {
      const msg = b.closest('.card').querySelector('.msg');
      try {
        const data = await rpc('family_data_export', { p_center: c.center_id, p_kid: b.dataset.export });
        saveFile(`futures-hub-${b.dataset.export}-${new Date().toISOString().slice(0, 10)}.json`, data);
        say(msg, s.downloaded);
      } catch (err) { say(msg, friendly(err), false); }
    }));
    $$('form.correct').forEach((f) => {
      const fields = fixOf[f.dataset.kid].fields;
      const show = () => {
        const x = fields[Number(f.field.value)] || {};
        f.querySelector('[data-current]').textContent = x.current || s.empty;
        f.querySelector('[data-manual]').hidden = x.apply !== 'manual';
      };
      f.field.addEventListener('change', show); show();
      f.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = f.closest('.card').querySelector('.msg');
        const x = fields[Number(f.field.value)];
        try {
          await rpc('privacy_correction_create', { p_center: c.center_id, p_kid: f.dataset.kid, p_field: x.field, p_target: x.target_id || null,
            p_requested: f.requested.value, p_reason: f.reason.value });
          live(s.correctionSent); await refresh();
        } catch (err) { say(msg, friendly(err), false); }
      });
    });
    $$('form.move').forEach((f) => f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = f.closest('.card').querySelector('.msg');
      try {
        const t = await rpc('child_transfer_request', { p_center: c.center_id, p_kid: f.dataset.kid, p_to_slug: f.slug.value, p_signed_name: f.signed.value, p_lang: getLang() });
        // special education records travel only when the guardian ticks it (sped_transfer_include; hub/SPECIAL_EDUCATION.md)
        if (f.sped && f.sped.checked && t && t.id) await rpc('sped_transfer_include', { p_center: c.center_id, p_transfer: t.id, p_include: true });
        live(s.moveSent); await refresh();
      } catch (err) { say(msg, friendly(err), false); }
    }));
    $$('[data-request]').forEach((b) => b.addEventListener('click', async () => {
      if (!window.confirm(b.dataset.request === 'delete_account' ? s.deleteAccountConfirm : s.deleteConfirm)) return;
      const msg = b.closest('.card').querySelector('.msg');
      try {
        await rpc('privacy_request_create', { p_center: c.center_id, p_kid: b.dataset.kid, p_kind: b.dataset.request, p_note: null });
        live(s.sent); await refresh();
      } catch (err) { say(msg, friendly(err), false); }
    }));
  }

  // The printable form: every purpose with its notice text, initials, signature lines. Same text and version as on screen.
  async function viewForm(c, kid) {
    const s = L();
    const o = await rpc('consent_overview', { p_center: c.center_id, p_kid: kid, p_lang: getLang() });
    page(`<div class="wrap narrow consent-form"><div class="card"><h1>${esc(s.formTitle)}</h1><p><b>${esc(c.name)}</b></p>
      <p>${esc(s.child)}: <b>${esc(o.child_first)}</b></p><p class="small">${esc(s.formIntro)}</p>
      ${o.direct_notice ? `<h2>${esc(o.direct_notice.title)}</h2><div class="small">${paras(esc, o.direct_notice.body)}</div>` : ''}
      ${o.purposes.map((p) => `<div class="card"><h3>${esc(p.title)}</h3><div class="small">${paras(esc, p.notice ? p.notice.body : '')}</div>
        <p class="mini muted">v${esc(p.notice ? p.notice.version : '')} · SHA-256 ${esc(p.notice ? String(p.notice.sha256).slice(0, 16) : '')}…</p>
        <p>${esc(s.agree)}: ____________ (initials)</p></div>`).join('')}
      <p>${esc(s.guardian)}: ________________________________</p><p>${esc(s.signature)}: ________________________________</p><p>${esc(s.date)}: ______________</p>
      <p class="row"><button class="btn navy" id="printForm">${esc(s.print)}</button> <a class="btn soft" href="${esc(FFTest.pathname())}" data-nav>${esc(s.back)}</a></p></div></div>`, s.formTitle);
    $('#printForm').addEventListener('click', () => window.print());
  }

  // ---- director -----------------------------------------------------------------------------------------------------------
  const STATE_EN = { active: 'Given', pending_verification: 'Form to check', withdrawn: 'Withdrawn', reconsent_needed: 'Re-consent', none: '—' };
  const RS = { open: 'Open', approved: 'Approved (worker deletes)', on_hold: 'On hold', declined: 'Declined', completed: 'Done', cancelled: 'Cancelled' };
  const KIND_EN = { delete_child_data: 'Delete the child\'s information', delete_account: 'Delete the guardian\'s account', consent_withdrawal_purge: 'Delete after a withdrawal', correction: 'Correct the record' };
  const RES_EN = { applied: 'Corrected', corrected_elsewhere: 'Corrected at the source', denied: 'Denied' };
  const dueChip = (r) => {
    if (!['open', 'on_hold'].includes(r.status)) return '';
    const left = new Date(r.due_at) - new Date();
    return left < 0 ? ' <span class="chip bad">Overdue</span>' : left < 7 * 864e5 ? ' <span class="chip warn">Due soon</span>' : '';
  };

  async function viewDesk(c, shell) {
    const kid = params().get('kid');
    if (kid) return viewDeskChild(c, shell, kid);
    const [b, fixes, jobs, moves] = await Promise.all([rpc('consent_center_board', { p_center: c.center_id }), rpc('privacy_correction_board', { p_center: c.center_id }).catch(() => []),
      rpc('center_export_jobs_list', { p_center: c.center_id }).catch(() => []), rpc('child_transfers_list', { p_center: c.center_id }).catch(() => [])]);
    b.requests = b.requests.filter((r) => r.kind !== 'correction');   // corrections have their own card below
    const purposes = Object.keys(PURPOSE_EN);
    page(shell(`<div class="card"><h2>Consent desk</h2><p class="small muted">Parents give each consent separately. A signed form counts once you have checked the signature against the guardian on file and said where the original is filed. Requests are due within 30 days; a withdrawal's deletion runs automatically 7 days after it unless you hold it.</p></div>
      <div class="card" id="pendingForms"><h3>Signed forms to check (${b.pending.length})</h3>${b.pending.length ? `<ul class="list">${b.pending.map((p) => `<li data-id="${esc(p.id)}"><span class="who"><b>${esc(p.child_first)} · ${esc(PURPOSE_EN[p.purpose] || p.purpose)}</b>
        <span class="mini muted">${esc(p.guardian_name)} · ${esc(p.method)} · ${esc(fmt(p.given_at))}</span></span>
        <form class="verify row" data-id="${esc(p.id)}"><input class="i" name="where" placeholder="Where is the signed original?" maxlength="200">
        <button type="button" class="btn navy small" data-act="1">Signature checked: accept</button><button type="button" class="btn soft small" data-act="0">Not accepted</button></form></li>`).join('')}</ul>` : '<p class="small muted">Nothing to check.</p>'}<p class="small msg" role="status"></p></div>
      <div class="card" id="privacyRequests"><h3>Privacy requests</h3>${b.requests.length ? `<ul class="list">${b.requests.map((r) => `<li data-id="${esc(r.id)}"><span class="who"><b>${esc(KIND_EN[r.kind] || r.kind)}${r.purpose ? ` (${esc(PURPOSE_EN[r.purpose] || r.purpose)})` : ''} · ${esc(r.child_first || r.kid || '')}</b>
        <span class="mini muted">${esc(r.requester_name || '')} · asked ${esc(fmt(r.requested_at))} · due ${esc(fmt(r.due_at))}${r.auto_approve_at && r.status === 'open' ? ` · runs automatically ${esc(fmt(r.auto_approve_at))}` : ''}${r.note ? ` · ${esc(r.note)}` : ''}${r.decision_note ? ` · ${esc(r.decision_note)}` : ''}</span></span>
        <span class="chip">${esc(RS[r.status] || r.status)}</span>${dueChip(r)}
        ${['open', 'on_hold'].includes(r.status) ? `<form class="decide row" data-id="${esc(r.id)}"><input class="i" name="note" placeholder="Reason (needed to hold or decline; the parent sees it)" maxlength="1000">
          <button type="button" class="btn navy small" data-act="approve">Approve</button><button type="button" class="btn soft small" data-act="hold">Hold</button><button type="button" class="btn soft small" data-act="decline">Decline</button></form>` : ''}
        ${r.result ? `<span class="mini muted">${esc(JSON.stringify(r.result.deleted || r.result))}</span>` : ''}</li>`).join('')}</ul>` : '<p class="small muted">No requests.</p>'}<p class="small msg" role="status"></p></div>
      <div class="card" id="corrections"><h3>Correction requests</h3><p class="small muted">A parent says something in the child's record is wrong. Apply writes the correct value to the record (the edit history keeps the old one); if the value comes from somewhere else (a CRM enrollment), correct it there and choose "Corrected at the source"; Deny needs the reason, which the parent sees. Answer by the due date.</p>
        ${fixes.length ? `<ul class="list">${fixes.map((r) => `<li data-id="${esc(r.id)}"><span class="who"><b>${esc(r.child_first || r.kid)} · ${esc(r.label)}</b>
          <span class="mini muted">${esc(r.requester_name || '')} · asked ${esc(fmt(r.requested_at))} · due ${esc(fmt(r.due_at))}${r.decision_note ? ` · ${esc(r.decision_note)}` : ''}</span>
          <span class="small">Record now: <b>${esc(r.current_value || '(empty)')}</b> → asked: <b>${esc(r.requested_value || '')}</b></span><span class="small muted">Why: ${esc(r.reason)}</span>
          ${r.applied_value ? `<span class="small">Changed from <b>${esc(r.previous_value || '(empty)')}</b> to <b>${esc(r.applied_value)}</b></span>` : ''}</span>
          <span class="chip">${esc(r.resolution ? RES_EN[r.resolution] : (RS[r.status] || r.status))}</span>${dueChip(r)}
          ${['open', 'on_hold'].includes(r.status) ? `<form class="resolve row" data-id="${esc(r.id)}">${r.field === 'other.record' ? '' : `<input class="i" name="newvalue" aria-label="Value to write" value="${esc(r.requested_value || '')}" maxlength="1000">`}
            <input class="i" name="note" placeholder="Note (needed for Corrected at the source or Deny; the parent sees it)" maxlength="1000">
            ${r.field === 'other.record' ? '' : '<button type="button" class="btn navy small" data-act="apply">Apply to the record</button>'}<button type="button" class="btn soft small" data-act="corrected_elsewhere">Corrected at the source</button><button type="button" class="btn soft small" data-act="deny">Deny</button></form>` : ''}</li>`).join('')}</ul>` : '<p class="small muted">No correction requests.</p>'}<p class="small msg" role="status"></p></div>
      <div class="card" id="transfers"><h3>Records moving between centers</h3><p class="small muted">A family asks to send a child's records to another Futures Hub center; you release them, then the new center's director accepts. The profile, active care alerts, the pick-up list and custody restrictions are copied; nothing is deleted here.</p>
        ${moves.length ? `<ul class="list">${moves.map((t) => `<li data-id="${esc(t.id)}"><span class="who"><b>${esc(t.child_first || '')} · ${esc(t.direction === 'out' ? `to ${t.to_center}` : `from ${t.from_center}`)}</b>
          <span class="mini muted">${esc(t.guardian_name)} signed ${esc(fmt(t.consented_at))}${t.decided_note ? ` · ${esc(t.decided_note)}` : ''}</span></span><span class="chip">${esc(t.status)}</span>
          ${(t.direction === 'out' && t.status === 'requested') || (t.direction === 'in' && t.status === 'released') ? `<form class="transfer row" data-id="${esc(t.id)}" data-dir="${esc(t.direction)}">
            ${t.direction === 'in' ? '<input class="i" name="room" placeholder="Room id at this center (optional)" maxlength="40">' : ''}<input class="i" name="note" placeholder="Note (needed to decline; the family sees it)" maxlength="500">
            <button type="button" class="btn navy small" data-act="1">${t.direction === 'out' ? 'Release the records' : 'Accept the records'}</button><button type="button" class="btn soft small" data-act="0">Decline</button></form>` : ''}</li>`).join('')}</ul>` : '<p class="small muted">No transfers.</p>'}<p class="small msg" role="status"></p></div>
      <div class="card" id="centerExport"><h3>Export all of this center's data</h3><p class="small muted">A complete file of the center's records (every child-data table, consents and requests, the list of files) for you to keep, for example at the end of a contract. It is prepared in a few minutes; you are notified, and only you can download it, for 7 days.</p>
        <p><button type="button" class="btn soft small" id="exportAsk">Prepare a full export</button></p>
        ${jobs.length ? `<ul class="list">${jobs.map((j) => `<li data-id="${esc(j.id)}"><span class="who"><b>${esc(fmt(j.requested_at))} · ${esc(j.requested_by_email || '')}</b>
          <span class="mini muted">${esc(j.status)}${j.bytes ? ` · ${esc(Math.ceil(j.bytes / 1024))} KB` : ''}${j.expires_at ? ` · until ${esc(fmt(j.expires_at))}` : ''}${j.sha256 ? ` · SHA-256 ${esc(j.sha256.slice(0, 12))}…` : ''}</span></span>
          ${j.path ? `<button type="button" class="btn navy small" data-download="${esc(j.id)}" data-path="${esc(j.path)}">Download</button>` : ''}</li>`).join('')}</ul>` : ''}<p class="small msg" role="status"></p></div>
      <div class="card"><h3>Children</h3><div class="tablewrap"><table class="t"><thead><tr><th>Child</th>${purposes.map((p) => `<th>${esc(PURPOSE_EN[p])}</th>`).join('')}</tr></thead><tbody>
        ${b.children.map((k) => `<tr><td><a href="?kid=${encodeURIComponent(k.kid)}" data-kid-link>${esc(k.child_first)}</a></td>${purposes.map((p) => `<td><span class="chip ${CHIP[k.states[p]] || ''}">${esc(STATE_EN[k.states[p]] || k.states[p])}</span>${p === 'photos' && k.photo_flag && k.states[p] === 'none' ? ' <span class="mini muted">(enrollment form)</span>' : ''}</td>`).join('')}</tr>`).join('')}
      </tbody></table></div></div>`), 'Consent desk', { english: true });
    // The decision buttons are type="button": Enter in a text box submits nothing (the submit handler only swallows it), so only a
    // click on Accept / Approve / Hold / Decline decides
    $$('form.verify, form.decide, form.resolve').forEach((f) => f.addEventListener('submit', (e) => e.preventDefault()));
    const wantConsent = params().get('consent');   // a consent waiting for verification (the directors' notification)
    if (wantConsent) { const el = document.querySelector(`#pendingForms li[data-id="${cssValue(wantConsent)}"]`); if (el) deepFocus(el); else deepMiss('consent', 'en'); }
    const wantMove = params().get('transfer'), wantExport = params().get('export');
    if (wantMove) { const el = document.querySelector(`#transfers li[data-id="${cssValue(wantMove)}"]`); if (el) deepFocus(el); else deepMiss('request', 'en'); }
    if (wantExport) {   // a ready export (its id), or 'new': the contract-end notice asks the director to export
      const el = wantExport === 'new' ? $('#centerExport') : document.querySelector(`#centerExport li[data-id="${cssValue(wantExport)}"]`);
      if (el) deepFocus(el); else deepMiss('any', 'en');
    }
    $$('form.transfer').forEach((f) => f.addEventListener('submit', (e) => e.preventDefault()));
    $$('form.transfer [data-act]').forEach((btn) => btn.addEventListener('click', async () => {
      const f = btn.closest('form'); const yes = btn.dataset.act === '1';
      try {
        if (f.dataset.dir === 'out') await rpc('child_transfer_release', { p_center: c.center_id, p_id: f.dataset.id, p_release: yes, p_note: f.note.value || null });
        else await rpc('child_transfer_accept', { p_to_center: c.center_id, p_id: f.dataset.id, p_accept: yes, p_room: f.room ? f.room.value || null : null, p_note: f.note.value || null });
        live('Saved.'); await viewDesk(c, shell);
      } catch (err) { say($('#transfers .msg'), friendly(err), false); }
    }));
    $('#exportAsk').addEventListener('click', async () => {
      try { await rpc('center_export_request', { p_center: c.center_id }); live('Saved.'); await viewDesk(c, shell); }
      catch (err) { say($('#centerExport .msg'), friendly(err), false); }
    });
    $$('[data-download]').forEach((btn) => btn.addEventListener('click', async () => {
      try {
        const { data, error } = await client().storage.from('center-exports').createSignedUrl(btn.dataset.path, 300, { download: true });
        if (error || !data?.signedUrl) throw new Error(error?.message || 'The download link could not be made. Try again.');
        await rpc('center_export_downloaded', { p_job: btn.dataset.download }).catch(() => null);
        location.assign(data.signedUrl);
      } catch (err) { say($('#centerExport .msg'), friendly(err), false); }
    }));
    const wantRequest = params().get('request');   // a privacy request (correction, deletion) from the directors' notification
    if (wantRequest) { const el = document.querySelector(`#corrections li[data-id="${cssValue(wantRequest)}"], #privacyRequests li[data-id="${cssValue(wantRequest)}"]`); if (el) deepFocus(el); else deepMiss('request', 'en'); }
    $$('form.resolve [data-act]').forEach((btn) => btn.addEventListener('click', async () => {
      const f = btn.closest('form');
      try {
        await rpc('privacy_correction_resolve', { p_center: c.center_id, p_id: f.dataset.id, p_decision: btn.dataset.act, p_note: f.note.value || null,
          p_value: f.newvalue ? f.newvalue.value || null : null });
        live('Saved.'); await viewDesk(c, shell);
      } catch (err) { say($('#corrections .msg'), friendly(err), false); }
    }));
    $$('form.verify [data-act]').forEach((b) => b.addEventListener('click', async () => {
      const f = b.closest('form'); const ok = b.dataset.act === '1';
      const msg = $('#pendingForms .msg');
      try {
        await rpc('consent_verify', { p_center: c.center_id, p_consent: f.dataset.id, p_accept: ok, p_evidence: ok ? { where: f.where.value } : {},
          p_note: ok ? null : (f.where.value || null) });
        live('Saved.'); await viewDesk(c, shell);
      } catch (err) { say(msg, friendly(err), false); }
    }));
    $$('form.decide [data-act]').forEach((b) => b.addEventListener('click', async () => {
      const f = b.closest('form');
      const msg = $('#privacyRequests .msg');
      try {
        await rpc('privacy_request_decide', { p_center: c.center_id, p_id: f.dataset.id, p_decision: b.dataset.act, p_note: f.note.value || null });
        live('Saved.'); await viewDesk(c, shell);
      } catch (err) { say(msg, friendly(err), false); }
    }));
    $$('[data-kid-link]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); go(`${FFTest.pathname()}${a.getAttribute('href')}`); }));
  }

  async function viewDeskChild(c, shell, kid) {
    const o = await rpc('consent_overview', { p_center: c.center_id, p_kid: kid, p_lang: 'en' });
    page(shell(`<div class="card"><h2>${esc(o.child_first)}: consents</h2><p><a href="${esc(FFTest.pathname())}" data-nav>Back to the consent desk</a></p></div>
      ${o.purposes.map((p) => `<div class="card" data-purpose="${esc(p.key)}"><h3>${esc(p.title)} <span class="chip ${CHIP[p.state] || ''}">${esc(STATE_EN[p.state] || p.state)}</span></h3>
        ${(p.consents || []).length ? `<ul class="list">${p.consents.map((x) => `<li><span class="who"><b>${esc(x.guardian_name)}</b><span class="mini muted">${esc(x.status)} · ${esc(x.method)} · v${esc(x.notice_version)} · ${esc(fmt(x.given_at))}</span></span></li>`).join('')}</ul>` : '<p class="small muted">No consent recorded.</p>'}
        <form class="paper row" data-purpose="${esc(p.key)}"><input class="i" name="guardian" placeholder="Guardian's name as signed" maxlength="120"><input class="i" name="where" placeholder="Where the signed paper form is filed" maxlength="200">
          <button type="button" class="btn soft small" data-paper>Record a signed paper form</button></form>
        ${p.state === 'active' || p.state === 'pending_verification' || (p.key === 'photos' && o.photo_flag) ? `<form class="pwithdraw row" data-purpose="${esc(p.key)}"><input class="i" name="reason" placeholder="How the parent asked (in person, signed note...)" maxlength="500">
          <button type="button" class="btn soft small" data-pwithdraw>Record the parent's withdrawal</button></form>` : ''}<p class="small msg" role="status"></p></div>`).join('')}
      <div class="card"><button class="btn soft small" id="deskExport">Download this child's information (to give the parent)</button><p class="small msg" role="status"></p></div>`), 'Consents', { english: true });
    const again = () => viewDeskChild(c, shell, kid);
    // Enter in a text box records nothing: only the buttons do
    $$('form.paper, form.pwithdraw').forEach((f) => f.addEventListener('submit', (e) => e.preventDefault()));
    $$('form.paper [data-paper]').forEach((btn) => btn.addEventListener('click', async () => {
      const f = btn.closest('form');
      try { await rpc('consent_record_paper', { p_center: c.center_id, p_kid: kid, p_purpose: f.dataset.purpose, p_guardian_name: f.guardian.value, p_lang: 'en', p_evidence: { where: f.where.value } }); live('Saved.'); await again(); }
      catch (err) { say(f.closest('.card').querySelector('.msg'), friendly(err), false); }
    }));
    $$('form.pwithdraw [data-pwithdraw]').forEach((btn) => btn.addEventListener('click', async () => {
      const f = btn.closest('form');
      try { await rpc('consent_withdraw', { p_center: c.center_id, p_kid: kid, p_purpose: f.dataset.purpose, p_reason: f.reason.value }); live('Saved.'); await again(); }
      catch (err) { say(f.closest('.card').querySelector('.msg'), friendly(err), false); }
    }));
    $('#deskExport').addEventListener('click', async () => {
      const msg = $('#deskExport').parentElement.querySelector('.msg');
      try { saveFile(`futures-hub-${kid}-${new Date().toISOString().slice(0, 10)}.json`, await rpc('family_data_export', { p_center: c.center_id, p_kid: kid })); say(msg, 'Downloaded.'); }
      catch (err) { say(msg, friendly(err), false); }
    });
  }

  return { viewFamily, viewDesk };
}
