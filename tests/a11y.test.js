// Wave 3 G: automated accessibility gate. axe-core 4.11.1 (WCAG 2.0/2.1/2.2 A and AA plus best practice) in headless Chromium at 1280 and 390 px,
// reduced motion on. Fails on ANY violation for the representative routes below (the full 77-route sweep is `node tools/a11y-audit.mjs`; its
// before/after counts are in app/docs/ux/A11Y_WAVE3.md), Also: every keyboard focus ring
// is >= 3:1 against its background, and the interactive states the route sweep cannot reach (reader pages, the Unit 1 sample and access card, hub and portal tabs, open
// dialogs) are scanned too.
const test = require('node:test');
const assert = require('node:assert/strict');

const H = () => import('./a11y-harness.mjs');
let h, site, browser;
test.before(async () => { h = await H(); site = await h.startSite(); browser = await h.loadChromium().launch(); });
test.after(async () => { await browser.close(); await site.close(); });

const REPRESENTATIVE = ['home', 'curriculum', 'readiness', 'options', 'for-centers', 'for-families', 'hub', 'signin-family', 'signin-teacher', 'portal', 'family-portal',
  'friends', 'rainbow', 'shop-programs', 'pricing', 'funding', 'watch', 'talk', 'teacher-standard', 'train-your-staff', 'unit-1', 'at-home', 'story-time',
  'story-time/booker-tries-again', 'activities', 'activities/smell-the-flower', 'printables', 'see-how', 'family-videos', 'my-week', 'bop-at-home', 'enroll', 'contact',
  'accessibility', 'academy', 'not-found'];
const fmt = (v) => v.map((x) => `${x.id} (${x.impact}, ${x.n}): ${x.nodes.map((n) => `${n.target} -> ${n.why}`).slice(0, 2).join(' || ')}`).join('\n');
const settle = (page) => page.waitForTimeout(150);                      // the heading/scroller pass runs on the next animation frame after a re-render

for (const width of [1280, 390]) {
  test(`axe: no violations on ${REPRESENTATIVE.length} representative routes at ${width}px`, async () => {
    const { ctx, page, errors } = await h.open(browser, width);
    const failed = [];
    for (const route of REPRESENTATIVE) {
      await h.goto(page, site.base, route);
      const v = await h.axe(page);
      if (v.length) failed.push(`#${route}\n${fmt(v)}`);
    }
    assert.deepEqual(failed, [], `axe violations at ${width}px:\n${failed.join('\n')}`);
    assert.deepEqual(errors, [], 'no page errors');
    await ctx.close();
  });
}

test('route-meta.js still lists the routes the sweep tool audits', async () => {
  const { ctx, page } = await h.open(browser, 1280);
  await h.goto(page, site.base, 'home');
  const routes = await h.routeList(page);
  assert.ok(routes.length >= 65, `route-meta lists ${routes.length} routes`);
  for (const r of ['signin-family', 'signin-teacher', 'friends', 'at-home', 'story-time', 'activities']) assert.ok(routes.includes(r), r);
  await ctx.close();
});

for (const width of [1280, 390]) {
  test(`axe: interactive states are clean (${width}px)`, async () => {
    const { ctx, page } = await h.open(browser, width);
    const failed = [], scan = async (label) => { await settle(page); const v = await h.axe(page, { openDetails: false }); if (v.length) failed.push(`${label}\n${fmt(v)}`); };
    // Story Time reader: cover, a page with point-and-read on, the end
    await h.goto(page, site.base, 'story-time/booker-tries-again');
    await page.click('[data-fl="point"]'); await scan('reader cover, point-and-read on');
    await page.click('[data-fl="next"]'); await scan('reader page 1');
    for (let i = 0; i < 20 && await page.$('[data-fl="next"]:not([disabled])'); i++) await page.click('[data-fl="next"]');
    await scan('reader end');
    // Unit 1 (IP lockdown 2026-10-07): the public summary with its sample day, and the Teacher Portal's access card (mocked staff session)
    await h.goto(page, site.base, 'unit-1');
    await page.click('[data-anchor="u1s-sample"]'); await scan('unit 1 summary, sample day');
    await h.goto(page, site.base, 'portal');
    await page.evaluate(() => { window.FFHub = { configured: true, connected: true, role: 'teacher', portalFor: () => 'portal' }; });
    await page.click('[data-ptab="curriculum"]'); await page.waitForSelector('.u1-locked'); await scan('portal curriculum access card');
    // Hub demo and the teacher portal tabs
    await h.goto(page, site.base, 'hub');
    for (const p of ['director', 'class', 'family']) { await page.click(`[data-portal="${p}"]`); await scan(`hub demo ${p}`); }
    await h.goto(page, site.base, 'portal');
    for (const t of [...new Set(await page.$$eval('[data-ptab]', (els) => els.map((e) => e.dataset.ptab)))]) { await page.click(`[data-ptab="${t}"]`); await scan(`portal tab ${t}`); }
    // menus and dialogs
    await h.goto(page, site.base, 'home');
    // Wave 6: the desktop More panel and the phone dropdown are one full-screen menu, scanned open at both widths.
    await page.click('#menuT'); await page.waitForSelector('#ffw-menu[open]'); await scan('full-screen menu open');
    for (const [name, trigger] of [['search dialog', '[data-px="search"]'], ['display preferences', '[data-px="settings"]']]) { await h.goto(page, site.base, 'home'); await page.click(trigger); await scan(name); }
    await h.goto(page, site.base, 'rainbow');
    const recipe = await page.$('[data-r]'); if (recipe) { await recipe.click(); await scan('recipe dialog'); }
    assert.deepEqual(failed, [], `axe violations in interactive states at ${width}px:\n${failed.join('\n')}`);
    await ctx.close();
  });
}

for (const width of [1280, 390]) {
  test(`keyboard focus ring is visible and >= 3:1 on every stop (${width}px)`, async () => {
    const { ctx, page } = await h.open(browser, width);
    const bad = [];
    for (const route of ['home', 'for-centers', 'enroll', 'watch', 'talk', 'unit-1', 'story-time/booker-tries-again', 'at-home', 'activities', 'my-week', 'hub', 'portal', 'pricing', 'learn', 'signin-teacher']) {
      await h.goto(page, site.base, route);
      for (const b of await h.focusRings(page, { max: 140 })) bad.push(`#${route}: <${b.tag.toLowerCase()} class="${b.cls}"> "${b.text}" ring ${b.color} ${b.ratio}:1 [${b.chain}]`);
    }
    assert.deepEqual(bad, [], `focus rings under 3:1:\n${bad.join('\n')}`);
    await ctx.close();
  });
}

test('heading outline: no level is skipped on any representative route (aria-level repairs count)', async () => {
  const { ctx, page } = await h.open(browser, 1280);
  const skips = [];
  for (const route of ['options', 'support', 'funding', 'jobs', 'news', 'privacy', 'portal', 'signin-teacher', 'activities']) {
    await h.goto(page, site.base, route);
    const levels = await page.evaluate(() => [...document.querySelectorAll('#view h1,#view h2,#view h3,#view h4,#view h5,#view h6,#view [role="heading"]')].filter((e) => e.offsetParent).map((e) => +(e.getAttribute('aria-level') || e.tagName[1])));
    for (let i = 1; i < levels.length; i++) if (levels[i] > levels[i - 1] + 1) skips.push(`#${route}: h${levels[i - 1]} then h${levels[i]}`);
  }
  assert.deepEqual(skips, []);
  await ctx.close();
});
