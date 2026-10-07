// Wave 4 lane HOME (owner 2026-10-06): "if somebody's visiting the site for the first time, they should not be seeing things to download
// ... things that are supposed to be for only teachers ... for only parents ... needs to be cleaned up and way more Professional."
// Real headless Chromium at 1280 and 390 px (harness as tests/a11y.test.js). Encodes: no downloads, portals, dashboards, sample data,
// status tables or draft badges on #home; a link/button budget and page-height ceiling; one quiet status line from the release manifest;
// three audience doors; the labelled photo/video placeholders stay on Home; and every section moved off Home renders on its new page.
const test = require('node:test');
const assert = require('node:assert/strict');

const H = () => import('./a11y-harness.mjs');
let h, site, browser;
test.before(async () => { h = await H(); site = await h.startSite(); browser = await h.loadChromium().launch(); });
test.after(async () => { await browser.close(); await site.close(); });

const BUDGET = 25;                                   // links inside #view on Home (wave 6: was links + buttons, see below)
// Wave 6 (owner 2026-10-06: "way more interactive"): the only buttons Home may add are the friend toys (the four hero friends, the
// four pick-a-friend tabs) and the logo reveal; every other control is a link and the links stay within the budget.
const BUTTONS = 9;
// Wave 8 (owner-approved story-world animation): the hello loop and the picked friend's loop each carry a visible pause/play
// button (WCAG 2.2.2), so Home may add exactly those two. (Wave 9: the hello frame's clip is now the talking intro; same one button,
// which also replays it at the end.)
const VIDEO_BUTTONS = 2;
// Branded rooms (owner 2026-10-07): each concept room photo carries a 'Real room / With the kit' pair, so the real photo is one tap away.
const KIT_BUTTONS = 4;
// document height ceilings (204bd4a: 7,724 and 13,878; wave 4: 4,400 and 7,000; wave 6 adds the friend picker, the felt path and
// "What we have built": measured 5,947 and 8,688)
// 2026-10-07 (owner): the welcome video got its own big section under the hero (+1,100 px at 1280, +800 at 390, measured 7,558
// and 9,536); the small slot it left in the photo row is gone
const HEIGHT = { 1280: 7800, 390: 9900 };

