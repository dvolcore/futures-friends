// Classroom moments: the screens (hub/MOMENTS.md). Four mount hooks, each self-contained (its own markup, words EN/ES, events):
//
//   mountMomentCapture(el, ctx)    the teacher's tablet: take / record / choose, tag children (no photo consent: shown with the friend
//                                  avatar, cannot be tagged, the reason said), caption, an activity or skill from today's plan, send.
//                                  The upload queue (IndexedDB) survives a Wi-Fi drop and a reload. ctx: { c, client, rpc, lang, room?,
//                                  activities?: [{ key, title, kind? }] (today's Game plan; else the program blocks), live?, onSent? }
//   mountMomentApprovals(el, ctx)  the director: the approval queue and the setting (share right away / approve first). ctx: { c, client, rpc, lang }
//   mountMomentsFeed(el, ctx)      the family: the child's moments (today / week / month), a lightbox with save, a heart and "share with
//                                  family"; opens ?moment=<id> (a notification's deep link). ctx: { c, client, rpc, lang, kid, live? }
//   mountMomentsTile(el, ctx)      the family overview tile: today's count and three thumbnails. ctx: as the feed
// and viewMoments(ctx), the /c/<slug>/moments page (staff: capture + approvals; families are sent to their dashboard's Moments).
//
// No child's face is ever drawn by this file: the roster shows the friend avatars; photos appear only from the database's own rules
// (photo consent, group consent, custody) through short-lived signed links. No inline styles (CSP): classes in moments.css.
import { BUCKET, MAX_VIDEO_BYTES, PHOTO_MAX_EDGE, PHOTO_QUALITY, SHARE_DAYS, SKILLS, THUMB_EDGE, andList, beginArgs, fitSize, groupNotice, isMomentId,
  isNetworkError, kidTag, linkState, mediaKind, memoryStore, mw, queueItem, rangeFor, runQueue, videoMime, videoProblem } from './moments-core.js';
