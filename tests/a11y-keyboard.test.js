// Wave 3 G: keyboard and screen-reader behaviour in headless Chromium, using only the keyboard.
//   Story Time reader: every control reachable, Enter/Space/arrow keys turn pages, focus stays on the control that was used, each page turn
//   is announced, the focus ring is visible (3:1 against its background), nothing moves under reduced motion.
//   Unit 1 summary (IP lockdown 2026-10-07: no day viewer on the public site): the sample-day anchor and download by keyboard, focus ring.
//   Dialogs (search, display preferences, recipe, logo reveal, advisor profile): opened by keyboard, focus inside, Tab never leaves,
//   Escape closes, focus goes back to where it was.
const test = require('node:test');
const assert = require('node:assert/strict');

const H = () => import('./a11y-harness.mjs');
let h, site, browser;
test.before(async () => { h = await H(); site = await h.startSite(); browser = await h.loadChromium().launch(); });
test.after(async () => { await browser.close(); await site.close(); });

// WCAG 1.4.11: the focus indicator against what it sits on. Walks up to the first opaque background.
const FOCUS_PROBE = () => {
  const el = document.activeElement, cs = getComputedStyle(el);
  const parse = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  let bg = null;
  for (let n = el.parentElement; n && !bg; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c && c.a > 0.9) bg = c; }
  bg = bg || { r: 255, g: 255, b: 255 };
  const style = cs.outlineStyle, width = parseFloat(cs.outlineWidth), oc = parse(cs.outlineColor);
  const own = parse(cs.backgroundColor), hasOwnBg = own && own.a > 0.9;
  let ratio = 0;
  if (style !== 'none' && width >= 2 && oc) { const a = lum(oc) + 0.05, b = lum(bg) + 0.05; ratio = Math.max(a, b) / Math.min(a, b); }
  // a button with its own fill: the ring also has to stand out from the fill it surrounds when offset is 0
  return { tag: el.tagName, text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30), style, width, offset: parseFloat(cs.outlineOffset), ratio: +ratio.toFixed(2), hasOwnBg: !!hasOwnBg };
};
const focusRing = (page) => page.evaluate(FOCUS_PROBE);
const announced = (page) => page.evaluate(() => (document.getElementById('ff-announce') || {}).textContent || '');
const active = (page) => page.evaluate(() => { const e = document.activeElement; return e ? { tag: e.tagName, fl: e.dataset ? e.dataset.fl || '' : '', id: e.id, text: (e.textContent || '').trim().slice(0, 40) } : null; });

async function tabTo(page, predicate, max = 80) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    const a = await page.evaluate(() => { const e = document.activeElement; return { fl: e.dataset ? e.dataset.fl || '' : '', u1: e.dataset ? e.dataset.u1Day || '' : '', id: e.id, tag: e.tagName, label: e.getAttribute('aria-label') || '', text: (e.textContent || '').trim().slice(0, 40) }; });
    if (predicate(a)) return a;
  }
  throw new Error('Tab never reached the target');
}

