/* Futures Friends: the purchase and use journey (independent review 2026-10-05, ticket R7).
   - doors(): the three audience choices that sit right under the Home hero. Each has ONE primary action, a visibly scoped
     "available now" offer and an honest "coming later" line. The family door carries a real activity a parent can do tonight
     (from the Futures at Home library) and an optional link to the pilot center in Independence, Missouri.
   - examples(): real screenshots of the task each visitor came for (Teacher Portal "Today", the director's "What's due",
     the Family Portal day), every one labelled "Sample data" because the records in them are synthetic.
   - provider(kind): "See it, scope it, start it" for center and home daycare buyers: the sample unit, what arrives, how starting
     works and a person to call. Injected into #for-centers and #for-home without editing views.js.
   - family(): "Try one tonight" plus the optional center connection, injected into #for-families.
   #unit-1 (branch wave2-unit1) is linked by id through route()/label(): until the route exists in this build the link points at
   the nearest page that exists today, so nothing lands on a 404, and it upgrades by itself once merged. R8's package scope
   (branch wave2-truth) is an in-page section (#rt-package) that step 2 of the provider block jumps to when it is present. Sends nothing, stores nothing, loads nothing from outside the site. Loaded after views.js and the family
   library data; everything is read at render time. */
(function () {
  'use strict';
  if (typeof V === 'undefined') return;
  const E = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const icon = name => `<svg class="px-icon" aria-hidden="true"><use href="img/ui-icons.svg#${name}"></use></svg>`;
  const cut = k => window.FFPlush.img(k, { alt: '', h: 156 });   // plush library art (plush-cast.js), true intrinsic size
  const phone = () => (typeof PHONE === 'string' ? PHONE : '(816) 988-5661');
  const tel = () => 'tel:+1' + phone().replace(/\D/g, '');

  // Routes being built on other wave-2 branches. Keep ids in sync with those branches (listed in docs/ux/JOURNEY_REVIEW.md).
  const PENDING = {
    'unit-1': { label: 'Unit 1 at a glance', fallback: 'curriculum', fallbackLabel: 'The learning year, week by week' }
  };
  // R8 (branch wave2-truth) adds no route: it adds a "What the package includes today" section, id="rt-package", to the audience
  // pages. When that section is on the page, step 2 jumps to it; until then step 2 links to the published prices.
  const SCOPE_ANCHOR = 'rt-package';
  const has = r => typeof V[r] === 'function';
  const route = id => (PENDING[id] && !has(id) ? PENDING[id].fallback : id);
  const label = id => (PENDING[id] ? (has(id) ? PENDING[id].label : PENDING[id].fallbackLabel) : id);

  // The activity a family can do tonight: short, no materials, every age from toddlers to pre-K.
  const TONIGHT = 'smell-the-flower';
  function tonight() {
    const F = window.FFFamily;
    const a = F && Array.isArray(F.ACTS) ? F.ACTS.find(x => x.id === TONIGHT) : null;
    return a || null;
  }
  function libraryCounts() {
    const F = window.FFFamily || {};
    const acts = (F.ACTS || []).filter(a => a.id.indexOf('prev-') !== 0).length;
    const books = (F.BOOKS || []).filter(b => b.status === 'full').length;
    return { acts, books };
  }

  const DOORS = [
    {
      id: 'centers', k: 'booker', c: '#2F6FC0', who: 'For a classroom or center', h: 'Run the program in your rooms',
      now: () => [label('unit-1'), 'Published package prices before tax', 'Sample Teacher Portal'],
      later: 'Online ordering, printed books and finished episodes are coming later.',
      go: ['for-centers', 'See what a center gets'], shot: ['director', 'What a director sees: what is due, and the rule behind it']
    },
    {
      id: 'home', k: 'zuri', c: '#23814B', who: 'For a home daycare', h: 'One room, mixed ages',
      now: () => [label('unit-1'), 'Published package prices before tax', 'Sample Teacher Portal'],
      later: 'Online ordering and the home welcome box are coming later.',
      go: ['for-home', 'See the home daycare plan'], shot: ['teacher', 'Your day on one screen: lesson, checklist, lunch, who is here']
    },
    {
      id: 'families', k: 'lumi', c: '#B52D71', who: 'For families', h: 'Something to do tonight',
      now: () => { const n = libraryCounts(); return [n.books ? `${n.books} read-along storybooks` : 'Read-along storybooks', n.acts ? `${n.acts} activities by age` : 'Activities by age', 'Printables, free, no account']; },
      later: 'The Family Portal comes with a Futures Friends center.',
      go: ['activities/' + TONIGHT, 'Try it tonight: 3 minutes']
    }
  ];

  function door(d) {
    const a = d.id === 'families' ? tonight() : null;
    const go = a ? d.go : (d.id === 'families' ? ['at-home', 'Open the free family library'] : d.go);
    return `<li class="fj-door" style="--c:${d.c}">
      <div class="fj-doorart" aria-hidden="true">${cut(d.k)}</div>
      <p class="fj-who">${E(d.who)}</p><h3>${E(d.h)}</h3>
      ${a ? `<div class="fj-tonight"><b>${E(a.t)}</b><span>${(t => t % 60 ? (t < 60 ? t + ' seconds' : Math.floor(t / 60) + ' min ' + (t % 60) + ' sec') : t / 60 + ' minutes')(Math.round(a.min * 60))}, nothing to buy. ${E(a.say)}</span></div>` : ''}
      <div class="fj-now"><span class="fj-tag">Available now</span><ul>${d.now().map(x => `<li>${E(x)}</li>`).join('')}</ul></div>
      <p class="fj-later">${E(d.later)}</p>
      <a class="fj-go" href="#${go[0]}">${E(go[1])} ${icon('ArrowRight')}</a>
      ${d.shot ? thumb(d.shot[0], d.shot[1]) : ''}
      ${d.id === 'families' ? `<p class="fj-local">Looking for child care near Independence, Missouri? <a href="#enroll">Our pilot center</a></p>` : ''}
    </li>`;
  }

  function doors() {
    return `<section class="fj-doors" id="fj-doors" aria-labelledby="fj-doors-h"><div class="wrap">
      <div class="fj-doorshead"><h2 id="fj-doors-h">Who are you choosing for?</h2><a class="fj-compare" href="#options">Pre-K, faith-based or employer program? Compare all options ${icon('ArrowRight')}</a></div>
      <ul class="fj-doorlist">${DOORS.map(door).join('')}</ul>
      <p class="fj-back">Already with a Futures Friends program? <a href="#signin-teacher">Teacher Portal: today's lesson</a><span aria-hidden="true"> / </span><a href="#signin-family">Family Portal</a> <span class="fj-muted">(sample previews until your center invites you)</span></p>
    </div></section>`;
  }

  const SHOTS = {
    teacher: { sm: 'img/journey/teacher-today-600.webp', lg: 'img/journey/teacher-today-1200.webp', w: 1200, h: 622, alt: 'Teacher Portal Today screen: the lesson My Name, My Story with Booker, today\'s focus, episode, books and take-home; a checklist of the day starting with 7:00 arrival; today\'s lunch; and five children to mark here or absent.', cap: 'Teacher Portal, "Today": the lesson, the day\'s checklist, lunch and who is here, on one screen.', link: ['signin-teacher', 'Open the sample Teacher Portal'] },
    director: { sm: 'img/journey/director-due-600.webp', lg: 'img/journey/director-due-1200.webp', w: 1200, h: 398, alt: 'Director What\'s due screen: counts of overdue items and items due in 7, 30 and 90 days, and one overdue background-check item for a test staff member with the Kansas rule it comes from.', cap: 'Director, "What\'s due": each item names the state rule it comes from, with an inspection binder to print.', link: ['hub', 'How the Futures Hub works'] },
    family: { sm: 'img/journey/family-day-600.webp', lg: 'img/journey/family-day-1200.webp', w: 1200, h: 368, alt: 'Family Portal day screen for a sample child: attendance, lesson, today\'s focus, read-aloud and a question to ask at dinner; what the child ate at breakfast, lunch and snack; and this week\'s take-home activity.', cap: 'Family Portal, the day at home: the lesson, what was served, a question for dinner and the take-home.', link: ['signin-family', 'Open the sample Family Portal'] }
  };
  function shot(key, opts = {}) {
    const s = SHOTS[key];
    return `<figure class="fj-shot" data-sample="true"><div class="fj-shotframe"><span class="fj-sample">Sample data</span>
      <img src="${s.lg}" srcset="${s.sm} 600w, ${s.lg} 1200w" sizes="(max-width: 900px) 92vw, ${opts.sizes || '560px'}" width="${s.w}" height="${s.h}" alt="${E(s.alt)}" loading="lazy" decoding="async"></div>
      <figcaption>${E(s.cap)} <span class="fj-muted">Screenshot of the preview with made-up children and staff.</span>${opts.link === false ? '' : ` <a href="#${s.link[0]}">${E(s.link[1])}</a>`}</figcaption></figure>`;
  }

  function thumb(key, cap) {
    const s = SHOTS[key];
    return `<figure class="fj-thumb" data-sample="true"><span class="fj-sample">Sample data</span><img src="${s.sm}" srcset="${s.sm} 600w, ${s.lg} 1200w" sizes="(max-width: 900px) 88vw, 340px" width="${s.w}" height="${s.h}" alt="${E(s.alt)}" loading="lazy" decoding="async"><figcaption>${E(cap)}</figcaption></figure>`;
  }

  function examples() {
    return `<section class="fj-examples" aria-labelledby="fj-ex-h"><div class="wrap">
      <div class="fj-exhead"><h2 id="fj-ex-h">See the actual screens</h2><p>Not mock-ups: these are the preview screens a teacher, a director and a family use today. The children and staff in them are made up.</p></div>
      <div class="fj-exgrid">${shot('teacher', { sizes: '640px' })}<div class="fj-exstack">${shot('director')}${shot('family')}</div></div>
    </div></section>`;
  }

  function provider(kind, scope = false) {
    const home = kind === 'home';
    const unit = has('unit-1');
    const steps = [
      ['BookOpen', 'See a real unit', unit ? 'The first month in summary: four weeks, a day in six steps and three age versions. Licensed centers receive the full plans; see a sample day on the summary.' : 'Browse the learning year week by week. Unit 1 is packaged as a draft.', route('unit-1'), label('unit-1')],
      ['LayoutDashboard', 'Know what arrives', scope ? 'Every item in the package, marked available now, in development or coming later. Prices are proposed, owner to confirm.' : 'Every package price published before tax. Prices are proposed, owner to confirm, and online ordering opens soon.', scope ? '' : 'pricing', scope ? 'What the package includes today' : 'Package prices'],
      ['CalendarDays', 'Start in four steps', home ? 'A call about your room and ages, the home welcome box, training for you and your assistants, then Unit 1 with your families.' : 'A call to match your rooms and ages, the welcome box, Level 1 training for every staff member, then Unit 1 with a family night.', 'options', 'How starting works'],
      ['Heart', 'Talk to a person', `Call ${phone()} about ${home ? 'your room' : 'your rooms'}, ages, training or support. Training courses are in development and not yet state-approved.`, 'support', 'Support and answers']
    ];
    return `<section class="fj-provider" aria-labelledby="fj-pv-h"><div class="wrap">
      <div class="fj-exhead"><h2 id="fj-pv-h">See it, scope it, start it</h2><p>What exists today, for ${home ? 'a home daycare' : 'a center'}. Anything still in production says so.</p></div>
      <ol class="fj-steps">${steps.map(([i, h, p, r, l], n) => `<li><span class="fj-num" aria-hidden="true">${n + 1}</span>${icon(i)}<h3>${E(h)}</h3><p>${E(p)}</p>${n === 3 ? `<a href="${tel()}">Call ${E(phone())}</a> <a href="#${r}">${E(l)}</a>` : r ? `<a href="#${r}">${E(l)} ${icon('ArrowRight')}</a>` : `<button type="button" class="fj-textbtn" data-anchor="${SCOPE_ANCHOR}">${E(l)} ${icon('ChevronDown')}</button>`}</li>`).join('')}</ol>
      <div class="fj-exgrid fj-two">${shot('teacher', { sizes: '560px' })}${shot('director')}</div>
    </div></section>`;
  }

  // Wave 5: the friend's story-world grown-up shows the activity happens at home too (labelled "Story-world character").
  const PARENT = { booker: 'bruno', lumi: 'rose', zuri: 'sage', bop: 'ella' };
  function homeGuide(k) {
    const S = window.FFSupporting, p = PARENT[k];
    if (!S || !S.guide || !p) return '';
    return S.guide(p, `In the story world, ${S.profile(p).name} and ${(window.CH && CH[k] && CH[k].n) || 'Lumi'} try this one at home, too.`, { with: k === 'lumi' ? 'lumi-calm-breath' : k, cls: 'fj-homeguide' });
  }
  function family() {
    const a = tonight();
    return `<section class="fj-provider fj-family" aria-labelledby="fj-fam-h"><div class="wrap">
      <div class="fj-exhead"><h2 id="fj-fam-h">Try one tonight</h2><p>Free, no account, nothing to buy.</p></div>
      <div class="fj-famgrid">
        ${a ? `<article class="fj-act" style="--c:#B52D71"><p class="fj-who">${(t => t % 60 ? (t < 60 ? t + ' seconds' : Math.floor(t / 60) + ' min ' + (t % 60) + ' sec') : t / 60 + ' minutes')(Math.round(a.min * 60))}, with ${E((window.CH && CH[a.c] && CH[a.c].n) || 'Lumi')}</p><h3>${E(a.t)}</h3><p><b>You need:</b> ${E(a.mat.join(', '))}</p><ol>${a.steps.map(s => `<li>${E(s)}</li>`).join('')}</ol><p class="fj-muted">${E(a.safety)}</p>${homeGuide(a.c)}<a class="fj-go" href="#activities/${E(a.id)}">Print it or find more for your child's age ${icon('ArrowRight')}</a></article>` : `<article class="fj-act"><h3>Futures at Home</h3><p>Storybooks, activities by age and printables.</p><a class="fj-go" href="#at-home">Open the free family library ${icon('ArrowRight')}</a></article>`}
        <div class="fj-center"><h3>With a Futures Friends center, the day comes home</h3>${shot('family', { sizes: '520px', link: false })}<p>Futures Friends is piloting at Futures Learning Center in Independence, Missouri. Call for the ages served right now and current hours.</p><a class="fj-go" href="#enroll">Visit the pilot center ${icon('ArrowRight')}</a></div>
      </div>
    </div></section>`;
  }

  // Inject into existing pages without editing their source files.
  // End of the page hero (the leading <div class="phero"> block), found by counting nested divs; -1 if the page has no phero.
  function heroEnd(html) {
    if (html.indexOf('<div class="phero"') !== 0) return -1;
    const re = /<div\b|<\/div>/g; let depth = 0, m;
    while ((m = re.exec(html))) { depth += m[0] === '</div>' ? -1 : 1; if (depth === 0) return m.index + 6; }
    return -1;
  }
  ['for-centers', 'for-home'].forEach(r => {
    const base = V[r]; if (typeof base !== 'function') return;
    V[r] = function () { const html = base.apply(this, arguments), i = heroEnd(html), block = provider(r === 'for-home' ? 'home' : 'centers', html.indexOf(`id="${SCOPE_ANCHOR}"`) >= 0); return i < 0 ? block + html : html.slice(0, i) + block + html.slice(i); };
  });
  const fam = V['for-families'];
  if (typeof fam === 'function') V['for-families'] = function () {
    const html = fam.apply(this, arguments), i = html.indexOf('href="#at-home"'), end = i < 0 ? -1 : html.indexOf('</section>', i);
    return end < 0 ? html + family() : html.slice(0, end + 10) + family() + html.slice(end + 10);
  };

  window.FFJourney = { heroEnd, doors, examples, thumb, provider, family, route, label, PENDING, SCOPE_ANCHOR, DOORS, SHOTS, TONIGHT };
})();
