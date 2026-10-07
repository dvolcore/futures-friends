/* Futures Friends intake gateway connection. PRODUCTION (branch release-platform): the hosted gateway at
   https://ff-intake.dvolcore.com (tools/set-hub-config.mjs keeps it in step with the CRM repo's deploy output). With an empty
   url the contact, tour, application, status and careers forms send nothing and say so honestly ("Online requests open soon,
   please call or email us") instead of pretending a request was received.

   To try the local gateway, copy intake-config.local.js.example to intake-config.local.js (git-ignored). That file is only
   ever loaded from localhost / 127.0.0.1. When the gateway is hosted, set the https url below. It is a PUBLIC address: never
   put a secret in any file served to the browser. turnstileSiteKey is the PUBLIC Cloudflare Turnstile site key, if one is used. */
// Empty until ff-intake.dvolcore.com is hosted: the forms then show the honest "Online requests open soon" state.
// At go-live deploy/site-config.sh (tools/set-hub-config.mjs) writes the production URL into the next line.
window.FF_INTAKE = { url: '', turnstileSiteKey: '' };
(function () {
  var h = location.hostname;
  if (h === 'localhost' || h === '127.0.0.1') {
    document.write('<script src="intake-config.local.js"><\/script>');
  }
})();
