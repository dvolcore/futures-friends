// Wave 6 lane NAV (owner 2026-10-06: "no one getting lost on the website when it comes to parents, clients and the employees").
// Site-wide wayfinding in wayfinding.js: page turns with focus on the new h1, the audience switcher, the full-screen felt menu,
// the search palette, breadcrumbs on every route, the back chip, the context card, the closing band and the footer site map.
// Static checks in a VM, then real headless Chromium at 1280 and 390 px (harness as tests/a11y.test.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { read } = require('./site-vm');

const way = read('wayfinding.js');
const block = name => { const i = way.indexOf(`const ${name} = `); return JSON.parse(JSON.stringify(vm.runInNewContext('(' + way.slice(i + `const ${name} = `.length, way.indexOf(';\n', i)) + ')', { PHONE: '(816) 988-5661' }))); };

// ---------------------------------------------------------------- static contract
test('audience link sets: two audiences, at most five header links each, three to six big links per menu group, every route exists', () => {
  const MAIN = block('MAIN'), GROUPS = block('GROUPS'), PAGES = block('PAGES'), MORE_BY = block('MORE_BY');
  const routes = Object.keys(require('../route-meta.js').ROUTES);
  // audience split (owner 2026-10-07): Families (default) and For Centers & Programs; the old staff audience folded into centers
  assert.deepEqual(Object.keys(MAIN), ['families', 'centers']);
  for (const k of Object.keys(MAIN)) {
    assert.ok(MAIN[k].length >= 3 && MAIN[k].length <= 5, `${k}: ${MAIN[k].length} header links`);
    assert.ok(GROUPS[k].length >= 3 && GROUPS[k].length <= 6, `${k}: ${GROUPS[k].length} menu links`);
    for (const [r] of MAIN[k].concat(GROUPS[k])) assert.ok(routes.includes(r), `${r} is a real route`);
  }
  // families never see a business page in their header, menu or "More"
  for (const [r] of MAIN.families.concat(GROUPS.families, MORE_BY.families)) assert.equal(PAGES[r][1] === 'centers', false, `${r} is not a centers page`);
  for (const [r] of MAIN.centers.concat(GROUPS.centers)) assert.equal(PAGES[r][1], 'centers', r);
  for (const r of routes) assert.ok(PAGES[r], `${r} has a short name, audience and parent for breadcrumbs`);
  for (const r of ['pricing', 'options', 'room-kit', 'for-centers', 'for-home', 'for-faith', 'impact', 'academy', 'shop-programs', 'quote', 'centers', 'book-demo', 'curriculum', 'unit-1']) assert.equal(PAGES[r][1], 'centers', r);
  for (const r of ['home', 'enroll', 'at-home', 'story-time', 'family-videos', 'friends', 'kids-shop', 'signin-family']) assert.equal(PAGES[r][1], 'families', r);
  for (const [r, [, aud, parent]] of Object.entries(PAGES)) {
    assert.ok(['', 'families', 'centers', 'portal'].includes(aud), r);
    if (r !== 'home') assert.ok(PAGES[parent], `${r}: parent ${parent} is mapped`);
  }
});

test('context card copy stays honest: no hours, licensed or infant claims; a tour only where #enroll already books one', () => {
  const NEXT = block('NEXT'), all = Object.values(NEXT).flat().concat([block('TALK')]);
  for (const [r, title, sub] of all) {
    assert.doesNotMatch(title + ' ' + sub, /\blicensed\b|infant|\b\d{1,2}(:\d\d)?\s?(a\.?m\.?|p\.?m\.?)\b|open (daily|now)/i, title);
    if (/tour/i.test(sub)) assert.equal(r, 'enroll', 'tours are only offered where the tour booking lives');
  }
  assert.match(require('./site-vm').site().render('enroll'), /[Tt]our/, '#enroll really offers tours (tour-booking.js books a time when the gateway is on)');
});

test('wiring: wayfinding.js after premium.js and before a11y.js; not-found.js then analytics.js last; cache-bust present', () => {
  const html = read('index.html'), at = s => html.indexOf(s);
  assert.ok(at('premium.js?v=') < at('wayfinding.js?v=') && at('wayfinding.js?v=') < at('a11y.js?v='));
  assert.ok(at('a11y.js?v=') < at('not-found.js?v=') && at('not-found.js?v=') < at('analytics.js?v=') && at('analytics.js?v=') < at('window.FFstart'));
  assert.ok(+/wayfinding\.js\?v=(\d+)/.exec(html)[1] >= 1 && +/wayfinding\.css\?v=(\d+)/.exec(html)[1] >= 1);
  assert.ok(+/premium\.js\?v=(\d+)/.exec(html)[1] >= 19, 'premium.js changed, so its ?v= moved on');
  assert.ok(+/views\.js\?v=(\d+)/.exec(html)[1] >= 37, 'views.js changed, so its ?v= moved on');
  // the HERO lane's insertion point sits directly above the footer, after the closing band
  assert.ok(at('id="ffw-close"') < at('id="ff-prefooter"') && at('id="ff-prefooter"') < at('<footer>'));
  // the footer is a site map grouped by audience, with real links, and keeps every earlier destination
  const map = html.slice(at('<nav class="ffw-sitemap"'), html.indexOf('</nav>', at('<nav class="ffw-sitemap"')));
  for (const k of ['families', 'centers', 'help']) assert.match(map, new RegExp(`data-aud="${k}"`));
  assert.match(map, /class="ffw-cross" data-for="families"><a href="#centers"/, 'the families footer has the quiet "Run a center or program?" link');
  assert.match(map, /class="ffw-cross" data-for="centers"><a href="#home"[^>]*>See what families experience/, 'centers link back to the family side');
  const linked = [...html.slice(at('<footer>')).matchAll(/href="#([a-z0-9-]+)"/g)].map(m => m[1]);
  for (const r of ['curriculum', 'readiness', 'include', 'friends', 'rainbow', 'academy', 'training', 'watch', 'summit', 'enroll', 'impact', 'options', 'for-centers', 'for-home', 'for-prek', 'for-faith', 'for-employers', 'for-families', 'at-home', 'app', 'family-guide', 'store', 'funding', 'blog', 'news', 'events', 'why', 'support', 'jobs', 'contact', 'privacy', 'child-privacy', 'terms', 'accessibility', 'teacher-standard', 'train-your-staff', 'whole-child', 'bop-at-home'])
    assert.ok(linked.includes(r), `footer still links #${r}`);
  assert.match(html, /A program of Futures Learning Center/);
  assert.doesNotMatch(html, /Futures Daycare Center/);
});

