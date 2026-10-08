// Launch-checklist hygiene: claims that must not come back (G11, I05, C05, G12, G06), per-route titles (G43),
// self-hosted fonts (G24) and no orphaned media (G42).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const SITE_JS = fs.readdirSync(ROOT).filter(f => /\.js$/.test(f) && !/^hub-config\.local/.test(f));
const COPY_JS = ['views.js', 'whole-child.js', 'extras.js', 'experience.js', 'features.js', 'premium.js', 'data.js', 'portal.js', 'intake.js', 'plush-cast.js', 'supporting-cast.js', 'home-signatures.js'];
const copy = COPY_JS.map(read).join('\n') + read('index.html');

test('claims that were not true or not verifiable stay out of the site copy', () => {
  const banned = [
    [/Happy Doer/, 'G12: Bop owns MOVE now'],
    [/\$29,400/, 'G11: CACFP dollar illustration presented as a fact'],
    [/Season 1 has 24 episodes/, 'G11: no season of episodes exists'],
    [/Episodes 13 to 24 are in production/, 'G11'],
    [/enters production/, 'G11'],
    [/Professionally produced/, 'G11: nothing is produced yet'],
    [/Boost readiness/i, 'I05: outcome promise'],
    [/Missouri-approved|CDA-aligned|IACET/i, 'C05: nothing is approved'],
    [/Clock hours are designed to count/, 'C05'],
    [/IEP and IFSP goal tracking|Enter each child.s goals|Track IEP and IFSP goals/, 'G06: the Hub does not store IEP/IFSP goals'],
    [/Healthy meals kids actually eat|Healthy bodies|makes the learning stick/, 'I05: outcome or health labels'],
    [/Official certificates are issued in the Futures Hub/, 'C05'],
    [/paused new Imagination Library sign-ups/, 'G11: unverified dated status']
  ];
  for (const [re, why] of banned) assert.doesNotMatch(copy, re, why);
});

