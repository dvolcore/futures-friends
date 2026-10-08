/* Futures Friends: the calm Home page (wave 4, owner request 2026-10-06: "The opening page has a lot of information ... if somebody's
   visiting the site for the first time, they should not be seeing things to download ... especially things that are supposed to be
   for only teachers to see for only parents to see ... needs to be cleaned up and way more Professional.").
   - body(): everything on #home under the hero (the hero itself stays in premium.js): one quiet status line from the release
     manifest, three audience doors (one sentence and one button each, each hosted by a friend who peeks over it), the four
     friends (a pick-a-friend stage), how a day works (six steps on a felt path the friends walk along), what we have built (real
     counts, wave 6), trust (our
     Teacher Standard in brief and the pilot center in Independence, Missouri, with the labelled photo and video placeholders) and
     one closing call to action. No downloads, portals, dashboards, sample data, status tables or draft badges on Home.
   - Moves, never deletes: what used to be on Home now lives on the page for its audience. Each is injected here, at load, without
     editing the page's own file:
       "More than a login" (the zone map and program checklist)  -> #for-centers
       the friend carousel ("A friend for every discovery")       -> #friends
       the six-step learning loop and its stats grid              -> #curriculum
       the whole-child band ("More than daycare")                 -> #for-families
       "Meet the Futures Friends Academy" (with the logo reveal)  -> #teacher-standard
     The release status strip, the doors' "available now" lists, sample screenshots and the family activity were already on
     #pricing, #for-centers, #for-home and #for-families; the Teacher and Family Portal links stay in the top utility bar; the
     supporting characters stay on #friends. home-signatures.js wires the carousel and the loop on their new pages.
   Loaded after journey.js, experience.js and teacher-standard.js, before release-strip.js (which then puts the strip under each
   page hero). Sends nothing, stores nothing, loads nothing from outside the site. */