test('the public audience hook is documented and stores nothing but the choice (try/catch); nothing is sent', () => {
  assert.match(way, /W\.FFAudience = Object\.freeze\(\{/);
  for (const k of ['list:', 'labels:', 'get:', 'set:', 'clear:', 'links:', 'on:']) assert.ok(way.includes(k), k);
  assert.match(way, /new CustomEvent\('ff:audience'/);
  assert.doesNotMatch(way, /\bfetch\(|XMLHttpRequest|sendBeacon|https?:\/\//);
  assert.match(way, /get\(k, s\) \{ try \{/);
});

// ---------------------------------------------------------------- real browser
const H = () => import('./a11y-harness.mjs');
let h, site, browser;
test.before(async () => { h = await H(); site = await h.startSite(); browser = await h.loadChromium().launch(); });
test.after(async () => { await browser.close(); await site.close(); });
const noise = e => !/Failed to load resource/.test(e);

for (const width of [1280, 390]) {
  test(`page turns (${width}px): reduced motion swaps instantly, no View Transitions support swaps instantly, motion on morphs; focus lands on the new h1`, async () => {
    // 1. reduced motion (the harness default): no transition is started, focus moves to the new h1, the page is announced
    let { ctx, page, errors } = await h.open(browser, width);
    await h.goto(page, site.base, 'friends');
    await page.evaluate(() => { window.__vt = 0; const o = document.startViewTransition; document.startViewTransition = function () { window.__vt++; return o.apply(document, arguments); }; });
    await page.click(width > 900 ? '.px-main a[href="#at-home"]' : '#ffw-close a[href="#contact"]');
    await page.waitForTimeout(250);
    let f = await page.evaluate(() => ({ vt: window.__vt, tag: document.activeElement.tagName, inView: !!document.activeElement.closest('#view'), live: (document.getElementById('ff-announce') || {}).textContent, routeenter: document.getElementById('view').classList.contains('px-routeenter') }));
    assert.equal(f.vt, 0, 'no view transition with reduced motion');
    assert.equal(f.tag, 'H1'); assert.ok(f.inView, 'focus is on the new page heading');
    assert.match(f.live, /page$/, 'the page name is announced politely');
    assert.deepEqual(errors.filter(noise), []);
    await ctx.close();
    // 2. motion on, but a browser without View Transitions: the same instant swap
    ({ ctx, page, errors } = await h.open(browser, width, { motion: true }));
    await page.addInitScript(() => { delete Document.prototype.startViewTransition; });
    await h.goto(page, site.base, 'pricing');
    await page.click('#ffw-close a[href="#contact"]');
    await page.waitForTimeout(150);
    f = await page.evaluate(() => ({ hash: location.hash, tag: document.activeElement.tagName, h1: document.querySelector('#view h1').textContent, card: !!document.getElementById('ffw-card') }));
    assert.equal(f.hash, '#contact'); assert.equal(f.tag, 'H1'); assert.equal(f.card, false);
    assert.deepEqual(errors.filter(noise), []);
    await ctx.close();
    // 3. motion on with View Transitions: the turn runs, the h1 is named for the morph, the title card shows and is gone after; <= 350 ms of animation
    ({ ctx, page, errors } = await h.open(browser, width, { motion: true }));
    await h.goto(page, site.base, 'friends', 700);
    await page.evaluate(() => { window.__t = []; const o = document.startViewTransition.bind(document); document.startViewTransition = cb => { const t = o(() => { cb(); window.__named = [...document.querySelectorAll('*')].filter(e => e.style && e.style.viewTransitionName).map(e => e.style.viewTransitionName); window.__card = document.getElementById('ffw-card') && document.getElementById('ffw-card').textContent; }); t.ready.then(() => window.__t.push(performance.now())); t.finished.then(() => window.__t.push(performance.now())); return t; }; });
    await page.click(width > 900 ? '.px-main a[href="#at-home"]' : '#ffw-close a[href="#contact"]');
    await page.waitForFunction(() => window.__t.length === 2, null, { timeout: 4000 });
    await page.waitForTimeout(60);
    f = await page.evaluate(() => ({ anim: window.__t[1] - window.__t[0], named: window.__named, card: window.__card, cardAfter: !!document.getElementById('ffw-card'), vtClass: document.documentElement.classList.contains('ffw-vt'), tag: document.activeElement.tagName, left: [...document.querySelectorAll('[style*="view-transition-name"]')].length }));
    assert.ok(f.named.includes('ffw-h1') && f.named.includes('ffw-card'), `named for the turn: ${f.named}`);
    assert.ok(f.card && f.card.length > 2, 'the title card names the page');
    assert.ok(f.anim <= 380, `animation ${Math.round(f.anim)} ms (CSS total 330 ms, plus a frame)`);
    assert.equal(f.cardAfter, false, 'the title card is removed'); assert.equal(f.vtClass, false); assert.equal(f.left, 0, 'no element keeps a transition name');
    assert.equal(f.tag, 'H1', 'focus on the new h1 after the turn');
    assert.deepEqual(errors.filter(noise), []);
    await ctx.close();
    // 4. the site's own motion switch turns page turns off too
    ({ ctx, page, errors } = await h.open(browser, width, { motion: true }));
    await page.addInitScript(() => { try { localStorage.setItem('ff-display-preferences', JSON.stringify({ motion2: false })); } catch (_) {} });
    await h.goto(page, site.base, 'friends');
    await page.evaluate(() => { window.__vt = 0; const o = document.startViewTransition; document.startViewTransition = function () { window.__vt++; return o.apply(document, arguments); }; });
    await page.click('#ffw-close a[href="#contact"]'); await page.waitForTimeout(150);
    assert.equal(await page.evaluate(() => window.__vt), 0, 'data-motion="off" means no page turn');
    await ctx.close();
  });

  test(`audience switcher (${width}px): families by default; Centers goes to #centers and swaps header and footer, persists, announces; routes pick their side; the hook works`, async () => {
    const { ctx, page, errors } = await h.open(browser, width);
    await h.goto(page, site.base, 'home');
    assert.equal(await page.evaluate(() => document.documentElement.dataset.audience), 'families', 'families by default');
    assert.deepEqual(await page.$$eval('.px-main a', as => as.map(a => a.getAttribute('href'))), ['#friends', '#family-videos', '#at-home', '#enroll'], 'the families nav');
    assert.equal(await page.locator('.px-utility a.ffw-signin[href="#sign-in"]').count(), 1, 'Sign in sits beside the two audiences');
    await page.click('.px-utility .ffw-audbtn[data-audience="centers"]');
    await page.waitForTimeout(400);
    let f = await page.evaluate(() => ({ hash: location.hash, aud: document.documentElement.dataset.audience, pressed: [...document.querySelectorAll('.px-utility .ffw-audbtn')].map(b => b.getAttribute('aria-pressed')), main: [...document.querySelectorAll('.px-main a')].map(a => a.getAttribute('href')), cols: [...document.querySelectorAll('.ffw-sitemap > .ffw-fcol')].filter(c => getComputedStyle(c).display !== 'none').map(c => c.dataset.aud), live: document.getElementById('ff-announce').textContent, stored: localStorage.getItem('ff-audience') }));
    assert.equal(f.hash, '#centers', 'the header switch opens the centers landing');
    assert.equal(f.aud, 'centers'); assert.deepEqual(f.pressed, ['false', 'true']);
    assert.deepEqual(f.main, ['#centers', '#for-centers', '#for-home', '#for-faith', '#pricing']);
    assert.deepEqual(f.cols, ['centers', 'help'], 'footer: centers pages and help; the families column is put away');
    assert.match(f.live, /centers/i);
    assert.equal(f.stored, 'centers');
    await h.goto(page, site.base, 'contact');                          // a fresh document on a shared page: the choice is remembered
    assert.equal(await page.evaluate(() => document.documentElement.dataset.audience), 'centers');
    await h.goto(page, site.base, 'story-time');                       // a family page always opens the family side
    assert.equal(await page.evaluate(() => document.documentElement.dataset.audience), 'families');
    await h.goto(page, site.base, 'pricing');                          // and a business page the centers side
    assert.equal(await page.evaluate(() => document.documentElement.dataset.audience), 'centers');
    // the hook the HERO lane calls from Booker's question
    f = await page.evaluate(() => { let ev = null; document.addEventListener('ff:audience', e => { ev = e.detail; }); const r = window.FFAudience.set('families'); return { r, ev, aud: document.documentElement.dataset.audience, main: [...document.querySelectorAll('.px-main a')].map(a => a.getAttribute('href')), links: window.FFAudience.links('centers').map(l => l.route), legacy: window.FFAudience.set('staff') }; });
    assert.equal(f.r, 'families'); assert.equal(f.aud, 'families'); assert.deepEqual(f.ev, { audience: 'families', previous: 'centers', source: 'api' });
    assert.deepEqual(f.main, ['#friends', '#family-videos', '#at-home', '#enroll']);
    assert.deepEqual(f.links, ['centers', 'for-centers', 'for-home', 'for-faith', 'pricing']);
    assert.equal(f.legacy, 'centers', 'the old "staff" choice opens the centers side');
    // aliases: #centers/<route> and #families/<route> open that route on that side; the old #shop-families opens the Kids' Shop
    for (const [from, to, aud] of [['centers/room-kit', '#room-kit', 'centers'], ['families/story-time', '#story-time', 'families'], ['shop-families', '#kids-shop', 'families']]) {
      await h.goto(page, site.base, from);
      assert.deepEqual(await page.evaluate(() => [location.hash, document.documentElement.dataset.audience]), [to, aud], from);
    }
    assert.deepEqual(errors.filter(noise), []);
    await ctx.close();
  });
}

test('audience switcher with storage blocked: still works for the visit, no errors', async () => {
  const { ctx, page, errors } = await h.open(browser, 1280);
  await page.addInitScript(() => { const boom = () => { throw new Error('blocked'); }; Object.defineProperty(window, 'localStorage', { get: boom }); Object.defineProperty(window, 'sessionStorage', { get: boom }); });
  // with storage blocked the entry gate cannot remember the session (it would open on every load); ?nogate skips it (entry.js)
  await page.goto(`${site.base}?nogate&fresh=${Date.now()}#pricing`); await page.waitForFunction(() => document.querySelector('#view') && document.querySelector('#view').children.length > 0); await page.waitForTimeout(450);   // Home shows no context strip; dismiss it on a page that has one
  await page.click('.px-utility .ffw-audbtn[data-audience="families"]'); await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => document.documentElement.dataset.audience), 'families');
  await page.click('.px-utility .ffw-audbtn[data-audience="centers"]'); await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => document.documentElement.dataset.audience), 'centers');
  await page.click('.ffw-next-x'); await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => document.getElementById('ffw-next').hidden), true);
  assert.deepEqual(errors.filter(e => noise(e) && !/blocked/.test(e)), []);
  await ctx.close();
});

for (const width of [1280, 390]) {
  test(`full-screen menu (${width}px): audience groups, squiggle on the current page, portal pills, phone pinned, scroll lock, link closes it`, async () => {
    const { ctx, page, errors } = await h.open(browser, width);
    await h.goto(page, site.base, 'pricing');
    await page.evaluate(() => window.scrollTo(0, 900)); await page.waitForTimeout(100);
    const y0 = await page.evaluate(() => window.scrollY);
    const at = await page.$eval('#menuT', e => { const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
    await page.mouse.click(at[0], at[1]); await page.waitForSelector('#ffw-menu[open]');   // a real click (page.click scrolls first)
    let f = await page.evaluate(() => {
      const m = document.getElementById('ffw-menu'), vis = el => !!el && el.getBoundingClientRect().height > 0 && getComputedStyle(el).visibility !== 'hidden';
      const cur = m.querySelector('.ffw-m-link[aria-current="page"]');
      const foot = m.querySelector('.ffw-m-foot'), talk = foot.querySelector('.ffw-m-talk'), phone = foot.querySelector('.ffw-m-phone[href^="tel:"]');
      const groups = [...m.querySelectorAll('.ffw-m-group')].filter(vis).map(g => g.dataset.aud);
      const big = [...m.querySelectorAll('.ffw-m-group')].filter(vis).flatMap(g => [...g.querySelectorAll('.ffw-m-link')]);
      return { full: m.getBoundingClientRect().width === innerWidth && Math.round(m.getBoundingClientRect().height) === innerHeight, groups, cur: cur && cur.getAttribute('href'), squiggle: !!(cur && cur.querySelector('.ffw-sq')), pills: [...m.querySelectorAll('.ffw-m-pill')].map(p => p.getAttribute('href') + ':' + /preview/.test(p.textContent) + ':' + !!p.querySelector('.ffw-lock')),
        talkBottom: Math.round(innerHeight - foot.getBoundingClientRect().bottom), talkH: talk.getBoundingClientRect().height, phone: vis(phone), rows: big.map(a => Math.round(a.getBoundingClientRect().height)), linksTop: big.length ? Math.min(...big.map(a => a.getBoundingClientRect().top)) : 0, body: getComputedStyle(document.body).position, aud: [...m.querySelectorAll('.ffw-m-audbtn')].length };
    });
    assert.ok(f.full, 'covers the whole screen'); assert.equal(f.aud, 2, 'two audience buttons on top');
    assert.equal(f.cur, '#pricing'); assert.ok(f.squiggle, 'a gold squiggle through the current page');
    assert.deepEqual(f.pills, ['#signin-family:true:true', '#signin-teacher:true:true', '#sign-in:true:true'], 'portals are separate lock "preview" pills');
    assert.ok(f.phone && f.talkBottom === 0 && f.talkH >= 48, '"Talk to a real person" and the phone are pinned at the bottom, 48 px+');
    assert.ok(f.rows.every(r => r >= 48), `48 px rows: ${f.rows}`);
    assert.equal(f.body, 'fixed', 'scroll lock that holds on iOS (body fixed)');
    assert.deepEqual(f.groups, ['centers'], 'only the chosen side\'s pages (#pricing is a centers page)');
    if (width === 390) { assert.ok(f.linksTop > 150 && f.linksTop < 844 / 2, `big links on the first screen, under the audience question: ${f.linksTop}`); }   // coordinator 2026-10-06: menu opens at the top in reading order (audience question, main links, More, Sign in); the old 'scrolled to the bottom so links sit in the lower half' start clipped a row under the logo bar. 'Talk to a real person' + phone stay pinned in the thumb zone

    // switching audience inside the menu reorders it and sets the site-wide choice
    await page.click('#ffw-menu .ffw-audbtn[data-audience="families"]'); await page.waitForTimeout(120);
    f = await page.evaluate(() => ({ aud: document.documentElement.dataset.audience, first: [...document.querySelectorAll('#ffw-menu .ffw-m-group')].filter(g => g.getBoundingClientRect().height > 0)[0].dataset.aud, focus: document.activeElement.dataset.audience }));
    assert.equal(f.aud, 'families'); assert.equal(f.first, 'families'); assert.equal(f.focus, 'families', 'focus stays on the button just pressed');
    // Escape restores the scroll position
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => getComputedStyle(document.body).position), 'static');
    assert.equal(await page.evaluate(() => window.scrollY), y0, 'scroll position kept');
    // a menu link navigates, closes the menu and puts focus on the new page's h1
    await page.click('#menuT'); await page.waitForSelector('#ffw-menu[open]');
    await page.click('#ffw-menu .ffw-m-link[href="#story-time"]:visible'); await page.waitForTimeout(250);
    f = await page.evaluate(() => ({ open: document.getElementById('ffw-menu').open, hash: location.hash, tag: document.activeElement.tagName, y: window.scrollY, exp: document.getElementById('menuT').getAttribute('aria-expanded') }));
    assert.deepEqual(f, { open: false, hash: '#story-time', tag: 'H1', y: 0, exp: 'false' });
    assert.deepEqual(errors.filter(noise), []);
    await ctx.close();
  });
}

for (const width of [1280, 390]) {
  test(`search palette (${width}px): / and Ctrl/Cmd+K open it; finds a page, a friend, a printable and a FAQ by keyword; arrows + Enter open; nothing found offers a real person`, async () => {
    const { ctx, page, errors } = await h.open(browser, width);
    await h.goto(page, site.base, 'home');
    const top = q => page.evaluate(async (q) => { const i = document.getElementById('px-globalquery'); i.value = q; i.dispatchEvent(new Event('input', { bubbles: true })); const o = document.querySelector('#ffw-pal-list [role="option"][aria-selected="true"]'); return o && { href: o.getAttribute('href'), title: o.querySelector('b').textContent, kind: o.querySelector('.ffw-pal-kind').textContent, active: i.getAttribute('aria-activedescendant') === o.id }; }, q);
    await page.keyboard.press('/');
    await page.waitForSelector('#px-search[open]');
    let f = await page.evaluate(() => { const i = document.activeElement; return { id: i.id, role: i.getAttribute('role'), controls: i.getAttribute('aria-controls'), lb: document.getElementById(i.getAttribute('aria-controls')).getAttribute('role'), groups: [...document.querySelectorAll('#ffw-pal-list [role="group"]')].map(g => g.getAttribute('aria-label')), opts: document.querySelectorAll('#ffw-pal-list [role="option"]').length }; });
    assert.deepEqual([f.id, f.role, f.controls, f.lb], ['px-globalquery', 'combobox', 'ffw-pal-list', 'listbox']);
    assert.ok(f.opts >= 4, 'suggestions before typing');
    assert.deepEqual(await top('pricing'), { href: '#pricing', title: 'Pricing', kind: 'Page', active: true }, 'a page by keyword');
    assert.deepEqual(await top('how much does it cost'.split(' ').slice(-1)[0]), { href: '#pricing', title: 'Pricing', kind: 'Page', active: true }, 'a page by an everyday word');
    assert.deepEqual(await top('lumi'), { href: '#friends', title: 'Lumi', kind: 'Friend', active: true }, 'a friend by name');
    assert.deepEqual(await top('sticker chart'), { href: '#printables', title: 'Our week sticker chart', kind: 'Printable', active: true }, 'a printable by keyword');
    const faq = await top('screen time');
    assert.equal(faq.kind, 'Question'); assert.equal(faq.href, '#support');
    // grouped by audience: printables sit in "For families"
    await top('printable');
    assert.ok((await page.$$eval('#ffw-pal-list [role="group"]', gs => gs.map(g => g.getAttribute('aria-label')))).includes('For families'));
    // arrow keys move the active option; Enter opens it; the found printable is revealed on its page
    await page.fill('#px-globalquery', 'calm-down cards');
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowUp');
    assert.match(await page.$eval('#ffw-pal-list [aria-selected="true"] b', b => b.textContent), /calm-down cards/);
    await page.keyboard.press('Enter'); await page.waitForTimeout(400);
    f = await page.evaluate(() => ({ open: document.getElementById('px-search').open, hash: location.hash, focus: document.activeElement.getAttribute('href') }));
    assert.equal(f.open, false); assert.equal(f.hash, '#printables');
    assert.equal(f.focus, 'printables/futures-at-home-lumi-calm-cards.pdf', 'the printable itself has focus');
    // Ctrl+K and Cmd+K
    for (const combo of ['Control+k', 'Meta+k']) { await page.keyboard.press(combo); await page.waitForSelector('#px-search[open]'); await page.keyboard.press('Escape'); await page.waitForTimeout(80); }
    // a FAQ opens on the support page with its answer shown
    await page.keyboard.press('Control+k'); await page.waitForSelector('#px-search[open]');
    await page.fill('#px-globalquery', 'screen time does the program use'); await page.keyboard.press('Enter'); await page.waitForTimeout(400);
    f = await page.evaluate(() => { const s = document.activeElement; return { hash: location.hash, tag: s.tagName, open: !!(s.closest('details') && s.closest('details').open) }; });
    assert.deepEqual(f, { hash: '#support', tag: 'SUMMARY', open: true });
    // nothing found: a real person
    await page.keyboard.press('Control+k'); await page.waitForSelector('#px-search[open]');
    await page.fill('#px-globalquery', 'qqzzxx');
    f = await page.evaluate(() => ({ opts: document.querySelectorAll('#ffw-pal-list [role="option"]').length, talk: !!document.querySelector('.ffw-pal-empty:not([hidden]) a[href="#contact"]'), call: !!document.querySelector('.ffw-pal-empty:not([hidden]) a[href^="tel:"]'), text: document.querySelector('.ffw-pal-empty').innerText }));
    assert.equal(f.opts, 0); assert.ok(f.talk && f.call); assert.match(f.text, /Talk to a real person/);
    // "/" inside a text field types a slash instead of opening search
    await page.keyboard.press('Escape'); await h.goto(page, site.base, 'contact');
    const field = await page.$('#view input[type="text"], #view input:not([type]), #view textarea');
    if (field) { await field.focus(); await page.keyboard.press('/'); assert.equal(await page.evaluate(() => document.getElementById('px-search').open), false); }
    assert.deepEqual(errors.filter(noise), []);
    await ctx.close();
  });
}

for (const width of [1280, 390]) {
  test(`breadcrumbs on every route above the h1, one trail per page; back chip on detail pages (${width}px)`, async () => {
    const { ctx, page, errors } = await h.open(browser, width);
    await h.goto(page, site.base, 'home');
    assert.equal(await page.$$eval('#view .ffw-crumbs', n => n.length), 0, 'Home is the root: no trail');
    const routes = (await h.routeList(page)).filter(r => r !== 'home').concat(h.EXTRA_ROUTES);
    const bad = [];
    for (const r of routes) {
      await h.goto(page, site.base, r, 150);
      const f = await page.evaluate(() => {
        const v = document.getElementById('view'), navs = v.querySelectorAll('nav[aria-label="Breadcrumb"]'), c = v.querySelector('.ffw-crumbs'), h1 = v.querySelector('h1');
        const b = c && c.getBoundingClientRect();
        return { n: navs.length, before: !!(c && h1 && (c.compareDocumentPosition(h1) & 4)), vis: !!(b && b.width && b.height), home: c && c.querySelector('a') && c.querySelector('a').getAttribute('href'), cur: c && c.querySelectorAll('[aria-current="page"]').length };
      });
      if (f.n !== 1 || !f.before || !f.vis || f.home !== '#home' || f.cur !== 1) bad.push(`${r} ${JSON.stringify(f)}`);
    }
    assert.deepEqual(bad, [], 'every route: one visible Breadcrumb nav before the h1, starting at Home, ending at the current page');
    // detail page landed on directly: back to its index; then the in-app history wins
    // wave 7 GATE: #unit-1/<day> is no longer a public detail page (it lands on the summary); a Training Academy lesson is the
    // long detail page here instead (was #unit-1/9, "Day 9", "Back to Unit 1 sample")
    await h.goto(page, site.base, 'academy/F-101');
    assert.match(await page.$eval('#view .ffw-crumbs [aria-current]', e => e.textContent), /^Welcome to Futures Friends/);
    assert.match(await page.$eval('.ffw-back', a => a.textContent), /Back to Training Academy/);
    await page.evaluate(() => { const v = document.getElementById('view'); window.scrollTo(0, v.offsetTop + v.offsetHeight * 0.6); }); await page.waitForTimeout(80);
    const stuck = await page.evaluate(() => { const b = document.querySelector('.ffw-backbar').getBoundingClientRect(), hd = document.querySelector('header.bar').getBoundingClientRect(); return { d: Math.abs(b.top - hd.bottom), y: scrollY }; });
    assert.ok(stuck.y > 1500 && stuck.d < 2, `the chip stays under the header while reading ${JSON.stringify(stuck)}`);
    await h.goto(page, site.base, 'story-time');
    const book = await page.$('#view a[href^="#story-time/"]');
    await book.click(); await page.waitForTimeout(250);
    const chip = await page.evaluate(() => { const a = document.querySelector('.ffw-back'), s = getComputedStyle(a.closest('.ffw-backbar')); return { text: a.textContent, back: a.hasAttribute('data-ffw-back'), sticky: s.position, dup: [...document.querySelectorAll('#view a.fl-back')].filter(x => getComputedStyle(x).display !== 'none').length }; });
    assert.match(chip.text, /Back to Story Time/); assert.ok(chip.back, 'goes back through real history'); assert.equal(chip.sticky, 'sticky'); assert.equal(chip.dup, 0, 'one way back, not two');
    await page.click('.ffw-back'); await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => location.hash), '#story-time');
    assert.equal(await page.evaluate(() => document.activeElement.tagName), 'H1');
    assert.deepEqual(errors.filter(noise), []);
    await ctx.close();
  });
}

