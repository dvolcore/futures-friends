// Family-facing strings for the Futures Hub pages (hub/web), English + Spanish (owner decision 2026-10-07).
// Every Spanish string here is a DRAFT pending review by the center's native-speaking Spanish teacher
// (glossary: FUTURES_FRIENDS_PROJECT/09_Training_and_Curriculum/bilingual/GLOSSARY_ES.md). Register: "usted" (account and sign-in
// screens are formal notices, and the account emails use "usted" too); names (Futures Hub, Futures Friends) are never translated.
// Since 2026-10-10 (owner: "bilingual across the board") every role reads the hub in their own language: staff and director views
// render their English source text and the shared catalog (./i18n-es.js, loaded only when Spanish is on) turns it into Spanish on
// screen; family views use the keyed tables below and in each module, with the catalog as the safety net. See hub/I18N_COVERAGE.md.
//
// The one place for: the person's UI language (uiLang / setUiLang), t(key, vars, lang), plural forms (plural / tp), and dates,
// times, numbers and money through Intl for en-US / es-US (fmtDate, fmtTime, fmtNumber, fmtMoney). Per-module tables (W = { en, es })
// stay next to their views (moving them would collide with parallel work) and read through dict(table, lang), which falls back to
// English per key, so a missing Spanish key shows English text rather than a raw key or "undefined".
//
// Language: a signed-in person's saved choice (family_profiles.preferred_language via my_preferred_language()) wins; signed out,
// the choice is kept in localStorage ('ff-hub-lang'); otherwise English. Plain ES module: the page imports it and node --test does too.

export const LANGUAGES = Object.freeze(['en', 'es']);
export const DEFAULT_LANGUAGE = 'en';
export const STORAGE_KEY = 'ff-hub-lang';

