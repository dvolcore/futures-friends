// Today's video (hub/KID_VIDEOS.md, migration 20261026300000_kid_videos.sql): premade, reviewed, PARENT-APPROVED video messages from
// the Futures Friends to one child about their day.
//
//   Kid Mode home      a big tile "You have a video from Bop!" (registerKidModeHomeTile): plays with sound and captions inside the Kid
//                      Mode session (no screen-time cap applies to these videos: owner decision 2026-10-10), or a calm "Video coming
//                      soon" card while the clip is still a placeholder.
//   /c/<slug>/videos   family: per child, what waits for approval (approve / decline), what was sent (preview with captions), and
//                      pre-approvals per occasion. Staff: "Send today's video" to children of their rooms (a chosen clip, or the pick
//                      rule: what the child did today, else a daily wrap by their guide), the library, the upload form (a video and its
//                      REQUIRED caption file), and HQ's review queue for reviewers of record.
// Files live in the private `kid-videos` bucket; the page asks for short-lived signed URLs (the database decides who may sign which file).
// Plain ES module, no build step; the strict CSP forbids inline styles and inline code.
import { createSignedUrlCache, pickVideo, renditionPaths } from './signed-url-cache.js';   // N9 media delivery (docs/ops/MEDIA_DELIVERY.md)
import { uiLang } from './i18n.js';
import { registerKidModeHomeTile, guideFace } from './kid-mode.js';
import { cssValue, deepFocus, deepMiss } from './deeplink.js';

const BUCKET = 'kid-videos';
const SIGN_SEC = 900;
export const NAMES = { booker: 'Booker', lumi: 'Lumi', zuri: 'Zuri', bop: 'Bop', nico: 'Nico', tilly: 'Tilly', poppy: 'Poppy', mimi: 'Mimi',
  tad: 'Tad', rory: 'Rory', nova: 'Nova', teo: 'Teo' };
export const OCCASIONS = ['daily_wrap', 'praise', 'try_again_tomorrow', 'birthday', 'holiday'];
const htmlEsc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const WORDS = {
  en: {
    fromFriend: (n) => `You have a video from ${n}!`, comingSoon: (n) => `A video from ${n} is coming soon`, tapToWatch: 'Tap to watch',
    allDone: 'All done!', back: 'Back',
    occ: { daily_wrap: 'Daily wrap', praise: 'Great job', try_again_tomorrow: 'Try again tomorrow', birthday: 'Birthday', holiday: 'Holiday' },
    title: 'Videos from the friends', intro: 'Short videos from the Futures Friends about your child\'s day. Nothing plays for your child until you approve it (or you pre-approve a kind of video below).',
    waiting: 'Waiting for you', approve: 'Approve', decline: 'Decline', sent: 'Sent to your child', none: 'Nothing here yet.',
    ready: 'Ready', soon: 'Video coming soon', preview: 'Preview', watchKid: 'Watch in Kid Mode', pre: 'Approve these kinds of videos automatically',
    preHint: 'You can change this any time. A video is still a premade clip checked by two reviewers.', noConsent: 'To receive videos, turn on "Character messages" in Privacy & consent.',
    privacy: 'Privacy & consent', picked: { work_match: 'Picked from what your child did today', birthday: 'For the birthday', daily_wrap_guide: 'A daily wrap from your child\'s friend',
      daily_wrap_any: 'A daily wrap', teacher_choice: 'Chosen by the teacher' }, saved: 'Saved.', captionsOn: 'Captions are on.', draftEs: '',
  },
  es: {
    fromFriend: (n) => `¡Tienes un video de ${n}!`, comingSoon: (n) => `Pronto llega un video de ${n}`, tapToWatch: 'Toca para verlo',
    allDone: '¡Listo!', back: 'Atrás',
    occ: { daily_wrap: 'Resumen del día', praise: '¡Buen trabajo!', try_again_tomorrow: 'Mañana otra vez', birthday: 'Cumpleaños', holiday: 'Día festivo' },
    title: 'Videos de los amigos', intro: 'Videos cortos de los Futures Friends sobre el día de su hijo o hija. Nada se muestra a su hijo o hija hasta que usted lo apruebe (o apruebe por adelantado un tipo de video abajo).',
    waiting: 'Esperando su respuesta', approve: 'Aprobar', decline: 'Rechazar', sent: 'Enviados a su hijo o hija', none: 'Nada todavía.',
    ready: 'Listo', soon: 'Video muy pronto', preview: 'Ver', watchKid: 'Ver en Modo Niños', pre: 'Aprobar automáticamente estos tipos de video',
    preHint: 'Puede cambiarlo cuando quiera. Cada video es un clip ya hecho y revisado por dos personas.', noConsent: 'Para recibir videos, active "Mensajes de los personajes" en Privacidad y consentimiento.',
    privacy: 'Privacidad y consentimiento', picked: { work_match: 'Elegido por lo que su hijo o hija hizo hoy', birthday: 'Por el cumpleaños', daily_wrap_guide: 'Un resumen del día de su amigo',
      daily_wrap_any: 'Un resumen del día', teacher_choice: 'Elegido por la maestra o el maestro' }, saved: 'Guardado.', captionsOn: 'Subtítulos activados.',
    draftEs: 'Español en borrador (pendiente de revisión).',
  },
};
const Wd = (lang) => WORDS[lang === 'es' ? 'es' : 'en'];
export const titleOf = (v, lang) => (lang === 'es' && v.title_es ? v.title_es : v.title_en);
export const nameOf = (f) => NAMES[f] || 'Bop';