test('context card at 390 px: in the page flow, never over a link or button at any scroll position; dismissed for the session; never printed', async () => {
  const { ctx, page, errors } = await h.open(browser, 390);
  for (const r of ['home', 'curriculum', 'enroll', 'pricing', 'friends']) {
    await h.goto(page, site.base, r);
    const pos = await page.$eval('#ffw-next', e => getComputedStyle(e).position);
    assert.notEqual(pos, 'fixed', 'not floating over content on phones');
    for (const y of [0, 400, 1200, 2600]) {
      await page.evaluate(y => window.scrollTo(0, y), y); await page.waitForTimeout(40);
      const hits = await page.evaluate(() => {
        const c = document.getElementById('ffw-next'); if (c.hidden) return [];
        const b = c.getBoundingClientRect(); if (b.bottom < 0 || b.top > innerHeight) return [];
        return [...document.querySelectorAll('a[href],button,input,select,textarea,summary')].filter(el => !c.contains(el) && !el.closest('dialog:not([open])') && !el.closest('header')).filter(el => { const r = el.getBoundingClientRect(); return r.width && r.height && r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top; }).map(el => el.outerHTML.slice(0, 80));
      });
      assert.deepEqual(hits, [], `#${r} at scroll ${y}: the card covers nothing`);
    }
  }
  await h.goto(page, site.base, 'story-time');   // Home shows no strip; check wording, print and dismissal where it appears
  assert.match(await page.$eval('#ffw-next', e => e.innerText), /Visit our pilot center/);
  await page.emulateMedia({ media: 'print' });
  assert.equal(await page.$eval('#ffw-next', e => getComputedStyle(e).display), 'none', 'hidden in print');
  await page.emulateMedia({ media: 'screen' });
  await page.click('.ffw-next-x'); await page.waitForTimeout(80);
  assert.equal(await page.$eval('#ffw-next', e => e.hidden), true);
  await page.click('.px-utility .ffw-audbtn[data-audience="centers"]');
  await page.evaluate(() => { location.hash = '#pricing'; }); await page.waitForTimeout(200);
  assert.equal(await page.$eval('#ffw-next', e => e.hidden), true, 'stays dismissed across pages');
  await page.reload(); await page.waitForTimeout(400);
  assert.equal(await page.$eval('#ffw-next', e => e.hidden), true, 'stays dismissed for the session');
  assert.deepEqual(errors.filter(noise), []);
  await ctx.close();
});

