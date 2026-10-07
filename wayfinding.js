/* Futures Friends wayfinding (wave 6, lane NAV). Nobody gets lost: parents, centers and staff each get a short path.
   1. Audience switcher (Families / Centers & home daycares / Teachers & staff): sets data-audience on <html>, is remembered on this
      device, and reorders the header's main links and the footer site map. Public hook for other lanes: window.FFAudience (below).
   2. Full-screen felt menu (dialog#ffw-menu): replaces the phone dropdown and the desktop "More" panel. Audience buttons on top, each
      audience's links in big type, a gold squiggle through the page you are on, portals as lock "preview" pills, a real phone number
      pinned in the thumb zone. Focus trap, Escape closes, focus returns to the button that opened it, scroll lock that holds on iOS.
   3. Search palette (dialog#px-search): "/" or Ctrl/Cmd+K anywhere. A static index (pages from route-meta.js, friends, printables, FAQs,
      lessons) grouped by audience; combobox + listbox with arrow keys; nothing found offers a real person.
   4. "You are here": gold underline + aria-current in the header, the squiggle in the menu, breadcrumbs above every h1, a sticky
      "Back to ..." chip on detail pages (in-app history), and a felt title card during page turns.
   5. Page turns: document.startViewTransition() around navigations the visitor started (links, back/forward). The h1 and the page's
      hero friend morph; the whole turn is 350 ms. Off for reduced motion or the site's motion switch; instant swap without support.
      Focus moves to the new h1 after every route change and the page name is announced politely.
   6. Context card (next step by audience): in the page flow under the header on phones and laptops; in the empty left margin on
      wide screens, where it hides itself if it would ever sit over a link, a button or text. Dismissed for the session. Never in print.
   7. The footer site map grouped by audience, and the "Talk to a real person" band on every page.
   Stores only the audience choice (localStorage) and the dismissed card (sessionStorage), each in try/catch. Sends nothing. */
