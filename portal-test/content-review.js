// /hq/content: the content reviewers' queue (N27/N28, hub/CONTENT_WORKFLOW.md). HQ content reviewers of record, signed in with two-step
// verification, move every piece of child- and family-facing content through draft -> writer done -> supervisor review -> devil's
// advocate review -> QC -> approved (published). The page shows the queue, one version with its diff against the previous APPROVED
// version and the English and Spanish side by side, the full approval audit, and the actions the database says this person may take.
// The database decides everything (content_queue / content_detail / content_act / content_publish ...); the buttons only mirror it.
// Staff page: English source text (the Spanish catalog translates it on screen when the reviewer reads Spanish).

import { ACTION_LABEL, KINDS, PIPELINE, STAGE_LABEL, STATE_LABEL, bodyDiff, diffHtml, flatten, sideBySide, stepIndex, waitingFor } from './content-review-core.js';

export async function viewContentReview(ctx) {
  const { page, esc, rpc, friendly, go, live } = ctx;
  const q = new URLSearchParams(location.search);
  const filt = { kind: q.get('kind') || '', state: q.get('state') || '', lang: q.get('lang') || '', search: q.get('q') || '' };
  page('<div class="wrap"><p class="loading">Opening the content queue…</p></div>', 'Content review', { english: true });
  let data;
  try {
    data = await rpc('content_queue', { p_kind: filt.kind || null, p_state: filt.state || null, p_lang: filt.lang || null, p_search: filt.search || null, p_limit: 200 });
  } catch (e) {
    return page(`<div class="wrap narrow"><div class="card" id="contentReview"><h1>Content review</h1><p class="msg bad" role="alert">${esc(friendly(e))}</p>
      <p class="small muted">This page is for HQ content reviewers of record, signed in with two-step verification (Your account → Two-step verification).</p></div></div>`, 'Content review', { english: true });
  }
  const me = data.me;
  const opt = (v, cur, label) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(label)}</option>`;
  const counts = data.counts || {};
  page(`<div class="wrap cr" id="contentReview">
    <div class="card cr-head"><h1>Content review</h1>
      <p class="muted">Nothing reaches a child or a family until it passes writer, supervisor, devil's advocate and QC, signed by at least two different named people.
        Approving publishes the version; any approved version can be published again (rollback).</p>
      ${me ? `<p id="crMe">Signed in as <b>${esc(me.name)}</b>: ${me.stages.map((s) => `<span class="chip">${esc(STAGE_LABEL[s] || s)}</span>`).join(' ')}${me.spanish ? ' <span class="chip">Spanish</span>' : ''}</p>`
        : `<p class="msg warn" id="crMe" role="status">Read only: you are not a content reviewer of record. ${data.reviewers ? '' : 'No reviewers of record are named yet, so nothing can be approved.'}</p>`}
      <p class="cr-counts">${PIPELINE.concat(['superseded', 'retired']).map((s) => `<a class="chip${filt.state === s ? ' gold' : ''}" href="?state=${s}" data-nav>${esc(STATE_LABEL[s])}: ${Number(counts[s] || 0)}</a>`).join(' ')}</p>
    </div>
    <form class="card cr-filters" id="crFilters" novalidate>
      <label class="f"><span>Kind</span><select class="i" name="kind">${opt('', filt.kind, 'All kinds')}${Object.entries(KINDS).map(([k, l]) => opt(k, filt.kind, l)).join('')}</select></label>
      <label class="f"><span>State</span><select class="i" name="state">${opt('', filt.state, 'Open (not superseded or retired)')}${Object.entries(STATE_LABEL).map(([k, l]) => opt(k, filt.state, l)).join('')}</select></label>
      <label class="f"><span>Language</span><select class="i" name="lang">${opt('', filt.lang, 'English and Spanish')}${opt('en', filt.lang, 'English')}${opt('es', filt.lang, 'Spanish')}</select></label>
      <label class="f"><span>Search</span><input class="i" name="q" value="${esc(filt.search)}" maxlength="80"></label>
      <button class="btn navy small" type="submit">Show</button></form>
    <div class="cr-body">
      <section class="card cr-list"><h2>Queue <span class="small muted">(${data.items.length})</span></h2>
        ${data.items.length ? `<ul class="cr-items" id="crItems">${data.items.map((it) => `<li><a href="?${new URLSearchParams({ ...cleanFilt(filt), v: it.id })}" data-v="${esc(it.id)}" class="cr-item${q.get('v') === it.id ? ' on' : ''}">
          <span class="cr-t">${esc(it.title)}</span>
          <span class="small muted">${esc(KINDS[it.kind] || it.kind)} · ${esc(it.key)} · ${it.lang === 'es' ? 'Español' : 'English'} · v${it.version}${it.live_version ? ` · live v${it.live_version}` : ''}</span>
          <span class="chip ${it.state === 'approved' ? 'ok' : it.state === 'draft' ? '' : 'warn'}">${esc(STATE_LABEL[it.state] || it.state)}</span>
          ${waitingFor(it.state) ? `<span class="small">Next: ${esc(STAGE_LABEL[waitingFor(it.state)])}</span>` : ''}</a></li>`).join('')}</ul>`
          : '<p class="muted">Nothing here. Content enters the queue when a snapshot is taken (node scripts/content-import.mjs).</p>'}
      </section>
      <section class="card cr-detail" id="crDetail" aria-live="polite">${q.get('v') ? '<p class="loading">Opening…</p>' : '<p class="muted">Pick a version to review it.</p>'}</section>
    </div></div>`, 'Content review', { english: true });

  document.getElementById('crFilters').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const p = new URLSearchParams(cleanFilt({ kind: f.get('kind'), state: f.get('state'), lang: f.get('lang'), search: f.get('q') }));
    go(`/hq/content${p.toString() ? `?${p}` : ''}`);
  });
  document.getElementById('crItems')?.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-v]'); if (!a) return;
    e.preventDefault(); history.replaceState(null, '', a.getAttribute('href'));
    document.querySelectorAll('.cr-item').forEach((x) => x.classList.toggle('on', x === a));
    detail(a.dataset.v);
  });
  if (q.get('v')) detail(q.get('v'));

  async function detail(id) {
    const box = document.getElementById('crDetail');
    let d;
    try { d = await rpc('content_detail', { p_version: id }); } catch (e) { box.innerHTML = `<p class="msg bad" role="alert">${esc(friendly(e))}</p>`; return; }
    const v = d.version;
    const prev = d.previous_approved;
    const other = d.other_lang;
    const en = v.lang === 'en' ? v.body : other?.body;
    const es = v.lang === 'es' ? v.body : other?.body;
    const step = stepIndex(v.state);
    const rows = bodyDiff(prev?.body ?? null, v.body);
    const can = d.can || {};
    box.innerHTML = `<h2 id="crTitle">${esc(v.title)}</h2>
      <p class="small muted">${esc(KINDS[v.kind] || v.kind)} · <code>${esc(v.item_key)}</code> · ${v.lang === 'es' ? 'Español' : 'English'} · version ${v.version}${v.source_version ? ` (source v${v.source_version})` : ''}
        · text SHA-256 <code class="cr-sha">${esc(v.body_sha.slice(0, 12))}…</code></p>
      <ol class="cr-steps" aria-label="Pipeline">${PIPELINE.map((s, i) => `<li class="${i < step ? 'done' : i === step ? 'now' : ''}">${esc(STATE_LABEL[s])}</li>`).join('')}</ol>
      ${['superseded', 'retired'].includes(v.state) ? `<p class="msg warn">This version is ${esc(v.state)}.</p>` : ''}
      ${d.live ? `<p class="small">Live now: version ${d.live.version}${d.live.id === v.id ? ' (this one)' : ''}.</p>` : '<p class="small">Nothing is live for this item: children and families do not see it.</p>'}
      ${d.writer_is_me ? '<p class="msg warn small">You wrote this version: a different reviewer must do every review step.</p>' : ''}
      <div class="cr-actions" id="crActions">
        ${can.writer_done ? '<button class="btn navy small" type="button" data-act="writer_done">Writer done</button>' : ''}
        ${can.claim ? '<button class="btn navy small" type="button" data-act="claim">Pick up for supervisor review</button>' : ''}
        ${can.pass ? `<button class="btn gold small" type="button" data-act="pass">${v.state === 'qc' ? 'Pass QC and approve' : 'Pass to the next step'}</button>` : ''}
        ${can.send_back ? '<button class="btn soft small" type="button" data-act="send_back">Send back to the writer</button>' : ''}
        ${can.publish ? '<button class="btn gold small" type="button" data-act="publish">Publish this version</button>' : ''}
        ${can.unpublish ? '<button class="btn soft small" type="button" data-act="unpublish">Take down</button>' : ''}
        ${can.retire ? '<button class="btn link small" type="button" data-act="retire">Retire</button>' : ''}
      </div>
      <form id="crCommentForm" hidden novalidate><label class="f"><span id="crCommentLabel">Comment</span><textarea class="i" id="crComment" rows="3" maxlength="2000"></textarea></label>
        <div class="cta-row"><button class="btn navy small" type="submit">Confirm</button><button class="btn link small" type="button" id="crCommentX">Cancel</button></div></form>
      <p class="small msg" id="crMsg" role="status"></p>
      <h3>${prev ? `Changes since approved version ${prev.version}` : 'The text (no earlier approved version)'}</h3>
      <dl class="cr-diff" id="crDiff">${rows.map((r) => `<div class="cr-row cr-${r.status}"><dt>${esc(r.label)}</dt><dd>${diffHtml(esc, r.diff).replace(/\n/g, '<br>')}</dd></div>`).join('')}</dl>
      <h3>English and Spanish side by side</h3>
      ${en && es ? `<table class="cr-sbs" id="crSideBySide"><thead><tr><th scope="col">Field</th><th scope="col" lang="en">English${v.lang === 'en' ? ' (this version)' : other ? ` (v${other.version}, ${esc(STATE_LABEL[other.state] || other.state)})` : ''}</th>
          <th scope="col" lang="es">Español${v.lang === 'es' ? ' (this version)' : other ? ` (v${other.version}, ${esc(STATE_LABEL[other.state] || other.state)})` : ''}</th></tr></thead>
          <tbody>${sideBySide(en, es).map(([l, a, b]) => `<tr><th scope="row">${esc(l)}</th><td lang="en">${esc(a).replace(/\n/g, '<br>')}</td><td lang="es">${esc(b).replace(/\n/g, '<br>')}</td></tr>`).join('')}</tbody></table>`
        : `<p class="muted small" id="crSideBySide">${v.lang === 'en' ? 'No Spanish translation in the queue for this item yet.' : 'No English version found.'}</p>`}
      <h3>Versions</h3>
      <ul class="cr-versions">${(d.versions || []).map((x) => `<li>v${x.version} · ${esc(STATE_LABEL[x.state] || x.state)}${x.live ? ' · <b>live</b>' : ''}
        ${x.id === v.id ? ' (open)' : ` <a href="?v=${esc(x.id)}" data-v="${esc(x.id)}" class="cr-vlink">open</a>`}</li>`).join('')}</ul>
      <h3>Approval audit</h3>
      <ol class="cr-events" id="crEvents">${(d.events || []).map((e) => `<li><b>${esc(ACTION_LABEL[e.action] || e.action)}</b>${e.stage && e.stage !== 'system' ? ` (${esc(STAGE_LABEL[e.stage] || e.stage)})` : ''}
        · ${esc(e.name || (e.stage === 'system' ? 'the import script' : 'unknown'))} · ${esc(new Date(e.at).toLocaleString())}${e.aal ? ` · ${esc(e.aal.toUpperCase())}` : ''}
        ${e.on_this_text ? '' : ' · <span class="chip warn">earlier text</span>'}${e.comment ? `<br><span class="small">“${esc(e.comment)}”</span>` : ''}</li>`).join('') || '<li class="muted">No events yet.</li>'}</ol>`;
    box.querySelectorAll('.cr-vlink').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); history.replaceState(null, '', a.getAttribute('href')); detail(a.dataset.v); }));
    const form = document.getElementById('crCommentForm');
    let pending = null;
    const run = async (act, comment) => {
      const m = document.getElementById('crMsg');
      try {
        if (act === 'publish') await rpc('content_publish', { p_version: v.id, p_comment: comment || null });
        else if (act === 'unpublish') await rpc('content_unpublish', { p_kind: v.kind, p_key: v.item_key, p_lang: v.lang, p_comment: comment });
        else if (act === 'retire') await rpc('content_retire', { p_version: v.id, p_comment: comment });
        else await rpc('content_act', { p_version: v.id, p_action: act, p_sha: v.body_sha, p_comment: comment || null });
        live('Saved'); m.className = 'small msg ok'; m.textContent = 'Saved.';
        detail(v.id);
      } catch (e) { m.className = 'small msg bad'; m.textContent = friendly(e); }
    };
    document.getElementById('crActions').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-act]'); if (!b) return;
      const act = b.dataset.act;
      if (['send_back', 'unpublish', 'retire'].includes(act) || (act === 'pass' && v.state === 'devils_advocate_review')) {
        pending = act; form.hidden = false;
        document.getElementById('crCommentLabel').textContent = act === 'send_back' ? 'What needs to change (required)' : act === 'pass' ? 'Your argument and why it still passes (optional)' : 'Why (required)';
        document.getElementById('crComment').focus();
        return;
      }
      run(act, null);
    });
    form.addEventListener('submit', (e) => { e.preventDefault(); form.hidden = true; run(pending, document.getElementById('crComment').value); });
    document.getElementById('crCommentX').addEventListener('click', () => { form.hidden = true; pending = null; });
  }
}

function cleanFilt(f) {
  const o = {};
  if (f.kind) o.kind = f.kind; if (f.state) o.state = f.state; if (f.lang) o.lang = f.lang; if (f.search) o.q = f.search;
  return o;
}

// for tests: the fields the detail view shows, in order
export const fieldsOf = (body) => flatten(body).map(([l]) => l);
