/* Futures Friends: real request submission (window.FFIntake) and the Careers pages (#jobs, #job/<id>).
   Everything a visitor submits goes to the intake gateway named in window.FF_INTAKE.url (intake-config.js). Nothing is stored in
   the browser and nothing is faked: with no url configured the forms say that online requests are not open yet and show how to
   call or email instead. A success message is shown only after the gateway has written the request to its durable ledger and
   returned a reference number. Loaded after views.js, features.js and extras.js. */
(function () {
'use strict';
if (typeof V === 'undefined') return;

// ---------------------------------------------------------------- config, small helpers
const cfg = () => window.FF_INTAKE || {};
const base = () => String(cfg().url || '').trim().replace(/\/+$/, '');
const enabled = () => /^https?:\/\/[^\s/]+/.test(base());
const phone = () => (typeof PHONE !== 'undefined' ? PHONE : '(816) 988-5661');
const email = () => (typeof EMAIL !== 'undefined' ? EMAIL : 'info@futureslearningcenter.com');
const telHref = () => 'tel:+1' + phone().replace(/\D/g, '').slice(-10);
const e = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const el = id => document.getElementById(id);
const val = id => ((el(id) || {}).value || '').trim();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const uid = () => (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDate = s => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? `${MONTHS[+m[2] - 1]} ${+m[3]}, ${m[1]}` : ''; };
const okEmail = s => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
const okPhone = s => { const d = s.replace(/\D/g, ''); return d.length === 10 || (d.length === 11 && d[0] === '1'); };

// ---------------------------------------------------------------- styles (variables only, light and dark)
if (!document.getElementById('ff-intake-css')) {
  const css = document.createElement('style'); css.id = 'ff-intake-css';
  css.textContent = `
.ffi-soon{border:2px dashed var(--gold);border-radius:var(--r);padding:18px;display:grid;gap:8px;background:var(--paper)}
.ffi-soon b{font-family:var(--display);font-size:20px;line-height:1.25}
.ffi-soon .acts{display:flex;gap:10px;flex-wrap:wrap;margin-top:4px}
.ffi-sum{border:1px solid var(--line);border-radius:var(--r);padding:12px 16px;margin-top:10px;display:grid;gap:10px;background:var(--paper)}
.ffi-sum summary{cursor:pointer;font-weight:700;min-height:44px;display:flex;align-items:center}
.ffi-sumacts{display:flex;gap:10px;flex-wrap:wrap}
.ffi-banner{margin:0;border:2px dashed var(--gold);border-radius:var(--r);padding:12px 16px;background:var(--paper)}
.ffi-ref{display:grid;gap:2px;background:var(--cream);border:1px solid var(--line);border-radius:12px;padding:12px 16px;justify-self:start;min-width:min(100%,260px)}
.ffi-ref span{font-size:12px;color:var(--muted)}
.ffi-ref b{font-family:var(--display);font-size:clamp(22px,4vw,28px);letter-spacing:.05em;overflow-wrap:anywhere}
.ffi-hp{position:absolute!important;left:-10000px;top:auto;width:1px;height:1px;overflow:hidden}
.ffi-msg{font-size:13.5px;font-weight:500;color:var(--bad);margin:0}
.ffi-msg:empty{display:none}
.ffi-form{display:grid;gap:14px}
.ffi-note{font-size:12.5px;color:var(--muted);margin:0}
.ffi-jobs{display:grid;gap:14px}
.ffi-job{display:grid;gap:8px;border-left:5px solid var(--c,var(--gold))}
.ffi-job h3{margin:0}
.ffi-meta{display:flex;gap:6px;flex-wrap:wrap}
.ffi-text{white-space:pre-line;overflow-wrap:anywhere}
.ffi-load{display:flex;gap:10px;align-items:center;color:var(--muted)}
.ffi-spin{width:16px;height:16px;border-radius:50%;border:3px solid var(--line);border-top-color:var(--gold);animation:ffispin .8s linear infinite}
@media (prefers-reduced-motion:reduce){.ffi-spin{animation:none}}
@keyframes ffispin{to{transform:rotate(360deg)}}
.ffi-check{display:flex;gap:10px;align-items:flex-start;font-size:13.5px}
.ffi-check input{margin-top:4px;accent-color:var(--navy)}
input[type=file].i{padding:8px 10px}`;
  document.head.appendChild(css);
}

// ---------------------------------------------------------------- network
async function http(method, path, opts = {}) {
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => ctl.abort(), opts.timeout || 30000) : 0;
  try {
    const res = await fetch(base() + path, { method, headers: opts.headers || {}, body: opts.body, signal: ctl ? ctl.signal : undefined,
      mode: 'cors', credentials: 'omit', cache: 'no-store', redirect: 'error' });
    let body = null; try { body = await res.json(); } catch (_) { /* no JSON body */ }
    return { status: res.status, body, retryAfter: res.headers.get('Retry-After') };
  } catch (_) { return { status: 0, body: null, network: true }; }
  finally { if (timer) clearTimeout(timer); }
}

// A short-lived signed token, fetched when a form is shown: the gateway refuses forms sent faster than a person could fill them.
let tok = null;
async function token() {
  if (!tok || Date.now() - tok.at > 5 * 3600 * 1000) {
    const r = await http('GET', '/v1/form-token');
    if (r.status !== 200 || !r.body || !r.body.token) throw new Error('no token');
    tok = { token: r.body.token, at: Date.now(), min: (r.body.minFillSeconds || 3) * 1000 };
  }
  const wait = tok.at + tok.min + 400 - Date.now();
  if (wait > 0) await sleep(wait);
  return tok.token;
}
const warm = () => { if (enabled()) token().catch(() => {}); };

// One Idempotency-Key per distinct payload: pressing Send again after a dropped connection can never file the request twice.
const attempts = {};
const keyFor = (kind, sig) => { const a = attempts[kind]; if (a && a.sig === sig) return a.key; attempts[kind] = { sig, key: uid() }; return attempts[kind].key; };

const unavailable = { ok: false, unavailable: true, message: 'Online requests are not open yet.' };
function interpret(r) {
  if (r.network) return { ok: false, network: true, message: 'We could not reach our request service, so nothing was sent. Check your connection and try again, or call us at ' + phone() + '.' };
  const b = r.body || {};
  if (r.status === 202) return { ok: true, ref: b.ref, emailConfirmation: b.emailConfirmation, days: b.replyBusinessDays || 2, duplicate: !!b.duplicate };
  if (r.status === 422 && b.errors) return { ok: false, errors: b.errors, message: 'Please fix the highlighted fields.' };
  if (r.status === 422) return { ok: false, message: b.message || 'We could not send this form. Please call us instead.', retry: b.error !== 'rejected' };
  if (r.status === 429) return { ok: false, network: true, message: 'Too many requests from this connection. Nothing was sent. Please wait a few minutes, or call us at ' + phone() + '.' };
  if (r.status === 503 && b.error === 'subscribe_unavailable') return { ok: false, message: 'Weekly challenge sign-up is not available right now, so nothing was saved. Please try again later or call ' + phone() + '.' };
  if (r.status === 413) return { ok: false, message: 'That upload is too large. Resumes can be up to 5 MB.' };
  if (r.status === 403 || r.status === 400) return { ok: false, message: 'We could not send this form from this page. Please call us at ' + phone() + '.' };
  return { ok: false, network: true, message: 'Our request service is having trouble right now. Nothing was sent. Please try again in a few minutes or call ' + phone() + '.' };
}

// Website statistics (analytics.js): the form kind and the outcome only, never a field value. A no-op without analytics.
const outcome = r => (r.ok ? 'ok' : r.unavailable ? 'unavailable' : r.errors ? 'invalid' : r.network ? 'network' : 'error');
const report = (kind, r) => { try { document.dispatchEvent(new CustomEvent('ff:intake', { detail: { kind, outcome: outcome(r) } })); } catch (_) { /* no DOM */ } return r; };

async function submit(kind, data) {
  if (!enabled()) return report(kind, unavailable);
  let t; try { t = await token(); } catch (_) { return report(kind, interpret({ network: true })); }
  const body = Object.assign({ kind, token: t }, data);
  const key = keyFor(kind, JSON.stringify(data));
  return report(kind, interpret(await http('POST', '/v1/inquiry', { headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify(body) })));
}

async function apply(form) {
  if (!enabled()) return report('apply', unavailable);
  let t; try { t = await token(); } catch (_) { return report('apply', interpret({ network: true })); }
  const sig = [...form.entries()].map(([k, v]) => k + '=' + (v instanceof File ? v.name + v.size + v.lastModified : v)).join('&');
  form.set('token', t);
  return report('apply', interpret(await http('POST', '/v1/apply', { headers: { 'Idempotency-Key': keyFor('apply', sig) }, body: form, timeout: 90000 })));
}

async function status(ref, mail) {
  if (!enabled()) return unavailable;
  const r = await http('POST', '/v1/status', { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ref, email: mail }) });
  if (r.status === 200) return { ok: true, status: r.body };
  if (r.status === 404) return { ok: false, notFound: true, message: 'We could not find a request with that reference number and email address.' };
  return interpret(r);
}

