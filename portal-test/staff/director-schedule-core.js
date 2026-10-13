// The staff schedule builder: the pure part (hub/DIRECTOR_OPS.md). No DOM, no network: tests/director-ops-unit.test.mjs imports it.
//   - words EN + ES (Spanish is a DRAFT until a bilingual reviewer approves it)
//   - coverage: children expected per room per hour (enrolled, typical arrival / pickup, absences families reported) against the staff
//     scheduled in the room and the cited ratio row -> ok (green) / tight (amber) / short (red) / none / nc (no rule on file)
//   - credential and labour checks for a shift (warnings; the director decides)
//   - "Fix": who is free to cover a short hour
//   - reconciliation: scheduled vs worked (time clock punches)
//   - the Overview figures: staff scheduled now, the scheduled line of the staffing chart

export const DAYS = 7;
export const SLOT = 60;   // coverage is shown per hour

// ---- words ---------------------------------------------------------------------------------------------------------------------
export const SCW = {
  en: {
    title: 'Staff schedule', week: (d) => `Week of ${d}`, prev: 'Previous week', next: 'Next week', thisWeek: 'This week',
    draft: 'Draft', published: (v) => `Published (version ${v})`, changed: 'Changed since publishing', publish: 'Publish the week', republish: 'Publish the changes',
    published_ok: (n) => (n ? `Published. ${n} ${n === 1 ? 'person was' : 'people were'} notified.` : 'Published. Nobody\'s shifts changed.'),
    copyLast: 'Copy last week', copied: (n) => `${n} ${n === 1 ? 'shift' : 'shifts'} copied from last week.`,
    addShift: 'Add shift', editShift: 'Edit shift', newShift: 'New shift', save: 'Save shift', del: 'Delete shift', cancel: 'Cancel', saved: 'Shift saved.', deleted: 'Shift deleted.',
    who: 'Staff member', day: 'Day', room: 'Room', noRoom: 'No room (office / floater)', noRoomShort: 'No room', start: 'Start', end: 'End', brk: 'Unpaid break', brkNone: 'No break', mins: (m) => `${m} min`, note: 'Note (optional)',
    staff: 'Staff', total: 'Hours', closed: 'Closed', sectBuild: 'Build', sectCover: 'Ratio coverage', sectSwaps: 'Swaps', sectWorked: 'Scheduled vs worked',
    dragHint: 'Drag in a day to add a shift; drag a shift\'s edges to change its times. Tap a shift to edit it.', tapHint: 'Tap a shift to edit it, or add one.',
    coverage: 'Ratio coverage by room and hour', coverSub: 'Children expected (enrolled, their usual times, absences families reported) against the staff scheduled in the room, under the cited ratio.',
    ok: 'Covered', tight: 'Tight', short: 'Short', none: 'No children expected', nc: 'No ratio rule on file',
    slot: (room, day, t) => `${room}, ${day} ${t}`, expected: (n) => `${n} ${n === 1 ? 'child' : 'children'} expected`, needed: (n) => `${n} needed`, scheduled: (n) => `${n} scheduled`,
    groupOver: (n) => `Group size over ${n}`, fix: 'Fix', fixTitle: 'Who can cover', fixNone: 'Nobody is free at that time. Add a shift for someone, or ask a substitute.',
    fixFree: (name, t) => `${name} is free ${t}`, fixMove: (name, room) => `${name} could move from ${room} (it stays in ratio)`, fixAdd: (name) => `Add ${name}`,
    swaps: 'Swap requests', swapsNone: 'No swap requests.', approve: 'Approve', decline: 'Decline', takes: 'Who takes it', anyone: 'Anyone', swapFrom: (n) => `${n} asks to give this shift away`,
    swapTo: (n) => `to ${n}`, swapApproved: 'Swap approved: both people were notified.', swapDeclined: 'Swap declined.', pending: 'Waiting', approvedW: 'Approved', declinedW: 'Declined', cancelledW: 'Cancelled',
    worked: 'Scheduled vs worked', workedSub: 'The published schedule against the time clock (punches that were not voided).', sched: 'Scheduled', clocked: 'Worked', variance: 'Difference',
    late: (m) => `${m} min late`, early: (m) => `left ${m} min early`, noShow: 'No punch', unscheduled: 'Worked without a shift', open: 'Still clocked in', workedNone: 'Nothing published for this week yet.',
    issues: 'Checks', noIssues: 'No problems found.', law: 'law', policy: 'center policy', rule: 'state rule',
    i: {
      hold: 'Classroom access on hold: cannot be scheduled.', bgPending: 'Background check not cleared yet: may not be alone with children or counted alone in ratio.',
      bgExpired: 'Background check expired on this day.', cprExpired: 'Pediatric first aid / CPR expired on this day.', cprSoon: (d) => `First aid / CPR expires in ${d} days.`,
      cprNone: 'No pediatric first aid / CPR on file.', training: (n) => `${n} required ${n === 1 ? 'training is' : 'trainings are'} overdue.`,
      breakMissing: (h, m) => `Over ${h} h without a ${m}-minute break.`, long: (h) => `Longer than ${h} hours.`, overtime: (h) => `${h} h this week: overtime over 40 h (FLSA).`,
      rest: (h) => `Less than ${h} hours between shifts.`, overlap: 'Overlaps another shift of this person.', closedDay: 'The center is closed that day.',
      noRoom: 'No room: not counted in any room\'s ratio.', outside: 'Outside opening hours.',
    },
    cprCover: 'First aid / CPR on site', cprShort: (t) => `No certified caregiver scheduled ${t}`, cprRoster: (have, need) => `${have} of ${need} certified caregivers on staff (1 per 20 licensed seats)`,
    myShifts: 'My shifts', myNone: 'No published shifts for these two weeks yet.', thisWk: 'This week', nextWk: 'Next week', askSwap: 'Ask to swap', swapAsk: 'Give this shift to', swapNote: 'Note for the director (optional)',
    send: 'Send request', sent: 'Request sent to the director.', cancelReq: 'Cancel request', swapPending: (n) => (n ? `Swap to ${n} waiting` : 'Swap waiting for the director'),
    swapOk: 'Swap approved', swapNo: 'Swap declined', table: 'Show as table', picture: 'Show as picture', hours: (h) => `${h} h`, settingsNote: (o, c) => `Opening hours ${o}–${c} (center setting).`,
    demoNote: 'Demo schedule: fake staff and children.', loadErr: 'Could not load the schedule.', nc2: 'Not connected yet',
  },
  es: {
    title: 'Horario del personal', week: (d) => `Semana del ${d}`, prev: 'Semana anterior', next: 'Semana siguiente', thisWeek: 'Esta semana',
    draft: 'Borrador', published: (v) => `Publicado (versión ${v})`, changed: 'Cambiado desde la publicación', publish: 'Publicar la semana', republish: 'Publicar los cambios',
    published_ok: (n) => (n ? `Publicado. Se avisó a ${n} ${n === 1 ? 'persona' : 'personas'}.` : 'Publicado. No cambió el turno de nadie.'),
    copyLast: 'Copiar la semana pasada', copied: (n) => `${n} ${n === 1 ? 'turno copiado' : 'turnos copiados'} de la semana pasada.`,
    addShift: 'Agregar turno', editShift: 'Editar turno', newShift: 'Turno nuevo', save: 'Guardar turno', del: 'Borrar turno', cancel: 'Cancelar', saved: 'Turno guardado.', deleted: 'Turno borrado.',
    who: 'Persona', day: 'Día', room: 'Salón', noRoom: 'Sin salón (oficina / apoyo)', noRoomShort: 'Sin salón', start: 'Entrada', end: 'Salida', brk: 'Descanso sin pago', brkNone: 'Sin descanso', mins: (m) => `${m} min`, note: 'Nota (opcional)',
    staff: 'Personal', total: 'Horas', closed: 'Cerrado', sectBuild: 'Armar', sectCover: 'Cobertura de proporción', sectSwaps: 'Cambios', sectWorked: 'Programado vs trabajado',
    dragHint: 'Arrastre en un día para agregar un turno; arrastre los bordes para cambiar las horas. Toque un turno para editarlo.', tapHint: 'Toque un turno para editarlo, o agregue uno.',
    coverage: 'Cobertura de proporción por salón y hora', coverSub: 'Niños esperados (inscritos, su horario habitual, ausencias avisadas) frente al personal programado en el salón, según la proporción citada.',
    ok: 'Cubierto', tight: 'Justo', short: 'Falta personal', none: 'No se esperan niños', nc: 'Sin regla de proporción',
    slot: (room, day, t) => `${room}, ${day} ${t}`, expected: (n) => `${n} ${n === 1 ? 'niño esperado' : 'niños esperados'}`, needed: (n) => `${n} necesarias`, scheduled: (n) => `${n} programadas`,
    groupOver: (n) => `Grupo de más de ${n}`, fix: 'Arreglar', fixTitle: 'Quién puede cubrir', fixNone: 'Nadie está libre a esa hora. Agregue un turno o pida una suplente.',
    fixFree: (name, t) => `${name} está libre ${t}`, fixMove: (name, room) => `${name} podría pasar de ${room} (sigue en proporción)`, fixAdd: (name) => `Agregar a ${name}`,
    swaps: 'Pedidos de cambio', swapsNone: 'No hay pedidos de cambio.', approve: 'Aprobar', decline: 'No aprobar', takes: 'Quién lo toma', anyone: 'Cualquiera', swapFrom: (n) => `${n} pide ceder este turno`,
    swapTo: (n) => `a ${n}`, swapApproved: 'Cambio aprobado: se avisó a las dos personas.', swapDeclined: 'Cambio no aprobado.', pending: 'En espera', approvedW: 'Aprobado', declinedW: 'No aprobado', cancelledW: 'Cancelado',
    worked: 'Programado vs trabajado', workedSub: 'El horario publicado frente al reloj (marcas no anuladas).', sched: 'Programado', clocked: 'Trabajado', variance: 'Diferencia',
    late: (m) => `${m} min tarde`, early: (m) => `salió ${m} min antes`, noShow: 'Sin marca', unscheduled: 'Trabajó sin turno', open: 'Todavía en turno', workedNone: 'Todavía no hay nada publicado esta semana.',
    issues: 'Revisiones', noIssues: 'Sin problemas.', law: 'ley', policy: 'política del centro', rule: 'regla estatal',
    i: {
      hold: 'Acceso al salón en pausa: no se puede programar.', bgPending: 'Antecedentes sin aprobar: no puede quedarse sola con niños ni contar sola en la proporción.',
      bgExpired: 'Los antecedentes vencieron ese día.', cprExpired: 'Primeros auxilios / RCP pediátrica vencidos ese día.', cprSoon: (d) => `Primeros auxilios / RCP vencen en ${d} días.`,
      cprNone: 'Sin primeros auxilios / RCP pediátrica registrados.', training: (n) => `${n} ${n === 1 ? 'capacitación obligatoria vencida' : 'capacitaciones obligatorias vencidas'}.`,
      breakMissing: (h, m) => `Más de ${h} h sin un descanso de ${m} minutos.`, long: (h) => `Más de ${h} horas.`, overtime: (h) => `${h} h esta semana: horas extra después de 40 h (FLSA).`,
      rest: (h) => `Menos de ${h} horas entre turnos.`, overlap: 'Se cruza con otro turno de esta persona.', closedDay: 'El centro está cerrado ese día.',
      noRoom: 'Sin salón: no cuenta en la proporción de ningún salón.', outside: 'Fuera del horario del centro.',
    },
    cprCover: 'Primeros auxilios / RCP en el centro', cprShort: (t) => `Ninguna persona certificada programada ${t}`, cprRoster: (have, need) => `${have} de ${need} personas certificadas (1 por cada 20 lugares)`,
    myShifts: 'Mis turnos', myNone: 'Todavía no hay turnos publicados para estas dos semanas.', thisWk: 'Esta semana', nextWk: 'La semana que viene', askSwap: 'Pedir un cambio', swapAsk: 'Ceder este turno a', swapNote: 'Nota para la dirección (opcional)',
    send: 'Enviar pedido', sent: 'Pedido enviado a la dirección.', cancelReq: 'Cancelar pedido', swapPending: (n) => (n ? `Cambio a ${n} en espera` : 'Cambio esperando a la dirección'),
    swapOk: 'Cambio aprobado', swapNo: 'Cambio no aprobado', table: 'Ver como tabla', picture: 'Ver como gráfica', hours: (h) => `${h} h`, settingsNote: (o, c) => `Horario ${o}–${c} (ajuste del centro).`,
    demoNote: 'Horario de prueba: personal y niños ficticios.', loadErr: 'No se pudo cargar el horario.', nc2: 'Todavía no conectado',
  },
};
export const scw = (lang) => SCW[lang === 'es' ? 'es' : 'en'];