import { createSignedUrlCache, pickVideo, renditionPaths } from './signed-url-cache.js';
import { avatarHtml } from './kid-mode.js';
import { deepFocus, deepNote } from './deeplink.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// an error in the person's language: app.js friendly() maps the database's messages to Spanish (i18n-es-sql.js)
const errText = (ctx, e) => (typeof ctx.friendly === 'function' ? ctx.friendly(e) : String(e?.message || e));
const urls = createSignedUrlCache({ ttlSec: 900, marginSec: 120 });
const ICON = {
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4zM12 10.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z"/>',
  video: '<path d="M4 6h11v12H4zM15 10l5-3v10l-5-3"/>',
  photos: '<path d="M3 6h14v12H3zM7 3h14v12M3 15l4-4 3 3 3-3 4 4"/>',
  heart: '<path d="M12 20.5s-7.5-4.5-9.4-9C1.2 8.1 3.3 4.5 6.8 4.5c2.1 0 3.6 1.2 4.3 2.6h1.8c.7-1.4 2.2-2.6 4.3-2.6 3.5 0 5.6 3.6 4.2 7-1.9 4.5-9.4 9-9.4 9z"/>',
  save: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  share: '<path d="M12 15V4M8 8l4-4 4 4M5 12v8h14v-8"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  prev: '<path d="M15 5l-7 7 7 7"/>', next: '<path d="M9 5l7 7-7 7"/>',
  lock: '<path d="M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4"/>', play: '<path d="M8 5l11 7-11 7z"/>', check: '<path d="M4 12l5 5L20 6"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  people: '<path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 12 0v1M16 3.3a4 4 0 0 1 0 7.4M22 21v-1a6 6 0 0 0-4-5.6"/>',
};
const icon = (k) => `<svg class="mo-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICON[k] || ''}</svg>`;
// header art: ctx.castSrc only (staff v2 passes its ROLE_CHARACTERS grown-up cutout, ff-shell.js adultSrc). Staff screens never show a
// kid friend as the hero (owner rule), so without one there is no art.
const castImg = (src) => !src ? '' : `<img class="mo-cast" src="${esc(src)}" alt="" width="92" height="120" loading="lazy" decoding="async" data-hide-broken>`;
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)));
const fmtDur = (s) => { const n = Math.max(0, Math.round(Number(s) || 0)); return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`; };
const dayLong = (iso, lang) => new Date(`${String(iso).slice(0, 10)}T12:00:00Z`).toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });
const motionOn = () => !(typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) && document.documentElement.dataset.motion !== 'off';

async function sign(client, paths) {
  // ctx.client is app.js's client() getter (a function); a supabase client object works too
  try { return await urls.sign(typeof client === 'function' ? client() : client, BUCKET, paths.filter(Boolean)); } catch { return {}; }
}
// fill every <img data-mo-path> under root with its signed link (one Storage call)
async function paintThumbs(client, root) {
  const imgs = [...root.querySelectorAll('img[data-mo-path]')];
  if (!imgs.length) return;
  const got = await sign(client, imgs.map((i) => i.dataset.moPath));
  for (const im of imgs) {
    const u = got[im.dataset.moPath];
    if (u) { im.src = u; im.closest('.mo-ph')?.classList.add('mo-ready'); } else im.closest('.mo-ph')?.classList.add('mo-nofile');
  }
}

// ==================================================================================================================================
// The upload queue on this tablet (IndexedDB: files are Blobs; private mode or no IndexedDB: memory only, still works while open)
// ==================================================================================================================================
function idbStore(owner) {
  if (typeof indexedDB === 'undefined') return memoryStore();
  let dbp = null;
  const db = () => (dbp ||= new Promise((res, rej) => {
    const r = indexedDB.open('ff-moments', 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('queue')) r.result.createObjectStore('queue', { keyPath: 'id' }); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  }));
  const tx = async (mode, fn) => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction('queue', mode); const s = t.objectStore('queue'); const out = fn(s); t.oncomplete = () => res(out?.result ?? out); t.onerror = () => rej(t.error); }); };
  const mem = memoryStore();
  let broken = false;
  const safe = async (a, b) => { if (broken) return b(); try { return await a(); } catch { broken = true; return b(); } };
  return {
    get: (id) => safe(() => tx('readonly', (s) => s.get(id)).then((v) => v ?? null), () => mem.get(id)),
    put: (it) => safe(() => tx('readwrite', (s) => { s.put({ ...it, owner }); }), () => mem.put(it)),
    del: (id) => safe(() => tx('readwrite', (s) => { s.delete(id); }), () => mem.del(id)),
    all: () => safe(() => tx('readonly', (s) => s.getAll()).then((v) => (v || []).filter((x) => x.owner === owner)), () => mem.all()),
  };
}

// ==================================================================================================================================
// Photo and video preparation (on the tablet, before anything leaves it)
// ==================================================================================================================================
async function decodeImage(file) {
  if (typeof createImageBitmap === 'function') { try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { /* fall back */ } }
  const data = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => rej(fr.error); fr.readAsDataURL(file); });
  return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('image')); im.src = data; });
}
const toJpeg = (canvas, q) => new Promise((res) => canvas.toBlob((b) => res(b), 'image/jpeg', q));
function draw(src, w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(src, 0, 0, w, h);
  return c;
}
// -> { kind: 'photo', mime, blob, thumb, width, height, preview } (JPEG: EXIF and location are gone with the re-encode)
async function preparePhoto(file) {
  const img = await decodeImage(file);
  const W = img.width || img.naturalWidth, H = img.height || img.naturalHeight;
  const big = fitSize(W, H, PHOTO_MAX_EDGE), sm = fitSize(W, H, THUMB_EDGE);
  const blob = await toJpeg(draw(img, big.width, big.height), PHOTO_QUALITY);
  const tc = draw(img, sm.width, sm.height);
  const thumb = await toJpeg(tc, 0.78);
  img.close?.();
  return { kind: 'photo', mime: 'image/jpeg', blob, thumb, width: big.width, height: big.height, preview: tc.toDataURL('image/jpeg', 0.7), bytes: blob.size };
}
// -> { kind: 'video', mime, blob (the file as it is), poster, thumb, duration, width, height, preview } or { error }
async function prepareVideo(file, lang) {
  const url = URL.createObjectURL(file);
  try {
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
    await new Promise((res, rej) => { v.onloadedmetadata = res; v.onerror = () => rej(new Error('video')); setTimeout(() => rej(new Error('video')), 15000); });
    const problem = videoProblem(v.duration, file.size, lang);
    if (problem) return { error: problem };
    await new Promise((res) => { v.onseeked = res; v.currentTime = Math.min(0.5, v.duration / 2); setTimeout(res, 3000); });
    const W = v.videoWidth || 640, H = v.videoHeight || 360;
    const p = fitSize(W, H, 1280), t = fitSize(W, H, THUMB_EDGE);
    const poster = await toJpeg(draw(v, p.width, p.height), 0.8);
    const tc = draw(v, t.width, t.height);
    const thumb = await toJpeg(tc, 0.78);
    return { kind: 'video', mime: videoMime(file.type), blob: file, poster, thumb, duration: Math.round(v.duration * 10) / 10, width: W, height: H,
      preview: tc.toDataURL('image/jpeg', 0.7), bytes: file.size };
  } finally { URL.revokeObjectURL(url); }
}

// ==================================================================================================================================
// Teacher capture
// ==================================================================================================================================
export async function mountMomentCapture(el, ctx) {
  if (!el) return null;
  const { c, client, rpc } = ctx;
  const lang = ctx.lang === 'es' ? 'es' : 'en', L = mw(lang);
  const say = (t, bad = false) => { const m = el.querySelector('#moMsg'); if (m) { m.textContent = t; m.className = `mo-msg ${bad ? 'bad' : 'ok'}`; } ctx.live?.(t); };
  let cx = null, room = ctx.room || null;
  const picked = [];                      // [{ id, file, prep, error }]
  let tagged = [];
  let sending = false;
  const sbc = () => (typeof client === 'function' ? client() : client);
  const me = (await sbc().auth.getSession()).data.session?.user?.id || 'anon';
  const store = idbStore(`${c.center_id}:${me}`);

  el.classList.add('mo', 'mo-cap');
  el.innerHTML = `<p class="mo-loading">${esc(L.loading)}</p>`;
  async function load() {
    cx = await rpc('moment_capture_context', { p_center: c.center_id, p_room: room });
    room = cx.room;
    tagged = tagged.filter((id) => (cx.kids || []).some((k) => k.id === id && k.photo_ok));
  }
  try { await load(); } catch (e) { el.innerHTML = `<p class="msg bad" role="alert">${esc(L.couldNot)} ${esc(e?.message || '')}</p>`; return null; }

  const activities = () => {
    const plan = (ctx.activities && ctx.activities.length ? ctx.activities : (cx.program || []).map((p) => ({ key: p.id || p.block, title: [p.block, p.title].filter(Boolean).join(': '), kind: 'plan' })))
      .filter((a) => a && a.title);
    return { plan, skills: SKILLS.map((k) => ({ key: k, title: L.skill[k], kind: 'skill' })) };
  };
  const teacherArt = () => castImg(ctx.castSrc);
  // the Game plan's open step (ctx.step: its key or title) is the activity tag already chosen
  const stepValue = () => {
    if (!ctx.step) return '';
    const st = String(ctx.step).toLowerCase(), a = activities();
    const hit = a.plan.find((p) => String(p.key).toLowerCase() === st || String(p.title).toLowerCase().includes(st));
    return hit ? ['plan', hit.key].join('|') : '';
  };
  const kidsHtml = () => (cx.kids || []).map((k) => {
    const t = kidTag(k), on = tagged.includes(k.id);
    const why = t.taggable ? '' : `<span class="mo-why" id="mowhy-${esc(k.id)}">${icon('lock')}${esc(t.reason === 'pending' ? L.consentPending : L.noConsent)}</span>`;
    return `<li><button type="button" class="mo-kid${on ? ' on' : ''}${t.taggable ? '' : ' off'}" data-kid="${esc(k.id)}" aria-pressed="${on}"${t.taggable ? '' : ` aria-disabled="true" aria-describedby="mowhy-${esc(k.id)}"`}>
      ${avatarHtml(esc, { friend: k.friend || 'bop' }, 'mo-av')}<span class="mo-kn">${esc(k.first)}</span>${on ? `<span class="mo-tick">${icon('check')}</span>` : ''}${why}</button></li>`;
  }).join('');
  const actHtml = (sel = '') => {
    const a = activities();
    return `<option value="">${esc(L.none)}</option>${a.plan.length ? `<optgroup label="${esc(L.planH)}">${a.plan.map((p) => `<option value="plan|${esc(p.key)}"${sel === `plan|${p.key}` ? ' selected' : ''}>${esc(p.title)}</option>`).join('')}</optgroup>` : ''}
      <optgroup label="${esc(L.skillsH)}">${a.skills.map((p) => `<option value="skill|${esc(p.key)}">${esc(p.title)}</option>`).join('')}</optgroup>`;
  };
  function render() {
    const rooms = cx.rooms || [];
    el.innerHTML = `<header class="mo-head">${teacherArt()}<div class="mo-hl"><h2 id="moCapH">${icon('camera')} ${esc(L.captureH)}</h2><p class="mo-sub">${esc(L.sub)}</p>
        <p class="mo-mode"><span class="chip ${cx.approval === 'auto' ? 'ok' : 'gold'}">${esc(cx.approval === 'auto' ? L.approvalOff : L.approvalOn)}</span></p></div>
        ${rooms.length > 1 ? `<label class="mo-room"><span class="sr-only">Room</span><select id="moRoom">${rooms.map((r) => `<option value="${esc(r.id)}"${r.id === room ? ' selected' : ''}>${esc(r.name)}</option>`).join('')}</select></label>` : ''}</header>
      <div class="mo-shoot" role="group" aria-label="${esc(L.captureH)}">
        <label class="mo-big mo-b-photo">${icon('camera')}<span>${esc(L.takePhoto)}</span><input type="file" accept="image/*" capture="environment" id="moCamPhoto" class="mo-file"></label>
        <label class="mo-big mo-b-video">${icon('video')}<span>${esc(L.recordVideo)}<small>${esc(L.maxVideo)}</small></span><input type="file" accept="video/*" capture="environment" id="moCamVideo" class="mo-file"></label>
        <label class="mo-big mo-b-lib">${icon('photos')}<span>${esc(L.choose)}</span><input type="file" accept="image/*,video/*" multiple id="moPick" class="mo-file"></label>
      </div>
      <ul class="mo-picked" id="moPicked" aria-live="polite"></ul>
      <fieldset class="mo-who"><legend><span class="mo-lg">${esc(L.whoH)}</span> <span class="mo-count" id="moCount">${tagged.length ? esc(L.selected(tagged.length)) : ''}</span></legend>
        <p class="mo-hint">${esc(L.whoHint)}</p><ul class="mo-kids" id="moKids">${kidsHtml()}</ul></fieldset>
      <p class="mo-see" id="moSee"></p>
      <div class="mo-fields">
        <label class="mo-field"><span>${esc(L.captionL)}</span><textarea id="moCaption" maxlength="300" rows="2" placeholder="${esc(L.captionPh)}"></textarea></label>
        <label class="mo-field"><span>${esc(L.activityL)}</span><select id="moActivity">${actHtml(stepValue())}</select></label>
      </div>
      <div class="mo-actions"><button type="button" class="btn gold mo-send" id="moSend">${icon('share')}<span>${esc(L.send)}</span></button>
        <button type="button" class="btn soft" id="moClear">${esc(L.clear)}</button></div>
      <p class="mo-msg" id="moMsg" role="status" aria-live="polite"></p>
      <section class="mo-queue" id="moQueue" aria-labelledby="moQueueH" hidden></section>
      <section class="mo-sentbox" aria-labelledby="moSentH"><h3 id="moSentH">${esc(L.sentH)}</h3><ul class="mo-sent" id="moSent"></ul></section>`;
    el.querySelectorAll('img[data-hide-broken]').forEach((i) => i.addEventListener('error', () => i.remove(), { once: true }));
    bind();
    drawPicked(); drawSee(); drawQueue(); loadSent();
  }
  function drawPicked() {
    const ul = el.querySelector('#moPicked'); if (!ul) return;
    ul.innerHTML = picked.map((p, i) => `<li class="mo-pk${p.error ? ' bad' : ''}">${p.prep?.preview ? `<img src="${esc(p.prep.preview)}" alt="" width="96" height="96">` : `<span class="mo-pk-wait">${icon(p.kind === 'video' ? 'video' : 'camera')}</span>`}
      ${p.prep?.kind === 'video' ? `<span class="mo-dur">${icon('play')}${esc(fmtDur(p.prep.duration))}</span>` : ''}${p.error ? `<span class="mo-pk-err">${esc(p.error)}</span>` : ''}
      <button type="button" class="mo-x" data-rm="${i}" aria-label="${esc(L.remove)}">${icon('close')}</button></li>`).join('');
    const ok = picked.filter((p) => p.prep).length;
    const b = el.querySelector('#moSend span'); if (b) b.textContent = ok > 1 ? L.sendN(ok) : L.send;
  }
  function drawSee() {
    const p = el.querySelector('#moSee'); if (!p) return;
    const g = groupNotice(cx.kids || [], tagged);
    p.innerHTML = tagged.length ? `${icon('people')}<span><b>${esc(L.willSee)}:</b> ${esc(g.group && g.blocked.length ? L.seeOwn(andList(g.blocked, lang)) : L.seeAll)}</span>` : '';
    p.classList.toggle('warn', !!(g.group && g.blocked.length));
    const n = el.querySelector('#moCount'); if (n) n.textContent = tagged.length ? L.selected(tagged.length) : '';
  }
  async function drawQueue() {
    const box = el.querySelector('#moQueue'); if (!box) return;
    const items = await store.all();
    box.hidden = !items.length;
    if (!items.length) { box.innerHTML = ''; return; }
    box.innerHTML = `<h3 id="moQueueH">${esc(L.queued)} <span class="chip warn">${items.length}</span></h3><p class="small muted">${esc(L.queuedHint)}</p>
      <ul class="mo-qitems">${items.map((it) => `<li><span class="chip ${it.error ? 'bad' : 'warn'}">${esc(it.error ? L.st.failed : L.st.queued)}</span>
        <span class="small">${esc((it.kids || []).map((id) => (cx.kids || []).find((k) => k.id === id)?.first || '').filter(Boolean).join(', '))}${it.caption ? ` · ${esc(it.caption)}` : ''}</span>
        ${it.error ? `<span class="small mo-bad">${esc(it.error)}</span>` : ''}<button type="button" class="btn soft small" data-discard="${esc(it.id)}">${esc(L.discard)}</button></li>`).join('')}</ul>
      <button type="button" class="btn navy small" id="moRetry">${esc(L.retry)}</button>`;
  }
  async function loadSent() {
    const ul = el.querySelector('#moSent'); if (!ul || !room) return;
    let list = [];
    try { list = await rpc('moments_room_recent', { p_center: c.center_id, p_room: room, p_days: 1 }); } catch { /* the strip is a convenience */ }
    ul.innerHTML = list.length ? list.map((m) => `<li class="mo-sm" id="mos-${esc(m.id)}"><span class="mo-ph">${m.thumb || m.poster ? `<img data-mo-path="${esc(m.thumb || m.poster)}" alt="" width="120" height="90">` : ''}${m.kind === 'video' ? `<span class="mo-dur">${icon('play')}${esc(fmtDur(m.duration_sec))}</span>` : ''}</span>
        <span class="mo-sm-t"><span class="chip ${m.status === 'shared' ? 'ok' : m.status === 'pending' ? 'gold' : 'warn'}">${esc(L.st[m.status] || m.status)}</span>
        <span class="small">${esc(m.time)} · ${esc((m.mine || []).map((k) => k.first).join(', '))}</span></span>
        ${m.mine_by_me || cx.is_director ? `<button type="button" class="mo-x mo-del" data-del="${esc(m.id)}" aria-label="${esc(L.del)}">${icon('trash')}</button>` : ''}</li>`).join('')
      : `<li class="mo-empty small muted">${esc(L.noneSent)}</li>`;
    paintThumbs(client, ul);
  }
  async function addFiles(files, hint) {
    for (const f of [...files].slice(0, 12)) {
      const kind = mediaKind(f.type) || (hint === 'video' ? 'video' : hint === 'photo' && /^image\//.test(f.type) ? 'photo' : null);
      const p = { id: uuid(), file: f, kind, prep: null, error: null };
      picked.push(p); drawPicked();
      try {
        if (!kind) throw new Error(L.notImage);
        const r = kind === 'photo' ? await preparePhoto(f) : await prepareVideo(f, lang);
        if (r.error) p.error = r.error; else p.prep = r;
      } catch (e) { p.error = e?.message && e.message !== 'image' && e.message !== 'video' ? e.message : L.notImage; }
      drawPicked();
    }
  }
  const api = {
    begin: (it) => rpc('moment_begin', beginArgs(it)),
    upload: async (path, blob, mime) => { const { error } = await sbc().storage.from(BUCKET).upload(path, blob, { contentType: mime, upsert: false, cacheControl: '3600' }); if (error) throw error; },
    finish: (it) => rpc('moment_finish', { p_center: it.center, p_id: it.id }),
  };
  async function flush() {
    const r = await runQueue(store, api);
    await drawQueue();
    if (r.sent.length) { loadSent(); ctx.onSent?.(r.sent); }
    return r;
  }
  async function send() {
    if (sending) return;
    const ready = picked.filter((p) => p.prep);
    if (!ready.length) return say(L.pickMedia, true);
    if (!tagged.length) return say(L.pickKid, true);
    sending = true;
    const btn = el.querySelector('#moSend'); btn.disabled = true; btn.querySelector('span').textContent = L.sending;
    const actV = el.querySelector('#moActivity').value, [ak, akey] = actV ? actV.split('|') : [null, null];
    const a = activities(), title = ak === 'plan' ? a.plan.find((x) => String(x.key) === akey)?.title : ak === 'skill' ? L.skill[akey] : null;
    const caption = el.querySelector('#moCaption').value;
    for (const p of ready) {
      await store.put(queueItem({ id: p.id, center: c.center_id, room, kind: p.prep.kind, mime: p.prep.mime, bytes: p.prep.bytes, duration: p.prep.duration ?? null,
        width: p.prep.width, height: p.prep.height, kids: tagged, caption, activity: ak ? { kind: ak, key: akey, title } : null, takenAt: new Date(p.file.lastModified && p.file.lastModified < Date.now() && Date.now() - p.file.lastModified < 6 * 864e5 ? p.file.lastModified : Date.now()).toISOString(),
        files: { main: p.prep.blob, thumb: p.prep.thumb, poster: p.prep.poster || null } }));
    }
    picked.length = 0; tagged = [];
    const r = await flush();
    sending = false;
    render();
    const done = r.sent.filter((s) => ready.some((p) => p.id === s.id));
    if (r.offline) say(L.offline, true);
    else if (r.failed.length) say(r.failed[r.failed.length - 1].error, true);
    else if (done.length) say(L.done(done.length, done.some((s) => s.status === 'pending')));
  }
  function bind() {
    el.querySelector('#moRoom')?.addEventListener('change', async (e) => { room = e.target.value; tagged = []; try { await load(); } catch (err) { say(errText(ctx, err), true); } render(); });
    el.querySelector('#moCamPhoto').addEventListener('change', (e) => { addFiles(e.target.files, 'photo'); e.target.value = ''; });
    el.querySelector('#moCamVideo').addEventListener('change', (e) => { addFiles(e.target.files, 'video'); e.target.value = ''; });
    el.querySelector('#moPick').addEventListener('change', (e) => { addFiles(e.target.files, null); e.target.value = ''; });
    el.querySelector('#moPicked').addEventListener('click', (e) => { const b = e.target.closest('[data-rm]'); if (b) { picked.splice(Number(b.dataset.rm), 1); drawPicked(); } });
    el.querySelector('#moKids').addEventListener('click', (e) => {
      const b = e.target.closest('[data-kid]'); if (!b) return;
      const k = (cx.kids || []).find((x) => x.id === b.dataset.kid); if (!k) return;
      if (!kidTag(k).taggable) { say(L.noConsentWhy(k.first), true); return; }
      tagged = tagged.includes(k.id) ? tagged.filter((x) => x !== k.id) : [...tagged, k.id];
      const on = tagged.includes(k.id);
      b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on));
      b.querySelector('.mo-tick')?.remove(); if (on) b.insertAdjacentHTML('beforeend', `<span class="mo-tick">${icon('check')}</span>`);
      if (on && motionOn()) b.animate([{ transform: 'scale(.94)' }, { transform: 'scale(1)' }], { duration: 220, easing: 'cubic-bezier(.22,1,.36,1)' });
      drawSee();
    });
    el.querySelector('#moSend').addEventListener('click', send);
    el.querySelector('#moClear').addEventListener('click', () => { picked.length = 0; tagged = []; render(); });
    el.querySelector('#moQueue').addEventListener('click', async (e) => {
      const d = e.target.closest('[data-discard]');
      if (d) { await store.del(d.dataset.discard); await drawQueue(); return; }
      if (e.target.closest('#moRetry')) { const r = await flush(); if (r.offline) say(L.offline, true); else if (r.sent.length) say(L.done(r.sent.length, r.sent.some((s) => s.status === 'pending'))); }
    });
    el.querySelector('#moSent').addEventListener('click', async (e) => {
      const d = e.target.closest('[data-del]'); if (!d) return;
      if (!confirm(L.delAsk)) return;
      try { await rpc('moment_delete', { p_center: c.center_id, p_id: d.dataset.del }); say(L.deleted); loadSent(); } catch (err) { say(errText(ctx, err), true); }
    });
  }
  render();
  // the waiting list goes out by itself when the connection comes back (and once now, for anything left from before a reload)
  const online = () => { if (document.body.contains(el)) flush().then((r) => { if (r.sent.length) say(L.done(r.sent.length, r.sent.some((s) => s.status === 'pending'))); }); else window.removeEventListener('online', online); };
  window.addEventListener('online', online);
  if ((await store.all()).length) online();
  return { refresh: async () => { await load(); render(); }, flush };
}

// ==================================================================================================================================
// Director: the approval queue and the setting
// ==================================================================================================================================
export async function mountMomentApprovals(el, ctx) {
  if (!el) return null;
  const { c, client, rpc } = ctx;
  const lang = ctx.lang === 'es' ? 'es' : 'en', L = mw(lang);
  el.classList.add('mo', 'mo-approve');
  const say = (t, bad = false) => { const m = el.querySelector('#moqMsg'); if (m) { m.textContent = t; m.className = `mo-msg ${bad ? 'bad' : 'ok'}`; } ctx.live?.(t); };
  let q;
  async function draw(focusId = null) {
    try { q = await rpc('moments_queue', { p_center: c.center_id }); } catch (e) { el.innerHTML = `<p class="msg bad" role="alert">${esc(L.couldNot)} ${esc(e?.message || '')}</p>`; return; }
    el.innerHTML = `<header class="mo-head">${castImg(ctx.castSrc)}
        <div class="mo-hl"><h2 id="moqH">${icon('check')} ${esc(L.approveH)} ${q.pending.length ? `<span class="chip gold">${q.pending.length}</span>` : ''}</h2><p class="mo-sub">${esc(L.approveSub)}</p></div></header>
      <fieldset class="mo-modes"><legend>${esc(L.modeH)}</legend>
        <label class="mo-radio"><input type="radio" name="moMode" value="director"${q.approval !== 'auto' ? ' checked' : ''}><span>${esc(L.modeDirector)}</span></label>
        <label class="mo-radio"><input type="radio" name="moMode" value="auto"${q.approval === 'auto' ? ' checked' : ''}><span>${esc(L.modeAuto)}</span></label></fieldset>
      <p class="mo-msg" id="moqMsg" role="status" aria-live="polite"></p>
      ${q.pending.length ? `<ul class="mo-qlist">${q.pending.map((m) => `<li class="mo-qi" id="moq-${esc(m.id)}" tabindex="-1">
          <span class="mo-ph mo-qph">${m.thumb || m.poster ? `<img data-mo-path="${esc(m.thumb || m.poster)}" alt="" width="160" height="120">` : ''}${m.kind === 'video' ? `<span class="mo-dur">${icon('play')}${esc(fmtDur(m.duration_sec))}</span>` : ''}</span>
          <span class="mo-qt"><b>${esc((m.mine || []).map((k) => k.first).join(', '))}</b>${m.caption ? `<span>${esc(m.caption)}</span>` : ''}
            <span class="small muted">${esc(L.by(m.by, m.room_name))} · ${esc(m.time)}</span>${m.activity?.title ? `<span class="chip">${esc(m.activity.title)}</span>` : ''}</span>
          <span class="mo-qa"><button type="button" class="btn gold small" data-ok="${esc(m.id)}">${esc(L.approve)}</button><button type="button" class="btn soft small" data-no="${esc(m.id)}">${esc(L.decline)}</button></span></li>`).join('')}</ul>`
        : `<p class="mo-empty">${esc(L.nothingWaiting)}</p>`}`;
    el.querySelectorAll('img[data-hide-broken]').forEach((i) => i.addEventListener('error', () => i.remove(), { once: true }));
    paintThumbs(client, el);
    if (focusId) {
      const it = el.querySelector(`#moq-${CSS.escape(focusId)}`);
      if (it) deepFocus(it); else deepNote(lang === 'es' ? 'Ese momento ya no espera aprobación: puede que ya se haya respondido.' : 'That moment is not waiting any more: it may have been answered already.', lang);
    }
  }
  el.addEventListener('click', async (e) => {
    const ok = e.target.closest('[data-ok]'), no = e.target.closest('[data-no]');
    if (!ok && !no) return;
    const id = (ok || no).dataset.ok || (ok || no).dataset.no;
    try { await rpc('moment_decide', { p_center: c.center_id, p_id: id, p_approve: !!ok }); await draw(); say(ok ? L.approved : L.declined); }
    catch (err) { say(errText(ctx, err), true); }
  });
  el.addEventListener('change', async (e) => {
    if (e.target.name !== 'moMode') return;
    try { await rpc('moment_settings_save', { p_center: c.center_id, p_approval: e.target.value }); say(L.modeSaved); } catch (err) { say(errText(ctx, err), true); }
  });
  const want = new URLSearchParams(location.search).get('approve');
  await draw(isMomentId(want) ? want : null);
  return { refresh: () => draw() };
}

