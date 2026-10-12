// N22: the Learning Steps of a checkpoint season exported for teachers to ENTER INTO Teaching Strategies GOLD or the DRDP (2015)
// (migration 20261030310000_assessment_export.sql, hub/ASSESSMENT_EXPORT.md). The card sits on /checkpoints (staff, English source).
// No equivalence is claimed: the file groups the hub's evidence under the tool's areas / domains; the teacher rates in that tool.
export const FRAMEWORKS = Object.freeze({ gold: 'Teaching Strategies GOLD', drdp: 'DRDP (2015)' });

export function exportFileName(slug, framework, year, season, room) {
  const safe = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  return `${safe(slug)}-${framework}-entry-${year}-${safe(season)}${room ? `-${safe(room)}` : '-all-rooms'}.csv`;
}

export function exportCardHtml(esc, { seasonLabel, roomName, director }) {
  return `<section class="card" id="cpExport"><h3>Export for GOLD or DRDP</h3>
    <p class="small muted">A CSV of this season's recorded Learning Steps, one line per child and step, grouped under the GOLD area or DRDP
      domain where you enter it, with your note and date as evidence. It is not a GOLD or DRDP rating: you rate in that tool, by its rules.</p>
    <div class="row">
      <label class="f"><span>Tool</span><select class="i" id="cpExpFw">${Object.entries(FRAMEWORKS).map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join('')}</select></label>
      <label class="f"><span>Children</span><select class="i" id="cpExpScope"><option value="room">${esc(roomName)} (${esc(seasonLabel)})</option>${director ? '<option value="all">Every room (director)</option>' : ''}</select></label>
    </div>
    <p class="small msg" id="cpExpMsg" role="status"></p>
    <button class="btn soft" type="button" id="cpExpGo">Download CSV</button></section>`;
}

export function bindExport({ rpc, c, year, season, room, live, friendly, doc = document }) {
  const btn = doc.getElementById('cpExpGo');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    const m = doc.getElementById('cpExpMsg'), fw = doc.getElementById('cpExpFw').value, all = doc.getElementById('cpExpScope').value === 'all';
    m.className = 'small msg info'; m.textContent = 'Preparing the file...';
    try {
      const csv = await rpc('assessment_export_csv', { p_center: c.center_id, p_framework: fw, p_year: year, p_season: season, p_room: all ? null : room });
      const lines = Math.max(0, String(csv).trim().split('\n').length - 1);
      const a = doc.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      a.download = exportFileName(c.slug, fw, year, season, all ? null : room);
      doc.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      m.className = 'small msg ok'; m.textContent = `Downloaded: ${lines} line${lines === 1 ? '' : 's'} for ${FRAMEWORKS[fw]}.`; live(m.textContent);
    } catch (err) { m.className = 'small msg bad'; m.textContent = friendly(err); }
  });
}
