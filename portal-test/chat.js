// /c/<slug>/chat: parent <-> teacher messages and announcements (migration 20261026060000_chat_announcements.sql, hub/NOTIFICATIONS.md).
//   messages        the msgs rows the Teacher / Family Portal also writes ({kid, room, date, from, text, at, by, read, files}); row-level
//                   security decides who reads and writes (families: their own children, from = 'family'; staff: classroom permission)
//   announcements   center-wide (directors) or one room; families mark them read when they see them; staff see "seen by n of m families"
//   attachments     private bucket 'chat-files', opened through 5-minute signed links; images and PDF, 10 MB, at most 3. A staff image
//                   needs the child's photo consent (the database refuses it otherwise); announcements take PDF only.
// Every view follows the reader's own language (Spanish = draft). Bilingual (owner request 2026-10-10): a message or an announcement
// can carry its author's own second version (msgs.data.alt = {lang, text}; announcements.title_es/body_es, migration
// 20261027100000_bilingual_everywhere.sql); the reader sees their language first and can flip to the other. Never machine translation.
// Staff see each child's home language (kid_languages_list) and "Write in both languages" opens by itself for a Spanish-speaking home.

import { cssValue, deepFocus, deepMiss } from './deeplink.js';
import { flipBlock } from './i18n.js';
import { centerToday, centerTz } from './center-time.js';

const MAX_FILES = 3, MAX_BYTES = 10 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' };
const W = {
  en: { title: 'Messages and announcements', ann: 'Announcements', noAnn: 'No announcements yet.', conv: 'Messages with the teachers', child: 'Child',
        none: 'No messages yet. Say hello!', write: 'Write a message', send: 'Send', attach: 'Attach photos or PDF (up to 3, 10 MB each)',
        you: 'You', teacher: 'Teacher', family: (n) => `${n}'s family`, seen: 'Seen', sent: 'Sent', tooMany: 'Up to 3 files.',
        tooBig: (n) => `${n} is larger than 10 MB.`, badType: (n) => `${n}: only photos (JPG, PNG, WebP) or PDF.`, empty: 'Write a message or attach a file.',
        sentOk: 'Message sent.', whole: 'Whole center', room: 'Room', post: 'Post announcement', annTitle: 'Title', annBody: 'Announcement',
        annFiles: 'Attach PDF (up to 3; no photos: they could show children without consent)', posted: 'Announcement posted.',
        receipts: (r, n) => `Seen by ${r} of ${n} families`, notSeen: 'Not seen yet by the families of', open: 'Open', newAnn: 'New announcement', noKids: 'No children here yet.',
        both: 'Write in both languages', altLang: 'Second version in', altText: 'The same message in that language', altHint: 'Your own words: the Hub never machine-translates.',
        annEs: 'In Spanish too', annTitleEs: 'Title in Spanish', annBodyEs: 'Announcement in Spanish', annEsHint: 'Families who read Spanish see this version first; everyone can flip.',
        annEsBoth: 'Fill in both the Spanish title and the Spanish announcement, or leave both empty.', langEs: 'Spanish', langEn: 'English',
        home: { es: 'Spanish at home', both: 'English and Spanish at home', en: '' } },
  es: { title: 'Mensajes y anuncios', ann: 'Anuncios', noAnn: 'Todavía no hay anuncios.', conv: 'Mensajes con las maestras', child: 'Niño o niña',
        none: 'Todavía no hay mensajes. ¡Salude!', write: 'Escriba un mensaje', send: 'Enviar', attach: 'Adjuntar fotos o PDF (hasta 3, 10 MB cada uno)',
        you: 'Usted', teacher: 'Maestra', family: (n) => `Familia de ${n}`, seen: 'Visto', sent: 'Enviado', tooMany: 'Hasta 3 archivos.',
        tooBig: (n) => `${n} pesa más de 10 MB.`, badType: (n) => `${n}: solo fotos (JPG, PNG, WebP) o PDF.`, empty: 'Escriba un mensaje o adjunte un archivo.',
        sentOk: 'Mensaje enviado.', whole: 'Todo el centro', room: 'Salón', post: 'Publicar anuncio', annTitle: 'Título', annBody: 'Anuncio',
        annFiles: 'Adjuntar PDF', posted: 'Anuncio publicado.', receipts: (r, n) => `Visto por ${r} de ${n} familias`, notSeen: 'Aún no lo han visto las familias de',
        open: 'Abrir', newAnn: 'Nuevo anuncio', noKids: 'Todavía no hay niños.',
        both: 'Escribir en los dos idiomas', altLang: 'Segunda versión en', altText: 'El mismo mensaje en ese idioma', altHint: 'Con sus propias palabras: el Hub nunca traduce con máquina.',
        annEs: 'También en español', annTitleEs: 'Título en español', annBodyEs: 'Anuncio en español', annEsHint: 'Las familias que leen español ven primero esta versión; todos pueden cambiar.',
        annEsBoth: 'Complete el título y el anuncio en español, o deje los dos vacíos.', langEs: 'Español', langEn: 'Inglés',
        home: { es: 'Español en casa', both: 'Inglés y español en casa', en: '' } },
};

