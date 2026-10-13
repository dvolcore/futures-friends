// Licensing page helpers with no DOM and no database (hub/STATE_RULES.md, INSPECTOR_EXPORTS.md, CACFP.md, SUBSIDY_EXPORTS.md).
// Used by web/licensing.js (the page), web/licensing-server.mjs (the CACFP production record) and tests/state-rules-unit.test.mjs.

export const TABS = ['rules', 'training', 'inspector', 'cacfp', 'subsidy'];
export const SECTIONS = ['attendance', 'absences', 'ratios', 'staff', 'training', 'drills', 'incidents', 'medication', 'meals'];
export const MEAL_TYPES = ['breakfast', 'am_snack', 'lunch', 'pm_snack', 'supper'];
export const CATEGORIES = ['free', 'reduced', 'paid'];
export const PROGRAMS = ['KS_CCA', 'MO_CCS', 'other'];
// care_entries meal -> the menu-180 meal it was served from (both snacks come from the day's one snack)
export const MENU_MEAL = { breakfast: 'breakfast', am_snack: 'snack', lunch: 'lunch', pm_snack: 'snack' };
export const STATUS_TONE = { ok: 'ok', met: 'ok', on_track: 'ok', attention: 'warn', at_risk: 'warn', unknown: 'warn', missing: 'bad', short: 'bad',
  outside_hub: '', reference: '', manual: '' };

const pad = (n) => String(n).padStart(2, '0');
export const isoDay = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
export function addDays(iso, n) { return isoDay(new Date(Date.parse(`${iso}T12:00:00Z`) + n * 86400000)); }
export const monthStart = (iso) => `${String(iso).slice(0, 7)}-01`;
export function dayCount(from, to) { return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86400000) + 1; }
// "Choose a date range of up to 93 days" (the database refuses longer ones too)
export function rangeOk(from, to, max = 93) {
  return /^\d{4}-\d{2}-\d{2}$/.test(from || '') && /^\d{4}-\d{2}-\d{2}$/.test(to || '') && to >= from && dayCount(from, to) <= max;
}
// exact cents -> "4.50"; null stays null (no rate entered = no amount)
export function dollars(cents) {
  if (cents == null) return null;
  if (!Number.isInteger(Number(cents))) throw new Error('cents must be an integer');
  const c = Number(cents); const s = c < 0 ? '-' : ''; const a = Math.abs(c);
  return `${s}${Math.floor(a / 100)}.${pad(a % 100)}`;
}
// a typed "4.50" -> 450 (null when it is not a plain amount)
export function centsOf(text) {
  const m = String(text ?? '').trim().match(/^(\d{1,3})(?:\.(\d{1,2}))?$/);
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] || '0').padEnd(2, '0'));
}
export const fileName = (center, what, from, to) => `${String(center || 'center').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${what}-${from}${to && to !== from ? `-to-${to}` : ''}.csv`;
export const hoursText = (n) => (n == null ? '' : String(Math.round(Number(n) * 100) / 100));

// Rules grouped by category, in the order a director reads them.
export const CATEGORY_ORDER = ['ratio', 'group_size', 'staff_qualification', 'training_hours', 'background_check', 'required_record', 'record_retention', 'meal_pattern'];
export function groupRules(rules) {
  const out = new Map(CATEGORY_ORDER.map((c) => [c, []]));
  for (const r of rules || []) (out.get(r.category) || out.set(r.category, []).get(r.category)).push(r);
  return [...out].filter(([, list]) => list.length);
}

// The production record for one day from the counts (cacfp_production_counts) and the menu-180 days: per meal, the menu day served,
// children by CACFP age group, every item's total servings and each component's planned total (the menu's per-child amounts x children).
// Children 6 and older and children with no birthday on file have no menu-180 amount: they are listed, never guessed.
export function productionRecord(counts, menuDays, units = { milk: 'cups', veg: 'cups', fruit: 'cups', grain: 'oz eq', mma: 'oz eq' }) {
  const byId = new Map((menuDays || []).map((d) => [d.id, d]));
  const out = [];
  for (const mt of MEAL_TYPES) {
    const c = counts?.meals?.[mt];
    if (!c) continue;
    const ids = (c.menu_ids || []).filter((id) => byId.has(id));
    const id = ids[0] || null;
    const meal = id ? byId.get(id).meals?.[MENU_MEAL[mt]] : null;
    const a12 = Number(c.a12 || 0), a35 = Number(c.a35 || 0);
    const row = { meal_type: mt, menu_id: id, other_menu_ids: ids.slice(1), title: meal?.title || null,
      children: { a12, a35, a6: Number(c.a6 || 0), no_birthday: Number(c.no_birthday || 0) }, items: [], components: [] };
    if (meal) {
      row.items = (meal.items || []).filter((it) => it.comp !== 'extra').map((it) => ({ what: it.what, comp: it.comp,
        servings: Math.round(((Number(it.n12 || 0) * a12) + (Number(it.n35 || 0) * a35)) * 100) / 100 }));
      const tot = meal.cacfp_totals || {};
      const comps = [...new Set([...Object.keys(tot.a12 || {}), ...Object.keys(tot.a35 || {})])].filter((k) => k !== 'extra');
      row.components = comps.map((k) => ({ comp: k, unit: units[k] || '', planned: Math.round(((Number(tot.a12?.[k] || 0) * a12) + (Number(tot.a35?.[k] || 0) * a35)) * 1000) / 1000 }));
    }
    out.push(row);
  }
  return out;
}
