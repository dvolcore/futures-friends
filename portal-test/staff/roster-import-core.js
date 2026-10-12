// Roster import, the pure part (no DOM, no network): read a CSV, recognise Procare / Brightwheel / the Futures Hub template, map columns
// to the hub's fields, and turn each line into the normalized row the database validates (roster_import_preview, migration
// 20261028310000_roster_import.sql; hub/ROSTER_IMPORT.md). The page (roster-import-ui.js) and the unit tests import this file.
// The database checks everything again: what is here only helps the director see problems before uploading.

// ---- CSV (RFC 4180: quotes, doubled quotes, commas and line breaks inside quotes; ; or tab separated files too) -------------------
export function parseCsv(text) {
  let s = String(text ?? '');
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);                      // Excel's byte-order mark
  const first = s.split(/\r?\n/, 1)[0] || '';
  const count = (ch) => (first.match(new RegExp(`\\${ch}`, 'g')) || []).length;
  const sep = count('\t') > count(',') && count('\t') >= count(';') ? '\t' : count(';') > count(',') ? ';' : ',';
  const rows = []; let row = []; let cell = ''; let q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"' && cell === '') q = true;
    else if (c === sep) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  const clean = rows.map((r) => r.map((x) => x.trim())).filter((r) => r.some((x) => x !== ''));
  if (!clean.length) return { headers: [], rows: [] };
  const headers = clean[0].map((h, i) => h || `col_${i + 1}`);   // a column without a name
  return { headers, rows: clean.slice(1).map((r) => headers.map((_, i) => r[i] ?? '')) };
}

