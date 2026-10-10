/* Futures Friends habit cards: the public PLAYER a QR habit card opens (online school workstream C, 2026-10-10).
   A family or classroom puts small cards where the habit happens (the sink, the toy shelf, the door, the table). Scanning one with a
   phone or tablet opens a short character moment that shows the child the habit: tap to play, 15 to 45 seconds, then "All done!".
   Routes:  #habit/<id>   the player (prerendered as habit-<id>.html, so a card can carry https://.../habit-<id>?l=es)
            #habits       the "Habit cards" explainer for families (what they are, how to use them, who gets the printable sheet)
   Rules (owner brief):
   - The card's address is a plain URL per habit plus the language (?l=en|es). It never carries a name, a child, a center or an account,
     and the player reads nothing else from the address. No sign-in. Nothing is stored about the viewer.
   - Counting is anonymous: the site's own cookieless statistics (analytics.js) get the route name and two events, habit_play and
     habit_done, with the habit id and language only. With statistics off, Do Not Track or GPC, nothing is sent.
   - Ages 2 to 5, positive words, no scores, no streaks, no stars to collect. Screen time is tiny: one short moment, then do it for real.
   - Printable cards with character art are NOT offered here (anti-bootleg rule): enrolled families and partner centers print them from
     the private Futures Hub. This page shows one web-size sample picture, marked "Sample".
   - Existing footage is reused where it fits (Lumi's calm breathing, kind words and feeling faces; Bop's trunk reach). Every other habit
     is an animated card: the friend's plush art with gentle CSS motion and one step at a time in big captions. No voice (owner
     2026-10-10: voice work is paused); each habit has an optional, empty audio slot (audio: { en, es }) for a narration file later.
     No paid generation was used; the missing clips are specified in ~/Downloads/FUTURES_FRIENDS_PROJECT/11_Website_Movement_Videos/Habit_Cards/HABIT_CLIPS_SHOT_LIST.md.
   - Spanish is a DRAFT pending review by the center's Spanish teacher, like every Spanish string on the site.
   - Reduced motion or the site's motion switch off: nothing moves; the steps still change.
   - No sound at all (owner 2026-10-10): clips play muted with captions and no unmute control; no sound effects; FF_SOUND_OFF respected.
   Public: window.FFHabits = { HABITS, get(id), url(id, lang, origin), player(id, lang), page(lang), langFromSearch(search) }.
   Loaded after views.js; works in a VM for the tests (no DOM at load). */
