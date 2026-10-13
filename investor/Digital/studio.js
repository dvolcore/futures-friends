/* Futures Friends Investor studio (owner 2026-10-12: "more motion graphics, more space, forward thinking when it comes to platform").
   The investor overview as six full-screen views in a Hub-style shell (left rail; a bottom tab bar on phones), one view at a time:
     Overview · Funding · Pilot year · Scenarios · Inside the pilot · Documents.
   - Deep links: ?view=<name> (and #<name>); browser back / forward walk the views. ?view=funding&slice=refinance lifts a slice.
   - View changes cross-fade with the View Transitions API where the browser has it, else a short fade; nothing moves with motion off.
   - Each view's entrance plays once per visit (portal.js FFInvReveal.enter: cards count up one at a time; here the donut draws slice
     by slice, the pilot-year chart draws, both on inv:entrance) and lands at once on a tap, key, wheel or touch-scroll (inv:land).
   - Every figure comes from the verified model (../costs/pilot-budget.json, checked by overview.js) or the published monthly cash
     file (../costs/Pilot_38_Children_Monthly_Cash.csv, checked here against the model row by row). No illustrative shapes.
   - Scenarios use the MODEL's method (investor/tools/build_pilot_budget.py annual_margin / break-even): food and payment-processing fees
     move with enrollment, tuition and collections, anchored to the model's recurring total, so at the planning assumptions the
     explorer shows exactly the published margin and break-even (metrics.year2_margin, metrics.breakeven_tuition).
   - v2269 (owner 2026-10-13, "I need this information back in there ... animated motion interactive"): the Overview is the whole
     dashboard again: the donut and the pilot-year chart are factories (makeDonut / makeYear) drawn twice, on their view and in compact
     form on the Overview, with the same model figures; see "Overview" below. The other views stay as the deep dives.
   - v2270 (owner 2026-10-13, "more like the command center"): the Overview is a command center: a dark command header with the hero
     scene slot, a compact KPI strip and the scenario simulator as its centerpiece, wired live to the pilot-year chart.
   - v2271 (owner 2026-10-13, "Capital command center", his own layout 1:1): the Overview is the owner's mockup: title row, the gold-
     framed meeting banner, five KPI tiles, the basis strip, the capital donut beside the cash-flow lab, the documents dock. The rail
     reads Overview · The ask · Cash flow · Payback · All costs (the cost explorer page) · Evidence; Inside the pilot stays a view
     (?view=inside), reached from Evidence and the Platform tile.
   No library; transform / opacity / stroke only. Loops: the banner's drift and light sweep only (both stopped by every motion
   switch). Sends nothing, stores nothing. */
