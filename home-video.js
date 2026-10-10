/* Story-world animation on Home (wave 8, owner-approved clips; markup and file list in home-calm.js VIDEOS, receipts in
   video/manifest.json). Two places: the four friends' talking intro (wave 9; since 2026-10-07 the big "Meet the Futures Friends" section right under the hero)
   and the picked friend's own loop in "Pick a friend".
   - Lazy: a frame shows its poster (a lazy image); its video element gets sources (AV1 with its codecs string, then H.264) and turns
     its captions on only when it comes near the screen and may play. Nothing is requested for a frame the visitor never scrolls near.
   - Plays while at least a quarter of it is on screen; pauses off screen and on a hidden tab. The friends' loops are muted and loop.
   - The talking intro (VIDEOS.intro, once: true) plays ONCE, never loops: muted with its captions showing, unless the visitor has
     sound on (FFSound.enabled()) and has already woken it with a tap or key (FFSound.unlocked()), then with its voice; a press of the
     felt button counts as that tap. Turning sound off mutes it. At the end the button becomes a replay button; it never restarts
     by itself. While it plays silently with sound on, a "Tap for sound" button shows; the first tap on the page restarts it from 0
     with its voice (owner 2026-10-07).
   - Reduced motion or the motion switch off: the poster only, no autoplay. The visible felt button still plays it on request.
   - The button (WCAG 2.2.2 pause, stop, hide) pauses or plays; once paused by the visitor a clip stays paused for the visit.
   - Phones (max-width 600 px) get the 4:5 intro; wider screens the 16:9 one; the source swaps if the width crosses.
   - If a clip cannot play, the friend's cut-out art comes back in its place.
   - Sound kill switch (window.FF_SOUND_OFF, sound-switch.js, owner 2026-10-10): the intro always plays muted with its captions, no
     "Tap for sound" button, and no tap gives it a voice.
   Sends nothing, stores nothing. */
