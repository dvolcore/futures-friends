// Visual-audit detector (owner 2026-10-07: "no overlapping of words or pictures on top of things, things are symmetrical and right").
// One function, run inside the page (page.evaluate(detect, opts)) at the current scroll position. It looks only at what is on screen now
// and reports layout defects a person would see:
//   overflow   an element sticks out past the left/right edge of the viewport (horizontal scroll, or content cut off by body clipping)
//   covered    a line of text has something painted on top of it (an image, a box with a background, other text)
//   blocked    the centre of a button/link is not clickable because something else sits on top of it
//   clipped    a text box cuts off its own text (overflow hidden / ellipsis / line-clamp) without that being a deliberate title
//   broken     an image that finished loading with no pixels
//   stretched  an <img> drawn with object-fit: fill at an aspect ratio more than 3% off its own
//   tiny       a button/link smaller than 24 x 24 CSS px (WCAG 2.5.8) that is not a link inside running text
// Fixed/sticky layers (header, sound pill, back-to-top) are reported apart ("fixed": true) because content scrolls under them by design.
// Elements (or ancestors) marked data-audit-ok="overlay" are intended overlays (captions on video, a badge on a photo) and are skipped.
export function detect(opts = {}) {
  const W = document.documentElement.clientWidth, H = innerHeight, out = [];
  const name = (el) => {
    if (!el || el.nodeType !== 1) return String(el);
    const parts = []; let e = el;
    for (let i = 0; e && e.nodeType === 1 && i < 4; i++, e = e.parentElement) {
      let s = e.tagName.toLowerCase();
      if (e.id) { s += '#' + e.id; parts.unshift(s); break; }
      const c = [...e.classList].filter((x) => !/^(is-|in$|on$|show|active|visible|revealed)/.test(x)).slice(0, 2);
      if (c.length) s += '.' + c.join('.');
      parts.unshift(s);
    }
    return parts.join(' > ');
  };
  const okOverlay = (el) => !!(el && el.closest && el.closest('[data-audit-ok]'));
  const shown = (el) => el.checkVisibility ? el.checkVisibility({ opacityProperty: true, visibilityProperty: true }) : true;
  const fixedRoot = (el) => { for (let e = el; e && e !== document.body; e = e.parentElement) { const p = getComputedStyle(e).position; if (p === 'fixed' || p === 'sticky') return e; } return null; };
  const inView = (r) => r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < H && r.right > 0 && r.left < W;
  const within = (el, x, y) => [...el.getClientRects()].some((r) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom);
  const tinyOne = (el) => { const cs = getComputedStyle(el); return ((el.clientWidth <= 2 || el.clientHeight <= 2) && cs.overflow !== 'visible') || cs.clipPath.includes('inset(50%') || /rect\(0(px)?,? 0/.test(cs.clip); };
  const tinyBox = (el) => { for (let e = el; e && e !== document.body; e = e.parentElement) if (tinyOne(e)) return true; return el.clientWidth <= 2 && el.clientHeight <= 2; };   // visually-hidden text (screen-reader only)
  const painted = (el, x, y) => {
    if (!el || el.nodeType !== 1) return false;
    if (!shown(el)) return false;   // faded to nothing (opacity 0 on it or an ancestor, e.g. the walking Booker between frames): not painted
    if (!(el instanceof SVGElement) && !within(el, x, y)) {     // the point is in a ::before/::after box (e.g. a stretched-link overlay)
      return ['::before', '::after'].some((ps) => { const c = getComputedStyle(el, ps); if (c.content === 'none' || c.content === 'normal' || +c.opacity < 0.15) return false; const m = /rgba?\(([^)]+)\)/.exec(c.backgroundColor); const a = m ? (m[1].split(/[ ,/]+/).filter(Boolean)[3] ?? 1) : 0; return +a > 0.35 || (c.backgroundImage !== 'none' && !/gradient/.test(c.backgroundImage)); });
    }
    const tag = el.tagName;
    if (/^(IMG|VIDEO|CANVAS|PICTURE|IFRAME)$/.test(tag)) return true;
    if (el instanceof SVGElement) return tag.toLowerCase() !== 'svg' && +getComputedStyle(el).opacity > 0.15;   // a shape of an icon/drawing is under the point
    const cs = getComputedStyle(el);
    if (+cs.opacity < 0.15) return false;
    const bg = cs.backgroundColor; const m = /rgba?\(([^)]+)\)/.exec(bg); const a = m ? (m[1].split(/[ ,/]+/).filter(Boolean)[3] ?? 1) : 0;
    if (+a > 0.35) return true;
    if (cs.backgroundImage && cs.backgroundImage !== 'none' && !/gradient/.test(cs.backgroundImage)) return true;
    // other text drawn here
    for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) { const rg = document.createRange(); rg.selectNodeContents(n); for (const r of rg.getClientRects()) if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return true; }
    return false;
  };
  const add = (o) => out.push(o);
  const stuck = (el) => { const t = parseFloat(getComputedStyle(el).top); return !Number.isNaN(t) && Math.abs(el.getBoundingClientRect().top - t) < 1.5; };

  // 0. sticky boxes that stick at a height where the site header covers them
  const hdr = document.querySelector('body > header'); const hb = hdr ? hdr.getBoundingClientRect().bottom : 0;
  if (hdr && /fixed|sticky/.test(getComputedStyle(hdr).position)) for (const el of document.body.querySelectorAll('*')) {
    if (el === hdr || hdr.contains(el) || el.contains(hdr)) continue;
    const cs = getComputedStyle(el); if (cs.position !== 'sticky' || !shown(el)) continue;
    const r = el.getBoundingClientRect(); if (!inView(r) || !stuck(el)) continue;
    if (r.top < hb - 2 && (parseInt(cs.zIndex) || 0) <= (parseInt(getComputedStyle(hdr).zIndex) || 0)) add({ kind: 'under-header', el: name(el), top: Math.round(r.top), header: Math.round(hb) });
  }

  // 1. overflow past the viewport edges
  if (opts.overflow !== false) {
    const clipsX = (e) => { const cs = getComputedStyle(e); return /hidden|clip|auto|scroll/.test(cs.overflowX) || /hidden|clip|auto|scroll/.test(cs.overflow); };
    const offenders = [];
    for (const el of document.body.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (!(r.width > 0 && r.height > 0) || (r.right <= W + 1 && r.left >= -1)) continue;
      if (r.bottom < 0 || r.top > H) continue;
      if (!shown(el) || okOverlay(el)) continue;
      if (el.closest('.ffs,.totop') && document.documentElement.classList.contains('ff-dock-tuck')) continue;   // the dock tucked to its edge tab on purpose
      if (el instanceof SVGElement && el.tagName.toLowerCase() !== 'svg') continue;   // shapes inside a drawing: the <svg> box itself is what counts
      const cs = getComputedStyle(el); if (cs.position === 'fixed' && (+cs.opacity === 0)) continue;
      let clipped = false;
      for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) { if (clipsX(p)) { const pr = p.getBoundingClientRect(); if (pr.right <= W + 1 && pr.left >= -1) { clipped = true; break; } } }
      if (clipped) continue;
      if (el.getAttribute('aria-hidden') === 'true' && !el.textContent.trim() && !el.querySelector('img,video')) continue; // decorative bleed shapes
      offenders.push({ el, r });
    }
    const top = offenders.filter((o) => !offenders.some((p) => p.el !== o.el && p.el.contains(o.el)));
    for (const { el, r } of top) add({ kind: 'overflow', el: name(el), left: Math.round(r.left), right: Math.round(r.right), W, text: (el.textContent || '').trim().slice(0, 60) });
    if (document.documentElement.scrollWidth > W + 1) add({ kind: 'hscroll', scrollWidth: document.documentElement.scrollWidth, W });
  }

  // 2. text that has something painted on top of it (hit-testing everything, including pointer-events:none layers)
  const pe = document.createElement('style'); pe.textContent = '*,*::before,*::after{pointer-events:auto!important}'; document.head.appendChild(pe);
  const flipFace = (el) => { for (let e = el; e && e !== document.body; e = e.parentElement) if (getComputedStyle(e).backfaceVisibility === 'hidden') return true; return false; };
  const seenCover = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: (n) => n.textContent.trim().length > 1 ? 1 : 2 });
  for (let n; (n = walker.nextNode());) {
    const p = n.parentElement; if (!p || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|OPTION)$/.test(p.tagName) || !shown(p) || okOverlay(p)) continue;
    if (p.closest('.sr-only,.visually-hidden,[class*="sr-only"]') || tinyBox(p) || flipFace(p)) continue;
    const rg = document.createRange(); rg.selectNodeContents(n);
    const pFixed = fixedRoot(p);
    for (const r of rg.getClientRects()) {
      if (!inView(r) || r.width < 6) continue;
      if (r.top < 0 || r.bottom > H) continue;
      const pts = [[r.left + Math.min(6, r.width / 4), r.top + r.height / 2], [r.left + r.width / 2, r.top + r.height / 2], [r.right - Math.min(6, r.width / 4), r.top + r.height / 2]];
      for (const [x, y] of pts) {
        if (x < 0 || x >= W) continue;
        const stack = document.elementsFromPoint(x, y);
        for (const s of stack) {
          if (s === p || p.contains(s)) break;            // reached the text itself
          if (s.contains(p)) break;                        // reached an ancestor (text sits inside it)
          if (okOverlay(s)) break;
          if (!painted(s, x, y)) continue;
          if (s.tagName === 'IMG') { const q = s.getBoundingClientRect(); if (Math.min(q.bottom, r.bottom) - Math.max(q.top, r.top) < 5) continue; }   // a cut-out's transparent corner grazing the line
          const f = fixedRoot(s);
          if (f && f.contains(p)) break;
          if (f && pFixed && f !== pFixed && getComputedStyle(pFixed).position === 'sticky' && !stuck(pFixed)) break;   // an unstuck sticky box scrolling under the header
          const key = name(p) + '|' + name(s);
          if (seenCover.has(key)) break; seenCover.add(key);
          add({ kind: 'covered', text: n.textContent.trim().slice(0, 50), el: name(p), by: name(s), fixed: !!f && !pFixed, at: [Math.round(x), Math.round(y)] });
          break;
        }
      }
    }
  }

  pe.remove();

  // 3. buttons and links whose centre is not clickable
  for (const el of document.body.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=tab]')) {
    if (!shown(el) || el.disabled) continue;
    const rs = [...el.getClientRects()].filter(inView); if (!rs.length) continue;
    const r = rs[0]; const x = r.left + r.width / 2, y = r.top + r.height / 2;
    if (y < 0 || y >= H || x < 0 || x >= W) continue;
    const cs = getComputedStyle(el); if (cs.pointerEvents === 'none') continue;
    const hit = document.elementFromPoint(x, y);
    if (!hit || hit === el || el.contains(hit) || (hit.tagName === 'LABEL' && hit.control === el) || (el.labels && [...el.labels].some((l) => l.contains(hit)))) {
      // too small?
      if (opts.tiny !== false && (r.width < 24 || r.height < 24)) {
        const inline = cs.display === 'inline' && el.closest('p,li,dd,td,figcaption,small') && (el.closest('p,li,dd,td,figcaption,small').textContent.trim().length > el.textContent.trim().length + 15);
        if (!inline) add({ kind: 'tiny', el: name(el), w: Math.round(r.width), h: Math.round(r.height), text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 40) });
      }
      continue;
    }
    if (hit.closest('label') && hit.closest('label').control === el) continue;
    const f = fixedRoot(hit);
    if (f && f.contains(el)) continue;
    add({ kind: 'blocked', el: name(el), text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 40), by: name(hit), fixed: !!f && !fixedRoot(el), at: [Math.round(x), Math.round(y)] });
  }

  // 4. text boxes that cut off their own text
  for (const el of document.body.querySelectorAll('*')) {
    if (!el.firstChild || !shown(el) || tinyBox(el)) continue;
    const r = el.getBoundingClientRect(); if (!inView(r)) continue;
    const hasText = [...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim().length > 2); if (!hasText) continue;
    const cs = getComputedStyle(el);
    const hidX = /hidden|clip/.test(cs.overflowX), hidY = /hidden|clip/.test(cs.overflowY);
    const clamp = cs.webkitLineClamp && cs.webkitLineClamp !== 'none';
    if ((hidX || cs.textOverflow === 'ellipsis') && el.scrollWidth > el.clientWidth + 2) add({ kind: 'clipped', el: name(el), dir: 'x', text: el.textContent.trim().slice(0, 50), sw: el.scrollWidth, cw: el.clientWidth });
    else if ((hidY || clamp) && el.scrollHeight > el.clientHeight + 3 && el.clientHeight > 0) add({ kind: 'clipped', el: name(el), dir: 'y', clamp: !!clamp, text: el.textContent.trim().slice(0, 50), sh: el.scrollHeight, ch: el.clientHeight });
  }

  // 5/6. broken and stretched images
  for (const img of document.images) {
    const r = img.getBoundingClientRect(); if (!inView(r) || !shown(img)) continue;
    if (img.complete && img.naturalWidth === 0 && (img.currentSrc || img.src)) add({ kind: 'broken', el: name(img), src: (img.currentSrc || img.src).split('/').slice(-2).join('/') });
    else if (img.naturalWidth && r.width > 20 && r.height > 20) {
      const cs = getComputedStyle(img);
      if (cs.objectFit === 'fill') {
        const cw = r.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - parseFloat(cs.borderLeftWidth) - parseFloat(cs.borderRightWidth);
        const ch = r.height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - parseFloat(cs.borderTopWidth) - parseFloat(cs.borderBottomWidth);
        const want = img.naturalWidth / img.naturalHeight, got = cw / ch;
        if (Math.abs(got / want - 1) > 0.03) add({ kind: 'stretched', el: name(img), src: (img.currentSrc || img.src).split('/').pop(), want: +want.toFixed(3), got: +got.toFixed(3) });
      }
    }
  }
  return out;
}
