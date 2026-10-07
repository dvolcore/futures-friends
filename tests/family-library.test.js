// Futures at Home: the free family library (family-library-data.js, family-library.js, family-library.css, tools/make-printables.py).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const ROUTES = ['at-home', 'story-time', 'activities', 'printables', 'see-how', 'family-videos', 'my-week'];

function site({ storage, captions } = {}) {
  const window = { FFhooks: [], FF_INTAKE: { url: '' } };
  if (storage) window.localStorage = storage;
  const context = vm.createContext({
    console, window, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {}, innerHeight: 800, FormData, URLSearchParams,
    document: { addEventListener() {}, getElementById: () => null, createElement: () => ({}), head: { appendChild() {} }, querySelector: () => null, querySelectorAll: () => [] }
  });
  for (const f of ['data.js', ...(captions ? ['captions.js'] : []), 'plush-cast.js', 'supporting-cast.js', 'views.js', 'whole-child.js', 'family-library-data.js', 'family-library.js']) vm.runInContext(read(f), context, { filename: f });
  context.render = (route, a) => vm.runInContext(`arg = ${JSON.stringify(a == null ? null : a)}; V[${JSON.stringify(route)}]()`, context);
  return context;
}
const F = require(path.join(ROOT, 'family-library-data.js'));
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&middot;/g, '·').replace(/\s+/g, ' ');

test('every family-library route renders one h1, real sections and no template junk', () => {
  const c = site();
  const cases = ROUTES.map(r => [r]).concat([['story-time', 'booker-tries-again'], ['story-time', 'clean-up-team'], ['activities', 'twos'], ['activities', 'ice-detectives']]);
  for (const [r, a] of cases) {
    const html = c.render(r, a);
    assert.equal((html.match(/<h1[ >]/g) || []).length, 1, `${r}/${a || ''} has one h1`);
    assert.ok((html.match(/<h2[ >]/g) || []).length >= 1, `${r}/${a || ''} has section headings`);
    assert.doesNotMatch(html, /undefined|\[object Object\]|NaN/, `${r}/${a || ''}`);
  }
  for (const r of ['at-home', 'family-videos', 'my-week']) assert.ok((c.render(r).match(/<h2[ >]/g) || []).length >= 3, r);
});

test('the library is linked from the main nav, search, footer, For Families and the Friends page; files load after views.js', () => {
  assert.match(read('premium.js'), /\['at-home','Futures at Home'\]/);
  assert.match(read('premium.js'), /\['story-time','Story Time: read-along storybooks'\]/);
  const html = read('index.html');
  assert.match(html, /<li><a href="#at-home">Futures at Home \(free\)<\/a><\/li>/, 'footer site map (wave 6: real links, grouped by audience)');
  assert.match(html, /<link rel="stylesheet" href="family-library\.css\?v=\d+">/);
  assert.ok(html.indexOf('family-library-data.js?v=') > html.indexOf('views.js?v=') && html.indexOf('family-library.js?v=') > html.indexOf('family-library-data.js?v='));
  const c = site();
  assert.match(c.render('for-families'), /href="#at-home"/);
  assert.match(c.render('friends'), /href="#story-time"/);
  const home = c.render('at-home');
  for (const r of ['story-time', 'activities', 'printables', 'see-how', 'my-week', 'family-videos', 'bop-at-home']) assert.ok(home.includes(`href="#${r}"`), 'home links to ' + r);
  const meta = require(path.join(ROOT, 'route-meta.js'));
  for (const r of ROUTES) assert.ok(meta.ROUTES[r], r + ' has a title and description');
});