(function () {
  'use strict';
  let live = null;
  const paused = new Set();          // keys the visitor paused (for this visit only)
  const M = () => window.FFMotion;
  const mm = q => (typeof matchMedia === 'function' && matchMedia(q).matches);

  function wire(frame, sc, motion) {
    if (!frame || frame.dataset.wired) return;
    frame.dataset.wired = '1';
    const key = frame.dataset.video, V = window.FFHomeCalm && window.FFHomeCalm.VIDEOS[key];
    const video = frame.querySelector('video'), btn = frame.querySelector('.hc-vbtn');
    if (!V || !video || !btn) return;
    const once = !!V.once, pauseKey = once ? key : 'friends';
    let seen = false, near = false, src = '', done = false;
    const variant = () => (V.wide && !mm('(max-width: 600px)') ? V.wide : V.tall);
    const load = () => {
      const v = variant();
      if (src === v.mp4) return;
      src = v.mp4;
      video.querySelectorAll('source').forEach(x => x.remove());
      video.insertAdjacentHTML('afterbegin', `<source src="${v.av1}" type='video/webm; codecs="${v.codecs}"'><source src="${v.mp4}" type="video/mp4">`);
      video.load();
      const lang = (window.FFi18n && window.FFi18n.lang) || 'en';   // the site language's track (i18n.js), else the first one
      const t = video.querySelector(`track[srclang="${lang}"]`) || video.querySelector('track');   // its captions (the talking intro) come on with the sources, not before
      if (t && t.track) t.track.mode = 'showing';
    };
    const label = () => {
      const on = !video.paused && !video.ended, end = done && !on;
      btn.setAttribute('aria-label', on ? 'Pause the animation' : end ? 'Replay the animation' : 'Play the animation');
      btn.dataset.state = on ? 'playing' : end ? 'ended' : 'paused'; frame.classList.toggle('is-playing', on);
      chip();
    };
    // owner 2026-10-07: the welcome video must be heard from its first word. Phones allow no sound before a tap, so while it plays
    // silently (sound on, nothing tapped yet) a "Tap for sound" button shows over it, and the first tap (on that button, on the video
    // or anywhere on the page, except the sound pill and the felt pause button, which keep their own jobs) restarts it from the
    // beginning with its voice. A click, not pointerdown: a finger that starts a scroll is not a tap and wakes no sound on a phone.
    let snd = null;
    const chip = () => { if (snd) { const show = !window.FF_SOUND_OFF && !video.paused && !video.ended && video.muted && !!window.FFSound && window.FFSound.enabled(); if (snd.hidden === show) snd.hidden = !show; } };
    const withVoice = () => {
      if (window.FF_SOUND_OFF || !once || video.paused || video.ended || !video.muted || !window.FFSound || !window.FFSound.enabled()) return false;
      try { video.currentTime = 0; } catch (e) { /* not loaded yet */ }
      video.muted = false;
      const p = video.play();
      if (p && p.catch) p.catch(() => { video.muted = true; const q = video.play(); if (q && q.catch) q.catch(() => label()); label(); });   // voice refused: on, muted, captioned
      label(); return true;
    };
    // the intro's voice: only with sound on and sound already woken by the visitor (or this very press of the button)
    const voiced = gesture => { const S = window.FFSound; return !!(!window.FF_SOUND_OFF && S && S.enabled() && (gesture || (typeof S.unlocked === 'function' && S.unlocked()))); };
    const play = gesture => {
      load();
      if (once) video.muted = !voiced(gesture);
      const p = video.play();
      if (p && p.catch) p.catch(() => {   // a browser that refuses the voice still plays it muted, with captions
        if (once && !video.muted) { video.muted = true; const q = video.play(); if (q && q.catch) q.catch(() => label()); } else label();
      });
    };
    let asked = false;   // the visitor pressed play: with reduced motion it still plays while on screen (it never autoplays by itself)
    const want = () => (motion || asked) && seen && !done && document.visibilityState !== 'hidden' && !paused.has(pauseKey);
    // a silent intro that scrolls away before anyone listened also stops downloading (a phone's data): its sources go, and it starts
    // again from the beginning when it comes back (with its voice, at the first tap). A voiced or visitor-paused clip keeps its place.
    const unload = () => { video.querySelectorAll('source').forEach(x => x.remove()); video.removeAttribute('src'); try { video.load(); } catch (e) { /* gone */ } src = ''; };
    const update = () => { if (want()) { if (video.paused) play(); } else if (!video.paused) { video.pause(); if (once && video.muted && !done && !seen) unload(); } };
    sc.listen(video, 'playing', label); sc.listen(video, 'pause', label);
    if (once) {
      sc.listen(video, 'ended', () => { done = true; label(); });
      sc.listen(video, 'timeupdate', () => { if (!video.muted && window.FFSound && !window.FFSound.enabled()) video.muted = true; chip(); });   // also follows the sound pill
    }
    sc.listen(video, 'error', () => fail(), true);
    const fail = () => { if (video.networkState !== 3 && !video.error) return; frame.classList.add('is-novideo'); const art = frame.closest('.hc-pickart'); if (art) art.classList.remove('has-video'); };
    if (once) {
      frame.insertAdjacentHTML('beforeend', '<button type="button" class="hc-vsound" hidden><svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>Tap for sound</button>');
      snd = frame.querySelector('.hc-vsound');
      sc.listen(document, 'click', e => { const t = e.target; if (!(t && t.closest && (t.closest('.ffs') || t === btn || btn.contains(t)))) withVoice(); }, { capture: true });
      sc.listen(video, 'volumechange', label);
    }
    sc.listen(btn, 'click', () => {
      if (!video.paused && !video.ended) { paused.add(pauseKey); video.pause(); }
      else {
        paused.delete(pauseKey); asked = true;
        if (done || video.ended) { done = false; try { video.currentTime = 0; } catch (e) { /* not loaded yet */ } }
        play(true);
      }
      label();
    });
    sc.listen(document, 'visibilitychange', update);
    const io = sc.observe(es => es.forEach(e => { seen = e.intersectionRatio >= 0.25; update(); }), { threshold: [0, 0.25, 0.5] });
    if (io) io.observe(frame); else { seen = true; update(); }
    if (V.wide && typeof matchMedia === 'function') { const q = matchMedia('(max-width: 600px)'); const f = () => { if (src) { const was = !video.paused; src = ''; if (was || want()) play(); } }; q.addEventListener('change', f); sc.add(() => q.removeEventListener('change', f)); }
    sc.add(() => { try { video.pause(); } catch (e) { /* gone */ } delete frame.dataset.wired; });
    label();
    return { video, btn };
  }

  function setup(view, root, ok) {
    if (live) { live.abort(); live = null; }
    if (view !== 'home' || !root || !M()) return;
    const sc = M().scope();
    live = sc;
    const motion = M().allowed(ok);
    root.querySelectorAll('.hc-vframe').forEach(f => wire(f, sc, motion));
    // "Pick a friend" re-draws its panel when another friend is picked: wire the new friend's loop
    const panel = root.querySelector('#hc-pickpanel');
    if (panel && typeof MutationObserver === 'function') {
      const mo = new MutationObserver(() => panel.querySelectorAll('.hc-vframe').forEach(f => wire(f, sc, motion)));
      mo.observe(panel, { childList: true });
      sc.add(() => mo.disconnect());
    }
  }

  window.FFhooks = window.FFhooks || [];
  window.FFhooks.push(setup);
  window.FFHomeVideo = { setup, wire, paused };
})();