(function () {
  'use strict';
  const D = document, R = D.documentElement, $ = (s, r = D) => r.querySelector(s), $$ = (s, r = D) => [...r.querySelectorAll(s)];
  const I = window.FFInvI18n || { t: (s) => s, set: (el, s) => { el.textContent = s; }, setAttr: (el, n, s) => el.setAttribute(n, s), lang: () => 'en', onChange() {} };
  const t = I.t;
  const VIEWS = ['overview', 'funding', 'pilot', 'scenarios', 'inside', 'documents'];
  const EASE = 'cubic-bezier(.22,1,.36,1)', DUR = 1400;
  const params = () => new URLSearchParams(location.search);
  const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const motionOn = () => !reduced() && R.dataset.motion !== 'off' && !R.classList.contains('motion-paused');
  const money = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
  const whole = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
  const signed = (s) => s.replace('-', '−');
  const NS = 'http://www.w3.org/2000/svg';
  const svg = (tag, a = {}) => { const n = D.createElementNS(NS, tag); for (const [k, v] of Object.entries(a)) n.setAttribute(k, String(v)); return n; };
  let model = null;

  // ================================================================ the shell: rail, views, deep links, transitions
  const rail = $('.studio-rail');
  let view = VIEWS.includes(R.dataset.view) ? R.dataset.view : 'overview';
  const readView = () => { const p = params().get('view') || location.hash.slice(1); return VIEWS.includes(p) ? p : 'overview'; };
  function urlFor(v, slice) {
    const u = new URL(location.href);
    u.hash = '';
    if (v === 'overview') u.searchParams.delete('view'); else u.searchParams.set('view', v);
    if (slice) u.searchParams.set('slice', slice); else u.searchParams.delete('slice');
    return u;
  }
  function pill() {
    const a = rail && $(`[data-view-link="${view}"]`, rail), p = rail && $('.rail-pill', rail);
    if (!p) return;
    p.classList.toggle('off', !a);   // Inside the pilot has no rail item (reached from Evidence and the Platform tile)
    if (!a) return;
    p.style.setProperty('--x', `${a.offsetLeft}px`); p.style.setProperty('--y', `${a.offsetTop}px`);
    p.style.setProperty('--w', `${a.offsetWidth}px`); p.style.setProperty('--h', `${a.offsetHeight}px`);
  }
  function railSync() {
    for (const a of $$('[data-view-link]', rail)) { if (a.dataset.viewLink === view) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }
    pill();
  }
  function focusHead(v) { const h = $(`[data-studio-view="${v}"] h1, [data-studio-view="${v}"] h2`); if (h) h.focus({ preventScroll: true }); }
  function show(v, { push = true, focus = true, slice = null } = {}) {
    if (!VIEWS.includes(v)) v = 'overview';
    if (push) { try { history.pushState({ studio: v }, '', urlFor(v, slice)); } catch (e) { /* file:// */ } }
    if (v === view) { if (slice) donut.pick(slice, true); return; }
    const swap = () => {
      R.dataset.view = view = v;
      railSync();
      D.dispatchEvent(new CustomEvent('studio:view', { detail: { view: v } }));
      window.FFInvReveal?.enter(v);   // the new view's cards are zeroed before the new frame is captured: no flash of final figures
      if (slice) donut.pick(slice, true);
      scrollTo(0, 0);
    };
    if (motionOn() && typeof D.startViewTransition === 'function') {
      const vt = D.startViewTransition(swap);
      vt.finished.finally(() => { if (focus) focusHead(v); });
    } else {
      swap();
      if (motionOn()) $(`[data-studio-view="${v}"]`)?.animate([{ opacity: 0, transform: 'translate3d(0,14px,0)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: EASE });
      if (focus) focusHead(v);
    }
  }
  D.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('[data-view-link]'); if (!a) return;
    e.preventDefault();
    show(a.dataset.viewLink, { slice: a.dataset.slice || null });
  });
  addEventListener('popstate', () => show(readView(), { push: false, slice: params().get('slice') }));
  addEventListener('hashchange', () => { const h = location.hash.slice(1); if (VIEWS.includes(h)) show(h, { push: false }); });
  addEventListener('resize', pill, { passive: true });
  railSync();
  // the rail pill glides only after the first frame (no slide-in from the corner on load)
  requestAnimationFrame(() => requestAnimationFrame(() => rail?.classList.add('rail-ready')));
  // the fonts change the rail's sizes: place the pill again when they land
  D.fonts?.ready?.then(pill);

  // ================================================================ Funding: "Where the funding goes" donut
  // one donut per host: the Funding view's and the Overview's compact one (same geometry, same model slices)
  function makeDonut({ host, tip, detail, hint, buttons, total: totalEl, deep, onSelect, colors }) {
    const C = 160, RAD = 118, CIRC = 2 * Math.PI * RAD, GAP = 3, LIFT = 12;
    let slices = [], pinned = -1, built = false;
    const wrap = host.parentElement;
    function build(m) {
      const { funding, totals } = m, total = funding.request_before_financing;
      slices = [
        { key: 'deficit', label: 'Peak pilot cash deficit', v: funding.peak_deficit, f: money, color: '#18b89b', desc: 'The largest cumulative gap between pilot receipts and spending over the first 12 months.' },
        { key: 'refinance', label: 'Refinance-enabling allocation', v: totals.refinance, f: whole, color: '#3d6bff', desc: 'Owner-stated refinance-enabling amount. Payoff and lender commitment remain unverified.' },
        { key: 'floor', label: 'Cash floor', v: funding.cash_floor, f: money, color: '#c58a1c', desc: 'A liquidity reserve held alongside the pilot funding. It is not an extra operating expense.' },
        { key: 'contingency', label: 'Contingency', v: totals.contingency, f: money, color: '#8236AE', desc: 'An additional planning buffer included in the preliminary funding calculation.' }
      ];
      let at = 0;
      slices.forEach((s, i) => {
        if (colors && colors[s.key]) s.color = colors[s.key];
        s.share = (s.v / total * 100).toFixed(1) + '%';
        s.len = Math.max(0, (s.v / total) * CIRC - GAP);
        const mid = (-90 + (at + s.v / total / 2) * 360) * Math.PI / 180;
        s.dx = Math.cos(mid) * LIFT; s.dy = Math.sin(mid) * LIFT; s.mid = mid;
        const g = svg('g', { class: 'slice', 'data-slice': s.key });
        const arc = svg('circle', { cx: C, cy: C, r: RAD, class: 'arc', stroke: s.color, 'stroke-dasharray': `${s.len.toFixed(2)} ${CIRC.toFixed(2)}`, transform: `rotate(${(-90 + at * 360).toFixed(3)} ${C} ${C})` });
        arc.style.setProperty('--glow', s.color);
        g.append(arc); host.append(g);
        s.g = g; s.arc = arc;
        g.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') select(i, false); });
        g.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') select(pinned, false); });
        g.addEventListener('click', () => select(pinned === i ? -1 : i, true));
        at += s.v / total;
        const b = buttons[i];
        if (b) {
          $('.lg-val', b).textContent = s.f(s.v);
          $('.lg-share', b).textContent = s.share;
          b.style.setProperty('--c', s.color);
        }
      });
      if (totalEl) totalEl.textContent = money(total);
      built = true;
      const want = deep && params().get('slice');
      if (want) pick(want, true);
    }
    function select(i, pin) {
      if (pin) pinned = i;
      slices.forEach((s, k) => {
        const on = k === i;
        s.g.classList.toggle('on', on); s.g.classList.toggle('dim', i >= 0 && !on);
        s.g.style.setProperty('--dx', on ? `${s.dx.toFixed(2)}px` : '0px'); s.g.style.setProperty('--dy', on ? `${s.dy.toFixed(2)}px` : '0px');
        const b = buttons[k]; if (b) { b.classList.toggle('lit', on); if (pin) b.setAttribute('aria-pressed', String(on && pinned === k)); }
      });
      const s = slices[i];
      onSelect?.(s ? s.key : null);
      if (!s) { tip.hidden = true; detail.textContent = ''; delete detail.dataset.en; hint.hidden = false; return; }
      hint.hidden = true;
      I.set(detail, s.desc);
      tip.innerHTML = `<b data-en="${s.label}">${t(s.label)}</b><span>${s.f(s.v)} · ${s.share}</span>`;
      tip.style.setProperty('--c', s.color);
      tip.hidden = false;
      // the tooltip sits just above (upper slices) or below (lower slices) the ring, over the slice, and never leaves its card
      const box = wrap.getBoundingClientRect(), svgBox = host.getBoundingClientRect(), card = wrap.closest('.panel').getBoundingClientRect(), pad = 12;
      const sc = svgBox.width / 320, cx = svgBox.left - box.left + svgBox.width / 2, cy = svgBox.top - box.top + svgBox.height / 2;
      const up = Math.sin(s.mid) < 0;
      tip.dataset.side = up ? 'above' : 'below';
      let x = cx + Math.cos(s.mid) * RAD * sc, y = up ? cy - (RAD + 30) * sc : cy + (RAD + 30) * sc;
      tip.style.setProperty('--tx', `${x.toFixed(1)}px`); tip.style.setProperty('--ty', `${y.toFixed(1)}px`);
      const tb = tip.getBoundingClientRect();
      if (tb.right > card.right - pad) x -= tb.right - (card.right - pad);
      if (tb.left < card.left + pad) x += (card.left + pad) - tb.left;
      if (tb.top < card.top + pad) y += (card.top + pad) - tb.top;
      if (tb.bottom > card.bottom - pad) y -= tb.bottom - (card.bottom - pad);
      tip.style.setProperty('--tx', `${x.toFixed(1)}px`); tip.style.setProperty('--ty', `${y.toFixed(1)}px`);
    }
    function pick(key, pin) { const i = slices.findIndex((s) => s.key === key); if (i >= 0) select(i, pin !== false); }
    buttons.forEach((b, i) => {
      b.addEventListener('click', () => select(pinned === i ? -1 : i, true));
      b.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && built) select(i, false); });
      b.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && built) select(pinned, false); });
      b.addEventListener('focus', () => { if (built) select(i, false); });
      b.addEventListener('blur', () => { if (built) select(pinned, false); });
      b.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { select(-1, true); return; }
        const k = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key]; if (!k) return;
        e.preventDefault(); buttons[(i + k + buttons.length) % buttons.length].focus();
      });
    });
    I.onChange(() => { if (pinned >= 0) select(pinned, false); });
    // the entrance: the ring draws slice by slice (one REVEAL.duration in all) while portal.js counts the centre total
    let anims = [];
    function draw(animate) {
      anims.forEach((a) => a.cancel()); anims = [];
      if (!animate || !built) return;
      const step = DUR / slices.length;
      slices.forEach((s, i) => anims.push(s.arc.animate([{ strokeDashoffset: s.len }, { strokeDashoffset: 0 }], { duration: step + 160, delay: 250 + i * step, easing: EASE, fill: 'backwards' })));
    }
    const land = () => anims.forEach((a) => a.finish());
    // a part named elsewhere on the page (linked highlighting): lift it without pinning; null returns to the pinned part
    const hover = (key) => { if (!built) return; const i = key ? slices.findIndex((s) => s.key === key) : -1; select(i >= 0 ? i : pinned, false); };
    return { build, pick, draw, land, select, hover, keys: () => slices.map((s) => s.key), get: (key) => slices.find((s) => s.key === key) };
  }
  const donut = makeDonut({ host: $('#allocationArcs'), tip: $('#donutTip'), detail: $('#allocationDescription'), hint: $('#donutHint'), buttons: $$('#allocationControls [data-slice]'), total: $('#donutTotal'), deep: true });

  // ================================================================ Pilot year: the 12 months from the published monthly cash file
  // the published monthly cash file, fetched once for every chart that draws it
  const cashCsv = fetch('../costs/Pilot_38_Children_Monthly_Cash.csv', { cache: 'no-store' }).then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status))))).then((text) => {
    const [head, ...lines] = text.trim().split(/\r?\n/);
    const keys = head.split(',').map((k) => k.trim());
    return lines.map((l) => { const c = l.split(','), o = {}; keys.forEach((k, i) => { o[k] = Number(c[i]); }); return o; });
  }).catch(() => null);
  // phones get a taller canvas and larger labels (the chart is drawn in its own units and scaled to fit)
  const phoneMq = typeof matchMedia === 'function' ? matchMedia('(max-width:767px)') : { matches: false, addEventListener() {} };
  // one chart per host: the Pilot year view's and the Overview's (same drawing, same rows); o = its elements and its view
  // v2270: the Overview's chart is the command center's scenario chart. o.transform(rows) gives the pilot year at the scenario's
  // assumptions (the model's method, studio.js scen); setRows() redraws to it (a short tween with motion on), the published year stays
  // as a faint ghost line. o.envelope(rows) gives the scenario extremes, so the grid is fixed and only the lines move.
  function makeYear(o) {
    // the chart is drawn at its real pixel size (1 unit = 1 CSS px), so labels are true 13-14 px at every width; redrawn on resize
    let W = 960, RGT = 944, TOP = 18, L = 64, BOT = 360, H = 400, step = 72;
    const { chart, scrub, play: playBtn, out } = o;
    const part = (k) => $(`[data-part="${k}"]`, chart);
    let rows = null, shown = null, target = null, x = null, y = null, month = 1, timer = null, wantDraw = false, anims = [], hidden = new Set(), played = false, laidOut = false, tw = 0;
    const spend = (r) => r.recurring + r.one_time;
    // the file and the model must agree on every month, to the cent; otherwise the chart uses the model and says so
    const agree = (a, b) => a.length === b.length && a.every((r, i) => ['month', 'children', 'receipts', 'recurring', 'one_time', 'net', 'cumulative'].every((k) => Math.abs(r[k] - b[i][k]) < 0.005));
    async function build(m) {
      const file = await cashCsv;
      const ok = file && agree(file, m.cash);
      rows = ok ? file : m.cash;
      shown = target = rows;
      chart.dataset.source = ok ? 'csv' : 'model';
      layout();
      if (scrub) scrub.disabled = false;
      select(month);
      if (wantDraw) { wantDraw = false; draw(true); }
    }
    const line = (vals) => vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(' ');
    function layout() {
      if (!rows) return;
      if (!chart.parentElement.clientWidth && laidOut) return;   // hidden view: keep the last drawing until it is shown
      laidOut = true;
      const ph = phoneMq.matches;
      W = Math.max(280, Math.round(chart.parentElement.clientWidth || 960));
      H = o.height ? o.height(W, ph, chart.parentElement) : (ph ? 340 : Math.round(Math.min(440, Math.max(380, W * 0.46))));
      L = ph ? 50 : 64; RGT = W - 10; TOP = o.bottomPad ? 10 : 18; BOT = H - (o.bottomPad || 40);
      chart.setAttribute('viewBox', `0 0 ${W} ${H}`);
      chart.classList.toggle('chart-narrow', (RGT - L) / 12 < 44);
      const sets = [rows, ...(o.envelope ? o.envelope(rows) : [])];
      const top = Math.ceil(Math.max(...sets.flatMap((s) => s.map((r) => Math.max(spend(r), r.receipts)))) / 25000) * 25000, ystep = top / 4;
      const bottom = o.positiveOnly ? 0 : Math.floor(Math.min(0, ...sets.flatMap((s) => s.map((r) => r.net))) / ystep) * ystep;
      step = (RGT - L) / 12; x = (i) => L + step / 2 + i * step;
      y = (v) => BOT - (v - bottom) / (top - bottom) * (BOT - TOP);
      const grid = part('grid'); grid.replaceChildren();
      for (let v = bottom; v <= top + 1; v += ystep) {
        grid.append(svg('line', { x1: L, x2: RGT, y1: y(v).toFixed(2), y2: y(v).toFixed(2), class: v === 0 ? 'chart-zero' : 'chart-grid-line' }));
        if (v >= 0) { const lab = svg('text', { x: L - 12, y: (y(v) + 5).toFixed(2), class: 'chart-grid-label', 'text-anchor': 'end' }); lab.textContent = v === 0 ? '$0' : '$' + Math.round(v / 1000) + 'k'; grid.append(lab); }
      }
      rows.forEach((r, i) => { const lab = svg('text', { x: x(i).toFixed(2), y: BOT + (o.bottomPad ? 20 : 26), class: `chart-month${r.month % 2 ? '' : ' m-even'}`, 'text-anchor': 'middle' }); lab.textContent = o.monthLabel ? o.monthLabel(r.month) : 'M' + String(r.month).padStart(2, '0'); grid.append(lab); });
      const bars = part('bars'); bars.replaceChildren();
      rows.forEach((r, i) => { const b = svg('rect', { rx: 6, class: 'gap-bar' }); b.style.setProperty('--i', i); bars.append(b); });
      for (const k of ['rec', 'spend']) part(k).setAttribute('pathLength', '1');
      for (const [k, vals] of [['recGhost', rows.map((r) => r.receipts)], ['spendGhost', rows.map(spend)]]) part(k)?.setAttribute('d', line(vals));
      part('cursor').setAttribute('y1', TOP - 6); part('cursor').setAttribute('y2', BOT);
      const hits = part('hits'); hits.replaceChildren();
      rows.forEach((r, i) => {
        const hit = svg('rect', { x: (x(i) - step / 2).toFixed(2), y: 0, width: step.toFixed(2), height: H, class: 'cash-hit' });
        hit.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && !dragging) { if (o.hoverStops) pause(); select(r.month); } });
        hits.append(hit);
      });
      paint(shown);
      if (month) select(month);
    }
    // the lines, the area and the gap bars for a set of rows (the published year, a scenario, or a frame between two)
    function paint(vals) {
      if (!x || !vals) return;
      const rec = line(vals.map((r) => r.receipts));
      part('area').setAttribute('d', `${rec} L${x(11).toFixed(2)},${y(0).toFixed(2)} L${x(0).toFixed(2)},${y(0).toFixed(2)} Z`);
      part('rec').setAttribute('d', rec);
      const sp = line(vals.map(spend));
      part('spend').setAttribute('d', sp);
      // the Overview: the monthly gap shaded between the two lines, and a marker on each month
      const ga = part('gapArea');
      if (ga) ga.setAttribute('d', `${sp} ${vals.map((r, i) => `L${x(11 - i).toFixed(2)},${y(vals[11 - i].receipts).toFixed(2)}`).join(' ')} Z`);
      const dots = part('dots');
      if (dots) dots.innerHTML = vals.map((r, i) => `<circle class="m-dot m-rec" cx="${x(i).toFixed(2)}" cy="${y(r.receipts).toFixed(2)}" r="4"/><circle class="m-dot m-spend" cx="${x(i).toFixed(2)}" cy="${y(spend(r)).toFixed(2)}" r="4"/>`).join('');
      const bw = Math.max(10, Math.min(34, step * 0.5));
      $$('.gap-bar', chart).forEach((b, i) => {
        const v = vals[i].net, y0 = y(0), yv = y(v), h = Math.max(1.5, Math.abs(yv - y0));
        b.setAttribute('x', (x(i) - bw / 2).toFixed(2)); b.setAttribute('width', bw.toFixed(2));
        b.setAttribute('y', (v > 0 ? y0 - h : y0).toFixed(2)); b.setAttribute('height', h.toFixed(2));
        b.classList.toggle('pos', v > 0);
      });
      const i = month - 1, r = vals[i];
      if (r) for (const [k, v] of [['recDot', r.receipts], ['spendDot', spend(r)]]) { const d = part(k); d.setAttribute('cx', x(i).toFixed(2)); d.setAttribute('cy', y(v).toFixed(2)); }
    }
    // a new set of rows (a scenario): the chart glides to it (motion on) and the readout shows its exact figures at once
    function setRows(next, animate) {
      if (!rows) return;
      cancelAnimationFrame(tw);
      const from = shown; target = next; chart.classList.toggle('scenario', next !== rows);
      select(month);
      if (!animate || !motionOn() || !x) { shown = next; paint(shown); return; }
      const t0 = performance.now(), d = 420, keys = ['receipts', 'recurring', 'one_time', 'net'];
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / d), e = 1 - Math.pow(1 - p, 3);
        shown = p >= 1 ? next : from.map((r, i) => { const o2 = { ...next[i] }; for (const k of keys) o2[k] = r[k] + (next[i][k] - r[k]) * e; return o2; });
        paint(shown);
        if (p < 1) tw = requestAnimationFrame(tick);
      };
      tw = requestAnimationFrame(tick);
    }
    function select(mo) {
      if (!rows) return;
      month = Math.min(12, Math.max(1, mo));
      const i = month - 1, r = target[i];
      const deficit = Math.max(0, -r.cumulative);
      if (scrub) { scrub.value = month; I.setAttr(scrub, 'aria-valuetext', `Month ${month}, ${r.children} children, cumulative cash deficit ${money(deficit)}`); }
      if (out.month) out.month.textContent = String(month).padStart(2, '0');
      if (out.label) I.set(out.label, o.labelText ? o.labelText(month) : 'Month ' + month);
      if (out.deficit) out.deficit.textContent = money(deficit);
      out.children.textContent = String(r.children);
      out.receipts.textContent = money(r.receipts);
      out.spending.textContent = money(spend(r));
      out.net.textContent = signed(money(r.net));
      out.net.classList.toggle('pos', r.net > 0);
      chart.style.setProperty('--cx', `${(x(i) / W * 100).toFixed(3)}%`);
      const cur = part('cursor'); cur.setAttribute('x1', x(i).toFixed(2)); cur.setAttribute('x2', x(i).toFixed(2));
      const s = shown[i];
      for (const [k, v] of [['recDot', s.receipts], ['spendDot', spend(s)]]) { const d = part(k); d.setAttribute('cx', x(i).toFixed(2)); d.setAttribute('cy', y(v).toFixed(2)); }
      $$('.gap-bar', chart).forEach((b, k) => b.classList.toggle('on', k === i));
      o.onMonth?.(month, r);
    }
    // drag anywhere on the chart to scrub (touch: horizontal drags scrub, vertical ones still scroll the page)
    let dragging = false;
    const monthAt = (e) => { const b = chart.getBoundingClientRect(), px = (e.clientX - b.left) / b.width * W; let best = 1, d = Infinity; for (let i = 0; i < 12; i++) { const dd = Math.abs(x(i) - px); if (dd < d) { d = dd; best = i + 1; } } return best; };
    chart.addEventListener('pointerdown', (e) => { if (!rows) return; dragging = true; chart.setPointerCapture?.(e.pointerId); pause(); select(monthAt(e)); });
    chart.addEventListener('pointermove', (e) => { if (dragging) select(monthAt(e)); });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) chart.addEventListener(ev, () => { dragging = false; });
    if (scrub) scrub.addEventListener('input', () => { pause(); select(Number(scrub.value)); });
    // no scrubber (the Overview): the chart itself takes the arrow keys
    else chart.addEventListener('keydown', (e) => {
      const k = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
      if (!k && e.key !== 'Home' && e.key !== 'End') return;
      e.preventDefault(); pause();
      select(e.key === 'Home' ? 1 : e.key === 'End' ? 12 : month + k);
    });
    // "Play timeline": walks M01 -> M12 once, on request only (never on load); pausable; picks up where it was paused
    const playLabel = (on) => { if (playBtn) { playBtn.setAttribute('aria-pressed', String(on)); I.set($('span', playBtn), on ? 'Pause timeline' : 'Play timeline'); } chart.classList.toggle('playing', on); chart.dataset.playing = String(on); };
    function play() {
      if (!rows) return;
      if (month >= 12) select(1);
      playLabel(true);
      const tick = () => { if (month >= 12) { pause(); return; } select(month + 1); timer = setTimeout(tick, 700); };
      timer = setTimeout(tick, 450);
    }
    function pause() { if (timer) clearTimeout(timer); timer = null; playLabel(false); }
    if (playBtn) playBtn.addEventListener('click', () => (timer ? pause() : play()));
    D.addEventListener('studio:view', (e) => { if (e.detail.view !== o.view) pause(); });
    // Revenue / Expenses / Net cash: what the chart shows (at least one stays on)
    for (const b of o.toggles) b.addEventListener('click', () => {
      const k = b.dataset.series || b.dataset.ovSeries, on = b.getAttribute('aria-pressed') === 'true';
      if (on && hidden.size === 2) return;
      if (on) hidden.add(k); else hidden.delete(k);
      b.setAttribute('aria-pressed', String(!on));
      chart.classList.toggle(`hide-${k}`, on);
      o.mute?.(k)?.classList.toggle('muted', on);
    });
    // the entrance: the lines draw, the gap bars grow month by month, the cursor arrives last; the Overview's chart then walks
    // the year once (o.autoplay: M01 -> M12, motion on only, stops at any touch of the chart or the scrubber)
    function draw(animate) {
      anims.forEach((a) => a.cancel()); anims = [];
      if (!animate) return;
      if (!rows) { wantDraw = true; return; }
      const k = { easing: EASE, fill: 'backwards' };
      for (const id of ['rec', 'spend']) anims.push(part(id).animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { ...k, duration: DUR, delay: 250 }));
      for (const id of ['area', 'gapArea', 'dots']) if (part(id)) anims.push(part(id).animate([{ opacity: 0 }, { opacity: 1 }], { ...k, duration: 700, delay: 250 + DUR * 0.6 }));
      $$('.gap-bar', chart).forEach((b, i) => anims.push(b.animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { ...k, duration: 520, delay: 350 + i * 80 })));
      for (const id of ['cursor', 'recDot', 'spendDot']) anims.push(part(id).animate([{ opacity: 0 }, { opacity: 1 }], { ...k, duration: 400, delay: 250 + DUR }));
      if (o.autoplay && !played) { played = true; const a = anims[anims.length - 1]; a.finished.then(() => { if (motionOn() && !timer && month === 1) play(); }, () => {}); }
    }
    const land = () => { wantDraw = false; played = true; anims.forEach((a) => a.finish()); };
    phoneMq.addEventListener('change', layout);
    D.addEventListener('studio:view', (e) => { if (e.detail.view === o.view) layout(); });
    if (typeof ResizeObserver === 'function') { let lastW = 0, lastH = 0, rt = 0; new ResizeObserver((es) => { const w = Math.round(es[0].contentRect.width), hh = Math.round(es[0].contentRect.height); if (!w || (Math.abs(w - lastW) < 2 && (!o.height || Math.abs(hh - lastH) < 2))) return; lastW = w; lastH = hh; clearTimeout(rt); rt = setTimeout(layout, 120); }).observe(chart.parentElement); }
    I.onChange(() => { if (rows) select(month); });
    return { build, draw, land, select, pause, setRows, rows: () => rows, shown: () => target, month: () => month };
  }
  const year = makeYear({ chart: $('#cashChart'), scrub: $('#monthScrubber'), play: $('#playTimeline'), toggles: $$('[data-series]'), view: 'pilot',
    out: { month: $('#cashMonth'), label: $('#monthLabel'), deficit: $('#cashDeficit'), children: $('#cashChildren'), receipts: $('#cashReceipts'), spending: $('#cashSpending'), net: $('#cashNet') },
    mute: (k) => $(`.mc-${{ revenue: 'rev', expenses: 'exp', gap: 'gap' }[k]}`) });

  // a figure that glides to its new value as a slider moves (motion on), else jumps; always ends on the exact text
  function makeCounter(out) {
    let shown = null, raf = 0;
    const write = (v) => { out.textContent = signed(money(v)); };
    return {
      reset() { shown = null; },
      to(to) {
        cancelAnimationFrame(raf);
        const from = shown == null ? to : shown;
        if (!motionOn() || from === to) { shown = to; write(to); return; }
        const t0 = performance.now(), d = 360;
        out.classList.add('counting');
        const tick = (now) => {
          const p = Math.min(1, (now - t0) / d), e = 1 - Math.pow(1 - p, 3);
          shown = p >= 1 ? to : from + (to - from) * e;
          write(p >= 1 ? to : Math.round(shown * 100) / 100);
          if (p < 1) raf = requestAnimationFrame(tick); else out.classList.remove('counting');
        };
        raf = requestAnimationFrame(tick);
      }
    };
  }

  // v2281 (re-audit): a KPI headline that would run under the corner badge shrinks to fit its column (any width, any language)
  const fitKpis = () => {
    for (const v of $$('#kpis .kpi .kpi-v')) {
      v.style.fontSize = ''; v.style.lineHeight = '';
      const cs = getComputedStyle(v), lh = cs.lineHeight;
      let size = parseFloat(cs.fontSize), guard = 0;
      // the line keeps its height, so a shrunk headline never moves the chart below it
      while (v.scrollWidth > v.clientWidth + 0.5 && size > 12 && guard++ < 40) { size -= 0.5; v.style.fontSize = size + 'px'; v.style.lineHeight = lh; }
    }
  };
  let fitRaf = 0; const fitSoon = () => { cancelAnimationFrame(fitRaf); fitRaf = requestAnimationFrame(fitKpis); };
  if ($('#kpis')) {
    new MutationObserver(fitSoon).observe($('#kpis'), { subtree: true, childList: true, characterData: true });
    addEventListener('resize', fitSoon); I.onChange(fitSoon); fitSoon();
  }

  // ================================================================ Scenarios: the model's method, live
  const scen = (() => {
    const tu = $('#scenarioTuition'), ch = $('#scenarioChildren'), co = $('#scenarioCollection'), reset = $('#scenarioReset');
    const out = $('#scenarioMargin'), sr = $('#scenarioMarginSr');
    let calc = null, srTimer = 0;
    const counter = makeCounter(out);
    // the model (build_pilot_budget.py): payment fees per collected tuition payment = 95% ACH at 0.8% capped at $5, 5% card at
    // 2.9% + $0.30, plus 0.7% recurring billing; food at the per-child-day model, capped at the owner's food allowance (v5.1:
    // recurring_components.food_cap_annual, $2,000/month); everything else fixed.
    function method(m) {
      const rc = m.recurring_components, a = m.assumptions;
      const fees = (n, tt, c) => { const tr = n * 12 * c; return tr * (0.95 * Math.min(tt * 0.008, 5) + 0.05 * (tt * 0.029 + 0.30)) + tr * tt * 0.007; };
      const variable = (n) => (rc.food_cap_annual == null ? n * rc.service_days * rc.variable_per_child_day
        : Math.min(rc.food_fixed_annual + n * rc.service_days * rc.variable_per_child_day, rc.food_cap_annual));
      // v2276: the generator's own arithmetic (annual_margin): fixed_annual + food + fees rounded to the cent (half-up, like Python's
      // Decimal ROUND_HALF_UP), margin rounded to the cent, so every sensitivity row and the plan match the model exactly
      const r2 = (v) => (v < 0 ? -1 : 1) * Math.round(Math.abs(v) * 100 + 1e-6) / 100;
      const CAP = a.capacity || 38;   // full enrollment
      const base = rc.fixed_annual != null ? rc.fixed_annual : m.totals.recurring - variable(CAP) - fees(CAP, a.tuition, a.collection);
      // hire as enrolled (staffing.hiring_rule): below full enrollment fewer caregivers are on payroll, at the model's all-in cost each
      const st = m.staffing || {}, rule = st.hiring_rule || [];
      const carers = (n) => { const hit = rule.find((x) => n <= x.up_to_children) || rule[rule.length - 1]; return hit ? hit.caregivers : 0; };
      const staffAdj = (n) => (rule.length && st.caregiver_annual_all_in ? (carers(n) - carers(CAP)) * st.caregiver_annual_all_in : 0);
      const cost = (n, tt, c) => base + staffAdj(n) + variable(n) + r2(fees(n, tt, c));
      const margin = (n, tt, c) => r2(n * tt * 12 * c - cost(n, tt, c));
      const breakEven = (n, c) => { let lo = 0, hi = 5000; for (let k = 0; k < 60; k++) { const mid = (lo + hi) / 2; if (margin(n, mid, c) < 0) lo = mid; else hi = mid; } return Math.round(hi * 100) / 100; };
      return { base, margin, breakEven, cost, variable, fees, staffAdj, revenue: (n, tt, c) => n * tt * 12 * c, assumptions: a };
    }
    function update() {
      if (!calc) return;
      const tt = Number(tu.value), n = Number(ch.value), c = Number(co.value) / 100;
      const margin = calc.margin(n, tt, c), revenue = calc.revenue(n, tt, c), be = calc.breakEven(n, c);
      $('#tuitionOutput').textContent = whole(tt); $('#childrenOutput').textContent = String(n); $('#collectionOutput').textContent = Math.round(c * 100) + '%';
      counter.to(margin);
      clearTimeout(srTimer); srTimer = setTimeout(() => { sr.textContent = signed(money(margin)); }, 300);
      $('#scenarioRevenue').textContent = money(revenue);
      $('#scenarioBreakEven').textContent = money(be);
      I.set($('#scenarioStatus'), margin >= 0 ? 'Operating surplus · building payments & debt excluded' : 'Operating shortfall · building payments & debt excluded');
      $('.scenario-result').classList.toggle('positive', margin >= 0);
      $('#marginIndicator').style.left = Math.max(3, Math.min(97, 50 + margin / model.totals.recurring * 100)) + '%';
      const scale = Math.max(1700, tt, be);
      $('#scenTuitionBar').style.setProperty('--s', (tt / scale).toFixed(4));
      $('#scenBreakBar').style.setProperty('--s', (be / scale).toFixed(4));
      const rows = [whole(tt), money(be), signed(money(margin)), money(revenue)];
      $$('#scenarioTable tbody td').forEach((td, i) => { td.textContent = rows[i]; });
    }
    function build(m) {
      calc = method(m);
      for (const el of [tu, ch, co]) { el.disabled = false; el.addEventListener('input', update); }
      reset.disabled = false;
      reset.addEventListener('click', () => { tu.value = m.assumptions.tuition; ch.value = m.assumptions.capacity || 38; co.value = Math.round(m.assumptions.collection * 100); update(); });
      tu.value = m.assumptions.tuition; ch.value = m.assumptions.capacity || 38; co.value = Math.round(m.assumptions.collection * 100);
      table();
      counter.reset(); update();
      sr.textContent = out.textContent;
    }
    // "Show as table" for the scenario bars (the same values, as text)
    function table() {
      const host = $('.scenario-result'); if (!host || $('#scenarioTable')) return;
      const heads = ['Monthly tuition', 'Break-even / child', 'Annual operating margin', 'Annual receipts'];
      const wrapT = D.createElement('div'); wrapT.className = 'inv-table-wrap'; wrapT.id = 'scenarioTable'; wrapT.hidden = true;
      wrapT.innerHTML = `<table class="inv-table" aria-labelledby="scenarioTable-cap"><caption id="scenarioTable-cap" data-en="This scenario">${t('This scenario')}</caption><thead><tr><th scope="col" data-en="Item">${t('Item')}</th><th scope="col" data-en="Amount">${t('Amount')}</th></tr></thead><tbody>${heads.map((h) => `<tr><th scope="row" data-en="${h}">${t(h)}</th><td></td></tr>`).join('')}</tbody></table>`;
      const btn = D.createElement('button'); btn.type = 'button'; btn.className = 'as-table'; btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', 'scenarioTable');
      btn.dataset.en = 'Show as table'; btn.textContent = t('Show as table');
      btn.addEventListener('click', () => { const open = wrapT.hidden; wrapT.hidden = !open; btn.setAttribute('aria-expanded', String(open)); I.set(btn, open ? 'Hide table' : 'Show as table'); });
      $('.scenario-sub', host).after(btn, wrapT);
    }
    return { build, method: () => calc };
  })();

  // ================================================================ Inside the pilot: the curriculum preview (the published concept art only)
  (() => {
    // opened from Inside the pilot (#curriculumOpen) and from the Overview's card ([data-curriculum-open]); focus returns to the opener
    const dlg = $('#curriculumPreview'), btns = $$('#curriculumOpen, [data-curriculum-open]'); if (!dlg || !btns.length) return;
    let btn = btns[0];
    const close = () => { if (!dlg.open) return; dlg.close(); btn.focus(); };
    for (const b of btns) b.addEventListener('click', () => { btn = b; dlg.showModal(); $('[data-close]', dlg).focus(); if (motionOn()) $('.cd-sheet', dlg).animate([{ opacity: 0, transform: 'translate3d(0,24px,0) scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: EASE }); });
    dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target.closest('[data-close]')) close(); });
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
  })();

  // ================================================================ Overview: the capital command center (owner 2026-10-13, v2271)
  // The owner's own layout, 1:1: title row, the gold-framed meeting banner, five KPI tiles, the basis strip with the repayment warning,
  // "Where your capital goes" (donut + the selected part + four rows) beside the "Cash flow & scenario lab" (receipts vs total spending,
  // month snapshot), the key documents dock and the footer line. Every tile and panel opens its deep dive; the scenario sliders live
  // on the Payback view. Every figure is the model's (pilot-budget.json) or the published monthly cash file's.
  // Motion (motion on only): the KPI tiles count one at a time (portal.js reveal), panels rise one after another, the donut draws
  // and lights the part you pick, the chart draws then walks the twelve months once (hover, a tap or the arrow keys take over),
  // the banner drifts slowly under a soft light sweep. Reduce Motion, the site's motion switch, "Pause motion" and ?reveal=off:
  // everything static and final.
  const ov = (() => {
    const root = $('#cc'); if (!root) return { build() {} };
    const cards = $$('[data-ov-card]', root);
    const armed = motionOn() && params().get('reveal') !== 'off';
    if (armed) R.classList.add('ovd-armed');
    let ready = false, mdl = null; const seen = new Set(), enders = [];
    // linked highlighting: the funding total (KPI 01) lights while its parts are in focus
    const link = (key) => $$('[data-link]').forEach((el) => el.classList.toggle('linked', !!key && el.dataset.link === key));
    // the selected part: the ring's centre shows its share, the headline its figure and what it covers (default: the pilot deficit)
    const hl = (key) => {
      const s = ovDonut.get(key || 'deficit'); if (!s) return;
      $('#ovDonutPct').textContent = s.share;
      I.set($('#ovHlLabel'), s.label);
      $('#ovHlValue').textContent = s.f(s.v);
      I.set($('#ovHlDesc'), s.desc);
      $('.cap-alloc').style.setProperty('--sel', s.color);
      link(key ? 'funding' : null);
    };
    const ovDonut = makeDonut({ host: $('#ovArcs'), tip: $('#ovDonutTip'), detail: $('#ovDonutDetail'), hint: $('#ovDonutHint'), buttons: $$('#ovLegend [data-ov-slice]'), onSelect: (k) => { if (ready) hl(k); },
      colors: ({ navy: { deficit: '#2ee6a8', refinance: '#5b8cff', floor: '#ff9d42', contingency: '#b98cff' }, money: { deficit: '#5cecff', refinance: '#6f8dff', floor: '#ffb340', contingency: '#d6a1ff' },
        // scene (default): the picture's colours: screen cyan, suit blue, lamp orange, purple-flower lilac
        scene: { deficit: '#0bd9dc', refinance: '#4d5ef2', floor: '#eba347', contingency: '#a685d4' },
        royal: { deficit: '#0bd9dc', refinance: '#7b8cff', floor: '#eba347', contingency: '#c48cff' },
        gold: { deficit: '#0bd9dc', refinance: '#7b8cff', floor: '#eba347', contingency: '#c48cff' } })[R.dataset.theme] || (/^blend-/.test(R.dataset.theme) ? { deficit: '#0bd9dc', refinance: '#7b8cff', floor: '#eba347', contingency: '#c48cff' } : undefined) });
    const ovYear = makeYear({ chart: $('#ovChart'), toggles: [], view: 'overview', autoplay: true, hoverStops: true, positiveOnly: true,
      height: (w, ph) => (ph ? 200 : Math.round(Math.max(100, Math.min(w * 0.27, 12 * Math.min(innerWidth / 100, innerHeight * 0.015))))), bottomPad: 28,
      monthLabel: (m) => String(m), labelText: (m) => `Month ${String(m).padStart(2, '0')} snapshot`,
      out: { label: $('#ovMonthLabel'), children: $('#ovChildrenM'), receipts: $('#ovReceipts'), spending: $('#ovSpending'), net: $('#ovNet') } });
    const text = (id, v) => { const el = $(`#${id}`); if (el) el.textContent = v; };

    // ---- the hero (v2272, owner: "you could've just used a full image all the way across the top"). ONE constant picks the art:
    // data-scene on #ccScene (index.html). The picture runs full bleed across the top of the page, from the sidebar to the window's
    // right edge, its full width shown (never narrowed, never blurred at the sides). Each scene names the band every character occupies
    // (top of the highest ear .. the lowest chin, as fractions of the picture's height, measured on the file): the hero shows the
    // picture from its top down to the band's foot (+3%), so every head is whole, and the title sits over the ceiling above the band.
    // On a short screen the hero trims ceiling from the top (never a face under the title). The only blends: into the sidebar on the left and
    // into the page under the KPI tiles. Phones: the title above, the whole picture below.
    const AIR = 0.03;
    const SCENES = {
      // cast-2 (default, owner's pick): the packed full cast, every seat filled; the giraffe's ossicones are the top-most point
      //   (19%), the lowest chin (the frog, front right) 72%.
      'cast-2': { file: 'investor-meeting-cast-2', band: [0.19, 0.72], show: 0.84 },   // v2273: down to the table's front edge
      'cast-1': { file: 'investor-meeting-cast-1', band: [0.155, 0.72] },
      'glam-1': { file: 'investor-meeting-glam-1', band: [0.165, 0.585] }, 'glam-2': { file: 'investor-meeting-glam-2', band: [0.15, 0.585] },
      'wide-1': { file: 'investor-meeting-wide-1', band: [0.165, 0.61] }, 'wide-2': { file: 'investor-meeting-wide-2', band: [0.077, 0.612] }
    };
    const scene = (() => {
      const fig = $('#ccScene'), img = $('#ccSceneImg');
      if (!fig || !img) return {};
      const cfg = SCENES[fig.dataset.scene] || SCENES['cast-2'];
      const hero = fig.closest('.cap-hero') || fig, head = $('.cap-head', hero);
      let nat = Number(img.getAttribute('width')) / Number(img.getAttribute('height')), last = '';
      // the hero's height: the picture from its top down to the scene's 'show' line (cast-2: the table's front edge), so every
      // head and the front row's bodies are whole; the title sits over the ceiling, above the highest head.
      // v2279 (owner: no rail panel, the picture full width, the assets on top): the rail's links start just under the picture, so no
      // word ever sits on a character, and glide up to the top as the page scrolls (one rAF per scroll)
      let rt = 0;
      function railTop() { cancelAnimationFrame(rt); rt = requestAnimationFrame(() => { const h = parseFloat(R.style.getPropertyValue('--hero-px')) || 0; R.style.setProperty('--rail-top', `${Math.max(14, Math.round(h + 14 - scrollY))}px`); }); }
      addEventListener('scroll', railTop, { passive: true });
      const frame = () => {
        const footF = Math.min(1, (cfg.show || cfg.band[1]) + AIR), W = hero.clientWidth;
        fig.style.setProperty('--nat', String(nat));
        hero.style.setProperty('--ar', String(nat / footF));
        const overlay = head && getComputedStyle(head).position === 'absolute';
        if (!W || !overlay) { hero.style.removeProperty('--hero-h'); hero.style.removeProperty('--img-top'); return; }
        const Himg = W / nat, natural = Himg * footF, headBottom = head.offsetTop + head.offsetHeight + 6;
        // v2273 (owner: "we have plenty of room at the bottom"): the page may scroll, so the hero always shows its whole frame; if a
        // title ever reached the highest head, the picture moves down under it by the overlap (a safety net)
        const push = Math.max(0, Math.ceil(headBottom - cfg.band[0] * Himg)), H = Math.round(natural + push);
        const key = `${H}|${push}`;
        if (key === last) return;
        last = key;
        hero.style.setProperty('--hero-h', `${H}px`);
        R.style.setProperty('--hero-px', `${H}px`); railTop();
        hero.style.setProperty('--img-top', `${push}px`);
        hero.dataset.push = String(push);
      };
      frame();
      img.sizes = '(max-width: 767px) 100vw, 90vw';
      img.srcset = `assets/${cfg.file}-1200.webp 1200w, assets/${cfg.file}.webp 2400w`;
      img.src = `assets/${cfg.file}.webp`;
      const loaded = () => { nat = img.naturalWidth / img.naturalHeight; frame(); fig.classList.add('ready'); };
      if (img.complete && img.naturalWidth) loaded(); else img.addEventListener('load', loaded, { once: true });
      if (typeof ResizeObserver === 'function') new ResizeObserver(() => frame()).observe(hero);
      addEventListener('resize', frame, { passive: true });
      D.fonts?.ready?.then(frame);
      return { cfg, frame };
    })();

    // ---- the six tile charts (v2276). viewBox 120 x 34 unless noted; every shape is a model figure.
    function tileCharts(m) {
      const { funding, totals, platform, cash, metrics } = m;
      // v2281: chart values are the model's amounts to the cent (no floating-point tails in data-v)
      const put = (id, html) => { const el = $(`#${id}`); if (el) { el.innerHTML = html; for (const n of $$('[data-v]', el)) { const v = Number(n.dataset.v); if (Number.isFinite(v)) n.dataset.v = String(Math.round(v * 100) / 100); } } return el; };
      const f1 = (v) => v.toFixed(1);
      // 01 the funding ask: its four parts, one stacked bar filling in part by part, a scan line passing over it
      const parts = [['deficit', funding.peak_deficit], ['refinance', totals.refinance], ['floor', funding.cash_floor], ['contingency', totals.contingency]];
      const total = funding.request_before_financing;
      let x = 0;
      put('kpiFundChart', `<rect class="tc-track" x="0" y="11" width="120" height="13" rx="6.5"/>` + parts.map(([k, v], i) => { const w = v / total * 120, r = `<rect class="tc-seg tc-${k}" data-v="${v}" x="${f1(x)}" y="11" width="${f1(Math.max(0.8, w - 1))}" height="13" rx="3" style="--i:${i}"/>`; x += w; return r; }).join('') + `<rect class="tc-scan" x="0" y="8" width="6" height="19" rx="3"/>`);
      // 02 revenue: the twelve months' receipts as rising bars; one bar at a time lights up (the clock)
      const maxRec = Math.max(...cash.map((r) => r.receipts));
      put('kpiRevSpark', cash.map((r, i) => { const h = r.receipts / maxRec * 30; return `<rect class="tc-bar" data-v="${r.receipts}" x="${f1(i * 10 + 1)}" y="${f1(33 - h)}" width="8" height="${f1(h)}" rx="2" style="--i:${i}"/>`; }).join(''));
      // 03 full enrollment: the ramp as a step line (30 -> 34 -> 36 -> 38 ...), a dot travelling along it, a child popping at each step up
      const kids = cash.map((r) => r.children), lo = Math.min(...kids), hi = Math.max(...kids), ky = (c) => 29 - (c - lo) / ((hi - lo) || 1) * 23;
      const d = kids.map((c, i) => `${i ? 'H' : 'M0,'}${i ? f1(i * 10) : f1(ky(c))}${i ? ` V${f1(ky(c))}` : ''}`).join(' ') + ' H120';
      const pops = kids.map((c, i) => (i === 0 || c > kids[i - 1] ? `<circle class="tc-kid" data-v="${c}" cx="${f1(i * 10 + (i ? 0 : 3))}" cy="${f1(ky(c) - 4.5)}" r="2.6" style="--i:${i}"/>` : '')).join('');
      put('kpiRamp', `<path class="tc-step" d="${d}" pathLength="1"/>${pops}<circle class="tc-dot" cx="0" cy="${f1(ky(kids[0]))}" r="3.2"/>`);
      // 04 the operating margin: each month's operating result (receipts - recurring) rising to the full-enrollment month, x 12 = the tile
      const op = cash.map((r) => r.receipts - r.recurring), opLo = Math.min(0, ...op), opHi = Math.max(...op), oy = (v) => 31 - (v - opLo) / ((opHi - opLo) || 1) * 27;
      const pts = op.map((v, i) => `${f1(i * 120 / 11)},${f1(oy(v))}`);
      put('kpiMarginChart', `<line class="tc-zero" x1="0" x2="120" y1="${f1(oy(0))}" y2="${f1(oy(0))}"/><path class="tc-area" d="M0,${f1(oy(opLo))} L${pts.join(' L')} L120,${f1(oy(opLo))} Z"/><path class="tc-line" d="M${pts.join(' L')}" pathLength="1"/><circle class="tc-end" data-v="${op[op.length - 1]}" cx="120" cy="${f1(oy(op[op.length - 1]))}" r="3.4"/>`);
      // 05 cash-positive months: each month's net cash, red below the zero line and green above, growing out of the line; a marker at
      // the first cash-positive month
      // a square-root scale on both sides of the zero line (sign and order kept) so the months above zero stay visible next to month 1
      const nets = cash.map((r) => r.net), rt = (v) => Math.sqrt(Math.abs(v)), up = Math.max(0, ...nets.map((v) => (v > 0 ? rt(v) : 0))), dn = Math.max(0, ...nets.map((v) => (v < 0 ? rt(v) : 0)));
      const zy = Math.min(30, Math.max(4, 2 + 30 * up / ((up + dn) || 1))), sc = (v) => (v > 0 ? rt(v) / (up || 1) * (zy - 2) : rt(v) / (dn || 1) * (32 - zy));
      const first = cash.findIndex((r) => r.net > 0);
      put('kpiGapSpark', `<line class="tc-zero" x1="0" x2="120" y1="${f1(zy)}" y2="${f1(zy)}"/>` + (first >= 0 ? `<line class="tc-mark" x1="${f1(first * 10 + 5)}" x2="${f1(first * 10 + 5)}" y1="0" y2="34"/>` : '') + nets.map((v, i) => { const h = Math.max(1.2, Math.abs(sc(v))); return `<rect class="tc-net ${v > 0 ? 'up' : 'down'}" data-v="${v}" x="${f1(i * 10 + 1.5)}" y="${f1(v > 0 ? zy - h : zy)}" width="7" height="${f1(h)}" rx="1.5" style="--i:${i}"/>`; }).join(''));
      // 06 platform, year one: the ring of its parts (completion, assurance, support, hosting), drawn segment by segment
      const support = Math.round((platform.recurring - platform.hosting) * 100) / 100;
      const ring = [['build', platform.completion], ['assure', platform.assurance_one_time], ['support', support], ['host', platform.hosting]];
      const C = 2 * Math.PI * 12; let at = 0;
      const el6 = put('kpiPlatChart', `<circle class="tc-ring-track" cx="17" cy="17" r="12"/>` + ring.map(([k, v], i) => { const len = v / platform.first_year * C, a = `<circle class="tc-arc tc-${k}" data-v="${v}" cx="17" cy="17" r="12" stroke-dasharray="${(len - 0.8).toFixed(2)} ${C.toFixed(2)}" transform="rotate(${(-90 + at / C * 360).toFixed(2)} 17 17)" style="--i:${i};--len:${(len - 0.8).toFixed(2)}"/>`; at += len; return a; }).join('') + `<circle class="tc-ring-spin" cx="17" cy="17" r="15.5"/>` + ring.map(([k, v], i) => `<rect class="tc-leg tc-${k}" x="40" y="${f1(3 + i * 7.6)}" width="${f1(4 + v / platform.completion * 74)}" height="5" rx="2.5" style="--i:${i}"/>`).join(''));
      if (el6) el6.setAttribute('preserveAspectRatio', 'xMinYMid meet');
      void metrics;
    }
    // ---- one clock for every tile's ambient motion (no CSS loops: the page keeps its few ambient animations). ~30 fps while the tiles
    // are on screen, the tab is visible and motion is on; stopped (and left at its final drawing) by Reduce Motion, the motion switch,
    // Pause motion and ?reveal=off.
    const tileMotion = (() => {
      const host = $('#kpis'); if (!host) return { start() {} };
      let raf = 0, on = false, visible = true, last = 0, t0 = 0, bar = -1;
      const allowed = () => motionOn() && params().get('reveal') !== 'off';
      function frame(now) {
        raf = requestAnimationFrame(frame);
        if (now - last < 33) return; last = now;
        const t = ((now - t0) / 6000) % 1;
        host.style.setProperty('--clk', t.toFixed(4));
        const scan = $('#kpiFundChart .tc-scan'); if (scan) scan.setAttribute('x', (t * 126 - 6).toFixed(1));
        const bars = $$('#kpiRevSpark .tc-bar'), b = Math.floor(t * 12) % 12;
        if (b !== bar && bars.length) { bars.forEach((r, i) => r.classList.toggle('lit', i === b)); bar = b; }
        const path = $('#kpiRamp .tc-step'), dot = $('#kpiRamp .tc-dot');
        if (path && dot && path.getTotalLength) { const L = path.getTotalLength(), p = path.getPointAtLength(L * t); dot.setAttribute('cx', p.x.toFixed(1)); dot.setAttribute('cy', p.y.toFixed(1)); }
      }
      function run() { if (raf || !on || !visible || document.hidden || !allowed()) return; t0 = performance.now(); raf = requestAnimationFrame(frame); host.classList.add('tiles-live'); }
      function stop() { cancelAnimationFrame(raf); raf = 0; host.classList.remove('tiles-live'); }
      if (typeof IntersectionObserver === 'function') new IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting); if (visible) run(); else stop(); }).observe(host);
      document.addEventListener('visibilitychange', () => (document.hidden ? stop() : run()));
      D.addEventListener('inv:motion', (e) => { if (e.detail?.paused) stop(); else run(); });
      return { start() { on = true; run(); }, stop };
    })();

    function build(m) {
      mdl = m;
      const { totals, platform, assumptions, metrics, cash } = m;
      ovDonut.build(m);
      ovYear.build(m);
      text('kpiRefi', whole(totals.refinance)); text('kpiGap', signed(money(metrics.year2_margin))); text('kpiPlatform', money(platform.first_year));
      // v2272 KPI row (owner: "key information at a first glance"), every figure from the model:
      const full = Math.max(...cash.map((r) => r.children)), fullAt = cash.findIndex((r) => r.children === full) + 1;
      text('kpiRevenue', whole(metrics.full_enrollment_receipts)); text('kpiRevKids', String(full)); text('kpiRevTuition', whole(assumptions.tuition)); text('kpiRevColl', Math.round(assumptions.collection * 100) + '%');
      text('kpiFullMonth', String(fullAt)); text('kpiFullKids', String(full)); text('kpiRampFrom', String(cash[0].children)); text('kpiRampTo', String(full));
      // v2274 (model v5): the operating margin at today's tuition, before building payments and debt
      text('kpiProfitSign', metrics.year2_margin >= 0 ? '+' : '−'); text('kpiProfit', whole(Math.round(Math.abs(metrics.year2_margin))));
      text('kpiTodayTuition', whole(assumptions.tuition));
      // the owner-confirmed weekly price (2026-10-13): $210/week, $910/month via 52/12
      const weekly = assumptions.tuition_weekly || Math.round(assumptions.tuition * 12 / 52);
      text('kpiTodayWeek', whole(weekly)); text('kpiRevWeek', whole(weekly));
      // v2276 (owner: "these tabs need to be digital ... animated motion graphics ... make them different colors so we can see it go up"):
      // an animated chart in every KPI tile, each drawn from the model (no invented numbers). They grow in as their tile counts up
      // (CSS, .inv-play) and then breathe on one shared clock (tileMotion below): a scan, a moving highlight, a travelling dot.
      tileCharts(m);
      const g1 = Math.abs(cash[0].net), g12 = Math.abs(cash[cash.length - 1].net);
      const posAt = cash.find((r) => r.net > 0);
      if (posAt) text('kpiPosMonth', String(posAt.month));
      void g12;
      const plus = (v) => (v > 0 ? '+' : '') + signed(money(v));
      text('kpiGapFirst', plus(cash[0].net)); text('kpiGapLast', plus(cash[cash.length - 1].net));
      text('kpiGapM1', String(cash[0].month)); text('kpiGapM12', String(cash[cash.length - 1].month));
      text('capacity', String(Math.max(...cash.map((r) => r.children)))); text('pilotDuration', String(cash.length)); text('collections', Math.round(assumptions.collection * 100) + '%');
      ready = true;
      hl(null);
      seen.forEach(play);
      // the tiles' ambient motion starts once the reveal has landed them (or at once when there is no reveal)
      const go = () => tileMotion.start();
      if (window.FFInvReveal?.running()) { const w = setInterval(() => { if (!window.FFInvReveal.running()) { clearInterval(w); go(); } }, 300); } else go();
    }
    // a panel on screen: it rises (CSS, .ovd-in); once the model is in, its figures count and its picture draws
    function play(card) {
      if (card.dataset.ovPlayed) return;
      card.dataset.ovPlayed = '1';
      const go = armed && motionOn();
      if (go && window.FFInvReveal?.count) enders.push(window.FFInvReveal.count($$('[data-ov-count]', card)));
      if (card.classList.contains('ovd-funding')) ovDonut.draw(go);
      if (card.classList.contains('ovd-year')) ovYear.draw(go);
    }
    let order = 0;
    function enter(card) {
      // panels that arrive together rise one after another (110 ms apart)
      card.style.setProperty('--ovd-delay', `${armed ? (order++) * 110 : 0}ms`);
      card.classList.add('ovd-in');
      seen.add(card);
      if (ready) play(card);
    }
    function landAll() {
      cards.forEach((c) => c.classList.add('ovd-in'));
      enders.splice(0).forEach((end) => end && end());
      ovDonut.land(); ovYear.land();
    }
    if (armed && typeof IntersectionObserver === 'function') {
      const io = new IntersectionObserver((es) => { es.filter((e) => e.isIntersecting).forEach((e) => { io.unobserve(e.target); enter(e.target); }); order = 0; }, { threshold: 0.12 });
      cards.forEach((c) => io.observe(c));
    } else cards.forEach(enter);
    D.addEventListener('inv:land', (e) => { if (e.detail.all) landAll(); });
    D.addEventListener('inv:motion', (e) => { if (e.detail?.paused) { landAll(); ovYear.pause(); } });
    I.onChange(() => { if (ready) hl(ovDonut.keys().find((k) => $(`#ovLegend [data-ov-slice="${k}"]`)?.getAttribute('aria-pressed') === 'true') || null); });
    // every panel opens its deep dive: a click on the panel itself (not on one of its controls) follows the panel's own link
    root.addEventListener('click', (e) => {
      if (e.defaultPrevented || e.button !== 0) return;
      const card = e.target.closest('[data-ov-card]');
      if (!card || e.target.closest('a, button, input, label, select, summary, .ovd-chart, .ovd-donut-wrap, [data-ov-slice]')) return;
      if (String(getSelection?.() || '').trim()) return;   // selecting text is not a click
      if (card.classList.contains('ovd-docs')) { window.FFInvDocs?.open(null, $('[data-docs-open]')); return; }
      if (card.dataset.ovGo) show(card.dataset.ovGo);
    });
    // a KPI tile opens its deep dive too (its arrow is the link)
    for (const k of $$('#kpis .kpi')) k.addEventListener('click', (e) => { if (e.defaultPrevented || e.button !== 0 || e.target.closest('a')) return; $('.kpi-go', k)?.click(); });
    return { build, scene: () => scene, year: () => ovYear };
  })();

  // ================================================================ Profit lab (v2273, owner: "I don't see any graphics, widgets, charts, sliders")
  // A scenario explorer on the Overview: tuition, children and collections sliders and two cost levers, with live outputs. Every number
  // is the model's: the margin and break-even use the model's method (scen.method(): food and payment fees move with enrollment, tuition
  // and collections, so the defaults give exactly metrics.year2_margin and metrics.breakeven_tuition, and every sensitivity row to the
  // cent); the levers' amounts are summed from the itemized budget (../costs/Pilot_38_Children_Itemized.csv), the year-1 deficit replays
  // the published monthly cash rows at your assumptions (planning assumptions = the published peak deficit). v2274 (model v5): the
  // owner is the unpaid director; a 'Pay a director' lever adds the market director's all-in cost (model.reference).
  // Charts: the margin waterfall, a break-even gauge, the enrollment ramp and where each operating dollar goes; they grow in on scroll-in
  // with motion on and are static otherwise. Nothing is stored; Reset returns to the plan.
  const lab = (() => {
    const root = $('#profitLab'); if (!root) return { build() {} };
    const tu = $('#labTuition'), ch = $('#labChildren'), co = $('#labCollection'), reset = $('#labReset');
    const levers = $$('[data-lever]', root);
    const counter = makeCounter($('#labMargin'));
    let calc = null, m = null, amounts = {}, srTimer = 0;
    // the itemized budget: a small CSV reader (quoted fields may hold commas)
    const parseCsv = (text) => {
      const out = []; let row = [], cell = '', q = false;
      for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; continue; }
        if (c === '"') q = true; else if (c === ',') { row.push(cell); cell = ''; } else if (c === '\n') { row.push(cell); out.push(row); row = []; cell = ''; } else if (c !== '\r') cell += c;
      }
      if (cell || row.length) { row.push(cell); out.push(row); }
      const [head, ...rows] = out; return rows.filter((r) => r.length === head.length).map((r) => Object.fromEntries(head.map((k, i) => [k, r[i]])));
    };
    const itemized = fetch('../costs/Pilot_38_Children_Itemized.csv', { cache: 'no-store' }).then((r) => (r.ok ? r.text() : Promise.reject())).then(parseCsv).catch(() => null);
    // the cost levers and the cost groups, by the budget's own categories and lines
    const FF_PROGRAM = ['Pilot content support', 'Curriculum and clinical review', 'Platform support', 'Platform assurance', 'Hosting and software', 'Pilot content production', 'Pilot devices'];
    const GROUPS = [
      ['staff', 'Staff wages, taxes, benefits and insurance', ['Staff wages', 'Employer taxes', 'Staff benefits', 'Staff insurance'], '#4d5ef2'],
      ['food', 'Food and nutrition', ['Food and nutrition'], '#eba347'],
      ['building', 'Building operations and cleaning', ['Building operations', 'Cleaning and consumables'], '#a0643e'],
      ['ff', 'Futures Friends program costs', FF_PROGRAM, '#0bd9dc'],
      ['other', 'Administration, insurance and other', null, '#b06c7e']
    ];
    const cents = (v) => Math.round(v * 100) / 100;
    function levers0(rows) {
      const rec = rows.filter((r) => r.bucket === 'recurring'), sum = (f) => cents(rec.filter(f).reduce((a, r) => a + Number(r.annual), 0));
      const ads = rec.find((r) => /^Paid local advertising$/i.test(r.item));
      return {
        ff: sum((r) => FF_PROGRAM.includes(r.category)),
        // the paid local advertising line cut back to $1,500 a year once the centre is full
        ads: ads ? cents(Number(ads.annual) - 1500) : 0
      };
    }
    const savings = () => levers.reduce((a, b) => a + (b.checked ? amounts[b.dataset.lever] || 0 : 0), 0);
    // v2276 (model v5.2): caregivers are hired as enrollment grows (staffing.hiring_rule), each at the model's all-in annual cost,
    // so the year-1 replay moves staffing with the scenario's children exactly as the published cash rows do
    const staffFor = (k) => {
      const st = (m && m.staffing) || {}, rule = st.hiring_rule; if (!rule || !st.caregiver_annual_all_in) return 0;
      const hit = rule.find((x) => k <= x.up_to_children) || rule[rule.length - 1];
      return hit.caregivers * st.caregiver_annual_all_in;
    };
    const per = (k, t2, c2) => calc.variable(k) + calc.fees(k, t2, c2) + staffFor(k);
    // the pilot year replayed at the scenario: the published ramp capped at your children, receipts at your tuition and collections,
    // food and fees moving with them, the levers' savings spread over the months, the published one-time costs unchanged
    function year1(n, tt, c, save) {
      const a = calc.assumptions; let cum = 0, low = 0;
      for (const r of m.cash) {
        const k = Math.min(r.children, n);
        const receipts = r.receipts + (k * tt * c - r.children * a.tuition * a.collection);
        const recurring = r.recurring + (per(k, tt, c) - per(r.children, a.tuition, a.collection)) / 12 - save / 12;
        cum = cents(cum + cents(receipts - recurring - r.one_time)); low = Math.min(low, cum);
      }
      return Math.max(0, -low);
    }
    // the month cumulative pilot cash turns positive at the scenario: the same replay of the twelve published months, then the
    // scenario's month-12 net repeated (full enrollment, no one-time costs left), as the model's cumulative_cash_positive_month.
    // null: month-12 net is not positive (never); Infinity: not within ten years.
    function payback(n, tt, c, save) {
      const a = calc.assumptions; let cum = 0, last = 0;
      for (const r of m.cash) {
        const k = Math.min(r.children, n);
        const receipts = r.receipts + (k * tt * c - r.children * a.tuition * a.collection);
        const recurring = r.recurring + (per(k, tt, c) - per(r.children, a.tuition, a.collection)) / 12 - save / 12;
        last = cents(receipts - recurring - r.one_time); cum = cents(cum + last);
        if (cum >= 0) return r.month;
      }
      if (last <= 0) return null;
      let month = m.cash.length;
      while (cum < 0) { month++; cum = cents(cum + last); if (month > 120) return Infinity; }
      return month;
    }
    const breakEven = (n, c, save) => { let lo = 0, hi = 5000; for (let k = 0; k < 60; k++) { const mid = (lo + hi) / 2; if (calc.margin(n, mid, c) + save < 0) lo = mid; else hi = mid; } return Math.round(hi * 100) / 100; };
    // ---- the break-even gauge: a half dial over the tuition range; the needle is your tuition, the gold tick the break-even
    const gauge = (() => {
      const el = $('#labGauge'); if (!el) return { set() {} };
      const LO = 850, HI = 1400, at = (v) => Math.max(0, Math.min(1, (v - LO) / (HI - LO)));
      const arc = (cls) => svg('path', { d: 'M18,100 A82,82 0 0 1 182,100', class: cls, pathLength: 1 });
      const track = arc('g-track'), fillA = arc('g-fill'), tick = svg('line', { x1: 100, y1: 8, x2: 100, y2: 30, class: 'g-tick' });
      const needle = svg('g', { class: 'g-needle' }); needle.append(svg('line', { x1: 100, y1: 100, x2: 100, y2: 30 }), svg('circle', { cx: 100, cy: 100, r: 7 }));
      el.append(track, fillA, tick, needle);
      return { set(tt, be) { const rot = (f) => `rotate(${(-90 + 180 * f).toFixed(2)}deg)`; needle.style.transform = rot(at(tt)); tick.style.transform = rot(at(be)); fillA.style.strokeDasharray = `${at(tt).toFixed(4)} 1`; el.classList.toggle('g-ok', tt >= be); } };
    })();
    // ---- the waterfall: today's plan, your assumptions, each lever on, the result (rows only for what changes)
    function waterfall(rowsW) {
      const host = $('#labFall'); if (!host) return;
      let at = 0; const pts = [0];
      for (const r of rowsW) { if (r.total) at = r.v; else at += r.v; pts.push(at); }
      const lo = Math.min(0, ...pts), hi = Math.max(0, ...pts), span = (hi - lo) || 1, x = (v) => (v - lo) / span * 100;
      at = 0;
      host.innerHTML = rowsW.map((r) => {
        const from = r.total ? 0 : at, to = r.total ? r.v : at + r.v; at = to;
        const l = x(Math.min(from, to)), w = Math.max(0.6, Math.abs(x(to) - x(from)));
        const cls = r.total ? (r.v >= 0 ? 'wf-total pos' : 'wf-total neg') : (r.v >= 0 ? 'wf-up' : 'wf-down');
        const val = r.total ? signed(money(r.v)) : (r.v >= 0 ? '+' : '') + signed(money(r.v));
        return `<div class="wf-row ${cls}"><span class="wf-name" data-en="${r.name}">${t(r.name)}</span><div class="wf-track"><i class="wf-zero" style="left:${x(0).toFixed(2)}%"></i><i class="wf-bar" style="--l:${l.toFixed(2)}%;--w:${w.toFixed(2)}%"></i></div><b class="wf-val">${val}</b></div>`;
      }).join('') + (rowsW.length <= 2 ? `<p class="wf-hint" data-en="Move a slider or switch on a lever to see each step.">${t('Move a slider or switch on a lever to see each step.')}</p>` : '');
    }
    function update(animate) {
      if (!calc) return;
      const tt = Number(tu.value), n = Number(ch.value), c = Number(co.value) / 100, save = cents(savings());
      text('labTuitionOut', whole(tt)); text('labChildrenOut', String(n)); text('labCollectionOut', Math.round(c * 100) + '%');
      const base = calc.margin(n, tt, c), margin = base + save, be = breakEven(n, c, save), deficit = year1(n, tt, c, save);
      if (animate) counter.to(margin); else { counter.reset(); counter.to(margin); }
      clearTimeout(srTimer); srTimer = setTimeout(() => { $('#labMarginSr').textContent = signed(money(margin)); }, 300);
      root.classList.toggle('lab-positive', margin >= 0);
      I.set($('#labStatus'), margin >= 0 ? 'Operating surplus · building payments & debt excluded' : 'Operating shortfall · building payments & debt excluded');
      text('labBreakEven', money(be)); text('labTuitionNow', whole(tt)); text('labDeficit', money(deficit));
      I.set($('#labPayback'), margin > 0 ? `${(deficit / margin).toFixed(1)} years` : 'Not reached');
      // v2275: the plan's payback timing and the one-time vs recurring split, straight from the model (not scenario-dependent)
      const pb = payback(n, tt, c, save), pbOk = Number.isFinite(pb) && pb !== null;
      $('#labCumPosMonth').hidden = !pbOk; $('#labCumPosNone').hidden = pbOk;
      if (pbOk) text('labCumPos', String(pb)); else I.set($('#labCumPosNone'), pb === null ? 'Not reached' : 'Not within 10 years');
      text('labOneTime', money(m.totals.one_time)); text('labRecurring', money(m.totals.recurring));
      gauge.set(tt, be);
      const m0 = m.metrics.year2_margin, rowsW = [{ name: 'Today’s plan', v: m0, total: true }];
      if (Math.abs(base - m0) >= 0.005) rowsW.push({ name: 'Your tuition, children and collections', v: cents(base - m0) });
      for (const b of levers) if (b.checked && amounts[b.dataset.lever]) rowsW.push({ name: { ff: 'Program costs carried by Futures Friends', ads: 'Paid ads cut back', director: 'A paid director (market salary)' }[b.dataset.lever], v: amounts[b.dataset.lever] });
      rowsW.push({ name: 'Your scenario', v: cents(margin), total: true });
      waterfall(rowsW);
      reset.disabled = false;
    }
    const text = (id, v) => { const el = $(`#${id}`); if (el) el.textContent = v; };
    // ---- the enrollment ramp: the twelve months' children (assumptions.cash_ramp), bars that grow in, a tooltip on hover / focus
    function ramp() {
      const el = $('#labRamp'), tip = $('#labRampTip'); if (!el) return;
      const r = m.assumptions.cash_ramp, top = Math.max(...r), W = 480, H = 160, L = 26, B = 136, step = (W - L) / r.length;
      el.innerHTML = `<line x1="${L}" x2="${W}" y1="${B}" y2="${B}" class="rp-axis"/>` + r.map((v, i) => { const h = v / top * (B - 14); return `<g class="rp-col" data-i="${i}" tabindex="0" role="img" aria-label="Month ${i + 1}, ${v} children"><rect class="rp-bar" x="${(L + i * step + 4).toFixed(1)}" y="${(B - h).toFixed(1)}" width="${(step - 8).toFixed(1)}" height="${h.toFixed(1)}" rx="4" style="--i:${i}"/><text x="${(L + i * step + step / 2).toFixed(1)}" y="${B + 16}" class="rp-month" text-anchor="middle">${i + 1}</text><text x="${(L + i * step + step / 2).toFixed(1)}" y="${(B - h - 5).toFixed(1)}" class="rp-val" text-anchor="middle">${v}</text></g>`; }).join('');
      const show = (g) => { const i = Number(g.dataset.i), b = g.querySelector('rect').getBoundingClientRect(), w = el.parentElement.getBoundingClientRect(); I.set(tip, `Month ${i + 1}: ${r[i]} children`); tip.hidden = false; tip.style.left = `${(b.left - w.left + b.width / 2).toFixed(0)}px`; tip.style.top = `${(b.top - w.top - 8).toFixed(0)}px`; };
      for (const g of $$('.rp-col', el)) { g.addEventListener('pointerenter', () => show(g)); g.addEventListener('focus', () => show(g)); g.addEventListener('pointerleave', () => { tip.hidden = true; }); g.addEventListener('blur', () => { tip.hidden = true; }); }
      const labelCols = () => { for (const g of $$('.rp-col', el)) I.setAttr(g, 'aria-label', `Month ${Number(g.dataset.i) + 1}, ${r[Number(g.dataset.i)]} children`); };
      labelCols(); I.onChange(labelCols);   // v2281: Spanish from the first draw, not only after a switch
    }
    // ---- where each operating dollar goes: the recurring budget by group, one stacked bar, a key with amounts and shares
    function dollar(rows) {
      const host = $('#labDollar'), key = $('#labDollarKey'); if (!host || !rows) return;
      const rec = rows.filter((r) => r.bucket === 'recurring'), total = rec.reduce((a, r) => a + Number(r.annual), 0);
      const used = new Set(GROUPS.flatMap((g) => g[2] || []));
      const parts = GROUPS.map(([k, name, cats, color]) => ({ k, name, color, v: cents(rec.filter((r) => (cats ? cats.includes(r.category) : !used.has(r.category))).reduce((a, r) => a + Number(r.annual), 0)) }));
      host.innerHTML = parts.map((p, i) => `<span class="dollar-seg" role="img" tabindex="0" style="--w:${(p.v / total * 100).toFixed(3)}%;--c:${p.color};--i:${i}" data-k="${p.k}" aria-label="${t(p.name)}: ${money(p.v)}, ${(p.v / total * 100).toFixed(1)}%"></span>`).join('');
      key.innerHTML = parts.map((p) => `<li data-k="${p.k}" style="--c:${p.color}"><i aria-hidden="true"></i><span data-en="${p.name}">${t(p.name)}</span><b>${money(p.v)}</b><small>${(p.v / total * 100).toFixed(1)}%</small></li>`).join('');
      const lit = (k) => { for (const el of $$('[data-k]', root)) el.classList.toggle('lit', el.dataset.k === k); };
      for (const el of $$('.dollar-seg, .dollar-key li', root)) { el.addEventListener('pointerenter', () => lit(el.dataset.k)); el.addEventListener('pointerleave', () => lit(null)); el.addEventListener('focus', () => lit(el.dataset.k)); el.addEventListener('blur', () => lit(null)); }
    }
    async function build(model) {
      m = model; calc = scen.method();
      const rows = await itemized;
      if (rows) { amounts = levers0(rows); text('labLeverFF', money(amounts.ff)); text('labLeverAds', whole(amounts.ads)); }
      // v5: the owner is the unpaid director; this lever adds a market director (the model's reference line family, all-in) as a cost
      const dir = m.reference?.market_director_all_in;
      if (dir) { amounts.director = -dir; text('labLeverDirector', signed(money(-dir))); }
      for (const el of [tu, ch, co, ...levers]) { el.disabled = false; el.addEventListener('input', () => update(true)); el.addEventListener('change', () => update(true)); }
      reset.addEventListener('click', () => { tu.value = m.assumptions.tuition; ch.value = Math.max(...m.cash.map((r) => r.children)); co.value = Math.round(m.assumptions.collection * 100); levers.forEach((b) => { b.checked = false; }); update(true); });
      tu.value = m.assumptions.tuition; ch.value = Math.max(...m.cash.map((r) => r.children)); co.value = Math.round(m.assumptions.collection * 100);
      ramp(); dollar(rows); update(false);
      I.onChange(() => update(false));
      // the charts grow in when the lab scrolls into view (motion on); otherwise they are simply there
      if (motionOn() && params().get('reveal') !== 'off' && typeof IntersectionObserver === 'function') {
        root.classList.add('lab-armed');
        const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); root.classList.add('lab-in'); } }, { threshold: 0.15 });
        io.observe(root);
      } else root.classList.add('lab-in');
      D.addEventListener('inv:motion', (e) => { if (e.detail?.paused) root.classList.add('lab-in'); });
    }
    return { build, state: () => ({ amounts: { ...amounts } }) };
  })();

  // ================================================================ wiring
  D.addEventListener('inv:entrance', (e) => {
    const { view: v, animate } = e.detail;
    if (v === 'funding') { donut.draw(animate); if (animate) e.detail.hold(250 + DUR + 200); }
    if (v === 'pilot') { year.draw(animate); if (animate) e.detail.hold(250 + DUR + 400); }
  });
  D.addEventListener('inv:land', (e) => {
    const { view: v, all } = e.detail;
    if (all || v === 'funding') donut.land();
    if (all || v === 'pilot') year.land();
  });
  D.addEventListener('inv:model', (e) => {
    model = e.detail;
    donut.build(model); scen.build(model); year.build(model); ov.build(model); lab.build(model);
  });
  window.FFInvStudio = Object.freeze({ show, view: () => view, views: VIEWS, scenario: () => scen.method(), year: () => year.rows(), lab: () => lab.state() });
})();
