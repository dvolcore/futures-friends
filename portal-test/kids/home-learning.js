// The home-learning hub (hub/HOME_LEARNING.md, migration 20261026500000_home_learning.sql). Mounted by app.js at /c/<slug>/learn.
//
//   Family  "This week at school -> do this at home": the unit and week theme the center chose, this week's do-it-together cards
//           ("We did it" + a note, and a photo or video as proof), time learning this week (information only: there is NO screen-time
//           cap, owner decision 2026-10-10), "Share from home" (photos re-encoded in the browser so EXIF and location never leave the
//           device; short videos), what the family shared with the teachers' reactions and comments, the child's portfolio, Kid Mode.
//           ?kid=<id> picks the child. English + Spanish (DRAFT).
//   Staff   Family uploads of one room (?room=<id>): react, comment (the family is told), add to the child's portfolio. Directors also
//           set the age Kid Mode opens at in this center (kid_mode_min_age_months, default 36).
// Every read and write goes through the database functions; files through short-lived signed links of the private family-uploads bucket.
import { avatarHtml, friendImg, withSpanish } from './kid-mode.js';
import { cssValue, deepFocus, deepMiss } from './deeplink.js';
import { HW, IMAGE_MAX, REACTIONS, REACTION_ICON, classifyFile, jpegHasMetadata, minutes, unitTitle } from './home-learning-core.js';

const BUCKET = 'family-uploads';

// Re-encode a photo through a canvas: the result is a fresh JPEG with no EXIF, GPS or camera data. Large photos are scaled down.
export async function cleanPhoto(file, maxSide = 2048) {
  let bmp;
  try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (_) { throw Object.assign(new Error('unreadable'), { why: 'unreadable' }); }
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * scale)), h = Math.max(1, Math.round(bmp.height * scale));
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.drawImage(bmp, 0, 0, w, h);
  if (bmp.close) bmp.close();
  for (const q of [0.88, 0.75, 0.6]) {
    const blob = await new Promise((r) => cv.toBlob(r, 'image/jpeg', q));
    if (!blob) break;
    if (jpegHasMetadata(new Uint8Array(await blob.arrayBuffer()))) throw Object.assign(new Error('metadata'), { why: 'metadata' });
    if (blob.size <= IMAGE_MAX) return blob;
  }
  throw Object.assign(new Error('imageTooBig'), { why: 'imageTooBig' });
}

// One upload, start to finish: begin (row + path) -> Storage upload -> finish (checks size and type, links the activity, tells the
// teachers). On any failure the half-made upload is removed again.
export async function shareFile({ rpc, client }, { center, kid, file, activity = null, caption = null }) {
  const cls = classifyFile(file);
  if (!cls.ok) throw Object.assign(new Error(cls.why), { why: cls.why });
  const blob = cls.kind === 'image' ? await cleanPhoto(file) : file;
  const mime = cls.kind === 'image' ? 'image/jpeg' : cls.mime;
  const b = await rpc('family_upload_begin', { p_center: center, p_kid: kid, p_kind: cls.kind, p_mime: mime, p_bytes: blob.size,
    p_activity: activity || null, p_caption: caption || null, p_meta_stripped: cls.kind === 'image' });
  const store = client().storage.from(BUCKET);
  const up = await store.upload(b.path, blob, { contentType: mime, upsert: false });
  if (up.error) { await rpc('family_upload_delete', { p_id: b.id }).catch(() => {}); throw up.error; }
  try { return await rpc('family_upload_finish', { p_id: b.id }); } catch (err) {
    await store.remove([b.path]).catch(() => {});
    await rpc('family_upload_delete', { p_id: b.id }).catch(() => {});
    throw err;
  }
}

function mediaHtml(esc, u) {
  return u.kind === 'video'
    ? `<video class="hl-media" data-path="${esc(u.path)}" controls preload="metadata" playsinline></video>`
    : `<img class="hl-media" data-path="${esc(u.path)}" alt="">`;
}
// short-lived signed links for every photo / video on the page
function signMedia(client, root) {
  for (const el of root.querySelectorAll('.hl-media[data-path]')) {
    client().storage.from(BUCKET).createSignedUrl(el.dataset.path, 600).then((r) => { if (r.data?.signedUrl) el.src = r.data.signedUrl; else el.remove(); });
  }
}
function commentsHtml(esc, list, L) {
  if (!list?.length) return '';
  return `<ul class="hl-comments">${list.map((m) => `<li>${m.reaction ? `<span class="hl-react" role="img" aria-label="${esc(m.reaction)}">${REACTION_ICON[m.reaction] || ''}</span>` : ''}
    ${m.body ? `<span><b>${esc(L.teacher)}:</b> ${esc(m.body)}</span>` : ''}</li>`).join('')}</ul>`;
}

