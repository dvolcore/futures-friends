/* Futures Friends motion kit (wave 6): the ONE small module every living section on the site builds on, so layers, scroll-linked
   timelines and interaction hooks are added by data, not by one-off code.
   - FFMotion.allowed(ok): the device reduced-motion setting AND the site's Decorative motion switch ([data-motion=off]) AND the
     permission motion.js passes to view hooks. Nothing in this kit moves when it is false.
   - FFMotion.scope(): one lifetime per view render. Every listener, observer, frame, timer and Web Animation registered on it is
     torn down by scope.abort() (the next render, or leaving the page).
   - scope.anim(el, frames, opts): a Web Animation (transform/opacity/filter only by convention) that the scope cancels on abort.
   - scope.pauseOffscreen(el, also): adds .ffm-paused to el (and the `also` elements) while el is off screen or the tab is hidden
     (CSS loops pause on it).
   - scope.layers(host, [{el, x, y, s}]): pop-up book depth. Pointer (desktop fine pointer only: x, y px at the edge; written as
     `transform`) and scroll (s = px moved once the host has scrolled out; native scroll-driven CSS where supported, else written
     here as `translate`). One rAF per frame at most. o.watch: the element whose visibility gates the work (default host).
   - scope.progress(el, cb): calls cb(p) with 0..1 as el travels through the viewport (0 = its top meets the viewport bottom,
     1 = its bottom passes the top), only while on screen, at most once per frame.
   - scope.enter(els, cb, {threshold}): cb(el) once, when each el first comes into view.
   - FFMotion.count(el, to, ms): counts the text of el up to `to` (tabular numerals in CSS); exact final value always written.
   Motion audit 2026-10-12:
   - FFMotion.ease / FFMotion.dur: the shared tokens of ff-tokens.css (CSS strings and milliseconds) for Web Animations;
     FFMotion.gsapEase: the same three curves for GSAP. gsap.defaults() is set from them when GSAP is on the page.
   - FFMotion.magnet(btn, sc, {max}): React Bits "Magnet", the main call-to-action only: on a desktop fine pointer the label drifts
     up to `max` px (default 6) toward the pointer; the button and its hit area never move.
   - FFMotion.spark(target, opts): React Bits "Click Spark" for real wins only (an item added to the bag, a form request sent): eight
     short felt-coloured strokes burst from the point and fade (about 450 ms). Nothing when motion is off.
   Pure at load (no DOM work), sends nothing, stores nothing. Character art only ever moves, rotates or scales uniformly. */
