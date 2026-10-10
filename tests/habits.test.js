// Habit cards (habits.js): the public QR player (#habit/<id>, prerendered as habit-<id>.html) and the families' explainer (#habits).
//   - the card address is a plain URL per habit and language; the player reads only ?l= and never anything personal
//   - every habit: a friend, art, 15 to 45 seconds, English + Spanish (draft), positive words, no scores
//   - existing clips reused with both caption tracks; the public page offers no printable character art, only a "Sample" picture
//   - a real browser: a QR scan lands straight on the friend (no entry gate), tap to play, the steps, "All done!", replay, Spanish
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { site, read, text, ROOT } = require('./site-vm');

const H = require('../habits.js');
const PLAIN = /^https:\/\/dvolcore\.github\.io\/futures-friends\/habit-[a-z]+(?:-[a-z]+)*(?:\?l=es)?$/;
const exists = f => fs.existsSync(path.join(ROOT, f));

test('13 habits, unique ids, each with a lead friend, art, a place for the card and both languages', () => {
  assert.equal(H.HABITS.length, 13);
  assert.equal(new Set(H.HABITS.map(h => h.id)).size, 13);
  for (const h of H.HABITS) {
    assert.match(h.id, /^[a-z]+(-[a-z]+)*$/);
    assert.ok(['booker', 'lumi', 'zuri', 'bop'].includes(h.k), h.id);
    assert.ok(exists(`img/plush/characters/${h.pose}-480.webp`) && exists(`img/plush/characters/${h.pose}-960.webp`), `${h.id} art`);
    assert.ok(h.where[0] && h.where[1], h.id);
    for (const l of ['en', 'es']) {
      assert.ok(h[l].name && h[l].with && h[l].done, `${h.id} ${l}`);
      if (!h.video) assert.equal(h[l].steps.length, h.en.steps.length, `${h.id} ${l} steps`);
    }
    assert.deepEqual(h.audio, { en: null, es: null }, `${h.id}: the optional audio slot is there and empty (voice work paused)`);
    const s = H.seconds(h);
    assert.ok(s >= 15 && s <= 45, `${h.id}: ${s} s`);
  }
});

test('the card address: site + habit + ?l=es, nothing else; the player reads only the language from it', () => {
  for (const h of H.HABITS) {
    assert.equal(H.url(h.id, 'en'), `https://dvolcore.github.io/futures-friends/habit-${h.id}`);
    assert.equal(H.url(h.id, 'es'), `https://dvolcore.github.io/futures-friends/habit-${h.id}?l=es`);
    assert.match(H.url(h.id, 'en'), PLAIN); assert.match(H.url(h.id, 'es'), PLAIN);
  }
  assert.equal(H.langFromSearch('?l=es'), 'es');
  assert.equal(H.langFromSearch('?kid=Mia&l=en'), 'en');
  assert.equal(H.langFromSearch('?child=1'), null);
  const src = read('habits.js');
  assert.doesNotMatch(src, /localStorage|sessionStorage|document\.cookie|indexedDB/, 'the player stores nothing');
  assert.doesNotMatch(src, /speechSynthesis|SpeechSynthesisUtterance|FFVoices/, 'no voice: captions only');
  assert.match(src, /const SOUND_ALLOWED = false;/, 'all sound off');
  assert.match(src, /W\.FF_SOUND_OFF/, 'the site-wide kill switch is respected');
  assert.match(src, /v\.muted = true;/); assert.match(src, /v\.controls = false;/);
  assert.doesNotMatch(src, /searchParams\.get\((?!'l')|URLSearchParams\([^)]*\)\.get\((?!'l')/, 'reads no other address parameter');
  // statistics: only the habit id and the language
  for (const m of src.matchAll(/ffTrack\(name, (\{[^}]*\})\)/g)) assert.equal(m[1], '{ habit: h.id, lang }');
  assert.match(src, /count\('habit_play', h, lang\)/); assert.match(src, /count\('habit_done', h, lang\)/);
});

