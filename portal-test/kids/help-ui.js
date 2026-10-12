// The parent support desk (Track H). Mounted by app.js:
//   /c/<slug>/help        families (English + Spanish DRAFT): answers to common questions, "Contact the center" (opens a ticket) and the
//                         family's own requests with the center's replies. Signed out, the page shows the answers only.
//   /c/<slug>/help-desk   directors: the center's queue (open / answered / closed), the conversation, reply, close / re-open, assign.
// Data: the functions of 20261026610000_family_help_desk.sql (a family reads only its own tickets; directors read the center's).
// Replies reach the other side through hub_notify (the bell, and email under the person's preferences). Design: hub/HELP_DESK.md.

import { deepFocus } from './deeplink.js';
import { centerTz } from './center-time.js';   // times in the center's zone
const TOPICS = ['sign_in', 'reports', 'kid_mode', 'consent', 'pickup', 'billing', 'other'];
const STR = {
  en: {
    title: 'Help', lead: 'Answers to common questions, and a way to ask the center.',
    faqTitle: 'Common questions',
    faq: [
      ['I forgot my password or cannot sign in', 'On your center\'s sign-in page, choose "Forgot your password?" and we email you a link to choose a new one. You can also choose "Email me a sign-in link" to sign in without a password. Links work once and expire, so use the newest email. After several wrong tries the account locks for a while: wait, or ask the center to unlock it.'],
      ['Where are my child\'s reports?', 'The daily report arrives by email at the end of the day and in the bell at the top of the Hub. Your child\'s work and portfolio are under "Learning at home" on your Home page. Messages from your child\'s teacher are under Messages.'],
      ['How does Kid Mode work?', 'You open Kid Mode from your Home page; your child never has a login or a password. Your child picks their picture and a friend, then plays the day\'s activities. You decide how many minutes a day; children under 3 do not get screen time. Kid Mode only opens after you have given the Kid Mode consent.'],
      ['Consent and privacy', 'On "Privacy & consent" you decide, purpose by purpose, what the Hub may do with information about your child (photos, Kid Mode, messages and more). You can withdraw a consent, download your child\'s information or ask for it to be deleted there.'],
      ['How do I contact the center?', 'Use the form below for questions that can wait for an answer. The director reads it and answers here, and you get a notification. For anything urgent about your child today, call the center.'],
    ],
    contactTitle: 'Contact the center', topic: 'Topic', subject: 'Subject', message: 'Your question', send: 'Send to the center',
    urgent: 'For anything urgent today, call the center.', sent: 'Sent. The center will answer here.',
    topics: { sign_in: 'Signing in', reports: 'Reports', kid_mode: 'Kid Mode', consent: 'Consent and privacy', pickup: 'Pickup', billing: 'Billing', other: 'Something else' },
    mineTitle: 'Your requests', none: 'You have not asked anything yet.', open: 'Open', status: { open: 'Waiting for the center', answered: 'Answered', closed: 'Closed' },
    reply: 'Reply', sendReply: 'Send reply', close: 'Close this request', back: 'Back to Help', you: 'You', center: 'The center',
    signIn: 'Sign in to contact the center.', signInBtn: 'Go to sign-in', need: 'Please choose a topic and write a subject and your question.',
    needReply: 'Write a reply first.', sending: 'Sending…', closed: 'Closed.',
  },
  es: {
    title: 'Ayuda', lead: 'Respuestas a preguntas frecuentes y una forma de escribirle al centro.',
    faqTitle: 'Preguntas frecuentes',
    faq: [
      ['Olvidé mi contraseña o no puedo entrar', 'En la página de inicio de sesión de su centro, elija "¿Olvidó su contraseña?" y le enviaremos un enlace por correo para elegir una nueva. También puede elegir "Envíenme un enlace para entrar" y entrar sin contraseña. Los enlaces funcionan una sola vez y vencen: use el correo más reciente. Después de varios intentos fallidos la cuenta se bloquea un rato: espere o pida al centro que la desbloquee.'],
      ['¿Dónde están los reportes de mi hijo o hija?', 'El reporte diario llega por correo al final del día y en la campana arriba en el Hub. El trabajo y el portafolio de su hijo o hija están en "Aprender en casa" en su página de Inicio. Los mensajes de la maestra están en Mensajes.'],
      ['¿Cómo funciona el Modo Niños?', 'Usted abre el Modo Niños desde su página de Inicio; su hijo o hija nunca tiene usuario ni contraseña. Elige su imagen y un amigo, y juega las actividades del día. Usted decide cuántos minutos al día; los menores de 3 años no tienen tiempo de pantalla. El Modo Niños solo se abre después de que usted dé el consentimiento para el Modo Niños.'],
      ['Consentimiento y privacidad', 'En "Privacidad y consentimiento" usted decide, propósito por propósito, qué puede hacer el Hub con la información de su hijo o hija (fotos, Modo Niños, mensajes y más). Ahí puede retirar un consentimiento, descargar la información o pedir que se borre.'],
      ['¿Cómo me comunico con el centro?', 'Use el formulario de abajo para preguntas que pueden esperar una respuesta. La directora lo lee y responde aquí, y usted recibe un aviso. Para algo urgente sobre su hijo o hija hoy, llame al centro.'],
    ],
    contactTitle: 'Escribir al centro', topic: 'Tema', subject: 'Asunto', message: 'Su pregunta', send: 'Enviar al centro',
    urgent: 'Para algo urgente hoy, llame al centro.', sent: 'Enviado. El centro responderá aquí.',
    topics: { sign_in: 'Iniciar sesión', reports: 'Reportes', kid_mode: 'Modo Niños', consent: 'Consentimiento y privacidad', pickup: 'Recoger al niño', billing: 'Pagos', other: 'Otra cosa' },
    mineTitle: 'Sus solicitudes', none: 'Todavía no ha preguntado nada.', open: 'Abrir', status: { open: 'Esperando al centro', answered: 'Respondida', closed: 'Cerrada' },
    reply: 'Responder', sendReply: 'Enviar respuesta', close: 'Cerrar esta solicitud', back: 'Volver a Ayuda', you: 'Usted', center: 'El centro',
    signIn: 'Inicie sesión para escribirle al centro.', signInBtn: 'Ir a iniciar sesión', need: 'Elija un tema y escriba un asunto y su pregunta.',
    needReply: 'Escriba una respuesta primero.', sending: 'Enviando…', closed: 'Cerrada.',
  },
};
const STATUS_CHIP = { open: 'warn', answered: 'ok', closed: '' };
const when = (t, lang) => new Date(t).toLocaleString(lang === 'es' ? 'es-US' : 'en-US', { timeZone: centerTz(), month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export function mountHelp({ esc, $, rpc, page, live, friendly, getLang }) {
  const S = () => STR[getLang() === 'es' ? 'es' : 'en'];
  const faqHtml = (L) => `<section class="card" id="helpFaq"><h2>${esc(L.faqTitle)}</h2>${L.faq.map(([q, a]) => `<details class="hd-faq"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</section>`;
  const thread = (t, L, mineLabel, otherLabel) => `<ol class="hd-thread">${(t.messages || []).map((m) => `<li class="hd-msg ${m.from === 'center' ? 'hd-center' : 'hd-family'}">
    <div class="small muted"><b>${esc(m.from === 'center' ? otherLabel : mineLabel)}</b> · ${esc(when(m.created_at, getLang()))}</div><p>${esc(m.body)}</p></li>`).join('')}</ol>`;

  // ---------------------------------------------------------------- family
  async function viewHelp(c, shell, { signedIn = true, slug } = {}) {
    const L = S();
    if (!signedIn) {
      return page(shell(`<div class="hd" id="helpPage"><h2>${esc(L.title)}</h2><p class="muted">${esc(L.lead)}</p>${faqHtml(L)}
        <div class="card"><p>${esc(L.signIn)}</p><a class="btn navy" href="/c/${esc(slug)}" data-nav>${esc(L.signInBtn)}</a></div></div>`), L.title);
    }
    const open = new URLSearchParams(location.search).get('t');
    if (open) return viewTicket(c, shell, open);
    let mine = [], listErr = '';
    try { mine = await rpc('help_tickets_list', { p_center: c.center_id, p_status: null }); } catch (e) { listErr = friendly(e); }
    page(shell(`<div class="hd" id="helpPage"><h2>${esc(L.title)}</h2><p class="muted">${esc(L.lead)}</p>
      <div class="grid two">${faqHtml(L)}
      <form class="card" id="helpForm" novalidate><h2>${esc(L.contactTitle)}</h2><p class="small muted">${esc(L.urgent)}</p>
        <label class="f"><span>${esc(L.topic)}</span><select class="i" id="hTopic">${TOPICS.map((t) => `<option value="${t}">${esc(L.topics[t])}</option>`).join('')}</select></label>
        <label class="f"><span>${esc(L.subject)}</span><input class="i" id="hSubject" maxlength="140" required></label>
        <label class="f"><span>${esc(L.message)}</span><textarea class="i" id="hBody" rows="5" maxlength="4000" required></textarea></label>
        <p class="msg" id="hMsg" role="status"></p><button class="btn gold" type="submit">${esc(L.send)}</button></form></div>
      <section class="card" id="helpMine"><h2>${esc(L.mineTitle)}</h2>${listErr ? `<p class="msg bad" role="alert">${esc(listErr)}</p>`
        : mine.length ? `<ul class="list">${mine.map((t) => `<li><span class="who"><b>${esc(t.subject)}</b><span class="small muted">${esc(L.topics[t.topic] || t.topic)} · ${esc(when(t.updated_at, getLang()))}</span></span>
          <span class="chip ${STATUS_CHIP[t.status]}">${esc(L.status[t.status])}</span><a class="btn soft small" href="?t=${esc(t.id)}" data-ticket="${esc(t.id)}">${esc(L.open)}</a></li>`).join('')}</ul>`
        : `<p class="muted">${esc(L.none)}</p>`}</section></div>`), L.title);
    $('#helpForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const m = $('#hMsg'), subject = $('#hSubject').value.trim(), body = $('#hBody').value.trim();
      if (!subject || !body) { m.className = 'msg bad'; m.textContent = L.need; (subject ? $('#hBody') : $('#hSubject')).focus(); return; }
      m.className = 'msg info'; m.textContent = L.sending;
      try {
        await rpc('help_ticket_create', { p_center: c.center_id, p_topic: $('#hTopic').value, p_subject: subject, p_body: body, p_lang: getLang() === 'es' ? 'es' : 'en' });
        live(L.sent);
        await viewHelp(c, shell);
        const ok = $('#hMsg'); if (ok) { ok.className = 'msg ok'; ok.textContent = L.sent; }
      } catch (err) { m.className = 'msg bad'; m.textContent = friendly(err); }
    });
    bindTicketLinks(() => viewHelp(c, shell));
  }
  function bindTicketLinks(again) {
    for (const a of document.querySelectorAll('a[data-ticket]')) a.addEventListener('click', (e) => {
      e.preventDefault(); history.pushState(null, '', `${FFTest.pathname()}?t=${encodeURIComponent(a.dataset.ticket)}`); again();
    });
  }

  async function viewTicket(c, shell, id) {
    const L = S();
    let t;
    try { t = await rpc('help_ticket_get', { p_ticket: id }); }
    catch (e) { return page(shell(`<div class="card"><p class="msg bad" role="alert">${esc(friendly(e))}</p><a class="btn soft" href="${esc(FFTest.pathname())}" data-nav>${esc(L.back)}</a></div>`), L.title); }
    page(shell(`<div class="hd" id="ticketPage"><a class="btn link small" href="${esc(FFTest.pathname())}" data-nav>${esc(L.back)}</a>
      <section class="card"><h2>${esc(t.subject)}</h2><p><span class="chip ${STATUS_CHIP[t.status]}" id="tStatus">${esc(L.status[t.status])}</span> <span class="small muted">${esc(L.topics[t.topic] || t.topic)}</span></p>
        ${thread(t, L, L.you, L.center)}
        <form id="replyForm" novalidate><label class="f"><span>${esc(L.reply)}</span><textarea class="i" id="rBody" rows="3" maxlength="4000"></textarea></label>
          <p class="msg" id="rMsg" role="status"></p><div class="cta-row"><button class="btn navy" type="submit">${esc(L.sendReply)}</button>
          ${t.status !== 'closed' ? `<button class="btn soft" type="button" id="tClose">${esc(L.close)}</button>` : ''}</div></form></section></div>`), L.title);
    deepFocus($('#ticketPage section'));   // ?t=<ticket> (the "the center answered" notification): the conversation itself
    $('#replyForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const m = $('#rMsg'), body = $('#rBody').value.trim();
      if (!body) { m.className = 'msg bad'; m.textContent = L.needReply; $('#rBody').focus(); return; }
      try { await rpc('help_ticket_reply', { p_ticket: id, p_body: body }); live(L.sent); await viewTicket(c, shell, id); }
      catch (err) { m.className = 'msg bad'; m.textContent = friendly(err); }
    });
    $('#tClose')?.addEventListener('click', async () => {
      try { await rpc('help_ticket_set_status', { p_ticket: id, p_status: 'closed' }); live(L.closed); await viewTicket(c, shell, id); }
      catch (err) { const m = $('#rMsg'); m.className = 'msg bad'; m.textContent = friendly(err); }
    });
  }

  // ---------------------------------------------------------------- directors
  const DS = { open: 'Open', answered: 'Answered', closed: 'Closed' };
  const TOPIC_EN = STR.en.topics;
  async function viewDesk(c, shell) {
    const p = new URLSearchParams(location.search);
    if (p.get('t')) return viewDeskTicket(c, shell, p.get('t'));
    const filter = ['open', 'answered', 'closed'].includes(p.get('s')) ? p.get('s') : 'open';
    let list, all;
    try { [list, all] = await Promise.all([rpc('help_tickets_list', { p_center: c.center_id, p_status: filter }), rpc('help_tickets_list', { p_center: c.center_id, p_status: null })]); }
    catch (e) { return page(shell(`<div class="card"><h2>Help desk</h2><p class="msg bad" role="alert">${esc(friendly(e))}</p></div>`), 'Help desk', { english: true }); }
    const n = (s) => all.filter((t) => t.status === s).length;
    page(shell(`<div class="hd" id="deskPage"><h2>Help desk</h2><p class="muted">Questions families sent from their Help page. Your reply reaches the family in the Hub (and by email when they get email for messages).</p>
      <nav class="hd-filter" aria-label="Show">${['open', 'answered', 'closed'].map((s) => `<a class="btn ${s === filter ? 'navy' : 'soft'} small" href="?s=${s}" data-filter="${s}"${s === filter ? ' aria-current="page"' : ''}>${DS[s]} (${n(s)})</a>`).join('')}</nav>
      <section class="card">${list.length ? `<ul class="list" id="deskList">${list.map((t) => `<li><span class="who"><b>${esc(t.subject)}</b>
        <span class="small muted">${esc(t.family_name || t.family_email || '')} · ${esc(TOPIC_EN[t.topic] || t.topic)} · ${esc(when(t.updated_at, 'en'))}${t.lang === 'es' ? ' · Spanish' : ''}${t.assigned_email ? ` · ${esc(t.assigned_email)}` : ' · unassigned'}</span></span>
        <span class="chip ${STATUS_CHIP[t.status]}">${esc(DS[t.status])}</span><a class="btn soft small" href="?t=${esc(t.id)}" data-ticket="${esc(t.id)}">Open</a></li>`).join('')}</ul>`
        : `<p class="muted">No ${esc(DS[filter].toLowerCase())} requests.</p>`}</section></div>`), 'Help desk', { english: true });
    for (const a of document.querySelectorAll('a[data-filter]')) a.addEventListener('click', (e) => { e.preventDefault(); history.replaceState(null, '', `${FFTest.pathname()}?s=${a.dataset.filter}`); viewDesk(c, shell); });
    bindTicketLinks(() => viewDesk(c, shell));
  }

  async function viewDeskTicket(c, shell, id) {
    let t, dirs;
    try { [t, dirs] = await Promise.all([rpc('help_ticket_get', { p_ticket: id }), rpc('help_desk_directors', { p_center: c.center_id })]); }
    catch (e) { return page(shell(`<div class="card"><p class="msg bad" role="alert">${esc(friendly(e))}</p><a class="btn soft" href="${esc(FFTest.pathname())}" data-nav>Back to the help desk</a></div>`), 'Help desk', { english: true }); }
    page(shell(`<div class="hd" id="deskTicket"><a class="btn link small" href="${esc(FFTest.pathname())}" data-nav>Back to the help desk</a>
      <section class="card"><h2>${esc(t.subject)}</h2>
        <p><span class="chip ${STATUS_CHIP[t.status]}" id="dStatus">${esc(DS[t.status])}</span> <span class="small muted">${esc(t.family_name || '')} &lt;${esc(t.family_email || '')}&gt; · ${esc(TOPIC_EN[t.topic] || t.topic)}${t.lang === 'es' ? ' · the family reads Spanish' : ''}</span></p>
        ${thread(t, STR.en, 'Family', 'Center')}
        <form id="dReplyForm" novalidate><label class="f"><span>Reply to the family</span><textarea class="i" id="dBody" rows="4" maxlength="4000"></textarea></label>
          <p class="msg" id="dMsg" role="status"></p>
          <div class="cta-row"><button class="btn navy" type="submit">Send reply</button>
            ${t.status === 'closed' ? '<button class="btn soft" type="button" id="dReopen">Open again</button>' : '<button class="btn soft" type="button" id="dClose">Close</button>'}</div></form>
        <label class="f hd-assign"><span>Assigned to</span><select class="i" id="dAssign"><option value="">Nobody</option>${dirs.map((d) => `<option value="${esc(d.user_id)}"${d.user_id === t.assigned_to ? ' selected' : ''}>${esc(d.name)}</option>`).join('')}</select></label>
      </section></div>`), 'Help desk', { english: true });
    deepFocus($('#deskTicket section'));   // ?t=<ticket> (the "a family asked" notification): the ticket itself
    const m = $('#dMsg');
    $('#dReplyForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = $('#dBody').value.trim();
      if (!body) { m.className = 'msg bad'; m.textContent = 'Write a reply first.'; $('#dBody').focus(); return; }
      try { await rpc('help_ticket_reply', { p_ticket: id, p_body: body }); live('Reply sent.'); await viewDeskTicket(c, shell, id); }
      catch (err) { m.className = 'msg bad'; m.textContent = friendly(err); }
    });
    const setStatus = async (s) => { try { await rpc('help_ticket_set_status', { p_ticket: id, p_status: s }); live(s === 'closed' ? 'Closed.' : 'Open again.'); await viewDeskTicket(c, shell, id); } catch (err) { m.className = 'msg bad'; m.textContent = friendly(err); } };
    $('#dClose')?.addEventListener('click', () => setStatus('closed'));
    $('#dReopen')?.addEventListener('click', () => setStatus('open'));
    $('#dAssign').addEventListener('change', async () => {
      try { await rpc('help_ticket_assign', { p_ticket: id, p_user: $('#dAssign').value || null }); m.className = 'msg ok'; m.textContent = 'Assigned.'; live('Assigned.'); }
      catch (err) { m.className = 'msg bad'; m.textContent = friendly(err); }
    });
  }

  return { viewHelp, viewDesk };
}
