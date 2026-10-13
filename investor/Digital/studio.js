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
   No library; transform / opacity / stroke only. Loops: the command header's scene drift, light sweep, status dot and ticker only
   (all stopped by every motion switch). Sends nothing, stores nothing. */
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
    if (!a || !p) return;
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
  function makeDonut({ host, tip, detail, hint, buttons, total: totalEl, deep, onSelect }) {
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
      totalEl.textContent = money(total);
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
    return { build, pick, draw, land, select, hover, keys: () => slices.map((s) => s.key) };
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
      scrub.disabled = false;
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
      L = ph ? 50 : 64; RGT = W - 10; TOP = 18; BOT = H - 40;
      chart.setAttribute('viewBox', `0 0 ${W} ${H}`);
      chart.classList.toggle('chart-narrow', (RGT - L) / 12 < 44);
      const sets = [rows, ...(o.envelope ? o.envelope(rows) : [])];
      const top = Math.ceil(Math.max(...sets.flatMap((s) => s.map((r) => Math.max(spend(r), r.receipts)))) / 25000) * 25000, ystep = top / 4;
      const bottom = Math.floor(Math.min(0, ...sets.flatMap((s) => s.map((r) => r.net))) / ystep) * ystep;
      step = (RGT - L) / 12; x = (i) => L + step / 2 + i * step;
      y = (v) => BOT - (v - bottom) / (top - bottom) * (BOT - TOP);
      const grid = part('grid'); grid.replaceChildren();
      for (let v = bottom; v <= top + 1; v += ystep) {
        grid.append(svg('line', { x1: L, x2: RGT, y1: y(v).toFixed(2), y2: y(v).toFixed(2), class: v === 0 ? 'chart-zero' : 'chart-grid-line' }));
        if (v >= 0) { const lab = svg('text', { x: L - 12, y: (y(v) + 5).toFixed(2), class: 'chart-grid-label', 'text-anchor': 'end' }); lab.textContent = v === 0 ? '$0' : '$' + Math.round(v / 1000) + 'k'; grid.append(lab); }
      }
      rows.forEach((r, i) => { const lab = svg('text', { x: x(i).toFixed(2), y: BOT + 26, class: `chart-month${r.month % 2 ? '' : ' m-even'}`, 'text-anchor': 'middle' }); lab.textContent = 'M' + String(r.month).padStart(2, '0'); grid.append(lab); });
      const bars = part('bars'); bars.replaceChildren();
      rows.forEach((r, i) => { const b = svg('rect', { rx: 6, class: 'gap-bar' }); b.style.setProperty('--i', i); bars.append(b); });
      for (const k of ['rec', 'spend']) part(k).setAttribute('pathLength', '1');
      for (const [k, vals] of [['recGhost', rows.map((r) => r.receipts)], ['spendGhost', rows.map(spend)]]) part(k)?.setAttribute('d', line(vals));
      part('cursor').setAttribute('y1', TOP - 6); part('cursor').setAttribute('y2', BOT);
      const hits = part('hits'); hits.replaceChildren();
      rows.forEach((r, i) => {
        const hit = svg('rect', { x: (x(i) - step / 2).toFixed(2), y: 0, width: step.toFixed(2), height: H, class: 'cash-hit' });
        hit.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && !dragging) select(r.month); });
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
      part('spend').setAttribute('d', line(vals.map(spend)));
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
      scrub.value = month;
      const deficit = Math.max(0, -r.cumulative);
      I.setAttr(scrub, 'aria-valuetext', `Month ${month}, ${r.children} children, cumulative cash deficit ${money(deficit)}`);
      out.month.textContent = String(month).padStart(2, '0');
      I.set(out.label, 'Month ' + month);
      out.deficit.textContent = money(deficit);
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
    scrub.addEventListener('input', () => { pause(); select(Number(scrub.value)); });
    // "Play timeline": walks M01 -> M12 once, on request only (never on load); pausable; picks up where it was paused
    const playLabel = (on) => { playBtn.setAttribute('aria-pressed', String(on)); I.set($('span', playBtn), on ? 'Pause timeline' : 'Play timeline'); chart.classList.toggle('playing', on); };
    function play() {
      if (!rows) return;
      if (month >= 12) select(1);
      playLabel(true);
      const tick = () => { if (month >= 12) { pause(); return; } select(month + 1); timer = setTimeout(tick, 700); };
      timer = setTimeout(tick, 450);
    }
    function pause() { if (timer) clearTimeout(timer); timer = null; playLabel(false); }
    playBtn.addEventListener('click', () => (timer ? pause() : play()));
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
      anims.push(part('area').animate([{ opacity: 0 }, { opacity: 1 }], { ...k, duration: 700, delay: 250 + DUR * 0.6 }));
      $$('.gap-bar', chart).forEach((b, i) => anims.push(b.animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { ...k, duration: 520, delay: 350 + i * 80 })));
      for (const id of ['cursor', 'recDot', 'spendDot']) anims.push(part(id).animate([{ opacity: 0 }, { opacity: 1 }], { ...k, duration: 400, delay: 250 + DUR }));
      if (o.autoplay && !played) { played = true; const a = anims[anims.length - 1]; a.finished.then(() => { if (motionOn() && !timer && month === 1) play(); }, () => {}); }
    }
    const land = () => { wantDraw = false; played = true; anims.forEach((a) => a.finish()); };
    phoneMq.addEventListener('change', layout);
    D.addEventListener('studio:view', (e) => { if (e.detail.view === o.view) layout(); });
    if (typeof ResizeObserver === 'function') { let lastW = 0, lastH = 0, rt = 0; new ResizeObserver((es) => { const w = Math.round(es[0].contentRect.width), hh = Math.round(es[0].contentRect.height); if (!w || (Math.abs(w - lastW) < 2 && (!o.height || Math.abs(hh - lastH) < 2))) return; lastW = w; lastH = hh; clearTimeout(rt); rt = setTimeout(layout, 120); }).observe(chart.parentElement); }
    I.onChange(() => { if (rows) select(month); });
    return { build, draw, land, select, pause, setRows, rows: () => rows, shown: () => target };
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

  // ================================================================ Overview: the command center (owner 2026-10-13, v2270)
  // "It needs to have more of a dashboard feel ... more like the command center." One screen, the QEP spine's structure in the
  // Futures Friends palette: a dark command header (status, the tagline, the Pending terms board, a ticker of the key figures and
  // the hero scene slot), a compact KPI strip (ring + sparkline + status chip), and the centerpiece: the scenario simulator wired
  // to the pilot-year chart, the operating-gap readout and the break-even gauge. Around it: funding, repayment, platform costs,
  // what the pilot includes and the documents dock. Phones: a sticky KPI ticker, the centerpiece first, then the panels in a
  // swipeable dock with a segmented control. Every panel opens its deep dive.
  // Every figure is the model's (pilot-budget.json) or the published monthly cash file's. The scenario uses the model's method
  // (scen.method()): the pilot year at your assumptions keeps the published enrollment ramp (capped at your enrolled children) and
  // the published one-time costs; receipts are children x tuition x collections, and food and payment fees move with them, exactly
  // as the model builds its monthly cash. At the planning assumptions every row is the published file's, to the cent.
  // Motion (motion on only): panels rise in one after another, figures count to the exact model text, the donut draws, the gauge
  // needles sweep, the chart draws then walks the year once, the chart glides when a slider moves, the scene drifts (ken burns)
  // under a soft light sweep, the status dot breathes and the ticker runs. Reduce Motion, the site's motion switch, "Pause motion"
  // and ?reveal=off: everything static and final.
  const ov = (() => {
    const root = $('#ovd'); if (!root) return { build() {} };
    const cards = $$('[data-ov-card]', root);
    const armed = motionOn() && params().get('reveal') !== 'off';
    if (armed) R.classList.add('ovd-armed');
    let ready = false, mdl = null; const seen = new Set(), enders = [], enderOf = new Map();
    // linked highlighting: a funding part (or the total) named in several panels lights up everywhere it appears
    const link = (key) => $$('[data-link]').forEach((el) => el.classList.toggle('linked', !!key && el.dataset.link === key));
    const ovDonut = makeDonut({ host: $('#ovArcs'), tip: $('#ovDonutTip'), detail: $('#ovDonutDetail'), hint: $('#ovDonutHint'), buttons: $$('#ovLegend [data-ov-slice]'), total: $('#ovDonutTotal'), onSelect: link });
    let calc = null;
    // the pilot year at the scenario's assumptions (the model's method; see above). Planning assumptions: the published rows.
    const cents = (v) => Math.round(v * 100) / 100;
    function scenarioRows(rows, n, tt, c) {
      const a = calc.assumptions;
      if (n >= Math.max(...rows.map((r) => r.children)) && tt === a.tuition && c === a.collection) return rows;
      const per = (k, t2, c2) => calc.variable(k) + calc.fees(k, t2, c2);
      let cum = 0;
      return rows.map((r) => {
        const k = Math.min(r.children, n);
        const receipts = cents(r.receipts + (k * tt * c - r.children * a.tuition * a.collection));
        const recurring = cents(r.recurring + (per(k, tt, c) - per(r.children, a.tuition, a.collection)) / 12);
        const net = cents(receipts - recurring - r.one_time); cum = cents(cum + net);
        return { ...r, children: k, receipts, recurring, net, cumulative: cum };
      });
    }
    const ovYear = makeYear({ chart: $('#ovChart'), scrub: $('#ovScrub'), play: $('#ovPlay'), toggles: $$('[data-ov-series]', root), view: 'overview', autoplay: true,
      // desktop: the chart fills the centerpiece's free height (its box is sized by the grid); elsewhere a height from its width
      height: (w, ph, box) => (ph ? 240 : (box && getComputedStyle(box).position === 'relative' && box.clientHeight >= 160 ? box.clientHeight : Math.round(Math.min(240, Math.max(190, w * 0.44))))),
      envelope: (rows) => (calc ? [scenarioRows(rows, 20, 600, 0.8), scenarioRows(rows, 40, 1600, 1)] : []),
      out: { month: $('#ovMonth'), label: $('#ovMonthLabel'), deficit: $('#ovDeficit'), children: $('#ovChildrenM'), receipts: $('#ovReceipts'), spending: $('#ovSpending'), net: $('#ovNet') },
      mute: (k) => $(`.ro-${{ revenue: 'rev', expenses: 'exp', gap: 'gap' }[k]}`, root) });
    const fill = (id, f) => { const el = $(`#${id}`); if (el) el.style.setProperty('--s', Math.max(0, Math.min(1, f)).toFixed(4)); };
    const text = (id, v) => { const el = $(`#${id}`); if (el) el.textContent = v; };

    // ---- a break-even gauge: a half dial from the lowest to the highest tuition the explorer offers; the needle is the tuition, the
    // gold tick is the break-even, the red wedge between them is the gap. No numbers on the dial (they are printed beside it).
    function gauge(el) {
      const LO = 600, HI = 1700, at = (v) => Math.max(0, Math.min(1, (v - LO) / (HI - LO)));
      const arc = (cls) => svg('path', { d: 'M18,100 A82,82 0 0 1 182,100', class: cls, pathLength: 1 });
      const track = arc('g-track'), fillA = arc('g-fill'), gapA = arc('g-gap');
      const tick = svg('line', { x1: 100, y1: 8, x2: 100, y2: 30, class: 'g-tick' });
      const needle = svg('g', { class: 'g-needle' }); needle.append(svg('line', { x1: 100, y1: 100, x2: 100, y2: 30 }), svg('circle', { cx: 100, cy: 100, r: 7 }));
      el.append(track, gapA, fillA, tick, needle);
      let first = true;
      return {
        set(tu, be, { from = false } = {}) {
          const ft = at(tu), fb = at(be);
          const rot = (f) => `rotate(${(-90 + 180 * f).toFixed(2)}deg)`;
          if (from) { needle.style.transform = rot(0); fillA.style.strokeDasharray = '0 1'; gapA.style.strokeDasharray = '0 0 0 1'; return; }
          needle.style.transform = rot(ft);
          tick.style.transform = rot(fb);
          fillA.style.strokeDasharray = `${ft.toFixed(4)} 1`;
          const lo = Math.min(ft, fb), hi = Math.max(ft, fb);
          gapA.style.strokeDasharray = `0 ${lo.toFixed(4)} ${(hi - lo).toFixed(4)} 1`;
          el.classList.toggle('g-ok', tu >= be);
          first = false;
        },
        get first() { return first; }
      };
    }
    const g1 = gauge($('#ovGauge')), g2 = gauge($('#ovRepayGauge'));

    // ---- the scenario (centerpiece): the same model method as the Scenarios view, its own sliders, wired to the chart
    const sc = (() => {
      const tu = $('#ovTuition'), ch = $('#ovChildren'), co = $('#ovCollection'), reset = $('#ovReset'), sr = $('#ovMarginSr');
      const counter = makeCounter($('#ovMargin'));
      let srTimer = 0, m = null;
      const planning = () => { tu.value = m.assumptions.tuition; ch.value = 40; co.value = Math.round(m.assumptions.collection * 100); };
      function update(animate, quiet) {
        if (!calc) return;
        const tt = Number(tu.value), n = Number(ch.value), c = Number(co.value) / 100;
        const margin = calc.margin(n, tt, c), be = calc.breakEven(n, c);
        text('ovTuitionOut', whole(tt)); text('ovChildrenOut', String(n)); text('ovCollectionOut', Math.round(c * 100) + '%');
        text('ovScenTuition', whole(tt)); text('ovScenBreakEven', money(be));
        counter.to(margin);
        clearTimeout(srTimer); srTimer = setTimeout(() => { sr.textContent = signed(money(margin)); }, 300);
        if (!quiet) I.set($('#ovScenStatus'), margin >= 0 ? 'Operating surplus · building payments & debt excluded' : 'Operating shortfall · building payments & debt excluded');
        $('#ovMarginBox').classList.toggle('positive', margin >= 0);
        g1.set(tt, be);
        const rows = ovYear.rows();
        if (rows) {
          const next = scenarioRows(rows, n, tt, c);
          ovYear.setRows(next, animate);
          I.set($('#ovPlanChip'), next === rows ? 'Published forecast' : 'Your scenario');
          $('#ovPlanChip').classList.toggle('chip-scen', next !== rows);
          scene.screen(next);
        }
      }
      function build(model) {
        m = model;
        // a slider moved while the card's figures still count: land the count first, then follow the slider
        const input = () => { enderOf.get($('.ovd-scen'))?.(); update(true); };
        for (const el of [tu, ch, co]) { el.disabled = false; el.addEventListener('input', input); }
        reset.disabled = false;
        reset.addEventListener('click', () => { planning(); input(); });
        planning(); counter.reset(); update(false);
        I.set($('#ovScenStatus'), 'Before building payments & debt');
        sr.textContent = $('#ovMargin').textContent;
      }
      return { build, update };
    })();

    // ---- the hero scene slot. ONE attribute swaps the art: the src of #ccSceneImg (index.html). The figure's data-screen="x y w h"
    // (percent of the IMAGE, not of the slot) turns on the wall-screen overlay: a live mini chart of the pilot year at the current
    // scenario, laid over the screen painted in the scene. Empty data-screen = no overlay (the current art has no screen).
    // The image is contained (never cropped) over a blurred copy of itself; the stage drifts slowly and a soft light sweeps it.
    const scene = (() => {
      const fig = $('#ccScene'), img = $('#ccSceneImg');
      if (!fig || !img) return { screen() {} };
      const stage = $('.cc-scene-stage', fig), scr = $('.cc-screen', fig), plot = $('svg', scr);
      let last = null;
      function fit() {
        const W = fig.clientWidth, H = fig.clientHeight, iw = img.naturalWidth || Number(img.getAttribute('width')), ih = img.naturalHeight || Number(img.getAttribute('height'));
        if (!W || !H || !iw || !ih) return;
        const k = Math.min((W * 0.94) / iw, (H * 0.94) / ih);   // 6% air: the slow drift never pushes a character out of frame
        stage.style.width = `${(iw * k).toFixed(1)}px`; stage.style.height = `${(ih * k).toFixed(1)}px`;
        fig.style.setProperty('--scene', `url("${img.currentSrc || img.src}")`);
      }
      function box() {
        const v = (fig.dataset.screen || '').trim().split(/[\s,]+/).map(Number);
        const on = v.length === 4 && v.every((n) => Number.isFinite(n) && n >= 0) && v[2] > 0 && v[3] > 0;
        scr.hidden = !on;
        fig.classList.toggle('has-screen', on);
        if (on) { const [l, tp, w, h] = v; Object.assign(scr.style, { left: `${l}%`, top: `${tp}%`, width: `${w}%`, height: `${h}%` }); if (last) screen(last); }
      }
      // the wall screen: the twelve monthly operating gaps as bars and the cumulative cash line (decoration; the figures are printed)
      function screen(rows) {
        last = rows;
        if (scr.hidden || !rows) return;
        const lo = Math.min(...rows.map((r) => r.cumulative), ...rows.map((r) => r.net), 0), hi = Math.max(0, ...rows.map((r) => r.cumulative), ...rows.map((r) => r.net));
        const y = (v) => 6 + (hi - v) / ((hi - lo) || 1) * 48, x = (i) => 8 + i * (104 / 11);
        const bars = rows.map((r, i) => { const a = y(Math.max(0, r.net)), b = y(Math.min(0, r.net)); return `<rect x="${(x(i) - 3).toFixed(1)}" y="${a.toFixed(1)}" width="6" height="${Math.max(0.8, b - a).toFixed(1)}" class="${r.net < 0 ? 'neg' : 'pos'}"/>`; }).join('');
        const path = rows.map((r, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(r.cumulative).toFixed(1)}`).join(' ');
        plot.innerHTML = `<line x1="4" x2="116" y1="${y(0).toFixed(1)}" y2="${y(0).toFixed(1)}" class="zero"/>${bars}<path d="${path}" class="cum" pathLength="1"/>`;
      }
      img.addEventListener('load', fit);
      if (typeof ResizeObserver === 'function') new ResizeObserver(fit).observe(fig);
      if (typeof MutationObserver === 'function') {
        new MutationObserver(box).observe(fig, { attributes: true, attributeFilter: ['data-screen'] });
        new MutationObserver(fit).observe(img, { attributes: true, attributeFilter: ['src'] });
      }
      fit(); box();
      return { screen, fit };
    })();

    // ---- the KPI strip's sparklines (decoration; the figures sit beside them): the cumulative pilot cash deficit, the enrollment
    // ramp, the twelve months with the first-month checkpoint, and the refinance among the four parts of the funding estimate
    function sparks(m) {
      const put = (k, html) => { const el = $(`[data-spark="${k}"]`); if (el) el.innerHTML = html; };
      const cum = m.cash.map((r) => -r.cumulative), top = Math.max(...cum);
      const pts = cum.map((v, i) => `${(2 + i * 116 / 11).toFixed(1)},${(33 - v / top * 28).toFixed(1)}`);
      put('funding', `<path class="sp-area" d="M2,34 L${pts.join(' L')} L118,34 Z"/><path class="sp-line" d="M${pts.join(' L')}" pathLength="1"/>`);
      const ramp = m.cash.map((r) => r.children), rt = Math.max(...ramp);
      put('ramp', ramp.map((v, i) => `<rect class="sp-bar" style="--i:${i}" x="${(2 + i * 10).toFixed(1)}" y="${(34 - v / rt * 30).toFixed(1)}" width="7" height="${(v / rt * 30).toFixed(1)}" rx="1.5"/>`).join(''));
      put('months', m.cash.map((r, i) => `<rect class="sp-seg${i === 0 ? ' sp-check' : ''}" style="--i:${i}" x="${(2 + i * 10).toFixed(1)}" y="13" width="8" height="10" rx="2"/>`).join(''));
      const { funding, totals } = m, total = funding.request_before_financing;
      let at = 2;
      put('refinance', [['deficit', funding.peak_deficit], ['refinance', totals.refinance], ['floor', funding.cash_floor], ['contingency', totals.contingency]].map(([k, v]) => { const w = v / total * 116, r = `<rect class="sp-part${k === 'refinance' ? ' sp-lit' : ''}" x="${at.toFixed(1)}" y="12" width="${Math.max(0.5, w - 1).toFixed(1)}" height="12" rx="2"/>`; at += w; return r; }).join(''));
    }

    // ---- the ticker: the key figures, from the model; a copy follows the first for a seamless run (the copy is hidden from readers)
    const ticker = (() => {
      const vp = $('.cc-tick-viewport'), track = $('.cc-tick-track'); if (!vp || !track) return { build() {} };
      const belt = D.createElement('div'); belt.className = 'cc-tick-belt'; track.before(belt); belt.append(track);
      function copy() {
        $('.cc-tick-clone', belt)?.remove();
        const c = track.cloneNode(true); c.classList.add('cc-tick-clone'); c.setAttribute('aria-hidden', 'true'); c.setAttribute('data-i18n-skip', '');
        belt.append(c);
      }
      function build(m) {
        const v = { funding: money(m.funding.request_before_financing), deficit: money(m.funding.peak_deficit), refinance: whole(m.totals.refinance), tuition: whole(m.assumptions.tuition),
          breakeven: money(m.metrics.breakeven_tuition), gap: signed(money(m.metrics.year2_margin)), platform: money(m.platform.first_year), lines: String(m.meta.line_count) };
        for (const b of $$('[data-tick]', track)) if (v[b.dataset.tick]) b.textContent = v[b.dataset.tick];
        copy();
      }
      I.onChange(copy);
      return { build };
    })();

    function build(m) {
      mdl = m;
      const { platform, assumptions, metrics } = m;
      calc = scen.method();
      ovDonut.build(m);
      ovYear.build(m).then(() => { sc.update(false, true); });
      sc.build(m);
      sparks(m); ticker.build(m);
      text('ovPlatformBuild', whole(platform.completion)); text('ovPlatformAssurance', whole(platform.assurance_one_time)); text('ovPlatformRecurring', money(platform.recurring));
      text('ovPlatformYear', money(platform.first_year)); text('ovPlatformOnce', whole(platform.one_time)); text('ovPlatformMonthly', money(platform.monthly));
      const big = Math.max(platform.completion, platform.assurance_one_time, platform.recurring);
      fill('ovPlatformBuildBar', platform.completion / big); fill('ovPlatformAssuranceBar', platform.assurance_one_time / big); fill('ovPlatformRecurringBar', platform.recurring / big);
      text('ovTuition0', whole(assumptions.tuition)); text('ovBreakEven0', money(metrics.breakeven_tuition)); text('ovGap', signed(money(metrics.year2_margin)));
      g2.set(assumptions.tuition, metrics.breakeven_tuition);
      I.setAttr($('#ovCompare'), 'aria-label', `Draft monthly tuition ${money(assumptions.tuition)}; operating break-even ${money(metrics.breakeven_tuition)} before building payments and debt`);
      // the needles start at the low end and sweep in when their panel rises (motion on)
      if (armed && motionOn()) { for (const [g, card] of [[g1, '.ovd-scen'], [g2, '.ovd-repay']]) if (!$(card)?.dataset.ovPlayed) g.set(0, 0, { from: true }); }
      ready = true;
      seen.forEach(play);
    }
    // a panel on screen: it rises (CSS, .ovd-in); once the model is in, its figures count and its picture draws
    function play(card) {
      if (card.dataset.ovPlayed) return;
      card.dataset.ovPlayed = '1';
      const go = armed && motionOn();
      if (go && window.FFInvReveal?.count) { const end = window.FFInvReveal.count($$('[data-ov-count]', card)); enders.push(end); enderOf.set(card, end); }
      if (card.classList.contains('ovd-funding')) ovDonut.draw(go);
      if (card.classList.contains('ovd-year')) ovYear.draw(go);
      const later = (f) => requestAnimationFrame(() => requestAnimationFrame(f));   // after the start position has been drawn
      if (card.classList.contains('ovd-scen')) later(() => sc.update(false, true));
      if (card.classList.contains('ovd-repay') && mdl) later(() => g2.set(mdl.assumptions.tuition, mdl.metrics.breakeven_tuition));
    }
    let order = 0;
    function enter(card) {
      // panels that arrive together rise one after another (90 ms apart), like a console booting
      const delay = armed ? (order++) * 90 : 0;
      card.style.setProperty('--ovd-delay', `${delay}ms`);
      card.classList.add('ovd-in');
      seen.add(card);
      if (ready) play(card);
    }
    function landAll() {
      cards.forEach((c) => c.classList.add('ovd-in'));
      enders.splice(0).forEach((end) => end && end());
      ovDonut.land(); ovYear.land();
      if (mdl) { sc.update(false, true); g2.set(mdl.assumptions.tuition, mdl.metrics.breakeven_tuition); }
    }
    if (armed && typeof IntersectionObserver === 'function') {
      const io = new IntersectionObserver((es) => { es.filter((e) => e.isIntersecting).forEach((e) => { io.unobserve(e.target); enter(e.target); }); order = 0; }, { threshold: 0.12 });
      cards.forEach((c) => io.observe(c));
    } else cards.forEach(enter);
    D.addEventListener('inv:land', (e) => { if (e.detail.all) landAll(); });
    D.addEventListener('inv:motion', (e) => { if (e.detail?.paused) { landAll(); ovYear.pause(); } });
    // every panel opens its deep dive: a click on the panel itself (not on one of its controls) follows the panel's own link
    root.addEventListener('click', (e) => {
      if (e.defaultPrevented || e.button !== 0) return;
      const card = e.target.closest('[data-ov-card]');
      if (!card || e.target.closest('a, button, input, label, select, summary, .ovd-chart, .ovd-donut-wrap, [data-ov-slice]')) return;
      if (String(getSelection?.() || '').trim()) return;   // selecting text is not a click
      if (card.classList.contains('ovd-docs')) { window.FFInvDocs?.open(null, $('.ovd-all', card)); return; }
      if (card.dataset.ovGo) show(card.dataset.ovGo);
    });
    // linked highlighting from the other side: pointing at a KPI, a ticker figure or the deficit readout lifts its funding part
    const slices = ['deficit', 'refinance', 'floor', 'contingency'];
    for (const el of $$('#kpis [data-link], .cc-tick-track [data-link], #ovd .ro-total[data-link]')) {
      const k = el.dataset.link;
      el.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'mouse') return; link(k); if (slices.includes(k)) ovDonut.hover(k); });
      el.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'mouse') return; link(null); if (slices.includes(k)) ovDonut.hover(null); });
    }

    // the sticky KPI ticker (phones) sits exactly under the top bar, whatever its height
    (() => { const bar = $('.studio-top'); if (!bar) return; const put = () => R.style.setProperty('--cc-sticky', `${bar.offsetHeight}px`); put(); if (typeof ResizeObserver === 'function') new ResizeObserver(put).observe(bar); })();
    // ---- phones: the panels around the centerpiece sit in a swipeable dock; the segmented control follows the swipe and jumps
    (() => {
      const dock = $('#ovDock'), tabs = $$('.ovd-tabs [data-dock]'); if (!dock || !tabs.length) return;
      const panel = (k) => $(`[data-dock-panel="${k}"]`, dock);
      const mark = (k) => tabs.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.dock === k)));
      tabs.forEach((b) => b.addEventListener('click', () => {
        const p = panel(b.dataset.dock); if (!p) return;
        mark(b.dataset.dock);
        dock.scrollTo({ left: p.offsetLeft - parseFloat(getComputedStyle(dock).paddingLeft || '0'), behavior: motionOn() ? 'smooth' : 'auto' });
      }));
      let raf = 0;
      dock.addEventListener('scroll', () => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          if (dock.scrollWidth <= dock.clientWidth + 2) return;
          const mid = dock.scrollLeft + dock.clientWidth / 2;
          let best = null, d = Infinity;
          for (const p of $$('[data-dock-panel]', dock)) { const c = p.offsetLeft + p.offsetWidth / 2, dd = Math.abs(c - mid); if (dd < d) { d = dd; best = p; } }
          if (best) mark(best.dataset.dockPanel);
        });
      }, { passive: true });
    })();
    return { build, scene: () => scene };
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
