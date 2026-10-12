/* Futures Hub TEST copy (hub/scripts/build-portal-test.mjs, hub/FAMILY_DASHBOARD.md "The test copy on the website").
   Loaded before the real front-end. It makes the copy work as static files on GitHub Pages, without a server or a database:
   - the "hub" is a recording (fixtures.json): every request the pages make to it is answered from there; nothing leaves the page;
   - sign-in works with the TEST logins only (logins.json holds salted SHA-256 hashes; fake data, so a client-side check is enough);
   - writes answer "done" without keeping anything, and a small note says "This is a test version: nothing is saved";
   - requests the recording does not have get an empty answer and a console warning, never an error page;
   - realtime, push notifications, sign-in links and password resets are off;
   - the copy lives under .../portal-test/: the app's own addresses (/c/<slug>/...) are mapped onto that folder.
   The page clock is clock.js (the recorded afternoon). */
(function () {
  'use strict';
  var W = window, D = document;
  var m = location.pathname.match(/^(.*?\/portal-test)(?:\/|$)/);
  var BASE = m ? m[1] : '';
  var ORIGIN = location.origin;
  var SB_PATH = BASE + '/sb';
  var SB = ORIGIN + SB_PATH;
  var SLUG = 'test-family-demo-center';
  var SIGNIN = '/c/' + SLUG;
  // keep equal to WRITE / isWriteRpc in build-portal-test.mjs
  var WRITE = /(^|_)(set|save|mark|unmark|send|create|delete|ack|acknowledge|submit|reply|give|withdraw|remove|decide|record|add|begin|finish|comment|cancel|book|respond|done|start|end|pick|subscribe|unsubscribe|upload|request|approve|revoke|claim|forget|close|accept|release|play|beat|join|enroll|sign|update|edit|void|punch|assign|invite|reopen|lock|attach|preapprove|verify|answer|hello|call|pair|write|dismiss|transfer|apply|activate|propose|choose|override|score|observe|log|report|portfolio|act|open|export|generate)(_|$)/;
  var READ_OK = { kid_work_portfolio: 1, notification_open: 1, child_document_open: 1, family_data_export: 1, child_transfer_statement: 1 };
  function isWriteRpc(n) { return WRITE.test(n) && !READ_OK[n] && !/_(list|get|for_family|for_child|view|board|status|overview|options|summary)$/.test(n); }
  var QUIET = { set_my_preferred_language: 1, app_error_report: 1, notifications_mark_read: 1, push_subscribe: 1, push_unsubscribe: 1 };
  var lang = function () { try { return localStorage.getItem('ff-hub-lang') === 'es' ? 'es' : 'en'; } catch (e) { return 'en'; } };
  var es = function () { return (D.documentElement.lang || lang()) === 'es'; };

  // ---- addresses: the app's paths <-> .../portal-test/... -------------------------------------------------------------------
  function strip(p) { return p.indexOf(BASE + '/') === 0 ? p.slice(BASE.length) : (p === BASE ? '/' : p); }
  function toReal(u) {
    if (u instanceof URL) u = u.href;
    if (typeof u !== 'string') return u;
    if (u.indexOf(ORIGIN + '/') === 0) u = u.slice(ORIGIN.length);
    if (u.charAt(0) !== '/' || u.charAt(1) === '/' || u.indexOf(BASE + '/') === 0) return u;
    var path = u.split(/[?#]/)[0];
    // the hub's own home page, "Start your center" and Futures at Home are not part of the test: they open the demo center's sign-in page
    if (path === '/' || path === '/start' || path === '/at-home' || path === '/hq') u = SIGNIN;
    return BASE + u;
  }
  var q = new URLSearchParams(location.search), back = q.get('p');   // a deep link that came through the site's 404.html
  if (back && back.charAt(0) === '/' && back.charAt(1) !== '/') history.replaceState(null, '', toReal(back));
  else if (strip(location.pathname) === '/' || strip(location.pathname) === '') history.replaceState(null, '', BASE + SIGNIN + '/' + location.hash);
  ['pushState', 'replaceState'].forEach(function (fn) {
    var orig = history[fn];
    history[fn] = function (s, t, u) { return orig.call(this, s, t, u == null ? u : toReal(u)); };
  });
  W.FFTest = { base: BASE, sbUrl: SB, pathname: function () { return strip(location.pathname); } };
  function fixLink(a) {
    var h = a.getAttribute('href');
    if (h && h.charAt(0) === '/' && h.charAt(1) !== '/' && h.indexOf(BASE + '/') !== 0) a.setAttribute('href', toReal(h));
  }
  function fixTree(n) {
    if (n.nodeType !== 1) return;
    if (n.tagName === 'A') fixLink(n);
    if (n.querySelectorAll) { var as = n.querySelectorAll('a[href^="/"]'); for (var i = 0; i < as.length; i++) fixLink(as[i]); }
  }
  new MutationObserver(function (list) {
    for (var i = 0; i < list.length; i++) {
      var r = list[i];
      if (r.type === 'attributes') fixLink(r.target);
      else for (var j = 0; j < r.addedNodes.length; j++) fixTree(r.addedNodes[j]);
    }
  }).observe(D.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['href'] });
  D.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('a[href^="/"]'); if (a) fixLink(a); }, true);

  // ---- the recording -------------------------------------------------------------------------------------------------------------
  var realFetch = W.fetch.bind(W);
  var FIX = { entries: [], silent: [] }, BY = {}, LOGINS = [];
  var ready = Promise.all([
    realFetch(BASE + '/fixtures.json').then(function (r) { return r.json(); }).then(function (f) {
      FIX = f;
      f.entries.forEach(function (e) { if (!BY[e.k]) BY[e.k] = e; });
      f.silent.forEach(function (n) { QUIET[n] = 1; });
    }),
    realFetch(BASE + '/logins.json').then(function (r) { return r.ok ? r.json() : []; }).then(function (l) { LOGINS = l; }, function () { LOGINS = []; }),
  ]).catch(function (e) { console.warn('[test copy] the recording did not load', e); });

  var TS = /\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d+)?)?(?:Z|[+-]\d\d:?\d\d)?/g;
  function canon(v) {
    if (Array.isArray(v)) return v.map(canon);
    if (v && typeof v === 'object') { var o = {}; Object.keys(v).sort().forEach(function (k) { o[k] = canon(v[k]); }); return o; }
    return v;
  }
  function normBody(t) {
    if (!t) return '';
    var s = t;
    try { s = JSON.stringify(canon(JSON.parse(t))); } catch (e) { /* as sent */ }
    return s.replace(TS, '<ts>');
  }
  function normQuery(search) {
    var out = [];
    new URLSearchParams(search).forEach(function (v, k) { out.push([k, v]); });
    return out.sort(function (a, b) { return a[0] + a[1] < b[0] + b[1] ? -1 : 1; }).map(function (p) { return p[0] + '=' + p[1]; }).join('&').replace(TS, '<ts>');
  }
  function keyOf(method, path, search, body) { return method + ' ' + path + '?' + normQuery(search) + ' ' + normBody(body); }
  // The same request with other dates (another month on the calendar...): the first recorded answer for the same thing about the same
  // child / report / item, else nothing.
  var ID = /^(p_)?(kid|child|center|report|ticket|id|invoice|c|slug|p_slug|room|lang)$/;
  function idOf(path, search, body) {
    var o = {};
    try { var b = JSON.parse(body || '{}'); Object.keys(b).forEach(function (k) { if (ID.test(k)) o[k] = b[k]; }); } catch (e) { /* no body */ }
    new URLSearchParams(search).forEach(function (v, k) { if (/^(kid|id|center_id|child)$/.test(k)) o[k] = v; });
    return path + ' ' + JSON.stringify(canon(o));
  }
  var NEAR = null;
  function near(method, path, search, body) {
    if (!NEAR) {
      NEAR = {};
      FIX.entries.forEach(function (e) {
        var mm = e.k.match(/^(\S+) ([^?]*)\?(\S*) ?(.*)$/);
        if (!mm) return;
        var id = mm[1] + ' ' + idOf(mm[2], mm[3], mm[4]);
        if (!NEAR[id]) NEAR[id] = e;
      });
    }
    return NEAR[method + ' ' + idOf(path, search, body)] || null;
  }

  function json(body, status, extra) {
    var h = { 'Content-Type': 'application/json' };
    for (var k in extra || {}) h[k] = extra[k];
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status: status || 200, headers: h });
  }
  function fromEntry(e) {
    var h = { 'Content-Type': e.ct || 'application/json' };
    if (e.cr) h['Content-Range'] = e.cr;
    var b = String(e.b).split('__SB__').join(SB);
    return new Response(e.s === 204 || e.s === 304 ? null : b, { status: e.s === 304 ? 200 : e.s, headers: h });
  }
  function header(init, req, name) {
    var h = (init && init.headers) || (req && req.headers);
    if (!h) return '';
    if (typeof h.get === 'function') return h.get(name) || '';
    for (var k in h) if (k.toLowerCase() === name.toLowerCase()) return h[k];
    return '';
  }

  // ---- sign-in -------------------------------------------------------------------------------------------------------------------
  function b64u(s) { return btoa(unescape(encodeURIComponent(s))).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_'); }
  function unb64u(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return decodeURIComponent(escape(atob(s))); }
  function sha256(text) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (b) {
      return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
    });
  }
  function userFor(email) {
    return { id: FIX.userId, aud: 'authenticated', role: 'authenticated', email: email, email_confirmed_at: '2026-10-01T12:00:00Z',
      phone: '', app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: { full_name: FIX.fullName || 'TEST Parent Pat' },
      identities: [], factors: [], created_at: '2026-10-01T12:00:00Z', updated_at: '2026-10-12T12:00:00Z', is_anonymous: false };
  }
  function sessionFor(email) {
    var now = Math.floor(Date.now() / 1000), life = 7 * 86400, user = userFor(email);
    var jwt = b64u(JSON.stringify({ alg: 'none', typ: 'JWT' })) + '.' + b64u(JSON.stringify({ sub: user.id, email: email, role: 'authenticated',
      aud: 'authenticated', aal: 'aal1', amr: [{ method: 'password', timestamp: now }], session_id: 'portal-test', iat: now, exp: now + life,
      is_anonymous: false })) + '.portal-test';
    return { access_token: jwt, token_type: 'bearer', expires_in: life, expires_at: now + life, refresh_token: 'pt.' + b64u(email), user: user };
  }
  function emailFromBearer(init, req) {
    var a = header(init, req, 'Authorization').replace(/^Bearer\s+/i, '');
    try { return JSON.parse(unb64u(a.split('.')[1])).email || null; } catch (e) { return null; }
  }
  var BAD_LOGIN = { error: 'invalid_grant', error_description: 'Invalid login credentials', code: 'invalid_credentials', msg: 'Invalid login credentials' };
  function auth(method, path, search, body, init, req) {
    var p = path.replace(/^\/auth\/v1/, '');
    var b = {}; try { b = JSON.parse(body || '{}'); } catch (e) { /* none */ }
    if (p === '/token') {
      var grant = new URLSearchParams(search).get('grant_type');
      if (grant === 'password') {
        var email = String(b.email || '').trim().toLowerCase();
        var l = LOGINS.filter(function (x) { return x.email === email; })[0];
        if (!l) return Promise.resolve(json(BAD_LOGIN, 400));
        return sha256(l.salt + ':' + String(b.password || '')).then(function (h) { return h === l.hash ? json(sessionFor(email)) : json(BAD_LOGIN, 400); });
      }
      if (grant === 'refresh_token') {
        var em = null; try { em = unb64u(String(b.refresh_token || '').replace(/^pt\./, '')); } catch (e) { /* bad */ }
        if (em && LOGINS.some(function (x) { return x.email === em; })) return Promise.resolve(json(sessionFor(em)));
        return Promise.resolve(json({ error: 'invalid_grant', error_description: 'Refresh Token Not Found', code: 'refresh_token_not_found' }, 400));
      }
      return Promise.resolve(json({ error: 'unsupported_grant_type', msg: 'Not in the test version' }, 400));
    }
    if (p === '/user') {
      var who = emailFromBearer(init, req);
      return Promise.resolve(who ? json(userFor(who)) : json({ code: 401, msg: 'not signed in' }, 401));
    }
    if (p === '/logout') return Promise.resolve(new Response(null, { status: 204 }));
    if (p === '/settings') return Promise.resolve(json({ external: { email: true, google: false }, disable_signup: true, mailer_autoconfirm: false }));
    if (p === '/factors' || /^\/factors\//.test(p)) return Promise.resolve(json({ code: 422, msg: 'Two-step sign-in is off in the test version' }, 422));
    // sign-in links, password resets, sign-up: off (test-mode notes on the sign-in page say so)
    note(es() ? 'En la versión de prueba no se envían correos.' : 'The test version does not send email.');
    return Promise.resolve(json({}));
  }

  // ---- the hub (REST, RPC, storage) and the front-end server's /api/ --------------------------------------------------------------
  function hub(method, path, search, body, init, req) {
    if (path.indexOf('/auth/v1/') === 0) return auth(method, path, search, body, init, req);
    if (path.indexOf('/realtime/') === 0 || path.indexOf('/functions/') === 0) return Promise.resolve(json({}));
    var rpc = path.match(/^\/rest\/v1\/rpc\/([a-z0-9_]+)$/);
    if (rpc && rpc[1] === 'my_preferred_language') return Promise.resolve(json(JSON.stringify(lang())));
    var hit = BY[keyOf(method, path, search, body)];
    if (hit) return Promise.resolve(fromEntry(hit));
    var accept = header(init, req, 'Accept');
    var one = /vnd\.pgrst\.object/.test(accept);
    if (rpc) {
      if (QUIET[rpc[1]]) return Promise.resolve(json('null'));
      if (isWriteRpc(rpc[1])) { saved(); return Promise.resolve(json('null')); }
    } else if (path.indexOf('/rest/v1/') === 0 && method !== 'GET' && method !== 'HEAD') {
      saved();
      var prefer = header(init, req, 'Prefer');
      if (!/return=representation/.test(prefer)) return Promise.resolve(new Response(null, { status: method === 'POST' ? 201 : 204 }));
      var rows = []; try { rows = JSON.parse(body || '[]'); } catch (e) { rows = []; }
      if (!Array.isArray(rows)) rows = [rows];
      rows = rows.map(function (r, i) { var o = {}; for (var k in r) o[k] = r[k]; if (o.id == null) o.id = 'test-' + Date.now() + '-' + i; return o; });
      return Promise.resolve(json(one ? (rows[0] || null) : rows, method === 'POST' ? 201 : 200));
    } else if (/^\/storage\/v1\/object\/sign\//.test(path) && method === 'POST') {
      var obj = path.replace(/^\/storage\/v1\/object\/sign\//, '');
      var b = {}; try { b = JSON.parse(body || '{}'); } catch (e) { /* none */ }
      if (Array.isArray(b.paths)) return Promise.resolve(json(b.paths.map(function (x) { return { path: x, error: null, signedURL: '/object/sign/' + obj + '/' + x + '?token=portal-test' }; })));
      return Promise.resolve(json({ signedURL: '/object/sign/' + obj + '?token=portal-test' }));
    } else if (path.indexOf('/storage/v1/') === 0 && method !== 'GET') {
      saved();
      return Promise.resolve(json({ Key: 'portal-test', Id: 'portal-test' }));
    }
    var close = near(method, path, search, body);
    if (close) return Promise.resolve(fromEntry(close));
    console.warn('[test copy] not in the recording, answered empty:', method, path + search);
    if (rpc) return Promise.resolve(json('null'));
    if (method === 'HEAD') return Promise.resolve(new Response(null, { status: 200, headers: { 'Content-Range': '*/0' } }));
    return Promise.resolve(json(one ? 'null' : '[]', 200, { 'Content-Range': '*/0' }));
  }
  function api(method, path, search) {
    var hit = BY[keyOf(method, path, search, '')];
    if (hit) return Promise.resolve(fromEntry(hit));
    if (method !== 'GET') { saved(); return Promise.resolve(json({ ok: true })); }
    console.warn('[test copy] not in the recording, answered empty:', method, path + search);
    return Promise.resolve(json({}));
  }

  function bodyOf(input, init) {
    if (init && init.body != null) return Promise.resolve(typeof init.body === 'string' ? init.body : '');
    if (input instanceof Request) return input.clone().text().catch(function () { return ''; });
    return Promise.resolve('');
  }
  W.fetch = function (input, init) {
    var req = input instanceof Request ? input : null;
    var url;
    try { url = new URL(req ? req.url : String(input), D.baseURI); } catch (e) { return realFetch(input, init); }
    var method = String((init && init.method) || (req && req.method) || 'GET').toUpperCase();
    if (url.origin === ORIGIN && url.pathname.indexOf(SB_PATH + '/') === 0) {
      var path = url.pathname.slice(SB_PATH.length);
      if (method === 'GET' && /^\/storage\/v1\/object\/(sign|public|authenticated)\//.test(path)) return realFetch(ORIGIN + url.pathname);
      return ready.then(function () { return bodyOf(input, init); }).then(function (b) { return hub(method, path, url.search, b, init, req); });
    }
    if (url.origin === ORIGIN && url.pathname.indexOf('/api/') === 0) return ready.then(function () { return api(method, url.pathname, url.search); });
    if (url.origin === ORIGIN && url.pathname.indexOf(BASE + '/') !== 0) return realFetch(ORIGIN + toReal(url.pathname + url.search), init);
    if (url.origin !== ORIGIN) {
      console.warn('[test copy] a request to another site was not sent:', url.origin);
      return Promise.resolve(json({}));
    }
    return realFetch(input, init);
  };
  // XHR: only for the hub and /api/ (uploads); answered "done" without sending anything
  var XO = XMLHttpRequest.prototype.open, XS = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, u) {
    try { var url = new URL(String(u), D.baseURI); this.__ftest = url.origin !== ORIGIN || url.pathname.indexOf(SB_PATH + '/') === 0 || url.pathname.indexOf('/api/') === 0; } catch (e) { this.__ftest = false; }
    return XO.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function () {
    if (!this.__ftest) return XS.apply(this, arguments);
    var x = this;
    saved();
    ['readyState', 'status', 'responseText', 'response'].forEach(function (k, i) { Object.defineProperty(x, k, { configurable: true, value: [4, 200, '{}', '{}'][i] }); });
    setTimeout(function () { ['readystatechange', 'load', 'loadend'].forEach(function (t) { x.dispatchEvent(new Event(t)); }); if (x.onload) x.onload(); if (x.onreadystatechange) x.onreadystatechange(); }, 50);
  };
  // realtime (WebSocket to the hub): never opens
  var RealWS = W.WebSocket;
  W.WebSocket = function (u, p) {
    if (String(u).indexOf(ORIGIN.replace(/^http/, 'ws')) === 0 || String(u).indexOf('/realtime/') > -1) {
      var fake = { readyState: 3, send: function () {}, close: function () {}, addEventListener: function () {}, removeEventListener: function () {} };
      return fake;
    }
    return new RealWS(u, p);
  };
  W.WebSocket.prototype = RealWS.prototype;
  ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'].forEach(function (k) { W.WebSocket[k] = RealWS[k]; });
  // push notifications: no service worker in the test copy
  if (navigator.serviceWorker) {
    try { navigator.serviceWorker.register = function () { return Promise.reject(new Error('Notifications are off in the test version.')); }; } catch (e) { /* read-only */ }
  }

  // ---- the banner, the "nothing is saved" note, sign-in links off ------------------------------------------------------------------
  var TXT = {
    en: { banner: 'Test version · fake demo family · nothing is saved', fb: 'Send feedback', fbText: 'Tell the person who sent you this link what worked and what got in your way. A screenshot helps.', close: 'Close',
      saved: 'This is a test version: nothing is saved.', links: 'Sign-in links are off in the test version. Use the email and password you were given.',
      reset: 'Password resets are off in the test version. Use the email and password you were given.', label: 'Test version notice' },
    es: { banner: 'Versión de prueba · familia de demostración ficticia · no se guarda nada', fb: 'Enviar comentarios', fbText: 'Cuéntale a la persona que te envió este enlace qué funcionó y qué te estorbó. Una captura de pantalla ayuda.', close: 'Cerrar',
      saved: 'Esta es una versión de prueba: no se guarda nada.', links: 'Los enlaces para entrar están desactivados en la versión de prueba. Usa el correo y la contraseña que te dieron.',
      reset: 'Restablecer la contraseña está desactivado en la versión de prueba. Usa el correo y la contraseña que te dieron.', label: 'Aviso de versión de prueba' },
  };
  var tx = function (k) { return TXT[es() ? 'es' : 'en'][k]; };
  var CSS = '#ftBanner{position:fixed;left:50%;transform:translateX(-50%);top:max(6px,env(safe-area-inset-top));z-index:2147483000;display:flex;align-items:center;gap:8px;'
    + 'max-width:calc(100vw - 16px);box-sizing:border-box;padding:4px 6px 4px 12px;border-radius:999px;background:#0A2B38;color:#fff;font:600 12px/1.3 Poppins,system-ui,sans-serif;'
    + 'box-shadow:0 2px 10px rgba(10,43,56,.25);pointer-events:auto}#ftBanner .ft-t{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}'
    + '#ftBanner button{flex:none;min-height:32px;min-width:44px;padding:4px 10px;border:0;border-radius:999px;background:#E7A928;color:#0A2B38;font:inherit;cursor:pointer}'
    + '#ftBanner button:focus-visible,#ftNote button:focus-visible{outline:3px solid #fff;outline-offset:2px}'
    + '#ftNote{position:fixed;left:50%;transform:translateX(-50%);top:calc(max(6px,env(safe-area-inset-top)) + 44px);z-index:2147483000;width:min(420px,calc(100vw - 24px));box-sizing:border-box;'
    + 'padding:12px 14px;border-radius:14px;background:#fff;color:#0A2B38;font:400 14px/1.45 Poppins,system-ui,sans-serif;box-shadow:0 8px 28px rgba(10,43,56,.25);border:2px solid #E7A928}'
    + '#ftNote[hidden]{display:none}#ftNote p{margin:0 0 8px}#ftNote button{min-height:44px;padding:6px 14px;border:0;border-radius:10px;background:#0A2B38;color:#fff;font:600 14px Poppins,system-ui,sans-serif;cursor:pointer}'
    + '#ftToast{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom) + 92px);z-index:2147483001;max-width:calc(100vw - 32px);box-sizing:border-box;'
    + 'padding:12px 16px;border-radius:12px;background:#0A2B38;color:#fff;font:600 14px/1.4 Poppins,system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.25);transition:opacity .25s}'
    + '#ftToast[hidden]{display:none}@media (prefers-reduced-motion:reduce){#ftToast{transition:none}}'
    + 'body{padding-top:calc(var(--ft-banner,0px))}';
  var toastTimer = null, lastToast = 0;
  function el(id) { return D.getElementById(id); }
  function saved() {
    if (Date.now() - lastToast < 1500) return;
    lastToast = Date.now();
    var t = el('ftToast'); if (!t) return;
    t.textContent = tx('saved'); t.lang = es() ? 'es' : 'en'; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, 4200);
  }
  function note(text, target) {
    var box = target || el('signinMsg');
    if (box) { box.className = (box.className || '').replace(/\b(bad|ok)\b/g, '') + ' msg'; box.textContent = text; box.hidden = false; }
    var live = el('live'); if (live) { live.textContent = ''; setTimeout(function () { live.textContent = text; }, 30); }
  }
  W.FFTest.saved = saved;
  function paint() {
    var b = el('ftBanner'); if (!b) return;
    var l = es() ? 'es' : 'en';
    if (b.getAttribute('data-lang') === l) return;
    b.setAttribute('data-lang', l); b.lang = l; b.setAttribute('aria-label', tx('label'));
    b.querySelector('.ft-t').textContent = tx('banner');
    b.querySelector('button').textContent = tx('fb');
    var n = el('ftNote'); n.lang = l; n.querySelector('p').textContent = tx('fbText'); n.querySelector('button').textContent = tx('close');
  }
  function mount() {
    var st = D.createElement('style'); st.textContent = CSS; D.head.appendChild(st);
    var b = D.createElement('aside'); b.id = 'ftBanner'; b.setAttribute('translate', 'no');
    b.innerHTML = '<span class="ft-t"></span><button type="button" aria-expanded="false" aria-controls="ftNote"></button>';
    var n = D.createElement('div'); n.id = 'ftNote'; n.hidden = true; n.setAttribute('role', 'note');
    n.innerHTML = '<p></p><button type="button"></button>';
    var t = D.createElement('div'); t.id = 'ftToast'; t.hidden = true; t.setAttribute('role', 'status'); t.setAttribute('translate', 'no');
    D.body.appendChild(b); D.body.appendChild(n); D.body.appendChild(t);
    var fb = b.querySelector('button');
    fb.onclick = function () { n.hidden = !n.hidden; fb.setAttribute('aria-expanded', String(!n.hidden)); if (!n.hidden) n.querySelector('button').focus(); };
    n.querySelector('button').onclick = function () { n.hidden = true; fb.setAttribute('aria-expanded', 'false'); fb.focus(); };
    paint();
    var sp = function () { D.documentElement.style.setProperty('--ft-banner', (b.offsetHeight + 10) + 'px'); };
    sp(); W.addEventListener('resize', sp);
    new MutationObserver(paint).observe(D.documentElement, { attributes: true, attributeFilter: ['lang'] });
    // sign-in links and password resets: explain instead of "sending"
    D.addEventListener('click', function (e) {
      var x = e.target.closest && e.target.closest('#magic, #forgot, #googleSignin');
      if (!x) return;
      e.preventDefault(); e.stopImmediatePropagation();
      note(tx(x.id === 'forgot' ? 'reset' : 'links'));
    }, true);
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', mount); else mount();
})();
