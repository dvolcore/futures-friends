/* Futures Friends wave 8 SOUND: soft felt sound effects and quiet nature beds, all made in code with Web Audio (oscillators, filtered
   noise, envelopes and a small reverb from a generated impulse). No audio files: nothing to license or download.
   - ON by default (owner 2026-10-06: "it needs to start with the sound on, they can turn it off"), but browsers allow no sound
     before the visitor's first tap or key, so the first touch anywhere on the page unlocks it; until then a felt "Tap for sound" tag
     points at the pill on Home. Nothing autoplays before that touch. A felt pill bottom-right, just above the back-to-top button's slot (bottom-left collides with
     the hero cast's name tags at 1280 and with the wayfinding context card from 1440 px), holds two real toggle buttons: "Sound" (effects) and, once sound is on, "Nature" (the
     quiet day-part beds). Both choices are remembered (localStorage, in try/catch).
   - Owner 2026-10-07 ("the natural noises need to be automatically on as well ... for demonstration purposes I need ALL the effects
     on"): Nature is ON by default together with Sound, and both keys were bumped (-v2) so an old stored "off" no longer blocks the
     demo; a visitor who turns either off now is remembered under the new key. Owner 2026-10-10 (later): the ambient Nature beds start
     OFF (key -v3; on only once the visitor turns them on); Sound itself stays on by default. The entry gate (entry.js) is the first tap that wakes
     both; "Enter without sound" turns sound off for that session only (set(false, {session: true}), not stored).
   - Ducking: the nature beds fade to almost nothing while anything else speaks: a video or audio element on the page playing with its sound,
     a friend's voice line (FFVoices) or the storybook's read-aloud (speechSynthesis); they fade back afterwards. Anyone can ask for a
     re-check with a plain 'ff:duck' document event. ducked() tells whether the beds are ducked right now.
   - No AudioContext exists until the visitor turns sound on with a tap or key (or, on a return visit with sound on, until their first
     tap or key on the page). The tab going hidden suspends it; it resumes when the tab is visible again and sound is on.
   - Listens (fire-and-forget, see docs/reviews/WAVE8_CONTRACT.md): ff:sfx {name, x?, gain?, i?} and ff:daypart {part}; plus the
     site's own events: clicks on .btn / [data-go] / links -> tap, ff:audience -> chime, hashchange -> page-turn. Unknown names are ignored.
   - Master limiter so overlapping sounds never clip; per-sound minimum gaps (footsteps at most ~4 a second); letter-pops queue on a
     beat and climb a pentatonic tune (FUTURES then FRIENDS), so the title landing plays a little rising melody.
   Public: window.FFSound = {play(name, opts) -> true if it sounded, enabled(), nature(), ducked(), set(on, {session}), unlocked() -> true once the visitor's tap or key has
   woken the AudioContext (wave 9: the talking intro on Home plays with its voice only then), set(on), names, render(name,
   offlineCtx, opts)} (frozen; render is the audition helper that draws any sound or bed into an OfflineAudioContext).
   KILL SWITCH (owner 2026-10-10): with window.FF_SOUND_OFF (sound-switch.js) nothing here runs: no AudioContext, no pill, no listeners;
   FFSound.enabled() is false, play()/set() do nothing and FFSound.off is true. Flip SOUND_OFF in sound-switch.js to bring it all back. */
