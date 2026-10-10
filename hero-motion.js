/* Futures Friends: the Home hero comes alive. Wave 6 (owner 2026-10-06: "Booker should be in the middle ... maybe they hop in from
   the background, the elephant walks in from the side ... a little bit of motion in the background").
   The entrance (DESIGN.md's one orchestrated motion per page), first Home visit only, about 2.5 s, transforms only:
     Bop walks in from the left edge (his walk-in still), stops and turns to face us (his standing art);
     Lumi hops down from the far hill in two hops (her hop still in the air), lands and stands;
     Zuri springs up out of the grass (her arms-up still), lands and stands;
     Booker walks down the path from the distance to center stage, last, and waves (his hero pose is his standing art).
   As each friend lands, their name and pillars appear, their tagline word gives a little hop and a sparkle pops in their colour.
   ARRIVE below is the whole timeline as data: add, retime or reorder an arrival there, not in code.
   After the entrance: a slow breathing bob and sway (CSS), drifting clouds, a rocking sun (meadow-hero.js layers), and pop-up book
   depth with the pointer (desktop) and with scroll (FFMotion.layers). Every loop pauses off screen and on hidden tabs.
   Each friend is a button (one tab stop on Booker; arrow keys, Home and End move between them). Hover, keyboard focus or a tap: the
   friend switches to their expression still with a springy hop (a plain cross-fade with motion off) and lights their tagline word;
   on desktop the others turn toward them, and all of them turn a little toward the pointer. Click, tap, Enter or Space: the friend
   talks in a felt dialogue card with a name tab (Booker: three lines, the ▶ button moves on, and he asks who you are, with three ways
   in); every line is read out by a polite live region; Escape, the close button or a click elsewhere ends it.
   Character art only ever moves, rotates or scales uniformly: never scaleX/scaleY, skew or a width/height change.
   With reduced motion or the site's Decorative motion switch off nothing moves and no action still is even downloaded: the hero
   renders complete and still. No layout reads per frame; starts after the first paint; nothing is sent or stored.
   Built on ff-motion.js (FFMotion). */