test('the player: big tap-to-play, the friend, captions, replay, "All done!", language switch; Spanish marked draft', () => {
  const S = site();
  for (const h of H.HABITS) {
    const html = S.render('habit', h.id), t = text(html);
    assert.match(html, new RegExp(`data-hb="${h.id}"`));
    assert.match(html, /<h1 class="hb-title">/);
    assert.match(html, /class="hb-play" data-hb-act="play"/);
    assert.match(html, /data-hb-act="again"/);
    assert.match(html, /data-hb-act="lang"/);
    assert.match(html, /data-i18n-skip/);
    assert.match(t, /All done!/);
    assert.match(t, new RegExp(h.en.done.replace(/[.?!]/g, '\\$&')));
    assert.doesNotMatch(t, /score|points|streak|wrong|bad|don't|never/i, `${h.id}: positive words only`);
    if (h.video) {
      assert.match(html, new RegExp(`<source src="video/${h.video}\\.mp4"`));
      for (const f of [`video/${h.video}.mp4`, `video/${h.video}.en.vtt`, `video/${h.video}.es.vtt`, `video/${h.video}-poster.jpg`]) assert.ok(exists(f), f);
      assert.match(html, /srclang="en"[^>]*default/);
    } else {
      assert.match(html, /class="hb-cap" aria-live="polite"/);
      assert.equal((html.match(/<ol class="hb-dots"[^>]*>([\s\S]*?)<\/ol>/)[1].match(/<li>/g) || []).length, h.en.steps.length);
    }
  }
  const es = S.render('habit', 'wash-hands');   // the VM has no ?l=, so English
  assert.match(es, /lang="en"/);
  const vm = require('node:vm'); vm.runInContext("location.search='?l=es'", S);
  const sp = S.render('habit', 'wash-hands');
  assert.match(sp, /data-hb-lang="es"/); assert.match(text(sp), /Lávate las manos/); assert.match(text(sp), /borrador/i); assert.match(text(sp), /¡Listo!/);
  assert.match(S.render('habit', 'calm-breathing'), /srclang="es"[^>]*default/);
  assert.match(S.render('habit', 'no-such-habit'), /data-hb="wash-hands"/, 'an unknown id shows the first habit, never an error');
});

test('#habits: how it works, every habit to try, a "Sample" picture, privacy, and enroll / partner links; no printable art', () => {
  const html = site().render('habits'), t = text(html);
  assert.match(t, /Habit cards/); assert.match(t, /How habit cards work/);
  for (const h of H.HABITS) assert.ok(html.includes(`href="#habit/${h.id}"`), h.id);
  assert.match(html, /src="img\/habits\/habit-card-sample-640\.webp"[^>]*alt="[^"]*Sample/);
  assert.ok(exists('img/habits/habit-card-sample-640.webp'));
  assert.ok(fs.statSync(path.join(ROOT, 'img/habits/habit-card-sample-640.webp')).size < 80000, 'web size');
  assert.match(t, /never carries a name/); assert.match(t, /no cookies/);
  assert.match(html, /data-go="enroll"/); assert.match(html, /data-go="founding-partners"/);
  assert.doesNotMatch(html, /\.pdf|download=|data-tk-print|window\.print/i, 'no printable or downloadable card sheet in public');
  assert.ok(!fs.readdirSync(path.join(ROOT, 'img/habits')).some(f => f !== 'habit-card-sample-640.webp'), 'only the sample picture is published');
});

test('wiring: index.html loads it, the gate lets a habit card through, family route, prerendered pages, sitemap', () => {
  const idx = read('index.html');
  assert.match(idx, /<script src="habits\.js\?v=\d+"><\/script>/);
  assert.match(idx, /<link rel="stylesheet" href="habits\.css\?v=\d+">/);
  assert.ok(idx.indexOf('friend-voices.js') < idx.indexOf('habits.js') && idx.indexOf('views.js') < idx.indexOf('habits.js'));
  assert.match(read('entry.js'), /const habitCard = \/\^#habit\\\//);
  assert.match(read('entry.js'), /seen\(\) \|\| habitCard;/);
  assert.match(read('i18n.js'), /'habit', 'habits'\]/);
  const map = read('sitemap.xml');
  for (const h of H.HABITS) {
    const f = `habit-${h.id}.html`;
    assert.ok(exists(f), f);
    const p = read(f);
    assert.ok(p.includes(`window.FF_PRERENDER="habit/${h.id}"`), f);
    assert.ok(p.includes(`<link rel="canonical" href="https://dvolcore.github.io/futures-friends/habit-${h.id}">`), f);
    assert.ok(map.includes(`<loc>https://dvolcore.github.io/futures-friends/habit-${h.id}</loc>`), f);
  }
  assert.ok(map.includes('<loc>https://dvolcore.github.io/futures-friends/habits</loc>'));
});