// ==================================================================================================================================
// Family: the feed, the lightbox, save, heart, share with family
// ==================================================================================================================================
export async function mountMomentsFeed(el, ctx) {
  if (!el) return null;
  const { c, client, rpc, kid } = ctx;
  const lang = ctx.lang === 'es' ? 'es' : 'en', L = mw(lang);
  let tab = 'today', data = null;
  el.classList.add('mo', 'mo-feed');
  async function load() {
    const today = data?.today || null;
    const r = today ? rangeFor(tab, today) : { from: null, to: null };
    data = await rpc('moments_for_child', { p_center: c.center_id, p_kid: kid, p_from: r.from, p_to: r.to, p_limit: 120 });
    if (!today && tab !== 'today') { const r2 = rangeFor(tab, data.today); data = await rpc('moments_for_child', { p_center: c.center_id, p_kid: kid, p_from: r2.from, p_to: r2.to, p_limit: 120 }); }
  }
  function draw() {
    const f = data.first || '';
    const seg = ['today', 'week', 'month'].map((t) => `<button type="button" role="tab" class="mo-seg${t === tab ? ' on' : ''}" aria-selected="${t === tab}" data-range="${t}">${esc(L[t])}</button>`).join('');
    const list = data.moments || [];
    const consent = !data.photo_ok ? `<div class="mo-consent">${avatarHtml(esc, { friend: 'lumi' }, 'mo-av mo-av-lg')}<div><h3>${esc(L.consentH)}</h3><p>${esc(L.consentP(f))}</p>
        <a class="btn navy small" href="/c/${encodeURIComponent(c.slug)}/privacy?kid=${encodeURIComponent(kid)}&purpose=photos" data-nav>${esc(L.consentGo)}</a></div></div>` : '';
    el.innerHTML = `<header class="mo-fhead"><div><h2 id="moFeedH">${icon('photos')} ${esc(L.feedH)}</h2><p class="mo-sub">${esc(L.feedSub(f))}</p></div>
        <div class="mo-segs" role="tablist" aria-label="${esc(L.feedH)}">${seg}</div></header>
      ${consent}
      ${list.length ? `<ul class="mo-grid${list.length <= 4 ? ' mo-few' : ''}" id="moGrid" data-n="${list.length}">${list.map((m, i) => { const hero = i === 0 && list.length >= 2; return `<li class="mo-gi${hero ? ' mo-hero' : ''}">
          <button type="button" class="mo-tile" data-i="${i}" id="mot-${esc(m.id)}" aria-label="${esc(`${m.kind === 'video' ? L.video : L.photo}. ${L.open(m.time)}${m.caption ? `. ${m.caption}` : ''}`)}" aria-haspopup="dialog">
            <span class="mo-ph">${m.thumb || m.poster || (m.kind === 'photo' && m.path) ? `<img data-mo-path="${esc(hero && m.kind === 'photo' ? m.path : (m.thumb || m.poster || m.path))}" alt="" loading="lazy">` : ''}</span>
            ${m.kind === 'video' ? `<span class="mo-dur">${icon('play')}${esc(fmtDur(m.duration_sec))}</span>` : ''}
            ${m.hearts ? `<span class="mo-hmini${m.my_heart ? ' on' : ''}">${icon('heart')}${Number(m.hearts)}</span>` : ''}
            <span class="mo-time-chip">${esc(tab === 'today' ? m.time : `${new Date(`${m.date}T12:00:00Z`).toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} · ${m.time}`)}</span>
          </button>${m.caption ? `<p class="mo-gtext">${esc(m.caption)}</p>` : ''}</li>`; }).join('')}</ul>`
        : (data.photo_ok ? `<div class="mo-emptybox"><img src="img/friends/bop-waving-480.webp" alt="" width="96" height="120" loading="lazy"><p>${esc(tab === 'today' ? L.empty(f) : L.emptyRange(f))}</p></div>` : '')}
      ${data.photo_ok ? `<p class="mo-note small muted">${esc(L.groupNote)}</p>` : ''}`;
    paintThumbs(client, el);
  }
  el.addEventListener('click', (e) => {
    const s = e.target.closest('[data-range]');
    if (s) { tab = s.dataset.range; load().then(draw).catch(() => {}); return; }
    const t = e.target.closest('.mo-tile[data-i]');
    if (t) openLightbox({ ...ctx, lang }, data.moments, Number(t.dataset.i), t, () => { load().then(draw).catch(() => {}); });
  });
  el.addEventListener('keydown', (e) => {
    const list = e.target.closest?.('[role=tablist]'); if (!list) return;
    const items = [...list.querySelectorAll('[role=tab]')], i = items.indexOf(e.target); if (i < 0) return;
    const j = e.key === 'ArrowRight' ? (i + 1) % items.length : e.key === 'ArrowLeft' ? (i - 1 + items.length) % items.length : null; if (j == null) return;
    e.preventDefault(); tab = items[j].dataset.range; load().then(() => { draw(); el.querySelector(`[data-range="${tab}"]`)?.focus(); }).catch(() => {});
  });
  el.innerHTML = `<p class="mo-loading">${esc(L.loading)}</p>`;
  try { await load(); draw(); }
  catch (e) { el.innerHTML = `<p class="msg warn" role="alert">${esc(L.couldNot)}</p>`; return null; }
  // a notification's deep link: ?moment=<id> opens exactly that moment (or says it is not available: never a silent jump)
  const want = new URLSearchParams(location.search).get('moment');
  if (isMomentId(want)) {
    let i = (data.moments || []).findIndex((m) => m.id === want), list = data.moments;
    if (i < 0) {
      try { const m = await rpc('moment_get', { p_center: c.center_id, p_id: want }); list = [m]; i = 0; }
      catch { deepNote(L.missing, lang); i = -1; }
    }
    if (i >= 0) openLightbox({ ...ctx, lang }, list, i, document.getElementById(`mot-${want}`), () => { load().then(draw).catch(() => {}); }, { fromLink: true });
  }
  return { refresh: async () => { await load(); draw(); } };
}