export const STRINGS = Object.freeze({
  en: Object.freeze({
    'lang.switch': 'Español',
    'lang.switchLabel': 'Ver esta página en español',
    'lang.flipEs': 'Ver en español',
    'lang.flipEn': 'See in English',
    'lang.staffTitle': 'Language for your screens',
    'lang.staffHint': 'Only your own screens. Each family still gets reports, messages and emails in the language they chose.',
    'lang.saved': 'Language saved: English.',
    'lang.draft': '',
    'nav.start': 'Start your center',
    'nav.signOut': 'Sign out',
    'nav.signedOut': 'Signed out.',
    'title.app': 'Futures Hub',
    'common.goHub': 'Go to the Futures Hub',
    'common.hubHome': 'Futures Hub home',
    'common.startAgain': 'Start again',
    'common.reload': 'Reload',
    'common.open': 'Open',
    'common.or': 'or',
    'common.sending': 'Sending…',
    'err.title': 'Something went wrong',
    'err.locked': 'Too many attempts. For your security this account is locked for a few minutes. Try again later, or reset your password.',
    'err.rate': 'Too many requests just now. Please wait a minute and try again.',
    'nav.account': 'Your account',
    'signin.forgot': 'Forgot your password?',
    'signin.forgotEmailFirst': 'Enter your email first, then choose "Forgot your password?".',
    'signin.sending': 'Sending…',
    'signin.forgotSent': 'If {email} has an account, an email with a link to choose a new password is on its way.',
    'err.access': 'This account cannot do that at this center. Ask your director for access.',
    'err.login': 'That email and password do not match. Check them and try again, or ask for a sign-in link.',
    'err.network': 'The Futures Hub could not be reached. Check your connection and try again.',
    'err.config': 'The Futures Hub is not set up on this server yet. Let your administrator know.',
    'notfound.title': 'Page not found',
    'notfound.body': 'Nothing lives at this address. Check the link, or go back to the Futures Hub home page.',
    'home.yourCenters': 'Your centers',
    'home.noCenter': 'This account is not part of any center yet. If you just started a center, it opens within a minute of your first sign-in: reload this page.',
    'home.heroTitle': "Your center's private space for daily care, families and training",
    'home.heroLead': 'Each child care and church program in the Futures Hub gets its own space. Nobody sees anything in it unless you invite them.',
    'home.haveCenter': 'Already have a center?',
    'home.haveCenterBody': "Sign in on your center's own page. Your director can tell you its address.",
    'home.address': "Your center's address",
    'home.goSignin': 'Go to sign-in',
    'home.addressBad': "Enter your center's address, for example sunrise-kids.",
    'home.how': 'How it works',
    'home.how1': '<b>Start your center.</b> Tell us your program\'s name, kind and state.',
    'home.how2': '<b>Confirm by email.</b> Your center\'s private space opens when you sign in with the link.',
    'home.how3': '<b>Get started.</b> Add your rooms, then invite staff and families.',
    'link.checking': 'Checking your link…',
    'link.signingIn': 'Signing in',
    'link.expiredTitle': 'This link no longer works',
    'link.expiredBody': "Links work once and expire after a short time. A new one is sent automatically the next day, or sign in on your center's page.",
    'link.expiredShort': 'Link expired',
    'pw.title': 'Choose your password',
    'pw.lead': "You will use it with your email to sign in on your center's page.",
    'pw.new': 'New password',
    'pw.hint': 'at least 10 characters',
    'pw.again': 'Type it again',
    'pw.save': 'Save and continue',
    'pw.short': 'Use at least 10 characters.',
    'pw.differ': 'The two passwords are different.',
    'pw.saved': 'Password saved.',
    'signin.notFoundTitle': 'We could not find that center',
    'signin.notFoundBody': 'Nothing is at <b>{path}</b>. Check the address with your director.',
    'signin.notFoundShort': 'Center not found',
    'signin.lead': "Sign in to {center}'s private space in the Futures Hub.",
    'signin.email': 'Email',
    'signin.password': 'Password',
    'signin.submit': 'Sign in',
    'signin.magic': 'Email me a sign-in link',
    'signin.google': 'Staff: sign in with Google',
    'signin.googleStaff': 'For staff of this center whose Google account uses the email the center invited.',
    'signin.googleGoing': 'Opening Google...',
    'sso.title': 'Google sign-in not used here',
    'sso.off': 'Google sign-in is switched off for {center}. Sign in with your email and password, or ask for a sign-in link.',
    'sso.notMember': 'This Google account is not a member of {center}. Sign in with the email the center invited.',
    'sso.staffOnly': 'Google sign-in is for staff. Families sign in with their email and password, or a sign-in link.',
    'sso.domain': 'This Google account is not on the email domain {center} allows. Sign in with your work account or your password.',
    'sso.failed': 'The Hub could not check this sign-in. Try again, or sign in with your email and password.',
    'sso.again': 'Back to sign-in',
    'signin.closed': "{center}'s space is closed right now. Please contact your director.",
    'signin.newHere': 'New here? Your director invites you by email. Starting a program? <a href="/start" data-nav>Start your center</a>.',
    // account recovery (N18, docs/ops/ACCOUNT_RECOVERY.md): what to do when the reset email cannot help
    'signin.help': 'Can\'t sign in?',
    'signin.helpPassword': 'Forgot your password: type your email above and choose "Forgot your password?". The link works once and expires soon.',
    'signin.helpLocked': 'Too many tries: the account opens again by itself after a short wait, or your director can unlock it.',
    'signin.helpTwoStep': 'Lost the phone with your authenticator app: ask a second director of your center, or Futures Friends support, to reset two-step verification. They will check who you are first.',
    'signin.helpFamily': 'Families who no longer get our emails or changed email address: call or visit your center. After checking who you are, the director sends you a new sign-in link.',
    'signin.helpDirector': 'A director has left: the owner of the center, or Futures Friends support, moves the director role to another staff member.',
    'signin.need': 'Enter your email and password, or ask for a sign-in link.',
    'signin.signingIn': 'Signing in…',
    'signin.emailFirst': 'Enter your email first.',
    'signin.magicSent': 'If {email} belongs to someone at {center}, a sign-in link is on its way. Open it on this device.',
    'signin.title': 'Sign in · {center}',
    'member.notTitle': 'Not part of {center} yet',
    'member.notBody': 'This account is not a member of {center}. If you just started a center, it opens within a minute of your first sign-in: reload this page.',
    'member.aCenter': 'a center',
    'member.anyCenter': 'any center',
    'member.yours': 'Your centers:',
    'member.notShort': 'Not a member',
    'role.family': 'Family',
    'family.shared': 'Shared with you',
    'family.sharedOpen': 'Open',
    'family.messagesTitle': 'Messages from the friends',
    'family.messagesBody': 'Short, kind messages from Booker, Lumi, Zuri and Bop for your child. Nothing reaches your child unless you say yes.',
    'family.messagesOpen': 'Open messages',
    'kind.child_care': 'Child care',
    'kind.church': 'Church program',
    'center.readOnly': 'Read only',
    'family.welcome': 'Welcome',
    'family.signedInAs': 'You are signed in to {center} as a family member.',
    'family.portal': "Your child's daily reports, photos and messages from the classroom appear in the Family Portal.",
    'family.language': 'Language for your emails and these pages',
    'family.languageHint': 'You can change it at any time.',
    'family.langEn': 'English',
    'family.langEs': 'Español',
    // CRM family link pages (crm-ui.js viewPublic; hub/CRM.md): waitlist status, tour change / cancel, unsubscribe, re-enrollment
    'crmpub.bad': 'This link is not valid or has expired. Please contact the center.',
    'crmpub.closed': 'This center is not taking changes online right now. Please call the center.',
    'crmpub.waitTitle': 'Your place on the waitlist',
    'crmpub.waitPlace': '{child} is number {place} of {size} on the waitlist for {room}.',
    'crmpub.waitJoined': 'On the list since {date}.',
    'crmpub.waitHow': 'How the order is decided: priority points first, then the date a family joined the list.',
    'crmpub.waitDateOnly': 'How the order is decided: the date a family joined the list. No priority rules are in use.',
    'crmpub.waitRules': 'Rules in use at this center:',
    'crmpub.waitYours': 'Your priority points: {points}.',
    'crmpub.waitNoPoints': 'No priority points apply to your family.',
    'crmpub.offerTitle': 'A seat is available',
    'crmpub.offerBody': 'A seat in {room} is held for {child} until {date}',
    'crmpub.accept': 'Accept the seat',
    'crmpub.decline': 'Decline the seat',
    'crmpub.leave': 'Leave the waitlist',
    'crmpub.leaveConfirm': 'Leave the waitlist? Your place cannot be given back.',
    'crmpub.accepted': 'Thank you! The center will send the enrollment forms.',
    'crmpub.declined': 'Thank you for letting us know. The seat goes to the next family.',
    'crmpub.left': 'You have left the waitlist.',
    'crmpub.status.expired': 'This offer has expired.',
    'crmpub.status.closed': 'This waitlist entry is closed.',
    'crmpub.tourTitle': 'Your tour',
    'crmpub.tourWhen': 'Your tour is booked for {date} ({minutes} minutes)',
    'crmpub.tourMissed': 'We missed you at your tour. Pick a new time below.',
    'crmpub.tourCancelled': 'This tour is cancelled.',
    'crmpub.tourLate': 'This tour can no longer be changed online. Please call the center.',
    'crmpub.tourPick': 'Choose another time',
    'crmpub.tourMove': 'Move my tour to this time',
    'crmpub.tourCancel': 'Cancel my tour',
    'crmpub.tourCancelConfirm': 'Cancel your tour?',
    'crmpub.tourMoved': 'Done. Your tour is now {date}',
    'crmpub.tourDone': 'Your tour is cancelled. We hope to see you another time.',
    'crmpub.tourNone': 'No other times are open right now. Please call the center.',
    'crmpub.unsubTitle': 'Email and text choices',
    'crmpub.unsubEmail': 'Stop emails from {center}',
    'crmpub.unsubSms': 'Stop texts from {center}',
    'crmpub.unsubAll': 'Stop all messages',
    'crmpub.unsubDone': 'Done. You will not get these messages any more.',
    'crmpub.unsubAlready': 'You already get no automatic emails from {center}.',
    'crmpub.reTitle': 'Next school year',
    'crmpub.reAsk': 'Will {children} return for {campaign}? Please answer by {date}.',
    'crmpub.reReturning': 'Yes, returning',
    'crmpub.reNot': 'No, not returning',
    'crmpub.reUnsure': 'Not sure yet',
    'crmpub.reNote': 'Anything we should know? (optional)',
    'crmpub.reThanks': 'Thank you! Your answer is saved.',
    'crmpub.reCurrent': 'Your answer: {answer}.',
    'crmpub.reClosed': 'Re-enrollment answers are closed. Please contact the center.',
    'crmpub.working': 'Saving…',
  }),
  es: Object.freeze({
    'lang.switch': 'English',
    'lang.switchLabel': 'View this page in English',
    'lang.flipEs': 'Ver en español',
    'lang.flipEn': 'See in English',
    'lang.staffTitle': 'Idioma de sus pantallas',
    'lang.staffHint': 'Solo sus propias pantallas. Cada familia sigue recibiendo los reportes, mensajes y correos en el idioma que eligió.',
    'lang.saved': 'Idioma guardado: español.',
    'lang.draft': 'Traducción en borrador, pendiente de revisión',
    'nav.start': 'Registre su centro',
    'nav.signOut': 'Cerrar sesión',
    'nav.signedOut': 'Sesión cerrada.',
    'title.app': 'Futures Hub',
    'common.goHub': 'Ir a Futures Hub',
    'common.hubHome': 'Inicio de Futures Hub',
    'common.startAgain': 'Volver a empezar',
    'common.reload': 'Volver a cargar',
    'common.open': 'Abrir',
    'common.or': 'o',
    'common.sending': 'Enviando…',
    'err.title': 'Algo salió mal',
    'err.locked': 'Demasiados intentos. Por su seguridad, esta cuenta está bloqueada por unos minutos. Inténtelo más tarde o restablezca su contraseña.',
    'err.rate': 'Demasiadas solicitudes en este momento. Espere un minuto e inténtelo de nuevo.',
    'nav.account': 'Su cuenta',
    'signin.forgot': '¿Olvidó su contraseña?',
    'signin.forgotEmailFirst': 'Escriba primero su correo y luego elija "¿Olvidó su contraseña?".',
    'signin.sending': 'Enviando…',
    'signin.forgotSent': 'Si {email} tiene una cuenta, le estamos enviando un correo con un enlace para elegir una contraseña nueva.',
    'err.access': 'Esta cuenta no puede hacer eso en este centro. Pídale acceso a su director o directora.',
    'err.login': 'Ese correo y esa contraseña no coinciden. Revíselos e inténtelo de nuevo, o pida un enlace para iniciar sesión.',
    'err.network': 'No se pudo conectar con Futures Hub. Revise su conexión e inténtelo de nuevo.',
    'err.config': 'Futures Hub todavía no está configurado en este servidor. Avise a su administrador.',
    'notfound.title': 'No se encontró la página',
    'notfound.body': 'No hay nada en esta dirección. Revise el enlace o vuelva a la página de inicio de Futures Hub.',
    'home.yourCenters': 'Sus centros',
    'home.noCenter': 'Esta cuenta todavía no pertenece a ningún centro. Si acaba de registrar un centro, se abre en menos de un minuto después de su primer inicio de sesión: vuelva a cargar esta página.',
    'home.heroTitle': 'El espacio privado de su centro para el cuidado diario, las familias y la capacitación',
    'home.heroLead': 'Cada programa de cuidado infantil y de iglesia en Futures Hub tiene su propio espacio. Nadie ve nada en él si usted no lo invita.',
    'home.haveCenter': '¿Ya tiene un centro?',
    'home.haveCenterBody': 'Inicie sesión en la página de su centro. Su director o directora le puede dar la dirección.',
    'home.address': 'La dirección de su centro',
    'home.goSignin': 'Ir a iniciar sesión',
    'home.addressBad': 'Escriba la dirección de su centro, por ejemplo sunrise-kids.',
    'home.how': 'Cómo funciona',
    'home.how1': '<b>Registre su centro.</b> Díganos el nombre, el tipo y el estado de su programa.',
    'home.how2': '<b>Confirme por correo.</b> El espacio privado de su centro se abre cuando inicia sesión con el enlace.',
    'home.how3': '<b>Comience.</b> Agregue sus salones y luego invite al personal y a las familias.',
    'link.checking': 'Revisando su enlace…',
    'link.signingIn': 'Iniciando sesión',
    'link.expiredTitle': 'Este enlace ya no funciona',
    'link.expiredBody': 'Los enlaces funcionan una sola vez y vencen poco después. Se envía uno nuevo automáticamente al día siguiente, o puede iniciar sesión en la página de su centro.',
    'link.expiredShort': 'Enlace vencido',
    'pw.title': 'Elija su contraseña',
    'pw.lead': 'La usará con su correo para iniciar sesión en la página de su centro.',
    'pw.new': 'Contraseña nueva',
    'pw.hint': 'al menos 10 caracteres',
    'pw.again': 'Escríbala otra vez',
    'pw.save': 'Guardar y continuar',
    'pw.short': 'Use al menos 10 caracteres.',
    'pw.differ': 'Las dos contraseñas son diferentes.',
    'pw.saved': 'Contraseña guardada.',
    'signin.notFoundTitle': 'No encontramos ese centro',
    'signin.notFoundBody': 'No hay nada en <b>{path}</b>. Confirme la dirección con su director o directora.',
    'signin.notFoundShort': 'Centro no encontrado',
    'signin.lead': 'Inicie sesión en el espacio privado de {center} en Futures Hub.',
    'signin.email': 'Correo electrónico',
    'signin.password': 'Contraseña',
    'signin.submit': 'Iniciar sesión',
    'signin.magic': 'Envíenme un enlace para iniciar sesión',
    'signin.google': 'Personal: iniciar sesión con Google',
    'signin.googleStaff': 'Para el personal de este centro cuya cuenta de Google usa el correo al que el centro envió la invitación.',
    'signin.googleGoing': 'Abriendo Google...',
    'sso.title': 'No se usa el inicio de sesión con Google aquí',
    'sso.off': 'El inicio de sesión con Google está desactivado en {center}. Inicie sesión con su correo y contraseña, o pida un enlace.',
    'sso.notMember': 'Esta cuenta de Google no es miembro de {center}. Inicie sesión con el correo al que el centro envió la invitación.',
    'sso.staffOnly': 'El inicio de sesión con Google es para el personal. Las familias inician sesión con su correo y contraseña, o con un enlace.',
    'sso.domain': 'Esta cuenta de Google no está en el dominio de correo que {center} permite. Use su cuenta de trabajo o su contraseña.',
    'sso.failed': 'El Hub no pudo comprobar este inicio de sesión. Inténtelo de nuevo, o inicie sesión con su correo y contraseña.',
    'sso.again': 'Volver a iniciar sesión',
    'signin.closed': 'El espacio de {center} está cerrado en este momento. Comuníquese con su director o directora.',
    'signin.newHere': '¿Es nuevo aquí? Su director o directora le envía una invitación por correo. ¿Va a abrir un programa? <a href="/start" data-nav>Registre su centro</a>.',
    'signin.help': '¿No puede iniciar sesión?',
    'signin.helpPassword': 'Olvidó su contraseña: escriba su correo arriba y elija "¿Olvidó su contraseña?". El enlace funciona una sola vez y caduca pronto.',
    'signin.helpLocked': 'Demasiados intentos: la cuenta se vuelve a abrir sola después de una breve espera, o su director o directora puede desbloquearla.',
    'signin.helpTwoStep': 'Perdió el teléfono con su aplicación de autenticación: pida a otro director o directora de su centro, o al apoyo de Futures Friends, que restablezca la verificación en dos pasos. Primero verificarán su identidad.',
    'signin.helpFamily': 'Familias que ya no reciben nuestros correos o cambiaron de correo: llamen o visiten su centro. Después de verificar su identidad, la dirección les envía un nuevo enlace para iniciar sesión.',
    'signin.helpDirector': 'Si un director o directora se fue: el propietario del centro, o el apoyo de Futures Friends, pasa la función de dirección a otra persona del personal.',
    'signin.need': 'Escriba su correo y su contraseña, o pida un enlace para iniciar sesión.',
    'signin.signingIn': 'Iniciando sesión…',
    'signin.emailFirst': 'Primero escriba su correo.',
    'signin.magicSent': 'Si {email} pertenece a alguien de {center}, le enviamos un enlace para iniciar sesión. Ábralo en este dispositivo.',
    'signin.title': 'Iniciar sesión · {center}',
    'member.notTitle': 'Todavía no forma parte de {center}',
    'member.notBody': 'Esta cuenta no es miembro de {center}. Si acaba de registrar un centro, se abre en menos de un minuto después de su primer inicio de sesión: vuelva a cargar esta página.',
    'member.aCenter': 'un centro',
    'member.anyCenter': 'ningún centro',
    'member.yours': 'Sus centros:',
    'member.notShort': 'No es miembro',
    'role.family': 'Familia',
    'family.shared': 'Compartido contigo',
    'family.sharedOpen': 'Abrir',
    'family.messagesTitle': 'Mensajes de los amigos',
    'family.messagesBody': 'Mensajes cortos y cariñosos de Booker, Lumi, Zuri y Bop para su hijo o hija. Nada le llega sin su permiso.',
    'family.messagesOpen': 'Abrir mensajes',
    'kind.child_care': 'Cuidado infantil',
    'kind.church': 'Programa de iglesia',
    'center.readOnly': 'Solo lectura',
    'family.welcome': 'Bienvenidos',
    'family.signedInAs': 'Inició sesión en {center} como familia.',
    'family.portal': 'Los reportes diarios, las fotos y los mensajes del salón de su hijo o hija aparecen en el Portal para Familias.',
    'family.language': 'Idioma de sus correos y de estas páginas',
    'family.languageHint': 'Puede cambiarlo cuando quiera.',
    'family.langEn': 'English',
    'family.langEs': 'Español',
    'crmpub.bad': 'Este enlace no es válido o ya venció. Por favor comuníquese con el centro.',
    'crmpub.closed': 'Este centro no está recibiendo cambios en línea por ahora. Por favor llame al centro.',
    'crmpub.waitTitle': 'Su lugar en la lista de espera',
    'crmpub.waitPlace': '{child} tiene el número {place} de {size} en la lista de espera para {room}.',
    'crmpub.waitJoined': 'En la lista desde el {date}.',
    'crmpub.waitHow': 'Cómo se decide el orden: primero los puntos de prioridad, luego la fecha en que la familia entró a la lista.',
    'crmpub.waitDateOnly': 'Cómo se decide el orden: la fecha en que la familia entró a la lista. No se usan reglas de prioridad.',
    'crmpub.waitRules': 'Reglas que usa este centro:',
    'crmpub.waitYours': 'Sus puntos de prioridad: {points}.',
    'crmpub.waitNoPoints': 'No se aplican puntos de prioridad a su familia.',
    'crmpub.offerTitle': 'Hay un lugar disponible',
    'crmpub.offerBody': 'Un lugar en {room} está reservado para {child} hasta el {date}',
    'crmpub.accept': 'Aceptar el lugar',
    'crmpub.decline': 'Rechazar el lugar',
    'crmpub.leave': 'Salir de la lista de espera',
    'crmpub.leaveConfirm': '¿Salir de la lista de espera? No se puede devolver su lugar.',
    'crmpub.accepted': '¡Gracias! El centro le enviará los formularios de inscripción.',
    'crmpub.declined': 'Gracias por avisarnos. El lugar pasa a la siguiente familia.',
    'crmpub.left': 'Usted salió de la lista de espera.',
    'crmpub.status.expired': 'Esta oferta ya venció.',
    'crmpub.status.closed': 'Esta entrada de la lista de espera está cerrada.',
    'crmpub.tourTitle': 'Su visita',
    'crmpub.tourWhen': 'Su visita está reservada para el {date} ({minutes} minutos)',
    'crmpub.tourMissed': 'Le extrañamos en su visita. Elija otro horario abajo.',
    'crmpub.tourCancelled': 'Esta visita está cancelada.',
    'crmpub.tourLate': 'Esta visita ya no se puede cambiar en línea. Por favor llame al centro.',
    'crmpub.tourPick': 'Elija otro horario',
    'crmpub.tourMove': 'Cambiar mi visita a este horario',
    'crmpub.tourCancel': 'Cancelar mi visita',
    'crmpub.tourCancelConfirm': '¿Cancelar su visita?',
    'crmpub.tourMoved': 'Listo. Su visita ahora es el {date}',
    'crmpub.tourDone': 'Su visita está cancelada. Esperamos verle en otra ocasión.',
    'crmpub.tourNone': 'No hay otros horarios disponibles por ahora. Por favor llame al centro.',
    'crmpub.unsubTitle': 'Opciones de correo y mensajes de texto',
    'crmpub.unsubEmail': 'Dejar de recibir correos de {center}',
    'crmpub.unsubSms': 'Dejar de recibir mensajes de texto de {center}',
    'crmpub.unsubAll': 'Dejar de recibir todos los mensajes',
    'crmpub.unsubDone': 'Listo. Ya no recibirá estos mensajes.',
    'crmpub.unsubAlready': 'Ya no recibe correos automáticos de {center}.',
    'crmpub.reTitle': 'Próximo año escolar',
    'crmpub.reAsk': '¿{children} regresará para {campaign}? Por favor responda antes del {date}.',
    'crmpub.reReturning': 'Sí, regresa',
    'crmpub.reNot': 'No, no regresa',
    'crmpub.reUnsure': 'Todavía no sé',
    'crmpub.reNote': '¿Algo que debamos saber? (opcional)',
    'crmpub.reThanks': '¡Gracias! Su respuesta quedó guardada.',
    'crmpub.reCurrent': 'Su respuesta: {answer}.',
    'crmpub.reClosed': 'Las respuestas de reinscripción están cerradas. Por favor comuníquese con el centro.',
    'crmpub.working': 'Guardando…',
  }),
});