test('context card hidden on Home; by audience and on wide screens: bottom-left in the margin, steps away rather than covering anything', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await h.goto(page, site.base, 'friends');   // Home hides the strip (its own front door is Booker's question + the doors)
  // audience split (2026-10-07): families get the visit; centers get a membership conversation first, never "visit our center"
  for (const [k, re, to] of [['families', /Visit our pilot center/, '#enroll'], ['centers', /Book a demo or discuss your program/, '#book-demo']]) {
    await page.evaluate(k => window.FFAudience.set(k), k);
    assert.match(await page.$eval('#ffw-next', e => e.textContent), re, k);
    assert.equal(await page.$eval('#ffw-next .ffw-next-link', a => a.getAttribute('href')), to);
  }
  await h.goto(page, site.base, 'book-demo');
  assert.match(await page.$eval('#ffw-next', e => e.innerText), /See every program type/, 'never suggests the page you are on');
  const box = await page.$eval('#ffw-next', e => { const b = e.getBoundingClientRect(); return { pos: getComputedStyle(e).position, left: b.left, bottom: innerHeight - b.bottom, right: b.right }; });
  assert.equal(box.pos, 'fixed'); assert.ok(box.left < 40 && box.bottom < 40, 'bottom-left'); assert.ok(box.right <= (1600 - 1180) / 2, 'inside the empty margin');
  for (const r of ['home', 'pricing', 'academy', 'friends']) {
    await h.goto(page, site.base, r);
    for (const y of [0, 700, 1600, 99999]) {
      await page.evaluate(y => window.scrollTo(0, y), y); await page.waitForTimeout(260);
      const hits = await page.evaluate(() => {
        const c = document.getElementById('ffw-next'), s = getComputedStyle(c);
        if (c.hidden || s.visibility === 'hidden' || +s.opacity === 0) return [];
        const b = c.getBoundingClientRect();
        return [...document.querySelectorAll('#view *, footer *, #ffw-close *')].filter(el => /^(A|BUTTON|INPUT|H1|H2|H3|P|LI|IMG)$/.test(el.tagName)).filter(el => { const r = el.getBoundingClientRect(); return r.width && r.height && r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top; }).map(el => el.tagName + ' ' + (el.textContent || '').trim().slice(0, 30));
      });
      assert.deepEqual(hits, [], `#${r} at ${y}: a visible card covers nothing`);
    }
  }
  assert.deepEqual(errors, []);
  await ctx.close();
});

