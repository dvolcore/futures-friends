/* Futures Friends Academy LMS: interactive activities inside lessons, video checkpoints, and active-time tracking.
   Needs academy-lms.js. This file only draws the activities and sends what the learner did; every rule is enforced in
   Postgres: answers are scored by training_submit_item (the key is never sent here), video position is capped at the next
   unpassed checkpoint by training_video_tick, and active minutes are counted by training_heartbeat (visible tab AND recent
   interaction; idle and hidden time is not counted). Nothing on this page can mark anything complete by itself. */
(function(){
'use strict';
const F = window.FFLMS; if (!F) return;
const { L, esc, must, friendly, say } = F;
const I = F.items = {};
const KIND_LABEL = { scenario:'Scenario', multi:'Select all that apply', ordering:'Put in order', hotspot:'Spot it', poll:'Quick poll', reflection:'Reflection' };
const UI = {};            // item id -> {sel:[], order:[], text:'', result:null, busy:false}
const rpc = (name, args) => L.sb.rpc(name, args).then(r => must(r, name));
const lessonOf = p => (p && typeof p.cur === 'number') ? p.lessons[p.cur] : null;
const itemsOf = (p, lessonId) => (p.items || []).filter(i => i.lesson_id === lessonId);
const checkpointsOf = (p, lessonId) => itemsOf(p, lessonId).filter(i => i.at_seconds != null).sort((a, b) => a.at_seconds - b.at_seconds);
const ui = it => UI[it.id] || (UI[it.id] = { sel:[], order:it.kind === 'ordering' ? it.options.map(o => o.id) : [], text:(it.reflection && it.reflection.text) || '', result:null, busy:false });
const fmtTime = s => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const fmtDur = s => { s = Math.max(0, Math.floor(s)); const m = Math.floor(s / 60), r = s % 60; return m ? `${m} min${r && m < 10 ? ` ${r} s` : ''}` : `${r} s`; };

// ---------------------------------------------------------------- one activity
function resultHtml(it, u){
  const r = u.result;
  if (r && r.already) return '<div class="lms-fb ok" role="status"><b>Done.</b> You already finished this activity.</div>';
  if (r) {
    const fbs = (r.option_feedback || []).map(f => { const o = it.options.find(x => x.id === f.option_id); return f.feedback ? `<li><b>${esc(o ? o.label : '')}:</b> ${esc(f.feedback)}</li>` : ''; }).join('');
    const body = `${r.feedback ? `<p>${esc(r.feedback)}</p>` : ''}${fbs ? `<ul>${fbs}</ul>` : ''}${r.explanation ? `<p class="lms-note">${esc(r.explanation)}</p>` : ''}`;
    if (r.correct === true) return `<div class="lms-fb ok" role="status"><b>Correct.</b>${body}</div>`;
    if (r.correct === false) return `<div class="lms-fb bad" role="status"><b>Not quite. Try again.</b>${body}</div>`;
    return `<div class="lms-fb ok" role="status"><b>Recorded.</b>${body}</div>`;
  }
  if (it.done) return '<div class="lms-fb ok" role="status"><b>Done.</b></div>';
  return '<div class="lms-fb" role="status" aria-live="polite"></div>';
}
function controlsHtml(it, u, locked){
  const dis = locked ? ' disabled' : '';
  const name = `it-${esc(it.id)}`;
  if (it.kind === 'scenario' || it.kind === 'poll')
    return `<fieldset class="lms-opts"><legend class="sr">Choose one</legend>${it.options.map(o => `<label><input type="radio" name="${name}" value="${esc(o.id)}" data-lms-itemsel="${esc(it.id)}"${u.sel[0] === o.id ? ' checked' : ''}${dis}><span>${esc(o.label)}</span></label>`).join('')}</fieldset>`;
  if (it.kind === 'multi')
    return `<fieldset class="lms-opts"><legend class="sr">Select all that apply</legend>${it.options.map(o => `<label><input type="checkbox" name="${name}" value="${esc(o.id)}" data-lms-itemsel="${esc(it.id)}"${u.sel.includes(o.id) ? ' checked' : ''}${dis}><span>${esc(o.label)}</span></label>`).join('')}</fieldset>`;
  if (it.kind === 'ordering')
    return `<p class="lms-note" id="${name}-help">Drag the steps, or use the Move up and Move down buttons, to put them in order. Then check your order.</p><ol class="lms-ord" aria-describedby="${name}-help">${u.order.map((id, i) => { const o = it.options.find(x => x.id === id); return `<li data-ord="${esc(id)}" draggable="${locked ? 'false' : 'true'}"><span class="n" aria-hidden="true">${i + 1}</span><span class="t">${esc(o ? o.label : '')}</span><span class="b"><button type="button" class="btn soft tiny" data-lms="ord-move" data-item="${esc(it.id)}" data-idx="${i}" data-dir="-1"${i === 0 || locked ? ' disabled' : ''} aria-label="Move up: ${esc(o ? o.label : '')}">Move up</button><button type="button" class="btn soft tiny" data-lms="ord-move" data-item="${esc(it.id)}" data-idx="${i}" data-dir="1"${i === u.order.length - 1 || locked ? ' disabled' : ''} aria-label="Move down: ${esc(o ? o.label : '')}">Move down</button></span></li>`; }).join('')}</ol>`;
  if (it.kind === 'hotspot') {
    const src = I.mediaSrc(it);
    const regions = it.options.filter(o => o.region).map(o => { const r = o.region, on = u.sel.includes(o.id); return `<button type="button" class="lms-hs${on ? ' on' : ''}" style="left:${r.x}%;top:${r.y}%;width:${r.w}%;height:${r.h}%" data-lms="hs-toggle" data-item="${esc(it.id)}" data-opt="${esc(o.id)}" aria-pressed="${on}" aria-label="${esc(o.label)}"${dis}></button>`; }).join('');
    return `<div class="lms-hsbox">${src ? `<img src="${esc(src)}" alt="${esc(it.alt_text || '')}">` : '<div class="lms-empty">Loading the picture...</div>'}${src ? regions : ''}</div>
      <fieldset class="lms-opts"><legend class="lms-note">Prefer a list? Select the hazards here instead of on the picture.</legend>${it.options.map(o => `<label><input type="checkbox" value="${esc(o.id)}" data-lms-itemsel="${esc(it.id)}"${u.sel.includes(o.id) ? ' checked' : ''}${dis}><span>${esc(o.label)}</span></label>`).join('')}</fieldset>`;
  }
  // reflection
  const min = it.min_length || 1, len = u.text.trim().length;
  const rv = it.reflection && it.reflection.review_status;
  return `${rv ? `<div class="lms-fb ${rv === 'follow_up' ? 'warn' : 'ok'}"><b>${rv === 'follow_up' ? 'Your coach asked for more' : 'Reviewed'}.</b>${it.reflection.comment ? ` ${esc(it.reflection.comment)}` : ''}</div>` : ''}
    <label class="f" for="rf-${esc(it.id)}">Your answer<textarea class="i" id="rf-${esc(it.id)}" rows="4" maxlength="4000" data-lms-reflect="${esc(it.id)}"${dis} aria-describedby="rfc-${esc(it.id)}">${esc(u.text)}</textarea></label>
    <div class="lms-note" id="rfc-${esc(it.id)}" data-rfcount="${esc(it.id)}">${len} characters. At least ${min} needed.</div>`;
}
function itemHtml(p, it){
  const u = ui(it);
  const needsReview = it.kind === 'reflection' && it.done && !(it.reflection && it.reflection.review_status === 'follow_up');
  const locked = (it.done && it.kind !== 'reflection') || needsReview || u.busy;
  const submittable = !(it.done && it.kind !== 'reflection') && !needsReview;
  const label = it.kind === 'poll' || it.kind === 'reflection' ? 'Submit' : 'Check my answer';
  return `<section class="lms-item${it.done ? ' done' : ''}" data-item="${esc(it.id)}" aria-labelledby="ih-${esc(it.id)}">
    <div class="lms-row sp"><span class="lms-chip dim">${esc(KIND_LABEL[it.kind] || 'Activity')}${it.required ? '' : ' (optional)'}</span>${it.done ? '<span class="lms-chip ok">Done</span>' : ''}</div>
    <h3 id="ih-${esc(it.id)}">${esc(it.prompt)}</h3>
    ${controlsHtml(it, u, locked)}
    <div class="lms-itemres" data-itemres>${resultHtml(it, u)}</div>
    ${submittable ? `<div class="lms-row"><button class="btn gold" type="button" data-lms="item-submit" data-item="${esc(it.id)}"${u.busy ? ' disabled aria-busy="true"' : ''}>${label}</button></div>` : ''}</section>`;
}
function redraw(p, it, focusSel){
  const el = document.querySelector(`[data-item="${CSS.escape(it.id)}"]`);
  if (el && el.tagName === 'SECTION') { el.outerHTML = itemHtml(p, it); }
  if (focusSel) { const t = document.querySelector(`[data-item="${CSS.escape(it.id)}"] ${focusSel}`); if (t) t.focus(); }
}
I.mediaSrc = it => it.media_url || (it.media_path && I.media[it.media_path]) || '';
I.media = {};
async function loadMedia(p){
  for (const it of p.items || []) {
    if (it.kind === 'hotspot' && it.media_path && !I.media[it.media_path]) { try { I.media[it.media_path] = await F.signedUrl(it.media_path, 3600); } catch(_) { /* shows the placeholder */ } }
  }
}
I.afterLoad = async p => { await loadMedia(p); };

// ---------------------------------------------------------------- lesson pieces used by academy-lms.js
I.lessonItemsHtml = (p, l) => {
  const list = itemsOf(p, l.id).filter(i => i.at_seconds == null);
  if (!list.length) return '';
  return `<div class="lms-items" aria-label="Activities in this lesson"><h3 class="lms-sub">Activities</h3>${list.map(i => itemHtml(p, i)).join('')}</div>`;
};
// Why the lesson cannot be completed yet (a hint only; the database decides)
I.lessonBlock = (p, l) => {
  const left = itemsOf(p, l.id).filter(i => i.required && !i.done).length;
  if (left) return `Finish the ${left} required activit${left === 1 ? 'y' : 'ies'} in this lesson first.`;
  if (l.kind === 'video' && l.video_seconds) {
    const pr = p.progress[l.id] || {}, need = Math.ceil(l.video_seconds * 0.9), got = pr.video_credit_seconds || 0;
    if (got < need) return `Watch the video through to finish this lesson (${fmtTime(got)} of ${fmtTime(need)} watched).`;
  }
  return null;
};
I.hasTouchpoints = (p) => (p.items || []).length > 0;

// ---------------------------------------------------------------- answering
function readAnswer(it, u){
  if (it.kind === 'scenario' || it.kind === 'poll') return u.sel[0] ? { option:u.sel[0] } : null;
  if (it.kind === 'multi' || it.kind === 'hotspot') return u.sel.length ? { options:u.sel } : null;
  if (it.kind === 'ordering') return { order:u.order };
  const t = u.text.trim(); return t.length >= (it.min_length || 1) ? { text:t } : null;
}
F.on('item-submit', async el => {
  const p = F.L.player; if (!p) return;
  const it = (p.items || []).find(i => i.id === el.dataset.item); if (!it) return;
  const u = ui(it), ans = readAnswer(it, u);
  if (!ans) {
    const msg = it.kind === 'reflection' ? `Write at least ${it.min_length || 1} characters first.` : it.kind === 'ordering' ? 'Put the steps in order first.' : 'Choose an answer first.';
    u.result = null; redraw(p, it); const r = document.querySelector(`[data-item="${CSS.escape(it.id)}"] [data-itemres]`); if (r) r.innerHTML = `<div class="lms-fb warn" role="alert">${esc(msg)}</div>`;
    return;
  }
  u.busy = true; redraw(p, it);
  try {
    if (it.at_seconds != null && ENG[it.lesson_id] && ENG[it.lesson_id].api) await ENG[it.lesson_id].tickNow();   // the server must know the video reached this checkpoint
    const r = await rpc('training_submit_item', { p_enrollment:p.id, p_item:it.id, p_answer:ans });
    u.result = r; u.busy = false;
    if (r.completed) { it.done = true; it.correct = r.correct; it.attempts = r.attempt_no; if (it.kind === 'reflection') it.reflection = { text:u.text.trim(), review_status:null, comment:null }; }
    else { it.attempts = r.attempt_no; if (it.kind !== 'ordering') u.sel = it.kind === 'scenario' ? [] : u.sel; }
    redraw(p, it);
    I.afterItem(p, it, r);
  } catch(e) {
    u.busy = false; redraw(p, it);
    const box = document.querySelector(`[data-item="${CSS.escape(it.id)}"] [data-itemres]`); if (box) box.innerHTML = `<div class="lms-fb bad" role="alert">${esc(friendly(e))}</div>`;
  }
});
document.addEventListener('change', e => {
  const t = e.target.closest && e.target.closest('[data-lms-itemsel]'); if (!t || !F.L.player) return;
  const it = (F.L.player.items || []).find(i => i.id === t.dataset.lmsItemsel); if (!it) return;
  const u = ui(it);
  if (it.kind === 'scenario' || it.kind === 'poll') u.sel = [t.value];
  else u.sel = t.checked ? [...new Set([...u.sel, t.value])] : u.sel.filter(x => x !== t.value);
  if (it.kind === 'hotspot') redraw(F.L.player, it);
});
F.on('hs-toggle', el => {
  const p = F.L.player, it = p && p.items.find(i => i.id === el.dataset.item); if (!it) return;
  const u = ui(it), id = el.dataset.opt;
  u.sel = u.sel.includes(id) ? u.sel.filter(x => x !== id) : [...u.sel, id];
  redraw(p, it, `[data-opt="${CSS.escape(id)}"]`);
});
F.on('ord-move', el => {
  const p = F.L.player, it = p && p.items.find(i => i.id === el.dataset.item); if (!it) return;
  const u = ui(it), i = +el.dataset.idx, j = i + +el.dataset.dir;
  if (j < 0 || j >= u.order.length) return;
  [u.order[i], u.order[j]] = [u.order[j], u.order[i]];
  const nowId = u.order[j];
  redraw(p, it); const li = document.querySelector(`[data-item="${CSS.escape(it.id)}"] li[data-ord="${CSS.escape(nowId)}"]`);
  const btn = li && li.querySelector(`button[data-dir="${el.dataset.dir}"]:not([disabled])`) || (li && li.querySelector('button:not([disabled])')); if (btn) btn.focus();
});
// drag and drop for the ordering list (the buttons above are the keyboard and screen-reader route)
let dragId = null;
document.addEventListener('dragstart', e => { const li = e.target.closest && e.target.closest('li[data-ord]'); if (!li) return; dragId = li.dataset.ord; try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragId); } catch(_) {} });
document.addEventListener('dragover', e => { if (dragId && e.target.closest && e.target.closest('li[data-ord]')) e.preventDefault(); });
document.addEventListener('drop', e => {
  const li = e.target.closest && e.target.closest('li[data-ord]'); if (!li || !dragId) return; e.preventDefault();
  const sec = li.closest('[data-item]'), p = F.L.player, it = p && sec && p.items.find(i => i.id === sec.dataset.item); if (!it) { dragId = null; return; }
  const u = ui(it), from = u.order.indexOf(dragId), to = u.order.indexOf(li.dataset.ord);
  if (from >= 0 && to >= 0 && from !== to) { u.order.splice(to, 0, u.order.splice(from, 1)[0]); redraw(p, it); }
  dragId = null;
});
document.addEventListener('dragend', () => { dragId = null; });
document.addEventListener('input', e => {
  const t = e.target.closest && e.target.closest('[data-lms-reflect]'); if (!t || !F.L.player) return;
  const it = F.L.player.items.find(i => i.id === t.dataset.lmsReflect); if (!it) return;
  const u = ui(it); u.text = t.value;
  const c = document.querySelector(`[data-rfcount="${CSS.escape(it.id)}"]`); if (c) c.textContent = `${u.text.trim().length} characters. At least ${it.min_length || 1} needed.`;
});

