// i18n-pairs: rows keep the English name right before its Spanish (hub/scripts/i18n-audit.mjs reads them as a pair).
// The center calendar's built-in holidays (pure functions, no DOM, no dependency: the browser page, the server, the SQL seed generator
// and the unit tests all import this file). Design: hub/TEACHER_PLANNING.md "Center calendar".
//
//   Jewish holidays  computed from the Hebrew calendar with Intl.DateTimeFormat (calendar 'hebrew', built into Node and every browser):
//                    the Hebrew date of each Gregorian day is read once, then each holiday is looked up by Hebrew month + day, with the
//                    published postponement rules (a fast never on Shabbat, the Israeli memorial days moved off Friday / Shabbat).
//                    Diaspora practice: two days of yom tov (Rosh Hashanah, Sukkot, Pesach, Shavuot) and Simchat Torah on Tishrei 23.
//                    A Jewish day begins at sundown the evening before (`sundown`: true); the four minor fasts begin at dawn.
//   US federal       the federal holidays, on the OBSERVED weekday when the date falls on a weekend (Saturday -> Friday, Sunday -> Monday),
//                    plus the day after Thanksgiving and Christmas Eve (common child-care closures).
//
// Each holiday has a key (one key per holiday; a multi-day holiday such as Chanukah has one key and several days) and a default
// choice: 'closed' or 'open'. A director changes the choice per key on the calendar page; the database keeps the dates of 2024-2040
// (calendar_holiday_dates, seeded from this file by scripts/holiday-dates.mjs and checked against it by the tests).

export const JEWISH = [
  // key, English, Spanish (draft), default, sundown (begins the evening before)
  ['rosh_hashanah_1', 'Rosh Hashanah (day 1)', 'Rosh Hashaná (día 1)', 'closed', true],
  ['rosh_hashanah_2', 'Rosh Hashanah (day 2)', 'Rosh Hashaná (día 2)', 'closed', true],
  ['tzom_gedaliah', 'Fast of Gedaliah', 'Ayuno de Guedalía', 'open', false],
  ['yom_kippur', 'Yom Kippur', 'Yom Kipur', 'closed', true],
  ['sukkot_1', 'Sukkot (day 1)', 'Sucot (día 1)', 'closed', true],
  ['sukkot_2', 'Sukkot (day 2)', 'Sucot (día 2)', 'closed', true],
  ['chol_hamoed_sukkot', 'Chol HaMoed Sukkot', 'Jol HaMoed de Sucot', 'open', true],
  ['hoshana_rabbah', 'Hoshana Rabbah', 'Hoshaná Rabá', 'open', true],
  ['shemini_atzeret', 'Shemini Atzeret', 'Sheminí Atzeret', 'closed', true],
  ['simchat_torah', 'Simchat Torah', 'Simjat Torá', 'closed', true],
  ['chanukah', 'Chanukah', 'Janucá', 'open', true],
  ['asara_btevet', "Fast of 10 Tevet (Asara B'Tevet)", 'Ayuno del 10 de Tevet', 'open', false],
  ['tu_bishvat', "Tu BiShvat", 'Tu Bishvat', 'open', true],
  ['taanit_esther', "Fast of Esther (Ta'anit Esther)", 'Ayuno de Ester', 'open', false],
  ['purim', 'Purim', 'Purim', 'open', true],
  ['shushan_purim', 'Shushan Purim', 'Shushán Purim', 'open', true],
  ['pesach_1', 'Passover (day 1)', 'Pésaj (día 1)', 'closed', true],
  ['pesach_2', 'Passover (day 2)', 'Pésaj (día 2)', 'closed', true],
  ['chol_hamoed_pesach', 'Chol HaMoed Passover', 'Jol HaMoed de Pésaj', 'open', true],
  ['pesach_7', 'Passover (day 7)', 'Pésaj (día 7)', 'closed', true],
  ['pesach_8', 'Passover (day 8)', 'Pésaj (día 8)', 'closed', true],
  ['yom_hashoah', 'Yom HaShoah', 'Yom HaShoá', 'open', true],
  ['yom_hazikaron', 'Yom HaZikaron', 'Yom HaZikarón', 'open', true],
  ['yom_haatzmaut', "Yom HaAtzma'ut", 'Yom HaAtzmaut', 'open', true],
  ['lag_baomer', 'Lag BaOmer', 'Lag BaÓmer', 'open', true],
  ['yom_yerushalayim', 'Yom Yerushalayim', 'Yom Yerushaláyim', 'open', true],
  ['shavuot_1', 'Shavuot (day 1)', 'Shavuot (día 1)', 'closed', true],
  ['shavuot_2', 'Shavuot (day 2)', 'Shavuot (día 2)', 'closed', true],
  ['tzom_tammuz', 'Fast of 17 Tammuz', 'Ayuno del 17 de Tamuz', 'open', false],
  ['tisha_bav', "Tisha B'Av", 'Tishá BeAv', 'open', true],
].map(([key, en, es, def, sundown]) => ({ key, set: 'jewish', en, es, default: def, sundown }));

