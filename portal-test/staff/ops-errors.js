// /ops/errors: the HQ operations view of captured errors (N4; docs/ops/ERROR_TRACKING.md). HQ staff in a two-step session only
// (app_errors_list refuses everyone else). Everything shown was scrubbed before it was stored: no child, person, email, token or id.
const SOURCES = [['', 'All sources'], ['browser', 'Browsers'], ['web_server', 'Hub web server'], ['worker', 'Worker'], ['intake', 'Intake gateway']];

export async function viewOpsErrors({ s, page, rpc, esc, go }) {
  if (!s) return go('/', true);
  const q = new URLSearchParams(location.search);
  const days = Math.min(90, Math.max(1, Number(q.get('days')) || 7));
  const source = SOURCES.some(([k]) => k && k === q.get('source')) ? q.get('source') : '';
  let rows;
  try {
    rows = await rpc('app_errors_list', { p_days: days, p_source: source || null });
  } catch (e) {
    return page(`<div class="wrap" id="opsErrors"><h1>Errors</h1><p class="msg err" role="alert">This page is for Futures Friends HQ, signed in with
      two-step verification. ${esc(e.message || '')}</p></div>`, 'Errors', { english: true });
  }
  const when = (t) => new Date(t).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  const filters = `<form class="cta-row" id="opsFilter">
      <label class="f"><span>Source</span><select class="i" id="opsSource">${SOURCES.map(([k, l]) => `<option value="${k}"${k === source ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
      <label class="f"><span>Days</span><select class="i" id="opsDays">${[1, 7, 30, 90].map((d) => `<option${d === days ? ' selected' : ''}>${d}</option>`).join('')}</select></label>
    </form>`;
  const list = rows.length ? `<ul class="list" id="opsList">${rows.map((r) => `<li class="ops-err" data-fp="${esc(r.fingerprint.slice(0, 12))}">
      <span class="who"><b>${esc(r.kind)}: ${esc(r.message)}</b>
      <span class="small muted">${esc(r.source)} · ${esc(String(r.total))} in ${esc(String(r.days))} day(s), ${esc(String(r.today))} today · last ${esc(when(r.last_at))} · first ${esc(when(r.first_at))}${r.route ? ` · ${esc(r.route)}` : ''}${r.agent ? ` · ${esc(r.agent)}` : ''}${r.release ? ` · release ${esc(r.release)}` : ''}</span>
      ${r.stack ? `<details><summary class="small">Stack</summary><pre class="small wrap">${esc(r.stack)}</pre></details>` : ''}</span></li>`).join('')}</ul>`
    : '<p class="empty" id="opsList">No errors in this period.</p>';
  page(`<div class="wrap" id="opsErrors"><h1>Errors</h1>
    <p class="small muted">Grouped by kind and message; kept 30 to 90 days (platform switch app_errors). Nothing here identifies a child or a person.</p>
    ${filters}${list}</div>`, 'Errors', { english: true });
  const apply = () => go(`/ops/errors?days=${document.getElementById('opsDays').value}${document.getElementById('opsSource').value ? `&source=${document.getElementById('opsSource').value}` : ''}`);
  document.getElementById('opsSource').addEventListener('change', apply);
  document.getElementById('opsDays').addEventListener('change', apply);
}