(function () {
  'use strict';
  // Tagline word -> the friend whose pillar it is (WAVE3 brand rules). Order = the order the words are read.
  const WORDS = [['Learn.', 'booker'], ['Move.', 'bop'], ['Explore.', 'zuri'], ['Belong.', 'lumi']];
  const NAMES = { booker: 'Booker', lumi: 'Lumi', zuri: 'Zuri', bop: 'Bop' };
  // In-character reactions on hover, focus and hello. Keyframes use translate, rotate and ONE uniform scale value only.
  // pose: share of the reaction (0..1) shown in the friend's action still, when it is loaded.
  const REACT = {
    booker: [{ transform: 'none' }, { transform: 'translateY(-10%) rotate(-5deg)', offset: .35 }, { transform: 'translateY(-10%) rotate(5deg)', offset: .6 }, { transform: 'none' }],
    lumi: [{ transform: 'none' }, { transform: 'translateY(-16%)', offset: .3 }, { transform: 'none', offset: .55 }, { transform: 'translateY(-6%)', offset: .74 }, { transform: 'none' }],
    zuri: [{ transform: 'none' }, { transform: 'translateY(-14%)', offset: .38 }, { transform: 'none', offset: .7 }, { transform: 'translateY(-3%)', offset: .85 }, { transform: 'none' }],
    bop: [{ transform: 'none' }, { transform: 'rotate(-6deg) scale(1.03)', offset: .25 }, { transform: 'rotate(6deg) scale(1.03)', offset: .5 }, { transform: 'rotate(-3deg)', offset: .75 }, { transform: 'none' }]
  };
  const REACT_MS = { booker: 620, lumi: 760, zuri: 680, bop: 620 };
  const REACT_POSE = { lumi: [0, .62], zuri: [0, .66] };

  // ---- the entrance, as data. at/ms in ms; swap = share of ms at which the action still hands over to the standing art;
  // clip = the figure is clipped at the ground line while it moves (Zuri comes up out of the grass); frames(m) gets measurements.
  const ease = t => 1 - (1 - t) * (1 - t);
  const walk = dx => Array.from({ length: 11 }, (_, i) => {
    const t = i / 10, x = Math.round(dx * (1 - ease(t)) * 10) / 10, up = i % 2 && i < 10;
    return { transform: i === 10 ? 'none' : `translateX(${x}px) translateY(${up ? -3.5 : 0}%) rotate(${i === 10 ? 0 : (i % 4 < 2 ? -2 : 2)}deg)`, offset: t };
  });
  const ARRIVE = [
    { k: 'bop', at: 60, ms: 1150, swap: 1, easing: 'linear', frames: m => walk(m.dx) },
    { k: 'lumi', at: 380, ms: 980, swap: .8, easing: 'linear', frames: () => [
      { transform: 'translateX(-38%) translateY(-30%) scale(.4)', offset: 0 },
      { transform: 'translateX(-29%) translateY(-58%) scale(.52)', offset: .22, easing: 'cubic-bezier(.4,0,.8,.6)' },
      { transform: 'translateX(-18%) translateY(-20%) scale(.66)', offset: .44, easing: 'cubic-bezier(.2,.5,.6,1)' },
      { transform: 'translateX(-8%) translateY(-46%) scale(.84)', offset: .62, easing: 'cubic-bezier(.4,0,.8,.6)' },
      { transform: 'translateY(1.5%) scale(.97)', offset: .8, easing: 'cubic-bezier(.2,.6,.4,1)' },
      { transform: 'translateY(-4%)', offset: .9 },
      { transform: 'none', offset: 1 }] },
    { k: 'zuri', at: 760, ms: 820, swap: .8, clip: true, easing: 'linear', frames: () => [
      { transform: 'translateY(108%)', offset: 0, easing: 'cubic-bezier(.15,.7,.35,1)' },
      { transform: 'translateY(-16%)', offset: .5, easing: 'cubic-bezier(.5,0,.85,.4)' },
      { transform: 'translateY(1%) scale(.98)', offset: .8 },
      { transform: 'translateY(-3%)', offset: .9 },
      { transform: 'none', offset: 1 }] },
    { k: 'booker', at: 1100, ms: 860, wave: true, easing: 'linear', frames: () => [
      { transform: 'translateY(-30%) scale(.34)', offset: 0, easing: 'cubic-bezier(.3,.3,.6,1)' },
      { transform: 'translateY(-24%) scale(.48) rotate(-2deg)', offset: .22 },
      { transform: 'translateY(-16%) scale(.64) rotate(2deg)', offset: .44 },
      { transform: 'translateY(-8%) scale(.82) rotate(-1.5deg)', offset: .66 },
      { transform: 'translateY(1.5%) scale(1.02)', offset: .86 },
      { transform: 'none', offset: 1 }] }
  ];
  // Kept for the reaction tests and any page that wants the wave-5 pop (no longer used by the entrance).
  const POP = [{ transform: 'translateY(20%) scale(.88)' }, { transform: 'translateY(-8%) scale(1.03)', offset: .55 }, { transform: 'translateY(1.5%) scale(.99)', offset: .8 }, { transform: 'none' }];
  const WAVE = [{ transform: 'none' }, { transform: 'rotate(-4deg)', offset: .25 }, { transform: 'rotate(4deg)', offset: .5 }, { transform: 'rotate(-2deg)', offset: .75 }, { transform: 'none' }];
  const WAVE_MS = 520;
  const CAPTION = [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }];
  // Everything below the ground line hidden (the caption row too) while Zuri comes up out of the grass.
  const clip = ground => `polygon(-120% -220%, 220% -220%, 220% ${ground ? ground + 'px' : '70%'}, -120% ${ground ? ground + 'px' : '70%'})`;
  const END = Math.max(...ARRIVE.map(a => a.at + a.ms + (a.wave ? WAVE_MS : 0)));

  let played = false, live = null;
  const M = () => window.FFMotion;
  const anim = (el, frames, o) => (el && typeof el.animate === 'function' ? el.animate(frames, o) : null);

  // Wrap the tagline words once so each can carry its friend's color. Text content is unchanged.
  function words(p) {
    if (!p || p.dataset.ffm) return [];
    const text = p.textContent.trim();
    if (text !== WORDS.map(w => w[0]).join(' ')) return [];
    p.dataset.ffm = '1';
    p.textContent = '';
    return WORDS.map(([w, k], i) => {
      if (i) p.appendChild(p.ownerDocument.createTextNode(' '));
      const s = p.ownerDocument.createElement('span');
      s.className = 'ffm-w';
      s.dataset.k = k;
      s.textContent = w;
      return p.appendChild(s);
    });
  }

  function sparkle(fig, sc) {
    if (!fig) return;
    const doc = fig.ownerDocument;
    for (let i = 0; i < 5; i++) {
      const s = doc.createElement('i');
      s.className = 'ffm-spark';
      s.setAttribute('aria-hidden', 'true');
      fig.appendChild(s);
      const a = (-150 + i * 30) * Math.PI / 180, d = 26 + (i % 2) * 14;
      const run = (sc ? sc.anim.bind(sc) : anim)(s, [{ transform: 'translate(0,0) scale(.4) rotate(0deg)', opacity: 1 }, { transform: `translate(${Math.round(Math.cos(a) * d)}px,${Math.round(Math.sin(a) * d)}px) scale(1) rotate(90deg)`, opacity: 0 }], { duration: 650, easing: 'cubic-bezier(.2,.7,.3,1)' });
      if (run) { const f = run.onfinish; run.onfinish = () => { if (f) f(); s.remove(); }; } else s.remove();
    }
  }

  // An action or expression still for a figure, stacked in the same art box as the standing art (same height unit, its own ratio,
  // same bottom edge), so the swap is a cross-fade and nothing moves the layout. slug: data-pose (entrance) or data-swap (hover).
  function stillImg(fig, slug, ar, pk) {
    const hop = fig && fig.querySelector('.ffa-hop');
    if (!slug || !hop || !window.FFPlush) return null;
    let img = hop.querySelector(`.ffm-pose[data-still="${slug}"]`);
    if (!img) {
      const tmp = fig.ownerDocument.createElement('span');
      // sized for the height the figure is really shown at (138 px on phones, not the 300 px design height), so a phone fetches the
      // 480 file, not the 960 (wave 8: about 117 KB less on an iPhone; the same sharpness at 3x)
      const shown = hop.offsetHeight || 0; // layout height: transforms (the entrance) do not change it
      tmp.innerHTML = window.FFPlush.img(slug, { cls: 'ffm-pose', alt: '', h: Math.round((shown > 40 ? shown : ((window.FFArt && window.FFArt.HERO_H) || 300)) * (pk || 1)), eager: true });
      img = tmp.querySelector('img');
      if (!img) return null;
      img.setAttribute('aria-hidden', 'true');
      img.setAttribute('data-still', slug);
      img.style.setProperty('--par', String(ar || 1));
      img.style.setProperty('--pk', String(pk || 1));
      hop.appendChild(img);
    }
    return img;
  }
  const poseImg = fig => (fig && fig.dataset.pose ? stillImg(fig, fig.dataset.pose, fig.dataset.poseAr, +fig.dataset.pk || 1) : null);
  const swapImg = fig => (fig && fig.dataset.swap ? stillImg(fig, fig.dataset.swap, fig.dataset.swapAr, fig.dataset.swap === fig.dataset.pose ? +fig.dataset.pk || 1 : 1) : null);

  // ---- the friends' dialogue card (felt speech card with a name tab; owner's research item 3). Booker talks in three lines and
  // asks who you are; the last line offers the three ways in. Every other friend says one line. Never auto-advances; the ▶ button
  // (an icon) moves on; Escape or the close button ends it. Lines are read out by the stage's polite status line.
  const TALK = {
    booker: { lines: ["Hi! I'm Booker.", 'Big breath, brave heart. I can show you around.', 'Are you a family, a center, or a teacher?'],
      ask: [['families', 'A family', 'for-families'], ['centers', 'A center', 'for-centers'], ['staff', 'A teacher', 'teacher-standard']] }
  };
  const ICON = n => `<svg class="px-icon" aria-hidden="true" focusable="false"><use href="img/ui-icons.svg#${n}"></use></svg>`;

  function setup(view, root, ok) {
    if (live) { live.abort(); live = null; }
    if (view !== 'home' || !root) return;
    const stage = root.querySelector('.ffa-stage');
    if (!stage || !M()) return;
    const sc = M().scope();
    live = sc;
    const motion = M().allowed(ok);
    const friends = Array.from(stage.querySelectorAll('.ffa-friend'));
    const figs = friends.map(b => b.closest('.ffa-fig'));
    const say = stage.querySelector('.ffa-say'), status = stage.querySelector('[role=status]');
    const hero = stage.closest('.px-homehero') || stage;
    const tagline = hero.querySelector('.px-herocopy p');
    const ws = words(tagline);
    const byK = k => friends.findIndex(b => b.dataset.k === k);
    const lead = Math.max(0, friends.findIndex(b => b.tabIndex === 0));
    let entering = false;

    // --- tagline <-> friend link: pointing at a friend lights its word
    const lightWord = (k, onOff) => ws.forEach(w => { if (w.dataset.k === k) w.classList.toggle('is-on', onOff); });

    // --- the dialogue card (works with motion off; motion only adds its pop and the friend's hop)
    let talking = -1, line = 0;
    // wave 9: with friend-voices.js the first line is exactly what the friend says out loud (the card is the transcript)
    const FV = () => window.FFVoices || null, said = k => (FV() && FV().LINES[k]) || '';
    const lines = k => { const L = TALK[k] ? TALK[k].lines.slice() : [`Hi! I'm ${NAMES[k] || k}. ${(friends[byK(k)] && friends[byK(k)].dataset.motto) || ''}`.trim()]; if (said(k)) L[0] = said(k); return L; };
    let voice = '';   // 'playing' | 'off' | '' for the friend talking now
    const quiet = () => { if (say) say.classList.remove('is-speaking'); figs.forEach(f => f && f.classList.remove('ffm-talking')); };
    const close = () => {
      const had = talking >= 0, ae = say && say.ownerDocument.activeElement, inside = !!(ae && ae.closest && ae.closest('.mh-say'));
      friends.forEach(b => b.setAttribute('aria-pressed', 'false'));
      figs.forEach(f => f && f.classList.remove('is-on'));
      voice = ''; if (FV()) FV().stop(); quiet();
      if (say) { say.textContent = ''; say.hidden = true; say.removeAttribute('data-k'); }
      if (status) status.textContent = '';
      if (had && inside) friends[talking].focus();
      talking = -1; line = 0;
    };
    const show = () => {
      const b = friends[talking], k = b.dataset.k, L = lines(k), last = line >= L.length - 1, t = TALK[k];
      say.hidden = false;
      say.dataset.k = k;
      say.style.setProperty('--sc', `var(--${k})`);
      say.innerHTML = `<span class="mh-saytab">${NAMES[k] || k}<span class="mh-saywave" aria-hidden="true"><i></i><i></i><i></i></span></span><p class="mh-sayline"></p>`
        + (last && t && t.ask ? `<div class="mh-sayask" role="group" aria-label="Who are you?">${t.ask.map(([aud, label, go]) => `<a class="mh-sayaskbtn" href="#${go}" data-aud="${aud}">${label} ${ICON('ArrowRight')}</a>`).join('')}</div>` : '')
        + (voice === 'off' && line === 0 && !window.FF_SOUND_OFF ? `<p class="mh-sayhint">Sound is off. Turn it on to hear ${NAMES[k] || k}.</p>` : '')
        + `<div class="mh-saynav">${FV() && FV().GO[k] ? `<a class="mh-saygo" href="#${FV().GO[k][0]}" data-reveal="${FV().GO[k][2]}">${FV().GO[k][1]} ${ICON('ArrowRight')}</a>` : ''}${last ? '' : `<button type="button" class="mh-saynext" aria-label="Next: ${NAMES[k] || k} keeps talking">${ICON('Play')}</button>`}<button type="button" class="mh-sayclose" aria-label="Close ${NAMES[k] || k}'s hello">${ICON('X')}</button></div>`;
      say.querySelector('.mh-sayline').textContent = L[line];
      if (status) status.textContent = `${NAMES[k] || k}: ${L[line]}`;
      // where the card points: the speaking friend (desktop: the card sits in the open meadow at the right, beside the cast)
      const s = stage.getBoundingClientRect(), r = (b.querySelector('img') || b).getBoundingClientRect();
      say.style.setProperty('--ty', Math.round(r.top + r.height * .3 - s.top) + 'px');
      if (motion) sc.anim(say, [{ opacity: 0, transform: 'translateY(8px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: 'cubic-bezier(.3,1.4,.5,1)' });
    };
    const hello = i => {
      const b = friends[i], fig = figs[i];
      if (b.getAttribute('aria-pressed') === 'true') return close();
      close();
      b.setAttribute('aria-pressed', 'true');
      fig.classList.add('is-on');
      talking = i; line = 0;
      // wave 9: the friend says their hello out loud (a tap is the user gesture; the site's sound switch decides)
      voice = FV() ? FV().play(b.dataset.k, () => { voice = voice === 'playing' ? '' : voice; quiet(); }) : '';
      if (voice === 'playing') { if (say) say.classList.add('is-speaking'); fig.classList.add('ffm-talking'); }
      if (say) show(); else if (status) status.textContent = `${NAMES[b.dataset.k]}: ${lines(b.dataset.k)[0]}`;
      if (motion) react(i);
    };
    if (say) {
      sc.listen(say, 'click', e => {
        const t = e.target && e.target.closest ? e.target : null;
        if (!t) return;
        if (t.closest('.mh-saynext')) { const L = lines(friends[talking].dataset.k); if (line < L.length - 1) { line++; show(); const n = say.querySelector('.mh-saynext') || say.querySelector('.mh-sayaskbtn'); if (n) n.focus(); } return; }
        if (t.closest('.mh-sayclose')) { close(); return; }
        const ask = t.closest('.mh-sayaskbtn');
        if (ask && window.FFAudience && typeof window.FFAudience.set === 'function') { try { window.FFAudience.set(ask.dataset.aud); } catch (err) { /* plain navigation still happens */ } }
      });
      sc.listen(say, 'keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } });
    }

    // --- the expression swap (owner's research item 2): pointed at, focused or tapped, a friend switches to their expression still,
    // with a springy hop when motion is on (a plain cross-fade when it is off). The still is made on first use.
    const want = new Set();
    const swapOn = (i, on) => {
      const fig = figs[i];
      if (!fig || (on && entering)) return;
      if (on) want.add(i); else want.delete(i);
      const img = on ? swapImg(fig) : fig.querySelector(`.ffm-pose[data-still="${fig.dataset.swap}"]`);
      if (!img) return;
      const apply = () => { const v = want.has(i); img.classList.toggle('is-shown', v); fig.classList.toggle('ffm-posing', v); };
      // never hide the standing art before the still has arrived (first hover with motion off makes the still on demand)
      if (on && img.complete === false) { img.addEventListener('load', apply, { once: true, signal: sc.signal }); return; }
      apply();
    };
    const tapTimers = new Map();

    // --- in-character reactions (motion only): the hop under the swap
    const busy = new Set();
    function react(i) {
      if (!motion || entering || busy.has(i)) return;
      const hop = friends[i].querySelector('.ffa-hop'), k = friends[i].dataset.k, ms = REACT_MS[k] || 620;
      busy.add(i);
      const a = sc.anim(hop, REACT[k], { duration: ms, easing: 'cubic-bezier(.34,1.4,.64,1)' });
      sparkle(figs[i], sc);
      if (a) { const f = a.onfinish; a.onfinish = () => { if (f) f(); busy.delete(i); }; } else busy.delete(i);
    }

    // --- friends who notice you (research item 16): while the pointer is over the hero, each friend turns up to 4 degrees toward it;
    // while one friend is pointed at or focused, the others turn toward that friend. Desktop fine pointer only; `rotate` only.
    const lean = x => figs.forEach((f, j) => {
      if (!f) return;
      if (x == null) { friends[j].style.removeProperty('rotate'); return; }
      const r = friends[j].getBoundingClientRect(), d = x - (r.left + r.width / 2);
      friends[j].style.setProperty('rotate', `${Math.max(-4, Math.min(4, d / 60)).toFixed(2)}deg`);
    });
    const leanTo = i => {
      const r = friends[i].getBoundingClientRect(), cx = r.left + r.width / 2;
      friends.forEach((b, j) => {
        if (j === i) { b.style.removeProperty('rotate'); return; }
        const q = b.getBoundingClientRect();
        b.style.setProperty('rotate', `${cx > q.left + q.width / 2 ? 3 : -3}deg`);
      });
    };

    // --- roving focus + events (Booker, center stage, holds the tab stop)
    const focusAt = i => { const n = (i + friends.length) % friends.length; friends.forEach((b, j) => { b.tabIndex = j === n ? 0 : -1; }); friends[n].focus(); };
    friends.forEach((b, i) => {
      // a keyboard press (Enter or Space: a click with no pointer detail) moves focus into the open card; Escape brings it back
      sc.listen(b, 'click', e => { hello(i); if (e && e.detail === 0 && say && !say.hidden) { const c = say.querySelector('a, button'); if (c) c.focus(); } });
      sc.listen(b, 'focus', () => { friends.forEach((x, j) => { x.tabIndex = j === i ? 0 : -1; }); lightWord(b.dataset.k, true); swapOn(i, true); react(i); if (noticing()) leanTo(i); });
      sc.listen(b, 'blur', () => { lightWord(b.dataset.k, false); swapOn(i, false); if (noticing()) lean(null); });
      sc.listen(b, 'pointerenter', e => { if (e.pointerType === 'mouse') { lightWord(b.dataset.k, true); swapOn(i, true); react(i); if (noticing()) leanTo(i); } });
      sc.listen(b, 'pointerleave', e => { if (b.ownerDocument.activeElement !== b) { lightWord(b.dataset.k, false); swapOn(i, false); } });
      sc.listen(b, 'pointerdown', e => {
        if (e.pointerType === 'mouse') return;
        swapOn(i, true);
        clearTimeout(tapTimers.get(i));
        tapTimers.set(i, setTimeout(() => { if (b.ownerDocument.activeElement !== b) swapOn(i, false); }, 1400));
      });
      sc.listen(b, 'keydown', e => {
        const moves = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: friends.length - 1 };
        if (e.key === 'Escape') { close(); return; }
        if (!(e.key in moves)) return;
        e.preventDefault();
        focusAt(moves[e.key]);
      });
    });
    sc.add(() => tapTimers.forEach(t => clearTimeout(t)));
    sc.listen(document, 'pointerdown', e => { if (!e.target || !e.target.closest || !e.target.closest('.ffa-friend, .mh-say')) close(); });
    sc.listen(document, 'keydown', e => { if (e.key === 'Escape') close(); });
    let vw = innerWidth;
    sc.listen(window, 'resize', () => { if (innerWidth !== vw) { vw = innerWidth; close(); } });
    sc.add(() => { friends.forEach((b, j) => { b.tabIndex = j === lead ? 0 : -1; b.style.removeProperty('rotate'); }); close(); figs.forEach(f => f && f.querySelectorAll('.ffm-pose.is-shown').forEach(x => x.classList.remove('is-shown'))); });
    let seenRef = null;
    function noticing() { return motion && !entering && M().fine() && (!seenRef || seenRef.seen); }

    if (!motion) return; // static, complete hero: nothing below runs; an expression still is only made when a friend is pointed at

    stage.classList.add('ffm-live');
    if (hero !== stage) hero.classList.add('ffm-live');
    sc.add(() => { stage.classList.remove('ffm-live', 'ffm-paused'); hero.classList.remove('ffm-live', 'ffm-paused'); figs.forEach(f => f && f.classList.remove('ffm-posing', 'ffm-arriving')); });

    // --- pause every loop (the world's and the friends') when the stage is off screen or the tab is hidden
    // (wave 7: with hero-world.js the world pauses on the hero's own visibility, so a short phone that shows the logo but not yet the
    // friends keeps its sky moving; without it the meadow pauses with the stage as before)
    const vis = sc.pauseOffscreen(stage, hero !== stage && !window.FFHeroWorld ? [hero] : []);
    seenRef = vis;
    if (M().fine()) {
      let raf = 0, mx = null;
      sc.listen(hero, 'pointermove', e => { if (e.pointerType !== 'mouse' || !noticing() || (e.target.closest && e.target.closest('.ffa-friend'))) return; mx = e.clientX; if (!raf) raf = requestAnimationFrame(() => { raf = 0; lean(mx); }); });
      sc.listen(hero, 'pointerleave', () => lean(null));
      sc.add(() => { if (raf) cancelAnimationFrame(raf); });
    }

    // --- depth with the pointer, the phone's tilt and scroll: the world's camera (hero-world.js, wave 7). The cast stands on the plane
    // the camera turns around, so it never slides; the world behind and in front of it does.

    // --- the entrance (first Home render of this visit) and the doors' friends. Everything is created paused BEFORE the first
    // paint (friends at their starting marks, captions hidden, door friends lowered) and decided in the first frame, after go()
    // has scrolled to the top: if the stage is not on screen then, nothing is held back and the entrance waits for a later visit.
    const DOOR = [{ transform: 'translateY(22px) rotate(-8deg)', opacity: 0 }, { transform: 'translateY(-4px) rotate(3deg)', opacity: 1, offset: .65 }, { transform: 'none', opacity: 1 }];
    const held = (el, frames, o) => { const a = sc.anim(el, frames, Object.assign({ fill: 'backwards' }, o)); if (a) a.pause(); return a; };
    const doors = Array.from(root.querySelectorAll('.fj-doorart')).map(d => ({ d, a: held(d, DOOR, { duration: 620, easing: 'cubic-bezier(.3,.8,.4,1)' }) })).filter(x => x.a);
    const seq = [], cues = [];
    const poses = figs.map(f => (f ? poseImg(f) : null));
    // the expression stills load after the hero is drawn (idle), so the first hover never waits
    sc.timer(() => figs.forEach(f => f && swapImg(f)), 2600);
    if (!played) {
      entering = true;
      ARRIVE.forEach(spec => {
        const i = byK(spec.k);
        if (i < 0) return;
        const b = friends[i], fig = figs[i], land = spec.at + spec.ms * (spec.swap || 1);
        // Bop starts just past the left edge of the screen: measured once, now, from the figure's resting box.
        const r = fig.getBoundingClientRect();
        const dx = -Math.round((r.left || 0) + (r.width || 200) + 24);
        seq.push(held(b, spec.frames({ dx }), { duration: spec.ms, delay: spec.at, easing: spec.easing || 'linear' }));
        const cap = fig.querySelector('figcaption');
        if (cap) seq.push(held(cap, CAPTION, { duration: 320, delay: land, easing: 'cubic-bezier(.2,.8,.3,1)' }));
        const w = ws.find(x => x.dataset.k === spec.k);
        if (w) seq.push(held(w, [{ transform: 'none' }, { transform: 'translateY(-.28em)', offset: .4 }, { transform: 'none' }], { duration: 420, delay: land, easing: 'cubic-bezier(.3,.7,.4,1)' }));
        if (spec.wave) seq.push(held(b.querySelector('.ffa-hop'), WAVE, { duration: WAVE_MS, delay: spec.at + spec.ms, easing: 'ease-in-out' }));
        // The hand-over between the action still and the standing art, and Zuri's ground clip, are Web Animations too, on the same
        // clock as the movement (so the whole entrance can be paused, scrubbed or slowed as one timeline).
        // (the standing art comes back in one frame at the landing, under the still, which then fades in 90 ms: no double image)
        const D = land + 90, f = x => Math.min(1, Math.max(0, x / D)), on = spec.at < 100 ? 0 : f(spec.at), off = f(land);
        const pose = poses[i], rest = b.querySelector('.ffa-hop > .ffa-cut');
        if (pose) {
          seq.push(held(pose, [{ opacity: on ? 0 : 1, offset: 0 }, { opacity: on ? 0 : 1, offset: on }, { opacity: 1, offset: Math.min(1, on + .001) }, { opacity: 1, offset: off }, { opacity: 0, offset: 1 }], { duration: D, easing: 'linear' }));
          if (rest) seq.push(held(rest, [{ opacity: on ? 1 : 0, offset: 0 }, { opacity: on ? 1 : 0, offset: on }, { opacity: 0, offset: Math.min(1, on + .001) }, { opacity: 0, offset: off }, { opacity: 1, offset: Math.min(1, off + .001) }, { opacity: 1, offset: 1 }], { duration: D, easing: 'linear' }));
        }
        const CLIP = clip(b.offsetHeight);
        if (spec.clip) seq.push(held(fig, [{ clipPath: CLIP, offset: 0 }, { clipPath: CLIP, offset: off }, { clipPath: 'none', offset: Math.min(1, off + .001) }, { clipPath: 'none', offset: 1 }], { duration: D, easing: 'linear' }));
        cues.push({ i, spec, land, pose });
      });
    }
    const imgs = friends.map(b => b.querySelector('img')).concat(poses).filter(Boolean);
    const ready = Promise.race([Promise.all(imgs.map(im => (im.decode ? im.decode().catch(() => {}) : null))), new Promise(r => setTimeout(r, 700))]);
    const visible = el => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; };
    // Before the first paint every arriving friend skips its idle loop (the held animations above already place them).
    if (seq.length) cues.forEach(c => figs[c.i].classList.add('ffm-arriving'));
    // Wave 7: when the world's fly-through opening plays (hero-world.js decides in the frame before this one), the cast waits for the
    // camera to come down out of the clouds (W.lead ms) and arrives as the meadow settles; it plays even if the camera has the stage
    // lowered right now. Any input during the opening or the entrance fast-forwards both (skip below).
    let W = null;
    const pending = [];
    let started = false, skipped = false, armed = false;
    const defer = (f, ms) => { pending.push([sc.timer(f, ms), f]); };
    const start = rate => {
      if (started || sc.aborted) return;
      started = true; played = true;
      seq.forEach(a => { if (a) { a.play(); if (rate > 1 && a.updatePlaybackRate) a.updatePlaybackRate(rate); } });
      if (rate > 1) { settle(); return; }
      cues.forEach(({ i, spec, land }) => {
        const fig = figs[i];
        defer(() => sparkle(fig, sc), land);
        defer(() => fig.classList.remove('ffm-arriving'), spec.at + spec.ms + (spec.wave ? WAVE_MS : 0));
      });
      defer(() => { entering = false; }, END);
    };
    // fast-forward: every held or running entrance animation finishes in about a quarter of a second, nothing is left waiting
    const settle = () => { pending.splice(0).forEach(([id]) => clearTimeout(id)); cues.forEach(({ i }) => figs[i].classList.remove('ffm-arriving')); entering = false; };
    live.skip = () => {
      if (skipped || sc.aborted || !armed) return;
      skipped = true;
      if (!started) { start(12); return; }
      seq.forEach(a => { if (a && a.playState !== 'finished' && a.updatePlaybackRate) a.updatePlaybackRate(12); });
      settle();
    };
    const decide = () => {
      if (sc.aborted) return;
      W = window.FFHeroWorld && typeof window.FFHeroWorld.opening === 'function' ? window.FFHeroWorld.opening() : null;
      const entrance = seq.length > 0 && (W ? true : visible(stage));
      if (!entrance) { seq.forEach(a => a && a.cancel()); entering = false; figs.forEach(f => f && f.classList.remove('ffm-arriving')); }
      const now = [], later = [];
      doors.forEach(x => (visible(x.d) ? now : later).push(x));
      // On screen now: they join the end of the entrance, or simply stay put. Further down: each pops in as it arrives.
      now.forEach((x, i) => { if (entrance) x.a.effect.updateTiming({ delay: (W ? W.lead : 0) + END - 300 + i * 140 }); else x.a.cancel(); });
      if (later.length) {
        const dio = sc.observe(es => es.forEach(e => {
          if (!e.isIntersecting) return;
          dio.unobserve(e.target);
          const x = later.find(y => y.d === e.target);
          if (x) x.a.play();
        }), { threshold: .3 });
        if (dio) later.forEach(x => dio.observe(x.d)); else later.forEach(x => x.a.cancel());
      }
      if (!entrance) return;
      // Start once the cut-outs and stills are decoded (never waits more than 700 ms), so nothing moves before it is drawn; with the
      // opening, after its lead (counted from this first frame).
      played = true; armed = true;
      const camera = W && W.started ? W.started.then(() => Date.now()) : Promise.resolve(0);
      ready.then(() => camera).then(t0 => sc.frame(() => {
        now.forEach(x => x.a.play());
        if (skipped) return;
        const wait = W ? Math.max(0, W.lead - (Date.now() - t0)) : 0;
        if (wait) defer(() => start(1), wait); else start(1);
      }));
    };
    // the entry gate (entry.js): the cast arrives after the visitor has passed it (hero-world.js, which waits too, decides first)
    if (window.FFEntry && typeof window.FFEntry.wait === 'function') window.FFEntry.wait(() => sc.frame(decide)); else sc.frame(decide);
    return vis;
  }

  window.FFhooks = window.FFhooks || [];
  window.FFhooks.push(setup);
  // skip(): fast-forward the entrance (hero-world.js calls it on the visitor's first input during the opening or the entrance).
  window.FFHeroMotion = { setup, words, WORDS, REACT, POP, ARRIVE, WAVE, END, skip() { if (live && live.skip) live.skip(); }, reset() { played = false; if (live) { live.abort(); live = null; } } };
})();