// ---- dates and times -------------------------------------------------------------------------------------------------------------
export function addDays(iso, n) { const d = new Date(`${String(iso).slice(0, 10)}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
export function weekOf(iso) { const d = new Date(`${String(iso).slice(0, 10)}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); }
export const weekDays = (weekStart) => Array.from({ length: DAYS }, (_, i) => addDays(weekStart, i));
export function hm(min, lang = 'en') {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return new Intl.DateTimeFormat(lang === 'es' ? 'es-US' : 'en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(new Date(Date.UTC(2000, 0, 1, Math.floor(m / 60), m % 60)));
}
// compact for the grid's blocks: 8:00a, 12:30p (the block's aria-label carries the full time)
export function hmShort(min) { const m = ((Math.round(min) % 1440) + 1440) % 1440, h = Math.floor(m / 60); return `${((h + 11) % 12) + 1}${m % 60 ? `:${String(m % 60).padStart(2, '0')}` : ''}${h < 12 ? 'a' : 'p'}`; }
export const span = (a, b, lang) => `${hm(a, lang)}–${hm(b, lang)}`;
export const toInput = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
export function fromInput(v) { const m = /^(\d{1,2}):(\d{2})$/.exec(String(v || '')); return m ? Number(m[1]) * 60 + Number(m[2]) : null; }
export const snap = (min, step = 15) => Math.round(min / step) * step;
export const paidMin = (s) => Math.max(0, (s.end_min - s.start_min) - (s.break_min || 0));
export const hoursLabel = (min) => { const h = Math.round((min / 60) * 10) / 10; return Number.isInteger(h) ? String(h) : h.toFixed(1); };
// minutes after the center's midnight of a moment, and the center's day of it (tz = IANA zone)
export function zoned(iso, tz) {
  const t = Date.parse(iso); if (!Number.isFinite(t)) return null;
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz || 'America/Chicago', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    .formatToParts(new Date(t)).map((x) => [x.type, x.value]));
  return { day: `${p.year}-${p.month}-${p.day}`, min: Number(p.hour) * 60 + Number(p.minute) };
}