// Short-lived signed URLs for a clip's files (null for a missing one). Storage asks kid_video_object_ok() whether the caller may.
// N9: cached until shortly before they expire (one Storage request for every missing file), and the clip's smaller renditions are
// asked for too (a rendition the worker has not made is simply absent).
const urlCache = createSignedUrlCache({ ttlSec: SIGN_SEC, marginSec: 120 });
export async function signFiles(client, paths) {
  const video = paths[0];
  return urlCache.sign(client, BUCKET, [...paths, ...(typeof video === 'string' && /\.(mp4|webm)$/i.test(video) ? renditionPaths(video) : [])]);
}
const connection = () => {
  const c = (typeof navigator !== 'undefined' && navigator.connection) || {};
  return { saveData: !!c.saveData, effectiveType: c.effectiveType || '4g', screenWidth: typeof screen !== 'undefined' ? screen.width : 1280 };
};

// The player: the video with its captions track on by default (sound on, captions for every child and grown-up).
export function playerHtml(play, urls, { lang = 'en', esc = htmlEsc } = {}) {
  if (!urls[play.video_path]) return '';
  const pick = pickVideo(play.video_path, urls, connection());
  const v = urls[pick.path];
  const cap = urls[play.captions_path];
  const poster = play.poster_path ? urls[play.poster_path] : null;
  return `<video class="kv-video" controls playsinline preload="metadata" crossorigin="anonymous"${poster ? ` poster="${esc(poster)}"` : ''} aria-label="${esc(titleOf(play, lang))}">
    <source src="${esc(v)}" type="${esc(pick.type || play.video_mime || 'video/mp4')}">
    ${cap ? `<track kind="captions" src="${esc(cap)}" srclang="${esc(play.lang || 'en')}" label="${play.lang === 'es' ? 'Español' : 'English'}" default>` : ''}
  </video>`;
}
// Make sure the captions track shows (some browsers ignore `default` on a late-added track).
export function captionsOn(video) {
  try { for (const t of video.textTracks || []) t.mode = 'showing'; } catch (_) { /* no text tracks */ }
}

