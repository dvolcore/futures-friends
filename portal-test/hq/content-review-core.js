// The content workflow's pure helpers (hub/CONTENT_WORKFLOW.md): state names, who acts next, flattening a version's body into
// readable fields, and a word diff between two versions. No DOM, so tests/content-workflow-unit.test.mjs runs it in node.

export const KINDS = Object.freeze({
  kid_activity: 'Kid Mode activity', skill_check_item: 'Skill-check item', character_message: 'Character message',
  kid_video: 'Kid video', habit_card: 'Habit card', library_item: 'Library family item',
});
export const STATES = Object.freeze(['draft', 'writer_done', 'supervisor_review', 'devils_advocate_review', 'qc', 'approved', 'superseded', 'retired']);
export const STATE_LABEL = Object.freeze({
  draft: 'Draft (writer)', writer_done: 'Writer done: waiting for a supervisor', supervisor_review: 'Supervisor review',
  devils_advocate_review: "Devil's advocate review", qc: 'QC', approved: 'Approved', superseded: 'Superseded', retired: 'Retired',
});
export const STAGE_LABEL = Object.freeze({ writer: 'Writer', supervisor: 'Supervisor', devils_advocate: "Devil's advocate", qc: 'QC', system: 'System' });
export const ACTION_LABEL = Object.freeze({
  created: 'Snapshot taken', updated: 'Draft refreshed from the source', superseded: 'Superseded by a newer version', writer_done: 'Writer done',
  claim: 'Picked up for supervisor review', pass: 'Passed', send_back: 'Sent back', approve: 'Approved', publish: 'Published',
  rollback: 'Rolled back to this version', unpublish: 'Taken down', retire: 'Retired',
});
// The order of the pipeline, for the progress strip.
export const PIPELINE = Object.freeze(['draft', 'writer_done', 'supervisor_review', 'devils_advocate_review', 'qc', 'approved']);
export const stepIndex = (state) => PIPELINE.indexOf(state);

// Which stage must act on a version in this state (null when nobody has to).
export function waitingFor(state) {
  return { draft: 'writer', writer_done: 'supervisor', supervisor_review: 'supervisor', devils_advocate_review: 'devils_advocate', qc: 'qc' }[state] ?? null;
}

// Body -> [[label, text]] in a stable order (arrays become numbered lines; nested objects are prefixed), for display and diff.
export function flatten(body, prefix = '') {
  const out = [];
  if (body === null || body === undefined) return out;
  if (Array.isArray(body)) {
    body.forEach((v, i) => {
      if (v !== null && typeof v === 'object') out.push(...flatten(v, `${prefix}${prefix ? ' ' : ''}${i + 1}.`));
      else out.push([`${prefix}${prefix ? ' ' : ''}${i + 1}`, String(v)]);
    });
    return out;
  }
  if (typeof body === 'object') {
    for (const k of Object.keys(body).sort(fieldOrder)) {
      const v = body[k]; const label = prefix ? `${prefix} ${k}` : k;
      if (v !== null && typeof v === 'object') {
        if (Array.isArray(v) && v.every((x) => x === null || typeof x !== 'object')) out.push([label, v.map((x) => String(x)).join('\n')]);
        else out.push(...flatten(v, label));
      } else out.push([label, v === null ? '' : String(v)]);
    }
    return out;
  }
  return [[prefix || 'value', String(body)]];
}
const FIRST = ['title', 'name', 'prompt', 'steps', 'script', 'variants'];
function fieldOrder(a, b) {
  const ia = FIRST.indexOf(a), ib = FIRST.indexOf(b);
  if (ia >= 0 || ib >= 0) return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  return a < b ? -1 : a > b ? 1 : 0;
}

const tokens = (s) => String(s ?? '').split(/(\s+)/).filter((x) => x !== '');
// Word diff (LCS). Returns [{t: 'same'|'add'|'del', s}] with neighbours of the same kind merged.
export function wordDiff(a, b) {
  const x = tokens(a), y = tokens(b);
  if (x.length * y.length > 400000) return [{ t: 'del', s: String(a ?? '') }, { t: 'add', s: String(b ?? '') }];   // too long to align: whole replace
  const n = x.length, m = y.length;
  const L = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = x[i] === y[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = [];
  const push = (t, s) => { const last = out[out.length - 1]; if (last && last.t === t) last.s += s; else out.push({ t, s }); };
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (x[i] === y[j]) { push('same', x[i]); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) { push('del', x[i]); i++; } else { push('add', y[j]); j++; }
  }
  while (i < n) push('del', x[i++]);
  while (j < m) push('add', y[j++]);
  return out;
}

// Field-by-field diff of two bodies: [{label, status: 'same'|'changed'|'added'|'removed', diff}]
export function bodyDiff(oldBody, newBody) {
  const a = new Map(flatten(oldBody)), b = new Map(flatten(newBody));
  const labels = [...new Set([...b.keys(), ...a.keys()])];
  return labels.map((label) => {
    const was = a.get(label), now = b.get(label);
    if (was === undefined) return { label, status: 'added', diff: [{ t: 'add', s: now }] };
    if (now === undefined) return { label, status: 'removed', diff: [{ t: 'del', s: was }] };
    if (was === now) return { label, status: 'same', diff: [{ t: 'same', s: now }] };
    return { label, status: 'changed', diff: wordDiff(was, now) };
  });
}

export function diffHtml(esc, diff) {
  return diff.map((d) => (d.t === 'same' ? esc(d.s) : d.t === 'add' ? `<ins>${esc(d.s)}</ins>` : `<del>${esc(d.s)}</del>`)).join('');
}

// The EN and ES bodies side by side: rows of [label, en, es] matched by label.
export function sideBySide(en, es) {
  const a = new Map(flatten(en)), b = new Map(flatten(es));
  return [...new Set([...a.keys(), ...b.keys()])].map((label) => [label, a.get(label) ?? '', b.get(label) ?? '']);
}
