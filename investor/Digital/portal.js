/* Futures Friends investor portal (owner 2026-10-12): the overview brought up to the site and Futures Hub motion standard, with the
   numbers always readable and never changed.
   1. The reveal (the Hub command-center count-up, REVEAL timings shared with family-dashboard.js / ff-shell.js): the four KPI cards fill
      ONE AT A TIME (a neon ring sweeps 0 -> value over 1.4 s on cubic-bezier(.22,1,.36,1) while the figure counts up, a short bloom marks
      the landing, the next card starts 700 ms later); the platform and repayment panels do the same when they scroll into view (bars
      sweep, totals count). Any tap, key, wheel or touch-scroll lands everything at once, and so does "Show all numbers now".
      Reduce Motion, the site's Decorative motion switch (ff-display-preferences.motion2 = false), "Pause motion" and ?reveal=off:
      the final values at once, no sweep. Every count ends on the exact text overview.js wrote from the verified model.
   2. "Show as table" for every chart (KPI rings, platform costs, tuition vs break-even, capital ring, cash trajectory), built from
      the same model, so no figure exists only as a picture.
   3. The documents drawer: a slide-over (bottom sheet on phones) listing every published attachment with its size and page count
      (publication-manifest.json), Preview (PDF in the drawer, or a new tab on iPhone/iPad; CSV as a table; text rendered) and
      Download. ?doc=<id> opens one directly. Nothing marked private exists in the package; only files present are listed.
   4. Signature touches: the suited friends rise into the hero (the official cutout, whole, never cropped or redrawn), a stitch draws
      under the section headings, the documents deck fans in, the cash forecast draws itself when the explorer opens, and the main
      call to action is magnetic on a desktop mouse (FFMotion.magnet). Transform, opacity and stroke only.
   5. Investor studio (owner 2026-10-12, "more space, more motion graphics"): the overview is now six full-screen views (studio.js). The
      reveal is per view: a view's cards fill one at a time the first time it is shown (and its pictures draw: studio.js listens to
      inv:entrance), a tap / key / wheel / touch-scroll lands that view, "Show all numbers now" lands every view. Figures are only
      ever set to zero while their own view is on screen and counting.
   Sends nothing; stores only the language choice (portal-i18n.js). */