// ---- coverage --------------------------------------------------------------------------------------------------------------------
// One child's span on a day: their typical times, changed by what the family reported (absent / late arrival / early pickup).
export function childSpan(kid, day) {
  if (kid.left_on && kid.left_on < day) return null;
  const r = kid.days?.[day];
  if (r?.absent) return null;
  return { in: r?.in != null ? Number(r.in) : Number(kid.in), out: r?.out != null ? Number(r.out) : Number(kid.out) };
}
// children of a room expected at minute t of day (a child counts while t is inside [in, out))
export function expectedAt(room, day, t) {
  let n = 0;
  for (const k of room.kids || []) { const s = childSpan(k, day); if (s && s.in <= t && s.out > t) n++; }
  return n;
}
// staff needed for n children under a rule row ({children_per_staff, staff}); null = no rule
export function requiredStaff(n, rule) {
  if (!rule || !rule.children_per_staff) return null;
  if (!n) return 0;
  return Math.ceil(n / rule.children_per_staff) * (rule.staff || 1);
}
// people scheduled in a room (or anywhere when room === undefined) at minute t of day
export function onAt(shifts, day, t, room) {
  return shifts.filter((s) => s.day === day && s.start_min <= t && s.end_min > t && (room === undefined || s.room === room));
}
// the status of one room-hour: the worst moment of the hour (checked every 15 minutes)
const TONE_RANK = { none: 0, ok: 1, tight: 2, short: 3 };
export function tickStatus(room, day, t, shifts) {
  const n = expectedAt(room, day, t), need = requiredStaff(n, room.rule), have = onAt(shifts, day, t, room.id).length;
  if (need == null) return { tone: 'nc', expected: n, required: null, scheduled: have };
  if (!n) return { tone: 'none', expected: 0, required: 0, scheduled: have };
  const per = room.rule.children_per_staff / (room.rule.staff || 1);
  const over = !!(room.rule.max_group && n > room.rule.max_group);
  // tight: exactly the minimum staff, with at most one free place before another person is needed
  const tone = have < need || over ? 'short' : have === need && have * per - n <= 1 ? 'tight' : 'ok';
  return { tone, expected: n, required: need, scheduled: have, groupOver: over ? room.rule.max_group : null };
}
// the status of one room-hour: its worst 15-minute moment
export function slotStatus(room, day, t0, shifts, len = SLOT) {
  let worst = null;
  for (let t = t0; t < t0 + len; t += 15) {
    const s = tickStatus(room, day, t, shifts);
    if (s.tone === 'nc') return s;
    if (!worst || TONE_RANK[s.tone] > TONE_RANK[worst.tone] || (s.tone === worst.tone && s.expected > worst.expected)) worst = s;
  }
  return worst;
}
export function coverageGrid(week, shifts, days = weekDays(week.week_start)) {
  const open = week.settings?.open_min ?? 420, close = week.settings?.close_min ?? 1080;
  const closed = new Set(week.closed || []);
  const hours = []; for (let t = Math.floor(open / 60) * 60; t < close; t += SLOT) hours.push(t);
  return (week.rooms || []).map((room) => ({
    room, days: days.map((day) => ({ day, closed: closed.has(day), slots: closed.has(day) ? [] : hours.map((t) => ({ t, ...slotStatus(room, day, t, shifts) })) })),
  }));
}
export function coverageSummary(grid) {
  const c = { ok: 0, tight: 0, short: 0, none: 0, nc: 0 };
  for (const r of grid) for (const d of r.days) for (const s of d.slots) c[s.tone]++;
  return c;
}