(function () {
  'use strict';
  if (typeof document === 'undefined' || typeof V === 'undefined' || typeof go !== 'function') return;
  const doc = document, root = doc.documentElement, W = window;
  const E = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const reduceMQ = W.matchMedia ? W.matchMedia('(prefers-reduced-motion: reduce)') : { matches: true, addEventListener() {} };
  const moving = () => !reduceMQ.matches && root.dataset.motion !== 'off';
  const PHONE = '(816) 988-5661', TEL = 'tel:+18169885661';
  const ic = n => `<svg class="px-icon" aria-hidden="true"><use href="img/ui-icons.svg#${n}"></use></svg>`;
  const LOCK = (W.FFNav && W.FFNav.lockIcon) || '';
  const has = r => typeof V[r] === 'function';
  const announce = t => { if (W.FFA11y && W.FFA11y.announce) W.FFA11y.announce(t); };
  const store = {
    get(k, s) { try { return (s ? W.sessionStorage : W.localStorage).getItem(k); } catch (_) { return null; } },
    set(k, v, s) { try { (s ? W.sessionStorage : W.localStorage).setItem(k, v); return true; } catch (_) { return false; } },
    del(k, s) { try { (s ? W.sessionStorage : W.localStorage).removeItem(k); } catch (_) { /* storage blocked: the choice lasts this visit */ } }
  };
  const isMac = /Mac|iPhone|iPad/.test((W.navigator && (W.navigator.platform || W.navigator.userAgent)) || '');

  // ---------------------------------------------------------------- 1. the map: who each page is for, its short name, parent and friend
  const AUD = {
    families: { label: 'Families', short: 'Families', heading: 'For families', friend: 'lumi', wave: 'lumi-waving', c: 'var(--lumi)' },
    centers: { label: 'Centers & home daycares', short: 'Centers', heading: 'For centers & home daycares', friend: 'booker', wave: 'booker-waving', c: 'var(--booker)' },
    staff: { label: 'Teachers & staff', short: 'Staff', heading: 'For teachers & staff', friend: 'zuri', wave: 'zuri-pointing', c: 'var(--zuri)' }
  };
  const AUDS = Object.keys(AUD);
  // route: [short name, audience or '' (everyone), parent route, friend]
  const PAGES = {
    home: ['Home', '', '', 'booker'],
    enroll: ['Visit our center', 'families', 'home', 'lumi'],
    'at-home': ['Futures at Home', 'families', 'home', 'lumi'],
    'story-time': ['Story Time', 'families', 'at-home', 'booker'],
    activities: ['Things to do at home', 'families', 'at-home', 'zuri'],
    printables: ['Printables', 'families', 'at-home', 'booker'],
    'see-how': ['See how', 'families', 'at-home', 'lumi'],
    'family-videos': ['Watch together', 'families', 'at-home', 'bop'],
    'my-week': ['My Week', 'families', 'at-home', 'booker'],
    'bop-at-home': ['Bop at Home', 'families', 'at-home', 'bop'],
    'this-week': ['This week', 'families', 'at-home', 'lumi'],
    'whole-child': ['The whole-child day', 'families', 'home', 'zuri'],
    friends: ['Friends & Books', 'families', 'home', 'booker'],
    'for-families': ['Families', 'families', 'options', 'lumi'],
    'family-guide': ['Family app guide', 'families', 'hub', 'lumi'],
    'signin-family': ['Family Portal', 'families', 'home', 'lumi'],
    'family-portal': ['Family Portal preview', 'families', 'signin-family', 'lumi'],
    'shop-families': ['Family shop', 'families', 'store', 'bop'],
    events: ['Events', 'families', 'home', 'bop'],
    options: ['Program options', 'centers', 'home', 'booker'],
    'for-centers': ['For centers', 'centers', 'options', 'booker'],
    'for-home': ['Home daycares', 'centers', 'options', 'booker'],
    'for-prek': ['Pre-K and Head Start', 'centers', 'options', 'zuri'],
    'for-faith': ['Faith-based centers', 'centers', 'options', 'lumi'],
    'for-employers': ['Employer child care', 'centers', 'options', 'bop'],
    curriculum: ['Curriculum', 'centers', 'home', 'booker'],
    pricing: ['Pricing', 'centers', 'options', 'booker'],
    quote: ['Request a quote', 'centers', 'pricing', 'booker'],
    funding: ['Funding help', 'centers', 'pricing', 'booker'],
    hub: ['Futures Hub', 'centers', 'home', 'zuri'],
    app: ['Get the app', 'centers', 'hub', 'zuri'],
    impact: ['Impact', 'centers', 'home', 'zuri'],
    'train-your-staff': ['Train your staff', 'centers', 'teacher-standard', 'zuri'],
    'shop-programs': ['Classroom kits', 'centers', 'store', 'bop'],
    corners: ['Learning zone guide', 'centers', 'store', 'zuri'],
    'learn-team': ['Team training', 'centers', 'learn', 'zuri'],
    'teacher-standard': ['Teacher Standard', 'staff', 'home', 'booker'],
    'unit-1': ['Unit 1 at a glance', 'staff', 'curriculum', 'booker'],
    talk: ['Talk About It cards', 'staff', 'watch', 'lumi'],
    academy: ['Training Academy', 'staff', 'teacher-standard', 'zuri'],
    training: ['Training path', 'staff', 'academy', 'zuri'],
    summit: ['Educator summit', 'staff', 'training', 'zuri'],
    jobs: ['Careers', 'staff', 'home', 'zuri'],
    job: ['Job opening', 'staff', 'jobs', 'zuri'],
    blog: ['Blog for educators', 'staff', 'home', 'zuri'],
    post: ['Article', 'staff', 'blog', 'zuri'],
    'signin-teacher': ['Teacher Portal', 'staff', 'home', 'zuri'],
    portal: ['Teacher Portal preview', 'staff', 'signin-teacher', 'zuri'],
    'start-center': ['Start your center', 'centers', 'hub', 'zuri'],
    c: ['Center sign-in', 'staff', 'signin-teacher', 'booker'],
    learn: ['Academy', 'staff', 'teacher-standard', 'zuri'],
    'learn-course': ['Course', 'staff', 'learn', 'zuri'],
    'learn-cert': ['Certificate', 'staff', 'learn', 'zuri'],
    'learn-author': ['Course authoring', 'staff', 'learn', 'zuri'],
    'learn-approve': ['Content approval', 'staff', 'learn', 'zuri'],
    readiness: ['School readiness', '', 'curriculum', 'booker'],
    include: ['Futures Include', '', 'curriculum', 'lumi'],
    watch: ['Watch', '', 'friends', 'bop'],
    rainbow: ['Eat the Rainbow', '', 'whole-child', 'zuri'],
    store: ['Futures Store', '', 'home', 'bop'],
    'store-request': ['Store request', '', 'store', 'bop'],
    why: ['Why Futures Friends', '', 'home', 'booker'],
    news: ['Newsroom', '', 'home', 'bop'],
    support: ['Support and FAQ', '', 'home', 'zuri'],
    contact: ['Contact', '', 'home', 'lumi'],
    privacy: ['Privacy policy', '', 'home', 'lumi'],
    'child-privacy': ['Child privacy', '', 'home', 'lumi'],
    terms: ['Terms', '', 'home', 'lumi'],
    accessibility: ['Accessibility', '', 'home', 'lumi'],
    account: ['Account and security', '', 'home', 'zuri'],
    'reset-password': ['Reset your password', '', 'home', 'zuri'],
    verify: ['Verify a certificate', '', 'learn', 'zuri'],
    'not-found': ['Page not found', '', 'home', 'booker']
  };
  // Header: at most four main links per audience. Default (no choice) keeps the neutral five from premium.js.
  const MAIN = {
    families: [['enroll', 'Visit our center'], ['at-home', 'Futures at Home'], ['whole-child', 'The whole-child day'], ['friends', 'Friends & Books']],
    centers: [['for-centers', 'For centers'], ['for-home', 'Home daycares'], ['curriculum', 'Curriculum'], ['pricing', 'Pricing']],
    staff: [['teacher-standard', 'Teacher Standard'], ['unit-1', 'Unit 1 at a glance'], ['academy', 'Academy'], ['jobs', 'Careers']]
  };
  const NEUTRAL = (W.FFNav && W.FFNav.mainNav) || [['curriculum', 'Curriculum'], ['whole-child', 'Whole Child'], ['teacher-standard', 'Teacher Standard'], ['at-home', 'Futures at Home'], ['friends', 'Friends & Books']];
  // Menu: each audience's 3 to 5 links in big type.
  const GROUPS = {
    families: [['enroll', 'Visit our pilot center'], ['at-home', 'Futures at Home'], ['whole-child', 'The whole-child day'], ['bop-at-home', 'Bop at Home'], ['friends', 'Friends & Books']],
    centers: [['for-centers', 'What a center gets'], ['for-home', 'Home daycares'], ['curriculum', 'Curriculum by age'], ['pricing', 'Pricing'], ['train-your-staff', 'Train your staff']],
    staff: [['teacher-standard', 'Our Teacher Standard'], ['unit-1', 'Unit 1 at a glance'], ['talk', 'Talk About It cards'], ['academy', 'Training Academy'], ['jobs', 'Careers']]
  };
  // Everything else one tap away in the menu (small links).
  const MORE = [['options', 'Program options'], ['hub', 'Futures Hub'], ['watch', 'Watch'], ['rainbow', 'Eat the Rainbow'], ['readiness', 'School readiness'], ['story-time', 'Story Time'], ['printables', 'Printables'], ['support', 'Support and FAQ'], ['contact', 'Contact']];
  const PORTALS = [['signin-teacher', 'Teacher Portal'], ['signin-family', 'Family Portal']];
  // The context card: the honest next step for each audience (first one that is not the page you are on).
  const NEXT = {
    families: [['enroll', 'Visit our pilot center', 'Futures Learning Center in Independence, Missouri. Ask us about a tour.', 'lumi-waving'],
      ['at-home', 'Try Futures at Home', 'Free storybooks, activities and printables. No account needed.', 'lumi-heart-hands']],
    centers: [['for-centers', 'See what a center gets', 'Media, curriculum, family tools and training in one program.', 'booker-waving'],
      ['pricing', 'See the package prices', 'Published startup packages and monthly fees.', 'booker']],
    staff: [['teacher-standard', 'Read our Teacher Standard', 'What every teacher meets before working alone with children.', 'zuri-pointing'],
      ['unit-1', 'See the curriculum and a sample day', 'The Unit 1 summary and one sample day. Partner programs get every day\'s plan.', 'zuri-magnifier']],
    '': [['enroll', 'Visit our pilot center', 'Futures Learning Center in Independence, Missouri. Ask us about a tour.', 'lumi-waving'],
      ['options', 'Find your program', 'Options for centers, home daycares and families.', 'bop-waving']]
  };
  const TALK = ['contact', 'Talk to a real person', `Call ${PHONE} or send us a note.`, 'lumi-waving'];

  const route = () => (typeof view === 'string' && V[view] === V['not-found'] && view !== 'not-found') ? 'not-found' : (typeof view === 'string' ? view : 'home');
  const curArg = () => (typeof arg === 'undefined' || arg == null ? null : String(arg));
  const keyOf = (r, a) => r + (a != null && a !== '' ? '/' + a : '');
  const nameOf = r => (PAGES[r] && PAGES[r][0]) || String(r || '').replace(/-/g, ' ').replace(/^./, c => c.toUpperCase());
  const parentOf = r => (PAGES[r] ? PAGES[r][2] : 'home') || '';
  const friendOf = r => (PAGES[r] && PAGES[r][3]) || (audience ? AUD[audience].friend : 'booker');
  const plushSrc = slug => (W.FFPlush ? W.FFPlush.src(slug, 480) : `img/plush/characters/${slug}-480.webp`);
  const plush = (slug, h, cls) => (W.FFPlush ? W.FFPlush.img(slug, { alt: '', h, fixed: true, cls }) : `<img class="${cls || ''}" src="${plushSrc(slug)}" alt="" height="${h}" loading="lazy" decoding="async">`);
  const clip = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s; };
  // The name of the page you are on: the short name, or for a detail page (a story, an article) what its h1 says.
  function detailName(r, a, h1) {
    if (a == null) return nameOf(r);
    if (r === 'unit-1') return nameOf(r);   // the public summary: an old #unit-1/<day> link lands on it (wave 7 GATE)
    const t = h1 ? h1.textContent : '';
    return clip(t && t.trim() !== nameOf(r) ? t : nameOf(r) + ': ' + a.replace(/-/g, ' '), 46);
  }

  // ---------------------------------------------------------------- 2. audience
  let audience = null;
  { const saved = store.get('ff-audience'); if (AUD[saved]) audience = saved; }
  const listeners = [];
  function setAudience(a, o = {}) {
    a = AUD[a] ? a : null;
    if (a === audience && !o.force) return audience;
    const previous = audience;
    audience = a;
    if (a) store.set('ff-audience', a); else store.del('ff-audience');
    applyAudience();
    if (o.announce !== false) announce(a ? `Showing the pages for ${AUD[a].label.toLowerCase()} first.` : 'Showing the pages for everyone.');
    const detail = { audience: a, previous, source: o.source || 'api' };
    try { doc.dispatchEvent(new CustomEvent('ff:audience', { detail })); } catch (_) { /* old browsers: listeners below still run */ }
    listeners.slice().forEach(fn => { try { fn(a, previous); } catch (e) { console.warn(e); } });
    return audience;
  }
  function applyAudience() {
    if (audience) root.dataset.audience = audience; else delete root.dataset.audience;
    renderMain();
    syncSwitchers();
    renderSitemap();
    renderNext();
    if (menu.open) renderMenuBody();
  }
  function syncSwitchers() {
    doc.querySelectorAll('.ffw-audbtn[data-audience]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.audience === audience)));
  }
  // Public hook (documented for the HERO lane): Booker's "family, center or teacher?" question calls FFAudience.set('families').
  W.FFAudience = Object.freeze({
    list: AUDS.slice(),
    labels: Object.freeze(Object.fromEntries(AUDS.map(k => [k, AUD[k].label]))),
    get: () => audience,
    set: (a, o) => setAudience(a, Object.assign({ source: 'api' }, o || {})),
    clear: o => setAudience(null, Object.assign({ source: 'api' }, o || {})),
    links: a => (MAIN[AUD[a] ? a : ''] || NEUTRAL).filter(([r]) => has(r)).map(([r, n]) => ({ route: r, href: '#' + r, label: n })),
    on: fn => { if (typeof fn === 'function') listeners.push(fn); return () => { const i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); }; }
  });

  // ---------------------------------------------------------------- 3. header: main links per audience, "you are here"
  function renderMain() {
    const nav = doc.getElementById('nav'); if (!nav) return;
    const list = (audience ? MAIN[audience] : NEUTRAL).filter(([r]) => has(r));
    nav.innerHTML = list.map(([r, n]) => `<a class="px-link" href="#${r}">${E(n)}</a>`).join('');
    markCurrent();
  }
  function markCurrent() {
    const r = route();
    doc.querySelectorAll('.px-main a, .ffw-m-link, .ffw-sitemap a').forEach(a => {
      const on = a.getAttribute('href') === '#' + r;
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }

  // ---------------------------------------------------------------- 4. the full-screen felt menu
  const SQUIGGLE = '<svg class="ffw-sq" viewBox="0 0 300 26" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path pathLength="1" d="M4 16 C 26 4, 44 24, 68 13 S 108 3, 132 14 S 176 25, 200 12 S 244 4, 266 15 S 290 18, 296 10"/></svg>';
  const menu = doc.createElement('dialog');
  menu.id = 'ffw-menu'; menu.className = 'ffw-menu';
  menu.setAttribute('aria-label', 'Site menu');
  const audButtons = () => AUDS.map(k => `<button type="button" class="ffw-audbtn ffw-m-audbtn" data-audience="${k}" aria-pressed="false" style="--aud:${AUD[k].c}"><span class="ffw-m-dot" aria-hidden="true"></span>${E(AUD[k].label)}</button>`).join('');
  menu.innerHTML = `<div class="ffw-m">
   <div class="ffw-m-top"><a class="ffw-m-home" href="#home"><img class="ff-plush-wm" src="img/brand/ff-plush-wordmark-320.webp" srcset="img/brand/ff-plush-wordmark-320.webp 320w, img/brand/ff-plush-wordmark-640.webp 640w" sizes="(max-width:640px) 100px, 130px" width="130" height="61" alt="Futures Friends home"></a>
    <span class="ffw-m-pal ffw-m-pal-top" aria-hidden="true"></span>
    <button type="button" class="ffw-m-close" data-ffw-close aria-label="Close menu">${ic('X')}</button></div>
   <div class="ffw-m-scroll"><div class="ffw-m-grid">
    <div class="ffw-m-who"><p class="ffw-m-q" id="ffw-m-q">Who is visiting today?</p><div class="ffw-m-aud" role="group" aria-labelledby="ffw-m-q">${audButtons()}</div></div>
    <div class="ffw-m-groups"></div>
    <div class="ffw-m-side"></div>
   </div></div>
   <div class="ffw-m-foot"><a class="ffw-m-talk" href="#contact">Talk to a real person ${ic('ArrowRight')}</a><a class="ffw-m-phone" href="${TEL}">Call ${PHONE}</a></div>
   <span class="ffw-m-pal ffw-m-pal-corner" aria-hidden="true"></span>
  </div>`;
  doc.body.appendChild(menu);
  const menuBtn = () => doc.getElementById('menuT');
  function groupHTML(k, list, heading, cls) {
    const r = route();
    const links = list.filter(([x]) => has(x));
    return `<section class="ffw-m-group${cls ? ' ' + cls : ''}" data-aud="${k}" aria-labelledby="ffw-mg-${k}" style="--aud:${k && AUD[k] ? AUD[k].c : 'var(--gold)'}">
      <h2 class="ffw-m-gh" id="ffw-mg-${k}">${E(heading)}</h2>
      <ul>${links.map(([x, n], i) => `<li style="--i:${i}"><a class="ffw-m-link" href="#${x}"${x === r ? ' aria-current="page"' : ''}><span>${E(n)}</span>${x === r ? SQUIGGLE : ''}</a></li>`).join('')}</ul></section>`;
  }
  function renderMenuBody() {
    const groups = menu.querySelector('.ffw-m-groups'), side = menu.querySelector('.ffw-m-side');
    const order = audience ? [audience].concat(AUDS.filter(k => k !== audience)) : AUDS;
    groups.innerHTML = groupHTML('all', NEUTRAL, 'Start here', audience ? 'ffw-m-neutral' : 'ffw-m-neutral is-active')
      + order.map(k => groupHTML(k, GROUPS[k], AUD[k].heading, k === audience ? 'is-active' : '')).join('');
    const r = route();
    side.innerHTML = `<section class="ffw-m-portals" aria-labelledby="ffw-mp-h"><h2 class="ffw-m-sh" id="ffw-mp-h">Sign in</h2><div class="ffw-m-pills">${PORTALS.filter(([x]) => has(x)).map(([x, n]) => `<a class="ffw-m-pill" href="#${x}"${x === r ? ' aria-current="page"' : ''}>${LOCK}<span>${E(n)}</span><small>preview</small></a>`).join('')}</div></section>
      <section class="ffw-m-more" aria-labelledby="ffw-mm-h"><h2 class="ffw-m-sh" id="ffw-mm-h">More from Futures Friends</h2><ul>${MORE.filter(([x]) => has(x)).map(([x, n]) => `<li><a class="ffw-m-small" href="#${x}"${x === r ? ' aria-current="page"' : ''}>${E(n)}</a></li>`).join('')}<li><button type="button" class="ffw-m-small ffw-m-search" data-ffw-search>${ic('Search')}Search the site</button></li></ul></section>`;
    const pal = audience ? AUD[audience].wave : 'bop-waving';
    menu.querySelectorAll('.ffw-m-pal').forEach(el => { if (el.dataset.slug !== pal) { el.dataset.slug = pal; el.innerHTML = plush(pal, el.classList.contains('ffw-m-pal-top') ? 72 : 190, 'ffw-m-palimg') + (el.classList.contains('ffw-m-pal-corner') ? '<span class="tx-ground"></span>' : ''); } });
    syncSwitchers();
  }
  let lastTrigger = null, lockY = 0, locked = false;
  function lockScroll() {
    if (locked) return; locked = true; lockY = W.scrollY || 0;
    const b = doc.body.style; b.position = 'fixed'; b.top = `-${lockY}px`; b.left = '0'; b.right = '0'; b.width = '100%';
    root.classList.add('ffw-locked');
  }
  function unlockScroll(restore) {
    if (!locked) return; locked = false;
    const b = doc.body.style; b.position = b.top = b.left = b.right = b.width = '';
    root.classList.remove('ffw-locked');
    if (restore !== false) W.scrollTo(0, lockY);
  }
  function openMenu(trigger) {
    if (menu.open) return;
    lastTrigger = trigger || doc.activeElement;
    pal && pal.open && pal.close();
    renderMenuBody();
    lockScroll();
    menu.classList.remove('is-closing');
    menu.showModal();
    const b = menuBtn(); if (b) b.setAttribute('aria-expanded', 'true');
    menu.querySelector('.ffw-m-close').focus();
    // phones: the big links sit at the bottom of the scroll area (thumb zone); start there
    // phones list the audience question and main links first, then More and Sign in, so the menu opens at the top
    const sc = menu.querySelector('.ffw-m-scroll'); if (sc) sc.scrollTop = 0;
  }
  const NARROW_MENU = W.matchMedia ? W.matchMedia('(max-width: 900px)') : { matches: false };
  let closing = 0;
  function closeMenu(o = {}) {
    if (!menu.open) return;
    const finish = () => {
      clearTimeout(closing); closing = 0;
      menu.classList.remove('is-closing');
      if (menu.open) menu.close();
      unlockScroll(o.restore);
      const b = menuBtn(); if (b) b.setAttribute('aria-expanded', 'false');
      if (o.returnFocus !== false && lastTrigger && lastTrigger.isConnected) lastTrigger.focus({ preventScroll: true });
    };
    if (moving() && o.animate !== false) { menu.classList.add('is-closing'); closing = setTimeout(finish, 140); } else finish();
  }
  menu.addEventListener('cancel', e => { e.preventDefault(); closeMenu(); });
  // Focus trap: Tab and Shift+Tab cycle inside the menu (a native modal alone lets focus reach the browser's own toolbar).
  const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';
  const visible = el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length) && getComputedStyle(el).visibility !== 'hidden';
  function trap(box, e) {
    if (e.key !== 'Tab') return;
    const f = [...box.querySelectorAll(FOCUSABLE)].filter(visible);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (doc.activeElement === first || !box.contains(doc.activeElement))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (doc.activeElement === last || !box.contains(doc.activeElement))) { e.preventDefault(); first.focus(); }
  }
  menu.addEventListener('keydown', e => trap(menu, e));
  menu.addEventListener('click', e => {
    if (e.target.closest('[data-ffw-close]')) { closeMenu(); return; }
    if (e.target.closest('[data-ffw-search]')) { closeMenu({ returnFocus: false }); setTimeout(() => palette.open(menuBtn()), moving() ? 150 : 0); }
  });
  // Warm the corner friend before the first open (hover or focus on the Menu button), so the picture is there when the menu is.
  const warm = new Set();
  function prefetch(slug) { if (warm.has(slug)) return; warm.add(slug); const i = new Image(); i.decoding = 'async'; i.src = plushSrc(slug); }

  // ---------------------------------------------------------------- 5. search palette
  const pal = doc.createElement('dialog');
  pal.id = 'px-search'; pal.className = 'px-dialog ffw-pal';
  pal.setAttribute('aria-labelledby', 'ffw-pal-title');
  const kbdK = isMac ? '⌘K' : 'Ctrl K';
  pal.innerHTML = `<h2 id="ffw-pal-title" class="sr-only">Search Futures Friends</h2>
   <div class="ffw-pal-head"><label class="ffw-pal-box" for="px-globalquery">${ic('Search')}<span class="sr-only">Search pages, friends, printables and questions</span>
    <input id="px-globalquery" type="text" role="combobox" aria-expanded="true" aria-controls="ffw-pal-list" aria-autocomplete="list" aria-describedby="ffw-pal-hint" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="go" placeholder="Search pages, friends, printables, questions"></label>
    <button type="button" class="px-iconbtn ffw-pal-close" data-px="close" aria-label="Close search">${ic('X')}</button></div>
   <p class="sr-only" id="ffw-pal-hint">Results update as you type. Use the up and down arrow keys to choose one, then press Enter to open it.</p>
   <p class="sr-only" role="status" id="ffw-pal-status"></p>
   <div class="ffw-pal-body" role="region" tabindex="0" aria-label="Search results, scrollable"><div id="ffw-pal-list" class="ffw-pal-list" role="listbox" aria-label="Search results"></div><div class="ffw-pal-empty" hidden></div></div>
   <div class="ffw-pal-foot" aria-hidden="true"><span><kbd>↑</kbd><kbd>↓</kbd> choose</span><span><kbd>Enter</kbd> open</span><span><kbd>/</kbd> or <kbd>${kbdK}</kbd> search from any page</span></div>`;
  doc.body.appendChild(pal);
  const input = pal.querySelector('#px-globalquery'), list = pal.querySelector('#ffw-pal-list'), empty = pal.querySelector('.ffw-pal-empty'), status = pal.querySelector('#ffw-pal-status');

  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ').replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  // Extra words people use for a page (search only; nothing here is shown as a claim).
  const SYN = {
    enroll: 'tour visit apply application enroll enrollment tuition independence missouri pilot center daycare near me',
    pricing: 'price prices cost costs fee fees how much package packages',
    jobs: 'jobs hiring work career careers apply teacher job openings employment',
    contact: 'phone call email talk person help address',
    support: 'help faq questions answers technical tutorial',
    'signin-teacher': 'login log in sign in teacher portal password staff educators',
    'signin-family': 'login log in sign in parent family portal app',
    'at-home': 'free library home parents activities books',
    'story-time': 'read aloud read along storybook books story',
    printables: 'print pdf printable worksheet chart certificate',
    'teacher-standard': 'background check training teacher standard qualifications cpr first aid safety',
    'whole-child': 'meals food nap quiet time rest movement schedule day',
    curriculum: 'lessons lesson plan units themes weeks curriculum ages',
    'unit-1': 'unit one summary first month at a glance overview days weeks sample day full curriculum lesson plans packets licensed request access',
    'bop-at-home': 'movement exercise move dance active',
    friends: 'characters booker lumi zuri bop books plush',
    rainbow: 'recipes food meals cacfp menu nutrition',
    'for-home': 'home daycare family child care provider in home',
    'for-centers': 'center child care centre license licensing director',
    hub: 'app software attendance ratios portal director tools',
    academy: 'training course courses lessons teacher learning'
  };
  const EXCLUDE = new Set(['post', 'job', 'learn-course', 'learn-cert', 'learn-team', 'learn-author', 'learn-approve', 'verify', 'account', 'reset-password', 'not-found', 'portal', 'family-portal', 'home']);
  let INDEX = null;
  function buildIndex() {
    const out = [], R = (W.FFRouteMeta && W.FFRouteMeta.ROUTES) || {}, extra = Object.fromEntries((W.FFSearchPages || []).map(([r, t]) => [r, t]));
    Object.keys(R).forEach(r => {
      if (EXCLUDE.has(r) || !has(r)) return;
      out.push({ kind: 'Page', aud: (PAGES[r] && PAGES[r][1]) || '', title: nameOf(r), desc: R[r][1], kw: [R[r][0], extra[r], SYN[r]].join(' '), href: '#' + r, friend: friendOf(r) });
    });
    const CHs = typeof CH !== 'undefined' ? CH : {};
    Object.keys(CHs).forEach(k => { const c = CHs[k]; out.push({ kind: 'Friend', aud: '', title: c.n, desc: `${c.role}. ${c.n} the ${c.a}: ${c.p}.`, kw: `${c.a} ${c.p} ${c.v} ${c.z} friend character`, href: '#friends', friend: k, reveal: { name: c.n } }); });
    const S = W.FFSupporting;
    if (S && S.allKeys && S.profile) S.allKeys.forEach(k => { const p = S.profile(k); out.push({ kind: 'Friend', aud: '', title: p.name, desc: `${p.role}. Story-world character.`, kw: `${p.line || ''} story world character town`, href: '#friends', img: p.image, reveal: { name: p.name } }); });
    const F = W.FFFamily;
    if (F && F.PRINTABLES) F.PRINTABLES.forEach(p => out.push({ kind: 'Printable', aud: 'families', title: p.t, desc: p.d, kw: `printable pdf print ${p.id.replace(/-/g, ' ')}`, href: '#printables', friend: p.c, reveal: { sel: `a.fl-thumb[href="${p.f}"]` } }));
    if (typeof FAQ !== 'undefined' && Array.isArray(FAQ)) FAQ.forEach(([q, a]) => out.push({ kind: 'Question', aud: 'centers', title: q, desc: a, kw: 'faq question', href: '#support', faq: 'support', reveal: { q } }));
    const T = W.FFTeacherStandard;
    if (T && Array.isArray(T.FAQ)) T.FAQ.forEach(([q, a]) => out.push({ kind: 'Question', aud: 'staff', title: q, desc: a, kw: 'faq question teacher standard', href: '#teacher-standard', reveal: { q } }));
    const mods = (W.FF && W.FF.modules) || [];
    mods.forEach(m => out.push({ kind: 'Lesson', aud: 'staff', title: m.title, desc: `${m.code}, sample lesson preview in the Training Academy`, kw: `${m.code} lesson course module`, href: '#academy/' + encodeURIComponent(m.code), friend: 'zuri', lesson: true }));
    out.forEach(o => { o.nt = norm(o.title); o.nk = norm(o.kw); o.nd = norm(o.desc); });
    return out;
  }
  function score(o, q, toks) {
    let s = 0;
    for (const t of toks) {
      const inT = o.nt.includes(t), inK = (' ' + o.nk + ' ').includes(t), inD = o.nd.includes(t);
      if (!inT && !inK && !inD) return 0;
      s += inT ? ((' ' + o.nt).includes(' ' + t) ? 24 : 12) : inK ? 7 : 2;
    }
    if (o.nt === q) s += 120; else if (o.nt.startsWith(q)) s += 60;
    if (o.kind === 'Page') s += 6; else if (o.kind === 'Lesson') s -= 6;
    if (audience && o.aud === audience) s += 4;
    return s;
  }
  const KIND_ICON = { Page: 'Route', Printable: 'Download', Question: 'Sparkles', Lesson: 'BookOpen' };
  const GROUP_LABEL = { families: 'For families', centers: 'For centers & home daycares', staff: 'For teachers & staff', '': 'For everyone' };
  let opts = [], active = -1;
  function suggestions() {
    const pick = (audience ? GROUPS[audience] : NEUTRAL.concat([['enroll'], ['contact']])).map(([r]) => r).filter(has);
    return pick.map(r => INDEX.find(o => o.href === '#' + r && o.kind === 'Page')).filter(Boolean);
  }
  function renderResults() {
    if (!INDEX) INDEX = buildIndex();
    const q = norm(input.value), toks = q.split(' ').filter(Boolean);
    let rows;
    if (!q) rows = suggestions().map(o => Object.assign({ _s: 1 }, o));
    else rows = INDEX.map(o => Object.assign({ _s: score(o, q, toks) }, o)).filter(o => o._s > 0).sort((a, b) => b._s - a._s);
    // Groups by audience; the group holding the best match comes first (your own audience wins a near tie).
    const by = {}; rows.forEach(o => { (by[o.aud] = by[o.aud] || []).push(o); });
    const best = k => by[k][0]._s + (k === audience ? 8 : 0);
    const groups = q ? Object.keys(by).sort((a, b) => best(b) - best(a)).map(k => [k, by[k].slice(0, 7)]) : [['suggest', rows]];
    opts = []; let n = 0;
    list.innerHTML = groups.map(([k, items]) => `<div role="group" class="ffw-pal-group" aria-label="${E(k === 'suggest' ? (audience ? 'Suggested for ' + AUD[audience].label.toLowerCase() : 'Suggested pages') : GROUP_LABEL[k])}"><div class="ffw-pal-gh" aria-hidden="true">${E(k === 'suggest' ? (audience ? 'Suggested for ' + AUD[audience].label.toLowerCase() : 'Good places to start') : GROUP_LABEL[k])}</div>${items.map(o => { const id = 'ffw-o-' + (n++); opts.push(o); return `<a role="option" id="${id}" class="ffw-pal-opt" href="${o.href}" tabindex="-1" aria-selected="false" data-i="${n - 1}"><span class="ffw-pal-art" aria-hidden="true" style="--c:var(--${['booker', 'lumi', 'zuri', 'bop'].includes(o.friend) ? o.friend : 'gold-deep'})">${o.kind === 'Friend' ? plush(o.img || o.friend, 44, 'ffw-pal-img') : ic(KIND_ICON[o.kind] || 'Route')}</span><span class="ffw-pal-t"><b>${E(o.title)}</b><small>${E(clip(o.desc, 110))}</small></span><span class="ffw-pal-kind">${E(o.kind)}</span></a>`; }).join('')}</div>`).join('');
    list.hidden = !opts.length;
    input.setAttribute('aria-expanded', String(!!opts.length));
    empty.hidden = !!opts.length;
    if (!opts.length) empty.innerHTML = `${plush('booker-thinking', 150, 'ffw-pal-emptyart')}<div><p class="ffw-pal-none">Nothing matches “${E(input.value.trim())}”.</p><p>Try a friend’s name, a page like Pricing or Story Time, or a word like tour or printables. Or ask us:</p><div class="ffw-pal-help"><a class="ffw-pal-talk" href="#contact">Talk to a real person ${ic('ArrowRight')}</a><a class="ffw-pal-call" href="${TEL}">Call ${PHONE}</a></div></div>`;
    setActive(opts.length ? 0 : -1);
    clearTimeout(renderResults.t);
    renderResults.t = setTimeout(() => { status.textContent = q ? (opts.length ? `${opts.length} result${opts.length === 1 ? '' : 's'}.` : 'No results. You can talk to a real person instead.') : ''; }, 350);
  }
  function setActive(i, scroll) {
    const els = list.querySelectorAll('[role="option"]');
    els.forEach(el => el.setAttribute('aria-selected', 'false'));
    active = i;
    if (i < 0 || !els[i]) { input.removeAttribute('aria-activedescendant'); return; }
    els[i].setAttribute('aria-selected', 'true');
    input.setAttribute('aria-activedescendant', els[i].id);
    if (scroll) els[i].scrollIntoView({ block: 'nearest' });
  }
  input.addEventListener('input', renderResults);
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); if (!opts.length) return;
      setActive((active + (e.key === 'ArrowDown' ? 1 : -1) + opts.length) % opts.length, true);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const el = list.querySelectorAll('[role="option"]')[active]; if (el) el.click();
    }
  });
  list.addEventListener('mousemove', e => { const o = e.target.closest('[role="option"]'); if (o && +o.dataset.i !== active) setActive(+o.dataset.i); });
  // Capture: runs before premium.js's link handler navigates, so the found item can be revealed after the page turn.
  pal.addEventListener('click', e => {
    const o = e.target.closest('[role="option"]'); if (!o) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;   // a new tab: nothing to reveal here
    const item = opts[+o.dataset.i]; if (!item) return;
    if (item.faq === 'support' && typeof st !== 'undefined') st.help = 'faq';
    pendingReveal = item.reveal || null;
    const r = item.href.slice(1).split('/')[0];
    if (r === route() && !item.lesson) { e.preventDefault(); pal.close(); afterUpdate(runReveal); }
  }, true);
  pal.addEventListener('keydown', e => trap(pal, e));
  pal.addEventListener('close', () => { if (!pal.contains(doc.activeElement) && (doc.activeElement === doc.body || !doc.activeElement) && palTrigger && palTrigger.isConnected) palTrigger.focus({ preventScroll: true }); });
  let palTrigger = null;
  const palette = {
    open(trigger) {
      palTrigger = trigger || doc.activeElement;
      if (menu.open) closeMenu({ returnFocus: false, animate: false });
      if (!pal.open) pal.showModal();
      input.value = ''; renderResults(); input.focus();
    },
    close() { if (pal.open) pal.close(); },
    search(q) { if (!INDEX) INDEX = buildIndex(); const n = norm(q), t = n.split(' ').filter(Boolean); return INDEX.map(o => Object.assign({ score: score(o, n, t) }, o)).filter(o => o.score > 0).sort((a, b) => b.score - a.score).map(({ kind, aud, title, href, score }) => ({ kind, aud, title, href, score })); }
  };
  doc.addEventListener('keydown', e => {
    const k = e.key;
    if ((k === 'k' || k === 'K') && (e.metaKey || e.ctrlKey) && !e.altKey) { e.preventDefault(); if (pal.open) pal.close(); else palette.open(doc.activeElement); return; }
    if (k === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const t = e.target, editable = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
      if (editable || doc.querySelector('dialog[open]')) return;
      e.preventDefault(); palette.open(t);
    }
  });

  // ---------------------------------------------------------------- 6. breadcrumbs, back chip, closing band (run on every render)
  function chainOf(r, a) {
    const chain = []; const seen = new Set();
    let p = a != null ? r : parentOf(r);
    while (p && !seen.has(p) && p !== 'home') { seen.add(p); chain.unshift(p); p = parentOf(p); }
    return [['home', 'Home']].concat(chain.filter(has).map(x => [x, nameOf(x)]));
  }
  function crumbsHTML(r, a, h1) {
    const items = chainOf(r, a).map(([x, n]) => `<li><a href="#${x}">${E(n)}</a></li>`);
    items.push(`<li><span aria-current="page">${E(detailName(r, a, h1))}</span></li>`);
    return `<nav class="ffw-crumbs" aria-label="Breadcrumb" data-key="${E(keyOf(r, a))}"><ol>${items.join('<li class="ffw-cs" aria-hidden="true">/</li>')}</ol></nav>`;
  }
  const KICK = /(^|\s)(eyebrow|px-kicker|ffa-kick|[a-z0-9]+-kicker|[a-z0-9]+-kick|[a-z0-9]+-eyebrow)(\s|$)/;
  function ensureCrumbs() {
    const v = doc.getElementById('view'); if (!v) return;
    const r = route(), a = curArg();
    if (r === 'home') { v.querySelectorAll('.ffw-crumbs').forEach(n => n.remove()); return; }
    // One trail per page: the older per-page trails (views.js .crumbs, family-library .fl-crumbs) are replaced by the site-wide one.
    const h1 = v.querySelector('h1'); if (!h1) return;
    const k = keyOf(r, a), html = crumbsHTML(r, a, h1);
    let nav = v.querySelector('.ffw-crumbs');
    if (nav && nav.dataset.key === k && nav.compareDocumentPosition(h1) & Node.DOCUMENT_POSITION_FOLLOWING) return;
    if (nav) nav.remove();
    const old = [...v.querySelectorAll('.crumbs, .fl-crumbs')].find(c => c.compareDocumentPosition(h1) & Node.DOCUMENT_POSITION_FOLLOWING);
    if (old) { old.insertAdjacentHTML('beforebegin', html); old.remove(); }
    else {
      let at = h1; const prev = h1.previousElementSibling;
      if (prev && KICK.test(prev.className || '')) at = prev;
      // an h1 that shares a horizontal flex row (the Story Time reader bar) gets its trail on the line above that row
      const row = at.parentElement, rs = row && row !== v ? getComputedStyle(row) : null;
      if (rs && /flex/.test(rs.display) && !/column/.test(rs.flexDirection)) at = row;
      at.insertAdjacentHTML('beforebegin', html);
    }
    nav = v.querySelector('.ffw-crumbs');
    if (nav) nav.style.color = getComputedStyle(h1).color;           // the h1's own colour: readable on navy heroes and paper alike
  }
  // In-app history for the back chip: [{key, r, a, name}]. Back/forward moves through it; a new page is pushed.
  const hist = [];
  function recordHistory() {
    const r = route(), a = curArg(), k = keyOf(r, a);
    const h1 = doc.querySelector('#view h1');
    const entry = { key: k, r, a, name: detailName(r, a, h1) };
    if (hist.length && hist[hist.length - 1].key === k) { hist[hist.length - 1] = entry; return; }
    const back = !!(W.FFNav && W.FFNav.viaHistory); if (W.FFNav) W.FFNav.viaHistory = false;   // set by premium.js on Back/Forward
    if (back && hist.length > 1 && hist[hist.length - 2].key === k) { hist.pop(); hist[hist.length - 1] = entry; return; }   // browser Back
    hist.push(entry); if (hist.length > 40) hist.shift();
  }
  function backTarget() {
    const r = route(), a = curArg(); if (a == null) return null;
    const prev = hist.length > 1 ? hist[hist.length - 2] : null;
    const k = keyOf(r, a);
    if (prev && prev.key !== k) return { href: '#' + prev.key, name: prev.name, back: true };
    return has(r) ? { href: '#' + r, name: nameOf(r), back: false } : null;
  }
  function ensureBack() {
    const v = doc.getElementById('view'); if (!v) return;
    const t = backTarget();
    let bar = v.querySelector(':scope > .ffw-backbar');
    if (!t) { if (bar) bar.remove(); return; }
    v.querySelectorAll('a.fl-back').forEach(a => a.classList.toggle('ffw-dup', a.getAttribute('href') === t.href));   // one way back, not two
    const html = `<div class="ffw-backbar"><div class="wrap"><a class="ffw-back" href="${E(t.href)}"${t.back ? ' data-ffw-back' : ''}>${ic('ArrowLeft')}<span>Back to ${E(t.name)}</span></a></div></div>`;
    if (bar) { if (bar.outerHTML !== html) bar.outerHTML = html; } else v.insertAdjacentHTML('afterbegin', html);
  }
  function syncClose() {
    const band = doc.getElementById('ffw-close'); if (!band) return;
    const v = doc.getElementById('view');
    const own = v && v.querySelector('.hc-close, [data-ffw-own-close]');
    band.hidden = !!own || route() === 'contact';
  }

  // ---------------------------------------------------------------- 7. context card
  const next = doc.createElement('aside');
  next.id = 'ffw-next'; next.className = 'ffw-next'; next.setAttribute('aria-label', 'Suggested next step');
  const header = doc.querySelector('header.bar');
  if (header && header.parentNode) header.parentNode.insertBefore(next, header.nextSibling);
  let nextHidden = store.get('ff-next-hidden', true) === '1';
  function renderNext() {
    if (nextHidden) { next.hidden = true; next.innerHTML = ''; return; }
    const r = route();
    if (r === 'home' || r === '') { next.hidden = true; return; }   // Home has its own front door (Booker's question + doors); the strip would push the hero's ground line below the fold
    const pick = (NEXT[audience || ''] || []).concat([TALK]).find(([x]) => x !== r && has(x));
    if (!pick) { next.hidden = true; return; }
    const [x, title, sub, slug] = pick;
    const sig = x + '|' + slug;
    if (next.dataset.sig !== sig) {
      next.dataset.sig = sig;
      next.style.setProperty('--aud', audience ? AUD[audience].c : 'var(--gold)');
      next.innerHTML = `<div class="ffw-next-in"><a class="ffw-next-link" href="#${x}"><span class="ffw-next-pal" aria-hidden="true">${plush(slug, 64, 'ffw-next-img')}</span><span class="ffw-next-txt"><b>${E(title)}</b><span class="ffw-next-sub">${E(sub)}</span></span>${ic('ArrowRight')}</a><button type="button" class="ffw-next-x" aria-label="Hide this suggestion" title="Hide for this visit">${ic('X')}</button></div>`;
    }
    next.hidden = false;
    next.classList.toggle('is-detail', curArg() != null);           // below 1440 px a detail page's back chip takes this slot
    placeNext();
  }
  next.addEventListener('click', e => {
    if (!e.target.closest('.ffw-next-x')) return;
    nextHidden = true; store.set('ff-next-hidden', '1', true);
    const v = doc.getElementById('view');
    next.hidden = true; next.innerHTML = ''; delete next.dataset.sig;
    announce('Suggestion hidden for this visit.');
    if (v) v.focus({ preventScroll: true });
  });
  // Wide screens: the card floats in the empty left margin. It never sits over a link, button, field or text: if anything readable
  // or clickable is under it (a full-width section, the academy sidebar) it steps out of the way until the space is clear again.
  const WIDE = W.matchMedia ? W.matchMedia('(min-width: 1440px)') : { matches: false, addEventListener() {} };
  const UNDER = 'a[href],button,input,select,textarea,summary,label,[role="button"],[tabindex]:not([tabindex="-1"]),h1,h2,h3,h4,p,li,dt,dd,td,th,figcaption,blockquote,img,svg,video,picture,canvas,iframe';
  function overlapsContent(box) {
    const els = doc.querySelectorAll('#view ' + UNDER.split(',').join(',#view ') + ',footer a,footer p,#ffw-close a,#ffw-close h2,#ffw-close p,#ff-prefooter img,#ff-prefooter a');
    for (const el of els) {
      if (next.contains(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.bottom <= box.top || r.top >= box.bottom || r.right <= box.left || r.left >= box.right || !r.width || !r.height) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
      return true;
    }
    return false;
  }
  let placeQ = 0;
  function placeNext() {
    if (placeQ) return;
    placeQ = requestAnimationFrame(() => {
      placeQ = 0;
      if (next.hidden || !WIDE.matches) { next.classList.remove('is-away'); return; }
      const box = next.getBoundingClientRect();
      next.classList.toggle('is-away', overlapsContent(box));
    });
  }
  let scrollT = 0;
  W.addEventListener('scroll', () => { if (!WIDE.matches || next.hidden) return; next.classList.add('is-away'); clearTimeout(scrollT); scrollT = setTimeout(placeNext, 160); }, { passive: true });
  W.addEventListener('resize', () => { setHeadVar(); placeNext(); });
  if (WIDE.addEventListener) WIDE.addEventListener('change', placeNext);

  // ---------------------------------------------------------------- 8. footer site map: the chosen audience first; folds on phones
  const NARROW = W.matchMedia ? W.matchMedia('(max-width: 700px)') : { matches: false, addEventListener() {} };
  function renderSitemap() {
    const map = doc.querySelector('.ffw-sitemap'); if (!map) return;
    const cols = [...map.querySelectorAll(':scope > .ffw-fcol')];
    const order = (audience ? [audience] : []).concat(AUDS.filter(k => k !== audience));
    order.slice().reverse().forEach(k => { const c = cols.find(x => x.dataset.aud === k); if (c) map.insertBefore(c, map.firstChild); });
    cols.forEach(c => {
      c.classList.toggle('is-active', c.dataset.aud === audience);
      const h = c.querySelector('.ffw-fh'), ul = c.querySelector('ul'), label = h.dataset.label || (h.dataset.label = h.textContent.trim());
      if (NARROW.matches) {
        const open = c.dataset.aud === audience || c.dataset.open === '1';
        if (!h.querySelector('button')) h.innerHTML = `<button type="button" class="ffw-fbtn" aria-controls="${ul.id}">${E(label)}${ic('ChevronDown')}</button>`;
        h.querySelector('button').setAttribute('aria-expanded', String(open));
        ul.hidden = !open;
      } else {
        if (h.querySelector('button')) h.textContent = label;
        ul.hidden = false;
      }
    });
    markCurrent();
  }
  doc.addEventListener('click', e => {
    const b = e.target.closest('.ffw-fbtn'); if (!b) return;
    const c = b.closest('.ffw-fcol'), ul = c.querySelector('ul'), open = b.getAttribute('aria-expanded') !== 'true';
    b.setAttribute('aria-expanded', String(open)); ul.hidden = !open; c.dataset.open = open ? '1' : '';
  });
  if (NARROW.addEventListener) NARROW.addEventListener('change', renderSitemap);

  // ---------------------------------------------------------------- 9. clicks: audience buttons, the menu button, the back chip
  doc.addEventListener('click', e => {
    const ab = e.target.closest('.ffw-audbtn[data-audience]');
    if (ab) { const k = ab.dataset.audience; setAudience(audience === k ? null : k, { source: ab.closest('#ffw-menu') ? 'menu' : 'header' }); return; }
    const mb = e.target.closest('#menuT');
    if (mb) { e.preventDefault(); openMenu(mb); return; }
  });
  doc.addEventListener('pointerover', e => { if (e.target.closest && e.target.closest('#menuT')) prefetch(audience ? AUD[audience].wave : 'bop-waving'); }, { passive: true });
  doc.addEventListener('focusin', e => { if (e.target.id === 'menuT') prefetch(audience ? AUD[audience].wave : 'bop-waving'); });
  // The back chip goes back through the browser's own history when it points at the page before, so Back stays truthful.
  doc.addEventListener('click', e => {
    const b = e.target.closest('a[data-ffw-back]');
    if (!b || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault(); e.stopPropagation(); intent(); W.history.back();
  }, true);

  // ---------------------------------------------------------------- 10. page turns, focus and announcements
  let wantTurn = false, wantT = 0;
  function intent() { wantTurn = true; clearTimeout(wantT); wantT = setTimeout(() => { wantTurn = false; }, 0); }
  doc.addEventListener('click', e => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (e.target.closest && e.target.closest('a[href^="#"]:not([href="#view"]),[data-go],[data-post],button[data-job],[data-ffx-lesson]')) intent();
  }, true);
  W.addEventListener('popstate', intent, true);
  W.addEventListener('hashchange', intent, true);

  const pendingAfter = [];
  let pendingReveal = null;
  function afterUpdate(fn) { pendingAfter.push(fn); if (!turning) flushAfter(); }
  function flushAfter() { const q = pendingAfter.splice(0); requestAnimationFrame(() => q.forEach(fn => { try { fn(); } catch (e) { console.warn(e); } })); }
  function runReveal() {
    const spec = pendingReveal; pendingReveal = null; if (!spec) return;
    const v = doc.getElementById('view'); if (!v) return;
    let el = spec.sel ? v.querySelector(spec.sel) : null;
    if (!el && spec.q) el = [...v.querySelectorAll('details summary')].find(s => s.textContent.replace(/\s+/g, ' ').trim() === spec.q);
    if (!el && spec.name) el = [...v.querySelectorAll('.ff-townie, .friend, .ff-community [data-cast], h3, b')].find(x => { const t = (x.querySelector('b, .nm, h3') || x).textContent.trim(); return t === spec.name; });
    if (!el) return;
    const d = el.closest('details'); if (d) d.open = true;
    if (!el.matches(FOCUSABLE)) el.setAttribute('tabindex', '-1');
    el.scrollIntoView({ block: 'center', behavior: moving() ? 'smooth' : 'auto' });
    el.focus({ preventScroll: true });
    el.classList.add('ffw-found'); setTimeout(() => el.classList.remove('ffw-found'), 2600);
  }
  function focusH1(say = true) {
    const h1 = doc.querySelector('#view h1');
    if (h1) { if (!h1.hasAttribute('tabindex')) h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
    else { const v = doc.getElementById('view'); if (v) v.focus({ preventScroll: true }); }
    const r = route(), a = curArg();
    // Programmatic route changes (after a save, a sign-in) keep their own status message in the shared live region.
    if (say) announce(`${detailName(r, a, h1)}${r === 'home' ? '' : ' page'}`);
  }
  // Title card: the page name and that section's friend, on felt, for 250 ms of the turn.
  function titleCard(r, a) {
    const old = doc.getElementById('ffw-card'); if (old) old.remove();
    const slug = friendOf(r), img = new Image(); img.src = plushSrc(slug);
    const card = doc.createElement('div');
    card.id = 'ffw-card'; card.className = 'ffw-card'; card.setAttribute('aria-hidden', 'true');
    card.innerHTML = `${img.complete ? plush(slug, 76, 'ffw-card-img') : '<span class="ffw-card-dot"></span>'}<span class="ffw-card-name">${E(detailName(r, a, doc.querySelector('#view h1')))}</span>`;
    card.style.setProperty('--aud', AUD[(PAGES[r] || [])[1]] ? AUD[PAGES[r][1]].c : 'var(--gold)');
    doc.body.appendChild(card);
    return card;
  }
  const inView = el => { if (!el) return false; const b = el.getBoundingClientRect(); return b.bottom > 0 && b.top < innerHeight && b.width > 0; };
  const HERO_FRIEND = '.phero .art img, [class*="hero"] img[data-plush], .px-homehero img[data-plush]';
  let turning = false, turnN = 0, fromChrome = false;
  function afterRoute(prevKey, isUser) {
    const r = route(), a = curArg(), k = keyOf(r, a);
    const b = menuBtn(); if (b) b.setAttribute('aria-expanded', String(menu.open));
    renderNext();
    markCurrent();
    if (k !== prevKey) { recordHistory(); ensureBack(); focusH1(isUser !== false); }
    else if (fromChrome && (!doc.activeElement || doc.activeElement === doc.body)) focusH1();   // the current page chosen from the menu or search
    if (pendingReveal) afterUpdate(runReveal);
    if (W.FFNav) W.FFNav.viaHistory = false;
  }
  function install() {
    const inner = W.go;
    if (typeof inner !== 'function' || inner.__ffw) return;
    let pending = null;                                                // the latest request while a turn's update is still to run
    const wrapped = function (v, a) {
      const user = wantTurn || !!(W.FFNav && W.FFNav.viaHistory);       // Back/Forward is the visitor's own navigation too
      wantTurn = false;
      // A turn is waiting for its frame: the newest request replaces the queued one (a double click renders once, and a second
      // link clicked within that frame wins instead of being undone by the first).
      if (pending) { pending.self = this; pending.args = arguments; pending.user = pending.user || user; return; }
      const prevKey = keyOf(route(), curArg());
      const run = (self, args, isUser) => {
        fromChrome = menu.open || pal.open;
        if (menu.open) closeMenu({ returnFocus: false, animate: false, restore: false });
        if (pal.open) pal.close();
        const res = inner.apply(self, args);
        afterRoute(prevKey, isUser);
        return res;
      };
      const turn = user && moving() && typeof doc.startViewTransition === 'function' && doc.visibilityState === 'visible' && !turning;
      if (!turn) return run(this, arguments, user);
      // Old state: name the h1 and the hero friend (only if they are on screen, so nothing flies in from far away).
      const oldH1 = doc.querySelector('#view h1'), oldFriend = [...doc.querySelectorAll('#view ' + HERO_FRIEND.split(', ').join(', #view '))].find(inView);
      const named = [];
      const nameIt = (el, n) => { if (el) { el.style.viewTransitionName = n; named.push(el); } };
      if (inView(oldH1)) nameIt(oldH1, 'ffw-h1');
      nameIt(oldFriend, 'ffw-friend');
      const hadFriend = !!oldFriend, my = ++turnN;
      turning = true; root.classList.add('ffw-vt');
      pending = { self: this, args: arguments, user };
      let t, result;
      try {
        t = doc.startViewTransition(() => {
          const req = pending; pending = null;
          named.forEach(el => { el.style.viewTransitionName = ''; });
          try { result = run(req.self, req.args, req.user); } catch (e) { console.error(e); throw e; }   // never swallowed
          const vw = doc.getElementById('view'); if (vw) vw.classList.remove('px-routeenter');   // the turn replaces the old route fade
          const h1 = doc.querySelector('#view h1'), fr = hadFriend ? [...doc.querySelectorAll('#view ' + HERO_FRIEND.split(', ').join(', #view '))].find(inView) : null;
          nameIt(h1, 'ffw-h1'); nameIt(fr, 'ffw-friend');
          const card = titleCard(route(), curArg()); card.style.viewTransitionName = 'ffw-card'; named.push(card);
        });
      } catch (e) { const req = pending; pending = null; turning = false; root.classList.remove('ffw-vt'); return run(req.self, req.args, req.user); }
      const done = () => {
        if (my !== turnN) return;
        turning = false; root.classList.remove('ffw-vt');
        named.forEach(el => { el.style.viewTransitionName = ''; });
        const card = doc.getElementById('ffw-card'); if (card) card.remove();
        flushAfter();
      };
      t.finished.then(done, done);
      if (t.ready) t.ready.catch(() => {});
      if (t.updateCallbackDone) t.updateCallbackDone.catch(e => console.error('page turn', e));
      return result;
    };
    wrapped.__ffw = true;
    if (inner.__ffAnalytics) wrapped.__ffAnalytics = true;               // analytics.js already wraps inside; never wrap twice
    go = wrapped; W.go = wrapped;
  }
  // Installed once every script has run (DOMContentLoaded), so this is the outermost wrapper: premium.js (history + titles),
  // not-found.js (404 alias) and analytics.js (page views) all run inside the page turn, in the order they always have.
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', install); else install();

  // ---------------------------------------------------------------- 11. every render (route change or in-place re-render)
  function setHeadVar() { const h = doc.querySelector('header.bar'); if (h) root.style.setProperty('--ffw-head', h.offsetHeight + 'px'); }
  W.FFhooks = W.FFhooks || [];
  W.FFhooks.push(() => {
    ensureCrumbs(); ensureBack(); syncClose(); markCurrent(); renderNext();
    if (!hist.length) recordHistory();
  });
  // Partial re-renders inside #view (tabs, filters) can replace the hero: put the breadcrumbs back on the next frame.
  if (W.MutationObserver) {
    const v = doc.getElementById('view'); let q = 0;
    if (v) new MutationObserver(() => { if (q) return; q = requestAnimationFrame(() => { q = 0; ensureCrumbs(); syncClose(); }); }).observe(v, { childList: true, subtree: true });
  }

  // ---------------------------------------------------------------- start
  setHeadVar();
  applyAudience();
  // Warm the four title-card friends once the page is idle (small 480 files the site already uses).
  (W.requestIdleCallback || (fn => setTimeout(fn, 2500)))(() => ['booker', 'lumi', 'zuri', 'bop'].forEach(prefetch));
  reduceMQ.addEventListener && reduceMQ.addEventListener('change', () => { if (menu.open) renderMenuBody(); });

  W.FFWay = Object.freeze({ AUD, PAGES, MAIN, NEUTRAL, GROUPS, MORE, PORTALS, NEXT, TALK, palette, openMenu, closeMenu, menu: () => menu, crumbs: crumbsHTML, chainOf, detailName, backTarget, history: () => hist.slice(), index: () => (INDEX || (INDEX = buildIndex())) });
})();
