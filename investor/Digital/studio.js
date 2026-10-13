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
   No library; transform / opacity / stroke only; no loops. Sends nothing, stores nothing. */
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
  const donut = (() => {
    const C = 160, RAD = 118, CIRC = 2 * Math.PI * RAD, GAP = 3, LIFT = 12;
    let slices = [], pinned = -1, built = false;
    const host = $('#allocationArcs'), tip = $('#donutTip'), wrap = $('.donut-wrap'), detail = $('#allocationDescription'), hint = $('#donutHint');
    const buttons = $$('#allocationControls [data-slice]');
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
      $('#donutTotal').textContent = money(total);
      built = true;
      const want = params().get('slice');
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
    return { build, pick, draw, land, select };
  })();

  // ================================================================ Pilot year: the 12 months from the published monthly cash file
  const year = (() => {
    // phones get a taller canvas and larger labels (the chart is drawn in its own units and scaled to fit)
    const phoneMq = typeof matchMedia === 'function' ? matchMedia('(max-width:767px)') : { matches: false, addEventListener() {} };
    // the chart is drawn at its real pixel size (1 unit = 1 CSS px), so labels are true 13-14 px at every width; redrawn on resize
    let W = 960, RGT = 944, TOP = 18, L = 64, BOT = 360, H = 400, step = 72;
    const chart = $('#cashChart'), scrub = $('#monthScrubber'), playBtn = $('#playTimeline');
    let rows = null, x = null, y = null, month = 1, timer = null, wantDraw = false, anims = [], hidden = new Set();
    const spend = (r) => r.recurring + r.one_time;
    function parse(text) {
      const [head, ...lines] = text.trim().split(/\r?\n/);
      const keys = head.split(',').map((k) => k.trim());
      return lines.map((l) => { const c = l.split(','), o = {}; keys.forEach((k, i) => { o[k] = Number(c[i]); }); return o; });
    }
    // the file and the model must agree on every month, to the cent; otherwise the chart uses the model and says so
    const agree = (a, b) => a.length === b.length && a.every((r, i) => ['month', 'children', 'receipts', 'recurring', 'one_time', 'net', 'cumulative'].every((k) => Math.abs(r[k] - b[i][k]) < 0.005));
    const csv = fetch('../costs/Pilot_40_Children_Monthly_Cash.csv', { cache: 'no-store' }).then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status))))).then(parse).catch(() => null);
    async function build(m) {
      const file = await csv;
      const ok = file && agree(file, m.cash);
      rows = ok ? file : m.cash;
      chart.dataset.source = ok ? 'csv' : 'model';
      layout();
      scrub.disabled = false;
      select(month);
      if (wantDraw) { wantDraw = false; draw(true); }
    }
    function layout() {
      if (!rows) return;
      if (!chart.parentElement.clientWidth && rows.laidOut) return;   // hidden view: keep the last drawing until it is shown
      rows.laidOut = true;
      const ph = phoneMq.matches;
      W = Math.max(280, Math.round(chart.parentElement.clientWidth || 960));
      H = ph ? 340 : Math.round(Math.min(440, Math.max(380, W * 0.46)));
      L = ph ? 50 : 64; RGT = W - 10; TOP = 18; BOT = H - 40;
      chart.setAttribute('viewBox', `0 0 ${W} ${H}`);
      chart.classList.toggle('chart-narrow', (RGT - L) / 12 < 44);
      const top = Math.ceil(Math.max(...rows.map(spend), ...rows.map((r) => r.receipts)) / 25000) * 25000, ystep = top / 4;
      const bottom = Math.floor(Math.min(0, ...rows.map((r) => r.net)) / ystep) * ystep;
      step = (RGT - L) / 12; x = (i) => L + step / 2 + i * step;
      y = (v) => BOT - (v - bottom) / (top - bottom) * (BOT - TOP);
      const grid = $('#cashGrid', chart); grid.replaceChildren();
      for (let v = bottom; v <= top + 1; v += ystep) {
        grid.append(svg('line', { x1: L, x2: RGT, y1: y(v).toFixed(2), y2: y(v).toFixed(2), class: v === 0 ? 'chart-zero' : 'chart-grid-line' }));
        if (v >= 0) { const lab = svg('text', { x: L - 12, y: (y(v) + 5).toFixed(2), class: 'chart-grid-label', 'text-anchor': 'end' }); lab.textContent = v === 0 ? '$0' : '$' + Math.round(v / 1000) + 'k'; grid.append(lab); }
      }
      rows.forEach((r, i) => { const lab = svg('text', { x: x(i).toFixed(2), y: BOT + 26, class: `chart-month${r.month % 2 ? '' : ' m-even'}`, 'text-anchor': 'middle' }); lab.textContent = 'M' + String(r.month).padStart(2, '0'); grid.append(lab); });
      const bars = $('#gapBars', chart); bars.replaceChildren();
      rows.forEach((r, i) => {
        const h = Math.max(1.5, y(r.net) - y(0));
        const bw = Math.max(10, Math.min(34, step * 0.5)); const b = svg('rect', { x: (x(i) - bw / 2).toFixed(2), y: y(0).toFixed(2), width: bw.toFixed(2), height: h.toFixed(2), rx: 6, class: 'gap-bar' });
        b.style.setProperty('--i', i);
        bars.append(b);
      });
      const line = (vals) => vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(' ');
      const rec = line(rows.map((r) => r.receipts));
      $('#receiptArea', chart).setAttribute('d', `${rec} L${x(11).toFixed(2)},${y(0).toFixed(2)} L${x(0).toFixed(2)},${y(0).toFixed(2)} Z`);
      for (const [id, vals] of [['receiptPath', rows.map((r) => r.receipts)], ['spendingPath', rows.map(spend)]]) { const p = $(`#${id}`, chart); p.setAttribute('d', line(vals)); p.setAttribute('pathLength', '1'); }
      $('#cashCursor', chart).setAttribute('y1', TOP - 6); $('#cashCursor', chart).setAttribute('y2', BOT);
      const hits = $('#cashHitTargets', chart); hits.replaceChildren();
      rows.forEach((r, i) => {
        const hit = svg('rect', { x: (x(i) - step / 2).toFixed(2), y: 0, width: step.toFixed(2), height: H, class: 'cash-hit' });
        hit.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && !dragging) select(r.month); });
        hits.append(hit);
      });
      if (month) select(month);
    }
    function select(mo) {
      if (!rows) return;
      month = Math.min(12, Math.max(1, mo));
      const i = month - 1, r = rows[i];
      scrub.value = month;
      I.setAttr(scrub, 'aria-valuetext', `Month ${month}, ${r.children} children, cumulative cash deficit ${money(Math.abs(r.cumulative))}`);
      $('#cashMonth').textContent = String(month).padStart(2, '0');
      I.set($('#monthLabel'), 'Month ' + month);
      $('#cashDeficit').textContent = money(Math.abs(r.cumulative));
      $('#cashChildren').textContent = String(r.children);
      $('#cashReceipts').textContent = money(r.receipts);
      $('#cashSpending').textContent = money(spend(r));
      $('#cashNet').textContent = signed(money(r.net));
      chart.style.setProperty('--cx', `${(x(i) / W * 100).toFixed(3)}%`);
      const cur = $('#cashCursor', chart); cur.setAttribute('x1', x(i).toFixed(2)); cur.setAttribute('x2', x(i).toFixed(2));
      for (const [id, v] of [['receiptDot', r.receipts], ['spendingDot', spend(r)]]) { const d = $(`#${id}`, chart); d.setAttribute('cx', x(i).toFixed(2)); d.setAttribute('cy', y(v).toFixed(2)); }
      $$('.gap-bar', chart).forEach((b, k) => b.classList.toggle('on', k === i));
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
    D.addEventListener('studio:view', (e) => { if (e.detail.view !== 'pilot') pause(); });
    // Revenue / Expenses / Operating gap: what the chart shows (at least one stays on)
    for (const b of $$('[data-series]')) b.addEventListener('click', () => {
      const k = b.dataset.series, on = b.getAttribute('aria-pressed') === 'true';
      if (on && hidden.size === 2) return;
      if (on) hidden.add(k); else hidden.delete(k);
      b.setAttribute('aria-pressed', String(!on));
      chart.classList.toggle(`hide-${k}`, on);
      $(`.mc-${{ revenue: 'rev', expenses: 'exp', gap: 'gap' }[k]}`)?.classList.toggle('muted', on);
    });
    // the entrance: the lines draw, the gap bars grow month by month, the cursor arrives last
    function draw(animate) {
      anims.forEach((a) => a.cancel()); anims = [];
      if (!animate) return;
      if (!rows) { wantDraw = true; return; }
      const o = { easing: EASE, fill: 'backwards' };
      for (const id of ['receiptPath', 'spendingPath']) anims.push($(`#${id}`, chart).animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { ...o, duration: DUR, delay: 250 }));
      anims.push($('#receiptArea', chart).animate([{ opacity: 0 }, { opacity: 1 }], { ...o, duration: 700, delay: 250 + DUR * 0.6 }));
      $$('.gap-bar', chart).forEach((b, i) => anims.push(b.animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { ...o, duration: 520, delay: 350 + i * 80 })));
      for (const id of ['cashCursor', 'receiptDot', 'spendingDot']) anims.push($(`#${id}`, chart).animate([{ opacity: 0 }, { opacity: 1 }], { ...o, duration: 400, delay: 250 + DUR }));
    }
    const land = () => { wantDraw = false; anims.forEach((a) => a.finish()); };
    phoneMq.addEventListener('change', layout);
    D.addEventListener('studio:view', (e) => { if (e.detail.view === 'pilot') layout(); });
    if (typeof ResizeObserver === 'function') { let lastW = 0, rt = 0; new ResizeObserver((es) => { const w = Math.round(es[0].contentRect.width); if (!w || Math.abs(w - lastW) < 2) return; lastW = w; clearTimeout(rt); rt = setTimeout(layout, 120); }).observe(chart.parentElement); }
    I.onChange(() => { if (rows) select(month); });
    return { build, draw, land, select, rows: () => rows };
  })();

  // ================================================================ Scenarios: the model's method, live
  const scen = (() => {
    const tu = $('#scenarioTuition'), ch = $('#scenarioChildren'), co = $('#scenarioCollection'), reset = $('#scenarioReset');
    const out = $('#scenarioMargin'), sr = $('#scenarioMarginSr');
    let calc = null, shown = null, raf = 0, srTimer = 0;
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
      return { base, margin, breakEven, cost, revenue: (n, tt, c) => n * tt * 12 * c };
    }
    function write(v) { out.textContent = signed(money(v)); }
    function count(to) {
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
    function update() {
      if (!calc) return;
      const tt = Number(tu.value), n = Number(ch.value), c = Number(co.value) / 100;
      const margin = calc.margin(n, tt, c), revenue = calc.revenue(n, tt, c), be = calc.breakEven(n, c);
      $('#tuitionOutput').textContent = whole(tt); $('#childrenOutput').textContent = String(n); $('#collectionOutput').textContent = Math.round(c * 100) + '%';
      count(margin);
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
      shown = null; update();
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
    const dlg = $('#curriculumPreview'), btn = $('#curriculumOpen'); if (!dlg || !btn) return;
    const close = () => { if (!dlg.open) return; dlg.close(); btn.focus(); };
    btn.addEventListener('click', () => { dlg.showModal(); $('[data-close]', dlg).focus(); if (motionOn()) $('.cd-sheet', dlg).animate([{ opacity: 0, transform: 'translate3d(0,24px,0) scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: EASE }); });
    dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target.closest('[data-close]')) close(); });
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
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
    donut.build(model); scen.build(model); year.build(model);
  });
  window.FFInvStudio = Object.freeze({ show, view: () => view, views: VIEWS, scenario: () => scen.method(), year: () => year.rows() });
})();