(function () {
  'use strict';
  if (typeof document === 'undefined') return;
  const W = window, D = document;
  const KEY = 'ff-sound-v2', NKEY = 'ff-sound-nature-v3', HKEY = 'ff-sound-hint';   // nature -v3: owner 2026-10-10, ambient beds start OFF
  const MASTER = 1.0, AMB = 0.5;   // owner 2026-10-06: too quiet on a phone speaker; the limiter keeps peaks under -3 dBFS
  const get = k => { try { return W.localStorage.getItem(k); } catch (_) { return null; } };
  const put = (k, v) => { try { W.localStorage.setItem(k, v); } catch (_) { /* blocked storage: the choice lasts this visit */ } };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  const seeded = s => () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  let R = seeded(405);

  // ---------------------------------------------------------------- graph: voices -> fx bus -> master -> limiter -> speakers (+ reverb send)
  function impulse(c, dur) {
    const n = Math.floor(c.sampleRate * dur), b = c.createBuffer(2, n, c.sampleRate), r = seeded(7);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch); let lp = 0;
      for (let i = 0; i < n; i++) { lp += ((r() * 2 - 1) - lp) * 0.35; d[i] = lp * Math.pow(1 - i / n, 3) * 0.9; }   // darkened, felt-soft tail
    }
    return b;
  }
  function graph(c) {
    const lim = c.createDynamicsCompressor();
    lim.threshold.value = -4; lim.knee.value = 3; lim.ratio.value = 20; lim.attack.value = 0.002; lim.release.value = 0.2;
    const m = c.createGain(); m.gain.value = MASTER; m.connect(lim); lim.connect(c.destination);
    const verb = c.createConvolver(); verb.buffer = impulse(c, 1.8); const vg = c.createGain(); vg.gain.value = 0.55; verb.connect(vg); vg.connect(m);
    const fx = c.createGain(); fx.connect(m);
    const duck = c.createGain(); duck.connect(m);   // the nature beds' ducking stage (ducking below)
    const amb = c.createGain(); amb.gain.value = 0; amb.connect(duck);
    const nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), nd = nb.getChannelData(0), r = seeded(11);
    for (let i = 0; i < nd.length; i++) nd[i] = r() * 2 - 1;
    return { c, m, fx, verb, amb, duck, noise: nb };
  }

  // ---------------------------------------------------------------- voice helpers
  function voice(G, o, t, end) {
    const c = G.c, v = c.createGain(); v.gain.value = 0;
    let n = v;
    if (c.createStereoPanner) {
      const p = c.createStereoPanner(); p.pan.setValueAtTime(clamp(o.pan || 0, -1, 1), t);
      if (o.pan2 != null) p.pan.linearRampToValueAtTime(clamp(o.pan2, -1, 1), end);
      v.connect(p); n = p;
    }
    n.connect(G.fx);
    if (o.wet) { const s = c.createGain(); s.gain.value = o.wet; n.connect(s); s.connect(G.verb); }
    const g = Math.max(0.0001, o.g), a = o.a || 0.004;
    v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(g, t + a); v.gain.exponentialRampToValueAtTime(0.0001, end);
    return v;
  }
  function tone(G, o) {
    const c = G.c, t = o.t, end = t + (o.a || 0.004) + o.d, osc = c.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + (o.glide || o.d));
    if (o.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = o.vib[0]; lg.gain.value = o.vib[1]; l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(end + 0.05); }
    let n = osc;
    if (o.lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; f.Q.value = 0.5; osc.connect(f); n = f; }
    n.connect(voice(G, o, t, end));
    osc.start(t); osc.stop(end + 0.05);
  }
  function hiss(G, o) {
    const c = G.c, t = o.t, a = o.a || 0.004, end = t + a + o.d, s = c.createBufferSource(), f = c.createBiquadFilter();
    s.buffer = G.noise; s.loop = true;
    f.type = o.type || 'lowpass'; f.Q.value = o.q || 0.7;
    f.frequency.setValueAtTime(o.f, t);
    if (o.fm) f.frequency.exponentialRampToValueAtTime(o.fm, t + a);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, end);
    s.connect(f); f.connect(voice(G, o, t, end));
    s.start(t, R() * 1.5); s.stop(end + 0.05);
  }
  const bell = (G, t, f, g, x, wet, d) => {
    tone(G, { t, f, d: d || 1.3, g, pan: x, wet });
    tone(G, { t, f: f * 2.76, d: 0.45, g: g * 0.12, pan: x, wet });
    tone(G, { t, f: f * 5.4, d: 0.2, g: g * 0.04, pan: x, wet });
  };
  const pluck = (G, t, f, g, x, wet) => {                                // music box: a bright tine that softens fast
    tone(G, { t, f, a: 0.003, d: 1.2, g, pan: x, wet });
    tone(G, { t, f: f * 2, a: 0.002, d: 0.35, g: g * 0.3, pan: x, wet });
    tone(G, { t, f: f * 3, a: 0.002, d: 0.12, g: g * 0.08, pan: x, wet });
  };
  const chirp = (G, t, x, g, lp) => {                                   // one songbird call: 2-5 quick sweeps
    const n = 2 + Math.floor(R() * 4), base = 2600 + R() * 1500, up = R() > 0.5;
    for (let i = 0; i < n; i++) {
      const f = base * (1 + (R() - 0.5) * 0.12);
      tone(G, { t: t + i * (0.09 + R() * 0.05), f, f2: f * (up ? 1.25 : 0.72), a: 0.006, d: 0.06 + R() * 0.05, g: g * (0.7 + R() * 0.3), pan: x, wet: 0.35, lp });
    }
  };

  // ---------------------------------------------------------------- the sounds: (G, t, x, g, i)
  // letter melody: C major pentatonic, FUTURES climbs G4..A5, FRIENDS climbs C5..D6; logo-land resolves on C
  const MEL = [67, 69, 72, 74, 76, 79, 81, 72, 74, 76, 79, 81, 84, 86];
  const SFX = Object.create(null);
  Object.assign(SFX, {
    whoosh: (G, t, x, g) => hiss(G, { t, type: 'bandpass', f: 300, fm: 1500, f2: 420, q: 1.1, a: 0.26, d: 0.5, g: 0.55 * g, pan: x - 0.7, pan2: x + 0.7, wet: 0.15 }),
    'cloud-puff': (G, t, x, g) => {
      hiss(G, { t, f: 1100, f2: 240, a: 0.03, d: 0.42, g: 0.5 * g, pan: x, wet: 0.2 });
      tone(G, { t, f: 200, f2: 110, a: 0.01, d: 0.22, g: 0.16 * g, pan: x });
    },
    'letter-pop': (G, t, x, g, i) => {
      const f = hz(MEL[((i % MEL.length) + MEL.length) % MEL.length]);
      tone(G, { t, f: f * 1.5, f2: f, glide: 0.04, a: 0.005, d: 0.3, g: 0.34 * g, pan: x, wet: 0.25, lp: 2800 });
      tone(G, { t, type: 'triangle', f: f * 2, a: 0.003, d: 0.08, g: 0.06 * g, pan: x, lp: 3200 });
      hiss(G, { t, f: 1200, a: 0.002, d: 0.05, g: 0.06 * g, pan: x });
    },
    'logo-land': (G, t, x, g) => {
      tone(G, { t, f: 120, f2: 50, a: 0.008, d: 0.45, g: 0.85 * g, pan: x });
      hiss(G, { t, f: 650, f2: 180, a: 0.006, d: 0.3, g: 0.3 * g, pan: x });
      tone(G, { t: t + 0.04, f: hz(72), a: 0.01, d: 1.1, g: 0.16 * g, pan: x, wet: 0.4, lp: 2400 });
      [84, 88, 91, 96].forEach((m, k) => tone(G, { t: t + 0.12 + k * 0.055, f: hz(m), a: 0.002, d: 0.6, g: 0.1 * g, pan: clamp(x + (k - 1.5) * 0.25, -1, 1), wet: 0.55 }));
    },
    hop: (G, t, x, g) => tone(G, { t, type: 'triangle', f: 230, f2: 540, glide: 0.14, a: 0.01, d: 0.22, g: 0.26 * g, pan: x, vib: [10, 14], lp: 1800, wet: 0.1 }),
    land: (G, t, x, g) => {
      tone(G, { t, f: 170, f2: 70, a: 0.005, d: 0.2, g: 0.5 * g, pan: x });
      hiss(G, { t, f: 520, f2: 150, a: 0.004, d: 0.12, g: 0.24 * g, pan: x });
    },
    chime: (G, t, x, g) => { bell(G, t, hz(79), 0.2 * g, x, 0.45); bell(G, t + 0.09, hz(86), 0.16 * g, x, 0.45); },
    sparkle: (G, t, x, g) => {
      [91, 96, 93, 100, 98].forEach((m, k) => tone(G, { t: t + k * 0.045, f: hz(m), a: 0.002, d: 0.35, g: 0.075 * g, pan: clamp(x + (R() - 0.5) * 0.8, -1, 1), wet: 0.55 }));
      hiss(G, { t, type: 'highpass', f: 6000, a: 0.05, d: 0.35, g: 0.025 * g, pan: x, wet: 0.3 });
    },
    wink: (G, t, x, g) => {
      tone(G, { t, f: 1100, f2: 1650, glide: 0.06, a: 0.003, d: 0.1, g: 0.2 * g, pan: x, lp: 3000 });
      tone(G, { t: t + 0.07, f: hz(96), a: 0.002, d: 0.25, g: 0.1 * g, pan: x, wet: 0.4 });
    },
    squish: (G, t, x, g) => {
      hiss(G, { t, f: 900, f2: 280, a: 0.04, d: 0.3, g: 0.28 * g, pan: x });
      tone(G, { t, f: 240, f2: 150, a: 0.03, d: 0.28, g: 0.22 * g, pan: x, vib: [16, 18], lp: 900 });
    },
    rain: (G, t, x, g) => {
      hiss(G, { t, type: 'bandpass', f: 1700, q: 0.6, a: 0.4, d: 1.5, g: 0.05 * g, pan: x, wet: 0.2 });
      for (let k = 0; k < 26; k++) {
        const f = 1300 + R() * 1400;
        tone(G, { t: t + R() * 1.8, f, f2: f * 0.7, glide: 0.02, a: 0.001, d: 0.05, g: (0.04 + R() * 0.04) * g, pan: clamp(x + (R() - 0.5) * 1.2, -1, 1), wet: 0.3 });
      }
    },
    tap: (G, t, x, g) => {
      tone(G, { t, f: 680, f2: 520, glide: 0.03, a: 0.002, d: 0.07, g: 0.2 * g, pan: x, lp: 2500 });
      hiss(G, { t, f: 1800, a: 0.001, d: 0.02, g: 0.05 * g, pan: x });
    },
    'page-turn': (G, t, x, g) => {
      hiss(G, { t, type: 'bandpass', f: 700, fm: 1900, f2: 1000, q: 0.9, a: 0.12, d: 0.28, g: 0.34 * g, pan: x - 0.3, pan2: x + 0.3, wet: 0.12 });
      hiss(G, { t: t + 0.18, type: 'bandpass', f: 2600, q: 1.2, a: 0.02, d: 0.09, g: 0.05 * g, pan: x + 0.3 });
    },
    'card-flip': (G, t, x, g) => {
      hiss(G, { t, type: 'bandpass', f: 1500, q: 1.5, a: 0.005, d: 0.06, g: 0.42 * g, pan: x - 0.15 });
      hiss(G, { t: t + 0.08, type: 'bandpass', f: 2000, q: 1.5, a: 0.005, d: 0.06, g: 0.34 * g, pan: x + 0.15 });
      tone(G, { t: t + 0.1, type: 'triangle', f: hz(79), a: 0.004, d: 0.22, g: 0.14 * g, pan: x, lp: 2600 });
    },
    badge: (G, t, x, g) => {
      tone(G, { t, type: 'triangle', f: hz(84), a: 0.005, d: 0.18, g: 0.2 * g, pan: x, lp: 3000 });
      tone(G, { t: t + 0.11, type: 'triangle', f: hz(91), a: 0.005, d: 0.5, g: 0.2 * g, pan: x, lp: 3000, wet: 0.3 });
      SFX.sparkle(G, t + 0.15, x, 0.6 * g);
    },
    footstep: (G, t, x, g) => {
      hiss(G, { t, f: 300 + R() * 120, f2: 120, a: 0.004, d: 0.08, g: 0.36 * g, pan: x });
      tone(G, { t, f: 95, f2: 60, a: 0.003, d: 0.07, g: 0.24 * g, pan: x });
    },
    wave: (G, t, x, g) => {                                              // a friend waves hello: a soft two-note "hi-ya" whistle and a little air
      tone(G, { t, f: hz(79), f2: hz(84), glide: 0.12, a: 0.04, d: 0.25, g: 0.15 * g, pan: x, vib: [6, 8], wet: 0.3 });
      tone(G, { t: t + 0.22, f: hz(84), f2: hz(88), glide: 0.1, a: 0.04, d: 0.35, g: 0.13 * g, pan: x, vib: [6, 8], wet: 0.35 });
      hiss(G, { t, type: 'bandpass', f: 1200, q: 0.6, a: 0.1, d: 0.3, g: 0.05 * g, pan: x - 0.3, pan2: x + 0.3 });
    },
    firefly: (G, t, x, g) => {
      tone(G, { t, f: hz(96), a: 0.06, d: 0.7, g: 0.065 * g, pan: x, wet: 0.6 });
      tone(G, { t, f: hz(96) * 1.004, a: 0.06, d: 0.7, g: 0.065 * g, pan: x, wet: 0.6 });
      tone(G, { t: t + 0.08, f: hz(103), a: 0.04, d: 0.4, g: 0.02 * g, pan: x, wet: 0.6 });
    },
    'night-chime': (G, t, x, g) => [88, 84, 79].forEach((m, k) => pluck(G, t + k * 0.28, hz(m), 0.13 * g, x, 0.5))
  });
  const NAMES = Object.freeze(Object.keys(SFX));
  const GAP = { footstep: 240, tap: 60, 'page-turn': 250, whoosh: 150, 'cloud-puff': 90, rain: 1600, chime: 200, badge: 250, 'logo-land': 800, 'night-chime': 900, 'card-flip': 120, wave: 300, firefly: 120, sparkle: 100 };

  // ---------------------------------------------------------------- nature beds by day part: bed(P, t) -> stop(t); ev(P, s, until)
  const breeze = (P, t, level, lp) => {
    const c = P.c, s = c.createBufferSource(), f = c.createBiquadFilter(), v = c.createGain(), l = c.createOscillator(), lg = c.createGain(), l2 = c.createOscillator(), lg2 = c.createGain();
    s.buffer = P.noise; s.loop = true; f.type = 'lowpass'; f.frequency.value = lp; f.Q.value = 0.4;
    l.frequency.value = 0.07; lg.gain.value = lp * 0.45; l.connect(lg); lg.connect(f.frequency);
    v.gain.value = level; l2.frequency.value = 0.045; lg2.gain.value = level * 0.6; l2.connect(lg2); lg2.connect(v.gain);
    s.connect(f); f.connect(v); v.connect(P.fx);
    s.start(t); l.start(t); l2.start(t);
    return at => { [s, l, l2].forEach(n => { try { n.stop(at); } catch (_) { /* already stopped */ } }); };
  };
  const PARTS = {
    morning: {
      bed: (P, t) => breeze(P, t, 0.012, 700),
      ev(P, s, until) { if (s.b == null) s.b = s.t0 + 0.4; while (s.b < until) { chirp(P, s.b, (R() - 0.5) * 1.6, 0.045); s.b += 1.1 + R() * 2.4; } }
    },
    afternoon: {
      bed: (P, t) => breeze(P, t, 0.05, 520),
      ev(P, s, until) { if (s.b == null) s.b = s.t0 + 1.2; while (s.b < until) { chirp(P, s.b, (R() - 0.5) * 1.8, 0.014, 2200); s.b += 3 + R() * 4; } }
    },
    sunset: {
      bed: (P, t) => breeze(P, t, 0.028, 380),
      ev(P, s, until) {
        if (s.b == null) s.b = s.t0 + 1.5;
        while (s.b < until) {                                           // a dove's soft coo-coo, low and far
          const x = (R() - 0.5) * 1.4;
          tone(P, { t: s.b, f: 520, f2: 470, a: 0.08, d: 0.32, g: 0.022, pan: x, lp: 900, wet: 0.4 });
          tone(P, { t: s.b + 0.5, f: 540, f2: 450, a: 0.1, d: 0.55, g: 0.02, pan: x, lp: 900, wet: 0.4 });
          if (R() > 0.6) chirp(P, s.b + 2 + R(), -x, 0.008, 1800);
          s.b += 5 + R() * 4;
        }
      }
    },
    night: {
      bed: (P, t) => breeze(P, t, 0.008, 300),
      ev(P, s, until) {
        if (s.c == null) { s.c = s.t0 + 0.2; s.m = s.t0 + 1; s.n = 2; }
        while (s.c < until) {                                           // two crickets, left and right, trading chirps
          const left = R() > 0.5, f = left ? 4300 : 4700;
          for (let k = 0; k < 3 + (R() > 0.5 ? 1 : 0); k++) tone(P, { t: s.c + k * 0.035, f, a: 0.004, d: 0.018, g: 0.011, pan: left ? -0.6 : 0.6 });
          s.c += 0.45 + R() * 0.5;
        }
        while (s.m < until) {                                           // a slow music-box lullaby wandering the pentatonic
          s.n = clamp(s.n + (R() > 0.5 ? 1 : -1) * (R() > 0.7 ? 2 : 1), 0, 7);
          pluck(P, s.m, hz([67, 69, 72, 74, 76, 79, 81, 84][s.n]), 0.035, (R() - 0.5) * 0.6, 0.7);
          s.m += 1.6 + R() * 0.8;
        }
      }
    }
  };

  // ---------------------------------------------------------------- live engine
  // the site's sound kill switch (sound-switch.js, owner 2026-10-10 "all sound everywhere" off): no context, no pill, no listeners,
  // play() and set() do nothing. FFSound stays defined (enabled() false) so every caller reads "off". render() still works (audition).
  const OFF = !!W.FF_SOUND_OFF;
  let on = !OFF && get(KEY) !== 'off', nature = !OFF && get(NKEY) === 'on', part = 'morning';
  let ac = null, G = null;
  const visible = () => D.visibilityState !== 'hidden';
  const live = () => !!(on && ac && ac.state === 'running' && visible());
  const last = Object.create(null);
  let busy = [], popAt = 0, popSeen = -1e9, popI = 0;

  // iPhone: Web Audio follows the ring/silent switch unless the page asks for media playback. Safari 16.4+ has
  // navigator.audioSession; older iOS needs a silent audio element started inside the tap to move the page into playback.
  let session = false, greeted = false;
  function playbackSession() {
    if (session) return; session = true;
    try { if (W.navigator.audioSession) { W.navigator.audioSession.type = 'playback'; return; } } catch (_) { /* not settable */ }
    try {
      const n = 800, b = new ArrayBuffer(44 + n * 2), v = new DataView(b), w = (o, t) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
      w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
      v.setUint32(24, 8000, true); v.setUint32(28, 16000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
      const a = new Audio(URL.createObjectURL(new Blob([b], { type: 'audio/wav' })));
      a.loop = true; a.setAttribute('playsinline', ''); a.volume = 0.01; const pr = a.play(); if (pr && pr.catch) pr.catch(() => { session = false; });
    } catch (_) { session = false; }
  }
  function makeContext() {
    if (ac) return true;
    const AC = W.AudioContext || W.webkitAudioContext;
    if (!AC) return false;
    try { ac = new AC({ latencyHint: 'interactive' }); } catch (_) { return false; }
    G = graph(ac);
    ducked = false; duck();
    ac.onstatechange = () => ambient();
    return true;
  }
  // On arrival with sound on: try to start at once. Browsers that allow it (e.g. desktop Chrome for a returning visitor) play the
  // opening with sound; the rest keep the context asleep until the first tap anywhere, which wakes it (unlock) and plays a hello.
  function tryAutoplay() {
    if (!on || !visible() || !makeContext()) return;
    if (ac.state === 'running') { greeted = true; ambient(); }
  }
  function unlock(e) {
    if (!on || !visible()) return;
    if (e && e.target && e.target.closest && e.target.closest('[data-ffs-ignore]')) return;   // "Enter without sound" wakes nothing
    playbackSession();
    if (!makeContext()) return;
    const greet = () => {   // a little hello the first time sound wakes up, so the visitor knows it works (not when the tap was on the pill)
      if (greeted || ac.state !== 'running') return; greeted = true;
      if (e && e.target && e.target.closest && e.target.closest('.ffs')) return;
      // through the entry gate onto Home with motion: the title's own letters play the tune as they land (hero-world.js), so no second one
      if (e && e.target && e.target.closest && e.target.closest('.ffe') && D.documentElement.dataset.ffeTune === 'opening') return;
      const t0 = ac.currentTime + 0.03;
      try {   // on Home the hello is the title tune (FUTURES, FRIENDS rising, then the logo landing); elsewhere just the landing
        if (/^(#home(\/|$)|#?$)/.test(location.hash)) {
          for (let k = 0; k < 14; k++) SFX['letter-pop'](G, t0 + k * 0.09, (k % 7 - 3) / 4, 0.9, k);
          SFX['logo-land'](G, t0 + 14 * 0.09 + 0.08, 0, 1, 0);
        } else SFX['logo-land'](G, t0, 0, 1, 0);
      } catch (_) { /* no greeting */ }
    };
    if (ac.state === 'suspended') ac.resume().then(greet).catch(() => {}); else greet();
    ambient();
  }

  function play(name, o) {
    if (typeof name !== 'string' || !SFX[name] || !live()) return false;
    o = o || {};
    const now = ac.currentTime, ms = now * 1000;
    if (ms - (last[name] == null ? -1e9 : last[name]) < (GAP[name] || 45)) return false;
    busy = busy.filter(e => e > now);
    if (busy.length >= 14) return false;                                // never a pile-up: drop rather than crowd
    let t = now + 0.01, i = 0;
    if (name === 'letter-pop') {                                         // queue on a beat; climb the tune; a pause starts it again
      if (now - popSeen > 0.9) popI = 0;
      popSeen = now; i = Number.isInteger(o.i) ? o.i : popI++;
      t = Math.max(t, popAt);
      if (t - now > 1.6) return false;
      popAt = t + 0.11;
    } else last[name] = ms;
    try { SFX[name](G, t, clamp(num(o.x, 0), -1, 1), clamp(num(o.gain, 1), 0, 1), i); } catch (_) { return false; }
    busy.push(t + 0.6);
    return true;
  }

  // nature: one bus per day part under G.amb, crossfaded; events scheduled about a second ahead
  const buses = Object.create(null);
  let tick = 0;
  function ambient() {
    const want = live() && nature;
    if (!G) return;
    const now = ac.currentTime;
    G.amb.gain.setTargetAtTime(want ? AMB : 0, now, want ? 0.6 : 0.25);
    for (const k in buses) {
      const b = buses[k], cur = want && k === part;
      b.g.gain.setTargetAtTime(cur ? 1 : 0, now, 0.8);
      if (!cur && !b.stopAt) { b.stopAt = now + 4; }
      if (cur) b.stopAt = 0;
    }
    if (want && !buses[part]) {
      const g = ac.createGain(); g.gain.value = 0; g.connect(G.amb); g.gain.setTargetAtTime(1, now, 0.8);
      const P = Object.assign({}, G, { fx: g });
      buses[part] = { g, P, s: { t0: now }, stop: PARTS[part].bed(P, now), stopAt: 0 };
    }
    clearTimeout(tick);
    if (want || Object.keys(buses).length) tick = setTimeout(schedule, 300);
  }
  // ducking: is anything else speaking right now?
  let ducked = false;
  function loud() {
    try {
      for (const m of D.querySelectorAll('video, audio')) if (!m.paused && !m.ended && !m.muted && m.volume > 0 && m.readyState > 1) return true;
      if (W.FFVoices && typeof W.FFVoices.speaking === 'function' && W.FFVoices.speaking()) return true;
      if (W.speechSynthesis && W.speechSynthesis.speaking) return true;
    } catch (_) { /* nothing to check */ }
    return false;
  }
  function duck() {
    const d = loud();
    if (d === ducked) return;
    ducked = d;
    if (G) G.duck.gain.setTargetAtTime(d ? 0.0001 : 1, ac.currentTime, d ? 0.08 : 0.7);
  }
  function schedule() {
    duck();
    if (!G || !visible()) return;                                      // hidden: no timer at all; visibilitychange starts it again
    const now = ac.currentTime, running = live();
    for (const k in buses) {
      const b = buses[k];
      if (b.stopAt && now >= b.stopAt) { b.stop(now); b.g.disconnect(); delete buses[k]; continue; }
      if (running && nature && k === part) {
        for (const q of ['b', 'c', 'm']) if (b.s[q] != null && b.s[q] < now) b.s[q] = now + 0.05 + R() * 0.5;   // a bed brought back never plays a backlog
        PARTS[k].ev(b.P, b.s, now + 1.2);
      }
    }
    if ((running && nature) || Object.keys(buses).length) tick = setTimeout(schedule, 500);
  }

  // ---------------------------------------------------------------- the felt pill
  const ICON = {
    sound: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path class="ffs-spk" d="M4 9.5h3.2L12 5.6v12.8l-4.8-3.9H4z"/><path class="ffs-w1" d="M15.2 9.2a4 4 0 0 1 0 5.6"/><path class="ffs-w2" d="M17.8 6.8a7.4 7.4 0 0 1 0 10.4"/><path class="ffs-x" d="M15.5 9.8l4.4 4.4m0-4.4l-4.4 4.4"/></svg>',
    nature: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z"/><path d="M5 19c3-4 6-7 10-9"/></svg>'
  };
  let box, mainBtn, natBtn, hint;
  function paint() {
    if (!box) return;
    box.dataset.on = on ? 'true' : 'false';
    mainBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    mainBtn.querySelector('.ffs-st').textContent = on ? 'on' : 'off';
    natBtn.hidden = !on;
    natBtn.setAttribute('aria-pressed', nature ? 'true' : 'false');
    natBtn.querySelector('.ffs-st').textContent = nature ? 'on' : 'off';
  }
  function set(v, o) {
    if (OFF) return false;
    on = !!v; if (!(o && o.session)) put(KEY, on ? 'on' : 'off');
    if (on && W.navigator && W.navigator.userActivation && W.navigator.userActivation.isActive) unlock();
    if (!on && ac) { ambient(); setTimeout(() => { if (!on && ac) ac.suspend().catch(() => {}); }, 700); }   // off: fade, then the graph sleeps
    paint(); dropHint();
    return on;
  }
  function build() {
    if (box || !D.body) return;
    box = D.createElement('div');
    box.className = 'ffs'; box.setAttribute('role', 'region'); box.setAttribute('aria-label', 'Sound settings');   // a named landmark: nothing on the page sits outside one
    box.innerHTML = '<span class="ffs-hint" aria-hidden="true" hidden>Tap for sound</span>'
      + `<button type="button" class="ffs-btn ffs-nat" aria-pressed="false" hidden>${ICON.nature}<span class="ffs-l">Nature<span class="ffs-sr"> sounds</span></span><span class="ffs-st" aria-hidden="true">off</span></button>`
      + `<button type="button" class="ffs-btn ffs-main" aria-pressed="false">${ICON.sound}<span class="ffs-l">Sound</span><span class="ffs-st" aria-hidden="true">off</span></button>`;
    mainBtn = box.querySelector('.ffs-main'); natBtn = box.querySelector('.ffs-nat'); hint = box.querySelector('.ffs-hint');
    mainBtn.addEventListener('click', () => {
      set(!on);
      if (on) { unlock({ target: mainBtn }); if (ac) ac.resume().then(() => play('badge', { x: 0.6, gain: 0.8 })).catch(() => {}); }
    });
    natBtn.addEventListener('click', () => {
      nature = !nature; put(NKEY, nature ? 'on' : 'off'); paint(); unlock(); ambient();
      if (nature) play('chime', { x: 0.6, gain: 0.6 });
    });
    D.body.appendChild(box);
    paint();
    // one gentle hint, Home only, first visit only, gone at the first touch, key or wheel (sound on but still locked by the browser,
    // or sound off)
    if (get(HKEY) !== 'seen' && /^(#home(\/|$)|#?$)/.test(location.hash)) {
      hintT = setTimeout(showHint, 3200);
    }
  }
  let hintT = 0;
  // beside the pill, else above it; never over words, links, buttons or pictures that mean something (else no hint at all)
  const MEANT = '#view a, #view button, #view input, #view label, #view h1, #view h2, #view h3, #view p, #view li, #view img:not([alt=""]), footer a, footer p';
  function showHint() {
    if (box.dataset.used || (on && ac && ac.state === 'running')) return;
    for (const at of ['beside', 'above']) {
      hint.dataset.at = at; hint.hidden = false;
      const r = hint.getBoundingClientRect();
      const hit = r.left < 0 || [...D.querySelectorAll(MEANT)].some(el => { const b = el.getBoundingClientRect(); return b.width && b.height && b.left < r.right && b.right > r.left && b.top < r.bottom && b.bottom > r.top; });
      if (!hit) { hintT = setTimeout(dropHint, 9000); return; }
    }
    hint.hidden = true;
  }
  function dropHint() {
    clearTimeout(hintT);
    if (!box || box.dataset.used) return;
    box.dataset.used = '1';
    if (!hint.hidden) put(HKEY, 'seen');
    hint.hidden = true;
  }

  // ---------------------------------------------------------------- listeners
  const graphs = new WeakMap();   // render()'s per-context graphs (defined here: the switch below returns early)
  if (OFF) {
    W.FFSound = Object.freeze({ play: () => false, enabled: () => false, nature: () => false, ducked: () => false, unlocked: () => false, set, names: NAMES, render, off: true });
    return;
  }
  const opt = { capture: true, passive: true };
  ['pointerdown', 'keydown', 'touchend', 'click'].forEach(e => D.addEventListener(e, unlock, opt));
  ['pointerdown', 'keydown', 'wheel'].forEach(e => D.addEventListener(e, dropHint, opt));
  D.addEventListener('visibilitychange', () => {
    if (!ac) return;
    if (!visible()) ac.suspend().catch(() => {});
    else if (on) ac.resume().catch(() => {});
    ambient();
  });
  ['play', 'playing', 'pause', 'ended', 'volumechange', 'emptied'].forEach(t => D.addEventListener(t, () => setTimeout(duck, 0), true));   // media events do not bubble: caught on the way down
  D.addEventListener('ff:duck', () => setTimeout(duck, 0));
  D.addEventListener('ff:sfx', e => { const d = e && e.detail; if (d && typeof d === 'object') play(d.name, d); });
  D.addEventListener('ff:daypart', e => {
    const p = e && e.detail && e.detail.part;
    if (typeof p === 'string' && PARTS[p] && p !== part) { part = p; ambient(); }
  });
  D.addEventListener('ff:audience', () => play('chime', { gain: 0.7 }));
  W.addEventListener('hashchange', () => play('page-turn', { gain: 0.7 }));
  D.addEventListener('click', e => {
    const t = e.target && e.target.closest && e.target.closest('.btn, [data-go], a[href]');
    if (t && !t.closest('.ffs')) play('tap', { gain: 0.8 });
  });

  // ---------------------------------------------------------------- audition helper: draw a sound or a bed into an OfflineAudioContext
  function render(name, c, o) {
    o = o || {};
    let g = graphs.get(c); if (!g) { g = graph(c); graphs.set(c, g); }
    R = seeded(o.seed || 405);
    const t = num(o.t, 0.05);
    if (SFX[name]) { SFX[name](g, t, clamp(num(o.x, 0), -1, 1), clamp(num(o.gain, 1), 0, 1), o.i | 0); return true; }
    const p = /^nature:(\w+)$/.exec(name || '');
    if (p && PARTS[p[1]]) {
      g.amb.gain.value = AMB;
      const bus = c.createGain(); bus.connect(g.amb);
      const P = Object.assign({}, g, { fx: bus });
      PARTS[p[1]].bed(P, 0); PARTS[p[1]].ev(P, { t0: 0 }, c.length / c.sampleRate - 1.5);
      return true;
    }
    return false;
  }

  W.FFSound = Object.freeze({ play, enabled: () => on, nature: () => nature, ducked: () => ducked, unlocked: () => !!(ac && ac.state === 'running'), set, names: NAMES, render });
  if (D.body) build(); else D.addEventListener('DOMContentLoaded', build);
  tryAutoplay();
})();
