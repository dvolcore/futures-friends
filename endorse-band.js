/* Trusted-by-professionals endorsement band. Shows the two supplied professional statements (advisor-profiles.js is the only source of
   the wording: names, roles and excerpts are read from FFAdvisors.profile, never retyped here) where a visitor decides whether to trust us.
   Placed after each route renders (FFhooks), so it does not touch the pages' own templates. Idempotent: one band per route render.
   Honest framing: reviews of the curriculum and the menu, supplied by the professionals. Not employees, advisors, accreditation or
   certification of every recipe. The full profile still opens in the existing FFAdvisors dialog (data-advisor-profile). */
(function () {
  'use strict';
  const W = window, D = document;
  const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const arrow = `<svg aria-hidden="true" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><use href="img/ui-icons.svg#ArrowRight"></use></svg>`;

  // What each person reviewed, and the portrait cropped from their supplied profile poster.
  const WHO = {
    melissa: { reviewed: 'Reviewed our curriculum', short: 'Curriculum reviewed by', portrait: 'img/advisors/melissa-hill-portrait.webp', extra: '' },
    laurie: { reviewed: 'Reviewed our Eat the Rainbow menu', short: 'Eat the Rainbow menu reviewed by', portrait: 'img/advisors/laurie-ouding-portrait.webp',
      extra: 'RN with 40 years of experience, including pediatrics and community health' }
  };
  const NOTE = 'Each statement and profile was supplied by the professional for Futures Learning Center. They are reviews of the curriculum and the menu, not an accreditation or a certification of every recipe.';

  // route -> { variant, lead (who is shown first), after: selectors tried in order, inside #view }
  const PLACE = {
    home: { variant: 'full', lead: 'melissa', before: ['.hc-trust', '.hc-close'], after: ['.px-homehero', '.phero'] },
    centers: { variant: 'full', lead: 'melissa', after: ['.phero'] },
    'for-centers': { variant: 'full', lead: 'melissa', after: ['.phero'] },
    why: { variant: 'full', lead: 'melissa', after: ['.phero'] },
    enroll: { variant: 'full', lead: 'laurie', after: ['.phero + section.tight', '.phero'] },
    membership: { variant: 'full', lead: 'melissa', after: ['.phero'] },
    pricing: { variant: 'full', lead: 'melissa', after: ['#launch', '.phero'] },
    'for-families': { variant: 'compact', lead: 'laurie', after: ['.phero'] },
    'kids-shop': { variant: 'strip', lead: 'laurie', after: ['.sf-cols', '.sp-rail'] },
    shop: { variant: 'strip', lead: 'melissa', after: ['.sf-cols', '.sp-rail'] }
  };

  const data = key => (W.FFAdvisors && W.FFAdvisors.profile ? W.FFAdvisors.profile(key) : null);
  const order = lead => (lead === 'laurie' ? ['laurie', 'melissa'] : ['melissa', 'laurie']);
  const readBtn = (key, p, cls, text, noArrow) => `<button type="button" class="${cls}" data-advisor-profile="${key}" aria-haspopup="dialog" aria-label="Read the full statement from ${esc(p.name)}">${text}${noArrow ? '' : ' ' + arrow}</button>`;

  function card(key, variant) {
    const p = data(key), w = WHO[key];
    if (!p) return '';
    return `<article class="ffe-item ffe-${key}">
      <div class="ffe-photo"><img src="${w.portrait}" width="260" height="325" loading="lazy" decoding="async" alt="${esc(p.name)}, ${esc(p.role.split(' / ')[0])}"></div>
      <div class="ffe-body"><p class="ffe-tag">${esc(w.reviewed)}</p>
      <figure class="ffe-quote"><blockquote><p>${esc(p.excerpt)}</p></blockquote>
      <figcaption><cite>${esc(p.name)}</cite><span class="ffe-role">${esc(p.role)}</span>${w.extra && variant === 'full' ? `<span class="ffe-extra">${esc(w.extra)}</span>` : ''}</figcaption></figure>
      ${readBtn(key, p, 'ffe-link', 'Read the full statement')}</div></article>`;
  }

  function strip(lead) {
    const items = order(lead).map(key => {
      const p = data(key), w = WHO[key];
      if (!p) return '';
      return `<li class="ffe-s-item"><img src="${w.portrait}" width="260" height="325" loading="lazy" decoding="async" alt="${esc(p.name)}, ${esc(p.role.split(' / ')[0])}"><span class="ffe-s-text">${esc(w.short)} <b>${esc(p.name)}</b></span>${readBtn(key, p, 'ffe-s-link', 'Read statement', true)}</li>`;
    }).join('');
    return `<aside class="ff-endorse ffe-strip" data-endorse="strip" aria-label="Professional reviews"><div class="wrap"><p class="ffe-s-lead">Trusted by professionals</p><ul>${items}</ul></div></aside>`;
  }

  function band(variant, lead) {
    if (variant === 'strip') return strip(lead);
    const id = 'ffe-h-' + variant;
    return `<section class="ff-endorse ffe-${variant}" data-endorse="${variant}" aria-labelledby="${id}"><div class="wrap">
      <header class="ffe-head"><h2 id="${id}">Trusted by professionals</h2><p>A curriculum educator and a registered nurse each reviewed part of what we offer: the curriculum and the Eat the Rainbow menu. These are their own words.</p></header>
      <div class="ffe-grid ffe-lead-${lead}">${order(lead).map(k => card(k, variant)).join('')}</div>
      <p class="ffe-note">${esc(NOTE)}</p></div></section>`;
  }

  // Insert after the first selector that matches a direct child of the view; null when none does.
  function anchor(root, selectors) {
    for (const sel of selectors) {
      let el = null;
      try { el = root.querySelector(':scope > ' + sel) || root.querySelector(sel); } catch (_) { el = null; }
      if (el) return el;
    }
    return null;
  }

  function place(view, root) {
    const cfg = PLACE[view];
    if (!cfg || !root || !root.querySelector || root.querySelector('.ff-endorse')) return false;
    if (!data('melissa') || !data('laurie')) return false;
    // Owner 2026-10-08: on Home the band sits at the bottom, right before the real-photos section ("Who is with your child").
    const pre = cfg.before ? anchor(root, cfg.before) : null;
    const at = pre || anchor(root, cfg.after);
    if (!at) return false;
    at.insertAdjacentHTML(pre ? 'beforebegin' : 'afterend', band(cfg.variant, cfg.lead));
    // The band moves everything below it; let scroll-linked motion re-measure.
    if (W.ScrollTrigger && W.requestAnimationFrame) W.requestAnimationFrame(() => { try { W.ScrollTrigger.refresh(); } catch (_) {} });
    return true;
  }

  W.FFEndorse = { band, place, routes: Object.keys(PLACE) };
  // First in the list, so the page's other hooks measure the finished layout.
  W.FFhooks = W.FFhooks || [];
  W.FFhooks.unshift((view, root) => { try { place(view, root); } catch (e) { if (W.console) console.warn(e); } });
})();
