/* Spanish phrase table (DRAFT, pending review by the center's Spanish teacher), part 6: wording added by the 2026-10-08 audit fixes
   (honest "online requests are not switched on yet" copy and the request summary, one status vocabulary, the library send gate, sample-data
   labels, planner notes). Keys = the English exactly as on the page (whitespace collapsed). Used by i18n.js. */
(function () {
'use strict';
if (!window.FFi18n) return;
window.FFi18n.add('es', {
  'Write your request down to send yourself': 'Escribe tu solicitud para enviarla tú mismo',
  'Fill in what you like. This stays on your device; it is not sent anywhere. Then copy it or print it, and email it to us or bring it to the center.': 'Llena lo que quieras. Se queda en tu dispositivo; no se envía a ningún lado. Luego cópialo o imprímelo, y mándanoslo por correo o llévalo al centro.',
  'Your name': 'Tu nombre',
  'Phone or email to reach you': 'Teléfono o correo para localizarte',
  'What you need, and any times that work': 'Lo que necesitas y los horarios que te sirven',
  'Your summary': 'Tu resumen',
  'Copy summary': 'Copiar resumen',
  'Print summary': 'Imprimir resumen',
  'How to apply': 'Cómo solicitar',
  'How to book a tour': 'Cómo reservar una visita',
  'Applying': 'Solicitar un lugar',
  'Apply by phone or email for now': 'Por ahora, solicita por teléfono o correo',
  'Online applications are not switched on yet. Call or email and the center will take your details. An application is a request, not a guaranteed spot.': 'Las solicitudes en línea todavía no están activadas. Llama o escribe y el centro tomará tus datos. Una solicitud es una petición, no un lugar asegurado.',
  'Book a tour': 'Reserva una visita',
  'Online tour requests are not switched on yet, so call or email to pick a time. Tours take about 30 minutes. Bring your child if you like; the alphabet rug is a good place to start.': 'Las solicitudes de visita en línea todavía no están activadas; llama o escribe para elegir una hora. Las visitas duran unos 30 minutos. Trae a tu hijo si quieres; la alfombra del abecedario es un buen lugar para empezar.',
  'Request status': 'Estado de la solicitud',
  'You call or email, and a real person takes your details': 'Llamas o escribes, y una persona real toma tus datos',
  'Online requests are not switched on yet.': 'Las solicitudes en línea todavía no están activadas.',
  'A fit check helps you plan. It is not a licensing review; confirm with your licensing consultant.': 'La revisión de espacio te ayuda a planear. No es una revisión de licencia; confírmalo con tu asesor de licencias.',
  'Saved on this device only': 'Guardado solo en este dispositivo',
  'Saved on this device only.': 'Guardado solo en este dispositivo.',
  'In the first box (made to order)': 'En la primera caja (hecho por encargo)',
  'In development; planned as the first box, once the pieces are made': 'En desarrollo; planeada como la primera caja, cuando las piezas estén hechas',
  'Sample data': 'Datos de ejemplo',
  'Not approved for sending yet': 'Aún no aprobado para enviar',
  'Send to staff': 'Enviar al personal',
  'Staff only': 'Solo personal',
  'Only approved family items can be sent home.': 'Solo se pueden enviar a casa los materiales aprobados para familias.',
  'Written': 'Escrito', 'Reviewed': 'Revisado', 'Approved': 'Aprobado', 'Hosted': 'Alojado', 'Released': 'Publicado', 'Delivered': 'Entregado',
  'A full draft exists. Nobody outside our team has reviewed it.': 'Existe un borrador completo. Nadie fuera de nuestro equipo lo ha revisado.',
  'A second person on our team has read it and fixed what they found.': 'Una segunda persona de nuestro equipo lo leyó y corrigió lo que encontró.',
  'An early-childhood specialist has signed off on it.': 'Un especialista en primera infancia lo aprobó.',
  'It is on the live Futures Hub, where a program can open it.': 'Está en el Futures Hub en vivo, donde un programa puede abrirlo.',
  'It is in a published release that programs can receive.': 'Está en una versión publicada que los programas pueden recibir.',
  'It has reached a program that uses it.': 'Ya llegó a un programa que lo usa.',
  'How far a piece has come.': 'Hasta dónde ha llegado cada pieza.',
  'The curriculum today.': 'El currículo hoy.',
  'Units 1 to 11 are written as drafts, and none is approved yet. Unit 12 is being written.': 'Las Unidades 1 a 11 están escritas como borradores y ninguna está aprobada todavía. La Unidad 12 se está escribiendo.',
  'Units 1 to 11 are written as drafts on our private platform: Units 1 to 10 are merged, Unit 11 is in quality check and Unit 12 is being written. No early-childhood specialist has approved any unit yet, and none is hosted, released or delivered through the Futures Hub yet.': 'Las Unidades 1 a 11 están escritas como borradores en nuestra plataforma privada: las Unidades 1 a 10 ya están integradas, la Unidad 11 está en control de calidad y la Unidad 12 se está escribiendo. Ningún especialista en primera infancia ha aprobado todavía ninguna unidad, y ninguna está alojada, publicada ni entregada por el Futures Hub todavía.',
  'Eleven of the twelve months are written day by day as drafts, and none is approved yet.': 'Once de los doce meses están escritos día por día como borradores, y ninguno está aprobado todavía.',
  'Online demo requests are not switched on yet, so call or email to set up a time. Nothing is charged.': 'Las solicitudes de demostración en línea todavía no están activadas; llama o escribe para fijar una hora. No se cobra nada.',
  'A real person replies; nothing is charged.': 'Una persona real responde; no se cobra nada.',
  'Online applications are not switched on yet, so call or email with your resume.': 'Las solicitudes de empleo en línea todavía no están activadas; llama o escribe con tu currículum.',
  'Until online applications are switched on, call or email and the hiring team will take your details. They contact people they would like to meet. Applying is not a job offer.': 'Mientras las solicitudes en línea no estén activadas, llama o escribe y el equipo de contratación tomará tus datos. Se comunican con las personas que quieren conocer. Solicitar no es una oferta de trabajo.',
}, [
  [/^Online (.+) are not switched on yet, so this page sends nothing: no request goes out, there is no reference number and no automatic reply\. Please call or email us and a real person will help you\.$/, (m, w) => `Las solicitudes en línea (${window.FFi18n.lookup(w, 'es') || w}) todavía no están activadas, así que esta página no envía nada: no sale ninguna solicitud, no hay número de referencia ni respuesta automática. Por favor, llámanos o escríbenos y una persona real te ayudará.`],
  [/^(\d+) ready · (\d+) in review · (\d+) drafts? · (\d+) coming$/, '$1 listos · $2 en revisión · $3 borradores · $4 próximos']
]);
})();
