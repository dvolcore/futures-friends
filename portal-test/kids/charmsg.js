// Futures Hub front-end: character messages (owner decision 2026-10-10; migration 20261025200000_character_messages.sql;
// hub/CHARACTER_MESSAGES.md). Mounted by app.js with its helpers.
//
//   /c/<slug>/messages        family: per child, messages waiting for approval (approve / decline), topics pre-approved, approved
//                             messages (play at home, open the child's player), send one from the library, the history (audit).
//                             staff (classroom): ask for a message for a child -> goes to the parent; see each request's status.
//   /c/<slug>/player/<kid>    the stand-alone child player: big friend cards of the approved messages, in the child's chosen friend's
//                             version when that version exists; the child (or grown-up) picks a favourite friend here until Kid Mode does.
// Families' views follow their language (English / Spanish draft); staff views stay English. The database decides everything:
// a teacher or director can never approve, and the player shows only what the child's parent approved.

import { cssValue, deepFocus, deepMiss } from './deeplink.js';
import { centerTz } from './center-time.js';   // times in the center's zone
import { FRIENDS, friendArt, playMessage, renderMessageCard, scriptFor, stopSound, titleFor } from './charmsg-player.js';

export const TOPICS = {
  calm_down: ['Calm down / big feelings', 'Calma / sentimientos grandes'],
  kindness_sharing: ['Kindness & sharing', 'Bondad y compartir'],
  listening: ['Listening', 'Escuchar'],
  clean_up: ['Clean-up time', 'Hora de recoger'],
  handwashing: ['Handwashing', 'Lavarse las manos'],
  bedtime_rest: ['Bedtime & rest', 'Hora de dormir y descansar'],
  trying_again: ['Trying again', 'Intentarlo otra vez'],
  transitions: ['Moving to what is next', 'Pasar a lo que sigue'],
  gentle_hands: ['Gentle hands', 'Manos suaves'],
  using_words: ['Using words', 'Usar palabras'],
};
const BANDS = { twos: ['Ages 2–3', '2 a 3 años'], threes: ['Ages 3–4', '3 a 4 años'], prek: ['Ages 4–5', '4 a 5 años'] };

const L = {
  en: {
    title: 'Messages from the friends', intro: 'Booker, Lumi, Zuri and Bop can share short, kind messages with your child, like a reminder to take a big breath or to try again. Every message is written ahead of time and checked by a child-development reviewer. Nothing reaches your child unless you say yes.',
    waiting: 'Waiting for your OK', none: 'Nothing waiting.', approve: 'Yes, share it', decline: 'No thanks', asked: (who, when) => `Asked by ${who} on ${when}`,
    preTitle: 'Always OK for these topics', preHint: 'Tick a topic and the friends can share any reviewed message in it without asking you each time. Untick it any time.',
    approved: 'Approved messages', noApproved: 'No approved messages yet.', playHome: 'Show it now', openPlayer: (n) => `Open ${n}'s player`,
    send: 'Choose a message for your child', sendBtn: 'Share with my child', preview: 'Preview', history: 'History', noHistory: 'Nothing yet.',
    friend: 'Favourite friend', friendHint: 'Messages come from this friend when that version exists.', saved: 'Saved.',
    ev: { requested: 'asked for a message', auto_approved: 'shared under your topic OK', approved: 'approved', declined: 'declined', withdrawn: 'withdrawn',
      played: 'played', preapproval_added: 'topic OK added', preapproval_revoked: 'topic OK removed', friend_chosen: 'favourite friend chosen' },
    libEmpty: 'The message library is waiting for its child-development review. Reviewed messages will appear here.', voice: (n) => `${n}'s version`,
    noKids: 'No children are linked to your account at this center yet.', all: 'All topics', back: 'Back to messages',
  },
  es: {
    title: 'Mensajes de los amigos', intro: 'Booker, Lumi, Zuri y Bop pueden compartir mensajes cortos y cariñosos con su hijo o hija, como un recordatorio para respirar profundo o para intentarlo otra vez. Cada mensaje está escrito con anticipación y lo revisa una especialista en desarrollo infantil. Nada le llega a su hijo o hija sin su permiso.',
    waiting: 'Esperando su aprobación', none: 'Nada pendiente.', approve: 'Sí, compartir', decline: 'No, gracias', asked: (who, when) => `Lo pidió ${who} el ${when}`,
    preTitle: 'Siempre está bien en estos temas', preHint: 'Marque un tema y los amigos podrán compartir cualquier mensaje revisado de ese tema sin preguntarle cada vez. Puede quitarlo cuando quiera.',
    approved: 'Mensajes aprobados', noApproved: 'Todavía no hay mensajes aprobados.', playHome: 'Mostrar ahora', openPlayer: (n) => `Abrir el reproductor de ${n}`,
    send: 'Elija un mensaje para su hijo o hija', sendBtn: 'Compartir con mi hijo o hija', preview: 'Ver', history: 'Historial', noHistory: 'Nada todavía.',
    friend: 'Amigo favorito', friendHint: 'Los mensajes llegan de este amigo cuando existe esa versión.', saved: 'Guardado.',
    ev: { requested: 'pidió un mensaje', auto_approved: 'compartido con su permiso del tema', approved: 'aprobado', declined: 'rechazado', withdrawn: 'retirado',
      played: 'se escuchó', preapproval_added: 'permiso de tema agregado', preapproval_revoked: 'permiso de tema quitado', friend_chosen: 'amigo favorito elegido' },
    libEmpty: 'La biblioteca de mensajes espera la revisión de desarrollo infantil. Los mensajes revisados aparecerán aquí.', voice: (n) => `Versión de ${n}`,
    noKids: 'Todavía no hay niños vinculados a su cuenta en este centro.', all: 'Todos los temas', back: 'Volver a los mensajes',
  },
};

