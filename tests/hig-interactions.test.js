// Apple HIG audit 2026-10-12 (HIG_AUDIT_2026-10-12.md, owner-approved): how taps, panels, Back and gestures feel on a phone.
// Real headless Chromium at 390 px with touch (harness as tests/a11y.test.js). Each test encodes one finding that was fixed:
//  #2 Shop filter menus are 16 px (no iPhone zoom)           #3 Back returns to where you were; a new page starts at the top
//  #4 header controls answer a 44 x 44 pt finger, header fits at 360   #7 search and Display preferences hold the page still
//  #8 Back closes an open panel and stays on the page          #9 Menu tapped again while the menu is closing reopens it
//  #10 the language switch keeps your place; FFi18n.ready()   #12 the Shop quick view sheet can be swiped away
//  #13 Display preferences closes on a tap outside            #17 "Decorative motion" is a switch
//  #18 a sideways swipe changes the Kids' Shop film chapter
const test = require('node:test');
const assert = require('node:assert/strict');

const H = () => import('./a11y-harness.mjs');
let h, site, browser;
test.before(async () => { h = await H(); site = await h.startSite(); browser = await h.loadChromium().launch(); });
test.after(async () => { if (browser) await browser.close(); if (site) await site.close(); });

const PHONE = { isMobile: true, hasTouch: true };
async function phone(route, { motion = false, width = 390 } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: motion ? 'no-preference' : 'reduce', ...PHONE });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${site.base}?nogate&nostamp#${route}`, { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('#view') && document.querySelector('#view').children.length > 0);
  await page.waitForTimeout(600);
  return { ctx, page, errors };
}
const hashOf = page => page.evaluate(() => location.hash.slice(1));
const open = (page, sel) => page.evaluate(s => !!(document.querySelector(s) && document.querySelector(s).open), sel);
const toRoute = (page, r) => page.evaluate(r => { location.hash = r; }, r);
const waitRoute = (page, r) => page.waitForFunction(r => location.hash.slice(1) === r && document.querySelector('#view h1'), r, { timeout: 15000 });
async function touchDrag(page, x, y, dx, dy, steps = 8, hold = 0) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= steps; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx * i / steps, y: y + dy * i / steps }] }); await page.waitForTimeout(16); }
  if (hold) await page.waitForTimeout(hold);                                   // the finger rests before lifting: not a flick
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