// ---- the hub's fields -----------------------------------------------------------------------------------------------------------
// the fields, in screen order, with their group
export const FIELDS = [
  { key: 'child_first', group: 'child' },
  { key: 'child_last', group: 'child' },
  { key: 'child_name', group: 'child' },
  { key: 'child_preferred', group: 'child' },
  { key: 'child_dob', group: 'child' },
  { key: 'room', group: 'child' },
  { key: 'start_date', group: 'child' },
  { key: 'home_language', group: 'child' },
  { key: 'g1_first', group: 'guardian' },
  { key: 'g1_last', group: 'guardian' },
  { key: 'g1_name', group: 'guardian' },
  { key: 'g1_relationship', group: 'guardian' },
  { key: 'g1_email', group: 'guardian' },
  { key: 'g1_phone', group: 'guardian' },
  { key: 'g1_address', group: 'guardian' },
  { key: 'g1_language', group: 'guardian' },
  { key: 'g2_first', group: 'guardian' },
  { key: 'g2_last', group: 'guardian' },
  { key: 'g2_name', group: 'guardian' },
  { key: 'g2_relationship', group: 'guardian' },
  { key: 'g2_email', group: 'guardian' },
  { key: 'g2_phone', group: 'guardian' },
  { key: 'g2_address', group: 'guardian' },
  { key: 'g2_language', group: 'guardian' },
  { key: 'e1_name', group: 'emergency' },
  { key: 'e1_relationship', group: 'emergency' },
  { key: 'e1_phone', group: 'emergency' },
  { key: 'e2_name', group: 'emergency' },
  { key: 'e2_relationship', group: 'emergency' },
  { key: 'e2_phone', group: 'emergency' },
  { key: 'p1_name', group: 'pickup' },
  { key: 'p1_relationship', group: 'pickup' },
  { key: 'p1_phone', group: 'pickup' },
  { key: 'p2_name', group: 'pickup' },
  { key: 'p2_relationship', group: 'pickup' },
  { key: 'p2_phone', group: 'pickup' },
  { key: 'p3_name', group: 'pickup' },
  { key: 'p3_relationship', group: 'pickup' },
  { key: 'p3_phone', group: 'pickup' },
  { key: 'allergies', group: 'care' },
  { key: 'allergy_severity', group: 'care' },
  { key: 'diet', group: 'care' },
  { key: 'medical', group: 'care' },
  { key: 'physician_name', group: 'care' },
  { key: 'physician_phone', group: 'care' },
  { key: 'custody_name', group: 'custody' },
  { key: 'custody_email', group: 'custody' },
  { key: 'custody_order', group: 'custody' },
  { key: 'custody_reason', group: 'custody' },
  { key: 'imm_dtap', group: 'immunizations' },
  { key: 'imm_polio', group: 'immunizations' },
  { key: 'imm_mmr', group: 'immunizations' },
  { key: 'imm_hib', group: 'immunizations' },
  { key: 'imm_hepb', group: 'immunizations' },
  { key: 'imm_varicella', group: 'immunizations' },
  { key: 'imm_pcv', group: 'immunizations' },
  { key: 'imm_hepa', group: 'immunizations' },
  { key: 'imm_rotavirus', group: 'immunizations' },
  { key: 'imm_influenza', group: 'immunizations' },
  { key: 'imm_covid19', group: 'immunizations' },
  { key: 'imm_tdap', group: 'immunizations' },
  { key: 'imm_menacwy', group: 'immunizations' },
  { key: 'imm_exemption', group: 'immunizations' },
];
// their labels, English and Spanish (DRAFT): dict(FIELD_LABELS, lang) on the screen
export const FIELD_LABELS = {
  en: {
    child_first: "Child's first name",
    child_last: "Child's last name",
    child_name: "Child's full name (Last, First)",
    child_preferred: "Preferred name",
    child_dob: "Date of birth",
    room: "Room / classroom",
    start_date: "Enrollment date",
    home_language: "Home language",
    g1_first: "Guardian 1 first name",
    g1_last: "Guardian 1 last name",
    g1_name: "Guardian 1 full name",
    g1_relationship: "Guardian 1 relationship",
    g1_email: "Guardian 1 email",
    g1_phone: "Guardian 1 phone",
    g1_address: "Guardian 1 address",
    g1_language: "Guardian 1 language",
    g2_first: "Guardian 2 first name",
    g2_last: "Guardian 2 last name",
    g2_name: "Guardian 2 full name",
    g2_relationship: "Guardian 2 relationship",
    g2_email: "Guardian 2 email",
    g2_phone: "Guardian 2 phone",
    g2_address: "Guardian 2 address",
    g2_language: "Guardian 2 language",
    e1_name: "Emergency contact 1 name",
    e1_relationship: "Emergency contact 1 relationship",
    e1_phone: "Emergency contact 1 phone",
    e2_name: "Emergency contact 2 name",
    e2_relationship: "Emergency contact 2 relationship",
    e2_phone: "Emergency contact 2 phone",
    p1_name: "Authorized pickup 1 name",
    p1_relationship: "Authorized pickup 1 relationship",
    p1_phone: "Authorized pickup 1 phone",
    p2_name: "Authorized pickup 2 name",
    p2_relationship: "Authorized pickup 2 relationship",
    p2_phone: "Authorized pickup 2 phone",
    p3_name: "Authorized pickup 3 name",
    p3_relationship: "Authorized pickup 3 relationship",
    p3_phone: "Authorized pickup 3 phone",
    allergies: "Allergies (separated by ; or ,)",
    allergy_severity: "Allergy severity",
    diet: "Dietary needs",
    medical: "Medical conditions",
    physician_name: "Physician name",
    physician_phone: "Physician phone",
    custody_name: "Restricted person (custody): name",
    custody_email: "Restricted person: email",
    custody_order: "Court order / custody document reference",
    custody_reason: "Custody restriction: reason",
    imm_dtap: "DTaP: dates (separated by ;)",
    imm_polio: "Polio (IPV): dates (separated by ;)",
    imm_mmr: "MMR: dates (separated by ;)",
    imm_hib: "Hib: dates (separated by ;)",
    imm_hepb: "Hepatitis B: dates (separated by ;)",
    imm_varicella: "Varicella (chickenpox): dates (separated by ;)",
    imm_pcv: "Pneumococcal (PCV): dates (separated by ;)",
    imm_hepa: "Hepatitis A: dates (separated by ;)",
    imm_rotavirus: "Rotavirus: dates (separated by ;)",
    imm_influenza: "Influenza (flu): dates (separated by ;)",
    imm_covid19: "COVID-19: dates (separated by ;)",
    imm_tdap: "Tdap: dates (separated by ;)",
    imm_menacwy: "Meningococcal (MenACWY): dates (separated by ;)",
    imm_exemption: "Immunization exemption (medical or religious)",
  },
  es: {
    child_first: "Nombre del niño o la niña",
    child_last: "Apellido del niño o la niña",
    child_name: "Nombre completo (Apellido, Nombre)",
    child_preferred: "Nombre preferido",
    child_dob: "Fecha de nacimiento",
    room: "Salón",
    start_date: "Fecha de inscripción",
    home_language: "Idioma del hogar",
    g1_first: "Nombre del tutor 1",
    g1_last: "Apellido del tutor 1",
    g1_name: "Nombre completo del tutor 1",
    g1_relationship: "Parentesco del tutor 1",
    g1_email: "Correo electrónico del tutor 1",
    g1_phone: "Teléfono del tutor 1",
    g1_address: "Dirección del tutor 1",
    g1_language: "Idioma del tutor 1",
    g2_first: "Nombre del tutor 2",
    g2_last: "Apellido del tutor 2",
    g2_name: "Nombre completo del tutor 2",
    g2_relationship: "Parentesco del tutor 2",
    g2_email: "Correo electrónico del tutor 2",
    g2_phone: "Teléfono del tutor 2",
    g2_address: "Dirección del tutor 2",
    g2_language: "Idioma del tutor 2",
    e1_name: "Contacto de emergencia 1: nombre",
    e1_relationship: "Contacto de emergencia 1: parentesco",
    e1_phone: "Contacto de emergencia 1: teléfono",
    e2_name: "Contacto de emergencia 2: nombre",
    e2_relationship: "Contacto de emergencia 2: parentesco",
    e2_phone: "Contacto de emergencia 2: teléfono",
    p1_name: "Persona autorizada 1: nombre",
    p1_relationship: "Persona autorizada 1: parentesco",
    p1_phone: "Persona autorizada 1: teléfono",
    p2_name: "Persona autorizada 2: nombre",
    p2_relationship: "Persona autorizada 2: parentesco",
    p2_phone: "Persona autorizada 2: teléfono",
    p3_name: "Persona autorizada 3: nombre",
    p3_relationship: "Persona autorizada 3: parentesco",
    p3_phone: "Persona autorizada 3: teléfono",
    allergies: "Alergias (separadas por ; o ,)",
    allergy_severity: "Gravedad de la alergia",
    diet: "Necesidades de alimentación",
    medical: "Condiciones médicas",
    physician_name: "Nombre del médico",
    physician_phone: "Teléfono del médico",
    custody_name: "Persona restringida (custodia): nombre",
    custody_email: "Persona restringida: correo electrónico",
    custody_order: "Referencia de la orden judicial o del documento de custodia",
    custody_reason: "Restricción de custodia: motivo",
    imm_dtap: "DTaP: fechas (separadas por ;)",
    imm_polio: "Polio (IPV): fechas (separadas por ;)",
    imm_mmr: "MMR (sarampión, paperas, rubéola): fechas (separadas por ;)",
    imm_hib: "Hib: fechas (separadas por ;)",
    imm_hepb: "Hepatitis B: fechas (separadas por ;)",
    imm_varicella: "Varicela: fechas (separadas por ;)",
    imm_pcv: "Neumococo (PCV): fechas (separadas por ;)",
    imm_hepa: "Hepatitis A: fechas (separadas por ;)",
    imm_rotavirus: "Rotavirus: fechas (separadas por ;)",
    imm_influenza: "Influenza (gripe): fechas (separadas por ;)",
    imm_covid19: "COVID-19: fechas (separadas por ;)",
    imm_tdap: "Tdap: fechas (separadas por ;)",
    imm_menacwy: "Meningococo (MenACWY): fechas (separadas por ;)",
    imm_exemption: "Exención de vacunas (médica o religiosa)",
  },
};
export const FIELD_KEYS = FIELDS.map((f) => f.key);
export const IMM_VACCINES = FIELDS.filter((f) => f.group === 'immunizations' && f.key !== 'imm_exemption').map((f) => f.key.slice(4));

