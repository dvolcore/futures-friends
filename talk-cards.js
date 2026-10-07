/* "Talk about it" cards for every Futures Friends episode, clip and episode poster on the site (competitive research move #2).
   Why: screen media helped young children only when a grown-up talked with them about it. Daniel Tiger's Neighborhood empathy
   gains appeared only when parents regularly discussed the show with their child (Texas Tech University research, cited below),
   and the AAP's guidance puts co-viewing and quality first. Every episode therefore ships with a card: three questions
   (before, during, after), one feeling word and one thing to try at home.
   Episode list: the Season One slate of the Futures Friends Series & Curriculum Bible v3.0 (13 episodes, FF101 to FF113, s.6.2),
   per launch checklist X10. Titles, leads, loglines, strategy lines, target words, viewer prompts and Friday recall prompts come
   from the Bible's s.6.2 table, Appendix F one-sheets and s.5.6 Parent Page. The Bible is a development master, not
   production-locked, and no episode has been made yet, so every card says "In development".
   Pillars follow the site canon (brand-art.js): Booker LEARN + SMILE, Lumi BELONG + RESET, Zuri EXPLORE + NOURISH, Bop MOVE + OUTSIDE.
   Loaded after views.js (uses V, CH, esc, phero, head, arg at call time). Exposes window.FFTalk. */
