// The content review queue: the pure part (hub/DIRECTOR_OPS.md). No DOM, no network (tests/director-ops-unit.test.mjs).
//   - words EN + ES (Spanish is a DRAFT until a bilingual reviewer approves it)
//   - one list from two sources: the center's items (center_review_queue) and the network's (center_review_network, HQ pipeline)
//   - filters (type, language, status, reviewer), what a person may do, which items a bulk approve may take
export const TYPES = ['announcement', 'photo_moment', 'kid_activity', 'character_message', 'kid_video'];
export const NETWORK_TYPES = ['kid_activity', 'character_message', 'kid_video'];

export const RVW = {
  en: {
    title: 'Content review', sub: 'Nothing reaches children or families as approved until a named reviewer signs. The author never signs their own item.',
    types: { all: 'All types', announcement: 'Family announcement', photo_moment: 'Photo moment', kid_activity: 'Curriculum activity', character_message: 'Character message', kid_video: 'Kid video' },
    langs: { all: 'All languages', en: 'English', es: 'Spanish', en_es: 'English + Spanish' },
    statuses: { waiting: 'Waiting for review', mine: 'Waiting for me', changes: 'Changes requested', approved: 'Approved', rejected: 'Not approved', all: 'Everything' },
    steps: { writer: 'Writer', supervisor: 'Supervisor', devils_advocate: "Devil's advocate", qc: 'QC', qc_es: 'Spanish QC' },
    anyReviewer: 'Any reviewer', filterType: 'Type', filterLang: 'Language', filterStatus: 'Status', filterReviewer: 'Reviewer',
    waitingFor: (s) => `Waiting for: ${s}`, hq: 'Futures Friends HQ', center: 'This center', by: (n) => `by ${n}`, signed: (list) => `Signed: ${list}`,
    approve: 'Approve', changes: 'Request changes', reject: 'Reject', note: 'Note (required to request changes or reject)', noteOpt: 'Note (optional)',
    approved: 'Approved: it is out of the queue.', approvedStep: (s) => `Signed. It now waits for ${s}.`, changesSent: 'Changes requested: the author was told.', rejected: 'Not approved: the author was told.',
    bulk: (n) => `Approve selected (${n})`, bulkHint: 'Bulk approve takes low-risk items only (photo moments), each signed by you by name.', bulkDone: (a, s) => `${a} approved${s ? `, ${s} skipped` : ''}.`,
    select: (t) => `Select ${t}`, lowRisk: 'Low risk', none: 'Nothing waiting. Every item has been reviewed.', noneFilter: 'Nothing matches these filters.',
    audit: 'Audit trail', onText: 'on this text', otherText: 'on an earlier text', bulkMark: 'bulk', version: (v) => `Version ${v}`,
    actions: { submitted: 'Sent for review', approve: 'Signed', request_changes: 'Asked for changes', reject: 'Rejected', resubmit: 'Sent again', withdraw: 'Withdrawn', released: 'Released to families',
      created: 'Draft created', updated: 'Draft updated', writer_done: 'Writer done', claim: 'Picked up', pass: 'Passed', send_back: 'Sent back', publish: 'Published', superseded: 'Superseded', unpublish: 'Taken down', retire: 'Retired', rollback: 'Rolled back' },
    en_: 'English', es_: 'Español', room: (r) => `Room: ${r}`, whole: 'Whole center', files: 'Files', steps_: 'Steps', minutes: (m) => `about ${m} min`, friend: (f) => `With ${f}`,
    captions: 'Captions', transcript: 'Script (shown as captions)', noClip: 'No clip file yet (placeholder): the script is what will be read.', noEs: 'No Spanish version.',
    readOnly: 'HQ reviewers of record sign network content (two-step sign-in). You can see what is waiting and why.', youSign: 'You are a reviewer of record: you can sign this step.',
    notYours: (s) => `This step needs a named ${s} of this center.`, own: 'You wrote this: another named reviewer signs it.', resubmit: 'Send again', edit: 'Edit and send again', withdraw: 'Withdraw',
    reviewers: 'Named reviewers', reviewersNone: 'No named reviewers yet: nothing can be approved. Name them below.', addReviewer: 'Save reviewer', removeReviewer: 'Remove', spanish: 'Reviews Spanish',
    settings: 'What needs review here', setAnn: 'Family announcements', setMom: 'Photo moments', saveSettings: 'Save', saved: 'Saved.',
    loadErr: 'Could not load the review queue.', count: (n) => `${n} waiting`, network: 'Network content', networkSub: 'Activities, character messages and videos from Futures Friends HQ.', drafts: (n) => `${n} drafts not sent for review yet`,
    moments: 'Classroom moments', momentsSub: 'Photos and videos teachers took: families see them after you approve them on the moments page.', momentsAuto: 'This center shares moments right away (no approval).', momentsWait: 'Waiting for the director',
    netNone: 'Nothing from HQ is in review right now.', more: (n) => `${n} more: narrow the filters to see them.`, openItem: 'Open', preview: 'Preview', changedText: 'The text changed since it was signed: it needs review again.',
    titleEn: 'Title (English)', bodyEn: 'Message (English)', titleEs: 'Title (Spanish)', bodyEs: 'Message (Spanish)',
  },
  es: {
    title: 'Revisión de contenido', sub: 'Nada llega a los niños ni a las familias como aprobado hasta que firma una persona revisora nombrada. Quien lo escribió nunca firma lo suyo.',
    types: { all: 'Todos los tipos', announcement: 'Anuncio para familias', photo_moment: 'Momento con foto', kid_activity: 'Actividad del currículo', character_message: 'Mensaje de un amigo', kid_video: 'Video para niños' },
    langs: { all: 'Todos los idiomas', en: 'Inglés', es: 'Español', en_es: 'Inglés + español' },
    statuses: { waiting: 'Esperando revisión', mine: 'Esperándome a mí', changes: 'Cambios pedidos', approved: 'Aprobado', rejected: 'No aprobado', all: 'Todo' },
    steps: { writer: 'Redacción', supervisor: 'Supervisión', devils_advocate: 'Abogado del diablo', qc: 'Control de calidad', qc_es: 'Control de calidad en español' },
    anyReviewer: 'Cualquier revisora', filterType: 'Tipo', filterLang: 'Idioma', filterStatus: 'Estado', filterReviewer: 'Revisora',
    waitingFor: (s) => `Espera: ${s}`, hq: 'Oficina central de Futures Friends', center: 'Este centro', by: (n) => `de ${n}`, signed: (list) => `Firmado: ${list}`,
    approve: 'Aprobar', changes: 'Pedir cambios', reject: 'Rechazar', note: 'Nota (obligatoria para pedir cambios o rechazar)', noteOpt: 'Nota (opcional)',
    approved: 'Aprobado: salió de la cola.', approvedStep: (s) => `Firmado. Ahora espera: ${s}.`, changesSent: 'Se pidieron cambios: se avisó a la autora.', rejected: 'No aprobado: se avisó a la autora.',
    bulk: (n) => `Aprobar seleccionados (${n})`, bulkHint: 'La aprobación en grupo toma solo elementos de bajo riesgo (momentos con foto), cada uno firmado con su nombre.', bulkDone: (a, s) => `${a} aprobados${s ? `, ${s} omitidos` : ''}.`,
    select: (t) => `Seleccionar ${t}`, lowRisk: 'Bajo riesgo', none: 'Nada en espera. Todo fue revisado.', noneFilter: 'Nada coincide con estos filtros.',
    audit: 'Historial de revisión', onText: 'sobre este texto', otherText: 'sobre un texto anterior', bulkMark: 'en grupo', version: (v) => `Versión ${v}`,
    actions: { submitted: 'Enviado a revisión', approve: 'Firmado', request_changes: 'Pidió cambios', reject: 'Rechazado', resubmit: 'Enviado de nuevo', withdraw: 'Retirado', released: 'Publicado para las familias',
      created: 'Borrador creado', updated: 'Borrador actualizado', writer_done: 'Redacción terminada', claim: 'Tomado', pass: 'Aprobado en su paso', send_back: 'Devuelto', publish: 'Publicado', superseded: 'Reemplazado', unpublish: 'Retirado de la vista', retire: 'Retirado', rollback: 'Versión anterior' },
    en_: 'English', es_: 'Español', room: (r) => `Salón: ${r}`, whole: 'Todo el centro', files: 'Archivos', steps_: 'Pasos', minutes: (m) => `unos ${m} min`, friend: (f) => `Con ${f}`,
    captions: 'Subtítulos', transcript: 'Guion (se muestra como subtítulos)', noClip: 'Todavía no hay archivo de video (marcador): se leerá este guion.', noEs: 'Sin versión en español.',
    readOnly: 'El contenido de la red lo firman las revisoras registradas de la oficina central (verificación en dos pasos). Aquí ve qué espera y por qué.', youSign: 'Usted es revisora registrada: puede firmar este paso.',
    notYours: (s) => `Este paso necesita una persona de ${s} nombrada en este centro.`, own: 'Usted lo escribió: lo firma otra revisora nombrada.', resubmit: 'Enviar de nuevo', edit: 'Editar y enviar de nuevo', withdraw: 'Retirar',
    reviewers: 'Revisoras nombradas', reviewersNone: 'Todavía no hay revisoras nombradas: nada se puede aprobar. Nómbrelas abajo.', addReviewer: 'Guardar revisora', removeReviewer: 'Quitar', spanish: 'Revisa español',
    settings: 'Qué necesita revisión aquí', setAnn: 'Anuncios para familias', setMom: 'Momentos con foto', saveSettings: 'Guardar', saved: 'Guardado.',
    loadErr: 'No se pudo cargar la cola de revisión.', count: (n) => `${n} en espera`, network: 'Contenido de la red', networkSub: 'Actividades, mensajes de los amigos y videos de la oficina central.', drafts: (n) => `${n} borradores todavía sin enviar a revisión`,
    moments: 'Momentos del salón', momentsSub: 'Fotos y videos de las maestras: las familias los ven después de que usted los apruebe en la página de momentos.', momentsAuto: 'Este centro comparte los momentos enseguida (sin aprobación).', momentsWait: 'Espera a la dirección',
    netNone: 'Nada de la oficina central está en revisión ahora.', more: (n) => `${n} más: use los filtros para verlos.`, openItem: 'Abrir', preview: 'Vista previa', changedText: 'El texto cambió después de firmarse: necesita revisión otra vez.',
    titleEn: 'Título (inglés)', bodyEn: 'Mensaje (inglés)', titleEs: 'Título (español)', bodyEs: 'Mensaje (español)',
  },
};
export const rvw = (lang) => RVW[lang === 'es' ? 'es' : 'en'];