(function () {
  'use strict';
  if (typeof V === 'undefined') return;
  const E = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const icon = name => `<svg class="px-icon" aria-hidden="true"><use href="img/ui-icons.svg#${name}"></use></svg>`;
  const FRIENDS = ['booker', 'lumi', 'zuri', 'bop'];
  const PILLARS = { booker: ['LEARN', 'SMILE'], lumi: ['BELONG', 'RESET'], zuri: ['EXPLORE', 'NOURISH'], bop: ['MOVE', 'OUTSIDE'] };
  const PIN = '<svg class="px-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
  const phone = () => (typeof PHONE === 'string' ? PHONE : '(816) 988-5661');
  const tel = () => 'tel:+1' + phone().replace(/\D/g, '');
  const ch = k => (typeof CH !== 'undefined' && CH[k]) || { n: k, role: '', d: '' };
  // Character art comes from the plush library (FFPlush, plush-cast.js) and keeps its true proportions: the manifest's
  // width/height, object-fit: contain (brand-art.css guards every plush image). h = tallest display height in CSS px.
  const cut = (k, cls) => window.FFPlush.img(k, { cls, alt: '', h: 156 });

  // ---- 1. one quiet status line, from the same release manifest as the strip on every commercial page (review ticket E2/R8-01)
  // families (Home, audience split 2026-10-07): the same quiet line without the ordering status or the pricing link: where we are,
  // what is free today, and the visit. The program version (ordering status -> #pricing) opens the #centers landing.
  function status(families) {
    const R = window.FFRelease && window.FFRelease.data, C = R && R.commercial;
    if (families) return `<div class="hc-status hc-status-family" data-release-version="${E(R ? R.version : '')}"><div class="wrap hc-status-row">
   <p><span class="hc-status-item">${PIN}Piloting in Independence, Missouri</span><span class="hc-status-item">Free stories and activities, open now</span></p>
   <a class="hc-status-link" href="#enroll">Plan a visit ${icon('ArrowRight')}</a></div></div>`;
    const ordering = C && C.ordering_open ? 'Ordering is open' : 'Ordering opens soon';
    return `<div class="hc-status" data-release-version="${E(R ? R.version : '')}"><div class="wrap hc-status-row">
   <p><span class="hc-status-item">${PIN}Piloting in Independence, Missouri</span><span class="hc-status-item" data-ordering="${C && C.ordering_open ? 'open' : 'soon'}">${ordering}</span></p>
   <a class="hc-status-link" href="#pricing">See what is available today ${icon('ArrowRight')}</a></div></div>`;
  }

  // ---- 2. three audience doors: who you are, one sentence, one button
  // Each door is hosted by a friend who peeks over its top edge and pops up to say hi when the door is pointed at or focused
  // (wave 6; home-alive.css). peek = the pose they pop up in.
  // Owner 2026-10-07 (audience split): Home is the families' front door, so its doors lead to family pages. The doors for centers
  // and home daycares (CENTER_DOORS) moved to the #centers landing (audiences.js), with churches and pre-K as equal doors there.
  const DOORS = [
    { id: 'read', k: 'lumi', peek: 'lumi-heart-hands', h: 'Read and play at home', p: 'Free storybooks, activities from things you already have and printables. No account, nothing to buy.', go: ['at-home', 'Futures at Home'] },
    { id: 'watch', k: 'bop', peek: 'bop-waving', h: 'Watch together', p: 'Short videos with the four friends, a calm minute and movement breaks, plus tips to keep screen time small.', go: ['family-videos', 'Watch together'] },
    { id: 'visit', k: 'booker', peek: 'booker-waving', h: 'Visit our pilot center', p: 'Futures Learning Center in Independence, Missouri: tours, applications and a day in the life.', go: ['enroll', 'Plan a visit'] }
  ];
  const CENTER_DOORS = [
    { id: 'centers', k: 'booker', h: 'Child care centers', go: 'for-centers' }, { id: 'home', k: 'zuri', h: 'Home daycares', go: 'for-home' },
    { id: 'faith', k: 'lumi', h: 'Churches and faith-based programs', go: 'for-faith' }
  ];
  // the door's stitched outline: a dashed felt stitch that draws itself in when the door is pointed at or focused (home-alive.css)
  // (a solid stroke in a mask reveals the dashed stitch, so the stitch keeps its dashes while it draws)
  const STITCH = id => `<svg class="hc-stitch" aria-hidden="true" focusable="false"><defs><mask id="hc-stitch-${id}" maskUnits="userSpaceOnUse"><rect class="hc-stitch-mask" pathLength="100"/></mask></defs><rect class="hc-stitch-line" mask="url(#hc-stitch-${id})"/></svg>`;
  function doors() {
    return `<section class="hc-doors" aria-labelledby="hc-doors-h"><div class="wrap">
   <div class="hc-doorshead"><h2 id="hc-doors-h" data-stitch>Start where <span class="hc-key">you</span> are</h2><p>Futures Friends is early learning for children ages 2 to 5. Here is what is free for your family today.</p></div>
   <ul class="hc-doorlist">${DOORS.map(d => `<li class="hc-door" data-door="${d.id}" style="--c:var(--${d.k})">
    <div class="fj-doorart hc-doorart" aria-hidden="true"><span class="hc-peek">${window.FFPlush.img(d.peek || d.k, { cls: 'hc-doorcut', alt: '', h: 156 })}</span></div>
    <h3>${E(d.h)}</h3><p>${E(d.p)}</p>
    <a class="hc-btn hc-doorlink" href="#${d.go[0]}">${E(d.go[1])} ${icon('ArrowRight')}</a>${STITCH(d.id)}</li>`).join('')}</ul>
  </div></section>`;
  }

  // ---- wave 8: story-world animation loops (owner-approved Seedance clips from the approved plush art; muted, looping; receipts in
  // video/manifest.json). Each frame shows its poster first (a lazy image, so nothing is fetched before it comes near); home-video.js
  // gives the <video> its sources only when it is about to play, plays it while on screen (never with reduced motion or the motion
  // switch off), pauses it off screen, and the visible felt button pauses or plays it (WCAG 2.2.2). AV1 first, H.264 fallback.
  const VIDEOS = {
    // Wave 9 (owner-approved 2026-10-07, ~/futures-friends-video/web-intro/INTEGRATION.md): the four friends' ~32 s TALKING intro, each
    // friend introducing themself, replaces the silent 8 s hello loop in the same slot. It has a voice, so it plays once (never loops):
    // muted with captions unless the visitor has sound on and has already tapped the page; the button replays it at the end.
    intro: { once: true, label: 'Story-world animation: Booker the bear, Lumi the bunny, Zuri the turtle and Bop the elephant each say hello and introduce themselves in a felt meadow.', caption: 'Story-world animation: meet the four friends.',
      wide: { av1: 'video/ff-intro-titled-16x9.av1.webm', mp4: 'video/ff-intro-titled-16x9.mp4', poster: 'video/ff-intro-titled-16x9-poster.webp', codecs: 'av01.0.05M.08, opus', w: 1280, h: 720 },
      tall: { av1: 'video/ff-intro-titled-4x5.av1.webm', mp4: 'video/ff-intro-titled-4x5.mp4', poster: 'video/ff-intro-titled-4x5-poster.webp', codecs: 'av01.0.04M.08, opus', w: 720, h: 900 } },
    booker: { label: 'Booker the bear sits in the meadow with his open picture book and waves hello.', tall: { av1: 'video/ff-friend-booker-4x5.av1.webm', mp4: 'video/ff-friend-booker-4x5.mp4', poster: 'video/ff-friend-booker-4x5-poster.webp', codecs: 'av01.0.04M.08', w: 640, h: 800 } },
    lumi: { label: 'Lumi the bunny closes her eyes and takes a slow, calm breath, paws on her heart.', tall: { av1: 'video/ff-friend-lumi-4x5.av1.webm', mp4: 'video/ff-friend-lumi-4x5.mp4', poster: 'video/ff-friend-lumi-4x5-poster.webp', codecs: 'av01.0.04M.08', w: 640, h: 800 } },
    zuri: { label: 'Zuri the turtle explores with her magnifying glass, peering at the flowers and then at you.', tall: { av1: 'video/ff-friend-zuri-4x5.av1.webm', mp4: 'video/ff-friend-zuri-4x5.mp4', poster: 'video/ff-friend-zuri-4x5-poster.webp', codecs: 'av01.0.04M.08', w: 640, h: 800 } },
    bop: { label: 'Bop the elephant does a happy bouncing dance.', tall: { av1: 'video/ff-friend-bop-4x5.av1.webm', mp4: 'video/ff-friend-bop-4x5.mp4', poster: 'video/ff-friend-bop-4x5-poster.webp', codecs: 'av01.0.04M.08', w: 640, h: 800 } }
  };
  const PLAY = '<svg class="hc-vplay" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg><svg class="hc-vpause" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 5h3.6v14H7zM13.4 5H17v14h-3.6z" fill="currentColor"/></svg>';
  const REPLAY = '<svg class="hc-vreplay" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 5V1.5L7 6.25 12 11V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z" fill="currentColor"/></svg>';
  // The friends' loops have no sound track (nothing to caption); the talking intro's captions (speaker names included) are registered
  // in captions.js, so the shared caption hook writes its <track>; written without "default" so its file is not fetched before the
  // clip comes near (lazy, like the clip): home-video.js turns the captions on (showing) when it gives the clip its sources.
  const captions = src => (window.FFCaptions && typeof window.FFCaptions.tracks === 'function' ? window.FFCaptions.tracks(src).replace(/ default>$/, '>') : '');
  function videoFrame(key, cls) {
    const v = VIDEOS[key], wide = v.wide, tall = v.tall, first = wide || tall;
    const poster = wide ? `<picture class="hc-vposter"><source media="(max-width:600px)" srcset="${tall.poster}" width="${tall.w}" height="${tall.h}"><img src="${wide.poster}" alt="" width="${wide.w}" height="${wide.h}" loading="lazy" decoding="async"></picture>`
      : `<span class="hc-vposter"><img src="${first.poster}" alt="" width="${first.w}" height="${first.h}" loading="lazy" decoding="async"></span>`;
    return `<div class="hc-vframe ${cls}" data-video="${key}">${poster}<video class="hc-v" muted${v.once ? '' : ' loop'} playsinline preload="none" disablepictureinpicture aria-label="${E(v.label)}">${captions(first.mp4)}</video><button type="button" class="hc-vbtn" data-video-toggle="${key}" aria-label="Play the animation">${PLAY}${v.once ? REPLAY : ''}</button></div>`;
  }

  // ---- 3. the four friends: a "pick a friend" stage (wave 6). Tabs (one tab stop, arrow keys; home-alive.js) swap the friend who
  // hops forward with their pillars, who they are, and one short activity to try tonight from the family library (FFFamily.ACTS:
  // its real minutes, never a made-up length). Without JavaScript the first friend's panel is simply there, complete.
  const PICKS = { booker: ['booker-reading', 'brave-reader-steps'], lumi: ['lumi-heart-hands', 'smell-the-flower'], zuri: ['zuri-magnifier', 'ice-detectives'], bop: ['bop-dancing', 'freeze-and-try-again'] };
  const act = k => { const F = window.FFFamily; return F && Array.isArray(F.ACTS) ? F.ACTS.find(a => a.id === PICKS[k][1]) || null : null; };
  function pickPanel(k) {
    const c = ch(k), a = act(k), P = window.FFPlush;
    return `<div class="hc-pickart${VIDEOS[k] ? ' has-video' : ''}" style="--c:var(--${k})"><span class="tx-ground hc-pickground" aria-hidden="true"></span>${VIDEOS[k] ? videoFrame(k, 'hc-pickvideo') : ''}${P ? P.img(PICKS[k][0], { cls: 'hc-pickcut', alt: P.alt(PICKS[k][0]), h: 300 }) : ''}</div>
    <div class="hc-pickcopy" style="--c:var(--${k})"><p class="hc-pills">${PILLARS[k].map(p => `<span>${p}</span>`).join('')}</p><h3>${E(c.n)}</h3><p class="hc-role">${E(c.role)}</p><p class="hc-pickd">${E(c.d)}</p>
     ${a ? `<div class="hc-try"><p class="hc-trytitle"><b>Try one tonight: ${E(a.t)}</b><span>${(t => t % 60 ? (t < 60 ? t + ' seconds' : Math.floor(t / 60) + ' min ' + (t % 60) + ' sec') : t / 60 + ' minutes')(Math.round(a.min * 60))}, ${E(String(a.where || '').toLowerCase())}, nothing to buy</span></p><ol>${(a.steps || []).slice(0, 4).map(x => `<li>${E(x)}</li>`).join('')}</ol><a class="hc-trylink" href="#activities/${E(a.id)}">See ${E(a.t)} in the family library ${icon('ArrowRight')}</a></div>` : ''}</div>`;
  }
  function friends() {
    return `<section class="hc-friends hc-pick" aria-labelledby="hc-friends-h"><div class="wrap">
   <div class="hc-head"><h2 id="hc-friends-h" data-stitch>Four friends. Four things children <span class="hc-key">practice</span> every day.</h2><p>Children meet them in stories, find them around the classroom and bring them home. Pick a friend to meet them.</p></div>
   <div class="hc-pickstage tx-felt" data-pick>
    <div class="hc-picktabs" role="tablist" aria-label="Pick a friend">${FRIENDS.map((k, i) => `<button type="button" role="tab" class="hc-picktab" id="hc-pick-${k}" data-k="${k}" aria-selected="${i ? 'false' : 'true'}" aria-controls="hc-pickpanel" tabindex="${i ? -1 : 0}" style="--c:var(--${k})">${window.FFPlush ? window.FFPlush.img(k, { cls: 'hc-picktabcut', alt: '', h: 72 }) : ''}<span>${E(ch(k).n)}</span></button>`).join('')}</div>
    <div class="hc-pickpanel" id="hc-pickpanel" role="tabpanel" aria-labelledby="hc-pick-${FRIENDS[0]}" tabindex="0" data-k="${FRIENDS[0]}">${pickPanel(FRIENDS[0])}</div>
   </div>
   <a class="hc-more" href="#friends">Meet the friends and their books ${icon('ArrowRight')}</a>
  </div></section>`;
  }

  // ---- 4. how a day works: the learning loop as one line of six steps (the full loop and the numbers are on #curriculum)
  const LOOP = () => (typeof FFH_LOOP !== 'undefined' ? FFH_LOOP : []);
  // The friends walk the felt path above the six steps as the section scrolls past (home-alive.js); Booker leads.
  const PARADE = ['booker-waving', 'lumi', 'zuri', 'bop-running'];
  // the felt path: a gentle wave; home-alive.js walks the friends along the same curve (pathY)
  const pathY = t => 34 + 12 * Math.sin(t * Math.PI * 4);
  const PATH_D = Array.from({ length: 41 }, (_, i) => `${i ? 'L' : 'M'}${(i * 25).toFixed(0)} ${pathY(i / 40).toFixed(1)}`).join(' ');
  function day() {
    return `<section class="hc-day" aria-labelledby="hc-day-h"><div class="wrap">
   <div class="hc-head"><h2 id="hc-day-h" data-stitch>From a six-minute story to a <span class="hc-key">whole day</span> of learning</h2><p>Screens start the conversation. Teachers, hands-on play and families carry it the rest of the way.</p></div>
   <div class="hc-trail" data-trail><div class="hc-path" aria-hidden="true"><svg class="hc-pathsvg" viewBox="0 0 1000 60" preserveAspectRatio="none" focusable="false"><path class="hc-pathbase" d="${PATH_D}"/><path class="hc-pathdraw" d="${PATH_D}" pathLength="100"/></svg><span class="hc-parade">${PARADE.map((k, i) => `<span class="hc-walker" data-i="${i}" style="--i:${i}">${window.FFPlush ? window.FFPlush.img(k, { cls: 'hc-walkcut', alt: '', h: 64 }) : ''}</span>`).join('')}</span></div>
   <ol class="hc-steps">${LOOP().map(([n, d, c], i) => `<li style="--c:var(--${c})"><span class="hc-num" aria-hidden="true">${i + 1}</span><b>${E(n)}</b><span>${E(d)}</span></li>`).join('')}</ol></div>
   <a class="hc-more" href="#whole-child">See the whole-child day ${icon('ArrowRight')}</a>
  </div></section>`;
  }

  // ---- 4b. "What we've built" (wave 6, owner: "they have to know that we did more"): real counts only, each read at render time
  // from the files that hold the thing itself, each linking to where it can be seen, each with its honest stage. No downloads.
  //   release manifest (release-manifest.js, generated from the CRM repo's docs/release/ASSET_MANIFEST.json), the family library
  //   (family-library-data.js) and the plush library (plush-cast.js). tests/w6-hero.test.js recomputes every number from the repo.
  // Home (families) shows only the family tiles; the full set, with the curriculum and training counts, is on #centers.
  const FAMILY_PROOF = ['activities', 'printables', 'books', 'characters'];
  function proofData() {
    const R = (window.FFReleaseData && window.FFReleaseData.assets) || {}, F = window.FFFamily || {}, P = window.FFPlush;
    const n = id => (R[id] && +R[id].count) || 0;
    const books = ['book-1', 'book-2', 'book-3', 'book-4', 'book-5'].filter(id => R[id]).length;
    const chars = P ? P.KEYS.filter(k => !P.POSES.includes(k) && !(P.HERO_POSES || []).includes(k)).length : 0;
    return [
      { id: 'unit1', n: n('curriculum-unit1-days'), what: 'teaching days in Unit 1', line: 'Written day by day for twos, threes and pre-K', stage: 'Draft, summary free to read', href: '#unit-1', k: 'booker', pose: 'booker-reading' },
      { id: 'activities', n: Array.isArray(F.ACTS) ? F.ACTS.length : 0, what: 'activities for families', line: 'From things you already have at home', stage: 'Free now', href: '#activities', k: 'zuri', pose: 'zuri-magnifier' },
      { id: 'printables', n: n('printables-family-en') + n('printables-family-es'), what: 'family printables', line: `${n('printables-family-en')} in English and ${n('printables-family-es')} in Spanish`, stage: 'Free now, Spanish in draft', href: '#printables', k: 'lumi', pose: 'lumi-heart-hands' },
      { id: 'books', n: books, what: 'storybooks', line: `${n('book-readalong-web')} free to read along today`, stage: 'In development', href: '#story-time', k: 'booker', pose: 'booker-thinking' },
      { id: 'characters', n: chars, what: 'story-world characters', line: 'Names beyond the four friends are proposals', stage: 'In development', href: '#friends', reveal: '#ff-town-h', k: 'bop', pose: 'bop-waving' },
      { id: 'training', n: n('training-catalog'), what: 'training modules for teachers', line: 'The Futures Friends Academy catalog', stage: 'Draft, not yet state approved', href: '#academy', k: 'lumi', pose: 'lumi-waving' }
    ].filter(x => x.n > 0);
  }
  function proof(families) {
    const d = families ? proofData().filter(x => FAMILY_PROOF.includes(x.id)) : proofData();
    if (!d.length) return '';
    return `<section class="hc-proof" aria-labelledby="hc-proof-h"><div class="wrap">
   <div class="hc-head"><h2 id="hc-proof-h" data-stitch>What we have <span class="hc-key">built</span> so far</h2><p>${families ? 'Counted from our own library, and every one is free to open with your child.' : 'Counted from our own library, and every one is open to look at. Draft means no reviewer has approved it yet.'}</p></div>
   <p class="hc-kinetic" data-kinetic>All of it so children can <span data-k="booker">learn</span>, <span data-k="bop">move</span>, <span data-k="zuri">explore</span> and <span data-k="lumi">belong</span>.</p>
   <ul class="hc-prooflist" data-proof>${d.map(x => `<li class="hc-prooftile" data-proof-id="${x.id}" style="--c:var(--${x.k})"><a href="${x.href}"${x.reveal ? ` data-reveal="${x.reveal}"` : ''}><span class="hc-proofn" aria-hidden="true" data-count="${x.n}">${x.n}</span><span class="ffa-sr">${x.n} </span><b>${E(x.what)}</b><span class="hc-proofline">${E(x.line)}</span><span class="hc-proofstage">${E(x.stage)}</span></a></li>`).join('')}</ul>
  </div></section>`;
  }

  // ---- 1b. "Meet the Futures Friends": the welcome video, big, right under the hero (owner 2026-10-07: "This intro video is too small
  // for people to even see ... It needs to be in a prime location ... almost edge to edge on the screen, because this needs to be a big
  // introduction"). Its own cinema section: the four friends' titled ~45 s intro (VIDEOS.intro) in a felt-framed 16:9 window as wide as
  // the page allows (phones: the 4:5 cut, edge to edge less 16 px), captions on, the felt pause/replay button, "Tap for sound"
  // (home-video.js: poster first, sources only when it is on screen, stops downloading when scrolled past, never autoplays with reduced
  // motion), the transcript under it and a "Starring" row linking each friend to their own videos and activities. The ONLY copy of the
  // intro on Home: the old small slot in the trust band's photo row is gone (the three real photos have that row to themselves).
  const STARS = [['booker', '#activities/booker'], ['lumi', '#activities/lumi'], ['zuri', '#activities/zuri'], ['bop', '#bop-at-home']];
  function intro() {
    const C = window.FFCaptions, tr = C && typeof C.transcript === 'function' ? C.transcript(VIDEOS.intro.wide.mp4, 'the four friends introduce themselves') : '';
    const P = window.FFPlush;
    return `<section class="hc-intro" aria-labelledby="hc-intro-h"><div class="wrap hc-introwrap">
   <div class="hc-introhead"><p class="hc-introtag">Story-world animation</p><h2 id="hc-intro-h" data-stitch>Meet the <span class="hc-key">Futures Friends</span></h2><p>Booker, Lumi, Zuri and Bop say hello and tell you who they are. Captions are on; tap for their voices.</p></div>
   <figure class="hc-video hc-hello hc-introfig">${videoFrame('intro', 'hc-hellovideo hc-introvideo')}<figcaption><b>${E(VIDEOS.intro.caption)}</b>${tr}</figcaption></figure>
   <p class="hc-stars"><span class="hc-starslabel">Starring</span>${STARS.map(([k, href]) => `<a class="hc-star" href="${href}" style="--c:var(--${k})">${P ? P.img(k, { cls: 'hc-starcut', alt: '', h: 40 }) : ''}<span>${E(ch(k).n)}</span></a>`).join('')}</p>
  </div></section>`;
  }

  // ---- 5. trust: our Teacher Standard in brief (teacher-standard.js owns the copy) and the pilot center, with the placeholder frames
  const SLOTS = [['video', 'A short hello from the four friends', 'An 8-second loop for the top of this page', 'bop', 'wide'],
    ['photo', 'A teacher reading on the carpet', 'With a Futures Friends book, families\' permission first', 'booker', 'land'],
    ['photo', 'Hands-on learning', 'Sorting, pouring and painting, hands only', 'zuri', 'land'],
    ['photo', 'Our team at the front door', 'The people who will greet your child', 'lumi', 'land']];
  // SLOTS[0] (the hello video) moved out of this row on 2026-10-07: the welcome video now has its own big section under the hero
  // (intro(), above); this row holds only the three frames of our center. hello() is kept for anything that still wants the small
  // figure, but Home no longer renders it here.
  function hello() {
    const C = window.FFCaptions, tr = C && typeof C.transcript === 'function' ? C.transcript(VIDEOS.intro.wide.mp4, 'the four friends introduce themselves') : '';
    return `<figure class="hc-video hc-hello" data-video="intro">${videoFrame('intro', 'hc-hellovideo')}<figcaption><b>${E(VIDEOS.intro.caption)}</b>${tr}</figcaption></figure>`;
  }
  // Gap fill (2026-10-07): when the real photos of our center are on the site (FFArt.photo, img/center/), the three photo frames show
  // them: the reading corner, a classroom table set for hands-on learning, and the front door. The staff-at-the-door photo needs real
  // people (owner), so that frame becomes the building itself. Without FFArt.photo the labelled frames stay, as before.
  const REAL = [null, ['reading-corner', 'Our reading corner', 'Picture books at child height, a cushioned bench and the reading wall'],
    ['blue-table-room', 'Set for hands-on learning', 'A classroom table with learning trays, a chalkboard easel and the days of the week'],
    ['exterior', 'Our front door', 'The blue door under the Futures sign, 3625 S Blue Ridge Blvd']];
  const hasReal = () => !!(window.FFArt && typeof window.FFArt.photo === 'function');
  function slots() {
    if (!window.FFArt) return '';
    const real = hasReal();
    return `<div class="ffa-slots hc-slots" aria-label="${real ? 'Our center in Independence, in real photos' : 'Photos still to come'}">${SLOTS.map(([kind, title, line, k, ratio], i) => (i === 0 ? ''
      : real ? window.FFArt.photo(REAL[i][0], { title: REAL[i][1], line: REAL[i][2], ratio: 'land', sizes: '(max-width:680px) 92vw, 380px', kitNote: false }) : window.FFArt.slot({ kind, title, line, k, ratio }))).join('')}</div>`;
  }
  function trust() {
    const ts = window.FFTeacherStandard ? window.FFTeacherStandard.callout('home') : '';
    return `<section class="hc-trust" aria-label="Who is with your child, and where"><div class="wrap hc-trustgrid">
   ${ts ? `<div class="hc-trust-ts">${ts}</div>` : ''}
   <div class="hc-trust-place">
    <h2 id="hc-place-h">Our pilot center in Independence, Missouri</h2>
    <p>Futures Friends is piloting at Futures Learning Center, 3625 S Blue Ridge Blvd. Call ${E(phone())} for the ages served right now and current hours.</p>
    <a class="hc-btn hc-btn-quiet" href="#enroll">Visit our pilot center ${icon('ArrowRight')}</a>
   </div>
   <div class="hc-real"><div>${hasReal() ? '<h3>Our center, in real photos</h3><p class="hc-realnote">These are our real rooms and front door in Independence. The two rooms open on a concept: the Futures Friends Learning Zones kit in our classroom, shown as an AI-generated illustration and not installed yet. Tap Real room to see each room today. Photos of children are only ever taken with their families&rsquo; permission.</p>' : '<h3>Photos of our center are coming</h3><p class="hc-realnote">Everything else on this page is the storybook world. These frames mark where photos from our center will go after our photo day.</p>'}</div>${slots()}</div>
  </div></section>`;
  }

  // ---- 6. one closing call to action (the four friends wave goodbye from the felt scene right under it, above the footer:
  // footer-scene.js)
  function close() {
    return `<section class="hc-close" aria-labelledby="hc-close-h"><div class="wrap hc-closegrid">
   <div><h2 id="hc-close-h" data-stitch>Talk to a <span class="hc-key">real person</span></h2><p>Questions about Futures Friends for your child, or about our pilot center in Independence? We are happy to help.</p></div>
   <div class="hc-closeacts"><a class="hc-btn hc-btn-gold" href="#contact">Contact us ${icon('ArrowRight')}</a><a class="hc-btn hc-btn-line" href="${tel()}">Call ${E(phone())}</a>
    <button type="button" class="ff-brand-trigger hc-reveal" data-brand-reveal>${icon('Play')} Watch the logo reveal</button></div>
  </div></section>`;
  }

  // The release status line ("Ordering opens soon", linking to #pricing) is for programs: it now opens the #centers landing.
  const body = () => intro() + doors() + status(true) + friends() + day() + proof(true) + trust() + close();

  // ---------------------------------------------------------------- moved off Home, onto the page for its audience
  // "Meet the Futures Friends Academy": the training catalog is for teachers, so it now closes #teacher-standard.
  function academyBand() {
    return `<section class="px-academyband hc-academy"><div class="wrap"><div><span class="px-kicker">GREAT TEACHING KEEPS GROWING</span><h2>Meet the Futures Friends Academy.</h2><p>Discover the training catalog, save a lesson, and create a plan that fits your week.</p><a class="px-btn px-primary" href="#academy">Explore the Academy ${icon('ArrowRight')}</a><button type="button" class="ff-brand-trigger fj-reveal" data-brand-reveal>${icon('Play')} Watch the logo reveal</button></div><div class="ffa-flagwrap"><img src="img/group.jpg" width="600" height="250" alt="Booker the Brave Little Learner, Lumi the Kindness Keeper, Zuri the Curious Explorer and Bop the Mighty Mover" loading="lazy" decoding="async"></div></div></section>`;
  }
  // Insert html() before the LAST occurrence of marker in a route's output (or at the end). A no-op if the route is missing.
  function insert(route, marker, html) {
    const base = V[route]; if (typeof base !== 'function') return;
    const fn = function () { const out = base.apply(this, arguments), at = marker ? out.lastIndexOf(marker) : -1, add = html(); return at < 0 ? out + add : out.slice(0, at) + add + out.slice(at); };
    V[route] = fn;
  }
  const MOVED = {
    'for-centers': ['<section class="tight">', () => (typeof ffhMap === 'function' ? ffhMap() : '')],
    friends: ['<section class="ff-town', () => (window.FFHome && window.FFHome.rooms ? window.FFHome.rooms() : '')],
    curriculum: ['<section id="addons"', () => (typeof ffhLoop === 'function' ? ffhLoop(true) : '')],
    'for-families': ['<section class="tight">', () => (window.FFWholeChild ? window.FFWholeChild.callout('home') : '')],
    'teacher-standard': ['', academyBand]
  };
  Object.keys(MOVED).forEach(r => insert(r, MOVED[r][0], MOVED[r][1]));

  window.FFHomeCalm = { body, intro, STARS, status, doors, CENTER_DOORS, FAMILY_PROOF, friends, day, proof, proofData, pickPanel, trust, close, slots, academyBand, DOORS, SLOTS, MOVED, PICKS, PARADE, pathY, PATH_D, VIDEOS, videoFrame, hello };
})();
