// Notifications in the hub (migration 20261026050000_notifications.sql, hub/NOTIFICATIONS.md).
//   bell      in the header on every signed-in page: unread count, the latest 30, mark read, open the page it points to. The hub/web
//             pages do not use Supabase Realtime, so the count is polled every 60 s while the tab is visible.
//   settings  on /account: email and push per kind, quiet hours, a daily digest, and "turn on notifications on this device"
//             (Web Push through /sw.js). On iPhone and iPad, push works only from the installed app (Add to Home Screen).
// The person's own rows only: notifications_list / _unread_count / _mark_read are SECURITY INVOKER (row-level security decides).

import { centerTz } from './center-time.js';   // times in the open center's zone

const L = {
  en: { bell: 'Notifications', unread: (n) => `${n} unread`, none: 'Nothing new yet.', markAll: 'Mark all read', settings: 'Notification settings',
        title: 'Notifications', email: 'Email', push: 'This device', quiet: 'Quiet hours (no email or push; incidents still come through)',
        from: 'From', to: 'To', digest: 'One email a day instead of one each time (incidents still come right away)', save: 'Save', saved: 'Saved.',
        pushOn: 'Turn on notifications on this device', pushOff: 'Turn off on this device', pushOnNow: 'Notifications are on for this device.',
        pushNo: 'This browser cannot show notifications.', pushDenied: 'Notifications are blocked for this site in the browser settings.',
        pushNotReady: 'Notifications to devices are not set up on this hub yet.',
        ios: 'On iPhone or iPad: tap Share, then "Add to Home Screen", and open Futures Hub from the Home Screen to turn notifications on.',
        privacy: 'A device notification only says "New update from Futures Friends": no names, no photos. Open the hub to read it.',
        kinds: { message: 'Messages', daily_report: 'Daily reports', progress_report: 'Progress reports', kid_video: 'Videos for your child',
                 announcement: 'Announcements', incident: 'Incident reports', consent: 'Consent requests', billing: 'Billing', system: 'Other', hiring: 'Hiring', health: 'Health records' },
        dailyNote: 'The daily report email is set in Message settings.' },
  es: { bell: 'Avisos', unread: (n) => `${n} sin leer`, none: 'Nada nuevo todavía.', markAll: 'Marcar todo como leído', settings: 'Ajustes de avisos',
        title: 'Avisos', email: 'Correo', push: 'Este dispositivo', quiet: 'Horas de silencio (sin correo ni avisos; los incidentes sí llegan)',
        from: 'Desde', to: 'Hasta', digest: 'Un correo al día en lugar de uno cada vez (los incidentes llegan de inmediato)', save: 'Guardar', saved: 'Guardado.',
        pushOn: 'Activar avisos en este dispositivo', pushOff: 'Desactivar en este dispositivo', pushOnNow: 'Los avisos están activados en este dispositivo.',
        pushNo: 'Este navegador no puede mostrar avisos.', pushDenied: 'Los avisos están bloqueados para este sitio en el navegador.',
        pushNotReady: 'Los avisos a dispositivos todavía no están configurados en este hub.',
        ios: 'En iPhone o iPad: toque Compartir, luego "Agregar a inicio", y abra Futures Hub desde la pantalla de inicio para activar los avisos.',
        privacy: 'Un aviso en el dispositivo solo dice "Nueva actualización de Futures Friends": sin nombres ni fotos. Abra el hub para leerlo.',
        kinds: { message: 'Mensajes', daily_report: 'Reportes del día', progress_report: 'Reportes de progreso', kid_video: 'Videos para su niño',
                 announcement: 'Anuncios', incident: 'Reportes de incidentes', consent: 'Solicitudes de consentimiento', billing: 'Facturación', system: 'Otros', hiring: 'Contratación', health: 'Registros de salud' },
        dailyNote: 'El correo del reporte del día se ajusta en Ajustes de mensajes.' },
};

const POLL_MS = 60000;
const b64urlToBytes = (s) => {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
};
export const isIos = (ua = navigator.userAgent) => /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
export const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
// a link stored by hub_notify is a path inside the hub; anything else is not followed
export const safeLink = (l) => (typeof l === 'string' && /^\/[A-Za-z0-9/_.~?=&%:-]*$/.test(l) && !l.startsWith('//') ? l : null);

