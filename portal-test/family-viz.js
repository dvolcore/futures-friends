// The parent dashboard's living infographics (v2, hub/FAMILY_DASHBOARD.md "Dashboard v2"). Owner 2026-10-12: "How do we create next level
// infographics?" Each one is drawn from the rows family_dashboard / family_dashboard_extras (and, on their own views, family_billing and
// health_child_get) return: DERIVE, NEVER RESTATE. Nothing here is decorative data; a source that returned nothing gives null and the page
// says "not connected yet". Nothing compares the child with anyone else (no class figures, no ordering of children).
//
// Pure: strings in, strings out, no DOM and no network (tests/family-dashboard-unit.test.mjs imports it). Every graphic comes with
//   - a model (the numbers it draws, so a test can check them),
//   - an SVG / HTML string whose FINAL state is in the markup (Reduce Motion shows it complete; family-dashboard.js only animates it in),
//   - a text summary (visually hidden next to the graphic) and a table (the "Show as table" toggle).
// Colours are classes (family-v2.css), never inline styles (the CSP has no 'unsafe-inline'); SVG geometry attributes are not styles.

const R2 = (n) => Math.round(n * 100) / 100;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const FEEL_ART = { happy: 'bop-waving', calm: 'lumi', curious: 'zuri-magnifier', energetic: 'bop-dancing', tired: 'booker-reading', wanted_comfort: 'lumi-waving' };
const FRIENDS = ['booker', 'lumi', 'zuri', 'bop'];

