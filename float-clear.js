/* Keeps the floating Sound and Nature controls (sound.js, .ffs) off the cart, add-to-bag, checkout, contact and sticky purchase bars
   (audit A6, 2026-10-08). The controls keep their usual corner. When one of those actions would sit under them at the current size and
   scroll position, the pair lifts just above it (--ffs-lift); it drops back when the action scrolls away. It only reads layout (no
   network, no storage) and does nothing when there is no .ffs. */
(function () {
  'use strict';
  if (typeof document === 'undefined') return;
  var WORDS = /add to (bag|cart)|check ?out|view (full )?(bag|cart)|place (my )?order|send (my )?(request|layout)|request (a )?(quote|tour)|contact|email|call\b|book a (demo|tour)|apply|submit/i;
  var SEL = '.sp-buybar.is-on,.sp-viewcart,.cart-fab,.sp-wide,[data-sp-add],[data-sp-checkout],button,a.btn,input[type=submit]';
  var lift = 0, queued = false;
  function vis(e) { var s = getComputedStyle(e), r = e.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0.05 && r.width > 8 && r.height > 8; }
  function isAction(e) {
    if (e.matches('.sp-buybar.is-on,.sp-viewcart,.cart-fab,[data-sp-add],[data-sp-checkout]')) return true;
    var t = (e.getAttribute('aria-label') || e.textContent || e.value || '').trim();
    return t.length < 40 && WORDS.test(t);
  }
  function run() {
    queued = false;
    var f = document.querySelector('.ffs'); if (!f) return;
    var r0 = f.getBoundingClientRect(); if (!r0.width) return;
    var top = r0.top + lift, bottom = r0.bottom + lift, left = r0.left, right = r0.right, vh = window.innerHeight;
    var rects = [];
    document.querySelectorAll(SEL).forEach(function (e) {
      if (f.contains(e) || e.classList.contains('totop') || !vis(e) || !isAction(e)) return;
      var q = e.getBoundingClientRect(); if (q.bottom < 0 || q.top > vh || q.right < left || q.left > right) return;
      rects.push(q);
    });
    var L = 0;
    for (var i = 0; i < 8; i++) {
      var hit = rects.filter(function (q) { return top - L < q.bottom + 8 && bottom - L > q.top - 8; });
      if (!hit.length) break;
      var next = Math.max.apply(null, hit.map(function (q) { return bottom - q.top + 8; }));
      if (next <= L) break;
      L = next;
    }
    if (top - L < 80) L = 0;   // never push the pair off the top of the screen; the action wins no more room than that
    if (L !== lift) { lift = L; f.style.setProperty('--ffs-lift', L + 'px'); }
  }
  function queue() { if (!queued) { queued = true; requestAnimationFrame(run); } }
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  window.addEventListener('hashchange', function () { setTimeout(queue, 400); });
  document.addEventListener('click', function () { setTimeout(queue, 300); }, true);
  new MutationObserver(queue).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden'] });
  setTimeout(queue, 800);
  window.FFFloatClear = { run: run };
})();
