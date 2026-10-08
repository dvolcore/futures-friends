/* Futures Hub DEMO, director screens ported from the QEP CEO Operating Spine (2026-10-08), in Futures Friends' own look:
     - War Room (tab "war"): licensing readiness level DERIVED from the open compliance items, what changed, the local market
       (positioning map with 12-month trails, size reality check on a square-root scale), who can take a family and how, nine moves.
     - Exposure (tab "exposure"): the register of open items an inspector would ask for, and whether you can prove your side.
     - Briefs (tab "briefs"): a prep sheet per booked tour or enrollment meeting, built from the enrollment desk's families.
     - Cash (tab "cash", directors and the owner only, like Billing): payroll every Friday vs subsidy and meal money weeks later.
   Truth lives where it already lives: compliance items are the demo's "What's due" list (dues), staff background checks and care
   plans (demo-core.js); families are the enrollment desk's apps; rates and subsidy accounts are the billing seed. Nothing is
   duplicated here. Competitors and every market figure are INVENTED for the demo and say so. Every dollar is MODELLED.
   Motion follows the Spine law: reveals 14px / 60ms stagger, count-ups that always settle on the real figure, bars that grow once,
   trails that flow a few times and stop; prefers-reduced-motion gets the finished page. The helpers below (provStrip, sourcesFooter,
   installReveals, countUp, growBars) mirror the names planned for portal-spine.js so they can be swapped for it later.
   Pure model functions (exposures, readiness, floatModel) are exported on window.FFReady for tests (tests/portal-ready.test.js). */