(function (root) {
  'use strict';
  const W = root;
  const D = W && W.document;

  // k: the lead friend; pose: plush-cast slug for the art; motion: bob | sway | hop | breathe | dance; ms: one step's time.
  // video: an existing site clip (video/<video>.mp4 + .en.vtt / .es.vtt + -poster.jpg). count: say the numbers 1..count on that step.
  const HABITS = [
    { id: 'wash-hands', k: 'bop', pose: 'bop-waving', motion: 'bob', ms: 4500,
      where: ['By the sink', 'Junto al lavabo'],
      en: { name: 'Wash your hands', with: 'with Bop', done: 'Clean hands! You did it.',
        steps: ['Water on. Get your hands wet.', 'Soap! Make lots of bubbles.', { t: 'Scrub, scrub! Fronts, backs and between your fingers. Count with Bop!', count: 20 }, 'Rinse the bubbles away.', 'Dry your hands. All clean!'] },
      es: { name: 'Lávate las manos', with: 'con Bop', done: '¡Manos limpias! ¡Lo lograste!',
        steps: ['Abre el agua. Moja tus manos.', '¡Jabón! Haz muchas burbujas.', { t: '¡Frota, frota! Por delante, por detrás y entre los dedos. ¡Cuenta con Bop!', count: 20 }, 'Enjuaga las burbujas.', 'Seca tus manos. ¡Muy limpias!'] } },
    { id: 'brush-teeth', k: 'booker', pose: 'booker-waving', motion: 'bob', ms: 5500,
      where: ['In the bathroom', 'En el baño'],
      en: { name: 'Brush your teeth', with: 'with Booker', done: 'Shiny smile! You did it.',
        steps: ['A grown-up puts a tiny dot of toothpaste on your brush.', 'Brush the top teeth. Little circles!', 'Brush the bottom teeth. Round and round.', 'Now the back teeth, where you chew.', 'Spit it out. Big smile!'] },
      es: { name: 'Cepíllate los dientes', with: 'con Booker', done: '¡Sonrisa brillante! ¡Lo lograste!',
        steps: ['Un adulto pone un puntito de pasta en tu cepillo.', 'Cepilla los dientes de arriba. ¡Circulitos!', 'Cepilla los dientes de abajo. Da vueltas y vueltas.', 'Ahora los dientes de atrás, donde masticas.', 'Escupe. ¡Una gran sonrisa!'] } },
    { id: 'toys-away', k: 'zuri', pose: 'zuri-pointing', motion: 'sway', ms: 5000,
      where: ['On the toy shelf', 'En el estante de juguetes'],
      en: { name: 'Put toys away', with: 'with Zuri', done: 'Toys are home! You did it.',
        steps: ['Clean-up time! Look around. What is on the floor?', 'Pick up one toy.', 'Where does it live? Put it back home.', 'Now another one. You are a great helper!', 'Look! The room is ready to play again.'] },
      es: { name: 'Guarda los juguetes', with: 'con Zuri', done: '¡Los juguetes están en casa! ¡Lo lograste!',
        steps: ['¡Hora de recoger! Mira a tu alrededor. ¿Qué hay en el piso?', 'Levanta un juguete.', '¿Dónde vive? Ponlo en su lugar.', 'Ahora otro. ¡Eres un gran ayudante!', '¡Mira! El cuarto está listo para jugar otra vez.'] } },
    { id: 'clean-up-song', k: 'bop', pose: 'bop-dancing', motion: 'dance', ms: 4200,
      where: ['Where you play', 'Donde juegas'],
      en: { name: 'Clean-up song', with: 'with Bop', done: 'Great singing and great helping!',
        steps: ['Sing with Bop! Ready?', 'Toys go home, one by one,', 'helping hands get clean-up done!', 'Blocks in the bin, books on the shelf,', 'I can help, and you can help!', 'Toys go home, one by one, helping hands get clean-up done!'] },
      es: { name: 'Canción para recoger', with: 'con Bop', done: '¡Qué bien cantas y qué bien ayudas!',
        steps: ['¡Canta con Bop! ¿Listos?', 'Cada juguete a su lugar,', '¡entre todos vamos a ordenar!', 'Bloques al bote, libros al estante,', '¡yo te ayudo y tú me ayudas, adelante!', 'Cada juguete a su lugar, ¡entre todos vamos a ordenar!'] } },
    { id: 'shoes-on', k: 'zuri', pose: 'zuri', motion: 'hop', ms: 4500,
      where: ['By the door', 'Junto a la puerta'],
      en: { name: 'Shoes on', with: 'with Zuri', done: 'Shoes on! You did it.',
        steps: ['Shoes on! Sit down on the floor.', 'Find your shoes. One, two!', 'Toes go in first. Wiggle, wiggle.', 'Push your heel down. Stomp!', 'Close the strap, or ask a grown-up to help.', 'Ready to go exploring!'] },
      es: { name: 'Ponte los zapatos', with: 'con Zuri', done: '¡Zapatos puestos! ¡Lo lograste!',
        steps: ['¡A ponerse los zapatos! Siéntate en el piso.', 'Busca tus zapatos. ¡Uno, dos!', 'Primero entran los dedos. Mueve, mueve.', 'Empuja el talón hacia abajo. ¡Pum!', 'Cierra la correa, o pide ayuda a un adulto.', '¡Listo para explorar!'] } },
    { id: 'gentle-hands', k: 'lumi', pose: 'lumi-heart-hands', motion: 'breathe', ms: 5000,
      where: ['Where friends play together', 'Donde juegan los amigos'],
      en: { name: 'Gentle hands', with: 'with Lumi', done: 'Soft, gentle hands! You did it.',
        steps: ['Gentle hands are soft hands.', 'Show me soft hands. Pat, pat, soft as a bunny.', 'Hands are for helping, waving and high fives.', 'Big feelings? Hands on your tummy, and breathe.', 'Gentle hands help friends feel safe.'] },
      es: { name: 'Manos gentiles', with: 'con Lumi', done: '¡Manos suaves y gentiles! ¡Lo lograste!',
        steps: ['Manos gentiles son manos suaves.', 'Muéstrame manos suaves. Pat, pat, suave como un conejito.', 'Las manos son para ayudar, saludar y chocar los cinco.', '¿Sentimientos grandes? Manos en la pancita, y respira.', 'Las manos gentiles ayudan a que los amigos se sientan seguros.'] } },
    { id: 'take-turns', k: 'booker', pose: 'booker-hero', motion: 'bob', ms: 4800,
      where: ['On the game shelf', 'En el estante de juegos'],
      en: { name: 'Take turns', with: 'with Booker', done: 'Great turn-taking, friends!',
        steps: ['One toy, two friends. Let’s take turns!', 'My turn first. Watch me!', 'Now it’s your turn. I wait and watch.', { t: 'Waiting is tricky. I can count to five.', count: 5 }, 'My turn again! Taking turns is fair.'] },
      es: { name: 'Tomar turnos', with: 'con Booker', done: '¡Qué bien toman turnos, amigos!',
        steps: ['Un juguete, dos amigos. ¡Tomemos turnos!', 'Primero mi turno. ¡Mírame!', 'Ahora es tu turno. Yo espero y miro.', { t: 'Esperar es difícil. Puedo contar hasta cinco.', count: 5 }, '¡Otra vez mi turno! Tomar turnos es justo.'] } },
    { id: 'water-break', k: 'bop', pose: 'bop-running', motion: 'hop', ms: 4200,
      where: ['By the water cups', 'Junto a los vasos de agua'],
      en: { name: 'Water break', with: 'with Bop', done: 'Water break done! You did it.',
        steps: ['Phew! Time for a water break.', 'Find your cup or your bottle.', 'Sip, sip, sip. Slow sips.', 'Ahh! Put your cup back.', 'Ready to move again!'] },
      es: { name: 'Pausa para tomar agua', with: 'con Bop', done: '¡Ya tomaste agua! ¡Lo lograste!',
        steps: ['¡Uf! Hora de tomar agua.', 'Busca tu vaso o tu botella.', 'Sorbo, sorbo, sorbo. Despacito.', '¡Ahh! Guarda tu vaso.', '¡Listo para moverte otra vez!'] } },
    { id: 'rest-time', k: 'lumi', pose: 'lumi-calm-breath', motion: 'breathe', ms: 6500, calm: true,
      where: ['By the rest mats', 'Junto a las colchonetas'],
      en: { name: 'Rest time', with: 'with Lumi', done: 'Rest well, friend.',
        steps: ['Rest time. Find your cozy spot.', 'Lie down soft, like a sleepy bunny.', 'Breathe in slowly... and out.', 'Let your arms and legs go floppy.', 'Close your eyes, or look at something quiet.', 'Rest your body. Sweet rest, friend.'] },
      es: { name: 'Hora de descansar', with: 'con Lumi', done: 'Descansa bien, amigo.',
        steps: ['Hora de descansar. Busca tu lugar cómodo.', 'Acuéstate suavecito, como un conejito con sueño.', 'Respira despacio... y suelta el aire.', 'Deja tus brazos y piernas flojitos.', 'Cierra los ojos, o mira algo tranquilo.', 'Descansa tu cuerpo. Dulce descanso, amigo.'] } },
    { id: 'calm-breathing', k: 'lumi', pose: 'lumi-calm-breath', motion: 'breathe', video: 'act-lumi-calm-breath', secs: 39, calm: true,
      where: ['In the calm corner', 'En el rincón de la calma'],
      about: ['Lumi shows a calm-down breath: smell the flower, blow the candle. Breathe along together when feelings get big, then ask how your body feels now.', 'Lumi muestra cómo respirar con calma: huele la flor, sopla la vela. Respiren juntos cuando los sentimientos sean grandes y luego pregunten cómo se siente su cuerpo.'],
      en: { name: 'Calm-down breathing', with: 'with Lumi', done: 'Calm body, calm breath.' },
      es: { name: 'Respirar con calma', with: 'con Lumi', done: 'Cuerpo tranquilo, respiración tranquila.' } },
    { id: 'kind-friend', k: 'lumi', pose: 'lumi-waving', motion: 'bob', video: 'act-lumi-kind-words', secs: 39,
      where: ['At the classroom door', 'En la puerta del salón'],
      about: ['Lumi shows what to do when a friend is alone: look, listen, lend a hand, and ask \u201cDo you want to play with me?\u201d. Try it together at the door or on the playground.', 'Lumi muestra qué hacer cuando un amigo está solo: mira, escucha, ayuda y pregunta \u201c¿Quieres jugar conmigo?\u201d. Practíquenlo juntos en la puerta o en el patio.'],
      en: { name: 'Be a kind friend', with: 'with Lumi', done: 'Look, listen, lend a hand. You did it!' },
      es: { name: 'Sé un amigo amable', with: 'con Lumi', done: 'Mira, escucha, ayuda. ¡Lo lograste!' } },
    { id: 'feelings-check', k: 'lumi', pose: 'lumi', motion: 'breathe', video: 'act-lumi-feelings-faces', secs: 39,
      where: ['At morning circle', 'En el círculo de la mañana'],
      about: ['Lumi makes feeling faces to copy: happy, sad, surprised, sleepy. Every feeling is okay. Afterwards, ask your child which face matches how they feel today.', 'Lumi hace caras de sentimientos para copiar: feliz, triste, sorprendido, con sueño. Todos los sentimientos están bien. Después, pregunten qué cara se parece a cómo se sienten hoy.'],
      en: { name: 'How do I feel?', with: 'with Lumi', done: 'Every feeling is okay.' },
      es: { name: '¿Cómo me siento?', with: 'con Lumi', done: 'Todos los sentimientos están bien.' } },
    { id: 'wiggle-break', k: 'bop', pose: 'bop-walk-in', motion: 'dance', video: 'act-trunk-reach', secs: 39,
      where: ['On the movement rug', 'En la alfombra de movimiento'],
      about: ['Bop reaches his trunk up high to pick an apple. Stand up and reach with him, as high as you can today, then back to calm play.', 'Bop estira la trompa bien alto para alcanzar una manzana. Pónganse de pie y estírense con él, lo más alto que puedan hoy, y luego vuelvan al juego tranquilo.'],
      en: { name: 'Movement break', with: 'with Bop', done: 'Great reaching! You did it.' },
      es: { name: 'Pausa para moverse', with: 'con Bop', done: '¡Qué bien te estiraste! ¡Lo lograste!' } }
  ];
  HABITS.forEach(h => { if (!h.audio) h.audio = { en: null, es: null }; });   // the optional audio slot: empty for now
  const BY = new Map(HABITS.map(h => [h.id, h]));
  const NAME = { booker: 'Booker', lumi: 'Lumi', zuri: 'Zuri', bop: 'Bop' };
  const ALL_DONE = { en: 'All done!', es: '¡Listo!' };
  const UI = {
    en: { play: 'Tap to play', again: 'Play again', stop: 'Stop', lang: 'Español', langLabel: 'Ver en español', video: 'Video', card: 'Animated card',
      secs: n => `About ${n} seconds`, step: (i, n) => `Step ${i} of ${n}`, grown: 'For grown-ups: about habit cards', more: 'More habits',
      hello: { booker: 'Hi! I’m Booker.', lumi: 'Hi! I’m Lumi.', zuri: 'Hi! I’m Zuri.', bop: 'Hi! I’m Bop.' },
      watchThen: 'Watch together, then do it together.', draft: '' },
    es: { play: 'Toca para empezar', again: 'Otra vez', stop: 'Parar', lang: 'English', langLabel: 'View in English', video: 'Video', card: 'Tarjeta animada',
      secs: n => `Unos ${n} segundos`, step: (i, n) => `Paso ${i} de ${n}`, grown: 'Para adultos: sobre las tarjetas de hábitos', more: 'Más hábitos',
      hello: { booker: '¡Hola! Soy Booker.', lumi: '¡Hola! Soy Lumi.', zuri: '¡Hola! Soy Zuri.', bop: '¡Hola! Soy Bop.' },
      watchThen: 'Mírenlo juntos y luego háganlo juntos.', draft: 'Traducción en borrador, pendiente de revisión.' }
  };
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const stepText = s => (typeof s === 'string' ? s : s.t);
  const get = id => BY.get(String(id || '')) || null;
  const L = l => (l === 'es' ? 'es' : 'en');
  // seconds an animated card takes (hello + steps + counting), shown to grown-ups and checked by the tests (15 to 45 s)
  const seconds = h => h.video ? h.secs : Math.round((2500 + h.en.steps.reduce((t, s) => t + h.ms + (typeof s === 'object' && s.count ? s.count * 1000 : 0), 0)) / 1000);
  // The card's address: the site, the habit, the language. Nothing else, ever.
  const url = (id, lang, origin) => `${String(origin || 'https://dvolcore.github.io/futures-friends').replace(/\/+$/, '')}/habit-${id}${L(lang) === 'es' ? '?l=es' : ''}`;
  const langFromSearch = s => { const m = /[?&]l=(en|es)\b/.exec(String(s || '')); return m ? m[1] : null; };
  const art = (h, size) => `img/plush/characters/${h.pose}-${size === 960 ? 960 : 480}.webp`;
  const plushImg = (h, cls, alt, eager) => {
    const P = W && W.FFPlush;
    if (P && P.img) return P.img(h.pose, { h: 320, alt, cls, eager });
    return `<img class="${cls}" src="${art(h, 480)}" alt="${esc(alt)}" width="320" height="480"${eager ? '' : ' loading="lazy"'} decoding="async" draggable="false">`;
  };

  // ------------------------------------------------------------------ the player (#habit/<id>)
  function player(id, lang) {
    const h = get(id); lang = L(lang);
    if (!h) return '';
    const T = h[lang], U = UI[lang], who = NAME[h.k];
    const steps = h.video ? [] : T.steps;
    const media = h.video
      ? `<div class="hb-video"><video class="hb-vid" muted playsinline preload="none" poster="video/${h.video}-poster.jpg" aria-label="${esc(T.name + ' ' + T.with)}">
          <source src="video/${h.video}.mp4" type="video/mp4">
          <track kind="captions" srclang="en" label="English" src="video/${h.video}.en.vtt"${lang === 'en' ? ' default' : ''}>
          <track kind="captions" srclang="es" label="Español (borrador)" src="video/${h.video}.es.vtt"${lang === 'es' ? ' default' : ''}></video></div>`
      : `<div class="hb-stage" aria-hidden="true"><span class="hb-ground"></span>${plushImg(h, 'hb-char', '', true)}</div>`;
    return `<section class="hb-player hb-${h.k}${h.calm ? ' hb-calm' : ''}" data-hb="${h.id}" data-hb-lang="${lang}" data-hb-state="ready" data-hb-motion="${h.motion}" lang="${lang}" data-i18n-skip translate="no" style="--c:var(--${h.k});--s:var(--${h.k}-s)">
  <div class="hb-top"><span class="hb-kicker">${esc(who)} · ${esc(h.where[lang === 'es' ? 1 : 0])}</span>
    <button type="button" class="hb-lang" data-hb-act="lang" lang="${lang === 'es' ? 'en' : 'es'}" aria-label="${esc(U.langLabel)}">${esc(U.lang)}</button></div>
  <h1 class="hb-title">${esc(T.name)} <span class="hb-with">${esc(T.with)}</span></h1>
  <div class="hb-screen">${media}
    ${h.video ? '' : `<div class="hb-cap" aria-live="polite"><p class="hb-line" data-hb-line>${esc(U.hello[h.k])}</p><p class="hb-count" data-hb-count hidden></p></div>
    <ol class="hb-dots" aria-hidden="true">${steps.map(() => '<li></li>').join('')}</ol>`}
    <button type="button" class="hb-play" data-hb-act="play"><span class="hb-play-i" aria-hidden="true"></span><span class="hb-play-t">${esc(U.play)}</span></button>
    <div class="hb-done" data-hb-done hidden><div class="hb-burst" aria-hidden="true">${'<i></i>'.repeat(12)}</div>
      <p class="hb-done-big">${esc(ALL_DONE[lang])}</p><p class="hb-done-t">${esc(T.done)}</p>
      <button type="button" class="hb-again" data-hb-act="again">${esc(U.again)}</button></div>
  </div>
  <p class="hb-meta">${esc(h.video ? U.video : U.card)} · ${esc(U.secs(seconds(h)))} · ${esc(U.watchThen)}</p>
  ${h.about ? `<p class="hb-about">${esc(h.about[lang === 'es' ? 1 : 0])}</p>` : ''}
  ${steps.length ? `<details class="hb-steps"><summary>${lang === 'es' ? 'Los pasos' : 'The steps'}</summary><ol>${steps.map(s => `<li>${esc(stepText(s))}</li>`).join('')}</ol></details>` : ''}
  ${U.draft ? `<p class="hb-draft">${esc(U.draft)}</p>` : ''}
  <p class="hb-grown"><a href="#habits" data-go="habits">${esc(U.grown)}</a></p>
</section>`;
  }

  // ------------------------------------------------------------------ the explainer (#habits)
  const PAGE = {
    en: { eyebrow: 'For families and classrooms', title: 'Habit cards',
      lede: 'Small cards with a QR code for the sink, the toy shelf and the door. Scan one and a Futures Friend shows your child the habit in under a minute.',
      howT: 'How habit cards work', how: [['Put a card where the habit happens', 'By the sink for hand washing, on the toy shelf for clean-up, by the door for shoes.'], ['Scan it with your phone camera', 'No app and no sign-in. The friend appears with one big button: tap to play.'], ['Watch together, then do it together', 'Each one is 15 to 45 seconds. Then the screen goes off and the real habit starts.']],
      listT: 'The habits', listL: 'Try any of them here. Each is in English and Spanish.', tryIt: 'Try it', video: 'Video', card: 'Animated card',
      sampleT: 'What a card looks like', sampleCap: 'A sample card. The printable card sheet, with the friends’ art and the QR codes, is for enrolled families and partner centers. They print it from the Futures Hub.',
      privT: 'Private by design', priv: ['The QR code is a plain web address for the habit and the language. It never carries a name, a child’s details or an account.', 'Nothing to sign in to, and no cookies. We count only how many times each habit plays, anonymously.', 'No scores, no points and no streaks. Just a friend, a habit and a cheer at the end.'],
      getT: 'Get the printable cards', get: 'Habit cards come with enrollment at Futures Learning Center and with every partner center’s membership.', enroll: 'Visit Futures Learning Center', partner: 'For partner centers', sample: 'Sample' },
    es: { eyebrow: 'Para familias y salones', title: 'Tarjetas de hábitos',
      lede: 'Tarjetitas con un código QR para el lavabo, el estante de juguetes y la puerta. Escanea una y un amigo de Futures Friends le muestra el hábito a tu hijo en menos de un minuto.',
      howT: 'Cómo funcionan las tarjetas de hábitos', how: [['Pon una tarjeta donde ocurre el hábito', 'Junto al lavabo para lavarse las manos, en el estante para recoger, junto a la puerta para los zapatos.'], ['Escanéala con la cámara de tu teléfono', 'Sin aplicación y sin cuenta. Aparece el amigo con un botón grande: toca para empezar.'], ['Mírenlo juntos y luego háganlo juntos', 'Cada uno dura de 15 a 45 segundos. Luego se apaga la pantalla y empieza el hábito de verdad.']],
      listT: 'Los hábitos', listL: 'Pruébalos aquí. Cada uno está en inglés y en español.', tryIt: 'Probar', video: 'Video', card: 'Tarjeta animada',
      sampleT: 'Así se ve una tarjeta', sampleCap: 'Una tarjeta de muestra. La hoja de tarjetas para imprimir, con el arte de los amigos y los códigos QR, es para las familias inscritas y los centros asociados. La imprimen desde el Futures Hub.',
      privT: 'Privado desde el diseño', priv: ['El código QR es una dirección web sencilla del hábito y el idioma. Nunca lleva un nombre, datos de un niño ni una cuenta.', 'Nada que iniciar y sin cookies. Solo contamos, de forma anónima, cuántas veces se reproduce cada hábito.', 'Sin puntos, sin marcadores y sin rachas. Solo un amigo, un hábito y un aplauso al final.'],
      getT: 'Consigue las tarjetas para imprimir', get: 'Las tarjetas de hábitos vienen con la inscripción en Futures Learning Center y con la membresía de cada centro asociado.', enroll: 'Visita Futures Learning Center', partner: 'Para centros asociados', sample: 'Muestra' }
  };
  function page(lang) {
    lang = L(lang);
    const P = PAGE[lang];
    const tile = h => {
      const T = h[lang];
      return `<a class="hb-tile" href="#habit/${h.id}" data-go="habit/${h.id}" style="--c:var(--${h.k});--s:var(--${h.k}-s)">
        <span class="hb-tile-art">${plushImg(h, 'hb-tile-img', '', false)}</span>
        <span class="hb-tile-bd"><b>${esc(T.name)}</b><span class="hb-tile-w">${esc(T.with)} · ${esc(h.where[lang === 'es' ? 1 : 0])}</span>
        <span class="hb-tile-m">${esc(h.video ? P.video : P.card)} · ${esc(UI[lang].secs(seconds(h)))}</span><span class="hb-tile-go">${esc(P.tryIt)} <span aria-hidden="true">→</span></span></span></a>`;
    };
    return `<div class="hb-page" lang="${lang}" data-i18n-skip>
<div class="phero"><div class="wrap"><div style="display:grid;gap:12px"><div class="eyebrow">${esc(P.eyebrow)}</div><h1 style="font-size:clamp(30px,4.4vw,48px)">${esc(P.title)}</h1><p class="lede">${esc(P.lede)}</p>
  <div><button type="button" class="btn soft hb-page-lang" data-hb-act="page-lang" lang="${lang === 'es' ? 'en' : 'es'}">${esc(UI[lang].lang)}</button></div></div>
  <div class="art">${plushImg(get('wash-hands'), '', 'Bop', true)}${plushImg(get('gentle-hands'), '', 'Lumi', true)}</div></div></div>
<section class="band-paper"><div class="wrap"><div class="head"><h2>${esc(P.howT)}</h2></div>
  <ol class="hb-how">${P.how.map((x, i) => `<li><span class="hb-how-n" aria-hidden="true">${i + 1}</span><b>${esc(x[0])}</b><span>${esc(x[1])}</span></li>`).join('')}</ol></div></section>
<section><div class="wrap"><div class="head"><h2>${esc(P.listT)}</h2><p class="lede">${esc(P.listL)}</p></div>
  <div class="hb-grid">${HABITS.map(tile).join('')}</div></div></section>
<section class="band-paper"><div class="wrap hb-two">
  <figure class="hb-sample"><img src="img/habits/habit-card-sample-640.webp" width="640" height="561" alt="${esc(lang === 'es' ? 'Tarjeta de muestra: Lávate las manos con Bop, con un código QR, marcada Muestra' : 'Sample card: Wash your hands with Bop, with a QR code, marked Sample')}" loading="lazy" decoding="async">
    <figcaption><b>${esc(P.sampleT)}</b> ${esc(P.sampleCap)}</figcaption></figure>
  <div class="hb-side"><div class="card"><h3>${esc(P.privT)}</h3><ul class="small">${P.priv.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div class="card"><h3>${esc(P.getT)}</h3><p class="small">${esc(P.get)}</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn gold" href="#enroll" data-go="enroll">${esc(P.enroll)}</a><a class="btn soft" href="#founding-partners" data-go="founding-partners">${esc(P.partner)}</a></div></div></div>
</div></section>
${lang === 'es' ? `<p class="wrap hb-draft">${esc(UI.es.draft)}</p>` : ''}</div>`;
  }

  // ------------------------------------------------------------------ behaviour (browser only)
  const curLang = () => {
    const u = W && W.location ? langFromSearch(W.location.search) : null;
    if (u) return u;
    const I = W && W.FFi18n; return I && I.lang === 'es' ? 'es' : 'en';
  };
  const still = () => !!(D && D.documentElement && (D.documentElement.dataset.motion === 'off' || (typeof W.matchMedia === 'function' && W.matchMedia('(prefers-reduced-motion: reduce)').matches)));
  // ALL SOUND OFF (owner 2026-10-10): the player never makes a sound. No sound effects, the reused clips play muted with captions and
  // no unmute control, and the audio slot below stays silent. SOUND_ALLOWED is the one switch to change later, and the site-wide kill
  // switch window.FF_SOUND_OFF (when present) wins over it.
  const SOUND_ALLOWED = false;
  const soundOn = () => { if (!SOUND_ALLOWED || (W && W.FF_SOUND_OFF)) return false; const S = W && W.FFSound; try { return !(S && typeof S.enabled === 'function' && S.enabled() === false); } catch (_) { return true; } };
  const count = (name, h, lang) => { try { if (typeof W.ffTrack === 'function') W.ffTrack(name, { habit: h.id, lang }); } catch (_) { /* never break the player */ } };
  const sfx = (name, gain) => { if (!soundOn()) return; try { if (W.FFSound && W.FFSound.play) W.FFSound.play(name, { gain: gain || 0.5 }); } catch (_) { /* quiet */ } };

  // OPTIONAL AUDIO SLOT (owner 2026-10-10: no voice work for now). A habit may later carry audio: { en: 'audio/habits/<id>.en.m4a', es: ... },
  // one narration file for the whole animated card; it plays from the visitor's tap, with the site's sound switch. Every slot is empty
  // today (null), so the animated cards are captions only. Video habits use their clip's own sound.
  function playAudio(r, h, lang) {
    const src = h.audio && h.audio[lang];
    if (!src || !soundOn() || typeof W.Audio !== 'function') return;
    try { const a = new W.Audio(src); a.preload = 'auto'; r.audio = a; const p = a.play(); if (p && p.catch) p.catch(() => { /* captions carry it */ }); } catch (_) { /* captions carry it */ }
  }
  let run = null;   // { el, timers: [], token }
  function stop() {
    if (!run) return;
    run.timers.forEach(t => clearTimeout(t)); run.timers = []; run.token++;
    const v = run.el.querySelector('video'); if (v) { try { v.pause(); } catch (_) { /* fine */ } }
    if (run.audio) { try { run.audio.pause(); } catch (_) { /* fine */ } }
    run = null;
  }
  const alive = r => run === r && r.el.isConnected;
  function wait(r, ms, fn) { const tok = r.token; r.timers.push(setTimeout(() => { if (alive(r) && r.token === tok) fn(); }, ms)); }

  function finish(r, h, lang) {
    if (!alive(r)) return;
    const el = r.el;
    el.dataset.hbState = 'done';
    const d = el.querySelector('[data-hb-done]'); if (d) d.hidden = false;
    const again = el.querySelector('.hb-again'); if (again) { try { again.focus({ preventScroll: true }); } catch (_) { /* fine */ } }
    sfx(h.calm ? 'chime' : 'badge', h.calm ? 0.4 : 0.7);
    count('habit_done', h, lang);
    run = null;
  }

  function playCard(r, h, lang) {
    const el = r.el, T = h[lang], line = el.querySelector('[data-hb-line]'), cnt = el.querySelector('[data-hb-count]'), dots = el.querySelectorAll('.hb-dots li');
    const show = (i) => {
      if (!alive(r)) return;
      if (i >= T.steps.length) { finish(r, h, lang); return; }
      const s = T.steps[i], text = stepText(s);
      dots.forEach((d, j) => { d.className = j < i ? 'is-done' : j === i ? 'is-now' : ''; });
      line.textContent = text; line.classList.remove('hb-in'); void line.offsetWidth; line.classList.add('hb-in');
      el.dataset.hbStep = String(i + 1);
      sfx('chime', 0.35);
      wait(r, h.ms, () => countUp(s, () => show(i + 1)));
    };
    let counted = new Set();
    const countUp = (s, then) => {
      if (typeof s !== 'object' || !s.count || counted.has(s)) { then(); return; }
      counted.add(s);
      cnt.hidden = false;
      let n = 0;
      const tick = () => {
        if (!alive(r)) return;
        n++; cnt.textContent = String(n); cnt.classList.remove('hb-pop'); void cnt.offsetWidth; cnt.classList.add('hb-pop');
        if (n >= s.count) { wait(r, 900, () => { cnt.hidden = true; then(); }); return; }
        wait(r, 1000, tick);
      };
      tick();
    };
    // the friend's hello as a caption, then the steps (captions only; the optional audio slot plays if one is ever filled)
    line.textContent = UI[lang].hello[h.k];
    playAudio(r, h, lang);
    wait(r, 2500, () => show(0));
  }

  function playVideo(r, h, lang) {
    const v = r.el.querySelector('video'); if (!v) return;
    try { for (const t of v.textTracks || []) t.mode = t.language === lang ? 'showing' : 'disabled'; } catch (_) { /* fine */ }
    v.muted = true; v.defaultMuted = true; v.volume = 0;          // all sound off: muted, captions on, no controls (so no unmute)
    v.controls = false;
    v.onended = () => { if (alive(r)) finish(r, h, lang); };
    const p = v.play(); if (p && p.catch) p.catch(() => { /* muted play is allowed after the tap; if not, the poster stays */ });
    v.onclick = () => { if (!alive(r)) return; if (v.paused) v.play().catch(() => {}); else v.pause(); };   // tap the clip: pause / play
  }

  function start(el) {
    stop();
    const h = get(el.dataset.hb), lang = L(el.dataset.hbLang);
    if (!h) return;
    const r = { el, timers: [], token: 0 }; run = r;
    el.dataset.hbState = 'playing';
    const d = el.querySelector('[data-hb-done]'); if (d) d.hidden = true;
    count('habit_play', h, lang);
    if (h.video) playVideo(r, h, lang); else playCard(r, h, lang);
  }

  // the address keeps ?l= in step with the language (only when it already has one: a card's English link carries none)
  function addressLang(lang, force) {
    try {
      const q = new URLSearchParams(W.location.search);
      if (!force && !q.has('l')) return;
      q.set('l', lang);
      W.history.replaceState(W.history.state, '', W.location.pathname + '?' + q.toString() + W.location.hash);
    } catch (_) { /* address stays */ }
  }
  function setLang(el, lang) {
    stop();
    const id = el && el.dataset.hb;
    addressLang(lang, true);                                       // first: the re-render below reads the language from here
    try { if (W.FFi18n && typeof W.FFi18n.set === 'function') W.FFi18n.set(lang); } catch (_) { /* the player still switches */ }
    if (!id) return;
    let n = D.querySelector('.hb-player');
    if (!n || n.dataset.hbLang !== lang) {                         // no site switch (or it did not re-render): swap the player in place
      const fresh = D.createElement('div'); fresh.innerHTML = player(id, lang); const m = fresh.firstElementChild;
      if (n) n.replaceWith(m); else if (el.isConnected) el.replaceWith(m);
      n = m;
    }
    const b = n && n.querySelector('.hb-play'); if (b) { try { b.focus({ preventScroll: true }); } catch (_) { /* fine */ } }
  }

  if (D && typeof D.addEventListener === 'function' && typeof W.addEventListener === 'function') {
    D.addEventListener('click', e => {
      const b = e.target && e.target.closest && e.target.closest('[data-hb-act]');
      if (!b) return;
      const act = b.dataset.hbAct;
      if (act === 'page-lang') { setLang(null, b.getAttribute('lang') === 'es' ? 'es' : 'en'); if (typeof W.render === 'function') W.render(); return; }
      const el = b.closest('.hb-player'); if (!el) return;
      if (act === 'play' || act === 'again') start(el);
      else if (act === 'lang') setLang(el, el.dataset.hbLang === 'es' ? 'en' : 'es');
    });
    // leaving the page (another route, the tab hidden) stops the voice and the timers
    W.addEventListener('hashchange', () => stop());
    // the site's own language button (header, menu) also switches the player: the address follows before the route re-renders
    D.addEventListener('ff:lang', e => { const l = e && e.detail && e.detail.lang; if (l === 'en' || l === 'es') { stop(); addressLang(l, false); } });
    D.addEventListener('visibilitychange', () => { if (D.hidden) stop(); });
  }
  if (D && D.documentElement && still()) D.documentElement.classList.add('hb-still');

  // ------------------------------------------------------------------ routes
  if (typeof V !== 'undefined') {
    // a Spanish card (?l=es) puts the whole page in Spanish (header, menu, <html lang>), once, after this render
    const follow = l => { const I = W && W.FFi18n; if (I && typeof I.set === 'function' && I.lang !== l && langFromSearch(W.location && W.location.search)) setTimeout(() => { try { I.set(l); } catch (_) { /* the player is already in l */ } }, 0); };
    V.habit = () => { const id = typeof arg !== 'undefined' && get(arg) ? arg : HABITS[0].id, l = curLang(); follow(l); return `<div class="hb-wrap">${player(id, l)}</div>`; };
    V.habits = () => page(curLang());
  }

  const api = { HABITS, get, url, player, page, seconds, langFromSearch, stepText, stop };
  if (W) W.FFHabits = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : undefined);