(function () {
  'use strict';
  const PILL = { booker: ['LEARN', 'SMILE'], lumi: ['BELONG', 'RESET'], zuri: ['EXPLORE', 'NOURISH'], bop: ['MOVE', 'OUTSIDE'] };
  const NAME = { booker: 'Booker', lumi: 'Lumi', zuri: 'Zuri', bop: 'Bop', all: 'All four friends' };
  // Strategy lines (Bible s.2, the four leads). Bop's site line is "Move Your Body, Grow Your Mind".
  const LINE = { booker: 'I don’t know yet — but I can try.', lumi: 'Notice. Ask. Listen.', zuri: 'I wonder… let’s find out!', bop: 'I can do it — and we can do it together.' };
  const BOP_LINE = 'Move Your Body, Grow Your Mind';
  const SRC = {
    tiger: ['https://www.depts.ttu.edu/comc/research/news/empathy-daniel-tiger.php', 'Texas Tech University: Daniel Tiger and empathy'],
    aap: ['https://www.healthychildren.org/english/family-life/media/pages/helping-kids-thrive-in-a-digital-world-aap-policy-explained.aspx', 'AAP (HealthyChildren.org): helping kids thrive in a digital world']
  };

  // Season One (Bible v3.0 s.6.2). during = the Bible's on-screen viewer prompt; after = its Friday recall prompt where one exists.
  const SLATE = [
    { code: '101', title: 'The Wobbly Welcome Tower', k: 'booker', wk: 1,
      lesson: 'Booker sees the tower wobble and stays quiet. After it tumbles, he says what he noticed and tries his own fix.',
      words: ['wide', 'narrow', 'steady'],
      before: 'Have you ever built a tower that wobbled? What did you do?',
      during: 'Point to the narrow block!',
      after: 'Which block went on the bottom? Why?',
      feel: ['unsure', 'Not knowing what will happen. Booker felt unsure, and tried anyway.'],
      home: 'Stack things you already have, like boxes, plastic cups or books. Try a wide bottom, then a narrow bottom. Which one is steadier?' },
    { code: '102', title: 'A Spot for Everyone', k: 'lumi', wk: 2,
      lesson: 'Lumi builds a story fort and picks every spot herself. It only works when she asks each friend and waits for the answer.',
      words: ['spot', 'inside', 'open'],
      before: 'Where do you like to sit when we read a story?',
      during: 'Where would YOU sit? Point!',
      after: 'Where is the open side of the fort? Why did Lumi leave it open?',
      feel: ['welcome', 'The warm feeling when someone makes room for you.'],
      home: 'Build a blanket fort with one side left open. Ask each person, "Is your spot right for you?" and wait for the answer. Keep blankets off faces.' },
    { code: '103', title: 'What Melts?', k: 'zuri', wk: 3,
      lesson: 'Zuri tries every ice rescue at once and cannot tell what worked, until she runs one fair test: sun or shade.',
      words: ['melt', 'warm', 'predict'],
      before: 'What do you think happens to ice in a sunny spot?',
      during: 'Sun or shade: which melts first? Point!',
      after: 'Which melted first? How did Zuri know?',
      feel: ['curious', 'Wanting to find out. Zuri says, "I wonder… let’s find out!"'],
      home: 'Freeze a big toy (too big to swallow) in two cups of water. Put one cup in the sun and one in the shade. Guess first, then check. Ice stays out of mouths.' },
    { code: '104', title: 'The Cleanup Beat', k: 'bop', wk: 4,
      lesson: 'Bop cleans the whole room alone, fast, and builds Pile-Mountain. His clap-clap-PUT beat turns cleanup into a team job.',
      words: ['sort', 'pattern', 'match'],
      before: 'How do we clean up our toys at home?',
      during: 'Clap-clap-PUT with Bop!',
      after: 'What worked better than piling everything up?',
      feel: ['proud', 'The good feeling after a job done together.'],
      home: 'Clean up to a beat: clap, clap, PUT one toy away. Sort toys into boxes by picture or color. Everyone gets a part.' },
    { code: '105', title: 'The Missing Rhyme', k: 'booker', wk: 5,
      lesson: 'The last page is missing. Booker un-says every ending he tries, until he picks one and keeps it.',
      words: ['rhyme', 'sound', 'end'],
      before: 'What words sound like "cat"?',
      during: 'What rhymes with BEAR? Silly words count!',
      after: 'What rhymes with your favorite animal?',
      feel: ['nervous', 'A wiggly feeling before you try something. Booker laughed, picked a word and kept it.'],
      home: 'Play rhyme ping-pong: say a word, then take turns saying words that rhyme. Silly words count. Rhyme with things, never with people’s names.' },
    { code: '106', title: 'The Feelings Forecast', k: 'lumi', wk: 6,
      lesson: 'Rain cancels Booker’s Story Walk. Lumi’s Fix-It Menu cannot fix his disappointment, so she stops fixing and stays with him.',
      words: ['feeling', 'disappointed', 'calm'],
      before: 'How does your face look when you feel disappointed?',
      during: 'Show me a disappointed face… now calm.',
      after: 'What did Lumi do when the menu did not work?',
      feel: ['disappointed', 'Sad because something you wanted did not happen. The feeling can stay a while, and that is okay.'],
      home: 'Do a morning "feelings forecast": everyone names one feeling. If someone feels low, ask, "Do you want to be quiet together?" and wait. Sharing is always your child’s choice.' },
    { code: '107', title: 'Seed Surprise', k: 'zuri', wk: 7,
      lesson: 'Zuri’s seed will not sprout, so her "help" keeps growing. When she stops to watch and draw, she sees the root grow first.',
      words: ['seed', 'root', 'sprout'],
      before: 'What do you think a seed needs to grow?',
      during: 'Root: up or down? Point!',
      after: 'What grew first, the root or the sprout?',
      feel: ['patient', 'Waiting calmly. Zuri learned to look, wait and draw what she saw.'],
      home: 'A grown-up tucks a dry bean against the side of a clear cup of damp paper towel. Look each day and draw what you see. Beans and soil stay away from mouths; for children under 4, keep the cup sealed in a clear bag.' },
    { code: '108', title: 'Move Like Me', k: 'bop', wk: 8,
      lesson: 'Bop’s warm-up is too fast to follow. When Rory leads a slow spin, Bop slows his whole body down so everyone can join.',
      words: ['first', 'then', 'under'],
      before: 'How do you warm up your body before you play?',
      during: 'Stomp, stomp, FREEZE!',
      after: 'What did Bop do instead of going fast?',
      feel: ['excited', 'A big, bouncy feeling. Bop learned to slow it down so friends could follow.'],
      home: 'Take turns leading a slow warm-up: "First we stomp, then we…" Everyone copies, then your child leads. Move your own way; no spinning until dizzy.' },
    { code: '109', title: 'The Rainbow Snack Adventure', k: 'all', wk: 9, pillars: ['NOURISH', 'OUTSIDE'],
      lesson: 'The friends split up to fill a rainbow snack board and bring back three bananas. Only together, by asking, do they find purple.',
      words: ['purple', 'smell', 'crunchy'],
      before: 'What colors can you find on your plate today?',
      during: 'Can you see something purple? Point!',
      after: 'Who knew where purple grows?',
      feel: ['brave', 'Trying something new. Looking and smelling count, and tasting is always a choice.'],
      home: 'Make a rainbow board: find one food for each color at home or at the store. Look, smell and touch. Tasting is your child’s choice. Shred or cook hard vegetables soft for under-5s.' },
    { code: '110', title: 'The Brave Question', k: 'booker', wk: 10,
      lesson: 'Booker’s book is stuck in his zipped backpack. He refuses help, misses his turn, then asks, "Can you help me, please?"',
      words: ['help', 'stuck', 'ask'],
      before: 'What can you do when something is stuck?',
      during: 'Will pulling HARDER work? Thumbs up or down!',
      after: 'Who could YOU ask for help?',
      feel: ['frustrated', 'The hot, stuck feeling when something will not work. Asking for help is brave.'],
      home: 'Practice the brave question with a tricky zipper or lid: "Can you help me, please?" At bedtime, ask each other, "Who helped you today?"' },
    { code: '111', title: 'Two Friends, One Toy', k: 'lumi', wk: 11,
      lesson: 'Lumi and Zuri both need the toy crane. Lumi keeps giving in, then grabs. Kindness has to include her own turn too.',
      words: ['turn', 'wait', 'next'],
      before: 'What can you do when two people want the same toy?',
      during: 'My turn, your turn: point!',
      after: 'What helped them take turns?',
      feel: ['mad', 'A hot, tight feeling. Lumi took three calm breaths, then said, "I want a turn too."'],
      home: 'Share one toy with a timer or by counting to 20. Practice saying, "I want a turn too" and "Your turn, my turn." When someone feels mad, try three slow breaths together first.' },
    { code: '112', title: 'Where Did My Shadow Go?', k: 'zuri', wk: 12,
      lesson: 'Zuri’s shadow vanishes and she pretends to know why. Saying "I don’t know yet" helps her find the cloud, and a new mystery.',
      words: ['shadow', 'light', 'block'],
      before: 'Where do you think shadows come from?',
      during: 'Make a shadow with your hand!',
      after: 'What is still a mystery?',
      feel: ['puzzled', 'Not knowing the answer yet. It is okay to keep wondering.'],
      home: 'On a sunny day, trace each other’s shadows with chalk and watch what happens when a cloud passes. Indoors, make hand shadows with a flashlight. Never look at the sun; keep the light out of eyes.' },
    { code: '113', title: 'The Brighter Together Parade', k: 'all', wk: 13, pillars: ['LEARN', 'BELONG', 'EXPLORE', 'MOVE'],
      lesson: 'The friends lead a parade for their families, and every job goes wobbly. Each friend fixes one using another friend’s strength.',
      words: ['together', 'strength', 'parade'],
      before: 'What is each friend good at?',
      during: 'Open book, heart hands, compass point, sun stretch!',
      after: 'Whose strength did you use today?',
      feel: ['joyful', 'A big, happy feeling you share with others.'],
      home: 'Hold a family parade around your home. Each person does one friend’s move: Open Book, Heart Hands, Compass Point and Sun Stretch. Walk, do not run.' }
  ];

  // The friends' welcome video (the classroom player on #watch and the first video on #family-videos), and the three episode posters on
  // #watch (draft artwork, not episodes). Gap fill 2026-10-07: w0 was the silent sample clip; it now belongs to the finished welcome video.
  const EXTRA = [
    { code: 'w0', title: 'Meet the Futures Friends: the welcome video', k: 'all', clip: true, pillars: ['LEARN', 'BELONG', 'EXPLORE', 'MOVE'],
      lesson: 'A 45-second story-world animation: Booker, Lumi, Zuri and Bop each say hello and tell you what they love. Captions and a transcript are under the player.',
      before: 'Which friend do you think loves books? Which one loves to move?',
      during: 'Point to Bop! Now point to Lumi!',
      after: 'Which friend would you like to play with? Why?',
      feel: ['happy', 'The light, smiley feeling of meeting new friends.'],
      home: 'Try each friend’s move together: Open Book for Booker, Heart Hands for Lumi, Compass Point for Zuri and Sun Stretch for Bop.' },
    { code: 'p-booker', title: 'Booker: A New Friend at Futures', k: 'booker', poster: 'img/booker-a-new-friend-at-futures-poster.png',
      lesson: 'Draft poster art: Booker, in his blue hoodie with an open-book emblem and his rust-red backpack, smiles hello.',
      before: 'How do you think Booker feels on his first day?',
      during: 'Wave hello like Booker!',
      after: 'How can you help a new friend feel welcome?',
      feel: ['shy', 'A quiet, careful feeling when everything is new.'],
      home: 'Practice a brave hello: wave, smile and say, "Hi, I’m ___. Want to play?"' },
    { code: 'p-bop', title: 'Bop: Teamwork Makes It Brighter', k: 'bop', poster: 'img/bop-teamwork-makes-it-brighter-poster.png',
      lesson: 'Draft poster art: Bop, in his green overalls with a yellow star, reaches out an arm to say hi.',
      before: 'What do you think Bop is excited about?',
      during: 'Reach out your arm and wave hi to Bop!',
      after: 'What is one job we can do together today?',
      feel: ['excited', 'A big, bouncy feeling. Bop shares it with his friends.'],
      home: 'Do one job as a team: carry the laundry basket together, or one person holds the bag while the other fills it.' },
    { code: 'p-lumi', title: 'Lumi: Kindness Goes a Long Way', k: 'lumi', poster: 'img/lumi-kindness-goes-a-long-way-poster.png',
      lesson: 'Draft poster art: Lumi, in her pink top with a heart and her red bow, holds a paw to her heart.',
      before: 'Where is Lumi putting her paw? What might she be feeling?',
      during: 'Make Heart Hands for Lumi!',
      after: 'What kind thing could you do for someone today?',
      feel: ['loved', 'The warm feeling when someone is kind to you.'],
      home: 'Choose one kind thing to do today, like drawing a picture for someone, then show them Heart Hands.' }
  ];
  const ALL = SLATE.concat(EXTRA);
  const find = code => ALL.find(c => c.code === String(code || '').toLowerCase()) || null;
  const pills = c => c.pillars || PILL[c.k] || [];
  const col = k => k === 'all' ? 'var(--gold-deep)' : `var(--${k})`;
  const E = s => (typeof esc === 'function' ? esc : x => String(x == null ? '' : x).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch])))(s);
  const ext = key => `<a href="${SRC[key][0]}" target="_blank" rel="noopener">${E(SRC[key][1])}</a>`;
  const label = c => c.poster ? 'Episode poster · draft art' : c.clip ? 'Welcome video · available now' : `FF${c.code} · Week ${c.wk}`;

  // One card. opts.h: heading level (3 by default); opts.compact: hide the lesson line (used inside the Watch rail pages).
  function card(code, opts = {}) {
    const c = typeof code === 'object' ? code : find(code); if (!c) return '';
    const h = opts.h || 3, k = c.k, who = NAME[k];
    const say = k === 'all' ? '' : `<p class="tk-say"><b>Say it together:</b> “${E(LINE[k])}”${k === 'bop' ? ` <span class="tk-bopline">${BOP_LINE}</span>` : ''}</p>`;
    const status = c.poster ? 'Draft poster art, not an episode. Talk about the picture.'
      : c.clip ? 'A finished story-world video, not an episode. Watch it together, then talk.'
      : 'Episode in development: not made yet. From the Futures Friends Series Bible v3.0 (s.6.2 and Appendix F).';
    return `<article class="tk-card" id="tk-${E(c.code)}" style="--c:${col(k)}" data-talk="${E(c.code)}">
  <header class="tk-head"><span class="tk-code">${E(label(c))}</span><h${h} class="tk-title">${E(c.title)}</h${h}>
   <span class="tk-who">${E(who)}<span class="tk-pills">${pills(c).map(p => `<span class="tk-pill">${p}</span>`).join('')}</span></span></header>
  ${opts.compact ? '' : `<p class="tk-lesson">${E(c.lesson)}</p>`}
  <h${h + 1} class="tk-sub">Talk about it</h${h + 1}>
  <ol class="tk-qs"><li><b>Before</b><span>${E(c.before)}</span></li><li><b>${c.poster ? 'While you look' : 'During'}</b><span>${E(c.during)}${c.poster ? '' : ' <i>(pause once)</i>'}</span></li><li><b>After</b><span>${E(c.after)}</span></li></ol>
  <div class="tk-row"><div class="tk-feel"><b>Feeling word</b><span class="tk-word">${E(c.feel[0])}</span><small>${E(c.feel[1])}</small></div>
   <div class="tk-home"><b>Try at home</b><span>${E(c.home)}</span></div></div>
  ${c.words ? `<p class="tk-words"><b>Words to use:</b> ${c.words.map(E).join(' · ')}</p>` : ''}${say}
  <footer class="tk-foot"><span>${E(status)}</span><button type="button" class="btn soft tk-printbtn" data-tk-print="${E(c.code)}">Print this card</button></footer>
 </article>`;
  }

  const why = () => `<div class="tk-why"><p><b>Why talk about it?</b> In a study of Daniel Tiger’s Neighborhood, children’s empathy grew only when their parents regularly talked with them about the show (${ext('tiger')}). The American Academy of Pediatrics also puts watching together and choosing quality first (${ext('aap')}). Sources checked 5 October 2026.</p></div>`;

  // Bands used on #watch, #friends and #family-videos.
  const watchBand = () => `<section id="tk-watch" class="band-paper tk-band" data-signature><div class="wrap">${typeof head === 'function' ? head('Talk about it', 'A card for every episode', 'Three questions (before, during and after), one feeling word and one thing to try at home, for each Season One episode. Print one, or print the whole set.') : ''}
  ${why()}
  <div class="tk-grid" id="tk-all">${SLATE.map(c => card(c)).join('')}</div>
  <div class="tk-acts"><button type="button" class="btn navy" data-tk-print="all">Print all 13 cards</button><a class="btn soft" href="#talk">Open the card set</a></div></div></section>`;
  // On #watch, under the artwork: cards for the welcome video in the classroom player and for each draft episode poster.
  const posterCards = () => `<h3 class="tk-extrah">Talk about what is here today</h3><div class="tk-grid">${EXTRA.map(c => card(c, { h: 4 })).join('')}</div>`;
  const friendsBand = () => `<section class="band-navy tk-slate"><div class="wrap">${typeof head === 'function' ? head('<span style="color:var(--gold)">The micro-series</span>', 'Season One: 13 planned episodes', 'Thirteen short episodes, one a week, each with a talk-about-it card for grown-ups. They are written and outlined in the Futures Friends Series Bible; none has been made yet.') : ''}
  <div class="tk-slategrid">${SLATE.map(c => `<a class="tk-slatecard" href="#talk/${c.code}" style="--c:${c.k === 'all' ? 'var(--gold)' : `var(--${c.k})`}"><span class="tk-sc">FF${c.code} · Week ${c.wk}</span><b>${E(c.title)}</b><span class="tk-sw">${E(NAME[c.k])}</span><span class="tk-sl">Talk about it card</span></a>`).join('')}</div>
  <details class="tk-more"><summary>Show all 13 talk cards</summary><div class="tk-grid">${SLATE.map(c => card(c, { h: 4 })).join('')}</div></details>
  <p class="small tk-slatenote">In development, not production-locked. Episode length and the weekly rhythm are still being decided.</p></div></section>`;

  // #talk (all cards) and #talk/<code> (one card, ready to print).
  if (typeof V !== 'undefined') {
    V.talk = () => {
      const one = typeof arg !== 'undefined' && arg ? find(arg) : null;
      if (one) return phero('Talk about it', E(one.title), 'One card to print or keep on the fridge: three questions, a feeling word and one thing to try at home.', { crumb: ['talk', 'Talk about it cards'], chars: one.k === 'all' ? undefined : [one.k] }) +
        `<section class="band-paper"><div class="wrap tk-one">${card(one, { h: 2 })}<p class="tk-acts"><a class="btn soft" href="#talk">All talk cards</a><a class="btn soft" href="#watch">Watch</a></p></div></section>`;
      return phero('Talk about it', 'Talk about it cards', 'Short videos help young children most when a grown-up watches too and talks about them afterward. Each card gives you three questions, a feeling word and one thing to try at home.') + `
<section class="band-paper tk-band"><div class="wrap">${why()}
 ${head('Season One', '13 episode cards', 'The episodes are planned and outlined, not made yet. The cards are ready now, so teachers and families can see how every episode will be used.')}
 <div class="tk-grid" id="tk-all">${SLATE.map(c => card(c, { h: 3 })).join('')}</div>
 <div class="tk-acts"><button type="button" class="btn navy" data-tk-print="all">Print all 13 cards</button></div></div></section>
<section><div class="wrap">${head('Watch today', 'The welcome video and the episode posters', 'A card for the friends\' welcome video, and cards for the three draft episode posters. More short videos are on <a href="#family-videos">Watch together</a>.')}
 <div class="tk-grid tk-grid2">${EXTRA.map(c => card(c)).join('')}</div></div></section>`;
    };
  }

  // Print one card (or the whole set) the same way the family library prints: a body class plus a marked target.
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('click', e => {
      const b = e.target && e.target.closest && e.target.closest('[data-tk-print]'); if (!b || typeof window.print !== 'function') return;
      const code = b.getAttribute('data-tk-print');
      const target = code === 'all' ? document.getElementById('tk-all') : b.closest('.tk-card');
      if (!target) return;
      document.querySelectorAll('.tk-print-me').forEach(x => x.classList.remove('tk-print-me'));
      target.classList.add('tk-print-me'); document.body.classList.add('tk-printing');
      const done = () => { document.body.classList.remove('tk-printing'); target.classList.remove('tk-print-me'); window.removeEventListener('afterprint', done); };
      window.addEventListener('afterprint', done);
      try { window.print(); } catch (err) { done(); }
    });
  }

  const API = { SLATE, EXTRA, ALL, PILL, LINE, BOP_LINE, SRC, find, card, watchBand, friendsBand, posterCards, why };
  if (typeof window !== 'undefined') window.FFTalk = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