export function checkFiles(files, { pdfOnly = false } = {}, w = W.en) {
  const list = [...(files || [])];
  if (list.length > MAX_FILES) return w.tooMany;
  for (const f of list) {
    if (!TYPES.includes(f.type) || (pdfOnly && f.type !== 'application/pdf')) return w.badType(f.name);
    if (f.size > MAX_BYTES) return w.tooBig(f.name);
  }
  return null;
}

export function mountChat({ esc, $, rpc, page, live, friendly, client, session }) {
  const today = () => centerToday();   // the center's day
  const fmt = (ms, lang) => new Date(ms).toLocaleString(lang === 'es' ? 'es-US' : 'en-US', { timeZone: centerTz(), month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const at = (m) => Number(m.data?.at) || Date.parse(m.data?.ts || '') || Date.parse(m.updated_at || '') || 0;

  async function upload(c, folder, files) {
    const out = [];
    for (const f of files) {
      const path = `${c.center_id}/${folder}${crypto.randomUUID()}.${EXT[f.type]}`;
      const r = await client().storage.from('chat-files').upload(path, f, { contentType: f.type, upsert: false });
      if (r.error) throw r.error;
      out.push({ path, name: String(f.name).slice(0, 120) || 'file', type: f.type, size: f.size });
    }
    return out;
  }
  async function signed(path) {
    const r = await client().storage.from('chat-files').createSignedUrl(path, 300);
    if (r.error) throw r.error;
    return r.data.signedUrl;
  }
  const filesHtml = (files) => (files || []).length ? `<ul class="chat-files">${files.map((f) => `<li>${f.type?.startsWith('image/')
    ? `<button type="button" class="chat-thumb" data-file="${esc(f.path)}" data-img="1" aria-label="${esc(f.name)}"><span class="small">${esc(f.name)}</span></button>`
    : `<button type="button" class="btn link small" data-file="${esc(f.path)}">${esc(f.name)} (PDF)</button>`}</li>`).join('')}</ul>` : '';
  // images load their signed link when shown; PDFs open in a new tab on click
  async function hydrate(root) {
    for (const b of root.querySelectorAll('[data-img][data-file]:not([data-done])')) {
      b.setAttribute('data-done', '1');
      try { const u = await signed(b.getAttribute('data-file')); b.innerHTML = `<img src="${esc(u)}" alt="${esc(b.getAttribute('aria-label') || '')}" loading="lazy">`; } catch (_) { /* stays a name */ }
    }
  }
  function bindFiles(root) {
    root.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-file]'); if (!b) return;
      const u = await signed(b.getAttribute('data-file')).catch(() => null);
      if (u) window.open(u, '_blank', 'noopener');
    });
  }

  // kidParam / msgParam / annParam: a notification's deep link (?kid=&msg= opens that child's thread at that message; ?a= that announcement)
  async function viewChat(c, shell, { lang = 'en', director = false, family = false, kidParam = null, annParam = null, msgParam = null } = {}) {
    const w = W[lang === 'es' ? 'es' : 'en'];
    const s = await session();
    const me = s?.user?.id;
    const [kidsR, roomsR, annsR] = await Promise.all([
      client().from('kids').select('id, room, data').eq('center_id', c.center_id).order('id'),
      client().from('rooms').select('id, data').eq('center_id', c.center_id).order('id'),
      client().from('announcements').select('id, room, title, body, title_es, body_es, files, created_at, author_role').eq('center_id', c.center_id).order('created_at', { ascending: false }).limit(20),
    ]);
    const kids = (kidsR.data || []).filter((k) => !k.data?.left_on);
    const rooms = roomsR.data || [];
    const anns = annsR.data || [];
    const roomName = (id) => rooms.find((r) => r.id === id)?.data?.name || id;
    const kidName = (k) => k?.data?.first || k?.data?.name || k?.id || '';
    const kidMissing = !!kidParam && !kids.some((k) => k.id === kidParam);
    // each child's home language (staff: so a Spanish-speaking home gets both languages by default); never blocks the page
    let langs = {};
    try { for (const x of (await rpc('kid_languages_list', { p_center: c.center_id })) || []) langs[x.kid] = x; } catch (_) { langs = {}; }
    const homeOf = (id) => langs[id]?.home || null;
    const spanishHome = (id) => ['es', 'both'].includes(homeOf(id));
    let kid = kids.find((k) => k.id === kidParam)?.id || kids[0]?.id || null;

    // announcements card
    let receipts = {};
    if (!family) {
      const rs = await Promise.all(anns.map((a) => rpc('announcement_receipts', { p_id: a.id }).catch(() => null)));
      anns.forEach((a, i) => { receipts[a.id] = rs[i]; });
    }
    const postForm = family ? '' : `<details class="chat-post"${anns.length ? '' : ' open'}><summary>${esc(w.newAnn)}</summary>
      <form id="annForm" novalidate>
        <label class="f"><span>${esc(w.room)}</span><select class="i" id="annRoom">${director ? `<option value="">${esc(w.whole)}</option>` : ''}${rooms.map((r) => `<option value="${esc(r.id)}">${esc(roomName(r.id))}</option>`).join('')}</select></label>
        <label class="f"><span>${esc(w.annTitle)}</span><input class="i" id="annTitle" maxlength="120" required></label>
        <label class="f"><span>${esc(w.annBody)}</span><textarea class="i" id="annBody" rows="3" maxlength="4000" required></textarea></label>
        <details class="ann-es" id="annEs"${kids.some((k) => spanishHome(k.id)) ? ' open' : ''}><summary>${esc(w.annEs)}</summary>
          <label class="f"><span>${esc(w.annTitleEs)}</span><input class="i" id="annTitleEs" lang="es" maxlength="120"></label>
          <label class="f"><span>${esc(w.annBodyEs)}</span><textarea class="i" id="annBodyEs" lang="es" rows="3" maxlength="4000"></textarea></label>
          <p class="small muted">${esc(w.annEsHint)}</p></details>
        <label class="f"><span>${esc(w.annFiles)}</span><input type="file" id="annFiles" accept="application/pdf" multiple></label>
        <p class="msg" id="annMsg" role="status"></p><button class="btn navy" type="submit">${esc(w.post)}</button></form></details>`;
    const annList = anns.length ? `<ul class="chat-anns" id="annList">${anns.map((a) => {
      const r = receipts[a.id];
      const side = (t, b) => `<b>${esc(t)}</b><p>${esc(b)}</p>`;
      return `<li id="ann-${esc(a.id)}"${a.id === annParam ? ' class="hl"' : ''}>
        <span class="small muted">${esc(a.room ? roomName(a.room) : w.whole)} · ${esc(fmt(Date.parse(a.created_at), lang))}</span>
        ${a.title_es ? flipBlock({ en: side(a.title, a.body), es: side(a.title_es, a.body_es) }, lang, { cls: 'chat-ann-text' }) : `<div class="chat-ann-text" translate="no">${side(a.title, a.body)}</div>`}${filesHtml(a.files)}
        ${r ? `<p class="small" data-receipts>${esc(w.receipts(r.read, r.families))}${r.not_seen.length ? `<br><span class="muted">${esc(w.notSeen)} ${esc(r.not_seen.join(', '))}</span>` : ''}</p>` : ''}</li>`; }).join('')}</ul>`
      : `<p class="empty" id="annList">${esc(w.noAnn)}</p>`;

    page(shell(`<h2 class="sr-only">${esc(w.title)}</h2><div class="grid two chat">
      <div class="card" id="chatAnns"><h2>${esc(w.ann)}</h2>${postForm}${annList}</div>
      <div class="card" id="chatMsgs"><h2>${esc(w.conv)}</h2>
        ${kids.length ? `<label class="f"><span>${esc(w.child)}</span><select class="i" id="chatKid">${kids.map((k) => `<option value="${esc(k.id)}"${k.id === kid ? ' selected' : ''}>${esc(kidName(k))}${!family && k.room ? ` (${esc(roomName(k.room))})` : ''}${!family && w.home[homeOf(k.id)] ? ` · ${esc(w.home[homeOf(k.id)])}` : ''}</option>`).join('')}</select></label>
        <div class="chat-thread" id="chatThread" aria-live="polite"></div>
        <form id="chatForm" novalidate><label class="f"><span>${esc(w.write)}</span><textarea class="i" id="chatText" rows="3" maxlength="2000"></textarea></label>
          <details class="chat-both" id="chatBoth"${!family && spanishHome(kid) ? ' open' : ''}><summary>${esc(w.both)}</summary>
            <label class="f"><span>${esc(w.altLang)}</span><select class="i" id="chatAltLang"><option value="es"${lang === 'es' ? '' : ' selected'}>${esc(w.langEs)}</option><option value="en"${lang === 'es' ? ' selected' : ''}>${esc(w.langEn)}</option></select></label>
            <label class="f"><span>${esc(w.altText)}</span><textarea class="i" id="chatAlt" rows="3" maxlength="2000"></textarea></label>
            <p class="small muted">${esc(w.altHint)}</p></details>
          <label class="f"><span class="small">${esc(w.attach)}</span><input type="file" id="chatFiles" accept="image/jpeg,image/png,image/webp,application/pdf" multiple></label>
          <p class="msg" id="chatMsg" role="status"></p><button class="btn gold" type="submit">${esc(w.send)}</button></form>`
          : `<p class="empty">${esc(w.noKids)}</p>`}</div></div>`), w.title, { english: !family });
    bindFiles($('#chatAnns')); bindFiles($('#chatMsgs'));
    hydrate($('#chatAnns'));
    const dl = lang;
    if (kidMissing) deepMiss('child', dl);
    else if (annParam) { const el = $(`#ann-${CSS.escape(annParam)}`); if (el) deepFocus(el); else deepMiss('announcement', dl); }
    if (family) for (const a of anns) rpc('announcement_mark_read', { p_id: a.id }).catch(() => null);

    async function loadThread() {
      const el = $('#chatThread'); if (!el || !kid) return;
      const r = await client().from('msgs').select('id, data, updated_at').eq('center_id', c.center_id).eq('kid', kid).order('date', { ascending: false }).limit(100);
      const msgs = (r.data || []).sort((a, b) => at(a) - at(b));
      const k = kids.find((x) => x.id === kid);
      const side = family ? 'family' : 'teacher';
      el.innerHTML = msgs.length ? msgs.map((m) => {
        const d = m.data || {}, mine = (d.from === 'family') === family;
        const who = mine ? w.you : d.from === 'family' ? w.family(kidName(k)) : w.teacher;
        const other = family ? 'teacher' : 'family';
        return `<div class="chat-b ${mine ? 'me' : 'them'}" data-id="${esc(m.id)}">${d.ann ? `<span class="small muted">${esc(w.ann)}</span>` : ''}
          ${d.text ? (d.alt?.text && ['en', 'es'].includes(d.alt.lang)
            ? flipBlock({ [d.alt.lang]: `<p>${esc(d.alt.text)}</p>`, [d.alt.lang === 'es' ? 'en' : 'es']: `<p>${esc(d.text)}</p>` }, lang, { cls: 'chat-text' })
            : `<p translate="no">${esc(d.text)}</p>`) : ''}${filesHtml(d.files)}
          <span class="chat-meta">${esc(who)} · ${esc(fmt(at(m), lang))}${mine ? ` · ${esc(d.read?.[other] ? w.seen : w.sent)}` : ''}</span></div>`;
      }).join('') : `<p class="empty">${esc(w.none)}</p>`;
      el.scrollTop = el.scrollHeight;
      hydrate(el);
      if (msgParam && !kidMissing && kid === kidParam) {          // the message the notification is about: in view and highlighted
        const target = el.querySelector(`.chat-b[data-id="${cssValue(msgParam)}"]`);
        if (target) deepFocus(target); else deepMiss('message', dl);
        msgParam = null;
      }
      // read receipts: mark what the other side wrote as read by this side (families may change only data.read.family)
      for (const m of msgs) {
        const d = m.data || {};
        if ((d.from === 'family') !== family && !d.read?.[side]) {
          await client().from('msgs').update({ data: { ...d, read: { ...(d.read || {}), [side]: true } } }).eq('center_id', c.center_id).eq('id', m.id);
        }
      }
    }
    if (!kids.length) return;
    $('#chatKid').onchange = (e) => {
      kid = e.target.value; history.replaceState(null, '', `${FFTest.pathname()}?kid=${encodeURIComponent(kid)}`);
      if (!family && spanishHome(kid)) $('#chatBoth').open = true;
      loadThread();
    };
    await loadThread();

    $('#chatForm').onsubmit = async (e) => {
      e.preventDefault();
      const m = $('#chatMsg'), text = $('#chatText').value.trim(), files = $('#chatFiles').files;
      const altText = $('#chatBoth').open ? $('#chatAlt').value.trim() : '', altLang = $('#chatAltLang').value;
      const bad = checkFiles(files, {}, w) || (!text && !files.length ? w.empty : null);
      if (bad) { m.className = 'msg bad'; m.textContent = bad; return; }
      const btn = e.submitter || $('#chatForm button'); btn.disabled = true;
      try {
        const k = kids.find((x) => x.id === kid);
        const stored = await upload(c, `kid/${kid}/`, [...files]);
        const from = family ? 'family' : 'teacher';
        const r = await client().from('msgs').insert({ center_id: c.center_id, id: `m-${crypto.randomUUID()}`, data: { kid, room: k?.room || null, date: today(), from, text,
          at: Date.now(), by: me, read: { teacher: from === 'teacher', family: from === 'family' }, ...(stored.length ? { files: stored } : {}),
          ...(text && altText ? { alt: { lang: altLang, text: altText } } : {}) } });
        if (r.error) throw r.error;
        $('#chatText').value = ''; $('#chatFiles').value = ''; $('#chatAlt').value = '';
        await loadThread();
        m.className = 'msg ok'; m.textContent = w.sentOk; live(w.sentOk);
      } catch (err) { m.className = 'msg bad'; m.textContent = friendly(err); }
      finally { btn.disabled = false; }
    };
    const af = $('#annForm');
    if (af) af.onsubmit = async (e) => {
      e.preventDefault();
      const m = $('#annMsg'), files = $('#annFiles').files;
      const tEs = $('#annTitleEs').value.trim(), bEs = $('#annBodyEs').value.trim();
      const bad = checkFiles(files, { pdfOnly: true }, w) || (!tEs !== !bEs ? w.annEsBoth : null);
      if (bad) { m.className = 'msg bad'; m.textContent = bad; return; }
      try {
        const stored = await upload(c, 'ann/', [...files]);
        await rpc('announcement_post', { p_center: c.center_id, p_room: $('#annRoom').value || null, p_title: $('#annTitle').value, p_body: $('#annBody').value, p_files: stored,
          ...(tEs ? { p_title_es: tEs, p_body_es: bEs } : {}) });
        live(w.posted);
        await viewChat(c, shell, { lang, director, family, kidParam: kid });
        const msg = $('#annMsg'); if (msg) { msg.className = 'msg ok'; msg.textContent = w.posted; }
      } catch (err) { m.className = 'msg bad'; m.textContent = friendly(err); }
    };
  }
  return { viewChat };
}