// Any stored or browser value ('es', 'ES', 'es-MX', null, 'fr') to a supported language. Same rule as hub/worker/language.mjs.
export function pickLocale(pref) {
  const base = String(pref ?? '').trim().toLowerCase().split(/[-_]/)[0];
  return LANGUAGES.includes(base) ? base : DEFAULT_LANGUAGE;
}

// t('signin.lead', { center: 'Sunrise' }, 'es'). Values are inserted as given: escape them first when the result goes into HTML.
// A key missing in Spanish falls back to English (the completeness test keeps that from happening); an unknown key returns itself.
export function t(key, vars = {}, lang = DEFAULT_LANGUAGE) {
  const table = STRINGS[pickLocale(lang)];
  const s = table[key] ?? STRINGS.en[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (m, k) => (Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : m));
}

// The language to show before the server answers: the saved local choice, else English (never the browser's guess: a family that
// wants Spanish chooses it once and it sticks, and staff pages stay predictable).
export function storedLanguage(storage = globalThis.localStorage) {
  try { const v = storage?.getItem(STORAGE_KEY); return v ? pickLocale(v) : null; } catch { return null; }
}
export function storeLanguage(lang, storage = globalThis.localStorage) {
  try { storage?.setItem(STORAGE_KEY, pickLocale(lang)); } catch { /* private mode: the choice lasts for this page only */ }
}