// ===========================================================================================================================
// Kid Mode home tile
// ===========================================================================================================================
async function kidModeTile(el, api) {
  const { ctx, session, lang, back, touch, ended } = api;
  const esc = ctx.esc || htmlEsc;
  const w = Wd(lang);
  const data = await ctx.rpc('kid_video_kid_mode', { p_session: session });
  const list = (data && data.videos) || [];
  if (!list.length) return;
  const v = list.find((x) => x.state === 'ready') || list[0];
  const name = nameOf(v.friend);
  if (v.state !== 'ready') {
    el.innerHTML = `<div class="kv-tile kv-soon" id="kvTile" aria-disabled="true"><span class="kv-face">${guideFace(esc, v.friend)}</span>
      <span class="kv-tile-t">${esc(w.comingSoon(name))}</span><span class="kv-tile-s">${esc(titleOf(v, lang))}</span></div>`;
    return;
  }
  el.innerHTML = `<button type="button" class="kv-tile kv-ready" id="kvTile" data-delivery="${esc(v.delivery_id)}"><span class="kv-face">${guideFace(esc, v.friend)}</span>
    <span class="kv-tile-t">${esc(w.fromFriend(name))}</span><span class="kv-tile-s">${esc(titleOf(v, lang))}</span><span class="kv-play" aria-hidden="true">▶</span>
    <span class="sr-only">${esc(w.tapToWatch)}</span></button>`;
  el.querySelector('#kvTile').addEventListener('click', async () => {
    let play;
    try { play = await ctx.rpc('kid_video_play', { p_delivery: v.delivery_id, p_context: 'kid_mode', p_session: session }); } catch (err) {
      if (/ended/.test(String(err.message))) return ended('cap');
      el.innerHTML = `<p class="km-note" role="alert">${esc(ctx.friendly ? ctx.friendly(err) : err.message)}</p>`; return;
    }
    const urls = await signFiles(ctx.client(), [play.video_path, play.captions_path, play.poster_path]);
    el.innerHTML = `<div class="kv-stage" id="kvStage" role="region" aria-label="${esc(w.fromFriend(name))}">
      <p class="kv-from">${esc(w.fromFriend(name))}</p>${playerHtml(play, urls, { lang, esc })}
      <div class="kv-row"><button type="button" class="km-btn" id="kvBack">${esc(w.back)}</button></div></div>`;
    const video = el.querySelector('video');
    document.getElementById('kmTiles')?.setAttribute('hidden', '');
    el.scrollIntoView({ block: 'start' });
    if (video) {
      captionsOn(video);
      let last = 0;
      // a playing clip is not "idle": keep Kid Mode's idle timer fed
      video.addEventListener('timeupdate', () => { if (Date.now() - last > 20000) { last = Date.now(); touch(); } });
      video.addEventListener('ended', () => { const p = document.createElement('p'); p.className = 'kv-done'; p.textContent = w.allDone; el.querySelector('.kv-row').before(p); });
    }
    el.querySelector('#kvBack').addEventListener('click', () => { try { video?.pause(); } catch (_) { /* gone */ } back(); });
  });
}
registerKidModeHomeTile(kidModeTile);

