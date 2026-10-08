#!/usr/bin/env node
// SEO + AI-search build (owner 2026-10-08: "the best layout and best thing possible for our SEO AI engine searching ... for our whole site").
// The site is a hash-routed single-page app: to a crawler every address is the same thin page. This tool drives the real app in headless
// Chromium, takes what each public route renders, and writes a real static HTML page for it (the committed output is what GitHub Pages serves):
//   kids-shop.html, enroll.html, product-plush-bop.html, shop-kits.html, blog-ratios.html ...   (served as /kids-shop, /enroll, /product-plush-bop ...)
//   sitemap.xml, robots.txt, llms.txt, llms-full.txt, 404.html, docs/seo-manifest.json
// Each page is the normal app shell (so people get the same experience: the app boots, finds its route from the page's own address and
// re-renders the same view) with the rendered view already inside <main>, a unique title / description / canonical / Open Graph / Twitter
// card, and JSON-LD. The pages sit next to index.html, so every relative asset path in the app keeps working with no <base> tag.
// Home stays index.html (the first-visit gate and cloud fly-through are untouched); this tool only updates its marked head block.
//
// Usage: node tools/prerender.mjs [--check]      (--check writes nothing and exits 1 if any committed output is stale)
// Needs playwright-core (tests/a11y-harness.mjs: HUB_DIR). Sends nothing anywhere; reads only this folder.
// Truth rules: no price/offer/availability unless the catalog shows a real approved price; no hours, reviews or social profiles unless
// they exist on the site; no curriculum content (the pages are exactly what the public site already shows).
import { writeFileSync, readFileSync, existsSync, readdirSync, unlinkSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { loadChromium, startSite, SITE } from '../tests/a11y-harness.mjs';

const require = createRequire(import.meta.url);
const C = require('../store-catalog.js');
const CFG = JSON.parse(readFileSync(join(SITE, 'tools/seo-config.json'), 'utf8'));
const CHECK = process.argv.includes('--check');
const ORIGIN = CFG.origin.replace(/\/+$/, '');
const BASE_PATH = new URL(ORIGIN + '/').pathname;                       // '/futures-friends/' (or '/' on a custom domain)
const abs = p => ORIGIN + '/' + String(p).replace(/^\//, '');
const E = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const trim = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '').replace(/[,;:.\-\u2013\u2014]+$/, '') + '\u2026'; };

// ------------------------------------------------------------------ which pages get a real address
// [route, section, priority]. Sections feed the breadcrumb trail; priority is a hint only.
const SECTION = {
  families: ['For families', 'for-families'],
  centers: ['For centers and programs', 'centers'],
  store: ['Futures Store', 'store'],
  about: ['About', null]
};
const PAGES = [
  ['centers', 'centers', 0.9], ['book-demo', 'centers', 0.7], ['options', 'centers', 0.8], ['for-centers', 'centers', 0.8], ['for-home', 'centers', 0.8],
  ['for-prek', 'centers', 0.7], ['for-faith', 'centers', 0.7], ['for-employers', 'centers', 0.7], ['pricing', 'centers', 0.8], ['membership', 'centers', 0.8],
  ['founding-partners', 'centers', 0.7], ['curriculum', 'centers', 0.8], ['readiness', 'centers', 0.7], ['unit-1', 'centers', 0.6], ['teacher-standard', 'centers', 0.6],
  ['include', 'centers', 0.6], ['hub', 'centers', 0.6], ['app', 'centers', 0.4], ['train-your-staff', 'centers', 0.5], ['training', 'centers', 0.5], ['summit', 'centers', 0.4],
  ['funding', 'centers', 0.6], ['impact', 'centers', 0.6], ['why', 'centers', 0.6], ['brand-kit', 'centers', 0.4], ['room-planner', 'centers', 0.6], ['corners', 'centers', 0.5],
  ['academy', 'centers', 0.4], ['quote', 'centers', 0.6],
  ['kids-shop', 'families', 0.9], ['enroll', 'families', 0.9], ['friends', 'families', 0.9], ['story-time', 'families', 0.8], ['at-home', 'families', 0.8],
  ['bop-at-home', 'families', 0.8], ['whole-child', 'families', 0.8], ['printables', 'families', 0.7], ['activities', 'families', 0.7], ['see-how', 'families', 0.6],
  ['family-videos', 'families', 0.6], ['watch', 'families', 0.7], ['talk', 'families', 0.6], ['my-week', 'families', 0.5], ['for-families', 'families', 0.7],
  ['family-guide', 'families', 0.4], ['rainbow', 'families', 0.7],
  ['store', 'store', 0.9], ['shop', 'store', 0.8], ['shop-programs', 'store', 0.7], ['room-kit', 'store', 0.8],
  ['support', 'about', 0.7], ['contact', 'about', 0.8], ['news', 'about', 0.4], ['blog', 'about', 0.5], ['events', 'about', 0.4], ['jobs', 'about', 0.4],
  ['privacy', 'about', 0.2], ['child-privacy', 'about', 0.2], ['terms', 'about', 0.2], ['accessibility', 'about', 0.3]
];
const POST_IDS = ['screen-time', 'ratios', 'choking', 'cacfp'];
const COLLECTION_IDS = C.COLLECTIONS.map(c => c.id).filter(id => id !== 'kids');   // 'kids' is the Kids' Shop page itself

