/* Candy layer (v1). See candy.css for what it does and how to revert. No dependencies; uses FFMotion.allowed when present. */
(function () {
  'use strict';
  var R = document.documentElement;
  R.setAttribute('data-candy', '');
  var reduced = function () { return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; };
  var motionOn = function () { return !reduced() && R.dataset.motion !== 'off' && !R.classList.contains('motion-paused'); };
  var FELT = ['#2f67b3', '#d9488b', '#2e9e57', '#8236ae', '#e7a928', '#0a8a9a', '#ffd76a'];

  function ready(fn) { if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }

  ready(function () {
    // Candy sky behind everything
    var sky = document.createElement('div');
    sky.className = 'cnd-sky'; sky.setAttribute('aria-hidden', 'true');
    sky.innerHTML = '<div class="cnd-drift"><i></i><i></i><i></i><i></i><i></i></div>';
    document.body.insertBefore(sky, document.body.firstChild);

    // Gold gradient for chart sticks
    var defs = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    defs.setAttribute('width', '0'); defs.setAttribute('height', '0'); defs.setAttribute('aria-hidden', 'true');
    defs.style.position = 'absolute';
    defs.innerHTML = '<defs><linearGradient id="cndGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe08a"/><stop offset="1" stop-color="#e7a928"/></linearGradient></defs>';
    document.body.appendChild(defs);

    // Felt shells: gloss + stitch on every tile and panel
    var shells = document.querySelectorAll('.kpi, .view-overview .panel.ovd-card, .lab-card');
    shells.forEach(function (el) {
      el.classList.add('cnd-shell');
      var g = document.createElement('i'); g.className = 'cnd-gloss'; g.setAttribute('aria-hidden', 'true');
      var s = document.createElement('i'); s.className = 'cnd-stitch'; s.setAttribute('aria-hidden', 'true');
      el.appendChild(g); el.appendChild(s);
    });

    // Headline: hops in as one piece, so the Spanish switch can still swap its text
    if (motionOn()) { R.classList.add('cnd-intro'); setTimeout(function () { R.classList.remove('cnd-intro'); }, 2600); }

    // Entrances: tiles pop, stitches draw, once each
    var popTargets = [].slice.call(document.querySelectorAll('.kpi, .lab-card, .cap-docs li'));
    popTargets.forEach(function (el, i) { el.style.setProperty('--i', String(i % 6)); });
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          if (motionOn() && popTargets.indexOf(e.target) > -1) e.target.classList.add('cnd-pop');
          if (motionOn()) e.target.classList.add('cnd-seen');
          io.unobserve(e.target);
        });
      }, { threshold: 0.18 });
      popTargets.concat([].slice.call(document.querySelectorAll('.view-overview .panel.ovd-card'))).forEach(function (el) { io.observe(el); });
    }

    // Hover tilt toward the pointer (fine pointers only)
    if (window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches) {
      document.querySelectorAll('.kpi, .lab-card').forEach(function (el) {
        el.classList.add('cnd-tilt');
        el.addEventListener('pointerenter', function () { if (motionOn()) el.classList.add('cnd-hot'); });
        el.addEventListener('pointermove', function (ev) {
          if (!motionOn()) return;
          var r = el.getBoundingClientRect();
          var x = (ev.clientX - r.left) / r.width - 0.5, y = (ev.clientY - r.top) / r.height - 0.5;
          el.style.setProperty('--rx', (x * 7).toFixed(2) + 'deg');
          el.style.setProperty('--ry', (-y * 7).toFixed(2) + 'deg');
        });
        el.addEventListener('pointerleave', function () { el.classList.remove('cnd-hot'); el.style.removeProperty('--rx'); el.style.removeProperty('--ry'); });
      });
    }

    // Twinkling stars over the hero
    var hero = document.querySelector('.cap-hero');
    if (hero) {
      var c = document.createElement('canvas'); c.className = 'cnd-stars'; c.setAttribute('aria-hidden', 'true');
      hero.appendChild(c);
      var ctx = c.getContext('2d'), stars = [], dpr = Math.min(2, window.devicePixelRatio || 1), W = 0, H = 0;
      var size = function () {
        W = hero.clientWidth; H = hero.clientHeight; c.width = W * dpr; c.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        stars = []; var n = Math.round(W / 34);
        for (var i = 0; i < n; i++) stars.push({ x: Math.random() * W, y: Math.random() * H * 0.62, r: 1.5 + Math.random() * 3.2, p: Math.random() * 6.28, s: 0.6 + Math.random() * 1.4, gold: Math.random() < 0.7 });
      };
      var star = function (x, y, r, a, gold) {
        ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.beginPath();
        for (var k = 0; k < 4; k++) { ctx.rotate(Math.PI / 2); ctx.quadraticCurveTo(0, 0, 0, -r * 2.4); ctx.quadraticCurveTo(0, 0, r * 0.5, 0); }
        ctx.fillStyle = gold ? '#ffe08a' : '#ffffff'; ctx.shadowColor = gold ? 'rgba(255,200,80,.9)' : 'rgba(255,255,255,.9)'; ctx.shadowBlur = 8;
        ctx.fill(); ctx.restore();
      };
      var t0 = performance.now(), visible = true;
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(hero);
      var frame = function (now) {
        requestAnimationFrame(frame);
        if (!visible || !motionOn()) { ctx.clearRect(0, 0, W, H); return; }
        var t = (now - t0) / 1000; ctx.clearRect(0, 0, W, H);
        for (var i = 0; i < stars.length; i++) {
          var st = stars[i], a = Math.max(0, Math.sin(t * st.s + st.p));
          if (a > 0.05) star(st.x, st.y + Math.sin(t * 0.3 + st.p) * 4, st.r * (0.6 + a * 0.5), a * a * 0.85, st.gold);
        }
      };
      size(); window.addEventListener('resize', size); requestAnimationFrame(frame);
    }

    // Felt confetti: squares, circles and little stars in the friends' colours
    var conf = null, cctx = null, bits = [], running = false;
    function burst(x, y, count) {
      if (!motionOn()) return;
      if (!conf) {
        conf = document.createElement('canvas'); conf.className = 'cnd-confetti'; conf.setAttribute('aria-hidden', 'true');
        document.body.appendChild(conf); cctx = conf.getContext('2d');
      }
      var d = Math.min(2, window.devicePixelRatio || 1);
      conf.width = innerWidth * d; conf.height = innerHeight * d; cctx.setTransform(d, 0, 0, d, 0, 0);
      for (var i = 0; i < count; i++) {
        var a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1, v = 7 + Math.random() * 9;
        bits.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 4 + Math.random() * 5, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.4, c: FELT[i % FELT.length], k: i % 3, life: 0 });
      }
      if (!running) { running = true; requestAnimationFrame(step); }
    }
    function step() {
      cctx.clearRect(0, 0, innerWidth, innerHeight);
      bits = bits.filter(function (b) { return b.life < 110 && b.y < innerHeight + 40; });
      bits.forEach(function (b) {
        b.life++; b.vy += 0.32; b.vx *= 0.985; b.x += b.vx; b.y += b.vy; b.rot += b.vr;
        cctx.save(); cctx.translate(b.x, b.y); cctx.rotate(b.rot); cctx.globalAlpha = Math.min(1, (110 - b.life) / 30); cctx.fillStyle = b.c;
        if (b.k === 0) { cctx.fillRect(-b.r, -b.r * 0.6, b.r * 2, b.r * 1.2); }
        else if (b.k === 1) { cctx.beginPath(); cctx.arc(0, 0, b.r * 0.8, 0, 6.28); cctx.fill(); }
        else { cctx.beginPath(); for (var j = 0; j < 5; j++) { cctx.lineTo(Math.cos((18 + j * 72) * Math.PI / 180) * b.r * 1.2, -Math.sin((18 + j * 72) * Math.PI / 180) * b.r * 1.2); cctx.lineTo(Math.cos((54 + j * 72) * Math.PI / 180) * b.r * 0.5, -Math.sin((54 + j * 72) * Math.PI / 180) * b.r * 0.5); } cctx.closePath(); cctx.fill(); }
        cctx.restore();
      });
      if (bits.length) requestAnimationFrame(step); else { running = false; cctx.clearRect(0, 0, innerWidth, innerHeight); }
    }
    var fromEl = function (el, n) { if (!el) return; var r = el.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return; burst(r.left + r.width / 2, r.top + r.height * 0.35, n); };

    // When the ask lands (after the count-up reveal), pop once over the funding tile
    var ask = document.querySelector('.kpi[data-link="funding"]') || document.querySelector('.kpi');
    var fired = false;
    var fireAsk = function () { if (fired) return; fired = true; fromEl(ask, 70); };
    if (R.classList.contains('inv-reveal')) {
      var mo = new MutationObserver(function () { if (!R.classList.contains('inv-reveal')) { mo.disconnect(); setTimeout(fireAsk, 250); } });
      mo.observe(R, { attributes: true, attributeFilter: ['class'] });
      setTimeout(fireAsk, 6500);
    } else { setTimeout(fireAsk, 1600); }

    // Profit lab: confetti each time a scenario flips from loss to positive
    var lab = document.getElementById('profitLab');
    if (lab) {
      var wasPos = lab.classList.contains('lab-positive');
      new MutationObserver(function () {
        var pos = lab.classList.contains('lab-positive');
        if (pos && !wasPos) fromEl(lab.querySelector('.lab-result') || lab, 55);
        wasPos = pos;
      }).observe(lab, { attributes: true, attributeFilter: ['class'] });
    }

    // Clicking a KPI's arrow gives a small pop in that tile's colour family
    document.querySelectorAll('.kpi .kpi-go').forEach(function (a) {
      a.addEventListener('click', function () { fromEl(a, 24); });
    });
  });
})();