// ---- header aliases: the generic template's own names, then what Procare and Brightwheel exports commonly use --------------------
// (column names differ between versions and exports: anything not recognised is mapped by hand on the screen)
const norm = (h) => String(h ?? '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '');
const A = {
  child_first: ['child_first', 'first_name', 'child_first_name', 'student_first_name', 'first', 'firstname', 'childfirstname', 'nombre'],
  child_last: ['child_last', 'last_name', 'child_last_name', 'student_last_name', 'last', 'lastname', 'apellido'],
  child_name: ['child_name', 'student_name', 'child', 'student', 'name', 'full_name'],
  child_preferred: ['child_preferred', 'preferred_name', 'nickname', 'goes_by', 'student_nickname'],
  child_dob: ['child_dob', 'birth_date', 'birthdate', 'date_of_birth', 'dob', 'birthday', 'student_birthday', 'fecha_de_nacimiento'],
  room: ['room', 'classroom', 'class', 'room_name', 'classroom_name', 'current_classroom', 'home_room', 'homeroom', 'group', 'salon'],
  start_date: ['start_date', 'enrollment_date', 'enroll_date', 'enrollment_start_date', 'start_date', 'admission_date', 'admit_date', 'date_enrolled', 'first_day'],
  home_language: ['home_language', 'home_language', 'primary_language', 'language', 'student_language'],
  allergies: ['allergies', 'allergy', 'allergy_list', 'food_allergies', 'alergias'],
  allergy_severity: ['allergy_severity', 'allergy_severity', 'severity'],
  diet: ['diet', 'dietary', 'dietary_restrictions', 'dietary_needs', 'diet_restrictions', 'food_restrictions'],
  medical: ['medical', 'medical_conditions', 'medical_notes', 'health_conditions', 'conditions', 'medications', 'health_notes'],
  physician_name: ['physician_name', 'physician', 'doctor', 'doctor_name', 'physician_name', 'pediatrician'],
  physician_phone: ['physician_phone', 'doctor_phone', 'physician_phone', 'pediatrician_phone'],
  custody_name: ['custody_name', 'restricted_person', 'restricted_pickup', 'do_not_release_to', 'not_authorized', 'custody_restricted_name', 'restricted_adult'],
  custody_email: ['custody_email', 'restricted_person_email', 'restricted_email'],
  custody_order: ['custody_order', 'court_order', 'custody_order', 'court_order_reference', 'custody_document'],
  custody_reason: ['custody_reason', 'custody_notes', 'custody_reason', 'restriction_reason', 'custody'],
  imm_dtap: ['imm_dtap', 'dtap', 'dtap_dates', 'dtap_date', 'dtp'],
  imm_polio: ['imm_polio', 'polio', 'ipv', 'polio_dates', 'ipv_dates'],
  imm_mmr: ['imm_mmr', 'mmr', 'mmr_dates'],
  imm_hib: ['imm_hib', 'hib', 'hib_dates'],
  imm_hepb: ['imm_hepb', 'hepb', 'hep_b', 'hepatitis_b', 'hepb_dates'],
  imm_varicella: ['imm_varicella', 'varicella', 'chickenpox', 'var', 'varicella_dates'],
  imm_pcv: ['imm_pcv', 'pcv', 'pcv13', 'pneumococcal', 'pcv_dates'],
  imm_hepa: ['imm_hepa', 'hepa', 'hep_a', 'hepatitis_a', 'hepa_dates'],
  imm_rotavirus: ['imm_rotavirus', 'rotavirus', 'rota'],
  imm_influenza: ['imm_influenza', 'influenza', 'flu', 'flu_dates'],
  imm_covid19: ['imm_covid19', 'covid19', 'covid', 'covid_19'],
  imm_tdap: ['imm_tdap', 'tdap'],
  imm_menacwy: ['imm_menacwy', 'menacwy', 'meningococcal', 'mcv4'],
  imm_exemption: ['imm_exemption', 'immunization_exemption', 'vaccine_exemption', 'vaccination_exemption', 'exemption'],
};
for (const n of [1, 2]) {
  const P = [`parent_${n}`, `guardian_${n}`, `contact_${n}`, `parent${n}`, `guardian${n}`, `primary_guardian`, `parent/guardian_${n}`];
  const pick = (suffixes) => P.flatMap((p) => suffixes.map((s) => `${p}_${s}`));
  A[`g${n}_first`] = [`g${n}_first`, ...pick(['first_name', 'first'])];
  A[`g${n}_last`] = [`g${n}_last`, ...pick(['last_name', 'last'])];
  A[`g${n}_name`] = [`g${n}_name`, ...pick(['name', 'full_name']), ...(n === 1 ? ['parent_name', 'guardian_name', 'parent'] : [])];
  A[`g${n}_relationship`] = [`g${n}_relationship`, ...pick(['relationship', 'relation', 'type'])];
  A[`g${n}_email`] = [`g${n}_email`, ...pick(['email', 'email_address', 'e-mail']), ...(n === 1 ? ['parent_email', 'guardian_email', 'email'] : [])];
  A[`g${n}_phone`] = [`g${n}_phone`, ...pick(['phone', 'cell_phone', 'mobile_phone', 'cell', 'mobile', 'phone_number', 'home_phone']), ...(n === 1 ? ['parent_phone', 'phone'] : [])];
  A[`g${n}_address`] = [`g${n}_address`, ...pick(['address', 'home_address', 'street_address']), ...(n === 1 ? ['address', 'home_address'] : [])];
  A[`g${n}_language`] = [`g${n}_language`, ...pick(['language', 'preferred_language'])];
  A[`e${n}_name`] = [`e${n}_name`, `emergency_contact_${n}_name`, `emergency_contact_${n}`, `emergency_${n}_name`, ...(n === 1 ? ['emergency_contact', 'emergency_contact_name'] : [])];
  A[`e${n}_relationship`] = [`e${n}_relationship`, `emergency_contact_${n}_relationship`, `emergency_${n}_relationship`, ...(n === 1 ? ['emergency_contact_relationship'] : [])];
  A[`e${n}_phone`] = [`e${n}_phone`, `emergency_contact_${n}_phone`, `emergency_${n}_phone`, ...(n === 1 ? ['emergency_contact_phone', 'emergency_phone'] : [])];
}
for (const n of [1, 2, 3]) {
  const P = [`authorized_pickup_${n}`, `approved_pickup_${n}`, `pickup_${n}`, `authorized_person_${n}`, `pick_up_${n}`];
  A[`p${n}_name`] = [`p${n}_name`, ...P, ...P.map((p) => `${p}_name`)];
  A[`p${n}_relationship`] = [`p${n}_relationship`, ...P.map((p) => `${p}_relationship`)];
  A[`p${n}_phone`] = [`p${n}_phone`, ...P.map((p) => `${p}_phone`)];
}
const ALIAS = new Map();
for (const [key, list] of Object.entries(A)) for (const h of list) if (!ALIAS.has(norm(h))) ALIAS.set(norm(h), key);

// Which program made the file (by its headers): a hint for the screen, never a requirement.
export function detectSource(headers) {
  const h = headers.map(norm);
  if (h.includes('childfirst') || h.includes('g1email')) return 'generic';
  if (h.some((x) => x.startsWith('student')) || h.some((x) => x.startsWith('approvedpickup'))) return 'brightwheel';
  if (h.some((x) => /^(parent|guardian)[12]/.test(x)) || h.includes('classroom') || h.includes('enrolldate')) return 'procare';
  return 'generic';
}

// { hubField: columnIndex } from the headers; each column is used once
export function autoMap(headers) {
  const map = {};
  headers.forEach((h, i) => {
    const key = ALIAS.get(norm(h));
    if (key && map[key] === undefined) map[key] = i;
  });
  if (map.child_first !== undefined && map.child_last !== undefined) delete map.child_name;
  return map;
}

// ---- values ---------------------------------------------------------------------------------------------------------------------
// MM/DD/YYYY, M/D/YY, YYYY-MM-DD, DD.MM.YYYY is NOT guessed (US exports only). Returns 'YYYY-MM-DD' or the text as given (the database
// then says it is not a date).
export function normDate(v) {
  const s = String(v ?? '').trim();
  if (!s) return '';
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})(?:\s.*)?$/);
  if (m) {
    let y = Number(m[3]);
    if (m[3].length === 2) y += y > Number(String(new Date().getFullYear()).slice(2)) ? 1900 : 2000;
    return `${y}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  }
  return s;
}
const splitList = (v) => String(v ?? '').split(/[;,|\n]+/).map((x) => x.trim()).filter(Boolean);
const lang = (v) => (/^(es|sp|span|espa)/i.test(String(v ?? '').trim()) ? 'es' : 'en');
const join = (...xs) => xs.map((x) => String(x ?? '').trim()).filter(Boolean).join(' ');
// "Rivera, Ana" -> ["Ana", "Rivera"]; "Ana Rivera" -> ["Ana", "Rivera"]
export function splitName(v) {
  const s = String(v ?? '').trim();
  if (!s) return ['', ''];
  if (s.includes(',')) { const [last, first] = s.split(',', 2).map((x) => x.trim()); return [first, last]; }
  const parts = s.split(/\s+/);
  return parts.length === 1 ? [parts[0], ''] : [parts.slice(0, -1).join(' '), parts[parts.length - 1]];
}

// One CSV line -> the normalized row (roster_import_preview's input).
export function toRow(cells, map) {
  const v = (k) => (map[k] === undefined || map[k] === null || map[k] === '' ? '' : String(cells[Number(map[k])] ?? '').trim());
  let first = v('child_first'), last = v('child_last');
  if ((!first || !last) && v('child_name')) { const [f, l] = splitName(v('child_name')); first ||= f; last ||= l; }
  const guardians = [1, 2].map((n) => ({
    name: v(`g${n}_name`) || join(v(`g${n}_first`), v(`g${n}_last`)), relationship: v(`g${n}_relationship`), email: v(`g${n}_email`),
    phone: v(`g${n}_phone`), address: v(`g${n}_address`), lang: lang(v(`g${n}_language`)),
  })).filter((g) => g.name || g.email || g.phone);
  const emergency_contacts = [1, 2].map((n) => ({ name: v(`e${n}_name`), relationship: v(`e${n}_relationship`), phone: v(`e${n}_phone`) })).filter((x) => x.name);
  const pickups = [1, 2, 3].map((n) => ({ name: v(`p${n}_name`), relationship: v(`p${n}_relationship`), phone: v(`p${n}_phone`) })).filter((x) => x.name);
  const alerts = [
    ...splitList(v('allergies')).map((label) => ({ type: 'allergy', label, severity: v('allergy_severity') })),
    ...splitList(v('diet')).map((label) => ({ type: 'diet', label })),
    ...splitList(v('medical')).map((label) => ({ type: 'condition', label })),
  ];
  const custody = v('custody_name') || v('custody_email') || v('custody_order')
    ? [{ name: v('custody_name'), email: v('custody_email'), order_ref: v('custody_order'), reason: v('custody_reason') }] : [];
  const physician = v('physician_name') ? { name: v('physician_name'), phone: v('physician_phone') } : undefined;
  // immunization dates per vaccine (health records): "2023-01-05; 03/10/2023" -> ['2023-01-05', '2023-03-10']; the database checks them again
  const immunizations = IMM_VACCINES.map((vx) => ({ vaccine: vx, dates: splitList(v(`imm_${vx}`)).map(normDate) })).filter((x) => x.dates.length);
  const ex = v('imm_exemption').toLowerCase();
  const immunization_exemption = /^(med|méd)/.test(ex) ? 'medical' : /^(rel)/.test(ex) ? 'religious' : ex ? ex : '';
  return {
    child: { first, last, preferred: v('child_preferred'), dob: normDate(v('child_dob')), room: v('room'), start_date: normDate(v('start_date')), home_language: v('home_language') },
    guardians, emergency_contacts, pickups, alerts, custody, ...(physician ? { physician } : {}),
    ...(immunizations.length ? { immunizations } : {}), ...(immunization_exemption ? { immunization_exemption } : {}),
  };
}

// What must be mapped before the dry run can start
export function mappingProblems(map) {
  const out = [];
  const has = (k) => map[k] !== undefined && map[k] !== null && map[k] !== '';
  if (!((has('child_first') && has('child_last')) || has('child_name'))) out.push('child_name');
  if (!has('room')) out.push('room');
  return out;
}

// The generic template (the header line and one fake example line)
export const TEMPLATE_HEADERS = ['child_first', 'child_last', 'child_preferred', 'child_dob', 'room', 'start_date', 'home_language',
  'g1_first', 'g1_last', 'g1_relationship', 'g1_email', 'g1_phone', 'g1_address', 'g1_language',
  'g2_first', 'g2_last', 'g2_relationship', 'g2_email', 'g2_phone', 'g2_language',
  'e1_name', 'e1_relationship', 'e1_phone', 'p1_name', 'p1_relationship', 'p1_phone', 'p2_name', 'p2_relationship', 'p2_phone',
  'allergies', 'allergy_severity', 'diet', 'medical', 'physician_name', 'physician_phone',
  'custody_name', 'custody_email', 'custody_order', 'custody_reason', 'imm_dtap', 'imm_mmr', 'imm_exemption'];
// one invented example line, English or Spanish
const EXAMPLE = {
  en: ['Ava', 'Example', 'Avi', '2022-04-15', 'Threes', '2026-11-02', 'English',
    'Maria', 'Example', 'Mother', 'maria.example@example.com', '816-555-0142', '1 Example St, Kansas City, MO', 'en',
    'Leo', 'Example', 'Father', 'leo.example@example.com', '816-555-0143', 'es',
    'Rosa Example', 'Grandmother', '816-555-0144', 'Rosa Example', 'Grandmother', '816-555-0144', '', '', '',
    'Peanuts; Tree nuts', 'Severe (EpiPen)', 'Vegetarian', '', 'Dr. Example', '816-555-0145', '', '', '', '', '2022-06-15; 2022-08-15; 2022-10-15', '2023-04-20', ''],
  es: ['Ava', 'Ejemplo', 'Avi', '2022-04-15', 'Tres años', '2026-11-02', 'Español',
    'María', 'Ejemplo', 'Madre', 'maria.ejemplo@example.com', '816-555-0142', '1 Calle Ejemplo, Kansas City, MO', 'es',
    'Leo', 'Ejemplo', 'Padre', 'leo.ejemplo@example.com', '816-555-0143', 'es',
    'Rosa Ejemplo', 'Abuela', '816-555-0144', 'Rosa Ejemplo', 'Abuela', '816-555-0144', '', '', '',
    'Cacahuates; Nueces', 'Grave (EpiPen)', 'Vegetariana', '', 'Dra. Ejemplo', '816-555-0145', '', '', '', '', '2022-06-15; 2022-08-15; 2022-10-15', '2023-04-20', ''],
};
const quote = (x) => (/[",\n]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x);
export function templateCsv(lang = 'en') {
  return TEMPLATE_HEADERS.join(',') + '\n' + (EXAMPLE[lang === 'es' ? 'es' : 'en']).map(quote).join(',') + '\n';
}
