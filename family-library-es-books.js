/* Spanish (DRAFT) for the five Story Time books. Every string is a draft translation pending review by the center's Spanish
   teacher (native speaker). Merged over family-library-data.js by family-library.js when the site language is Spanish:
   same keys and same array order as the English; any field left out falls back to English. The four friends' books carry
   rev: '2026-10-07': they translate the revised editions (re-translated 2026-10-10), and family-library.js merges a book only when its
   rev matches the English rev, so an older translation can never sit on newer pages. */
(function () {
'use strict';
const ES = window.FFFamilyES = window.FFFamilyES || {};
ES.books = {
  "booker-tries-again": {
    "title": "Booker lo intenta otra vez",
    "sub": "Un cuento sobre practicar y pedir ayuda",
    "rev": "2026-10-07",
    "src": "Edición digital revisada (7 de octubre de 2026), texto e ilustraciones",
    "refrain": "Respiro grande. Corazón valiente. ¡Puedo intentarlo otra vez!",
    "gesture": "Mano en el pecho para “respiro grande”, puño sobre el corazón para “corazón valiente” y pulgar arriba para “intentarlo otra vez”.",
    "log": "Booker encuentra un libro nuevo con una palabra que todavía no sabe. Lumi lo ayuda a mirar las cuatro letras de k-i-t-e, donde la e callada ayuda a la i a decir su nombre, y la leen juntos. Luego Booker invita a su hermanita a la hora del cuento, aunque ella todavía no sabe leer.",
    "coverAlt": "Booker en el Área de lectura, sonriendo con su libro nuevo, que tiene una cometa roja en la portada.",
    "back": "A Booker le encantan los libros. Pero el libro nuevo de hoy tiene una palabra que todavía no sabe. Respira hondo y busca tu corazón valiente mientras Booker practica, pide ayuda y lo intenta otra vez.",
    "goals": [
      "Mirar todas las letras de una palabra, no solo la primera.",
      "Decir cada sonido y luego unir los sonidos para formar una palabra: /k/ /ī/ /t/, kite (cometa).",
      "Notar un sentimiento de frustración, pedir ayuda y usar palabras valientes para seguir adelante.",
      "Disfrutar los libros juntos, incluso antes de saber leer las palabras."
    ],
    "spreads": [
      {
        "p": "Este es Booker. A Booker le encantan los libros. ¡Libros grandes, libros chiquitos y libros con solapas que hacen flip!",
        "pic": "Booker de pie sobre la alfombra azul del Área de lectura, con un libro de solapas abierto del que se asoma un conejito.",
        "q": [
          "D",
          "¿Qué libros te gustan más? ¿Los grandes, los chiquitos o los que tienen solapas?"
        ],
        "w": [
          "solapa",
          "una puertita de papel en el libro que levantas para ver qué hay debajo"
        ]
      },
      {
        "p": "Una mañana, Booker encontró un libro nuevo con una cometa roja y brillante en la portada. “¡Quiero intentar leer este!”, dijo.",
        "pic": "Booker estirándose para tomar del estante un libro nuevo con una cometa roja en la portada.",
        "q": [
          "O",
          "Booker quiere intentar leer el libro nuevo. ¿Qué crees que va a pasar?"
        ],
        "w": [
          "intentar",
          "probar a hacer algo, aunque sea nuevo"
        ]
      },
      {
        "p": "Booker abrió el libro. En la página había una palabra grande. Booker la miró. “¿Qué dirá ahí?”",
        "pic": "Booker sentado en la alfombra con el libro de la cometa abierto en las piernas, que muestra la palabra grande KITE junto al dibujo de una cometa roja.",
        "q": [
          "W",
          "¿Encuentras la palabra grande en la página de Booker? Pon tu dedo debajo."
        ],
        "w": [
          "palabra",
          "letras juntas que dicen algo"
        ],
        "b": "Señala y lee: pasen el dedo juntos debajo del título del libro, de izquierda a derecha."
      },
      {
        "p": "“¡Cat!”, adivinó Booker. Luego volvió a mirar. La palabra empezaba con k, no con c. Booker agachó las orejas. “Todavía no sé esta palabra.”",
        "pic": "Booker sentado en la alfombra con las orejas agachadas y cara de preocupación, mirando el libro de la cometa abierto.",
        "q": [
          "O",
          "¿Cómo crees que se siente Booker ahora? ¿Qué hicieron sus orejas?"
        ],
        "w": [
          "adivinó",
          "dijo lo que pensaba antes de saberlo con seguridad"
        ],
        "b": "Haz orejas caídas con las manos. ¡Ahora levántalas de un salto!"
      },
      {
        "p": "Lumi se sentó cerquita. “Las cosas nuevas pueden sentirse difíciles”, dijo. “Podemos practicar juntos.” Booker respiró. “Respiro grande. Corazón valiente. ¡Puedo intentarlo otra vez!”",
        "pic": "Lumi sentada muy cerca de Booker en la alfombra. Booker respira hondo, con los ojos cerrados y una pata sobre el corazón.",
        "q": [
          "C",
          "Haz una pausa antes del final: “Respiro grande. Corazón valiente. ¡Puedo intentarlo otra...” y deja que tu peque diga “¡vez!”."
        ],
        "w": [
          "practicar",
          "hacer algo una y otra vez para que se vuelva más fácil"
        ],
        "b": "Hagan el saludo valiente: mano en el pecho, puño sobre el corazón, pulgar arriba."
      },
      {
        "p": "Booker miró el dibujo. Una cometa roja volaba en el cielo. “Yo sé lo que es una cometa”, dijo. “Ahora miremos las letras.”",
        "pic": "Booker en la alfombra con el libro abierto, mirando de cerca el dibujo de una cometa roja que vuela en el cielo azul.",
        "q": [
          "W",
          "¿Qué hay en el dibujo? ¿Qué sabes de las cometas?"
        ],
        "w": [
          "cometa",
          "un juguete que vuela con el viento al final de un hilo largo; en inglés se dice kite"
        ],
        "b": "Haz binoculares de pata con las manos y mira de cerca, como Booker."
      },
      {
        "p": "“La K hace el sonido /k/”, dijo Lumi. “Y en esta palabra, la e callada ayuda a la i a decir su nombre.” Booker miró las cuatro letras: k-i-t-e.",
        "pic": "Booker levantando el libro abierto para mostrar la palabra KITE, sonriendo mientras mira las cuatro letras.",
        "q": [
          "W",
          "Señalemos juntos las cuatro letras: k, i, t, e. ¿Qué letra está callada?"
        ],
        "w": [
          "letra",
          "una forma que usamos para escribir un sonido"
        ],
        "tip": "Di /k/ corto y seco, no “ka”. En kite, la i dice su nombre en inglés, /ī/ (suena como “ai”), y la e del final está callada."
      },
      {
        "p": "Juntos probaron los sonidos: /k/ … /ī/ … /t/. Luego los unieron: “¡Kite!” La e se quedó callada. Booker sonrió de oreja a oreja. “¡Leí la palabra!”",
        "pic": "Booker sentado en la alfombra con el libro abierto en las piernas, con la palabra KITE debajo del dibujo de una cometa roja.",
        "q": [
          "C",
          "Digan los sonidos juntos: /k/ ... /ī/ ... /t/. Ahora únanlos: ¡kite!"
        ],
        "w": [
          "unir",
          "juntar, para que los sonidos formen una sola palabra"
        ],
        "b": "Desliza una mano por tu otro brazo mientras dices cada sonido, y luego bájala rápido para decir la palabra completa."
      },
      {
        "p": "“¡KITE!”, celebró Booker. Zuri y Bop se acercaron. “¡Seguiste intentando!”, dijo Lumi. “Y pediste ayuda.”",
        "pic": "Booker sonriendo con el libro de la cometa en las piernas, mientras Bop y Zuri se sientan a su lado para celebrar.",
        "q": [
          "R",
          "¿Quiénes se acercaron? ¿Qué dijo Lumi que hizo Booker?"
        ],
        "w": [
          "celebró",
          "gritó de alegría"
        ],
        "b": "Celebra como Booker: “¡KITE!”"
      },
      {
        "p": "Booker pasó la página. ¡Cuatro palabras! Lumi lo ayudó con las que no sabía. Juntos leyeron: “Up goes the kite!” (“¡Arriba va la cometa!”). Y arriba subió la sonrisa de Booker.",
        "pic": "Booker de pie, muy derechito y con una gran sonrisa, mostrando la página que dice “Up goes the kite!” (“¡Arriba va la cometa!”).",
        "q": [
          "W",
          "Señala cada palabra conmigo: “Up... goes... the... kite!” ¿Cuántas palabras son?"
        ],
        "w": [
          "cuatro",
          "uno, dos, tres, cuatro"
        ]
      },
      {
        "p": "En la página siguiente había otra palabra nueva. Booker hizo una pausa. “¿Me ayudas con esta?”, preguntó. “Respiro grande. Corazón valiente. ¡Puedo intentarlo otra vez!”",
        "pic": "Booker de pie con una sonrisa valiente, con el libro en una pata y la otra pata sobre el corazón.",
        "q": [
          "R",
          "¿Qué hizo Booker cuando encontró otra palabra nueva?"
        ],
        "w": [
          "hizo una pausa",
          "se detuvo por un momento"
        ],
        "b": "Hagan el saludo valiente otra vez, un poquito más fuerte."
      },
      {
        "p": "Booker y Lumi les leyeron a sus amigos. Algunas palabras Booker las sabía. Otras las practicaron juntos. Página por página, el cuento cobró vida.",
        "pic": "Booker leyendo en voz alta en la alfombra mientras Lumi, Bop y Zuri se sientan cerquita a escucharlo.",
        "q": [
          "O",
          "¿Qué crees que quiere decir “el cuento cobró vida”?"
        ],
        "w": [
          "página por página",
          "una página, luego la siguiente, y luego la siguiente"
        ]
      },
      {
        "p": "Junto a la puerta, la hermanita de Booker tenía un libro. “Yo todavía no sé leer”, dijo ella. “Está bien”, dijo Booker. “Podemos disfrutar un libro juntos.”",
        "pic": "Booker arrodillado junto a su hermanita en la puerta. Ella abraza un librito de la cometa.",
        "q": [
          "O",
          "La hermanita de Booker todavía no sabe leer. ¿Cómo la ayuda Booker a sentirse bienvenida?"
        ],
        "w": [
          "disfrutar",
          "pasarla bien haciendo algo que te gusta"
        ]
      },
      {
        "p": "Se sentaron lado a lado. Hablaron de los dibujos y escucharon mientras Lumi leía. “Respiro grande. Corazón valiente”, dijo Booker. “¡Podemos aprender juntos!”",
        "pic": "Booker y su hermanita sentados lado a lado en la alfombra, compartiendo el libro de la cometa y sonriendo.",
        "q": [
          "D",
          "¿Con quién te gusta compartir un libro? ¿De qué te gusta hablar?"
        ],
        "w": [
          "lado a lado",
          "uno justo al lado del otro"
        ],
        "b": "Díganlo juntos, con los gestos: “Respiro grande. Corazón valiente. ¡Podemos aprender juntos!”"
      }
    ],
    "guide": [
      {
        "t": "Hablemos del cuento",
        "blocks": [
          [
            "Observa",
            "¿Cómo se sintió Booker cuando encontró una palabra que no sabía?"
          ],
          [
            "Recuerda",
            "¿Quién ayudó a Booker? ¿Qué practicaron juntos?"
          ],
          [
            "Conecta",
            "¿Cuándo le has pedido a alguien que te ayude a aprender?"
          ],
          [
            "Prueben la frase",
            "Respiro grande. Corazón valiente. ¡Puedo intentarlo otra vez!"
          ]
        ]
      },
      {
        "t": "Practica con una persona adulta",
        "blocks": [
          [
            "Empiecen poco a poco",
            "Escojan una palabra con sonidos que tu peque ya aprendió, como cat (gato). Señala cada letra: /k/ /a/ /t/. Unan los sonidos: cat."
          ],
          [
            "Miren todas las letras",
            "La primera letra sola no nos dice la palabra completa. Enseña las letras o los patrones que tu peque no conoce antes de esperar que los lea."
          ],
          [
            "Sobre kite",
            "En kite (cometa), i_e escribe el sonido largo de la i. Digan /k/ /ī/ /t/ y luego únanlos. La e está callada. Este patrón hay que enseñarlo; no es igual que en cat."
          ],
          [
            "Disfruten el significado",
            "Después de leer una palabra, hablen de lo que quiere decir. Los dibujos nos ayudan a entender el cuento."
          ]
        ]
      },
      {
        "t": "Para familias y educadores",
        "blocks": [
          [
            "Compartan la lectura",
            "Este es un cuento para leer en voz alta, no un libro para principiantes que se pueda descifrar por completo. Léanlo juntos; ofrece ayuda sin convertir la lectura en un examen."
          ],
          [
            "Celebren la práctica",
            "Di: “Miraste las letras” o “Pediste ayuda”. Deja que tu peque escuche, cuente el cuento con los dibujos o se una a una frase conocida."
          ],
          [
            "Que todos se sientan bienvenidos",
            "La hermana de Booker forma parte de la hora del cuento antes de saber leer palabras. Disfrutar los libros también es parte de aprender."
          ],
          [
            "Conozcan a los Futures Friends",
            "Booker practica. Lumi escucha. Bop ayuda. Zuri hace preguntas. Cada quien aprende a su propio ritmo."
          ]
        ]
      }
    ],
    "talk": [
      "¿Cómo se sintió Booker cuando encontró una palabra que no sabía?",
      "¿Quién ayudó a Booker? ¿Qué practicaron juntos?",
      "¿Cuándo le has pedido a alguien que te ayude a aprender?",
      "Digamos juntos la frase: “Respiro grande. Corazón valiente. ¡Puedo intentarlo otra vez!”"
    ],
    "tip": "Haz el sonido /k/ corto y seco, no “ka”. En kite, i_e escribe el sonido largo de la i (en inglés, /ī/, que suena como “ai”): digan /k/ /ī/ /t/ y luego únanlos. La e está callada. Este es un cuento para leer en voz alta, no un examen de lectura.",
    "act": {
      "t": "Miren todas las letras",
      "min": 5,
      "mat": [
        "Papel",
        "Un crayón o un marcador"
      ],
      "steps": [
        "Escribe una palabra cuyos sonidos tu peque ya conoce, como CAT (gato). Señala cada letra y di su sonido: /k/ /a/ /t/.",
        "Unan los sonidos: “cat”. Pasa el dedo debajo de toda la palabra mientras la dices.",
        "Escribe KITE (cometa). Señala las cuatro letras y di: “En kite, la e callada ayuda a la i a decir su nombre”.",
        "Digan juntos /k/ /ī/ /t/ y luego únanlos: “kite”. La e se queda callada.",
        "Hablen de lo que es una cometa. Luego digan juntos las palabras de Booker: “Respiro grande. Corazón valiente. ¡Puedo intentarlo otra vez!”"
      ],
      "adapt": "Con niños de 2 años, disfruten los dibujos y nómbrenlos juntos; leer palabras puede esperar. Con niños de 4 y 5 años, enséñales otra palabra con el mismo patrón, como bike (bicicleta) o time (tiempo), y luego léanla juntos."
    },
    "home": "Cuando algo se sienta difícil esta noche, respiren hondo juntos y digan las palabras de Booker: “Respiro grande. Corazón valiente. ¡Puedo intentarlo otra vez!”"
  },
  "big-feelings-brighter-days": {
    "title": "Sentimientos grandes de Lumi, días más brillantes",
    "sub": "Un cuento sobre notar, escuchar e invitar",
    "rev": "2026-10-07",
    "src": "Edición digital revisada (7 de octubre de 2026), texto e ilustraciones",
    "refrain": "Mira. Escucha. Echa una mano.",
    "gesture": "Señala tus ojos para “mira”, haz conchita con las manos en las orejas para “escucha” y extiende la mano abierta para “echa una mano”.",
    "log": "Lumi nota que Pip, el pequeño erizo nuevo, está en silencio junto a la cerca durante el juego del Desfile. En lugar de decidir cómo se siente Pip, Lumi le pregunta. Una respiración lenta la ayuda a sentirse lista aunque tenga la pancita temblorosa, y una invitación amable, al ritmo de Pip, ilumina el día de Pip.",
    "coverAlt": "Lumi, la conejita, en el patio soleado de la Casa Club, sonriendo, con una pata junto a su oreja larga.",
    "back": "Pip es nuevo en la Casa Club y está junto a la cerca. Lumi se pregunta si Pip quiere compañía, pero siente la pancita temblorosa. Respira con Lumi mientras pregunta con amabilidad, escucha y deja que Pip decida.",
    "goals": [
      "Notar las pistas del cuerpo y preguntarle a alguien cómo se siente en lugar de decidirlo por esa persona.",
      "Usar palabras para invitar: “¿Quieres compañía?”",
      "Probar una respiración suave de flor y vela de mentiritas, y saber que está bien parar.",
      "Respetar el “tal vez” y el “todavía no”, y hacerle lugar a un amigo a su propio ritmo."
    ],
    "spreads": [
      {
        "p": "Esta es Lumi. Lumi tiene orejas largas para escuchar y ojos grandes para mirar. A Lumi le gusta notar cómo podrían sentirse sus amigos.",
        "pic": "Lumi de pie en el patio soleado de la Casa Club, con una pata junto a su oreja larga, sonriendo.",
        "q": [
          "W",
          "¿Para qué usa Lumi sus orejas largas? ¿Y sus ojos grandes?"
        ],
        "w": [
          "notar",
          "ver algo y ponerle atención"
        ]
      },
      {
        "p": "Hoy los amigos jugaban al Desfile en el patio de la Casa Club. Booker tocaba el tambor. Bop pisaba fuerte. Zuri agitaba una bandera de hoja. “¡Marcha, marcha, marcha!”",
        "pic": "Un desfile alegre por el patio: Lumi aplaudiendo, Booker con un tambor, Bop pisando fuerte y Zuri agitando una gran bandera de hoja.",
        "q": [
          "R",
          "¿Qué hizo cada amigo en el desfile?"
        ],
        "w": [
          "desfile",
          "una fila de amigos que marchan y hacen música"
        ],
        "b": "Marchen en su lugar: “¡Marcha, marcha, marcha!”"
      },
      {
        "p": "Junto a la cerca estaba Pip, el pequeño erizo nuevo. Pip no marchaba ni cantaba. Lumi se preguntó si Pip quería compañía.",
        "pic": "Lumi se detiene junto a Pip, el pequeño erizo nuevo, que está junto a la cerca mirando hacia abajo.",
        "q": [
          "O",
          "¿Qué está haciendo Pip? ¿Qué te preguntas sobre Pip?"
        ],
        "w": [
          "compañía",
          "alguien con quien estar, para no estar solo"
        ]
      },
      {
        "p": "Lumi miró con sus ojos. Pip tenía la cabeza abajo. Pip tenía las patas bien recogidas. Lumi escuchó con sus orejas. Pip soltó un suspiro chiquitito.",
        "pic": "Pip sentado junto a la cerca, con la cabeza abajo y las patas recogidas, mientras Lumi lo mira con dulzura desde cerca.",
        "q": [
          "W",
          "Muéstrame cómo estaba el cuerpo de Pip: cabeza abajo, patas bien recogidas."
        ],
        "w": [
          "suspiro",
          "un aire largo y lento que sueltas"
        ],
        "b": "Escucha como Lumi: cierra los ojos y nombra un sonido que oigas ahora mismo."
      },
      {
        "p": "“Tal vez Pip se siente sin compañía”, pensó Lumi. “O le da timidez. Puedo preguntar.” Mira. Escucha. Echa una mano.",
        "pic": "Lumi de pie cerca de Pip, con una pata abierta y amable, preguntándose cómo se siente Pip.",
        "q": [
          "C",
          "Haz una pausa antes del final: “Mira. Escucha. Echa una...” y deja que tu peque diga “¡mano!”."
        ],
        "w": [
          "timidez",
          "cuando no sabes bien si unirte o hablar con alguien nuevo"
        ],
        "b": "Hagan los gestos: señalen sus ojos, hagan conchita en las orejas, extiendan la mano abierta."
      },
      {
        "p": "Lumi quería ayudar, pero sentía la pancita temblorosa. ¿Y si Pip decía que no? “Puedo preguntar con amabilidad”, se dijo. “Pip puede decidir.”",
        "pic": "Lumi junto a la cerca blanca, con las patas en la pancita y una carita insegura.",
        "q": [
          "D",
          "Lumi siente la pancita temblorosa. ¿Dónde lo sientes tú cuando estás nervioso o nerviosa?"
        ],
        "w": [
          "decidir",
          "escoger tú mismo o tú misma"
        ]
      },
      {
        "p": "Primero, Lumi fue al Rincón de calma. Se sentó en un cojín rosado y suavecito y puso una pata en la pancita. Se tomó su tiempo.",
        "pic": "Lumi sentada sobre un gran cojín rosado y suave en el acogedor Rincón de calma, con una pata en la pancita.",
        "q": [
          "D",
          "¿Qué lugar acogedor de nuestra casa te sirve para tomarte tu tiempo?"
        ],
        "w": [
          "cojín",
          "una almohada suave para sentarse"
        ],
        "b": "Pon una mano en tu pancita y quédate quieto o quieta un momento, como Lumi."
      },
      {
        "p": "“Huele la flor”, susurró Lumi, tomando aire con suavidad. “Sopla la vela de mentiritas”, dijo, soltando el aire despacio. Adentro… y afuera.",
        "pic": "Lumi en el Rincón de calma oliendo una flor rosada, con una vela de fieltro de mentiritas a su lado.",
        "q": [
          "C",
          "Lean despacio y respiren juntos, si tu peque quiere. Deja que tu peque diga “Sopla la...” “¡vela de mentiritas!”."
        ],
        "w": [
          "con suavidad",
          "de manera suave y lenta"
        ],
        "b": "Huele la flor (toma aire), sopla la vela de mentiritas (suelta el aire). Respiren con comodidad; está bien parar."
      },
      {
        "p": "Lumi todavía se sentía un poquito nerviosa. Pero se sentía lista para intentarlo. Mira. Escucha. Echa una mano. ¡Y allá fue, saltando!",
        "pic": "Lumi saliendo a saltos del Rincón de calma por el caminito del jardín, con las orejas arriba.",
        "q": [
          "W",
          "Lumi todavía se siente un poquito nerviosa. ¿Qué la ayuda a intentarlo de todos modos?"
        ],
        "w": [
          "nerviosa",
          "un sentimiento inquieto y tembloroso por algo nuevo"
        ]
      },
      {
        "p": "“Hola, Pip. ¿Quieres compañía?”, preguntó Lumi. Pip dijo que sí con la cabeza. “Quiero jugar, pero no sé jugar al Desfile.”",
        "pic": "Lumi junto a Pip en la cerca, extendiendo una pata amistosa mientras Pip escucha.",
        "q": [
          "R",
          "¿Qué le preguntó Lumi a Pip? ¿Qué quería Pip?"
        ],
        "w": [
          "invitar",
          "pedirle a alguien que se una a ti"
        ]
      },
      {
        "p": "“¿Quieres que te enseñe?”, preguntó Lumi. “Tal vez”, dijo Pip. “Siento la pancita temblorosa.” “Yo también la sentía así”, dijo Lumi. “Podemos tomarnos nuestro tiempo.”",
        "pic": "Dentro de la Casa Club, Pip se abraza con los dos brazos mientras Lumi está cerca, con cara amable y paciente.",
        "q": [
          "O",
          "Pip dijo “Tal vez”. ¿Qué podría ayudar a Pip a sentirse con ganas de empezar?"
        ],
        "w": [
          "tal vez",
          "ni sí ni no; todavía no estás seguro"
        ]
      },
      {
        "p": "“¿Quieres probar una respiración lenta conmigo?”, preguntó Lumi. Pip dijo que sí con la cabeza. Adentro… y afuera. Se sentaron juntos. “Ahora me gustaría intentar marchar”, dijo Pip.",
        "pic": "Lumi y Pip sentados lado a lado sobre una alfombra rosada, con los ojos cerrados, respirando despacio, con una flor y una vela de fieltro de mentiritas.",
        "q": [
          "R",
          "¿Qué hicieron Lumi y Pip juntos antes de que Pip intentara marchar?"
        ],
        "w": [
          "listo",
          "preparado para empezar"
        ],
        "b": "Si tu peque quiere, deja que te guíe en una respiración lenta."
      },
      {
        "p": "Lumi le enseñó a Pip los primeros pasos. Pip marchó a su lado. Booker tocó el tambor. Bop hizo lugar. Zuri agitó la bandera. ¡Marcha, marcha, marcha!",
        "pic": "El desfile por el caminito del jardín: Pip marchando al lado de Lumi, Booker con su tambor, y Bop y Zuri agitando una bandera de hoja.",
        "q": [
          "O",
          "¿Cómo crees que se siente Pip ahora?"
        ],
        "w": [
          "primeros pasos",
          "el comienzo de algo nuevo"
        ],
        "b": "Marchen juntos por el cuarto: “¡Marcha, marcha, marcha!”"
      },
      {
        "p": "Pip sonrió. “Me alegra que me hayas preguntado.” Lumi también sonrió. Mira. Escucha. Echa una mano. ¡Una invitación amable puede iluminar el día de alguien!",
        "pic": "Los amigos juntos bajo la luz tibia del atardecer afuera de la Casa Club, con Pip sonriendo en el medio.",
        "q": [
          "D",
          "¿A quién podrías invitar a jugar? ¿Qué palabras usarías?"
        ],
        "w": [
          "invitación",
          "pedirle con amabilidad a alguien que se una a ti"
        ]
      }
    ],
    "guide": [
      {
        "t": "Hablemos del cuento",
        "blocks": [
          [
            "Observa",
            "¿Qué vio y qué oyó Lumi cuando notó a Pip?"
          ],
          [
            "Escucha",
            "¿Cómo supo Lumi lo que Pip quería?"
          ],
          [
            "Conecta",
            "¿Alguna vez quisiste unirte a un juego pero no estabas seguro o segura? ¿Qué te ayudó?"
          ],
          [
            "Hagan lugar",
            "¿Cómo podría tu grupo darle la bienvenida a alguien nuevo?"
          ]
        ]
      },
      {
        "t": "Prueben una invitación amable",
        "blocks": [
          [
            "Pregunta",
            "Túrnense para decir: “¿Quieres jugar conmigo?” o “¿Quieres compañía?”"
          ],
          [
            "Escucha la respuesta",
            "Practiquen “Sí”, “Todavía no” y “No, gracias”. Un amigo amable puede decir: “Está bien. Puedes unirte cuando estés listo”."
          ],
          [
            "Ofrece opciones",
            "Prueben: “Podemos mirar primero, jugar juntos o buscar un juego más tranquilo”."
          ],
          [
            "Respiren con suavidad",
            "Si tu peque quiere, hagan como que huelen una flor y soplan una vela de mentiritas. Respiren con comodidad; está bien parar."
          ]
        ]
      },
      {
        "t": "Para familias y educadores",
        "blocks": [
          [
            "Los sentimientos son pistas",
            "Una voz bajita o la cabeza agachada pueden querer decir muchas cosas. Den el ejemplo con “Te noto callado. ¿Cómo te sientes?” en lugar de decidir por el niño o la niña."
          ],
          [
            "Cualquiera puede sentirse solo",
            "Un niño o una niña puede sentirse solo aunque tenga amigos. Escuchen cómo lo describe con sus propias palabras."
          ],
          [
            "La calma tiene muchas formas",
            "Respirar ayuda a algunos niños. Otros prefieren compañía tranquila, moverse o tiempo. Sentirse nervioso no quiere decir que un niño haya fallado."
          ],
          [
            "Mantengan abierta la invitación",
            "Puede que los niños miren antes de unirse. Respeten el “todavía no” y hagan un espacio para que pertenezcan, a su propio ritmo."
          ]
        ]
      }
    ],
    "talk": [
      "¿Qué vio y qué oyó Lumi cuando notó a Pip?",
      "¿Cómo supo Lumi lo que Pip quería?",
      "¿Alguna vez quisiste unirte a un juego pero no estabas seguro o segura? ¿Qué te ayudó?",
      "¿Cómo podría tu grupo darle la bienvenida a alguien nuevo?"
    ],
    "tip": "Respira con tu peque solo si quiere. Pregunta por los sentimientos en lugar de nombrarlos: “Te noto callado. ¿Cómo te sientes?”",
    "act": {
      "t": "Prueben una invitación amable",
      "min": 5,
      "mat": [
        "Nada más que ustedes",
        "Dos juguetes de peluche, si quieren"
      ],
      "steps": [
        "Túrnense para preguntar: “¿Quieres jugar conmigo?” o “¿Quieres compañía?”",
        "Practiquen las respuestas “Sí”, “Todavía no” y “No, gracias”. Un amigo amable dice: “Está bien. Puedes unirte cuando estés listo”.",
        "Ofrece opciones: “Podemos mirar primero, jugar juntos o buscar un juego más tranquilo”.",
        "Si tu peque quiere, hagan como que huelen una flor y soplan una vela de mentiritas. Respiren con comodidad; está bien parar."
      ],
      "adapt": "Con niños de 2 años, practiquen solo “Sí” y “Todavía no” con un juguete de peluche. Con niños de 4 y 5 años, actúen el cuento con dos juguetes y dejen que tu peque sea Lumi."
    },
    "home": "A la hora de dormir, pregunta: “¿Cómo te sentiste hoy?” y escucha las propias palabras de tu peque. Si tu peque quiere, huelan la flor y soplen juntos la vela de mentiritas."
  },
  "what-happens-if-we-try": {
    "title": "Zuri: ¿Qué pasa si lo intentamos?",
    "sub": "Un cuento sobre el hielo, el agua y preguntarse cosas",
    "rev": "2026-10-07",
    "src": "Edición digital revisada (7 de octubre de 2026), texto e ilustraciones",
    "refrain": "Me pregunto, me pregunto... ¿qué pasa si lo intentamos?",
    "gesture": "Tócate la barbilla para “me pregunto, me pregunto” y luego abre bien las dos manos para “¿qué pasa si lo intentamos?”.",
    "log": "Un cubito de hielo desaparece del porche soleado y solo deja un charquito. Zuri y sus amigos adivinan, preparan tres cubitos de hielo más o menos del mismo tamaño y observan con atención: el hielo se derrite cuando se calienta lo suficiente, y el agua se congela cuando se enfría lo suficiente. Sin ganador, solo lo que vieron, y una pregunta nuevecita.",
    "coverAlt": "Zuri, la tortuga, en un sendero soleado, con su sombrero y sus lentes, mostrando su brújula.",
    "back": "¡Plinc! Un cubito de hielo desaparece del porche soleado. ¿Se lo comió el sol? ¿Se escapó? Pregúntate cosas con Zuri mientras ella adivina, observa lo que pasa de verdad y hace una pregunta nuevecita.",
    "goals": [
      "Adivinar y luego observar con atención para descubrirlo.",
      "Notar que el hielo se derrite y se vuelve agua cuando se calienta lo suficiente, y que el agua se congela cuando se enfría lo suficiente.",
      "Comparar lo que ves sin escoger un ganador: contar lo que pasó de verdad.",
      "Hacer una pregunta nueva y probarla con una persona adulta."
    ],
    "spreads": [
      {
        "p": "Esta es Zuri. Zuri tiene un sombrero para los días de sol, una brújula para encontrar el camino y una cabeza llena de preguntas.",
        "pic": "Zuri en un sendero soleado junto a un letrero, con su sombrero y sus lentes, y su brújula en la mano.",
        "q": [
          "W",
          "¿Qué lleva Zuri? ¿Para qué le podría servir cada cosa?"
        ],
        "w": [
          "brújula",
          "una herramienta que te muestra hacia dónde ir"
        ]
      },
      {
        "p": "Era una mañana calurosa y soleada en la Casa Club. Bop llevaba un tazón de hielo para tener agua fresquita. ¡Clin, clin, clin!",
        "pic": "Bop en el porche soleado de la Casa Club, llevando un tazón lleno de cubitos de hielo.",
        "q": [
          "W",
          "¿Qué lleva Bop? ¿Qué sonido hace el hielo?"
        ],
        "w": [
          "hielo",
          "agua que se puso tan fría que se volvió dura"
        ],
        "b": "Sacude un tazón de hielo de mentiritas: ¡clin, clin, clin!"
      },
      {
        "p": "¡Plinc! Un cubito de hielo saltó del tazón. Se deslizó por el porche soleado y se detuvo junto a los escalones.",
        "pic": "Un cubito de hielo deslizándose por el piso del porche mientras Bop y Zuri lo miran con sorpresa.",
        "q": [
          "O",
          "¿Adónde crees que va a ir el cubito de hielo?"
        ],
        "w": [
          "porche",
          "un piso con techo, justo afuera de una puerta"
        ]
      },
      {
        "p": "Más tarde, Zuri fue a buscarlo. ¡El cubito de hielo ya no estaba! Un charquito brillaba junto a los escalones. “¿Adónde se fue el hielo?”, preguntó.",
        "pic": "Zuri y Bop mirando un charquito en el porche, donde antes estaba el cubito de hielo.",
        "q": [
          "W",
          "¿Qué encontró Zuri donde antes estaba el cubito de hielo?"
        ],
        "w": [
          "charquito",
          "una pocita de agua"
        ]
      },
      {
        "p": "“¡A lo mejor el sol se lo comió!”, dijo Booker. “¡A lo mejor se escapó!”, dijo Bop. “A lo mejor se calentó y se derritió”, dijo Lumi.",
        "pic": "Booker, Bop, Lumi y Zuri reunidos en el porche alrededor del charquito, cada uno con una idea.",
        "q": [
          "R",
          "¿Qué pensó cada amigo que le pasó al hielo?"
        ],
        "w": [
          "se derritió",
          "pasó de ser hielo duro a ser agua"
        ]
      },
      {
        "p": "Zuri se quedó pensando. “¿Cómo podríamos descubrirlo?” Los amigos juntaron tres cubitos de hielo más o menos del mismo tamaño. “Me pregunto, me pregunto... ¿qué pasa si lo intentamos?”",
        "pic": "Los cuatro amigos en una mesa con tres cubitos de hielo más o menos del mismo tamaño, cada uno en su propio platito.",
        "q": [
          "C",
          "“Me pregunto, me pregunto... ¿qué pasa si lo...” Deja que tu peque diga “¿intentamos?”."
        ],
        "w": [
          "del mismo tamaño",
          "igual de grandes"
        ],
        "b": "Tócate la barbilla para “me pregunto, me pregunto” y luego abre bien las manos."
      },
      {
        "p": "Zuri puso un cubito junto a la ventana soleada y otro en el rincón con sombra. “Vamos a probar un tercero en mi pata calientita”, dijo. “Observémoslos juntos.”",
        "pic": "Zuri señalando un cubito de hielo en un plato junto a la ventana soleada, con un segundo plato en el rincón con sombra.",
        "q": [
          "W",
          "¿Dónde puso Zuri los cubitos de hielo? ¿Qué lugar tiene sol? ¿Cuál tiene sombra?"
        ],
        "w": [
          "con sombra",
          "donde no da el sol, un poquito más fresco"
        ]
      },
      {
        "p": "“¿Cuál creen que se va a derretir más rápido?”, preguntó Zuri. Cada amigo adivinó. “Ahora vamos a observar qué pasa”, dijo.",
        "pic": "Zuri y sus amigos en una mesa con dos platos de hielo, y cada amigo adivinando.",
        "q": [
          "O",
          "¿Qué adivinas que le va a pasar a cada cubito de hielo? ¿Por qué?"
        ],
        "w": [
          "adivinar",
          "decir lo que crees que va a pasar, antes de descubrirlo"
        ]
      },
      {
        "p": "Zuri sostuvo el tercer cubito un ratito sobre un tazón. “¡Brrr!” Plic… plic… plic. “¡Miren! Se está haciendo más chiquito. ¡Tengo agua en la pata!”",
        "pic": "Zuri sosteniendo un cubito de hielo pequeño en la pata mientras sus amigos lo ven gotear.",
        "q": [
          "W",
          "¿Qué le pasó al hielo en la pata calientita de Zuri?"
        ],
        "w": [
          "gota",
          "un poquito de agua que cae"
        ],
        "b": "Dilo despacio, moviendo los dedos como gotitas: plic... plic... plic."
      },
      {
        "p": "El cubito de la ventana soleada también se estaba haciendo más chiquito. El cubito de la sombra había cambiado menos. Miraron con atención. “En lugares distintos, el hielo se puede calentar de forma distinta”, dijo Zuri.",
        "pic": "Los amigos inclinándose para mirar con atención los cubitos de hielo en sus platos.",
        "q": [
          "R",
          "¿Qué cubito había cambiado menos? ¿Dónde estaba?"
        ],
        "w": [
          "mirar con atención",
          "mirar con cuidado los detallitos"
        ]
      },
      {
        "p": "“Cuando el hielo se calienta lo suficiente, se derrite y se vuelve agua”, dijo Zuri. “¡Entonces el hielo no se escapó!”, se rio Bop. “¡Cambió!”",
        "pic": "Zuri y Booker frente a una tabla con dibujos del sol, un copo de nieve, hielo y agua.",
        "q": [
          "R",
          "¿Se escapó el hielo? ¿Qué le pasó?"
        ],
        "w": [
          "cambió",
          "se volvió diferente"
        ]
      },
      {
        "p": "“¿El agua puede volver a ser hielo?”, preguntó Zuri. “Me pregunto, me pregunto... ¿qué pasa si lo intentamos?” Nana Hoot la ayudó a poner un vaso de agua en el congelador.",
        "pic": "Zuri mirando a Nana Hoot poner un vaso de agua en el congelador.",
        "q": [
          "O",
          "¿Qué crees que le va a pasar al agua en el congelador?"
        ],
        "w": [
          "congelador",
          "una caja muy fría que puede convertir el agua en hielo"
        ]
      },
      {
        "p": "A la mañana siguiente, revisaron el vaso. ¡Hielo duro y frío! “El congelador enfrió el agua lo suficiente para que se congelara”, dijo Nana Hoot. “¡Es hielo otra vez!”, celebró Zuri.",
        "pic": "Zuri y Nana Hoot frente al congelador abierto a la mañana siguiente, donde el vaso de agua se volvió hielo.",
        "q": [
          "R",
          "¿Qué le pasó al agua durante la noche?"
        ],
        "w": [
          "congelarse",
          "ponerse tan frío que el agua se vuelve dura, se vuelve hielo"
        ]
      },
      {
        "p": "“El hielo se puede derretir. El agua se puede congelar. ¡Y las preguntas nos ayudan a aprender!”, dijo Zuri. Luego sonrió. “Mañana me pregunto… ¿qué pasa si congelamos arándanos?”",
        "pic": "Los amigos alrededor de una mesita con un tazón de arándanos, listos para una pregunta nueva.",
        "q": [
          "D",
          "¿Qué te gustaría preguntarte y probar con una persona adulta?"
        ],
        "w": [
          "pregunta",
          "algo que preguntas para descubrirlo"
        ]
      }
    ],
    "guide": [
      {
        "t": "Hablemos del cuento",
        "blocks": [
          [
            "Observa",
            "¿Qué encontró Zuri donde antes estaba el cubito de hielo que se cayó?"
          ],
          [
            "Recuerda",
            "¿Qué cambió cuando el hielo se derritió? ¿Qué cambió en el congelador?"
          ],
          [
            "Piensa como Zuri",
            "¿Los amigos solo adivinaron o buscaron pruebas?"
          ],
          [
            "Sigue preguntándote cosas",
            "¿Qué te gustaría probar con una persona adulta?"
          ]
        ]
      },
      {
        "t": "Investiguen el hielo",
        "blocks": [
          [
            "Prepárenlo juntos",
            "Con una persona adulta, escojan tres cubitos de hielo parecidos. Pongan uno en un plato junto a una ventana soleada y otro en un plato a la sombra. Empiecen al mismo tiempo."
          ],
          [
            "Prueben el tercer cubito",
            "Sostenlo un ratito en la mano sin guante sobre un tazón. Para si se siente incómodo; ponlo en el tazón y fíjate en el cambio. No lo sigas sosteniendo hasta que se derrita por completo."
          ],
          [
            "Observen y comparen",
            "Primero adivinen. Revisen a los mismos tiempos, por ejemplo cada dos minutos. Describan o dibujen los cambios. Sus resultados pueden ser distintos de los de Zuri."
          ],
          [
            "Hagan otra pregunta",
            "¿Qué cubito cambió más? ¿Qué siguió igual? ¿Qué podríamos probar después? Nunca prueben el agua del experimento."
          ]
        ]
      },
      {
        "t": "Para familias y educadores",
        "blocks": [
          [
            "Sigan las pruebas",
            "Este cuento compara cambios observados; no declara un ganador. Las condiciones afectan cómo se derrite el hielo. Dejen que los niños cuenten lo que de verdad ven."
          ],
          [
            "Que la comparación tenga sentido",
            "Usen cubitos de tamaño parecido y empiecen al mismo tiempo. Mantengan parecidos los dos platos. Si el cubito de la mano pasa al tazón, anoten ese cambio."
          ],
          [
            "Expliquen con claridad",
            "El hielo se derrite cuando recibe suficiente calor. El agua se congela cuando se enfría lo suficiente. Un cuarto fresco, por sí solo, no necesariamente congela el agua."
          ],
          [
            "Amplíenlo con una persona adulta",
            "Congelen un poquito de agua en un vaso apto para el congelador, dejando espacio para que se expanda. Revísenlo juntos más tarde. Hagan lugar para preguntas nuevas."
          ]
        ]
      }
    ],
    "talk": [
      "¿Qué encontró Zuri donde antes estaba el cubito de hielo que se cayó?",
      "¿Qué cambió cuando el hielo se derritió? ¿Qué cambió en el congelador?",
      "¿Los amigos solo adivinaron o buscaron pruebas?",
      "¿Qué te gustaría probar con una persona adulta?"
    ],
    "tip": "Toda respuesta es una buena respuesta. Celebra que mire y describa (“¡Notaste que se hizo más chiquito!”) más que acertar. Sus resultados pueden ser distintos de los de Zuri, y eso está bien.",
    "act": {
      "t": "Investigación del hielo",
      "min": 10,
      "mat": [
        "Tres cubitos de hielo más o menos del mismo tamaño",
        "Dos platitos y un tazón",
        "Una ventana soleada y un lugar con sombra"
      ],
      "steps": [
        "Con una persona adulta, pongan un cubito de hielo en un plato junto a una ventana soleada y otro en un plato a la sombra. Empiecen al mismo tiempo.",
        "Primero adivinen: ¿qué le va a pasar a cada cubito?",
        "Sostén el tercer cubito un ratito en la mano sin guante sobre un tazón. Para si se siente incómodo y ponlo en el tazón.",
        "Revisen todos los cubitos a los mismos tiempos, por ejemplo cada dos minutos. Describan o dibujen lo que ven.",
        "Pregunten: ¿Qué cambió? ¿Qué siguió igual? ¿Qué podríamos probar después? Nunca prueben el agua del experimento."
      ],
      "adapt": "Con niños de 2 años, usen un solo cubito en un tazón y hablen de frío, mojado y más chiquito. Con niños de 4 y 5 años, dibujen los cubitos en cada revisión y comparen los dibujos."
    },
    "home": "Pon un cubito de hielo en un plato en casa y pregúntale a tu peque: “¿Qué crees que va a pasar?”. Luego observen juntos y hablen de lo que ven."
  },
  "clean-up-team": {
    "title": "El equipo de limpieza de Bop",
    "sub": "Un cuento sobre pasos pequeños y ayudar juntos",
    "rev": "2026-10-07",
    "src": "Edición digital revisada (7 de octubre de 2026), texto e ilustraciones; edición para el sitio web: la página 2 dice “A Bop le encanta moverse” (su papel de MOVERSE) en lugar de la frase retirada sobre su papel",
    "refrain": "Recógelo, guárdalo. ¡Pum, pum! ¡Plas, plas!",
    "gesture": "Pisa fuerte dos veces para “¡pum, pum!” y luego aplaude dos veces para “¡plas, plas!”. Primero deja el juguete.",
    "log": "Después de una gran mañana de juego, Bop ve el desorden más grande de la Casa Club. Empieza con una cosa pequeña, lo intenta otra vez cuando los libros se resbalan, le echa una mano a Zuri (y una trompa), y todo el equipo de limpieza termina el trabajo junto.",
    "coverAlt": "Bop, el elefante, en el cuarto de juegos de la Casa Club, sonriendo y mostrando un bloque rojo.",
    "back": "A Bop le encanta jugar en GRANDE. Pero cuando suena la campanita de recoger, Bop ve el desorden más grande del mundo. Pisa fuerte y aplaude, ¡pum, pum, plas, plas!, mientras Bop empieza con poquito, lo intenta otra vez y termina el trabajo con su equipo de limpieza.",
    "goals": [
      "Dividir un trabajo grande en pasos pequeños: empezar con una cosa.",
      "Usar etiquetas con dibujos para guardar cada juguete en su casa.",
      "Intentarlo otra vez cuando algo sale mal.",
      "Ofrecer ayuda y trabajar juntos como equipo."
    ],
    "spreads": [
      {
        "p": "Este es Bop. Bop es grande. Bop es fuerte. A Bop le encanta moverse. ¡Y a Bop le ENCANTA jugar!",
        "pic": "Bop sentado en la alfombra del cuarto de juegos, apilando bloques de colores junto a unos carritos de juguete.",
        "q": [
          "W",
          "¿Qué le encanta hacer a Bop? ¿A qué te encanta jugar a ti?"
        ],
        "w": [
          "jugar",
          "divertirse con juguetes, juegos y amigos"
        ],
        "b": "Pisa fuerte en tu lugar como Bop: ¡pum, pum!"
      },
      {
        "p": "Bop construyó una torre de bloques tan alta como un árbol. Hizo correr los carritos. ¡Brum, brum! Luego pintó un gran sol anaranjado.",
        "pic": "Bop junto a una torre alta de bloques, con carritos de juguete sobre una alfombra con carreteras y una pintura de un sol anaranjado sonriente.",
        "q": [
          "R",
          "¿Qué construyó Bop? ¿Qué pintó?"
        ],
        "w": [
          "torre",
          "algo construido muy alto"
        ],
        "b": "Haz correr un carrito de mentiritas con la mano: ¡brum, brum!"
      },
      {
        "p": "Bop jugó y jugó. Bloques por aquí. Carritos por allá. ¡Libros, pinceles y sombreros de disfraz por todas partes!",
        "pic": "Bop moviendo la trompa sobre un cuarto de juegos lleno de juguetes: bloques, carritos, libros, pinceles y sombreros de disfraz por todas partes.",
        "q": [
          "W",
          "¿Qué juguetes encuentras por todo el piso?"
        ],
        "w": [
          "por todas partes",
          "en cada lugar, por todos lados"
        ]
      },
      {
        "p": "¡Tilín, tilín! Nana Hoot tocó la campanita de recoger. “¡Hora de recoger, amigos!” Bop miró a su alrededor. Ay, ay, ay. Qué desorden tan, tan grande.",
        "pic": "Nana Hoot tocando la campanita de recoger mientras Bop mira a su alrededor el gran desorden.",
        "q": [
          "O",
          "¿Qué crees que va a hacer Bop ahora?"
        ],
        "w": [
          "campanita",
          "un sonido de campana que nos avisa que es hora de algo"
        ]
      },
      {
        "p": "“¡Es demasiado grande!”, dijo Bop. Bajó las orejas. Bajó la trompa. Se sentó con un ¡plof! triste. “¿Por dónde empiezo?”",
        "pic": "Bop sentado en el piso en medio del desorden, con las orejas y la trompa caídas.",
        "q": [
          "O",
          "¿Cómo se siente Bop? ¿Qué hicieron sus orejas y su trompa?"
        ],
        "w": [
          "bajar",
          "dejar caer hacia abajo"
        ],
        "b": "Haz un ¡plof! triste y luego siéntate bien derechito otra vez."
      },
      {
        "p": "Entonces Bop tuvo una idea. “Puedo empezar con una cosa.” Levantó un bloque. ¡Un pequeño comienzo!",
        "pic": "Bop en el piso entre los juguetes, señalando hacia arriba con una idea brillante y una sonrisa.",
        "q": [
          "R",
          "¿Qué idea tuvo Bop cuando el desorden se sentía demasiado grande?"
        ],
        "w": [
          "comienzo",
          "la primerísima parte de un trabajo"
        ]
      },
      {
        "p": "Cada juguete tenía su casa. La caja de los bloques tenía el dibujo de un bloque. Bop cantó: “Recógelo, guárdalo. ¡Pum, pum! ¡Plas, plas!” ¡Clonc, clonc, clonc!",
        "pic": "Bop guardando bloques uno por uno en una caja que tiene el dibujo de un bloque al frente.",
        "q": [
          "C",
          "Cántenlo juntos: “Recógelo, guárdalo. ¡Pum, pum! ¡Plas, plas!”"
        ],
        "w": [
          "casa",
          "el lugar donde va algo"
        ],
        "b": "Canten la canción de recoger con pisotones y aplausos. Deja el juguete antes de aplaudir."
      },
      {
        "p": "Después siguieron los libros. El estante tenía el dibujo de un libro. “Los libros van a su casa en el estante”, cantó Bop. “Uno a la vez. ¡Puedo intentarlo!”",
        "pic": "Bop poniendo un libro en el estante que tiene el dibujo de un libro.",
        "q": [
          "W",
          "¿Cómo supo Bop dónde van los libros?"
        ],
        "w": [
          "estante",
          "una tabla plana donde guardamos cosas"
        ]
      },
      {
        "p": "¡Uy! Los libros se resbalaron. ¡Plof, plof, plof! Bop lo intentó otra vez, un libro a la vez. Recógelo, guárdalo.",
        "pic": "Bop agachándose para recoger los libros que se resbalaron del estante.",
        "q": [
          "O",
          "Los libros se resbalaron. ¿Qué hizo Bop?"
        ],
        "w": [
          "uy",
          "una palabra que decimos cuando algo sale mal sin querer"
        ]
      },
      {
        "p": "Los carritos entraron a la canasta: ¡brum! Los sombreros se colgaron en sus ganchos. “Recógelo, guárdalo. ¡Pum, pum! ¡Plas, plas!”",
        "pic": "Bop metiendo carritos de juguete en una canasta, con los sombreros de disfraz colgados en sus ganchos detrás de él.",
        "q": [
          "W",
          "¿Dónde van los carritos? ¿Dónde van los sombreros?"
        ],
        "w": [
          "ganchos",
          "clavijas pequeñas en la pared para colgar cosas"
        ]
      },
      {
        "p": "Bop llevó los pinceles al lavabo. ¡Chap, chap! Luego se lavó las patas con agua y jabón, y también la puntita de la trompa.",
        "pic": "Bop en el lavabo, lavándose las patas y lavando los pinceles con jabón, salpicando agua.",
        "q": [
          "D",
          "¿Cuándo te lavas las manos con agua y jabón?"
        ],
        "w": [
          "jabón",
          "algo que hace burbujas y ayuda a quitar la suciedad"
        ],
        "b": "Haz como que te lavas las manos: por delante, por detrás y entre los dedos."
      },
      {
        "p": "Zuri tenía una montaña de piezas de rompecabezas. “¿Quieres una mano?”, preguntó Bop. “¡Yo tengo una trompa!” Zuri sonrió. “¡Sí, por favor!”",
        "pic": "Bop y Zuri en una mesa llena de piezas de rompecabezas, con Bop ofreciendo una pieza para ayudar.",
        "q": [
          "R",
          "¿Qué le preguntó Bop a Zuri? ¿Qué dijo Zuri?"
        ],
        "w": [
          "una mano",
          "un poco de ayuda"
        ]
      },
      {
        "p": "Booker, Lumi, Zuri y Bop ordenaron juntos. Recógelo, guárdalo. ¡Pum, pum! ¡Plas, plas! El equipo de limpieza estaba manos a la obra.",
        "pic": "Booker, Lumi, Zuri y Bop ordenando juntos, guardando juguetes en una canasta y cantando.",
        "q": [
          "C",
          "Canta con el equipo de limpieza: “Recógelo, guárdalo. ¡Pum, pum! ¡Plas, plas!”"
        ],
        "w": [
          "equipo",
          "amigos que trabajan juntos en un mismo trabajo"
        ],
        "b": "¡Pum, pum! ¡Plas, plas! con todo el equipo."
      },
      {
        "p": "Bop miró a su alrededor. Cada juguete estaba en su casa. “Empecé con un juguete”, dijo. “¡Terminamos juntos!” Pasos pequeños. Amigos que ayudan. ¡Un trabajo bien hecho!",
        "pic": "Bop, Booker, Lumi y Zuri de pie juntos en el cuarto de juegos ordenado, con cada juguete en su casa.",
        "q": [
          "D",
          "¿Quién ayuda a recoger en nuestra casa? ¿Cómo podríamos ser un equipo?"
        ],
        "w": [
          "juntos",
          "unos con otros, al mismo tiempo"
        ]
      }
    ],
    "guide": [
      {
        "t": "Hablemos del cuento",
        "blocks": [
          [
            "Observa",
            "¿Cómo se sintió Bop cuando vio todo el desorden?"
          ],
          [
            "Recuerda",
            "¿Cuál fue la primera cosa pequeña que hizo Bop?"
          ],
          [
            "Piensen juntos",
            "¿Qué intentó Bop cuando se cayeron los libros?"
          ],
          [
            "Celebren al equipo",
            "¿Quién ayudó a terminar el trabajo? ¿Cómo ayudaron?"
          ]
        ]
      },
      {
        "t": "Denle una casa a cada juguete",
        "blocks": [
          [
            "Escojan un trabajo pequeño",
            "Escojan un tipo de juguete para guardar. Empiecen con una sola cosa; agreguen más cuando tu peque esté listo o lista."
          ],
          [
            "Hagan una etiqueta con dibujo",
            "Dibujen o tómenles una foto a los juguetes que van en cada canasta. Pongan la etiqueta donde tu peque la pueda ver."
          ],
          [
            "Canten mientras trabajan",
            "Recógelo, guárdalo. ¡Pum, pum! ¡Plas, plas! Dejen el juguete antes de aplaudir o pisar fuerte."
          ],
          [
            "Ofrezcan ayuda",
            "Prueben: “Tú guardaste los bloques. Yo te ayudo con los libros”. Pedir ayuda es parte de aprender."
          ]
        ]
      },
      {
        "t": "Para familias y educadores",
        "blocks": [
          [
            "Dividan un trabajo grande en pasos pequeños",
            "En lugar de “Recoge todo”, prueben: “Vamos a guardar estos tres carritos en su canasta”. Pongan las casas de los juguetes donde se alcancen fácilmente."
          ],
          [
            "Creen una rutina compartida",
            "Avisen un poco antes de la hora de recoger. Usen la misma canción o campanita, y luego únanse cuando los niños necesiten apoyo."
          ],
          [
            "Elogien el esfuerzo",
            "Digan: “Encontraste la canasta de los carritos” o “Ayudaste a Zuri”. La meta es un hábito útil, no un cuarto perfecto."
          ],
          [
            "Que el trabajo en equipo se vea",
            "Bop empieza un trabajo y ayuda a una amiga. Todos aportan. La independencia y la cooperación pueden crecer juntas."
          ]
        ]
      }
    ],
    "talk": [
      "¿Cómo se sintió Bop cuando vio todo el desorden?",
      "¿Cuál fue la primera cosa pequeña que hizo Bop?",
      "¿Qué intentó Bop cuando se cayeron los libros?",
      "¿Quién ayudó a terminar el trabajo? ¿Cómo ayudaron?"
    ],
    "tip": "Canten la frase cada vez que aparezca, y dejen el juguete antes de pisar fuerte o aplaudir. A la hora de recoger de verdad, empiecen juntos con un trabajo pequeño.",
    "act": {
      "t": "Denle una casa a cada juguete",
      "min": 10,
      "mat": [
        "Los juguetes que estén fuera",
        "Dos o tres cajas, canastas o lugares en un estante",
        "Papel y un crayón, o la cámara de un teléfono"
      ],
      "steps": [
        "Escojan un tipo de juguete para guardar. Empiecen con una sola cosa; agreguen más cuando tu peque esté listo o lista.",
        "Dibujen o tómenles una foto a los juguetes que van en cada canasta, y pongan la etiqueta con el dibujo donde tu peque la pueda ver.",
        "Canten mientras trabajan: “Recógelo, guárdalo. ¡Pum, pum! ¡Plas, plas!” Dejen el juguete antes de aplaudir o pisar fuerte.",
        "Ofrece ayuda: “Tú guardaste los bloques. Yo te ayudo con los libros”. Pedir ayuda es parte de aprender."
      ],
      "adapt": "Con niños de 2 años, dales un juguete a la vez y señala su casa. Con niños de 4 y 5 años, deja que tu peque haga las etiquetas con dibujos y dirija la canción."
    },
    "home": "Denles una “casa” a los juguetes en casa con una etiqueta con dibujo, y canten “Recógelo, guárdalo. ¡Pum, pum! ¡Plas, plas!” a la hora de recoger."
  },
  'the-rainbow-picnic': {
    title: 'El pícnic del arcoíris',
    src: 'manuscrito v1.0 (octubre de 2026), edición para el sitio web: el papel de Bop se actualizó a MOVERSE y se cambió la última frase de Nana Hoot (sin afirmaciones sobre beneficios de los alimentos)',
    refrain: 'Distintas fortalezas... ¡JUNTOS!',
    gesture: 'Quien lee dice “Distintas fortalezas...” y tu peque grita “¡JUNTOS!” con los dos brazos arriba.',
    log: 'Nana Hoot les pide a los amigos que preparen un almuerzo arcoíris, con un alimento para cada color. Booker lee la receta, Zuri explora el huerto, Bop carga lo pesado y Lumi hace espacio para todos. Cuando llega una nube de lluvia, descubren lo que pueden hacer juntos.',
    back: 'Nana Hoot tiene una gran idea: ¡un almuerzo arcoíris para el Pícnic del Arcoíris! Booker lee, Zuri explora, Bop carga y Lumi hace espacio para todos. Cuando llega una nube de lluvia, los cuatro amigos descubren lo que pueden hacer juntos.',
    goals: ['Nombrar los colores del arcoíris y un alimento para cada uno.', 'Entender que los amigos tienen distintas fortalezas y que todas hacen falta.', 'Tomar turnos y repartir los trabajos; los adultos cortan y todos se lavan las manos.', 'Mantener la calma y resolver un problema juntos cuando los planes cambian.'],
    spreads: [
      { p: 'Cuatro amigos juegan en la Casa Club. Booker es valiente. Lumi es amable. Zuri es curiosa. Y a Bop le encanta moverse. Cuatro amigos, cuatro fortalezas distintas, una Casa Club grande y luminosa.', pic: 'Los cuatro amigos frente a la Casa Club, cada uno en su pose especial: libro, corazón, brújula, pisotón.', q: ['W', 'Señala a cada amigo. ¿Para qué es bueno cada uno?'], w: ['fortalezas', 'las cosas que haces bien'] },
      { p: '“¡Mañana es el Pícnic del Arcoíris!”, dijo Nana Hoot. “¿Pueden preparar un almuerzo arcoíris? ¡Un alimento para cada color del arcoíris!” Los amigos saltaron bien alto. “¡Sí! ¡Hagámoslo juntos!”', pic: 'Nana Hoot anunciando el pícnic mientras los cuatro amigos saltan de emoción.', q: ['O', '¿Qué es un almuerzo arcoíris? ¿Qué alimentos crees que van a encontrar?'], w: ['pícnic', 'una comida al aire libre, muchas veces sobre una manta'], b: 'Salta bien alto como los amigos: “¡Sí!”' },
      { p: 'Nana Hoot les dio una tarjeta con la receta. “¡Yo la puedo leer!”, dijo Booker. Señaló cada palabra, como hacen los lectores valientes. “Rojo. Anaranjado. Amarillo. Verde.” Luego venía una palabra larga y nueva.', pic: 'Booker sosteniendo una tarjeta de receta con dibujos y puntos de colores, señalando, mientras sus amigos miran por encima de sus hombros.', q: ['W', '¿Qué tiene Booker en la mano? ¿Qué señala?'], w: ['receta', 'los pasos que te dicen cómo preparar una comida'], b: 'Señala cada palabra de esta página mientras la lees, como Booker.' },
      { p: 'Respiro grande. Corazón valiente. “Pe... pi... no. ¡Pepino!”, leyó Booker. “Azul y morado. Blanco y café claro. ¡Ese es todo el arcoíris!” “Booker nos lee el camino”, dijo Lumi. “Distintas fortalezas...” “¡JUNTOS!”', pic: 'Booker levantando orgulloso la tarjeta de la receta mientras sus amigos gritan “¡Juntos!” con los brazos arriba.', q: ['C', 'Di “Distintas fortalezas...” y deja que tu peque grite “¡JUNTOS!” con los brazos arriba.'], w: ['valiente', 'que intenta algo aunque se sienta difícil'], b: 'Respira hondo como Booker y luego digan “pe-pi-no” despacito juntos.' },
      { p: 'Zuri abrió el camino hasta el huerto de la Casa Club. “Me pregunto dónde crecen las zanahorias”, dijo. Jaló unas hojitas verdes como plumas. ¡Pop! Salió una zanahoria anaranjada. “¡Crecen debajo de la tierra!”', pic: 'Zuri en el huerto sacando una zanahoria de hojas como plumas, con tierra que salta, y sus amigos mirando asombrados.', q: ['O', '¿Dónde crees que crecen las zanahorias? ¿Te sorprendió?'], w: ['huerto', 'un lugar donde la gente siembra plantas y alimentos'], b: 'Haz como que jalas una zanahoria de la tierra: jala, jala... ¡Pop!' },
      { p: 'Zuri se asomó debajo de las hojas y escarbó en la tierra. Encontró fresas rojas, maíz amarillo y un pepino verde, largo y con bolitas. “Zuri encuentra el camino”, dijo Booker. “Distintas fortalezas...” “¡JUNTOS!”', pic: 'Zuri levantando un pepino junto a matas de fresa y plantas de maíz mientras sus amigos celebran.', q: ['W', '¿Qué colores encontró Zuri? Nombra un alimento para cada uno.'], w: ['con bolitas', 'que no es liso, que tiene bultitos'] },
      { p: 'Pronto la canasta estaba llena y muy, muy pesada. “¡Yo la puedo cargar solito!”, dijo Bop. Pum, pum, pum, hasta la Cocina Arcoíris. ¡Talla, talla, chap! También lavó cada verdura.', pic: 'Bop cargando la canasta repleta sobre la espalda y la trompa, caminando con pisotones hacia la puerta de la cocina.', q: ['R', '¿Quién cargó la canasta pesada? ¿Cómo caminaba?'], w: ['pesada', 'difícil de levantar porque pesa mucho'], b: 'Pisa fuerte por el cuarto cargando una canasta de mentiritas: pum, pum, pum.' },
      { p: 'Luego todos se lavaron las patas con jabón y contaron hasta veinte. ¡Patas limpias, listos para cocinar! “Bop hace los trabajos grandes”, dijo Zuri. “Distintas fortalezas...” “¡JUNTOS!”', pic: 'Bop tallando verduras en el lavabo mientras los amigos hacen fila para lavarse las patas entre burbujas de jabón.', q: ['D', '¿Cuándo te lavas las manos? Contemos hasta veinte mientras hacemos como que nos tallamos.'], w: ['tallar', 'frotar fuerte para dejar algo limpio'], b: 'Frótense las manos y cuenten hasta veinte despacito.' },
      { p: 'Pero alguien se asomaba por la puerta de la cocina. Era Pip, el patito más pequeño de la Casa Club. “Quiero ayudar”, dijo Pip con una vocecita, “pero soy muy chiquito.”', pic: 'El pequeño Pip asomándose con timidez por el marco de la puerta de la cocina.', q: ['O', '¿Cómo crees que se siente Pip? ¿Alguna vez te has sentido demasiado chiquito o chiquita para ayudar?'], w: ['asomarse', 'mirar desde atrás de algo, solo un poquito'] },
      { p: 'Lumi sonrió. “Los ayudantes chiquitos son perfectos para los trabajos chiquitos. ¡Tú puedes servir la salsa de yogur con la cuchara!” Lumi se aseguró de que cada amigo tuviera un trabajo y un lugar. “Lumi hace espacio para todos”, dijo Bop. “Distintas fortalezas...” “¡JUNTOS!”', pic: 'Lumi dándole la bienvenida a Pip en un banquito junto a la mesa de la cocina, y dándole una cuchara y un tazón de salsa.', q: ['R', '¿Qué trabajo le dio Lumi a Pip?'], w: ['espacio', 'un lugarcito para que alguien se una'] },
      { p: 'Nana Hoot hizo los cortes de adulto con el cuchillo filoso. Los amigos hicieron lo demás. Untaron la salsa. Espolvorearon el maíz. Enrollaron rollitos arcoíris de tortilla integral. ¡Rueda, rueda, rueda!', pic: 'Nana Hoot cortando en su propia tabla mientras los amigos untan, espolvorean y enrollan los rollitos.', q: ['W', '¿Quién usó el cuchillo filoso? ¿Qué trabajos hicieron los amigos?'], w: ['espolvorear', 'dejar caer pedacitos por todo encima'], b: 'Hagan rodar las manos una y otra vez: “¡Rueda, rueda, rueda!”', tip: 'Hazle notar que Nana Hoot es quien corta. En las cocinas de verdad, los adultos usan los cuchillos.' },
      { p: 'Booker revisó la tarjeta de la receta. “Fresas rojas, zanahorias anaranjadas, maíz amarillo, pepino verde... ¡Ay, no!” Bajó las orejas. “¡No tenemos nada azul ni morado!” El arcoíris no estaba terminado.', pic: 'Booker mirando la tarjeta con cara de sorpresa junto a una fila de tazones con alimentos rojos, anaranjados, amarillos y verdes.', q: ['R', '¿Qué colores tenían? ¿Qué color faltaba?'], w: ['terminado', 'listo, sin que le falte nada'] },
      { p: '“Vi un arbusto junto a la cerca”, dijo Zuri. “Me pregunto...” Y allá fueron corriendo. ¡El arbusto estaba lleno de arándanos! Y muy cerca crecía un repollo morado, redondo como una pelota. “¡Ahora ya los tenemos todos!”', pic: 'Zuri y sus amigos junto a un arbusto de arándanos cerca de la cerca, y Bop levantando un repollo morado y redondo.', q: ['O', '¿Qué alimentos azules o morados conoces?'], w: ['repollo', 'una verdura grande y redonda hecha de hojas'] },
      { p: 'Bop extendió la manta grande debajo del roble. Lumi puso un lugar para cada amigo, grande y chiquito. Pip puso un vasito de salsa junto a cada plato. ¡El blanco y el café claro completaron el arcoíris!', pic: 'El pícnic listo debajo del roble: una manta de cuadros, un plato para cada amigo, vasitos de salsa, rollitos y tazones de colores.', q: ['W', '¿Puedes encontrar todos los colores en la manta del pícnic?'], w: ['completo', 'con todas sus partes'] },
      { p: 'Entonces una nube gris tapó el sol. Plic, plac. Plic, ploc. ¡Lluvia! “¡Ay, no, nuestro pícnic!”, gritó Pip. Las orejas, las alas y las colas de todos quedaron caídas.', pic: 'Una nube gris de fieltro suave tapando el sol, las primeras gotas de lluvia cayendo, y Pip con las alas arriba, asustado.', q: ['O', '¡Ay, ay, ay! ¿Qué crees que deberían hacer los amigos?'], w: ['caídas', 'colgando hacia abajo, como cuando te sientes triste'], b: 'Golpea suavecito tus piernas con los dedos como la lluvia: “Plic, plac. Plic, ploc.”' },
      { p: '“Huele la flor. Sopla la vela”, dijo Lumi. Todos respiraron con calma. Luego Bop levantó todo el pícnic y se fue pisando fuerte hasta el porche. Todos se apretujaron, acurrucados y secos.', pic: 'Todos apretujados en el porche techado con el pícnic, secos y sonriendo, mientras la lluvia cae más allá.', q: ['R', '¿Qué dijo Lumi para ayudar a todos a calmarse? Vamos a probarlo.'], w: ['acurrucados', 'calientitos, apretaditos y cómodos'], b: 'Huele la flor (toma aire despacio). Sopla la vela (suelta el aire despacio).' },
      { p: 'Pronto dejó de llover. El sol se asomó. ¡Y en el cielo se extendió un arcoíris gigante! “Miren”, dijo Zuri. “¡El cielo también hizo un almuerzo arcoíris!” Todos se rieron, y Pip hizo un cuac chiquito y feliz.', pic: 'Un gran arcoíris sobre el huerto, con los amigos en el porche señalando hacia arriba, maravillados.', q: ['W', 'Señala el arcoíris. ¿Puedes nombrar sus colores?'], w: ['se extendió', 'se estiró largo y ancho'], b: 'Dibuja un gran arcoíris en el aire con el brazo.' },
      { p: 'Comieron rojo, anaranjado, amarillo, verde, azul y morado, blanco y café claro. Cada color. Cada amigo. “¡Cada color, cada amigo!”, celebró Nana Hoot. Distintas fortalezas. Un mañana más brillante. ¡JUNTOS!', pic: 'Los amigos comiendo juntos sobre la manta al sol, con un arcoíris arriba y todos los colores en sus platos.', q: ['D', '¿Cuál es tu fortaleza? ¿Cómo la puedes usar para ayudar a tus amigos?'], w: ['mañana', 'el día que viene después de hoy'], b: 'Brazos arriba para la última palabra: “¡JUNTOS!”' }
    ],
    talk: ['¿Qué trabajo hizo cada amigo? ¿Booker? ¿Zuri? ¿Bop? ¿Lumi? ¿Pip?', '¿Qué hicieron los amigos cuando llegó la lluvia?', '¿Puedes nombrar un alimento para cada color del arcoíris?', '¿Cuál es tu fortaleza? ¿Cómo la puedes usar para ayudar a tus amigos?'],
    tip: 'Haz una pausa antes de cada “¡JUNTOS!” para que tu peque lo grite. En casa, los adultos son quienes cortan: los alimentos redondos, como los arándanos y las uvas, se cortan en pedacitos para los niños menores de 5 años.',
    act: { t: 'Cuenta tus colores', mat: ['La cena de esta noche, tal como la sirves siempre'], steps: ['En la cena, miren la mesa juntos y nombren los colores que ven.', 'Cuenten juntos los colores de sus platos. ¿Su familia encuentra tres colores? ¿Cuatro?', 'Pregunta: “¿Qué color casi se nos olvida?” y pregúntense juntos dónde podrían encontrarlo mañana.', 'Cuenten colores, nunca bocados. Cada color que notan es un triunfo arcoíris.'], adapt: 'Con los más pequeños, nombren un color y señálenlo. Con niños de 4 y 5 años, separen los alimentos en “crece arriba de la tierra” y “crece debajo de la tierra”.' },
    home: 'En la cena de esta noche, cuenten juntos los colores de su plato. ¿Su familia encuentra tres colores? ¿Cuatro?'
  }
};
})();