(function () {
'use strict';
const W = typeof window !== 'undefined' ? window : globalThis;

// ---------------------------------------------------------------- dates (ISO yyyy-mm-dd, timezone-free)
const D0 = s => { const p = String(s || '').slice(0, 10).split('-').map(Number); return Date.UTC(p[0], (p[1] || 1) - 1, p[2] || 1); };
const daysBetween = (a, b) => Math.round((D0(b) - D0(a)) / 864e5);          // b minus a, in days
const addDays = (s, n) => new Date(D0(s) + n * 864e5).toISOString().slice(0, 10);
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const fmtD = s => { const t = new Date(D0(s)); return `${MON[t.getUTCMonth()]} ${t.getUTCDate()}`; };
const fmtDay = s => { const t = new Date(D0(s)); return `${DOW[t.getUTCDay()]}, ${fmtD(s)}`; };
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const WORDS = ['No','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten'];
const word = n => WORDS[n] || String(n);

// ---------------------------------------------------------------- the model (pure; tested)
const LEVELS = [
  {key:'calm', label:'Calm', tone:'zuri'}, {key:'guarded', label:'Guarded', tone:'booker'},
  {key:'elevated', label:'Elevated', tone:'gold'}, {key:'critical', label:'Critical', tone:'bad'}];
const SEV = {critical:{rank:0, label:'Critical'}, high:{rank:1, label:'Due this week'}, watch:{rank:2, label:'Watch'}};
const KIND = {Safety:'Safety check', Meals:'Meal program claim', Staff:'Staff file', Training:'Staff training', Ministry:'Board update'};
const RULES = {critical:'past its due date with nothing logged', high:'due within 7 days', watch:'due later'};

function ownerFor(area, staff){
  const list = Object.entries(staff || {});
  const dir = list.find(([, s]) => s.owner) || list.find(([, s]) => /director/i.test(s.role || ''));
  if (/meal|food|kitchen|cacfp/i.test(area || '')) { const ck = list.find(([, s]) => /cook/i.test(s.role || '')); if (ck) return {id:ck[0], name:ck[1].name}; }
  return dir ? {id:dir[0], name:dir[1].name} : {id:null, name:'The director'};
}
// Open compliance items = the demo's "What's due" list plus any staff background check that is not cleared (folded into the due item
// that names the person when there is one). Severity: past due = critical, due within 7 days = high, later = watch.
function exposures(o){
  const today = o.today, dues = o.dues || {}, staff = o.staff || {}, kids = o.kids || {};
  const items = [];
  Object.entries(dues).forEach(([id, d]) => {
    if (!d || d.done) return;
    const late = daysBetween(d.due, today), sev = late > 0 ? 'critical' : -late <= 7 ? 'high' : 'watch';
    items.push({src:'due', dueId:id, title:d.title, area:d.area || '', kind:KIND[d.area] || d.area || 'Item', due:d.due, late, sev, owner:ownerFor(d.area, staff),
      ownerOnFile:false, status:'Not started', evidence:late > 0 ? 'none' : 'incomplete',
      detail:late > 0 ? `Was due ${fmtD(d.due)}. ${plural(late, 'day', 'days')} past due and nothing is logged.` : `Due ${fmtD(d.due)}${late === 0 ? ', today' : `, in ${plural(-late, 'day', 'days')}`}. Not logged yet.`,
      proof:late > 0 ? 'None on file' : 'Not logged yet'});
  });
  Object.entries(staff).forEach(([id, s]) => {
    if (!s || !s.bg || /^cleared$/i.test(s.bg)) return;
    const lapse = s.bgDue ? `If it lapses on ${fmtD(s.bgDue)}, ${s.name} cannot be counted in the ratio.` : `${s.name} cannot be counted in the ratio until it clears.`;
    const hit = items.find(x => s.name && String(x.title).includes(s.name));
    if (hit) { hit.subject = s.name; hit.detail += ' ' + lapse + (s.bgDue && s.bgDue < hit.due ? ' The reminder falls after the lapse date.' : ''); hit.proof = `${s.bg} on the staff file`; hit.evidence = hit.late > 0 ? 'none' : 'incomplete'; return; }
    const due = s.bgDue || today, late = daysBetween(due, today), sev = late > 0 ? 'critical' : -late <= 7 ? 'high' : 'watch';
    items.push({src:'staff', staffId:id, title:`Background check: ${s.name}`, area:'Staff', kind:'Background check', due, late, sev, owner:ownerFor('Staff', staff),
      ownerOnFile:false, status:'Not started', evidence:'incomplete', subject:s.name, detail:`${s.bg}. ${lapse}`, proof:`${s.bg} on the staff file`});
  });
  items.sort((a, b) => SEV[a.sev].rank - SEV[b.sev].rank || String(a.due).localeCompare(String(b.due)));
  items.forEach((x, i) => { x.ref = 'EX-' + String(i + 1).padStart(2, '0'); });
  const doneDues = Object.values(dues).filter(d => d && d.done).length;
  const cleared = Object.values(staff).filter(s => s && /^cleared$/i.test(s.bg || '')).length;
  const plans = Object.values(kids).filter(k => k && k.alert).length;
  return {items, documented:{n:doneDues + cleared + plans, doneDues, cleared, plans}};
}
// The readiness level is a pure function of the open items: 3+ critical, or one more than 10 days late = critical; any critical =
// elevated; anything due within 7 days = guarded; otherwise calm. The three sentences say what moves it, from the same items.
function readiness(items, today){
  items = items || [];
  const crit = items.filter(x => x.sev === 'critical'), high = items.filter(x => x.sev === 'high'), watch = items.filter(x => x.sev === 'watch');
  const worst = crit.reduce((m, x) => Math.max(m, x.late), 0);
  const idx = crit.length >= 3 || worst > 10 ? 3 : crit.length ? 2 : high.length ? 1 : 0;
  const names = xs => xs.map(x => x.title).join('; ');
  const oldest = crit.slice().sort((a, b) => b.late - a.late)[0];
  const soonHigh = high.slice().sort((a, b) => String(a.due).localeCompare(String(b.due)))[0];
  const soonWatch = watch.slice().sort((a, b) => String(a.due).localeCompare(String(b.due)))[0];
  let why, drops, rises, head;
  if (idx === 3) {
    why = `${word(crit.length)} ${crit.length === 1 ? 'item is' : 'items are'} past due with nothing logged${worst > 10 ? `, the oldest by ${worst} days` : ''}.`;
    drops = 'Elevated once fewer than three items are past due and none is more than 10 days late.';
    rises = 'It is already at the top level. Every day adds to the oldest item.';
    head = `${word(crit.length)} ${crit.length === 1 ? 'item' : 'items'} would be written up on a visit today.`;
  } else if (idx === 2) {
    why = `${word(crit.length)} ${crit.length === 1 ? 'item is' : 'items are'} past due with nothing logged: ${names(crit)}.`;
    drops = `Guarded as soon as ${crit.length === 1 ? 'it is' : 'they are'} logged.`;
    const need = 3 - crit.length, next = high.slice().sort((a, b) => String(a.due).localeCompare(String(b.due))).slice(0, need);
    rises = `Critical if ${oldest.title.replace(/\s*\(log it\)/i, '')} is still open on ${fmtD(addDays(oldest.due, 11))}` +
      (next.length === need ? `, or if ${need === 1 ? next[0].title.replace(/\s*\(log it\)/i, '') + ' also passes its due date' : `${word(need).toLowerCase()} more items pass their due date (next: ${next[0].title.replace(/\s*\(log it\)/i, '')}, ${fmtD(next[0].due)})`}.` : '.');
    head = `${word(crit.length)} ${crit.length === 1 ? 'item' : 'items'} would be written up on a visit today.`;
  } else if (idx === 1) {
    why = `Nothing is past due, but ${plural(high.length, 'item comes', 'items come')} due within 7 days.`;
    drops = `Calm once ${high.length === 1 ? 'it is' : 'they are'} logged.`;
    rises = `Elevated if ${soonHigh.title.replace(/\s*\(log it\)/i, '')} is still open after ${fmtD(soonHigh.due)}.`;
    head = `Nothing would be written up today. ${word(high.length)} ${high.length === 1 ? 'item comes' : 'items come'} due this week.`;
  } else {
    why = 'Nothing is past due and nothing comes due within 7 days.';
    drops = 'It is already at the lowest level.';
    rises = soonWatch ? `Guarded from ${fmtD(addDays(soonWatch.due, -7))}, when ${soonWatch.title.replace(/\s*\(log it\)/i, '')} comes within 7 days, unless it is logged first.` : 'Guarded if anything comes due within 7 days.';
    head = 'Nothing would be written up today, and nothing is due this week.';
  }
  return {idx, level:LEVELS[idx].key, label:LEVELS[idx].label, tone:LEVELS[idx].tone, crit:crit.length, high:high.length, watch:watch.length, worst, why, drops, rises, head};
}
// Cash and subsidy float. Everything here is a MODEL built from the demo's own rates, subsidy accounts and staff list.
const MODEL = {pay:{lead:16, assistant:13.5, cook:13, other:13.5}, hours:40, burden:1.1, rentMonth:2400, perChildMonth:60, cacfpWeek:20, subsidyWeek:150, lags:[30, 45, 60], addFamilies:3};
const payOf = role => /lead/i.test(role || '') ? MODEL.pay.lead : /assistant/i.test(role || '') ? MODEL.pay.assistant : /cook/i.test(role || '') ? MODEL.pay.cook : MODEL.pay.other;
const floatFor = (weeklyLagged, days) => Math.round(weeklyLagged * days / 7);
function floatModel(o){
  const kids = Object.entries(o.kids || {}), rates = o.rates || {}, accts = o.accounts || {};
  let tuition = 0, subsidy = 0, subKids = 0;
  kids.forEach(([id, k]) => { const rate = rates[k.room] || 225, a = accts[id], s = a && a.subsidy ? Math.min(a.subsidy.weekly || MODEL.subsidyWeek, rate) : 0;
    if (s) subKids++; subsidy += s; tuition += rate - s; });
  const cacfp = kids.length * MODEL.cacfpWeek;
  const team = Object.values(o.staff || {}).filter(s => s && !s.owner);
  const payroll = Math.round(team.reduce((t, s) => t + payOf(s.role) * MODEL.hours * MODEL.burden, 0));
  const fixed = Math.round((MODEL.rentMonth + MODEL.perChildMonth * kids.length) * 12 / 52);
  const lagged = subsidy + cacfp, extra = MODEL.addFamilies * (MODEL.subsidyWeek + MODEL.cacfpWeek);
  const scenarios = [['optimistic', 'Optimistic', MODEL.lags[0]], ['realistic', 'Realistic', MODEL.lags[1]], ['conservative', 'Conservative', MODEL.lags[2]]]
    .map(([key, label, days]) => ({key, label, days, float:floatFor(lagged, days), plus:floatFor(lagged + extra, days)}));
  const month = w => Math.round(w * 52 / 12), inflow = tuition + subsidy + cacfp;
  const streams = [
    {key:'tuition', name:'Private tuition', when:'weekly, before care', children:kids.length - 0, weekly:tuition, monthly:month(tuition), lag:'Paid before care', lagDays:0, share:inflow ? Math.round(tuition / inflow * 100) : 0},
    {key:'ccdf', name:'State subsidy (CCDF)', when:'after attendance is filed', children:subKids, weekly:subsidy, monthly:month(subsidy), lag:'30 to 60 days after', lagDays:45, share:inflow ? Math.round(subsidy / inflow * 100) : 0},
    {key:'cacfp', name:'CACFP meals', when:'after the monthly claim', children:kids.length, weekly:cacfp, monthly:month(cacfp), lag:'About 45 days after', lagDays:45, share:inflow ? Math.round(cacfp / inflow * 100) : 0}];
  return {kids:kids.length, subKids, team:team.length, payroll, fixed, weeklyOut:payroll + fixed, tuition, subsidy, cacfp, lagged, extra, scenarios, streams};
}

const API = {LEVELS, MODEL, exposures, readiness, floatModel, floatFor, daysBetween, addDays, fmtD};
W.FFReady = API;
if (typeof module !== 'undefined' && module.exports) module.exports = API;

// ================================================================ the screens (browser, demo mode only)
if (typeof document === 'undefined' || !W.FFDemo) return;
const DM = W.FFDemo;
const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = n => '$' + Math.round(n).toLocaleString('en-US');
const ses = () => DM.session() || {};
const reduced = () => { try { return W.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return true; } };
const SAMPLE = '<span class="ffd-samp">Sample data</span>';

// ---------------------------------------------------------------- local Spine helpers (same names as portal-spine.js will export)
const SRC = {hub:['hub', 'Hub sample'], mod:['mod', 'Modelled'], inv:['inv', 'Invented for the demo'], nc:['nc', 'Not connected']};
function srcChip(k, n){ const s = SRC[k]; return `<span class="fr-src fr-src-${s[0]}"><i aria-hidden="true"></i>${n != null ? `<b>${n}</b> ` : ''}${s[1]}</span>`; }
function provStrip(counts, note){
  return `<section class="fr-prov" data-fr-reveal aria-label="Where these figures come from"><div class="fr-prov-h"><span class="fr-lbl">Where these figures come from</span>
   <span class="fr-chips">${Object.entries(counts).filter(([, n]) => n).map(([k, n]) => srcChip(k, n)).join('')}</span></div>${note ? `<p class="fr-prov-n">${note}</p>` : ''}</section>`;
}
function sourcesFooter(rows){
  return `<section class="fr-sources" data-fr-reveal><h3 class="fr-h3">Sources for this screen</h3><ul>${rows.map(([name, k, note]) => `<li><span>${E(name)}</span>${srcChip(k)}<span class="mini">${E(note)}</span></li>`).join('')}</ul></section>`;
}
function installReveals(root){
  const els = [...root.querySelectorAll('[data-fr-reveal]')];
  if (reduced() || !('IntersectionObserver' in W)) { els.forEach(el => fire(el)); return; }
  els.forEach(el => { el.classList.add('fr-pre'); });
  const show = el => { if (!el.classList.contains('fr-pre')) return; el.classList.remove('fr-pre'); el.classList.add('fr-in'); fire(el); };
  const io = new IntersectionObserver(es => { es.filter(e => e.isIntersecting).forEach((e, i) => { io.unobserve(e.target); setTimeout(() => show(e.target), i * 60); }); },
    {rootMargin:'0px 0px -8% 0px', threshold:0.04});
  els.forEach(el => io.observe(el));
  setTimeout(() => { els.forEach(show); io.disconnect(); }, 2800);   // failsafe: nothing is ever left invisible
}
function fire(scope){ countUp(scope); growBars(scope); scope.classList.add('fr-live'); }
// count-up: the HTML already holds the final figure; the animation is decoration and always settles on it
function countUp(scope){
  scope.querySelectorAll('[data-count]:not([data-done])').forEach(el => {
    el.setAttribute('data-done', '1');
    const to = +el.dataset.count, pre = el.dataset.pre || '', suf = el.dataset.suf || '', fin = el.textContent;
    if (reduced() || document.hidden || !isFinite(to) || typeof requestAnimationFrame !== 'function') return;
    const t0 = performance.now(), ms = 900; let stop = false;
    const settle = () => { stop = true; el.textContent = fin; };
    const fs = setTimeout(settle, ms + 400);
    requestAnimationFrame(function step(now){ if (stop) return; const p = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - p, 3);
      el.textContent = pre + Math.round(to * e).toLocaleString('en-US') + suf; if (p < 1) requestAnimationFrame(step); else { clearTimeout(fs); settle(); } });
  });
}
function growBars(scope){
  scope.querySelectorAll('[data-w]:not([data-grown])').forEach((el, i) => {
    el.setAttribute('data-grown', '1'); if (reduced()) return;
    el.style.transition = 'none'; el.style.width = '0'; void el.offsetWidth;
    el.style.transition = `width .8s cubic-bezier(.22,1,.36,1) ${0.1 + i * 0.05}s`; el.style.width = el.dataset.w + '%';
  });
}
const played = new Set();
function afterRender(tab){
  const run = () => { const root = document.getElementById('frRoot'); if (!root) return;
    if (played.has(tab)) { root.classList.add('fr-static'); return; }
    played.add(tab); installReveals(root); };
  if (typeof queueMicrotask === 'function') queueMicrotask(run); else Promise.resolve().then(run);
}

// ---------------------------------------------------------------- shared data
function data(){
  const today = DM.todayIso(), dues = DM.all('dues'), staff = DM.all('staff'), kids = DM.all('kids');
  const ex = exposures({today, dues, staff, kids}), lv = readiness(ex.items, today);
  return {today, dues, staff, kids, ex, lv};
}
const roomsOf = () => Object.entries(DM.all('rooms')).sort((x, y) => (x[1].order || 9) - (y[1].order || 9));
const seats = () => roomsOf().reduce((t, [, r]) => t + (r.capacity || 10), 0);
// weekly rates per room live in the billing seed (demo-core seedOps, editable on the Billing tab)
const rates = () => DM.all('rates') || {};
const waiting = () => Object.values(DM.all('apps')).filter(x => ['waitlist', 'application'].includes(x.stage)).length;
const directorName = staff => (ownerFor('Staff', staff) || {}).name || 'The director';
const leadName = staff => { const l = Object.values(staff).find(s => /lead teacher/i.test(s.role || '')); return l ? l.name : directorName(staff); };

// ---------------------------------------------------------------- the invented market (clearly labelled)
const RIVALS = [
  {id:'maple', name:'Maple Lantern Early Learning', type:'National chain, opening soon', price:265, cover:.86, was:null, seats:180, sev:'severe',
   how:'Opens a 180-seat center about three miles away in January, with a free first month for new families.',
   weapon:'A brand families already know, longer hours (6:00 to 6:30) and a parent app.',
   counter:'A director who knows every child by name, and a daily report families can read every afternoon.',
   weak:['High staff turnover','No Spanish program','Ratios run at the legal limit'], move:4},
  {id:'pocket', name:'Pocket Garden Academy', type:'Independent, expanded this fall', price:185, cover:.6, was:{price:160, cover:.45}, seats:60, sev:'high',
   how:'Moved from a home program into a storefront two miles away, at $185 a week with open seats now.',
   weapon:'Cheaper by about $40 a week, and it has seats today.',
   counter:'Waiting families already chose you. Give each one a real date before Pocket Garden calls them.',
   weak:['No named curriculum','Two online reviews','Not on the subsidy list yet'], move:1},
  {id:'cedar', name:'Cedar Hollow Chapel Preschool', type:'Church, part-day', price:120, cover:.32, was:{price:110, cover:.26}, seats:40, sev:'watch',
   how:'A half-day program; families move to you when they need full days.',
   weapon:'A low price and a congregation that refers families.',
   counter:'Partner, do not compete: offer their four-year-olds a full-day path into Pre-K.',
   weak:['Mornings only','Closed in summer'], move:5},
  {id:'north', name:'Northside Free Pre-K', type:'Publicly funded, free', price:0, cover:.55, was:{price:0, cover:.5}, seats:120, sev:'watch',
   how:'Free for families under the income line; takes subsidy-eligible children first.',
   weapon:'It is free.',
   counter:'Families just over the income line cannot use it. That is your subsidy-plus-tuition family.',
   weak:['Income-capped','Long waitlist','School-year only'], move:6},
  {id:'lark', name:'Larkspur Method School', type:'Independent, premium', price:315, cover:.7, was:{price:295, cover:.64}, seats:48, sev:'watch',
   how:'A premium price for the same families who tour you.',
   weapon:'A method with a name families recognize.',
   counter:'Show the learning in the daily report. A named method is not a visible one.',
   weak:['About $90 more a week','No subsidy accepted'], move:7}];
const SEVL = {severe:['bad', 'Severe'], high:['warn', 'High'], watch:['', 'Watch']};

// ---------------------------------------------------------------- War Room
function rail(){
  const steps = [['frChanged','What just changed'],['frLandscape','Where everyone stands'],['frRivals','Who can take a family'],['frMoves','What you do about it']];
  return `<nav class="fr-rail" data-fr-reveal aria-label="Read in this order"><span class="fr-lbl">Read in this order</span>
   <ol>${steps.map(([id, t], i) => `<li><button type="button" class="fr-step" data-fr-jump="${id}"><i class="fr-n fr-n${i + 1}" aria-hidden="true">${i + 1}</i><span>${t}</span></button></li>`).join('')}</ol>
   <button type="button" class="fr-skip" data-fr-jump="frMoves">Skip to the nine moves <span aria-hidden="true">↓</span></button></nav>`;
}
function radar(lv, items){
  const blips = items.slice(0, 9).map((x, i) => { const r = x.sev === 'critical' ? 12 : x.sev === 'high' ? 24 : 36, a = (i * 137.5 + 20) * Math.PI / 180;
    return `<circle class="fr-blip fr-blip-${x.sev}" cx="${(48 + r * Math.cos(a)).toFixed(1)}" cy="${(48 + r * Math.sin(a)).toFixed(1)}" r="${x.sev === 'critical' ? 3.6 : 2.8}"/>`; }).join('');
  return `<svg class="fr-radar" viewBox="0 0 96 96" aria-hidden="true" focusable="false">
   ${[42, 30, 18, 6].map((r, i) => `<circle class="fr-ring${3 - i === lv.idx ? ' on' : ''}" cx="48" cy="48" r="${r}"/>`).join('')}
   <g class="fr-sweep"><path d="M48 48 L48 6 A42 42 0 0 1 84 27 Z"/></g>${blips}</svg>`;
}
function levelCard(d){
  const lv = d.lv;
  return `<section class="fr-level" data-fr-reveal style="--lv:var(--fr-${lv.tone})" aria-labelledby="frLevelH">
   <div class="fr-level-top">${radar(lv, d.ex.items)}
    <div><p class="fr-lbl">Readiness level, internal use only</p><p class="fr-level-word" id="frLevelH">${lv.label}</p>
     <ol class="fr-ladder" aria-label="Levels">${LEVELS.map((l, i) => `<li class="${i === lv.idx ? 'on' : ''}"${i === lv.idx ? ' aria-current="true"' : ''}><span></span>${l.label}</li>`).join('')}</ol></div></div>
   <div class="fr-level-body"><h3 class="fr-thesis">${E(lv.head)}</h3>
    <p class="fr-p">The level is worked out from the open items on your licensing list, nothing else: ${plural(lv.crit, 'item', 'items')} past due, ${plural(lv.high, 'item', 'items')} due within 7 days. The market below is a separate question and never moves this level.</p>
    <div class="fr-conds"><div class="fr-cond fr-c-why"><p class="fr-lbl">Why it is ${lv.label.toLowerCase()}</p><p>${E(lv.why)}</p></div>
     <div class="fr-cond fr-c-down"><p class="fr-lbl">${lv.idx ? `Drops to ${LEVELS[lv.idx - 1].label.toLowerCase()} when` : 'Lowest level'}</p><p>${E(lv.drops)}</p></div>
     <div class="fr-cond fr-c-up"><p class="fr-lbl">${lv.idx < 3 ? `Rises to ${LEVELS[lv.idx + 1].label.toLowerCase()} if` : 'Top level'}</p><p>${E(lv.rises)}</p></div></div>
    <div class="ffd-row"><button type="button" class="btn navy" data-ptab="exposure">Open the exposure register</button><span class="mini">How it is worked out: 3 or more past due, or one more than 10 days late, is critical; any past due is elevated; anything due within 7 days is guarded.</span></div></div></section>`;
}
function changes(d){
  const top = d.ex.items[0], bg = d.ex.items.find(x => x.kind === 'Background check' || x.subject), w = waiting();
  const cards = [
    ['bad', 'Maple Lantern Early Learning', 'Permit filed', 'inv', 'A building permit was filed for a 180-seat center about three miles away, opening in January.', 'January is when your families re-enroll. Lock them in before then.'],
    ['warn', 'Pocket Garden Academy', 'Opened', 'inv', 'Opened a storefront two miles away at $185 a week, with open seats.', w ? `Your ${plural(w, 'waiting family', 'waiting families')} now ${w === 1 ? 'has' : 'have'} somewhere else to go.` : 'Nobody is waiting on you right now, so this is a price question, not a seat question.'],
    top ? [top.sev === 'critical' ? 'bad' : 'warn', top.title.replace(/\s*\(log it\)/i, ''), top.late > 0 ? `${top.late}d past due` : `Due ${fmtD(top.due)}`, 'hub', top.detail, top.sev === 'critical' ? `This alone holds the level at ${d.lv.label.toLowerCase()}.` : 'Log it this week and the level stays where it is.']
      : ['ok', 'Licensing list', 'All logged', 'hub', 'Nothing on the list is open.', 'Keep it that way: the next item comes due on its own schedule.'],
    bg && bg !== top ? ['warn', bg.subject || bg.title, `Due ${fmtD(bg.due)}`, 'hub', bg.detail, 'Book it now; a lapsed check takes a teacher out of the ratio.']
      : ['warn', 'State subsidy rate', '+6% (sample)', 'inv', 'The state raised its subsidy rate for ages 3 to 5 (an invented figure for this demo).', 'Subsidy families are worth more now. Enroll them on purpose, and read the Cash tab first.']];
  return `<section class="fr-panel fr-changed" id="frChanged" tabindex="-1" data-fr-reveal aria-labelledby="frChH"><div class="fr-sec-h"><span class="fr-n fr-n1" aria-hidden="true">1</span><div><h2 class="fr-h2" id="frChH">What changed since your last look</h2><p class="fr-p">Only movement is listed here. Everything stable lives further down.</p></div></div>
   <div class="fr-cards4">${cards.map(([t, who, tag, src, what, so]) => `<article class="fr-chg fr-t-${t}"><p class="fr-chg-h"><i class="fr-dot" aria-hidden="true"></i><b>${E(who)}</b><span class="chip ${t}">${E(tag)}</span></p><p>${E(what)}</p><p class="fr-so"><b>So what:</b> ${E(so)}</p>${srcChip(src)}</article>`).join('')}</div></section>`;
}
function positionMap(d){
  const Wd = 640, H = 420, X = p => 64 + (p / 340) * (Wd - 104), Y = c => H - 56 - c * (H - 112);
  const R = n => 7 + Math.sqrt(n) * 0.9;
  const rv = Object.values(rates()).filter(v => v > 0), you = {price:rv.length ? Math.round(rv.reduce((a, b) => a + b, 0) / rv.length) : 225, cover:.78, seats:seats()};
  const dots = RIVALS.map((c, i) => {
    const x = X(c.price), y = Y(c.cover), rr = R(c.seats), right = c.price > 250, [tone] = SEVL[c.sev], below = c.id === 'lark';
    const ghost = c.was ? `<line class="fr-trail" x1="${X(c.was.price)}" y1="${Y(c.was.cover)}" x2="${x}" y2="${y}"/><circle class="fr-ghost" cx="${X(c.was.price)}" cy="${Y(c.was.cover)}" r="8"/>` : '';
    return `<g class="fr-rival fr-t-${tone || 'muted'}">${ghost}<circle class="fr-dotm${c.was ? '' : ' fr-new'}" cx="${x}" cy="${y}" r="${rr}"/>
      <text class="fr-ml fr-ml-num" x="${x}" y="${y + 5}" text-anchor="middle">${i + 1}</text>
      <text class="fr-ml fr-ml-long" x="${below ? x : right ? x - rr - 8 : x + rr + 8}" y="${below ? y + rr + 18 : y + 5}" text-anchor="${below ? 'middle' : right ? 'end' : 'start'}">${E(c.name.split(' ').slice(0, 2).join(' '))}</text></g>`; }).join('');
  const ticks = [0, 100, 200, 300].map(p => `<text class="fr-tick" x="${X(p)}" y="${H - 30}" text-anchor="middle">$${p}</text><line class="fr-grid" x1="${X(p)}" y1="40" x2="${X(p)}" y2="${H - 56}"/>`).join('');
  return `<article class="fr-panel" data-fr-reveal aria-labelledby="frMapH"><h3 class="fr-h3" id="frMapH">Positioning map</h3>
   <p class="fr-p">Every center placed by two questions: <b>what families pay a week</b> (left to right) and <b>how much of the day and the year it covers</b> (bottom to top). Dot size is seats. Faded rings and dashed trails show where each one stood twelve months ago; a dashed dot is not open yet.</p>
   <div class="fr-map"><svg viewBox="0 0 ${Wd} ${H}" role="img" aria-labelledby="frMapT"><title id="frMapT">Positioning map of five invented local centers and Futures Learning Center</title>
    <rect class="fr-plot" x="64" y="40" width="${Wd - 104}" height="${H - 96}" rx="10"/>${ticks}
    <line class="fr-axis" x1="${X(170)}" y1="40" x2="${X(170)}" y2="${H - 56}"/><line class="fr-axis" x1="64" y1="${Y(.5)}" x2="${Wd - 40}" y2="${Y(.5)}"/>
    <text class="fr-q" x="${Wd - 52}" y="62" text-anchor="end">Full day, higher price</text><text class="fr-q" x="76" y="62">Full day, lower price</text><text class="fr-q" x="76" y="${H - 68}">Part day or school year</text>
    ${dots}
    <g class="fr-you"><circle class="fr-you-ring" cx="${X(you.price)}" cy="${Y(you.cover)}" r="14"/><circle class="fr-you-core" cx="${X(you.price)}" cy="${Y(you.cover)}" r="6"/>
     <text class="fr-you-t" x="${X(you.price) - 22}" y="${Y(you.cover) + 6}" text-anchor="end">You are here</text></g>
    <text class="fr-ax-t" x="${Wd - 40}" y="${H - 8}" text-anchor="end">Weekly price →</text>
    <text class="fr-ax-t" x="18" y="${H / 2}" transform="rotate(-90 18 ${H / 2})" text-anchor="middle">Day and year covered →</text></svg></div>
   <ol class="fr-map-key">${RIVALS.map((c, i) => `<li><b>${i + 1}</b> ${E(c.name)}</li>`).join('')}</ol>
   <div class="fr-cond fr-c-down"><p class="fr-lbl">What this map is telling you</p><p>You sit nearly alone in the middle: full days at a middle price ($${you.price} a week on average, your sample rates). Every trail moved the same way this year, toward you. Only the chain is big enough to take a whole age group.</p></div></article>`;
}
function sizeCheck(){
  const you = seats(), rows = [...RIVALS.map(c => [c.name, c.seats, false]), ['Futures Learning Center (you)', you, true]].sort((a, b) => b[1] - a[1]), max = Math.max(...rows.map(r => r[1]));
  return `<article class="fr-panel" data-fr-reveal aria-labelledby="frSizeH"><h3 class="fr-h3" id="frSizeH">Size reality check: licensed seats</h3>
   <p class="fr-p">Bars use a square-root scale so you can still see yourself. The multipliers are the honest gap.</p>
   <ul class="fr-sizes">${rows.map(([n, v, me]) => { const w = Math.max(3, Math.sqrt(v) / Math.sqrt(max) * 100).toFixed(1);
     return `<li class="${me ? 'me' : ''}"><span class="fr-sz-n">${E(n)}</span><span class="fr-track"><i data-w="${w}" style="width:${w}%"></i></span><span class="fr-sz-v"><b>${v}</b> seats</span><span class="fr-sz-x">${me ? 'you' : (v / you).toFixed(1) + '× you'}</span></li>`; }).join('')}</ul>
   <div class="fr-cond fr-c-why"><p class="fr-lbl">So</p><p>You are the smallest center on the board. No move assumes you win on size. Every move assumes you win on being known: by name, by the daily report, and by a curriculum families can see.</p></div></article>`;
}
function rivalCards(){
  return `<div class="fr-rivals">${RIVALS.map((c, i) => { const [tone, lab] = SEVL[c.sev];
    return `<article class="fr-rival-c fr-t-${tone || 'muted'}" data-fr-reveal aria-labelledby="frRv${i}"><div class="fr-rh"><span class="fr-ix" aria-hidden="true">${i + 1}</span><div><h3 class="fr-h3" id="frRv${i}">${E(c.name)}</h3><p class="mini">${E(c.type)}, ${c.seats} seats. <b>Invented for the demo.</b></p></div><span class="chip ${tone}">${lab}</span></div>
     <div class="fr-how"><p class="fr-lbl">How they take a family from you</p><p>${E(c.how)}</p></div>
     <div class="fr-two"><div class="fr-wep"><p class="fr-lbl">Their weapon</p><p>${E(c.weapon)}</p></div><div class="fr-cnt"><p class="fr-lbl">Your counter</p><p>${E(c.counter)}</p></div></div>
     <p class="fr-lbl fr-weak-l">Their weakness, for the tour</p><ul class="fr-tags">${c.weak.map(w => `<li>${E(w)}</li>`).join('')}</ul>
     <p class="fr-ans">Answered by <button type="button" data-fr-move="${c.move}">Move ${c.move} <span aria-hidden="true">↓</span></button></p></article>`; }).join('')}</div>`;
}
function moves(d){
  const today = d.today, wd = n => DM.weekdayOffset(today, n), dir = directorName(d.staff), lead = leadName(d.staff), it = d.ex.items;
  const fix = (x, n) => x ? [n, `Clear ${x.ref}: ${x.title.replace(/\s*\(log it\)/i, '')}`, 'Licensing', `${x.late > 0 ? 'Do it today' : `Do it before ${fmtD(x.due)}`}, then log it so the binder has proof.`, x.late > 0 ? 'Not started' : 'Not started', x.owner.name, x.late > 0 ? today : x.due]
    : [n, 'Keep the licensing list clear', 'Licensing', 'Walk the list every Monday; log each item the day it is done.', 'In flight', dir, wd(5)];
  const w = waiting();
  const P = [
    [1, 'Hold what you have', 'Next 30 days', 'Losing an enrolled family costs more than winning a new one earns.', 'lumi', [
      [1, 'Give every waiting family a real date', 'Pocket Garden', w ? `Call the ${plural(w, 'family', 'families')} on the waitlist or mid-application this week with a start date or an honest no.` : 'Nobody is waiting today; set the rule for the next family: a date or an honest no within two days.', 'In flight', dir, wd(4)],
      fix(it[0], 2), fix(it[1], 3)]],
    [2, 'Take ground before January', 'This quarter', 'The chain opens in January. This is the window where a small center can still lock families in.', 'gold', [
      [4, 'Lock January re-enrollment early', 'Maple Lantern', 'Send current families a re-enrollment form in November with this year’s rate held.', 'Not started', dir, wd(28)],
      [5, 'Partner with Cedar Hollow Chapel', 'Cedar Hollow', 'Offer their four-year-olds a full-day path into the Pre-K room.', 'Not started', dir, wd(35)],
      [6, 'Enroll subsidy families on purpose', 'Northside', 'List two seats on the state subsidy finder, after the Cash tab shows the float you can carry.', 'In flight', dir, wd(16)]]],
    [3, 'Build the position', 'Next 12 months', 'Two structural moves that make you the center families recommend.', 'zuri', [
      [7, 'Make the daily report the tour', 'Larkspur', 'Show a consented sample family report on every tour instead of the building.', 'In flight', lead, wd(17)],
      [8, 'Decide the second Pre-K room', 'Every rival', 'Run the float on the Cash tab with the new room, then commit either way.', 'Not started', dir, wd(16)],
      [9, 'Ask every family for one review', 'Pocket Garden', 'A review card goes home in the November welcome pack.', 'Not started', lead, wd(38)]]]];
  const all = P.flatMap(p => p[5]), flight = all.filter(m => m[4] === 'In flight').length;
  return `<section id="frMoves" tabindex="-1" class="fr-moves" aria-labelledby="frMovesH"><div class="fr-sec-h" data-fr-reveal><span class="fr-n fr-n4" aria-hidden="true">4</span><div><h2 class="fr-h2" id="frMovesH">The plan: nine moves in three phases</h2>
   <p class="fr-p"><b data-count="${flight}">${flight}</b> in flight, <b data-count="${all.length - flight}">${all.length - flight}</b> not started. Moves 2 and 3 come straight from the exposure register, so they change when the register does.</p></div></div>
   ${P.map(([n, t, when, why, tone, ms]) => `<div class="fr-phase fr-t-${tone}" data-fr-reveal><span class="fr-pn">Phase ${n}</span><h3 class="fr-h3">${E(t)}</h3><span class="chip">${E(when)}</span><p class="mini">${E(why)}</p></div>
    <div class="fr-mgrid">${ms.map(([i, h, cn, fs, st, o, due]) => `<article class="fr-move fr-t-${tone}" id="frMove-${i}" tabindex="-1" data-fr-reveal aria-labelledby="frMvH${i}">
     <div class="fr-mh"><span class="fr-mi" aria-hidden="true">${i}</span><div><h4 class="fr-h4" id="frMvH${i}"><span class="sr-only">Move ${i}: </span>${E(h)}</h4><p class="mini">Counters <span class="chip">${E(cn)}</span></p></div></div>
     <div class="fr-first"><p class="fr-lbl">First step</p><p>${E(fs)}</p></div>
     <div class="fr-mf"><span class="chip ${st === 'In flight' ? 'ok' : 'warn'}">${st}</span><span class="small">${E(o)}</span><span class="small fr-due${due <= today ? ' late' : ''}">Due ${E(fmtD(due))}</span></div></article>`).join('')}</div>`).join('')}</section>`;
}
function warView(c){
  const d = data();
  return `<div class="fr" id="frRoot">
   <div class="fr-head" data-fr-reveal><p class="fr-kick">Licensing readiness and local market</p><h2 class="fr-title">War Room</h2>
    <p class="fr-asof">Licensing list as of ${E(fmtDay(d.today))}. Market scan invented for the demo. ${SAMPLE}</p></div>
   ${provStrip({hub:3, mod:1, inv:2}, 'The level and the register come from this center’s sample licensing list, staff files and care plans. Every competitor is <b>invented for the demo</b>; their place on the map is a judgement, not a measurement: read the ordering, never the coordinates.')}
   ${rail()}${levelCard(d)}${changes(d)}
   <div class="fr-sec-h" id="frLandscape" tabindex="-1" data-fr-reveal><span class="fr-n fr-n2" aria-hidden="true">2</span><div><h2 class="fr-h2">The landscape: where everyone stands</h2><p class="fr-p">Five nearby programs, all invented for the demo.</p></div></div>
   <div class="fr-g53">${positionMap(d)}${sizeCheck()}</div>
   <div class="fr-sec-h" id="frRivals" tabindex="-1" data-fr-reveal><span class="fr-n fr-n3" aria-hidden="true">3</span><div><h2 class="fr-h2">Who can take a family from you, and how</h2>
    <p class="fr-p fr-legend"><span class="fr-key fr-key-w">Their weapon</span><span class="fr-key fr-key-c">Your counter</span><span class="fr-key fr-key-k">Their weakness</span></p></div></div>
   ${rivalCards()}${moves(d)}
   ${sourcesFooter([['Licensing list (What’s due)', 'hub', 'Sample items in this demo center; resets with the demo.'], ['Staff files and care plans', 'hub', 'Background checks and family-reported care plans, sample.'],
     ['Competitors, permits, prices, seats', 'inv', 'Invented for the demo. No real program is named.'], ['Map positions', 'mod', 'A judgement from the invented listings.'], ['Market feed', 'nc', 'No live market data is connected.']])}</div>`;
}

// ---------------------------------------------------------------- Exposure register
function exposureView(c){
  const d = data(), it = d.ex.items, crit = it.filter(x => x.sev === 'critical'), none = it.filter(x => x.evidence === 'none').length, inc = it.filter(x => x.evidence === 'incomplete').length;
  const oldest = it.reduce((m, x) => Math.max(m, x.late), 0), doc = d.ex.documented;
  const tile = (n, label, sub, tone, count) => `<div class="fr-fig fr-t-${tone}"><b class="fr-big"${count ? ` data-count="${n}"` : ''}>${n}</b><p><b>${label}</b></p><p class="mini">${sub}</p></div>`;
  const steps = it.map(x => [x.late > 0 ? `${x.ref}: ${x.title.replace(/\s*\(log it\)/i, '')}, today` : `${x.ref}: ${x.title.replace(/\s*\(log it\)/i, '')}, before ${fmtD(x.due)}`, x.owner.name, x.late > 0 ? d.today : x.due, x])
    .concat([['Give every recurring item a named owner and a monthly Hub reminder, so this list stops growing back', directorName(d.staff), DM.weekdayOffset(d.today, 15), null]]);
  return `<div class="fr" id="frRoot">
   <div class="fr-head" data-fr-reveal><p class="fr-kick">Licensing and risk</p><h2 class="fr-title">Exposure register</h2><p class="fr-asof">Worked out from the licensing list on ${E(fmtDay(d.today))}. ${SAMPLE}</p></div>
   <section class="fr-panel fr-pulse" data-fr-reveal><p class="fr-lead">The licensing checklist tells you what the rules are. It does not tell you what is unresolved. <b>This is the register of open exposure:</b> the logs, checks and files an inspector would ask for, and whether you can prove your side of each one.</p>
    <div class="fr-figs">${tile(it.length, 'Open items', 'Every one is an errand somebody has not run.', 'warn', true)}${tile(crit.length, 'Critical', 'Would be written up on a visit today.', crit.length ? 'bad' : 'ok', true)}
     ${tile(oldest ? oldest + 'd' : 'None', 'Oldest past due', oldest ? 'Days since the oldest item was due.' : 'Nothing is past due.', oldest ? 'bad' : 'ok', false)}${tile(0, 'Owners on file', 'No item has a named owner yet. The owners below are inferred from each item’s area.', 'bad', false)}</div></section>
   ${provStrip({hub:3, nc:1}, 'Items come from the demo’s What’s due list, staff background checks and care plans. Evidence status is worked out from the dates; the demo does not hold the binder pages themselves.')}
   <div class="fr-sec-h" data-fr-reveal><span class="fr-n fr-n1" aria-hidden="true">1</span><div><h2 class="fr-h2">None of these are hard. All of them are dated.</h2></div></div>
   <div class="fr-ev">
    <div class="fr-evc fr-t-bad" data-fr-reveal><b class="fr-big" data-count="${none}">${none}</b><p><b>No evidence on file</b></p><p class="mini">Past due with nothing logged. Indefensible if an inspector walks in today. Start here.</p></div>
    <div class="fr-evc fr-t-warn" data-fr-reveal><b class="fr-big" data-count="${inc}">${inc}</b><p><b>Incomplete</b></p><p class="mini">Not yet due, not yet logged. Gaps an inspector will find before you do.</p></div>
    <div class="fr-evc fr-t-ok" data-fr-reveal><b class="fr-big" data-count="${doc.n}">${doc.n}</b><p><b>Documented</b></p><p class="mini">${plural(doc.doneDues, 'logged item', 'logged items')}, ${plural(doc.cleared, 'cleared background check', 'cleared background checks')} and ${plural(doc.plans, 'care plan', 'care plans')} at the front desk. Keep them that way.</p></div></div>
   <div class="fr-sec-h" data-fr-reveal><span class="fr-n fr-n2" aria-hidden="true">2</span><div><h2 class="fr-h2">Open items</h2><p class="fr-p">Ordered by severity, then by due date.</p></div></div>
   ${it.length ? `<div class="fr-reg" data-fr-reveal><table><caption class="sr-only">Open exposure items</caption><thead><tr><th scope="col">Item</th><th scope="col">Kind</th><th scope="col">Detail</th><th scope="col">Owner and due</th><th scope="col">Evidence</th><th scope="col"><span class="sr-only">Action</span></th></tr></thead><tbody>
    ${it.map(x => `<tr class="fr-sev-${x.sev}${x.late > 0 ? ' fr-od' : ''}"><th scope="row"><b>${x.ref}</b><span class="fr-sevl">${SEV[x.sev].label}</span></th><td><b>${E(x.kind)}</b><span class="mini">${E(x.subject || x.area)}</span></td><td>${E(x.title)}<span class="mini">${E(x.detail)}</span></td>
     <td><b>${E(x.owner.name)}</b><span class="mini">inferred, due ${E(fmtD(x.due))}</span><span class="fr-ns">${x.status}</span></td><td><span class="fr-evd fr-evd-${x.evidence}"><i aria-hidden="true"></i>${E(x.proof)}</span></td>
     <td>${x.dueId ? `<button type="button" class="btn soft ffd-mini" data-dm="duedone" data-id="${E(x.dueId)}">Log it</button>` : `<button type="button" class="btn soft ffd-mini" data-ptab="staff">Staff file</button>`}</td></tr>`).join('')}</tbody></table></div>`
     : '<div class="fr-panel" data-fr-reveal><p class="fr-lead">Nothing is open. Every item on the licensing list is logged.</p></div>'}
   <p class="fr-p fr-after" data-fr-reveal>${crit.length ? `${crit.map(x => x.title.replace(/\s*\(log it\)/i, '')).join(' and ')} ${crit.length === 1 ? 'does' : 'do'} not need money or a hire. ${crit.length === 1 ? 'It needs' : 'They need'} somebody named and a time on the calendar. That is what makes ${crit.length === 1 ? 'it' : 'them'} dangerous.` : 'Nothing is past due. The register stays useful by being boring.'} “Log it” marks the item done on the Dashboard’s What’s due list too, and the War Room level follows.</p>
   <div class="fr-sec-h" data-fr-reveal><span class="fr-n fr-n3" aria-hidden="true">3</span><div><h2 class="fr-h2">What you do about it</h2><p class="fr-p">${plural(steps.length, 'step', 'steps')}, ending in the fix that stops this list growing back.</p></div></div>
   <ol class="fr-steps">${steps.map(([t, o, due], i) => `<li data-fr-reveal><span class="fr-si" aria-hidden="true">${i + 1}</span><span class="fr-st">${E(t)}</span><span class="small">${E(o)}</span><span class="small fr-due${due <= d.today ? ' late' : ''}">${E(fmtD(due))}</span></li>`).join('')}</ol>
   ${sourcesFooter([['What’s due list', 'hub', 'Sample items in this demo center.'], ['Staff background checks', 'hub', 'Sample staff files.'], ['Care plans', 'hub', 'Family-reported, at the front desk; no medical records in the Hub.'], ['Owners', 'mod', 'Inferred from each item’s area; not stored yet.'], ['Inspection binder', 'nc', 'Binder pages are not in the demo.']])}</div>`;
}

// ---------------------------------------------------------------- Tour and meeting briefs
const BS = {sel:null, ticks:{}};
const RUNS = {
  twos:[['5', 'Start in the Twos Room during free play', 'Let them see a calm room in use, not an empty one.'], ['10', 'The day for a two-year-old', 'Arrival, outside, lunch, rest and diapering or potty routines, on the schedule card.'],
    ['10', 'Show a sample family report on the tablet', 'The report is what they will get every afternoon.'], ['10', 'Seats and dates, honestly', 'Give the real seat picture for the Twos Room.'], ['5', 'Next step', 'Leave with an application or a time to talk again.']],
  demo:[['5', 'Start in the classroom during the learning loop', 'Let them see Watch, Talk, Do happening, not the empty building.'], ['10', 'Show a sample family report on the tablet', 'The report is the curriculum they will see every day.'],
    ['10', 'Walk the day: arrival, outside, lunch, rest', 'Use the schedule card; let the child try a learning zone.'], ['10', 'Seats and dates, honestly', 'Give the real seat picture, even if the answer is a waitlist.'], ['5', 'Application and next step', 'Leave with a form or a follow-up time.']],
  prek:[['10', 'Pre-K Room at free choice', 'Point at work on the walls a child like theirs could do.'], ['10', 'The year ahead: kindergarten readiness', 'Show where a child starts and ends the Pre-K year on Learning Steps.'],
    ['10', 'Hours and the day', 'Be exact about opening and closing times.'], ['10', 'Seats and next step', 'The real seat picture, and a date for the next conversation.']]};
function meetings(){
  return Object.entries(DM.all('apps')).filter(([, x]) => x.stage === 'tour' || x.stage === 'application')
    .map(([id, x]) => { const t = String(x.tour || '').replace('T', ' ').split(' '); return {id, x, kind:x.stage === 'tour' ? 'tour' : 'meeting', date:t[0] || '', time:t[1] || ''}; })
    .sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'tour' ? -1 : 1) || String(a.date + a.time).localeCompare(b.date + b.time));
}
const hm = (t, add) => { const [h, m] = String(t || '10:00').split(':').map(Number), mins = h * 60 + (m || 0) + (add || 0), H = Math.floor(mins / 60), M = mins % 60;
  return `${((H + 11) % 12) + 1}:${String(M).padStart(2, '0')} ${H < 12 ? 'am' : 'pm'}`; };