for (const width of [1280, 390]) {
  test(`"Talk to a real person" on every page and the footer site map (${width}px)`, async () => {
    const { ctx, page, errors } = await h.open(browser, width);
    await h.goto(page, site.base, 'home');
    const routes = (await h.routeList(page));
    const missing = [];
    for (const r of routes) {
      await h.goto(page, site.base, r, 100);
      const ok = await page.evaluate((r) => { const band = document.getElementById('ffw-close'), own = document.querySelector('#view .hc-close'); const shown = band && !band.hidden && band.getBoundingClientRect().height > 0; return (shown && /Talk to a real person/.test(band.innerText) && !!band.querySelector('a[href^="tel:"]')) || (!!own && /Talk to a real person/.test(own.innerText)) || r === 'contact'; }, r);
      if (!ok) missing.push(r);
    }
    assert.deepEqual(missing, []);
    await h.goto(page, site.base, 'pricing');
    const f = await page.evaluate(() => ({ cols: [...document.querySelectorAll('.ffw-sitemap > .ffw-fcol')].map(c => c.dataset.aud), cur: [...document.querySelectorAll('.ffw-sitemap a[aria-current="page"]')].map(a => a.getAttribute('href')), btns: [...document.querySelectorAll('.ffw-fbtn')].map(b => b.getAttribute('aria-expanded')) }));
    assert.deepEqual(f.cols, ['centers', 'families', 'help'], 'the side you are on leads (the other side\'s column is put away)');
    assert.deepEqual(f.cur, ['#pricing']);
    if (width === 390) {
      assert.deepEqual(f.btns, ['true', 'false', 'false'], 'phones: the map folds, your side open');
      await page.click('.ffw-fcol[data-aud="help"] .ffw-fbtn');
      assert.equal(await page.$eval('#ffw-fl-help', u => u.hidden), false);
    } else assert.deepEqual(f.btns, [], 'desktop: every column open, plain headings');
    assert.deepEqual(errors.filter(noise), []);
    await ctx.close();
  });
}

