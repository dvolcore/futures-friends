// /c/<slug>/import: a director imports the roster from Procare, Brightwheel or the template (hub/ROSTER_IMPORT.md, migration
// 20261028310000_roster_import.sql). DIRECTORS ONLY (app.js shows the tab to directors; every function checks again).
//   1. choose the CSV (read in this browser; nothing is uploaded until the dry run)  2. match its columns to the hub's fields
//   3. dry run: the database checks every row (errors per row, warnings, duplicates with children and families already here, counts)
//   4. import: everything in one step (or nothing); invitations are HELD  5. send the invitations when ready, or undo within 72 hours
// English + Spanish (DRAFT) through the tables below and i18n.js; people's names and the file's own words are marked translate="no".
import { dict, uiLang, fmtDateTime } from './i18n.js';
import { centerToday } from './center-time.js';
import { FIELDS, FIELD_LABELS, autoMap, detectSource, mappingProblems, parseCsv, templateCsv, toRow } from './roster-import-core.js';
import { looksLikeOneRoster, oneRosterToTable } from './oneroster-core.js';   // N17: OneRoster 1.1 CSV files (users, classes, enrollments)

const W = {
  en: {
    title: 'Import roster',
    lead: 'Moving from another program? Bring your children, families, rooms, allergies, pickup lists and custody restrictions in from a CSV file. Nothing is saved until you import, and you can undo an import for 72 hours.',
    step1: '1. Choose the file', fileLabel: 'CSV file exported from your old program', template: 'Download the template (CSV)',
    sources: { procare: 'Procare', brightwheel: 'Brightwheel', generic: 'Futures Hub template or another program', oneroster: 'OneRoster files (district or student-information system)' },
    orHint: 'OneRoster: choose users.csv, classes.csv, enrollments.csv and, if you have them, demographics.csv and orgs.csv together.',
    orRead: (k) => `OneRoster: ${k.students} children in ${k.classes} classes. Each class becomes a room.`,
    orTeachers: (n) => `${n} teacher(s) in these files are not imported: staff join through hiring or an invitation from Staff.`,
    orSchool: 'School', orAll: 'All schools in the files', orNeed: 'For OneRoster, choose users.csv and enrollments.csv (and classes.csv) together.',
    sourceLabel: 'Where the file comes from', read: (n, f) => `${n} children read from ${f}.`, empty: 'The file has no rows. Choose another file.',
    tooMany: 'At most 2000 children per import: split the file.', notCsv: 'Choose a .csv file (in Excel or Numbers: Save as / Export, CSV).',
    step2: '2. Match the columns', step2Lead: 'Columns we recognised are already matched. Check them, and match the others you want to bring in.',
    notInFile: 'Not in this file', groups: { child: 'Child', guardian: 'Guardians (they get an invitation, sent only when you choose)',
      emergency: 'Emergency contacts', pickup: 'Authorized pickups', care: 'Allergies and health', custody: 'Custody restrictions',
      immunizations: 'Immunization dates (health records; imported as not verified)' },
    need: { child_name: 'the child\'s name (first and last, or full name)', room: 'the room' }, needLabel: (x) => `Match ${x} first.`,
    sample: 'First row as it will be read', step3: '3. Check the file (dry run)', check: 'Check the file', checking: 'Checking every row…',
    counts: { rows: 'Rows', children_new: 'New children', duplicates: 'Already here (skipped)', errors: 'Rows with errors', rows_with_warnings: 'Rows with warnings',
      rooms_new: 'New rooms', guardians: 'Guardians', invitations: 'Invitations (held)', care_alerts: 'Care alerts', pickups: 'Authorized pickups', custody: 'Custody restrictions' },
    show: 'Show', showAll: 'All rows', showErrors: 'Errors', showWarnings: 'Warnings', showDup: 'Already here', row: 'Row', child: 'Child', room: 'Room', result: 'Result',
    action: { create: 'Will be added', duplicate: 'Already here: skipped', error: 'Error: not imported' }, noneHere: 'Nothing to show.',
    step4: '4. Import', skip: (n) => `Import the other rows and skip the ${n} row(s) with errors`, importN: (n) => `Import ${n} children`,
    importing: 'Importing…', fixFirst: 'Fix the rows with errors in the file and check it again, or tick the box to skip them.',
    done: (n) => `Imported: ${n} children. The family invitations are held: nothing has been emailed yet.`,
    past: 'Imports', noPast: 'No imports yet.', status: { previewed: 'Checked, not imported', committed: 'Imported', undone: 'Undone' },
    held: (n) => `${n} invitation(s) held, not sent`, sent: (d) => `Invitations sent ${d}`, until: (d) => `Undo possible until ${d}`,
    send: (n) => `Send ${n} invitation(s)`, sendConfirm: (n) => `Email ${n} family invitation(s) now? After this the import can no longer be undone.`,
    sentMsg: (n) => `${n} invitation(s) are on their way.`, undo: 'Undo this import',
    undoConfirm: 'Remove every child this import added, with their profiles, care alerts, pickup lists, restrictions and held invitations?',
    undone: (n) => `Undone: ${n} children removed.`, created: (c) => `${c.children} children, ${c.rooms} new rooms, ${c.care_alerts} care alerts, ${c.pickup_entries} pickup entries, ${c.custody} custody restrictions`,
    review: 'Imported care alerts are marked "review due": confirm each one with the family in Children.',
    safe: 'Emails respect the mail safe mode of this server.',
  },
  es: {
    title: 'Importar la lista',
    lead: '¿Viene de otro programa? Traiga a sus niños, familias, salones, alergias, listas de recogida y restricciones de custodia desde un archivo CSV. No se guarda nada hasta que importe, y puede deshacer una importación durante 72 horas.',
    step1: '1. Elija el archivo', fileLabel: 'Archivo CSV exportado de su programa anterior', template: 'Descargar la plantilla (CSV)',
    sources: { procare: 'Procare', brightwheel: 'Brightwheel', generic: 'Plantilla de Futures Hub u otro programa', oneroster: 'Archivos OneRoster (distrito o sistema de información estudiantil)' },
    orHint: 'OneRoster: elija juntos users.csv, classes.csv, enrollments.csv y, si los tiene, demographics.csv y orgs.csv.',
    orRead: (k) => `OneRoster: ${k.students} niños en ${k.classes} clases. Cada clase se convierte en un salón.`,
    orTeachers: (n) => `${n} maestro(s) de estos archivos no se importan: el personal entra por contratación o con una invitación desde Personal.`,
    orSchool: 'Escuela', orAll: 'Todas las escuelas de los archivos', orNeed: 'Para OneRoster, elija juntos users.csv y enrollments.csv (y classes.csv).',
    sourceLabel: 'De dónde viene el archivo', read: (n, f) => `Se leyeron ${n} niños de ${f}.`, empty: 'El archivo no tiene filas. Elija otro archivo.',
    tooMany: 'Como máximo 2000 niños por importación: divida el archivo.', notCsv: 'Elija un archivo .csv (en Excel o Numbers: Guardar como / Exportar, CSV).',
    step2: '2. Relacione las columnas', step2Lead: 'Las columnas que reconocimos ya están relacionadas. Revíselas y relacione las demás que quiera traer.',
    notInFile: 'No está en este archivo', groups: { child: 'Niño o niña', guardian: 'Tutores (reciben una invitación, enviada solo cuando usted lo decida)',
      emergency: 'Contactos de emergencia', pickup: 'Personas autorizadas para recoger', care: 'Alergias y salud', custody: 'Restricciones de custodia',
      immunizations: 'Fechas de vacunas (registros de salud; se importan sin verificar)' },
    need: { child_name: 'el nombre del niño (nombre y apellido, o nombre completo)', room: 'el salón' }, needLabel: (x) => `Primero relacione ${x}.`,
    sample: 'La primera fila tal como se leerá', step3: '3. Revise el archivo (prueba)', check: 'Revisar el archivo', checking: 'Revisando cada fila…',
    counts: { rows: 'Filas', children_new: 'Niños nuevos', duplicates: 'Ya están aquí (se omiten)', errors: 'Filas con errores', rows_with_warnings: 'Filas con avisos',
      rooms_new: 'Salones nuevos', guardians: 'Tutores', invitations: 'Invitaciones (retenidas)', care_alerts: 'Alertas de cuidado', pickups: 'Personas autorizadas', custody: 'Restricciones de custodia' },
    show: 'Mostrar', showAll: 'Todas las filas', showErrors: 'Errores', showWarnings: 'Avisos', showDup: 'Ya están aquí', row: 'Fila', child: 'Niño o niña', room: 'Salón', result: 'Resultado',
    action: { create: 'Se agregará', duplicate: 'Ya está aquí: se omite', error: 'Error: no se importa' }, noneHere: 'No hay nada que mostrar.',
    step4: '4. Importar', skip: (n) => `Importar las demás filas y omitir las ${n} fila(s) con errores`, importN: (n) => `Importar ${n} niños`,
    importing: 'Importando…', fixFirst: 'Corrija las filas con errores en el archivo y revíselo de nuevo, o marque la casilla para omitirlas.',
    done: (n) => `Importado: ${n} niños. Las invitaciones a las familias están retenidas: todavía no se envió ningún correo.`,
    past: 'Importaciones', noPast: 'Todavía no hay importaciones.', status: { previewed: 'Revisada, no importada', committed: 'Importada', undone: 'Deshecha' },
    held: (n) => `${n} invitación(es) retenida(s), sin enviar`, sent: (d) => `Invitaciones enviadas el ${d}`, until: (d) => `Se puede deshacer hasta el ${d}`,
    send: (n) => `Enviar ${n} invitación(es)`, sendConfirm: (n) => `¿Enviar ahora ${n} invitación(es) por correo a las familias? Después ya no se podrá deshacer la importación.`,
    sentMsg: (n) => `${n} invitación(es) en camino.`, undo: 'Deshacer esta importación',
    undoConfirm: '¿Quitar a todos los niños que agregó esta importación, con sus perfiles, alertas de cuidado, listas de recogida, restricciones e invitaciones retenidas?',
    undone: (n) => `Deshecha: se quitaron ${n} niños.`, created: (c) => `${c.children} niños, ${c.rooms} salones nuevos, ${c.care_alerts} alertas de cuidado, ${c.pickup_entries} personas en la lista de recogida, ${c.custody} restricciones de custodia`,
    review: 'Las alertas de cuidado importadas quedan como "revisión pendiente": confirme cada una con la familia en Niños.',
    safe: 'Los correos respetan el modo seguro de correo de este servidor.',
  },
};