function briefFor(m){
  const x = m.x, room = DM.get('rooms', x.room) || {}, rid = x.room in RUNS ? x.room : 'demo', rate = rates()[x.room] || 225;
  const first = String(x.child).split(' ')[0], age = parseInt(x.age, 10) || '', fam = `The ${String(x.child).split(' ').slice(1).join(' ') || ''} family`.replace('  ', ' ');
  const enrolled = Object.values(DM.all('kids')).filter(k => k.room === x.room).length, cap = room.capacity || 10, open = Math.max(0, cap - enrolled);
  const rival = rid === 'prek' ? RIVALS[4] : RIVALS[1];
  const tour = m.kind === 'tour', ratio = room.ratio || 10, run = (RUNS[rid] || RUNS.demo).map(r => r.slice());
  if (!tour) { run.splice(0, run.length, ['10', 'Welcome and the room', `Meet in the ${room.name || 'classroom'}; introduce the lead teacher.`], ['15', 'Walk the application together', 'Start date, hours, who picks up, care plan if any (kept at the front desk).'],
    ['10', 'Rates and how paying works', `Weekly tuition (sample $${rate}), autopay or recorded payment, subsidy if they qualify.`], ['5', 'Decide the start', 'Leave with a start date or a clear next step.']); }
  return {
    when:m.date ? `${fmtDay(m.date)}, ${hm(m.time)} to ${hm(m.time, run.reduce((t, r) => t + +r[0], 0))}` : 'Not scheduled yet',
    where:tour ? `Front door, then the ${room.name || 'classroom'}` : `${room.name || 'The classroom'}, then the office`,
    title:tour ? `${first}’s family tour, age ${age}` : `${first}’s enrollment meeting, age ${age}`,
    goal:tour ? `Leave them able to picture ${first}’s Tuesday here, and with a real answer about a seat.` : `Turn the application into a start date ${first}’s family can plan around.`,
    leave:tour ? (open ? `A completed application and a start date in the ${room.name || 'room'} (${plural(open, 'seat', 'seats')} open today).` : `An application and an honest waitlist place: the ${room.name || 'room'} is full today.`) : `A signed enrollment and a first day${x.start ? ` (they hoped for ${fmtD(x.start)})` : ''}.`,
    watch:`Families who tour the ${room.name || 'room'} also look at ${rival.name} (invented). Price may come up: do not discount, show the day.${x.notes ? ` From the inquiry: “${x.notes}”` : ''}`,
    fam, child:`${x.child}, ${x.age}`, room:room.name || '', guardian:x.guardian,
    source:x.link ? 'Enrollment link' : 'Not recorded', lang:x.lang || 'Not asked yet',
    facts:[[String(age), `${first}’s age`], [room.name || '', 'Room wanted'], [`$${rate}`, 'Weekly rate (sample)'], [open ? String(open) : 'Full', 'Seats open today'], [x.start ? fmtD(x.start) : 'Open', 'Hoped-for start']],
    note:x.notes || 'No notes from the inquiry yet.',
    tags:[x.link ? 'Enrollment link' : 'Source not recorded', x.lang ? x.lang : 'Language not asked', 'Tuition, sample rate', tour ? 'Tour booked' : 'Application in'],
    run,
    asks:[`What would make ${first}’s first week easier?`, 'Who picks up on the days you work late?', 'Which language do you speak at home? (Our Spanish family materials are drafts.)', tour ? 'What did you like at the other places you toured?' : 'Is there a care plan we should have at the front desk?'],
    they:[[`“Why do you cost more than ${rival.name.split(' ')[0]} ${rival.name.split(' ')[1]}?”`, 'A named curriculum families can see every day, two adults in the room most of the day, and a report every afternoon. Show the report, then stop talking.'],
      ['“Do you have a seat now?”', open ? `Yes: ${plural(open, 'seat is', 'seats are')} open in the ${room.name || 'room'} today. Be exact about the start date.` : `Not today: the ${room.name || 'room'} is full (${enrolled} of ${cap}). Give the waitlist place and when you expect a seat.`],
      ['“What is your ratio?”', `The state limit for this room in the demo is 1 to ${ratio}. Say what it is in the room right now, from the Dashboard.`]]};
}
function briefsView(c){
  const ms = meetings();
  if (!ms.length) return `<div class="fr" id="frRoot"><div class="fr-head" data-fr-reveal><p class="fr-kick">Meeting briefs</p><h2 class="fr-title">Tour and meeting briefs</h2></div>
   <div class="fr-panel" data-fr-reveal><p class="fr-lead">No tours are booked and no applications are waiting.</p><p class="fr-p">Book a tour on the Enrollment desk and its brief appears here.</p><div class="ffd-row"><button type="button" class="btn navy" data-ptab="enroll">Open the enrollment desk</button></div></div></div>`;
  if (!ms.some(m => m.id === BS.sel)) BS.sel = ms[0].id;
  const m = ms.find(z => z.id === BS.sel), b = briefFor(m), ticks = BS.ticks[m.id] || {}, done = b.run.filter((_, i) => ticks[i]).length, mins = b.run.reduce((t, r) => t + +r[0], 0);
  return `<div class="fr fr-brief" id="frRoot">
   <div class="fr-btabs" role="group" aria-label="Meetings">${ms.map(z => `<button type="button" data-fr-brief="${E(z.id)}" aria-pressed="${z.id === m.id}">${z.date ? E(fmtD(z.date)) + ': ' : ''}${E(String(z.x.child).split(' ')[0])}, ${z.kind === 'tour' ? 'tour' : 'enrollment'}</button>`).join('')}</div>
   <div class="fr-bhead" data-fr-reveal><p class="fr-dateline"><span>${E(b.when)}</span><i aria-hidden="true"></i><span>${E(b.where)}</span></p><h2 class="fr-title">${E(b.title)}</h2><p class="fr-goal">${E(b.goal)}</p></div>
   <div class="fr-g2" data-fr-reveal><section class="fr-lw fr-t-gold"><p class="fr-lbl">Leave with</p><p>${E(b.leave)}</p></section><section class="fr-lw fr-t-bad"><p class="fr-lbl">Watch for</p><p>${E(b.watch)}</p></section></div>
   <div class="fr-sec-h" data-fr-reveal><div><h2 class="fr-h2">Who is in the room</h2><p class="fr-p">From the enrollment desk. ${SAMPLE}</p></div></div>
   <section class="fr-panel fr-fam" data-fr-reveal><div class="fr-fh"><span class="fr-av" aria-hidden="true">${E((String(m.x.child).split(' ')[1] || 'F').charAt(0))}</span><div><h3 class="fr-h3">${E(b.fam)}</h3><p class="mini">${E(b.child)}, ${E(b.guardian)}</p></div>${srcChip('hub')}</div>
    <dl class="fr-facts">${b.facts.map(([v, l]) => `<div><dt>${E(l)}</dt><dd>${E(v)}</dd></div>`).join('')}</dl>
    <p>${E(b.note)}</p><ul class="fr-tags fr-tags-plain">${b.tags.map(t => `<li>${E(t)}</li>`).join('')}</ul></section>
   <div class="fr-g2 fr-g2-top">
    <section data-fr-reveal aria-labelledby="frRunH"><div class="fr-run-h"><h2 class="fr-h2" id="frRunH">Run of the ${m.kind === 'tour' ? 'tour' : 'meeting'}</h2><p class="small" id="frRunCt" role="status" aria-live="polite"><b id="frRunN">${done}</b> of ${b.run.length} covered, ${mins} min planned</p></div>
     <div class="fr-prog" aria-hidden="true"><i id="frRunBar" style="width:${(done / b.run.length * 100).toFixed(0)}%"></i></div>
     <ul class="fr-run">${b.run.map(([t, h, s], i) => `<li><input type="checkbox" id="frRun${i}" data-fr-run="${i}" data-fr-mt="${E(m.id)}" ${ticks[i] ? 'checked' : ''}><label for="frRun${i}"><span class="fr-tm">${t} min</span><span><b>${E(h)}</b><span class="mini">${E(s)}</span></span></label></li>`).join('')}</ul></section>
    <section data-fr-reveal><h2 class="fr-h2">Ask these</h2><ol class="fr-asks">${b.asks.map(a => `<li>${E(a)}</li>`).join('')}</ol>
     <h2 class="fr-h2 fr-mt">They will ask</h2>${b.they.map(([q, a]) => `<div class="fr-they"><p><b>${E(q)}</b></p><p>${E(a)}</p></div>`).join('')}</section></div>
   <p class="mini fr-after">Ticks stay on this page until you reset the demo or reload. The family, child and dates are sample data from the enrollment desk; competitors are invented.</p></div>`;
}
function briefLink(id, x){
  if (!x || !(x.stage === 'tour' || x.stage === 'application')) return '';
  return `<button type="button" class="btn soft ffd-mini fr-brief-link" data-ptab="briefs" data-fr-brief="${E(id)}">${x.stage === 'tour' ? 'Open the tour brief' : 'Open the meeting brief'}</button>`;
}