export async function viewHomeLearning(ctx) {
  return ctx.c.role === 'family' ? viewFamily(ctx) : viewStaff(ctx);
}

// ?upload=<id> (a notification: a family shared something / the teacher answered): that upload, highlighted; gone = said so
function focusUpload(wrongPlace, lang) {
  const id = new URLSearchParams(location.search).get('upload');
  if (wrongPlace) return deepMiss(lang === 'es' ? 'child' : 'any', lang);
  if (!id) return;
  const el = document.querySelector(`#hlShared .hl-upload[data-id="${cssValue(id)}"], #uploadList .hl-upload[data-id="${cssValue(id)}"]`);
  if (el) deepFocus(el); else deepMiss('upload', lang);
}

// ---- family ------------------------------------------------------------------------------------------------------------------
async function viewFamily(ctx) {
  const { c, shell, page, rpc, esc, friendly, client, lang, live } = ctx;
  const L = HW[lang === 'es' ? 'es' : 'en'];
  page(shell('<p class="loading">…</p>'), L.title);
  const kids = await rpc('kid_mode_kids', { p_center: c.center_id, p_room: null });
  if (!kids.length) return page(shell(`<div class="card"><h2>${esc(L.title)}</h2><p>${esc(L.empty)}</p></div>`), L.title);
  const want = new URLSearchParams(location.search).get('kid');
  const cur = kids.find((k) => k.kid === want) || kids[0];
  let pf, up;
  try {
    [pf, up] = await Promise.all([rpc('kid_work_portfolio', { p_center: c.center_id, p_kid: cur.kid }),
                                 rpc('family_uploads_for_child', { p_center: c.center_id, p_kid: cur.kid })]);
  } catch (e) { return page(shell(`<div class="card"><p class="msg bad" role="alert">${esc(friendly(e))}</p></div>`), L.title); }
  const wk = pf.this_week || { activities: [] };
  wk.activities = await withSpanish(rpc, wk.activities || [], lang);   // the do-it-together cards in Spanish (DRAFT) for a Spanish-reading family
  const home = (wk.activities || []).filter((a) => a.mode === 'off_screen');
  const tl = pf.time_learning || {};
  const consent = !!up.consent;
  const byLabel = (it) => (it.by === 'kid_mode' ? L.byKid : it.by === 'family' ? L.byYou : L.byStaff);
  const slug = esc(c.slug);
  page(shell(`<div class="hl" id="homeLearning">
    ${kids.length > 1 ? `<nav class="tabs" aria-label="${esc(L.children)}">${kids.map((k) => `<a href="/c/${slug}/learn?kid=${encodeURIComponent(k.kid)}" data-nav${k.kid === cur.kid ? ' aria-current="page"' : ''}>${esc(k.label)}</a>`).join('')}</nav>` : ''}
    <div class="card hl-head">${avatarHtml(esc, pf.guide, 'km-av-m')}<div><h2>${esc(L.title)}: ${esc(cur.label)}</h2><p class="muted">${esc(L.intro)}</p>
      <div class="cta-row">${cur.screen_ok ? `<a class="btn gold" href="/c/${slug}/kid" data-nav id="hlKid">${esc(L.openKid)}</a>` : `<span class="small muted">${esc(L.kidNo)}</span>`}</div></div></div>
    <section class="card" id="hlWeek"><h3>${esc(L.week(wk.unit, unitTitle(wk.unit, lang)))}</h3>
      ${wk.week_theme ? `<p><b>${esc(L.theme)}:</b> ${esc(wk.week_theme)}</p>` : ''}<p class="small"><span class="chip warn">${esc(L.draft)}</span></p>
      <h4>${esc(L.doAtHome)}</h4>
      <ul class="km-list" id="hlActs">${home.map((a) => `<li class="km-item${a.done ? ' done' : ''}" data-id="${esc(a.id)}">
        <img src="${esc(friendImg(a.friend))}" alt="" class="km-item-img"><div class="km-item-body"><b>${esc(a.title)}</b>
        ${a.steps?.length ? `<details class="small"><summary>${esc(String(a.prompt || '').split(':')[0])}</summary><ol>${a.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></details>` : ''}
        ${a.done ? `<span class="chip ok">${esc(L.done)}</span>` : ''}</div>
        <div class="hl-item-actions">${a.done ? '' : `<button class="btn soft small" type="button" data-mark="${esc(a.id)}">${esc(L.weDid)}</button>`}
        ${consent ? `<button class="btn link small" type="button" data-proof="${esc(a.id)}">${esc(L.addProof)}</button>` : ''}</div></li>`).join('')}</ul>
      <form class="km-noteform" id="hlMarkForm" hidden novalidate><label class="f"><span>${esc(L.note)}</span><textarea class="i" id="hlMarkNote" rows="2" maxlength="500"></textarea></label>
        <p class="small msg" id="hlMarkMsg" role="status"></p><div class="cta-row"><button class="btn navy small" type="submit">${esc(L.save)}</button></div></form></section>
    <div class="grid two">
      <section class="card" id="hlTime"><h3>${esc(L.time)}</h3><p id="hlTimeLine">${esc(L.timeLine(minutes(tl.home_sec), minutes(tl.center_sec)))}</p><p class="small muted">${esc(L.timeHint)}</p></section>
      <section class="card" id="hlShare"><h3>${esc(L.share)}</h3>
        ${consent ? `<p class="small muted">${esc(L.shareIntro)}</p>
        <form id="hlShareForm" novalidate>
          <label class="f"><span>${esc(L.pick)}</span><input class="i" type="file" id="hlFile" accept="image/*,video/mp4,video/quicktime,video/webm"></label>
          <label class="f"><span>${esc(L.which)}</span><select class="i" id="hlAct"><option value="">${esc(L.none)}</option>${home.map((a) => `<option value="${esc(a.id)}">${esc(a.title)}</option>`).join('')}</select></label>
          <label class="f"><span>${esc(L.caption)}</span><input class="i" type="text" id="hlCaption" maxlength="300"></label>
          <p class="small muted">${esc(L.photoNote)}</p><p class="small msg" id="hlShareMsg" role="status"></p>
          <div class="cta-row"><button class="btn navy" type="submit" id="hlSend">${esc(L.send)}</button></div></form>`
        : `<p class="small muted" id="hlConsent">${esc(L.consentNeeded)} <a href="/c/${slug}/privacy" data-nav>${esc(L.privacy)}</a></p>`}</section>
    </div>
    <section class="card" id="hlShared"><h3>${esc(L.shared)}</h3>${(up.uploads || []).length ? `<ul class="hl-uploads">${up.uploads.map((u) => `<li class="hl-upload" data-id="${esc(u.id)}">
        ${mediaHtml(esc, u)}<div class="hl-upload-body">${u.activity_title ? `<b>${esc(u.activity_title)}</b>` : ''}${u.caption ? `<p class="small">“${esc(u.caption)}”</p>` : ''}
        <p class="small muted">${esc(String(u.created_at).slice(0, 10))}${u.in_portfolio ? ` · <span class="chip ok">${esc(L.inPortfolio)}</span>` : ''}</p>
        ${commentsHtml(esc, u.comments, L)}${u.mine ? `<button class="btn link small" type="button" data-del="${esc(u.id)}" data-path="${esc(u.path)}">${esc(L.del)}</button>` : ''}</div></li>`).join('')}</ul>`
      : `<p class="muted">${esc(L.nothing)}</p>`}</section>
    <section class="card" id="hlPortfolio"><h3>${esc(L.portfolio)}</h3>
      ${(pf.uploads || []).length ? `<ul class="hl-uploads">${pf.uploads.map((u) => `<li class="hl-upload">${mediaHtml(esc, u)}<div class="hl-upload-body">${u.activity_title ? `<b>${esc(u.activity_title)}</b>` : ''}${u.caption ? `<p class="small">“${esc(u.caption)}”</p>` : ''}${commentsHtml(esc, u.comments, L)}</div></li>`).join('')}</ul>` : ''}
      ${pf.items.length ? `<ol class="km-timeline">${pf.items.map((it) => `<li class="km-entry"><img src="${esc(friendImg(it.friend))}" alt="" class="km-item-img"><div><b>${esc(it.title)}</b>
        <div class="small muted">${esc(it.done_on)} · ${esc(byLabel(it))}</div>${it.family_note ? `<p class="small">“${esc(it.family_note)}”</p>` : ''}
        ${it.staff_note ? `<p class="small"><b>${esc(L.teacherNote)}:</b> ${esc(it.staff_note)}</p>` : ''}</div></li>`).join('')}</ol>`
        : (pf.uploads || []).length ? '' : `<p class="muted">${esc(L.empty)}</p>`}</section></div>`), L.title);
  signMedia(client, document.getElementById('homeLearning'));
  focusUpload(want && !kids.some((k) => k.kid === want), lang);
  const again = () => viewFamily(ctx);

  // "We did it" (+ note)
  let marking = null;
  const form = document.getElementById('hlMarkForm');
  document.getElementById('hlActs').addEventListener('click', (e) => {
    const m = e.target.closest('button[data-mark]');
    if (m) { marking = m.dataset.mark; form.hidden = false; m.closest('li').after(form); document.getElementById('hlMarkNote').focus(); return; }
    const p = e.target.closest('button[data-proof]');
    if (p) { document.getElementById('hlAct').value = p.dataset.proof; document.getElementById('hlFile').focus(); document.getElementById('hlShare').scrollIntoView({ block: 'center' }); }
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try { await rpc('kid_work_mark', { p_center: c.center_id, p_kid: cur.kid, p_activity: marking, p_note: document.getElementById('hlMarkNote').value }); live(L.done); again(); }
    catch (err) { const m = document.getElementById('hlMarkMsg'); m.className = 'small msg bad'; m.textContent = friendly(err); }
  });

  // Share from home
  const sf = document.getElementById('hlShareForm');
  if (sf) sf.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('hlShareMsg'), btn = document.getElementById('hlSend');
    const file = document.getElementById('hlFile').files[0];
    if (!file) { msg.className = 'small msg bad'; msg.textContent = L.err.type; return; }
    btn.disabled = true; msg.className = 'small msg info'; msg.textContent = L.sending;
    try {
      await shareFile(ctx, { center: c.center_id, kid: cur.kid, file, activity: document.getElementById('hlAct').value, caption: document.getElementById('hlCaption').value });
      live(L.sent); again();
    } catch (err) { btn.disabled = false; msg.className = 'small msg bad'; msg.textContent = err.why ? L.err[err.why] : friendly(err); }
  });

  // Delete one of mine: the file first (storage policy), then the row
  document.getElementById('hlShared').addEventListener('click', async (e) => {
    const b = e.target.closest('button[data-del]'); if (!b) return;
    if (!window.confirm(L.delAsk)) return;
    try {
      const r = await client().storage.from(BUCKET).remove([b.dataset.path]); if (r.error) throw r.error;
      await rpc('family_upload_delete', { p_id: b.dataset.del }); again();
    } catch (err) { live(friendly(err)); }
  });
}