export function mountRosterImport({ esc, $, $$, rpc, page, live, friendly }) {
  async function viewImport(c, shell) {
    const w = dict(W, uiLang()), L = dict(FIELD_LABELS, uiLang());
    let file = null;   // { name, headers, rows, source, map }
    let preview = null;
    const list = await rpc('roster_import_list', { p_center: c.center_id });
    const when = (iso) => (iso ? fmtDateTime(iso, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');

    page(shell(`<section class="ri" id="rosterImport">
      <div class="card"><h2>${esc(w.title)}</h2><p class="muted">${esc(w.lead)}</p>
        <p class="small"><a href="#" id="riTemplate">${esc(w.template)}</a></p></div>
      <div class="card" id="riStep1"><h3>${esc(w.step1)}</h3>
        <label class="f"><span>${esc(w.fileLabel)}</span><input class="i" type="file" id="riFile" accept=".csv,text/csv" multiple></label>
        <p class="small muted">${esc(w.orHint)}</p>
        <div id="riOrSchool"></div>
        <p class="msg" id="riFileMsg" role="status"></p><p class="small muted" id="riOrTeachers"></p></div>
      <div class="card" id="riStep2" hidden></div>
      <div class="card" id="riStep3" hidden></div>
      <div class="card"><h3>${esc(w.past)}</h3><div id="riPast">${pastHtml(list)}</div><p class="msg" id="riPastMsg" role="status"></p></div>
    </section>`), w.title);

    $('#riTemplate').onclick = (e) => {
      e.preventDefault();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([templateCsv(uiLang())], { type: 'text/csv' }));
      a.download = 'futures-hub-roster-template.csv'; document.body.appendChild(a); a.click(); a.remove();
    };
    let orTexts = null;
    const useOneRoster = (school) => {
      const m = $('#riFileMsg');
      const t = oneRosterToTable(orTexts, { school, today: centerToday() });
      if (!t.rows.length) { m.className = 'msg bad'; m.textContent = w.empty; return; }
      if (t.rows.length > 2000) { m.className = 'msg bad'; m.textContent = w.tooMany; return; }
      file = { name: 'OneRoster', headers: t.headers, rows: t.rows, source: 'oneroster', map: autoMap(t.headers) };
      m.className = 'msg ok'; m.textContent = w.orRead(t.counts); live(m.textContent);
      $('#riOrTeachers').textContent = t.teachers.length ? w.orTeachers(t.teachers.length) : '';
      if (t.schools.length > 1 && !$('#riOrSel')) {
        $('#riOrSchool').innerHTML = `<label class="f"><span>${esc(w.orSchool)}</span><select class="i" id="riOrSel"><option value="">${esc(w.orAll)}</option>
          ${t.schools.map((x) => `<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('')}</select></label>`;
        $('#riOrSel').onchange = () => { $('#riStep2').hidden = true; $('#riStep3').hidden = true; preview = null; useOneRoster($('#riOrSel').value); };
      }
      renderMapping();
    };
    $('#riFile').onchange = async () => {
      const files = [...$('#riFile').files], f = files[0], m = $('#riFileMsg');
      $('#riStep2').hidden = true; $('#riStep3').hidden = true; preview = null;
      $('#riOrSchool').innerHTML = ''; $('#riOrTeachers').textContent = ''; orTexts = null;
      if (!f) return;
      if (files.some((x) => !/\.(csv|txt)$/i.test(x.name))) { m.className = 'msg bad'; m.textContent = w.notCsv; return; }
      if (files.length > 1) {
        const texts = await Promise.all(files.map((x) => x.text()));
        if (!looksLikeOneRoster(texts)) { m.className = 'msg bad'; m.textContent = w.orNeed; return; }
        orTexts = texts;
        try { useOneRoster(''); } catch (e) { m.className = 'msg bad'; m.textContent = e.message; }
        return;
      }
      if (!/\.(csv|txt)$/i.test(f.name)) { m.className = 'msg bad'; m.textContent = w.notCsv; return; }
      const { headers, rows } = parseCsv(await f.text());
      if (!rows.length) { m.className = 'msg bad'; m.textContent = w.empty; return; }
      if (rows.length > 2000) { m.className = 'msg bad'; m.textContent = w.tooMany; return; }
      file = { name: f.name, headers, rows, source: detectSource(headers), map: autoMap(headers) };
      m.className = 'msg ok'; m.textContent = w.read(rows.length, f.name); live(m.textContent);
      renderMapping();
    };

    function renderMapping() {
      const box = $('#riStep2'); box.hidden = false;
      const opts = (key) => `<option value="">${esc(w.notInFile)}</option>${file.headers.map((h, i) => `<option value="${i}"${file.map[key] === i ? ' selected' : ''}>${esc(h)}</option>`).join('')}`;
      const groups = [...new Set(FIELDS.map((f) => f.group))];
      box.innerHTML = `<h3>${esc(w.step2)}</h3><p class="small muted">${esc(w.step2Lead)}</p>
        <label class="f"><span>${esc(w.sourceLabel)}</span><select class="i" id="riSource">${Object.entries(w.sources).map(([k, l]) => `<option value="${k}"${k === file.source ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
        ${groups.map((g) => `<fieldset class="ri-group"><legend>${esc(w.groups[g])}</legend><div class="grid two">
          ${FIELDS.filter((f) => f.group === g).map((f) => `<label class="f"><span>${esc(L[f.key])}</span><select class="i" data-field="${f.key}">${opts(f.key)}</select></label>`).join('')}
        </div></fieldset>`).join('')}
        <h4>${esc(w.sample)}</h4><pre class="ri-sample small" id="riSample" translate="no" tabindex="0" aria-label="${esc(w.sample)}"></pre>
        <p class="msg" id="riMapMsg" role="status"></p>
        <button class="btn center" type="button" id="riCheck">${esc(w.check)}</button>`;
      const sample = () => { $('#riSample').textContent = JSON.stringify(toRow(file.rows[0], file.map), null, 1); };
      sample();
      $('#riSource').onchange = () => { file.source = $('#riSource').value; };
      $$('select[data-field]', box).forEach((s) => { s.onchange = () => {
        if (s.value === '') delete file.map[s.dataset.field]; else file.map[s.dataset.field] = Number(s.value);
        sample();
      }; });
      $('#riCheck').onclick = runPreview;
    }

    async function runPreview() {
      const m = $('#riMapMsg');
      const missing = mappingProblems(file.map);
      if (missing.length) { m.className = 'msg bad'; m.textContent = w.needLabel(missing.map((k) => w.need[k]).join(', ')); return; }
      m.className = 'msg info'; m.textContent = w.checking; $('#riCheck').disabled = true;
      try {
        preview = await rpc('roster_import_preview', { p_center: c.center_id, p_source: file.source, p_file_name: file.name,
          p_rows: file.rows.map((r) => toRow(r, file.map)) });
        m.className = 'msg'; m.textContent = '';
        renderPreview('all');
      } catch (e) { m.className = 'msg bad'; m.textContent = friendly(e); }
      finally { $('#riCheck').disabled = false; }
    }

    function renderPreview(filter) {
      const box = $('#riStep3'); box.hidden = false;
      const k = preview.counts;
      const rows = preview.rows.filter((r) => filter === 'all' || (filter === 'errors' && r.errors.length) || (filter === 'warnings' && r.warnings.length) || (filter === 'dup' && r.action === 'duplicate'));
      box.innerHTML = `<h3>${esc(w.step3)}</h3>
        <dl class="ri-counts" id="riCounts">${Object.keys(w.counts).map((key) => `<div data-count="${key}"><dt>${esc(w.counts[key])}</dt><dd>${k[key] ?? 0}</dd></div>`).join('')}</dl>
        <div class="row" role="group" aria-label="${esc(w.show)}">${[['all', w.showAll], ['errors', w.showErrors], ['warnings', w.showWarnings], ['dup', w.showDup]]
          .map(([f, l]) => `<button class="btn ${f === filter ? 'navy' : 'soft'} small" type="button" data-filter="${f}" aria-pressed="${f === filter}">${esc(l)}</button>`).join('')}</div>
        <div class="ri-table-wrap" tabindex="0" role="region" aria-label="${esc(w.result)}"><table class="ri-table" id="riRows"><thead><tr><th>${esc(w.row)}</th><th>${esc(w.child)}</th><th>${esc(w.room)}</th><th>${esc(w.result)}</th></tr></thead>
        <tbody>${rows.length ? rows.slice(0, 500).map((r) => `<tr data-row="${r.row}" data-action="${r.action}"><td>${r.row}</td><td translate="no">${esc(r.child)}</td><td translate="no">${esc(r.room || '')}</td>
          <td><b>${esc(w.action[r.action])}</b>${r.errors.length ? `<ul class="small bad">${r.errors.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}${r.warnings.length ? `<ul class="small muted">${r.warnings.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</td></tr>`).join('')
          : `<tr><td colspan="4">${esc(w.noneHere)}</td></tr>`}</tbody></table></div>
        <h3>${esc(w.step4)}</h3>
        ${k.errors ? `<label class="choice"><input type="checkbox" id="riSkip"><span>${esc(w.skip(k.errors))}</span></label>` : ''}
        <p class="small muted">${esc(w.review)}</p>
        <p class="msg" id="riCommitMsg" role="status"></p>
        <button class="btn center" type="button" id="riCommit"${k.children_new ? '' : ' disabled'}>${esc(w.importN(k.children_new))}</button>`;
      $$('[data-filter]', box).forEach((b) => { b.onclick = () => renderPreview(b.dataset.filter); });
      $('#riCommit').onclick = async () => {
        const m = $('#riCommitMsg');
        if (k.errors && !$('#riSkip')?.checked) { m.className = 'msg bad'; m.textContent = w.fixFirst; return; }
        $('#riCommit').disabled = true; m.className = 'msg info'; m.textContent = w.importing;
        try {
          const r = await rpc('roster_import_commit', { p_center: c.center_id, p_batch: preview.batch, p_skip_invalid: !!$('#riSkip')?.checked });
          await viewImport(c, shell);
          const pm = $('#riPastMsg'); pm.className = 'msg ok'; pm.textContent = w.done(r.created.children); live(pm.textContent);
        } catch (e) { m.className = 'msg bad'; m.textContent = friendly(e); $('#riCommit').disabled = false; }
      };
    }

    function pastHtml(items) {
      if (!items.length) return `<p class="empty">${esc(w.noPast)}</p>`;
      return `<ul class="list" id="riPastList">${items.map((b) => `<li data-batch="${esc(b.id)}" data-status="${esc(b.status)}"><span class="who"><b translate="no">${esc(b.file_name || '')}</b>
        <span class="small muted">${esc(w.status[b.status])} · ${esc(when(b.committed_at || b.created_at))} · ${esc(w.sources[b.source])}</span>
        ${b.counts?.created ? `<span class="small">${esc(w.created(b.counts.created))}</span>` : ''}
        ${b.held_invitations ? `<span class="small">${esc(w.held(b.held_invitations))}</span>` : ''}
        ${b.invites_sent_at ? `<span class="small">${esc(w.sent(when(b.invites_sent_at)))}</span>` : ''}
        ${b.can_undo ? `<span class="small muted">${esc(w.until(when(b.undo_until)))}</span>` : ''}</span>
        <span>${b.status === 'committed' && b.held_invitations ? `<button class="btn center small" type="button" data-send="${esc(b.id)}" data-n="${b.held_invitations}">${esc(w.send(b.held_invitations))}</button>` : ''}
        ${b.can_undo ? `<button class="btn soft small" type="button" data-undo="${esc(b.id)}">${esc(w.undo)}</button>` : ''}</span></li>`).join('')}</ul>
        <p class="small muted">${esc(w.safe)}</p>`;
    }
    $$('[data-send]').forEach((b) => { b.onclick = async () => {
      if (!window.confirm(w.sendConfirm(Number(b.dataset.n)))) return;
      try {
        const r = await rpc('roster_import_send_invites', { p_center: c.center_id, p_batch: b.dataset.send });
        await viewImport(c, shell);
        const pm = $('#riPastMsg'); pm.className = 'msg ok'; pm.textContent = w.sentMsg(r.invitations); live(pm.textContent);
      } catch (e) { const pm = $('#riPastMsg'); pm.className = 'msg bad'; pm.textContent = friendly(e); }
    }; });
    $$('[data-undo]').forEach((b) => { b.onclick = async () => {
      if (!window.confirm(w.undoConfirm)) return;
      try {
        const r = await rpc('roster_import_undo', { p_center: c.center_id, p_batch: b.dataset.undo });
        await viewImport(c, shell);
        const pm = $('#riPastMsg'); pm.className = 'msg ok'; pm.textContent = w.undone(r.children_removed); live(pm.textContent);
      } catch (e) { const pm = $('#riPastMsg'); pm.className = 'msg bad'; pm.textContent = friendly(e); }
    }; });
  }
  return { viewImport };
}
