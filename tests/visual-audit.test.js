// Visual audit regression (owner 2026-10-07: "no overlapping of words or pictures on top of things, things are symmetrical and right").
// Scrolls key routes top to bottom in Chromium and runs tests/visual-audit-detect.mjs at every screenful: no line of text may have an
// image/box/other text painted on top of it, nothing may stick out past the screen edge, no broken or stretched image.
// Fixed layers (header, sound pill, back-to-top) are excluded: content scrolls under them by design.
const test = require('node:test');
const assert = require('node:assert');

const ROUTES = [
  ['home', 390], ['at-home', 390], ['at-home', 1280], ['teacher-standard', 390], ['talk', 768], ['curriculum', 390], ['for-families', 390],
  ['friends', 390], ['pricing', 390], ['whole-child', 390], ['story-time', 390], ['shop-programs', 1280], ['shop-programs', 390], ['for-centers', 768], ['for-centers', 390],
  ['watch', 390], ['account', 390], ['reset-password', 768],
];
const HEIGHT = { 390: 844, 768: 1024, 1280: 800 };
let h, srv, browser, detect;
test.before(async () => {
  h = await import('./a11y-harness.mjs'); ({ detect } = await import('./visual-audit-detect.mjs'));
  srv = await h.startSite(); browser = await h.loadChromium().launch();
});
test.after(async () => { await browser.close(); await srv.close(); });

async function scan(route, w) {
  const ctx = await browser.newContext({ viewport: { width: w, height: HEIGHT[w] }, reducedMotion: 'reduce', hasTouch: w < 768, isMobile: w < 768 });
  await ctx.addInitScript(() => { try { localStorage.setItem('ff-sound-v2', 'off'); } catch (_) {} });
  const page = await ctx.newPage();
  await h.goto(page, srv.base, route, 900);
  const found = [];
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0, i = 0; y < total + HEIGHT[w] && i < 40; y += Math.round(HEIGHT[w] * 0.8), i++) {
    await page.evaluate((y) => window.scrollTo(0, y), y); await page.waitForTimeout(250);
    for (const x of await page.evaluate(detect, { tiny: false })) if (!x.fixed && x.kind !== 'clipped' && x.kind !== 'blocked') found.push(x);
  }
  await ctx.close();
  const seen = new Set();
  return found.filter((x) => { const k = x.kind + x.el + (x.by || ''); if (seen.has(k)) return false; seen.add(k); return true; });
}

for (const [route, w] of ROUTES) {
  test(`#${route} at ${w}px: no text under pictures, nothing past the screen edge, no broken or stretched images`, async () => {
    const bad = await scan(route, w);
    assert.deepStrictEqual(bad.map((x) => `${x.kind}: "${x.text || x.src || ''}" ${x.el}${x.by ? ' under ' + x.by : ''}`), []);
  });
}

test('the floating dock (Sound, Nature, back-to-top) tucks to an edge tab over words and controls, comes back on a tap without acting, and stays out over the hero picture (390)', async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await h.goto(page, srv.base, 'home', 1500);
  assert.equal(await page.evaluate(() => document.documentElement.classList.contains('ff-dock-tuck')), false, 'over the hero meadow the dock is out');
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await page.waitForTimeout(700);
  const s = await page.evaluate(() => ({ tuck: document.documentElement.classList.contains('ff-dock-tuck'), vis: [...document.querySelectorAll('.ffs .ffs-btn:not([hidden]),.totop.on')].map((b) => innerWidth - b.getBoundingClientRect().left) }));
  assert.equal(s.tuck, true, 'over the footer words the dock tucks');
  assert.ok(s.vis.length >= 2 && s.vis.every((v) => v >= 10 && v <= 18), `only an edge tab shows: ${s.vis}`);
  const before = await page.getAttribute('.ffs-main', 'aria-pressed');
  await page.click('.ffs-main', { force: true }); await page.waitForTimeout(400);
  assert.equal(await page.evaluate(() => document.documentElement.classList.contains('ff-dock-tuck')), false, 'a tap brings it back');
  assert.equal(await page.getAttribute('.ffs-main', 'aria-pressed'), before, 'the tap that brings it back does not toggle sound');
  assert.equal(await page.evaluate(() => scrollY > 500), true, 'nor jump to the top');
  await page.waitForFunction(() => document.documentElement.classList.contains('ff-dock-tuck'), null, { timeout: 12000 });   // and tucks again after a few seconds
  await ctx.close();
});

