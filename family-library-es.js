/* Spanish (DRAFT) for the Futures at Home library data: draft translations pending review by the center's Spanish teacher.
   Merged over family-library-data.js by family-library.js when the site language is Spanish. Arrays of records with an id are given
   as maps by id; other arrays keep the English order; any field left out falls back to English. */
(function () {
'use strict';
const ES = window.FFFamilyES = window.FFFamilyES || {};

ES.bands = {
  infant: { n: 'Bebés', age: 'Del nacimiento a los 12 meses' },
  toddler: { n: 'Niños pequeños (1 año)', age: 'De 12 a 24 meses' },
  twos: { n: 'De 2 años', age: '2 años' },
  threes: { n: 'De 3 años', age: '3 años' },
  prek: { n: 'Prekínder', age: '4 y 5 años' }
};

ES.friends = {
  booker: { p: 'APRENDER', p2: 'SONREÍR', t: 'Cuentos, palabras e intentos valientes', line: 'Respiro grande. Corazón valiente. ¡Puedo intentarlo otra vez!' },
  lumi: { p: 'PERTENECER', p2: 'CALMA', t: 'Sentimientos, bondad y calma', line: 'Huele la flor. Sopla la vela.' },
  zuri: { p: 'EXPLORAR', p2: 'NUTRIR', t: 'Preguntarse cosas, intentar y probar sabores', line: 'Me pregunto, me pregunto... ¿qué pasa si lo intentamos?' },
  bop: { p: 'MOVERSE', p2: 'AL AIRE LIBRE', t: 'Moverse, jugar y salir al aire libre', line: '¿Listos? ¡Bop y a moverse!' }
};

ES.crowd = {
  C: ['Termina la frase', 'Haz una pausa y deja que tu niño diga el final de la oración.'],
  R: ['Recuerda', 'Pregunta sobre algo que ya pasó en el cuento.'],
  O: ['Pregunta abierta', 'No hay respuestas equivocadas. Sigue la idea de tu niño.'],
  W: ['Quién, qué, dónde', 'Señala el dibujo o las palabras y pregunta sobre ellos.'],
  D: ['La vida de tu niño', 'Conecta el cuento con algo que tu niño conoce.']
};

ES.acts = {
  'tummy-time-treasure': {
    t: 'El tesoro del tiempo boca abajo',
    where: 'En el piso',
    mat: ['Una cobija limpia', 'Un espejo seguro para bebés o un juguete favorito'],
    steps: [
      'Extiende la cobija en el piso y pon a tu bebé boca abajo, solo mientras esté despierto y alguien lo esté vigilando.',
      'Acuéstate frente a frente, a la altura de sus ojos, con el espejo o el juguete un poquito fuera de su alcance.',
      'Canta suavecito. Cuando tu bebé levante la cabeza, sonríe y dile lo que está haciendo: "¡Levantaste la cabeza!"',
      'Si se pone inquieto, voltéalo boca arriba, abrázalo y vuelvan a intentarlo más tarde. Unos minutos, muchas veces al día, se van sumando.'
    ],
    notice: [
      'Cómo tu bebé levanta y gira la cabeza, y cómo eso cambia con las semanas.',
      'Si se empuja hacia arriba con los brazos o intenta alcanzar el juguete.'
    ],
    adapt: [
      'Acuesta a tu bebé boca abajo sobre tu pecho mientras te reclinas hacia atrás.',
      'Mueve el juguete un poco hacia un lado para que gire la cabeza o el cuerpo hacia él.',
      'Sigue cualquier plan de posiciones que te haya dado el profesional de salud de tu bebé. Acostarlo de lado, con una toalla enrollada detrás de la espalda, también cuenta como juego en el piso.'
    ],
    safety: 'Siempre despierto y siempre vigilado. Nunca dejes a un bebé solo boca abajo, y para dormir, siempre boca arriba.',
    say: '¿Listos? ¡Bop y a moverse! ¡Mira cómo levantas la cabeza!'
  },
  'reach-and-grab': {
    t: 'Estira y agarra',
    where: 'En el piso',
    mat: ['Un sonajero suave o un recipiente de plástico con la tapa bien pegada con cinta'],
    steps: [
      'Sienta a tu bebé en tu regazo, bien sostenido, o acuéstalo boca arriba sobre una cobija.',
      'Sostén el sonajero cerquita, a menos de un brazo de distancia, donde su mano lo pueda encontrar.',
      'Espera. Deja que lo golpee, lo empuje o lo agarre. Agítalo suavemente cuando lo toque.',
      'Muévelo un poco a la izquierda o a la derecha y deja que se estire otra vez para alcanzarlo.'
    ],
    notice: [
      'Con qué mano se estira tu bebé, y si se lleva el juguete a la boca.',
      'Cuánto tiempo sigue mirando el juguete cuando se mueve.'
    ],
    adapt: [
      'Acerca el juguete hasta la mano de tu bebé para que lo pueda sentir.',
      'Sostenlo un poco más alto para que se estire y se gire hacia él.',
      'Si tu bebé todavía no se estira para agarrar cosas, toca suavemente la palma de su mano con el juguete y dile cómo se llama.'
    ],
    safety: 'Usa juguetes de una sola pieza, más grandes que el puño de tu bebé, sin cordones ni piezas sueltas.',
    say: '¡Estira, estira, estira! ¡Lo hiciste sonar!'
  },
  'peekaboo-turns': {
    t: 'Cucú por turnos',
    where: 'En cualquier lugar',
    mat: ['Tus manos, o una tela ligera que tú sostienes'],
    steps: [
      'Siéntate frente a frente con tu bebé.',
      'Tápate la cara con las manos y di: "¿Dónde estoy?" Luego destápate: "¡Cucú!"',
      'Haz una pausa y espera una sonrisa, un sonido o una patadita. Ese es el turno de tu bebé.',
      'Responde a su turno con una sonrisa o una palabra, y vuelvan a jugar.'
    ],
    notice: [
      'Cómo tu bebé "toma su turno": una sonrisa, un sonido, o voltear la mirada cuando necesita un descanso.',
      'Si empieza a esperar que vuelvas a aparecer.'
    ],
    adapt: [
      'Juega despacio y en voz baja con un bebé que se asusta fácilmente.',
      'Deja que un bebé más grande te quite la tela de la cara.',
      'Para un bebé con baja visión, conviértelo en un juego de sonidos: tararea, haz una pausa y luego di "¡Cucú!" cerca de él.'
    ],
    safety: 'Nunca le tapes la cara a tu bebé. Guarda la tela al terminar el juego.',
    say: '¿Dónde está Lumi? ¡Cucú, aquí estoy!'
  },
  'point-and-name-book': {
    t: 'Señala y nombra con un libro de cartón',
    where: 'En un rincón acogedor',
    mat: ['Cualquier libro de cartón o libro ilustrado', 'Un álbum de fotos o una caja de cereal también sirven'],
    steps: [
      'Sienta a tu bebé en tu regazo para que los dos vean las páginas.',
      'Señala un dibujo y dile el nombre despacio: "Perro. Un perro grande."',
      'Haz una pausa para que tu bebé mire, dé palmaditas en la página o haga un sonido. Respóndele como si te hubiera hablado: "¡Sí! El perro dice guau."',
      'Deja que pase las páginas, aunque sea hacia atrás. Paren cuando pierda el interés y vuelvan a intentarlo más tarde.'
    ],
    notice: [
      'Hacia dónde mira tu bebé cuando nombras un dibujo.',
      'Los sonidos, palmaditas o sonrisas en las pausas: esa es la parte de la conversación que le toca a tu bebé.'
    ],
    adapt: [
      'Usa fotos de las caras de la familia, que a los bebés muchas veces les encantan.',
      'Con bebés más grandes, pregunta "¿Dónde está el perro?" y espera a que lo señale.',
      'Usa dibujos de alto contraste y libros para tocar y sentir con un bebé con baja visión.'
    ],
    say: 'Booker dice: ¡Mira! ¡Señala! ¡Nómbralo!'
  },
  'kitchen-sound-shakers': {
    t: 'Maracas de cocina',
    where: 'En la cocina',
    mat: ['Dos botellas o recipientes de plástico limpios, con tapa', 'Arroz crudo en uno y una cucharada grande de frijoles crudos en el otro, con las tapas bien pegadas con cinta'],
    steps: [
      'Agita un recipiente cerca de tu bebé y espera. ¿Se volteó hacia el sonido?',
      'Agita el otro. Di: "¡Este suena fuerte! Este suena suave."',
      'Deja que tu bebé sostenga y agite uno mientras tú sostienes el otro.',
      'Agítenlos juntos y luego paren juntos: "¡Alto!"'
    ],
    notice: [
      'Si tu bebé se voltea hacia el sonido o se queda quieto para escuchar.',
      'Si lo vuelve a agitar a propósito para que suene.'
    ],
    adapt: [
      'Agítalo suavemente con un bebé que se asusta con los sonidos fuertes.',
      'Con niños pequeños, esconde uno detrás de tu espalda y adivinen cuál es cuál.',
      'Apoya el recipiente sobre la pancita de tu bebé para que sienta cómo se mueve.'
    ],
    safety: 'Pega bien las tapas con cinta y revísalas cada vez. Tira cualquier recipiente que se agriete.',
    say: 'Zuri dice: ¡Escucha! ¿Qué oyes?'
  },
  'baby-bounce-and-sing': {
    t: 'Rebota y canta',
    where: 'En cualquier lugar',
    mat: ['Cualquier canción que te sepas'],
    steps: [
      'Siéntate en el piso con tu bebé en tu regazo, mirándote de frente. Sostenlo con firmeza y con la cabeza bien apoyada.',
      'Canta una canción corta con un ritmo parejo y mueve las rodillas suavemente al compás.',
      'Haz una pausa en la última palabra y luego baja las rodillas un poquito, con suavidad.',
      'Canta la misma canción otra vez para que tu bebé aprenda lo que viene después.'
    ],
    notice: [
      'Si tu bebé se emociona justo antes de la bajadita: eso quiere decir que se acuerda.',
      'Sonidos o movimientos que piden "¡otra vez!"'
    ],
    adapt: [
      'Mécelo de lado a lado en lugar de rebotar, con tu bebé recostado sobre tus antebrazos.',
      'Con bebés más grandes, detente y espera a que te pidan más con un rebote o un sonido.',
      'Con un bebé con poco tono muscular, mécelo suavemente y no hagas la bajadita.'
    ],
    safety: 'Que cada rebote sea pequeño y lento, y sostén la cabeza y el cuello. Nunca sacudas ni lances a un bebé.',
    say: 'Rebota, rebota, rebota con Bop. ¿Otra vez? ¡Otra vez!'
  },
  'gentle-sway': {
    t: 'Arrullo suave para relajarse',
    where: 'A la hora de dormir',
    mat: ['Un cuarto tranquilo', 'Una canción suave y lenta'],
    steps: [
      'Abraza a tu bebé cerca de ti, con la cabeza apoyada.',
      'Párate con los pies separados y mécete despacio de lado a lado mientras tarareas.',
      'Baja la voz y baja las luces si puedes.',
      'Cuando tu bebé esté tranquilo, acuéstalo boca arriba para dormir en una cuna sin nada más adentro.'
    ],
    notice: [
      'Qué ayuda a tu bebé a calmarse: tu voz, el arrullo, la luz baja.',
      'Las señales de que tu bebé tiene sueño, como tallarse los ojos o voltear la mirada.'
    ],
    adapt: [
      'Siéntate y mécelo en lugar de estar de pie.',
      'Usa la misma canción todas las noches para que se vuelva una señal de que es hora de dormir.',
      'Respeta cualquier rutina para calmarse que tu familia ya tenga.'
    ],
    safety: 'Boca arriba para dormir, cada vez que duerma: sobre una superficie firme y plana, sin nada más en la cuna.',
    say: 'Lumi dice: Despacito y con suavidad. Shh, aquí estoy.'
  },
  'sparkle-gums': {
    t: 'Encías brillantes',
    where: 'A la hora del baño',
    mat: ['Una toallita limpia y húmeda'],
    steps: [
      'Lávate las manos y sienta a tu bebé en tu regazo.',
      'Envuelve tu dedo con la toallita húmeda.',
      'Limpia con suavidad las encías, y los dientes si ya tiene, haciendo circulitos suaves.',
      'Di "¡Encías brillantes!" y sonríe. Lava la toallita después de cada uso.'
    ],
    notice: [
      'Cómo reacciona tu bebé a la toallita. A algunos bebés les gusta sentir la presión en las encías adoloridas.'
    ],
    adapt: [
      'Deja que tu bebé sostenga primero una mordedera limpia y fresca.',
      'Cuando le salgan los dientes, cambia a un cepillo de dientes suave para bebé con una capa de pasta dental con fluoruro del tamaño de un grano de arroz.',
      'Hazlo después de una canción si a tu bebé no le gusta.'
    ],
    say: 'Booker dice: ¡Encías brillantes! Circulitos suaves.'
  },
  'cruise-and-cheer': {
    t: 'Pasitos y aplausos',
    where: 'En el piso',
    mat: ['Un sofá firme o una mesa baja y pesada', 'Un juguete favorito'],
    steps: [
      'Ayuda a tu niño a pararse agarrado del sofá, y quédate justo a su lado.',
      'Pon el juguete a uno o dos pasos, a lo largo del sofá, para que dé pasitos de lado para alcanzarlo.',
      'Celebra cada pasito.',
      'Deja que se siente a descansar cuando quiera.'
    ],
    notice: [
      'Cómo se mueve tu niño: de lado, soltándose con una mano, o gateando en lugar de caminar.'
    ],
    adapt: [
      'Que se arrodille junto al sofá y se estire hacia el juguete.',
      'Pon el juguete al final del sofá para que intente dar un paso hasta la silla de al lado.',
      'Usa un juguete de empujar, una andadera o los apoyos que tu niño ya usa.'
    ],
    safety: 'Usa solo muebles tan pesados que no se puedan voltear. Quédate a menos de un brazo de distancia y quita los juguetes duros del piso.',
    say: '¿Listos? ¡Bop y a moverse! ¡Un paso, dos pasos!'
  },
  'in-and-out-box': {
    t: 'La caja de adentro y afuera',
    where: 'En el piso',
    mat: ['Una caja de zapatos vacía o un tazón', 'Cinco cosas grandes que sea seguro agarrar: bloques, cucharas, calcetines hechos bolita'],
    steps: [
      'Echa una cosa en la caja y di "¡Adentro!" Agita la caja: ¡qué ruido!',
      'Voltéala y di "¡Afuera!"',
      'Deja que tu niño meta cosas y las saque todas las veces que quiera.',
      'Ponle una tapa con un agujero para un nuevo reto.'
    ],
    notice: [
      'Cómo agarra tu niño cada cosa, y si la busca cuando desaparece.',
      'Palabras o sonidos nuevos, como "adentro", "afuera" o "¡uy!"'
    ],
    adapt: [
      'Empieza con una sola cosa grande y un tazón ancho.',
      'Corta una ranura pequeña para cosas planas, como tapas de frascos, para que tenga que girarlas para que entren.',
      'Pon la caja sobre una charola a la altura correcta para un niño que está sentado en una silla.'
    ],
    safety: 'Usa solo cosas demasiado grandes para caber en la boca de tu niño.',
    say: 'Zuri dice: ¡Adentro! ¡Afuera! ¿Qué pasa si lo intentamos?'
  },
  'name-it-walk': {
    t: 'Paseo para nombrar cosas',
    where: 'Al aire libre',
    mat: ['Zapatos', 'Una carriola o un portabebés, si usas uno'],
    steps: [
      'Salgan a dar un paseo corto afuera, o por la casa.',
      'Cuando tu niño señale o mire algo, dile cómo se llama: "¡Un pájaro! Un pajarito café."',
      'Agrega una palabra más cada vez: "El pájaro está volando. ¡Arriba, arriba!"',
      'Haz una pausa y deja que tu niño señale lo siguiente. Sigue lo que le interesa.'
    ],
    notice: [
      'Qué señala tu niño, y si te voltea a ver para compartirlo contigo.',
      'Palabras o sonidos que intenta repetir.'
    ],
    adapt: [
      'Caminen por un solo cuarto y nombren lo que tocan.',
      'Con niños de 2 años, pregunta "¿Qué es eso?" y espera antes de decir el nombre.',
      'Para un niño con baja visión, describe en voz alta lo que van pasando y deja que toque cosas que sean seguras.'
    ],
    safety: 'Tómense de la mano cerca de calles y entradas de autos.',
    say: 'Booker dice: ¡Lo veo! ¡Vamos a nombrarlo!'
  },
  'feelings-mirror': {
    t: 'El espejo de los sentimientos',
    where: 'En cualquier lugar',
    mat: ['Un espejo, o simplemente tu cara'],
    steps: [
      'Siéntense juntos frente al espejo.',
      'Pon una cara muy feliz y di: "¡Feliz!" Espera a que tu niño te imite.',
      'Prueben una cara triste, una cara de sorpresa y una cara de sueño.',
      'Pregunta: "¿Me enseñas cómo es feliz?" y celebra cualquier intento.'
    ],
    notice: [
      'Si tu niño mira tu cara con atención y trata de imitarla.',
      'Qué sentimientos parece que ya conoce.'
    ],
    adapt: [
      'Con los más pequeños, usa solo feliz y triste.',
      'Con niños de 2 años, cuenta un cuento chiquito: "La pelota se fue rodando. ¿Cómo me siento?"',
      'Si el espejo es demasiado, usa un libro ilustrado con caras claras.'
    ],
    say: 'Lumi dice: Los sentimientos están bien. ¿Qué dice tu cara?'
  },
  'smell-the-flower': {
    t: 'Huele la flor, sopla la vela',
    where: 'En cualquier lugar',
    mat: ['Nada, o un dedo levantado como si fuera una vela'],
    steps: [
      'Levanta una mano como si fuera una flor y un dedo de la otra mano como si fuera una vela.',
      'Huele la flor: respira despacio por la nariz.',
      'Sopla la vela: saca el aire despacio por la boca.',
      'Háganlo tres veces juntos, despacio. Luego pregunta: "¿Cómo se siente tu cuerpo ahora?"'
    ],
    notice: [
      'Si tu niño puede hacer su respiración más lenta, aunque sea un poco.',
      'Cuando empieza a usarlo por su cuenta, por ejemplo cuando está molesto.'
    ],
    adapt: [
      'Los niños pequeños pueden imitar solo la parte de soplar.',
      'Los niños más grandes pueden guiarte a ti, o intentar cuatro respiraciones lentas.',
      'Soplen una pluma o un rehilete si es difícil imaginar una vela.'
    ],
    safety: 'Ofrécelo, nunca lo obligues. Si tu niño se siente mareado, que respire normal y se siente.',
    say: 'Lumi dice: Huele la flor. Sopla la vela.'
  },
  'water-bowl-splash': {
    t: 'A chapotear en el tazón de agua',
    where: 'A la hora del baño',
    mat: ['Un tazón de plástico poco hondo o la tina', 'Vasos y cucharas de plástico', 'Una toalla'],
    steps: [
      'Pon un poco de agua en un tazón poco hondo sobre una toalla, o en la tina.',
      'Con los vasos, viertan, saquen agua y chapoteen juntos.',
      'Busquen cosas de la casa que floten o se hundan, y adivinen antes de echar cada una al agua.',
      'Tiren el agua juntos y séquense las manos.'
    ],
    notice: [
      'Cómo vierte y saca el agua tu niño, y si vuelve a hacer lo mismo para ver qué pasa.',
      'Lo que adivina, y palabras como "más", "lleno" o "vacío".'
    ],
    adapt: [
      'Con los más pequeños, solo viertan y chapoteen.',
      'Con niños de 3 años, separen las cosas en dos montones: "flotan" y "se hunden".',
      'Háganlo en una mesa a la altura de una silla o de una silla de ruedas.'
    ],
    safety: 'Quédate a menos de un brazo de distancia y nunca dejes a un niño solo cerca del agua, aunque sea poquita. Vacía el tazón cuando terminen.',
    say: 'Zuri dice: ¡Viértela, sácala! ¿Qué flota?'
  },
  'bubble-chase': {
    t: 'A perseguir burbujas',
    where: 'Al aire libre',
    mat: ['Burbujas: jabón para trastes y agua en un vaso, y un limpiapipas doblado o un popote'],
    steps: [
      'Busquen un lugar abierto y plano afuera. Párate de modo que el viento lleve las burbujas hacia tu niño.',
      'Sopla burbujas e invita a tu niño a alcanzarlas, reventarlas y perseguirlas.',
      'Cambia el juego: revienten con un aplauso, con un dedo del pie, con un codo.',
      'Cuando se acaben las burbujas, respiren juntos y tomen un poco de agua.'
    ],
    notice: [
      'Cómo se mueve tu niño: se estira hacia arriba, da pasos, corre, se detiene.'
    ],
    adapt: [
      'Sopla burbujas cerca de un niño que está sentado, para que las reviente desde donde está.',
      'Los niños más grandes pueden soplar las burbujas mientras tú las persigues.',
      'Si a tu niño no le gusta sentir las burbujas, deja que las reviente con una cuchara.'
    ],
    safety: 'Mantén la mezcla de burbujas lejos de los ojos y de la boca, y limpia lo que se derrame en pisos duros.',
    say: '¿Listos? ¡Bop y a moverse! ¡Revienta las de arriba, revienta las de abajo!'
  },
  'kitchen-parade': {
    t: 'Desfile en la cocina',
    where: 'Dentro de casa',
    mat: ['Una olla o un recipiente de plástico', 'Una cuchara de madera o de plástico'],
    steps: [
      'Dale a tu niño la olla y la cuchara como tambor.',
      'Toca un ritmo lento y marchen despacio. Toca un ritmo rápido y marchen rápido.',
      'Túrnense para ser quien guía.',
      'Terminen con un ¡bum! bien fuerte y un abrazo.'
    ],
    notice: [
      'Si tu niño cambia de velocidad cuando cambia el ritmo.'
    ],
    adapt: [
      'Siéntense y toquen el tambor sobre una charola o una mesa, o bailen solo con los brazos.',
      'Agreguen un "¡Estatua!" cuando pare el tambor.',
      'Pon una tela sobre la olla para que suene más bajito.'
    ],
    safety: 'Mantén el piso libre de juguetes y de partes mojadas.',
    say: '¿Listos? ¡Bop y a moverse! ¡Tan, tan, a marchar!'
  },
  'animal-walks': {
    t: 'Caminatas de animales',
    where: 'Dentro de casa',
    mat: ['Un pasillo o un espacio despejado'],
    steps: [
      'Escojan un animal: el oso de Booker, el conejito de Lumi, la tortuga de Zuri o el elefante de Bop.',
      'Muévanse como ese animal de un cuarto al otro.',
      'Digan "¡Cambio!" y deja que tu niño escoja el siguiente animal.',
      'Prueben un animal lento y uno rápido.'
    ],
    notice: [
      'Qué formas de moverse escoge tu niño, y cómo cambia de velocidad.'
    ],
    adapt: [
      'Cualquier movimiento cuenta: menearse, rodar, gatear o avanzar en silla de ruedas.',
      'Agreguen un sonido para cada animal, o caminen hacia atrás.',
      'Desde una silla, usen solo los brazos y la cara para ser el animal.'
    ],
    safety: 'Revisa que el piso no esté resbaloso y aléjense de las escaleras.',
    say: '¿Listos? ¡Bop y a moverse! ¿Qué animal eres hoy?'
  },
  'sock-toss': {
    t: 'A lanzar calcetines',
    where: 'Dentro de casa',
    mat: ['Calcetines limpios hechos bolita', 'Un canasto para la ropa'],
    steps: [
      'Hagan bolitas con unos cuantos pares de calcetines limpios.',
      'Pon el canasto a unos pasos de distancia.',
      'Lancen, dejen caer o rueden cada bolita hacia el canasto.',
      'Cuéntenlas juntos mientras las recogen.'
    ],
    notice: [
      'Cómo lanza tu niño: por arriba del hombro, por abajo, o dejándola caer.',
      'Si cuenta junto contigo.'
    ],
    adapt: [
      'Sostén el canasto cerca, o deja que eche los calcetines desde su asiento.',
      'Den un paso grande hacia atrás después de cada ronda.',
      'Rueden los calcetines por el piso hasta un cesto acostado de lado.'
    ],
    say: '¿Listos? ¡Bop y a moverse! ¡Lánzalo, suéltalo, ruédalo!'
  },
  'picture-walk': {
    t: 'Paseo por los dibujos',
    where: 'En un rincón acogedor',
    mat: ['Cualquier libro ilustrado que tu niño no haya visto'],
    steps: [
      'Antes de leer, pasen las páginas despacio y miren solo los dibujos.',
      'Pregunta: "¿Qué ves? ¿Qué crees que está pasando?"',
      'Repite las palabras de tu niño y agrega una: "Un perro. ¡Un perro lleno de lodo!"',
      'Luego lean el libro y vean si adivinaron.'
    ],
    notice: [
      'Cuántas palabras usa tu niño para contar lo que ve en un dibujo.',
      'Si adivina lo que podría pasar después.'
    ],
    adapt: [
      'Con niños que apenas cumplieron 2 años, señalen y nombren.',
      'Con niños de 3 años, pregunta "¿Qué pasa después?" antes de pasar cada página.',
      'Para un niño con baja visión, describe cada dibujo con palabras.'
    ],
    say: 'Booker dice: Primero mira el dibujo. ¿Qué podrá ser?'
  },
  'clean-up-one-toy': {
    t: 'Un juguete a la vez',
    where: 'Dentro de casa',
    mat: ['Los juguetes que están afuera', 'Dos o tres cajas o lugares en un estante'],
    steps: [
      'Dale a cada tipo de juguete una "casita": una caja para los bloques, un lugar en el estante para los libros.',
      'Cuando el desorden se vea demasiado grande, di: "No podemos hacerlo todo a la vez. Pero sí podemos hacer una cosa."',
      'Cada quien levanta un juguete y lo lleva a su casita: "Levántalo, guárdalo. ¡Pum, pum! ¡Plas, plas!"',
      'Sigan hasta que todos los juguetes estén en su casita. Pregunta: "¿Qué hiciste tú por tu cuenta?"'
    ],
    notice: [
      'Si tu niño pone cada juguete en su casita.',
      'Cómo reacciona cuando un trabajo grande se hace más pequeño.'
    ],
    adapt: [
      'Una sola caja, y acompaña a tu niño con cada juguete.',
      'Deja que tu niño sea el "revisor de etiquetas" que se asegura de que cada juguete esté en su casita.',
      'Acércale la caja a un niño que está sentado, para que eche los juguetes desde su asiento.'
    ],
    say: 'Levántalo, guárdalo. ¡Pum, pum! ¡Plas, plas!'
  },
  'pillow-fort-calm': {
    t: 'Calma en el fuerte de almohadas',
    where: 'Dentro de casa',
    mat: ['Almohadas', 'Una cobija', 'Un peluche'],
    steps: [
      'Construyan juntos un fuerte pequeño y bajito con almohadas y una cobija.',
      'Métanse gateando juntos con el peluche.',
      'Respiren despacio tres veces: huele la flor, sopla la vela.',
      'Cuéntense una cosa que notaron hoy.'
    ],
    notice: [
      'Qué hace tu niño cuando todo está tranquilo y están cerquita.',
      'Si vuelve al fuerte por su cuenta cuando necesita calma.'
    ],
    adapt: [
      'Siéntate junto al fuerte y solo mete una mano.',
      'Conviértelo en el "rincón de calma" de tu niño y deja que lo decore.',
      'Si los espacios pequeños le cuestan, olvídense del fuerte y acurrúquense en el sofá con una cobija.'
    ],
    safety: 'Mantén el fuerte bajito y abierto por enfrente para que siempre puedas ver a tu niño.',
    say: 'Lumi dice: La calma es un lugar que puedes construir.'
  },
  'color-look-and-taste': {
    t: 'Mira y prueba los colores',
    where: 'En la cocina',
    mat: ['Dos alimentos de un mismo color de la comida de hoy, cortados de forma segura (por ejemplo, fresas en trozos pequeños y zanahorias cocidas hasta quedar suaves)'],
    steps: [
      'Observa: pon los dos alimentos en un plato. Pregunta: "¿Qué ves? ¿Qué hueles?"',
      'Predice: "¿Será crujiente o suave? ¿Dulce o ácido?"',
      'Prueba: tu niño puede mirar, tocar, oler, lamer, probar o decir "no, gracias". Toda forma de explorar cuenta.',
      'Compara: "¿Fue lo que pensabas? ¿En qué son diferentes?"'
    ],
    notice: [
      'Las palabras que usa tu niño para describir la comida: suave, crujiente, jugoso, frío.',
      'Con qué sentidos le gusta explorar primero.'
    ],
    adapt: [
      'Solo mirar y tocar, sin tener que probar.',
      'Los niños más grandes pueden dibujar lo que probaron.',
      'Sirve versiones suaves o machacadas para un niño que las necesite, y sigue todo plan de alergias.'
    ],
    safety: 'Corta los alimentos redondos, como uvas y arándanos, en trozos pequeños, y sirve las verduras duras cocidas hasta que estén suaves. Nunca exijas que pruebe.',
    say: 'Zuri dice: ¡Observa, predice, prueba, compara!'
  },
  'brave-reader-steps': {
    t: 'Los pasos del lector valiente',
    where: 'En un rincón acogedor',
    mat: ['Tres pedacitos de papel', 'Un crayón'],
    steps: [
      'Dibuja un sol, un gato y una casa, y escribe la palabra debajo de cada uno: SOL, GATO, CASA.',
      'Levanta CASA. Pregunta: "¿Qué haría Booker primero?" Miren el dibujo juntos.',
      'Señala la primera letra y di su sonido. Desliza un dedo debajo de la palabra.',
      'Léanla juntos y digan la frase valiente. Prueben las otras dos.'
    ],
    notice: [
      'Si tu niño usa el dibujo para adivinar la palabra.',
      'Qué sonidos de letras ya conoce.'
    ],
    adapt: [
      'Solo nombren los dibujos.',
      'Tapa el dibujo y prueben el primer sonido antes de mirar.',
      'Haz las letras grandes y gruesas, o trácenlas juntos en el aire.'
    ],
    say: 'Respiro grande. Corazón valiente. ¡Puedo intentarlo otra vez!'
  },
  'ice-detectives': {
    t: 'Detectives del hielo',
    where: 'En la cocina',
    mat: ['Tres cubitos de hielo', 'Tres platos pequeños', 'Una toalla de papel o un guante'],
    steps: [
      'Pon un plato en un lugar soleado y otro en la sombra. Tu niño sostiene el tercero en una toalla de papel.',
      'Adivinen juntos: "¿Cuál se va a derretir primero?"',
      'Observen durante 3 minutos y túrnense para decir lo que notan.',
      'Digan el descubrimiento de Zuri: "El calor derrite el hielo. El frío congela el agua."'
    ],
    notice: [
      'Si tu niño adivina y luego comprueba si tenía razón.',
      'Palabras para comparar: más grande, más pequeño, más rápido, más lento.'
    ],
    adapt: [
      'Comparen solo dos platos.',
      'Hagan un dibujo de antes y uno de después.',
      'Deja que tu niño toque los platos para distinguir el tibio del fresco.'
    ],
    safety: 'Que nadie se meta el hielo a la boca.',
    say: 'Me pregunto, me pregunto... ¿qué pasa si lo intentamos?'
  },
  'freeze-and-try-again': {
    t: 'Estatua y otra vez',
    where: 'Dentro de casa',
    mat: ['Música, o tu voz'],
    steps: [
      'Muévanse como quieran mientras suena la música o mientras cantas.',
      'Cuando pare la música, quédense quietos como estatuas.',
      'Sacúdanse para salir de la estatua y vuelvan a empezar.',
      'Deja que tu niño sea quien pare la música.'
    ],
    notice: [
      'Cómo detiene tu niño su cuerpo cuando para la música.'
    ],
    adapt: [
      'Quédense quietos solo con las manos, o solo con la cara.',
      'Quédense quietos en una forma chistosa que tú digas: alto, chiquito, ancho.',
      'Si tu niño no puede oír cuando para la música, usa como señal mover la mano o prender y apagar la luz.'
    ],
    say: '¡Estatua! Ahora, otra vez.'
  },
  'shadow-dance': {
    t: 'Baile de sombras',
    where: 'Dentro de casa',
    mat: ['Una linterna, una lámpara o una ventana con sol', 'Una pared lisa'],
    steps: [
      'Oscurece un poco el cuarto y apunta la luz hacia una pared.',
      'Párate entre la luz y la pared y haz que tu sombra salude, salte y dé vueltas.',
      'Pide a tu niño que imite tu sombra, y luego cambien.',
      'Hagan una sombra alta, una chiquita y una que se menea. Pregúntense: ¿qué la hizo cambiar?'
    ],
    notice: [
      'Si tu niño descubre que acercarse a la luz hace la sombra más grande.'
    ],
    adapt: [
      'Hagan sombras de manos y de animales sentados.',
      'Dibujen el contorno de una sombra en un papel pegado a la pared.',
      'Deja el cuarto solo un poco oscuro para un niño a quien no le gusta la oscuridad.'
    ],
    safety: 'Nunca apuntes una luz a los ojos de nadie.',
    say: 'Zuri dice: ¡Me fijé que mi sombra se hizo más grande!'
  },
  'feeling-faces': {
    t: 'Caras de sentimientos y palabras para invitar',
    where: 'En cualquier lugar',
    mat: ['Un espejo, si tienes uno'],
    steps: [
      'Hagan cinco caras juntos: feliz, solo, preocupado, tranquilo y orgulloso. Digan cada palabra.',
      'Pregunta: "¿Cuándo te sentiste orgulloso esta semana?"',
      'Practiquen las palabras para invitar de Lumi: "¿Quieres jugar conmigo?" "¡Sí!" Luego cambien de papel.',
      'Terminen con: "Mira. Escucha. Echa una mano."'
    ],
    notice: [
      'Qué palabras de sentimientos usa tu niño por su cuenta.',
      'Si se da cuenta de cómo se siente otra persona.'
    ],
    adapt: [
      'Usa solo feliz, preocupado y tranquilo.',
      'Muestren un sentimiento solo con el cuerpo y adivinen cuál es.',
      'Usa un libro ilustrado con caras claras en lugar de un espejo.'
    ],
    say: 'Lumi dice: Mira. Escucha. Echa una mano.'
  },
  'sparkle-smile': {
    t: '¡Adelante, atrás, arriba, a brillar!',
    where: 'A la hora del baño',
    mat: ['Un cepillo de dientes', 'Pasta dental con fluoruro: una capa del tamaño de un grano de arroz para menores de 3 años, y una cantidad del tamaño de un chícharo a partir de los 3 años'],
    steps: [
      'Cuenta la historia: "El brillo se esconde adelante, atrás y arriba de cada diente."',
      'Cepilla la parte de adelante con circulitos mientras dices "¡Adelante!"',
      'Luego "¡Atrás!" y "¡Arriba!"',
      'Terminen con una gran sonrisa en el espejo: "¡A brillar!" Escupe la pasta, no te la tragues.'
    ],
    notice: [
      'Cuánto quiere hacer tu niño por su cuenta. A esta edad, los adultos todavía ayudan a cepillar.'
    ],
    adapt: [
      'Cepíllalo mientras está sentado en tu regazo.',
      'Deja que tu niño se cepille primero y luego tú terminas.',
      'Usa un cepillo de mango grueso, o cepilla primero solo con agua si el sabor de la pasta le cuesta.'
    ],
    safety: 'Usa las cantidades de arriba y quédate con tu niño todo el tiempo.',
    say: 'Booker dice: ¡Adelante, atrás, arriba, a brillar!'
  },
  'pillow-bowling': {
    t: 'Boliche con almohadas',
    where: 'Dentro de casa',
    mat: ['Vasos de plástico o cajas vacías', 'Una pelota suave o calcetines hechos bolita'],
    steps: [
      'Apilen los vasos o las cajas en una torrecita.',
      'Rueden la pelota para tumbarlos.',
      'Vuelvan a armarla juntos y cuenten cuántos se cayeron.',
      'Túrnense y celebren cada intento.'
    ],
    notice: [
      'Si tu niño apunta, y si cambia la forma de rodar la pelota después de fallar.'
    ],
    adapt: [
      'Siéntense cerca y empujen la pelota suavemente.',
      'Den un paso más atrás, o hagan una torre más alta.',
      'Rueden la pelota por una rampa hecha con un libro sobre una almohada.'
    ],
    say: '¿Listos? ¡Bop y a moverse! ¡Rueda y tumba! ¡Vuelve a armarla!'
  },
  'story-retell': {
    t: 'Principio, medio y final',
    where: 'En un rincón acogedor',
    mat: ['Un cuento que acaban de leer', 'Una hoja de papel doblada en tres'],
    steps: [
      'Después de leer, pregunta: "¿Qué pasó primero?"',
      'Tu niño dibuja el principio en el primer cuadro, el medio en el segundo y el final en el tercero.',
      'Pídele que te cuente el cuento usando sus dibujos.',
      'Escribe debajo de cada dibujo una palabra que tu niño escoja.'
    ],
    notice: [
      'Si tu niño cuenta lo que pasó en orden.',
      'Palabras nuevas del cuento que aparecen cuando lo vuelve a contar.'
    ],
    adapt: [
      'Dibujen solo el principio y el final.',
      'Agreguen un cuarto cuadro: "¿Qué podría pasar después?"',
      'Usen juguetes o tarjetas con dibujos en lugar de dibujar.'
    ],
    say: 'Booker dice: ¡Todo cuento tiene un principio, un medio y un final!'
  },
  'letter-hunt': {
    t: 'A la caza del primer sonido',
    where: 'Dentro de casa',
    mat: ['Nada más que tu casa'],
    steps: [
      'Escoge un sonido, como /s/, y dilo clarito.',
      'Busquen por la casa cosas que empiecen con ese sonido: silla, sábana, sartén.',
      'Pongan en fila lo que encuentren (o señálenlo) y digan cada palabra juntos, alargando el primer sonido.',
      'Deja que tu niño escoja el siguiente sonido.'
    ],
    notice: [
      'Si tu niño puede oír el primer sonido de una palabra.'
    ],
    adapt: [
      'Mejor busquen cosas de un solo color.',
      'Busquen cosas que terminen con ese sonido.',
      'Busquen tocando y escuchando, y digan en voz alta el nombre de cada cosa.'
    ],
    say: 'Booker dice: /s/, /s/, ¡silla! ¡Lo puedo oír!'
  },
  'invite-practice': {
    t: '¿A quién podemos invitar?',
    where: 'En cualquier lugar',
    mat: ['Dos peluches'],
    steps: [
      'Un peluche está jugando. El otro está parado solito, como Pip.',
      'Pregunta: "¿Cómo sabes que este peluche se siente solo?"',
      'Tu niño usa un peluche para invitar: "¿Quieres jugar con nosotros?"',
      'Hablen de un amigo o primo de verdad a quien tu niño podría invitar a jugar esta semana.'
    ],
    notice: [
      'Si tu niño se fija en las pistas del cuerpo (la cabeza agachada, estar solo).',
      'Las palabras que escoge para invitar.'
    ],
    adapt: [
      'Haz tú la invitación primero y deja que tu niño la repita.',
      'Actúen qué hacer si un amigo dice "Ahora no".',
      'Usa dibujos de caras en lugar de peluches.'
    ],
    say: 'Lumi dice: Mira. Escucha. Echa una mano.'
  },
  'freeze-blueberries': {
    t: '¿Se congelan los arándanos?',
    where: 'En la cocina',
    mat: ['Unos cuantos arándanos o uvas', 'Dos vasitos', 'El congelador (un trabajo para adultos)'],
    steps: [
      'La última pregunta de Zuri fue: "¿Qué pasa si congelamos arándanos?" Adivinen juntos.',
      'Pongan unos cuantos arándanos en un vaso y dejen el otro vaso con arándanos sobre la mesa de la cocina. Un adulto mete el primer vaso al congelador.',
      'Al día siguiente, comparen: mírenlos, tóquenlos, golpéenlos suavecito contra el vaso. ¿En qué son diferentes?',
      'Dejen que los congelados se descongelen antes de que alguien los pruebe. Luego comparen otra vez.'
    ],
    notice: [
      'Si tu niño adivina y se acuerda de revisarlo al día siguiente.',
      'Palabras para describir: duro, suave, frío, blandito.'
    ],
    adapt: [
      'Comparen solo mirando.',
      'Dibujen el antes y el después, o intenten congelar agua con una hoja adentro.',
      'Describe con palabras cada cambio y deja que tu niño toque los vasos.'
    ],
    safety: 'Los arándanos congelados son duros y redondos. Déjalos descongelar, y córtalos en trozos pequeños, antes de que los prueben niños menores de 5 años.',
    say: 'Zuri dice: Me pregunto, me pregunto... ¿qué pasa si lo intentamos?'
  },
  'obstacle-adventure': {
    t: 'Aventura de obstáculos',
    where: 'Dentro de casa',
    mat: ['Cojines', 'Una mesa para gatear por debajo', 'Cinta de pintor o una cuerda de saltar para hacer una línea'],
    steps: [
      'Arma cuatro estaciones: gatear debajo de una mesa, pasar por encima de cojines, caminar de puntitas sobre una línea de cinta, y caminar como oso hasta la meta.',
      'Recorran el circuito una vez juntos.',
      'Cada quien va a su propio ritmo. Toda llegada a la meta cuenta.',
      'Cambien una estación en cada ronda, y deja que tu niño invente una.'
    ],
    notice: [
      'Cómo mantiene el equilibrio tu niño y cómo planea su camino. No hay tiempo que ganarle al reloj.'
    ],
    adapt: [
      'Sáltense una estación o háganla con alguien que ayude.',
      'Agreguen un brinco o caminen hacia atrás sobre la línea.',
      'Que cada estación sea una opción: gatear, rodar, avanzar en silla de ruedas o caminar.'
    ],
    safety: 'Mantén las alturas bajas y quédate cerca, listo para sostenerlo, en las partes donde trepa.',
    say: '¿Listos? ¡Bop y a moverse! ¡Por debajo, por encima, por en medio y alrededor!'
  },
  'flamingo-balance': {
    t: 'Equilibrio de flamenco',
    where: 'Dentro de casa',
    mat: ['Una pared o la mano de un adulto'],
    steps: [
      'Párate derechito como un flamenco y agárrate de la pared o de la mano de un adulto.',
      'Levanta un pie un poquito y cuenten juntos hasta cinco.',
      'Cambia de pie. Tambalearse es parte del juego.',
      'Inténtalo mientras te cepillas los dientes, agarrado del lavabo.'
    ],
    notice: [
      'El equilibrio de tu niño cambia de un día a otro. Eso es normal.'
    ],
    adapt: [
      'Siéntate derechito y levanta un pie.',
      'Cierra los ojos mientras cuentan hasta tres, sin soltarte.',
      'Párate en los dos pies y "crece alto" con los brazos arriba.'
    ],
    say: '¡Tambalearse está bien!'
  },
  'thankful-stretch': {
    t: 'Estiramiento de gratitud',
    where: 'A la hora de dormir',
    mat: ['Un lugar tranquilo'],
    steps: [
      'Estírate bien alto, como si estuvieras creciendo.',
      'Agáchate despacio y toca el piso o los dedos de los pies.',
      'Siéntense juntos y compartan una cosa que disfrutaron hoy.',
      'Respiren despacio una vez juntos y dense las buenas noches.'
    ],
    notice: [
      'Qué escoge tu niño como su "cosa buena". Te dice lo que es importante para tu niño.'
    ],
    adapt: [
      'Estírense acostados, solo con los brazos.',
      'Compartan dos cosas, o una cosa que esperan con ganas.',
      'Compartan con una palabra, un dibujo o un abrazo.'
    ],
    say: 'Lumi dice: Un estiramiento lento, una respiración lenta y una cosa buena.'
  },
  'color-walk': {
    t: 'Paseo de colores',
    where: 'Al aire libre',
    mat: ['Zapatos', 'Una carriola o un portabebés, si hace falta'],
    steps: [
      'Salgan afuera, o caminen frente a las ventanas.',
      'Escojan un color y búsquenlo juntos.',
      'Señalen y nombren lo que encuentren: un carro rojo, una hoja verde, un cielo azul.',
      'En casa, cuéntense lo que más les gustó encontrar.'
    ],
    notice: [
      'Qué colores nombra tu niño, y si encuentra cosas que tú no viste.'
    ],
    adapt: [
      'Háganlo desde una ventana.',
      'Encuentren una cosa de cada color del arcoíris.',
      'Usen una carriola, un carrito o una silla de ruedas, y digan en voz alta lo que ven.'
    ],
    safety: 'Tómense de la mano cerca de las calles y quédense en la banqueta.',
    say: 'Zuri dice: ¡Veo, veo algo azul!'
  }
};

/* GUIDES: steps keep the English [icon, text] pairs; only the text (second item) is translated. */
ES.guides = {
  'calm-breath': {
    t: 'Huele la flor, sopla la vela',
    when: 'Cuando los sentimientos se hacen grandes, antes de dormir, o en cualquier momento',
    steps: [
      ['flower', 'Levanta una flor imaginaria.'],
      ['nose', 'Huélela despacio: respira por la nariz.'],
      ['candle', 'Levanta una vela imaginaria.'],
      ['blow', 'Sóplala despacio con la boca.'],
      ['three', 'Háganlo tres veces, juntos.']
    ]
  },
  'brave-reader': {
    t: 'Los pasos del lector valiente de Booker',
    when: 'Cuando tu niño se encuentra con una palabra nueva',
    steps: [
      ['eye', 'Mira el dibujo para buscar una pista.'],
      ['letter', 'Di el primer sonido.'],
      ['slide', 'Desliza un dedo debajo de la palabra, lento como la miel.'],
      ['thumbs', 'Dila. ¿No salió del todo? "Respiro grande. Corazón valiente. ¡Puedo intentarlo otra vez!"']
    ]
  },
  'wonder-loop': {
    t: 'El ciclo de la curiosidad de Zuri',
    when: 'Para cualquier pregunta que haga tu niño',
    steps: [
      ['eye', 'Observa: "¿Qué ves?"'],
      ['think', 'Predice: "¿Qué crees que va a pasar?"'],
      ['hand', 'Prueba: háganlo juntos.'],
      ['compare', 'Compara: "¿Fue lo que pensabas?"']
    ]
  },
  'bop-and-go': {
    t: '¿Listos? ¡Bop y a moverse! Pausa para moverse',
    when: 'Después de estar sentados, entre actividades, o cuando hay mucha energía',
    steps: [
      ['stomp', 'Pisa fuerte con tus patas de elefante.'],
      ['sway', 'Mueve tu trompa de lado a lado.'],
      ['freeze', 'Quédate quieto como una estatua.'],
      ['water', 'Tomen un descanso para beber agua.'],
      ['calm', 'Más despacio: una respiración grande.']
    ]
  },
  'wind-down': {
    t: 'Para relajarse antes de dormir: observa, respira, afloja, descansa',
    when: 'Los últimos 10 minutos antes de dormir',
    steps: [
      ['ear', 'Observa: "¿Qué puedes oír?"'],
      ['nose', 'Respira: dos respiraciones lentas de flor.'],
      ['soft', 'Afloja: manos suaves, hombros suaves, cara suave.'],
      ['moon', 'Descansa: luces bajas, la misma canción, buenas noches.']
    ]
  },
  'sparkle-brush': {
    t: '¡Adelante, atrás, arriba, a brillar!',
    when: 'Al cepillarse los dientes en la mañana y antes de dormir',
    steps: [
      ['paste', 'Pasta dental: una capa del tamaño de un grano de arroz para menores de 3 años, del tamaño de un chícharo a partir de los 3.'],
      ['front', 'Adelante: circulitos.'],
      ['back', 'Atrás: circulitos.'],
      ['top', 'Arriba: la parte con la que masticas.'],
      ['smile', 'Escupe, y luego una gran sonrisa brillante.']
    ]
  },
  'rainbow-plate': {
    t: 'Cuenta colores, no bocados',
    when: 'En las comidas y los refrigerios',
    steps: [
      ['plate', 'Sirve la comida como siempre.'],
      ['rainbow', 'Nombren juntos los colores que ven.'],
      ['count', 'Cuenten los colores, nunca los bocados.'],
      ['choice', 'Tu niño decide qué comer y cuánto.']
    ]
  },
  'tummy-time': {
    t: 'Tiempo boca abajo, poquito a poquito',
    when: 'Bebés, mientras están despiertos y vigilados',
    steps: [
      ['blanket', 'Una cobija en el piso; el bebé boca abajo, despierto.'],
      ['face', 'Ponte a su altura, cara a cara.'],
      ['toy', 'Un juguete o un espejo un poquito fuera de su alcance.'],
      ['cuddle', '¿Se pone inquieto? Abrázalo y vuelvan a intentarlo más tarde.'],
      ['back', 'Para dormir, siempre boca arriba.']
    ]
  }
};

ES.printables = {
  'daily-rhythm': { t: 'Nuestro día: horario con dibujos', d: 'Un horario con dibujos, listo para el refrigerador, de un día en casa con los cuatro amigos: despertar, cuento, comida, movimiento, rato tranquilo y hora de dormir.' },
  'rainbow-tracker': { t: 'Registro semanal de Arcoíris en casa', d: 'Colorea un punto por cada color que tu familia note en las comidas: Cohetes Rojos, Sol Naranja, Rayos Amarillos, Brotes Verdes, Amigos Morados y Nubes Acogedoras. Cuenta colores, no bocados.' },
  'calm-cards': { t: 'Tarjetas de calma de Lumi', d: 'Seis tarjetas para recortar, para los sentimientos grandes: respiraciones de flor y vela, pancita de globo, estatuas tranquilas, tres sonidos suaves, cuerpo flojito y un abrazo.' },
  'move-cards': { t: 'Tarjetas de movimiento de Bop', d: 'Ocho tarjetas de movimiento para recortar, cada una con una versión adaptada para moverse sentado, en un espacio pequeño o sin mucho ruido.' },
  'reading-log': { t: 'Registro de lectura del Club de Lectura de Booker', d: 'Veinte espacios para los libros que lean juntos, con una pregunta para conversar que pueden probar cada vez.' },
  'sticker-chart': { t: 'Tabla de calcomanías de nuestra semana', d: 'Una fila para cada amigo y un cuadro para cada día. Una calcomanía quiere decir "lo intentamos". Sin puntajes, sin comparar.' },
  'story-cards': { t: 'Tarjetas para conversar de La hora del cuento', d: 'Preguntas, palabras para conversar y los gestos para decir juntos de los Libros 1 a 3, una página por libro.' },
  'certificates': { t: 'Certificados de los cuatro amigos', d: 'Cuatro certificados con una línea en blanco para el nombre de tu niño: Lector valiente, Guardián de la bondad, Científico curioso y Súper movedor.' }
};

ES.printKit = {
  'flyer': { t: 'Volante de inscripción, de dos caras', draft: 'BORRADOR: completa los espacios marcados antes de imprimir', d: 'Frente y reverso, tamaño carta (8.5 x 11 pulgadas). La colegiatura y la tarifa para hermanos son espacios que cada programa debe completar; el espacio para la foto espera el día de fotos.' },
  'enrollment-checklist': { t: 'Lista de verificación de inscripción, una por niño', draft: 'BORRADOR: verificar con la oficina de licencias', d: 'Pasos con fecha e iniciales para el expediente en papel del niño. No se anota ningún dato de salud en ella.' },
  'business-cards': { t: 'Tarjetas de presentación de la dirección', draft: 'BORRADOR: el nombre, el teléfono directo y el correo electrónico de la dirección son espacios por completar', d: '3.5 x 2 pulgadas, 8 por hoja, con sangrado y marcas de corte: primero los frentes, luego los reversos.' },
  'photo-consent': { t: 'Aviso de fotos para la entrada y lista de permisos de fotos', draft: 'BORRADOR — necesita revisión de un abogado', d: 'Un letrero para la puerta principal, y la lista, solo para la oficina, con el nivel de autorización de cada niño.' },
  'media-release': { t: 'Formulario de autorización de fotos y video (niveles 0 a 4)', draft: 'BORRADOR — necesita revisión de un abogado', d: 'Cinco niveles de autorización y una opción para poner o no los nombres en los pies de foto. No es para firmar hasta que lo revise un abogado.' },
  'library-card-sheet': { t: 'Tarjetas de biblioteca y libros (hoja para familias)', d: 'La Imagination Library de Dolly Parton en Missouri no está aceptando inscripciones nuevas por ahora. Esta hoja muestra otras formas gratuitas de conseguir libros: una tarjeta de la Mid-Continent Public Library, el programa 1000 Books Before Kindergarten (1000 libros antes del kínder) y las horas del cuento. Las fuentes aparecen en la hoja.' }
};

/* VIDEOS: same shape as English VIDEOS (arrays in the same order), text fields only. */
ES.videos = {
  shelf: [
    {
      h: 'Conoce a los amigos',
      lede: 'Empieza aquí. Los cuatro amigos te saludan y te cuentan lo que más le gusta a cada uno.',
      items: [
        { t: 'Conoce a los Futures Friends', len: '45 segundos', note: 'Booker, Lumi, Zuri y Bop se presentan en la pradera de fieltro. Pregúntale a tu niño: "¿Con qué amigo te gustaría jugar?"' },
        { t: 'Saluda con la mano', len: '8 segundos, sin sonido', note: 'Los cuatro amigos saludan con la mano. ¡Salúdalos tú también!' },
        { t: 'Booker dice hola', len: '5 segundos, sin sonido', note: 'Booker está sentado con su libro ilustrado y saluda con la mano.' },
        { t: 'Lumi respira con calma', len: '5 segundos, sin sonido', note: 'Lumi cierra los ojos y respira despacio, con las patitas sobre el corazón. Respira con ella.' },
        { t: 'Zuri explora', len: '5 segundos, sin sonido', note: 'Zuri mira las flores con su lupa. ¿Qué notas tú?' },
        { t: 'Bop baila', len: '5 segundos, sin sonido', note: 'Bop hace un baile feliz dando saltitos. ¿Puedes saltar tú también?' },
        { t: 'El logo de Futures Friends', len: '5 segundos, sin sonido', note: 'Nuestro logo de fieltro armándose. A los niños que conocen a los amigos les gusta encontrarlo en libros y carteles.' }
      ]
    },
    {
      h: 'Momentos de la Casa Club',
      lede: 'Un adelanto de la serie que estamos haciendo: momentos cortos de los amigos dándole la bienvenida a un nuevo amigo. Animación del mundo del cuento, no un episodio terminado.',
      items: [
        { t: '¿Abrazo, chócala, saludo o espacio?', len: '10 segundos', note: 'Lumi le pregunta a un nuevo amigo cómo le gusta saludar. Pregúntale a tu niño: "¿Cómo te gusta saludar?"' },
        { t: 'Un saludo chiquito, la misma alegría', len: '8 segundos', note: 'Zuri intenta un saludo chiquitito con la mano. Un saludo pequeño también cuenta.' },
        { t: 'Dos saludos. ¡Escoge uno!', len: '8 segundos', note: 'Bop ofrece dos formas de saludar con la mano y el nuevo amigo escoge una. Inventa tu propio saludo.' },
        { t: 'Las manos se pueden quedar aquí', len: '8 segundos', note: 'Lumi casi da un abrazo, pero primero pregunta. Las manos sobre el corazón también son un saludo amistoso.' },
        { t: 'Puedes mirar primero', len: '5 segundos', note: 'Booker le dice a un nuevo amigo que está bien mirar antes de unirse.' }
      ]
    },
    {
      h: 'Lee con Booker',
      lede: 'Booker muestra cómo un lector valiente intenta leer una palabra nueva.',
      items: [
        { len: '39 segundos', note: 'Mira el dibujo, di el primer sonido, desliza el dedo. ¿No salió del todo? Respiro grande, corazón valiente, inténtalo otra vez.' },
        { len: '39 segundos', note: 'Sss... ¡sol! Booker oye el primer sonido y busca cosas que empiecen con ese sonido. Te toca: escoge un sonido.' }
      ]
    },
    {
      h: 'Siente con Lumi',
      lede: 'Respiraciones de calma y caras de sentimientos, para los sentimientos grandes y los momentos tranquilos.',
      items: [
        { len: '39 segundos', note: 'Huele la flor (toma aire), sopla la vela (suelta el aire). Respira junto con Lumi.' },
        { len: '39 segundos', note: 'Lumi pone una cara de un sentimiento y espera la tuya. ¿Puedes mostrar feliz?' },
        { len: '39 segundos', note: 'Mira, escucha, echa una mano: Lumi muestra los tres gestos amables y las palabras "¿Quieres jugar conmigo?"' },
        { len: '99 segundos', note: 'Para bebés y niños pequeños: Lumi se esconde, dice "¡Cucú!" y espera el turno de tu bebé. Mírenlo una vez y luego jueguen cara a cara.' },
        { t: 'Pausa para respirar en la pradera', len: '8 segundos, se repite, sin sonido', note: 'Sin palabras, solo la pradera. Mira cómo se mece el pasto y respira despacio tres veces, como Lumi.' }
      ]
    },
    {
      h: 'Descubre con Zuri',
      lede: 'Observa, adivina, prueba y compara: así es como Zuri descubre las cosas.',
      items: [
        { len: '39 segundos', note: 'Zuri mira de cerca una flor, adivina, lo prueba y comprueba. Me pregunto, me pregunto...' },
        { len: '39 segundos', note: 'Pasto verde, flores blancas, el sol amarillo, el cielo azul. ¿Qué colores puedes encontrar?' }
      ]
    },
    {
      h: 'Muévete con Bop',
      lede: 'Pausas para moverse juntos, de pie. Cada una tiene en su tarjeta de actividad una forma más fácil de participar.',
      items: [
        { len: '2 min 38 s', note: 'Muévete junto con Bop: el Pisotón y Balanceo del Elefante completo. Pisa fuerte, balancéate, mueve tu trompa, más despacio, la versión tranquila, y luego otra vez a pisar fuerte y balancearse.' },
        { len: '39 segundos', note: 'Estírate bien alto para alcanzar una manzana.' },
        { len: '1 min 9 s', note: 'Baila, quédate como estatua cuando pare la música, y luego otra vez.' },
        { len: '1 min 9 s', note: 'Camina como un elefante, un oso y un conejito.' },
        { len: '1 min 9 s', note: 'Párate en un pie y cuenta hasta cinco. Agárrate de una mano o de la pared. ¡Tambalearse está bien!' },
        { len: '1 min 9 s', note: 'Bop aplaude un ritmo y luego tú lo repites con aplausos.' },
        { len: '39 segundos', note: '¡Estírate y revienta! Revienta con un aplauso, y luego con tu trompa. Después, una respiración grande.' }
      ]
    }
  ],
  planned: [
    { t: '¡Adelante, atrás, arriba, a brillar!', who: 'Booker', what: 'Cepíllate los dientes junto con Booker: adelante, atrás, arriba, y una gran sonrisa brillante.' },
    { t: 'Cuenta colores, no bocados', who: 'Zuri', what: 'Zuri cuenta los colores en un plato de pícnic. Mirar, oler, tocar, probar o decir "no, gracias": toda forma cuenta.' },
    { t: 'Estiramiento de gratitud', who: 'Lumi', what: 'Un estiramiento con Lumi antes de dormir: estírate hacia arriba, agáchate, piensa en una cosa buena.' },
    { t: 'Maracas fuertes y suaves', who: 'Zuri', what: '¡Fuerte, suave, alto! Zuri escucha dos maracas hechas en casa.' },
    { t: 'Paseo para nombrar cosas', who: 'Booker', what: 'Booker señala y nombra lo que ve afuera: una flor, un árbol, una nube.' },
    { t: 'Marcha del desfile', who: 'Bop', what: 'Marcha lento, marcha rápido, y quédate como estatua, con Bop al frente del desfile.' },
    { t: 'Cuentos leídos con los amigos', who: 'Los cuatro amigos', what: 'Los libros de La hora del cuento leídos en voz alta, con las palabras en la pantalla.' }
  ]
};
})();