(function () {
  'use strict';
  const D = document, R = D.documentElement, $ = (s, r = D) => r.querySelector(s), $$ = (s, r = D) => [...r.querySelectorAll(s)];
  const I = window.FFInvI18n || { t: (s) => s, set: (el, s) => { el.textContent = s; }, setAttr: (el, n, s) => el.setAttribute(n, s), lang: () => 'en', onChange() {} };
  const t = I.t;
  const REVEAL = { duration: 1400, gap: 700, bloom: 650, ease: 'cubic-bezier(.22,1,.36,1)' };
  const params = new URLSearchParams(location.search);
  const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const motionOn = () => !reduced() && R.dataset.motion !== 'off' && !R.classList.contains('motion-paused');
  const revealOff = () => !motionOn() || params.get('reveal') === 'off';
  const money = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
  const whole = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
  const signed = (s) => s.replace('-', '−');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const NS = 'http://www.w3.org/2000/svg';
  const svg = (tag, a = {}) => { const n = D.createElementNS(NS, tag); for (const [k, v] of Object.entries(a)) n.setAttribute(k, String(v)); return n; };
  let model = null;

  // ---------------------------------------------------------------- number formats: the count-up writes in the final text's own format
  // "$423,849.52", "−$57,738.02", "$57,000", "40": prefix, sign, grouping and decimals are read from the final text itself.
  function shape(text) {
    const m = /^([−-]?)(\$?)([\d,]+)(?:\.(\d+))?$/.exec(text.trim());
    if (!m) return null;
    return { neg: !!m[1], cur: m[2], dec: m[4] ? m[4].length : 0, value: Number(m[3].replace(/,/g, '') + (m[4] ? '.' + m[4] : '')) * (m[1] ? -1 : 1) };
  }
  function fmt(v, s) {
    const abs = Math.abs(v), body = abs.toLocaleString('en-US', { minimumFractionDigits: s.dec, maximumFractionDigits: s.dec, useGrouping: true });
    return `${v < 0 ? '\u2212' : ''}${s.cur}${body}`;
  }
  const easeOut = (p) => 1 - Math.pow(1 - p, 4);   // close to cubic-bezier(.22,1,.36,1) for a count

  // ---------------------------------------------------------------- KPI rings (the Hub's neon arcs, around each card's icon)
  const RING = 44, C = 2 * Math.PI * RING;
  function ring(host, segs, opts = {}) {
    const s = svg('svg', { viewBox: '0 0 100 100', class: `inv-ring ${opts.cls || ''}`, 'aria-hidden': 'true', focusable: 'false' });
    s.append(svg('circle', { cx: 50, cy: 50, r: RING, class: 'inv-ring-track' }));
    let at = 0, i = 0;
    for (const g of segs) {
      const len = Math.max(0, g.f * C - (opts.gap || 0));
      const arc = svg('circle', { cx: 50, cy: 50, r: RING, class: 'inv-ring-arc', stroke: g.color, 'stroke-dasharray': `${len.toFixed(2)} ${C.toFixed(2)}`, transform: `rotate(${(-90 + at * 360).toFixed(2)} 50 50)` });
      arc.style.setProperty('--len', len.toFixed(2));
      arc.style.setProperty('--glow', g.glow || g.color);
      arc.style.setProperty('--i', i++);
      s.append(arc); at += g.f;
    }
    host.append(s);
    return s;
  }
  function dots(host, n, lit, color) {
    const s = svg('svg', { viewBox: '0 0 100 100', class: 'inv-ring inv-dots', 'aria-hidden': 'true', focusable: 'false' });
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      const d = svg('circle', { cx: (50 + RING * Math.cos(a)).toFixed(2), cy: (50 + RING * Math.sin(a)).toFixed(2), r: 2.6, class: i < lit ? 'inv-dot on' : 'inv-dot', fill: color });
      d.style.setProperty('--i', i);
      s.append(d);
    }
    host.append(s);
    return s;
  }
  function buildRings(m) {
    const { funding, totals } = m, total = funding.request_before_financing;
    const icons = $$('#kpis .metric-icon');
    if (icons.length !== 4 || icons[0].querySelector('.inv-ring')) return;
    ring(icons[0], [
      { f: funding.peak_deficit / total, color: '#18b89b' }, { f: totals.refinance / total, color: '#3d6bff' },
      { f: funding.cash_floor / total, color: '#c58a1c' }, { f: totals.contingency / total, color: '#8236AE' }], { gap: 1.6, cls: 'inv-ring-funding' });
    dots(icons[1], 40, 40, '#1f9d52');
    ring(icons[2], Array.from({ length: 12 }, () => ({ f: 1 / 12, color: '#8236AE' })), { gap: 2.2, cls: 'inv-ring-months' });
    ring(icons[3], [{ f: totals.refinance / total, color: '#e7a928', glow: '#f6be46' }], { cls: 'inv-ring-refi' });
  }

  // ---------------------------------------------------------------- bars that sweep: platform rows and the break-even gap
  function buildBars(m) {
    const { platform, assumptions, metrics } = m;
    const rows = [['platformBuild', platform.completion], ['platformAssurance', platform.assurance_one_time], ['platformRecurring', platform.recurring]];
    for (const [id, v] of rows) {
      const sum = $(`#${id}`)?.closest('summary');
      if (!sum || sum.querySelector('.inv-rowbar')) continue;
      const bar = D.createElement('span'); bar.className = 'inv-rowbar'; bar.setAttribute('aria-hidden', 'true');
      bar.innerHTML = `<i style="--w:${(v / platform.first_year * 100).toFixed(2)}%"></i>`;
      sum.append(bar);
    }
    const cmp = $('.comparison');
    if (cmp && !$('.inv-gapbar', cmp)) {
      const pct = (assumptions.tuition / metrics.breakeven_tuition * 100).toFixed(2);
      const g = D.createElement('div'); g.className = 'inv-gapbar'; g.setAttribute('aria-hidden', 'true');
      g.innerHTML = `<span class="inv-gapbar-label" data-en="Gap to break-even">${esc(t('Gap to break-even'))}</span><div class="inv-gapbar-track"><i class="inv-gapbar-fill" style="--w:${pct}%"></i><i class="inv-gapbar-gap" style="--l:${pct}%"></i></div>`;
      $('.gap', cmp)?.before(g);
    }
  }

  // ---------------------------------------------------------------- the reveal, one view at a time
  const nums = (u) => $$('[data-count]', u);
  const unitsIn = (v) => $$(`[data-studio-view="${v}"] [data-reveal-unit]`);
  const units = () => $$('[data-reveal-unit]');
  const viewsAll = () => $$('[data-studio-view]').map((x) => x.dataset.studioView);
  const SKIPS = ['pointerdown', 'keydown', 'wheel', 'touchmove'];
  const emit = (name, detail) => D.dispatchEvent(new CustomEvent(name, { detail }));
  let run = null, curView = R.dataset.view || 'overview';
  const played = new Set();
  function zero(u) {
    for (const n of nums(u)) {
      const cur = n.textContent.trim();
      // a figure overview.js did not rewrite still shows our zero: keep the final we read before
      const final = n.dataset.final && cur === n.dataset.zero ? n.dataset.final : cur, s = shape(final);
      if (!s) continue;
      n.dataset.final = final;
      n.classList.add('inv-num');
      n.style.minWidth = `${Math.ceil(n.getBoundingClientRect().width)}px`;   // the final width is held: nothing moves while it counts
      n.textContent = n.dataset.zero = fmt(0, s);
    }
    u.classList.add('inv-zero'); u.classList.remove('inv-play', 'inv-landed');
  }
  function land(u) {
    for (const n of nums(u)) { if (n.dataset.final) n.textContent = n.dataset.final; n.classList.remove('inv-counting'); n.style.removeProperty('min-width'); }
    u.classList.remove('inv-zero', 'inv-play', 'inv-bloom'); u.classList.add('inv-landed');
    u.dataset.revealed = u.dataset.revealed || 'landed';
  }
  function play(u) {
    if (!u.classList.contains('inv-zero')) return;
    u.dataset.revealed = String(Math.round(performance.now()));
    u.classList.remove('inv-zero'); u.classList.add('inv-play');
    const list = nums(u).filter((n) => n.dataset.final).map((n) => ({ n, s: shape(n.dataset.final) }));
    list.forEach(({ n }) => n.classList.add('inv-counting'));
    const t0 = performance.now();
    const tick = (now) => {
      if (!u.classList.contains('inv-play')) return;
      const p = Math.min(1, (now - t0) / REVEAL.duration), e = easeOut(p);
      for (const { n, s } of list) n.textContent = p >= 1 ? n.dataset.final : fmt(Math.round(s.value * e * 10 ** s.dec) / 10 ** s.dec, s);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    setTimeout(() => {
      if (!u.classList.contains('inv-play')) return;
      land(u); u.classList.add('inv-bloom');
      setTimeout(() => u.classList.remove('inv-bloom'), REVEAL.bloom + 200);
    }, REVEAL.duration);
  }
  function arm() {
    if (revealOff()) { R.classList.remove('inv-reveal'); return false; }
    unitsIn(curView).forEach(zero);
    R.classList.add('inv-armed'); R.classList.remove('inv-reveal');
    return true;
  }
  // enter(view): the view's entrance, once per visit of the page. Its cards fill one at a time (250 ms, then REVEAL.gap apart; a card
  // below the fold on a phone waits until it scrolls in); studio.js and the waterfall / deck below draw their pictures on inv:entrance
  // and may hold the entrance open a little longer (detail.hold(ms)) so a tap can still land them.
  function enter(v) {
    curView = v;
    if (!model || played.has(v)) return;
    played.add(v);
    const us = unitsIn(v);
    if (revealOff()) { us.forEach(land); emit('inv:entrance', { view: v, animate: false, hold() {} }); return; }
    stop(false);
    us.forEach(zero);
    const r = run = { timers: [], us, view: v, io: null };
    const skipBtn = $('#revealSkip'); if (skipBtn) skipBtn.hidden = false;
    const vis = (u) => { const b = u.getBoundingClientRect(); return b.height > 0 && b.bottom > 0 && b.top < innerHeight; };
    if (typeof IntersectionObserver === 'function') r.io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { r.io.unobserve(e.target); play(e.target); } }), { threshold: 0.35 });
    us.forEach((u, i) => r.timers.push(setTimeout(() => { if (vis(u) || !r.io) play(u); else r.io.observe(u); }, 250 + REVEAL.gap * i)));
    let span = us.length ? 250 + REVEAL.gap * (us.length - 1) + REVEAL.duration : 0;
    emit('inv:entrance', { view: v, animate: true, hold: (ms) => { span = Math.max(span, ms); } });
    // the tap / key that opened this view must not land it: listen from the next task on
    r.timers.push(setTimeout(() => { if (run === r) for (const ev of SKIPS) addEventListener(ev, skip, { passive: true, capture: true }); }, 0));
    r.timers.push(setTimeout(() => finish(r), span + 400));
  }
  function finish(r) {
    if (run !== r) return;
    if (r.us.some((u) => u.classList.contains('inv-zero'))) return;   // a card still waits below the fold: keep listening
    run = null; r.io?.disconnect(); unlisten();
    const b = $('#revealSkip'); if (b) b.hidden = true;
  }
  function unlisten() { for (const ev of SKIPS) removeEventListener(ev, skip, { capture: true }); }
  function skip() { stop(false); }
  function stop(silent) {
    const r = run; if (!r) return;
    run = null;
    r.timers.forEach(clearTimeout); r.io?.disconnect(); unlisten();
    if (!silent) { r.us.forEach(land); emit('inv:land', { view: r.view }); }
    const b = $('#revealSkip'); if (b) b.hidden = true;
  }
  // "Show all numbers now": every view lands and stays landed (no later entrance re-counts a figure the reader has asked to see)
  function showAll() {
    stop(false);
    units().forEach((u) => { if (!u.classList.contains('inv-landed')) land(u); });
    viewsAll().forEach((v) => played.add(v));
    emit('inv:land', { all: true });
  }
  $('#revealSkip')?.addEventListener('click', showAll);
  // count(nodes): a scroll-in count for figures outside the per-view reveal (the Overview's dashboard cards, studio.js). Each figure
  // counts from zero in its own format over REVEAL.duration and ends on the exact text it held (the model text); returns end(),
  // which lands them at once. The caller counts only with motion on.
  function count(nodes, dur = REVEAL.duration) {
    const list = nodes.map((n) => ({ n, final: n.textContent.trim() })).map((x) => ({ ...x, s: shape(x.final) })).filter((x) => x.s);
    let done = false;
    const end = () => { if (done) return; done = true; for (const { n, final } of list) { n.textContent = final; n.classList.remove('inv-counting'); n.style.removeProperty('min-width'); } };
    if (!list.length) return end;
    for (const { n, s } of list) { n.style.minWidth = `${Math.ceil(n.getBoundingClientRect().width)}px`; n.classList.add('inv-counting'); n.textContent = fmt(0, s); }
    const t0 = performance.now();
    const tick = (now) => {
      if (done) return;
      const p = Math.min(1, (now - t0) / dur), e = easeOut(p);
      if (p >= 1) { end(); return; }
      for (const { n, s } of list) n.textContent = fmt(Math.round(s.value * e * 10 ** s.dec) / 10 ** s.dec, s);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return end;
  }
  window.FFInvReveal = Object.freeze({ timings: REVEAL, skip: showAll, running: () => !!run, enter, count, played: () => [...played] });

  // ---------------------------------------------------------------- "Show as table" for every chart
  function tableToggle(host, id, caption, head, rows, where = 'append') {
    if (!host || $(`#${id}`)) return;
    const wrap = D.createElement('div'); wrap.className = 'inv-table-wrap'; wrap.id = id; wrap.hidden = true;
    const capId = `${id}-cap`;
    wrap.innerHTML = `<table class="inv-table" aria-labelledby="${capId}"><caption id="${capId}" data-en="${esc(caption)}">${esc(t(caption))}</caption><thead><tr>${head.map((h) => `<th scope="col" data-en="${esc(h)}">${esc(t(h))}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => i === 0 ? `<th scope="row"${/[A-Za-z]/.test(c) ? ` data-en="${esc(c)}"` : ''}>${esc(t(c))}</th>` : `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    const btn = D.createElement('button'); btn.type = 'button'; btn.className = 'as-table'; btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', id);
    btn.dataset.en = 'Show as table'; btn.textContent = t('Show as table');
    btn.addEventListener('click', () => {
      const open = wrap.hidden; wrap.hidden = !open; btn.setAttribute('aria-expanded', String(open));
      I.set(btn, open ? 'Hide table' : 'Show as table');
      host.classList.toggle('inv-tabled', open);
    });
    if (where === 'after') { host.after(btn, wrap); } else host.append(btn, wrap);
  }
  function buildTables(m) {
    const { funding, totals, platform, assumptions, metrics, cash } = m;
    const parts = [['Peak pilot cash deficit', money(funding.peak_deficit)], ['Refinance-enabling allocation', whole(totals.refinance)], ['Cash floor', money(funding.cash_floor)], ['Contingency', money(totals.contingency)], ['Preliminary funding need', money(funding.request_before_financing)]];
    const kpiRow = D.createElement('div'); kpiRow.className = 'inv-kpi-tools';
    if (!$('.inv-kpi-tools')) { $('#kpis').after(kpiRow); tableToggle(kpiRow, 'kpiTable', 'The four parts of the funding estimate', ['Item', 'Amount'], parts); }
    tableToggle($('.platform .cost-caption'), 'platformTable', 'Platform costs, year one', ['Item', 'Amount'],
      [['Platform completion', whole(platform.completion)], ['Security testing & counsel', whole(platform.assurance_one_time)], ['Annual support & hosting', money(platform.recurring)], ['Platform year one', money(platform.first_year)]], 'after');
    tableToggle($('.comparison .chart-unit'), 'cashCompareTable', 'Tuition and operating break-even, per child per month', ['Item', 'Amount'],
      [['Current tuition assumption', whole(assumptions.tuition)], ['Operating break-even', money(metrics.breakeven_tuition)], ['Annual operating gap', signed(money(metrics.year2_margin))]], 'after');
    tableToggle($('.donut-side .donut-legend'), 'capitalTable', 'The four parts of the funding estimate', ['Item', 'Amount'], parts, 'after');
    const spend = (r) => r.recurring + r.one_time;
    tableToggle($('#forecastView .trajectory'), 'cashTable', 'Monthly cash forecast', ['Month', 'Children', 'Receipts', 'Spending', 'Net', 'Cumulative'],
      cash.map((r) => [String(r.month), String(r.children), money(r.receipts), money(spend(r)), signed(money(r.net)), signed(money(r.cumulative))]), 'after');
  }

  // ---------------------------------------------------------------- the funding waterfall (menu #14): the four allocations stack to
  // the funding estimate, one after another, when the section is opened and in view. A picture of figures already printed beside it
  // (and in the KPI table); with motion off it is simply drawn.
  function buildWaterfall(m) {
    const host = $('.funding-content'); if (!host || $('.inv-fall', host)) return;
    const { funding, totals } = m, total = funding.request_before_financing;
    const parts = [['Peak pilot cash deficit', funding.peak_deficit, '#18b89b'], ['Refinance-enabling allocation', totals.refinance, '#3d6bff'], ['Contingency', totals.contingency, '#8236AE'], ['Cash floor', funding.cash_floor, '#c58a1c']];
    let at = 0;
    const rows = parts.map(([label, v, c], i) => { const r = `<div class="inv-fall-row"><span data-en="${esc(label)}">${esc(t(label))}</span><div class="inv-fall-track"><i style="--l:${(at / total * 100).toFixed(2)}%;--w:${(v / total * 100).toFixed(2)}%;--c:${c};--i:${i}"></i></div></div>`; at += v; return r; });
    rows.push(`<div class="inv-fall-row inv-fall-total"><span data-en="Preliminary funding need">${esc(t('Preliminary funding need'))}</span><div class="inv-fall-track"><i style="--l:0%;--w:100%;--c:#071969;--i:4"></i></div></div>`);
    const w = D.createElement('div'); w.className = 'inv-fall'; w.setAttribute('aria-hidden', 'true'); w.innerHTML = rows.join('');
    $('.funding-parts', host)?.after(w);
    // drawn at once unless the Funding view's entrance plays it (inv:entrance below)
    if (!(motionOn() && !revealOff() && !played.has('funding'))) w.classList.add('inv-fall-in');
  }
  // ---------------------------------------------------------------- parallax hero (menu #15): desktop mouse only; the friends and the
  // the friends drift a few px with the pointer (the orbit rings keep their own spin) (FFMotion.layers: transform only, one frame at a time, off with every motion switch)
  function parallax() {
    const M = window.FFMotion, host = $('.hero'); if (!M || !host || !motionOn() || !M.fine()) return;
    M.scope().layers(host, [{ el: $('.hero-world'), x: 10, y: 6 }], { cssScroll: false });
  }

  // ---------------------------------------------------------------- documents drawer
  const DOCS = [
    { id: 'plan-pdf', g: 'Start here', f: '../Futures_Friends_CURRENT_Pilot_Business_Plan.pdf', k: 'pdf', view: 'pilot-plan.html',
      en: ['Pilot business plan', 'The 40-child pilot, staffing, costs, cash and delivery commitments.'], es: ['Plan de negocios del piloto', 'El piloto de 40 niños: personal, costos, caja y compromisos de entrega.'] },
    { id: 'one-sheet-pdf', g: 'Start here', f: '../Futures_Friends_CURRENT_Pilot_One_Sheet.pdf', k: 'pdf', view: 'pilot-one-sheet.html',
      en: ['Investor one-sheet', 'The core figures, boundaries and open decisions on one page.'], es: ['Resumen de una página', 'Las cifras clave, los límites y las decisiones pendientes en una página.'] },
    { id: 'costs-csv', g: 'Costs and cash', f: '../costs/Pilot_40_Children_Itemized.csv', k: 'csv', view: 'pilot-plan.html#budget',
      en: ['Every cost (itemized)', 'Each planned line with quantity, rate, purpose and evidence.'], es: ['Cada costo (detallado)', 'Cada partida planeada con cantidad, tarifa, propósito y evidencia.'] },
    { id: 'cash-csv', g: 'Costs and cash', f: '../costs/Pilot_40_Children_Monthly_Cash.csv', k: 'csv', view: 'pilot-plan.html#cash',
      en: ['Monthly cash forecast', 'Enrollment ramp, receipts, spending and the cumulative gap, month by month.'], es: ['Pronóstico de caja mensual', 'Aumento de inscripción, ingresos, gastos y déficit acumulado, mes a mes.'] },
    { id: 'bible-pdf', g: 'Reference', f: '../02_Series_Curriculum_Production_Bible.pdf', k: 'pdf', view: 'library.html#bible',
      en: ['Production bible', 'Characters, story world and wider curriculum direction. Future scope is outside pilot financing.'], es: ['Biblia de producción', 'Personajes, mundo de la historia y dirección general del currículo. El alcance futuro queda fuera del financiamiento del piloto.'] },
    { id: 'operations-pdf', g: 'Reference', f: '../03_Program_Operations_Evidence_Companion.pdf', k: 'pdf', view: 'library.html#operations',
      en: ['Operations and evidence companion', 'Delivery model, roles, controls, portals and evidence requirements.'], es: ['Compañero de operaciones y evidencia', 'Modelo de entrega, funciones, controles, portales y requisitos de evidencia.'] },
    { id: 'forecast-reconciliation', g: 'Reconciliation and evidence', f: '../documents/Futures_Friends_CURRENT_Forecast_and_Production_Reconciliation.md', k: 'md',
      en: ['Forecast and production reconciliation', 'The current pilot business and funding plan text, kept under its reconciliation file name.'], es: ['Conciliación del pronóstico y la producción', 'El texto actual del plan de negocios y financiamiento del piloto, con su nombre de archivo de conciliación.'] },
    { id: 'animation-reconciliation', g: 'Reconciliation and evidence', f: '../costs/Animation_Budget_Reconciliation.md', k: 'md', view: 'library.html#animation-audit',
      en: ['Animation budget reconciliation', 'Observed generation usage and the season production sensitivity.'], es: ['Conciliación del presupuesto de animación', 'Uso de generación observado y la sensibilidad de la producción de la temporada.'] },
    { id: 'usage-audit', g: 'Reconciliation and evidence', f: '../costs/Higgsfield_Actual_Usage_Audit.md', k: 'md', view: 'library.html#higgsfield-audit',
      en: ['Generation usage audit', 'Account-level usage evidence and the limits of attribution.'], es: ['Auditoría de uso de generación', 'Evidencia de uso a nivel de cuenta y los límites de su atribución.'] },
    { id: 'record-audit', g: 'Reconciliation and evidence', f: '../costs/Operating_Record_Evidence_Audit.md', k: 'md', view: 'library.html#record-audit',
      en: ['Operating record evidence audit', 'Evidence status, source coverage and unresolved planning inputs.'], es: ['Auditoría de evidencia de registros operativos', 'Estado de la evidencia, cobertura de fuentes y supuestos pendientes.'] },
    { id: 'plan-text', g: 'Text versions', f: '../documents/Futures_Friends_CURRENT_Pilot_Business_Plan.md', k: 'md',
      en: ['Pilot business plan (text)', 'The narrative of the current pilot plan as plain text.'], es: ['Plan de negocios del piloto (texto)', 'La narrativa del plan piloto actual en texto simple.'] },
    { id: 'one-sheet-text', g: 'Text versions', f: '../documents/Futures_Friends_CURRENT_Pilot_One_Sheet.md', k: 'md',
      en: ['Investor one-sheet (text)', 'The one-page summary as plain text.'], es: ['Resumen de una página (texto)', 'El resumen de una página en texto simple.'] },
    { id: 'executive-text', g: 'Text versions', f: '../documents/Futures_Friends_CURRENT_Investor_Executive_One_Sheet.md', k: 'md',
      en: ['Executive one-sheet (text)', 'The executive summary of the current pilot as plain text.'], es: ['Resumen ejecutivo (texto)', 'El resumen ejecutivo del piloto actual en texto simple.'] },
    { id: 'bible-text', g: 'Text versions', f: '../documents/Futures_Friends_CURRENT_Master_Production_Bible.md', k: 'md',
      en: ['Production bible (text)', 'The current controls of the production bible as plain text.'], es: ['Biblia de producción (texto)', 'Los controles actuales de la biblia de producción en texto simple.'] },
    { id: 'operations-text', g: 'Text versions', f: '../documents/Futures_Friends_CURRENT_Operations_Companion.md', k: 'md',
      en: ['Operations companion (text)', 'The current controls of the operations companion as plain text.'], es: ['Compañero de operaciones (texto)', 'Los controles actuales del compañero de operaciones en texto simple.'] },
    { id: 'business-plan-01', g: 'Earlier file names', f: '../01_Investor_Business_Plan.pdf', k: 'pdf',
      en: ['Investor business plan (earlier file name)', 'An earlier edition of the current pilot business plan, kept so old links work.'], es: ['Plan de negocios (nombre anterior)', 'Una edición anterior del plan de negocios del piloto actual, conservada para enlaces antiguos.'] },
    { id: 'financial-reconciliation-06', g: 'Earlier file names', f: '../06_Financial_Reconciliation.pdf', k: 'pdf',
      en: ['Financial reconciliation (earlier file name)', 'The same earlier edition of the current pilot business plan, under its old reconciliation name.'], es: ['Conciliación financiera (nombre anterior)', 'La misma edición anterior del plan de negocios del piloto, con su antiguo nombre de conciliación.'] },
    { id: 'one-sheet-05', g: 'Earlier file names', f: '../05_Investor_One_Sheet.pdf', k: 'pdf',
      en: ['Investor one-sheet (earlier file name)', 'An earlier edition of the current one-sheet, kept so old links work.'], es: ['Resumen de una página (nombre anterior)', 'Una edición anterior del resumen actual, conservada para enlaces antiguos.'] },
    { id: 'business-plan-text-alias', g: 'Earlier file names', f: '../documents/Futures_Friends_CURRENT_Investor_Business_Plan.md', k: 'md',
      en: ['Investor business plan (text, earlier file name)', 'The current pilot business and funding plan text under an earlier name.'], es: ['Plan de negocios (texto, nombre anterior)', 'El texto del plan de negocios y financiamiento del piloto con un nombre anterior.'] },
    { id: 'loan-pricing-alias', g: 'Earlier file names', f: '../documents/Futures_Friends_CURRENT_Loan_Pricing_Rationale.md', k: 'md',
      en: ['Loan pricing rationale (text, earlier file name)', 'The current pilot business and funding plan text under an earlier name. Loan terms remain pending.'], es: ['Justificación del precio del préstamo (texto, nombre anterior)', 'El texto del plan de negocios y financiamiento del piloto con un nombre anterior. Los términos del préstamo siguen pendientes.'] }
  ];
  const GROUPS = ['Start here', 'Costs and cash', 'Reference', 'Reconciliation and evidence', 'Text versions', 'Earlier file names'];
  const ICON = {
    pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>',
    csv: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16M15 4v16"/></svg>',
    md: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>'
  };
  const ios = () => /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  // a PDF previews inside the drawer only where the browser has a built-in PDF viewer (not iPhone/iPad, not Android Chrome)
  const pdfInline = () => !ios() && navigator.pdfViewerEnabled !== false;
  const size = (b) => (b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);
  let manifest = null, drawer = null, opener = null, current = null;
  const meta = (d) => manifest && manifest.files.find((x) => x.path === `investor/${d.f.replace(/^\.\.\//, '')}`);
  const words = (d) => (I.lang() === 'es' ? d.es : d.en);
  const fname = (d) => d.f.split('/').pop();

  function buildDrawer() {
    if (drawer) return drawer;
    drawer = D.createElement('dialog');
    drawer.id = 'invDocs'; drawer.className = 'inv-docs'; drawer.setAttribute('data-inv-docs', ''); drawer.setAttribute('aria-labelledby', 'invDocsTitle');
    drawer.innerHTML = `<div class="inv-docs-sheet"><div class="inv-docs-grab" aria-hidden="true"></div><header class="inv-docs-head"><div><h2 id="invDocsTitle" data-en="Documents">${esc(t('Documents'))}</h2><p class="inv-docs-sub" data-en="Every file behind the pilot plan. Preview here or download.">${esc(t('Every file behind the pilot plan. Preview here or download.'))}</p></div><button type="button" class="inv-docs-close" data-close aria-label="Close">✕</button></header><div class="inv-docs-body" tabindex="-1"></div></div>`;
    D.body.append(drawer);
    I.apply(drawer);
    drawer.addEventListener('cancel', (e) => { e.preventDefault(); closeDrawer(); });
    drawer.addEventListener('click', (e) => {
      if (e.target === drawer) { closeDrawer(); return; }
      const c = e.target.closest('[data-close]'); if (c) { closeDrawer(); return; }
      const p = e.target.closest('[data-preview]'); if (p) { e.preventDefault(); preview(p.dataset.preview); return; }
      if (e.target.closest('[data-list]')) { e.preventDefault(); list(); }
    });
    return drawer;
  }
  function list(focusId) {
    current = null; setDocParam(null);
    const body = $('.inv-docs-body', drawer), es = I.lang() === 'es';
    body.innerHTML = `${es ? `<p class="inv-docs-note">${esc(t('Documents are in English.'))}</p>` : ''}${GROUPS.map((g) => {
      const ds = DOCS.filter((d) => d.g === g && meta(d));
      if (!ds.length) return '';
      return `<section class="inv-docs-group"><h3>${esc(t(g))}</h3><ul>${ds.map((d) => {
        const m = meta(d), [title, desc] = words(d), info = [d.k.toUpperCase(), m.pages ? t(`${m.pages} page${m.pages === 1 ? '' : 's'}`) : (d.id === 'costs-csv' && model ? t(`${model.meta.line_count} lines`) : (d.id === 'cash-csv' && model ? t(`${model.cash.length} months`) : '')), size(m.bytes)].filter(Boolean).join(' · ');
        const pv = d.k === 'pdf' && !pdfInline()
          ? `<a class="inv-btn" href="${esc(d.f)}" target="_blank" rel="noopener" data-doc-preview="${d.id}">${esc(t('Preview'))}<span class="sr"> ${esc(title)}</span></a>`
          : `<button type="button" class="inv-btn" data-preview="${d.id}">${esc(t('Preview'))}<span class="sr"> ${esc(title)}</span></button>`;
        return `<li class="inv-doc" id="doc-${d.id}" data-kind="${d.k}"><span class="inv-doc-icon" aria-hidden="true">${ICON[d.k]}</span><div class="inv-doc-text"><strong>${esc(title)}</strong><span>${esc(desc)}</span><small>${esc(info)}</small></div><div class="inv-doc-actions">${pv}<a class="inv-btn inv-btn-ghost" href="${esc(d.f)}" download="${esc(fname(d))}">${esc(t('Download'))}<span class="sr"> ${esc(title)}</span></a></div></li>`;
      }).join('')}</ul></section>`;
    }).join('')}${!pdfInline() ? `<p class="inv-docs-note">${esc(t('This browser opens PDFs in a new tab.'))}</p>` : ''}`;
    const f = focusId && $(`#doc-${focusId} .inv-btn`, body);
    (f || body).focus({ preventScroll: !!f });
    if (f) f.scrollIntoView({ block: 'center' });
  }
  function csvRows(text) {
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
      else if (c === '"') q = true; else if (c === ',') { row.push(cell); cell = ''; } else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; } else if (c !== '\r') cell += c;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }
  function mdHtml(text) {
    const out = []; let listOpen = false, table = null;
    const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>');
    const flushTable = () => { if (!table) return; const [h, ...b] = table.filter((r) => !/^\s*\|?\s*:?-{2,}/.test(r)); const cells = (r) => r.replace(/^\s*\||\|\s*$/g, '').split('|').map((c) => c.trim());
      out.push(`<div class="inv-table-scroll"><table class="inv-table"><thead><tr>${cells(h).map((c) => `<th scope="col">${inline(c)}</th>`).join('')}</tr></thead><tbody>${b.map((r) => `<tr>${cells(r).map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`); table = null; };
    for (const line of text.split('\n')) {
      if (/^\s*\|/.test(line)) { if (listOpen) { out.push('</ul>'); listOpen = false; } (table = table || []).push(line); continue; }
      flushTable();
      const h = /^(#{1,4})\s+(.*)$/.exec(line), li = /^\s*[-*]\s+(.*)$/.exec(line);
      if (li) { if (!listOpen) { out.push('<ul>'); listOpen = true; } out.push(`<li>${inline(li[1])}</li>`); continue; }
      if (listOpen) { out.push('</ul>'); listOpen = false; }
      if (h) out.push(`<h${Math.min(6, h[1].length + 2)}>${inline(h[2])}</h${Math.min(6, h[1].length + 2)}>`);
      else if (line.trim()) out.push(`<p>${inline(line)}</p>`);
    }
    flushTable(); if (listOpen) out.push('</ul>');
    return out.join('');
  }
  async function preview(id) {
    const d = DOCS.find((x) => x.id === id && meta(x)); if (!d) { list(); return; }
    current = d; setDocParam(d.id);
    const body = $('.inv-docs-body', drawer), [title, desc] = words(d);
    const actions = `<div class="inv-doc-actions"><a class="inv-btn" href="${esc(d.f)}" download="${esc(fname(d))}">${esc(t('Download'))}</a><a class="inv-btn inv-btn-ghost" href="${esc(d.f)}" target="_blank" rel="noopener">${esc(t('Open in a new tab'))}</a>${d.view ? `<a class="inv-btn inv-btn-ghost" href="${esc(d.view)}">${esc(t('Open the interactive page'))}</a>` : ''}</div>`;
    body.innerHTML = `<div class="inv-preview" data-doc="${d.id}"><button type="button" class="inv-back" data-list>← ${esc(t('Back to the list'))}</button><h3 tabindex="-1">${esc(title)}</h3><p class="inv-preview-desc">${esc(desc)}</p>${actions}<div class="inv-preview-frame" aria-live="polite"></div></div>`;
    const frame = $('.inv-preview-frame', body);
    $('h3', body).focus();
    if (d.k === 'pdf') {
      if (!pdfInline()) { frame.innerHTML = `<p class="inv-docs-note">${esc(t('This browser opens PDFs in a new tab.'))}</p><a class="inv-btn" href="${esc(d.f)}" target="_blank" rel="noopener">${esc(t('Open in a new tab'))}</a>`; return; }
      const f = D.createElement('iframe'); f.className = 'inv-pdf'; f.title = title; f.src = `${d.f}#view=FitH`; f.loading = 'lazy';
      frame.append(f); return;
    }
    frame.textContent = t('Loading…');
    try {
      const r = await fetch(d.f, { cache: 'no-store' }); if (!r.ok) throw new Error(String(r.status));
      const text = await r.text();
      if (current !== d) return;
      if (d.k === 'csv') {
        const [h, ...rows] = csvRows(text.trim());
        frame.innerHTML = `<div class="inv-table-scroll" tabindex="0" role="region" aria-label="${esc(title)}"><table class="inv-table inv-csv"><thead><tr>${h.map((c) => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
      } else frame.innerHTML = `<article class="inv-md" lang="en">${mdHtml(text)}</article>`;
    } catch (e) { if (current === d) frame.textContent = t('This preview could not load. Use Download or open it in a new tab.'); }
  }
  function setDocParam(id) {
    const u = new URL(location.href);
    if (id) u.searchParams.set('doc', id); else u.searchParams.delete('doc');
    try { history.replaceState(history.state, '', u); } catch (e) { /* file:// or a sandbox */ }
  }
  async function loadManifest() {
    if (manifest) return manifest;
    try { const r = await fetch('../publication-manifest.json', { cache: 'no-store' }); if (r.ok) manifest = await r.json(); } catch (e) { /* offline: listed without sizes */ }
    if (!manifest) manifest = { files: DOCS.map((d) => ({ path: `investor/${d.f.replace(/^\.\.\//, '')}`, bytes: 0 })) };
    return manifest;
  }
  async function openDrawer(docId, from) {
    await loadManifest();
    buildDrawer();
    opener = from || D.activeElement;
    if (!drawer.open) {
      drawer.showModal();
      R.classList.add('inv-docs-open');
      if (motionOn()) $('.inv-docs-sheet', drawer).animate(innerWidth <= 640 ? [{ transform: 'translateY(100%)' }, { transform: 'none' }] : [{ transform: 'translateX(100%)' }, { transform: 'none' }], { duration: 450, easing: 'cubic-bezier(.32,.72,0,1)' });
    }
    if (docId && DOCS.some((d) => d.id === docId)) preview(docId); else list();
  }
  function closeDrawer() {
    if (!drawer || !drawer.open) return;
    const done = () => { drawer.close(); R.classList.remove('inv-docs-open'); setDocParam(null); current = null; if (opener && opener.focus) opener.focus(); };
    if (motionOn()) { const a = $('.inv-docs-sheet', drawer).animate(innerWidth <= 640 ? [{ transform: 'none' }, { transform: 'translateY(100%)' }] : [{ transform: 'none' }, { transform: 'translateX(100%)' }], { duration: 260, easing: 'cubic-bezier(.65,0,.35,1)' }); a.onfinish = done; }
    else done();
  }
  window.FFInvDocs = Object.freeze({ open: openDrawer, close: closeDrawer, list: DOCS.map((d) => ({ id: d.id, file: d.f, kind: d.k })) });

  // the Documents view: the drawer's content as a full view. The six main files are the deck (index.html, official art); their kind,
  // pages and size come from the manifest like the drawer's; every other file is listed below by group, with Preview and Download.
  const info = (d, m) => [d.k.toUpperCase(), m.pages ? t(`${m.pages} page${m.pages === 1 ? '' : 's'}`) : (d.id === 'costs-csv' && model ? t(`${model.meta.line_count} lines`) : (d.id === 'cash-csv' && model ? t(`${model.cash.length} months`) : '')), m.bytes ? size(m.bytes) : ''].filter(Boolean).join(' · ');
  async function docsView() {
    const more = $('#docsMore'); if (!more) return;
    await loadManifest();
    for (const el of $$('[data-doc-meta]')) { const d = DOCS.find((x) => x.id === el.dataset.docMeta), m = d && meta(d); el.textContent = m ? info(d, m) : ''; }
    const deck = new Set($$('[data-doc-meta]').map((el) => el.dataset.docMeta));
    more.innerHTML = GROUPS.map((g) => {
      const ds = DOCS.filter((d) => d.g === g && !deck.has(d.id) && meta(d));
      if (!ds.length) return '';
      return `<section class="docs-group"><h3>${esc(t(g))}</h3><ul>${ds.map((d) => {
        const [title, desc] = words(d);
        const pv = d.k === 'pdf' && !pdfInline()
          ? `<a class="inv-btn" href="${esc(d.f)}" target="_blank" rel="noopener">${esc(t('Preview'))}<span class="sr"> ${esc(title)}</span></a>`
          : `<a class="inv-btn" href="${esc(d.view || d.f)}" data-doc="${d.id}">${esc(t('Preview'))}<span class="sr"> ${esc(title)}</span></a>`;
        return `<li class="docs-row"><span class="inv-doc-icon" aria-hidden="true">${ICON[d.k]}</span><div class="inv-doc-text"><strong>${esc(title)}</strong><span>${esc(desc)}</span><small>${esc(info(d, meta(d)))}</small></div><div class="inv-doc-actions">${pv}<a class="inv-btn inv-btn-ghost" href="${esc(d.f)}" download="${esc(fname(d))}">${esc(t('Download'))}<span class="sr"> ${esc(title)}</span></a></div></li>`;
      }).join('')}</ul></section>`;
    }).join('') + (I.lang() === 'es' ? `<p class="inv-docs-note">${esc(t('Documents are in English.'))}</p>` : '');
  }

  // ---------------------------------------------------------------- signature touches (all off when motion is off)
  function hero() {
    const w = $('.hero-world'); if (!w || !motionOn()) return;
    w.animate([{ opacity: 0, transform: 'translate3d(0,28px,0) scale(.94)' }, { opacity: 1, transform: 'none' }], { duration: 800, delay: 150, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards' });
  }
  function onEnter(els, cb, threshold = 0.25) {
    if (typeof IntersectionObserver !== 'function') { els.forEach(cb); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); cb(e.target); } }), { threshold });
    els.forEach((el) => io.observe(el));
  }
  function stitches() {
    const hs = $$('.view-head h2, .panel-title h3, .phase-heading h3, .panel-h');
    hs.forEach((h) => h.classList.add('inv-stitch'));
    if (!motionOn()) { hs.forEach((h) => h.classList.add('inv-stitched')); return; }
    onEnter(hs, (h) => h.classList.add('inv-stitched'), 0.6);
  }
  // the Funding view's waterfall and the Documents view's deck play with their view's entrance; a tap lands them
  D.addEventListener('inv:entrance', (e) => {
    const { view, animate } = e.detail;
    if (view === 'funding') {
      const w = $('.inv-fall'); if (!w) return;
      if (!animate) { w.classList.add('inv-fall-in'); return; }
      w.classList.remove('inv-fall-in'); void w.offsetWidth;
      e.detail.hold(400 + 700 + 4 * 420);
      setTimeout(() => w.classList.add('inv-fall-in'), 400);
    }
    if (view === 'documents' && animate) {
      const routes = $$('.routes .route');
      routes.forEach((r, i) => r.animate([{ opacity: 0, transform: `translate3d(0,26px,0) rotate(${i % 2 ? 4 : -4}deg) scale(.96)` }, { opacity: 1, transform: 'none' }], { duration: 620, delay: 120 + i * 70, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards' }));
      e.detail.hold(120 + routes.length * 70 + 620);
    }
  });
  D.addEventListener('inv:land', (e) => {
    const { view, all } = e.detail;
    if (all || view === 'funding') $('.inv-fall')?.classList.add('inv-fall-in', 'inv-fall-now');
    if (all || view === 'documents') $$('.routes .route').forEach((r) => r.getAnimations().forEach((a) => a.finish()));
  });
  function magnet() {
    const M = window.FFMotion, btn = $('.platform .button');
    if (!M || !btn || !M.allowed() || !motionOn()) return;
    M.magnet(btn, M.scope(), { max: 6 });
  }

  // ---------------------------------------------------------------- wiring
  D.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('[data-docs-open], a[data-doc]'); if (!a) return;
    e.preventDefault();
    openDrawer(a.dataset.doc || null, a);
  });
  const armed = arm();
  if (armed) setTimeout(() => { if (!model) { stop(false); units().forEach(land); } }, 8000);   // no model yet: never leave a zero on screen
  D.addEventListener('inv:model', (e) => {
    model = e.detail;
    buildRings(model); buildBars(model); buildTables(model); buildWaterfall(model);
    if (!(armed && !revealOff())) { units().forEach(land); R.classList.add('inv-final'); }
    const v = curView; played.delete(v); enter(v);
    if (drawer && drawer.open && !current) list();
    docsView();
  });
  D.addEventListener('inv:model-error', () => { stop(false); units().forEach(land); R.classList.remove('inv-armed'); docsView(); });
  D.addEventListener('inv:motion', (e) => { if (e.detail && e.detail.paused) stop(false); });
  // Spanish is a draft: say so while it is on; the model's line-item names stay English (as in the cost register), marked for screen readers
  const esNote = () => { const e = $('.es-note'); if (e) e.hidden = I.lang() !== 'es'; };
  $$('#buildRows, #assuranceRows, #recurringRows').forEach((l) => l.setAttribute('lang', 'en'));
  esNote();
  I.onChange(() => { esNote(); docsView(); if (drawer && drawer.open) { I.apply(drawer); if (current) preview(current.id); else list(); } });
  hero(); stitches(); magnet(); parallax();
  if (motionOn()) $('.hero-mission')?.classList.add('inv-shine');   // menu #20: one light pass over the tagline
  const want = params.get('doc');
  if (want) openDrawer(want);
})();
