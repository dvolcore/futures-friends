// Futures at Home, the virtual center (N19b, hub/FUTURES_AT_HOME_VIRTUAL.md) and its subscription (N53, hub/CONSUMER_BILLING.md).
//
//   /at-home                         public: "Learn at home with Futures Friends": ask for an account (home_signup_request, no account
//                                    discovery), or, signed in, join (home_join)
//   /c/futures-at-home/home-school   the family (parent-as-teacher): getting started (child, consent, character, plan), Today (the parent
//                                    guide: the day's activities, what to gather, what to watch for, record Emerging / Developing /
//                                    Secure), progress reports, billing (plans, free trial, Stripe Checkout when it is on, cancel,
//                                    receipts). ?tab=today|reports|billing, ?kid=<id>, &report=<id> (deep links from notifications)
// The database decides everything (home_* and consumer_* functions); English + Spanish (Spanish is a DRAFT, like the rest of the portal).

const W = {
  en: {
    title: 'Futures at Home', lede: 'Learning at home with the Futures Friends, with you as your child\'s teacher.',
    pubTitle: 'Learn at home with Futures Friends', pubLede: 'For families who are not at a Futures Friends center. You are your child\'s teacher: every school day you get a short guide, things to do together away from the screen, and a few minutes of Kid Mode.',
    email: 'Your email', first: 'Your first name', ask: 'Send me a sign-in link', asked: 'Thank you. If this address can join, a sign-in link is on its way. Check your email.',
    join: 'Join Futures at Home', joined: 'Welcome to Futures at Home.',
    tabs: { start: 'Getting started', today: 'Today', reports: 'Progress reports', billing: 'Billing' },
    addChild: 'Add a child', childFirst: "Child's first name", dob: 'Date of birth', add: 'Add child', ages: 'Futures at Home is for children 2 to 5 years old.',
    noKids: 'Add your child to begin.', steps: 'What is left to do',
    stepConsent: 'Give your verified consent (Privacy & consent)', stepCharacter: 'Your child picks a friend in Kid Mode (every time they open it)',
    stepPlan: 'Choose a plan or start the free trial', stepReady: 'Ready: open Today for the parent guide',
    vpcNote: 'Because there is no center to check in person, Futures at Home asks for a stronger consent check. The online identity check is not connected yet.',
    vpcPilot: 'Pilot: sign the Kid Mode consent on the printed form (an HQ operator checks it) and give the enrollment consent by email confirmation.',
    vpcOff: 'Verified consent is not available yet. We will email you when it opens.',
    privacy: 'Privacy & consent', openKid: 'Open Kid Mode', kidAge: (m) => `Kid Mode opens at ${Math.round(m / 12)} years at Futures at Home.`,
    day: (n) => `School day ${n} of 180`, prev: 'Previous day', next: 'Next day', theme: 'This week', gather: 'What to gather', noGather: 'Nothing special: things you have at home.',
    doTogether: 'Do it together (away from the screen)', onScreen: 'Move-along in Kid Mode', watch: 'What to watch for', record: 'Record what you saw',
    level: { emerging: 'Emerging', developing: 'Developing', secure: 'Secure' },
    levelHelp: { emerging: 'Starting to show it, with a lot of help.', developing: 'Shows it sometimes, with some help.', secure: 'Shows it often, on their own.' },
    note: 'What did your child do or say?', save: 'Save', saved: 'Saved.', noContent: 'No activities are approved for this day yet. Reviewers are still checking the content.',
    checks: 'Skill checks for Kid Mode', assign: 'Add these checks to Kid Mode this week', assigned: 'Added. Your child sees them in Kid Mode.',
    notReady: 'Recording, checks and reports open once your verified consent and a plan are in place.',
    reportsT: 'Progress reports', make: 'Make a report for the last 30 days', made: 'Report ready.', none: 'No reports yet.', printR: 'Print or save as PDF',
    reportFor: (n, a, b) => `${n}: ${a} to ${b}`, stepsT: 'Learning Steps you recorded', done: (n) => `Activities done: ${n}`, checksT: 'Skill checks (your child only)',
    own: 'These numbers are about your child only. They are never compared with other children.',
    billingT: 'Your plan', plans: 'Plans', perMonth: 'a month', perYear: 'a year', trial: (d) => `Start a ${d}-day free trial (no card)`,
    subscribe: 'Subscribe', cancel: 'Cancel', cancelAsk: 'Cancel your plan? A trial ends now; a paid plan runs to the end of the period you paid for.',
    status: { trialing: 'Free trial', incomplete: 'Waiting for payment', active: 'Active', past_due: 'Payment failed: please update your card', canceled: 'Canceled', expired: 'Ended' },
    until: (d) => `until ${d}`, endsAt: (d) => `Ends ${d}`, renews: (d) => `Renews ${d}`,
    noPlans: 'Plans and prices are being set. Check back soon.', payOff: 'Online payment opens soon.', receipts: 'Receipts', noReceipts: 'No receipts yet.',
    receiptNo: 'Receipt', paid: 'Paid', failed: 'Payment failed', tax: 'Tax', taxPending: 'Not charged (tax treatment is being decided)', total: 'Total', period: 'Period',
    entitled: 'Futures at Home is open for your family.', notEntitled: 'Choose a plan or start the free trial to open Futures at Home.',
  },
  es: {
    title: 'Futures at Home', lede: 'Aprender en casa con los Futures Friends, con usted como maestro o maestra de su hijo.',
    pubTitle: 'Aprenda en casa con Futures Friends', pubLede: 'Para familias que no están en un centro Futures Friends. Usted es el maestro de su hijo: cada día escolar recibe una guía corta, cosas para hacer juntos sin pantalla y unos minutos del Modo Niños.',
    email: 'Su correo electrónico', first: 'Su nombre', ask: 'Envíenme un enlace para entrar', asked: 'Gracias. Si este correo puede inscribirse, le enviamos un enlace para entrar. Revise su correo.',
    join: 'Inscribirse en Futures at Home', joined: 'Bienvenido a Futures at Home.',
    tabs: { start: 'Primeros pasos', today: 'Hoy', reports: 'Informes de progreso', billing: 'Facturación' },
    addChild: 'Agregar un niño', childFirst: 'Nombre del niño', dob: 'Fecha de nacimiento', add: 'Agregar', ages: 'Futures at Home es para niños de 2 a 5 años.',
    noKids: 'Agregue a su hijo para empezar.', steps: 'Lo que falta',
    stepConsent: 'Dé su consentimiento verificado (Privacidad y consentimiento)', stepCharacter: 'Su hijo elige un amigo en el Modo Niños (cada vez que lo abre)',
    stepPlan: 'Elija un plan o empiece la prueba gratuita', stepReady: 'Listo: abra Hoy para ver la guía para padres',
    vpcNote: 'Como no hay un centro para verificar en persona, Futures at Home pide una verificación de consentimiento más fuerte. La verificación de identidad en línea aún no está conectada.',
    vpcPilot: 'Piloto: firme el consentimiento del Modo Niños en el formulario impreso (lo revisa un operador de la oficina central) y dé el consentimiento de inscripción con la confirmación por correo.',
    vpcOff: 'El consentimiento verificado aún no está disponible. Le avisaremos por correo cuando abra.',
    privacy: 'Privacidad y consentimiento', openKid: 'Abrir Modo Niños', kidAge: (m) => `El Modo Niños se abre a los ${Math.round(m / 12)} años en Futures at Home.`,
    day: (n) => `Día escolar ${n} de 180`, prev: 'Día anterior', next: 'Día siguiente', theme: 'Esta semana', gather: 'Qué preparar', noGather: 'Nada especial: cosas que tiene en casa.',
    doTogether: 'Para hacer juntos (sin pantalla)', onScreen: 'A moverse en el Modo Niños', watch: 'Qué observar', record: 'Anote lo que vio',
    level: { emerging: 'Emergente', developing: 'En desarrollo', secure: 'Seguro' },
    levelHelp: { emerging: 'Empieza a mostrarlo, con mucha ayuda.', developing: 'Lo muestra a veces, con algo de ayuda.', secure: 'Lo muestra seguido, por sí mismo.' },
    note: '¿Qué hizo o dijo su hijo?', save: 'Guardar', saved: 'Guardado.', noContent: 'Todavía no hay actividades aprobadas para este día. Los revisores siguen revisando el contenido.',
    checks: 'Evaluaciones para el Modo Niños', assign: 'Agregar estas evaluaciones al Modo Niños esta semana', assigned: 'Agregadas. Su hijo las ve en el Modo Niños.',
    notReady: 'Anotar, las evaluaciones y los informes se abren cuando su consentimiento verificado y un plan estén listos.',
    reportsT: 'Informes de progreso', make: 'Hacer un informe de los últimos 30 días', made: 'Informe listo.', none: 'Todavía no hay informes.', printR: 'Imprimir o guardar como PDF',
    reportFor: (n, a, b) => `${n}: del ${a} al ${b}`, stepsT: 'Pasos de aprendizaje que anotó', done: (n) => `Actividades hechas: ${n}`, checksT: 'Evaluaciones (solo su hijo)',
    own: 'Estos números son solo de su hijo. Nunca se comparan con otros niños.',
    billingT: 'Su plan', plans: 'Planes', perMonth: 'al mes', perYear: 'al año', trial: (d) => `Empezar una prueba gratuita de ${d} días (sin tarjeta)`,
    subscribe: 'Suscribirse', cancel: 'Cancelar', cancelAsk: '¿Cancelar su plan? Una prueba termina ahora; un plan pagado sigue hasta el final del período que pagó.',
    status: { trialing: 'Prueba gratuita', incomplete: 'Esperando el pago', active: 'Activo', past_due: 'El pago no se completó: actualice su tarjeta', canceled: 'Cancelado', expired: 'Terminado' },
    until: (d) => `hasta el ${d}`, endsAt: (d) => `Termina el ${d}`, renews: (d) => `Se renueva el ${d}`,
    noPlans: 'Los planes y precios se están definiendo. Vuelva pronto.', payOff: 'El pago en línea abre pronto.', receipts: 'Recibos', noReceipts: 'Todavía no hay recibos.',
    receiptNo: 'Recibo', paid: 'Pagado', failed: 'Pago no completado', tax: 'Impuesto', taxPending: 'No se cobra (se está decidiendo el tratamiento de impuestos)', total: 'Total', period: 'Período',
    entitled: 'Futures at Home está abierto para su familia.', notEntitled: 'Elija un plan o empiece la prueba gratuita para abrir Futures at Home.',
  },
};
export const HOME_WORDS = W;
export const HOME_SLUG = 'futures-at-home';
const LEVELS = ['emerging', 'developing', 'secure'];