(function () {
  'use strict';
  const mm = q => (typeof matchMedia === 'function' ? matchMedia(q).matches : false);
  const allowed = ok => (ok === undefined || !!ok) && !mm('(prefers-reduced-motion: reduce)') && document.documentElement.dataset.motion !== 'off';
  const fine = () => mm('(hover: hover) and (pointer: fine)');
  const raf = f => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(f) : setTimeout(f, 16));
  const caf = id => (typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame(id) : clearTimeout(id));
  const hasIO = () => typeof IntersectionObserver === 'function';

  function scope() {
    const ctl = new AbortController(), on = { signal: ctl.signal }, cleanup = [], running = new Set();
    const s = {
      signal: ctl.signal, on,
      get aborted() { return ctl.signal.aborted; },
      add(f) { cleanup.push(f); return f; },
      listen(t, type, fn, o) { t.addEventListener(type, fn, Object.assign({ signal: ctl.signal }, o || {})); },
      timer(f, ms) { const id = setTimeout(() => { if (!ctl.signal.aborted) f(); }, ms); cleanup.push(() => clearTimeout(id)); return id; },
      frame(f) { const id = raf(t => { if (!ctl.signal.aborted) f(t); }); cleanup.push(() => caf(id)); return id; },
      observe(cb, opts) { if (!hasIO()) return null; const io = new IntersectionObserver(cb, opts); cleanup.push(() => io.disconnect()); return io; },
      anim(el, frames, opts) {
        if (!el || typeof el.animate !== 'function') return null;
        const a = el.animate(frames, opts);
        running.add(a);
        const done = () => running.delete(a);
        a.onfinish = done;
        return a;
      },
      abort() {
        if (ctl.signal.aborted) return;
        ctl.abort();
        running.forEach(a => { try { a.cancel(); } catch (e) { /* already gone */ } });
        running.clear();
        cleanup.splice(0).forEach(f => { try { f(); } catch (e) { /* teardown must finish */ } });
      },

      pauseOffscreen(el, also) {
        let seen = true;
        // also: elements, or a function returning them (layers built lazily after this call are still paused with el)
        const targets = () => [el].concat((typeof also === 'function' ? also() : also) || []).filter(Boolean);
        const set = () => { const off = !seen || document.visibilityState === 'hidden'; targets().forEach(t => t.classList.toggle('ffm-paused', off)); };
        const io = s.observe(es => { es.forEach(e => { seen = e.isIntersecting; }); set(); }, { threshold: 0 });
        if (io) io.observe(el);
        s.listen(document, 'visibilitychange', set);
        s.add(() => targets().forEach(t => t.classList.remove('ffm-paused')));
        return { get seen() { return seen; } };
      },

      layers(host, list, o = {}) {
        const L = list.filter(l => l && l.el);
        if (!L.length) return null;
        // Scroll depth: native scroll-driven CSS where the browser has it (hero-motion.css, @supports animation-timeline), this
        // JavaScript fallback elsewhere. Pointer depth is written as `transform`, scroll depth as `translate`: they compose.
        const cssScroll = o.cssScroll !== false && typeof CSS !== 'undefined' && CSS.supports && CSS.supports('animation-timeline: view()');
        let px = 0, py = 0, sp = 0, box = null, id = 0, seen = true;
        const write = () => {
          id = 0;
          L.forEach(l => {
            if (l.x || l.y) l.el.style.setProperty('transform', `translate3d(${(px * (l.x || 0)).toFixed(2)}px, ${(py * (l.y || 0)).toFixed(2)}px, 0)`);
            if (l.s && !cssScroll) l.el.style.setProperty('translate', `0 ${(sp * l.s).toFixed(2)}px`);
          });
        };
        const queue = () => { if (!id) id = raf(write); };
        s.add(() => { if (id) caf(id); L.forEach(l => { l.el.style.removeProperty('transform'); l.el.style.removeProperty('translate'); }); });
        const io = s.observe(es => es.forEach(e => { seen = e.isIntersecting; }), { threshold: 0 });
        if (io) io.observe(o.watch || host);
        if (fine() && o.pointer !== false) {
          s.listen(host, 'pointerenter', () => { box = host.getBoundingClientRect(); });
          s.listen(host, 'pointermove', e => {
            if (e.pointerType !== 'mouse' || !seen) return;
            if (!box) box = host.getBoundingClientRect();
            px = Math.max(-1, Math.min(1, (e.clientX - box.left) / box.width * 2 - 1));
            py = Math.max(-1, Math.min(1, (e.clientY - box.top) / box.height * 2 - 1));
            queue();
          });
          s.listen(host, 'pointerleave', () => { px = 0; py = 0; box = null; queue(); });
        }
        if (!cssScroll && o.scroll !== false && L.some(l => l.s)) {
          // l.s = pixels moved by the time the host has scrolled fully out of view (0 while it is still at the top)
          s.listen(window, 'scroll', () => { box = null; if (!seen) return; const r = host.getBoundingClientRect(); sp = Math.max(0, Math.min(1, -r.top / (r.height || 1))); queue(); }, { passive: true });
        }
        return { write, cssScroll };
      },

      progress(el, cb) {
        let seen = false, id = 0;
        const run = () => {
          id = 0;
          const r = el.getBoundingClientRect(), vh = window.innerHeight || 800;
          cb(Math.max(0, Math.min(1, (vh - r.top) / (vh + r.height))));
        };
        const queue = () => { if (!id && seen) id = raf(run); };
        s.add(() => { if (id) caf(id); });
        const io = s.observe(es => es.forEach(e => { seen = e.isIntersecting; if (seen) queue(); }), { threshold: 0 });
        if (io) io.observe(el); else { seen = true; queue(); }
        s.listen(window, 'scroll', queue, { passive: true });
        s.listen(window, 'resize', queue);
        return { run };
      },

      enter(els, cb, o = {}) {
        const list = Array.from(els || []).filter(Boolean);
        const io = s.observe(es => es.forEach(e => { if (e.isIntersecting) { io.unobserve(e.target); cb(e.target); } }), { threshold: o.threshold == null ? 0.35 : o.threshold, rootMargin: o.rootMargin || '0px' });
        if (io) list.forEach(el => io.observe(el)); else list.forEach(el => cb(el));
        return io;
      }
    };
    return s;
  }

  // Counts el's text up to `to` with a strong ease-out; the exact final value is always written last.
  function count(el, to, ms = 1200, sc) {
    const n = +to, t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    if (!el || !isFinite(n)) return;
    const fmt = v => String(Math.round(v));
    const step = t => {
      if (sc && sc.aborted) { el.textContent = fmt(n); return; }
      const p = Math.min(1, ((t || Date.now()) - t0) / ms), e = 1 - Math.pow(1 - p, 4);
      el.textContent = fmt(n * e);
      if (p < 1) raf(step); else el.textContent = fmt(n);
    };
    el.textContent = '0';
    raf(step);
  }

  // ---- shared tokens (mirror of ff-tokens.css)
  const ease = Object.freeze({ out: 'cubic-bezier(.22,1,.36,1)', spring: 'cubic-bezier(.34,1.56,.64,1)', inout: 'cubic-bezier(.65,0,.35,1)', drawer: 'cubic-bezier(.32,.72,0,1)' });
  const dur = Object.freeze({ 1: 160, 2: 260, 3: 450, 4: 800, press: 160, ui: 260, enter: 450, signature: 800, stagger: 60 });
  const gsapEase = Object.freeze({ out: 'power3.out', spring: 'back.out(1.4)', inout: 'power2.inOut' });
  try { if (window.gsap && window.gsap.defaults) window.gsap.defaults({ ease: gsapEase.out, duration: dur.enter / 1000 }); } catch (e) { /* GSAP absent */ }

  // ---- Magnet (main call-to-action only): the label moves, never the button or its hit area
  function magnet(btn, sc, o = {}) {
    if (!btn || !sc || !allowed() || !fine()) return null;
    const max = o.max == null ? 6 : o.max;
    let lab = btn.querySelector(':scope > .ffm-label');
    if (!lab) { lab = btn.ownerDocument.createElement('span'); lab.className = 'ffm-label'; while (btn.firstChild) lab.appendChild(btn.firstChild); btn.appendChild(lab); }
    let id = 0, dx = 0, dy = 0;
    const put = () => { id = 0; lab.style.setProperty('transform', `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`); };
    sc.listen(btn, 'pointermove', e => { if (e.pointerType !== 'mouse') return; const r = btn.getBoundingClientRect(); dx = Math.max(-max, Math.min(max, (e.clientX - r.left - r.width / 2) / r.width * max * 2)); dy = Math.max(-max * 2 / 3, Math.min(max * 2 / 3, (e.clientY - r.top - r.height / 2) / r.height * max * 4 / 3)); if (!id) id = raf(put); });
    sc.listen(btn, 'pointerleave', () => { dx = 0; dy = 0; if (!id) id = raf(put); });
    sc.add(() => { if (id) caf(id); lab.style.removeProperty('transform'); });
    btn.dataset.ffMagnet = 'on';
    sc.add(() => { delete btn.dataset.ffMagnet; });
    return lab;
  }

  // ---- Click Spark (real wins only). target: an element (its centre) or {x, y} in viewport px.
  const SPARK = ['#2F6FC0', '#D9488B', '#2E9E57', '#8236AE', '#E7A928'];   // Booker blue, Lumi pink, Zuri green, Bop PURPLE, gold
  function spark(target, o = {}) {
    if (!allowed() || typeof document === 'undefined' || !document.body) return null;
    let x, y;
    if (target && typeof target.getBoundingClientRect === 'function') { const r = target.getBoundingClientRect(); if (!r.width && !r.height) return null; x = r.left + r.width / 2; y = r.top + r.height / 2; }
    else if (target && isFinite(target.x) && isFinite(target.y)) { x = target.x; y = target.y; }
    else return null;
    const n = o.count || 8, colors = o.colors || SPARK, len = o.size || 12, rad = o.radius || 26;
    const host = document.createElement('span');
    host.className = 'ff-spark';
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:0;height:0;pointer-events:none;z-index:80`;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, s = document.createElement('i');
      s.style.cssText = `position:absolute;left:-1.5px;top:${-len / 2}px;width:3px;height:${len}px;border-radius:2px;background:${colors[i % colors.length]};transform-origin:50% 50%`;
      host.appendChild(s);
      const deg = a * 180 / Math.PI + 90, dx = Math.cos(a) * rad, dy = Math.sin(a) * rad;
      if (typeof s.animate === 'function') s.animate([{ transform: `translate(0,0) rotate(${deg}deg) scale(1)`, opacity: 1 }, { transform: `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px) rotate(${deg}deg) scale(.35)`, opacity: 0 }], { duration: dur.enter, easing: ease.out, fill: 'forwards' });
    }
    document.body.appendChild(host);
    setTimeout(() => host.remove(), dur.enter + 80);
    return host;
  }

  window.FFMotion = Object.freeze({ allowed, fine, scope, count, ease, dur, gsapEase, magnet, spark });
})();
