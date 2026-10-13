// Director ops: the adapter the director dashboard v2 (staff-v2-ui.js) calls through its small "[director-ops hook]" lines
// (hub/DIRECTOR_OPS.md). It loads the schedule and the review queue next to the dashboard's own sources and hands back:
//   overview(staffing, nowMin)  the published schedule behind "Staffing vs need" (a scheduled line) and "Staff on the clock"
//   attention(ctx)              the attention chips: "n items waiting for review" (opens Content > Review) and swap requests
//   schedulePanel() / reviewPanel(), afterBuild(view, el), drawer(kind), prefetch(search), attach(shell)
// The review count follows every action at once (event "dops:review") and is re-read every 60 s while the page is open.
import { icon, figureHtml, tableHtml } from './ff-shell.js';
import { createSchedule } from './director-schedule.js';
import { createReview } from './director-review.js';
import * as K from './director-schedule-core.js';
import * as R from './director-review-core.js';

const OPS_W = {
  en: { review: (n) => `${n} ${n === 1 ? 'item waits' : 'items wait'} for review`, reviewSub: 'Content for children and families: named reviewers sign before anyone sees it', open: 'Review',
    swaps: (n) => `${n} shift swap ${n === 1 ? 'request' : 'requests'}`, swapsSub: 'Staff asked to give a shift away', decide: 'Decide', sched: 'Scheduled', schedNow: (n) => `${n} scheduled now`,
    noSched: 'no published schedule today', schedLine: 'Scheduled (published schedule)', summary: (n) => `${n} ${n === 1 ? 'item' : 'items'} waiting · open review queue` },
  es: { review: (n) => `${n} ${n === 1 ? 'elemento espera' : 'elementos esperan'} revisión`, reviewSub: 'Contenido para niños y familias: lo firman revisoras nombradas antes de que alguien lo vea', open: 'Revisar',
    swaps: (n) => `${n} ${n === 1 ? 'pedido' : 'pedidos'} de cambio de turno`, swapsSub: 'El personal pidió ceder un turno', decide: 'Decidir', sched: 'Programadas', schedNow: (n) => `${n} programadas ahora`,
    noSched: 'sin horario publicado hoy', schedLine: 'Programadas (horario publicado)', summary: (n) => `${n} en espera · abrir la cola de revisión` },
};

export async function loadDirectorOps({ c, rpc, esc, lang = 'en', live, friendly }) {
  const O = OPS_W[lang === 'es' ? 'es' : 'en'];
  let shell = null;
  const base = { c, rpc, esc, lang, live, friendly, icon, figureHtml, tableHtml, shell: () => shell };
  const schedule = createSchedule(base);
  await schedule.load(null);
  const staff = (schedule.data()?.staff || []).map((p) => ({ user_id: p.user_id, name: p.name }));
  const review = createReview({ ...base, staff });
  await review.load().catch(() => null);
  let waiting = review.count();
  const home = `/c/${c.slug}/home`;

  function attention() {
    const out = [];
    if (waiting) out.push({ key: 'review', tone: 'soon', icon: 'doc', title: O.review(waiting), sub: O.reviewSub, href: `${home}?view=content&tab=review`, go: O.open });
    const sw = (schedule.data()?.swaps || []).filter((s) => s.status === 'pending');
    if (sw.length) out.push({ key: 'swaps', tone: 'soon', icon: 'swap', title: O.swaps(sw.length), sub: O.swapsSub, href: `${home}?view=staff&tab=schedule&drawer=swap:${sw[0].id}`, go: O.decide });
    return out;
  }
  // staffing: staff-v2's staffingModel result (slots every 30 min). Adds .sched per slot and widens .max (mutates, returns extras).
  function overview(staffing, nowMin) {
    const w = schedule.data(); if (!w) return null;
    const pub = w.published || [];
    const hasToday = pub.some((s) => s.day === w.today);
    if (staffing && hasToday) {
      for (const s of staffing.slots) s.sched = K.onAt(pub, w.today, s.t).length;
      staffing.max = Math.max(staffing.max, ...staffing.slots.map((s) => s.sched));
    }
    const now = K.scheduledNow(pub, w.today, nowMin);
    return {
      hasToday, scheduledNow: hasToday ? now : null,
      kpiSub: hasToday ? ` · ${O.schedNow(now)}` : ` · ${O.noSched}`,
      schedPath: (X, Y, seen) => {
        if (!hasToday || !seen.length) return '';
        const d = seen.map((s, j) => `${j ? 'L' : 'M'}${X(s.i).toFixed(1)} ${Y(s.sched ?? 0).toFixed(1)}${j < seen.length - 1 ? `L${X(seen[j + 1].i).toFixed(1)} ${Y(s.sched ?? 0).toFixed(1)}` : ''}`).join('');
        return `<path class="dops-sched-line" d="${d}" data-len="600"/>`;
      },
      legend: hasToday ? `<li class="lg-sched">${esc(O.schedLine)}</li>` : '',
      schedWord: O.sched,
    };
  }
  const schedulePanel = () => schedule.panelHtml();
  const reviewPanel = () => review.panelHtml();
  function afterBuild(view, el) {
    if (view === 'staff') schedule.bind(el);
    if (view === 'content') review.bind(el);
  }
  function drawer(kind) {
    const k = String(kind).split(':')[0];
    if (['shift', 'add', 'cover', 'swap'].includes(k)) return schedule.drawer(kind);
    if (k === 'review' || k === 'netreview') return review.drawer(kind);
    return null;
  }
  async function prefetch(search = location.search) {
    const d = new URLSearchParams(search).get('drawer');
    if (d && /^(review|netreview):/.test(d)) await review.prefetch(d).catch(() => null);
  }
  function setCount(n) {
    if (n == null) return;
    waiting = n;
    const chip = document.querySelector('#sv2Attn [data-key="review"]');
    if (chip) { const b = chip.querySelector('.ffs-attn-t b'); if (b) b.textContent = O.review(n); chip.hidden = !n; }
    const tab = document.getElementById('sv2-vt-content');
    if (tab) {
      let badge = tab.querySelector('.dops-badge');
      if (!badge && n) { badge = document.createElement('span'); badge.className = 'ffs-badge dops-badge'; tab.appendChild(badge); }
      if (badge) { badge.textContent = String(n); badge.setAttribute('aria-label', O.review(n)); badge.hidden = !n; }
    }
  }
  function attach(sh) {
    shell = sh;
    setCount(waiting);
    document.addEventListener('dops:review', (e) => setCount(e.detail?.waiting));
    const t = setInterval(async () => {
      if (!document.getElementById('sv2')) { clearInterval(t); return; }
      if (document.visibilityState !== 'visible') return;
      try { const r = await rpc('center_review_count', { p_center: c.center_id }); setCount(Number(r.center || 0)); /* moments have their own chip (staff-v2) */ } catch { /* the next tick tries again */ }
    }, 60000);
  }
  const reviewSummary = () => O.summary(waiting ?? 0);
  return { reviewSummary, attention, overview, schedulePanel, reviewPanel, afterBuild, drawer, prefetch, attach, schedule, review, waitingCount: () => waiting, R };
}