test('no layout shift from wayfinding: CLS < 0.01 on cold loads of key routes at 1280 and 390', async () => {
  // One retry per route: under a fully parallel test run the machine is busy and a cold load can paint at a different moment.
  // A real regression shifts on both tries; the failure names the node that moved.
  const out = [];
  const once = async (width, r) => {
    const { ctx, page } = await h.open(browser, width);
    await page.addInitScript(() => { window.__cls = 0; window.__src = []; new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) { window.__cls += e.value; window.__src.push((e.sources || []).map(s => s.node && (s.node.id || s.node.className || s.node.nodeName)).join('|')); } }).observe({ type: 'layout-shift', buffered: true }); });
    await h.goto(page, site.base, r, 900);
    const v = await page.evaluate(() => ({ cls: window.__cls, src: window.__src }));
    await ctx.close();
    return v;
  };
  for (const width of [1280, 390]) for (const r of ['home', 'curriculum', 'unit-1', 'story-time/booker-tries-again', 'pricing', 'friends']) {   // wave 7 GATE: unit-1 (summary) was unit-1/9
    let v = await once(width, r);
    if (v.cls >= 0.01) v = await once(width, r);
    if (v.cls >= 0.01) out.push(`${width} #${r} ${v.cls.toFixed(4)} ${v.src.join(' ; ')}`);
  }
  assert.deepEqual(out, []);
});