// ---- credentials and labour checks ----------------------------------------------------------------------------------------------
const daysBetween = (a, b) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 864e5);
// issues for one shift: [{key, sev: 'error'|'warn'|'info', kind: 'law'|'policy'|'rule', text}]
export function shiftIssues(shift, person, ctx, lang = 'en') {
  const I = scw(lang).i, out = [];
  const st = ctx.settings || {}, all = ctx.shifts || [];
  const add = (key, sev, kind, text) => out.push({ key, sev, kind, text });
  if (person?.clearance?.on_hold) add('hold', 'error', 'rule', I.hold);
  else if (person?.clearance && person.clearance.state !== 'cleared') add('bg', 'warn', 'rule', I.bgPending);
  else if (person?.clearance?.cleared_until && person.clearance.cleared_until < shift.day) add('bgExp', 'warn', 'rule', I.bgExpired);
  const cpr = person?.cpr_until || person?.first_aid_until;
  if (shift.room) {
    if (!cpr) add('cprNone', 'info', 'rule', I.cprNone);
    else if (cpr < shift.day) add('cprExp', 'warn', 'rule', I.cprExpired);
    else if (daysBetween(shift.day, cpr) <= 14) add('cprSoon', 'info', 'rule', I.cprSoon(daysBetween(shift.day, cpr)));
  }
  if (person?.training_overdue) add('training', 'warn', 'rule', I.training(person.training_overdue));
  if ((ctx.closed || []).includes(shift.day)) add('closed', 'warn', 'policy', I.closedDay);
  if (st.open_min != null && (shift.end_min <= st.open_min || shift.start_min >= st.close_min)) add('outside', 'info', 'policy', I.outside);
  const len = shift.end_min - shift.start_min;
  if (st.break_after_min && len > st.break_after_min && (shift.break_min || 0) < (st.break_min || 30)) add('break', 'warn', 'policy', I.breakMissing(st.break_after_min / 60, st.break_min || 30));
  if (st.max_shift_min && len > st.max_shift_min) add('long', 'warn', 'policy', I.long(st.max_shift_min / 60));
  const mine = all.filter((s) => s.user_id === shift.user_id && s.id !== shift.id);
  if (mine.some((s) => s.day === shift.day && s.start_min < shift.end_min && s.end_min > shift.start_min)) add('overlap', 'error', 'policy', I.overlap);
  const week = mine.concat([shift]).reduce((t, s) => t + paidMin(s), 0);
  if (!person?.exempt && st.week_ot_min && week > st.week_ot_min) add('ot', 'warn', 'law', I.overtime(hoursLabel(week)));
  if (st.min_rest_min) {
    const prev = mine.filter((s) => s.day === addDays(shift.day, -1)).sort((a, b) => b.end_min - a.end_min)[0];
    const next = mine.filter((s) => s.day === addDays(shift.day, 1)).sort((a, b) => a.start_min - b.start_min)[0];
    if ((prev && 1440 - prev.end_min + shift.start_min < st.min_rest_min) || (next && 1440 - shift.end_min + next.start_min < st.min_rest_min)) add('rest', 'warn', 'policy', I.rest(st.min_rest_min / 60));
  }
  if (!shift.room) add('noRoom', 'info', 'policy', I.noRoom);
  return out;
}
export const worstIssue = (list) => (list.some((x) => x.sev === 'error') ? 'error' : list.some((x) => x.sev === 'warn') ? 'warn' : list.length ? 'info' : null);
export function weekHours(shifts, userId) { return shifts.filter((s) => s.user_id === userId).reduce((t, s) => t + paidMin(s), 0); }