// a finished activity: refresh the lesson controls, and (for a checkpoint) let the video go on
I.afterItem = (p, it, r) => {
  if (r.completed && it.at_seconds != null) { const eng = ENG[it.lesson_id]; if (eng) eng.checkpointDone(it); }
  I.refreshLessonControls(p); I.refreshStatus(p);
};
// what is still missing before the course can be completed (the server's own list)
I.todoHtml = p => {
  const s = p.status; if (!s || s.completed) return '';
  return `<div class="lms-todo" id="lmsTodo"><h4>To finish this course</h4>${s.blockers && s.blockers.length ? `<ul>${s.blockers.map(b => `<li>${esc(b)}</li>`).join('')}</ul>` : '<p class="lms-note">Everything is done. Choose the button to get your certificate.</p>'}<button class="btn soft tiny" type="button" data-lms="finish-course">Check my progress</button></div>`;
};
I.refreshStatus = async p => {
  try { p.status = await rpc('training_completion_status', { p_enrollment:p.id }); const el = document.getElementById('lmsTodo'); if (el) el.outerHTML = I.todoHtml(p); I.updateTime(p); } catch(_) { /* the list refreshes on the next action */ }
};
F.on('finish-course', async () => {
  const p = F.L.player; if (!p) return;
  const r = await rpc('training_finish_course', { p_enrollment:p.id });
  if (r.completed) return F.finished(p);
  p.status = r.status; const el = document.getElementById('lmsTodo'); if (el) el.outerHTML = I.todoHtml(p);
  say(r.status.blockers && r.status.blockers[0] ? `Not finished yet: ${r.status.blockers[0]}` : 'Not finished yet.');
});
I.refreshLessonControls = p => {
  const l = lessonOf(p); if (!l) return;
  const btn = document.querySelector('[data-lms="lesson-complete"]'), hint = document.getElementById('lmsLessonHint');
  const block = I.lessonBlock(p, l);
  if (btn) { btn.disabled = !!block; btn.setAttribute('aria-disabled', block ? 'true' : 'false'); }
  if (hint) hint.textContent = block || '';
};