// ---- the person's UI language, shared by every module ------------------------------------------------------------------------
// app.js sets it once it knows (saved choice, else local choice, else English); modules read it instead of keeping their own copy.
let current = DEFAULT_LANGUAGE;
export const uiLang = () => current;
export function setUiLang(lang) { current = pickLocale(lang); return current; }

// A per-module table { en: {...}, es: {...} } for a language, English per missing key (never undefined, never a raw key).
export function dict(table, lang = current) {
  const en = table?.en || {};
  const want = table?.[pickLocale(lang)] || en;
  if (want === en) return en;
  return new Proxy(want, { get: (o, k) => (o[k] !== undefined ? o[k] : en[k]) });
}

// ---- plural forms --------------------------------------------------------------------------------------------------------------
export const LOCALES = Object.freeze({ en: 'en-US', es: 'es-US' });
export const localeOf = (lang = current) => LOCALES[pickLocale(lang)];
const pluralRules = {};
// plural(3, { one: '{n} child', other: '{n} children' }) -> '3 children'. Forms may be per language: { en: {...}, es: {...} }.
export function plural(n, forms, lang = current) {
  const l = pickLocale(lang);
  const f = forms?.[l] && typeof forms[l] === 'object' ? forms[l] : (forms?.en && typeof forms.en === 'object' ? forms.en : forms);
  const rule = (pluralRules[l] ||= new Intl.PluralRules(LOCALES[l])).select(Number(n));
  const s = (n === 0 && f.zero) || f[rule] || f.other || f.one || '';
  return s.replace(/\{n\}/g, fmtNumber(n, {}, l));
}
// tp('x.count', n, vars, lang): keyed plural from STRINGS ('x.count.one' / 'x.count.other').
export function tp(key, n, vars = {}, lang = current) {
  const l = pickLocale(lang);
  const rule = (pluralRules[l] ||= new Intl.PluralRules(LOCALES[l])).select(Number(n));
  const k = `${key}.${rule}` in STRINGS.en ? `${key}.${rule}` : `${key}.other`;
  return t(k, { n: fmtNumber(n, {}, l), ...vars }, l);
}