function targets() {
  const out = [{ route: 'home', arg: null, file: 'index.html', path: '', kind: 'home', section: null, priority: 1.0 }];
  for (const [route, section, priority] of PAGES) out.push({ route, arg: null, file: route + '.html', path: route, kind: 'page', section, priority });
  for (const id of POST_IDS) out.push({ route: 'post', arg: id, file: 'blog-' + id + '.html', path: 'blog-' + id, kind: 'post', section: 'about', priority: 0.5 });
  for (const id of COLLECTION_IDS) out.push({ route: 'shop', arg: id, file: 'shop-' + id + '.html', path: 'shop-' + id, kind: 'collection', section: 'store', priority: 0.7 });
  for (const p of C.PRODUCTS) out.push({ route: 'product', arg: p.id, file: 'product-' + p.id + '.html', path: 'product-' + p.id, kind: 'product', section: 'store', priority: 0.6 });
  const seen = new Set();
  for (const t of out) { if (seen.has(t.path)) throw new Error('duplicate address ' + t.path); seen.add(t.path); }
  return out;
}
export const urlOf = t => abs(t.path);
const hashOf = t => '#' + t.route + (t.arg ? '/' + t.arg : '');

// ------------------------------------------------------------------ snapshot every route in the real app
async function snapshot(list) {
  const site = await startSite();
  const browser = await loadChromium().launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const res = new Map();
  let n = 0;
  for (const t of list) {
    await page.goto(`${site.base}?nogate&nostamp&seo=${++n}${hashOf(t)}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => { const v = document.querySelector('#view'); return v && v.children.length > 0; }, null, { timeout: 20000 });
    if (t.route === 'support') await page.evaluate(() => { st.help = 'faq'; render(); });      // the FAQ tab, so the answers are in the page text
    await page.waitForTimeout(t.kind === 'product' || t.route === 'home' ? 900 : 500);
    const d = await page.evaluate(() => {
      const v = document.querySelector('#view');
      const clone = v.cloneNode(true);
      clone.querySelectorAll('script,template,noscript,.mh-letters').forEach(x => x.remove());     // .mh-letters: the home title's decorative animated letters (the h1 keeps its logo image and alt)
      clone.querySelectorAll('video').forEach(vd => { vd.removeAttribute('src'); vd.removeAttribute('autoplay'); vd.setAttribute('preload', 'none'); vd.querySelectorAll('source').forEach(x => x.remove()); });     // no early video download from the static copy
      clone.querySelectorAll('[class*="is-pre"]').forEach(x => x.classList.remove('is-pre'));
      // load state is not content: every picture is written as loaded (so no shimmer placeholder shows without JS and the output is the same on every run)
      clone.querySelectorAll('img.sp-img').forEach(i => { i.classList.add('is-ready'); const m = i.closest('.sp-media,.sp-gal-zoom,.sp-tile-media,.sp-friend-img,.sp-chip-i'); if (m) m.classList.add('is-loaded'); });
      const big = [...v.querySelectorAll('img')].find(i => (i.naturalWidth || 0) >= 300 && (i.getAttribute('src') || '').length);
      const h1 = v.querySelector('h1');
      return {
        html: clone.innerHTML.replace(/\s*--bdl?:\s*[^;"]*;?/g, '').replace(/ style="\s*"/g, '').replace(/ data-id="i[a-z0-9]{6,9}"/g, ''),     // --bd/--bdl: random breathing delays set by script
        text: v.innerText.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim(),
        h1: h1 ? (h1.innerText.replace(/\s+/g, ' ').trim() || (h1.querySelector('img[alt]') || {}).alt || '') : '',
        title: document.title,
        description: (document.querySelector('meta[name="description"]') || {}).content || '',
        image: big ? big.getAttribute('src') : '',
        lang: document.documentElement.lang
      };
    });
    res.set(t.file, d);
  }
  const meta = await page.evaluate(() => ({ faq: typeof FAQ !== 'undefined' ? FAQ : [], posts: typeof POSTS !== 'undefined' ? POSTS.map(p => ({ id: p.id, t: p.t })) : [] }));
  await browser.close(); await site.close();
  return { res, meta, errors };
}

// ------------------------------------------------------------------ links: hash routes become real addresses
function cleanPath(route, arg) {
  if (route === 'home') return '';
  if (route === 'product' && arg) return 'product-' + arg;
  if (route === 'post' && arg) return 'blog-' + arg;
  if (route === 'shop' && arg && COLLECTION_IDS.includes(arg)) return 'shop-' + arg;
  if (route === 'shop' && !arg) return 'shop';
  if (route === 'shop-families') return 'kids-shop';
  if (route === 'shop' && arg === 'kids') return 'kids-shop';
  return (PAGES.some(p => p[0] === route) && !arg) ? route : null;
}
// href="#route/arg" -> href="route-arg" with data-go (the app's own click handler keeps in-app navigation; crawlers and no-JS get a page).
function crawlable(html) {
  return html.replace(/<a\b([^>]*?)\shref="#([a-z0-9-]+)(?:\/([^"\/]+))?"([^>]*)>/g, (m, pre, route, arg, post) => {
    const p = cleanPath(route, arg ? decodeURIComponent(arg) : null);
    if (p == null) return m;
    const has = /\sdata-go=/.test(pre + post);
    return `<a${pre} href="${p || './'}"${post}${has ? '' : ` data-go="${route}${arg ? '/' + arg : ''}"`}>`;
  });
}

// ------------------------------------------------------------------ JSON-LD
const ORG_ID = abs('#organization'), SITE_ID = abs('#website'), FLC_ID = abs('#futures-learning-center');
function orgNode() {
  return {
    '@type': 'Organization', '@id': ORG_ID, name: CFG.siteName, url: abs(''), logo: { '@type': 'ImageObject', url: abs(CFG.logo), width: 180, height: 180 },
    description: 'Futures Friends is a character-led early learning program for children ages 2 to 5, with Booker, Lumi, Zuri and Bop. It is made for licensed child care centers, home daycares, church preschools and pre-K partners, with free resources for families.',
    slogan: CFG.tagline, email: CFG.email, telephone: CFG.phone,
    contactPoint: [{ '@type': 'ContactPoint', contactType: 'customer support', telephone: CFG.phone, email: CFG.email, availableLanguage: 'English' }],
    parentOrganization: { '@id': FLC_ID }
  };
}
function centerNode() {
  const c = CFG.center;
  return {
    '@type': ['ChildCare', 'LocalBusiness'], '@id': FLC_ID, name: c.name, url: abs('enroll'),
    description: 'Futures Learning Center is the flagship and pilot center of Futures Friends, a child care center for children ages 2 to 5 in Independence, Missouri. Call the center for current ages served and hours.',
    image: abs(c.image), telephone: CFG.phone, email: CFG.email,
    address: { '@type': 'PostalAddress', streetAddress: c.street, addressLocality: c.city, addressRegion: c.region, postalCode: c.postalCode, addressCountry: c.country },
    audience: { '@type': 'PeopleAudience', suggestedMinAge: 2, suggestedMaxAge: 5 },
    areaServed: { '@type': 'City', name: c.city + ', ' + c.region },
    brand: { '@id': ORG_ID }
  };
}
function websiteNode() {
  return { '@type': 'WebSite', '@id': SITE_ID, url: abs(''), name: CFG.siteName, description: 'Early learning for ages 2 to 5: Booker, Lumi, Zuri and Bop.', inLanguage: 'en-US', publisher: { '@id': ORG_ID } };
}
function crumbs(t, h1) {
  const items = [['Home', abs('')]];
  if (t.kind === 'home') return null;
  const sec = t.section && SECTION[t.section];
  if (sec && sec[1] && sec[1] !== t.route) items.push([sec[0], abs(sec[1])]);
  if (t.kind === 'post') items.push(['Blog for Educators', abs('blog')]);
  if (t.kind === 'collection') items.push(['Shop the Futures Store', abs('shop')]);
  if (t.kind === 'product') { const p = C.product(t.arg), col = p && C.COLLECTIONS.find(c => c.id === p.collection); if (col) items.push([col.name, abs(col.id === 'kids' ? 'kids-shop' : 'shop-' + col.id)]); }
  items.push([h1 || t.route, abs(t.path)]);
  return { '@type': 'BreadcrumbList', itemListElement: items.map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: x[0], item: x[1] })) };
}
function productNode(t, snap) {
  const p = C.product(t.arg);
  const imgs = [];
  const push = u => { if (u && !imgs.includes(u)) imgs.push(abs(u)); };
  try { (C.gallery(p, []) || []).forEach(g => push(g.src)); } catch (_) { /* gallery needs the room list for concept shots */ }
  push(snap.image);
  const col = C.COLLECTIONS.find(c => c.id === p.collection);
  const node = {
    '@type': 'Product', '@id': abs(t.path + '#product'), name: p.name, description: trim(p.description || p.short, 300), sku: p.id, url: abs(t.path),
    brand: { '@type': 'Brand', name: CFG.siteName }, category: col ? col.name : undefined, image: imgs.length ? imgs : undefined
  };
  // An Offer only when the catalog shows a real approved price AND the item can be ordered today. No availability is claimed: the
  // store takes order requests and invoices (nothing is charged on the page), so InStock would be untrue.
  if (p.priceState === 'fixed' && C.canOrder(p)) {
    const opt = (p.options || []).find(o => o.key === 'size' && o.values && o.values.every(v => typeof v.price === 'number'));
    if (typeof p.price === 'number') node.offers = { '@type': 'Offer', url: abs(t.path), price: String(p.price), priceCurrency: 'USD' };
    else if (opt) {
      const ps = opt.values.map(v => v.price);
      node.offers = { '@type': 'AggregateOffer', url: abs(t.path), lowPrice: String(Math.min(...ps)), highPrice: String(Math.max(...ps)), offerCount: ps.length, priceCurrency: 'USD' };
    }
  }
  return node;
}
function graphFor(t, snap, meta) {
  const g = [];
  const url = abs(t.path);
  if (t.kind === 'home') { g.push(orgNode(), websiteNode(), centerNode()); }
  else g.push({ '@type': t.kind === 'collection' ? 'CollectionPage' : 'WebPage', '@id': url + '#webpage', url, name: snap.title, description: snap.description, isPartOf: { '@id': SITE_ID }, publisher: { '@id': ORG_ID }, inLanguage: 'en-US', primaryImageOfPage: snap.image ? { '@type': 'ImageObject', url: abs(snap.image) } : undefined });
  if (t.route === 'enroll' || t.route === 'contact') g.push(centerNode(), orgNode());
  if (t.kind === 'product') g.push(productNode(t, snap));
  if (t.kind === 'collection') {
    const items = C.inCollection ? C.inCollection(t.arg) : C.PRODUCTS.filter(p => p.collection === t.arg);
    g.push({ '@type': 'ItemList', name: snap.h1, numberOfItems: items.length, itemListElement: items.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: abs('product-' + p.id), name: p.name })) });
  }
  if (t.kind === 'post') {
    g.push({ '@type': 'Article', '@id': url + '#article', headline: snap.h1, mainEntityOfPage: { '@id': url + '#webpage' }, author: { '@id': ORG_ID }, publisher: { '@id': ORG_ID }, inLanguage: 'en-US', image: abs(CFG.ogImage) });
  }
  if (t.route === 'support' && meta.faq.length) {
    g.push({ '@type': 'FAQPage', '@id': url + '#faq', mainEntity: meta.faq.map(f => ({ '@type': 'Question', name: f[0], acceptedAnswer: { '@type': 'Answer', text: f[1] } })) });
  }
  const bc = crumbs(t, snap.h1); if (bc) g.push(bc);
  return { '@context': 'https://schema.org', '@graph': JSON.parse(JSON.stringify(g)) };
}

// ------------------------------------------------------------------ head block
function ogImageFor(t, snap) {
  if (t.kind === 'product' && snap.image) return { url: abs(snap.image), alt: snap.h1 };
  return { url: abs(CFG.ogImage), alt: CFG.ogImageAlt, w: 1200, h: 630 };
}
function headBlock(t, snap, meta) {
  const url = abs(t.path), img = ogImageFor(t, snap);
  const ogTitle = t.kind === 'home' ? 'Futures Friends' : snap.title, ogDesc = t.kind === 'home' ? 'Four friends. One complete early learning program for ages 2 to 5.' : snap.description;
  const ld = JSON.stringify(graphFor(t, snap, meta));
  return `<!--seo:start--><link rel="canonical" href="${E(url)}"><meta property="og:type" content="${t.kind === 'post' ? 'article' : 'website'}"><meta property="og:site_name" content="${E(CFG.siteName)}"><meta property="og:locale" content="en_US"><meta property="og:url" content="${E(url)}">`
    + `<meta property="og:title" content="${E(ogTitle)}"><meta property="og:description" content="${E(ogDesc)}"><meta property="og:image" content="${E(img.url)}">`
    + (img.w ? `<meta property="og:image:width" content="${img.w}"><meta property="og:image:height" content="${img.h}">` : '') + `<meta property="og:image:alt" content="${E(img.alt)}">`
    + `<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${E(ogTitle)}"><meta name="twitter:description" content="${E(ogDesc)}"><meta name="twitter:image" content="${E(img.url)}">`
    + `<script type="application/ld+json">${ld.replace(/</g, '\\u003c')}</script><!--seo:end-->`;
}

// ------------------------------------------------------------------ assemble a page from the app shell
const SHELL = readFileSync(join(SITE, 'index.html'), 'utf8');
function renderPage(t, snap, meta) {
  let h = SHELL;
  h = h.replace(/<title>[\s\S]*?<\/title>/, `<title>${E(snap.title)}</title>`);
  h = h.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${E(snap.description)}">`);
  h = h.replace(/<!--seo:start-->[\s\S]*?<!--seo:end-->/, () => headBlock(t, snap, meta));
  if (t.kind !== 'home') {
    const hash = hashOf(t);
    // First script in <head>: remember the page's own route and give the app its hash, so the router, the first-visit gate and every
    // deep-link rule behave exactly as for a hash address. FF_ROOT_PATH is where the app really lives (return links use it).
    const boot = `<script>window.FF_PRERENDER=${JSON.stringify(hash.slice(1))};window.FF_ROOT_PATH=location.pathname.replace(/[^\\/]*$/,'');if(!location.hash){try{history.replaceState(null,'',location.pathname+location.search+${JSON.stringify(hash)})}catch(e){}}</script>`;
    h = h.replace(/(<script>window\.FF_BUILD = '[^']*';<\/script>)/, `$1${boot}`);
  }
  // the rendered view goes into <main> (links become real addresses); the shell around it (footer site map, call-to-action band) gets real links too
  const at = h.search(/<main id="view"[^>]*>/), end = h.indexOf('</main>', at) + 7;
  h = h.slice(0, at) + `<main id="view" tabindex="-1" data-prerender>${crawlable(snap.html)}</main>` + (t.kind === 'home' ? h.slice(end) : crawlable(h.slice(end)));   // index.html keeps its hash-link footer (pinned by tests)
  return h;
}

// ------------------------------------------------------------------ the other files
function sitemapXml(list, snaps) {
  const rows = list.map(t => {
    const s = snaps.get(t.file);
    const img = t.kind === 'product' && s.image ? `<image:image><image:loc>${E(abs(s.image))}</image:loc><image:title>${E(s.h1)}</image:title></image:image>` : '';
    return `  <url><loc>${E(urlOf(t))}</loc><priority>${t.priority.toFixed(1)}</priority>${img}</url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${rows.join('\n')}\n</urlset>\n`;
}
function robotsTxt() {
  return `# Futures Friends public site. The full curriculum (day plans, packets, printables, unit data) is not published here
# (IP lockdown, owner decision 2026-10-07): licensed centers receive it privately. Nothing on this site needs hiding from crawlers.
# Search engines and AI answer engines (Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User, PerplexityBot, Claude-SearchBot, Applebot) are welcome.
User-agent: *
Allow: /

Sitemap: ${abs('sitemap.xml')}
`;
}
function llmsTxt(list, snaps) {
  const L = (route, arg, note) => { const t = list.find(x => x.route === route && (x.arg || null) === (arg || null)); const s = t && snaps.get(t.file); return t ? `- [${s.title.replace(/ \| Futures (Friends|Store)$/, '')}](${urlOf(t)}): ${note}` : ''; };
  const inColl = id => C.PRODUCTS.filter(p => p.collection === id);
  const priced = C.PRODUCTS.filter(p => p.priceState === 'fixed' && typeof p.price === 'number' && C.canOrder(p));
  return `# Futures Friends

> Futures Friends is a character-led early learning program for children ages 2 to 5. Four story-world friends, Booker the bear, Lumi the bunny, Zuri the turtle and Bop the elephant, lead a learning loop of story, movement, exploring and belonging. It is made for licensed child care centers, home daycares, church preschools and pre-K partners, and it offers free resources for families. Tagline: "${CFG.tagline}"

Futures Friends is a program of Futures Learning Center, a child care center at ${CFG.center.street}, ${CFG.center.city}, ${CFG.center.region} ${CFG.center.postalCode} (phone ${CFG.phone.replace('+1-', '(').replace('-', ') ')}, email ${CFG.email}). The center is the flagship and pilot site; call for current ages served and hours. Parts of the program are still in development and the site labels what is available now, in development or planned. The full curriculum is private and licensed to member centers; this site publishes summaries only.

## The four friends
- Booker, the Brave Little Learner (brown bear): learning and reading. Lumi (bunny): belonging, feelings and calm. Zuri (turtle): exploring and curiosity. Bop (elephant): movement, the Mighty Mover.
${L('friends', null, 'meet the friends and their five storybooks')}
${L('story-time', null, 'read the storybooks free, page by page')}
${L('bop-at-home', null, 'free family movement activities from Bop')}

## For families
${L('enroll', null, 'visit Futures Learning Center in Independence, Missouri: tours and a day in the life')}
${L('at-home', null, 'free family library: storybooks, activities, printables and a weekly plan')}
${L('activities', null, 'short activities for ages 2 to 5 from things you have at home')}
${L('printables', null, 'free printable PDFs for the fridge')}
${L('whole-child', null, 'the whole-child day: learning, meals, movement and Quiet Time')}
${L('watch', null, 'the planned micro-series and the welcome video')}
${L('kids-shop', null, 'a small shop for families: posters, plush friends (not yet orderable), apparel and more')}

## For child care centers, home daycares and programs
${L('centers', null, 'overview of Futures Friends for centers and programs')}
${L('options', null, 'compare options for centers, home daycares, pre-K partners, faith-based programs and employers')}
${L('for-centers', null, 'what a licensed center gets')}
${L('for-home', null, 'a one-room, mixed-age program for licensed home daycares')}
${L('pricing', null, 'published startup packages and monthly membership fees')}
${L('membership', null, 'what arrives each month and who helps you use it')}
${L('curriculum', null, 'twelve monthly units by age (summaries; drafts, none approved yet)')}
${L('readiness', null, 'how the learning loop and teacher observation support school readiness')}
${L('teacher-standard', null, 'teacher training, background checks and mastery')}
${L('founding-partners', null, 'a 90-day pilot for 5 to 10 Kansas City area programs')}
${L('book-demo', null, 'book a demo')}

## Store
${L('store', null, 'Learning Zones Kits, carpets, posters, plush, apparel and classroom materials; orders go in as requests and nothing is charged online')}
${L('shop', null, 'every product in one list')}
${L('room-kit', null, 'the Learning Zones Kit: carpets, fences and friend zones')}
${L('room-planner', null, 'lay out your room to scale')}
${priced.length ? `Prices published on the site: ${priced.map(p => `${p.name} $${p.price.toLocaleString('en-US')}`).join('; ')}. Everything else is a quote request or "price coming soon". The plush friends cannot be ordered yet.` : ''}

## Help
${L('support', null, 'frequently asked questions')}
${L('contact', null, 'phone, email and form')}
${L('funding', null, 'guides to CACFP, subsidy, grants and tax credits')}
${L('blog', null, 'short, sourced guides for classrooms: screen time, ratios, snacks, CACFP')}

## Optional
- [Full text of the key pages](${abs('llms-full.txt')}): plain-text copy of the main public pages in one file.
- [Sitemap](${abs('sitemap.xml')})
`.replace(/\n{3,}/g, '\n\n');
}
const FULL_ROUTES = ['home', 'friends', 'enroll', 'centers', 'options', 'for-centers', 'for-home', 'pricing', 'membership', 'whole-child', 'readiness', 'teacher-standard', 'store', 'kids-shop', 'room-kit', 'support', 'contact', 'funding'];
function llmsFull(list, snaps) {
  const parts = [`# Futures Friends: full text of the key public pages\n\nSource: ${abs('')}. This is plain text copied from the public pages; the private curriculum is not part of it. Each section starts with its web address.\n`];
  for (const r of FULL_ROUTES) {
    const t = list.find(x => x.route === r && !x.arg); if (!t) continue;
    const s = snaps.get(t.file);
    parts.push(`\n---\n\n## ${s.h1}\n${urlOf(t)}\n\n${s.text}\n`);
  }
  return parts.join('');
}
function notFoundHtml() {
  const links = [['Home', ''], ['Visit Futures Learning Center', 'enroll'], ['The whole-child day', 'whole-child'], ['Bop at Home', 'bop-at-home'], ['Friends and books', 'friends'], ['Futures Store', 'store'], ['Contact us', 'contact']];
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="${E(BASE_PATH)}">
<title>Page not found | Futures Friends</title><meta name="robots" content="noindex"><meta name="theme-color" content="#174B45">
<link rel="icon" type="image/png" sizes="32x32" href="img/favicon-32.png?v=2"><link rel="stylesheet" href="fonts/fonts.css?v=1">
<style>body{margin:0;font:16px/1.6 Poppins,system-ui,sans-serif;background:#FBF6EC;color:#14313D}main{max-width:640px;margin:0 auto;padding:56px 20px}h1{font:600 clamp(30px,6vw,44px)/1.12 Fredoka,Poppins,sans-serif;margin:0 0 12px}a{color:#0A2B38}ul{padding-left:20px}li{margin:6px 0}.top{background:#0A2B38;box-shadow:0 2px 0 #E7A928;padding:12px 20px}.top img{display:block;width:142px;height:auto}</style></head>
<body><div class="top"><a href=""><img src="img/brand/ff-plush-wordmark-320.webp" width="142" height="66" alt="Futures Friends"></a></div>
<main><h1>We can&rsquo;t find that page</h1><p>The page may have moved, or the link has a typo. Try one of these instead.</p>
<ul>${links.map(l => `<li><a href="${l[1]}">${E(l[0])}</a></li>`).join('')}</ul>
<p>Still stuck? Call <a href="tel:+18169885661">(816) 988-5661</a> and a real person will help.</p></main>
<script>/* an address with a trailing slash (/kids-shop/) is the same page without it */(function(){var p=location.pathname;if(/\\/$/.test(p)&&p.length>${BASE_PATH.length}){var q=p.replace(/\\/+$/,'');location.replace(q+location.search+location.hash);}})();</script>
</body></html>
`;
}

// ------------------------------------------------------------------ main
const list = targets();
const { res, meta, errors } = await snapshot(list);
const out = new Map();           // file -> content
const problems = [];
for (const t of list) {
  const s = res.get(t.file);
  if (!s.h1) problems.push(`${t.file}: no h1`);
  if (s.title.length > 60) problems.push(`${t.file}: title ${s.title.length} chars > 60: ${s.title}`);
  if (s.description.length > 155) problems.push(`${t.file}: description ${s.description.length} chars > 155`);
  if (!s.description) problems.push(`${t.file}: no description`);
  if (/\bconcept\b|\binfant/i.test(s.text)) problems.push(`${t.file}: banned wording in page text`);
  out.set(t.file, renderPage(t, s, meta));
}
if (!/<!--seo:start-->/.test(SHELL)) problems.push('index.html has no <!--seo:start--> / <!--seo:end--> markers');
out.set('sitemap.xml', sitemapXml(list, res));
out.set('robots.txt', robotsTxt());
out.set('llms.txt', llmsTxt(list, res));
out.set('llms-full.txt', llmsFull(list, res));
out.set('404.html', notFoundHtml());
out.set('docs/seo-manifest.json', JSON.stringify({
  generated_by: 'tools/prerender.mjs', origin: ORIGIN,
  pages: list.map(t => { const s = res.get(t.file); return { file: t.file, url: urlOf(t), route: t.route, arg: t.arg, kind: t.kind, title: s.title, description: s.description, h1: s.h1 }; })
}, null, 1) + '\n');

// stale generated pages (a product removed from the catalog) are deleted
const keep = new Set(out.keys());
const gen = readdirSync(SITE).filter(f => /^(product|shop|blog)-[a-z0-9-]+\.html$/.test(f) && !keep.has(f));
let stale = 0;
for (const [f, body] of out) {
  const p = join(SITE, f);
  const cur = existsSync(p) ? readFileSync(p, 'utf8') : null;
  if (cur !== body) { stale++; if (!CHECK) { mkdirSync(join(p, '..'), { recursive: true }); writeFileSync(p, body); } }
}
for (const f of gen) { stale++; if (!CHECK) unlinkSync(join(SITE, f)); }
if (errors.length) console.log('page errors while rendering:', [...new Set(errors)].slice(0, 5).join(' | '));
for (const p of problems) console.log('PROBLEM', p);
console.log(JSON.stringify({ pages: list.length, files: out.size, changed: stale, problems: problems.length }));
if (CHECK && (stale || problems.length)) process.exit(1);
if (problems.length) process.exit(2);