export function money(cents, lang = 'en') {
  if (cents === null || cents === undefined) return '';
  return new Intl.NumberFormat(lang === 'es' ? 'es-US' : 'en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}
const day = (v, lang) => (v ? new Intl.DateTimeFormat(lang === 'es' ? 'es-US' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(v)) : '');

// The "what is left" list for one child (pure; tests/home-virtual-unit.test.mjs).
export function nextSteps(child, entitled) {
  const out = [];
  if (!child?.vpc?.ok) out.push('consent');
  if (!child?.character) out.push('character');
  if (!entitled) out.push('plan');
  if (!out.length) out.push('ready');
  return out;
}

// ---- public: /at-home ----------------------------------------------------------------------------------------------------
export async function viewHomeSignup(ctx) {
  const { page, esc, rpc, friendly, go, lang, signedIn } = ctx;
  const L = W[lang === 'es' ? 'es' : 'en'];
  const s = signedIn;
  page(`<div class="wrap narrow"><div class="card hs-pub" id="homeSignup"><h1>${esc(L.pubTitle)}</h1><p>${esc(L.pubLede)}</p>
    ${s ? `<button class="btn gold" type="button" id="hsJoin">${esc(L.join)}</button>`
      : `<form id="hsAsk" novalidate><label class="f"><span>${esc(L.first)}</span><input class="i" id="hsFirst" autocomplete="given-name" maxlength="60" required></label>
      <label class="f"><span>${esc(L.email)}</span><input class="i" id="hsEmail" type="email" autocomplete="email" maxlength="200" required></label>
      <button class="btn gold" type="submit">${esc(L.ask)}</button></form>`}
    <p class="msg" id="hsMsg" role="status"></p></div></div>`, L.pubTitle);
  const m = document.getElementById('hsMsg');
  document.getElementById('hsJoin')?.addEventListener('click', async () => {
    try { const r = await rpc('home_join', { p_lang: lang }); go(`/c/${r.slug}/home-school`); } catch (e) { m.className = 'msg bad'; m.textContent = friendly(e); }
  });
  document.getElementById('hsAsk')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await rpc('home_signup_request', { p_email: document.getElementById('hsEmail').value, p_first_name: document.getElementById('hsFirst').value, p_lang: lang });
      m.className = 'msg ok'; m.textContent = L.asked; e.target.hidden = true;
    } catch (err) { m.className = 'msg bad'; m.textContent = friendly(err); }
  });
}