// ---- dates, times, numbers, money (Intl, en-US / es-US) -----------------------------------------------------------------------
const toDate = (v) => {
  if (v instanceof Date) return v;
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(`${v}T12:00:00Z`);   // a calendar day: noon UTC
  return new Date(v);
};
// The open center's time zone (app.js sets it from center_clock; hub/TIME_ZONES.md): moments are shown in the CENTER's clock time,
// whatever zone the device is in. null (no center open, the unit tests) = the device's zone.
let displayTz = null;
export function setDisplayTz(tz) { displayTz = tz || null; }
const zoned = (opts) => (displayTz && !opts.timeZone ? { timeZone: displayTz, ...opts } : opts);
// A plain YYYY-MM-DD is a calendar day: formatted in UTC so it never shifts a day. Anything else uses opts.timeZone if given, else the
// center's zone.
export function fmtDate(v, opts = { month: 'short', day: 'numeric' }, lang = current) {
  const d = toDate(v);
  if (Number.isNaN(d.getTime())) return '';
  const day = typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
  return new Intl.DateTimeFormat(localeOf(lang), day ? { ...opts, timeZone: 'UTC' } : zoned(opts)).format(d);
}
export function fmtTime(v, opts = { hour: 'numeric', minute: '2-digit' }, lang = current) {
  const d = toDate(v);
  return Number.isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat(localeOf(lang), zoned(opts)).format(d);
}
export function fmtDateTime(v, opts = { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }, lang = current) {
  const d = toDate(v);
  return Number.isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat(localeOf(lang), zoned(opts)).format(d);
}
export function fmtNumber(n, opts = {}, lang = current) { return new Intl.NumberFormat(localeOf(lang), opts).format(Number(n)); }
export function fmtMoney(n, currency = 'USD', lang = current) { return new Intl.NumberFormat(localeOf(lang), { style: 'currency', currency }).format(Number(n)); }