// ---------------------------------------------------------------- video with checkpoints
const ENG = {};          // lesson id -> engine (kept across re-renders so the video keeps playing)
function videoKind(url){
  const u = String(url || '');
  if (/^https:\/\/(?:www\.)?youtube\.com\/watch\?v=([\w-]{6,20})/.test(u) || /^https:\/\/youtu\.be\/([\w-]{6,20})/.test(u) || /^https:\/\/(?:www\.)?youtube(?:-nocookie)?\.com\/embed\/([\w-]{6,20})/.test(u)) return 'youtube';
  if (/^https:\/\/(?:www\.)?vimeo\.com\/(\d+)/.test(u) || /^https:\/\/player\.vimeo\.com\/video\/(\d+)/.test(u)) return 'vimeo';
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(u)) return 'file';
  return 'link';
}
const ytId = u => { let m; return (m = /watch\?v=([\w-]{6,20})/.exec(u)) || (m = /youtu\.be\/([\w-]{6,20})/.exec(u)) || (m = /embed\/([\w-]{6,20})/.exec(u)) ? m[1] : ''; };
const vmId = u => { const m = /(?:vimeo\.com\/|video\/)(\d+)/.exec(u); return m ? m[1] : ''; };
function loadScript(src, ready){
  return new Promise((res, rej) => { if (ready()) return res(); let s = document.querySelector(`script[data-lms-src="${src}"]`);
    if (!s) { s = document.createElement('script'); s.src = src; s.async = true; s.setAttribute('data-lms-src', src); document.head.appendChild(s); }
    const t0 = Date.now(), iv = setInterval(() => { if (ready()) { clearInterval(iv); res(); } else if (Date.now() - t0 > 15000) { clearInterval(iv); rej(new Error('player library did not load')); } }, 100); });
}
// Each adapter gives the same small surface: time(), pause(), play(), seek(t), isPlaying(), on(cb) for time updates
function fileAdapter(host, l, caps){
  const v = document.createElement('video');
  v.controls = true; v.preload = 'metadata'; v.setAttribute('playsinline', ''); v.src = l.video_url; v.setAttribute('aria-label', l.title);
  v.setAttribute('controlsList', 'nodownload noplaybackrate');
  if (caps) {                                       // a caption file on another host needs CORS; if the video host refuses it, play without captions rather than not at all
    v.crossOrigin = 'anonymous';
    const tr = document.createElement('track'); tr.kind = 'captions'; tr.srclang = 'en'; tr.label = 'English captions'; tr.src = caps; tr.default = true; v.appendChild(tr);
    v.addEventListener('error', () => { if (v.crossOrigin) { v.removeAttribute('crossorigin'); v.querySelectorAll('track').forEach(t => t.remove()); v.load(); } }, { once:true });
  }
  host.appendChild(v);
  let cb = () => {};
  const fire = () => cb(v.currentTime);
  v.addEventListener('timeupdate', fire); v.addEventListener('seeking', fire); v.addEventListener('seeked', fire);
  v.addEventListener('pause', () => cb(v.currentTime, true)); v.addEventListener('ended', () => cb(v.currentTime, true));   // report the last position
  v.addEventListener('ratechange', () => { if (v.playbackRate !== 1) v.playbackRate = 1; });   // no fast-forwarding
  return Promise.resolve({ el:v, time:() => v.currentTime, pause:() => v.pause(), play:() => v.play().catch(() => {}), seek:t => { v.currentTime = t; }, isPlaying:() => !v.paused && !v.ended, on:f => { cb = f; }, destroy:() => { try { v.pause(); v.removeAttribute('src'); v.load(); } catch(_) {} } });
}
function youtubeAdapter(host, l){
  const id = ytId(l.video_url), div = document.createElement('div'); host.appendChild(div);
  return loadScript('https://www.youtube.com/iframe_api', () => window.YT && window.YT.Player).then(() => new Promise(res => {
    let cb = () => {}, playing = false, pl;
    pl = new window.YT.Player(div, { videoId:id, host:'https://www.youtube-nocookie.com', playerVars:{ rel:0, modestbranding:1, playsinline:1, disablekb:0, cc_load_policy:1, origin:location.origin },
      events:{ onReady:() => { try { pl.getIframe().setAttribute('title', l.title); } catch(_) {} res(api); }, onStateChange:e => { playing = e.data === 1; } } });
    const iv = setInterval(() => { try { cb(pl.getCurrentTime()); } catch(_) {} }, 250);
    const api = { el:host, time:() => pl.getCurrentTime(), pause:() => pl.pauseVideo(), play:() => pl.playVideo(), seek:t => pl.seekTo(t, true), isPlaying:() => playing, on:f => { cb = f; }, destroy:() => { clearInterval(iv); try { pl.destroy(); } catch(_) {} } };
  }));
}
function vimeoAdapter(host, l){
  const iframe = document.createElement('iframe');
  iframe.src = `https://player.vimeo.com/video/${vmId(l.video_url)}?title=0&byline=0&portrait=0&texttrack=en`; iframe.title = l.title; iframe.allow = 'picture-in-picture'; iframe.setAttribute('allowfullscreen', ''); host.appendChild(iframe);
  return loadScript('https://player.vimeo.com/api/player.js', () => window.Vimeo && window.Vimeo.Player).then(() => {
    const pl = new window.Vimeo.Player(iframe); let cb = () => {}, t = 0, playing = false;
    pl.on('timeupdate', d => { t = d.seconds; cb(t); }); pl.on('play', () => { playing = true; }); pl.on('pause', () => { playing = false; }); pl.on('ended', () => { playing = false; }); pl.on('seeked', d => { t = d.seconds; cb(t); });
    return { el:host, time:() => t, pause:() => pl.pause(), play:() => pl.play().catch(() => {}), seek:x => pl.setCurrentTime(x), isPlaying:() => playing, on:f => { cb = f; }, destroy:() => { try { pl.destroy(); } catch(_) {} } };
  });
}