// ---- the family's page -----------------------------------------------------------------------------------------------------
export async function viewHomeSchool(ctx) {
  const { c, shell, page, esc, rpc, friendly, go, live, lang, session } = ctx;
  const L = W[lang === 'es' ? 'es' : 'en'];
  const q = new URLSearchParams(location.search);
  const tab = ['start', 'today', 'reports', 'billing'].includes(q.get('tab')) ? q.get('tab') : (q.get('report') ? 'reports' : 'start');
  page(shell('<p class="loading">…</p>'), L.title);
  let ov;
  try { ov = await rpc('home_overview'); } catch (e) { return page(shell(`<div class="card"><p class="msg bad" role="alert">${esc(friendly(e))}</p></div>`), L.title); }
  const kids = ov.children || [];
  const cur = kids.find((k) => k.kid === q.get('kid')) || kids[0] || null;
  const href = (t, extra = {}) => `/c/${esc(c.slug)}/home-school?${new URLSearchParams({ tab: t, ...(cur ? { kid: cur.kid } : {}), ...extra })}`;
  const head = `<div class="card hs-head"><h2>${esc(L.title)}</h2><p class="muted">${esc(L.lede)}</p>
    <p id="hsEntitled" class="msg ${ov.entitled ? 'ok' : 'info'}">${esc(ov.entitled ? L.entitled : L.notEntitled)}</p>
    ${kids.length > 1 ? `<nav class="tabs" aria-label="Children">${kids.map((k) => `<a href="${href(tab).replace(/kid=[^&]*/, `kid=${encodeURIComponent(k.kid)}`)}" data-nav${cur && k.kid === cur.kid ? ' aria-current="page"' : ''}>${esc(k.first_name)}</a>`).join('')}</nav>` : ''}
    <nav class="tabs hs-tabs" aria-label="${esc(L.title)}">${Object.entries(L.tabs).map(([t, l]) => `<a href="${href(t)}" data-nav${t === tab ? ' aria-current="page"' : ''}>${esc(l)}</a>`).join('')}</nav></div>`;
  const box = (html) => page(shell(`<div class="hs" id="homeSchool">${head}${html}</div>`), L.title);

  if (tab === 'start') {
    box(`${kids.map((k) => { const st = nextSteps(k, ov.entitled); return `<section class="card hs-kid" data-kid="${esc(k.kid)}"><h3>${esc(k.first_name)}</h3>
        <p class="small muted">${esc(L.day(Math.max(1, k.day_no || 1)))}</p>
        <h4>${esc(L.steps)}</h4><ul class="hs-steps">
          <li class="${st.includes('consent') ? '' : 'done'}" id="hsStepConsent">${esc(L.stepConsent)} — <a href="/c/${esc(c.slug)}/privacy" data-nav>${esc(L.privacy)}</a>
            ${k.vpc?.ok ? '' : `<p class="small muted">${esc(L.vpcNote)} ${esc(k.vpc?.pilot_allowed ? L.vpcPilot : L.vpcOff)}</p>`}</li>
          <li class="${st.includes('character') ? '' : 'done'}">${esc(L.stepCharacter)}</li>
          <li class="${st.includes('plan') ? '' : 'done'}"><a href="${href('billing')}" data-nav>${esc(L.stepPlan)}</a></li>
          ${st.includes('ready') ? `<li class="done"><a href="${href('today')}" data-nav>${esc(L.stepReady)}</a></li>` : ''}</ul>
        <div class="cta-row">${k.ready && k.kid_mode_age_ok ? `<a class="btn gold" href="/c/${esc(c.slug)}/kid" data-nav>${esc(L.openKid)}</a>` : ''}</div>
        ${k.kid_mode_age_ok ? '' : `<p class="small muted">${esc(L.kidAge(k.kid_mode_min_age_months || 36))}</p>`}</section>`; }).join('')}
      <form class="card" id="hsAdd" novalidate><h3>${esc(L.addChild)}</h3>${kids.length ? '' : `<p>${esc(L.noKids)}</p>`}
        <div class="row two"><label class="f"><span>${esc(L.childFirst)}</span><input class="i" id="hsKidFirst" maxlength="40" required></label>
        <label class="f"><span>${esc(L.dob)}</span><input class="i" id="hsKidDob" type="date" required></label></div>
        <p class="small muted">${esc(L.ages)}</p><p class="small msg" id="hsAddMsg" role="status"></p><button class="btn navy" type="submit">${esc(L.add)}</button></form>`);
    document.getElementById('hsAdd').addEventListener('submit', async (e) => {
      e.preventDefault();
      const m = document.getElementById('hsAddMsg');
      try { const r = await rpc('home_enroll_child', { p_first_name: document.getElementById('hsKidFirst').value, p_dob: document.getElementById('hsKidDob').value, p_lang: lang });
        live(L.saved); go(`/c/${c.slug}/home-school?tab=start&kid=${encodeURIComponent(r.kid)}`); } catch (err) { m.className = 'small msg bad'; m.textContent = friendly(err); }
    });
    return;
  }

  if (tab === 'today') {
    if (!cur) return box(`<div class="card"><p>${esc(L.noKids)}</p></div>`);
    let t;
    try { t = await rpc('home_today', { p_kid: cur.kid, p_day: q.get('day') ? Number(q.get('day')) : null }); }
    catch (e) { return box(`<div class="card"><p class="msg bad" role="alert">${esc(friendly(e))}</p><a class="btn soft" href="${href('billing')}" data-nav>${esc(L.tabs.billing)}</a></div>`); }
    const es = lang === 'es';
    const txt = (a, k) => (es && a.es?.[k]) || a[k];
    const obs = new Map((t.observations || []).map((o) => [o.step_id, o]));
    box(`<section class="card hs-today" id="hsToday"><div class="hs-daynav">
        ${t.day_no > 1 ? `<a class="btn soft small" href="${href('today', { day: t.day_no - 1 })}" data-nav>${esc(L.prev)}</a>` : ''}
        <h3>${esc(L.day(t.day_no))}</h3>
        ${t.day_no < Math.min(180, t.today_no + 5) ? `<a class="btn soft small" href="${href('today', { day: t.day_no + 1 })}" data-nav>${esc(L.next)}</a>` : ''}</div>
        ${t.week_theme ? `<p class="small muted">${esc(L.theme)}: ${esc(t.week_theme)}</p>` : ''}
        ${t.activities.length ? t.activities.map((a) => `<article class="hs-act" data-id="${esc(a.id)}"><h4>${esc(a.mode === 'off_screen' ? L.doTogether : L.onScreen)}: ${esc(txt(a, 'title'))}</h4>
          <p>${esc(txt(a, 'prompt'))}</p>${(txt(a, 'steps') || []).length ? `<ol>${txt(a, 'steps').map((x) => `<li>${esc(x)}</li>`).join('')}</ol>` : ''}</article>`).join('')
          : `<p class="msg info" id="hsNoContent">${esc(L.noContent)}</p>`}
        <h4>${esc(L.gather)}</h4>${t.materials.length ? `<ul>${t.materials.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : `<p class="small muted">${esc(L.noGather)}</p>`}</section>
      <section class="card" id="hsWatch"><h3>${esc(L.watch)}</h3>${t.ready ? '' : `<p class="msg info">${esc(L.notReady)}</p>`}
        <dl class="hs-levels">${LEVELS.map((l) => `<div><dt>${esc(L.level[l])}</dt><dd>${esc(L.levelHelp[l])}</dd></div>`).join('')}</dl>
        ${t.steps.map((s) => { const o = obs.get(s.id); return `<form class="hs-obs" data-step="${esc(s.id)}" novalidate><p><b>${esc((es && s.text_es) || s.text_en)}</b></p>
          <fieldset class="hs-lv"><legend class="sr-only">${esc(L.record)}</legend>${LEVELS.map((l) => `<label class="choice"><input type="radio" name="lv-${esc(s.id)}" value="${l}"${o?.level === l ? ' checked' : ''}${t.ready ? '' : ' disabled'}><span>${esc(L.level[l])}</span></label>`).join('')}</fieldset>
          <label class="f"><span>${esc(L.note)}</span><textarea class="i" rows="2" maxlength="500"${t.ready ? '' : ' disabled'}>${esc(o?.note || '')}</textarea></label>
          <p class="small msg" role="status"></p>${t.ready ? `<button class="btn navy small" type="submit">${esc(L.save)}</button>` : ''}</form>`; }).join('')}</section>
      ${t.checks.length && t.ready ? `<section class="card" id="hsChecks"><h3>${esc(L.checks)}</h3><ul>${t.checks.slice(0, 8).map((x) => `<li>${esc(x.prompt_en)}</li>`).join('')}</ul>
        <button class="btn soft small" type="button" id="hsAssign">${esc(L.assign)}</button><p class="small msg" id="hsAssignMsg" role="status"></p></section>` : ''}`);
    for (const f of document.querySelectorAll('form.hs-obs')) {
      f.addEventListener('submit', async (e) => {
        e.preventDefault();
        const m = f.querySelector('.msg');
        const lv = f.querySelector('input[type=radio]:checked')?.value;
        try { await rpc('home_observe', { p_kid: cur.kid, p_cal_day: t.cal_day, p_step: f.dataset.step, p_level: lv || null, p_note: f.querySelector('textarea').value });
          m.className = 'small msg ok'; m.textContent = L.saved; live(L.saved); } catch (err) { m.className = 'small msg bad'; m.textContent = friendly(err); }
      });
    }
    document.getElementById('hsAssign')?.addEventListener('click', async () => {
      const m = document.getElementById('hsAssignMsg');
      try { await rpc('home_check_assign', { p_kid: cur.kid, p_items: t.checks.slice(0, 8).map((x) => x.id) }); m.className = 'small msg ok'; m.textContent = L.assigned; }
      catch (err) { m.className = 'small msg bad'; m.textContent = friendly(err); }
    });
    return;
  }

  if (tab === 'reports') {
    if (!cur) return box(`<div class="card"><p>${esc(L.noKids)}</p></div>`);
    let list = [];
    try { list = await rpc('home_reports_list', { p_kid: cur.kid }); } catch (e) { return box(`<div class="card"><p class="msg bad" role="alert">${esc(friendly(e))}</p></div>`); }
    const want = q.get('report');
    box(`<section class="card" id="hsReports"><h3>${esc(L.reportsT)}</h3><button class="btn navy small" type="button" id="hsMake">${esc(L.make)}</button>
        <p class="small msg" id="hsMakeMsg" role="status"></p>
        ${list.length ? list.map((r) => reportHtml(esc, L, r, lang, r.id === want)).join('') : `<p class="muted">${esc(L.none)}</p>`}</section>`);
    document.getElementById('hsMake').addEventListener('click', async () => {
      const m = document.getElementById('hsMakeMsg');
      try { const r = await rpc('home_report_generate', { p_kid: cur.kid }); live(L.made); go(`/c/${c.slug}/home-school?tab=reports&kid=${encodeURIComponent(cur.kid)}&report=${r.id}`); }
      catch (err) { m.className = 'small msg bad'; m.textContent = friendly(err); }
    });
    document.getElementById('hsReports').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-print]'); if (!b) return;
      document.body.classList.add('hs-print-mode'); b.closest('.hs-report').classList.add('hs-printing');
      window.print();
      document.body.classList.remove('hs-print-mode'); b.closest('.hs-report').classList.remove('hs-printing');
    });
    document.querySelector('.hs-report.on')?.scrollIntoView({ block: 'start' });
    return;
  }

  // billing
  let b, online = false;
  try { b = await rpc('consumer_my_billing', { p_center: c.center_id }); } catch (e) { return box(`<div class="card"><p class="msg bad" role="alert">${esc(friendly(e))}</p></div>`); }
  try { const r = await fetch('/api/home-billing/status', { cache: 'no-store' }); online = r.ok && (await r.json()).online === true; } catch (_) { online = false; }
  const sub = b.subscription;
  const live_ = sub && ['trialing', 'incomplete', 'active', 'past_due'].includes(sub.status);
  box(`<section class="card" id="hsBilling"><h3>${esc(L.billingT)}</h3>
      ${sub ? `<p id="hsSub"><span class="chip ${sub.status === 'active' || sub.status === 'trialing' ? 'ok' : sub.status === 'past_due' ? 'bad' : ''}">${esc(L.status[sub.status] || sub.status)}</span>
        ${sub.status === 'trialing' ? esc(L.until(day(sub.trial_ends_at, lang))) : ''}
        ${sub.status === 'active' && sub.current_period_end ? esc(sub.cancel_at_period_end ? L.endsAt(day(sub.current_period_end, lang)) : L.renews(day(sub.current_period_end, lang))) : ''}
        ${sub.status === 'past_due' && sub.grace_until ? esc(L.until(day(sub.grace_until, lang))) : ''}</p>
        ${live_ && !sub.cancel_at_period_end ? `<button class="btn link small" type="button" id="hsCancel" data-sub="${esc(sub.id)}" data-stripe="${sub.stripe ? '1' : ''}">${esc(L.cancel)}</button>` : ''}` : ''}
      <p class="small msg" id="hsBillMsg" role="status"></p>
      <h4>${esc(L.plans)}</h4>${b.plans.length ? `<ul class="hs-plans">${b.plans.map((p) => `<li class="hs-plan" data-plan="${esc(p.id)}"><b>${esc(lang === 'es' ? p.name_es : p.name_en)}</b>
          <span>${esc(money(p.amount_cents, lang))} ${esc(p.interval === 'year' ? L.perYear : L.perMonth)}</span>
          ${!live_ && !b.trial_used && p.trial_days > 0 ? `<button class="btn gold small" type="button" data-trial="${esc(p.id)}">${esc(L.trial(p.trial_days))}</button>` : ''}
          ${(!sub || !['active', 'past_due'].includes(sub.status)) ? (online ? `<button class="btn navy small" type="button" data-sub-plan="${esc(p.id)}">${esc(L.subscribe)}</button>` : `<span class="small muted">${esc(L.payOff)}</span>`) : ''}</li>`).join('')}</ul>`
        : `<p class="muted" id="hsNoPlans">${esc(L.noPlans)}</p>`}</section>
    <section class="card" id="hsReceipts"><h3>${esc(L.receipts)}</h3>${b.receipts.length ? b.receipts.map((r) => `<article class="hs-receipt" id="receipt-${esc(r.id)}">
        <p><b>${esc(L.receiptNo)} ${esc(r.receipt_no)}</b> · <span class="chip ${r.status === 'paid' ? 'ok' : 'bad'}">${esc(r.status === 'paid' ? L.paid : L.failed)}</span></p>
        <p class="small">${esc(L.period)}: ${esc(day(r.period_start, lang))} – ${esc(day(r.period_end, lang))}</p>
        <p class="small">${esc(money(r.amount_cents, lang))} · ${esc(L.tax)}: ${esc(r.tax_cents === null || r.tax_cents === undefined ? L.taxPending : money(r.tax_cents, lang))} · ${esc(L.total)}: <b>${esc(money(r.total_cents, lang))}</b></p>
        ${r.failure_reason ? `<p class="small msg bad">${esc(r.failure_reason)}</p>` : ''}</article>`).join('') : `<p class="muted">${esc(L.noReceipts)}</p>`}</section>`);
  const m = document.getElementById('hsBillMsg');
  if (q.get('receipt')) document.getElementById(`receipt-${q.get('receipt')}`)?.scrollIntoView({ block: 'start' });   // a notification's deep link
  document.getElementById('hsBilling').addEventListener('click', async (e) => {
    const tr = e.target.closest('button[data-trial]'); const sp = e.target.closest('button[data-sub-plan]'); const cn = e.target.closest('#hsCancel');
    try {
      if (tr) { await rpc('consumer_trial_start', { p_center: c.center_id, p_plan: tr.dataset.trial }); live(L.saved); return go(`/c/${c.slug}/home-school?tab=billing`); }
      if (sp) {
        const s = await session();
        const r = await fetch('/api/home-billing/checkout', { method: 'POST', headers: { Authorization: `Bearer ${s?.access_token || ''}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ center: c.center_id, plan: sp.dataset.subPlan, lang }) });
        const body = await r.json().catch(() => ({}));
        if (r.ok && body.url) { location.assign(body.url); return; }
        throw new Error(body.error || L.payOff);
      }
      if (cn) {
        if (!confirm(L.cancelAsk)) return;
        if (cn.dataset.stripe) {
          const s = await session();
          const r = await fetch('/api/home-billing/cancel', { method: 'POST', headers: { Authorization: `Bearer ${s?.access_token || ''}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: cn.dataset.sub }) });
          const body = await r.json().catch(() => ({})); if (!r.ok) throw new Error(body.error || 'Could not cancel.');
        } else await rpc('consumer_cancel', { p_subscription: cn.dataset.sub });
        live(L.saved); return go(`/c/${c.slug}/home-school?tab=billing`);
      }
    } catch (err) { m.className = 'small msg bad'; m.textContent = friendly(err); }
  });
}

export function reportHtml(esc, L, r, lang, open = false) {
  const c = r.content || {};
  return `<article class="hs-report${open ? ' on' : ''}" id="report-${esc(r.id)}"><h4>${esc(L.reportFor(c.first_name || '', day(r.from, lang), day(r.to, lang)))}</h4>
    <p class="small">${esc(L.day(c.day_no || 1))} · ${esc(L.done(c.activities_done || 0))}</p>
    <h5>${esc(L.stepsT)}</h5>${(c.steps || []).length ? `<ul>${c.steps.map((s) => `<li><b>${esc((lang === 'es' && s.text_es) || s.text_en || s.step_id)}</b>: ${esc(L.level[s.level] || s.level)}
      <ul>${(s.notes || []).map((n) => `<li class="small">${esc(day(n.on, lang))} (${esc(L.level[n.level] || n.level)}): ${esc(n.note)}</li>`).join('')}</ul></li>`).join('')}</ul>` : `<p class="small muted">${esc(L.none)}</p>`}
    ${(c.checks || []).length ? `<h5>${esc(L.checksT)}</h5><ul>${c.checks.map((x) => `<li>${esc(x.step_id)}: ${x.points} / ${x.max_points}</li>`).join('')}</ul><p class="small muted">${esc(L.own)}</p>` : ''}
    <button class="btn soft small" type="button" data-print="${esc(r.id)}">${esc(L.printR)}</button></article>`;
}