test('Story Time publishes all five books in full (gap fill 2026-10-07): Books 4 and 5 are the manuscript with the brand fixes, no previews left', () => {
  const full = F.BOOKS.filter(b => b.status === 'full').map(b => b.id);
  assert.deepEqual(full, ['booker-tries-again', 'big-feelings-brighter-days', 'what-happens-if-we-try', 'clean-up-team', 'the-rainbow-picnic']);
  assert.equal(F.BOOKS.filter(b => b.status !== 'full').length, 0, 'no preview books');
  for (const b of F.BOOKS) {
    assert.equal(b.spreads.length, b.id === 'the-rainbow-picnic' ? 18 : 14, b.id + ' spreads (the ensemble book has 18, as in the manuscript)');
    const n = b.spreads.reduce((t, s) => t + s.p.split(/\s+/).length, 0);
    assert.ok(Math.abs(n - b.words) <= 6, `${b.id}: ${n} words vs ${b.words} in the manuscript`);
    for (const s of b.spreads) { assert.ok(F.CROWD[s.q[0]], 'prompt type'); assert.ok(s.q[1].length > 10 && s.pic.length > 10); }
    assert.equal(b.talk.length, 4); assert.ok(b.act.steps.length >= 4 && b.home && b.gesture && b.back && b.goals.length === 4);
  }
  for (const id of ['clean-up-team', 'the-rainbow-picnic']) {
    const b = F.BOOKS.find(x => x.id === id), words = b.spreads.map(s => s.p).join(' ');
    assert.ok(Math.abs(b.words - (id === 'clean-up-team' ? 319 : 568)) <= 6, 'within a few words of the manuscript');
    assert.match(b.src, /manuscript v1\.0/); assert.match(b.src, /MOVE/);
    assert.doesNotMatch(words + b.tip + b.back, /happy doer|big hearts|brain|strong bones|super sight|heart helpers|sunny energy|grow strong|growing strong|healthy/i);
  }
  assert.match(F.BOOKS.find(b => b.id === 'clean-up-team').spreads[0].p, /Bop loves to move/);
  assert.match(F.BOOKS.find(b => b.id === 'clean-up-team').spreads[13].p, /Ready\? Bop & Go!/);
  const c = site(), UI = c.window.FFFamilyUI;
  UI.R.page = 0; let html = c.render('story-time', 'clean-up-team');
  assert.match(html, /fl-reader/); assert.doesNotMatch(html, /coming soon|preview/i);
  assert.match(html, /website edition: Bop&#39;s lines updated|website edition: Bop's lines updated/);
  c.render('story-time', 'the-rainbow-picnic'); UI.R.page = 19; html = c.render('story-time', 'the-rainbow-picnic');
  for (const k of ['booker', 'lumi', 'zuri', 'bop']) assert.match(html, new RegExp(`data-fl="sticker" data-k="${k}"`), 'the ensemble book offers every friend\'s sticker');
  UI.R.page = 0;
  const shelf = c.render('story-time');
  assert.doesNotMatch(text(shelf), /Preview|full book soon|coming soon/i);
  assert.equal((shelf.match(/Read it together/g) || []).length, 5);
});

test('Booker Tries Again is the finished, illustrated Sister Edition: every page shows its art, the cover is real, and Pip is now his little sister', () => {
  const b = F.BOOKS[0], dir = 'img/books/booker-tries-again/';
  assert.equal(b.id, 'booker-tries-again');
  // owner 2026-10-07: spreads 13 and 14 of the finished book (Sister_Edition/QC.json) replace Pip with Booker's little sister
  assert.equal(b.spreads[12].p, 'Then Booker saw his little sister by the door. She held a book and looked worried. “I can’t read yet,” she said. “Hard things are just new things,” said Booker.');
  assert.equal(b.spreads[13].p, 'Booker and his sister sat side by side. They looked at the pictures. They said the first sounds. Then together they said, “Big breath. Brave heart. We can try again!”');
  assert.doesNotMatch(JSON.stringify(b), /\bPip\b/, 'no Pip left in Booker\'s book');
  assert.match(b.log, /his little sister/);
  const pairs = b.spreads.map(s => s.img).concat([b.cover]);
  for (const pair of pairs) {
    assert.ok(Array.isArray(pair) && pair.length === 2 && pair[0].startsWith(dir) && /-640\.webp$/.test(pair[0]) && /-1200\.webp$/.test(pair[1]), String(pair));
    for (const f of pair) { assert.ok(fs.existsSync(path.join(ROOT, f)), f + ' exists'); assert.ok(fs.statSync(path.join(ROOT, f)).size < 250 * 1024, f + ' is under 250 KB'); }
  }
  assert.equal(new Set(pairs.flat()).size, 30, 'fifteen different pictures');
  const c = site(), UI = c.window.FFFamilyUI;
  let html = c.render('story-time');
  assert.ok(html.includes(`src="${b.cover[0]}" srcset="${b.cover[0]} 640w, ${b.cover[1]} 1200w"`), 'the shelf card shows the real cover');
  UI.R.page = 0; html = c.render('story-time', b.id);
  assert.ok(html.includes(`src="${b.cover[0]}"`) && /fetchpriority="high"/.test(html), 'the cover page shows the cover, not lazy');
  for (let p = 1; p <= b.spreads.length; p++) {
    const s = b.spreads[p - 1];
    UI.R.page = p; html = c.render('story-time', b.id);
    assert.ok(html.includes(`<img class="fl-art-img" src="${s.img[0]}" srcset="${s.img[0]} 640w, ${s.img[1]} 1200w"`), 'page ' + p + ' shows its picture');
    assert.ok(html.includes(`alt="${s.pic.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`), 'page ' + p + ' alt is the picture description');
    assert.match(html, /width="1200" height="1200" loading="lazy"/);
    assert.match(html, /Story-world illustration from the finished book/);
    assert.doesNotMatch(html, /Pictures are still being made|The picture will show|Picture this/);
  }
  UI.R.page = 0;
  // the other four books still describe their pictures (gap fill 2026-10-07: worded as an invitation, not a 'coming' note)
  html = c.render('story-time', 'big-feelings-brighter-days');
  UI.R.page = 1; html = c.render('story-time', 'big-feelings-brighter-days');
  assert.match(html, /Picture this/); assert.match(html, /On this page: /); assert.doesNotMatch(html, /still being made|coming soon/i);
  UI.R.page = 0;
  // no PDF and no download control for the book
  assert.doesNotMatch(read('family-library.js') + read('family-library-data.js'), /Sister_Digital_Edition|\.pdf['"][^\n]*booker-tries-again|download="[^"]*booker/i);
});

test('the reader turns pages, marks refrain words, and asks a question on every page', () => {
  const c = site(), UI = c.window.FFFamilyUI;
  const b = F.BOOKS[0];
  let html = c.render('story-time', b.id);
  assert.match(html, /id="flReader"/); assert.match(html, /Cover/); assert.match(html, /Before you read/);
  for (let p = 1; p <= b.spreads.length + 1; p++) {
    UI.R.page = p; html = c.render('story-time', b.id);
    if (p <= b.spreads.length) {
      const s = b.spreads[p - 1];
      assert.match(html, /Read with your child/);
      assert.ok(html.includes(F.CROWD[s.q[0]][0]), 'page ' + p + ' shows its prompt type');
      assert.equal((html.match(/class="fl-w/g) || []).length, s.p.split(/\s+/).length, 'every word is a highlightable span');
      assert.match(html, new RegExp(`Page ${p} of 14`));
    } else {
      assert.match(html, /The End/); for (const q of b.talk) assert.ok(text(html).includes(q.slice(0, 30)), q);
      assert.match(html, /data-fl="next" disabled/);
    }
  }
  const w = UI.words('Booker took a big breath. "Big breath. Brave heart. I can try again!"', b.refrain);
  assert.ok((w.match(/fl-ref/g) || []).length >= 8, 'refrain words are marked');
  assert.equal(UI.wordAt([0, .4, .9, 1.5], 1.0), 2); assert.equal(UI.wordAt([0, .4], -1), -1);
  const r = read('family-library.js');
  assert.match(r, /localService/, 'Read to me only uses on-device voices');
  assert.match(r, /ArrowRight/); assert.match(r, /touchend/);
});

test('activities: every band has all four friends, every card has steps, notice and adaptations, and sources resolve', () => {
  for (const b of F.BANDS) {
    const list = F.ACTS.filter(a => a.bands.includes(b.id));
    assert.ok(list.length >= 8, b.id + ' has at least 8 activities');
    assert.deepEqual([...new Set(list.map(a => a.c))].sort(), ['booker', 'bop', 'lumi', 'zuri'], b.id);
  }
  assert.equal(new Set(F.ACTS.map(a => a.id)).size, F.ACTS.length, 'ids are unique (they are deep links)');
  for (const a of F.ACTS) {
    assert.ok(a.min >= (a.vid ? 0.5 : 3) && a.min <= 15, a.id + ' takes 3 to 15 minutes (owner 2026-10-07: a video activity shows its video\'s real length, e.g. 69 / 60)');
    assert.ok(a.steps.length >= 3 && a.mat.length && a.notice.length && a.say, a.id);
    assert.equal(a.adapt.length, 3, a.id + ' has easier, stretch and access versions');
    for (const k of a.src) assert.ok(F.SRC[k], a.id + ' cites ' + k);
  }
  const c = site();
  const one = c.render('activities', 'ice-detectives');
  assert.match(one, /id="act-ice-detectives"[^>]*open/);
  assert.match(one, /never for diagnosing/);
});

test('the weekly plan is deterministic, fits the age band and changes week to week', () => {
  const c = site(), UI = c.window.FFFamilyUI;
  const d = new Date(2026, 9, 5);
  for (const b of F.BANDS) {
    const p = UI.buildPlan({ band: b.id, friends: ['zuri', 'bop'], mins: 10 }, d);
    assert.equal(p.days.length, 7);
    for (const day of p.days) {
      for (const a of [day.doIt, day.move, day.calm]) assert.ok(a && a.bands.includes(b.id), `${b.id} ${day.day}`);
      assert.equal(day.move.c, 'bop'); assert.equal(day.calm.c, 'lumi'); assert.notEqual(day.doIt, day.calm);
    }
    assert.deepEqual(JSON.stringify(UI.buildPlan({ band: b.id, friends: ['zuri', 'bop'], mins: 10 }, d)), JSON.stringify(p), 'same week, same plan');
  }
  const a = UI.buildPlan({ band: 'threes', friends: [], mins: 10 }, d), b2 = UI.buildPlan({ band: 'threes', friends: [], mins: 10 }, new Date(2026, 9, 12));
  assert.notDeepEqual(a.days.map(x => x.doIt.id), b2.days.map(x => x.doIt.id), 'a new plan next week');
});

test('stickers and the book count stay on the device, survive blocked storage and never record a name', () => {
  const mem = {}; const storage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
  const c = site({ storage }), UI = c.window.FFFamilyUI;
  assert.equal(UI.addSticker('booker', 2), true);
  const s = UI.stickers(); assert.equal(UI.stickerCount(s.cur), 1);
  assert.deepEqual(Object.keys(JSON.parse(mem['ff-at-home-stickers'])), [s.wk], 'only this week is kept');
  const blocked = site({ storage: { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } } });
  assert.equal(blocked.window.FFFamilyUI.addSticker('lumi'), false);
  assert.match(blocked.render('my-week'), /Saved on this device only/);
  const src = read('family-library.js');
  assert.doesNotMatch(src, /store\.set\([^)]*name/i, 'the certificate name is never stored');
  assert.match(src, /never saved or sent/);
});

test('printables exist as real PDFs, have previews and are linked; the Spanish drafts are flagged', () => {
  const c = site(), html = c.render('printables');
  for (const p of F.PRINTABLES) {
    const buf = fs.readFileSync(path.join(ROOT, p.f));
    assert.equal(buf.slice(0, 5).toString(), '%PDF-', p.f);
    assert.equal((buf.toString('latin1').match(/\/Type \/Page\b/g) || []).length, p.pages, p.f + ' page count');
    assert.ok(fs.existsSync(path.join(ROOT, 'printables/previews', p.id + '.png')), p.id + ' preview');
    assert.ok(html.includes(`href="${p.f}"`), p.f + ' is linked');
    if (p.es) { assert.equal(fs.readFileSync(path.join(ROOT, p.es)).slice(0, 5).toString(), '%PDF-'); assert.ok(html.includes(`href="${p.es}"`)); }
  }
  assert.equal(F.PRINTABLES.filter(p => p.es).length, 3);
  assert.ok(fs.existsSync(path.join(ROOT, F.PACK)) && html.includes(`href="${F.PACK}"`));
  assert.match(html, /borrador/i); assert.match(html, /pendiente de revisi/);
  assert.match(read('tools/make-printables.py'), /BORRADOR/);
});

test('the watch shelf (gap fill 2026-10-07) shows every finished video, grouped by friend, real files only, and plans without players', () => {
  const items = F.VIDEOS.shelf.flatMap(g => g.items);
  const C = require(path.join(ROOT, 'captions.js'));
  for (const v of items) {
    if (v.act) { assert.ok(C.BOP_ACTS[v.act] || C.FRIEND_ACTS[v.act], v.act); continue; }
    const src = v.src.split('?')[0];
    assert.ok(fs.existsSync(path.join(ROOT, src)), src); assert.ok(fs.existsSync(path.join(ROOT, v.poster)), v.poster);
    assert.ok(C.CAPS[src], src + ' is registered in captions.js (captions, or marked silent)');
    if (v.loop) assert.ok(C.CAPS[src].silent, src + ' is a silent loop');
  }
  // every Bop at Home video, the welcome video, the four friend loops, the hello loop, the meadow and the logo film are on the shelf
  for (const slug of [...Object.keys(C.BOP_ACTS), ...Object.keys(C.FRIEND_ACTS)]) assert.ok(items.some(v => v.act === slug), slug + ' is on the shelf');
  for (const f of ['ff-intro-titled-16x9', 'ff-hello-4x5', 'ff-meadow-ambient-16x9', 'ff-logo-reveal-navy', 'ff-friend-booker-4x5', 'ff-friend-lumi-4x5', 'ff-friend-zuri-4x5', 'ff-friend-bop-4x5'])
    assert.ok(items.some(v => v.src && v.src.includes('video/' + f + '.mp4')), f);
  // owner 2026-10-07: Move Along with Bop is the FULL Elephant Stomp & Sway (headline of Bop's group); the 39-second short is retired
  const mv = F.VIDEOS.shelf.find(g => g.id === 'move').items;
  assert.equal(mv[0].act, 'elephant-stomp'); assert.ok(mv[0].big);
  assert.ok(!items.some(v => v.src && /bop-move-along/.test(v.src)), 'no shelf item plays the short');
  // Episode One sneak peek (gap fill 2026-10-07): labelled as story-world moments, never as an episode; each has its captions
  const moments = F.VIDEOS.shelf.find(g => g.id === 'moments');
  assert.equal(moments.items.length, 5); assert.match(moments.lede, /not a finished episode/);
  for (const v of moments.items) assert.ok(C.CAPS[v.src].vtt, v.src);
  for (const v of F.VIDEOS.planned) assert.equal(v.src, undefined);
  const html = site({ captions: true }).render('family-videos');
  assert.equal((html.match(/<video/g) || []).length, items.length);
  assert.doesNotMatch(html, /autoplay/);
  assert.equal((html.match(/preload="none"/g) || []).length, items.length, 'nothing loads before play');
  assert.match(html, /<track kind="captions" srclang="en" label="English" src="video\/ff-intro-titled\.en\.vtt" default>/);
  assert.doesNotMatch(text(html), /one short clip|Not filmed yet|placeholder|Bop at Home move-alongs/i);
  assert.match(text(html), /In production/);
  assert.doesNotMatch(text(html), /(with|has|includes) (closed )?captions/i);
  assert.match(html, /30 minutes a day or less/);
});

test('#watch carries the whole shelf (no placeholder) and #friends gives every friend their videos (gap fill 2026-10-07)', () => {
  // #watch lives in features.js; render it through the shared site sandbox, which loads every page script
  const S = require('./site-vm').site(), w = S.render('watch'), fr = S.render('friends');
  assert.doesNotMatch(w, /episode-sample|Placeholder video|placeholder clip/);
  assert.doesNotMatch(w, /preload="(auto|metadata)"/, 'nothing streams before play');
  for (const id of ['meet', 'booker', 'lumi', 'zuri', 'move']) assert.match(w, new RegExp(`id="ffx-v-${id}"`), id);
  assert.equal((w.match(/src="video\/ff-intro-titled-16x9\.mp4"/g) || []).length, 1, 'the welcome video plays once, in the classroom player');
  assert.match(fr, /id="friends-videos"/);
  for (const [k, href] of [['booker', '#activities/booker'], ['lumi', '#activities/lumi'], ['zuri', '#activities/zuri'], ['bop', '#bop-at-home']]) assert.ok(fr.includes(`href="${href}"`), k + ' links to ' + href);
  for (const slug of ['booker-brave-reader', 'lumi-calm-breath', 'lumi-feelings-faces', 'zuri-wonder-loop']) assert.match(fr, new RegExp(`data-friend-act="${slug}"`), slug);
  assert.doesNotMatch(fr.slice(fr.indexOf('friends-videos')), /preload="(auto|metadata)"|autoplay/);
});

test('no forbidden claims or child data, and the new code sends nothing anywhere', () => {
  const files = ['family-library-data.js', 'family-library.js', 'family-library.css', 'tools/make-printables.py'];
  const all = files.map(read).join('\n');
  const banned = [/happy doer/i, /big hearts make a big difference/i, /brain boost|strong bones|heart helpers|super sight|sunny energy|growing strong/i,
    /\b(BMI|calorie|weigh-in|overweight|obes)/i, /\b(good|bad|junk|healthy|unhealthy) foods?\b/i, /clean (your )?plate/i, /\bprevents? (illness|disease|obesity)|improves? health|boosts? (brain|readiness)/i,
    /fonts\.googleapis|fonts\.gstatic/, /\bproven\b/i];
  for (const re of banned) assert.doesNotMatch(all, re, String(re));
  const js = read('family-library.js') + read('family-library-data.js');
  assert.doesNotMatch(js, /\bfetch\(|XMLHttpRequest|sendBeacon|WebSocket|import\(|new Image\(/);
  assert.doesNotMatch(js, /birth ?date|birthday|date of birth|last name|child'?s? email/i, 'nothing about the child is asked for');
  for (const m of js.matchAll(/localStorage\.\w+\(/g)) assert.ok(true, m[0]);
  assert.match(read('family-library.js'), /store = \{\s*get\(k, d\) \{ try \{/);
  const hrefs = [...js.matchAll(/https?:\/\/[^'"\s)]+/g)].map(m => new URL(m[0]).hostname);
  for (const h of new Set(hrefs)) assert.ok(/(^|\.)(readingrockets\.org|healthychildren\.org|harvard\.edu|cdc\.gov|who\.int|imaginationlibrary\.com|aap\.org|nrckids\.org)$/.test(h), 'outbound link only to a cited source: ' + h);
  assert.doesNotMatch(js, /<script|<iframe/);
});
