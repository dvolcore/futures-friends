/* Futures Friends Investor studio (owner 2026-10-12: "more motion graphics, more space, forward thinking when it comes to platform").
   The investor overview as six full-screen views in a Hub-style shell (left rail; a bottom tab bar on phones), one view at a time:
     Overview · Funding · Pilot year · Scenarios · Inside the pilot · Documents.
   - Deep links: ?view=<name> (and #<name>); browser back / forward walk the views. ?view=funding&slice=refinance lifts a slice.
   - View changes cross-fade with the View Transitions API where the browser has it, else a short fade; nothing moves with motion off.
   - Each view's entrance plays once per visit (portal.js FFInvReveal.enter: cards count up one at a time; here the donut draws slice
     by slice, the pilot-year chart draws, both on inv:entrance) and lands at once on a tap, key, wheel or touch-scroll (inv:land).
   - Every figure comes from the verified model (../costs/pilot-budget.json, checked by overview.js) or the published monthly cash
     file (../costs/Pilot_40_Children_Monthly_Cash.csv, checked here against the model row by row). No illustrative shapes.
   - Scenarios use the MODEL's method (investor/tools/build_pilot_budget.py annual_margin / break-even): food and payment-processing fees
     move with enrollment, tuition and collections, anchored to the model's recurring total, so at the planning assumptions the
     explorer shows exactly the published -$57,738.02 margin and the $1,036.37 break-even (it used to hold fees constant: $1,035.30).
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
  const cashCsv = fetch('../costs/Pilot_40_Children_Monthly_Cash.csv', { cache: 'no-store' }).then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status))))).then((text) => {
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
    // Revenue / Expenses / Operating gap: what the chart shows (at least one stays on)
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

  // ================================================================ Scenarios: the model's method, live
  const scen = (() => {
    const tu = $('#scenarioTuition'), ch = $('#scenarioChildren'), co = $('#scenarioCollection'), reset = $('#scenarioReset');
    const out = $('#scenarioMargin'), sr = $('#scenarioMarginSr');
    let calc = null, srTimer = 0;
    const counter = makeCounter(out);
    // the model (build_pilot_budget.py): payment fees per collected tuition payment = 95% ACH at 0.8% capped at $5, 5% card at
    // 2.9% + $0.30, plus 0.7% recurring billing; food and supplies at $3.51 per child per service day; everything else fixed.
    function method(m) {
      const rc = m.recurring_components, a = m.assumptions;
      const fees = (n, tt, c) => { const tr = n * 12 * c; return tr * (0.95 * Math.min(tt * 0.008, 5) + 0.05 * (tt * 0.029 + 0.30)) + tr * tt * 0.007; };
      const variable = (n) => n * rc.service_days * rc.variable_per_child_day;
      // anchored to the model's recurring total (which carries the line-item cent rounding), so the planning case is exact
      const base = m.totals.recurring - variable(40) - fees(40, a.tuition, a.collection);
      const cost = (n, tt, c) => base + variable(n) + fees(n, tt, c);
      const margin = (n, tt, c) => n * tt * 12 * c - cost(n, tt, c);
      const breakEven = (n, c) => { let lo = 0, hi = 5000; for (let k = 0; k < 60; k++) { const mid = (lo + hi) / 2; if (margin(n, mid, c) < 0) lo = mid; else hi = mid; } return Math.round(hi * 100) / 100; };
      return { base, margin, breakEven, cost, variable, fees, revenue: (n, tt, c) => n * tt * 12 * c, assumptions: a };
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
      reset.addEventListener('click', () => { tu.value = m.assumptions.tuition; ch.value = 40; co.value = Math.round(m.assumptions.collection * 100); update(); });
      tu.value = m.assumptions.tuition; ch.value = 40; co.value = Math.round(m.assumptions.collection * 100);
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
      colors: { deficit: '#2ee6a8', refinance: '#5b8cff', floor: '#ff9d42', contingency: '#b98cff' } });
    const ovYear = makeYear({ chart: $('#ovChart'), toggles: [], view: 'overview', autoplay: true, hoverStops: true, positiveOnly: true,
      height: (w, ph) => (ph ? 200 : Math.round(Math.max(100, Math.min(w * 0.232, 9.6 * Math.min(innerWidth / 100, innerHeight * 0.015))))), bottomPad: 28,
      monthLabel: (m) => String(m), labelText: (m) => `Month ${String(m).padStart(2, '0')} snapshot`,
      out: { label: $('#ovMonthLabel'), children: $('#ovChildrenM'), receipts: $('#ovReceipts'), spending: $('#ovSpending'), net: $('#ovNet') } });
    const text = (id, v) => { const el = $(`#${id}`); if (el) el.textContent = v; };

    // ---- the banner. ONE constant picks the art: data-scene on #ccScene (index.html). Each scene names its file and the band every
    // character occupies (top of the highest ear .. the lowest chin, as fractions of the picture's height, measured on the file). The
    // banner keeps the mockup's 4.87:1 strip; the picture is framed so the whole band shows with a margin. When the band needs more
    // height than the strip gives at full width, the picture narrows a little (nobody is ever cut at the sides) and a blurred copy of
    // itself fills the two slim edges. Phones show the whole picture. A file composed for the strip (its band fits) fills it edge to edge.
    const BANNER = 4.87, AIR = 0.03;
    // glam-1 (default): the gold-lit boardroom, all ten friends in one band, Principal Hazel at the glowing dashboard wall; deer ears and
    //   giraffe ossicones are the top-most points (16.5%), the lowest chins 58.5%: it fills the 4.87:1 strip edge to edge.
    // glam-2: the same room, the high-five (15% .. 58.5%). wide-1 / wide-2: the earlier long-table and round-table meetings.
    // cast-1 (default, owner's pick): the full cast of 22, teachers and parents standing behind the seated children; the giraffe's
    //   ossicones are the top-most point (15.5%), the lowest chin (the frog, front right) 72%. Taller than the 4.87:1 strip allows, so
    //   its strip is 4.34:1 (about 260 px at 1280; the other blocks give back the height, still one screen) and the picture narrows a
    //   little over its blurred copy: the giraffe (far left) and the raccoon (far right) stay whole.
    const SCENES = {
      'cast-1': { file: 'investor-meeting-cast-1', band: [0.155, 0.72], strip: 4.34 },
      'glam-1': { file: 'investor-meeting-glam-1', band: [0.165, 0.585] }, 'glam-2': { file: 'investor-meeting-glam-2', band: [0.15, 0.585] },
      'wide-1': { file: 'investor-meeting-wide-1', band: [0.165, 0.61] }, 'wide-2': { file: 'investor-meeting-wide-2', band: [0.077, 0.612] }
    };
    const scene = (() => {
      const fig = $('#ccScene'), img = $('#ccSceneImg');
      if (!fig || !img) return {};
      const cfg = SCENES[fig.dataset.scene] || SCENES['cast-1'];
      const art = $('.cap-banner-art', fig), STRIP = cfg.strip || BANNER;
      $('#cc')?.classList.toggle('tall-banner', STRIP < BANNER - 0.05);
      let nat0 = 0;
      const frame = (nat) => {
        nat0 = nat || nat0;
        // the strip's real shape (4.87:1, or lower when a short screen caps its height)
        const box = art.clientWidth && art.clientHeight ? art.clientWidth / art.clientHeight : STRIP;
        const top = Math.max(0, cfg.band[0] - AIR), v = Math.min(1, cfg.band[1] + AIR - top);
        const w = Math.min(1, nat0 / (v * box));               // the picture's width in the strip (1 = edge to edge)
        const shown = Math.min(1, nat0 / (box * w));            // the fraction of its height the strip shows at that width
        const fy = shown >= 1 ? 50 : Math.min(100, Math.max(0, top / (1 - shown) * 100));
        fig.style.setProperty('--ar', String(STRIP));
        fig.style.setProperty('--bh', (88.2 / STRIP).toFixed(3));
        fig.style.setProperty('--iw', `${(w * 100).toFixed(3)}%`);
        fig.style.setProperty('--fy', `${fy.toFixed(2)}%`);
        fig.style.setProperty('--nat', String(nat0));
      };
      if (typeof ResizeObserver === 'function') new ResizeObserver(() => frame()).observe(art);
      frame(Number(img.getAttribute('width')) / Number(img.getAttribute('height')));
      img.sizes = '(max-width: 767px) 100vw, 88vw';
      img.srcset = `assets/${cfg.file}-1200.webp 1200w, assets/${cfg.file}.webp 2400w`;
      img.src = `assets/${cfg.file}.webp`;
      const loaded = () => { frame(img.naturalWidth / img.naturalHeight); fig.style.setProperty('--scene', `url("${img.currentSrc || img.src}")`); fig.classList.add('ready'); };
      if (img.complete && img.naturalWidth) loaded(); else img.addEventListener('load', loaded, { once: true });
      return { cfg };
    })();

    function build(m) {
      mdl = m;
      const { totals, platform, assumptions, metrics, cash } = m;
      ovDonut.build(m);
      ovYear.build(m);
      text('kpiRefi', whole(totals.refinance)); text('kpiGap', signed(money(metrics.year2_margin))); text('kpiPlatform', money(platform.first_year));
      text('capacity', String(Math.max(...cash.map((r) => r.children)))); text('pilotDuration', String(cash.length)); text('collections', Math.round(assumptions.collection * 100) + '%');
      ready = true;
      hl(null);
      seen.forEach(play);
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
    donut.build(model); scen.build(model); year.build(model); ov.build(model);
  });
  window.FFInvStudio = Object.freeze({ show, view: () => view, views: VIEWS, scenario: () => scen.method(), year: () => year.rows() });
})();
