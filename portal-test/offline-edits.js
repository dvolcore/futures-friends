// Edits made without a connection, outside /today (hub/PORTAL_RETIREMENT.md). /today keeps its own waiting list of NEW care entries
// (today.js): those only add records, so they never clash. A page that EDITS a shared record (the family report note on /reports, a meal
// instruction on /meals) can clash: someone else may have changed it while this device was offline. So an edit made offline is kept on
// this device with the value it started from ("base"), and when the hub is reachable again:
//   * the hub still has the base            -> the edit is sent and leaves the list;
//   * the hub already has the edited value  -> nothing to send; it leaves the list;
//   * the hub has something else            -> a CONFLICT: both versions are shown and the person chooses "Keep mine" (sent now) or
//                                              "Use theirs" (the queued edit is dropped). Nothing is ever replaced silently.
// Pure logic (createEditQueue, replay, resolve) so it runs under node --test; the small HTML helpers draw the list.
// The queue lives in localStorage per center and person (private mode: memory only) and holds only what the person typed.

const MAX_AGE = 7 * 24 * 3600 * 1000;

export const isNetworkError = (e, online = typeof navigator === 'undefined' ? true : navigator.onLine) =>
  /Failed to fetch|NetworkError|network|Load failed|timeout/i.test(String(e?.message || e)) || online === false;

export function createEditQueue({ storage, key, now = Date.now }) {
  const read = () => { try { const v = storage?.getItem(key); return v ? JSON.parse(v) : []; } catch { return []; } };
  let mem = read().filter((o) => now() - (o.queuedAt || 0) < MAX_AGE);
  const save = () => { try { storage?.setItem(key, JSON.stringify(mem)); } catch { /* private mode: the list lives in memory only */ } };
  return {
    list: () => mem.map((o) => ({ ...o })),
    // one waiting edit per slot (the record being edited): a newer edit of the same record replaces the older, keeping the FIRST base
    put(edit) {
      const old = mem.find((o) => o.slot === edit.slot);
      mem = mem.filter((o) => o.slot !== edit.slot).concat([{ ...edit, base: old ? old.base : edit.base, queuedAt: now(), conflict: null }]);
      save();
    },
    drop(slot) { mem = mem.filter((o) => o.slot !== slot); save(); },
    markConflict(slot, theirs) { mem = mem.map((o) => (o.slot === slot ? { ...o, conflict: { theirs } } : o)); save(); },
  };
}

// handlers[kind] = { current(edit) -> the value now at the hub, apply(edit) -> sends edit.mine, same(a, b) -> boolean }
// -> { applied: [slot], dropped: [slot], conflicts: [{ slot, theirs }], offline: boolean, error: string|null }
export async function replay(queue, handlers) {
  const out = { applied: [], dropped: [], conflicts: [], offline: false, error: null };
  for (const e of queue.list()) {
    const h = handlers[e.kind];
    if (!h) continue;
    if (e.conflict) { out.conflicts.push({ slot: e.slot, theirs: e.conflict.theirs }); continue; }   // waits for the person's choice
    try {
      const cur = await h.current(e);
      if (h.same(cur, e.base)) { await h.apply(e); queue.drop(e.slot); out.applied.push(e.slot); }
      else if (h.same(cur, e.mine)) { queue.drop(e.slot); out.dropped.push(e.slot); }
      else { queue.markConflict(e.slot, cur); out.conflicts.push({ slot: e.slot, theirs: cur }); }
    } catch (err) {
      if (isNetworkError(err)) { out.offline = true; break; }
      out.error = String(err?.message || err);   // the hub refused it (report already sent, wording rule...): it stays, with the reason
      break;
    }
  }
  return out;
}

// choice: 'mine' (send it now, whatever is there) | 'theirs' (drop the queued edit)
export async function resolve(queue, handlers, slot, choice) {
  const e = queue.list().find((o) => o.slot === slot);
  if (!e) return false;
  if (choice === 'mine') await handlers[e.kind].apply(e);
  queue.drop(slot);
  return true;
}

// The list on the page. describe(edit, value) -> short text for a value (escaped here).
export function pendingHtml(esc, queue, describe) {
  const items = queue.list();
  if (!items.length) return '';
  return `<section class="card oe-list" id="offlineEdits" aria-label="Edits waiting to be sent"><h3>Waiting to send</h3>
    <p class="small muted">These edits were made without a connection. They are sent when the hub is reachable, and nothing is replaced without your say.</p>
    <ul class="list cd-list">${items.map((e) => `<li data-slot="${esc(e.slot)}"><span class="who"><b>${esc(e.label)}</b>
      ${e.conflict ? `<span class="chip bad">Changed by someone else</span>
        <span class="small"><b>Yours:</b> ${esc(describe(e, e.mine))}</span><span class="small"><b>Theirs:</b> ${esc(describe(e, e.conflict.theirs))}</span>`
      : `<span class="chip warn">Waiting to send</span><span class="small">${esc(describe(e, e.mine))}</span>`}</span>
      <span class="cta-row">${e.conflict ? `<button type="button" class="btn navy small" data-oe="mine" data-slot="${esc(e.slot)}">Keep mine</button><button type="button" class="btn soft small" data-oe="theirs" data-slot="${esc(e.slot)}">Use theirs</button>`
        : `<button type="button" class="btn soft small" data-oe="drop" data-slot="${esc(e.slot)}">Discard</button>`}</span></li>`).join('')}</ul>
    <div class="cta-row"><button type="button" class="btn soft small" id="oeSend">Send now</button></div></section>`;
}

// Fill `root` with the waiting list and wire its buttons. onChange() reloads the page's data and draws again (which calls this again).
// say(text, bad) shows a status line.
export function mountPending(root, { esc, queue, handlers, describe, onChange, say }) {
  if (!root) return;
  root.innerHTML = pendingHtml(esc, queue, describe);
  const send = async () => {
    const r = await replay(queue, handlers);
    if (r.error) say(r.error, true);
    else if (r.offline) say('Still no connection. The edits stay on this device.', true);
    else if (r.conflicts.length) say('Someone else changed a record while you were offline. Choose which version to keep.', true);
    else if (r.applied.length) say(r.applied.length === 1 ? 'Sent 1 waiting edit.' : `Sent ${r.applied.length} waiting edits.`);
    await onChange();
  };
  root.querySelector('#oeSend')?.addEventListener('click', send);
  root.querySelectorAll('[data-oe]').forEach((b) => b.addEventListener('click', async () => {
    const slot = b.dataset.slot, a = b.dataset.oe;
    try {
      if (a === 'drop') queue.drop(slot); else await resolve(queue, handlers, slot, a);
      say(a === 'mine' ? 'Your version was sent.' : a === 'theirs' ? 'Kept the version at the hub.' : 'Discarded.');
    } catch (e) { say(String(e?.message || e), true); }
    await onChange();
  }));
  return send;
}