// first aid / CPR coverage: hours of a day with children expected and nobody certified scheduled; MO also counts the certified roster
export function cprCoverage(week, shifts, day) {
  const rule = week.cpr_rule; if (!rule) return null;
  const certified = new Set((week.staff || []).filter((p) => { const d = p.cpr_until || p.first_aid_until; return d && d >= day; }).map((p) => p.user_id));
  const open = week.settings?.open_min ?? 420, close = week.settings?.close_min ?? 1080;
  const gaps = [];
  for (let t = Math.floor(open / 60) * 60; t < close; t += SLOT) {
    if (rule.model === 'per_room') {
      for (const room of week.rooms || []) if (expectedAt(room, day, t) && !onAt(shifts, day, t, room.id).some((s) => certified.has(s.user_id))) gaps.push({ t, room: room.id });
    } else {
      const kids = (week.rooms || []).reduce((n, r) => n + expectedAt(r, day, t), 0);
      if (kids && !onAt(shifts, day, t).some((s) => certified.has(s.user_id))) gaps.push({ t, room: null });
    }
  }
  const need = rule.model === 'per_capacity' && rule.capacity ? Math.max(1, Math.ceil(rule.capacity / (rule.per || 20))) : null;
  return { gaps, certified: certified.size, need, citation: rule.citation };
}