function makeEngine(p, l){
  const eng = { lesson:l, api:null, last:0, tickAt:0, open:null, host:null, ready:null, destroyed:false };
  const checkpoints = () => checkpointsOf(F.L.player || p, l.id);
  const pending = () => checkpoints().filter(c => c.required && !c.done);
  const allowed = () => { const n = pending()[0]; return n ? n.at_seconds : Infinity; };
  eng.checkpointDone = it => { if (eng.open && eng.open.id === it.id) { /* the learner continues from the overlay */ const o = document.getElementById('lmsCp'); if (o) { const b = o.querySelector('[data-lms="cp-continue"]'); if (b) { b.hidden = false; b.focus(); } } } };
  eng.onTime = (t, force) => {
    const pl = F.L.player; if (!pl || eng.destroyed) return;
    const lim = allowed();
    if (t > lim + 0.75) {                                    // seeking or playing past an unfinished checkpoint
      eng.api.seek(Math.max(0, lim)); say('You cannot skip ahead past an activity you have not finished.');
      t = lim;
    }
    eng.last = t;
    const cp = pending().find(c => t >= c.at_seconds - 0.3);
    if (cp && !eng.open) eng.openCp(cp);
    const now = Date.now();
    if (force ? now - eng.tickAt >= 800 : (eng.api.isPlaying() && now - eng.tickAt >= 5000)) { eng.tickAt = now; eng.tick(Math.floor(t)); }
  };
  eng.tick = async pos => {
    try {
      const r = await rpc('training_video_tick', { p_enrollment:F.L.player.id, p_lesson:l.id, p_position:pos });
      const pr = F.L.player.progress[l.id] = Object.assign({}, F.L.player.progress[l.id], { lesson_id:l.id, video_credit_seconds:r.video_credit_seconds, max_position_seconds:Math.max(r.position, (F.L.player.progress[l.id] || {}).max_position_seconds || 0) });
      if (r.clamped && eng.api && Math.abs(eng.api.time() - r.position) > 1) eng.api.seek(r.position);
      I.updateVideoNote(l); I.refreshLessonControls(F.L.player);
    } catch(e) { /* a missed tick only means less credit; the next one retries */ }
  };
  eng.tickNow = () => eng.tick(Math.floor(Math.min(eng.api.time(), allowed())));
  eng.openCp = cp => {
    eng.open = cp; eng.api.pause(); eng.tickNow();
    const box = document.getElementById('lmsCp'); if (!box) return;
    box.hidden = false;
    box.innerHTML = `<div class="lms-cp-in" role="dialog" aria-modal="false" aria-labelledby="cph-${esc(cp.id)}"><div class="lms-row sp"><b id="cph-${esc(cp.id)}">Checkpoint at ${esc(fmtTime(cp.at_seconds))}</b><span class="lms-note">The video is paused. Finish this activity to keep watching.</span></div>${itemHtml(F.L.player, cp)}<div class="lms-row"><button type="button" class="btn gold" data-lms="cp-continue" hidden>Continue the video</button></div></div>`;
    const first = box.querySelector('input,textarea,button.lms-hs,button[data-lms="item-submit"]'); if (first) first.focus();
    if (cp.done) { const b = box.querySelector('[data-lms="cp-continue"]'); if (b) b.hidden = false; }
  };
  eng.closeCp = () => { eng.open = null; const box = document.getElementById('lmsCp'); if (box) { box.hidden = true; box.innerHTML = ''; } eng.api.play(); };
  return eng;
}
F.on('cp-continue', () => { const l = lessonOf(F.L.player), eng = l && ENG[l.id]; if (eng) eng.closeCp(); });