const homeFacts = page => page.evaluate(() => {
  const v = document.querySelector('#view');
  const links = [...v.querySelectorAll('a[href]')];
  const vis = el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  return {
    text: v.innerText,
    hrefs: links.map(a => a.getAttribute('href')),
    downloads: links.filter(a => a.hasAttribute('download') || /\.(pdf|zip|docx?|csv)(\?|#|$)/i.test(a.getAttribute('href')) || /^printables\//.test(a.getAttribute('href'))).length,
    controls: v.querySelectorAll('a[href],button').length,
    links: v.querySelectorAll('a[href]').length,
    buttons: [...v.querySelectorAll('button')].map(b => b.matches('.ffa-friend') ? 'friend' : b.matches('[role=tab].hc-picktab') ? 'tab' : b.matches('[data-brand-reveal]') ? 'reveal' : b.matches('.hc-vbtn[data-video-toggle]') ? 'video' : b.matches('.hc-vsound') ? 'sound' : b.matches('.ffa-kit-toggle [data-kit-show]') ? 'kit' : b.outerHTML.slice(0, 80)),
    hello: [...v.querySelectorAll('.hc-intro .hc-hello')].map(f => ({ vis: vis(f), cap: (f.querySelector('figcaption b') || {}).textContent, video: !!f.querySelector('video[aria-label]') })),
    strip: v.querySelectorAll('#rt-strip,.rt-strip,.rt-ev').length,
    samples: v.querySelectorAll('[data-sample],.fj-sample,.rt-sample,.fj-shot,.fj-thumb').length,
    screenshots: [...v.querySelectorAll('img')].filter(i => /img\/journey\/|previews\//.test(i.getAttribute('src'))).length,
    draftFlags: v.querySelectorAll('.ffa-flag-draft').length,
    height: document.documentElement.scrollHeight,
    headings: [...v.querySelectorAll('h1,h2,h3,h4')].map(x => +x.tagName[1]),
    status: [...v.querySelectorAll('.hc-status')].map(s => ({ text: s.innerText, version: s.dataset.releaseVersion, href: (s.querySelector('a') || {}).getAttribute && s.querySelector('a').getAttribute('href') })),
    manifest: window.FFRelease && window.FFRelease.data ? { version: window.FFRelease.data.version, open: !!window.FFRelease.data.commercial.ordering_open } : null,
    doors: [...v.querySelectorAll('.hc-door')].map(d => ({ links: [...d.querySelectorAll('a[href],button')].map(a => a.getAttribute('href')), words: d.querySelector('p').innerText.split(/\s+/).length })),
    real: [...v.querySelectorAll('.hc-slots [data-real-photo]')].map(i => i.dataset.realPhoto),
    slots: [...v.querySelectorAll('[data-placeholder]')].map(s => ({ vis: vis(s), tag: (s.querySelector('.ffa-slot-tag') || {}).textContent, cap: (s.querySelector('figcaption b') || {}).textContent })),
    stage: v.querySelectorAll('.px-homehero .ffa-stage .ffa-friend').length,
    reveal: v.querySelectorAll('[data-brand-reveal]').length
  };
});

for (const width of [1280, 390]) {
  test(`#home at ${width}px: no downloads, portals, dashboards, sample data, status tables or draft badges`, async () => {
    const { ctx, page, errors } = await h.open(browser, width);
    await h.goto(page, site.base, 'home', 600);
    const f = await homeFacts(page);
    assert.equal(f.downloads, 0, 'no download, PDF or printable links');
    assert.doesNotMatch(f.text, /\bdownload\b|\bPDF\b/i, 'no download wording');
    for (const r of ['#signin-teacher', '#signin-family', '#portal', '#family-portal', '#hub', '#learn'])
      assert.ok(!f.hrefs.some(x => x === r || x.startsWith(r + '/')), `no ${r} link in #view (portals stay in the top utility bar)`);
    // Wave 7 GATE (owner 2026-10-06): #unit-1 is the public curriculum summary, so the proof band's Unit 1 tile may link to it
    // (exactly one link); never to a Unit 1 day.
    assert.ok(f.hrefs.filter(x => x === '#unit-1').length <= 1, 'at most the proof band tile links the summary');
    assert.ok(!f.hrefs.some(x => x.startsWith('#unit-1/')), 'no #unit-1/<day> link in #view');
    assert.doesNotMatch(f.text, /Teacher Portal|Family Portal|dashboard|Sample data|made-up children/i, 'no portal, dashboard or sample-data copy');
    assert.equal(f.strip, 0, 'no release strip or evidence item');
    assert.equal(f.samples + f.screenshots, 0, 'no sample screenshots or packet previews');
    assert.equal(f.draftFlags, 0, 'no Draft art badge');
    assert.doesNotMatch(f.text, /\blicensed\b|infant room|\b\d{1,2}(:\d\d)?\s?(a\.?m\.?|p\.?m\.?)\b/i, 'no licensed, infant-room or hours claims');
    assert.deepEqual(errors, [], 'no page errors');
    await ctx.close();
  });

  test(`#home at ${width}px: calm structure, budget and height`, async () => {
    const { ctx, page, errors } = await h.open(browser, width);
    await h.goto(page, site.base, 'home', 600);
    const f = await homeFacts(page);
    assert.ok(f.links <= BUDGET, `links in #view: ${f.links} <= ${BUDGET}`);
    // wave 9 (owner 2026-10-07): plus the welcome video's 'Tap for sound' button, shown only while it plays silently
    assert.ok(f.buttons.filter(b => b === 'kit').length <= KIT_BUTTONS, 'at most two Real room / With the kit toggles'); f.buttons = f.buttons.filter(b => b !== 'kit'); f.controls -= KIT_BUTTONS;
    assert.ok(f.buttons.length <= BUTTONS + VIDEO_BUTTONS + 1 && f.buttons.filter(b => b !== 'video' && b !== 'sound').length <= BUTTONS && f.buttons.filter(b => b === 'video').length <= VIDEO_BUTTONS && f.buttons.filter(b => b === 'sound').length <= 1 && f.buttons.every(b => ['friend', 'tab', 'reveal', 'video', 'sound'].includes(b)), `buttons are only the friend toys, the logo reveal and the two animation pause buttons: ${f.buttons.join(', ')}`);
    assert.ok(f.controls <= BUDGET + BUTTONS + VIDEO_BUTTONS, `links and buttons in #view: ${f.controls} <= ${BUDGET + BUTTONS + VIDEO_BUTTONS}`);
    assert.ok(f.height <= HEIGHT[width], `page height ${f.height} <= ${HEIGHT[width]}`);
    // headings: one h1, then h2 sections; never skip a level
    assert.equal(f.headings[0], 1); assert.equal(f.headings.filter(x => x === 1).length, 1);
    f.headings.forEach((x, i) => { if (i) assert.ok(x <= f.headings[i - 1] + 1, `heading order ${f.headings.join(',')}`); });
    // the hero is kept: four friends on the stage
    assert.equal(f.stage, 4, 'hero stage keeps its four friend buttons');
    // three doors: one sentence and exactly one button each, to the audience pages
    assert.deepEqual(f.doors.map(d => d.links), [['#for-centers'], ['#for-home'], ['#for-families']]);
    for (const d of f.doors) assert.ok(d.words <= 25, 'one short sentence per door');
    // ONE quiet status line, from the same release manifest as the strip
    assert.equal(f.status.length, 1, 'one status line');
    assert.match(f.status[0].text, /Piloting in Independence, Missouri/);
    assert.match(f.status[0].text, f.manifest.open ? /Ordering is open/ : /Ordering opens soon/);
    assert.equal(f.status[0].version, f.manifest.version, 'status line reads the release manifest');
    assert.equal(f.status[0].href, '#pricing', 'links to the full status on #pricing');
    // placeholders are never removed, only labelled: the photo frames that promise our real center stay on Home, visible and
    // labelled. Wave 8: the first frame ("A short hello from the four friends", a story-world video) is now filled with the
    // owner-approved story-world animation, captioned as such; the three real-center frames stay placeholders.
    // Gap fill (2026-10-07): the three real-center frames now show real photos of Futures Learning Center, so no placeholder is left.
    assert.equal(f.slots.length, 0, 'no empty placeholder frames on Home');
    assert.deepEqual(f.real, ['reading-corner', 'blue-table-room', 'exterior'], 'three real photos of our center');
    // Wave 9 (owner-approved 2026-10-07): the frame now holds the four friends' talking intro; its caption changed with it, still "Story-world".
    assert.deepEqual(f.hello, [{ vis: true, cap: 'Story-world animation: meet the four friends.', video: true }], 'the welcome video (its own big section since 2026-10-07) says it is story-world animation');
    assert.match(f.text, /Our center, in real photos/);
    assert.match(f.text, /not yet approved by either state/, 'Teacher Standard honesty line kept');
    assert.equal(f.reveal, 1, 'the logo reveal is still reachable on Home');
    assert.deepEqual(errors, [], 'no page errors');
    await ctx.close();
  });
}

// Old Home section -> where it lives now. Each must render (visible, with its content) on its destination.
const MOVED = [
  // wave 7 GATE: the strip's lesson evidence is the Unit 1 summary (was the Day 9 packet page and its PDF)
  ['release strip (Available now / Included at launch / Planned, Unit 1 summary)', 'pricing', '#rt-strip', /Where Futures Friends stands today[\s\S]*Unit 1 at a glance[\s\S]*Read the Unit 1 summary/],
  ['release strip on the center page', 'for-centers', '#rt-strip', /Available now/],
  ['doors: center lists and sample screenshots', 'for-centers', '.fj-provider', /See it, scope it, start it[\s\S]*Sample data/],
  ['doors: home daycare lists and sample screenshots', 'for-home', '.fj-provider', /See it, scope it, start it[\s\S]*Sample data/],
  ['doors: the family activity for tonight', 'for-families', '.fj-family', /Try one tonight/],
  ['More than a login (zone map and checklist)', 'for-centers', '#ff-map', /More than a login[\s\S]*Futures Hub/],
  ['A friend for every discovery (carousel)', 'friends', '#ff-rooms[data-interactive]', /Confidence/],
  ['six-step learning loop', 'curriculum', '#ff-loop[data-interactive]', /From a six-minute story to a whole day of learning/],
  ['the stats grid', 'curriculum', '#ff-loop .ffhl-stats', /theme weeks across 12 monthly units[\s\S]*minute weekly ceiling/],
  ['More than daycare (whole-child band)', 'for-families', '.wc-callout-home', /More than daycare\. A system families can see\./],
  ['Teacher Standard in full (Ms. June, train your staff)', 'teacher-standard', '#view', /Story-world character[\s\S]*Train your staff/i],
  ['Try something with a friend (supporting characters; wave 5 heading)', 'friends', '.ff-community', /Try something with a friend\./],
  ['Meet the whole town (wave 5: every story-world character, to scale)', 'friends', '.ff-town', /Meet the whole town/],
  ['Meet the Futures Friends Academy', 'teacher-standard', '.px-academyband', /Meet the Futures Friends Academy\.[\s\S]*Explore the Academy/]
];
for (const width of [1280, 390]) {
  test(`every section moved off Home renders on its new page (${width}px)`, async () => {
    const { ctx, page, errors } = await h.open(browser, width);
    const missing = [];
    for (const [what, route, sel, re] of MOVED) {
      await h.goto(page, site.base, route, 300);
      const el = await page.$(sel);
      const ok = el && await el.isVisible() && re.test(await el.innerText());
      if (!ok) missing.push(`${what} -> #${route} ${sel}`);
    }
    assert.deepEqual(missing, []);
    // the moved interactive pieces still work on their new pages
    await h.goto(page, site.base, 'friends', 300);
    await page.click('#ff-rooms [data-room-direction="1"]');
    assert.match(await page.textContent('#ff-rooms .ff-home-status'), /^Lumi, 2 of 4/);
    await h.goto(page, site.base, 'curriculum', 300);
    await page.click('#ff-loop [data-loop-step="3"]');
    assert.equal((await page.textContent('#ff-loop .ffhl-center b')).trim(), 'Move');
    // the portals stay one tap away in the utility bar
    await h.goto(page, site.base, 'home', 300);
    assert.equal(await page.locator('.px-utility a[href="#signin-teacher"]').count(), 1);
    assert.equal(await page.locator('.px-utility a[href="#signin-family"]').count(), 1);
    assert.deepEqual(errors, [], 'no page errors');
    await ctx.close();
  });
}