export const US = [
  ['us_new_year', "New Year's Day", 'Año Nuevo', 'closed'],
  ['us_mlk', 'Martin Luther King Jr. Day', 'Día de Martin Luther King Jr.', 'closed'],
  ['us_presidents', "Presidents' Day", 'Día de los Presidentes', 'open'],
  ['us_memorial', 'Memorial Day', 'Día de los Caídos', 'closed'],
  ['us_juneteenth', 'Juneteenth', 'Juneteenth', 'closed'],
  ['us_independence', 'Independence Day', 'Día de la Independencia', 'closed'],
  ['us_labor', 'Labor Day', 'Día del Trabajo', 'closed'],
  ['us_columbus', "Columbus Day / Indigenous Peoples' Day", 'Día de la Raza / de los Pueblos Indígenas', 'open'],
  ['us_veterans', 'Veterans Day', 'Día de los Veteranos', 'open'],
  ['us_thanksgiving', 'Thanksgiving', 'Día de Acción de Gracias', 'closed'],
  ['us_thanksgiving_friday', 'Day after Thanksgiving', 'Día después de Acción de Gracias', 'closed'],
  ['us_christmas_eve', 'Christmas Eve', 'Nochebuena', 'closed'],
  ['us_christmas', 'Christmas Day', 'Navidad', 'closed'],
].map(([key, en, es, def]) => ({ key, set: 'us_federal', en, es, default: def, sundown: false }));

export const HOLIDAYS = [...JEWISH, ...US];
export const HOLIDAY_BY_KEY = new Map(HOLIDAYS.map((h) => [h.key, h]));

const DAY = 86400000;
const ms = (s) => Date.parse(`${s}T00:00:00Z`);
const iso = (t) => new Date(t).toISOString().slice(0, 10);
export const addDays = (s, n) => iso(ms(s) + n * DAY);
const dow = (s) => new Date(ms(s)).getUTCDay();          // 0 Sunday .. 6 Saturday