// ===========================================================================================================================
// /c/<slug>/videos
// ===========================================================================================================================
export function mountKidVideos(h) {
  const { esc, rpc, page, live, friendly, client } = h;
  const say = (el, text, cls = 'ok') => { if (!el) return; el.className = `msg ${cls}`; el.textContent = text; live(text); };
  const day = (d, lang) => { try { return new Date(`${String(d).slice(0, 10)}T12:00:00`).toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' }); } catch (_) { return d; } };
  const stateChip = (v, w) => (v.state === 'ready' ? `<span class="chip ok">${esc(w.ready)}</span>` : `<span class="chip gold">${esc(w.soon)}</span>`);
  const art = (f) => `<span class="kv-mini">${guideFace(esc, f)}</span>`;

  async function viewVideos(c, shell, { family, lang }) {
    if (family) return viewFamily(c, shell, lang);
    return viewStaff(c, shell);
  }

  // ---- a grown-up's preview: plays in place (records a 'family_preview' play, not Kid Mode minutes) ----
  async function preview(box, deliveryId, context, lang) {
    const play = await rpc('kid_video_play', { p_delivery: deliveryId, p_context: context });
    const urls = await signFiles(client(), [play.video_path, play.captions_path, play.poster_path]);
    box.hidden = false;
    box.innerHTML = playerHtml(play, urls, { lang, esc });
    const v = box.querySelector('video'); if (v) captionsOn(v);
  }

  // ---------------------------------------------------------------------------------------------------------------------------
  async function viewFamily(c, shell, lang) {
    const w = Wd(lang);
    const kids = await rpc('kid_video_family_view', { p_center: c.center_id });
    const card = (v, pending) => `<li class="kv-item" data-delivery="${esc(v.delivery_id)}">${art(v.friend)}
      <div class="kv-item-b"><b>${esc(titleOf(v, lang))}</b> ${stateChip(v, w)} <span class="chip">${esc(w.occ[v.occasion] || v.occasion)}</span>
        <p class="small muted">${esc(nameOf(v.friend))} · ${esc(day(v.for_date, lang))}${v.rule && w.picked[v.rule] ? ` · ${esc(w.picked[v.rule])}` : ''}${v.note ? ` · “${esc(v.note)}”` : ''}</p>
        ${pending ? `<div class="kv-row"><button type="button" class="btn center small" data-decide="yes">${esc(w.approve)}</button>
          <button type="button" class="btn soft small" data-decide="no">${esc(w.decline)}</button></div>`
          : (v.state === 'ready' ? `<div class="kv-row"><button type="button" class="btn soft small" data-preview="1">${esc(w.preview)}</button>
          <a class="btn gold small" href="/c/${esc(c.slug)}/kid" data-nav>${esc(w.watchKid)}</a></div><div class="kv-prev" hidden></div>` : '')}
        <p class="msg" role="status"></p></div></li>`;
    page(shell(`<div class="card kv-head"><h2>${esc(w.title)}</h2><p class="muted">${esc(w.intro)}</p></div>
      ${kids.length ? kids.map((k) => `<section class="card kv-kid" data-kid="${esc(k.kid)}" aria-labelledby="kvk-${esc(k.kid)}">
        <h2 id="kvk-${esc(k.kid)}">${esc(k.first_name)}</h2>
        ${k.consent ? '' : `<p class="msg info">${esc(w.noConsent)} <a href="/c/${esc(c.slug)}/privacy" data-nav>${esc(w.privacy)}</a></p>`}
        <h3>${esc(w.waiting)} ${k.pending.length ? `<span class="chip warn">${k.pending.length}</span>` : ''}</h3>
        ${k.pending.length ? `<ul class="kv-list">${k.pending.map((v) => card(v, true)).join('')}</ul>` : `<p class="small muted">${esc(w.none)}</p>`}
        <h3>${esc(w.sent)}</h3>
        ${k.videos.length ? `<ul class="kv-list">${k.videos.map((v) => card(v, false)).join('')}</ul>` : `<p class="small muted">${esc(w.none)}</p>`}
        <fieldset class="f kv-pre"><legend>${esc(w.pre)} <span class="hint">${esc(w.preHint)}</span></legend>
          <div class="kv-pre-opts">${OCCASIONS.map((o) => `<label class="choice"><input type="checkbox" data-occasion="${o}"${k.preapprovals.some((p) => p.scope === 'occasion' && p.occasion === o) ? ' checked' : ''}> <span>${esc(w.occ[o])}</span></label>`).join('')}</div>
          <p class="msg" role="status"></p></fieldset></section>`).join('') : `<div class="card"><p class="muted">${esc(w.none)}</p></div>`}`), w.title);
    // ?d=<delivery> (a notification): that video, with its OK / No buttons; &play=1 (ready): its player opened in place
    const qs = new URLSearchParams(location.search), wantD = qs.get('d');
    if (wantD) {
      const li = document.querySelector(`.kv-item[data-delivery="${cssValue(wantD)}"]`);
      if (!li) deepMiss('video', lang);
      else {
        deepFocus(li);
        if (qs.get('play') === '1' && li.querySelector('[data-preview]')) {
          preview(li.querySelector('.kv-prev'), wantD, 'family_preview', lang).then(() => deepFocus(li))
            .catch((err) => say(li.querySelector('.msg'), friendly(err), 'bad'));
        }
      }
    }
    for (const sec of document.querySelectorAll('.kv-kid')) {
      const k = kids.find((x) => x.kid === sec.dataset.kid);
      sec.addEventListener('click', async (e) => {
        const li = e.target.closest('.kv-item'); if (!li) return;
        const msg = li.querySelector('.msg');
        const b = e.target.closest('[data-decide]');
        if (b) {
          try { await rpc('kid_video_decide', { p_delivery: li.dataset.delivery, p_approve: b.dataset.decide === 'yes' }); live(w.saved); await viewFamily(c, shell, lang); }
          catch (err) { say(msg, friendly(err), 'bad'); }
          return;
        }
        if (e.target.closest('[data-preview]')) {
          try { await preview(li.querySelector('.kv-prev'), li.dataset.delivery, 'family_preview', lang); } catch (err) { say(msg, friendly(err), 'bad'); }
        }
      });
      sec.querySelector('.kv-pre').addEventListener('change', async (e) => {
        const box = e.target.closest('[data-occasion]'); if (!box) return;
        const msg = sec.querySelector('.kv-pre .msg');
        try {
          if (box.checked) await rpc('kid_video_preapprove', { p_center: c.center_id, p_kid: k.kid, p_scope: 'occasion', p_occasion: box.dataset.occasion });
          else for (const p of k.preapprovals.filter((x) => x.scope === 'occasion' && x.occasion === box.dataset.occasion)) await rpc('kid_video_preapproval_revoke', { p_id: p.id });
          const fresh = await rpc('kid_video_family_view', { p_center: c.center_id });
          k.preapprovals = (fresh.find((x) => x.kid === k.kid) || {}).preapprovals || [];
          say(msg, w.saved);
        } catch (err) { box.checked = !box.checked; say(msg, friendly(err), 'bad'); }
      });
    }
  }

  // ---------------------------------------------------------------------------------------------------------------------------
  const SKIP = { no_consent: 'no parent consent for character clips yet', not_your_room: 'not in your rooms', no_matching_video: 'no matching video',
    no_such_child: 'not found' };
  async function viewStaff(c, shell) {
    const sl = uiLang();   // the staff member's own language (their screens only)
    const w = Wd(sl);
    const v = await rpc('kid_video_staff_view', { p_center: c.center_id, p_date: null });
    const lib = v.library || [];
    const sendable = lib.filter((a) => a.sendable);
    const status = (d) => (d.status === 'approved' ? (d.deliverable ? `<span class="chip ok">approved${d.via === 'preapproval' ? ' (pre-approved)' : ''}</span>` : '<span class="chip">approved</span>')
      : d.status === 'pending' ? '<span class="chip warn">waiting for parent</span>' : `<span class="chip">${esc(d.status)}</span>`);
    let queue = null;
    try { queue = await rpc('kid_video_review_queue'); } catch (_) { /* not a reviewer */ }
    page(shell(`<div class="card kv-head"><h2>Today's video</h2>
      <p class="muted">Send a short, premade video from a friend to a child about their day. A parent approves it before it plays (or has pre-approved that kind of video).
      Leave "Pick for each child" to match what each child did today (Kid Mode &amp; work), else a daily wrap from their guide.</p></div>
      <form class="card kv-send" id="kvSend" novalidate><h2>Send today's video · ${esc(day(v.date, sl))}</h2>
        <ul class="kv-kids" id="kvKids">${v.children.map((k) => `<li><label class="choice"><input type="checkbox" name="kid" value="${esc(k.kid)}"${k.consent ? '' : ' disabled'}>
          <span><b>${esc(k.first_name)}</b> <span class="small muted">${esc(k.room || '')}</span>${k.consent ? '' : ' <span class="chip">no consent</span>'}</span></label>
          <span class="kv-today">${k.deliveries.map((d) => `<span class="kv-d" data-id="${esc(d.id)}">${esc(titleOf(d, sl))} ${status(d)}${d.state === 'ready' ? '' : ' <span class="chip gold">coming soon</span>'}${d.status === 'pending' && d.mine ? ' <button type="button" class="btn soft small" data-withdraw="1">Withdraw</button>' : ''}</span>`).join('')}</span></li>`).join('') || '<li class="muted">No children in your rooms.</li>'}</ul>
        <div class="cta-row"><button type="button" class="btn soft small" id="kvAll">Select all</button></div>
        <label class="f"><span>Video</span><select id="kvAsset"><option value="">Pick for each child (from today's work)</option>
          ${sendable.map((a) => `<option value="${esc(a.asset_id)}">${esc(nameOf(a.friend))}: ${esc(titleOf(a, sl))} (${esc(w.occ[a.occasion])}${a.state === 'ready' ? '' : ', coming soon'}${a.lang === 'es' ? ', Spanish' : ''})</option>`).join('')}</select></label>
        <label class="f"><span>Note for the parent <span class="hint">optional, kind words only</span></span><input id="kvNote" maxlength="200"></label>
        <button class="btn gold" type="submit" id="kvGo">Send today's video</button><p class="msg" id="kvMsg" role="status"></p><ul class="list small" id="kvResult"></ul></form>
      <section class="card"><h2>Video library</h2><p class="small muted">"Coming soon" videos are placeholders: the flow works now; the real clips are added later and reviewed by two people before any child sees them.</p>
        <ul class="kv-list">${lib.map((a) => `<li class="kv-item" data-asset="${esc(a.asset_id)}">${art(a.friend)}<div class="kv-item-b"><b>${esc(titleOf(a, sl))}</b> ${stateChip(a, w)}
          <span class="chip">${esc(w.occ[a.occasion])}</span>${a.lang === 'es' ? ' <span class="chip">ES</span>' : ''}${a.center_upload ? ` <span class="chip">${esc(a.status)}${a.has_file ? ` · check: ${esc(a.validation)}` : ''}</span>` : ''}
          <p class="small muted">${esc(nameOf(a.friend))}${a.skills.length ? ` · ${esc(a.skills.join(', '))}` : ''}${a.duration_sec ? ` · ${a.duration_sec}s` : ''}</p></div></li>`).join('')}</ul></section>
      <form class="card kv-up" id="kvUp" novalidate><h2>Upload a video</h2>
        <p class="small muted">MP4 or WebM, under 200 MB, with a caption file (WebVTT, .vtt): captions are required. It is checked, then reviewed by a child-development reviewer and approved by a second person before any child sees it.</p>
        <div class="grid two"><label class="f"><span>Friend</span><select name="friend">${Object.entries(NAMES).map(([k, n]) => `<option value="${k}">${esc(n)}</option>`).join('')}</select></label>
          <label class="f"><span>Occasion</span><select name="occasion">${OCCASIONS.map((o) => `<option value="${o}">${esc(w.occ[o])}</option>`).join('')}</select></label>
          <label class="f"><span>Language</span><select name="lang"><option value="en">English</option><option value="es">Spanish</option></select></label>
          <label class="f"><span>Skills <span class="hint">comma separated: lang, cog, pmp, se, ss, atl, arts or words</span></span><input name="skills" maxlength="200"></label>
          <label class="f"><span>Title (English)</span><input name="title_en" required maxlength="120"></label>
          <label class="f"><span>Title (Spanish) <span class="hint">optional</span></span><input name="title_es" maxlength="120"></label></div>
        <label class="f"><span>What the friend says <span class="hint">for the reviewers</span></span><textarea name="script_en" maxlength="800" rows="3"></textarea></label>
        <div class="grid two"><label class="f"><span>Video file</span><input type="file" name="video" accept="video/mp4,video/webm" required></label>
          <label class="f"><span>Captions (.vtt)</span><input type="file" name="captions" accept=".vtt,text/vtt" required></label></div>
        <button class="btn navy" type="submit" id="kvUpGo">Upload</button><p class="msg" id="kvUpMsg" role="status"></p></form>
      ${queue ? `<section class="card" id="kvQueue"><h2>Review queue (HQ)</h2>${queue.length ? `<ul class="kv-list">${queue.map((a) => `<li class="kv-item" data-asset="${esc(a.asset_id)}">${art(a.friend)}
        <div class="kv-item-b"><b>${esc(a.title_en)}</b> <span class="chip">${esc(a.status)}</span> <span class="chip">check: ${esc(a.validation)}</span>
          ${a.script_en ? `<p class="small">${esc(a.script_en)}</p>` : ''}<div class="kv-row"><button type="button" class="btn soft small" data-qprev="1">Preview</button>
          ${a.status === 'draft' ? '<button type="button" class="btn center small" data-review="reviewed">Mark reviewed</button>' : '<button type="button" class="btn center small" data-approve="1">Approve</button>'}</div>
          <div class="kv-prev" hidden></div><p class="msg" role="status"></p></div></li>`).join('')}</ul>` : '<p class="muted">Nothing to review.</p>'}</section>` : ''}`), "Today's video", { english: true });

    document.getElementById('kvAll').addEventListener('click', () => { for (const b of document.querySelectorAll('#kvKids input[name=kid]:not(:disabled)')) b.checked = true; });
    document.getElementById('kvKids').addEventListener('click', async (e) => {
      const b = e.target.closest('[data-withdraw]'); if (!b) return;
      try { await rpc('kid_video_withdraw', { p_delivery: b.closest('.kv-d').dataset.id }); await viewStaff(c, shell); live('Withdrawn.'); }
      catch (err) { say(document.getElementById('kvMsg'), friendly(err), 'bad'); }
    });
    document.getElementById('kvSend').addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = document.getElementById('kvMsg');
      const kids = [...document.querySelectorAll('#kvKids input[name=kid]:checked')].map((x) => x.value);
      if (!kids.length) return say(msg, 'Pick at least one child.', 'bad');
      try {
        const r = await rpc('kid_video_send', { p_center: c.center_id, p_kids: kids, p_asset: document.getElementById('kvAsset').value || null, p_date: null,
          p_note: document.getElementById('kvNote').value.trim() || null });
        const name = (k) => (v.children.find((x) => x.kid === k) || {}).first_name || k;
        const sent = r.filter((x) => x.id && !x.duplicate).length;
        say(msg, `${sent} sent${r.length > sent ? `, ${r.length - sent} not sent` : ''}.`);
        document.getElementById('kvResult').innerHTML = r.map((x) => `<li><span class="who"><b>${esc(name(x.kid))}</b></span><span>${x.skipped ? `not sent: ${esc(SKIP[x.skipped] || x.skipped)}`
          : x.duplicate ? 'already sent today' : `${x.status === 'approved' ? 'approved (pre-approved by the parent)' : 'waiting for the parent'}${x.state === 'ready' ? '' : ' · coming soon'}`}</span></li>`).join('');
      } catch (err) { say(msg, friendly(err), 'bad'); }
    });
    document.getElementById('kvUp').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.currentTarget; const msg = document.getElementById('kvUpMsg');
      const video = f.video.files[0]; const captions = f.captions.files[0];
      if (!f.title_en.value.trim()) return say(msg, 'Add a title.', 'bad');
      if (!video || !['video/mp4', 'video/webm'].includes(video.type)) return say(msg, 'Choose an MP4 or WebM video.', 'bad');
      if (video.size > 209715200) return say(msg, 'The video must be under 200 MB.', 'bad');
      if (!captions || !/\.vtt$/i.test(captions.name)) return say(msg, 'Captions are required: choose a .vtt file.', 'bad');
      const btn = document.getElementById('kvUpGo'); btn.disabled = true;
      try {
        say(msg, 'Uploading…', 'info');
        const id = await rpc('kid_video_asset_create', { p_center: c.center_id, p: { friend: f.friend.value, occasion: f.occasion.value, lang: f.lang.value,
          title_en: f.title_en.value.trim(), title_es: f.title_es.value.trim(), script_en: f.script_en.value.trim(),
          skills: f.skills.value.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean) } });
        const ext = video.type === 'video/webm' ? 'webm' : 'mp4';
        const st = client().storage.from(BUCKET);
        const up1 = await st.upload(`${id}/video.${ext}`, video, { contentType: video.type, upsert: false });
        if (up1.error) throw up1.error;
        const up2 = await st.upload(`${id}/captions.vtt`, captions, { contentType: 'text/vtt', upsert: false });
        if (up2.error) throw up2.error;
        await rpc('kid_video_attach', { p_asset: id, p_video_path: `${id}/video.${ext}`, p_captions_path: `${id}/captions.vtt`, p_duration_sec: null });
        say(msg, 'Uploaded. It is checked next, then reviewed by two people before any child sees it.');
        f.reset();
      } catch (err) { say(msg, friendly(err), 'bad'); } finally { btn.disabled = false; }
    });
    document.getElementById('kvQueue')?.addEventListener('click', async (e) => {
      const li = e.target.closest('.kv-item'); if (!li) return;
      const msg = li.querySelector('.msg');
      const a = queue.find((x) => x.asset_id === li.dataset.asset);
      try {
        if (e.target.closest('[data-qprev]')) {
          const urls = await signFiles(client(), [a.video_path, a.captions_path, a.poster_path]);
          const box = li.querySelector('.kv-prev'); box.hidden = false; box.innerHTML = playerHtml({ ...a, video_mime: /webm$/.test(a.video_path || '') ? 'video/webm' : 'video/mp4' }, urls, { esc });
          const vid = box.querySelector('video'); if (vid) captionsOn(vid);
        } else if (e.target.closest('[data-review]')) { await rpc('kid_video_review', { p_asset: a.asset_id, p_decision: 'reviewed', p_comment: null }); await viewStaff(c, shell); }
        else if (e.target.closest('[data-approve]')) { await rpc('kid_video_approve', { p_asset: a.asset_id, p_approve: true, p_comment: null }); await viewStaff(c, shell); }
      } catch (err) { say(msg, friendly(err), 'bad'); }
    });
  }

  return { viewVideos };
}