// ---------------------------------------------------------------- Cash and subsidy float (directors and the owner only)
function cashAllowed(c){ if (c.role !== 'director') return false; const s = DM.get('staff', c.me || ses().id); return !!(s && DM.isDirector(s)); }
function cashView(c){
  if (!cashAllowed(c)) return `<div class="card" role="note"><h3>Directors and the owner only</h3><p class="small">Money stays with directors and the owner.</p></div>`;
  const f = floatModel({kids:DM.all('kids'), accounts:DM.all('accounts'), rates:rates(), staff:DM.all('staff')}), max = Math.max(...f.scenarios.map(s => s.plus), 1);
  const tone = {optimistic:'ok', realistic:'warn', conservative:'bad'};
  const r = rates(), rp = r.prek || 0;
  return `<div class="fr fr-cash" id="frRoot">
   <div class="fr-head" data-fr-reveal><p class="fr-kick">Money, owner only</p><h2 class="fr-title fr-sentence">Pay goes out every Friday.<br>The state pays you in six weeks.</h2>
    <p class="fr-lead">Teachers are paid weekly. Private tuition arrives before the care, but subsidy and meal money arrive a month or more after it. Every subsidy family you add widens that gap before it pays for itself, which is why a full center can still feel short of cash.</p>
    <p class="fr-asof">One center, modelled from the demo’s rates, subsidy accounts and staff list. Every dollar here is a model, not your books. ${SAMPLE}</p></div>
   ${provStrip({hub:3, mod:5, nc:2}, 'Children, rates and subsidy accounts are the demo’s billing sample. Pay rates, rent, food and the meal program are modelled. Payroll and the state’s actual days-to-pay are not connected.')}
   <div class="fr-g2 fr-gap">
    <section class="fr-io fr-t-ok" data-fr-reveal><p class="fr-lbl">Out, every week</p><b class="fr-huge" data-count="${f.weeklyOut}" data-pre="$">${money(f.weeklyOut)}</b>
     <p class="small">${plural(f.team, 'staff member', 'staff members')} on modelled hourly pay (${money(f.payroll)}), plus rent, food and supplies (${money(f.fixed)}).</p>${srcChip('mod')}</section>
    <section class="fr-io fr-t-bad" data-fr-reveal><p class="fr-lbl">Back, when the state pays</p><b class="fr-huge">30 to 60 days</b>
     <p class="small">Subsidy is paid after attendance is filed; the meal program after the monthly claim. ${money(f.lagged)} a week arrives this way.</p>${srcChip('nc')} <span class="mini">actual days-to-pay unknown</span></section></div>
   <div class="fr-flow" aria-hidden="true"><svg viewBox="0 0 1000 56" preserveAspectRatio="none"><path class="fr-flow-base" d="M8 14 C 300 14, 700 44, 992 44"/><path class="fr-flow-dash" d="M8 14 C 300 14, 700 44, 992 44"/></svg></div>
   <section class="fr-panel" data-fr-reveal aria-labelledby="frFloatH"><div class="ffd-row"><h3 class="fr-h3" id="frFloatH">How much cash has to sit still?</h3>${srcChip('mod')}</div>
    <p class="fr-p">The float is money already earned but not yet paid by the state: ${money(f.lagged)} a week (subsidy ${money(f.subsidy)} for ${plural(f.subKids, 'child', 'children')}, meals ${money(f.cacfp)}) times the days it takes to arrive. It grows with every subsidy seat, so it is the real ceiling on the second Pre-K room.</p>
    <div class="fr-scen">${f.scenarios.map(s => `<article class="fr-sc fr-t-${tone[s.key]}"><p><b>${s.label}</b></p><p class="mini">Paid in ${s.days} days</p><b class="fr-big" data-count="${s.float}" data-pre="$">${money(s.float)}</b>
      <span class="fr-track"><i data-w="${(s.float / max * 100).toFixed(1)}" style="width:${(s.float / max * 100).toFixed(1)}%"></i></span><p class="small">With ${MODEL.addFamilies} more subsidy families: <b>${money(s.plus)}</b></p></article>`).join('')}</div>
    <div class="fr-unk" data-fr-reveal><p class="fr-lbl">Headroom</p><b class="fr-huge">Unknown</b><span class="fr-src fr-src-nc"><i aria-hidden="true"></i>Never answered</span>
     <p>Nobody has written down how much cash the center holds against that float. It is the first thing a bank asks before a loan for the second room, and the number that decides whether the waitlist is an opportunity or a risk.</p></div></section>
   <div class="fr-sec-h" data-fr-reveal><div><h2 class="fr-h2">Where the money actually comes from</h2><p class="fr-p">Three streams, three clocks.</p></div>${srcChip('mod')}</div>
   <div class="fr-reg fr-streams" data-fr-reveal><table><caption class="sr-only">Income streams, modelled</caption><thead><tr><th scope="col">Stream</th><th scope="col" class="n">Children</th><th scope="col" class="n">A week</th><th scope="col" class="n">A month</th><th scope="col">Paid</th><th scope="col" class="n">Share</th></tr></thead><tbody>
    ${f.streams.map(s => `<tr><th scope="row"><b>${E(s.name)}</b><span class="mini">${E(s.when)}</span></th><td class="n" data-l="Children">${s.children}</td><td class="n" data-l="A week">${money(s.weekly)}</td><td class="n" data-l="A month"><b>${money(s.monthly)}</b></td><td data-l="Paid"><span class="fr-evd fr-evd-${s.lagDays ? 'incomplete' : 'ok'}"><i aria-hidden="true"></i>${E(s.lag)}</span></td><td class="n" data-l="Share"><b>${s.share}%</b></td></tr>`).join('')}</tbody></table></div>
   <p class="fr-p fr-after" data-fr-reveal>Every rate on this screen is a sample: Twos $${r.twos} a week, Threes $${r.demo}, Pre-K $${rp}. <b>The $${rp} a week Pre-K rate is not confirmed.</b> The subsidy share ($${MODEL.subsidyWeek} a week a child) and meal money ($${MODEL.cacfpWeek} a week a child) are modelled.</p>
   ${sourcesFooter([['Children and rooms', 'hub', 'Demo sample.'], ['Weekly rates and subsidy accounts', 'hub', 'Demo billing sample; not confirmed.'], ['Hourly pay, rent, food, meal program', 'mod', 'Modelled for the demo.'], ['Payroll', 'nc', 'No payroll feed.'], ['State payment dates', 'nc', 'Days-to-pay never measured.']])}</div>`;
}