const NET_WAIT = { draft: 'writer', writer_done: 'supervisor', supervisor_review: 'supervisor', devils_advocate_review: 'devils_advocate', qc: 'qc' };
const NET_STATUS = (s) => (s === 'approved' ? 'approved' : s === 'retired' ? 'rejected' : s === 'draft' ? 'draft' : 'in_review');
// one shape for both sources
export function normalize(queue, network) {
  const center = (queue?.items || []).map((i) => ({ ...i, source: 'center', key: `c:${i.id}`, lang: i.lang || 'en' }));
  const net = (network?.items || []).map((v) => ({
    id: v.id, source: 'network', key: `n:${v.id}`, type: v.type, title: v.title, body: v.body, sha: v.sha, lang: v.lang, state: NET_STATUS(v.state), net_state: v.state,
    waiting_for: v.state === 'draft' ? 'writer' : NET_WAIT[v.state] || null, version: v.version, events: v.events || [], media: v.media || null, risk: 'standard',
    can_sign: !!network?.reviewer_of_record && v.state !== 'draft', state_at: v.state_at, author_name: null, signers: [...new Set((v.events || []).filter((e) => ['pass', 'claim', 'writer_done'].includes(e.action) && e.name).map((e) => e.name))],
  }));
  return center.concat(net);
}
export function matches(item, f, me = {}) {
  if (f.type && f.type !== 'all' && item.type !== f.type) return false;
  if (f.lang && f.lang !== 'all') {
    if (f.lang === 'es' && !(item.lang === 'es' || item.lang === 'en_es')) return false;
    if (f.lang === 'en' && !(item.lang === 'en' || item.lang === 'en_es')) return false;
    if (f.lang === 'en_es' && item.lang !== 'en_es') return false;
  }
  const st = f.status || 'waiting';
  if (st === 'waiting' && item.state !== 'in_review') return false;
  if (st === 'mine' && !(item.state === 'in_review' && item.can_sign)) return false;
  if (st === 'changes' && item.state !== 'changes_requested') return false;
  if (st === 'approved' && item.state !== 'approved') return false;
  if (st === 'rejected' && !['rejected', 'withdrawn'].includes(item.state)) return false;
  if (f.reviewer && f.reviewer !== 'all') {
    if (f.reviewer.startsWith('step:')) { if (item.waiting_for !== f.reviewer.slice(5)) return false; }
    else {
      const r = (me.reviewers || []).find((x) => x.user_id === f.reviewer);
      if (!r || item.source !== 'center' || item.state !== 'in_review') return false;
      const step = item.waiting_for; const stage = step === 'qc_es' ? 'qc' : step;
      if (!r.stages.includes(stage) || (step === 'qc_es' && !r.spanish) || item.author === r.user_id) return false;
    }
  }
  return true;
}
export const filterItems = (items, f, me) => items.filter((i) => matches(i, f, me))
  .sort((a, b) => (a.source === b.source ? 0 : a.source === 'center' ? -1 : 1) || (b.can_sign - a.can_sign) || String(a.state_at).localeCompare(String(b.state_at)));
export const bulkable = (item) => item.source === 'center' && item.risk === 'low' && item.state === 'in_review' && item.can_sign;
// the count the Overview chip shows: center items in review + network items in review (not drafts)
export const waitingCount = (count) => (count ? Number(count.center || 0) + Number(count.network || 0) : null);
export function stepsTrail(item, lang = 'en') {
  const S = rvw(lang).steps;
  if (item.source !== 'center') return ['writer', 'supervisor', 'devils_advocate', 'qc'].map((s) => ({ step: s, label: S[s], state: s === item.waiting_for ? 'now' : item.state === 'approved' ? 'done' : ['writer', 'supervisor', 'devils_advocate', 'qc'].indexOf(s) < ['writer', 'supervisor', 'devils_advocate', 'qc'].indexOf(item.waiting_for) ? 'done' : 'todo' }));
  return [{ step: 'writer', label: S.writer, state: 'done' }].concat(item.steps.map((s, i) => ({ step: s, label: S[s], state: i < item.step_index ? 'done' : i === item.step_index && item.state === 'in_review' ? 'now' : 'todo' })));
}