test('a hero friend card that opens under the dock (1280x720) is never covered: the dock tucks or the two do not touch', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await h.goto(page, srv.base, 'home', 1500);
  const friends = await page.$$('button.ffa-friend');
  for (const i of [friends.length - 1, 0]) {
    await friends[i].click(); await page.waitForTimeout(700);
    const r = await page.evaluate(() => {
      const say = document.querySelector('.mh-say:not([hidden])'); if (!say) return { open: false };
      const s = say.getBoundingClientRect(), tuck = document.documentElement.classList.contains('ff-dock-tuck');
      const hit = [...document.querySelectorAll('.ffs .ffs-btn:not([hidden]),.totop.on')].map((b) => b.getBoundingClientRect()).some((q) => q.left < s.right && q.right > s.left && q.top < s.bottom && q.bottom > s.top);
      return { open: true, tuck, hit };
    });
    assert.ok(r.open, 'the card opened');
    assert.ok(r.tuck || !r.hit, 'the Sound/Nature buttons cover the friend card');
  }
  await ctx.close();
});

// ---- follow-ups (audit pass 2, 2026-10-07)
test('#account and #reset-password are real pages (not "We can\'t find that page") and lead to the sign-in pages', async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  for (const r of ['account', 'reset-password', 'reset-password/family']) {
    await h.goto(page, srv.base, r, 600);
    const t = await page.evaluate(() => ({ h1: document.querySelector('#view h1') && document.querySelector('#view h1').textContent, lost: !!document.querySelector('#view .ffa-404'), go: [...document.querySelectorAll('#view [data-go]')].map((b) => b.dataset.go) }));
    assert.equal(t.lost, false, `#${r} shows the 404`);
    assert.ok(t.go.includes('signin-teacher') && t.go.includes('signin-family'), `#${r} offers both sign-in pages: ${t.go}`);
  }
  await ctx.close();
});

test('#watch (390, motion on): Bop by the TV never comes down over the captions note, not even while he fades in', async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await h.goto(page, srv.base, 'watch', 300);
  let worst = -999;
  for (let i = 0; i < 16; i++) {
    worst = Math.max(worst, await page.evaluate(() => { const b = document.querySelector('.ffx-tv-bop'), n = document.querySelector('.ffx-tv + .ffcap-note, .ffx-tv ~ .ffcap-note'); if (!b || !n || +getComputedStyle(b).opacity === 0) return -999; return b.getBoundingClientRect().bottom - n.getBoundingClientRect().top; }));
    await page.waitForTimeout(150);
  }
  assert.ok(worst <= 0, `Bop overlaps the captions note by ${worst}px`);
  await ctx.close();
});

test('#job (768): no layout shift when the page renders (the "Talk to a real person" band is not painted until the view is)', async () => {
  const ctx = await browser.newContext({ viewport: { width: 768, height: 1024 } });
  await ctx.addInitScript(() => { window.__cls = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); });
  const page = await ctx.newPage();
  await h.goto(page, srv.base, 'job', 3500);
  const cls = await page.evaluate(() => window.__cls);
  assert.ok(cls < 0.05, `CLS ${cls.toFixed(3)}`);
  await ctx.close();
});

test('#for-centers (1280): the Sound/Nature dock tucks over card bodies, even a card\'s empty corner', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await h.goto(page, srv.base, 'for-centers', 1500);
  const total = await page.evaluate(() => document.documentElement.scrollHeight), bad = [];
  for (let y = 600; y < total - 1200; y += 400) {
    await page.evaluate((y) => window.scrollTo(0, y), y); await page.waitForTimeout(450);
    const r = await page.evaluate(() => {
      if (document.documentElement.classList.contains('ff-dock-tuck')) return null;
      for (const b of document.querySelectorAll('.ffs .ffs-btn:not([hidden]),.totop.on')) { const q = b.getBoundingClientRect();
        for (const [x, y] of [[q.left, q.top], [q.left + q.width / 2, q.top + q.height / 2], [q.left, q.bottom]]) { const c = document.elementsFromPoint(x, y).find((e) => !e.closest('.ffs,.totop') && e.closest('.card,li,article')); if (c) return c.className; } }
      return null;
    });
    if (r) bad.push(`${y}: ${r}`);
  }
  assert.deepStrictEqual(bad, []);
  await ctx.close();
});

test('Home: the walking Booker and his trail never paint over words (390, 768, motion on)', async () => {
  for (const w of [390, 768]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: HEIGHT[w] }, hasTouch: w < 768, isMobile: w < 768 });
    await ctx.addInitScript(() => { try { localStorage.setItem('ff-sound-v2', 'off'); } catch (_) {} });
    const page = await ctx.newPage();
    await h.goto(page, srv.base, 'home', 4500);
    const total = Math.min(4000, await page.evaluate(() => document.documentElement.scrollHeight)), bad = [];
    for (let y = 0; y < total; y += 120) {
      await page.evaluate((y) => window.scrollTo(0, y), y); await page.waitForTimeout(90);
      for (const x of await page.evaluate(detect, { tiny: false, overflow: false })) if (x.kind === 'covered' && /bw-/.test(x.by || '')) bad.push(`${w}@${y}: "${x.text}" under ${x.by}`);
    }
    await ctx.close();
    assert.deepStrictEqual(bad, []);
  }
});