// ---------------------------------------------------------------- registration (demo-portal.js calls these)
const TABS = {war:['war', 'War Room'], exposure:['exposure', 'Exposure'], briefs:['briefs', 'Briefs'], cash:['cash', 'Cash']};
function addTabs(out, role, may){
  const at = (key, tab) => { const i = out.findIndex(t => t && t[0] === key); if (i >= 0) out.splice(i + 1, 0, tab); else out.push(tab); };
  if (role === 'director') { at('dash', TABS.exposure); at('dash', TABS.war); }
  if (role === 'director' || (may && may('enroll'))) at('enroll', TABS.briefs);
  if (role === 'director' && cashAllowed({role, me:ses().id})) at('billing', TABS.cash);
}
const has = tab => tab in TABS;
function view(tab, c){
  if (!has(tab)) return null;
  if ((tab === 'war' || tab === 'exposure' || tab === 'cash') && c.role !== 'director') return null;
  if (tab === 'briefs' && c.role !== 'director' && !DM.can(c.me, 'enroll')) return null;
  try {
    const html = {war:warView, exposure:exposureView, briefs:briefsView, cash:cashView}[tab](c);
    afterRender(tab + (tab === 'briefs' ? ':' + BS.sel : ''));
    return html;
  } catch (err) { console.error(err); return `<div class="card" role="alert"><h3>Something went wrong in the demo</h3><p class="small">${E(err.message)}</p><button class="btn soft" data-demo="reset">Reset demo</button></div>`; }
}