// ---- Fix: who can cover a short room-hour --------------------------------------------------------------------------------------
// free: on no shift at that time (or on a no-room shift), not on hold; movers: in another room that keeps its ratio without them.
export function fixSuggestions(week, shifts, roomId, day, t, len = SLOT) {
  const busy = (uid) => shifts.some((s) => s.user_id === uid && s.day === day && s.start_min < t + len && s.end_min > t && s.room);
  const out = [];
  for (const p of week.staff || []) {
    if (p.clearance?.on_hold) continue;
    if (!busy(p.user_id)) {
      const floater = shifts.some((s) => s.user_id === p.user_id && s.day === day && s.start_min <= t && s.end_min >= t + len && !s.room);
      const hrs = weekHours(shifts, p.user_id);
      out.push({ kind: floater ? 'floater' : 'free', user_id: p.user_id, name: p.name, hours: hrs, cleared: !p.clearance || p.clearance.state === 'cleared',
        overtime: !p.exempt && hrs + len > (week.settings?.week_ot_min ?? 2400) });
    }
  }
  for (const room of week.rooms || []) {
    if (room.id === roomId) continue;
    const here = onAt(shifts, day, t, room.id);
    const st = slotStatus(room, day, t, shifts, len);
    if (st.tone !== 'ok' || here.length - 1 < (st.required || 0)) continue;
    for (const s of here) { const p = (week.staff || []).find((x) => x.user_id === s.user_id); if (p && !p.clearance?.on_hold) out.push({ kind: 'move', user_id: p.user_id, name: p.name, from: room.id, fromName: room.name, shift: s.id, cleared: !p.clearance || p.clearance.state === 'cleared' }); }
  }
  const rank = { floater: 0, free: 1, move: 2 };
  return out.sort((a, b) => (b.cleared - a.cleared) || (rank[a.kind] - rank[b.kind]) || ((a.overtime ? 1 : 0) - (b.overtime ? 1 : 0)) || ((a.hours ?? 0) - (b.hours ?? 0)) || a.name.localeCompare(b.name));
}

