/* Futures Friends: THE SOUND KILL SWITCH (owner 2026-10-10: "All sound everywhere" OFF on the public site).
   ONE value turns every sound on the site off or back on:

       var SOUND_OFF = true;    // true = silent site (no voices, music, nature/birdsong, effects, read-aloud)
                                // false = sound back exactly as it was (sound.js pill, Nature beds, voices, Music button ...)

   Nothing was deleted: every audio file, voice line, the music credit text and the sound engine stay in the repo. This file is loaded
   first in <head> (before every other script) and sets window.FF_SOUND_OFF, which each sound path reads:
     sound.js (effects + Nature beds + the floating Sound/Nature pill), entry.js (gate copy and "Enter without sound"),
     friend-voices.js (the four hellos), hero-motion.js (the "Sound is off" hint), home-video.js (the talking intro),
     supporting-cast.js (voiced guide clips), kids-film.js (Music button + credit), family-library.js ("Read to me"),
     room-kit.js ("Turn sound on"), whole-child.js (copy). See README "Sound kill switch".
   While it is on, a safety net also holds every <video>/<audio> on the page muted (any play() starts muted, an unmute snaps back,
   the native mute/volume controls are hidden), turns a caption track on when a video with captions plays, and makes speech
   synthesis say nothing. window.FF_SOUND_FORCED counts the times the net had to catch something (0 when every path behaves).
   A test or audition page may set window.FF_SOUND_OFF (true/false) before this file runs; that value wins. */
(function () {
  'use strict';
  var SOUND_OFF = false;   // owner 2026-10-10 (later the same day): sound back ON; only the ambient Nature beds now start off (sound.js)
  if (typeof window === 'undefined') return;
  var W = window;
  if (typeof W.FF_SOUND_OFF !== 'boolean') W.FF_SOUND_OFF = SOUND_OFF;
  if (!W.FF_SOUND_OFF) return;
  var D = W.document;
  W.FF_SOUND_FORCED = 0;
  try { D.documentElement.setAttribute('data-sound', 'off'); } catch (_) { /* no document yet */ }
  var forced = function (what) { W.FF_SOUND_FORCED++; try { console.warn('FF_SOUND_OFF: muted ' + what); } catch (_) { /* no console */ } };
  var M = W.HTMLMediaElement && W.HTMLMediaElement.prototype;
  if (M && typeof M.play === 'function') {
    var play = M.play;
    M.play = function () {
      if (!this.muted) { forced(this.currentSrc || this.src || this.tagName); this.muted = true; }
      this.defaultMuted = true;
      return play.apply(this, arguments);
    };
  }
  if (D && D.addEventListener) {
    // a native control (or any script) that unmutes: snap back. Media events do not bubble, capture sees them.
    D.addEventListener('volumechange', function (e) { var m = e.target; if (m && M && M.isPrototypeOf(m) && !m.muted) { forced('unmute'); m.muted = true; } }, true);
    // a video with captions plays with them showing (the site's language first), since nothing can be heard
    D.addEventListener('play', function (e) {
      var v = e.target, tt = v && v.textTracks; if (!tt || !tt.length) return;
      for (var i = 0; i < tt.length; i++) if (tt[i].mode !== 'disabled') return;   // already showing, or a script drives it (hidden)
      var lang = (W.FFi18n && W.FFi18n.lang) || D.documentElement.lang || 'en', pick = null;
      for (var j = 0; j < tt.length; j++) { var t = tt[j]; if (t.kind !== 'captions' && t.kind !== 'subtitles') continue; if (!pick) pick = t; if (String(t.language).indexOf(lang) === 0) { pick = t; break; } }
      if (pick) pick.mode = 'showing';
    }, true);
    // every video/audio element the page draws (static markup or a view's template) starts muted, before anyone can press play
    var hush = function (root) {
      if (!root || root.nodeType !== 1) return;
      var list = /^(VIDEO|AUDIO)$/.test(root.tagName) ? [root] : root.querySelectorAll ? root.querySelectorAll('video,audio') : [];
      for (var i = 0; i < list.length; i++) { list[i].muted = true; list[i].defaultMuted = true; }
    };
    if (typeof W.MutationObserver === 'function') {
      new W.MutationObserver(function (rs) { for (var i = 0; i < rs.length; i++) { var a = rs[i].addedNodes; for (var j = 0; j < a.length; j++) hush(a[j]); } })
        .observe(D.documentElement, { childList: true, subtree: true });
    }
    D.addEventListener('DOMContentLoaded', function () { hush(D.documentElement); });
    var css = 'video::-webkit-media-controls-mute-button,video::-webkit-media-controls-volume-slider,video::-webkit-media-controls-volume-control-container,'
      + 'audio::-webkit-media-controls-mute-button,audio::-webkit-media-controls-volume-slider{display:none!important}.ffs{display:none!important}';
    try { var s = D.createElement('style'); s.setAttribute('data-sound-off', ''); s.textContent = css; (D.head || D.documentElement).appendChild(s); } catch (_) { /* fine */ }
  }
  try { if (W.speechSynthesis) { W.speechSynthesis.speak = function () { forced('speech'); }; } } catch (_) { /* read-only in some browsers */ }
})();