// the lightbox: a native modal <dialog> (focus stays inside, Esc closes, the page behind is inert); arrows / swipes move through
function openLightbox(ctx, list, start, from, onChange, { fromLink = false } = {}) {
  const { c, client, rpc } = ctx;
  const lang = ctx.lang, L = mw(lang);
  document.getElementById('moLightbox')?.remove();
  const dlg = document.createElement('dialog');
  dlg.id = 'moLightbox'; dlg.className = 'mo-lb'; dlg.setAttribute('aria-labelledby', 'moLbH');
  if (lang === 'es') dlg.lang = 'es';
  document.body.append(dlg);
  let i = start, changed = false, shareOpen = false;
  const say = (t) => { const p = dlg.querySelector('#moLbMsg'); if (p) p.textContent = t; ctx.live?.(t); };
  async function draw() {
    const m = list[i];
    const many = list.length > 1;
    dlg.innerHTML = `<div class="mo-lb-in">
      <header class="mo-lb-top"><h2 id="moLbH">${esc(m.kind === 'video' ? L.video : L.photo)} · ${esc(m.time)}${many ? ` <span class="mo-lb-of">${esc(L.of(i + 1, list.length))}</span>` : ''}</h2>
        <button type="button" class="mo-round" id="moLbX" aria-label="${esc(L.close)}">${icon('close')}</button></header>
      <figure class="mo-lb-fig"><div class="mo-stage" id="moStage">${m.kind === 'video'
        ? `<video id="moVid" controls playsinline preload="metadata" ${m.width && m.height ? `width="${Number(m.width)}" height="${Number(m.height)}"` : ''}></video>`
        : `<img id="moImg" alt="${esc(m.caption || L.photo)}" ${m.width && m.height ? `width="${Number(m.width)}" height="${Number(m.height)}"` : ''}>`}</div>
        ${many ? `<button type="button" class="mo-round mo-nav mo-prev" id="moPrev" aria-label="${esc(L.prev)}"${i === 0 ? ' disabled' : ''}>${icon('prev')}</button>
                  <button type="button" class="mo-round mo-nav mo-next" id="moNext" aria-label="${esc(L.next)}"${i === list.length - 1 ? ' disabled' : ''}>${icon('next')}</button>` : ''}
        <figcaption class="mo-lb-cap">${m.caption ? `<p class="mo-lb-text">${esc(m.caption)}</p>` : ''}
          <p class="mo-chips">${(m.mine || []).map((k) => `<span class="chip">${esc(k.first)}</span>`).join('')}${m.others ? `<span class="chip">${icon('people')}${esc(L.withOthers(m.others))}</span>` : ''}
            ${m.activity?.title ? `<span class="chip gold">${esc(m.activity.title)}</span>` : ''}<span class="chip">${esc(dayLong(m.date, lang))}</span></p></figcaption></figure>
      <div class="mo-lb-bar">
        <button type="button" class="mo-act mo-heart${m.my_heart ? ' on' : ''}" id="moHeart" aria-pressed="${!!m.my_heart}">${icon('heart')}<span>${esc(m.my_heart ? L.hearted : L.heart)}</span>${m.hearts ? `<b>${Number(m.hearts)}</b>` : ''}</button>
        <button type="button" class="mo-act" id="moSave">${icon('save')}<span>${esc(L.save)}</span></button>
        ${m.can_share ? `<button type="button" class="mo-act" id="moShare" aria-expanded="${shareOpen}" aria-controls="moSharePanel">${icon('share')}<span>${esc(L.share)}</span></button>` : ''}
      </div>
      ${!m.can_share && m.others ? `<p class="mo-lb-note small">${icon('lock')}${esc(L.shareGroup)}</p>` : ''}
      <section class="mo-sharep" id="moSharePanel" aria-labelledby="moShareH"${shareOpen ? '' : ' hidden'}></section>
      <p class="mo-lb-msg" id="moLbMsg" role="status" aria-live="polite"></p></div>`;
    const media = m.kind === 'video' ? [m.path, ...renditionPaths(m.path), m.poster] : [m.path];
    const got = await sign(client, media);
    if (!dlg.isConnected || list[i] !== m) return;
    if (m.kind === 'video') {
      const v = dlg.querySelector('#moVid');
      const pick = pickVideo(m.path, got, { saveData: !!navigator.connection?.saveData, effectiveType: navigator.connection?.effectiveType || '4g', screenWidth: screen.width });
      if (got[m.poster]) v.poster = got[m.poster];
      if (got[pick.path]) v.src = got[pick.path];
    } else {
      const im = dlg.querySelector('#moImg');
      if (got[m.path]) im.src = got[m.path];
    }
    if (shareOpen) drawShare();
  }
  async function drawShare() {
    const m = list[i], box = dlg.querySelector('#moSharePanel'); if (!box) return;
    let links = [];
    try { links = await rpc('moment_share_list', { p_center: c.center_id, p_id: m.id }); } catch { /* none */ }
    box.innerHTML = `<h3 id="moShareH">${icon('link')} ${esc(L.shareH)}</h3><p class="small">${esc(L.shareP)}</p>
      <form class="mo-shareform" id="moShareForm"><fieldset class="mo-days"><legend>${esc(L.shareFor)}</legend>
        ${SHARE_DAYS.map((d) => `<label class="mo-day"><input type="radio" name="days" value="${d}"${d === 7 ? ' checked' : ''}><span>${esc(L.days(d))}</span></label>`).join('')}</fieldset>
        <label class="mo-field"><span>${esc(L.labelL)}</span><input name="label" maxlength="60" placeholder="${esc(L.labelPh)}" autocomplete="off"></label>
        <button class="btn gold" type="submit">${esc(L.makeLink)}</button></form>
      <div id="moLinkOut"></div>
      ${links.length ? `<h4>${esc(L.links)}</h4><ul class="mo-links">${links.map((l) => { const s = linkState(l, lang); return `<li><span><b>${esc(l.label || '—')}</b> <span class="chip ${s.state === 'active' ? 'ok' : ''}">${esc(s.text)}</span> <span class="small muted">${esc(L.views(l.views))}</span></span>
        ${s.state === 'active' ? `<button type="button" class="btn soft small" data-stop="${esc(l.id)}">${esc(L.stop)}</button>` : ''}</li>`; }).join('')}</ul>` : ''}`;
  }
  async function save() {
    const m = list[i];
    const got = await sign(client, [m.path]);
    const u = got[m.path]; if (!u) return;
    const ext = m.mime === 'image/webp' ? 'webp' : m.kind === 'photo' ? 'jpg' : m.mime === 'video/quicktime' ? 'mov' : m.mime === 'video/webm' ? 'webm' : 'mp4';
    const name = `futures-moment-${m.date}-${String(m.id).slice(0, 8)}.${ext}`;
    try {
      const blob = await (await fetch(u)).blob();
      const file = new File([blob], name, { type: m.mime });
      if (navigator.canShare?.({ files: [file] }) && /iPhone|iPad|Android/i.test(navigator.userAgent)) { await navigator.share({ files: [file] }); return; }   // the phone's own "Save image"
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      say(L.saveDone);
    } catch (e) { if (e?.name !== 'AbortError') say(errText(ctx, e)); }
  }
  dlg.addEventListener('click', async (e) => {
    if (e.target === dlg) return close();                                      // the backdrop
    if (e.target.closest('#moLbX')) return close();
    if (e.target.closest('#moPrev') && i > 0) { i--; return draw(); }
    if (e.target.closest('#moNext') && i < list.length - 1) { i++; return draw(); }
    if (e.target.closest('#moSave')) return save();
    if (e.target.closest('#moHeart')) {
      const m = list[i];
      try { const r = await rpc('moment_react', { p_center: c.center_id, p_id: m.id, p_on: !m.my_heart }); list[i] = { ...m, hearts: r.hearts, my_heart: r.my_heart }; changed = true; await draw();
        const h = dlg.querySelector('#moHeart'); h?.focus(); if (r.my_heart && motionOn()) h?.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 360, easing: 'cubic-bezier(.22,1,.36,1)' }); }
      catch (err) { say(errText(ctx, err)); }
      return;
    }
    if (e.target.closest('#moShare')) { shareOpen = !shareOpen; const b = dlg.querySelector('#moShare'); b.setAttribute('aria-expanded', String(shareOpen)); const p = dlg.querySelector('#moSharePanel'); p.hidden = !shareOpen; if (shareOpen) { await drawShare(); p.querySelector('input[name=days]:checked')?.focus(); } return; }
    const stop = e.target.closest('[data-stop]');
    if (stop) { try { await rpc('moment_share_revoke', { p_center: c.center_id, p_link: stop.dataset.stop }); say(L.stopped); await drawShare(); } catch (err) { say(errText(ctx, err)); } return; }
    if (e.target.closest('#moCopy')) { const v = dlg.querySelector('#moLinkUrl').value; try { await navigator.clipboard.writeText(v); say(L.copied); } catch { dlg.querySelector('#moLinkUrl').select(); } return; }
    if (e.target.closest('#moSys')) { const v = dlg.querySelector('#moLinkUrl').value; try { await navigator.share({ url: v, title: L.shareH }); } catch { /* cancelled */ } }
  });
  dlg.addEventListener('submit', async (e) => {
    if (e.target.id !== 'moShareForm') return;
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const r = await rpc('moment_share_create', { p_center: c.center_id, p_id: list[i].id, p_days: Number(fd.get('days')), p_label: String(fd.get('label') || '') || null });
      const url = `${location.origin}${r.path}`;
      await drawShare();
      dlg.querySelector('#moLinkOut').innerHTML = `<div class="mo-linkbox"><p class="ok-text">${icon('check')} ${esc(L.linkMade)}</p><label class="sr-only" for="moLinkUrl">${esc(L.shareH)}</label>
        <input id="moLinkUrl" readonly value="${esc(url)}"><span class="mo-linkbtns"><button type="button" class="btn navy small" id="moCopy">${esc(L.copy)}</button>${navigator.share ? `<button type="button" class="btn soft small" id="moSys">${esc(L.shareSys)}</button>` : ''}</span></div>`;
      dlg.querySelector('#moLinkUrl').select();
      say(L.linkMade);
    } catch (err) { say(errText(ctx, err)); }
  });
  dlg.addEventListener('keydown', (e) => {
    if (e.target.closest?.('input,textarea,select,video')) return;
    if (e.key === 'ArrowLeft' && i > 0) { e.preventDefault(); i--; draw(); }
    if (e.key === 'ArrowRight' && i < list.length - 1) { e.preventDefault(); i++; draw(); }
  });
  let x0 = null;
  dlg.addEventListener('touchstart', (e) => { x0 = e.touches.length === 1 && e.target.closest('#moStage') ? e.touches[0].clientX : null; }, { passive: true });
  dlg.addEventListener('touchend', (e) => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 50) { if (dx < 0 && i < list.length - 1) { i++; draw(); } else if (dx > 0 && i > 0) { i--; draw(); } } });
  function close() { dlg.close(); }
  dlg.addEventListener('close', () => {
    dlg.querySelector('video')?.pause();
    dlg.remove();
    if (fromLink) { const q = new URLSearchParams(location.search); q.delete('moment'); history.replaceState(history.state, '', `${FFTest.pathname()}${q.toString() ? `?${q}` : ''}${location.hash}`); }
    if (from?.isConnected) from.focus();
    if (changed) onChange?.();
  });
  draw();
  dlg.showModal();
  if (motionOn()) dlg.animate([{ opacity: 0, transform: 'scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.22,1,.36,1)' });
}