// Review follow-ups (independent code review of 2babc3f): a second navigation during a page turn must win, and the back chip must
// name the same page the browser's Back goes to.
test('page turn: a second link clicked before the turn renders wins (and a double click renders once)', async () => {
  const { ctx, page, errors } = await h.open(browser, 1280, { motion: true });
  await h.goto(page, site.base, 'curriculum', 700);
  const f = await page.evaluate(async () => {
    let renders = 0; const r0 = window.render; window.render = function () { renders++; return r0.apply(this, arguments); };
    const mk = href => { const a = document.createElement('a'); a.href = href; a.textContent = href; document.getElementById('ff-prefooter').appendChild(a); return a; };
    const len0 = history.length;
    mk('#friends').click(); mk('#pricing').click();                    // same task: the turn has not rendered yet
    await new Promise(r => setTimeout(r, 900));
    const first = { hash: location.hash, h1: document.querySelector('#view h1').textContent, pushed: history.length - len0, renders };
    renders = 0; const a = mk('#whole-child'); a.click(); a.click();
    await new Promise(r => setTimeout(r, 900));
    return { first, second: { hash: location.hash, renders } };
  });
  assert.equal(f.first.hash, '#pricing'); assert.match(f.first.h1, /package prices/i); assert.equal(f.first.pushed, 1, 'one history entry, for the page shown');
  assert.equal(f.second.hash, '#whole-child'); assert.equal(f.second.renders, 1, 'a double click renders once');
  assert.deepEqual(errors.filter(noise), []);
  await ctx.close();
});

