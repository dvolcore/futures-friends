// The content review queue: the DOM part (hub/DIRECTOR_OPS.md; the pure part is director-review-core.js).
//   createReview(ctx)            the director's queue (Content > Review): filters, bulk approve, the preview drawer (the shell's
//                                slide-over: drawer=review:<id> for a center item, drawer=netreview:<id> for a network item), the named
//                                reviewers and what needs review here
//   mountReviewQueue(el, ctx)    the same queue for staff who are named reviewers (teacher Me > Content review), with the preview
//                                inline; ?review=<id> opens that item (the notification's exact item)
// Every action goes through the database (center_review_act / _bulk / _resubmit, or the HQ pipeline's content_act for a network
// item when the person is an HQ reviewer of record). After each action the page re-reads the queue and tells the dashboard
// (event "dops:review" with the new count) so the Overview chip and the rail badge follow at once.
import * as R from './director-review-core.js';

const defaultEsc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const errText = (e) => String(e?.message || e || 'That did not work.').replace(/^./, (x) => x.toUpperCase());
const FRIEND = { booker: 'Booker', lumi: 'Lumi', zuri: 'Zuri', bop: 'Bop' };
export const reviewParam = (search = (typeof location === 'undefined' ? '' : location.search)) => {
  const v = new URLSearchParams(search).get('review'); return v && /^[0-9a-f-]{36}$/i.test(v) ? v : null;
};