// ---- staff ---------------------------------------------------------------------------------------------------------------------
async function viewStaff(ctx) {
  const { c, shell, page, rpc, esc, friendly, client, live } = ctx;
  page(shell('<p class="loading">Opening family uploads…</p>'), 'Home learning', { english: true });
  const rooms = ((await client().from('rooms').select('id, data').eq('center_id', c.center_id).order('id')).data || []);
  const want = new URLSearchParams(location.search).get('room');
  const room = rooms.find((r) => r.id === want)?.id || rooms[0]?.id;
  let list = [], err = null;
  if (room) { try { list = await rpc('family_uploads_room', { p_center: c.center_id, p_room: room, p_days: 30 }); } catch (e) { err = friendly(e); } }
  const director = c.role === 'director';
  let minAge = 36;
  if (director) {
    const st = await client().from('kid_mode_settings').select('kid_mode_min_age_months').eq('center_id', c.center_id).maybeSingle();
    if (st.data) minAge = st.data.kid_mode_min_age_months;
  }
  const card = (u) => `<li class="hl-upload" data-id="${esc(u.id)}">${mediaHtml(esc, u)}<div class="hl-upload-body">
      <b>${esc(u.child || '')}</b>${u.activity_title ? ` · ${esc(u.activity_title)}` : ''}${u.caption ? `<p class="small">“${esc(u.caption)}”</p>` : ''}
      <p class="small muted">${esc(String(u.created_at).slice(0, 10))}</p>${commentsHtml(esc, u.comments, HW.en)}
      <div class="hl-reacts" role="group" aria-label="React">${REACTIONS.map((r) => `<button class="btn soft small" type="button" data-react="${r}" aria-label="${r}">${REACTION_ICON[r]}</button>`).join('')}</div>
      <form class="hl-comment" data-comment="${esc(u.id)}" novalidate><label class="f"><span class="small">Comment for the family</span><input class="i" type="text" maxlength="500" name="body"></label>
        <button class="btn navy small" type="submit">Send</button></form>
      <label class="choice small"><input type="checkbox" data-portfolio="${esc(u.id)}"${u.in_portfolio ? ' checked' : ''}> <span>In ${esc(u.child || 'the child')}'s portfolio</span></label>
      <p class="small msg" role="status"></p></div></li>`;
  page(shell(`<div class="hl" id="staffUploads">
    <div class="card"><h2>Home learning: family uploads</h2><p class="muted">Photos and short videos families shared of learning at home, for the children of your room. React or comment (the family is told), and add the best ones to the child's portfolio. Families see your comments; keep them about what the child did.</p>
      ${rooms.length > 1 ? `<nav class="tabs" aria-label="Rooms">${rooms.map((r) => `<a href="/c/${esc(c.slug)}/learn?room=${encodeURIComponent(r.id)}" data-nav${r.id === room ? ' aria-current="page"' : ''}>${esc(r.data?.name || r.id)}</a>`).join('')}</nav>` : ''}</div>
    <section class="card" id="uploadList">${err ? `<p class="msg bad" role="alert">${esc(err)}</p>` : list.length ? `<ul class="hl-uploads">${list.map(card).join('')}</ul>` : '<p class="muted">No family uploads in the last 30 days.</p>'}</section>
    ${director ? `<section class="card" id="minAgeCard"><h3>Kid Mode age</h3><p class="small muted">Kid Mode opens for children at least this old. Default 3 years (no screens through age 2). There is no weekly time limit (owner decision 2026-10-10).</p>
      <label class="f"><span>Opens at</span><select class="i" id="minAge">${[24, 30, 36, 42, 48].map((m) => `<option value="${m}"${m === minAge ? ' selected' : ''}>${m % 12 ? `${m} months` : `${m / 12} years`}</option>`).join('')}</select></label>
      <p class="small msg" id="minAgeMsg" role="status"></p></section>` : ''}</div>`), 'Home learning', { english: true });
  signMedia(client, document.getElementById('staffUploads'));
  focusUpload(want && !rooms.some((r) => r.id === want), 'en');
  const host = document.getElementById('uploadList');
  const say = (li, t, ok) => { const m = li.querySelector('.msg'); m.className = `small msg ${ok ? 'ok' : 'bad'}`; m.textContent = t; };
  host.addEventListener('click', async (e) => {
    const b = e.target.closest('button[data-react]'); if (!b) return;
    const li = b.closest('li');
    try { await rpc('family_upload_comment', { p_id: li.dataset.id, p_body: null, p_reaction: b.dataset.react }); live('Sent'); viewStaff(ctx); } catch (er) { say(li, friendly(er)); }
  });
  host.addEventListener('submit', async (e) => {
    const f = e.target.closest('form[data-comment]'); if (!f) return;
    e.preventDefault();
    const li = f.closest('li');
    try { await rpc('family_upload_comment', { p_id: f.dataset.comment, p_body: f.elements.body.value, p_reaction: null }); live('Sent'); viewStaff(ctx); } catch (er) { say(li, friendly(er)); }
  });
  host.addEventListener('change', async (e) => {
    const cb = e.target.closest('input[data-portfolio]'); if (!cb) return;
    const li = cb.closest('li');
    try { await rpc('family_upload_portfolio', { p_id: cb.dataset.portfolio, p_on: cb.checked }); say(li, cb.checked ? 'Added to the portfolio' : 'Taken out of the portfolio', true); }
    catch (er) { cb.checked = !cb.checked; say(li, friendly(er)); }
  });
  const sel = document.getElementById('minAge');
  if (sel) sel.addEventListener('change', async () => {
    const m = document.getElementById('minAgeMsg');
    try { await rpc('kid_mode_set_min_age', { p_center: c.center_id, p_months: Number(sel.value) }); m.className = 'small msg ok'; m.textContent = 'Saved'; }
    catch (er) { m.className = 'small msg bad'; m.textContent = friendly(er); }
  });
}