// ---- two versions of the same words: one shown, a button flips ("Ver en español" / "See in English") ------------------------------
// versions: { en, es } of ready-made HTML (escape it first). The reader's language shows first when it is there; with one version,
// that version alone. Both sides are people's own words or content: translate="no" keeps the page's catalog off them.
const LABEL_TO = { es: 'Ver en español', en: 'See in English' };
export function flipBlock(versions, lang = current, { cls = '' } = {}) {
  const have = LANGUAGES.filter((l) => versions?.[l] != null && String(versions[l]).trim() !== '');
  if (!have.length) return '';
  if (have.length === 1) return `<div class="${cls}" lang="${have[0]}" translate="no">${versions[have[0]]}</div>`;
  const first = have.includes(pickLocale(lang)) ? pickLocale(lang) : have[0];
  const other = first === 'en' ? 'es' : 'en';
  return `<div class="i18n-flip ${cls}" data-shown="${first}"><div class="i18n-side" lang="${first}" translate="no">${versions[first]}</div>`
    + `<div class="i18n-side" lang="${other}" translate="no" hidden>${versions[other]}</div>`
    + `<button type="button" class="btn link small i18n-flip-btn" lang="${other}" translate="no" data-flip aria-pressed="false">${LABEL_TO[other]}</button></div>`;
}
export const flipText = (esc, versions, lang = current, opts = {}) => flipBlock(Object.fromEntries(Object.entries(versions || {})
  .filter(([, v]) => v != null && String(v).trim() !== '').map(([l, v]) => [l, `<p>${esc(v)}</p>`])), lang, opts);
// One listener for every flip on the page (installed once by app.js).
export function bindFlips(root = globalThis.document) {
  root?.addEventListener('click', (e) => {
    const b = e.target.closest?.('[data-flip]');
    if (!b) return;
    const box = b.closest('.i18n-flip');
    const sides = [...box.querySelectorAll(':scope > .i18n-side')];
    const now = box.dataset.shown === 'es' ? 'en' : 'es';
    for (const s of sides) s.hidden = s.getAttribute('lang') !== now;
    box.dataset.shown = now;
    const next = now === 'en' ? 'es' : 'en';
    b.textContent = LABEL_TO[next];
    b.setAttribute('lang', next);
    b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
  });
}