export const VW = {
  en: {
    clock: 'Day clock', clockOf: (f) => `${f}'s day clock`, now: 'Now', arrived: (t) => `Arrived ${t}`, pickedUp: (t) => `Picked up ${t}`, usualPickup: (t) => `Usual pickup about ${t}`,
    notIn: 'Not checked in yet', resting: 'Resting', soFar: 'so far today', clockSum: (f, a, n, e) => `${f}'s day: ${a}. ${n} ${n === 1 ? 'entry' : 'entries'} so far${e ? `: ${e}` : ''}.`,
    kinds: { meal: 'meal', drink: 'drink', nap: 'rest', toilet: 'potty', activity: 'activity', note: 'note', mood: 'feeling', incident: 'incident report' },
    kindsPl: { meal: 'meals', drink: 'drinks', nap: 'rests', toilet: 'potty', activity: 'activities', note: 'notes', mood: 'feelings' },
    incidentAt: (t) => `Incident report at ${t}`, time: 'Time', what: 'What', day: 'Day', amount: 'Amount', minutes: 'Minutes', feeling: 'Feeling', area: 'Area of learning',
    showTable: 'Show as table', hideTable: 'Show as picture', legend: 'Key',
    plate: (m) => `${m}: the plate`, plateSum: (m, items) => `${m}: ${items}.`, triedNew: 'Tried something new', noMeals: 'No meals logged yet today.',
    weekPlates: 'The plate, school day by school day', weekPlatesSum: (list) => `Share of the plate by day: ${list}.`, nothing: 'nothing logged',
    rest: 'Rest today', restSum: (t, u) => `Rest today: ${t}${u ? `. ${u}` : ''}.`, usual: (m) => `Usual for this child: ${m}`, restNone: 'No rest logged yet today.',
    sky: 'Feelings this week', skySum: (list) => `Feelings by day: ${list}.`, skyNone: 'No feelings logged yet this week.',
    flower: 'Skills by area of learning', flowerSum: (list) => `From the latest report, by area: ${list}.`, flowerArea: (a, s, d, e) => `${a}: ${s} secure, ${d} developing, ${e} emerging`,
    points: (p, m) => `${p} of ${m} points`, ownNumbers: "The child's own numbers, never compared with other children.",
    lv: { secure: 'Secure', developing: 'Developing', emerging: 'Emerging' },
    month: (m) => `Attendance in ${m}`, monthSum: (m, p, s, c) => `${m}: here ${p} of ${s} school days so far${c ? `; ${c} closed` : ''}.`,
    here: 'Here', away: 'Not here', closed: 'Closed', early: 'Early dismissal', today: 'Today', ahead: 'Coming up', weekend: 'Weekend',
    wd: ['M', 'T', 'W', 'T', 'F'],
    garden: 'The home garden', gardenSum: (d, n) => `${d} of ${n} home activities done this week: ${d} ${d === 1 ? 'plant' : 'plants'} growing.`, gardenNone: 'No home activities this week.',
    seed: 'Not done yet', grown: 'Done',
    balance: 'Balance', paid: 'Paid', due: 'Due', balanceSum: (b, p, t) => `Balance ${b}. Paid ${p} of ${t} billed.`, nothingDue: 'Nothing due',
    timeline: 'Invoices and payments', timelineSum: (n, m) => `${n} ${n === 1 ? 'invoice' : 'invoices'} and ${m} ${m === 1 ? 'payment' : 'payments'}.`, invoice: (n) => `Invoice ${n}`, payment: 'Payment',
    status: { open: 'Open', past_due: 'Past due', paid: 'Paid', void: 'Void', partial: 'Partly paid' },
  },
  es: {
    clock: 'Reloj del día', clockOf: (f) => `El reloj del día de ${f}`, now: 'Ahora', arrived: (t) => `Llegó ${t}`, pickedUp: (t) => `Lo recogieron ${t}`, usualPickup: (t) => `Suelen recogerlo hacia las ${t}`,
    notIn: 'Todavía no registra llegada', resting: 'Descansando', soFar: 'hasta ahora', clockSum: (f, a, n, e) => `El día de ${f}: ${a}. ${n} ${n === 1 ? 'registro' : 'registros'} hasta ahora${e ? `: ${e}` : ''}.`,
    kinds: { meal: 'comida', drink: 'bebida', nap: 'descanso', toilet: 'baño', activity: 'actividad', note: 'nota', mood: 'emoción', incident: 'reporte de incidente' },
    kindsPl: { meal: 'comidas', drink: 'bebidas', nap: 'descansos', toilet: 'baño', activity: 'actividades', note: 'notas', mood: 'emociones' },
    incidentAt: (t) => `Reporte de incidente a las ${t}`, time: 'Hora', what: 'Qué', day: 'Día', amount: 'Cantidad', minutes: 'Minutos', feeling: 'Emoción', area: 'Área de aprendizaje',
    showTable: 'Ver como tabla', hideTable: 'Ver como imagen', legend: 'Clave',
    plate: (m) => `${m}: el plato`, plateSum: (m, items) => `${m}: ${items}.`, triedNew: 'Probó algo nuevo', noMeals: 'Todavía no hay comidas registradas hoy.',
    weekPlates: 'El plato, día de clase por día de clase', weekPlatesSum: (list) => `Parte del plato por día: ${list}.`, nothing: 'nada registrado',
    rest: 'Descanso de hoy', restSum: (t, u) => `Descanso de hoy: ${t}${u ? `. ${u}` : ''}.`, usual: (m) => `Lo normal para su hijo o hija: ${m}`, restNone: 'Todavía no hay descanso registrado hoy.',
    sky: 'Cómo se sintió esta semana', skySum: (list) => `Emociones por día: ${list}.`, skyNone: 'Todavía no hay emociones registradas esta semana.',
    flower: 'Habilidades por área de aprendizaje', flowerSum: (list) => `Del informe más reciente, por área: ${list}.`, flowerArea: (a, s, d, e) => `${a}: ${s} afianzadas, ${d} en desarrollo, ${e} emergentes`,
    points: (p, m) => `${p} de ${m} puntos`, ownNumbers: 'Los números propios de su hijo o hija; nunca se compara con otros niños.',
    lv: { secure: 'Afianzado', developing: 'En desarrollo', emerging: 'Emergente' },
    month: (m) => `Asistencia en ${m}`, monthSum: (m, p, s, c) => `${m}: vino ${p} de ${s} días de clase hasta ahora${c ? `; ${c} cerrado` : ''}.`,
    here: 'Vino', away: 'No vino', closed: 'Cerrado', early: 'Salida temprano', today: 'Hoy', ahead: 'Próximamente', weekend: 'Fin de semana',
    wd: ['L', 'M', 'M', 'J', 'V'],
    garden: 'El jardín de casa', gardenSum: (d, n) => `${d} de ${n} actividades para casa hechas esta semana: ${d} ${d === 1 ? 'planta crece' : 'plantas crecen'}.`, gardenNone: 'No hay actividades para casa esta semana.',
    seed: 'Todavía no', grown: 'Hecha',
    balance: 'Saldo', paid: 'Pagado', due: 'Pendiente', balanceSum: (b, p, t) => `Saldo ${b}. Pagado ${p} de ${t} facturado.`, nothingDue: 'Nada pendiente',
    timeline: 'Facturas y pagos', timelineSum: (n, m) => `${n} ${n === 1 ? 'factura' : 'facturas'} y ${m} ${m === 1 ? 'pago' : 'pagos'}.`, invoice: (n) => `Factura ${n}`, payment: 'Pago',
    status: { open: 'Abierta', past_due: 'Vencida', paid: 'Pagada', void: 'Anulada', partial: 'Pagada en parte' },
  },
};
export const vw = (lang) => VW[lang === 'es' ? 'es' : 'en'];

