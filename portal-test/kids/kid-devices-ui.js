// Paired Kid Mode devices, the grown-ups' side (N14, hub/KID_MODE.md "Paired devices"; migration 20261028100000_kid_device_pairing.sql).
//
//   mountFamilyDevices(el, ctx)   the family dashboard card: pair a device for one child or brothers and sisters (a one-time code + QR,
//                                 10 minutes), the devices that can open Kid Mode for my children, and Remove. Also its own page,
//                                 /c/<slug>/devices?device=<id> (app.js), where the "new device paired" notification opens.
//   mountRoomTablets(el, ctx)     staff, on the Kid Mode room picker: a printable QR login card for ONE room tablet (24 hours to scan,
//                                 single use), the room tablets, and Remove.
// The device itself runs /kid-device (kid-device.js). English + Spanish (DRAFT) through i18n.js dict(). No inline styles (CSP).
import { dict, fmtDateTime } from './i18n.js';
import { qrSvg } from './qr.js';

const W = {
  en: {
    title: "Kid Mode on your child's own device", intro: 'Pair a tablet or phone to one child, or to brothers and sisters. Your child taps their picture and picks their friend. The device opens Kid Mode only: never your account, messages or billing. You can remove it at any time.',
    none: 'No device is paired yet.', label: 'Name of the device', labelPh: 'Kitchen tablet', kids: 'Who can play on it', pair: 'Get a pairing code',
    codeT: 'Your pairing code', codeHow: (u) => `On your child's device, open ${u} and type this code, or scan the QR code with that device's camera. The code works once, for 10 minutes.`,
    done: 'Done', remove: 'Remove', removeAsk: (l) => `Remove "${l}"? It stops opening Kid Mode at once.`, removed: 'Removed.',
    pickKid: 'Choose at least one child.', active: 'Can open Kid Mode', waiting: 'Waiting for the code', gone: 'Removed', lastUsed: (t) => `Last used ${t}`, never: 'Not used yet',
    byOther: 'Paired by another grown-up', until: (t) => `until ${t}`,
    reason: { revoked: 'removed by a grown-up', removed_on_device: 'removed on the device', consent: 'Kid Mode consent withdrawn', custody: 'access changed by the center',
      guardian_removed: 'access changed', left_center: 'left the center', staff_removed: 'staff access changed', expired: 'not used for 30 days', center_closed: 'center closed', no_children: 'no child left on it' },
    roomT: 'Room tablets: QR login cards', roomIntro: 'A login card pairs ONE classroom tablet with one room. Children then tap their own picture (first name and friend only). Print the card, scan it with the tablet within 24 hours; it works once. Remove a tablet here at any time.',
    room: 'Room', tabLabel: 'Name of the tablet', tabPh: 'Reading corner tablet', card: 'Make a login card', print: 'Print the card',
    cardT: (r) => `Kid Mode login card: ${r}`, cardHow: (u) => `On the room tablet, open ${u} and scan this card (or type the code). Works once, for 24 hours.`, noTabs: 'No room tablets yet.',
  },
  es: {
    title: 'Modo Niños en el propio aparato de su hijo o hija', intro: 'Vincule una tableta o un teléfono a un niño, o a hermanos. Su hijo toca su dibujo y elige a su amigo. El aparato solo abre el Modo Niños: nunca su cuenta, sus mensajes ni sus pagos. Puede quitarlo cuando quiera.',
    none: 'Todavía no hay ningún aparato vinculado.', label: 'Nombre del aparato', labelPh: 'Tableta de la cocina', kids: 'Quién puede jugar en él', pair: 'Obtener un código',
    codeT: 'Su código para vincular', codeHow: (u) => `En el aparato de su hijo, abra ${u} y escriba este código, o escanee el código QR con la cámara de ese aparato. El código sirve una vez, durante 10 minutos.`,
    done: 'Listo', remove: 'Quitar', removeAsk: (l) => `¿Quitar "${l}"? Deja de abrir el Modo Niños de inmediato.`, removed: 'Se quitó.',
    pickKid: 'Elija al menos un niño.', active: 'Puede abrir el Modo Niños', waiting: 'Esperando el código', gone: 'Quitado', lastUsed: (t) => `Último uso ${t}`, never: 'Sin usar todavía',
    byOther: 'Lo vinculó otro adulto', until: (t) => `hasta ${t}`,
    reason: { revoked: 'lo quitó un adulto', removed_on_device: 'se quitó en el aparato', consent: 'se retiró el consentimiento del Modo Niños', custody: 'el centro cambió el acceso',
      guardian_removed: 'cambió el acceso', left_center: 'ya no asiste al centro', staff_removed: 'cambió el acceso del personal', expired: 'sin usar por 30 días', center_closed: 'centro cerrado', no_children: 'ya no tiene niños' },
    roomT: 'Tabletas del salón: tarjetas QR', roomIntro: 'Una tarjeta vincula UNA tableta del salón con un salón. Luego cada niño toca su propio dibujo (solo el nombre y su amigo). Imprima la tarjeta y escanéela con la tableta en 24 horas; sirve una vez. Quite una tableta aquí cuando quiera.',
    room: 'Salón', tabLabel: 'Nombre de la tableta', tabPh: 'Tableta del rincón de lectura', card: 'Hacer una tarjeta', print: 'Imprimir la tarjeta',
    cardT: (r) => `Tarjeta del Modo Niños: ${r}`, cardHow: (u) => `En la tableta del salón, abra ${u} y escanee esta tarjeta (o escriba el código). Sirve una vez, durante 24 horas.`, noTabs: 'Todavía no hay tabletas del salón.',
  },
};

