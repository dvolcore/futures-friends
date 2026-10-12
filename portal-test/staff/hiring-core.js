// Hiring (ATS) shared logic: plain ES module, no DOM. Used by the hiring desk and the candidate page (hiring.js), the public feeds
// (hiring-server.mjs), the worker (worker/hiring.mjs) and node --test (tests/hiring-unit.test.mjs). hub/ATS.md.
//
// Strings: English + Spanish. Every Spanish string is a DRAFT pending review by the center's native-speaking Spanish teacher (glossary
// FUTURES_FRIENDS_PROJECT/09_Training_and_Curriculum/bilingual/GLOSSARY_ES.md, "usted"). They live here, not in i18n.js, so this module
// stays independent of the bilingual-everywhere branch; it reuses i18n.js's language rule (pickLocale) when the page passes a language.

export const STAGES = Object.freeze(['applied', 'screening', 'interview', 'offer', 'background', 'hired', 'rejected', 'withdrawn']);
export const OPEN_STAGES = Object.freeze(['applied', 'screening', 'interview', 'offer', 'background']);
export const REJECT_REASONS = Object.freeze(['qualifications', 'experience', 'availability', 'schedule', 'references', 'interview', 'credential_missing',
  'position_filled', 'no_response', 'other']);
export const SOURCES = Object.freeze(['website', 'indeed', 'ziprecruiter', 'linkedin', 'facebook', 'referral', 'walk_in', 'job_fair', 'school', 'agency', 'rehire', 'other']);
export const JOB_ROLES = Object.freeze(['teacher', 'lead_teacher', 'assistant_teacher', 'director', 'assistant_director', 'floater', 'substitute', 'aide', 'cook',
  'driver', 'volunteer', 'other']);
export const EMPLOYMENT = Object.freeze(['full_time', 'part_time', 'substitute', 'seasonal', 'temporary']);