let jobsCache = null;
async function jobs(force) {
  if (!enabled()) return unavailable;
  if (!force && jobsCache && Date.now() - jobsCache.at < 60000) return jobsCache.value;
  const r = await http('GET', '/v1/jobs');
  if (r.status !== 200 || !r.body) return { ok: false, network: true, message: 'We could not load the open positions right now.' };
  jobsCache = { at: Date.now(), value: { ok: true, jobs: r.body.jobs || [] } };
  return jobsCache.value;
}
async function job(id) {
  const all = await jobs();
  if (!all.ok) return all;
  const hit = all.jobs.find(j => j.id === id);
  if (hit) return { ok: true, job: hit };
  const r = await http('GET', '/v1/jobs/' + encodeURIComponent(id));
  if (r.status === 200 && r.body && r.body.job) return { ok: true, job: r.body.job };
  if (r.status === 404) return { ok: false, closed: true };
  return { ok: false, network: true, message: 'We could not load this opening right now.' };
}

// ---------------------------------------------------------------- shared UI pieces
// While the gateway is not hosted every form still has a working way to reach a person: call, or email with a subject line that says
// which form this was. The mailto carries ONLY that fixed subject: never a name, email address, phone number or message (E3).
const SUBJECTS = { 'tour requests': 'Tour request', applications: 'Enrollment application', 'request status': 'Request status question', 'request lookups': 'Request status question',
  'information and quote requests': 'Information request', 'information requests': 'Information request', 'quote requests': 'Quote request',
  'job applications': 'Job application', 'Futures at Home sign-ups': 'Futures at Home sign-up', 'weekly challenge sign-ups': 'Bop at Home weekly challenge sign-up',
  'shop sign-ups': 'Family shop list', 'order and quote requests': 'Store quote request', 'staff training requests': 'Staff training request',
  'licensing inquiries': 'Licensing inquiry' };