test('#3 Back lands where you were on Watch and on the Shop (product page); a new page starts at the top', { timeout: 240000 }, async () => {
  const { ctx, page, errors } = await phone('watch');
  assert.equal(await page.evaluate(() => history.scrollRestoration), 'manual', 'the router, not the browser, restores the scroll');
  await page.evaluate(() => scrollTo(0, 4000)); await page.waitForTimeout(400);
  const y0 = await page.evaluate(() => scrollY);
  assert.ok(y0 > 3900, `Watch scrolled to ${y0}`);
  await page.evaluate(() => document.querySelector('header.bar a[href="#friends"]').click());   // a forward step, through the router
  await waitRoute(page, 'friends'); await page.waitForTimeout(500);
  assert.ok(await page.evaluate(() => scrollY) < 40, 'a new page opens at the top');
  await page.goBack(); await waitRoute(page, 'watch'); await page.waitForTimeout(900);
  const back = await page.evaluate(() => scrollY);
  assert.ok(Math.abs(back - y0) < 60, `Back on Watch lands near ${y0}, got ${back}`);
  await page.goForward(); await waitRoute(page, 'friends'); await page.waitForTimeout(700);
  assert.ok(await page.evaluate(() => scrollY) < 40, 'Forward to Friends: Friends was at the top');
  // the Shop, through a product card (data-go) and a #product/... page
  await toRoute(page, 'shop'); await waitRoute(page, 'shop'); await page.waitForTimeout(600);
  await page.evaluate(() => scrollTo(0, 2500)); await page.waitForTimeout(400);
  const ys = await page.evaluate(() => scrollY);
  const card = await page.evaluate(() => { const a = [...document.querySelectorAll('#view a[data-go^="product/"]')].find(x => x.getClientRects().length); if (!a) return null; a.click(); return a.dataset.go; });
  assert.ok(card, 'a product card on the Shop');
  await page.waitForFunction(() => location.hash.startsWith('#product/'), null, { timeout: 15000 }); await page.waitForTimeout(600);
  assert.ok(await page.evaluate(() => scrollY) < 40, 'the product page opens at the top');
  await page.goBack(); await waitRoute(page, 'shop'); await page.waitForTimeout(900);
  const yb = await page.evaluate(() => scrollY);
  assert.ok(Math.abs(yb - ys) < 60, `Back on the Shop lands near ${ys}, got ${yb}`);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('#8 Back closes the menu, search, Display preferences and the quick view, and stays on the page; closing by x leaves no dead entry', { timeout: 300000 }, async () => {
  const { ctx, page, errors } = await phone('support');
  await toRoute(page, 'friends'); await waitRoute(page, 'friends'); await page.waitForTimeout(500);
  const panels = [['menu', '#menuT', 'dialog.ffw-menu', '.ffw-m-close'], ['search', '[data-px="search"]', '#px-search', null], ['settings', '[data-px="settings"]', '#px-settings', '[data-px="close"]']];
  for (const [name, trigger, dlg] of panels) {
    await page.click(`header.bar ${trigger}`); await page.waitForTimeout(400);
    assert.ok(await open(page, dlg), `${name} opens`);
    await page.goBack(); await page.waitForTimeout(700);
    assert.equal(await open(page, dlg), false, `Back closes ${name}`);
    assert.equal(await hashOf(page), 'friends', `Back with ${name} open stays on Friends`);
  }
  // closed by its own button: our history entry is removed, so the next Back really goes back
  for (const [name, trigger, dlg, x] of panels) {
    await page.click(`header.bar ${trigger}`); await page.waitForTimeout(400);
    if (x) await page.click(`${dlg} ${x}`); else await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    assert.equal(await open(page, dlg), false, `${name} closes`);
    assert.equal(await page.evaluate(() => history.state && history.state.ffOverlay || null), null, `${name}: no panel entry left on top`);
  }
  await page.goBack(); await waitRoute(page, 'support');
  // a page opened from the menu takes over the menu's entry: Back from it returns to the page under the menu
  await toRoute(page, 'friends'); await waitRoute(page, 'friends'); await page.waitForTimeout(400);
  await page.click('header.bar #menuT'); await page.waitForTimeout(400);
  await page.click('dialog.ffw-menu a[href="#at-home"]'); await waitRoute(page, 'at-home'); await page.waitForTimeout(400);
  await page.goBack(); await waitRoute(page, 'friends'); await page.waitForTimeout(400);
  assert.equal(await open(page, 'dialog.ffw-menu'), false, 'the menu stays closed');
  // the quick view on the Shop
  await toRoute(page, 'shop'); await waitRoute(page, 'shop'); await page.waitForTimeout(600);
  await page.evaluate(() => { const b = [...document.querySelectorAll('[data-sp-qv]')].find(x => x.getClientRects().length); b.scrollIntoView({ block: 'center' }); b.click(); });
  await page.waitForTimeout(500);
  assert.ok(await open(page, 'dialog.sp-qvdlg'), 'quick view opens');
  await page.goBack(); await page.waitForTimeout(700);
  assert.equal(await open(page, 'dialog.sp-qvdlg'), false, 'Back closes the quick view');
  assert.equal(await hashOf(page), 'shop', 'and stays on the Shop');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('#7 search and Display preferences hold the page still behind them, and give the scroll position back', { timeout: 120000 }, async () => {
  const { ctx, page } = await phone('watch');
  for (const t of ['search', 'settings']) {
    await page.evaluate(() => scrollTo(0, 1500)); await page.waitForTimeout(300);
    const bb = await page.locator(`header.bar [data-px="${t}"]`).boundingBox();             // a finger tap: page.click would scroll first
    await page.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.waitForTimeout(400);
    assert.equal(await page.evaluate(() => document.body.style.position), 'fixed', `${t}: the page behind is locked`);
    await page.mouse.move(195, 700); await page.mouse.wheel(0, 600); await page.waitForTimeout(300);
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    assert.equal(await page.evaluate(() => document.body.style.position), '', `${t}: unlocked after closing`);
    const y = await page.evaluate(() => scrollY);
    assert.ok(Math.abs(y - 1500) < 3, `${t}: the page did not move (${y})`);
  }
  await ctx.close();
});

test('#9 Menu tapped again while the menu is closing reopens it (motion on); the close uses the shared ease-out token', { timeout: 120000 }, async () => {
  const { ctx, page } = await phone('home', { motion: true });
  const btn = await page.locator('header.bar #menuT').boundingBox();
  await page.touchscreen.tap(btn.x + btn.width / 2, btn.y + btn.height / 2); await page.waitForTimeout(500);
  assert.ok(await open(page, 'dialog.ffw-menu'));
  const x = await page.locator('dialog.ffw-menu .ffw-m-close').boundingBox();
  await page.touchscreen.tap(x.x + x.width / 2, x.y + x.height / 2); await page.waitForTimeout(50);
  const mid = await page.evaluate(() => { const m = document.querySelector('dialog.ffw-menu'), s = getComputedStyle(m); return { open: m.open, op: +s.opacity, pe: s.pointerEvents, ease: s.transitionTimingFunction }; });
  assert.equal(mid.open, false, 'closing: no longer modal');
  assert.ok(mid.op > 0.02, `still fading (${mid.op})`);
  assert.equal(mid.pe, 'none', 'the fading menu never blocks a tap');
  assert.match(mid.ease, /cubic-bezier\(0\.22, 1, 0\.36, 1\)/, 'ease-out token, not ease-in');
  await page.touchscreen.tap(btn.x + btn.width / 2, btn.y + btn.height / 2); await page.waitForTimeout(500);
  assert.ok(await open(page, 'dialog.ffw-menu'), 'the second tap reopened the menu');
  assert.equal(await page.evaluate(() => +getComputedStyle(document.querySelector('dialog.ffw-menu')).opacity), 1);
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  assert.equal(await open(page, 'dialog.ffw-menu'), false);
  await ctx.close();
});

test('#13 #17 Display preferences: a tap outside closes it, its x is 44 pt, "Decorative motion" is a 51 x 31 switch with the whole row as target', { timeout: 120000 }, async () => {
  const { ctx, page } = await phone('home');
  await page.click('header.bar [data-px="settings"]'); await page.waitForTimeout(400);
  const info = await page.evaluate(() => { const d = document.getElementById('px-settings'), x = d.querySelector('[data-px="close"]').getBoundingClientRect(), s = d.querySelector('#px-motion'), r = s.getBoundingClientRect(), row = s.closest('label').getBoundingClientRect(), card = d.getBoundingClientRect();
    return { x: [x.width, x.height], role: s.getAttribute('role'), checked: s.getAttribute('aria-checked'), sw: [r.width, r.height], row: [row.left + 20, row.top + row.height / 2, row.height], card: [card.left, card.top, card.right, card.bottom], note: d.textContent.includes("Your device's reduced-motion preference always takes priority") }; });
  assert.ok(info.x[0] >= 44 && info.x[1] >= 44, `close button ${info.x}`);
  assert.equal(info.role, 'switch'); assert.equal(info.checked, 'true');
  assert.deepEqual(info.sw.map(Math.round), [51, 31]);
  assert.ok(info.row[2] >= 44, 'the row is a 44 pt target');
  assert.ok(info.note, 'the reduced-motion note stays');
  await page.mouse.click(info.row[0], info.row[1]); await page.waitForTimeout(200);   // the words of the row, not the switch
  assert.deepEqual(await page.evaluate(() => [document.getElementById('px-motion').getAttribute('aria-checked'), document.documentElement.dataset.motion]), ['false', 'off']);
  await page.mouse.click(info.row[0], info.row[1]); await page.waitForTimeout(200);
  assert.deepEqual(await page.evaluate(() => [document.getElementById('px-motion').getAttribute('aria-checked'), document.documentElement.dataset.motion]), ['true', 'on']);
  await page.mouse.click(info.card[0] + 6, info.card[1] + 6); await page.waitForTimeout(200);   // inside the card's padding
  assert.ok(await open(page, '#px-settings'), 'a tap inside the card does not close it');
  await page.mouse.click(195, Math.min(835, info.card[3] + 40)); await page.waitForTimeout(400);
  assert.equal(await open(page, '#px-settings'), false, 'a tap on the dimmed page closes it');
  await ctx.close();
});

test('#2 #4 Shop filter menus are 16 px; every header control has a 44 x 44 hit area at 390, and the header still fits at 360', { timeout: 120000 }, async () => {
  for (const width of [390, 360]) {
    const { ctx, page } = await phone('shop', { width });
    const fonts = await page.evaluate(() => [...document.querySelectorAll('#view .sp-sel select')].map(s => parseFloat(getComputedStyle(s).fontSize)));
    assert.ok(fonts.length >= 4 && fonts.every(f => f >= 16), `Shop selects ${fonts}`);
    const ctl = await page.evaluate(() => [...document.querySelectorAll('header.bar .px-iconbtn, header.bar .sp-cartbtn, header.bar .ff-lang-mini, header.bar .ffw-audbtn, header.bar .ffw-signin')].filter(e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden').map(e => {
      const r = e.getBoundingClientRect(); let w = r.width, hh = r.height;
      for (const pe of ['::before', '::after']) { const s = getComputedStyle(e, pe); if (s.content === 'none' || s.position !== 'absolute') continue;
        const t = parseFloat(s.top) || 0, b = parseFloat(s.bottom) || 0, l = parseFloat(s.left) || 0, rr = parseFloat(s.right) || 0;
        w = Math.max(w, r.width - l - rr); hh = Math.max(hh, r.height - t - b); }
      const below = document.elementFromPoint(r.left + r.width / 2, Math.min(innerHeight - 1, r.top + r.height / 2 + 20));
      return { n: (e.getAttribute('aria-label') || e.textContent).trim().slice(0, 20), w, h: hh, hitBelow: !!(below && (below === e || e.contains(below))), right: r.right };
    }));
    assert.ok(ctl.length >= 7, `${ctl.length} header controls`);
    for (const c of ctl) assert.ok(c.w >= 43.5 && c.h >= 43.5, `${width}: ${c.n} hit area ${c.w}x${c.h}`);
    for (const c of ctl.filter(c => /Search|Display|Open menu|Shop/.test(c.n))) assert.ok(c.hitBelow, `${width}: ${c.n} answers a tap 20 px below its centre`);
    assert.ok(ctl.every(c => c.right <= width + 0.5), `${width}: every header control is on screen`);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}: no sideways scroll`);
    await ctx.close();
  }
});

test('#12 the Shop quick view sheet: a grabber, a downward swipe dismisses it, a short drag springs back', { timeout: 120000 }, async () => {
  const { ctx, page } = await phone('shop', { motion: true });
  const openQV = async () => { await page.evaluate(() => { const b = [...document.querySelectorAll('[data-sp-qv]')].find(x => x.getClientRects().length); b.scrollIntoView({ block: 'center' }); b.click(); }); await page.waitForTimeout(600); };
  await openQV();
  assert.ok(await open(page, 'dialog.sp-qvdlg'));
  const g = await page.evaluate(() => { const e = document.querySelector('.sp-qv-grab'), s = getComputedStyle(e), b = getComputedStyle(e, '::before'); return { ta: s.touchAction, bar: [b.width, b.height], sheetTA: getComputedStyle(document.querySelector('dialog.sp-qvdlg')).touchAction }; });
  assert.equal(g.ta, 'none', 'touch-action:none on the grabber');
  assert.deepEqual(g.bar, ['36px', '5px']);
  assert.notEqual(g.sheetTA, 'none', 'the sheet itself still scrolls');
  const box = await page.locator('dialog.sp-qvdlg').boundingBox();
  await touchDrag(page, box.x + box.width / 2, box.y + 60, 0, 40, 4, 250); await page.waitForTimeout(700);
  assert.ok(await open(page, 'dialog.sp-qvdlg'), 'a 40 px drag springs back');
  assert.equal(await page.evaluate(() => document.querySelector('dialog.sp-qvdlg').style.transform), '', 'back in place');
  await touchDrag(page, box.x + box.width / 2, box.y + 60, 0, 320, 8); await page.waitForTimeout(700);
  assert.equal(await open(page, 'dialog.sp-qvdlg'), false, 'a 320 px swipe dismisses it');
  assert.equal(await hashOf(page), 'shop');
  await openQV();
  assert.ok(await open(page, 'dialog.sp-qvdlg'), 'it opens again after a swipe');
  assert.equal(await page.evaluate(() => document.querySelector('dialog.sp-qvdlg').style.transform), '');
  await ctx.close();
});

test('#18 a sideways swipe on the Kids\' Shop film changes chapter (the same seek as the ‹ › buttons)', { timeout: 120000 }, async () => {
  const { ctx, page } = await phone('kids-shop');
  assert.match(await page.evaluate(() => getComputedStyle(document.querySelector('.kf-stage')).touchAction), /pan-y/);
  // The test server sends no byte ranges, so the film itself cannot seek here: record the seeks the chapter controls ask for.
  await page.evaluate(() => { window.__seeks = []; const d = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'currentTime');
    Object.defineProperty(document.querySelector('video.kf-video'), 'currentTime', { configurable: true, get() { return window.__seekT || 0; }, set(v) { window.__seeks.push(+v.toFixed(2)); window.__seekT = v; } });
    document.querySelector('.kf-stage').scrollIntoView({ block: 'start' }); });
  await page.waitForTimeout(300);
  const seeks = () => page.evaluate(() => window.__seeks.splice(0));
  const pos = () => page.evaluate(() => document.querySelector('[data-kf-pos]').textContent.trim());
  assert.equal(await pos(), '01 / 04');
  await page.evaluate(() => document.querySelector('[data-kf-next]').click());
  const byButton = await seeks(); assert.equal(byButton.length, 1, 'the › button seeks once');
  assert.equal(await pos(), '02 / 04');
  await page.evaluate(() => document.querySelector('[data-kf-prev]').click()); await seeks();
  assert.equal(await pos(), '01 / 04');
  const b = await page.locator('.kf-content').boundingBox();
  await touchDrag(page, b.x + b.width - 20, b.y + b.height / 2, -200, 0, 8); await page.waitForTimeout(400);
  assert.deepEqual(await seeks(), byButton, 'swipe left: the next chapter, exactly as the › button');
  assert.equal(await pos(), '02 / 04');
  await touchDrag(page, b.x + 20, b.y + b.height / 2, 200, 0, 8); await page.waitForTimeout(400);
  assert.equal((await seeks()).length, 1);
  assert.equal(await pos(), '01 / 04', 'swipe right: previous chapter');
  await touchDrag(page, b.x + b.width / 2, b.y + b.height / 2, -20, 0, 4, 250); await page.waitForTimeout(400);
  assert.deepEqual(await seeks(), [], 'a small slow nudge changes nothing');
  assert.equal(await page.evaluate(() => document.querySelector('[data-kf-content]').style.transform), '', 'the words are back in place');
  await ctx.close();
});

test('#10 the language switch keeps your place; FFi18n.ready() resolves once the Spanish is on screen', { timeout: 180000 }, async () => {
  const { ctx, page, errors } = await phone('home');
  assert.equal(await page.evaluate(() => typeof window.FFi18n.ready), 'function');
  assert.equal(await page.evaluate(() => window.FFi18n.ready().then(() => 'ok')), 'ok', 'resolves at once in English');
  await page.evaluate(() => scrollTo(0, 1200)); await page.waitForTimeout(500);
  // the landmark at the top of the screen (the same kind i18n.js anchors on)
  const before = await page.evaluate(() => { const line = document.querySelector('header.bar').getBoundingClientRect().bottom; let best = null;
    for (const el of document.querySelectorAll('#view h2, #view h3, #view figure, #view section')) { const r = el.getBoundingClientRect(); if (r.height && r.top >= line - 1 && r.top < innerHeight && (!best || r.top < best.top)) best = { tag: el.tagName, i: [...document.querySelectorAll('#view ' + el.tagName)].indexOf(el), top: r.top }; }
    return best; });
  assert.ok(before, 'a landmark on screen');
  // a finger tap where the button is (page.click would first scroll the page to "reveal" the sticky header button)
  const tap = async () => { const bb = await page.locator('header.bar .ff-lang-mini').boundingBox(); await page.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); };
  await tap();
  await page.waitForFunction(() => document.documentElement.lang === 'es');
  await page.evaluate(() => window.FFi18n.ready());
  await page.waitForTimeout(800);
  const top = await page.evaluate(b => document.querySelectorAll('#view ' + b.tag)[b.i].getBoundingClientRect().top, before);
  assert.ok(Math.abs(top - before.top) <= 40, `the landmark moved ${Math.round(top - before.top)} px`);
  await tap();
  await page.waitForFunction(() => document.documentElement.lang === 'en');
  assert.deepEqual(errors, []);
  await ctx.close();
});