export const STRINGS = Object.freeze({
  en: Object.freeze({
    'hiring.title': 'Hiring', 'hiring.lead': 'Openings, candidates, interviews, offers and the staff you will need.',
    'tab.pipeline': 'Pipeline', 'tab.jobs': 'Openings', 'tab.interviews': 'Interviews', 'tab.pool': 'Talent pool', 'tab.forecast': 'Staffing forecast',
    'tab.credentials': 'Credentials', 'tab.reports': 'Reports', 'tab.privacy': 'Privacy requests', 'tab.settings': 'Settings',
    'stage.applied': 'Applied', 'stage.screening': 'Screening', 'stage.interview': 'Interview', 'stage.offer': 'Offer', 'stage.background': 'Background check',
    'stage.hired': 'Hired', 'stage.rejected': 'Not moving forward', 'stage.withdrawn': 'Withdrawn',
    'reason.qualifications': 'Does not meet the posted qualifications', 'reason.experience': 'Experience', 'reason.availability': 'Availability',
    'reason.schedule': 'Schedule does not fit', 'reason.references': 'References', 'reason.interview': 'Interview performance (scorecard)',
    'reason.credential_missing': 'A required credential is missing', 'reason.position_filled': 'Position filled', 'reason.no_response': 'No response',
    'reason.other': 'Other job-related reason', 'reason.background_check': 'Background check (FCRA notices)', 'reason.candidate_withdrew': 'The candidate withdrew',
    'reason.offer_declined': 'Offer declined',
    'source.website': 'Website', 'source.indeed': 'Indeed', 'source.ziprecruiter': 'ZipRecruiter', 'source.linkedin': 'LinkedIn', 'source.facebook': 'Facebook',
    'source.referral': 'Staff referral', 'source.walk_in': 'Walk-in', 'source.job_fair': 'Job fair', 'source.school': 'School or college', 'source.agency': 'Agency',
    'source.rehire': 'Former staff', 'source.other': 'Other',
    'role.teacher': 'Teacher', 'role.lead_teacher': 'Lead teacher', 'role.assistant_teacher': 'Assistant teacher', 'role.director': 'Director',
    'role.assistant_director': 'Assistant director', 'role.floater': 'Floater', 'role.substitute': 'Substitute', 'role.aide': 'Aide', 'role.cook': 'Cook',
    'role.driver': 'Driver', 'role.volunteer': 'Volunteer', 'role.other': 'Other staff',
    'emp.full_time': 'Full time', 'emp.part_time': 'Part time', 'emp.substitute': 'Substitute', 'emp.seasonal': 'Seasonal', 'emp.temporary': 'Temporary',
    'job.new': 'New opening', 'job.save': 'Save', 'job.publish': 'Publish', 'job.pause': 'Pause', 'job.close': 'Close', 'job.title': 'Job title',
    'job.titleEs': 'Job title in Spanish', 'job.role': 'Role', 'job.employment': 'Employment', 'job.room': 'Classroom it staffs (forecast)', 'job.openings': 'Openings',
    'job.payMin': 'Pay from', 'job.payMax': 'Pay to', 'job.payUnit': 'Per', 'job.hour': 'hour', 'job.year': 'year', 'job.description': 'Description',
    'job.requirements': 'Requirements', 'job.closes': 'Closes on', 'job.screening': 'Screening questions (yes / no)', 'job.knockout': 'Screens out when the answer is',
    'job.none': 'No openings yet.', 'job.addQuestion': 'Add a question', 'job.status.draft': 'Draft', 'job.status.published': 'Published',
    'job.status.paused': 'Paused', 'job.status.closed': 'Closed', 'job.status.filled': 'Filled', 'job.btbNote': 'Ban-the-box is on: criminal history is asked only after a conditional offer.',
    'board.empty': 'No candidates here.', 'board.overdue': 'Past the target time', 'board.days': '{n} d in stage', 'board.move': 'Move to',
    'board.allJobs': 'All openings', 'board.addCandidate': 'Add a candidate', 'board.knockout': 'Screening answer', 'board.duplicate': 'Possible duplicate',
    'board.referral': 'Referral',
    'app.resume': 'Open the resume', 'app.resumeNote': 'Sent with the website application. Treat it as an untrusted file.',
    'app.contact': 'Contact', 'app.source': 'Source', 'app.answers': 'Screening answers', 'app.history': 'History', 'app.interviews': 'Interviews',
    'app.scorecards': 'Scorecards', 'app.offer': 'Offer', 'app.background': 'Background check', 'app.onboarding': 'Onboarding', 'app.messages': 'Messages to the candidate',
    'app.link': 'Copy a candidate link', 'app.linkNote': 'Give this link to the candidate yourself while email is off. It works once per message and for 60 days.',
    'app.reject': 'Not moving forward', 'app.reason': 'Job-related reason', 'app.note': 'Note', 'app.tell': 'Tell the candidate', 'app.hire': 'Hire',
    'app.hireNote': 'Creates the staff invitation. Classroom access waits until the state\'s background checks are recorded.',
    'app.pool': 'Talent pool', 'app.reengage': 'Invite to an opening', 'app.merge': 'Merge with', 'app.otherApps': 'Other applications',
    'iv.add': 'Add interview times', 'iv.interviewer': 'Interviewer', 'iv.minutes': 'Minutes', 'iv.mode': 'How', 'iv.where': 'Where (address, room or video link)',
    'iv.times': 'Times', 'iv.in_person': 'In person', 'iv.phone': 'Phone', 'iv.video': 'Video', 'iv.book': 'Book', 'iv.cancel': 'Cancel interview',
    'iv.none': 'No interviews coming up.', 'iv.open': 'Open times', 'iv.completed': 'Completed', 'iv.no_show': 'No-show',
    'sc.title': 'Scorecard', 'sc.rate': '1 = concern, 2 = mixed, 3 = solid, 4 = strong', 'sc.recommendation': 'Recommendation', 'sc.strong_yes': 'Strong yes',
    'sc.yes': 'Yes', 'sc.no': 'No', 'sc.strong_no': 'Strong no', 'sc.summary': 'Summary', 'sc.saveDraft': 'Save draft', 'sc.submit': 'Submit',
    'sc.hidden': 'Other interviewers\' scorecards appear after you submit your own (independent scoring).',
    'sc.jobOnly': 'Rate what the person did and said about the job. Never note age, family, health, religion, origin or any other protected characteristic.',
    'offer.create': 'Draft an offer', 'offer.pay': 'Pay', 'offer.start': 'Start date', 'offer.expires': 'Open until', 'offer.conditional': 'Conditional on the background check and credentials',
    'offer.send': 'Send to the candidate', 'offer.withdraw': 'Withdraw', 'offer.basic': 'Basic e-signature (typed name, checkbox, time, IP fingerprint, document fingerprint). Not DocuSign or Dropbox Sign.',
    'offer.signedBy': 'Signed by {name} on {at}', 'offer.fingerprint': 'Document fingerprint', 'offer.print': 'Print or save as PDF',
    'bg.start': 'Start the background check', 'bg.authorized': 'Authorized by the candidate', 'bg.waiting': 'Waiting for the candidate\'s authorization',
    'bg.record': 'Record the result', 'bg.in_progress': 'In progress', 'bg.clear': 'Clear', 'bg.consider': 'Consider (needs review)',
    'bg.preAdverse': 'Send the pre-adverse notice', 'bg.final': 'Final decision', 'bg.adverse': 'Adverse action (final notice)', 'bg.clearAfter': 'Cleared after review',
    'bg.assessment': 'Individualized assessment', 'bg.nature': 'Nature and gravity of the offense', 'bg.time': 'Time since the offense or sentence',
    'bg.relevance': 'Why it matters for this job', 'bg.mitigating': 'Anything the candidate told you', 'bg.agency': 'Consumer reporting agency (name, address, phone)',
    'bg.draft': 'DRAFT notices pending counsel review.',
    'fc.title': 'Staffing forecast', 'fc.room': 'Classroom', 'fc.enrolled': 'Enrolled', 'fc.ratio': 'Ratio', 'fc.need': 'FTE needed', 'fc.scheduled': 'Scheduled FTE',
    'fc.open': 'Open requisitions', 'fc.hire': 'To hire', 'fc.atCapacity': 'At full capacity', 'fc.estimate': 'estimate', 'fc.save': 'Save',
    'fc.assumptions': '{hours} hours a day, {days} days a week, coverage x{coverage}, one FTE = {fte} hours.',
    'cred.title': 'Staff credentials', 'cred.add': 'Record a credential', 'cred.issued': 'Issued', 'cred.expires': 'Expires', 'cred.status.ok': 'Current',
    'cred.status.expiring': 'Expires soon', 'cred.status.expired': 'Expired', 'cred.status.missing': 'Not on file yet', 'cred.status.overdue': 'Overdue',
    'cred.status.optional': 'Optional', 'cred.coverage': 'First aid and CPR coverage: {have} of {need} needed',
    'rep.funnel': 'Hiring funnel', 'rep.timeToHire': 'Time to hire', 'rep.median': 'median {n} days', 'rep.bySource': 'Source effectiveness',
    'rep.referrals': 'Referrals', 'rep.offers': 'Offer acceptance', 'rep.eeo': 'Voluntary self-identification (aggregate)', 'rep.suppressed': 'fewer than {n}: hidden',
    'rep.eeoNote': 'No individual answer is ever shown. Groups smaller than {n} people are hidden.', 'rep.applicants': 'Applicants', 'rep.hired': 'Hired',
    'rep.rate': 'Hire rate', 'rep.impact': 'Impact ratio',
    'priv.title': 'Candidate privacy requests', 'priv.delete': 'Delete the candidate\'s details', 'priv.decline': 'Decline (with the reason)', 'priv.hold': 'Put on hold',
    'priv.none': 'No requests.', 'priv.due': 'Answer by {d}',
    'set.careers': 'Show published openings in the public careers feeds', 'set.address': 'Center street address (for job boards)', 'set.city': 'City',
    'set.postal': 'ZIP code', 'set.btb': 'Ban-the-box: criminal history only after a conditional offer', 'set.retention': 'Keep candidate data (months)',
    'set.minCell': 'Smallest group shown in the self-ID report', 'set.sla': 'Target days per stage', 'set.wait': 'FCRA waiting period (business days)',
    'set.esign': 'E-signature', 'set.esignBasic': 'Basic (built in)', 'set.esignVendorOff': 'A vendor (DocuSign / Dropbox Sign) needs the owner\'s account: off',
    'set.save': 'Save settings', 'set.saved': 'Saved.', 'set.feeds': 'Public feeds for the website and job boards',
    'tile.title': 'Hiring', 'tile.open': '{n} open', 'tile.overdue': '{n} waiting too long', 'tile.interviews': '{n} interviews this week',
    'tile.toHire': 'Ratio forecast: hire {n}', 'tile.credentials': '{n} credential alerts', 'tile.go': 'Open hiring',
    'common.save': 'Save', 'common.cancel': 'Cancel', 'common.close': 'Close', 'common.yes': 'Yes', 'common.no': 'No', 'common.loading': 'Loading…',
    'common.saved': 'Saved.', 'common.error': 'Something went wrong. Reload the page and try again.',
    // the candidate page
    'cand.title': 'Your application', 'cand.hello': 'Hello, {name}', 'cand.for': '{job} at {center}', 'cand.status': 'Where it stands: {stage}',
    'cand.invalid': 'This link no longer works. Links expire after 60 days. Ask the center for a new one.',
    'cand.chooseTime': 'Choose your interview time', 'cand.noTimes': 'No times are open right now. The center will add more; check back soon or reply to the email.',
    'cand.booked': 'Your interview: {when}', 'cand.mode.in_person': 'In person', 'cand.mode.phone': 'By phone', 'cand.mode.video': 'By video',
    'cand.addCalendar': 'Add to my calendar (.ics)', 'cand.change': 'Choose a different time', 'cand.cancel': 'Cancel my interview', 'cand.cancelled': 'Your interview is cancelled.',
    'cand.bookedOk': 'Booked. A confirmation is on its way.', 'cand.taken': 'That time was just taken. Please choose another.',
    'cand.offer': 'Your offer letter', 'cand.typeName': 'Type your full name', 'cand.signName': 'Type your full name exactly as: {name}', 'cand.agree': 'I agree to sign electronically. My typed name is my signature.',
    'cand.sign': 'Sign and accept', 'cand.decline': 'Decline the offer', 'cand.signed': 'Signed on {at}. Keep this page: your signed copy stays here.',
    'cand.basic': 'Basic electronic signature: your typed name, the checkbox, the time, a fingerprint of your connection and a fingerprint of this exact letter are recorded.',
    'cand.expired': 'This offer expired. Contact the center if you are still interested.',
    'cand.bg': 'Background check', 'cand.bgAuthorize': 'I authorize the background check', 'cand.bgDecline': 'I do not authorize',
    'cand.bgThanks': 'Thank you. The center will let you know when the result is in.', 'cand.bgRights': 'A Summary of Your Rights Under the Fair Credit Reporting Act',
    'cand.crim': 'Criminal history (asked only now, after your conditional offer)', 'cand.crimQ': 'Have you been convicted of a crime that your state\'s child care rules ask about?',
    'cand.crimExplain': 'Anything you want the center to know (what happened, when, what has changed since)', 'cand.crimNote': 'A record does not automatically mean no. The center looks at what it was, how long ago, and whether it matters for this job, and you can respond before any decision.',
    'cand.eeo': 'Voluntary self-identification', 'cand.eeoNote': 'Optional. Your answers are kept apart from your application and are never shown to the people who decide on hiring. They are used only in totals, to check that hiring is fair.',
    'cand.gender': 'Gender', 'cand.race': 'Race / ethnicity', 'cand.veteran': 'Veteran status', 'cand.disability': 'Disability', 'cand.decline': 'I prefer not to answer',
    'cand.eeoSaved': 'Thank you. Saved.', 'cand.eeoDone': 'You already answered. You can change your answers.',
    'g.female': 'Female', 'g.male': 'Male', 'g.nonbinary': 'Non-binary', 'r.hispanic_latino': 'Hispanic or Latino', 'r.white': 'White', 'r.black': 'Black or African American',
    'r.asian': 'Asian', 'r.native_hawaiian_pacific': 'Native Hawaiian or Pacific Islander', 'r.american_indian_alaska': 'American Indian or Alaska Native',
    'r.two_or_more': 'Two or more races', 'v.protected_veteran': 'Protected veteran', 'v.not_veteran': 'Not a protected veteran', 'd.yes': 'Yes, I have a disability (or had one)',
    'd.no': 'No, I do not have a disability',
    'cand.privacy': 'Your information', 'cand.download': 'See and download my information', 'cand.deleteReq': 'Ask the center to delete my information',
    'cand.deleteSent': 'Your request was sent. The center answers by {d}.', 'cand.withdraw': 'Withdraw my application', 'cand.withdrawn': 'Your application is withdrawn.',
    'cand.interested': 'Yes, I am interested', 'cand.interestedOk': 'Thank you. The center will contact you.', 'cand.retention': 'The center keeps application information for a limited time, then deletes it.',
    'cand.closed': 'This application is closed.',
  }),
  es: Object.freeze({
    'hiring.title': 'Contratación', 'hiring.lead': 'Vacantes, candidatos, entrevistas, ofertas y el personal que necesitará.',
    'tab.pipeline': 'Proceso', 'tab.jobs': 'Vacantes', 'tab.interviews': 'Entrevistas', 'tab.pool': 'Banco de talento', 'tab.forecast': 'Pronóstico de personal',
    'tab.credentials': 'Credenciales', 'tab.reports': 'Informes', 'tab.privacy': 'Solicitudes de privacidad', 'tab.settings': 'Configuración',
    'stage.applied': 'Solicitud recibida', 'stage.screening': 'Revisión', 'stage.interview': 'Entrevista', 'stage.offer': 'Oferta', 'stage.background': 'Verificación de antecedentes',
    'stage.hired': 'Contratado/a', 'stage.rejected': 'No continúa', 'stage.withdrawn': 'Retirada',
    'reason.qualifications': 'No cumple los requisitos publicados', 'reason.experience': 'Experiencia', 'reason.availability': 'Disponibilidad',
    'reason.schedule': 'El horario no coincide', 'reason.references': 'Referencias', 'reason.interview': 'Resultado de la entrevista (evaluación)',
    'reason.credential_missing': 'Falta una credencial requerida', 'reason.position_filled': 'Puesto cubierto', 'reason.no_response': 'Sin respuesta',
    'reason.other': 'Otra razón relacionada con el trabajo', 'reason.background_check': 'Verificación de antecedentes (avisos FCRA)', 'reason.candidate_withdrew': 'La persona se retiró',
    'reason.offer_declined': 'Oferta rechazada',
    'source.website': 'Sitio web', 'source.indeed': 'Indeed', 'source.ziprecruiter': 'ZipRecruiter', 'source.linkedin': 'LinkedIn', 'source.facebook': 'Facebook',
    'source.referral': 'Recomendación del personal', 'source.walk_in': 'Vino en persona', 'source.job_fair': 'Feria de empleo', 'source.school': 'Escuela o universidad',
    'source.agency': 'Agencia', 'source.rehire': 'Personal anterior', 'source.other': 'Otro',
    'role.teacher': 'Maestro/a', 'role.lead_teacher': 'Maestro/a principal', 'role.assistant_teacher': 'Maestro/a asistente', 'role.director': 'Director/a',
    'role.assistant_director': 'Subdirector/a', 'role.floater': 'Maestro/a de apoyo', 'role.substitute': 'Suplente', 'role.aide': 'Auxiliar', 'role.cook': 'Cocinero/a',
    'role.driver': 'Conductor/a', 'role.volunteer': 'Voluntario/a', 'role.other': 'Otro personal',
    'emp.full_time': 'Tiempo completo', 'emp.part_time': 'Medio tiempo', 'emp.substitute': 'Suplente', 'emp.seasonal': 'Temporada', 'emp.temporary': 'Temporal',
    'job.new': 'Nueva vacante', 'job.save': 'Guardar', 'job.publish': 'Publicar', 'job.pause': 'Pausar', 'job.close': 'Cerrar', 'job.title': 'Título del puesto',
    'job.titleEs': 'Título en español', 'job.role': 'Puesto', 'job.employment': 'Jornada', 'job.room': 'Salón que cubre (pronóstico)', 'job.openings': 'Vacantes',
    'job.payMin': 'Pago desde', 'job.payMax': 'Pago hasta', 'job.payUnit': 'Por', 'job.hour': 'hora', 'job.year': 'año', 'job.description': 'Descripción',
    'job.requirements': 'Requisitos', 'job.closes': 'Cierra el', 'job.screening': 'Preguntas de selección (sí / no)', 'job.knockout': 'Descarta cuando la respuesta es',
    'job.none': 'Todavía no hay vacantes.', 'job.addQuestion': 'Agregar una pregunta', 'job.status.draft': 'Borrador', 'job.status.published': 'Publicada',
    'job.status.paused': 'En pausa', 'job.status.closed': 'Cerrada', 'job.status.filled': 'Cubierta', 'job.btbNote': '"Ban the box" activo: los antecedentes penales se preguntan solo después de una oferta condicional.',
    'board.empty': 'No hay candidatos aquí.', 'board.overdue': 'Pasó el tiempo objetivo', 'board.days': '{n} d en esta etapa', 'board.move': 'Mover a',
    'board.allJobs': 'Todas las vacantes', 'board.addCandidate': 'Agregar un candidato', 'board.knockout': 'Respuesta de selección', 'board.duplicate': 'Posible duplicado',
    'board.referral': 'Recomendación',
    'app.resume': 'Abrir el currículum', 'app.resumeNote': 'Enviado con la solicitud del sitio web. Trátelo como un archivo no confiable.',
    'app.contact': 'Contacto', 'app.source': 'Origen', 'app.answers': 'Respuestas de selección', 'app.history': 'Historial', 'app.interviews': 'Entrevistas',
    'app.scorecards': 'Evaluaciones', 'app.offer': 'Oferta', 'app.background': 'Verificación de antecedentes', 'app.onboarding': 'Incorporación', 'app.messages': 'Mensajes al candidato',
    'app.link': 'Copiar un enlace para el candidato', 'app.linkNote': 'Entregue usted este enlace mientras el correo está apagado. Sirve por 60 días.',
    'app.reject': 'No continúa', 'app.reason': 'Razón relacionada con el trabajo', 'app.note': 'Nota', 'app.tell': 'Avisar al candidato', 'app.hire': 'Contratar',
    'app.hireNote': 'Crea la invitación de personal. El acceso al salón espera a que se registren las verificaciones de antecedentes del estado.',
    'app.pool': 'Banco de talento', 'app.reengage': 'Invitar a una vacante', 'app.merge': 'Unir con', 'app.otherApps': 'Otras solicitudes',
    'iv.add': 'Agregar horarios de entrevista', 'iv.interviewer': 'Entrevistador/a', 'iv.minutes': 'Minutos', 'iv.mode': 'Modalidad', 'iv.where': 'Dónde (dirección, salón o enlace de video)',
    'iv.times': 'Horarios', 'iv.in_person': 'En persona', 'iv.phone': 'Teléfono', 'iv.video': 'Video', 'iv.book': 'Reservar', 'iv.cancel': 'Cancelar entrevista',
    'iv.none': 'No hay entrevistas próximas.', 'iv.open': 'Horarios libres', 'iv.completed': 'Realizada', 'iv.no_show': 'No se presentó',
    'sc.title': 'Evaluación', 'sc.rate': '1 = preocupación, 2 = mixto, 3 = sólido, 4 = fuerte', 'sc.recommendation': 'Recomendación', 'sc.strong_yes': 'Sí, sin duda',
    'sc.yes': 'Sí', 'sc.no': 'No', 'sc.strong_no': 'Definitivamente no', 'sc.summary': 'Resumen', 'sc.saveDraft': 'Guardar borrador', 'sc.submit': 'Enviar',
    'sc.hidden': 'Las evaluaciones de otras personas aparecen después de enviar la suya (evaluación independiente).',
    'sc.jobOnly': 'Evalúe lo que la persona hizo y dijo sobre el trabajo. Nunca anote edad, familia, salud, religión, origen ni otra característica protegida.',
    'offer.create': 'Preparar una oferta', 'offer.pay': 'Pago', 'offer.start': 'Fecha de inicio', 'offer.expires': 'Abierta hasta', 'offer.conditional': 'Condicionada a la verificación de antecedentes y credenciales',
    'offer.send': 'Enviar al candidato', 'offer.withdraw': 'Retirar', 'offer.basic': 'Firma electrónica básica (nombre escrito, casilla, hora, huella de IP, huella del documento). No es DocuSign ni Dropbox Sign.',
    'offer.signedBy': 'Firmada por {name} el {at}', 'offer.fingerprint': 'Huella del documento', 'offer.print': 'Imprimir o guardar como PDF',
    'bg.start': 'Iniciar la verificación de antecedentes', 'bg.authorized': 'Autorizada por el candidato', 'bg.waiting': 'Esperando la autorización del candidato',
    'bg.record': 'Registrar el resultado', 'bg.in_progress': 'En proceso', 'bg.clear': 'Aprobada', 'bg.consider': 'A considerar (requiere revisión)',
    'bg.preAdverse': 'Enviar el aviso previo a una acción adversa', 'bg.final': 'Decisión final', 'bg.adverse': 'Acción adversa (aviso final)', 'bg.clearAfter': 'Aprobada después de revisar',
    'bg.assessment': 'Evaluación individual', 'bg.nature': 'Naturaleza y gravedad del delito', 'bg.time': 'Tiempo desde el delito o la sentencia',
    'bg.relevance': 'Por qué importa para este puesto', 'bg.mitigating': 'Lo que el candidato le comunicó', 'bg.agency': 'Agencia de informes (nombre, dirección, teléfono)',
    'bg.draft': 'Avisos en BORRADOR pendientes de revisión legal.',
    'fc.title': 'Pronóstico de personal', 'fc.room': 'Salón', 'fc.enrolled': 'Inscritos', 'fc.ratio': 'Proporción', 'fc.need': 'Puestos (FTE) necesarios', 'fc.scheduled': 'FTE programados',
    'fc.open': 'Vacantes abiertas', 'fc.hire': 'Por contratar', 'fc.atCapacity': 'Con cupo completo', 'fc.estimate': 'estimado', 'fc.save': 'Guardar',
    'fc.assumptions': '{hours} horas al día, {days} días a la semana, cobertura x{coverage}, un FTE = {fte} horas.',
    'cred.title': 'Credenciales del personal', 'cred.add': 'Registrar una credencial', 'cred.issued': 'Emitida', 'cred.expires': 'Vence', 'cred.status.ok': 'Vigente',
    'cred.status.expiring': 'Vence pronto', 'cred.status.expired': 'Vencida', 'cred.status.missing': 'Aún no registrada', 'cred.status.overdue': 'Atrasada',
    'cred.status.optional': 'Opcional', 'cred.coverage': 'Cobertura de primeros auxilios y RCP: {have} de {need} necesarios',
    'rep.funnel': 'Embudo de contratación', 'rep.timeToHire': 'Tiempo para contratar', 'rep.median': 'mediana {n} días', 'rep.bySource': 'Eficacia por origen',
    'rep.referrals': 'Recomendaciones', 'rep.offers': 'Aceptación de ofertas', 'rep.eeo': 'Autoidentificación voluntaria (totales)', 'rep.suppressed': 'menos de {n}: oculto',
    'rep.eeoNote': 'Nunca se muestra una respuesta individual. Los grupos de menos de {n} personas se ocultan.', 'rep.applicants': 'Solicitantes', 'rep.hired': 'Contratados',
    'rep.rate': 'Tasa de contratación', 'rep.impact': 'Razón de impacto',
    'priv.title': 'Solicitudes de privacidad de candidatos', 'priv.delete': 'Borrar los datos del candidato', 'priv.decline': 'Rechazar (con la razón)', 'priv.hold': 'Poner en espera',
    'priv.none': 'No hay solicitudes.', 'priv.due': 'Responder a más tardar el {d}',
    'set.careers': 'Mostrar las vacantes publicadas en las fuentes públicas de empleo', 'set.address': 'Dirección del centro (para los portales de empleo)', 'set.city': 'Ciudad',
    'set.postal': 'Código postal', 'set.btb': '"Ban the box": antecedentes penales solo después de una oferta condicional', 'set.retention': 'Conservar datos de candidatos (meses)',
    'set.minCell': 'Grupo más pequeño que se muestra en el informe', 'set.sla': 'Días objetivo por etapa', 'set.wait': 'Período de espera FCRA (días hábiles)',
    'set.esign': 'Firma electrónica', 'set.esignBasic': 'Básica (incluida)', 'set.esignVendorOff': 'Un proveedor (DocuSign / Dropbox Sign) necesita la cuenta del dueño: apagado',
    'set.save': 'Guardar configuración', 'set.saved': 'Guardado.', 'set.feeds': 'Fuentes públicas para el sitio web y los portales de empleo',
    'tile.title': 'Contratación', 'tile.open': '{n} abiertas', 'tile.overdue': '{n} esperan demasiado', 'tile.interviews': '{n} entrevistas esta semana',
    'tile.toHire': 'Pronóstico por proporción: contratar {n}', 'tile.credentials': '{n} alertas de credenciales', 'tile.go': 'Abrir contratación',
    'common.save': 'Guardar', 'common.cancel': 'Cancelar', 'common.close': 'Cerrar', 'common.yes': 'Sí', 'common.no': 'No', 'common.loading': 'Cargando…',
    'common.saved': 'Guardado.', 'common.error': 'Algo salió mal. Vuelva a cargar la página e inténtelo de nuevo.',
    'cand.title': 'Su solicitud', 'cand.hello': 'Hola, {name}', 'cand.for': '{job} en {center}', 'cand.status': 'Estado: {stage}',
    'cand.invalid': 'Este enlace ya no funciona. Los enlaces vencen a los 60 días. Pida uno nuevo al centro.',
    'cand.chooseTime': 'Elija la hora de su entrevista', 'cand.noTimes': 'No hay horarios libres ahora. El centro agregará más; vuelva pronto o responda al correo.',
    'cand.booked': 'Su entrevista: {when}', 'cand.mode.in_person': 'En persona', 'cand.mode.phone': 'Por teléfono', 'cand.mode.video': 'Por video',
    'cand.addCalendar': 'Agregar a mi calendario (.ics)', 'cand.change': 'Elegir otra hora', 'cand.cancel': 'Cancelar mi entrevista', 'cand.cancelled': 'Su entrevista está cancelada.',
    'cand.bookedOk': 'Reservada. Le enviamos una confirmación.', 'cand.taken': 'Esa hora se acaba de ocupar. Elija otra, por favor.',
    'cand.offer': 'Su carta de oferta', 'cand.typeName': 'Escriba su nombre completo', 'cand.signName': 'Escriba su nombre completo exactamente así: {name}', 'cand.agree': 'Acepto firmar electrónicamente. Mi nombre escrito es mi firma.',
    'cand.sign': 'Firmar y aceptar', 'cand.decline': 'Rechazar la oferta', 'cand.signed': 'Firmada el {at}. Guarde esta página: su copia firmada queda aquí.',
    'cand.basic': 'Firma electrónica básica: se registran su nombre escrito, la casilla, la hora, una huella de su conexión y una huella de esta carta exacta.',
    'cand.expired': 'Esta oferta venció. Comuníquese con el centro si todavía le interesa.',
    'cand.bg': 'Verificación de antecedentes', 'cand.bgAuthorize': 'Autorizo la verificación de antecedentes', 'cand.bgDecline': 'No la autorizo',
    'cand.bgThanks': 'Gracias. El centro le avisará cuando tenga el resultado.', 'cand.bgRights': 'Resumen de sus derechos según la Ley de Informes Justos de Crédito',
    'cand.crim': 'Antecedentes penales (se preguntan solo ahora, después de su oferta condicional)', 'cand.crimQ': '¿Ha sido condenado/a por un delito que las normas de cuidado infantil de su estado preguntan?',
    'cand.crimExplain': 'Lo que quiera que el centro sepa (qué pasó, cuándo, qué ha cambiado desde entonces)', 'cand.crimNote': 'Un antecedente no significa automáticamente que no. El centro considera qué fue, hace cuánto tiempo y si importa para este puesto, y usted puede responder antes de cualquier decisión.',
    'cand.eeo': 'Autoidentificación voluntaria', 'cand.eeoNote': 'Opcional. Sus respuestas se guardan aparte de su solicitud y nunca las ven las personas que deciden la contratación. Solo se usan en totales, para comprobar que la contratación sea justa.',
    'cand.gender': 'Género', 'cand.race': 'Raza / etnia', 'cand.veteran': 'Condición de veterano', 'cand.disability': 'Discapacidad', 'cand.decline': 'Prefiero no responder',
    'cand.eeoSaved': 'Gracias. Guardado.', 'cand.eeoDone': 'Ya respondió. Puede cambiar sus respuestas.',
    'g.female': 'Femenino', 'g.male': 'Masculino', 'g.nonbinary': 'No binario', 'r.hispanic_latino': 'Hispano o latino', 'r.white': 'Blanco', 'r.black': 'Negro o afroamericano',
    'r.asian': 'Asiático', 'r.native_hawaiian_pacific': 'Nativo de Hawái u otra isla del Pacífico', 'r.american_indian_alaska': 'Indígena americano o nativo de Alaska',
    'r.two_or_more': 'Dos o más razas', 'v.protected_veteran': 'Veterano protegido', 'v.not_veteran': 'No soy veterano protegido', 'd.yes': 'Sí, tengo (o tuve) una discapacidad',
    'd.no': 'No tengo una discapacidad',
    'cand.privacy': 'Su información', 'cand.download': 'Ver y descargar mi información', 'cand.deleteReq': 'Pedir al centro que borre mi información',
    'cand.deleteSent': 'Su solicitud fue enviada. El centro responderá a más tardar el {d}.', 'cand.withdraw': 'Retirar mi solicitud', 'cand.withdrawn': 'Su solicitud fue retirada.',
    'cand.interested': 'Sí, me interesa', 'cand.interestedOk': 'Gracias. El centro se comunicará con usted.', 'cand.retention': 'El centro guarda la información de las solicitudes por un tiempo limitado y después la borra.',
    'cand.closed': 'Esta solicitud está cerrada.',
  }),
});

