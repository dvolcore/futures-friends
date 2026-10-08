// Visual audit quick wins: the default share image, the 404 view, honest flags on non-final art (the slots stay), placeholder
// slots for missing photos and video, resized copies for heavy images, and the Bop at Home / Whole-Child pictograms.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const html = read('index.html');

test('OG-01: one clean 1200x630 share image, built from official assets, with absolute og:image and twitter:image', () => {
  const f = path.join(ROOT, 'img/og/ff-share-default.png'), b = fs.readFileSync(f);
  assert.equal(b.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'a PNG');
  assert.deepEqual([b.readUInt32BE(16), b.readUInt32BE(20)], [1200, 630]);
  assert.ok(b.length < 1024 * 1024, 'under 1 MB');
  const url = 'https://dvolcore.github.io/futures-friends/img/og/ff-share-default.png';
  assert.match(html, new RegExp(`<meta property="og:image" content="${url.replace(/[./]/g, '\\$&')}">`));
  assert.match(html, new RegExp(`<meta name="twitter:image" content="${url.replace(/[./]/g, '\\$&')}">`));
  assert.match(html, /<meta name="twitter:card" content="summary_large_image">/);
  assert.match(html, /<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">/);
  assert.doesNotMatch(html, /og:image" content="[^"]*hero\.jpg/, 'the old-brand hero is no longer the share image');
  assert.ok(fs.existsSync(path.join(ROOT, 'img/hero.jpg')), 'hero.jpg is kept');
  assert.ok(fs.existsSync(path.join(ROOT, 'tools/build-og-image.py')), 'the image can be rebuilt');
});

function notFound() {
  const calls = [], head = [], V = { home: () => 'HOME' };
  const meta = [];
  const document = {
    title: '', head: { appendChild: m => { meta.push(m); m.remove = () => meta.splice(meta.indexOf(m), 1); } },
    createElement: () => ({ setAttribute() {} }), querySelector: () => meta[0] || null
  };
  const ctx = vm.createContext({ V, document, location: { hash: '#nope' }, window: {}, console });
  vm.runInContext('var arg = null; function go(v, a){ calls.push([v, a, !!V[v]]); return V[v] ? V[v]() : V.home(); }', Object.assign(ctx, { calls }));
  ctx.document.addEventListener = () => {};
  for (const f of ['plush-cast.js', 'supporting-cast.js']) vm.runInContext(read(f), ctx, { filename: f });   // wave 5: plush art + the cameo
  vm.runInContext(read('not-found.js'), ctx, { filename: 'not-found.js' });
  return { ctx, calls, V, document, meta, head };
}

test('EMPTY-04: an unknown route shows a real not-found view under the address that was typed, with noindex and a way out', () => {
  const { ctx, calls, V, document, meta } = notFound();
  assert.equal(typeof V['not-found'], 'function');
  const out = vm.runInContext("go('does-not-exist')", ctx);
  assert.equal(JSON.stringify(calls[0]), JSON.stringify(['does-not-exist', undefined, true]), 'served under its own name, so the hash stays as typed');
  assert.match(out, /<h1 id="ffa-404-h">We can&rsquo;t find that page<\/h1>/);
  assert.match(out, /<code>#does-not-exist<\/code>/);
  for (const r of ['home', 'enroll', 'whole-child', 'bop-at-home', 'friends', 'contact']) assert.match(out, new RegExp(`href="#${r}"`));
  assert.match(out, /src="img\/plush\/characters\/booker-480\.webp" srcset="[^"]*booker-960\.webp 626w"/, 'the plush library art only');
  assert.match(out, /Story-world characters: Mimi, Booker and Tad/, 'the classmates on the 404 are labelled');
  assert.equal(document.title, 'Page not found | Futures Friends');
  assert.equal(meta.length, 1, 'noindex while the 404 shows');
  vm.runInContext("go('home')", ctx);
  assert.equal(V['does-not-exist'], undefined, 'the alias is removed when the visitor moves on');
  assert.equal(meta.length, 0, 'noindex removed on real pages');
  const evil = vm.runInContext(`go('<img src=x onerror=1>')`, ctx);
  assert.doesNotMatch(evil, /<img src=x/, 'the typed path is escaped');
  vm.runInContext("location.hash = ''; window.FFstart()", ctx);
  assert.equal(calls.at(-1)[0], 'home', 'an empty hash is Home, not a 404');
  assert.ok(read('route-meta.js').includes("'not-found': ['Page not found'"));
});

function art() {
  const window = {};
  const c = vm.createContext({ window });
  for (const f of ['plush-cast.js', 'brand-art.js']) vm.runInContext(read(f), c, { filename: f });
  return window.FFArt;
}

test('non-final art keeps its slot and carries a visible flag: AI rooms, draft posters and covers, placeholder videos', () => {
  const A = art();
  // Gap fill 2026-10-07: the room-art flag says what the picture is, with no 'coming soon'.
  assert.match(A.flag('illustration'), /<b>Illustration<\/b><span>Not a photo of our center<\/span>/);
  assert.match(A.flag('layout'), /<b>Layout preview<\/b><span>Final cover illustration still to come<\/span>/);
  assert.match(A.flag('draft'), /<b>Draft art<\/b><span>Being updated to the current brand<\/span>/);
  assert.match(A.flag('video'), /<b>Placeholder video<\/b>/);
  const views = read('views.js'), features = read('features.js'), premium = read('premium.js');
  // every slot is still there
  for (const f of ['video/ff-intro-titled-16x9.mp4', 'video/academy-welcome.mp4', 'img/booker-a-new-friend-at-futures-poster.png', 'img/bop-teamwork-makes-it-brighter-poster.png', 'img/lumi-kindness-goes-a-long-way-poster.png'])
    assert.ok(features.includes(f), f + ' still on the page');
  for (const f of ['img/zones.jpg', 'img/kitchen.jpg']) assert.ok(views.includes(f), f + ' still on the page');   // the two cover layouts gave way to the finished covers (2026-10-07)
  // wave 10 (owner 2026-10-07): the classroom slots (carpet.jpg) are filled with REAL photos of the pilot center, never a render
  assert.ok(!/img\/carpet\.jpg/.test(views + features + read('experience.js')), 'carpet.jpg placeholder replaced by real photos');
  for (const [f, k] of [['views.js', 'alphabet-rug'], ['views.js', 'reading-corner'], ['views.js', 'dress-up-corner'], ['views.js', 'exterior'], ['features.js', 'exterior'], ['features.js', 'blue-table-room'], ['experience.js', 'turtle-rug']])
    assert.match(read(f), new RegExp(`window\\.FFArt\\.photo(Img)?\\('${k}'`), `${f} shows the real photo ${k}`);
  assert.ok(read('home-calm.js').includes('img/group.jpg') && premium.includes('video/academy-welcome.mp4'), 'group.jpg moved with the Academy band (home-calm.js -> #teacher-standard)');
  // and flagged
  // Gap fill (2026-10-07): episode-sample.mp4 is retired; only a file named video/placeholder-*.mp4 would get the 'Placeholder video' flag
  assert.match(features, /PLACEHOLDER_VIDEO = \/video\\\/placeholder-\[a-z0-9-\]\+\\\.mp4\$\//);
  assert.doesNotMatch(features, /episode-sample\.mp4'/);
  assert.match(views, /const FIG_AI = \{'img\/zones\.jpg':\[1200,800\],'img\/kitchen\.jpg':\[1200,675\]\};/, 'zone map and dining room stay flagged placeholders');
  assert.equal((features.match(/\$\{draft\(\)\}\$\{pic\('img\/[a-z-]+-poster\.png'/g) || []).length, 3, 'three Watch posters flagged as draft');
  assert.equal((views.match(/\$\{layout\(\)\}\$\{pic\('img\/[a-z-]+-cover\.png'/g) || []).length, 0, 'no Friends cover layouts left: all four books have their finished covers (revised editions 2026-10-07)');
  assert.match(read('home-calm.js'), /<div class="ffa-flagwrap"><img src="img\/group\.jpg"/, 'W4 G14: group.jpg is current-brand art now, so it carries no draft flag');
  assert.doesNotMatch(premium, /window\.FFArt\.flag\('video'\)/, 'W10: the Academy overview video is final, so it carries no placeholder flag');
  assert.match(premium, /poster="video\/academy-welcome-poster\.jpg" aria-label="Academy introduction: Ms\. June, a story-world teacher/);
  assert.match(read('experience.js'), /window\.FFArt\.flag\('illustration'/);
  assert.equal((features.match(/window\.FFArt\.flag\('illustration'\)/g) || []).length, 1, 'Enroll dining figure flagged (the classroom figure is a real photo since wave 10)');
});

test('the Home hero is the four official friends on a stage; the AI collage stays further down the page, flagged', () => {
  const premium = read('premium.js');
  const hero = premium.slice(premium.indexOf('V.home=()=>'), premium.indexOf('${window.FFHomeCalm'));
  assert.match(hero, /window\.FFArt\?'':'<img src="img\/zones\.jpg"/, 'zones.jpg only as a fallback when brand-art.js is missing');
  assert.match(hero, /window\.FFArt\.homeStage\(\)/);
  const stage = art().homeStage();
  // Wave 6 (owner 2026-10-06): Booker stands center stage in his hero pose (booker-hero, the same canon design waving a big hello);
  // was booker-480. Lumi, Zuri and Bop keep their standing art.
  for (const k of ['booker-hero', 'lumi', 'zuri', 'bop']) assert.match(stage, new RegExp(`src="img/plush/characters/${k}-480\\.webp" srcset="[^"]+"[^>]*width="\\d+" height="480"`));
  for (const p of ['LEARN', 'SMILE', 'BELONG', 'RESET', 'EXPLORE', 'NOURISH', 'MOVE', 'OUTSIDE']) assert.ok(stage.includes(p), p);
  assert.doesNotMatch(stage, /PLAY|logo-mark|shield/);
  assert.match(read('views.js'), /class="ffhm-img" src="img\/zones\.jpg"[^>]*>\$\{window\.FFArt \? window\.FFArt\.flag\('illustration'/);
});

test('placeholder slots say what goes there and use only official art', () => {
  const s = art().slot({ kind: 'video', title: 'Move along with Bop', line: 'A <short> video', k: 'bop', ratio: 'wide' });
  assert.match(s, /data-placeholder="video"/);
  assert.match(s, /<b>Video coming: Move along with Bop<\/b>/);
  assert.match(s, /A &lt;short&gt; video/, 'escaped');
  assert.match(s, /src="img\/plush\/characters\/bop-480\.webp"/);
  assert.match(art().slot({ title: 'Our front door' }), /Photo coming: Our front door/);
  // wave 10: 'Our front door and sign' (features.js + views.js contact) is a real photo now; the people/food/map slots stay placeholders
  assert.match(read('views.js'), /window\.FFArt\.photo\('exterior',\{title:'Our front door and sign'/);
  assert.match(read('features.js'), /window\.FFArt\.photo\('exterior', \{title: 'Our front door and sign'/);
  for (const [f, re] of [['home-calm.js', /Photos of our center are coming/], ['features.js', /The building and the rooms/], ['features.js', /To meet the director and the teaching team, book a tour/], ['views.js', /Open 3625 S Blue Ridge Blvd in Google Maps/], ['whole-child.js', /See it in motion/]])
    assert.match(read(f), re, f);
  // the Bop video slot is filled (owner 2026-10-07): the real player with captions replaces its placeholder
  assert.match(read('whole-child.js'), /actPlayer\('elephant-stomp', 'Move along with Bop/);   // owner 2026-10-07: the full version, never the short
});

test('page weight: heavy posters and covers are served as resized WebP copies with sizes, lazy loading and dimensions', () => {
  for (const b of ['booker-a-new-friend-at-futures-poster', 'bop-teamwork-makes-it-brighter-poster', 'lumi-kindness-goes-a-long-way-poster'])
    for (const w of [400, 800]) {
      const f = path.join(ROOT, `img/${b}-${w}.webp`);
      assert.ok(fs.existsSync(f), f);
      assert.ok(fs.statSync(f).size < 140 * 1024, f + ' is small');
    }
  const ctx = vm.createContext({ window: {} });
  vm.runInContext('var V={};' + read('views.js').match(/const pic = [^\n]+/)[0] + ';this.pic=pic;', ctx);
  const tag = ctx.pic('img/x-cover.png', 1254, 1254, 'Alt', '50vw');
  assert.match(tag, /<source type="image\/webp" srcset="img\/x-cover-400\.webp 400w, img\/x-cover-800\.webp 800w" sizes="50vw">/);
  assert.match(tag, /<img src="img\/x-cover\.png" alt="Alt" width="1254" height="1254" loading="lazy" decoding="async">/);
  // The friends' finished covers (revised editions, 2026-10-07) are 640/1200 WebP pairs from the Story Time data (tests/family-library.test.js checks the files).
  assert.match(read('views.js'), /<img src="\$\{f\.cover\[0\]\}" srcset="\$\{f\.cover\[0\]\} 640w, \$\{f\.cover\[1\]\} 1200w" sizes="[^"]+" alt="[^"]+" width="1200" height="1200" loading="lazy" decoding="async">/);
});

test('Bop at Home and Whole-Child get pictures: a pictogram per activity, per step, the MOVE band and the Eat the Rainbow names', () => {
  const window = { FFhooks: [], FF_INTAKE: { url: '' } };
  const ctx = vm.createContext({ console, window, setTimeout: () => 0, clearTimeout() {}, innerHeight: 800,
    document: { addEventListener() {}, getElementById: () => null, createElement: () => ({}), head: { appendChild() {} }, querySelector: () => null } });
  for (const f of ['data.js', 'plush-cast.js', 'supporting-cast.js', 'brand-art.js', 'views.js', 'whole-child.js']) vm.runInContext(read(f), ctx, { filename: f });
  const bh = vm.runInContext("V['bop-at-home']()", ctx), wc = vm.runInContext("V['whole-child']()", ctx);
  const cards = [...bh.matchAll(/<article class="wc-act[\s\S]*?<\/article>/g)].map(m => m[0]);
  assert.equal(cards.length, 8);
  for (const c of cards) assert.match(c, /<div class="wc-act-pic"><svg class="wc-picto" viewBox="0 0 64 64" aria-hidden="true"/);
  assert.match(bh, /class="wc-pillar[\s\S]*?MOVE[\s\S]*?OUTSIDE[\s\S]*?Move Your Body, Grow Your Mind/);
  assert.equal((bh.match(/<ul class="wc-skillpics"[\s\S]*?<\/ul>/)[0].match(/<svg/g) || []).length, 6);
  assert.match(bh, /Wobbles are welcome\. Trying is the win\./);
  assert.equal((wc.match(/wc-step-pic/g) || []).length, 6, 'one pictogram per step of the day');
  assert.equal((wc.match(/wc-d5-pic/g) || []).length, 5);
  assert.equal((wc.match(/wc-q-pic/g) || []).length, 4);
  for (const n of ['Red Rockets', 'Orange Sunshine', 'Yellow Sunbeams', 'Green Sprouts', 'Purple Pals', 'Cozy Clouds']) assert.ok(wc.includes(n), n);
  const added = wc.match(/<ul class="wc-bands"[\s\S]*?<\/ul>/)[0] + bh.match(/<div class="wc-pillar[\s\S]*?<\/ul><\/div>/)[0] + bh.match(/<section class="wc-sec wc-bh-quote"[\s\S]*?<\/section>/)[0];
  assert.doesNotMatch(added, /health|immun|vitamin|cures?\b|prevents?\b|weight|strong bones/i, 'no health claims in the new rainbow names, pillar band or quote');
  for (const m of (wc + bh).matchAll(/<img\b[^>]*>/g)) assert.match(m[0], /src="img\/(plush\/characters\/[a-z-]+-480\.webp|plush\/environments\/[a-z-]+-800\.webp|rainbow\/[a-z]+\.svg)"/, 'official art only');
});

test('index.html loads brand-art before the views and not-found last, and bumps every edited file', () => {
  const at = f => html.indexOf(`<script src="${f}`);
  assert.ok(at('brand-art.js') > 0 && at('brand-art.js') < at('views.js'));
  assert.ok(at('not-found.js') > at('premium.js') && at('not-found.js') > at('academy-lms-author.js'));
  assert.ok(html.indexOf('not-found.js') < html.indexOf('window.FFstart && window.FFstart()'));
  assert.match(html, /<link rel="stylesheet" href="brand-art\.css\?v=\d+">/);
  const v = f => +(html.match(new RegExp(f.replace('.', '\\.') + '\\?v=(\\d+)')) || [])[1];
  assert.ok(v('views.js') >= 22 && v('features.js') >= 15 && v('premium.js') >= 11 && v('experience.js') >= 6 && v('whole-child.js') >= 5 && v('route-meta.js') >= 2 && v('whole-child.css') >= 2);
  assert.match(read('intake-config.js'), /window\.FF_INTAKE = \{ url: '' \}|url: ''/, 'forms keep the honest open-soon state');
});