I.videoHtml = (p, l) => {
  const kind = videoKind(l.video_url);
  const cps = checkpointsOf(p, l.id);
  const transcript = l.transcript ? `<details class="lms-transcript"><summary class="lms-link">Transcript</summary><div class="lms-prose">${F.md(l.transcript)}</div></details>` : '';
  if (kind === 'link' || !l.video_seconds) return `${F.safeUrl(l.video_url) ? `<p><a class="btn soft" href="${esc(F.safeUrl(l.video_url))}" target="_blank" rel="noopener">Open the video in a new tab</a></p>` : ''}${transcript}`;
  return `<div class="lms-videobox"><div class="lms-videohost" data-videohost="${esc(l.id)}" data-vkind="${kind}"></div>
    <div id="lmsCp" class="lms-cp" hidden aria-live="polite"></div>
    <p class="lms-note" id="lmsVidNote">${cps.length ? `This video has ${cps.length} checkpoint${cps.length === 1 ? '' : 's'}. It pauses for each one and you cannot skip past a checkpoint you have not finished. Playback speed is fixed.` : 'You cannot skip ahead in this video. Playback speed is fixed.'}</p></div>${transcript}`;
};
I.updateVideoNote = l => {
  const n = document.getElementById('lmsVidNote'), p = F.L.player; if (!n || !p) return;
  const pr = p.progress[l.id] || {}, need = Math.ceil(l.video_seconds * 0.9), got = pr.video_credit_seconds || 0;
  const cps = checkpointsOf(p, l.id), left = cps.filter(c => c.required && !c.done).length;
  n.textContent = `Watched ${fmtTime(got)} of the ${fmtTime(need)} needed. ${left ? `${left} checkpoint${left === 1 ? '' : 's'} left.` : cps.length ? 'All checkpoints done.' : ''}`;
};
// after every render: attach the video(s) of the lesson on screen and keep the heartbeat running for this course
I.mount = () => {
  const p = F.L.player, host = document.querySelector('[data-videohost]');
  if (!p || p.loading || p.err) return;
  for (const [id, eng] of Object.entries(ENG)) { if (!host || host.dataset.videohost !== id) { /* left the lesson: stop and release it */ if (eng.api && eng.api.isPlaying()) eng.api.pause(); if (eng.pid !== p.id) { eng.destroyed = true; eng.api && eng.api.destroy(); delete ENG[id]; } } }
  if (host) {
    const l = p.lessons.find(x => x.id === host.dataset.videohost); if (!l) return;
    let eng = ENG[l.id];
    if (!eng || eng.pid !== p.id) {
      eng = ENG[l.id] = makeEngine(p, l); eng.pid = p.id;
      const kind = host.dataset.vkind;
      eng.ready = (kind === 'youtube' ? youtubeAdapter(host, l) : kind === 'vimeo' ? vimeoAdapter(host, l) : fileAdapter(host, l, l.captions_url)).then(api => {
        eng.api = api; api.on(eng.onTime);
        const pr = p.progress[l.id]; if (kind === 'file' && pr && pr.max_position_seconds > 5) { /* resume where they left off, never past what they earned */ const go = Math.min(pr.position_seconds || 0, pr.max_position_seconds); api.el.addEventListener('loadedmetadata', () => { if (go > 5) api.seek(go); }, { once:true }); }
        I.updateVideoNote(l);
      }).catch(() => { host.innerHTML = '<div class="lms-banner bad"><div>The video player could not load. Check your connection and reload.</div></div>'; });
    } else if (eng.api && eng.api.el && !host.contains(eng.api.el)) {      // the page was redrawn: put the same player back
      host.appendChild(eng.api.el); if (eng.open) eng.openCp(eng.open);
    }
  }
  I.track.ensure();
};
window.FFhooks = window.FFhooks || [];
window.FFhooks.push(() => { try { I.mount(); } catch(e) { console.warn(e); } });

