// R7 (independent review 2026-10-05): the purchase and use journey. Grouped navigation, the three audience doors under the Home
// hero, links to routes other wave-2 branches add (#unit-1, #what-you-get) that never land on a 404, the local pilot-center route,
// sample-data screenshots, keyboard and reduced-motion guarantees, and cache-busting.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { site, read, text, ROOT } = require('./site-vm');

function journey(extra) {
  const c = site({ before: { 'family-library-data.js': ctx => { if (extra) extra(ctx); } } });
  vm.runInContext(read('journey.js'), c, { filename: 'journey.js' });
  return c;
}
const premium = read('premium.js');
// Wave 6 NAV: the neutral main list is `const mainNav` in premium.js; the old "More" panel became the full-screen menu in
// wayfinding.js (GROUPS per audience + MORE + PORTALS). Read both straight from source, as before.
const mainNav = premium.slice(premium.indexOf('const mainNav='), premium.indexOf('];', premium.indexOf('const mainNav=')) + 2);
const way = read('wayfinding.js');
const block = name => { const i = way.indexOf(`const ${name} = `); return vm.runInNewContext('(' + way.slice(i + `const ${name} = `.length, way.indexOf(';\n', i)) + ')'); };
const GROUPS = JSON.parse(JSON.stringify(block('GROUPS'))), MORE_BY = JSON.parse(JSON.stringify(block('MORE_BY'))), PORTALS = JSON.parse(JSON.stringify(block('PORTALS')));
// Audience split (owner 2026-10-07): two audiences, each with its own big links and its own "More" list; portals are shared.
const moreGroups = [['Families', GROUPS.families], ['For centers & programs', GROUPS.centers], ['More for families', MORE_BY.families], ['More for centers & programs', MORE_BY.centers], ['Sign in', PORTALS]];
const routesIn = s => [...s.matchAll(/\['([a-z0-9-]+)','/g)].map(m => m[1]);
const hrefs = html => [...html.matchAll(/href="#([^"]+)"/g)].map(m => m[1]);

test('main nav is the families\' four topics by default; every earlier nav destination is still one click away (menu, per audience)', () => {
  assert.deepEqual(routesIn(mainNav), ['friends', 'family-videos', 'at-home', 'enroll']);
  assert.match(premium, /<nav id="nav" class="main px-main" aria-label="Main">\$\{mainNav\.map/, 'the header renders the families list until wayfinding.js applies the audience');
  const more = moreGroups.flatMap(([, items]) => items.map(i => i[0]));
  const before = ['curriculum', 'whole-child', 'teacher-standard', 'friends', 'at-home', 'watch', 'rainbow', 'academy', 'bop-at-home', 'hub', 'readiness', 'options', 'for-centers', 'train-your-staff', 'pricing', 'jobs', 'contact', 'enroll', 'support', 'signin-family', 'signin-teacher'];
  const reachable = new Set([...routesIn(mainNav), ...more, 'rainbow', 'watch', 'jobs', ...[...premium.matchAll(/link\('([a-z-]+)','(?:Visit our center|Sign in|Book a demo|Teacher Portal|Family Portal)/g)].map(m => m[1])]);
  for (const r of before.filter(r => !['rainbow', 'watch', 'jobs'].includes(r))) assert.ok(reachable.has(r), r + ' is still in the header or menu');
  for (const r of ['rainbow', 'watch', 'jobs']) assert.match(read('index.html'), new RegExp(`<a href="#${r}">`), r + ' is in the footer site map');
  // Wave 6: the old five More groups became three audience groups (3 to 5 big links each) plus "More" and the portal pills.
  for (const [, items] of moreGroups.slice(0, 2)) assert.ok(items.length >= 3 && items.length <= 6, 'audience groups stay scannable (3 to 6 links)');
  for (const [, items] of moreGroups) assert.ok(items.length >= 2 && items.length <= 24, 'groups stay scannable');
  // families never see the business pages in their menu
  for (const [r] of GROUPS.families.concat(MORE_BY.families)) assert.ok(!['pricing', 'options', 'room-kit', 'for-centers', 'impact', 'academy', 'shop-programs', 'quote'].includes(r), r);
  assert.match(way, /<section class="ffw-m-group[^`]*aria-labelledby="ffw-mg-\$\{k\}"/, 'each menu group is a labelled section for screen readers');
});

test('the pending #unit-1 route is hidden in the menu until it exists and never linked to a 404; R8 scope is an in-page jump', () => {
  // Wave 6: the menu is rebuilt each time it opens and lists only routes that exist (has()), so #unit-1 is hidden until it exists.
  assert.ok(moreGroups.flatMap(([, items]) => items).some(i => i[0] === 'unit-1'), 'the Unit 1 summary is in the centers menu');
  assert.match(way, /const links = list\.filter\(\(\[x\]\) => has\(x\)\)/, 'menu groups drop routes that do not exist');
  assert.match(way, /const has = r => typeof V\[r\] === 'function';/);
  assert.match(premium, /querySelectorAll\('\[data-ff-pending\]'\)\.forEach\(el=>\{el\.hidden=typeof V\[el\.dataset\.ffPending\]!=='function';\}\)/, 'go() re-checks on every route change');
  assert.match(read('journey.css'), /\[data-ff-pending\]\[hidden\]\{display:none!important\}/, 'hidden wins over the menu link display rule');
  const without = journey().window.FFJourney;
  assert.equal(without.route('unit-1'), 'curriculum');
  assert.match(without.provider('centers'), /href="#pricing">Package prices/);   // E9: no "all-in" headline language
  const withRoutes = journey(ctx => vm.runInContext("V['unit-1'] = () => 'u';", ctx)).window.FFJourney;
  assert.equal(withRoutes.route('unit-1'), 'unit-1');
  // wave 7 GATE: the route is the public summary, labelled "Unit 1 at a glance" (was "Unit 1 sample")
  assert.equal(withRoutes.label('unit-1'), 'Unit 1 at a glance');
  assert.match(withRoutes.provider('centers'), /href="#unit-1"/);
  assert.match(withRoutes.doors(), /<li>Unit 1 at a glance<\/li>/);
  // When R8's package section is on the audience page, step 2 jumps to it instead of leaving the page.
  const r8 = journey(ctx => vm.runInContext("{ const b = V['for-centers']; V['for-centers'] = () => b().replace('<section class=\"band-paper\">', '<section class=\"band-paper rt-sec\" id=\"rt-package\"></section><section class=\"band-paper\">'); }", ctx));
  const page = r8.render('for-centers');
  assert.match(page, /<button type="button" class="fj-textbtn" data-anchor="rt-package">What the package includes today/);
  assert.ok(page.indexOf('class="fj-provider"') < page.indexOf('id="rt-package"'));
});

test('the R7 door blocks keep their contract; on the wave-4 calm Home they are replaced by simple doors and their content lives on the audience pages', () => {
  // Wave 4 (owner 2026-10-06): Home shows three calm doors (home-calm.js, tests/w4-home.test.js). These detailed doors are no longer
  // rendered on Home; their lists, screenshots and family activity are on #for-centers / #for-home / #for-families (provider(), family()).
  const home = premium.slice(premium.indexOf('V.home=()=>'), premium.indexOf('function download('));
  assert.ok(home.indexOf('FFHomeCalm.body()') > home.indexOf('</section>'), 'the calm Home body comes straight after the hero');
  assert.doesNotMatch(home, /FFJourney\.doors\(\)|px-programband/, 'the detailed doors and the old program band are off Home');
  const c = journey(), doors = c.window.FFJourney.doors();
  const items = doors.split('<li class="fj-door"').slice(1);
  assert.equal(items.length, 3);
  for (const d of items) {
    assert.equal((d.match(/class="fj-go"/g) || []).length, 1, 'one primary action per door');
    assert.match(d, /<span class="fj-tag">Available now<\/span><ul>(<li>[^<]+<\/li>){3}<\/ul>/);
    assert.match(d, /class="fj-later">[^<]*(coming later|comes with)/);
  }
  assert.match(items[0], /href="#for-centers"/);
  assert.match(items[1], /href="#for-home"/);
  assert.match(items[2], /class="fj-go" href="#activities\/smell-the-flower"/, 'families get something to do tonight');
  assert.match(items[2], /Smell the Flower, Blow the Candle/);
  assert.match(items[2], /href="#enroll">Our pilot center<\/a>/, 'optional local-center connection');
  assert.match(text(items[2]), /5 read-along storybooks/);
  assert.match(doors, /href="#options">Pre-K, faith-based or employer program\? Compare all options/, 'the umbrella brand keeps its other audiences');
  assert.match(doors, /href="#signin-teacher">Teacher Portal: today's lesson<\/a>/, 'a returning teacher reaches today\'s lesson in one step');
});

test('every journey link resolves to a page that exists in this build (no 404 from the new blocks)', () => {
  const c = journey(), J = c.window.FFJourney;
  const ids = new Set(c.window.FFFamily.ACTS.map(a => a.id));
  const html = J.doors() + J.provider('centers') + J.provider('home') + J.family() + J.examples();
  for (const h of hrefs(html)) {
    const [r, a] = h.split('/');
    assert.equal(vm.runInContext(`typeof V[${JSON.stringify(r)}]`, c) === 'function' || ['signin-teacher', 'signin-family', 'support', 'hub', 'talk'].includes(r), true, h);
    if (r === 'activities' && a) assert.ok(ids.has(a), h);
  }
});

test('provider buyers get sample, delivered scope, implementation and support; families get the activity and the pilot center', () => {
  const c = journey();
  for (const [r, who] of [['for-centers', 'a center'], ['for-home', 'a home daycare']]) {
    const html = c.render(r);
    assert.ok(html.indexOf('class="fj-provider"') > html.indexOf('class="phero"') && html.indexOf('class="fj-provider"') < html.indexOf('<section class="band-paper">'), r + ': right after the page hero');
    const t = text(html);
    for (const s of ['See a real unit', 'Know what arrives', 'Start in four steps', 'Talk to a person', 'What exists today, for ' + who, 'not yet state-approved', 'proposed, owner to confirm']) assert.ok(t.includes(s), r + ': ' + s);
    assert.match(html, /href="tel:\+18169885661"/);
  }
  const fam = c.render('for-families');
  assert.ok(fam.indexOf('id="fj-fam-h"') > fam.indexOf('Open the family library'), 'after the free library call to action');
  assert.match(text(fam), /Futures Friends is piloting at Futures Learning Center in Independence, Missouri\. Call for the ages served right now and current hours\./);
});

test('local-center route says "piloting" and makes no licensed, infant or hours claims', () => {
  const c = journey();
  const enroll = text(c.render('enroll')), fam = text(c.window.FFJourney.family()), doors = text(c.window.FFJourney.doors());
  assert.match(enroll, /piloting here first, at our flagship center in Independence, Missouri\. Call for the ages we serve right now and current hours/);
  assert.match(enroll, /Ask which ages and rooms are open now/);
  assert.match(enroll, /piloting here, so call \(816\) 988-5661 for the ages and rooms open right now/, 'the FAQ agrees with the hero');
  for (const t of [fam, doors]) {
    assert.doesNotMatch(t, /licensed|infant|\b\d{1,2}(:\d{2})?\s*(AM|PM)\b|7:00/i);
  }
  assert.doesNotMatch(enroll, /\b7:00 AM to 6:00 PM\b/);
});

test('real screenshots are labelled "Sample data", described, sized and lazy; the files exist', () => {
  const J = journey().window.FFJourney;
  const html = J.examples() + J.doors() + J.provider('centers') + J.family();
  const figs = html.split(/<figure /).slice(1);
  assert.ok(figs.length >= 7);
  for (const f of figs) {
    assert.match(f, /data-sample="true"/);
    assert.match(f, /<span class="fj-sample">Sample data<\/span>/);
    assert.match(f, /<img src="img\/journey\/[a-z-]+-(600|1200)\.webp" srcset="[^"]+" sizes="[^"]+" width="\d+" height="\d+" alt="[^"]{40,}" loading="lazy"/);
  }
  for (const k of Object.keys(J.SHOTS)) for (const f of [J.SHOTS[k].sm, J.SHOTS[k].lg]) assert.ok(fs.existsSync(path.join(ROOT, f)), f);
  assert.match(text(J.examples()), /made up/);
});

test('keyboard: skip link first, the full-screen menu returns focus on Escape, route changes focus the new h1', () => {
  const html = read('index.html');
  assert.ok(html.indexOf('<a class="ff-skip" href="#view" data-skip>Skip to main content</a>') < html.indexOf('<header class="bar">'));
  assert.match(premium, /if\(t\.hasAttribute\('data-skip'\)\)\{e\.preventDefault\(\);const main=document\.getElementById\('view'\);main\.focus\(\)/, 'skip link focuses <main> without changing the route');
  // Wave 6: the More panel and phone dropdown became one modal menu (wayfinding.js); behaviour is proven in a real browser in
  // tests/a11y-keyboard.test.js and tests/w6-nav.test.js. Here: the source keeps the contract.
  assert.match(premium, /id="menuT"[^>]*aria-haspopup="dialog" aria-expanded="false" aria-controls="ffw-menu"/, 'the Menu button names the menu it opens');
  assert.match(way, /menu\.addEventListener\('cancel', e => \{ e\.preventDefault\(\); closeMenu\(\); \}\)/, 'Escape closes the menu');
  assert.match(way, /if \(o\.returnFocus !== false && lastTrigger && lastTrigger\.isConnected\) lastTrigger\.focus/, 'focus returns to the button that opened it');
  assert.match(way, /menu\.querySelector\('\.ffw-m-close'\)\.focus\(\)/, 'opening the menu moves focus into it');
  assert.match(way, /function focusH1\(/, 'route changes focus the new h1');
  const css = read('journey.css');
  assert.match(css, /\.ff-skip:focus\{top:10px/);
  assert.match(css, /\.px-homehero :focus-visible[^{]*\{outline-color:#F5C553\}/, 'gold focus ring on the navy hero');
});

test('reduced motion: journey motion is hover-only and gated on the device setting AND the site switch; no new animation libraries', () => {
  const css = read('journey.css'), js = read('journey.js');
  assert.doesNotMatch(css, /@keyframes|animation:/);
  const outside = css.replace(/@media \(prefers-reduced-motion:no-preference\)\{[\s\S]*?\n\}/, '');
  assert.doesNotMatch(outside, /transition:|transform:translate/, 'every transition and movement sits inside the no-preference block');
  assert.match(css, /@media \(prefers-reduced-motion:no-preference\)\{\s*:root:not\(\[data-motion=off\]\) \.fj-door\{transition/);
  assert.doesNotMatch(js, /gsap|Lenis|requestAnimationFrame|animate\(/);
});

test('journey.js sends nothing, stores nothing and loads nothing from outside the site', () => {
  const js = read('journey.js');
  assert.doesNotMatch(js, /fetch\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|https?:\/\//);
});

test('Home hero keeps the identity and uses the pillar line; the logo reveal moved out of the hero', () => {
  const hero = premium.slice(premium.indexOf('V.home=()=>'), premium.indexOf('${window.FFHomeCalm'));
  assert.match(hero, /<p>Learn\. Move\. Explore\. Belong\.<\/p>/);
  assert.doesNotMatch(hero, /Read\. Move\./);
  assert.match(hero, /link\('at-home','Free stories and activities '\+icon\('ArrowRight'\),'px-btn px-primary'\)/, 'yellow button kept; Home is the families\' front door (audience split), so it opens the free library');
  assert.match(hero, /window\.FFArt\.homeStage\(\)/, 'four dimensional friends kept');
  assert.doesNotMatch(hero, /data-brand-reveal/);
  assert.match(read('home-calm.js'), /class="ff-brand-trigger hc-reveal" data-brand-reveal/, 'logo reveal still on Home, in the closing band');
  assert.match(read('home-calm.js'), /class="ff-brand-trigger fj-reveal" data-brand-reveal/, 'and on the Academy band, now on #teacher-standard');
});

test('navigation never calls the training ladder a certification (R8 wording)', () => {
  const html = read('index.html');
  assert.match(html, /<li><a href="#training">Training path \(in development\)<\/a><\/li>/, 'footer site map (wave 6: real links)');
  assert.doesNotMatch(html + premium, /Certification Ladder/);
});

test('index.html loads journey files with cache-busting, after the views and family data, before the 404 view', () => {
  const html = read('index.html');
  const v = f => +((html.match(new RegExp(f.replace('.', '\\.') + '\\?v=(\\d+)')) || [])[1] || 0);
  assert.ok(v('journey.js') >= 1 && v('journey.css') >= 1 && v('premium.js') >= 15 && v('features.js') >= 20);
  const at = f => html.indexOf(`<script src="${f}?v=`);
  assert.ok(at('journey.js') > at('views.js') && at('journey.js') > at('family-library-data.js') && at('journey.js') > at('whole-child.js') && at('journey.js') < at('not-found.js'));
});