// ---- time ------------------------------------------------------------------------------------------------------------------------
// "8:12 AM" -> 492 (minutes after midnight); null when it is not a time
export function clockMinutes(text) {
  const m = /^\s*(\d{1,2}):(\d{2})\s*([AaPp])\.?\s*[Mm]\.?\s*$/.exec(String(text || ''));
  if (!m) return null;
  let h = Number(m[1]) % 12; if (/p/i.test(m[3])) h += 12;
  return h * 60 + Number(m[2]);
}
// an instant -> minutes after midnight in the center's time zone
export function localMinutes(iso, tz) {
  if (!iso) return null;
  const d = new Date(iso); if (Number.isNaN(d.getTime())) return null;
  try {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric', hourCycle: 'h23', ...(tz ? { timeZone: tz } : {}) }).formatToParts(d).map((x) => [x.type, x.value]));
    return (Number(p.hour) % 24) * 60 + Number(p.minute);
  } catch (_) { return d.getHours() * 60 + d.getMinutes(); }
}
export function minutesClock(min, lang = 'en') {
  if (min == null) return '';
  const h = Math.floor(min / 60) % 24, m = Math.round(min % 60);
  return new Intl.DateTimeFormat(lang === 'es' ? 'es-US' : 'en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(new Date(Date.UTC(2000, 0, 1, h, m)));
}
const median = (xs) => { const s = xs.filter((x) => x != null).sort((a, b) => a - b); if (!s.length) return null; const i = Math.floor(s.length / 2); return s.length % 2 ? s[i] : Math.round((s[i - 1] + s[i]) / 2); };
const restMinutes = (words) => { const m = /\((\d+)\s*min\)/.exec(String(words || '')); return m ? Number(m[1]) : null; };

// ---- the Day Clock ------------------------------------------------------------------------------------------------------------------
// A school-day ring from arrival to pickup. The window: today's arrival (else the child's usual arrival from their own past days) to
// today's pickup (else the child's usual pickup, else an hour past the latest of now and the last entry). Rest is an arc of its real
// length; meals, activities, potty and feelings are beads at their time (a bead marks a moment, it claims no duration); an incident is a
// marker; the "now" hand moves on the 60-second refresh. Returns null only when there is nothing at all to draw (no arrival and no
// history): the page then says "not checked in yet" without a made-up day.
export function dayClockModel({ today, stats, nowMin, tz }) {
  const t = today || {}, att = t.attendance || {};
  const days = (stats?.days || []).filter((d) => d.present);
  const usualIn = median(days.map((d) => clockMinutes(d.in)));
  const usualOut = median(days.map((d) => clockMinutes(d.out)));
  const arrived = clockMinutes(att.arrived), left = clockMinutes(att.left);
  const entries = (t.timeline || []).map((e) => ({ ...e, min: localMinutes(e.at, tz) })).filter((e) => e.min != null);
  const start = arrived ?? usualIn;
  if (start == null && !entries.length) return null;
  const s0 = start ?? Math.min(...entries.map((e) => e.min));
  const lastAt = Math.max(s0, ...entries.map((e) => e.min));
  let end = left ?? usualOut ?? Math.max(nowMin ?? lastAt, lastAt) + 60;
  if (end <= s0 + 30) end = s0 + 30;
  if (!left && nowMin != null && nowMin > end && arrived != null) end = nowMin + 15;   // still here after the usual time: the ring stretches
  const segs = entries.map((e) => {
    if (e.kind === 'nap') {
      const len = restMinutes(e.words) ?? (e.ended ? null : (nowMin != null ? Math.max(1, nowMin - e.min) : null));
      return { id: e.id, kind: 'nap', from: e.min, to: e.min + (len ?? 0), arc: len != null, live: !e.ended, time: e.time, words: e.words, code: e.code };
    }
    return { id: e.id, kind: e.kind, from: e.min, to: e.min, arc: false, time: e.time, words: e.words, code: e.code };
  });
  const incidents = (t.incidents || []).map((i) => ({ id: i.id, min: clockMinutes(i.time), time: i.time, acknowledged: !!i.acknowledged })).filter((i) => i.min != null);
  const now = nowMin == null ? null : clamp(nowMin, s0, end);
  const elapsedTo = left ?? (arrived != null && nowMin != null ? clamp(nowMin, s0, end) : null);
  return { start: s0, end, arrived, left, usualIn, usualOut, now: left != null ? null : now, elapsedTo, segs, incidents,
    progress: elapsedTo == null ? 0 : R2((elapsedTo - s0) / (end - s0)) };
}

// the ring is a 300-degree gauge (the gap at the bottom holds the friend); 0 = arrival, 1 = pickup
const GAUGE = 300, G0 = -150;
const angleOf = (m, M) => G0 + GAUGE * clamp((m - M.start) / (M.end - M.start), 0, 1);
const polar = (cx, cy, r, deg) => { const a = ((deg - 90) * Math.PI) / 180; return [R2(cx + r * Math.cos(a)), R2(cy + r * Math.sin(a))]; };
function arcPath(cx, cy, r, a0, a1) {
  const [x0, y0] = polar(cx, cy, r, a0), [x1, y1] = polar(cx, cy, r, a1);
  return `M${x0} ${y0}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`;
}
const arcLen = (r, a0, a1) => R2((Math.PI * r * Math.abs(a1 - a0)) / 180);

export function clockSummary(M, f, lang = 'en') {
  const V = vw(lang);
  if (!M) return `${f}: ${V.notIn}.`;
  const a = M.left != null ? V.pickedUp(minutesClock(M.left, lang)) : M.arrived != null ? `${V.arrived(minutesClock(M.arrived, lang))}${M.usualOut != null ? `; ${V.usualPickup(minutesClock(M.usualOut, lang))}` : ''}` : V.notIn;
  const counts = {};
  for (const s of M.segs) counts[s.kind] = (counts[s.kind] || 0) + 1;
  const e = Object.entries(counts).map(([k, n]) => `${n} ${n === 1 ? V.kinds[k] || k : V.kindsPl[k] || k}`).join(', ');
  return V.clockSum(f, a, M.segs.length, e) + (M.incidents.length ? ` ${M.incidents.map((i) => V.incidentAt(i.time)).join('. ')}.` : '');
}

// The SVG. Interactive segments are role=button with their own label (tap or Enter opens that entry in the drawer); the hour ticks and
// the track are decoration. esc: the page's HTML escaper.
export function clockSvg(M, { esc, lang = 'en', first = '', friend = 'bop', size = 300 } = {}) {
  const V = vw(lang);
  const c = size / 2, rT = c - 26, rIn = rT - 22, rOut = rT + 13;
  if (!M) {
    return `<svg class="fv-clock fv-clock-empty" viewBox="0 0 ${size} ${size}" role="img" aria-label="${esc(`${first}: ${V.notIn}`)}">
      <path class="fv-track" d="${arcPath(c, c, rT, G0, G0 + GAUGE)}"/><text class="fv-c-big" x="${c}" y="${c - 4}" text-anchor="middle">—</text>
      <text class="fv-c-small" x="${c}" y="${c + 20}" text-anchor="middle">${esc(V.notIn)}</text></svg>`;
  }
  const ticks = [];
  for (let h = Math.ceil(M.start / 60) * 60; h <= M.end; h += 60) {
    const a = angleOf(h, M), [x1, y1] = polar(c, c, rT - 12, a), [x2, y2] = polar(c, c, rT - 6, a), [tx, ty] = polar(c, c, rT - 26, a);
    const label = minutesClock(h, lang).replace(/:00/, '').replace(/\s?[AP]\.?\s?M\.?/i, '').replace(/\s?[ap]\.?\s?m\.?/i, '');
    ticks.push(`<line class="fv-tick" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><text class="fv-tick-t" x="${tx}" y="${ty + 4}" text-anchor="middle">${esc(label)}</text>`);
  }
  const elapsed = M.elapsedTo != null && M.elapsedTo > M.start ? (() => { const a1 = angleOf(M.elapsedTo, M); return `<path class="fv-elapsed" d="${arcPath(c, c, rT, G0, a1)}" data-len="${arcLen(rT, G0, a1)}"/>`; })() : '';
  const seg = (s) => {
    const label = `${s.time}: ${s.words}`;
    const attrs = `class="fv-seg fv-seg-${esc(s.kind)}${s.live ? ' fv-live' : ''}" role="button" tabindex="0" data-drawer="entry:${esc(s.id)}" aria-label="${esc(label)}" data-tip="${esc(label)}"`;
    if (s.kind === 'nap' && s.arc && s.to > s.from) {
      const a0 = angleOf(s.from, M), a1 = Math.max(a0 + 2, angleOf(s.to, M));
      return `<g ${attrs}><path class="fv-nap-hit" d="${arcPath(c, c, rIn, a0, a1)}"/><path class="fv-nap" d="${arcPath(c, c, rIn, a0, a1)}" data-len="${arcLen(rIn, a0, a1)}"/></g>`;
    }
    const a = angleOf(s.from, M), [x, y] = polar(c, c, s.kind === 'nap' ? rIn : rOut, a);
    return `<g ${attrs}><circle class="fv-bead-hit" cx="${x}" cy="${y}" r="11"/><circle class="fv-bead" cx="${x}" cy="${y}" r="${s.kind === 'activity' || s.kind === 'meal' ? 7 : 5.5}"/></g>`;
  };
  const inc = M.incidents.map((i) => { const [x, y] = polar(c, c, rT, angleOf(i.min, M)); const label = V.incidentAt(i.time);
    return `<g class="fv-seg fv-inc${i.acknowledged ? ' fv-inc-ack' : ''}" role="button" tabindex="0" data-drawer="incident:${esc(i.id)}" aria-label="${esc(label)}" data-tip="${esc(label)}">
      <circle class="fv-bead-hit" cx="${x}" cy="${y}" r="11"/><path class="fv-inc-mark" d="M${x} ${R2(y - 9)}L${R2(x + 8.5)} ${R2(y + 6)}H${R2(x - 8.5)}Z"/><path class="fv-inc-bang" d="M${x} ${R2(y - 3)}v4"/></g>`; }).join('');
  const hand = M.now != null ? (() => { const a = angleOf(M.now, M);
    return `<g class="fv-hand" data-angle="${R2(a)}" data-c="${c}"><g class="fv-hand-rot" transform="rotate(${R2(a)} ${c} ${c})"><line x1="${c}" y1="${c}" x2="${c}" y2="${R2(c - rT + 4)}"/><circle cx="${c}" cy="${R2(c - rT)}" r="6"/></g></g><circle class="fv-hub" cx="${c}" cy="${c}" r="5"/>`; })() : '';
  const [ax, ay] = polar(c, c, rT, G0), [px, py] = polar(c, c, rT, G0 + GAUGE);
  const centerBig = M.left != null ? minutesClock(M.left, lang) : M.now != null ? minutesClock(M.now, lang) : '';
  const centerSmall = M.left != null ? V.pickedUp('').trim() : M.segs.some((s) => s.live) ? V.resting : V.now;
  return `<svg class="fv-clock" viewBox="0 0 ${size} ${size}" role="group" aria-label="${esc(V.clockOf(first))}">
    <path class="fv-track" d="${arcPath(c, c, rT, G0, G0 + GAUGE)}"/>
    <path class="fv-lane" d="${arcPath(c, c, rIn, G0, G0 + GAUGE)}"/>
    ${elapsed}${ticks.join('')}
    <circle class="fv-end fv-end-in" cx="${ax}" cy="${ay}" r="5"/><circle class="fv-end ${M.left != null ? 'fv-end-out' : 'fv-end-usual'}" cx="${px}" cy="${py}" r="5"/>
    ${M.segs.map(seg).join('')}${inc}${hand}
    <text class="fv-c-big" x="${c}" y="${c + 40}" text-anchor="middle">${esc(centerBig)}</text>
    <text class="fv-c-small" x="${c}" y="${c + 58}" text-anchor="middle">${esc(centerSmall)}</text>
    <image class="fv-c-friend" href="img/scene/cut-${FRIENDS.includes(friend) ? friend : 'bop'}-440.webp" x="${c - 22}" y="${size - 52}" width="44" height="52" preserveAspectRatio="xMidYMax meet"/>
  </svg>`;
}
export const clockTable = (M, lang = 'en') => {
  const V = vw(lang);
  const rows = (M?.segs || []).map((s) => [s.time, s.words]).concat((M?.incidents || []).map((i) => [i.time, V.incidentAt(i.time)]));
  return { head: [V.time, V.what], rows: rows.sort((a, b) => (clockMinutes(a[0]) ?? 0) - (clockMinutes(b[0]) ?? 0)) };
};

// ---- the lunch plate ------------------------------------------------------------------------------------------------------------
export const AMOUNT = { none: 0, a_little: 0.25, about_half: 0.5, most: 0.75, all: 1 };
// one wedge per menu item (the meal's own plate when the teacher logged a single amount), each filled by how much was eaten
export function plateModel(meal) {
  if (!meal) return null;
  const items = (meal.items || []).length ? meal.items.map((i) => ({ name: i.name, amount: i.amount, share: AMOUNT[i.amount] ?? null }))
    : [{ name: null, amount: meal.amount, share: AMOUNT[meal.amount] ?? null }];
  return { meal: meal.meal, time: meal.time, title: meal.title || null, triedNew: !!meal.tried_new, items };
}
export function plateSvg(P, { esc, label = '', size = 200, small = false } = {}) {
  const c = size / 2, rRim = c - 4, rFood = rRim - (small ? 6 : 14);
  const n = P.items.length;
  const wedges = P.items.map((it, i) => {
    const a0 = (360 / n) * i, a1 = (360 / n) * (i + 1);
    const r = it.share == null ? 0 : Math.max(it.share > 0 ? 0.18 : 0, Math.sqrt(it.share)) * rFood;   // the area eaten, not the radius
    const tone = `fv-food-${i % 4}`;
    const outline = n === 1 ? `<circle class="fv-wedge-bg" cx="${c}" cy="${c}" r="${rFood}"/>` : `<path class="fv-wedge-bg" d="M${c} ${c}L${polar(c, c, rFood, a0).join(' ')}A${rFood} ${rFood} 0 0 1 ${polar(c, c, rFood, a1).join(' ')}Z"/>`;
    const fill = !r ? '' : n === 1 ? `<circle class="fv-wedge ${tone}" cx="${c}" cy="${c}" r="${R2(r)}"/>` : `<path class="fv-wedge ${tone}" d="M${c} ${c}L${polar(c, c, r, a0).join(' ')}A${R2(r)} ${R2(r)} 0 0 1 ${polar(c, c, r, a1).join(' ')}Z"/>`;
    return `<g class="fv-wedge-g">${outline}${fill}</g>`;
  }).join('');
  const sparkles = P.triedNew ? [30, 150, 260].map((a) => { const [x, y] = polar(c, c, rRim + 1, a); return `<path class="fv-sparkle" d="M${x} ${R2(y - 7)}l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/>`; }).join('') : '';
  return `<svg class="fv-plate${small ? ' fv-plate-sm' : ''}" viewBox="0 0 ${size} ${size}" aria-hidden="true" focusable="false"${label ? ` data-label="${esc(label)}"` : ''}>
    <circle class="fv-rim" cx="${c}" cy="${c}" r="${rRim}"/><circle class="fv-dish" cx="${c}" cy="${c}" r="${rRim - 4}"/>${wedges}${sparkles}</svg>`;
}
// the week as small plates: one per school day, filled by the share of the plate that day (null: nothing logged)
export function weekPlatesModel(stats) {
  const s = (stats?.meals || []).map((d) => ({ day: String(d.day).slice(0, 10), share: d.share == null ? null : Number(d.share) }));
  return s.length ? s : null;
}
export function pieSvg(share, { size = 56 } = {}) {
  const c = size / 2, r = c - 3;
  if (share == null) return `<svg class="fv-pie fv-pie-none" viewBox="0 0 ${size} ${size}" aria-hidden="true" focusable="false"><circle class="fv-rim" cx="${c}" cy="${c}" r="${r}"/></svg>`;
  const v = clamp(share, 0, 1);
  const body = v >= 0.999 ? `<circle class="fv-pie-fill" cx="${c}" cy="${c}" r="${r - 4}"/>`
    : v <= 0 ? '' : `<path class="fv-pie-fill" d="M${c} ${c}L${polar(c, c, r - 4, 0).join(' ')}A${r - 4} ${r - 4} 0 ${v > 0.5 ? 1 : 0} 1 ${polar(c, c, r - 4, 360 * v).join(' ')}Z"/>`;
  return `<svg class="fv-pie" viewBox="0 0 ${size} ${size}" aria-hidden="true" focusable="false"><circle class="fv-rim" cx="${c}" cy="${c}" r="${r}"/>${body}</svg>`;
}

// ---- rest: a moon arc against the child's own usual ------------------------------------------------------------------------------
export function moonModel(stats, todayIso) {
  const rows = (stats?.rest || []).map((d) => ({ day: String(d.day).slice(0, 10), min: d.min == null ? null : Number(d.min) }));
  if (!rows.length) return null;
  const t = rows.find((r) => r.day === todayIso);
  const earlier = rows.filter((r) => r.day !== todayIso && r.min != null).map((r) => r.min);
  const usual = earlier.length ? Math.round(earlier.reduce((a, b) => a + b, 0) / earlier.length) : null;
  const today = t ? t.min : null;
  const scale = Math.max(today || 0, usual || 0, 60) * 1.25;
  return { today, usual, scale, frac: today == null ? 0 : R2(today / scale), usualFrac: usual == null ? null : R2(usual / scale), days: rows };
}
export function moonSvg(M, { esc, lang = 'en', size = 260, todayText = '', usualText = '' } = {}) {
  const w = size, h = Math.round(size * 0.62), c = w / 2, cy = h - 14, r = c - 20;
  const a0 = -90, aT = -90 + 180 * M.frac;
  const [mx, my] = polar(c, cy, r, aT);
  const usual = M.usualFrac == null ? '' : (() => { const a = -90 + 180 * M.usualFrac; const [x1, y1] = polar(c, cy, r - 14, a), [x2, y2] = polar(c, cy, r + 14, a);
    return `<line class="fv-usual" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><text class="fv-usual-t" x="${polar(c, cy, r + 26, a)[0]}" y="${polar(c, cy, r + 26, a)[1]}" text-anchor="middle">${esc(usualText)}</text>`; })();
  return `<svg class="fv-moon" viewBox="0 0 ${w} ${h}" aria-hidden="true" focusable="false">
    <path class="fv-night" d="${arcPath(c, cy, r, a0, 90)}"/>
    ${M.today ? `<path class="fv-rest" d="${arcPath(c, cy, r, a0, Math.max(a0 + 1, aT))}" data-len="${arcLen(r, a0, aT)}"/>
    <g class="fv-moonface"><circle class="fv-moon-disc" cx="${mx}" cy="${my}" r="13"/><circle class="fv-moon-cut" cx="${R2(mx + 6)}" cy="${R2(my - 4)}" r="11"/></g>` : ''}
    ${usual}
    <text class="fv-c-big" x="${c}" y="${cy - 16}" text-anchor="middle">${esc(todayText)}</text></svg>`;
}

// ---- feelings weather: the week as friend faces drifting on a soft sky ------------------------------------------------------------
export function skyModel(stats) {
  const list = (stats?.moods || []).slice(-7).map((m, i) => ({ day: String(m.day).slice(0, 10), feeling: m.feeling, art: FEEL_ART[m.feeling] || 'lumi', lift: [0, 1, 2, 1, 0, 1, 2][i % 7] }));
  return list.length ? list : null;
}

// ---- skills: a flower per area of learning (petals = the skills in that area; each petal's length is its level) ---------------------
const PETAL = { emerging: 0.46, developing: 0.73, secure: 1 };
export function flowerModel(stats) {
  const s = stats?.skills;
  if (!s || !(s.domains || []).length) return null;
  return { report: s.report, to: s.to, areas: s.domains.map((d) => {
    const petals = [...Array(Number(d.secure || 0)).fill('secure'), ...Array(Number(d.developing || 0)).fill('developing'), ...Array(Number(d.emerging || 0)).fill('emerging')];
    return { domain: d.domain, secure: Number(d.secure || 0), developing: Number(d.developing || 0), emerging: Number(d.emerging || 0), points: d.points ?? null, max: d.max ?? null, petals };
  }) };
}
export function flowerSvg(area, { size = 120 } = {}) {
  const c = size / 2, R = c - 6, n = Math.max(area.petals.length, 1);
  const petals = area.petals.map((lv, i) => {
    const a = (360 / n) * i, len = R * PETAL[lv], half = Math.min(30, 150 / n);   // a round petal, narrower when there are many
    const [tx, ty] = polar(c, c, len, a), [lx, ly] = polar(c, c, len * 0.78, a - half), [rx, ry] = polar(c, c, len * 0.78, a + half);
    return `<path class="fv-petal fv-petal-${lv}" d="M${c} ${c}C${lx} ${ly} ${tx} ${ty} ${tx} ${ty}C${tx} ${ty} ${rx} ${ry} ${c} ${c}Z" data-len="${R2(len)}"/>`;
  }).join('');
  return `<svg class="fv-flower" viewBox="0 0 ${size} ${size}" aria-hidden="true" focusable="false"><circle class="fv-guide" cx="${c}" cy="${c}" r="${R}"/>${petals}<circle class="fv-flower-heart" cx="${c}" cy="${c}" r="9"/></svg>`;
}

// ---- attendance: the month as a heat calendar (school days Monday to Friday) ---------------------------------------------------
// days: stats.days (past school days: present / closed / not here); calendar: the center calendar ahead (closed days, early dismissals,
// the Jewish holidays the center closes or dismisses early for). Each cell: here / away / closed / early / today / ahead / none.
export function monthModel(stats, calendar, todayIso) {
  if (!stats?.days && !calendar) return null;
  const today = String(todayIso).slice(0, 10);
  const first = `${today.slice(0, 8)}01`;
  const byDay = new Map((stats?.days || []).map((d) => [String(d.day).slice(0, 10), d]));
  const cal = new Map((calendar || []).map((d) => [String(d.day).slice(0, 10), d]));
  const d0 = new Date(`${first}T12:00:00Z`);
  const month = d0.getUTCMonth();
  const weeks = []; let week = null;
  for (let d = new Date(d0); d.getUTCMonth() === month; d.setUTCDate(d.getUTCDate() + 1)) {
    const dow = d.getUTCDay(); if (dow === 0 || dow === 6) continue;
    const iso = d.toISOString().slice(0, 10);
    if (!week || dow === 1) { week = Array(5).fill(null); weeks.push(week); }
    const row = byDay.get(iso), c = cal.get(iso);
    const state = iso > today ? (c ? (c.status === 'closed' ? 'closed' : 'early') : 'ahead')
      : row ? (row.closed ? 'closed' : row.present ? 'here' : 'away') : c?.status === 'closed' ? 'closed' : iso === today ? 'today' : 'none';
    week[dow - 1] = { day: iso, n: d.getUTCDate(), state, today: iso === today, in: row?.in || null, out: row?.out || null, label: c?.label || null, label_es: c?.label_es || null };
  }
  const cells = weeks.flat().filter(Boolean);
  const past = cells.filter((x) => x.day <= today && x.state !== 'none');
  return { month: first, weeks, present: past.filter((x) => x.state === 'here').length, school: past.filter((x) => x.state === 'here' || x.state === 'away').length,
    closed: cells.filter((x) => x.state === 'closed').length };
}

// ---- home learning: a garden that grows a plant for each activity done this week ---------------------------------------------------
export function gardenModel(learning) {
  if (!learning || !learning.home_total) return null;
  const total = Number(learning.home_total), done = Math.min(Number(learning.home_done || 0), total);
  return { done, total, plants: Array.from({ length: total }, (_, i) => ({ grown: i < done, friend: FRIENDS[i % 4] })) };
}
export function gardenSvg(G, { w = 520, h = 150 } = {}) {
  const n = G.plants.length, gap = w / (n + 1);
  const plants = G.plants.map((p, i) => {
    const x = R2(gap * (i + 1)), g = h - 26;
    if (!p.grown) return `<g class="fv-plant fv-seed"><ellipse class="fv-mound" cx="${x}" cy="${g + 2}" rx="16" ry="6"/><circle class="fv-seedling" cx="${x}" cy="${g - 3}" r="3"/></g>`;
    const top = R2(g - 70 - (i % 3) * 10);
    return `<g class="fv-plant fv-grown fv-pf-${p.friend}" data-x="${x}" data-g="${g}"><ellipse class="fv-mound" cx="${x}" cy="${g + 2}" rx="16" ry="6"/>
      <path class="fv-stem" d="M${x} ${g}C${R2(x - 6)} ${R2(g - 30)} ${R2(x + 6)} ${R2(top + 30)} ${x} ${top}"/>
      <path class="fv-leaf" d="M${x} ${R2(g - 26)}c-14-2-20-12-20-12c12-2 20 4 20 12z"/><path class="fv-leaf" d="M${x} ${R2(g - 40)}c14-2 20-12 20-12c-12-2-20 4-20 12z"/>
      ${[0, 72, 144, 216, 288].map((a) => { const [px, py] = polar(x, top, 9, a); return `<circle class="fv-bloom" cx="${px}" cy="${py}" r="7"/>`; }).join('')}<circle class="fv-bloom-heart" cx="${x}" cy="${top}" r="5"/></g>`;
  }).join('');
  return `<svg class="fv-garden" viewBox="0 0 ${w} ${h}" aria-hidden="true" focusable="false"><rect class="fv-soil" x="0" y="${h - 22}" width="${w}" height="22" rx="11"/>${plants}</svg>`;
}

// ---- billing: the balance ring and the payment timeline (from family_billing) -------------------------------------------------------
export function balanceModel(billing, kid = null) {
  if (!billing) return null;
  const inv = (billing.invoices || []).filter((i) => !kid || i.kid === kid);
  const billed = inv.filter((i) => i.status !== 'void').reduce((a, i) => a + Number(i.family_cents || 0), 0);
  const paid = inv.filter((i) => i.status !== 'void').reduce((a, i) => a + Number(i.paid_cents || 0), 0);
  const balance = inv.filter((i) => i.status !== 'void').reduce((a, i) => a + Number(i.balance_cents || 0), 0);
  const events = [
    ...inv.map((i) => ({ kind: 'invoice', id: i.id, day: String(i.due_date || i.invoice_date || '').slice(0, 10), cents: Number(i.family_cents || 0), status: i.status, no: i.invoice_no })),
    ...(billing.payments || []).filter((p) => !kid || !p.kid || p.kid === kid).map((p) => ({ kind: 'payment', id: p.id, invoice: p.invoice_id || null, no: p.receipt_no || p.invoice_no || null, day: String(p.date || '').slice(0, 10), cents: Number(p.amount_cents || 0) })),
  ].filter((e) => e.day).sort((a, b) => a.day.localeCompare(b.day));
  return { billed, paid, balance, paidFrac: billed ? R2(paid / billed) : 0, events };
}
export function ringSvg(frac, { size = 150, tone = 'navy', stroke = 14 } = {}) {
  const c = size / 2, r = c - stroke / 2 - 2, C = R2(2 * Math.PI * r), v = clamp(Number(frac) || 0, 0, 1);
  return `<svg class="fv-ring fv-ring-${tone}" viewBox="0 0 ${size} ${size}" aria-hidden="true" focusable="false"><circle class="fv-ring-bg" cx="${c}" cy="${c}" r="${r}" stroke-width="${stroke}"/>
    <circle class="fv-ring-fg" cx="${c}" cy="${c}" r="${r}" stroke-width="${stroke}" stroke-dasharray="${C}" stroke-dashoffset="${R2(C * (1 - v))}" data-len="${C}" transform="rotate(-90 ${c} ${c})"/></svg>`;
}

// ---- the text equivalent: a table string (the "Show as table" toggle) -------------------------------------------------------------
export function tableHtml(esc, { head, rows }, caption = '') {
  return `<table class="fv-table">${caption ? `<caption>${esc(caption)}</caption>` : ''}<thead><tr>${head.map((h) => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${r.map((x, i) => (i === 0 ? `<th scope="row">${esc(x)}</th>` : `<td>${esc(x)}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
}

// ---- neon glow rings (owner 2026-10-12: "a definite neon glowing feel ... so they stand out") ------------------------------------
// A vivid gradient stroke in the tone's colours, a soft halo behind it (CSS drop-shadow in the same hue, family-v2.css), a highlight
// along the inside and a glowing dot on the leading tip. segments > 0 draws a segmented ring (one segment per school day, filled ones
// lit). The gradient ids are unique on the page (a counter), the final state is in the markup.
let gid = 0;
const GRAD = { booker: ['#3B8BFF', '#0B5ED7'], zuri: ['#5BD889', '#1F9D52'], lumi: ['#FF7EB6', '#D9488B'], bop: ['#B56CF0', '#8236AE'], gold: ['#FFD25E', '#E7A928'], navy: ['#3A6E86', '#0A2B38'] };
export function glowRingSvg(frac, { tone = 'booker', size = 120, stroke = 12, segments = 0, lit = 0, inner = '' } = {}) {
  const id = `fvg${++gid}`, [c0, c1] = GRAD[tone] || GRAD.navy;
  const c = size / 2, r = c - stroke / 2 - 4, v = clamp(Number(frac) || 0, 0, 1);
  const defs = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c0}"/><stop offset="1" stop-color="${c1}"/></linearGradient></defs>`;
  let body = '';
  if (segments > 0) {
    const gap = Math.min(8, 120 / segments), step = 360 / segments;
    for (let i = 0; i < segments; i++) {
      const a0 = i * step + gap / 2, a1 = (i + 1) * step - gap / 2;
      body += `<path class="${i < lit ? 'fv-gl-on' : 'fv-gl-off'}" d="${arcPath(c, c, r, a0, a1)}" ${i < lit ? `stroke="url(#${id})" ` : ''}stroke-width="${stroke}" data-len="${arcLen(r, a0, a1)}"/>`;
    }
  } else {
    const C = R2(2 * Math.PI * r);
    body = `<circle class="fv-gl-off" cx="${c}" cy="${c}" r="${r}" stroke-width="${stroke}"/>`;
    if (v > 0) {
      const end = 360 * v - 0.01;
      body += `<path class="fv-gl-on" d="${v >= 0.999 ? `M${c} ${R2(c - r)}A${r} ${r} 0 1 1 ${R2(c - 0.01)} ${R2(c - r)}` : arcPath(c, c, r, 0, end)}" stroke="url(#${id})" stroke-width="${stroke}" data-len="${R2(C * v)}"/>
        <path class="fv-gl-hi" d="${v >= 0.999 ? `M${c} ${R2(c - r)}A${r} ${r} 0 1 1 ${R2(c - 0.01)} ${R2(c - r)}` : arcPath(c, c, r, 0, end)}" stroke-width="${R2(stroke / 4)}" data-len="${R2(C * v)}"/>`;
      const [tx, ty] = polar(c, c, r, end);
      body += `<circle class="fv-gl-tip" cx="${tx}" cy="${ty}" r="${R2(stroke / 2 + 1)}" fill="${c1}" data-a="${R2(end)}" data-c="${c}"/>`;
    }
  }
  return `<svg class="fv-glring fv-gl-${tone}" viewBox="0 0 ${size} ${size}" aria-hidden="true" focusable="false">${defs}${body}${inner}</svg>`;
}
// a glowing bar (Today vs Usual): share of the width, in the tone's gradient
export function glowBarHtml(frac, tone = 'lumi') {
  const v = Math.round(clamp(Number(frac) || 0, 0, 1) * 100);
  return `<span class="fv-glbar fv-gb-${tone}" aria-hidden="true"><span class="fv-glbar-fill" data-w="${v}"></span></span>`;
}