// the overview tile: today's moments of the child, three thumbnails, one tap to the Moments tab
export async function mountMomentsTile(el, ctx) {
  if (!el) return null;
  const { c, client, rpc, kid } = ctx;
  const lang = ctx.lang === 'es' ? 'es' : 'en', L = mw(lang);
  let d;
  try { d = await rpc('moments_for_child', { p_center: c.center_id, p_kid: kid, p_limit: 12 }); } catch { el.remove(); return null; }
  const list = d.moments || [];
  const q = new URLSearchParams(location.search); q.set('kid', kid); q.set('view', 'today'); q.set('tab', 'photos'); q.delete('drawer');
  el.classList.add('mo', 'mo-tilecard');
  el.innerHTML = `<h2 id="moTileH">${icon('photos')} ${esc(L.tileH)}</h2>
    ${list.length ? `<a class="mo-tstrip" href="${esc(`${FFTest.pathname()}?${q}`)}" data-view="today" data-tab="photos" aria-label="${esc(`${L.tileN(list.length)}. ${L.tileOpen}`)}">${list.slice(0, 3).map((m) => `<span class="mo-ph">${m.thumb || m.poster ? `<img data-mo-path="${esc(m.thumb || m.poster)}" alt="" width="120" height="120" loading="lazy">` : ''}${m.kind === 'video' ? `<span class="mo-dur">${icon('play')}</span>` : ''}</span>`).join('')}
        ${list.length > 3 ? `<span class="mo-more">+${list.length - 3}</span>` : ''}</a><p class="mo-tn"><b>${esc(L.tileN(list.length))}</b></p>`
      : `<p class="mo-tn muted">${esc(d.photo_ok ? L.tileNone : L.consentH)}</p>`}
    <a class="btn navy small mo-topen" href="${esc(`${FFTest.pathname()}?${q}`)}" data-view="today" data-tab="photos">${esc(L.tileOpen)}</a>`;
  paintThumbs(client, el);
  return { count: list.length };
}

// ==================================================================================================================================
// /c/<slug>/moments: staff (capture; directors also the approvals); families go to their dashboard's Moments
// ==================================================================================================================================
export async function viewMoments(ctx) {
  const { c, shell, page, go, lang, director, family } = ctx;
  const L = mw(lang);
  if (family) {
    const q = new URLSearchParams(location.search);
    return go(`/c/${encodeURIComponent(c.slug)}/home?view=today&tab=photos${q.get('kid') ? `&kid=${encodeURIComponent(q.get('kid'))}` : ''}`, true);
  }
  page(shell(`<div class="mo-page" id="momentsPage"><h2 class="sr-only">${esc(L.title)}</h2>
    ${director ? '<section class="card mo-card" id="momentApprovals" aria-labelledby="moqH"></section>' : ''}
    <section class="card mo-card" id="momentCapture" aria-labelledby="moCapH"></section></div>`), c.name);
  const base = { c, client: ctx.client, rpc: ctx.rpc, lang, live: ctx.live, friendly: ctx.friendly };
  if (director) await mountMomentApprovals(document.getElementById('momentApprovals'), base);
  await mountMomentCapture(document.getElementById('momentCapture'), { ...base, room: new URLSearchParams(location.search).get('room') });
}
