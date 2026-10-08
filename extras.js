/* Futures Friends extras: L) "Build a rainbow plate" micro-game on #rainbow (M, the flip-open storybooks, was removed).
   Attaches through window.FFhooks (called by motion.js after each render) plus a MutationObserver on #view,
   so it also survives in-page re-renders (menu level/week buttons) that skip the hooks. */
(function(){
  'use strict';
  var RMQ = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var rm = function(){ return !!RMQ.matches; };
  var G = function(){ return window.gsap || null; };

  /* ------------------------------------------------------------------ CSS */
  var CSS = `
.ffr{position:relative}
.ffr-grid{display:grid;grid-template-columns:minmax(0,1.12fr) minmax(0,1fr);grid-template-areas:"stage intro" "stage tray";gap:14px 36px;align-items:start}
.ffr-intro{grid-area:intro;display:grid;gap:10px}
.ffr-intro h2{font-size:clamp(26px,3.2vw,38px)}
.ffr-intro .lede{margin:0}
.ffr-prog{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.ffr-count{font-family:var(--display);font-weight:600;font-size:15px;padding:4px 12px;border-radius:999px;background:var(--paper);border:1px solid var(--line);font-variant-numeric:tabular-nums}
.ffr-stage{grid-area:stage;position:relative;width:100%;min-width:0;align-self:start;aspect-ratio:600/460;border-radius:24px;overflow:hidden;background:radial-gradient(120% 90% at 50% 100%,var(--paper) 0 45%,var(--paper2) 100%);border:1px solid var(--line);box-shadow:0 18px 40px rgba(10,43,56,.10);touch-action:manipulation}
.ffr-bg{position:absolute;inset:0;width:100%;height:100%;display:block}
.ffr-bg .trk{fill:none;stroke-width:24;stroke-linecap:round;opacity:.16}
.ffr-bg .fil{fill:none;stroke-width:24;stroke-linecap:round;transition:stroke-dashoffset 1s cubic-bezier(.22,1,.36,1)}
.ffr-bg .plate-top{fill:#FFFFFF;stroke:#E2D7C3;stroke-width:3}
.ffr-bg .plate-well{fill:#F5EFE3}
.ffr-bg .plate-foot{fill:#EDE4D3}
.ffr-world{position:absolute;left:0;top:0;width:600px;height:460px;transform-origin:0 0;pointer-events:none}
.ffr-piece{position:absolute;left:0;top:0;width:60px;height:60px;will-change:transform}
.ffr-piece img{width:100%;height:100%;display:block;filter:drop-shadow(0 3px 2px rgba(10,43,56,.18))}
.ffr-win{position:absolute;left:50%;top:6%;transform:translateX(-50%);width:min(86%,360px);background:var(--paper);color:var(--ink);border:2px solid var(--gold);border-radius:20px;padding:14px 16px 14px 122px;display:grid;gap:8px;justify-items:start;box-shadow:0 18px 40px rgba(10,43,56,.22);z-index:3;min-height:96px}
.ffr-win[hidden]{display:none}
.ffr-win img{position:absolute;left:12px;bottom:0;height:112%;max-width:100px;object-fit:contain;object-position:bottom;pointer-events:none}
.ffr-hint{position:absolute;left:150px;width:300px;top:318px;text-align:center;font-family:var(--display);font-size:22px;font-weight:600;color:var(--muted);transition:opacity .4s}
.ffr-hint.gone{opacity:0}
.ffr-win b{font-family:var(--display);font-size:20px;line-height:1.1}
.ffr-win p{margin:0;font-size:13.5px;line-height:1.35;color:var(--muted)}
.ffr-tray{grid-area:tray;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.ffr-grp{border:1px solid var(--line);border-radius:16px;background:var(--paper);padding:8px 8px 10px;display:grid;gap:6px;border-top:5px solid var(--b);transition:background .4s,border-color .4s}
.ffr-grp.on{background:color-mix(in srgb,var(--b) 12%,var(--paper));border-color:color-mix(in srgb,var(--b) 55%,var(--line))}
.ffr-gl{display:flex;align-items:baseline;gap:6px;padding-inline:4px;min-height:22px;flex-wrap:wrap;line-height:1.2}
.ffr-gl b{font-family:var(--display);font-size:15px;color:var(--ink)}
.ffr-gl span{font-size:12px;color:var(--muted)}
.ffr-gl i{margin-left:auto;font-style:normal;width:20px;height:20px;border-radius:50%;display:grid;place-items:center;background:var(--b);color:#fff;font-size:12px;font-weight:700;transform:scale(0);transition:transform .45s cubic-bezier(.34,1.56,.64,1)}
.ffr-grp.on .ffr-gl i{transform:scale(1)}
.ffr-gf{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.ffr-food{all:unset;box-sizing:border-box;cursor:pointer;display:grid;justify-items:center;gap:2px;padding:6px 4px 5px;border-radius:12px;background:var(--paper2);border:1px solid transparent;text-align:center;font-size:12px;line-height:1.15;color:var(--ink);transition:transform .25s cubic-bezier(.34,1.56,.64,1),opacity .3s,background .2s;-webkit-tap-highlight-color:transparent}
.ffr-food img{width:48px;height:48px;display:block}
.ffr-food:hover{transform:translateY(-3px) rotate(-3deg);background:color-mix(in srgb,var(--b) 14%,var(--paper2))}
.ffr-food:active{transform:scale(.94)}
.ffr-food:focus-visible{outline:3px solid var(--gold);outline-offset:2px}
.ffr-food[disabled]{cursor:default;opacity:.32;transform:none;filter:grayscale(.5)}
.ffr-note{font-size:12.5px;color:var(--muted);margin:0}
.ffr-sr{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@media (max-width:860px){
 .ffr-grid{grid-template-columns:minmax(0,1fr);grid-template-areas:"intro" "stage" "tray"}
}
@media (max-width:420px){
 .ffr-tray{gap:8px}.ffr-grp{padding:6px 6px 8px}
 .ffr-food{font-size:11px;padding:5px 2px}.ffr-food img{width:40px;height:40px}
 .ffr-win{padding:10px 12px 10px 86px;min-height:80px;top:4%}.ffr-win img{max-width:70px;left:8px}
 .ffr-gl{display:grid;grid-template-columns:1fr auto;gap:0 6px}.ffr-gl span{grid-column:1/-1;grid-row:2}.ffr-win b{font-size:17px}.ffr-win p{font-size:12.5px}
}
@media (prefers-reduced-motion: reduce){
 .ffr-bg .fil,.ffr-food,.ffr-gl i,.ffr-grp{transition:none}
 .ffr-food:hover{transform:none}
}

`;
  function injectCSS(){
    if (document.getElementById('ff-extras-css')) return;
    var s = document.createElement('style'); s.id = 'ff-extras-css'; s.textContent = CSS; document.head.appendChild(s);
  }
  injectCSS();

  function h(tag, cls, html){ var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ================================================================== L) RAINBOW PLATE */
  var BANDS = [
    { b: 'Red', s: 'Red Rockets', c: '#D9483B', f: [['strawberry', 'Strawberry'], ['tomato', 'Tomato']] },
    { b: 'Orange', s: 'Orange Sunshine', c: '#E8761E', f: [['carrot', 'Carrot'], ['orange', 'Orange slice']] },
    { b: 'Yellow', s: 'Yellow Sunbeams', c: '#C99A06', f: [['banana', 'Banana'], ['corn', 'Corn']] },
    { b: 'Green', s: 'Green Sprouts', c: '#2E9E57', f: [['broccoli', 'Broccoli'], ['peas', 'Peas']] },
    { b: 'Blue & Purple', s: 'Purple Pals', c: '#6A4FB8', f: [['blueberries', 'Blueberries'], ['grapes', 'Grapes, quartered']] },
    { b: 'White & Tan', s: 'Cozy Clouds', c: '#8A7558', f: [['cauliflower', 'Cauliflower'], ['bread', 'Whole-grain bread']] }
  ];
  var WW = 600, WH = 460, CX = 300, CY = 414, R = 28, BOX = 60;
  var RADII = [282, 255, 228, 201, 174, 147];

  var matterP = null;
  function loadMatter(){
    if (window.Matter) return Promise.resolve(window.Matter);
    if (matterP) return matterP;
    matterP = new Promise(function(res, rej){
      var s = document.createElement('script'); s.src = 'vendor/matter.min.js'; s.async = true;
      s.onload = function(){ window.Matter ? res(window.Matter) : rej(new Error('Matter missing')); };
      s.onerror = function(){ matterP = null; rej(new Error('Matter failed to load')); };
      document.head.appendChild(s);
    });
    return matterP;
  }

  var game = null;

  function readBandNames(root){
    var ds = root.querySelectorAll('.bands > div');
    if (ds.length !== 6) return;
    ds.forEach(function(d, i){
      var b = d.querySelector('b'), s = d.querySelector('span');
      if (b && b.textContent.trim()) BANDS[i].b = b.textContent.trim();
      if (s && s.textContent.trim()) BANDS[i].s = s.textContent.trim();
      var bg = d.style.background || d.style.backgroundColor; if (bg) BANDS[i].c = bg;
    });
  }

  function archSVG(){
    var trk = '', fil = '';
    RADII.forEach(function(r, i){
      var d = 'M' + (CX - r) + ' ' + CY + ' A' + r + ' ' + r + ' 0 0 1 ' + (CX + r) + ' ' + CY;
      var len = Math.PI * r;
      trk += '<path class="trk" d="' + d + '" stroke="' + BANDS[i].c + '"/>';
      fil += '<path class="fil" data-band="' + i + '" d="' + d + '" stroke="' + BANDS[i].c + '" stroke-dasharray="' + len.toFixed(1) + ' ' + (len + 10).toFixed(1) + '" stroke-dashoffset="' + len.toFixed(1) + '"/>';
    });
    var plate = '<ellipse cx="300" cy="446" rx="190" ry="9" fill="rgba(10,43,56,.12)"/>' +
      '<path class="plate-foot" d="M190 426 L410 426 L392 444 L208 444Z"/>' +
      '<ellipse class="plate-top" cx="300" cy="420" rx="214" ry="22"/>' +
      '<ellipse class="plate-well" cx="300" cy="420" rx="168" ry="13"/>';
    return '<svg class="ffr-bg" viewBox="0 0 ' + WW + ' ' + WH + '" aria-hidden="true" focusable="false">' + trk + fil + plate + '</svg>';
  }

  function buildGame(){
    var sec = h('section', 'ffr');
    sec.id = 'ffr-game'; sec.setAttribute('aria-labelledby', 'ffr-h');
    var tray = BANDS.map(function(B, i){
      return '<div class="ffr-grp" data-grp="' + i + '" style="--b:' + B.c + '"><div class="ffr-gl"><b>' + esc(B.b) + '</b><span>' + esc(B.s.toLowerCase()) + '</span><i aria-hidden="true">&#10003;</i></div><div class="ffr-gf">' +
        B.f.map(function(f){ return '<button type="button" class="ffr-food" data-food="' + f[0] + '" data-band="' + i + '" aria-label="Put ' + esc(f[1].toLowerCase()) + ' on the plate (' + esc(B.b) + ')"><img src="img/rainbow/' + f[0] + '.svg" alt="" draggable="false"><span>' + esc(f[1]) + '</span></button>'; }).join('') +
        '</div></div>';
    }).join('');
    sec.innerHTML = '<div class="wrap"><div class="ffr-grid">' +
      '<div class="ffr-intro"><h2 id="ffr-h">Build a rainbow plate</h2><p class="lede">Tap a food to drop it on the plate. Every color that lands fills its stripe of the rainbow. Can you fill all six?</p>' +
      '<div class="ffr-prog"><span class="ffr-count" data-count>0 of 6 colors</span></div></div>' +
      '<div class="ffr-stage">' + archSVG() + '<div class="ffr-world"><div class="ffr-hint" aria-hidden="true">Tap a food to drop it here</div></div>' +
      '<div class="ffr-win" hidden role="status"><img src="img/plush/characters/bop-dancing-480.webp" alt=""><b>A rainbow plate!</b><p>Every color made it onto the plate.</p><button type="button" class="btn gold" data-ffr-again>Play again</button></div></div>' +
      '<div class="ffr-tray" role="group" aria-label="Foods to add">' + tray + '<p class="ffr-note" style="grid-column:1/-1">Grapes are always served cut in quarters, the choking-safe way for children under five.</p></div>' +
      '</div><p class="ffr-sr" aria-live="polite" data-live></p></div>';

    var g = {
      sec: sec, stage: sec.querySelector('.ffr-stage'), world: sec.querySelector('.ffr-world'), win: sec.querySelector('.ffr-win'),
      live: sec.querySelector('[data-live]'), count: sec.querySelector('[data-count]'),
      M: null, engine: null, raf: 0, running: false, pieces: [], bandHits: [0, 0, 0, 0, 0, 0], won: false, slot: 0, physics: false, dead: false, ro: null, timers: []
    };

    // scale the 600x460 world to the stage
    // on narrow screens crop the empty sky above the rainbow so the plate and food read bigger
    var svg = g.stage.querySelector('.ffr-bg'), lastCrop = -1, NARROW = matchMedia('(max-width: 860px)');
    function fit(){
      var w = g.stage.clientWidth; if (!w) return;
      var crop = NARROW.matches ? 84 : 0, sc = w / WW;
      if (crop !== lastCrop) { lastCrop = crop; g.stage.style.aspectRatio = WW + '/' + (WH - crop); svg.setAttribute('viewBox', '0 ' + crop + ' ' + WW + ' ' + (WH - crop)); }
      g.stage.style.height = (w * (WH - crop) / WW).toFixed(1) + 'px';
      g.world.style.transform = 'translateY(' + (-crop * sc) + 'px) scale(' + sc + ')';
    }
    if (window.ResizeObserver) { g.ro = new ResizeObserver(fit); g.ro.observe(g.stage); } else window.addEventListener('resize', fit);
    g.fit = fit;

    sec.addEventListener('click', function(e){
      var b = e.target.closest('.ffr-food');
      if (b && !b.disabled) { drop(g, b); return; }
      if (e.target.closest('[data-ffr-again]')) reset(g);
    });

    if (!rm()) {
      loadMatter().then(function(M){ if (!g.dead) initPhysics(g, M); }).catch(function(){ g.physics = false; });
    }
    return g;
  }

  function initPhysics(g, M){
    g.M = M;
    var E = M.Engine.create({ enableSleeping: true });
    E.gravity.y = 1.05;
    var st = { isStatic: true, friction: 1, restitution: .2 };
    M.Composite.add(E.world, [
      M.Bodies.rectangle(CX, CY + 10, 372, 20, st),                                  // plate surface (top at y=414)
      M.Bodies.rectangle(CX - 196, CY - 8, 46, 12, Object.assign({ angle: .42 }, st)),  // left rim
      M.Bodies.rectangle(CX + 196, CY - 8, 46, 12, Object.assign({ angle: -.42 }, st)), // right rim
      M.Bodies.rectangle(-20, WH / 2, 40, WH * 3, st), M.Bodies.rectangle(WW + 20, WH / 2, 40, WH * 3, st),
      M.Bodies.rectangle(WW / 2, WH + 18, WW * 2, 40, st)
    ]);
    M.Events.on(E, 'collisionStart', function(ev){
      ev.pairs.forEach(function(p){ [p.bodyA, p.bodyB].forEach(function(b){ if (b.ffPiece && !b.ffPiece.landed) landed(g, b.ffPiece); }); });
    });
    g.engine = E; g.physics = true;
    // any food tapped while Matter was loading was placed statically; leave it there as a static body so new food piles on it
    g.pieces.forEach(function(p){ if (!p.body) { p.body = M.Bodies.polygon(p.x, p.y, 8, R, { isStatic: true }); M.Composite.add(E.world, p.body); } });
  }

  function step(g){
    if (!g.running) return;
    if (g.dead || !g.sec.isConnected) { g.running = false; g.raf = 0; return; }
    g.M.Engine.update(g.engine, 1000 / 60);
    var awake = false;
    g.pieces.forEach(function(p){
      if (!p.body || p.body.isStatic) return;
      var b = p.body; if (!b.isSleeping) awake = true;
      p.el.style.transform = 'translate(' + (b.position.x - BOX / 2).toFixed(1) + 'px,' + (b.position.y - BOX / 2).toFixed(1) + 'px) rotate(' + b.angle.toFixed(3) + 'rad)';
    });
    if (!awake || performance.now() - g.lastDrop > 7000) { g.running = false; g.raf = 0; return; }   // everything is resting: stop the loop until the next drop
    g.raf = requestAnimationFrame(function(){ step(g); });
  }
  function kick(g){
    if (!g.physics || g.running || g.dead) return;
    g.running = true; g.raf = requestAnimationFrame(function(){ step(g); });
  }

  function drop(g, btn){
    var band = +btn.dataset.band, food = btn.dataset.food;
    btn.disabled = true; g.lastDrop = performance.now();
    var hint = g.sec.querySelector('.ffr-hint'); if (hint) hint.classList.add('gone');
    var el = h('div', 'ffr-piece'); el.innerHTML = '<img src="img/rainbow/' + food + '.svg" alt="">';
    g.world.appendChild(el);
    var p = { el: el, band: band, food: food, label: btn.querySelector('span').textContent, landed: false, body: null };
    g.pieces.push(p);
    var gs = G();
    if (gs && !rm()) gs.fromTo(btn, { scale: .85 }, { scale: 1, duration: .5, ease: 'back.out(3)', clearProps: 'transform' });
    if (g.physics && !rm()) {
      var M = g.M, x = CX + (Math.random() - .5) * 170, y = -BOX;
      p.body = M.Bodies.polygon(x, y, 8, R, { restitution: .38, friction: .9, frictionStatic: 1.2, frictionAir: .014, density: .0022, angle: Math.random() * 6.28 });
      p.body.ffPiece = p;
      M.Body.setVelocity(p.body, { x: (Math.random() - .5) * 2, y: 3 });
      M.Body.setAngularVelocity(p.body, (Math.random() - .5) * .16);
      M.Composite.add(g.engine.world, p.body);
      el.style.transform = 'translate(' + (x - BOX / 2) + 'px,' + (y - BOX / 2) + 'px)';
      kick(g);
    } else {
      // no-physics path: food goes straight to the next spot on the plate
      var i = g.slot++, row = Math.floor(i / 6), col = i % 6;
      var x2 = CX + (col - 2.5) * 54 + (row % 2 ? 22 : 0), y2 = CY - R - row * 50 + (col % 2 ? -3 : 3);
      if (row > 1) { x2 = CX + ((i - 12) % 4 - 1.5) * 50; y2 = CY - R - 100; }
      p.x = x2; p.y = y2;
      el.style.transform = 'translate(' + (x2 - BOX / 2) + 'px,' + (y2 - BOX / 2) + 'px) rotate(' + ((i * 47) % 40 - 20) + 'deg)';
      if (g.physics && g.M) { p.body = g.M.Bodies.polygon(x2, y2, 8, R, { isStatic: true }); g.M.Composite.add(g.engine.world, p.body); }
      landed(g, p);
    }
  }

  function landed(g, p){
    p.landed = true;
    var gs = G();
    if (gs && !rm()) gs.fromTo(p.el.firstChild, { scaleY: .78, scaleX: 1.16, transformOrigin: '50% 90%' }, { scaleY: 1, scaleX: 1, duration: .55, ease: 'elastic.out(1,.45)' });
    var first = g.bandHits[p.band]++ === 0;
    var B = BANDS[p.band], filled = g.bandHits.filter(Boolean).length;
    if (first) {
      var path = g.sec.querySelector('.fil[data-band="' + p.band + '"]');
      if (path) path.setAttribute('stroke-dashoffset', '0');
      var grp = g.sec.querySelector('[data-grp="' + p.band + '"]'); if (grp) grp.classList.add('on');
      if (gs && !rm() && path) gs.fromTo(path, { attr: { 'stroke-width': 24 } }, { attr: { 'stroke-width': 32 }, duration: .35, ease: 'power2.out', yoyo: true, repeat: 1 });
      g.count.textContent = filled + ' of 6 colors';
      if (gs && !rm()) gs.fromTo(g.count, { scale: 1.2 }, { scale: 1, duration: .5, ease: 'back.out(3)' });
    }
    g.live.textContent = p.label + ' landed. ' + (first ? B.b + ' ' + B.s.toLowerCase() + ' is filled. ' : '') + filled + ' of 6 colors.';
    if (filled === 6 && !g.won) { g.won = true; g.timers.push(setTimeout(function(){ win(g); }, rm() ? 0 : 500)); }
  }

  function win(g){
    if (g.dead) return;
    if (typeof window.FFconfetti === 'function') window.FFconfetti(140);
    g.win.hidden = false;
    var gs = G();
    if (gs && !rm()) {
      gs.fromTo(g.win, { y: -24, scale: .8, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: .7, ease: 'back.out(1.8)', clearProps: 'opacity,scale' });
      gs.fromTo(g.win.querySelector('img'), { y: 60, rotation: -12 }, { y: 0, rotation: 0, duration: .8, delay: .15, ease: 'back.out(2.2)' });
    }
    g.live.textContent = 'A rainbow plate! All six colors are filled.';
    var b = g.win.querySelector('[data-ffr-again]'); if (b) try { b.focus({ preventScroll: true }); } catch (e) { b.focus(); }
  }

  function reset(g){
    g.pieces.forEach(function(p){ if (p.body && g.engine) g.M.Composite.remove(g.engine.world, p.body); p.el.remove(); });
    g.pieces = []; g.bandHits = [0, 0, 0, 0, 0, 0]; g.won = false; g.slot = 0;
    g.sec.querySelectorAll('.fil').forEach(function(path){ path.setAttribute('stroke-dashoffset', (Math.PI * RADII[+path.dataset.band]).toFixed(1)); });
    g.sec.querySelectorAll('.ffr-grp').forEach(function(x){ x.classList.remove('on'); });
    g.sec.querySelectorAll('.ffr-food').forEach(function(b){ b.disabled = false; });
    g.count.textContent = '0 of 6 colors';
    var hint = g.sec.querySelector('.ffr-hint'); if (hint) hint.classList.remove('gone');
    g.win.hidden = true; g.live.textContent = 'New plate. Pick a food.';
    var f = g.sec.querySelector('.ffr-food'); if (f) try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); }
  }

  function destroy(g){
    g.dead = true; g.running = false;
    if (g.raf) cancelAnimationFrame(g.raf); g.raf = 0;
    g.timers.forEach(clearTimeout);
    if (g.engine && g.M) { g.M.Events.off(g.engine); g.M.Composite.clear(g.engine.world, false); g.M.Engine.clear(g.engine); }
    if (g.ro) g.ro.disconnect(); else window.removeEventListener('resize', g.fit);
    g.engine = null; g.pieces = [];
    if (g.sec.isConnected) g.sec.remove();
  }

  function attachRainbow(root){
    var bands = root.querySelector('.bands');
    if (!bands) { if (game) { destroy(game); game = null; } return; }
    readBandNames(root);
    if (!game) game = buildGame();
    if (!game.sec.isConnected) {
      var hero = root.querySelector('.phero');
      if (hero && hero.parentNode) hero.parentNode.insertBefore(game.sec, hero.nextSibling);
      else root.insertBefore(game.sec, root.firstChild);
      game.fit();
      kick(game);
    }
  }

  /* M) "Books that open" (a 3D flip-book that wrapped each .card.book cover) was removed 2026-10-07: on a phone
     a tap scaled the open spread over the card's own description, and in WebKit the rotated leaf's front face
     (positioned title layer) bled through backface-visibility, garbling the title. Covers are static now (views.js
     cover() + index.html .book rules); tests/book-cover-layout.test.js guards it. */

  /* ================================================================== wiring */
  function attach(root){
    root = root || document.getElementById('view');
    if (!root) return;
    try { attachRainbow(root); } catch (e) { console.warn(e); }
  }
  window.FFhooks = window.FFhooks || [];
  window.FFhooks.push(function(view, root){ attach(root); });

  function observe(){
    var v = document.getElementById('view');
    if (!v) return false;
    new MutationObserver(function(){ attach(v); }).observe(v, { childList: true });
    return true;
  }
  if (!observe()) document.addEventListener('DOMContentLoaded', function(){ observe(); attach(); });

  window.FFextras = { _game: function(){ return game; } };
})();
