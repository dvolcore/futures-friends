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
  // this copy's folder (the static <base> the build writes), the shared root (portal-test/) and which copy serves which role
  var baseEl = D.querySelector('base');
  var BASE = (baseEl ? new URL(baseEl.href).pathname : location.pathname.replace(/[^/]*$/, '')).replace(/\/$/, '');
  var rm = BASE.match(/^(.*?\/portal-test)(\/.*)?$/);
  var ROOT = rm ? rm[1] : BASE, SUB = rm && rm[2] ? rm[2] : '';
  var COPY = { family: '', teacher: '/staff', director: '/staff' };
  var START = { family: '/home', teacher: '/home?room=threes', director: '/home' };
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
  var goCopy = null;   // set after a sign-in whose role another copy serves: the next navigation goes there instead
  ['pushState', 'replaceState'].forEach(function (fn) {
    var orig = history[fn];
    history[fn] = function (s, t, u) {
      if (goCopy && typeof u === 'string' && /\/c\/[a-z0-9-]+\/./.test(u)) { var g = goCopy; goCopy = null; location.assign(g); return; }
      return orig.call(this, s, t, u == null ? u : toReal(u));
    };
  });
  // a session of a role this copy does not serve (e.g. a teacher opening the parents' copy): open the same page in the right copy
  (function () {
    var r = null;
    try { var se = JSON.parse(localStorage.getItem('ff-hub-web-auth') || 'null'); r = se && se.user && se.user.app_metadata && se.user.app_metadata.ft_role; } catch (e) { r = null; }
    var path = strip(location.pathname);
    if (r && COPY[r] !== undefined && COPY[r] !== SUB && !/^\/c\/[a-z0-9-]+\/?$/.test(path)) location.replace(ROOT + COPY[r] + path + location.search + location.hash);
  })();
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
  var FIX = { entries: [], silent: [] }, BY = {}, LOGINS = [], USERS = {};
  // who each role signs in as (no credentials in the test copy: any sign-in, or one tap, enters)
  var PERSONA = { family: 'pat@example.com', teacher: 'tess@example.com', director: 'director@example.com' };
  var ready = Promise.all([
    realFetch(BASE + '/fixtures.json').then(function (r) { return r.json(); }).then(function (f) {
      FIX = f;
      f.entries.forEach(function (e) { if (!BY[e.k]) BY[e.k] = e; });
      f.silent.forEach(function (n) { QUIET[n] = 1; });
    }),
    realFetch(ROOT + '/logins.json').then(function (r) { return r.ok ? r.json() : []; }).then(function (l) { LOGINS = l; }, function () { LOGINS = []; }),
    realFetch(ROOT + '/roles.json').then(function (r) { return r.ok ? r.json() : {}; }).then(function (u) { USERS = u || {}; }, function () { USERS = {}; }),
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
  var PENDING = null;   // the role picked on the sign-in page (one-tap, ?role=)
  var ROLE = null;   // the signed-in tester's role (from the session); before sign-in: this copy's first role
  function roleNow() { return ROLE || (FIX.roles && FIX.roles[0]) || 'family'; }
  function hit(k) { return BY[roleNow() + ' ' + k] || BY[k]; }
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
        var mm = e.k.match(/^(?:(family|teacher|director) )?(\S+) ([^?]*)\?(\S*) ?(.*)$/);
        if (!mm) return;
        var id = (mm[1] || 'family') + ' ' + mm[2] + ' ' + idOf(mm[3], mm[4], mm[5]);
        if (!NEAR[id]) NEAR[id] = e;
      });
    }
    return NEAR[roleNow() + ' ' + method + ' ' + idOf(path, search, body)] || null;
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
  function roleOf(email) {
    var l = LOGINS.filter(function (x) { return x.email === email; })[0];
    if (l && l.role) return l.role;
    for (var r in PERSONA) if (PERSONA[r] === email) return r;
    return 'family';
  }
  function userFor(email) {
    var role = roleOf(email), u = USERS[role] || (FIX.users && (FIX.users[role] || FIX.users.family)) || {};
    var director = role === 'director';
    return { id: u.id || FIX.userId, aud: 'authenticated', role: 'authenticated', email: email, email_confirmed_at: '2026-10-01T12:00:00Z',
      phone: '', app_metadata: { provider: 'email', providers: ['email'], ft_role: role }, user_metadata: { full_name: u.fullName || FIX.fullName || 'TEST Parent Pat' },
      identities: [], factors: director ? [{ id: 'portal-test-totp', factor_type: 'totp', status: 'verified', friendly_name: 'Test version (skipped)', created_at: '2026-10-01T12:00:00Z', updated_at: '2026-10-01T12:00:00Z' }] : [], created_at: '2026-10-01T12:00:00Z', updated_at: '2026-10-12T12:00:00Z', is_anonymous: false };
  }
  function sessionFor(email) {
    var now = Math.floor(Date.now() / 1000), life = 7 * 86400, user = userFor(email), role = roleOf(email);
    // directors sign in with two steps in the real Hub; the test version skips the second step (the banner says so)
    var aal = role === 'director' ? 'aal2' : 'aal1', amr = role === 'director' ? [{ method: 'totp', timestamp: now }, { method: 'password', timestamp: now }] : [{ method: 'password', timestamp: now }];
    var jwt = b64u(JSON.stringify({ alg: 'none', typ: 'JWT' })) + '.' + b64u(JSON.stringify({ sub: user.id, email: email, role: 'authenticated',
      aud: 'authenticated', aal: aal, amr: amr, session_id: 'portal-test', iat: now, exp: now + life,
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
        // no credentials in the test copy: whatever is typed (or nothing) enters; a known TEST login keeps its role
        var typed = String(b.email || '').trim().toLowerCase();
        var known = LOGINS.filter(function (x) { return x.email === typed; })[0];
        var r0 = (known && known.role) || PENDING || 'family';
        var email = known ? typed : PERSONA[r0];
        ROLE = r0;
        if (COPY[ROLE] !== SUB) goCopy = ROOT + COPY[ROLE] + '/c/' + SLUG + START[ROLE];
        return Promise.resolve(json(sessionFor(email)));
      }
      if (grant === 'refresh_token') {
        var em = null; try { em = unb64u(String(b.refresh_token || '').replace(/^pt\./, '')); } catch (e) { /* bad */ }
        if (em) return Promise.resolve(json(sessionFor(em)));
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
    var who = emailFromBearer(init, req);
    if (who) ROLE = roleOf(who);
    if (path.indexOf('/auth/v1/') === 0) return auth(method, path, search, body, init, req);
    if (path.indexOf('/realtime/') === 0 || path.indexOf('/functions/') === 0) return Promise.resolve(json({}));
    var rpc = path.match(/^\/rest\/v1\/rpc\/([a-z0-9_]+)$/);
    if (rpc && rpc[1] === 'my_preferred_language') return Promise.resolve(json(JSON.stringify(lang())));
    var found = hit(keyOf(method, path, search, body));
    if (found) return Promise.resolve(fromEntry(found));
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
    var found = hit(keyOf(method, path, search, ''));
    if (found) return Promise.resolve(fromEntry(found));
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

  // ---- the visible parts: one-tap entry per role, "View as" switcher, "Coming soon" panels -------------------------------------------
  // Owner 2026-10-12: no credentials, no "test" labels. Writes do nothing, silently. The pages stay out of search (noindex, robots).
  var TXT = {
    en: { choose: 'Choose your view', family: 'Family', teacher: 'Teacher', director: 'Director', famSub: 'Parent dashboard', teaSub: 'Classroom dashboard',
      dirSub: 'Center dashboard', viewAs: 'View as', website: 'Back to the website', soonH: 'Coming soon', soonP: 'This part of the Futures Hub is on its way.',
      back: 'Back to the dashboard' },
    es: { choose: 'Elige tu vista', family: 'Familia', teacher: 'Maestro', director: 'Dirección', famSub: 'Panel para familias', teaSub: 'Panel del salón',
      dirSub: 'Panel del centro', viewAs: 'Ver como', website: 'Volver al sitio web', soonH: 'Próximamente', soonP: 'Esta parte de Futures Hub está en camino.',
      back: 'Volver al panel' },
  };
  var tx = function (k) { return TXT[es() ? 'es' : 'en'][k]; };
  var SITE = ROOT.replace(/\/portal-test$/, '') + '/';
  function el(id) { return D.getElementById(id); }
  function saved() { /* writes do nothing in the test copy, silently */ }
  W.FFTest.saved = saved;
  function note(text, target) {
    var box = target || el('signinMsg');
    if (box) { box.className = (box.className || '').replace(/\b(bad|ok)\b/g, '') + ' msg'; box.textContent = text; box.hidden = false; }
  }
  // enter a role: the session is written where the app keeps it, then that role's dashboard opens (in the copy that serves it)
  function enter(role) {
    return ready.then(function () {
      ROLE = role;
      try { localStorage.setItem('ff-hub-web-auth', JSON.stringify(sessionFor(PERSONA[role]))); } catch (e) { /* private mode: the sign-in form still works */ }
      location.assign(ROOT + COPY[role] + '/c/' + SLUG + START[role]);
    });
  }
  W.FFTest.enter = enter;
  var q0 = new URLSearchParams(location.search), wantEnter = q0.get('enter'), wantRole = q0.get('role');
  if (wantRole === 'parent') wantRole = 'family';
  if (COPY[wantRole] !== undefined) PENDING = wantRole;
  if (wantEnter === 'parent') wantEnter = 'family';
  if (COPY[wantEnter] !== undefined) { enter(wantEnter); }

  var CSS = '#ftRoles{margin:0 0 14px}#ftRoles h2{margin:0 0 8px;font:600 15px/1.3 Fredoka,Poppins,system-ui,sans-serif;color:#0A2B38}'
    + '#ftRoles .ft-row{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}'
    + '#ftRoles button{min-height:64px;padding:8px 6px;border:2px solid #0A2B38;border-radius:14px;background:#fff;color:#0A2B38;cursor:pointer;font:600 16px/1.15 Poppins,system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px}'
    + '#ftRoles button small{font:400 11px/1.2 Poppins,system-ui,sans-serif;color:#33505C}'
    + '#ftRoles button[aria-pressed=true]{background:#0A2B38;color:#fff}#ftRoles button[aria-pressed=true] small{color:#E8F0F2}'
    + '#ftRoles button:focus-visible,.ft-switch summary:focus-visible,.ft-switch a:focus-visible{outline:3px solid #E7A928;outline-offset:2px}'
    + '.ft-switch{position:relative;display:inline-block}.ft-switch summary{list-style:none;cursor:pointer;min-height:36px;display:inline-flex;align-items:center;padding:4px 10px;border-radius:999px;font:600 13px Poppins,system-ui,sans-serif}'
    + '.ft-switch summary::-webkit-details-marker{display:none}.ft-switch[open] .ft-menu{display:flex}'
    + '.ft-menu{display:none;position:absolute;right:0;top:calc(100% + 6px);z-index:2147483000;flex-direction:column;min-width:200px;padding:6px;border-radius:12px;background:#fff;box-shadow:0 10px 30px rgba(10,43,56,.25)}'
    + '.ft-menu a{display:flex;align-items:center;min-height:44px;padding:6px 12px;border-radius:8px;color:#0A2B38;text-decoration:none;font:500 14px Poppins,system-ui,sans-serif}'
    + '.ft-menu a[aria-current=true]{font-weight:700;background:#F3EBDA}.ft-menu hr{border:0;border-top:1px solid #E5DCC8;margin:4px 0}'
    + '#ftSoon{max-width:560px;margin:48px auto;padding:28px 22px;border-radius:20px;background:#fff;box-shadow:0 8px 28px rgba(10,43,56,.12);text-align:center;color:#0A2B38}'
    + '#ftSoon h1{margin:0 0 8px;font:600 28px/1.2 Fredoka,Poppins,system-ui,sans-serif}#ftSoon p{margin:0 0 18px}'
    + '#ftSoon a{display:inline-flex;align-items:center;min-height:44px;padding:8px 18px;border-radius:12px;background:#0A2B38;color:#fff;text-decoration:none;font:600 15px Poppins,system-ui,sans-serif}'
    + '#fdDemoPill,.fd-demo-pill,[data-demo-pill]{display:none!important}';

  function rolesBox() {
    var form = el('signinForm');
    if (!form || el('ftRoles')) return;
    var h = D.createElement('section'); h.id = 'ftRoles'; h.setAttribute('aria-labelledby', 'ftRolesH');
    h.innerHTML = '<h2 id="ftRolesH"></h2><div class="ft-row"></div>';
    h.querySelector('h2').textContent = tx('choose');
    [['family', 'famSub'], ['teacher', 'teaSub'], ['director', 'dirSub']].forEach(function (x) {
      var bt = D.createElement('button'); bt.type = 'button'; bt.setAttribute('data-ft-role', x[0]);
      bt.setAttribute('aria-pressed', String(PENDING === x[0]));
      bt.innerHTML = '<span></span><small></small>';
      bt.querySelector('span').textContent = tx(x[0]); bt.querySelector('small').textContent = tx(x[1]);
      bt.onclick = function () { enter(x[0]); };
      h.querySelector('.ft-row').appendChild(bt);
    });
    form.parentNode.insertBefore(h, form);
  }
  function switcher() {
    var nav = el('topNav'), out = el('signOut');
    if (!nav || !out || el('ftSwitch')) return;
    var d = D.createElement('details'); d.className = 'ft-switch'; d.id = 'ftSwitch';
    d.innerHTML = '<summary></summary><div class="ft-menu"></div>';
    d.querySelector('summary').textContent = tx('viewAs');
    var menu = d.querySelector('.ft-menu');
    ['family', 'teacher', 'director'].forEach(function (r) {
      var a = D.createElement('a'); a.href = ROOT + COPY[r] + '/c/' + SLUG + START[r]; a.textContent = tx(r); a.setAttribute('data-ft-role', r);
      if (r === roleNow()) a.setAttribute('aria-current', 'true');
      a.onclick = function (e) { e.preventDefault(); enter(r); };
      menu.appendChild(a);
    });
    menu.appendChild(D.createElement('hr'));
    var w = D.createElement('a'); w.href = SITE; w.textContent = tx('website'); w.id = 'ftWebsite'; menu.appendChild(w);
    nav.insertBefore(d, out);
    D.addEventListener('click', function (e) { if (!d.contains(e.target)) d.open = false; });
  }
  // parts not built yet (the Kids' corner) and any page the copy does not have: a friendly "Coming soon", never a dead end
  function soon(path) {
    var m = el('main'); if (!m) return;
    var home = ROOT + COPY[roleNow()] + '/c/' + SLUG + START[roleNow()];
    m.innerHTML = '<section id="ftSoon" aria-labelledby="ftSoonH"><h1 id="ftSoonH"></h1><p></p><a></a></section>';
    m.querySelector('h1').textContent = tx('soonH'); m.querySelector('p').textContent = tx('soonP');
    var a = m.querySelector('a'); a.href = home; a.textContent = tx('back');
    if (path) history.pushState(null, '', path);
    D.title = tx('soonH') + ' · Futures Hub';
  }
  W.FFTest.soon = soon;
  function notFoundToSoon() {
    var m = el('main'); if (!m || el('ftSoon')) return;
    var h = m.querySelector('h1');
    if (h && /^(Page not found|No se encontró la página)$/.test(h.textContent.trim())) soon(null);
  }

  function mount() {
    var st = D.createElement('style'); st.textContent = CSS; D.head.appendChild(st);
    rolesBox(); switcher();
    new MutationObserver(function () { rolesBox(); switcher(); notFoundToSoon(); }).observe(D.body, { childList: true, subtree: true });
    // the sign-in form: no credentials needed. Whatever is typed (or nothing) enters, as the role picked (default Family)
    D.addEventListener('submit', function (e) {
      if (!e.target || e.target.id !== 'signinForm') return;
      e.preventDefault(); e.stopImmediatePropagation();
      var typed = (el('email') && el('email').value || '').trim().toLowerCase();
      var known = LOGINS.filter(function (x) { return x.email === typed; })[0];
      enter((known && known.role) || PENDING || 'family');
    }, true);
    D.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href]');
      if (a && /\/c\/[a-z0-9-]+\/kids(?:[?#]|$)/.test(a.getAttribute('href') || '') && !KIDS_BUILT) { e.preventDefault(); e.stopImmediatePropagation(); soon(a.getAttribute('href')); return; }
      var x = e.target.closest && e.target.closest('#magic, #forgot, #googleSignin');
      if (!x) return;
      e.preventDefault(); e.stopImmediatePropagation();
      enter(PENDING || 'family');
    }, true);
  }
  var KIDS_BUILT = false;   // the Kids' corner (branch kids-corner) joins the copy once recorded; until then its links show "Coming soon"
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', mount); else mount();
})();