export function mountNotify({ esc, $, rpc, go, live, getLang, vapidKey }) {
  const t = () => L[getLang() === 'es' ? 'es' : 'en'];
  let timer = null, open = false, items = [], count = 0, keyBound = false;

  const when = (iso) => new Date(iso).toLocaleString(getLang() === 'es' ? 'es-US' : 'en-US', { timeZone: centerTz(), month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  function badge() {
    const b = $('#notifBell'); if (!b) return;
    b.setAttribute('aria-label', `${t().bell}${count ? `, ${t().unread(count)}` : ''}`);
    b.setAttribute('aria-expanded', String(open));
    const n = $('#notifCount', b);
    n.textContent = count > 99 ? '99+' : String(count);
    n.hidden = !count;
  }
  async function refresh() {
    try { count = await rpc('notifications_unread_count'); } catch (_) { return; }   // signed out or offline: try at the next tick
    badge();
  }
  function panelHtml() {
    const x = t();
    return `<div class="notif-head"><h2 id="notifTitle">${esc(x.title)}</h2>
      <button class="btn link small" type="button" id="notifAll"${count ? '' : ' disabled'}>${esc(x.markAll)}</button></div>
      ${items.length ? `<ul class="notif-list" id="notifList">${items.map((n) => {
        const href = safeLink(n.link);
        const inner = `<b>${esc(n.title)}</b>${n.body ? `<span class="notif-body">${esc(n.body)}</span>` : ''}<span class="notif-when">${esc(when(n.created_at))}</span>`;
        return `<li class="${n.read_at ? '' : 'unread'}" data-kind="${esc(n.kind)}">${href ? `<a href="${esc(href)}" data-notif="${esc(n.id)}">${inner}</a>`
          : `<button type="button" class="notif-plain" data-notif="${esc(n.id)}">${inner}</button>`}</li>`; }).join('')}</ul>`
        : `<p class="empty" id="notifEmpty">${esc(x.none)}</p>`}
      <p class="notif-foot"><a href="/account#notify" data-nav id="notifSettings">${esc(x.settings)}</a></p>`;
  }
  async function openPanel() {
    const p = $('#notifPanel'); if (!p) return;
    try { items = await rpc('notifications_list', { p_limit: 30 }); } catch (_) { items = []; }
    open = true;
    p.innerHTML = panelHtml();
    p.hidden = false;
    badge();
    $('#notifTitle', p)?.focus?.();
  }
  function closePanel() { const p = $('#notifPanel'); if (p) p.hidden = true; open = false; badge(); }

  // the bell: called by the header after sign-in (and again on every render, which keeps one timer)
  function install(nav) {
    const wrap = document.createElement('span');
    wrap.className = 'notif-wrap';
    wrap.innerHTML = `<button class="btn link small notif-bell" type="button" id="notifBell" aria-haspopup="true" aria-controls="notifPanel" aria-expanded="false">
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>
      <span class="notif-count" id="notifCount" hidden>0</span></button>
      <div class="notif-panel" id="notifPanel" role="region" aria-labelledby="notifTitle" hidden></div>`;
    nav.prepend(wrap);
    $('#notifBell').onclick = () => (open ? closePanel() : openPanel());
    const p = $('#notifPanel');
    p.addEventListener('click', async (e) => {
      if (e.target.closest('#notifAll')) {
        await rpc('notifications_mark_read', {});
        items = items.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }));
        count = 0; p.innerHTML = panelHtml(); badge(); live(t().saved);
        return;
      }
      if (e.target.closest('#notifSettings')) { closePanel(); return; }     // data-nav handles the navigation
      const el = e.target.closest('[data-notif]'); if (!el) return;
      e.preventDefault();
      e.stopPropagation();                                                // the global data-nav handler must not also navigate
      const id = el.getAttribute('data-notif');
      const n = items.find((x) => x.id === id);
      if (n && !n.read_at) { try { await rpc('notifications_mark_read', { p_ids: [id] }); } catch (_) { /* still open it */ } }
      closePanel(); refresh();
      const href = el.getAttribute('href'); if (href) go(href);
    });
    badge();
    refresh();
    if (!keyBound) {
      keyBound = true;
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) { closePanel(); $('#notifBell')?.focus(); } });
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && $('#notifBell')) refresh(); });
    }
    if (!timer) {
      timer = setInterval(() => { if (document.visibilityState === 'visible' && $('#notifBell')) refresh(); }, POLL_MS);
    }
    if (new URLSearchParams(location.search).has('notifications')) openPanel();   // opened from a device notification
  }
  function stop() { if (timer) clearInterval(timer); timer = null; count = 0; items = []; open = false; }

  // ---- settings card (/account) ---------------------------------------------------------------------------------------
  async function settingsCard() {
    const x = t();
    const p = await rpc('notification_prefs_get');
    const row = (k) => `<tr><th scope="row">${esc(x.kinds[k.kind] || k.kind)}</th>
      <td><input type="checkbox" name="email:${esc(k.kind)}"${k.email ? ' checked' : ''}${k.kind === 'daily_report' ? ' disabled' : ''} aria-label="${esc(`${x.email}: ${x.kinds[k.kind]}`)}"></td>
      <td><input type="checkbox" name="push:${esc(k.kind)}"${k.push ? ' checked' : ''} aria-label="${esc(`${x.push}: ${x.kinds[k.kind]}`)}"></td></tr>`;
    return `<form class="card" id="notify" novalidate><h2>${esc(x.settings)}</h2>
      <table class="notif-prefs"><thead><tr><th scope="col"></th><th scope="col">${esc(x.email)}</th><th scope="col">${esc(x.push)}</th></tr></thead>
      <tbody>${p.kinds.map(row).join('')}</tbody></table>
      <p class="small muted">${esc(x.dailyNote)}</p>
      <fieldset class="f"><legend>${esc(x.quiet)}</legend>
        <label>${esc(x.from)} <input class="i small" type="time" name="quiet_start" value="${esc(p.quiet_start || '')}"></label>
        <label>${esc(x.to)} <input class="i small" type="time" name="quiet_end" value="${esc(p.quiet_end || '')}"></label></fieldset>
      <label class="choice"><input type="checkbox" name="digest"${p.digest === 'daily' ? ' checked' : ''}><span>${esc(x.digest)}</span></label>
      <p class="msg" id="notifPrefsMsg" role="status"></p>
      <button class="btn navy" type="submit">${esc(x.save)}</button>
      <hr>
      <p class="small">${esc(x.privacy)}</p>
      ${isIos() && !isStandalone() ? `<p class="small hint" id="iosHint">${esc(x.ios)}</p>` : ''}
      <div class="cta-row"><button class="btn gold small" type="button" id="pushToggle">${esc(x.pushOn)}</button></div>
      <p class="msg" id="pushMsg" role="status"></p></form>`;
  }
  async function bindSettings() {
    const f = $('#notify'); if (!f) return;
    const x = t();
    f.onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(f), email = {}, push = {};
      for (const el of f.querySelectorAll('input[type=checkbox][name*=":"]')) {
        const [ch, kind] = el.name.split(':');
        if (el.disabled) continue;
        (ch === 'email' ? email : push)[kind] = el.checked;
      }
      const m = $('#notifPrefsMsg');
      try {
        await rpc('notification_prefs_set', { p: { email, push, quiet_start: fd.get('quiet_start') || null, quiet_end: fd.get('quiet_end') || null,
          digest: fd.get('digest') ? 'daily' : 'off' } });
        m.className = 'msg ok'; m.textContent = x.saved; live(x.saved);
      } catch (err) { m.className = 'msg bad'; m.textContent = String(err?.message || err); }
    };
    const btn = $('#pushToggle'), msg = $('#pushMsg');
    const say = (s, cls = '') => { msg.className = `msg ${cls}`; msg.textContent = s; };
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) { btn.disabled = true; say(isIos() && !isStandalone() ? x.ios : x.pushNo); return; }
    if (!vapidKey) { btn.disabled = true; say(x.pushNotReady); return; }
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    let sub = await reg.pushManager.getSubscription();
    const label = () => { btn.textContent = sub ? x.pushOff : x.pushOn; if (sub) say(x.pushOnNow, 'ok'); };
    label();
    btn.onclick = async () => {
      try {
        if (sub) {
          await rpc('push_unsubscribe', { p_endpoint: sub.endpoint });
          await sub.unsubscribe(); sub = null; say(''); label(); return;
        }
        if ((await Notification.requestPermission()) !== 'granted') { say(x.pushDenied, 'bad'); return; }
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64urlToBytes(vapidKey) });
        const j = sub.toJSON();
        await rpc('push_subscribe', { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth, p_user_agent: navigator.userAgent.slice(0, 300) });
        label();
      } catch (err) { say(String(err?.message || err), 'bad'); }
    };
  }

  return { install, stop, refresh, openPanel, settingsCard, bindSettings };
}