export const deviceUrl = (origin) => `${origin}/kid-device`;
export const pairUrl = (origin, code) => `${origin}/kid-device#pair=${encodeURIComponent(code)}`;
export const showCode = (code) => `${String(code).slice(0, 4)}-${String(code).slice(4)}`;

function statusText(L, d, lang) {
  if (d.status === 'revoked') return `${L.gone}: ${L.reason[d.revoke_reason] || d.revoke_reason || ''}`;
  if (d.status === 'waiting') return `${L.waiting} (${L.until(fmtDateTime(d.expires_at, undefined, lang))})`;
  return `${L.active}. ${d.last_seen_at ? L.lastUsed(fmtDateTime(d.last_seen_at, undefined, lang)) : L.never}`;
}
function listHtml(esc, L, list, lang, empty) {
  if (!list.length) return `<p class="muted" id="kdvEmpty">${esc(empty)}</p>`;
  return `<ul class="kdv-list" id="kdvList">${list.map((d) => `<li class="kdv-item" data-device="${esc(d.id)}" data-status="${esc(d.status)}"><div class="kdv-item-body">
      <b>${esc(d.label)}</b>${d.kind === 'room' ? `<span class="small">${esc(d.room_name || d.room)}</span>` : `<span class="small">${esc((d.kids || []).filter((k) => !k.removed).map((k) => k.first).join(', '))}</span>`}
      <span class="small muted">${esc(statusText(L, d, lang))}${d.kind === 'home' && !d.mine ? ` · ${esc(L.byOther)}` : ''}</span></div>
      ${d.status !== 'revoked' ? `<button class="btn soft small" type="button" data-remove="${esc(d.id)}" aria-label="${esc(`${L.remove}: ${d.label}`)}">${esc(L.remove)}</button>` : ''}</li>`).join('')}</ul>`;
}
async function bindRemove(box, ctx, L, again) {
  box.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-remove]'); if (!b) return;
    const d = b.closest('.kdv-item').querySelector('b')?.textContent || '';
    if (!window.confirm(L.removeAsk(d))) return;
    b.disabled = true;
    try { await ctx.rpc('kid_device_revoke', { p_device: b.dataset.remove }); ctx.live?.(L.removed); await again(); }
    catch (err) { b.disabled = false; const m = box.querySelector('.kdv-msg'); if (m) { m.className = 'small msg bad kdv-msg'; m.textContent = ctx.friendly ? ctx.friendly(err) : err.message; } }
  });
}

