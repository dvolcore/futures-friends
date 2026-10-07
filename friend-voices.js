/* Futures Friends wave 9 VOICES (owner 2026-10-07: "when I click on any of these characters they should definitely speak, and it
   should take them into his video section").
   Each of the four friends says their own hello, in their own voice, when tapped on the Home hero. The lines are cut from the
   talking welcome video (video/ff-intro-titled-16x9.mp4, where each friend introduces themself; transcript in ff-intro-titled.en.vtt):
     Booker  "Hi! I'm Booker. I love to learn, even when it's tricky!"
     Lumi    "I'm Lumi! I help everyone feel like they belong."
     Zuri    "I'm Zuri! Let's explore and find out together!"
     Bop     "I'm Bop! Move your body, grow your mind!"   (cut from "I'm Bop!", so it does not start with "And")
   Files: audio/friends/<name>-hello.webm (Opus) and .m4a (AAC), mono 48 kHz, about -16 LUFS, peaks under -1 dBTP, 20 ms fades.
   hero-motion.js shows the words in the felt dialogue card (the card text is the transcript) and calls play() / stop().
   - Nothing autoplays: an Audio element is made on the friend's first tap (preload none) and plays only from that tap.
   - One voice at a time: a new hello, the card closing or the page changing stops the one before.
   - The site's sound switch (sound.js, FFSound.enabled()) is respected: with sound off nothing plays and play() says 'off'.
   - The card's "Watch ..." link is a real link to the friend's page; its data-reveal (deep-links.js) lands on the friend's video
     section there and focuses it: GO[k] = [route, label, reveal selector].
   Public: window.FFVoices = { LINES, GO, src(k, ext), play(k, onend) -> 'playing' | 'off' | 'none', stop(), speaking() -> k | null }. Sends nothing, stores nothing. */
(function () {
  'use strict';
  if (typeof document === 'undefined') return;
  const W = window, D = document;
  const LINES = {
    booker: "Hi! I'm Booker. I love to learn, even when it's tricky!",
    lumi: "I'm Lumi! I help everyone feel like they belong.",
    zuri: "I'm Zuri! Let's explore and find out together!",
    bop: "I'm Bop! Move your body, grow your mind!"
  };
  // The card's link to each friend's own videos, play-along videos: [route, label, scroll target on that page]
  const GO = {
    // Booker, Lumi and Zuri: their own play-along videos (W11) and their storybook, the section on #activities/<friend>
    booker: ['activities/booker', 'Booker\u2019s videos and book', '#fl-friendvids'],
    lumi: ['activities/lumi', 'Lumi\u2019s videos and book', '#fl-friendvids'],
    zuri: ['activities/zuri', 'Zuri\u2019s videos and book', '#fl-friendvids'],
    bop: ['bop-at-home', 'Watch Bop\u2019s movement videos', '.wc-bopvid']
  };
  const V = 1;   // bump when a file under audio/friends/ changes
  const src = (k, ext) => `audio/friends/${k}-hello.${ext}?v=${V}`;
  const cache = {};
  let cur = null, curK = null, done = null;

  const soundOn = () => { const S = W.FFSound; try { return !(S && typeof S.enabled === 'function' && S.enabled() === false); } catch (_) { return true; } };
  const ext = a => { try { if (a.canPlayType && a.canPlayType('audio/webm; codecs="opus"')) return 'webm'; } catch (_) { /* fall through */ } return 'm4a'; };

  function stop() {
    const a = cur, f = done;
    cur = null; curK = null; done = null;
    if (a) { try { a.pause(); a.currentTime = 0; } catch (_) { /* not loaded yet */ } }
    if (f) { try { f(); } catch (_) { /* the card is gone */ } }
    ping();
  }
  // sound.js ducks the nature beds while a friend speaks: a plain re-check event (a detached Audio's own events reach no listener)
  const ping = () => { try { D.dispatchEvent(new CustomEvent('ff:duck')); } catch (_) { /* fire-and-forget */ } };

  function make(k) {
    const a = new Audio();
    a.preload = 'none';
    a.src = src(k, ext(a));
    const end = () => { if (cur === a) stop(); };
    a.addEventListener('ended', end);
    a.addEventListener('error', end);
    return a;
  }

  function play(k, onend) {
    stop();
    if (!LINES[k]) return 'none';
    if (!soundOn()) return 'off';
    const a = cache[k] || (cache[k] = make(k));
    cur = a; curK = k; done = typeof onend === 'function' ? onend : null;
    try { a.currentTime = 0; } catch (_) { /* not loaded yet */ }
    let p = null;
    try { p = a.play(); } catch (_) { stop(); return 'none'; }
    if (p && typeof p.catch === 'function') p.catch(() => { if (cur === a) stop(); });
    a.addEventListener('playing', ping, { once: true });
    return 'playing';
  }

  D.addEventListener('visibilitychange', () => { if (D.hidden) stop(); });

  W.FFVoices = Object.freeze({ LINES, GO, src, play, stop, speaking: () => curK });
})();