// ---------------------------------------------------------------- interactions
document.addEventListener('click', e => {
  if (!DM.enabled()) return;
  const t = e.target.closest && e.target.closest('[data-fr-move],[data-fr-jump],[data-fr-brief]'); if (!t) return;
  if (t.dataset.frBrief) { BS.sel = t.dataset.frBrief; if (!t.hasAttribute('data-ptab')) { try { W.FFPortal.rerender(); } catch (_) {} } return; }
  const id = t.dataset.frMove ? 'frMove-' + t.dataset.frMove : t.dataset.frJump, el = document.getElementById(id); if (!el) return;
  el.classList.remove('fr-pre'); el.classList.add('fr-in');
  try { el.scrollIntoView({behavior:reduced() ? 'auto' : 'smooth', block:t.dataset.frMove ? 'center' : 'start'}); } catch (_) { el.scrollIntoView(); }
  try { el.focus({preventScroll:true}); } catch (_) {}
  if (t.dataset.frMove) { el.classList.remove('fr-flash'); void el.offsetWidth; el.classList.add('fr-flash'); setTimeout(() => el.classList.remove('fr-flash'), 2200); }
}, true);
document.addEventListener('change', e => {
  const t = e.target; if (!t || !t.dataset || t.dataset.frRun == null) return;
  const mt = t.dataset.frMt, ticks = BS.ticks[mt] = BS.ticks[mt] || {}; ticks[t.dataset.frRun] = t.checked;
  const boxes = [...document.querySelectorAll('[data-fr-run]')], n = boxes.filter(b => b.checked).length;
  const nEl = document.getElementById('frRunN'), bar = document.getElementById('frRunBar'); if (nEl) nEl.textContent = n; if (bar) bar.style.width = (n / boxes.length * 100).toFixed(0) + '%';
});

Object.assign(API, {addTabs, view, has, briefLink, cashAllowed});
})();