const subjectFor = what => 'Futures Friends website: ' + (SUBJECTS[what] || String(what || 'request').replace(/[^A-Za-z0-9 ,.'-]/g, '').slice(0, 60));
const mailtoFor = what => 'mailto:' + email() + '?subject=' + encodeURIComponent(subjectFor(what));
// Config-driven wording: say(onText, offText) returns the original online wording once the gateway is switched on (a valid https
// url in intake-config.js) and the honest wording until then. Nothing here is deleted, only gated.
const say = (on, off) => (enabled() ? on : off);
const labelFor = what => SUBJECTS[what] || String(what || 'request');
// A request summary the visitor can copy or print and send themselves. Nothing leaves the page: the text is built in the browser.
let sumN = 0;
const sumTool = what => { const n = ++sumN; return `<details class="ffi-sum" data-ffi-sum="${e(what)}"><summary>Write your request down to send yourself</summary>
 <p class="small" style="margin:8px 0 0">Fill in what you like. This stays on your device; it is not sent anywhere. Then copy it or print it, and email it to us or bring it to the center.</p>
 <label class="f" for="ffiSumName${n}">Your name<input class="i" id="ffiSumName${n}" data-ffi-sumf="name" autocomplete="name"></label>
 <label class="f" for="ffiSumHow${n}">Phone or email to reach you<input class="i" id="ffiSumHow${n}" data-ffi-sumf="how" autocomplete="off"></label>
 <label class="f" for="ffiSumMsg${n}">What you need, and any times that work<textarea class="i" id="ffiSumMsg${n}" data-ffi-sumf="msg" rows="3"></textarea></label>
 <label class="f" for="ffiSumOut${n}">Your summary<textarea class="i" id="ffiSumOut${n}" data-ffi-sumout readonly rows="6"></textarea></label>
 <span class="ffi-sumacts"><button type="button" class="btn gold" data-ffi-sumcopy>Copy summary</button><button type="button" class="btn soft" data-ffi-sumprint>Print summary</button></span>
 <span class="small muted" role="status" aria-live="polite" data-ffi-sumnote></span></details>`; };
const soon = what => `<div class="ffi-soon" role="note" data-ffi-soon="${e(what)}"><b>Online requests open soon.</b>
 <p class="small" style="margin:0">Online ${e(what)} are not switched on yet, so this page sends nothing: no request goes out, there is no reference number and no automatic reply. Please call or email us and a real person will help you.</p>
 <div class="acts"><a class="btn gold" href="${telHref()}">Call ${e(phone())}</a><a class="btn soft" href="${e(mailtoFor(what))}">Email ${e(email())}</a></div></div>${/sign-ups?$|lookups$|status$/.test(what) ? '' : sumTool(what)}`;
function sumText(box) {
  const g = k => ((box.querySelector('[data-ffi-sumf="' + k + '"]') || {}).value || '').trim();
  const what = box.getAttribute('data-ffi-sum') || 'request', d = new Date();
  return ['Futures Friends: ' + labelFor(what), 'Name: ' + (g('name') || '(add your name)'), 'Phone or email: ' + (g('how') || '(add how to reach you)'),
    'What I need: ' + (g('msg') || '(add a few words)'), '', 'Send to ' + email() + ' or call ' + phone() + '.',
    'Written ' + d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) + ' on the Futures Friends website. This was not sent online.'].join('\n');
}
function sumRefresh(box) { const o = box.querySelector('[data-ffi-sumout]'); if (o) o.value = sumText(box); return o; }
function sumNote(box, msg) { const n = box.querySelector('[data-ffi-sumnote]'); if (n) n.textContent = msg; }
function sumPrint(text) {
  try {
    const fr = document.createElement('iframe'); fr.setAttribute('aria-hidden', 'true'); fr.style.cssText = 'position:fixed;left:-9999px;width:1px;height:1px;border:0';
    document.body.appendChild(fr);
    const d = fr.contentWindow.document; d.open(); d.write('<!doctype html><title>Futures Friends request</title><pre style="font:16px/1.5 Georgia,serif;white-space:pre-wrap">' + e(text) + '</pre>'); d.close();
    fr.contentWindow.focus(); fr.contentWindow.print(); setTimeout(() => fr.remove(), 1500); return true;
  } catch (_) { return false; }
}

const honeypot = (id = 'ffiHp') => `<div class="ffi-hp" aria-hidden="true"><label>Leave this field empty<input type="text" name="website" id="${id}" tabindex="-1" autocomplete="off"></label></div>`;

function receipt(o) {
  const confirm = o.email ? (o.emailConfirmation === 'queued'
      ? `We are sending a confirmation email to <b style="overflow-wrap:anywhere">${e(o.email)}</b>. If it does not arrive in a few minutes, check your spam folder.`
      : o.emailConfirmation === 'suppressed'
        ? `We could not send a confirmation email to <b style="overflow-wrap:anywhere">${e(o.email)}</b>, so please keep this reference number.`
        : '') : '';
  return `<div class="ffx-ok" role="status" tabindex="-1" id="ffiOk">
  <span class="tag c" style="--c:var(--ok);justify-self:start">Request received</span>
  <h3>${e(o.title)}</h3>
  <div class="ffi-ref"><span>Your reference number</span><b>${e(o.ref)}</b></div>
  <p class="small" style="margin:0"><b>A real person will contact you within ${e(o.days)} business day${o.days === 1 ? '' : 's'}.</b></p>
  ${o.lines ? o.lines.map(l => `<p class="small" style="margin:0">${l}</p>`).join('') : ''}
  ${confirm ? `<p class="small" style="margin:0">${confirm}</p>` : ''}
  <p class="small muted" style="margin:0">Questions? Call ${e(phone())} or email ${e(email())} and quote your reference number.</p>
  ${o.after || ''}</div>`;
}
function showReceipt(container, o) {
  container.innerHTML = receipt(o);
  const ok = el('ffiOk'); if (ok) { ok.focus({ preventScroll: true }); ok.scrollIntoView({ block: 'nearest' }); }
}

function setErr(id, msg) {
  const input = el(id), out = el(id + '-e');
  if (input) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  if (out) out.textContent = msg || '';
  return !msg;
}
const msgBox = form => { let m = form.querySelector('[data-ffi-msg]'); if (!m) { m = document.createElement('p'); m.className = 'ffi-msg'; m.setAttribute('role', 'alert'); m.setAttribute('data-ffi-msg', ''); form.appendChild(m); } return m; };
function busy(form, on, label) {
  const b = form.querySelector('button[type="submit"]'); if (!b) return;
  if (on) { b.dataset.label = b.textContent; b.textContent = 'Sending...'; b.disabled = true; form.setAttribute('aria-busy', 'true'); }
  else { b.textContent = label || b.dataset.label || b.textContent; b.disabled = false; form.removeAttribute('aria-busy'); }
}
// Show a failed result on the form: inline messages for fields the gateway rejected, a summary line for the rest.
function showFailure(form, result, fieldIds) {
  const msg = msgBox(form);
  if (result.errors) {
    let first = null;
    for (const [field, text] of Object.entries(result.errors)) {
      const id = fieldIds[field];
      if (id && el(id)) { setErr(id, text); first = first || el(id); }
      else msg.textContent = (msg.textContent ? msg.textContent + ' ' : '') + text;
    }
    msg.textContent = msg.textContent || result.message;
    if (first) first.focus();
  } else msg.textContent = result.message || 'We could not send this form.';
  if (!result.errors && !/still (here|on this page)/.test(msg.textContent)) msg.textContent += ' It did not go through, and everything you typed is still here.';
  busy(form, false, result.network ? 'Try again' : null);
}
const clearMsg = form => { const m = form.querySelector('[data-ffi-msg]'); if (m) m.textContent = ''; };

// ---------------------------------------------------------------- contact / quote / program inquiry (views.js pages)
const ORG_TYPES = [['center', 'Child care center'], ['homeDaycare', 'Licensed home daycare'], ['preK', 'Pre-K or Head Start partner'],
  ['employer', 'Employer child care'], ['church', 'Church or faith-based program'], ['family', 'Family'], ['investor', 'Investor or partner'], ['other', 'Other']];
const INTERESTS = [['question', 'I have a question'], ['quote', 'A quote for my center, home daycare or church'],
  ['program', 'Bring the Futures Friends program to my site'], ['franchise', 'Franchise or license information'], ['demo', 'See a demo of the Futures Hub']];
const KIND_OF = { question: ['contact', {}], quote: ['quote', {}], program: ['partner', { interest: 'program' }], franchise: ['partner', { interest: 'franchise' }], demo: ['partner', { interest: 'demo' }] };

function orderText() {
  try {
    if (typeof st === 'undefined' || typeof D === 'undefined' || !st.cart) return '';
    const lines = Object.entries(st.cart).filter(([, q]) => q > 0).map(([k, q]) => `${q} x ${(D.catalog[+k] || {}).item || 'item'}`);
    return lines.length ? 'Order request:\n' + lines.join('\n') : '';
  } catch (_) { return ''; }
}

// preset (optional): { id, heading, interest, message, what } lets a page open the same form with its own heading, a preselected
// interest and a short starting message, without a second form. The values are plain text and escaped here.
const PRESETS = {};
function contactHtml(mode, preset) {
  const p = preset && typeof preset === 'object' ? preset : {};
  if (p.id) PRESETS[p.id] = p;
  const heading = p.heading || (mode === 'quote' ? 'Request a quote' : 'Request information');
  const tag = p.id ? ` data-ffi-preset="${e(p.id)}"` : '';
  if (!enabled()) return `<div class="card" id="ffiContactCard"${tag}><h3>${e(heading)}</h3>${soon(p.what || (mode === 'quote' ? 'quote requests' : 'information requests'))}</div>`;
  const interest = INTERESTS.some(o => o[0] === p.interest) ? p.interest : (mode === 'quote' ? 'quote' : 'question');
  const order = p.message != null ? String(p.message) : (mode === 'quote' ? orderText() : '');
  setTimeout(warm, 0);
  return `<div class="card" id="ffiContactCard"${tag}><h3>${e(heading)}</h3>
  <p class="small muted" style="margin:0">Send this and a real person will contact you within two business days. Please do not include children's health or personal details.</p>
  <form class="ffi-form" id="ffiContact" novalidate>
   <label class="f" for="cInterest">What can we help with?<select class="i" id="cInterest" name="interest">${INTERESTS.map(o => `<option value="${o[0]}"${o[0] === interest ? ' selected' : ''}>${e(o[1])}</option>`).join('')}</select></label>
   <label class="f" for="cName">Name<input class="i" id="cName" name="name" autocomplete="name" aria-describedby="cName-e"><span class="ffx-err" id="cName-e" aria-live="polite"></span></label>
   <label class="f" for="cTitle">Title (optional)<input class="i" id="cTitle" name="title" placeholder="Director, owner, teacher, parent"></label>
   <label class="f" for="cOrg">Center, home daycare or organization (optional)<input class="i" id="cOrg" name="org"></label>
   <label class="f" for="cType">Program type<select class="i" id="cType" name="orgType" aria-describedby="cType-e"><option value="">Choose one</option>${ORG_TYPES.map(o => `<option value="${o[0]}">${e(o[1])}</option>`).join('')}</select><span class="ffx-err" id="cType-e" aria-live="polite"></span></label>
   <div class="ffx-row"><label class="f" for="cKids">Children enrolled (optional)<input class="i" id="cKids" name="kids" type="number" min="0" max="9999" inputmode="numeric"></label>
   <label class="f" for="cZip">ZIP code<input class="i" id="cZip" name="zip" inputmode="numeric" autocomplete="postal-code" maxlength="10" aria-describedby="cZip-e"><span class="ffx-err" id="cZip-e" aria-live="polite"></span></label></div>
   <label class="f" for="cEmail">Email address<input class="i" id="cEmail" name="email" type="email" autocomplete="email" aria-describedby="cEmail-e"><span class="ffx-err" id="cEmail-e" aria-live="polite"></span></label>
   <label class="f" for="cPhone">Phone (optional)<input class="i" id="cPhone" name="phone" type="tel" autocomplete="tel" aria-describedby="cPhone-e"><span class="ffx-err" id="cPhone-e" aria-live="polite"></span></label>
   <label class="f" for="cMsg">Message<textarea class="i" id="cMsg" name="message" aria-describedby="cMsg-e">${e(order)}</textarea><span class="ffx-err" id="cMsg-e" aria-live="polite"></span></label>
   ${honeypot()}
   <button class="btn gold" type="submit">Send my request</button>
   <p class="ffi-note">We use what you send only to answer your request. See our <button type="button" class="rl" data-go="privacy">privacy policy</button>.</p>
  </form></div>`;
}
const CONTACT_FIELDS = { name: 'cName', email: 'cEmail', phone: 'cPhone', message: 'cMsg', zip: 'cZip', orgType: 'cType', interest: 'cInterest', kids: 'cKids', org: 'cOrg', title: 'cTitle' };

async function onContact(f) {
  clearMsg(f);
  const which = val('cInterest') || 'question', partner = /^(program|franchise|demo)$/.test(which), zipOk = /^\d{5}(-\d{4})?$/.test(val('cZip'));
  const checks = [setErr('cName', val('cName').length >= 2 ? '' : 'Add your name.'), setErr('cEmail', okEmail(val('cEmail')) ? '' : 'Enter a valid email address.'),
    setErr('cPhone', !val('cPhone') || okPhone(val('cPhone')) ? '' : 'Enter a 10-digit phone number.'),
    setErr('cMsg', which !== 'question' || val('cMsg') ? '' : 'Tell us how we can help.'),
    setErr('cType', !partner || val('cType') ? '' : 'Choose your program type.'),
    setErr('cZip', partner ? (zipOk ? '' : 'Add the 5-digit ZIP code of your program, or of the area you are interested in.') : (!val('cZip') || zipOk ? '' : 'Enter a 5-digit ZIP code.'))];
  if (!checks.every(Boolean)) { const bad = f.querySelector('[aria-invalid="true"]'); if (bad) bad.focus(); return; }
  const [kind, extra] = KIND_OF[which];
  const data = Object.assign({ name: val('cName'), email: val('cEmail'), phone: val('cPhone'), message: val('cMsg'), org: val('cOrg'), title: val('cTitle'),
    orgType: val('cType'), zip: val('cZip'), website: val('ffiHp') }, extra);
  if (val('cKids')) data.kids = val('cKids');
  for (const k of Object.keys(data)) if (data[k] === '') delete data[k];
  busy(f, true);
  const r = await submit(kind, data);
  if (r.ok) {
    showReceipt(el('ffiContactCard'), { title: 'We received your request.', ref: r.ref, days: r.days, email: data.email, emailConfirmation: r.emailConfirmation,
      after: '<button type="button" class="btn soft" data-ffi-again style="justify-self:start">Send another request</button>' });
  } else showFailure(f, r, CONTACT_FIELDS);
}

// ---------------------------------------------------------------- Careers (#jobs, #job/<id>)
const loading = what => `<div class="ffi-load" role="status"><span class="ffi-spin" aria-hidden="true"></span><span>Loading ${e(what)}...</span></div>`;
const COLORS = ['booker', 'lumi', 'zuri', 'bop'];

function jobCard(j, i) {
  const where = j.location ? [j.location.name, [j.location.city, j.location.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ') : '';
  return `<article class="card ffi-job" style="--c:var(--${COLORS[i % 4]})"><div class="ffi-meta">${j.role ? `<span class="tag c" style="--c:var(--${COLORS[i % 4]})">${e(j.role)}</span>` : ''}${j.employmentType ? `<span class="tag">${e(j.employmentType)}</span>` : ''}${j.payRange ? `<span class="tag">${e(j.payRange)}</span>` : ''}</div>
   <h3>${e(j.title)}</h3>${where ? `<span class="small muted">${e(where)}</span>` : ''}
   ${j.description ? `<p class="small ffi-text" style="margin:0">${e(j.description.length > 220 ? j.description.slice(0, 217) + '...' : j.description)}</p>` : ''}
   <span class="small muted">${j.postedDate ? 'Posted ' + e(fmtDate(j.postedDate)) : ''}${j.postedDate && j.closeDate ? ' · ' : ''}${j.closeDate ? 'Apply by ' + e(fmtDate(j.closeDate)) : ''}</span>
   <div><button class="btn gold" data-job="${e(j.id)}">View and apply</button></div></article>`;
}

async function loadJobs(force) {
  const box = el('ffiJobs'); if (!box) return;
  if (!enabled()) { box.innerHTML = soon('job applications'); return; }
  const r = await jobs(force);
  if (!el('ffiJobs')) return;          // the visitor left this page while loading
  if (!r.ok) { box.innerHTML = `<div class="ffi-soon" role="alert"><b>We could not load the open positions.</b><p class="small" style="margin:0">${e(r.message || '')} Nothing is wrong with your connection if this keeps happening: please call us at ${e(phone())}.</p><div class="acts"><button class="btn gold" data-ffi-reload>Try again</button><a class="btn soft" href="${telHref()}">Call ${e(phone())}</a></div></div>`; return; }
  box.innerHTML = r.jobs.length
    ? `<p class="small muted" style="margin:0 0 12px">${r.jobs.length} open position${r.jobs.length === 1 ? '' : 's'}</p><div class="ffi-jobs">${r.jobs.map(jobCard).join('')}</div>`
    : `<div class="card"><h3>No positions are open right now</h3><p class="small" style="margin:0">We hire throughout the year. Call ${e(phone())} or email ${e(email())} to tell us about yourself, and check back here soon.</p></div>`;
}

V.jobs = () => {
  setTimeout(() => loadJobs(), 0);
  return phero('Careers', 'Teach with Futures Friends', 'Teachers, cooks and directors for Futures Friends centers. Openings appear here as they come up.' + say(' Applying takes about five minutes and asks for your resume.', ' Online applications are not switched on yet, so call or email with your resume.'), { chars: KEYS }) + `
<section class="band-paper"><div class="wrap"><div id="ffiJobs" aria-live="polite">${enabled() ? loading('open positions') : soon('job applications')}</div></div></section>
<section><div class="wrap"><div class="grid g3">
 ${card('What we look for', 'Warm, steady adults who like young children. A CDA or CPR/First Aid helps and is not required for every role; tell us what you have.', 'Teachers', 'booker')}
 ${card('Background screening', 'Every person who works with children is screened through the Missouri Family Care Safety Registry. We tell you before we ask.', 'Safety first', 'zuri')}
 ${card('What happens after you apply', say('You get a reference number right away. The hiring team reviews applications and contacts people it would like to meet. Applying is not a job offer.', 'Until online applications are switched on, call or email and the hiring team will take your details. They contact people they would like to meet. Applying is not a job offer.'), 'Honest timeline', 'lumi')}
</div></div></section>`;
};

const APPLY_FIELDS = { name: 'aName', email: 'aEmail', phone: 'aPhone', availability: 'aAvail', yearsExperience: 'aYears', consent: 'aConsent', resume: 'aResume', jobId: 'aResume' };

function jobDetail(j) {
  const where = j.location ? [j.location.name, [j.location.city, j.location.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ') : '';
  const sect = (t, x) => x ? `<div style="display:grid;gap:4px"><b>${t}</b><p class="small ffi-text" style="margin:0">${e(x)}</p></div>` : '';
  return `<div class="card"><div class="ffi-meta">${j.role ? `<span class="tag c" style="--c:var(--booker)">${e(j.role)}</span>` : ''}${j.employmentType ? `<span class="tag">${e(j.employmentType)}</span>` : ''}${j.payRange ? `<span class="tag">${e(j.payRange)}</span>` : ''}</div>
   ${where ? `<span class="small muted">${e(where)}</span>` : ''}
   <span class="small muted">${j.postedDate ? 'Posted ' + e(fmtDate(j.postedDate)) : ''}${j.postedDate && j.closeDate ? ' · ' : ''}${j.closeDate ? 'Apply by ' + e(fmtDate(j.closeDate)) : ''}</span>
   ${sect('About the role', j.description)}${sect('Requirements', j.requirements)}
   <div><button class="rl" data-go="jobs">All open positions</button></div></div>`;
}
function applyHtml(j) {
  setTimeout(warm, 0);
  return `<div class="card" id="ffiApplyCard"><div class="eyebrow">Apply</div><h3>Apply for ${e(j.title)}</h3>
  <form class="ffi-form" id="ffiApply" data-job="${e(j.id)}" data-title="${e(j.title)}" novalidate>
   <label class="f" for="aName">Full name<input class="i" id="aName" name="name" autocomplete="name" aria-describedby="aName-e"><span class="ffx-err" id="aName-e" aria-live="polite"></span></label>
   <div class="ffx-row"><label class="f" for="aEmail">Email<input class="i" id="aEmail" name="email" type="email" autocomplete="email" aria-describedby="aEmail-e"><span class="ffx-err" id="aEmail-e" aria-live="polite"></span></label>
   <label class="f" for="aPhone">Phone<input class="i" id="aPhone" name="phone" type="tel" autocomplete="tel" aria-describedby="aPhone-e"><span class="ffx-err" id="aPhone-e" aria-live="polite"></span></label></div>
   <label class="f" for="aYears">Years of experience with young children<input class="i" id="aYears" name="yearsExperience" type="number" min="0" max="60" inputmode="numeric" aria-describedby="aYears-e"><span class="ffx-err" id="aYears-e" aria-live="polite"></span></label>
   <label class="f" for="aAvail">When can you work?<textarea class="i" id="aAvail" name="availability" style="min-height:80px" placeholder="Days and hours, and when you could start" aria-describedby="aAvail-e"></textarea><span class="ffx-err" id="aAvail-e" aria-live="polite"></span></label>
   <div style="display:grid;gap:8px"><label class="ffi-check" for="aCda"><input type="checkbox" id="aCda" name="hasCda"><span>I have a Child Development Associate (CDA) credential</span></label>
   <label class="ffi-check" for="aCpr"><input type="checkbox" id="aCpr" name="hasCpr"><span>I have current CPR / First Aid training</span></label></div>
   <label class="f" for="aResume">Resume (PDF or Word .docx, up to 5 MB)<input class="i" id="aResume" name="resume" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" aria-describedby="aResume-e"><span class="ffx-err" id="aResume-e" aria-live="polite"></span></label>
   <label class="ffi-check" for="aConsent"><input type="checkbox" id="aConsent" name="consent" aria-describedby="aConsent-e"><span>I agree that Futures Friends may store my application and resume and use them to consider me for this and other openings. I understand that applying is not a job offer.</span></label><span class="ffx-err" id="aConsent-e" aria-live="polite"></span>
   ${honeypot()}
   <button class="btn gold" type="submit">Send my application</button>
   <p class="ffi-note">Please do not put health information, Social Security numbers or bank details in your application or resume. We never ask for them here.</p>
  </form></div>`;
}

async function loadJob() {
  const box = el('ffiJob'); if (!box) return;
  const id = typeof arg !== 'undefined' ? arg : null;
  if (!enabled()) { box.innerHTML = soon('job applications'); return; }
  const r = await job(id);
  if (!el('ffiJob')) return;
  if (!r.ok) {
    box.innerHTML = r.closed
      ? `<div class="ffi-soon" role="note"><b>This opening is closed or does not exist.</b><p class="small" style="margin:0">Positions close when they are filled. Have a look at what is open now.</p><div class="acts"><button class="btn gold" data-go="jobs">See open positions</button></div></div>`
      : `<div class="ffi-soon" role="alert"><b>We could not load this opening.</b><p class="small" style="margin:0">${e(r.message || '')} Please try again or call us at ${e(phone())}.</p><div class="acts"><button class="btn gold" data-ffi-reload>Try again</button></div></div>`;
    return;
  }
  const j = r.job, h1 = document.querySelector('.phero h1'), crumb = document.querySelector('.phero .crumbs');
  if (h1) h1.textContent = j.title;
  if (crumb) crumb.innerHTML = '<button data-go="jobs">Careers</button> / ' + e(j.title);
  box.innerHTML = `<div class="grid g2" style="align-items:start">${jobDetail(j)}${applyHtml(j)}</div>`;
}
V.job = () => {
  setTimeout(() => loadJob(), 0);
  return phero('Careers', 'Job opening', '', { crumb: ['jobs', 'Careers'], chars: KEYS }) + `<section class="band-paper"><div class="wrap"><div id="ffiJob" aria-live="polite">${enabled() ? loading('this opening') : soon('job applications')}</div></div></section>`;
};

async function onApply(f) {
  clearMsg(f);
  const file = (el('aResume') || {}).files && el('aResume').files[0];
  const name = file ? file.name.toLowerCase() : '';
  const checks = [setErr('aName', val('aName').length >= 2 ? '' : 'Add your full name.'), setErr('aEmail', okEmail(val('aEmail')) ? '' : 'Enter a valid email address.'),
    setErr('aPhone', okPhone(val('aPhone')) ? '' : 'Enter a 10-digit phone number.'),
    setErr('aYears', /^\d{1,2}$/.test(val('aYears')) ? '' : 'Enter a whole number, 0 or more.'), setErr('aAvail', val('aAvail') ? '' : 'Tell us when you can work.'),
    setErr('aResume', !file ? 'Attach your resume.' : !/\.(pdf|docx)$/.test(name) ? 'Only PDF and Word (.docx) resumes are accepted.' : file.size > 5 * 1024 * 1024 ? 'That file is larger than 5 MB.' : file.size === 0 ? 'That file is empty.' : ''),
    setErr('aConsent', el('aConsent').checked ? '' : 'Please check the box to continue.')];
  if (!checks.every(Boolean)) { const bad = f.querySelector('[aria-invalid="true"]'); if (bad) bad.focus(); return; }
  const fd = new FormData();
  fd.set('jobId', f.dataset.job); fd.set('name', val('aName')); fd.set('email', val('aEmail')); fd.set('phone', val('aPhone'));
  fd.set('yearsExperience', val('aYears')); fd.set('availability', val('aAvail')); fd.set('consent', 'on'); fd.set('website', val('ffiHp'));
  if (el('aCda').checked) fd.set('hasCda', 'on');
  if (el('aCpr').checked) fd.set('hasCpr', 'on');
  fd.set('resume', file, file.name);
  busy(f, true);
  const r = await apply(fd);
  if (r.ok) {
    showReceipt(el('ffiApplyCard'), { title: 'We received your application for ' + f.dataset.title + '.', ref: r.ref, days: r.days, email: val('aEmail'), emailConfirmation: r.emailConfirmation,
      lines: ['This is not a job offer or an interview invitation. The hiring team will review your application and contact you if there is a fit.'],
      after: '<button type="button" class="btn soft" data-go="jobs" style="justify-self:start">See other open positions</button>' });
  } else if (r.errors && r.errors.jobId) {
    el('ffiJob').innerHTML = `<div class="ffi-soon" role="alert"><b>This opening just closed.</b><p class="small" style="margin:0">${e(r.errors.jobId)}</p><div class="acts"><button class="btn gold" data-go="jobs">See open positions</button></div></div>`;
  } else showFailure(f, r, APPLY_FIELDS);
}

// ---------------------------------------------------------------- events
document.addEventListener('submit', ev => {
  const f = ev.target; if (!f || !f.id) return;
  if (f.id === 'ffiContact') { ev.preventDefault(); onContact(f); }
  else if (f.id === 'ffiApply') { ev.preventDefault(); onApply(f); }
}, true);
document.addEventListener('click', ev => {
  const t = ev.target; if (!t || !t.closest) return;
  const j = t.closest('[data-job]'); if (j && j.tagName === 'BUTTON') { ev.preventDefault(); go('job', j.dataset.job); return; }
  if (t.closest('[data-ffi-reload]')) { ev.preventDefault(); jobsCache = null; if (el('ffiJob')) { el('ffiJob').innerHTML = loading('this opening'); loadJob(); } else { el('ffiJobs').innerHTML = loading('open positions'); loadJobs(true); } return; }
  const sc = t.closest('[data-ffi-sumcopy]'), sp = t.closest('[data-ffi-sumprint]');
  if (sc || sp) { ev.preventDefault(); const box = (sc || sp).closest('[data-ffi-sum]'), o = sumRefresh(box), text = o ? o.value : '';
    if (sc) { let done = false; try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(() => sumNote(box, 'Copied. Paste it into an email to ' + email() + '.'), () => sumNote(box, 'Select the text above and copy it.')); done = true; } } catch (_) { /* fall through */ }
      if (!done) { try { o.focus(); o.select(); sumNote(box, document.execCommand('copy') ? 'Copied.' : 'Select the text above and copy it.'); } catch (_) { sumNote(box, 'Select the text above and copy it.'); } } }
    else sumNote(box, sumPrint(text) ? 'Opening your print dialog.' : 'Printing did not open. Copy the summary instead.');
    return; }
  if (t.closest('[data-ffi-again]')) { ev.preventDefault(); const c = el('ffiContactCard'); if (c) c.outerHTML = contactHtml(view === 'quote' ? 'quote' : 'contact', PRESETS[c.getAttribute('data-ffi-preset')]); }
}, true);
document.addEventListener('toggle', ev => { const t = ev.target; if (t && t.matches && t.matches('[data-ffi-sum]') && t.open) sumRefresh(t); }, true);
document.addEventListener('input', ev => { const t = ev.target; if (t && t.closest && t.hasAttribute && t.hasAttribute('data-ffi-sumf') && t.closest('[data-ffi-sum]')) sumRefresh(t.closest('[data-ffi-sum]')); if (t && t.getAttribute && t.getAttribute('aria-invalid') === 'true') setErr(t.id, ''); });

window.FFIntake = { enabled, say, base, warm, submit, apply, status, jobs, job, soon, subjectFor, mailtoFor, receipt, showReceipt, honeypot, setErr, busy, showFailure, clearMsg, contactHtml, loadJobs, okEmail, okPhone, fmtDate,
  _t: { interpret, keyFor, orderText } };
})();