// ---------------------------------------------------------------- active time
// Sends a heartbeat every 15 seconds while a course is open: whether the tab is visible and how long since the learner last
// did anything. The server counts a beat only when the tab is visible AND the last interaction is within the course's idle
// limit (default 3 minutes), and never more than the real time between beats.
const T = I.track = { timer:null, last:Date.now(), key:'', wired:false };
T.ensure = () => {
  const p = F.L.player, route = typeof view === 'string' ? view : '';
  const want = route === 'learn-course' && p && !p.loading && !p.err && p.enr && p.enr.status !== 'completed' && p.course && p.course.published !== undefined;
  if (!T.wired) { T.wired = true; ['mousemove', 'keydown', 'pointerdown', 'scroll', 'touchstart', 'wheel', 'click', 'input'].forEach(ev => window.addEventListener(ev, () => { T.last = Date.now(); }, { capture:true, passive:true })); document.addEventListener('visibilitychange', () => { if (T.timer) T.beat(); }); }
  if (want && !T.timer) { T.last = Date.now(); T.timer = setInterval(() => T.beat(), 15000); T.beat(); }
  if (!want && T.timer) { clearInterval(T.timer); T.timer = null; }
};
T.beat = async () => {
  const p = F.L.player; const route = typeof view === 'string' ? view : '';
  if (!p || route !== 'learn-course' || !p.enr || p.enr.status === 'completed') { T.ensure(); return; }
  const l = lessonOf(p);
  try {
    const r = await rpc('training_heartbeat', { p_enrollment:p.id, p_lesson:l ? l.id : null, p_visible:document.visibilityState === 'visible', p_idle_seconds:Math.round((Date.now() - T.last) / 1000) });
    if (p.status) { p.status.active_seconds = r.active_seconds; p.status.required_seconds = r.required_seconds || p.status.required_seconds; }
    T.state = r.state; I.updateTime(p); T.n = (T.n || 0) + 1;
    if (r.completed && r.certificate_code) { clearInterval(T.timer); T.timer = null; F.finished(p); }
    else if (T.n % 4 === 0) I.refreshStatus(p);
  } catch(e) { /* the next beat retries; time is never counted for a missed one */ }
};
I.timeHtml = p => {
  const s = p.status; if (!s || !s.time_enforced) return '';
  const got = Math.min(s.active_seconds, s.required_seconds), pct = Math.round(100 * got / s.required_seconds);
  return `<div class="lms-time" id="lmsTime"><h4>Time in this course</h4><div class="lms-meter" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Active time"><i style="width:${pct}%"></i></div>
    <div class="lms-note" id="lmsTimeTxt">${fmtDur(s.active_seconds)} counted of ${fmtDur(s.required_seconds)} required.</div>
    <div class="lms-note">Time counts only while this tab is open and you are active (clicking, typing or scrolling). Idle or hidden time is not counted.</div>
    <div class="lms-note" id="lmsTimeState" aria-live="polite"></div></div>`;
};
I.updateTime = p => {
  const s = p.status; if (!s) return;
  const txt = document.getElementById('lmsTimeTxt'); if (txt) txt.textContent = `${fmtDur(s.active_seconds)} counted of ${fmtDur(s.required_seconds)} required.`;
  const bar = document.querySelector('#lmsTime .lms-meter'), pct = s.required_seconds ? Math.min(100, Math.round(100 * s.active_seconds / s.required_seconds)) : 0;
  if (bar) { bar.setAttribute('aria-valuenow', pct); bar.firstElementChild.style.width = pct + '%'; }
  const st = document.getElementById('lmsTimeState'); if (st) st.textContent = T.state === 'idle' ? 'Paused: no activity for a while. Click or type to continue counting.' : T.state === 'hidden' ? 'Paused: this tab is hidden.' : '';
};
})();
