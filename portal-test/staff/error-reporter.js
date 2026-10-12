// Futures Hub error reporter (N4, self-hosted error tracking; docs/ops/ERROR_TRACKING.md). A classic script loaded first on every page:
// uncaught errors and unhandled promise rejections are sent to the hub's own app_error_report (migration 20261028020000_app_errors.sql)
// with the PUBLIC anon key only, never the person's session, so a report is never tied to who was signed in.
//
// Privacy: the message and stack are scrubbed HERE (the database scrubs again): no query strings, emails, tokens, ids, digit runs,
// quoted text that is not a plain code identifier, or capitalised words outside the error vocabulary (names). The page path keeps the
// center slug and the tab; the segment after /child/, /player/, /enroll/, /n/ and /candidate/ is replaced.
// Volume: at most 5 reports a minute and 10 per page load; the same error once per page load. The database also limits per address.
(function () {
  'use strict';
  var MAX_PER_PAGE = 10, MAX_PER_MINUTE = 5;
  var sent = 0, minuteStart = 0, inMinute = 0, seen = Object.create(null);
  var KEEP = ('Cannot Failed Uncaught Unexpected Invalid Unable Network Load Loading Script The This A An No Not Object Promise Response '
    + 'Request Error Maximum Too Missing Unknown Permission Access Denied Timeout Aborted Internal Server Bad Fetch Null Undefined Expected '
    + 'Assignment Illegal Reading Setting Property Function Module Import Export Unhandled Rejection Stack Step Timed Out At In Of To For Is '
    + 'Was With From Found Row Level Security Policy Violates Duplicate Key Value Column Relation Does Exist Database Connection Refused '
    + 'Reset Service Unavailable Gateway Some Mail Email Push Worker Hub Futures Friends Kid Mode Today Supabase Postgres Chrome Safari '
    + 'Firefox Edge Quota Exceeded Storage Session Auth Token Refresh Grant Ok').split(' ');
  var keep = Object.create(null);
  KEEP.forEach(function (w) { keep[w] = true; });

  function scrub(text, max) {
    var s = String(text == null ? '' : text);
    s = s.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, ' ');
    s = s.replace(/(https?:\/\/[^\s?#'"<>]*)[?#][^\s'"<>)]*/gi, '$1');
    s = s.replace(/([?&](?:token|token_hash|t|code|key|access_token|refresh_token)=)[^\s&'"<>)]*/gi, '$1<x>');
    s = s.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '<email>');
    s = s.replace(/\/(child|player|enroll|n|candidate)\/[^/\s'"`)]+/g, '/$1/<id>');
    s = s.replace(/eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]*/g, '<token>');
    s = s.replace(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g, '<id>');
    s = s.replace(/\b(?=[A-Za-z0-9_-]*[0-9])[A-Za-z0-9_-]{20,}\b/g, '<token>');
    s = s.replace(/\+?\d[\d ().-]{6,}\d/g, '<n>');
    s = s.replace(/(^|[^\w.:/<])\d{3,}(?![\w>])/g, '$1<n>');
    // quoted text: 'plainIdentifier' stays, anything else becomes <str> (identifiers are parked first so pairs never cross strings)
    s = s.replace(/'([a-z_$][A-Za-z0-9_$.-]{0,40})'/g, '\x01$1\x02').replace(/"([a-z_$][A-Za-z0-9_$.-]{0,40})"/g, '\x03$1\x04')
      .replace(/`([a-z_$][A-Za-z0-9_$.-]{0,40})`/g, '\x05$1\x06');
    s = s.replace(/'[^'\n]{1,200}'/g, "'<str>'").replace(/"[^"\n]{1,200}"/g, '"<str>"').replace(/`[^`\n]{1,200}`/g, '`<str>`');
    s = s.replace(/\x01/g, "'").replace(/\x02/g, "'").replace(/\x03/g, '"').replace(/\x04/g, '"').replace(/\x05/g, '`').replace(/\x06/g, '`');
    s = s.replace(/[A-Za-zÀ-ɏ]+/g, function (w) {
      return /^[A-ZÀ-Þ][a-zß-ɏ]+$/.test(w) && !keep[w] ? '<name>' : w;
    });
    s = s.replace(/\s+/g, ' ').trim();
    return s.slice(0, max || 500);
  }
  function scrubStack(stack) {
    if (!stack) return null;
    var lines = String(stack).split('\n').filter(function (l) { return l.trim(); }).slice(0, 30).map(function (l) { return scrub(l, 300); });
    return lines.join('\n').slice(0, 4000) || null;
  }
  function scrubRoute(path) {
    var p = String(path || '').split('?')[0].split('#')[0];
    p = p.replace(/\/(child|player|enroll|n|candidate)\/[^/]+/g, '/$1/<id>').replace(/[^A-Za-z0-9/_<>.-]/g, '');
    return p.slice(0, 200) || null;
  }
  function agent() {
    var ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
    var m = /(Edg|Firefox|Chrome|Safari)\/(\d+)/.exec(ua);
    return m ? (m[1] === 'Edg' ? 'Edge' : m[1]) + ' ' + m[2] + (/Mobile|Android|iPhone|iPad/.test(ua) ? ' mobile' : '') : null;
  }
  function allowed(key) {
    var now = Date.now();
    if (now - minuteStart > 60000) { minuteStart = now; inMinute = 0; }
    if (sent >= MAX_PER_PAGE || inMinute >= MAX_PER_MINUTE || seen[key]) return false;
    seen[key] = true; sent++; inMinute++;
    return true;
  }
  function report(kind, message, stack) {
    try {
      var cfg = window.FF_HUB_WEB;
      if (!cfg || !cfg.url || !cfg.anonKey) return false;
      var msg = scrub(message, 500) || '(no message)';
      var st = scrubStack(stack);
      if (!allowed(kind + '|' + msg + '|' + (st || '').split('\n')[1])) return false;
      var body = JSON.stringify({ p: { kind: kind, message: msg, stack: st, route: scrubRoute(FFTest.pathname()), release: cfg.release || null, agent: agent() } });
      fetch(cfg.url + '/rest/v1/rpc/app_error_report', {
        method: 'POST', keepalive: true, credentials: 'omit', referrerPolicy: 'no-referrer',
        headers: { apikey: cfg.anonKey, Authorization: 'Bearer ' + cfg.anonKey, 'Content-Type': 'application/json' }, body: body,
      }).catch(function () { /* reporting never breaks the page */ });
      return true;
    } catch (_) { return false; }
  }
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('error', function (e) {
      if (!e || (e.target && e.target !== window)) return;          // a failed <img>/<script> load: not a code error
      report('error', (e.error && e.error.message) || e.message, e.error && e.error.stack);
    });
    window.addEventListener('unhandledrejection', function (e) {
      var r = e && e.reason;
      report('unhandledrejection', (r && r.message) || (typeof r === 'string' ? r : 'unhandled rejection'), r && r.stack);
    });
  }
  window.FFErrorReporter = { report: report, scrub: scrub, scrubStack: scrubStack, scrubRoute: scrubRoute };
})();
