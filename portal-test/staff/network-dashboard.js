// Futures Hub front-end: the HQ network dashboard (/hq) and the organization dashboard (/c/<slug>/organization) (N23,
// migration 20261029230000_network_dashboards.sql, docs/ops/NETWORK_DASHBOARDS.md). Mounted by app.js with its helpers.
//   /hq                         HQ at two-step: one row per center, counts and rates only; "fewer than 5" where a cell is hidden; no
//                               child, no money (the database decides; this page only shows what hq_network_metrics returns)
//   /c/<slug>/organization      an owner of the center's organization: every center of the organization with its financials
// Staff text is English; the shared Spanish catalog (i18n-es-ui.js) translates it on screen when Spanish is on.

export function mountNetwork(h) {
  const { esc, rpc, page, friendly, go } = h;
  const pct = (v) => (v == null ? '—' : `${v}%`);
  const num = (v) => (v == null ? '—' : String(v));
  const money = (c) => (c == null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(c) / 100));
  const hidden = (row, key) => (row.suppressed || []).includes(key);
  const cell = (row, key, fmt) => (hidden(row, key) ? '<span class="chip" title="Fewer than 5: hidden">under 5</span>' : esc(fmt(row[key])));

  async function viewHq(s) {
    if (!s) return go('/', true);
    const days = Number(new URLSearchParams(location.search).get('days')) || 30;
    let d;
    try { d = await rpc('hq_network_metrics', { p_days: days }); } catch (err) {
      return page(`<div class="wrap" id="hqDash"><div class="card"><h1>Network dashboard</h1><p class="msg bad" role="status">${esc(friendly(err))}</p>
        <p class="small muted">This page is for Futures Friends HQ staff signed in with two-step verification.</p></div></div>`, 'Network dashboard', { english: true });
    }
    page(`<div class="wrap" id="hqDash"><div class="card"><h1>Network dashboard</h1>
      <p class="small">The last ${esc(d.days)} days at every center: counts and rates only. A number from 1 to 4 is hidden (shown as "under 5"), and a center with fewer than ${esc(d.min_cell)} children shows no child figures, so no child can be picked out. No financial figures: they belong to each center.</p>
      <p class="row small"><a class="btn soft small" href="/hq?days=7" data-nav>7 days</a> <a class="btn soft small" href="/hq?days=30" data-nav>30 days</a> <a class="btn soft small" href="/hq?days=90" data-nav>90 days</a></p></div>
      <div class="card"><h2>Network</h2><p>${esc(num(d.network.centers))} centers · ${esc(num(d.network.enrolled))} children enrolled · attendance ${esc(pct(d.network.attendance_rate))} · ${esc(num(d.network.reports_sent))} daily reports sent · ${esc(num(d.network.incidents))} incidents</p>
        <p class="mini muted">Totals of the cells shown only; hidden cells are not included.</p></div>
      <div class="card"><h2>Centers</h2><div class="tablewrap"><table class="t" id="hqCenters"><thead><tr><th>Center</th><th>State</th><th>Status</th><th>Enrolled</th><th>Attendance</th><th>Daily reports sent</th><th>Skill-check coverage</th><th>Incidents</th><th>Staff compliance</th></tr></thead><tbody>
        ${d.centers.map((r) => `<tr data-center="${esc(r.center_id)}"><td>${esc(r.center)}</td><td>${esc(r.state || '—')}</td><td>${esc(r.status)}</td><td>${cell(r, 'enrolled', num)}</td><td>${cell(r, 'attendance_rate', pct)}</td>
          <td>${cell(r, 'reports_sent', num)}</td><td>${cell(r, 'skill_check_coverage', pct)}</td><td>${cell(r, 'incidents', num)}</td><td>${cell(r, 'staff_compliance_score', pct)}</td></tr>`).join('')}
      </tbody></table></div></div>
      <div class="card" id="hqInquiries"><h2>Website inquiries for HQ</h2><p class="small">General questions, program quotes and partner requests from the website. Family tour and enrollment requests go to each center's own enrollment pipeline.</p>
        <div id="hqInqList"><p class="small muted">Loading…</p></div><p class="msg" id="hqInqMsg" role="status"></p></div></div>`, 'Network dashboard', { english: true });
    const KIND = { contact: 'General question', quote: 'Program quote', partner: 'Partner request' };
    async function inquiries() {
      const box = document.getElementById('hqInqList');
      let list;
      try { list = await rpc('hq_inquiries_list', { p_status: 'open', p_limit: 100 }); } catch (err) { box.innerHTML = `<p class="msg bad">${esc(friendly(err))}</p>`; return; }
      box.innerHTML = list.length ? `<ul class="list">${list.map((q) => `<li data-inq="${esc(q.id)}"><span class="who"><b>${esc(q.name)}</b>
          <span class="small muted">${esc(KIND[q.kind] || q.kind)} · ${esc(q.intake_ref)} · ${esc(new Date(q.created_at).toLocaleDateString())}${q.org ? ` · ${esc(q.org)}` : ''}${q.zip ? ` · ${esc(q.zip)}` : ''}</span>
          <span class="small">${esc(q.email || '')} ${esc(q.phone || '')}</span>${q.message ? `<span class="small" translate="no">${esc(q.message)}</span>` : ''}</span>
          <button class="btn soft small" type="button" data-close="${esc(q.id)}">Mark handled</button></li>`).join('')}</ul>` : '<p class="empty">No open inquiries.</p>';
      box.querySelectorAll('[data-close]').forEach((b) => { b.onclick = async () => {
        try { await rpc('hq_inquiry_close', { p_id: b.dataset.close, p_status: 'handled' }); document.getElementById('hqInqMsg').textContent = 'Marked handled.'; inquiries(); }
        catch (err) { document.getElementById('hqInqMsg').textContent = friendly(err); }
      }; });
    }
    inquiries();
  }

  async function viewOrg(c, shell, orgs) {
    const days = Number(new URLSearchParams(location.search).get('days')) || 30;
    const mine = (orgs || []).filter((o) => (o.centers || []).some((x) => x.center_id === c.center_id));
    if (!mine.length) return page(shell('<div class="card"><h2>Organization</h2><p>This center is not part of an organization you own.</p></div>'), 'Organization', { english: true });
    const boards = await Promise.all(mine.map((o) => rpc('org_dashboard', { p_org: o.id, p_days: days }).catch((err) => ({ error: friendly(err), organization: o }))));
    page(shell(boards.map((b) => (b.error ? `<div class="card"><h2>${esc(b.organization.name)}</h2><p class="msg bad">${esc(b.error)}</p></div>`
      : `<div class="card org-board" data-org="${esc(b.organization.id)}"><h2>${esc(b.organization.name)}: the last ${esc(b.days)} days</h2>
        <div class="tablewrap"><table class="t"><thead><tr><th>Center</th><th>Status</th><th>Enrolled</th><th>Attendance</th><th>Daily reports</th><th>Skill-check coverage</th><th>Incidents</th><th>Staff compliance</th><th>Invoiced</th><th>Collected</th><th>Outstanding</th></tr></thead><tbody>
        ${b.centers.map((r) => `<tr data-center="${esc(r.center_id)}"><td>${esc(r.center)}</td><td>${esc(r.status)}</td><td>${esc(num(r.enrolled))}</td><td>${esc(pct(r.attendance_rate))}</td><td>${esc(num(r.reports_sent))}</td>
          <td>${esc(pct(r.skill_check_coverage))}</td><td>${esc(num(r.incidents))}</td><td>${esc(pct(r.staff_compliance_score))}</td>
          <td>${esc(money(r.financials?.invoiced_cents))}</td><td>${esc(money(r.financials?.collected_cents))}</td><td>${esc(money(r.financials?.outstanding_cents))}</td></tr>`).join('')}
        </tbody></table></div><p class="mini muted">Financial figures are shown for the centers you may see them for (directors and owners only).</p></div>`)).join('')), 'Organization', { english: true });
  }

  return { viewHq, viewOrg };
}