// ---- reconciliation: scheduled vs worked --------------------------------------------------------------------------------------
// per person per day: scheduled paid minutes, worked minutes (punches), difference, late / early / no punch / worked without a shift
export function reconcile(published, punches, tz, today, nowMin = null) {
  const key = (u, d) => `${u}|${d}`;
  const rows = new Map();
  const row = (u, d) => rows.get(key(u, d)) || rows.set(key(u, d), { user_id: u, day: d, scheduled: 0, worked: 0, first_in: null, last_out: null, start: null, end: null, open: false }).get(key(u, d));
  for (const s of published || []) { const r = row(s.user_id, s.day); r.scheduled += paidMin(s); r.start = r.start == null ? s.start_min : Math.min(r.start, s.start_min); r.end = r.end == null ? s.end_min : Math.max(r.end, s.end_min); }
  for (const p of punches || []) {
    const a = zoned(p.in_at, tz); if (!a) continue;
    const b = p.out_at ? zoned(p.out_at, tz) : null;
    const r = row(p.user_id, a.day);
    const end = b ? (b.day === a.day ? b.min : 1440) : (a.day === today && nowMin != null ? Math.max(a.min, nowMin) : a.min);
    r.worked += Math.max(0, end - a.min);
    r.first_in = r.first_in == null ? a.min : Math.min(r.first_in, a.min);
    r.last_out = b ? Math.max(r.last_out ?? 0, end) : r.last_out;
    if (!b) r.open = true;
  }
  return [...rows.values()].map((r) => {
    const flags = [];
    if (r.scheduled && r.first_in == null && r.day < today) flags.push('noShow');
    if (!r.scheduled && r.worked) flags.push('unscheduled');
    if (r.scheduled && r.first_in != null && r.first_in - r.start > 7) flags.push('late');
    if (r.scheduled && r.last_out != null && !r.open && r.end - r.last_out > 7) flags.push('early');
    if (r.open) flags.push('open');
    return { ...r, variance: r.worked - r.scheduled, late: r.first_in != null && r.start != null ? r.first_in - r.start : null, earlyBy: r.last_out != null && r.end != null ? r.end - r.last_out : null, flags,
      future: r.day > today };
  }).sort((a, b) => a.day.localeCompare(b.day) || String(a.user_id).localeCompare(String(b.user_id)));
}

// ---- the Overview: the real schedule behind "Staff on the clock" and "Staffing vs need" ----------------------------------------
export function scheduledNow(published, day, nowMin) { return onAt(published || [], day, nowMin).length; }
// add {sched} to each slot of staff-v2's staffingModel (slots every 30 min with t)
export function withScheduled(staffing, published, day) {
  if (!staffing || !published) return staffing;
  const slots = staffing.slots.map((s) => ({ ...s, sched: onAt(published, day, s.t).length }));
  return { ...staffing, slots, max: Math.max(staffing.max, ...slots.map((s) => s.sched)), hasSched: published.some((s) => s.day === day) };
}

// ---- the week grid geometry (desktop drag) -------------------------------------------------------------------------------------
// x (0..width) inside a day cell -> minutes, snapped
export function xToMin(x, width, open, close, step = 15) { const f = Math.max(0, Math.min(1, x / Math.max(1, width))); return Math.max(open, Math.min(close, snap(open + f * (close - open), step))); }
export function minToPct(min, open, close) { return Math.max(0, Math.min(100, ((min - open) / Math.max(1, close - open)) * 100)); }
