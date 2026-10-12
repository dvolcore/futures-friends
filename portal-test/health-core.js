// Health records, the pure part (no DOM, no network): the words (English + Spanish DRAFT) and the form checks the page runs before
// calling the database (hub/HEALTH_RECORDS.md). The database checks everything again. tests/health-records-unit.test.mjs imports this.

export const VACCINES = ['dtap', 'polio', 'mmr', 'hib', 'hepb', 'varicella', 'pcv', 'hepa', 'rotavirus', 'influenza', 'covid19', 'tdap', 'menacwy', 'other'];
export const SYMPTOM_KEYS = ['fever', 'vomiting', 'diarrhea', 'rash', 'cough', 'runny_nose', 'sore_throat', 'eye_redness', 'ear_pain', 'stomach_ache', 'headache', 'unusually_tired'];

export const W = {
  en: {
    title: 'Health records', child: (n) => `Health records: ${n}`, back: 'Back', save: 'Save', saved: 'Saved.', add: 'Add', sending: 'Saving…',
    none: 'Nothing on file yet.', verify: 'Mark verified', verified: 'Verified', unverified: 'Not verified yet', remove: 'Entered in error',
    removeWhy: 'Why is this entry wrong?', inError: 'Entered in error', open: 'Open', noLicense: 'Health records are part of the Hub Complete license. Ask Futures Friends to add it.',
    sec: { compliance: 'What the file needs', immunizations: 'Immunizations', exemptions: 'Exemptions', assessments: 'Health assessments and screenings',
           plans: 'Health plans', meds: 'Medication', illness: 'Illness and injury log', docs: 'Health documents' },
    items: { immunization_record: 'Immunization record', health_assessment: 'Health assessment or medical exam', history_review: 'Medical history reviewed with the family',
             center_vaccines: 'The center\'s vaccine list', plan_review: 'Health plan review', screening_vision: 'Vision screening', screening_hearing: 'Hearing screening',
             screening_dental: 'Dental screening', screening_physical: 'Next physical', screening_growth: 'Growth check', immunization_summary_report: 'Immunization summary report' },
    states: { ok: 'On file', exempt: 'Exempt', due: 'Due', overdue: 'Overdue', attention: 'Missing doses', not_tracked: 'Not tracked' },
    dueOn: (d) => `due ${d}`, stateRule: 'State rule', centerPolicy: 'Center policy (not a state rule)', record: 'From the record',
    missing: (v, n, d) => `${v}: ${n} of ${d}`,
    vaccines: { dtap: 'DTaP', polio: 'Polio (IPV)', mmr: 'MMR', hib: 'Hib', hepb: 'Hepatitis B', varicella: 'Varicella (chickenpox)', pcv: 'Pneumococcal (PCV)',
                hepa: 'Hepatitis A', rotavirus: 'Rotavirus', influenza: 'Influenza (flu)', covid19: 'COVID-19', tdap: 'Tdap', menacwy: 'Meningococcal (MenACWY)', other: 'Other' },
    vaccine: 'Vaccine', dose: 'Dose number', givenOn: 'Date given', source: 'Where the date comes from', note: 'Note (optional)', document: 'Document (optional)', noDoc: 'No document',
    sources: { document: 'Shot record (document)', provider_record: 'Doctor or clinic record', family: 'Family', state_registry: 'State immunization registry', import: 'Roster import', transfer: 'Transferred' },
    scope: 'For', scopes: { immunization: 'Immunizations', health_assessment: 'Health assessment' }, exKind: 'Kind', exKinds: { medical: 'Medical', religious: 'Religious' },
    vaxFor: 'Vaccines (none ticked means all)', signedOn: 'Signed on', expiresOn: 'Expires on (optional)',
    aKind: 'Kind', aKinds: { physical: 'Physical or health assessment', vision: 'Vision screening', hearing: 'Hearing screening', dental: 'Dental screening',
                            growth: 'Growth (height and weight)', history_review: 'Medical history reviewed with the family' },
    doneOn: 'Date', provider: 'Doctor, nurse or screener (optional)', result: 'Result', results: { pass: 'Passed', refer: 'Referred', incomplete: 'Incomplete', reviewed: 'Reviewed' },
    nextDue: 'Next due (optional)', height: 'Height (cm)', weight: 'Weight (kg)', notes: 'Notes (optional)',
    pKinds: { allergy: 'Allergy action plan', asthma: 'Asthma plan', seizure: 'Seizure plan', diabetes: 'Diabetes plan', other: 'Other health plan' },
    planTitle: 'Name of the plan', alert: 'Linked care alert', noAlert: 'No care alert', triggers: 'Triggers', warning: 'Warning signs',
    steps: 'Emergency steps (every staff member sees these)', daily: 'Daily care', medOnSite: 'Emergency medication kept at the center', reviewBy: 'Review by',
    endPlan: 'End this plan', ended: 'Ended', meal: 'Meal instruction', mealStates: { approved: 'Approved meal instruction', pending: 'Meal instruction waiting for the director', none: 'No meal instruction' },
    newPlan: 'Add a health plan', newImm: 'Add an immunization', newEx: 'Add an exemption', newAss: 'Add an assessment or screening',
    medName: 'Medication name', medDose: 'Dose as written on the label', amount: 'Amount per dose', unit: 'Unit',
    units: { mL: 'mL', mg: 'mg', tablet: 'tablet', capsule: 'capsule', puff: 'puff', drop: 'drop', spray: 'spray', application: 'application', unit: 'unit', other: 'other' },
    route: 'How it is given', routes: { oral: 'By mouth', inhaled: 'Inhaled', topical: 'On the skin', eye: 'In the eye', ear: 'In the ear', nasal: 'In the nose', injection: 'Injection', other: 'Other' },
    times: 'Times of day', asNeeded: 'As needed (not at set times)', asNeededWhen: 'When it may be given', minHours: 'Hours between doses', maxDay: 'Most doses a day',
    startOn: 'First day', endOn: 'Last day', prescription: 'Prescription', prescriber: 'Prescriber (optional)', original: 'It comes in its original labeled container',
    storage: 'Storage', storages: { room_temp: 'Room temperature', refrigerated: 'Refrigerator', locked: 'Locked', with_staff: 'With staff', other: 'Other' },
    instructions: 'Instructions (optional)', newMed: 'Ask for a medication permission',
    statuses: { draft: 'Draft: complete the dose and times', awaiting_signature: 'Waiting for the family\'s signature', active: 'Active', ended: 'Ended', expired: 'Past its last day' },
    completeDraft: 'Complete this permission', draftNote: 'From the enrollment packet, in the family\'s words. Add the dose and the times; then a parent reads and signs it.',
    readSign: 'Read and sign', signTitle: 'Permission to give a medication', typeName: 'Type your full name as your signature',
    agree: 'I agree to sign electronically. My typed name is my signature.', sign: 'Sign', signed: (n, d) => `Signed by ${n} on ${d}`,
    paper: 'Signed on paper: file the scan', paperDoc: 'The signed form (document)', paperName: 'The guardian\'s full name', endMed: 'End this permission', endWhy: 'Why?',
    stock: 'Medication received', addStock: 'Record medication received', quantity: 'Quantity', expires: 'Expires', location: 'Where it is kept (optional)',
    left: (n, u) => `${n} ${u} left`, expiredStock: 'Expired', returned: 'Return to the family', disposed: 'Disposed of', recent: 'Recent doses', fingerprint: 'Fingerprint',
    marTitle: 'Medication record', marLead: 'Record each dose right after it is given.', outcomes: { given: 'Given', refused: 'Refused', missed: 'Missed', held: 'Held' },
    giveNow: 'Give a dose now', check: 'Check this dose', awaitingCheck: 'Waiting for a second check', checked: (n) => `Checked by ${n}`,
    slotStates: { upcoming: 'Upcoming', due: 'Due now', overdue: 'Overdue', recorded: 'Recorded' }, by: (o, n, t) => `${o} by ${n} at ${t}`,
    error: 'Report a medication error', errorPick: 'The incident report', noIncident: 'No incident report in the last 14 days: write one on the incident desk first.',
    errorNote: 'What happened', errorSaved: 'The error is recorded and linked.', untrained: 'Only staff with medication administration training can record medication (KS K.A.R. 28-4-132(i)).',
    noMeds: 'No medication is due on this day.', day: 'Day', askCheck: 'Ask a second trained person to check', prnToday: 'Given today', stockOnFile: 'On file',
    illKinds: { illness: 'Illness', injury: 'Injury' }, newIll: 'Log an illness or injury', observedAt: 'When', symptoms: 'Symptoms (the center\'s illness policy)',
    temp: 'Temperature (°F, optional)', tempMethod: 'How it was measured', methods: { oral: 'Mouth', ear: 'Ear', forehead: 'Forehead', armpit: 'Armpit', other: 'Other' },
    sentHome: 'Sent home', illNotes: 'What staff saw', reported: 'Reported to the health department',
    reportHint: 'Kansas: a listed disease by the next working day (K.A.R. 28-4-127(c)(2)(C)). Missouri: a suspected reportable disease to the local health department (5 CSR 25-500.192(1),(2)(B)).',
    exclusion: (d) => `Back no earlier than ${d} (center policy)`, noPolicy: 'Your center has no exclusion rule for these symptoms. No state rule is cited for exclusion periods.',
    returnedOn: 'Came back on', returnNote: 'Return-to-care note', addReturn: 'Add the return to care', incident: 'Incident report (optional)', noIncidentOpt: 'None',
    symptomsList: { fever: 'Fever', vomiting: 'Vomiting', diarrhea: 'Diarrhea', rash: 'Rash', cough: 'Cough', runny_nose: 'Runny nose', sore_throat: 'Sore throat',
                    eye_redness: 'Red or crusty eyes', ear_pain: 'Ear pain', stomach_ache: 'Stomach ache', headache: 'Headache', unusually_tired: 'Unusually tired' },
    dashTitle: 'Health records: the center', counts: { children: 'Children', overdue: 'Overdue', due: 'Due soon', attention: 'Missing doses', unverified: 'To verify',
      meds_active: 'Medication permissions', meds_to_sign: 'Waiting for a signature', doses_today: 'Doses today', doses_recorded_today: 'Recorded today',
      errors_30d: 'Medication errors (30 days)', stock_expiring: 'Supply expiring', sent_home_30d: 'Sent home (30 days)' },
    openMar: 'Open the medication record', board: 'Emergency plans', summary: (d) => `Missouri immunization summary report due ${d} (5 CSR 25-500.192(4)(D)).`,
    allOk: 'Every child\'s health file is up to date.', settings: 'Settings', notifyDose: 'Tell the family about each dose', dcSetting: 'Second-person check',
    dcOpts: { off: 'Off', optional: 'When asked', required: 'Every dose' },
    hqAllowed: 'Futures Friends support may open health records (only with a grant you approve and the family\'s consent)',
    reqVax: 'The center\'s vaccine list (center policy, not a state rule)', doses: 'doses', exPolicy: 'Illness exclusion policy (center policy, not a state rule)',
    hours: 'hours', rule: 'The rule as your policy says it', addRow: 'Add a line', removeRow: 'Remove', settingsSaved: 'Settings saved.',
    famLead: 'Your child\'s immunizations, health plans, medication and health notes from the center.', toSign: (n) => (n === 1 ? '1 medication permission to sign' : `${n} medication permissions to sign`),
    activeMeds: (n) => (n === 1 ? '1 active medication permission' : `${n} active medication permissions`), dosesWeek: (n) => (n === 1 ? '1 dose this week' : `${n} doses this week`),
    sharing: 'Sharing beyond the center', consentStates: { active: 'You allow it', withdrawn: 'Withdrawn', none: 'Not given', pending_verification: 'Waiting for the center', reconsent_needed: 'Needs a new consent', declined: 'Not accepted' },
    manageConsent: 'Privacy and consent', noKids: 'No child is linked to your account yet.', openChild: 'Open the health record',
    staffLead: 'The emergency steps of every health plan, for every staff member.', noPlans: 'No health plan with emergency steps.', healthLink: 'Health records',
    needVaccine: 'Choose the vaccine.', needDate: 'Choose the date.', needName: 'Type the medication name and the dose.', needTime: 'Add at least one time, or tick "as needed".',
    needOriginal: 'Tick that it comes in its original labeled container.', needSteps: 'Write the emergency steps.', needReason: 'Say why.', needAmount: 'Enter the amount per dose.',
    needTitle: 'Name the plan.', needKind: 'Choose the kind.', timeHint: 'Times like 09:00, separated by commas',
    cm: (n) => `${n} cm`, kg: (n) => `${n} kg`,
    transferTitle: 'Your child is moving to another Futures Hub center', transferSend: 'Also send the health records', transferDone: 'The health records go with the transfer.',
  },
  es: {
    title: 'Registros de salud', child: (n) => `Registros de salud: ${n}`, back: 'Volver', save: 'Guardar', saved: 'Guardado.', add: 'Agregar', sending: 'Guardando…',
    none: 'Todavía no hay nada archivado.', verify: 'Marcar como verificado', verified: 'Verificado', unverified: 'Sin verificar', remove: 'Registrado por error',
    removeWhy: '¿Por qué está mal este registro?', inError: 'Registrado por error', open: 'Abrir', noLicense: 'Los registros de salud son parte de la licencia Hub Completo. Pida a Futures Friends que la agregue.',
    sec: { compliance: 'Lo que necesita el expediente', immunizations: 'Vacunas', exemptions: 'Exenciones', assessments: 'Evaluaciones y revisiones de salud',
           plans: 'Planes de salud', meds: 'Medicamentos', illness: 'Registro de enfermedades y lesiones', docs: 'Documentos de salud' },
    items: { immunization_record: 'Registro de vacunas', health_assessment: 'Evaluación de salud o examen médico', history_review: 'Historial médico revisado con la familia',
             center_vaccines: 'La lista de vacunas del centro', plan_review: 'Revisión del plan de salud', screening_vision: 'Revisión de la vista', screening_hearing: 'Revisión del oído',
             screening_dental: 'Revisión dental', screening_physical: 'Próximo examen físico', screening_growth: 'Revisión del crecimiento', immunization_summary_report: 'Informe resumen de vacunas' },
    states: { ok: 'Archivado', exempt: 'Exento', due: 'Pendiente', overdue: 'Vencido', attention: 'Faltan dosis', not_tracked: 'Sin seguimiento' },
    dueOn: (d) => `vence el ${d}`, stateRule: 'Regla estatal', centerPolicy: 'Política del centro (no es una regla estatal)', record: 'Según el registro',
    missing: (v, n, d) => `${v}: ${n} de ${d}`,
    vaccines: { dtap: 'DTaP', polio: 'Polio (IPV)', mmr: 'MMR (sarampión, paperas, rubéola)', hib: 'Hib', hepb: 'Hepatitis B', varicella: 'Varicela', pcv: 'Neumococo (PCV)',
                hepa: 'Hepatitis A', rotavirus: 'Rotavirus', influenza: 'Influenza (gripe)', covid19: 'COVID-19', tdap: 'Tdap', menacwy: 'Meningococo (MenACWY)', other: 'Otra' },
    vaccine: 'Vacuna', dose: 'Número de dosis', givenOn: 'Fecha en que se aplicó', source: 'De dónde viene la fecha', note: 'Nota (opcional)', document: 'Documento (opcional)', noDoc: 'Sin documento',
    sources: { document: 'Cartilla de vacunas (documento)', provider_record: 'Registro del médico o la clínica', family: 'Familia', state_registry: 'Registro estatal de vacunas', import: 'Importación de la lista', transfer: 'Transferido' },
    scope: 'Para', scopes: { immunization: 'Vacunas', health_assessment: 'Evaluación de salud' }, exKind: 'Tipo', exKinds: { medical: 'Médica', religious: 'Religiosa' },
    vaxFor: 'Vacunas (si no marca ninguna, son todas)', signedOn: 'Firmada el', expiresOn: 'Vence el (opcional)',
    aKind: 'Tipo', aKinds: { physical: 'Examen físico o evaluación de salud', vision: 'Revisión de la vista', hearing: 'Revisión del oído', dental: 'Revisión dental',
                            growth: 'Crecimiento (estatura y peso)', history_review: 'Historial médico revisado con la familia' },
    doneOn: 'Fecha', provider: 'Médico, enfermera o evaluador (opcional)', result: 'Resultado', results: { pass: 'Aprobado', refer: 'Referido', incomplete: 'Incompleto', reviewed: 'Revisado' },
    nextDue: 'Próxima fecha (opcional)', height: 'Estatura (cm)', weight: 'Peso (kg)', notes: 'Notas (opcional)',
    pKinds: { allergy: 'Plan de acción para alergias', asthma: 'Plan para el asma', seizure: 'Plan para convulsiones', diabetes: 'Plan para la diabetes', other: 'Otro plan de salud' },
    planTitle: 'Nombre del plan', alert: 'Alerta de cuidado vinculada', noAlert: 'Sin alerta de cuidado', triggers: 'Desencadenantes', warning: 'Señales de alarma',
    steps: 'Pasos de emergencia (todo el personal los ve)', daily: 'Cuidado diario', medOnSite: 'Medicamento de emergencia guardado en el centro', reviewBy: 'Revisar antes del',
    endPlan: 'Terminar este plan', ended: 'Terminado', meal: 'Instrucción de comida', mealStates: { approved: 'Instrucción de comida aprobada', pending: 'Instrucción de comida en espera de la dirección', none: 'Sin instrucción de comida' },
    newPlan: 'Agregar un plan de salud', newImm: 'Agregar una vacuna', newEx: 'Agregar una exención', newAss: 'Agregar una evaluación o revisión',
    medName: 'Nombre del medicamento', medDose: 'Dosis como dice la etiqueta', amount: 'Cantidad por dosis', unit: 'Unidad',
    units: { mL: 'mL', mg: 'mg', tablet: 'tableta', capsule: 'cápsula', puff: 'inhalación', drop: 'gota', spray: 'atomización', application: 'aplicación', unit: 'unidad', other: 'otra' },
    route: 'Cómo se da', routes: { oral: 'Por la boca', inhaled: 'Inhalado', topical: 'En la piel', eye: 'En el ojo', ear: 'En el oído', nasal: 'En la nariz', injection: 'Inyección', other: 'Otra' },
    times: 'Horas del día', asNeeded: 'Cuando sea necesario (no a horas fijas)', asNeededWhen: 'Cuándo se puede dar', minHours: 'Horas entre dosis', maxDay: 'Máximo de dosis al día',
    startOn: 'Primer día', endOn: 'Último día', prescription: 'Con receta', prescriber: 'Médico que la recetó (opcional)', original: 'Viene en su envase original con la etiqueta',
    storage: 'Dónde se guarda', storages: { room_temp: 'A temperatura ambiente', refrigerated: 'En el refrigerador', locked: 'Bajo llave', with_staff: 'Con el personal', other: 'Otro' },
    instructions: 'Instrucciones (opcional)', newMed: 'Pedir un permiso de medicamento',
    statuses: { draft: 'Borrador: complete la dosis y los horarios', awaiting_signature: 'Espera la firma de la familia', active: 'Activo', ended: 'Terminado', expired: 'Pasó su último día' },
    completeDraft: 'Completar este permiso', draftNote: 'Del paquete de inscripción, con las palabras de la familia. Agregue la dosis y los horarios; luego una madre, un padre o un tutor lo lee y lo firma.',
    readSign: 'Leer y firmar', signTitle: 'Permiso para dar un medicamento', typeName: 'Escriba su nombre completo como firma',
    agree: 'Acepto firmar electrónicamente. Mi nombre escrito es mi firma.', sign: 'Firmar', signed: (n, d) => `Firmado por ${n} el ${d}`,
    paper: 'Firmado en papel: archive el escaneo', paperDoc: 'El formulario firmado (documento)', paperName: 'Nombre completo del tutor', endMed: 'Terminar este permiso', endWhy: '¿Por qué?',
    stock: 'Medicamento recibido', addStock: 'Registrar medicamento recibido', quantity: 'Cantidad', expires: 'Vence', location: 'Dónde se guarda (opcional)',
    left: (n, u) => `quedan ${n} ${u}`, expiredStock: 'Vencido', returned: 'Devolver a la familia', disposed: 'Desechado', recent: 'Dosis recientes', fingerprint: 'Huella',
    marTitle: 'Registro de medicamentos', marLead: 'Registre cada dosis en cuanto la dé.', outcomes: { given: 'Dada', refused: 'Rechazada', missed: 'No se dio', held: 'Suspendida' },
    giveNow: 'Dar una dosis ahora', check: 'Revisar esta dosis', awaitingCheck: 'Espera una segunda revisión', checked: (n) => `Revisada por ${n}`,
    slotStates: { upcoming: 'Más tarde', due: 'Toca ahora', overdue: 'Atrasada', recorded: 'Registrada' }, by: (o, n, t) => `${o} por ${n} a las ${t}`,
    error: 'Reportar un error de medicamento', errorPick: 'El reporte de incidente', noIncident: 'No hay reportes de incidente en los últimos 14 días: primero escriba uno en el escritorio de incidentes.',
    errorNote: 'Qué pasó', errorSaved: 'El error quedó registrado y vinculado.', untrained: 'Solo el personal capacitado para administrar medicamentos puede registrarlos (KS K.A.R. 28-4-132(i)).',
    noMeds: 'No toca ningún medicamento este día.', day: 'Día', askCheck: 'Pedir que otra persona capacitada lo revise', prnToday: 'Dado hoy', stockOnFile: 'Archivado',
    illKinds: { illness: 'Enfermedad', injury: 'Lesión' }, newIll: 'Registrar una enfermedad o lesión', observedAt: 'Cuándo', symptoms: 'Síntomas (la política de enfermedad del centro)',
    temp: 'Temperatura (°F, opcional)', tempMethod: 'Cómo se midió', methods: { oral: 'Boca', ear: 'Oído', forehead: 'Frente', armpit: 'Axila', other: 'Otro' },
    sentHome: 'Enviado a casa', illNotes: 'Lo que vio el personal', reported: 'Reportado al departamento de salud',
    reportHint: 'Kansas: una enfermedad de la lista a más tardar el siguiente día hábil (K.A.R. 28-4-127(c)(2)(C)). Misuri: una sospecha de enfermedad reportable al departamento de salud local (5 CSR 25-500.192(1),(2)(B)).',
    exclusion: (d) => `Puede volver a partir del ${d} (política del centro)`, noPolicy: 'Su centro no tiene una regla de exclusión para estos síntomas. No se cita ninguna regla estatal para los periodos de exclusión.',
    returnedOn: 'Volvió el', returnNote: 'Nota para el regreso', addReturn: 'Agregar el regreso al cuidado', incident: 'Reporte de incidente (opcional)', noIncidentOpt: 'Ninguno',
    symptomsList: { fever: 'Fiebre', vomiting: 'Vómito', diarrhea: 'Diarrea', rash: 'Sarpullido', cough: 'Tos', runny_nose: 'Moqueo', sore_throat: 'Dolor de garganta',
                    eye_redness: 'Ojos rojos o con lagañas', ear_pain: 'Dolor de oído', stomach_ache: 'Dolor de estómago', headache: 'Dolor de cabeza', unusually_tired: 'Más cansancio de lo normal' },
    dashTitle: 'Registros de salud: el centro', counts: { children: 'Niños', overdue: 'Vencidos', due: 'Vencen pronto', attention: 'Faltan dosis', unverified: 'Por verificar',
      meds_active: 'Permisos de medicamentos', meds_to_sign: 'Esperan una firma', doses_today: 'Dosis de hoy', doses_recorded_today: 'Registradas hoy',
      errors_30d: 'Errores de medicamento (30 días)', stock_expiring: 'Suministro por vencer', sent_home_30d: 'Enviados a casa (30 días)' },
    openMar: 'Abrir el registro de medicamentos', board: 'Planes de emergencia', summary: (d) => `El informe resumen de vacunas de Misuri vence el ${d} (5 CSR 25-500.192(4)(D)).`,
    allOk: 'El expediente de salud de cada niño está al día.', settings: 'Configuración', notifyDose: 'Avisar a la familia de cada dosis', dcSetting: 'Revisión por una segunda persona',
    dcOpts: { off: 'No', optional: 'Cuando se pida', required: 'Cada dosis' },
    hqAllowed: 'El soporte de Futures Friends puede abrir los registros de salud (solo con un permiso que usted apruebe y el consentimiento de la familia)',
    reqVax: 'La lista de vacunas del centro (política del centro, no es una regla estatal)', doses: 'dosis', exPolicy: 'Política de exclusión por enfermedad (política del centro, no es una regla estatal)',
    hours: 'horas', rule: 'La regla como la dice su política', addRow: 'Agregar una línea', removeRow: 'Quitar', settingsSaved: 'Configuración guardada.',
    famLead: 'Las vacunas, los planes de salud, los medicamentos y las notas de salud del centro sobre su hijo o hija.', toSign: (n) => (n === 1 ? '1 permiso de medicamento por firmar' : `${n} permisos de medicamento por firmar`),
    activeMeds: (n) => (n === 1 ? '1 permiso de medicamento activo' : `${n} permisos de medicamento activos`), dosesWeek: (n) => (n === 1 ? '1 dosis esta semana' : `${n} dosis esta semana`),
    sharing: 'Compartir fuera del centro', consentStates: { active: 'Usted lo permite', withdrawn: 'Retirado', none: 'No dado', pending_verification: 'Espera al centro', reconsent_needed: 'Necesita un nuevo consentimiento', declined: 'No aceptado' },
    manageConsent: 'Privacidad y consentimiento', noKids: 'Todavía no hay un niño o niña en su cuenta.', openChild: 'Abrir el registro de salud',
    staffLead: 'Los pasos de emergencia de cada plan de salud, para todo el personal.', noPlans: 'No hay planes de salud con pasos de emergencia.', healthLink: 'Registros de salud',
    needVaccine: 'Elija la vacuna.', needDate: 'Elija la fecha.', needName: 'Escriba el nombre del medicamento y la dosis.', needTime: 'Agregue al menos una hora, o marque "cuando sea necesario".',
    needOriginal: 'Marque que viene en su envase original con la etiqueta.', needSteps: 'Escriba los pasos de emergencia.', needReason: 'Diga por qué.', needAmount: 'Escriba la cantidad por dosis.',
    needTitle: 'Póngale nombre al plan.', needKind: 'Elija el tipo.', timeHint: 'Horas como 09:00, separadas por comas',
    cm: (n) => `${n} cm`, kg: (n) => `${n} kg`,
    transferTitle: 'Su hijo o hija se cambia a otro centro del Futures Hub', transferSend: 'Enviar también los registros de salud', transferDone: 'Los registros de salud van con la transferencia.',
  },
};
export const L = (lang) => W[lang === 'es' ? 'es' : 'en'];