export function mountCharmsg(h) {
  const { esc, $, $$, rpc, page, live, friendly, go } = h;
  const lang = () => (h.lang ? h.lang() : 'en');
  const tl = (k) => (TOPICS[k] ? TOPICS[k][lang() === 'es' ? 1 : 0] : k);
  const bl = (b) => (BANDS[b] ? BANDS[b][lang() === 'es' ? 1 : 0] : b);
  const day = (iso) => { try { return new Date(iso).toLocaleDateString(lang() === 'es' ? 'es-US' : 'en-US', { month: 'short', day: 'numeric' }); } catch (_) { return ''; } };
  const when = (iso) => { try { return new Date(iso).toLocaleString(lang() === 'es' ? 'es-US' : 'en-US', { timeZone: centerTz(), month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch (_) { return ''; } };
  const say = (el, text, cls = 'ok') => { if (!el) return; el.className = `msg ${cls}`; el.textContent = text; live(text); };

  const friendPicker = (kid, chosen, T) => `<fieldset class="f cm-pick" data-kid="${esc(kid)}"><legend>${esc(T.friend)} <span class="hint">${esc(T.friendHint)}</span></legend>
    <div class="cm-faces">${Object.entries(FRIENDS).map(([k, f]) => `<label class="cm-face cm-f-${k}"><input type="radio" name="fav-${esc(kid)}" value="${k}"${chosen === k ? ' checked' : ''}>
      <img src="${friendArt(k)}" alt="" width="56" height="84" loading="lazy"><span>${esc(f.name)}</span></label>`).join('')}</div></fieldset>`;

  // the message text a parent reads before saying yes: the version their child will hear
  const preview = (m, T) => `<div class="cm-preview cm-f-${esc(m.friend)}"><img src="${friendArt(m.friend)}" alt="" width="48" height="72" loading="lazy">
    <div><b>${esc(titleFor(m, lang()))}</b> <span class="chip">${esc(tl(m.topic))}</span>${m.in_chosen_voice ? ` <span class="chip ok">${esc(T.voice(FRIENDS[m.friend].name))}</span>` : ''}
      <p class="cm-script" lang="${lang() === 'es' && m.script_es ? 'es' : 'en'}">${esc(scriptFor(m, lang()))}</p></div></div>`;

  // ---------------------------------------------------------------------------------------------------------------------------
  async function viewMessages(c, shell) {
    if (c.role === 'family') return viewFamily(c, shell);
    return viewStaff(c, shell);
  }

  async function viewFamily(c, shell) {
    const T = L[lang() === 'es' ? 'es' : 'en'];
    const [kids, lib] = await Promise.all([rpc('charmsg_family_view', { p_center: c.center_id }), rpc('charmsg_library')]);
    const approvedFor = {};
    await Promise.all(kids.map(async (k) => { approvedFor[k.kid] = (await rpc('charmsg_for_child', { p_center: c.center_id, p_kid: k.kid })).messages; }));
    const kidCard = (k) => {
      const pre = new Set(k.preapprovals.filter((p) => p.scope === 'topic').map((p) => p.topic));
      const ok = approvedFor[k.kid] || [];
      return `<section class="card cm-kid" data-kid="${esc(k.kid)}" aria-labelledby="cmk-${esc(k.kid)}">
        <div class="cm-kid-head"><h2 id="cmk-${esc(k.kid)}">${esc(k.first_name)}</h2>
          <a class="btn gold small" href="/c/${esc(c.slug)}/player/${esc(k.kid)}" data-nav id="player-${esc(k.kid)}">${esc(T.openPlayer(k.first_name))}</a></div>
        ${friendPicker(k.kid, k.favorite_friend, T)}
        <h3>${esc(T.waiting)} ${k.pending.length ? `<span class="chip warn">${k.pending.length}</span>` : ''}</h3>
        ${k.pending.length ? `<ul class="cm-list">${k.pending.map((m) => `<li class="cm-pending" data-request="${esc(m.request_id)}">${preview(m, T)}
            <p class="small muted">${esc(T.asked(m.requested_by_name || m.requested_role, day(m.created_at)))}${m.note ? ` · “${esc(m.note)}”` : ''}</p>
            <div class="cm-row"><button type="button" class="btn center small" data-decide="yes">${esc(T.approve)}</button>
              <button type="button" class="btn soft small" data-decide="no">${esc(T.decline)}</button></div><p class="msg" role="status"></p></li>`).join('')}</ul>`
          : `<p class="empty small muted">${esc(T.none)}</p>`}
        <h3>${esc(T.approved)}</h3>
        ${ok.length ? `<ul class="cm-list">${ok.map((m) => `<li data-request="${esc(m.request_id)}">${preview(m, T)}
            <div class="cm-row"><button type="button" class="btn soft small" data-play="${esc(m.request_id)}">${esc(T.playHome)}</button></div></li>`).join('')}</ul>`
          : `<p class="empty small muted">${esc(T.noApproved)}</p>`}
        <details class="cm-pre"><summary><b>${esc(T.preTitle)}</b></summary><p class="small muted">${esc(T.preHint)}</p>
          <div class="choices two">${Object.keys(TOPICS).map((t) => `<label class="choice"><input type="checkbox" data-topic="${t}"${pre.has(t) ? ' checked' : ''}><span><b>${esc(tl(t))}</b></span></label>`).join('')}</div>
          <p class="msg" role="status" data-pre-msg></p></details>
        <details class="cm-hist"><summary><b>${esc(T.history)}</b></summary>
          ${k.history.length ? `<ol class="cm-history">${k.history.map((e) => `<li><span class="small muted">${esc(when(e.at))}</span> <b>${esc(e.by || e.role || '')}</b> ${esc(T.ev[e.event] || e.event)}${e.key ? ` · <span class="small">${esc(e.key)}</span>` : ''}</li>`).join('')}</ol>`
            : `<p class="small muted">${esc(T.noHistory)}</p>`}</details>
      </section>`;
    };
    const libHtml = lib.length ? `<label class="f"><span>${esc(T.all)}</span><select class="i" id="cmTopic"><option value="">${esc(T.all)}</option>${Object.keys(TOPICS).map((t) => `<option value="${t}">${esc(tl(t))}</option>`).join('')}</select></label>
        <ul class="cm-list" id="cmLib">${lib.map((m) => {
          const v = m.variants[m.default_friend] || Object.values(m.variants)[0];
          return `<li data-topic="${esc(m.topic)}" data-key="${esc(m.key)}" data-version="${m.version}">${preview({ ...m, friend: m.default_friend, script_en: v.en, script_es: v.es }, T)}
            <p class="small muted">${m.age_bands.map(bl).join(' · ')} · ${Object.keys(m.variants).map((f) => FRIENDS[f]?.name).join(', ')}</p>
            ${kids.length ? `<div class="cm-row">${kids.map((k) => `<button type="button" class="btn soft small" data-send="${esc(k.kid)}">${esc(T.sendBtn)}${kids.length > 1 ? `: ${esc(k.first_name)}` : ''}</button>`).join('')}</div>` : ''}
            <p class="msg" role="status"></p></li>`;
        }).join('')}</ul>` : `<p class="empty muted" id="cmLibEmpty">${esc(T.libEmpty)}</p>`;
    page(shell(`<div class="card cm-intro" id="cmIntro"><div class="cm-friends" aria-hidden="true">${Object.keys(FRIENDS).map((k) => `<img src="${friendArt(k)}" alt="" width="54" height="82">`).join('')}</div>
        <div><h2>${esc(T.title)}</h2><p>${esc(T.intro)}</p></div></div>
      ${kids.length ? kids.map(kidCard).join('') : `<div class="card"><p class="empty">${esc(T.noKids)}</p></div>`}
      <section class="card" id="cmLibrary"><h2>${esc(T.send)}</h2>${libHtml}</section>
      <div id="cmStage" class="cm-overlay" hidden></div>`), T.title);
    const wantReq = new URLSearchParams(location.search).get('request');   // the approval a notification is about
    if (wantReq) { const el = document.querySelector(`.cm-kid li[data-request="${cssValue(wantReq)}"]`); if (el) deepFocus(el); else deepMiss('request', lang()); }

    $$('.cm-pick').forEach((fs) => fs.addEventListener('change', async (e) => {
      try { await rpc('charmsg_set_child_friend', { p_center: c.center_id, p_kid: fs.dataset.kid, p_friend: e.target.value }); live(T.saved); await viewFamily(c, shell); }
      catch (err) { live(friendly(err)); }
    }));
    $$('.cm-pending').forEach((li) => $$('[data-decide]', li).forEach((b) => b.addEventListener('click', async () => {
      $$('button', li).forEach((x) => { x.disabled = true; });
      try { await rpc('charmsg_decide', { p_request: li.dataset.request, p_approve: b.dataset.decide === 'yes' }); await viewFamily(c, shell); live(T.saved); }
      catch (err) { say($('.msg', li), friendly(err), 'bad'); $$('button', li).forEach((x) => { x.disabled = false; }); }
    })));
    $$('.cm-kid').forEach((sec) => $$('[data-topic]', sec).forEach((box) => box.addEventListener('change', async () => {
      const k = kids.find((x) => x.kid === sec.dataset.kid);
      const m = $('[data-pre-msg]', sec);
      try {
        if (box.checked) await rpc('charmsg_preapprove', { p_center: c.center_id, p_kid: k.kid, p_scope: 'topic', p_topic: box.dataset.topic });
        else for (const p of k.preapprovals.filter((x) => x.scope === 'topic' && x.topic === box.dataset.topic)) await rpc('charmsg_preapproval_revoke', { p_id: p.id });
        say(m, T.saved);
        const fresh = await rpc('charmsg_family_view', { p_center: c.center_id });
        k.preapprovals = (fresh.find((x) => x.kid === k.kid) || k).preapprovals;
      } catch (err) { box.checked = !box.checked; say(m, friendly(err), 'bad'); }
    })));
    const stage = $('#cmStage');
    const allOk = Object.values(approvedFor).flat();
    $$('[data-play]').forEach((b) => b.addEventListener('click', async () => {
      const m = allOk.find((x) => x.request_id === b.dataset.play);
      stage.hidden = false;
      try { await playMessage(stage, m, { lang: lang(), rpc, context: 'parent_home', onBack: () => { stage.hidden = true; stage.innerHTML = ''; } }); }
      catch (err) { stage.hidden = true; live(friendly(err)); }
    }));
    const topicSel = $('#cmTopic');
    if (topicSel) topicSel.addEventListener('change', () => $$('#cmLib > li').forEach((li) => { li.hidden = !!topicSel.value && li.dataset.topic !== topicSel.value; }));
    $$('[data-send]').forEach((b) => b.addEventListener('click', async () => {
      const li = b.closest('li');
      try { await rpc('charmsg_parent_send', { p_center: c.center_id, p_kid: b.dataset.send, p_key: li.dataset.key, p_version: Number(li.dataset.version) }); await viewFamily(c, shell); live(T.saved); }
      catch (err) { say($('.msg', li), friendly(err), 'bad'); }
    }));
  }

  // ---------------------------------------------------------------------------------------------------------------------------
  const STATUS = { pending: ['warn', 'Waiting for the parent'], approved: ['ok', 'Parent approved'], declined: ['bad', 'Parent said no'],
    withdrawn: ['', 'Withdrawn'], expired: ['', 'Expired (no answer in 14 days)'] };
  async function viewStaff(c, shell) {
    const [kids, lib] = await Promise.all([rpc('charmsg_staff_view', { p_center: c.center_id }), rpc('charmsg_library')]);
    const libBy = Object.fromEntries(lib.map((m) => [`${m.key}@${m.version}`, m]));
    const reqLine = (r) => {
      const m = libBy[`${r.key}@${r.version}`];
      const [cls, label] = STATUS[r.status] || ['', r.status];
      return `<li data-request="${esc(r.id)}"><span><b>${esc(m ? m.title_en : r.key)}</b> <span class="chip ${cls}">${esc(label)}</span>${r.via === 'preapproval' ? ' <span class="chip">Topic pre-approved by the parent</span>' : ''}${r.via === 'parent_self' ? ' <span class="chip">Sent by the parent</span>' : ''}
        <span class="small muted"> · ${esc(day(r.created_at))}${r.plays ? ` · played ${r.plays}×` : ''}</span></span>
        ${r.status === 'pending' && r.mine ? '<button type="button" class="btn link small" data-withdraw>Withdraw</button>' : ''}</li>`;
    };
    page(shell(`<div class="card cm-intro" id="cmIntro"><div class="cm-friends" aria-hidden="true">${Object.keys(FRIENDS).map((k) => `<img src="${friendArt(k)}" alt="" width="54" height="82">`).join('')}</div>
        <div><h2>Character messages</h2>
        <p>When a child could use a gentle reminder (a big breath, trying again, gentle hands), ask for a premade message from one of the friends. <b>The parent decides:</b> it goes to the parent first, unless they have already said yes to that topic. You cannot approve on a parent's behalf, and nothing is played to a child without the parent's OK.</p>
        <p class="small muted">Every message is written ahead of time and reviewed by a child-development reviewer. The friends never shame, threaten, compare or hold back food, movement, outdoor play or rest.</p></div></div>
      ${lib.length ? '' : '<div class="card"><p class="empty" id="cmLibEmpty">The message library is waiting for its child-development review. Once messages are approved they can be requested here.</p></div>'}
      <form class="card" id="cmAsk" novalidate ${lib.length ? '' : 'hidden'}><h2>Ask for a message</h2>
        <div class="grid two"><label class="f"><span>Child</span><select class="i" id="cmKid" required><option value="">Choose a child</option>${kids.map((k) => `<option value="${esc(k.kid)}">${esc(k.first_name)} (${esc(k.room || 'no room')})${k.has_guardian ? '' : ' · no parent linked'}</option>`).join('')}</select></label>
          <label class="f"><span>Topic</span><select class="i" id="cmTopicS"><option value="">All topics</option>${Object.keys(TOPICS).map((t) => `<option value="${t}">${esc(TOPICS[t][0])}</option>`).join('')}</select></label></div>
        <label class="f"><span>Message</span><select class="i" id="cmMsg" required>${lib.map((m) => `<option value="${esc(m.key)}@${m.version}" data-topic="${esc(m.topic)}">${esc(TOPICS[m.topic][0])}: ${esc(m.title_en)} (${esc(FRIENDS[m.default_friend].name)})</option>`).join('')}</select></label>
        <div id="cmMsgPreview"></div>
        <label class="f"><span>Note to the parent <span class="hint">optional, kind and short (200 characters); no health details</span></span><input class="i" id="cmNote" maxlength="200"></label>
        <p class="msg" id="cmAskMsg" role="status"></p><button class="btn center" type="submit">Send to the parent</button></form>
      <div class="card"><h2>Requests</h2>${kids.some((k) => k.requests.length) ? kids.filter((k) => k.requests.length).map((k) => `<h3>${esc(k.first_name)} <span class="small muted">${esc(k.room || '')}</span>${k.preapproved_topics.length ? ` <span class="chip ok">Parent OK for: ${esc(k.preapproved_topics.map((t) => TOPICS[t]?.[0] || t).join(', '))}</span>` : ''}</h3>
        <ul class="list cm-reqs">${k.requests.map(reqLine).join('')}</ul>`).join('') : '<p class="empty muted" id="cmNoReq">No requests yet.</p>'}</div>`), `Character messages · ${c.name}`, { english: true });

    const sel = $('#cmMsg'), topic = $('#cmTopicS'), pv = $('#cmMsgPreview');
    const showPreview = () => {
      const m = libBy[sel?.value];
      if (!pv) return;
      pv.innerHTML = m ? preview({ ...m, friend: m.default_friend, script_en: m.variants[m.default_friend].en, script_es: null }, L.en) : '';
    };
    if (topic) topic.addEventListener('change', () => { [...sel.options].forEach((o) => { o.hidden = !!topic.value && o.dataset.topic !== topic.value; }); const first = [...sel.options].find((o) => !o.hidden); if (first) sel.value = first.value; showPreview(); });
    if (sel) { sel.addEventListener('change', showPreview); showPreview(); }
    const form = $('#cmAsk');
    if (form) form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const out = $('#cmAskMsg');
      const kid = $('#cmKid').value;
      if (!kid) return say(out, 'Choose a child.', 'bad');
      const [key, version] = sel.value.split('@');
      try {
        const r = await rpc('charmsg_request', { p_center: c.center_id, p_kid: kid, p_key: key, p_version: Number(version), p_note: $('#cmNote').value.trim() || null });
        await viewStaff(c, shell);
        say($('#cmAskMsg'), r.status === 'approved' ? 'Shared: the parent has already said yes to this topic.' : r.duplicate ? 'This message is already waiting for the parent.' : 'Sent to the parent for approval.');
      } catch (err) { say(out, friendly(err), 'bad'); }
    });
    $$('[data-withdraw]').forEach((b) => b.addEventListener('click', async () => {
      try { await rpc('charmsg_withdraw', { p_request: b.closest('li').dataset.request }); await viewStaff(c, shell); live('Withdrawn.'); }
      catch (err) { live(friendly(err)); }
    }));
  }

  // ---------------------------------------------------------------------------------------------------------------------------
  // The stand-alone child player. Big, calm, few words; the grown-up opens it from the family page (or a classroom tablet).
  async function viewPlayer(c, kid) {
    const T = L[lang() === 'es' ? 'es' : 'en'];
    let data;
    try { data = await rpc('charmsg_for_child', { p_center: c.center_id, p_kid: kid }); }
    catch (err) {
      page(`<div class="wrap narrow"><div class="card"><p class="msg bad" role="alert">${esc(friendly(err))}</p>
        <a class="btn navy" href="/c/${esc(c.slug)}/messages" data-nav>${esc(T.back)}</a></div></div>`, T.title, { english: c.role !== 'family' });
      return;
    }
    const fav = data.favorite_friend;
    const list = () => `<div class="cm-player" id="cmPlayer">
      <div class="cm-player-head"><a class="btn soft small" href="/c/${esc(c.slug)}/messages" data-nav id="cmExit">${esc(T.back)}</a>
        <h1>${esc(data.first_name)}</h1></div>
      ${friendPicker(kid, fav, T)}
      ${data.messages.length ? `<div class="cm-cards" id="cmCards">${data.messages.map((m) => renderMessageCard(m, { lang: lang(), label: m.in_chosen_voice && m.friend !== m.default_friend ? tl(m.topic) : null })).join('')}</div>`
        : `<div class="cm-empty"><img src="${friendArt(fav || 'lumi')}" alt="" width="160" height="256"><p>${esc(T.noApproved)}</p></div>`}
      <div id="cmStage" class="cm-stage-wrap" hidden></div></div>`;
    const draw = () => {
      page(list(), `${data.first_name} · ${T.title}`, { english: c.role !== 'family' });
      const stage = $('#cmStage'), cards = $('#cmCards');
      $$('.cm-card').forEach((b) => b.addEventListener('click', async () => {
        const m = data.messages.find((x) => x.request_id === b.dataset.request);
        try {
          if (cards) cards.hidden = true;
          stage.hidden = false;
          await playMessage(stage, m, { lang: lang(), rpc, context: 'player', onBack: () => { stage.hidden = true; stage.innerHTML = ''; if (cards) cards.hidden = false; } });
        } catch (err) { stage.hidden = true; if (cards) cards.hidden = false; live(friendly(err)); }
      }));
      const pick = $('.cm-pick');
      if (pick) pick.addEventListener('change', async (e) => {
        try { await rpc('charmsg_set_child_friend', { p_center: c.center_id, p_kid: kid, p_friend: e.target.value }); stopSound(); data = await rpc('charmsg_for_child', { p_center: c.center_id, p_kid: kid }); draw(); live(T.saved); }
        catch (err) { live(friendly(err)); }
      });
    };
    draw();
  }

  return { viewMessages, viewPlayer };
}