export function t(key, vars = {}, lang = 'en') {
  const table = STRINGS[lang] || STRINGS.en;
  const s = table[key] ?? STRINGS.en[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`));
}

// ---- stage SLA -------------------------------------------------------------------------------------------------------------
export function slaState(stage, stageAt, slaDays = {}, now = Date.now()) {
  if (!OPEN_STAGES.includes(stage)) return { due: null, overdue: false, daysLeft: null };
  const days = Number(slaDays[stage] ?? 7);
  const due = new Date(new Date(stageAt).getTime() + days * 86400000);
  return { due, overdue: due.getTime() < now, daysLeft: Math.ceil((due.getTime() - now) / 86400000) };
}

// ---- iCalendar (RFC 5545): one VEVENT, CRLF lines folded at 75 octets ------------------------------------------------------
const icsText = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const icsDate = (d) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
function fold(line) {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out = []; let cur = ''; let n = 0;
  for (const ch of line) {
    const b = new TextEncoder().encode(ch).length;
    if (n + b > (out.length ? 74 : 75)) { out.push(cur); cur = ''; n = 0; }
    cur += ch; n += b;
  }
  out.push(cur);
  return out.join('\r\n ');
}
// ev: {uid, sequence, method: REQUEST|CANCEL, start, minutes, summary, location, description, organizer, status}
export function buildIcs(ev, { now = new Date() } = {}) {
  if (!ev || !ev.uid || !ev.start) throw new Error('an event needs a uid and a start');
  const start = new Date(ev.start);
  const end = new Date(start.getTime() + Number(ev.minutes || 30) * 60000);
  const method = ev.method === 'CANCEL' ? 'CANCEL' : 'REQUEST';
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Futures Friends//Futures Hub hiring//EN', 'CALSCALE:GREGORIAN', `METHOD:${method}`,
    'BEGIN:VEVENT', `UID:${icsText(ev.uid)}`, `SEQUENCE:${Number(ev.sequence || 0)}`, `DTSTAMP:${icsDate(now)}`, `DTSTART:${icsDate(start)}`, `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsText(ev.summary)}`, ...(ev.location ? [`LOCATION:${icsText(ev.location)}`] : []), ...(ev.description ? [`DESCRIPTION:${icsText(ev.description)}`] : []),
    `STATUS:${method === 'CANCEL' ? 'CANCELLED' : 'CONFIRMED'}`, 'TRANSP:OPAQUE',
    ...(method === 'REQUEST' ? ['BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Interview', 'TRIGGER:-PT1H', 'END:VALARM'] : []),
    'END:VEVENT', 'END:VCALENDAR'];
  return `${lines.map(fold).join('\r\n')}\r\n`;
}

// ---- public feeds ----------------------------------------------------------------------------------------------------------
const GOOGLE_EMPLOYMENT = { full_time: 'FULL_TIME', part_time: 'PART_TIME', substitute: 'PER_DIEM', seasonal: 'TEMPORARY', temporary: 'TEMPORARY' };
const INDEED_JOBTYPE = { full_time: 'fulltime', part_time: 'parttime', substitute: 'temporary', seasonal: 'temporary', temporary: 'temporary' };
const escHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const paras = (s) => String(s ?? '').trim().split(/\n\s*\n/).filter(Boolean).map((p) => `<p>${escHtml(p).replace(/\n/g, '<br>')}</p>`).join('');

// where the "Apply" button of a posting goes: CAREERS_APPLY_URL with {id} and {slug}, else <site>/jobs.html?job=<id>&loc=<slug>
export function applyUrl(job, { template = '', site = 'https://futuresfriends.example' } = {}) {
  const id = encodeURIComponent(job.id); const slug = encodeURIComponent(job.center?.slug ?? '');
  if (template && /^https:\/\//.test(template)) return template.replace(/\{id\}/g, id).replace(/\{slug\}/g, slug);
  return `${String(site).replace(/\/+$/, '')}/jobs.html?job=${id}&loc=${slug}`;
}

// schema.org JobPosting for Google for Jobs (https://developers.google.com/search/docs/appearance/structured-data/job-posting)
export function jobPostingJsonLd(job, opts = {}) {
  const lang = opts.lang === 'es' ? 'es' : 'en';
  const title = (lang === 'es' && job.title_es) || job.title;
  const description = paras((lang === 'es' && job.description_es) || job.description) + ((lang === 'es' && job.requirements_es) || job.requirements
    ? `<p><strong>${lang === 'es' ? 'Requisitos' : 'Requirements'}</strong></p>${paras((lang === 'es' && job.requirements_es) || job.requirements)}` : '');
  const c = job.center || {};
  const out = {
    '@context': 'https://schema.org/', '@type': 'JobPosting', title, description: description || `<p>${escHtml(title)}</p>`,
    identifier: { '@type': 'PropertyValue', name: c.name, value: job.id },
    datePosted: job.posted_on, employmentType: GOOGLE_EMPLOYMENT[job.employment_type] || 'OTHER',
    hiringOrganization: { '@type': 'Organization', name: c.name, ...(opts.orgUrl ? { sameAs: opts.orgUrl } : {}) },
    jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', ...(c.street ? { streetAddress: c.street } : {}), ...(c.city ? { addressLocality: c.city } : {}),
      ...(c.state ? { addressRegion: c.state } : {}), ...(c.postal_code ? { postalCode: c.postal_code } : {}), addressCountry: c.country || 'US' } },
    directApply: false, url: applyUrl(job, opts), inLanguage: lang,
  };
  if (job.closes_on) out.validThrough = `${job.closes_on}T23:59:59`;
  if (job.pay_min != null || job.pay_max != null) {
    const unit = job.pay_unit === 'year' ? 'YEAR' : 'HOUR';
    out.baseSalary = { '@type': 'MonetaryAmount', currency: 'USD', value: { '@type': 'QuantitativeValue', unitText: unit,
      ...(job.pay_min != null && job.pay_max != null && Number(job.pay_min) !== Number(job.pay_max) ? { minValue: Number(job.pay_min), maxValue: Number(job.pay_max) }
        : { value: Number(job.pay_min ?? job.pay_max) }) } };
  }
  return out;
}

// what Google's required / recommended fields are missing (shown to the director; a posting with a gap still validates as JSON-LD)
export function jobPostingWarnings(ld) {
  const w = [];
  if (!ld.title) w.push('title');
  if (!ld.description) w.push('description');
  if (!ld.datePosted) w.push('datePosted');
  if (!ld.hiringOrganization?.name) w.push('hiringOrganization.name');
  const a = ld.jobLocation?.address || {};
  for (const k of ['streetAddress', 'addressLocality', 'addressRegion', 'postalCode']) if (!a[k]) w.push(`jobLocation.address.${k}`);
  if (!ld.validThrough) w.push('validThrough (recommended)');
  if (!ld.baseSalary) w.push('baseSalary (recommended)');
  return w;
}

const cdata = (s) => `<![CDATA[${String(s ?? '').replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;
const xmlText = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
const money = (n) => `$${Number(n).toFixed(2).replace(/\.00$/, '')}`;
export function salaryText(job) {
  if (job.pay_min == null && job.pay_max == null) return '';
  const per = job.pay_unit === 'year' ? 'per year' : 'per hour';
  if (job.pay_min != null && job.pay_max != null && Number(job.pay_min) !== Number(job.pay_max)) return `${money(job.pay_min)} - ${money(job.pay_max)} ${per}`;
  return `${money(job.pay_min ?? job.pay_max)} ${per}`;
}
// The XML job feed format Indeed's organic feed and ZipRecruiter both read (<source><job>...). Posting it needs the owner's employer
// accounts (hub/ATS.md "Job boards"); this only builds the file.
export function jobsXml(jobs, { publisher = 'Futures Friends', publisherUrl = 'https://futuresfriends.example', now = new Date(), ...opts } = {}) {
  const rows = jobs.map((j) => {
    const c = j.center || {};
    return ['<job>', `<title>${cdata(j.title)}</title>`, `<date>${cdata(new Date(`${j.posted_on || now.toISOString().slice(0, 10)}T12:00:00Z`).toUTCString())}</date>`,
      `<referencenumber>${cdata(j.id)}</referencenumber>`, `<requisitionid>${cdata(j.id)}</requisitionid>`, `<url>${cdata(applyUrl(j, opts))}</url>`,
      `<company>${cdata(c.name)}</company>`, `<sourcename>${cdata(c.name)}</sourcename>`, `<city>${cdata(c.city)}</city>`, `<state>${cdata(c.state)}</state>`,
      `<country>${cdata(c.country || 'US')}</country>`, `<postalcode>${cdata(c.postal_code)}</postalcode>`, `<streetaddress>${cdata(c.street)}</streetaddress>`,
      `<description>${cdata(paras(j.description) + (j.requirements ? `<p><strong>Requirements</strong></p>${paras(j.requirements)}` : ''))}</description>`,
      `<salary>${cdata(salaryText(j))}</salary>`, `<jobtype>${cdata(INDEED_JOBTYPE[j.employment_type] || 'fulltime')}</jobtype>`, `<category>${cdata('Child Care')}</category>`,
      ...(j.closes_on ? [`<expirationdate>${cdata(j.closes_on)}</expirationdate>`] : []), '</job>'].join('');
  });
  return `<?xml version="1.0" encoding="utf-8"?>\n<source><publisher>${xmlText(publisher)}</publisher><publisherurl>${xmlText(publisherUrl)}</publisherurl>`
    + `<lastBuildDate>${xmlText(now.toUTCString())}</lastBuildDate>${rows.join('')}</source>\n`;
}

// ---- the worker's email: {{link}} filled from the outbox row's link_path ---------------------------------------------------
export function outboxEmail(row, hubUrl) {
  const link = row.link_path ? `${String(hubUrl || '').replace(/\/+$/, '')}${row.link_path}` : '';
  const text = String(row.body ?? '').replace(/\{\{link\}\}/g, link).replace(/\n{3,}/g, '\n\n');
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#0A2B38">${paras(text).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>')}</div>`;
  return { subject: row.subject, text, html };
}