function createQueue(ctx) {
  const { c, rpc, lang = 'en', director = false } = ctx;
  const esc = ctx.esc || defaultEsc, live = ctx.live || (() => {}), friendly = ctx.friendly || errText, icon = ctx.icon || (() => '');
  const T = R.rvw(lang);
  let queue = null, network = null, items = [], err = null, msg = '';
  const f = { type: 'all', lang: 'all', status: 'waiting', reviewer: 'all' };
  const when = (iso) => { const t = Date.parse(iso); return Number.isFinite(t) ? new Date(t).toLocaleString(lang === 'es' ? 'es-US' : 'en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''; };
  const plain = (n) => String(n || '').replace(/^TEST\s+/i, '');

  async function load() {
    try {
      [queue, network] = await Promise.all([rpc('center_review_queue', { p_center: c.center_id }), director ? rpc('center_review_network', { p_center: c.center_id, p_limit: 60 }).catch(() => null) : Promise.resolve(null)]);
      items = R.normalize(queue, network); err = null;
    } catch (e) { err = friendly(e); }
    const n = queue ? Number(queue.waiting || 0) : null;
    document.dispatchEvent(new CustomEvent('dops:review', { detail: { waiting: n, mine: items.filter((i) => i.state === 'in_review' && i.can_sign).length } }));
    return queue;
  }
  const find = (key) => items.find((i) => i.key === key || i.id === key);

  // ---- the list ----
  function filtersHtml() {
    const sel = (name, label, opts) => `<label class="dops-f dops-f-inline"><span>${esc(label)}</span><select class="i" name="${name}">${opts.map(([v, l]) => `<option value="${esc(v)}"${f[name] === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
    const types = director ? ['all', ...R.TYPES] : ['all', 'announcement', 'photo_moment'];
    return `<form class="dops-filters" role="search" aria-label="${esc(T.title)}">
      ${sel('type', T.filterType, types.map((t) => [t, T.types[t]]))}
      ${sel('lang', T.filterLang, ['all', 'en', 'es', 'en_es'].map((t) => [t, T.langs[t]]))}
      ${sel('status', T.filterStatus, ['waiting', 'mine', 'changes', 'approved', 'rejected', 'all'].map((t) => [t, T.statuses[t]]))}
      ${sel('reviewer', T.filterReviewer, [['all', T.anyReviewer], ...['supervisor', 'devils_advocate', 'qc', 'qc_es'].map((s) => [`step:${s}`, T.waitingFor(T.steps[s])]), ...(queue?.reviewers || []).map((r) => [r.user_id, plain(r.name)])])}</form>`;
  }
  function rowHtml(i) {
    const bulk = R.bulkable(i);
    const tone = i.state === 'approved' ? 'ok' : i.state === 'in_review' ? (i.can_sign ? 'bop' : 'warn') : 'nc';
    const sub = [T.types[i.type], i.lang === 'en_es' ? 'EN + ES' : i.lang.toUpperCase(), i.source === 'network' ? T.hq : i.room_name || (i.type === 'announcement' ? T.whole : ''), i.author_name ? T.by(plain(i.author_name)) : ''].filter(Boolean).join(' · ');
    const state = i.state === 'in_review' ? T.waitingFor(T.steps[i.waiting_for] || i.waiting_for) : T.statuses[{ approved: 'approved', changes_requested: 'changes', rejected: 'rejected', withdrawn: 'rejected' }[i.state]] || i.state;
    return `<li class="dops-q${bulk ? ' is-bulk' : ''}" data-key="${esc(i.key)}">
      ${bulk ? `<label class="dops-check"><input type="checkbox" name="bulk" value="${esc(i.id)}" data-sha="${esc(i.sha)}"><span class="ffs-sr">${esc(T.select(i.title))}</span></label>` : '<span class="dops-check-sp" aria-hidden="true"></span>'}
      <a class="dops-q-row" href="${esc(ctx.itemHref(i))}" data-open="${esc(i.key)}"><span class="ffs-dot ffs-t-${i.source === 'network' ? 'navy' : i.type === 'photo_moment' ? 'lumi' : 'booker'}">${icon({ announcement: 'announcement', photo_moment: 'heart', kid_activity: 'learn', character_message: 'chat', kid_video: 'video' }[i.type] || 'doc')}</span>
        <span class="ffs-row-t"><b>${esc(i.title)}</b><span>${esc(sub)}</span></span>
        <span class="dops-q-end">${i.risk === 'low' ? `<span class="dops-chip">${esc(T.lowRisk)}</span>` : ''}<span class="dops-chip dops-chip-${tone}">${esc(state)}</span>${icon('arrow')}</span></a></li>`;
  }
  function listHtml() {
    if (err) return `<p class="ffs-nc">${icon('lock')}<span>${esc(err || T.loadErr)}</span></p>`;
    const shown = R.filterItems(items, f, queue);
    const center = shown.filter((i) => i.source === 'center'), net = shown.filter((i) => i.source === 'network');
    const anyBulk = center.some(R.bulkable);
    const nc = network?.counts || {};
    const drafts = Object.values(nc).reduce((t, k) => t + Number(k.draft || 0), 0);
    return `${filtersHtml()}<p class="dops-msg" role="status" aria-live="polite">${esc(msg)}</p>
      <section class="ffs-card dops-card" aria-labelledby="dopsQc"><div class="ffs-ch"><h3 id="dopsQc">${icon('doc')}${esc(T.center)}</h3><span class="dops-chip dops-chip-${queue.waiting ? 'warn' : 'ok'}" id="dopsQcN">${esc(T.count(queue.waiting))}</span></div>
        ${anyBulk ? `<div class="dops-bulkbar"><button type="button" class="ffs-btn ffs-btn-bop" data-bulk disabled>${icon('check')}<span>${esc(T.bulk(0))}</span></button><p class="ffs-note">${esc(T.bulkHint)}</p></div>` : ''}
        ${center.length ? `<ul class="dops-qlist">${center.map(rowHtml).join('')}</ul>` : `<p class="ffs-empty">${esc(f.status === 'waiting' && f.type === 'all' ? T.none : T.noneFilter)}</p>`}
        ${(queue.reviewers || []).length ? '' : `<p class="ffs-nc">${icon('alert')}<span>${esc(T.reviewersNone)}</span></p>`}</section>
      ${director && network ? `<section class="ffs-card dops-card" aria-labelledby="dopsQn"><div class="ffs-ch"><h3 id="dopsQn">${icon('star')}${esc(T.network)}</h3></div><p class="ffs-sub">${esc(T.networkSub)} ${esc(network.reviewer_of_record ? '' : T.readOnly)}</p>
        ${drafts ? `<p class="dops-chip dops-chip-nc">${esc(T.drafts(drafts))}</p>` : ''}
        ${net.length ? `<ul class="dops-qlist">${net.slice(0, 15).map(rowHtml).join('')}</ul>${net.length > 15 ? `<p class="ffs-note">${esc(T.more(net.length - 15))}</p>` : ''}` : `<p class="ffs-empty">${esc(f.status === 'waiting' && f.type === 'all' ? T.netNone : T.noneFilter)}</p>`}</section>` : ''}
      ${director ? setupHtml() : ''}`;
  }
  function setupHtml() {
    const s = queue.settings || {}, staff = ctx.staff || [];
    const rev = new Map((queue.reviewers || []).map((r) => [r.user_id, r]));
    return `<section class="ffs-card dops-card"><details class="dops-details"${(queue.reviewers || []).length ? '' : ' open'}><summary>${icon('gear')}${esc(T.reviewers)} (${(queue.reviewers || []).length})</summary>
      <form class="dops-form dops-settings" data-settings><fieldset><legend>${esc(T.settings)}</legend>
        <label class="dops-cb"><input type="checkbox" name="ann"${s.announcements ? ' checked' : ''}><span>${esc(T.setAnn)}</span></label>
        <label class="dops-cb"><input type="checkbox" name="mom"${s.photo_moments ? ' checked' : ''}><span>${esc(T.setMom)}</span></label></fieldset>
        <button type="submit" class="ffs-btn ffs-btn-soft">${esc(T.saveSettings)}</button></form>
      <ul class="dops-revlist">${staff.map((p) => { const r = rev.get(p.user_id); return `<li><form class="dops-rev" data-rev="${esc(p.user_id)}"><b>${esc(plain(p.name))}</b>
        <span class="dops-revst">${['supervisor', 'devils_advocate', 'qc'].map((st) => `<label class="dops-cb"><input type="checkbox" name="st" value="${st}"${r?.stages?.includes(st) ? ' checked' : ''}><span>${esc(T.steps[st])}</span></label>`).join('')}
        <label class="dops-cb"><input type="checkbox" name="es"${r?.spanish ? ' checked' : ''}><span>${esc(T.spanish)}</span></label></span>
        <button type="submit" class="ffs-btn ffs-btn-soft dops-sm">${esc(T.addReviewer)}</button></form></li>`; }).join('')}</ul></details></section>`;
  }

  // ---- the preview ----
  function previewHtml(i) {
    const b = i.body || {};
    const two = (en, es) => `<div class="dops-pv2"><div lang="en"><h4 class="dops-h4">${esc(T.en_)}</h4>${en}</div><div lang="es"><h4 class="dops-h4">${esc(T.es_)}</h4>${es || `<p class="ffs-note">${esc(T.noEs)}</p>`}</div></div>`;
    const para = (s) => String(s || '').split(/\n+/).filter(Boolean).map((x) => `<p>${esc(x)}</p>`).join('');
    if (i.type === 'announcement') return `<div class="dops-pv dops-pv-ann"><p class="ffs-note">${esc(b.room ? T.room(i.room_name || b.room) : T.whole)}</p>${two(`<h3>${esc(b.title)}</h3>${para(b.body)}`, b.title_es ? `<h3>${esc(b.title_es)}</h3>${para(b.body_es)}` : '')}
      ${(b.files || []).length ? `<p class="ffs-note">${esc(T.files)}: ${b.files.map((x) => esc(x.name || x.path || '')).join(', ')}</p>` : ''}</div>`;
    if (i.type === 'photo_moment') return `<div class="dops-pv dops-pv-mom">${b.media ? `<img class="dops-pv-img" src="${esc(b.media)}" alt="${esc(b.alt || '')}" width="480" height="320" loading="lazy">` : ''}${two(para(b.caption), b.caption_es ? para(b.caption_es) : '')}</div>`;
    if (i.type === 'kid_activity') return `<div class="dops-pv dops-pv-act" lang="${esc(i.lang)}"><div class="dops-actcard">${b.friend ? `<img src="img/friends/${esc(b.friend)}-480.webp" alt="" width="72" height="72" loading="lazy">` : ''}<div><h3>${esc(b.title)}</h3>
      <p>${esc(b.prompt || '')}</p>${(b.steps || []).length ? `<h4 class="dops-h4">${esc(T.steps_)}</h4><ol>${b.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>` : ''}
      <p class="ffs-note">${[b.friend ? T.friend(FRIEND[b.friend] || b.friend) : '', b.minutes_estimate ? T.minutes(b.minutes_estimate) : '', b.mode || ''].filter(Boolean).map(esc).join(' · ')}</p></div></div></div>`;
    if (i.type === 'character_message') return `<div class="dops-pv dops-pv-msg" lang="${esc(i.lang)}"><h3>${esc(b.title)}</h3>${(b.variants || []).map((v) => `<div class="dops-say"><img src="img/friends/${esc(v.friend)}-480.webp" alt="" width="48" height="48" loading="lazy"><p><b>${esc(FRIEND[v.friend] || v.friend)}</b> ${esc(v.script || '')}</p></div>`).join('')}</div>`;
    if (i.type === 'kid_video') {
      const script = b.script_en || b.script_es || b.script || '';
      return `<div class="dops-pv dops-pv-vid"><h3>${esc(b.title || b.title_en || '')}</h3>
        ${i.media?.video_url ? `<video controls preload="metadata" width="480"${i.media.poster_url ? ` poster="${esc(i.media.poster_url)}"` : ''}><source src="${esc(i.media.video_url)}">${i.media.captions_url ? `<track kind="captions" src="${esc(i.media.captions_url)}" srclang="${esc(i.lang)}" label="${esc(T.captions)}" default>` : ''}</video>`
          : `<div class="dops-vidph" role="img" aria-label="${esc(T.noClip)}">${b.friend ? `<img src="img/friends/${esc(b.friend)}-480.webp" alt="" width="120" height="120" loading="lazy">` : ''}<p class="dops-cap">${esc(script)}</p></div><p class="ffs-note">${esc(T.noClip)}</p>`}
        <h4 class="dops-h4">${esc(T.transcript)}</h4><p>${esc(script)}</p>${b.title_es ? `<p lang="es" class="ffs-note">${esc(b.title_es)}</p>` : ''}</div>`;
    }
    return `<pre class="dops-pre">${esc(JSON.stringify(b, null, 2))}</pre>`;
  }
  function trailHtml(i) {
    return `<ol class="dops-trail" aria-label="${esc(T.audit)}">${R.stepsTrail(i, lang).map((s) => `<li class="is-${s.state}"${s.state === 'now' ? ' aria-current="step"' : ''}><span>${esc(s.label)}</span></li>`).join('')}</ol>`;
  }
  function auditHtml(events) {
    return `<h4 class="dops-h4">${esc(T.audit)}</h4><ol class="dops-audit">${(events || []).map((e) => `<li><b>${esc(T.actions[e.action] || e.action)}</b>${e.step ? ` · ${esc(T.steps[e.step] || e.step)}` : ''}${e.name ? ` · ${esc(plain(e.name))}` : ''} · <time>${esc(when(e.at))}</time>${e.bulk ? ` · ${esc(T.bulkMark)}` : ''}${e.version ? ` · ${esc(T.version(e.version))}` : ''}${e.on_this_text === false ? ` · ${esc(T.otherText)}` : ''}${e.note ? `<p>“${esc(e.note)}”</p>` : ''}</li>`).join('') || '<li>—</li>'}</ol>`;
  }
  async function detail(key) {
    let i = find(key); if (!i) return null;
    let full = i;
    if (i.source === 'center') { try { full = { ...i, ...(await rpc('center_review_detail', { p_center: c.center_id, p_item: i.id })), source: 'center', key: i.key }; } catch (e) { return { title: i.title, html: `<p class="ffs-nc">${esc(friendly(e))}</p>` }; } }
    const canAct = full.state === 'in_review' && full.can_sign;
    const why = full.state !== 'in_review' ? '' : full.mine ? T.own : full.source === 'network' && !network?.reviewer_of_record ? T.readOnly : !canAct ? T.notYours(T.steps[full.waiting_for] || '') : T.youSign;
    const html = `${trailHtml(full)}<p class="ffs-note">${esc(T.types[full.type])} · ${esc(full.source === 'network' ? T.hq : T.center)}${full.signers?.length ? ` · ${esc(T.signed(full.signers.map(plain).join(', ')))}` : ''}</p>
      ${full.released === false && full.state === 'approved' ? `<p class="ffs-nc">${esc(T.changedText)}</p>` : ''}
      ${previewHtml(full)}
      ${canAct ? `<form class="dops-form dops-act" data-act="${esc(full.key)}"><label class="dops-f"><span>${esc(T.note)}</span><textarea class="i" name="note" rows="2" maxlength="1000"></textarea></label>
        <p class="dops-msg" role="status"></p><div class="dops-formacts"><button class="ffs-btn ffs-btn-bop" type="submit" name="a" value="approve">${icon('check')}${esc(T.approve)}</button>
        <button class="ffs-btn ffs-btn-soft" type="button" data-a="request_changes">${esc(T.changes)}</button><button class="ffs-btn ffs-btn-soft dops-danger" type="button" data-a="reject">${esc(T.reject)}</button></div></form>`
        : why ? `<p class="ffs-note dops-why">${icon('lock')} ${esc(why)}</p>` : ''}
      ${full.mine && full.state === 'changes_requested' && full.type === 'announcement' ? resubmitHtml(full) : ''}
      ${auditHtml(full.events)}`;
    return { title: full.title, html, bind: (el) => bindDetail(el, full) };
  }
  function resubmitHtml(i) {
    const b = i.body || {};
    return `<form class="dops-form" data-resubmit="${esc(i.id)}"><h4 class="dops-h4">${esc(T.edit)}</h4>
      <label class="dops-f"><span>${esc(T.titleEn)}</span><input class="i" name="title" maxlength="200" value="${esc(b.title || '')}" required></label>
      <label class="dops-f"><span>${esc(T.bodyEn)}</span><textarea class="i" name="body" rows="3" required>${esc(b.body || '')}</textarea></label>
      <label class="dops-f"><span>${esc(T.titleEs)}</span><input class="i" name="title_es" maxlength="200" value="${esc(b.title_es || '')}"></label>
      <label class="dops-f"><span>${esc(T.bodyEs)}</span><textarea class="i" name="body_es" rows="3">${esc(b.body_es || '')}</textarea></label>
      <p class="dops-msg" role="status"></p><button class="ffs-btn ffs-btn-bop" type="submit">${esc(T.resubmit)}</button></form>`;
  }
  async function act(i, action, note) {
    if (i.source === 'center') return rpc('center_review_act', { p_center: c.center_id, p_item: i.id, p_action: action, p_sha: i.sha, p_note: note || null });
    // network: the HQ pipeline (reviewers of record only; the database decides)
    if (action === 'reject') return rpc('content_retire', { p_version: i.id, p_comment: note });
    if (action === 'request_changes') return rpc('content_act', { p_version: i.id, p_action: 'send_back', p_sha: i.sha, p_comment: note });
    if (i.net_state === 'writer_done') await rpc('content_act', { p_version: i.id, p_action: 'claim', p_sha: i.sha, p_comment: null });
    return rpc('content_act', { p_version: i.id, p_action: 'pass', p_sha: i.sha, p_comment: note || null });
  }
  function bindDetail(el, i) {
    const form = el.querySelector('form[data-act]');
    if (form) {
      const go = async (action) => {
        const note = form.note.value.trim(), out = form.querySelector('.dops-msg');
        if (action !== 'approve' && note.length < 3) { out.textContent = T.note; form.note.focus(); return; }
        form.querySelectorAll('button').forEach((b) => { b.disabled = true; });
        try {
          const r = await act(i, action, note);
          msg = action === 'reject' ? T.rejected : action === 'request_changes' ? T.changesSent : r?.state === 'approved' || i.source === 'network' && r?.state === 'approved' ? T.approved : r?.waiting_for ? T.approvedStep(T.steps[r.waiting_for]) : T.approved;
          await load(); ctx.afterAction?.(msg);
        } catch (e) { out.textContent = friendly(e); form.querySelectorAll('button').forEach((b) => { b.disabled = false; }); }
      };
      form.addEventListener('submit', (e) => { e.preventDefault(); go('approve'); });
      form.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => go(b.dataset.a)));
    }
    const rs = el.querySelector('form[data-resubmit]');
    if (rs) rs.addEventListener('submit', async (e) => {
      e.preventDefault();
      try { await rpc('center_review_resubmit', { p_center: c.center_id, p_item: i.id, p_changes: { title: rs.title.value, body: rs.body.value, title_es: rs.title_es.value, body_es: rs.body_es.value } });
        msg = T.saved; await load(); ctx.afterAction?.(msg); } catch (err2) { rs.querySelector('.dops-msg').textContent = friendly(err2); }
    });
  }
  function bindList(root, rerender) {
    root.querySelector('.dops-filters')?.addEventListener('change', (e) => { if (e.target.name in f) { f[e.target.name] = e.target.value; msg = ''; rerender(`.dops-filters [name="${e.target.name}"]`); } });
    const bulkBtn = root.querySelector('[data-bulk]');
    const sync = () => { if (!bulkBtn) return; const n = root.querySelectorAll('input[name=bulk]:checked').length; bulkBtn.disabled = !n; bulkBtn.querySelector('span').textContent = T.bulk(n); };
    root.addEventListener('change', (e) => { if (e.target.name === 'bulk') sync(); });
    bulkBtn?.addEventListener('click', async () => {
      const picked = [...root.querySelectorAll('input[name=bulk]:checked')].map((x) => ({ id: x.value, sha: x.dataset.sha }));
      bulkBtn.disabled = true;
      try { const r = await rpc('center_review_bulk', { p_center: c.center_id, p_items: picked, p_note: null }); msg = T.bulkDone(r.approved.length, r.skipped.length); }
      catch (e) { msg = friendly(e); }
      await load(); rerender(); live(msg);
    });
    root.querySelector('form[data-settings]')?.addEventListener('submit', async (e) => {
      e.preventDefault(); const fm = e.currentTarget;
      try { await rpc('center_review_settings_set', { p_center: c.center_id, p_announcements: fm.ann.checked, p_photo_moments: fm.mom.checked }); msg = T.saved; } catch (err2) { msg = friendly(err2); }
      await load(); rerender(); live(msg);
    });
    root.querySelectorAll('form[data-rev]').forEach((fm) => fm.addEventListener('submit', async (e) => {
      e.preventDefault();
      try { await rpc('center_review_reviewer_set', { p_center: c.center_id, p_user: fm.dataset.rev, p_stages: [...fm.querySelectorAll('input[name=st]:checked')].map((x) => x.value), p_spanish: fm.es.checked, p_name: null }); msg = T.saved; }
      catch (err2) { msg = friendly(err2); }
      await load(); rerender(); live(msg);
    }));
  }
  return { load, listHtml, bindList, detail, find, items: () => items, queue: () => queue, waiting: () => (queue ? Number(queue.waiting || 0) : null), msg: (m) => { if (m != null) msg = m; return msg; }, T };
}

// ==================================================================================================================================
// Director: Content > Review. ctx = { c, rpc, esc, lang, live, friendly, icon, shell(), staff }
// ==================================================================================================================================
export function createReview(ctx) {
  let root = null, details = new Map();
  const q = createQueue({ ...ctx, director: true,
    itemHref: (i) => `?view=content&tab=review&drawer=${i.source === 'center' ? 'review' : 'netreview'}:${i.id}`,
    afterAction: (m) => { render(); ctx.live?.(m); ctx.shell?.()?.closeDrawer(); } });
  function render(focusSel) { if (!root) return; root.innerHTML = q.listHtml(); q.bindList(root, render); if (focusSel) root.querySelector(focusSel)?.focus(); }
  const panelHtml = () => `<div class="dops dops-review" id="dopsReview">${q.queue() || q.items().length ? q.listHtml() : `<p class="ffs-nc">${esc0(q.T.loadErr)}</p>`}</div>`;
  const esc0 = ctx.esc || defaultEsc;
  async function prefetch(kind) {   // the drawer is synchronous: a deep link's item detail is fetched before the shell opens it
    const [k, id] = kind.split(':'); if (!id) return;
    const i = q.find(k === 'review' ? `c:${id}` : `n:${id}`); if (!i) return;
    details.set(kind, await q.detail(i.key));
  }
  function bind(el) {
    root = el.querySelector('#dopsReview') || el; q.bindList(root, render);
    if (root.dataset.bound) return; root.dataset.bound = '1';
    root.addEventListener('click', async (e) => {
      const a = e.target.closest('a[data-open]'); if (!a || e.metaKey || e.ctrlKey) return;
      e.preventDefault(); const i = q.find(a.dataset.open); if (!i) return;
      const kind = `${i.source === 'center' ? 'review' : 'netreview'}:${i.id}`;
      await prefetch(kind); ctx.shell?.()?.openDrawer(kind, a);
    });
  }
  function drawer(kind) { const d = details.get(kind); return d || null; }
  return { load: q.load, panelHtml, bind, drawer, prefetch, count: () => q.waiting(), queue: q.queue };
}

// ==================================================================================================================================
// Staff (named reviewers, and authors following their items): teacher Me > Content review
// ==================================================================================================================================
export async function mountReviewQueue(el, ctx) {
  if (!el) return null;
  let openKey = reviewParam() ? `c:${reviewParam()}` : null, firstFocus = true;
  const esc = ctx.esc || defaultEsc;
  const q = createQueue({ ...ctx, director: false, itemHref: (i) => `?view=me&tab=review&review=${i.id}`, afterAction: async (m) => { q.msg(m); ctx.live?.(m); openKey = null; await draw(); } });
  async function draw(focusSel) {
    el.hidden = false;
    const d = openKey ? await q.detail(openKey) : null;
    el.innerHTML = `<div class="dops dops-review dops-review-staff"><h3 class="dops-h">${esc(q.T.title)}</h3><p class="ffs-sub">${esc(q.T.sub)}</p>
      ${d ? `<section class="ffs-card dops-card dops-inline" aria-labelledby="dopsInlH"><div class="ffs-ch"><h3 id="dopsInlH" tabindex="-1">${esc(d.title)}</h3><button type="button" class="ffs-btn ffs-btn-soft dops-sm" data-back>${esc(ctx.lang === 'es' ? 'Volver a la lista' : 'Back to the list')}</button></div>${d.html}</section>` : q.listHtml()}</div>`;
    if (d) { d.bind?.(el); el.querySelector('[data-back]').addEventListener('click', () => { openKey = null; draw(); }); if (firstFocus || focusSel) el.querySelector('#dopsInlH')?.focus({ preventScroll: false }); firstFocus = false; }
    else q.bindList(el, draw);
    if (focusSel) el.querySelector(focusSel)?.focus();
    el.querySelectorAll('a[data-open]').forEach((a) => a.addEventListener('click', (e) => { if (e.metaKey || e.ctrlKey) return; e.preventDefault(); openKey = a.dataset.open; draw('#dopsInlH'); }));
  }
  await q.load();
  await draw();
  return { reload: async () => { await q.load(); await draw(); } };
}