// ---- the Hebrew calendar through Intl ------------------------------------------------------------------------------------------
let FMT = null;
const fmt = () => (FMT ||= new Intl.DateTimeFormat('en-u-ca-hebrew', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' }));
// The Hebrew date of a Gregorian 'YYYY-MM-DD': { year, month ('Tishri', ..., 'Adar', 'Adar I', 'Adar II', ...), day }
export function hebrewDate(s) {
  const p = fmt().formatToParts(new Date(ms(s)));
  const get = (t) => p.find((x) => x.type === t)?.value;
  return { year: Number(String(get('year')).replace(/\D/g, '')), month: get('month'), day: Number(get('day')) };
}
// 'Hebrew year|month|day' -> Gregorian date, for every day from `from` to `to` (inclusive)
function hebrewIndex(from, to) {
  const m = new Map();
  for (let t = ms(from); t <= ms(to); t += DAY) {
    const s = iso(t), h = hebrewDate(s);
    m.set(`${h.year}|${h.month}|${h.day}`, s);
  }
  return m;
}

// Every Jewish holiday day of Hebrew year hy (needs an index covering it): [{ key, date, n (day of a multi-day holiday) }]
function jewishYear(hy, idx) {
  const out = [];
  const at = (month, day) => idx.get(`${hy}|${month}|${day}`) || null;
  const leap = idx.has(`${hy}|Adar II|1`);
  const adar = leap ? 'Adar II' : 'Adar';
  const put = (key, date, n = null) => { if (date) out.push({ key, date, ...(n ? { n } : {}) }); };
  const shabbatTo = (date, shift) => (date && dow(date) === 6 ? addDays(date, shift) : date);
  put('rosh_hashanah_1', at('Tishri', 1));
  put('rosh_hashanah_2', at('Tishri', 2));
  put('tzom_gedaliah', shabbatTo(at('Tishri', 3), 1));                              // Shabbat -> Sunday
  put('yom_kippur', at('Tishri', 10));
  put('sukkot_1', at('Tishri', 15));
  put('sukkot_2', at('Tishri', 16));
  for (let d = 17; d <= 20; d++) put('chol_hamoed_sukkot', at('Tishri', d), d - 16);
  put('hoshana_rabbah', at('Tishri', 21));
  put('shemini_atzeret', at('Tishri', 22));
  put('simchat_torah', at('Tishri', 23));                                            // diaspora
  const k25 = at('Kislev', 25);
  if (k25) for (let i = 0; i < 8; i++) put('chanukah', addDays(k25, i), i + 1);
  put('asara_btevet', at('Tevet', 10));
  put('tu_bishvat', at('Shevat', 15));
  put('taanit_esther', shabbatTo(at(adar, 13), -2));                                 // Shabbat -> Thursday
  put('purim', at(adar, 14));
  put('shushan_purim', at(adar, 15));
  put('pesach_1', at('Nisan', 15));
  put('pesach_2', at('Nisan', 16));
  for (let d = 17; d <= 20; d++) put('chol_hamoed_pesach', at('Nisan', d), d - 16);
  put('pesach_7', at('Nisan', 21));
  put('pesach_8', at('Nisan', 22));
  const shoah = at('Nisan', 27);                                                     // Friday -> Thursday, Sunday -> Monday
  put('yom_hashoah', shoah && dow(shoah) === 5 ? addDays(shoah, -1) : shoah && dow(shoah) === 0 ? addDays(shoah, 1) : shoah);
  const iyar5 = at('Iyar', 5);
  if (iyar5) {                                                                        // Yom HaAtzma'ut never next to Shabbat
    const w = dow(iyar5);
    const atz = w === 5 ? addDays(iyar5, -1) : w === 6 ? addDays(iyar5, -2) : w === 1 ? addDays(iyar5, 1) : iyar5;
    put('yom_hazikaron', addDays(atz, -1));
    put('yom_haatzmaut', atz);
  }
  put('lag_baomer', at('Iyar', 18));
  put('yom_yerushalayim', at('Iyar', 28));
  put('shavuot_1', at('Sivan', 6));
  put('shavuot_2', at('Sivan', 7));
  put('tzom_tammuz', shabbatTo(at('Tamuz', 17), 1));
  put('tisha_bav', shabbatTo(at('Av', 9), 1));
  return out;
}

const nthWeekday = (y, month, wd, n) => {          // n-th weekday wd (0 Sunday) of month (1-12); n = -1: the last one
  if (n > 0) { const first = `${y}-${String(month).padStart(2, '0')}-01`; return addDays(first, ((wd - dow(first) + 7) % 7) + (n - 1) * 7); }
  const last = addDays(month === 12 ? `${y + 1}-01-01` : `${y}-${String(month + 1).padStart(2, '0')}-01`, -1);
  return addDays(last, -((dow(last) - wd + 7) % 7));
};
const observed = (s) => (dow(s) === 6 ? addDays(s, -1) : dow(s) === 0 ? addDays(s, 1) : s);

function usYear(y) {
  const out = [];
  const fixed = (key, md) => { const d = `${y}-${md}`; const o = observed(d); out.push({ key, date: o, ...(o !== d ? { observed: true } : {}) }); };
  fixed('us_new_year', '01-01');
  out.push({ key: 'us_mlk', date: nthWeekday(y, 1, 1, 3) });
  out.push({ key: 'us_presidents', date: nthWeekday(y, 2, 1, 3) });
  out.push({ key: 'us_memorial', date: nthWeekday(y, 5, 1, -1) });
  fixed('us_juneteenth', '06-19');
  fixed('us_independence', '07-04');
  out.push({ key: 'us_labor', date: nthWeekday(y, 9, 1, 1) });
  out.push({ key: 'us_columbus', date: nthWeekday(y, 10, 1, 2) });
  fixed('us_veterans', '11-11');
  const tg = nthWeekday(y, 11, 4, 4);
  out.push({ key: 'us_thanksgiving', date: tg }, { key: 'us_thanksgiving_friday', date: addDays(tg, 1) });
  out.push({ key: 'us_christmas_eve', date: `${y}-12-24` });
  fixed('us_christmas', '12-25');
  return out;
}

const label = (h, x, lang) => {
  const base = lang === 'es' ? h.es : h.en;
  const day = x.n && (h.key === 'chanukah' || h.key.startsWith('chol_hamoed')) ? (lang === 'es' ? ` (día ${x.n})` : ` (day ${x.n})`) : '';
  return `${base}${day}${x.observed ? (lang === 'es' ? ' (observado)' : ' (observed)') : ''}`;
};

// Every built-in holiday day in Gregorian year y, sorted by date:
//   [{ key, set, date, label, label_es, default, sundown, erev (the evening it begins: date - 1, Jewish days only) }]
export function holidaysInYear(y) {
  if (!Number.isInteger(y) || y < 1900 || y > 2200) throw new Error('year out of range');
  const idx = hebrewIndex(`${y - 1}-08-01`, `${y + 1}-11-30`);
  const raw = [...jewishYear(y + 3760, idx), ...jewishYear(y + 3761, idx), ...usYear(y), ...usYear(y + 1).filter((x) => x.key === 'us_new_year')];
  return raw.filter((x) => x.date.startsWith(`${y}-`)).map((x) => {
    const h = HOLIDAY_BY_KEY.get(x.key);
    return { key: x.key, set: h.set, date: x.date, label: label(h, x, 'en'), label_es: label(h, x, 'es'), default: h.default, sundown: h.sundown,
      ...(h.sundown ? { erev: addDays(x.date, -1) } : {}) };
  }).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.key < b.key ? -1 : 1));
}
export function holidaysBetween(from, to) {
  const out = [];
  for (let y = Number(from.slice(0, 4)); y <= Number(to.slice(0, 4)); y++) out.push(...holidaysInYear(y));
  return out.filter((h) => h.date >= from && h.date <= to);
}