// ---------------------------------------------------------------- a real browser
const HAR = () => import('./a11y-harness.mjs');
let h, srv, browser;
test.before(async () => { h = await HAR(); srv = await h.startSite(); browser = await h.loadChromium().launch(); });
test.after(async () => { await browser.close(); await srv.close(); });

for (const width of [390, 1280]) {
  test(`${width}px: a scanned card opens straight on the friend (no gate); tap to play runs the steps to "All done!" and replays`, async () => {
    const ctx = await browser.newContext({ viewport: h.SIZES[width], reducedMotion: 'reduce' });
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.clock.install();
    await page.goto(`${srv.base}habit-wash-hands`);
    await page.waitForSelector('.hb-player[data-hb="wash-hands"]');
    assert.equal(await page.$('.ffe-gate, [class*="ffe-gate"]'), null, 'no entry gate over the player');
    assert.equal(new URL(page.url()).hash, '#habit/wash-hands', 'stays on the habit (no hop to Home)');
    const sw = await page.evaluate(() => document.documentElement.scrollWidth); assert.ok(sw <= h.SIZES[width].width + 1, `no sideways scroll (${sw})`);
    const btn = await page.$('.hb-play'); const box = await btn.boundingBox(); assert.ok(box.width >= 200 && box.height >= 200, 'a big tap target');
    await page.click('.hb-play');
    assert.equal(await page.getAttribute('.hb-player', 'data-hb-state'), 'playing');
    await page.clock.runFor(3000);   // the friend's hello caption first (2.5 s)
    assert.equal(await page.textContent('[data-hb-line]'), 'Water on. Get your hands wet.');
    await page.clock.runFor(30000);
    assert.match(await page.textContent('[data-hb-line]'), /Scrub, scrub!/);
    assert.ok(Number(await page.textContent('[data-hb-count]')) > 0, 'Bop counts');
    await page.clock.runFor(60000);
    assert.equal(await page.getAttribute('.hb-player', 'data-hb-state'), 'done');
    assert.ok(await page.isVisible('.hb-done'));
    assert.match(await page.textContent('.hb-done'), /All done!/);
    await page.click('.hb-again');
    assert.equal(await page.getAttribute('.hb-player', 'data-hb-state'), 'playing');
    await page.click('.hb-lang');
    await page.waitForSelector('.hb-player[data-hb-lang="es"]');
    assert.match(await page.textContent('.hb-title'), /Lávate las manos/);
    assert.match(page.url(), /[?&]l=es/);
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}

test('a Spanish card (?l=es) opens in Spanish; a video habit shows its clip with Spanish captions', async () => {
  const ctx = await browser.newContext({ viewport: h.SIZES[390], reducedMotion: 'reduce' });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${srv.base}habit-calm-breathing?l=es`);
  await page.waitForSelector('.hb-player[data-hb-lang="es"]');
  assert.match(await page.textContent('.hb-title'), /Respirar con calma/);
  assert.equal(await page.getAttribute('.hb-vid source', 'src'), 'video/act-lumi-calm-breath.mp4');
  assert.equal(await page.getAttribute('.hb-vid track[default]', 'srclang'), 'es');
  assert.equal(await page.$eval('.hb-vid', v => v.muted && !v.controls), true, 'muted, no controls (no unmute)');
  assert.equal(await page.evaluate(() => document.documentElement.lang), 'es');
  assert.deepEqual(errors, []);
  await ctx.close();
});