test('back chip: a link back to an earlier page is a new step, so the chip names exactly where Back goes', async () => {
  const { ctx, page, errors } = await h.open(browser, 1280);
  // wave 7 GATE: Story Time books stand in for the Unit 1 days this test used (#unit-1/<day> is no longer a public page)
  await h.goto(page, site.base, 'story-time');
  const nav = href => page.evaluate(href => { const a = document.createElement('a'); a.href = href; document.getElementById('ff-prefooter').appendChild(a); a.click(); }, href).then(() => page.waitForTimeout(150));
  for (const x of ['#story-time/booker-tries-again', '#story-time/big-feelings-brighter-days', '#story-time/booker-tries-again']) await nav(x);
  assert.match(await page.$eval('.ffw-back', a => a.textContent), /Back to Big Feelings, Brighter Days/);
  await page.click('.ffw-back'); await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => location.hash), '#story-time/big-feelings-brighter-days', 'the chip and the browser agree');
  await page.goBack(); await page.waitForTimeout(300);                  // a real Back pops the in-app list too
  assert.equal(await page.evaluate(() => location.hash), '#story-time/booker-tries-again');
  assert.match(await page.$eval('.ffw-back', a => a.textContent), /Back to Story Time/);
  assert.deepEqual(errors.filter(noise), []);
  await ctx.close();
});

test('Home shows no context strip (its front door is Booker + the doors); other routes do', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await h.goto(page, site.base, 'home');
  await page.evaluate(() => window.FFAudience.set('families'));
  assert.equal(await page.$eval('#ffw-next', e => e.hidden), true, 'hidden on Home');
  await h.goto(page, site.base, 'pricing');
  assert.equal(await page.$eval('#ffw-next', e => e.hidden), false, 'shown elsewhere');
  await ctx.close();
});
