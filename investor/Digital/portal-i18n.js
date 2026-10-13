/* Futures Friends investor portal: English / Español for the overview and the documents drawer (owner 2026-10-12).
   - The language comes from ?lang=es|en, then the site's remembered choice (localStorage 'ff-lang', the same key as i18n.js), else English.
     The switch in the header remembers it the same way (blocked storage: this page load only).
   - Static text: every text node and label of the page is looked up by its English text; switching back restores the English.
   - Script-written text (overview.js, portal.js) goes through FFInvI18n.t(english) and is kept in data-en, so a later switch re-translates it.
   - Numbers are never translated or reformatted: figures read exactly the same in both languages (number-integrity test).
   Every Spanish string is a DRAFT pending review; the English text governs (said in the footer while Spanish is on). Sends nothing. */
(function () {
  'use strict';
  const ES = {
    // Capital command center (2026-10-13, v2271): the owner's layout
    "Private investor presentation": "Presentación privada para inversionistas",
    "The ask": "La solicitud", "Cash flow": "Flujo de caja", "Payback": "Pago", "All costs": "Todos los costos", "Evidence": "Evidencia",
    "Learn.": "Aprende.", "Move.": "Muévete.", "Explore.": "Explora.", "Belong.": "Pertenece.",
    "Capital command center": "Centro de mando del capital", "Small beginnings. Big futures.": "Comienzos pequeños. Grandes futuros.",
    "Total funding ask": "Financiamiento total solicitado", "Loan interest rate": "Tasa de interés del préstamo", "Operating profit outlook": "Perspectiva de resultado operativo",
    "Your repayment": "Su reembolso", "Platform · year one": "Plataforma · primer año",
    "Includes": "Incluye", "refinance allocation. Before financing costs.": "de asignación para refinanciar. Antes de costos de financiamiento.",
    "No agreed rate or signed loan terms.": "Sin tasa acordada ni términos de préstamo firmados.",
    "Annual operating loss. Before building payments & debt.": "Pérdida operativa anual. Antes de pagos del edificio y deuda.",
    "Payment schedule & investor return not established.": "Calendario de pagos y retorno para el inversionista sin establecer.",
    "Included in pilot costs. Build, assurance, hosting & support.": "Incluido en los costos del piloto. Desarrollo, verificación, alojamiento y soporte.",
    "See the payback case": "Ver el caso de pago", "See the platform costs": "Ver los costos de la plataforma",
    "Pilot basis": "Bases del piloto", "-child capacity": " niños de capacidad", "-month pilot": " meses de piloto", "collections assumed": "de cobranza supuesta",
    "The repayment case still needs to be proven.": "El caso de pago aún debe demostrarse.",
    "Where your capital goes": "A dónde va su capital", "Allocation view of the total funding ask.": "Distribución del financiamiento total solicitado.",
    "Inspect details": "Ver detalles", "of funding": "del financiamiento", "Pilot deficit": "Déficit del piloto", "Refinance": "Refinanciamiento",
    "Cash flow & scenario lab": "Laboratorio de flujo de caja y escenarios",
    "Receipts vs. total spending, month by month.": "Ingresos frente a gasto total, mes a mes.",
    "Inspect model": "Ver el modelo", "Receipts": "Ingresos", "Total spending": "Gasto total",
    "Monthly receipts and total spending during the 12-month pilot. Use the arrow keys to move between months.": "Ingresos mensuales y gasto total durante el piloto de 12 meses. Use las flechas para moverse entre meses.",
    "(distinct from annual operating loss and peak cash deficit)": "(distinto de la pérdida operativa anual y del déficit máximo de caja)",
    "Monthly receipts": "Ingresos del mes", "Monthly cash gap": "Diferencia de caja del mes",
    "Key documents & evidence": "Documentos clave y evidencia", "Explore the full set of materials.": "Explore el conjunto completo de materiales.",
    "The full pilot case": "El caso completo del piloto", "The decision at a glance": "La decisión de un vistazo", "Itemized financials": "Finanzas detalladas",
    "Cash forecast": "Pronóstico de caja", "Operations before repayment": "Operaciones antes del pago", "Production Bible": "Biblia de producción",
    "Characters, stories & curriculum": "Personajes, historias y currículo", "Sources and product previews": "Fuentes y vistas previas de productos",
    "Loan terms not yet agreed": "Términos del préstamo aún sin acordar",
    "Scenario — not a forecast": "Escenario — no es un pronóstico",
    "Steady-state year: 12 months at your selected enrollment. Uses the model’s method: food and payment-processing fees move with enrollment, tuition and collections; the other recurring costs stay at the model’s 40-child base. Excludes startup costs, building payments and debt; a positive margin does not establish loan affordability.": "Año en régimen estable: 12 meses con la inscripción que elija. Usa el método del modelo: la comida y las comisiones por procesar pagos cambian con la inscripción, la colegiatura y la cobranza; los demás costos recurrentes se mantienen en la base de 40 niños del modelo. Excluye costos iniciales, pagos del edificio y deuda; un margen positivo no demuestra capacidad de pago de un préstamo.",
    "Supporting records, operations and the broader product line.": "Registros de apoyo, operaciones y la línea amplia de productos.",
    "See the platform costs.": "Ver los costos de la plataforma.",
    // Overview command center (2026-10-13, v2270)
    "Key figures": "Cifras clave",
    "Itemized cost lines": "Partidas de costo detalladas",
    "Estimate": "Estimación",
    "Ramp-up": "Aumento",
    "By month": "Por mes",
    "Owner-stated": "Indicado por la dueña",
    "Scenario simulator": "Simulador de escenarios",
    "Move the sliders; the published plan stays unchanged.": "Mueva los controles; el plan publicado no cambia.",
    "Live": "En vivo",
    "From the monthly cash forecast.": "Según el pronóstico de caja mensual.",
    "Published forecast": "Pronóstico publicado",
    "Your scenario": "Su escenario",
    "Dashboard panels": "Paneles del tablero",
    "Costs": "Costos",
    "Repayment": "Pago",
    "Pilot": "Piloto",
    // Overview dashboard (2026-10-13): every studio module on the Overview
    "The four parts of the funding estimate.": "Las cuatro partes de la estimación de financiamiento.",
    "See the full breakdown": "Ver el desglose completo",
    "Open the scenarios": "Abrir los escenarios",
    "Tuition vs. operating break-even": "Colegiatura frente al punto de equilibrio operativo",
    "See inside the pilot": "Ver dentro del piloto",
    "Open the repayment model": "Abrir el modelo de pago",
    "Explore the pilot year": "Explore el año piloto",
    "Open the pilot year": "Abrir el año piloto",
    "Futures Friends curriculum preview: learning binder, activity sheet and character materials": "Vista previa del currículo de Futures Friends: carpeta de aprendizaje, hoja de actividades y materiales de los personajes",
    "Key documents for a deeper look.": "Documentos clave para ver más a fondo.",
    "One-sheet": "Resumen de una página",
    "The full pilot plan": "El plan piloto completo",
    "The core figures on one page": "Las cifras clave en una página",
    "Each planned line, itemized": "Cada partida planeada, en detalle",
    "Receipts and spending, month by month": "Ingresos y gastos, mes a mes",
    "Characters and story world": "Personajes y mundo de la historia",
    "Records, operations and products": "Registros, operaciones y productos",
    // Investor studio (2026-10-12)
    "Futures Friends | Investor studio": "Futures Friends | Estudio para inversionistas",
    "Skip to the investor studio": "Ir al estudio para inversionistas",
    "Investor studio": "Estudio para inversionistas",
    "Funding": "Fondos",
    "Pilot year": "Año piloto",
    "Year": "Año",
    "Scenarios": "Escenarios",
    "What if": "Simular",
    "Inside the pilot": "Dentro del piloto",
    "Inside": "Piloto",
    "Docs": "Docs",
    "Where the funding goes": "A dónde va el financiamiento",
    "See what the pilot includes": "Vea lo que incluye el piloto",
    "See the pilot year": "Vea el año piloto",
    "See it in the funding mix": "Véalo en la mezcla de financiamiento",
    "Select a part to see what it covers.": "Elija una parte para ver lo que cubre.",
    "How the estimate stacks up": "Cómo se compone la estimación",
    "12-MONTH PLANNING FORECAST": "PRONÓSTICO DE PLANIFICACIÓN A 12 MESES",
    "The pilot year, month by month": "El año piloto, mes a mes",
    "Enrollment ramp, receipts, spending and the funding gap, from the monthly cash forecast.": "Aumento de inscripción, ingresos, gastos y el déficit de financiamiento, según el pronóstico de caja mensual.",
    "Revenue": "Ingresos",
    "Expenses": "Gastos",
    "Operating gap": "Déficit operativo",
    "Play timeline": "Reproducir la línea de tiempo",
    "Pause timeline": "Pausar la línea de tiempo",
    "Show on the chart": "Mostrar en la gráfica",
    "Monthly receipts, spending and the operating gap during the 12-month pilot": "Ingresos, gastos y déficit operativo mensuales durante el piloto de 12 meses",
    "The selected month": "El mes seleccionado",
    "WHAT IF?": "¿Y SI…?",
    "Try a scenario": "Pruebe un escenario",
    "Illustrative — not a forecast": "Ilustrativo — no es un pronóstico",
    "Assumptions": "Supuestos",
    "This scenario": "Este escenario",
    "Illustrative steady-state year: 12 months at your selected enrollment. Uses the model’s method: food and payment-processing fees move with enrollment, tuition and collections; the other recurring costs stay at the model’s 40-child base. Excludes startup costs, building payments and debt; a positive margin does not establish loan affordability.": "Año ilustrativo en régimen estable: 12 meses con la inscripción que elija. Usa el método del modelo: la comida y las comisiones por procesar pagos cambian con la inscripción, la colegiatura y la cobranza; los demás costos recurrentes se mantienen en la base de 40 niños del modelo. Excluye costos iniciales, pagos del edificio y deuda; un margen positivo no demuestra capacidad de pago de un préstamo.",
    "PLANNED PILOT SCOPE": "ALCANCE PLANEADO DEL PILOTO",
    "What the pilot includes, and what the platform costs.": "Lo que incluye el piloto y lo que cuesta la plataforma.",
    "Curriculum preview · in development": "Vista previa del currículo · en desarrollo",
    "Preview curriculum": "Ver el currículo",
    "KEY DOCUMENTS FOR A DEEPER LOOK": "DOCUMENTOS CLAVE PARA VER MÁS A FONDO",
    "Illustrations are proposed investor and curriculum artwork.": "Las ilustraciones son arte propuesto para inversionistas y el currículo.",
    'Futures Friends | Investor dashboard': 'Futures Friends | Panel para inversionistas',
    'Skip to investor overview': 'Ir al resumen para inversionistas',
    'Investor overview': 'Resumen para inversionistas',
    'Overview': 'Resumen', 'Pilot plan': 'Plan piloto', 'Every cost': 'Cada costo', 'Cash forecast': 'Pronóstico de caja', 'Documents': 'Documentos',
    'PILOT PLAN': 'PLAN PILOTO',
    'Small beginnings.': 'Comienzos pequeños.', 'Big futures.': 'Grandes futuros.',
    'One location. 40 children. One year.': 'Una sede. 40 niños. Un año.',
    'Learn. Move. Explore. Belong.': 'Aprende. Muévete. Explora. Pertenece.',
    'Explore scenarios': 'Explorar escenarios', 'Pause motion': 'Pausar movimiento', 'Resume motion': 'Reanudar movimiento', 'Reduced motion on': 'Movimiento reducido activado',
    'Show all numbers now': 'Mostrar todas las cifras ya',
    'Current financial data could not load. Figures below are the October 11 planning snapshot; verify the': 'No se pudieron cargar los datos financieros actuales. Las cifras son la versión de planificación del 11 de octubre; verifique el',
    'full pilot model': 'modelo piloto completo', 'before relying on them.': 'antes de usarlas.',
    'Preliminary funding need': 'Necesidad preliminar de financiamiento',
    'Before financing costs · estimate, not an approved loan': 'Antes de costos de financiamiento · estimación, no un préstamo aprobado',
    'See how it adds up': 'Vea cómo se suma',
    'Children at capacity': 'Niños a plena capacidad', 'children': 'niños',
    'Ages 2–5 · our existing location': 'De 2 a 5 años · nuestra sede actual',
    'See staffing & age assumptions': 'Vea los supuestos de personal y edades',
    'Pilot period': 'Período piloto', 'months': 'meses',
    'First-month checkpoint, then a full year of learning': 'Revisión al primer mes y luego un año completo de aprendizaje',
    'See the pilot boundaries': 'Vea los límites del piloto',
    'Building refinance': 'Refinanciamiento del edificio',
    'Owner-stated amount · included in the funding estimate': 'Monto indicado por la dueña · incluido en la estimación de financiamiento',
    'See what needs lender confirmation': 'Vea lo que requiere confirmación del prestamista',
    'Loan terms require agreement': 'Los términos del préstamo requieren acuerdo',
    'Interest': 'Interés', 'Pending': 'Pendiente', 'Monthly repayment': 'Pago mensual', 'Term': 'Plazo', 'Ownership': 'Participación', 'No equity proposed': 'No se propone participación accionaria',
    'What the platform costs': 'Lo que cuesta la plataforma', 'Build once. Support yearly.': 'Se construye una vez. Se mantiene cada año.',
    'Platform completion': 'Finalización de la plataforma',
    '380 engineering hours at a $150 planning rate. Existing code must be reviewed and a written quote confirmed.': '380 horas de ingeniería a una tarifa de planificación de $150. Se debe revisar el código existente y confirmar una cotización por escrito.',
    'Authentication, learning records, bilingual review and deployment acceptance.': 'Autenticación, registros de aprendizaje, revisión bilingüe y aceptación del despliegue.',
    'Security testing & counsel': 'Pruebas de seguridad y asesoría legal',
    'Independent testing and legal review; planning allowances.': 'Pruebas independientes y revisión legal; partidas de planificación.',
    'Annual support & hosting': 'Soporte y alojamiento anual',
    'Hosting, maintenance, backups and support for 12 months.': 'Alojamiento, mantenimiento, respaldos y soporte por 12 meses.',
    'Platform year one': 'Plataforma, primer año', 'one time ·': 'una sola vez ·', 'recurring monthly': 'recurrente al mes',
    'Inspect platform costs': 'Revisar costos de la plataforma',
    'Planning estimate · live workflow acceptance remains unverified.': 'Estimación de planificación · la aceptación en uso real sigue sin verificarse.',
    'Can the pilot carry repayment?': '¿Puede el piloto cubrir el pago?',
    'Tuition today vs. operating break-even.': 'Colegiatura actual frente al punto de equilibrio operativo.',
    'Current tuition assumption': 'Supuesto de colegiatura actual', 'Operating break-even': 'Punto de equilibrio operativo',
    'Per child / month · building payments and debt excluded': 'Por niño / mes · sin pagos del edificio ni deuda',
    'Annual operating gap': 'Déficit operativo anual', 'Before building payments and debt': 'Antes de pagos del edificio y deuda',
    '40 enrolled · 96% collections': '40 inscritos · 96% de cobranza',
    'Pricing and costs must be resolved before debt terms.': 'Los precios y costos deben resolverse antes de los términos de la deuda.',
    'What drives this comparison?': '¿Qué determina esta comparación?',
    'The historical tuition draft is $210/week, converted using 52/12. The signed schedule is unverified. Break-even covers recurring operations at full enrollment and 96% collections; it excludes mortgage payments, debt and lender costs. No return is promised.': 'El borrador histórico de colegiatura es de $210/semana, convertido con 52/12. La tarifa firmada no está verificada. El punto de equilibrio cubre la operación recurrente con inscripción completa y 96% de cobranza; excluye pagos de hipoteca, deuda y costos del prestamista. No se promete ningún rendimiento.',
    'Open the repayment model →': 'Abrir el modelo de pago →',
    'What the pilot includes': 'Lo que incluye el piloto', 'Planned pilot scope.': 'Alcance planeado del piloto.',
    'Parent & child': 'Acceso de padres', 'sign-in': 'y niños', 'Curriculum &': 'Currículo y', 'learning records': 'registros de aprendizaje',
    'Family': 'Comunicación', 'communication': 'con la familia', 'Secure hosting': 'Alojamiento seguro', '& support': 'y soporte',
    'Curriculum preview · in development ↗': 'Vista previa del currículo · en desarrollo ↗',
    'Parent-approved finite messages · approved activities · tested access and restore.': 'Mensajes limitados aprobados por los padres · actividades aprobadas · acceso y restauración probados.',
    'Everything behind the plan': 'Todo lo que respalda el plan', 'Key documents for a deeper look.': 'Documentos clave para ver más a fondo.', 'All documents': 'Todos los documentos',
    'Business plan': 'Plan de negocios', 'The 40-child pilot, staffing, costs and delivery commitments.': 'El piloto de 40 niños, el personal, los costos y los compromisos de entrega.', 'Read the plan ↗': 'Leer el plan ↗',
    'Investor one-sheet': 'Resumen de una página', 'The core figures, boundaries and open decisions on one page.': 'Las cifras clave, los límites y las decisiones pendientes en una página.', 'See the brief ↗': 'Ver el resumen ↗',
    'Search each line. See quantity, rate, purpose and evidence.': 'Busque cada partida. Vea cantidad, tarifa, propósito y evidencia.', 'Inspect the financials ↗': 'Revisar las finanzas ↗',
    'Monthly cash': 'Caja mensual', 'Enrollment ramp, receipts, spending and the funding gap.': 'Aumento de inscripción, ingresos, gastos y el déficit de financiamiento.', 'Follow the cash ↗': 'Seguir la caja ↗',
    'Production bible': 'Biblia de producción', 'Our characters, story world and wider curriculum direction.': 'Nuestros personajes, el mundo de la historia y la dirección general del currículo.', 'Explore the world ↗': 'Explorar el mundo ↗',
    'Evidence & merchandise': 'Evidencia y mercancía', 'Supporting records, operations and the broader product concept.': 'Registros de apoyo, operaciones y el concepto amplio de productos.', 'Enter the source room ↗': 'Entrar a la sala de fuentes ↗',
    'Explore the financial model': 'Explorar el modelo financiero', 'Allocations · monthly cash · what-if scenarios': 'Asignaciones · caja mensual · escenarios hipotéticos',
    '01 / FINANCIAL EXPLORER': '01 / EXPLORADOR FINANCIERO', 'See the plan in motion.': 'Vea el plan en movimiento.',
    'Select an allocation. Explore a month. Test an assumption.': 'Elija una asignación. Explore un mes. Pruebe un supuesto.',
    'Capital allocation': 'Asignación del capital', 'Planning estimate': 'Estimación de planificación', 'OF FUNDING': 'DEL FINANCIAMIENTO',
    'Loading allocations': 'Cargando asignaciones', 'Explore the four parts of the funding estimate.': 'Explore las cuatro partes de la estimación de financiamiento.',
    'Pilot deficit': 'Déficit del piloto', 'Refinance': 'Refinanciamiento', 'Cash floor': 'Reserva mínima de caja', 'Contingency': 'Contingencia',
    'Trace the funding calculation ↗': 'Seguir el cálculo del financiamiento ↗',
    'EXPLORE / COMPARE / UNDERSTAND': 'EXPLORAR / COMPARAR / ENTENDER', 'Your financial control room.': 'Su sala de control financiero.',
    'Cash trajectory': 'Trayectoria de caja', 'What if?': '¿Y si…?', 'MONTH': 'MES', 'Cumulative pilot cash deficit': 'Déficit de caja acumulado del piloto',
    'Receipts': 'Ingresos', 'Total spending': 'Gasto total', '12-month planning forecast': 'Pronóstico de planificación de 12 meses',
    'Explore the pilot month': 'Explore el mes del piloto', 'Children': 'Niños', 'Monthly receipts': 'Ingresos mensuales', 'Monthly cash gap': 'Déficit de caja mensual',
    'Spending includes recurring and one-time pilot costs. Refinance and cash floor are separate funding allocations. Building payments and financing costs remain excluded.': 'El gasto incluye costos recurrentes y únicos del piloto. El refinanciamiento y la reserva mínima son asignaciones aparte. Los pagos del edificio y los costos de financiamiento siguen excluidos.',
    'Interactive scenario · unsaved': 'Escenario interactivo · sin guardar',
    'Move the sliders to see how operating capacity changes. The published plan stays unchanged.': 'Mueva los controles para ver cómo cambia la capacidad operativa. El plan publicado no cambia.',
    'Monthly tuition': 'Colegiatura mensual', 'Enrolled children': 'Niños inscritos', 'Collections': 'Cobranza', 'Reset to planning assumptions ↺': 'Volver a los supuestos de planificación ↺',
    'Annual operating margin': 'Margen operativo anual', 'Before building payments & debt': 'Antes de pagos del edificio y deuda', 'Annual receipts': 'Ingresos anuales', 'Break-even / child': 'Equilibrio / niño',
    'Operating surplus · building payments & debt excluded': 'Superávit operativo · sin pagos del edificio ni deuda',
    'Operating shortfall · building payments & debt excluded': 'Déficit operativo · sin pagos del edificio ni deuda',
    'Illustrative steady-state year: 12 months at your selected enrollment. Holds the model’s annual recurring cost base constant at 40-child capacity. Excludes startup costs, building payments and debt; a positive margin does not establish loan affordability.': 'Año estable ilustrativo: 12 meses con la inscripción elegida. Mantiene constante el costo recurrente anual del modelo a capacidad de 40 niños. Excluye costos iniciales, pagos del edificio y deuda; un margen positivo no demuestra capacidad de pago de un préstamo.',
    'Where the': 'A dónde va la', 'funding estimate': 'estimación de financiamiento', 'goes': '', 'View four allocations +': 'Ver cuatro asignaciones +',
    'NO HIDDEN ADDITIONS': 'SIN ADICIONES OCULTAS', 'Where the funding estimate goes.': 'A dónde va la estimación de financiamiento.',
    'Operating receipts reduce the cash needed during the pilot. These four allocations make up the estimate before financing costs.': 'Los ingresos operativos reducen la caja necesaria durante el piloto. Estas cuatro asignaciones forman la estimación antes de costos de financiamiento.',
    'Refinance-enabling allocation': 'Asignación para el refinanciamiento', 'Peak pilot cash deficit': 'Déficit máximo de caja del piloto',
    'The cash floor is liquidity, not an extra operating expense. Building payments, lender costs and prior creator compensation remain unresolved. The $140,000 is not a verified payoff or lender commitment.': 'La reserva mínima es liquidez, no un gasto operativo adicional. Los pagos del edificio, los costos del prestamista y la compensación previa a creadores siguen sin resolverse. Los $140,000 no son un saldo verificado ni un compromiso del prestamista.',
    'Inspect all': 'Revise las', 'cost lines and their evidence': 'partidas de costo y su evidencia',
    'The path to a proven pilot': 'El camino hacia un piloto comprobado', 'Planning stages · not completion claims': 'Etapas de planificación · no afirman avance',
    'Prepare': 'Preparar', 'Run the pilot': 'Operar el piloto', 'Earn expansion': 'Ganar la expansión',
    'Confirm written cost quotes, financing, approved content and tested family access before launch.': 'Confirmar cotizaciones escritas, financiamiento, contenido aprobado y acceso familiar probado antes del lanzamiento.',
    'Use the first-month checkpoint to review family workflows, staffing and collections. Evaluate the full 12-month pilot before expansion.': 'Usar la revisión del primer mes para evaluar los procesos con familias, el personal y la cobranza. Evaluar el piloto completo de 12 meses antes de expandir.',
    'Daycare and church expansion depends on pilot proof. Unsigned partner fees and merchandise revenue are excluded from repayment.': 'La expansión a guarderías e iglesias depende de la prueba del piloto. Las cuotas de socios sin firmar y los ingresos por mercancía se excluyen del pago.',
    'Review preparation evidence →': 'Revisar la evidencia de preparación →', 'Explore pilot boundaries →': 'Explorar los límites del piloto →', 'Explore future operations →': 'Explorar operaciones futuras →',
    '← Back to Futures Friends': '← Volver a Futures Friends',
    'Phase 2: daycare and church expansion. Unsigned partner revenue is excluded from pilot repayment.': 'Fase 2: expansión a guarderías e iglesias. Los ingresos de socios sin firmar se excluyen del pago del piloto.',
    'Back to the top ↑': 'Volver arriba ↑', 'Business plan PDF': 'Plan de negocios (PDF)', 'One-sheet PDF': 'Resumen de una página (PDF)', 'Visit the platform': 'Visitar la plataforma',
    'Illustrations are proposed investor and curriculum artwork. Financial figures are conditional estimates, not loan terms or guaranteed returns.': 'Las ilustraciones son arte propuesto para inversionistas y el currículo. Las cifras financieras son estimaciones condicionales, no términos de préstamo ni rendimientos garantizados.',
    'Building refinance allocation': 'Asignación para el refinanciamiento del edificio',
    'The largest cumulative gap between pilot receipts and spending over the first 12 months.': 'La mayor diferencia acumulada entre ingresos y gastos del piloto en los primeros 12 meses.',
    'Owner-stated refinance-enabling amount. Payoff and lender commitment remain unverified.': 'Monto indicado por la dueña para permitir el refinanciamiento. El saldo y el compromiso del prestamista siguen sin verificarse.',
    'A liquidity reserve held alongside the pilot funding. It is not an extra operating expense.': 'Una reserva de liquidez junto al financiamiento del piloto. No es un gasto operativo adicional.',
    'An additional planning buffer included in the preliminary funding calculation.': 'Un margen de planificación adicional incluido en el cálculo preliminar.',
    // attributes
    'Back to Futures Friends (home)': 'Volver a Futures Friends (inicio)', 'Investor navigation': 'Navegación para inversionistas', 'Language': 'Idioma',
    'Pilot at a glance': 'El piloto de un vistazo', 'Proposed financing status': 'Estado del financiamiento propuesto', 'Platform, cash and curriculum': 'Plataforma, caja y currículo',
    'Explore planned curriculum and platform acceptance': 'Explorar el currículo planeado y la aceptación de la plataforma',
    'Futures Friends curriculum concept: learning binder, activity sheet and character materials': 'Concepto del currículo de Futures Friends: carpeta de aprendizaje, hoja de actividades y materiales de personajes',
    'Explore the investor package': 'Explorar el paquete para inversionistas', 'Interactive financial explorer': 'Explorador financiero interactivo',
    'Select a funding allocation': 'Elija una asignación del financiamiento', 'Financial view': 'Vista financiera',
    'Monthly receipts and spending during the 12-month pilot': 'Ingresos y gastos mensuales durante el piloto de 12 meses', 'Choose a pilot phase': 'Elija una fase del piloto',
    // portal.js: tables, drawer, reveal
    'Show as table': 'Ver como tabla', 'Hide table': 'Ocultar tabla', 'Item': 'Concepto', 'Amount': 'Monto', 'Value': 'Valor',
    'The four parts of the funding estimate': 'Las cuatro partes de la estimación de financiamiento',
    'Platform costs, year one': 'Costos de la plataforma, primer año', 'Tuition and operating break-even, per child per month': 'Colegiatura y punto de equilibrio operativo, por niño al mes',
    'Monthly cash forecast': 'Pronóstico de caja mensual', 'Month': 'Mes', 'Spending': 'Gasto', 'Net': 'Neto', 'Cumulative': 'Acumulado',
    'Gap to break-even': 'Diferencia al punto de equilibrio', 'Total': 'Total',
    'Close': 'Cerrar', 'Back to the list': 'Volver a la lista', 'Preview': 'Vista previa', 'Download': 'Descargar', 'Open in a new tab': 'Abrir en otra pestaña', 'Open the interactive page': 'Abrir la página interactiva',
    'Every file behind the pilot plan. Preview here or download.': 'Cada archivo que respalda el plan piloto. Véalo aquí o descárguelo.',
    'Start here': 'Para empezar', 'Costs and cash': 'Costos y caja', 'Reference': 'Referencia', 'Reconciliation and evidence': 'Conciliación y evidencia', 'Text versions': 'Versiones en texto', 'Earlier file names': 'Nombres de archivo anteriores',
    'This browser opens PDFs in a new tab.': 'Este navegador abre los PDF en otra pestaña.',
    'This preview could not load. Use Download or open it in a new tab.': 'No se pudo cargar la vista previa. Use Descargar o ábrala en otra pestaña.',
    'Loading…': 'Cargando…', 'Documents are in English.': 'Los documentos están en inglés.',
    'Spanish is a draft translation; the English text governs.': 'El español es una traducción en borrador; prevalece el texto en inglés.'
  };
  // text with figures in it: the figures pass through untouched
  const PATTERNS = [
    [/^Planning model · (\w+) (\d+), (\d{4})$/, (m, mo, d, y) => `Modelo de planificación · ${d} de ${MONTHS[mo] || mo} de ${y}`],
    [/^Month (\d+)$/, (m, n) => `Mes ${n}`],
    [/^Month (\d+) snapshot$/, (m, n) => `Resumen del mes ${n}`],
    [/^Month (\d+), (\d+) children, cumulative cash deficit (.+)$/, (m, n, c, v) => `Mes ${n}, ${c} niños, déficit de caja acumulado ${v}`],
    [/^Draft monthly tuition (.+); operating break-even (.+) before building payments and debt$/, (m, a, b) => `Colegiatura mensual en borrador ${a}; punto de equilibrio operativo ${b} antes de pagos del edificio y deuda`],
    [/^(\d+) pages?$/, (m, n) => `${n} ${n === '1' ? 'página' : 'páginas'}`],
    [/^(\d+) lines$/, (m, n) => `${n} partidas`],
    [/^(\d+) months$/, (m, n) => `${n} meses`]
  ];
  const MONTHS = { January: 'enero', February: 'febrero', March: 'marzo', April: 'abril', May: 'mayo', June: 'junio', July: 'julio', August: 'agosto', September: 'septiembre', October: 'octubre', November: 'noviembre', December: 'diciembre' };
  const R = document.documentElement;
  const listeners = [];
  let lang = R.lang === 'es' ? 'es' : 'en';
  const t = (en) => {
    if (lang !== 'es' || en == null) return en;
    const s = String(en), core = s.trim();
    if (!core) return s;
    let out = Object.prototype.hasOwnProperty.call(ES, core) ? ES[core] : null;
    if (out == null) for (const [re, f] of PATTERNS) { const m = re.exec(core); if (m) { out = f(...m); break; } }
    return out == null ? s : s.replace(core, out);
  };
  const ATTRS = ['aria-label', 'alt', 'title', 'placeholder'];
  const textOrig = new WeakMap(), attrOrig = new WeakMap();
  const skip = (el) => !el || el.closest('[data-i18n-skip], script, style, [data-en]');
  function apply(root = document.body) {
    if (!root) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (skip(n.parentElement) || !/[A-Za-zÁÉÍÓÚáéíóúñ]/.test(n.nodeValue)) continue;
      if (!textOrig.has(n)) textOrig.set(n, n.nodeValue);
      const en = textOrig.get(n), v = t(en);
      if (n.nodeValue !== v) n.nodeValue = v;
    }
    for (const el of root.querySelectorAll(ATTRS.map((a) => `[${a}]`).join(','))) {
      if (el.closest('[data-i18n-skip]')) continue;
      let o = attrOrig.get(el); if (!o) { o = {}; attrOrig.set(el, o); }
      for (const a of ATTRS) { if (!el.hasAttribute(a)) continue; if (!(a in o)) o[a] = el.getAttribute(a); const v = t(o[a]); if (el.getAttribute(a) !== v) el.setAttribute(a, v); }
    }
    for (const el of root.querySelectorAll('[data-en]')) el.textContent = t(el.dataset.en);
    if (!R.dataset.titleEn) R.dataset.titleEn = document.title;
    document.title = t(R.dataset.titleEn);
  }
  // set(el, english): script-written text that follows the language
  function set(el, en) { if (!el) return; el.dataset.en = en; el.textContent = t(en); }
  // a label that later code changes (aria-label): remember the English and translate
  function setAttr(el, name, en) { if (!el) return; let o = attrOrig.get(el); if (!o) { o = {}; attrOrig.set(el, o); } o[name] = en; el.setAttribute(name, t(en)); }
  function setLang(next, remember) {
    lang = next === 'es' ? 'es' : 'en';
    R.lang = lang;
    if (remember) { try { localStorage.setItem('ff-lang', lang); } catch (e) { /* blocked storage: this page load only */ } }
    apply();
    for (const b of document.querySelectorAll('[data-lang]')) b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
    listeners.forEach((f) => { try { f(lang); } catch (e) { /* a listener must not stop the switch */ } });
  }
  window.FFInvI18n = Object.freeze({ t, set, setAttr, apply, setLang, lang: () => lang, onChange: (f) => listeners.push(f), has: (en) => Object.prototype.hasOwnProperty.call(ES, String(en).trim()) });
  const start = () => {
    for (const b of document.querySelectorAll('[data-lang]')) b.addEventListener('click', () => setLang(b.dataset.lang, true));
    setLang(lang, false);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})();