for (const width of [1280, 390]) {
  test(`Story Time reader is fully keyboard operable and announces page turns (${width}px)`, async () => {
    const { ctx, page, errors } = await h.open(browser, width);
    await h.goto(page, site.base, 'story-time/booker-tries-again');
    const total = await page.evaluate(() => document.querySelector('#flCount') && FFFamilyUI.R.page);   // sanity: reader is mounted
    assert.equal(total, 0);
    // every control is a real button reachable with Tab, in a sensible order
    const seen = [];
    // start at the first control above the reader (the site header is tested elsewhere). Wave 6: when the sticky "Back to Story Time"
    // chip leads to the same place, the reader's own "Bookshelf" link steps aside (one way back), so the chip is that control.
    await page.focus('#view .fl-back:not(.ffw-dup), #view .ffw-back');
    for (let i = 0; i < 12; i++) { await page.keyboard.press('Tab'); const a = await active(page); seen.push(a.fl || a.text); if (a.fl === 'next') break; }
    assert.ok(seen.includes('size') && seen.includes('point') && seen.includes('next'), `reader controls reachable by Tab: ${seen.join(' > ')}`);
    assert.equal((await active(page)).fl, 'next');
    const ring = await focusRing(page);
    assert.ok(ring.style !== 'none' && ring.width >= 2, `Next shows a focus ring: ${JSON.stringify(ring)}`);
    assert.ok(ring.ratio >= 3, `focus ring contrast >= 3:1 on Next: ${JSON.stringify(ring)}`);
    // Enter turns the page; focus stays on Next; the turn is announced with the page text
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
    assert.equal((await active(page)).fl, 'next', 'focus stays on Next after a page turn (the reader is redrawn)');
    assert.match(await page.textContent('#flCount'), /Page 1 of \d+/);
    assert.match(await announced(page), /^Page 1 of \d+\./, 'screen readers hear which page this is');
    assert.ok((await announced(page)).length > 25, 'and the page text');
    // Space does the same on a button
    await page.keyboard.press('Space'); await page.waitForTimeout(150);
    assert.match(await page.textContent('#flCount'), /Page 2 of/);
    // arrow keys turn pages from anywhere in the reader
    await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(150);
    assert.match(await page.textContent('#flCount'), /Page 1 of/);
    await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(150);
    assert.equal((await page.textContent('#flCount')).trim(), 'Cover');
    assert.match(await announced(page), /^Cover\./);
    // the stage is a named group the keyboard can land on, and the old aria-live-on-a-replaced-node is gone
    assert.equal(await page.getAttribute('#flStage', 'role'), 'group');
    assert.ok(await page.getAttribute('#flStage', 'aria-label'));
    assert.equal(await page.getAttribute('#flStage', 'aria-live'), null);
    // walk to the end with the keyboard only: Next becomes disabled and focus is not lost to <body>
    let guard = 0;
    while (guard++ < 30 && !(await page.$('[data-fl="next"][disabled]'))) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(60); }
    assert.equal((await page.textContent('#flCount')).trim(), 'The End');
    await page.keyboard.press('Tab');
    const after = await active(page);
    assert.notEqual(after.tag, 'BODY', 'focus is still inside the document at the end of the book');
    await page.keyboard.press('ArrowRight'); await page.waitForTimeout(150);
    assert.match(await announced(page), /last page/);
    // text size and point-and-read are announced
    await page.click('[data-fl="size"][data-d="1"]'); await page.waitForTimeout(150);
    assert.match(await announced(page), /Words: /);
    await page.click('[data-fl="point"]'); await page.waitForTimeout(150);
    assert.match(await announced(page), /Point and read is on/);
    assert.equal(await page.getAttribute('[data-fl="point"]', 'aria-pressed'), 'true');
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}

test('Story Time: nothing animates when the device asks for reduced motion', async () => {
  const { ctx, page } = await h.open(browser, 1280);
  for (const r of ['story-time', 'story-time/booker-tries-again', 'home', 'unit-1']) {
    await h.goto(page, site.base, r);
    const running = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').map((a) => a.animationName || a.transitionProperty || 'anim'));
    assert.deepEqual(running, [], `${r}: no running animations under prefers-reduced-motion`);
  }
  await ctx.close();
});

// Wave 7 GATE: the Unit 1 day viewer lives in the Teacher Portal's Curriculum tab for a signed-in staff session only. These tests
// open it with a mocked staff session (hub-backend.js shape), as tests/w7-gate.test.js does; before, they opened #unit-1.
for (const width of [1280, 390]) {
  test(`Unit 1 summary: "See a sample day" moves focus to the sample, whose download is keyboard reachable with a focus ring (${width}px)`, async () => {
    const { ctx, page, errors } = await h.open(browser, width);
    await h.goto(page, site.base, 'unit-1');
    await page.focus('[data-anchor="u1s-sample"]');
    await page.keyboard.press('Enter'); await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'u1s-sample', 'focus moves to the sample section');
    const a = await tabTo(page, (x) => x.tag === 'A' && /Sample: Day 9 teacher packet/.test(x.text), 30);
    assert.match(a.text, /Sample: Day 9/);
    const ring = await focusRing(page);
    assert.ok(ring.style !== 'none' && ring.width >= 2 && ring.ratio >= 3, `sample link focus ring: ${JSON.stringify(ring)}`);
    assert.equal(await page.$('[data-u1-day]'), null, 'no day viewer on the public site');
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}

// ---------------------------------------------------------------- dialogs
const DIALOGS = [
  { name: 'search', route: 'home', trigger: '[data-px="search"]', dlg: '#px-search' },
  { name: 'display preferences', route: 'home', trigger: '[data-px="settings"]', dlg: '#px-settings' },
  { name: 'recipe', route: 'rainbow', trigger: '[data-r]', dlg: '#dlg', before: async (page) => { await page.evaluate(() => document.querySelector('[data-r]') && 0); } },
  { name: 'logo reveal', route: 'home', trigger: '[data-brand-reveal]', dlg: '.ff-brand-dialog' }
];
for (const d of DIALOGS) {
  test(`dialog "${d.name}": keyboard open, focus trapped, Escape closes, focus returns`, async () => {
    const { ctx, page, errors } = await h.open(browser, 1280);
    await h.goto(page, site.base, d.route);
    if (d.name === 'recipe') {                                     // recipes live behind a level or a link; find any recipe button
      const found = await page.$(d.trigger);
      if (!found) await page.evaluate(() => { const b = document.querySelector('[data-lvl]'); if (b) b.click(); });
    }
    const trigger = (await page.$$(d.trigger))[0];
    assert.ok(trigger, `${d.name}: trigger exists on #${d.route}`);
    await trigger.focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction((s) => document.querySelector(s) && document.querySelector(s).open, d.dlg, { timeout: 5000 }).catch(() => {});   // wait for the dialog, not a fixed time: a busy page opens it late
    assert.equal(await page.evaluate((s) => document.querySelector(s).open, d.dlg), true, 'opens from the keyboard');
    assert.ok(await page.evaluate((s) => !!(document.querySelector(s).getAttribute('aria-labelledby') || document.querySelector(s).getAttribute('aria-label')), d.dlg), 'has an accessible name');
    // A native modal dialog makes the page inert: Tab cycles through the dialog and, in a real browser, the browser's own toolbar
    // (which headless shows as document.body). Focus must never land on anything in the page behind it.
    const inside = () => page.evaluate((s) => { const e = document.activeElement; return !e || e === document.body || document.querySelector(s).contains(e); }, d.dlg);
    assert.equal(await page.evaluate((s) => document.querySelector(s).contains(document.activeElement), d.dlg), true, 'focus starts inside');
    for (let i = 0; i < 14; i++) { await page.keyboard.press('Tab'); assert.equal(await inside(), true, `Tab ${i + 1} never reaches the page behind the dialog`); }
    for (let i = 0; i < 4; i++) { await page.keyboard.press('Shift+Tab'); assert.equal(await inside(), true, 'Shift+Tab never reaches the page behind the dialog'); }
    await page.keyboard.press('Escape');
    await page.waitForFunction((s) => !document.querySelector(s).open, d.dlg, { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate((s) => document.querySelector(s).open, d.dlg), false, 'Escape closes');
    const back = await page.evaluate(() => { const e = document.activeElement; return e && e !== document.body ? (e.getAttribute('data-px') || e.getAttribute('data-r') || e.hasAttribute('data-brand-reveal') && 'brand' || e.tagName) : 'BODY'; });
    assert.notEqual(back, 'BODY', 'focus is not dropped on the page body');
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}

test('advisor profile dialog: opens from its button, traps focus, Escape returns focus to the button', async () => {
  const { ctx, page, errors } = await h.open(browser, 1280);
  for (const r of ['curriculum', 'academy']) {
    await h.goto(page, site.base, r);
    if (await page.$('[data-advisor-profile]')) break;
  }
  const btn = await page.$('[data-advisor-profile]');
  assert.ok(btn, 'an advisor profile button exists on one of the routes');
  await btn.focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(250);
  assert.equal(await page.evaluate(() => document.querySelector('.ff-advisor-dialog').open), true);
  for (let i = 0; i < 8; i++) { await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => { const e = document.activeElement; return !e || e === document.body || document.querySelector('.ff-advisor-dialog').contains(e); }), true); }
  await page.keyboard.press('Escape'); await page.waitForTimeout(250);
  assert.equal(await page.evaluate(() => document.activeElement.hasAttribute('data-advisor-profile')), true, 'focus returns to the profile button');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('"See a sample day" style anchor buttons move keyboard focus to the section they scroll to', async () => {
  const { ctx, page } = await h.open(browser, 1280);
  await h.goto(page, site.base, 'unit-1');
  await page.focus('[data-anchor="u1s-sample"]');
  await page.keyboard.press('Enter'); await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'u1s-sample');
  await ctx.close();
});

// ---------------------------------------------------------------- navigation (wave 6: one full-screen menu replaces More and the phone dropdown)
for (const width of [1280, 390]) {
  test(`full-screen menu (${width}px): opens from the keyboard, traps focus, Escape closes and returns focus to Menu`, async () => {
    const { ctx, page, errors } = await h.open(browser, width);
    await h.goto(page, site.base, 'home');
    await page.focus('#menuT');
    assert.equal(await page.getAttribute('#menuT', 'aria-expanded'), 'false');
    assert.equal(await page.getAttribute('#menuT', 'aria-controls'), 'ffw-menu');
    await page.keyboard.press('Enter');
    await page.waitForSelector('#ffw-menu[open]');
    assert.equal(await page.getAttribute('#menuT', 'aria-expanded'), 'true');
    assert.equal(await page.evaluate(() => !!document.activeElement.closest('#ffw-menu')), true, 'focus moved into the menu');
    for (let i = 0; i < 40; i++) { await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => !!document.activeElement.closest('#ffw-menu')), true, `Tab ${i + 1} stays in the menu`); }
    for (let i = 0; i < 6; i++) { await page.keyboard.press('Shift+Tab'); assert.equal(await page.evaluate(() => !!document.activeElement.closest('#ffw-menu')), true, 'Shift+Tab stays in the menu'); }
    await page.keyboard.press('Escape'); await page.waitForTimeout(250);
    assert.equal(await page.evaluate(() => document.getElementById('ffw-menu').open), false, 'Escape closes');
    assert.equal(await page.getAttribute('#menuT', 'aria-expanded'), 'false');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'menuT', 'focus returned to the Menu button');
    // the main list is a nav with a name, the current page is marked, and every link has a visible name
    await h.goto(page, site.base, 'pricing');   // a centers page that is in the centers header (audience split)
    const nav = await page.evaluate(() => { const n = document.querySelector('nav.px-main'); return { name: n && n.getAttribute('aria-label'), current: document.querySelectorAll('.px-main [aria-current="page"]').length, unnamed: [...document.querySelectorAll('nav a, nav button')].filter(a => !(a.textContent.trim() || a.getAttribute('aria-label'))).length }; });
    assert.ok(nav.name, 'main navigation has an accessible name');
    assert.equal(nav.current, 1, 'the current page is marked in the header');
    assert.equal(nav.unnamed, 0, 'no unnamed navigation controls');
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}