// ---- the family dashboard card ----------------------------------------------------------------------------------------------
export async function mountFamilyDevices(el, ctx) {
  const { c, rpc, esc, lang } = ctx;
  const L = dict(W, lang);
  const kids = ctx.kids || [];
  const render = async () => {
    let list = [];
    try { list = (await rpc('kid_devices_list', { p_center: c.center_id })).filter((d) => d.kind === 'home'); } catch (_) { /* the pair form still shows */ }
    el.innerHTML = `<h2 id="kdvH" tabindex="-1">${esc(L.title)}</h2><p class="small">${esc(L.intro)}</p>${listHtml(esc, L, list, lang, L.none)}
      <form class="kdv-pairbox" id="kdvPair" novalidate>
        <div class="f"><label for="kdvLabel">${esc(L.label)}</label><input id="kdvLabel" maxlength="40" placeholder="${esc(L.labelPh)}" autocomplete="off"></div>
        <fieldset class="f"><legend>${esc(L.kids)}</legend><div class="kdv-kids">${kids.map((k) => `<label><input type="checkbox" name="kid" value="${esc(k.id)}"${k.id === ctx.current ? ' checked' : ''}>${esc(k.first)}</label>`).join('')}</div></fieldset>
        <button class="btn navy" type="submit" id="kdvGo">${esc(L.pair)}</button><p class="small msg kdv-msg" role="status" id="kdvMsg"></p></form>
      <div id="kdvCode" hidden></div>`;
    document.getElementById('kdvPair').addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = document.getElementById('kdvMsg');
      const picked = [...el.querySelectorAll('input[name="kid"]:checked')].map((x) => x.value);
      msg.className = 'small msg kdv-msg'; msg.textContent = '';
      if (!picked.length) { msg.className = 'small msg bad kdv-msg'; msg.textContent = L.pickKid; return; }
      const label = document.getElementById('kdvLabel').value.trim() || L.labelPh;
      let p;
      try { p = await rpc('kid_device_pair_begin', { p_center: c.center_id, p_kids: picked, p_label: label }); }
      catch (err) { msg.className = 'small msg bad kdv-msg'; msg.textContent = ctx.friendly ? ctx.friendly(err) : err.message; return; }
      const box = document.getElementById('kdvCode');
      box.hidden = false;
      box.innerHTML = `<div class="kdv-card" id="kdvCodeCard" role="region" aria-labelledby="kdvCodeH"><h3 id="kdvCodeH">${esc(L.codeT)}</h3>
        <p class="kdv-code" id="kdvCodeText" translate="no">${esc(showCode(p.code))}</p>
        <div class="kdv-qr">${qrSvg(pairUrl(location.origin, p.code), { ecl: 'M', quiet: 2, title: L.codeT })}</div>
        <p class="small">${esc(L.codeHow(deviceUrl(location.origin)))}</p>
        <button class="btn soft no-print" type="button" id="kdvDone">${esc(L.done)}</button></div>`;
      document.getElementById('kdvPair').hidden = true;
      document.getElementById('kdvCodeText').focus?.();
      document.getElementById('kdvDone').addEventListener('click', () => render());
    });
  };
  await render();
  bindRemove(el, ctx, L, render);
  // the "new device paired" notification opens /c/<slug>/devices?device=<id>: that device, marked and focused
  if (ctx.highlight) {
    const item = [...el.querySelectorAll('.kdv-item')].find((x) => x.dataset.device === ctx.highlight);
    const target = item || document.getElementById('kdvH');
    if (item) { item.classList.add('kdv-hit'); item.setAttribute('tabindex', '-1'); }
    target?.scrollIntoView({ block: 'center' }); target?.focus({ preventScroll: true });
  }
}

// ---- the room tablets (staff) -------------------------------------------------------------------------------------------------
export async function mountRoomTablets(el, ctx) {
  const { c, rpc, esc, lang } = ctx;
  const L = dict(W, lang);
  const rooms = ctx.rooms || [];
  const render = async () => {
    let list = [];
    try { list = (await rpc('kid_devices_list', { p_center: c.center_id })).filter((d) => d.kind === 'room'); } catch (_) { /* the form still shows */ }
    el.innerHTML = `<h2>${esc(L.roomT)}</h2><p class="small">${esc(L.roomIntro)}</p>${listHtml(esc, L, list, lang, L.noTabs)}
      <form class="kdv-pairbox" id="kdvRoom" novalidate>
        <div class="f"><label for="kdvRoomSel">${esc(L.room)}</label><select id="kdvRoomSel">${rooms.map((r) => `<option value="${esc(r.id)}">${esc(r.name)}</option>`).join('')}</select></div>
        <div class="f"><label for="kdvTabLabel">${esc(L.tabLabel)}</label><input id="kdvTabLabel" maxlength="40" placeholder="${esc(L.tabPh)}" autocomplete="off"></div>
        <button class="btn navy" type="submit" id="kdvCardGo">${esc(L.card)}</button><p class="small msg kdv-msg" role="status" id="kdvRoomMsg"></p></form>
      <div id="kdvRoomCard" hidden></div>`;
    document.getElementById('kdvRoom').addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = document.getElementById('kdvRoomMsg');
      const room = document.getElementById('kdvRoomSel').value;
      let p;
      try { p = await rpc('kid_device_room_card', { p_center: c.center_id, p_room: room, p_label: document.getElementById('kdvTabLabel').value.trim() || null }); }
      catch (err) { msg.className = 'small msg bad kdv-msg'; msg.textContent = ctx.friendly ? ctx.friendly(err) : err.message; return; }
      const name = rooms.find((r) => r.id === room)?.name || room;
      const box = document.getElementById('kdvRoomCard');
      box.hidden = false;
      box.innerHTML = `<div class="kdv-card" id="kdvPrintCard"><h3>${esc(L.cardT(name))}</h3>
        <div class="kdv-qr">${qrSvg(pairUrl(location.origin, p.code), { ecl: 'M', quiet: 2, title: L.cardT(name) })}</div>
        <p class="kdv-code" translate="no">${esc(showCode(p.code))}</p><p class="small">${esc(L.cardHow(deviceUrl(location.origin)))}</p>
        <p class="small muted">${esc(L.until(fmtDateTime(p.expires_at, undefined, lang)))}</p>
        <div class="cta-row no-print"><button class="btn gold" type="button" id="kdvPrint">${esc(L.print)}</button><button class="btn soft" type="button" id="kdvRoomDone">${esc(L.done)}</button></div></div>`;
      document.getElementById('kdvRoom').hidden = true;
      document.getElementById('kdvPrint').addEventListener('click', () => window.print());
      document.getElementById('kdvRoomDone').addEventListener('click', () => render());
    });
  };
  await render();
  bindRemove(el, ctx, L, render);
}