// "09:00, 1:30 pm, 13:30" -> ['09:00', '13:30'] (24-hour HH:MM; anything else is an error)
export function parseTimes(text) {
  const out = []; const bad = [];
  for (const raw of String(text ?? '').split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean)) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(raw);
    if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) { bad.push(raw); continue; }
    out.push(`${m[1].padStart(2, '0')}:${m[2]}`);
  }
  return { times: [...new Set(out)].sort(), bad };
}

// the medication permission form -> health_med_save's payload, or { error }
export function medArgs(v, lang = 'en') {
  const T = L(lang);
  const name = String(v.med_name ?? '').trim(), dose = String(v.dose ?? '').trim();
  if (!name || !dose) return { error: T.needName };
  const amount = Number(v.dose_amount);
  if (!Number.isFinite(amount) || amount <= 0) return { error: T.needAmount };
  const asNeeded = !!v.as_needed;
  const { times, bad } = parseTimes(v.times);
  if (bad.length || (!asNeeded && !times.length)) return { error: T.needTime };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.start_on || '') || !/^\d{4}-\d{2}-\d{2}$/.test(v.end_on || '') || v.end_on < v.start_on) return { error: T.needDate };
  if (!v.original_container) return { error: T.needOriginal };
  const opt = (x) => (String(x ?? '').trim() === '' ? null : String(x).trim());
  return { payload: { med_name: name, dose, dose_amount: amount, dose_unit: v.dose_unit || 'mL', route: v.route || 'oral', times, as_needed: asNeeded,
    as_needed_when: asNeeded ? opt(v.as_needed_when) : null, min_hours_between: asNeeded ? opt(v.min_hours_between) : null, max_per_day: asNeeded ? opt(v.max_per_day) : null,
    start_on: v.start_on, end_on: v.end_on, prescription: !!v.prescription, prescriber: opt(v.prescriber), original_container: true,
    storage: v.storage || 'room_temp', instructions: opt(v.instructions) } };
}

// one compliance item in words: { label, state, detail }
export function itemText(i, lang = 'en', fmtDay = (d) => d) {
  const T = L(lang);
  const label = T.items[i.item] || i.item;
  const parts = [];
  if (i.due_on && i.state !== 'ok' && i.state !== 'exempt') parts.push(T.dueOn(fmtDay(i.due_on)));
  if (i.basis === 'state_rule') parts.push(`${T.stateRule}: ${i.citation}`);
  else if (i.basis === 'center_policy') parts.push(T.centerPolicy);
  if (Array.isArray(i.missing) && i.missing.length) parts.push(i.missing.map((m) => T.missing(T.vaccines[m.vaccine] || m.vaccine, m.on_file, m.doses)).join(', '));
  return { label, state: T.states[i.state] || i.state, detail: parts.join(' · '), tone: i.state === 'overdue' ? 'bad' : i.state === 'ok' || i.state === 'exempt' ? 'ok' : 'warn' };
}

// MAR: the button set for a slot, and a dose line
export const SLOT_TONE = { upcoming: '', due: 'gold', overdue: 'bad', recorded: 'ok' };
export function canRecordSlot(slot) { return !slot.record; }