test('G12: Bop is the Mighty Mover and the lead pillars read LEARN, BELONG, EXPLORE, MOVE', () => {
  assert.match(read('views.js'), /bop:\{n:'Bop',a:'elephant',role:'The Mighty Mover',p:'MOVE'/);
  assert.match(read('views.js'), /booker:\{n:'Booker',a:'brown bear',role:'The Brave Little Learner',p:'LEARN'/);
  assert.doesNotMatch(read('experience.js') + read('premium.js') + read('views.js'), /Read\. Play\. Explore\. Belong\.|Learn\. Play\. Explore\. Belong\.<\/span>|\['READ','PLAY'/);
});

test('canon 2026-10-04: weekly plans use LEARN and MOVE, never the old READ/PLAY pillars, and sign-in is by invitation', () => {
  const data = read('data.js');
  assert.doesNotMatch(data, /"(?:Booker|Bop|Lumi|Zuri), (?:READ|PLAY)"/, 'old READ/PLAY pillar labels in the weekly plans');
  assert.equal((data.match(/"Booker, LEARN"/g) || []).length, 12);
  assert.equal((data.match(/"Bop, MOVE"/g) || []).length, 12);
  const copy = COPY_JS.map(read).join('\n');
  assert.doesNotMatch(copy, /\[\s*'READ'\s*,|stands for READ|\bp:'(?:READ|PLAY)'/, 'old READ/PLAY pillar mapping');
  assert.doesNotMatch(copy, /big hearts make a big difference/i, "Bop's retired line");
  assert.doesNotMatch(copy, /Green Giants/i, 'retired rainbow name');
  assert.doesNotMatch(data + read('views.js'), /center code on your login card|Use the center code|login card in the welcome box/i, 'the Hub is invite-only, not a center code');
  assert.doesNotMatch(read('views.js'), /Family App on iPhone and Android/, 'the Hub is a web app, not an app-store app');
});

test('G06: the Hub copy says what it does not store', () => {
  const v = read('views.js');
  assert.match(v, /does not store IEP or IFSP goals/);
  assert.match(v, /It does not store health or allergy records, or IEP and IFSP goals/);
  assert.doesNotMatch(v, /milestones and goals the family has shared/);
});

function routesDefined() {
  const names = new Set();
  for (const f of SITE_JS) {
    const s = read(f);
    for (const m of s.matchAll(/\bV\.([A-Za-z]+)\s*=(?!=)/g)) names.add(m[1]);
    for (const m of s.matchAll(/\bV\['([a-z-]+)'\]\s*=(?!=)/g)) names.add(m[1]);
  }
  for (const m of read('views.js').matchAll(/^ '([a-z-]+)':\{t:/gm)) names.add(m[1]);   // the audience pages in AUD
  return names;
}

test('G43: every route has its own title and description, and the map is applied on navigation', () => {
  const meta = require(path.join(ROOT, 'route-meta.js'));
  const routes = routesDefined();
  assert.ok(routes.size >= 45, `found ${routes.size} routes`);
  for (const r of routes) assert.ok(meta.ROUTES[r], `route-meta.js has no entry for #${r}`);
  const titles = Object.values(meta.ROUTES).map(r => r[0]), descs = Object.values(meta.ROUTES).map(r => r[1]);
  assert.equal(new Set(titles).size, titles.length, 'titles are unique');
  assert.equal(new Set(descs).size, descs.length, 'descriptions are unique');
  for (const d of descs) assert.ok(d.length >= 20 && d.length <= 175, d);
  assert.match(read('premium.js'), /FFRouteMeta\.apply\(route,a\)/);
  assert.match(read('whole-child.js'), /FFRouteMeta\.describe\(/);
  assert.match(read('index.html'), /<script src="route-meta\.js\?v=\d+"><\/script>\s*<script src="premium\.js/);
});

test('G43: titles and descriptions change per route; the home page keeps its static title; blog posts use their own title', () => {
  const src = read('route-meta.js');
  const attrs = { content: 'STATIC DESCRIPTION' };
  const doc = { title: 'STATIC TITLE', querySelector: sel => (/description/.test(sel) ? { getAttribute: () => attrs.content, setAttribute: (k, v) => { attrs.content = v; } } : null) };
  const win = { FF: { modules: [{ code: 'F-101', title: 'Welcome' }] } };
  vm.runInNewContext(src + '\nthis.POSTS = [{id:"cacfp", t:"CACFP: what", b:["First paragraph here."]}];', Object.assign(win, { window: win, document: doc }));
  const api = win.FFRouteMeta;
  const seen = {};
  for (const r of ['home', 'pricing', 'curriculum', 'impact', 'learn']) { api.apply(r); seen[r] = [doc.title, attrs.content]; }
  assert.equal(seen.home[0], 'STATIC TITLE');
  assert.equal(seen.home[1], 'STATIC DESCRIPTION');
  assert.equal(new Set(Object.values(seen).map(x => x[0])).size, 5);
  assert.equal(new Set(Object.values(seen).map(x => x[1])).size, 5);
  api.apply('post', 'cacfp');
  assert.equal(doc.title, 'CACFP: what | Futures Friends');
  api.apply('academy', 'F-101');
  assert.match(doc.title, /^F-101 Welcome \| Training Academy$/);
  win.FFWholeChild = { meta: { 'whole-child': 'WC META' } };
  api.describe('whole-child');
  assert.equal(attrs.content, 'WC META', 'an existing page description is kept');
});

test('G24: Fredoka and Poppins are self-hosted and nothing points at Google Fonts', () => {
  const html = read('index.html'), css = read('fonts/fonts.css');
  assert.doesNotMatch(html + css + SITE_JS.map(read).filter((_, i) => !/^vendor/.test(SITE_JS[i])).join('\n'), /fonts\.googleapis\.com|fonts\.gstatic\.com/);
  assert.match(html, /<link rel="stylesheet" href="fonts\/fonts\.css\?v=\d+">/);
  const files = [...css.matchAll(/url\(([^)]+\.woff2)\)/g)].map(m => m[1]);
  assert.ok(files.length >= 8);
  for (const f of files) assert.ok(fs.existsSync(path.join(ROOT, 'fonts', f)), f);
  assert.equal((css.match(/font-display:swap/g) || []).length, (css.match(/@font-face/g) || []).length, 'every face swaps');
  for (const fam of ['Fredoka', 'Poppins']) assert.match(css, new RegExp(`font-family:'${fam}'`));
  for (const w of ['400', '500', '600']) assert.match(css, new RegExp(`'Poppins';font-style:normal;font-weight:${w};`));
  assert.match(css, /'Fredoka';font-style:normal;font-weight:500 700;/);
  const used = new Set([...read('index.html').matchAll(/--(?:display|body):([^;]+);/g)].map(m => m[1]));
  assert.ok([...used].every(u => /Fredoka|Poppins/.test(u)), 'the two tokens still start with the hosted families');
});

test('G42: every file under img/ and video/ is referenced by the site (directly or through a templated path)', () => {
  const walk = d => fs.readdirSync(path.join(ROOT, d), { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
  const files = [...walk('img'), ...walk('video')];
  const code = fs.readdirSync(ROOT).filter(f => /\.(js|css|html)$/.test(f)).map(read).join('\n');
  // Wave 5: the web pages draw every character from img/plush/; img/cut_*.webp (the same new designs, tight-cropped) stay for the
  // print kit (printables/marketing/src) and tools/brand-art/compose.html, which this scan of root files does not read.
  const dynamic = [/^img\/rainbow\//, /^img\/community\//, /^img\/brand\//, /^img\/email\//, /^img\/cut_(booker|lumi|zuri|bop)\.webp$/];   // img/rainbow/${food}.svg, img/community/${key}.webp; img/brand/ holds the official masters that the CRM, emails and billing use by path or URL, so it is never pruned;
  // img/email/ holds PNG copies of the friends and the felt texture that the hub's emails load by absolute URL (Outlook cannot show WebP)
  // Resized WebP copies (<name>-400.webp, <name>-800.webp) are built from their original's name by the pic() helper in views.js,
  // so they count as referenced when the original is.
  const copyOf = f => { const m = path.basename(f).match(/^(.+)-(?:400|800)\.webp$/); return m && fs.existsSync(path.join(ROOT, path.dirname(f), m[1] + '.png')) ? m[1] + '.png' : null; };
  // img/plush/ is the wave-5 plush asset library: a file there counts as referenced when img/plush/manifest.json indexes it (tests/plush-assets.test.js).
  const plush = new Set(JSON.parse(read('img/plush/manifest.json')).files.map(x => x.path).concat('img/plush/manifest.json'));
  // img/center/ (wave 10) holds the real pilot-center photos: brand-art.js builds <key>-<400|800|1200>.<webp|jpg> from the keys in
  // FFArt.CENTER, so a file there counts as referenced when its key is in the code and img/center/manifest.json lists it
  // (tests/w10-photos.test.js checks the folder holds exactly the listed files).
  const centerKeys = JSON.parse(read('img/center/manifest.json')).photos.map(p => p.key);
  const center = f => { const m = f.split(path.sep).join('/').match(/^img\/center\/(.+)-(?:400|800|1200)\.(?:webp|jpg)$/); return f.split(path.sep).join('/') === 'img/center/manifest.json' || (!!m && centerKeys.includes(m[1]) && code.includes(`'${m[1]}'`)); };
  const orphans = files.filter(f => !code.includes(path.basename(f)) && !(copyOf(f) && code.includes(copyOf(f))) && !dynamic.some(re => re.test(f.split(path.sep).join('/'))) && !plush.has(f.split(path.sep).join('/')) && !center(f));
  assert.deepEqual(orphans, []);
});
